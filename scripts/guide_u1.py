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

# Units of the drawing. One bond is BOND units, and the page draws a unit as
# 1px (a plain structure) or 1.45px (the focus one), so every bond on the page
# is one of two lengths, never shrunk to fit a box.
BOND = 24.0
LABEL = 14.0   # atom labels
SIGN_R = 6.5   # radius of the circle round a charge sign
SIGN_AT = 15.0  # how far a charge sign's centre sits from its carbon
# Round 4: a radical dot 15 units out read as a stray speck, not as an
# electron ON that carbon. It sits closer, and the page draws it larger.
RADICAL_AT = 10.0
HALO = 9.0     # radius of the tinted capsule joining a charged carbon to its sign
PAD = 5.0
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
# Drawing: RDKit 2D coordinates at one bond length, viewBox cut to the ink
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


def figure(smiles: str, coords: np.ndarray | None = None, source: Chem.Mol | None = None,
           hi: tuple[str, ...] = (), explicit_h: bool = False, level: str | None = None) -> tuple[dict, np.ndarray]:
    """A GuideFigure for `smiles`, plus the RDKit coordinates used (so a second
    contributor can be drawn on the same skeleton).

    Round 3 rules, each one a fix for a drawing a judge misread on a phone:
      - every structure is drawn at ONE bond length (BOND units) and the
        viewBox is cut to the ink, so a ring is never shrunk to fit a box;
      - a charge or radical sign goes in the widest empty angle around its
        carbon, never on a bond, and that carbon gets a coloured halo;
      - a methyl ester is written CO2CH3 (one label) so wedges stay clear;
      - `hi` SMARTS mark the atoms the example is about: their labels, and
        the bonds between two of them, are drawn in the accent colour.
    `source` draws that Mol as is, so two contributors keep one atom order.
    `explicit_h` draws every H (the methyl anion, which has no skeleton).
    `level` turns the drawing so the bond that SMARTS matches lies flat, with
    the rest of the molecule above it (a rotation, so no stereo changes)."""
    mol = Chem.Mol(source) if source is not None else Chem.MolFromSmiles(smiles)
    if explicit_h:
        mol = Chem.AddHs(mol)
    Chem.Kekulize(mol, clearAromaticFlags=True)
    if coords is None:
        rdDepictor.SetPreferCoordGen(True)
        rdDepictor.Compute2DCoords(mol)
        conf = mol.GetConformer()
        pts = np.array([[conf.GetAtomPosition(i).x, conf.GetAtomPosition(i).y] for i in range(mol.GetNumAtoms())])
        pts[:, 1] *= -1
    else:
        pts = coords.copy()
    if level is not None:
        a, b = mol.GetSubstructMatch(Chem.MolFromSmarts(level))[:2]
        d = pts[b] - pts[a]
        turn = -np.arctan2(d[1], d[0])
        rot = np.array([[np.cos(turn), -np.sin(turn)], [np.sin(turn), np.cos(turn)]])
        pts = (pts - pts[a]) @ rot.T
        rest = [i for i in range(len(pts)) if i not in (a, b)]
        if rest and pts[rest, 1].mean() > 0:  # screen y grows down: the rest hangs below, so turn it over
            pts = -pts
    lone = mol.GetNumAtoms() == 1
    lengths = [np.linalg.norm(pts[b.GetBeginAtomIdx()] - pts[b.GetEndAtomIdx()]) for b in mol.GetBonds()]
    unit = float(np.mean(lengths)) if lengths else 1.0
    xy = pts * (BOND / unit)

    stereo = [] if explicit_h else choose_wedges(smiles, xy)
    wedge_at = {frozenset((c, o)): (c, style) for c, o, style in stereo}

    # Methyl esters, written as one label on the carbonyl carbon.
    hidden: set[int] = set()
    labels: dict[int, tuple[str, str]] = {}  # atom -> (text, anchor)
    for attach, carbonyl, o1, o2, me in mol.GetSubstructMatches(Chem.MolFromSmarts("[#6][CX3](=O)O[CH3]")):
        hidden.update((o1, o2, me))
        rightward = xy[carbonyl][0] >= xy[attach][0]
        labels[carbonyl] = ("CO_2CH_3", "start") if rightward else ("CH_3O_2C", "end")
    for a in mol.GetAtoms():
        i = a.GetIdx()
        if i in hidden or i in labels:
            continue
        t = a.GetSymbol() if explicit_h else atom_label(a, lone)
        if t:
            labels[i] = (t, "middle")

    marked: set[int] = set()
    for pattern in hi:
        q = Chem.MolFromSmarts(pattern)
        assert q is not None, pattern
        hits = mol.GetSubstructMatches(q)
        assert hits, f"{smiles}: highlight {pattern} matches nothing"
        for match in hits:
            marked.update(match)

    def end_gap(idx: int) -> float:
        if idx not in labels:
            return 0.0
        return 7.0 if labels[idx][1] != "middle" else 9.0

    bonds = []
    for b in mol.GetBonds():
        i, j = b.GetBeginAtomIdx(), b.GetEndAtomIdx()
        if i in hidden or j in hidden:
            continue
        wedge = wedge_at.get(frozenset((i, j)))
        if wedge is not None and wedge[0] != i:
            i, j = j, i  # the narrow end, (x1, y1), is the stereocentre
        p, q = xy[i].copy(), xy[j].copy()
        u = (q - p) / float(np.linalg.norm(q - p))
        p = p + u * end_gap(i)
        q = q - u * end_gap(j)
        order = {Chem.BondType.SINGLE: 1, Chem.BondType.DOUBLE: 2, Chem.BondType.TRIPLE: 3}[b.GetBondType()]
        bond: dict = {"x1": float(p[0]), "y1": float(p[1]), "x2": float(q[0]), "y2": float(q[1])}
        if order > 1:
            bond["order"] = order
            # A double bond in a ring: both lines inside the ring, as drawn in the textbook.
            if b.IsInRing():
                ring = next(r for r in mol.GetRingInfo().AtomRings() if i in r and j in r)
                centre = xy[list(ring)].mean(axis=0)
                normal = np.array([-u[1], u[0]])
                bond["inner"] = 1 if np.dot(centre - p, normal) > 0 else -1
        if wedge is not None:
            bond["stereo"] = wedge[1]
        if i in marked and j in marked:
            bond["hi"] = True
        bonds.append(bond)

    text = []
    ink: list[tuple[float, float, float, float]] = []  # boxes: x0, y0, x1, y1
    for idx, (t, anchor) in labels.items():
        x, y = float(xy[idx][0]), float(xy[idx][1])
        width = text_width(t, LABEL)
        if anchor == "start":
            x -= LABEL * 0.36  # the C of CO2CH3 sits on the atom
            box = (x, y - LABEL * 0.6, x + width, y + LABEL * 0.6)
        elif anchor == "end":
            x += LABEL * 0.36
            box = (x - width, y - LABEL * 0.6, x, y + LABEL * 0.6)
        else:
            box = (x - width / 2, y - LABEL * 0.6, x + width / 2, y + LABEL * 0.6)
        ink.append(box)
        lab = {"x": x, "y": y + LABEL * 0.36, "t": t}
        if anchor != "middle":
            lab["anchor"] = anchor
        if idx in marked:
            lab["hi"] = True
        text.append(lab)

    halos = []
    signs = []
    for a in mol.GetAtoms():
        if a.GetSymbol() != "C":
            continue
        sign = "+" if a.GetFormalCharge() > 0 else MINUS if a.GetFormalCharge() < 0 else "•" if a.GetNumRadicalElectrons() else None
        if sign is None:
            continue
        here = xy[a.GetIdx()]
        halos.append({"x": float(here[0]), "y": float(here[1])})
        direction = widest_gap(here, [xy[nb.GetIdx()] for nb in a.GetNeighbors()])
        spot = here + direction * (RADICAL_AT if sign == "•" else SIGN_AT)
        # Drawn as a shape (a circled + or minus, or a dot), centred on its
        # spot: a bare minus beside a skeleton reads as one more bond.
        signs.append({"x": float(spot[0]), "y": float(spot[1]), "t": sign})
        ink.append((spot[0] - HALO, spot[1] - HALO, spot[0] + HALO, spot[1] + HALO))
        # The sign must clear every bond, or the drawing lies.
        for bd in bonds:
            gap = point_to_segment(spot, np.array([bd["x1"], bd["y1"]]), np.array([bd["x2"], bd["y2"]]))
            assert gap >= SIGN_R + 2, (smiles, sign, round(gap, 1))

    for idx in range(mol.GetNumAtoms()):
        if idx not in hidden:
            x, y = float(xy[idx][0]), float(xy[idx][1])
            ink.append((x - 3, y - 3, x + 3, y + 3))
    for h in halos:
        ink.append((h["x"] - HALO, h["y"] - HALO, h["x"] + HALO, h["y"] + HALO))
    x0 = min(b[0] for b in ink) - PAD
    y0 = min(b[1] for b in ink) - PAD
    x1 = max(b[2] for b in ink) + PAD
    y1 = max(b[3] for b in ink) + PAD

    def r(v: float) -> float:
        return round(v, 1)

    for bd in bonds:
        bd["x1"], bd["x2"] = r(bd["x1"] - x0), r(bd["x2"] - x0)
        bd["y1"], bd["y2"] = r(bd["y1"] - y0), r(bd["y2"] - y0)
    for lab in text:
        lab["x"], lab["y"] = r(lab["x"] - x0), r(lab["y"] - y0)
    for h in halos + signs:
        h["x"], h["y"] = r(h["x"] - x0), r(h["y"] - y0)
    fig: dict = {"w": r(x1 - x0), "h": r(y1 - y0), "bonds": bonds}
    if text:
        fig["labels"] = text
    if halos:
        fig["halos"] = halos
    if signs:
        fig["signs"] = signs
    return fig, pts


