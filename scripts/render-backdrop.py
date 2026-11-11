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


SCENE = arg("--scene", "log")
OUT = Path(arg("--out", f"render-{SCENE}"))
FRAME = arg("--frame")
SCALE = int(arg("--scale", "100"))

FPS = 30
LOOP = 480
TAU = math.tau
T = f"((frame - 1) / {LOOP})"
random.seed(7)


def srgb(hex_color, alpha=1.0):
    def lin(c):
        c /= 255
        return c / 12.92 if c <= 0.04045 else ((c + 0.055) / 1.055) ** 2.4

    h = hex_color.lstrip("#")
    return tuple(lin(int(h[i : i + 2], 16)) for i in (0, 2, 4)) + (alpha,)


bpy.ops.wm.read_factory_settings(use_empty=True)
scene = bpy.context.scene
scene.render.engine = "BLENDER_EEVEE"
scene.render.resolution_x, scene.render.resolution_y = 1920, 1080
scene.render.resolution_percentage = SCALE
scene.render.fps = FPS
scene.frame_start, scene.frame_end = 1, int(arg("--end", LOOP))
scene.render.filter_size = 1.2
scene.render.film_transparent = True
scene.view_settings.view_transform = "Standard"
scene.eevee.taa_render_samples = 32

world = bpy.data.worlds.new("World")
scene.world = world
world.use_nodes = True
wn, wl = world.node_tree.nodes, world.node_tree.links
wn.clear()
ambient = wn.new("ShaderNodeBackground")
ambient.inputs["Color"].default_value = srgb("#c8ccff")
ambient.inputs["Strength"].default_value = 0.15
wl.new(ambient.outputs[0], wn.new("ShaderNodeOutputWorld").inputs["Surface"])


def ramp(nodes, stops):
    node = nodes.new("ShaderNodeValToRGB")
    node.color_ramp.interpolation = "CONSTANT"
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
    bands = ramp(nodes, [(0.0, srgb(shadow)), (0.05, srgb(mid)), (0.25, srgb(light))])
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
        add(r_cut.outputs["Color"], rim, srgb("#ece8ff"))

    emit = nodes.new("ShaderNodeEmission")
    links.new(color, emit.inputs["Color"])
    links.new(emit.outputs[0], out.inputs["Surface"])
    return mat


def ink_material():
    mat = bpy.data.materials.new("Ink")
    mat.use_nodes = True
    nodes = mat.node_tree.nodes
    nodes.clear()
    links = mat.node_tree.links
    emit = nodes.new("ShaderNodeEmission")
    emit.inputs["Color"].default_value = srgb("#4c52c2")
    clear = nodes.new("ShaderNodeBsdfTransparent")
    path = nodes.new("ShaderNodeLightPath")
    pick = nodes.new("ShaderNodeMixShader")
    links.new(path.outputs["Is Shadow Ray"], pick.inputs[0])
    links.new(emit.outputs[0], pick.inputs[1])
    links.new(clear.outputs[0], pick.inputs[2])
    out = nodes.new("ShaderNodeOutputMaterial")
    links.new(pick.outputs[0], out.inputs["Surface"])
    mat.use_backface_culling = True
    if hasattr(mat, "use_transparent_shadow"):
        mat.use_transparent_shadow = True
    return mat


INK = ink_material()
BLUE = toon("Blue", "#a9b6ff", "#7484ff", "#5056e0")
DEEP = toon("Deep", "#8f9bff", "#5d68f5", "#3f43c9")
LAVENDER = toon("Lavender", "#ddd2ff", "#b4a2ff", "#8c78f0")
PALE = toon("Pale", "#f5f4ff", "#d3d6ff", "#a5abf5", glint=1.0, rim=0.2)


def outline(obj, thickness):
    if len(obj.data.materials) < 2:
        obj.data.materials.append(INK)
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


