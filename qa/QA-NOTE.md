# QA note, Our LGCY demo preview (TW-1010, Sofia)

Build date: Nov 7, 2026. Static site, no build step, no dependencies.

## Verified checks

- Local static server (python3 http.server): all five pages plus styles.css
  and app.js returned HTTP 200.
- Content markers confirmed over HTTP: tree caption name on index, Prince
  Hall Masons on the person page, "Confidence: Probable" on the case page,
  "Each person submits their own" on upload, the Reference Center question
  on reference.
- app.js passes node --check.
- Em dash scan (U+2014) across HTML, CSS, JS, and Markdown: zero matches.
  En dash scan (U+2013): zero matches. Copy uses words ("c. 1852 to 1931")
  for ranges instead.
- External asset scan: zero http or https references in the pages or the
  stylesheet. Everything renders from this repo alone.
- Footer contract on all five pages: "Prepared by Twistor Holdings LLC"
  and the fictional family disclaimer present.
- Responsive: viewport meta on every page; two breakpoints in styles.css
  (900px stacks the two column layouts, person header, and case grid;
  720px switches to the toggle navigation, single column flow, compact
  timeline, full width forms). Touch targets: nav links, buttons, and form
  controls are 46px or taller.
- Accessibility pass: skip link, semantic landmarks, one h1 per page,
  labeled form controls, aria-current on the active nav item, aria-live on
  the upload file list, SVG tree carries role img with a full text
  description, focus visible styling throughout.

## Manual 15-tell audit (Impeccable, file scan path)

No purple or blue gradients (no gradients at all), no gradient text, no
glassmorphism, no pill badges (source chips and the case state tag are
rectangular with 4px corners, used as data labels), no icon in rounded
square tiles (text glyphs only), no identical card grid (landing uses an
editorial list; content pages use tables, a timeline, and rail boxes), no
cards inside cards, no decorative side stripes (the record cards use a top
rule as a record header, structural), no context free hero stats, no fake
numbered sequences (the upload steps are a real process order), no
decorative animation, no default font stacks (serif display face is a
heritage choice, body is a humanist system stack).

Kept on purpose, with reasons:
- Warm paper background: the surface is meant to read as archival paper
  against a deep pine green and oxblood, with saturated anchors on every
  page. It is a palette decision for a family history product, not a
  default template beige.
- Sample data labels repeat on every page: a hard requirement of the
  ticket (fictional data only), not filler copy.

## Known limitation

This sandbox ships no Chromium or Playwright, so rendered screenshots at
1440 and 375 could not be captured here. Responsiveness is verified from
the stylesheet breakpoints and markup instead. First visual pass on the
live Pages URL is the natural Rosa review step.
