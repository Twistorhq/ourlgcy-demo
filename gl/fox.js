// Our LGCY, TW-1298: the fox at the threshold.
//
// The founder's word (2026-11-23): add the fox that is already
// built into the scene, to the left of the deer in the open
// space; no need to recreate the wheel. The fox is the
// Mesh2Motion red fox (CC0), pulled onto the house shelf under
// TW-1292 and assembled scene-ready by the Blender lane
// (FOX-SCENE-LOG.md): rig-fox.blend's own skinned fox with its
// authored Idle and Walk clips, scaled against the deer. This
// module models and rigs nothing; it places that fox.
//
// Placement is a guest seat in the buck's own scene, on the
// contract gl/buck.js publishes for guests: it waits for
// lgcy-buck-ready, builds into the buck's group (so the fox
// inherits the buck's mirror, scale, light, and narrow-screen
// layout exactly), ticks its mixer through the buck's tickFns
// hook, and dies on lgcy-buck-teardown. The buck's group sits
// in the right third of the frame (TW-1152), mirrored, so the
// group's local +x reads as frame left on screen: the stance
// below stands the fox on the outcrop's left shoulder, in the
// open space beside the deer, on the same stone.
//
// Fail-closed, per guest: if the fox's asset fails, this module
// goes quiet and the buck stands exactly as he did. The fox
// never tears the layer down. If the buck layer itself never
// earns the device, lgcy-buck-ready never fires and there is
// no fox; the section stays a quiet divider, as before.
//
// Animation law, same as the buck's: only the baked clip
// plays. Idle is the resident behavior, looping; there is no
// procedural bone layer here either. (The GLB also carries
// its authored Walk, but a walk cycle played standing in
// place reads as a treadmill, so it stays unplayed.) Reduced
// motion holds the frame-0 stance.
//
// QA overrides ride the buck's: ?gl=force-a, ?gl=off.

import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";

(function () {
  "use strict";

  var REDUCED = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  // The stances, in buck-group space, solved against the
  // built scene (raycasts over the rock and apron the buck
  // layer builds, TW-1298 QA drives; footprint corners
  // sampled, y is the lowest surface under the feet less a
  // 4 mm seat, rotX is the pitch that lays the feet on the
  // surface's own slope along z; with the default Euler
  // order the pitch applies in group space, about the
  // group's x axis, which is the slope's axis).
  //
  // Wide: past x +1.3 the rock has fallen below the ground
  // apron, and at z +0.62 the whole footprint stands on the
  // apron's own plane (surface +0.008 there, x-independent),
  // in the open ground left of the deer; rotX is the apron's
  // slope, atan(0.2664), the ground falling toward the
  // viewer.
  //
  // Narrow: the buck's layout eases the group toward center
  // on phones, and the apron stance lands half out of the
  // phone frame; every inward apron spot straddles the
  // rock's steep front face (footprint surfaces spreading
  // 0.18-0.23 under one fox). So on narrow screens the fox
  // keeps the deer's own ground instead: the outcrop's left
  // shoulder at (1.05, 0), the flattest spot measured
  // anywhere on the rock (footprint spread 0.043, pitch
  // 0.097), standing at the buck's level with the whole
  // animal inside the frame.
  //
  // The fox is authored facing -Y in Blender space, which
  // the glTF export carries as +Z; the yaw turns it
  // three-quarter toward the deer and the arriving visitor.
  var STANCE_WIDE = { pos: [1.50, 0.004, 0.62], rotY: -0.62, rotX: 0.262 };
  var STANCE_NARROW = { pos: [1.05, 0.169, 0.0], rotY: -0.62, rotX: 0.097 };

  var dead = false;
  var mixer = null;
  var holder = null;

  var fox = { live: false };
  window.__lgcyFox = fox;

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

    holder = new THREE.Group();
    group.add(holder);

    // The stance follows the buck layer's own narrow test
    // (camera aspect under 1.1), reapplied on resize, so the
    // fox steps inward exactly when the buck eases toward
    // center.
    function applyStance() {
      var s = buck.camera.aspect < 1.1 ? STANCE_NARROW : STANCE_WIDE;
      holder.position.set(s.pos[0], s.pos[1], s.pos[2]);
      holder.rotation.set(s.rotX, s.rotY, 0);
    }
    applyStance();
    window.addEventListener("resize", applyStance);
    fox.applyStance = applyStance;

    // The contact shadow, the buck's own construction at fox
    // scale: a soft radial shade just under the feet. The
    // holder is already pitched onto the apron's slope, so
    // the shade lies flat in holder space.
    var shadow = new THREE.Mesh(
      new THREE.PlaneGeometry(1.15, 1.7),
      new THREE.MeshBasicMaterial({
        map: shadowTexture(), transparent: true, depthWrite: false
      })
    );
    shadow.rotation.x = -Math.PI / 2;
    shadow.position.set(0, 0.006, 0);
    shadow.renderOrder = 2;
    holder.add(shadow);

    new GLTFLoader().load(
      "gl/animals/fox-rigged.glb",
      function (gltf) {
        if (dead) return;
        // Blend law (TW-1152), the same warm tint the buck
        // layer multiplies into the deer's coat, so the fox
        // sits in the same golden forest light.
        gltf.scene.traverse(function (o) {
          if (o.isMesh && o.material && o.material.color) {
            o.material.color.setRGB(1.0, 0.95, 0.87);
          }
        });
        holder.add(gltf.scene);
        mixer = new THREE.AnimationMixer(gltf.scene);
        var idle = null;
        gltf.animations.forEach(function (clip) {
          if (clip.name === "Idle") idle = mixer.clipAction(clip);
        });
        if (idle) {
          idle.setLoop(THREE.LoopRepeat);
          idle.setEffectiveWeight(1);
          idle.play();
        }
        if (REDUCED) mixer.update(0); // frame-0 stance, held
        fox.live = true;
        fox.holder = holder;
        // QA handle, same spirit as the buck's deerRect: the
        // fox's box on the canvas, in canvas pixels.
        fox.rect = function () {
          var b = new THREE.Box3().setFromObject(holder);
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
        };
        // Tick through the buck loop's guest hook, so the fox
        // renders only when the buck renders (section visible,
        // tier earned) and costs nothing when it does not.
        buck.tickFns = buck.tickFns || [];
        buck.tickFns.push(function (dt) {
          if (dead || REDUCED || !mixer) return;
          mixer.update(Math.min(dt, 0.05));
        });
      },
      undefined,
      function () {
        if (window.console && console.info) {
          console.info("[lgcy-fox] asset failed; the buck stands as he was");
        }
        if (holder && holder.parent) holder.parent.remove(holder);
        holder = null;
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
  }

  window.addEventListener("lgcy-buck-ready", attach);
  window.addEventListener("lgcy-buck-teardown", die);
  // Belt and braces: if this module somehow runs after the
  // buck is already live, take the seat directly.
  if (window.__lgcyBuck && window.__lgcyBuck.scene) attach();
})();
