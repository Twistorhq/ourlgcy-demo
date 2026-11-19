# TW-1076: reproducible rig build for the Grab3D squirrel (CC0),
# converted to an eastern gray squirrel (Sciurus carolinensis).
#
# The Grab3D source is a Eurasian red squirrel (Sciurus vulgaris):
# red-orange coat, prominent dark ear tufts. The conversion applies
# the buck pipeline's own methods (TW-1075): geometry correction
# (ear-tuft collapse onto the ear, the gray squirrel is untufted)
# and texture repaint (red coat to gray agouti in texture space,
# the TW-1147 eye-paint method widened to a hue-conditional pass).
# If the converted animal does not read as an eastern gray against
# the founder reference, the species stops and ships nothing; that
# gate is visual and is recorded in qa/tw1076-squirrel/.
#
# Stages (run in order, each opens the previous stage's .blend):
#   prep    open the preserved source .blend, duplicate the mesh,
#           decimate a copy to a deformation mesh, dump landmarks.
#   probe   render candidate landmark boxes as colored overlays so
#           ear / tuft / head / paw / tail boxes are confirmed on
#           renders, not guessed.
#   correct collapse the ear tufts onto the ears.
#   paint   coat recolor in texture space (red to gray agouti).
#   rig     build the armature, zone skinning, spatial smoothing.
#   stance  bake the sitting stance + acorn hold base pose.
#   clips   Squirrel_Idle / Squirrel_Nibble / Squirrel_Look.
#   export  downscale textures, export the self-contained GLB.
#   verify  re-import the GLB, inventory, posed renders.
#
# Usage: blender -b --factory-startup -P build_squirrel_rig.py -- --stage prep
import json
import math
import os
import sys

import bpy
import numpy as np
from mathutils import Quaternion, Vector

SRC_BLEND = os.path.expanduser(
    "~/workspace/twistor-lab/projects/our-lgcy/tw1076-grab3d-source/squirrel/squirrel.blend"
)
WORK_BLEND = os.path.expanduser(
    "~/workspace/twistor-lab/projects/our-lgcy/tw1076-grab3d-source/squirrel-rig-work.blend"
)
FINAL_BLEND = os.path.expanduser(
    "~/workspace/twistor-lab/projects/our-lgcy/tw1076-grab3d-source/squirrel-rigged.blend"
)
QA_DIR = os.path.expanduser(
    "~/workspace/repos/ourlgcy-demo-tw1076/qa/tw1076-squirrel/rig"
)
GLB_PATH = os.path.expanduser(
    "~/workspace/repos/ourlgcy-demo-tw1076/gl/animals/squirrel-rigged.glb"
)
TARGET_TRIS = 150000
WELD_DIST = 0.0006

os.makedirs(QA_DIR, exist_ok=True)


def log(tag, payload):
    print(f"@@{tag}@@ {json.dumps(payload, default=str)}")


def save_work():
    bpy.ops.wm.save_as_mainfile(filepath=WORK_BLEND)


def mesh_np(ob):
    me = ob.data
    co = np.empty(len(me.vertices) * 3, dtype=np.float64)
    me.vertices.foreach_get("co", co)
    return co.reshape(-1, 3)


def set_mesh_np(ob, co):
    ob.data.vertices.foreach_set("co", co.astype(np.float64).ravel())
    ob.data.update()


# ---------------------------------------------------------------- prep
def stage_prep():
    bpy.ops.wm.open_mainfile(filepath=SRC_BLEND)
    src = next(o for o in bpy.context.scene.objects if o.type == "MESH")
    src.name = "SquirrelSource_DO_NOT_EXPORT"
    src.hide_render = True
    work = src.copy()
    work.data = src.data.copy()
    work.name = "Squirrel"
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
    # Weld coincident card verts: the source is a fur-card mosaic
    # whose cards carry duplicate corner verts. Merging by distance
    # cuts vertex count (and GLB size) without moving any surface.
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
    # z-band and y-band census for landmark work
    bands = {}
    for lo in np.arange(0, 0.32, 0.02):
        band = co[(co[:, 2] >= lo) & (co[:, 2] < lo + 0.02)]
        if len(band):
            bands[f"z{lo:.2f}"] = {
                "n": len(band),
                "y_range": [
                    round(float(band[:, 1].min()), 3),
                    round(float(band[:, 1].max()), 3),
                ],
                "x_spread": round(float(band[:, 0].max() - band[:, 0].min()), 3),
            }
    lm["z_bands"] = bands
    with open(os.path.join(QA_DIR, "landmarks.json"), "w") as fh:
        json.dump(lm, fh, indent=1)
    log("PREP", lm)
    save_work()
    render_views(QA_DIR, "prep")


