// Our LGCY, Phase D (TW-1147): the buck at the threshold.
// The Grab3D whitetail (CC0), rigged in TW-1075 Phase B with baked
// clips that move the neck, head, and ears only, composed into a
// page-break section between the journey and the base of the tree:
// flipped 180 degrees from the founder's silhouette illustration,
// pitched on a rock crest, camera low looking up, lower body and
// rock dissolving into the break via a canvas mask. This module
// REPLACES the v4 placeholder layer (gl/scene.js, the Quaternius
// pack deer and its whole-body procedural performance) outright:
// no part of that model, rig, or motion carries over.
//
// TW-1152 (founder live review, Nov 16): the buck moves off center
// to the right edge third of the frame, so he stands at the
// threshold's edge and gazes across the page; the look clips in
// the GLB are re-authored wider and slower (rig pipeline, not
// here); and the light, material tint, rock color, and contact
// shadow are graded warm against the oak photograph so he reads
// as living in the tree rather than placed on it.
//
// Fail-closed contract, same as the layer it replaces: any failure
// at any stage (no WebGL2, software renderer, slow probe, lost
// context, asset error) tears the layer down and the section falls
// back to a quiet threshold divider; the v3 page stands untouched.
// The probe runs after first paint; v3 paints first, in full.
//
// Animation law (founder, 2026-11-13): the body never moves. Only
// the baked clips play (Lookout_Idle by default; Look_Left,
// Look_Right, Ear_Adjust as calm gestures). There is no procedural
// bone layer in this module at all. Reduced motion shows the
// frame-0 stance.
//
// QA overrides: ?gl=force-a, ?gl=force-b, ?gl=off (test hooks only).

import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { mergeVertices } from "three/addons/utils/BufferGeometryUtils.js";
import Lenis from "./vendor/lenis.mjs";

