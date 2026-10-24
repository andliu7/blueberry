"""
Unit 2 (aromaticity) problem pools, a DRAFT, derived with RDKit.

Run:     python scripts/u2_pools.py
Writes:  src/game/content/u2/pools.ts (never edit it by hand: edit the specs
         below and rerun) and scripts/u2_pools_report.md (the owner's
         disagreement report: every place this script's model and RDKit's
         aromaticity flag part ways, and every answer that rests on an authored
         planarity call).

WHY A GENERATOR. The owner's rule is "derive, never assert". Every problem
below states its chemistry as SMILES and its question as copy; the script
works the answer out and refuses to write anything (prints REFUSED) when an
authored key disagrees. Every entry is `placeholder: true`. Only the owner
clears it.

THE MODEL. Check these six rules, not the sixty answers.

1. Huckel counter. Written here, NOT RDKit's aromatic flag, because RDKit's
   model is not the taught one (it has no antiaromatic class and ignores
   geometry). It works on a Kekule structure (Chem.Kekulize with
   clearAromaticFlags), over one ring, or over the whole fused ring system
   when the species says "system" (naphthalene, azulene: the perimeter).
   The ring is cyclic by construction. Each ring atom must offer a p orbital:
     - an atom in a ring pi bond (C=C, C=N inside the ring)    1 electron
       a heteroatom in a ring pi bond keeps its lone pair in an sp2 orbital
       in the ring plane, and the script records that orbital
     - a carbanion with a lone pair and no ring pi bond          2
     - a carbocation with no ring pi bond (an empty p orbital)   0
     - a heteroatom with a lone pair and no ring pi bond         2
       only ONE pair joins, even for O and S; the other pair is recorded as
       sitting in an sp2 orbital in the ring plane
     - anything else (an sp3 CH2, an N with no pair left)        no p orbital
   Planarity cannot be computed honestly from a SMILES, so every species
   carries an authored planar True/False and a reason string. The report
   lists every item where that call decided the answer.
   Classification, as a gate then a verdict:
     a ring atom with no p orbital, or not planar     nonaromatic
     pi = 4n + 2 for a whole number n                  aromatic, n = (pi - 2) / 4
     pi = 4n, planar                                    antiaromatic
   The script reports pi, n (a non whole n is shown as the tell), the class
   and the contribution of every ring atom.

2. Frost circle, a second model that shares nothing with the counter but the
   electron count. For a monocyclic ring of k atoms the pi levels are
   alpha + 2 beta cos(2 pi j / k). Electrons fill from the bottom, one per
   orbital across a degenerate set before pairing. All occupied sets full is
   a closed shell (aromatic); a degenerate pair left half full is
   antiaromatic. The script asserts the two models agree on every monocyclic
   species with a continuous p system and refuses when they do not.

3. RDKit comparison. Chem.MolFromSmiles with default sanitisation sets an
   aromatic flag on ring atoms. Every disagreement with the counter's class is
   written to the report, with the reason RDKit differs. The script does NOT
   pick a winner for the student: the item is built from the counter (the
   taught model), and its provenance says "needs owner ruling". Antiaromatic
   items always land here, because RDKit says only "not aromatic" and cannot
   separate antiaromatic from nonaromatic.
   A sanity fixture block (benzene through azulene, below) holds textbook
   expectations used only to TEST the counter. A mismatch refuses the run; it
   is never patched over.

4. NMR teaching table (u2-nmr). Downfield to upfield:
     H on an aromatic ring carbon, outside the ring   about 6.5 to 8 ppm
     vinylic H (on a C=C carbon, ring not aromatic)   about 4.5 to 6.5 ppm
     alkyl H (sp3 C with no pi or heteroatom next)     about 0.9 to 1.5 ppm
     H pointing INSIDE a large aromatic annulene       below 0 ppm (shielded)
   Each H environment is classified from the molecule using the counter's
   verdict; inner versus outer for [18]annulene comes from an authored list
   with its reason. Every "most deshielded / most shielded / where does it
   show up" answer is read off this table. Unit 6 owns full NMR.

5. Nomenclature (u2-nomen). ortho / meta / para is the ring path distance
   between the two substituent attachment atoms (1, 2, 3 bonds) from
   Chem.GetShortestPath. Every name shown goes through OPSIN (py2opsin) and
   must parse back to the drawn structure, else the run is refused.

6. Acidity on the conjugate base. Only the CLASS of the conjugate base is
   derived (with the counter), and the stated ranking model is
   aromatic > nonaromatic > antiaromatic: the more stable the conjugate base,
   the stronger the acid. No pKa number is typed. A ladder may only hold
   species of different classes, so the model alone decides every step.

CHECKED AGAINST, never adapted (licensed problems are a check only):
  OpenStax Organic Chemistry (CC BY-NC-SA 4.0), chapter 15:
  15.1 Naming Aromatic Compounds; 15.3 Aromaticity and the Huckel 4n + 2 Rule;
  15.4 Aromatic Ions; 15.5 Aromatic Heterocycles: Pyridine and Pyrrole;
  15.7 Spectroscopy of Aromatic Compounds.
  https://openstax.org/books/organic-chemistry/pages/15-3-aromaticity-and-the-huckel-4n-2-rule
"""

from __future__ import annotations

import json
import math
import sys
from pathlib import Path

from rdkit import Chem, RDLogger
from rdkit.Chem import rdDepictor

RDLogger.DisableLog("rdApp.*")
rdDepictor.SetPreferCoordGen(True)

REPO = Path(__file__).resolve().parent.parent
OUT = REPO / "src" / "game" / "content" / "u2" / "pools.ts"
REPORT = REPO / "scripts" / "u2_pools_report.md"

SCRIPT = "scripts/u2_pools.py"
OS_15_1 = "OpenStax Organic Chemistry 15.1 (CC BY-NC-SA), read as a check only"
OS_15_3 = "OpenStax Organic Chemistry 15.3 (CC BY-NC-SA), read as a check only"
OS_15_4 = "OpenStax Organic Chemistry 15.4 (CC BY-NC-SA), read as a check only"
OS_15_5 = "OpenStax Organic Chemistry 15.5 (CC BY-NC-SA), read as a check only"
OS_15_7 = "OpenStax Organic Chemistry 15.7 (CC BY-NC-SA), read as a check only"

FAILURES: list[str] = []


def fail(msg: str) -> None:
    FAILURES.append(msg)


# ---------------------------------------------------------------------------
# Species. (SMILES, planar, planarity reason, scope). The planarity call is
# AUTHORED: it is the one input the script cannot derive, and the report
# lists every answer it decided.
# ---------------------------------------------------------------------------

SPECIES: dict[str, tuple[str, bool, str, str]] = {
    "benzene": ("C1=CC=CC=C1", True, "flat hexagon, 120 degree angles", "ring"),
    "cyclobutadiene": ("C1=CC=C1", True, "taught as a flat square", "ring"),
    "cot": ("C1=CC=CC=CC=C1", False, "tub: a flat octagon needs 135 degree angles, so the ring folds", "ring"),
    "cyclopentadiene": ("C1=CCC=C1", True, "flat ring; it fails on the sp3 CH2 before planarity matters", "ring"),
    "cp_anion": ("[CH-]1C=CC=C1", True, "flat pentagon", "ring"),
    "cp_cation": ("[CH+]1C=CC=C1", True, "taught as a flat pentagon", "ring"),
    "c3_cation": ("[CH+]1C=C1", True, "a triangle is always flat", "ring"),
    "c3_anion": ("[CH-]1C=C1", True, "a triangle is always flat", "ring"),
    "tropylium": ("[CH+]1C=CC=CC=C1", True, "flat heptagon", "ring"),
    "c7_anion": ("[CH-]1C=CC=CC=C1", True, "taught as flat; the real anion may distort to escape antiaromaticity", "ring"),
    "cycloheptatriene": ("C1=CC=CCC=C1", False, "boat; it fails on the sp3 CH2 first anyway", "ring"),
    "pyridine": ("C1=CC=NC=C1", True, "flat hexagon", "ring"),
    "pyrrole": ("C1=CNC=C1", True, "flat pentagon", "ring"),
    "furan": ("C1=COC=C1", True, "flat pentagon", "ring"),
    "thiophene": ("C1=CSC=C1", True, "flat pentagon", "ring"),
    "imidazole": ("C1=CN=CN1", True, "flat pentagon", "ring"),
    "ann18": ("C1=CC=CC=CC=CC=CC=CC=CC=CC=C1", True, "large enough to hold its six inner H without a clash", "ring"),
    "ann10": ("C1=CC=CC=CC=CC=C1", False, "inner H clash: flat [10]annulene puts two inside H atoms on top of each other, so it twists", "ring"),
    "naphthalene": ("C1=CC=C2C=CC=CC2=C1", True, "flat fused rings", "system"),
    "azulene": ("C1=CC2=CC=CC=CC2=C1", True, "flat fused rings", "system"),
    "chd13": ("C1=CCCC=C1", True, "near flat; it fails on the two sp3 CH2 groups first", "ring"),
    "pyrroline": ("C1=CCNC1", True, "fails on the sp3 CH2 groups first", "ring"),
    "pyrrolidine": ("C1CCNC1", False, "envelope; no pi bonds at all", "ring"),
    "dihydrofuran": ("C1=COCC1", True, "fails on the sp3 CH2 groups first", "ring"),
    "dihydropyridine": ("C1=CNC=CC1", True, "fails on the sp3 CH2 first", "ring"),
    "pyridinium": ("C1=CC=[NH+]C=C1", True, "flat hexagon", "ring"),
    "pyrrolidinium": ("C1CC[NH2+]C1", False, "envelope; no pi bonds at all", "ring"),
    "pyrrolium": ("C1=C[NH2+]C=C1", True, "fails on the N with no pair left first", "ring"),
    "cyclopropene": ("C1=CC1", True, "a triangle is always flat", "ring"),
    "c6_anion": ("[CH-]1C=CC=CC1", True, "fails on the sp3 CH2 first", "ring"),
    "c5_ene_cation": ("[CH+]1C=CCC1", True, "fails on the sp3 CH2 groups first", "ring"),
    "cyclohexane": ("C1CCCCC1", False, "chair; no pi bonds at all", "ring"),
    "cyclohexene": ("C1=CCCCC1", False, "half chair; it fails on sp3 carbons first", "ring"),
}

# Textbook expectations, used ONLY to test the counter. Never a source of answers.
FIXTURES: dict[str, str] = {
    "benzene": "aromatic",
    "cyclobutadiene": "antiaromatic",
    "cot": "nonaromatic",
    "cyclopentadiene": "nonaromatic",
    "cp_anion": "aromatic",
    "cp_cation": "antiaromatic",
    "c3_cation": "aromatic",
    "c3_anion": "antiaromatic",
    "tropylium": "aromatic",
    "c7_anion": "antiaromatic",
    "pyridine": "aromatic",
    "pyrrole": "aromatic",
    "furan": "aromatic",
    "thiophene": "aromatic",
    "imidazole": "aromatic",
    "ann18": "aromatic",
    "ann10": "nonaromatic",
    "naphthalene": "aromatic",
    "azulene": "aromatic",
}

OUTER_E = {"C": 4, "N": 5, "O": 6, "S": 6}


def mol(smi: str) -> Chem.Mol:
    m = Chem.MolFromSmiles(smi)
    if m is None:
        raise ValueError(f"RDKit refused SMILES {smi}")
    return m


def canon(smi: str) -> str:
    return Chem.MolToSmiles(mol(smi))


def kekule(smi: str) -> Chem.Mol:
    m = Chem.Mol(mol(smi))
    Chem.Kekulize(m, clearAromaticFlags=True)
    return m


def lone_pairs(a: Chem.Atom) -> int:
    bonded = sum(int(b.GetBondTypeAsDouble()) for b in a.GetBonds()) + a.GetTotalNumHs()
    return (OUTER_E[a.GetSymbol()] - a.GetFormalCharge() - bonded) // 2


def ring_atoms(m: Chem.Mol, scope: str) -> list[int]:
    rings = [set(r) for r in m.GetRingInfo().AtomRings()]
    if scope == "ring":
        if len(rings) != 1:
            raise ValueError("scope 'ring' needs exactly one ring")
        return sorted(rings[0])
    return sorted(set().union(*rings))


def frost(k: int, pi: int) -> dict:
    """Frost circle levels for a k ring, filled with pi electrons."""
    levels = sorted(((round(math.cos(2 * math.pi * j / k), 6), j) for j in range(k)), key=lambda t: -t[0])
    groups: list[tuple[float, list[int]]] = []
    for c, j in levels:
        if groups and groups[-1][0] == c:
            groups[-1][1].append(j)
        else:
            groups.append((c, [j]))
    left = pi
    occ: dict[int, int] = {}
    top: list[int] = []
    for _, js in groups:
        e = min(left, 2 * len(js))
        left -= e
        per = [0] * len(js)
        for t in range(e):
            per[t % len(js)] += 1
        for j, p in zip(js, per):
            occ[j] = p
        if e > 0:
            top = js
    filled = sum(occ[j] for j in top)
    if filled == 2 * len(top):
        shell = "closed"
    elif len(top) == 2 and all(occ[j] == 1 for j in top):
        shell = "half"
    else:
        shell = "open"
    return {"k": k, "occ": occ, "shell": shell}


CACHE: dict[str, dict] = {}
DISAGREE: dict[str, dict] = {}


def H(name: str) -> dict:
    """The Huckel counter's full verdict on one species. Cached."""
    if name in CACHE:
        return CACHE[name]
    smi, planar, reason, scope = SPECIES[name]
    m = kekule(smi)
    atoms = ring_atoms(m, scope)
    inside = set(atoms)
    per: dict[int, int | None] = {}
    home: dict[int, str] = {}
    broken: list[int] = []
    for i in atoms:
        a = m.GetAtomWithIdx(i)
        sym = a.GetSymbol()
        lp = lone_pairs(a)
        ring_pi = any(b.GetBondType() == Chem.BondType.DOUBLE and b.GetOtherAtomIdx(i) in inside for b in a.GetBonds())
        exo_pi = any(b.GetBondType() != Chem.BondType.SINGLE and b.GetOtherAtomIdx(i) not in inside for b in a.GetBonds())
        if exo_pi:
            fail(f"{name}: atom {i} has an exocyclic pi bond, which this counter does not model")
            per[i] = None
            continue
        if ring_pi:
            per[i] = 1
            if sym != "C" and lp > 0:
                home[i] = "sp2"
        elif sym == "C":
            if a.GetFormalCharge() == -1 and lp == 1:
                per[i] = 2
                home[i] = "p"
            elif a.GetFormalCharge() == 1:
                per[i] = 0
                home[i] = "empty p"
            else:
                per[i] = None
                broken.append(i)
        else:
            if lp >= 1:
                per[i] = 2
                home[i] = "p+sp2" if lp >= 2 else "p"
            else:
                per[i] = None
                broken.append(i)
    if broken:
        # The ring loop is broken, so no heteroatom pair joins a RING pi system.
        # A pair next to a C=C (an enamine N, an enol ether O) still conjugates
        # with that C=C through a p orbital, the standard teaching model; a pair
        # with no pi bond next door sits in an sp3 orbital (pyrrolidine's N).
        # Either way it adds nothing to a ring count, so its tally is cleared.
        for i in atoms:
            a = m.GetAtomWithIdx(i)
            if a.GetSymbol() != "C" and lone_pairs(a) > 0 and per.get(i) == 2:
                beside_pi = any(
                    b.GetBondType() == Chem.BondType.DOUBLE
                    for n in a.GetNeighbors() for b in n.GetBonds()
                )
                home[i] = "p, conjugated, loop broken" if beside_pi else "sp3"
                per[i] = None
    pi = None if broken else sum(v for v in per.values() if v is not None)
    n = None if pi is None else (pi - 2) / 4
    if pi is None:
        electronic = None
    elif pi >= 2 and (pi - 2) % 4 == 0:
        electronic = "aromatic"
    elif pi % 4 == 0:
        electronic = "antiaromatic"
    else:
        electronic = "odd"
        fail(f"{name}: odd pi count {pi}; the counter has no class for a radical")
    if broken:
        klass, gate = "nonaromatic", "porbital"
    elif not planar:
        klass, gate = "nonaromatic", "planar"
    else:
        klass, gate = electronic, None
    planarity_decided = (not broken) and (not planar)

    fr = None
    if scope == "ring" and not broken:
        fr = frost(len(atoms), pi)
        want = {"aromatic": "closed", "antiaromatic": "half"}.get(electronic)
        if fr["shell"] != want:
            fail(f"{name}: counter says {electronic} ({pi} pi), Frost circle says {fr['shell']} shell. The models disagree; nothing written.")

    rd_mol = mol(smi)
    flags = [rd_mol.GetAtomWithIdx(i).GetIsAromatic() for i in atoms]
    rd = "aromatic" if all(flags) else ("partly aromatic" if any(flags) else "not aromatic")

    res = {
        "name": name, "smi": smi, "planar": planar, "reason": reason, "scope": scope,
        "atoms": atoms, "per": per, "home": home, "broken": broken, "pi": pi, "n": n,
        "electronic": electronic, "klass": klass, "gate": gate,
        "planarity_decided": planarity_decided, "rd": rd, "frost": fr,
    }
    disagreement(res)
    CACHE[name] = res
    return res


def disagreement(r: dict) -> None:
    klass, rd = r["klass"], r["rd"]
    charged = any(a.GetFormalCharge() != 0 for a in mol(r["smi"]).GetAtoms())
    if klass == "aromatic" and rd == "aromatic":
        return
    if klass == "nonaromatic" and rd == "not aromatic":
        return
    if klass == "antiaromatic" and rd == "not aromatic":
        why = ("RDKit has two classes, aromatic or not. It agrees the ring is not aromatic but cannot say "
               "antiaromatic versus nonaromatic; the antiaromatic call is the counter's alone.")
        tier = "granularity"
    elif klass == "antiaromatic" and rd == "aromatic":
        why = "RDKit flags a 4n ring aromatic; its electron rules for this charged ring differ from the taught count."
        tier = "conflict"
    elif klass == "nonaromatic" and r["planarity_decided"]:
        why = ("RDKit ignores geometry. It counts a 4n + 2 ring and flags it aromatic; the counter rules it out "
               f"on the authored planarity call ({r['reason']}).")
        tier = "conflict"
    elif charged:
        why = "RDKit treats this charged ring by its own electron rules, which differ from the taught count."
        tier = "conflict"
    elif r["scope"] == "system":
        why = "RDKit perceives fused systems ring by ring; the counter counts the whole perimeter."
        tier = "conflict"
    else:
        why = "Unexplained by the rules above. Read the SMILES and both verdicts."
        tier = "conflict"
    DISAGREE[r["name"]] = {"tier": tier, "why": why}


def run_fixtures() -> list[tuple[str, str, str, str]]:
    rows = []
    for name, want in FIXTURES.items():
        got = H(name)
        if got["klass"] != want:
            fail(f"fixture {name}: textbook expects {want}, the counter says {got['klass']} ({got['pi']} pi). Fix the counter, not the fixture.")
        rows.append((name, want, got["klass"], got["rd"]))
    return rows


def cap1(text: str) -> str:
    """Capitalise the first letter only (str.capitalize lowercases the rest)."""
    return text[:1].upper() + text[1:]


def n_text(n: float) -> str:
    return f"n = {int(n)}" if n == int(n) else f"n = {n:g}"


def home_of(name: str, symbol: str, nth: int = 0) -> str:
    """Where the nth ring atom of this element keeps its lone pair(s)."""
    r = H(name)
    m = kekule(r["smi"])
    hits = [i for i in r["atoms"] if m.GetAtomWithIdx(i).GetSymbol() == symbol]
    return r["home"].get(hits[nth], "none")


def hetero_index(name: str, symbol: str, with_h: bool) -> int:
    m = kekule(SPECIES[name][0])
    hits = [a.GetIdx() for a in m.GetAtoms() if a.GetSymbol() == symbol and (a.GetTotalNumHs() > 0) == with_h]
    if len(hits) != 1:
        raise ValueError(f"{name}: expected one {symbol} with_h={with_h}")
    return hits[0]


# ---------------------------------------------------------------------------
# NMR teaching table
# ---------------------------------------------------------------------------

SHIFT_ORDER = ["aromatic", "vinylic", "alkyl", "inner"]  # downfield to upfield
SHIFT_RANGE = {
    "aromatic": "about 6.5 to 8 ppm",
    "vinylic": "about 4.5 to 6.5 ppm",
    "alkyl": "about 0.9 to 1.5 ppm",
    "inner": "below 0 ppm, the far upfield end",
}
# Authored: which H of an annulene point inside, with the reason.
INNER = {"ann18": "6 of the 18 H point into the ring (one per three carbons in the flat D6h ring); 12 point out"}


def h_class(name: str, which: str) -> str | None:
    """The table row for one H environment. which: all, inner, outer, vinylic."""
    r = H(name)
    if which == "inner":
        if name not in INNER or r["klass"] != "aromatic":
            return None
        return "inner"
    m = kekule(r["smi"])
    ring = set(r["atoms"])
    found = set()
    for a in m.GetAtoms():
        if a.GetSymbol() != "C" or a.GetTotalNumHs() == 0:
            continue
        in_cc = any(b.GetBondType() == Chem.BondType.DOUBLE and b.GetOtherAtom(a).GetSymbol() == "C" for b in a.GetBonds())
        if a.GetIdx() in ring and r["klass"] == "aromatic":
            cls = "aromatic"
        elif in_cc:
            cls = "vinylic"
        elif all(n.GetSymbol() == "C" and n.GetHybridization() == Chem.HybridizationType.SP3 for n in a.GetNeighbors()) and a.GetHybridization() == Chem.HybridizationType.SP3:
            cls = "alkyl"
        else:
            cls = "outside"
        if which == "vinylic" and cls != "vinylic":
            continue
        found.add(cls)
    if len(found) != 1 or "outside" in found:
        return None
    return found.pop()


