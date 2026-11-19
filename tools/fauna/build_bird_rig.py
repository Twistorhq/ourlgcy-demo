# TW-1076: the two bird slots, jay and woodpecker, from ONE source.
#
# Founder mandate change (2026-11-16, 15:54 MST): all four fauna
# slots ship working; species exactness yields to the best
# clean-license animal that exists, converted toward the reference
# look and credited truthfully. No clean-license woodpecker model
# exists on any ungated source swept (Grab3D, Sketchfab, Poly
# Pizza, Poly Haven; see qa/tw1076-sourcing/SOURCING.md), and the
# only clean songbird in the buck's quality register is Grab3D's
# "bird": a European robin, CC0 1.0, same publisher and pipeline
# as the buck and the squirrel. This script converts that one
# sculpt twice:
#   --species jay:        blue jay conversion (blue/white/black
#                         repaint by anatomical region, crown
#                         raised toward a crest), perched.
#   --species woodpecker: red-headed woodpecker conversion
#                         (crimson head, white body, black wings
#                         with the white patch), staged clinging
#                         vertically on the trunk (scene-side).
# Both are credited in the packs as what they are: a robin sculpt
# converted, not the named species.
#
# Pipeline mirrors build_squirrel_rig.py (same helpers imported):
# prep (decimate + weld) -> correct -> paint (region rasterized
# repaint) -> rig (distance-gated skinning) -> probe -> clips ->
# export (asserted) -> verify (posed renders from the binary).
#
# Zero em-dashes in comments and copy, house rule.

import json
import math
import os
import sys

import bpy
import numpy as np
from mathutils import Quaternion, Vector

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from build_squirrel_rig import (
    _seg_dist,
    _smoothstep,
    log,
    mesh_np,
    render_views,
    set_mesh_np,
)

ARGS = sys.argv[sys.argv.index("--") + 1 :]
SPECIES = ARGS[ARGS.index("--species") + 1] if "--species" in ARGS else "jay"
STAGE = ARGS[ARGS.index("--stage") + 1] if "--stage" in ARGS else "prep"

SRC_DIR = os.path.expanduser(
    "~/workspace/twistor-lab/projects/our-lgcy/tw1076-grab3d-source"
)
WORK_BLEND = os.path.join(SRC_DIR, f"bird-{SPECIES}-work.blend")
FINAL_BLEND = os.path.join(SRC_DIR, f"bird-{SPECIES}-rigged.blend")
QA_DIR = os.path.expanduser(
    f"~/workspace/repos/ourlgcy-demo-tw1076/qa/tw1076-{SPECIES}/rig"
)
GLB_PATH = os.path.expanduser(
    f"~/workspace/repos/ourlgcy-demo-tw1076/gl/animals/{SPECIES}-rigged.glb"
)
TARGET_TRIS = 120000
WELD_DIST = 0.0003
os.makedirs(QA_DIR, exist_ok=True)


def save_work():
    bpy.ops.wm.save_as_mainfile(filepath=WORK_BLEND)


# ---------------------------------------------------------------- prep
def stage_prep():
    bpy.ops.wm.open_mainfile(filepath=os.path.join(SRC_DIR, "bird/bird.blend"))
    src = next(o for o in bpy.context.scene.objects if o.type == "MESH")
    src.name = "BirdSource_DO_NOT_EXPORT"
    work = src.copy()
    work.data = src.data.copy()
    work.name = "Bird"
    bpy.context.scene.collection.objects.link(work)
    src.hide_set(True)
    src.hide_render = True
    bpy.context.view_layer.objects.active = work
    work.select_set(True)
    mod = work.modifiers.new("decimate", "DECIMATE")
    mod.decimate_type = "COLLAPSE"
    mod.ratio = TARGET_TRIS / len(work.data.polygons)
    mod.use_collapse_triangulate = True
    bpy.ops.object.modifier_apply(modifier=mod.name)
    import bmesh

    bm = bmesh.new()
    bm.from_mesh(work.data)
    before = len(bm.verts)
    bmesh.ops.remove_doubles(bm, verts=list(bm.verts), dist=WELD_DIST)
    bm.to_mesh(work.data)
    bm.free()
    me = work.data
    tris = sum(len(p.vertices) - 2 for p in me.polygons)
    co = mesh_np(work)
    lm = {
        "tris": tris,
        "verts": len(me.vertices),
        "verts_before_weld": before,
        "bounds_min": co.min(axis=0).round(4).tolist(),
        "bounds_max": co.max(axis=0).round(4).tolist(),
    }
    with open(os.path.join(QA_DIR, "landmarks.json"), "w") as fh:
        json.dump(lm, fh, indent=1)
    log("PREP", lm)
    save_work()
    render_views(QA_DIR, "prep", target=(0, 0, 0.045), dist=0.30)