def _setup_render(cam_pos, target, lens=50, res=640):
    scene = bpy.context.scene
    for name in ("QA_Sun", "QA_Cam", "QA_World"):
        ob = bpy.data.objects.get(name)
        if ob:
            bpy.data.objects.remove(ob, do_unlink=True)
    sun_data = bpy.data.lights.new("QA_Sun_data", "SUN")
    sun_data.energy = 3.0
    sun = bpy.data.objects.new("QA_Sun", sun_data)
    scene.collection.objects.link(sun)
    sun.rotation_euler = (math.radians(55), 0, math.radians(35))
    if not scene.world:
        scene.world = bpy.data.worlds.new("QA_World")
    scene.world.use_nodes = True
    scene.world.node_tree.nodes["Background"].inputs[0].default_value = (
        0.85,
        0.82,
        0.75,
        1,
    )
    scene.world.node_tree.nodes["Background"].inputs[1].default_value = 0.7
    cam_data = bpy.data.cameras.new("QA_Cam_data")
    cam_data.lens = lens
    cam = bpy.data.objects.new("QA_Cam", cam_data)
    scene.collection.objects.link(cam)
    cam.location = Vector(cam_pos)
    rot = (Vector(target) - Vector(cam_pos)).to_track_quat("-Z", "Y")
    cam.rotation_euler = rot.to_euler()
    scene.camera = cam
    try:
        scene.render.engine = "BLENDER_EEVEE_NEXT"
    except Exception:  # noqa: BLE001
        scene.render.engine = "CYCLES"
        scene.cycles.samples = 32
    scene.render.resolution_x = res
    scene.render.resolution_y = res
    return scene


def render_views(outdir, prefix, target=(0, -0.01, 0.14), dist=0.62, lens=50):
    views = {
        "front": (target[0], target[1] - dist, target[2] + 0.05),
        "side": (target[0] + dist, target[1], target[2] + 0.05),
        "tq": (target[0] + dist * 0.7, target[1] - dist * 0.7, target[2] + 0.22),
        "back": (target[0], target[1] + dist, target[2] + 0.05),
    }
    for name, pos in views.items():
        scene = _setup_render(pos, target, lens=lens)
        scene.render.filepath = os.path.join(outdir, f"{prefix}-{name}.png")
        bpy.ops.render.render(write_still=True)
    log("RENDER", {"prefix": prefix, "views": list(views)})


# ------------------------------------------------------------- correct
def _smoothstep(a, b, v):
    s = np.clip((v - a) / (b - a), 0.0, 1.0)
    return s * s * (3.0 - 2.0 * s)


def stage_correct():
    """Collapse the ear tufts onto the ears.

    The red squirrel's diagnostic trait is the tall dark ear brush.
    The eastern gray carries a small, rounded, untufted ear. Tuft
    verts (high, behind the ear face, off the crown centerline) are
    pulled toward the ear-top anchor with a height-weighted blend,
    shrinking the brush into the ear silhouette instead of deleting
    it (deletion would hole the fur-card mosaic). Crown verts on the
    centerline are only capped, not pulled sideways.
    """
    bpy.ops.wm.open_mainfile(filepath=WORK_BLEND)
    work = bpy.data.objects["Squirrel"]
    co = mesh_np(work)
    orig = co.copy()
    anchors = {
        -1: np.array([-0.030, -0.120, 0.248]),
        1: np.array([0.030, -0.120, 0.248]),
    }
    moved = 0
    for side, anchor in anchors.items():
        sel = (
            (np.sign(co[:, 0]) == side)
            & (np.abs(co[:, 0]) > 0.010)
            & (co[:, 2] > 0.246)
            & (co[:, 1] > -0.155)
            & (co[:, 1] < -0.070)
        )
        w = _smoothstep(0.244, 0.282, co[sel, 2])
        pts = co[sel]
        # shrink toward the anchor: xy contracts to 15 percent of
        # its offset, z contracts to 15 percent, weighted by height
        shrunk = anchor + (pts - anchor) * np.array([0.15, 0.15, 0.15])
        co[sel] = pts * (1 - w[:, None]) + shrunk * w[:, None]
        moved += int(sel.sum())
    # crown centerline: cap the height only
    sel = (np.abs(co[:, 0]) <= 0.010) & (co[:, 2] > 0.252) & (co[:, 1] < -0.070)
    co[sel, 2] = 0.252 + (co[sel, 2] - 0.252) * 0.15
    moved += int(sel.sum())
    set_mesh_np(work, co)
    delta = np.abs(co - orig).max()
    log("CORRECT", {"moved_verts": moved, "max_delta_m": round(float(delta), 4)})
    save_work()
    render_views(QA_DIR, "correct")


# --------------------------------------------------------------- paint
def _base_color_image():
    # Image_0 is the base color in the Grab3D material layout (the
    # buck's inventory: Image_0 base, Image_1 packed MR, Image_2
    # normal). Confirm by node links rather than assuming.
    mat = bpy.data.materials["Material_0"]
    for node in mat.node_tree.nodes:
        if node.type == "BSDF_PRINCIPLED":
            link = node.inputs["Base Color"].links
            if link:
                img = link[0].from_node.image
                return img
    return bpy.data.images["Image_0"]


