# TW-1238 — Our LGCY world art pass: proof notes

Prepared by Twistor Holdings LLC

Branch `sofia/tw-1238-art-pass` off main 509aaf5. The founder's
two reference photos are the acceptance test; every framing
below is shot at the same placements as Slice 1 (qa/tw1232) so
the two passes compare directly. Harness: `qa/tw1238/capture.py`
(results in `results.json`); runtime gate: `agent-eyes.txt`.

## What changed

1. **Sprite people, not shapes.** Figures are pre-rendered
   sprites painted per person from their appearance record:
   head with hair in its style, texture, and color; torso in
   shaded era clothing (dark shade side, lit panel, collar,
   buttons, belt, dress folds and hem); two-segment arms with
   skin hands; legs and shoes that step through a 4-frame walk;
   a 2-frame wave and a 2-frame cheer; soft radial ground
   shadow; paper grain. Head is about a third of the figure, per
   the close reference. Figures stand upright as the references
   draw people: front or back facing by travel direction,
   flipped for leftward travel, greetings and cheers always
   front. (First smoke round rotated sprites with heading; from
   any non-south heading a person read as lying on the ground.
   That class is gone.)
2. **Zoom.** Default 1.45 (figures read as people on arrival).
   Maximum 2.2 is the hard stop, set to reference-2's framing;
   minimum 0.45 shows the whole world. Wheel, pinch, and the
   + / − buttons all drive one eased target zoom; the camera
   angle never changes at any level, scale only, and the camera
   stays on the player (proof gaps [0, 0] and [0, −2] px at the
   two stops). Minimap unaffected. Canvas now renders at device
   pixel ratio (cap 2), closing Slice 1's known shortfall #6.
