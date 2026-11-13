# TW-1075 Phase B: reproducible rig build for the Grab3D buck (CC0).
#
# Stages (run in order, each opens the previous stage's saved .blend):
#   prep    open the preserved source .blend, duplicate the mesh,
#           decimate a copy to a deformation mesh, dump landmarks.
#   probe   pose single bones on the rigged file and print vertex
#           displacement directions (locks rotation sign conventions).
#   rig     build the armature, distance-based skinning with zone
#           corrections, save.
#   stance  author the founder slope stance (stance pitch + per-leg
#           hoof fitting), numeric hoof-to-plane check, save pose as
#           the base of every clip.
#   clips   author Lookout_Idle / Look_Left / Look_Right / Ear_Adjust.
#   export  downscale textures, export the self-contained GLB.
#   verify  re-import the GLB, inventory clips, posed renders.
#
# Usage: blender -b --factory-startup -P build_buck_rig.py -- --stage prep
import json
import math
import os
import sys

import bpy
import numpy as np
from mathutils import Quaternion, Vector

SRC_BLEND = os.path.expanduser(
    "~/workspace/twistor-lab/projects/our-lgcy/tw1075-grab3d-source/deer.blend"
)
WORK_BLEND = os.path.expanduser(
    "~/workspace/twistor-lab/projects/our-lgcy/tw1075-grab3d-source/buck-rig-work.blend"
)
QA_DIR = os.path.expanduser(
    "~/workspace/repos/ourlgcy-demo-tw1075b/qa/tw1075-grab3d/rig"
)
TARGET_TRIS = 22000

# Measured on the source mesh in Phase A (ASSET-GATE.md section 5).
HOOF_CONTACTS = {
    "front_L": (-0.131, -0.207, 0.0006),
    "front_R": (0.182, -0.206, 0.0),
    "hind_L": (-0.131, 0.664, 0.0006),
    "hind_R": (0.207, 0.541, 0.0018),
}


def log(tag, payload):
    print(f"@@{tag}@@ {json.dumps(payload, default=str)}")


def save_work():
    bpy.ops.wm.save_as_mainfile(filepath=WORK_BLEND)


def stage_prep():
    bpy.ops.wm.open_mainfile(filepath=SRC_BLEND)
    src = next(o for o in bpy.context.scene.objects if o.type == "MESH")
    src.name = "DeerSource_DO_NOT_EXPORT"
    src.hide_render = True
    work = src.copy()
    work.data = src.data.copy()
    work.name = "Buck"
    work.hide_render = False
    bpy.context.scene.collection.objects.link(work)
    src.hide_set(True)

    bpy.context.view_layer.objects.active = work
    work.select_set(True)
    ratio = TARGET_TRIS / len(work.data.polygons)
    mod = work.modifiers.new("decimate", "DECIMATE")
    mod.decimate_type = "COLLAPSE"
    mod.ratio = ratio
    mod.use_collapse_triangulate = True
    bpy.ops.object.modifier_apply(modifier=mod.name)
    me = work.data
    tris = sum(len(p.vertices) - 2 for p in me.polygons)

    co = np.empty(len(me.vertices) * 3, dtype=np.float64)
    me.vertices.foreach_get("co", co)
    co = co.reshape(-1, 3)

    def cluster(mask):
        pts = co[mask]
        if len(pts) == 0:
            return None
        return {
            "n": len(pts),
            "centroid": [round(float(v), 4) for v in pts.mean(axis=0)],
            "min": [round(float(v), 4) for v in pts.min(axis=0)],
            "max": [round(float(v), 4) for v in pts.max(axis=0)],
        }

    x, y, z = co[:, 0], co[:, 1], co[:, 2]
    head_zone = (y < -0.45) & (z > 1.38)
    landmarks = {
        "tris_after_decimate": tris,
        "verts": len(me.vertices),
        "ear_L": cluster(head_zone & (x < -0.045)),
        "ear_R": cluster(head_zone & (x > 0.045)),
        "antler_zone": cluster((y < -0.45) & (z > 1.52)),
        "tail_zone": cluster((y > 0.70) & (z > 0.85)),
        "bounds_min": [round(float(v), 4) for v in co.min(axis=0)],
        "bounds_max": [round(float(v), 4) for v in co.max(axis=0)],
    }
    os.makedirs(QA_DIR, exist_ok=True)
    with open(os.path.join(QA_DIR, "landmarks.json"), "w") as f:
        json.dump(landmarks, f, indent=1)
    log("PREP", landmarks)
    save_work()


def smoothstep(a, b, v):
    t = np.clip((v - a) / (b - a), 0.0, 1.0)
    return t * t * (3.0 - 2.0 * t)


def render_views(outdir, prefix):
    """Neutral QA renders of the Buck object as it currently stands."""
    scene = bpy.context.scene
    buck = bpy.data.objects["Buck"]
    for ob in scene.objects:
        if ob.type in ("LIGHT", "CAMERA"):
            bpy.data.objects.remove(ob, do_unlink=True)
    for name in ("GroundQA",):
        if name in bpy.data.objects:
            bpy.data.objects.remove(bpy.data.objects[name], do_unlink=True)
    scene.render.engine = "CYCLES"
    scene.cycles.samples = 32
    scene.cycles.use_denoising = True
    scene.cycles.device = "CPU"
    scene.render.resolution_x = 960
    scene.render.resolution_y = 540
    if not scene.world:
        scene.world = bpy.data.worlds.new("W")
    scene.world.use_nodes = True
    bg = scene.world.node_tree.nodes.get("Background")
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
    area.location = (2.5, -2.5, 3.0)
    scene.collection.objects.link(area)

    corners = [buck.matrix_world @ Vector(c) for c in buck.bound_box]
    xs = [c.x for c in corners]
    ys = [c.y for c in corners]
    zs = [c.z for c in corners]
    lo = Vector((min(xs), min(ys), min(zs)))
    hi = Vector((max(xs), max(ys), max(zs)))
    size = hi - lo
    center = (lo + hi) / 2
    bpy.ops.mesh.primitive_plane_add(size=30, location=(center.x, center.y, lo.z - 0.001))
    ground = bpy.context.object
    ground.name = "GroundQA"
    gmat = bpy.data.materials.new("groundqa")
    gmat.use_nodes = True
    gmat.node_tree.nodes["Principled BSDF"].inputs["Base Color"].default_value = (0.36, 0.38, 0.35, 1)
    ground.data.materials.append(gmat)

    cam_data = bpy.data.cameras.new("Cam")
    cam_data.lens = 50
    cam = bpy.data.objects.new("Cam", cam_data)
    scene.collection.objects.link(cam)
    scene.camera = cam
    # frame the whole bounding sphere: earlier fixed factor cropped the
    # legs out of the evidence renders, which defeats their purpose
    radius = size.length / 2
    fit = radius / math.tan(min(cam_data.angle, cam_data.angle_y) / 2)
    dist = fit * 1.08
    mid = center.copy()
    views = {
        "side": mid + Vector((dist, 0, 0)),
        "side-opp": mid + Vector((-dist, 0, 0)),
        "front": mid + Vector((0, -dist, 0)),
        "tq-front": mid + Vector((dist * 0.72, -dist * 0.72, size.z * 0.18)),
    }
    for name, pos in views.items():
        cam.location = pos
        d = mid - cam.location
        cam.rotation_euler = d.to_track_quat("-Z", "Y").to_euler()
        scene.render.filepath = os.path.join(outdir, f"{prefix}-{name}.png")
        bpy.ops.render.render(write_still=True)
        print(f"@@RENDER@@ {prefix}-{name}")


