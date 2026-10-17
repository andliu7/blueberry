"""
Render the home page's liquid-sculpture image: the Diels-Alder reaction, drawn by RDKit.

The liquid-sculpture section (src/components/ui/liquid-sculpture-hero.tsx) turns an image
into particles. Blueberry's image is a skeletal structure, so it must be derived, never
drawn from memory: this script reads the reactants and the product of the checked
"diels-alder" entry in src/data/reactions.ts (validation status "ok", conservation
BALANCED), re-derives the product formula with RDKit and stops if it disagrees with the
one recorded there, then draws the whole reaction, diene + dienophile -> ring.

Four images, transparent backgrounds:
  public/hero/sculpture-light.webp          2000 px wide, one row: diene + dienophile -> ring
  public/hero/sculpture-dark.webp           the same in the dark colours
  public/hero/sculpture-mobile-light.webp   1200 px wide, two rows (diene + dienophile, then
  public/hero/sculpture-mobile-dark.webp    -> ring), so the labels stay legible on a phone
Light is deep #2e2b45 skeleton with purple #5a3fd8 oxygen and arrow; dark is night #edf2fa
with night violet #a99bff (--bb-deep and --site-nav-line from src/tokens.css, light and .dark).

Run:  python scripts/render_hero_sculpture.py
"""

from __future__ import annotations

import io
import math
import json
import re
import sys
from pathlib import Path

from PIL import Image, ImageDraw
from rdkit import Chem
from rdkit.Chem import AllChem, rdMolDescriptors
from rdkit.Geometry import Point3D
from rdkit.Chem.Draw import rdMolDraw2D

ROOT = Path(__file__).resolve().parent.parent
REACTIONS = ROOT / "src" / "data" / "reactions.ts"
OUT = ROOT / "public" / "hero"
REACTION_ID = "diels-alder"

TARGET_W = 2000  # final width in px, padding included
MOBILE_W = 1200  # the phone version, two rows
PAD = 16  # transparent margin round the ink, so the downsample never clips a stroke
SS = 2  # drawn at twice the size, then downsampled once, so the plus and arrow are smooth
BOND_LEN, BOND_W, FONT = 150, 11, 64  # at 1x, before the downsample

THEMES = {
    "light": {"ink": "#2e2b45", "accent": "#5a3fd8"},
    "dark": {"ink": "#edf2fa", "accent": "#a99bff"},
}


def rgb(hex_: str) -> tuple[float, float, float]:
    h = hex_.lstrip("#")
    return tuple(int(h[i : i + 2], 16) / 255 for i in (0, 2, 4))  # type: ignore[return-value]


def load_entry() -> dict:
    """The reaction entry, parsed as JSON from the object literal that holds its id."""
    text = REACTIONS.read_text(encoding="utf-8")
    at = text.find(f'"id": "{REACTION_ID}"')
    if at < 0:
        sys.exit(f"{REACTION_ID} not found in {REACTIONS}")
    start = text.rfind("{", 0, at)
    depth = 0
    for i in range(start, len(text)):
        if text[i] == "{":
            depth += 1
        elif text[i] == "}":
            depth -= 1
            if depth == 0:
                return json.loads(text[start : i + 1])
    sys.exit("unbalanced braces in reactions.ts")


def check(entry: dict) -> None:
    """Refuse to draw anything the checked data does not support."""
    if entry.get("validation", {}).get("status") != "ok":
        sys.exit(f"{REACTION_ID} is not validated ok")
    product = Chem.MolFromSmiles(entry["product"])
    if product is None:
        sys.exit("product SMILES does not parse")
    formula = rdMolDescriptors.CalcMolFormula(product)
    if formula != entry["product_formula"]:
        sys.exit(f"RDKit says {formula}, the data says {entry['product_formula']}")
    lhs = Chem.MolFromSmiles(".".join(entry["reactants"]))
    if rdMolDescriptors.CalcMolFormula(lhs) != formula:
        sys.exit("reactants and product do not conserve atoms")


def mol_image(smiles: str, ink: str, accent: str, s_cis: bool = False) -> Image.Image:
    """One molecule at a fixed bond length, cropped to its ink."""
    mol = Chem.MolFromSmiles(smiles)
    AllChem.Compute2DCoords(mol)
    if s_cis:
        # A diene reacts from its s-cis shape, so draw it that way: same molecule, only
        # the drawing changes (RDKit's default layout is s-trans). The four carbons sit on
        # four corners of a regular hexagon, open toward the dienophile, the ring it makes.
        conf = mol.GetConformer()
        for i, deg in enumerate((60, 120, 180, 240)):
            t = math.radians(deg)
            conf.SetAtomPosition(i, Point3D(1.5 * math.cos(t), 1.5 * math.sin(t), 0.0))
    d = rdMolDraw2D.MolDraw2DCairo(1600 * SS, 1200 * SS)
    o = d.drawOptions()
    o.setBackgroundColour((1, 1, 1, 0))  # transparent, so the page ground shows through
    o.clearBackground = True
    o.setAtomPalette({-1: rgb(ink), 6: rgb(ink), 8: rgb(accent)})
    o.bondLineWidth = BOND_W * SS
    o.scaleBondWidth = False
    o.fixedBondLength = BOND_LEN * SS
    o.minFontSize = FONT * SS
    o.maxFontSize = FONT * SS
    d.DrawMolecule(mol)
    d.FinishDrawing()
    img = Image.open(io.BytesIO(d.GetDrawingText())).convert("RGBA")
    return img.crop(img.getchannel("A").getbbox())


