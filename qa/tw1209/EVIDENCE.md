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

40 frames at 1440 and 390: per habitat a still, a section
context shot, and two gesture frames; the buck at both widths;
the page top at both widths; plus four probe frames (owl turn
pair, squirrel clip pair). Count corrected in the fix round:
this file originally said 34; the folder held 40. Zero habitat failures, zero
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

## Fix round (Rosa's REQUEST CHANGES, 2026-11-19)

Rosa's gate returned REQUEST CHANGES: one blocker (the rock),
one major (the woodpecker floats), two nits (frame count, owl
halo). Everything she verified PASS (scatter architecture,
fail-closed behavior, compression, motion measurement,
agent-eyes, the manual Impeccable audit) is untouched except
where a fix required it. The full capture set was re-shot on
the final code; the four probe frames (owl turn, squirrel
clip) predate this round and are unchanged behavior.

### Finding 1 — the rock (BLOCKER)

Her words: hooves on a broad flat plane with straight
geometric edges, reading translucent; granite skin illegible
at render scale (her measure: hf-gradient 3.34 rock vs 16.69
photograph). Three separate causes were found, each fixed:

1. **The cap rectangle.** The crest was clamped to the stance
   plane over |x| < 0.52, z −0.80..0.34, far larger than the
   stance, and the render showed the rectangle. The hard cap
   now covers only the true contact patch (|x| < 0.36,
   z −0.74..0.26; front soles z 0.175, hind sole z −0.647 — a
   rig invariant, exact as before). Outside it a noise
   envelope takes over and the shoulders fall away within
   ~0.4 units (an earlier, wider feather still read as a
   table; the crest now reads as a ridge). Geometry detail
   4 → 5 halved facet scale (detail-4 crest facets ran
   40–70 px and read as planes however dressed). The
   camera-cut face (z > 0.45) is rumpled at two scales, so
   its straight lit edge is gone.
2. **The skin never reached the surface.** (a) The
   icosahedron's spherical UVs pinch to a sliver at the crest
   pole: the crest sampled a thin strip of the canvas however
   detailed it was. UVs are now planar, projected per-vertex
   by dominant normal axis at 0.55 UV per world unit; granite
   noise hides the projection seams as cracks. (b) The canvas
   was fine grain in a narrow value range. It is now 1024²
   with detail at every scale: tonal mottling, deep shadow
   pooling, sun-fleck dapple at the photograph's own scale,
   300 mid-scale aggregate patches (the 10–40 px band that
   survives render minification; fine grain alone averages
   to tone), darker crack walks, freckled lichen. Bump scale
   1.3 → 3.2; anisotropy up to 8 (the camera meets the stone
   at a grazing angle, where minification without it smears
   the skin). Per-vertex tint now carries its own mottling,
   so the crest holds value changes even where the texture
   foreshortens.
3. **The translucency was structural.** The buck canvas's
   CSS dissolve mask held full opacity only to 74% of canvas
   height; the rock's crest sits at ~74% of the section, so
   the stone's whole face rendered at ~70% opacity and
   falling — a translucent sheet however it was textured.
   The mask now holds full opacity to 84% and reaches
   transparent at 100%: solid under the hooves, base still
   dissolving into the section foot, which is the founder's
   blend direction ("a realistic rock under the deer's feet
   blending from the rock to the end of the page into the
   background").

Element bisect (same frame, one element removed at a time):
the pale sheet at the crest is the rock mesh itself — absent
with the rock removed, present without apron and without
contact shadow — i.e. the cap + fade above, not a stray
overlay. The foot-of-section dappled-shade blend Rosa passed
is unchanged (apron and shadow untouched).

Measurement, stated honestly (grayscale, Gaussian-blur
high-pass, mean absolute gradient; identical crops
before/after): the gate-replication crop over the rock body
reads 4.59 before, 4.25 after; the photograph crop is
unchanged at ~15.9. The composed-frame number does not rise
because the old one was inflated by the defect itself:
photograph detail showing through the translucent surface
contributed gradient the opaque stone now covers with its
own. The photograph's ~16 is sky-against-bark contrast,
which shaded granite does not reach; the fix is therefore
judged on the frames (buck-1440/390, before/after) and on
the rock-alone diagnostic (magenta backdrop, deer/apron/
shadow removed), which confirms the craggy silhouette and
the skinned slope are the mesh's own.

Diagnosis note, so nobody re-chases it: two early test
captures this round were silently served by a stale
http.server left on port 8209 from the original run (it
served this worktree, shadowing the scratch copy); the
toggle tests run against it were void and were re-run after
the port was cleared and verified free.

### Finding 2 — the woodpecker (MAJOR)

The stance was solved numerically against the snag's own
displaced geometry instead of by eye. Landmarks measured out
of the GLB: feet at model (±0.017, 0, +0.045), breast front
(0, 0.055, +0.058), beak (0, 0.085, +0.070), tail tip
(0, 0.010, −0.070); the snag's displaced face sampled height
by height (it bulges: face z ≈ 0.14 at feet height, ≈ 0.21
at breast height). New stance pos [0.061, −0.169, 0.238],
rot [0.65, 3.00, 0.20], scale 2.9. Resulting gaps to the
face: feet −4/+4/+1 mm across the three foot landmarks
(toes on the proudest wood), breast −4 mm (against the
face), beak +6 mm pointing at the bark (the peck now jabs
the snag, not the air), head up and out from the wood, tail
tip 0.18 below the feet. The contact shadow the other
perches carry now stands on the snag's face behind the
bird, laid along the snag's lean, centered on the
feet-to-breast contact patch. One honest limit: the rig is
a perching songbird pose, spine-to-tail ≈ 84° where a true
cling wants ≈ 160°, so the tail cannot also press the wood
while the head is up; it hangs below the feet toward the
viewer instead. Rosa's stated fix (feet + breast + contact
shadow) is met; the re-captured habitat and gesture frames
at both widths show the bird vertical on the snag.

### Nits

3. Frame count corrected above: 40 (this file said 34).
4. Owl hollow halo: the hollow gradient's outer band was
   #33200d from 0.82 out and read as a light tan oval at
   close framing; the band is now #241505 from 0.90 with the
   fade starting later, and in the re-captured habitat-owl
   frames the ring shrinks into the bark's own shadow.

### Gates re-run on the final code

- GLB verifier (sources in the TW-1076 worktree):
  buck, jay, owl, squirrel, woodpecker — RESULT: ALL PASS,
  ×5 (files untouched this round; re-run for the record).
- agent-eyes --strict, plan = home + buck frames + habitat
  frames at 1440 and 390: exit 0. "no page errors, no
  console errors, no server errors, no horizontal scroll,
  actions ok"; every motion check "no shrink, snap, flicker,
  disappearance or detour". One advisory at 390: the tool
  noted a 2104 ms browser freeze but attributed it to the
  machine ("frames were already 500 ms apart before the
  action: the machine is busy") — SwiftShader on this shared
  host, not a page defect.
- Captures: full set re-shot, zero habitat failures, zero
  not-live fallbacks. Animal boxes (canvas-relative px,
  1440): jay 112×79, woodpecker 76×128 (taller: the cling
  stance), owl 118×202, squirrel 113×92.
