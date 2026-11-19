// Our LGCY, TW-1076: the woodland fauna of the threshold scene.
// First resident: the eastern gray squirrel, converted from the
// Grab3D red squirrel (CC0) by mesh and texture correction in
// tools/fauna/build_squirrel_rig.py, seated on a mossy branch at
// frame left with its acorn, under the same light as the buck.
//
// This module is a guest in the buck's layer (gl/buck.js): it
// builds nothing until the buck has earned its tier and announced
// itself, it renders inside the buck's loop on the buck's canvas,
// and it dies with the buck's teardown. The fail-closed contract
// therefore covers the fauna unchanged: no buck layer, no fauna,
// and the v3 page stands untouched either way. If the squirrel
// asset itself fails to load, the branch stays empty and the buck
// scene is unaffected.
//
// Blend law (founder, 2026-11-16): the animals live in the tree.
// Shared scene light (the buck's hemi, sun, rim, and face recipe),
// a real contact shadow where the animal meets the branch, moss
// and leaf occlusion at the perch, and the section's feathered
// canvas mask do the blending; no cutout edges anywhere.
//
// Motion law: baked clips only, species-true and quiet. The
// squirrel breathes, its tail sways on the measured pendulum
// period, it freezes statue-still the way squirrels do, and now
// and then it nibbles its acorn or snaps a look to the side.
// Nothing here moves the buck's channels or upstages him.
//
// Species status (each gated separately, TW-1076): all four
// residents ship. The squirrel is converted from the Grab3D red
// squirrel. Under the founder's mandate change (2026-11-16,
// 15:54 MST: every slot ships, species exactness yields to the
// best clean-license animal, credited truthfully), the owl slot
// ships Grab3D's great horned owl as itself, and the jay and
// woodpecker slots ship conversions of Grab3D's songbird (a
// European robin) repainted toward the reference markings. The
// sourcing record is qa/tw1076-sourcing/SOURCING.md; the
// per-species packs state plainly what each animal is.

import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";

