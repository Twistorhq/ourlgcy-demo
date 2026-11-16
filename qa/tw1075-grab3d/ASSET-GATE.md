# TW-1075 Phase A asset gate: Grab3D white-tailed buck

Date: November 13, 2026. Inspector: Sofia Reyes. Method: the actual
downloaded files, parsed and rendered in Blender 5.2.2 (Cycles, CPU,
32 samples, 960 x 540), never the marketing page. Inspection scripts:
`inspect_glb.py` and `inspect_full.py` in this folder. Renders and
machine-readable inventories: `renders/` in this folder.

## Verdict

**PASS, proceed to rig (Phase B), with the limitations in section 4
recorded.** The candidate is an anatomically convincing adult
white-tailed buck at full-body and moderate close range, which is the
range the demo scene uses. It is categorically different from the
procedural builds rejected earlier in this ticket: continuous skin
over muscle at every joint, real PBR texture (base color, packed
metallic/roughness, normal map in the full variant), correct
whitetail markings (white throat patch, pale belly, white rump patch
and tail underside, dark wet nose).

## 1. What was inspected

Downloads and hashes are recorded in `gl/animals/PROVENANCE.md`.
Variants: full GLB (745,466 tris, 4096 px textures), light GLB
(372,733 tris, 1024 px textures), and the publisher .blend (content
identical to the full GLB). License: CC0 1.0, evidence files saved
next to the provenance record; redistribution in this public
repository is permitted. Origin is AI-assisted (Meshy base geometry
and textures, Blender cleanup by the publisher), disclosed by the
publisher and recorded, not a scan.

## 2. Render evidence (all in `renders/`)

Light variant, 8 views: `light-side-left.png`, `light-side-right.png`,
`light-end-min.png` (front), `light-end-max.png` (rear),
`light-tq-min-left.png`, `light-tq-max-right.png`,
`light-close-min_end.png` (face), `light-close-max_end.png` (rump).
Full variant, 4 views: `full-tq-front-right.png`, `full-close-face.png`,
`full-close-legs.png`, `full-tq-rear-left.png`.

Per-check results:

- **Fused legs: none.** All four legs are separate forms with visible
  gaps in front, rear, and profile views; fetlocks and pasterns are
  shaped, not tubes.
- **Hooves: pass.** `full-close-legs.png`: cloven hoof, two dark toes,
  dewclaw behind the fetlock, hoof planted flat on the ground plane
  with contact shadow. All four hooves touch z = 0 (measured, see
  section 5).
- **Eyes: pass at scene range, noted at extreme close-up.** Dark,
  almond-shaped, symmetrical in the front view, with eyelid rims and
  a natural pale eye ring. In the 85 mm face close-up the eye reads
  slightly glassy (strong blue specular), the weakest single element.
  The demo never frames the deer this tightly.
- **Ear cavities: pass.** Both ears are cupped forms with pale,
  textured inner ears and natural roots; not flat cards.
- **Antlers: pass, noted.** Beams rise from plausible pedicles with a
  textured burr; no beam intersects the skull, ears, or neck in any
  view. The rack is mature and natural, but its shape differs from
  the founder reference photo: more inward curl, shorter upright
  tines than the photograph's rack.
- **Texture seams: none visible.** The coat flows continuously across
  the body in every view; fur direction changes read as grooming, not
  seams.
- **Coat color: pass, noted.** Credible reddish-brown summer coat
  with the correct markings. The founder reference animal wears a
  grayer late-season coat. Scene lighting can cool the read; the
  texture itself is what it is, and the difference is recorded rather
  than hidden.

## 3. Rigging base decision

**Base: the publisher .blend (identical geometry and textures to the
full GLB), because it opens natively in Blender 5.2 with textures
packed.** The light GLB is rejected as a base: it drops the normal
map and quarters texture resolution. The full GLB remains the
byte-level cross-check of the source.

Neither download is shippable as-is: 745k triangles and 29.9 MB break
the web budget of a static demo page, and a 372k triangle mesh is not
a deformation mesh. Phase B works on a copy:

- Decimate and clean to a deformation mesh of roughly 18,000 to
  25,000 triangles, holding density at the face, ears, and hoof
  lines, relaxing it across the barrel.
- Reuse the source UVs through the decimation so the 4096 px maps
  still land; ship textures at 2048 px (base, normal, packed MR).
- Export GLB, then meshopt-compress with the pipeline already used
  for the current deer. Target shipped size: at most about 6 MB.
  Devices that cannot carry it fall to the existing photographic
  deer through the tiering probe, unchanged.

## 4. Limitations carried into Phase B

1. Mesh hygiene: 246 islands and 38,058 non-manifold edges (full
   variant). Skinning must verify that detached islands (antler
   points, eyes) carry rigid head weights; a missed island would
   lag or detach in a head turn, and the Phase B pose renders are
   where that gets caught.
