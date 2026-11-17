# TW-1076 sourcing sweep: four woodland species

> **UPDATE, founder mandate change (2026-11-16, 15:54 MST):**
> "Doesn't matter what type of animal, just make it work." The
> three STOPPED verdicts below are lifted. Each slot now ships
> the best clean-license animal that actually exists, converted
> toward the founder's reference look and credited truthfully:
> the owl slot ships the CC0 great horned owl already downloaded
> (presented as a great horned owl, staged in the trunk hollow);
> the jay and woodpecker slots are both converted from the one
> clean songbird in the buck's quality register, Grab3D's
> European robin (CC0), repainted by anatomical region (blue
> jay blue/white/black; red-headed woodpecker crimson/white/
> black) and staged per the references (jay perched on the fork;
> woodpecker clinging vertically on the trunk). The sweep below
> stands as the record of what does and does not exist; the
> per-species packs state plainly what each animal actually is.

Sourcing rule (the buck's rule, TW-1075): permissive license only
(CC0 or equivalent), provenance and license file saved with the
asset, no paid assets, no account-gated downloads (the TW-1075
precedent treats account-gated as out of reach: no authorized
account exists for this work). If a species has no clean licensed
source, it stops and is reported as its own finding; a lesser or
unclear-license model is never substituted.

Sweep date: November 16, 2026, Sofia Reyes. Sources swept:
Grab3D (the buck's source; its per-model download endpoint serves
LICENSE.txt, manifest.json, .blend, and .glb with no login, and
its LICENSE.txt is CC0 1.0, SHA-256
a15412842aa03ed7746551767e80808a9303edbbca02a06cfbcf354dfbd0ad27,
identical across models), Sketchfab, and Poly Pizza.

## Verdicts

### Eastern gray squirrel: PROCEEDING (under a conversion gate)

- Grab3D "squirrel" (https://grab3d.com/models/animals/squirrel/,
  download endpoint https://grab3d.com/dl/squirrel/): CC0 1.0,
  retrieved November 16, 2026. Publisher manifest: 799,999
  triangles, 4096 textures, dimensions 0.154 x 0.371 x 0.297 m,
  created 2026-10-29, AI-assisted origin (Meshy image-to-3D,
  cleaned in Blender; the publisher discloses this in the
  manifest, same as the buck).
- Downloaded byte-exact against the manifest (first attempt
  truncated; completed with a resumed download and verified):
  squirrel.blend 37,494,561 bytes, SHA-256
  63343889af49de12122f5bc75cc9257e97bc69ee0dd12f1137a16f33b447ba20;
  squirrel.glb 34,105,276 bytes, SHA-256
  e5565905c9aaebdc972bdcf5c5086578f8db81a5ba74b1dd079b531d366b5666.
  Preserved unmodified at
  `twistor-lab/projects/our-lgcy/tw1076-grab3d-source/squirrel/`
  (Twistor internal storage), with the publisher LICENSE.txt and
  manifest.json; copies also ride in this repo at
  `gl/animals/LICENSE-grab3d-squirrel.txt` and
  `gl/animals/manifest-grab3d-squirrel.json`.
- Species finding: the model is a Eurasian red squirrel (Sciurus
  vulgaris), not the eastern gray: red-orange coat and tall dark
  ear tufts, both diagnostic. It proceeds only under a conversion
  gate, using the buck pipeline's own correction methods: the ear
  tufts are collapsed onto the ears at mesh level and the coat is
  recolored from orange-red to gray agouti in texture space.
  The gate is visual, against the founder's reference photo; the
  evidence pack is `qa/tw1076-squirrel/`. If the conversion had
  failed to read as an eastern gray squirrel, this species would
  have stopped here too and shipped nothing.

### Eastern screech owl (gray morph): STOPPED at sourcing

- Grab3D "owl" exists and is CC0, and was downloaded and
  inspected (owl.blend 0.288 x 0.321 x 0.550 m; 457,879 vertices /
  799,999 triangles; files preserved at
  `twistor-lab/projects/our-lgcy/tw1076-grab3d-source/owl/`). It
  is a great horned owl: half a meter tall, heavy barring,
  oversized talons. That is the wrong species, and no mesh or
  texture correction honest to the pipeline turns a great horned
  owl into a 20 cm screech owl in a hollow.
- True eastern screech owl models exist on Sketchfab, but under
  CC BY with downloads gated behind a Sketchfab account. No
  authorized account; out of reach under the TW-1075 precedent,
  and CC BY is a step down from the CC0 bar the buck set.
- Finding: no clean, retrievable, right-species source. The
  species stops. Nothing ships for the owl in this run. The
  composed scene deliberately builds no empty hollow prop for
  it; if a CC0 screech owl is sourced later, the trunk authored
  for the squirrel's branch is its natural landing spot.

### Red-headed woodpecker: STOPPED at sourcing

- No Grab3D model: the woodpecker slugs return 404 on the
  download endpoint.
- Sketchfab holds no red-headed woodpecker model at all (other
  woodpecker species and a cartoon character, under CC BY / CC
  BY-NC mixes, account-gated besides).
- Poly Pizza carries only low-poly stylized birds, the class of
  model the founder replaced with the Grab3D buck; shipping one
  would break the photographic register and the design law.
- Finding: no clean, retrievable, right-species source. The
  species stops. Nothing ships for the woodpecker in this run.

### Blue jay: STOPPED at sourcing

- No Grab3D model: the blue-jay, bluejay, and jay slugs return
  404, and Grab3D's generic "bird" model is a European robin
  (verified on its model page), not a jay.
- True blue jay models exist on Sketchfab under CC BY, downloads
  account-gated: out of reach, same as the owl.
- Poly Pizza: low-poly only, same objection as the woodpecker.
- Finding: no clean, retrievable, right-species source. The
  species stops. Nothing ships for the blue jay in this run.

## What would unstop the three stopped species

Any one of: a CC0 (or equivalent) model of the right species on
an ungated endpoint; the founder authorizing a Sketchfab account
and accepting CC BY attribution terms for these assets; or a
future in-house sculpt. Until then the honest state is three
findings and one converted squirrel, and the scene is composed
so the missing species are not missed: no empty perches, no
placeholder silhouettes.

Prepared by Twistor Holdings LLC
