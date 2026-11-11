import math
import random
import sys
from pathlib import Path

import bmesh
import bpy
from mathutils import Vector

argv = sys.argv[sys.argv.index("--") + 1 :] if "--" in sys.argv else []


def arg(name, default=None):
    return argv[argv.index(name) + 1] if name in argv else default


OUT = Path(arg("--out", "render"))
FRAME = arg("--frame")
SCALE = int(arg("--scale", "100"))

FPS = 30
LOOP = 600
TAU = math.tau
random.seed(11)


def srgb(hex_color, alpha=1.0):
    def lin(c):
        c /= 255
        return c / 12.92 if c <= 0.04045 else ((c + 0.055) / 1.055) ** 2.4

    h = hex_color.lstrip("#")
    return tuple(lin(int(h[i : i + 2], 16)) for i in (0, 2, 4)) + (alpha,)


PAGE = srgb("#fdfffb")
INK = srgb("#7c88c9")


bpy.ops.wm.read_factory_settings(use_empty=True)
scene = bpy.context.scene
scene.render.engine = "BLENDER_EEVEE"
scene.render.resolution_x, scene.render.resolution_y = 1920, 1080
scene.render.resolution_percentage = SCALE
scene.render.fps = FPS
scene.frame_start, scene.frame_end = 1, LOOP
scene.render.filter_size = 1.2
scene.view_settings.view_transform = "Standard"
scene.eevee.taa_render_samples = 32

world = bpy.data.worlds.new("World")
scene.world = world
world.use_nodes = True
wn, wl = world.node_tree.nodes, world.node_tree.links
wn.clear()
backdrop = wn.new("ShaderNodeBackground")
backdrop.inputs["Color"].default_value = PAGE
ambient = wn.new("ShaderNodeBackground")
ambient.inputs["Color"].default_value = srgb("#c8d4ff")
ambient.inputs["Strength"].default_value = 0.15
camera_ray = wn.new("ShaderNodeLightPath")
pick = wn.new("ShaderNodeMixShader")
wl.new(camera_ray.outputs["Is Camera Ray"], pick.inputs[0])
wl.new(ambient.outputs[0], pick.inputs[1])
wl.new(backdrop.outputs[0], pick.inputs[2])
wl.new(pick.outputs[0], wn.new("ShaderNodeOutputWorld").inputs["Surface"])


def ramp(nodes, stops, constant=True):
    node = nodes.new("ShaderNodeValToRGB")
    node.color_ramp.interpolation = "CONSTANT" if constant else "EASE"
    els = node.color_ramp.elements
    els[0].position, els[0].color = stops[0]
    els[1].position, els[1].color = stops[-1]
    for pos, color in stops[1:-1]:
        els.new(pos).color = color
    return node


def toon(name, light, mid, shadow, glint=0.9, rim=0.35):
    mat = bpy.data.materials.new(name)
    mat.use_nodes = True
    nodes, links = mat.node_tree.nodes, mat.node_tree.links
    nodes.clear()
    out = nodes.new("ShaderNodeOutputMaterial")

    diffuse = nodes.new("ShaderNodeBsdfDiffuse")
    to_rgb = nodes.new("ShaderNodeShaderToRGB")
    links.new(diffuse.outputs[0], to_rgb.inputs[0])
    bands = ramp(nodes, [(0.0, shadow), (0.05, mid), (0.25, light)])
    links.new(to_rgb.outputs["Color"], bands.inputs["Fac"])
    color = bands.outputs["Color"]

    def add(fac_socket, amount, tint=(1, 1, 1, 1)):
        nonlocal color
        mix = nodes.new("ShaderNodeMix")
        mix.data_type = "RGBA"
        mix.blend_type = "ADD"
        scale = nodes.new("ShaderNodeMath")
        scale.operation = "MULTIPLY"
        scale.inputs[1].default_value = amount
        links.new(fac_socket, scale.inputs[0])
        links.new(scale.outputs[0], mix.inputs[0])
        links.new(color, mix.inputs[6])
        mix.inputs[7].default_value = tint
        color = mix.outputs[2]

    if glint:
        glossy = nodes.new("ShaderNodeBsdfGlossy")
        glossy.inputs["Roughness"].default_value = 0.18
        g_rgb = nodes.new("ShaderNodeShaderToRGB")
        links.new(glossy.outputs[0], g_rgb.inputs[0])
        g_cut = ramp(nodes, [(0.0, (0, 0, 0, 1)), (0.55, (1, 1, 1, 1))])
        links.new(g_rgb.outputs["Color"], g_cut.inputs["Fac"])
        add(g_cut.outputs["Color"], glint)

    if rim:
        weight = nodes.new("ShaderNodeLayerWeight")
        weight.inputs["Blend"].default_value = 0.35
        r_cut = ramp(nodes, [(0.0, (0, 0, 0, 1)), (0.72, (1, 1, 1, 1))])
        links.new(weight.outputs["Facing"], r_cut.inputs["Fac"])
        add(r_cut.outputs["Color"], rim, srgb("#e8eeff"))

    emit = nodes.new("ShaderNodeEmission")
    links.new(color, emit.inputs["Color"])
    links.new(emit.outputs[0], out.inputs["Surface"])
    return mat


