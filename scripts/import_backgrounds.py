"""
Import photographs from the unsplash folder into public/backgrounds.

The site ships its own images: no key, no quota, no request that can fail. That
means every photograph has to be converted, sized and catalogued before it is
any use, and until now that was done by hand with no script to show for it.

What this does, per file:

  1. Reads the *title* to decide what the picture is for. The filenames are
     descriptive on purpose -- "dark mode blueberry intro background.jpg",
     "pancake blueberry study deck folder background.jpg" -- so the title is the
     intent and this reads it rather than asking.
  2. Converts to WebP, capped at 3840 wide, which is what the existing set uses.
     A 13MB JPEG becomes a few hundred KB with no visible loss at background
     scale.
  3. Generates a 20px blurred copy inlined as base64, so something paints on the
     first frame instead of a white rectangle.
  4. Writes the manifest entry: file, kind, label, width, height, blur.

Existing files are left alone unless --force. Several of these photographs are
already in the set under a different name, and re-encoding them would churn the
git history for no change on screen.

Run:  python scripts/import_backgrounds.py [--force] [--dry-run]
"""

from __future__ import annotations

import base64
import io
import json
import re
import sys
from pathlib import Path

from PIL import Image, ImageFilter

ROOT = Path(__file__).resolve().parent.parent
SOURCE = ROOT.parent / "unsplash images"
OUT = ROOT / "public" / "backgrounds"
MANIFEST = OUT / "manifest.json"

MAX_WIDTH = 3840
QUALITY = 72
BLUR_WIDTH = 20


# --------------------------------------------------------------------------
# Reading the title
# --------------------------------------------------------------------------

# Words that mean the photograph is trees, water or mist. `forest` is a separate
# kind only so the picker can favour it: those sit closest to what a blueberry
# actually grows in, and the site looks more like itself behind them.
FOREST_WORDS = (
    "forest", "forrest", "trees", "tree", "rainforest", "waterfall", "river",
    "leaves", "woods", "nature", "stream", "fog",
)

BERRY_WORDS = ("blueberry", "berry")


# Not scenery. These are diagrams, and a picker that treats them as landscapes
# puts a line drawing of cyclohexane behind the entire site at two in the
# afternoon. Kept and converted, but marked so `pickForHour` never draws them.
DIAGRAM_WORDS = ("molecule", "cyclohexane", "n3")


def classify(title: str) -> tuple[str, str]:
    """(kind, label) from a filename, without its extension."""
    t = title.lower()

    if any(w in t for w in DIAGRAM_WORDS):
        return "diagram", clean_label(t)

    # Most specific first: an intro background is also a blueberry picture, and
    # a deck folder background usually is too. Checking berry first would swallow
    # all three.
    if "intro background" in t or "intro" in t and "mode" in t:
        return ("intro-dark" if "dark" in t else "intro-light"), "intro"
    if "study deck folder background" in t or "folder background" in t:
        return "folder", clean_label(t.replace("study deck folder background", "").replace("folder background", ""))
    if any(w in t for w in BERRY_WORDS):
        return "berry", clean_label(t)
    if any(w in t for w in FOREST_WORDS):
        return "forest", clean_label(t)
    return "landscape", clean_label(t)


def clean_label(text: str) -> str:
    """A readable label, with the photographer's numbering and asides removed."""
    t = text.lower()
    # "unsplash img12 stream through mountains" -> "stream through mountains"
    t = re.sub(r"\bunsplash\b", " ", t)
    t = re.sub(r"\bimg\s*\d+\b", " ", t)
    t = re.sub(r"\bimage\b", " ", t)
    t = re.sub(r"\(\d+\)", " ", t)
    # Drop a parenthetical or trailing note to self.
    t = re.sub(r"\s*-\s*(vertical|so maybe|minus).*$", " ", t)
    t = re.sub(r"\(.*?\)", " ", t)
    t = re.sub(r"[^a-z0-9]+", " ", t)
    cleaned = " ".join(t.split()).strip()
    if cleaned:
        return cleaned
    # Stripping the photographer's numbering left nothing, which happens for
    # "unsplash img1" and for the unqualified "study deck folder background".
    # Falling back to a shared word like "scene" would collide two different
    # photographs onto one filename and silently drop one, so keep the raw
    # words instead.
    raw = re.sub(r"study deck folder background", "classic", text.lower())
    raw = re.sub(r"[^a-z0-9]+", " ", raw)
    return " ".join(raw.split()).strip() or "untitled"


