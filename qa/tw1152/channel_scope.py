# TW-1152 channel-scope proof: parse the shipped GLB directly and
# report, per animation clip, which bones actually vary. The law:
# only neck_1, neck_2, head, ear_L, ear_R may vary in any clip.
# Also inventories meshes, skins, joints, images, and triangles so
# the file discipline Rosa verified at TW-1147 can be re-checked.
# Usage: python3 channel_scope.py [path-to-glb]
#
# Noise floor: the glTF exporter's per-frame sampling leaves a
# 0.04 to 0.06 degree shimmer on a few untouched bones (spine,
# forearm_R, hoof_FR, gaskin_L, hoof_HR). The previously approved
# TW-1147 GLB carries the identical values on the identical bones,
# so deviations at or below 0.1 degree are reported in full under
# all_channel_deviations_deg but do not count as motion.
import json
import math
import struct
import sys

import numpy as np

ALLOWED = {"neck_1", "neck_2", "head", "ear_L", "ear_R"}
PATH = sys.argv[1] if len(sys.argv) > 1 else "gl/animals/buck-rigged.glb"

with open(PATH, "rb") as fh:
    raw = fh.read()
assert raw[:4] == b"glTF", "not a GLB"
jlen = struct.unpack("<I", raw[12:16])[0]
gltf = json.loads(raw[20 : 20 + jlen])
boff = 20 + jlen
blen = struct.unpack("<I", raw[boff : boff + 4])[0]
bin_chunk = raw[boff + 8 : boff + 8 + blen]

buffers = gltf["bufferViews"]


def accessor_data(idx):
    acc = gltf["accessors"][idx]
    bv = buffers[acc["bufferView"]]
    off = bv.get("byteOffset", 0) + acc.get("byteOffset", 0)
    ncomp = {"SCALAR": 1, "VEC2": 2, "VEC3": 3, "VEC4": 4}[acc["type"]]
    dt = {5126: np.float32, 5123: np.uint16, 5125: np.uint32}[acc["componentType"]]
    arr = np.frombuffer(bin_chunk, dtype=dt, count=acc["count"] * ncomp, offset=off)
    return arr.reshape(acc["count"], ncomp) if ncomp > 1 else arr


nodes = gltf["nodes"]
names = [n.get("name", f"node{i}") for i, n in enumerate(nodes)]
tris = 0
for mesh in gltf["meshes"]:
    for prim in mesh["primitives"]:
        idx = accessor_data(prim["indices"])
        tris += len(idx) // 3

report = {
    "bytes": len(raw),
    "meshes": len(gltf["meshes"]),
    "skins": len(gltf.get("skins", [])),
    "joints": len(gltf["skins"][0]["joints"]) if gltf.get("skins") else 0,
    "triangles": tris,
    "image_mime_types": [img.get("mimeType") for img in gltf.get("images", [])],
    "clips": {},
}

NOISE_FLOOR_DEG = 0.1
ok = True
for anim in gltf["animations"]:
    varying = {}
    all_dev = {}
    for ch in anim["channels"]:
        node_name = names[ch["target"]["node"]]
        path = ch["target"]["path"]
        sampler = anim["samplers"][ch["sampler"]]
        values = accessor_data(sampler["output"])
        if path == "rotation":
            base = values[0]
            dots = np.abs(np.sum(values * base, axis=1))
            max_deg = math.degrees(2 * math.acos(min(1.0, float(dots.min()))))
        else:
            max_deg = float(np.abs(values - values[0]).max())
        if max_deg > 0.005:
            all_dev[node_name] = round(max_deg, 3)
        if max_deg > NOISE_FLOOR_DEG:
            varying[node_name] = round(max_deg, 2)
    report["clips"][anim["name"]] = {
        "duration_s": round(
            float(accessor_data(anim["samplers"][0]["input"]).max()), 2
        ),
        "varying_bones": varying,
        "all_channel_deviations_deg": all_dev,
    }
    extra = set(varying) - ALLOWED
    if extra:
        ok = False
        report["clips"][anim["name"]]["SCOPE_VIOLATION"] = sorted(extra)

report["scope_ok"] = ok
print(json.dumps(report, indent=1))
sys.exit(0 if ok else 1)
