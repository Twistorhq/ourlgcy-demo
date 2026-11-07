#!/usr/bin/env python3
"""Generate the generation sections for the Our LGCY demo home page.

Sample data only: an invented Shote family. The journey opens at one
root record (c. 1810) and descends generation by generation to present
day leaves: a founding couple, four branch lines (Ruth, Henry, Della,
Moses), stacked branch clusters, one focus person. Emits the HTML
fragment for index.html between the JOURNEY markers, so the markup in
index.html is reproducible, not hand placed.
"""

from pathlib import Path

# (id, name, meta line, +N relatives or None, is_focus)
PERSON = {
    "amos": ("Amos Shote", "b. 1831", 12, False),
    "celia": ("Celia Shote", "b. 1836", 9, False),
    "ruth": ("Ruth Shote", "b. 1858", 21, False),
    "henry": ("Henry Shote", "b. 1861", 18, False),
    "della": ("Della Shote", "b. 1864", 15, False),
    "moses": ("Moses Shote", "b. 1867", 19, False),
    "ada": ("Ada Shote", "b. 1883", 11, False),
    "cora": ("Cora Shote", "b. 1886", 9, False),
    "walter": ("Walter Shote", "b. 1885", 12, False),
    "jesse": ("Jesse Shote", "b. 1889", 8, False),
    "pearlie": ("Pearlie Shote", "b. 1888", 10, False),
    "odessa": ("Odessa Shote", "b. 1891", 7, False),
    "booker": ("Booker Shote", "b. 1890", 13, False),
    "silas": ("Silas Shote", "b. 1894", 9, False),
    "lena": ("Lena Shote", "b. 1929", 8, False),
    "ruthie": ("Ruthie Shote", "b. 1932", 6, False),
    "bernice": ("Bernice Shote", "b. 1931", 7, False),
    "floyd": ("Floyd Shote", "b. 1934", 5, False),
    "emmett": ("Emmett Shote", "b. 1930", 8, False),
    "hattie": ("Hattie Shote", "b. 1933", 7, False),
    "roscoe": ("Roscoe Shote", "b. 1935", 5, False),
    "viola": ("Viola Shote", "b. 1932", 7, False),
    "josephine": ("Josephine Shote", "b. 1935", 6, False),
    "mattie": ("Mattie Shote", "b. 1936", 5, False),
    "cleveland": ("Cleveland Shote", "b. 1934", 8, False),
    "eula": ("Eula Shote", "b. 1937", 6, False),
    "alonzo": ("Alonzo Shote", "b. 1938", 5, False),
    "magnolia": ("Magnolia Shote", "b. 1941", 4, False),
    "sadie": ("Sadie Shote", "b. 1956", 4, False),
    "otis": ("Otis Shote", "b. 1959", 3, False),
    "irene": ("Irene Shote", "b. 1958", 4, False),
    "langston": ("Langston Shote", "b. 1957", 5, False),
    "dorothy": ("Dorothy Shote", "b. 1960", 3, False),
    "geraldine": ("Geraldine Shote", "b. 1955", 4, False),
    "hollis": ("Hollis Shote", "b. 1959", 3, False),
    "marva": ("Marva Shote", "b. 1962", 4, False),
    "vernon": ("Vernon Shote", "b. 1961", 3, False),
    "earlene": ("Earlene Shote", "b. 1958", 4, False),
    "thaddeus": ("Thaddeus Shote", "b. 1960", 3, False),
    "ruby": ("Ruby Shote", "b. 1963", 5, False),
    "isaiah": ("Isaiah Shote", "b. 1962", 3, False),
    "jordan": ("Jordan Shote", "Born 1972 · Denver, CO", None, True),
    "alma": ("Alma Shote", "b. 1963", 3, False),
    "felix": ("Felix Shote", "b. 1965", 2, False),
    "naomi": ("Naomi Shote", "b. 1964", 3, False),
    "grace": ("Grace Shote", "b. 1966", 2, False),
    "amara": ("Amara Shote", "b. 1985", 2, False),
    "jaylen": ("Jaylen Shote", "b. 1988", 1, False),
    "nya": ("Nya Shote", "b. 1987", 2, False),
    "ellis": ("Ellis Shote", "b. 1990", 1, False),
    "zion": ("Zion Shote", "b. 1986", 2, False),
    "kayla": ("Kayla Shote", "b. 1989", 1, False),
    "trevon": ("Trevon Shote", "b. 1984", 2, False),
    "sanaa": ("Sanaa Shote", "b. 1991", 1, False),
    "elijah": ("Elijah Shote", "b. 1983", 3, False),
    "aaliyah": ("Aaliyah Shote", "b. 1986", 2, False),
    "noah": ("Noah Shote", "b. 1988", 2, False),
    "malik": ("Malik Shote", "b. 1989", 1, False),
    "brianna": ("Brianna Shote", "b. 1992", 1, False),
    "darius": ("Darius Shote", "b. 1987", 2, False),
    "talia": ("Talia Shote", "b. 1985", 2, False),
    "jaden": ("Jaden Shote", "b. 1988", 1, False),
    "soraya": ("Soraya Shote", "b. 1990", 2, False),
    "omari": ("Omari Shote", "b. 1990", 1, False),
    "leila": ("Leila Shote", "b. 1993", 1, False),
    "xavier": ("Xavier Shote", "b. 2001", 1, False),
    "nyla": ("Nyla Shote", "b. 1990", 2, False),
    "kaden": ("Kaden Shote", "b. 1993", 1, False),
    "anaya": ("Anaya Shote", "b. 1991", 2, False),
    "micah": ("Micah Shote", "b. 1994", 1, False),
}

