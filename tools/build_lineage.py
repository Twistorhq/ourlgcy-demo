#!/usr/bin/env python3
"""Generate the branch collection panel data for app.js (TW-1155).

Reads data/lineage-phase1.json (the public layer of the verified
lineage pack) and rewrites the BRANCHES object in app.js between the
LINEAGE-PANEL markers. Every panel row is a pack fact with its status
and source carried along, and every conflict in the pack rides as an
open-question row with its decider named. Nothing is paraphrased into
a stronger claim: values print as the pack states them, and person-id
values resolve to names only.
"""

import json
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
PACK = json.loads((ROOT / "data" / "lineage-phase1.json").read_text(encoding="utf-8"))
PEOPLE = {p["id"]: p for p in PACK["people"]}

PANEL_BRANCH = {
    "justynn-hammond": "family",
    "joseph-mathews-sr": "family",
    "troy-wright": "jackson",
}
for _p in PACK["people"]:
    PANEL_BRANCH.setdefault(_p["id"], _p["line"].split()[0].lower())

FIELD_LABEL = {
    "name": "Name as carried",
    "name_variant": "Name as recorded",
    "name_variants": "Names as recorded",
    "birth_name": "Birth name",
    "later_name": "Later name",
    "birth_date": "Born",
    "birth_year": "Born (year)",
    "birth_year_alt": "Birth year, second reading",
    "birth_place": "Born in",
    "death_date": "Died",
    "death_year": "Died (year)",
    "death_place_candidate": "Death place, family reading",
    "last_residence": "Last residence (SSDI)",
    "burial": "Buried",
    "father": "Father",
    "mother": "Mother",
    "spouse": "Spouse",
    "father_name": "Father (name only)",
    "mother_name": "Mother (name only)",
    "children": "Children",
    "residence": "Residence",
    "residence_1940": "1940 residence",
    "household_1940": "1940 household",
    "household_role": "Household role",
    "family_account": "Family account",
    "documentation_status": "Documentation",
    "identity_candidate": "Identity candidate",
    "caution_namesakes": "Namesake caution",
    "migration": "Migration",
    "vital_status": "Vital status",
    "name_as_indexed_1940": "Name as indexed, 1940",
    "mother_candidate": "Mother candidate",
}

SOURCE_SHORT = {
    "seed-tree": "Family tree",
    "tw-1148": "TW-1148 research",
    "tw-1150": "TW-1150 research",
    "tw-1151": "TW-1151 research",
}

# Short decider labels for the open-question rows; the full decider
# text lives in the pack's conflicts array and on person.html.
DECIDER_SHORT = {
    ("curtis-franklin-hammond", "birth_year"): "His SS-5 decides",
    ("emma-jean-jackson", "father"): "Her SS-5 decides",
    ("oddie-criner-gooden", "death_place"): "Washington Death Index decides",
    ("andrew-jackson-gooden", "mother"): "His 1960 death certificate decides",
    ("emma-jean-jackson", "birth_year"): "Her birth record decides",
    ("dora-weathers", "birth_year"): "Earlier census pulls decide",
}

TITLES = {
    "family": "Justynn's direct lines, the whole tree",
    "hammond": "Hammond line",
    "jackson": "Jackson line",
    "gooden": "Gooden line",
    "criner": "Criner line",
}

# The family panel shows anchor facts, one per line plus the root
# record, then every open question in the pack.
FAMILY_ANCHORS = [
    ("frank-hammond", "documentation_status"),
    ("james-j-hammond", "family_account"),
    ("emma-jean-jackson", "residence_1940"),
    ("melvin-andrew-gooden", "birth_date"),
    ("oddie-criner-gooden", "birth_date"),
    ("elouise-morris", "migration"),
]


def source_short(src):
    if src.startswith("people/"):
        return "Family record"
    return SOURCE_SHORT.get(src, src)


def resolve(value):
    return PEOPLE[value]["name"] if value in PEOPLE else value


def first_name(pid):
    return PEOPLE[pid]["name"].split()[0]


def fact_row(pid, fact):
    label = f"{first_name(pid)} · {FIELD_LABEL.get(fact['field'], fact['field'])}"
    meta = f"{fact['status']} · {source_short(fact['source'])}"
    return [label, resolve(fact["value"]), meta]


def conflict_row(conf):
    pid = conf["person"]
    readings = " / ".join(f"{r['value']} ({r['status']})" for r in conf["readings"])
    decider = DECIDER_SHORT.get((pid, conf["field"]), "Decider named in the pack")
    label = f"Open question · {first_name(pid)} · {conf['field'].replace('_', ' ')}"
    return [label, readings, f"Open · {decider}"]


def build():
    branches = {}
    by_branch = {}
    for p in PACK["people"]:
        by_branch.setdefault(PANEL_BRANCH[p["id"]], []).append(p)

    for branch in ("hammond", "jackson", "gooden", "criner"):
        rows = []
        count = 0
        for p in by_branch.get(branch, []):
            for fact in p["facts"]:
                rows.append(fact_row(p["id"], fact))
                count += 1
        for conf in PACK["conflicts"]:
            if PANEL_BRANCH[conf["person"]] == branch:
                rows.append(conflict_row(conf))
        branches[branch] = {
            "title": TITLES[branch],
            "count": count,
            "records": rows,
        }

    fam_rows = []
    for pid, field in FAMILY_ANCHORS:
        for fact in PEOPLE[pid]["facts"]:
            if fact["field"] == field:
                fam_rows.append(fact_row(pid, fact))
    for conf in PACK["conflicts"]:
        fam_rows.append(conflict_row(conf))
    total = sum(len(p["facts"]) for p in PACK["people"])
    branches["family"] = {
        "title": TITLES["family"],
        "count": total,
        "records": fam_rows,
    }

    ordered = {
        k: branches[k] for k in ("family", "hammond", "jackson", "gooden", "criner")
    }
    return ordered


def main():
    app = ROOT / "app.js"
    js = app.read_text(encoding="utf-8")
    start = "/* LINEAGE-PANEL:START */"
    end = "/* LINEAGE-PANEL:END */"
    head, sep, rest = js.partition(start)
    if not sep:
        raise SystemExit("LINEAGE-PANEL:START marker not found in app.js")
    _, sep2, tail = rest.partition(end)
    if not sep2:
        raise SystemExit("LINEAGE-PANEL:END marker not found in app.js")
    branches = build()
    body = (
        "\n  var BRANCHES = "
        + json.dumps(branches, indent=2, ensure_ascii=False).replace("\n", "\n  ")
        + ";\n  "
    )
    app.write_text(head + start + body + end + tail, encoding="utf-8")
    counts = {k: v["count"] for k, v in branches.items()}
    print(f"panel data written: {counts}")


if __name__ == "__main__":
    main()
