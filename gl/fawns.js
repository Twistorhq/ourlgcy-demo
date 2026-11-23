// Our LGCY, TW-1302: the two fawns beside the buck.
//
// The founder's picture (2026-11-23): the big buck stands
// lookout like a father, and his two young ones are beside
// him. One fawn keeps her head down eating the entire time
// she is settled; the other eats a second, looks up, eats,
// looks up, always alternating. Both walk in and out of the
// scene on their own hours, so the tableau lives: a father
// watching over his children. That read, father and young
// on one ground, is the legacy metaphor of the whole app,
// so the fawns belong WITH the deer (the fox, TW-1298, is
// the opposite fact: far left, in shadow, apart).
//
// The fawns themselves were built in the Blender lane
// (TW-1302 step 1, Imani Carter): juveniles of the same
// Grab3D deer the buck came from (CC0), antlers removed,
// fawn proportions, spotted coats, on the house rig, each
// carrying four baked clips: Graze (head down the whole
// time), GrazeLook (down, up with a look around, down,
// varied beats), Walk (in place), Idle. Fawn A is the
// smaller, more-spotted one and takes Graze; B is a touch
// larger and takes GrazeLook. Build record:
// assets-fawns/FAWN-BUILD-LOG.md in the lab.
//
// Placement is a guest seat in the buck's own scene, on
// the contract gl/buck.js publishes for guests, the same
// seat gl/fox.js rides: wait for lgcy-buck-ready, build
// into the buck's group (so the fawns inherit his mirror,
// scale, light, and narrow-screen layout exactly), tick
// through the buck's tickFns hook, die on
// lgcy-buck-teardown. buck.js is untouched. This module
// models and rigs nothing; it places the shelved fawns
// and choreographs them.
//
// Ground: the fawns stand and walk on the apron plane the
// fox's probes solved (apronY below; raycasts over the
// built scene, qa-tw1302/probe-ground.mjs, confirm the
// plane is the real surface across the whole band the
// fawns use, z 0 to 1.2, x 0.7 to past the frame edge;
// the rock only breaks it at x below ~0.8 near the
// deer's own feet, ground the fawns never take).
//
// Choreography, per fawn, independent machines: settled
// (the behavior clip looping at the home spot), out
// (walking the ground path to past the frame's left
// edge), away (out of frame, dwell varies), in (walking
// home), settle (a short Idle beat on arrival, looking
// around the clearing, before the behavior clip takes
// over). The two machines run different dwell ranges,
// different path lengths, and different speeds, and
// neither shares a period with the fox's scurry, so the
// three animals never move in step. Both fawns start
// settled: the first thing a visitor sees is the whole
// family, father on lookout, one young head down, the
// other mid-look.
//
// Animation law: only the baked clips play; the
// choreography moves the holders along the ground plane
// and turns them, it never touches a bone. Reduced motion
// holds both fawns settled at frame 0 (A in the graze
// pose, B standing idle): no walking, ever.
//
// Fail-closed, per fawn: if one fawn's asset fails, that
// fawn is removed clean and the other, the fox, and the
// buck stand exactly as they did. If the buck layer never
// earns the device, lgcy-buck-ready never fires and there
// are no fawns; the section stays a quiet divider.
//
// Weight: the fawn GLBs ship at their built size
// (1,491,476 and 1,490,312 bytes). The bulk is float32
// vertex data, and the only safe reduction is a
// quantization encode, not decimation: decimating a
// skinned mesh re-interpolates the neck weight repaint
// the Blender lane measured and fixed for the deep graze
// fold, which is these animals' signature pose. At
// 1.5 MB each they sit in the buck's own shipped class
// (his rigged GLB is 2.2 MB; the owl ships 5.1 MB), and
// like every guest they load only when the buck layer
// has earned the device. The call is recorded on TW-1302.
//
// QA overrides ride the buck's: ?gl=force-a, ?gl=off. The
// QA handle (window.__lgcyFawns) exposes the machines:
// fawns.a.state / fawns.b.state, fawns.comeIn("a"|"b"),
// fawns.sendOut("a"|"b"), fawns.animalRect("a"|"b").

