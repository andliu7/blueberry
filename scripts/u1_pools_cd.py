"""
Derive the chemistry behind the Unit 1 stage C and D problem pools.

Owner rule: derive, never assert. Every structure, product, regiochemistry,
endo/exo label, cis/trans label and MO ladder fact that
src/game/content/u1/stage-cd.ts shows a student is computed here, printed in
the report, and checked by an assertion in this file. The TS pool is written by
hand FROM this report; each entry's provenance names this script.

What it derives, section by section:
  1. NBS: allylic C-H classes (symmetry ranked) and both resonance products
     for each class, de-duplicated with E/Z ignored and counted.
  2. Huckel pi MO ladders: energies, node counts, HOMO and LUMO indices,
     terminal phases and the HOMO-LUMO gap for each polyene.
  3. Diels-Alder: products from a reaction SMARTS, regiochemistry from Huckel
     frontier coefficients (largest HOMO coefficient on the diene meets the
     largest LUMO coefficient on the dienophile), then the ortho/meta/para
     relation of the two substituents read off the product ring.
  4. Diene conformations: C=C-C=C dihedral over an ETKDG ensemble, to call a
     diene locked s-cis, locked s-trans, or free.
  5. Stereo: stereoisomers enumerated, embedded in 3D, cis/trans assigned by
     which face each substituent sits on, meso detected by mirror comparison,
     CIP labels from the new labeler, endo/exo from 3D distances to the
     one-carbon bridge.
  6. Retro Diels-Alder: the ring C=C was diene C2-C3, so the two sigma bonds
     across from it are cut.

It also writes src/game/content/u1/stage-cd.figures.ts: every molecule drawn in
the pools, as a Figure (bonds, labels, marker rings) fitted into the 120 by 84
viewBox from RDKit 2D coordinates. That file is generated; do not edit it.

Run from the repo root:  python scripts/u1_pools_cd.py
"""

from __future__ import annotations

import json
import math
import sys
from pathlib import Path

import numpy as np
from rdkit import Chem, RDLogger
from rdkit.Chem import AllChem, rdDepictor
from rdkit.Chem import rdCIPLabeler
from rdkit.Geometry import Point3D
from rdkit.Chem.EnumerateStereoisomers import EnumerateStereoisomers, StereoEnumerationOptions

RDLogger.DisableLog("rdApp.*")
rdDepictor.SetPreferCoordGen(True)

ROOT = Path(__file__).resolve().parent.parent
FIG_OUT = ROOT / "src" / "game" / "content" / "u1" / "stage-cd.figures.ts"

REPORT: list[str] = []


def say(line: str = "") -> None:
    REPORT.append(line)


def canon(smiles_or_mol, iso: bool = True) -> str:
    mol = Chem.MolFromSmiles(smiles_or_mol) if isinstance(smiles_or_mol, str) else smiles_or_mol
    if mol is None:
        raise ValueError(f"unparseable: {smiles_or_mol}")
    return Chem.MolToSmiles(mol, isomericSmiles=iso)


def flat(smiles: str) -> str:
    """Canonical SMILES with stereo removed: the constitution only."""
    return canon(smiles, iso=False)


# --------------------------------------------------------------------------
# Molecule catalogue. Every molecule a pool shows, by the key the TS uses.
# --------------------------------------------------------------------------

MOL: dict[str, str] = {
    # stage C
    "nbs": "O=C1CCC(=O)N1Br",
    "cyclohexene": "C1=CCCCC1",
    "cyclopentene": "C1=CCCC1",
    "hex1ene": "C=CCCCC",
    "isobutylene": "C=C(C)C",
    "methylcyclohexene1": "CC1=CCCCC1",
    "tetramethylethylene": "CC(C)=C(C)C",
    "but2ene": "C/C=C/C",
    "methylenecyclohexane": "C=C1CCCCC1",
    "cyclohexane": "C1CCCCC1",
    "cyclohexa14diene": "C1=CCC=CC1",
    # stage D, MO
    "ethene": "C=C",
    "butadiene": "C=CC=C",
    "hexatriene": "C=CC=CC=C",
    "octatetraene": "C=CC=CC=CC=C",
    "penta14diene": "C=CCC=C",
    "cyclohexa13diene": "C1=CC=CCC1",
    # stage D, dienes
    "isoprene": "C=CC(C)=C",
    "piperylene": "C/C=C/C=C",
    "dimethylbutadiene": "C=C(C)C(C)=C",
    "methoxybutadiene1": "CO/C=C/C=C",
    "methoxybutadiene2": "C=CC(OC)=C",
    "cyclopentadiene": "C1=CCC=C1",
    "methylenecyclohexene3": "C=C1CCCC=C1",
    "dimethylenecyclohexane": "C=C1CCCCC1=C",
    "hexadieneEE": "C/C=C/C=C/C",
    "methoxymethylenecyclohexene": "COC1=CC(=C)CCC1",
    # stage D, dienophiles
    "acrolein": "C=CC=O",
    "acrylonitrile": "C=CC#N",
    "methylacrylate": "C=CC(=O)OC",
    "mvk": "C=CC(C)=O",
    "maleicanhydride": "O=C1OC(=O)C=C1",
    "dimethylmaleate": "COC(=O)/C=C\\C(=O)OC",
    "dimethylfumarate": "COC(=O)/C=C/C(=O)OC",
    "dmad": "COC(=O)C#CC(=O)OC",
    "methylvinylether": "C=COC",
    "propene": "C=CC",
}


# --------------------------------------------------------------------------
# 1. NBS: allylic C-H classes and both resonance products per class
# --------------------------------------------------------------------------

def allylic_classes(smiles: str) -> list[list[int]]:
    """Symmetry classes of sp3 carbons carrying H next to an alkene carbon."""
    mol = Chem.MolFromSmiles(smiles)
    ranks = list(Chem.CanonicalRankAtoms(mol, breakTies=False))
    sites: dict[int, list[int]] = {}
    for atom in mol.GetAtoms():
        if atom.GetSymbol() != "C" or atom.GetHybridization() != Chem.HybridizationType.SP3:
            continue
        if atom.GetTotalNumHs() == 0:
            continue
        if any(
            b.GetBondType() == Chem.BondType.DOUBLE and b.GetOtherAtom(n).GetSymbol() == "C"
            for n in atom.GetNeighbors()
            for b in n.GetBonds()
        ):
            sites.setdefault(ranks[atom.GetIdx()], []).append(atom.GetIdx())
    return list(sites.values())


def nbs_products(smiles: str) -> list[str]:
    """Every constitutional product: Br at the allylic carbon, and Br at the far
    end with the double bond shifted. E/Z is ignored, so a product is counted once."""
    mol = Chem.MolFromSmiles(smiles)
    out: set[str] = set()
    for cls in allylic_classes(smiles):
        c3 = cls[0]
        for c2 in mol.GetAtomWithIdx(c3).GetNeighbors():
            for bond in c2.GetBonds():
                if bond.GetBondType() != Chem.BondType.DOUBLE:
                    continue
                c1 = bond.GetOtherAtom(c2)
                if c1.GetSymbol() != "C":
                    continue
                # Direct product: Br on C3.
                rw = Chem.RWMol(mol)
                br = rw.AddAtom(Chem.Atom(35))
                rw.AddBond(c3, br, Chem.BondType.SINGLE)
                p = rw.GetMol()
                Chem.SanitizeMol(p)
                out.add(flat(Chem.MolToSmiles(p)))
                # Shifted product: radical moves to C1, alkene becomes C2=C3.
                rw = Chem.RWMol(mol)
                rw.GetBondBetweenAtoms(c1.GetIdx(), c2.GetIdx()).SetBondType(Chem.BondType.SINGLE)
                rw.GetBondBetweenAtoms(c2.GetIdx(), c3).SetBondType(Chem.BondType.DOUBLE)
                br = rw.AddAtom(Chem.Atom(35))
                rw.AddBond(c1.GetIdx(), br, Chem.BondType.SINGLE)
                p = rw.GetMol()
                for a in p.GetAtoms():
                    a.SetNoImplicit(False)
                    a.SetNumExplicitHs(0)
                Chem.SanitizeMol(p)
                out.add(flat(Chem.MolToSmiles(p)))
    return sorted(out)


def nbs_section() -> dict:
    say("== 1. NBS allylic bromination ==")
    facts = {}
    for key in [
        "cyclohexene", "cyclopentene", "hex1ene", "isobutylene", "methylcyclohexene1",
        "tetramethylethylene", "but2ene", "methylenecyclohexane", "cyclohexane",
        "cyclohexa14diene",
    ]:
        smi = MOL[key]
        classes = allylic_classes(smi)
        n_h = sum(Chem.MolFromSmiles(smi).GetAtomWithIdx(i).GetTotalNumHs() for c in classes for i in c)
        prods = nbs_products(smi)
        facts[key] = {"classes": len(classes), "allylicH": n_h, "products": prods}
        say(f"{key:22s} {smi:14s} allylic classes={len(classes)} allylic H={n_h} products={prods}")
    # Checks the pool relies on.
    assert facts["cyclohexene"]["products"] == [flat("BrC1C=CCCC1")]
    assert facts["cyclopentene"]["products"] == [flat("BrC1C=CCC1")]
    assert facts["isobutylene"]["products"] == [flat("C=C(C)CBr")]
    assert set(facts["hex1ene"]["products"]) == {flat("C=CC(Br)CCC"), flat("BrCC=CCCC")}
    assert set(facts["but2ene"]["products"]) == {flat("C=CC(Br)C"), flat("BrCC=CC")}
    assert set(facts["tetramethylethylene"]["products"]) == {flat("C=C(C)C(C)(C)Br"), flat("BrCC(C)=C(C)C")}
    assert set(facts["methylenecyclohexane"]["products"]) == {flat("C=C1CCCCC1Br"), flat("BrCC1=CCCCC1")}
    assert facts["cyclohexane"]["classes"] == 0
    assert facts["methylcyclohexene1"]["classes"] == 3
    say()
    return facts


# --------------------------------------------------------------------------
# 2. Huckel pi MO ladders
# --------------------------------------------------------------------------

def huckel_linear(n: int):
    """Linear polyene of n carbons, all h=0, k=1. Returns x (E = alpha + x beta,
    so larger x is LOWER energy since beta < 0) sorted from lowest energy up,
    and the coefficient vectors."""
    h = np.zeros((n, n))
    for i in range(n - 1):
        h[i, i + 1] = h[i + 1, i] = 1.0
    vals, vecs = np.linalg.eigh(h)
    order = np.argsort(-vals)
    return vals[order], vecs[:, order]


def nodes(coeffs) -> int:
    signs = [np.sign(c) for c in coeffs if abs(c) > 1e-9]
    return sum(1 for a, b in zip(signs, signs[1:]) if a != b)


def ladder(n: int, electrons: int) -> dict:
    x, c = huckel_linear(n)
    filled = electrons // 2 + electrons % 2
    homo = filled  # 1-based
    lumo = homo + 1 if electrons % 2 == 0 else homo  # radical: SOMO is half filled
    node_counts = [nodes(c[:, k]) for k in range(n)]
    ends_same = [bool(np.sign(c[0, k]) == np.sign(c[-1, k])) for k in range(n)]
    gap = float(x[homo - 1] - x[lumo - 1]) if electrons % 2 == 0 else None
    return {
        "n": n, "electrons": electrons, "x": [round(float(v), 3) for v in x],
        "nodes": node_counts, "homo": homo, "lumo": lumo if electrons % 2 == 0 else homo + 1,
        "endsSamePhase": ends_same, "gapBeta": None if gap is None else round(gap, 3),
        "bonding": [k + 1 for k in range(n) if x[k] > 1e-9],
        "nonbonding": [k + 1 for k in range(n) if abs(x[k]) <= 1e-9],
        "antibonding": [k + 1 for k in range(n) if x[k] < -1e-9],
        "coeffs": [[round(float(c[i, k]), 3) for i in range(n)] for k in range(n)],
    }


def mo_section() -> dict:
    say("== 2. Huckel pi ladders ==")
    out = {
        "ethene": ladder(2, 2),
        "butadiene": ladder(4, 4),
        "hexatriene": ladder(6, 6),
        "octatetraene": ladder(8, 8),
        "allylCation": ladder(3, 2),
        "allylRadical": ladder(3, 3),
        "allylAnion": ladder(3, 4),
    }
    for k, v in out.items():
        say(f"{k:14s} x={v['x']} nodes={v['nodes']} HOMO=psi{v['homo']} LUMO=psi{v['lumo']} "
            f"gap={v['gapBeta']} ends-same={v['endsSamePhase']} bonding={v['bonding']} "
            f"nonbonding={v['nonbonding']} antibonding={v['antibonding']}")
    say("allyl psi2 coefficients " + str(out["allylAnion"]["coeffs"][1]))
    say("butadiene coefficients " + json.dumps(out["butadiene"]["coeffs"]))
    # Node rule psi_k has k-1 nodes, checked rather than assumed.
    for v in out.values():
        assert v["nodes"] == list(range(v["n"])), v
    b = out["butadiene"]
    assert (b["homo"], b["lumo"]) == (2, 3)
    assert b["bonding"] == [1, 2] and b["antibonding"] == [3, 4]
    assert b["endsSamePhase"][1] is False and b["endsSamePhase"][2] is True  # psi2 ends opposite, psi3 same
    assert b["endsSamePhase"][0] is True
    h = out["hexatriene"]
    assert (h["homo"], h["lumo"]) == (3, 4)
    assert out["ethene"]["gapBeta"] > b["gapBeta"] > h["gapBeta"] > out["octatetraene"]["gapBeta"]
    assert out["allylCation"]["homo"] == 1 and out["allylAnion"]["homo"] == 2
    assert out["allylAnion"]["coeffs"][1][1] == 0.0  # psi2 node sits on C2
    # Isolated diene: two ethene units, so its gap is ethene's.
    say("penta-1,4-diene: two isolated C=C, gap equals ethene's " + str(out["ethene"]["gapBeta"]))
    say()
    return out


# --------------------------------------------------------------------------
# 3. Diels-Alder: products, regiochemistry from frontier coefficients
# --------------------------------------------------------------------------

DA = AllChem.ReactionFromSmarts(
    "[C:1]=[C:2]-[C:3]=[C:4].[C:5]=[C:6]>>[C:1]1-[C:2]=[C:3]-[C:4]-[C:6]-[C:5]-1"
)
DA_YNE = AllChem.ReactionFromSmarts(
    "[C:1]=[C:2]-[C:3]=[C:4].[C:5]#[C:6]>>[C:1]1-[C:2]=[C:3]-[C:4]-[C:6]=[C:5]-1"
)