def slug_for(kind: str, label: str) -> str:
    base = re.sub(r"[^a-z0-9]+", "-", label).strip("-") or "scene"
    if kind == "intro-dark":
        return "intro-dark"
    if kind == "intro-light":
        return "intro-light"
    prefix = {"folder": "folder", "berry": "berry", "forest": "forest", "diagram": "diagram"}.get(kind, "landscape")
    return f"{prefix}-{base}"


# --------------------------------------------------------------------------
# Converting
# --------------------------------------------------------------------------

def encode(path: Path) -> tuple[bytes, int, int, str]:
    """WebP bytes, dimensions, and an inlined blurred placeholder."""
    with Image.open(path) as im:
        im = im.convert("RGB")
        if im.width > MAX_WIDTH:
            height = round(im.height * MAX_WIDTH / im.width)
            im = im.resize((MAX_WIDTH, height), Image.LANCZOS)

        full = io.BytesIO()
        im.save(full, format="WEBP", quality=QUALITY, method=6)

        # The placeholder. Blurred *before* the shrink as well as relying on the
        # scale, so the twenty-pixel version has no aliasing to amplify when the
        # browser stretches it back over the whole viewport.
        tiny = im.filter(ImageFilter.GaussianBlur(radius=max(2, im.width // 400)))
        tiny = tiny.resize((BLUR_WIDTH, max(1, round(im.height * BLUR_WIDTH / im.width))), Image.LANCZOS)
        buf = io.BytesIO()
        tiny.save(buf, format="WEBP", quality=40, method=6)
        blur = "data:image/webp;base64," + base64.b64encode(buf.getvalue()).decode()

        return full.getvalue(), im.width, im.height, blur


def main() -> int:
    force = "--force" in sys.argv
    dry = "--dry-run" in sys.argv

    if not SOURCE.is_dir():
        print(f"No source folder at {SOURCE}")
        return 1

    manifest = json.loads(MANIFEST.read_text(encoding="utf-8")) if MANIFEST.exists() else []
    by_file = {entry["file"]: entry for entry in manifest}

    sources = sorted(
        p for p in SOURCE.iterdir()
        if p.suffix.lower() in {".jpg", ".jpeg", ".png"} and p.is_file()
    )

    added, skipped, failed = 0, 0, 0
    for src in sources:
        kind, label = classify(src.stem)
        name = slug_for(kind, label) + ".webp"
        target = OUT / name

        if target.exists() and not force:
            skipped += 1
            continue

        if dry:
            print(f"  would write {name:<52} {kind:<12} {label}")
            added += 1
            continue

        try:
            data, w, h, blur = encode(src)
        except Exception as exc:
            print(f"  FAIL {src.name}: {exc.__class__.__name__}: {exc}")
            failed += 1
            continue

        target.write_bytes(data)
        by_file[name] = {
            "file": name, "kind": kind, "label": label, "w": w, "h": h, "blur": blur,
        }
        size_mb = len(data) / 1048576
        print(f"  {name:<52} {kind:<12} {size_mb:5.2f}MB  <- {src.name}")
        added += 1

    if not dry:
        # Berries first, then forests, then landscapes, then the special ones.
        order = {"berry": 0, "forest": 1, "landscape": 2, "folder": 3, "diagram": 4, "intro-light": 5, "intro-dark": 6}
        merged = sorted(by_file.values(), key=lambda e: (order.get(e["kind"], 9), e["file"]))
        MANIFEST.write_text(json.dumps(merged, indent=1), encoding="utf-8")

    print()
    print(f"{added} written, {skipped} already present, {failed} failed.")
    if not dry:
        counts: dict[str, int] = {}
        for e in by_file.values():
            counts[e["kind"]] = counts.get(e["kind"], 0) + 1
        print("manifest now: " + ", ".join(f"{k} {v}" for k, v in sorted(counts.items())))
    return 0


if __name__ == "__main__":
    sys.exit(main())
