// Our LGCY Community, overhead world: the people's records (TW-1232).
//
// The world layer (world.js) holds no names, years, or lineage
// facts of its own: it reads these records and derives everything
// else (era dress, frozen age, rounds, greetings) from them by
// rule, the same discipline village.js kept for the street.
//
// Records are drawn from the phase-1 lineage pack
// (data/lineage-phase1.json, TW-1155). Only people the pack marks
// as passed appear here; living people never walk the world.
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
// stadium only where college attendance is documented. The one
// documented attendance in the pack's orbit is Elouise Morris:
// her own funeral program (TW-1231 annex) states she attended
// San Francisco State College and San Francisco City College.
// San Francisco State's colors are purple and gold; they are
// presentation for that documented fact, nothing more.
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
// default. As of this pass, NO roster person has an uploaded
// photo on file (photo: null throughout): every sprite below
// is record-driven, and the gap is stated, not filled.
//
// Skin-tone rule (founder, TW-1238): where a person's tone is
// unsure (no photo, no record), the default is the mixed and
// dark brown range, varied person to person across a real
// range, never one flat tone for everyone. A photo-derived
// tone wins wherever a photo exists. The roster below is all
// unsure cases today, so its tones are assigned one by one
// across #54331d (deep dark brown) to #a9744a (warm medium
// brown); the generic crowd and spectator pool draws from the
// same range.
//
// Transport (TW-1241): the founder asked where the horse and
// buggies are in daily life. A figure whose young-adulthood
// decade (birth year plus 25, the world's own era figuring)
// predates the automobile travels their rounds by horse and
// buggy: the rig works the roads, stops at the filling
// station, and parks at the gates on Saturday. Transport is a
// presentation field like kit or hat, never a fact: it is
// assigned from the years the pack carries (James J Hammond,
// born 1865, young adulthood in the 1890s; Dora Weathers, born
// 1895, young adulthood in the 1910s on a farm 8.5 miles out
// of Bristow, where the family's own account puts horse
// transport in daily use). Both years are Probable in the
// pack, and the assignment asserts nothing on any card; the
// dress law is untouched. Later eras' vehicles (a Model T, a
// sedan of the fifties) live in the world as ambient and
// parked life in world.js, the way the street carried them.

