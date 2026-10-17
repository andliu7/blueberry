"""
Unit 1 guidebook drawings, derived with RDKit.

    python scripts/guide_u1.py          writes src/game/guide/u1Guide.figures.ts
    python scripts/guide_u1.py --check  rebuilds it in memory and fails if the file on disk differs

WHAT THIS SCRIPT OWNS. The mini-example drawn under each Unit 1 lesson in the
guidebook (src/game/guide/). Every structure is a SMILES string parsed by
RDKit, every product is MADE by RDKit (bond edits or a reaction SMARTS run on
the starting material), and every product that a Unit 1 pool also asks for is
checked against that pool's own answer SMILES. A mismatch stops the script and
nothing is written. So the guidebook never shows a structure the pools would
mark wrong.

WHAT IT DOES NOT OWN. The words. Key ideas and common mistakes live in
src/game/guide/u1Guide.ts, and every one of them quotes a Unit 1 pool entry
word for word (test/guideU1.test.ts holds that). Where a rule picks between
products (thermodynamic by alkene substitution, para for a 2-substituted
diene), the rule is the pools' own, quoted beside it, and the script applies it
by counting atoms rather than by recall.

Every example is a draft (placeholder: true) until the owner signs it off.
"""
from __future__ import annotations

import json
import re
import sys
from pathlib import Path

import numpy as np
from rdkit import Chem, RDLogger
from rdkit.Chem import AllChem, rdDepictor
from rdkit.Chem.EnumerateStereoisomers import EnumerateStereoisomers

RDLogger.DisableLog("rdApp.*")

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / "src" / "game" / "guide" / "u1Guide.figures.ts"
POOL_FILES = sorted((ROOT / "src" / "game" / "content" / "u1").glob("*.ts"))

W, H = 120, 84
BOND = 17.0
MARGIN = 9.0
MINUS = "−"


# --------------------------------------------------------------------------
# Small helpers
# --------------------------------------------------------------------------

def canon(smiles: str) -> str:
    mol = Chem.MolFromSmiles(smiles)
    assert mol is not None, f"RDKit cannot parse {smiles}"
    return Chem.MolToSmiles(mol)


def pool_answers() -> set[str]:
    """Every answer SMILES the Unit 1 pool files carry, canonical."""
    found: set[str] = set()
    for path in POOL_FILES:
        for m in re.finditer(r'"?smiles"?\s*:\s*"([^"]+)"', path.read_text(encoding="utf-8")):
            mol = Chem.MolFromSmiles(m.group(1))
            if mol is not None:
                found.add(Chem.MolToSmiles(mol))
    return found


POOL = pool_answers()


def in_pool(smiles: str) -> str:
    """The product must be one the Unit 1 pools already ask for."""
    c = canon(smiles)
    assert c in POOL, f"{c} is not an answer anywhere in the Unit 1 pools"
    return c


def alkene_substitution(mol: Chem.Mol) -> int:
    """Carbons attached to the C=C carbons, the pools' thermodynamic yardstick."""
    best = 0
    for b in mol.GetBonds():
        if b.GetBondType() != Chem.BondType.DOUBLE:
            continue
        a, c = b.GetBeginAtom(), b.GetEndAtom()
        if a.GetSymbol() != "C" or c.GetSymbol() != "C":
            continue
        n = sum(1 for x in (a, c) for nb in x.GetNeighbors() if nb.GetSymbol() == "C" and nb.GetIdx() not in (a.GetIdx(), c.GetIdx()))
        best = max(best, n)
    return best


# --------------------------------------------------------------------------
# Reactions, done as bond edits on the real starting material
# --------------------------------------------------------------------------

def diene_atoms(mol: Chem.Mol, first_end: int | None = None) -> tuple[int, int, int, int]:
    """C1..C4 of the conjugated diene. `first_end` picks which end is C1."""
    for match in mol.GetSubstructMatches(Chem.MolFromSmarts("C=CC=C")):
        if first_end is None or match[0] == first_end:
            return match  # type: ignore[return-value]
        if match[3] == first_end:
            return tuple(reversed(match))  # type: ignore[return-value]
    raise ValueError("no conjugated diene")


