// Our LGCY, TW-1298: the fox at the threshold.
//
// Round 1 placed the Mesh2Motion red fox (CC0, pulled onto
// the house shelf under TW-1292 and assembled scene-ready by
// the Blender lane, FOX-SCENE-LOG.md) on the open ground
// beside the buck. The founder's eye rejected that reading
// (2026-11-23): a fox beside the deer reads as the deer's
// companion, and a fox would never sit in the open like
// that. His revision, which this module now builds:
//
//   - Far left, his own scene. The fox stands a long way
//     from the deer, at the frame's left edge, in no way
//     composed with him. The deer is its own person in its
//     own thing; the fox is a separate fact of the woods.
//   - In shadow, out of the way. His spot is the shade at
//     the clearing's edge: a dappled shade pool on the
//     ground and a shade veil standing behind him, both
//     built the apron's own way (the apron is the ground
//     shadow of the outcrop, buck.js), plus a deep shade
//     tint on his coat, so he sits IN shadow, not on a
//     black box. He is not trying to be seen, but a viewer
//     who looks knows he is there. The shade runs deeper
//     at the narrow stance, where the same treatment read
//     brighter on phones (final pass, the founder's
//     ruling; see the shade-depth table below).
//   - The scurry. His signature behavior: after a long
//     still spell in the shade he darts out of the frame
//     along the ground, low and quick, the authored Walk
//     clip at a scurry's pace, like a fox running off into
//     the woods against the still photograph. He is gone a
//     while (only his shade stays), then slips back
//     at a quiet trot and settles. The intervals vary, so
//     it never reads as a loop on a timer.
//
// Placement is still a guest seat in the buck's own scene,
// on the contract gl/buck.js publishes for guests: it waits
// for lgcy-buck-ready, builds into the buck's group (so the
// fox inherits the buck's mirror, scale, light, and
// narrow-screen layout exactly), ticks through the buck's
// tickFns hook, and dies on lgcy-buck-teardown. buck.js is
// untouched. This module models and rigs nothing; it places
// the shelved fox and choreographs him.
//
// Fail-closed, per guest: if the fox's asset fails, this
// module goes quiet (holder, shade pool, and veil removed)
// and the buck stands exactly as he did. If the buck layer
// itself never earns the device, lgcy-buck-ready never
// fires and there is no fox; the section stays a quiet
// divider, as before.
//
// Animation law: only the baked clips play (Idle at rest,
// Walk in transit); the choreography moves the holder along
// the ground plane and turns him, it never touches a bone.
// Reduced motion holds the frame-0 stance in the shade
// spot: no scurry, ever.
//
// QA overrides ride the buck's: ?gl=force-a, ?gl=off. The
// QA handle (window.__lgcyFox) also exposes the machine:
// fox.state, fox.scurryNow(), fox.animalRect().

import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";