def widest_gap(here: np.ndarray, neighbours: list[np.ndarray]) -> np.ndarray:
    """The unit vector bisecting the widest empty angle around an atom. Ties
    go to the one nearest straight up, where a textbook writes a charge."""
    if not neighbours:
        return np.array([0.6, -0.8])
    angles = sorted(float(np.arctan2(n[1] - here[1], n[0] - here[0])) for n in neighbours)
    best, best_score = None, None
    for k, a in enumerate(angles):
        b = angles[(k + 1) % len(angles)] + (2 * np.pi if k + 1 == len(angles) else 0)
        mid = (a + b) / 2
        width = round(b - a, 3)
        up = -np.sin(mid)  # screen y grows down, so up is -y
        score = (width, round(up, 3))
        if best_score is None or score > best_score:
            best, best_score = mid, score
    return np.array([np.cos(best), np.sin(best)])


def point_to_segment(p: np.ndarray, a: np.ndarray, b: np.ndarray) -> float:
    ab = b - a
    t = float(np.clip(np.dot(p - a, ab) / (np.dot(ab, ab) or 1), 0, 1))
    return float(np.linalg.norm(p - (a + ab * t)))


def text_width(t: str, size: float) -> float:
    """About how wide a label sets: subscripts and superscripts are 0.68 size."""
    width, small = 0.0, False
    for ch in t:
        if ch in "_^":
            small = True
            continue
        width += size * (0.62 * 0.68 if small else 0.66)
        small = False
    return width