def ink():
    mat = bpy.data.materials.new("Ink")
    mat.use_nodes = True
    nodes = mat.node_tree.nodes
    nodes.clear()
    emit = nodes.new("ShaderNodeEmission")
    emit.inputs["Color"].default_value = INK
    out = nodes.new("ShaderNodeOutputMaterial")
    mat.node_tree.links.new(emit.outputs[0], out.inputs["Surface"])
    mat.use_backface_culling = True
    return mat


INK_MAT = ink()
BACKBONE = toon("Backbone", srgb("#f4f7ff"), srgb("#c9d6ff"), srgb("#93a8f5"))
SUGAR = toon("Sugar", srgb("#ffffff"), srgb("#dbe4ff"), srgb("#a9b8f2"))
PHOSPHATE = toon("Phosphate", srgb("#c3d3ff"), srgb("#a6bcf8"), srgb("#8ba3ee"))
BASES = {
    "A": toon("BaseA", srgb("#b9cdff"), srgb("#9bb5fb"), srgb("#7f9cf0")),
    "T": toon("BaseT", srgb("#c4eeff"), srgb("#a2dcf7"), srgb("#82c4ec")),
    "G": toon("BaseG", srgb("#d6caff"), srgb("#bcaaf8"), srgb("#a08ced")),
    "C": toon("BaseC", srgb("#f6d6ff"), srgb("#e6b9f7"), srgb("#d29deb")),
}
BUBBLE = toon("Bubble", srgb("#ffffff"), srgb("#e3eaff"), srgb("#c3d0ff"), glint=1.0, rim=0.2)


def outline(obj, thickness):
    if len(obj.data.materials) < 2:
        obj.data.materials.append(INK_MAT)
    mod = obj.modifiers.new("Outline", "SOLIDIFY")
    mod.thickness = thickness
    mod.offset = 1.0
    mod.use_flip_normals = True
    mod.use_rim = False
    mod.material_offset = 1


def link(obj, parent=None):
    scene.collection.objects.link(obj)
    obj.parent = parent
    return obj


def empty(name, parent=None, location=(0, 0, 0), rotation=(0, 0, 0)):
    obj = link(bpy.data.objects.new(name, None), parent)
    obj.location = location
    obj.rotation_euler = rotation
    return obj


def drive(target, path, expression, index=-1):
    fc = target.driver_add(path, index) if index >= 0 else target.driver_add(path)
    fc.driver.type = "SCRIPTED"
    fc.driver.expression = expression