def stage_paint():
    """Recolor the coat from red-squirrel orange to gray agouti.

    Hue-conditional pass over the base color texels: saturated
    orange-red texels are desaturated toward neutral warm gray and
    slightly darkened (the gray squirrel's dorsal agouti), keeping
    the value banding that carries the fur read. Near-white texels
    (belly, chin) and near-black texels (tail banding, eye) are
    preserved. This is the TW-1147 eye-paint method widened: same
    packed-image discipline (pack() after the edit so the change
    persists across the save).
    """
    bpy.ops.wm.open_mainfile(filepath=WORK_BLEND)
    img = _base_color_image()
    w, h = img.size
    px = np.empty(w * h * 4, dtype=np.float32)
    img.pixels.foreach_get(px)
    px = px.reshape(-1, 4)
    rgb = px[:, :3].astype(np.float64)
    mx = rgb.max(axis=1)
    mn = rgb.min(axis=1)
    sat = np.where(mx > 1e-6, (mx - mn) / np.maximum(mx, 1e-6), 0.0)
    # hue in turns, red at 0
    r, g, b = rgb[:, 0], rgb[:, 1], rgb[:, 2]
    hue = np.zeros_like(mx)
    d = np.maximum(mx - mn, 1e-12)
    is_r = (mx == r) & (mx > mn)
    is_g = (mx == g) & (mx > mn)
    is_b = (mx == b) & (mx > mn)
    hue[is_r] = ((g[is_r] - b[is_r]) / d[is_r]) % 6.0
    hue[is_g] = (b[is_g] - r[is_g]) / d[is_g] + 2.0
    hue[is_b] = (r[is_b] - g[is_b]) / d[is_b] + 4.0
    hue /= 6.0
    # coat mask: warm hue band, meaningfully saturated, not a
    # highlight and not a shadow
    coat = (hue > 0.005) & (hue < 0.135) & (sat > 0.16) & (mx > 0.05) & (mx < 0.97)
    before = rgb[coat].mean(axis=0) if coat.any() else np.zeros(3)
    # desaturate toward the texel's own luminance, keep a warm-gray
    # residue (agouti is warm gray, not blue gray), darken slightly.
    # Very dark warm texels (ear-tip caps, tail banding) blend less,
    # so they land dark gray rather than lifting to mid gray.
    lum = (0.299 * r + 0.587 * g + 0.114 * b)[:, None]
    target = lum * np.array([1.06, 1.00, 0.90]) * 0.94
    blend = np.where(mx < 0.12, 0.60, 0.82)
    rgb[coat] = (
        rgb[coat] * (1 - blend[coat])[:, None] + target[coat] * blend[coat][:, None]
    )
    after = rgb[coat].mean(axis=0) if coat.any() else np.zeros(3)
    px[:, :3] = np.clip(rgb, 0.0, 1.0).astype(np.float32)
    img.pixels.foreach_set(px.ravel())
    img.update()
    img.pack()
    log(
        "PAINT",
        {
            "image": img.name,
            "coat_texels": int(coat.sum()),
            "coat_mean_before": before.round(3).tolist(),
            "coat_mean_after": after.round(3).tolist(),
        },
    )
    save_work()
    render_views(QA_DIR, "paint")


# ----------------------------------------------------------------- rig
# Bone layout measured from the prep census and renders (face -Y,
# ground z=0, sitting pose as sourced). Positions are head -> tail.
BONES = {
    "root": ((0, 0.01, 0.0), (0, 0.01, 0.10), None),
    "pelvis": ((0, 0.055, 0.085), (0, 0.005, 0.115), "root"),
    "spine": ((0, 0.005, 0.115), (0, -0.055, 0.150), "pelvis"),
    "chest": ((0, -0.055, 0.150), (0, -0.100, 0.185), "spine"),
    "neck": ((0, -0.100, 0.185), (0, -0.128, 0.205), "chest"),
    "head": ((0, -0.128, 0.205), (0, -0.180, 0.225), "neck"),
    "jaw": ((0, -0.140, 0.190), (0, -0.182, 0.184), "head"),
    "ear_L": ((-0.026, -0.118, 0.236), (-0.042, -0.106, 0.260), "head"),
    "ear_R": ((0.026, -0.118, 0.236), (0.042, -0.106, 0.260), "head"),
    "upperarm_L": ((-0.042, -0.055, 0.140), (-0.048, -0.085, 0.085), "chest"),
    "forearm_L": ((-0.048, -0.085, 0.085), (-0.034, -0.128, 0.098), "upperarm_L"),
    "paw_L": ((-0.034, -0.128, 0.098), (-0.032, -0.154, 0.106), "forearm_L"),
    "upperarm_R": ((0.042, -0.055, 0.140), (0.048, -0.085, 0.085), "chest"),
    "forearm_R": ((0.048, -0.085, 0.085), (0.034, -0.128, 0.098), "upperarm_R"),
    "paw_R": ((0.034, -0.128, 0.098), (0.032, -0.154, 0.106), "forearm_R"),
    "thigh_L": ((-0.052, 0.045, 0.085), (-0.058, -0.010, 0.045), "pelvis"),
    "shin_L": ((-0.058, -0.010, 0.045), (-0.052, -0.055, 0.012), "thigh_L"),
    "foot_L": ((-0.052, -0.055, 0.012), (-0.050, -0.125, 0.004), "shin_L"),
    "thigh_R": ((0.052, 0.045, 0.085), (0.058, -0.010, 0.045), "pelvis"),
    "shin_R": ((0.058, -0.010, 0.045), (0.052, -0.055, 0.012), "thigh_R"),
    "foot_R": ((0.052, -0.055, 0.012), (0.050, -0.125, 0.004), "shin_R"),
    "tail_1": ((0, 0.095, 0.045), (0, 0.150, 0.085), "pelvis"),
    "tail_2": ((0, 0.150, 0.085), (0, 0.180, 0.150), "tail_1"),
    "tail_3": ((0, 0.180, 0.150), (0, 0.168, 0.215), "tail_2"),
    "tail_4": ((0, 0.168, 0.215), (0, 0.125, 0.262), "tail_3"),
    "tail_5": ((0, 0.125, 0.262), (0, 0.075, 0.272), "tail_4"),
    "acorn": ((0.030, -0.150, 0.110), (0.030, -0.150, 0.140), "paw_R"),
}
BODY_POLYLINE = ["pelvis", "spine", "chest", "neck", "head"]
TAIL_CHAIN = ["tail_1", "tail_2", "tail_3", "tail_4", "tail_5"]