def equalize(panels: list[dict]) -> list[dict]:
    """Give every drawn structure in an example of one kind (the larger focus
    ones, or the plain ones) the same height, centred, so the names under a
    row of structures sit on one line."""
    for want in (True, False):
        group = [p for p in panels if p["kind"] == "mol" and bool(p.get("focus")) is want]
        if not group:
            continue
        tallest = max(p["figure"]["h"] for p in group)
        for p in group:
            fig = p["figure"]
            shift = round((tallest - fig["h"]) / 2, 1)
            if shift == 0:
                continue
            for bd in fig["bonds"]:
                bd["y1"], bd["y2"] = round(bd["y1"] + shift, 1), round(bd["y2"] + shift, 1)
            for lab in fig.get("labels", []):
                lab["y"] = round(lab["y"] + shift, 1)
            for h in fig.get("halos", []) + fig.get("signs", []):
                h["y"] = round(h["y"] + shift, 1)
            fig["h"] = tallest
    return panels


def mol_panel(smiles: str, name: str | None = None, coords: np.ndarray | None = None,
              source: Chem.Mol | None = None, hi: tuple[str, ...] = (), explicit_h: bool = False,
              level: str | None = None) -> tuple[dict, np.ndarray]:
    fig, pts = figure(smiles, coords, source, hi, explicit_h, level)
    panel = {"kind": "mol", "smiles": smiles, "figure": fig}
    if name:
        panel["name"] = name
    return panel, pts