3. **One scale law.** The same 62-unit sprite walks the street,
   presses at the gates (24 full figures in home purple and
   gold, replacing 240 dots), works the tailgate, and plays on
   the field (two elevens in formation, replacing nobody; Slice
   1's field was empty). The stands are a generated crowd
   texture (tile of heads and shoulders, ~55% purple family,
   ~25% gold family, rest warm neutrals and skin tones) with
   tier shading, replacing 2,600 scattered dots. Yard numbers
   painted on the grass, readable from both sidelines.
4. **Surfaces.** Palette below; brick with per-brick variation,
   burnt and sunlit bricks, lit top edges, tonal drift; grass
   with blade strokes; three-depth tree canopies with dappled
   light flecking the ground shadow; cream/tan roofs with
   courses and ridges; tan church and store roofs.

## Palette (sampled from the two reference photos, median-cut)

- Brick: base rgb(178, 88, 55); sampled family #b5684f, #bb6d5a,
  #ba6b50; sunlit #dba074; shade #98553f; mortar #8a4630.
- Field green: #517821 (samples #517821, #557626, #415e20);
  lawns #5f8a30 with patches toward #86b45c.
- Canopy: deep #3f5c20, mid #5d742c, sunlit #7d8c34, flecks
  #a39754 and #bb9d3f (samples ran olive: #52521e to #bb9d3f).
- Roofs: cream/tan #d9c8a6, #c9ae84, #e2d2b0, #d3bd94, #dccaa9,
  #c2a678 (samples #b49a89, #9f866e, #cfae8a, #ddbba1).
- Crowd mass: purples #5b3a8e family and golds #e3a81c family
  dominant, per the close reference's stands.
- Daylight is warm throughout (sunlit edges, warm tonal drift);
  no scheme was invented off-palette.

## The people: appearance, hair, skin (detail correctness)

Photos on file: **none, for any of the 10 roster people or the
player.** The lineage pack carries no photo fields and the
project assets hold no portraits (Oddie Criner Gooden's Living
Summary states it plainly: no photo, because no record or
upload has supplied one). So every sprite is record-driven,
and the mechanism is ready: a record's `photo` field names an
upload, its derived attributes replace the assignments below,
and the same painter consumes them. Sprites stay abstract
either way (likeness law).

Skin tones (founder rule: unsure cases default to the mixed
and dark brown range, varied person to person, never one flat
tone): assigned one by one across **#54331d (deep dark brown)
to #a9744a (warm medium brown)**; the crowd/spectator pool
draws from the same range.

| Person | Hair style | Texture | Length | Color | Skin | Source |
|---|---|---|---|---|---|---|
| Elouise Morris | bun (under church hat) | straight | short | gray #cfc8ba | #8a5a34 | era: documented, passed at 96 |
| Oddie Criner Gooden | flowing | straight | long | gray #c4bba8 | #7a4c28 | era: documented, passed at 71 |
| Curtis Franklin Hammond | short (under fedora) | coily | short | gray #b9b0a0 | #5d3a20 | era: documented, passed at 79 |
| Melvin Andrew Gooden | afro | coily | medium | gray #b9b0a0 | #9c6a3e | era + variation: b. 1932 documented, death unrecorded |
| Emma Jean Jackson | flowing | curly | long | dark #2a1a10 | #835231 | variation: years probable |
| Willie Bethsaida Anderson | braids | braided | long | gray #c9c2b4 | #54331d | variation: years probable |
| Dora Weathers | short | curly | short | salt-and-pepper #6b6156 | #a9744a | variation: years probable |
| Troy Wright | short (under cap) | straight | short | black #17110b | #6e4525 | variation: years probable |
| Andrew Jackson Gooden | bald, gray fringe | straight | none | gray #b5ab99 | #96613a | variation: years probable |
| James J Hammond | short | straight | short | near-white #d6cfc0 | #684628 | variation: elder, cane in the record |
| Justynn (player) | short | coily | short | black #1d130c | #7a4c28 | the visitor's own figure |

Builds vary (slim / average / sturdy) and gray follows the
documented age at passing where documented. Glasses: no
roster record documents them, so nobody wears them; the
attribute exists in the mechanism and renders when a record
or photo carries it. No two roster people share the same
combination of style, texture, and color.

## Framing by framing (Slice 1 counterpart in qa/tw1232)

- **wide-plaza.png** (Slice 1: zoom 1; now default 1.45): the
  player stands on the gold diamond as a person, hair, shaded
  clothes, belt; Troy waits with his plate at the west end;
  Andrew's bald head and Oddie's long gray hair read from
  behind at the south porches. Brick carries per-brick
  variation and warm drift; trees are three-depth canopies.
- **closeup-greeting-aunt.png** (Slice 1 at zoom 1.9; now at
  the 2.2 maximum): Elouise in her purple dress and church hat,
  arm raised in the wave, "Hi Justynn! How's it going?" Same
  line, same speaker, at the reference-2 scale.
- **closeup-greeting-cousin.png**: Troy with his plate,
  "Good to see you!", greet_count 2 for the page, duplicate
  guard intact.
- **saturday-tailgate.png** (same placements): Oddie's long
  gray hair and wave ("Good morning, Justynn!", time-aware),
  Curtis at the smoking grill in his fedora, Dora's short
  curls, Emma Jean's long dark hair; tents, trucks, and the
  crowd mass at the wall, all figures one scale.
- **saturday-stadium.png** (same placements): Elouise in the
  stands in San Francisco State purple with the gold sash,
  cheering; gate crowd is 24 full figures, not dots; the field
  holds two elevens at street scale with yard numbers; the
  player at the gate is the same size as everyone.
- **full-world.png** (new): the whole 3200×2400 world at the
  0.45 wide stop.
- **zoom-seq-a/b/c.png** (new): default → button clicks stop
  at exactly 2.2 (at_max true) → wheel stops at 0.45 (at_min
  true); camera-player gap [0, 0] and [0, −2].
- **mobile-390.png**: default zoom at phone width; figures
  read, no horizontal scroll (agent-eyes confirms).

Zero page errors across every page (`results.json`);
agent-eyes strict is clean at 1440 and 390: no shrink, snap,
flicker, disappearance, or detour on the canvas, no console or
server errors, actions ok.

## Bugs found and fixed in this pass

- First-frame drawImage throw on Saturdays: elapsed time runs
  negative for the first ~0.3 s (rAF clock starts behind the
  frame timer), making the cyclic wave/cheer frame index −1.
  Slice 1 carried the same latent flaw; Elouise's Saturday
  cheer is simply the first surface to fire it at frame one.
  Fixed at the root: dt is clamped non-negative in the frame
  loop. Proof: the Saturday pages now run error-free.
- TW-1237's notes ride the build-out as before (N5 path
  fallback, N1 door cells, N2 eraOf) and are untouched here.

## What still falls short of the references, plainly

- The references are hand-painted with soft, irregular edges;
  ours are clean vector-painted sprites. At the reference-2
  framing the difference is visible: our figures are crisper
  and flatter, faces carry no features at all (the likeness
  law forbids copied faces; the references' faces have tiny
  painted eyes we deliberately do not imitate per person).
- The crowd texture's grid origin shows at maximum zoom as a
  faint regularity in the heads; at default zoom and below it
  reads as a mass, as intended.
- Tree canopies are layered discs with speckle and dapple;
  the references' canopies have finer leaf clumping and
  longer moss. Closer than Slice 1, not equal.
- Field players stand in formation but do not play; animation
  on the field is a build-out question, not an art-pass one.
- Houses keep Slice 1's geometry (porches, shutters); the art
  pass recolored and re-shaded roofs but did not add the
  references' roof overhangs and gable detail.