def most(envs: dict[str, tuple[str, str]], end: str) -> str | None:
    cls = {o: h_class(*v) for o, v in envs.items()}
    if any(c is None for c in cls.values()):
        fail(f"NMR: an option sits outside the teaching table: {cls}")
        return None
    ranks = {o: SHIFT_ORDER.index(c) for o, c in cls.items()}
    target = min(ranks.values()) if end == "downfield" else max(ranks.values())
    hits = [o for o, k in ranks.items() if k == target]
    return hits[0] if len(hits) == 1 else None


# ---------------------------------------------------------------------------
# Nomenclature
# ---------------------------------------------------------------------------

def relation(smi: str) -> str | None:
    """ortho / meta / para from the ring path between the two substituents."""
    m = mol(smi)
    ring = m.GetRingInfo().AtomRings()
    if len(ring) != 1:
        return None
    ring_set = set(ring[0])
    attach = [i for i in ring[0] if any(n.GetIdx() not in ring_set for n in m.GetAtomWithIdx(i).GetNeighbors())]
    if len(attach) != 2:
        return None
    d = len(Chem.GetShortestPath(m, attach[0], attach[1])) - 1
    return {1: "ortho", 2: "meta", 3: "para"}.get(d)


NAME_CHECKS: list[tuple[str, str, str]] = []


def check_name(smi: str, name: str, where: str) -> None:
    NAME_CHECKS.append((smi, name, where))


def check_names() -> None:
    if not NAME_CHECKS:
        return
    from py2opsin import py2opsin

    parsed = py2opsin([n for _, n, _ in NAME_CHECKS])
    for (smi, name, where), got in zip(NAME_CHECKS, parsed):
        if not got or canon(got) != canon(smi):
            fail(f"{where}: OPSIN reads '{name}' as {got or 'nothing'}, the drawing is {canon(smi)}")


# ---------------------------------------------------------------------------
# Figures (same figure format as Unit 1: bonds, labels, rings, 120 x 84)
# ---------------------------------------------------------------------------

W, H_FIG = 120, 84
EM_DASH = chr(0x2014)
MINUS = "−"


def r1(v: float) -> float:
    return round(v, 1)


def check_bounds(fig: dict, what: str) -> None:
    for b in fig.get("bonds", []):
        for k in ("x1", "x2"):
            if not 0 <= b[k] <= W:
                fail(f"figure {what}: bond {k} {b[k]} outside 0..{W}")
        for k in ("y1", "y2"):
            if not 0 <= b[k] <= H_FIG:
                fail(f"figure {what}: bond {k} {b[k]} outside 0..{H_FIG}")
        if math.hypot(b["x2"] - b["x1"], b["y2"] - b["y1"]) <= 1:
            fail(f"figure {what}: zero length bond")
    for lab in fig.get("labels", []):
        if not 2 <= lab["x"] <= W - 2 or not 6 <= lab["y"] <= H_FIG - 1:
            fail(f"figure {what}: label {lab['t']} at {lab['x']},{lab['y']} too near the edge")
    for r in fig.get("rings", []):
        if r["x"] - r["r"] < 0 or r["x"] + r["r"] > W or r["y"] - r["r"] < 0 or r["y"] + r["r"] > H_FIG:
            fail(f"figure {what}: marker ring outside the viewBox")


def figure(smi: str, marks: list[int] | None = None, numbers: dict[int, str] | None = None, pairs: bool = False,
           h_on: list[int] | None = None, where: dict[int, tuple[float, float]] | None = None) -> dict:
    """
    A skeletal drawing, Unit 1's figure() with two additions inside the same
    format: an H on a RING heteroatom is drawn as its own bond and "H" label
    (pyrrole's N-H is the whole point of a heterocycle question), and with
    `pairs` each heteroatom lone pair is drawn as a two dot text label in the
    widest gap beside the atom. Off-ring heteroatoms are condensed (OH, NH_2).
    """
    base = Chem.Mol(mol(smi))
    Chem.Kekulize(base, clearAromaticFlags=True)
    ring_het = [a.GetIdx() for a in base.GetAtoms() if a.GetSymbol() != "C" and a.IsInRing() and a.GetTotalNumHs() > 0]
    m = Chem.AddHs(base, onlyOnAtoms=tuple(ring_het)) if ring_het else base
    rdDepictor.Compute2DCoords(m)
    conf = m.GetConformer()
    pts = [(conf.GetAtomPosition(i).x, -conf.GetAtomPosition(i).y) for i in range(m.GetNumAtoms())]
    # A charged ring atom is turned to the top of the drawing, so its charge
    # (and a carbanion's lone pair) sits above the ring, where a textbook puts
    # it, instead of under it where a minus reads as an underscore.
    charged = [a.GetIdx() for a in m.GetAtoms() if a.GetFormalCharge() != 0 and a.IsInRing()]
    if charged:
        ring = [a.GetIdx() for a in m.GetAtoms() if a.IsInRing()]
        gx = sum(pts[i][0] for i in ring) / len(ring)
        gy = sum(pts[i][1] for i in ring) / len(ring)
        vx, vy = pts[charged[0]][0] - gx, pts[charged[0]][1] - gy
        turn = -math.pi / 2 - math.atan2(vy, vx)
        c, s = math.cos(turn), math.sin(turn)
        pts = [(gx + (x - gx) * c - (y - gy) * s, gy + (x - gx) * s + (y - gy) * c) for x, y in pts]
    marks = marks or []
    numbers = numbers or {}

    xs = [p[0] for p in pts]
    ys = [p[1] for p in pts]
    span_x = max(xs) - min(xs) or 1.0
    span_y = max(ys) - min(ys) or 1.0
    lengths = [math.dist(pts[b.GetBeginAtomIdx()], pts[b.GetEndAtomIdx()]) for b in m.GetBonds()]
    unit = sum(lengths) / len(lengths)
    scale = min(32.0 / unit, 96.0 / span_x, 58.0 / span_y)
    if numbers:
        # A lettered figure (atom_choice) shrinks the ring a little so its
        # bigger letters fit outside it without touching a bond (round 4 critic:
        # letters about 7 px and run into the lone pair dots).
        scale *= 0.8
    cx = (max(xs) + min(xs)) / 2
    cy = (max(ys) + min(ys)) / 2

    def at(i: int) -> tuple[float, float]:
        return (W / 2 + (pts[i][0] - cx) * scale, H_FIG / 2 + 2 + (pts[i][1] - cy) * scale)

    labelled = {a.GetIdx() for a in m.GetAtoms() if a.GetSymbol() != "C"}
    if where is not None:
        # Hand back where each heavy atom was drawn, for the pi tally table.
        for a in base.GetAtoms():
            x, y = at(a.GetIdx())
            where[a.GetIdx()] = (r1(x), r1(y))
    bonds = []
    for b in m.GetBonds():
        i, j = b.GetBeginAtomIdx(), b.GetEndAtomIdx()
        (x1, y1), (x2, y2) = at(i), at(j)
        dx, dy = x2 - x1, y2 - y1
        length = math.hypot(dx, dy)
        ux, uy = dx / length, dy / length
        if i in labelled:
            x1, y1 = x1 + ux * 6, y1 + uy * 6
        if j in labelled:
            x2, y2 = x2 - ux * 6, y2 - uy * 6
        order = int(b.GetBondTypeAsDouble())
        bond = {"x1": r1(x1), "y1": r1(y1), "x2": r1(x2), "y2": r1(y2)}
        if order > 1:
            bond["order"] = order
        bonds.append(bond)

    def gap_angle(i: int) -> float:
        x, y = at(i)
        angles = sorted(math.atan2(ny - y, nx - x) for nx, ny in (at(n.GetIdx()) for n in m.GetAtomWithIdx(i).GetNeighbors()))
        if len(angles) == 1:
            return angles[0] + math.pi
        gaps = [((angles[(k + 1) % len(angles)] - angles[k]) % (2 * math.pi) or 2 * math.pi, angles[k]) for k in range(len(angles))]
        width, start = max(gaps)
        return start + width / 2

    def out(i: int, dist: float, theta: float) -> tuple[float, float]:
        x, y = at(i)
        return (x + math.cos(theta) * dist, y + math.sin(theta) * dist)

    labels = []
    for a in m.GetAtoms():
        i = a.GetIdx()
        sym = a.GetSymbol()
        theta = gap_angle(i)
        if i in labelled:
            x, y = at(i)
            t = sym
            explicit_h = sym == "H"
            label = {"x": r1(x), "y": r1(y + 5), "t": t, "size": 13}
            if not explicit_h and not a.IsInRing():
                hs = a.GetTotalNumHs()
                h_part = ("H" if hs else "") + (f"_{hs}" if hs > 1 else "")
                t = sym + h_part
                label["t"] = t
                nbrs = [at(n.GetIdx()) for n in a.GetNeighbors()]
                if h_part and len(nbrs) == 1 and abs(nbrs[0][0] - x) > 3:
                    # A condensed OH or NH2 sits with its heavy atom ON the atom
                    # and the H trailing away from the bond, as a chemist writes
                    # it (HO on a left hand end), so the H never runs into a
                    # neighbouring C=O. 4.5 is half a 13 unit letter.
                    if nbrs[0][0] < x:
                        label.update({"x": r1(x - 4.5), "anchor": "start"})
                    else:
                        label.update({"x": r1(x + 4.5), "anchor": "end", "t": h_part + sym})
            labels.append(label)
        mark = "+" if a.GetFormalCharge() > 0 else MINUS if a.GetFormalCharge() < 0 else None
        if mark is not None:
            # A label's y is its baseline; a minus or plus is centred about 0.3 em
            # above it and a middle dot about 0.35 em, so each is lowered by that
            # much to sit level with the point it is placed at.
            if sym == "C":
                # Ring carbon, turned to the top: charge up and to the right.
                x, y = out(i, 8, theta + 0.55)
            else:
                # Heteroatom with its own label and drawn H: charge straight to its right.
                x, y = at(i)
                x += 10
            labels.append({"x": r1(x), "y": r1(y + 4.5), "t": mark, "size": 15})
            if sym == "C" and a.GetFormalCharge() < 0:
                # A carbanion's lone pair, up and to the left: the pair the count adds.
                x, y = out(i, 8, theta - 0.55)
                labels.append({"x": r1(x), "y": r1(y + 4.9), "t": "··", "size": 14})
            theta += 1.1
        if pairs and sym not in ("C", "H") and a.IsInRing():
            lp = lone_pairs(base.GetAtomWithIdx(i)) if i < base.GetNumAtoms() else 0
            spread = [0.0] if lp == 1 else [-0.75, 0.75] if lp == 2 else []
            for s in spread:
                th = theta + s
                x, y = out(i, 10, th)
                side = abs(math.cos(th)) > 0.7
                labels.append({"x": r1(x), "y": r1(y + (4 if side else 2)), "t": ":" if side else "··", "size": 13})
        if i in numbers:
            # The letter goes further out when this atom carries drawn lone pair
            # dots, so ":B" never reads as part of the N label (round 4 critic).
            has_dots = pairs and sym not in ("C", "H") and a.IsInRing() and i < base.GetNumAtoms() and lone_pairs(base.GetAtomWithIdx(i)) > 0
            dist = 22 if has_dots else 11 if mark is None and i not in labelled else 16
            theta_n = gap_angle(i)
            ring = [r for r in m.GetRingInfo().AtomRings() if i in r]
            if ring:
                # A ring N-H draws its H outside, so the widest gap is inside
                # the ring and the letter landed there, away from its atom
                # (23 Oct audit, 1,4-dihydropyridine). Keep it outside, turned
                # off the exocyclic bond.
                gx = sum(at(k)[0] for k in ring[0]) / len(ring[0])
                gy = sum(at(k)[1] for k in ring[0]) / len(ring[0])
                x0, y0 = at(i)
                outward = math.atan2(y0 - gy, x0 - gx)
                if math.cos(theta_n - outward) < 0:
                    theta_n = outward + 0.9
            x, y = out(i, dist, theta_n)
            labels.append({"x": r1(x), "y": r1(y + 4.5), "t": numbers[i], "size": 13})
    rings = []
    for i in marks:
        x, y = at(i)
        rings.append({"x": r1(x), "y": r1(y), "r": 8.5})
    for i in h_on or []:
        # One explicit H drawn on a carbon (an NMR question is about that H), circled.
        x1, y1 = out(i, 3, gap_angle(i))
        x2, y2 = out(i, 10, gap_angle(i))
        hx, hy = out(i, 15, gap_angle(i))
        bonds.append({"x1": r1(x1), "y1": r1(y1), "x2": r1(x2), "y2": r1(y2)})
        labels.append({"x": r1(hx), "y": r1(hy + 4), "t": "H", "size": 11})
        rings.append({"x": r1(hx), "y": r1(hy), "r": 7.5})

    fig: dict = {"bonds": bonds}
    if labels:
        fig["labels"] = labels
    if rings:
        fig["rings"] = rings
    check_bounds(fig, smi)
    return fig


ELECTRONS = {1: "↑", 2: "↑↓"}
FROST_C = (31.0, 44.0)
FROST_R = 29.0


def frost_points(k: int) -> list[tuple[float, float]]:
    """Vertex j of a k-gon drawn point down in the Frost circle. Vertex j sits at the
    energy of level j (alpha + 2 beta cos(2 pi j / k)): j = 0 is the bottom."""
    cx, cy = FROST_C
    return [(cx + FROST_R * math.sin(2 * math.pi * j / k), cy + FROST_R * math.cos(2 * math.pi * j / k)) for j in range(k)]


def frost_figure(k: int, occ: dict[int, int] | None = None) -> dict:
    """
    A Frost circle on the left (the circle is a dashed marker ring, the only
    circle the figure format has, with the k-gon inscribed point down) and its
    energy levels on the right, each bar at EXACTLY the height of its vertex,
    so the picture says what the model says: a vertex's height is its
    orbital's energy, and two vertices at one height are a matched pair, drawn
    side by side. The bars sit beside the circle, not on it, so electrons
    never cross a polygon edge. Electrons are up and down arrows standing
    on a bar, written as arrow characters (see ELECTRONS). The energy axis runs
    up between circle and levels. occ None draws the empty diagram the student
    fills; occ maps level j to 0, 1 or 2 electrons.
    """
    cx, cy = FROST_C
    pts = frost_points(k)
    bonds = []
    for j in range(k):
        (x1, y1), (x2, y2) = pts[j], pts[(j + 1) % k]
        bonds.append({"x1": r1(x1), "y1": r1(y1), "x2": r1(x2), "y2": r1(y2)})
    labels: list[dict] = []
    levels: dict[float, list[int]] = {}
    for j, (_, y) in enumerate(pts):
        levels.setdefault(round(y, 3), []).append(j)
    for vy, js in levels.items():
        slots = [97.0] if len(js) == 1 else [85.0, 109.0]
        for x, j in zip(slots, sorted(js)):
            bonds.append({"x1": r1(x - 9), "y1": r1(vy), "x2": r1(x + 9), "y2": r1(vy)})
            e = (occ or {}).get(j, 0)
            if e:
                # Electrons as the textbook's half arrows in type, an up arrow
                # per electron and an up-down pair for two. Drawn arrow bonds
                # have heads too big to tell a pair from a blob at tile size.
                labels.append({"x": r1(x), "y": r1(vy - 2), "t": ELECTRONS[e], "size": 14})
    bonds.append({"x1": 68.0, "y1": 80.0, "x2": 68.0, "y2": 14.0, "arrow": True})
    labels.append({"x": 68.0, "y": 11.0, "t": "E", "size": 11})
    fig = {"bonds": bonds, "labels": labels, "rings": [{"x": cx, "y": cy, "r": FROST_R}]}
    check_bounds(fig, f"frost {k}/{occ}")
    return fig


def frost_fill(k: int, pi: int, hund: bool = True) -> dict[int, int]:
    """Fill k Frost levels with pi electrons from the bottom. hund False pairs up
    inside a degenerate set before spreading (the classic wrong filling)."""
    if hund:
        return frost(k, pi)["occ"]
    groups: dict[float, list[int]] = {}
    for j in range(k):
        groups.setdefault(round(math.cos(2 * math.pi * j / k), 6), []).append(j)
    occ = {j: 0 for j in range(k)}
    left = pi
    for c in sorted(groups, reverse=True):
        for j in groups[c]:
            take = min(2, left)
            occ[j] = take
            left -= take
    return occ


def annulene_figure(name: str, mark_inner: bool = False) -> dict:
    """
    [10] and [18]annulene drawn with their INSIDE hydrogens, because the inner H
    are the whole story (the clash that twists [10]annulene, the shielded NMR
    signal of [18]annulene). The carbon framework is the perimeter of a fused
    arene whose RDKit depiction is regular: naphthalene for [10] (the two fusion
    carbons become the two inner CH, pointing at each other) and coronene for
    [18] (the six carbons that bond to the inner hexagon become the six inner
    CH). Double bonds alternate round the perimeter. Outer H are not drawn
    (skeletal convention).
    """
    host = {"ann10": "c1ccc2ccccc2c1", "ann18": "c1cc2ccc3ccc4ccc5ccc6ccc1c1c2c3c4c5c61"}[name]
    m = mol(host)
    rdDepictor.Compute2DCoords(m)
    conf = m.GetConformer()
    pts = {a.GetIdx(): (conf.GetAtomPosition(a.GetIdx()).x, -conf.GetAtomPosition(a.GetIdx()).y) for a in m.GetAtoms()}
    if name == "ann10":
        # Stand the two rings on end, so the two inner H face each other side
        # by side ("H H") rather than stacked, where at tile size they merge.
        pts = {i: (y, x) for i, (x, y) in pts.items()}
    ri = m.GetRingInfo()
    if name == "ann10":
        inner_core: set[int] = set()
        fusion = [a.GetIdx() for a in m.GetAtoms() if ri.NumAtomRings(a.GetIdx()) == 2]
        perimeter = set(pts)
        removed = {tuple(sorted(fusion))}
        inner_of = {fusion[0]: fusion[1], fusion[1]: fusion[0]}
    else:
        inner_core = {a.GetIdx() for a in m.GetAtoms() if ri.NumAtomRings(a.GetIdx()) == 3}
        perimeter = set(pts) - inner_core
        removed = set()
        inner_of = {}
        for i in perimeter:
            for n in m.GetAtomWithIdx(i).GetNeighbors():
                if n.GetIdx() in inner_core:
                    inner_of[i] = n.GetIdx()
    edges = [tuple(sorted((b.GetBeginAtomIdx(), b.GetEndAtomIdx()))) for b in m.GetBonds()]
    edges = [e for e in edges if e[0] in perimeter and e[1] in perimeter and e not in removed]
    nbr: dict[int, list[int]] = {i: [] for i in perimeter}
    for a, b in edges:
        nbr[a].append(b)
        nbr[b].append(a)
    if any(len(v) != 2 for v in nbr.values()):
        fail(f"{name}: perimeter is not one cycle")
        return {"bonds": []}
    cycle = [min(perimeter)]
    while len(cycle) < len(perimeter):
        nxt = [n for n in nbr[cycle[-1]] if n not in cycle]
        cycle.append(nxt[0])
    if len(cycle) != {"ann10": 10, "ann18": 18}[name]:
        fail(f"{name}: perimeter has {len(cycle)} carbons")
    xs = [pts[i][0] for i in cycle]
    ys = [pts[i][1] for i in cycle]
    unit = 1.0
    scale = min(96.0 / (max(xs) - min(xs)), 72.0 / (max(ys) - min(ys)), 24.0 / unit)
    cx, cy = (max(xs) + min(xs)) / 2, (max(ys) + min(ys)) / 2

    def at(i: int) -> tuple[float, float]:
        return (W / 2 + (pts[i][0] - cx) * scale, H_FIG / 2 + (pts[i][1] - cy) * scale)

    bonds = []
    for k, i in enumerate(cycle):
        j = cycle[(k + 1) % len(cycle)]
        (x1, y1), (x2, y2) = at(i), at(j)
        bond = {"x1": r1(x1), "y1": r1(y1), "x2": r1(x2), "y2": r1(y2)}
        if k % 2 == 0:
            bond["order"] = 2
        bonds.append(bond)
    labels, rings = [], []
    reach = 0.26 if name == "ann10" else 0.5
    for i, target in sorted(inner_of.items()):
        (x, y), (tx, ty) = at(i), at(target)
        # [10]: the two inner H point straight at each other and nearly touch,
        # which is the clash. They sit so close to their carbons that a C-H
        # bond line would be too short to see, so the H is placed without one.
        # [18]: each inner H points at the ring's centre, on a drawn bond.
        ux, uy = tx - x, ty - y
        hx, hy = x + ux * reach, y + uy * reach
        if name == "ann18":
            bonds.append({"x1": r1(x + ux * 0.08), "y1": r1(y + uy * 0.08), "x2": r1(x + ux * (reach - 0.2)), "y2": r1(y + uy * (reach - 0.2))})
        labels.append({"x": r1(hx), "y": r1(hy + 3.5), "t": "H", "size": 10})
        if mark_inner and name == "ann18":
            rings.append({"x": r1(hx), "y": r1(hy), "r": 6})
    if mark_inner and name == "ann10":
        (x, y), (tx, ty) = at(fusion[0]), at(fusion[1])
        rings.append({"x": r1((x + tx) / 2), "y": r1((y + ty) / 2), "r": 9})
    fig: dict = {"bonds": bonds, "labels": labels}
    if rings:
        fig["rings"] = rings
    check_bounds(fig, name)
    return fig