# ------------------------------------------------------------- regions
# Anatomy from the inspection renders (face -Y, ground z=0):
# head center (0,-0.048,0.076), beak tip y -0.070, tail tip
# (0,0.070,0.030), wings on the sides, breast at the front-bottom.
def region_of(c):
    """Region id per face centroid c = (x, y, z)."""
    x, y, z = float(c[0]), float(c[1]), float(c[2])
    ax = abs(x)
    if y < -0.060 and z > 0.058:
        return "beak"
    if z < 0.028 and y < 0.012:
        return "legs"
    if y > 0.035:
        return "tail"
    head = z > 0.056 and y < -0.016
    if head:
        return "face" if y < -0.050 else "crown"
    if ax > 0.0105 and z > 0.046:
        return "wingpatch" if (0.002 < y < 0.030 and 0.042 < z < 0.062) else "wing"
    if 0.012 < y < 0.050 and 0.028 < z < 0.052:
        return "rump"  # rump and lower back, both center and sides
    if z > 0.052 and y >= -0.016:
        return "back"
    if y < -0.026 and 0.046 < z < 0.062:
        return "necklace"
    if y < -0.014:
        return "breast"
    return "belly"


def _lum(rgb):
    return (0.299 * rgb[..., 0] + 0.587 * rgb[..., 1] + 0.114 * rgb[..., 2])[..., None]


def _tint(rgb, color, strength, gain=1.0):
    """Repaint toward a flat color while keeping the feather
    shading: the texel's own luminance drives the target color."""
    target = _lum(rgb) * np.array(color, dtype=np.float64) * gain
    return rgb * (1 - strength) + target * strength


def _desat(rgb, strength, gain=1.0):
    return (
        rgb * (1 - strength)
        + _lum(rgb) * np.array([1.03, 1.01, 0.98]) * gain * strength
    )


# region -> transform, per species. Colors are linear-ish targets
# in the texture's own space; strengths keep the feather pattern.
# The blue targets run hot on purpose: the composed scene's
# light is golden-hour warm (sun 0xffc98a, hemi 0xe6d3a7), and
# the first composed capture showed a true-color blue jay
# multiplying out to warm gray-brown, its identity lost. The
# conversion is tuned for the scene it lives in, per the blend
# law; the inspection renders under neutral light read bluer
# than the page does, and the pack says so.
JAY_PAINT = {
    "beak": lambda rgb: _tint(rgb, (0.10, 0.10, 0.11), 0.85),
    "face": lambda rgb: _desat(rgb, 0.92, 1.10),
    "crown": lambda rgb: _tint(rgb, (0.20, 0.40, 1.18), 0.90, 1.45),
    "necklace": lambda rgb: _tint(rgb, (0.08, 0.08, 0.09), 0.88),
    "breast": lambda rgb: _desat(rgb, 0.88, 1.06),
    "belly": lambda rgb: _desat(rgb, 0.90, 1.03),
    "wing": lambda rgb: _tint(rgb, (0.20, 0.40, 1.18), 0.88, 1.25),
    "wingpatch": lambda rgb: _tint(rgb, (0.20, 0.40, 1.18), 0.88, 1.25),
    "back": lambda rgb: _tint(rgb, (0.24, 0.44, 1.18), 0.86, 1.45),
    "rump": lambda rgb: _tint(rgb, (0.24, 0.44, 1.18), 0.86, 1.45),
    "tail": lambda rgb: _tint(rgb, (0.20, 0.40, 1.18), 0.90, 1.00),
    "legs": lambda rgb: _tint(rgb, (0.16, 0.16, 0.18), 0.80),
}
WP_PAINT = {
    "beak": lambda rgb: _desat(rgb, 0.85, 1.25),
    "face": lambda rgb: _tint(rgb, (1.30, 0.16, 0.12), 0.88),
    "crown": lambda rgb: _tint(rgb, (1.30, 0.16, 0.12), 0.88),
    # the red-headed's crimson stops at the neck; the band below
    # it is white breast (v1 let it run crimson down the chest)
    "necklace": lambda rgb: _desat(rgb, 0.92, 1.08),
    "breast": lambda rgb: _desat(rgb, 0.92, 1.08),
    "belly": lambda rgb: _desat(rgb, 0.85, 1.04),
    "wing": lambda rgb: _tint(rgb, (0.09, 0.085, 0.09), 0.88),
    "wingpatch": lambda rgb: _desat(rgb, 0.92, 1.10),
    "back": lambda rgb: _tint(rgb, (0.09, 0.085, 0.09), 0.86),
    "rump": lambda rgb: _desat(rgb, 0.92, 1.08),
    "tail": lambda rgb: _tint(rgb, (0.09, 0.085, 0.09), 0.88),
    "legs": lambda rgb: _tint(rgb, (0.30, 0.30, 0.33), 0.70),
}
PAINTS = {"jay": JAY_PAINT, "woodpecker": WP_PAINT}


