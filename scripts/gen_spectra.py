"""
Generates src/game/tabs/spectra/spectra.generated.ts.

Every structure, formula, 1H/13C/IR peak list and product in that file is DERIVED here
with RDKit from a SMILES string or a reaction SMARTS. Nothing is typed in as a peak.

The shift predictor is an additive-increment estimate (Shoolery / Pretsch / Grant-Paul
style substituent tables, coded below), not nmrdb's HOSE-code database lookup. Typical
error is +-0.3 ppm for 1H and +-5 ppm for 13C. The app labels it as a prediction.

It also writes src/game/tabs/spectra/rangeChart.generated.ts, the range chart (IR, 1H and
13C boxes with a drawn example molecule each). See RANGE TABLE below for its sources.

Run:  python scripts/gen_spectra.py            (everything)
      python scripts/gen_spectra.py --ranges   (the range chart only)
"""
import json
import re
from pathlib import Path

from rdkit import Chem
from rdkit.Chem import AllChem, rdMolDescriptors
from rdkit.Chem.Draw import rdMolDraw2D

OUT = Path(__file__).resolve().parent.parent / "src/game/tabs/spectra/spectra.generated.ts"

# --------------------------------------------------------------------------- helpers


def heavy_nbrs(a):
    return [n for n in a.GetNeighbors() if n.GetAtomicNum() > 1]


def is_carbonyl_c(a):
    if a.GetSymbol() != "C":
        return False
    return any(b.GetBondType() == Chem.BondType.DOUBLE and b.GetOtherAtom(a).GetSymbol() == "O" for b in a.GetBonds())


def acyl_kind(a):
    """For a carbonyl carbon: aldehyde, ketone, acid, ester, amide, or None."""
    if not is_carbonyl_c(a):
        return None
    others = [n for n in heavy_nbrs(a) if not (n.GetSymbol() == "O" and a.GetOwningMol().GetBondBetweenAtoms(a.GetIdx(), n.GetIdx()).GetBondType() == Chem.BondType.DOUBLE)]
    hetero = [n for n in others if n.GetSymbol() in ("O", "N")]
    if hetero:
        h = hetero[0]
        if h.GetSymbol() == "N":
            return "amide"
        return "acid" if h.GetTotalNumHs() > 0 else "ester"
    return "aldehyde" if a.GetTotalNumHs() > 0 else "ketone"


def sub_class(x, ring_atom_idx):
    """Classify a substituent atom x hanging off an aromatic ring atom."""
    s = x.GetSymbol()
    if s == "C":
        if x.GetIsAromatic():
            return None
        k = acyl_kind(x)
        if k:
            return "CO"
        if any(b.GetBondType() == Chem.BondType.TRIPLE for b in x.GetBonds()):
            return "CN" if any(n.GetSymbol() == "N" for n in x.GetNeighbors()) else None
        if any(b.GetBondType() == Chem.BondType.DOUBLE for b in x.GetBonds()):
            return "vinyl"
        return "alkyl"
    if s == "O":
        return "OR"
    if s == "N":
        return "NO2" if x.GetFormalCharge() == 1 or sum(1 for n in x.GetNeighbors() if n.GetSymbol() == "O") == 2 else "NR2"
    if s in ("Cl", "Br", "F", "I"):
        return s
    return None


# 1H aromatic substituent increments (ortho, meta, para)
AR_H = {
    "alkyl": (-0.14, -0.06, -0.17),
    "OR": (-0.48, -0.09, -0.44),
    "NO2": (0.95, 0.26, 0.38),
    "CO": (0.62, 0.14, 0.21),
    "Cl": (0.03, -0.02, -0.09),
    "Br": (0.18, -0.08, -0.04),
    "F": (-0.26, 0.0, -0.20),
    "I": (0.39, -0.21, 0.00),
    "NR2": (-0.75, -0.25, -0.65),
    "CN": (0.36, 0.18, 0.28),
    "vinyl": (0.06, -0.03, -0.10),
}
# 13C aromatic increments (ipso, ortho, meta, para)
AR_C = {
    "alkyl": (9.3, 0.7, -0.1, -2.9),
    "OR": (31.4, -14.4, 1.0, -7.7),
    "NO2": (19.9, -4.9, 0.9, 6.1),
    "CO": (8.9, 0.1, -0.1, 4.4),
    "Cl": (6.2, 0.4, 1.3, -1.9),
    "Br": (-5.5, 3.4, 1.7, -1.6),
    "F": (34.8, -12.9, 1.4, -4.5),
    "I": (-32.2, 9.9, 2.6, -7.3),
    "NR2": (18.2, -13.4, 0.8, -10.0),
    "CN": (-15.7, 3.6, 0.7, 4.3),
    "vinyl": (8.9, -2.3, -0.1, -0.8),
}


def ring_subs(mol, atom):
    """(substituent class, ring distance) for each substituent on the aromatic ring containing atom."""
    ri = mol.GetRingInfo()
    ring = next((r for r in ri.AtomRings() if atom.GetIdx() in r and all(mol.GetAtomWithIdx(i).GetIsAromatic() for i in r)), None)
    if ring is None:
        return []
    n = len(ring)
    pos = ring.index(atom.GetIdx())
    out = []
    for i, idx in enumerate(ring):
        for nb in mol.GetAtomWithIdx(idx).GetNeighbors():
            if nb.GetIdx() in ring or nb.GetAtomicNum() == 1:
                continue
            cls = sub_class(nb, idx)
            if cls is None:
                continue
            d = min((i - pos) % n, (pos - i) % n)
            out.append((cls, d))
    return out


def h_shift(mol, a):
    """Predicted 1H shift of the H's on heavy atom a, plus a short environment label."""
    s = a.GetSymbol()
    nbrs = heavy_nbrs(a)
    if s == "O":
        c = nbrs[0] if nbrs else None
        if c is not None and acyl_kind(c) == "acid":
            return 11.5, "carboxylic acid O-H"
        if c is not None and c.GetIsAromatic():
            return 5.0, "phenol O-H"
        return 2.5, "alcohol O-H"
    if s == "N":
        c = nbrs[0] if nbrs else None
        if c is not None and acyl_kind(c) == "amide":
            return 7.0, "amide N-H"
        if c is not None and c.GetIsAromatic():
            return 3.6, "aniline N-H"
        return 1.5, "amine N-H"
    if s != "C":
        return None, ""
    if a.GetIsAromatic():
        v = 7.27
        for cls, d in ring_subs(mol, a):
            if d in (1, 2, 3) and cls in AR_H:
                v += AR_H[cls][d - 1]
        return v, "aromatic C-H"
    if acyl_kind(a) == "aldehyde":
        ar = any(n.GetIsAromatic() for n in nbrs)
        return (10.0 if ar else 9.7), "aldehyde C-H"
    if any(b.GetBondType() == Chem.BondType.TRIPLE for b in a.GetBonds()):
        return 2.4, "alkyne C-H"
    if any(b.GetBondType() == Chem.BondType.DOUBLE for b in a.GetBonds()):
        v = 5.25
        for n in nbrs:
            if n.GetSymbol() == "C" and not any(bb.GetBondType() == Chem.BondType.DOUBLE for bb in n.GetBonds() if bb.GetOtherAtom(n) == a):
                if n.GetIsAromatic():
                    v += 1.38
                elif acyl_kind(n):
                    v += 1.10
                else:
                    v += 0.45
            elif n.GetSymbol() == "O":
                v += 1.22
            elif n.GetSymbol() in ("Cl", "Br"):
                v += 1.08
        return v, "vinyl C-H"
    # sp3
    h = a.GetTotalNumHs()
    carbons = sum(1 for n in nbrs if n.GetSymbol() == "C")
    v = {3: 0.90, 2: 1.25, 1: 1.50}.get(h, 1.5)
    env = []
    for n in nbrs:
        sy = n.GetSymbol()
        if sy == "O":
            acyl = any(acyl_kind(m) in ("ester", "acid") for m in heavy_nbrs(n) if m.GetIdx() != a.GetIdx())
            v += 3.0 if acyl else 2.4
            if n.GetDegree() == 2 and any(m.GetIsAromatic() for m in heavy_nbrs(n)):
                v += 0.5
            env.append("O")
        elif sy == "N":
            amide = any(acyl_kind(m) == "amide" for m in heavy_nbrs(n) if m.GetIdx() != a.GetIdx())
            v += 2.0 if amide else 1.6
            env.append("N")
        elif sy == "Cl":
            v += 2.0
            env.append("Cl")
        elif sy == "Br":
            v += 1.9
            env.append("Br")
        elif sy == "I":
            v += 1.3
            env.append("I")
        elif sy == "C":
            k = acyl_kind(n)
            if n.GetIsAromatic():
                v += 1.4
                env.append("aryl")
            elif k in ("ketone", "aldehyde"):
                v += 1.2 + (0.45 if any(m.GetIsAromatic() for m in heavy_nbrs(n)) else 0.0)
                env.append("C=O")
            elif k:
                v += 1.1
                env.append("C=O")
            elif any(b.GetBondType() == Chem.BondType.TRIPLE for b in n.GetBonds()):
                v += 1.2 if any(m.GetSymbol() == "N" for m in n.GetNeighbors()) else 0.9
                env.append("C#X")
            elif any(b.GetBondType() == Chem.BondType.DOUBLE for b in n.GetBonds()):
                v += 0.8
                env.append("C=C")
            else:
                # beta effect of a heteroatom on the next carbon
                if any(m.GetSymbol() in ("O", "N", "Cl", "Br", "I") and m.GetIdx() != a.GetIdx() for m in heavy_nbrs(n)):
                    v += 0.3
    label = {3: "CH3", 2: "CH2", 1: "CH"}.get(h, "C-H")
    label += (" next to " + ", ".join(sorted(set(env)))) if env else (" alkyl" if carbons else "")
    return v, label


