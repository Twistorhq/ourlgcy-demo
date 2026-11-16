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

  function buildRock() {
    var geo = new THREE.IcosahedronGeometry(1, 3);
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
              Math.sin(v.y * 9.1 + v.z * 4.3) * 0.020;
      v.multiplyScalar(1 + n);
      // The camera-facing face drops steeply (the founder's ~45
      // degrees lives in the rock, per Rosa's Phase B note N2; the
      // rig's fitted 15-degree contact plane is untouched).
      if (v.z > 0.45) v.y -= (v.z - 0.45) * 0.95;
      if (v.y < -0.30) v.y = -0.30 + (v.y + 0.30) * 0.25; // flattened base
      pos.setXYZ(i, v.x, v.y, v.z);
    }
    geo.translate(0, -0.60, -0.18);
    // Flatten the crest facet onto the stance plane in the contact
    // zone, a hair below the soles, so the hooves own the contact.
    for (i = 0; i < pos.count; i++) {
      v.fromBufferAttribute(pos, i);
      if (Math.abs(v.x) < 0.52 && v.z > -0.80 && v.z < 0.34) {
        var cap = stancePlaneY(v.z) - 0.012;
        if (v.y > cap) pos.setY(i, cap);
      }
    }
    geo.computeVertexNormals();
    var mat = new THREE.MeshStandardMaterial({
      color: 0x6b5c47,
      roughness: 0.96,
      metalness: 0.0,
      flatShading: true
    });
    var rock = new THREE.Mesh(geo, mat);
    return rock;
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
    buckGroup.add(buildShadow());
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