def _base_color_image(work):
    mat = work.data.materials[0]
    for node in mat.node_tree.nodes:
        if node.type == "BSDF_PRINCIPLED":
            link = node.inputs["Base Color"].links
            if link:
                return link[0].from_node.image
    return bpy.data.images["Image_0"]


def stage_paint():
    """Region repaint: rasterize each face's anatomical region
    into UV space, feather the masks, and composite per-region
    transforms over the base color at 2048 (the export size)."""
    bpy.ops.wm.open_mainfile(filepath=WORK_BLEND)
    work = bpy.data.objects["Bird"]
    me = work.data
    img = _base_color_image(work)
    size = 2048
    if max(img.size) != size:
        img.scale(size, size)
    uv = me.uv_layers.active.data
    n = len(me.polygons)
    regions = np.empty(n, dtype=object)
    tris_uv = np.empty((n, 3, 2), dtype=np.float64)
    cents = np.empty((n, 3), dtype=np.float64)
    co = mesh_np(work)
    for pi, poly in enumerate(me.polygons):
        cents[pi] = co[poly.vertices].mean(axis=0)
        regions[pi] = region_of(cents[pi])
        for li, loop_i in enumerate(poly.loop_indices):
            tris_uv[pi, li] = uv[loop_i].uv
    paints = PAINTS[SPECIES]
    names = sorted(set(regions.tolist()) | set(paints))
    # rasterize region masks
    masks = {}
    for name in names:
        masks[name] = np.zeros((size, size), dtype=np.float32)
    px = np.empty(size * size * 4, dtype=np.float32)
    img.pixels.foreach_get(px)
    # Blender image rows and UV v share the same bottom-up origin:
    # row index = v * size directly. (A flipud here painted every
    # region onto the mirrored body part in v1; the failure render
    # is kept in the pack as the record.)
    rgb = px.reshape(size, size, 4)[:, :, :3].astype(np.float64)
    for pi in range(n):
        name = regions[pi]
        if name not in paints:
            continue
        t = tris_uv[pi] * size
        x0, x1 = max(0, int(t[:, 0].min()) - 1), min(size - 1, int(t[:, 0].max()) + 1)
        y0, y1 = max(0, int(t[:, 1].min()) - 1), min(size - 1, int(t[:, 1].max()) + 1)
        if x1 < x0 or y1 < y0:
            continue
        gx, gy = np.meshgrid(np.arange(x0, x1 + 1) + 0.5, np.arange(y0, y1 + 1) + 0.5)
        (ax_, ay_), (bx_, by_), (cx_, cy_) = t
        d = (by_ - cy_) * (ax_ - cx_) + (cx_ - bx_) * (ay_ - cy_)
        if abs(d) < 1e-12:
            continue
        w0 = ((by_ - cy_) * (gx - cx_) + (cx_ - bx_) * (gy - cy_)) / d
        w1 = ((cy_ - ay_) * (gx - cx_) + (ax_ - cx_) * (gy - cy_)) / d
        w2 = 1 - w0 - w1
        inside = (w0 >= -0.02) & (w1 >= -0.02) & (w2 >= -0.02)
        sub = masks[name][y0 : y1 + 1, x0 : x1 + 1]
        sub[inside] = 1.0
        masks[name][y0 : y1 + 1, x0 : x1 + 1] = sub

    # feather masks with a small box blur (two passes)
    def blur(m):
        for _ in range(2):
            p = np.pad(m, 1, mode="edge")
            m = (
                p[:-2, :-2]
                + p[:-2, 1:-1]
                + p[:-2, 2:]
                + p[1:-1, :-2]
                + p[1:-1, 1:-1]
                + p[1:-1, 2:]
                + p[2:, :-2]
                + p[2:, 1:-1]
                + p[2:, 2:]
            ) / 9.0
        return m

    total = np.zeros((size, size), dtype=np.float32)
    for name, m in list(masks.items()):
        masks[name] = blur(m)
        total += masks[name]
    out = rgb.copy()
    covered = np.zeros((size, size), dtype=bool)
    for name, fn in paints.items():
        if name not in masks:
            continue
        wgt = masks[name] / np.maximum(total, 1e-9)
        wgt = np.where(total > 0.01, wgt, 0.0)
        if not wgt.any():
            continue
        transformed = fn(rgb)
        out = out * (1 - wgt[..., None]) + transformed * wgt[..., None]
        covered |= wgt > 0.05
    px2 = px.reshape(size, size, 4)
    px2[:, :, :3] = np.clip(out, 0.0, 1.0).astype(np.float32)
    img.pixels.foreach_set(px2.ravel())
    img.update()
    img.pack()
    log(
        "PAINT",
        {"species": SPECIES, "regions": names, "covered_frac": float(covered.mean())},
    )
    save_work()
    render_views(QA_DIR, "paint", target=(0, 0, 0.045), dist=0.30)