def fig_of(name: str, **kw) -> dict:
    if name in ("ann10", "ann18"):
        return annulene_figure(name, **kw)
    return figure(SPECIES[name][0], **kw)


def named(name: str, caption: str, **kw) -> dict:
    return {"figure": fig_of(name, **kw), "name": caption}


# `large` asks McqVisualCard for the big figure (round 4: both judges asked for
# the molecule to fill the card, not sit as an 80 px thumbnail).
def struct_visual(name: str, caption: str, **kw) -> dict:
    return {"kind": "structure", "figure": fig_of(name, **kw), "name": caption, "large": True}


def pair_visual(a: tuple[str, str], b: tuple[str, str], kw_a: dict | None = None, kw_b: dict | None = None) -> dict:
    return {"kind": "pair", "a": named(*a, **(kw_a or {})), "b": named(*b, **(kw_b or {})), "large": True}


def smi_named(smi: str, caption: str, where: str, check: bool = True) -> dict:
    if check:
        check_name(smi, caption, where)
    return {"figure": figure(smi), "name": caption}


# ---------------------------------------------------------------------------
# Entries
# ---------------------------------------------------------------------------

POOLS: dict[str, list[dict]] = {}
VISUALS: dict[str, dict] = {}
TILES: dict[str, dict] = {}
SORT_FIGURES: dict[str, dict] = {}
IDS: set[str] = set()
USES: dict[str, list[str]] = {}
CORRECT_INDEX: list[int] = []

CAPS = {"prompt": 90, "brief": 110, "option": 48, "why": 320}
CARD_CAP = 34
ARITHMETIC = ("+", "*", "/", "=")


def lint_copy(where: str, text: str, cap: int | None = None) -> None:
    if cap is not None and len(text) > cap:
        fail(f"{where}: {len(text)} characters, over {cap}: {text}")
    if "?" in text:
        fail(f"{where}: has a question mark")
    if EM_DASH in text:
        fail(f"{where}: has an em dash")
    if text.strip() == "":
        fail(f"{where}: empty")
    for banned in ("you should have", "obviously", "of course", "try again", "you failed"):
        if banned in text.lower():
            fail(f"{where}: banned phrase '{banned}'")


def lint_arith(where: str, text: str) -> None:
    import re

    if re.search(r"[0-9]\s*[+*/=]\s*[0-9]", text) or re.search(r"\b(calculate|compute)\b", text, re.I):
        fail(f"{where}: reads as arithmetic, which the easy MCQ rule bans in a prompt or brief")


def ruling_note(uses: list[str]) -> str:
    hits = [u for u in uses if u in DISAGREE]
    planar = [u for u in uses if H(u)["planarity_decided"]]
    notes = []
    if hits:
        notes.append("NEEDS OWNER RULING: RDKit disagrees with the counter on " + ", ".join(hits) + " (scripts/u2_pools_report.md)")
    if planar:
        notes.append("planarity authored for " + ", ".join(planar))
    return (" " + "; ".join(notes) + ".") if notes else ""


def prov(what: str, page: str, uses: list[str]) -> str:
    return f"{SCRIPT}: {what}. {page}.{ruling_note(uses)}"


def mcq(node: str, id: str, prompt: str, options: list[tuple[str, str, str]], derived: str | None,
        correct: str, explanation: str, provenance: str, visual: dict, uses: list[str],
        tiles: dict | None = None, brief: str | None = None, level: int = 1,
        concepts: tuple[str, ...] = ("aromaticity",)) -> None:
    lint_copy(f"{id} prompt", prompt, CAPS["prompt"])
    lint_arith(f"{id} prompt", prompt)
    if brief is not None:
        lint_copy(f"{id} brief", brief, CAPS["brief"])
        lint_arith(f"{id} brief", brief)
    for o, t, w in options:
        lint_copy(f"{id} option {o}", t, CAPS["option"])
        lint_copy(f"{id} why {o}", w, CAPS["why"])
    lint_copy(f"{id} explanation", explanation)
    if not 3 <= len(options) <= 4:
        fail(f"{id}: {len(options)} options")
    if derived is None:
        fail(f"{id}: the script could not derive an answer")
    elif derived != correct:
        fail(f"{id}: authored answer {correct}, derived answer {derived}")
    if id in IDS:
        fail(f"duplicate id {id}")
    IDS.add(id)
    if visual is None:
        fail(f"{id}: every pool MCQ carries a question drawing")
    ids = [o for o, _, _ in options]
    if correct in ids:
        CORRECT_INDEX.append(ids.index(correct))
    beat = {"kind": "mcq", "id": id, "node": node, "conceptIds": list(concepts), "levels": [level], "prompt": prompt}
    if brief is not None:
        beat["brief"] = brief
    beat["correctOptionId"] = correct
    beat["options"] = [{"id": o, "text": t, "why": w} for o, t, w in options]
    POOLS.setdefault(node, []).append(
        {"id": id, "item": {"kind": "mcq", "beat": beat}, "explanation": explanation, "provenance": provenance, "placeholder": True}
    )
    USES[id] = uses
    VISUALS[id] = visual
    if tiles is not None:
        if set(tiles) != set(ids):
            fail(f"{id}: tiles {sorted(tiles)} do not match options")
        # A question drawing with the same skeleton as exactly one option tile
        # points at that option. (Tiles that all share the skeleton, a pick the
        # circled atom question, point at none of them.)
        q_figs = [visual["figure"]] if visual.get("kind") == "structure" else [visual["a"]["figure"], visual["b"]["figure"]] if visual.get("kind") == "pair" else []
        for qf in q_figs:
            same = [o for o, t in tiles.items() if t["figure"]["bonds"] == qf.get("bonds")]
            if len(same) == 1:
                fail(f"{id}: the question drawing is option {same[0]}'s molecule, so the stem points at it")
        TILES[id] = tiles


CLASS_RANK = {"aromatic": 0, "nonaromatic": 1, "antiaromatic": 2}


def ladder(node: str, id: str, species: list[tuple[str, str, str, str]], key: str, prompt: str, brief: str,
           criterion: str, track: tuple[str, str], problem_prompt: str, solution: tuple[str, str, str],
           distractors: list[tuple[str, list[str], str, tuple[str, str, str]]], explanation: str,
           provenance: str, concepts: tuple[str, ...], difficulty: int = 1100) -> None:
    """
    One sort ladder. species: (card id, label, species name, why), authored
    most-first. `key` names what is ranked: "self" ranks the species by its
    own class, "base" ranks acids by their conjugate base's class (the base is
    the species' partner in BASE_OF). Every step must drop one class.
    """
    if id in IDS:
        fail(f"duplicate id {id}")
    IDS.add(id)
    ranks = []
    for cid, _, name, _ in species:
        judged = BASE_OF[name] if key == "base" else name
        ranks.append(CLASS_RANK[H(judged)["klass"]])
    if ranks != sorted(ranks) or len(set(ranks)) != len(ranks):
        fail(f"{id}: ladder order is not derivable from the class model: {list(zip([s[0] for s in species], ranks))}")
    order = [c for c, _, _, _ in species]
    for did, dorder, cause, _ in distractors:
        if sorted(dorder) != sorted(order):
            fail(f"{id}: distractor {did} is not a permutation")
        if dorder == order:
            fail(f"{id}: distractor {did} is the right answer")
    for cid, label, _, why in species:
        lint_copy(f"{id} card {cid}", label, CARD_CAP)
        lint_copy(f"{id} why {cid}", why, CAPS["why"])
    lint_copy(f"{id} prompt", prompt, CAPS["prompt"])
    lint_copy(f"{id} brief", brief, CAPS["brief"])
    for part in solution:
        lint_copy(f"{id} solution", part)
    for did, _, _, e in distractors:
        for part in e:
            lint_copy(f"{id} distractor {did}", part)
    POOLS.setdefault(node, []).append({
        "__ladder__": True,
        "id": id,
        "node": node,
        "problemId": "u2-" + id,
        "topic": "aromaticity",
        "difficulty": difficulty,
        "problemPrompt": problem_prompt,
        "criterionText": track[0].lower(),
        "items": [{"id": c, "text": label} for c, label, _, _ in species],
        "order": order,
        "solution": {"whatHappened": solution[0], "why": solution[1], "lookAt": solution[2]},
        "distractors": [
            {"id": did, "cause": cause, "order": dorder, "explanation": {"whatHappened": e[0], "why": e[1], "lookAt": e[2]}}
            for did, dorder, cause, e in distractors
        ],
        "beat": {
            "conceptIds": list(concepts),
            "prompt": prompt,
            "brief": brief,
            "criterion": criterion,
            "direction": "descending",
            "notes": {c: why for c, _, _, why in species},
        },
        "trackEnds": {"first": track[0], "last": track[1]},
        "meanings": [
            {"id": did, "cause": "order_fully_reversed" if cause == "ordering_is_reversed" else "order_adjacent_pair_swapped"}
            for did, _, cause, _ in distractors
        ],
        "explanation": explanation,
        "provenance": provenance,
    })
    # A "base" ladder is decided by the conjugate bases, so they are what the
    # report must trace back to this item, as well as the acids on the cards.
    USES[id] = [s[2] for s in species] + ([BASE_OF[s[2]] for s in species] if key == "base" else [])
    SORT_FIGURES[id] = {c: named(name, label) for c, label, name, _ in species}


def match(node: str, id: str, prompt: str, brief: str, pairs: list[tuple[str, str, str, str, str | None]],
          explanation: str, provenance: str, uses: list[str], concepts: tuple[str, ...] = ("aromaticity",)) -> None:
    """
    One match board. pairs: (pair id, left card, right card, why, derived
    right card or None when the right card is not a derived claim). The
    authored right card must equal the derived one.
    """
    if id in IDS:
        fail(f"duplicate id {id}")
    IDS.add(id)
    lint_copy(f"{id} prompt", prompt, CAPS["prompt"])
    lint_copy(f"{id} brief", brief, CAPS["brief"])
    rights = [p[2] for p in pairs]
    if len(set(rights)) != len(rights):
        fail(f"{id}: two pairs share a right hand card, so the board has two answers")
    for pid, left, right, why, derived in pairs:
        lint_copy(f"{id} left {pid}", left, CARD_CAP)
        lint_copy(f"{id} right {pid}", right, CARD_CAP)
        lint_copy(f"{id} why {pid}", why, CAPS["why"])
        if derived is None or derived != right:
            fail(f"{id}: pair {pid} authored '{right}', derived '{derived}'")
    beat = {
        "kind": "match",
        "id": id,
        "node": node,
        "conceptIds": list(concepts),
        "levels": [1, 2],
        "presentation": "columns",
        "prompt": prompt,
        "brief": brief,
        "pairs": [{"id": pid, "left": left, "right": right, "why": why} for pid, left, right, why, _ in pairs],
    }
    POOLS.setdefault(node, []).append({"__match__": True, "beat": beat, "explanation": explanation, "provenance": provenance})
    USES[id] = uses


# ---------------------------------------------------------------------------
# Shared copy builders (every number in them comes from the counter)
# ---------------------------------------------------------------------------

def class_options(name: str, whys: dict[str, str], order: tuple[str, ...] = ("aromatic", "antiaromatic", "nonaromatic")) -> list[tuple[str, str, str]]:
    text = {"aromatic": "Aromatic", "antiaromatic": "Antiaromatic", "nonaromatic": "Nonaromatic"}
    return [(k, text[k], whys[k]) for k in order]


def pi_of(name: str) -> int:
    p = H(name)["pi"]
    if p is None:
        raise ValueError(f"{name} has no continuous p system")
    return p


def nn(name: str) -> str:
    return n_text(H(name)["n"])


CLASS_CARD = {
    "aromatic": lambda r: "Aromatic",
    "antiaromatic": lambda r: "Antiaromatic",
    "nonaromatic": lambda r: "Nonaromatic, not flat" if r["gate"] == "planar" else "Nonaromatic, sp3 atom",
}


def class_card(name: str) -> str:
    r = H(name)
    return CLASS_CARD[r["klass"]](r)


HOME_TEXT = {
    "sp2": "sp2 orbital, in the ring plane",
    "p": "p orbital, in the pi system",
    "p+sp2": "One pair in p, one in the plane",
    "sp3": "sp3, no pi system to join",
    "p, conjugated, loop broken": "p, beside a C=C, ring loop broken",
}

LETTERS = "ABCD"
ATOM_LETTERS = "abcd"

# Labels only: an acid C-H losing H+ to leave a carbanion. It names no option.
ACID_SCHEME = {
    "bonds": [{"x1": 40.0, "y1": 42.0, "x2": 74.0, "y2": 42.0, "arrow": True}],
    "labels": [
        {"x": 22.0, "y": 47.0, "t": "C-H", "size": 15},
        {"x": 57.0, "y": 33.0, "t": "lose H+", "size": 10},
        {"x": 92.0, "y": 47.0, "t": "C:", "size": 15},
        {"x": 102.0, "y": 39.0, "t": "\u2212", "size": 14},
        {"x": 22.0, "y": 70.0, "t": "acid", "size": 10},
        {"x": 94.0, "y": 70.0, "t": "base", "size": 10},
    ],
}


def frost_mcq(node: str, id: str, name: str, k: int, ring_word: str, prompt: str, kinds: list[str], correct: str,
              explanation: str, page: str, brief: str) -> None:
    """
    Fill the Frost circle. The question draws the EMPTY circle; the options are
    three drawn fillings, so the student picks the filling they would make
    rather than reading a pre-filled diagram. kinds name the fillings in option
    order: "right" (the Frost model's own filling), "paired" (pairs up inside a
    matched set while its twin is empty), "less" / "more" (two electrons short
    or over). The key is the option whose drawn filling equals frost().
    """
    pi = pi_of(name)
    r = H(name)
    fills = {
        "right": frost_fill(k, pi),
        "paired": frost_fill(k, pi, hund=False),
        "less": frost_fill(k, pi - 2),
        "more": frost_fill(k, pi + 2),
    }
    shell = {"closed": "every occupied level is full, a closed shell: aromatic",
             "half": "a matched pair is left half full: antiaromatic"}[r["frost"]["shell"]]
    whys = {
        "right": f"{pi} pi electrons, filled from the bottom, one per level across a matched pair before any pairing. Then {shell}.",
        "paired": "Two electrons are paired in one level of a matched pair while its twin sits empty. Matched levels take one electron each first.",
        "less": f"This holds {pi - 2} electrons. Count again: {ring_word} has {pi} pi electrons.",
        "more": f"This holds {pi + 2} electrons. Count again: {ring_word} has {pi} pi electrons.",
    }
    options, tiles = [], {}
    for letter, kind in zip(LETTERS, kinds):
        if kind == "paired" and fills["paired"] == fills["right"]:
            fail(f"{id}: the paired filling equals the right one for {k}/{pi}")
        options.append((letter.lower(), f"Filling {letter}", whys[kind]))
        tiles[letter.lower()] = {"figure": frost_figure(k, fills[kind]), "name": f"filling {letter}"}
    want = frost(k, pi)["occ"]
    hits = [letter.lower() for letter, kind in zip(LETTERS, kinds) if fills[kind] == want]
    mcq(
        node, id, prompt, options, hits[0] if len(hits) == 1 else None, correct, explanation,
        prov(f"Frost circle levels alpha + 2 beta cos(2 pi j / {k}), filled with the counter's {pi} electrons", page, [name]),
        {"kind": "structure", "figure": frost_figure(k), "name": f"Frost circle for a {k} ring, empty"},
        [name], tiles=tiles, brief=brief,
    )


SECTORS = ["right", "upper right", "top", "upper left", "left", "lower left", "bottom", "lower right"]


