"""
Shop tile art: one skeletal structure per section deck and per unit set,
drawn by RDKit and written as path data to
src/game/shop/shopMolecules.generated.ts.

Every structure is checked before it is written. The SMILES must parse, and
the molecule must contain the group the deck is about (a SMARTS match), so a
"Hydrates and acetals" deck can only show a molecule RDKit agrees is an
acetal. RDKit lays out the 2-D coordinates and draws the bonds and labels;
nothing here is typed in by hand except which example to show.

Run: python scripts/gen_shop_art.py
"""

from __future__ import annotations

import json
import re
import sys
from pathlib import Path

from rdkit import Chem
from rdkit.Chem.Draw import rdMolDraw2D

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / "src" / "game" / "shop" / "shopMolecules.generated.ts"

# key: (smiles, smarts the molecule must contain, what that smarts is)
ART: dict[str, tuple[str, str, str]] = {
    # Unit sets: the unit's own signature group.
    "set:u1": ("C=C(C)C(C)=C", "C=CC=C", "conjugated diene"),
    "set:u2": ("c1ccccc1", "c1ccccc1", "benzene ring"),
    "set:u3": ("Cc1ccc(Br)cc1", "c1ccccc1[Br]", "substituted arene"),
    "set:u4": ("O=[N+]([O-])c1ccc(Cl)c([N+](=O)[O-])c1", "c(Cl):c[N+](=O)[O-]", "activated aryl halide"),
    "set:u5": ("C1CCC2OC2C1", "C1OC1", "epoxide"),
    "set:u6": ("CCOC(C)=O", "[CX3](=O)[OX2][#6]", "ester"),
    "set:u7": ("O=C1CCCCC1", "[#6][CX3](=O)[#6]", "ketone"),
    "set:u8": ("OC(=O)c1ccccc1", "[CX3](=O)[OX2H1]", "carboxylic acid"),
    "set:u9": ("CC(=O)CC(C)=O", "[CX3](=O)[CH2][CX3](=O)", "beta-dicarbonyl"),
    "set:u10": ("CCN(CC)CC", "[NX3;H0;!$(NC=O)]([#6])([#6])[#6]", "tertiary amine"),
    # Section decks.
    "section-u1-1": ("C=C[CH2+]", "[CH2+]C=C", "allyl cation"),
    "section-u1-2": ("BrCC=CCBr", "BrCC=C", "allylic bromide"),
    "section-u1-3": ("C1=CCC=C1", "C=CC=C", "cyclic s-cis diene"),
    "section-u1-4": ("C1CC2CC1C=C2", "C1CC2CC1C=C2", "bicyclic adduct"),
    "section-u1-side": ("BrC1CCCC=C1", "BrCC=C", "allylic bromide"),
    "section-u2-all": ("c1ccc2ccccc2c1", "c1ccc2ccccc2c1", "fused arene"),
    "section-u3-1": ("O=[N+]([O-])c1ccccc1", "c[N+](=O)[O-]", "nitroarene"),
    "section-u3-2": ("CC(=O)c1ccccc1", "c[CX3](=O)[CH3]", "aryl ketone"),
    "section-u3-3": ("O=[N+]([O-])c1cccc(Br)c1", "[Br]c1cccc([N+](=O)[O-])c1", "meta-disubstituted arene"),
    "section-u4-1": ("O=[N+]([O-])c1ccc(F)cc1", "Fc1ccc([N+](=O)[O-])cc1", "activated aryl fluoride"),
    "section-u4-side": ("C1#CC=CC=C1", "[#6;R]#[#6;R]", "ring triple bond (benzyne)"),
    "section-u5-1": ("OC1CCCCC1", "[CX4][OX2H]", "alcohol"),
    "section-u5-2": ("C1CCOC1", "[CX4][OX2][CX4]", "ether"),
    "section-u5-3": ("O[C@@H]1CCCC[C@H]1O", "[OX2H][CX4][CX4][OX2H]", "1,2-diol"),
    "section-u5-side": ("COC(C)(C)C", "[CX4][OX2][CX4]", "ether"),
    "section-u6-all": ("CCC(C)=O", "[#6][CX3](=O)[#6]", "ketone"),
    "section-u7-1": ("CC1(C)OCCO1", "[CX4]([OX2][#6])[OX2][#6]", "acetal"),
    "section-u7-2": ("CN=C1CCCCC1", "[CX3]=[NX2]", "imine"),
    "section-u7-3": ("C=C1CCCCC1", "[CH2]=[CX3]", "exocyclic alkene"),
    "section-u7-side": ("O=Cc1ccccc1", "[CX3H1](=O)c", "aldehyde"),
    "section-u8-1": ("CC(Cl)=O", "[CX3](=O)Cl", "acid chloride"),
    "section-u8-2": ("CC(=O)OC(C)=O", "[CX3](=O)O[CX3](=O)", "anhydride"),
    "section-u8-3": ("N#Cc1ccccc1", "C#N", "nitrile"),
    "section-u8-4": ("COC(=O)c1ccccc1", "[CX3](=O)[OX2][CH3]", "ester"),
    "section-u8-side": ("CC(=O)N(C)C", "[CX3](=O)[NX3]", "amide"),
    "section-u9-1": ("C=C(C)O", "[CX3]=[CX3][OX2H]", "enol"),
    "section-u9-2": ("O=C1CCCCC1Br", "O=[CX3][CX4]Br", "alpha-bromo ketone"),
    "section-u9-3": ("CC(=O)CC(C)(C)O", "O=[CX3][CX4][CX4][OX2H]", "beta-hydroxy ketone"),
    "section-u9-4": ("CCOC(=O)CC(C)=O", "[CX3](=O)[CH2][CX3](=O)", "beta-keto ester"),
    "section-u9-5": ("CC1CCCCC1=O", "O=[CX3][CX4H1][CH3]", "alpha-alkyl ketone"),
    "section-u9-6": ("O=C1C=CCCC1", "O=[CX3][CX3]=[CX3]", "enone"),
    "section-u9-side": ("CCOC(=O)CC(=O)OCC", "[CX3](=O)[CH2][CX3](=O)", "malonate"),
    "section-u10-1": ("NCc1ccccc1", "[NX3H2][CX4]", "primary amine"),
    "section-u10-2": ("N#[N+]c1ccccc1", "c[N+]#N", "diazonium"),
    "section-u10-side": ("CC(=O)Nc1ccccc1", "[CX3](=O)[NH]c", "anilide"),
}

