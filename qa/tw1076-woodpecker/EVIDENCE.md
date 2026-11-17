# TW-1076 evidence pack: red-headed woodpecker slot

**What this animal actually is:** a European robin (Erithacus
rubecula) sculpt, Grab3D "bird", CC0 1.0, converted toward the
red-headed woodpecker's markings and staged clinging vertically
on the trunk. It is credited that way everywhere it appears.
No clean-license woodpecker model exists on any ungated source
swept (see `qa/tw1076-sourcing/SOURCING.md`: Grab3D has none,
Sketchfab's are CC BY and account-gated, Poly Pizza's are
low-poly); under the founder's 2026-11-16 mandate the slot
ships the best available songbird converted, not an empty
trunk.

## Source and license

Identical source to the jay slot (one sculpt, two conversions):
Grab3D "bird", https://grab3d.com/dl/bird/, retrieved
2026-11-16, CC0 1.0. License and manifest at
`gl/animals/LICENSE-grab3d-bird.txt` (SHA-256
a15412842aa03ed7746551767e80808a9303edbbca02a06cfbcf354dfbd0ad27)
and `gl/animals/manifest-grab3d-bird.json` (SHA-256
c415388a96fef1bc8d2caec32db0d2b4486fd79359d462558ff208bd83ce26bc);
downloads byte-exact (bird.blend SHA-256
f9de3eddfa6b2a72cc2bdc23c49510136616808703a353b36565570b09447504,
bird.glb SHA-256
13491a46ebaa407e3cd6bdb183b7edc63c51ed38a868f6c4787e3ff2978685);
preserved unmodified at
`twistor-lab/projects/our-lgcy/tw1076-grab3d-source/bird/`.

## Conversion (tools/fauna/build_bird_rig.py --species woodpecker)

1. Decimate + weld: 65,695 triangles / 32,768 vertices.
2. Region repaint (same UV-region machinery as the jay): head
   and neck to crimson, breast and belly to white, back, wings
   and tail to black with the white wing patch and white rump
   kept, beak lightened to ivory, legs grayed. One recorded
   fix: v1 let the crimson run down the whole chest; the band
   below the neck is white in v2, as the reference shows.
3. The cling is staging, not geometry: the group is pitched
   against the trunk in the scene, tail braced low, the way
   the founder's reference bird sits on the bark.

## How close to the reference it reads

At inspection framing (rig/paint-side.png) the pattern is the
reference's: an all-crimson head, black back, white underparts,
black tail, pale bill. Two honest gaps: the crimson field runs
slightly deep on the chest because the donor robin's breast is
deep, and the body is a songbird's, rounder than a
woodpecker's, with a songbird's bill rather than a chisel. The
vertical cling on the trunk and the peck bursts carry the
woodpecker read at page framing (woodpecker-final-size.png).

## Rig, clips, motion note

- Same 11-bone bird rig as the jay slot, 0 unweighted
  vertices; the pecking lives in the head and neck bones.
- Clips (24 fps, baked): Woodpecker_Idle 12 s (near-still, one
  slow head turn, woodpeckers sit long and watch),
  Woodpecker_Peck 6 s (two bursts of four fast head jabs, the
  body absorbing the counter-motion), Woodpecker_Look 5 s
  (the peer-around-the-trunk look, left then right).
- What never moves: the feet's grip point, the tail brace, the
  body against the trunk. No climbing, no flight.
- Shipped GLB: gl/animals/woodpecker-rigged.glb, 5,210,328
  bytes, 65,695 triangles, 3 clips; inventory in
  rig/verify.json; posed proof in rig/verify-*.png.

## Blend proof

Same terms as the other packs: shared scene light, the trunk
it clings to is the same displaced-bark trunk the squirrel's
branch grows from, contact shading at the brace. Stills:
woodpecker-final-size.png (native-pixel crop in the composed
page), woodpecker-peck-composed.png (mid-burst in the composed
page), and the shared composed-1152.png / composed-390.png in
qa/tw1076-squirrel/.

Prepared by Twistor Holdings LLC