def c_shift(mol, a):
    s = a.GetSymbol()
    nbrs = heavy_nbrs(a)
    k = acyl_kind(a)
    if k:
        ar = any(n.GetIsAromatic() for n in nbrs)
        base = {"aldehyde": 200.0, "ketone": 208.0, "acid": 178.0, "ester": 172.0, "amide": 170.0}[k]
        if ar:
            base -= {"aldehyde": 8, "ketone": 11, "acid": 6, "ester": 6, "amide": 3}[k]
        return base, "C=O " + k
    if a.GetIsAromatic():
        v = 128.5
        for cls, d in ring_subs(mol, a):
            if cls in AR_C:
                v += AR_C[cls][d]
        return v, "aromatic C"
    trip = [b for b in a.GetBonds() if b.GetBondType() == Chem.BondType.TRIPLE]
    if trip:
        other = trip[0].GetOtherAtom(a)
        if other.GetSymbol() == "N":
            return 118.0, "nitrile C"
        return (68.0 if a.GetTotalNumHs() else 84.0), "alkyne C"
    dbl = [b for b in a.GetBonds() if b.GetBondType() == Chem.BondType.DOUBLE]
    if dbl:
        v = 123.3
        for n in nbrs:
            if n.GetIdx() == dbl[0].GetOtherAtom(a).GetIdx():
                continue
            if n.GetSymbol() == "C":
                v += 10.6 if not n.GetIsAromatic() else 12.5
            elif n.GetSymbol() == "O":
                v += 29
            elif n.GetSymbol() in ("Cl", "Br"):
                v += 3
        # the partner's substituents push this carbon the other way
        partner = dbl[0].GetOtherAtom(a)
        for n in heavy_nbrs(partner):
            if n.GetIdx() == a.GetIdx():
                continue
            if n.GetSymbol() == "C":
                v += -7.9 if not n.GetIsAromatic() else -11.0
            elif n.GetSymbol() == "O":
                v += -39
        return v, "alkene C"
    # sp3, Grant-Paul with X increments
    alpha = [n for n in nbrs if n.GetSymbol() == "C" and not n.GetIsAromatic() and n.GetHybridization() == Chem.HybridizationType.SP3]
    beta = set()
    gamma = set()
    for n in alpha:
        for m in heavy_nbrs(n):
            if m.GetIdx() != a.GetIdx() and m.GetSymbol() == "C" and m.GetHybridization() == Chem.HybridizationType.SP3:
                beta.add(m.GetIdx())
    for b in beta:
        for m in heavy_nbrs(mol.GetAtomWithIdx(b)):
            if m.GetSymbol() == "C" and m.GetHybridization() == Chem.HybridizationType.SP3 and m.GetIdx() not in beta and m.GetIdx() != a.GetIdx() and m.GetIdx() not in [x.GetIdx() for x in alpha]:
                gamma.add(m.GetIdx())
    v = -2.3 + 9.1 * len(alpha) + 9.4 * len(beta) - 2.5 * len(gamma)
    env = []
    for n in nbrs:
        sy = n.GetSymbol()
        if sy == "O":
            acyl = any(acyl_kind(m) in ("ester",) for m in heavy_nbrs(n) if m.GetIdx() != a.GetIdx())
            v += 51 if acyl else (57 if n.GetDegree() == 2 else 48)
            env.append("O")
        elif sy == "N":
            v += 28
            env.append("N")
        elif sy == "Cl":
            v += 31
            env.append("Cl")
        elif sy == "Br":
            v += 19
            env.append("Br")
        elif sy == "I":
            v += -7
            env.append("I")
        elif sy == "C":
            kk = acyl_kind(n)
            if n.GetIsAromatic():
                v += 24
                env.append("aryl")
            elif kk in ("ketone", "aldehyde"):
                v += 31
                env.append("C=O")
            elif kk:
                v += 23
                env.append("C=O")
            elif any(bb.GetBondType() == Chem.BondType.TRIPLE for bb in n.GetBonds()):
                v += 4 if any(mm.GetSymbol() == "N" for mm in n.GetNeighbors()) else 4
                env.append("C#X")
            elif any(bb.GetBondType() == Chem.BondType.DOUBLE for bb in n.GetBonds()):
                v += 22
                env.append("C=C")
            else:
                # beta heteroatom on that carbon
                for mm in heavy_nbrs(n):
                    if mm.GetIdx() != a.GetIdx() and mm.GetSymbol() in ("O", "N", "Cl", "Br"):
                        v += 10
    h = a.GetTotalNumHs()
    label = {3: "CH3", 2: "CH2", 1: "CH", 0: "C"}.get(h, "C")
    label += (" next to " + ", ".join(sorted(set(env)))) if env else ""
    return max(v, 5.0), label


MULT = {0: "s", 1: "d", 2: "t", 3: "q", 4: "quint", 5: "sext", 6: "sept"}


