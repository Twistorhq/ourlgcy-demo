// Our LGCY Community, overhead world layer (TW-1232 slice 1).
//
// The Community page becomes a world: a tile world larger than
// its box, seen from directly overhead in the founder's binding
// reference direction (twistor-lab/projects/our-lgcy/references/
// tw1232/). The signed-in person stands at the center with a
// ground marker; the camera follows him as he walks (click to
// move); the neighborhood keeps living while he stands still.
//
// The people come from records, not from this file: the roster
// is data-driven from world-data.js (window.LGCY_WORLD_PEOPLE,
// drawn from the TW-1155 lineage pack), and this layer derives
// era dress, frozen ages, rounds, and greetings from the
// records by the status law stated in that file.
//
// Speech law (TW-1232, revising TW-1227): bubbles are never
// ambient. A greeting fires only when a relative's path crosses
// the visitor's: she pauses, turns, waves, speaks, and walks
// on. One greeting at a time, and a line already on screen is
// never repeated at the same moment (the TW-1227 guard).
//
// The clock is the viewer's real clock: the hour sets the
// light and how many relatives are out; the day sets Saturday
// at the stadium. Overrides ride the URL for proof and review:
// ?village=0..23 pins the hour (the TW-1227 convention),
// ?day=sat / ?day=week pins the day, ?zoom= sets the camera.

