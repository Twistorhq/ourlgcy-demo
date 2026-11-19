#!/usr/bin/env python3
"""TW-1209 GLB size pass for the Our LGCY fauna.

The Grab3D-derived rigs ship every vertex attribute as float32.
Geometry, not texture, is the bulk (squirrel: 10.8 of 11.8 MB).
This pass re-encodes the three attributes that quantize losslessly
at page scale into their normalized integer forms, which are core
glTF 2.0 (no extension) and natively handled by three.js:

  NORMAL      float32 VEC3 -> BYTE snorm VEC3        (12 -> 3 B/vert)
  TEXCOORD_0  float32 VEC2 -> UNSIGNED_SHORT VEC2    ( 8 -> 4 B/vert)
  WEIGHTS_0   float32 VEC4 -> UNSIGNED_BYTE VEC4     (16 -> 4 B/vert)

POSITION, JOINTS_0, indices, skins, and animations are copied
byte-for-byte: contact precision and the baked clips are untouched.
Optionally (--max-texture N) the base-color image is downscaled to
N px on its long edge and re-encoded as JPEG; normal and
metallic-roughness maps keep their resolution.

Verified preconditions (checked, run aborts if violated): UVs in
[0, 1], skin weights summing to 1, unit normals. Verification of
the result is a separate step: qa/tw1209/verify_glb.py decodes
both files and compares every attribute within quantization
tolerance, and the capture harness pixel-compares renders.

Usage: optimize_glb.py IN.glb OUT.glb [--max-texture 1024]
Requires numpy and Pillow (house tts-venv has both).
"""

import json
import struct
import sys

import numpy as np

COMP = {5120: np.int8, 5121: np.uint8, 5122: np.int16, 5123: np.uint16,
        5125: np.uint32, 5126: np.float32}
COMP_SIZE = {5120: 1, 5121: 1, 5122: 2, 5123: 2, 5125: 4, 5126: 4}
NCOMP = {"SCALAR": 1, "VEC2": 2, "VEC3": 3, "VEC4": 4, "MAT4": 16}


def read_glb(path):
    with open(path, "rb") as f:
        data = f.read()
    magic, _ver, _length = struct.unpack("<III", data[:12])
    assert magic == 0x46546C67, "not a GLB"
    clen, ctype = struct.unpack("<II", data[12:20])
    assert ctype == 0x4E4F534A, "first chunk is not JSON"
    gltf = json.loads(data[20:20 + clen])
    off = 20 + clen
    blen, btype = struct.unpack("<II", data[off:off + 8])
    assert btype == 0x004E4942, "second chunk is not BIN"
    return gltf, data[off + 8:off + 8 + blen]


def acc_array(gltf, binbuf, idx):
    a = gltf["accessors"][idx]
    bv = gltf["bufferViews"][a["bufferView"]]
    assert "byteStride" not in bv, "interleaved bufferView; not handled"
    off = bv.get("byteOffset", 0) + a.get("byteOffset", 0)
    n = a["count"] * NCOMP[a["type"]]
    arr = np.frombuffer(binbuf, dtype=COMP[a["componentType"]], count=n,
                        offset=off)
    return arr.reshape(a["count"], NCOMP[a["type"]]) if NCOMP[a["type"]] > 1 else arr


def quantize(name, arr):
    """Return (new_componentType, bytearray) for a transformable attr."""
    f = arr.astype(np.float64)
    if name == "NORMAL":
        assert np.allclose(np.linalg.norm(f, axis=1), 1.0, atol=1e-3), \
            "normals not unit length"
        q = np.clip(np.round(f * 127.0), -127, 127).astype(np.int8)
        return 5120, q.tobytes()
    if name == "TEXCOORD_0":
        # exports carry float dust a hair outside [0,1] (measured
        # worst case 3.2e-5, far under one texel at 1024px); clamp
        # that dust, refuse anything real
        assert f.min() >= -1e-3 and f.max() <= 1.001, "UVs outside [0,1]"
        f = np.clip(f, 0.0, 1.0)
        q = np.round(f * 65535.0).astype(np.uint16)
        return 5123, q.tobytes()
    if name == "WEIGHTS_0":
        assert np.allclose(f.sum(axis=1), 1.0, atol=1e-3), \
            "skin weights do not sum to 1"
        # largest-remainder rounding: rows still sum to exactly
        # 255 (normalized sum stays 1) while every component stays
        # within 1/255 of its true value
        x = f * 255.0
        q = np.floor(x).astype(np.int32)
        rem = 255 - q.sum(axis=1)
        frac = x - q
        order = np.argsort(-frac, axis=1)
        for r in range(4):
            rows = np.nonzero(rem > r)[0]
            if len(rows) == 0:
                break
            cols = order[rows, r]
            q[rows, cols] = np.minimum(q[rows, cols] + 1, 255)
        return 5121, q.astype(np.uint8).tobytes()
    raise ValueError(name)