def mol(smiles: str, name: str | None = None, hi: tuple[str, ...] = (), explicit_h: bool = False,
        level: str | None = None) -> dict:
    return mol_panel(smiles, name, hi=hi, explicit_h=explicit_h, level=level)[0]


def arrow(over: str, under: str | None = None) -> dict:
    a = {"kind": "arrow", "over": over}
    if under:
        a["under"] = under
    return a


def focus(panel: dict) -> dict:
    """The structure the example is about (the product, the winner): the page
    draws it larger, on its own line under the reaction arrow."""
    return {**panel, "focus": True}


def charged_carbon_profile(smiles: str) -> tuple[int, bool]:
    """(carbons on the charged carbon, whether a C=C sits next to it). Counted
    off the RDKit graph, so a 'same substitution, plus resonance' pair is checked."""
    m = Chem.MolFromSmiles(smiles)
    c = next(a for a in m.GetAtoms() if a.GetFormalCharge() != 0)
    carbons = sum(1 for nb in c.GetNeighbors() if nb.GetSymbol() == "C")
    allylic = any(
        b.GetBondType() == Chem.BondType.DOUBLE
        for nb in c.GetNeighbors()
        for b in nb.GetBonds()
        if b.GetOtherAtomIdx(nb.GetIdx()) != c.GetIdx()
    )
    return carbons, allylic


# What each example colours: the Br and the C=C it ended beside, and the
# ester groups whose faces the stereo lessons are about.
BR_CC = ("[Br]", "C=C")
ESTER = ("[#6][CX3](=O)O[CH3]",)

PLUS = {"kind": "plus"}
RES = {"kind": "resonance"}


def contributors(smiles: str, name_of) -> list[dict]:
    """Two resonance contributors from RDKit's ResonanceMolSupplier, drawn on one
    skeleton. RDKit does not promise an order, so each one is named by
    `name_of(mol, charged_atom_index)`, read off the contributor itself."""
    base = Chem.MolFromSmiles(smiles)
    supplier = Chem.ResonanceMolSupplier(base, Chem.ALLOW_CHARGE_SEPARATION)
    forms = [m for m in supplier]
    assert len(forms) >= 2, smiles

    def charged(m: Chem.Mol) -> int:
        return next(a.GetIdx() for a in m.GetAtoms() if a.GetFormalCharge() != 0)

    first, coords = mol_panel(Chem.MolToSmiles(forms[0]), name_of(forms[0], charged(forms[0])), source=forms[0])
    second, _ = mol_panel(Chem.MolToSmiles(forms[1]), name_of(forms[1], charged(forms[1])), coords, source=forms[1])
    assert first["name"] != second["name"], smiles
    return [focus(first), RES, focus(second)]


def butadiene_number(m: Chem.Mol, idx: int) -> str:
    """C1 is the end that took the H (the CH3); count along the chain from it."""
    ch3 = next(a.GetIdx() for a in m.GetAtoms() if a.GetDegree() == 1 and a.GetTotalNumHs() == 3)
    return f"Charge on C{len(Chem.GetShortestPath(m, ch3, idx))}"


def allyl_end(m: Chem.Mol, idx: int) -> str:
    """The allyl cation is symmetric, so its ends are named by drawing order."""
    return "Charge on C1" if idx == 0 else "Charge on C3"


# --------------------------------------------------------------------------
# The examples, one per Unit 1 lesson
# --------------------------------------------------------------------------

