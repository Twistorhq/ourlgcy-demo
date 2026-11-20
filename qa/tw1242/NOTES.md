# TW-1242 proof notes: houses, parks, river, mountains

Prepared by Twistor Holdings LLC

Branch `sofia/tw-1242-houses-parks` (worktree
`ourlgcy-demo-tw1242`), stacked on the tip of
`sofia/tw-1241-fixes` (88584be) so TW-1241 merges first and
this follows without conflicts. Five commits: terrain,
houses, parks, the west-foothill recolor, and this proof.

## What was built

**Houses.** Six background homes complete the street grid
on both sides: h7, h8, h9 finish the south row facing the
plaza (the row now runs seven houses across), h10 stands
by the church, and h11, h12 face the plaza from the north
strip east of the park. Footprints vary (210-240 wide,
150-170 deep), roofs stay in the sampled cream and tan
family, and `drawHouse` gained ridge orientations (an
east-west ridge by default, a north-south ridge, a hip
roof's inset fall), picket fences with a gate gap at the
walkway (h7, h9), and per-house chimney placement. Yards,
porches, walkways, bushes, and night porch glow come from
the existing house language, so the new homes light up at
night with the rest.

Destinations vs decoration, plainly: h1-h6 are the roster
families' homes and stay destinations (their doors are
where rounds begin and end, from the data). h7-h12 are
decoration: no roster, no rounds, nobody lives there in
the record. They complete the streets, nothing more is
claimed for them.

**Parks.** Two parks, because the map wanted one on each
side. The main park (1700-2600 by 1250-1510) sits east of
the store above the plaza: kept striped grass, dirt paths,
a swing set, a slide, a merry-go-round, a sandbox with
buckets, two picnic tables, benches, shade trees, flower
beds, and two lamp posts. The west park (80-540 by
640-870) is a smaller green by the church with swings, a
slide, a sandbox, benches, and a lamp; the church's dirt
path runs through it. Swings sway and the merry-go-round
turns in the dynamic layer (slow, ambient, in the motion
law's spirit); the rest is static furniture. All equipment
is blocked in the grid: swings and their arcs, slides,
sandbox, merry-go-round, picnic tables. Both parks are
destinations: `park` and `parkW` joined the rounds of six
relatives (Oddie, Melvin, Emma Jean, Troy, and Andrew to
the main park; Willie to the west park), and the harness
sent Oddie and Willie to theirs and watched them arrive
and dwell on the exact place points.

**River (founder addendum).** A real watercourse crosses
the south of the world, east to west on a gentle meander
(centerline y = 2230 + 24 sin(x/460 + 0.6), water 80 wide):
sand banks, a dirt walking path along both banks, a deep
center, and light streaks drifting downstream in the
dynamic layer, clipped to the water. Where the
north-south road meets it, a wooden bridge carries the
road: plank deck, edge beams, posts. Pathing respects
the water absolutely: the grid blocks every water tile
except the bridge columns, and the harness proved it with
positions, not impressions (below). The strip south of
the river is a meadow reachable only over the bridge;
`bank` is a destination there, in Willie's rounds and
reachable by any walker.

**Mountains (founder addendum).** Layered ridges frame
the horizon: across the north edge, a far blue-gray ridge
with snow caps on its tallest peaks only, a mid ridge,
and green foothills rolling to the land (the stadium
stands against them); down the west edge the same country
runs lower as foothills to the east-west road. Backdrop
only: the band is blocked in the grid, nobody walks
there, and the north-south road cuts through as a pass.
One self-correction during the pass: the west strip first
wore the far ridge's blue-gray and read as a second
river; it now wears sage and olive, and the re-shot
west-park framing shows land, not water.

## Proof (this folder)

Harness `capture.py` (ruff clean), results in
`results.json`, exit 0, zero page errors on every page:

- **Bridge discipline, measured.** The player walked from
  the plaza to the south bank: arrived; of 42 sampled
  positions, the 3 inside the true water band all sit on
  the bridge span. Willie walked to the bank on her own
  pathing: arrived and dwelled at (760, 2348); her 9
  in-water samples all sit at x 860-862, on the bridge.
  Her other shore-band samples are on the bank paths,
  which is the bank walking the addendum asked for. (The
  harness's first draft asserted over a wider shore band
  and flagged those bank samples; the assertion now tests
  the band the grid actually blocks, and a diagnostic run
  confirmed the distinction sample by sample.)
- **Parks reached.** Oddie arrived and dwelled at the
  main park place (2050, 1451); Willie at the west park
  place (300, 820). Night keeps exactly 3 relatives out,
  the standing keeper rule, with the parks lit.
- **Playground motion.** Two stage shots 0.9s apart at
  the main park differ (swings mid-sway); the closeup
  catches Troy Wright, plate in hand, greeting the visitor
  at the park place: "Good to see you!"
- **Framings.** `wide-neighborhood.png` (the filled south
  row, the park, the river and bridge, minimap showing
  parks, river, and horizon), `park-closeup.png` (max
  zoom, playground in use), `west-park.png`,
  `river-bridge.png`, `mountains-horizon.png` (snow-capped
  far ridge over the foothills), `night-park.png` (park
  lamps glowing), `mobile-390.png`.
- **Agent-eyes strict clean** at 1440 and 390
  (`agent-eyes.txt`): no shrink, snap, flicker, or detour
  on the canvas; no page, console, or server errors; no
  horizontal scroll.

## Honest limits

- TW-1237's N5 straight-line fallback is untouched, as
  scoped. Every new area is reachable by real A-star
  routes (the harness arrivals are the evidence); no new
  destination relies on the fallback.
- The mountains are flat-shaded procedural ridges, as the
  whole world is procedural papercraft; they frame the
  land at horizon distance and do not pretend to the
  references' hand-painted detail. At the very top of the
  north view a thin strip of out-of-world background can
  show past the tallest peaks: that is the camera's
  standing 60px overshoot, pre-existing behavior, not new
  in this pass.
- The merry-go-round turns empty and the swings sway
  unoccupied: ambient life, not riders. The roster holds
  no children (the pack's people are the ancestors), and
  inventing child figures would break the record law the
  world is built on; relatives stroll, sit, and greet in
  the parks instead.
- Park dwell points are single spots, as the plaza places
  are; two relatives sent to the same park at the same
  moment will stand close. Spreading dwellers across
  benches is a build-out refinement, not claimed here.