def add_across(diene: str, x1: str | None, x2: str, mode: str, first_end: int | None = None) -> str:
    """Electrophilic addition to a diene: E on C1, nucleophile on C2 (1,2) or C4 (1,4).
    x1 None means the electrophile is H (implicit)."""
    mol = Chem.RWMol(Chem.MolFromSmiles(diene))
    c1, c2, c3, c4 = diene_atoms(mol, first_end)
    mol.GetBondBetweenAtoms(c1, c2).SetBondType(Chem.BondType.SINGLE)
    if x1 is not None:
        mol.AddBond(c1, mol.AddAtom(Chem.Atom(x1)), Chem.BondType.SINGLE)
    if mode == "1,2":
        mol.AddBond(c2, mol.AddAtom(Chem.Atom(x2)), Chem.BondType.SINGLE)
    else:
        mol.GetBondBetweenAtoms(c2, c3).SetBondType(Chem.BondType.DOUBLE)
        mol.GetBondBetweenAtoms(c3, c4).SetBondType(Chem.BondType.SINGLE)
        mol.AddBond(c4, mol.AddAtom(Chem.Atom(x2)), Chem.BondType.SINGLE)
    for a in mol.GetAtoms():
        a.SetNoImplicit(False)
    Chem.SanitizeMol(mol)
    return Chem.MolToSmiles(mol)


def best_protonation_end(diene: str) -> int:
    """Protonate the end that leaves the best allylic cation: the cation whose
    charged carbons (C2 and C4) carry the most carbons. Counted, not recalled."""
    mol = Chem.MolFromSmiles(diene)
    c1, c2, c3, c4 = diene_atoms(mol)

    def carbons_on(idx: int) -> int:
        return sum(1 for nb in mol.GetAtomWithIdx(idx).GetNeighbors() if nb.GetSymbol() == "C")

    # H+ on C1 puts the charge on C2 (and C4); H+ on C4 puts it on C3 (and C1).
    # The far end carbons are the same either way, so the near one decides.
    return c1 if carbons_on(c2) >= carbons_on(c3) else c4


def protonated_cation(diene: str) -> str:
    """H+ on C1 of buta-1,3-diene style dienes: the allylic cation, charge on C2."""
    mol = Chem.RWMol(Chem.MolFromSmiles(diene))
    c1, c2, _, _ = diene_atoms(mol)
    mol.GetBondBetweenAtoms(c1, c2).SetBondType(Chem.BondType.SINGLE)
    mol.GetAtomWithIdx(c2).SetFormalCharge(1)
    for a in mol.GetAtoms():
        a.SetNoImplicit(False)
    Chem.SanitizeMol(mol)
    return Chem.MolToSmiles(mol)


def nbs_products(alkene: str) -> list[str]:
    """Allylic bromination: every allylic C-H, both ends of each allylic radical."""
    mol = Chem.MolFromSmiles(alkene)
    out: list[str] = []
    for allylic, ca, cb in mol.GetSubstructMatches(Chem.MolFromSmarts("[CX4;!H0]-[C]=[C]")):
        direct = Chem.RWMol(mol)
        direct.AddBond(allylic, direct.AddAtom(Chem.Atom("Br")), Chem.BondType.SINGLE)
        shifted = Chem.RWMol(mol)
        shifted.GetBondBetweenAtoms(allylic, ca).SetBondType(Chem.BondType.DOUBLE)
        shifted.GetBondBetweenAtoms(ca, cb).SetBondType(Chem.BondType.SINGLE)
        shifted.AddBond(cb, shifted.AddAtom(Chem.Atom("Br")), Chem.BondType.SINGLE)
        for m in (direct, shifted):
            for a in m.GetAtoms():
                a.SetNoImplicit(False)
            Chem.SanitizeMol(m)
            # E and Z counted as one constitutional product, as the pools count them.
            s = Chem.MolToSmiles(m, isomericSmiles=False)
            if s not in out:
                out.append(s)
    return out


DA = AllChem.ReactionFromSmarts("[C:1]=[C:2]-[C:3]=[C:4].[C:5]=[C:6]>>[C:1]1-[C:2]=[C:3]-[C:4]-[C:6]-[C:5]-1")


def diels_alder(diene: str, dienophile: str) -> list[str]:
    """Every Diels-Alder product RDKit's template gives, unique, stereo kept."""
    out: list[str] = []
    for prods in DA.RunReactants((Chem.MolFromSmiles(diene), Chem.MolFromSmiles(dienophile))):
        p = prods[0]
        try:
            Chem.SanitizeMol(p)
        except Exception:
            continue
        s = Chem.MolToSmiles(p)
        if s not in out:
            out.append(s)
    return out


