"""
Cut screenshots down before Claude reads them, so they cost fewer tokens.

An image costs roughly (width x height) / 750 tokens, after the API has already
shrunk anything over 1568px on the long edge. A full 1568x980 screenshot is about
2,000 tokens; the 400x300 region you actually meant is about 160. Reading the
whole capture to look at one button is the waste this removes.

The workflow is two reads, both cheap:

  1. `peek` a small preview with a grid labelled in ORIGINAL pixel coordinates.
  2. `crop` the region you want at full resolution, using the numbers off the grid.

Commands:

  info    PATH...                     size and estimated tokens, no image read
  peek    PATH [--max 640] [--grid 8] small preview with a labelled grid
  crop    PATH X Y W H [--max N]      full-resolution cut, original pixels
  tiles   PATH ROWSxCOLS              split into a grid of files
  trim    PATH [--tol 12]             cut away flat margins around the content
  regions PATH [--min-area 0.01]      OpenCV: find content blocks, cut each one

Everything is written to .imgcut/ at the repo root (gitignored) unless -o is
given, and each command prints the output path and its token estimate.

Run:  python scripts/imgcut.py peek refs/toolbar.png
Needs: pip install -r scripts/requirements.txt
"""

from __future__ import annotations

import argparse
import sys
from pathlib import Path

try:
    from PIL import Image, ImageChops, ImageDraw
except ImportError:
    sys.exit("Pillow is missing: pip install -r scripts/requirements.txt")

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / ".imgcut"

# What the API resizes to before counting. Past either limit the image is scaled
# down, so cropping a huge capture saves less than its pixel count suggests.
API_LONG_EDGE = 1568
API_MAX_PIXELS = 1_150_000


def tokens(w: int, h: int) -> int:
    scale = min(1.0, API_LONG_EDGE / max(w, h), (API_MAX_PIXELS / (w * h)) ** 0.5)
    return round((w * scale) * (h * scale) / 750)


def out_path(src: Path, suffix: str, given: str | None) -> Path:
    if given:
        return Path(given)
    OUT.mkdir(exist_ok=True)
    return OUT / f"{src.stem}.{suffix}.png"


def save(img: Image.Image, path: Path) -> None:
    img.save(path)
    print(f"{path.relative_to(ROOT) if path.is_relative_to(ROOT) else path}"
          f"  {img.width}x{img.height}  ~{tokens(img.width, img.height)} tokens")


def fit(img: Image.Image, max_edge: int | None) -> Image.Image:
    if max_edge and max(img.size) > max_edge:
        img = img.copy()
        img.thumbnail((max_edge, max_edge), Image.LANCZOS)
    return img


# --------------------------------------------------------------------------
# Commands
# --------------------------------------------------------------------------

def cmd_info(a: argparse.Namespace) -> None:
    for p in a.paths:
        with Image.open(p) as img:
            print(f"{p}  {img.width}x{img.height}  ~{tokens(img.width, img.height)} tokens")


def cmd_peek(a: argparse.Namespace) -> None:
    src = Image.open(a.path).convert("RGB")
    img = fit(src, a.max)
    k = src.width / img.width
    draw = ImageDraw.Draw(img)
    # Labels are in source pixels, so the numbers read off the preview go
    # straight into `crop` with no arithmetic.
    for i in range(1, a.grid):
        x, y = img.width * i // a.grid, img.height * i // a.grid
        draw.line([(x, 0), (x, img.height)], fill=(255, 0, 0), width=1)
        draw.line([(0, y), (img.width, y)], fill=(255, 0, 0), width=1)
        draw.text((x + 2, 2), str(round(x * k)), fill=(255, 0, 0))
        draw.text((2, y + 2), str(round(y * k)), fill=(255, 0, 0))
    save(img, out_path(Path(a.path), "peek", a.out))


def cmd_crop(a: argparse.Namespace) -> None:
    src = Image.open(a.path)
    x, y, w, h = a.box
    if x < 0 or y < 0 or x + w > src.width or y + h > src.height:
        sys.exit(f"box {x},{y},{w},{h} falls outside {src.width}x{src.height}")
    save(fit(src.crop((x, y, x + w, y + h)), a.max),
         out_path(Path(a.path), f"crop-{x}-{y}-{w}x{h}", a.out))