def da_products(diene: str, dienophile: str, yne: bool = False):
    """Every product the template gives, with the bond pairing that made it:
    (diene atom idx bonded to dienophile atom idx) twice."""
    d = Chem.MolFromSmiles(diene)
    e = Chem.MolFromSmiles(dienophile)
    rxn = DA_YNE if yne else DA
    found = {}
    for prods in rxn.RunReactants((d, e)):
        p = prods[0]
        try:
            Chem.SanitizeMol(p)
        except Exception:
            continue
        # Pairings: product atoms carry react_atom_idx and old_mapno.
        by_map = {}
        for a in p.GetAtoms():
            if a.HasProp("old_mapno"):
                by_map[a.GetIntProp("old_mapno")] = a.GetIntProp("react_atom_idx")
        pairing = ((by_map[1], by_map[5]), (by_map[4], by_map[6]))
        smi = Chem.MolToSmiles(p)
        found.setdefault(flat(smi), (smi, pairing, p))
    return found


# Huckel heteroatom parameters (Streitwieser): h on the diagonal, k off it.
#   carbonyl O  h=1.0, k(C=O)=1.0, 1 pi electron
#   ether O     h=2.0, k(C-O)=0.8, 2 pi electrons
#   nitrile N   h=0.5, k(C-N)=1.0, 1 pi electron (the in-plane pi set)
#   methyl      inductive model, h=-0.5 on the carbon that carries it
def huckel_mol(smiles: str):
    mol = Chem.MolFromSmiles(smiles)
    Chem.Kekulize(mol, clearAromaticFlags=True)
    pi = []
    for a in mol.GetAtoms():
        sym = a.GetSymbol()
        multiple = any(b.GetBondType() in (Chem.BondType.DOUBLE, Chem.BondType.TRIPLE) for b in a.GetBonds())
        if sym == "C" and multiple:
            pi.append(a.GetIdx())
        elif sym in ("O", "N") and multiple:
            pi.append(a.GetIdx())
        elif sym == "O" and not multiple:
            # an ether O joins the system only when it sits on a pi carbon
            if any(n.GetIdx() for n in a.GetNeighbors() if any(
                    b.GetBondType() == Chem.BondType.DOUBLE for b in n.GetBonds())):
                pi.append(a.GetIdx())
    idx = {a: i for i, a in enumerate(pi)}
    n = len(pi)
    h = np.zeros((n, n))
    electrons = 0
    for a in pi:
        atom = mol.GetAtomWithIdx(a)
        sym = atom.GetSymbol()
        multiple = any(b.GetBondType() != Chem.BondType.SINGLE for b in atom.GetBonds())
        if sym == "O" and multiple:
            h[idx[a], idx[a]] = 1.0
            electrons += 1
        elif sym == "O":
            h[idx[a], idx[a]] = 2.0
            electrons += 2
        elif sym == "N":
            h[idx[a], idx[a]] = 0.5
            electrons += 1
        else:
            electrons += 1
            methyls = sum(1 for nb in atom.GetNeighbors()
                          if nb.GetSymbol() == "C" and nb.GetIdx() not in idx and nb.GetDegree() == 1)
            h[idx[a], idx[a]] += -0.5 * methyls
    for b in mol.GetBonds():
        i, j = b.GetBeginAtomIdx(), b.GetEndAtomIdx()
        if i in idx and j in idx:
            syms = {mol.GetAtomWithIdx(i).GetSymbol(), mol.GetAtomWithIdx(j).GetSymbol()}
            k = 1.0
            if "O" in syms and b.GetBondType() == Chem.BondType.SINGLE:
                k = 0.8
            h[idx[i], idx[j]] = h[idx[j], idx[i]] = k
    vals, vecs = np.linalg.eigh(h)
    order = np.argsort(-vals)
    vals, vecs = vals[order], vecs[:, order]
    homo = electrons // 2 - 1
    return mol, idx, vals, vecs, homo


def frontier(smiles: str, which: str) -> dict[int, float]:
    mol, idx, vals, vecs, homo = huckel_mol(smiles)
    k = homo if which == "HOMO" else homo + 1
    return {a: abs(float(vecs[i, k])) for a, i in idx.items()}


def ring_relation(product: Chem.Mol, diene: str, dienophile: str) -> str:
    """ortho/meta/para: ring distance between the substituent-bearing ring atoms."""
    ring = [r for r in product.GetRingInfo().AtomRings() if len(r) == 6][0]
    subs = []
    for a in ring:
        atom = product.GetAtomWithIdx(a)
        if any(n.GetIdx() not in ring for n in atom.GetNeighbors()):
            subs.append(a)
    if len(subs) != 2:
        return f"{len(subs)} substituted ring atoms"
    pos = {a: i for i, a in enumerate(ring)}
    d = abs(pos[subs[0]] - pos[subs[1]])
    d = min(d, 6 - d)
    return {1: "ortho", 2: "meta", 3: "para"}[d]


def regio(diene_key: str, phile_key: str) -> dict:
    diene, phile = MOL[diene_key], MOL[phile_key]
    homo = frontier(diene, "HOMO")
    lumo = frontier(phile, "LUMO")
    prods = da_products(diene, phile)
    scored = []
    for fl, (smi, pairing, p) in prods.items():
        # Matching: big-big plus small-small beats big-small twice.
        overlap = sum(homo[a] * lumo[b] for a, b in pairing)
        scored.append((overlap, fl, smi, pairing, ring_relation(p, diene, phile)))
    scored.sort(reverse=True)
    best = scored[0]
    return {
        "major": best[1], "relation": best[4],
        "all": [(round(s[0], 4), s[1], s[4]) for s in scored],
        "homo": {k: round(v, 3) for k, v in homo.items()},
        "lumo": {k: round(v, 3) for k, v in lumo.items()},
    }


def da_section() -> dict:
    say("== 3. Diels-Alder products and regiochemistry ==")
    out = {}
    simple = {
        "butadiene+ethene": ("butadiene", "ethene", False),
        "butadiene+acrolein": ("butadiene", "acrolein", False),
        "butadiene+acrylonitrile": ("butadiene", "acrylonitrile", False),
        "butadiene+maleicanhydride": ("butadiene", "maleicanhydride", False),
        "dimethylbutadiene+acrylonitrile": ("dimethylbutadiene", "acrylonitrile", False),
        "dimethylbutadiene+maleicanhydride": ("dimethylbutadiene", "maleicanhydride", False),
        "butadiene+dmad": ("butadiene", "dmad", True),
        "butadiene+dimethylmaleate": ("butadiene", "dimethylmaleate", False),
        "cyclopentadiene+ethene": ("cyclopentadiene", "ethene", False),
        "cyclopentadiene+maleicanhydride": ("cyclopentadiene", "maleicanhydride", False),
        "cyclopentadiene+acrylonitrile": ("cyclopentadiene", "acrylonitrile", False),
        "cyclohexa13diene+ethene": ("cyclohexa13diene", "ethene", False),
        "dimethylenecyclohexane+ethene": ("dimethylenecyclohexane", "ethene", False),
        "hexadieneEE+ethene": ("hexadieneEE", "ethene", False),
        "butadiene+methylvinylether": ("butadiene", "methylvinylether", False),
    }
    for name, (dk, ek, yne) in simple.items():
        prods = da_products(MOL[dk], MOL[ek], yne)
        out[name] = sorted(prods.keys())
        say(f"{name:36s} -> {out[name]}")
    assert out["butadiene+ethene"] == [flat("C1=CCCCC1")]
    assert out["butadiene+acrolein"] == [flat("O=CC1CC=CCC1")]
    assert out["butadiene+acrylonitrile"] == [flat("N#CC1CC=CCC1")]
    assert out["butadiene+maleicanhydride"] == [flat("O=C1OC(=O)C2CC=CCC12")]
    assert out["dimethylbutadiene+acrylonitrile"] == [flat("CC1=C(C)CC(C#N)CC1")]
    assert out["butadiene+dmad"] == [flat("COC(=O)C1=C(C(=O)OC)CC=CC1")]
    assert out["cyclopentadiene+ethene"] == [flat("C1=CC2CCC1C2")]
    assert out["cyclohexa13diene+ethene"] == [flat("C1=CC2CCC1CC2")]

    # Fused or bridged: two smallest rings sharing 2 atoms is fused, more is bridged.
    def topology(smi: str) -> str:
        m = Chem.MolFromSmiles(smi)
        rings = sorted(m.GetRingInfo().AtomRings(), key=len)
        if len(rings) < 2:
            return "monocyclic"
        shared = len(set(rings[0]) & set(rings[1]))
        return "fused" if shared == 2 else "bridged"

    topo = {k: topology(out[k][0]) for k in [
        "cyclopentadiene+ethene", "cyclohexa13diene+ethene", "butadiene+maleicanhydride",
        "dimethylenecyclohexane+ethene", "butadiene+ethene", "cyclopentadiene+maleicanhydride"]}
    say("ring topology " + json.dumps(topo))
    assert topo["cyclopentadiene+ethene"] == "bridged"
    assert topo["cyclohexa13diene+ethene"] == "bridged"
    assert topo["butadiene+maleicanhydride"] == "fused"
    assert topo["dimethylenecyclohexane+ethene"] == "fused"
    out["topology"] = topo

    say()
    say("-- regiochemistry (Huckel frontier coefficients) --")
    reg = {}
    for dk, ek in [
        ("piperylene", "acrolein"), ("isoprene", "acrolein"), ("methoxybutadiene1", "acrylonitrile"),
        ("methoxybutadiene2", "acrylonitrile"), ("isoprene", "acrylonitrile"),
        ("piperylene", "methylacrylate"), ("isoprene", "methylacrylate"), ("isoprene", "mvk"),
        ("methoxybutadiene2", "methylacrylate"), ("piperylene", "acrylonitrile"),
    ]:
        r = regio(dk, ek)
        reg[f"{dk}+{ek}"] = r
        say(f"{dk}+{ek}: major {r['major']} ({r['relation']})  all={r['all']}")
        say(f"    diene HOMO |c| {r['homo']}   dienophile LUMO |c| {r['lumo']}")
    for k, r in reg.items():
        expected = "ortho" if k.startswith(("piperylene", "methoxybutadiene1")) else "para"
        assert r["relation"] == expected, (k, r)
    out["regio"] = reg
    say()
    return out


# --------------------------------------------------------------------------
# 4. Diene conformations: s-cis, s-trans, or free
# --------------------------------------------------------------------------

def diene_conformation(smiles: str) -> dict:
    """Measure the C=C-C=C dihedral. If the central single bond is in a ring the
    dihedral is fixed by the ring; otherwise scan it with MMFF and report the
    strain of the s-cis side (dihedral held at 30 degrees) over s-trans."""
    from rdkit.Chem import rdMolTransforms as T
    from rdkit.Chem import rdForceFieldHelpers as FF
    mol = Chem.AddHs(Chem.MolFromSmiles(smiles))
    patt = Chem.MolFromSmarts("[C]=[C]-[C]=[C]")
    match = mol.GetSubstructMatch(patt)
    central_in_ring = mol.GetBondBetweenAtoms(match[1], match[2]).IsInRing()
    cids = list(AllChem.EmbedMultipleConfs(mol, numConfs=20, randomSeed=7))
    AllChem.MMFFOptimizeMoleculeConfs(mol)
    dihedrals = [abs(T.GetDihedralDeg(mol.GetConformer(c), *match)) for c in cids]
    if central_in_ring:
        lo, hi = min(dihedrals), max(dihedrals)
        call = "locked s-cis" if hi < 60 else ("locked s-trans" if lo > 120 else "ring, mixed")
        return {"inRing": True, "min": round(lo, 1), "max": round(hi, 1), "call": call}
    want = Chem.MolToSmiles(Chem.MolFromSmiles(smiles))
    energies = {}
    for target in (30.0, 180.0):
        best = None
        fresh = Chem.AddHs(Chem.MolFromSmiles(smiles))
        props = FF.MMFFGetMoleculeProperties(fresh)
        for c in AllChem.EmbedMultipleConfs(fresh, numConfs=20, randomSeed=13):
            ff = FF.MMFFGetMoleculeForceField(fresh, props, confId=c)
            ff.MMFFAddTorsionConstraint(*match, False, target, target, 100.0)
            ff.Minimize(maxIts=5000)
            # Keep a conformer only if every C=C kept its E/Z: a torsion
            # constraint can drag a double bond round, which would be a
            # different molecule's energy.
            probe = Chem.Mol(fresh, confId=c)
            Chem.AssignStereochemistryFrom3D(probe, confId=c)
            if Chem.MolToSmiles(Chem.RemoveHs(probe)) != want:
                continue
            e = FF.MMFFGetMoleculeForceField(fresh, props, confId=c).CalcEnergy()
            best = e if best is None else min(best, e)
        energies[target] = best
    strain = energies[30.0] - energies[180.0]
    return {"inRing": False, "scisStrainKcal": round(strain, 2),
            "call": "free, reaches s-cis" if strain < 5 else "free, s-cis strained"}


def conformation_section() -> dict:
    say("== 4. Diene conformations ==")
    out = {}
    for key in ["butadiene", "cyclopentadiene", "cyclohexa13diene", "methylenecyclohexene3",
                "dimethylenecyclohexane", "isoprene", "methoxymethylenecyclohexene", "hexadieneEE",
                "hexadieneZZ"]:
        smi = MOL.get(key, r"C/C=C\C=C/C")
        out[key] = diene_conformation(smi)
        say(f"{key:28s} {out[key]}")
    assert out["cyclopentadiene"]["call"] == "locked s-cis"
    assert out["cyclohexa13diene"]["call"] == "locked s-cis"
    assert out["methylenecyclohexene3"]["call"] == "locked s-trans"
    assert out["methoxymethylenecyclohexene"]["call"] == "locked s-trans"
    assert out["butadiene"]["call"] == "free, reaches s-cis"
    assert out["hexadieneZZ"]["scisStrainKcal"] > out["hexadieneEE"]["scisStrainKcal"]
    say()
    return out


# --------------------------------------------------------------------------
# 5. Stereo: cis/trans, meso, CIP, endo/exo
# --------------------------------------------------------------------------

def embed(mol: Chem.Mol):
    mh = Chem.AddHs(mol)
    if AllChem.EmbedMolecule(mh, randomSeed=11) != 0:
        return None
    AllChem.MMFFOptimizeMolecule(mh)
    return mh