# ------------------------------------------------------------- correct
def stage_correct():
    """Jay only: raise the crown toward a crest. The blue jay's
    crest is diagnostic; the robin's crown is flat. Crown verts
    are pushed up and slightly back with a smooth falloff, a
    suggestion of a crest rather than a sculpted one, and the
    pack says so. Woodpecker: no geometry change."""
    bpy.ops.wm.open_mainfile(filepath=WORK_BLEND)
    work = bpy.data.objects["Bird"]
    if SPECIES != "jay":
        log("CORRECT", {"species": SPECIES, "change": "none"})
        render_views(QA_DIR, "correct", target=(0, 0, 0.045), dist=0.30)
        return
    co = mesh_np(work)
    orig = co.copy()
    sel = (co[:, 2] > 0.078) & (co[:, 1] > -0.052) & (co[:, 1] < -0.004)
    # height ramp times a center-weighted band over the crown
    wy = np.clip(1.0 - np.abs(co[sel, 1] + 0.028) / 0.024, 0.0, 1.0)
    w = _smoothstep(0.078, 0.094, co[sel, 2]) * wy
    co[sel, 2] += 0.0075 * w
    co[sel, 1] += 0.0045 * w
    set_mesh_np(work, co)
    log(
        "CORRECT",
        {
            "moved_verts": int(sel.sum()),
            "max_delta_m": round(float(np.abs(co - orig).max()), 4),
        },
    )
    save_work()
    render_views(QA_DIR, "correct", target=(0, 0, 0.045), dist=0.30)


# ----------------------------------------------------------------- rig
BONES = {
    "root": ((0, 0.0, 0.0), (0, 0.0, 0.030), None),
    "body": ((0, 0.006, 0.026), (0, -0.012, 0.050), "root"),
    "chest": ((0, -0.012, 0.050), (0, -0.028, 0.064), "body"),
    "neck": ((0, -0.028, 0.064), (0, -0.040, 0.073), "chest"),
    "head": ((0, -0.040, 0.073), (0, -0.064, 0.077), "neck"),
    "tail_1": ((0, 0.012, 0.038), (0, 0.038, 0.034), "body"),
    "tail_2": ((0, 0.038, 0.034), (0, 0.068, 0.029), "tail_1"),
    "wing_L": ((-0.011, -0.004, 0.056), (-0.023, 0.027, 0.045), "chest"),
    "wing_R": ((0.011, -0.004, 0.056), (0.023, 0.027, 0.045), "chest"),
    "leg_L": ((-0.008, -0.003, 0.024), (-0.009, -0.005, 0.003), "body"),
    "leg_R": ((0.008, -0.003, 0.024), (0.009, -0.005, 0.003), "body"),
}
BODY_BONES = ["root", "body", "chest", "neck", "head"]