def plus_sign(draw: ImageDraw.ImageDraw, x: int, mid: int, size: int, stroke: int, fill: tuple) -> None:
    r = size // 2
    draw.rectangle((x, mid - stroke // 2, x + size, mid + stroke // 2), fill=fill)
    draw.rectangle((x + r - stroke // 2, mid - r, x + r + stroke // 2, mid + r), fill=fill)


def arrow_sign(draw: ImageDraw.ImageDraw, x: int, mid: int, length: int, stroke: int, fill: tuple) -> None:
    head = 46 * SS
    draw.rectangle((x, mid - stroke // 2, x + length - head, mid + stroke // 2), fill=fill)
    draw.polygon([(x + length - head - 4, mid - head * 0.6), (x + length, mid), (x + length - head - 4, mid + head * 0.6)], fill=fill)


def row(items: list, ink: str, accent: str) -> Image.Image:
    """Molecules and signs laid left to right on one centre line. An item is an image,
    ("plus", width) or ("arrow", width)."""
    gap = 70 * SS
    a = tuple(round(c * 255) for c in rgb(accent)) + (255,)
    stroke = BOND_W * SS
    widths = [it.width if isinstance(it, Image.Image) else it[1] for it in items]
    w = sum(widths) + gap * (len(items) - 1)
    h = max(it.height for it in items if isinstance(it, Image.Image)) + 40 * SS
    out = Image.new("RGBA", (w, h), (0, 0, 0, 0))
    draw = ImageDraw.Draw(out)
    mid, x = h // 2, 0
    for it, iw in zip(items, widths):
        if isinstance(it, Image.Image):
            out.alpha_composite(it, (x, (h - it.height) // 2))
        elif it[0] == "plus":
            plus_sign(draw, x, mid, iw, stroke, a)
        else:
            arrow_sign(draw, x, mid, iw, stroke, a)
        x += iw + gap
    return out.crop(out.getchannel("A").getbbox())


def finish(img: Image.Image, width: int) -> Image.Image:
    """Downsample once so that, with the margin added, the file is exactly `width` wide."""
    inner = width - PAD * 2
    img = img.resize((inner, round(img.height * inner / img.width)), Image.LANCZOS)
    framed = Image.new("RGBA", (width, img.height + PAD * 2), (0, 0, 0, 0))
    framed.alpha_composite(img, (PAD, PAD))
    return framed


def molecules(entry: dict, ink: str, accent: str) -> tuple[Image.Image, Image.Image, Image.Image]:
    diene, dienophile = entry["reactants"]
    return (
        mol_image(diene, ink, accent, s_cis=True),
        mol_image(dienophile, ink, accent),
        mol_image(entry["product"], ink, accent),
    )


def render(entry: dict, ink: str, accent: str) -> Image.Image:
    """diene + dienophile -> product, on one row."""
    diene, dienophile, product = molecules(entry, ink, accent)
    return finish(row([diene, ("plus", 70 * SS), dienophile, ("arrow", 300 * SS), product], ink, accent), TARGET_W)


def render_mobile(entry: dict, ink: str, accent: str) -> Image.Image:
    """The phone version: diene + dienophile on the first row, -> product on the second,
    both centred, so the drawing is less than half as wide and the labels twice as big."""
    diene, dienophile, product = molecules(entry, ink, accent)
    top = row([diene, ("plus", 70 * SS), dienophile], ink, accent)
    bottom = row([("arrow", 220 * SS), product], ink, accent)
    gap = 60 * SS
    w = max(top.width, bottom.width)
    out = Image.new("RGBA", (w, top.height + gap + bottom.height), (0, 0, 0, 0))
    out.alpha_composite(top, ((w - top.width) // 2, 0))
    out.alpha_composite(bottom, ((w - bottom.width) // 2, top.height + gap))
    return finish(out, MOBILE_W)


def main() -> None:
    entry = load_entry()
    check(entry)
    OUT.mkdir(parents=True, exist_ok=True)
    for name, c in THEMES.items():
        for stem, draw in (("sculpture", render), ("sculpture-mobile", render_mobile)):
            img = draw(entry, c["ink"], c["accent"])
            path = OUT / f"{stem}-{name}.webp"
            img.save(path, "WEBP", lossless=True, method=6)
            print(f"{path.relative_to(ROOT)}  {img.width}x{img.height}  {path.stat().st_size // 1024} KB")


if __name__ == "__main__":
    main()