def sphere_mesh(name, radius, segments=32):
    mesh = bpy.data.meshes.new(name)
    bm = bmesh.new()
    bmesh.ops.create_uvsphere(bm, u_segments=segments, v_segments=segments // 2, radius=radius)
    for f in bm.faces:
        f.smooth = True
    bm.to_mesh(mesh)
    bm.free()
    return mesh


def capsule_mesh(name, radius, length):
    mesh = bpy.data.meshes.new(name)
    bm = bmesh.new()
    bmesh.ops.create_uvsphere(bm, u_segments=32, v_segments=16, radius=radius)
    for v in bm.verts:
        if v.co.z > 1e-5:
            v.co.z += length - radius * 2
        v.co.z += radius
    for f in bm.faces:
        f.smooth = True
    bm.to_mesh(mesh)
    bm.free()
    return mesh


def instance(mesh, mat, parent, location, scale=(1, 1, 1), direction=None, ink_width=0.03):
    obj = link(bpy.data.objects.new(mesh.name, mesh), parent)
    obj.location = location
    if direction is not None:
        obj.rotation_mode = "QUATERNION"
        obj.rotation_quaternion = direction.to_track_quat("Z", "Y")
    obj.scale = scale
    obj.material_slots[0].link = "OBJECT"
    obj.material_slots[0].material = mat
    outline(obj, ink_width)
    return obj


PAIRS_PER_TURN = 10
GROOVE = TAU * 0.4
SPAN = 26.0
SEQUENCE = ["AT", "GC", "TA", "CG", "AT", "AT", "GC", "CG", "TA", "GC"]

bead = sphere_mesh("Bead", 1.0)
bead.materials.append(SUGAR)
base = capsule_mesh("Base", 0.11, 1.0)
base.materials.append(BASES["A"])


def build_helix(name, location, tilt, radius, pitch, ink_width):
    k = TAU / pitch
    rise = pitch / PAIRS_PER_TURN
    scale = radius

    def point(x, phase):
        a = k * x + phase
        return Vector((x, radius * math.cos(a), radius * math.sin(a)))

    rig = empty(name, location=location, rotation=(0, 0, math.radians(tilt)))
    helix = empty(name + "Spin", rig)
    drive(helix, "rotation_euler", f"(frame - 1) / {LOOP} * {TAU:.6f}", 0)

    for strand, phase in (("A", 0.0), ("B", GROOVE)):
        data = bpy.data.curves.new(f"{name}Strand{strand}", "CURVE")
        data.dimensions = "3D"
        data.bevel_depth = 0.13 * scale
        data.bevel_resolution = 6
        data.use_fill_caps = True
        spline = data.splines.new("POLY")
        n = 700
        spline.points.add(n - 1)
        for i, p in enumerate(spline.points):
            x = -SPAN / 2 + SPAN * i / (n - 1)
            p.co = (*point(x, phase), 1.0)
        obj = link(bpy.data.objects.new(data.name, data), helix)
        obj.data.materials.append(BACKBONE)
        outline(obj, ink_width)

    for i in range(int(SPAN / rise)):
        x = -SPAN / 2 + (i + 0.5) * rise
        a = point(x, 0.0)
        b = point(x, GROOVE)
        left, right = SEQUENCE[i % PAIRS_PER_TURN]
        for p in (a, b):
            instance(bead, SUGAR, helix, p, (0.2 * scale,) * 3, ink_width=ink_width)
        mid = a.lerp(b, 0.5)
        gap = (b - a).normalized() * 0.04 * scale
        for start, end, letter in ((a, mid - gap, left), (b, mid + gap, right)):
            direction = end - start
            instance(
                base,
                BASES[letter],
                helix,
                start,
                (scale, scale, direction.length),
                direction,
                ink_width=ink_width,
            )


build_helix("Helix", (0.0, 0.0, -0.2), 6, 1.0, 3.6, 0.03)


bubble = sphere_mesh("Bubble", 1.0, 24)
bubble.materials.append(BUBBLE)
for i in range(18):
    centre = Vector((random.uniform(-7.0, 7.0), random.uniform(-1.5, 2.5), random.uniform(-3.4, 3.4)))
    size = random.uniform(0.05, 0.12)
    obj = instance(bubble, BUBBLE, None, centre, (size,) * 3, ink_width=0.016)
    r = random.uniform(0.15, 0.35)
    ph = random.uniform(0, TAU)
    turns = random.choice((1, -1))
    w = f"((frame - 1) / {LOOP} * {TAU * turns:.6f} + {ph:.4f})"
    drive(obj, "location", f"{centre.x:.4f} + {r:.4f} * cos({w})", 0)
    drive(obj, "location", f"{centre.z:.4f} + {r:.4f} * sin({w})", 2)


sun = bpy.data.lights.new("Sun", "SUN")
sun.energy = 4.5
sun.angle = math.radians(8)
sun_obj = link(bpy.data.objects.new("Sun", sun))
sun_obj.rotation_euler = (math.radians(50), math.radians(-30), math.radians(-35))

cam_data = bpy.data.cameras.new("Camera")
cam_data.lens = 50
cam = link(bpy.data.objects.new("Camera", cam_data))
cam.location = (0.0, -15.0, 0.0)
cam.rotation_euler = (math.radians(90), 0, 0)
scene.camera = cam


scene.render.image_settings.file_format = "PNG"
scene.render.image_settings.color_mode = "RGB"

if arg("--save"):
    bpy.ops.wm.save_as_mainfile(filepath=str(Path(arg("--save")).resolve()))
elif FRAME is not None:
    OUT.mkdir(parents=True, exist_ok=True)
    scene.frame_set(int(FRAME))
    scene.render.filepath = str(OUT / f"frame-{int(FRAME):04d}.png")
    bpy.ops.render.render(write_still=True)
else:
    OUT.mkdir(parents=True, exist_ok=True)
    scene.render.filepath = str(OUT / "frame-")
    bpy.ops.render.render(animation=True)
