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
    // Crowd: thousands of paper dots in the stands band.
    for (var i = 0; i < 2600; i++) {
      var a = rnd() * Math.PI * 2, rad = rr(0.74, 0.965);
      var px = S.cx + Math.cos(a) * S.rx * rad, py = S.cy + Math.sin(a) * S.ry * rad;
      c.fillStyle = pick(["#c96a5a", "#e8ddc4", "#5a7a9e", "#e3c95a", "#8a5a34", "#f0e6d2", "#7a9e5a", "#4c4a6e"]);
      c.beginPath(); c.arc(px, py, rr(1.5, 2.7), 0, Math.PI * 2); c.fill();
    }
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
    // Extra crowd pressing at the gates.
    for (var i = 0; i < 240; i++) {
      c.fillStyle = pick(["#c96a5a", "#e8ddc4", "#5a7a9e", "#e3c95a", "#8a5a34", "#f0e6d2"]);
      c.beginPath(); c.arc(rr(2290, 2790), rr(830, 1010), rr(1.6, 2.8), 0, Math.PI * 2); c.fill();
    }
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
    c.fillStyle = "#4d8f3f";
    c.beginPath(); c.ellipse(STADIUM.cx * s, STADIUM.cy * s, STADIUM.rx * 0.55 * s, STADIUM.ry * 0.55 * s, 0, 0, Math.PI * 2); c.fill();
    c.fillStyle = "#e8e2cc"; c.fillRect(CHURCH.x * s, CHURCH.y * s, CHURCH.w * s, CHURCH.h * s);
    c.fillStyle = "#8a7a5c"; c.fillRect(STORE.x * s, STORE.y * s, STORE.w * s, STORE.h * s);
    c.fillStyle = "#6e6e73";
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
    return {
      rec: rec, idx: idx,
      x: home.door[0] + rr(-26, 26), y: home.door[1] + rr(-6, 22),
      heading: rr(0, Math.PI * 2), path: [], pathI: 0,
      state: "dwell", dwellT: rr(1, 7), roundI: Math.floor(rr(0, rec.rounds.length)),
      greetCd: rr(2, 14), greetedOnce: false, lineI: 0,
      waveT: 0, bob: rr(0, 6), satI: 0, active: true
    };
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
    if (d > 96 || d < 12) return;
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
  var zoomParam = parseFloat(params.get("zoom") || "1");
  var zoom = isNaN(zoomParam) ? 1 : Math.min(2.2, Math.max(0.6, zoomParam));
  var cam = { x: player.x, y: player.y };
  var followId = null;
  function resize() {
    var r = stage.getBoundingClientRect();
    canvas.width = Math.max(320, Math.floor(r.width));
    canvas.height = Math.max(320, Math.floor(r.height));
    view.w = canvas.width; view.h = canvas.height;
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
    var p = f.rec.present;
    var isPlayer = !!f.isPlayer;
    var walking = f.state === "walk" || (isPlayer && player.moving);
    var swing = walking ? Math.sin(f.bob) : 0;
    var bobY = walking ? Math.abs(Math.sin(f.bob)) * 1.6 : Math.sin(t * 1.7 + f.idx * 2.1) * 0.5;
    var cheer = saturday && f.state === "dwell" && f.rec.saturday && f.rec.saturday.role === "stands";
    c.save();
    c.translate(f.x, f.y);
    c.scale(1.32, 1.32); // readable at plaza scale, as the gameplay reference draws them
    // Ground shadow (paper layer offset).
    c.fillStyle = "rgba(30,35,20,0.28)";
    c.beginPath(); c.ellipse(3, 6, 15, 10, 0, 0, Math.PI * 2); c.fill();
    if (isPlayer) {
      // The ground marker: a gold ring, as both references draw it.
      c.strokeStyle = "#e3a81c"; c.lineWidth = 3;
      c.beginPath(); c.ellipse(0, 5, 21, 14, 0, 0, Math.PI * 2); c.stroke();
      c.strokeStyle = "rgba(227,168,28,0.45)"; c.lineWidth = 1.6;
      c.beginPath(); c.ellipse(0, 5, 26, 17, 0, 0, Math.PI * 2); c.stroke();
    }
    c.rotate(f.heading + Math.PI / 2); // figures are drawn facing up
    c.translate(0, -bobY);
    var kit = p.kit, kitDark = p.kitDark;
    if (saturday && f.rec.saturday && f.rec.saturday.attendee) {
      kit = f.rec.saturday.colors[0]; kitDark = f.rec.saturday.colors[0];
    }
    // Dress/skirt flare for the women, trousers block for the men.
    c.fillStyle = kitDark;
    c.beginPath();
    if (f.rec.gender === "f") c.ellipse(0, 6, 14.5, 12, 0, 0, Math.PI * 2);
    else c.ellipse(0, 6, 12.5, 11, 0, 0, Math.PI * 2);
    c.fill();
    // Feet stepping.
    c.fillStyle = "#2e2620";
    var fOff = walking ? swing * 5 : 0;
    c.beginPath(); c.ellipse(-5.5, 13 + fOff * 0.4, 3.4, 4.6 + Math.abs(fOff) * 0.3, 0, 0, Math.PI * 2); c.fill();
    c.beginPath(); c.ellipse(5.5, 13 - fOff * 0.4, 3.4, 4.6 + Math.abs(fOff) * 0.3, 0, 0, Math.PI * 2); c.fill();
    // Arms: swing at the sides; the greeting wave raises the right arm.
    var waving = f.state === "greet";
    c.fillStyle = kit;
    var armSwing = walking ? swing * 4 : 0;
    c.beginPath(); c.ellipse(-14.5, 1 + armSwing * 0.5, 4, 7.5, 0.25, 0, Math.PI * 2); c.fill();
    if (waving) {
      var wa = Math.sin(t * 11) * 0.38;
      c.save();
      c.translate(14.5, -2); c.rotate(-2.25 + wa);
      c.beginPath(); c.ellipse(0, -6, 3.8, 7.5, 0, 0, Math.PI * 2); c.fill();
      c.fillStyle = p.skin;
      c.beginPath(); c.arc(0, -13.5, 3.6, 0, Math.PI * 2); c.fill();
      c.restore();
    } else if (cheer) {
      c.save();
      c.translate(14.5, -2); c.rotate(-2.6 + Math.sin(t * 6 + f.idx) * 0.3);
      c.beginPath(); c.ellipse(0, -6, 3.8, 7.5, 0, 0, Math.PI * 2); c.fill();
      c.restore();
    } else {
      c.beginPath(); c.ellipse(14.5, 1 - armSwing * 0.5, 4, 7.5, -0.25, 0, Math.PI * 2); c.fill();
    }
    // Shoulders / torso.
    c.fillStyle = kit;
    c.beginPath(); c.ellipse(0, 0, 13, 11, 0, 0, Math.PI * 2); c.fill();
    if (saturday && f.rec.saturday && f.rec.saturday.attendee) {
      c.fillStyle = f.rec.saturday.colors[1];
      c.fillRect(-2.6, -10, 5.2, 20); // the school's gold sash
    }
    // Props.
    if (p.prop === "plate" || (saturday && f.rec.saturday && f.rec.saturday.plate)) {
      c.fillStyle = "#f4efe2";
      c.beginPath(); c.arc(17, 8, 5.6, 0, Math.PI * 2); c.fill();
      c.strokeStyle = "rgba(90,70,40,0.4)"; c.lineWidth = 1.2;
      c.beginPath(); c.arc(17, 8, 5.6, 0, Math.PI * 2); c.stroke();
      c.fillStyle = "#b3392e";
      c.beginPath(); c.arc(17, 8, 2.4, 0, Math.PI * 2); c.fill();
    } else if (p.prop === "basket") {
      c.fillStyle = "#a97e46";
      c.fillRect(12.5, 4, 10, 8);
      c.strokeStyle = "#7d5a13"; c.lineWidth = 1.4;
      c.strokeRect(12.5, 4, 10, 8);
    } else if (p.prop === "cane") {
      c.strokeStyle = "#4c3a26"; c.lineWidth = 2.4;
      c.beginPath(); c.moveTo(16.5, -2); c.lineTo(19, 14); c.stroke();
    }
    // Head: hair first (it rings the head from overhead), then face.
    var hairColor = p.hair === "bun-gray" || p.hair === "gray" || p.hair === "short-gray" ? "#c9c2b4" : "#241a12";
    if (p.hair === "afro") {
      c.fillStyle = "#241a12";
      c.beginPath(); c.arc(0, -1, 10.5, 0, Math.PI * 2); c.fill();
    }
    c.fillStyle = hairColor;
    c.beginPath(); c.arc(0, -1.2, 8.1, 0, Math.PI * 2); c.fill();
    c.fillStyle = p.skin;
    c.beginPath(); c.arc(0, 0.6, 6.9, 0, Math.PI * 2); c.fill();
    if (p.hair === "bun" || p.hair === "bun-gray") {
      c.fillStyle = hairColor;
      c.beginPath(); c.arc(0, -8.6, 3.6, 0, Math.PI * 2); c.fill();
    }
    if (p.hair === "long") {
      c.fillStyle = hairColor;
      c.beginPath(); c.ellipse(0, -3.4, 8.3, 5.4, 0, Math.PI, Math.PI * 2); c.fill();
    }
    // Hats ride on top of everything.
    if (p.hat === "church") {
      c.fillStyle = p.hatColor;
      c.beginPath(); c.arc(0, -0.6, 11.6, 0, Math.PI * 2); c.fill();
      c.fillStyle = "#d8cba6";
      c.beginPath(); c.arc(0, -0.6, 6.4, 0, Math.PI * 2); c.fill();
      c.fillStyle = "#b3392e";
      c.beginPath(); c.arc(7.6, -6.4, 2.6, 0, Math.PI * 2); c.fill();
    } else if (p.hat === "fedora") {
      c.fillStyle = p.hatColor;
      c.beginPath(); c.arc(0, -0.6, 10.6, 0, Math.PI * 2); c.fill();
      c.fillStyle = "#2e2822";
      c.beginPath(); c.arc(0, -0.6, 6.2, 0, Math.PI * 2); c.fill();
    } else if (p.hat === "cap") {
      c.fillStyle = p.hatColor;
      c.beginPath(); c.arc(0, -0.8, 7.9, 0, Math.PI * 2); c.fill();
      c.beginPath(); c.ellipse(0, -8.6, 6.4, 3.2, 0, 0, Math.PI * 2); c.fill();
    }
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
    var vw = view.w / zoom, vh = view.h / zoom;
    var sx = cam.x - vw / 2, sy = cam.y - vh / 2;
    ctx.fillStyle = "#3c5a2a";
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
      var bp = worldToScreen(greetActive.fig.x, greetActive.fig.y - 50);
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
    var dt = Math.min(0.05, now - last);
    last = now;
    elapsed += dt;

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
  if (zoomIn) zoomIn.addEventListener("click", function () { zoom = Math.min(2.2, zoom * 1.2); });
  if (zoomOut) zoomOut.addEventListener("click", function () { zoom = Math.max(0.6, zoom / 1.2); });

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