def build() -> dict:
    ex: dict[str, dict] = {}

    # STAGE A
    ex["u1-allylic"] = {"caption": "The allyl cation: one ion, two contributors. Only the electrons move.",
                        "panels": contributors("C=C[CH2+]", allyl_end)}
    # Owner 2026-10-17: never draw the contested 1° allylic vs 2° pair. This
    # pair is one every source agrees on (u1-cat-3allyl-vs-3): the SAME
    # substitution at the charged carbon, and only one has a C=C next door.
    prenyl, tbu = "C=C[C+](C)C", "C[C+](C)C"
    assert charged_carbon_profile(prenyl) == (3, True), charged_carbon_profile(prenyl)
    assert charged_carbon_profile(tbu) == (3, False), charged_carbon_profile(tbu)
    ex["u1-rank-cation"] = {"caption": "When substitution ties, resonance breaks the tie: a 3° allylic cation beats a 3° alkyl one.",
                            "panels": [focus(mol(prenyl, "3° allylic", hi=("C=C",))), {"kind": "beats"}, focus(mol(tbu, "3° alkyl"))]}
    ex["u1-rank-anion"] = {"caption": "For carbanions the alkyl trend flips.",
                           "panels": [focus(mol("[CH3-]", "Methyl", explicit_h=True)), {"kind": "beats"}, focus(mol("C[C-](C)C", "3° alkyl"))]}
    ex["u1-rank-radical"] = {"caption": "Benzylic resonance beats substitution for radicals.",
                             "panels": [focus(mol("[CH2]c1ccccc1", "Benzylic")), {"kind": "beats"}, focus(mol("C[C](C)C", "3° alkyl"))]}

    # STAGE B
    cation = protonated_cation("C=CC=C")
    ex["u1-12v14"] = {"caption": "H⁺ on C1 of butadiene leaves an allylic cation: the charge is shared by C2 and C4.",
                      "panels": contributors(cation, butadiene_number)}

    p12 = add_across("C=CC=C", None, "Br", "1,2")
    p14 = in_pool(add_across("C=CC=C", None, "Br", "1,4"))
    assert alkene_substitution(Chem.MolFromSmiles(p14)) > alkene_substitution(Chem.MolFromSmiles(p12))
    ex["u1-kvt"] = {"caption": "Cold locks in the faster 1,2 product. Warm and reversible gives the more substituted alkene, 1,4.",
                    "panels": [mol("C=CC=C", "Butadiene"), arrow("HBr", "−80 °C"), focus(mol(p12, "1,2 (kinetic)", hi=BR_CC)),
                               {"kind": "break"},
                               mol("C=CC=C", "Butadiene"), arrow("HBr", "40 °C"), focus(mol(p14, "1,4 (thermodynamic)", hi=BR_CC))]}

    ex["u1-energy-diagram"] = {"caption": "Lower hump: faster (kinetic). Deeper well: more stable (thermodynamic).",
                               "panels": [{"kind": "energy"}]}

    end = best_protonation_end("C=C(C)C=C")
    cold = in_pool(add_across("C=C(C)C=C", None, "Br", "1,2", first_end=end))
    ex["u1-hx-dienes"] = {"caption": "Isoprene: protonate the end that leaves the best cation, then cold gives the 1,2 product.",
                          "panels": [mol("C=C(C)C=C", "Isoprene"), arrow("HBr", "−80 °C"), focus(mol(cold, "1,2 product", hi=BR_CC))]}

    d12 = add_across("C=CC=C", "Br", "Br", "1,2")
    d14 = in_pool(add_across("C=CC=C", "Br", "Br", "1,4"))
    assert alkene_substitution(Chem.MolFromSmiles(d14)) > alkene_substitution(Chem.MolFromSmiles(d12))
    ex["u1-x2"] = {"caption": "Br₂ adds 1,2 or 1,4 through the same allylic cation. Warm, the 1,4 dibromide wins.",
                   "panels": [mol("C=CC=C", "Butadiene"), arrow("Br₂", "40 °C"), focus(mol(d14, "1,4 dibromide", hi=BR_CC))]}

    # STAGE C
    one = nbs_products("C1=CCCCC1")
    assert len(one) == 1, one
    ex["u1-nbs"] = {"caption": "NBS swaps an allylic H for Br and leaves the C=C in place.",
                    "panels": [mol("C1=CCCCC1", "Cyclohexene"), arrow("NBS", "hν, CCl₄"), focus(mol(in_pool(one[0]), "3-Bromocyclohexene", hi=BR_CC))]}
    two = nbs_products("C=CCCCC")
    assert len(two) == 2, two
    direct = next(s for s in two if Chem.MolFromSmiles(s).HasSubstructMatch(Chem.MolFromSmarts("C=CC(Br)")))
    shifted = next(s for s in two if s != direct)
    ex["u1-nbs-practice"] = {"caption": "Hex-1-ene: the radical's two ends differ, so both products form.",
                             "panels": [mol("C=CCCCC", "Hex-1-ene"), arrow("NBS", "hν"), focus(mol(direct, "Br where the H left", hi=BR_CC)),
                                        PLUS, focus(mol(shifted, "Br at the shifted end", hi=BR_CC))]}

    # STAGE D
    ex["u1-mo"] = {"caption": "Butadiene: four p orbitals, four π MOs, four electrons. HOMO ψ2, LUMO ψ3.",
                   "panels": [{"kind": "ladder", **huckel_ladder(4, 4)}]}
    ring = diels_alder("C=CC=C", "C=C")
    assert len(ring) == 1
    ex["u1-da"] = {"caption": "Two new σ bonds, one ring. The new C=C sits where the diene's single bond was.",
                   "panels": [mol("C=CC=C", "Diene"), PLUS, mol("C=C", "Dienophile"), arrow("heat"), focus(mol(ring[0], "Cyclohexene", hi=("C=C",)))]}
    bridged = diels_alder("C1=CCC=C1", "C=C")
    assert len(bridged) == 1
    ex["u1-dienes"] = {"caption": "Cyclopentadiene is locked s-cis, and a cyclic diene gives a bridged product.",
                       "panels": [mol("C1=CCC=C1", "Cyclopentadiene"), PLUS, mol("C=C"), arrow("heat"), focus(mol(in_pool(bridged[0]), "Bridged", hi=("[CH2;R2]~[CH1;R2]",)))]}
    nitrile = diels_alder("C=CC=C", "C=CC#N")
    assert len(nitrile) == 1
    ex["u1-dienophiles"] = {"caption": "The CN withdraws, activates the dienophile, and ends up on the new ring.",
                            "panels": [mol("C=CC=C", "Butadiene"), PLUS, mol("C=CC#N", "Acrylonitrile"), arrow("heat"), focus(mol(in_pool(nitrile[0]), hi=("[C;R]C#N",)))]}
    regio = diels_alder("C=C(C)C=C", "C=CC=O")
    assert len(regio) == 2, regio
    para = [s for s in regio if ring_distance(s, "[CH0;R](C)=C", "[CH1;R]C=O") == 3]
    assert len(para) == 1, regio
    ex["u1-da-predict"] = {"caption": "A 2-substituted diene gives the para (1,4) product.",
                           "panels": [mol("C=C(C)C=C", "Isoprene"), PLUS, mol("C=CC=O", "Propenal"), arrow("heat"), focus(mol(in_pool(para[0]), "Para", hi=("[CH3][C;R]", "[C;R][CH]=O")))]}

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
                          "panels": [mol("C=CC=C", "Butadiene"), PLUS, mol("COC(=O)/C=C\\C(=O)OC", "Dimethyl maleate", hi=ESTER, level="C=C"), arrow("heat"), focus(mol(cis, "Cis diester", hi=ESTER))]}
    trans = stereo_product("COC(=O)/C=C/C(=O)OC", "trans")
    assert not is_meso(trans), trans
    ex["u1-da-3d"] = {"caption": "Fumarate is trans, so the esters land on opposite faces. A chiral product from achiral reagents is racemic.",
                      "panels": [mol("COC(=O)/C=C/C(=O)OC", "Dimethyl fumarate", hi=ESTER, level="C=C"), arrow("butadiene", "heat"), focus(mol(trans, "Trans, one enantiomer of two", hi=ESTER))]}

    ex["u1-ied"] = {"caption": "An O on the C=C donates its lone pair: an electron-rich alkene, a poor normal-demand dienophile.",
                    "panels": [focus(mol("C=COC", "Methyl vinyl ether", hi=("C=CO",)))]}
    for example in ex.values():
        equalize(example["panels"])
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
