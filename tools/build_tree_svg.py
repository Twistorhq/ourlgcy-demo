#!/usr/bin/env python3
"""Generate the mother-tree SVG fragment for the Our LGCY demo home page.

Sample data only: an invented Shote family. One root record (c. 1810),
a founding couple, then six generations trickling down to present-day
leaves. Layout: leaves take even slots, parents center over their
children. Prints the SVG fragment to stdout; index.html assembly
replaces the TREE_SVG placeholder with this output.
"""

BRANCH_COLORS = {
    "ruth": "#9db98a",
    "henry": "#c9a45c",
    "della": "#d08c7a",
    "moses": "#8fb8ad",
}
BRANCH_COUNTS = {"ruth": 14, "henry": 11, "della": 9, "moses": 12}

# (name, year label or None, branch id or None, [children])
TREE = (
    "Amos Shote", "b. 1831", None, [
        ("Ruth Shote", "b. 1858", "ruth", [
            ("Ada Shote", "b. 1883", None, [
                ("Lena Shote", None, None, [("Sadie", None, None, [("Amara", None, None, []), ("Jaylen", None, None, [])]),
                                            ("Otis", None, None, [("Nya", None, None, []), ("Ellis", None, None, [])])]),
                ("Ruthie Shote", None, None, [("Irene", None, None, [("Zion", None, None, []), ("Kayla", None, None, [])])]),
            ]),
            ("Cora Shote", "b. 1886", None, [
                ("Bernice Shote", None, None, [("Langston", None, None, [("Trevon", None, None, [])])]),
                ("Floyd Shote", None, None, [("Dorothy", None, None, [("Sanaa", None, None, [])])]),
            ]),
        ]),
        ("Henry Shote", "b. 1861", "henry", [
            ("Walter Shote", "b. 1885", None, [
                ("Emmett Shote", None, None, [("Geraldine", None, None, [("Elijah", None, None, []), ("Aaliyah", None, None, [])])]),
                ("Hattie Shote", None, None, [("Hollis", None, None, [("Noah", None, None, [])]),
                                              ("Marva", None, None, [("Malik", None, None, []), ("Brianna", None, None, [])])]),
            ]),
            ("Jesse Shote", "b. 1889", None, [
                ("Roscoe Shote", None, None, [("Vernon", None, None, [("Darius", None, None, [])])]),
            ]),
        ]),
        ("Della Shote", "b. 1864", "della", [
            ("Pearlie Shote", "b. 1888", None, [
                ("Viola Shote", None, None, [("Earlene", None, None, [("Talia", None, None, [])])]),
                ("Josephine Shote", None, None, [("Thaddeus", None, None, [("Jaden", None, None, [])]),
                                                  ("Ruby", None, None, [("Soraya", None, None, [])])]),
            ]),
            ("Odessa Shote", "b. 1891", None, [
                ("Mattie Shote", None, None, [("Isaiah", None, None, [("Omari", None, None, []), ("Leila", None, None, [])])]),
            ]),
        ]),
        ("Moses Shote", "b. 1867", "moses", [
            ("Booker Shote", "b. 1890", None, [
                ("Cleveland Shote", None, None, [("Coleman", None, None, [("Xavier", None, None, [])])]),
                ("Eula Shote", None, None, [("Alma", None, None, [("Nyla", None, None, [])]),
                                            ("Felix", None, None, [("Kaden", None, None, [])])]),
            ]),
            ("Silas Shote", "b. 1894", None, [
                ("Alonzo Shote", None, None, [("Naomi", None, None, [("Anaya", None, None, [])])]),
                ("Magnolia Shote", None, None, [("Grace", None, None, [("Micah", None, None, [])])]),
            ]),
        ]),
    ]
)

W = 1680
ROW_Y = {0: 64, 1: 238, 2: 378, 3: 518, 4: 658, 5: 798, 6: 938}
ROW_R = {1: 27, 2: 24, 3: 20, 4: 16, 5: 12, 6: 9}
NAME_SIZE = {1: 19, 2: 18, 3: 16.5, 4: 14.5, 5: 13.5, 6: 13}
EDGE_W = {2: 7, 3: 5.5, 4: 4.5, 5: 3.5, 6: 2.5}
GEN_LABELS = {0: "C. 1810", 1: "1830S", 2: "1860S", 3: "1880S", 4: "1910S", 5: "1940S", 6: "TODAY"}

positions = {}  # id(node) -> (x, y, gen, branch)
leaf_counter = [0]


def leaves(node):
    kids = node[3]
    if not kids:
        return 1
    return sum(leaves(k) for k in kids)


TOTAL_LEAVES = leaves(TREE)
SLOT = W / TOTAL_LEAVES


def layout(node, gen, branch):
    name, _yr, bid, kids = node
    branch = bid or branch
    if not kids:
        x = (leaf_counter[0] + 0.5) * SLOT
        leaf_counter[0] += 1
    else:
        xs = [layout(k, gen + 1, branch) for k in kids]
        x = (xs[0] + xs[-1]) / 2
    positions[id(node)] = (x, ROW_Y[gen], gen, branch)
    return x


def esc(s):
    return s.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;")


def edge(x1, y1, x2, y2, color, w):
    my = (y1 + y2) / 2
    return (f'<path d="M{x1:.1f} {y1:.1f} C {x1:.1f} {my:.1f}, '
            f'{x2:.1f} {my:.1f}, {x2:.1f} {y2:.1f}" fill="none" '
            f'stroke="{color}" stroke-width="{w}" stroke-linecap="round"/>')