def stage_rig():
    bpy.ops.wm.open_mainfile(filepath=WORK_BLEND)
    work = bpy.data.objects["Bird"]
    co = mesh_np(work)
    n = len(co)
    for obj in list(bpy.data.objects):
        if obj.type == "ARMATURE":
            bpy.data.objects.remove(obj, do_unlink=True)
    for mod in list(work.modifiers):
        if mod.type == "ARMATURE":
            work.modifiers.remove(mod)
    for vg in list(work.vertex_groups):
        work.vertex_groups.remove(vg)

    arm_data = bpy.data.armatures.new("BirdRigData")
    arm = bpy.data.objects.new("BirdRig", arm_data)
    bpy.context.scene.collection.objects.link(arm)
    bpy.context.view_layer.objects.active = arm
    bpy.ops.object.mode_set(mode="EDIT")
    ebones = {}
    for name, (head, tail, parent) in BONES.items():
        eb = arm_data.edit_bones.new(name)
        eb.head = Vector(head)
        eb.tail = Vector(tail)
        ebones[name] = eb
    for name, (head, tail, parent) in BONES.items():
        if parent:
            ebones[name].parent = ebones[parent]
    bpy.ops.object.mode_set(mode="OBJECT")

    names = list(BONES)
    idx = {b: i for i, b in enumerate(names)}
    D = np.stack([_seg_dist(co, BONES[b][0], BONES[b][1])[0] for b in names], axis=1)
    x, y = co[:, 0], co[:, 1]
    gate = np.zeros((n, len(names)), dtype=bool)
    for b in BODY_BONES:
        gate[:, idx[b]] = True
    for b in ("tail_1", "tail_2"):
        gate[:, idx[b]] = y > 0.004
    for side, sfx in ((-1, "L"), (1, "R")):
        same = np.sign(x) == side
        gate[:, idx[f"wing_{sfx}"]] = same & (D[:, idx[f"wing_{sfx}"]] < 0.016)
        gate[:, idx[f"leg_{sfx}"]] = same & (D[:, idx[f"leg_{sfx}"]] < 0.010)
    W = np.where(gate, np.exp(-((D / 0.008) ** 2)), 0.0)
    W /= np.maximum(W.sum(axis=1, keepdims=True), 1e-12)
    # spatial smoothing, grid hash (squirrel pattern, bird scale)
    cell = 0.006
    keys = np.floor(co / cell).astype(np.int64)
    buckets = {}
    for i in range(n):
        buckets.setdefault((keys[i, 0], keys[i, 1], keys[i, 2]), []).append(i)
    neigh = [None] * n
    for i in range(n):
        gx, gy, gz = keys[i]
        lst = []
        for dx in (-1, 0, 1):
            for dy in (-1, 0, 1):
                for dz in (-1, 0, 1):
                    lst.extend(buckets.get((gx + dx, gy + dy, gz + dz), ()))
        arr = np.array(lst, dtype=np.int64)
        d2 = ((co[arr] - co[i]) ** 2).sum(axis=1)
        neigh[i] = arr[d2 <= cell * cell]
    for _ in range(2):
        acc = np.zeros_like(W)
        for i, lst in enumerate(neigh):
            acc[i] = W[lst].mean(axis=0) if len(lst) else W[i]
        W = acc
    far = D > 0.020
    for b in BODY_BONES:
        far[:, idx[b]] = False
    W = np.where(far, 0.0, W)
    W /= np.maximum(W.sum(axis=1, keepdims=True), 1e-12)
    empty = W.sum(axis=1) <= 1e-9
    if empty.any():
        cols = [idx[b] for b in BODY_BONES]
        nearest = np.argmin(D[np.ix_(empty, cols)], axis=1)
        rows = np.nonzero(empty)[0]
        for r, c in zip(rows, nearest, strict=True):
            W[r, cols[c]] = 1.0
    order = np.argsort(-W, axis=1)
    mask = np.zeros_like(W, dtype=bool)
    for i in range(n):
        mask[i, order[i, :4]] = True
    W = np.where(mask, W, 0.0)
    W /= np.maximum(W.sum(axis=1, keepdims=True), 1e-12)
    for b in names:
        vg = work.vertex_groups.get(b) or work.vertex_groups.new(name=b)
        col = W[:, idx[b]]
        sel = np.nonzero(col > 0.001)[0]
        for vi in sel:
            vg.add([int(vi)], float(col[vi]), "REPLACE")
    mod = work.modifiers.new("rig", "ARMATURE")
    mod.object = arm
    log(
        "RIG",
        {
            "bones": len(names),
            "unweighted": int((W.sum(axis=1) <= 0.001).sum()),
            "weak_verts": int((W.max(axis=1) < 0.45).sum()),
        },
    )
    save_work()