def ring_distance(smiles: str, a_smarts: str, b_smarts: str) -> int:
    """Bonds between the ring carbons carrying two substituents (3 is para, 1 ortho)."""
    mol = Chem.MolFromSmiles(smiles)
    a = mol.GetSubstructMatch(Chem.MolFromSmarts(a_smarts))
    b = mol.GetSubstructMatch(Chem.MolFromSmarts(b_smarts))
    return len(Chem.GetShortestPath(mol, a[0], b[0])) - 1


def ring_face_relation(smiles: str, sub_smarts: str) -> str:
    """cis or trans for the two ring carbons matched by sub_smarts' first atom,
    read from a 3D embedding: the side of the ring plane each substituent sits on."""
    mol = Chem.AddHs(Chem.MolFromSmiles(smiles))
    AllChem.EmbedMolecule(mol, randomSeed=7)
    pos = mol.GetConformer().GetPositions()
    ring = next(r for r in mol.GetRingInfo().AtomRings() if len(r) == 6)
    centre = pos[list(ring)].mean(axis=0)
    _, _, vt = np.linalg.svd(pos[list(ring)] - centre)
    normal = vt[2]
    sides = []
    for match in mol.GetSubstructMatches(Chem.MolFromSmarts(sub_smarts)):
        ring_c, sub = match[0], match[1]
        # Substituent against the H on the same carbon: one is always up and
        # one down, even when a half-chair lays the substituent near the plane.
        h = next(nb.GetIdx() for nb in mol.GetAtomWithIdx(ring_c).GetNeighbors() if nb.GetSymbol() == "H")
        sides.append(np.sign(np.dot(pos[sub] - pos[h], normal)))
    assert len(sides) == 2, (smiles, sides)
    return "cis" if sides[0] == sides[1] else "trans"


def is_meso(smiles: str) -> bool:
    mol = Chem.MolFromSmiles(smiles)
    mirror = Chem.MolFromSmiles(smiles.replace("@@", "!").replace("@", "@@").replace("!", "@"))
    return Chem.MolToSmiles(mol) == Chem.MolToSmiles(mirror)


def huckel_ladder(n: int, electrons: int) -> dict:
    """Linear polyene pi MOs from the Huckel matrix: energy (alpha + x beta), node count, filling."""
    h = np.zeros((n, n))
    for i in range(n - 1):
        h[i, i + 1] = h[i + 1, i] = 1
    vals, vecs = np.linalg.eigh(h)
    order = np.argsort(-vals)  # bonding (x > 0) lowest in energy, so first
    levels = []
    left = electrons
    for k, idx in enumerate(order, start=1):
        coeffs = vecs[:, idx]
        nodes = sum(1 for i in range(n - 1) if coeffs[i] * coeffs[i + 1] < 0)
        fill = min(2, left)
        left -= fill
        levels.append({"name": f"ψ{k}", "x": round(float(vals[idx]), 3), "nodes": nodes, "electrons": fill})
    homo = max(i for i, lv in enumerate(levels) if lv["electrons"] > 0)
    return {"levels": levels, "homo": homo, "lumo": homo + 1}


# --------------------------------------------------------------------------
# Drawing: RDKit 2D coordinates fitted into the 120 by 84 viewBox
# --------------------------------------------------------------------------

def atom_label(atom: Chem.Atom, lone: bool) -> str | None:
    sym = atom.GetSymbol()
    charge = atom.GetFormalCharge()
    if sym == "C" and not lone:
        return None
    hs = atom.GetTotalNumHs()
    text = sym if hs == 0 else (sym + "H" if hs == 1 else f"{sym}H_{hs}")
    if lone and charge:
        text += "^+" if charge > 0 else "^" + MINUS
    elif charge and sym != "C":
        text += "^+" if charge > 0 else "^" + MINUS
    return text