# Founder anatomy correction (Nov 13): legs longer and leaner than the
# Meshy base and the reference photo; the founder overrides the photo
# on this trait only. Length: body raised on a smooth band plus a
# small distributed stretch down each leg column. Slim: leg columns
# pulled toward their own axis, strongest at the cannon bones,
# hooves nearly untouched, shoulder and hip muscle left full.
LEG_RAISE = 0.12
LEG_STRETCH = 0.05


def stage_correct():
    bpy.ops.wm.open_mainfile(filepath=WORK_BLEND)
    work = bpy.data.objects["Buck"]
    me = work.data
    co = np.empty(len(me.vertices) * 3, dtype=np.float64)
    me.vertices.foreach_get("co", co)
    co = co.reshape(-1, 3).copy()
    x, y, z = co[:, 0], co[:, 1], co[:, 2]

    axes = np.array([[c[0], c[1]] for c in HOOF_CONTACTS.values()])
    d = np.sqrt(((co[:, :2][:, None, :] - axes[None, :, :]) ** 2).sum(axis=2))
    dmin = d.min(axis=1)
    w_leg = np.clip((0.18 - dmin) / 0.08, 0.0, 1.0)
    w_leg = w_leg * w_leg * (3.0 - 2.0 * w_leg)
    nearest = d.argmin(axis=1)

    # z transforms: body path and leg path, blended by w_leg
    body_raise = LEG_RAISE * smoothstep(0.45, 0.70, z)
    z_body = z + body_raise
    t_leg = smoothstep(0.55, 0.95, z)
    z_leg = z * (1.0 + LEG_STRETCH * (1.0 - t_leg)) + LEG_RAISE * t_leg
    z_new = z_body * (1.0 - w_leg) + z_leg * w_leg

    # slimming toward the nearest leg axis, leg verts only
    f = np.ones_like(z)
    f = np.where(z < 0.06, 0.96, f)
    f = np.where((z >= 0.06) & (z < 0.35), 0.84, f)
    f = np.where((z >= 0.35) & (z < 0.70), 0.90, f)
    f = np.where((z >= 0.70) & (z < 0.95), 0.90 + 0.10 * smoothstep(0.70, 0.95, z), f)
    f_eff = 1.0 - (1.0 - f) * w_leg
    ax = axes[nearest]
    x_new = ax[:, 0] + (x - ax[:, 0]) * f_eff
    fy = f_eff**0.7
    y_new = ax[:, 1] + (y - ax[:, 1]) * fy

    out = np.stack([x_new, y_new, z_new], axis=1)
    me.vertices.foreach_set("co", out.reshape(-1))
    me.update()

    # re-derive proportions and hoof contacts from the corrected mesh
    low = out[out[:, 2] < 0.03]
    cells = {}
    for p in low:
        key = (round(float(p[0]) / 0.09), round(float(p[1]) / 0.09))
        cells.setdefault(key, []).append(p)
    clusters = []
    for key, pts in sorted(cells.items()):
        arr = np.array(pts)
        clusters.append(
            {
                "cell": list(key),
                "verts": len(pts),
                "centroid": [round(float(v), 4) for v in arr.mean(axis=0)],
                "min_z": round(float(arr[:, 2].min()), 4),
            }
        )
    mid_x = np.abs(out[:, 0]) < 0.05
    back = out[mid_x & (out[:, 1] > -0.55) & (out[:, 1] < -0.15)]
    withers = float(back[:, 2].max()) if len(back) else None
    belly_band = out[(np.abs(out[:, 0]) < 0.03) & (out[:, 1] > -0.1) & (out[:, 1] < 0.3)]
    belly = float(belly_band[:, 2].min()) if len(belly_band) else None
    report = {
        "raise_m": LEG_RAISE,
        "stretch": LEG_STRETCH,
        "bounds_min": [round(float(v), 4) for v in out.min(axis=0)],
        "bounds_max": [round(float(v), 4) for v in out.max(axis=0)],
        "withers_z": round(withers, 4) if withers else None,
        "belly_clearance_z": round(belly, 4) if belly else None,
        "clearance_ratio": round(belly / withers, 3) if withers and belly else None,
        "hoof_clusters": clusters,
    }
    os.makedirs(QA_DIR, exist_ok=True)
    with open(os.path.join(QA_DIR, "correction.json"), "w") as fh:
        json.dump(report, fh, indent=1)
    log("CORRECT", report)
    save_work()
    render_views(QA_DIR, "corrected")


def seg_dist(pts, a, b):
    """Distance from each point to segment ab, and clamped projection t."""
    a = np.array(a, dtype=np.float64)
    b = np.array(b, dtype=np.float64)
    ab = b - a
    denom = float(ab @ ab)
    t = ((pts - a) @ ab) / denom if denom > 0 else np.zeros(len(pts))
    t = np.clip(t, 0.0, 1.0)
    proj = a + t[:, None] * ab
    return np.sqrt(((pts - proj) ** 2).sum(axis=1)), t