import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";

(function () {
  "use strict";

  var REDUCED = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  // The apron plane, solved by the fox's probes and
  // re-confirmed for this band by qa-tw1302's grid: a
  // plane pitched at the stance slope, 0.2664 fall per
  // unit z, passing through y 0.0534 at z 0.45. Feet sit
  // 4 mm into the surface, the fox's seat.
  function apronY(z) { return 0.0534 - (z - 0.45) * 0.2664; }
  var PITCH = 0.262; // atan(0.2664), the apron's own slope

  // Homes and exits, in buck-group space, per stance (in
  // group space the local +x reads as frame left on
  // screen; the group is mirrored). Solved against the
  // built scene with animal-only projected boxes
  // (qa-tw1302/probe-spots.mjs; tuned in the build log
  // on TW-1302).
  //
  // Wide: A stands at his father's front-left, mid-ground,
  // head down in the grass. B stands behind her and a step
  // toward him, at his front-left shoulder, where her
  // look-up beats read over her sister's grazing back: the
  // looker on watch behind the grazer, both under his eye.
  // First captures put B front-left instead, where her
  // body covered the fox in his shade almost whole; the
  // fox's corner is his own scene and no fawn stands in
  // it. From B's home the pair clear his spot at
  // (2.30, 0.62) and his scurry line by a body's width
  // and more (qa-tw1302 rects on TW-1302).
  //
  // Narrow: the phone frame is mostly deer, and every
  // spot on his left at phone scale lands in the fox's
  // 120px corner, so the fawns stand in front of him
  // instead, spread across his feet: A low at his
  // front-left, B higher at his front-right, a diagonal
  // pair with daylight between their silhouettes. The
  // first narrow pair sat at near-identical group x and
  // eclipsed into one shape; the spread pair is solved
  // in qa-tw1302/probe-mobile3.mjs, left edges clear of
  // the fox's rect, bottoms inside the canvas. Same
  // family, tighter room: father behind, young ones
  // before him.
  //
  // Exits run toward +x (frame left, the woods edge the
  // fox also uses, on different lines) with a slight z
  // slant each, so a leaving fawn drifts a little away or
  // a little toward the visitor as she goes. exit is the
  // travel distance at which the animal's box is fully
  // past the frame's left edge, worst clip phase, with
  // margin, measured per stance in the probe.
  var CFG = {
    a: {
      file: "gl/animals/fawn-a.glb",
      behavior: "Graze",
      wide: { home: { x: 1.18, z: 0.28 }, yaw: -0.85, dir: { x: 0.940, z: 0.342 }, exit: 4.8 },
      narrow: { home: { x: -0.62, z: 0.82 }, yaw: -0.85, dir: { x: 0.970, z: -0.242 }, exit: 4.4 },
      speed: 0.62, walkScale: 1.0,
      settleDwell: function () { return 40 + Math.random() * 35; },
      awayDwell: function () { return 14 + Math.random() * 16; },
      firstOut: function () { return 30 + Math.random() * 25; }
    },
    b: {
      file: "gl/animals/fawn-b.glb",
      behavior: "GrazeLook",
      wide: { home: { x: 0.98, z: -0.02 }, yaw: -0.80, dir: { x: 0.958, z: 0.287 }, exit: 5.8 },
      narrow: { home: { x: -0.90, z: 0.50 }, yaw: -0.80, dir: { x: 0.940, z: 0.342 }, exit: 3.8 },
      speed: 0.80, walkScale: 1.0,
      settleDwell: function () { return 50 + Math.random() * 40; },
      awayDwell: function () { return 18 + Math.random() * 20; },
      firstOut: function () { return 55 + Math.random() * 30; }
    }
  };

  var dead = false;

  var fawns = { live: false, aLive: false, bLive: false };
  window.__lgcyFawns = fawns;

  function isNarrow() {
    var buck = window.__lgcyBuck;
    return !!(buck && buck.camera && buck.camera.aspect < 1.1);
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
  var shadowTex = null; // built once, shared by both fawns

  function projectBox(obj) {
    var buck = window.__lgcyBuck;
    var b = new THREE.Box3().setFromObject(obj);
    var r = buck.canvas.getBoundingClientRect();
    var vv = new THREE.Vector3();
    var minX = 1e9, minY = 1e9, maxX = -1e9, maxY = -1e9;
    [b.min.x, b.max.x].forEach(function (x) {
      [b.min.y, b.max.y].forEach(function (y) {
        [b.min.z, b.max.z].forEach(function (z) {
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
  }

  function makeFawn(key, group) {
    var cfg = CFG[key];
    var holder = new THREE.Group();
    group.add(holder);

    var f = {
      key: key,
      live: false,
      state: "settled",
      holder: holder,
      animal: null,
      mixer: null,
      actions: {},
      // prog: distance along the exit path from home.
      // settled/settle: 0. out: 0 -> exit. away: exit.
      // in: exit -> 0.
      prog: 0,
      dwell: cfg.firstOut(),
      yaw: 0,
      failed: false
    };

    function stance() { return isNarrow() ? cfg.narrow : cfg.wide; }

    // Seat the holder prog units along the exit path from
    // the current stance's home, feet on the apron plane,
    // pitched on its slope, facing the machine's yaw.
    function place() {
      var s = stance();
      var x = s.home.x + s.dir.x * f.prog;
      var z = s.home.z + s.dir.z * f.prog;
      holder.position.set(x, apronY(z) - 0.004, z);
      holder.rotation.set(PITCH, f.yaw, 0);
    }
    f.place = place;

    function play(name, fade, timeScale) {
      var next = f.actions[name];
      if (!next) return false;
      next.reset();
      next.enabled = true;
      next.setEffectiveWeight(1);
      next.setEffectiveTimeScale(timeScale || 1);
      next.setLoop(THREE.LoopRepeat);
      next.fadeIn(fade).play();
      Object.keys(f.actions).forEach(function (k) {
        if (k !== name && f.actions[k].isRunning()) f.actions[k].fadeOut(fade);
      });
      return true;
    }

    function easeYaw(target, rate, dt) {
      var d = target - f.yaw;
      while (d > Math.PI) d -= Math.PI * 2;
      while (d < -Math.PI) d += Math.PI * 2;
      f.yaw += d * Math.min(1, rate * dt);
    }

    function travelYaw(sign) {
      var s = stance();
      // sign +1 walks out (home -> edge), -1 walks home.
      return Math.atan2(s.dir.x * sign, s.dir.z * sign);
    }

    function beginOut() {
      if (!f.actions.Walk) return; // no Walk, no travel (see load)
      f.state = "out";
      play("Walk", 0.3, cfg.walkScale);
    }

    function beginIn() {
      f.state = "in";
      holder.visible = true;
      play("Walk", 0.3, cfg.walkScale);
    }

    function arrive() {
      f.prog = 0;
      // A beat of looking around before the head goes
      // down (or the eat-look cycle starts): a fawn
      // checks the clearing first. If Idle is missing,
      // settle straight into the behavior.
      if (f.actions.Idle && !REDUCED) {
        f.state = "settle";
        f.dwell = 1.4 + Math.random() * 1.2;
        play("Idle", 0.35);
      } else {
        settle();
      }
    }

    function settle() {
      f.state = "settled";
      f.dwell = cfg.settleDwell();
      if (!play(cfg.behavior, 0.4)) play("Idle", 0.4);
    }

    // QA and the curious: send this fawn out, or call her
    // home. Mid-leg calls are no-ops.
    f.sendOut = function () {
      if (dead || REDUCED || !f.live) return;
      if (f.state === "settled" || f.state === "settle") beginOut();
    };
    f.comeIn = function () {
      if (dead || REDUCED || !f.live) return;
      if (f.state === "away") beginIn();
    };

    f.tick = function (dt) {
      if (!f.live || f.failed) return;
      var s = stance();
      switch (f.state) {
        case "settled":
          easeYaw(s.yaw, 3.5, dt);
          f.dwell -= dt;
          if (f.dwell <= 0) beginOut();
          break;
        case "settle":
          easeYaw(s.yaw, 3.5, dt);
          f.dwell -= dt;
          if (f.dwell <= 0) settle();
          break;
        case "out":
          easeYaw(travelYaw(1), 8, dt);
          f.prog += cfg.speed * dt;
          if (f.prog >= s.exit) {
            f.prog = s.exit;
            f.state = "away";
            f.dwell = cfg.awayDwell();
            holder.visible = false;
          }
          break;
        case "away":
          f.dwell -= dt;
          if (f.dwell <= 0) beginIn();
          break;
        case "in":
          easeYaw(travelYaw(-1), 8, dt);
          f.prog -= cfg.speed * dt;
          if (f.prog <= 0) arrive();
          break;
      }
      place();
      if (f.mixer) f.mixer.update(dt);
    };

    f.load = function () {
      new GLTFLoader().load(
        cfg.file,
        function (gltf) {
          if (dead) return;
          // The buck's blend law (TW-1152), the same warm
          // tint multiplied into his coat, so the young
          // ones sit in the same golden light as their
          // father and the oak photograph behind them.
          gltf.scene.traverse(function (o) {
            if (o.isMesh && o.material && o.material.color) {
              o.material.color.setRGB(1.0, 0.95, 0.87);
            }
          });
          f.animal = gltf.scene;
          holder.add(f.animal);

          // The contact shadow, the buck's own construction
          // at fawn scale: a soft radial shade just under
          // the feet, sized from the animal's own bind box.
          // It rides the holder, so it grounds her settled
          // and all along her paths. The holder is already
          // pitched onto the apron's slope, so the shade
          // lies flat in holder space.
          if (!shadowTex) shadowTex = shadowTexture();
          var box = new THREE.Box3().setFromObject(f.animal);
          var sx = box.max.x - box.min.x;
          var sz = box.max.z - box.min.z;
          var shadow = new THREE.Mesh(
            new THREE.PlaneGeometry(sx + 0.35, sz + 0.45),
            new THREE.MeshBasicMaterial({
              map: shadowTex, transparent: true, depthWrite: false
            })
          );
          shadow.rotation.x = -Math.PI / 2;
          shadow.position.set(
            (box.min.x + box.max.x) / 2, 0.006, (box.min.z + box.max.z) / 2
          );
          shadow.renderOrder = 3;
          holder.add(shadow);

          f.mixer = new THREE.AnimationMixer(f.animal);
          gltf.animations.forEach(function (clip) {
            f.actions[clip.name] = f.mixer.clipAction(clip);
          });
          if (!f.actions.Walk && window.console && console.info) {
            // No Walk in the asset: she keeps her home and
            // never travels. The resident behavior stands.
            console.info("[lgcy-fawns] no Walk clip for fawn " + key +
              "; she stays by her father");
            cfg.settleDwell = function () { return Infinity; };
            cfg.firstOut = function () { return Infinity; };
            f.dwell = Infinity;
          }
          f.yaw = stance().yaw;
          place();
          if (REDUCED) {
            // Settled at frame 0: A in the graze pose, B
            // standing. Held, never ticked.
            var still = f.actions[cfg.behavior] || f.actions.Idle;
            if (still) { still.setEffectiveWeight(1); still.play(); }
            f.mixer.update(0);
          } else {
            play(cfg.behavior, 0.1);
          }
          f.live = true;
          fawns[key + "Live"] = true;
          fawns.live = fawns.aLive || fawns.bLive;
        },
        undefined,
        function () {
          if (window.console && console.info) {
            console.info("[lgcy-fawns] fawn " + key +
              " asset failed; the rest of the family stands as it was");
          }
          f.failed = true;
          if (holder.parent) holder.parent.remove(holder);
        }
      );
    };

    f.animalRect = function () {
      return f.animal ? projectBox(f.animal) : null;
    };
    // QA placement probe: seat the holder at a path
    // distance without touching the machine, so exit
    // distances and stance spots are measured, not timed.
    f.setProg = function (v) {
      f.prog = v;
      place();
      holder.updateWorldMatrix(true, true);
    };
    // QA placement probe, free form: seat the holder at
    // arbitrary group coordinates (candidate-home surveys).
    f.placeAt = function (x, z, yaw) {
      holder.position.set(x, apronY(z) - 0.004, z);
      holder.rotation.set(PITCH, yaw, 0);
      holder.updateWorldMatrix(true, true);
    };
    f.die = function () {
      if (f.mixer) f.mixer.stopAllAction();
      if (holder.parent) holder.parent.remove(holder);
      f.live = false;
    };
    return f;
  }

  var herd = null;

  function attach() {
    var buck = window.__lgcyBuck;
    if (dead || !buck || !buck.scene || herd) return;
    // The buck's group is the scene's only Group child: it
    // carries the rock, the apron, the contact shadow, the
    // deer, and every guest. The fawns join it so every
    // layout the buck layer applies (mirror, scale,
    // off-center stance, the narrow-screen ease toward
    // center) applies to them in the same breath.
    var group = null;
    buck.scene.children.forEach(function (c) {
      if (c.isGroup && !group) group = c;
    });
    if (!group) return;

    herd = { a: makeFawn("a", group), b: makeFawn("b", group) };
    fawns.a = herd.a;
    fawns.b = herd.b;
    fawns.comeIn = function (which) { if (herd[which]) herd[which].comeIn(); };
    fawns.sendOut = function (which) { if (herd[which]) herd[which].sendOut(); };
    fawns.animalRect = function (which) {
      return herd[which] ? herd[which].animalRect() : null;
    };
    fawns.setProg = function (which, v) {
      if (herd[which]) herd[which].setProg(v);
    };
    fawns.placeAt = function (which, x, z, yaw) {
      if (herd[which]) herd[which].placeAt(x, z, yaw);
    };
    // Re-seat both holders when the stance flips, the
    // fox's resize discipline: homes and exits are
    // per-stance, positions recompute from machine state.
    fawns.applyStance = function () {
      if (!herd) return;
      herd.a.place();
      herd.b.place();
    };
    window.addEventListener("resize", fawns.applyStance);
    herd.a.load();
    herd.b.load();

    // Tick through the buck loop's guest hook, so the
    // fawns render only when the buck renders (section
    // visible, tier earned) and cost nothing when they
    // do not.
    buck.tickFns = buck.tickFns || [];
    buck.tickFns.push(function (dt) {
      if (dead || REDUCED || !herd) return;
      var step = Math.min(dt, 0.05);
      herd.a.tick(step);
      herd.b.tick(step);
    });
  }

  function die() {
    if (dead) return;
    dead = true;
    fawns.live = false;
    if (fawns.applyStance) window.removeEventListener("resize", fawns.applyStance);
    if (herd) {
      herd.a.die();
      herd.b.die();
    }
  }

  window.addEventListener("lgcy-buck-ready", attach);
  window.addEventListener("lgcy-buck-teardown", die);
  // Belt and braces: if this module somehow runs after the
  // buck is already live, take the seat directly.
  if (window.__lgcyBuck && window.__lgcyBuck.scene) attach();
})();
