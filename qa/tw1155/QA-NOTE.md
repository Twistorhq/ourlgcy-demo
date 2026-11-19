# TW-1155 QA note: lineage data pack wired into the demo

Branch `sofia/tw-1155-lineage-wiring` from main `ce5e15b`. The demo's
fictional sample people are replaced by the public layer of the
Rosa-verified lineage pack across the tree, the journey, the branch
panels, and the person page. Nothing merges in this pass.

## What carries the data

- `data/lineage-phase1.json`: the pack's public layer vendored into
  the repo (19 people, 110 public facts). The pack's fenced `private`
  section was stripped by script at vendoring time and never entered
  this repo.
- `tools/build_journey.py` now reads that file for names, years,
  initials, and relationship counts, and generates the journey
  fragment in `index.html` between the JOURNEY markers. Special card
  metas (masked living people, undated people, the index's "about"
  years) are a small override table in the generator, each traceable
  to a pack fact.
- `tools/build_lineage.py` generates the branch panel data in
  `app.js` between the LINEAGE-PANEL markers: every public fact of
  each line's people as a cited row (status and source carried), plus
  every pack conflict as an open-question row with its decider named.
  Counts: family 110, hammond 32, jackson 28, gooden 21, criner 24.
- `person.html` is Emma Jean Jackson's page, hand-built from her pack
  facts only, in the page's existing components. Her father's slot
  renders both candidates with statuses and deciders; no layout
  choice resolves it.
- Follow-my-line lights the root person's 16 direct ancestors exactly
  as the pack links them. Neither father candidate lights: the
  contested slot stays dark, which is the truthful render.

## Captures (this folder)

Before = `git archive` of main `ce5e15b`, served locally; after =
this worktree. Tree shots are framed on the 1930s generation;
person shots on the page head.

- before-tree-desktop.png / after-tree-desktop.png (1440x900)
- before-person-desktop.png / after-person-desktop.png (1440x900)
- before-tree-mobile.png / after-tree-mobile.png (390x844)
- before-person-mobile.png / after-person-mobile.png (390x844)

## Privacy proof

A whole-word grep for each of the three fenced private years over
the wired files (index.html, app.js, person.html,
data/lineage-phase1.json, tools/build_journey.py,
tools/build_lineage.py, README.md) returns no matches: none of the
three fenced private years appears anywhere in the wired surface.
(The years themselves are deliberately not repeated in this note, so
the grep proof stays clean when re-run over this folder.)
Living people render masked: Ava's and Joseph's cards read "Living ·
held private", Justynn's card names his role, and no living person
carries a date fact anywhere in the pack's public layer, so no
surface needed one to render.

## Interaction proof (headless Chromium, local serve)

- Jackson panel opened from Dora Weathers' card: title "Jackson
  line", count line "28 cited facts in the phase 1 pack for this
  branch.", 31 rows (28 facts + 3 open questions: Emma's father with
  both candidates shown, Emma's birth year, Dora's birth year).
- Follow-my-line: exactly the 16 direct ancestors take the in-line
  class; Troy Wright and Chester Jackson both stay unlit; the scroll
  target `p-justynn-hammond` resolves. Zero page errors.

## Spot list: five rendered facts traced to pack citations

1. Tree card "Curtis Franklin Hammond, b. 1933" traces to pack fact
   birth_date "January 19, 1933", Documented, source tw-1151 (the
   Floral Haven memorial reading captured in TW-1151). The rival
   1934 seed-tree reading rides in the Hammond panel as an open
   question; the card shows the pack's primary reading.
2. Tree card "Emma Jean Jackson, b. 1936" with the View story link
   traces to pack fact birth_year 1936, Probable, source seed-tree.
3. Person page, 1940 timeline entry: "Ema Jean Jackson" counted in
   Chester J Jackson's Newby household traces to pack facts
   name_as_indexed_1940 and residence_1940, Documented, source
   tw-1151, including the Euchee merge guard carried in the copy.
4. Person page, "What the record does not say": father candidates
   Troy Wright (Probable) and Chester Jackson (Probable) trace to
   pack father_candidates on emma-jean-jackson with father_id null,
   and to the pack conflict on her father field with its SS-5
   deciders.
5. Gooden panel row "Melvin · Born: January 15, 1932, Documented,
   Family record" traces to pack fact birth_date on
   melvin-andrew-gooden, Documented, source
   people/melvin-andrew-gooden.md.

## Gates run by hand

- Impeccable 15-tell audit (manual; the CLI does not run in this
  sandbox, same as TW-1153): no new tells. All new surfaces reuse the
  demo's existing components (cards, clusters, chips, panels,
  timeline, tables). The one new style, the amber Lead chip, follows
  the existing chip pattern. No gradients, glows, emoji labels, or
  hype copy introduced.
- Unslop pass: copy is factual and status-plain throughout; a grep
  for em-dashes over every touched file returns no matches.
- Generators are ruff check and ruff format clean; `node --check`
  passes on app.js; regeneration is deterministic (both generators
  re-run after formatting with identical output).

## Notes for the gate and the founder

- Masked renderings: no surface needed a living person's date. The
  parents generation renders on names and roles alone (Ava: "Living
  · held private"; Joseph: same; Ronald Gooden: "Dates not yet on
  file", which is a records gap, not a mask).
- Community roster: `villagers-data.js` lives on the TW-1077 branch
  and was not touched. This wiring keeps people data in data files
  (the vendored pack JSON plus the two generators), so when TW-1077
  rebases over this merge, the village roster swap is a data file
  change only: point the roster at the pack's public layer, with the
  era law intact (masked and year-less people stay off the roster
  until a year is documented).
- family.html (the TW-1153 landing page) was out of scope and is
  untouched; its footer fine print still carries the old
  fictional-sample line, which is now stale and should ride the next
  family.html change.
- case.html, reference.html, and upload.html remain sample surfaces
  (the Solomon Reed case and the mocks); only their shared footer
  paragraph was harmonized so the site no longer claims to be
  fictional everywhere, and each footer now states those surfaces
  still carry sample material.
- The buck, the fauna layer, and the intake wiring are untouched.

Prepared by Twistor Holdings LLC
