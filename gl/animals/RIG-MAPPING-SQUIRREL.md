# Squirrel rig mapping (TW-1076)

The squirrel's rig lives in `squirrel-rigged.glb` beside this
file; it was authored by `tools/fauna/build_squirrel_rig.py`.
This page is the map a future editor needs before touching the
clips. Measured data: `qa/tw1076-squirrel/rig/probe.json` (what
each bone's local axes actually do) and
`qa/tw1076-squirrel/rig/verify.json` (the shipped inventory).

## Bones (27)

Body chain: root, pelvis, spine, chest, neck, head, jaw.
Ears: ear_L, ear_R. Arms: upperarm/forearm/paw, L and R. Legs:
thigh/shin/foot, L and R. Tail: tail_1 through tail_5, base to
tip. Plus: acorn (the authored acorn meshes are weighted to it
rigidly; it hangs off the chest so the nut rides the body's
motion while the paws keep their own hold).

## Skinning

Distance-gated segment softmax, the pattern the bird and owl
rigs reuse: anatomical gates first (tail bones only behind the
body line, ears same-side and near, arms and legs near their
own segments), softmax over segment distance, grid-hash spatial
smoothing, a post-smoothing re-gate, empty-vertex fallback to
the nearest body bone, cap of 4 influences. Shipped result: 0
unweighted vertices, 2,759 weak vertices (max weight under
0.45), 146,290 triangles.

## Motion conventions (from probe.json, +14 deg local rotations)

- head.X+ nods the head down; neck.X+ pitches it down harder.
- head.Z+ turns the nose toward the animal's right (-X).
- tail_1.X+ pitches the plume forward; tail_3.X+ curls the tip
  forward and down; tail_3.Z+ sways the tip sideways.
- ear_L.X+ flicks the ear forward and down.
- chest.X+ and spine.X+ pitch the whole front down.
- jaw.X+ drops the jaw (the nibble's chew).
- upperarm_R.X+ lowers the paw (the arms otherwise stay in the
  source pose's acorn hold; lifting them is what tore the v1
  skin, see the evidence pack).

## Clips (24 fps, baked, LINEAR)

- Squirrel_Idle, 16 s, loops: breathing, tail sway at the
  measured 0.93 s pendulum period, a statue-still freeze at
  6.0-9.5 s, an ear twitch, a closing head micro-turn.
- Squirrel_Nibble, 7 s: the head dips to the acorn in the
  source pose's own hold; jaw works at chew rate.
- Squirrel_Look, 5 s: a fast head snap to the side, hold,
  release, tail flick on the way back.

Prepared by Twistor Holdings LLC
