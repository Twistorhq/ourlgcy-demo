# TW-1076 evidence pack: eastern gray squirrel

Species: eastern gray squirrel (Sciurus carolinensis), with acorn,
per the founder's reference photo (gray squirrel upright on a
mossy branch at a trunk base, holding an acorn at its chest with
both forepaws, tail arched behind, white belly, no ear tufts).

## Source and license

- Grab3D "squirrel", CC0 1.0, retrieved 2026-11-16. Full record:
  `qa/tw1076-sourcing/SOURCING.md` and the squirrel section of
  `gl/animals/PROVENANCE.md`. License and manifest ride with the
  asset at `gl/animals/LICENSE-grab3d-squirrel.txt` and
  `gl/animals/manifest-grab3d-squirrel.json`.
- The source model is a Eurasian red squirrel. Conversion gate:
  the animal ships only if it reads as an eastern gray squirrel
  against the reference. Conversion, both steps in
  `tools/fauna/build_squirrel_rig.py`:
  1. Ear tufts collapsed onto the ears at mesh level (7,234
     vertices moved, max displacement 4.1 cm on a 30 cm animal;
     the brush shrinks into the ear silhouette instead of being
     deleted, which would hole the fur-card mosaic).
  2. Coat recolored in texture space by a hue-conditional pass:
     saturated orange-red texels desaturate toward warm-gray
     agouti (coat mean RGB 0.531/0.254/0.085 before, 0.355/0.290/
     0.235 after); whites (belly, chin) and near-blacks (eye, tail
     banding) preserved.
- Honest limits, stated for the founder's gate: the converted
  coat sits on the warm, brown-gray side of gray (gray squirrels
  do run brown-gray, and the warm cast is what the blend law
  wants against the oak photograph; a cooler pass is a
  one-parameter change if the founder prefers it). The ear tips
  keep a darker cap where the tuft fur compressed; at page size
  it reads as the darker ear edge gray squirrels show.

## Build numbers

- Source: 589,859 vertices / 799,999 triangles, fur-card mosaic
  (15,146 islands), three packed 4096 textures, no armature.
- Decimation finding: the mosaic tears below about 150k
  triangles (26k and 90k tests holed visibly; 150k holds the
  coat). Working mesh: 146,290 triangles / 106,671 vertices
  after a 0.6 mm weld that cut 71,211 duplicate card verts.
- Rig: 27 bones (body chain, head, jaw, independent ears, full
  fore and hind legs, 5-bone tail chain, acorn bone), scripted
  skinning with anatomical distance gates, spatial smoothing,
  and a post-smoothing distance re-gate. (v1 box-region skinning
  tore the chest when posed; the failure render is kept in this
  pack's rig folder history and the fix is documented in the
  build script.)
- Clips (24 fps, baked per-frame over the rest stance):
  Squirrel_Idle 16 s, Squirrel_Nibble 7 s, Squirrel_Look 5 s.
- Shipped GLB: gl/animals/squirrel-rigged.glb, 11,825,300
  bytes (the largest of the four residents: fur geometry,
  skinning, and three dense clips; meshopt or Draco reduction
  is a merge-time option, not adopted here). Full inventory in
  rig/verify.json.

## Motion note

What moves: the tail, always, on the measured pendulum period
for a plume this size (0.93 s, 0.65 rad phase lag per segment,
from the TW-1018 species dossier); breathing (chest and spine,
sub-degree, 0.8 Hz); in the idle, one ear twitch and one quick
small head turn per loop. In the nibble: the head dips to the
acorn with a 3 Hz gnaw bob and a small jaw motion, forepaws
tighten slightly, the tail goes near-still the way a feeding
squirrel's does. In the look: a fast head snap (0.3 s) to the
side, a hold, one ear flick, and a tail flick burst on return.
Freeze law: the idle carries a 3.5 s statue-still window per
loop where everything but breathing stops, because that is
what squirrels actually do.

What never moves: the hindquarters, feet, and body placement on
the branch (the animal is seated; it does not walk, climb, or
leave the perch), the acorn's seat between the paws, and
anything on the buck's channels. Nothing upstages the buck: the
squirrel is a tenth of his height and its gestures are smaller
and rarer than his.

## Blend proof (founder's blend law, 2026-11-16)

- Same light: the squirrel renders inside the buck's scene under
  his exact light recipe (warm hemi, warm sun, cool rim, face
  fill), so color temperature matches the composed scene by
  construction; the coat's warm-gray cast was chosen against the
  oak photograph's warm register.
- Contact shadow: a soft shadow pool sits on the branch under
  the squirrel (plus the scene's directional shading), grounding
  the seat; the feet meet moss, not air.
- Occlusion: leaf clusters overhang the branch root and tip the
  branch end, and moss mounds break the branch line in front of
  and behind the animal, so the perch reads as growth, not a
  stage.
- Feathered edges: the section's existing canvas mask feathers
  the whole GL layer into the page break, fauna included.
- Stills in this folder: composed-1152.png (desktop),
  composed-390.png (mobile), squirrel-final-size.png (the animal
  cropped at native pixels, final size, for judging the blend),
  composed-nibble-1152.png and composed-look-1152.png (posed
  gestures in the composed page). Capture method: Playwright
  under SwiftShader with the ?gl=force-a QA override and a
  network-level Lenis stub, harness only (capture.py here);
  page code untouched.

## Reference comparison

rig/paint-tq.png and rig/paint-side.png are the converted animal
at inspection framing; rig/prep-tq.png is the red source before
conversion; the composed stills above are the animal at page
framing next to the founder's reference composition (branch at a
trunk base, acorn at the chest, tail arched behind).

Prepared by Twistor Holdings LLC