def predict(mol):
    ranks = list(Chem.CanonicalRankAtoms(mol, breakTies=False))
    # ---- 1H
    groups = {}
    for a in mol.GetAtoms():
        nh = a.GetTotalNumHs()
        if nh == 0:
            continue
        v, env = h_shift(mol, a)
        if v is None:
            continue
        key = ranks[a.GetIdx()]
        g = groups.setdefault(key, {"hs": 0, "vals": [], "env": env, "atom": a, "atoms": []})
        g["atoms"].append(a.GetIdx())
        g["hs"] += nh
        g["vals"].append(v)
    h1 = []
    for key, g in groups.items():
        a = g["atom"]
        exch = a.GetSymbol() in ("O", "N")
        nb_groups = {}
        for n in heavy_nbrs(a):
            if ranks[n.GetIdx()] == ranks[a.GetIdx()] or n.GetSymbol() in ("O", "N"):
                continue
            nh = n.GetTotalNumHs()
            if nh:
                nb_groups.setdefault(ranks[n.GetIdx()], 0)
                nb_groups[ranks[n.GetIdx()]] += nh
        tot = sum(nb_groups.values())
        if exch:
            mult = "s"
        elif len(nb_groups) > 1 or a.GetIsAromatic() and tot > 0 and len(nb_groups) != 1 or any(b.GetBondType() == Chem.BondType.DOUBLE and b.GetOtherAtom(a).GetSymbol() == "C" for b in a.GetBonds()) and tot:
            mult = "m"
        else:
            mult = MULT.get(tot, "m")
        if a.GetIsAromatic() and tot > 0 and len(nb_groups) == 1:
            mult = MULT.get(tot, "m")
        h1.append({"shift": round(sum(g["vals"]) / len(g["vals"]), 2), "nH": g["hs"], "mult": mult, "env": g["env"], "exch": exch, "j": 8.0 if a.GetIsAromatic() else 7.0, "atoms": g["atoms"]})
    h1.sort(key=lambda p: -p["shift"])
    # ---- 13C
    cg = {}
    for a in mol.GetAtoms():
        if a.GetSymbol() != "C":
            continue
        v, env = c_shift(mol, a)
        g = cg.setdefault(ranks[a.GetIdx()], {"n": 0, "vals": [], "env": env, "atoms": []})
        g["atoms"].append(a.GetIdx())
        g["n"] += 1
        g["vals"].append(v)
    c13 = [{"shift": round(sum(g["vals"]) / len(g["vals"]), 1), "nC": g["n"], "env": g["env"], "atoms": g["atoms"]} for g in cg.values()]
    c13.sort(key=lambda p: -p["shift"])
    return h1, c13


IR_RULES = [
    # (name, SMARTS, [(lo, hi, label, strength, broad)])
    ("acid", "[CX3](=O)[OX2H1]", [(3300, 2500, "O-H stretch, very broad", "strong", True), (1725, 1700, "C=O stretch", "strong", False)]),
    ("alcohol", "[CX4,c][OX2H1]", [(3600, 3200, "O-H stretch, broad", "strong", True)]),
    ("aldehyde", "[CX3H1](=O)[#6]", [(1740, 1720, "C=O stretch", "strong", False), (2830, 2700, "aldehyde C-H stretch", "medium", False)]),
    ("ketone", "[#6][CX3](=O)[#6]", [(1725, 1705, "C=O stretch", "strong", False)]),
    ("ester", "[#6][CX3](=O)[OX2][#6]", [(1750, 1735, "C=O stretch", "strong", False), (1300, 1000, "C-O stretch", "strong", False)]),
    ("amide", "[CX3](=O)[NX3]", [(1690, 1630, "C=O stretch", "strong", False)]),
    ("amine1", "[NX3H2][#6]", [(3500, 3300, "N-H stretch, two peaks", "medium", False)]),
    ("amine2", "[NX3H1]([#6])[#6]", [(3500, 3300, "N-H stretch, one peak", "medium", False)]),
    ("nitrile", "[CX2]#[NX1]", [(2260, 2220, "C#N stretch", "medium", False)]),
    ("alkyne", "[CX2]#[CX2]", [(2260, 2100, "C#C stretch", "weak", False)]),
    ("alkyneH", "[CX2H1]#[CX2]", [(3330, 3270, "sp C-H stretch", "strong", False)]),
    ("alkene", "[CX3]=[CX3]", [(1680, 1620, "C=C stretch", "medium", False)]),
    ("alkeneH", "[CX3;!$(C=O)][H]", []),
    ("aryl", "c1ccccc1", [(1600, 1450, "aromatic C=C stretch", "medium", False)]),
    ("ether", "[#6][OX2][#6]", [(1250, 1050, "C-O stretch", "strong", False)]),
]


def ir_bands(mol):
    mh = Chem.AddHs(mol)
    bands = []
    for _name, sma, items in IR_RULES:
        patt = Chem.MolFromSmarts(sma)
        if patt is not None and mh.HasSubstructMatch(patt):
            for lo, hi, label, strength, broad in items:
                bands.append({"lo": lo, "hi": hi, "label": label, "strength": strength, "broad": broad})
    # C-H stretches from hybridisation
    has_sp3 = mol.HasSubstructMatch(Chem.MolFromSmarts("[CX4;!H0]"))
    has_sp2 = mol.HasSubstructMatch(Chem.MolFromSmarts("[c,$([CX3]=[CX3]);!H0]"))
    if has_sp3:
        bands.append({"lo": 3000, "hi": 2850, "label": "sp3 C-H stretch", "strength": "medium", "broad": False})
    if has_sp2:
        bands.append({"lo": 3100, "hi": 3000, "label": "sp2 C-H stretch", "strength": "weak", "broad": False})
    # drop an O-H alcohol band when the acid band already covers it
    seen = set()
    uniq = []
    for b in bands:
        k = (b["lo"], b["hi"], b["label"])
        if k not in seen:
            seen.add(k)
            uniq.append(b)
    uniq.sort(key=lambda b: -b["hi"])
    return uniq


def dou(mol):
    mh = Chem.AddHs(mol)
    c = sum(1 for a in mh.GetAtoms() if a.GetSymbol() == "C")
    h = sum(1 for a in mh.GetAtoms() if a.GetSymbol() == "H")
    n = sum(1 for a in mh.GetAtoms() if a.GetSymbol() == "N")
    x = sum(1 for a in mh.GetAtoms() if a.GetSymbol() in ("F", "Cl", "Br", "I"))
    return (2 * c + 2 + n - h - x) // 2


def svg_coords(mol):
    """SVG plus each atom's (x, y) in its 260x190 viewBox, so the app can ring atoms linked to a peak."""
    Chem.rdDepictor.Compute2DCoords(mol)
    d = rdMolDraw2D.MolDraw2DSVG(260, 190)
    o = d.drawOptions()
    o.clearBackground = False
    o.bondLineWidth = 2
    o.useBWAtomPalette()
    d.DrawMolecule(mol)
    d.FinishDrawing()
    coords = []
    for i in range(mol.GetNumAtoms()):
        pt = d.GetDrawCoords(i)
        coords.append([round(pt.x, 1), round(pt.y, 1)])
    s = d.GetDrawingText()
    s = re.sub(r"<\?xml[^>]*\?>\s*", "", s)
    s = re.sub(r"<rect[^>]*style='opacity:1\.0;fill:#FFFFFF[^>]*/>", "", s)
    s = s.replace("#000000", "currentColor")
    s = re.sub(r"<svg[^>]*>", '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 260 190" role="img">', s, count=1)
    return re.sub(r"\s+", " ", s), coords


def svg(mol):
    return svg_coords(mol)[0]


def describe(smiles):
    mol = Chem.MolFromSmiles(smiles)
    assert mol is not None, smiles
    h1, c13 = predict(mol)
    pic, coords = svg_coords(Chem.Mol(mol))
    return mol, {
        "smiles": Chem.MolToSmiles(mol),
        "formula": rdMolDescriptors.CalcMolFormula(mol),
        "dou": dou(mol),
        "svg": pic,
        "coords": coords,
        "h1": h1,
        "c13": c13,
        "ir": ir_bands(mol),
    }


# --------------------------------------------------------------------------- data