def reads_as(smiles: str, xy: np.ndarray, choice: list[tuple[int, int, str]]) -> str:
    """The isomeric SMILES RDKit reads off a drawing: these coordinates (screen
    y grows down, so it is flipped back) and these wedge or hash bonds, each
    drawn from its stereocentre."""
    rw = Chem.RWMol(Chem.MolFromSmiles(smiles))
    Chem.Kekulize(rw, clearAromaticFlags=True)
    for a in rw.GetAtoms():
        a.SetChiralTag(Chem.ChiralType.CHI_UNSPECIFIED)
    for bd in rw.GetBonds():
        bd.SetStereo(Chem.BondStereo.STEREONONE)
    for centre, other, style in choice:
        rw.RemoveBond(centre, other)
        rw.AddBond(centre, other, Chem.BondType.SINGLE)
        rw.GetBondBetweenAtoms(centre, other).SetBondDir(Chem.BondDir.BEGINWEDGE if style == "wedge" else Chem.BondDir.BEGINDASH)
    conf = Chem.Conformer(rw.GetNumAtoms())
    for i, (x, y) in enumerate(xy):
        conf.SetAtomPosition(i, (float(x), float(-y), 0.0))
    m = rw.GetMol()
    m.AddConformer(conf, assignId=True)
    Chem.SanitizeMol(m)
    Chem.AssignChiralTypesFromBondDirs(m)
    Chem.AssignStereochemistry(m, force=True, cleanIt=True)
    return Chem.MolToSmiles(m)


def choose_wedges(smiles: str, xy: np.ndarray) -> list[tuple[int, int, str]]:
    mol = Chem.MolFromSmiles(smiles)
    centres = [i for i, _ in Chem.FindMolChiralCenters(mol, includeUnassigned=False)]
    if not centres:
        return []
    picks = []
    for c in centres:
        atom = mol.GetAtomWithIdx(c)
        out = [nb.GetIdx() for nb in atom.GetNeighbors() if not mol.GetBondBetweenAtoms(c, nb.GetIdx()).IsInRing()]
        assert out, f"{smiles}: stereocentre {c} has no bond outside the ring to wedge"
        picks.append((c, out[0]))
    want = canon(smiles)
    for mask in range(2 ** len(picks)):
        choice = [(c, o, "wedge" if mask >> k & 1 else "hash") for k, (c, o) in enumerate(picks)]
        if reads_as(smiles, xy, choice) == want:
            return choice
    raise AssertionError(f"no wedge drawing reads back as {smiles}")


def figure(smiles: str, coords: np.ndarray | None = None) -> tuple[dict, np.ndarray]:
    """A Figure for `smiles`, plus the coordinates used (so a second contributor
    can be drawn on the same skeleton). Charges and radicals on carbon get a
    small sign beside the atom; wedges where RDKit assigns stereo."""
    mol = Chem.MolFromSmiles(smiles)
    Chem.Kekulize(mol, clearAromaticFlags=True)
    if coords is None:
        rdDepictor.SetPreferCoordGen(True)
        rdDepictor.Compute2DCoords(mol)
        conf = mol.GetConformer()
        pts = np.array([[conf.GetAtomPosition(i).x, conf.GetAtomPosition(i).y] for i in range(mol.GetNumAtoms())])
        pts[:, 1] *= -1
    else:
        pts = coords.copy()
        conf = Chem.Conformer(mol.GetNumAtoms())
        for i, (x, y) in enumerate(pts):
            conf.SetAtomPosition(i, (float(x), float(-y), 0.0))
        mol.AddConformer(conf, assignId=True)
    lone = mol.GetNumAtoms() == 1
    lengths = [np.linalg.norm(pts[b.GetBeginAtomIdx()] - pts[b.GetEndAtomIdx()]) for b in mol.GetBonds()]
    unit = float(np.mean(lengths)) if lengths else 1.0
    span = pts.max(axis=0) - pts.min(axis=0)
    scale = BOND / unit
    if mol.GetNumAtoms() > 1:
        scale = min(scale, (W - 2 * MARGIN) / max(span[0], 1e-6), (H - 2 * MARGIN) / max(span[1], 1e-6))
    centre = (pts.max(axis=0) + pts.min(axis=0)) / 2
    xy = (pts - centre) * scale + np.array([W / 2, H / 2])

    # Wedges: one exocyclic bond per stereocentre, wedge or hash chosen by
    # reading every combination back through RDKit (reads_as) and keeping the
    # one that says the same molecule as the SMILES.
    stereo = choose_wedges(smiles, xy)
    wedge_at = {frozenset((c, o)): (c, style) for c, o, style in stereo}

    labels = {a.GetIdx(): atom_label(a, lone) for a in mol.GetAtoms()}
    bonds = []
    for b in mol.GetBonds():
        i, j = b.GetBeginAtomIdx(), b.GetEndAtomIdx()
        wedge = wedge_at.get(frozenset((i, j)))
        if wedge is not None and wedge[0] != i:
            i, j = j, i  # the narrow end, (x1, y1), is the stereocentre
        p, q = xy[i].copy(), xy[j].copy()
        u = (q - p) / float(np.linalg.norm(q - p))
        if labels[i]:
            p = p + u * 6.5
        if labels[j]:
            q = q - u * 6.5
        order = {Chem.BondType.SINGLE: 1, Chem.BondType.DOUBLE: 2, Chem.BondType.TRIPLE: 3}[b.GetBondType()]
        bond = {"x1": round(float(p[0])), "y1": round(float(p[1])), "x2": round(float(q[0])), "y2": round(float(q[1]))}
        if order > 1:
            bond["order"] = order
        if wedge is not None:
            bond["stereo"] = wedge[1]
        bonds.append(bond)
    text = []
    for idx, t in labels.items():
        if t:
            text.append({"x": round(float(xy[idx][0])), "y": round(float(xy[idx][1])) + 5, "t": t, "size": 13})
    for a in mol.GetAtoms():
        if a.GetSymbol() != "C" or lone:
            continue
        sign = "+" if a.GetFormalCharge() > 0 else MINUS if a.GetFormalCharge() < 0 else "•" if a.GetNumRadicalElectrons() else None
        if sign is None:
            continue
        # Put the sign on the side away from the atom's neighbours.
        here = xy[a.GetIdx()]
        away = np.zeros(2)
        for nb in a.GetNeighbors():
            away += here - xy[nb.GetIdx()]
        away = away / (np.linalg.norm(away) or 1) if np.linalg.norm(away) > 1e-6 else np.array([0.0, -1.0])
        spot = here + away * 9
        text.append({"x": round(float(spot[0])), "y": round(float(spot[1])) + 5, "t": sign, "size": 15})
    fig: dict = {"bonds": bonds}
    if text:
        fig["labels"] = text
    for bd in bonds:
        assert 0 <= bd["x1"] <= W and 0 <= bd["x2"] <= W and 0 <= bd["y1"] <= H and 0 <= bd["y2"] <= H, (smiles, bd)
    return fig, pts