(function () {
  "use strict";

  var REDUCED = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  // The ground the fox runs on is the apron's own plane.
  // The apron (a child of the same group) is a plane pitched
  // at the stance slope, 0.2664 fall per unit z, passing
  // through y 0.0534 at z 0.45; raycasts over the built
  // scene confirm the surface at every x the fox uses
  // (probe-far.mjs: y 0.080 at z 0.35, 0.008 at z 0.62,
  // -0.066 at z 0.90, x-independent until the apron mesh
  // ends near x 2.38; past the rim the same plane line is
  // extended, which is where the clearing's shade gives out
  // into the photograph). Feet sit 4 mm into the surface,
  // the round-1 seat.
  function apronY(z) { return 0.0534 - (z - 0.45) * 0.2664; }
  var PITCH = 0.262; // atan(0.2664), the apron's own slope

  // The shadow spots, in buck-group space, solved against
  // the built scene with animal-only projected boxes
  // (probe-far2.mjs, probe-far3.mjs; the holder box is
  // dominated by the contact-shadow plane, so the animal
  // itself was measured). In group space the local +x reads
  // as frame left on screen (the group is mirrored).
  //
  // Wide: (2.30, 0.62). The animal projects to roughly
  // x 200-500 of a 1440 canvas depending on the Idle phase,
  // hard against the frame's left third and 300+ px clear
  // of the deer (deer box starts at 797). He stands at the
  // apron rim's last sliver, where the clearing's ground
  // shade fades into the photograph.
  //
  // Narrow: the buck's layout eases the group toward center
  // on phones and every wide spot projects off the phone
  // frame entirely; the far-left ground that stays in frame
  // is the apron's front-left at (0.90, 0.35), animal at
  // roughly x 15-102 of 390, clear of the deer (141). Same
  // plane, same pitch.
  var SPOT_WIDE = { x: 2.30, z: 0.62, exit: 3.4 };
  var SPOT_NARROW = { x: 0.90, z: 0.35, exit: 1.6 };

  // Shade depth per stance (final pass, the founder's
  // ruling on Rosa's re-gate note N2: "Deepen the mobile
  // shade first, then merge"). The wide values are the
  // approved desktop read and do not move. At the narrow
  // stance the same treatment read brighter: the veil's
  // core lands off the animal there and the phone framing
  // puts him against a brighter reach of the photograph,
  // so the narrow stance runs the same construction
  // deeper (a deeper coat tint, the veil scaled up and
  // centered on the animal, the pool spread wider) until
  // the phone read matches the desktop's level of hidden.
  var TINT_WIDE = [0.34, 0.325, 0.31];
  var TINT_NARROW = [0.231, 0.221, 0.211];
  var POOL_SCALE_WIDE = [0.92, 1.38];
  var POOL_SCALE_NARROW = [1.12, 1.6];
  var VEIL_WIDE = { off: [0.35, 0.72, -0.55], scale: [1, 1] };
  var VEIL_NARROW = { off: [0.0, 0.5, -0.5], scale: [1.35, 1.3] };

  // The scurry path: local direction (1, 0, 0.55), which
  // the group's mirror and turn carry to screen-left and
  // slightly away, into the picture. Measured exit travel
  // (animal box fully past the left edge, worst Idle phase,
  // with margin): 3.4 units wide, 1.6 narrow, from the
  // spots above (probe-far3.mjs). Yaw values face the fox
  // along his travel; the resident yaw faces him outward
  // toward the arriving visitor, three-quarter, the way
  // round 1 verified, only now from his own far corner.
  var DIR = { x: 0.876, z: 0.482 }; // normalize(1, 0, 0.55)
  var YAW_REST = -0.62;
  var YAW_OUT = Math.atan2(DIR.x, DIR.z); // 1.068
  var YAW_BACK = YAW_OUT - Math.PI;       // -2.073
  var SPEED_OUT = 2.05;  // units per second: a dart
  var SPEED_BACK = 0.8;  // a quiet trot home
  var WALK_OUT = 2.5;    // Walk clip timeScale on the dart
  var WALK_BACK = 1.15;  // and on the trot

  var dead = false;
  var mixer = null;
  var holder = null;
  var pool = null;
  var veil = null;
  var animal = null;
  var animalMats = [];
  var idleAction = null;
  var walkAction = null;

  // The choreography machine. States: rest (in the shade,
  // Idle), out (the scurry), gone (out of frame, only the
  // shade pool remains), back (the slip home). prog is the
  // distance along the path from the spot; dwell counts
  // down the still spells. All time is tick time, which the
  // buck loop only serves while the section is on screen,
  // so the fox keeps his own hours only while watched.
  var machine = {
    state: "rest",
    prog: 0,
    dwell: 10 + Math.random() * 8, // first spell is shorter
    yaw: YAW_REST,
    crouch: 0
  };

  var fox = { live: false, state: "rest" };
  window.__lgcyFox = fox;

  function restDwell() { return 18 + Math.random() * 20; }
  function goneDwell() { return 8 + Math.random() * 12; }

  function spot() {
    var buck = window.__lgcyBuck;
    return (buck && buck.camera && buck.camera.aspect < 1.1)
      ? SPOT_NARROW : SPOT_WIDE;
  }

  // The buck layer's own narrow test, shared by every
  // per-stance choice above so they all flip together.
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

  // The shade pool: the spot's own ground shadow, built the
  // apron's way (buck.js buildApron): a warm earth-dark
  // radial falloff whose rim is dappled both ways, some
  // speckles holding the shade longer, a few letting the
  // ground through early, so the edge is a scatter and
  // never a clean geometric line. It belongs to the spot,
  // not to the fox: it stays when he has scurried off,
  // which is how the empty frame still knows his place.
  function poolTexture() {
    var c = document.createElement("canvas");
    c.width = 512; c.height = 512;
    var g = c.getContext("2d");
    var grad = g.createRadialGradient(256, 256, 20, 256, 256, 256);
    grad.addColorStop(0, "rgba(36,26,13,0.70)");
    grad.addColorStop(0.40, "rgba(36,26,13,0.56)");
    grad.addColorStop(0.70, "rgba(36,26,13,0.26)");
    grad.addColorStop(1, "rgba(36,26,13,0)");
    g.fillStyle = grad;
    g.fillRect(0, 0, 512, 512);
    for (var i = 0; i < 700; i++) {
      var ang = Math.random() * Math.PI * 2;
      var rad = (0.52 + Math.random() * 0.48) * 256;
      var bx = 256 + Math.cos(ang) * rad;
      var by = 256 + Math.sin(ang) * rad;
      if (bx < 0 || bx > 512 || by < 0 || by > 512) continue;
      var br = 6 + Math.random() * 26;
      var bg = g.createRadialGradient(bx, by, 0.5, bx, by, br);
      if (Math.random() < 0.62) {
        bg.addColorStop(0, "rgba(36,26,13," + (0.05 + Math.random() * 0.13) + ")");
      } else {
        bg.addColorStop(0, "rgba(255,244,214," + (0.03 + Math.random() * 0.07) + ")");
      }
      bg.addColorStop(1, "rgba(0,0,0,0)");
      g.fillStyle = bg;
      g.beginPath();
      g.arc(bx, by, br, 0, 7);
      g.fill();
    }
    return new THREE.CanvasTexture(c);
  }

  function placePool() {
    if (!pool) return;
    var s = spot();
    pool.position.set(s.x, apronY(s.z) + 0.004, s.z);
    // The pool's spread is per stance (see the shade-depth
    // table): wider on phones, where his hollow must hold
    // more of the frame's ground to read as shade. This
    // supersedes the creation-time scale on every stance
    // application, the first one included.
    var ps = isNarrow() ? POOL_SCALE_NARROW : POOL_SCALE_WIDE;
    pool.scale.set(ps[0], ps[1], 1);
  }

  // The shade veil: the same radial shade construction
  // stood upright behind the spot, so the backdrop itself
  // sits in shadow, not just the ground. The photograph
  // behind his corner is sunlit; the veil is what makes
  // the corner a dark location in the scene's own terms.
  // Its rim is dappled harder than the pool's, with more
  // light breaks than shade holds, so its edge dissolves
  // into the photograph's own dapple and never reads as a
  // pasted shape. Like the pool it belongs to the spot and
  // stays when he is gone: an empty shaded hollow at the
  // woods edge.
  function veilTexture() {
    var c = document.createElement("canvas");
    c.width = 512; c.height = 512;
    var g = c.getContext("2d");
    var grad = g.createRadialGradient(256, 256, 20, 256, 256, 256);
    grad.addColorStop(0, "rgba(30,22,12,0.52)");
    grad.addColorStop(0.45, "rgba(30,22,12,0.40)");
    grad.addColorStop(0.75, "rgba(30,22,12,0.16)");
    grad.addColorStop(1, "rgba(30,22,12,0)");
    g.fillStyle = grad;
    g.fillRect(0, 0, 512, 512);
    for (var i = 0; i < 520; i++) {
      var ang = Math.random() * Math.PI * 2;
      var rad = (0.45 + Math.random() * 0.55) * 256;
      var bx = 256 + Math.cos(ang) * rad;
      var by = 256 + Math.sin(ang) * rad;
      if (bx < 0 || bx > 512 || by < 0 || by > 512) continue;
      var br = 8 + Math.random() * 34;
      var bg = g.createRadialGradient(bx, by, 0.5, bx, by, br);
      if (Math.random() < 0.45) {
        bg.addColorStop(0, "rgba(30,22,12," + (0.04 + Math.random() * 0.10) + ")");
      } else {
        bg.addColorStop(0, "rgba(255,244,214," + (0.04 + Math.random() * 0.09) + ")");
      }
      bg.addColorStop(1, "rgba(0,0,0,0)");
      g.fillStyle = bg;
      g.beginPath();
      g.arc(bx, by, br, 0, 7);
      g.fill();
    }
    return new THREE.CanvasTexture(c);
  }

  function placeVeil() {
    if (!veil) return;
    var s = spot();
    // Behind the fox from the camera's side of the group:
    // deeper into the picture and a step toward the trees.
    // Placement and size are per stance (see the shade-
    // depth table): at the narrow stance the veil runs
    // larger and centered on the animal, because the wide
    // placement's core lands off him on phones and his
    // corner of the photograph stays lit (Rosa's N2).
    var v = isNarrow() ? VEIL_NARROW : VEIL_WIDE;
    veil.position.set(s.x + v.off[0], apronY(s.z) + v.off[1], s.z + v.off[2]);
    veil.scale.set(v.scale[0], v.scale[1], 1);
  }

  // Seat the holder prog units along the path from the
  // current spot, feet on the apron plane, pitched on its
  // slope, facing the machine's current yaw.
  function placeFox() {
    if (!holder) return;
    var s = spot();
    var x = s.x + DIR.x * machine.prog;
    var z = s.z + DIR.z * machine.prog;
    holder.position.set(x, apronY(z) - 0.004 + machine.crouch, z);
    holder.rotation.set(PITCH, machine.yaw, 0);
  }

  // The coat tint, per stance (see the shade-depth table):
  // the wide values are the approved grade; the narrow
  // values are the same warm family at two-thirds of the
  // light, so the phone fox sits as deep in his shade as
  // the desktop fox sits in his. Runs at load and again on
  // every stance flip, so a rotation or resize re-grades
  // him with the rest of the spot's shade.
  function applyTint() {
    if (!animalMats.length) return;
    var t = isNarrow() ? TINT_NARROW : TINT_WIDE;
    animalMats.forEach(function (m) { m.color.setRGB(t[0], t[1], t[2]); });
  }

  function applyStance() {
    placePool();
    placeVeil();
    placeFox();
    applyTint();
  }

  function easeYaw(target, rate, dt) {
    var d = target - machine.yaw;
    while (d > Math.PI) d -= Math.PI * 2;
    while (d < -Math.PI) d += Math.PI * 2;
    machine.yaw += d * Math.min(1, rate * dt);
  }

  function easeCrouch(target, rate, dt) {
    machine.crouch += (target - machine.crouch) * Math.min(1, rate * dt);
  }

  function playWalk(timeScale, fade) {
    if (!walkAction) return;
    walkAction.reset();
    walkAction.enabled = true;
    walkAction.setEffectiveWeight(1);
    walkAction.setEffectiveTimeScale(timeScale);
    walkAction.setLoop(THREE.LoopRepeat);
    walkAction.fadeIn(fade).play();
    if (idleAction) idleAction.fadeOut(fade);
  }

  function playIdle(fade) {
    if (!idleAction) return;
    idleAction.reset();
    idleAction.enabled = true;
    idleAction.setEffectiveWeight(1);
    idleAction.setLoop(THREE.LoopRepeat);
    idleAction.fadeIn(fade).play();
    if (walkAction) walkAction.fadeOut(fade);
  }

  function beginOut() {
    if (!walkAction) return; // no Walk, no scurry (see load)
    machine.state = "out";
    playWalk(WALK_OUT, 0.12);
  }

  function beginBack() {
    machine.state = "back";
    if (holder) holder.visible = true;
    playWalk(WALK_BACK, 0.25);
  }

  // QA and the curious: ask him to move. At rest he darts;
  // while gone he slips home. Mid-leg it is a no-op.
  fox.scurryNow = function () {
    if (dead || REDUCED || !fox.live) return;
    if (machine.state === "rest") beginOut();
    else if (machine.state === "gone") beginBack();
  };

  function tickMachine(dt) {
    var s = spot();
    switch (machine.state) {
      case "rest":
        easeYaw(YAW_REST, 3.5, dt);
        easeCrouch(0, 6, dt);
        machine.dwell -= dt;
        if (machine.dwell <= 0) beginOut();
        break;
      case "out":
        easeYaw(YAW_OUT, 10, dt);
        easeCrouch(-0.014, 8, dt);
        machine.prog += SPEED_OUT * dt;
        if (machine.prog >= s.exit) {
          machine.prog = s.exit;
          machine.state = "gone";
          machine.dwell = goneDwell();
          if (holder) holder.visible = false;
          if (walkAction) walkAction.fadeOut(0.1);
          if (idleAction) idleAction.fadeOut(0.1);
        }
        break;
      case "gone":
        machine.dwell -= dt;
        if (machine.dwell <= 0) beginBack();
        break;
      case "back":
        easeYaw(YAW_BACK, 6, dt);
        easeCrouch(-0.006, 8, dt);
        machine.prog -= SPEED_BACK * dt;
        if (machine.prog <= 0) {
          machine.prog = 0;
          machine.state = "rest";
          machine.dwell = restDwell();
          playIdle(0.3);
        }
        break;
    }
    fox.state = machine.state;
    placeFox();
  }

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

  function attach() {
    var buck = window.__lgcyBuck;
    if (dead || !buck || !buck.scene || fox.live) return;
    // The buck's group is the scene's only Group child: it
    // carries the rock, the apron, the contact shadow, and
    // the deer. The fox joins it so every layout the buck
    // layer applies (mirror, scale, off-center stance, the
    // narrow-screen ease toward center) applies to the fox
    // in the same breath.
    var group = null;
    buck.scene.children.forEach(function (c) {
      if (c.isGroup && !group) group = c;
    });
    if (!group) return;

    // The shade pool first, seated on the apron plane at
    // the spot, pitched with the slope like the apron
    // itself: a tongue of shade at the clearing's edge.
    pool = new THREE.Mesh(
      new THREE.PlaneGeometry(4.4, 4.4),
      new THREE.MeshBasicMaterial({
        map: poolTexture(), transparent: true, depthWrite: false
      })
    );
    pool.rotation.x = -Math.PI / 2 + Math.atan(0.2664);
    pool.scale.set(0.92, 1.38, 1);
    pool.renderOrder = 2;
    group.add(pool);

    // The shade veil behind the spot (see veilTexture):
    // an upright shade plane in the same construction, so
    // the photograph behind his corner is in shadow too.
    veil = new THREE.Mesh(
      new THREE.PlaneGeometry(3.4, 2.2),
      new THREE.MeshBasicMaterial({
        map: veilTexture(), transparent: true, depthWrite: false,
        side: THREE.DoubleSide
      })
    );
    veil.rotation.x = -0.05;
    veil.renderOrder = 1;
    group.add(veil);

    holder = new THREE.Group();
    group.add(holder);
    applyStance();
    window.addEventListener("resize", applyStance);
    fox.applyStance = applyStance;

    // The contact shadow, the buck's own construction at fox
    // scale: a soft radial shade just under the feet. It
    // rides the holder, so it grounds him at rest and all
    // along the scurry. The holder is already pitched onto
    // the apron's slope, so the shade lies flat in holder
    // space.
    var shadow = new THREE.Mesh(
      new THREE.PlaneGeometry(1.15, 1.7),
      new THREE.MeshBasicMaterial({
        map: shadowTexture(), transparent: true, depthWrite: false
      })
    );
    shadow.rotation.x = -Math.PI / 2;
    shadow.position.set(0, 0.006, 0);
    shadow.renderOrder = 3;
    holder.add(shadow);

    new GLTFLoader().load(
      "gl/animals/fox-rigged.glb",
      function (gltf) {
        if (dead) return;
        // Shade law for this seat (the inverse of the buck's
        // TW-1152 blend law): where the buck is graded warm
        // into the golden light, the fox is graded down into
        // shade, the same warm family at a third of the light
        // and a touch cooler, so he reads as a fox in shadow
        // and not as a lit animal pasted into a dark corner.
        // (First revision captures at half light still read
        // sunlit against the bright photograph; a third sits
        // in the shade's own value range.) The grade itself
        // is per stance: applyTint holds the values.
        gltf.scene.traverse(function (o) {
          if (o.isMesh && o.material && o.material.color
              && animalMats.indexOf(o.material) === -1) {
            animalMats.push(o.material);
          }
        });
        applyTint();
        animal = gltf.scene;
        holder.add(animal);
        mixer = new THREE.AnimationMixer(animal);
        gltf.animations.forEach(function (clip) {
          if (clip.name === "Idle") idleAction = mixer.clipAction(clip);
          if (clip.name === "Walk") walkAction = mixer.clipAction(clip);
        });
        if (idleAction) {
          idleAction.setLoop(THREE.LoopRepeat);
          idleAction.setEffectiveWeight(1);
          idleAction.play();
        }
        if (!walkAction && window.console && console.info) {
          // No Walk in the asset: he keeps his shade and
          // never scurries. The resident behavior stands.
          console.info("[lgcy-fox] no Walk clip; the fox keeps his shade");
          machine.dwell = Infinity;
        }
        if (REDUCED) mixer.update(0); // frame-0 stance, held
        fox.live = true;
        fox.holder = holder;
        // QA handles. rect() is the round-1 handle: the
        // holder's box, contact shadow included, so it
        // overstates the animal (Rosa's round-1 note N1).
        // animalRect() is the animal alone, for honest
        // placement reads.
        fox.rect = function () { return projectBox(holder); };
        fox.animalRect = function () { return animal ? projectBox(animal) : null; };
        // Tick through the buck loop's guest hook, so the fox
        // renders only when the buck renders (section visible,
        // tier earned) and costs nothing when it does not.
        buck.tickFns = buck.tickFns || [];
        buck.tickFns.push(function (dt) {
          if (dead || REDUCED || !mixer) return;
          var step = Math.min(dt, 0.05);
          tickMachine(step);
          mixer.update(step);
        });
      },
      undefined,
      function () {
        if (window.console && console.info) {
          console.info("[lgcy-fox] asset failed; the buck stands as he was");
        }
        if (holder && holder.parent) holder.parent.remove(holder);
        holder = null;
        if (pool && pool.parent) pool.parent.remove(pool);
        pool = null;
        if (veil && veil.parent) veil.parent.remove(veil);
        veil = null;
      }
    );
  }

  function die() {
    if (dead) return;
    dead = true;
    fox.live = false;
    if (fox.applyStance) window.removeEventListener("resize", fox.applyStance);
    if (mixer) mixer.stopAllAction();
    if (holder && holder.parent) holder.parent.remove(holder);
    holder = null;
    if (pool && pool.parent) pool.parent.remove(pool);
    pool = null;
    if (veil && veil.parent) veil.parent.remove(veil);
    veil = null;
  }

  window.addEventListener("lgcy-buck-ready", attach);
  window.addEventListener("lgcy-buck-teardown", die);
  // Belt and braces: if this module somehow runs after the
  // buck is already live, take the seat directly.
  if (window.__lgcyBuck && window.__lgcyBuck.scene) attach();
})();