# Left out on purpose, because the additive rules mispredict them (checked 29 Oct): conjugated carbonyls and
# acrylates, acid chlorides, three-membered rings, thiols and sulfides, HCN, ethyne, anilides, cyclopentanone.
# (SMILES, name). The name is only a search label; the structure, formula and every peak come from the SMILES.
COMPOUNDS = [
    ("CCO", "ethanol"), ("CC(C)=O", "acetone"), ("CCC=O", "propanal"), ("CC(=O)O", "acetic acid"),
    ("CC(=O)OCC", "ethyl acetate"), ("Cc1ccccc1", "toluene"), ("COc1ccc(cc1)C(C)=O", "4-methoxyacetophenone"),
    ("CC#N", "acetonitrile"), ("CC=C", "propene"), ("CCCBr", "1-bromopropane"), ("CCC(C)O", "2-butanol"),
    ("O=Cc1ccccc1", "benzaldehyde"), ("CCN", "ethylamine"), ("CC(=O)N", "acetamide"), ("CC#C", "propyne"),
    ("CCOCC", "diethyl ether"), ("CCCO", "1-propanol"), ("CC(C)O", "2-propanol"), ("CC(C)(C)O", "tert-butanol"),
    ("CCCCO", "1-butanol"), ("CC=O", "acetaldehyde"), ("CCC(C)=O", "2-butanone"), ("CCC(=O)CC", "3-pentanone"),
    ("CCCC=O", "butanal"), ("CC(=O)c1ccccc1", "acetophenone"), ("OCc1ccccc1", "benzyl alcohol"),
    ("Oc1ccccc1", "phenol"), ("Nc1ccccc1", "aniline"), ("COc1ccccc1", "anisole"), ("Brc1ccccc1", "bromobenzene"),
    ("Cc1ccc(Cl)cc1", "4-chlorotoluene"), ("CCC(=O)O", "propanoic acid"), ("CCC(=O)OC", "methyl propanoate"),
    ("COC(=O)c1ccccc1", "methyl benzoate"), ("CCC#N", "propanenitrile"), ("C=CCC", "1-butene"),
    ("CC(C)Br", "2-bromopropane"), ("CCCCl", "1-chloropropane"), ("CCC(=O)c1ccccc1", "propiophenone"),
    ("CCCN", "propylamine"), ("CC(C)CO", "isobutanol"), ("CCCC(=O)O", "butanoic acid"), ("CC(=O)OC", "methyl acetate"),
    # added round 4: wider coverage of what Orgo I and II ask students to read
    ("CO", "methanol"), ("CCBr", "bromoethane"), ("CCCl", "chloroethane"), ("CCI", "iodoethane"),
    ("CC(C)Cl", "2-chloropropane"), ("CC(C)(C)Br", "tert-butyl bromide"), ("CCCCBr", "1-bromobutane"),
    ("CCCCCO", "1-pentanol"), ("CCC(O)CC", "3-pentanol"), ("CC(C)CCO", "isopentyl alcohol"),
    ("CC(C)(C)CO", "neopentyl alcohol"), ("OC1CCCCC1", "cyclohexanol"), ("OC1CCCC1", "cyclopentanol"),
    ("O=C1CCCCC1", "cyclohexanone"), ("CC(=O)C(C)C", "3-methyl-2-butanone"),
    ("CCCC(C)=O", "2-pentanone"), ("CC(C)C=O", "isobutyraldehyde"), ("CC(C)(C)C=O", "pivaldehyde"),
    ("CCCCC=O", "pentanal"), 
    ("CCCCC(=O)O", "pentanoic acid"), ("CC(C)C(=O)O", "isobutyric acid"),
    ("OC(=O)c1ccccc1", "benzoic acid"), ("CC(=O)OC(C)C", "isopropyl acetate"),
    ("CC(=O)OCCC", "propyl acetate"), ("CC(=O)OC(C)(C)C", "tert-butyl acetate"), 
    ("CCOC(=O)CC", "ethyl propanoate"), ("CCOC(=O)c1ccccc1", "ethyl benzoate"), ("CC(=O)Oc1ccccc1", "phenyl acetate"),
    ("CC(=O)OCc1ccccc1", "benzyl acetate"), ("CCC(N)=O", "propanamide"), ("CN", "methylamine"),
    ("CNC", "dimethylamine"), ("CN(C)C", "trimethylamine"), ("CCNCC", "diethylamine"), ("CC(C)N", "isopropylamine"),
    ("CC(C)(C)N", "tert-butylamine"), ("CCCCN", "butylamine"), ("NCc1ccccc1", "benzylamine"),
    ("CCCC#N", "butanenitrile"), ("N#Cc1ccccc1", "benzonitrile"),
    ("C=C", "ethene"), ("CC=CC", "2-butene"), ("CC(C)=C", "isobutene"), ("C=CC=C", "1,3-butadiene"),
    ("CCC=C", "1-butene"), ("CCCC=C", "1-pentene"), ("CC(C)=CC", "2-methyl-2-butene"), ("C=CC(C)C", "3-methyl-1-butene"),
    ("C=Cc1ccccc1", "styrene"), ("C=CCO", "allyl alcohol"), ("C=CBr", "vinyl bromide"), ("C=CCBr", "allyl bromide"),
    ("CCC#C", "1-butyne"), ("CC#CC", "2-butyne"), 
    ("C1CCCCC1", "cyclohexane"), ("C1CCCC1", "cyclopentane"), ("C1=CCCCC1", "cyclohexene"),
    ("CC1CCCCC1", "methylcyclohexane"), ("BrC1CCCCC1", "bromocyclohexane"), ("ClC1CCCCC1", "chlorocyclohexane"),
    ("C1CCOC1", "tetrahydrofuran"), ("C1CCOCC1", "tetrahydropyran"), 
    ("COC", "dimethyl ether"), ("COCC", "ethyl methyl ether"), ("COC(C)(C)C", "methyl tert-butyl ether"),
    ("CCOC=C", "ethyl vinyl ether"), ("COCCOC", "1,2-dimethoxyethane"), ("c1ccccc1", "benzene"),
    ("CCc1ccccc1", "ethylbenzene"), ("CC(C)c1ccccc1", "cumene"), ("CC(C)(C)c1ccccc1", "tert-butylbenzene"),
    ("Cc1ccc(C)cc1", "p-xylene"), ("Cc1ccccc1C", "o-xylene"), ("Cc1cccc(C)c1", "m-xylene"),
    ("Clc1ccccc1", "chlorobenzene"), ("Ic1ccccc1", "iodobenzene"), ("Fc1ccccc1", "fluorobenzene"),
    ("Brc1ccc(Br)cc1", "1,4-dibromobenzene"), ("Cc1ccc(O)cc1", "p-cresol"), ("Cc1ccc(N)cc1", "p-toluidine"),
    ("COc1ccc(C)cc1", "4-methylanisole"), ("COc1ccc(OC)cc1", "1,4-dimethoxybenzene"), ("O=[N+]([O-])c1ccccc1", "nitrobenzene"),
    ("Cc1ccc([N+](=O)[O-])cc1", "4-nitrotoluene"), ("Cc1ccc(C=O)cc1", "4-methylbenzaldehyde"),
    ("COc1ccc(C=O)cc1", "4-methoxybenzaldehyde"), ("O=Cc1ccc(Cl)cc1", "4-chlorobenzaldehyde"),
    ("Cc1ccc(C(C)=O)cc1", "4-methylacetophenone"), ("CC(=O)c1ccc(Cl)cc1", "4-chloroacetophenone"),
    ("O=C(c1ccccc1)c1ccccc1", "benzophenone"), ("CC(O)c1ccccc1", "1-phenylethanol"), ("OCCc1ccccc1", "2-phenylethanol"),
    ("c1ccc(cc1)C(=O)N", "benzamide"), 
    ("CC(=O)OC(C)=O", "acetic anhydride"), ("ClCCl", "dichloromethane"),
    ("ClC(Cl)Cl", "chloroform"), ("CC(Cl)Cl", "1,1-dichloroethane"), ("ClCCCl", "1,2-dichloroethane"),
    ("CC(C)(C)Cl", "tert-butyl chloride"), ("OCCO", "ethylene glycol"), ("CC(O)CO", "propylene glycol"),
    
]


