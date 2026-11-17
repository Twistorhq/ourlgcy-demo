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
- 2026-11-13 (Phase B, Sofia Reyes): rigging base prepared from the
  .blend source by `tools/fauna/build_buck_rig.py`, reproducible
  stages. The preserved source files above were never modified.
  - Decimated a copy to a 22,000-triangle / 18,636-vertex deformation
    mesh.
  - Founder-directed anatomy correction: legs lengthened and slimmed
    toward white-tailed deer proportions (body raised 0.12 m on a
    smooth blend band, 5 percent distributed leg stretch, leg columns
    slimmed toward their axes, cannon bones most, hooves least). The
    founder explicitly overrode the reference photo on this trait.
    Resulting height 1.821 m at the antler tips.
  - Built a 25-bone quadruped rig (root, spine chain, neck chain,
    head, jaw, independent ears measured from the mesh, tail, full
    legs) with scripted zone-corrected skinning: body-polyline
    projection weights, segment-distance leg and ear weights, antlers
    and eyes rigid to the head, and spatial weight smoothing (the
    source is a shell mosaic; this keeps bends crack-free, verified
    by deformation renders in `qa/tw1075-grab3d/rig/`).
  - Authored the founder crest stance (15-degree uphill pitch, all
    hooves coplanar on the fitted slope plane, measured) and four
    animation clips baked over it: Lookout_Idle, Look_Left,
    Look_Right, Ear_Adjust. Animation scope per the founder: head and
    ears only.
  - Downscaled the three textures to 2048 x 2048 and exported the
    self-contained `buck-rigged.glb` in this folder (2,740,728 bytes,
    SHA-256 c49ddf5ed1c8a0369ffd6ccbdae464ac0a1b11aa456eba5e5b39dcad1ffbb401).
    Full rig documentation: `RIG-MAPPING.md` in this folder.
    Editable rig source: `buck-rigged.blend`, Twistor internal
    storage with the source files (SHA-256
    da346d1ad765afee438364c0e860474bd94906af7f5f951e98e424ff3cd76ad1).

# Provenance: eastern gray squirrel (TW-1076)

Second resident of the threshold scene, seated on a branch at
frame left. Same house rule: no third-party asset ships in this
public repository without a record like this one.

## Source asset (unmodified)

- **What:** "Squirrel", a static, textured squirrel model (no
  skeleton, no animation clips). The sculpt is a Eurasian red
  squirrel; see the conversion record below.
- **Publisher / source:** Grab3D, model page
  https://grab3d.com/models/animals/squirrel/
- **Download endpoint:** https://grab3d.com/dl/squirrel/ (files
  below).
- **Retrieved:** November 16, 2026, by Sofia Reyes (Twistor), for
  ticket TW-1076.
- **License:** CC0 1.0 Universal (Public Domain Dedication), the
  publisher's LICENSE.txt (same text as the deer's). Legal code:
  https://creativecommons.org/publicdomain/zero/1.0/legalcode
  CC0 permits redistribution of the raw asset, including in this
  public repository, with no attribution requirement. This record
  is kept anyway, per house provenance law.
- **License evidence, saved in this folder:**
  - `LICENSE-grab3d-squirrel.txt`: the publisher's LICENSE.txt,
    retrieved live from https://grab3d.com/dl/squirrel/LICENSE.txt
    on 2026-11-16. SHA-256
    a15412842aa03ed7746551767e80808a9303edbbca02a06cfbcf354dfbd0ad27
  - `manifest-grab3d-squirrel.json`: the publisher's manifest,
    retrieved live from https://grab3d.com/dl/squirrel/manifest.json
    on 2026-11-16. SHA-256
    bd89cf7141d1f7bfd33e57d8a1e18f4ae0a26aaa79e05b5e2d54d70ffa497a20