def cmd_tiles(a: argparse.Namespace) -> None:
    rows, cols = (int(n) for n in a.shape.lower().split("x"))
    src = Image.open(a.path)
    for r in range(rows):
        for c in range(cols):
            box = (src.width * c // cols, src.height * r // rows,
                   src.width * (c + 1) // cols, src.height * (r + 1) // rows)
            save(src.crop(box), out_path(Path(a.path), f"tile-r{r}c{c}", None))


def cmd_trim(a: argparse.Namespace) -> None:
    src = Image.open(a.path).convert("RGB")
    # The top-left pixel is taken as the background colour, which holds for
    # app screenshots and diagram exports; a photo has no margin to trim anyway.
    bg = Image.new("RGB", src.size, src.getpixel((0, 0)))
    diff = ImageChops.difference(src, bg).convert("L").point(lambda v: 255 if v > a.tol else 0)
    box = diff.getbbox()
    if not box:
        sys.exit("image is a single flat colour")
    save(src.crop(box), out_path(Path(a.path), "trim", a.out))
    print(f"box {box[0]} {box[1]} {box[2] - box[0]} {box[3] - box[1]}")


def cmd_regions(a: argparse.Namespace) -> None:
    try:
        import cv2
        import numpy as np
    except ImportError:
        sys.exit("OpenCV is missing: pip install -r scripts/requirements.txt")
    src = Image.open(a.path).convert("RGB")
    gray = cv2.cvtColor(np.asarray(src), cv2.COLOR_RGB2GRAY)
    # Edges, then a dilation wide enough to merge a panel's text and controls
    # into one blob, so each contour is a UI block rather than a single glyph.
    edges = cv2.Canny(gray, 50, 150)
    k = max(3, round(min(gray.shape) * a.merge))
    blobs = cv2.dilate(edges, cv2.getStructuringElement(cv2.MORPH_RECT, (k, k)))
    contours, _ = cv2.findContours(blobs, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
    floor = a.min_area * src.width * src.height
    boxes = sorted((cv2.boundingRect(c) for c in contours), key=lambda b: (b[1], b[0]))
    boxes = [b for b in boxes if b[2] * b[3] >= floor]
    if not boxes:
        sys.exit("no regions above --min-area; lower it or --merge")
    for i, (x, y, w, h) in enumerate(boxes):
        print(f"[{i}] box {x} {y} {w} {h}  ", end="")
        save(src.crop((x, y, x + w, y + h)), out_path(Path(a.path), f"region{i}", None))


# --------------------------------------------------------------------------

def main() -> None:
    p = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    sub = p.add_subparsers(dest="cmd", required=True)

    s = sub.add_parser("info"); s.add_argument("paths", nargs="+"); s.set_defaults(fn=cmd_info)

    s = sub.add_parser("peek"); s.add_argument("path")
    s.add_argument("--max", type=int, default=640); s.add_argument("--grid", type=int, default=8)
    s.add_argument("-o", "--out"); s.set_defaults(fn=cmd_peek)

    s = sub.add_parser("crop"); s.add_argument("path")
    s.add_argument("box", type=int, nargs=4, metavar=("X", "Y", "W", "H"))
    s.add_argument("--max", type=int, help="also shrink the cut to this long edge")
    s.add_argument("-o", "--out"); s.set_defaults(fn=cmd_crop)

    s = sub.add_parser("tiles"); s.add_argument("path"); s.add_argument("shape", help="e.g. 2x3")
    s.set_defaults(fn=cmd_tiles)

    s = sub.add_parser("trim"); s.add_argument("path")
    s.add_argument("--tol", type=int, default=12); s.add_argument("-o", "--out"); s.set_defaults(fn=cmd_trim)

    s = sub.add_parser("regions"); s.add_argument("path")
    s.add_argument("--min-area", type=float, default=0.01, help="fraction of the image, default 1%%")
    s.add_argument("--merge", type=float, default=0.02, help="dilation as a fraction of the short edge")
    s.set_defaults(fn=cmd_regions)

    a = p.parse_args()
    a.fn(a)


if __name__ == "__main__":
    main()