def atom_place(name: str, i: int) -> str:
    """Where atom i sits in this species' drawing, as a word a screen reader can
    say ("upper left"), read off figure()'s own coordinates. It names a place,
    never a property, so it cannot give the answer away."""
    where: dict[int, tuple[float, float]] = {}
    figure(SPECIES[name][0], where=where)
    ring = H(name)["atoms"]
    gx = sum(where[a][0] for a in ring) / len(ring)
    gy = sum(where[a][1] for a in ring) / len(ring)
    deg = math.degrees(math.atan2(-(where[i][1] - gy), where[i][0] - gx)) % 360
    return SECTORS[int(((deg + 22.5) % 360) // 45)]


def atom_choice(name: str, caption: str, atoms: dict[str, int], why, **kw) -> tuple[list[tuple[str, str, str]], dict]:
    """
    Pick the atom on ONE drawing: the molecule is drawn once, large, with each
    offered ring atom lettered beside it, and the options name the letter and
    place ("Atom B, upper left") so they read without the picture too. Round 4
    replaced four copies of the molecule, one circle each, after the critic and
    both judges asked for the student to work on the single molecule. Every
    option's reason comes from why(i), which reads the counter's per atom
    result, so no reason is typed against an atom it does not fit.
    """
    options = []
    places = {o: atom_place(name, i) for o, i in atoms.items()}
    if len(set(places.values())) != len(places):
        fail(f"{name}: two offered atoms share the place word {places}")
    letters = {}
    # Lower case on purpose (23 Oct audit): on a skeletal drawing a capital C
    # beside a ring atom reads as a carbon label, and "Atom C" as "the carbon".
    for letter, (o, i) in zip(ATOM_LETTERS, atoms.items()):
        options.append((o, f"Atom {letter}, {places[o]}", why(i)))
        letters[i] = letter
    return options, struct_visual(name, caption, numbers=letters, **kw)


def charge_carbons(name: str) -> int:
    """How many carbons carry the charge across the resonance forms (RDKit
    ResonanceMolSupplier). Used only on nonaromatic ions, where the supplier
    enumerates every form; on aromatic rings it can stop early."""
    m = mol(SPECIES[name][0])
    sup = Chem.ResonanceMolSupplier(m, Chem.KEKULE_ALL)
    return len({a.GetIdx() for form in sup for a in form.GetAtoms() if a.GetFormalCharge() != 0})


NUM_WORD = {2: "two", 3: "three", 4: "four", 5: "five", 6: "six", 7: "seven"}

OPSIN: dict[str, str | None] = {}


def opsin_prefetch(names: list[str]) -> None:
    """Parse every name once with OPSIN (one Java start), canonicalised by RDKit."""
    from py2opsin import py2opsin

    todo = [n for n in dict.fromkeys(names) if n not in OPSIN]
    if not todo:
        return
    for n, got in zip(todo, py2opsin(todo)):
        OPSIN[n] = canon(got) if got else None


def opsin(name: str) -> str | None:
    if name not in OPSIN:
        opsin_prefetch([name])
    return OPSIN[name]


def key_by_name(drawn: str, names: dict[str, str]) -> str | None:
    """Name this compound: the key is the option whose NAME, parsed by OPSIN, is the drawn structure."""
    hits = [o for o, n in names.items() if opsin(n) == canon(drawn)]
    return hits[0] if len(hits) == 1 else None


def key_by_structure(target: str, smiles: dict[str, str]) -> str | None:
    """Pick X: the key is the drawn option whose structure is what OPSIN makes of the name X."""
    want = opsin(target)
    hits = [o for o, smi in smiles.items() if want is not None and canon(smi) == want]
    return hits[0] if len(hits) == 1 else None


# conjugate base of each acid used on the acidity cards
BASE_OF = {"cyclopentadiene": "cp_anion", "chd13": "c6_anion", "cyclopropene": "c3_anion", "cycloheptatriene": "c7_anion"}


# ---------------------------------------------------------------------------
# u2-huckel (lesson): 2 meet questions at L0, 3 at rung 1
# ---------------------------------------------------------------------------

def node_huckel() -> None:
    node = "u2-huckel"
    chd = H("chd13")
    gate_opt = {"porbital": "porb", "planar": "flat"}.get(chd["gate"])
    mcq(
        node, "u2-huckel-meet-gate",
        "Benzene passes all four tests. Pick the one cyclohexa-1,3-diene fails.",
        [
            ("cyclic", "Being cyclic", "Both are rings, so both pass the first test. The difference is further down the checklist."),
            ("porb", "A p orbital on every ring atom", "The two circled CH2 carbons are sp3. They have no p orbital, so the pi system breaks there and the ring stops before planarity or counting even matter."),
            ("pibond", "Having pi bonds at all", "It has two C=C bonds, so it does have pi electrons. The trouble is they cannot run all the way round the ring."),
        ],
        gate_opt, "porb",
        "The four tests run in order: cyclic, a p orbital on every ring atom, planar, then 4n + 2 pi electrons. One sp3 carbon breaks the loop, so the ring is nonaromatic.",
        prov("Huckel counter: the two CH2 carbons offer no p orbital, first failed gate", OS_15_3, ["chd13", "benzene"]),
        pair_visual(("benzene", "benzene"), ("chd13", "cyclohexa-1,3-diene"), kw_b={"marks": chd["broken"]}),
        ["chd13", "benzene"],
        brief="Cyclic, a p orbital on every ring atom, flat, then 4n + 2 pi electrons. Watch the circled carbons.",
        level=0,
    )
    b = pi_of("benzene")
    mcq(
        node, "u2-huckel-meet-count",
        "Count benzene's pi electrons.",
        [
            ("four", "4 pi electrons", "That counts only two of the three C=C bonds. Every ring carbon sits in one pi bond, and each pi bond holds 2."),
            ("six", f"{b} pi electrons", f"Three C=C bonds, 2 electrons each, gives {b}. Each ring carbon gives 1, so the count is also the number of carbons."),
            ("twelve", "12 pi electrons", "That counts the C-H bonds too. Only electrons in p orbitals count, and the C-H bonds are sigma bonds."),
        ],
        "six" if b == 6 else None, "six",
        f"Benzene has {b} pi electrons, which fits 4n + 2 with {nn('benzene')}. Each carbon gives one electron from its p orbital.",
        prov("Huckel counter: 1 electron per ring pi bond atom", OS_15_3, ["benzene"]),
        struct_visual("benzene", "benzene: one p orbital per carbon"),
        ["benzene"],
        brief="Each ring carbon in a C=C gives 1 electron from its p orbital.",
        level=0,
    )
    cbd = H("cyclobutadiene")
    mcq(
        node, "u2-huckel-cbd",
        "Cyclobutadiene is cyclic, flat, with a p orbital on every carbon. Classify it.",
        class_options("cyclobutadiene", {
            "aromatic": "Passing the first three tests only opens the gate. The count decides, and 4 pi electrons is 4n, not 4n + 2.",
            "antiaromatic": f"It passes the gate, then the count lands on {cbd['pi']}, which is 4n. A flat ring with a 4n count is worse off than an open chain, which is what antiaromatic means.",
            "nonaromatic": "Nonaromatic is for a ring that fails the gate: an sp3 atom or a bent ring. This one passes all three, so the count gets a say.",
        }, ("antiaromatic", "aromatic", "nonaromatic")),
        cbd["klass"], "antiaromatic",
        f"Cyclobutadiene passes the gate and has {cbd['pi']} pi electrons ({nn('cyclobutadiene')}, not a whole number). A flat ring with 4n pi electrons is antiaromatic.",
        prov("Huckel counter: 4 pi, planar authored; Frost circle leaves a half-filled pair", OS_15_3, ["cyclobutadiene"]),
        struct_visual("cyclobutadiene", "cyclobutadiene"),
        ["cyclobutadiene"],
    )
    nap = pi_of("naphthalene")
    mcq(
        node, "u2-huckel-naph",
        "Count the pi electrons in naphthalene, both rings together.",
        [
            ("six", "6 pi electrons", "That counts one ring as if it stood alone. The fused system shares two carbons, so count every carbon once."),
            ("twelve", "12 pi electrons", "That counts the two shared carbons twice, once for each ring. Each carbon has one p orbital, so it gives 1 electron, once."),
            ("ten", f"{nap} pi electrons", f"Ten carbons, five C=C bonds, {nap} electrons. That is 4n + 2 with {nn('naphthalene')}, so the fused system is aromatic."),
        ],
        "ten" if nap == 10 else None, "ten",
        f"Naphthalene has {nap} pi electrons over its ten carbons. That gives {nn('naphthalene')}, a whole number, so it is aromatic.",
        prov("Huckel counter over the whole fused system", OS_15_3, ["naphthalene"]),
        struct_visual("naphthalene", "naphthalene"),
        ["naphthalene"],
    )
    cot = H("cot")
    mcq(
        node, "u2-huckel-n-cot",
        "Cyclooctatetraene has 8 pi electrons. Find n in 4n + 2.",
        [
            ("two", "n = 2", "That is n in 4n, the antiaromatic test: 4 times 2 is 8. The question asks for n in 4n + 2, and 4 times 2 plus 2 is 10, not 8."),
            ("frac", n_text(cot['n']), f"Take 2 off and divide by 4: {n_text(cot['n'])}. A non whole n means 8 does not fit 4n + 2, so this ring cannot be aromatic."),
            ("eight", "n = 8", "That is the electron count, not n. n is what you get after taking 2 off and dividing by 4."),
        ],
        "frac" if cot["n"] != int(cot["n"]) else None, "frac",
        f"n = (8 - 2) / 4 = {cot['n']:g}. A non whole n is the tell: the count fails. COT also bends into a tub, so it ends up nonaromatic, not antiaromatic.",
        prov("Huckel counter: 8 pi, n not a whole number; planarity authored (tub)", OS_15_3, ["cot"]),
        struct_visual("cot", "cyclooctatetraene, drawn flat"),
        ["cot"],
        brief="Take 2 off the count and divide by 4. A whole number passes.",
    )


# ---------------------------------------------------------------------------
# u2-annulene (lesson since round 4: 2 meet at L0, then the rest)
# ---------------------------------------------------------------------------

def node_annulene() -> None:
    node = "u2-annulene"
    bz, cot, a10, a18, az = H("benzene"), H("cot"), H("ann10"), H("ann18"), H("azulene")

    # Round 4: a lesson now, so two L0 worked examples open it (the meet step).
    a18_pi = pi_of("ann18")
    mcq(
        node, "u2-ann-meet-size",
        "Benzene is [6]annulene. Count [18]annulene's pi electrons.",
        [
            ("nine", "9 pi electrons", "Nine is the number of C=C bonds. Each C=C bond holds 2 pi electrons."),
            ("eighteen", f"{a18_pi} pi electrons", f"Eighteen carbons, each in one C=C bond, each giving 1: {a18_pi}. That fits 4n + 2 with {nn('ann18')}."),
            ("thirtysix", "36 pi electrons", "That gives each carbon 2. A C=C carbon gives 1; its partner gives the other."),
        ],
        "eighteen" if a18_pi == 18 else None, "eighteen",
        f"Worked example. An annulene alternates C=C all the way round, so its pi count is its ring size: {a18_pi} for [18]annulene, {nn('ann18')}.",
        prov("Huckel counter: 1 electron per ring pi bond atom", OS_15_3, ["ann18"]),
        struct_visual("ann18", "[18]annulene"),
        ["ann18"],
        # 23 Oct audit #22: the bracket number is named in words, so the letter n
        # keeps one meaning in this unit, the n of 4n + 2.
        brief="The number in brackets is the ring size. Each ring carbon in a C=C gives 1 pi electron.",
        level=0,
    )
    flat_cot = {"aromatic": "aromatic", "antiaromatic": "antiaromatic"}.get(cot["electronic"])
    mcq(
        node, "u2-ann-meet-flat",
        "Suppose cyclooctatetraene stayed flat. Pick what its 8 pi electrons would make it.",
        [
            ("antiaromatic", "Antiaromatic", f"Flat, cyclic, a p orbital everywhere, and 8 is 4n ({nn('cot')} in 4n + 2 is not whole). That is the antiaromatic case, which a ring avoids if it can."),
            ("aromatic", "Aromatic", "Aromatic needs 4n + 2: 2, 6, 10, 14. Eight is not on that list."),
            ("nonaromatic", "Nonaromatic", "Nonaromatic needs a failed gate. A flat ring with a p orbital on every carbon passes the gate, so the count decides."),
        ],
        flat_cot, "antiaromatic",
        "Worked example. Flat, COT would be antiaromatic, which costs energy. So it does not stay flat: it folds into a tub. Keep that in mind for the next questions.",
        prov("Huckel counter: 8 pi is 4n, the class if flat; the tub is authored", OS_15_3, ["cot"]),
        struct_visual("cot", "cyclooctatetraene, drawn flat"),
        ["cot"],
        brief="Run the count as if the ring were flat. A 4n count on a flat ring is the bad case.",
        level=0,
    )

    cpd = H("cyclopentadiene")
    cpd_atoms = {"a": 0, "b": 3, "c": 2, "d": 4}
    gate_hits = [o for o, i in cpd_atoms.items() if i in cpd["broken"]]

    def cpd_why(i: int) -> str:
        if cpd["per"][i] is None:
            return "This is the CH2. It is sp3, with four single bonds and no p orbital, so the loop has a gap here and the ring is nonaromatic."
        return "This carbon sits in a C=C bond, so it is sp2 with a p orbital. The loop runs through it."

    cpd_options, cpd_visual = atom_choice("cyclopentadiene", "cyclopenta-1,3-diene", cpd_atoms, cpd_why)
    mcq(
        node, "u2-ann-cpd-gate",
        "Find the lettered atom that breaks cyclopenta-1,3-diene's p orbital loop.",
        cpd_options,
        gate_hits[0] if len(gate_hits) == 1 else None, "c",
        "Run the gate atom by atom: every ring atom needs a p orbital. One sp3 CH2 is enough to make the ring nonaromatic, before the count is even asked.",
        prov("Huckel counter: the atom with no p orbital is the first failed gate", OS_15_3, ["cyclopentadiene"]),
        cpd_visual,
        ["cyclopentadiene"],
        brief="Go round the ring one atom at a time. For each, ask whether it has a p orbital.",
    )
    mcq(
        node, "u2-ann-cot",
        "Classify cyclooctatetraene as it really sits, a tub.",
        class_options("cot", {
            "aromatic": "Eight pi electrons is 4n, so it could never be aromatic, flat or bent.",
            "antiaromatic": "Flat, 8 pi electrons would make it antiaromatic. That is exactly why it does not stay flat: it folds into a tub and escapes.",
            "nonaromatic": f"The tub breaks the side by side overlap of the p orbitals, so the ring fails the planarity test. Failing the gate means nonaromatic. ({SPECIES['cot'][2]}.)",
        }, ("antiaromatic", "nonaromatic", "aromatic")),
        cot["klass"], "nonaromatic",
        "COT would be antiaromatic if flat, so it bends into a tub. Its C=C bonds then act like separate alkenes: nonaromatic.",
        prov("Huckel counter: 8 pi; planarity authored (tub) decides nonaromatic over antiaromatic", OS_15_3, ["cot"]),
        struct_visual("cot", "cyclooctatetraene"),
        ["cot"],
        brief="A flat octagon needs 135 degree angles. Its sp2 carbons want 120.",
    )
    mcq(
        node, "u2-ann-10",
        "[10]Annulene has 10 pi electrons. Pick the test it fails.",
        [
            ("count", "The 4n + 2 count", f"Ten fits: {nn('ann10')}, a whole number. The count is fine, so the trouble is earlier in the checklist."),
            ("porb", "A p orbital on every carbon", "Every carbon sits in a C=C, so every carbon has a p orbital."),
            ("flat", "Being flat", f"Flat, two H atoms inside the ring would sit on top of each other. The ring twists to avoid that clash, and a twisted ring fails the planarity test. ({SPECIES['ann10'][2]}.)"),
        ],
        {"planar": "flat", "porbital": "porb"}.get(a10["gate"]), "flat",
        "[10]Annulene has the right count but cannot lie flat because of its inner H atoms, so it is nonaromatic.",
        prov("Huckel counter: 10 pi, n = 2; planarity authored (inner H clash) decides nonaromatic", OS_15_3, ["ann10"]),
        struct_visual("ann10", "[10]annulene, drawn flat"),
        ["ann10"],
    )
    mcq(
        node, "u2-ann-18",
        "Classify [18]annulene.",
        class_options("ann18", {
            "aromatic": f"The ring is big enough to stay flat, and {a18['pi']} pi electrons is 4n + 2 with {nn('ann18')}. All four tests pass.",
            "antiaromatic": f"{a18['pi']} is not 4n. Take 2 off and divide by 4 and you get a whole number.",
            "nonaromatic": "Unlike [10]annulene, this ring is large enough to hold its inner H atoms without a clash, so it stays flat.",
        }, ("antiaromatic", "nonaromatic", "aromatic")),
        a18["klass"], "aromatic",
        f"[18]Annulene is flat with {a18['pi']} pi electrons, {nn('ann18')}: aromatic.",
        prov("Huckel counter; planarity authored; Frost circle closed shell", OS_15_3, ["ann18"]),
        struct_visual("ann18", "[18]annulene"),
        ["ann18"],
    )
    anti_tiles = {
        "benzene": named("benzene", "benzene"),
        "cbd": named("cyclobutadiene", "cyclobutadiene"),
        "cot": named("cot", "cyclooctatetraene"),
    }
    anti = [o for o, nm in (("benzene", "benzene"), ("cbd", "cyclobutadiene"), ("cot", "cot")) if H(nm)["klass"] == "antiaromatic"]
    mcq(
        node, "u2-ann-pick-anti",
        "Pick the antiaromatic ring.",
        [
            ("benzene", "Benzene", f"{bz['pi']} pi electrons is 4n + 2, so benzene is aromatic."),
            ("cot", "Cyclooctatetraene", "It has a 4n count, but it bends into a tub, so it is nonaromatic instead."),
            ("cbd", "Cyclobutadiene", "Four pi electrons in a ring that cannot bend its way out: a square is flat. 4n and flat is antiaromatic."),
        ],
        anti[0] if len(anti) == 1 else None, "cbd",
        "Antiaromatic needs a 4n count AND a flat ring. COT has the count but bends; only cyclobutadiene has both.",
        prov("Huckel counter over three rings; planarity authored for COT", OS_15_3, ["benzene", "cyclobutadiene", "cot", "naphthalene"]),
        struct_visual("naphthalene", f"worked example: naphthalene, flat, {pi_of('naphthalene')} pi electrons, aromatic"),
        ["benzene", "cyclobutadiene", "cot", "naphthalene"],
        tiles=anti_tiles,
    )
    mcq(
        node, "u2-ann-18-n",
        "Find n in 4n + 2 for [18]annulene's pi electrons.",
        [
            ("n4", nn("ann18"), f"Take 2 off {a18['pi']} and divide by 4: {nn('ann18')}. A whole number, so the count passes."),
            ("n45", "n = 4.5", "That divides 18 by 4 without taking the 2 off first. The 2 belongs to the lowest pi level, which holds a pair on its own."),
            ("n18", "n = 18", "That is the electron count itself. n is the number that makes 4n + 2 equal the count."),
        ],
        "n4" if a18["n"] == 4 else None, "n4",
        f"{a18['pi']} pi electrons gives {nn('ann18')}. A whole n means the count passes the 4n + 2 test.",
        prov("Huckel counter: n = (pi - 2) / 4", OS_15_3, ["ann18"]),
        struct_visual("ann18", "[18]annulene"),
        ["ann18"],
    )
    mcq(
        node, "u2-ann-cot-why",
        "Cyclooctatetraene is not antiaromatic. Pick why.",
        [
            ("tub", "It folds into a tub, so the p orbitals misalign", "Bent, the p orbitals no longer overlap all the way round. With no continuous pi system there is nothing to be antiaromatic about."),
            ("count", "Its 8 pi electrons fit 4n + 2", f"Take 2 off 8 and divide by 4: {nn('cot')}, not a whole number. Eight is 4n."),
            ("sp3", "One of its carbons is sp3", "Every carbon in COT sits in a C=C bond, so all eight are sp2 with a p orbital."),
        ],
        "tub" if cot["gate"] == "planar" else None, "tub",
        "COT has a 4n count, which would be antiaromatic if flat. It escapes by folding into a tub, which makes it nonaromatic.",
        prov("Huckel counter: no sp3 atom, 8 pi; the gate fails on the authored planarity", OS_15_3, ["cot"]),
        pair_visual(("cot", "cyclooctatetraene"), ("benzene", "benzene, flat")),
        ["cot", "benzene"],
    )
    mcq(
        node, "u2-ann-azulene",
        "Count azulene's pi electrons round the whole outside.",
        [
            ("eight", "8 pi electrons", "That misses one C=C bond. Count every carbon on the outside once; each sits in one C=C."),
            ("twelve", "12 pi electrons", "That counts the two shared carbons twice, once for each ring. Each carbon has one p orbital, so it gives 1 electron, once."),
            ("ten", f"{az['pi']} pi electrons", f"Ten carbons, five C=C bonds, {az['pi']} electrons. That is 4n + 2 with {nn('azulene')}, so the five and seven rings share one aromatic pi system."),
        ],
        {8: "eight", 10: "ten", 12: "twelve"}.get(az["pi"]), "ten",
        f"Azulene has {az['pi']} pi electrons across both rings, {nn('azulene')}, so it is aromatic like naphthalene.",
        prov("Huckel counter over the whole fused system", OS_15_3, ["azulene"]),
        struct_visual("azulene", "azulene"),
        ["azulene"],
        brief="Each carbon in a C=C gives 1. Count the two shared carbons once.",
    )
    tell_tiles = {
        "benzene": named("benzene", "benzene"),
        "ann18": named("ann18", "[18]annulene"),
        "cbd": named("cyclobutadiene", "cyclobutadiene"),
    }
    frac = [o for o, nm in (("benzene", "benzene"), ("ann18", "ann18"), ("cbd", "cyclobutadiene")) if H(nm)["n"] != int(H(nm)["n"])]
    mcq(
        node, "u2-ann-tell",
        "Pick the ring whose n is not a whole number.",
        [
            ("ann18", "[18]Annulene", f"{a18['pi']} pi electrons gives {nn('ann18')}, a whole number."),
            ("cbd", "Cyclobutadiene", f"Four pi electrons gives {nn('cyclobutadiene')}. Not a whole number, so the count fails."),
            ("benzene", "Benzene", f"{bz['pi']} pi electrons gives {nn('benzene')}, a whole number."),
        ],
        frac[0] if len(frac) == 1 else None, "cbd",
        "A non whole n is the tell that a count fails 4n + 2. Cyclobutadiene's 4 pi electrons give n = 0.5.",
        prov("Huckel counter: n for each ring", OS_15_3, ["benzene", "ann18", "cyclobutadiene", "naphthalene"]),
        struct_visual("naphthalene", f"worked example: naphthalene, {pi_of('naphthalene')} pi electrons, {nn('naphthalene')}"),
        ["benzene", "ann18", "cyclobutadiene", "naphthalene"],
        tiles=tell_tiles,
    )
    frost_mcq(
        node, "u2-ann-frost-cbd", "cyclobutadiene", 4, "cyclobutadiene",
        "Fill the Frost circle for cyclobutadiene. Pick the right filling.",
        ["paired", "right", "more"], "b",
        "Four pi electrons: two in the bottom level, then one in each level of the matched pair. A half full matched pair is the Frost picture of antiaromatic, so it agrees with the count.",
        OS_15_3,
        "Count its pi electrons, then fill from the bottom. Matched levels take one each first.",
    )
    # ROUND 2 (2026-10-17): the cards describe rings by size, shape and count instead of naming
    # molecules, because a molecule identified by name alone breaks the draw-structures rule and a
    # match board has no drawings. Every right card is derived from the counter for its ring.
    def ann_card(name: str) -> str:
        r = H(name)
        return f"Aromatic, n = {int(r['n'])}" if r["klass"] == "aromatic" else class_card(name)

    match(
        node, "u2-ann-match",
        "Match each ring to its verdict.",
        "Run the gate first, then the count.",
        [
            ("six", f"Flat 6 ring, {pi_of('benzene')} pi electrons", f"Aromatic, n = {int(bz['n'])}", f"Flat, every carbon sp2, {pi_of('benzene')} pi electrons: 4n + 2 with {nn('benzene')}.", ann_card("benzene")),
            ("four", f"Flat 4 ring, {pi_of('cyclobutadiene')} pi electrons", "Antiaromatic", "A flat square with 4 pi electrons: 4n and flat, so antiaromatic.", ann_card("cyclobutadiene")),
            ("eight", f"8 ring, {pi_of('cot')} pi, folds to a tub", "Nonaromatic, not flat", "It folds into a tub, so it fails the planarity test before the count matters.", ann_card("cot")),
            ("eighteen", f"Flat 18 ring, {pi_of('ann18')} pi electrons", f"Aromatic, n = {int(a18['n'])}", f"Big enough to stay flat, and {pi_of('ann18')} is 4n + 2 with {nn('ann18')}.", ann_card("ann18")),
        ],
        "Gate first (an sp3 atom or a bent ring means nonaromatic), then the count: 4n + 2 aromatic, 4n antiaromatic.",
        prov("Huckel counter for each card's ring (benzene, cyclobutadiene, COT, [18]annulene); planarity authored for COT", OS_15_3, ["benzene", "cyclobutadiene", "cot", "ann18"]),
        ["benzene", "cyclobutadiene", "cot", "ann18"],
    )
    ladder(
        node, "u2-ann-ladder-cation",
        [
            ("c3", "cyclopropenyl cation", "c3_cation", f"Three p orbitals, {pi_of('c3_cation')} pi electrons, {nn('c3_cation')}. n = 0 is a whole number, so this tiny ring is aromatic."),
            ("c5ene", "cyclopent-2-enyl cation", "c5_ene_cation", "Allylic, but the ring has sp3 CH2 carbons, so it is nonaromatic: no ring bonus either way."),
            ("cp", "cyclopentadienyl cation", "cp_cation", f"Five p orbitals, {pi_of('cp_cation')} pi electrons, flat: antiaromatic, which makes it worse than an ordinary cation."),
        ],
        "self",
        "Rank these cations, most stable first.",
        "Classify each ring: aromatic beats nonaromatic, and nonaromatic beats antiaromatic.",
        "carbocation_stability",
        ("Most stable", "Least stable"),
        "Rank the cyclopropenyl, cyclopent-2-enyl and cyclopentadienyl cations by stability, most stable first.",
        (
            "Cyclopropenyl, then cyclopent-2-enyl, then cyclopentadienyl.",
            "The ring class decides. Two pi electrons in a three ring is aromatic, a ring with sp3 carbons gets no ring effect, and four pi electrons in a flat ring is antiaromatic.",
            "Count each ring's pi electrons, then check every ring atom has a p orbital.",
        ),
        [
            ("reversed", ["cp", "c5ene", "c3"], "ordering_is_reversed", (
                "The right ladder read from the other end.",
                "Every comparison holds, but the track asks for the most stable cation at the top.",
                "Put the aromatic three ring in the first position.",
            )),
            ("small-ring-last", ["c5ene", "c3", "cp"], "ordering_one_adjacent_pair_swapped", (
                "The cyclopropenyl cation is placed below the cyclopentenyl cation.",
                "A three ring looks strained, but its two pi electrons make it aromatic, which outweighs the strain here.",
                "Count the pi electrons in the three ring: 2, and n = 0.",
            )),
        ],
        "Ring class decides cation stability here: aromatic, then nonaromatic, then antiaromatic.",
        prov("ranked by the counter's class only (aromatic > nonaromatic > antiaromatic), no numbers typed", OS_15_4, ["c3_cation", "c5_ene_cation", "cp_cation"]),
        ("aromaticity",),
    )


# ---------------------------------------------------------------------------
# u2-hetero (lesson since round 4: 2 meet at L0, then the rest)
# ---------------------------------------------------------------------------

def node_hetero() -> None:
    node = "u2-hetero"
    py, pyr, fur, thi, imi = H("pyridine"), H("pyrrole"), H("furan"), H("thiophene"), H("imidazole")
    home_opt = {"sp2": "sp2", "p": "p", "sp3": "sp3"}

    # Round 4: a lesson now, so two L0 worked examples open it (the meet step).
    py_pi = pi_of("pyridine")
    mcq(
        node, "u2-het-meet-pyridine",
        "Pyridine's N sits in a C=N bond, so it gives 1, like a carbon. Count its pi electrons.",
        [
            ("eight", "8 pi electrons", "That adds the N lone pair too. The N already gives 1 through its C=N bond, so its pair stays out."),
            ("five", "5 pi electrons", "That leaves out the N. It is in a C=N bond, so it gives 1, the same as each carbon."),
            ("six", f"{py_pi} pi electrons", f"Five carbons and one N, each giving 1: {py_pi}, {nn('pyridine')}. The same count as benzene."),
        ],
        "six" if py_pi == 6 else None, "six",
        f"Worked example. An atom in a ring double bond gives 1, whatever its element. Pyridine has {py_pi} pi electrons and is aromatic, like benzene.",
        prov("Huckel counter: N in a ring pi bond gives 1", OS_15_5, ["pyridine"]),
        struct_visual("pyridine", "pyridine, lone pair drawn", pairs=True),
        ["pyridine"],
        brief="An N in a ring double bond counts like a carbon.",
        level=0,
    )
    joins = {"pyrrole": home_of("pyrrole", "N") == "p", "pyridine": home_of("pyridine", "N") == "p"}
    which = "pyrrole" if joins["pyrrole"] and not joins["pyridine"] else "pyridine" if joins["pyridine"] and not joins["pyrrole"] else None
    mcq(
        node, "u2-het-meet-contrast",
        "Compare the two nitrogens. Pick the one whose lone pair joins the ring's pi system.",
        [
            ("pyridine", "Pyridine's N", "Pyridine's N already gives 1 through its C=N bond. Its pair points out of the ring, in the plane."),
            ("pyrrole", "Pyrrole's N", f"Pyrrole's N has an H and no ring double bond. Its pair sits in the p orbital and joins: 4 plus 2 is {pi_of('pyrrole')}."),
            ("both", "Both of them", "Only one of them needs its pair. An N that already has a ring double bond keeps its pair out."),
        ],
        which, "pyrrole",
        "Worked example. The rule is one question: does the N already have a ring double bond. Yes (pyridine): it gives 1 and the pair sits out. No (pyrrole): the pair goes in.",
        prov("Huckel counter: where each N keeps its pair", OS_15_5, ["pyridine", "pyrrole"]),
        pair_visual(("pyridine", "pyridine"), ("pyrrole", "pyrrole"), kw_a={"pairs": True}, kw_b={"pairs": True}),
        ["pyridine", "pyrrole"],
        brief="Look for a ring double bond on each N first.",
        level=0,
    )

    mcq(
        node, "u2-het-pyridine-pair",
        "Pick where pyridine's nitrogen keeps its lone pair.",
        [
            ("p", "In a p orbital, part of the pi system", "The N already sits in a ring C=N bond, so its p orbital is used by that pi bond. The pair has to go somewhere else."),
            ("sp2", "In an sp2 orbital, in the ring plane", "The N gives 1 electron to the ring through its C=N pi bond, like a carbon. The pair sits in an sp2 orbital pointing out from the ring, in the plane, and is not counted."),
            ("sp3", "In an sp3 orbital", "The N is part of a flat ring with a C=N bond, so it is sp2, not sp3."),
        ],
        home_opt.get(home_of("pyridine", "N")), "sp2",
        f"Pyridine's N is in a C=N bond, so its pair sits in an sp2 orbital in the plane. The ring has {py['pi']} pi electrons, like benzene.",
        prov("Huckel counter: N in a ring pi bond gives 1 and keeps its pair in an sp2 orbital", OS_15_5, ["pyridine"]),
        struct_visual("pyridine", "pyridine, lone pair drawn", pairs=True),
        ["pyridine"],
    )
    mcq(
        node, "u2-het-pyrrole-pair",
        "Pick where pyrrole's nitrogen keeps its lone pair.",
        [
            ("sp2", "In an sp2 orbital, in the ring plane", "That is pyridine's N, which has a C=N bond. Pyrrole's N has an H instead and no ring double bond."),
            ("sp3", "In an sp3 orbital", "If the N were sp3 the ring would have no p orbital there and would not be aromatic. It rehybridises to sp2 so the pair can join."),
            ("p", "In a p orbital, part of the pi system", f"The N has no ring double bond, so its pair sits in the p orbital and joins the ring: 4 from the two C=C bonds plus 2 from N is {pyr['pi']}."),
        ],
        home_opt.get(home_of("pyrrole", "N")), "p",
        f"Pyrrole's N lone pair is in the p orbital and is counted, giving {pyr['pi']} pi electrons. That is why pyrrole is aromatic.",
        prov("Huckel counter: N with a pair and no ring pi bond gives 2", OS_15_5, ["pyrrole"]),
        struct_visual("pyrrole", "pyrrole, lone pair drawn", pairs=True),
        ["pyrrole"],
    )
    mcq(
        node, "u2-het-pyrrole-count",
        "Count pyrrole's pi electrons.",
        [
            ("four", "4 pi electrons", "That counts the two C=C bonds and leaves out the N lone pair, which sits in a p orbital and is part of the ring."),
            ("six", f"{pyr['pi']} pi electrons", f"Two C=C bonds give 4, and the N lone pair in its p orbital gives 2: {pyr['pi']}, {nn('pyrrole')}."),
            ("eight", "8 pi electrons", "That counts the N-H bond as well. Only the lone pair joins; the N-H bond is a sigma bond in the plane."),
        ],
        "six" if pyr["pi"] == 6 else None, "six",
        f"Pyrrole has {pyr['pi']} pi electrons: four from carbon, two from the N lone pair. That gives {nn('pyrrole')}, so it is aromatic.",
        prov("Huckel counter per atom", OS_15_5, ["pyrrole"]),
        struct_visual("pyrrole", "pyrrole", pairs=True),
        ["pyrrole"],
    )
    fur_in = sum(1 for i, v in fur["per"].items() if v == 2 and kekule(fur["smi"]).GetAtomWithIdx(i).GetSymbol() == "O")
    mcq(
        node, "u2-het-furan-pairs",
        "Furan's oxygen has two lone pairs. Pick how many join the pi system.",
        [
            ("none", "Neither pair", "With no pair from O the ring would have only 4 pi electrons and a gap in the loop. One pair fills the O's p orbital."),
            ("both", "Both pairs", "An atom has only one p orbital facing the pi system. Two pairs would need two, and the count would be 8."),
            ("one", "One pair; the other sits in the plane", f"One pair fills the O's p orbital and joins the ring, giving {fur['pi']}. The second pair sits in an sp2 orbital in the ring plane and is not counted."),
        ],
        {1: "one", 0: "none"}.get(fur_in), "one",
        f"Only one of oxygen's pairs joins the ring, so furan has {fur['pi']} pi electrons. The other pair points out, in the plane.",
        prov("Huckel counter: an O with no ring pi bond gives exactly one pair; the other is recorded as sp2", OS_15_5, ["furan"]),
        struct_visual("furan", "furan, both pairs drawn", pairs=True),
        ["furan"],
    )
    mcq(
        node, "u2-het-thiophene",
        "Count thiophene's pi electrons.",
        [
            ("eight", "8 pi electrons", "That counts both S lone pairs. Only one fits the p orbital that faces the ring; the other sits in the plane."),
            ("six", f"{thi['pi']} pi electrons", f"Two C=C bonds give 4, and one S pair gives 2: {thi['pi']}. That is {nn('thiophene')}, so thiophene is aromatic."),
            ("four", "4 pi electrons", "That leaves the S out. With no pair from S the loop would have a gap. One S pair fills it."),
        ],
        {4: "four", 6: "six", 8: "eight"}.get(thi["pi"]), "six",
        f"Thiophene counts like furan: {thi['pi']} pi electrons, {nn('thiophene')}, aromatic.",
        prov("Huckel counter: S with no ring pi bond gives exactly one pair", OS_15_5, ["thiophene"]),
        struct_visual("thiophene", "thiophene, both pairs drawn", pairs=True),
        ["thiophene"],
    )
    n_h = hetero_index("imidazole", "N", True)
    n_bare = hetero_index("imidazole", "N", False)
    in_pi = [o for o, i in (("nh", n_h), ("n", n_bare)) if imi["home"].get(i) == "p"]
    mcq(
        node, "u2-het-imid-which",
        "Pick the imidazole nitrogen whose lone pair is part of the pi system.",
        [
            ("n", "The circled N, with no H", "This N is in a C=N bond. Like pyridine's N, it gives 1 electron through that bond and keeps its pair in the plane."),
            ("nh", "The circled N-H", "This N has no ring double bond, so like pyrrole's N its pair sits in the p orbital and joins the ring."),
            ("both", "Both nitrogens", f"Both pairs in would make 8. The ring has {imi['pi']}: one N is pyrrole-like, the other pyridine-like."),
        ],
        in_pi[0] if len(in_pi) == 1 else None, "nh",
        f"Imidazole has one pyrrole-like N (pair in the ring) and one pyridine-like N (pair in the plane). Total: {imi['pi']} pi electrons.",
        prov("Huckel counter per atom", OS_15_5, ["imidazole"]),
        struct_visual("imidazole", "imidazole", pairs=True),
        ["imidazole"],
        tiles={
            "n": named("imidazole", "the N with no H", marks=[n_bare]),
            "nh": named("imidazole", "the N-H", marks=[n_h]),
            "both": named("imidazole", "both nitrogens", marks=[n_h, n_bare]),
        },
    )
    imi_atoms = {"nh": n_h, "n": n_bare, "c": 3, "c2": 0}
    free = [o for o, i in imi_atoms.items() if imi["home"].get(i) == "sp2"]
    imi_m = kekule(imi["smi"])

    def imi_why(i: int) -> str:
        home = imi["home"].get(i)
        if home == "p":
            return "This N carries the H. Its pair is in the pi system, and using it for a proton would break the aromatic loop."
        if home == "sp2":
            return "This N has no H. Its pair sits in the plane, outside the pi system, so it can take a proton and the ring stays aromatic."
        if imi_m.GetAtomWithIdx(i).GetSymbol() == "C":
            return "A ring carbon. It has no lone pair to give a proton."
        return "No lone pair here to give a proton."

    imi_options, imi_visual = atom_choice("imidazole", "imidazole, both pairs drawn", imi_atoms, imi_why, pairs=True)
    mcq(
        node, "u2-het-imid-base",
        "Find the lettered imidazole atom that picks up a proton.",
        imi_options,
        free[0] if len(free) == 1 else None, "n",
        "A lone pair outside the pi system is free to grab a proton. In imidazole that is the pyridine-like N.",
        prov("Huckel counter: the N whose pair is sp2, in the plane, is the base", OS_15_5, ["imidazole"]),
        imi_visual,
        ["imidazole"],
    )
    pairs_tiles = {
        "pyrrole": smi_named(SPECIES["pyrrole"][0], "pyrrole", "u2-het-matched::pyrrole"),
        "pyrroline": smi_named(SPECIES["pyrroline"][0], "2,5-dihydro-1H-pyrrole", "u2-het-matched::pyrroline"),
        "pyrrolidine": smi_named(SPECIES["pyrrolidine"][0], "pyrrolidine", "u2-het-matched::pyrrolidine"),
    }
    aro = [o for o in ("pyrrole", "pyrroline", "pyrrolidine") if H(o)["klass"] == "aromatic"]
    mcq(
        node, "u2-het-matched",
        "Same N, same ring size. Pick the aromatic one.",
        [
            ("pyrroline", "2,5-Dihydro-1H-pyrrole", "Its two CH2 carbons are sp3 with no p orbital. The pi system cannot get round the ring."),
            ("pyrrolidine", "Pyrrolidine", "No pi bonds at all. Every ring carbon is sp3."),
            ("pyrrole", "Pyrrole", f"Every ring atom offers a p orbital, the N pair included: {pi_of('pyrrole')} pi electrons."),
        ],
        aro[0] if len(aro) == 1 else None, "pyrrole",
        "Matched pairs: the same heteroatom in the same ring, but saturation decides. One sp3 carbon breaks aromaticity.",
        prov("Huckel counter on each ring", OS_15_5, ["pyrrole", "pyrroline", "pyrrolidine", "benzene", "chd13"]),
        pair_visual(("benzene", "worked pair: benzene, aromatic"), ("chd13", "add H2: two sp3 carbons, not aromatic"), kw_b={"marks": H("chd13")["broken"]}),
        ["pyrrole", "pyrroline", "pyrrolidine", "benzene", "chd13"],
        tiles=pairs_tiles,
    )
    dhf = H("dihydrofuran")
    mcq(
        node, "u2-het-dihydrofuran",
        "Furan is aromatic and 2,3-dihydrofuran is not. Pick what breaks it.",
        [
            ("o", "The O lone pairs sit out", "O behaves the same in both rings. The difference is in the carbons."),
            ("sp3", "Two sp3 carbons with no p orbital", "The circled CH2 carbons are sp3. With no p orbital there, the ring's pi system has a gap."),
            ("count", "The pi count is 4n", "The count never gets asked: the ring fails the p orbital test first."),
        ],
        "sp3" if dhf["gate"] == "porbital" else None, "sp3",
        "Same heteroatom, different saturation. Adding two H atoms across one C=C makes two sp3 carbons, and the ring is no longer aromatic.",
        prov("Huckel counter: first failed gate is the p orbital test", OS_15_5, ["furan", "dihydrofuran"]),
        pair_visual(("furan", "furan"), ("dihydrofuran", "2,3-dihydrofuran"), kw_b={"marks": dhf["broken"]}),
        ["furan", "dihydrofuran"],
    )
    prot = {"pyrH": "pyrrolium", "pyH": "pyridinium", "pyrdH": "pyrrolidinium"}
    stays = [o for o, nm in prot.items() if H(nm)["klass"] == "aromatic"]
    mcq(
        node, "u2-het-protonate",
        "A proton lands on each nitrogen. Pick the ring that stays aromatic.",
        [
            ("pyrH", "Protonated pyrrole", "Pyrrole's N pair was part of the ring. Used for the proton, the N gets four single bonds and turns sp3, with no p orbital, so the loop has a gap."),
            ("pyH", "Protonated pyridine", f"Pyridine's pair was in the plane, outside the ring. Protonating it leaves all {pi_of('pyridinium')} pi electrons in place."),
            ("pyrdH", "Protonated pyrrolidine", "Pyrrolidine had no pi bonds to begin with. Every ring carbon is sp3, before and after."),
        ],
        stays[0] if len(stays) == 1 else None, "pyH",
        "Pyridine is a base because its pair is outside the pi system. Pyrrole's pair is part of the ring, so it is a very weak base.",
        prov("Huckel counter on the three N-protonated rings", OS_15_5, ["pyridinium", "pyrrolium", "pyrrolidinium", "pyridine", "pyrrole"]),
        pair_visual(("pyridine", "pyridine, before"), ("pyrrole", "pyrrole, before"), kw_a={"pairs": True}, kw_b={"pairs": True}),
        ["pyridinium", "pyrrolium", "pyrrolidinium", "pyridine", "pyrrole"],
        tiles={
            "pyrH": named("pyrrolium", "N-protonated pyrrole"),
            "pyH": named("pyridinium", "pyridinium"),
            "pyrdH": named("pyrrolidinium", "pyrrolidinium"),
        },
    )
    dhp = H("dihydropyridine")
    dhp_atoms = {"a": 0, "b": 5, "c": 2, "d": 3}
    dhp_hits = [o for o, i in dhp_atoms.items() if i in dhp["broken"]]
    dhp_m = kekule(dhp["smi"])

    def dhp_why(i: int) -> str:
        # The element is checked first: the counter clears the N's tally to None
        # once the loop is broken, so a None test first gave the N the CH2 text
        # (23 Oct audit 2a #5).
        if dhp_m.GetAtomWithIdx(i).GetSymbol() == "N":
            return "This is the N-H. Its pair can sit in a p orbital, as in pyrrole, so it does not break the loop. The trouble is elsewhere."
        if dhp["per"][i] is None:
            return "This is the CH2 opposite N. It is sp3 with no p orbital, so the loop stops here, whatever the N does."
        return "This carbon is in a C=C bond, so it has a p orbital that joins the loop."

    dhp_options, dhp_visual = atom_choice("dihydropyridine", "1,4-dihydropyridine", dhp_atoms, dhp_why)
    mcq(
        node, "u2-het-dhp",
        "Find the lettered atom that keeps 1,4-dihydropyridine from being aromatic.",
        dhp_options,
        dhp_hits[0] if len(dhp_hits) == 1 else None, "b",
        "One sp3 ring carbon is enough to make a ring nonaromatic, whatever the heteroatom does.",
        prov("Huckel counter: first failed gate", OS_15_5, ["dihydropyridine"]),
        dhp_visual,
        ["dihydropyridine"],
        brief="Go round the ring one atom at a time. For each, ask whether it has a p orbital.",
    )

    def home_card(name: str, symbol: str) -> str:
        return HOME_TEXT[home_of(name, symbol)]

    match(
        node, "u2-het-match",
        "Match each heteroatom to where its lone pair sits.",
        "Find each N or O on its ring first, and look at the bonds it already has.",
        [
            ("pyridine", "Pyridine N", "sp2 orbital, in the ring plane", "The N is in a C=N bond, so the pair points out, in the plane.", home_card("pyridine", "N")),
            ("pyrrole", "Pyrrole N", "p orbital, in the pi system", "No ring double bond on N, so the pair fills the p orbital and is counted.", home_card("pyrrole", "N")),
            ("furan", "Furan O", "One pair in p, one in the plane", "Only one of O's two pairs fits the p orbital. The other lies in the plane.", home_card("furan", "O")),
            ("pyrrolidine", "Pyrrolidine N", "sp3, no pi system to join", "The ring has no pi bonds, so the N is a plain sp3 amine.", home_card("pyrrolidine", "N")),
        ],
        "Lone pair bookkeeping: an atom already in a ring pi bond keeps its pair in the plane; an atom without one puts one pair into the ring.",
        prov("Huckel counter: orbital recorded for every ring heteroatom pair", OS_15_5, ["pyridine", "pyrrole", "furan", "pyrrolidine"]),
        ["pyridine", "pyrrole", "furan", "pyrrolidine"],
    )


# ---------------------------------------------------------------------------
# u2-charged (lesson since round 4: 2 meet at L0, then the rest)
# ---------------------------------------------------------------------------

def node_charged() -> None:
    node = "u2-charged"
    cl = {k: H(k)["klass"] for k in ("cp_anion", "cp_cation", "tropylium", "c7_anion", "c3_cation", "c3_anion")}

    # Round 4 (wiring piece): this node now plays the seven-slot lesson, so it
    # opens on two first-meeting worked examples at L0 (the meet step, which
    # cannot fail), the encoding layer before retrieval (justin-sung.md 1).
    def charged_atom(name: str) -> int:
        hits = [a.GetIdx() for a in kekule(SPECIES[name][0]).GetAtoms() if a.GetFormalCharge() != 0]
        if len(hits) != 1:
            fail(f"{name}: expected one charged ring atom, found {hits}")
        return hits[0] if hits else -1

    give = {0: "none", 1: "one", 2: "pair"}
    cpa_gives = H("cp_anion")["per"].get(charged_atom("cp_anion"))
    mcq(
        node, "u2-chg-meet-anion",
        "Take H+ off cyclopentadiene's CH2. Pick what that carbon now gives the ring.",
        [
            ("pair", "2 electrons, a lone pair in a p orbital", f"The C-H bond's pair stays on carbon. The carbon flattens to sp2 and its pair sits in the p orbital, so the loop closes with {pi_of('cp_anion')} pi electrons."),
            ("none", "Nothing, it stays sp3", "Before, the CH2 was sp3 and broke the loop. Losing H+ leaves a lone pair on that carbon, and the pair needs a p orbital to join."),
            ("one", "1 electron, like a C=C carbon", "That carbon has no ring double bond. What it has is a whole lone pair, so it gives 2, not 1."),
        ],
        give.get(cpa_gives), "pair",
        f"Worked example. Cyclopentadiene fails the gate at its CH2. Remove H+ and that carbon keeps a lone pair in a p orbital: 4 from the C=C bonds plus 2 is {pi_of('cp_anion')}, {nn('cp_anion')}, aromatic.",
        prov("Huckel counter per atom: the carbanion carbon gives 2", OS_15_4, ["cyclopentadiene", "cp_anion"]),
        pair_visual(("cyclopentadiene", "cyclopentadiene"), ("cp_anion", "cyclopentadienyl anion")),
        ["cyclopentadiene", "cp_anion"],
        brief="A negative ring carbon holds a lone pair. Ask where that pair sits.",
        level=0,
    )
    trop_gives = H("tropylium")["per"].get(charged_atom("tropylium"))
    mcq(
        node, "u2-chg-meet-cation",
        "The cation's plus carbon has an empty p orbital. Pick what it gives the ring.",
        [
            ("one", "1 electron, like a C=C carbon", "That carbon has no ring double bond. Its p orbital is there but empty, so it adds an orbital and no electrons."),
            ("pair", "2 electrons", "Two would be a lone pair, which is the anion. A cation has lost electrons from that carbon."),
            ("none", "0 electrons, but it closes the loop", f"An empty p orbital still overlaps with its neighbours, so the loop is complete. The three C=C bonds give all {pi_of('tropylium')} pi electrons."),
        ],
        give.get(trop_gives), "none",
        f"Worked example. An empty p orbital counts 0 electrons but keeps the ring of p orbitals unbroken. Three C=C bonds give {pi_of('tropylium')}, {nn('tropylium')}, so this cation is aromatic.",
        prov("Huckel counter per atom: the carbocation carbon gives 0", OS_15_4, ["tropylium"]),
        struct_visual("tropylium", "cycloheptatrienyl cation"),
        ["tropylium"],
        brief="A positive ring carbon is sp2 with an empty p orbital.",
        level=0,
    )

    def classify(id: str, name: str, caption: str, prompt: str, whys: dict, order: tuple, expl: str, brief: str | None = None) -> None:
        mcq(
            node, id, prompt, class_options(name, whys, order), cl[name], AUTHORED[id], expl,
            prov("Huckel counter; Frost circle agrees", OS_15_4, [name]),
            struct_visual(name, caption), [name], brief=brief,
        )

    AUTHORED = {
        "u2-chg-cp-anion": "aromatic", "u2-chg-c7-anion": "antiaromatic", "u2-chg-c3-anion": "antiaromatic",
    }
    classify("u2-chg-cp-anion", "cp_anion", "cyclopentadienyl anion",
             "Classify the cyclopentadienyl anion.",
             {"aromatic": f"The charged carbon's lone pair sits in a p orbital: 4 from the C=C bonds plus 2 is {pi_of('cp_anion')}, {nn('cp_anion')}.",
              "antiaromatic": "That would be 4 pi electrons. The lone pair on the charged carbon counts too.",
              "nonaromatic": "Removing H+ turned the sp3 CH2 into a carbon with a lone pair in a p orbital, so the loop is complete."},
             ("antiaromatic", "aromatic", "nonaromatic"),
             f"The anion's lone pair joins the ring: {pi_of('cp_anion')} pi electrons, aromatic.",
             brief="Decide first what the charged carbon's lone pair is doing.")
    def count_n(o: str, pi: int, n: float, why: str) -> tuple[str, str, str]:
        """One option that answers BOTH halves: a pi count and the n it gives."""
        return (o, f"{pi} pi electrons, {n_text(n)}", why)

    def count_n_key(name: str, options: list[tuple[str, str, str]]) -> str | None:
        r = H(name)
        want = f"{r['pi']} pi electrons, {n_text(r['n'])}"
        hits = [o for o, t, _ in options if t == want]
        return hits[0] if len(hits) == 1 else None

    cpc = H("cp_cation")
    cpc_opts = [
        count_n("five", 5, 0.75, "That gives the charged carbon 1, like a C=C carbon. Its p orbital is empty, so it gives 0."),
        count_n("fourone", 4, 1.0, "The count is right, and 4 is 4n with n = 1, the antiaromatic test. The question asks for n in 4n + 2: take 2 off first, then divide by 4."),
        count_n("four", cpc["pi"], cpc["n"], f"Two C=C bonds give {cpc['pi']} and the empty p orbital gives 0. Take 2 off and divide by 4: {n_text(cpc['n'])}, not whole, so it is not aromatic. {cpc['pi']} is 4n ({n_text(cpc['pi'] / 4)}), so if the ring stays flat it is antiaromatic."),
        count_n("six", 6, 1.0, "That gives the charged carbon a lone pair. That is the anion; the cation's p orbital is empty."),
    ]
    mcq(
        node, "u2-chg-cp-cation",
        "Count the cyclopentadienyl cation's pi electrons, then find n in 4n + 2.",
        cpc_opts,
        count_n_key("cp_cation", cpc_opts), "four",
        f"The cation has {cpc['pi']} pi electrons. 4n + 2 gives {n_text(cpc['n'])}, so it is not aromatic; {cpc['pi']} is 4n, so the flat ring is antiaromatic.",
        prov("Huckel counter: empty p counts 0; n = (pi - 2) / 4", OS_15_4, ["cp_cation"]),
        struct_visual("cp_cation", "cyclopentadienyl cation"),
        ["cp_cation"],
        brief="Go atom by atom: what each ring atom puts in, then n from the total.",
    )
    trop = H("tropylium")
    mcq(
        node, "u2-chg-tropylium",
        "Count the cycloheptatrienyl cation's pi electrons.",
        [
            ("seven", "7 pi electrons", "That gives the charged carbon 1, like a C=C carbon. Its p orbital is empty, so it gives 0."),
            ("eight", "8 pi electrons", "That gives the charged carbon a lone pair. That is the anion. The cation's p orbital is empty."),
            ("six", f"{trop['pi']} pi electrons", f"Three C=C bonds give {trop['pi']}, and the empty p orbital gives 0 but closes the loop. That is {nn('tropylium')}, so it is aromatic."),
        ],
        {6: "six", 7: "seven", 8: "eight"}.get(trop["pi"]), "six",
        f"Tropylium has {trop['pi']} pi electrons over seven p orbitals: aromatic, and unusually stable for a cation.",
        prov("Huckel counter per atom: the cationic carbon gives 0", OS_15_4, ["tropylium"]),
        struct_visual("tropylium", "cycloheptatrienyl cation"),
        ["tropylium"],
    )
    classify("u2-chg-c7-anion", "c7_anion", "cycloheptatrienyl anion",
             "Classify the cycloheptatrienyl anion, taken as flat.",
             {"aromatic": "Adding two electrons to aromatic tropylium gives 8, which is 4n.",
              "antiaromatic": f"Three C=C bonds plus the lone pair: {pi_of('c7_anion')} pi electrons, 4n, in a flat ring.",
              "nonaromatic": "Taken as flat, every atom offers a p orbital. The count decides, not the gate."},
             ("aromatic", "antiaromatic", "nonaromatic"),
             f"With {pi_of('c7_anion')} pi electrons the flat anion is antiaromatic. The real anion may distort to escape it, like COT.")
    c3c = H("c3_cation")
    c3c_opts = [
        count_n("twohalf", 2, 0.5, "The count is right, but that is 2 divided by 4, n in 4n. The question asks for n in 4n + 2: take 2 off first, then divide by 4."),
        count_n("two", c3c["pi"], c3c["n"], f"One C=C gives {c3c['pi']}, and the empty p orbital gives 0. Take 2 off and divide by 4: {n_text(c3c['n'])}. Zero is a whole number, so the ring is aromatic."),
        count_n("three", 3, 0.25, "That gives the charged carbon 1, like a C=C carbon. Its p orbital is empty, so it gives 0."),
        count_n("four", 4, 0.5, "That counts the charged carbon as if it had a pair. That is the anion; the cation's p orbital is empty."),
    ]
    mcq(
        node, "u2-chg-c3-cation",
        "Count the cyclopropenyl cation's pi electrons, then find n in 4n + 2.",
        c3c_opts,
        count_n_key("c3_cation", c3c_opts), "two",
        f"The smallest aromatic ring: {c3c['pi']} pi electrons, {n_text(c3c['n'])}, and zero counts as a whole number.",
        prov("Huckel counter: empty p counts 0; n = (pi - 2) / 4", OS_15_4, ["c3_cation"]),
        struct_visual("c3_cation", "cyclopropenyl cation"),
        ["c3_cation"],
        brief="Go atom by atom: what each of the three ring atoms puts in, then n from the total.",
    )
    classify("u2-chg-c3-anion", "c3_anion", "cyclopropenyl anion",
             "Classify the cyclopropenyl anion.",
             {"aromatic": "That is the cation. The anion adds two more electrons.",
              "antiaromatic": f"One C=C plus a lone pair in a p orbital: {pi_of('c3_anion')} pi electrons, 4n, in a flat triangle.",
              "nonaromatic": "The charged carbon's pair sits in a p orbital, so the loop is complete."},
             ("aromatic", "nonaromatic", "antiaromatic"),
             f"The anion has {pi_of('c3_anion')} pi electrons: antiaromatic.")

    frost_mcq(
        node, "u2-chg-frost-cp", "cp_cation", 5, "the cyclopentadienyl cation",
        "Fill the Frost circle for the cyclopentadienyl cation. Pick the right filling.",
        ["right", "more", "paired"], "a",
        "Four pi electrons: two in the bottom level, then one in each level of the matched pair above. Half full is the Frost picture of antiaromatic.",
        OS_15_4,
        "Count its pi electrons first. Then fill from the bottom, one per matched level before pairing.",
    )
    frost_mcq(
        node, "u2-chg-frost-trop", "tropylium", 7, "tropylium",
        "Fill the Frost circle for tropylium. Pick the right filling.",
        ["less", "more", "right"], "c",
        "Six pi electrons fill the bottom level and the first matched pair exactly. Every occupied level is full, a closed shell: aromatic.",
        OS_15_4,
        "Count its pi electrons first, atom by atom. Then fill from the bottom.",
    )
    acid_tiles = {
        "cpd": smi_named(SPECIES["cyclopentadiene"][0], "cyclopenta-1,3-diene", "u2-chg-acid-pick::cpd"),
        "chd": smi_named(SPECIES["chd13"][0], "cyclohexa-1,3-diene", "u2-chg-acid-pick::chd"),
        "cht": smi_named(SPECIES["cycloheptatriene"][0], "cyclohepta-1,3,5-triene", "u2-chg-acid-pick::cht"),
    }
    best = sorted((CLASS_RANK[H(BASE_OF[nm])["klass"]], o) for o, nm in (("cpd", "cyclopentadiene"), ("chd", "chd13"), ("cht", "cycloheptatriene")))
    mcq(
        node, "u2-chg-acid-pick",
        "Pick the most acidic hydrocarbon. Judge each by its conjugate base.",
        [
            ("chd", "Cyclohexa-1,3-diene", f"Its anion spreads the charge over {NUM_WORD[charge_carbons('c6_anion')]} carbons, but the ring still has an sp3 CH2. Nonaromatic: no ring bonus."),
            ("cht", "Cyclohepta-1,3,5-triene", f"Its anion has {pi_of('c7_anion')} pi electrons in the ring, 4n. Taken as flat that is antiaromatic, which makes the base worse, not better."),
            ("cpd", "Cyclopenta-1,3-diene", f"Losing H+ from the CH2 gives an anion with {pi_of('cp_anion')} pi electrons, aromatic. A very stable base means a strong acid."),
        ],
        best[0][1] if best[0][0] != best[1][0] else None, "cpd",
        "Acidity is argued on the conjugate base: the more stable the base, the stronger the acid. Only cyclopentadiene gives an aromatic anion.",
        prov("counter class of each conjugate base, ranked aromatic > nonaromatic > antiaromatic; no pKa typed", OS_15_4, ["cyclopentadiene", "chd13", "cycloheptatriene", "cp_anion", "c6_anion", "c7_anion"]),
        {"kind": "structure", "figure": ACID_SCHEME, "name": "judge the acid by the base it leaves"},
        ["cyclopentadiene", "chd13", "cycloheptatriene", "cp_anion", "c6_anion", "c7_anion"],
        tiles=acid_tiles,
        concepts=("aromaticity", "conjugate_base_stability_argument"),
    )
    mcq(
        node, "u2-chg-acid-why",
        "Cyclopentadiene is unusually acidic for a hydrocarbon. Pick why.",
        [
            ("sp", "Its C-H bond is on an sp carbon", "The acidic CH2 is sp3. The effect comes from what happens after the proton leaves."),
            ("aro", "Its conjugate base is aromatic", f"Removing H+ leaves a lone pair in a p orbital, completing a loop of {pi_of('cp_anion')} pi electrons. An aromatic base is a stable base."),
            ("anti", "Its conjugate base is antiaromatic", "An antiaromatic base would be unstable, which would make the acid weaker, not stronger."),
        ],
        "aro" if H("cp_anion")["klass"] == "aromatic" else None, "aro",
        "Look at the conjugate base. The cyclopentadienyl anion is aromatic, so cyclopentadiene gives up its proton far more easily than other hydrocarbons.",
        prov("counter class of the conjugate base", OS_15_4, ["cyclopentadiene", "cp_anion"]),
        pair_visual(("cyclopentadiene", "cyclopentadiene"), ("cp_anion", "its conjugate base")),
        ["cyclopentadiene", "cp_anion"],
        concepts=("aromaticity", "conjugate_base_stability_argument"),
    )
    ladder(
        node, "u2-chg-ladder-anion",
        [
            ("cp", "cyclopentadienyl anion", "cp_anion", f"{pi_of('cp_anion')} pi electrons in a flat five ring: aromatic, the most stable of the three."),
            ("c6", "cyclohexadienyl anion", "c6_anion", f"The charge spreads over {NUM_WORD[charge_carbons('c6_anion')]} carbons, but the sp3 CH2 breaks the ring: nonaromatic, no ring bonus."),
            ("c3", "cyclopropenyl anion", "c3_anion", f"{pi_of('c3_anion')} pi electrons in a flat triangle: antiaromatic, the least stable."),
        ],
        "self",
        "Rank these carbanions, most stable first.",
        "Classify each ring first: aromatic, nonaromatic, antiaromatic.",
        "carbanion_stability",
        ("Most stable", "Least stable"),
        "Rank the cyclopentadienyl, cyclohexadienyl and cyclopropenyl anions by stability, most stable first.",
        (
            "Cyclopentadienyl, then cyclohexadienyl, then cyclopropenyl.",
            "Aromatic beats nonaromatic, and nonaromatic beats antiaromatic. The six pi five ring is aromatic, the six ring has an sp3 carbon, and the four pi triangle is antiaromatic.",
            "Check each ring for an sp3 carbon, then count the pi electrons.",
        ),
        [
            ("reversed", ["c3", "c6", "cp"], "ordering_is_reversed", (
                "The right ladder read from the other end.",
                "Every comparison holds, but the track asks for the most stable anion at the top.",
                "Put the aromatic anion in the first position.",
            )),
            ("anti-above-non", ["cp", "c3", "c6"], "ordering_one_adjacent_pair_swapped", (
                "The cyclopropenyl anion is placed above the cyclohexadienyl anion.",
                "Its loop is complete, but with 4 pi electrons that loop makes it antiaromatic, which is worse than having no ring effect at all.",
                "Count the cyclopropenyl anion's pi electrons: 4, which is 4n.",
            )),
        ],
        "Ring class ranks these anions: aromatic, then nonaromatic, then antiaromatic.",
        prov("ranked by the counter's class only, no numbers typed", OS_15_4, ["cp_anion", "c6_anion", "c3_anion"]),
        ("aromaticity", "carbanion_stability"),
    )
    ladder(
        node, "u2-chg-ladder-acid",
        [
            ("cpd", "cyclopenta-1,3-diene", "cyclopentadiene", f"Its conjugate base has {pi_of('cp_anion')} pi electrons and is aromatic, so it is the strongest acid here."),
            ("chd", "cyclohexa-1,3-diene", "chd13", "Its conjugate base keeps an sp3 CH2, so it is nonaromatic: no bonus, no penalty."),
            ("cpe", "cyclopropene", "cyclopropene", f"Its conjugate base has {pi_of('c3_anion')} pi electrons in a flat triangle, antiaromatic, so it is the weakest acid."),
        ],
        "base",
        "Rank these by acidity at the CH2, most acidic first.",
        "Remove H+ from the CH2 and classify the anion left behind.",
        "acidity",
        ("Most acidic", "Least acidic"),
        "Rank cyclopenta-1,3-diene, cyclohexa-1,3-diene and cyclopropene by the acidity of their CH2 hydrogens, most acidic first.",
        (
            "Cyclopentadiene, then cyclohexadiene, then cyclopropene.",
            "Acidity follows conjugate base stability. The bases are aromatic, nonaromatic and antiaromatic, in that order.",
            "Draw each conjugate base and run the four tests on it.",
        ),
        [
            ("reversed", ["cpe", "chd", "cpd"], "ordering_is_reversed", (
                "The right ladder read from the other end.",
                "Every comparison holds, but the track asks for the most acidic compound at the top.",
                "Put the acid with the aromatic conjugate base first.",
            )),
            ("judged-the-acid", ["chd", "cpd", "cpe"], "ordering_one_adjacent_pair_swapped", (
                "Cyclohexadiene is placed above cyclopentadiene.",
                "Neither acid is aromatic as drawn, so judging the acids themselves cannot separate them. The bases differ: only cyclopentadiene's is aromatic.",
                "Remove the proton and classify each anion.",
            )),
        ],
        "Argue acidity on the conjugate base: aromatic base, strong acid; antiaromatic base, weak acid.",
        prov("ranked by the counter's class of each conjugate base, no pKa typed", OS_15_4, ["cyclopentadiene", "chd13", "cyclopropene", "cp_anion", "c6_anion", "c3_anion"]),
        ("aromaticity", "conjugate_base_stability_argument"),
    )


# ---------------------------------------------------------------------------
# u2-nmr (lesson): 2 meet at L0, 2 at rung 1
# ---------------------------------------------------------------------------

def ppm_scale() -> dict:
    """
    The chemical shift axis on its own, 10 ppm on the left to below 0 on the
    right, with the downfield and upfield ends named. It is the question
    drawing for "most shielded H", so the stem shows where to look without
    drawing any of the options.
    """
    x_of = lambda ppm: 84.0 - 7.0 * ppm  # 10 ppm at x 14, 0 ppm at x 84
    bonds = [{"x1": 10.0, "y1": 38.0, "x2": 112.0, "y2": 38.0}]
    labels = []
    for ppm in (10, 5, 0):
        x = x_of(ppm)
        bonds.append({"x1": x, "y1": 34.0, "x2": x, "y2": 42.0})
        labels.append({"x": x, "y": 54.0, "t": str(ppm), "size": 11})
    labels += [
        {"x": 106.0, "y": 54.0, "t": "ppm", "size": 10},
        {"x": 26.0, "y": 24.0, "t": "downfield", "size": 10},
        {"x": 92.0, "y": 24.0, "t": "upfield", "size": 10},
        {"x": 26.0, "y": 72.0, "t": "deshielded", "size": 10},
        {"x": 92.0, "y": 72.0, "t": "shielded", "size": 10},
    ]
    fig = {"bonds": bonds, "labels": labels}
    check_bounds(fig, "ppm scale")
    return fig


def node_nmr() -> None:
    node = "u2-nmr"
    conc = ("spectroscopy_nmr", "aromaticity")
    envs = {"bz": ("benzene", "all"), "ene": ("cyclohexene", "vinylic"), "ane": ("cyclohexane", "all")}
    mcq(
        node, "u2-nmr-meet-downfield",
        "Pick the H that shows up furthest downfield.",
        [
            ("ene", "The C=C H of cyclohexene", f"Vinylic H sit {SHIFT_RANGE['vinylic']}. Downfield, but not as far as an aromatic ring pushes its H."),
            ("bz", "An H on benzene", f"The ring current of an aromatic ring deshields the H around its edge: {SHIFT_RANGE['aromatic']}."),
            ("ane", "An H on cyclohexane", f"Plain alkyl H sit far upfield, {SHIFT_RANGE['alkyl']}."),
        ],
        most(envs, "downfield"), "bz",
        f"Aromatic H, {SHIFT_RANGE['aromatic']}, sit downfield of vinylic H because the ring current adds to the field outside the ring. Unit 6 covers the rest of NMR.",
        prov("NMR teaching table, environments classified with the Huckel counter", OS_15_7, ["benzene", "cyclohexene", "cyclohexane"]),
        struct_visual("benzene", "benzene: H around the edge"),
        ["benzene", "cyclohexene", "cyclohexane"],
        tiles={
            "bz": named("benzene", "benzene, circled H", h_on=[0]),
            "ene": named("cyclohexene", "cyclohexene, circled H", h_on=[0]),
            "ane": named("cyclohexane", "cyclohexane, circled H", h_on=[0]),
        },
        brief="A ring current deshields the H around the outside of an aromatic ring.",
        level=0, concepts=conc,
    )
    inner = h_class("ann18", "inner")
    mcq(
        node, "u2-nmr-meet-inner",
        "Pick where the H inside [18]annulene's ring show up.",
        [
            ("vin", cap1(SHIFT_RANGE["vinylic"]), "That is where H on an ordinary C=C sit. Inside an aromatic ring the ring current pushes the other way."),
            ("in", cap1(SHIFT_RANGE["inner"]), f"Inside the ring the induced field opposes the applied one, so those H are shielded, below 0 ppm. ({INNER['ann18']}.)"),
            ("aro", cap1(SHIFT_RANGE["aromatic"]), "That is the outside H. Inside the loop the ring current shields instead of deshields."),
        ],
        {"inner": "in", "aromatic": "aro", "vinylic": "vin"}.get(inner or ""), "in",
        "The ring current deshields H outside an aromatic ring and shields H inside it. [18]Annulene's inner H land below 0 ppm, a sign the ring is aromatic.",
        prov("NMR teaching table; inner H list authored", OS_15_7, ["ann18"]),
        struct_visual("ann18", "[18]annulene, inner H circled", mark_inner=True),
        ["ann18"],
        brief="Inside the ring, the ring current works against the magnet's field.",
        level=0, concepts=conc,
    )
    envs2 = {"inner": ("ann18", "inner"), "bz": ("benzene", "all"), "ane": ("cyclohexane", "all")}
    mcq(
        node, "u2-nmr-shielded",
        "Pick the most shielded H.",
        [
            ("bz", "An H on benzene", "Outside the ring the ring current deshields, so benzene's H are downfield."),
            ("ane", "An H on cyclohexane", f"Alkyl H are upfield, {SHIFT_RANGE['alkyl']}, but still above 0 ppm."),
            ("inner", "An inner H of [18]annulene", f"Inside an aromatic ring the ring current shields: {SHIFT_RANGE['inner']}, further upfield than any alkyl H."),
        ],
        most(envs2, "upfield"), "inner",
        "Shielding inside the ring is stronger than anything an alkyl H gets, so [18]annulene's inner H sit below 0 ppm.",
        prov("NMR teaching table", OS_15_7, ["ann18", "benzene", "cyclohexane"]),
        {"kind": "structure", "figure": ppm_scale(), "name": "the ppm scale: more shielded is further right"},
        ["ann18", "benzene", "cyclohexane"],
        tiles={
            "bz": named("benzene", "benzene, circled H", h_on=[0]),
            "ane": named("cyclohexane", "cyclohexane, circled H", h_on=[0]),
            "inner": named("ann18", "[18]annulene, inner H circled", mark_inner=True),
        },
        concepts=conc,
    )
    cot_cls = h_class("cot", "all")
    mcq(
        node, "u2-nmr-cot",
        "Pick where cyclooctatetraene's H show up.",
        [
            ("aro", cap1(SHIFT_RANGE["aromatic"]), "That band needs a ring current, and only an aromatic ring has one. COT is a nonaromatic tub."),
            ("vin", cap1(SHIFT_RANGE["vinylic"]), "The tub has no ring current, so its H behave like H on four ordinary C=C bonds: vinylic."),
            ("alk", cap1(SHIFT_RANGE["alkyl"]), "Every COT carbon is sp2 in a C=C. Alkyl H sit on sp3 carbons."),
        ],
        {"aromatic": "aro", "vinylic": "vin", "alkyl": "alk"}.get(cot_cls or ""), "vin",
        "NMR can tell aromatic from not. COT's H appear in the vinylic band, which is evidence it is a nonaromatic tub.",
        prov("NMR teaching table; the counter's nonaromatic verdict (planarity authored) puts COT's H in the vinylic row", OS_15_7, ["cot"]),
        pair_visual(("cot", "cyclooctatetraene"), ("benzene", "benzene")),
        ["cot", "benzene"],
        concepts=conc,
    )


# ---------------------------------------------------------------------------
# u2-nomen (practice, branch side quest, 12)
# ---------------------------------------------------------------------------

def node_nomen() -> None:
    node = "u2-nomen"
    conc = ("iupac_nomenclature",)
    page = OS_15_1
    BZ = "c1ccccc1"
    REL_OPT = {"ortho": "o", "meta": "m", "para": "p"}

    def ref() -> dict:
        return {"kind": "structure", "figure": figure(BZ), "name": "benzene, the parent ring"}

    def nmcq(id, prompt, options, derived, correct, expl, visual, tiles=None, names=None, brief=None):
        for o, (s, n) in (names or {}).items():
            check_name(s, n, f"{id}::{o}")
        mcq(node, id, prompt, options, derived, correct, expl,
            prov("names checked by OPSIN round trip; o/m/p from ring path distance", page, []),
            visual, [], tiles=tiles, brief=brief, concepts=conc)

    ox = "Cc1ccccc1C"
    mx = "Cc1cccc(C)c1"
    px = "Cc1ccc(C)cc1"
    nmcq("u2-nom-xylene", "Name this dimethylbenzene.",
         [("m", "m-Xylene", "Meta means one carbon between the two groups (1,3). These two methyls are on neighbouring carbons."),
          ("o", "o-Xylene", "The two methyls sit on neighbouring ring carbons, 1,2. That is ortho."),
          ("p", "p-Xylene", "Para means straight across the ring, 1,4. These methyls are next to each other.")],
         REL_OPT.get(relation(ox) or ""), "o",
         "Ortho is 1,2 (next door), meta is 1,3 (one carbon between), para is 1,4 (across the ring).",
         {"kind": "structure", "figure": figure(ox), "name": "a dimethylbenzene"},
         names={"o": (ox, "o-xylene"), "m": (mx, "m-xylene"), "p": (px, "p-xylene")})
    brcl = "Brc1cccc(Cl)c1"
    nmcq("u2-nom-meta", "Pick the prefix for this substitution pattern.",
         [("o", "ortho", "Ortho is 1,2. Count the ring bonds between the two groups: there are two, not one."),
          ("p", "para", "Para is straight across the ring, three bonds apart. These groups are two bonds apart."),
          ("m", "meta", "Two ring bonds apart, with one carbon between them: 1,3, meta.")],
         REL_OPT.get(relation(brcl) or ""), "m",
         "Count the ring bonds between the two groups: one is ortho, two is meta, three is para.",
         {"kind": "structure", "figure": figure(brcl), "name": "a disubstituted benzene"},
         names={"m": (brcl, "1-bromo-3-chlorobenzene")})
    dcb = {"o": ("Clc1ccccc1Cl", "1,2-dichlorobenzene"), "m": ("Clc1cccc(Cl)c1", "1,3-dichlorobenzene"), "p": ("Clc1ccc(Cl)cc1", "1,4-dichlorobenzene")}
    para = [o for o, (s, _) in dcb.items() if relation(s) == "para"]
    nmcq("u2-nom-para", "Pick p-dichlorobenzene.",
         [("o", "1,2-Dichlorobenzene", "Neighbouring carbons, 1,2: that is ortho."),
          ("m", "1,3-Dichlorobenzene", "One carbon between, 1,3: that is meta."),
          ("p", "1,4-Dichlorobenzene", "Straight across the ring, 1,4: para.")],
         para[0] if len(para) == 1 else None, "p",
         "Para is the 1,4 pattern, the two groups straight across the ring.",
         ref(), tiles={o: smi_named(s, n, f"u2-nom-para::{o}") for o, (s, n) in dcb.items()})
    common = {"phenol": ("Oc1ccccc1", "phenol"), "anisole": ("COc1ccccc1", "anisole"), "aniline": ("Nc1ccccc1", "aniline")}
    nmcq("u2-nom-phenol", "Name this compound.",
         [("anisole", "Anisole", "Anisole has a methoxy group, O-CH3, on the ring. This O carries an H."),
          ("aniline", "Aniline", "Aniline has NH2 on the ring. This group is OH."),
          ("phenol", "Phenol", "An OH group on a benzene ring is phenol.")],
         key_by_name("Oc1ccccc1", {o: n for o, (_, n) in common.items()}), "phenol",
         "Phenol is benzene with OH, aniline with NH2, anisole with OCH3.",
         {"kind": "structure", "figure": figure("Oc1ccccc1"), "name": "a monosubstituted benzene"},
         names={o: v for o, v in common.items()})
    carb = {"ald": ("O=Cc1ccccc1", "benzaldehyde"), "ket": ("CC(=O)c1ccccc1", "acetophenone"), "acid": ("OC(=O)c1ccccc1", "benzoic acid")}
    nmcq("u2-nom-acetophenone", "Pick acetophenone.",
         [("acid", "Benzoic acid", "Benzoic acid has COOH on the ring. Acetophenone is a ketone."),
          ("ket", "Acetophenone", "A C=O between the ring and a methyl group: a methyl ketone on benzene, acetophenone."),
          ("ald", "Benzaldehyde", "Benzaldehyde has CHO, an H on the carbonyl carbon. Acetophenone has a methyl there.")],
         key_by_structure("acetophenone", {o: smi for o, (smi, _) in carb.items()}), "ket",
         "Benzaldehyde is CHO on benzene, acetophenone is COCH3, benzoic acid is COOH.",
         ref(), tiles={o: smi_named(s, n, f"u2-nom-acetophenone::{o}") for o, (s, n) in carb.items()})
    vinyl = {"tol": ("Cc1ccccc1", "toluene"), "sty": ("C=Cc1ccccc1", "styrene"), "eth": ("CCc1ccccc1", "ethylbenzene")}
    nmcq("u2-nom-styrene", "Name this compound.",
         [("tol", "Toluene", "Toluene has a single CH3 on the ring. This group has two carbons and a C=C."),
          ("eth", "Ethylbenzene", "Ethylbenzene's two carbons are joined by a single bond. Here they share a double bond."),
          ("sty", "Styrene", "A vinyl group, CH=CH2, on benzene is styrene.")],
         key_by_name("C=Cc1ccccc1", {o: n for o, (_, n) in vinyl.items()}), "sty",
         "Toluene is methylbenzene, ethylbenzene has CH2CH3, styrene has CH=CH2.",
         {"kind": "structure", "figure": figure(vinyl["sty"][0]), "name": "a monosubstituted benzene"},
         names=vinyl)
    nmcq("u2-nom-benzoic", "Name this compound.",
         [("acid", "Benzoic acid", "A COOH group on benzene: benzoic acid."),
          ("ald", "Benzaldehyde", "An aldehyde has an H on the carbonyl carbon. This one has an OH."),
          ("ket", "Acetophenone", "Acetophenone has CH3 on the carbonyl carbon. This one has an OH.")],
         key_by_name("OC(=O)c1ccccc1", {o: n for o, (_, n) in carb.items()}), "acid",
         "COOH on benzene is benzoic acid. Read what sits on the carbonyl carbon: H, CH3 or OH.",
         {"kind": "structure", "figure": figure(carb["acid"][0]), "name": "a monosubstituted benzene"},
         names=carb)
    poly = {"nap": ("c1ccc2ccccc2c1", "naphthalene"), "ant": ("c1ccc2cc3ccccc3cc2c1", "anthracene"), "phe": ("c1ccc2c(c1)ccc1ccccc12", "phenanthrene")}

    def linear(s: str) -> bool:
        """Three fused rings in a straight row: no ring atom is shared by more than two rings and the middle ring's fusion bonds are opposite."""
        m = mol(s)
        rings = [set(r) for r in m.GetRingInfo().AtomRings()]
        if len(rings) != 3:
            return False
        mid = [r for r in rings if sum(1 for o in rings if o is not r and len(o & r) == 2) == 2][0]
        shared = [a for o in rings if o is not mid for a in (o & mid)]
        path = min(len(Chem.GetShortestPath(m, a, b)) - 1 for a in shared[:2] for b in shared[2:])
        return path == 2

    lin = [o for o in ("ant", "phe") if linear(poly[o][0])]
    nmcq("u2-nom-anthracene", "Pick anthracene.",
         [("phe", "Phenanthrene", "Phenanthrene's three rings bend at the middle ring, like an elbow."),
          ("nap", "Naphthalene", "Naphthalene has only two fused rings."),
          ("ant", "Anthracene", "Three rings fused in a straight row: anthracene.")],
         lin[0] if len(lin) == 1 else None, "ant",
         "Naphthalene has two fused rings. Anthracene has three in a line; phenanthrene has three with a bend.",
         ref(), tiles={o: smi_named(s, n, f"u2-nom-anthracene::{o}") for o, (s, n) in poly.items()})
    bent = [o for o in ("ant", "phe") if not linear(poly[o][0])]
    nmcq("u2-nom-phenanthrene", "Name this fused ring system.",
         [("ant", "Anthracene", "Anthracene's three rings run in a straight line. These bend at the middle ring."),
          ("phe", "Phenanthrene", "Three fused rings with a bend at the middle one: phenanthrene."),
          ("nap", "Naphthalene", "Naphthalene has two rings. Count again: there are three here.")],
         bent[0] if len(bent) == 1 else None, "phe",
         "Three fused rings: straight is anthracene, bent is phenanthrene.",
         {"kind": "structure", "figure": figure(poly["phe"][0]), "name": "a fused ring system"},
         names=poly)
    cp = {"4": ("Oc1ccc(Cl)cc1", "4-chlorophenol"), "3": ("Oc1cccc(Cl)c1", "3-chlorophenol"), "2": ("Oc1ccccc1Cl", "2-chlorophenol")}
    rel4 = relation(cp["4"][0])
    nmcq("u2-nom-chlorophenol", "Name this compound.",
         [("c3", "3-Chlorophenol", "The OH carbon is C1. Count round to the Cl: it is three ring bonds away, so C4."),
          ("c2", "2-Chlorophenol", "C2 is next door to the OH carbon. This Cl is straight across."),
          ("c4", "4-Chlorophenol", "Phenol's OH carbon is C1, and the Cl sits straight across the ring at C4: para.")],
         {"para": "c4", "meta": "c3", "ortho": "c2"}.get(rel4 or ""), "c4",
         "When the parent is phenol, the OH carbon is C1 and the other group gets the lowest number from there.",
         {"kind": "structure", "figure": figure(cp["4"][0]), "name": "a chlorophenol"},
         names={"c4": cp["4"], "c3": cp["3"], "c2": cp["2"]})
    ct = {"2": ("Cc1ccccc1Cl", "2-chlorotoluene"), "3": ("Cc1cccc(Cl)c1", "3-chlorotoluene"), "4": ("Cc1ccc(Cl)cc1", "4-chlorotoluene")}
    rel2 = relation(ct["2"][0])
    nmcq("u2-nom-chlorotoluene", "Name this compound.",
         [("t4", "4-Chlorotoluene", "C4 is straight across from the methyl carbon. This Cl is next door."),
          ("t2", "2-Chlorotoluene", "Toluene's CH3 carbon is C1, and the Cl is on the neighbouring carbon, C2: ortho."),
          ("t3", "3-Chlorotoluene", "C3 has one carbon between it and the CH3 carbon. This Cl is right next to it.")],
         {"ortho": "t2", "meta": "t3", "para": "t4"}.get(rel2 or ""), "t2",
         "With toluene as the parent, the CH3 carbon is C1.",
         {"kind": "structure", "figure": figure(ct["2"][0]), "name": "a chlorotoluene"},
         names={"t2": ct["2"], "t3": ct["3"], "t4": ct["4"]})
    dm = {"13": (mx, "1,3-dimethylbenzene"), "12": (ox, "1,2-dimethylbenzene"), "14": (px, "1,4-dimethylbenzene")}
    nmcq("u2-nom-iupac-xylene", "Pick the IUPAC name for m-xylene.",
         [("12", "1,2-Dimethylbenzene", "1,2 is next door: ortho, o-xylene."),
          ("14", "1,4-Dimethylbenzene", "1,4 is straight across: para, p-xylene."),
          ("13", "1,3-Dimethylbenzene", "Meta is 1,3, one carbon between the two methyls.")],
         {"meta": "13", "ortho": "12", "para": "14"}.get(relation(mx) or ""), "13",
         "Each prefix has a number pattern: ortho 1,2, meta 1,3, para 1,4.",
         {"kind": "structure", "figure": figure(mx), "name": "m-xylene"},
         names={**dm, "ref": (mx, "m-xylene")})


# ---------------------------------------------------------------------------
# Round 2 (2026-10-17): a produce step and a connect step for the lessons, a
# drawing in each run, and runs that reach their non-MCQ items before the top
# tier ends them. Same rules as above: every answer from the counter or RDKit.
# ---------------------------------------------------------------------------

def inchi_of(smi: str) -> str:
    out = Chem.MolToInchi(mol(smi))
    if not out.startswith("InChI=1S/"):
        fail(f"no standard InChI for {smi}")
    return out


def draw(node: str, id: str, prompt: str, brief: str, visual: dict, answer: str, answer_name: str,
         want: str, why: str, look_at: str, explanation: str, provenance: str, uses: list[str]) -> None:
    """
    One "Draw it" entry (beats/draw), in Unit 1's shape. `answer` is a SPECIES
    key; the counter must give it the class `want`, or nothing is written.
    Graded on the standard InChI RDKit writes here, stereo off.
    """
    if id in IDS:
        fail(f"duplicate id {id}")
    IDS.add(id)
    lint_copy(f"{id} prompt", prompt, CAPS["prompt"])
    lint_copy(f"{id} brief", brief, CAPS["brief"])
    for where, text in (("why", why), ("lookAt", look_at), ("explanation", explanation)):
        lint_copy(f"{id} {where}", text, CAPS["why"])
    r = H(answer)
    if r["klass"] != want:
        fail(f"{id}: the drawing asks for a {want} species, the counter calls {answer} {r['klass']}")
    smi = canon(r["smi"])
    if Chem.GetFormalCharge(mol(smi)) == 0:
        check_name(smi, answer_name, id)
    beat = {
        "kind": "draw", "id": id, "node": node, "conceptIds": ["aromaticity"], "levels": [2],
        "prompt": prompt, "brief": brief, "visual": visual,
        "answer": {"smiles": smi, "inchi": inchi_of(smi), "name": answer_name, "figure": figure(smi)},
        "stereo": False, "why": why, "lookAt": look_at,
    }
    POOLS.setdefault(node, []).append(
        {"id": id, "item": {"kind": "draw", "beat": beat}, "explanation": explanation, "provenance": provenance, "placeholder": True}
    )
    USES[id] = uses


GATE_CARD = {"porbital": "Fails: p orbital on every atom", "planar": "Fails: flat ring"}


def huckel_gate_card(name: str) -> str:
    """The first Huckel test a species fails, as a card, from the counter."""
    r = H(name)
    if r["gate"] is not None:
        return GATE_CARD[r["gate"]]
    return "Passes all four tests" if r["klass"] == "aromatic" else "Fails: the 4n + 2 count"


NMR_ENVS = (
    ("edge", "H on an aromatic ring's edge", "benzene", "all", "The ring current adds to the field outside the ring, so these H are deshielded."),
    ("vinyl", "H on an ordinary C=C", "cyclohexene", "vinylic", "No ring current, so a plain C=C H sits upfield of an aromatic H."),
    ("alkyl", "H on an sp3 carbon", "cyclohexane", "all", "No pi bond nearby: plain alkyl H are far upfield."),
    ("inside", "H inside an aromatic ring", "ann18", "inner", "Inside the loop the induced field opposes the magnet, so these H are shielded the most."),
)


def round2() -> None:
    # u2-huckel: CONNECT (which test each ring fails) and PRODUCE (draw the ring that passes).
    chd = H("chd13")
    match(
        "u2-huckel", "u2-huckel-match",
        "Match each ring, described in words, to the first test it fails.",
        "Run the four tests in order and stop at the first one that fails.",
        [
            ("sp3", "A ring with an sp3 CH2", "Fails: p orbital on every atom", "An sp3 carbon has no p orbital, so the loop has a gap. Nothing after this test matters.", huckel_gate_card("chd13")),
            ("tub", "An 8 ring folded into a tub", "Fails: flat ring", "Every carbon is sp2, but the bent ring keeps the p orbitals from lining up all the way round.", huckel_gate_card("cot")),
            ("four", f"Flat 4 ring, {pi_of('cyclobutadiene')} pi electrons", "Fails: the 4n + 2 count", f"It passes the gate, then the count lands on {pi_of('cyclobutadiene')}, which is 4n.", huckel_gate_card("cyclobutadiene")),
            ("six", f"Flat 6 ring, {pi_of('benzene')} pi electrons", "Passes all four tests", f"Cyclic, all sp2, flat, and {pi_of('benzene')} fits 4n + 2 with {nn('benzene')}.", huckel_gate_card("benzene")),
        ],
        "The tests run in order: cyclic, a p orbital on every ring atom, flat, then 4n + 2. The first test a ring fails is its verdict.",
        prov("Huckel counter: first failed gate for cyclohexa-1,3-diene and COT, the count for cyclobutadiene and benzene; planarity authored for COT", OS_15_3, ["chd13", "cot", "cyclobutadiene", "benzene"]),
        ["chd13", "cot", "cyclobutadiene", "benzene"],
    )
    draw(
        "u2-huckel", "u2-huckel-draw-six",
        "Draw a neutral ring of six carbons that passes all four tests.",
        "Cyclohexa-1,3-diene fails at its circled carbons. Give every ring carbon a p orbital.",
        struct_visual("chd13", "cyclohexa-1,3-diene, sp3 carbons circled", marks=chd["broken"]),
        "benzene", "benzene", "aromatic",
        f"Three C=C bonds round a flat six ring: every carbon sp2, {pi_of('benzene')} pi electrons, {nn('benzene')}.",
        "Each ring carbon needs to sit in a C=C bond. Alternate single and double bonds all the way round.",
        f"Benzene is the six carbon ring that passes every test: cyclic, all sp2, flat, and {pi_of('benzene')} pi electrons.",
        prov("Huckel counter: benzene aromatic; graded on RDKit's standard InChI", OS_15_3, ["benzene", "chd13"]),
        ["benzene", "chd13"],
    )

    # u2-nmr: CONNECT, H environment to its band. Generic environments, no molecule named.
    pairs = []
    for pid, left, species, which, why in NMR_ENVS:
        cls = h_class(species, which)
        derived = SHIFT_RANGE.get(cls) if cls is not None else None
        pairs.append((pid, left, derived or "(underived)", why, derived))
    match(
        "u2-nmr", "u2-nmr-match",
        "Match each kind of H to where it shows up.",
        "Outside an aromatic ring is deshielded, inside is shielded.",
        pairs,
        "Ring current: it deshields H outside an aromatic ring and shields H inside it. Ordinary C=C and alkyl H fall in between.",
        prov("NMR teaching table, each environment classified with the Huckel counter (benzene, cyclohexene, cyclohexane, [18]annulene inner H)", OS_15_7, ["benzene", "cyclohexene", "cyclohexane", "ann18"]),
        ["benzene", "cyclohexene", "cyclohexane", "ann18"],
        concepts=("spectroscopy_nmr", "aromaticity"),
    )

    # u2-charged: draw the anion and the cation the lesson is named for.
    cpd = H("cyclopentadiene")
    draw(
        "u2-charged", "u2-chg-draw-cp",
        "Cyclopentadiene loses H+ from its CH2. Draw the anion that forms.",
        "Put the minus charge on the carbon that lost H+.",
        struct_visual("cyclopentadiene", "cyclopentadiene, CH2 circled", marks=cpd["broken"]),
        "cp_anion", "cyclopentadienyl anion", "aromatic",
        f"The old CH2 carbon keeps a lone pair in a p orbital: five p orbitals, {pi_of('cp_anion')} pi electrons, {nn('cp_anion')}. Aromatic.",
        "Only the proton leaves; its bonding pair stays on carbon as a lone pair, so the charge is minus.",
        f"Losing H+ turns the sp3 CH2 into a carbon with a lone pair in a p orbital. Five atoms, {pi_of('cp_anion')} pi electrons: the cyclopentadienyl anion is aromatic.",
        prov("Huckel counter: cyclopentadienyl anion aromatic; graded on RDKit's standard InChI", OS_15_4, ["cyclopentadiene", "cp_anion"]),
        ["cyclopentadiene", "cp_anion"],
    )
    cht = H("cycloheptatriene")
    draw(
        "u2-charged", "u2-chg-draw-trop",
        "Cycloheptatriene loses hydride, H with both electrons. Draw the cation.",
        "The old CH2 carbon keeps one H and is left with an empty p orbital. Put the plus there.",
        struct_visual("cycloheptatriene", "cycloheptatriene, CH2 circled", marks=cht["broken"]),
        "tropylium", "tropylium (cycloheptatrienyl cation)", "aromatic",
        f"Seven p orbitals, one of them empty: {pi_of('tropylium')} pi electrons, {nn('tropylium')}. The tropylium cation is aromatic.",
        "Hydride leaves with its pair, so that carbon keeps only three bonds and carries the plus charge.",
        f"Removing hydride leaves the old CH2 carbon with an empty p orbital. Seven atoms, {pi_of('tropylium')} pi electrons: tropylium is aromatic.",
        prov("Huckel counter: tropylium aromatic; graded on RDKit's standard InChI", OS_15_4, ["cycloheptatriene", "tropylium"]),
        ["cycloheptatriene", "tropylium"],
    )

    # u2-hetero: protonate pyridine on N.
    draw(
        "u2-hetero", "u2-het-draw-pyH",
        "Pyridine takes H+ on its nitrogen. Draw the cation that forms.",
        "The N's lone pair sits in the ring plane, free to grab H+. Show the plus on N.",
        struct_visual("pyridine", "pyridine, lone pair drawn", pairs=True),
        "pyridinium", "pyridinium", "aromatic",
        f"The pair that grabbed H+ was never in the pi system, so the ring keeps {pi_of('pyridinium')} pi electrons and stays aromatic.",
        "Add one H to the N and give the N a plus charge. The ring bonds do not move.",
        f"Pyridine's lone pair is in an sp2 orbital in the ring plane. Using it for H+ leaves the {pi_of('pyridinium')} pi electrons alone: pyridinium is aromatic.",
        prov("Huckel counter: pyridinium aromatic, its N pair in the plane; graded on RDKit's standard InChI", OS_15_5, ["pyridine", "pyridinium"]),
        ["pyridine", "pyridinium"],
    )


RUN_NODES = ("u2-charged", "u2-annulene", "u2-hetero")
# Round 2b: 2, 5, 8, 11 left a fourth item at 11, past a flawless run's stop at 10, so the spread is tighter.
SPREAD_AT = (2, 4, 6, 8)


def spread_kinds() -> None:
    """
    A run stops at 10 in a row, so a ladder or board authored at the end of a
    pool was never met in normal play (round 1 critic). The non-MCQ items move
    to positions 2, 4, 6 and 8, in authored order; the MCQs keep their order.
    """
    def is_mcq(e: dict) -> bool:
        return e.get("item", {}).get("kind") == "mcq"

    for node in RUN_NODES:
        pool = POOLS[node]
        mcqs = [e for e in pool if is_mcq(e)]
        others = [e for e in pool if not is_mcq(e)]
        if len(others) > len(SPREAD_AT):
            fail(f"{node}: {len(others)} non-MCQ items, more than the {len(SPREAD_AT)} spread positions")
        out: list[dict] = []
        while mcqs or others:
            if others and (len(out) in SPREAD_AT or not mcqs):
                out.append(others.pop(0))
            else:
                out.append(mcqs.pop(0))
        POOLS[node] = out


# ---------------------------------------------------------------------------
# Exam, build, report, emit
# ---------------------------------------------------------------------------

EXAM_IDS = [
    "u2-huckel-n-cot",
    "u2-huckel-cbd",
    "u2-huckel-naph",
    "u2-chg-tropylium",
    "u2-chg-acid-why",
    "u2-chg-ladder-anion",
    "u2-ann-cot",
    "u2-ann-10",
    "u2-ann-tell",
    "u2-het-pyrrole-pair",
    "u2-het-imid-base",
    "u2-het-protonate",
    "u2-nmr-cot",
    "u2-nmr-shielded",
]
# 12 is the owner's floor for Prodigy (run.ts POOL_SLACK); 14 gives every lesson and run two or three.
EXAM_SIZE = 14


TALLY: dict[str, dict] = {}


def build_tally() -> None:
    """
    The counter's per atom output, drawn, for the production beats a later
    piece builds (tap each ring atom and give its pi electrons, type the total
    and n, drop electrons on the Frost levels). Data only: nothing renders it
    yet. Every number here is the counter's; the drawing is figure()'s, so an
    atom's x and y are where that atom sits in this exact figure.
    [10] and [18]annulene are left out: their drawing is built from a host
    arene's perimeter, so figure() atom positions do not apply.
    """
    for name in SPECIES:
        if name in ("ann10", "ann18"):
            continue
        r = H(name)
        where: dict[int, tuple[float, float]] = {}
        fig = figure(r["smi"], pairs=True, where=where)
        m = kekule(r["smi"])
        atoms = []
        for i in r["atoms"]:
            row = {"index": i, "x": where[i][0], "y": where[i][1], "element": m.GetAtomWithIdx(i).GetSymbol(), "pi": r["per"][i]}
            if i in r["home"]:
                row["orbital"] = r["home"][i]
            atoms.append(row)
        if r["pi"] is not None and sum(a["pi"] for a in atoms) != r["pi"]:
            fail(f"tally {name}: atom contributions do not add up to {r['pi']}")
        frost_levels = None
        if r["frost"] is not None:
            k = len(r["atoms"])
            order = sorted(range(k), key=lambda j: -math.cos(2 * math.pi * j / k))
            frost_levels = [r["frost"]["occ"].get(j, 0) for j in order]
        TALLY[name] = {
            "smiles": r["smi"],
            "figure": fig,
            "atoms": atoms,
            "pi": r["pi"],
            "n": r["n"],
            "verdict": r["klass"],
            "planar": r["planar"],
            "planarReason": r["reason"],
            "frostLevelsBottomUp": frost_levels,
        }


def build() -> list[tuple[str, str, str, str]]:
    rows = run_fixtures()
    node_huckel()
    node_annulene()
    node_hetero()
    node_charged()
    node_nmr()
    node_nomen()
    round2()
    spread_kinds()
    build_tally()
    check_names()
    # The report's ruling list is built from USES and the provenance strings
    # from the uses each spec passed to prov(). They must name the same items,
    # or the owner's morning list misses one.
    for node, pool in POOLS.items():
        for e in pool:
            eid = e.get("id") or e["beat"]["id"]
            says = "NEEDS OWNER RULING" in e["provenance"]
            traced = any(u in DISAGREE for u in USES.get(eid, []))
            if says != traced:
                fail(f"{eid}: provenance {'says' if says else 'does not say'} NEEDS OWNER RULING but the report would {'not ' if not traced else ''}list it")
    if len(EXAM_IDS) != EXAM_SIZE or len(set(EXAM_IDS)) != EXAM_SIZE:
        fail(f"U2_EXAM_IDS must be {EXAM_SIZE} distinct ids")
    nomen = {e.get("id") or e.get("beat", {}).get("id") for e in POOLS.get("u2-nomen", [])}
    for x in EXAM_IDS:
        if x not in IDS:
            fail(f"exam id {x} is not an entry")
        if x in nomen:
            fail(f"exam id {x} is from the u2-nomen branch")
    if CORRECT_INDEX:
        for idx in set(CORRECT_INDEX):
            if CORRECT_INDEX.count(idx) > len(CORRECT_INDEX) / 2:
                fail(f"answer parked at index {idx} in {CORRECT_INDEX.count(idx)} of {len(CORRECT_INDEX)} MCQs")
    return rows


def report(rows: list[tuple[str, str, str, str]]) -> str:
    out = ["# Unit 2 pools: the owner's disagreement report", "",
           "GENERATED by scripts/u2_pools.py. Do not edit by hand. Every Unit 2 item is a draft (`placeholder: true`).", "",
           "The student is taught the Huckel counter written in the script header. RDKit's aromatic flag is a different model.",
           "Where they part, the item was still built from the counter and its provenance says NEEDS OWNER RULING. Nothing here picks a winner.", "",
           "## 1. Sanity fixtures (textbook expectation vs the counter vs RDKit)", "",
           "| species | SMILES | textbook | counter | pi | n | RDKit flag | Frost |", "|---|---|---|---|---|---|---|---|"]
    for name, want, got, rd in rows:
        r = H(name)
        fr = r["frost"]["shell"] if r["frost"] else "n/a (fused or broken)"
        n = "" if r["n"] is None else f"{r['n']:g}"
        out.append(f"| {name} | `{r['smi']}` | {want} | {got} | {r['pi'] if r['pi'] is not None else 'broken'} | {n} | {rd} | {fr} |")
    out += ["", "## 2. Every disagreement between the counter and RDKit", "",
            "| species | SMILES | counter class | pi | n | RDKit flag | tier | why RDKit differs | items |", "|---|---|---|---|---|---|---|---|---|"]
    for name, d in DISAGREE.items():
        r = H(name)
        items = sorted(i for i, u in USES.items() if name in u)
        n = "" if r["n"] is None else f"{r['n']:g}"
        out.append(f"| {name} | `{r['smi']}` | {r['klass']} | {r['pi']} | {n} | {r['rd']} | {d['tier']} | {d['why']} | {', '.join(items) or 'fixture only'} |")
    out += ["", "## 3. Every item where the authored planarity call decided the answer", "",
            "| species | planar | reason | class with the call | class if flat | items |", "|---|---|---|---|---|---|"]
    for name in SPECIES:
        r = H(name)
        if r["planarity_decided"]:
            items = sorted(i for i, u in USES.items() if name in u)
            out.append(f"| {name} | {r['planar']} | {r['reason']} | {r['klass']} | {r['electronic']} | {', '.join(items) or 'fixture only'} |")
    out += ["", "Planarity authored as True but load bearing (a flat call that makes the class antiaromatic or aromatic):", ""]
    for name in SPECIES:
        r = H(name)
        if (r["planar"] and not r["broken"] and r["klass"] == "antiaromatic") or name == "ann18":
            items = sorted(i for i, u in USES.items() if name in u)
            out.append(f"- {name}: {r['reason']} ({r['klass']}). Items: {', '.join(items) or 'fixture only'}")
    out += ["", "## 4. Items marked NEEDS OWNER RULING", ""]
    for i, u in sorted(USES.items()):
        hits = [x for x in u if x in DISAGREE]
        if hits:
            out.append(f"- {i}: " + ", ".join(f"{h} ({DISAGREE[h]['tier']})" for h in hits))
    out += ["", "## 5. Per atom contributions (counter)", ""]
    for name in SPECIES:
        r = H(name)
        m = kekule(r["smi"])
        parts = []
        for i in r["atoms"]:
            v = r["per"][i]
            sym = m.GetAtomWithIdx(i).GetSymbol()
            h = r["home"].get(i)
            if v is None and h:
                parts.append(f"{sym}{i}:0 to the ring ({h})")
            else:
                parts.append(f"{sym}{i}:{'no p' if v is None else v}{'(' + h + ')' if h else ''}")
        out.append(f"- {name}: " + " ".join(parts))
    out += ["", "## 6. Model notes for the owner", "",
            "- Lone pairs are drawn as a text label of two dots beside the heteroatom (`..` style, `:` when the gap is to the side), inside the existing figure format. No figure format change.",
            "- The class ranking model (aromatic > nonaromatic > antiaromatic) is used only on ladders whose cards are one per class.",
            "- No draw (Ketcher) item kind exists in src/game/content/u1/types.ts yet, so Unit 2 has MCQ, sort and match only.",
            "- Production stand-ins inside MCQ: pick the atom (the molecule drawn once, large, with the offered atoms lettered; no shared tap-on-the-molecule beat exists yet), fill the Frost circle (an empty diagram, three drawn fillings), and count then give n. U2_PI_TALLY in pools.ts holds the counter's per atom output with drawing coordinates, for a real tap-each-atom or type-the-count beat later.",
            "- conceptIds: CONCEPTS has no aromaticity, naming or NMR concept, so Unit 2 uses three TOPICS ids (aromaticity, iupac_nomenclature, spectroscopy_nmr) as stand-ins. Owner ruling needed: add concepts, or accept topic ids.",
            "- Nomenclature keys are derived through OPSIN: a 'name this' key is the option whose name OPSIN parses to the drawn structure; a 'pick X' key is the drawn option OPSIN makes of X.", ""]
    return "\n".join(out)


HEADER = '''/**
 * Unit 2 (aromaticity) problem pools, a DRAFT. GENERATED by scripts/u2_pools.py.
 * Do not edit by hand: edit the specs in the script and rerun it.
 *
 * EVERY ENTRY IS A DRAFT (`placeholder: true`) for the owner's review, never
 * presented as done. Each answer was derived by the script's Huckel counter
 * (checked against a Frost circle and compared with RDKit), and the script
 * refuses to write this file when an authored key disagrees with what it
 * derived. Where RDKit disagrees with the taught count, the entry's
 * provenance says NEEDS OWNER RULING and scripts/u2_pools_report.md says why.
 *
 * Nothing reads this file yet: wiring the pools into the map and the runners
 * is a separate piece.
 *
 * Ladders are built with createProblem and createOrderingAnswer exactly as
 * content/u1/stage-ab.ts does; match boards go through buildMatchBoard, the
 * same adapter the shipped boards use, so a bad board throws at import time.
 */
import {
  createOrderingAnswer,
  createProblem,
  type CurriculumCauseId,
  type TopicId,
} from "@blueberry/curriculum";
import type { McqVisual, NamedFigure } from "../../beats/mcq/mcqFigures";
import { buildMatchBoard } from "../../beats/match/spec";
import type { SortContent } from "../../beats/sort/ladders";
import type { BeatShapeCauseId, ConceptId, MatchBeat, SortBeat, SortCriterion } from "../../beats/types";
import type { Figure } from "../../onboarding/figures";
import type { PoolEntry, UnitPools } from "../u1/types";

/** One ring atom as the Huckel counter scored it, at its place in the drawing. */
export interface PiTallyAtom {
  readonly index: number;
  readonly x: number;
  readonly y: number;
  readonly element: string;
  /** 0, 1 or 2 pi electrons to the ring; null when the atom has no p orbital (or its pair cannot reach a broken ring). */
  readonly pi: 0 | 1 | 2 | null;
  /** Where a heteroatom's lone pair sits, or a charged carbon's p orbital: "p", "sp2", "p+sp2", "empty p", ... */
  readonly orbital?: string;
}

/** The counter's whole verdict on one species, for production beats (not wired yet). */
export interface PiTally {
  readonly smiles: string;
  readonly figure: Figure;
  readonly atoms: readonly PiTallyAtom[];
  /** null when the ring has an atom with no p orbital. */
  readonly pi: number | null;
  /** (pi - 2) / 4; a non whole n is the tell that the count fails. */
  readonly n: number | null;
  readonly verdict: "aromatic" | "antiaromatic" | "nonaromatic";
  /** Authored, never computed. */
  readonly planar: boolean;
  readonly planarReason: string;
  /** Monocyclic rings only: electrons in each Frost level, bottom level first. */
  readonly frostLevelsBottomUp: readonly number[] | null;
}

interface Expl {
  readonly whatHappened: string;
  readonly why: string;
  readonly lookAt: string;
}

interface LadderSpec {
  readonly id: string;
  readonly node: string;
  readonly problemId: string;
  readonly topic: TopicId;
  readonly difficulty: number;
  readonly problemPrompt: string;
  readonly criterionText: string;
  readonly items: readonly { readonly id: string; readonly text: string }[];
  readonly order: readonly string[];
  readonly solution: Expl;
  readonly distractors: readonly {
    readonly id: string;
    readonly cause: CurriculumCauseId;
    readonly order: readonly string[];
    readonly explanation: Expl;
  }[];
  readonly beat: {
    readonly conceptIds: readonly ConceptId[];
    readonly prompt: string;
    readonly brief: string;
    readonly criterion: SortCriterion;
    readonly direction: "ascending" | "descending";
    readonly notes: Readonly<Record<string, string>>;
  };
  readonly trackEnds: { readonly first: string; readonly last: string };
  readonly meanings: readonly { readonly id: string; readonly cause: BeatShapeCauseId }[];
  readonly explanation: string;
  readonly provenance: string;
}

/** One sort ladder as a pool entry. Throws on a card with no authored note. */
function ladder(spec: LadderSpec): PoolEntry {
  const answer = createOrderingAnswer({
    criterion: spec.criterionText,
    items: spec.items.map((item) => ({ id: item.id, text: item.text })),
    correctOrder: [...spec.order],
  });
  const problem = createProblem({
    id: spec.problemId,
    course: "orgo_2",
    topic: spec.topic,
    difficulty: spec.difficulty,
    prompt: spec.problemPrompt,
    answer,
    solution: spec.solution,
    distractors: spec.distractors.map((d) => ({
      id: d.id,
      cause: d.cause,
      state: { kind: "ordering" as const, order: [...d.order] },
      explanation: d.explanation,
    })),
    tags: ["ladder", "u2-pool", "placeholder"],
  });
  const beat: SortBeat = {
    kind: "sort",
    id: spec.id,
    node: spec.node,
    conceptIds: spec.beat.conceptIds,
    levels: [2, 3],
    prompt: spec.beat.prompt,
    brief: spec.beat.brief,
    criterion: spec.beat.criterion,
    direction: spec.beat.direction,
    items: spec.items.map((item) => {
      const why = spec.beat.notes[item.id];
      if (why === undefined) throw new Error(`ladder ${spec.id} has no note for card ${item.id}`);
      return { id: item.id, label: item.text, why };
    }),
    order: spec.order,
  };
  const content: SortContent = {
    beat,
    problem,
    spec: answer,
    trackEnds: spec.trackEnds,
    distractorMeanings: spec.meanings,
  };
  return {
    id: spec.id,
    item: { kind: "sort", content },
    explanation: spec.explanation,
    provenance: spec.provenance,
    placeholder: true,
  };
}

/** One match board as a pool entry, built at level 1 (no decoys) by the shipped adapter. */
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


def ts(value) -> str:
    return json.dumps(value, ensure_ascii=False, indent=2)


def emit() -> str:
    out = [HEADER]
    out.append("\nexport const U2_POOLS: UnitPools = {")
    for node, entries in POOLS.items():
        out.append(f"  {json.dumps(node)}: [")
        for e in entries:
            if e.get("__ladder__"):
                spec = {k: v for k, v in e.items() if k != "__ladder__" and v is not None}
                out.append("    ladder(" + ts(spec).replace("\n", "\n    ") + "),")
            elif e.get("__match__"):
                spec = {k: v for k, v in e.items() if k != "__match__"}
                out.append("    match(" + ts(spec).replace("\n", "\n    ") + "),")
            else:
                out.append("    " + ts(e).replace("\n", "\n    ") + ",")
        out.append("  ],")
    out.append("};\n")
    out.append("/** The drawing beside each MCQ, keyed by beat id. */")
    out.append("export const U2_VISUALS: Readonly<Record<string, McqVisual>> = " + ts(VISUALS) + ";\n")
    out.append("/** Drawn options, keyed by beat id then option id. All or nothing per beat. */")
    out.append("export const U2_OPTION_TILES: Readonly<Record<string, Readonly<Record<string, NamedFigure>>>> = " + ts(TILES) + ";\n")
    out.append("/** A drawing for every sort card, keyed by beat id then item id. */")
    out.append("export const U2_SORT_FIGURES: Readonly<Record<string, Readonly<Record<string, NamedFigure>>>> = " + ts(SORT_FIGURES) + ";\n")
    out.append("/** The Huckel counter's per atom output for every species, drawn. Data for production beats; nothing renders it yet. */")
    out.append("export const U2_PI_TALLY: Readonly<Record<string, PiTally>> = " + ts(TALLY) + ";\n")
    out.append("/** Fourteen entries set aside for the Unit 2 exam, two or three from each lesson and run, never the u2-nomen branch. */")
    out.append("export const U2_EXAM_IDS: readonly string[] = Object.freeze(" + ts(EXAM_IDS) + ");\n")
    return "\n".join(out)


def main() -> int:
    rows = build()
    if FAILURES:
        print("REFUSED. Nothing written:")
        for f in FAILURES:
            print("  " + f)
        return 1
    text = emit()
    rep = report(rows)
    if EM_DASH in text or EM_DASH in rep:
        print("REFUSED: an em dash reached the output")
        return 1
    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_text(text, encoding="utf-8", newline="\n")
    REPORT.write_text(rep, encoding="utf-8", newline="\n")
    for node, entries in POOLS.items():
        print(f"{node}: {len(entries)}")
    print(f"disagreements: {len(DISAGREE)}; planarity-decided species: {sum(1 for n in SPECIES if H(n)['planarity_decided'])}")
    print(f"wrote {OUT.relative_to(REPO)} and {REPORT.relative_to(REPO)}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
