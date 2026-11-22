// Our LGCY Community, overhead world: the people's records (TW-1232).
//
// The world layer (world.js) holds no names, years, or lineage
// facts of its own: it reads these records and derives everything
// else (era dress, frozen age, rounds, greetings) from them by
// rule, the same discipline village.js kept for the street.
//
// Records are drawn from a family's lineage pack
// (data/lineage-phase1.json). Only people the pack marks as passed
// appear here; living people never walk the world.
//
// THE PUBLIC PREVIEW PACK IS EMPTY (TW-1275): this roster ships
// with nobody in it. A first-time visitor's world stands empty,
// and a family's own people appear here only from their own pack,
// built from their uploads after sign-in. No sample roster stands
// in for them.
//
// Status law (carried from villagers-data.js, TW-1077/TW-1227):
// every year carries its status. Era dress is derived ONLY from
// a documented birth year, figured at birth year plus 25 (the
// decade of young adulthood). A probable year dresses nobody:
// the figure stays era-neutral. The frozen age (the age they
// were when they passed, kept forever) is derived ONLY when
// both years are documented (frozenAge = died - born).
//
// Saturday law (TW-1232): a figure wears school colors at the
// stadium only where college attendance is documented in the
// pack; the colors ride on that figure's own record, never here.
//
// Presentation fields (kit, hat, hair, skin, pace, home, rounds,
// lines, prop) are drawing and staging choices for the figure,
// never facts.
//
// Appearance mechanism (TW-1238, built generally: this is how
// ANY family's world gets its people): each record carries an
// appearance block (present) with skin tone, hair style, hair
// color, build, glasses, and dress. Where the family has
// uploaded a photo of the person, those attributes are derived
// from the photo and the record's photo field names it; the
// sprite is painted from the attributes either way, and stays
// abstract (likeness law: a photo informs character, it is
// never a copied face). Where no photo exists, attributes come
// from the documented record (era dress from documented years,
// gray hair where the documented age at passing supports it)
// plus stated presentation choices across the family's real
// range of skin tones and hair textures, never one generic
// default.
//
// Skin-tone rule (TW-1238): where a person's tone is unsure
// (no photo, no record), the default is the mixed and dark
// brown range, varied person to person across a real range,
// never one flat tone for everyone. A photo-derived tone wins
// wherever a photo exists. The generic crowd and spectator pool
// draws from the same range.
//
// Transport (TW-1241): a figure whose young-adulthood decade
// (birth year plus 25, the world's own era figuring) predates
// the automobile travels their rounds by horse and buggy: the
// rig works the roads, stops at the filling station, and parks
// at the gates on Saturday. Transport is a presentation field
// like kit or hat, never a fact: it is assigned on the record
// from the years the pack carries. Later eras' vehicles (a
// Model T, a sedan of the fifties) live in the world as ambient
// and parked life in world.js, the way the street carried them.

window.LGCY_WORLD_PEOPLE = [];

// The signed-in person: the visitor at the center of their own
// community, drawn in the present day. In the public preview the
// visitor is unnamed and carries no record: when a person signs
// in, their own record takes this place, name and all, and the
// world's greetings use it.
window.LGCY_WORLD_PLAYER = {
  id: "visitor", name: "",
  present: { kit: "#20555e", kitDark: "#173f45", hat: null, hatColor: null, hair: "short", hairColor: "#1d130c", hairTexture: "coily", build: "average", glasses: false, photo: null, skin: "#7a4c28", speed: 120 }
};