def main():
    src, dst = sys.argv[1], sys.argv[2]
    max_tex = 0
    if "--max-texture" in sys.argv:
        max_tex = int(sys.argv[sys.argv.index("--max-texture") + 1])

    gltf, binbuf = read_glb(src)
    new_bin = bytearray()
    new_bvs = []

    def emit(raw):
        while len(new_bin) % 4:
            new_bin.append(0)
        off = len(new_bin)
        new_bin.extend(raw)
        new_bvs.append({"buffer": 0, "byteOffset": off, "byteLength": len(raw)})
        return len(new_bvs) - 1

    # images first (optionally downscaling the largest, the base color)
    img_bv = {}
    if max_tex:
        from PIL import Image
        import io
        sizes = []
        for i, img in enumerate(gltf.get("images", [])):
            bv = gltf["bufferViews"][img["bufferView"]]
            raw = binbuf[bv.get("byteOffset", 0):
                         bv.get("byteOffset", 0) + bv["byteLength"]]
            im = Image.open(io.BytesIO(raw))
            sizes.append((max(im.size), i))
        biggest = max(sizes)[1]
        for i, img in enumerate(gltf.get("images", [])):
            bv = gltf["bufferViews"][img["bufferView"]]
            raw = binbuf[bv.get("byteOffset", 0):
                         bv.get("byteOffset", 0) + bv["byteLength"]]
            if i == biggest:
                im = Image.open(io.BytesIO(raw)).convert("RGB")
                if max(im.size) > max_tex:
                    im.thumbnail((max_tex, max_tex), Image.LANCZOS)
                    out = io.BytesIO()
                    im.save(out, "JPEG", quality=82)
                    raw = out.getvalue()
                    img["mimeType"] = "image/jpeg"
            img_bv[i] = emit(raw)
    else:
        for i, img in enumerate(gltf.get("images", [])):
            bv = gltf["bufferViews"][img["bufferView"]]
            raw = binbuf[bv.get("byteOffset", 0):
                         bv.get("byteOffset", 0) + bv["byteLength"]]
            img_bv[i] = emit(raw)
    for i, img in enumerate(gltf.get("images", [])):
        img["bufferView"] = img_bv[i]

    # accessors: transform the three, copy the rest byte-for-byte
    for idx, a in enumerate(gltf["accessors"]):
        name = None
        for m in gltf.get("meshes", []):
            for p in m["primitives"]:
                for an, ai in p["attributes"].items():
                    if ai == idx:
                        name = an
        bv = gltf["bufferViews"][a["bufferView"]]
        raw = binbuf[bv.get("byteOffset", 0) + a.get("byteOffset", 0):
                     bv.get("byteOffset", 0) + a.get("byteOffset", 0)
                     + a["count"] * NCOMP[a["type"]] * COMP_SIZE[a["componentType"]]]
        if name in ("NORMAL", "TEXCOORD_0", "WEIGHTS_0") \
                and a["componentType"] == 5126:
            arr = acc_array(gltf, binbuf, idx)
            ctype, raw = quantize(name, arr)
            a["componentType"] = ctype
            a["normalized"] = True
            a.pop("min", None)
            a.pop("max", None)
        a["bufferView"] = emit(raw)
        a["byteOffset"] = 0

    gltf["bufferViews"] = new_bvs
    gltf["buffers"][0]["byteLength"] = len(new_bin)

    json_raw = json.dumps(gltf, separators=(",", ":")).encode()
    while len(json_raw) % 4:
        json_raw += b" "
    while len(new_bin) % 4:
        new_bin.append(0)
    total = 12 + 8 + len(json_raw) + 8 + len(new_bin)
    with open(dst, "wb") as f:
        f.write(struct.pack("<III", 0x46546C67, 2, total))
        f.write(struct.pack("<II", len(json_raw), 0x4E4F534A))
        f.write(json_raw)
        f.write(struct.pack("<II", len(new_bin), 0x004E4942))
        f.write(new_bin)
    print(f"{src} -> {dst}")


if __name__ == "__main__":
    main()