def ring_face(mh: Chem.Mol, ring: tuple[int, ...], carbon: int) -> float:
    """Which face of the ring the heavy substituent on `carbon` sits on, signed
    against the H on the same carbon: positive and negative are the two faces."""
    pos = mh.GetConformer().GetPositions()
    pts = pos[list(ring)]
    centroid = pts.mean(axis=0)
    _, _, vt = np.linalg.svd(pts - centroid)
    normal = vt[2]
    atom = mh.GetAtomWithIdx(carbon)
    heavy = [n.GetIdx() for n in atom.GetNeighbors() if n.GetIdx() not in ring and n.GetAtomicNum() > 1]
    hs = [n.GetIdx() for n in atom.GetNeighbors() if n.GetAtomicNum() == 1]
    return float(np.dot(pos[heavy[0]] - pos[hs[0]], normal))


def mirror(mol: Chem.Mol) -> Chem.Mol:
    m = Chem.Mol(mol)
    for a in m.GetAtoms():
        t = a.GetChiralTag()
        if t == Chem.ChiralType.CHI_TETRAHEDRAL_CW:
            a.SetChiralTag(Chem.ChiralType.CHI_TETRAHEDRAL_CCW)
        elif t == Chem.ChiralType.CHI_TETRAHEDRAL_CCW:
            a.SetChiralTag(Chem.ChiralType.CHI_TETRAHEDRAL_CW)
    return m


def cip(mol: Chem.Mol) -> str:
    m = Chem.Mol(mol)
    rdCIPLabeler.AssignCIPLabels(m)
    labels = [f"C{a.GetIdx()}{a.GetProp('_CIPCode')}" for a in m.GetAtoms() if a.HasProp("_CIPCode")]
    return ",".join(labels)


def cis_trans_isomers(smiles_flat: str, subst_ring_atoms_smarts: str) -> list[dict]:
    """Enumerate stereoisomers, embed each, label the two marked ring carbons cis
    or trans, and say whether the isomer is meso."""
    base = Chem.MolFromSmiles(smiles_flat)
    opts = StereoEnumerationOptions(onlyUnassigned=True, unique=True, tryEmbedding=True)
    rows = []
    seen = set()
    for iso in EnumerateStereoisomers(base, options=opts):
        smi = Chem.MolToSmiles(iso)
        if smi in seen:
            continue
        seen.add(smi)
        mh = embed(iso)
        if mh is None:
            continue
        patt = Chem.MolFromSmarts(subst_ring_atoms_smarts)
        match = mh.GetSubstructMatch(patt)
        ring = [r for r in mh.GetRingInfo().AtomRings() if match[0] in r and match[1] in r][0]
        f1 = ring_face(mh, ring, match[0])
        f2 = ring_face(mh, ring, match[1])
        rel = "cis" if f1 * f2 > 0 else "trans"
        meso = Chem.MolToSmiles(mirror(iso)) == smi
        rows.append({"smiles": smi, "relation": rel, "meso": meso, "cip": cip(iso)})
    return rows


def norbornene_endo_exo(smiles_flat: str, sub_smarts: str) -> list[dict]:
    """5,6-substituted norbornenes: each substituent is endo when it sits nearer
    the C=C bridge than the CH2 bridge, measured in 3D."""
    base = Chem.MolFromSmiles(smiles_flat)
    opts = StereoEnumerationOptions(onlyUnassigned=True, unique=True, tryEmbedding=True)
    bridge = Chem.MolFromSmarts("[CH2;R2]")  # placeholder, replaced below
    rows = []
    seen = set()
    for iso in EnumerateStereoisomers(base, options=opts):
        smi = Chem.MolToSmiles(iso)
        key = Chem.MolToSmiles(mirror(iso))
        if smi in seen or key in seen:
            continue
        seen.add(smi)
        mh = embed(iso)
        if mh is None:
            continue
        pos = mh.GetConformer().GetPositions()
        alkene = [b for b in mh.GetBonds() if b.GetBondType() == Chem.BondType.DOUBLE and b.IsInRing()
                  and b.GetBeginAtom().GetSymbol() == "C" and b.GetEndAtom().GetSymbol() == "C"]
        ene = {alkene[0].GetBeginAtomIdx(), alkene[0].GetEndAtomIdx()}
        # bicyclo[2.2.1]: the bridgeheads touch the alkene, and C7 is the ring
        # carbon whose two ring neighbours are both bridgeheads.
        heads = {n.GetIdx() for e in ene for n in mh.GetAtomWithIdx(e).GetNeighbors()
                 if n.GetAtomicNum() == 6 and n.GetIdx() not in ene}
        c7s = [a.GetIdx() for a in mh.GetAtoms() if a.GetAtomicNum() == 6 and a.GetIdx() not in heads
               and a.GetIdx() not in ene
               and sum(1 for n in a.GetNeighbors() if n.GetIdx() in heads) == 2]
        assert len(c7s) == 1, c7s
        c7 = c7s[0]
        mid = (pos[alkene[0].GetBeginAtomIdx()] + pos[alkene[0].GetEndAtomIdx()]) / 2
        labels = []
        for m in mh.GetSubstructMatches(Chem.MolFromSmarts(sub_smarts)):
            s = m[0]  # the carbonyl carbon, which hangs off the skeleton
            d7 = float(np.linalg.norm(pos[s] - pos[c7]))
            dene = float(np.linalg.norm(pos[s] - mid))
            labels.append("endo" if dene < d7 else "exo")
        rows.append({"smiles": smi, "labels": sorted(labels), "meso": key == smi, "cip": cip(iso)})
    return rows


def stereo_section() -> dict:
    say("== 5. Stereo ==")
    out = {}
    rows = cis_trans_isomers(flat("COC(=O)C1CC=CCC1C(=O)OC"), "[C;R;$(C(C(=O)OC))]~[C;R;$(C(C(=O)OC))]")
    for r in rows:
        say(f"cyclohex-4-ene-1,2-diester  {r}")
    out["diester"] = rows
    cis = [r for r in rows if r["relation"] == "cis"]
    trans = [r for r in rows if r["relation"] == "trans"]
    assert len(cis) == 1 and cis[0]["meso"] is True
    assert len(trans) == 2 and all(not r["meso"] for r in trans)  # an enantiomer pair

    # 3,6-dimethylcyclohexene: relate the two methyl-bearing ring carbons directly.
    rows = []
    base = Chem.MolFromSmiles("CC1C=CC(C)CC1")
    opts = StereoEnumerationOptions(onlyUnassigned=True, unique=True, tryEmbedding=True)
    for iso in EnumerateStereoisomers(base, options=opts):
        mh = embed(iso)
        ring = [r for r in mh.GetRingInfo().AtomRings()][0]
        ch = [a for a in ring if any(n.GetAtomicNum() == 6 and n.GetIdx() not in ring
                                     for n in mh.GetAtomWithIdx(a).GetNeighbors())]
        rel = "cis" if ring_face(mh, ring, ch[0]) * ring_face(mh, ring, ch[1]) > 0 else "trans"
        smi = Chem.MolToSmiles(iso)
        rows.append({"smiles": smi, "relation": rel, "meso": Chem.MolToSmiles(mirror(iso)) == smi,
                     "cip": cip(iso)})
    for r in rows:
        say(f"3,6-dimethylcyclohexene  {r}")
    out["dimethylcyclohexene"] = rows
    assert any(r["relation"] == "cis" and r["meso"] for r in rows)

    # Fused anhydride from butadiene + maleic anhydride: ring-fusion H's.
    rows = []
    base = Chem.MolFromSmiles(flat("O=C1OC(=O)C2CC=CCC12"))
    for iso in EnumerateStereoisomers(base, options=StereoEnumerationOptions(unique=True, tryEmbedding=True)):
        mh = embed(iso)
        smi = Chem.MolToSmiles(iso)
        six = [r for r in mh.GetRingInfo().AtomRings() if len(r) == 6][0]
        five = [r for r in mh.GetRingInfo().AtomRings() if len(r) == 5][0]
        fusion = sorted(set(six) & set(five))
        rel = "cis" if ring_face(mh, six, fusion[0]) * ring_face(mh, six, fusion[1]) > 0 else "trans"
        rows.append({"smiles": smi, "relation": rel, "meso": Chem.MolToSmiles(mirror(iso)) == smi})
    for r in rows:
        say(f"tetrahydrophthalic anhydride  {r}")
    out["anhydride"] = rows
    assert any(r["relation"] == "cis" and r["meso"] for r in rows)

    # One stereocentre: cyclohex-3-ene-1-carbonitrile is chiral, so it forms racemic.
    m = Chem.MolFromSmiles("N#CC1CC=CCC1")
    centres = Chem.FindMolChiralCenters(m, includeUnassigned=True, useLegacyImplementation=False)
    say(f"cyclohex-3-ene-1-carbonitrile stereocentres {centres}")
    assert len(centres) == 1
    out["nitrileCentres"] = len(centres)
    rows = [{"smiles": Chem.MolToSmiles(iso), "meso": Chem.MolToSmiles(mirror(iso)) == Chem.MolToSmiles(iso), "cip": cip(iso)}
            for iso in EnumerateStereoisomers(m, options=StereoEnumerationOptions(unique=True))]
    for r in rows:
        say(f"cyclohex-3-ene-1-carbonitrile  {r}")
    assert len(rows) == 2 and not any(r["meso"] for r in rows)  # an enantiomer pair
    out["nitrile"] = rows

    # Endo/exo for the cyclopentadiene + maleic anhydride adduct.
    rows = norbornene_endo_exo(flat("O=C1OC(=O)C2C3C=CC(C3)C12"), "[C;R](=O)[C;R]")
    rows = [r for r in rows]
    for r in rows:
        say(f"norbornene anhydride  {r}")
    out["endoexo"] = rows
    labels = sorted(tuple(r["labels"]) for r in rows)
    assert ("endo", "endo") in labels and ("exo", "exo") in labels
    endo_endo = [r for r in rows if r["labels"] == ["endo", "endo"]]
    assert all(r["meso"] for r in endo_endo)

    # Dimethyl fumarate on cyclopentadiene: the trans diester. Every trans
    # isomer has one ester endo and one exo, whichever way it is built.
    rows = norbornene_endo_exo(flat("COC(=O)C1C2C=CC(C2)C1C(=O)OC"), "[CX3](=O)(OC)[C;R]")
    for r in rows:
        mol = Chem.MolFromSmiles(r["smiles"])
        mh = embed(mol)
        say(f"norbornene diester  {r}")
    out["norbornenediester"] = rows
    mixed = [r for r in rows if r["labels"] == ["endo", "exo"]]
    assert mixed and all(not r["meso"] for r in mixed)
    say()
    return out


# --------------------------------------------------------------------------
# 6. Retro Diels-Alder
# --------------------------------------------------------------------------

RETRO = AllChem.ReactionFromSmarts(
    "[C:1]1=[C:2]-[C:3]-[C:4]-[C:5]-[C:6]-1>>[C:6]=[C:1]-[C:2]=[C:3].[C:4]=[C:5]"
)
RETRO_YNE = AllChem.ReactionFromSmarts(
    "[C:1]1=[C:2]-[C:3]-[C:4]=[C:5]-[C:6]-1>>[C:6]=[C:1]-[C:2]=[C:3].[C:4]#[C:5]"
)


def retro(product: str) -> list[tuple[str, str]]:
    m = Chem.MolFromSmiles(product)
    pairs = set()
    for rxn in (RETRO, RETRO_YNE):
        for ps in rxn.RunReactants((m,)):
            try:
                for p in ps:
                    Chem.SanitizeMol(p)
            except Exception:
                continue
            diene, phile = (flat(Chem.MolToSmiles(p)) for p in ps)
            pairs.add((diene, phile))
    return sorted(pairs)


def retro_section() -> dict:
    say("== 6. Retro Diels-Alder (ring C=C was diene C2-C3) ==")
    out = {}
    for key, smi in {
        "cyclohexenecarbonitrile": "N#CC1CC=CCC1",
        "methylcyclohexenecarbonitrile": "CC1=CCC(C#N)CC1",
        "dimethylcyclohexenecarbaldehyde": "CC1=C(C)CC(C=O)CC1",
        "norbornenecarbonitrile": "N#CC1CC2C=CC1C2",
        "diesterdiene": "COC(=O)C1=C(C(=O)OC)CC=CC1",
        "orthoAldehyde": "CC1C=CCCC1C=O",
    }.items():
        r = retro(smi)
        out[key] = r
        say(f"{key:34s} {smi:28s} -> {r}")
    # Only the cut across from the ring C=C gives a conjugated diene plus an alkene.
    assert (flat("C=CC=C"), flat("C=CC#N")) in out["cyclohexenecarbonitrile"]
    assert (flat("C=CC(C)=C"), flat("C=CC#N")) in out["methylcyclohexenecarbonitrile"]
    assert (flat("C=C(C)C(C)=C"), flat("C=CC=O")) in out["dimethylcyclohexenecarbaldehyde"]
    assert (flat("C1=CCC=C1"), flat("C=CC#N")) in out["norbornenecarbonitrile"]
    assert (flat("C=CC=CC"), flat("C=CC=O")) in out["orthoAldehyde"]
    say()
    return out


# --------------------------------------------------------------------------
# 7. Figures: RDKit 2D coordinates fitted into the 120 by 84 viewBox
# --------------------------------------------------------------------------

W, H = 120, 84
BOND = 17.0  # target bond length in viewBox units
MARGIN = 9.0


def label_for(atom: Chem.Atom) -> str | None:
    sym = atom.GetSymbol()
    if sym == "C":
        return None
    hs = atom.GetTotalNumHs()
    text = sym if hs == 0 else (sym + "H" if hs == 1 else f"{sym}H_{hs}")
    charge = atom.GetFormalCharge()
    if charge:
        text += "^+" if charge > 0 else "^-"
    return text


