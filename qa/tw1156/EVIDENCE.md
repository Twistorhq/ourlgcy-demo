# TW-1156 Evidence: the ink people craft pass

Prepared by Twistor Holdings LLC

Branch: sofia/tw-1156-ink-craft (off sofia/tw-1077-community-tab,
with Rosa's TW-1077 gate fix round merged in; see the accounting
at the end). Nothing in this branch merges in this run.

## What changed: the figure and animation system only

One skeleton now stands under every villager, drawn like a
professional pictogram wearing hand-drawn ink. Figures stand
about 104 units tall: legs 45, torso 32, head and neck the rest,
the head about one sixth of the whole. Era clothing silhouettes
are unchanged per ROSTER.md; they are drawn over the same
skeleton, with skirted kits getting a separate hem group that
can trail the stride.

- One stroke system everywhere: filled shapes outlined at 2.4,
  limbs as 4.8 round-capped, round-joined strokes, details at
  1.7. The old build mixed 5-wide rigid leg strokes, sliding
  shoe dashes, and 1.4 hand dots with no shared scale.
- Legs are two-bone chains (thigh 24.5, shin 24) solved every
  frame by a two-bone solver. Each foot carries a ground
  position in the world: while a foot is planted its ground
  position never changes and the body solves over it. When the
  planted foot trails too far behind, it lifts, arcs forward
  with an eased swing, and plants ahead of the body. No skating,
  no scissoring through the ground line, no locked knees (the
  bone lengths keep working slack at full stride, which the
  first capture round showed was needed).
- Arms are two-bone chains too (upper 12.5, forearm 11.5),
  swinging in counterphase to the opposite leg, driven by that
  leg's actual stride offset. The torso rides in a separate
  group from the legs, so the vertical bob (two dips per stride,
  at the plants) and the walking lean never move a planted foot.
  The head counter-rotates against the body's roll and keeps
  its own small lag, so heads ride steady.
- Walk speed eases: villagers gather speed from a standstill
  and bleed it off over the last stretch of the final leg, so
  arrivals settle instead of stopping dead. The old build moved
  at one constant speed with instant starts and stops.
- Gestures rebuilt on the same joints. A wave raises a bent
  elbow and oscillates the forearm; a hat tip solves the hand
  to the hat brim with the elbow out, plus a head bow and a
  small torso bow; a nod pitches the head at the neck. The book
  is held with both hands solved to its corners.
- Secondary motion, restrained: a carried basket hangs from
  the hand that holds it and swings a beat behind the stride;
  a cane taps the ground ahead of the step; skirt hems trail
  the stride by a beat; hat brims ride the head's counter-move.

## What did not change

The world is untouched: waypoint graph, dwellings, rounds, day
cycle, transport, click to profile, the data-driven roster, and
the fail-closed floors all behave as TW-1077 built them. The
full TW-1077 capture harness, updated by Rosa's fix round with
the 24-hour phase assertions and the roster floor probes, was
run against this branch's worktree: all assertions passed, the
only console error the pre-existing favicon 404.

## The proof pairs

- walk-strip-before.png and walk-strip-after.png: Booker Shote
  crossing the same street segment by the well at midday, five
  frames each, captured with strip_capture.py in this folder
  (fixed street-band zoom, same in both runs). Also stacked as
  walk-strip-pair.png.
- motion-before.mp4 (the TW-1077 harness clip at c7557cc) and
  motion-after.mp4 (the same harness against this branch):
  the village at midday.
- community-desktop.png, community-mobile.png, village-stage.png:
  the new figures at founder screenshot sizes.

Frame by frame, the before strip: legs are single rigid sticks
rotating at the hip, crossing in an X at mid-stride (frame 3),
arms hang as straight sticks, shoes slide. The after strip:
frame 1 lands a bent front knee with the back foot at toe-off;
frames 2 and 5 are passing poses with knees flexed and feet
close; frame 4 is full extension with both feet planted flat
and the arms swung against the legs. Feet stay on the ground
line in every frame.

## Gate results

- Impeccable detector over the worktree: 46 anti-patterns,
  identical count and set to the parent commit c7557cc. This
  pass introduces zero new findings. The community.html items
  (a side-tab border and repeated low-contrast notes on page
  furniture) predate this pass, belong to the page layer rather
  than the figure system, and ride with Rosa's TW-1077 gate.
- Figure audit (the manual pass over the figures themselves):
  stroke weights verified uniform across all 12 kits from the
  generated markup; proportions hold at 3x zoom in the strips;
  every kit renders planted feet in the stage still, including
  the two covered kits (ankle and shoe stepping out from under
  the hem) and the two bare-leg kits (paper leg with an ink
  under-stroke, no more floating shoe dashes).
- Unslop pass on the figure set: the tells found and fixed in
  the first capture round were locked-straight knees at full
  stride (bone lengths lengthened for working slack), an
  ankle stub that crossed under long skirts (re-anchored toward
  the foot), and shoe dashes (replaced with a filled shoe
  silhouette that pitches with the swing). No gradients, glows,
  or decorative animation were added; the motion is the gait
  itself.

## Rosa's TW-1077 notes: what touched this pass

Rosa's gate on TW-1077 returned REQUEST CHANGES with two
blockers: hours 0 to 4 rendering as morning, and the roster
floor being JS-only instead of static. Her fix round (e375ad1)
landed on the parent branch and is merged into this branch
(merge 3f0b0ba) before this evidence was captured, so every
frame here runs against the corrected world. Neither blocker
touched the figure system: the clock fix lives in the phase
mapping, the roster fix in community.html and the roster
build. Her remaining TW-1077 notes (tier wording, the ROSTER.md
hat alignment) are parent-branch items, already handled in her
fix round. Her merge ruling stands: after her spot check,
PR #2 merges onto current main without a rebase; this craft
pass then follows as its own gated change.

## Honest limits

- Tap gestures: a tapped villager gestures for a breath before
  the profile navigation lands at 700 ms by design, and the
  gesture peak sits inside that same window, so no clean
  peak still was captured. The gestures run on the same arm
  solver the strips prove, and chat pairs gesture continuously
  in motion-after.mp4.
- The harness motion recording runs in the sandbox's throttled
  context (still mode, tier C), the same caveat the TW-1077
  captures carry; the strip captures run live at tier A.