BRANCHES = ["ruth", "henry", "della", "moses"]
BRANCH_LABEL = {
    "ruth": "Ruth line",
    "henry": "Henry line",
    "della": "Della line",
    "moses": "Moses line",
}

# Generation sections: (section id, era tag, [(branch, [person ids])])
GENERATIONS = [
    (
        "gen-2",
        "1860S",
        [
            ("ruth", ["ruth"]),
            ("henry", ["henry"]),
            ("della", ["della"]),
            ("moses", ["moses"]),
        ],
    ),
    (
        "gen-3",
        "1890S",
        [
            ("ruth", ["ada", "cora"]),
            ("henry", ["walter", "jesse"]),
            ("della", ["pearlie", "odessa"]),
            ("moses", ["booker", "silas"]),
        ],
    ),
    (
        "gen-4",
        "1930S",
        [
            ("ruth", ["lena", "ruthie", "bernice", "floyd"]),
            ("henry", ["emmett", "hattie", "roscoe"]),
            ("della", ["viola", "josephine", "mattie"]),
            ("moses", ["cleveland", "eula", "alonzo", "magnolia"]),
        ],
    ),
    (
        "gen-5",
        "1960S",
        [
            ("ruth", ["sadie", "otis", "irene", "langston", "dorothy"]),
            ("henry", ["geraldine", "hollis", "marva", "vernon"]),
            ("della", ["earlene", "thaddeus", "ruby", "isaiah"]),
            ("moses", ["jordan", "alma", "felix", "naomi", "grace"]),
        ],
    ),
    (
        "gen-6",
        "TODAY",
        [
            (
                "ruth",
                ["amara", "jaylen", "nya", "ellis", "zion", "kayla", "trevon", "sanaa"],
            ),
            ("henry", ["elijah", "aaliyah", "noah", "malik", "brianna", "darius"]),
            ("della", ["talia", "jaden", "soraya", "omari", "leila"]),
            ("moses", ["xavier", "nyla", "kaden", "anaya", "micah"]),
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


def initials(name):
    return "".join(w[0] for w in name.split()[:2])


def card(pid, branch, delay):
    name, meta, plus, focus = PERSON[pid]
    cls = "pcard focus" if focus else "pcard"
    parts = [
        (
            f'<article class="{cls}" id="p-{pid}" data-branch="{branch}" '
            f'style="--d:{delay:.2f}s">'
        )
    ]
    parts.append(f'<span class="medal" aria-hidden="true">{esc(initials(name))}</span>')
    parts.append('<span class="pcard-body">')
    parts.append(f'<span class="pname">{esc(name)}</span>')
    parts.append(f'<span class="pmeta">{esc(meta)}</span>')
    if focus:
        parts.append('<a class="view-story" href="person.html">View story</a>')
    else:
        head = "the whole Shote family" if branch == "family" else BRANCH_LABEL[branch]
        parts.append(
            f'<button class="relatives" type="button" data-branch="{branch}" '
            f'aria-label="{esc(name)}: open the collection for {esc(head)}">'
            f"+{plus} relatives</button>"
        )
    parts.append("</span></article>")
    return "".join(parts)


def couple_section():
    parts = ['<section class="gen" id="gen-1" data-era="1830">']
    parts.append('<p class="era-tag" aria-hidden="true">1830S</p>')
    parts.append('<div class="couple">')
    parts.append(card("amos", "family", 0.0))
    parts.append('<span class="couple-link" aria-hidden="true"></span>')
    parts.append(card("celia", "family", 0.08))
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
            parts.append(card(pid, branch, ci * 0.05 + ki * 0.05))
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
    people = len(PERSON)
    print(f"journey fragment written: {people} sample people")


if __name__ == "__main__":
    main()