def figure(smiles: str, marks: tuple[int, ...] = (), flip: bool = False, compact: bool = False,
           mirror_image: bool = False) -> dict:
    """A Figure for `smiles`. `marks` are atom indices (in SMILES order) to circle.
    `compact` scales the label size and the bond trim around a label with the
    bond length, for a drawing fitted well below BOND (two molecules in a tile);
    every other figure keeps the fixed sizes it was generated with.
    `mirror_image` reflects the drawing left to right and keeps its wedges, so it
    shows the mirror image of `smiles` (unlike `flip`, which stays the same molecule)."""
    mol = Chem.MolFromSmiles(smiles)
    Chem.Kekulize(mol, clearAromaticFlags=True)
    rdDepictor.Compute2DCoords(mol)
    conf = mol.GetConformer()
    pts = np.array([[conf.GetAtomPosition(i).x, conf.GetAtomPosition(i).y] for i in range(mol.GetNumAtoms())])
    pts[:, 1] *= -1  # SVG y grows downward
    if flip or mirror_image:
        pts[:, 0] *= -1
    if compact:
        # Fragments side by side, left to right in SMILES order, one bond apart,
        # centred on one line. Translation only, so no stereo changes.
        x = 0.0
        for frag in Chem.GetMolFrags(mol):
            idx = list(frag)
            lo, hi = pts[idx].min(axis=0), pts[idx].max(axis=0)
            pts[idx] += np.array([x - lo[0], -(lo[1] + hi[1]) / 2])
            x += (hi[0] - lo[0]) + 1.5
    lengths = [np.linalg.norm(pts[b.GetBeginAtomIdx()] - pts[b.GetEndAtomIdx()]) for b in mol.GetBonds()]
    unit = float(np.mean(lengths)) if lengths else 1.0
    span = pts.max(axis=0) - pts.min(axis=0)
    scale = BOND / unit
    fit = min((W - 2 * MARGIN) / max(span[0], 1e-6), (H - 2 * MARGIN) / max(span[1], 1e-6))
    scale = min(scale, fit)
    centre = (pts.max(axis=0) + pts.min(axis=0)) / 2
    xy = (pts - centre) * scale + np.array([W / 2, H / 2])
    ratio = min(1.0, scale * unit / BOND) if compact else 1.0

    labels = {a.GetIdx(): label_for(a) for a in mol.GetAtoms()}
    stereo = wedges(mol, smiles, flip)
    bonds = []
    for b in mol.GetBonds():
        i, j = b.GetBeginAtomIdx(), b.GetEndAtomIdx()
        p, q = xy[i].copy(), xy[j].copy()
        v = q - p
        length = float(np.linalg.norm(v))
        u = v / length
        trim = 6.5 * ratio
        if labels[i]:
            p = p + u * trim
        if labels[j]:
            q = q - u * trim
        order = {Chem.BondType.SINGLE: 1, Chem.BondType.DOUBLE: 2, Chem.BondType.TRIPLE: 3}[b.GetBondType()]
        bond = {"x1": round(float(p[0])), "y1": round(float(p[1])), "x2": round(float(q[0])), "y2": round(float(q[1]))}
        if order > 1:
            bond["order"] = order
        if b.GetIdx() in stereo:
            bond["stereo"] = stereo[b.GetIdx()]
        bonds.append(bond)
    text = []
    for idx, t in labels.items():
        if t:
            entry = {"x": round(float(xy[idx][0])), "y": round(float(xy[idx][1])) + round(5 * ratio), "t": t,
                     "size": max(8, round(13 * ratio))}
            text.append(entry)
    rings = [{"x": round(float(xy[i][0])), "y": round(float(xy[i][1])), "r": 6} for i in marks]
    fig = {"bonds": bonds}
    if text:
        fig["labels"] = text
    if rings:
        fig["rings"] = rings
    # Invariants the mcqFigures suite holds every drawing to.
    for b in bonds:
        assert 0 <= b["x1"] <= W and 0 <= b["x2"] <= W and 0 <= b["y1"] <= H and 0 <= b["y2"] <= H, (smiles, b)
        assert (b["x1"], b["y1"]) != (b["x2"], b["y2"]), smiles
    for r in rings:
        assert r["x"] - r["r"] >= 0 and r["x"] + r["r"] <= W and r["y"] - r["r"] >= 0 and r["y"] + r["r"] <= H
    if stereo:
        seen = read_back(mol, xy, stereo, flip)
        want = canon(mirror(Chem.MolFromSmiles(smiles))) if mirror_image else canon(smiles)
        assert seen == want, (smiles, seen)
    return fig


def wedges(mol: Chem.Mol, smiles: str, flip: bool) -> dict[int, str]:
    """Wedge and hash bonds for every assigned stereocentre, chosen by RDKit
    (WedgeMolBonds) on the 2D coordinates just computed. RDKit puts each wedged
    bond's BEGIN atom on the stereocentre, so x1,y1 is the narrow end. Empty for
    a molecule with no assigned centre. A meso compound is its own mirror image,
    so its wedges may all be inverted; that is done when it turns more hashes
    into wedges, so a cis meso product reads "both wedged" as the pools say."""
    if all(a.GetChiralTag() == Chem.ChiralType.CHI_UNSPECIFIED for a in mol.GetAtoms()):
        return {}
    Chem.WedgeMolBonds(mol, mol.GetConformer())
    out = {}
    for b in mol.GetBonds():
        d = b.GetBondDir()
        if d == Chem.BondDir.BEGINWEDGE:
            out[b.GetIdx()] = "wedge"
        elif d == Chem.BondDir.BEGINDASH:
            out[b.GetIdx()] = "hash"
    swap = {"wedge": "hash", "hash": "wedge"}
    meso = Chem.MolToSmiles(mirror(mol)) == canon(smiles)
    hashes = sum(1 for v in out.values() if v == "hash")
    if meso and hashes > len(out) - hashes:
        out = {k: swap[v] for k, v in out.items()}
    if flip:  # a mirrored drawing needs mirrored wedges to stay the same molecule
        out = {k: swap[v] for k, v in out.items()}
    return out


def read_back(mol: Chem.Mol, xy: np.ndarray, stereo: dict[int, str], flip: bool) -> str:
    """The molecule a reader sees: stereo perceived from the DRAWN coordinates
    and the emitted wedges alone, with every chiral tag cleared first. The
    figure must read back as the SMILES it was drawn from."""
    m = Chem.RWMol(mol)
    for a in m.GetAtoms():
        a.SetChiralTag(Chem.ChiralType.CHI_UNSPECIFIED)
    dirs = {"wedge": Chem.BondDir.BEGINWEDGE, "hash": Chem.BondDir.BEGINDASH}
    for b in m.GetBonds():
        b.SetBondDir(dirs.get(stereo.get(b.GetIdx(), ""), Chem.BondDir.NONE))
    conf = m.GetConformer()
    for k in range(m.GetNumAtoms()):
        # Back to RDKit's y-up frame. A flipped drawing stays flipped: it is what the reader sees.
        conf.SetAtomPosition(k, Point3D(float(xy[k][0]), float(-xy[k][1]), 0.0))
    Chem.AssignChiralTypesFromBondDirs(m, conf.GetId())
    Chem.AssignStereochemistry(m, cleanIt=True, force=True)
    return canon(m.GetMol())


# Every drawing the pools use: key -> (SMILES, atoms to circle). The SMILES is
# what is drawn, so a reviewer can paste it into any viewer and see the same
# molecule. Marked atoms are SMILES atom indices.
FIGURES: dict[str, tuple[str, tuple[int, ...]]] = {
    # stage C substrates
    "nbs": (MOL["nbs"], ()),
    "cyclohexene": (MOL["cyclohexene"], ()),
    "cyclopentene": (MOL["cyclopentene"], ()),
    "hex1ene": (MOL["hex1ene"], ()),
    "isobutylene": (MOL["isobutylene"], ()),
    "methylcyclohexene1": (MOL["methylcyclohexene1"], ()),
    "tetramethylethylene": (MOL["tetramethylethylene"], ()),
    "but2ene": (MOL["but2ene"], ()),
    "methylenecyclohexane": (MOL["methylenecyclohexane"], ()),
    "cyclohexane": (MOL["cyclohexane"], ()),
    # stage C position tiles on cyclohexene C1=CCCCC1: 0,1 vinylic, 2 and 5 allylic, 3 and 4 homoallylic
    "cyclohexene-allylic": ("C1=CCCCC1", (2, 5)),
    "cyclohexene-vinylic": ("C1=CCCCC1", (0, 1)),
    "cyclohexene-homoallylic": ("C1=CCCCC1", (3, 4)),
    # hex-1-ene C=CCCCC: 2 is the allylic carbon, 0 and 1 vinylic, 3 next along
    "hex1ene-allylic": ("C=CCCCC", (2,)),
    "hex1ene-vinylic": ("C=CCCCC", (1,)),
    "hex1ene-c4": ("C=CCCCC", (3,)),
    "hex1ene-c6": ("C=CCCCC", (5,)),
    # 1-methylcyclohexene CC1=CCCCC1: methyl 0, ring C6 is 6, ring C3 is 3
    "methylcyclohexene1-allylic": ("CC1=CCCCC1", (0, 3, 6)),
    "methylcyclohexene1-ringonly": ("CC1=CCCCC1", (3, 6)),
    "methylcyclohexene1-vinylic": ("CC1=CCCCC1", (1, 2)),
    # stage C products
    "bromocyclohexene3": ("BrC1C=CCCC1", ()),
    "dibromocyclohexane12": ("BrC1CCCCC1Br", ()),
    "bromocyclohexane": ("BrC1CCCCC1", ()),
    "bromocyclohexene1": ("BrC1=CCCCC1", ()),
    "bromocyclopentene3": ("BrC1C=CCC1", ()),
    "methallylbromide": ("C=C(C)CBr", ()),
    "dibromo12methylpropane": ("CC(C)(Br)CBr", ()),
    "bromohex1ene3": ("C=CC(Br)CCC", ()),
    "bromohex2ene1": ("BrC/C=C/CCC", ()),
    "bromobutene3": ("C=CC(Br)C", ()),
    "bromobutene1": ("BrC/C=C/C", ()),
    "dibromobutane23": ("CC(Br)C(Br)C", ()),
    "tmBrTertiary": ("C=C(C)C(C)(C)Br", ()),
    "tmBrPrimary": ("BrCC(C)=C(C)C", ()),
    "tmDibromide": ("CC(C)(Br)C(C)(C)Br", ()),
    "mchBrRing": ("C=C1CCCCC1Br", ()),
    "mchBrShifted": ("BrCC1=CCCCC1", ()),
    "mchBrVinyl": ("BrC=C1CCCCC1", ()),
    "bromocyclohexene3-alt": ("BrC1CCCC=C1", ()),
    # MO
    "ethene": (MOL["ethene"], ()),
    "butadiene": (MOL["butadiene"], ()),
    "hexatriene": ("C=C/C=C/C=C", ()),
    "octatetraene": ("C=C/C=C/C=C/C=C", ()),
    "penta14diene": (MOL["penta14diene"], ()),
    "piperylene": (MOL["piperylene"], ()),
    "cyclohexa13diene": (MOL["cyclohexa13diene"], ()),
    "cyclohexa14diene": (MOL["cyclohexa14diene"], ()),
    # D dienes
    "isoprene": (MOL["isoprene"], ()),
    "dimethylbutadiene": (MOL["dimethylbutadiene"], ()),
    "methoxybutadiene1": (MOL["methoxybutadiene1"], ()),
    "methoxybutadiene2": (MOL["methoxybutadiene2"], ()),
    "cyclopentadiene": (MOL["cyclopentadiene"], ()),
    "methylenecyclohexene3": (MOL["methylenecyclohexene3"], ()),
    "dimethylenecyclohexane": (MOL["dimethylenecyclohexane"], ()),
    "hexadieneEE": (MOL["hexadieneEE"], ()),
    "methoxymethylenecyclohexene": (MOL["methoxymethylenecyclohexene"], ()),
    # D dienophiles
    "acrolein": (MOL["acrolein"], ()),
    "acrylonitrile": (MOL["acrylonitrile"], ()),
    "methylacrylate": (MOL["methylacrylate"], ()),
    "mvk": (MOL["mvk"], ()),
    "maleicanhydride": (MOL["maleicanhydride"], ()),
    "dimethylmaleate": (MOL["dimethylmaleate"], ()),
    "dimethylfumarate": (MOL["dimethylfumarate"], ()),
    "dmad": (MOL["dmad"], ()),
    "methylvinylether": (MOL["methylvinylether"], ()),
    "propene": (MOL["propene"], ()),
    # D products, constitution only. The stereo answers are drawn with wedges by stereo_figures()
    "cyclohexene-product": ("C1=CCCCC1", ()),
    "cyclobutane-ethyl": ("C=CC1CCC1", ()),
    "cyclohexa13diene-product": ("C1=CC=CCC1", ()),
    "cyclohexenecarbaldehyde": ("O=CC1CC=CCC1", ()),
    "cyclohexenecarbaldehyde-conj": ("O=CC1=CCCCC1", ()),
    "cyclohexenecarbaldehyde-wrongene": ("O=CC1C=CCCC1", ()),
    "vinylcyclobutanecarbaldehyde": ("O=CC1CCC1C=C", ()),
    "cyclohexenecarbonitrile": ("N#CC1CC=CCC1", ()),
    "anhydrideadduct": ("O=C1OC(=O)C2CC=CCC12", ()),
    "dimethylcyclohexenecarbonitrile": ("CC1=C(C)CC(C#N)CC1", ()),
    "dimethylcyclohexenecarbonitrile-wrong": ("CC1C(C)=CCC(C#N)C1", ()),
    "dmadadduct": ("COC(=O)C1=C(C(=O)OC)CC=CC1", ()),
    "dmadadduct-wrong": ("COC(=O)C1C(C(=O)OC)C=CC=C1", ()),
    "orthoAldehyde": ("CC1C=CCCC1C=O", ()),
    "metaAldehyde": ("CC1C=CCC(C=O)C1", ()),
    "paraAldehyde": ("CC1=CCC(C=O)CC1", ()),
    "metaAldehydeIso": ("CC1=CCCC(C=O)C1", ()),
    "orthoNitrileOMe": ("COC1C=CCCC1C#N", ()),
    "metaNitrileOMe": ("COC1C=CCC(C#N)C1", ()),
    "paraNitrileOMe": ("COC1=CCC(C#N)CC1", ()),
    "metaNitrileOMe2": ("COC1=CCCC(C#N)C1", ()),
    "paraNitrileMe": ("CC1=CCC(C#N)CC1", ()),
    "metaNitrileMe": ("CC1=CCCC(C#N)C1", ()),
    "paraEster": ("COC(=O)C1CC=C(C)CC1", ()),
    "metaEster": ("COC(=O)C1CCC=C(C)C1", ()),
    "orthoEster": ("COC(=O)C1CCC=CC1C", ()),
    "metaEsterPip": ("COC(=O)C1CC=CC(C)C1", ()),
    "paraKetone": ("CC(=O)C1CC=C(C)CC1", ()),
    "metaKetone": ("CC(=O)C1CCC=C(C)C1", ()),
    "norbornene": ("C1=CC2CCC1C2", ()),
    "bicyclooctene": ("C1=CC2CCC1CC2", ()),
    "fusedFromDimethylene": ("C1CCC2=C(C1)CCCC2", ()),
    "norborneneanhydride": ("O=C1OC(=O)C2C3C=CC(C3)C12", ()),
    "norbornenecarbonitrile": ("N#CC1CC2C=CC1C2", ()),
    "diestercyclohexene": ("COC(=O)C1CC=CCC1C(=O)OC", ()),
    "dimethylcyclohexene36": ("CC1C=CC(C)CC1", ()),
    "dimethylanhydrideadduct": ("CC1=C(C)CC2C(=O)OC(=O)C2C1", ()),
    # extra distractors and substrates
    "bromocyclopentene1": ("BrC1=CCCC1", ()),
    "dibromocyclopentane": ("BrC1CCCC1Br", ()),
    "dibromohexane12": ("BrCC(Br)CCCC", ()),
    "isobutenylbromide": ("BrC=C(C)C", ()),
    "but1ene": ("C=CCC", ()),
    "dibromobutane12": ("BrCC(Br)CC", ()),
    "pent1ene": ("C=CCCC", ()),
    "bicycloheptenefused": ("C1=CC2CCC2C1", ()),
    "cycloheptene": ("C1=CCCCCC1", ()),
    "hexadieneZZ": (r"C/C=C\C=C/C", ()),
    "dmbCyclobutane": ("C=C(C)C1(C)CC(C#N)C1", ()),
    "anhydrideadduct-wrongene": ("O=C1OC(=O)C2=C1CCCC2", ()),
    "dmbAnhWrong": ("CC1CC2=C(CC1C)C(=O)OC2=O", ()),
    "dmbAnhShift": ("CC1C=C(C)CC2C(=O)OC(=O)C12", ()),
    "orthoKetone": ("CC(=O)C1CCC=CC1C", ()),
    "paraEsterOMe": ("COC(=O)C1CC=C(OC)CC1", ()),
    "metaEsterOMe": ("COC(=O)C1CCC=C(OC)C1", ()),
    "orthoEsterOMe": ("COC(=O)C1CCC=CC1OC", ()),
}


