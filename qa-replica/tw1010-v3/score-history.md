# Replica evidence: TW-1010 home v3 vs the reference photo

Prepared by Twistor Holdings LLC

Reference: Justynn's LINEAGE concept photo (founder's personal file,
kept in the private project folder at
`twistor-lab/projects/our-lgcy/assets/design-reference-2026-11-07.jpg`;
not republished in this public repo). Level: **structure** (same
layout and feel, our content), per Direction v3: the photo is the
content and feel reference; v3's scroll experience outranks photo
furniture where they conflict.

## Tooling note (read first)

`replica capture` ran clean (doctor: browser 156, ffmpeg present) and
produced the reference shot. `replica compare` captured the clone
(shot, blueprint, contact sheets all written) and then crashed in its
report step: `Cannot read properties of null (reading 'toFixed')`.
Root cause, verified in the vendored source: `lib/match.mjs` returns
`score: null` for an axis when the reference has no matchable DOM
nodes (an image reference has none), and `lib/report.mjs` calls
`.toFixed` on it. The tool cannot score a photograph reference. The
scores below are therefore the strongest manual equivalent: the same
four axes, scored by element count and screenshot inspection against
the reference photo and, for motion, against the v3 spec (the photo
carries no motion information). Labeled manual throughout; no tool
score is claimed.

## Round 1: as built (after Impeccable and unslop fixes)

Evidence: `before-fullpage.jpg` (the compare run's own clone capture,
1122x900, full page).

| axis | score | basis |
|---|---|---|
| layout | 78 | Header, headline, rail, root, descending cards, focus card, pill all placed. Missing: founding couple invisible in capture (reveal timing), fan wraps 3+1 at 1122px, critters overlap cards. |
| style | 82 | Oak, cream cards, medallions, white hairlines, gold discipline all match the photo's world. Headline set in serif; the photo's is a bold grotesque. Focus card weak. |
| pixels | 63 | Opening frame: same world and composition family, different tree specimen, typeface off, layout breaks below the fold. |
| motion | 70 | Reveals, draw-in lines, parallax wired; couple reveal could be missed entirely, stagger ran past 1s on big sections. |

Structure gates (layout 90, motion 85): NOT MET.

Ranked fixes applied (points order): restore the couple (reveal
safety net), restore the four-across fan (cluster basis and mid-width
breakpoints), move critters into perch bands clear of cards, headline
to the grotesque stack, strengthen the focus card, cap the reveal
stagger per cluster, mirror the deer so its head stays in frame,
mobile header and jay placement.

## Round 2: after fixes

Evidence: `after-desktop-opening.jpg`, `after-desktop-gen3-owl.jpg`,
`after-desktop-gen5-focus.jpg`, `after-desktop-base-deer.jpg`,
`after-mobile-opening.jpg`, `after-mobile-gen4.jpg` (Playwright
Chromium, viewport and scrolled positions, 1440 and 375).

| axis | score | basis |
|---|---|---|
| layout | 93 | Every reference element placed and working; couple present; fan four-across on desktop, two by two at mid widths, stacked on phones. Held below faithful by the minimap, adapted into the era rail under the v3 ruling. |
| style | 91 | Grotesque headline in the photo's voice, palette pulled from the oak, focus card distinct. Held by two directed divergences: initial medallions instead of photographic portraits, frosted instead of opaque cards. |
| pixels | 74 | Opening viewport reads as the same product family at a glance. A static frame cannot equal a scroll journey, and the tree is a different specimen. |
| motion | 90 | Against the v3 spec: per-generation reveals with capped stagger, line draw, parallax travel, rail spine with active era, Follow my line lights 7 cards and dims the rest (browser-verified), animals perform, dragonfly counter wired at 15 units. |

Structure gates: layout 93 of 90, motion 90 of 85. **PASS** at the
structure level (manual equivalent scoring; see the tooling note).

## Known differences, each deliberate

1. Minimap dropped; its job (where am I in the tree) is done by the
   era rail progress spine. V3 ruling: scroll replaces photo
   furniture that fights the journey.
2. Zoom pill dropped; the scroll is the navigation. "Follow my line"
   kept and functional.
3. Portraits are sepia initial medallions, never fake faces. Standing
   divergence, recorded in the concept brief.
4. Headline is cream, not dark: the chosen oak's canopy measures dark
   (mean luminance 0.082 in the headline zone), so the photo's dark
   headline would fail contrast on this tree. Measured, not guessed.
5. Upload panel present though absent from the photo: Justynn's
   written requirement outranks the photo.
6. Animals and the dragonfly have no counterpart in the photo: they
   are Direction v3 and its amendments, not match failures.
