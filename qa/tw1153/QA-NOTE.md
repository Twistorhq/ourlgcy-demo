# TW-1153 QA note: family landing page (family.html)

Prepared by Twistor Holdings LLC

## What shipped
- `family.html`: new page, house chrome (header, footer, demo banner), oak
  hero band from the existing `assets/oak-tree.jpg`, nav entry "Stay in the
  Loop" in header and footer nav (this page only; sibling pages pick the
  entry up when merges sequence through Marcus).
- `family.js`: the sign up logic, scoped to this page only.
- `styles.css`: one appended block (hero band, field errors, error note,
  privacy line). No existing rules changed.

## Form contract
Fields, all required, light validation, errors inline per field with
`aria-invalid` and focus to the first invalid field:
- name: text, more than 1 character
- email: simple address pattern (local @ domain . tld)
- phone: 7 to 15 digits after stripping punctuation
- occupation: text, more than 1 character
- heard: select (family-sent, group-chat, social, word-of-mouth, other)

Payload posted as JSON: name, email, phone, occupation, heard,
source "ourlgcy-family-landing", submitted_at ISO timestamp.

## Store of record (the honest part)
GitHub Pages cannot receive a POST, so the page posts to a Twistor Core
intake route that does not exist yet. That backend is ticketed: TW-1154
(Dre). Until it lands, `ENDPOINT` in family.js is empty and the page runs
in the same honest preview mode as the Reference Center claim form:
validate for real, show the preview receipt, store nothing.
The one wiring step for go live: set `ENDPOINT` to the live intake URL.
Failure path is built and proven: if the POST fails, the page says
nothing was saved, keeps the visitor's answers in the form, and offers a
prefilled email fallback. A submit never silently drops data.

Behavior proven against a local stub endpoint (Playwright, headless
Chromium): success swaps the form for the thank-you state and the stub
received the exact contract payload; failure shows the error note with
answers intact; preview mode shows the preview receipt.

## Stills
- family-1440.png: desktop default
- family-375.png: mobile default (375 wide, form fully one tap friendly)
- family-validation-1440.png: empty submit, all five errors inline
- family-preview-receipt-1440.png: valid submit in preview mode
- family-thanks-1440.png: valid submit against the stub endpoint
- family-error-1440.png: endpoint down, error state with fallback

## Gates
- Impeccable: the CLI is not installed in this repo (no .agent dir, same
  as every shipped demo page), so the manual 15-tell audit ran instead.
  No gradients, no gradient text, no pill badges, no glassmorphism, no
  icon-in-rounded-square, no card grids, no cards in cards, no side
  stripes, no hero stats, no decorative animation, no default beige
  (palette is the site's own collard, sorghum, iron, warm paper system).
  Kept on purpose: the numbered .steps list on the right rail. It is the
  site's existing component (same one upload.html ships) and the three
  items are a real sequence of what a subscriber hears about, not a
  decorative numbered sequence. Eyebrow uses the site's existing
  uppercase tracked style, matching every other page.
- Unslop pass (polish mode): copy checked line by line, family voice,
  zero em-dashes in family.html and family.js (grep count 0), no hype
  words, spacing and type inherit the shared stylesheet tokens.
- Cinematic: this page matches the demo's shipped subpage class
  (upload, person, case, reference carry no scroll scene); the oak photo
  is poster-first static media and all facts live in the structured HTML,
  so fact parity holds. No scene.json added, consistent with the repo.
- Accessibility: semantic landmarks, skip link, every field labeled with
  hint and error text wired by aria-describedby, focus moved to the
  first error and to the receipt or thank-you heading, notes use
  role status and role alert, inputs are 48px minimum height, focus
  outline is the site's gold standard.
- PII: nothing a submitter enters is rendered anywhere on the page or
  stored in this repo. The privacy line under the button states the
  handling in one plain sentence.
