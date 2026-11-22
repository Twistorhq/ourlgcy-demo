#!/usr/bin/env python3
"""Generate the branch collection panel data for app.js.

Reads data/lineage-phase1.json (a family's lineage pack) and
rewrites the BRANCHES object in app.js between the LINEAGE-PANEL
markers. Every panel row is a pack fact with its status and source
carried along, and every conflict in the pack rides as an
open-question row with its decider named. Nothing is paraphrased
into a stronger claim: values print as the pack states them, and
person-id values resolve to names only.

The public preview pack is empty (TW-1275): the panel generates
empty with it, and a family's own pack, built from their uploads
after sign-in, fills it with no code change. Everything below is
derived from the pack; no person, line, or branch is named here.
"""

import json
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
PACK = json.loads((ROOT / "data" / "lineage-phase1.json").read_text(encoding="utf-8"))
PEOPLE = {p["id"]: p for p in PACK["people"]}

# A person's panel branch is the first word of their line, lowered;
# the root person and anyone the pack marks as riding the whole-tree
# panel can be assigned "family" by the pack's own panel_branch
# field. Nothing is assigned here by name.
PANEL_BRANCH = {}
for _p in PACK["people"]:
    PANEL_BRANCH[_p["id"]] = _p.get("panel_branch") or _p["line"].split()[0].lower()
if PACK.get("root_person"):
    PANEL_BRANCH[PACK["root_person"]] = "family"

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
}
# A pack may carry its own source labels in its source_labels map;
# unlabeled sources print as the pack states them.
SOURCE_SHORT.update(PACK.get("source_labels", {}))

# Short decider labels for the open-question rows, keyed by
# (person id, field). A pack may carry its own short labels in its
# decider_short map; the full decider text always lives in the
# pack's conflicts array and on person.html. Default, when no short
# label is carried: "Decider named in the pack".
DECIDER_SHORT = dict(PACK.get("decider_short", {}))


def branch_title(branch, people):
    """Panel title for a branch: the line as the pack states it."""
    for p in people:
        if PANEL_BRANCH[p["id"]] == branch:
            return p["line"]
    return branch


# The family panel shows anchor facts, then every open question in
# the pack. Anchors are derived: the first fact of each of the
# first six people in the pack who carry facts.
FAMILY_ANCHORS = [
    (p["id"], p["facts"][0]["field"]) for p in PACK["people"][:6] if p.get("facts")
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

    for branch in sorted(b for b in by_branch if b != "family"):
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
            "title": branch_title(branch, PACK["people"]),
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
        "title": "The whole tree",
        "count": total,
        "records": fam_rows,
    }

    ordered = {"family": branches["family"]}
    for k in sorted(branches):
        if k != "family":
            ordered[k] = branches[k]
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