def figure_in(smiles: str, x0: float, x1: float, mirror_image: bool = False) -> dict:
    """One molecule fitted into the horizontal band x0..x1 of the viewBox."""
    global W, BOND
    saved = (W, BOND)
    W, BOND = x1 - x0, 12.0
    try:
        f = figure(smiles, mirror_image=mirror_image)
    finally:
        W, BOND = saved
    shift = lambda v: round(v + x0)
    bonds = [{**b, "x1": shift(b["x1"]), "x2": shift(b["x2"])} for b in f["bonds"]]
    labels = [{**l, "x": shift(l["x"]), "size": 11} for l in f.get("labels", [])]
    return {"bonds": bonds, "labels": labels}


def figure_combo(a: str, b: str) -> dict:
    """Two reactants in one tile: A + B. Used where an answer is a PAIR of
    starting materials, so the tile shows both structures."""
    fa = figure_in(a, 0, 56)
    fb = figure_in(b, 64, 120)
    return {
        "bonds": fa["bonds"] + fb["bonds"],
        "labels": fa["labels"] + fb["labels"] + [{"x": 60, "y": 47, "t": "+", "size": 14}],
    }


def figure_pair(a: str, b: str) -> dict:
    """Two products in one tile with no '+': a mixture or a racemate. One RDKit
    layout of the two-fragment SMILES, so both share one scale, and the read-back
    in figure() checks both molecules' stereo at once."""
    return figure(f"{a}.{b}", compact=True)


def figure_mirror_pair(a: str) -> dict:
    """A molecule beside its own mirror image, one tile. figure() reads the right
    half back as the mirror image, so for a meso compound both halves read back
    as the same SMILES."""
    fa = figure_in(a, 0, 56)
    fb = figure_in(a, 64, 120, mirror_image=True)
    return {"bonds": fa["bonds"] + fb["bonds"], "labels": fa["labels"] + fb["labels"]}


def stereo_figures(st: dict) -> dict:
    """The stereo products drawn with wedges, each picked out of section 5's
    RDKit-perceived isomers by its relation, meso flag, endo/exo labels or CIP
    codes (never typed in by hand). stage-cd.ts names these keys in its tiles.
    Returns key -> (kind, smiles...)."""
    def one(rows, **want):
        hit = [r for r in rows if all(r.get(k) == v for k, v in want.items())]
        assert len(hit) == 1, (want, rows)
        return hit[0]["smiles"]

    def trans_cip(rows, letter):
        hit = [r for r in rows if r["relation"] == "trans" and {c[-1] for c in r["cip"].split(",")} == {letter}]
        assert len(hit) == 1, (letter, rows)
        return hit[0]["smiles"]

    di_cis = one(st["diester"], relation="cis", meso=True)
    di_rr = trans_cip(st["diester"], "R")
    di_ss = trans_cip(st["diester"], "S")
    dm_cis = one(st["dimethylcyclohexene"], relation="cis", meso=True)
    dm_rr = trans_cip(st["dimethylcyclohexene"], "R")
    an_endo = one(st["endoexo"], labels=["endo", "endo"])
    an_exo = one(st["endoexo"], labels=["exo", "exo"])
    nd_mixed = one(st["norbornenediester"], labels=["endo", "exo"])
    nd_endo = one(st["norbornenediester"], labels=["endo", "endo"])
    nd_exo = one(st["norbornenediester"], labels=["exo", "exo"])
    an_trans = one(st["endoexo"], labels=["endo", "exo"], meso=False)
    cn_r = one(st["nitrile"], cip="C2R")
    cn_s = one(st["nitrile"], cip="C2S")
    say("== 7b. Stereo figures, wedges from RDKit ==")
    figs = {
        "st-diester-cis": ("one", di_cis),
        "st-diester-trans": ("one", di_rr),
        "st-diester-mix": ("pair", di_cis, di_rr),
        "st-diester-rac": ("pair", di_rr, di_ss),
        "st-dmch-cis": ("one", dm_cis),
        "st-dmch-trans": ("one", dm_rr),
        "st-dmch-mix": ("pair", dm_cis, dm_rr),
        "st-nbanh-endo": ("one", an_endo),
        "st-nbanh-exo": ("one", an_exo),
        "st-nbanh-mix": ("pair", an_endo, an_exo),
        "st-nbdiester-endoexo": ("one", nd_mixed),
        "st-nbdiester-endo": ("one", nd_endo),
        "st-nbdiester-exo": ("one", nd_exo),
        "st-diester-cis-mirror": ("mirror", di_cis),
        "st-nbanh-trans": ("one", an_trans),
        "st-nbanh-endo-trans": ("pair", an_endo, an_trans),
        "st-nitrile-r": ("one", cn_r),
        "st-nitrile-s": ("one", cn_s),
        "st-nitrile-rac": ("pair", cn_r, cn_s),
    }
    for key, spec in figs.items():
        say(f"{key:22s} {' . '.join(spec[1:])}")
    say()
    return figs


# Option tiles that are reactant pairs, with the target each is graded against.
# The script runs every pair forward and asserts only the keyed pair gives the target.
COMBOS: dict[str, tuple[str, str]] = {
    "retro-bd-acn": ("C=CC=C", "C=CC#N"),
    "retro-dienenitrile-eth": ("C=CC=CC#N", "C=C"),
    "retro-cyanobd-eth": ("C=CC(C#N)=C", "C=C"),
    "retro-iso-acn": ("C=CC(C)=C", "C=CC#N"),
    "retro-pip-acn": ("C/C=C/C=C", "C=CC#N"),
    "retro-bd-methacn": ("C=CC=C", "C=C(C)C#N"),
    "retro-pip-acr": ("C/C=C/C=C", "C=CC=O"),
    "retro-iso-acr": ("C=CC(C)=C", "C=CC=O"),
    "retro-bd-crot": ("C=CC=C", "C/C=C/C=O"),
    "retro-cp-acn": ("C1=CCC=C1", "C=CC#N"),
    "retro-chd-acn": ("C1=CC=CCC1", "C=CC#N"),
    "retro-cpene-acn": ("C1=CCCC1", "C=CC#N"),
    "retro-cp-ma": ("C1=CCC=C1", "O=C1OC(=O)C=C1"),
    "retro-chd-ma": ("C1=CC=CCC1", "O=C1OC(=O)C=C1"),
    "retro-bd-ma": ("C=CC=C", "O=C1OC(=O)C=C1"),
    "pair-bd-eth": ("C=CC=C", "C=C"),
    "pair-mch-ma": ("C=C1CCCC=C1", "O=C1OC(=O)C=C1"),
}

RETRO_ITEMS: dict[str, tuple[str, str, list[str]]] = {
    # item: (target, correct combo, other combos)
    "cyclohexenecarbonitrile": ("N#CC1CC=CCC1", "retro-bd-acn", ["retro-dienenitrile-eth", "retro-cyanobd-eth"]),
    "paraNitrileMe": ("CC1=CCC(C#N)CC1", "retro-iso-acn", ["retro-pip-acn", "retro-bd-methacn"]),
    "orthoAldehyde": ("CC1C=CCCC1C=O", "retro-pip-acr", ["retro-iso-acr", "retro-bd-crot"]),
    "norbornenecarbonitrile": ("N#CC1CC2C=CC1C2", "retro-cp-acn", ["retro-chd-acn", "retro-cpene-acn"]),
    "norborneneanhydride": ("O=C1OC(=O)C2C3C=CC(C3)C12", "retro-cp-ma", ["retro-chd-ma", "retro-bd-ma"]),
}


def retro_options_section() -> None:
    say("== 6b. Retro option tiles, each pair run forward ==")
    for item, (target, good, bad) in RETRO_ITEMS.items():
        want = flat(target)
        for key in [good, *bad]:
            d, e = COMBOS[key]
            made = sorted(da_products(d, e).keys())
            hit = want in made
            say(f"{item:24s} {key:24s} -> {made} {'TARGET' if hit else ''}")
            assert hit == (key == good), (item, key, made)
    say()


def figure_ladder(x: list[float]) -> dict:
    """A pi MO ladder from Huckel x values (E = alpha + x beta, larger x lower):
    one level per MO, labelled psi_k, no electrons drawn."""
    top, bottom = 10.0, 74.0
    hi, lo = max(x), min(x)
    def y_of(v: float) -> float:
        # larger x is LOWER energy, so it sits lower on the page: psi_1 at the bottom
        return top + (v - lo) / (hi - lo) * (bottom - top) if hi != lo else 42.0
    bonds, labels = [], []
    for k, v in enumerate(x):
        y = round(y_of(v))
        bonds.append({"x1": 50, "y1": y, "x2": 82, "y2": y})
        labels.append({"x": 40, "y": y + 4, "t": f"ψ_{k + 1}", "size": 11, "anchor": "end"})
    return {"bonds": bonds, "labels": labels}


def figures_section(mo: dict, stereo_figs: dict) -> dict:
    out = {}
    for key, (smi, marks) in FIGURES.items():
        out[key] = {"smiles": canon(smi), "figure": figure(smi, marks)}
    for key, (a, b) in COMBOS.items():
        out[key] = {"smiles": canon(a) + "." + canon(b), "figure": figure_combo(a, b)}
    for key in ["ethene", "butadiene", "hexatriene", "allylAnion"]:
        out[f"ladder-{key}"] = {"smiles": f"huckel:{key}", "figure": figure_ladder(mo[key]["x"])}
    for key, spec in stereo_figs.items():
        if spec[0] == "one":
            out[key] = {"smiles": canon(spec[1]), "figure": figure(spec[1])}
        elif spec[0] == "mirror":
            out[key] = {"smiles": canon(spec[1]) + "." + canon(mirror(Chem.MolFromSmiles(spec[1]))), "figure": figure_mirror_pair(spec[1])}
        else:
            out[key] = {"smiles": canon(spec[1]) + "." + canon(spec[2]), "figure": figure_pair(spec[1], spec[2])}
        assert any("stereo" in b for b in out[key]["figure"]["bonds"]), key
    return out


def write_figures(figs: dict) -> None:
    lines = [
        "/**",
        " * GENERATED by scripts/u1_pools_cd.py. Do not edit by hand: rerun the script.",
        " *",
        " * Every molecule the stage C and D pools draw, as a Figure in the 120 by 84",
        " * viewBox, laid out from RDKit 2D coordinates. The SMILES beside each entry",
        " * is what is drawn. A SMILES with assigned stereocentres is drawn with RDKit's",
        " * own wedge and hash bonds (WedgeMolBonds), and the script reads every such",
        " * drawing back from its coordinates and wedges before it writes this file.",
        " */",
        'import type { Figure } from "../../onboarding/figures";',
        "",
        "export const CD_FIGURE_SMILES: Readonly<Record<string, string>> = Object.freeze({",
    ]
    for key, v in figs.items():
        lines.append(f"  {json.dumps(key)}: {json.dumps(v['smiles'])},")
    lines.append("});")
    lines.append("")
    lines.append("export const CD_FIGURES: Readonly<Record<string, Figure>> = Object.freeze({")
    for key, v in figs.items():
        lines.append(f"  {json.dumps(key)}: {json.dumps(v['figure'], separators=(',', ':'))},")
    lines.append("});")
    lines.append("")
    FIG_OUT.write_text("\n".join(lines), encoding="utf-8")


# --------------------------------------------------------------------------
# 8. Active items (U1-P3, 2026-10-17): "Draw it" items and match boards for
#    stages C and D, written to stage-cd.active.ts. GENERATED, unlike
#    stage-cd.ts: every answer below is computed in this section from the
#    sections above, and the file is refused when a derivation disagrees.
#
#    Draw items are graded in the browser by standard InChI with the stereo
#    layers dropped (src/game/beats/draw/grade.ts); the InChI is RDKit's here.
#    No item here asks about stereo, which is why the stereo nodes (u1-da-stereo,
#    u1-da-3d) get no drawing: a drawing without wedges would test nothing they teach.
# --------------------------------------------------------------------------

ACTIVE_OUT = ROOT / "src" / "game" / "content" / "u1" / "stage-cd.active.ts"
ACTIVE_FAILS: list[str] = []
ACTIVE: dict[str, list[dict]] = {}
ACTIVE_NAMES: list[tuple[str, str, str]] = []
CD_PRACTICE = {"u1-nbs-practice", "u1-quiz-c", "u1-mo", "u1-da-predict", "u1-da-3d", "u1-quiz-d"}
EM = chr(0x2014)


def _lint(where: str, text: str, cap: int) -> None:
    if len(text) > cap:
        ACTIVE_FAILS.append(f"{where}: {len(text)} characters, over {cap}")
    if "?" in text or EM in text or not text.strip():
        ACTIVE_FAILS.append(f"{where}: question mark, em dash or empty")


def _scheme(left_fig: dict, left_name: str, over: str, under: str | None = None) -> dict:
    sch = {"left": left_fig, "leftName": left_name, "over": over}
    if under is not None:
        sch["under"] = under
    return {"kind": "scheme", "scheme": sch}


