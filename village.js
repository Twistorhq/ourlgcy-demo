// Our LGCY Community tab: the papercraft village layer
// (TW-1077, papercraft rebuild TW-1227).
//
// Fail-closed contract, mirrored from gl/buck.js on the home page:
// the drawn village and the roster stand on their own in
// community.html (the roster ships as static HTML there). This
// layer only adds the villagers and their day. Any failure at any stage tears the layer down and the
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
// Frozen-age law (TW-1227): a villager is kept at the age they
// were when they passed, forever, while the village itself lives
// in the viewer's current year. The frozen age derives only from
// documented born and died years in the record; it grays the
// figure and is named on the roster. The figures are abstract
// papercraft people by design: paper shapes, no likenesses.
//
// The village keeps the viewer's real hours: the phase, the
// light, how many villagers are out, and how much traffic the
// road carries are all functions of the browser's current hour.
//
// QA overrides, in the spirit of ?gl=force-a on the home page:
//   ?village=still                 composed still, no roaming
//   ?village=dawn|morning|midday|afternoon|dusk|night
//                                  hold the village at that hour
//   ?village=0..23                 hold the village at that hour
//                                  of the clock (phase + density)
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
  var forceHour = null;
  if (forcePhase && /^\d{1,2}$/.test(forcePhase)) {
    var fh = parseInt(forcePhase, 10);
    if (fh >= 0 && fh <= 23) forceHour = fh;
  }

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
    // Frozen age: derived only when BOTH the birth year and the
    // passing year are documented. The figure is then rendered
    // at that age forever: silver hair past 65, a child's
    // stature under 18. Anything less documented keeps no frozen
    // age and renders as before.
    var frozenAge = null;
    if (documented && rec.diedStatus === "documented" && typeof rec.died === "number") {
      var fa = rec.died - rec.born;
      if (fa >= 0 && fa <= 115) frozenAge = fa;
    }
    var hair = pres.hair || "short";
    if (frozenAge !== null && frozenAge >= 65) {
      if (hair === "short") hair = "gray";
      else if (hair === "bun") hair = "bun-gray";
      else if (hair === "long") hair = "long-gray";
    }
    var scale = pres.scale || 1.0;
    if (frozenAge !== null && frozenAge < 18) scale *= 0.78;
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
    if (frozenAge !== null) {
      eraText +=
        " Kept at " + frozenAge + ", the age they were when they passed" +
        " in " + rec.died + ", while the village year moves on.";
    }
    return {
      id: rec.id,
      name: rec.name,
      born: typeof rec.born === "number" ? rec.born : null,
      bornStatus: rec.bornStatus || "unknown",
      died: typeof rec.died === "number" ? rec.died : null,
      diedStatus: rec.diedStatus || "unknown",
      frozenAge: frozenAge,
      documented: documented,
      line: rec.line || "",
      relatives: rec.relatives || "",
      kit: kit,
      hat: hat,
      prop: prop,
      apron: documented ? !!pres.apron : false,
      accent: pres.accent || "#454e47",
      hair: hair,
      home: home,
      routeStops: stops,
      speed: pres.speed || 30,
      scale: scale,
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
      died: p.died, diedStatus: p.diedStatus, frozenAge: p.frozenAge,
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
    well: { x: 555, y: 548, kind: "gather" },
    stall: { x: 963, y: 554, kind: "gather" },
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
     One skeleton under every figure, drawn like a professional
     pictogram wearing hand-drawn ink. Local coordinates: origin
     at the ground point between the feet, up is negative y. A
     figure stands about 104 units tall, hat included: legs 45,
     torso 32, head and neck the rest, the head about one sixth
     of the whole. One stroke system everywhere: filled shapes
     outlined at 2.4, limbs as 4.8 round-joined strokes, details
     at 1.7. Legs and arms are two-bone chains solved every
     frame: feet plant in the world and the body solves over
     them (no skating, no scissoring), elbows bend at the true
     joint, and the head rides steady against the body's sway. */

  var HIP_Y = -45, THIGH = 24.5, SHIN = 24;
  var SH_X = 9.5, SH_Y = -77, UARM = 12.5, FARM = 11.5;
  var SW_LIMB = 4.8;

  // Two-bone solver: given a root, a target, and the two bone
  // lengths, return the joint. "fwd" picks the solution ahead
  // of the line of travel (a knee); "low" picks the lower one,
  // "out" the one away from the body line (an elbow). The target is clamped to reach.
  function solve2(x0, y0, x1, y1, l1, l2, choose) {
    var dx = x1 - x0, dy = y1 - y0;
    var d = Math.hypot(dx, dy);
    var maxD = l1 + l2 - 0.05;
    if (d > maxD) { dx *= maxD / d; dy *= maxD / d; x1 = x0 + dx; y1 = y0 + dy; d = maxD; }
    if (d < 0.01) { dx = 0.01; dy = 0; d = 0.01; }
    var a = (l1 * l1 - l2 * l2 + d * d) / (2 * d);
    var h = Math.sqrt(Math.max(0, l1 * l1 - a * a));
    var ux = dx / d, uy = dy / d;
    var mx = x0 + a * ux, my = y0 + a * uy;
    var j1x = mx - uy * h, j1y = my + ux * h;
    var j2x = mx + uy * h, j2y = my - ux * h;
    if (choose === "fwd") return j1x >= j2x ? { x: j1x, y: j1y } : { x: j2x, y: j2y };
    if (choose === "out") return Math.abs(j1x) >= Math.abs(j2x) ? { x: j1x, y: j1y } : { x: j2x, y: j2y };
    return j1y >= j2y ? { x: j1x, y: j1y } : { x: j2x, y: j2y };
  }
  function limbPath(x0, y0, jx, jy, x1, y1) {
    return "M" + x0.toFixed(1) + " " + y0.toFixed(1) +
      " L" + jx.toFixed(1) + " " + jy.toFixed(1) +
      " L" + x1.toFixed(1) + " " + y1.toFixed(1);
  }
  // Forward kinematics for an arm: a1 is the shoulder angle in
  // degrees from straight down, positive forward; a2 is the
  // elbow bend, positive bending the forearm further forward.
  function armFK(sx, sy, a1deg, a2deg) {
    var a1 = a1deg * Math.PI / 180;
    var a2 = (a1deg + a2deg) * Math.PI / 180;
    var ex = sx + UARM * Math.sin(a1), ey = sy + UARM * Math.cos(a1);
    return { ex: ex, ey: ey, hx: ex + FARM * Math.sin(a2), hy: ey + FARM * Math.cos(a2) };
  }
  function shoeD() {
    return "M-5.6 0.5 L4.6 0.5 C6.8 0.5 7.6 -0.7 7.4 -2.1 L-2.4 -2.9 C-4.6 -2.5 -5.9 -1.5 -5.6 0.5 Z";
  }
  function basketMarkup() {
    return (
      '<path d="M-8.7 4.7 h21 l-3.2 12.5 h-14.6 z" fill="rgba(43,32,18,0.15)" stroke="none"/>' +
      '<path d="M-7.5 1 a7.5 6 0 0 1 15 0" fill="none" stroke="' + INK + '" stroke-width="2"/>' +
      '<path d="M-10.5 2.5 h21 l-3.2 12.5 h-14.6 z" fill="' + BASKET + '" stroke="' + INK + '" stroke-width="2" stroke-linejoin="round"/>' +
      '<path d="M-9 7.5 h18.5 M-8 11.5 h16.5" stroke="' + INK + '" stroke-width="1.2" opacity="0.55"/>'
    );
  }
  // Papercraft layering (TW-1227): every filled shape in a
  // figure is two sheets of paper, the shape itself and a copy
  // offset down-right in translucent warm brown, so the figure
  // reads as cut paper stacked on the scene. The copies are
  // static markup; the TW-1156 rig moves exactly as before.
  function psh(d) {
    return '<path d="' + d + '" fill="rgba(43,32,18,0.15)" stroke="none" transform="translate(1.8 2.2)"/>';
  }
  function torso(p) {
    var a = p.accent;
    var s = 'stroke="' + INK + '" stroke-width="2.4" stroke-linejoin="round"';
    switch (p.kit) {
      case "coat":
        return psh("M-11 -80 L-13 -36 L13 -36 L11 -80 Z") +
          '<path d="M-11 -80 L-13 -36 L-6 -36 L-4 -52 L4 -52 L6 -36 L13 -36 L11 -80 Z" fill="' + a + '" ' + s + '/>' +
          '<path d="M-4.5 -80 L0 -64 L4.5 -80 L4.5 -72 L0 -58 L-4.5 -72 Z" fill="' + PAPER + '" ' + s + '/>' +
          '<path d="M0 -58 L0 -40" stroke="' + INK + '" stroke-width="1.6"/>';
      case "suit":
        return psh("M-11 -80 L-12 -42 L12 -42 L11 -80 Z") +
          '<path d="M-11 -80 L-12 -42 L12 -42 L11 -80 Z" fill="' + a + '" ' + s + '/>' +
          '<path d="M-4.5 -80 L0 -62 L4.5 -80 L4.5 -70 L0 -56 L-4.5 -70 Z" fill="' + PAPER + '" ' + s + '/>';
      case "jacket":
        return psh("M-11 -79 L-12 -46 L12 -46 L11 -79 Z") +
          '<path d="M-11 -79 L-12 -46 L12 -46 L11 -79 Z" fill="' + a + '" ' + s + '/>' +
          '<path d="M0 -79 L0 -48" stroke="' + INK + '" stroke-width="1.8"/>';
      case "jacketModern":
        return psh("M-11 -80 L-12 -46 L12 -46 L11 -80 Z") +
          '<path d="M-11 -80 L-12 -46 L12 -46 L11 -80 Z" fill="' + a + '" ' + s + '/>' +
          '<path d="M-4 -80 L0 -60 L4 -80 Z" fill="' + PAPER + '" ' + s + '/>' +
          '<path d="M-4 -80 L-6 -46 M4 -80 L6 -46" fill="none" stroke="' + INK + '" stroke-width="1.6"/>';
      case "shirt":
        return psh("M-10 -80 L-11 -48 L11 -48 L10 -80 Z") +
          '<path d="M-10 -80 L-11 -48 L11 -48 L10 -80 Z" fill="' + PAPER + '" ' + s + '/>' +
          '<path d="M-3 -80 L0 -70 L3 -80" fill="none" stroke="' + INK + '" stroke-width="1.8"/>';
      case "hoodie":
        return psh("M-11 -80 L-12 -46 L12 -46 L11 -80 Z") +
          '<path d="M-11 -80 L-12 -46 L12 -46 L11 -80 Z" fill="' + a + '" ' + s + '/>' +
          '<rect x="-6.5" y="-58" width="13" height="8.5" fill="none" stroke="' + INK + '" stroke-width="1.8"/>';
      case "gown":
        return psh("M-9 -80 C -10.5 -68, -11.5 -60, -12 -53 L12 -53 C 11.5 -60, 10.5 -68, 9 -80 Z") +
          '<path d="M-9 -80 C -10.5 -68, -11.5 -60, -12 -53 L12 -53 C 11.5 -60, 10.5 -68, 9 -80 Z" fill="' + a + '" ' + s + '/>' +
          '<g class="wk-skirt" data-pivot="-53">' +
          psh("M-12 -53 C -15 -36, -17.5 -20, -19 -7 L19 -7 C 17.5 -20, 15 -36, 12 -53 Z") +
          '<path d="M-12 -53 C -15 -36, -17.5 -20, -19 -7 L19 -7 C 17.5 -20, 15 -36, 12 -53 Z" fill="' + a + '" ' + s + '/>' +
          (p.apron ? '<path d="M-7.5 -51 L7.5 -51 L10.5 -11 L-10.5 -11 Z" fill="' + PAPER + '" stroke="' + INK + '" stroke-width="1.8" opacity="0.92"/>' : "") +
          "</g>" +
          '<path d="M-11 -53.5 C -4 -50, 4 -50, 11 -53.5" fill="none" stroke="' + INK + '" stroke-width="1.8"/>';
      case "blouseSkirt":
        return psh("M-10 -80 L-11 -55 L11 -55 L10 -80 Z") +
          '<path d="M-10 -80 L-11 -55 L11 -55 L10 -80 Z" fill="' + PAPER + '" ' + s + '/>' +
          '<g class="wk-skirt" data-pivot="-55">' +
          psh("M-11 -55 C -14 -38, -16 -22, -17 -8 L17 -8 C 16 -22, 14 -38, 11 -55 Z") +
          '<path d="M-11 -55 C -14 -38, -16 -22, -17 -8 L17 -8 C 16 -22, 14 -38, 11 -55 Z" fill="' + a + '" ' + s + "/>" +
          "</g>";
      case "dress50s":
        return psh("M-9 -80 L-10 -57 L10 -57 L9 -80 Z") +
          '<path d="M-9 -80 L-10 -57 L10 -57 L9 -80 Z" fill="' + a + '" ' + s + '/>' +
          '<g class="wk-skirt" data-pivot="-57">' +
          psh("M-10 -57 C -18 -46, -20 -36, -21 -27 L21 -27 C 20 -36, 18 -46, 10 -57 Z") +
          '<path d="M-10 -57 C -18 -46, -20 -36, -21 -27 L21 -27 C 20 -36, 18 -46, 10 -57 Z" fill="' + a + '" ' + s + "/>" +
          "</g>";
      case "modernDress":
        return psh("M-9 -80 L-10 -56 L10 -56 L9 -80 Z") +
          '<path d="M-9 -80 L-10 -56 L10 -56 L9 -80 Z" fill="' + a + '" ' + s + '/>' +
          '<g class="wk-skirt" data-pivot="-56">' +
          psh("M-10 -56 C -14 -44, -15 -36, -15.5 -29 L15.5 -29 C 15 -36, 14 -44, 10 -56 Z") +
          '<path d="M-10 -56 C -14 -44, -15 -36, -15.5 -29 L15.5 -29 C 15 -36, 14 -44, 10 -56 Z" fill="' + a + '" ' + s + "/>" +
          "</g>";
      case "modernF":
        return psh("M-10 -80 L-11 -48 L11 -48 L10 -80 Z") +
          '<path d="M-10 -80 L-11 -48 L11 -48 L10 -80 Z" fill="' + a + '" ' + s + '/>' +
          '<path d="M-6 -80 L0 -68 L6 -80" fill="none" stroke="' + INK + '" stroke-width="1.8"/>';
      case "neutral":
        return psh("M-10 -80 L-11 -44 L11 -44 L10 -80 Z") +
          '<path d="M-10 -80 L-11 -44 L11 -44 L10 -80 Z" fill="' + a + '" ' + s + '/>' +
          '<path d="M-11 -50 L11 -50" stroke="' + INK + '" stroke-width="1.8"/>';
    }
    return "";
  }
  function head(p) {
    var hairFill = p.hair === "gray" || p.hair === "bun-gray" || p.hair === "long-gray" ? "#b9b2a0" : INK;
    var out = "";
    if (p.kit === "hoodie") {
      out += '<path d="M-11.5 -76 a11.5 13.5 0 0 1 23 0 l0 9 -23 0 Z" fill="' + p.accent + '" stroke="' + INK + '" stroke-width="2.2"/>';
    }
    out += '<circle cx="1.8" cy="-86.6" r="8" fill="rgba(43,32,18,0.14)"/>';
    out += '<circle cx="0" cy="-89" r="8" fill="' + PAPER + '" stroke="' + INK + '" stroke-width="2.2"/>';
    if (p.hair === "long" || p.hair === "long-gray") {
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
    var bare = p.kit === "dress50s" || p.kit === "modernDress";
    function legPair(side) {
      var shadow = '<path class="wk-leg' + side + 's" fill="none" stroke="rgba(43,32,18,0.15)" stroke-width="' + (SW_LIMB + 3.2) + '" stroke-linecap="round" stroke-linejoin="round" transform="translate(1.3 1.8)"/>';
      var under = bare
        ? '<path class="wk-leg' + side + 'u" fill="none" stroke="' + INK + '" stroke-width="6.6" stroke-linecap="round" stroke-linejoin="round"/>'
        : "";
      var main = bare
        ? '<path class="wk-leg' + side + 'p" fill="none" stroke="' + PAPER + '" stroke-width="4.3" stroke-linecap="round" stroke-linejoin="round"/>'
        : '<path class="wk-leg' + side + 'p" fill="none" stroke="' + INK + '" stroke-width="' + SW_LIMB + '" stroke-linecap="round" stroke-linejoin="round"/>';
      return shadow + under + main;
    }
    function armG(side) {
      return (
        '<g class="wk-arm' + side + '">' +
        '<path class="wk-arm' + side + 's" fill="none" stroke="rgba(43,32,18,0.15)" stroke-width="' + (SW_LIMB + 3.2) + '" stroke-linecap="round" stroke-linejoin="round" transform="translate(1.2 1.6)"/>' +
        '<path class="wk-arm' + side + 'p" fill="none" stroke="' + p.accent + '" stroke-width="' + SW_LIMB + '" stroke-linecap="round" stroke-linejoin="round"/>' +
        '<circle class="wk-hand' + side + '" r="2.6" fill="' + PAPER + '" stroke="' + INK + '" stroke-width="1.4"/>' +
        "</g>"
      );
    }
    var book = p.prop === "book"
      ? '<g class="wk-book"><rect x="-6.2" y="-68.8" width="16" height="11.5" fill="rgba(43,32,18,0.15)"/><rect x="-8" y="-71" width="16" height="11.5" fill="' + PAPER + '" stroke="' + INK + '" stroke-width="2"/><path d="M0 -71 v11.5" stroke="' + INK + '" stroke-width="1.4"/></g>'
      : "";
    return (
      '<ellipse class="wk-shadow" cx="0" cy="2.5" rx="17" ry="4.2" fill="rgba(43,32,18,0.20)"/>' +
      '<ellipse class="wk-ring" cx="0" cy="1.5" rx="21" ry="5" fill="none" stroke="#b9872c" stroke-width="2.4" opacity="0"/>' +
      '<g class="wk-flip">' +
      '<g class="wk-legs">' + legPair("l") + legPair("r") +
      '<path class="wk-shoel" d="' + shoeD() + '" fill="' + INK + '"/>' +
      '<path class="wk-shoer" d="' + shoeD() + '" fill="' + INK + '"/>' +
      "</g>" +
      '<g class="wk-upper">' + armG("l") + torso(p) + armG("r") + book +
      (p.prop === "basket" ? '<g class="wk-basket">' + basketMarkup() + "</g>" : "") +
      (p.prop === "cane" ? '<path class="wk-cane" fill="none" stroke="' + INK + '" stroke-width="2.6" stroke-linecap="round"/>' : "") +
      '<g class="wk-head">' + head(p) + "</g>" +
      "</g></g>" +
      '<rect class="wk-hit" x="-23" y="-114" width="46" height="118" fill="rgba(0,0,0,0)"/>'
    );
  }

  /* ---------------- The gait: feet belong to the world ----------------
     Each foot carries a ground position (gx) in the same units
     the body travels. Standing, a foot's ground position never
     changes: the body walks over it, and the two-bone leg
     solves the difference. When the planted foot trails too
     far behind, it lifts, arcs forward, and plants ahead of
     the body, alternating with its pair. Travel is accumulated
     in figure-local units, so stride, bob, and arm swing all
     read off the same clock the feet keep. */

  var STEP_LEN = 26.5, GAIT_LEAD = 14, GAIT_TRAIL = -12.5;
  var GAIT_LIFT = 6.5, GAIT_BOB = 1.9;

  function makeFoot(restX) {
    return { gx: restX, sw: false, from: restX, to: restX, t: 0, dur: 0.3, e: 0, lift: 1 };
  }
  function resetGait(w) {
    w.travel = 0;
    w.footL = makeFoot(-3.5);
    w.footR = makeFoot(3.5);
  }
  function easeInOut(t) {
    return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
  }
  function startSwing(w, f, speedLocal, liftScale) {
    var need = Math.max(8, w.travel + GAIT_LEAD - f.gx);
    f.dur = Math.min(0.55, Math.max(0.16, need / Math.max(34, speedLocal * 2.1)));
    f.from = f.gx;
    f.to = w.travel + GAIT_LEAD + speedLocal * f.dur * 0.85;
    f.t = 0;
    f.e = 0;
    f.sw = true;
    f.lift = liftScale || 1;
  }
  function updateGait(w, movedLocal, speedLocal, dt, active) {
    w.travel += movedLocal;
    var feet = [w.footL, w.footR];
    var i, f;
    for (i = 0; i < 2; i++) {
      f = feet[i];
      if (f.sw) {
        f.t += dt;
        var pr = Math.min(1, f.t / f.dur);
        f.e = easeInOut(pr);
        f.gx = f.from + (f.to - f.from) * f.e;
        if (pr >= 1) { f.sw = false; f.gx = f.to; f.e = 0; }
      }
    }
    if (active && speedLocal > 3) {
      var back = w.footL.gx - w.travel < w.footR.gx - w.travel ? w.footL : w.footR;
      var front = back === w.footL ? w.footR : w.footL;
      if (!back.sw && !front.sw && back.gx - w.travel < GAIT_TRAIL) {
        startSwing(w, back, speedLocal, 1);
      } else if (!back.sw && front.sw && front.t / front.dur > 0.7 && back.gx - w.travel < GAIT_TRAIL + 3.5) {
        startSwing(w, back, speedLocal, 1);
      }
    } else if (!active) {
      var rests = [-3.5, 3.5];
      for (i = 0; i < 2; i++) {
        f = feet[i];
        if (!f.sw && Math.abs(f.gx - w.travel - rests[i]) > 2.5) {
          f.from = f.gx;
          f.to = w.travel + rests[i];
          f.dur = 0.22;
          f.t = 0;
          f.e = 0;
          f.sw = true;
          f.lift = 0.4;
        }
      }
    }
  }
  function footPose(f, travel) {
    var liftNow = f.sw ? Math.sin(Math.PI * f.e) * GAIT_LIFT * f.lift : 0;
    return {
      x: f.gx - travel,
      y: -liftNow,
      pitch: f.sw ? -15 * Math.sin(Math.PI * f.e) * f.lift : 0
    };
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
      '<circle class="v-headlight" cx="20" cy="-52" r="11" fill="#f7e3a1"/>' +
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
      '<path class="v-headlight" d="M113 -52 L170 -42 L170 -29 L113 -41 Z" fill="#f7e3a1"/>' +
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
      '<path class="v-headlight" d="M139 -33 L198 -24 L198 -12 L138 -25 Z" fill="#f7e3a1"/>' +
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
      '<path class="v-headlight" d="M125 -39 L184 -30 L184 -18 L124 -30 Z" fill="#f7e3a1"/>' +
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
    var sh = document.createElementNS(SVGNS, "ellipse");
    sh.setAttribute("cx", (VEH_LEN[kind] / 2).toFixed(0));
    sh.setAttribute("cy", "2.5");
    sh.setAttribute("rx", (VEH_LEN[kind] / 2).toFixed(0));
    sh.setAttribute("ry", "4.5");
    sh.setAttribute("fill", "rgba(43,32,18,0.18)");
    g.insertBefore(sh, g.firstChild);
    vehLayer.appendChild(g);
    return {
      kind: kind, el: g, active: false, x: 0, y: 0, dir: 1, scale: 1,
      speed: VEH_SPEED[kind], len: VEH_LEN[kind], wheelA: 0, legT: 0, sayCool: 0,
      wheels: g.querySelectorAll(".v-wheel"),
      legsA: g.querySelector(".v-legs-a"), legsB: g.querySelector(".v-legs-b")
    };
  }

  // How long the road rests between vehicles, by phase: the
  // street is busy at midday and near silent at night.
  var VEH_GAP = {
    dawn: [16, 26], morning: [8, 14], midday: [6, 11],
    afternoon: [7, 12], dusk: [11, 18], night: [26, 44]
  };
  function nextVehGap() {
    var g = VEH_GAP[state.phase] || VEH_GAP.midday;
    return g[0] + Math.random() * (g[1] - g[0]);
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
    a.setAttribute("aria-label", person.name + ", " + person.yearPhrase + (person.frozenAge !== null ? ", kept at the age of " + person.frozenAge : "") + ". Open their profile.");
    a.setAttribute("data-kit", person.kit);
    a.setAttribute("data-status", person.bornStatus);
    var g = document.createElementNS(SVGNS, "g");
    g.innerHTML = figureMarkup(person);
    a.appendChild(g);
    layer.appendChild(a);
    var w = {
      person: person, el: a, idx: idx,
      flipEl: g.querySelector(".wk-flip"), upperEl: g.querySelector(".wk-upper"),
      headEl: g.querySelector(".wk-head"),
      legLP: g.querySelector(".wk-leglp"), legLU: g.querySelector(".wk-leglu"),
      legRP: g.querySelector(".wk-legrp"), legRU: g.querySelector(".wk-legru"),
      legLS: g.querySelector(".wk-legls"), legRS: g.querySelector(".wk-legrs"),
      armLP: g.querySelector(".wk-armlp"), handL: g.querySelector(".wk-handl"),
      armRP: g.querySelector(".wk-armrp"), handR: g.querySelector(".wk-handr"),
      armLS: g.querySelector(".wk-armls"), armRS: g.querySelector(".wk-armrs"),
      shoeL: g.querySelector(".wk-shoel"), shoeR: g.querySelector(".wk-shoer"),
      basketEl: g.querySelector(".wk-basket"), caneEl: g.querySelector(".wk-cane"),
      skirtEl: g.querySelector(".wk-skirt"),
      skirtPivot: -54,
      ringEl: g.querySelector(".wk-ring"),
      x: 0, y: 0, ox: ((idx * 37) % 61) - 30, oy: ((idx * 19) % 17) - 8,
      facing: 1, phase: Math.random() * 6.28, moveV: 0,
      mode: "idle", node: person.home, routeIdx: 0, path: null, pathIdx: 0, target: null,
      idleT: 0, idleDur: 2, inside: false, goingIn: false, insideT: 0, insideDur: 0, fade: 1,
      gesture: null, gestureT: 0, gestureDur: 1.2, chatWith: null, chatT: 0, retire: false
    };
    if (w.skirtEl && w.skirtEl.dataset && w.skirtEl.dataset.pivot) {
      w.skirtPivot = parseFloat(w.skirtEl.dataset.pivot) || -54;
    }
    resetGait(w);
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

  function poseLeg(w, side, hipX, bobY, fp) {
    var hipY = HIP_Y + bobY;
    var pathEl = side === "l" ? w.legLP : w.legRP;
    var underEl = side === "l" ? w.legLU : w.legRU;
    var shadowEl = side === "l" ? w.legLS : w.legRS;
    if (!pathEl) return;
    if (w.person.kit === "gown" || w.person.kit === "blouseSkirt") {
      // Covered by the skirt: only an ankle steps out from
      // under the hem, driven by the same planted foot.
      var hemY = w.person.kit === "gown" ? -8 : -9;
      var ankleD = "M" + (fp.x * 0.55).toFixed(1) + " " + hemY + " L" + fp.x.toFixed(1) + " " + fp.y.toFixed(1);
      pathEl.setAttribute("d", ankleD);
      if (shadowEl) shadowEl.setAttribute("d", ankleD);
      if (underEl) underEl.setAttribute("d", "");
      return;
    }
    var knee = solve2(hipX, hipY, fp.x, fp.y, THIGH, SHIN, "fwd");
    var d = limbPath(hipX, hipY, knee.x, knee.y, fp.x, fp.y);
    pathEl.setAttribute("d", d);
    if (shadowEl) shadowEl.setAttribute("d", d);
    if (underEl) underEl.setAttribute("d", d);
  }
  function poseShoe(el, fp) {
    if (!el) return;
    el.setAttribute("transform", "translate(" + fp.x.toFixed(1) + " " + fp.y.toFixed(1) + ") rotate(" + fp.pitch.toFixed(1) + ")");
  }
  // Pose one arm. The override, when present, is either an FK
  // pose ({a1, a2}) or an IK reach ({ikx, iky, env}) blended
  // from the hanging rest point. Otherwise the arm swings in
  // counterphase to the opposite leg, carries its prop, or
  // holds the book open with both hands solved to its corners.
  function poseArm(w, side, override, swingDeg, bobY) {
    var pathEl = side === "l" ? w.armLP : w.armRP;
    var handEl = side === "l" ? w.handL : w.handR;
    if (!pathEl) return null;
    var sx = side === "l" ? -SH_X : SH_X;
    var p = w.person;
    var pts = null;
    if (override && override.ikx !== undefined) {
      var env = override.env;
      var tx = sx + (override.ikx - sx) * env + (side === "l" ? -2 : 2) * (1 - env);
      var ty = -54 + (override.iky + 54) * env;
      var elbow = solve2(sx, SH_Y, tx, ty, UARM, FARM, "out");
      pts = { ex: elbow.x, ey: elbow.y, hx: tx, hy: ty };
    } else if (override) {
      pts = armFK(sx, SH_Y, override.a1, override.a2);
    } else if (p.prop === "book") {
      var bel = solve2(sx, SH_Y, side === "l" ? -9.8 : 9.8, -58.5, UARM, FARM, "out");
      pts = { ex: bel.x, ey: bel.y, hx: side === "l" ? -9.8 : 9.8, hy: -58.5 };
    } else if (p.prop === "cane" && side === "r") {
      pts = armFK(sx, SH_Y, 15, 9);
    } else if (p.prop === "basket" && side === "r") {
      pts = armFK(sx, SH_Y, 5 + swingDeg * 0.25, 7);
    } else if (w.mode === "walk") {
      var a1 = Math.max(-27, Math.min(27, swingDeg));
      pts = armFK(sx, SH_Y, a1, 13 + Math.max(0, a1) * 0.5);
    } else {
      var sway = 2.2 * Math.sin(w.idleT * 0.85 + w.idx * 1.7 + (side === "r" ? 0.6 : 0));
      pts = armFK(sx, SH_Y, sway, 12);
    }
    var armD = limbPath(sx, SH_Y, pts.ex, pts.ey, pts.hx, pts.hy);
    pathEl.setAttribute("d", armD);
    var armShadow = side === "l" ? w.armLS : w.armRS;
    if (armShadow) armShadow.setAttribute("d", armD);
    if (handEl) {
      handEl.setAttribute("cx", pts.hx.toFixed(1));
      handEl.setAttribute("cy", pts.hy.toFixed(1));
    }
    return pts;
  }

  function pose(w) {
    var p = w.person;
    var walking = w.mode === "walk";
    var speedF = Math.max(0, Math.min(1.15, w.moveV / Math.max(1, p.speed)));
    var cyc = w.travel / STEP_LEN;
    var bobY = 0, upperRot = 0;
    if (walking) {
      // The body dips as each foot plants and rises over the
      // planted leg, twice a stride; the torso leans into the
      // walk and rolls a degree with the weight shift.
      bobY = -GAIT_BOB * (0.5 - 0.5 * Math.cos(2 * Math.PI * cyc)) * Math.min(1, speedF + 0.3);
      upperRot = 2.3 * speedF + 1.2 * Math.sin(Math.PI * cyc) * speedF;
    }
    // Gestures: one free arm, rebuilt on the same joints, so a
    // wave raises a bent elbow and a hat tip solves the hand to
    // the brim instead of swinging the whole arm like a flag.
    var overL = null, overR = null, headGesture = 0;
    if (w.gesture) {
      var pr = Math.min(1, w.gestureT / w.gestureDur);
      var env = Math.sin(pr * Math.PI);
      var freeSide = p.prop === "cane" || p.prop === "basket" ? "l" : "r";
      if (w.gesture === "wave") {
        var wave = { a1: 158 * env, a2: -42 * env + 20 * Math.sin(pr * 15) * env };
        if (freeSide === "l") overL = wave; else overR = wave;
      } else if (w.gesture === "tip") {
        var tip = { ikx: freeSide === "l" ? -12.6 : 12.6, iky: -93.2, env: env };
        if (freeSide === "l") overL = tip; else overR = tip;
        headGesture = 10 * env;
        upperRot += 3.2 * env;
      } else {
        headGesture = 7.5 * Math.sin(pr * Math.PI * 2) * env;
      }
    }
    // Legs solve from the bobbing hip to the planted feet.
    var fl = footPose(w.footL, w.travel);
    var fr = footPose(w.footR, w.travel);
    poseLeg(w, "l", -3.5, bobY, fl);
    poseLeg(w, "r", 3.5, bobY, fr);
    poseShoe(w.shoeL, fl);
    poseShoe(w.shoeR, fr);
    // Arms swing against the opposite leg's stride.
    var swingL = Math.max(-27, Math.min(27, -fr.x * 1.3));
    var swingR = Math.max(-27, Math.min(27, -fl.x * 1.3));
    var handL = poseArm(w, "l", overL, swingL, bobY);
    var handR = poseArm(w, "r", overR, swingR, bobY);
    // Carried things ride the hand that holds them: the basket
    // swings a beat behind the stride, the cane taps the
    // ground ahead of the step.
    if (w.basketEl && handR) {
      var bSway = walking
        ? -9 * Math.sin(2 * Math.PI * cyc - 1.05) * speedF
        : 1.6 * Math.sin(w.idleT * 0.8);
      w.basketEl.setAttribute("transform", "translate(" + handR.hx.toFixed(1) + " " + handR.hy.toFixed(1) + ") rotate(" + bSway.toFixed(1) + ")");
    }
    if (w.caneEl && handR) {
      var tipX = handR.hx + 6 + (walking ? 3 * Math.sin(2 * Math.PI * cyc) : 0);
      w.caneEl.setAttribute("d", "M" + handR.hx.toFixed(1) + " " + handR.hy.toFixed(1) + " L" + tipX.toFixed(1) + " " + (-bobY + 0.5).toFixed(1));
    }
    // The skirt hem trails the stride by a beat.
    if (w.skirtEl) {
      var skRot = walking
        ? -2.1 * Math.sin(2 * Math.PI * cyc - 0.85) * speedF
        : 0.5 * Math.sin(w.idleT * 0.7 + 1);
      w.skirtEl.setAttribute("transform", "rotate(" + skRot.toFixed(2) + " 0 " + w.skirtPivot + ")");
    }
    // The head stays near level against the body's motion,
    // with its own small lag, plus any gesture bow.
    var headRot = headGesture;
    if (walking) headRot += -upperRot * 0.4 + 1.1 * Math.sin(2 * Math.PI * cyc - 0.7) * speedF;
    if (w.headEl) {
      w.headEl.setAttribute("transform", headRot ? "rotate(" + headRot.toFixed(1) + " 0 -80)" : "");
    }
    if (w.upperEl) {
      w.upperEl.setAttribute("transform", "translate(0 " + bobY.toFixed(2) + ") rotate(" + upperRot.toFixed(2) + " 0 -44)");
    }
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
    // Walks begin from a standstill and gather speed; the
    // trailing foot takes the first step as the body leans in.
    w.moveV = Math.min(w.moveV || 0, 8);
    if (!w.footL.sw && !w.footR.sw) startSwing(w, w.footR, Math.max(20, w.person.speed), 1);
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
    w.moveV = 0;
    resetGait(w);
    w.mode = "idle";
    w.idleT = 0;
    w.idleDur = 1 + Math.random() * 2.5;
    resort();
  }
  function arrive(w, nodeId) {
    w.node = nodeId;
    w.mode = "idle";
    w.moveV = 0;
    resetGait(w);
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
    if (w.retire) {
      // Sent home by the hour (or by the governor): home, and in.
      if (w.node === w.person.home) { goInside(w); return; }
      startWalk(w, w.person.home);
      return;
    }
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
      // Speed eases: gather from a standstill, and bleed off
      // over the last stretch of the final leg, so arrivals
      // settle instead of stopping dead.
      var cruise = w.person.speed * (state.phase === "night" ? 0.85 : 1);
      var desired = cruise;
      if (w.pathIdx === w.path.length - 1) {
        desired = cruise * Math.max(0.16, Math.min(1, dist / 46));
      }
      var rate = desired > w.moveV ? 60 : 115;
      w.moveV += Math.max(-rate * dt, Math.min(rate * dt, desired - w.moveV));
      if (w.moveV < 2) w.moveV = 2;
      var step = Math.min(w.moveV * dt, dist);
      var scaleNow = Math.max(0.4, depthScale(w.y) * w.person.scale);
      if (dist <= Math.max(step, 1.2)) {
        w.x = target.x;
        w.y = target.y;
        updateGait(w, step / scaleNow, w.moveV / scaleNow, dt, true);
        w.pathIdx++;
        if (w.pathIdx >= w.path.length) arrive(w, w.target);
      } else {
        w.x += (dx / dist) * step;
        w.y += (dy / dist) * step;
        updateGait(w, step / scaleNow, w.moveV / scaleNow, dt, true);
        if (Math.abs(dx) > 2) w.facing = dx > 0 ? 1 : -1;
      }
      pose(w);
      return;
    }
    w.idleT += dt;
    chatStep(w, dt);
    if (!w.gesture && Math.random() < dt * 0.045) triggerGesture(w, false);
    if (w.idleT >= w.idleDur && !w.chatWith) decide(w);
    updateGait(w, 0, 0, dt, false);
    pose(w);
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
      if (v.kind === "buggy") buggySpeechCheck(v);
      if ((v.dir === 1 && v.x > 1240) || (v.dir === -1 && v.x < -10)) {
        v.active = false;
        v.el.style.display = "none";
        vehTimer = nextVehGap();
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

  /* ---------------- Era-quirk speech ----------------
     The village is a time encapsulation: every ancestor lives
     at the age they passed, in a street the current year keeps
     adding to. When someone passes a thing from a generation
     not their own, they say so. The trigger is data, not
     script: a walker's era is their documented birth year plus
     25 (the same figuring as their dress), each landmark and
     vehicle carries the era it belongs to, and a gap of 45
     years or more between the two is what makes it strange
     enough to remark on. Era-neutral figures (no documented
     year) never remark: the record does not settle their era,
     so the village does not invent one. Lines are written per
     era pairing, warm and wondering, never mocking. */

  var LANDMARKS = [
    { id: "gas", x: 1060, y: 560, era: 1935, kind: "gas" },
    { id: "store", x: 869, y: 490, era: 1915, kind: "store" },
    { id: "stall", x: 963, y: 554, era: 1905, kind: "stall" },
    { id: "well", x: 555, y: 548, era: 1840, kind: "well" }
  ];
  var VEHICLE_ERA = { buggy: 1890, modelt: 1920, sedan: 1975, suv: 2005 };
  var SPEECH = {
    oldSeesNew: {
      gas: [
        "What is that?",
        "It runs with no horse at all?",
        "They feed it from a pump?",
        "Well, I never in my days.",
        "Is it safe to stand near?"
      ],
      suv: [
        "What is that contraption?",
        "No horses? None at all?",
        "It goes all by itself!",
        "Mercy, look at it go."
      ],
      sedan: [
        "What is that long thing?",
        "A carriage with no horse?",
        "It hums instead of clopping."
      ],
      modelt: [
        "A carriage with no horse?",
        "What is that racket?",
        "It starts with a crank?"
      ],
      store: ["The store has glass like a greenhouse now."],
      generic: ["Well, I never.", "Times do change.", "Would you look at that."]
    },
    newSeesOld: {
      buggy: [
        "A real horse and buggy!",
        "They still take the buggy out.",
        "Slower, but it gets there.",
        "Look, an actual horse!"
      ],
      well: [
        "Folks drew every drop by hand here.",
        "Imagine hauling your water home."
      ],
      stall: ["A market stall, just like the stories."],
      generic: ["So that is how they did it.", "From another time, right here."]
    }
  };

  var bubbleLayer = document.getElementById("v-bubbles");
  var activeBubbles = 0;
  // The texts currently on screen. A line that is still
  // displayed is never shown twice at once: pickLine's guard
  // only stops consecutive repeats, so the choke point here
  // refuses any text already in this set, for walker speech
  // and the buggy's driver alike. A refused pick simply does
  // not speak this tick; the next pick moves to another line.
  var activeTexts = {};
  state.speechCount = 0;
  state.showBubble = function (x, y, text) { return showBubble(x, y, text); };

  function showBubble(x, y, text) {
    if (!bubbleLayer || activeBubbles >= 2) return false;
    if (activeTexts[text]) return false;
    activeTexts[text] = true;
    var wpx = Math.round(text.length * 6.9 + 26);
    var g = document.createElementNS(SVGNS, "g");
    g.setAttribute("class", "v-bubble");
    g.setAttribute("transform", "translate(" + x.toFixed(1) + " " + y.toFixed(1) + ")");
    var inner = document.createElementNS(SVGNS, "g");
    inner.setAttribute("class", "v-bubble-in");
    inner.innerHTML =
      '<rect class="v-bubble-box" x="' + (-wpx / 2) + '" y="-36" width="' + wpx + '" height="28" rx="9"></rect>' +
      '<polygon class="v-bubble-tail" points="-6,-9 6,-9 0,-1"></polygon>' +
      '<text y="-17">' + text + "</text>";
    g.appendChild(inner);
    bubbleLayer.appendChild(g);
    activeBubbles++;
    state.speechCount++;
    window.setTimeout(function () {
      inner.setAttribute("class", "v-bubble-out");
      window.setTimeout(function () {
        if (g.parentNode) g.parentNode.removeChild(g);
        activeBubbles = Math.max(0, activeBubbles - 1);
        delete activeTexts[text];
      }, 420);
    }, 3400);
    return true;
  }
  var lastLineGlobal = null;
  function pickLine(w, setName, kind) {
    var set = SPEECH[setName];
    var lines = set[kind] || set.generic;
    var line = lines[(Math.random() * lines.length) | 0];
    if ((line === w.lastLine || line === lastLineGlobal) && lines.length > 1) {
      line = lines[(lines.indexOf(line) + 1) % lines.length];
    }
    if (line === lastLineGlobal && lines.length > 2) {
      line = lines[(lines.indexOf(line) + 1) % lines.length];
    }
    w.lastLine = line;
    lastLineGlobal = line;
    return line;
  }
  function eraRemark(w, objEra, kind) {
    var era = w.person.born + 25;
    var diff = objEra - era;
    if (diff >= 45) return pickLine(w, "oldSeesNew", kind);
    if (diff <= -45) return pickLine(w, "newSeesOld", kind);
    return null;
  }
  var sayAcc = 0;
  function speechStep(dt) {
    sayAcc += dt;
    if (sayAcc < 0.3) return;
    sayAcc = 0;
    if (state.mode !== "roam") return;
    var now = state.time || 0;
    for (var i = 0; i < walkers.length; i++) {
      var w = walkers[i];
      if (w.inside || w.goingIn || w.fade < 0.6) continue;
      if (!w.person.documented) continue;
      if (now < (w.sayCool || 0)) continue;
      var spoken = false;
      for (var j = 0; j < LANDMARKS.length; j++) {
        var lm = LANDMARKS[j];
        if (Math.abs(w.x - lm.x) < 62 && Math.abs(w.y - lm.y) < 74) {
          var line = eraRemark(w, lm.era, lm.kind);
          if (line && showBubble(w.x, w.y - 122 * depthScale(w.y) * w.person.scale, line)) spoken = true;
          break;
        }
      }
      if (!spoken) {
        for (var k = 0; k < vehicles.length; k++) {
          var v = vehicles[k];
          if (!v.active) continue;
          var cx = v.x + v.dir * v.scale * (v.len / 2);
          if (Math.abs(w.x - cx) < 58 && Math.abs(w.y - v.y) < 52) {
            var line2 = eraRemark(w, VEHICLE_ERA[v.kind], v.kind);
            if (line2 && showBubble(w.x, w.y - 122 * depthScale(w.y) * w.person.scale, line2)) spoken = true;
            break;
          }
        }
      }
      if (spoken) w.sayCool = now + 11 + Math.random() * 9;
    }
  }
  // The founder's example, wired as data: the buggy's driver is
  // a person of the buggy's own era, and the filling station is
  // not. When the buggy passes the pumps, the driver marvels.
  function buggySpeechCheck(v) {
    if (state.mode !== "roam") return;
    var now = state.time || 0;
    if (now < (v.sayCool || 0)) return;
    var driverX = v.x + v.dir * v.scale * 26;
    if (Math.abs(driverX - 1060) < 42) {
      var lines = SPEECH.oldSeesNew.gas;
      var line = lines[(Math.random() * lines.length) | 0];
      if (showBubble(driverX, v.y - 98 * v.scale, line)) {
        v.sayCool = now + 24;
      }
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
  var FORCED_PHASE = forceHour !== null
    ? phaseForHour(forceHour)
    : (forcePhase && PHASES[forcePhase] ? forcePhase : null);

  // The hour-to-phase mapping, kept pure so the harness can
  // assert the unforced mapping at the boundary hours. Night is
  // tested first: 20:00 to 04:59 is night, deep night included.
  function phaseForHour(h) {
    if (h >= 20 || h < 5) return "night";
    if (h < 7) return "dawn";
    if (h < 11) return "morning";
    if (h < 15) return "midday";
    if (h < 18) return "afternoon";
    return "dusk";
  }
  function currentHour() {
    return forceHour !== null ? forceHour : new Date().getHours();
  }
  function phaseFromClock() {
    return phaseForHour(currentHour());
  }
  state.phaseForHour = phaseForHour;
  state.currentHour = currentHour;

  // How much of the village is out, by phase: the density of
  // the street is a function of the viewer's hour. Midday the
  // whole roster is out on errands; at night only the keepers
  // remain. Traffic density follows the same curve (VEH_GAP).
  var PHASE_ACTIVITY = {
    dawn: 0.4, morning: 0.85, midday: 1.0,
    afternoon: 0.9, dusk: 0.55, night: 0.16
  };
  state.activityForPhase = function (name) {
    return PHASE_ACTIVITY[name];
  };
  function keeperCount() {
    var n = 0;
    for (var id in NIGHT_KEEPERS) if (NIGHT_KEEPERS[id]) n++;
    return n;
  }
  function desiredOut(name) {
    if (name === "night") return keeperCount();
    return Math.max(3, Math.round(PEOPLE.length * (PHASE_ACTIVITY[name] || 1)));
  }
  state.desiredOutForPhase = desiredOut;
  // Bring the street to the phase's density: send the excess
  // home (they walk, they do not vanish) and let the missing
  // out of their doors. Called on every phase change and once
  // at startup, so opening the page at 2am opens a quiet street.
  function adjustPopulation(name) {
    if (state.mode !== "roam") return;
    var want = desiredOut(name);
    state.desiredOut = want;
    var out = [];
    var i, w;
    for (i = 0; i < walkers.length; i++) {
      w = walkers[i];
      if (!w.inside && !w.goingIn) out.push(w);
    }
    if (out.length > want) {
      var need = out.length - want;
      out.sort(function (a, b) {
        var ka = NIGHT_KEEPERS[a.person.id] ? 1 : 0;
        var kb = NIGHT_KEEPERS[b.person.id] ? 1 : 0;
        return ka - kb;
      });
      for (i = 0; i < out.length && need > 0; i++) {
        w = out[i];
        if (w.retire) { need--; continue; }
        w.retire = true;
        need--;
        if (w.mode === "idle") {
          if (w.node === w.person.home) goInside(w);
          else startWalk(w, w.person.home);
        }
      }
    } else if (out.length < want) {
      var deficit = want - out.length;
      for (i = 0; i < walkers.length; i++) walkers[i].retire = false;
      for (i = 0; i < walkers.length && deficit > 0; i++) {
        w = walkers[i];
        if (w.inside && !w.goingIn) {
          exitHouse(w);
          deficit--;
        }
      }
    } else {
      for (i = 0; i < walkers.length; i++) {
        if (!walkers[i].inside) walkers[i].retire = false;
      }
    }
  }
  function applyPhase(name) {
    var ph = PHASES[name];
    if (!ph) return;
    state.phase = name;
    state.hour = currentHour();
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
    adjustPopulation(name);
  }

  /* ---------------- Roster ---------------- */

  function buildRoster() {
    var list = document.getElementById("roster-list");
    if (!list) return;
    // community.html ships this same roster as static HTML, the
    // floor that stands when this layer never loads. Clear and
    // replace it so the two never duplicate: one list, one source
    // (the records), whichever way the page was reached.
    list.innerHTML = "";
    PEOPLE.forEach(function (p) {
      var li = document.createElement("li");
      var a = document.createElement("a");
      a.className = "roster-btn";
      a.href = "person.html";
      a.setAttribute("aria-label", p.name + ", " + p.yearPhrase + ", " + p.line + (p.frozenAge !== null ? ", kept at the age of " + p.frozenAge : "") + ". Open their profile.");
      var meta =
        p.yearPhrase.charAt(0).toUpperCase() + p.yearPhrase.slice(1) +
        " · " + p.line + (p.relatives ? " · " + p.relatives : "") +
        (p.frozenAge !== null ? " · Age kept at " + p.frozenAge : "");
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
    { x: 610, y: 488, f: 1 }, { x: 1120, y: 614, f: -1 },
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
    state.time = (state.time || 0) + dt;
    for (var i = 0; i < walkers.length; i++) stepWalker(walkers[i], dt);
    stepVehicles(dt);
    speechStep(dt);
  }

  /* ---------------- Fit and init ---------------- */

  function fitView() {
    var wpx = stage.clientWidth;
    if (wpx && wpx < 680) svg.setAttribute("viewBox", "90 10 1020 655");
    else svg.setAttribute("viewBox", "0 0 1200 675");
  }

  // The world is stacked paper; looking across it leans the
  // stack a little, near layers traveling farther than far
  // ones. Pointer only, and never under reduced motion.
  function initParallax() {
    if (REDUCED) return;
    var layers = [
      { el: document.getElementById("v-layer-far"), fx: 10, fy: 3 },
      { el: document.getElementById("v-layer-mid"), fx: 5, fy: 1.6 },
      { el: document.getElementById("v-layer-fore"), fx: 14, fy: 4.5 }
    ].filter(function (l) { return !!l.el; });
    if (!layers.length) return;
    state.parallax = true;
    stage.addEventListener("pointermove", function (e) {
      var r = stage.getBoundingClientRect();
      if (!r.width || !r.height) return;
      var nx = (e.clientX - r.left) / r.width - 0.5;
      var ny = (e.clientY - r.top) / r.height - 0.5;
      for (var i = 0; i < layers.length; i++) {
        var l = layers[i];
        l.el.style.transform = "translate(" + (nx * l.fx).toFixed(1) + "px, " + (ny * l.fy).toFixed(1) + "px)";
      }
    });
    stage.addEventListener("pointerleave", function () {
      for (var i = 0; i < layers.length; i++) layers[i].el.style.transform = "";
    });
  }

  function init() {
    if (!PEOPLE.length) throw new Error("no villager data");
    fitView();
    window.addEventListener("resize", fitView);
    initParallax();
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
    else vehTimer = nextVehGap() * 0.4;
    state.raf = window.requestAnimationFrame(function (ts) {
      lastTs = ts;
      state.raf = window.requestAnimationFrame(loop);
    });
    if (!FORCED_PHASE) {
      window.setInterval(function () { applyPhase(phaseFromClock()); }, 45000);
    }
    adjustPopulation(state.phase);
  }

  try {
    init();
  } catch (err) {
    teardown("init-failed");
    if (window.console && console.info) console.info("[lgcy-village] init failed:", err);
  }
})();
