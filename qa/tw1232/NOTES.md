# TW-1232 Slice 1: proof notes and honest shortfalls

Prepared by Twistor Holdings LLC

## What was proven (qa/tw1232/capture.py, results.json)

- Zero page errors and zero console errors across every proof page.
- Standing still: the player never moved while 9 of 10 relatives
  changed position in 3 seconds. The neighborhood keeps living.
- Walking: click-to-move carried the player from the plaza to the
  store door; the camera delta was (-246, -429) and the player
  arrived and stopped.
- Greetings, speaker-verified from the bubble's own record:
  Elouise Morris, "Hi Justynn! How's it going?"; Troy Wright,
  plate in hand, "Good to see you!". First greetings are
  time-aware ("Good morning, Justynn!" fired naturally in the
  Saturday tailgate frame).
- Saturday continuity: the camera followed Troy Wright from the
  plaza's east end (2400, 1660) to the tailgate spot (1940, 470);
  he arrived and dwelled. No scene cut, one continuous world.
- Night (?village=23): density drops to the 3 documented keepers;
  porch lights and street lamps come on.
- Agent-eyes (--strict, 1440 and 390): no page errors, no console
  errors, no horizontal scroll, actions ok, canvas motion clean
  (no shrink, snap, flicker, disappearance or detour). One
  layout-shift finding (caption hint, 0.007) was fixed with a
  grid caption and the re-run is clean; full output in
  agent-eyes.txt.

## Where the rendition still falls short of the references

Stated plainly, for the founder's visual check:

1. Surface richness. The references are dense, hand-painted
   pixel art: layered canopy everywhere, textured roofs, flower
   beds, dozens of individually drawn people. Slice 1 is
   procedural papercraft on canvas: the composition, layout law
   (buildings both sides, sidewalks, dotted center lines, brick
   plaza, stadium in-world), and the moment-to-moment beats
   match; the surface density does not yet. Closing this is an
   art pass over the same engine, not a rebuild.
2. Era variety is capped by the record, on purpose. Only 4 of
   the 10 records carry a documented birth year, so only they
   wear era dress (1940s hat and dress, 1950s suits); the six
   probable-year relatives stay era-neutral under the status
   law rather than being dressed from an unproven year. The
   references show a crowd dressed across a century; the real
   roster can only dress where the record allows.
3. Saturday colors. Exactly one documented college attendance
   exists so far (Elouise Morris: San Francisco State College,
   per her funeral program, TW-1231), so exactly one relative
   wears school colors, purple and gold. Everyone else gathers
   in their own dress. More colors appear by rule as research
   documents more attendance.
4. The field has yard lines but no yard numbers and no players;
   the founder said the players need not be real people, and
   the slice draws none.
5. Doors are visited, not entered: interiors are build-out
   scope for TW-1232, as is the grow-as-you-explore generator.
   The slice world is one authored district plus the stadium
   (3200x2400, about 7x the visible box at full width).
6. Canvas renders at CSS pixel resolution, so on retina
   displays the world is softer than the references' crisp
   pixels. The horse-and-buggy silhouette is simple and reads
   as a shape at wide zoom.
7. The Replica scored loop was not run; the matched-framing
   screenshots in this folder plus this list stand in for it,
   because the slice's stated gate is the founder's own visual
   match check against the two references.

## Files

- wide-plaza.png: wide overhead framing (zoom 0.62), midday.
- closeup-greeting-aunt.png / closeup-greeting-cousin.png:
  plaza-scale framings (zoom 1.9) of the two greeting beats.
- saturday-tailgate.png / saturday-stadium.png: Saturday mode.
- seq-still-a/b.png, seq-walk-a/b/c.png, seq-follow-a/b/c.png:
  the still, walk, and street-to-tailgate frame sequences.
- wide-night.png, mobile-390.png, results.json, agent-eyes.txt.
