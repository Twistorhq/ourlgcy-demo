# TW-1076 evidence pack: owl slot

**What this animal actually is:** a great horned owl (Bubo
virginianus), Grab3D "owl", CC0 1.0, presented as itself. The
slot originally specified an eastern screech owl; no
clean-license screech owl exists on any ungated source swept
(see `qa/tw1076-sourcing/SOURCING.md`), and under the founder's
2026-11-16 mandate the slot ships the best clean-license owl
that exists, credited truthfully. No conversion is applied:
the plumage, ear tufts, and golden eyes are the sculpt's own.

## Source and license

- Grab3D "owl", https://grab3d.com/dl/owl/, retrieved
  2026-11-16. License and manifest ride with the assets at
  `gl/animals/LICENSE-grab3d-owl.txt` (CC0 1.0, SHA-256
  a15412842aa03ed7746551767e80808a9303edbbca02a06cfbcf354dfbd0ad27)
  and `gl/animals/manifest-grab3d-owl.json` (SHA-256
  ed9a70cb196a0924f4e12c45561d10880fa03515ef85dc7af02e2b2158ad2987).
- Downloads byte-exact against the publisher manifest:
  owl.blend 39,161,589 bytes, SHA-256
  5d5afb66a95aa6a119b0b630e1a8d7772e7ab7ffd631ba9932d300b9e17792eb;
  owl.glb 32,395,064 bytes, SHA-256
  74c364ee6bcb01bc5e070a360ad7869353138da3ff1f5f7c6379eebbce5716dc.
  Publisher manifest: 799,999 triangles, 4096 textures,
  dimensions 0.288 x 0.321 x 0.550 m, created 2026-09-28,
  AI-assisted origin (Meshy), disclosed by the publisher.
- Preserved unmodified at
  `twistor-lab/projects/our-lgcy/tw1076-grab3d-source/owl/`.

## Build (tools/fauna/build_owl_rig.py)

1. Decimate + weld: 128,949 triangles / 64,999 vertices; the
   barred plumage survives intact (rig/prep-tq.png against the
   source inspection renders).
2. Rig: 8 bones (body chain, head, folded wings, tail),
   distance-gated skinning, 0 unweighted vertices. The head
   turn is the owl's whole act, and it took three skin
   iterations, all in the record: a gradual weight falloff
   smeared throat plumage sideways across the chest at full
   turn; a hard weight cutoff sheared a straight streak at the
   cut; the shipped version fades head and neck weights over
   short 2 cm bands at the neck and moderates the turn to
   about 38 degrees total, which turns cleanly in
   rig/verify-turn-*.png (a faint feather slide remains at
   the jaw line at inspection framing; at page size, in the
   hollow's shade, it does not read).
3. Probe-measured axes: head local Z is the yaw, head local X
   the pitch, neck local Y yaws with the head. The first clip
   draft authored the turn on the wrong axis (a roll); the
   probe caught it before export.

## Staging and the reference

The founder's owl reference is a screech owl seated in a tree
hollow, and the composition is followed even though the bird
is a different owl: a dark cavity and bark rim are built on the
GL trunk's camera face at frame left, and the owl sits inside
the rim's ellipse, its lower body behind the rim, in the
trunk's shade. A great horned owl is a much larger bird than a
screech owl (0.55 m against 0.22 m); it is staged at 0.80 world
units tall, slightly under true scale against the buck, so it
presides from the hollow without looming.

## Motion note

- Clips (24 fps, baked): Owl_Idle 14 s (near-still; breathing,
  one slow head drift, one small bob: an owl at rest is a
  statue that occasionally remembers you), Owl_Turn 6.5 s (the
  signature head turn, up fast, held, returned), Owl_Scan
  7.5 s (a slower sweep, left then right).
- What never moves: feet, wings (folded, always), body
  position in the hollow. No flight, no hops.
- Shipped GLB: gl/animals/owl-rigged.glb, 8,634,476 bytes,
  128,949 triangles, 3 clips; inventory in rig/verify.json;
  posed proof in rig/verify-*.png, rendered from the shipped
  binary.

## Blend proof

Same terms as the other packs: shared scene light, the hollow
built from the section's own bark and moss materials, the
cavity's dark gradient doing the depth work a photograph does.
Stills: owl-final-size.png (native-pixel crop in the composed
page), owl-turn-composed.png (mid-turn in the composed page),
and the shared composed-1152.png / composed-390.png in
qa/tw1076-squirrel/.

Prepared by Twistor Holdings LLC
