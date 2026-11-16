# TW-1077 Community tab: evidence

Build: branch `sofia/tw-1077-community-tab` from origin/main
1436f92, worktree `~/workspace/repos/ourlgcy-demo-tw1077`.
New files: `community.html`, `village.js`, `villagers-data.js`,
`qa/tw1077/`.
Touched: `index.html` (one nav link), `styles.css` (one appended
Community section, lines 965+). Nothing else.
Sequencing flag: origin/main advanced while this ran (TW-1153
and TW-1152 merged on founder words; main is now ce5e15b). This
branch is not rebased; merges sequence through Marcus. The
likely touch point is the styles.css tail, where both branches
appended sections.

## What landed

- A Community tab in the demo nav (home nav link plus the page's
  own chrome), its own page in the demo's existing static
  architecture, sub-page chrome shared with person.html.
- The ink village as a living world: 14 ink ancestors roam a
  waypoint graph between five dwellings (log cabin, church,
  farmhouse, store, brick house), the well, the market stall, the
  garden, the bench, and the oak shade. They walk with
  distance-tied stride (no foot skating), pause, pair up and chat
  with nods and hat tips, step inside dwellings and come back
  out, and follow the visitor's clock: dawn, morning, midday,
  afternoon, dusk (lamps lit), night (moon up, most everyone
  home, the three youngest keep the road).
- Rounds and roads (founder expansion, Nov 16 15:15 MST): each
  villager walks a named round, their ordinary day; four waypoint
  signs in the scene name the rounds; pointing at a villager
  lights their round in gold; the road carries era transport in
  rotation: horse and buggy, an early motorcar of the Model T
  years, a 1970s sedan, a generic modern sport utility shape.
  All unbranded: no badges, names, or logos.
- Click to profile: one tap on any villager (or roster entry)
  lights their round for a breath (0.7 s) and goes straight to
  the profile page, person.html. No menus, no intermediate card.
- Era law: dress, hats, props, and transport decades are drawn
  only from documented sample birth years (adult era = birth
  year + 25). See ROSTER.md for the per-figure mapping.
- Data-driven roster (founder note, Nov 16, for TW-1155): the
  village layer reads its people from `villagers-data.js` and
  holds no names or years in code. Statuses ride on every fact:
  a probable or lead year renders the figure era-neutral and is
  labeled, never settled. The harness proves it by flipping one
  record to probable at the data layer only (route-intercepted
  data file, zero code change) and asserting the neutral kit,
  the probable status attribute, and the probable roster label;
  the unmutated run asserts the same villager in his hoodie.
- Fail-closed floors, mirrored from gl/buck.js: the drawn scene,
  the roster, and the profile links stand with the layer off,
  torn down, or never loaded; reduced motion gets a composed
  still village with all 14 villagers placed and all four era
  vehicles parked; a frame governor thins the village (tier B)
  or freezes it (tier C) rather than jank; the loop pauses
  offscreen and in background tabs.

## Captures (qa/tw1077/, harness capture.py, all assertions green)

- community-desktop.png: full page at 1440x900, phase held at
  midday with the documented ?village= override.
- stage-desktop.png: the stage at midday, villagers dispersed on
  their rounds.
- stage-traffic.png: afternoon, the buggy mid-crossing.
- stage-route.png: Amos's round lit in gold on hover.
- stage-dusk.png: dusk tint, 12 windows lit (asserted in code).
- stage-night.png: night; visibleWalkers asserted = 3, the
  night keepers.
- community-still.png: reduced-motion still village, 4 parked
  vehicles asserted.
- community-mobile.png: 390x844; the stage crops its viewBox
  (asserted "90 10 1020 655") and the roster stacks.
- motion-community.mp4: 16 s at 1280x800, midday with traffic;
  villagers roaming, chatting, and the buggy crossing.
- Click-through asserted end to end: a real pointer click on
  Xavier's figure lands on person.html. Home nav asserted to
  carry the Community link.

State probes from the harness (window.__lgcyVillage): mode roam,
tier A, 14 walkers in every roaming pass; the governor's tier B
appeared once under video-recording load in an earlier run and
recovered to A in the final run.

## Sandbox disclosures (honest limits)

- Captures run in headless Chromium on this sandbox. The
  sandbox clock runs on UTC, so the unforced page read night
  during capture (probe recorded in the harness output); day
  shots use the ?village= phase override, the same QA pattern
  as ?gl=force-a on the home page. On a visitor's machine the
  phase follows their local clock with no override.
- The hover shot fires a synthetic mouseenter because roaming
  figures never hold still for a synthetic pointer; the handler
  exercised is the page's own.
- Motion is proven by the recording plus the code path (rAF
  loop, distance-tied stride phase); a GPU host would not
  change this layer, it is SVG and DOM, no WebGL.
- The only console error in any pass is the demo's pre-existing
  /favicon.ico 404, present on index.html before this change.

## Gates

- node --check village.js: clean.
- capture.py: ruff check clean, ruff format clean.
- Impeccable detector run on community.html, village.js,
  styles.css: 17 findings, triaged:
  - Fixed: wide-tracking 0.06em on the waypoint sub-label, now
    0.04em.
  - Verified false positives (9 low-contrast repeats): the
    detector scores SVG sign text against the stage background;
    the actual pairings are cream on pine boards (about 11:1)
    and ink on the paper store sign (about 15:1).
  - Kept on purpose, shared demo system: cream paper palette
    (locked brand token across the demo), the eyebrow kicker
    (identical on person.html and every sub-page), cramped
    padding on the stage (a full-bleed scene frame, the SVG is
    the content), side-tab nav border, the oxblood hover on
    pine, the html overflow rule, and styles.css line 361
    (pre-existing shared rule, outside this diff).
- Unslop pass over the new surface: flat color only, no
  gradients, no glows, no emoji, no decorative stripes; spacing
  on an 8/10/12/18 rhythm; copy is plain and short.
- Zero em-dashes in all new copy and comments (grep verified).

## Staged for the next slice (not in this build)

- Per-ancestor profile pages: the demo has one profile page
  (person.html, Solomon Reed), so every villager's tap lands
  there for now, per the founder's "the demo's person page".
  Distinct profiles per ancestor are a content slice of their
  own.
- Stop-by-stop route narration (a route that plays as one
  ancestor's day with named stops and years appearing as they
  travel): the rounds, signs, and highlight are the foundation
  laid here.
- The other sub-pages' navs (person, case, upload, reference)
  still list the original five entries; adding Community there
  is a one-line change per page, held out of this diff by the
  scope rule (new tab plus one nav link).

Prepared by Twistor Holdings LLC
