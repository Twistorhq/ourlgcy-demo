# TW-1076: the owl slot. Grab3D "owl", CC0 1.0: a great horned
# owl, downloaded and inspected at the first sourcing sweep and
# held when the slot required an eastern screech owl. The
# founder's mandate change (2026-11-16, 15:54 MST) lifted the
# species-exactness stop: the slot ships the best clean-license
# owl that exists, credited as what it is. No conversion is
# applied or needed: the sculpt is a great horned owl and is
# presented as one, staged in the trunk hollow per the founder's
# owl reference composition.
#
# Pipeline mirrors build_squirrel_rig.py: prep (decimate + weld)
# -> rig (distance-gated skinning) -> probe -> clips -> export
# (asserted) -> verify (posed renders from the binary). The owl's
# motion is its head: owls turn their heads like nobody else in
# the forest, and the clips are built around that.
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
from build_squirrel_rig import _seg_dist, log, mesh_np, render_views

ARGS = sys.argv[sys.argv.index("--") + 1 :]
STAGE = ARGS[ARGS.index("--stage") + 1] if "--stage" in ARGS else "prep"

SRC_DIR = os.path.expanduser(
    "~/workspace/twistor-lab/projects/our-lgcy/tw1076-grab3d-source"
)
WORK_BLEND = os.path.join(SRC_DIR, "owl-work.blend")
FINAL_BLEND = os.path.join(SRC_DIR, "owl-rigged.blend")
QA_DIR = os.path.expanduser("~/workspace/repos/ourlgcy-demo-tw1076/qa/tw1076-owl/rig")
GLB_PATH = os.path.expanduser(
    "~/workspace/repos/ourlgcy-demo-tw1076/gl/animals/owl-rigged.glb"
)
TARGET_TRIS = 150000
WELD_DIST = 0.0006
os.makedirs(QA_DIR, exist_ok=True)
VIEWS = {"target": (0, 0, 0.26), "dist": 1.05}


def save_work():
    bpy.ops.wm.save_as_mainfile(filepath=WORK_BLEND)


def stage_prep():
    bpy.ops.wm.open_mainfile(filepath=os.path.join(SRC_DIR, "owl/owl.blend"))
    src = next(o for o in bpy.context.scene.objects if o.type == "MESH")
    src.name = "OwlSource_DO_NOT_EXPORT"
    work = src.copy()
    work.data = src.data.copy()
    work.name = "Owl"
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
    render_views(QA_DIR, "prep", **VIEWS)


BONES = {
    "root": ((0, 0.0, 0.0), (0, 0.0, 0.10), None),
    "body": ((0, 0.012, 0.10), (0, 0.0, 0.26), "root"),
    "chest": ((0, 0.0, 0.26), (0, -0.010, 0.36), "body"),
    "neck": ((0, -0.010, 0.36), (0, -0.020, 0.415), "chest"),
    "head": ((0, -0.020, 0.415), (0, -0.105, 0.465), "neck"),
    "wing_L": ((-0.070, 0.020, 0.300), (-0.125, 0.085, 0.130), "chest"),
    "wing_R": ((0.070, 0.020, 0.300), (0.125, 0.085, 0.130), "chest"),
    "tail": ((0, 0.080, 0.100), (0, 0.145, 0.035), "body"),
}
BODY_BONES = ["root", "body", "chest", "neck", "head"]


