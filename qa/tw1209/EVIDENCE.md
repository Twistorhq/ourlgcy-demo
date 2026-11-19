# TW-1209 evidence — fauna scatter, lifelike motion, the deer rock

Prepared by Twistor Holdings LLC. Branch `sofia/tw-1209-fauna-scatter`
(base: TW-1076 tip 98e9454). Captures: local Chromium 1248,
SwiftShader software GL with the page's `?gl=force-a` QA override
(the sandbox has no GPU; stated plainly, per house practice).
Lenis CDN route-stubbed in the harness only; page code untouched.

## What changed

- `gl/scatter.js` (new) replaces `gl/fauna.js` (removed). Each
  animal now lives in its own habitat in the section where its
  photo critter already sits: blue jay in gen-0 (canopy fork over
  the hero), woodpecker in gen-2 (dead snag), owl in gen-3
  (trunk hollow), squirrel in gen-4 (limb). Per habitat: a small
  transparent canvas feathered with the page's radial mask
  language, the buck's warm light recipe, a per-species perch
  (twig, snag, hollow trunk, limb) with contact shadow, the
  TW-1076 baked clips and gesture tables, build-on-approach and
  render-only-while-visible, one shared rAF loop. Fail-closed
  per habitat and as a whole, same precheck family as the buck:
  any failure leaves the photograph standing; the photo fades
  only after the habitat's first real frame. Reduced motion
  gets one still frame and no performances.
- Click, focus, and hover on a critter ask the scatter layer
  first (`window.__lgcyScatter.perform(key)`); the photo CSS
  performance remains the fallback (`app.js`).
- The buck's rock (`gl/buck.js`): smooth-shaded merged geometry,
  a procedural granite skin (speckle, lichen, strata) as map and
  bump, height-based vertex tint, raised stance. Under it, a
  ground shade: a broad warm earth-dark gradient, dappled at its
  rim, running from the rock to the foot of the section so the
  stone grades into shaded ground and the canvas dissolve
  finishes the blend into the page. See "Rock iterations" for
  why the blend vehicle is shade and not a lit stone surface.
- GLB compression (below): the five rigged models drop from
  33.69 MB to 20.53 MB with positions, joints, indices, skins,
  and animations byte-identical.

## Compression (Rosa's TW-1076 recommendation, applied here)

In-house optimizer `tools/fauna/optimize_glb.py` (numpy +
Pillow; the npm registry is unreachable from this sandbox, so
no meshopt package): NORMAL to snorm8, TEXCOORD_0 to uint16
normalized (1e-3 tolerance), WEIGHTS_0 to uint8 by
largest-remainder rounding (rows sum to exactly 255), largest
texture downscaled to 1024 JPEG q82. POSITION, JOINTS_0,
indices, skins, and all animation data copied byte-for-byte.

| model | before | after | change |
|---|---|---|---|
| buck | 2,749,316 | 2,228,972 | -19% |
| blue jay | 5,265,944 | 3,084,320 | -41% |
| owl | 8,634,476 | 5,153,912 | -40% |
| squirrel | 11,825,300 | 6,996,672 | -41% |
| woodpecker | 5,210,328 | 3,061,744 | -41% |
| **total** | **33,685,364** | **20,525,620** | **-39%** |

Verifier `qa/tw1209/verify_glb.py` decode-compares every
accessor of every optimized file against its source. Re-run on
the final files at gate time: **all 5 GLBs, RESULT: ALL PASS.**

## Captures (qa/tw1209/shots/, harness qa/tw1209/capture.mjs)

34 frames at 1440 and 390: per habitat a still, a section
context shot, and two gesture frames; the buck at both widths;
the page top at both widths. Zero habitat failures, zero
not-live fallbacks in the final run. Animal bounding boxes
(canvas-relative px, 1440): jay 111x79, woodpecker 95x109,
owl 118x203, squirrel 114x94.

Gesture motion, measured not eyeballed (grayscale pixel diff,
still to gesture frame): owl 3.7% of pixels changed (the head
turn is real and front-loaded; it reads in live playback),
jay/woodpecker/squirrel 0.3-0.6% (small animals in frame; a
head jab or paw move is a small pixel count by construction).
Signature gestures wired to the critter buttons: Squirrel
Nibble, Owl Turn, Woodpecker Peck, Jay Peck, on the TW-1076
gesture cadence, plus click/hover/focus triggering.

Harness artifact, documented so nobody re-chases it: the
squirrel's element screenshots in the final run are mis-framed
(the top-anchored habitat races Playwright's scroll-into-view
under the sticky header). Page-clip probe frames
(`squirrel-clip-idle-1440.png`, `squirrel-clip-nibble-1440.png`)
are the true record: the squirrel sits fully in frame, in idle
and mid-nibble. Owl turn probe frames are `owl-turn-a/b-1440.png`.

## Rock iterations (the honest sequence)

1. Lit granite apron, radial alpha: read as a golden slope, but
   its rim drew a clean ellipse line against the photograph.
2. Wobbled rim + darker tint + stronger relief: read as a dark
   translucent slab; the darkening raised contrast with the
   bright photo.
3. Subdivided heightfield + dappled alpha: still a slab. A
   grazing camera foreshortens any lit plane into a band with
   one clean lit edge.
4. Ground shade (shipped): no lit surface at all under the
   rock; a warm earth-dark gradient with a dappled rim darkens
   the photograph the way an outcrop's ground shadow does, and
   the mask dissolve finishes it. Final frames `buck-1440.png`
   and `buck-390.png`: a craggy, sunlit rock under the hooves,
   shaded ground running to the foot of the page, no seam line.

## Frontend gates

- **agent-eyes** (runtime step): one plan over the changed
  route at 1440 and 390, frames checks on the buck canvas and
  the owl habitat canvas. Result: buck motion 4 distinct frames
  over 1831 ms, owl habitat 4 distinct frames over 3065 ms,
  "no shrink, snap, flicker, disappearance or detour" on both;
  no page errors, no console errors, no server errors, no
  horizontal scroll. (First owl attempt's click action timed
  out on the critter button's own CSS animation; the frames
  check was re-run with scroll+wait and passed. The "page keeps
  talking to the server" note at 390 is the local test server's
  keepalive, not the page.)
- **Impeccable**: the detector CLI is an npm package and the
  registry is unreachable from this sandbox, so the pass is the
  manual 15-tell audit over the diff. No new copy beyond one
  footer word ("trunk" to "snag", for species truthfulness), no
  gradients added as decoration (the radial masks are alpha
  feathering, the page's existing language), no cards, badges,
  pills, emoji, or new type. Nothing flagged.
- **Unslop**: no em-dashes or AI tells in user-facing copy; the
  single changed string is a plain noun swap in the credits.

## Honest limits

- Captures are SwiftShader (software GL) at the QA override;
  the tier governor and fail-closed paths are inherited from
  the buck's gated code and were not re-proven on real hardware
  in this ticket.
- The woodpecker's snag is a procedural canvas texture; at
  habitat size it reads as a sunlit dead trunk, and it is the
  least photographic of the four perches. A clean-license
  photographic bark source remains the upgrade path.
- Species truthfulness is unchanged from TW-1076 and credited
  in the footer and `gl/animals/PROVENANCE.md`: great horned owl
  as itself; red squirrel converted to eastern gray; the jay and
  woodpecker are songbird conversions repainted to species
  markings. All CC0 (Grab3D).
- The habitats inherit the demo's sample-data state; TW-1155's
  lineage wiring replaces the cards underneath them at merge
  time and does not touch the habitat anchors (gen-0/2/3/4 and
  the four `data-critter` buttons verified present in 7281fa4).