def stage_rig():
    bpy.ops.wm.open_mainfile(filepath=WORK_BLEND)
    work = bpy.data.objects["Buck"]
    # idempotency: strip any rig from a previous run of this stage
    for ob in list(bpy.data.objects):
        if ob.type == "ARMATURE":
            bpy.data.objects.remove(ob, do_unlink=True)
    for mod in list(work.modifiers):
        if mod.type == "ARMATURE":
            work.modifiers.remove(mod)
    work.vertex_groups.clear()
    if work.parent and work.parent.type == "ARMATURE":
        work.parent = None
    me = work.data
    V = np.empty(len(me.vertices) * 3, dtype=np.float64)
    me.vertices.foreach_get("co", V)
    V = V.reshape(-1, 3).copy()

    def band(mask):
        pts = V[mask]
        return pts.mean(axis=0) if len(pts) else None

    # ---- measurements on the corrected mesh ----
    def ridge_z(y0):
        m = (np.abs(V[:, 0]) < 0.045) & (np.abs(V[:, 1] - y0) < 0.05) & (V[:, 2] > 0.9)
        return float(np.percentile(V[m][:, 2], 97)) if m.sum() > 5 else 1.30

    head_c = band((V[:, 1] < -0.52) & (V[:, 2] > 1.30))
    neck_a = band(
        (V[:, 1] > -0.42) & (V[:, 1] < -0.34) & (np.abs(V[:, 0]) < 0.075)
        & (V[:, 2] > 1.05) & (V[:, 2] < 1.50)
    )
    neck_b = band(
        (V[:, 1] > -0.54) & (V[:, 1] < -0.46) & (np.abs(V[:, 0]) < 0.07)
        & (V[:, 2] > 1.20) & (V[:, 2] < 1.62)
    )

    def leg_centerline(axis_xy):
        d = np.sqrt((V[:, 0] - axis_xy[0]) ** 2 + (V[:, 1] - axis_xy[1]) ** 2)
        pts = {}
        for zc in (0.98, 0.80, 0.62, 0.55, 0.45, 0.38, 0.28, 0.15, 0.05):
            m = (d < 0.155) & (np.abs(V[:, 2] - zc) < 0.05)
            if m.sum() > 3:
                pts[zc] = V[m].mean(axis=0)
        return pts

    centerlines = {k: leg_centerline(v[:2]) for k, v in HOOF_CONTACTS.items()}

    def cl(leg, zc, fallback):
        pts = centerlines[leg]
        if zc in pts:
            p = pts[zc]
            return (float(p[0]), float(p[1]), float(p[2]))
        return fallback

    z = ridge_z
    B = {}
    B["root"] = ((0.0, 0.10, 0.0), (0.0, 0.10, 0.25), None)
    B["pelvis"] = ((0.0, 0.52, z(0.52) - 0.15), (0.0, 0.28, z(0.28) - 0.14), "root")
    B["spine"] = (B["pelvis"][1], (0.0, 0.02, z(0.02) - 0.13), "pelvis")
    B["chest"] = (B["spine"][1], (0.0, -0.24, z(-0.24) - 0.15), "spine")
    na = (float(neck_a[0]), float(neck_a[1]), float(neck_a[2]) - 0.03)
    nb = (float(neck_b[0]), float(neck_b[1]), float(neck_b[2]) - 0.02)
    B["neck_1"] = (B["chest"][1], na, "chest")
    B["neck_2"] = (na, nb, "neck_1")
    hc = (float(head_c[0]), float(head_c[1]), float(head_c[2]))
    B["head"] = (nb, (hc[0], hc[1] - 0.09, hc[2] + 0.05), "neck_2")
    B["jaw"] = ((nb[0], nb[1] - 0.03, nb[2] - 0.055), (hc[0], hc[1] - 0.20, hc[2] - 0.10), "head")
    # Ear bones measured from the island census (the head is yawed in
    # the source pose, so the ears are NOT mirror-symmetric: the right
    # ear flares out at +X, the left ear tucks to the back-top).
    B["ear_L"] = ((-0.052, -0.452, 1.472), (-0.118, -0.398, 1.585), "head")
    B["ear_R"] = ((0.128, -0.520, 1.498), (0.243, -0.598, 1.635), "head")
    tc = band((V[:, 1] > 0.68) & (V[:, 2] > 0.82) & (np.abs(V[:, 0]) < 0.09))
    B["tail"] = (
        (0.012, 0.665, z(0.665) - 0.10 if False else 1.075),
        (float(tc[0]), float(tc[1]) + 0.03, float(tc[2]) - 0.05),
        "pelvis",
    )
    for leg, sgn in (("front_L", "L"), ("front_R", "R")):
        sho = cl(leg, 0.98, HOOF_CONTACTS[leg])
        sho = (sho[0] * 0.88, sho[1], 1.00)
        elb = cl(leg, 0.55, (sho[0], sho[1], 0.55))
        fet = cl(leg, 0.15, (sho[0], sho[1], 0.15))
        toe = (fet[0], fet[1] - 0.05, 0.012)
        B[f"upperarm_{sgn}"] = (sho, elb, "chest")
        B[f"forearm_{sgn}"] = (elb, fet, f"upperarm_{sgn}")
        B[f"hoof_F{sgn}"] = (fet, toe, f"forearm_{sgn}")
    for leg, sgn in (("hind_L", "L"), ("hind_R", "R")):
        hip = cl(leg, 0.98, HOOF_CONTACTS[leg])
        hip = (hip[0] * 0.90, hip[1], 1.02)
        sti = cl(leg, 0.55, (hip[0], hip[1] - 0.10, 0.55))
        hok = cl(leg, 0.38, (hip[0], hip[1] + 0.03, 0.38))
        fet = cl(leg, 0.15, (hip[0], hip[1], 0.15))
        toe = (fet[0], fet[1] - 0.05, 0.012)
        B[f"thigh_{sgn}"] = (hip, sti, "pelvis")
        B[f"gaskin_{sgn}"] = (sti, hok, f"thigh_{sgn}")
        B[f"cannon_{sgn}"] = (hok, fet, f"gaskin_{sgn}")
        B[f"hoof_H{sgn}"] = (fet, toe, f"cannon_{sgn}")

    # ---- armature ----
    arm_data = bpy.data.armatures.new("BuckRig")
    arm = bpy.data.objects.new("BuckRig", arm_data)
    bpy.context.scene.collection.objects.link(arm)
    bpy.context.view_layer.objects.active = arm
    bpy.ops.object.mode_set(mode="EDIT")
    ebs = {}
    for name, (head, tail, parent) in B.items():
        eb = arm_data.edit_bones.new(name)
        eb.head = head
        eb.tail = tail
        ebs[name] = eb
    for name, (head, tail, parent) in B.items():
        if parent:
            ebs[name].parent = ebs[parent]
            chain = {"spine", "chest", "neck_1", "neck_2", "head"}
            legs = name.startswith(("forearm", "hoof", "gaskin", "cannon"))
            ebs[name].use_connect = name in chain or legs
    bpy.ops.object.mode_set(mode="OBJECT")
    for pb in arm.pose.bones:
        pb.rotation_mode = "QUATERNION"

    # ---- skinning: distance softmax + scripted zone corrections ----
    names = list(B.keys())
    idx = {n: i for i, n in enumerate(names)}
    sigma = {
        "pelvis": 0.10, "spine": 0.10, "chest": 0.10, "neck_1": 0.065,
        "neck_2": 0.06, "head": 0.075, "jaw": 0.04, "tail": 0.05,
        "ear_L": 0.03, "ear_R": 0.03, "root": 1.0,
    }
    for n in names:
        if n.startswith(("upperarm", "thigh")):
            sigma[n] = 0.055
        elif n.startswith(("forearm", "gaskin", "cannon")):
            sigma[n] = 0.045
        elif n.startswith("hoof"):
            sigma[n] = 0.032
    W = np.zeros((len(V), len(names)))
    body_set = ["pelvis", "spine", "chest", "neck_1", "neck_2", "head"]
    # Body weights come from projection onto the body polyline, NOT
    # distance to the bone line: the torso surface sits 0.2-0.35 m from
    # the spine line, so a distance softmax zeroes the belly and rump
    # (first attempt put 39% of verts on a spine fallback; rejected).
    poly = [np.array(B["pelvis"][0])]
    for n in body_set:
        poly.append(np.array(B[n][1]))
    best = np.full(len(V), 1e9)
    bseg = np.zeros(len(V), dtype=int)
    bt = np.zeros(len(V))
    for s in range(len(poly) - 1):
        d, t = seg_dist(V, poly[s], poly[s + 1])
        upd = d < best
        best[upd] = d[upd]
        bseg[upd] = s
        bt[upd] = t[upd]
    for i, n in enumerate(body_set):
        m = bseg == i
        W[m, idx[n]] += 1.0 - bt[m]
        if i + 1 < len(body_set):
            W[m, idx[body_set[i + 1]]] += bt[m]
        else:
            W[m, idx[n]] += bt[m]
    # legs override inside their columns, blended out at the top band
    leg_bones = {
        "front_L": ["upperarm_L", "forearm_L", "hoof_FL"],
        "front_R": ["upperarm_R", "forearm_R", "hoof_FR"],
        "hind_L": ["thigh_L", "gaskin_L", "cannon_L", "hoof_HL"],
        "hind_R": ["thigh_R", "gaskin_R", "cannon_R", "hoof_HR"],
    }
    for leg, bones in leg_bones.items():
        ax = HOOF_CONTACTS[leg]
        dxy = np.sqrt((V[:, 0] - ax[0]) ** 2 + (V[:, 1] - ax[1]) ** 2)
        mask = (dxy < 0.185) & (V[:, 2] < 1.04)
        if not mask.any():
            continue
        lw = np.zeros((mask.sum(), len(names)))
        for n in bones:
            d, _ = seg_dist(V[mask], B[n][0], B[n][1])
            lw[:, idx[n]] = np.exp(-((d / sigma[n]) ** 2))
        lw = lw / np.maximum(lw.sum(axis=1, keepdims=True), 1e-9)
        bw = W[mask]
        bw = bw / np.maximum(bw.sum(axis=1, keepdims=True), 1e-9)
        t = smoothstep(0.90, 1.04, V[mask][:, 2])[:, None]
        W[mask] = bw * t + lw * (1.0 - t)
    # tail zone
    d, _ = seg_dist(V, B["tail"][0], B["tail"][1])
    tm = (V[:, 1] > 0.665) & (V[:, 2] > 0.82) & (np.abs(V[:, 0]) < 0.095) & (d < 0.10)
    W[tm] = 0.0
    W[tm, idx["tail"]] = 0.75
    W[tm, idx["pelvis"]] = 0.25
    # ears: distance-to-ear-segment mask (the earlier ellipsoid guess
    # missed both ears entirely; segment distance from the measured
    # bones is exact, and antler shells sit >0.10 from the segments)
    for bone in ("ear_L", "ear_R"):
        d, _ = seg_dist(V, B[bone][0], B[bone][1])
        em = d < 0.085
        w = 0.95 * (1.0 - d[em] / 0.085) ** 1.5
        W[em] = 0.0
        W[em, idx[bone]] = w
        W[em, idx["head"]] = 1.0 - w
    # jaw zone
    jm = ((V[:, 1] > -0.76) & (V[:, 1] < -0.55) & (V[:, 2] > 1.34)
          & (V[:, 2] < 1.485) & (np.abs(V[:, 0]) < 0.058))
    W[jm] = 0.0
    W[jm, idx["jaw"]] = 0.40
    W[jm, idx["head"]] = 0.60
    # antlers + eyes rigid to head (after ear extraction)
    am = (V[:, 2] > 1.63) & (V[:, 1] < -0.46)
    eye = np.zeros(len(V), dtype=bool)
    for ex in (-0.060, 0.060):
        eye |= np.sqrt((V[:, 0] - ex) ** 2 + (V[:, 1] + 0.650) ** 2
                       + (V[:, 2] - 1.595) ** 2) < 0.030
    rigid = am | eye
    rigid &= ~((W[:, idx["ear_L"]] >= 0.5) | (W[:, idx["ear_R"]] >= 0.5))
    W[rigid] = 0.0
    W[rigid, idx["head"]] = 1.0
    # SPATIAL smoothing on non-rigid rows. The source is a mosaic of
    # overlapping shells, so topology smoothing cannot unify weights
    # across shell boundaries and bends opened cracks along them
    # (seen at the jaw and neck in the first turn test). Averaging
    # weights over spatial neighbors makes coincident shells move
    # together.
    from collections import defaultdict
    radius = 0.028
    keys = np.floor(V / radius).astype(int)
    grid = defaultdict(list)
    for i, k in enumerate(map(tuple, keys)):
        grid[k].append(i)
    offsets = [(dx, dy, dz) for dx in (-1, 0, 1) for dy in (-1, 0, 1)
               for dz in (-1, 0, 1)]
    nbrs = []
    for i in range(len(V)):
        k = tuple(keys[i])
        cand = []
        for o in offsets:
            cand += grid.get((k[0] + o[0], k[1] + o[1], k[2] + o[2]), [])
        cand = np.array(cand)
        d2 = ((V[cand] - V[i]) ** 2).sum(axis=1)
        nbrs.append(cand[d2 <= radius * radius])
    for _ in range(3):
        acc = W.copy()
        for i, nb in enumerate(nbrs):
            if len(nb):
                acc[i] = 0.5 * W[i] + 0.5 * W[nb].mean(axis=0)
        W = np.where(rigid[:, None], W, acc)
    W[W < 0.01] = 0.0
    sums = W.sum(axis=1)
    zero = sums <= 0
    if zero.any():
        W[zero, idx["spine"]] = 1.0
        sums = W.sum(axis=1)
    W = W / sums[:, None]

    groups = {n: work.vertex_groups.new(name=n) for n in names}
    for i in range(len(V)):
        for b in np.nonzero(W[i] > 0.001)[0]:
            groups[names[b]].add([i], float(W[i, b]), "REPLACE")
    work.parent = arm
    mod = work.modifiers.new("BuckRig", "ARMATURE")
    mod.object = arm

    bones_doc = {
        n: {"head": list(h), "tail": list(t), "parent": p} for n, (h, t, p) in B.items()
    }
    with open(os.path.join(QA_DIR, "bones.json"), "w") as fh:
        json.dump(bones_doc, fh, indent=1)
    weak = int((W.max(axis=1) < 0.45).sum())
    log("RIG", {"bones": len(names), "verts": len(V), "weak_verts": weak,
                "zero_weight_verts": int(zero.sum())})
    save_work()