def _seg_dist(pts, a, b):
    a = np.asarray(a, dtype=np.float64)
    b = np.asarray(b, dtype=np.float64)
    ab = b - a
    denom = max(float(ab @ ab), 1e-12)
    t = np.clip(((pts - a) @ ab) / denom, 0.0, 1.0)
    proj = a + t[:, None] * ab
    return np.linalg.norm(pts - proj, axis=1), t


def _softmax_weights(dists, sharpness):
    w = np.exp(-((dists / sharpness) ** 2))
    s = w.sum(axis=1, keepdims=True)
    return w / np.maximum(s, 1e-12)


def stage_rig():
    bpy.ops.wm.open_mainfile(filepath=WORK_BLEND)
    work = bpy.data.objects["Squirrel"]
    co = mesh_np(work)
    n = len(co)

    # idempotency: a re-run must not stack a second armature and a
    # second armature modifier on the mesh (that split is exactly
    # how an export loses its skin: the modifier ends up pointing
    # at the duplicate, which the export keep-filter then removes)
    for obj in list(bpy.data.objects):
        if obj.type == "ARMATURE":
            bpy.data.objects.remove(obj, do_unlink=True)
    for mod in list(work.modifiers):
        if mod.type == "ARMATURE":
            work.modifiers.remove(mod)
    for vg in list(work.vertex_groups):
        work.vertex_groups.remove(vg)

    arm_data = bpy.data.armatures.new("SquirrelRigData")
    arm = bpy.data.objects.new("SquirrelRig", arm_data)
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
    # per-bone segment distances for every vertex
    D = np.stack([_seg_dist(co, BONES[b][0], BONES[b][1])[0] for b in names], axis=1)
    idx = {b: i for i, b in enumerate(names)}
    x, y, z = co[:, 0], co[:, 1], co[:, 2]

    # Anatomical gates: a bone may only claim a vertex near its own
    # segment. Box-region skinning (v1) let the arm bones claim long
    # strips of belly fur and tore the chest open when posed; the
    # gates below are the fix. Body bones are always candidates.
    gate = np.zeros((n, len(names)), dtype=bool)
    for b in BODY_POLYLINE + ["root"]:
        gate[:, idx[b]] = True
    for b in TAIL_CHAIN:
        gate[:, idx[b]] = y > 0.055
    gate[:, idx["tail_1"]] |= (y > 0.03) & (z < 0.10)
    for side, sfx in ((-1, "L"), (1, "R")):
        same = np.sign(x) == side
        ear = f"ear_{sfx}"
        gate[:, idx[ear]] = same & (D[:, idx[ear]] < 0.030)
        for b in (f"upperarm_{sfx}", f"forearm_{sfx}", f"paw_{sfx}"):
            gate[:, idx[b]] = same & (D[:, idx[b]] < 0.026)
        for b in (f"thigh_{sfx}", f"shin_{sfx}", f"foot_{sfx}"):
            gate[:, idx[b]] = same & (D[:, idx[b]] < 0.030)
    gate[:, idx["jaw"]] = (y < -0.125) & (z < 0.205) & (z > 0.150)
    gate[:, idx["acorn"]] = False

    sharp = 0.016
    W = np.where(gate, np.exp(-((D / sharp) ** 2)), 0.0)
    # ears and paws get a proximity bonus so their tips follow fully
    for b in ("ear_L", "ear_R", "paw_L", "paw_R"):
        near = D[:, idx[b]] < 0.012
        W[near, idx[b]] = np.maximum(W[near, idx[b]], 0.92)
    W /= np.maximum(W.sum(axis=1, keepdims=True), 1e-12)

    # spatial smoothing (the mosaic lesson from the buck: coincident
    # shells need spatially coherent weights or bends open cracks).
    # Grid-hash neighbor search, no scipy in Blender's python.
    cell = 0.012
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
    for _ in range(3):
        acc = np.zeros_like(W)
        for i, lst in enumerate(neigh):
            acc[i] = W[lst].mean(axis=0) if len(lst) else W[i]
        W = acc
    # re-gate after smoothing: no bone may hold a vertex far from
    # its own segment, however the smoothing spread it
    far = D > 0.040
    for b in BODY_POLYLINE + ["root"]:
        far[:, idx[b]] = False
    W = np.where(far, 0.0, W)
    W /= np.maximum(W.sum(axis=1, keepdims=True), 1e-12)
    # fallback: a vertex the gates left empty (fur tips far from
    # every segment) binds fully to its nearest body bone, so the
    # export carries no unweighted verts
    empty = W.sum(axis=1) <= 1e-9
    if empty.any():
        body_cols = [idx[b] for b in BODY_POLYLINE]
        nearest = np.argmin(D[np.ix_(empty, body_cols)], axis=1)
        rows = np.nonzero(empty)[0]
        for r, c in zip(rows, nearest, strict=True):
            W[r, body_cols[c]] = 1.0
    # cap at 4 influences
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
    unweighted = int((W.sum(axis=1) <= 0.001).sum())
    weak = int((W.max(axis=1) < 0.45).sum())
    log("RIG", {"bones": len(names), "unweighted": unweighted, "weak_verts": weak})
    save_work()


