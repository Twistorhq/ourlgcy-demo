# TW-1076 evidence pack: blue jay slot

**What this animal actually is:** a European robin (Erithacus
rubecula) sculpt, Grab3D "bird", CC0 1.0, converted toward the
blue jay's markings. It is credited that way everywhere it
appears. No clean-license blue jay model exists on any ungated
source swept (see `qa/tw1076-sourcing/SOURCING.md`); under the
founder's 2026-11-16 mandate the slot ships the best available
songbird converted, not an empty perch.

## Source and license

- Grab3D "bird", https://grab3d.com/dl/bird/, retrieved
  2026-11-16. License and manifest ride with the assets at
  `gl/animals/LICENSE-grab3d-bird.txt` (CC0 1.0, SHA-256
  a15412842aa03ed7746551767e80808a9303edbbca02a06cfbcf354dfbd0ad27)
  and `gl/animals/manifest-grab3d-bird.json` (SHA-256
  c415388a96fef1bc8d2caec32db0d2b4486fd79359d462558ff208bd83ce26bc).
- Downloads byte-exact against the publisher manifest after a
  resumed download: bird.blend 36,513,696 bytes, SHA-256
  f9de3eddfa6b2a72cc2bdc23c49510136616808703a353b36565570b09447504;
  bird.glb 29,451,772 bytes, SHA-256
  13491a46ebaa407e3cd6bdb183b7edc63c51ed38a868f6c4787e3ff2978685.
  Publisher manifest: 799,999 triangles, 4096 textures,
  dimensions 0.053 x 0.140 x 0.096 m, created 2026-09-28,
  AI-assisted origin (Meshy), disclosed by the publisher.
- Preserved unmodified at
  `twistor-lab/projects/our-lgcy/tw1076-grab3d-source/bird/`.

## Conversion (tools/fauna/build_bird_rig.py --species jay)

1. Decimate + weld: 65,695 triangles / 32,768 vertices.
2. Region repaint: each face's anatomical region (beak, face,
   crown, necklace, breast, belly, wing, back, rump, tail,
   legs) is rasterized into UV space, the masks feathered, and
   per-region transforms composite over the base color, each
   transform driven by the texel's own luminance so the feather
   shading survives: crown/back/wings/tail to jay blue, face and
   underparts to white, a black necklace band at the throat,
   beak and legs darkened. Two failures on the way are part of
   the record: v1 painted every region onto the mirrored body
   part (a UV row-origin flip, kept in this folder's history),
   and the rump needed its own region in v3.
3. Crest: the crown is raised 5.9 mm at most, up and back with
   a smooth falloff: a suggestion of the jay's crest, not a
   sculpted crest. Stated plainly for the gate.

## How close to the reference it reads

At inspection framing (rig/paint-side.png) the bird reads as a
blue-and-white songbird with a black necklace and a hint of a
crest: the jay's pattern, on a robin's rounder body. A real
blue jay is sleeker, longer-tailed, and properly crested; at
page framing (jay-final-size.png, about 60 px) the pattern is
what carries, and it reads as the blue jay of the founder's
reference composition: blue above, white below, perched on a
branch in warm oak light.

One tuning note, recorded because it cost a capture cycle: the
blue is mixed hot on purpose. The composed scene's light is
golden-hour warm (sun 0xffc98a, hemi 0xe6d3a7), and the first
composed capture showed a true-color blue multiplying out to
warm gray-brown, the bird's identity lost entirely (the failed
crop is superseded in this folder). The shipped conversion
raises the blue's strength and gain until it survives the
scene light; under the rig's neutral inspection light it
therefore reads bluer than life. The blend law is judged in
the composed page, and that is where this conversion is true.

## Rig, clips, motion note

- 11 bones (body chain, head, folded wings, legs, 2-bone tail),
  distance-gated skinning, 0 unweighted vertices.
- Clips (24 fps, baked): Jay_Idle 12 s (breathing, tail flicks
  on the songbird pattern, two head tilts), Jay_Look 4.5 s
  (head turn with the curious tilt), Jay_Peck 5 s (two dips to
  the perch, tail counterbalancing up).
- What never moves: feet and perch placement, wing fold (no
  flight, ever), body position. The jay stays on the fork.
- Shipped GLB: gl/animals/jay-rigged.glb, 5,265,944 bytes,
  65,695 triangles, 3 clips; inventory in rig/verify.json;
  posed deformation proof in rig/verify-*.png, rendered from
  the shipped binary.

## Blend proof

Same terms as the squirrel's pack: shared scene light, a perch
on the rising fork with moss, the section's feathered mask.
Stills: jay-final-size.png (native-pixel crop in the composed
page), jay-look-composed.png (posed in the composed page), and
the shared composed-1152.png / composed-390.png in
qa/tw1076-squirrel/.

Prepared by Twistor Holdings LLC