def evaluated_verts():
    dg = bpy.context.evaluated_depsgraph_get()
    work = bpy.data.objects["Buck"]
    ev = work.evaluated_get(dg)
    tmp = ev.to_mesh()
    pts = np.empty(len(tmp.vertices) * 3, dtype=np.float64)
    tmp.vertices.foreach_get("co", pts)
    ev.to_mesh_clear()
    return pts.reshape(-1, 3)


def hoof_report(pts):
    low = pts[pts[:, 2] < float(pts[:, 2].min()) + 0.045]
    cells = {}
    for p in low:
        key = (round(float(p[0]) / 0.09), round(float(p[1]) / 0.09))
        cells.setdefault(key, []).append(p)
    cents = [np.array(v).mean(axis=0) for v in cells.values() if len(v) >= 4]
    front = [c for c in cents if c[1] < 0]
    hind = [c for c in cents if c[1] >= 0]
    fz = float(np.mean([c[2] for c in front])) if front else None
    hz = float(np.mean([c[2] for c in hind])) if hind else None
    fy = float(np.mean([c[1] for c in front])) if front else 0.0
    hy = float(np.mean([c[1] for c in hind])) if hind else 0.0
    slope = math.degrees(math.atan2(fz - hz, hy - fy)) if fz is not None and hz is not None else None
    return {"front_z": fz, "hind_z": hz, "min_z": float(pts[:, 2].min()),
            "slope_deg": round(slope, 2) if slope is not None else None,
            "clusters": len(cents)}


