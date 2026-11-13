# Buck rig mapping — TW-1075 Phase B

Prepared by Twistor Holdings LLC

Shipped asset: `gl/animals/buck-rigged.glb`
SHA-256: `c49ddf5ed1c8a0369ffd6ccbdae464ac0a1b11aa456eba5e5b39dcad1ffbb401`
Size: 2,740,728 bytes. Editable source: `buck-rigged.blend` in the
Twistor LGCY source folder (SHA-256
`da346d1ad765afee438364c0e860474bd94906af7f5f951e98e424ff3cd76ad1`),
built reproducibly by `tools/fauna/build_buck_rig.py` (stages: prep,
correct, rig, stance, probe, clips, export, verify). Source and
license: see `PROVENANCE.md` in this folder.

## Coordinate system, units, rest pose

- Authored in Blender: meters, Z-up, the deer faces -Y. Exported with
  the standard glTF Y-up conversion; Phase D orients the loaded group
  so the buck faces the viewer and verifies it on camera.
- Bind (rest) pose is the flat standing source pose. The founder crest
  stance is NOT the bind pose: it is baked into every clip, and frame
  0 of every clip is the stance. A player that shows the bind pose
  without starting a clip shows a level deer on flat ground.
- Reduced motion: pause `Lookout_Idle` at frame 0 (the still crest
  stance). No separate still asset exists or is needed.

## The crest stance (baked into all clips)

- Root pitch: -15 degrees about the root bone local X, pivot at the
  root head (0, 0.10, 0); root lift 0.1526 m so the lowest hoof
  touches z = 0.
- All four hooves stay coplanar on the fitted slope plane by
  construction (rigid pitch). Measured on the posed mesh (per-hoof
  tracked vertex clusters, `qa/tw1075-grab3d/rig/hooves.json`):
  slope 15.05 degrees descending toward the rear (+Y); front hoof
  soles at z = 0.219 m; hind-left sole at 0; hind-right sole within
  0.2 cm of the plane (the source stance itself is asymmetric: the
  right hind is stepped slightly forward).
- Posed hoof sole centroids (Blender space): front_L (-0.123, -0.172),
  front_R (0.180, -0.176), hind_L (-0.130, 0.647), hind_R (0.201, 0.519).
  Phase D fits the rock crest facet to this plane and these contacts.

## Bones (25, as built)

| bone | head (x, y, z) | tail (x, y, z) | parent |
|---|---|---|---|
| root | (0, 0.100, 0) | (0, 0.100, 0.250) | none |
| pelvis | (0, 0.520, 0.999) | (0, 0.280, 1.017) | root |
| spine | (0, 0.280, 1.017) | (0, 0.020, 1.009) | pelvis |
| chest | (0, 0.020, 1.009) | (0, -0.240, 1.122) | spine |
| neck_1 | (0, -0.240, 1.122) | (-0.011, -0.381, 1.385) | chest |
| neck_2 | (-0.011, -0.381, 1.385) | (0.037, -0.507, 1.433) | neck_1 |
| head | (0.037, -0.507, 1.433) | (0.076, -0.674, 1.555) | neck_2 |
| jaw | (0.037, -0.537, 1.378) | (0.076, -0.784, 1.405) | head |
| ear_L | (-0.052, -0.452, 1.472) | (-0.118, -0.398, 1.585) | head |
| ear_R | (0.128, -0.520, 1.498) | (0.243, -0.598, 1.635) | head |
| tail | (0.012, 0.665, 1.075) | (0.018, 0.750, 0.957) | pelvis |
| upperarm_L | (-0.115, -0.219, 1.000) | (-0.071, -0.138, 0.562) | chest |
| forearm_L | (-0.071, -0.138, 0.562) | (-0.104, -0.151, 0.142) | upperarm_L |
| hoof_FL | (-0.104, -0.151, 0.142) | (-0.104, -0.201, 0.012) | forearm_L |
| upperarm_R | (0.161, -0.248, 1.000) | (0.147, -0.157, 0.561) | chest |
| forearm_R | (0.147, -0.157, 0.561) | (0.160, -0.154, 0.134) | upperarm_R |
| hoof_FR | (0.160, -0.154, 0.134) | (0.160, -0.204, 0.012) | forearm_R |
| thigh_L | (-0.065, 0.653, 1.020) | (-0.093, 0.600, 0.552) | pelvis |
| gaskin_L | (-0.093, 0.600, 0.552) | (-0.075, 0.684, 0.383) | thigh_L |
| cannon_L | (-0.075, 0.684, 0.383) | (-0.109, 0.702, 0.141) | gaskin_L |
| hoof_HL | (-0.109, 0.702, 0.141) | (-0.109, 0.652, 0.012) | cannon_L |
| thigh_R | (0.174, 0.533, 1.020) | (0.152, 0.521, 0.567) | pelvis |
| gaskin_R | (0.152, 0.521, 0.567) | (0.142, 0.609, 0.392) | thigh_R |
| cannon_R | (0.142, 0.609, 0.392) | (0.175, 0.596, 0.148) | gaskin_R |
| hoof_HR | (0.175, 0.596, 0.148) | (0.175, 0.546, 0.012) | cannon_R |

Ear bones are deliberately asymmetric: the source head is yawed, the
right ear flares out at +X, the left ear tucks to the back-top of the
skull. Positions were measured from a connected-component census of
the working mesh, not mirrored guesses. Leg pivots come from leg
centerline slice centroids; the legs are static in every clip (the
founder collapsed the animation scope to head and ears), so leg bones
hold the stance and carry no performance.

## Skinning method (scripted, zone-corrected, verified)