def stage_probe():
    """Rotate single bones +-14 degrees and print landmark motion,
    locking the rotation sign conventions for the clip authoring."""
    bpy.ops.wm.open_mainfile(filepath=WORK_BLEND)
    arm = bpy.data.objects["SquirrelRig"]
    work = bpy.data.objects["Squirrel"]
    bpy.context.view_layer.objects.active = arm
    landmarks = {
        "nose": (0.0, -0.185, 0.205),
        "crown": (0.0, -0.120, 0.255),
        "ear_tip_L": (-0.042, -0.106, 0.260),
        "tail_tip": (0.0, 0.075, 0.272),
        "paw_R": (0.032, -0.150, 0.106),
        "chest_pt": (0.0, -0.150, 0.130),
    }
    co = mesh_np(work)
    li = {}
    for name, pt in landmarks.items():
        li[name] = int(np.argmin(np.linalg.norm(co - np.array(pt), axis=1)))
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
    tests = [
        ("head", "X"),
        ("head", "Z"),
        ("neck", "X"),
        ("neck", "Z"),
        ("ear_L", "X"),
        ("tail_1", "X"),
        ("tail_3", "X"),
        ("tail_3", "Z"),
        ("upperarm_R", "X"),
        ("forearm_R", "X"),
        ("chest", "X"),
        ("spine", "X"),
        ("jaw", "X"),
    ]
    axes = {"X": (1, 0, 0), "Y": (0, 1, 0), "Z": (0, 0, 1)}
    for bone, axis in tests:
        pb = arm.pose.bones[bone]
        pb.rotation_mode = "QUATERNION"
        pb.rotation_quaternion = Quaternion(axes[axis], math.radians(14))
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


# -------------------------------------------------------------- stance
def _landmark_fn(work, arm):
    """Return (base_co, eval_fn) measuring named landmark verts."""
    co = mesh_np(work)
    pts = {
        "paw_L": (-0.032, -0.150, 0.106),
        "paw_R": (0.032, -0.150, 0.106),
        "nose": (0.0, -0.185, 0.205),
    }
    li = {
        k: int(np.argmin(np.linalg.norm(co - np.array(p), axis=1)))
        for k, p in pts.items()
    }
    dg = bpy.context.evaluated_depsgraph_get()

    def ev():
        bpy.context.view_layer.update()
        e = work.evaluated_get(dg)
        eco = np.empty(len(e.data.vertices) * 3, dtype=np.float64)
        e.data.vertices.foreach_get("co", eco)
        eco = eco.reshape(-1, 3)
        wm = np.array(e.matrix_world)
        return {k: wm[:3, :3] @ eco[v] + wm[:3, 3] for k, v in li.items()}

    return ev


