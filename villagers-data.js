// Our LGCY Community tab: the villager records (TW-1077).
//
// This file is the village roster's single data source. The
// village layer holds no names, years, or lineage facts of its
// own: it reads these records and derives everything else (era
// dress, rounds, roster text) from them by rule.
//
// THE PUBLIC PREVIEW ROSTER IS EMPTY (TW-1275): no sample family
// stands here. A family's villagers come from their own lineage
// pack, in this same schema, once they sign in and add their
// people; the village swaps with no code change.
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
//
// Frozen-age law (TW-1227, Nov 20 2026): a person is kept at the
// age they were when they passed, forever, while the world
// around them stays in the current year. died and diedStatus
// carry the passing year under the same status law as
// born/bornStatus. The frozen age is derived ONLY when both
// years are documented (frozenAge = died - born); the village
// renders the figure at that age (graying, stature) and the
// roster names it. A record with no documented passing year
// keeps no frozen age: the figure is drawn as before. This field
// pair is part of the record schema on purpose, so the law
// survives later card and intake work untouched.

window.LGCY_VILLAGERS = [];