2. The eye gloss noted above. If the founder gate rejects the eyes
   at scene distance, the fix is a material pass (lower specular on
   the eye region via the roughness map), not new geometry.
3. The baked stance is a relaxed natural stand, right hind stepped
   slightly forward of the left (measured in section 5). The rig
   keeps this stance; the idle does not re-square the feet.
4. The head carries a slight natural turn in the source pose. The
   rig's rest pose records it as-is; Look_Left and Look_Right are
   authored relative to it.

## 5. Measured ground contacts (full GLB, model space, meters)

Lowest-vertex clusters (z under 0.03 m), grouped per hoof. Model
space: head toward -Y, ground z = 0.

| Hoof | Contact centroid (x, y) | Min z |
| --- | --- | --- |
| Front, -X side | (-0.131, -0.207) | 0.0006 |
| Front, +X side | (0.182, -0.206) | 0.0000 |
| Rear, -X side | (-0.131, 0.664) | 0.0006 |
| Rear, +X side | (0.207, 0.541) | 0.0018 |

Stance footprint: x from -0.16 to 0.24, y from -0.26 to 0.72. The
Phase D rock top must meet all four contacts; no leg may be sunk to
fake a fit.

## 6. Phase B rig plan (specified, not yet built)

Armature (Blender, Z-up, meters, model forward -Y). Bone names use
no dot suffixes, so three.js receives exactly the names the mapping
document records:

- `root`, `pelvis`, `spine_01`, `spine_02` (chest), `neck_01`,
  `neck_02`, `neck_03`, `head`, `ear_L`, `ear_R`, `tail_01`,
  `tail_02`.
- Per leg: front `upper_leg_front_L/R`, `lower_leg_front_L/R`,
  `fetlock_front_L/R`, `hoof_front_L/R`; hind `upper_leg_hind_L/R`,
  `lower_leg_hind_L/R`, `fetlock_hind_L/R`, `hoof_hind_L/R`.
  Legs exist to hold the standing pose and settle weight, not to
  walk; range is small and keyed only for balance shifts in idle.

Weights: automatic weights are a draft only. Hand-correct, then
prove with posed renders, at: shoulder/chest junctions, neck base,
jaw and throat, ear roots, elbows, stifles, hocks, fetlocks, tail
base. Antler and eye islands: rigid weight 1.0 to `head`. Ear
islands: `ear_L` / `ear_R` with a root blend into `head`.

Clips (only these, authored on the rig, looped where marked):
`Lookout_Idle` (about 12 s loop: long stillness, breathing keyed on
the spine at roughly 0.24 Hz with small amplitude, feet planted),
`Look_Left` and `Look_Right` (about 4 s: slow turn out over 1.2 s,
hold, smooth return), `Ear_Adjust` (about 6 s: one ear flick, then
the other; ears independent). No grazing, no head-low default.

Deliverables Phase B adds: the editable .blend in Twistor internal
storage with its hash in the provenance record, authoring and export
scripts under `tools/`, `gl/animals/RIG-MAPPING.md` (bone names as
built, rest pose, units and axes), and posed deformation renders in
this QA folder.

## 7. Phase D notes from reading `gl/scene.js` on main

Recorded now so the integration phase starts from facts:

- The scene maps Quaternius bone names (Head, Neck3, Ear1L, ...) and
  defaults to grazing clips (Eating, Idle_Headlow). Both are replaced
  by the new rig's mapping document and the lookout clip set; the
  founder's direction is a lookout default, no constant grazing.
- The contact shadow and earth patch materials pass an
  rgba(0,0,0,alpha) canvas gradient as `alphaMap`. three.js samples
  the green channel of an alphaMap; that gradient's green channel is
  0 everywhere, so the blob shadow cannot fade as drawn. Fix: build
  the mask as a white-to-black RGB gradient (the dell ground in the
  same file already does this correctly) and verify the shadow
  visually in the rendered page.
- Procedural offsets multiply each bone's current quaternion.
  Bones a playing clip does not drive keep last frame's procedural
  result, so offsets can accumulate. Fix: store rest quaternions at
  load and restore before composing each frame; skip unmapped bones
  explicitly and log the mapping misses once.
- Teardown disposes the renderer and canvas but not geometries,
  materials, textures, the mixer, the observers, or the resize
  listener. Phase D completes the teardown list, adds a
  visibilitychange reset for the clock and governor window, and a
  late-load guard: a GLB resolving after teardown is disposed and
  ignored.

## 8. What this gate did not do

No rig was built in this phase, no scene code changed, and the live
demo deer on main is untouched. Browser and device verification
belong to Phase E, after integration.

Prepared by Twistor Holdings LLC
