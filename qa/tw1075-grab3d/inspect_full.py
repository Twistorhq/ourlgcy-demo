# TW-1075 Phase A: focused renders on the FULL GLB + legs/hooves close-up.
# Usage: blender -b --factory-startup -P inspect_full.py -- --glb <path> --out <dir>
import math
import os
import sys

import bpy
from mathutils import Vector


def look_at(cam, target):
    d = Vector(target) - cam.location
    cam.rotation_euler = d.to_track_quat("-Z", "Y").to_euler()


argv = sys.argv[sys.argv.index("--") + 1 :]
cfg = {}
i = 0
while i < len(argv):
    cfg[argv[i].lstrip("-")] = argv[i + 1]
    i += 2

bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath=cfg["glb"])
outdir = cfg["out"]
os.makedirs(outdir, exist_ok=True)

scene = bpy.context.scene
scene.render.engine = "CYCLES"
scene.cycles.samples = 32
scene.cycles.use_denoising = True
scene.cycles.device = "CPU"
scene.render.resolution_x = 960
scene.render.resolution_y = 540
world = bpy.data.worlds.new("W")
scene.world = world
world.use_nodes = True
bg = world.node_tree.nodes.get("Background")
bg.inputs[0].default_value = (0.42, 0.44, 0.42, 1.0)
bg.inputs[1].default_value = 0.9

sun = bpy.data.objects.new("Sun", bpy.data.lights.new("Sun", "SUN"))
sun.data.energy = 3.0
sun.rotation_euler = (math.radians(50), math.radians(10), math.radians(35))
scene.collection.objects.link(sun)
area = bpy.data.objects.new("Key", bpy.data.lights.new("Key", "AREA"))
area.data.energy = 500
area.data.shape = "DISK"
area.data.size = 4.0
area.location = (2.5, -2.5, 3.0)
scene.collection.objects.link(area)
look_at(area, (0, 0, 0.85))

bpy.ops.mesh.primitive_plane_add(size=30, location=(0, 0, -0.001))
ground = bpy.context.object
gmat = bpy.data.materials.new("ground")
gmat.use_nodes = True
gmat.node_tree.nodes["Principled BSDF"].inputs["Base Color"].default_value = (
    0.36,
    0.38,
    0.35,
    1,
)
ground.data.materials.append(gmat)

cam_data = bpy.data.cameras.new("Cam")
cam = bpy.data.objects.new("Cam", cam_data)
scene.collection.objects.link(cam)
scene.camera = cam

# head end is -Y (verified on the light variant); bounds 0.591 x 1.564 x 1.700, z 0..1.70
shots = [
    # founder composition: front three-quarter from the right, mid height
    ("full-tq-front-right", (1.55, -1.95, 1.05), (0, -0.15, 0.92), 50),
    # face close-up from front-right
    ("full-close-face", (0.62, -1.28, 1.52), (0.0, -0.66, 1.32), 85),
    # front legs + hooves, low camera
    ("full-close-legs", (0.85, -1.35, 0.34), (0.0, -0.60, 0.22), 70),
    # hindquarters + tail three-quarter
    ("full-tq-rear-left", (-1.5, 1.9, 1.1), (0, 0.25, 0.9), 50),
]
for name, pos, tgt, lens in shots:
    cam_data.lens = lens
    cam.location = pos
    look_at(cam, tgt)
    scene.render.filepath = os.path.join(outdir, f"{name}.png")
    bpy.ops.render.render(write_still=True)
    print("@@RENDER@@", name)