PATH_RE = re.compile(r"<path (?:class='([^']*)' )?d='([^']*)' (?:style='([^']*)'|fill='([^']*)')", re.S)


def draw(smiles: str) -> dict[str, object]:
    mol = Chem.MolFromSmiles(smiles)
    drawer = rdMolDraw2D.MolDraw2DSVG(-1, -1)
    opts = drawer.drawOptions()
    opts.fixedBondLength = 34
    opts.clearBackground = False
    opts.bondLineWidth = 2
    opts.padding = 0.06
    # Labels a size up from the default, so an O or N reads on a small tile.
    opts.baseFontSize = 0.9
    opts.setAtomPalette({-1: (0, 0, 0)})
    rdMolDraw2D.PrepareAndDrawMolecule(drawer, mol)
    drawer.FinishDrawing()
    svg = drawer.GetDrawingText()
    size = re.search(r"viewBox='0 0 ([\d.]+) ([\d.]+)'", svg)
    assert size is not None
    strokes: list[str] = []
    fills: list[str] = []
    for _cls, d, style, _fill in PATH_RE.findall(svg):
        d = re.sub(r"\s+", " ", d.strip())
        d = re.sub(r"(\d+\.\d)\d*", r"\1", d)
        (strokes if style and "fill:none" in style else fills).append(d)
    return {"w": round(float(size.group(1))), "h": round(float(size.group(2))), "stroke": " ".join(strokes), "fill": " ".join(fills)}


def main() -> int:
    out: dict[str, object] = {}
    bad = []
    for key, (smiles, smarts, group) in ART.items():
        mol = Chem.MolFromSmiles(smiles)
        patt = Chem.MolFromSmarts(smarts)
        if mol is None or patt is None or not mol.HasSubstructMatch(patt):
            bad.append(f"{key}: {smiles} does not contain {group} ({smarts})")
            continue
        art = draw(smiles)
        art["smiles"] = Chem.MolToSmiles(mol)
        art["group"] = group
        out[key] = art
    if bad:
        print("\n".join(bad), file=sys.stderr)
        return 1
    body = json.dumps(out, indent=1, ensure_ascii=False)
    OUT.write_text(
        "/* Generated by scripts/gen_shop_art.py from RDKit drawings; do not edit. */\n\n"
        "export interface ShopMolecule {\n"
        "  readonly w: number;\n  readonly h: number;\n  readonly stroke: string;\n  readonly fill: string;\n"
        "  readonly smiles: string;\n  /** The group the SMARTS check found in it. */\n  readonly group: string;\n}\n\n"
        f"export const SHOP_MOLECULES: Readonly<Record<string, ShopMolecule>> = {body};\n",
        encoding="utf-8",
    )
    print(f"wrote {len(out)} structures to {OUT}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
