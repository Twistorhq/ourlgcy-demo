// Our LGCY, TW-1209: the fauna, scattered through the oak.
//
// Until now the four woodland residents shared one perch cluster
// in the buck's threshold scene (gl/fauna.js, retired by this
// ticket). The founder's word (2026-11-19): the animals belong
// throughout the webpage, in the places animals actually hide,
// each moving the way the deer moves. So each resident now keeps
// its own habitat, anchored in the journey section where its
// photograph has always sat:
//
//   the jay        in the canopy of the opening (gen-0)
//   the woodpecker on a dead snag in the 1860s (gen-2)
//   the owl        in a hollow in the 1890s (gen-3)
//   the squirrel   on a limb in the 1930s (gen-4)
//
// Each habitat is a small transparent canvas laid over the
// section, feathered with the same radial mask language as the
// photographs, lit with the buck's warm recipe, and dressed with
// its own perch: bark, moss, leaf occlusion, a contact shadow
// where the animal meets the wood. The baked clips are the ones
// the TW-1076 rigs shipped (idle plus species-true gestures);
// nothing procedural moves a bone here either.
//
// Fail-closed, per habitat and as a whole: the module runs the
// same device precheck family as the buck layer. If the device
// does not earn it, or a habitat's asset fails, that section
// simply keeps its photograph, which is the standing fallback
// and the pre-load poster. A habitat's photograph fades out only
// after the habitat's first real frame has rendered. Habitats
// build only when their section nears the viewport and render
// only while it is on screen, so the page never pays for the
// whole forest at once; the GLBs are the TW-1209 quantized set
// (about 18 MB across all four, loaded one habitat at a time).
//
// The critter buttons keep their job: when a habitat is live,
// clicks, focus, and hover route to the animal's signature
// gesture in 3D via window.__lgcyScatter.perform (app.js asks
// first). Reduced motion renders one still frame of the idle
// stance per habitat and performs nothing.
//
// QA overrides, shared with the buck: ?gl=force-a, ?gl=off.

import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";