def stage_stance():
    """Author the acorn in the source pose's own hold.

    The source sculpt already tucks both forepaws together at the
    chest, the classic feeding hold. A v1 stance tried to solve an
    extra arm lift on top of it; the lift tore the chest fur (the
    skinning fault is fixed in stage_rig, but the lift itself fought
    the sculpt). The stance is therefore the source pose untouched:
    the acorn is sized and seated so both paws touch it, and the
    nibble reads through the head dipping to the food, which is how
    the animal actually feeds. The acorn is weighted rigidly to the
    acorn bone, re-parented to the chest so it rides the breathing.
    """
    bpy.ops.wm.open_mainfile(filepath=WORK_BLEND)
    arm = bpy.data.objects["SquirrelRig"]
    # idempotency: drop any acorn authored by an earlier run
    for obj in list(bpy.data.objects):
        if obj.name.startswith(("Acorn", "AcornStem")):
            bpy.data.objects.remove(obj, do_unlink=True)
    for mat_name in ("AcornNut", "AcornCap"):
        if mat_name in bpy.data.materials:
            bpy.data.materials.remove(bpy.data.materials[mat_name])
    # re-parent the acorn bone from paw_R to chest
    bpy.context.view_layer.objects.active = arm
    bpy.ops.object.mode_set(mode="EDIT")
    arm.data.edit_bones["acorn"].parent = arm.data.edit_bones["chest"]
    bpy.ops.object.mode_set(mode="OBJECT")

    # paws rest at about (+-0.032, -0.151, 0.105); the acorn sits
    # between them, slightly forward, sized to meet both paws
    center = np.array([0.0, -0.156, 0.112])
    nut_mat = bpy.data.materials.new("AcornNut")
    nut_mat.use_nodes = True
    nut_mat.node_tree.nodes["Principled BSDF"].inputs["Base Color"].default_value = (
        0.30,
        0.155,
        0.055,
        1.0,
    )
    nut_mat.node_tree.nodes["Principled BSDF"].inputs["Roughness"].default_value = 0.5
    cap_mat = bpy.data.materials.new("AcornCap")
    cap_mat.use_nodes = True
    cap_mat.node_tree.nodes["Principled BSDF"].inputs["Base Color"].default_value = (
        0.115,
        0.07,
        0.035,
        1.0,
    )
    cap_mat.node_tree.nodes["Principled BSDF"].inputs["Roughness"].default_value = 0.95

    bpy.ops.mesh.primitive_uv_sphere_add(
        segments=20, ring_count=14, location=(center[0], center[1], center[2])
    )
    acorn = bpy.context.view_layer.objects.active
    acorn.name = "Acorn"
    acorn.scale = (0.0130, 0.0130, 0.0165)
    bpy.ops.object.transform_apply(scale=True)
    # taper the bottom to a point-ish tip (local coords: the object
    # origin sits at the acorn center)
    aco = mesh_np(acorn)
    zb = aco[:, 2] / 0.0165
    taper = np.where(zb < -0.2, 1.0 - (-zb - 0.2) * 0.55, 1.0)
    aco[:, 0] = aco[:, 0] * taper
    aco[:, 1] = aco[:, 1] * taper
    set_mesh_np(acorn, aco)
    acorn.data.materials.append(nut_mat)
    acorn.data.materials.append(cap_mat)
    for poly in acorn.data.polygons:
        if poly.center.z > 0.0035:
            poly.material_index = 1
    # stem
    bpy.ops.mesh.primitive_cone_add(
        vertices=10,
        radius1=0.0018,
        radius2=0.0009,
        depth=0.009,
        location=(center[0], center[1], center[2] + 0.0185),
    )
    stem = bpy.context.view_layer.objects.active
    stem.name = "AcornStem"
    stem.data.materials.append(cap_mat)
    for obj, _ in ((acorn, 0), (stem, 0)):
        vg = obj.vertex_groups.new(name="acorn")
        vg.add(list(range(len(obj.data.vertices))), 1.0, "REPLACE")
        mod = obj.modifiers.new("rig", "ARMATURE")
        mod.object = arm

    stance = {}
    with open(os.path.join(QA_DIR, "stance.json"), "w") as fh:
        json.dump(
            {"stance": stance, "acorn_center": center.round(4).tolist()}, fh, indent=1
        )
    log("STANCE", {"acorn_center": center.round(4).tolist(), "bones": stance})
    save_work()
    render_views(QA_DIR, "stance")


# --------------------------------------------------------------- clips
FPS = 24
# Probe conventions (+14 deg local-axis rotations, measured):
# head.X+ nods down; neck.X+ pitches down (strong); head.Z+ turns the
# nose toward -X; tail_1.X+ pitches the plume forward over the back;
# tail_3.X+ curls the tip forward/down; tail_3.Z+ sways the tip -X;
# ear_L.X+ flicks the ear tip forward/down slightly; chest.X+ and
# spine.X+ pitch the whole front down (breathing uses sub-degree
# amplitudes); jaw.X+ drops the nose-side jaw point (gnaw).
TAIL_AMP = [0.8, 1.1, 1.4, 1.7, 2.0]


def _env_smooth(t, a, b, c, d):
    """0 before a, ramps to 1 by b, holds, ramps to 0 by d (c = start down)."""
    if t < a or t > d:
        return 0.0
    if t < b:
        u = (t - a) / max(b - a, 1e-6)
        return u * u * (3 - 2 * u)
    if t > c:
        u = (t - c) / max(d - c, 1e-6)
        return 1 - u * u * (3 - 2 * u)
    return 1.0


def _tail_pose(t, amp_scale=1.0, flick=0.0):
    pose = {}
    period = 0.93
    for i, bone in enumerate(TAIL_CHAIN):
        ph = 2 * math.pi * t / period - 0.65 * i
        pose[bone] = {
            "X": TAIL_AMP[i] * amp_scale * math.sin(ph)
            + flick * (4.0 * math.sin(2 * math.pi * 2.0 * t - 0.65 * i))
        }
    pose["tail_3"]["Z"] = 1.5 * math.sin(2 * math.pi * 0.11 * t)
    pose["tail_4"]["Z"] = 1.2 * math.sin(2 * math.pi * 0.11 * t + 0.5)
    return pose


