#!/usr/bin/env python3
"""Generate the generation sections for the Our LGCY demo home page.

The people come from data/lineage-phase1.json, whatever pack is
vendored there: names, birth years, initials, and relationship
counts are read from the pack at build time, so the journey is a
swap of the data file, not a hand edit. Living people render
masked, with no years. Emits the HTML fragment for index.html
between the JOURNEY markers, so the markup in index.html is
reproducible, not hand placed.

Layout: the journey opens at the deepest named generation and
descends to the pack's root person. Generations are computed
from the pack's own parent links (a spouse with no parents in
the pack takes their partner's generation), sections hold the
pack's lines as clusters, and the pack's focus person (its
focus_person field, when set) carries the story card. An empty
pack emits the blank-tree start: the public preview's first-run
state, before any family has added a person.

The public preview pack is a small invented sample family
(TW-1275), labeled once at the bottom of the tree. A signed-in
family's own pack replaces it and is never vendored here.
"""

import json
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
PACK = json.loads((ROOT / "data" / "lineage-phase1.json").read_text(encoding="utf-8"))
PEOPLE = {p["id"]: p for p in PACK["people"]}
ROOT_PERSON = PACK.get("root_person")
FOCUS = PACK.get("focus_person")

# Panel branch per person (the app.js BRANCHES keys): the first
# word of the person's line, lowered, unless the pack assigns a
# panel_branch itself. The root person rides the family panel.
PANEL_BRANCH = {}
for _p in PACK["people"]:
    PANEL_BRANCH[_p["id"]] = _p.get("panel_branch") or _p["line"].split()[0].lower()
if ROOT_PERSON:
    PANEL_BRANCH[ROOT_PERSON] = "family"


def branch_label(branch, ids):
    if branch == "family":
        return "the whole family tree"
    if branch == "root":
        return "The root"
    return PEOPLE[ids[0]]["line"]


_GEN = {}


def gen_of(pid, seen=frozenset()):
    """Generation depth from the pack's parent links: 0 for a
    person with no parents in the pack, else one past the deeper
    parent. A spouse with no parents in the pack then takes
    their partner's generation, so couples share a section."""
    if pid in _GEN:
        return _GEN[pid]
    if pid in seen:
        return 0
    p = PEOPLE[pid]
    parents = [q for q in (p.get("father_id"), p.get("mother_id")) if q in PEOPLE]
    g = 0 if not parents else 1 + max(gen_of(q, seen | {pid}) for q in parents)
    _GEN[pid] = g
    return g


def generations():
    for pid in PEOPLE:
        gen_of(pid)
    # Spouse alignment, iterated to a fixpoint.
    for _ in range(len(PEOPLE) + 1):
        moved = False
        for p in PACK["people"]:
            has_parents = p.get("father_id") in PEOPLE or p.get("mother_id") in PEOPLE
            if has_parents:
                continue
            for sid in p.get("spouse_ids", []):
                if sid in PEOPLE and _GEN[sid] != _GEN[p["id"]]:
                    _GEN[p["id"]] = _GEN[sid]
                    moved = True
        if not moved:
            break
    by_gen = {}
    for p in PACK["people"]:
        by_gen.setdefault(_GEN[p["id"]], []).append(p["id"])
    return [by_gen[g] for g in sorted(by_gen)]


def relatives_count(pid):
    """True in-pack relationship count for the +N relatives label."""
    rel = set()
    for p in PACK["people"]:
        if p["id"] == pid:
            for key in ("father_id", "mother_id"):
                if p.get(key):
                    rel.add(p[key])
            rel.update(p.get("spouse_ids", []))
            for cand in p.get("father_candidates", []):
                rel.add(cand["id"])
        else:
            if p.get("father_id") == pid or p.get("mother_id") == pid:
                rel.add(p["id"])
            if pid in p.get("spouse_ids", []):
                rel.add(p["id"])
            for cand in p.get("father_candidates", []):
                if cand["id"] == pid:
                    rel.add(p["id"])
    return len(rel)


def meta_for(pid):
    p = PEOPLE[pid]
    if pid == ROOT_PERSON:
        return "Root of this family tree"
    if p.get("living") or p.get("masked"):
        return "Living · held private"
    born = p.get("born")
    return f"b. {born}" if born else "Dates not yet on file"