def focus_render(path, cam_pos, target, lens=62):
    scene = bpy.context.scene
    for ob in list(scene.objects):
        if ob.type in ("LIGHT", "CAMERA"):
            bpy.data.objects.remove(ob, do_unlink=True)
    if "GroundQA" in bpy.data.objects:
        bpy.data.objects.remove(bpy.data.objects["GroundQA"], do_unlink=True)
    scene.render.engine = "CYCLES"
    scene.cycles.samples = 32
    scene.cycles.use_denoising = True
    scene.cycles.device = "CPU"
    scene.render.resolution_x = 960
    scene.render.resolution_y = 540
    if not scene.world:
        scene.world = bpy.data.worlds.new("W")
    scene.world.use_nodes = True
    bg = scene.world.node_tree.nodes.get("Background")
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
    area.location = (2.5, -2.5, 3.0)
    scene.collection.objects.link(area)
    cam_data = bpy.data.cameras.new("Cam")
    cam_data.lens = lens
    cam = bpy.data.objects.new("Cam", cam_data)
    scene.collection.objects.link(cam)
    scene.camera = cam
    cam.location = cam_pos
    d = Vector(target) - cam.location
    cam.rotation_euler = d.to_track_quat("-Z", "Y").to_euler()
    scene.render.filepath = path
    bpy.ops.render.render(write_still=True)
    print(f"@@RENDER@@ {os.path.basename(path)}")


# Founder staging (Nov 13): buck at the crest of a slanted rock, head
# above hindquarters, head raised in the lookout. Founder staging
# simplification (Nov 13, later): lower body blends into the page
# break, so the stance is a clean static crest pose, not hoof
# choreography. A rigid root pitch keeps all four hooves coplanar on
# the slope plane by construction; root lift puts the hind pair on it.
STANCE_PITCH_DEG = -15.0


def apply_stance(arm):
    for pb in arm.pose.bones:
        pb.rotation_quaternion = (1.0, 0.0, 0.0, 0.0)
        pb.location = (0.0, 0.0, 0.0)
    root = arm.pose.bones["root"]
    root.rotation_quaternion = Quaternion((1, 0, 0), math.radians(STANCE_PITCH_DEG))
    bpy.context.view_layer.update()
    pts = evaluated_verts()
    lift = -float(pts[:, 2].min())
    # pose location is in the bone's local frame; convert the world +Z
    # lift through the root bone's rest orientation
    r_inv = root.bone.matrix_local.to_3x3().inverted()
    root.location = r_inv @ Vector((0.0, 0.0, lift))
    bpy.context.view_layer.update()
    return lift


def stance_dict(arm):
    out = {}
    for pb in arm.pose.bones:
        out[pb.name] = {
            "q": [float(v) for v in pb.rotation_quaternion],
            "loc": [float(v) for v in pb.location],
        }
    return out


def stage_stance():
    bpy.ops.wm.open_mainfile(filepath=WORK_BLEND)
    arm = bpy.data.objects["BuckRig"]
    lift = apply_stance(arm)
    pts = evaluated_verts()
    rep = hoof_report(pts)
    rep["root_lift"] = round(lift, 4)
    log("STANCE", rep)
    with open(os.path.join(QA_DIR, "stance.json"), "w") as fh:
        json.dump(stance_dict(arm), fh, indent=1)
    # per-hoof tracked check: each hoof's own rest verts, evaluated
    work = bpy.data.objects["Buck"]
    V = np.empty(len(work.data.vertices) * 3, dtype=np.float64)
    work.data.vertices.foreach_get("co", V)
    V = V.reshape(-1, 3)
    tracked = {}
    for leg, c in HOOF_CONTACTS.items():
        d = np.sqrt((V[:, 0] - c[0]) ** 2 + (V[:, 1] - c[1]) ** 2)
        sel = np.where((d < 0.075) & (V[:, 2] < 0.05))[0]
        cen = pts[sel].mean(axis=0)
        tracked[leg] = {"centroid": [round(float(v), 4) for v in cen],
                        "min_z": round(float(pts[sel][:, 2].min()), 4)}
    fz = np.mean([tracked[l]["centroid"][2] for l in ("front_L", "front_R")])
    hz = np.mean([tracked[l]["centroid"][2] for l in ("hind_L", "hind_R")])
    fy = np.mean([tracked[l]["centroid"][1] for l in ("front_L", "front_R")])
    hy = np.mean([tracked[l]["centroid"][1] for l in ("hind_L", "hind_R")])
    tracked["slope_deg"] = round(math.degrees(math.atan2(fz - hz, hy - fy)), 2)
    tracked["max_hoof_min_z_spread"] = round(
        max(v["min_z"] for v in tracked.values() if isinstance(v, dict))
        - min(v["min_z"] for v in tracked.values() if isinstance(v, dict)), 4)
    log("HOOVES", tracked)
    with open(os.path.join(QA_DIR, "hooves.json"), "w") as fh:
        json.dump(tracked, fh, indent=1)
    save_work()
    focus_render(os.path.join(QA_DIR, "stance-side.png"),
                 (4.6, -0.15, 1.15), (0, 0.02, 0.98))
    focus_render(os.path.join(QA_DIR, "stance-low-tq.png"),
                 (2.3, -3.0, 0.55), (0, -0.02, 1.05))


def set_pose(arm, spec):
    """spec: {bone: (axis_char, degrees)} local-space rotations over stance."""
    with open(os.path.join(QA_DIR, "stance.json")) as fh:
        sd = json.load(fh)
    for name, (q, loc) in ((k, (v["q"], v["loc"])) for k, v in sd.items()):
        pb = arm.pose.bones[name]
        pb.rotation_quaternion = Quaternion(q)
        pb.location = Vector(loc)
    for name, (axis, deg) in spec.items():
        pb = arm.pose.bones[name]
        av = {"X": (1, 0, 0), "Y": (0, 1, 0), "Z": (0, 0, 1)}[axis]
        dq = Quaternion(av, math.radians(deg))
        pb.rotation_quaternion = pb.rotation_quaternion @ dq
    bpy.context.view_layer.update()