# (id, start, reagent line, correct SMARTS, [decoy SMARTS], ir aid note)
REACTIONS = [
    ("ketone-reduction", "CCC(C)=O", "NaBH4, then H2O",
     "[C:1]=[O:2]>>[C:1][O:2]",
     ["[C:1]=[O:2]>>[C:1]([CH3])[O:2]", "[C:1]=[O:2]>>[C:1]", "[C:1](=[O:2])[C:3]>>[C:1](=[O:2])O[C:3]"]),
    ("aldehyde-oxidation", "CCC=O", "CrO3, H2SO4 (Jones)",
     "[CX3H1:1]=[O:2]>>[C:1](=[O:2])O",
     ["[CX3H1:1]=[O:2]>>[C:1][O:2]", "[CX3H1:1]=[O:2]>>[C:1]([CH3])[O:2]", "[CX3H1:1]=[O:2]>>[C:1]"]),
    ("hydroboration", "C=CCC", "1. BH3 in THF   2. H2O2, NaOH",
     "[CH2:1]=[CH:2]>>[OH][CH2:1][CH2:2]",
     ["[CH2:1]=[CH:2]>>[CH3:1][CH:2][OH]", "[CH2:1]=[CH:2]>>[CH3:1][CH2:2]", "[CH2:1]=[CH:2]>>[CH3:1][CH:2]Br"]),
    ("sn2-cyanide", "CCCBr", "NaCN in DMSO",
     "[CH2:1][Br]>>[CH2:1]C#N",
     ["[CH2:1][Br]>>[CH2:1][OH]", "[CH3][CH2:1][CH2][Br]>>[CH3][CH:1]=[CH2]"]),
    ("fc-acylation", "COc1ccccc1", "CH3COCl, AlCl3",
     "[O:5][c:4][cH:3][cH:2][cH:1]>>[O:5][c:4][cH:3][cH:2][c:1]C(C)=O",
     ["[O:5][c:4][cH:3]>>[O:5][c:4][c:3]C(C)=O", "[O:5][c:4][cH:3][cH:2]>>[O:5][c:4][cH:3][c:2]C(C)=O"]),
    ("fischer", "CCC(=O)O", "CH3OH, H2SO4 (cat.)",
     "[C:1](=[O:2])[OH]>>[C:1](=[O:2])OC",
     ["[C:1](=[O:2])[OH]>>[C:1][OH]", "[C:1](=[O:2])[OH]>>[C:1](=[O:2])Cl", "[C:1](=[O:2])[OH]>>[C:1](=[O:2])N"]),
    ("aryl-ketone-reduction", "CC(=O)c1ccccc1", "NaBH4, then H2O",
     "[CH3:3][C:1](=[O:2])>>[CH3:3][C:1][O:2]",
     ["[CH3:3][C:1](=[O:2])>>[CH3:3][C:1]([CH3])[O:2]", "[CH3:3][C:1](=[O:2])>>[CH3:3][C:1]"]),
    ("alcohol-oxidation", "CCCCO", "PCC, CH2Cl2",
     "[CH2:1][OH:2]>>[CH:1]=[O:2]",
     ["[CH2:1][OH:2]>>[C:1](=[O:2])O", "[CH2:1][OH:2]>>[CH2:1]Br", "[CH2:1][OH:2]>>[CH2:1]N"]),
    ("markovnikov-hbr", "CCC=C", "HBr",
     "[CH2:1]=[CH:2]>>[CH3:1][CH:2]Br",
     ["[CH2:1]=[CH:2]>>Br[CH2:1][CH2:2]", "[CH2:1]=[CH:2]>>[CH3:1][CH:2]O", "[CH2:1]=[CH:2]>>[CH3:1][CH2:2]"]),
]


def run_rxn(smarts, start):
    rxn = AllChem.ReactionFromSmarts(smarts)
    outs = []
    for ps in rxn.RunReactants((start,)):
        for p in ps:
            try:
                p = Chem.RemoveHs(p)
                Chem.SanitizeMol(p)
                outs.append(Chem.MolToSmiles(p))
            except Exception:
                pass
    return sorted(set(outs))


def signature(d):
    return tuple((round(p["shift"], 1), p["nH"], p["mult"]) for p in d["h1"])


def build_questions():
    qs = []
    for i, (qid, start_smi, reagent, good, bad) in enumerate(REACTIONS):
        start = Chem.MolFromSmiles(start_smi)
        prod = run_rxn(good, start)
        assert prod, qid
        correct = prod[0]
        opts = [correct]
        for b in bad:
            ps = [p for p in run_rxn(b, start) if p not in opts and p != Chem.MolToSmiles(start)]
            if ps:
                opts.append(ps[0])
        opts = opts[:4]
        descs = [describe(s)[1] for s in opts]
        sigs = [signature(d) for d in descs]
        assert len(set(sigs)) == len(sigs), (qid, "options not distinguishable by 1H", opts)
        assert len(opts) >= 3, (qid, opts)
        # fixed answer position, varied across the set
        pos = i % len(opts)
        order = [j for j in range(1, len(opts))]
        order.insert(pos, 0)
        options = [{"smiles": descs[j]["smiles"], "svg": descs[j]["svg"], "formula": descs[j]["formula"], "coords": descs[j]["coords"]} for j in order]
        d0 = descs[0]
        qs.append({
            "id": qid,
            "start": {"smiles": Chem.MolToSmiles(start), "svg": svg(Chem.Mol(start)), "formula": rdMolDescriptors.CalcMolFormula(start)},
            "reagent": reagent,
            "options": options,
            "answer": pos,
            "product": {"formula": d0["formula"], "dou": d0["dou"], "h1": d0["h1"], "c13": d0["c13"], "ir": d0["ir"]},
        })
    return qs


