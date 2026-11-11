import sys
from pathlib import Path

import bpy

argv = sys.argv[sys.argv.index("--") + 1 :]


def arg(name, default=None):
    return argv[argv.index(name) + 1] if name in argv else default


frames_dir = Path(arg("--frames"))
out = Path(arg("--out")).resolve()
out.parent.mkdir(parents=True, exist_ok=True)
height = int(arg("--height", "1080"))
frames = sorted(frames_dir.glob("frame-*.png"))

scene = bpy.context.scene
scene.render.resolution_x, scene.render.resolution_y = height * 16 // 9, height
scene.render.resolution_percentage = 100
scene.render.fps = 30
scene.frame_start, scene.frame_end = 1, len(frames)
scene.view_settings.view_transform = "Standard"

editor = scene.sequence_editor_create()
strips = editor.strips if hasattr(editor, "strips") else editor.sequences
strip = strips.new_image("frames", str(frames[0]), 1, 1, fit_method="FIT")
for frame in frames[1:]:
    strip.elements.append(frame.name)

settings = scene.render.image_settings
if hasattr(settings, "media_type"):
    settings.media_type = "VIDEO"
settings.file_format = "FFMPEG"
ff = scene.render.ffmpeg
if out.suffix == ".mp4":
    ff.format = "MPEG4"
    ff.codec = "H264"
else:
    ff.format = "WEBM"
    ff.codec = "WEBM"
ff.constant_rate_factor = "NONE"
ff.video_bitrate = int(arg("--bitrate", "1400" if height >= 1080 else "700"))
ff.minrate = 0
ff.maxrate = ff.video_bitrate * 2
ff.gopsize = 30
ff.ffmpeg_preset = "GOOD"
ff.audio_codec = "NONE"
scene.render.use_sequencer = True
scene.render.use_compositing = False
scene.render.use_file_extension = False
scene.render.filepath = str(out)

bpy.ops.render.render(animation=True)
print("WROTE", bpy.path.abspath(scene.render.frame_path(frame=1)))
