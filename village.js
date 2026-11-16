// Our LGCY Community tab: the ink village layer (TW-1077).
//
// Fail-closed contract, mirrored from gl/buck.js on the home page:
// the drawn village, the roster, and the card panel stand on their
// own in community.html. This layer only adds the villagers and
// their day. Any failure at any stage tears the layer down and the
// page stands exactly as drawn. Reduced motion gets a composed
// still village: everyone home in the scene, nobody roaming.
//
// The villagers come from records, not from this file: the
// roster is data-driven from villagers-data.js, and this layer
// holds no names or years of its own. Era law: a figure's dress,
// hat, and tools are drawn only from a documented birth year in
// their record (adult dress figured at birth year plus 25). A
// year the record marks probable or lead, or does not carry at
// all, is never presented as settled: the figure stays
// era-neutral and the roster labels the year for what it is.
//
// QA overrides, in the spirit of ?gl=force-a on the home page:
//   ?village=still                 composed still, no roaming
//   ?village=dawn|morning|midday|afternoon|dusk|night
//                                  hold the village at that hour
// State for inspection: window.__lgcyVillage.

(function () {
  "use strict";

  var stage = document.getElementById("village-stage");
  var svg = document.getElementById("village-svg");
  var layer = document.getElementById("v-walkers");
  if (!stage || !svg || !layer) return;

  var REDUCED = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var SVGNS = "http://www.w3.org/2000/svg";
  var INK = "#1d2320";
  var PAPER = "#faf3e3";
  var BASKET = "#8a6f4d";

  var params = new URLSearchParams(window.location.search);
  var forceStill = params.get("village") === "still";
  var forcePhase = params.get("village");

  var state = {
    mode: "off", // off | still | roam
    tier: null, // A full roster roaming, B reduced roster, C frozen
    phase: null,
    walkers: 0,
    teardown: null
  };
  window.__lgcyVillage = state;

  function teardown(reason) {
    if (state.raf) window.cancelAnimationFrame(state.raf);
    state.raf = null;
    layer.innerHTML = "";
    state.mode = "off";
    state.walkers = 0;
    if (window.console && console.info) {
      console.info("[lgcy-village] layer off:", reason);
    }
  }
  state.teardown = teardown;

  /* ---------------- The people: records in, villagers out ------------
     The roster is data-driven from villagers-data.js (window
     .LGCY_VILLAGERS), the village's single data source. A record's
     era dress is derived only when its birth year is documented;
     probable, lead, and unknown years keep the figure era-neutral
     and are never printed as settled fact. Homes follow the
     record's line; rounds follow a template by roster order. */

  var LINE_HOMES = {
    "The founding couple": "cabin",
    "Ruth line": "house",
    "Henry line": "brick",
    "Della line": "cabin",
    "Moses line": "brick"
  };
  var HOME_CYCLE = ["cabin", "house", "brick"];
  var ROUTE_TEMPLATES = [
    ["oak", "well", "church"],
    ["well", "store", "church"],
    ["well", "church", "store"],
    ["store", "well", "garden"],
    ["church", "well", "bench"],
    ["bench", "well", "store"],
    ["garden", "store", "well"],
    ["store", "garden", "bench"]
  ];
  var KIT_WORDS = {
    coat: "frock coat and waistcoat", suit: "suit", jacket: "jacket",
    jacketModern: "jacket", shirt: "shirt and slacks",
    hoodie: "hoodie and jeans", gown: "long gown",
    blouseSkirt: "blouse and long skirt", dress50s: "full-skirt dress",
    modernDress: "plain modern dress",
    modernF: "blouse and straight trousers",
    neutral: "plain era-neutral dress"
  };
  var HAT_WORDS = {
    brim: "wide-brim hat", bonnet: "bonnet", bowler: "bowler",
    cap: "flat cap", fedora: "fedora"
  };
  var PROP_WORDS = { cane: "cane", basket: "market basket", book: "book" };

  function decadeLabel(born) {
    var d = Math.floor((born + 25) / 10) * 10;
    return "the " + d + "s";
  }
  function yearPhrase(rec, documented) {
    if (documented) return "born " + rec.born;
    if (rec.bornStatus === "probable" && typeof rec.born === "number") {
      return "born " + rec.born + " (probable, not yet documented)";
    }
    if (rec.bornStatus === "lead") return "birth year a lead only, not shown as fact";
    return "birth year not in the record";
  }
  function normalizeRecord(rec, idx) {
    var documented = rec.bornStatus === "documented" && typeof rec.born === "number";
    var pres = rec.present || {};
    var home = LINE_HOMES[rec.line] || HOME_CYCLE[idx % HOME_CYCLE.length];
    var template = ROUTE_TEMPLATES[idx % ROUTE_TEMPLATES.length];
    var stops = [home];
    for (var i = 0; i < template.length; i++) {
      if (template[i] !== home && stops.indexOf(template[i]) === -1) stops.push(template[i]);
    }
    var kit = documented ? pres.kit || "neutral" : "neutral";
    var hat = documented ? pres.hat || null : null;
    var prop = documented ? pres.prop || null : null;
    var eraText;
    if (documented) {
      eraText =
        "Drawn from the documented birth year, " + rec.born + ": " +
        (KIT_WORDS[kit] || "plain dress") +
        (hat ? ", " + (HAT_WORDS[hat] || "hat") : "") +
        (prop ? ", and " + (PROP_WORDS[prop] || "tools") : "") +
        " of " + decadeLabel(rec.born) + ".";
    } else {
      eraText =
        "The record carries no documented birth year for this figure, " +
        "so the dress stays era-neutral.";
    }
    return {
      id: rec.id,
      name: rec.name,
      born: typeof rec.born === "number" ? rec.born : null,
      bornStatus: rec.bornStatus || "unknown",
      documented: documented,
      line: rec.line || "",
      relatives: rec.relatives || "",
      kit: kit,
      hat: hat,
      prop: prop,
      apron: documented ? !!pres.apron : false,
      accent: pres.accent || "#454e47",
      hair: pres.hair || "short",
      home: home,
      routeStops: stops,
      speed: pres.speed || 30,
      scale: pres.scale || 1.0,
      yearPhrase: yearPhrase(rec, documented),
      eraText: eraText
    };
  }
  var PEOPLE = [];
  if (Array.isArray(window.LGCY_VILLAGERS)) {
    PEOPLE = window.LGCY_VILLAGERS.map(normalizeRecord);
  }
  state.roster = PEOPLE.map(function (p) {
    return {
      id: p.id, born: p.born, bornStatus: p.bornStatus,
      kit: p.kit, eraText: p.eraText
    };
  });

  // The night keepers are the three youngest documented villagers,
  // derived from the records, never named in code.
  var NIGHT_KEEPERS = {};
  (function () {
    var doc = PEOPLE.filter(function (p) { return p.documented; })
      .sort(function (a, b) { return b.born - a.born; });
    var picks = doc.slice(0, 3);
    for (var i = 0; i < picks.length; i++) NIGHT_KEEPERS[picks[i].id] = true;
    for (var j = PEOPLE.length - 1; j >= 0 && picks.length < 3; j--) {
      if (!NIGHT_KEEPERS[PEOPLE[j].id]) {
        NIGHT_KEEPERS[PEOPLE[j].id] = true;
        picks.push(PEOPLE[j]);
      }
    }
  })();

  /* ---------------- The ground: nodes and paths ---------------- */

  var NODES = {
    cabin: { x: 164, y: 480, kind: "door" },
    church: { x: 400, y: 480, kind: "door" },
    house: { x: 634, y: 482, kind: "door" },
    store: { x: 869, y: 484, kind: "door" },
    brick: { x: 1094, y: 482, kind: "door" },
    well: { x: 600, y: 548, kind: "gather" },
    stall: { x: 905, y: 554, kind: "gather" },
    garden: { x: 1066, y: 608, kind: "work" },
    bench: { x: 300, y: 602, kind: "rest" },
    oak: { x: 96, y: 564, kind: "rest" },
    s1: { x: 170, y: 550, kind: "street" },
    s2: { x: 405, y: 558, kind: "street" },
    s3: { x: 630, y: 562, kind: "street" },
    s4: { x: 865, y: 558, kind: "street" },
    s5: { x: 1084, y: 550, kind: "street" }
  };
  var EDGES = {
    cabin: ["s1"], church: ["s2"], house: ["s3"], store: ["s4"], brick: ["s5"],
    well: ["s3"], stall: ["s4"], garden: ["s5"], bench: ["s1", "s2"], oak: ["s1"],
    s1: ["cabin", "bench", "oak", "s2"], s2: ["church", "bench", "s1", "s3"],
    s3: ["house", "well", "s2", "s4"], s4: ["store", "stall", "s3", "s5"],
    s5: ["brick", "garden", "s4"]
  };

  function route(from, to) {
    if (from === to) return [from];
    var prev = {};
    prev[from] = null;
    var queue = [from];
    while (queue.length) {
      var cur = queue.shift();
      if (cur === to) break;
      var nexts = EDGES[cur] || [];
      for (var i = 0; i < nexts.length; i++) {
        if (!(nexts[i] in prev)) {
          prev[nexts[i]] = cur;
          queue.push(nexts[i]);
        }
      }
    }
    if (!(to in prev)) return [from];
    var path = [];
    var node = to;
    while (node) {
      path.unshift(node);
      node = prev[node];
    }
    return path;
  }

  /* ---------------- The ink figure factory ----------------
     Local coordinates: origin at the feet, up is negative y.
     A figure stands about 104 units tall, hat included. */

  function legPair() {
    return (
      '<g class="wk-legl"><path d="M-3 -44 L-5 -1" fill="none" stroke="' + INK + '" stroke-width="5" stroke-linecap="round"/></g>' +
      '<g class="wk-legr"><path d="M3 -44 L5 -1" fill="none" stroke="' + INK + '" stroke-width="5" stroke-linecap="round"/></g>'
    );
  }
  function kneeLegs() {
    return (
      '<g class="wk-legl"><path d="M-4 -27 L-5 -1" fill="none" stroke="' + PAPER + '" stroke-width="4.6" stroke-linecap="round"/></g>' +
      '<g class="wk-legr"><path d="M4 -27 L5 -1" fill="none" stroke="' + PAPER + '" stroke-width="4.6" stroke-linecap="round"/></g>' +
      '<path class="wk-shoe-l" d="M-9 -1.6 h8" stroke="' + INK + '" stroke-width="3.4" stroke-linecap="round"/>' +
      '<path class="wk-shoe-r" d="M1 -1.6 h8" stroke="' + INK + '" stroke-width="3.4" stroke-linecap="round"/>'
    );
  }
  function hemShoes() {
    return (
      '<path class="wk-shoe-l" d="M-10 -2 h9" stroke="' + INK + '" stroke-width="3.4" stroke-linecap="round"/>' +
      '<path class="wk-shoe-r" d="M1 -2 h9" stroke="' + INK + '" stroke-width="3.4" stroke-linecap="round"/>'
    );
  }
  function arm(side, accent, fixed) {
    var sx = side === "l" ? -10 : 10;
    var dx = side === "l" ? -3 : 3;
    return (
      '<g class="wk-arm' + side + '" transform="translate(' + sx + ' -76)">' +
      '<path d="M0 0 L' + dx + ' 23" fill="none" stroke="' + accent + '" stroke-width="5" stroke-linecap="round"/>' +
      '<circle cx="' + dx + '" cy="24" r="2.7" fill="' + PAPER + '" stroke="' + INK + '" stroke-width="1.4"/>' +
      (fixed || "") +
      "</g>"
    );
  }
  function caneProp() {
    return '<path d="M3 24 L10 74" stroke="' + INK + '" stroke-width="2.6" stroke-linecap="round"/>';
  }
  function basketProp() {
    return (
      '<path d="M6 30 h20 l-3.4 13 h-13.2 z" fill="' + BASKET + '" stroke="' + INK + '" stroke-width="2"/>' +
      '<path d="M9 30 a7 6 0 0 1 14 0" fill="none" stroke="' + INK + '" stroke-width="2"/>'
    );
  }
  function torso(p) {
    var a = p.accent;
    var s = 'stroke="' + INK + '" stroke-width="2.4" stroke-linejoin="round"';
    switch (p.kit) {
      case "coat":
        return '<path d="M-11 -80 L-13 -36 L-6 -36 L-4 -52 L4 -52 L6 -36 L13 -36 L11 -80 Z" fill="' + a + '" ' + s + '/>' +
          '<path d="M-4.5 -80 L0 -64 L4.5 -80 L4.5 -72 L0 -58 L-4.5 -72 Z" fill="' + PAPER + '" ' + s + '/>' +
          '<path d="M0 -58 L0 -40" stroke="' + INK + '" stroke-width="1.6"/>';
      case "suit":
        return '<path d="M-11 -80 L-12 -42 L12 -42 L11 -80 Z" fill="' + a + '" ' + s + '/>' +
          '<path d="M-4.5 -80 L0 -62 L4.5 -80 L4.5 -70 L0 -56 L-4.5 -70 Z" fill="' + PAPER + '" ' + s + '/>';
      case "jacket":
        return '<path d="M-11 -79 L-12 -46 L12 -46 L11 -79 Z" fill="' + a + '" ' + s + '/>' +
          '<path d="M0 -79 L0 -48" stroke="' + INK + '" stroke-width="1.8"/>';
      case "jacketModern":
        return '<path d="M-11 -80 L-12 -46 L12 -46 L11 -80 Z" fill="' + a + '" ' + s + '/>' +
          '<path d="M-4 -80 L0 -60 L4 -80 Z" fill="' + PAPER + '" ' + s + '/>' +
          '<path d="M-4 -80 L-6 -46 M4 -80 L6 -46" fill="none" stroke="' + INK + '" stroke-width="1.6"/>';
      case "shirt":
        return '<path d="M-10 -80 L-11 -48 L11 -48 L10 -80 Z" fill="' + PAPER + '" ' + s + '/>' +
          '<path d="M-3 -80 L0 -70 L3 -80" fill="none" stroke="' + INK + '" stroke-width="1.8"/>';
      case "hoodie":
        return '<path d="M-11 -80 L-12 -46 L12 -46 L11 -80 Z" fill="' + a + '" ' + s + '/>' +
          '<rect x="-6.5" y="-58" width="13" height="8.5" fill="none" stroke="' + INK + '" stroke-width="1.8"/>';
      case "gown":
        return '<path d="M-9 -80 C -12 -60, -17 -30, -19 -7 L19 -7 C 17 -30, 12 -60, 9 -80 Z" fill="' + a + '" ' + s + '/>' +
          '<path d="M-11 -53 C -4 -49, 4 -49, 11 -53" fill="none" stroke="' + INK + '" stroke-width="1.8"/>' +
          (p.apron ? '<path d="M-7.5 -51 L7.5 -51 L10.5 -11 L-10.5 -11 Z" fill="' + PAPER + '" stroke="' + INK + '" stroke-width="1.8" opacity="0.92"/>' : "");
      case "blouseSkirt":
        return '<path d="M-10 -80 L-11 -55 L11 -55 L10 -80 Z" fill="' + PAPER + '" ' + s + '/>' +
          '<path d="M-11 -55 C -14 -38, -16 -22, -17 -8 L17 -8 C 16 -22, 14 -38, 11 -55 Z" fill="' + a + '" ' + s + '/>';
      case "dress50s":
        return '<path d="M-9 -80 L-10 -57 L10 -57 L9 -80 Z" fill="' + a + '" ' + s + '/>' +
          '<path d="M-10 -57 C -18 -46, -20 -36, -21 -27 L21 -27 C 20 -36, 18 -46, 10 -57 Z" fill="' + a + '" ' + s + '/>';
      case "modernDress":
        return '<path d="M-9 -80 L-10 -56 L10 -56 L9 -80 Z" fill="' + a + '" ' + s + '/>' +
          '<path d="M-10 -56 C -14 -44, -15 -36, -15.5 -29 L15.5 -29 C 15 -36, 14 -44, 10 -56 Z" fill="' + a + '" ' + s + '/>';
      case "modernF":
        return '<path d="M-10 -80 L-11 -48 L11 -48 L10 -80 Z" fill="' + a + '" ' + s + '/>' +
          '<path d="M-6 -80 L0 -68 L6 -80" fill="none" stroke="' + INK + '" stroke-width="1.8"/>';
      case "neutral":
        return '<path d="M-10 -80 L-11 -44 L11 -44 L10 -80 Z" fill="' + a + '" ' + s + '/>' +
          '<path d="M-11 -50 L11 -50" stroke="' + INK + '" stroke-width="1.8"/>';
    }
    return "";
  }
  function head(p) {
    var hairFill = p.hair === "gray" || p.hair === "bun-gray" ? "#b9b2a0" : INK;
    var out = "";
    if (p.kit === "hoodie") {
      out += '<path d="M-11.5 -76 a11.5 13.5 0 0 1 23 0 l0 9 -23 0 Z" fill="' + p.accent + '" stroke="' + INK + '" stroke-width="2.2"/>';
    }
    out += '<circle cx="0" cy="-89" r="8" fill="' + PAPER + '" stroke="' + INK + '" stroke-width="2.2"/>';
    if (p.hair === "long") {
      out += '<path d="M-8 -90 a8 8.5 0 0 1 16 0 l1.5 14 -4.5 0 -1 -10 a5.5 5 0 0 0 -8 0 l-1 10 -4.5 0 Z" fill="' + hairFill + '"/>';
    } else {
      out += '<path d="M-8 -90.5 a8 8 0 0 1 16 0 Z" fill="' + hairFill + '"/>';
    }
    if (p.hair === "bun" || p.hair === "bun-gray") {
      out += '<circle cx="6.5" cy="-96.5" r="3.1" fill="' + hairFill + '"/>';
    }
    switch (p.hat) {
      case "brim":
        out += '<path d="M-6.5 -95 v-5.5 a6.5 5.5 0 0 1 13 0 v5.5 Z" fill="' + p.accent + '" stroke="' + INK + '" stroke-width="2"/>' +
          '<ellipse cx="0" cy="-94.6" rx="13.5" ry="3.4" fill="' + p.accent + '" stroke="' + INK + '" stroke-width="2"/>';
        break;
      case "bonnet":
        out += '<path d="M-9.5 -84.5 a10.5 11 0 0 1 19 -3.5 l1 6.5 -5.5 0 a7.5 7.5 0 0 0 -13 -3.5 Z" fill="' + p.accent + '" stroke="' + INK + '" stroke-width="2"/>' +
          '<path d="M-6 -81.5 q6 3.5 12 0" fill="none" stroke="' + INK + '" stroke-width="1.6"/>';
        break;
      case "bowler":
        out += '<path d="M-8 -94.6 a8 7.2 0 0 1 16 0 Z" fill="' + INK + '" stroke="' + INK + '" stroke-width="2"/>' +
          '<ellipse cx="0" cy="-94.4" rx="12.5" ry="3.1" fill="' + INK + '"/>';
        break;
      case "cap":
        out += '<path d="M-9 -93.6 a9 6.4 0 0 1 18 0 l8.5 1.8 -1.8 3.4 -24.7 -1.6 Z" fill="' + p.accent + '" stroke="' + INK + '" stroke-width="2"/>';
        break;
      case "fedora":
        out += '<path d="M-7 -94.6 v-6.8 h14 v6.8 Z" fill="' + p.accent + '" stroke="' + INK + '" stroke-width="2"/>' +
          '<ellipse cx="0" cy="-94.4" rx="13.5" ry="3.2" fill="' + p.accent + '" stroke="' + INK + '" stroke-width="2"/>';
        break;
    }
    return out;
  }

  function figureMarkup(p) {
    var covered = p.kit === "gown" || p.kit === "blouseSkirt";
    var knee = p.kit === "dress50s" || p.kit === "modernDress";
    var legs = covered ? hemShoes() : knee ? kneeLegs() : legPair();
    var frontFixed = "";
    var backFixed = "";
    if (p.prop === "cane") frontFixed = caneProp();
    if (p.prop === "basket") frontFixed = basketProp();
    var armL = arm("l", p.accent, backFixed);
    var armR = arm("r", p.accent, frontFixed);
    if (p.prop === "book") {
      armL = '<g class="wk-arml" transform="translate(-10 -76)"><path d="M0 0 L9 15" fill="none" stroke="' + p.accent + '" stroke-width="5" stroke-linecap="round"/></g>';
      armR = '<g class="wk-armr" transform="translate(10 -76)"><path d="M0 0 L-9 15" fill="none" stroke="' + p.accent + '" stroke-width="5" stroke-linecap="round"/></g>';
    }
    var book = p.prop === "book"
      ? '<g class="wk-book"><rect x="-8" y="-71" width="16" height="11.5" fill="' + PAPER + '" stroke="' + INK + '" stroke-width="2"/><path d="M0 -71 v11.5" stroke="' + INK + '" stroke-width="1.4"/></g>'
      : "";
    return (
      '<ellipse class="wk-ring" cx="0" cy="1.5" rx="21" ry="5" fill="none" stroke="#b9872c" stroke-width="2.4" opacity="0"/>' +
      '<g class="wk-flip"><g class="wk-bob">' +
      legs +
      '<g class="wk-upper">' + armL + torso(p) + armR + book +
      '<g class="wk-head">' + head(p) + "</g>" +
      "</g></g></g>" +
      '<rect class="wk-hit" x="-23" y="-114" width="46" height="118" fill="rgba(0,0,0,0)"/>'
    );
  }

  /* ---------------- Rounds: each villager's ordinary day ----------------
     A route is the guided path that villager walks on a normal
     day: home door out to their stops and back, derived from
     their record (line gives the home door, roster order gives
     the template). The signs in the
     scene name the rounds; a villager's own round lights up in
     gold when you point at them, and stays lit for a breath when
     you tap through to their profile. */


  function routePoints(stops) {
    var pts = [];
    for (var i = 0; i < stops.length; i++) {
      var leg = route(stops[i], stops[(i + 1) % stops.length]);
      for (var j = 0; j < leg.length; j++) {
        var n = NODES[leg[j]];
        var last = pts[pts.length - 1];
        if (!last || last.x !== n.x || last.y !== n.y) pts.push({ x: n.x, y: n.y });
      }
    }
    return pts;
  }
  function pathFromPoints(pts) {
    return "M" + pts.map(function (p) { return p.x + " " + p.y; }).join(" L");
  }

  var hl = document.getElementById("v-route-hl");
  var hlBg = document.getElementById("v-route-hl-bg");
  function showRoute(person, strength) {
    if (!hl || !person.routeD) return;
    hl.setAttribute("d", person.routeD);
    hl.setAttribute("opacity", strength);
    if (hlBg) {
      hlBg.setAttribute("d", person.routeD);
      hlBg.setAttribute("opacity", (parseFloat(strength) * 0.45).toFixed(2));
    }
  }
  function hideRoute() {
    if (hl) hl.setAttribute("opacity", "0");
    if (hlBg) hlBg.setAttribute("opacity", "0");
  }

  /* ---------------- Era transport ----------------
     The road keeps to each era's way of getting there, drawn as
     plain unbranded shapes: horse and buggy for the oldest
     rounds, an early motorcar of the Model T years, a long sedan
     of the 1970s, and a generic modern sport utility shape. No
     badges, no names, no logos anywhere on them. */

  var vehLayer = document.getElementById("v-vehicles");

  function wheelGroup(cx, cy, r) {
    var d = (r * 0.7).toFixed(1);
    return (
      '<g class="v-wheel" data-cx="' + cx + '" data-cy="' + cy + '" data-r="' + r + '" transform="translate(' + cx + " " + cy + ')">' +
      '<circle r="' + r + '" fill="none" stroke="' + INK + '" stroke-width="2.4"/>' +
      '<path d="M' + (-r) + " 0H" + r + "M0 " + (-r) + "V" + r + "M" + (-d) + " " + (-d) + "L" + d + " " + d + "M" + d + " " + (-d) + "L" + (-d) + " " + d + '" stroke="' + INK + '" stroke-width="1.5"/>' +
      '<circle r="2.6" fill="' + INK + '"/></g>'
    );
  }
  function tire(cx, cy, r) {
    return '<g transform="translate(' + cx + " " + cy + ')"><circle r="' + r + '" fill="' + INK + '"/><circle r="' + (r * 0.42).toFixed(1) + '" fill="#d9cfb8"/></g>';
  }
  function buggyMarkup() {
    var legStyle = 'fill="none" stroke="' + INK + '" stroke-width="3" stroke-linecap="round"';
    return (
      '<path d="M78 -54 C 68 -48, 67 -36, 72 -27" fill="none" stroke="' + INK + '" stroke-width="3" stroke-linecap="round"/>' +
      '<g class="v-legs-a"><path d="M106 -36 L108 -16 L106 0 M112 -36 L110 -18 L112 0 M82 -36 L80 -16 L82 0 M88 -36 L90 -18 L88 0" ' + legStyle + "/></g>" +
      '<g class="v-legs-b" style="display:none"><path d="M106 -36 L100 -18 L102 0 M112 -36 L116 -14 L114 0 M82 -36 L88 -18 L86 0 M88 -36 L82 -14 L84 0" ' + legStyle + "/></g>" +
      '<path d="M110 -54 L124 -70 L133 -63 L121 -40 Z" fill="#454e47" stroke="' + INK + '" stroke-width="2.4"/>' +
      '<path d="M78 -56 C 88 -62, 104 -62, 112 -54 L115 -36 L80 -36 Z" fill="#454e47" stroke="' + INK + '" stroke-width="2.4"/>' +
      '<path d="M124 -70 L140 -64 L138 -55 L123 -57 Z" fill="#454e47" stroke="' + INK + '" stroke-width="2.2"/>' +
      '<path d="M112 -55 L123 -69" stroke="' + INK + '" stroke-width="3" stroke-linecap="round"/>' +
      '<path d="M58 -38 L84 -40" stroke="' + INK + '" stroke-width="2.6"/>' +
      '<path d="M4 -48 L58 -48 L54 -24 L8 -24 Z" fill="#2c5240" stroke="' + INK + '" stroke-width="2.4"/>' +
      '<rect x="8" y="-57" width="24" height="9" fill="#7c2d26" stroke="' + INK + '" stroke-width="2"/>' +
      '<path d="M26 -70 L26 -52 L40 -52" fill="none" stroke="#2c5240" stroke-width="5" stroke-linecap="round"/>' +
      '<circle cx="26" cy="-77" r="6.2" fill="' + PAPER + '" stroke="' + INK + '" stroke-width="2"/>' +
      '<ellipse cx="26" cy="-82" rx="9.5" ry="2.6" fill="' + INK + '"/>' +
      '<path d="M2 -64 C 14 -80, 46 -80, 58 -64" fill="none" stroke="' + INK + '" stroke-width="3" stroke-linecap="round"/>' +
      '<path d="M8 -64 L8 -48 M52 -64 L52 -48" stroke="' + INK + '" stroke-width="2.2"/>' +
      wheelGroup(17, -20, 20) +
      wheelGroup(63, -13.5, 13.5)
    );
  }
  function modeltMarkup() {
    return (
      '<path d="M6 -60 L6 -24 L88 -24 L88 -60 Z" fill="#454e47" stroke="' + INK + '" stroke-width="2.4"/>' +
      '<rect x="15" y="-56" width="20" height="14" fill="' + PAPER + '" stroke="' + INK + '" stroke-width="1.8"/>' +
      '<rect x="43" y="-56" width="20" height="14" fill="' + PAPER + '" stroke="' + INK + '" stroke-width="1.8"/>' +
      '<path d="M88 -46 L106 -42 L106 -24 L88 -24 Z" fill="#454e47" stroke="' + INK + '" stroke-width="2.4"/>' +
      '<rect x="106" y="-48" width="7" height="24" fill="#d9cfb8" stroke="' + INK + '" stroke-width="2"/>' +
      '<path d="M14 -60 C 26 -74, 60 -74, 74 -60" fill="none" stroke="' + INK + '" stroke-width="3" stroke-linecap="round"/>' +
      '<path d="M76 -15 C 82 -29, 104 -29, 110 -15" fill="none" stroke="' + INK + '" stroke-width="3"/>' +
      '<path d="M2 -15 C 8 -29, 30 -29, 36 -15" fill="none" stroke="' + INK + '" stroke-width="3"/>' +
      '<path d="M36 -17 L76 -17" stroke="' + INK + '" stroke-width="3"/>' +
      '<circle cx="111" cy="-50" r="3.6" fill="#f3d98b" stroke="' + INK + '" stroke-width="1.6"/>' +
      '<circle cx="1" cy="-40" r="7.5" fill="none" stroke="' + INK + '" stroke-width="2.2"/>' +
      wheelGroup(19, -12.5, 12.5) +
      wheelGroup(93, -12.5, 12.5)
    );
  }
  function sedanMarkup() {
    return (
      '<path d="M4 -36 C 4 -42, 10 -44, 20 -44 L36 -44 C 46 -56, 60 -60, 76 -60 L94 -60 C 106 -60, 116 -52, 126 -44 L134 -42 C 140 -40, 141 -32, 139 -27 L137 -21 L6 -21 C 3 -26, 3 -31, 4 -36 Z" fill="#7d5a13" stroke="' + INK + '" stroke-width="2.4"/>' +
      '<path d="M42 -46 C 50 -54, 60 -57, 74 -57 L90 -57 C 98 -56, 104 -51, 109 -46 Z" fill="' + PAPER + '" stroke="' + INK + '" stroke-width="1.8"/>' +
      '<path d="M74 -57 L74 -46" stroke="' + INK + '" stroke-width="1.6"/>' +
      '<path d="M6 -30 L137 -30" stroke="#d9cfb8" stroke-width="1.6"/>' +
      '<rect x="135.5" y="-34" width="4.5" height="6" fill="#f3d98b" stroke="' + INK + '" stroke-width="1.3"/>' +
      '<rect x="1.5" y="-33" width="3.5" height="5" fill="#a84c16"/>' +
      tire(30, -11.5, 11.5) +
      tire(112, -11.5, 11.5)
    );
  }
  function suvMarkup() {
    return (
      '<path d="M6 -54 C 6 -60, 12 -62, 20 -62 L94 -62 C 106 -62, 116 -56, 123 -46 L126 -36 C 127 -29, 124 -23, 117 -23 L9 -23 C 5 -31, 4 -45, 6 -54 Z" fill="#2c5240" stroke="' + INK + '" stroke-width="2.4"/>' +
      '<path d="M15 -58 L50 -58 L50 -38 L13 -38 Z" fill="' + PAPER + '" stroke="' + INK + '" stroke-width="1.8"/>' +
      '<path d="M56 -58 L90 -58 C 98 -58, 104 -51, 108 -38 L56 -38 Z" fill="' + PAPER + '" stroke="' + INK + '" stroke-width="1.8"/>' +
      '<path d="M22 -65.5 L88 -65.5" stroke="' + INK + '" stroke-width="2.6" stroke-linecap="round"/>' +
      '<path d="M53 -58 L53 -26" stroke="' + INK + '" stroke-width="1.4"/>' +
      '<rect x="121.5" y="-40" width="4" height="6" fill="#f3d98b" stroke="' + INK + '" stroke-width="1.3"/>' +
      tire(30, -12.5, 12.5) +
      tire(100, -12.5, 12.5)
    );
  }
  var VEH_LEN = { buggy: 152, modelt: 124, sedan: 144, suv: 132 };
  var VEH_SPEED = { buggy: 27, modelt: 45, sedan: 58, suv: 63 };

  function makeVehicle(kind) {
    var g = document.createElementNS(SVGNS, "g");
    g.setAttribute("class", "v-vehicle");
    g.style.display = "none";
    g.innerHTML = kind === "buggy" ? buggyMarkup() : kind === "modelt" ? modeltMarkup() : kind === "sedan" ? sedanMarkup() : suvMarkup();
    vehLayer.appendChild(g);
    return {
      kind: kind, el: g, active: false, x: 0, y: 0, dir: 1, scale: 1,
      speed: VEH_SPEED[kind], len: VEH_LEN[kind], wheelA: 0, legT: 0,
      wheels: g.querySelectorAll(".v-wheel"),
      legsA: g.querySelector(".v-legs-a"), legsB: g.querySelector(".v-legs-b")
    };
  }

  /* ---------------- Walkers ---------------- */

  var walkers = [];
  var walkersById = {};

  function depthScale(y) {
    var s = 0.8 + ((y - 470) / 170) * 0.34;
    return Math.max(0.78, Math.min(1.16, s));
  }
  function outCount() {
    var n = 0;
    for (var i = 0; i < walkers.length; i++) if (!walkers[i].inside && !walkers[i].goingIn) n++;
    return n;
  }
  function resort() {
    var sorted = walkers.slice().sort(function (a, b) { return a.y - b.y; });
    for (var i = 0; i < sorted.length; i++) layer.appendChild(sorted[i].el);
  }

  function makeWalker(person, idx) {
    var a = document.createElementNS(SVGNS, "a");
    a.setAttribute("href", "person.html");
    a.setAttribute("class", "walker");
    a.setAttribute("aria-label", person.name + ", " + person.yearPhrase + ". Open their profile.");
    a.setAttribute("data-kit", person.kit);
    a.setAttribute("data-status", person.bornStatus);
    var g = document.createElementNS(SVGNS, "g");
    g.innerHTML = figureMarkup(person);
    a.appendChild(g);
    layer.appendChild(a);
    var w = {
      person: person, el: a, idx: idx,
      flipEl: g.querySelector(".wk-flip"), bobEl: g.querySelector(".wk-bob"),
      headEl: g.querySelector(".wk-head"),
      legL: g.querySelector(".wk-legl"), legR: g.querySelector(".wk-legr"),
      armL: g.querySelector(".wk-arml"), armR: g.querySelector(".wk-armr"),
      shoeL: g.querySelector(".wk-shoe-l"), shoeR: g.querySelector(".wk-shoe-r"),
      ringEl: g.querySelector(".wk-ring"),
      x: 0, y: 0, ox: ((idx * 37) % 61) - 30, oy: ((idx * 19) % 17) - 8,
      facing: 1, phase: Math.random() * 6.28,
      mode: "idle", node: person.home, routeIdx: 0, path: null, pathIdx: 0, target: null,
      idleT: 0, idleDur: 2, inside: false, goingIn: false, insideT: 0, insideDur: 0, fade: 1,
      gesture: null, gestureT: 0, gestureDur: 1.2, chatWith: null, chatT: 0, retire: false
    };
    a.addEventListener("click", function (ev) { onWalkerTap(ev, w); });
    a.addEventListener("mouseenter", function () { showRoute(person, "0.5"); });
    a.addEventListener("mouseleave", hideRoute);
    a.addEventListener("focus", function () { showRoute(person, "0.5"); });
    a.addEventListener("blur", hideRoute);
    return w;
  }

  function onWalkerTap(ev, w) {
    // One tap, straight to the profile. The villager's round
    // lights for a breath first, so the tap also tells the story.
    ev.preventDefault();
    showRoute(w.person, "0.95");
    if (w.ringEl) w.ringEl.setAttribute("opacity", "1");
    triggerGesture(w, true);
    pose(w);
    window.setTimeout(function () { window.location.href = "person.html"; }, 700);
  }

  function triggerGesture(w, big) {
    if (w.gesture || w.inside) return;
    var p = w.person;
    if (p.prop === "book") w.gesture = "nod";
    else if (p.hat && p.hat !== "bonnet" && Math.random() < 0.5) w.gesture = "tip";
    else w.gesture = "wave";
    w.gestureT = 0;
    w.gestureDur = big ? 1.5 : 1.15;
  }

  function setArm(w, side, angle) {
    var el = side === "l" ? w.armL : w.armR;
    if (!el) return;
    var sx = side === "l" ? -10 : 10;
    el.setAttribute("transform", "translate(" + sx + " -76) rotate(" + angle.toFixed(1) + ")");
  }

  function pose(w) {
    var swing = w.mode === "walk" ? Math.sin(w.phase) * 25 : 0;
    var bobY = w.mode === "walk" ? -Math.abs(Math.sin(w.phase)) * 1.5 : 0;
    if (w.legL) w.legL.setAttribute("transform", "rotate(" + swing.toFixed(1) + " -3 -44)");
    if (w.legR) w.legR.setAttribute("transform", "rotate(" + (-swing).toFixed(1) + " 3 -44)");
    var shoeShift = w.mode === "walk" ? Math.sin(w.phase) * 4.2 : 0;
    if (w.shoeL) w.shoeL.setAttribute("transform", "translate(" + shoeShift.toFixed(1) + " 0)");
    if (w.shoeR) w.shoeR.setAttribute("transform", "translate(" + (-shoeShift).toFixed(1) + " 0)");
    var headRot = 0;
    var overL = null, overR = null;
    if (w.gesture) {
      var pr = Math.min(1, w.gestureT / w.gestureDur);
      var env = Math.sin(pr * Math.PI);
      var freeSide = w.person.prop === "cane" || w.person.prop === "basket" ? "l" : "r";
      var waveAngle = -35 - 105 * env + Math.sin(pr * 12.0) * 9 * env;
      if (w.gesture === "wave") { if (freeSide === "l") overL = waveAngle; else overR = waveAngle; }
      else if (w.gesture === "tip") { if (freeSide === "l") overL = -118 * env; else overR = -118 * env; headRot = 11 * env; }
      else headRot = 8 * Math.sin(pr * Math.PI * 2) * env;
    }
    var prop = w.person.prop;
    if (overL !== null) setArm(w, "l", overL);
    else if (prop !== "book") setArm(w, "l", -swing * 0.62);
    if (overR !== null) setArm(w, "r", overR);
    else if (prop !== "book" && prop !== "cane" && prop !== "basket") setArm(w, "r", swing * 0.62);
    if (w.headEl) w.headEl.setAttribute("transform", headRot ? "rotate(" + headRot.toFixed(1) + " 0 -80)" : "");
    if (w.bobEl) w.bobEl.setAttribute("transform", "translate(0 " + bobY.toFixed(2) + ")");
    if (w.flipEl) w.flipEl.setAttribute("transform", "scale(" + w.facing + " 1)");
    var sc = depthScale(w.y) * w.person.scale;
    w.el.setAttribute("transform", "translate(" + w.x.toFixed(1) + " " + w.y.toFixed(1) + ") scale(" + sc.toFixed(3) + ")");
    w.el.setAttribute("opacity", w.fade.toFixed(2));
  }

  /* ---------------- The day: decisions, chats, doors ---------------- */

  function startWalk(w, targetNode) {
    var nodes = route(w.node, targetNode);
    if (nodes.length < 2) { arrive(w, targetNode); return; }
    w.path = nodes.map(function (id) { return { id: id, x: NODES[id].x, y: NODES[id].y }; });
    w.pathIdx = 1;
    w.target = targetNode;
    w.mode = "walk";
    w.chatWith = null;
  }
  function goInside(w) {
    w.goingIn = true;
    w.mode = "idle";
    w.chatWith = null;
  }
  function exitHouse(w) {
    var door = w.person.home;
    if (Math.random() < 0.25) {
      var doors = ["cabin", "house", "brick"];
      door = doors[(Math.random() * doors.length) | 0];
    }
    w.node = door;
    w.x = NODES[door].x + w.ox;
    w.y = NODES[door].y + w.oy;
    w.inside = false;
    w.fade = 0.04;
    w.mode = "idle";
    w.idleT = 0;
    w.idleDur = 1 + Math.random() * 2.5;
    resort();
  }
  function arrive(w, nodeId) {
    w.node = nodeId;
    w.mode = "idle";
    w.path = null;
    // A small personal sidestep, so villagers arriving at the
    // same stop stand beside each other instead of stacking.
    w.x = NODES[nodeId].x + w.ox;
    w.y = NODES[nodeId].y + w.oy;
    w.idleT = 0;
    w.idleDur = 2 + Math.random() * 5;
    w.chatWith = null;
    if (w.retire) {
      if (nodeId === w.person.home) { goInside(w); return; }
      startWalk(w, w.person.home);
      return;
    }
    var nd = NODES[nodeId];
    if (nd && nd.kind === "door" && Math.random() < 0.3 && outCount() > 6) goInside(w);
    resort();
  }
  function decide(w) {
    var stops = w.person.routeStops;
    var next;
    if (state.phase === "night" && !NIGHT_KEEPERS[w.person.id]) {
      if (w.node === w.person.home) { goInside(w); return; }
      startWalk(w, w.person.home);
      return;
    }
    if (Math.random() < 0.22) {
      var social = ["well", "bench", "stall", "oak"];
      next = social[(Math.random() * social.length) | 0];
      var idlers = 0;
      for (var si = 0; si < walkers.length; si++) {
        var sw = walkers[si];
        if (sw !== w && sw.mode === "idle" && !sw.inside && sw.node === next) idlers++;
      }
      if (idlers >= 3) next = stops[(w.routeIdx + 1) % stops.length];
    } else {
      w.routeIdx = (w.routeIdx + 1) % stops.length;
      next = stops[w.routeIdx];
      if (next === w.node) next = stops[(w.routeIdx + 1) % stops.length];
    }
    if (next === w.node) { w.idleT = 0; w.idleDur = 2 + Math.random() * 3; return; }
    startWalk(w, next);
  }
  function chatStep(w, dt) {
    if (w.chatWith) {
      var o = w.chatWith;
      if (o.mode !== "idle" || o.inside || o.goingIn) { w.chatWith = null; return; }
      w.facing = o.x >= w.x ? 1 : -1;
      w.chatT -= dt;
      if (w.chatT <= 0) {
        triggerGesture(Math.random() < 0.5 ? w : o, false);
        w.chatT = 1.8 + Math.random() * 2.4;
      }
      return;
    }
    if (w.idleT < 0.5 || state.phase === "night") return;
    for (var i = 0; i < walkers.length; i++) {
      var o2 = walkers[i];
      if (o2 === w || o2.mode !== "idle" || o2.inside || o2.goingIn || o2.chatWith) continue;
      if (Math.hypot(o2.x - w.x, o2.y - w.y) < 42) {
        w.chatWith = o2;
        o2.chatWith = w;
        w.chatT = 1 + Math.random() * 2;
        w.idleDur = Math.max(w.idleDur, w.idleT + 4.5);
        o2.idleDur = Math.max(o2.idleDur, o2.idleT + 4.5);
        break;
      }
    }
  }
  function stepWalker(w, dt) {
    if (w.gesture) {
      w.gestureT += dt;
      if (w.gestureT >= w.gestureDur) w.gesture = null;
    }
    var fadeTarget = w.inside || w.goingIn ? 0 : 1;
    if (Math.abs(w.fade - fadeTarget) > 0.02) {
      w.fade += Math.sign(fadeTarget - w.fade) * dt * 2.4;
      w.fade = Math.max(0, Math.min(1, w.fade));
      if (w.goingIn && w.fade <= 0.03) {
        w.inside = true;
        w.goingIn = false;
        w.insideT = 0;
        w.insideDur = 9 + Math.random() * 16 + (state.phase === "night" ? 24 : 0);
      }
      pose(w);
      return;
    }
    if (w.inside) {
      w.insideT += dt;
      if (w.insideT >= w.insideDur && !w.retire) exitHouse(w);
      pose(w);
      return;
    }
    if (w.mode === "walk") {
      var target = w.path[w.pathIdx];
      var dx = target.x - w.x;
      var dy = target.y - w.y;
      var dist = Math.hypot(dx, dy);
      var step = w.person.speed * (state.phase === "night" ? 0.85 : 1) * dt;
      if (dist <= Math.max(step, 1.5)) {
        w.x = target.x;
        w.y = target.y;
        w.phase += (dist / 11) * Math.PI;
        w.pathIdx++;
        if (w.pathIdx >= w.path.length) arrive(w, w.target);
      } else {
        w.x += (dx / dist) * step;
        w.y += (dy / dist) * step;
        w.phase += (step / 11) * Math.PI;
        if (Math.abs(dx) > 2) w.facing = dx > 0 ? 1 : -1;
      }
      pose(w);
      return;
    }
    w.idleT += dt;
    chatStep(w, dt);
    if (!w.gesture && Math.random() < dt * 0.045) triggerGesture(w, false);
    if (w.idleT >= w.idleDur && !w.chatWith) decide(w);
    pose(w);
  }

  function retireWalkers() {
    for (var i = 0; i < walkers.length; i++) {
      var w = walkers[i];
      if (NIGHT_KEEPERS[w.person.id] || w.inside) continue;
      w.retire = true;
      if (w.mode === "idle" && !w.goingIn) {
        if (w.node === w.person.home) goInside(w);
        else startWalk(w, w.person.home);
      }
    }
  }
  function releaseWalkers() {
    for (var i = 0; i < walkers.length; i++) walkers[i].retire = false;
  }
  function thinOut() {
    var sent = 0;
    for (var i = 0; i < walkers.length && sent < 4; i++) {
      var w = walkers[i];
      if (w.inside || w.goingIn || NIGHT_KEEPERS[w.person.id]) continue;
      w.retire = true;
      sent++;
      if (w.mode === "idle") {
        if (w.node === w.person.home) goInside(w);
        else startWalk(w, w.person.home);
      }
    }
  }

  /* ---------------- Traffic on the road ---------------- */

  var vehicles = [];
  var vehKinds = ["buggy", "modelt", "sedan", "suv"];
  var vehIdx = 0;
  var vehTimer = 5;

  function getVehicle(kind) {
    for (var i = 0; i < vehicles.length; i++) if (vehicles[i].kind === kind) return vehicles[i];
    var v = makeVehicle(kind);
    vehicles.push(v);
    return v;
  }
  function spawnVehicle() {
    var kind = vehKinds[vehIdx % vehKinds.length];
    vehIdx++;
    var v = getVehicle(kind);
    v.dir = kind === "buggy" ? 1 : Math.random() < 0.5 ? 1 : -1;
    v.y = v.dir === 1 ? 584 : 542;
    v.scale = kind === "buggy" ? 0.98 : 0.92;
    v.x = v.dir === 1 ? -v.len - 16 : 1216 + v.len;
    v.active = true;
    v.el.style.display = "";
    v.el.setAttribute("transform", "translate(" + v.x + " " + v.y + ") scale(" + v.dir * v.scale + " " + v.scale + ")");
  }
  function stepVehicles(dt) {
    var anyActive = false;
    for (var i = 0; i < vehicles.length; i++) if (vehicles[i].active) anyActive = true;
    if (!anyActive) {
      vehTimer -= dt;
      if (vehTimer <= 0) spawnVehicle();
    }
    for (var j = 0; j < vehicles.length; j++) {
      var v = vehicles[j];
      if (!v.active) continue;
      v.x += v.dir * v.speed * dt;
      v.wheelA += ((v.speed * dt) / 14) * 57.3;
      for (var k = 0; k < v.wheels.length; k++) {
        var wh = v.wheels[k];
        var r = parseFloat(wh.getAttribute("data-r")) || 14;
        wh.setAttribute("transform", "translate(" + wh.getAttribute("data-cx") + " " + wh.getAttribute("data-cy") + ") rotate(" + (v.wheelA * (14 / r)).toFixed(1) + ")");
      }
      if (v.legsA && v.legsB) {
        v.legT += dt;
        var showA = Math.floor(v.legT / 0.27) % 2 === 0;
        v.legsA.style.display = showA ? "" : "none";
        v.legsB.style.display = showA ? "none" : "";
      }
      v.el.setAttribute("transform", "translate(" + v.x.toFixed(1) + " " + v.y + ") scale(" + v.dir * v.scale + " " + v.scale + ")");
      if ((v.dir === 1 && v.x > 1240) || (v.dir === -1 && v.x < -10)) {
        v.active = false;
        v.el.style.display = "none";
        vehTimer = 7 + Math.random() * 12;
      }
    }
  }
  function parkVehicles() {
    var spots = {
      buggy: "translate(430 516) scale(0.92)",
      modelt: "translate(726 514) scale(0.88)",
      sedan: "translate(1140 520) scale(-0.88 0.88)",
      suv: "translate(1170 594) scale(-0.92 0.92)"
    };
    for (var i = 0; i < vehKinds.length; i++) {
      var v = getVehicle(vehKinds[i]);
      v.active = false;
      v.el.style.display = "";
      v.el.setAttribute("transform", spots[vehKinds[i]]);
    }
  }

  /* ---------------- The hour: day phases ---------------- */

  var PHASES = {
    dawn: { label: "Dawn in the village. Doors open, and the day begins.", tint: "#d98a4a", opacity: 0.14, lit: true },
    morning: { label: "Morning in the village.", tint: "#f3d98b", opacity: 0.05, lit: false },
    midday: { label: "Midday in the village.", tint: "#ffffff", opacity: 0, lit: false },
    afternoon: { label: "Afternoon in the village.", tint: "#e8a56b", opacity: 0.07, lit: false },
    dusk: { label: "Dusk in the village. Lamps come on, and everyone drifts home.", tint: "#a84c16", opacity: 0.2, lit: true },
    night: { label: "Night in the village. Most everyone is home.", tint: "#142a1f", opacity: 0.48, lit: true }
  };
  var FORCED_PHASE = forcePhase && PHASES[forcePhase] ? forcePhase : null;

  function phaseFromClock() {
    var h = new Date().getHours();
    if (h >= 5 && h < 7) return "dawn";
    if (h < 11) return "morning";
    if (h < 15) return "midday";
    if (h < 18) return "afternoon";
    if (h < 20) return "dusk";
    return "night";
  }
  function applyPhase(name) {
    var ph = PHASES[name];
    if (!ph) return;
    var wasNight = state.phase === "night";
    state.phase = name;
    svg.setAttribute("data-phase", name);
    var rect = document.getElementById("v-phase-rect");
    if (rect) {
      rect.setAttribute("fill", ph.tint);
      rect.setAttribute("opacity", ph.opacity);
    }
    var wins = svg.querySelectorAll(".v-win");
    for (var i = 0; i < wins.length; i++) wins[i].classList.toggle("lit", ph.lit);
    var clock = document.getElementById("village-clock");
    if (clock) clock.textContent = ph.label;
    if (name === "night" && state.mode === "roam") retireWalkers();
    if (name !== "night" && wasNight) releaseWalkers();
  }

  /* ---------------- Roster ---------------- */

  function buildRoster() {
    var list = document.getElementById("roster-list");
    if (!list) return;
    PEOPLE.forEach(function (p) {
      var li = document.createElement("li");
      var a = document.createElement("a");
      a.className = "roster-btn";
      a.href = "person.html";
      a.setAttribute("aria-label", p.name + ", " + p.yearPhrase + ", " + p.line + ". Open their profile.");
      var meta =
        p.yearPhrase.charAt(0).toUpperCase() + p.yearPhrase.slice(1) +
        " · " + p.line + (p.relatives ? " · " + p.relatives : "");
      a.innerHTML =
        '<span class="roster-name">' + p.name + "</span>" +
        '<span class="roster-meta">' + meta + "</span>";
      a.addEventListener("click", function (ev) {
        var w = walkersById[p.id];
        if (w && state.mode !== "off") {
          ev.preventDefault();
          showRoute(p, "0.95");
          if (w.ringEl) w.ringEl.setAttribute("opacity", "1");
          triggerGesture(w, true);
          pose(w);
          window.setTimeout(function () { window.location.href = "person.html"; }, 700);
        }
      });
      li.appendChild(a);
      list.appendChild(li);
    });
  }

  /* ---------------- Still village (reduced motion / forced) ---------------- */

  // Composed still positions, assigned by roster order so the
  // composition survives a roster swap; extra villagers cycle
  // the same spots with a small offset.
  var STILL_SPOT_LIST = [
    { x: 316, y: 606, f: 1 }, { x: 150, y: 486, f: 1 },
    { x: 574, y: 548, f: 1 }, { x: 872, y: 488, f: -1 },
    { x: 628, y: 548, f: -1 }, { x: 408, y: 560, f: 1 },
    { x: 1062, y: 610, f: -1 }, { x: 648, y: 568, f: -1 },
    { x: 610, y: 488, f: 1 }, { x: 1096, y: 488, f: -1 },
    { x: 902, y: 556, f: 1 }, { x: 946, y: 562, f: 1 },
    { x: 1004, y: 558, f: -1 }, { x: 100, y: 566, f: 1 }
  ];
  function placeStillWalker(w) {
    var s = STILL_SPOT_LIST[w.idx % STILL_SPOT_LIST.length];
    var cycle = Math.floor(w.idx / STILL_SPOT_LIST.length);
    w.x = s.x + cycle * 22;
    w.y = s.y + cycle * 7;
    w.facing = s.f;
    w.mode = "idle";
    pose(w);
  }

  /* ---------------- Main loop and the governor ---------------- */

  var lastTs = 0;
  var frameAcc = 0;
  var frameN = 0;

  function freezeAll() {
    if (state.raf) window.cancelAnimationFrame(state.raf);
    state.raf = null;
    state.tier = "C";
    state.mode = "still";
    for (var i = 0; i < walkers.length; i++) {
      walkers[i].mode = "idle";
      walkers[i].gesture = null;
      pose(walkers[i]);
    }
    if (window.console && console.info) console.info("[lgcy-village] frame budget missed; village holds still.");
  }
  function loop(ts) {
    if (state.mode !== "roam") return;
    state.raf = window.requestAnimationFrame(loop);
    if (!state.visible || !state.onScreen) { lastTs = ts; return; }
    var dt = Math.min(0.05, (ts - lastTs) / 1000 || 0.016);
    lastTs = ts;
    frameAcc += dt;
    frameN++;
    if (frameN >= 90) {
      var avg = frameAcc / frameN;
      frameAcc = 0;
      frameN = 0;
      if (avg > 0.04) { freezeAll(); return; }
      if (avg > 0.026 && state.tier === "A") { state.tier = "B"; thinOut(); }
    }
    for (var i = 0; i < walkers.length; i++) stepWalker(walkers[i], dt);
    stepVehicles(dt);
  }

  /* ---------------- Fit and init ---------------- */

  function fitView() {
    var wpx = stage.clientWidth;
    if (wpx && wpx < 680) svg.setAttribute("viewBox", "90 10 1020 655");
    else svg.setAttribute("viewBox", "0 0 1200 675");
  }

  function init() {
    if (!PEOPLE.length) throw new Error("no villager data");
    fitView();
    window.addEventListener("resize", fitView);
    PEOPLE.forEach(function (p, i) {
      p.routeD = pathFromPoints(routePoints(p.routeStops));
      var w = makeWalker(p, i);
      w.x = NODES[p.home].x + w.ox;
      w.y = NODES[p.home].y + w.oy;
      walkers.push(w);
      walkersById[p.id] = w;
    });
    buildRoster();
    applyPhase(FORCED_PHASE || phaseFromClock());
    state.transport = vehKinds.slice();
    if (REDUCED || forceStill) {
      state.mode = "still";
      state.tier = "still";
      for (var i = 0; i < walkers.length; i++) placeStillWalker(walkers[i]);
      resort();
      parkVehicles();
      state.walkers = walkers.length;
      return;
    }
    state.mode = "roam";
    state.tier = "A";
    state.walkers = walkers.length;
    walkers.forEach(function (w, i) {
      w.idleDur = 0.4 + (i % 5) * 0.35 + Math.random() * 0.8;
      pose(w);
    });
    resort();
    state.visible = !document.hidden;
    state.onScreen = true;
    document.addEventListener("visibilitychange", function () { state.visible = !document.hidden; });
    if ("IntersectionObserver" in window) {
      new IntersectionObserver(function (entries) { state.onScreen = entries[0].isIntersecting; }, { threshold: 0.04 }).observe(stage);
    }
    if (params.get("traffic")) vehTimer = 0.5;
    state.raf = window.requestAnimationFrame(function (ts) {
      lastTs = ts;
      state.raf = window.requestAnimationFrame(loop);
    });
    if (!FORCED_PHASE) {
      window.setInterval(function () { applyPhase(phaseFromClock()); }, 45000);
    }
    if (state.phase === "night") retireWalkers();
  }

  try {
    init();
  } catch (err) {
    teardown("init-failed");
    if (window.console && console.info) console.info("[lgcy-village] init failed:", err);
  }
})();