- **Origin disclosure (from the publisher's manifest):**
  AI-assisted; base mesh and textures generated with an AI
  image-to-3D tool (Meshy), then cleaned up, scaled, textured and
  checked in Blender. The manifest records: created 2026-10-29,
  dimensions 0.154 x 0.371 x 0.297 m.

## Downloaded files (byte counts match the publisher manifest)

Unmodified copies are preserved outside this repository at
`twistor-lab/projects/our-lgcy/tw1076-grab3d-source/squirrel/`
(Twistor internal storage). Hashes computed from the downloads
on 2026-11-16.

| File | Bytes | Triangles | SHA-256 |
| --- | --- | --- | --- |
| squirrel.glb | 34,105,276 | 799,999 | e5565905c9aaebdc972bdcf5c5086578f8db81a5ba74b1dd079b531d366b5666 |
| squirrel.blend | 37,494,561 | 799,999 | 63343889af49de12122f5bc75cc9257e97bc69ee0dd12f1137a16f33b447ba20 |

Not downloaded: the FBX, OBJ, USDZ, and light variants (no role
in this pipeline).

## Measured inventory (Blender 5.2.2, this ticket's inspection)

One mesh, one material, one UV layer, no armature, no actions.
589,859 vertices, 799,999 triangles, 15,146 mesh islands (a
fur-card mosaic), three packed 4096 x 4096 textures (base color,
packed metallic/roughness, normal). Ground plane at z = 0, head
toward -Y.

## Species conversion and modifications log

The shipped squirrel is a derivative of the CC0 source above.
The source sculpt is a Eurasian red squirrel; the demo's species
is the eastern gray. Conversion by
`tools/fauna/build_squirrel_rig.py`, reproducible stages, the
preserved source never modified:

- 2026-11-16 (TW-1076, Sofia Reyes): decimated a copy to
  146,290 triangles / 106,671 vertices (the fur-card mosaic
  tears below about 150k triangles; a 0.6 mm vertex weld removed
  71,211 duplicate card verts without moving any surface).
- Ear tufts (the red squirrel's diagnostic trait) collapsed onto
  the ears at mesh level: 7,234 vertices pulled toward the ear
  anchors with a height-weighted shrink, crown centerline capped.
- Coat recolored in texture space: a hue-conditional pass
  desaturates saturated orange-red texels toward warm-gray
  agouti, preserving whites (belly, chin) and near-blacks (eye,
  tail banding). Coat mean RGB 0.531/0.254/0.085 before,
  0.355/0.290/0.235 after.
- Built a 27-bone rig (body chain, head, jaw, independent ears,
  full legs, 5-bone tail chain, acorn bone) with scripted
  distance-gated skinning and spatial smoothing.
- Authored a small acorn prop (nut, cap, stem) seated between
  the forepaws in the source pose's own feeding hold, weighted
  rigidly to the acorn bone.
- Authored three baked clips: Squirrel_Idle (16 s loop:
  breathing, tail sway on the 0.93 s pendulum period, a
  statue-still freeze window, an ear twitch, one small head
  turn), Squirrel_Nibble (7 s: head dips to the acorn, 3 Hz gnaw
  bob, tail near-still), Squirrel_Look (5 s: fast head snap,
  hold, ear flick, tail flick on return).
- Export numbers for the shipped `squirrel-rigged.glb` are
  recorded in `qa/tw1076-squirrel/verify.json` and the evidence
  pack at `qa/tw1076-squirrel/EVIDENCE.md`.

# Provenance: songbird (jay and woodpecker slots, TW-1076)

One source sculpt fills two fauna slots under the founder's
2026-11-16 mandate (every slot ships; species exactness yields
to the best clean-license animal, converted and credited
truthfully). The record below is shared; the conversions differ.

## Source asset (unmodified)

- **What:** "Bird", a static, textured European robin model
  (no skeleton, no animation clips).
- **Publisher / source:** Grab3D, model page
  https://grab3d.com/models/animals/bird/
- **Download endpoint:** https://grab3d.com/dl/bird/
- **Retrieved:** November 16, 2026, by Sofia Reyes (Twistor),
  for ticket TW-1076.
- **License:** CC0 1.0 Universal (Public Domain Dedication),
  the publisher's LICENSE.txt (same text as the deer's).
- **License evidence, saved in this folder:**
  - `LICENSE-grab3d-bird.txt`, SHA-256
    a15412842aa03ed7746551767e80808a9303edbbca02a06cfbcf354dfbd0ad27
  - `manifest-grab3d-bird.json`, SHA-256
    c415388a96fef1bc8d2caec32db0d2b4486fd79359d462558ff208bd83ce26bc
- **Origin disclosure (publisher's manifest):** AI-assisted
  (Meshy image-to-3D, cleaned in Blender); created 2026-09-28;
  dimensions 0.053 x 0.140 x 0.096 m.

## Downloaded files (byte counts match the publisher manifest)

Preserved outside this repository at
`twistor-lab/projects/our-lgcy/tw1076-grab3d-source/bird/`.

| File | Bytes | Triangles | SHA-256 |
| --- | --- | --- | --- |
| bird.glb | 29,451,772 | 799,999 | 13491a46ebaa407e3cd6bdb183b7edc63c51ed38a868f6c4787e3ff2978685 |
| bird.blend | 36,513,696 | 799,999 | f9de3eddfa6b2a72cc2bdc23c49510136616808703a353b36565570b09447504 |

## Conversions (tools/fauna/build_bird_rig.py)

Both derivatives decimate a copy to 65,695 triangles / 32,768
vertices and share an 11-bone rig and the region-repaint method
(anatomical face regions rasterized into UV space, feathered,
composited as luminance-driven transforms so feather shading
survives).

- **Blue jay slot** (`jay-rigged.glb`, 5,265,944 bytes):
  crown/back/wings/tail repainted jay blue, face and underparts
  white, black necklace band, beak and legs darkened; crown
  raised up to 5.9 mm toward a crest. Clips: Jay_Idle,
  Jay_Look, Jay_Peck. Evidence: `qa/tw1076-jay/`. Credited as a
  converted robin, not a blue jay.
- **Red-headed woodpecker slot** (`woodpecker-rigged.glb`,
  5,210,328 bytes): head and neck repainted crimson, body
  white, wings/back/tail black with the white wing patch and
  white rump; beak lightened to ivory. Staged clinging
  vertically on the trunk. Clips:
  Woodpecker_Idle, Woodpecker_Peck, Woodpecker_Look. Evidence:
  `qa/tw1076-woodpecker/`. Credited as a converted robin, not a
  red-headed woodpecker.

# Provenance: great horned owl (owl slot, TW-1076)

## Source asset (unmodified)

- **What:** "Owl", a static, textured great horned owl model
  (no skeleton, no animation clips).
- **Publisher / source:** Grab3D, model page
  https://grab3d.com/models/animals/owl/
- **Download endpoint:** https://grab3d.com/dl/owl/
- **Retrieved:** November 16, 2026, by Sofia Reyes (Twistor),
  for ticket TW-1076.
- **License:** CC0 1.0 Universal (Public Domain Dedication),
  the publisher's LICENSE.txt (same text as the deer's).
- **License evidence, saved in this folder:**
  - `LICENSE-grab3d-owl.txt`, SHA-256
    a15412842aa03ed7746551767e80808a9303edbbca02a06cfbcf354dfbd0ad27
  - `manifest-grab3d-owl.json`, SHA-256
    ed9a70cb196a0924f4e12c45561d10880fa03515ef85dc7af02e2b2158ad2987
- **Origin disclosure (publisher's manifest):** AI-assisted
  (Meshy image-to-3D, cleaned in Blender); created 2026-09-28;
  dimensions 0.288 x 0.321 x 0.550 m.

## Downloaded files (byte counts match the publisher manifest)

Preserved outside this repository at
`twistor-lab/projects/our-lgcy/tw1076-grab3d-source/owl/`.

| File | Bytes | Triangles | SHA-256 |
| --- | --- | --- | --- |
| owl.glb | 32,395,064 | 799,999 | 74c364ee6bcb01bc5e070a360ad7869353138da3ff1f5f7c6379eebbce5716dc |
| owl.blend | 39,161,589 | 799,999 | 5d5afb66a95aa6a119b0b630e1a8d7772e7ab7ffd631ba9932d300b9e17792eb |

## Modifications log

No species conversion: the owl is presented as the great
horned owl it is, staged in the trunk hollow per the founder's
owl reference composition. Build by
`tools/fauna/build_owl_rig.py`: decimated copy, 8-bone
head-centric rig, three baked clips (Owl_Idle, Owl_Turn,
Owl_Scan). Shipped numbers are recorded in
`qa/tw1076-owl/verify.json` and the pack at
`qa/tw1076-owl/EVIDENCE.md`.

Prepared by Twistor Holdings LLC
