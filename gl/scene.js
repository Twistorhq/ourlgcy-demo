// Our LGCY v4, slice 1 (TW-1012): the WebGL layer at the base of the
// tree. Vanilla three.js + Lenis + maath damping, layered UNDER the
// hand-built v3 site. The DOM journey stays authoritative; this module
// only adds a canvas inside the base section and a real animated deer.
//
// Fail-closed contract: any failure at any stage (no WebGL2, software
// renderer, slow probe, lost context, asset error) tears the layer
// down and leaves the v3 page exactly as it was. The probe runs after
// first paint; v3 paints first, in full, every time.
//
// Probe design (thresholds also recorded in qa/QA-NOTE.md):
//   Pre-checks: WebGL2 context, non-software renderer string,
//   hardwareConcurrency >= 2 when exposed, deviceMemory >= 1 when
//   exposed, no save-data. Any failure is Tier C with a reason.
//   Live probe: the real scene rendered for 120 measured frames
//   (15 warmup frames discarded) at pixel ratio min(dpr, 1.5).
//   Tier A when p95 frame time <= 22ms, Tier B when <= 34ms,
//   otherwise Tier C. A runtime governor steps the pixel ratio down
//   under sustained load and tears down to Tier C if the floor
//   cannot hold 30ms, so minute ten is as smooth as minute one.
// QA overrides: ?gl=force-a, ?gl=force-b, ?gl=off (test hooks only).

import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { MeshoptDecoder } from "three/addons/libs/meshopt_decoder.module.js";
import Lenis from "./vendor/lenis.mjs";
import { damp, dampE } from "./vendor/maath-easing.js";