def stage_probe():
    bpy.ops.wm.open_mainfile(filepath=WORK_BLEND)
    arm = bpy.data.objects["BirdRig"]
    work = bpy.data.objects["Bird"]
    bpy.context.view_layer.objects.active = arm
    landmarks = {
        "beak": (0.0, -0.068, 0.073),
        "crown": (0.0, -0.040, 0.094),
        "tail_tip": (0.0, 0.068, 0.029),
        "wing_tip_L": (-0.023, 0.027, 0.045),
        "breast": (0.0, -0.034, 0.048),
    }
    co = mesh_np(work)
    li = {
        k: int(np.argmin(np.linalg.norm(co - np.array(p), axis=1)))
        for k, p in landmarks.items()
    }
    dg = bpy.context.evaluated_depsgraph_get()

    def eval_pts():
        ev = work.evaluated_get(dg)
        eco = np.empty(len(ev.data.vertices) * 3, dtype=np.float64)
        ev.data.vertices.foreach_get("co", eco)
        eco = eco.reshape(-1, 3)
        wm = np.array(ev.matrix_world)
        return {k: (wm[:3, :3] @ eco[v] + wm[:3, 3]) for k, v in li.items()}

    base = eval_pts()
    out = {}
    axes = {"X": (1, 0, 0), "Y": (0, 1, 0), "Z": (0, 0, 1)}
    for bone, axis in [
        ("head", "X"),
        ("head", "Z"),
        ("neck", "X"),
        ("tail_1", "X"),
        ("tail_2", "X"),
        ("wing_L", "Z"),
        ("chest", "X"),
        ("body", "X"),
    ]:
        pb = arm.pose.bones[bone]
        pb.rotation_mode = "QUATERNION"
        pb.rotation_quaternion = Quaternion(axes[axis], math.radians(16))
        bpy.context.view_layer.update()
        moved = eval_pts()
        pb.rotation_quaternion = Quaternion((1, 0, 0, 0))
        bpy.context.view_layer.update()
        out[f"{bone}.{axis}"] = {
            k: (moved[k] - base[k]).round(4).tolist() for k in landmarks
        }
    with open(os.path.join(QA_DIR, "probe.json"), "w") as fh:
        json.dump(out, fh, indent=1)
    log("PROBE", out)


# --------------------------------------------------------------- clips
FPS = 24


def _env(t, a, b, c, d):
    if t < a or t > d:
        return 0.0
    if t < b:
        u = (t - a) / max(b - a, 1e-6)
        return u * u * (3 - 2 * u)
    if t > c:
        u = (t - c) / max(d - c, 1e-6)
        return 1 - u * u * (3 - 2 * u)
    return 1.0


def _pulse(t, center, width):
    return max(0.0, 1.0 - abs(t - center) / width)


# Clip pose functions are authored against the probe conventions;
# stage_probe output is read before these are finalized (the signs
# below follow the squirrel pipeline's local-axis pattern and are
# verified by the verify stage's posed renders).
def jay_idle(t):
    pose = {}
    br = math.sin(2 * math.pi * 1.1 * t)
    pose["chest"] = {"X": 0.35 * br}
    pose["tail_1"] = {"X": 1.2 * math.sin(2 * math.pi * 0.5 * t)}
    # songbird tail flicks: quick pulses every few seconds
    fl = max(_pulse(t, 3.4, 0.14), _pulse(t, 7.9, 0.14), _pulse(t, 11.8, 0.14))
    pose["tail_2"] = {"X": 7.0 * fl}
    pose["tail_1"]["X"] += 3.0 * fl
    # head tilts: the curious jay look, twice in the loop
    tilt = _env(t, 4.6, 5.0, 6.4, 6.9) - 0.7 * _env(t, 9.2, 9.6, 10.6, 11.0)
    pose["head"] = {"Z": 7.0 * tilt}
    pose["neck"] = {"Z": 3.0 * tilt}
    return pose


def jay_look(t):
    turn = _env(t, 0.4, 0.75, 3.4, 3.9)
    pose = {}
    pose["head"] = {"Z": -13.0 * turn, "X": 3.0 * turn}
    pose["neck"] = {"Z": -6.0 * turn}
    pose["tail_2"] = {"X": 6.0 * _pulse(t, 4.15, 0.16)}
    pose["chest"] = {"X": 0.35 * math.sin(2 * math.pi * 1.1 * t)}
    return pose