def stage_probe():
    bpy.ops.wm.open_mainfile(filepath=WORK_BLEND)
    arm = bpy.data.objects["BuckRig"]
    work = bpy.data.objects["Buck"]
    me = work.data
    V = np.empty(len(me.vertices) * 3, dtype=np.float64)
    me.vertices.foreach_get("co", V)
    V = V.reshape(-1, 3)
    head_mask = (V[:, 1] < -0.52) & (V[:, 2] > 1.30)
    head_idx = np.where(head_mask)[0]
    nose_d = np.sqrt((V[:, 0] - 0.02) ** 2 + (V[:, 1] + 0.76) ** 2
                     + (V[:, 2] - 1.50) ** 2)
    nose_idx = np.argsort(nose_d)[:24]
    ear_idx = {}
    for sgn in ("L", "R"):
        g = work.vertex_groups[f"ear_{sgn}"]
        sel = []
        for i, v in enumerate(me.vertices):
            for gr in v.groups:
                if gr.group == g.index and gr.weight > 0.5:
                    sel.append(i)
        ear_idx[sgn] = np.array(sel)
    apply_stance(arm)
    base = evaluated_verts()
    base_nose = base[nose_idx].mean(axis=0)
    base_ear = {s: base[i].mean(axis=0) for s, i in ear_idx.items() if len(i)}
    results = {}
    for bone, kind in (("head", "head"), ("neck_2", "head"), ("neck_1", "head"),
                       ("ear_L", "L"), ("ear_R", "R")):
        results[bone] = {}
        for axis in "XYZ":
            set_pose(arm, {bone: (axis, 12.0)})
            pts = evaluated_verts()
            if kind == "head":
                c = pts[nose_idx].mean(axis=0)
                d = c - base_nose
            else:
                c = pts[ear_idx[kind]].mean(axis=0)
                d = c - base_ear[kind]
            results[bone][axis] = [round(float(v), 4) for v in d]
    results["_counts"] = {"head": len(head_idx), "nose": len(nose_idx),
                          "ear_L": len(ear_idx["L"]), "ear_R": len(ear_idx["R"])}
    log("PROBE", results)
    with open(os.path.join(QA_DIR, "probe.json"), "w") as fh:
        json.dump(results, fh, indent=1)
    save_work()


def stage_eardiag():
    bpy.ops.wm.open_mainfile(filepath=WORK_BLEND)
    work = bpy.data.objects["Buck"]
    me = work.data
    V = np.empty(len(me.vertices) * 3, dtype=np.float64)
    me.vertices.foreach_get("co", V)
    V = V.reshape(-1, 3)
    w = {}
    for name in ("ear_L", "ear_R", "head", "neck_2"):
        g = work.vertex_groups[name]
        arr = np.zeros(len(V))
        for i, v in enumerate(me.vertices):
            for gr in v.groups:
                if gr.group == g.index:
                    arr[i] = gr.weight
        w[name] = arr
    out = {}
    for name in ("ear_L", "ear_R"):
        sel = np.where(w[name] > 0.3)[0]
        if len(sel):
            pts = V[sel]
            out[name] = {"n": len(sel),
                         "centroid": [round(float(v), 3) for v in pts.mean(axis=0)],
                         "min": [round(float(v), 3) for v in pts.min(axis=0)],
                         "max": [round(float(v), 3) for v in pts.max(axis=0)]}
        else:
            out[name] = {"n": 0, "max_w": float(w[name].max())}
    for sgn, xr in (("L", (-0.24, -0.07)), ("R", (0.07, 0.24))):
        box = ((V[:, 0] > xr[0]) & (V[:, 0] < xr[1]) & (V[:, 1] > -0.68)
               & (V[:, 1] < -0.48) & (V[:, 2] > 1.50) & (V[:, 2] < 1.76))
        pts = V[box]
        out[f"box_{sgn}"] = {"n": int(box.sum()),
                             "centroid": [round(float(v), 3) for v in pts.mean(axis=0)] if box.sum() else None,
                             "ear_w_mean": round(float(w[f"ear_{sgn}"][box].mean()), 3) if box.sum() else None,
                             "head_w_mean": round(float(w["head"][box].mean()), 3) if box.sum() else None}
    log("EARDIAG", out)


def stage_islands():
    bpy.ops.wm.open_mainfile(filepath=WORK_BLEND)
    work = bpy.data.objects["Buck"]
    me = work.data
    V = np.empty(len(me.vertices) * 3, dtype=np.float64)
    me.vertices.foreach_get("co", V)
    V = V.reshape(-1, 3)
    parent = list(range(len(V)))

    def find(a):
        while parent[a] != a:
            parent[a] = parent[parent[a]]
            a = parent[a]
        return a

    for e in me.edges:
        a, b = find(e.vertices[0]), find(e.vertices[1])
        if a != b:
            parent[a] = b
    from collections import defaultdict
    comp = defaultdict(list)
    for i in range(len(V)):
        comp[find(i)].append(i)
    out = []
    for members in comp.values():
        pts = V[members]
        c = pts.mean(axis=0)
        if c[2] > 1.38 and c[1] < -0.38 and len(members) > 3:
            out.append({"n": len(members),
                        "centroid": [round(float(v), 3) for v in c],
                        "min": [round(float(v), 3) for v in pts.min(axis=0)],
                        "max": [round(float(v), 3) for v in pts.max(axis=0)]})
    out.sort(key=lambda d: -d["n"])
    log("ISLANDS", {"count": len(comp), "head_islands": len(out)})
    with open(os.path.join(QA_DIR, "islands.json"), "w") as fh:
        json.dump(out, fh, indent=1)


EAR_BOX_R = ((0.175, 0.30), (-0.66, -0.47), (1.50, 1.68))
EAR_BOX_L = ((-0.16, -0.05), (-0.48, -0.35), (1.42, 1.65))


def in_box(V, box):
    return ((V[:, 0] > box[0][0]) & (V[:, 0] < box[0][1])
            & (V[:, 1] > box[1][0]) & (V[:, 1] < box[1][1])
            & (V[:, 2] > box[2][0]) & (V[:, 2] < box[2][1]))