(function () {
  "use strict";

  var REDUCED = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var section = document.getElementById("gen-7");
  var deerBtn = document.querySelector(".critter-deer");
  if (!section) return;

  var params = new URLSearchParams(window.location.search);
  var force = params.get("gl"); // force-a | force-b | off | null

  var state = {
    tier: null,
    reason: "",
    probe: null,
    torn: false,
    lenis: null,
    raf: 0,
    alertCount: 0
  };
  window.__lgcyGL = state;

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
      console.info("[lgcy-gl] tier C:", reason);
    }
  }
  state.teardown = teardown;

  if (force === "off") { setTier("C", "qa-override-off"); return; }

  // ---------- Stage 1: pre-checks ----------
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
  var LOOK = { x: 0.35, y: 0.74, z: 0 };
  var renderer, scene3, camera, mixer, deer, bones = {}, actions = {};
  var clock = new THREE.Clock();
  var gazeCur = new THREE.Euler(0, 0, 0, "YXZ");
  var gazeTgt = new THREE.Euler(0, 0, 0, "YXZ");
  var gazeTimer = 2.5;
  var perk = { value: 0 };
  var ears = {
    L: { angle: 0, vel: 0, timer: 1.8 },
    R: { angle: 0, vel: 0, timer: 3.1 }
  };
  var mode = "graze"; // graze | dwell | alert
  var modeTimer = 4;
  var currentBase = null; // name of the clip currently carrying the body
  var baseVisible = false;
  var lastAlertAt = -100;

  var GRAZE_CLIPS = ["Eating", "Idle_Headlow"];

  function makeRadialTexture(inner, outer) {
    var cv = document.createElement("canvas");
    cv.width = cv.height = 256;
    var ctx = cv.getContext("2d");
    var g = ctx.createRadialGradient(128, 128, 10, 128, 128, 128);
    g.addColorStop(0, inner);
    g.addColorStop(1, outer);
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, 256, 256);
    var tex = new THREE.CanvasTexture(cv);
    return tex;
  }

  function buildScene() {
    renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true,
      powerPreference: "high-performance"
    });
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.06;
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
    scene3.fog = new THREE.Fog(0x241a10, 10, 22);

    camera = new THREE.PerspectiveCamera(38, 1, 0.1, 60);
    camera.position.set(0, 1.38, 7.6);
    camera.lookAt(LOOK.x, LOOK.y, LOOK.z);

    var hemi = new THREE.HemisphereLight(0xe6d3a7, 0x33261a, 0.9);
    scene3.add(hemi);
    var sun = new THREE.DirectionalLight(0xffc98a, 1.35);
    sun.position.set(-4.5, 6, 3.5);
    scene3.add(sun);
    var rim = new THREE.DirectionalLight(0x93a7c4, 0.4);
    rim.position.set(5, 3, -2.5);
    scene3.add(rim);
    var face = new THREE.DirectionalLight(0xffe2b0, 0.35);
    face.position.set(0.5, 2.2, 8);
    scene3.add(face);

    // The clearing: a mottled forest-floor disc whose rim dissolves
    // in speckles (leaf litter, not a geometry edge), so the 3D
    // patch reads as a place in the photo, not a sticker on it.
    var groundCv = document.createElement("canvas");
    groundCv.width = groundCv.height = 512;
    var gtx = groundCv.getContext("2d");
    gtx.fillStyle = "#3a2d1b";
    gtx.fillRect(0, 0, 512, 512);
    var earthTones = ["#2f2415", "#46351e", "#4d3d22", "#39412a", "#54432a", "#2c3520"];
    for (var gi = 0; gi < 5200; gi++) {
      gtx.fillStyle = earthTones[gi % earthTones.length];
      gtx.globalAlpha = 0.16 + Math.random() * 0.3;
      var gx = Math.random() * 512, gy = Math.random() * 512;
      gtx.beginPath();
      gtx.ellipse(gx, gy, 2 + Math.random() * 9, 1 + Math.random() * 5, Math.random() * 3, 0, 7);
      gtx.fill();
    }
    gtx.globalAlpha = 1;
    var groundTex = new THREE.CanvasTexture(groundCv);
    groundTex.colorSpace = THREE.SRGBColorSpace;

    var alphaCv = document.createElement("canvas");
    alphaCv.width = alphaCv.height = 512;
    var atx = alphaCv.getContext("2d");
    // Radial fade with a heavy speckle ring: the dell's rim breaks
    // up into litter-sized holes instead of tracing a circle.
    var ag = atx.createRadialGradient(256, 256, 20, 256, 256, 256);
    ag.addColorStop(0, "rgb(255,255,255)");
    ag.addColorStop(0.55, "rgb(255,255,255)");
    ag.addColorStop(0.85, "rgb(120,120,120)");
    ag.addColorStop(1, "rgb(0,0,0)");
    atx.fillStyle = ag;
    atx.fillRect(0, 0, 512, 512);
    atx.globalCompositeOperation = "destination-out";
    for (var ai = 0; ai < 1200; ai++) {
      var aang = Math.random() * Math.PI * 2;
      var arad = 130 + Math.random() * 128;
      atx.fillStyle = "rgba(0,0,0," + (0.05 + Math.random() * 0.3).toFixed(2) + ")";
      atx.beginPath();
      atx.ellipse(256 + Math.cos(aang) * arad, 256 + Math.sin(aang) * arad,
        3 + Math.random() * 13, 2 + Math.random() * 8, aang, 0, 7);
      atx.fill();
    }
    atx.globalCompositeOperation = "source-over";

    // The dell: a small pool of earth local to the deer, grouped so
    // layout() seats the whole clearing on the anchor point. A full
    // floor fought the photograph (documented in the QA note); a
    // dell reads as shade and litter pooled at the roots, the same
    // feathered vignette the v3 photograph used.
    state.dell = new THREE.Group();
    scene3.add(state.dell);
    var ground = new THREE.Mesh(
      new THREE.CircleGeometry(2.6, 40),
      new THREE.MeshStandardMaterial({
        map: groundTex,
        color: 0x8f8578,
        roughness: 1,
        metalness: 0,
        transparent: true,
        alphaMap: new THREE.CanvasTexture(alphaCv),
        depthWrite: false
      })
    );
    ground.rotation.x = -Math.PI / 2;
    ground.position.set(-0.3, 0, 0.35);
    state.dell.add(ground);

    // Leaf litter and stones inside the dell: one instanced draw,
    // dusk tones.
    var litterGeo = new THREE.DodecahedronGeometry(0.055, 0);
    var litterMat = new THREE.MeshStandardMaterial({ roughness: 1 });
    var litter = new THREE.InstancedMesh(litterGeo, litterMat, 42);
    var dummy = new THREE.Object3D();
    var col = new THREE.Color();
    var tones = [0x4a3a22, 0x39412a, 0x5a462a, 0x2f3823, 0x51402a];
    for (var i = 0; i < 42; i++) {
      var r = Math.random() * 2.2;
      var a = Math.random() * Math.PI * 2;
      dummy.position.set(Math.cos(a) * r - 0.3, 0.02, Math.sin(a) * r * 0.8 + 0.3);
      dummy.rotation.set(Math.random() * 3, Math.random() * 3, Math.random() * 3);
      var s = 0.5 + Math.random() * 1.3;
      dummy.scale.set(s, s * 0.38, s);
      dummy.updateMatrix();
      litter.setMatrixAt(i, dummy.matrix);
      litter.setColorAt(i, col.setHex(tones[i % tones.length]));
    }
    state.dell.add(litter);

    // Bushes at the dell's back rim and one fallen log: flat-shaded,
    // desaturated, the same low-poly grammar as the deer.
    var bushMat = new THREE.MeshStandardMaterial({
      color: 0x3d4a2e, roughness: 1, flatShading: true
    });
    [[-1.9, 0.24, -1.2, 0.55], [1.8, 0.28, -1.5, 0.68], [2.4, 0.2, -0.6, 0.45]].forEach(function (b) {
      var bush = new THREE.Mesh(new THREE.IcosahedronGeometry(b[3], 1), bushMat);
      bush.position.set(b[0], b[1], b[2]);
      bush.scale.y = 0.8;
      state.dell.add(bush);
    });
    var log = new THREE.Mesh(
      new THREE.CylinderGeometry(0.06, 0.08, 1.5, 7),
      new THREE.MeshStandardMaterial({ color: 0x4a3823, roughness: 1, flatShading: true })
    );
    log.rotation.z = Math.PI / 2;
    log.rotation.y = 0.5;
    log.position.set(-1.5, 0.07, 0.95);
    state.dell.add(log);
  }

  function findBone(rootObj, names) {
    var found = null;
    rootObj.traverse(function (o) {
      if (found) return;
      if (o.isBone && names.indexOf(o.name) >= 0) found = o;
    });
    return found;
  }

  function playBase(name, fade) {
    var next = actions[name];
    if (!next || name === currentBase) return;
    var prev = currentBase ? actions[currentBase] : null;
    next.reset().setLoop(THREE.LoopRepeat, Infinity).fadeIn(fade || 0.5).play();
    if (prev) prev.fadeOut(fade || 0.5);
    currentBase = name;
  }

  function loadDeer() {
    return new Promise(function (resolve, reject) {
      var loader = new GLTFLoader();
      loader.setMeshoptDecoder(MeshoptDecoder);
      var timer = setTimeout(function () { reject(new Error("glb-timeout")); }, 12000);
      loader.load(
        "gl/deer.glb",
        function (gltf) {
          clearTimeout(timer);
          deer = gltf.scene;
          // Normalize: origin already at the hooves; scale by height.
          // layout() owns the final scale (it is aspect-dependent).
          var box = new THREE.Box3().setFromObject(deer);
          var h = box.max.y - box.min.y;
          state.deerRawH = h;
          deer.scale.setScalar(1.75 / h);
          deer.rotation.y = -0.85; // three-quarter turn toward the visitor
          scene3.add(deer);

          // Contact shadow: a soft blob in world space that grounds
          // the animal; positioned under the hooves in layout().
          state.shadow = new THREE.Mesh(
            new THREE.CircleGeometry(0.78, 32),
            new THREE.MeshBasicMaterial({
              transparent: true,
              alphaMap: makeRadialTexture("rgba(0,0,0,0.9)", "rgba(0,0,0,0)"),
              color: 0x000000,
              opacity: 0.52,
              depthWrite: false
            })
          );
          state.shadow.rotation.x = -Math.PI / 2;
          state.shadow.rotation.z = 0.55;
          state.shadow.scale.set(0.66, 1.08, 1);
          state.shadow.position.set(0, 0.012, 0.08);
          state.dell.add(state.shadow);

          // Earth patch: a darker bed of ground directly under the
          // animal so its hooves meet soil, not photograph.
          state.patch = new THREE.Mesh(
            new THREE.CircleGeometry(1.55, 32),
            new THREE.MeshBasicMaterial({
              transparent: true,
              alphaMap: makeRadialTexture("rgba(0,0,0,0.62)", "rgba(0,0,0,0)"),
              color: 0x20180e,
              opacity: 0.85,
              depthWrite: false
            })
          );
          state.patch.rotation.x = -Math.PI / 2;
          state.patch.position.set(0, 0.006, 0.05);
          state.dell.add(state.patch);

          mixer = new THREE.AnimationMixer(deer);
          gltf.animations.forEach(function (clip) {
            actions[clip.name] = mixer.clipAction(clip);
          });
          state.clips = gltf.animations.map(function (c) { return c.name; });

          bones.head = findBone(deer, ["Head"]);
          bones.neck = findBone(deer, ["Neck3", "Neck2", "Neck1"]);
          // three.js sanitizes node names on load: "Ear1.L" arrives
          // as "Ear1L". Both spellings are listed so the lookup holds
          // across loader versions.
          bones.earL = findBone(deer, ["Ear1L", "Ear1.L"]);
          bones.earR = findBone(deer, ["Ear1R", "Ear1.R"]);
          bones.torso = findBone(deer, ["Torso2", "Torso3", "Torso"]);
          bones.tail = findBone(deer, ["Tail1"]);
          state.bones = {
            head: !!bones.head, neck: !!bones.neck,
            earL: !!bones.earL, earR: !!bones.earR,
            torso: !!bones.torso, tail: !!bones.tail
          };
          playBase(REDUCED ? "Idle" : "Idle_Headlow", 0.1);
          // QA hook: the deer's projected box in canvas CSS pixels,
          // so placement can be verified numerically at any viewport.
          state.deerRect = function () {
            var box = new THREE.Box3().setFromObject(deer);
            var r = renderer.domElement.getBoundingClientRect();
            var v = new THREE.Vector3();
            var minX = 1e9, minY = 1e9, maxX = -1e9, maxY = -1e9;
            [box.min.x, box.max.x].forEach(function (x) {
              [box.min.y, box.max.y].forEach(function (y) {
                [box.min.z, box.max.z].forEach(function (z) {
                  v.set(x, y, z).project(camera);
                  var px = (v.x * 0.5 + 0.5) * r.width;
                  var py = (-v.y * 0.5 + 0.5) * r.height;
                  if (px < minX) minX = px;
                  if (px > maxX) maxX = px;
                  if (py < minY) minY = py;
                  if (py > maxY) maxY = py;
                });
              });
            });
            return {
              canvasW: Math.round(r.width), canvasH: Math.round(r.height),
              x: Math.round(minX), y: Math.round(minY),
              w: Math.round(maxX - minX), h: Math.round(maxY - minY)
            };
          };
          resolve();
        },
        undefined,
        function (err) { clearTimeout(timer); reject(err); }
      );
    });
  }

  // ---------- Stage 3: placement ----------
  function layout() {
    var w = section.clientWidth || window.innerWidth;
    var h = section.clientHeight || window.innerHeight;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    if (!deer) return;
    // Anchor the deer by screen fraction: cast a ray through an NDC
    // point onto the ground plane; hooves land there at any aspect,
    // right of center and low in the frame, where the v3 photograph
    // stood. On narrow canvases the deer stands smaller and lower,
    // in the corner the photograph occupied, and the dell shrinks
    // with it (the dropzone card fills most of a phone's width, so
    // the clearing must not sprawl).
    var narrow = camera.aspect < 1.1;
    if (state.deerRawH) {
      deer.scale.setScalar((narrow ? 1.45 : 1.75) / state.deerRawH);
    }
    if (state.dell) state.dell.scale.setScalar(narrow ? 0.45 : 1);
    var ndc = new THREE.Vector2(narrow ? 0.74 : 0.70, narrow ? -0.88 : -0.82);
    var ray = new THREE.Raycaster();
    ray.setFromCamera(ndc, camera);
    var t = -ray.ray.origin.y / ray.ray.direction.y;
    var p = ray.ray.origin.clone().add(ray.ray.direction.clone().multiplyScalar(t));
    deer.position.set(p.x, 0, p.z);
    if (state.dell) {
      // On narrow canvases the dell also shifts toward the camera
      // and the frame edge, so its disc pools at the deer's feet
      // instead of climbing the dropzone card.
      var dx = narrow ? 0.3 : 0;
      var dz = narrow ? 0.6 : 0;
      state.dell.position.set(p.x + dx, 0, p.z + dz);
      // The contact shadow and earth patch belong to the hooves,
      // not the dell: counter the dell's shift (and its scale) so
      // they stay under the animal.
      var inv = narrow ? 1 / 0.45 : 1;
      if (state.shadow) {
        state.shadow.position.set(-dx * inv, 0.012, -dz * inv + 0.08);
        state.shadow.scale.set(0.66 * inv, 1.08 * inv, 1);
      }
      if (state.patch) {
        state.patch.position.set(-dx * inv, 0.006, -dz * inv + 0.05);
      }
    }
  }

  // ---------- Stage 4: the deer performance ----------
  var scratchQ = new THREE.Quaternion();
  var procQ = new THREE.Quaternion();
  var procE = new THREE.Euler(0, 0, 0, "YXZ");

  function springStep(st, dt, k, zeta) {
    // Semi-implicit Euler on the damped harmonic oscillator; zeta
    // below 1 overshoots, which is what an ear wants.
    var c = 2 * zeta * Math.sqrt(k);
    var acc = -k * st.angle - c * st.vel;
    st.vel += acc * dt;
    st.angle += st.vel * dt;
  }

  function pickGrazeGaze() {
    gazeTgt.set(
      0.10 + Math.random() * 0.08,      // pitch: slight downward bias
      (Math.random() * 2 - 1) * 0.14,  // yaw: small checks left/right
      0, "YXZ"
    );
    gazeTimer = 2.5 + Math.random() * 3.5;
  }

  var alertProgram = null;
  function startAlert(now) {
    state.alertCount += 1;
    lastAlertAt = now;
    if (REDUCED) { playBase("Idle", 0.4); return; }
    mode = "alert";
    modeTimer = 2.6;
    playBase("Idle", 0.45);
    // The gaze sweep: left, right, then to the visitor. Theatre of
    // the saccade: discrete targets, damped arrival, stillness
    // between. Times in seconds from alert start.
    alertProgram = [
      { t: 0.0, yaw: -0.55, pitch: -0.02 },
      { t: 0.75, yaw: 0.50, pitch: 0.0 },
      { t: 1.5, yaw: 0.04, pitch: -0.06 },
      { t: 2.6, yaw: 0.0, pitch: 0.05 }
    ];
    ears.L.vel += 5.5;
    ears.R.vel += 5.0;
  }
  state.alert = function () { startAlert(clock.elapsedTime); };
  state.setGaze = function (yaw, pitch) { gazeTgt.set(pitch, yaw, 0, "YXZ"); };

  function updateDeer(dt, t) {
    if (!mixer) return;
    mixer.update(dt);

    if (REDUCED) {
      // Calm idle only: the Idle clip carries the body, breathing
      // carries the life. No mode cycling, no gaze, no flicks.
      if (bones.torso) {
        var brR = Math.sin(t * Math.PI * 2 * 0.24) * 0.006;
        scratchQ.copy(bones.torso.quaternion);
        procE.set(brR, 0, 0, "YXZ");
        procQ.setFromEuler(procE);
        bones.torso.quaternion.copy(scratchQ).multiply(procQ);
      }
      return;
    }

    // Mode machine
    modeTimer -= dt;
    if (mode === "graze" && modeTimer <= 0) {
      // Alternate graze clips; dwell on Idle briefly between bouts.
      var next = currentBase === "Eating" ? "Idle_Headlow" : "Eating";
      if (Math.random() < 0.3) {
        playBase("Idle", 0.6);
        mode = "dwell";
        modeTimer = 1.4 + Math.random() * 1.6;
      } else {
        playBase(next, 0.7);
        modeTimer = 5 + Math.random() * 4.5;
      }
    } else if (mode === "dwell" && modeTimer <= 0) {
      playBase(Math.random() < 0.5 ? "Eating" : "Idle_Headlow", 0.7);
      mode = "graze";
      modeTimer = 5 + Math.random() * 4.5;
    } else if (mode === "alert" && modeTimer <= 0) {
      mode = "dwell";
      modeTimer = 1.6;
      playBase("Idle", 0.5);
      pickGrazeGaze();
    }

    // Gaze program during alert
    if (mode === "alert" && alertProgram) {
      var elapsed = 2.6 - modeTimer;
      for (var i = alertProgram.length - 1; i >= 0; i--) {
        if (elapsed >= alertProgram[i].t) {
          gazeTgt.set(alertProgram[i].pitch, alertProgram[i].yaw, 0, "YXZ");
          break;
        }
      }
    } else if (!REDUCED) {
      gazeTimer -= dt;
      if (gazeTimer <= 0 && mode !== "alert") pickGrazeGaze();
    }

    // Damped chase: critically damped in feel (maath exp form),
    // frame-rate independent at 30, 60, or 120 Hz.
    dampE(gazeCur, gazeTgt, REDUCED ? 0.3 : 0.16, dt);
    var px = REDUCED ? 0 : 1;
    damp(perk, "value", mode === "alert" ? px : 0, 0.14, dt);

    // Apply the procedural layer over the clip, bone by bone.
    if (bones.head) {
      scratchQ.copy(bones.head.quaternion);
      procE.set(gazeCur.x, gazeCur.y, gazeCur.z, "YXZ");
      procQ.setFromEuler(procE);
      bones.head.quaternion.copy(scratchQ).multiply(procQ);
    }
    if (bones.neck) {
      scratchQ.copy(bones.neck.quaternion);
      procE.set(gazeCur.x * 0.35, gazeCur.y * 0.35, 0, "YXZ");
      procQ.setFromEuler(procE);
      bones.neck.quaternion.copy(scratchQ).multiply(procQ);
    }
    // Ears: spring flicks on the first ear segment, plus a perk
    // offset while alert. Reduced motion: springs rest.
    [["earL", "L"], ["earR", "R"]].forEach(function (pair) {
      var bone = bones[pair[0]];
      var st = ears[pair[1]];
      if (!bone) return;
      if (!REDUCED) {
        st.timer -= dt;
        if (st.timer <= 0) {
          st.vel += 4 + Math.random() * 4;
          st.timer = 2.2 + Math.random() * 4.5;
        }
        springStep(st, dt, 120, 0.55);
      }
      scratchQ.copy(bone.quaternion);
      procE.set(0, 0, st.angle * 0.55 - perk.value * 0.18, "YXZ");
      procQ.setFromEuler(procE);
      bone.quaternion.copy(scratchQ).multiply(procQ);
    });
    // Breathing: two summed sines near 0.24 Hz on the mid torso.
    if (bones.torso) {
      var amp = REDUCED ? 0.006 : 0.013;
      var br = Math.sin(t * Math.PI * 2 * 0.24) * amp +
               Math.sin(t * Math.PI * 2 * 0.37 + 1.3) * amp * 0.45;
      scratchQ.copy(bones.torso.quaternion);
      procE.set(br, 0, 0, "YXZ");
      procQ.setFromEuler(procE);
      bones.torso.quaternion.copy(scratchQ).multiply(procQ);
    }
    // Tail: a slow, lagged sway; a swish when the alert fires.
    if (bones.tail && !REDUCED) {
      var sway = Math.sin(t * Math.PI * 2 * 0.45) * 0.10 +
                 Math.sin(t * Math.PI * 2 * 0.9 + 0.7) * 0.04;
      scratchQ.copy(bones.tail.quaternion);
      procE.set(0, sway, 0, "YXZ");
      procQ.setFromEuler(procE);
      bones.tail.quaternion.copy(scratchQ).multiply(procQ);
    }
  }

  // ---------- Stage 5: probe, tiers, governor ----------
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
        var dtc = Math.min(dt / 1000, 0.05);
        updateDeer(dtc, now / 1000);
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
    if (!baseVisible && !state.probing) return;
    var dtMs = clock.getDelta() * 1000;
    var dt = Math.min(dtMs / 1000, 0.05);
    var t = clock.elapsedTime;
    if (state.tier === "A" && !REDUCED) {
      camera.position.x = camBase.x + Math.sin(t * 0.11) * 0.05;
      camera.position.y = camBase.y + Math.sin(t * 0.073 + 1) * 0.03;
      camera.lookAt(LOOK.x, LOOK.y, LOOK.z);
    }
    updateDeer(dt, t);
    renderer.render(scene3, camera);
    governor(dtMs);
  }

  // ---------- Boot ----------
  function boot() {
    // QA overrides skip the gate entirely; production traffic (no
    // parameter) always runs the full precheck and probe.
    var fail = (force === "force-a" || force === "force-b") ? null : precheck();
    if (fail) { setTier("C", fail); return; }
    try {
      buildScene();
    } catch (e) {
      teardown("scene-build-failed");
      return;
    }
    camBase = camera.position.clone();
    layout();
    window.addEventListener("resize", function () { layout(); });

    loadDeer().then(function () {
      if (state.torn) return;
      layout();
      // The probe renders the true scene, deer included, while the
      // canvas is still invisible. v3 has long since painted.
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
        applyPR(prIndex);
        section.classList.add("gl-on");

        // The deer photo steps aside; its button stays as the
        // keyboard and pointer target (app.js performs through it).
        // WebGL in Tier A/B only, and never under reduced motion.
        if (!REDUCED) {
          try {
            state.lenis = new Lenis({ duration: 1.15, smoothWheel: true });
          } catch (e) {
            state.lenis = null; // native scroll remains authoritative
          }
        }
        requestAnimationFrame(mainLoop);

        // Arrival at the base: the deer notices you.
        if ("IntersectionObserver" in window) {
          var io = new IntersectionObserver(function (entries) {
            entries.forEach(function (en) {
              baseVisible = en.isIntersecting;
              if (en.isIntersecting && clock.elapsedTime - lastAlertAt > 20) {
                startAlert(clock.elapsedTime);
              }
            });
          }, { threshold: 0.22, rootMargin: "30% 0px 30% 0px" });
          io.observe(section);
        } else {
          baseVisible = true;
        }

        // The v3 perform hook is the class: app.js adds .alert to
        // the deer button on hover, tap, and focus. Mirror it here.
        if (deerBtn && "MutationObserver" in window) {
          var mo = new MutationObserver(function () {
            if (deerBtn.classList.contains("alert")) {
              startAlert(clock.elapsedTime);
            }
          });
          mo.observe(deerBtn, { attributes: true, attributeFilter: ["class"] });
        }
      });
    }).catch(function () {
      teardown("glb-load-failed");
    });
  }

  if (document.readyState === "complete") boot();
  else window.addEventListener("load", boot);
})();