(function () {
  "use strict";

  var REDUCED = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  window.addEventListener("lgcy-buck-ready", init, { once: true });

  function barkTexture() {
    var c = document.createElement("canvas");
    c.width = 256; c.height = 512;
    var g = c.getContext("2d");
    g.fillStyle = "#4a3826";
    g.fillRect(0, 0, 256, 512);
    for (var i = 0; i < 900; i++) {
      var x = Math.random() * 256, y = Math.random() * 512;
      var len = 20 + Math.random() * 90, wdt = 1 + Math.random() * 3.5;
      var tone = ["#5a4630", "#3a2b1c", "#66543a", "#2e2115", "#75603f"][i % 5];
      g.strokeStyle = tone;
      g.lineWidth = wdt;
      g.beginPath();
      g.moveTo(x, y);
      g.lineTo(x + (Math.random() - 0.5) * 7, y + len);
      g.stroke();
    }
    var tex = new THREE.CanvasTexture(c);
    tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
    tex.colorSpace = THREE.SRGBColorSpace;
    return tex;
  }

  function mossTexture() {
    var c = document.createElement("canvas");
    c.width = 128; c.height = 128;
    var g = c.getContext("2d");
    g.fillStyle = "#44512c";
    g.fillRect(0, 0, 128, 128);
    for (var i = 0; i < 1600; i++) {
      g.fillStyle = ["#55663a", "#39461f", "#687a44", "#2f3a1a", "#7a8c52"][i % 5];
      g.beginPath();
      g.arc(Math.random() * 128, Math.random() * 128, 0.6 + Math.random() * 2.2, 0, 7);
      g.fill();
    }
    var tex = new THREE.CanvasTexture(c);
    tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
    tex.colorSpace = THREE.SRGBColorSpace;
    return tex;
  }

  function leafTexture() {
    var c = document.createElement("canvas");
    c.width = 256; c.height = 256;
    var g = c.getContext("2d");
    g.clearRect(0, 0, 256, 256);
    for (var i = 0; i < 26; i++) {
      var x = 30 + Math.random() * 196, y = 30 + Math.random() * 196;
      var s = 13 + Math.random() * 20, a = Math.random() * Math.PI;
      g.save();
      g.translate(x, y);
      g.rotate(a);
      g.fillStyle = ["#5d7038", "#4c602e", "#6d8143", "#42552a"][i % 4];
      g.beginPath();
      // simple lobed oak-leaf silhouette: ellipse with side bumps
      g.ellipse(0, 0, s * 0.42, s, 0, 0, 7);
      g.fill();
      g.beginPath();
      g.ellipse(-s * 0.3, -s * 0.2, s * 0.24, s * 0.4, 0.5, 0, 7);
      g.ellipse(s * 0.3, -s * 0.2, s * 0.24, s * 0.4, -0.5, 0, 7);
      g.ellipse(-s * 0.28, s * 0.3, s * 0.22, s * 0.36, -0.5, 0, 7);
      g.ellipse(s * 0.28, s * 0.3, s * 0.22, s * 0.36, 0.5, 0, 7);
      g.fill();
      g.restore();
    }
    var tex = new THREE.CanvasTexture(c);
    tex.colorSpace = THREE.SRGBColorSpace;
    return tex;
  }

  function shadowTexture() {
    var c = document.createElement("canvas");
    c.width = 128; c.height = 128;
    var g = c.getContext("2d");
    var grad = g.createRadialGradient(64, 64, 4, 64, 64, 62);
    grad.addColorStop(0, "rgba(16,10,4,0.62)");
    grad.addColorStop(0.55, "rgba(16,10,4,0.30)");
    grad.addColorStop(1, "rgba(16,10,4,0)");
    g.fillStyle = grad;
    g.fillRect(0, 0, 128, 128);
    return new THREE.CanvasTexture(c);
  }

  function displace(geo, amp, freq) {
    var pos = geo.attributes.position;
    var v = new THREE.Vector3();
    for (var i = 0; i < pos.count; i++) {
      v.fromBufferAttribute(pos, i);
      var n = Math.sin(v.x * freq + v.y * freq * 1.7) * 0.5
        + Math.sin(v.y * freq * 2.3 + v.z * freq) * 0.35
        + Math.sin(v.z * freq * 3.1 + v.x * freq * 0.7) * 0.4;
      var r = Math.sqrt(v.x * v.x + v.z * v.z) || 1;
      pos.setXYZ(i, v.x + (v.x / r) * n * amp, v.y, v.z + (v.z / r) * n * amp);
    }
    geo.computeVertexNormals();
    return geo;
  }

  function init() {
    var buck = window.__lgcyBuck;
    if (!buck || buck.torn || !buck.scene || !buck.camera) return;
    var scene = buck.scene;
    var fauna = new THREE.Group();
    fauna.name = "fauna";
    scene.add(fauna);

    var bark = barkTexture();
    var moss = mossTexture();

    // ---- the perch: a displaced-geometry trunk at frame left and
    // a mossy branch reaching toward the buck. Authored set, not
    // wildlife: it carries no species claim and exists so the
    // animals meet real wood with real contact shadow. Limbs are
    // built between two points so the branch can droop the way
    // oak limbs do instead of floating level.
    function limb(from, to, r0, r1, mat) {
      var a = new THREE.Vector3(from[0], from[1], from[2]);
      var b = new THREE.Vector3(to[0], to[1], to[2]);
      var dir = b.clone().sub(a);
      var len = dir.length();
      var geo = displace(new THREE.CylinderGeometry(r1, r0, len, 12, 6), 0.012, 9.0);
      var mesh = new THREE.Mesh(geo, mat);
      mesh.position.copy(a).add(b).multiplyScalar(0.5);
      mesh.quaternion.setFromUnitVectors(
        new THREE.Vector3(0, 1, 0), dir.normalize()
      );
      return mesh;
    }
    var trunkMat = new THREE.MeshStandardMaterial({
      map: bark, roughness: 0.95, color: 0xcbb694
    });
    var trunkGeo = displace(
      new THREE.CylinderGeometry(0.38, 0.56, 3.8, 14, 8), 0.04, 6.0
    );
    var trunk = new THREE.Mesh(trunkGeo, trunkMat);
    // TW-1076 merge-readiness (Rosa N2): the whole trunk cluster
    // (trunk, hollow, owl, woodpecker) sits 0.16 right of its
    // first staging, so the owl hollow clears the frame edge at
    // both widths on the TW-1152 composition; the branch root
    // stays embedded in the trunk at the new center.
    trunk.position.set(-2.72, 0.66, 0.0);
    trunk.rotation.z = 0.05;
    fauna.add(trunk);

    var branchMat = new THREE.MeshStandardMaterial({
      map: bark, roughness: 0.95, color: 0xd8c6a8
    });
    // main limb: out of the trunk, drooping toward frame center
    fauna.add(limb([-2.62, 1.02, 0.30], [-0.78, 0.60, 0.66], 0.115, 0.045, branchMat));
    // rising fork the squirrel sits beside
    fauna.add(limb([-1.72, 0.86, 0.55], [-1.28, 1.30, 0.74], 0.05, 0.02, branchMat));
    // short broken stub below the main limb
    fauna.add(limb([-2.30, 0.78, 0.42], [-1.94, 0.60, 0.55], 0.045, 0.028, branchMat));

    var mossMat = new THREE.MeshStandardMaterial({
      map: moss, roughness: 1.0, color: 0x8a9478
    });
    // moss rides the top of the main limb, following its droop
    // (positions computed on the limb's own line, z included)
    var mossSpots = [
      [-2.44, 1.06, 0.34, 0.20, 0.05, 0.13],
      [-2.16, 1.00, 0.39, 0.24, 0.05, 0.14],
      [-1.92, 0.95, 0.44, 0.20, 0.045, 0.12],
      [-1.60, 0.87, 0.50, 0.17, 0.04, 0.11],
      [-1.30, 0.80, 0.56, 0.14, 0.035, 0.10],
      [-2.64, 1.62, 0.24, 0.30, 0.14, 0.22],
      [-2.78, -0.30, 0.30, 0.38, 0.20, 0.26]
    ];
    mossSpots.forEach(function (m) {
      var s = new THREE.Mesh(new THREE.SphereGeometry(1, 10, 8), mossMat);
      s.position.set(m[0], m[1], m[2]);
      s.scale.set(m[3], m[4], m[5]);
      fauna.add(s);
    });

    // leaf clusters, lit like everything else (an unlit cluster
    // reads as a paper cutout against the photograph): one
    // overhangs the top-left corner, one sits in front of the
    // branch tip as a near occluder
    var leafMat = new THREE.MeshStandardMaterial({
      map: leafTexture(), transparent: true, alphaTest: 0.4,
      side: THREE.DoubleSide, color: 0x9aa48c, roughness: 1.0
    });
    var clusters = [
      [-2.52, 2.02, 0.85, 1.25, 0.4],
      [-0.70, 0.72, 1.02, 0.55, -0.5]
    ];
    clusters.forEach(function (cl) {
      var p = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), leafMat);
      p.position.set(cl[0], cl[1], cl[2]);
      p.scale.setScalar(cl[3]);
      p.rotation.y = cl[4];
      fauna.add(p);
    });

    // contact shadow where the squirrel meets the branch
    var shTex = shadowTexture();
    var contact = new THREE.Mesh(
      new THREE.PlaneGeometry(0.62, 0.4),
      new THREE.MeshBasicMaterial({
        map: shTex, transparent: true, depthWrite: false
      })
    );
    contact.position.set(-1.99, 0.958, 0.42);
    contact.rotation.x = -Math.PI / 2 + 0.20;
    contact.rotation.z = 0.25;
    contact.renderOrder = 1;
    fauna.add(contact);

    // ---- the squirrel: seated on the main limb near the trunk
    // (seat point computed on the limb's line: at x -1.99 the limb
    // center is y 0.877, z 0.42, radius about 0.09, so the feet
    // meet wood at y about 0.96), three-quarter toward the buck;
    // an earlier staging faced it away from the camera and it
    // read as a tail with a back, see the pack
    var squirrelGroup = new THREE.Group();
    squirrelGroup.position.set(-1.99, 0.958, 0.42);
    squirrelGroup.rotation.y = -0.55;
    var SQ_SCALE = 1.55;
    squirrelGroup.scale.setScalar(SQ_SCALE);
    fauna.add(squirrelGroup);

    var mixer = null;
    var actions = {};
    var current = null;
    var nextGestureAt = 14 + Math.random() * 8;
    var GESTURES = ["Squirrel_Nibble", "Squirrel_Look"];

    function playClip(name, fade) {
      var next = actions[name];
      if (!next) return;
      var prev = current ? actions[current] : null;
      next.reset();
      next.enabled = true;
      next.setEffectiveWeight(1);
      if (name === "Squirrel_Idle") next.setLoop(THREE.LoopRepeat);
      else {
        next.setLoop(THREE.LoopOnce);
        next.clampWhenFinished = true;
      }
      next.fadeIn(fade || 0.5).play();
      if (prev && prev !== next) prev.fadeOut(fade || 0.5);
      current = name;
    }

    new GLTFLoader().load(
      "gl/animals/squirrel-rigged.glb",
      function (gltf) {
        if (buck.torn) return;
        squirrelGroup.add(gltf.scene);
        mixer = new THREE.AnimationMixer(gltf.scene);
        gltf.animations.forEach(function (clip) {
          actions[clip.name] = mixer.clipAction(clip);
        });
        buck.squirrelRect = function () {
          var box = new THREE.Box3().setFromObject(squirrelGroup);
          var r = buck.renderer.domElement.getBoundingClientRect();
          var vv = new THREE.Vector3();
          var minX = 1e9, minY = 1e9, maxX = -1e9, maxY = -1e9;
          [box.min.x, box.max.x].forEach(function (x) {
            [box.min.y, box.max.y].forEach(function (y) {
              [box.min.z, box.max.z].forEach(function (z) {
                vv.set(x, y, z).project(buck.camera);
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
        playClip("Squirrel_Idle", 0);
        // QA handle (same spirit as the buck's deerRect): lets the
        // evidence harness pose a gesture on demand.
        buck.faunaPlay = function (name) { playClip(name, 0.3); };
        if (REDUCED) {
          mixer.update(0);
          return;
        }
        mixer.addEventListener("finished", function (e) {
          if (e.action !== actions["Squirrel_Idle"]) playClip("Squirrel_Idle", 0.6);
        });
        buck.tickFns = buck.tickFns || [];
        buck.tickFns.push(function (dt, t) {
          if (buck.torn || !mixer) return;
          if (current === "Squirrel_Idle" && t > nextGestureAt) {
            playClip(GESTURES[Math.floor(Math.random() * GESTURES.length)], 0.6);
            nextGestureAt = t + 16 + Math.random() * 10;
          }
          mixer.update(dt);
        });
      },
      undefined,
      function () {
        // the perch stays, the resident does not arrive; the buck
        // scene carries on without it (documented in the pack)
        if (window.console && console.info) {
          console.info("[lgcy-fauna] squirrel asset failed to load");
        }
      }
    );

    // ---- the other three residents (founder mandate, 2026-11-16:
    // every slot ships). One generic loader; per-species staging
    // and gesture tables below. Credits, truthfully: the owl is a
    // great horned owl (Grab3D, CC0) presented as itself; the jay
    // and the woodpecker are conversions of Grab3D's songbird
    // (a European robin, CC0), repainted toward the founder's
    // reference markings; see the evidence packs.
    buck.faunaResidents = {};
    function loadResident(cfg) {
      var holder = new THREE.Group();
      holder.position.set(cfg.pos[0], cfg.pos[1], cfg.pos[2]);
      holder.rotation.set(cfg.rot[0], cfg.rot[1], cfg.rot[2]);
      holder.scale.setScalar(cfg.scale);
      fauna.add(holder);
      var st = { mixer: null, actions: {}, current: null, next: 20 + Math.random() * 14 };
      new GLTFLoader().load(
        cfg.glb,
        function (gltf) {
          if (buck.torn) return;
          holder.add(gltf.scene);
          st.mixer = new THREE.AnimationMixer(gltf.scene);
          gltf.animations.forEach(function (clip) {
            st.actions[clip.name] = st.mixer.clipAction(clip);
          });
          function play(name, fade) {
            var nextA = st.actions[name];
            if (!nextA) return;
            var prev = st.current ? st.actions[st.current] : null;
            nextA.reset();
            nextA.enabled = true;
            nextA.setEffectiveWeight(1);
            if (name === cfg.idle) nextA.setLoop(THREE.LoopRepeat);
            else {
              nextA.setLoop(THREE.LoopOnce);
              nextA.clampWhenFinished = true;
            }
            nextA.fadeIn(fade || 0.5).play();
            if (prev && prev !== nextA) prev.fadeOut(fade || 0.5);
            st.current = name;
          }
          st.play = play;
          buck.faunaResidents[cfg.key] = st;
          buck[cfg.key + "Rect"] = function () {
            var box = new THREE.Box3().setFromObject(holder);
            var r = buck.renderer.domElement.getBoundingClientRect();
            var vv = new THREE.Vector3();
            var minX = 1e9, minY = 1e9, maxX = -1e9, maxY = -1e9;
            [box.min.x, box.max.x].forEach(function (x) {
              [box.min.y, box.max.y].forEach(function (y) {
                [box.min.z, box.max.z].forEach(function (z) {
                  vv.set(x, y, z).project(buck.camera);
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
          play(cfg.idle, 0);
          if (REDUCED) {
            st.mixer.update(0);
            return;
          }
          st.mixer.addEventListener("finished", function (e) {
            if (e.action !== st.actions[cfg.idle]) play(cfg.idle, 0.6);
          });
          buck.tickFns = buck.tickFns || [];
          buck.tickFns.push(function (dt, t) {
            if (buck.torn || !st.mixer) return;
            if (st.current === cfg.idle && t > st.next) {
              play(cfg.gestures[Math.floor(Math.random() * cfg.gestures.length)], 0.6);
              st.next = t + cfg.gap[0] + Math.random() * (cfg.gap[1] - cfg.gap[0]);
            }
            st.mixer.update(dt);
          });
        },
        undefined,
        function () {
          if (window.console && console.info) {
            console.info("[lgcy-fauna] resident failed to load:", cfg.key);
          }
        }
      );
      return holder;
    }

    // the hollow: a dark cavity disc and a bark rim on the trunk's
    // camera face, the owl seated inside it (rim in front of the
    // owl's lower body, so it reads as IN the tree)
    var hollowC = document.createElement("canvas");
    hollowC.width = 128; hollowC.height = 160;
    var hg = hollowC.getContext("2d");
    var hgrad = hg.createRadialGradient(64, 84, 6, 64, 80, 78);
    hgrad.addColorStop(0, "#060302");
    hgrad.addColorStop(0.62, "#0d0703");
    hgrad.addColorStop(0.88, "#241407");
    hgrad.addColorStop(1, "rgba(36,20,7,0)");
    hg.fillStyle = hgrad;
    hg.fillRect(0, 0, 128, 160);
    var hollowTex = new THREE.CanvasTexture(hollowC);
    var hollow = new THREE.Mesh(
      new THREE.PlaneGeometry(0.78, 0.98),
      new THREE.MeshBasicMaterial({ map: hollowTex, transparent: true, depthWrite: false })
    );
    hollow.position.set(-2.64, 1.50, 0.435);
    hollow.renderOrder = 1;
    fauna.add(hollow);
    var rimMat = new THREE.MeshStandardMaterial({
      map: barkTexture(), color: 0x9a7c58, roughness: 0.95, metalness: 0.0
    });
    var rimGeo = displace(new THREE.TorusGeometry(0.335, 0.038, 10, 28), 0.018, 7.0);
    var rim = new THREE.Mesh(rimGeo, rimMat);
    rim.position.set(-2.64, 1.50, 0.47);
    rim.scale.set(0.88, 1.12, 1.0);
    fauna.add(rim);
    // moss lip over the hollow's top edge
    var lip = new THREE.Mesh(new THREE.SphereGeometry(1, 10, 8), mossMat);
    lip.position.set(-2.68, 1.86, 0.44);
    lip.scale.set(0.30, 0.07, 0.14);
    fauna.add(lip);

    loadResident({
      key: "owl",
      glb: "gl/animals/owl-rigged.glb",
      pos: [-2.64, 1.16, 0.40],
      rot: [0, -0.12, 0],
      scale: 1.45,
      idle: "Owl_Idle",
      gestures: ["Owl_Turn", "Owl_Scan"],
      gap: [22, 38]
    });
    loadResident({
      key: "jay",
      glb: "gl/animals/jay-rigged.glb",
      pos: [-1.44, 1.115, 0.66],
      rot: [0, -0.85, 0],
      scale: 3.0,
      idle: "Jay_Idle",
      gestures: ["Jay_Look", "Jay_Peck"],
      gap: [15, 26]
    });
    // The woodpecker's dapple (Rosa N1, merge-readiness round):
    // its first staging clung low on the trunk in the deepest
    // shadow, where the verified paint read mottled gray-brown
    // and the wing patch vanished. It now clings higher, where a
    // break in the canopy reaches the bark: a soft warm fleck
    // painted on the trunk itself plus a narrow, soft-edged warm
    // shaft from the canopy side, the same treatment that lets
    // the jay's blue survive the scene light. The perch itself
    // sits on open bark below the branch root, so the cling and
    // the braced tail read whole instead of disappearing behind
    // the limb. The fleck lands on
    // the tree first and the bird second, so it reads as dappled
    // sunlight, not a spotlight; the cone is aimed at the perch
    // and falls off well before the squirrel, the jay, or the
    // buck. Contact stays honest: the tail brace and feet still
    // meet the same bark, in the same cling pitch.
    var dappleC = document.createElement("canvas");
    dappleC.width = 128; dappleC.height = 160;
    var dg = dappleC.getContext("2d");
    var dgrad = dg.createRadialGradient(64, 80, 6, 64, 80, 78);
    dgrad.addColorStop(0, "rgba(255,206,128,0.52)");
    dgrad.addColorStop(0.55, "rgba(255,182,98,0.24)");
    dgrad.addColorStop(1, "rgba(255,182,98,0)");
    dg.fillStyle = dgrad;
    dg.fillRect(0, 0, 128, 160);
    var dapple = new THREE.Mesh(
      new THREE.PlaneGeometry(1.05, 1.3),
      new THREE.MeshBasicMaterial({
        map: new THREE.CanvasTexture(dappleC),
        transparent: true, depthWrite: false
      })
    );
    dapple.position.set(-2.54, 0.78, 0.415);
    dapple.rotation.y = 0.10;
    dapple.renderOrder = 1;
    fauna.add(dapple);
    var shaft = new THREE.SpotLight(0xffd9a3, 2.0, 3.5, 0.42, 0.9, 1.6);
    shaft.position.set(-2.05, 1.75, 1.35);
    shaft.target.position.set(-2.52, 0.72, 0.45);
    fauna.add(shaft);
    fauna.add(shaft.target);

    loadResident({
      key: "woodpecker",
      glb: "gl/animals/woodpecker-rigged.glb",
      pos: [-2.52, 0.72, 0.47],
      rot: [-0.62, 0.12, 0],
      scale: 2.6,
      idle: "Woodpecker_Idle",
      gestures: ["Woodpecker_Peck", "Woodpecker_Look"],
      gap: [14, 24]
    });

    // narrow screens: the camera's horizontal field collapses, so
    // the whole perch shifts right and down into the visible band
    // and shrinks a touch; without the shift the squirrel stands
    // off-frame left entirely (measured in the first capture)
    function layoutFauna() {
      var cam = buck.camera;
      if (!cam) return;
      var narrow = cam.aspect < 1.1;
      // 1.38 and 0.82, re-measured on the TW-1152 composition
      // (Rosa N2): at 1.28 and 0.85 the owl hollow still cropped
      // at the left edge at 390; together with the trunk
      // cluster's local shift right, this keeps the hollow whole
      // in frame while the squirrel stays clear of the buck, who
      // now stands further right than he did on the old base
      fauna.position.set(narrow ? 1.38 : 0, narrow ? -0.34 : 0, 0);
      fauna.scale.setScalar(narrow ? 0.82 : 1);
    }
    layoutFauna();
    window.addEventListener("resize", layoutFauna);
    window.addEventListener("lgcy-buck-teardown", function () {
      window.removeEventListener("resize", layoutFauna);
      if (mixer) mixer.stopAllAction();
      mixer = null;
    }, { once: true });
  }
})();
