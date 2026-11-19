#!/usr/bin/env python3
"""Generate the generation sections for the Our LGCY demo home page.

Real lineage, phase 1 (TW-1155): the people come from
data/lineage-phase1.json, the public layer of the verified lineage
pack (Rosa gate APPROVE WITH NOTES, Nov 16, 2026). Names, birth
years, initials, and relationship counts are read from the pack at
build time, so the journey is a swap of the data file, not a hand
edit. The pack's fenced private section is absent from the vendored
file by construction: living people render masked, with no years.

Layout: the journey opens at the deepest named generation (Frank
Hammond, b. 1843) and descends to the root person of the demo view.
Generation sections hold the pack's own lines as clusters. Emma Jean
Jackson carries the focus card: her page is person.html. Emits the
HTML fragment for index.html between the JOURNEY markers, so the
markup in index.html is reproducible, not hand placed.
"""

import json
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
PACK = json.loads((ROOT / "data" / "lineage-phase1.json").read_text(encoding="utf-8"))
PEOPLE = {p["id"]: p for p in PACK["people"]}

# Panel branch per person (the app.js BRANCHES keys). Joseph rides the
# family panel: he is in the tree by marriage, not by a phase 1 line.
# Troy rides the Jackson panel, the household his candidacy belongs to.
PANEL_BRANCH = {
    "justynn-hammond": "family",
    "joseph-mathews-sr": "family",
    "troy-wright": "jackson",
}
for _p in PACK["people"]:
    PANEL_BRANCH.setdefault(_p["id"], _p["line"].split()[0].lower())

BRANCH_LABEL = {
    "family": "the whole family tree",
    "hammond": "Hammond line",
    "jackson": "Jackson line",
    "gooden": "Gooden line",
    "criner": "Criner line",
    "root": "The root",
}

# Card meta lines. The default is the pack's public born year; the
# overrides are the honest exceptions, each traceable to a pack fact:
# Chester's year is the index's "about" reading; Alberta, Otis, and
# Ronald have no dates on file anywhere in the sources; Ava and
# Joseph are living and masked; Troy's card names the family account
# that places him here; Justynn's card names his role, not a year.
META_OVERRIDES = {
    "chester-jackson": "b. about 1895",
    "alberta-lang": "Dates not yet on file",
    "otis-criner": "Dates not yet on file",
    "ronald-gooden": "Dates not yet on file",
    "ava-hammond-mathews": "Living · held private",
    "joseph-mathews-sr": "Living · held private",
    "troy-wright": "b. 1908 · named in the family account",
    "justynn-hammond": "Root of this family tree",
}

FOCUS = "emma-jean-jackson"


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
    if pid in META_OVERRIDES:
        return META_OVERRIDES[pid]
    born = PEOPLE[pid].get("born")
    return f"b. {born}" if born else "Dates not yet on file"


# Generation sections: (section id, era tag, [(cluster, [person ids])])
GENERATIONS = [
    (
        "gen-2",
        "1900S",
        [
            ("hammond", ["james-j-hammond", "willie-bethsaida-anderson"]),
            ("jackson", ["dora-weathers", "chester-jackson", "troy-wright"]),
            ("gooden", ["andrew-jackson-gooden", "alberta-lang"]),
            ("criner", ["otis-criner", "elouise-morris"]),
        ],
    ),
    (
        "gen-3",
        "1930S",
        [
            ("hammond", ["curtis-franklin-hammond", "emma-jean-jackson"]),
            ("gooden", ["melvin-andrew-gooden", "oddie-criner-gooden"]),
        ],
    ),
    (
        "gen-4",
        "PARENTS",
        [
            ("hammond", ["ava-hammond-mathews", "joseph-mathews-sr"]),
            ("gooden", ["ronald-gooden"]),
        ],
    ),
    (
        "gen-5",
        "TODAY",
        [
            ("root", ["justynn-hammond"]),
        ],
    ),
]

# Critters and acorn clusters placed inside generation sections.
SECTION_EXTRAS = {
    "gen-2": (
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
    "gen-3": (
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
    "gen-4": (
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
        parts.append('<a class="view-story" href="person.html">View story</a>')
    else:
        head = BRANCH_LABEL[branch]
        parts.append(
            f'<button class="relatives" type="button" data-branch="{branch}" '
            f'aria-label="{esc(p["name"])}: open the collection for {esc(head)}">'
            f"+{relatives_count(pid)} relatives</button>"
        )
    parts.append("</span></article>")
    return "".join(parts)


def couple_section():
    parts = ['<section class="gen" id="gen-1" data-era="1840">']
    parts.append('<p class="era-tag" aria-hidden="true">1840S</p>')
    parts.append('<div class="couple">')
    parts.append(card("frank-hammond", 0.0))
    parts.append('<span class="couple-link" aria-hidden="true"></span>')
    parts.append(card("eliza-browner", 0.08))
    parts.append("</div>")
    parts.append("</section>")
    return "".join(parts)


def gen_section(sid, era, clusters):
    parts = [f'<section class="gen" id="{sid}" data-era="{era}">']
    parts.append(f'<p class="era-tag" aria-hidden="true">{esc(era)}</p>')
    parts.append('<div class="fan"><div class="clusters">')
    for ci, (branch, ids) in enumerate(clusters):
        parts.append(f'<div class="cluster" data-branch="{branch}">')
        parts.append(
            f'<p class="cluster-name" aria-hidden="true">'
            f"{esc(BRANCH_LABEL[branch])}</p>"
        )
        for ki, pid in enumerate(ids):
            parts.append(card(pid, ci * 0.05 + ki * 0.05))
        parts.append("</div>")
    parts.append("</div></div>")
    if sid in SECTION_EXTRAS:
        parts.append(SECTION_EXTRAS[sid])
    parts.append("</section>")
    return "".join(parts)


def build():
    out = [couple_section()]
    for sid, era, clusters in GENERATIONS:
        out.append(gen_section(sid, era, clusters))
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
    print(f"journey fragment written: {len(PEOPLE)} phase 1 people")


if __name__ == "__main__":
    main()
