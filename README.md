# Our LGCY: public demo preview

A static preview of the Our LGCY family history app experience, built for
GitHub Pages. Plain HTML, CSS, and JavaScript. No build step, no backend,
no database, no tracking, and no real family data anywhere in this repo.

Every name, date, record, and enrollment detail shown here belongs to a
fictional sample family (the Reeds), invented for this preview and labeled
as sample data on every page.

## Pages

- `index.html`: landing page with the living grandmother tree (inline SVG),
  the mission, and the Freedmen to Native bridge at the heart of the project
- `person.html`: a history book page for a fictional ancestor, Solomon Reed,
  with a life timeline, residence history, occupations by decade, fraternal
  membership, and Dawes enrollment facts, every fact tied to a source chip
- `case.html`: a Connection Case demo, matching a Freedmen side census
  household against a Dawes enrollment card household, signal by signal,
  with an honest confidence state and a "what would prove this" list
- `upload.html`: the upload experience mock. Each person submits their own
  records; the engine sorts, matches, and places them. Files dropped in the
  demo never leave the device
- `reference.html`: the Reference Center mock. "Is this my family member?"
  claims checked one way against the archive, which never reveals its side
  to an unverified asker

## Run it locally

Any static file server works, for example:

    python3 -m http.server 8000

then open http://localhost:8000 in a browser.

## Design notes

Desktop first, with a full responsive mobile view. Flat heritage palette,
serif display type, no gradients, no external assets, no dependencies.
Accessibility: semantic landmarks, skip link, labeled controls, visible
focus, keyboard operable upload mock and navigation.

The real Our LGCY app is private and invite only. This repo exists so the
family and reviewers can walk the experience before the full build.

Prepared by Twistor Holdings LLC
Preview with a fictional sample family. No real family data.