- Body: weights from projection onto the body bone polyline
  (pelvis to head), NOT distance to the bone line; a distance softmax
  zeroed 39 percent of the torso surface in the first attempt and was
  rejected.
- Legs: segment-distance softmax inside each leg column, blended into
  the body weights across z 0.90 to 1.04.
- Ears: distance falloff from the measured ear bone segments
  (0.95 at the segment, 0 at 0.085 m), remainder to head.
- Antlers and eyes: rigid to head, always. Antlers never take ear or
  neck weights.
- Tail zone 0.75 tail / 0.25 pelvis; jaw zone 0.40 jaw / 0.60 head.
- Spatial weight smoothing, radius 0.028 m, 3 passes: the source is a
  mosaic of 246 overlapping shells; topology-only smoothing left
  coincident shells with divergent weights and a neck bend opened
  cracks along the jaw, throat, and chest. After spatial smoothing
  the same bend (about 28 degrees total yaw) renders crack-free.
  Evidence: `qa/tw1075-grab3d/rig/deform-turnL.png` before and after
  (same filename, final state is the smooth one; the cracked render
  was overwritten by the re-test).
- Result: 18,636 verts, 22,000 tris authored (22,080 tris on GLB
  reimport after seam splits), 0 unweighted verts, 79 verts whose top
  weight is under 0.45 (joint blend zones, expected).

## Measured rotation conventions (probe stage, 12-degree tests)

Displacements of the nose point per +12 degrees of local rotation:

- Yaw toward the viewer's left: neck_1 local Z +, neck_2 local X +,
  head local Z + (nose moves -X).
- Pitch down: neck_1 local X +, head local X +, neck_2 local Z -.
- Ear flicks read best on local X (verified visually at +/-25
  degrees: blade tilts, root stays attached, antlers untouched).

## Clips (24 fps, stance baked into every frame of every clip)

| clip | frames | seconds | content |
|---|---|---|---|
| Lookout_Idle | 385 | 16.0 | loop: near-still crest lookout; faint neck breath (about 0.4 degrees, 4 s period); one slight head shake at 4.5-6.0 s; left ear adjust at 8-10 s; right ear adjust at 11.5-13 s; micro drift, loop-exact (frame 384 = frame 0) |
| Look_Left | 145 | 6.0 | small turn to the viewer's left, about 11 degrees total across neck_1/neck_2/head, 1.8 s out, hold, 1.8 s back; right ear adjust mid-hold; ends at stance |
| Look_Right | 145 | 6.0 | mirror of Look_Left; left ear adjust mid-hold |
| Ear_Adjust | 193 | 8.0 | left ear flick, both-ear sweep, right ear flick, settle; head essentially still |

Only these four clips exist in the GLB. The jaw and tail bones are
rigged but unanimated in this delivery.

## Mesh and textures (as shipped)

- Bounds (rest, after the founder leg correction): x -0.295 to
  0.295, y -0.782 to 0.783, z 0 to 1.821 (antler tips).
- One material, double-sided. Three 2048 x 2048 textures: base color
  (sRGB), tangent-space normal, metallic-roughness (packed; the
  source is non-metallic, roughness rides the G channel per glTF).

## Founder leg correction (applied before skinning)

The founder directed longer, leaner legs than the source and the
reference photo (his one explicit override of the photo). Applied as
a position pass on the rigging base: body raised 0.12 m on a smooth
blend band (z 0.45-0.70 body path), leg columns given a further 5
percent distributed stretch, and slimmed toward each leg's own axis
(cannon bones to 0.84, mid-leg 0.90, hooves 0.96, shoulder and hip
muscle left full). Side evidence:
`qa/tw1075-grab3d/rig/corrected-side.png`.

## Phase D staging law (founder directions, Nov 13; binding)

1. The buck stands ON the rock, pitched with the slope, head high
   above the hindquarters, camera low looking up at him. The rock
   stays present and visible in the frame with him. Founder's test:
   if a viewer cannot immediately tell he is standing pitched on
   that rock, the composition fails. Do not flatten the pitch and do
   not blend the rock away.
2. Flipped crest: mirror the silhouette composition reference
   horizontally; the crest and high side sit opposite the
   illustration, the rock mass descends on the flipped side.
3. The body blends into the page/section break, sleek and seamless:
   no hard edge, no rectangular patch, no seam line, no halo. The
   blend takes the lower body (and the rock where the break takes
   it); everything above the blend keeps the pitch read.
4. Background behind him, same scene: the photographic oak, ALL
   existing woodland animals and interactions, the ancestors, and
   the TW-1077 ink-walker band as a background layer behind the
   rock. A placeholder band is allowed only if clearly a
   placeholder; TW-1077's scope is not part of this ticket.
5. Site animation: Lookout_Idle by default; Look_Left and Look_Right
   are the small head turns; Ear_Adjust is the living motion;
   reduced motion shows the frame-0 stance.

## Known limitations

- Model/anatomy: the coat is the source's redder summer coat (the
  photo reference is grayer); the eye reads slightly glassy at
  extreme close-up; both are source traits recorded at the Phase A
  gate. The mesh is a shell mosaic (246 islands, 38,058 non-manifold
  edges in the source); it renders and deforms correctly at the
  authored amplitudes but is not a clean manifold.
- Rig/animation: do not exceed roughly 30 degrees of total neck yaw
  or 25 degrees of ear rotation without re-running the deformation
  check (`--stage deform`); the cracks the spatial smoothing closed
  can reopen past the verified envelope. Legs carry no performance.
- Renderer/integration and browser/device gaps: Phase D and E items,
  not covered by this document.