def draw_edges(node, from_xy=None):
    name, _yr, bid, kids = node
    x, y, gen, branch = positions[id(node)]
    out = []
    for k in kids:
        kx, ky, kgen, kbranch = positions[id(k)]
        color = BRANCH_COLORS[kbranch]
        sx, sy = from_xy if from_xy else (x, y)
        out.append(edge(sx, sy, kx, ky - ROW_R[kgen], color, EDGE_W[kgen]))
        out.append(draw_edges(k))
    return "".join(out)


def draw_node(node):
    name, yr, bid, kids = node
    x, y, gen, branch = positions[id(node)]
    r = ROW_R[gen]
    color = BRANCH_COLORS[branch] if branch else "#c9a45c"
    parts = []
    parts.append(
        f'<circle cx="{x:.1f}" cy="{y}" r="{r}" fill="#efe7d0" '
        f'stroke="{color}" stroke-width="3"/>')
    if gen <= 4:
        initials = "".join(w[0] for w in name.split()[:2])
        parts.append(
            f'<text class="ti" x="{x:.1f}" y="{y + r * 0.36:.1f}" '
            f'font-size="{r * 0.92:.0f}">{esc(initials)}</text>')
    label = name if gen <= 4 else name.split()[0]
    parts.append(
        f'<text class="tn" x="{x:.1f}" y="{y + r + 19}" '
        f'font-size="{NAME_SIZE[gen]}">{esc(label)}</text>')
    if yr:
        parts.append(
            f'<text class="ty" x="{x:.1f}" y="{y + r + 36}" '
            f'font-size="12">{esc(yr)}</text>')
    if gen == 2 and bid:
        cx = x + r + 14
        cy = y - 26
        parts.append(
            f'<g class="branch-chip" data-branch="{bid}" tabindex="0" '
            f'role="button" aria-label="{esc(name)} branch, '
            f'{BRANCH_COUNTS[bid]} sample records. View the collection.">'
            f'<rect class="chip-bg" x="{cx:.0f}" y="{cy}" width="160" '
            f'height="52" rx="9" stroke="{color}"/>'
            f'<rect x="{cx + 13:.0f}" y="{cy + 16}" width="13" height="19" '
            f'fill="none" stroke="#1d2320" stroke-width="2"/>'
            f'<path d="M{cx + 16:.0f} {cy + 22} h7 M{cx + 16:.0f} {cy + 27} '
            f'h7 M{cx + 16:.0f} {cy + 32} h7" stroke="#1d2320" '
            f'stroke-width="1.6"/>'
            f'<text class="chip-t" x="{cx + 36:.0f}" y="{cy + 34}">'
            f'{BRANCH_COUNTS[bid]} records</text></g>')
    for k in kids:
        parts.append(draw_node(k))
    return "".join(parts)


root_x = layout(TREE, 1, None)
amos_x, amos_y, _g, _b = positions[id(TREE)]
celia_x = amos_x - 116
mid_x = (amos_x + celia_x) / 2

svg = []
svg.append(
    f'<svg id="mother-tree" viewBox="0 0 {W} 1010" role="img" '
    f'aria-label="Family tree diagram. One sample root record for the '
    f'Shote family, dated about 1810, branches down through six '
    f'generations to present day descendants. Four main branches carry '
    f'record collections, shown as records chips.">')

# generation labels
for gen, label in GEN_LABELS.items():
    svg.append(
        f'<text class="gen" x="16" y="{ROW_Y[gen] + 4}">{label}</text>')

# trunk from root record to the couple midpoint
svg.append(
    f'<path d="M{mid_x:.1f} 112 C {mid_x:.1f} 168, {mid_x:.1f} 196, '
    f'{mid_x:.1f} {amos_y}" fill="none" stroke="#c9a45c" '
    f'stroke-width="11" stroke-linecap="round"/>')
# couple link
svg.append(
    f'<line x1="{celia_x:.1f}" y1="{amos_y}" x2="{amos_x:.1f}" '
    f'y2="{amos_y}" stroke="#c9a45c" stroke-width="5"/>')
# descendant edges from the couple midpoint
svg.append(draw_edges(TREE, from_xy=(mid_x, amos_y)))

# root record card
svg.append(
    f'<g><rect x="{mid_x - 220:.0f}" y="20" width="440" height="92" '
    f'rx="12" fill="#b9872c" stroke="#efe7d0" stroke-width="2"/>'
    f'<text class="root-t" x="{mid_x:.0f}" y="56" font-size="21" '
    f'font-weight="700" letter-spacing="3">THE SHOTE FAMILY</text>'
    f'<text class="root-t" x="{mid_x:.0f}" y="80" font-size="15.5">'
    f'Oldest related record &#183; c. 1810</text>'
    f'<text class="root-t" x="{mid_x:.0f}" y="100" font-size="12">'
    f'Sample record</text></g>')

# Celia (partner, drawn beside Amos)
svg.append(
    f'<circle cx="{celia_x:.1f}" cy="{amos_y}" r="27" fill="#efe7d0" '
    f'stroke="#c9a45c" stroke-width="3"/>'
    f'<text class="ti" x="{celia_x:.1f}" y="{amos_y + 10}" '
    f'font-size="25">CS</text>'
    f'<text class="tn" x="{celia_x:.1f}" y="{amos_y + 46}" '
    f'font-size="19">Celia Shote</text>'
    f'<text class="ty" x="{celia_x:.1f}" y="{amos_y + 63}" '
    f'font-size="12">b. 1836</text>')

svg.append(draw_node(TREE))
svg.append("</svg>")
print("".join(svg))