(function () {
  "use strict";

  var stage = document.getElementById("world-stage");
  if (!stage || !window.LGCY_WORLD_PEOPLE) return;
  var canvas = document.getElementById("world-canvas");
  var ctx = canvas.getContext("2d");
  var mini = document.getElementById("world-minimap");
  var mctx = mini.getContext("2d");
  var bubbleEl = document.getElementById("world-bubble");
  var liveEl = document.getElementById("world-live");
  var clockEl = document.getElementById("world-clock");

  /* ------------------------- seeded random ------------------------- */
  var seed = 20261120;
  function rnd() {
    seed = (seed * 1103515245 + 12345) & 0x7fffffff;
    return seed / 0x7fffffff;
  }
  function rr(a, b) { return a + rnd() * (b - a); }
  function pick(arr) { return arr[Math.floor(rnd() * arr.length) % arr.length]; }

  /* ------------------------- world geometry ------------------------ */
  var TILE = 40, COLS = 80, ROWS = 60, W = 3200, H = 2400;

  var HOUSES = {
    h1: { x: 260, y: 1920, w: 240, h: 170, roof: "#d9c8a6", door: [380, 1910], side: "n" },
    h2: { x: 1080, y: 1920, w: 240, h: 170, roof: "#c9ae84", door: [1200, 1910], side: "n" },
    h3: { x: 1560, y: 1920, w: 240, h: 170, roof: "#e2d2b0", door: [1680, 1910], side: "n" },
    h4: { x: 2100, y: 1920, w: 240, h: 170, roof: "#d3bd94", door: [2220, 1910], side: "n" },
    h5: { x: 1180, y: 330, w: 240, h: 170, roof: "#dccaa9", door: [1300, 510], side: "s" },
    h6: { x: 240, y: 1240, w: 240, h: 170, roof: "#c2a678", door: [360, 1420], side: "s" }
  };
  var CHURCH = { x: 200, y: 300, w: 320, h: 300, door: [360, 612] };
  var STORE = { x: 1180, y: 1260, w: 340, h: 220, door: [1350, 1248] };
  var STADIUM = { cx: 2540, cy: 470, rx: 450, ry: 340 };
  var TENTS = [
    { x: 1830, y: 330, a: "#b3392e", b: "#f2ead8" },
    { x: 2050, y: 330, a: "#5b3a8e", b: "#e3a81c" },
    { x: 1830, y: 640, a: "#e3a81c", b: "#f2ead8" },
    { x: 2050, y: 640, a: "#2e6f6a", b: "#f2ead8" }
  ];
  var TREES = [
    [620, 1470, 1.2], [1150, 1470, 1.0], [2050, 1470, 1.15], [2900, 1470, 1.0],
    [470, 800, 1.0], [1300, 700, 1.2], [700, 700, 1.0], [1760, 290, 0.9],
    [2160, 800, 0.9], [560, 2060, 1.1], [1450, 2070, 1.0], [1980, 2290, 1.15],
    [2620, 2070, 1.2], [2950, 2210, 1.0], [150, 1300, 0.9], [3060, 900, 1.0],
    [2540, 1330, 1.1], [620, 2290, 1.0], [900, 350, 1.05], [3160, 1330, 1.0],
    [330, 1470, 1.05], [1750, 1470, 1.1], [2620, 1470, 0.95], [1080, 350, 1.0],
    [1620, 620, 1.15], [3050, 350, 0.9], [700, 1100, 0.9], [2400, 2290, 1.05],
    [120, 2050, 1.0], [3050, 1900, 1.1]
  ];
  var PLACES = {
    church: { x: CHURCH.door[0], y: CHURCH.door[1] },
    store: { x: STORE.door[0], y: STORE.door[1] },
    plazaW: { x: 700, y: 1660 },
    plazaC: { x: 1600, y: 1660 },
    plazaE: { x: 2400, y: 1660 },
    gate: { x: 2540, y: 856 }
  };
  var TAILGATE_SPOTS = [[1940, 470], [1780, 490], [2130, 490], [1940, 770], [2060, 760], [1850, 770]];
  var GATE_SPOTS = [[2380, 884], [2700, 884], [2540, 928], [2300, 824], [2780, 824]];
  var GRILL_SPOT = { x: 1994, y: 585 };
  var STAND_SPOTS = [[2540, 188], [2166, 470], [2914, 470], [2540, 752], [2280, 268], [2800, 268]];
  var LAMPS = [300, 900, 1500, 2100, 2700];

  /* ------------------------- walkability grid ---------------------- */
  var grid = new Uint8Array(COLS * ROWS); // 1 = blocked
  function blockRect(x, y, w, h) {
    var x0 = Math.max(0, Math.floor(x / TILE)), x1 = Math.min(COLS - 1, Math.floor((x + w - 1) / TILE));
    var y0 = Math.max(0, Math.floor(y / TILE)), y1 = Math.min(ROWS - 1, Math.floor((y + h - 1) / TILE));
    for (var ty = y0; ty <= y1; ty++) for (var tx = x0; tx <= x1; tx++) grid[ty * COLS + tx] = 1;
  }
  function blockCircle(cx, cy, r) {
    var x0 = Math.max(0, Math.floor((cx - r) / TILE)), x1 = Math.min(COLS - 1, Math.floor((cx + r) / TILE));
    var y0 = Math.max(0, Math.floor((cy - r) / TILE)), y1 = Math.min(ROWS - 1, Math.floor((cy + r) / TILE));
    for (var ty = y0; ty <= y1; ty++) for (var tx = x0; tx <= x1; tx++) {
      var px = tx * TILE + TILE / 2, py = ty * TILE + TILE / 2;
      if ((px - cx) * (px - cx) + (py - cy) * (py - cy) <= r * r) grid[ty * COLS + tx] = 1;
    }
  }
  (function buildGrid() {
    var k;
    for (k in HOUSES) blockRect(HOUSES[k].x, HOUSES[k].y, HOUSES[k].w, HOUSES[k].h);
    blockRect(CHURCH.x, CHURCH.y, CHURCH.w, CHURCH.h);
    blockRect(STORE.x, STORE.y, STORE.w, STORE.h);
    TENTS.forEach(function (t) { blockRect(t.x - 68, t.y - 50, 136, 100); });
    TREES.forEach(function (t) { blockCircle(t[0], t[1], 13); });
    // Stadium: field blocked; wall ring blocked except the south gate.
    for (var ty = 0; ty < ROWS; ty++) for (var tx = 0; tx < COLS; tx++) {
      var px = tx * TILE + TILE / 2, py = ty * TILE + TILE / 2;
      var dx = (px - STADIUM.cx) / STADIUM.rx, dy = (py - STADIUM.cy) / STADIUM.ry;
      var d = Math.sqrt(dx * dx + dy * dy);
      if (px > 2310 && px < 2770 && py > 340 && py < 600) grid[ty * COLS + tx] = 1;
      else if (d > 0.90 && d < 1.04) {
        if (!(Math.abs(px - STADIUM.cx) < 58 && py > STADIUM.cy + 250)) grid[ty * COLS + tx] = 1;
      } else if (d >= 1.04 && d < 1.10) grid[ty * COLS + tx] = 1;
    }
  })();
  function walkablePx(x, y) {
    if (x < 10 || y < 10 || x > W - 10 || y > H - 10) return false;
    return grid[Math.floor(y / TILE) * COLS + Math.floor(x / TILE)] === 0;
  }
  function nearestWalkable(x, y) {
    if (walkablePx(x, y)) return { x: x, y: y };
    for (var r = 20; r <= 240; r += 20) {
      for (var a = 0; a < Math.PI * 2; a += Math.PI / 8) {
        var nx = x + Math.cos(a) * r, ny = y + Math.sin(a) * r;
        if (walkablePx(nx, ny)) return { x: nx, y: ny };
      }
    }
    return { x: 1600, y: 1660 };
  }

  /* ------------------------- A* pathfinding ------------------------ */
  function findPath(sx, sy, tx, ty) {
    var s = nearestWalkable(sx, sy), t = nearestWalkable(tx, ty);
    var sc = Math.floor(s.x / TILE), sr = Math.floor(s.y / TILE);
    var tc = Math.floor(t.x / TILE), tr = Math.floor(t.y / TILE);
    var key = function (c, r) { return r * COLS + c; };
    var open = [key(sc, sr)];
    var came = {}, gs = {}, fs = {};
    gs[key(sc, sr)] = 0; fs[key(sc, sr)] = 0;
    var closed = {};
    function h(c, r) { return Math.abs(c - tc) + Math.abs(r - tr); }
    var found = false, guard = 0;
    while (open.length && guard++ < 20000) {
      var bi = 0;
      for (var i = 1; i < open.length; i++) if (fs[open[i]] < fs[open[bi]]) bi = i;
      var cur = open.splice(bi, 1)[0];
      if (cur === key(tc, tr)) { found = true; break; }
      if (closed[cur]) continue;
      closed[cur] = 1;
      var cc = cur % COLS, cr = Math.floor(cur / COLS);
      var dirs = [[1, 0], [-1, 0], [0, 1], [0, -1]];
      for (var d = 0; d < 4; d++) {
        var nc = cc + dirs[d][0], nr = cr + dirs[d][1];
        if (nc < 0 || nr < 0 || nc >= COLS || nr >= ROWS) continue;
        var nk = key(nc, nr);
        if (grid[nk] === 1 || closed[nk]) continue;
        var ng = gs[cur] + 1;
        if (gs[nk] === undefined || ng < gs[nk]) {
          gs[nk] = ng; fs[nk] = ng + h(nc, nr); came[nk] = cur;
          open.push(nk);
        }
      }
    }
    if (!found && !(sc === tc && sr === tr)) return [{ x: t.x, y: t.y }];
    var cells = [], k2 = key(tc, tr);
    while (k2 !== undefined) {
      cells.push({ x: (k2 % COLS) * TILE + TILE / 2, y: Math.floor(k2 / COLS) * TILE + TILE / 2 });
      if (k2 === key(sc, sr)) break;
      k2 = came[k2];
    }
    cells.reverse();
    cells.push({ x: t.x, y: t.y });
    // String-pull: drop waypoints with a clear line of sight.
    function los(a, b) {
      var dist = Math.hypot(b.x - a.x, b.y - a.y), steps = Math.ceil(dist / 10);
      for (var s2 = 0; s2 <= steps; s2++) {
        if (!walkablePx(a.x + (b.x - a.x) * s2 / steps, a.y + (b.y - a.y) * s2 / steps)) return false;
      }
      return true;
    }
    var out = [cells[0]];
    var anchor = 0;
    for (var j = 2; j < cells.length; j++) {
      if (!los(cells[anchor], cells[j])) { out.push(cells[j - 1]); anchor = j - 1; }
    }
    out.push(cells[cells.length - 1]);
    return out;
  }

  /* ------------------------- clock and day ------------------------- */
  var params = new URLSearchParams(location.search);
  var hourParam = params.get("village");
  var hour = new Date().getHours();
  if (hourParam !== null && /^\d{1,2}$/.test(hourParam)) {
    var hv = parseInt(hourParam, 10);
    if (hv >= 0 && hv <= 23) hour = hv;
  }
  var dayParam = params.get("day");
  var saturday = dayParam === "sat" || (dayParam !== "week" && new Date().getDay() === 6);
  var phase = hour >= 22 || hour < 5 ? "night" : hour < 8 ? "dawn" : hour < 17 ? "day" : "dusk";
  var outCount = saturday ? 99 : phase === "day" ? 10 : phase === "dawn" ? 6 : phase === "dusk" ? 7 : 3;

  /* ==================== sprite figures (TW-1238) =================== */
  // The art pass: figures are pre-rendered sprites, painted once
  // per appearance by the painter below and blitted each frame.
  // The painter is the general mechanism, built for the product:
  // any family's records drive it, and where a photo of a person
  // has been uploaded, the record's appearance attributes are
  // derived from that photo (appearanceSource "photo" in the
  // data) and the same painter consumes them. Sprites stay
  // abstract either way: hair, dress, build, and gesture carry
  // the person; a face is skin and shade, never a copied face
  // (likeness law). One scale everywhere: the same sprite size
  // walks the street, works the tailgate, and plays on the field;
  // only the stands are texture, a crowd mass, not figures.
  var SPR_SS = 3; // supersample: painted at 3x, drawn down crisp
  var SPR_W = 64, SPR_H = 76, SPR_GX = 32, SPR_GY = 58;
  var SKIN_TONES = ["#54331d", "#5d3a20", "#6e4525", "#7a4c28", "#835231", "#8a5a34", "#9c6a3e", "#a9744a"];
  var CROWD_KITS = ["#5b3a8e", "#6d4aa3", "#472b70", "#7a5cb0", "#54357f",
    "#e3a81c", "#d18f0e", "#f2c14e", "#b87a0a",
    "#e8ddc4", "#d8cba6", "#f0e6d2", "#b3392e", "#2e6f6a", "#8a5a34", "#4c4a6e"];

  function shade(hex, amt) {
    var n = parseInt(hex.slice(1), 16);
    function cl(v) { return Math.min(255, Math.max(0, v)); }
    return "rgb(" + cl((n >> 16) + amt) + "," + cl(((n >> 8) & 255) + amt) + "," + cl((n & 255) + amt) + ")";
  }
  function hairColorOf(P) {
    if (P.hairColor) return P.hairColor;
    if (P.hair === "bun-gray" || P.hair === "short-gray" || P.hair === "gray") return "#c9c2b4";
    return "#241a12";
  }
  function capsule(g, x1, y1, x2, y2, w, color) {
    g.strokeStyle = color; g.lineWidth = w; g.lineCap = "round";
    g.beginPath(); g.moveTo(x1, y1); g.lineTo(x2, y2); g.stroke();
  }

  // Paint one figure frame. Unit space: origin at the ground
  // point, y down; the head sits near -43, the feet near +5.
  // pose: {kind: "idle"|"walk"|"wave"|"cheer", ph: int}
  function paintFigure(g, P, pose) {
    var hc = hairColorOf(P), hd = shade(hc.charAt(0) === "#" ? hc : "#241a12", -22), hl = shade(hc.charAt(0) === "#" ? hc : "#241a12", 34);
    var kit = P.kit, kitD = P.kitDark, pants = shade(P.kitDark, -14);
    var bw = P.build === "slim" ? 0.88 : P.build === "sturdy" ? 1.15 : 1;
    var ph = pose.ph || 0;
    var sL = pose.kind === "walk" ? [2.6, 0, -2.6, 0][ph % 4] : 0;
    var sR = pose.kind === "walk" ? [-2.6, 0, 2.6, 0][ph % 4] : 0;

    // Long hair falls behind the body before anything else.
    if (P.hair === "long") {
      g.fillStyle = hc;
      g.beginPath(); g.roundRect(-10.5, -52, 21, 35, 7); g.fill();
      if (P.hairTexture === "curly") {
        // Curls: scalloped edges and lit flecks down the fall.
        for (var cf = 0; cf < 7; cf++) {
          g.beginPath(); g.arc(-10.5, -46 + cf * 5, 2.6, 0, Math.PI * 2); g.fill();
          g.beginPath(); g.arc(10.5, -46 + cf * 5, 2.6, 0, Math.PI * 2); g.fill();
        }
        for (var cs = 0; cs < 26; cs++) {
          g.fillStyle = rnd() < 0.5 ? hd : hl; g.globalAlpha = 0.5;
          g.beginPath(); g.arc(rr(-9, 9), rr(-50, -20), rr(0.7, 1.4), 0, Math.PI * 2); g.fill();
        }
        g.globalAlpha = 1; g.fillStyle = hc;
      }
    }
    // Neck.
    g.fillStyle = shade(P.skin, -14);
    g.beginPath(); g.roundRect(-3.4, -40, 6.8, 6, 2); g.fill();

    // Legs and shoes; a dress flares over them for the women.
    function shoe(x, s) {
      g.fillStyle = "#2b2119";
      g.beginPath(); g.ellipse(x, 4.6 + s, 4.8, 3.3, 0, 0, Math.PI * 2); g.fill();
      g.fillStyle = "rgba(255,255,255,0.16)";
      g.beginPath(); g.ellipse(x - 1.2, 3.6 + s, 2, 1.2, 0, 0, Math.PI * 2); g.fill();
    }
    if (P.gender === "f") {
      g.fillStyle = shade(P.skin, -8);
      g.beginPath(); g.roundRect(-7.6, -9, 5, 12.5, 2); g.fill();
      g.beginPath(); g.roundRect(2.6, -9, 5, 12.5, 2); g.fill();
      shoe(-5.2, sL); shoe(5.2, sR);
      var dress = new Path2D();
      dress.moveTo(-8.5, -27); dress.lineTo(8.5, -27);
      dress.lineTo(13.5, -8.5); dress.lineTo(-13.5, -8.5); dress.closePath();
      g.fillStyle = kit; g.fill(dress);
      g.save(); g.clip(dress);
      g.fillStyle = shade(kit, -34); g.globalAlpha = 0.38;
      g.fillRect(3.5, -27, 10, 19);
      g.globalAlpha = 0.5; g.strokeStyle = kitD; g.lineWidth = 1.9;
      [-7, -2.4, 2.4, 7].forEach(function (fx) {
        g.beginPath(); g.moveTo(fx * 0.5, -25.5); g.lineTo(fx, -10); g.stroke();
      });
      g.globalAlpha = 1; g.restore();
      g.fillStyle = kitD; g.globalAlpha = 0.8;
      g.fillRect(-13.5, -11.3, 27, 2.8);
      g.globalAlpha = 1;
      g.strokeStyle = "rgba(43,26,14,0.25)"; g.lineWidth = 0.9; g.stroke(dress);
    } else {
      g.fillStyle = pants;
      g.beginPath(); g.roundRect(-10, -16, 9, 19.5, 3); g.fill();
      g.beginPath(); g.roundRect(1, -16, 9, 19.5, 3); g.fill();
      g.fillStyle = "rgba(0,0,0,0.16)";
      g.fillRect(-1.2, -15, 2.4, 17);
      shoe(-5.6, sL); shoe(5.6, sR);
    }

    // Torso, shaded as a painted form: dark side, lit panel.
    var torso = new Path2D();
    torso.ellipse(0, -25, 12.6 * bw, 11.8, 0, 0, Math.PI * 2);
    g.fillStyle = kit; g.fill(torso);
    g.save(); g.clip(torso);
    g.fillStyle = kitD; g.globalAlpha = 0.5;
    g.fillRect(2.5, -38, 12 * bw, 26);
    g.fillStyle = shade(kit, 30); g.globalAlpha = 0.45;
    g.beginPath(); g.ellipse(-4, -27, 4.6, 8.6, 0, 0, Math.PI * 2); g.fill();
    g.globalAlpha = 1;
    if (P.sash) {
      g.fillStyle = "#e3a81c";
      g.save(); g.translate(0, -25); g.rotate(0.62); g.fillRect(-17, -2.8, 34, 5.6); g.restore();
    }
    g.restore();
    g.strokeStyle = "rgba(43,26,14,0.26)"; g.lineWidth = 0.9; g.stroke(torso);
    // Collar, buttons, belt: the small tailoring that reads as clothes.
    if (P.facing !== "back") {
      g.fillStyle = shade(P.kitDark, -8);
      g.beginPath(); g.moveTo(-3.6, -36.8); g.lineTo(3.6, -36.8); g.lineTo(0, -32.4); g.closePath(); g.fill();
    }
    if (P.gender !== "f" && P.facing !== "back") {
      g.fillStyle = "rgba(30,18,8,0.4)";
      [-29.5, -25, -20.5].forEach(function (by) {
        g.beginPath(); g.arc(0, by, 0.95, 0, Math.PI * 2); g.fill();
      });
      g.fillStyle = "#3a2c1e";
      g.fillRect(-11 * bw, -17.6, 22 * bw, 3.2);
      g.fillStyle = "#c9a227";
      g.fillRect(-1.6, -17.4, 3.2, 2.8);
    }

    // Arms: two-segment capsules with skin hands. The right arm
    // waves or cheers on pose; both swing against the legs walking.
    function arm(side, mode, swing) {
      var sx = side * 12.2 * bw, sy = -33;
      g.fillStyle = kit;
      g.beginPath(); g.arc(sx, sy, 3.6, 0, Math.PI * 2); g.fill();
      if (mode === "up") {
        var ex = side * 18.5, ey = -40, hx = side * 21.5, hy = -46.5 + swing;
        capsule(g, sx, sy, ex, ey, 5.4, kitD);
        capsule(g, ex, ey, hx, hy, 4.4, shade(P.skin, -6));
        g.fillStyle = P.skin;
        g.beginPath(); g.arc(hx, hy, 3, 0, Math.PI * 2); g.fill();
      } else {
        var hx2 = side * 15.8 * bw, hy2 = -14.5 + swing;
        capsule(g, sx, sy, side * 14.8 * bw, -24, 5.6, kit);
        capsule(g, side * 14.8 * bw, -24, hx2, hy2, 4.6, shade(P.skin, -6));
        g.fillStyle = P.skin;
        g.beginPath(); g.arc(hx2, hy2, 2.9, 0, Math.PI * 2); g.fill();
      }
    }
    if (pose.kind === "wave") { arm(-1, "down", 0); arm(1, "up", ph ? -2 : 0.8); }
    else if (pose.kind === "cheer") { arm(-1, "up", ph ? 1.4 : -1); arm(1, "up", ph ? -1 : 1.4); }
    else { arm(-1, "down", sR * 0.85); arm(1, "down", sL * 0.85); }

    // Head: ears, face in skin and shade, then hair in its style.
    g.fillStyle = shade(P.skin, -10);
    g.beginPath(); g.arc(-9.4, -43, 2, 0, Math.PI * 2); g.fill();
    g.beginPath(); g.arc(9.4, -43, 2, 0, Math.PI * 2); g.fill();
    var afro = P.hair === "afro";
    if (P.facing === "back") {
      // The back of the head: hair all the way down to the neck,
      // a sliver of neck below it. No face from behind.
      if (P.hair === "bald") {
        g.fillStyle = P.skin;
        g.beginPath(); g.arc(0, -42.2, 8.6, 0, Math.PI * 2); g.fill();
        g.fillStyle = hc;
        g.beginPath(); g.arc(-9.2, -40, 2.4, 0, Math.PI * 2); g.fill();
        g.beginPath(); g.arc(9.2, -40, 2.4, 0, Math.PI * 2); g.fill();
        g.beginPath(); g.arc(0, -35.4, 3.2, 0, Math.PI * 2); g.fill();
      } else {
        g.fillStyle = hc;
        g.beginPath(); g.arc(0, -43.2, 10.3, 0, Math.PI * 2); g.fill();
        if (afro || P.hair === "short" || P.hair === "short-gray") {
          for (var bi = 0; bi < 60; bi++) {
            var ba = rnd() * Math.PI * 2, bd = Math.sqrt(rnd()) * 9.4;
            g.fillStyle = rnd() < 0.5 ? hd : hl; g.globalAlpha = 0.55;
            g.beginPath(); g.arc(Math.cos(ba) * bd, -43.2 + Math.sin(ba) * bd * 0.92, rr(0.6, 1.25), 0, Math.PI * 2); g.fill();
          }
          g.globalAlpha = 1;
        }
        if (P.hair === "bun" || P.hair === "bun-gray") {
          g.fillStyle = hc;
          g.beginPath(); g.arc(0, -54.5, 4.1, 0, Math.PI * 2); g.fill();
          g.fillStyle = hl;
          g.beginPath(); g.arc(-1.2, -55.8, 1.3, 0, Math.PI * 2); g.fill();
        }
        if (P.hair === "braids") {
          [-1, 1].forEach(function (side) {
            for (var bb = 0; bb < 5; bb++) {
              g.fillStyle = bb % 2 ? hd : hc;
              g.beginPath(); g.arc(side * (9.4 + bb * 0.5), -45 + bb * 3.4, 2.15, 0, Math.PI * 2); g.fill();
            }
          });
        }
        g.fillStyle = shade(P.skin, -10);
        g.beginPath(); g.ellipse(0, -34.6, 3.4, 1.8, 0, 0, Math.PI * 2); g.fill();
      }
    }
    if (afro && P.facing !== "back") {
      g.fillStyle = hc;
      g.beginPath(); g.arc(0, -44.5, 12.6, 0, Math.PI * 2); g.fill();
    }
    if (P.facing !== "back") {
    g.fillStyle = P.skin;
    g.beginPath(); g.arc(0, afro ? -41 : -42.2, afro ? 8.2 : 8.6, 0, Math.PI * 2); g.fill();
    g.save();
    g.beginPath(); g.arc(0, afro ? -41 : -42.2, afro ? 8.2 : 8.6, 0, Math.PI * 2); g.clip();
    g.fillStyle = "rgba(70,35,12,0.15)";
    g.beginPath(); g.ellipse(0, -37.2, 6.4, 2.6, 0, 0, Math.PI * 2); g.fill();
    g.fillStyle = "rgba(255,240,210,0.13)";
    g.beginPath(); g.ellipse(-2.6, -45.4, 3.8, 2, 0, 0, Math.PI * 2); g.fill();
    g.restore();
    // Hair over the face's top, by style and texture.
    function hairCap() {
      g.save();
      g.beginPath(); g.arc(0, -42.2, 8.6, 0, Math.PI * 2); g.clip();
      g.fillStyle = hc;
      g.fillRect(-10, -53, 20, 12.5);
      g.restore();
      g.strokeStyle = hl; g.globalAlpha = 0.6; g.lineWidth = 1.05;
      [-6.4, -3.4, 3.4, 6.4].forEach(function (rx) {
        g.beginPath(); g.arc(0, -44.6, Math.abs(rx) + 2.4, Math.PI * 1.18, Math.PI * 1.5); g.stroke();
      });
      g.globalAlpha = 1;
    }
    function coilySpeckle(cx, cy, r, n) {
      for (var i = 0; i < n; i++) {
        var a = rnd() * Math.PI * 2, d = Math.sqrt(rnd()) * r;
        g.fillStyle = rnd() < 0.5 ? hd : hl;
        g.globalAlpha = 0.55;
        g.beginPath(); g.arc(cx + Math.cos(a) * d, cy + Math.sin(a) * d * 0.92, rr(0.6, 1.25), 0, Math.PI * 2); g.fill();
      }
      g.globalAlpha = 1;
    }
    if (afro) {
      coilySpeckle(0, -44.5, 11.6, 110);
      g.fillStyle = hc;
      [-8, -4.8, -1.6, 1.6, 4.8, 8].forEach(function (bx) {
        g.beginPath(); g.arc(bx, -35.6, 2.5, 0, Math.PI * 2); g.fill();
      });
    } else if (P.hair === "bun" || P.hair === "bun-gray") {
      hairCap();
      g.fillStyle = hc;
      g.beginPath(); g.arc(0, -54.5, 4.1, 0, Math.PI * 2); g.fill();
      g.fillStyle = hl;
      g.beginPath(); g.arc(-1.2, -55.8, 1.3, 0, Math.PI * 2); g.fill();
      if (P.hair === "bun") coilySpeckle(0, -47, 7, 22);
    } else if (P.hair === "long") {
      hairCap();
      g.fillStyle = hc;
      g.beginPath(); g.roundRect(-12.6, -46, 4.8, 17, 2.4); g.fill();
      g.beginPath(); g.roundRect(7.8, -46, 4.8, 17, 2.4); g.fill();
      if (P.hairTexture === "curly") {
        [-10.2, 10.2].forEach(function (fx) {
          for (var cf2 = 0; cf2 < 4; cf2++) {
            g.beginPath(); g.arc(fx, -43 + cf2 * 4.6, 2.5, 0, Math.PI * 2); g.fill();
          }
        });
      }
    } else if (P.hair === "braids") {
      hairCap();
      [-1, 1].forEach(function (side) {
        for (var b = 0; b < 5; b++) {
          g.fillStyle = b % 2 ? hd : hc;
          g.beginPath(); g.arc(side * (9.4 + b * 0.5), -45 + b * 3.4, 2.15, 0, Math.PI * 2); g.fill();
        }
        g.fillStyle = "#c9a227";
        g.beginPath(); g.arc(side * 11.8, -27.2, 1.5, 0, Math.PI * 2); g.fill();
      });
    } else if (P.hair === "bald") {
      g.fillStyle = hc;
      g.beginPath(); g.arc(-9.2, -42, 2.4, 0, Math.PI * 2); g.fill();
      g.beginPath(); g.arc(9.2, -42, 2.4, 0, Math.PI * 2); g.fill();
      g.fillStyle = "rgba(255,255,255,0.26)";
      g.beginPath(); g.ellipse(-3, -47.6, 3.4, 1.7, 0, 0, Math.PI * 2); g.fill();
    } else { // short, short-gray, gray: a textured cap
      hairCap();
      coilySpeckle(0, -46.5, 7.6, 30);
      if (P.hairTexture === "curly") {
        g.fillStyle = hc;
        [-7.5, -4.5, -1.5, 1.5, 4.5, 7.5].forEach(function (sx) {
          g.beginPath(); g.arc(sx, -41.6, 1.9, 0, Math.PI * 2); g.fill();
        });
      }
    }
    }
    // Glasses, where the record carries them (mechanism; the
    // attribute comes from a photo or the record, never invented
    // per figure at render time).
    if (P.glasses && P.facing !== "back") {
      g.strokeStyle = "rgba(28,20,14,0.88)"; g.lineWidth = 1.25;
      g.beginPath(); g.roundRect(-8.1, -46.8, 7, 5.4, 1.6); g.stroke();
      g.beginPath(); g.roundRect(1.1, -46.8, 7, 5.4, 1.6); g.stroke();
      g.beginPath(); g.moveTo(-1.1, -44.8); g.lineTo(1.1, -44.8); g.stroke();
    }
    // Hats ride on top of everything.
    if (P.hat === "church") {
      g.fillStyle = P.hatColor;
      g.beginPath(); g.ellipse(0, -45, 12.4, 10.4, 0, 0, Math.PI * 2); g.fill();
      g.strokeStyle = "rgba(90,70,40,0.30)"; g.lineWidth = 1;
      g.beginPath(); g.ellipse(0, -45, 12.4, 10.4, 0, 0, Math.PI * 2); g.stroke();
      g.fillStyle = "rgba(0,0,0,0.10)";
      g.beginPath(); g.ellipse(1.5, -43.8, 8.6, 7.2, 0, 0, Math.PI * 2); g.fill();
      g.fillStyle = shade(P.hatColor, -22);
      g.beginPath(); g.ellipse(0, -46, 6.4, 5.4, 0, 0, Math.PI * 2); g.fill();
      g.strokeStyle = "rgba(90,70,40,0.45)"; g.lineWidth = 1.4;
      g.beginPath(); g.ellipse(0, -46, 6.4, 5.4, 0, Math.PI * 0.1, Math.PI * 0.9); g.stroke();
      g.fillStyle = "#b3392e";
      g.beginPath(); g.arc(8.6, -50.5, 1.7, 0, Math.PI * 2); g.fill();
      g.fillStyle = "#e3a81c";
      g.beginPath(); g.arc(10.4, -48.2, 1.3, 0, Math.PI * 2); g.fill();
    } else if (P.hat === "fedora") {
      g.fillStyle = P.hatColor;
      g.beginPath(); g.ellipse(0, -45, 12, 10.2, 0, 0, Math.PI * 2); g.fill();
      g.fillStyle = shade(P.hatColor, 10);
      g.beginPath(); g.ellipse(0, -45.8, 6.6, 5.6, 0, 0, Math.PI * 2); g.fill();
      g.strokeStyle = "#2e2822"; g.lineWidth = 1.7;
      g.beginPath(); g.ellipse(0, -45.2, 6.6, 5.6, 0, Math.PI * 0.15, Math.PI * 0.85); g.stroke();
    } else if (P.hat === "cap") {
      g.fillStyle = P.hatColor;
      g.beginPath(); g.arc(0, -44, 9.2, Math.PI, Math.PI * 2); g.fill();
      g.fillRect(-9.2, -44.8, 18.4, 1.6);
      g.fillStyle = shade(P.hatColor, -18);
      g.beginPath(); g.ellipse(0, -36.6, 8.6, 3.1, 0, 0, Math.PI * 2); g.fill();
    }
    // Props, held in front.
    if (P.prop === "plate" && P.facing !== "back") {
      capsule(g, 12.5, -17, 15.8, -12, 4.2, shade(P.skin, -6));
      g.fillStyle = "#f4efe2";
      g.beginPath(); g.arc(16.5, -10.5, 6.4, 0, Math.PI * 2); g.fill();
      g.strokeStyle = "rgba(90,70,40,0.5)"; g.lineWidth = 1;
      g.beginPath(); g.arc(16.5, -10.5, 6.4, 0, Math.PI * 2); g.stroke();
      g.strokeStyle = "rgba(90,70,40,0.25)";
      g.beginPath(); g.arc(16.5, -10.5, 4.4, 0, Math.PI * 2); g.stroke();
      g.fillStyle = "#b3392e";
      g.beginPath(); g.arc(14.8, -11.8, 1.7, 0, Math.PI * 2); g.fill();
      g.fillStyle = "#7a4a28";
      g.beginPath(); g.arc(18, -9.4, 1.5, 0, Math.PI * 2); g.fill();
      g.fillStyle = "#5d742c";
      g.beginPath(); g.arc(16.2, -8.6, 1.3, 0, Math.PI * 2); g.fill();
    } else if (P.prop === "basket" && P.facing !== "back") {
      g.fillStyle = "#a97e46";
      g.beginPath();
      g.moveTo(-22, -14.5); g.lineTo(-11, -14.5); g.lineTo(-12.4, -5); g.lineTo(-20.6, -5); g.closePath(); g.fill();
      g.strokeStyle = "#7d5a13"; g.lineWidth = 1.2;
      [-11.8, -8.8].forEach(function (by) {
        g.beginPath(); g.moveTo(-21.4, by); g.lineTo(-11.6, by); g.stroke();
      });
      g.beginPath(); g.arc(-16.5, -14.5, 5, Math.PI, Math.PI * 2); g.stroke();
      g.fillStyle = "#e8ddc4";
      g.beginPath(); g.moveTo(-21, -14.5); g.lineTo(-12, -14.5); g.lineTo(-16.5, -18.6); g.closePath(); g.fill();
      g.fillStyle = "#b3392e";
      g.beginPath(); g.arc(-16.5, -15.4, 1.2, 0, Math.PI * 2); g.fill();
    } else if (P.prop === "cane") {
      g.strokeStyle = "#4c3a26"; g.lineWidth = 2.3; g.lineCap = "round";
      g.beginPath(); g.moveTo(15.8, -13); g.lineTo(19.5, 4.5); g.stroke();
      g.beginPath(); g.arc(17.4, -14.8, 2.1, Math.PI * 0.9, Math.PI * 1.9); g.stroke();
    }
    // Paper grain over the figure, the house texture.
    for (var gr = 0; gr < 40; gr++) {
      g.fillStyle = rnd() < 0.5 ? "rgba(0,0,0,0.05)" : "rgba(255,255,255,0.05)";
      g.beginPath(); g.arc(rr(-16, 16), rr(-56, 8), rr(0.6, 1.1), 0, Math.PI * 2); g.fill();
    }
  }

  function makeFrame(P, kind, ph) {
    var cv = document.createElement("canvas");
    cv.width = SPR_W * SPR_SS; cv.height = SPR_H * SPR_SS;
    var g = cv.getContext("2d");
    g.translate(SPR_GX * SPR_SS, SPR_GY * SPR_SS);
    g.scale(SPR_SS, SPR_SS);
    paintFigure(g, P, { kind: kind, ph: ph });
    return cv;
  }
  function makeSpriteSet(P) {
    // Two facings, the way the references draw people: upright on
    // screen, front or back by travel direction, flipped for
    // leftward travel. A figure never rotates flat onto the
    // ground; only the world is overhead, the people stand in it.
    var back = Object.assign({}, P, { facing: "back" });
    function one(Q) {
      return {
        idle: makeFrame(Q, "idle", 0),
        walk: [makeFrame(Q, "walk", 0), makeFrame(Q, "walk", 1), makeFrame(Q, "walk", 2), makeFrame(Q, "walk", 3)],
        wave: [makeFrame(Q, "wave", 0), makeFrame(Q, "wave", 1)],
        cheer: [makeFrame(Q, "cheer", 0), makeFrame(Q, "cheer", 1)]
      };
    }
    return { front: one(P), back: one(back) };
  }
  function appearanceOf(rec) {
    var p = rec.present;
    return {
      skin: p.skin, hair: p.hair, hairColor: p.hairColor || null,
      hairTexture: p.hairTexture || "straight",
      kit: p.kit, kitDark: p.kitDark, hat: p.hat, hatColor: p.hatColor,
      prop: p.prop, gender: rec.gender, build: p.build || "average",
      glasses: !!p.glasses, sash: false
    };
  }
  function genericAppearance() {
    var kit = pick(CROWD_KITS.concat(["#b3392e", "#2e6f6a", "#33506e", "#a34a28", "#77815f"]));
    var gender = rnd() < 0.5 ? "f" : "m";
    var hat = null;
    if (rnd() < 0.16) hat = gender === "f" ? pick(["church", "cap"]) : pick(["cap", "fedora"]);
    return {
      skin: pick(SKIN_TONES),
      hair: pick(["short", "afro", "bun", "long", "braids", "short-gray", "bun-gray", "bald", "short"]),
      hairColor: pick(["#1d130c", "#241a12", "#2e1c10", "#17110b"]),
      hairTexture: pick(["straight", "curly", "coily", "curly"]),
      kit: kit, kitDark: shade(kit, -26),
      hat: hat, hatColor: pick(["#e8ddc4", "#3d362e", "#4c3a26"]),
      prop: null, gender: gender,
      build: pick(["slim", "average", "average", "sturdy"]),
      glasses: false, sash: false
    };
  }
  // The soft ground shadow every figure stands on.
  var shadowImg = (function () {
    var cv = document.createElement("canvas");
    cv.width = 104; cv.height = 52;
    var g = cv.getContext("2d");
    var gr = g.createRadialGradient(56, 28, 4, 56, 28, 34);
    gr.addColorStop(0, "rgba(24,32,14,0.36)");
    gr.addColorStop(0.7, "rgba(24,32,14,0.18)");
    gr.addColorStop(1, "rgba(24,32,14,0)");
    g.fillStyle = gr;
    g.beginPath(); g.ellipse(56, 28, 46, 20, 0, 0, Math.PI * 2); g.fill();
    return cv;
  })();
  function stampImage(c, img, x, y, heading) {
    // Baked figures stand upright like live ones: heading picks
    // front or back, never a flat rotation.
    c.save();
    c.translate(x, y);
    c.drawImage(shadowImg, -26, -6, 52, 26);
    if (Math.cos(heading) < 0) c.scale(-1, 1);
    c.drawImage(img, -SPR_GX, -SPR_GY, SPR_W, SPR_H);
    c.restore();
  }
  // The stands as texture: a tile of heads and shoulders in the
  // home crowd's purple and gold, repeated until it reads as a
  // mass, the way the close reference's stands read.
  var crowdTile = null;
  function buildCrowdTile() {
    var cv = document.createElement("canvas");
    cv.width = 224; cv.height = 224;
    var g = cv.getContext("2d");
    g.fillStyle = "#6d5138";
    g.fillRect(0, 0, 224, 224);
    var keepSeed = seed; seed = 4242;
    for (var ry = 0; ry < 224 + 11; ry += 11) {
      for (var rx = ((ry / 11) % 2 ? 6 : 0); rx < 224 + 11; rx += 11) {
        var jx = rx + rr(-1.6, 1.6), jy = ry + rr(-1.2, 1.2);
        g.fillStyle = pick(CROWD_KITS);
        g.beginPath(); g.ellipse(jx, jy + 3.2, 5.6, 4.4, 0, 0, Math.PI * 2); g.fill();
        g.fillStyle = pick(SKIN_TONES);
        g.beginPath(); g.arc(jx, jy, 2.9, 0, Math.PI * 2); g.fill();
        g.fillStyle = rnd() < 0.24 ? "#c9c2b4" : "#241a12";
        g.beginPath(); g.arc(jx, jy - 0.7, 2.9, Math.PI, Math.PI * 2); g.fill();
      }
    }
    seed = keepSeed;
    return cv;
  }

  /* ======================= static world render ===================== */
  var staticC = document.createElement("canvas");
  staticC.width = W; staticC.height = H;
  var satC = document.createElement("canvas");
  satC.width = W; satC.height = H;

  function speckle(c, x, y, w, h, n, colors, rMin, rMax) {
    for (var i = 0; i < n; i++) {
      c.fillStyle = pick(colors);
      c.beginPath();
      c.arc(x + rnd() * w, y + rnd() * h, rr(rMin, rMax), 0, Math.PI * 2);
      c.fill();
    }
  }
  function paperShadow(c, x, y, w, h) {
    c.fillStyle = "rgba(43,32,18,0.20)";
    c.fillRect(x + 6, y + 9, w, h);
  }
  function drawGrassBase(c) {
    // Palette sampled from the references (TW-1238): deep lush
    // greens, sunlit yellow-green, warm daylight throughout.
    c.fillStyle = "#5f8a30";
    c.fillRect(0, 0, W, H);
    for (var y = 0; y < H; y += 120) {
      c.fillStyle = (y / 120) % 2 ? "rgba(255,255,255,0.045)" : "rgba(0,0,0,0.035)";
      c.fillRect(0, y, W, 120);
    }
    // Large soft patches, so the green reads as ground, not paper.
    for (var i = 0; i < 90; i++) {
      c.fillStyle = pick(["rgba(81,120,33,0.15)", "rgba(134,180,92,0.12)", "rgba(95,138,40,0.14)", "rgba(163,151,84,0.07)"]);
      c.beginPath();
      c.ellipse(rnd() * W, rnd() * H, rr(90, 260), rr(60, 170), rr(0, 3), 0, Math.PI * 2);
      c.fill();
    }
    speckle(c, 0, 0, W, H, 5200, ["#517821", "#6f9c3c", "#476e1f", "#86b45c"], 1, 2.6);
    // Blade texture: short strokes, darker and sunlit, everywhere.
    c.lineWidth = 1.4;
    for (var b = 0; b < 1500; b++) {
      var bx = rnd() * W, by = rnd() * H;
      c.strokeStyle = rnd() < 0.5 ? "rgba(46,74,18,0.20)" : "rgba(190,214,120,0.16)";
      c.beginPath(); c.moveTo(bx, by); c.lineTo(bx + rr(-1, 1), by - rr(2.5, 4.5)); c.stroke();
    }
  }
  function drawBrick(c, x, y, w, h) {
    // Warm brick reds sampled from the references: mortar in a
    // deep red-brown, bricks ranging #98553f to #dba074 sunlit.
    c.fillStyle = "#8a4630";
    c.fillRect(x, y, w, h);
    var bh = 15, bw = 34;
    for (var row = 0; row * bh < h; row++) {
      var off = row % 2 ? bw / 2 : 0;
      for (var col = -1; col * bw < w + bw; col++) {
        var bx = x + col * bw + off, by = y + row * bh;
        var l = rr(-11, 11), u = rnd();
        if (u < 0.05) c.fillStyle = "rgb(140,62,38)";        // a burnt brick
        else if (u > 0.95) c.fillStyle = "rgb(205,116,72)";  // a sunlit brick
        else c.fillStyle = "rgb(" + (178 + l * 1.7 | 0) + "," + (88 + l | 0) + "," + (55 + l * 0.7 | 0) + ")";
        c.fillRect(bx + 1, by + 1, bw - 2, bh - 2);
        c.fillStyle = "rgba(255,226,180,0.10)";
        c.fillRect(bx + 1, by + 1, bw - 2, 2); // top edge catches the light
      }
    }
    speckle(c, x, y, w, h, Math.floor(w * h / 2600), ["rgba(0,0,0,0.10)", "rgba(255,235,200,0.08)"], 1, 2.2);
    // Large tonal drift across the pavement, as painted light does.
    for (var p = 0; p < Math.floor(w / 420); p++) {
      c.fillStyle = rnd() < 0.5 ? "rgba(70,30,14,0.05)" : "rgba(255,214,160,0.05)";
      c.beginPath();
      c.ellipse(x + rnd() * w, y + rnd() * h, rr(150, 300), rr(40, 80), 0, 0, Math.PI * 2);
      c.fill();
    }
  }
  function drawAsphalt(c, x, y, w, h) {
    c.fillStyle = "#4d4b4e";
    c.fillRect(x, y, w, h);
    speckle(c, x, y, w, h, Math.floor(w * h / 1500), ["#5a585c", "#403f42", "#656368"], 1, 2);
  }
  function drawConcrete(c, x, y, w, h) {
    c.fillStyle = "#c9b99b";
    c.fillRect(x, y, w, h);
    c.fillStyle = "rgba(90,70,40,0.18)";
    for (var i = 0; i < w; i += 44) c.fillRect(x + i, y, 2, h);
    for (var j = 0; j < h; j += 44) c.fillRect(x, y + j, w, 2);
  }
  function drawDashesV(c, x, y0, y1, skip) {
    c.fillStyle = "#e8c95a";
    for (var y = y0; y < y1; y += 58) {
      var skipIt = false;
      for (var s = 0; s < skip.length; s++) if (y > skip[s][0] && y < skip[s][1]) skipIt = true;
      if (!skipIt) { c.beginPath(); c.roundRect(x - 3, y, 6, 30, 3); c.fill(); }
    }
  }
  function drawDashesH(c, y, x0, x1, skip) {
    c.fillStyle = "#e8c95a";
    for (var x = x0; x < x1; x += 58) {
      var skipIt = false;
      for (var s = 0; s < skip.length; s++) if (x > skip[s][0] && x < skip[s][1]) skipIt = true;
      if (!skipIt) { c.beginPath(); c.roundRect(x, y - 3, 30, 6, 3); c.fill(); }
    }
  }
  function drawTree(c, x, y, s) {
    // Soft ground shadow: a radial falloff, not a flat ellipse.
    var sh = c.createRadialGradient(x + 16 * s, y + 18 * s, 6, x + 16 * s, y + 18 * s, 58 * s);
    sh.addColorStop(0, "rgba(24,38,14,0.42)");
    sh.addColorStop(0.7, "rgba(24,38,14,0.22)");
    sh.addColorStop(1, "rgba(24,38,14,0)");
    c.fillStyle = sh;
    c.beginPath(); c.ellipse(x + 16 * s, y + 18 * s, 58 * s, 44 * s, 0, 0, Math.PI * 2); c.fill();
    // Dappled light: sun through leaves, flecking the shaded ground.
    for (var d = 0; d < 30; d++) {
      var da = rnd() * Math.PI * 2, dr = Math.sqrt(rnd()) * 46 * s;
      c.fillStyle = "rgba(255,244,180," + rr(0.05, 0.16).toFixed(3) + ")";
      c.beginPath();
      c.ellipse(x + 14 * s + Math.cos(da) * dr, y + 16 * s + Math.sin(da) * dr * 0.76, rr(2, 5.5) * s, rr(1.4, 3.6) * s, da, 0, Math.PI * 2);
      c.fill();
    }
    c.fillStyle = "#5d4630";
    c.beginPath(); c.arc(x, y, 6 * s, 0, Math.PI * 2); c.fill();
    c.fillStyle = "rgba(30,20,10,0.30)";
    c.beginPath(); c.arc(x + 2 * s, y + 2 * s, 4 * s, 0, Math.PI * 2); c.fill();
    // Canopy in three depths, warm olive greens sampled from the
    // references: deep shade below, sunlit yellow-green on top.
    var deep = [[4, 6, 48], [-28, -8, 34], [32, -10, 36], [-12, 24, 32], [24, 22, 33], [2, -28, 32]];
    deep.forEach(function (b) {
      c.fillStyle = "#3f5c20";
      c.beginPath(); c.arc(x + b[0] * s, y + b[1] * s, b[2] * s, 0, Math.PI * 2); c.fill();
    });
    var mid = [[-6, -4, 40], [-30, -16, 28], [26, -18, 30], [-16, 14, 27], [18, 12, 28], [-2, -30, 27]];
    mid.forEach(function (b) {
      c.fillStyle = "#5d742c";
      c.beginPath(); c.arc(x + b[0] * s, y + b[1] * s, b[2] * s, 0, Math.PI * 2); c.fill();
    });
    var sun = [[-14, -16, 26], [10, -22, 24], [-24, 2, 20], [16, -2, 21], [-4, -34, 18]];
    sun.forEach(function (b) {
      c.fillStyle = "#7d8c34";
      c.beginPath(); c.arc(x + b[0] * s, y + b[1] * s, b[2] * s, 0, Math.PI * 2); c.fill();
    });
    speckle(c, x - 48 * s, y - 48 * s, 96 * s, 96 * s, 130, ["#a39754", "#2f4c1a", "#8b8049", "#bb9d3f", "#4c6b24"], 1.4, 3.2);
    // Spanish moss: pale strands at the canopy edge, as the references hang it.
    c.strokeStyle = "rgba(178,186,150,0.55)";
    c.lineWidth = 2;
    for (var m = 0; m < 7; m++) {
      var mx = x + rr(-42, 42) * s, my = y + rr(6, 30) * s;
      c.beginPath(); c.moveTo(mx, my); c.quadraticCurveTo(mx + rr(-4, 4), my + 12 * s, mx + rr(-6, 6), my + rr(16, 26) * s); c.stroke();
    }
  }
  function drawBush(c, x, y, pink) {
    for (var i = 0; i < 16; i++) {
      c.fillStyle = pink ? pick(["#d77fa8", "#c96a97", "#e59abb"]) : pick(["#4d7d33", "#5c8f3e"]);
      c.beginPath(); c.arc(x + rr(-16, 16), y + rr(-10, 10), rr(3, 6.5), 0, Math.PI * 2); c.fill();
    }
  }
  function drawHouse(c, hse) {
    // Yard, walkway, bushes, then the roof: overhead, a house is its roof.
    c.fillStyle = "rgba(255,255,240,0.05)";
    c.fillRect(hse.x - 34, hse.y - 34, hse.w + 68, hse.h + 68);
    var dx = hse.door[0], dy = hse.door[1];
    c.fillStyle = "#c2ab84";
    if (hse.side === "n") c.fillRect(dx - 11, dy - 52, 22, 54);
    else c.fillRect(dx - 11, dy - 2, 22, 54);
    paperShadow(c, hse.x, hse.y, hse.w, hse.h);
    c.fillStyle = hse.roof;
    c.fillRect(hse.x, hse.y, hse.w, hse.h);
    // Shingle rows: the roof reads as courses, not a slab.
    c.fillStyle = "rgba(0,0,0,0.10)";
    for (var sy = hse.y + 14; sy < hse.y + hse.h - 6; sy += 15) {
      if (Math.abs(sy - (hse.y + hse.h / 2)) < 12) continue;
      c.fillRect(hse.x + 3, sy, hse.w - 6, 2.4);
    }
    speckle(c, hse.x, hse.y, hse.w, hse.h, 240, ["rgba(0,0,0,0.10)", "rgba(255,255,255,0.07)"], 1, 2.4);
    c.fillStyle = "rgba(0,0,0,0.16)";
    c.fillRect(hse.x, hse.y + hse.h / 2 - 3, hse.w, 6);
    c.fillStyle = "rgba(255,255,255,0.13)";
    c.fillRect(hse.x, hse.y + hse.h / 2 - 9, hse.w, 3);
    c.strokeStyle = "rgba(40,30,20,0.35)";
    c.lineWidth = 3; c.strokeRect(hse.x + 1, hse.y + 1, hse.w - 2, hse.h - 2);
    c.fillStyle = "#9c5f43";
    c.fillRect(hse.x + hse.w * 0.68, hse.y + 14, 22, 30);
    c.fillStyle = "rgba(0,0,0,0.18)";
    c.fillRect(hse.x + hse.w * 0.68, hse.y + 40, 22, 4);
    // Porch at the door side.
    c.fillStyle = "#b09a76";
    if (hse.side === "n") c.fillRect(dx - 34, hse.y - 16, 68, 16);
    else c.fillRect(dx - 34, hse.y + hse.h, 68, 16);
    drawBush(c, hse.x + 16, hse.y + hse.h + 20, true);
    drawBush(c, hse.x + hse.w - 16, hse.y - 18, false);
  }
  function drawChurch(c) {
    paperShadow(c, CHURCH.x, CHURCH.y, CHURCH.w, CHURCH.h);
    // From overhead the church is its roof: warm tan shingles in
    // the reference palette, courses running to a center ridge.
    c.fillStyle = "#d3ba8f";
    c.fillRect(CHURCH.x, CHURCH.y, CHURCH.w, CHURCH.h);
    c.fillStyle = "rgba(120,90,40,0.13)";
    for (var csy = CHURCH.y + 13; csy < CHURCH.y + CHURCH.h - 6; csy += 14) {
      if (Math.abs(csy - (CHURCH.y + CHURCH.h / 2)) < 10) continue;
      c.fillRect(CHURCH.x + 3, csy, CHURCH.w - 6, 2.2);
    }
    speckle(c, CHURCH.x, CHURCH.y, CHURCH.w, CHURCH.h, 260, ["rgba(0,0,0,0.07)", "rgba(255,246,220,0.10)"], 1, 2.4);
    c.fillStyle = "rgba(0,0,0,0.14)";
    c.fillRect(CHURCH.x + CHURCH.w / 2 - 3, CHURCH.y, 6, CHURCH.h);
    c.strokeStyle = "rgba(60,50,35,0.4)"; c.lineWidth = 3;
    c.strokeRect(CHURCH.x + 1, CHURCH.y + 1, CHURCH.w - 2, CHURCH.h - 2);
    // Tower at the northwest corner, cross on its cap.
    c.fillStyle = "#cfc4ab";
    c.fillRect(CHURCH.x + 8, CHURCH.y + 8, 74, 74);
    c.strokeStyle = "rgba(60,50,35,0.45)"; c.strokeRect(CHURCH.x + 9, CHURCH.y + 9, 72, 72);
    c.fillStyle = "#b9872c";
    c.fillRect(CHURCH.x + 40, CHURCH.y + 22, 8, 34);
    c.fillRect(CHURCH.x + 29, CHURCH.y + 33, 30, 8);
    // Stained glass: small jewel dots down both sides.
    for (var i = 0; i < 4; i++) {
      c.fillStyle = ["#7a4a9e", "#2e6f6a", "#b3392e", "#e3a81c"][i];
      c.beginPath(); c.arc(CHURCH.x + 14, CHURCH.y + 110 + i * 46, 5, 0, Math.PI * 2); c.fill();
      c.beginPath(); c.arc(CHURCH.x + CHURCH.w - 14, CHURCH.y + 110 + i * 46, 5, 0, Math.PI * 2); c.fill();
    }
    c.fillStyle = "#4c3a26";
    c.fillRect(CHURCH.door[0] - 16, CHURCH.y + CHURCH.h - 6, 32, 10);
    c.fillStyle = "#c2ab84";
    c.fillRect(CHURCH.door[0] - 10, CHURCH.y + CHURCH.h + 4, 20, 420);
  }
  function drawStore(c) {
    paperShadow(c, STORE.x, STORE.y, STORE.w, STORE.h);
    c.fillStyle = "#b39d77";
    c.fillRect(STORE.x, STORE.y, STORE.w, STORE.h);
    speckle(c, STORE.x, STORE.y, STORE.w, STORE.h, 260, ["rgba(0,0,0,0.08)", "rgba(255,246,220,0.08)"], 1, 2.4);
    c.strokeStyle = "rgba(40,32,24,0.4)"; c.lineWidth = 4;
    c.strokeRect(STORE.x + 2, STORE.y + 2, STORE.w - 4, STORE.h - 4);
    c.fillStyle = "#8a7a5c";
    c.fillRect(STORE.x + 26, STORE.y + 30, 60, 44);
    c.fillRect(STORE.x + STORE.w - 90, STORE.y + STORE.h - 70, 52, 40);
    // Sign band and striped awning along the street face (north).
    c.fillStyle = "#54443a";
    c.fillRect(STORE.x - 4, STORE.y - 26, STORE.w + 8, 22);
    c.fillStyle = "#e8ddc4";
    c.fillRect(STORE.x + 10, STORE.y - 21, STORE.w - 20, 12);
    for (var i = 0; i < 12; i++) {
      c.fillStyle = i % 2 ? "#f2ead8" : "#b3392e";
      c.fillRect(STORE.x - 4 + i * ((STORE.w + 8) / 12), STORE.y - 4, (STORE.w + 8) / 12, 16);
    }
    c.fillStyle = "#4c3a26";
    c.fillRect(STORE.door[0] - 15, STORE.y - 4, 30, 8);
  }
  function drawCarShape(c, x, y, ang, body, len, wid) {
    c.save(); c.translate(x, y); c.rotate(ang);
    c.fillStyle = "rgba(20,20,20,0.28)";
    c.beginPath(); c.roundRect(-len / 2 + 3, -wid / 2 + 4, len, wid, 8); c.fill();
    c.fillStyle = body;
    c.beginPath(); c.roundRect(-len / 2, -wid / 2, len, wid, 8); c.fill();
    c.fillStyle = "rgba(20,26,34,0.85)";
    c.beginPath(); c.roundRect(-len * 0.08, -wid / 2 + 4, len * 0.30, wid - 8, 5); c.fill();
    c.beginPath(); c.roundRect(-len * 0.40, -wid / 2 + 5, len * 0.16, wid - 10, 4); c.fill();
    c.fillStyle = "rgba(255,255,255,0.20)";
    c.beginPath(); c.roundRect(-len * 0.05, -wid / 2 + 5, len * 0.24, wid - 10, 5); c.fill();
    c.restore();
  }
  function drawStadium(c) {
    var S = STADIUM;
    // Apron first (under the wall).
    // (apron brick drawn by caller before stadium)
    c.save();
    // Stands base.
    c.fillStyle = "#b3a58c";
    c.beginPath(); c.ellipse(S.cx, S.cy, S.rx * 0.99, S.ry * 0.99, 0, 0, Math.PI * 2); c.fill();
    // Crowd: a generated TEXTURE in the stands band (TW-1238 one
    // scale law): thousands of heads and shoulders reading as a
    // mass in the home purple and gold, never dot-figures.
    if (!crowdTile) crowdTile = buildCrowdTile();
    c.save();
    c.beginPath();
    c.ellipse(S.cx, S.cy, S.rx * 0.985, S.ry * 0.985, 0, 0, Math.PI * 2);
    c.ellipse(S.cx, S.cy, S.rx * 0.73, S.ry * 0.73, 0, 0, Math.PI * 2, true);
    c.clip("evenodd");
    c.fillStyle = c.createPattern(crowdTile, "repeat");
    c.fillRect(S.cx - S.rx, S.cy - S.ry, S.rx * 2, S.ry * 2);
    // Tier shading: concentric arcs give the bowl its steps.
    for (var rb = 0.78; rb < 0.99; rb += 0.05) {
      c.strokeStyle = "rgba(40,18,48,0.10)";
      c.lineWidth = 6;
      c.beginPath(); c.ellipse(S.cx, S.cy, S.rx * rb, S.ry * rb, 0, 0, Math.PI * 2); c.stroke();
    }
    c.restore();
    // Concourse ring.
    c.fillStyle = "#c9bda3";
    c.beginPath(); c.ellipse(S.cx, S.cy, S.rx * 0.72, S.ry * 0.72, 0, 0, Math.PI * 2); c.fill();
    // Field: deep lush green, mow bands running with the yards.
    var fx = S.cx - 230, fy = S.cy - 130, fw = 460, fh = 260;
    c.fillStyle = "#517821";
    c.fillRect(fx, fy, fw, fh);
    for (var s = 0; s < 10; s++) {
      c.fillStyle = s % 2 ? "rgba(255,255,255,0.055)" : "rgba(0,0,0,0.045)";
      c.fillRect(fx + s * fw / 10, fy, fw / 10, fh);
    }
    speckle(c, fx, fy, fw, fh, 700, ["#476e1f", "#5f8a30", "#86b45c"], 1, 2.2);
    c.strokeStyle = "rgba(255,255,255,0.85)"; c.lineWidth = 3;
    c.strokeRect(fx + 8, fy + 8, fw - 16, fh - 16);
    c.lineWidth = 2;
    for (var yl = 1; yl < 10; yl++) {
      c.beginPath(); c.moveTo(fx + yl * fw / 10, fy + 10); c.lineTo(fx + yl * fw / 10, fy + fh - 10); c.stroke();
    }
    c.fillStyle = "#7a2d20";
    c.fillRect(fx, fy, 26, fh); c.fillRect(fx + fw - 26, fy, 26, fh);
    // Goalposts.
    c.strokeStyle = "#e8c95a"; c.lineWidth = 4;
    [fx + 14, fx + fw - 14].forEach(function (gx) {
      c.beginPath(); c.moveTo(gx, S.cy - 26); c.lineTo(gx, S.cy + 26); c.stroke();
    });
    // Yard numbers painted on the grass, readable from both sides.
    c.fillStyle = "rgba(255,255,255,0.88)";
    c.font = "700 21px Georgia, serif";
    c.textAlign = "center"; c.textBaseline = "middle";
    var ynums = ["10", "20", "30", "40", "50", "40", "30", "20", "10"];
    for (var yn = 0; yn < 9; yn++) {
      var nx = fx + (yn + 1) * fw / 10;
      c.fillText(ynums[yn], nx, fy + 27);
      c.save(); c.translate(nx, fy + fh - 27); c.rotate(Math.PI);
      c.fillText(ynums[yn], 0, 0); c.restore();
    }
    // Players on the field at street scale (one scale law): two
    // elevens in formation around the line of scrimmage.
    var homeKit = { skin: "#6e4525", hair: "short", hairColor: "#1d130c", kit: "#f2ead8", kitDark: "#d8cba6", hat: null, hatColor: null, prop: null, gender: "m", build: "average", glasses: false, sash: false };
    var awayKit = { skin: "#7a4c28", hair: "short", hairColor: "#241a12", kit: "#7a2d20", kitDark: "#5d2117", hat: null, hatColor: null, prop: null, gender: "m", build: "average", glasses: false, sash: false };
    var homeIdle = makeFrame(homeKit, "idle", 0), homeWalk = makeFrame(homeKit, "walk", 1);
    var awayIdle = makeFrame(awayKit, "idle", 0), awayWalk = makeFrame(awayKit, "walk", 2);
    for (var pi = 0; pi < 11; pi++) {
      var col = pi % 4, rowI = Math.floor(pi / 4);
      stampImage(c, pi % 3 ? homeIdle : homeWalk, S.cx - 92 + col * 24 + rr(-3, 3), S.cy - 64 + rowI * 64 + rr(-5, 5), 0);
      stampImage(c, pi % 3 ? awayIdle : awayWalk, S.cx + 92 - col * 24 + rr(-3, 3), S.cy - 64 + rowI * 64 + rr(-5, 5), Math.PI);
    }
    // Outer wall.
    c.strokeStyle = "#9c5f43"; c.lineWidth = 30;
    c.beginPath(); c.ellipse(S.cx, S.cy, S.rx * 1.0, S.ry * 1.0, 0, 0, Math.PI * 2); c.stroke();
    c.strokeStyle = "rgba(60,30,18,0.35)"; c.lineWidth = 3;
    c.beginPath(); c.ellipse(S.cx, S.cy, S.rx * 1.0 + 15, S.ry * 1.0 + 15, 0, 0, Math.PI * 2); c.stroke();
    c.beginPath(); c.ellipse(S.cx, S.cy, S.rx - 15, S.ry - 15, 0, 0, Math.PI * 2); c.stroke();
    // South gate: cut the wall, set iron gates ajar.
    c.fillStyle = "#b98a63";
    c.fillRect(S.cx - 58, S.cy + S.ry - 22, 116, 46);
    c.fillStyle = "#2e2a26";
    c.fillRect(S.cx - 58, S.cy + S.ry - 20, 10, 42);
    c.fillRect(S.cx + 48, S.cy + S.ry - 20, 10, 42);
    c.fillStyle = "#9c5f43";
    c.fillRect(S.cx - 72, S.cy + S.ry - 26, 16, 54);
    c.fillRect(S.cx + 56, S.cy + S.ry - 26, 16, 54);
    c.restore();
    // Floodlight poles.
    [[S.cx - S.rx - 40, S.cy - S.ry + 30], [S.cx + S.rx + 40, S.cy - S.ry + 30], [S.cx - S.rx - 40, S.cy + S.ry - 30], [S.cx + S.rx + 40, S.cy + S.ry - 30]].forEach(function (p) {
      c.fillStyle = "#3a3a3e";
      c.beginPath(); c.arc(p[0], p[1], 5, 0, Math.PI * 2); c.fill();
      c.fillStyle = "#e8e2cc";
      c.fillRect(p[0] - 10, p[1] - 4, 20, 8);
    });
  }
  function renderStatic() {
    var c = staticC.getContext("2d");
    seed = 20261120;
    drawGrassBase(c);
    // Tailgate lawn: a lighter green, kept grass.
    c.fillStyle = "rgba(255,255,220,0.07)";
    c.fillRect(1640, 220, 560, 640);
    c.fillStyle = "#b3a58c";
    c.fillRect(1636, 220, 84, 640); // gravel parking strip
    speckle(c, 1636, 220, 84, 640, 260, ["#9c8f74", "#c6b998"], 1, 2);
    // Roads.
    drawAsphalt(c, 880, 0, 120, H);
    drawAsphalt(c, 0, 1080, W, 120);
    // Sidewalks.
    drawConcrete(c, 840, 0, 40, H); drawConcrete(c, 1000, 0, 40, H);
    drawConcrete(c, 0, 1040, W, 40); drawConcrete(c, 0, 1200, W, 40);
    drawConcrete(c, 120, 1520, 2960, 40); drawConcrete(c, 120, 1760, 2960, 40);
    // Center dashes (dotted lines, per the layout law).
    drawDashesV(c, 940, 10, H - 10, [[1060, 1220], [1500, 1820]]);
    drawDashesH(c, 1140, 10, W - 10, [[860, 1020]]);
    // The brick plaza: the main street of the neighborhood.
    drawBrick(c, 120, 1560, 2960, 200);
    // The diamond inlay at the plaza's heart (the gameplay reference).
    c.save();
    c.translate(1600, 1660); c.rotate(Math.PI / 4);
    c.strokeStyle = "rgba(232,201,90,0.55)"; c.lineWidth = 5;
    c.strokeRect(-52, -52, 104, 104);
    c.strokeStyle = "rgba(232,201,90,0.30)"; c.lineWidth = 2.4;
    c.strokeRect(-66, -66, 132, 132);
    c.restore();
    // Lamp posts and benches along the plaza, flower beds at its edges.
    LAMPS.forEach(function (lx) {
      [1544, 1784].forEach(function (ly) {
        c.fillStyle = "rgba(30,25,15,0.25)";
        c.beginPath(); c.arc(lx + 3, ly + 4, 6, 0, Math.PI * 2); c.fill();
        c.fillStyle = "#2e2a26";
        c.beginPath(); c.arc(lx, ly, 4.6, 0, Math.PI * 2); c.fill();
        c.fillStyle = "#e8c95a";
        c.beginPath(); c.arc(lx, ly, 2.6, 0, Math.PI * 2); c.fill();
      });
    });
    [1050, 2250].forEach(function (bx) {
      c.fillStyle = "rgba(30,25,15,0.22)";
      c.fillRect(bx - 32, 1692, 70, 12);
      c.fillStyle = "#7d5a13";
      c.fillRect(bx - 34, 1688, 70, 11);
      c.fillStyle = "#5f440e";
      c.fillRect(bx - 30, 1699, 8, 7); c.fillRect(bx + 24, 1699, 8, 7);
    });
    for (var fb = 0; fb < 26; fb++) {
      drawBush(c, 220 + fb * 112 + rr(-14, 14), fb % 2 ? 1500 : 1832, fb % 3 !== 0);
    }
    // Stadium apron.
    drawBrick(c, 2240, 800, 600, 240);
    // Dirt path: church door to the road sidewalk.
    c.fillStyle = "#c2ab84";
    c.fillRect(CHURCH.door[0] - 10, CHURCH.y + CHURCH.h, 20, 440);
    // Buildings.
    Object.keys(HOUSES).forEach(function (k) { drawHouse(c, HOUSES[k]); });
    drawChurch(c);
    drawStore(c);
    drawStadium(c);
    // Parked cars on the roads (present-day, unbranded shapes).
    drawCarShape(c, 852, 700, Math.PI / 2, "#7a2d20", 52, 26);
    drawCarShape(c, 1032, 1500, Math.PI / 2, "#33506e", 52, 26);
    drawCarShape(c, 1500, 1052, 0, "#c8c2b4", 52, 26);
    drawCarShape(c, 2900, 1228, 0, "#4c4a6e", 52, 26);
    // Trees and bushes.
    TREES.forEach(function (t) { drawTree(c, t[0], t[1], t[2]); });
    drawBush(c, 640, 1790, true); drawBush(c, 1980, 1535, true); drawBush(c, 2760, 1790, true);
    drawBush(c, 340, 1060, true); drawBush(c, 1500, 1060, false);
    // Paper grain over the whole world.
    speckle(c, 0, 0, W, H, 2600, ["rgba(60,40,20,0.05)", "rgba(255,250,235,0.05)"], 1, 1.8);
  }
  function drawTent(c, t) {
    c.fillStyle = "rgba(30,40,20,0.25)";
    c.fillRect(t.x - 62, t.y - 40, 136, 100);
    c.fillStyle = "#d8cfc0";
    c.fillRect(t.x - 58, t.y - 30, 116, 72); // table under the canopy edge
    for (var i = 0; i < 6; i++) {
      c.fillStyle = i % 2 ? t.b : t.a;
      c.fillRect(t.x - 68 + i * 23, t.y - 50, 23, 100);
    }
    c.strokeStyle = "rgba(50,35,20,0.4)"; c.lineWidth = 3;
    c.strokeRect(t.x - 68, t.y - 50, 136, 100);
    c.fillStyle = "#4c3a26";
    [[-64, -46], [60, -46], [-64, 42], [60, 42]].forEach(function (p) {
      c.beginPath(); c.arc(t.x + p[0], t.y + p[1], 3.4, 0, Math.PI * 2); c.fill();
    });
  }
  function drawTruck(c, x, y, ang, body) {
    c.save(); c.translate(x, y); c.rotate(ang);
    c.fillStyle = "rgba(20,20,20,0.28)";
    c.beginPath(); c.roundRect(-34, -15, 74, 34, 6); c.fill();
    c.fillStyle = body;
    c.beginPath(); c.roundRect(-36, -17, 76, 34, 6); c.fill();
    c.fillStyle = "rgba(20,26,34,0.85)";
    c.beginPath(); c.roundRect(14, -13, 16, 26, 4); c.fill();
    c.fillStyle = "#e8e2cc";
    c.fillRect(-30, -11, 8, 9); c.fillRect(-30, 3, 8, 9); // coolers in the bed
    c.restore();
  }
  function drawBuggy(c, x, y, ang) {
    c.save(); c.translate(x, y); c.rotate(ang);
    // Horse: body, neck, head, ear dots, tail.
    c.fillStyle = "rgba(20,16,10,0.25)";
    c.beginPath(); c.ellipse(36, 4, 26, 12, 0, 0, Math.PI * 2); c.fill();
    c.fillStyle = "#6e4f30";
    c.beginPath(); c.ellipse(34, 0, 25, 11, 0, 0, Math.PI * 2); c.fill();
    c.beginPath(); c.ellipse(58, -3, 10, 6, -0.5, 0, Math.PI * 2); c.fill();
    c.fillStyle = "#54391f";
    c.beginPath(); c.ellipse(12, 0, 7, 5, 0, 0, Math.PI * 2); c.fill();
    // Shafts and the carriage.
    c.strokeStyle = "#3a2c1c"; c.lineWidth = 3;
    c.beginPath(); c.moveTo(14, -7); c.lineTo(-8, -9); c.moveTo(14, 7); c.lineTo(-8, 9); c.stroke();
    c.fillStyle = "#26221e";
    c.beginPath(); c.roundRect(-38, -15, 32, 30, 5); c.fill();
    c.fillStyle = "#17140f";
    c.beginPath(); c.arc(-30, -17, 9, 0, Math.PI * 2); c.fill();
    c.beginPath(); c.arc(-30, 17, 9, 0, Math.PI * 2); c.fill();
    c.strokeStyle = "#0f0d0a"; c.lineWidth = 2;
    c.beginPath(); c.arc(-30, -17, 9, 0, Math.PI * 2); c.stroke();
    c.beginPath(); c.arc(-30, 17, 9, 0, Math.PI * 2); c.stroke();
    c.restore();
  }
  function renderSaturday() {
    var c = satC.getContext("2d");
    seed = 777;
    TENTS.forEach(function (t) { drawTent(c, t); });
    // Grills between the tents.
    [[1994, 585], [1940, 250]].forEach(function (g) {
      c.fillStyle = "#26221e";
      c.beginPath(); c.arc(g[0], g[1], 11, 0, Math.PI * 2); c.fill();
      c.fillStyle = "#57504a";
      c.beginPath(); c.arc(g[0], g[1], 7, 0, Math.PI * 2); c.fill();
    });
    // Trucks on the gravel strip, tailgate style.
    drawTruck(c, 1680, 330, Math.PI / 2, "#7a2d20");
    drawTruck(c, 1680, 560, Math.PI / 2, "#33506e");
    drawTruck(c, 1680, 770, Math.PI / 2, "#c8c2b4");
    // Buggies parked outside the gates, horses waiting.
    drawBuggy(c, 2330, 905, 0.12);
    drawBuggy(c, 2765, 905, -0.1);
    // The crowd pressing at the gates: full figures at street
    // scale in the home purple and gold (one scale law).
    var gateSpots = [];
    for (var gxx = 2296; gxx <= 2472; gxx += 44)
      for (var gyy = 856; gyy <= 964; gyy += 42) gateSpots.push([gxx + rr(-9, 9), gyy + rr(-8, 8)]);
    for (var gx2 = 2608; gx2 <= 2784; gx2 += 44)
      for (var gy2 = 856; gy2 <= 964; gy2 += 42) gateSpots.push([gx2 + rr(-9, 9), gy2 + rr(-8, 8)]);
    gateSpots.forEach(function (sp, i) {
      var app = genericAppearance();
      if (i % 3) {
        app.kit = pick(["#5b3a8e", "#6d4aa3", "#e3a81c", "#472b70"]);
        app.kitDark = shade(app.kit, -26);
      }
      var kind = i % 5 === 0 ? "wave" : (i % 4 === 0 ? "cheer" : "idle");
      stampImage(c, makeFrame(app, kind, i % 2), sp[0], sp[1], Math.PI / 2 + rr(-0.5, 0.5));
    });
  }

  /* ------------------------- minimap base -------------------------- */
  var miniC = document.createElement("canvas");
  miniC.width = 200; miniC.height = 150;
  (function renderMinimap() {
    var c = miniC.getContext("2d"), s = 200 / W;
    c.fillStyle = "#5f8a30"; c.fillRect(0, 0, 200, 150);
    c.fillStyle = "#55565a";
    c.fillRect(880 * s, 0, 120 * s, 150); c.fillRect(0, 1080 * s, 200, 120 * s);
    c.fillStyle = "#b5684f"; c.fillRect(120 * s, 1560 * s, 2960 * s, 200 * s);
    c.fillStyle = "#6f9c3c"; c.fillRect(1640 * s, 220 * s, 560 * s, 640 * s);
    c.fillStyle = "#c9bda3";
    c.beginPath(); c.ellipse(STADIUM.cx * s, STADIUM.cy * s, STADIUM.rx * s, STADIUM.ry * s, 0, 0, Math.PI * 2); c.fill();
    c.fillStyle = "#517821";
    c.beginPath(); c.ellipse(STADIUM.cx * s, STADIUM.cy * s, STADIUM.rx * 0.55 * s, STADIUM.ry * 0.55 * s, 0, 0, Math.PI * 2); c.fill();
    c.fillStyle = "#e8e2cc"; c.fillRect(CHURCH.x * s, CHURCH.y * s, CHURCH.w * s, CHURCH.h * s);
    c.fillStyle = "#8a7a5c"; c.fillRect(STORE.x * s, STORE.y * s, STORE.w * s, STORE.h * s);
    c.fillStyle = "#cbb489";
    Object.keys(HOUSES).forEach(function (k) {
      var hse = HOUSES[k];
      c.fillRect(hse.x * s, hse.y * s, hse.w * s, hse.h * s);
    });
  })();

  renderStatic();
  renderSaturday();

  /* ============================ figures ============================ */
  function frozenAge(rec) {
    if (rec.bornStatus === "documented" && rec.diedStatus === "documented" && rec.born && rec.died) {
      return rec.died - rec.born;
    }
    return null;
  }
  function eraOf(rec) {
    // Dress decade: documented birth year plus 25, else neutral.
    if (rec.bornStatus !== "documented" || !rec.born) return "neutral";
    var d = Math.floor((rec.born + 25) / 10) * 10;
    return String(d);
  }
  function makeFigure(rec, idx) {
    var home = HOUSES[rec.home];
    var f = {
      rec: rec, idx: idx,
      x: home.door[0] + rr(-26, 26), y: home.door[1] + rr(-6, 22),
      heading: rr(0, Math.PI * 2), path: [], pathI: 0,
      state: "dwell", dwellT: rr(1, 7), roundI: Math.floor(rr(0, rec.rounds.length)),
      greetCd: rr(2, 14), greetedOnce: false, lineI: 0,
      waveT: 0, bob: rr(0, 6), satI: 0, active: true
    };
    // Sprites painted once from the appearance record (TW-1238);
    // a documented Saturday attendee also gets a set in her
    // school colors with the gold sash.
    f.sprites = makeSpriteSet(appearanceOf(rec));
    if (rec.saturday && rec.saturday.attendee) {
      var sa = appearanceOf(rec);
      sa.kit = rec.saturday.colors[0];
      sa.kitDark = shade(rec.saturday.colors[0], -26);
      sa.sash = true;
      f.satSprites = makeSpriteSet(sa);
    }
    return f;
  }
  var npcs = window.LGCY_WORLD_PEOPLE.map(makeFigure);
  npcs.forEach(function (f, i) { f.active = i < outCount; });
  // First-frame life: two relatives are already out on the plaza
  // when the visitor arrives, the way both references open.
  var SPAWN_OUT = { "melvin-andrew-gooden": [762, 1652], "emma-jean-jackson": [2352, 1672], "troy-wright": [1180, 1658] };
  npcs.forEach(function (f) {
    var s = SPAWN_OUT[f.rec.id];
    if (s && f.active) {
      f.x = s[0]; f.y = s[1];
      f.state = "dwell"; f.dwellT = rr(2, 5);
    }
  });

  var player = {
    rec: window.LGCY_WORLD_PLAYER, x: 1600, y: 1660, heading: -Math.PI / 2,
    path: [], pathI: 0, bob: 0, moving: false, idx: 99, state: "idle", isPlayer: true
  };
  player.sprites = makeSpriteSet(appearanceOf(player.rec));

  function destFor(f) {
    if (saturday) {
      var spots = f.rec.saturday.role === "stands" ? STAND_SPOTS
        : f.rec.saturday.role === "grill" ? [GRILL_SPOT, GATE_SPOTS[2]]
        : f.rec.saturday.role === "gates" ? GATE_SPOTS
        : TAILGATE_SPOTS;
      var s = spots[f.satI % spots.length];
      f.satI++;
      return Array.isArray(s) ? { x: s[0], y: s[1] } : s;
    }
    var name = f.rec.rounds[f.roundI % f.rec.rounds.length];
    f.roundI++;
    if (name === "home") {
      var hse = HOUSES[f.rec.home];
      return { x: hse.door[0], y: hse.door[1] };
    }
    return PLACES[name];
  }
  function sendTo(f, dest) {
    f.path = findPath(f.x, f.y, dest.x, dest.y);
    f.pathI = 0;
    f.state = "walk";
  }
  function followPath(f, speed, dt) {
    if (f.pathI >= f.path.length) return true;
    var t = f.path[f.pathI];
    var dx = t.x - f.x, dy = t.y - f.y, d = Math.hypot(dx, dy);
    var step = speed * dt;
    if (d <= Math.max(step + 2, 7)) {
      f.x = t.x; f.y = t.y; f.pathI++;
      return f.pathI >= f.path.length;
    }
    var want = Math.atan2(dy, dx);
    if (d < 36) {
      f.heading = want; // close in: face the point, no pursuit orbit
    } else {
      var diff = want - f.heading;
      while (diff > Math.PI) diff -= Math.PI * 2;
      while (diff < -Math.PI) diff += Math.PI * 2;
      f.heading += diff * Math.min(1, dt * 10);
    }
    f.x += Math.cos(f.heading) * step;
    f.y += Math.sin(f.heading) * step;
    f.bob += dt * speed * 0.30;
    return false;
  }

  /* --------------------------- greetings --------------------------- */
  var activeTexts = {};
  var greetActive = null;
  var greetCount = 0;
  var lastGreetEnd = -10;
  function timeLine() {
    if (hour < 12) return "Good morning, Justynn!";
    if (hour < 17) return "Good afternoon, Justynn!";
    if (hour < 22) return "Good evening, Justynn!";
    return "Good night, Justynn!";
  }
  function tryGreet(f, now) {
    if (greetActive || now - lastGreetEnd < 1.2 || f.greetCd > 0) return;
    var d = Math.hypot(f.x - player.x, f.y - player.y);
    if (d > 108 || d < 12) return;
    var line = !f.greetedOnce ? timeLine() : f.rec.lines[f.lineI % f.rec.lines.length];
    if (activeTexts[line]) return; // the TW-1227 guard: never twice at once
    f.greetedOnce = true;
    f.lineI++;
    f.prevState = f.state;
    f.state = "greet";
    f.waveT = 2.4;
    greetActive = { fig: f, line: line, until: now + 2.4 };
    activeTexts[line] = true;
    greetCount++;
    bubbleEl.textContent = line;
    bubbleEl.classList.add("show");
    bubbleEl.setAttribute("data-speaker", f.rec.name);
    if (liveEl) liveEl.textContent = f.rec.name + ": " + line;
  }

  /* ----------------------------- car ------------------------------- */
  var car = { x: 940, y: 120, heading: Math.PI / 2, wp: 0, speed: 105 };
  var CAR_ROUTE = [[940, 1136], [3050, 1136], [940, 1136], [940, 120]];
  function updateCar(dt) {
    var t = CAR_ROUTE[car.wp];
    var dx = t[0] - car.x, dy = t[1] - car.y, d = Math.hypot(dx, dy);
    if (d < 8) { car.wp = (car.wp + 1) % CAR_ROUTE.length; return; }
    var want = Math.atan2(dy, dx);
    var diff = want - car.heading;
    while (diff > Math.PI) diff -= Math.PI * 2;
    while (diff < -Math.PI) diff += Math.PI * 2;
    car.heading += diff * Math.min(1, dt * 6);
    car.x += Math.cos(car.heading) * car.speed * dt;
    car.y += Math.sin(car.heading) * car.speed * dt;
  }

  /* ============================ camera ============================= */
  var view = { w: 960, h: 540 };
  // Zoom law (founder, TW-1238): the camera angle is the
  // references' overhead angle at EVERY level; zoom changes
  // scale only, never angle. The closest clamp is the hard stop,
  // set so the framing matches reference-2 (figures large, plaza
  // detail readable). The default sits between that max and the
  // wide end, where figures read as people.
  var ZOOM_MIN = 0.45, ZOOM_MAX = 2.2, ZOOM_DEFAULT = 1.45;
  var zoomParam = parseFloat(params.get("zoom") || String(ZOOM_DEFAULT));
  var zoom = isNaN(zoomParam) ? ZOOM_DEFAULT : Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, zoomParam));
  var targetZoom = zoom;
  var dpr = 1;
  var cam = { x: player.x, y: player.y };
  var followId = null;
  function clampZoom(z) { return Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, z)); }
  function resize() {
    var r = stage.getBoundingClientRect();
    dpr = Math.min(2, window.devicePixelRatio || 1);
    view.w = Math.max(320, Math.floor(r.width));
    view.h = Math.max(320, Math.floor(r.height));
    canvas.width = Math.floor(view.w * dpr);
    canvas.height = Math.floor(view.h * dpr);
  }
  window.addEventListener("resize", resize);

  function worldToScreen(x, y) {
    return [
      (x - cam.x) * zoom + view.w / 2,
      (y - cam.y) * zoom + view.h / 2
    ];
  }

  /* ============================ drawing ============================ */
  function drawFigureShape(c, f, t) {
    var isPlayer = !!f.isPlayer;
    var sets = (saturday && f.satSprites) ? f.satSprites : f.sprites;
    var walking = f.state === "walk" || (isPlayer && player.moving);
    var cheer = saturday && f.state === "dwell" && f.rec.saturday && f.rec.saturday.role === "stands";
    var front = f.state === "greet" || cheer;
    var back = !front && Math.sin(f.heading) < -0.35;
    var set = back ? sets.back : sets.front;
    var flip = !front && Math.cos(f.heading) < 0;
    var img, bobY = 0;
    if (f.state === "greet") img = set.wave[Math.floor(t * 5) % 2];
    else if (cheer) img = set.cheer[Math.floor(t * 3.2 + f.idx) % 2];
    else if (walking) {
      img = set.walk[Math.floor(f.bob / 1.85) % 4];
      bobY = Math.abs(Math.sin(f.bob)) * 1.7;
    } else img = set.idle;
    c.save();
    c.translate(f.x, f.y);
    // Soft ground shadow (radial sprite, TW-1238).
    c.drawImage(shadowImg, -26, -6, 52, 26);
    if (isPlayer) {
      // The ground marker: a gold ring, as both references draw it.
      c.strokeStyle = "#e3a81c"; c.lineWidth = 3;
      c.beginPath(); c.ellipse(0, 5, 24, 16, 0, 0, Math.PI * 2); c.stroke();
      c.strokeStyle = "rgba(227,168,28,0.45)"; c.lineWidth = 1.6;
      c.beginPath(); c.ellipse(0, 5, 29, 19, 0, 0, Math.PI * 2); c.stroke();
    }
    if (flip) c.scale(-1, 1);
    c.drawImage(img, -SPR_GX, -SPR_GY - bobY, SPR_W, SPR_H);
    c.restore();
  }

  var smoke = [];
  function drawSmoke(t, dt) {
    if (!saturday) return;
    if (rnd() < dt * 2.2) {
      var g = pick([[1994, 578], [1940, 243]]);
      smoke.push({ x: g[0] + rr(-4, 4), y: g[1], r: rr(4, 7), life: 0 });
    }
    smoke = smoke.filter(function (s) { return s.life < 3.4; });
    smoke.forEach(function (s) {
      s.life += dt; s.y -= dt * 13; s.x += dt * 5; s.r += dt * 5;
      ctx.fillStyle = "rgba(240,238,232," + (0.34 * (1 - s.life / 3.4)).toFixed(3) + ")";
      ctx.beginPath(); ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2); ctx.fill();
    });
  }

  function drawScene(t, dt) {
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    var vw = view.w / zoom, vh = view.h / zoom;
    var sx = cam.x - vw / 2, sy = cam.y - vh / 2;
    ctx.fillStyle = "#466324";
    ctx.fillRect(0, 0, view.w, view.h);
    ctx.save();
    ctx.scale(zoom, zoom);
    ctx.translate(-sx, -sy);
    var ix = Math.max(0, sx), iy = Math.max(0, sy);
    var iw = Math.min(W, sx + vw) - ix, ih = Math.min(H, sy + vh) - iy;
    if (iw > 0 && ih > 0) {
      ctx.drawImage(staticC, ix, iy, iw, ih, ix, iy, iw, ih);
      if (saturday) ctx.drawImage(satC, ix, iy, iw, ih, ix, iy, iw, ih);
    }
    // The moving car.
    drawCarShape(ctx, car.x, car.y, car.heading, "#8a3324", 54, 27);
    if (phase === "night" || phase === "dusk") {
      ctx.fillStyle = "rgba(255,240,190,0.5)";
      var hx = car.x + Math.cos(car.heading) * 30, hy = car.y + Math.sin(car.heading) * 30;
      ctx.beginPath(); ctx.arc(hx - Math.sin(car.heading) * 8, hy + Math.cos(car.heading) * 8, 5, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.arc(hx + Math.sin(car.heading) * 8, hy - Math.cos(car.heading) * 8, 5, 0, Math.PI * 2); ctx.fill();
    }
    // Figures, sorted by y so lower figures overlap upper ones.
    var figs = npcs.filter(function (f) { return f.active; });
    figs.push(player);
    figs.sort(function (a, b) { return a.y - b.y; });
    figs.forEach(function (f) { drawFigureShape(ctx, f, t); });
    drawSmoke(t, dt);
    // Light by phase.
    if (phase !== "day") {
      var alpha = phase === "night" ? 0.36 : phase === "dusk" ? 0.17 : 0.10;
      ctx.fillStyle = phase === "night" ? "rgba(10,16,48," + alpha + ")" : "rgba(38,26,58," + alpha + ")";
      ctx.fillRect(ix, iy, iw, ih);
      // Porch lights and street lamps.
      ctx.fillStyle = "rgba(255,214,130,0.20)";
      var glow = function (x, y, r) {
        ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill();
      };
      Object.keys(HOUSES).forEach(function (k) { glow(HOUSES[k].door[0], HOUSES[k].door[1], 30); });
      LAMPS.forEach(function (lx) { glow(lx, 1544, 40); glow(lx, 1784, 40); });
      ctx.fillStyle = "rgba(255,226,150,0.95)";
      Object.keys(HOUSES).forEach(function (k) {
        ctx.beginPath(); ctx.arc(HOUSES[k].door[0], HOUSES[k].door[1], 3.4, 0, Math.PI * 2); ctx.fill();
      });
      LAMPS.forEach(function (lx) {
        ctx.beginPath(); ctx.arc(lx, 1544, 3.4, 0, Math.PI * 2); ctx.fill();
        ctx.beginPath(); ctx.arc(lx, 1784, 3.4, 0, Math.PI * 2); ctx.fill();
      });
      if (saturday) {
        // Stadium lights, flickering a little, as he asked.
        var fl = 0.13 + Math.sin(t * 23) * 0.012 + Math.sin(t * 7.3) * 0.012;
        ctx.fillStyle = "rgba(255,244,200," + fl.toFixed(3) + ")";
        ctx.beginPath(); ctx.ellipse(STADIUM.cx, STADIUM.cy, STADIUM.rx * 1.12, STADIUM.ry * 1.12, 0, 0, Math.PI * 2); ctx.fill();
      }
    }
    ctx.restore();
    // Speech bubble follows its speaker.
    if (greetActive) {
      var bp = worldToScreen(greetActive.fig.x, greetActive.fig.y - 70);
      bubbleEl.style.transform = "translate(" + Math.round(bp[0]) + "px," + Math.round(bp[1]) + "px) translate(-50%,-100%)";
    }
    // Minimap.
    mctx.drawImage(miniC, 0, 0);
    var ms = 200 / W;
    mctx.fillStyle = "rgba(255,255,255,0.85)";
    npcs.forEach(function (f) {
      if (!f.active) return;
      mctx.fillRect(f.x * ms - 1.4, f.y * ms - 1.4, 2.8, 2.8);
    });
    mctx.strokeStyle = "rgba(255,255,255,0.5)";
    mctx.lineWidth = 1;
    mctx.strokeRect(sx * ms, sy * ms, vw * ms, vh * ms);
    mctx.fillStyle = "#e3a81c";
    mctx.beginPath(); mctx.arc(player.x * ms, player.y * ms, 4, 0, Math.PI * 2); mctx.fill();
    mctx.strokeStyle = "#fff"; mctx.lineWidth = 1.6;
    mctx.beginPath(); mctx.arc(player.x * ms, player.y * ms, 4, 0, Math.PI * 2); mctx.stroke();
  }

  /* ============================ main loop ========================== */
  var last = performance.now() / 1000;
  var elapsed = 0;
  function frame(nowMs) {
    var now = nowMs / 1000;
    // dt never runs negative: the rAF clock can start a hair
    // behind `last`, and a negative elapsed poisons the cyclic
    // frame indices (wave/cheer) in the first frames of page life.
    var dt = Math.max(0, Math.min(0.05, now - last));
    last = now;
    elapsed += dt;
    // Zoom eases toward its target; scale only, the angle holds.
    zoom += (targetZoom - zoom) * Math.min(1, dt * 9);
    if (Math.abs(targetZoom - zoom) < 0.001) zoom = targetZoom;

    // Player.
    var keys = keyState;
    var kx = (keys.right ? 1 : 0) - (keys.left ? 1 : 0);
    var ky = (keys.down ? 1 : 0) - (keys.up ? 1 : 0);
    player.moving = false;
    if (kx || ky) {
      player.path = []; player.pathI = 0;
      var nx = player.x + kx * player.rec.present.speed * 1.9 * dt;
      var ny = player.y + ky * player.rec.present.speed * 1.9 * dt;
      if (walkablePx(nx, player.y)) player.x = nx;
      if (walkablePx(player.x, ny)) player.y = ny;
      player.heading = Math.atan2(ky, kx);
      player.bob += dt * 11;
      player.moving = true;
    } else if (player.pathI < player.path.length) {
      player.moving = !followPath(player, player.rec.present.speed, dt);
    }

    // Relatives.
    npcs.forEach(function (f) {
      if (!f.active) return;
      f.greetCd -= dt;
      if (f.state === "greet") {
        f.waveT -= dt;
        var want = Math.atan2(player.y - f.y, player.x - f.x);
        var diff = want - f.heading;
        while (diff > Math.PI) diff -= Math.PI * 2;
        while (diff < -Math.PI) diff += Math.PI * 2;
        f.heading += diff * Math.min(1, dt * 8);
        if (f.waveT <= 0) {
          f.state = f.prevState === "greet" ? "dwell" : (f.prevState || "dwell");
          if (f.state === "dwell" && f.pathI < f.path.length) f.state = "walk";
          f.greetCd = 50;
        }
        return;
      }
      if (f.state === "dwell") {
        f.dwellT -= dt;
        if (f.dwellT <= 0) sendTo(f, destFor(f));
      } else if (f.state === "walk") {
        if (followPath(f, f.rec.present.speed, dt)) {
          f.state = "dwell";
          f.dwellT = saturday ? rr(16, 34) : rr(4, 10);
        }
      }
      tryGreet(f, elapsed);
    });
    if (greetActive && elapsed > greetActive.until) {
      delete activeTexts[greetActive.line];
      greetActive = null;
      lastGreetEnd = elapsed;
      bubbleEl.classList.remove("show");
    }

    updateCar(dt);

    // Camera follows the player (or a followed relative, for proof).
    var target = player;
    if (followId) {
      var ff = npcs.find(function (f) { return f.rec.id === followId; });
      if (ff) target = ff;
    }
    cam.x += (target.x - cam.x) * Math.min(1, dt * 4.5);
    cam.y += (target.y - cam.y) * Math.min(1, dt * 4.5);
    var vw = view.w / zoom, vh = view.h / zoom;
    cam.x = Math.min(Math.max(cam.x, vw / 2 - 60), W - vw / 2 + 60);
    cam.y = Math.min(Math.max(cam.y, vh / 2 - 60), H - vh / 2 + 60);

    drawScene(elapsed, dt);
    requestAnimationFrame(frame);
  }

  /* ========================== interaction ========================== */
  var keyState = { left: false, right: false, up: false, down: false };
  canvas.addEventListener("keydown", function (e) {
    var k = e.key.toLowerCase();
    if (k === "arrowleft" || k === "a") keyState.left = true;
    else if (k === "arrowright" || k === "d") keyState.right = true;
    else if (k === "arrowup" || k === "w") keyState.up = true;
    else if (k === "arrowdown" || k === "s") keyState.down = true;
    else return;
    e.preventDefault();
  });
  canvas.addEventListener("keyup", function (e) {
    var k = e.key.toLowerCase();
    if (k === "arrowleft" || k === "a") keyState.left = false;
    else if (k === "arrowright" || k === "d") keyState.right = false;
    else if (k === "arrowup" || k === "w") keyState.up = false;
    else if (k === "arrowdown" || k === "s") keyState.down = false;
  });
  canvas.addEventListener("click", function (e) {
    if (pinched) { pinched = false; return; }
    var r = canvas.getBoundingClientRect();
    var sx = e.clientX - r.left, sy = e.clientY - r.top;
    var wx = cam.x + (sx - view.w / 2) / zoom;
    var wy = cam.y + (sy - view.h / 2) / zoom;
    // A tap on a relative opens their profile, as the street did.
    for (var i = 0; i < npcs.length; i++) {
      var f = npcs[i];
      if (f.active && Math.hypot(f.x - wx, f.y - wy) < 36) {
        location.href = "person.html";
        return;
      }
    }
    var dest = nearestWalkable(wx, wy);
    player.path = findPath(player.x, player.y, dest.x, dest.y);
    player.pathI = 0;
  });
  var zoomIn = document.getElementById("world-zoom-in");
  var zoomOut = document.getElementById("world-zoom-out");
  if (zoomIn) zoomIn.addEventListener("click", function () { targetZoom = clampZoom(targetZoom * 1.25); });
  if (zoomOut) zoomOut.addEventListener("click", function () { targetZoom = clampZoom(targetZoom / 1.25); });
  // Mouse wheel: zoom about the center; the camera stays on the
  // player, so the world scales in place.
  canvas.addEventListener("wheel", function (e) {
    e.preventDefault();
    targetZoom = clampZoom(targetZoom * (e.deltaY < 0 ? 1.12 : 1 / 1.12));
  }, { passive: false });
  // Pinch: two pointers set the scale by their spread.
  var pointers = {}, pinchD0 = 0, pinchZoom0 = 1, pinched = false;
  canvas.addEventListener("pointerdown", function (e) {
    pointers[e.pointerId] = [e.clientX, e.clientY];
    var ps = Object.values(pointers);
    if (ps.length === 2) {
      pinchD0 = Math.hypot(ps[0][0] - ps[1][0], ps[0][1] - ps[1][1]);
      pinchZoom0 = targetZoom;
      pinched = true;
    }
  });
  canvas.addEventListener("pointermove", function (e) {
    if (!pointers[e.pointerId]) return;
    pointers[e.pointerId] = [e.clientX, e.clientY];
    var ps = Object.values(pointers);
    if (ps.length === 2 && pinchD0 > 0) {
      var d = Math.hypot(ps[0][0] - ps[1][0], ps[0][1] - ps[1][1]);
      targetZoom = clampZoom(pinchZoom0 * d / pinchD0);
    }
  });
  function pointerEnd(e) { delete pointers[e.pointerId]; }
  canvas.addEventListener("pointerup", pointerEnd);
  canvas.addEventListener("pointercancel", pointerEnd);

  /* --------------------------- caption ----------------------------- */
  if (clockEl) {
    var d = new Date();
    var hh = d.getHours(), mm = d.getMinutes();
    var ampm = hh >= 12 ? "PM" : "AM";
    var h12 = hh % 12 === 0 ? 12 : hh % 12;
    var dayName = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"][d.getDay()];
    clockEl.textContent = saturday
      ? "Saturday at the stadium: the family gathers, and the tailgate lawn is full. The world keeps your hours: " + h12 + ":" + (mm < 10 ? "0" : "") + mm + " " + ampm + " where you are."
      : "The world keeps your hours: " + h12 + ":" + (mm < 10 ? "0" : "") + mm + " " + ampm + " on a " + dayName + " where you are. Come back Saturday and the family gathers at the stadium.";
  }

  /* ------------------------- QA / proof hook ------------------------ */
  window.__lgcyWorld = {
    state: function () {
      return {
        hour: hour, phase: phase, saturday: saturday, zoom: zoom,
        targetZoom: targetZoom, zoomMin: ZOOM_MIN, zoomMax: ZOOM_MAX, dpr: dpr,
        player: { x: Math.round(player.x), y: Math.round(player.y), moving: player.moving },
        cam: { x: Math.round(cam.x), y: Math.round(cam.y) },
        greetCount: greetCount,
        npcs: npcs.map(function (f) {
          return { id: f.rec.id, x: Math.round(f.x), y: Math.round(f.y), state: f.state, active: f.active, era: eraOf(f.rec), frozenAge: frozenAge(f.rec) };
        })
      };
    },
    sendPlayerTo: function (x, y) {
      var dest = nearestWalkable(x, y);
      player.path = findPath(player.x, player.y, dest.x, dest.y);
      player.pathI = 0;
    },
    placePlayer: function (x, y) {
      var p = nearestWalkable(x, y);
      player.x = p.x; player.y = p.y; player.path = []; player.pathI = 0;
      cam.x = p.x; cam.y = p.y;
    },
    placeNpc: function (id, x, y) {
      var f = npcs.find(function (n) { return n.rec.id === id; });
      if (!f) return;
      var p = nearestWalkable(x, y);
      f.x = p.x; f.y = p.y; f.path = []; f.pathI = 0;
      f.state = "dwell"; f.dwellT = 30; f.greetCd = 0;
    },
    sendNpcTo: function (id, x, y) {
      var f = npcs.find(function (n) { return n.rec.id === id; });
      if (f) sendTo(f, nearestWalkable(x, y));
    },
    primeGreet: function (id) {
      var f = npcs.find(function (n) { return n.rec.id === id; });
      if (f) { f.greetedOnce = true; f.greetCd = 0; }
    },
    follow: function (id) { followId = id; },
    unfollow: function () { followId = null; }
  };

  resize();
  requestAnimationFrame(frame);
})();