def mol_panel(smiles: str, name: str | None = None, coords: np.ndarray | None = None) -> tuple[dict, np.ndarray]:
    fig, pts = figure(smiles, coords)
    panel = {"kind": "mol", "smiles": smiles, "figure": fig}
    if name:
        panel["name"] = name
    return panel, pts


def mol(smiles: str, name: str | None = None) -> dict:
    return mol_panel(smiles, name)[0]


def arrow(over: str, under: str | None = None) -> dict:
    a = {"kind": "arrow", "over": over}
    if under:
        a["under"] = under
    return a


PLUS = {"kind": "plus"}
RES = {"kind": "resonance"}


def contributors(smiles: str, names: tuple[str, str]) -> list[dict]:
    """Two resonance contributors from RDKit's ResonanceMolSupplier, drawn on one skeleton."""
    base = Chem.MolFromSmiles(smiles)
    supplier = Chem.ResonanceMolSupplier(base, Chem.ALLOW_CHARGE_SEPARATION)
    forms = [Chem.MolToSmiles(m, canonical=False) for m in supplier]
    assert len(forms) >= 2, smiles
    first, coords = mol_panel(forms[0], names[0])
    second, _ = mol_panel(forms[1], names[1], coords)
    return [first, RES, second]


# --------------------------------------------------------------------------
# The examples, one per Unit 1 lesson
# --------------------------------------------------------------------------

