# TW-1241 notes: click routing + era transport in daily life

Prepared by Twistor Holdings LLC

## Bug 1: every figure click opened Emma Jean's card

Root cause, plainly: the world's click handler found the right
figure and then threw its identity away. On a click, `world.js`
hit-tested the tap against the figures and confirmed one was
within 36 world units, but the navigation it performed was to
the constant string `person.html`, with no person id attached.
`person.html` is a single static page authored entirely for
Emma Jean Jackson (the demo's one full profile, "A Life, Told
Fully"). So every figure, moving or dwelling, landed on Emma
Jean's card. The founder hit it on moving ancestors because
those are the ones you chase across the map; a tap on a
dwelling Emma Jean coincidentally lands on her own card, which
is why the defect hid behind the one figure it looked correct
for. A secondary defect in the same handler: it returned the
FIRST figure in roster order within range, not the nearest.

The fix:

- The click handler now picks the nearest active figure within
  42 world units and navigates to `person.html?id=<their id>`.
- A new `person.js` renders the requested person's card from
  the same cited lineage pack the world is built from
  (`data/lineage-phase1.json`): name, line, born and died with
  their evidence status, a kept age only when both dates are
  Documented, their facts as a timeline with status chips
  (Documented reads "record", Probable "family", Lead "lead"),
  conflicts and gaps shown as open questions with the record
  that would settle each, and kin links (father, mother,
  spouse, children) at the END of the card per the founder's
  card law. Emma Jean's authored page stands untouched for her
  id and for no id. Living people get a privacy notice (name
  only, no facts, matching how the pack masks them). An unknown
  id gets a "not in this preview" notice, and a failed data
  load gets an honest "profile unavailable" notice. No path
  renders the wrong person.
- The community page's roster buttons carried the same defect
  (all ten linked to bare `person.html`); they now link to
  `person.html?id=<slug>`.

Proof (`qa/tw1241/capture.py`, `results.json`): real mouse
clicks on five figures proven mid-motion by two position
snapshots 0.35s apart, each landing on that person's own card
(URL and rendered heading checked): Troy Wright, Oddie Lee
Criner Gooden, Curtis Franklin Hammond, Melvin Andrew Gooden
(all in `walk`), and Dora Weathers in `walkFromRig` (stepping
down from her buggy). A dwelling Emma Jean Jackson re-verified
on her own card, and the roster link for Troy Wright clicked
through to his card. Zero page errors across the whole run.

## Bug 2: era transport in daily life

Who rides: two ancestors carry `present.transport: "buggy"` in
`world-data.js`, James J Hammond (b. 1865, young adulthood in
the 1890s) and Dora Weathers (b. 1895, young adulthood in the
1910s, rural Bristow, 8.5 miles out on HWY 48). The header
comment in that file says the basis plainly: transport is a
presentation field, both birth years are Probable in the pack,
and nothing is asserted on anyone's card. Everyone else's
rounds stay on foot, as before.

How a round works now: a buggy ancestor walks from their
dwelling to their rig parked at the nearest street point, the
rig (horse, carriage, the ancestor seated in era dress) rolls
along the road network at 58 px/s through the street chain and
junctions to the destination's street, and the ancestor steps
down and walks the last stretch to the dwelling spot. Dwell
times, destinations, and the whole daily rhythm are unchanged;
only the road legs changed vehicle. Saturday is unified with
the same rigs: on a Saturday load the two ancestors ride in
from home and park at the same two gate spots the old static
drawing used, then walk to their Saturday spots, so there is
exactly one rig per ancestor and no double count (the two
static `drawBuggy` calls in the Saturday renderer are gone).

The filling station: the overhead world had no filling station
(it existed only in the legacy side-view village), so one was
added on the north side of the east-west road, west of the
crossroads: concrete pad, red station building, a pump island
with two pumps, and a GAS roadside sign; building and pumps are
blocked in the walkability grid and the pad shows on the
minimap. When a buggy leg's road segment passes the station,
the cooldown has elapsed (15 to 40 seconds after load, then
150 seconds between stops), and the lot is not reserved by the
other rig, the route detours into the lot, pauses 4.6 seconds
beside the pumps, and the driver speaks one of the era-quirk
lines carried over from the old village script ("What is
that?", "It runs with no horse at all?", "They feed it from a
pump?", "Well, I never in my days.", "Is it safe to stand
near?"). The beat fires through the same single speech bubble
element, under the same duplicate guard, as greetings; while a
quirk line is up, greetings hold off, and greetings never fire
for a figure who is walking to, riding in, or stepping down
from a rig (speech law intact).

Era vehicles beyond the buggies, stated honestly:

- Moving: the ambient modern car loop is unchanged. A second
  ambient vehicle, a Model T, now loops the same road circuit
  at its own speed, so the oldest motor era moves in daily
  life too.
- Parked: a Model T stands by the church path and a fifties
  two-tone sedan stands at the store, both blocked in the grid
  so nobody walks through them.
- Not simulated: ancestors whose eras are the automobile's do
  not personally drive; their rounds stay on foot and their era
  shows in the parked and ambient vehicles around them.
  Personal era driving for later-era ancestors is future work,
  not claimed here.

Proof shots: `buggy-mid-round.png` (James J Hammond's rig
rolling on the east-west road, station and GAS sign in frame),
`buggy-station-stop.png` (the rig paused at the pumps with the
bubble up: "It runs with no horse at all?"), and
`saturday-gates.png` (both rigs parked in the gate crowd at
street scale, exactly two). The harness asserted the station
speaker by name and the line against the quirk set, and both
Saturday rigs parked with stop "gate". Zero page errors.
Agent-eyes strict is clean at 1440 and 390 (`agent-eyes.txt`).

Honest limits:

- The driver sprite stands in the carriage in the world's
  front-facing sprite language rather than a seated pose; the
  rig, horse, and driver read as one unit at game zoom.
- Saturday rigs now arrive by riding in after load instead of
  being pre-parked at the first frame; on a slow connection
  there is a short window where the gates are rig-free while
  the ancestors ride over.
- Station stops are opportunistic (cooldown and lot
  reservation), so a given round may pass the station without
  stopping; over a few rounds both drivers stop regularly.