(function () {
  "use strict";

  var REDUCED = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var params = new URLSearchParams(window.location.search);
  var force = params.get("gl");
  if (force === "off") return;

  // ---------- device precheck (same family as gl/buck.js) ----------
  function precheck() {
    var c = document.createElement("canvas");
    var gl2 = null;
    try { gl2 = c.getContext("webgl2"); } catch (e) { /* no webgl2 */ }
    if (!gl2) return "no-webgl2";
    if (force !== "force-a" && force !== "force-b") {
      var dbg = gl2.getExtension("WEBGL_debug_renderer_info");
      var renderer = dbg
        ? String(gl2.getParameter(dbg.UNMASKED_RENDERER_WEBGL) || "")
        : "";
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
    }
    return null;
  }
  if (precheck()) return;

  // ---------- shared textures (ported from the retired fauna.js) ----------
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

  function deadwoodTexture() {
    var c = document.createElement("canvas");
    c.width = 256; c.height = 512;
    var g = c.getContext("2d");
    g.fillStyle = "#8a7a63";
    g.fillRect(0, 0, 256, 512);
    for (var i = 0; i < 700; i++) {
      var x = Math.random() * 256, y = Math.random() * 512;
      var len = 30 + Math.random() * 120, wdt = 1 + Math.random() * 2.5;
      var tone = ["#9a8a70", "#77664e", "#a89a80", "#6a5942"][i % 4];
      g.strokeStyle = tone;
      g.lineWidth = wdt;
      g.beginPath();
      g.moveTo(x, y);
      g.lineTo(x + (Math.random() - 0.5) * 5, y + len);
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

  function limb(a, b, r0, r1, mat) {
    var va = new THREE.Vector3(a[0], a[1], a[2]);
    var vb = new THREE.Vector3(b[0], b[1], b[2]);
    var dir = vb.clone().sub(va);
    var len = dir.length();
    var geo = displace(new THREE.CylinderGeometry(r1, r0, len, 12, 6), 0.012, 9.0);
    var mesh = new THREE.Mesh(geo, mat);
    mesh.position.copy(va).add(vb).multiplyScalar(0.5);
    mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.normalize());
    return mesh;
  }

  function contactShadow(x, y, z, w, d, tilt, tex) {
    var m = new THREE.Mesh(
      new THREE.PlaneGeometry(w, d),
      new THREE.MeshBasicMaterial({ map: tex, transparent: true, depthWrite: false })
    );
    m.position.set(x, y, z);
    m.rotation.x = -Math.PI / 2 + (tilt || 0);
    m.renderOrder = 1;
    return m;
  }

  function lights(scene, sunPos) {
    scene.add(new THREE.HemisphereLight(0xe6d3a7, 0x33261a, 1.0));
    var sun = new THREE.DirectionalLight(0xffc98a, 1.3);
    sun.position.set(sunPos[0], sunPos[1], sunPos[2]);
    scene.add(sun);
    var rim = new THREE.DirectionalLight(0xd9c9a8, 0.3);
    rim.position.set(5, 3, -2.5);
    scene.add(rim);
    var face = new THREE.DirectionalLight(0xffe2b0, 0.35);
    face.position.set(0.5, 2.2, 8);
    scene.add(face);
  }

  // ---------- perch builders, one per habitat ----------
  function perchSquirrel(h) {
    var bark = barkTexture();
    var branchMat = new THREE.MeshStandardMaterial({
      map: bark, roughness: 0.95, color: 0xd8c6a8
    });
    // the limb enters from the right edge and droops left, the
    // way the photograph's limb does; the squirrel sits mid-limb
    h.group.add(limb([1.15, 0.34, 0.05], [-1.05, -0.02, 0.38], 0.10, 0.04, branchMat));
    // rising fork beside the seat
    h.group.add(limb([-0.28, 0.13, 0.30], [0.06, 0.52, 0.48], 0.045, 0.018, branchMat));
    var mossMat = new THREE.MeshStandardMaterial({
      map: mossTexture(), roughness: 1.0, color: 0x8a9478
    });
    [[0.55, 0.245, 0.155, 0.20, 0.045, 0.12],
     [0.10, 0.175, 0.225, 0.22, 0.045, 0.13],
     [-0.38, 0.115, 0.30, 0.17, 0.04, 0.11],
     [0.82, 0.29, 0.115, 0.16, 0.04, 0.10],
     [-0.70, 0.055, 0.335, 0.15, 0.035, 0.09]].forEach(function (m) {
      var s = new THREE.Mesh(new THREE.SphereGeometry(1, 10, 8), mossMat);
      s.position.set(m[0], m[1], m[2]);
      s.scale.set(m[3], m[4], m[5]);
      h.group.add(s);
    });
    // a thin hanging twig below the limb near the seat, so the
    // limb's straight top edge is not the only line in frame
    h.group.add(limb([0.30, 0.10, 0.28], [0.44, -0.30, 0.40], 0.022, 0.008, branchMat));
    h.group.add(contactShadow(-0.02, 0.148, 0.235, 0.62, 0.40, 0.20, h.shadowTex));
    var leafMat = new THREE.MeshStandardMaterial({
      map: leafTexture(), transparent: true, alphaTest: 0.4,
      side: THREE.DoubleSide, color: 0x9aa48c, roughness: 1.0
    });
    var p = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), leafMat);
    p.position.set(-0.88, 0.02, 0.85);
    p.scale.setScalar(0.55);
    p.rotation.y = -0.5;
    h.group.add(p);
    return { pos: [-0.02, 0.148, 0.235], rot: [0, -0.55, 0], scale: 1.55 };
  }

  function perchOwl(h) {
    var bark = barkTexture();
    var trunkMat = new THREE.MeshStandardMaterial({
      map: bark, roughness: 0.95, color: 0xd8c6a4
    });
    // a trunk segment that runs out of the frame top and bottom,
    // so no cut end ever shows inside the feathered canvas
    var trunkGeo = displace(new THREE.CylinderGeometry(0.52, 0.62, 3.4, 14, 8), 0.04, 6.0);
    var trunk = new THREE.Mesh(trunkGeo, trunkMat);
    trunk.position.set(-0.18, 0, -0.05);
    trunk.rotation.z = 0.04;
    h.group.add(trunk);
    // a diagonal limb crosses the trunk's top-right edge and
    // leaf clusters sit over both vertical edges, so the trunk
    // never reads as a cut rectangle against the photograph
    var limbMat = new THREE.MeshStandardMaterial({
      map: bark, roughness: 0.95, color: 0xd8c6a8
    });
    h.group.add(limb([0.05, 0.92, 0.28], [0.98, 1.28, 0.42], 0.06, 0.028, limbMat));
    // the hollow: dark cavity, bark rim in front of the owl's
    // lower body so it reads as IN the tree, moss lip above
    var hollowC = document.createElement("canvas");
    hollowC.width = 128; hollowC.height = 160;
    var hg = hollowC.getContext("2d");
    var hgrad = hg.createRadialGradient(64, 84, 6, 64, 80, 78);
    hgrad.addColorStop(0, "#060302");
    hgrad.addColorStop(0.62, "#0d0703");
    // fix round (Rosa nit 4): the outer band was #33200d from
    // 0.82 out, which read as a light tan oval halo at close
    // framing; the band is darker now and the fade starts
    // later, so the ring shrinks into the bark's own shadow
    hgrad.addColorStop(0.90, "#241505");
    hgrad.addColorStop(1, "rgba(36,21,5,0)");
    hg.fillStyle = hgrad;
    hg.fillRect(0, 0, 128, 160);
    var hollow = new THREE.Mesh(
      new THREE.PlaneGeometry(0.78, 0.98),
      new THREE.MeshBasicMaterial({
        map: new THREE.CanvasTexture(hollowC), transparent: true, depthWrite: false
      })
    );
    hollow.position.set(-0.16, 0.04, 0.47);
    hollow.renderOrder = 1;
    h.group.add(hollow);
    var rimMat = new THREE.MeshStandardMaterial({
      map: barkTexture(), color: 0x8a6c4c, roughness: 0.95, metalness: 0.0
    });
    var rim = new THREE.Mesh(displace(new THREE.TorusGeometry(0.335, 0.030, 10, 28), 0.018, 7.0), rimMat);
    rim.position.set(-0.16, 0.04, 0.50);
    rim.scale.set(0.88, 1.12, 1.0);
    h.group.add(rim);
    var mossMat = new THREE.MeshStandardMaterial({
      map: mossTexture(), roughness: 1.0, color: 0x8a9478
    });
    var lip = new THREE.Mesh(new THREE.SphereGeometry(1, 10, 8), mossMat);
    lip.position.set(-0.20, 0.40, 0.47);
    lip.scale.set(0.30, 0.07, 0.14);
    h.group.add(lip);
    // moss colonies on the trunk face itself, breaking its flat
    // lit read (z set on the trunk's curved surface per spot)
    [[-0.55, -0.75, 0.36, 0.22, 0.10, 0.12],
     [-0.02, -1.05, 0.46, 0.26, 0.12, 0.13],
     [0.18, 0.72, 0.36, 0.18, 0.08, 0.10],
     [0.05, -0.55, 0.44, 0.20, 0.09, 0.11]].forEach(function (m) {
      var s = new THREE.Mesh(new THREE.SphereGeometry(1, 10, 8), mossMat);
      s.position.set(m[0], m[1], m[2]);
      s.scale.set(m[3], m[4], m[5]);
      h.group.add(s);
    });
    var leafMat = new THREE.MeshStandardMaterial({
      map: leafTexture(), transparent: true, alphaTest: 0.4,
      side: THREE.DoubleSide, color: 0x9aa48c, roughness: 1.0
    });
    [[0.72, 0.78, 0.80, 0.9, 0.4],
     [-0.82, 0.42, 0.72, 1.05, -0.35],
     [0.52, -0.68, 0.68, 0.9, 0.3],
     [-0.74, -0.88, 0.70, 1.0, -0.2]].forEach(function (cl) {
      var p = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), leafMat);
      p.position.set(cl[0], cl[1], cl[2]);
      p.scale.setScalar(cl[3]);
      p.rotation.y = cl[4];
      h.group.add(p);
    });
    return { pos: [-0.16, -0.31, 0.43], rot: [0, -0.12, 0], scale: 1.58 };
  }

  function perchWoodpecker(h) {
    // a dead snag: silvered wood, leaning in from the top of the
    // frame, broken off in a jagged shoulder inside it.
    // Woodpeckers work dead wood; the dapple treatment from
    // TW-1076 rides along so the paint survives the shade.
    var deadTex = deadwoodTexture();
    var deadMat = new THREE.MeshStandardMaterial({
      map: deadTex, bumpMap: deadTex, bumpScale: 2.0,
      roughness: 0.98, color: 0x7d6a4e
    });
    var snagGeo = displace(new THREE.CylinderGeometry(0.13, 0.17, 3.6, 12, 8), 0.065, 5.0);
    var snag = new THREE.Mesh(snagGeo, deadMat);
    snag.position.set(0.06, 0.05, 0.02);
    snag.rotation.z = 0.17;
    snag.rotation.x = 0.05;
    h.group.add(snag);
    // a broken side stub below the bird, the kind of purchase a
    // snag offers; it also breaks the trunk's straight read
    h.group.add(limb([0.16, -0.52, 0.16], [0.52, -0.72, 0.34], 0.045, 0.02, deadMat));
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
        map: new THREE.CanvasTexture(dappleC), transparent: true, depthWrite: false
      })
    );
    dapple.position.set(0.13, -0.02, 0.30);
    dapple.rotation.y = 0.10;
    dapple.renderOrder = 1;
    h.group.add(dapple);
    var shaft = new THREE.SpotLight(0xffd9a3, 2.0, 3.5, 0.42, 0.9, 1.6);
    shaft.position.set(0.55, 0.95, 1.35);
    shaft.target.position.set(0.12, -0.05, 0.30);
    h.group.add(shaft);
    h.group.add(shaft.target);
    // The stance, solved against the snag's own displaced
    // geometry (fix round, Rosa's TW-1209 gate: the first
    // stance, pos [0.12, -0.05, 0.28] rot [-0.50, 0.70, 0],
    // hovered beside the snag with the feet dangling clear of
    // the wood). The rig's landmarks were measured out of the
    // GLB (feet at model z +0.045, y 0; breast at z +0.058;
    // tail tip at z -0.070) and the snag's displaced face was
    // sampled height by height; the stance below puts the
    // feet on the face (toes a few mm into the proudest wood,
    // the grip read), the breast against it, the head up and
    // out, the beak a peck's distance from the bark, the tail
    // dropped below the feet. The yaw turns the breast to the
    // wood, so the peck jabs the snag instead of the air. The
    // contact shadow the other perches carry stands on the
    // face behind the bird, laid along the snag's lean.
    var contact = new THREE.Mesh(
      new THREE.PlaneGeometry(0.52, 0.60),
      new THREE.MeshBasicMaterial({
        map: h.shadowTex, transparent: true, depthWrite: false
      })
    );
    contact.position.set(0.098, -0.018, 0.175);
    contact.rotation.set(0.05, 0, 0.17);
    contact.renderOrder = 1;
    h.group.add(contact);
    return { pos: [0.061, -0.169, 0.238], rot: [0.65, 3.00, 0.20], scale: 2.9 };
  }

  function perchJay(h) {
    var bark = barkTexture();
    var twigMat = new THREE.MeshStandardMaterial({
      map: bark, roughness: 0.95, color: 0xe2d2b2
    });
    // an outer canopy fork entering from the right edge, in two
    // segments so it droops the way a loaded twig does; the jay
    // stands at the fork the way jays do, high and half in leaf
    h.group.add(limb([1.15, -0.20, 0.10], [-0.12, 0.03, 0.40], 0.052, 0.034, twigMat));
    h.group.add(limb([-0.12, 0.03, 0.40], [-0.88, 0.12, 0.52], 0.034, 0.016, twigMat));
    h.group.add(limb([-0.28, 0.0, 0.37], [0.04, 0.42, 0.56], 0.036, 0.014, twigMat));
    h.group.add(contactShadow(-0.05, 0.045, 0.40, 0.45, 0.30, 0.12, h.shadowTex));
    var leafMat = new THREE.MeshStandardMaterial({
      map: leafTexture(), transparent: true, alphaTest: 0.4,
      side: THREE.DoubleSide, color: 0x9aa48c, roughness: 1.0
    });
    [[-0.92, 0.34, 0.72, 0.85, 0.4], [0.58, 0.44, 0.62, 0.7, -0.3]].forEach(function (cl) {
      var p = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), leafMat);
      p.position.set(cl[0], cl[1], cl[2]);
      p.scale.setScalar(cl[3]);
      p.rotation.y = cl[4];
      h.group.add(p);
    });
    return { pos: [-0.05, 0.045, 0.40], rot: [0, -0.85, 0], scale: 3.0 };
  }

  // ---------- habitat table ----------
  var HABITATS = [
    {
      key: "jay", section: "gen-0", box: "habitat-jay",
      glb: "gl/animals/jay-rigged.glb",
      idle: "Jay_Idle", gestures: ["Jay_Look", "Jay_Peck"],
      signature: "Jay_Peck", gap: [15, 26],
      cam: [0.05, 0.28, 2.15], look: [-0.02, 0.12, 0.35],
      perch: perchJay
    },
    {
      key: "woodpecker", section: "gen-2", box: "habitat-woodpecker",
      glb: "gl/animals/woodpecker-rigged.glb",
      idle: "Woodpecker_Idle", gestures: ["Woodpecker_Peck", "Woodpecker_Look"],
      signature: "Woodpecker_Peck", gap: [14, 24],
      cam: [0.38, 0.05, 2.20], look: [0.0, 0.0, 0.30],
      perch: perchWoodpecker
    },
    {
      key: "owl", section: "gen-3", box: "habitat-owl",
      glb: "gl/animals/owl-rigged.glb",
      idle: "Owl_Idle", gestures: ["Owl_Turn", "Owl_Scan"],
      signature: "Owl_Turn", gap: [22, 38],
      cam: [-0.05, 0.10, 2.65], look: [-0.16, -0.02, 0.40],
      perch: perchOwl
    },
    {
      key: "squirrel", section: "gen-4", box: "habitat-squirrel",
      glb: "gl/animals/squirrel-rigged.glb",
      idle: "Squirrel_Idle", gestures: ["Squirrel_Nibble", "Squirrel_Look"],
      signature: "Squirrel_Nibble", gap: [16, 26],
      cam: [0.0, 0.40, 2.38], look: [-0.02, 0.10, 0.25],
      perch: perchSquirrel
    }
  ];

  var live = {};   // key -> habitat state, once built and framed
  var clock = new THREE.Clock();

  window.__lgcyScatter = {
    live: function (key) { return !!live[key]; },
    perform: function (key) {
      var h = live[key];
      if (!h || REDUCED) return false;
      h.play(h.cfg.signature, 0.4);
      h.next = clock.elapsedTime + h.cfg.gap[0]
        + Math.random() * (h.cfg.gap[1] - h.cfg.gap[0]);
      return true;
    }
  };

  function buildHabitat(cfg) {
    var section = document.getElementById(cfg.section);
    if (!section) return;
    var box = document.createElement("div");
    box.className = "habitat " + cfg.box;
    box.setAttribute("aria-hidden", "true");
    section.appendChild(box);

    var h = {
      cfg: cfg, section: section, box: box, active: false, dead: false,
      mixer: null, actions: {}, current: null,
      next: 12 + Math.random() * 10, shadowTex: shadowTexture()
    };

    try {
      h.renderer = new THREE.WebGLRenderer({
        antialias: true, alpha: true, powerPreference: "high-performance"
      });
    } catch (e) {
      box.remove();
      return;
    }
    h.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    h.renderer.toneMappingExposure = 1.05;
    h.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
    h.canvas = h.renderer.domElement;
    h.canvas.className = "habitat-canvas";
    box.appendChild(h.canvas);
    h.canvas.addEventListener("webglcontextlost", function (e) {
      e.preventDefault();
      kill(h);
    });

    h.scene = new THREE.Scene();
    h.camera = new THREE.PerspectiveCamera(34, 1, 0.1, 40);
    h.camera.position.set(cfg.cam[0], cfg.cam[1], cfg.cam[2]);
    h.camera.lookAt(cfg.look[0], cfg.look[1], cfg.look[2]);
    lights(h.scene, [-4.5, 6, 3.5]);
    h.group = new THREE.Group();
    h.scene.add(h.group);

    var stance = cfg.perch(h);
    var holder = new THREE.Group();
    holder.position.set(stance.pos[0], stance.pos[1], stance.pos[2]);
    holder.rotation.set(stance.rot[0], stance.rot[1], stance.rot[2]);
    holder.scale.setScalar(stance.scale);
    h.group.add(holder);
    h.holder = holder;

    function size() {
      var w = box.clientWidth || 300;
      var ht = box.clientHeight || 240;
      h.renderer.setSize(w, ht, false);
      h.camera.aspect = w / ht;
      h.camera.updateProjectionMatrix();
    }
    h.size = size;
    size();
    window.addEventListener("resize", size);

    h.play = function (name, fade) {
      var next = h.actions[name];
      if (!next) return;
      var prev = h.current ? h.actions[h.current] : null;
      next.reset();
      next.enabled = true;
      next.setEffectiveWeight(1);
      if (name === cfg.idle) next.setLoop(THREE.LoopRepeat);
      else {
        next.setLoop(THREE.LoopOnce);
        next.clampWhenFinished = true;
      }
      next.fadeIn(fade || 0.5).play();
      if (prev && prev !== next) prev.fadeOut(fade || 0.5);
      h.current = name;
    };

    new GLTFLoader().load(
      cfg.glb,
      function (gltf) {
        if (h.dead) return;
        holder.add(gltf.scene);
        h.mixer = new THREE.AnimationMixer(gltf.scene);
        gltf.animations.forEach(function (clip) {
          h.actions[clip.name] = h.mixer.clipAction(clip);
        });
        h.mixer.addEventListener("finished", function (e) {
          if (e.action !== h.actions[cfg.idle]) h.play(cfg.idle, 0.6);
        });
        h.play(cfg.idle, 0);
        if (REDUCED) h.mixer.update(0);
        // first real frame, then the photograph hands over
        h.renderer.render(h.scene, h.camera);
        live[cfg.key] = h;
        section.classList.add("habitat-live");
        box.classList.add("on");
        // QA handle, same spirit as the buck's deerRect
        h.rect = function () {
          var b = new THREE.Box3().setFromObject(holder);
          var r = h.canvas.getBoundingClientRect();
          var vv = new THREE.Vector3();
          var minX = 1e9, minY = 1e9, maxX = -1e9, maxY = -1e9;
          [b.min.x, b.max.x].forEach(function (x) {
            [b.min.y, b.max.y].forEach(function (y) {
              [b.min.z, b.max.z].forEach(function (z) {
                vv.set(x, y, z).project(h.camera);
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
        window.__lgcyScatter[cfg.key + "Rect"] = h.rect;
        window.__lgcyScatter[cfg.key + "Play"] = function (name) { h.play(name, 0.3); };
      },
      undefined,
      function () {
        if (window.console && console.info) {
          console.info("[lgcy-scatter] habitat asset failed:", cfg.key);
        }
        kill(h);
      }
    );

    // render only while the section is on screen
    if ("IntersectionObserver" in window) {
      var io = new IntersectionObserver(function (entries) {
        entries.forEach(function (en) { h.active = en.isIntersecting; });
      }, { threshold: 0.02 });
      io.observe(section);
      h.io = io;
    } else {
      h.active = true;
    }
  }

  function kill(h) {
    if (h.dead) return;
    h.dead = true;
    delete live[h.cfg.key];
    h.section.classList.remove("habitat-live");
    if (h.io) h.io.disconnect();
    window.removeEventListener("resize", h.size);
    if (h.mixer) h.mixer.stopAllAction();
    if (h.box.parentNode) h.box.parentNode.removeChild(h.box);
    if (h.renderer) {
      try { h.renderer.dispose(); } catch (e) { /* noop */ }
    }
  }

  // one loop drives every live habitat; idle habitats cost a
  // boolean check per frame
  function loop() {
    requestAnimationFrame(loop);
    var dt = Math.min(clock.getDelta(), 0.05);
    var t = clock.elapsedTime;
    for (var key in live) {
      var h = live[key];
      if (h.dead || !h.active || !h.mixer) continue;
      if (!REDUCED) {
        if (h.current === h.cfg.idle && t > h.next) {
          h.play(h.cfg.gestures[Math.floor(Math.random() * h.cfg.gestures.length)], 0.6);
          h.next = t + h.cfg.gap[0] + Math.random() * (h.cfg.gap[1] - h.cfg.gap[0]);
        }
        h.mixer.update(dt);
      }
      h.renderer.render(h.scene, h.camera);
    }
  }

  // build each habitat as its section approaches; the generous
  // margin starts the GLB download well before arrival
  var built = {};
  function arm(cfg) {
    var section = document.getElementById(cfg.section);
    if (!section) return;
    if (!("IntersectionObserver" in window)) {
      buildHabitat(cfg);
      return;
    }
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (en.isIntersecting && !built[cfg.key]) {
          built[cfg.key] = true;
          io.disconnect();
          buildHabitat(cfg);
        }
      });
    }, { rootMargin: "160% 0px 160% 0px" });
    io.observe(section);
  }

  function boot() {
    HABITATS.forEach(arm);
    if (!REDUCED) requestAnimationFrame(loop);
  }
  if (document.readyState === "complete") boot();
  else window.addEventListener("load", boot);
})();