def sphere_mesh(name, radius=1.0, segments=32):
    mesh = bpy.data.meshes.new(name)
    bm = bmesh.new()
    bmesh.ops.create_uvsphere(bm, u_segments=segments, v_segments=segments // 2, radius=radius)
    for f in bm.faces:
        f.smooth = True
    bm.to_mesh(mesh)
    bm.free()
    return mesh


def capsule_mesh(name, radius, length=1.0):
    mesh = bpy.data.meshes.new(name)
    bm = bmesh.new()
    bmesh.ops.create_uvsphere(bm, u_segments=24, v_segments=12, radius=radius)
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


def tube(name, points, radius, mat, parent=None, ink_width=0.03):
    data = bpy.data.curves.new(name, "CURVE")
    data.dimensions = "3D"
    data.bevel_depth = radius
    data.bevel_resolution = 6
    data.use_fill_caps = True
    spline = data.splines.new("POLY")
    spline.points.add(len(points) - 1)
    for p, co in zip(spline.points, points):
        p.co = (*co, 1.0)
    obj = link(bpy.data.objects.new(name, data), parent)
    obj.data.materials.append(mat)
    outline(obj, ink_width)
    return obj


BEAD = sphere_mesh("Bead")
BEAD.materials.append(PALE)
RUNG = capsule_mesh("Rung", 0.11)
RUNG.materials.append(LAVENDER)


def helix_segment(name, start, end, radius, pairs_per_turn=8, parent=None):
    start, end = Vector(start), Vector(end)
    axis = end - start
    length = axis.length
    pitch = radius * 4.2
    k = TAU / pitch
    groove = TAU * 0.4
    ink_width = max(0.012, radius * 0.07)

    rig = empty(name, parent, location=start, rotation=(0, -math.atan2(axis.z, axis.x), 0))
    spin = empty(name + "Spin", rig)
    drive(spin, "rotation_euler", f"{T} * {TAU:.6f}", 0)

    def point(x, phase):
        a = k * x + phase
        return Vector((x, radius * math.cos(a), radius * math.sin(a)))

    for strand, phase in (("A", 0.0), ("B", groove)):
        n = max(40, int(length * 90))
        pts = [point(length * i / (n - 1), phase) for i in range(n)]
        tube(f"{name}{strand}", pts, 0.13 * radius, BLUE, spin, ink_width)

    rise = pitch / pairs_per_turn
    for i in range(int(length / rise)):
        x = (i + 0.5) * rise
        a, b = point(x, 0.0), point(x, groove)
        for p in (a, b):
            instance(BEAD, PALE, spin, p, (0.2 * radius,) * 3, ink_width=ink_width)
        direction = b - a
        mat = LAVENDER if i % 2 else DEEP
        instance(RUNG, mat, spin, a, (radius, radius, direction.length), direction, ink_width)


def build_log():
    knot = sphere_mesh("Knot", 1.0, 40)
    knot.materials.append(PALE)
    sap = sphere_mesh("Sap", 1.0, 24)
    sap.materials.append(LAVENDER)
    flow = f"(({T} * 2) % 1)"

    def grow(parent, name, location, angle, length, radius, depth, level):
        joint = empty(name, parent, location=location)
        sway = 0.035 + 0.02 * level
        drive(
            joint,
            "rotation_euler",
            f"{angle:.4f} + {sway:.4f} * sin(({T} - {level * 0.09:.3f}) * {TAU:.6f})",
            1,
        )
        helix_segment(name + "Helix", (0, 0, 0), (0, 0, length), radius, parent=joint)

        pulse = instance(sap, LAVENDER, joint, (0, 0, 0), (0.1,) * 3, ink_width=0.3)
        drive(pulse, "location", f"{length:.4f} * {flow}", 2)
        size = radius * 0.32
        for axis in range(3):
            drive(pulse, "scale", f"{size:.4f} * sin(3.14159 * {flow})", axis)

        tip = (0, 0, length)
        if depth == 0:
            bud = instance(knot, PALE, joint, tip, (0.1,) * 3, ink_width=0.025 / 0.15)
            expr = f"0.15 * (1 + 0.25 * max(0, sin(({T} * 2 - 0.15) * {TAU:.6f})) ** 4)"
            for axis in range(3):
                drive(bud, "scale", expr, axis)
            return
        instance(knot, PALE, joint, tip, (radius * 0.55,) * 3, ink_width=0.03 / (radius * 0.55))
        spread = (0.6, 0.48, 0.4, 0.34)[level] if level < 4 else 0.3
        for side in (-1, 1):
            grow(
                joint,
                f"{name}{'L' if side < 0 else 'R'}",
                tip,
                side * spread,
                length * 0.7,
                radius * 0.78,
                depth - 1,
                level + 1,
            )

    grow(None, "Trunk", (0, 0, -4.3), 0.0, 2.5, 0.46, 4, 0)


def fibonacci_sphere(count, radius, offset=0.0):
    golden = math.pi * (3 - math.sqrt(5))
    points = []
    for i in range(count):
        z = 1 - 2 * (i + 0.5) / count
        r = math.sqrt(1 - z * z)
        a = golden * i + offset
        points.append(Vector((r * math.cos(a), r * math.sin(a), z)) * radius)
    return points


def build_projects():
    tilt = empty("Tilt", rotation=(math.radians(-16), 0, 0))
    rig = empty("Network", tilt)
    drive(rig, "rotation_euler", f"{T} * {TAU:.6f}", 2)

    node_mesh = sphere_mesh("Node", 1.0, 40)
    node_mesh.materials.append(BLUE)
    pulse_mesh = sphere_mesh("Pulse", 1.0, 24)
    pulse_mesh.materials.append(LAVENDER)
    edge_mesh = capsule_mesh("Edge", 0.05)
    edge_mesh.materials.append(PALE)

    def node(p, size, mat, phase):
        obj = instance(node_mesh, mat, rig, p, (size,) * 3, ink_width=0.03 / size)
        expr = f"{size} * (1 + 0.16 * max(0, sin(({T} * 2 - {phase:.3f}) * {TAU:.6f})) ** 8)"
        for axis in range(3):
            drive(obj, "scale", expr, axis)

    def edge(a, b):
        direction = b - a
        instance(edge_mesh, PALE, rig, a, (1, 1, direction.length), direction, 0.012)

    def ring(count, radius, z, offset=0.0):
        return [
            Vector((radius * math.cos(TAU * i / count + offset), radius * math.sin(TAU * i / count + offset), z))
            for i in range(count)
        ]

    top, bottom = Vector((0, 0, 2.35)), Vector((0, 0, -2.35))
    upper = ring(6, 1.5, 1.25)
    middle = ring(10, 2.6, 0.0, TAU / 20)
    lower = ring(6, 1.5, -1.25)

    paths = []
    for hub, layer in ((top, upper), (bottom, lower)):
        for p in layer:
            edge(hub, p)
            paths.append((hub, p))
    for m in middle:
        for layer in (upper, lower):
            q = min(layer, key=lambda v: (v - m).length)
            edge(q, m)
            paths.append((q, m))

    node(top, 0.34, DEEP, 0.0)
    node(bottom, 0.34, DEEP, 0.5)
    for p in upper:
        node(p, 0.2, BLUE, 0.12)
    for p in lower:
        node(p, 0.2, BLUE, 0.62)
    for p in middle:
        node(p, 0.17, LAVENDER, 0.3)

    for i, (a, b) in enumerate(paths):
        pulse = instance(pulse_mesh, LAVENDER, rig, a, (0.08,) * 3, ink_width=0.03 / 0.08)
        ph = (i * 0.173) % 1
        f = f"(({T} * 2 + {ph:.4f}) % 1)"
        for axis, (ca, cb) in enumerate(zip(a, b)):
            drive(pulse, "location", f"{ca:.4f} + {cb - ca:.4f} * {f}", axis)
        for axis in range(3):
            drive(pulse, "scale", f"0.08 * sin(3.14159 * {f})", axis)


def build_about():
    rig = empty("Question")
    drive(rig, "location", f"0.14 * sin({T} * {TAU:.6f})", 2)
    drive(rig, "rotation_euler", f"0.38 * sin({T} * {TAU:.6f})", 2)
    drive(rig, "rotation_euler", f"0.05 * sin({T} * {TAU * 2:.6f})", 0)

    r = 0.95
    cz = 1.05
    pts = []
    for i in range(80):
        theta = math.radians(165 - (165 + 45) * i / 79)
        pts.append(Vector((r * math.cos(theta), 0, cz + r * math.sin(theta))))
    e = pts[-1]
    d = Vector((math.sin(math.radians(-45)), 0, -math.cos(math.radians(-45))))
    s = Vector((0, 0, -0.35))
    c1 = e + d * 0.45
    c2 = s + Vector((0, 0, 0.4))
    for i in range(1, 30):
        t = i / 29
        u = 1 - t
        pts.append(u**3 * e + 3 * u * u * t * c1 + 3 * u * t * t * c2 + t**3 * s)
    pts.append(Vector((0, 0, -0.75)))
    tube("Hook", pts, 0.3, DEEP, rig, ink_width=0.035)

    dot = sphere_mesh("Dot", 1.0, 48)
    dot.materials.append(DEEP)
    for cap in (pts[0], pts[-1]):
        instance(dot, DEEP, rig, cap, (0.3,) * 3, ink_width=0.035 / 0.3)
    instance(dot, DEEP, rig, (0, 0, -1.6), (0.34,) * 3, ink_width=0.035 / 0.34)


{"log": build_log, "projects": build_projects, "about": build_about}[SCENE]()

sun = bpy.data.lights.new("Sun", "SUN")
sun.energy = 4.5
sun.angle = math.radians(8)
sun_obj = link(bpy.data.objects.new("Sun", sun))
sun_obj.rotation_euler = (math.radians(50), math.radians(-30), math.radians(-35))
if SCENE == "about":
    sun_obj.rotation_mode = "QUATERNION"
    sun_obj.rotation_quaternion = Vector((0.55, 0.6, -0.6)).to_track_quat("-Z", "Y")

cam_data = bpy.data.cameras.new("Camera")
cam_data.lens = 50
cam = link(bpy.data.objects.new("Camera", cam_data))
cam.location = (0.0, -15.0, 0.0)
cam.rotation_euler = (math.radians(90), 0, 0)
scene.camera = cam

scene.render.image_settings.file_format = "PNG"
scene.render.image_settings.color_mode = "RGBA"

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