def era_for(ids):
    if ROOT_PERSON and ROOT_PERSON in ids:
        return "TODAY"
    if ROOT_PERSON and ROOT_PERSON in PEOPLE:
        root = PEOPLE[ROOT_PERSON]
        parents = {root.get("father_id"), root.get("mother_id")}
        if parents & set(ids):
            return "PARENTS"
    years = [PEOPLE[i]["born"] for i in ids if PEOPLE[i].get("born")]
    if not years:
        return "EARLIER"
    med = sorted(years)[len(years) // 2]
    return f"{med // 10 * 10}S"


# Critters and acorn clusters placed inside generation sections,
# by section order (the second, third, and fourth sections down).
SECTION_EXTRAS = {
    2: (
        '<button class="acorns acorns-b" type="button" data-acorns '
        'aria-label="A cluster of acorns">'
        '<svg aria-hidden="true"><use href="#acorn"/></svg>'
        '<svg aria-hidden="true"><use href="#acorn"/></svg>'
        '<svg aria-hidden="true"><use href="#acorn"/></svg></button>\n'
        '<button class="critter critter-woodpecker" type="button" '
        'data-critter="woodpecker" aria-label="A woodpecker on the bark">'
        '<img src="assets/animals/woodpecker.jpg" alt="" '
        'width="520" height="457"></button>'
    ),
    3: (
        '<button class="critter critter-owl" type="button" '
        'data-critter="owl" aria-label="An owl resting in a hollow">'
        '<img src="assets/animals/owl.jpg" alt="" '
        'width="520" height="588"></button>\n'
        '<button class="acorns acorns-c" type="button" data-acorns '
        'aria-label="A cluster of acorns">'
        '<svg aria-hidden="true"><use href="#acorn"/></svg>'
        '<svg aria-hidden="true"><use href="#acorn"/></svg>'
        '<svg aria-hidden="true"><use href="#acorn"/></svg></button>'
    ),
    4: (
        '<button class="acorns acorns-d" type="button" data-acorns '
        'aria-label="A cluster of acorns">'
        '<svg aria-hidden="true"><use href="#acorn"/></svg>'
        '<svg aria-hidden="true"><use href="#acorn"/></svg>'
        '<svg aria-hidden="true"><use href="#acorn"/></svg></button>\n'
        '<button class="critter critter-squirrel" type="button" '
        'data-critter="squirrel" aria-label="A squirrel on a limb">'
        '<img src="assets/animals/squirrel.jpg" alt="" '
        'width="560" height="487"></button>'
    ),
}


def esc(s):
    return s.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;")


def card(pid, delay):
    p = PEOPLE[pid]
    branch = PANEL_BRANCH[pid]
    focus = pid == FOCUS
    cls = "pcard focus" if focus else "pcard"
    parts = [
        (
            f'<article class="{cls}" id="p-{pid}" data-branch="{branch}" '
            f'style="--d:{delay:.2f}s">'
        )
    ]
    parts.append(f'<span class="medal" aria-hidden="true">{esc(p["initials"])}</span>')
    parts.append('<span class="pcard-body">')
    parts.append(f'<span class="pname">{esc(p["name"])}</span>')
    parts.append(f'<span class="pmeta">{esc(meta_for(pid))}</span>')
    if focus:
        parts.append(
            f'<a class="view-story" href="person.html?id={pid}">View story</a>'
        )
    else:
        head = branch_label(branch, [pid])
        parts.append(
            f'<button class="relatives" type="button" data-branch="{branch}" '
            f'aria-label="{esc(p["name"])}: open the collection for {esc(head)}">'
            f"+{relatives_count(pid)} relatives</button>"
        )
    parts.append("</span></article>")
    return "".join(parts)


def couple_section(sid, era, ids):
    parts = [f'<section class="gen" id="{sid}" data-era="{esc(era)}">']
    parts.append(f'<p class="era-tag" aria-hidden="true">{esc(era)}</p>')
    parts.append('<div class="couple">')
    parts.append(card(ids[0], 0.0))
    parts.append('<span class="couple-link" aria-hidden="true"></span>')
    parts.append(card(ids[1], 0.08))
    parts.append("</div>")
    parts.append("</section>")
    return "".join(parts)


def gen_section(sid, era, ids, ordinal):
    parts = [f'<section class="gen" id="{sid}" data-era="{esc(era)}">']
    parts.append(f'<p class="era-tag" aria-hidden="true">{esc(era)}</p>')
    parts.append('<div class="fan"><div class="clusters">')
    clusters = {}
    for pid in ids:
        key = "root" if pid == ROOT_PERSON else PANEL_BRANCH[pid]
        clusters.setdefault(key, []).append(pid)
    for ci, (branch, cids) in enumerate(clusters.items()):
        parts.append(f'<div class="cluster" data-branch="{branch}">')
        parts.append(
            f'<p class="cluster-name" aria-hidden="true">'
            f"{esc(branch_label(branch, cids))}</p>"
        )
        for ki, pid in enumerate(cids):
            parts.append(card(pid, ci * 0.05 + ki * 0.05))
        parts.append("</div>")
    parts.append("</div></div>")
    if ordinal in SECTION_EXTRAS:
        parts.append(SECTION_EXTRAS[ordinal])
    parts.append("</section>")
    return "".join(parts)


BLANK_FRAGMENT = (
    '<section class="gen" id="gen-1" data-era="BEGIN">'
    '<p class="era-tag" aria-hidden="true">THE FIRST BRANCH</p>'
    '<div class="headline">'
    "<h2>This tree is empty, on purpose.</h2>"
    '<p class="subline">No sample family, no borrowed names: the first '
    "person on a tree is the person who begins it, and every branch "
    "after grows from records their family adds.</p>"
    '<p><a class="btn btn-pine" href="family.html">Begin your tree</a> '
    '<a class="btn" href="upload.html">Add your records</a></p>'
    "</div>"
    "</section>"
)


def build():
    if not PACK["people"]:
        return BLANK_FRAGMENT
    out = []
    for i, ids in enumerate(generations()):
        ordinal = i + 1
        sid = f"gen-{ordinal}"
        era = era_for(ids)
        if i == 0 and len(ids) == 2 and ids[1] in PEOPLE[ids[0]].get("spouse_ids", []):
            out.append(couple_section(sid, era, ids))
        else:
            out.append(gen_section(sid, era, ids, ordinal))
    return "\n".join(out)


def main():
    index = Path(__file__).resolve().parent.parent / "index.html"
    html = index.read_text(encoding="utf-8")
    start = "<!-- JOURNEY:START -->"
    end = "<!-- JOURNEY:END -->"
    head, _, rest = html.partition(start)
    _, _, tail = rest.partition(end)
    html = head + start + "\n" + build() + "\n" + end + tail
    index.write_text(html, encoding="utf-8")
    print(f"journey fragment written: {len(PEOPLE)} pack people")


if __name__ == "__main__":
    main()