def jay_peck(t):
    dip = _env(t, 0.8, 1.15, 1.7, 2.1) + _env(t, 2.9, 3.25, 3.8, 4.2)
    pose = {}
    pose["neck"] = {"X": 10.0 * dip}
    pose["head"] = {"X": 12.0 * dip}
    pose["body"] = {"X": 2.5 * dip}
    pose["tail_1"] = {"X": 4.0 * dip}  # counterbalance: tail rises as the head dips
    pose["chest"] = {"X": 0.35 * math.sin(2 * math.pi * 1.1 * t)}
    return pose


def wp_idle(t):
    pose = {}
    pose["chest"] = {"X": 0.3 * math.sin(2 * math.pi * 0.9 * t)}
    turn = _env(t, 4.2, 4.9, 6.8, 7.5)
    pose["head"] = {"Z": 9.0 * turn}
    pose["neck"] = {"Z": 4.0 * turn}
    pose["tail_1"] = {"X": 0.8 * math.sin(2 * math.pi * 0.45 * t)}
    return pose


def wp_peck(t):
    pose = {}
    jab = 0.0
    for c in (1.5, 4.1):
        if c <= t <= c + 0.5:
            jab = max(
                jab,
                math.sin(2 * math.pi * 9.0 * (t - c))
                * _env(t, c, c + 0.06, c + 0.40, c + 0.5),
            )
    pose["head"] = {"X": 6.0 * jab}
    pose["neck"] = {"X": 3.5 * jab}
    pose["body"] = {"X": -1.2 * jab}
    pose["chest"] = {"X": 0.3 * math.sin(2 * math.pi * 0.9 * t)}
    return pose


def wp_look(t):
    pose = {}
    left = _env(t, 0.4, 0.8, 1.9, 2.3)
    right = _env(t, 2.5, 2.9, 4.0, 4.5)
    pose["head"] = {"Z": 12.0 * left - 12.0 * right}
    pose["neck"] = {"Z": 5.0 * left - 5.0 * right}
    pose["chest"] = {"X": 0.3 * math.sin(2 * math.pi * 0.9 * t)}
    return pose


CLIPS = {
    "jay": {
        "Jay_Idle": (12.0, jay_idle),
        "Jay_Look": (4.5, jay_look),
        "Jay_Peck": (5.0, jay_peck),
    },
    "woodpecker": {
        "Woodpecker_Idle": (12.0, wp_idle),
        "Woodpecker_Peck": (6.0, wp_peck),
        "Woodpecker_Look": (5.0, wp_look),
    },
}


def stage_clips():
    bpy.ops.wm.open_mainfile(filepath=WORK_BLEND)
    arm = bpy.data.objects["BirdRig"]
    scene = bpy.context.scene
    scene.render.fps = FPS
    bpy.context.view_layer.objects.active = arm
    for pb in arm.pose.bones:
        pb.rotation_mode = "QUATERNION"
    if arm.animation_data:
        for track in list(arm.animation_data.nla_tracks):
            arm.animation_data.nla_tracks.remove(track)
    axis_vec = {"X": (1, 0, 0), "Y": (0, 1, 0), "Z": (0, 0, 1)}
    made = {}
    for name, (dur, fn) in CLIPS[SPECIES].items():
        frames = int(dur * FPS)
        old = bpy.data.actions.get(name)
        if old:
            bpy.data.actions.remove(old)
        act = bpy.data.actions.new(name)
        arm.animation_data_create()
        arm.animation_data.action = act
        for f in range(frames + 1):
            scene.frame_set(f)
            pose = fn(f / FPS)
            for bone, off in pose.items():
                pb = arm.pose.bones[bone]
                q = Quaternion((1, 0, 0, 0))
                for axis_name, deg in off.items():
                    q = Quaternion(axis_vec[axis_name], math.radians(deg)) @ q
                pb.rotation_quaternion = q
                pb.keyframe_insert("rotation_quaternion", frame=f)
        for layer in act.layers:
            for strip in layer.strips:
                for bag in strip.channelbags:
                    for fc in bag.fcurves:
                        for kp in fc.keyframe_points:
                            kp.interpolation = "LINEAR"
        track = arm.animation_data.nla_tracks.new()
        track.name = name
        track.strips.new(name, 0, act)
        track.mute = True
        made[name] = frames
        for pb in arm.pose.bones:
            pb.rotation_quaternion = Quaternion((1, 0, 0, 0))
    first = next(iter(CLIPS[SPECIES]))
    arm.animation_data.action = bpy.data.actions[first]
    bpy.context.view_layer.update()
    log("CLIPS", made)
    save_work()