window.LGCY_WORLD_PEOPLE = [
  { id: "elouise-morris", name: "Elouise Morris", born: 1915, bornStatus: "documented", died: 2011, diedStatus: "documented",
    line: "Criner line", gender: "f",
    present: { kit: "#5b3a8e", kitDark: "#452c6e", hat: "church", hatColor: "#e8ddc4", hair: "bun-gray", skin: "#8a5a34", hairColor: "#cfc8ba", hairTexture: "straight", build: "average", glasses: false, photo: null, speed: 25, prop: null },
    home: "h5", rounds: ["church", "plazaW", "church", "home"],
    lines: ["Hi Justynn! How's it going?", "There he is. Come here, baby.", "I was just thinking about you."],
    saturday: { role: "stands", attendee: true, school: "San Francisco State", colors: ["#5b3a8e", "#e3a81c"] } },
  { id: "oddie-criner-gooden", name: "Oddie Lee Criner Gooden", born: 1933, bornStatus: "documented", died: 2004, diedStatus: "documented",
    line: "Criner line", gender: "f",
    present: { kit: "#2e6f6a", kitDark: "#21524e", hat: null, hatColor: null, hair: "long", skin: "#7a4c28", hairColor: "#c4bba8", hairTexture: "straight", build: "sturdy", glasses: false, photo: null, speed: 28, prop: null },
    home: "h3", rounds: ["store", "plazaC", "church", "home"],
    lines: ["Hi Justynn! How's it going?", "Good to see you out, Justynn.", "You come by and see me, hear?"],
    saturday: { role: "tailgate" } },
  { id: "curtis-franklin-hammond", name: "Curtis Franklin Hammond", born: 1933, bornStatus: "documented", died: 2012, diedStatus: "documented",
    line: "Hammond line", gender: "m",
    present: { kit: "#5a5148", kitDark: "#423b33", hat: "fedora", hatColor: "#3d362e", hair: "short-gray", skin: "#5d3a20", hairColor: "#b9b0a0", hairTexture: "coily", build: "average", glasses: false, photo: null, speed: 29, prop: null },
    home: "h4", rounds: ["plazaE", "store", "plazaC", "home"],
    lines: ["Well hey, Justynn.", "Good to see you, son.", "How's it going, Justynn?"],
    saturday: { role: "grill" } },
  { id: "melvin-andrew-gooden", name: "Melvin Andrew Gooden", born: 1932, bornStatus: "documented", died: null, diedStatus: "unknown",
    line: "Gooden line", gender: "m",
    present: { kit: "#cbbfa5", kitDark: "#a89a7d", hat: null, hatColor: null, hair: "afro", skin: "#9c6a3e", hairColor: "#b9b0a0", hairTexture: "coily", build: "slim", glasses: false, photo: null, speed: 31, prop: null },
    home: "h2", rounds: ["plazaW", "church", "plazaC", "home"],
    lines: ["Hey now, Justynn.", "Good to see you!", "How you been, Justynn?"],
    saturday: { role: "gates" } },
  { id: "emma-jean-jackson", name: "Emma Jean Jackson", born: 1936, bornStatus: "probable", died: 2018, diedStatus: "probable",
    line: "Jackson line", gender: "f",
    present: { kit: "#a34a28", kitDark: "#7e3820", hat: null, hatColor: null, hair: "long", skin: "#835231", hairColor: "#2a1a10", hairTexture: "curly", build: "average", glasses: false, photo: null, speed: 30, prop: null },
    home: "h4", rounds: ["store", "plazaE", "plazaC", "home"],
    lines: ["Hi Justynn! How's it going?", "There's my grandson.", "Good to see you, baby."],
    saturday: { role: "tailgate" } },
  { id: "willie-bethsaida-anderson", name: "Willie Bethsaida Anderson", born: 1897, bornStatus: "probable", died: 1982, diedStatus: "probable",
    line: "Hammond line", gender: "f",
    present: { kit: "#77815f", kitDark: "#5a6349", hat: null, hatColor: null, hair: "braids", skin: "#54331d", hairColor: "#c9c2b4", hairTexture: "braided", build: "slim", glasses: false, photo: null, speed: 26, prop: null },
    home: "h1", rounds: ["church", "plazaW", "home"],
    lines: ["Well, look who it is.", "Hi Justynn! How's it going?", "Come walk with me a ways."],
    saturday: { role: "stands" } },
  { id: "dora-weathers", name: "Dora Weathers", born: 1895, bornStatus: "probable", died: 1976, diedStatus: "probable",
    line: "Jackson line", gender: "f",
    present: { kit: "#6d4a63", kitDark: "#523649", hat: null, hatColor: null, hair: "short", skin: "#a9744a", hairColor: "#6b6156", hairTexture: "curly", build: "average", glasses: false, photo: null, speed: 26, prop: "basket", transport: "buggy" },
    home: "h1", rounds: ["church", "store", "plazaW", "home"],
    lines: ["Good to see you, Justynn.", "Hi Justynn! How's it going?", "You eating right, Justynn?"],
    saturday: { role: "tailgate" } },
  { id: "troy-wright", name: "Troy Wright", born: 1908, bornStatus: "probable", died: 1992, diedStatus: "probable",
    line: "Wright line", gender: "m",
    present: { kit: "#74553a", kitDark: "#573f2a", hat: "cap", hatColor: "#4c3a26", hair: "short", skin: "#6e4525", hairColor: "#17110b", hairTexture: "straight", build: "sturdy", glasses: false, photo: null, speed: 33, prop: "plate" },
    home: "h6", rounds: ["plazaC", "store", "plazaE", "home"],
    lines: ["Good to see you!", "Hey, Justynn! Plate's still warm.", "How's it going, Justynn?"],
    saturday: { role: "tailgate", plate: true } },
  { id: "andrew-jackson-gooden", name: "Andrew Jackson Gooden", born: 1903, bornStatus: "probable", died: 1960, diedStatus: "probable",
    line: "Gooden line", gender: "m",
    present: { kit: "#33523e", kitDark: "#243b2d", hat: null, hatColor: null, hair: "bald", skin: "#96613a", hairColor: "#b5ab99", hairTexture: "straight", build: "average", glasses: false, photo: null, speed: 28, prop: null },
    home: "h2", rounds: ["church", "plazaC", "plazaW", "home"],
    lines: ["Justynn. Good to see you.", "How's it going, Justynn?", "Walk with me to the corner."],
    saturday: { role: "gates" } },
  { id: "james-j-hammond", name: "James J Hammond", born: 1865, bornStatus: "probable", died: null, diedStatus: "unknown",
    line: "Hammond line", gender: "m",
    present: { kit: "#43484e", kitDark: "#30343a", hat: null, hatColor: null, hair: "short-gray", skin: "#684628", hairColor: "#d6cfc0", hairTexture: "straight", build: "slim", glasses: false, photo: null, speed: 23, prop: "cane", transport: "buggy" },
    home: "h1", rounds: ["plazaW", "church", "home"],
    lines: ["Well now. Justynn.", "Good to see you, boy.", "How's it going, Justynn?"],
    saturday: { role: "stands" } }
];

// The signed-in person: the demo's focus, Justynn Hammond, from
// the same pack. Living people are masked in the pack (no years),
// and the world asserts none for him either: he is the visitor,
// drawn in the present day, at the center of his own community.
window.LGCY_WORLD_PLAYER = {
  id: "justynn-hammond", name: "Justynn",
  present: { kit: "#20555e", kitDark: "#173f45", hat: null, hatColor: null, hair: "short", hairColor: "#1d130c", hairTexture: "coily", build: "average", glasses: false, photo: null, skin: "#7a4c28", speed: 120 }
};