def stage_earboxes():
    bpy.ops.wm.open_mainfile(filepath=WORK_BLEND)
    work = bpy.data.objects["Buck"]
    me = work.data
    V = np.empty(len(me.vertices) * 3, dtype=np.float64)
    me.vertices.foreach_get("co", V)
    V = V.reshape(-1, 3)
    if "debug" in me.color_attributes:
        me.color_attributes.remove(me.color_attributes["debug"])
    attr = me.color_attributes.new("debug", "FLOAT_COLOR", "POINT")
    cols = np.tile(np.array([0.45, 0.45, 0.45, 1.0]), (len(V), 1))
    cols[in_box(V, EAR_BOX_R)] = (1.0, 0.1, 0.1, 1.0)
    cols[in_box(V, EAR_BOX_L)] = (0.1, 1.0, 0.2, 1.0)
    attr.data.foreach_set("color", cols.reshape(-1))
    mat = bpy.data.materials.new("debugmat")
    mat.use_nodes = True
    nt = mat.node_tree
    nt.nodes.clear()
    out = nt.nodes.new("ShaderNodeOutputMaterial")
    emi = nt.nodes.new("ShaderNodeEmission")
    att = nt.nodes.new("ShaderNodeAttribute")
    att.attribute_name = "debug"
    nt.links.new(att.outputs["Color"], emi.inputs["Color"])
    nt.links.new(emi.outputs["Emission"], out.inputs["Surface"])
    scene = bpy.context.scene
    for ob in list(scene.objects):
        if ob.type in ("LIGHT", "CAMERA"):
            bpy.data.objects.remove(ob, do_unlink=True)
    scene.render.engine = "CYCLES"
    scene.cycles.samples = 8
    scene.cycles.use_denoising = False
    scene.cycles.device = "CPU"
    scene.view_layers[0].material_override = mat
    scene.render.resolution_x = 900
    scene.render.resolution_y = 700
    sun = bpy.data.objects.new("Sun", bpy.data.lights.new("Sun", "SUN"))
    sun.data.energy = 2.0
    scene.collection.objects.link(sun)
    cam_data = bpy.data.cameras.new("Cam")
    cam_data.type = "ORTHO"
    cam_data.ortho_scale = 0.62
    cam = bpy.data.objects.new("Cam", cam_data)
    scene.collection.objects.link(cam)
    scene.camera = cam
    head = Vector((0.02, -0.52, 1.52))
    for name, pos in (("top", head + Vector((0, 0, 1.4))),
                      ("front", head + Vector((0, -1.4, 0))),
                      ("back", head + Vector((0, 1.4, 0.25)))):
        cam.location = pos
        d = head - cam.location
        cam.rotation_euler = d.to_track_quat("-Z", "Y").to_euler()
        scene.render.filepath = os.path.join(QA_DIR, f"earbox-{name}.png")
        bpy.ops.render.render(write_still=True)
        print(f"@@RENDER@@ earbox-{name}")
    log("EARBOX", {"R": int(in_box(V, EAR_BOX_R).sum()),
                   "L": int(in_box(V, EAR_BOX_L).sum())})


def stage_deform():
    bpy.ops.wm.open_mainfile(filepath=WORK_BLEND)
    arm = bpy.data.objects["BuckRig"]
    cam_w = ((1.35, -2.1, 2.15), (0.0, -0.55, 1.66))
    jobs = [
        ("deform-base", {}, cam_w),
        ("deform-earsX", {"ear_L": ("X", 25.0), "ear_R": ("X", 25.0)}, cam_w),
        ("deform-earsZ", {"ear_L": ("Z", 25.0), "ear_R": ("Z", 25.0)}, cam_w),
        ("deform-earsX-back", {"ear_L": ("X", -25.0), "ear_R": ("X", -25.0)}, cam_w),
        ("deform-turnL", {"neck_1": ("Z", 13.0), "neck_2": ("X", 9.0),
                          "head": ("Z", 9.0)}, cam_w),
        ("deform-nod", {"neck_1": ("X", 7.0), "neck_2": ("Z", -6.0),
                        "head": ("X", 7.0)}, cam_w),
    ]
    for name, spec, (pos, tgt) in jobs:
        set_pose(arm, spec)
        focus_render(os.path.join(QA_DIR, f"{name}.png"), pos, tgt, lens=55)
    set_pose(arm, {})


def _ss(s):
    s = max(0.0, min(1.0, s))
    return s * s * (3.0 - 2.0 * s)


def _bump(s):
    if s <= 0.0 or s >= 1.0:
        return 0.0
    return math.sin(math.pi * s) ** 2


def _win(t, t0, t1):
    return _bump((t - t0) / (t1 - t0)) if t0 <= t <= t1 else 0.0


# Clip authoring on the measured conventions (probe.json): yaw toward
# the viewer's left = neck_1 Z+, neck_2 X+, head Z+; pitch down =
# neck_1 X+, head X+, neck_2 Z-. Founder scope (Nov 13): head and
# ears only, slight movements; the body holds the crest stance.
def _idle(t, T):
    o = {}
    ph = 2.0 * math.pi * t / 4.0
    o[("neck_1", "X")] = -0.30 * math.sin(ph)
    o[("head", "X")] = -0.40 * math.sin(ph + 0.4)
    shake = _win(t, 4.5, 6.0)
    if shake:
        s = math.sin(2.0 * math.pi * 2.0 * (t - 4.5) / 1.5) * shake
        o[("head", "Z")] = o.get(("head", "Z"), 0.0) + 1.4 * s
        o[("neck_2", "X")] = o.get(("neck_2", "X"), 0.0) + 0.6 * s
        o[("neck_1", "Z")] = o.get(("neck_1", "Z"), 0.0) + 0.4 * s
    e = _win(t, 8.0, 10.0)
    if e:
        o[("ear_L", "X")] = -14.0 * e
    e = _win(t, 11.5, 13.0)
    if e:
        o[("ear_R", "X")] = 12.0 * e
        o[("ear_R", "Z")] = 5.0 * e
    o[("head", "Z")] = o.get(("head", "Z"), 0.0) + 0.8 * math.sin(2.0 * math.pi * t / T)
    o[("head", "X")] += 0.5 * math.sin(4.0 * math.pi * t / T + 1.0)
    return o


def _look(t, T, sign):
    out = _ss(t / 1.8) if t < 1.8 else (1.0 if t < 4.2 else 1.0 - _ss((t - 4.2) / 1.8))
    o = {}
    o[("head", "Z")] = sign * 6.5 * out
    o[("neck_2", "X")] = sign * 3.0 * out
    o[("neck_1", "Z")] = sign * 1.5 * out
    o[("head", "X")] = 1.5 * out
    e = _win(t, 2.4, 3.6)
    if e:
        bone = "ear_R" if sign > 0 else "ear_L"
        o[(bone, "X")] = -11.0 * e
    return o


def _ears(t, T):
    o = {}
    o[("head", "Z")] = 0.7 * math.sin(2.0 * math.pi * t / T)
    e = _win(t, 0.6, 1.6)
    if e:
        s = (t - 0.6) / 1.0
        o[("ear_L", "X")] = -16.0 * math.sin(math.pi * s ** 0.6) ** 2
    e = _win(t, 2.6, 4.2)
    if e:
        o[("ear_L", "X")] = o.get(("ear_L", "X"), 0.0) + 10.0 * e
        o[("ear_L", "Z")] = 4.0 * e
    e = _win(t, 2.75, 4.35)
    if e:
        o[("ear_R", "X")] = 10.0 * e
        o[("ear_R", "Z")] = -4.0 * e
    e = _win(t, 5.2, 6.4)
    if e:
        s = (t - 5.2) / 1.2
        o[("ear_R", "X")] = o.get(("ear_R", "X"), 0.0) + 16.0 * math.sin(math.pi * s ** 0.6) ** 2
    return o


