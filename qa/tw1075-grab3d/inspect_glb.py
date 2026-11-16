# TW-1075 Phase A asset inspection: inventory + health checks + QA renders.
# Usage: blender -b --factory-startup -P inspect_glb.py -- --glb <path> --out <dir> --label <name> [--renders]
import json
import math
import os
import sys

import bmesh
import bpy
import numpy as np
from mathutils import Vector


def args_after_dd():
    argv = sys.argv
    return argv[argv.index("--") + 1 :] if "--" in argv else []


def parse_args():
    a = args_after_dd()
    out = {"renders": False}
    i = 0
    while i < len(a):
        if a[i] == "--renders":
            out["renders"] = True
            i += 1
        else:
            out[a[i].lstrip("-")] = a[i + 1]
            i += 2
    return out


def look_at(cam, target):
    d = Vector(target) - cam.location
    cam.rotation_euler = d.to_track_quat("-Z", "Y").to_euler()


def mesh_tri_count(me):
    return sum(len(p.vertices) - 2 for p in me.polygons)


def island_count(me):
    # union-find over edges with numpy index arrays
    n = len(me.vertices)
    parent = np.arange(n, dtype=np.int64)

    def find(x):
        root = x
        while parent[root] != root:
            root = parent[root]
        while parent[x] != root:
            parent[x], x = root, parent[x]
        return root

    edges = np.empty(len(me.edges) * 2, dtype=np.int64)
    me.edges.foreach_get("vertices", edges)
    edges = edges.reshape(-1, 2)
    for a, b in edges:
        ra, rb = find(int(a)), find(int(b))
        if ra != rb:
            parent[ra] = rb
    used = np.zeros(n, dtype=bool)
    # mark verts used by polygons via loops
    lv = np.empty(len(me.loops), dtype=np.int64)
    me.loops.foreach_get("vertex_index", lv)
    used[lv] = True
    roots = set()
    for v in np.nonzero(used)[0]:
        roots.add(find(int(v)))
    return len(roots)