def clip_idle(t):
    # freeze windows: squirrels hold statue-still between movements;
    # breathing continues, everything else stops 6.0-9.5 s
    frozen = 1.0 if 6.0 <= t <= 9.5 else 0.0
    dyn = 1.0 - frozen
    pose = _tail_pose(t, amp_scale=dyn)
    breath = math.sin(2 * math.pi * 0.8 * t)
    pose["chest"] = {"X": 0.22 * breath}
    pose["spine"] = {"X": 0.15 * math.sin(2 * math.pi * 0.8 * t - 0.6)}
    pose["head"] = {"X": 0.3 * breath * dyn, "Z": 0.0}
    # ear twitch at 11.2 s: two quick pulses
    tw = 0.0
    for c in (11.2, 11.55):
        if abs(t - c) < 0.09:
            tw = max(tw, 1.0 - abs(t - c) / 0.09)
    pose["ear_L"] = {"X": 20.0 * tw * dyn}
    # one quick head turn near the end of the loop
    turn = _env_smooth(t, 13.4, 13.7, 15.2, 15.6)
    pose["head"]["Z"] = 4.5 * turn
    pose["neck"] = {"Z": 2.0 * turn}
    return pose


def clip_nibble(t):
    lift = _env_smooth(t, 0.6, 1.4, 5.6, 6.4)
    pose = _tail_pose(t, amp_scale=0.15 + 0.1 * math.sin(2 * math.pi * 0.8 * t))
    bob = math.sin(2 * math.pi * 3.0 * t) if 1.4 <= t <= 5.6 else 0.0
    pose["upperarm_L"] = {"X": -3.5 * lift}
    pose["upperarm_R"] = {"X": -3.5 * lift}
    pose["forearm_L"] = {"X": 2.0 * lift}
    pose["forearm_R"] = {"X": 2.0 * lift}
    pose["neck"] = {"X": 6.5 * lift}
    pose["head"] = {"X": 5.5 * lift + 1.5 * bob * lift}
    pose["jaw"] = {
        "X": 2.5 * lift * (0.5 + 0.5 * math.sin(2 * math.pi * 3.0 * t + 1.2))
    }
    pose["chest"] = {"X": 0.22 * math.sin(2 * math.pi * 0.8 * t)}
    return pose


def clip_look(t):
    turn = _env_smooth(t, 0.5, 0.8, 3.0, 3.45)
    pose = _tail_pose(t, amp_scale=0.5)
    flick_t = max(0.0, 1.0 - abs(t - 4.05) / 0.45) if t > 3.4 else 0.0
    if flick_t > 0:
        pose = _tail_pose(t, amp_scale=0.5, flick=flick_t)
    pose["head"] = {"Z": -15.0 * turn}
    pose["neck"] = {"Z": -6.5 * turn}
    fl = 1.0 - abs(t - 1.6) / 0.09 if abs(t - 1.6) < 0.09 else 0.0
    pose["ear_R"] = {"X": 20.0 * fl}
    pose["chest"] = {"X": 0.22 * math.sin(2 * math.pi * 0.8 * t)}
    return pose


CLIPS = {
    "Squirrel_Idle": (16.0, clip_idle),
    "Squirrel_Nibble": (7.0, clip_nibble),
    "Squirrel_Look": (5.0, clip_look),
}


def stage_clips():
    bpy.ops.wm.open_mainfile(filepath=WORK_BLEND)
    arm = bpy.data.objects["SquirrelRig"]
    with open(os.path.join(QA_DIR, "stance.json")) as fh:
        stance = json.load(fh)["stance"]
    stance_q = {}
    for bone, (deg, axis) in stance.items():
        stance_q[bone] = Quaternion(
            {"X": (1, 0, 0), "Z": (0, 0, 1)}[axis], math.radians(deg)
        )
    scene = bpy.context.scene
    scene.render.fps = FPS
    bpy.context.view_layer.objects.active = arm
    for pb in arm.pose.bones:
        pb.rotation_mode = "QUATERNION"
    # idempotency: clear NLA tracks parked by an earlier run
    if arm.animation_data:
        for track in list(arm.animation_data.nla_tracks):
            arm.animation_data.nla_tracks.remove(track)
    made = {}
    for name, (dur, fn) in CLIPS.items():
        frames = int(dur * FPS)
        old = bpy.data.actions.get(name)
        if old:
            bpy.data.actions.remove(old)
        act = bpy.data.actions.new(name)
        arm.animation_data_create()
        arm.animation_data.action = act
        for f in range(frames + 1):
            scene.frame_set(f)
            t = f / FPS
            pose = fn(t)
            bones = set(stance_q) | set(pose)
            for bone in bones:
                pb = arm.pose.bones[bone]
                q = stance_q.get(bone, Quaternion((1, 0, 0, 0)))
                off = pose.get(bone, {})
                for axis_name, deg in off.items():
                    axis = {"X": (1, 0, 0), "Y": (0, 1, 0), "Z": (0, 0, 1)}[axis_name]
                    q = Quaternion(axis, math.radians(deg)) @ q
                pb.rotation_quaternion = q
                pb.keyframe_insert("rotation_quaternion", frame=f)
        # dense linear keys: force LINEAR interpolation everywhere
        for layer in act.layers:
            for strip in layer.strips:
                for bag in strip.channelbags:
                    for fc in bag.fcurves:
                        for kp in fc.keyframe_points:
                            kp.interpolation = "LINEAR"
        # Blender 5.2's ACTIONS export only carries actions that
        # sit in NLA tracks (the buck's pattern): park each clip in
        # a muted track so all three ship.
        track = arm.animation_data.nla_tracks.new()
        track.name = name
        track.strips.new(name, 0, act)
        track.mute = True
        made[name] = frames
        # reset pose to stance for the next clip
        for pb in arm.pose.bones:
            pb.rotation_quaternion = stance_q.get(pb.name, Quaternion((1, 0, 0, 0)))
    arm.animation_data.action = bpy.data.actions["Squirrel_Idle"]
    bpy.context.view_layer.update()
    log("CLIPS", made)
    save_work()


