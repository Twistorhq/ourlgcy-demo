# Provenance: white-tailed buck (TW-1075)

This file is the redistribution record for the deer asset used by the
Our LGCY demo's WebGL layer. House rule: no third-party asset ships in
this public repository without a record like this one.

## Source asset (unmodified)

- **What:** "Deer", a static, textured adult white-tailed buck model
  (no skeleton, no animation clips).
- **Publisher / source:** Grab3D, model page
  https://grab3d.com/models/animals/deer/
- **Download endpoint:** https://grab3d.com/dl/deer/ (files below).
- **Retrieved:** November 13, 2026, by Sofia Reyes (Twistor), for
  ticket TW-1075.
- **License:** CC0 1.0 Universal (Public Domain Dedication). The
  publisher's own LICENSE.txt states: "To the extent possible under
  law, Grab3D has waived all copyright and related or neighboring
  rights to the 3D models, textures and images in this package."
  Legal code: https://creativecommons.org/publicdomain/zero/1.0/legalcode
  CC0 permits redistribution of the raw asset, including in this
  public repository, with no attribution requirement. This record is
  kept anyway, per house provenance law.
- **License evidence, saved in this folder:**
  - `LICENSE-grab3d-deer.txt`: the publisher's LICENSE.txt, retrieved
    live from https://grab3d.com/dl/deer/LICENSE.txt on 2026-11-13.
    SHA-256 a15412842aa03ed7746551767e80808a9303edbbca02a06cfbcf354dfbd0ad27
  - `manifest-grab3d-deer.json`: the publisher's manifest, retrieved
    live from https://grab3d.com/dl/deer/manifest.json on 2026-11-13.
    SHA-256 2af64f9ea803e84babef5a19e883bd127e2a33a2a993ea821a7e4b93106b494c
- **Origin disclosure (from the publisher, verbatim in the license
  file):** "Method: AI-assisted (contains AI-generated content). Base
  mesh and textures generated with an AI image-to-3D tool (Meshy),
  then cleaned up, scaled, textured and checked in Blender." This is
  an AI-assisted model, not a scan of a real animal. The manifest
  records: created 2026-09-28, dimensions 0.591 x 1.564 x 1.700 m.

## Downloaded files (byte counts match the publisher manifest)

Unmodified copies are preserved outside this repository at
`twistor-lab/projects/our-lgcy/tw1075-grab3d-source/` (Twistor
internal storage). Hashes below were computed from the downloads on
2026-11-13.

| File | Bytes | Triangles | SHA-256 |
| --- | --- | --- | --- |
| deer.glb (full) | 29,908,068 | 745,466 | 09b893d95df9ab8657879bce4bc18943a49737714c6b93ecd858bdb6a70c26ce |
| deer-light.glb | 11,345,744 | 372,733 | e1c790cf50f1cbad11fdf945e4a7e0d40580a35ef17e4644542a77449c745023 |
| deer.blend | 37,095,229 | 745,466 | faad2efe5364d2e149116daa429e616be7450379c9ed01f9baf5612d310ad9a1 |

Not downloaded: deer.fbx, deer-obj.zip, deer.usdz, and the light FBX
(no role in this pipeline).

## Measured inventory (Blender 5.2.2, this ticket's inspection)

Both GLB variants are one mesh, one material, one UV layer, no
armature, no animation actions, no vertex groups.

- **Full:** 392,008 vertices, 745,466 triangles. Bounds
  0.591 x 1.564 x 1.700 m, ground plane at z = 0, head toward -Y.
  Three 4096 x 4096 textures: base color (sRGB), packed
  metallic/roughness (Non-Color, G = roughness, B = metallic via a
  Separate Color node), normal map (Non-Color, through a Normal Map
  node).
- **Light:** 205,517 vertices, 372,733 triangles, identical bounds.
  Two 1024 x 1024 textures: base color (sRGB) and packed
  metallic/roughness (Non-Color). **The light variant has no normal
  map.** It is not the quality source.
- **Blend:** content identical to the full GLB (same mesh counts,
  same three textures packed), saved by Blender 5.2. Designated the
  rigging working container for Phase B.
- **Mesh hygiene (full):** 246 mesh islands, 38,058 non-manifold
  edges, 1 zero-area polygon. Typical of image-to-3D output; the rig
  phase decimates and cleans a copy, never the preserved source.

Full machine-readable inventories: `qa/tw1075-grab3d/renders/
inventory-full.json` and `inventory-light.json`.

## Rock candidate (Phase D, not yet integrated)

- **What:** "Boulder 01" rock model, Poly Haven,
  https://polyhaven.com/a/boulder_01
- **License:** CC0. Poly Haven's license page
  (https://polyhaven.com/license, read live 2026-11-13) states all
  Poly Haven assets are licensed as CC0, effectively public domain,
  usable for any purpose including commercial. Redistribution in this
  repository is permitted. The 1k glTF is a multi-file download
  (gltf + bin + 3 jpg textures); conversion to a self-contained GLB
  happens in Phase D and gets its own hashes then.

## Modifications log

Kept current as the asset is worked. The shipped deer is a derivative
of the CC0 source above; every step is recorded here.

- 2026-11-13: none yet. Source downloaded, hashed, inspected
  (Phase A asset gate, `qa/tw1075-grab3d/ASSET-GATE.md`).

Prepared by Twistor Holdings LLC