def build() -> dict:
    ex: dict[str, dict] = {}

    # STAGE A
    ex["u1-allylic"] = {"caption": "The allyl cation: one ion, two contributors. Only the electrons move.",
                        "panels": contributors("C=C[CH2+]", ("Charge on C3", "Charge on C1"))}
    ex["u1-rank-cation"] = {"caption": "A 1° allylic cation sits near a 2° alkyl cation.",
                            "panels": [mol("C=C[CH2+]", "1° allylic"), {"kind": "about"}, mol("C[CH+]C", "2° alkyl")]}
    ex["u1-rank-anion"] = {"caption": "For carbanions the alkyl trend flips.",
                           "panels": [mol("[CH3-]", "Methyl, more stable"), {"kind": "beats"}, mol("C[C-](C)C", "3°, less stable")]}
    ex["u1-rank-radical"] = {"caption": "Benzylic resonance beats substitution for radicals.",
                             "panels": [mol("[CH2]c1ccccc1", "Benzylic"), {"kind": "beats"}, mol("C[C](C)C", "3° alkyl")]}

    # STAGE B
    cation = protonated_cation("C=CC=C")
    ex["u1-12v14"] = {"caption": "H⁺ on C1 of butadiene leaves an allylic cation: the charge is shared by C2 and C4.",
                      "panels": [mol("C=CC=C", "Buta-1,3-diene"), arrow("H⁺")] + contributors(cation, ("C2", "C4"))}

    p12 = add_across("C=CC=C", None, "Br", "1,2")
    p14 = in_pool(add_across("C=CC=C", None, "Br", "1,4"))
    assert alkene_substitution(Chem.MolFromSmiles(p14)) > alkene_substitution(Chem.MolFromSmiles(p12))
    ex["u1-kvt"] = {"caption": "Cold locks in the faster 1,2 product. Warm and reversible gives the more substituted alkene, 1,4.",
                    "panels": [mol("C=CC=C"), arrow("HBr", "−80 °C"), mol(p12, "1,2 (kinetic)"),
                               {"kind": "break"},
                               mol("C=CC=C"), arrow("HBr", "40 °C"), mol(p14, "1,4 (thermodynamic)")]}

    ex["u1-energy-diagram"] = {"caption": "Lower hump: faster (kinetic). Deeper well: more stable (thermodynamic).",
                               "panels": [{"kind": "energy"}]}

    end = best_protonation_end("C=C(C)C=C")
    cold = in_pool(add_across("C=C(C)C=C", None, "Br", "1,2", first_end=end))
    ex["u1-hx-dienes"] = {"caption": "Isoprene: protonate the end that leaves the best cation, then cold gives the 1,2 product.",
                          "panels": [mol("C=C(C)C=C", "Isoprene"), arrow("HBr", "−80 °C"), mol(cold, "1,2 product")]}

    d12 = add_across("C=CC=C", "Br", "Br", "1,2")
    d14 = in_pool(add_across("C=CC=C", "Br", "Br", "1,4"))
    assert alkene_substitution(Chem.MolFromSmiles(d14)) > alkene_substitution(Chem.MolFromSmiles(d12))
    ex["u1-x2"] = {"caption": "Br₂ adds 1,2 or 1,4 through the same allylic cation. Warm, the 1,4 dibromide wins.",
                   "panels": [mol("C=CC=C"), arrow("Br₂", "40 °C"), mol(d14, "1,4 dibromide")]}

    # STAGE C
    one = nbs_products("C1=CCCCC1")
    assert len(one) == 1, one
    ex["u1-nbs"] = {"caption": "NBS swaps an allylic H for Br and leaves the C=C in place.",
                    "panels": [mol("C1=CCCCC1", "Cyclohexene"), arrow("NBS", "hν, CCl₄"), mol(in_pool(one[0]), "3-Bromocyclohexene")]}
    two = nbs_products("C=CCCCC")
    assert len(two) == 2, two
    direct = next(s for s in two if Chem.MolFromSmiles(s).HasSubstructMatch(Chem.MolFromSmarts("C=CC(Br)")))
    shifted = next(s for s in two if s != direct)
    ex["u1-nbs-practice"] = {"caption": "Hex-1-ene: the radical's two ends differ, so both products form.",
                             "panels": [mol("C=CCCCC", "Hex-1-ene"), arrow("NBS", "hν"), mol(direct, "Br where the H left"),
                                        PLUS, mol(shifted, "Br at the shifted end")]}

    # STAGE D
    ex["u1-mo"] = {"caption": "Butadiene: four p orbitals, four π MOs, four electrons. HOMO ψ2, LUMO ψ3.",
                   "panels": [{"kind": "ladder", **huckel_ladder(4, 4)}]}
    ring = diels_alder("C=CC=C", "C=C")
    assert len(ring) == 1
    ex["u1-da"] = {"caption": "Two new σ bonds, one ring. The new C=C sits where the diene's single bond was.",
                   "panels": [mol("C=CC=C", "Diene"), PLUS, mol("C=C", "Dienophile"), arrow("heat"), mol(ring[0], "Cyclohexene")]}
    bridged = diels_alder("C1=CCC=C1", "C=C")
    assert len(bridged) == 1
    ex["u1-dienes"] = {"caption": "Cyclopentadiene is locked s-cis, and a cyclic diene gives a bridged product.",
                       "panels": [mol("C1=CCC=C1", "Cyclopentadiene"), PLUS, mol("C=C"), arrow("heat"), mol(in_pool(bridged[0]), "Bridged")]}
    nitrile = diels_alder("C=CC=C", "C=CC#N")
    assert len(nitrile) == 1
    ex["u1-dienophiles"] = {"caption": "The CN withdraws, activates the dienophile, and ends up on the new ring.",
                            "panels": [mol("C=CC=C"), PLUS, mol("C=CC#N", "Acrylonitrile"), arrow("heat"), mol(in_pool(nitrile[0]))]}
    regio = diels_alder("C=C(C)C=C", "C=CC=O")
    assert len(regio) == 2, regio
    para = [s for s in regio if ring_distance(s, "[CH0;R](C)=C", "[CH1;R]C=O") == 3]
    assert len(para) == 1, regio
    ex["u1-da-predict"] = {"caption": "A 2-substituted diene gives the para (1,4) product.",
                           "panels": [mol("C=C(C)C=C", "Isoprene"), PLUS, mol("C=CC=O", "Propenal"), arrow("heat"), mol(in_pool(para[0]), "Para")]}

    def stereo_product(dienophile: str, want: str) -> str:
        flat = diels_alder("C=CC=C", dienophile)
        assert len(flat) == 1
        isomers = [Chem.MolToSmiles(m) for m in EnumerateStereoisomers(Chem.MolFromSmiles(flat[0]))]
        hits = sorted({s for s in isomers if ring_face_relation(s, "[CX4;R][CX3](=O)O") == want})
        assert hits, (dienophile, want)
        return hits[0]

    cis = stereo_product("COC(=O)/C=C\\C(=O)OC", "cis")
    assert is_meso(cis), cis
    ex["u1-da-stereo"] = {"caption": "Dimethyl maleate's esters are cis, and they stay cis in the ring.",
                          "panels": [mol("C=CC=C"), PLUS, mol("COC(=O)/C=C\\C(=O)OC", "Dimethyl maleate"), arrow("heat"), mol(cis, "Cis diester")]}
    trans = stereo_product("COC(=O)/C=C/C(=O)OC", "trans")
    assert not is_meso(trans), trans
    ex["u1-da-3d"] = {"caption": "Fumarate is trans, so the esters land on opposite faces. A chiral product from achiral reagents is racemic.",
                      "panels": [mol("COC(=O)/C=C/C(=O)OC", "Dimethyl fumarate"), arrow("butadiene", "heat"), mol(trans, "Trans, one enantiomer of two")]}

    ex["u1-ied"] = {"caption": "An O on the C=C donates its lone pair: an electron-rich alkene, a poor normal-demand dienophile.",
                    "panels": [mol("C=COC", "Methyl vinyl ether")]}
    return ex