# -------------------------------------------------------------- export
def stage_export():
    bpy.ops.wm.open_mainfile(filepath=WORK_BLEND)
    keep = {"Squirrel", "SquirrelRig", "Acorn", "AcornStem"}
    for obj in list(bpy.data.objects):
        if obj.name not in keep:
            bpy.data.objects.remove(obj, do_unlink=True)
    for img in bpy.data.images:
        w, h = img.size
        cap = 2048 if img.name == "Image_0" else 1024
        if max(w, h) > cap:
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
    # read the binary back: the squirrel node must carry the skin
    # and all three clips must be present (a silent unskinned or
    # single-clip export looks fine in a still and fails on the
    # page, so it is asserted here, not eyeballed later)
    import struct

    with open(GLB_PATH, "rb") as fh:
        blob = fh.read()
    jlen = struct.unpack("<I", blob[12:16])[0]
    doc = json.loads(blob[20 : 20 + jlen])
    sq_node = next(nd for nd in doc["nodes"] if nd.get("name") == "Squirrel")
    assert "skin" in sq_node, "squirrel exported without its skin"
    anims = sorted(a.get("name") for a in doc.get("animations", []))
    assert anims == ["Squirrel_Idle", "Squirrel_Look", "Squirrel_Nibble"], anims
    log(
        "EXPORT",
        {
            "glb": GLB_PATH,
            "bytes": os.path.getsize(GLB_PATH),
            "blend": FINAL_BLEND,
            "animations": anims,
            "skin_joints": len(doc["skins"][0]["joints"]),
        },
    )


# -------------------------------------------------------------- verify
def stage_verify():
    path = sys.argv[sys.argv.index("--glb") + 1] if "--glb" in sys.argv else GLB_PATH
    bpy.ops.wm.read_factory_settings(use_empty=True)
    bpy.ops.import_scene.gltf(filepath=path)
    inv = {"meshes": {}, "armatures": [], "actions": [], "images": {}}
    total_tris = 0
    for obj in bpy.context.scene.objects:
        if obj.type == "MESH":
            tris = sum(len(p.vertices) - 2 for p in obj.data.polygons)
            total_tris += tris
            inv["meshes"][obj.name] = {
                "tris": tris,
                "verts": len(obj.data.vertices),
                "groups": len(obj.vertex_groups),
            }
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
    inv["total_tris"] = total_tris
    inv["bytes"] = os.path.getsize(path)
    with open(os.path.join(QA_DIR, "verify.json"), "w") as fh:
        json.dump(inv, fh, indent=1)
    log("VERIFY", inv)
    # posed-frame renders from the shipped binary itself: the
    # deformation proof rides on what actually exported
    arm = next((o for o in bpy.context.scene.objects if o.type == "ARMATURE"), None)
    if arm is not None:
        arm.animation_data_create()
        scene = bpy.context.scene
        scene.render.fps = FPS
        for action_name, frame in (
            ("Squirrel_Idle", 100),
            ("Squirrel_Nibble", 72),
            ("Squirrel_Look", 48),
        ):
            act = bpy.data.actions.get(action_name)
            if act is None:
                continue
            arm.animation_data.action = act
            scene.frame_set(frame)
            bpy.context.view_layer.update()
            render_views(QA_DIR, f"verify-{action_name.split('_')[1].lower()}")
        arm.animation_data.action = None
        scene.frame_set(0)


STAGES = {
    "prep": stage_prep,
    "correct": stage_correct,
    "paint": stage_paint,
    "rig": stage_rig,
    "probe": stage_probe,
    "stance": stage_stance,
    "clips": stage_clips,
    "export": stage_export,
    "verify": stage_verify,
}

if __name__ == "__main__":
    argv = sys.argv
    stage = argv[argv.index("--stage") + 1] if "--stage" in argv else "prep"
    STAGES[stage]()