def main():
    comps = []
    seen = set()
    for i, (smi, name) in enumerate(COMPOUNDS):
        _m, d = describe(smi)
        if d["smiles"] in seen:
            continue
        seen.add(d["smiles"])
        d["name"] = name
        d["id"] = f"c{i + 1}"
        comps.append(d)
    qs = build_questions()
    head = "// GENERATED by scripts/gen_spectra.py (RDKit). Do not edit by hand.\n// Peaks are additive-rule predictions, not measured spectra.\n"
    body = (
        head
        + "import type { SpectraCompound } from \"./spectraTypes\";\n\n"
        + f"export const SPECTRA_COMPOUNDS: readonly SpectraCompound[] = {json.dumps(comps, separators=(',', ':'))};\n"
    )
    qbody = (
        head
        + "// Kept apart from spectra.generated.ts so the practice pools do not pull in the whole compound library.\n"
        + "import type { NmrProductQuestion } from \"./spectraTypes\";\n\n"
        + f"export const NMR_PRODUCT_QUESTIONS: readonly NmrProductQuestion[] = {json.dumps(qs, separators=(',', ':'))};\n"
    )
    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_text(body, encoding="utf-8")
    OUT.with_name("nmrProducts.generated.ts").write_text(qbody, encoding="utf-8")
    print("wrote", OUT, len(body) // 1024, "KB;", len(comps), "compounds,", len(qs), "questions")
    for c in comps[:3] + comps[6:7]:
        print(c["smiles"], c["formula"], "DOU", c["dou"], [(p["shift"], p["nH"], p["mult"]) for p in c["h1"]], [p["shift"] for p in c["c13"]])
    for q in qs:
        print(q["id"], q["start"]["smiles"], "->", [o["smiles"] for o in q["options"]], "ans", q["answer"])


# --------------------------------------------------------------------------- RANGE TABLE
#
# The range chart the Spectra tab opens on. The NUMBERS are a standard textbook range table,
# not a prediction:
#   Pavia, Lampman, Kriz and Vyvyan, "Introduction to Spectroscopy", 5th ed. (Cengage, 2015):
#     IR, chapter 2 and its Appendix 2 correlation chart; 1H, chapter 3 and Appendix 3;
#     13C, chapter 4 (Figure 4.2 correlation chart) and Appendix 7.
#   Cross-checked against Klein, "Organic Chemistry", 4th ed. (Wiley), Tables 14.2, 15.1 and 15.4.
# Owner-approved IR numbers (24 Oct 2026): C=O about 1690-1720 with conjugation, ring and ester
# shifts; sp2 C-H just above 3000 and sp3 just below; broad O-H and N-H.
#
# Everything ELSE about a box is derived here with RDKit: every example molecule is parsed from
# SMILES, the feature it stands for is located with a SMARTS match (the script stops if a
# molecule does not contain it), the drawing highlights exactly the matched atoms, and the
# "estimate for this example" is this file's own additive predictor (predict above), shown only
# when it lands inside the box it illustrates.
#
# Fields: (id, family, card label, title, represents, hi, lo, shape, strength, why,
#          example, [shifts])
#   example = (smiles, name, smarts, highlight indices into the match or None for all,
#              index into the match whose H is the subject or None)
#   shift   = (kind, label, hi, lo, why, example or None)

HL = "#FF00FF"  # sentinel highlight colour, swapped for a CSS variable after drawing

IR_TABLE = [
    ("ir-oh", "O", "O–H", "O–H, alcohol", "An H on an O (alcohol or phenol)", 3550, 3200, "broad", "strong",
     "O–H is a stiff bond to a very light atom, so it absorbs high. Hydrogen bonding between molecules gives every O–H a slightly different strength, so the peak smears into a wide, rounded band.",
     ("CCO", "ethanol", "[CX4][OX2H1]", [1], 1),
     [("hbond", "No hydrogen bonding", 3650, 3580, "Dilute, or in the gas phase, each O–H is free: one bond strength, so a sharp peak a little higher.", None)]),
    ("ir-acid-oh", "O", "COO–H", "O–H, carboxylic acid", "The H on the O of a COOH", 3300, 2500, "broad", "strong",
     "Acids pair up into dimers held by two strong hydrogen bonds. That weakens and spreads the O–H stretch so far that it runs under the C–H peaks near 3000.",
     ("CC(=O)O", "acetic acid", "[CX3](=O)[OX2H1]", [2], 2), []),
    ("ir-nh", "N", "N–H", "N–H, amine or amide", "An H on an N", 3500, 3300, "broad", "medium",
     "N–H is a little weaker and less polar than O–H, so the band is smaller and narrower than an alcohol's. NH2 shows two points (two stretches), NH shows one.",
     ("CCCN", "propylamine", "[CX4][NX3H2]", [1], 1), []),
    ("ir-sp-ch", "C", "≡C–H", "C–H on a triple bond", "An H on an sp carbon (terminal alkyne)", 3330, 3260, "sharp", "strong",
     "An sp carbon holds its electrons close (50% s character), so this C–H is the shortest and stiffest C–H. Sharp, because nothing hydrogen-bonds to it.",
     ("C#CCC", "1-butyne", "[CX2H1]#[CX2]", [0], 0), []),
    ("ir-sp2-ch", "C", "=C–H", "C–H on a C=C or ring", "An H on an sp2 carbon", 3100, 3000, "sharp", "medium",
     "More s character than sp3, so a slightly stiffer C–H. Anything just above 3000 means a C=C or an aromatic ring is present.",
     ("C1=CCCCC1", "cyclohexene", "[CX3H1]=[CX3]", [0], 0), []),
    ("ir-sp3-ch", "C", "C–H", "C–H, alkane", "An H on an sp3 carbon", 3000, 2850, "sharp", "strong",
     "Nearly every organic molecule has these, just below 3000. They tell you little; the question is whether anything shows above 3000.",
     ("CCCC", "butane", "[CX4H2]", [0], 0), []),
    ("ir-ald-ch", "C", "O=C–H", "C–H, aldehyde", "The H on an aldehyde's C=O carbon", 2850, 2700, "sharp", "weak",
     "Shows as two small peaks, near 2820 and 2720 (the stretch mixes with a bending overtone). The one near 2720 stands clear of the alkane C–H and gives the aldehyde away.",
     ("CCC=O", "propanal", "[CX3H1]=O", [0], 0), []),
    ("ir-cn", "N", "C≡N", "C≡N, nitrile", "A carbon triple-bonded to N", 2260, 2210, "sharp", "medium",
     "Triple bonds are the stiffest, so they land in an otherwise empty region. The polar C≡N gives a clear, sharp peak.",
     ("CCC#N", "propanenitrile", "[CX2]#[NX1]", None, None), []),
    ("ir-cc3", "C", "C≡C", "C≡C, alkyne", "A carbon-carbon triple bond", 2260, 2100, "sharp", "weak",
     "Weak, because stretching a fairly symmetric C≡C barely changes the dipole. In a symmetric internal alkyne it can vanish.",
     ("CCCC#C", "1-pentyne", "[CX2]#[CX2]", None, None), []),
    ("ir-co", "O", "C=O", "C=O, ketone or aldehyde", "A carbon double-bonded to O", 1720, 1690, "sharp", "strong",
     "Very polar, so stretching it changes the dipole a lot: usually the strongest peak in the spectrum. A plain ketone sits near 1715; what is attached to the carbonyl carbon moves it.",
     ("CCC(C)=O", "butanone", "[#6][CX3](=O)[#6]", [1, 2], None),
     [("conj", "Conjugated with C=C or a ring", 1690, 1665, "The pi system shares electrons with the C=O and gives it some single-bond character. Weaker bond, lower wavenumber.",
       ("CC(=O)c1ccccc1", "acetophenone", "[CX3](=O)c", [0, 1, 2], None)),
      ("ewg", "Ester: O on the carbonyl C", 1750, 1735, "The extra O pulls electron density through the sigma bond, shortening the C=O. Stiffer bond, higher wavenumber.",
       ("CCOC(C)=O", "ethyl acetate", "[#6][CX3](=O)[OX2][#6]", [1, 2, 3], None)),
      ("edg", "Amide: N on the carbonyl C", 1690, 1630, "Nitrogen donates its lone pair into the C=O by resonance, so the C=O is closer to a single bond. Amides sit lowest.",
       ("CC(N)=O", "acetamide", "[CX3](=O)[NX3]", [0, 1, 2], None)),
      ("strain", "In a five-membered ring", 1750, 1740, "Squeezing the ring angle puts more s character into the C=O bond and stiffens it.",
       ("O=C1CCCC1", "cyclopentanone", "O=[CX3;R]", [0, 1], None))]),
    ("ir-cc2", "C", "C=C", "C=C, alkene", "A carbon-carbon double bond", 1680, 1620, "sharp", "medium",
     "Weaker and far less polar than C=O, so a smaller peak. A symmetric alkene may barely show.",
     ("C1=CCCCC1", "cyclohexene", "[CX3]=[CX3]", None, None), []),
    ("ir-ar", "C", "Ring C=C", "C=C, aromatic ring", "The ring bonds of a benzene", 1600, 1450, "sharp", "medium",
     "Ring bonds sit between single and double, so they absorb below an alkene's C=C. Look for a pair of peaks near 1600 and 1500, with C–H just above 3000.",
     ("Cc1ccccc1", "toluene", "c1ccccc1", None, None), []),
    ("ir-c-o", "O", "C–O", "C–O, alcohol, ether, ester", "A carbon single-bonded to O", 1300, 1000, "sharp", "strong",
     "Strong, but buried among many other peaks below 1500. Use it only to back up an O–H or C=O you already found.",
     ("CCOCC", "diethyl ether", "[CX4][OX2][CX4]", [0, 1], None), []),
    ("ir-c-x", "X", "C–Cl", "C–Cl, alkyl chloride", "A carbon bonded to chlorine", 850, 550, "sharp", "medium",
     "A heavy atom on a weaker bond absorbs low, deep in the fingerprint region. Too crowded to read on its own.",
     ("CCCCCl", "1-chlorobutane", "[CX4][Cl]", None, None), []),
]

H1_TABLE = [
    ("h-acid", "O", "COO–H", "Carboxylic acid O–H", "The H on the O of a COOH", 13.0, 10.0, "broad", None,
     "The O sits next to a C=O that pulls density away, and dimer hydrogen bonding deshields it further. A broad singlet far to the left that disappears with D2O.",
     ("CC(=O)O", "acetic acid", "[CX3](=O)[OX2H1]", [2], 2), []),
    ("h-ald", "CO", "O=C–H", "Aldehyde H", "The H on an aldehyde's C=O carbon", 10.0, 9.0, "sharp", None,
     "The electronegative O pulls density away, and the C=O pi electrons circulate to deshield this H further. Few other signals land here.",
     ("CCC=O", "propanal", "[CX3H1]=O", [0], 0), []),
    ("h-ar", "C", "Ar–H", "Aromatic H", "An H on a benzene ring", 8.0, 6.5, "sharp", None,
     "The ring's pi electrons circulate in the magnet's field (ring current) and add to the field where the ring H sit. That deshields them strongly.",
     ("Cc1ccccc1", "toluene", "[cH1]", [0], 0),
     [("ewg", "Withdrawing group on the ring", 8.5, 7.5, "A nitro or C=O pulls density out of the ring, mostly from ortho and para, so those H move downfield.",
       ("O=[N+]([O-])c1ccccc1", "nitrobenzene", "[cH1]c[N+](=O)[O-]", [0], 0)),
      ("edg", "Donating group on the ring", 7.0, 6.5, "An O or N lone pair feeds density into the ring at ortho and para, shielding those H.",
       ("COc1ccccc1", "anisole", "[cH1]cO[CH3]", [0], 0))]),
    ("h-vinyl", "C", "=C–H", "Alkene H", "An H on a C=C carbon", 6.5, 4.5, "sharp", None,
     "Circulating pi electrons of the C=C deshield H on its carbons, less than a benzene ring does.",
     ("C1=CCCCC1", "cyclohexene", "[CX3H1]=[CX3]", [0], 0),
     [("ewg", "C=C next to a C=O", 7.0, 5.8, "The C=O pulls density through the pi system, leaving the far alkene H deshielded.",
       ("C=CC(C)=O", "3-buten-2-one", "[CX3H2]=[CX3][CX3]=O", [0], 0)),
      ("edg", "O on the C=C", 4.5, 3.8, "The O lone pair donates into the C=C and piles density on the far carbon, shielding its H.",
       ("C=COCC", "ethyl vinyl ether", "[CX3H2]=[CX3][OX2]", [0], 0))]),
    ("h-c-x", "O", "H–C–X", "H on a C bonded to O, N or halogen", "An H on a carbon that carries an electronegative atom", 4.0, 2.2, "sharp", None,
     "The O, N or halogen pulls density from the C–H, so the H is less shielded. The harder the pull, the further left: O and Cl near 3.5, N near 2.5.",
     ("CCO", "ethanol", "[CX4H2][OX2H1]", [0], 0),
     [("ewg", "The O is an ester O", 4.3, 3.7, "The C=O pulls on the O, which pulls harder on the CH next to it.",
       ("CCOC(C)=O", "ethyl acetate", "[CX4H2][OX2][CX3]=O", [0], 0)),
      ("ewg", "Two halogens on one C", 5.5, 5.0, "Each extra electronegative neighbour adds its own pull, so the shifts add up.",
       ("ClCCl", "dichloromethane", "[CX4H2](Cl)Cl", [0], 0))]),
    ("h-alpha", "CO", "H–C–C=O", "H next to C=O or a ring", "An H on a carbon beside a C=O, C=C or benzene", 2.7, 2.0, "sharp", None,
     "The neighbouring pi system pulls a little density and its circulating electrons deshield nearby H a little: weaker than a heteroatom on the same carbon.",
     ("CC(C)=O", "acetone", "[CX4H3][CX3]=O", [0], 0), []),
    ("h-alkyne", "C", "≡C–H", "Alkyne H", "An H on a triple-bonded carbon", 3.1, 1.7, "sharp", None,
     "The sp carbon pulls density away, but the H sits on the triple bond's axis, where circulating pi electrons shield it. The two effects meet near 2 to 3.",
     ("C#CCC", "1-butyne", "[CX2H1]#[CX2]", [0], 0), []),
    ("h-alkane", "C", "C–H", "Alkane H", "An H on an sp3 carbon with only C and H around it", 1.8, 0.9, "sharp", None,
     "No electronegative neighbour and no pi system, so the H keeps its density and stays shielded, upfield. CH3 near 0.9, CH2 near 1.3, CH near 1.5.",
     ("CCCC", "butane", "[CX4H3]", [0], 0), []),
    ("h-oh", "O", "O–H, N–H", "Alcohol O–H or amine N–H", "An H on the O of an alcohol or the N of an amine", 5.0, 0.5, "broad", None,
     "Where it lands depends on concentration, solvent and temperature, because hydrogen bonding changes its density. Usually a broad singlet that does not split its neighbours, and it disappears with D2O.",
     ("CCO", "ethanol", "[CX4][OX2H1]", [1], 1), []),
]

C13_TABLE = [
    ("c-ketone", "CO", "C=O", "C=O, ketone or aldehyde", "The carbonyl carbon of a ketone or aldehyde", 220, 190, "sharp", None,
     "The O pulls density away and the C=O pi electrons deshield it: the furthest-left carbons in the spectrum.",
     ("CCC(C)=O", "butanone", "[#6][CX3](=O)[#6]", [1], None),
     [("edg", "O or N on the carbonyl C", 185, 160, "In acids, esters and amides the O or N lone pair donates into the C=O and shields that carbon.",
       ("CCOC(C)=O", "ethyl acetate", "[CX3](=O)[OX2]", [0], None))]),
    ("c-ar", "C", "Ar C", "Aromatic C", "A carbon in a benzene ring", 160, 110, "sharp", None,
     "sp2 carbons in a ring current. Substituents spread the ring carbons across this box.",
     ("Cc1ccccc1", "toluene", "c1ccccc1", [3], None), []),
    ("c-alkene", "C", "C=C", "Alkene C", "A carbon in a C=C", 150, 100, "sharp", None,
     "sp2 carbons hold less density round the nucleus than sp3, so they are deshielded.",
     ("C1=CCCCC1", "cyclohexene", "[CX3]=[CX3]", [0], None), []),
    ("c-cn", "N", "C≡N", "Nitrile C", "The carbon of a C≡N", 125, 110, "sharp", None,
     "The electronegative N pulls density from the sp carbon, so it sits well left of an alkyne carbon.",
     ("CCC#N", "propanenitrile", "[CX2]#[NX1]", [0], None), []),
    ("c-alkyne", "C", "C≡C", "Alkyne C", "A carbon in a C≡C", 90, 65, "sharp", None,
     "Shielded by the triple bond's circulating pi electrons, so it sits upfield of alkene carbons.",
     ("C#CCC", "1-butyne", "[CX2]#[CX2]", [1], None), []),
    ("c-o", "O", "C–O", "C bonded to O", "An sp3 carbon carrying an O", 90, 50, "sharp", None,
     "Oxygen pulls density from the carbon it is bonded to, moving it well downfield of a plain alkane carbon.",
     ("CCO", "ethanol", "[CX4][OX2H1]", [0], None), []),
    ("c-n", "N", "C–N", "C bonded to N", "An sp3 carbon carrying an N", 65, 30, "sharp", None,
     "N is less electronegative than O, so the shift is smaller.",
     ("CCCN", "propylamine", "[CX4][NX3]", [0], None), []),
    ("c-alkane", "C", "C–C", "Alkane C", "An sp3 carbon with only C and H around it", 50, 0, "sharp", None,
     "No electronegative neighbour, so these carbons keep their density and sit upfield.",
     ("CCCC", "butane", "[CX4H2]", [0], None), []),
]


def range_pic(spec, mode):
    """Draw an example molecule (viewBox cropped to it) with the matched feature highlighted; the subject H drawn explicitly."""
    smiles, name, smarts, pick, h_on = spec
    mol = Chem.MolFromSmiles(smiles)
    assert mol is not None, smiles
    patt = Chem.MolFromSmarts(smarts)
    match = mol.GetSubstructMatch(patt)
    assert match, f"{name} ({smiles}) does not contain {smarts}"
    atoms = [match[i] for i in (pick if pick is not None else range(len(match)))]
    est = None
    h1, c13 = predict(mol)
    if mode == "h1" and h_on is not None:
        hit = [p for p in h1 if match[h_on] in p["atoms"]]
        est = hit[0]["shift"] if hit else None
    if mode == "c13":
        hit = [p for p in c13 if atoms[0] in p["atoms"]]
        est = hit[0]["shift"] if hit else None
    draw = Chem.Mol(mol)
    if h_on is not None:
        n0 = draw.GetNumAtoms()
        draw = Chem.AddHs(draw, onlyOnAtoms=(match[h_on],))
        assert draw.GetNumAtoms() > n0, f"{name}: no H on atom {match[h_on]}"
        atoms = atoms + [n0]
    bonds = []
    for b in draw.GetBonds():
        if b.GetBeginAtomIdx() in atoms and b.GetEndAtomIdx() in atoms:
            bonds.append(b.GetIdx())
    Chem.rdDepictor.Compute2DCoords(draw)
    d = rdMolDraw2D.MolDraw2DSVG(240, 150)
    o = d.drawOptions()
    o.clearBackground = False
    o.bondLineWidth = 2
    o.fixedBondLength = 30
    o.baseFontSize = 0.85
    o.padding = 0.12
    o.useBWAtomPalette()
    o.setHighlightColour((1.0, 0.0, 1.0))
    o.highlightBondWidthMultiplier = 10
    o.fillHighlights = True
    o.highlightRadius = 0.45
    d.DrawMolecule(draw, highlightAtoms=atoms, highlightBonds=bonds,
                   highlightAtomColors={i: (1.0, 0.0, 1.0) for i in atoms},
                   highlightBondColors={i: (1.0, 0.0, 1.0) for i in bonds})
    d.FinishDrawing()
    # Crop to the molecule, so every example draws at the same bond length whatever its size.
    pts = [d.GetDrawCoords(i) for i in range(draw.GetNumAtoms())]
    # Atom labels (OH, NH2, Cl) reach past the atom's centre, so leave more room sideways.
    px, py = 24, 16
    x0 = max(min(pt.x for pt in pts) - px, 0)
    y0 = max(min(pt.y for pt in pts) - py, 0)
    x1 = min(max(pt.x for pt in pts) + px, 240)
    y1 = min(max(pt.y for pt in pts) + py, 150)
    vb = f"{x0:.0f} {y0:.0f} {x1 - x0:.0f} {y1 - y0:.0f}"
    s = d.GetDrawingText()
    s = re.sub(r"<\?xml[^>]*\?>\s*", "", s)
    s = re.sub(r"<rect[^>]*style='opacity:1\.0;fill:#FFFFFF[^>]*/>", "", s)
    s = s.replace("#000000", "currentColor").replace(HL, "var(--sp-hl)")
    s = re.sub(r"<svg[^>]*>", f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="{vb}" aria-hidden="true">', s, count=1)
    s = re.sub(r"<!--.*?-->", "", s)
    s = re.sub(r"(\d+\.\d)\d+", r"\1", s)
    # Drop SVG defaults and class names so the file stays small.
    for junk in ("fill-rule:evenodd;", "fill-opacity:1;", "stroke-linecap:butt;", "stroke-linejoin:miter;", "stroke-miterlimit:10;", "stroke-opacity:1;", "stroke-opacity:1"):
        s = s.replace(junk, "")
    s = re.sub(r" class='[^']*'", "", s)
    out = {"smiles": Chem.MolToSmiles(mol), "name": name, "svg": re.sub(r"\s+", " ", s).strip()}
    if est is not None:
        out["estimate"] = round(est, 1)
    return out


def build_ranges():
    out = []
    for mode, table in (("ir", IR_TABLE), ("h1", H1_TABLE), ("c13", C13_TABLE)):
        for (bid, fam, label, title, rep, hi, lo, shape, strength, why, ex, shifts) in table:
            assert hi > lo, bid
            pic = range_pic(ex, mode)
            # An estimate is shown only when the predictor agrees with the box it illustrates.
            if "estimate" in pic and not (lo - 0.05 * (hi - lo) <= pic["estimate"] <= hi + 0.05 * (hi - lo)):
                print("  dropped estimate", bid, pic["estimate"], "outside", lo, hi)
                del pic["estimate"]
            if mode == "ir":
                pic.pop("estimate", None)
            box = {"id": bid, "mode": mode, "family": fam, "label": label, "title": title, "represents": rep,
                   "hi": hi, "lo": lo, "shape": shape, "why": why, "example": pic, "shifts": []}
            if strength:
                box["strength"] = strength
            for (kind, slabel, shi, slo, swhy, sex) in shifts:
                assert shi > slo, (bid, slabel)
                sh = {"kind": kind, "label": slabel, "hi": shi, "lo": slo, "why": swhy}
                if sex is not None:
                    sp = range_pic(sex, mode)
                    if "estimate" in sp and (mode == "ir" or not (slo - 0.05 * (shi - slo) <= sp["estimate"] <= shi + 0.05 * (shi - slo))):
                        if mode != "ir":
                            print("  dropped shift estimate", bid, slabel, sp["estimate"], "outside", slo, shi)
                        del sp["estimate"]
                    sh["example"] = sp
                box["shifts"].append(sh)
            out.append(box)
    return out


def main_ranges():
    boxes = build_ranges()
    path = OUT.with_name("rangeChart.generated.ts")
    body = (
        "// GENERATED by scripts/gen_spectra.py --ranges (RDKit). Do not edit by hand.\n"
        "// Ranges: Pavia et al., Introduction to Spectroscopy, 5th ed. (see RANGE TABLE in the script).\n"
        "// Example molecules, highlights and estimates are derived with RDKit.\n"
        "import type { RangeBox } from \"./rangeTypes\";\n\n"
        f"export const RANGE_BOXES: readonly RangeBox[] = {json.dumps(boxes, separators=(',', ':'), ensure_ascii=False)};\n"
    )
    path.write_text(body, encoding="utf-8")
    print("wrote", path, len(body) // 1024, "KB;", len(boxes), "boxes")
    for b in boxes:
        print(" ", b["id"], b["hi"], b["lo"], b["example"]["name"], b["example"].get("estimate"), [(s["label"], s.get("example", {}).get("estimate")) for s in b["shifts"]])


if __name__ == "__main__":
    import sys

    if "--ranges" in sys.argv:
        main_ranges()
    else:
        main()
        main_ranges()