HEADER = '''/**
 * Unit 1 guidebook drawings. GENERATED by scripts/guide_u1.py with RDKit.
 * Do not edit by hand: change the script and rerun it.
 *
 * Every structure is a SMILES RDKit parsed; every product was made by RDKit
 * from its starting material, and each one a Unit 1 pool also asks for was
 * checked against that pool's answer. test/guideU1.test.ts reruns the script
 * with --check, so a hand edit here fails the suite. Drafts until the owner
 * signs them off.
 */
import type { GuideExample } from "./types";

export const U1_GUIDE_EXAMPLES: Readonly<Record<string, GuideExample>> = '''


def render(ex: dict) -> str:
    body = {k: {**v, "placeholder": True} for k, v in ex.items()}
    return HEADER + json.dumps(body, indent=2, ensure_ascii=False) + ";\n"


def main() -> int:
    text = render(build())
    if "--check" in sys.argv:
        on_disk = OUT.read_text(encoding="utf-8") if OUT.exists() else ""
        if on_disk != text:
            print(f"{OUT.relative_to(ROOT)} is stale or hand edited: rerun python scripts/guide_u1.py")
            return 1
        print("guide_u1: every structure parses and the file matches")
        return 0
    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_text(text, encoding="utf-8", newline="\n")
    print(f"wrote {OUT.relative_to(ROOT)}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