def card_figure(smiles: str) -> dict:
    """A molecule drawn to FILL its tile, for a match card or a draw item's
    starting materials (round 2: ethene was a bare "=" and isoprene about 40px).
    The bond length is raised and figure() still caps it to fit the box. A
    two-carbon molecule is written out with its hydrogens (H2C=CH2), the way
    stage A and B draw their smallest species, since two bare vertices read as
    nothing."""
    global BOND
    mol = Chem.MolFromSmiles(smiles)
    if mol.GetNumAtoms() == 2:
        labels = []
        for a, x in zip(mol.GetAtoms(), (38, 82)):
            hs = a.GetTotalNumHs()
            labels.append({"x": x, "y": 47, "t": a.GetSymbol() + ("H" if hs else "") + (f"_{hs}" if hs > 1 else ""), "size": 14})
        order = int(mol.GetBondWithIdx(0).GetBondTypeAsDouble())
        bond = {"x1": 51, "y1": 42, "x2": 69, "y2": 42}
        if order > 1:
            bond["order"] = order
        return {"bonds": [bond], "labels": labels}
    saved = BOND
    BOND = 30.0
    try:
        return figure(smiles)
    finally:
        BOND = saved


def _inchi(smi: str) -> str:
    out = Chem.MolToInchi(Chem.MolFromSmiles(smi))
    if not out.startswith("InChI=1S/"):
        ACTIVE_FAILS.append(f"no InChI for {smi}")
    return out


def _grade_key(inchi: str, stereo: bool) -> str:
    """The browser grader's comparison (beats/draw/grade.ts), in Python, so the
    script can prove every named miss grades differently from the answer."""
    head, *layers = inchi.split("/")
    drop = ("m", "s") if stereo else ("b", "t", "m", "s")
    return "/".join([head] + [layer for layer in layers if not layer.startswith(drop)])


def active_draw(node, id, prompt, brief, visual, answer, name, why, look_at, explanation, provenance, concept,
                conditions=None, at=None, misses=(), stereo=False):
    """One "Draw it" entry. `misses` are (id, SMILES, what it is, coach line):
    wrong structures the screen names when a student draws one (round 2). Each
    is built by a derivation in this file and must grade differently from the
    answer and from every other miss, or the file is refused."""
    if answer is None:
        ACTIVE_FAILS.append(f"{id}: no derived structure")
        return
    _lint(f"{id} prompt", prompt, 90)
    _lint(f"{id} brief", brief, 110)
    for w, t in (("why", why), ("lookAt", look_at), ("explanation", explanation)):
        _lint(f"{id} {w}", t, 320)
    smi = canon(answer) if stereo else flat(answer)
    if stereo and "@" not in smi:
        ACTIVE_FAILS.append(f"{id}: a stereo item whose answer has no stereocentre")
    inchi = _inchi(smi)
    ACTIVE_NAMES.append((flat(smi), name, id))
    keys = {_grade_key(inchi, stereo): "the answer"}
    out_misses = []
    for mid, msmi, mname, says in misses:
        if msmi is None:
            ACTIVE_FAILS.append(f"{id} miss {mid}: no derived structure")
            continue
        _lint(f"{id} miss {mid} says", says, 220)
        _lint(f"{id} miss {mid} name", mname, 60)
        m_smi = canon(msmi) if stereo else flat(msmi)
        m_inchi = _inchi(m_smi)
        k = _grade_key(m_inchi, stereo)
        if k in keys:
            ACTIVE_FAILS.append(f"{id} miss {mid}: grades the same as {keys[k]}")
            continue
        keys[k] = mid
        out_misses.append({"id": mid, "inchi": m_inchi, "smiles": m_smi, "name": mname, "says": says})
    beat = {
        "kind": "draw", "id": id, "node": node, "conceptIds": [concept], "levels": [2],
        "prompt": prompt, "brief": brief, "visual": visual,
        "answer": {"smiles": smi, "inchi": inchi, "name": name, "figure": figure(smi)},
        "stereo": stereo, "why": why, "lookAt": look_at,
    }
    if out_misses:
        beat["misses"] = out_misses
    entry = {"id": id, "item": {"kind": "draw", "beat": beat}, "explanation": explanation}
    if conditions is not None:
        entry["conditions"] = conditions
    entry["provenance"] = provenance
    entry["placeholder"] = True
    ACTIVE.setdefault(node, []).append({"__at__": at, **entry})


def _finish_mol(rw) -> str | None:
    p = rw.GetMol()
    for a in p.GetAtoms():
        a.SetNoImplicit(False)
        a.SetNumExplicitHs(0)
    try:
        Chem.SanitizeMol(p)
    except Exception:
        return None
    return flat(Chem.MolToSmiles(p))


def saturated(smi: str) -> str | None:
    """Every C=C made single: the drawing of a student who forgot the new C=C."""
    rw = Chem.RWMol(Chem.MolFromSmiles(smi))
    for b in rw.GetBonds():
        if (b.GetBondType() == Chem.BondType.DOUBLE and b.GetBeginAtom().GetSymbol() == "C"
                and b.GetEndAtom().GetSymbol() == "C"):
            b.SetBondType(Chem.BondType.SINGLE)
    return _finish_mol(rw)


def one_ene_saturated(smi: str, keep_atoms_with: str) -> str | None:
    """Of two C=C, saturate the one whose carbons carry `keep_atoms_with` (an
    element on a neighbour); used for the DMAD product drawn with one C=C."""
    m = Chem.MolFromSmiles(smi)
    rw = Chem.RWMol(m)
    hit = 0
    for b in rw.GetBonds():
        if b.GetBondType() != Chem.BondType.DOUBLE:
            continue
        a1, a2 = b.GetBeginAtom(), b.GetEndAtom()
        if a1.GetSymbol() != "C" or a2.GetSymbol() != "C":
            continue
        def carries(a):
            return any(n.GetSymbol() == "C" and any(x.GetSymbol() == keep_atoms_with for x in n.GetNeighbors())
                       for n in a.GetNeighbors() if not n.IsInRing())
        if carries(a1) and carries(a2):
            b.SetBondType(Chem.BondType.SINGLE)
            hit += 1
    return _finish_mol(rw) if hit == 1 else None


def ring_ene_moves(smi: str) -> list[str]:
    """The ring C=C moved to every other ring C-C bond that can carry it: the
    'right ring, C=C in the wrong place' drawings."""
    m = Chem.MolFromSmiles(smi)
    ring_db = [b for b in m.GetBonds() if b.GetBondType() == Chem.BondType.DOUBLE and b.IsInRing()
               and b.GetBeginAtom().GetSymbol() == "C" and b.GetEndAtom().GetSymbol() == "C"]
    if len(ring_db) != 1:
        return []
    db = ring_db[0]
    out = set()
    for b in m.GetBonds():
        if b.GetIdx() == db.GetIdx() or not b.IsInRing() or b.GetBondType() != Chem.BondType.SINGLE:
            continue
        a1, a2 = b.GetBeginAtom(), b.GetEndAtom()
        if a1.GetSymbol() != "C" or a2.GetSymbol() != "C":
            continue
        others = [x for x in list(a1.GetBonds()) + list(a2.GetBonds())
                  if x.GetIdx() != db.GetIdx() and x.GetBondType() == Chem.BondType.DOUBLE]
        if others:
            continue
        rw = Chem.RWMol(m)
        rw.GetBondWithIdx(db.GetIdx()).SetBondType(Chem.BondType.SINGLE)
        rw.GetBondWithIdx(b.GetIdx()).SetBondType(Chem.BondType.DOUBLE)
        got = _finish_mol(rw)
        if got is not None and got != flat(smi):
            out.add(got)
    return sorted(out)


def vinyl_bromides(alkene: str) -> list[str]:
    """Br on a carbon OF the C=C, the classic NBS mistake: every such constitution."""
    m = Chem.MolFromSmiles(alkene)
    out = set()
    for b in m.GetBonds():
        if b.GetBondType() != Chem.BondType.DOUBLE:
            continue
        for a in (b.GetBeginAtom(), b.GetEndAtom()):
            if a.GetTotalNumHs() == 0:
                continue
            rw = Chem.RWMol(m)
            br = rw.AddAtom(Chem.Atom(35))
            rw.AddBond(a.GetIdx(), br, Chem.BondType.SINGLE)
            got = _finish_mol(rw)
            if got is not None:
                out.add(got)
    return sorted(out)


def non_allylic_bromides(alkene: str) -> list[str]:
    """Br on an sp3 carbon with no C=C carbon beside it: the 'Br too far from
    the C=C' drawing (round 4, the critic drew it on cyclohexene and got only
    a generic hint). Every such constitution."""
    m = Chem.MolFromSmiles(alkene)
    ene = {a.GetIdx() for b in m.GetBonds() if b.GetBondType() == Chem.BondType.DOUBLE for a in (b.GetBeginAtom(), b.GetEndAtom())}
    out = set()
    for a in m.GetAtoms():
        if a.GetSymbol() != "C" or a.GetIdx() in ene or a.GetTotalNumHs() == 0:
            continue
        if any(n.GetIdx() in ene for n in a.GetNeighbors()):
            continue  # allylic: that is the answer's carbon, not this miss
        rw = Chem.RWMol(m)
        br = rw.AddAtom(Chem.Atom(35))
        rw.AddBond(a.GetIdx(), br, Chem.BondType.SINGLE)
        got = _finish_mol(rw)
        if got is not None:
            out.add(got)
    return sorted(out)


def br2_adduct(alkene: str) -> str | None:
    """Br2 added across the (single) C=C: what a bottle of Br2 would give."""
    m = Chem.MolFromSmiles(alkene)
    dbs = [b for b in m.GetBonds() if b.GetBondType() == Chem.BondType.DOUBLE]
    if len(dbs) != 1:
        return None
    rw = Chem.RWMol(m)
    rw.GetBondWithIdx(dbs[0].GetIdx()).SetBondType(Chem.BondType.SINGLE)
    for a in (dbs[0].GetBeginAtomIdx(), dbs[0].GetEndAtomIdx()):
        br = rw.AddAtom(Chem.Atom(35))
        rw.AddBond(a, br, Chem.BondType.SINGLE)
    return _finish_mol(rw)


HETERO_DA_CN = AllChem.ReactionFromSmarts(
    "[C:1]=[C:2]-[C:3]=[C:4].[C:5]#[N:6]>>[C:1]1-[C:2]=[C:3]-[C:4]-[N:6]=[C:5]-1"
)


def nitrile_as_dienophile(diene: str, phile: str) -> str | None:
    """The ring a student draws when the C#N, not the C=C, closes it."""
    got = set()
    for ps in HETERO_DA_CN.RunReactants((Chem.MolFromSmiles(diene), Chem.MolFromSmiles(phile))):
        p = ps[0]
        try:
            Chem.SanitizeMol(p)
        except Exception:
            continue
        got.add(flat(Chem.MolToSmiles(p)))
    return sorted(got)[0] if len(got) == 1 else None


def conjugated_moves(diene: str) -> tuple[list[str], list[str]]:
    """Move one C=C of an isolated diene by one bond. Returns (conjugated
    results, cumulated results): the answer set and the allene trap."""
    m = Chem.MolFromSmiles(diene)
    conj, cumu = set(), set()
    for db in m.GetBonds():
        if db.GetBondType() != Chem.BondType.DOUBLE:
            continue
        for end, other in ((db.GetBeginAtom(), db.GetEndAtom()), (db.GetEndAtom(), db.GetBeginAtom())):
            for n in other.GetNeighbors():
                if n.GetIdx() == end.GetIdx():
                    continue
                single = m.GetBondBetweenAtoms(other.GetIdx(), n.GetIdx())
                if single.GetBondType() != Chem.BondType.SINGLE or n.GetTotalNumHs() == 0:
                    continue
                rw = Chem.RWMol(m)
                rw.GetBondWithIdx(db.GetIdx()).SetBondType(Chem.BondType.SINGLE)
                rw.GetBondBetweenAtoms(other.GetIdx(), n.GetIdx()).SetBondType(Chem.BondType.DOUBLE)
                got = _finish_mol(rw)
                if got is None:
                    continue
                p = Chem.MolFromSmiles(got)
                doubles = [b for b in p.GetBonds() if b.GetBondType() == Chem.BondType.DOUBLE]
                shared = any(len({b1.GetBeginAtomIdx(), b1.GetEndAtomIdx()} & {b2.GetBeginAtomIdx(), b2.GetEndAtomIdx()}) == 1
                             for i, b1 in enumerate(doubles) for b2 in doubles[i + 1:])
                if shared:
                    cumu.add(got)
                elif any(p.GetBondBetweenAtoms(b1.GetEndAtomIdx(), b2.GetBeginAtomIdx()) is not None
                         or p.GetBondBetweenAtoms(b1.GetBeginAtomIdx(), b2.GetEndAtomIdx()) is not None
                         or p.GetBondBetweenAtoms(b1.GetBeginAtomIdx(), b2.GetBeginAtomIdx()) is not None
                         or p.GetBondBetweenAtoms(b1.GetEndAtomIdx(), b2.GetEndAtomIdx()) is not None
                         for i, b1 in enumerate(doubles) for b2 in doubles[i + 1:]):
                    conj.add(got)
    return sorted(conj), sorted(cumu)


def active_match(node, id, prompt, brief, concept, pairs, explanation, provenance):
    _lint(f"{id} prompt", prompt, 90)
    _lint(f"{id} brief", brief, 110)
    """`pairs` are (id, left text, right text, why, left SMILES, hint). The left
    card is DRAWN from its SMILES (owner rule: structures, not names alone), and
    the hint is the chemistry nudge a wrong pairing shows (round 2)."""
    rights = [p[2] for p in pairs]
    if len(set(rights)) != len(rights):
        ACTIVE_FAILS.append(f"{id}: two pairs share a right card, so the board has two answers")
    lefts_lower = " ".join(p[1].lower() for p in pairs)
    for pid, left, right, why, smi, hint in pairs:
        for side in (left, right):
            if len(side) > 34:
                ACTIVE_FAILS.append(f"{id} {pid}: card over 34 characters: {side}")
        _lint(f"{id} {pid} why", why, 320)
        _lint(f"{id} {pid} hint", hint, 160)
    beat = {
        "kind": "match", "id": id, "node": node, "conceptIds": [concept], "levels": [1, 2],
        "prompt": prompt, "brief": brief, "presentation": "columns",
        "pairs": [{"id": p, "left": l, "right": r, "why": w, "leftFigure": card_figure(smi), "hint": h}
                  for p, l, r, w, smi, h in pairs],
    }
    ACTIVE.setdefault(node, []).append({"__match__": True, "__at__": None, "beat": beat, "explanation": explanation, "provenance": provenance})