def stage_rig():
    bpy.ops.wm.open_mainfile(filepath=WORK_BLEND)
    work = bpy.data.objects["Owl"]
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

    arm_data = bpy.data.armatures.new("OwlRigData")
    arm = bpy.data.objects.new("OwlRig", arm_data)
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
    x, y, z = co[:, 0], co[:, 1], co[:, 2]
    gate = np.zeros((n, len(names)), dtype=bool)
    for b in BODY_BONES:
        gate[:, idx[b]] = True
    gate[:, idx["tail"]] = (y > 0.05) & (z < 0.16)
    for side, sfx in ((-1, "L"), (1, "R")):
        same = np.sign(x) == side
        gate[:, idx[f"wing_{sfx}"]] = same & (D[:, idx[f"wing_{sfx}"]] < 0.045)
    W = np.where(gate, np.exp(-((D / 0.022) ** 2)), 0.0)
    W /= np.maximum(W.sum(axis=1, keepdims=True), 1e-12)
    cell = 0.014
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
    far = D > 0.055
    for b in BODY_BONES:
        far[:, idx[b]] = False
    W = np.where(far, 0.0, W)

    # Skirt bands at the neck: an owl's head rotates on a tight
    # boundary. Two failures bracket the right answer: a gradual
    # fade dragged a sheet of throat plumage sideways, and a
    # hard cutoff sheared a straight streak at the cut. The
    # shipped version fades each bone's weights over a short
    # 3 cm band (head 0.375 to 0.405, neck 0.345 to 0.375), so
    # the small remaining shear hides in the throat barring.
    def _band(zz, lo, hi):
        return np.clip((zz - lo) / (hi - lo), 0.0, 1.0)

    W[:, idx["head"]] *= _band(z, 0.375, 0.395)
    W[:, idx["neck"]] *= _band(z, 0.350, 0.375)
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
    arm = bpy.data.objects["OwlRig"]
    work = bpy.data.objects["Owl"]
    bpy.context.view_layer.objects.active = arm
    landmarks = {
        "beak": (0.0, -0.115, 0.440),
        "eye_L": (-0.038, -0.095, 0.455),
        "tuft_L": (-0.045, -0.020, 0.545),
        "tail_tip": (0.0, 0.145, 0.035),
        "breast": (0.0, -0.115, 0.250),
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
        ("head", "Y"),
        ("head", "Z"),
        ("head", "X"),
        ("neck", "Y"),
        ("chest", "X"),
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


# Head-turn authoring, per the probe: the head bone's local Z is
# the yaw axis (beak swings sideways, -X for +Z), local X pitches
# the beak down, and the neck bone's local Y yaws the opposite
# way (beak +X for +Y), so a full turn combines head.Z positive
# with neck.Y negative. Local Y on the head itself is a roll and
# is never used for turns.
def owl_idle(t):
    pose = {}
    pose["chest"] = {"X": 0.30 * math.sin(2 * math.pi * 0.55 * t)}
    drift = _env(t, 3.0, 5.5, 8.5, 11.0)
    pose["head"] = {"Z": 10.0 * drift}
    pose["neck"] = {"Y": -4.0 * drift}
    bob = _env(t, 12.0, 12.5, 13.0, 13.6)
    pose["head"]["X"] = 3.0 * bob
    return pose


def owl_turn(t):
    turn = _env(t, 0.7, 1.6, 4.2, 5.4)
    pose = {}
    pose["head"] = {"Z": 30.0 * turn, "X": 4.0 * turn}
    pose["neck"] = {"Y": -8.0 * turn}
    pose["chest"] = {"X": 0.30 * math.sin(2 * math.pi * 0.55 * t)}
    return pose


def owl_scan(t):
    left = _env(t, 0.5, 1.6, 2.6, 3.2)
    right = _env(t, 3.4, 4.6, 5.8, 6.8)
    pose = {}
    pose["head"] = {"Z": -27.0 * left + 18.0 * right}
    pose["neck"] = {"Y": 6.0 * left - 4.0 * right}
    pose["chest"] = {"X": 0.30 * math.sin(2 * math.pi * 0.55 * t)}
    return pose


CLIPS = {
    "Owl_Idle": (14.0, owl_idle),
    "Owl_Turn": (6.5, owl_turn),
    "Owl_Scan": (7.5, owl_scan),
}


def stage_clips():
    bpy.ops.wm.open_mainfile(filepath=WORK_BLEND)
    arm = bpy.data.objects["OwlRig"]
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
    arm.animation_data.action = bpy.data.actions["Owl_Idle"]
    bpy.context.view_layer.update()
    log("CLIPS", made)
    save_work()


def stage_export():
    bpy.ops.wm.open_mainfile(filepath=WORK_BLEND)
    keep = {"Owl", "OwlRig"}
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
    node = next(nd for nd in doc["nodes"] if nd.get("name") == "Owl")
    assert "skin" in node, "owl exported without its skin"
    anims = sorted(a.get("name") for a in doc.get("animations", []))
    assert anims == sorted(CLIPS), anims
    log(
        "EXPORT",
        {"glb": GLB_PATH, "bytes": os.path.getsize(GLB_PATH), "animations": anims},
    )


def stage_verify():
    bpy.ops.wm.read_factory_settings(use_empty=True)
    bpy.ops.import_scene.gltf(filepath=GLB_PATH)
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
    inv["bytes"] = os.path.getsize(GLB_PATH)
    with open(os.path.join(QA_DIR, "verify.json"), "w") as fh:
        json.dump(inv, fh, indent=1)
    log("VERIFY", inv)
    arm = next((o for o in bpy.context.scene.objects if o.type == "ARMATURE"), None)
    if arm is not None:
        arm.animation_data_create()
        scene = bpy.context.scene
        scene.render.fps = FPS
        for act_name, frame, tag in (
            ("Owl_Idle", 150, "idle"),
            ("Owl_Turn", 72, "turn"),
            ("Owl_Scan", 110, "scan"),
        ):
            act = bpy.data.actions.get(act_name)
            if act is None:
                continue
            arm.animation_data.action = act
            scene.frame_set(frame)
            bpy.context.view_layer.update()
            render_views(QA_DIR, f"verify-{tag}", **VIEWS)
        arm.animation_data.action = None
        scene.frame_set(0)


STAGES = {
    "prep": stage_prep,
    "rig": stage_rig,
    "probe": stage_probe,
    "clips": stage_clips,
    "export": stage_export,
    "verify": stage_verify,
}

if __name__ == "__main__":
    STAGES[STAGE]()
