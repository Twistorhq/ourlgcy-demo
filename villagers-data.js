// Our LGCY Community tab: the villager records (TW-1077).
//
// This file is the village roster's single data source. The
// village layer (village.js) holds no names, years, or lineage
// facts of its own: it reads these records and derives everything
// else (era dress, rounds, roster text) from them by rule.
//
// Records currently mirror the demo's people records in
// tools/build_journey.py (the fictional sample family). When the
// real lineage pack lands (TW-1155), this file's records are
// replaced with the pack's records in this same schema and the
// village swaps with no code change.
//
// Status law: every fact carries its status. bornStatus is one of
//   "documented"  the year is backed by a record; the village may
//                 dress the figure from it and print it as fact.
//   "probable"    family-reported, not yet documented; the year
//                 prints labeled probable, and the figure stays
//                 era-neutral rather than dressed from it.
//   "lead"        a research lead only; the year is not printed
//                 as fact and the figure stays era-neutral.
//   "unknown"     no year in the record; era-neutral.
// Era dress is derived ONLY from a documented year, figured at
// birth year plus 25. Presentation fields (kit, hat, prop, hair,
// accent, pace, scale) are drawing choices for the figure, never
// facts, and they are only used when the year is documented.

window.LGCY_VILLAGERS = [
  { id: "amos", name: "Amos Shote", born: 1831, bornStatus: "documented", line: "The founding couple", relatives: "+12 relatives",
    present: { kit: "coat", hat: "brim", prop: "cane", hair: "gray", accent: "#2c5240", speed: 24, scale: 1.0 } },
  { id: "celia", name: "Celia Shote", born: 1836, bornStatus: "documented", line: "The founding couple", relatives: "+9 relatives",
    present: { kit: "gown", hat: "bonnet", prop: "basket", apron: true, hair: "bun-gray", accent: "#7c2d26", speed: 24, scale: 0.98 } },
  { id: "ruth", name: "Ruth Shote", born: 1858, bornStatus: "documented", line: "Ruth line", relatives: "+21 relatives",
    present: { kit: "gown", hat: "brim", prop: null, hair: "bun", accent: "#2c5240", speed: 27, scale: 1.0 } },
  { id: "henry", name: "Henry Shote", born: 1861, bornStatus: "documented", line: "Henry line", relatives: "+18 relatives",
    present: { kit: "suit", hat: "bowler", prop: null, hair: "short", accent: "#454e47", speed: 29, scale: 1.02 } },
  { id: "della", name: "Della Shote", born: 1864, bornStatus: "documented", line: "Della line", relatives: "+15 relatives",
    present: { kit: "gown", hat: "brim", prop: "book", hair: "bun", accent: "#a84c16", speed: 27, scale: 0.99 } },
  { id: "moses", name: "Moses Shote", born: 1867, bornStatus: "documented", line: "Moses line", relatives: "+19 relatives",
    present: { kit: "suit", hat: "bowler", prop: "cane", hair: "gray", accent: "#454e47", speed: 28, scale: 1.01 } },
  { id: "ada", name: "Ada Shote", born: 1883, bornStatus: "documented", line: "Ruth line", relatives: "+11 relatives",
    present: { kit: "blouseSkirt", hat: "brim", prop: null, hair: "long", accent: "#7d5a13", speed: 30, scale: 0.97 } },
  { id: "booker", name: "Booker Shote", born: 1890, bornStatus: "documented", line: "Moses line", relatives: "+13 relatives",
    present: { kit: "jacket", hat: "cap", prop: null, hair: "short", accent: "#a84c16", speed: 34, scale: 1.0 } },
  { id: "lena", name: "Lena Shote", born: 1929, bornStatus: "documented", line: "Ruth line", relatives: "+8 relatives",
    present: { kit: "dress50s", hat: null, prop: null, hair: "bun", accent: "#7c2d26", speed: 29, scale: 0.98 } },
  { id: "emmett", name: "Emmett Shote", born: 1930, bornStatus: "documented", line: "Henry line", relatives: "+8 relatives",
    present: { kit: "shirt", hat: "fedora", prop: null, hair: "short", accent: "#2c5240", speed: 31, scale: 1.01 } },
  { id: "sadie", name: "Sadie Shote", born: 1956, bornStatus: "documented", line: "Ruth line", relatives: "+4 relatives",
    present: { kit: "modernF", hat: null, prop: null, hair: "long", accent: "#7d5a13", speed: 33, scale: 0.99 } },
  { id: "jordan", name: "Jordan Shote", born: 1972, bornStatus: "documented", line: "Moses line", relatives: "The focus card of the home tree",
    present: { kit: "jacketModern", hat: null, prop: null, hair: "short", accent: "#a84c16", speed: 34, scale: 1.02 } },
  { id: "amara", name: "Amara Shote", born: 1985, bornStatus: "documented", line: "Ruth line", relatives: "+2 relatives",
    present: { kit: "modernDress", hat: null, prop: null, hair: "long", accent: "#2c5240", speed: 33, scale: 0.98 } },
  { id: "xavier", name: "Xavier Shote", born: 2001, bornStatus: "documented", line: "Moses line", relatives: "+1 relatives",
    present: { kit: "hoodie", hat: null, prop: null, hair: "short", accent: "#454e47", speed: 38, scale: 1.0 } }
];