def active_section(facts: dict) -> None:
    say("== 8. Active items (draw it, match boards) ==")
    nbs, da, conf = facts["nbs"], facts["da"], facts["conformations"]
    P_NBS = "scripts/u1_pools_cd.py section 1 (NBS products by allylic class) and section 8; name checked with OPSIN."
    P_DA = "scripts/u1_pools_cd.py section 3 (Diels-Alder reaction SMARTS) and section 8; name checked with OPSIN."
    P_RETRO = "scripts/u1_pools_cd.py section 6 (retro Diels-Alder: one diene and dienophile pair only) and section 8; name checked with OPSIN."
    P_CONF = "scripts/u1_pools_cd.py section 4 (C=C-C=C dihedral, ring-locked or MMFF s-cis strain) and section 8."

    def one(products: list[str]) -> str | None:
        return products[0] if len(products) == 1 else None

    # ROUND 2 (2026-10-17): briefs no longer state the deciding rule (the
    # regiochemistry, which bond reacts, where the C=C goes). That rule moved
    # to lookAt, which only shows after a first miss. Each item names the wrong
    # structures a student is likely to draw (misses), built below from the
    # same derivations as the answer.

    # --- NBS ---------------------------------------------------------------
    def nbs_misses(alkene: str) -> list:
        vin = vinyl_bromides(alkene)
        out = [(f"vinyl{i}", v, "a Br on the C=C", "That H sits on a C=C carbon. NBS takes the H whose radical can share its odd electron with the C=C, which is never one on the double bond itself.")
               for i, v in enumerate(vin)]
        out += [(f"far{i}", f, "a Br too far from the C=C", "That carbon has no C=C beside it, so the radical left there cannot share its odd electron with the pi bond. NBS takes the H whose radical can.")
                for i, f in enumerate(non_allylic_bromides(alkene))]
        out.append(("br2", br2_adduct(alkene), "the Br2 addition product",
                    "That is what a bottle of Br2 does to the C=C. NBS keeps Br2 so scarce that the C=C survives and a C-H reacts instead."))
        return out

    active_draw(
        "u1-nbs", "u1-cd-nbs-draw-cyclohexene",
        "Cyclohexene, NBS, light. Draw the product.",
        "Decide which C-H breaks first.",
        _scheme(card_figure(MOL["cyclohexene"]), "cyclohexene", "NBS", "hν, CCl_4"),
        one(nbs["cyclohexene"]["products"]), "3-bromocyclohexene",
        "Br replaces an H on the carbon next to the C=C. The allylic radical's two ends are equivalent in the ring, so one product forms.",
        "Br replaces an H on a carbon right beside the C=C, and the C=C stays where it was in the ring.",
        "NBS swaps an allylic H for Br and leaves the C=C in place.",
        P_NBS, "resonance_delocalisation", conditions="NBS, light, CCl4; low Br2 so the C=C is not attacked",
        misses=nbs_misses(MOL["cyclohexene"]),
    )
    active_draw(
        "u1-nbs-practice", "u1-cd-nbs-draw-cyclopentene",
        "Cyclopentene, NBS, light. Draw the product.",
        "Same reagent as before, in a five-membered ring.",
        _scheme(card_figure(MOL["cyclopentene"]), "cyclopentene", "NBS", "hν, CCl_4"),
        one(nbs["cyclopentene"]["products"]), "3-bromocyclopentene",
        "The allylic radical's two ends are equivalent in the ring, so Br on either one gives 3-bromocyclopentene.",
        "Put Br on a carbon next to the C=C and keep the double bond where it was.",
        "NBS brominates the allylic carbon. Symmetric ends give one product.",
        P_NBS, "resonance_delocalisation", conditions="NBS, light, CCl4", at=2,
        misses=nbs_misses(MOL["cyclopentene"]),
    )
    active_draw(
        "u1-quiz-c", "u1-cd-qc-draw-isobutylene",
        "2-Methylpropene, NBS, light. Draw the product.",
        "Draw the radical first, then both places the Br could land.",
        _scheme(card_figure(MOL["isobutylene"]), "2-methylpropene", "NBS", "hν, CCl_4"),
        one(nbs["isobutylene"]["products"]), "3-bromo-2-methylprop-1-ene",
        "Both ends of the radical are CH2 groups on the same carbon, so the direct and shifted products are one molecule.",
        "Br goes on a CH3 carbon, and one C=C stays. Shifting the double bond gives the same drawing.",
        "Equivalent radical ends give one NBS product.",
        P_NBS, "resonance_delocalisation", conditions="NBS, light, CCl4", at=2,
        misses=nbs_misses(MOL["isobutylene"]),
    )

    # --- Diels-Alder forward -------------------------------------------------
    def pair(a: str, a_name: str, b: str, b_name: str) -> dict:
        """Diene and dienophile side by side, each drawn full size (a combo tile was too small to read)."""
        return {"kind": "pair", "a": {"figure": card_figure(MOL[a]), "name": a_name}, "b": {"figure": card_figure(MOL[b]), "name": b_name}}

    NO_ENE = ("The diene's old middle bond becomes a C=C in the new ring. Every Diels-Alder product made from an alkene keeps exactly one.")
    MOVED_ENE = ("The new C=C sits where the diene's single bond was, between its old C2 and C3, not next to a carbon that just made a new bond.")

    def da_misses(answer: str | None) -> list:
        if answer is None:
            return []
        out = [("no-ene", saturated(answer), "a ring with no C=C", NO_ENE)]
        out += [(f"moved{i}", s, "a ring with its C=C moved", MOVED_ENE) for i, s in enumerate(ring_ene_moves(answer))]
        return out

    acro = one(da["butadiene+acrolein"])
    active_draw(
        "u1-da", "u1-cd-da-draw-acrolein",
        "Butadiene and propenal, heat. Draw the Diels-Alder product.",
        "Find which carbon of each partner makes a new bond before you draw.",
        pair("butadiene", "buta-1,3-diene", "acrolein", "propenal"),
        acro, "cyclohex-3-ene-1-carbaldehyde",
        "The diene's ends bond to the two alkene carbons of propenal, closing a six-membered ring. The leftover C=C sits between the old C2 and C3, and the CHO rides along on the ring.",
        "New bonds at C1 and C4 of the diene, new C=C at C2-C3. Draw the six-membered ring, then put its one C=C across from the carbon that carries the CHO.",
        "Diels-Alder: two new sigma bonds, one ring, the new C=C where the diene's single bond was.",
        P_DA, "diels_alder_geometry", conditions="heat", misses=da_misses(acro),
    )
    norb = one(da["cyclopentadiene+ethene"])
    active_draw(
        "u1-dienes", "u1-cd-dienes-draw-norbornene",
        "Cyclopentadiene and ethene, heat. Draw the product.",
        "No wedges needed. Keep track of every carbon in the five-membered ring.",
        pair("cyclopentadiene", "cyclopentadiene", "ethene", "ethene"),
        norb, "bicyclo[2.2.1]hept-2-ene",
        "Cyclopentadiene's ends bond to the two ethene carbons. Its CH2 was between those ends, so it ends up as a one-carbon bridge over the new six-membered ring: a bridged bicycle.",
        "The CH2 of the five-membered ring becomes a bridge. Draw the new six-membered ring with its C=C, then join the two carbons that made new bonds with that one CH2.",
        "A cyclic diene gives a bridged product: the ring atoms between the diene's ends become the bridge.",
        P_DA, "diels_alder_geometry", conditions="heat",
        misses=[("no-ene", saturated(norb) if norb else None, "a bicycle with no C=C", NO_ENE)],
    )
    acn = one(da["butadiene+acrylonitrile"])
    active_draw(
        "u1-dienophiles", "u1-cd-phile-draw-acrylonitrile",
        "Butadiene and acrylonitrile, heat. Draw the product.",
        "Acrylonitrile has two pi systems. Decide which one is the dienophile.",
        pair("butadiene", "buta-1,3-diene", "acrylonitrile", "acrylonitrile"),
        acn, "cyclohex-3-ene-1-carbonitrile",
        "The C=C of acrylonitrile is the dienophile; the C≡N only pulls electrons out of it. The product is a cyclohexene with CN on the carbon that was the CH of acrylonitrile.",
        "Only the C=C of acrylonitrile reacts; the C≡N stays a substituent. Close the ring with the C=C.",
        "The withdrawing group activates the dienophile and ends up as a substituent on the new ring.",
        P_DA, "ewg_edg_rubric", conditions="heat",
        misses=[("cn-ring", nitrile_as_dienophile(MOL["butadiene"], MOL["acrylonitrile"]), "the ring closed through the C≡N",
                 "That ring used the C≡N as the dienophile. The nitrile only pulls electrons out of the C=C next to it, which is the bond that reacts.")]
        + da_misses(acn),
    )

    def other_regio(key: str) -> str | None:
        rows = da["regio"][key]["all"]
        others = [fl for _, fl, rel in rows if fl != da["regio"][key]["major"]]
        return others[0] if len(others) == 1 else None

    reg = da["regio"]["isoprene+acrolein"]
    active_draw(
        "u1-da-predict", "u1-cd-pred-draw-para",
        "Isoprene and propenal, heat. Draw the major product.",
        "The two can line up two ways. Decide which way wins before you draw.",
        pair("isoprene", "isoprene", "acrolein", "propenal"),
        reg["major"] if reg["relation"] == "para" else None, "4-methylcyclohex-3-ene-1-carbaldehyde",
        "The diene's largest HOMO coefficient bonds to the dienophile's largest LUMO coefficient. For isoprene and propenal that puts CH3 and CHO 1,4 on the ring: the para product.",
        "A 2-substituted diene gives the para product. Draw the cyclohexene, put CH3 on the ring C=C, and CHO three carbons away, across the ring.",
        "2-Substituted dienes give the para (1,4) product.",
        "scripts/u1_pools_cd.py section 3 (Huckel frontier coefficients pick the pairing, para read off the product) and section 8; name checked with OPSIN.",
        "ewg_edg_rubric", conditions="heat", at=2,
        misses=[("meta", other_regio("isoprene+acrolein"), "the meta product",
                 "Right ring, wrong alignment: CH3 and CHO end up 1,3. Line up the diene's most electron-rich end with the dienophile's most electron-poor carbon.")],
    )
    target = "CC1=C(C)CC(C=O)CC1"
    pairs = retro(target)
    diene = pairs[0][0] if len(pairs) == 1 else None
    phile = pairs[0][1] if len(pairs) == 1 else None
    # CHANGED round 2 (owner flag from the critic): the round 1 brief said "cut
    # the two bonds across from it", which names the old dienophile bond, the
    # one bond that is NOT cut. The bonds that formed are one carbon away from
    # the ring C=C on each side. The retro template (section 6) already cuts
    # those; only the words were wrong.
    active_draw(
        "u1-da-predict", "u1-cd-pred-draw-diene",
        "Work backward. Draw the diene that made this product.",
        "Start from the ring C=C and run the reaction in reverse.",
        {"kind": "structure", "figure": figure(target), "name": "3,4-dimethylcyclohex-3-ene-1-carbaldehyde"},
        diene, "2,3-dimethylbuta-1,3-diene",
        "The ring C=C was C2-C3 of the diene. The two sigma bonds that formed sit one carbon away from it on each side; cutting them gives back propenal and 2,3-dimethylbutadiene, whose methyls sat on C2 and C3.",
        "Find the ring C=C. The diene is the four carbons starting one carbon either side of it, with a C=C at each end.",
        "Retro Diels-Alder: the ring C=C marks the diene's old C2-C3 bond.",
        P_RETRO, "diels_alder_geometry", conditions="heat", at=6,
        misses=[("phile", phile, "the dienophile half",
                 "That is the two-carbon piece that carried the CHO. The question asks for the four-carbon piece.")],
    )
    dmad = one(da["butadiene+dmad"])
    active_draw(
        "u1-quiz-d", "u1-cd-qd-draw-dmad",
        "Butadiene and DMAD, heat. Draw the product.",
        "DMAD is an alkyne. Count the pi bonds it has before and after.",
        pair("butadiene", "buta-1,3-diene", "dmad", "DMAD"),
        dmad, "dimethyl cyclohexa-1,4-diene-1,2-dicarboxylate",
        "The triple bond uses one pi bond to form the ring and keeps the other, so the product has two C=C: one from the diene's old C2-C3 and one carrying both esters.",
        "An alkyne dienophile leaves a second C=C in the ring. Close the six-membered ring, then put a C=C between the two ester carbons as well as across from them.",
        "An alkyne dienophile gives a cyclohexa-1,4-diene.",
        P_DA, "diels_alder_geometry", conditions="heat", at=2,
        misses=[("one-ene", one_ene_saturated(dmad, "O") if dmad else None, "the product of an alkene dienophile",
                 "That is what an alkene would give. A triple bond has two pi bonds and spends only one making the ring.")],
    )

    # --- Produce items added in round 2 so every Unit 1 node draws -------------
    conj, cumu = conjugated_moves(MOL["penta14diene"])
    active_draw(
        "u1-mo", "u1-cd-mo-draw-conjugated",
        "Move one C=C of penta-1,4-diene so the pi system is conjugated. Draw it.",
        "Keep all five carbons in one chain and keep two C=C.",
        {"kind": "structure", "figure": card_figure(MOL["penta14diene"]), "name": "penta-1,4-diene"},
        conj[0] if len(conj) == 1 else None, "penta-1,3-diene",
        "Conjugated means the two C=C are joined by one single bond, so their four p orbitals line up into one pi system. In penta-1,3-diene they share C2-C3.",
        "Slide the C4=C5 bond to C3=C4. Now only the C2-C3 single bond separates the two C=C.",
        "Two C=C joined by exactly one single bond form one conjugated pi system.",
        "scripts/u1_pools_cd.py section 8 (every one-bond move of a C=C enumerated; conjugated and cumulated results told apart by RDKit); name checked with OPSIN.",
        "resonance_delocalisation", at=2,
        misses=[("start", MOL["penta14diene"], "the starting diene",
                 "Its two C=C are still separated by a CH2, so their p orbitals cannot overlap.")]
        + [(f"allene{i}", c, "an allene",
            "Those two C=C share a carbon. Cumulated pi bonds sit at right angles, so they do not form one pi system.")
           for i, c in enumerate(cumu)],
    )
    mvk = da["regio"]["isoprene+mvk"]
    active_draw(
        "u1-exam", "u1-cd-exam-draw-mvk",
        "Isoprene and methyl vinyl ketone, heat. Draw the major product.",
        "Two alignments are possible. Pick the major one before you draw.",
        pair("isoprene", "isoprene", "mvk", "methyl vinyl ketone"),
        mvk["major"] if mvk["relation"] == "para" else None, "1-(4-methylcyclohex-3-en-1-yl)ethan-1-one",
        "Isoprene's largest HOMO coefficient is on C1, next to the methyl-bearing carbon; methyl vinyl ketone's largest LUMO coefficient is on its CH2 end. Bonding those two puts CH3 and the acetyl group 1,4: the para product.",
        "A 2-substituted diene gives the para product: draw the cyclohexene, CH3 on the ring C=C, and the C(=O)CH3 three carbons away, across the ring.",
        "2-Substituted dienes give the para (1,4) product.",
        "scripts/u1_pools_cd.py section 3 (Huckel frontier coefficients pick the pairing, para read off the product) and section 8; name checked with OPSIN.",
        "ewg_edg_rubric", conditions="heat",
        misses=[("meta", other_regio("isoprene+mvk"), "the meta product",
                 "Right ring, wrong alignment: CH3 and the acetyl end up 1,3. Pair the diene's biggest HOMO lobe with the dienophile's biggest LUMO lobe.")]
        + da_misses(mvk["major"]),
    )

    # Stereo items: graded on relative stereo (grade.ts relativeStereo). The
    # cis and trans diesters are section 5's derived isomers.
    st = facts["stereo"]["diester"]
    cis = [r["smiles"] for r in st if r["relation"] == "cis"]
    trans = [r["smiles"] for r in st if r["relation"] == "trans"]
    flat_diester = flat(cis[0]) if cis else None
    active_draw(
        "u1-da-stereo", "u1-cd-st-draw-maleate",
        "Butadiene and dimethyl maleate, heat. Draw the product with wedges.",
        "Use the wedge tool on the bond to each ester.",
        pair("butadiene", "buta-1,3-diene", "dimethylmaleate", "dimethyl maleate"),
        cis[0] if len(cis) == 1 else None, "cis-dimethyl cyclohex-4-ene-1,2-dicarboxylate",
        "The Diels-Alder is one concerted step, so the dienophile's geometry survives. Maleate's esters are cis, so they end up on the same face of the new ring: both wedged, or both dashed.",
        "Cis stays cis. Draw both esters on wedges, the same face of the ring.",
        "Groups cis on the dienophile end up cis in the product.",
        "scripts/u1_pools_cd.py section 5 (cis and trans diesters enumerated, faces measured on embedded 3D) and section 8; graded on relative stereo.",
        "diels_alder_geometry", conditions="heat", stereo=True,
        misses=[("trans", trans[0] if trans else None, "the trans diester",
                 "One ester up and one down is what dimethyl fumarate gives. Maleate's esters start on the same side and the one-step reaction keeps them there."),
                ("flat", flat_diester, "the ring with no wedges",
                 "Right atoms. This item is about where the esters point, so put a wedge on each ester bond.")],
    )
    active_draw(
        "u1-da-3d", "u1-cd-3d-draw-fumarate",
        "Butadiene and dimethyl fumarate, heat. Draw the product with wedges.",
        "Use the wedge and dash tools on the bonds to the esters.",
        pair("butadiene", "buta-1,3-diene", "dimethylfumarate", "dimethyl fumarate"),
        trans[0] if len(trans) == 2 else None, "trans-dimethyl cyclohex-4-ene-1,2-dicarboxylate",
        "Fumarate's esters are trans, and the concerted reaction keeps them trans: one on a wedge, one on a dash. It forms as a racemic pair, so either mirror image is right.",
        "Trans stays trans. Put one ester on a wedge and the other on a dash.",
        "Groups trans on the dienophile end up trans in the product.",
        "scripts/u1_pools_cd.py section 5 (cis and trans diesters enumerated, faces measured on embedded 3D) and section 8; graded on relative stereo.",
        "diels_alder_geometry", conditions="heat", at=2, stereo=True,
        misses=[("cis", cis[0] if cis else None, "the cis diester",
                 "Both esters on the same face is what dimethyl maleate gives. Fumarate's esters start on opposite sides and stay there."),
                ("flat", flat_diester, "the ring with no wedges",
                 "Right atoms. This item is about where the esters point, so put a wedge on one ester bond and a dash on the other.")],
    )

    # --- Match: diene shapes ---------------------------------------------------
    shape_text = {
        "locked s-cis": "Locked s-cis: fast",
        "free, reaches s-cis": "Free: rotates into s-cis",
        "free, s-cis strained": "Free, but s-cis is strained",
        "locked s-trans": "Locked s-trans: no reaction",
    }
    calls = {
        "chd": ("Cyclohexa-1,3-diene", conf["cyclohexa13diene"]["call"]),
        "ee": ("(2E,4E)-Hexa-2,4-diene", conf["hexadieneEE"]["call"]),
        "zz": ("(2Z,4Z)-Hexa-2,4-diene", conf["hexadieneZZ"]["call"]),
        "mch": ("3-Methylenecyclohexene", conf["methylenecyclohexene3"]["call"]),
    }
    shape_smiles = {"chd": MOL["cyclohexa13diene"], "ee": MOL["hexadieneEE"], "zz": MOL.get("hexadieneZZ", r"C/C=C\C=C/C"),  # the SMILES section 4 measured
                    "mch": MOL["methylenecyclohexene3"]}
    shape_hints = {
        "chd": "Both C=C sit inside one ring. Check whether the bond between them can turn.",
        "ee": "The middle bond can turn. Turn it to s-cis and look where the two end methyls point.",
        "zz": "Turn the middle bond to s-cis and look where the two inner methyls end up.",
        "mch": "One C=C is in the ring and one sticks out of it. Check whether the bond between them can turn.",
    }
    whys = {
        "locked s-cis": "The ring holds both C=C on the same side of the central bond, so the diene is always ready.",
        "free, reaches s-cis": "The central bond rotates, and turning to s-cis costs little strain, so it reacts once it turns.",
        "free, s-cis strained": "It can rotate, but in s-cis the two inner methyls clash, so it rarely spends time there.",
        "locked s-trans": "The ring holds the two C=C on opposite sides of the central bond. The ends can never reach a dienophile together.",
    }
    say("diene shapes " + json.dumps({k: v[1] for k, v in calls.items()}))
    if len({c for _, c in calls.values()}) != 4 or any(c not in shape_text for _, c in calls.values()):
        ACTIVE_FAILS.append(f"diene shape board: calls are not four distinct known shapes: {calls}")
    else:
        active_match(
            "u1-dienes", "u1-cd-dienes-shape-match",
            "Match each diene to its shape.",
            "Shape first: can the two ends reach a dienophile at the same time.",
            "diels_alder_geometry",
            [(k, name, shape_text[call], whys[call], shape_smiles[k], shape_hints[k]) for k, (name, call) in calls.items()],
            "Locked s-cis is fastest, free rotation is fine, strained s-cis is slow, and locked s-trans does not react.",
            P_CONF,
        )

    # --- Match: products to the pair that made them ----------------------
    # CHANGED round 3 (critic): the old board matched each dienophile to a rank
    # slot ("Fastest: lowest LUMO", "Second" ...), which is a ladder dressed as
    # a match. Now each left card is a DRAWN Diels-Alder product, labelled only
    # "Product A" to "Product D", and the right cards name the diene and the
    # dienophile. Three products share butadiene and two share ethene,
    # so a card is solved only by reading both halves of the drawing: the
    # ring's C=C (the diene's middle) and the groups on the sp3 carbons (the
    # dienophile). Acrylonitrile is left off on purpose: this lesson's draw
    # item asks for the butadiene + acrylonitrile product, and the board would
    # show it first. Every product comes from the DA reaction SMARTS above and
    # the script refuses to write the board unless each pair gives exactly one
    # constitution and the four products are all different.
    pair_specs = [
        ("bd_eth", "Product A", "butadiene", "ethene", "Butadiene + ethene",
         "A bare ring with one C=C and no groups anywhere, so neither partner brought one: butadiene and ethene.",
         "This ring carries no groups at all, not even on its C=C. Find the pair where neither partner brings one."),
        ("bd_ma", "Product B", "butadiene", "maleicanhydride", "Butadiene + maleic anhydride",
         "The anhydride ring is still there, fused to the new ring. Maleic anhydride's C=C became the bond the two rings share.",
         "Two rings share one bond here. Look for the dienophile that brings a ring of its own."),
        ("bd_mvk", "Product C", "butadiene", "mvk", "Butadiene + methyl vinyl ketone",
         "An acetyl group (a C=O with a methyl) sits on an sp3 ring carbon, where methyl vinyl ketone's C=C was. The bare ring C=C says butadiene.",
         "The group on the ring holds a C=O with a methyl on it, and the ring's C=C is bare. Read both halves."),
        ("dmb_eth", "Product D", "dimethylbutadiene", "ethene", "Dimethylbutadiene + ethene",
         "The two methyls sit on the new ring's C=C, the diene's old middle carbons, so the diene was 2,3-dimethylbutadiene. Nothing sits on the sp3 carbons, so the dienophile was bare ethene.",
         "Look at the ring's C=C: it carries two methyls. Those came from the diene, not the dienophile."),
    ]
    made = {}
    for pid, _, diene, phile, _, _, _ in pair_specs:
        prods = da_products(MOL[diene], MOL[phile])
        if len(prods) != 1:
            ACTIVE_FAILS.append(f"product match board: {diene} + {phile} gives {len(prods)} constitutions, not one")
            continue
        made[pid] = next(iter(prods.values()))[0]
    say("product match board " + json.dumps(made))
    if len(made) != len(pair_specs) or len({flat(v) for v in made.values()}) != len(made):
        ACTIVE_FAILS.append(f"product match board: products missing or not all different: {made}")
    else:
        active_match(
            "u1-dienophiles", "u1-cd-phile-match",
            "Match each product to the diene and dienophile that made it.",
            "Find the ring's one C=C first. Then read what sits on the carbons beside it.",
            "ewg_edg_rubric",
            [(pid, label, right, why, made[pid], hint) for pid, label, _, _, right, why, hint in pair_specs],
            "In every Diels-Alder product the diene's middle carbons become the new ring's C=C, and the dienophile's groups sit on the sp3 carbons across the ring from it.",
            P_DA,
        )

    # Every product name is parsed back by OPSIN and must be the drawn molecule.
    from py2opsin import py2opsin
    parsed = py2opsin([n for _, n, _ in ACTIVE_NAMES])
    for (smi, name, where), got in zip(ACTIVE_NAMES, parsed):
        if not got or flat(got) != flat(smi):
            ACTIVE_FAILS.append(f"{where}: OPSIN reads '{name}' as {got or 'nothing'}, the answer is {smi}")
    for node, items in ACTIVE.items():
        say(f"{node}: " + ", ".join(i["beat"]["id"] if i.get("__match__") else i["id"] for i in items))
    say()