def main():
    cfg = parse_args()
    glb = cfg["glb"]
    outdir = cfg["out"]
    label = cfg.get("label", "asset")
    os.makedirs(outdir, exist_ok=True)
    report = {"glb": glb, "label": label}

    bpy.ops.wm.read_factory_settings(use_empty=True)
    bpy.ops.import_scene.gltf(filepath=glb)

    report["objects"] = []
    meshes = []
    for ob in bpy.context.scene.objects:
        entry = {"name": ob.name, "type": ob.type}
        if ob.type == "MESH":
            me = ob.data
            entry.update(
                {
                    "verts": len(me.vertices),
                    "edges": len(me.edges),
                    "polys": len(me.polygons),
                    "tris": mesh_tri_count(me),
                    "uv_layers": [uv.name for uv in me.uv_layers],
                    "materials": [m.name if m else None for m in me.materials],
                    "vertex_groups": len(ob.vertex_groups),
                    "shape_keys": bool(me.shape_keys),
                    "modifiers": [md.type for md in ob.modifiers],
                }
            )
            meshes.append(ob)
        if ob.type == "ARMATURE":
            entry["bones"] = len(ob.data.bones)
        report["objects"].append(entry)

    report["actions"] = [a.name for a in bpy.data.actions]
    report["images"] = [
        {
            "name": im.name,
            "size": list(im.size),
            "colorspace": im.colorspace_settings.name,
            "alpha_mode": im.alpha_mode,
        }
        for im in bpy.data.images
    ]
    report["materials"] = {}
    for mat in bpy.data.materials:
        if not mat.use_nodes:
            report["materials"][mat.name] = {"use_nodes": False}
            continue
        nodes = []
        for n in mat.node_tree.nodes:
            nd = {"type": n.bl_idname, "name": n.name}
            if n.bl_idname == "ShaderNodeTexImage":
                nd["image"] = n.image.name if n.image else None
                # where does its Color output go?
                outs = []
                for link in n.outputs["Color"].links:
                    outs.append(f"{link.to_node.name}.{link.to_socket.name}")
                nd["color_links"] = outs
                aouts = []
                for link in n.outputs["Alpha"].links:
                    aouts.append(f"{link.to_node.name}.{link.to_socket.name}")
                nd["alpha_links"] = aouts
            if n.bl_idname == "ShaderNodeBsdfPrincipled":
                for sock in ("Base Color", "Metallic", "Roughness", "Normal", "Alpha"):
                    s = n.inputs.get(sock)
                    if s is not None:
                        nd[f"input_{sock}"] = (
                            f"linked:{s.links[0].from_node.name}"
                            if s.is_linked
                            else f"value:{getattr(s, 'default_value', None)}"
                        )
            nodes.append(nd)
        report["materials"][mat.name] = {"nodes": nodes}

    # combined world bounds
    all_corners = []
    for ob in meshes:
        for c in ob.bound_box:
            all_corners.append(ob.matrix_world @ Vector(c))
    xs = [c.x for c in all_corners]
    ys = [c.y for c in all_corners]
    zs = [c.z for c in all_corners]
    lo = Vector((min(xs), min(ys), min(zs)))
    hi = Vector((max(xs), max(ys), max(zs)))
    size = hi - lo
    center = (lo + hi) / 2
    report["bounds"] = {
        "min": list(lo),
        "max": list(hi),
        "size_xyz": list(size),
        "center": list(center),
    }

    # health checks on the largest mesh
    if meshes:
        ob = max(meshes, key=lambda o: len(o.data.vertices))
        me = ob.data
        bm = bmesh.new()
        bm.from_mesh(me)
        nonmanifold = sum(1 for e in bm.edges if not e.is_manifold)
        wire = sum(1 for e in bm.edges if e.is_wire)
        bm.free()
        # zero-area polygons via the polygon area array
        pa = np.empty(len(me.polygons), dtype=np.float64)
        me.polygons.foreach_get("area", pa)
        zero_area = int((pa <= 1e-12).sum())
        report["health"] = {
            "mesh": ob.name,
            "nonmanifold_edges": int(nonmanifold),
            "wire_edges": int(wire),
            "zero_area_polys": zero_area,
            "islands": island_count(me),
        }
        # end-slab head-region centroids: length axis = larger of X/Y extent
        len_axis = 0 if size.x > size.y else 1
        up_vals = np.empty(len(me.vertices) * 3, dtype=np.float64)
        me.vertices.foreach_get("co", up_vals)
        co = up_vals.reshape(-1, 3)
        world = np.array(ob.matrix_world)
        co = (world[:3, :3] @ co.T).T + world[:3, 3]
        la = co[:, len_axis]
        z = co[:, 2]
        lo_a, hi_a = la.min(), la.max()
        span = hi_a - lo_a
        height = z.max() - z.min()
        ends = {}
        for tag, m in (
            ("min_end", la < lo_a + 0.16 * span),
            ("max_end", la > hi_a - 0.16 * span),
        ):
            high = m & (z > z.min() + 0.55 * height)
            if high.sum() > 10:
                ends[tag] = {
                    "high_region_centroid": [float(v) for v in co[high].mean(axis=0)],
                    "verts": int(high.sum()),
                }
            ends[tag + "_slab_centroid"] = [float(v) for v in co[m].mean(axis=0)]
        report["ends"] = {"length_axis": "XYZ"[len_axis], "regions": ends}

    with open(os.path.join(outdir, f"inventory-{label}.json"), "w") as f:
        json.dump(report, f, indent=1, default=str)
    print("@@REPORT@@", json.dumps({"label": label, "bounds_size": list(size)}))

    if not cfg["renders"]:
        return

    # ---- render setup ----
    scene = bpy.context.scene
    scene.render.engine = "CYCLES"
    scene.cycles.samples = 32
    scene.cycles.use_denoising = True
    scene.cycles.device = "CPU"
    scene.render.resolution_x = 960
    scene.render.resolution_y = 540
    scene.render.film_transparent = False
    world = bpy.data.worlds.new("W")
    scene.world = world
    world.use_nodes = True
    bg = world.node_tree.nodes.get("Background")
    bg.inputs[0].default_value = (0.42, 0.44, 0.42, 1.0)
    bg.inputs[1].default_value = 0.9

    sun = bpy.data.objects.new("Sun", bpy.data.lights.new("Sun", "SUN"))
    sun.data.energy = 3.0
    sun.rotation_euler = (math.radians(50), math.radians(10), math.radians(35))
    scene.collection.objects.link(sun)
    area = bpy.data.objects.new("Key", bpy.data.lights.new("Key", "AREA"))
    area.data.energy = 500
    area.data.shape = "DISK"
    area.data.size = 4.0
    area.location = center + Vector((2.5, -2.5, 3.0))
    scene.collection.objects.link(area)
    look_at(area, center)

    # ground shadow-catcher-ish plane at min z
    bpy.ops.mesh.primitive_plane_add(
        size=30, location=(center.x, center.y, lo.z - 0.001)
    )
    ground = bpy.context.object
    gmat = bpy.data.materials.new("ground")
    gmat.use_nodes = True
    gmat.node_tree.nodes["Principled BSDF"].inputs["Base Color"].default_value = (
        0.36,
        0.38,
        0.35,
        1,
    )
    gmat.node_tree.nodes["Principled BSDF"].inputs["Roughness"].default_value = 1.0
    ground.data.materials.append(gmat)

    cam_data = bpy.data.cameras.new("Cam")
    cam_data.lens = 50
    cam = bpy.data.objects.new("Cam", cam_data)
    scene.collection.objects.link(cam)
    scene.camera = cam

    maxdim = max(size)
    dist = maxdim * 1.55
    len_axis = 0 if size.x > size.y else 1
    fwd = Vector((1, 0, 0)) if len_axis == 0 else Vector((0, 1, 0))
    side = Vector((0, 1, 0)) if len_axis == 0 else Vector((1, 0, 0))
    up = Vector((0, 0, 1))
    mid = center + up * size.z * 0.05

    views = {
        "side-left": mid + side * dist,
        "side-right": mid - side * dist,
        "end-min": mid - fwd * dist,
        "end-max": mid + fwd * dist,
        "tq-max-right": mid
        + fwd * dist * 0.72
        - side * dist * 0.72
        + up * size.z * 0.18,
        "tq-min-left": mid
        - fwd * dist * 0.72
        + side * dist * 0.72
        + up * size.z * 0.18,
    }
    for name, pos in views.items():
        cam.location = pos
        look_at(cam, mid)
        scene.render.filepath = os.path.join(outdir, f"{label}-{name}.png")
        bpy.ops.render.render(write_still=True)
        print("@@RENDER@@", name)

    # close-ups of both end high regions
    ends = report.get("ends", {}).get("regions", {})
    for tag in ("min_end", "max_end"):
        info = ends.get(tag)
        if not info or "high_region_centroid" not in info:
            continue
        tgt = Vector(info["high_region_centroid"])
        cam_data.lens = 85
        cam.location = (
            tgt + fwd * (0.85 if tag == "max_end" else -0.85) + side * 0.45 + up * 0.25
        )
        look_at(cam, tgt)
        scene.render.filepath = os.path.join(outdir, f"{label}-close-{tag}.png")
        bpy.ops.render.render(write_still=True)
        print("@@RENDER@@", f"close-{tag}")
        cam_data.lens = 50


if __name__ == "__main__":
    main()