(function () {
  "use strict";

  var REDUCED = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var section = document.getElementById("buck-break");
  if (!section) return;

  var params = new URLSearchParams(window.location.search);
  var force = params.get("gl"); // force-a | force-b | off | null

  var state = {
    tier: null,
    reason: "",
    probe: null,
    torn: false,
    clip: null,
    raf: 0,
    lenis: null
  };
  window.__lgcyBuck = state;

  function setTier(tier, reason) {
    state.tier = tier;
    state.reason = reason || "";
    document.documentElement.dataset.glTier = tier;
    if (reason) document.documentElement.dataset.glReason = reason;
  }

  function teardown(reason) {
    if (state.torn) return;
    state.torn = true;
    // Guest modules die with the layer. (TW-1076's fauna guests
    // retired with TW-1209; the scattered habitats in
    // gl/scatter.js are independent of this layer and do not
    // listen, but the contract stays for any future guest.)
    window.dispatchEvent(new CustomEvent("lgcy-buck-teardown"));
    setTier("C", reason);
    if (state.raf) cancelAnimationFrame(state.raf);
    if (state.lenis) {
      try { state.lenis.destroy(); } catch (e) { /* already gone */ }
      state.lenis = null;
    }
    section.classList.remove("gl-on");
    if (state.canvas && state.canvas.parentNode) {
      state.canvas.parentNode.removeChild(state.canvas);
    }
    if (state.renderer) {
      try { state.renderer.dispose(); } catch (e) { /* noop */ }
    }
    if (window.console && console.info) {
      console.info("[lgcy-buck] tier C:", reason);
    }
  }
  state.teardown = teardown;

  if (force === "off") { setTier("C", "qa-override-off"); return; }

  // ---------- Stage 1: pre-checks (identical gate to the v4 layer) ----------
  function precheck() {
    var c = document.createElement("canvas");
    var gl2 = null;
    try { gl2 = c.getContext("webgl2"); } catch (e) { /* no webgl2 */ }
    if (!gl2) return "no-webgl2";
    var dbg = gl2.getExtension("WEBGL_debug_renderer_info");
    var renderer = dbg
      ? String(gl2.getParameter(dbg.UNMASKED_RENDERER_WEBGL) || "")
      : "";
    state.rendererString = renderer;
    if (/swiftshader|llvmpipe|software|basic render/i.test(renderer)) {
      return "software-renderer";
    }
    if (navigator.hardwareConcurrency && navigator.hardwareConcurrency < 2) {
      return "low-cpu";
    }
    if (navigator.deviceMemory && navigator.deviceMemory < 1) {
      return "low-memory";
    }
    if (navigator.connection && navigator.connection.saveData) {
      return "save-data";
    }
    return null;
  }

  // ---------- Stage 2: scene build ----------
  var LOOK = { x: 0.30, y: 1.30, z: 0 };
  var renderer, scene3, camera, mixer, buckGroup, actions = {};
  var clock = new THREE.Clock();
  var sectionVisible = false;
  var nextGestureAt = 8;
  var arrivalDone = false;

  // The fitted stance plane from the Phase B rig (RIG-MAPPING.md):
  // front soles at (z 0.175, y 0.219), hind-left sole at (z -0.647,
  // y 0), a 15.05-degree slope descending toward the rear (-z here).
  function stancePlaneY(z) {
    return 0.219 - (0.175 - z) * 0.2664;
  }

  // TW-1209 (founder, 2026-11-19): the rock goes realistic. The
  // Phase D rock was a flat-shaded low-poly form in one flat
  // color; it read as a prop. The new rock keeps every contact
  // invariant the rig was fitted against (the stance-plane cap,
  // the steep camera face, the flattened base) and changes only
  // the surface: a denser displaced form with smooth normals, a
  // procedural granite skin (speckle, lichen, faint strata) used
  // as both map and bump, and a ground apron of the same skin
  // running out from the base toward the page, alpha-feathered
  // at its rim, so the stone grades into the section's own
  // dissolve and from there into the oak photograph behind the
  // page. No seam where the rock ends.
  // Deterministic multi-scale noise for the rock's broken
  // surfaces (the crest envelope and the cut-face rumple below).
  // Sin products, in the house style of the displacement in
  // buildRock; range roughly [-1, 1]; no Math.random, so the
  // captures reproduce frame to frame.
  function rockNoise(x, z) {
    return Math.sin(x * 2.3 + z * 1.7) * 0.45 +
           Math.sin(x * 4.9 - z * 3.8 + 1.7) * 0.30 +
           Math.sin(x * 9.7 + z * 8.3 + 4.1) * 0.17 +
           Math.sin(x * 19.3 - z * 15.1 + 2.3) * 0.08;
  }

  function rockTexture() {
    var c = document.createElement("canvas");
    c.width = 1024; c.height = 1024;
    var g = c.getContext("2d");
    g.fillStyle = "#6a5947";
    g.fillRect(0, 0, 1024, 1024);
    var i, j;
    // TW-1209 fix round (Rosa's gate measure): the first skin
    // was fine grain only, and at render scale its high-
    // frequency gradient measured 3.34 against the photo-
    // graph's 16.69, so the stone read flat where the light
    // was even. The skin now carries detail at every scale,
    // strongest at the mid scales the render actually
    // resolves: tonal mottling, cracks, clustered speckle,
    // then the fine grain, at higher contrast throughout.
    // large tonal mottling
    for (i = 0; i < 30; i++) {
      var bx = Math.random() * 1024, by = Math.random() * 1024;
      var br = 60 + Math.random() * 150;
      var bg = g.createRadialGradient(bx, by, 2, bx, by, br);
      bg.addColorStop(0, Math.random() < 0.55
        ? "rgba(38,29,19,0.20)" : "rgba(219,203,172,0.15)");
      bg.addColorStop(1, "rgba(0,0,0,0)");
      g.fillStyle = bg;
      g.beginPath();
      g.arc(bx, by, br, 0, 7);
      g.fill();
    }
    // value range, the part the first skin lacked: the
    // photograph's gradient is sky-bright against bark-dark,
    // and a stone in tree shade only competes if its own
    // range runs deep shadow to sun fleck. Dark pooling in
    // the lows, then dappled sun flecks at the same scale
    // the canopy throws them on the photo itself.
    for (i = 0; i < 22; i++) {
      var dx = Math.random() * 1024, dy = Math.random() * 1024;
      var dr = 36 + Math.random() * 96;
      var dg = g.createRadialGradient(dx, dy, 2, dx, dy, dr);
      dg.addColorStop(0, "rgba(14,9,4," + (0.22 + Math.random() * 0.18) + ")");
      dg.addColorStop(1, "rgba(0,0,0,0)");
      g.fillStyle = dg;
      g.beginPath();
      g.arc(dx, dy, dr, 0, 7);
      g.fill();
    }
    for (i = 0; i < 110; i++) {
      var sx = Math.random() * 1024, sy = Math.random() * 1024;
      var sr = 7 + Math.random() * 34;
      var sg = g.createRadialGradient(sx, sy, 1, sx, sy, sr);
      sg.addColorStop(0, "rgba(238,226,196," + (0.16 + Math.random() * 0.26) + ")");
      sg.addColorStop(1, "rgba(238,226,196,0)");
      g.fillStyle = sg;
      g.beginPath();
      g.arc(sx, sy, sr, 0, 7);
      g.fill();
    }
    // faint strata bands
    for (var b = 0; b < 9; b++) {
      var y0 = (b / 9) * 1024 + (Math.sin(b * 7.3) * 20);
      g.fillStyle = b % 2 ? "rgba(52,42,30,0.10)" : "rgba(214,198,168,0.07)";
      g.fillRect(0, y0, 1024, 52 + (b % 3) * 18);
    }
    // cracks: short dark walks with jitter, the strongest
    // mid-scale signal granite carries
    for (i = 0; i < 52; i++) {
      var cx = Math.random() * 1024, cy = Math.random() * 1024;
      var ang = Math.random() * Math.PI * 2;
      var segs = 3 + (Math.random() * 5 | 0);
      g.strokeStyle = "rgba(16,10,5," + (0.42 + Math.random() * 0.30) + ")";
      g.lineWidth = 2 + Math.random() * 2.4;
      g.beginPath();
      g.moveTo(cx, cy);
      for (j = 0; j < segs; j++) {
        ang += (Math.random() - 0.5) * 0.9;
        var len = 14 + Math.random() * 30;
        cx += Math.cos(ang) * len;
        cy += Math.sin(ang) * len;
        g.lineTo(cx, cy);
      }
      g.stroke();
    }
    var tones = ["#5a4c3a", "#7d6c56", "#87765e", "#4c4033",
                 "#97876c", "#665743", "#3e3325", "#a08e6f"];
    // aggregate patches: irregular mid-scale polygons in
    // contrasting tones, the scale band (10-40 px on the
    // canvas) that survives render minification and carries
    // the measured gradient; fine grain alone averages to
    // tone at render scale, which is why the first skin's
    // detail never reached the frame
    for (i = 0; i < 300; i++) {
      var px = Math.random() * 1024, py = Math.random() * 1024;
      var pr = 6 + Math.random() * 18;
      var pts = 5 + (Math.random() * 3 | 0);
      g.fillStyle = tones[i % tones.length];
      g.globalAlpha = 0.25 + Math.random() * 0.35;
      g.beginPath();
      for (j = 0; j < pts; j++) {
        var pa = (j / pts) * Math.PI * 2;
        var prad = pr * (0.6 + Math.random() * 0.6);
        var vx = px + Math.cos(pa) * prad, vy = py + Math.sin(pa) * prad;
        if (j === 0) g.moveTo(vx, vy); else g.lineTo(vx, vy);
      }
      g.closePath();
      g.fill();
    }
    g.globalAlpha = 1;
    // mid speckle: clustered grains
    for (i = 0; i < 2800; i++) {
      g.fillStyle = tones[i % tones.length];
      g.globalAlpha = 0.30 + Math.random() * 0.45;
      g.beginPath();
      g.arc(Math.random() * 1024, Math.random() * 1024,
        1.5 + Math.random() * 2.6, 0, 7);
      g.fill();
    }
    // fine granite grain, high contrast
    for (i = 0; i < 30000; i++) {
      g.fillStyle = tones[i % tones.length];
      g.globalAlpha = 0.35 + Math.random() * 0.5;
      g.fillRect(Math.random() * 1024, Math.random() * 1024,
        1 + Math.random() * 1.6, 1 + Math.random() * 1.6);
    }
    g.globalAlpha = 1;
    // lichen: pale sage and rust patches, soft-edged, each
    // freckled so the patch itself carries texture
    [["#b3bd8d", 30], ["#a9703f", 16], ["#9aa87f", 22]].forEach(function (p) {
      for (var j = 0; j < p[1]; j++) {
        var x = Math.random() * 1024, y = Math.random() * 1024;
        var r = 6 + Math.random() * 26;
        var rg = g.createRadialGradient(x, y, 1, x, y, r);
        rg.addColorStop(0, p[0] + "e6");
        rg.addColorStop(1, p[0] + "00");
        g.fillStyle = rg;
        g.beginPath();
        g.arc(x, y, r, 0, 7);
        g.fill();
        g.fillStyle = p[0];
        for (var k = 0; k < 14; k++) {
          g.globalAlpha = 0.25 + Math.random() * 0.4;
          g.fillRect(x + (Math.random() - 0.5) * r * 1.4,
            y + (Math.random() - 0.5) * r * 1.4, 1.6, 1.6);
        }
        g.globalAlpha = 1;
      }
    });
    var tex = new THREE.CanvasTexture(c);
    tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
    // no repeat: texel density is set by buildRock's planar
    // UVs (0.55 per world unit), not by tiling this canvas
    tex.colorSpace = THREE.SRGBColorSpace;
    return tex;
  }

  function buildRock() {
    // mergeVertices first: the polyhedron geometry is
    // non-indexed, and smooth normals need shared vertices
    // detail 5 (fix round): at detail 4 the crest's facets ran
    // 40-70 px across in the render and read as flat planes
    // however the surface was dressed; detail 5 halves the
    // facet scale so the displacement can carry crag at the
    // scale the eye actually resolves
    var geo = mergeVertices(new THREE.IcosahedronGeometry(1, 5));
    var pos = geo.attributes.position;
    var v = new THREE.Vector3();
    var i;
    for (i = 0; i < pos.count; i++) {
      v.fromBufferAttribute(pos, i);
      v.x *= 1.55;
      v.y *= 1.02;
      v.z *= 2.05;
      var n = Math.sin(v.x * 5.1) * Math.cos(v.z * 3.7) * 0.045 +
              Math.sin(v.z * 7.3 + v.x * 2.9) * 0.030 +
              Math.sin(v.y * 9.1 + v.z * 4.3) * 0.020 +
              Math.sin(v.x * 14.7 + v.y * 11.3) * Math.cos(v.z * 12.9) * 0.012 +
              Math.sin(v.z * 21.7 + v.y * 17.1) * 0.007 +
              Math.sin(v.x * 26.3 + v.y * 19.7) * Math.cos(v.z * 23.1) * 0.015 +
              Math.sin(v.z * 34.9 + v.x * 29.3) * 0.010 +
              Math.sin(v.x * 47.3 - v.z * 41.7) * 0.005;
      // the crest carries the crag: displacement grows toward
      // the top of the form, the base stays calm
      n *= 1 + 0.7 * Math.max(0, v.y);
      v.multiplyScalar(1 + n);
      // The camera-facing face drops steeply (the founder's ~45
      // degrees lives in the rock, per Rosa's Phase B note N2; the
      // rig's fitted 15-degree contact plane is untouched).
      if (v.z > 0.45) v.y -= (v.z - 0.45) * 0.95;
      // ...but not as a plane (fix round, Rosa's TW-1209 gate):
      // the cut face is rumpled at two scales, the rumple
      // growing with distance from the crest break, so no
      // straight lit edge survives to the render.
      if (v.z > 0.45) {
        var rumple = Math.min(1, (v.z - 0.45) / 0.85);
        v.y += rockNoise(v.x * 1.9 + 7.3, v.z * 1.6) * 0.085 * rumple +
               Math.sin(v.x * 23.0 + v.z * 19.0) * 0.016 * rumple;
      }
      if (v.y < -0.30) v.y = -0.30 + (v.y + 0.30) * 0.25; // flattened base
      pos.setXYZ(i, v.x, v.y, v.z);
    }
    geo.translate(0, -0.52, -0.18);
    // The stance plane is flattened ONLY where the hooves
    // actually stand (front soles at z 0.175, hind sole at
    // z -0.647, legs inside |x| 0.36): that cap is a rig
    // invariant and stays exact, a hair below the soles, so
    // the hooves own the contact. The first build clamped a
    // broad rectangle (|x| 0.52, z -0.80..0.34) to the same
    // plane and the render showed the rectangle: a flat sheet
    // with straight edges (Rosa, TW-1209 gate). Outside the
    // stance patch the cap now lets go gradually: a noise
    // envelope takes over across a feather band, so the crest
    // breaks into lumps around the patch and the silhouette
    // against the photograph is a noise contour, never a
    // straight line; past the band the cap lifts away and the
    // displaced form stands on its own.
    for (i = 0; i < pos.count; i++) {
      v.fromBufferAttribute(pos, i);
      var plane = stancePlaneY(v.z) - 0.012;
      var dx = Math.max(0, Math.abs(v.x) - 0.36);
      var dz = 0;
      if (v.z < -0.74) dz = -0.74 - v.z;
      else if (v.z > 0.26) dz = v.z - 0.26;
      var d = Math.sqrt(dx * dx + dz * dz);
      if (d === 0) {
        if (v.y > plane) pos.setY(i, plane);
      } else if (d < 0.42) {
        // narrow feather: the first fix round's band reached
        // 0.9-1.05 units out and the crest read as a table
        // however craggy its rim was; the stance needs only
        // the patch, so the shoulders now fall away within
        // ~0.4 units and the crest reads as a ridge
        var s = Math.min(1, d / 0.22);
        s = s * s * (3 - 2 * s);
        var capY = plane + rockNoise(v.x * 3.2 + 3.1, v.z * 3.2) * 0.20 * s +
          Math.max(0, d - 0.22) * 2.6;
        if (v.y > capY) pos.setY(i, capY);
      }
    }
    geo.computeVertexNormals();
    // Planar UVs by dominant normal axis (fix round). The
    // icosahedron's spherical UVs pinch to a sliver at the
    // crest pole, so the crest sampled a thin strip of the
    // skin canvas and rendered as mush no matter how much
    // detail the canvas carried: the rock-alone diagnostic
    // measured hf-gradient 2.8 against the photograph's 16.
    // A rock does not need continuous UVs; it needs even
    // texel density. Granite noise hides the projection
    // seams as cracks.
    var nrm = geo.attributes.normal;
    var uvs = new Float32Array(pos.count * 2);
    for (i = 0; i < pos.count; i++) {
      v.fromBufferAttribute(pos, i);
      var anx = Math.abs(nrm.getX(i));
      var any = Math.abs(nrm.getY(i));
      var anz = Math.abs(nrm.getZ(i));
      var pu, pv;
      if (any >= anx && any >= anz) { pu = v.x; pv = v.z; }
      else if (anx >= anz) { pu = v.z; pv = v.y; }
      else { pu = v.x; pv = v.y; }
      uvs[i * 2] = pu * 0.55;
      uvs[i * 2 + 1] = pv * 0.55;
    }
    geo.setAttribute("uv", new THREE.BufferAttribute(uvs, 2));
    // Height tint in vertex colors: the crest takes the warm
    // canopy light, the base falls toward forest-floor shade, so
    // the form reads as sunlit stone even where the texture's own
    // detail is fine-grained.
    var colors = new Float32Array(pos.count * 3);
    for (i = 0; i < pos.count; i++) {
      v.fromBufferAttribute(pos, i);
      var t = Math.min(1, Math.max(0, (v.y + 0.85) / 1.15));
      // per-vertex tonal mottling (fix round): at the grazing
      // angle the camera meets the crest, the skin texture
      // foreshortens to a smear and the top read as one even
      // lit band; the tint itself now varies at the 15-25 px
      // scale so the crest carries value changes even where
      // the texture cannot
      var vm = 0.80 + 0.32 * (0.5 + 0.5 * rockNoise(v.x * 11 + 9.2, v.z * 11));
      colors[i * 3] = Math.min(1, (0.42 + 0.58 * t) * vm);
      colors[i * 3 + 1] = Math.min(1, (0.36 + 0.57 * t) * vm);
      colors[i * 3 + 2] = Math.min(1, (0.27 + 0.55 * t) * vm);
    }
    geo.setAttribute("color", new THREE.BufferAttribute(colors, 3));
    var skin = rockTexture();
    // the camera meets this stone at a grazing angle, where
    // minification without anisotropy smears the skin to mush;
    // keep the detail the texture now carries
    if (renderer) {
      skin.anisotropy = Math.min(8, renderer.capabilities.getMaxAnisotropy());
    }
    var mat = new THREE.MeshStandardMaterial({
      map: skin,
      bumpMap: skin,
      bumpScale: 3.2,
      vertexColors: true,
      color: 0xd8c8ac,
      roughness: 0.97,
      metalness: 0.0
    });
    var rock = new THREE.Mesh(geo, mat);
    return rock;
  }

  // The ground shade: the blend vehicle under the rock. Four
  // captures taught the lesson (qa/tw1209): a LIT stone surface
  // spread toward the camera reads as a sheet against the
  // photograph no matter how it is displaced, dappled, or
  // tinted, because a grazing camera foreshortens it into a
  // band with one clean lit edge. Shade does not fight the
  // photograph: a warm earth-dark gradient, dappled at its rim,
  // reads as the ground shadow of the outcrop on any photo
  // content, and it carries the eye from the real rock under
  // the hooves down to the foot of the section, where the
  // canvas mask's own dissolve finishes the blend into the
  // page. Same construction as the contact shadow, broader and
  // softer, sitting just under it.
  function buildApron() {
    var cv = document.createElement("canvas");
    cv.width = cv.height = 512;
    var ctx = cv.getContext("2d");
    var g = ctx.createRadialGradient(256, 256, 20, 256, 256, 256);
    g.addColorStop(0, "rgba(43,31,17,0.60)");
    g.addColorStop(0.42, "rgba(43,31,17,0.47)");
    g.addColorStop(0.72, "rgba(43,31,17,0.20)");
    g.addColorStop(1, "rgba(43,31,17,0)");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, 512, 512);
    // dapple the rim band both ways, the way light through
    // leaves breaks an edge: some spots hold the shade longer,
    // some let the photograph through early, so the falloff is
    // a scatter and never a clean geometric line
    for (var i = 0; i < 700; i++) {
      var ang = Math.random() * Math.PI * 2;
      var rad = (0.52 + Math.random() * 0.48) * 256;
      var bx = 256 + Math.cos(ang) * rad;
      var by = 256 + Math.sin(ang) * rad;
      if (bx < 0 || bx > 512 || by < 0 || by > 512) continue;
      var br = 6 + Math.random() * 26;
      var bg = ctx.createRadialGradient(bx, by, 0.5, bx, by, br);
      if (Math.random() < 0.5) {
        bg.addColorStop(0, "rgba(43,31,17," + (0.05 + Math.random() * 0.13) + ")");
      } else {
        bg.addColorStop(0, "rgba(255,244,214," + (0.04 + Math.random() * 0.09) + ")");
      }
      bg.addColorStop(1, "rgba(0,0,0,0)");
      ctx.fillStyle = bg;
      ctx.beginPath();
      ctx.arc(bx, by, br, 0, 7);
      ctx.fill();
    }
    var tex = new THREE.CanvasTexture(cv);
    var mat = new THREE.MeshBasicMaterial({
      map: tex, transparent: true, depthWrite: false
    });
    var m = new THREE.Mesh(new THREE.PlaneGeometry(5.4, 5.4), mat);
    m.rotation.x = -Math.PI / 2 + Math.atan(0.2664); // lie on the slope
    m.position.set(0, stancePlaneY(-0.24) - 0.055, 0.45);
    // a tongue, not a disc: narrower across the frame, longer
    // down it, running from the rock to the foot of the page
    m.scale.set(0.88, 1.28, 1);
    m.renderOrder = 1;
    return m;
  }

  function buildShadow() {
    var cv = document.createElement("canvas");
    cv.width = cv.height = 256;
    var ctx = cv.getContext("2d");
    var g = ctx.createRadialGradient(128, 128, 8, 128, 128, 128);
    g.addColorStop(0, "rgba(26,17,7,0.66)");
    g.addColorStop(0.6, "rgba(26,17,7,0.36)");
    g.addColorStop(1, "rgba(26,17,7,0)");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, 256, 256);
    var tex = new THREE.CanvasTexture(cv);
    var mat = new THREE.MeshBasicMaterial({
      map: tex, transparent: true, depthWrite: false
    });
    var m = new THREE.Mesh(new THREE.PlaneGeometry(2.7, 3.3), mat);
    m.rotation.x = -Math.PI / 2 + Math.atan(0.2664); // lie on the slope
    m.position.set(0, stancePlaneY(-0.24) - 0.022, -0.24);
    return m;
  }

  function buildScene() {
    renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true,
      powerPreference: "high-performance"
    });
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.05;
    state.renderer = renderer;
    state.canvas = renderer.domElement;
    state.canvas.className = "gl-canvas";
    state.canvas.setAttribute("aria-hidden", "true");
    state.canvas.addEventListener("webglcontextlost", function (e) {
      e.preventDefault();
      teardown("context-lost");
    });
    section.insertBefore(state.canvas, section.firstChild);

    scene3 = new THREE.Scene();
    camera = new THREE.PerspectiveCamera(40, 1, 0.1, 60);
    camera.position.set(0.25, 0.80, 6.6);
    camera.lookAt(LOOK.x, LOOK.y, LOOK.z);

    // Light graded against the oak photograph (TW-1152 blend law):
    // warm canopy light from the left, warm bounce where the cool
    // rim used to fight the photo, so the buck sits in the same
    // golden forest light as the page behind him.
    var hemi = new THREE.HemisphereLight(0xe6d3a7, 0x33261a, 1.0);
    scene3.add(hemi);
    var sun = new THREE.DirectionalLight(0xffc98a, 1.3);
    sun.position.set(-4.5, 6, 3.5);
    scene3.add(sun);
    var rim = new THREE.DirectionalLight(0xd9c9a8, 0.3);
    rim.position.set(5, 3, -2.5);
    scene3.add(rim);
    var face = new THREE.DirectionalLight(0xffe2b0, 0.35);
    face.position.set(0.5, 2.2, 8);
    scene3.add(face);

    buckGroup = new THREE.Group();
    buckGroup.add(buildRock());
    buckGroup.add(buildApron());
    var shadow = buildShadow();
    shadow.renderOrder = 2;
    buckGroup.add(shadow);
    scene3.add(buckGroup);
  }

  function loadBuck() {
    return new Promise(function (resolve, reject) {
      var loader = new GLTFLoader();
      loader.load(
        "gl/animals/buck-rigged.glb",
        function (gltf) {
          var deer = gltf.scene;
          // Blend law (TW-1152): a warm tint multiplied into every
          // coat material pulls the source's cooler render toward
          // the oak photograph's golden register.
          deer.traverse(function (o) {
            if (o.isMesh && o.material && o.material.color) {
              o.material.color.setRGB(1.0, 0.95, 0.87);
            }
          });
          buckGroup.add(deer);
          mixer = new THREE.AnimationMixer(deer);
          gltf.animations.forEach(function (clip) {
            actions[clip.name] = mixer.clipAction(clip);
          });
          state.deerRect = function () {
            var box = new THREE.Box3().setFromObject(deer);
            var r = renderer.domElement.getBoundingClientRect();
            var vv = new THREE.Vector3();
            var minX = 1e9, minY = 1e9, maxX = -1e9, maxY = -1e9;
            [box.min.x, box.max.x].forEach(function (x) {
              [box.min.y, box.max.y].forEach(function (y) {
                [box.min.z, box.max.z].forEach(function (z) {
                  vv.set(x, y, z).project(camera);
                  var px = (vv.x * 0.5 + 0.5) * r.width;
                  var py = (-vv.y * 0.5 + 0.5) * r.height;
                  if (px < minX) minX = px;
                  if (px > maxX) maxX = px;
                  if (py < minY) minY = py;
                  if (py > maxY) maxY = py;
                });
              });
            });
            return { x: minX, y: minY, width: maxX - minX, height: maxY - minY };
          };
          resolve();
        },
        undefined,
        function (err) { reject(err); }
      );
    });
  }

  // ---------- Clips: baked, head and ears only ----------
  function playClip(name, fade) {
    var next = actions[name];
    if (!next) return;
    var prev = state.clip ? actions[state.clip] : null;
    next.reset();
    next.enabled = true;
    next.setEffectiveWeight(1);
    if (name === "Lookout_Idle") {
      next.setLoop(THREE.LoopRepeat);
    } else {
      next.setLoop(THREE.LoopOnce);
      next.clampWhenFinished = true;
    }
    next.fadeIn(fade || 0.5).play();
    if (prev && prev !== next) prev.fadeOut(fade || 0.5);
    state.clip = name;
  }

  var GESTURES = ["Look_Left", "Look_Right", "Ear_Adjust"];
  function scheduleGesture(t) {
    // TW-1152: gestures land every 9 to 15 s (was 13 to 22), so a
    // visitor dwelling on the section sees the head work.
    nextGestureAt = t + 9 + Math.random() * 6;
  }

  // ---------- Stage 3: layout ----------
  function layout() {
    var w = section.clientWidth || window.innerWidth;
    var h = section.clientHeight || window.innerHeight;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    var narrow = camera.aspect < 1.1;
    // The flip: scale.x negative mirrors the composed group, so the
    // crest and high side sit opposite the founder's illustration.
    var s = narrow ? 1.35 : 1.6;
    buckGroup.scale.set(-s, s, s);
    // Three-quarter stance: the pitch of the crest only reads from
    // an angle, never from dead front.
    buckGroup.rotation.y = -0.7;
    // TW-1152: off center, anchored in the right edge third (the
    // mirrored buck gazes toward frame left, across the page), so
    // he stands at the threshold's edge rather than posed in the
    // middle. On narrow screens he eases toward center only as far
    // as the frame forces, rack and head still inside it.
    buckGroup.position.set(narrow ? 0.62 : 1.70, narrow ? -0.82 : -0.66, 0);
    camera.position.set(0.25, narrow ? 0.65 : 0.80, narrow ? 8.4 : 6.6);
    camera.lookAt(LOOK.x, LOOK.y, LOOK.z);
    camera.updateProjectionMatrix();
  }

  // ---------- Stage 4: probe, tiers, governor ----------
  var PR_STEPS = [1.5, 1.25, 1.0];
  var prIndex = 0;
  var govWindow = [];
  var badStreak = 0;

  function applyPR(idx) {
    prIndex = idx;
    var dpr = Math.min(window.devicePixelRatio || 1, PR_STEPS[idx]);
    renderer.setPixelRatio(dpr);
    layout();
  }

  function probe() {
    return new Promise(function (resolve) {
      var frames = [];
      var warmup = 15;
      var needed = 120;
      var last = performance.now();
      var count = 0;
      function step(now) {
        if (state.torn) { resolve(null); return; }
        var dt = now - last;
        last = now;
        if (mixer) mixer.update(Math.min(dt / 1000, 0.05));
        renderer.render(scene3, camera);
        count += 1;
        if (count > warmup) frames.push(dt);
        if (frames.length < needed) {
          requestAnimationFrame(step);
        } else {
          frames.sort(function (a, b) { return a - b; });
          var median = frames[Math.floor(frames.length / 2)];
          var p95 = frames[Math.floor(frames.length * 0.95)];
          resolve({ medianMs: +median.toFixed(2), p95Ms: +p95.toFixed(2), frames: frames.length });
        }
      }
      requestAnimationFrame(step);
    });
  }

  function governor(dtMs) {
    govWindow.push(dtMs);
    if (govWindow.length < 150) return;
    var sum = 0;
    for (var i = 0; i < govWindow.length; i++) sum += govWindow[i];
    var avg = sum / govWindow.length;
    govWindow = [];
    if (avg > 21 && prIndex < PR_STEPS.length - 1) {
      applyPR(prIndex + 1);
      badStreak = 0;
    } else if (avg > 30 && prIndex >= PR_STEPS.length - 1) {
      badStreak += 1;
      if (badStreak >= 2) teardown("governor-floor");
    } else {
      badStreak = 0;
    }
  }

  var camBase = null;
  function mainLoop(now) {
    if (state.torn) return;
    state.raf = requestAnimationFrame(mainLoop);
    if (state.lenis) state.lenis.raf(now);
    if (!sectionVisible && !state.probing) return;
    var dtMs = clock.getDelta() * 1000;
    var dt = Math.min(dtMs / 1000, 0.05);
    var t = clock.elapsedTime;
    if (state.tier === "A" && !REDUCED && camBase) {
      camera.position.x = camBase.x + Math.sin(t * 0.11) * 0.05;
      camera.position.y = camBase.y + Math.sin(t * 0.073 + 1) * 0.03;
      camera.lookAt(LOOK.x, LOOK.y, LOOK.z);
    }
    if (!REDUCED) {
      if (state.clip === "Lookout_Idle" && t > nextGestureAt) {
        playClip(GESTURES[Math.floor(Math.random() * GESTURES.length)], 0.6);
        scheduleGesture(t);
      }
      if (mixer) mixer.update(dt);
    }
    // Guest-module tick hook (the TW-1076 fauna guests retired
    // with TW-1209; no guests register today).
    if (state.tickFns) {
      for (var ti = 0; ti < state.tickFns.length; ti++) state.tickFns[ti](dt, t);
    }
    renderer.render(scene3, camera);
    governor(dtMs);
  }

  // ---------- Boot ----------
  function boot() {
    var fail = (force === "force-a" || force === "force-b") ? null : precheck();
    if (fail) { setTier("C", fail); return; }
    try {
      buildScene();
    } catch (e) {
      teardown("scene-build-failed");
      return;
    }
    layout();
    window.addEventListener("resize", function () {
      layout();
      if (REDUCED && state.tier && state.tier !== "C") {
        renderer.render(scene3, camera);
      }
    });

    loadBuck().then(function () {
      if (state.torn) return;
      layout();
      playClip("Lookout_Idle", 0);
      if (REDUCED && mixer) mixer.update(0); // frame-0 stance, held
      renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
      layout();
      state.probing = true;
      var probePromise = (force === "force-a" || force === "force-b")
        ? Promise.resolve({ medianMs: 0, p95Ms: 0, frames: 0, forced: force })
        : probe();
      probePromise.then(function (res) {
        state.probing = false;
        if (state.torn) return;
        state.probe = res;
        var tier;
        if (force === "force-a") tier = "A";
        else if (force === "force-b") tier = "B";
        else if (res && res.p95Ms <= 22) tier = "A";
        else if (res && res.p95Ms <= 34) tier = "B";
        else { teardown("probe-too-slow"); return; }
        setTier(tier, force ? "qa-override" : "probe");
        prIndex = tier === "A" ? 0 : 1;
        // gl-on grows the section (30vh divider to 96vh stage), so
        // the class goes on BEFORE the final layout: layout reads
        // clientHeight, and a stale short read would stretch the
        // drawing buffer across the tall CSS box.
        section.classList.add("gl-on");
        applyPR(prIndex);
        requestAnimationFrame(function () { layout(); });
        camBase = camera.position.clone();

        if (!REDUCED) {
          try {
            state.lenis = new Lenis({ duration: 1.15, smoothWheel: true });
          } catch (e) {
            state.lenis = null;
          }
        }
        if (mixer) {
          mixer.addEventListener("finished", function (e) {
            if (e.action !== actions["Lookout_Idle"]) {
              playClip("Lookout_Idle", 0.6);
            }
          });
        }
        requestAnimationFrame(mainLoop);

        // Publish the live scene for guest modules. (The TW-1076
        // fauna guests that built into this scene retired with
        // TW-1209; the fauna now keep their own habitats in
        // gl/scatter.js.)
        state.scene = scene3;
        state.camera = camera;
        window.dispatchEvent(new CustomEvent("lgcy-buck-ready"));

        // Arrival at the threshold: the buck notices you, once,
        // with a look to the side. Head only, per the law.
        if ("IntersectionObserver" in window) {
          var io = new IntersectionObserver(function (entries) {
            entries.forEach(function (en) {
              sectionVisible = en.isIntersecting;
              if (en.isIntersecting && !arrivalDone && !REDUCED) {
                arrivalDone = true;
                if (state.clip === "Lookout_Idle") {
                  playClip(Math.random() < 0.5 ? "Look_Left" : "Look_Right", 0.6);
                  scheduleGesture(clock.elapsedTime);
                }
              }
            });
          }, { threshold: 0.22, rootMargin: "30% 0px 30% 0px" });
          io.observe(section);
        } else {
          sectionVisible = true;
        }
      });
    }).catch(function () {
      teardown("glb-load-failed");
    });
  }

  if (document.readyState === "complete") boot();
  else window.addEventListener("load", boot);
})();