ACTIVE_HEADER = '''/**
 * Unit 1, stages C and D: the ACTIVE items, "Draw it" and match boards (U1-P3).
 * GENERATED by scripts/u1_pools_cd.py section 8. Do not edit by hand: edit the
 * specs in the script and rerun it.
 *
 * Every entry is a draft (`placeholder: true`) until the owner signs it off.
 * Every structure to draw is the script's own derived product (Diels-Alder
 * reaction SMARTS, NBS allylic classes, retro template, Huckel frontier
 * coefficients), its name parsed back by OPSIN, and its InChI computed by RDKit
 * for the browser's grader (beats/draw/grade.ts). Match boards carry calls the
 * script derived (diene conformation, Huckel LUMO order).
 *
 * These entries JOIN the stage C/D pools in ./index.ts (appendPools): each
 * `at` is where the entry goes in its node's pool (an in-a-row run plays the
 * pool in order), and a missing `at` appends it.
 */
import { buildMatchBoard } from "../../beats/match/spec";
import type { MatchBeat } from "../../beats/types";
import type { PoolEntry } from "./types";

/** An entry and where it joins its node's pool. */
export interface ActiveEntry {
  readonly at?: number;
  readonly entry: PoolEntry;
}

function match(spec: { readonly beat: MatchBeat; readonly explanation: string; readonly provenance: string }): PoolEntry {
  return {
    id: spec.beat.id,
    item: { kind: "match", board: buildMatchBoard(spec.beat, 1) },
    explanation: spec.explanation,
    provenance: spec.provenance,
    placeholder: true,
  };
}
'''


def write_active() -> None:
    out = [ACTIVE_HEADER, "export const STAGE_CD_ACTIVE: Readonly<Record<string, readonly ActiveEntry[]>> = {"]
    for node, items in ACTIVE.items():
        out.append(f"  {json.dumps(node)}: [")
        for i in items:
            at = i["__at__"]
            if i.get("__match__"):
                spec = {"beat": i["beat"], "explanation": i["explanation"], "provenance": i["provenance"]}
                body = "match(" + json.dumps(spec, ensure_ascii=False, indent=2).replace("\n", "\n    ") + ")"
            else:
                e = {k: v for k, v in i.items() if not k.startswith("__")}
                body = json.dumps(e, ensure_ascii=False, indent=2).replace("\n", "\n    ")
            prefix = "{ " + (f"at: {at}, " if at is not None else "") + "entry: "
            out.append("    " + prefix + body + " },")
        out.append("  ],")
    out.append("};\n")
    text = "\n".join(out)
    if EM in text:
        ACTIVE_FAILS.append("an em dash reached stage-cd.active.ts")
        return
    ACTIVE_OUT.write_text(text, encoding="utf-8", newline="\n")
    say(f"wrote {ACTIVE_OUT.relative_to(ROOT)}")


def main() -> int:
    try:
        return run()
    finally:
        print("\n".join(REPORT))


def run() -> int:
    facts = {
        "nbs": nbs_section(),
        "mo": mo_section(),
        "da": da_section(),
        "conformations": conformation_section(),
        "stereo": stereo_section(),
        "retro": retro_section(),
    }
    retro_options_section()
    stereo_figs = stereo_figures(facts["stereo"])
    figs = figures_section(facts["mo"], stereo_figs)
    write_figures(figs)
    say(f"wrote {len(figs)} figures to {FIG_OUT.relative_to(ROOT)}")
    active_section(facts)
    if ACTIVE_FAILS:
        say("REFUSED stage-cd.active.ts. Nothing written:")
        for f in ACTIVE_FAILS:
            say("  " + f)
        return 1
    write_active()
    print("\n".join(REPORT))
    return 0


if __name__ == "__main__":
    sys.exit(main())
