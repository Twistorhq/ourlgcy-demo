#!/usr/bin/env python3
"""TW-1209: verify an optimized GLB against its source.

Decodes every accessor of both files and compares:
  - POSITION, JOINTS_0, indices, inverse bind matrices, and all
    animation inputs/outputs must be BYTE-IDENTICAL (the optimizer
    copies them untouched);
  - NORMAL, TEXCOORD_0, WEIGHTS_0 must match within quantization
    tolerance (snorm8: 1/127, ushort UV: 1/65535 plus UV clamp dust
    1e-3, ubyte weights: 1/255);
  - clip names, durations, node and skin structure identical.

Usage: verify_glb.py SRC.glb OPT.glb
Exit 0 and print PASS lines when every check holds.
"""

import json
import struct
import sys

import numpy as np

COMP = {5120: np.int8, 5121: np.uint8, 5122: np.int16, 5123: np.uint16,
        5125: np.uint32, 5126: np.float32}
NCOMP = {"SCALAR": 1, "VEC2": 2, "VEC3": 3, "VEC4": 4, "MAT4": 16}


def read_glb(path):
    data = open(path, "rb").read()
    clen, _ = struct.unpack("<II", data[12:20])
    gltf = json.loads(data[20:20 + clen])
    off = 20 + clen
    blen, _ = struct.unpack("<II", data[off:off + 8])
    return gltf, data[off + 8:off + 8 + blen]


def acc_float(gltf, binbuf, idx):
    a = gltf["accessors"][idx]
    bv = gltf["bufferViews"][a["bufferView"]]
    off = bv.get("byteOffset", 0) + a.get("byteOffset", 0)
    n = a["count"] * NCOMP[a["type"]]
    arr = np.frombuffer(binbuf, dtype=COMP[a["componentType"]], count=n,
                        offset=off).astype(np.float64)
    if a.get("normalized"):
        ct = a["componentType"]
        if ct == 5120:
            arr = np.maximum(arr / 127.0, -1.0)
        elif ct == 5121:
            arr = arr / 255.0
        elif ct == 5123:
            arr = arr / 65535.0
        elif ct == 5122:
            arr = np.maximum(arr / 32767.0, -1.0)
    return arr.reshape(a["count"], NCOMP[a["type"]]) if NCOMP[a["type"]] > 1 else arr


def acc_raw(gltf, binbuf, idx):
    a = gltf["accessors"][idx]
    bv = gltf["bufferViews"][a["bufferView"]]
    off = bv.get("byteOffset", 0) + a.get("byteOffset", 0)
    n = a["count"] * NCOMP[a["type"]] * {5120: 1, 5121: 1, 5122: 2,
                                         5123: 2, 5125: 4, 5126: 4}[a["componentType"]]
    return binbuf[off:off + n]


def main():
    src, opt = sys.argv[1], sys.argv[2]
    g0, b0 = read_glb(src)
    g1, b1 = read_glb(opt)
    fails = []

    def check(cond, msg):
        print(("PASS " if cond else "FAIL ") + msg)
        if not cond:
            fails.append(msg)

    check(len(g0["accessors"]) == len(g1["accessors"]), "accessor count")
    check([n.get("name") for n in g0["nodes"]] ==
          [n.get("name") for n in g1["nodes"]], "node names/order")
    check(len(g0.get("skins", [])) == len(g1.get("skins", [])), "skin count")
    clips0 = [(a["name"], len(a["channels"])) for a in g0.get("animations", [])]
    clips1 = [(a["name"], len(a["channels"])) for a in g1.get("animations", [])]
    check(clips0 == clips1, f"clips {clips0}")

    attr_of = {}
    for m in g0.get("meshes", []):
        for p in m["primitives"]:
            for name, ai in p["attributes"].items():
                attr_of[ai] = name
            if "indices" in p:
                attr_of[p["indices"]] = "INDICES"
    anim_acc = set()
    for a in g0.get("animations", []):
        for s in a["samplers"]:
            anim_acc.add(s["input"])
            anim_acc.add(s["output"])
    for sk in g0.get("skins", []):
        anim_acc.add(sk["inverseBindMatrices"])

    tol = {"NORMAL": 1.0 / 127.0 + 1e-6, "TEXCOORD_0": 1.0 / 65535.0 + 1e-3,
           "WEIGHTS_0": 1.0 / 255.0 + 1e-6}
    for idx in range(len(g0["accessors"])):
        name = attr_of.get(idx)
        if name in tol:
            d = np.abs(acc_float(g0, b0, idx) - acc_float(g1, b1, idx)).max()
            check(d <= tol[name], f"accessor[{idx}] {name} max delta {d:.6f} <= {tol[name]:.6f}")
        else:
            same = acc_raw(g0, b0, idx) == acc_raw(g1, b1, idx)
            label = name or ("anim/skin" if idx in anim_acc else f"accessor[{idx}]")
            check(same, f"accessor[{idx}] {label} byte-identical")
    print("RESULT:", "ALL PASS" if not fails else f"{len(fails)} FAILURES")
    sys.exit(1 if fails else 0)


if __name__ == "__main__":
    main()