CLIPS = {
    "Lookout_Idle": (16.0, _idle),
    "Look_Left": (6.0, lambda t, T: _look(t, T, 1.0)),
    "Look_Right": (6.0, lambda t, T: _look(t, T, -1.0)),
    "Ear_Adjust": (8.0, _ears),
}
FPS = 24
_AXES = {"X": (1, 0, 0), "Y": (0, 1, 0), "Z": (0, 0, 1)}


def stage_clips():
    bpy.ops.wm.open_mainfile(filepath=WORK_BLEND)
    arm = bpy.data.objects["BuckRig"]
    bpy.context.view_layer.objects.active = arm
    arm.select_set(True)
    with open(os.path.join(QA_DIR, "stance.json")) as fh:
        sd = json.load(fh)
    if not arm.animation_data:
        arm.animation_data_create()
    made = {}
    for name, (dur, fn) in CLIPS.items():
        old = bpy.data.actions.get(name)
        if old:
            bpy.data.actions.remove(old)
        act = bpy.data.actions.new(name)
        act.use_fake_user = True
        arm.animation_data.action = act
        n = int(dur * FPS)
        for f in range(n + 1):
            t = f / FPS
            offs = fn(t, dur)
            by_bone = {}
            for (bone, axis), deg in offs.items():
                by_bone.setdefault(bone, []).append((axis, deg))
            for pb in arm.pose.bones:
                q0, loc = sd[pb.name]["q"], sd[pb.name]["loc"]
                q = Quaternion(q0)
                for axis, deg in by_bone.get(pb.name, []):
                    q = q @ Quaternion(_AXES[axis], math.radians(deg))
                pb.rotation_quaternion = q
                pb.location = Vector(loc)
                pb.keyframe_insert("rotation_quaternion", frame=f)
                if pb.name == "root":
                    pb.keyframe_insert("location", frame=f)
        # Keys are dense (every frame, easing baked into the sampled
        # values), so curve interpolation between neighbours is
        # immaterial and the exporter samples per frame anyway.
        track = arm.animation_data.nla_tracks.new()
        track.name = name
        track.strips.new(name, 0, act)
        track.mute = True
        made[name] = n + 1
    arm.animation_data.action = bpy.data.actions["Lookout_Idle"]
    log("CLIPS", made)
    save_work()


FINAL_BLEND = os.path.expanduser(
    "~/workspace/twistor-lab/projects/our-lgcy/tw1075-grab3d-source/buck-rigged.blend"
)
GLB_PATH = os.path.expanduser(
    "~/workspace/repos/ourlgcy-demo-tw1075b/gl/animals/buck-rigged.glb"
)


def stage_export():
    bpy.ops.wm.open_mainfile(filepath=WORK_BLEND)
    # strip everything that is not the buck or its rig
    for ob in list(bpy.data.objects):
        if ob.name not in ("Buck", "BuckRig"):
            bpy.data.objects.remove(ob, do_unlink=True)
    work = bpy.data.objects["Buck"]
    if "debug" in work.data.color_attributes:
        work.data.color_attributes.remove(work.data.color_attributes["debug"])
    if "debugmat" in bpy.data.materials:
        bpy.data.materials.remove(bpy.data.materials["debugmat"])
    scaled = {}
    for img in bpy.data.images:
        w, h = img.size
        if max(w, h) > 2048:
            r = 2048 / max(w, h)
            try:
                img.scale(int(w * r), int(h * r))
                scaled[img.name] = [int(w * r), int(h * r)]
            except Exception as exc:  # noqa: BLE001
                scaled[img.name] = f"FAILED: {exc}"
    arm = bpy.data.objects["BuckRig"]
    set_pose(arm, {})
    bpy.ops.wm.save_as_mainfile(filepath=FINAL_BLEND)
    os.makedirs(os.path.dirname(GLB_PATH), exist_ok=True)
    bpy.ops.export_scene.gltf(
        filepath=GLB_PATH, export_format="GLB", export_animations=True,
        export_animation_mode="ACTIONS", export_force_sampling=True,
        export_apply=False, export_yup=True, export_image_format="AUTO",
        export_jpeg_quality=85)
    log("EXPORT", {"glb_bytes": os.path.getsize(GLB_PATH), "scaled_images": scaled,
                   "actions": [a.name for a in bpy.data.actions]})


def stage_verify():
    bpy.ops.wm.read_factory_settings(use_empty=True)
    bpy.ops.import_scene.gltf(filepath=GLB_PATH)
    info = {"objects": [], "actions": {}, "images": {}}
    arm = None
    tris = 0
    for ob in bpy.context.scene.objects:
        info["objects"].append((ob.name, ob.type))
        if ob.type == "ARMATURE":
            arm = ob
            info["bones"] = [b.name for b in ob.data.bones]
        if ob.type == "MESH":
            tris += sum(len(p.vertices) - 2 for p in ob.data.polygons)
    info["tris"] = tris
    for act in bpy.data.actions:
        info["actions"][act.name] = [float(v) for v in act.frame_range]
    for img in bpy.data.images:
        info["images"][img.name] = list(img.size)
    log("VERIFY", info)
    with open(os.path.join(QA_DIR, "verify.json"), "w") as fh:
        json.dump(info, fh, indent=1)
    if arm and "Lookout_Idle" in bpy.data.actions:
        arm.animation_data_create()
        arm.animation_data.action = bpy.data.actions["Lookout_Idle"]
        bpy.context.scene.frame_set(120)
        focus_render(os.path.join(QA_DIR, "verify-idle-lowtq.png"),
                     (2.3, -3.0, 0.55), (0, -0.02, 1.05))
        if "Ear_Adjust" in bpy.data.actions:
            arm.animation_data.action = bpy.data.actions["Ear_Adjust"]
            bpy.context.scene.frame_set(30)
            focus_render(os.path.join(QA_DIR, "verify-ear-head.png"),
                         (1.35, -2.1, 2.15), (0.0, -0.55, 1.66), lens=55)


def stage_views():
    prefix = sys.argv[sys.argv.index("--stage") + 2] if len(sys.argv) > sys.argv.index("--stage") + 2 else "view"
    bpy.ops.wm.open_mainfile(filepath=WORK_BLEND)
    render_views(QA_DIR, prefix)


STAGES = {"prep": stage_prep, "correct": stage_correct, "views": stage_views,
          "rig": stage_rig, "stance": stage_stance, "probe": stage_probe,
          "eardiag": stage_eardiag, "islands": stage_islands,
          "earboxes": stage_earboxes, "deform": stage_deform,
          "clips": stage_clips, "export": stage_export, "verify": stage_verify}

if __name__ == "__main__":
    argv = sys.argv[sys.argv.index("--") + 1:]
    stage = argv[argv.index("--stage") + 1] if "--stage" in argv else "prep"
    STAGES[stage]()