# -------------------------------------------------------------- export
def stage_export():
    bpy.ops.wm.open_mainfile(filepath=WORK_BLEND)
    keep = {"Bird", "BirdRig"}
    for obj in list(bpy.data.objects):
        if obj.name not in keep:
            bpy.data.objects.remove(obj, do_unlink=True)
    for img in bpy.data.images:
        cap = 2048 if img.name == "Image_0" else 1024
        if max(img.size) > cap:
            img.scale(cap, cap)
    bpy.ops.wm.save_as_mainfile(filepath=FINAL_BLEND)
    os.makedirs(os.path.dirname(GLB_PATH), exist_ok=True)
    bpy.ops.export_scene.gltf(
        filepath=GLB_PATH,
        export_format="GLB",
        export_animations=True,
        export_animation_mode="ACTIONS",
        export_force_sampling=True,
        export_apply=False,
        export_yup=True,
        export_image_format="JPEG",
        export_jpeg_quality=85,
    )
    import struct

    with open(GLB_PATH, "rb") as fh:
        blob = fh.read()
    jlen = struct.unpack("<I", blob[12:16])[0]
    doc = json.loads(blob[20 : 20 + jlen])
    node = next(nd for nd in doc["nodes"] if nd.get("name") == "Bird")
    assert "skin" in node, "bird exported without its skin"
    anims = sorted(a.get("name") for a in doc.get("animations", []))
    assert anims == sorted(CLIPS[SPECIES]), anims
    log(
        "EXPORT",
        {"glb": GLB_PATH, "bytes": os.path.getsize(GLB_PATH), "animations": anims},
    )


# -------------------------------------------------------------- verify
def stage_verify():
    path = GLB_PATH
    bpy.ops.wm.read_factory_settings(use_empty=True)
    bpy.ops.import_scene.gltf(filepath=path)
    inv = {"meshes": {}, "armatures": [], "actions": [], "images": {}}
    total = 0
    for obj in bpy.context.scene.objects:
        if obj.type == "MESH":
            tris = sum(len(p.vertices) - 2 for p in obj.data.polygons)
            total += tris
            inv["meshes"][obj.name] = {"tris": tris, "verts": len(obj.data.vertices)}
        elif obj.type == "ARMATURE":
            inv["armatures"].append(
                {"name": obj.name, "bones": [b.name for b in obj.data.bones]}
            )
    for act in bpy.data.actions:
        inv["actions"].append(
            {"name": act.name, "frames": [round(v, 1) for v in act.frame_range]}
        )
    for img in bpy.data.images:
        inv["images"][img.name] = list(img.size)
    inv["total_tris"] = total
    inv["bytes"] = os.path.getsize(path)
    with open(os.path.join(QA_DIR, "verify.json"), "w") as fh:
        json.dump(inv, fh, indent=1)
    log("VERIFY", inv)
    arm = next((o for o in bpy.context.scene.objects if o.type == "ARMATURE"), None)
    if arm is not None:
        arm.animation_data_create()
        scene = bpy.context.scene
        scene.render.fps = FPS
        frames = {"Idle": 60, "Look": 55, "Peck": 40 if SPECIES == "jay" else 100}
        for suffix, frame in frames.items():
            act_name = next((a for a in CLIPS[SPECIES] if a.endswith(suffix)), None)
            act = bpy.data.actions.get(act_name) if act_name else None
            if act is None:
                continue
            arm.animation_data.action = act
            scene.frame_set(frame)
            bpy.context.view_layer.update()
            render_views(
                QA_DIR, f"verify-{suffix.lower()}", target=(0, 0, 0.045), dist=0.30
            )
        arm.animation_data.action = None
        scene.frame_set(0)


STAGES = {
    "prep": stage_prep,
    "paint": stage_paint,
    "correct": stage_correct,
    "rig": stage_rig,
    "probe": stage_probe,
    "clips": stage_clips,
    "export": stage_export,
    "verify": stage_verify,
}

if __name__ == "__main__":
    STAGES[STAGE]()
