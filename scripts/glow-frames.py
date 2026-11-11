import argparse
from pathlib import Path

import numpy as np
from PIL import Image, ImageFilter

parser = argparse.ArgumentParser()
parser.add_argument("--frames", required=True)
parser.add_argument("--out", required=True)
parser.add_argument("--page", default="#fdfffb")
parser.add_argument("--tint", default="#8b80ff")
parser.add_argument("--radius", type=float, default=0.022)
parser.add_argument("--strength", type=float, default=0.5)
args = parser.parse_args()


def rgb(hex_color):
    h = hex_color.lstrip("#")
    return np.array([int(h[i : i + 2], 16) for i in (0, 2, 4)], dtype=np.float32) / 255


page = rgb(args.page)
tint = rgb(args.tint)
out = Path(args.out)
out.mkdir(parents=True, exist_ok=True)

for path in sorted(Path(args.frames).glob("frame-*.png")):
    image = Image.open(path).convert("RGBA")
    alpha_image = image.getchannel("A")
    radius = args.radius * image.width
    wide = np.asarray(alpha_image.filter(ImageFilter.GaussianBlur(radius)), dtype=np.float32) / 255
    near = np.asarray(alpha_image.filter(ImageFilter.GaussianBlur(radius * 0.35)), dtype=np.float32) / 255
    aura = np.clip((wide * 0.7 + near * 0.5) * args.strength, 0, 1)[..., None]

    pixels = np.asarray(image, dtype=np.float32) / 255
    color, alpha = pixels[..., :3], pixels[..., 3:]
    frame = page * (1 - aura) + tint * aura
    frame = frame * (1 - alpha) + color * alpha
    Image.fromarray((frame * 255 + 0.5).astype(np.uint8), "RGB").save(out / path.name)
