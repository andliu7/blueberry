"""
Unit 0 ("Start here") problem pools, story figures and guidebook drawings, a DRAFT, derived with RDKit.

Run:     python scripts/u0_pools.py
         python scripts/u0_pools.py --check   rebuild in memory, fail if any file on disk differs
Writes:  src/game/content/u0/pools.ts         the practice pools (PoolEntry, the Unit 1 shape)
         src/game/content/u0/figures.ts       the story's structures: SMILES, drawing, named atoms
         src/game/guide/u0Guide.figures.ts    the guidebook's mini examples
         scripts/u0_pools_report.md           what was derived, and the OWNER FLAGS
Never edit the generated files by hand: edit the specs below and rerun.

WHY A GENERATOR. The owner's rule is "derive, never assert". Every neutral
compound below starts as a NAME that OPSIN (py2opsin) turns into a structure,
so no SMILES is typed for it. Ions are MADE from those structures (a proton
taken off, a leaving group pulled away), never typed. Every answer is worked
out by RDKit and the script refuses to write anything (prints REFUSED, exits
1) when an authored key disagrees with what it derived.

WHAT RDKIT DERIVES
  formula             rdMolDescriptors.CalcMolFormula
  formal charge       Atom.GetFormalCharge
  lone pairs          (valence electrons - formal charge - bonds and H) / 2
  hybridisation       Atom.GetHybridization
  resonance forms     Chem.ResonanceMolSupplier (KEKULE_ALL), counted
  conjugate base      remove H+ from the named site (RWMol edit), conjugate acid adds one
  delta+ carbon       bond polarity rule on the cited EN table: carbon bonded to a more electronegative atom
                      (Gasteiger charges are computed and reported, not used: they disagree for CH3Br)
  nucleophile site    an atom with a lone pair, the most negative Gasteiger charge breaking ties
  substitution degree carbon neighbours of the carbon bearing the leaving group
  stereocentres       Chem.FindMolChiralCenters(includeUnassigned=True, new implementation)
  R/S and E/Z         rdCIPLabeler.AssignCIPLabels
  products            reaction SMARTS (AllChem.ReactionFromSmarts), sanitised; Zaitsev = most substituted alkene
  aromaticity         RDKit's aromatic flag (only for the Unit 2 preview, where it agrees with the taught model)

WHAT RDKIT CANNOT DERIVE, written as cited tables and listed under OWNER FLAGS
  PKA       pKa values. Each row names the page it is read from; all six were
            read against the live OpenStax pages on 2026-10-17.
  EN        Pauling electronegativities (OpenStax 2.1), for the delta plus rule.
  SN_TABLE  the SN1 / SN2 / E1 / E2 at a glance decision: substrate degree x
            reagent class (and the solvent that class implies) -> mechanism.

CHECKED AGAINST, never adapted (licensed problems are a check only):
  OpenStax Organic Chemistry (CC BY-NC-SA 4.0): 1.12 and 2.3 (bonding, formal
  charge), 2.4 to 2.6 (resonance), 2.7 to 2.8 (acids and bases, Table 2.3),
  6.4 to 6.5 (polar reactions, curved arrows), 5.5 and 7.5 (R/S, E/Z),
  11.12 (summary of SN1, SN2, E1, E2), Appendix B (pKa values).
"""

from __future__ import annotations

import json
import math
import re
import sys
from pathlib import Path

from rdkit import Chem, RDLogger
from rdkit.Chem import AllChem, rdCIPLabeler, rdDepictor
from rdkit.Chem.rdMolDescriptors import CalcMolFormula

RDLogger.DisableLog("rdApp.*")
rdDepictor.SetPreferCoordGen(True)

REPO = Path(__file__).resolve().parent.parent
OUT_POOLS = REPO / "src" / "game" / "content" / "u0" / "pools.ts"
OUT_FIGS = REPO / "src" / "game" / "content" / "u0" / "figures.ts"
OUT_GUIDE = REPO / "src" / "game" / "guide" / "u0Guide.figures.ts"
REPORT = REPO / "scripts" / "u0_pools_report.md"
PATHWAY = REPO / "src" / "game" / "demo" / "pathwayMap.ts"

SCRIPT = "scripts/u0_pools.py"
EM_DASH = chr(0x2014)
MINUS = "−"
W, H_FIG = 120, 84

FAILURES: list[str] = []
DERIVED: list[str] = []  # one line per item for the report: what RDKit said


def fail(msg: str) -> None:
    FAILURES.append(msg)


def os_page(section: str) -> str:
    return f"OpenStax Organic Chemistry {section} (CC BY-NC-SA), read as a check only"


# ---------------------------------------------------------------------------
# Molecules: names through OPSIN, ions made from them
# ---------------------------------------------------------------------------

def mol(smi: str) -> Chem.Mol:
    m = Chem.MolFromSmiles(smi)
    if m is None:
        raise ValueError(f"RDKit refused SMILES {smi}")
    return m


def canon(smi: str) -> str:
    return Chem.MolToSmiles(mol(smi))


def formula(smi: str) -> str:
    return CalcMolFormula(mol(smi))


OPSIN: dict[str, str | None] = {}


def opsin_all(names: list[str]) -> None:
    """Parse every name once (one Java start), canonicalised by RDKit."""
    from py2opsin import py2opsin

    todo = [n for n in dict.fromkeys(names) if n not in OPSIN]
    if todo:
        for n, got in zip(todo, py2opsin(todo)):
            OPSIN[n] = canon(got) if got else None


# key: (OPSIN name, what the student reads)
NAMED: dict[str, tuple[str, str]] = {
    "methane": ("methane", "methane"),
    "ethane": ("ethane", "ethane"),
    "ethene": ("ethene", "ethene"),
    "ethyne": ("ethyne", "ethyne"),
    "water": ("water", "water"),
    "ammonia": ("ammonia", "ammonia"),
    "methanol": ("methanol", "methanol"),
    "formaldehyde": ("methanal", "formaldehyde"),
    "formic_acid": ("formic acid", "formic acid"),
    "ethanol": ("ethanol", "ethanol"),
    "dimethyl_ether": ("methoxymethane", "dimethyl ether"),
    "acetic_acid": ("acetic acid", "acetic acid"),
    "benzene": ("benzene", "benzene"),
    "cyclohexene": ("cyclohexene", "cyclohexene"),
    "cyclohexane": ("cyclohexane", "cyclohexane"),
    "hcl": ("hydrogen chloride", "hydrogen chloride"),
    "phenol": ("phenol", "phenol"),
    "cyclohexanol": ("cyclohexanol", "cyclohexanol"),
    "hcn": ("hydrogen cyanide", "hydrogen cyanide"),
    "carbonic_acid": ("carbonic acid", "carbonic acid"),
    "acetone": ("propan-2-one", "acetone"),
    "borane": ("borane", "borane"),
    "bromomethane": ("bromomethane", "bromomethane"),
    "bromoethane": ("bromoethane", "bromoethane"),
    "bromopropane2": ("2-bromopropane", "2-bromopropane"),
    "tbubr": ("2-bromo-2-methylpropane", "tert-butyl bromide"),
    "bromobutane1": ("1-bromobutane", "1-bromobutane"),
    "bromobutane2": ("2-bromobutane", "2-bromobutane"),
    "tbuoh": ("2-methylpropan-2-ol", "tert-butanol"),
    "propan2ol": ("propan-2-ol", "2-propanol"),
    "butan2ol": ("butan-2-ol", "2-butanol"),
    "r_butan2ol": ("(R)-butan-2-ol", "(R)-2-butanol"),
    "butanediol": ("butane-2,3-diol", "butane-2,3-diol"),
    "e_butene": ("(E)-but-2-ene", "(E)-2-butene"),
    "butadiene": ("buta-1,3-diene", "1,3-butadiene"),
    "methylamine": ("methylamine", "methylamine"),
    "chloronitrobenzene": ("1-chloro-4-nitrobenzene", "4-chloronitrobenzene"),
    "glucose_chain": ("2,3,4,5,6-pentahydroxyhexanal", "glucose (open chain)"),
    "glycine": ("glycine", "glycine"),
    "alanine": ("2-aminopropanoic acid", "alanine"),
    "tributyrin": ("propane-1,2,3-triyl tributanoate", "a small fat (glyceryl tributanoate)"),
    "glycerol": ("propane-1,2,3-triol", "glycerol"),
    "isobutylene": ("2-methylprop-1-ene", "2-methylpropene"),
    "but1ene": ("but-1-ene", "but-1-ene"),
    "but2ene": ("but-2-ene", "but-2-ene"),
    "ethoxybutane": ("2-ethoxybutane", "2-ethoxybutane"),
    "dtbe": ("2-methyl-2-[(2-methylpropan-2-yl)oxy]propane", "di-tert-butyl ether"),
}

SP: dict[str, dict] = {}  # key -> {"smi", "name", "how"}


def species(key: str) -> str:
    return SP[key]["smi"]


def name_of(key: str) -> str:
    return SP[key]["name"]


def add_species(key: str, smi: str, name: str, how: str) -> None:
    SP[key] = {"smi": canon(smi), "name": name, "how": how}


def heavy(m: Chem.Mol) -> list[Chem.Atom]:
    return [a for a in m.GetAtoms() if a.GetAtomicNum() > 1]


def site(smi: str, smarts: str) -> int:
    hits = mol(smi).GetSubstructMatches(Chem.MolFromSmarts(smarts))
    if not hits:
        raise ValueError(f"{smarts} not in {smi}")
    return hits[0][0]


def shift_h(smi: str, idx: int, delta: int) -> str:
    """Add (delta 1) or remove (delta -1) one H+ at atom idx. The charge moves with it."""
    rw = Chem.RWMol(mol(smi))
    a = rw.GetAtomWithIdx(idx)
    hs = a.GetTotalNumHs()
    if delta < 0 and hs == 0:
        raise ValueError(f"no H to remove on atom {idx} of {smi}")
    a.SetNoImplicit(True)
    a.SetNumExplicitHs(hs + delta)
    a.SetFormalCharge(a.GetFormalCharge() + delta)
    Chem.SanitizeMol(rw)
    return Chem.MolToSmiles(rw)


def conj_base(smi: str, smarts: str) -> str:
    return shift_h(smi, site(smi, smarts), -1)


def conj_acid(smi: str, smarts: str) -> str:
    return shift_h(smi, site(smi, smarts), +1)


def heterolysis(smi: str, lg: str = "[Br,Cl,I]") -> str:
    """Pull the leaving group off with the bond's two electrons: carbon keeps a +."""
    m = mol(smi)
    x = site(smi, lg)
    c = m.GetAtomWithIdx(x).GetNeighbors()[0].GetIdx()
    hs = m.GetAtomWithIdx(c).GetTotalNumHs()  # read before the edit: an edited RWMol reports 0
    rw = Chem.RWMol(m)
    rw.RemoveBond(c, x)
    ca = rw.GetAtomWithIdx(c)
    ca.SetNoImplicit(True)
    ca.SetNumExplicitHs(hs)
    ca.SetFormalCharge(1)
    rw.RemoveAtom(x)
    Chem.SanitizeMol(rw)
    return Chem.MolToSmiles(rw)


def lone_pairs(a: Chem.Atom) -> int:
    outer = {"H": 1, "B": 3, "C": 4, "N": 5, "O": 6, "F": 7, "Cl": 7, "Br": 7, "I": 7, "S": 6}[a.GetSymbol()]
    return (outer - a.GetFormalCharge() - a.GetTotalValence()) // 2


def charged_atom(smi: str) -> Chem.Atom:
    found = [a for a in mol(smi).GetAtoms() if a.GetFormalCharge() != 0]
    if len(found) != 1:
        raise ValueError(f"{smi}: expected one charged atom, found {len(found)}")
    return found[0]


def resonance_count(smi: str) -> int:
    return len(Chem.ResonanceMolSupplier(mol(smi), Chem.KEKULE_ALL))


def resonance_forms(smi: str) -> list[Chem.Mol]:
    return [Chem.Mol(x) for x in Chem.ResonanceMolSupplier(mol(smi), Chem.KEKULE_ALL)]


def gasteiger(smi: str) -> list[tuple[int, str, float]]:
    m = mol(smi)
    AllChem.ComputeGasteigerCharges(m)
    return [(a.GetIdx(), a.GetSymbol(), a.GetDoubleProp("_GasteigerCharge")) for a in heavy(m)]


def delta_plus(smi: str) -> int | None:
    """
    The delta plus carbon, by the textbook bond polarity rule: in a bond from
    carbon to a MORE electronegative atom, the electrons are drawn toward that
    atom and carbon is delta plus (OpenStax 2.1). Electronegativities are the
    cited EN table (an OWNER FLAG). The carbon with the largest such pull wins;
    None when no carbon is pulled on or two tie.

    Round 2: this used to be "the most positive Gasteiger atom", which in CH3Br
    is a near zero carbon (-0.008) beside a more negative Br, so the check could
    not fail in a two heavy atom molecule. Gasteiger is now only reported.
    """
    m = mol(smi)
    pull: dict[int, float] = {}
    for b in m.GetBonds():
        for c, x in ((b.GetBeginAtom(), b.GetEndAtom()), (b.GetEndAtom(), b.GetBeginAtom())):
            if c.GetSymbol() == "C" and x.GetSymbol() in EN and EN[x.GetSymbol()] > EN["C"]:
                pull[c.GetIdx()] = max(pull.get(c.GetIdx(), 0.0), (EN[x.GetSymbol()] - EN["C"]) * b.GetBondTypeAsDouble())
    if not pull:
        return None
    best = max(pull.values())
    top = [i for i, v in pull.items() if v == best]
    return top[0] if len(top) == 1 else None


def nucleophile_atom(smi: str) -> int | None:
    m = mol(smi)
    with_pairs = {a.GetIdx() for a in heavy(m) if lone_pairs(a) > 0}
    if not with_pairs:
        return None
    return min((t for t in gasteiger(smi) if t[0] in with_pairs), key=lambda t: t[2])[0]


def carbon_degree(smi: str, at: int) -> int:
    return sum(1 for n in mol(smi).GetAtomWithIdx(at).GetNeighbors() if n.GetSymbol() == "C")


def lg_carbon(smi: str) -> int:
    return site(smi, "[CX4][Br,Cl,I]")


def stereocentres(smi: str) -> list[int]:
    return [i for i, _ in Chem.FindMolChiralCenters(mol(smi), includeUnassigned=True, useLegacyImplementation=False)]


def cip_atoms(smi: str) -> dict[int, str]:
    m = mol(smi)
    rdCIPLabeler.AssignCIPLabels(m)
    return {a.GetIdx(): a.GetProp("_CIPCode") for a in m.GetAtoms() if a.HasProp("_CIPCode")}


def cip_bonds(smi: str) -> dict[int, str]:
    m = mol(smi)
    rdCIPLabeler.AssignCIPLabels(m)
    return {b.GetIdx(): b.GetProp("_CIPCode") for b in m.GetBonds() if b.HasProp("_CIPCode")}


def mirror(smi: str) -> str:
    return canon(smi.replace("@@", "!").replace("@", "@@").replace("!", "@"))


def react(smarts: str, *reactants: str) -> list[list[str]]:
    """Every distinct product set the SMARTS gives, each as a sorted list of canonical SMILES."""
    rx = AllChem.ReactionFromSmarts(smarts)
    seen: dict[str, list[str]] = {}
    for products in rx.RunReactants(tuple(mol(r) for r in reactants)):
        out = []
        for p in products:
            Chem.SanitizeMol(p)
            out.append(Chem.MolToSmiles(p))
        out.sort()
        seen[".".join(out)] = out
    return [seen[k] for k in sorted(seen)]


def alkene_subst(smi: str) -> int:
    m = mol(smi)
    best = 0
    for b in m.GetBonds():
        if b.GetBondType() == Chem.BondType.DOUBLE and b.GetBeginAtom().GetSymbol() == "C" and b.GetEndAtom().GetSymbol() == "C":
            n = sum(1 for a in (b.GetBeginAtom(), b.GetEndAtom()) for x in a.GetNeighbors()
                    if x.GetSymbol() == "C" and x.GetIdx() not in (b.GetBeginAtomIdx(), b.GetEndAtomIdx()))
            best = max(best, n)
    return best


SN2_SMARTS = {
    "O-": "[CX4:1][Br,Cl,I:2].[O-:3]>>[C:1][O+0:3].[*-:2]",
    "C-": "[CX4:1][Br,Cl,I:2].[C-:3]#[N:4]>>[C:1][C+0:3]#[N:4].[*-:2]",
}
SN1_WATER = "[CX4:1][Br,Cl,I:2].[OH2:3]>>[C:1][OH1+0:3].[*-:2]"
E2_SMARTS = "[CX4;!H0:1][CX4:2][Br,Cl,I:3]>>[C:1]=[C:2].[*-:3]"
E1_SMARTS = "[CX3+:1][CX4;!H0:2]>>[C+0:1]=[C:2]"
DA_SMARTS = "[C:1]=[C:2][C:3]=[C:4].[C:5]=[C:6]>>[C:1]1[C:2]=[C:3][C:4][C:6][C:5]1"
IMINE_SMARTS = "[CX3:1]=[O:2].[NX3;H2:3]>>[C:1]=[N:3].[O:2]"
ESTER_SMARTS = "[CX3:1](=[O:2])[OH1:3].[OH1:4][CX4:5]>>[C:1](=[O:2])[O:4][C:5].[O:3]"
EAS_BR = "[cH:1].[Br:2][Br:3]>>[c:1][Br:2].[Br:3]"
SNAR_OH = "[c:1][Cl:2].[O-:3]>>[c:1][O+0:3].[Cl-:2]"
HYDROLYSIS = "[CX3:1](=[O:2])[O:3][CX4:4].[OH-:5]>>[C:1](=[O:2])[O-:5].[O+0:3][C:4]"


def only(products: list[list[str]], what: str) -> list[str]:
    if len(products) != 1:
        fail(f"{what}: expected one product set, got {products}")
        return products[0] if products else []
    return products[0]


# ---------------------------------------------------------------------------
# Cited tables (NOT derivable). Every row lands under OWNER FLAGS.
# ---------------------------------------------------------------------------

T23 = "OpenStax Organic Chemistry 2.8, Table 2.3 (Relative Strengths of Some Common Acids and Their Conjugate Bases)"
T171 = "OpenStax Organic Chemistry 17.2, Table 17.1 (Acidity Constants of Some Alcohols and Phenols)"
# Read against the live pages on 2026-10-17 (round 2): every value below matched its page.
PKA: dict[str, tuple[float, str]] = {
    "hcl": (-7.0, T23),
    "acetic_acid": (4.76, T23),
    "hcn": (9.31, T23),
    "phenol": (9.89, T171),
    "water": (15.74, T23),
    "ethanol": (16.00, T23),
}

# Pauling electronegativities as OpenStax prints them (one decimal). H, C, N and
# O were read in the text of OpenStax 2.1 on 2026-10-17; B, Cl and Br are in its
# Figure 2.3, which the page text does not carry, so those three are unverified.
EN_CITE = "OpenStax Organic Chemistry 2.1 (Polar Covalent Bonds and Electronegativity), text and Figure 2.3"
EN: dict[str, float] = {"H": 2.1, "B": 2.0, "C": 2.5, "N": 3.0, "O": 3.5, "Cl": 3.0, "Br": 2.8}
EN_VERIFIED = {"H", "C", "N", "O"}

SN_CITE = ("OpenStax Organic Chemistry 11.12 (A Summary of Reactivity: SN1, SN2, E1, E1cB, and E2), "
           "and LibreTexts Chemistry, Organic Chemistry (Wade), 6.18 Summary of Reactions of Alkyl Halides")
REAGENT = {
    "strong_base": "strong base and nucleophile (HO⁻, CH₃O⁻, EtO⁻)",
    "bulky_base": "bulky strong base (t-BuO⁻)",
    "good_nuc": "good nucleophile, weak base (I⁻, CN⁻, N₃⁻), polar aprotic",
    "weak": "weak nucleophile and base (H₂O, EtOH), polar protic",
}
DEGREE_WORD = {0: "methyl", 1: "1°", 2: "2°", 3: "3°"}
SN_TABLE: dict[tuple[int, str], str] = {
    (0, "strong_base"): "SN2", (0, "bulky_base"): "SN2", (0, "good_nuc"): "SN2", (0, "weak"): "no reaction",
    (1, "strong_base"): "SN2", (1, "bulky_base"): "E2", (1, "good_nuc"): "SN2", (1, "weak"): "no reaction",
    (2, "strong_base"): "E2", (2, "bulky_base"): "E2", (2, "good_nuc"): "SN2", (2, "weak"): "SN1 and E1, slow",
    (3, "strong_base"): "E2", (3, "bulky_base"): "E2", (3, "good_nuc"): "SN1 and E1", (3, "weak"): "SN1 and E1",
}


def mechanism(substrate: str, reagent: str) -> str:
    deg = carbon_degree(substrate, lg_carbon(substrate))
    return SN_TABLE[(deg, reagent)]


# ---------------------------------------------------------------------------
# Figures: Unit 1's 120 x 84 format (bonds, labels, rings), wedges from RDKit
# ---------------------------------------------------------------------------

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


def figure(smi: str, marks: list[int] | None = None, pairs: bool = False,
           where: dict[int, tuple[float, float]] | None = None, source: Chem.Mol | None = None,
           charges: bool = True, explicit_h: bool = False) -> dict:
    """
    A skeletal drawing. Heteroatoms carry their H count (OH, NH_2); a nitro
    group is written NO_2; charges sit beside their atom; `marks` circles
    atoms; `pairs` draws each heteroatom's lone pairs as dots; `where` hands
    back each atom's drawn position (the story highlights atoms by index).
    `source` draws that Mol as is (a resonance contributor keeps its bonds).
    `charges=False` leaves the charge marks off, for a question that ASKS the
    charge (round 2: the drawn "+" gave the answer away).
    """
    base = Chem.Mol(source) if source is not None else Chem.Mol(mol(smi))
    Chem.Kekulize(base, clearAromaticFlags=True)
    # One heavy atom (water, ammonia, methane, an ion like CH3+): draw every H as
    # a bond and label every atom, so a beginner sees a shape and not a formula
    # (round 2: "OH2" and "CH4" read as text). Heavy atoms keep their indexes.
    # `explicit_h` does the same for a small molecule whose H count is the question (chapter 1's match).
    tiny = explicit_h or (base.GetNumAtoms() == 1 and base.GetAtomWithIdx(0).GetTotalNumHs() > 0)
    if tiny:
        base = Chem.AddHs(base)
    m = base
    rdDepictor.Compute2DCoords(m)
    chiral = [a.GetIdx() for a in m.GetAtoms() if a.GetChiralTag() != Chem.ChiralType.CHI_UNSPECIFIED]
    if chiral:
        Chem.WedgeMolBonds(m, m.GetConformer())
    conf = m.GetConformer()
    pts = [(conf.GetAtomPosition(i).x, -conf.GetAtomPosition(i).y) for i in range(m.GetNumAtoms())]
    marks = marks or []
    xs = [p[0] for p in pts]
    ys = [p[1] for p in pts]
    span_x = max(xs) - min(xs) or 1.0
    span_y = max(ys) - min(ys) or 1.0
    lengths = [math.dist(pts[b.GetBeginAtomIdx()], pts[b.GetEndAtomIdx()]) for b in m.GetBonds()]
    unit = (sum(lengths) / len(lengths)) if lengths else 1.0
    scale = min((30.0 if tiny else 22.0) / unit, 80.0 / span_x, 46.0 / span_y)
    cx = (max(xs) + min(xs)) / 2
    cy = (max(ys) + min(ys)) / 2

    def at(i: int) -> tuple[float, float]:
        return (W / 2 + (pts[i][0] - cx) * scale, H_FIG / 2 + 2 + (pts[i][1] - cy) * scale)

    if where is not None:
        for a in m.GetAtoms():
            where[a.GetIdx()] = tuple(r1(v) for v in at(a.GetIdx()))

    hidden: set[int] = set()
    condensed: dict[int, tuple[str, str]] = {}
    for a in m.GetAtoms():
        oxy = [n.GetIdx() for n in a.GetNeighbors() if n.GetSymbol() == "O"]
        if (a.GetSymbol() == "N" and a.GetFormalCharge() == 1 and len(oxy) == 2 and a.GetDegree() == 3
                and not a.IsInRing()):
            condensed[a.GetIdx()] = ("NO_2", "O_2N")
            hidden |= set(oxy)

    lonely = m.GetNumAtoms() == 1 or tiny
    labelled = {a.GetIdx() for a in m.GetAtoms() if a.GetSymbol() != "C" or lonely}
    bonds = []
    for b in m.GetBonds():
        i, j = b.GetBeginAtomIdx(), b.GetEndAtomIdx()
        if i in hidden or j in hidden:
            continue
        (x1, y1), (x2, y2) = at(i), at(j)
        dx, dy = x2 - x1, y2 - y1
        length = math.hypot(dx, dy)
        ux, uy = dx / length, dy / length
        trim = min(6.0, length * 0.3)
        if i in labelled:
            x1, y1 = x1 + ux * trim, y1 + uy * trim
        if j in labelled:
            x2, y2 = x2 - ux * trim, y2 - uy * trim
        order = int(b.GetBondTypeAsDouble())
        bond = {"x1": r1(x1), "y1": r1(y1), "x2": r1(x2), "y2": r1(y2)}
        if order > 1:
            bond["order"] = order
        direction = b.GetBondDir()
        if direction in (Chem.BondDir.BEGINWEDGE, Chem.BondDir.BEGINDASH):
            if m.GetAtomWithIdx(i).GetChiralTag() == Chem.ChiralType.CHI_UNSPECIFIED:
                fail(f"figure {smi}: a wedge does not start at a stereocentre")
            bond["stereo"] = "wedge" if direction == Chem.BondDir.BEGINWEDGE else "hash"
        bonds.append(bond)

    def gap_angle(i: int) -> float:
        x, y = at(i)
        angles = sorted(math.atan2(ny - y, nx - x) for nx, ny in (at(n.GetIdx()) for n in m.GetAtomWithIdx(i).GetNeighbors()))
        if not angles:
            return -math.pi / 2
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
        if i in hidden:
            continue
        if i in condensed:
            x, y = at(i)
            nb = [n.GetIdx() for n in a.GetNeighbors() if n.GetIdx() not in hidden][0]
            dx = x - at(nb)[0]
            right, left = condensed[i]
            if dx > 3:
                labels.append({"x": r1(x - 4.5), "y": r1(y + 5), "t": right, "size": 13, "anchor": "start"})
            elif dx < -3:
                labels.append({"x": r1(x + 4.5), "y": r1(y + 5), "t": left, "size": 13, "anchor": "end"})
            else:
                labels.append({"x": r1(x), "y": r1(y + 5), "t": right, "size": 13})
            continue
        theta = gap_angle(i)
        text = sym
        if i in labelled:
            x, y = at(i)
            hs = a.GetTotalNumHs()
            text = sym + ("H" if hs else "") + (f"_{hs}" if hs > 1 else "")
            labels.append({"x": r1(x), "y": r1(y + 5), "t": text, "size": 13})
        q = a.GetFormalCharge()
        mark = None if q == 0 else (str(abs(q)) if abs(q) > 1 else "") + ("+" if q > 0 else MINUS)
        if not charges:
            mark = None
        if mark is not None:
            if i not in labelled:
                x, y = out(i, 8, theta)
            else:
                x, y = at(i)
                x += 6 + 4 * len(text.replace("_", ""))
                y -= 6
            labels.append({"x": r1(x), "y": r1(y + 4.5), "t": mark, "size": 13})
        if pairs and i in labelled and sym != "H":
            lp = lone_pairs(a)
            spread = {1: [0.0], 2: [-0.8, 0.8], 3: [-1.2, 0.0, 1.2]}.get(lp, [])
            for s in spread:
                th = theta + s + (0.6 if mark is not None else 0.0)
                x, y = out(i, 12, th)
                side = abs(math.cos(th)) > 0.7
                labels.append({"x": r1(x), "y": r1(y + (4 if side else 2)), "t": ":" if side else "··", "size": 13})
    rings = []
    for i in marks:
        x, y = at(i)
        rings.append({"x": r1(x), "y": r1(y), "r": 8})

    fig: dict = {"bonds": bonds}
    if labels:
        fig["labels"] = labels
    if rings:
        fig["rings"] = rings
    check_bounds(fig, smi)
    return fig


def named(key: str, caption: str | None = None, **kw) -> dict:
    return {"figure": figure(species(key), **kw), "name": caption or name_of(key)}


def structure(key: str, caption: str | None = None, **kw) -> dict:
    return {"kind": "structure", **named(key, caption, **kw)}


def pair(a: dict, b: dict) -> dict:
    return {"kind": "pair", "a": a, "b": b}


# ---------------------------------------------------------------------------
# Entries
# ---------------------------------------------------------------------------

POOLS: dict[str, list[dict]] = {}
VISUALS: dict[str, dict] = {}
TILES: dict[str, dict[str, dict]] = {}  # beat id -> option id -> drawn answer card (NamedFigure)
SORT_FIGURES: dict[str, dict] = {}
PREVIEW_UNITS: dict[str, str] = {}
IDS: set[str] = set()

CAPS = {"prompt": 90, "brief": 110, "option": 48, "why": 320}
CARD_CAP = 34


def lint_copy(where: str, text: str, cap: int | None = None) -> None:
    if cap is not None and len(text) > cap:
        fail(f"{where}: {len(text)} characters, over {cap}: {text}")
    if "?" in text:
        fail(f"{where}: has a question mark")
    if EM_DASH in text:
        fail(f"{where}: has an em dash")
    if text.strip() == "":
        fail(f"{where}: empty")
    for banned in ("you should have", "obviously", "of course", "try again", "you failed", "as you know", "review the chapter"):
        if banned in text.lower():
            fail(f"{where}: banned phrase '{banned}'")


def lint_arith(where: str, text: str) -> None:
    if re.search(r"[0-9]\s*[+*/=]\s*[0-9]", text) or re.search(r"\b(calculate|compute|how many moles)\b", text, re.I):
        fail(f"{where}: reads as arithmetic, which the easy MCQ rule bans in a prompt or brief")


def new_id(id: str) -> None:
    if id in IDS:
        fail(f"duplicate id {id}")
    if not id.startswith("u0-"):
        fail(f"{id}: ids start u0-")
    IDS.add(id)


def prov(what: str, section: str, flag: str | None = None) -> str:
    tail = f" Rests on an OWNER FLAG table: {flag}." if flag else ""
    return f"{SCRIPT}: {what}. {os_page(section)}.{tail}"


def mcq(node: str, id: str, prompt: str, options: list[tuple[str, str, str]], derived: str | None,
        correct: str, explanation: str, provenance: str, visual: dict | None, brief: str | None = None,
        concept: str = "structure_and_bonding", note: str = "", tiles: dict[str, dict] | None = None,
        levels: list[int] | None = None) -> None:
    """`tiles` draws every option as a molecule card (option id -> named()); all or none.
    `levels` [0] makes a "guess first" question: played ungraded, as a lesson's meet step."""
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
    ids = [o for o, _, _ in options]
    if len(set(ids)) != len(ids):
        fail(f"{id}: two options share an id")
    if derived is None:
        fail(f"{id}: the script could not derive an answer")
    elif derived != correct:
        fail(f"{id}: authored answer {correct}, derived answer {derived}")
    if correct not in ids:
        fail(f"{id}: the key {correct} is not an option")
    if tiles is not None and sorted(tiles) != sorted(ids):
        fail(f"{id}: option tiles {sorted(tiles)} do not cover the options {sorted(ids)}")
    new_id(id)
    # Specs are written right answer first; a stable turn by the id spreads the key over every slot.
    turn = sum(map(ord, id)) % len(options)
    options = options[turn:] + options[:turn]
    beat = {"kind": "mcq", "id": id, "node": node, "conceptIds": [concept], "levels": levels or [1], "prompt": prompt}
    if brief is not None:
        beat["brief"] = brief
    beat["correctOptionId"] = correct
    beat["options"] = [{"id": o, "text": t, "why": w} for o, t, w in options]
    POOLS.setdefault(node, []).append(
        {"id": id, "item": {"kind": "mcq", "beat": beat}, "explanation": explanation, "provenance": provenance, "placeholder": True}
    )
    if visual is None and tiles is None:
        fail(f"{id}: an MCQ needs a drawing above it or drawn option tiles")
    if visual is not None:
        VISUALS[id] = visual
    if tiles is not None:
        TILES[id] = tiles
    DERIVED.append(f"| `{id}` | mcq | {correct} | {note or 'derived ' + str(derived)} |")


def ladder(node: str, id: str, cards: list[tuple[str, str, str, str]], score, prompt: str, brief: str,
           criterion: str, topic: str, track: tuple[str, str], problem_prompt: str,
           solution: tuple[str, str, str], swap: tuple[str, str, str], explanation: str, provenance: str,
           concept: str, figure_kw: dict | None = None) -> None:
    """One sort ladder. cards: (card id, label, species key, why), authored most-first.
    `score` maps a species key to a number; the authored order must be strictly descending in it."""
    new_id(id)
    scores = [score(key) for _, _, key, _ in cards]
    if any(b >= a for a, b in zip(scores, scores[1:])):
        fail(f"{id}: authored order is not strictly descending in the derived score {scores}")
    order = [c for c, _, _, _ in cards]
    swapped = [order[1], order[0], *order[2:]]
    for cid, label, _, why in cards:
        lint_copy(f"{id} card {cid}", label, CARD_CAP)
        lint_copy(f"{id} why {cid}", why, CAPS["why"])
    lint_copy(f"{id} prompt", prompt, CAPS["prompt"])
    lint_copy(f"{id} brief", brief, CAPS["brief"])
    for part in (*solution, *swap):
        lint_copy(f"{id} explanation part", part)
    POOLS.setdefault(node, []).append({
        "__ladder__": True,
        "id": id,
        "node": node,
        "problemId": id,
        "topic": topic,
        "difficulty": 900,
        "problemPrompt": problem_prompt,
        "criterionText": track[0].lower(),
        "items": [{"id": c, "text": label} for c, label, _, _ in cards],
        "order": order,
        "solution": {"whatHappened": solution[0], "why": solution[1], "lookAt": solution[2]},
        "distractors": [
            {"id": "reversed", "cause": "ordering_is_reversed", "order": list(reversed(order)),
             "explanation": {"whatHappened": "The right ladder, read from the other end.",
                             "why": f"Every step holds, but the track asks for {track[0].lower()} at the top.",
                             "lookAt": f"Put {cards[0][1]} first."}},
            {"id": "top-swap", "cause": "ordering_one_adjacent_pair_swapped", "order": swapped,
             "explanation": {"whatHappened": swap[0], "why": swap[1], "lookAt": swap[2]}},
        ],
        "beat": {
            "conceptIds": [concept],
            "prompt": prompt,
            "brief": brief,
            "criterion": criterion,
            "direction": "descending",
            "notes": {c: why for c, _, _, why in cards},
        },
        "trackEnds": {"first": track[0], "last": track[1]},
        "meanings": [{"id": "reversed", "cause": "order_fully_reversed"}, {"id": "top-swap", "cause": "order_adjacent_pair_swapped"}],
        "explanation": explanation,
        "provenance": provenance,
    })
    SORT_FIGURES[id] = {c: named(key, label, **(figure_kw or {})) for c, label, key, _ in cards}
    DERIVED.append(f"| `{id}` | sort | {' > '.join(order)} | scores {scores} |")


def match(node: str, id: str, prompt: str, brief: str, pairs: list[tuple],
          explanation: str, provenance: str, concept: str) -> None:
    """pairs: (pair id, left card, right card, why, the right card as derived[, species key]). They must agree.
    The species key draws the left card's molecule on it (round 2: every match card shows its structure)."""
    new_id(id)
    lint_copy(f"{id} prompt", prompt, CAPS["prompt"])
    lint_copy(f"{id} brief", brief, CAPS["brief"])
    rights = [p[2] for p in pairs]
    if len(set(rights)) != len(rights):
        fail(f"{id}: two pairs share a right hand card, so the board has two answers")
    for pid, left, right, why, derived, *_ in pairs:
        lint_copy(f"{id} left {pid}", left, CARD_CAP)
        lint_copy(f"{id} right {pid}", right, CARD_CAP)
        lint_copy(f"{id} why {pid}", why, CAPS["why"])
        if derived != right:
            fail(f"{id}: pair {pid} authored '{right}', derived '{derived}'")
    beat = {
        "kind": "match", "id": id, "node": node, "conceptIds": [concept], "levels": [1, 2],
        "presentation": "columns", "prompt": prompt, "brief": brief,
        "pairs": [{"id": p[0], "left": p[1], "right": p[2], "why": p[3],
                   **({"leftFigure": figure(species(p[5]), **(p[6] if len(p) > 6 else {}))} if len(p) > 5 else {})}
                  for p in pairs],
    }
    POOLS.setdefault(node, []).append({"__match__": True, "beat": beat, "explanation": explanation, "provenance": provenance})
    DERIVED.append(f"| `{id}` | match | {'; '.join(f'{p[1]} = {p[2]}' for p in pairs)} | every right card derived |")


def inchi_of(smi: str) -> str:
    out = Chem.MolToInchi(mol(smi))
    if not out.startswith("InChI=1S/"):
        fail(f"no standard InChI for {smi}")
    return out


def draw(node: str, id: str, prompt: str, brief: str, visual: dict, answer_key: str, check, why: str,
         look_at: str, misses: list[tuple[str, str, str]], explanation: str, provenance: str) -> None:
    """One "Draw it" entry. `check` is a predicate on the answer SMILES that RDKit must pass.
    misses: (id, species key, coach line), each a wrong structure named after a miss."""
    new_id(id)
    lint_copy(f"{id} prompt", prompt, CAPS["prompt"])
    lint_copy(f"{id} brief", brief, CAPS["brief"])
    for where, text in (("why", why), ("lookAt", look_at), ("explanation", explanation)):
        lint_copy(f"{id} {where}", text, CAPS["why"])
    smi = species(answer_key)
    if not check(smi):
        fail(f"{id}: the answer {smi} fails its own derived check")
    miss_rows = []
    for mid, key, says in misses:
        lint_copy(f"{id} miss {mid}", says, CAPS["why"])
        if inchi_of(species(key)) == inchi_of(smi):
            fail(f"{id}: miss {mid} is the answer")
        miss_rows.append({"id": mid, "inchi": inchi_of(species(key)), "name": name_of(key), "says": says})
    beat = {
        "kind": "draw", "id": id, "node": node, "conceptIds": ["structure_and_bonding"], "levels": [2],
        "prompt": prompt, "brief": brief, "visual": visual,
        "answer": {"smiles": smi, "inchi": inchi_of(smi), "name": name_of(answer_key), "figure": figure(smi)},
        "stereo": False, "why": why, "lookAt": look_at, "misses": miss_rows,
    }
    POOLS.setdefault(node, []).append(
        {"id": id, "item": {"kind": "draw", "beat": beat}, "explanation": explanation, "provenance": provenance, "placeholder": True}
    )
    DERIVED.append(f"| `{id}` | draw | {smi} | formula {formula(smi)} |")


def key_where(options: dict[str, object], value: object) -> str | None:
    """The one option whose value equals the derived value, or None (no answer, or two)."""
    hits = [k for k, v in options.items() if v == value]
    return hits[0] if len(hits) == 1 else None


# ---------------------------------------------------------------------------
# Species
# ---------------------------------------------------------------------------

# Names only checked against (a product the SMARTS made must equal what OPSIN reads for its name).
CHECK_NAMES = ["cyclohexene", "bromobenzene", "4-nitrophenol", "N-methylpropan-2-imine", "ethyl acetate",
               "2-methylprop-1-ene", "but-2-ene", "pentanenitrile"]


def build_species() -> None:
    opsin_all([n for n, _ in NAMED.values()] + CHECK_NAMES)
    for key, (name, shown) in NAMED.items():
        got = OPSIN[name]
        if got is None:
            fail(f"OPSIN could not parse '{name}'")
            continue
        add_species(key, got, shown, f"OPSIN '{name}'")
    if FAILURES:
        return
    made = [
        ("hydroxide", conj_base(species("water"), "[OX2H2]"), "hydroxide", "conjugate base of water"),
        ("hydronium", conj_acid(species("water"), "[OX2H2]"), "hydronium", "conjugate acid of water"),
        ("ammonium", conj_acid(species("ammonia"), "[NX3]"), "ammonium", "conjugate acid of ammonia"),
        ("acetate", conj_base(species("acetic_acid"), "[OX2H1]"), "acetate", "conjugate base of acetic acid (O-H)"),
        ("acetic_carbanion", conj_base(species("acetic_acid"), "[CH3]"), "CH₂COOH⁻ (C-H removed)", "acetic acid with a C-H proton removed"),
        ("acetic_protonated", conj_acid(species("acetic_acid"), "[OX1]=C"), "protonated acetic acid", "conjugate acid of acetic acid"),
        ("oxide", conj_base(conj_base(species("water"), "[OX2H2]"), "[OH-]"), "oxide O²⁻", "water with both protons removed"),
        ("methoxide", conj_base(species("methanol"), "[OX2H1]"), "methoxide", "conjugate base of methanol"),
        ("ethoxide", conj_base(species("ethanol"), "[OX2H1]"), "ethoxide", "conjugate base of ethanol"),
        ("tbuo", conj_base(species("tbuoh"), "[OX2H1]"), "tert-butoxide", "conjugate base of tert-butanol"),
        ("cyanide", conj_base(species("hcn"), "[CH1]"), "cyanide", "conjugate base of hydrogen cyanide"),
        ("phenoxide", conj_base(species("phenol"), "[OX2H1]"), "phenoxide", "conjugate base of phenol"),
        ("cyclohexoxide", conj_base(species("cyclohexanol"), "[OX2H1]"), "cyclohexoxide", "conjugate base of cyclohexanol"),
        ("carbonate", conj_base(conj_base(species("carbonic_acid"), "[OX2H1]"), "[OX2H1]"), "carbonate", "carbonic acid with both O-H protons removed"),
        ("enolate", conj_base(species("acetone"), "[CH3]"), "acetone enolate", "acetone with an alpha C-H proton removed"),
        ("methyl_cation", heterolysis(species("bromomethane")), "methyl cation", "bromomethane minus bromide"),
        ("ethyl_cation", heterolysis(species("bromoethane")), "ethyl cation (1°)", "bromoethane minus bromide"),
        ("isopropyl_cation", heterolysis(species("bromopropane2")), "isopropyl cation (2°)", "2-bromopropane minus bromide"),
        ("tbu_cation", heterolysis(species("tbubr")), "tert-butyl cation (3°)", "tert-butyl bromide minus bromide"),
        ("bromide", "[Br-]", "bromide", "the leaving group, as the SMARTS releases it"),
    ]
    for key, smi, shown, how in made:
        add_species(key, smi, shown, how)
    add_species("s_butan2ol", mirror(species("r_butan2ol")), "(S)-2-butanol", "mirror image of (R)-2-butanol (every @ swapped)")


# ---------------------------------------------------------------------------
# Chapter 1: your lab bench (one item per control)
# ---------------------------------------------------------------------------

def ch1() -> None:
    node = "u0-controls"
    # Tap: three drawn molecules, one with an O-H. The answer is the one the SMARTS finds an O-H in.
    oh = Chem.MolFromSmarts("[OX2H][CX4]")
    cands = {"eth": "ethanol", "ether": "dimethyl_ether", "ethane": "ethane"}
    with_oh = [k for k, key in cands.items() if mol(species(key)).HasSubstructMatch(oh)]
    mcq(node, "u0-ctl-tap", "Tap the molecule with an O-H group.",
        [("eth", "Ethanol", "Right. Its O carries an H: an O-H on a carbon makes an alcohol."),
         ("ether", "Dimethyl ether", "Its O sits between two carbons and has no H on it."),
         ("ethane", "Ethane", "Ethane is only carbon and hydrogen. There is no O at all.")],
        with_oh[0] if len(with_oh) == 1 else None, "eth",
        "An alcohol is an O-H on an sp3 carbon. Ethanol, CH₃CH₂OH, has one; dimethyl ether's O has no H.",
        prov("O-H found by SMARTS on each OPSIN structure", "3.1"),
        None, brief="Tap a card, then CHECK.",
        tiles={k: named(key) for k, key in cands.items()}, note=f"O-H found in: {with_oh}")

    # Drag: rank one-carbon molecules by bonds from carbon to O, counted by RDKit (bond orders added).
    def to_o(key: str) -> int:
        m = mol(species(key))
        c = next(a for a in m.GetAtoms() if a.GetSymbol() == "C")
        return int(sum(b.GetBondTypeAsDouble() for b in c.GetBonds() if b.GetOtherAtom(c).GetSymbol() == "O"))

    cards = [("fa", "Formic acid", "formic_acid", "Three bonds to O: a C=O and a C-OH."),
             ("fm", "Formaldehyde", "formaldehyde", "Two bonds to O, as one C=O double bond."),
             ("me", "Methanol", "methanol", "One bond to O: a single C-O."),
             ("ch4", "Methane", "methane", "No O at all: four C-H bonds.")]
    ladder(node, "u0-ctl-sort", cards, to_o,
           "Drag these into order, most bonds to O first.",
           "Count the lines from the carbon to O. A double bond counts two.",
           "oxidation_level", "structure_and_bonding", ("Most bonds to O", "Fewest bonds to O"),
           "Rank formic acid, formaldehyde, methanol and methane by bonds from carbon to oxygen, most first.",
           ("Formic acid (3), then formaldehyde (2), then methanol (1), then methane (0).",
            "Each line between the carbon and an O is one bond; a double line is two.",
            "Count the lines from the carbon to each O."),
           ("The top two are swapped.", "Formic acid has a C=O and a C-OH, three bonds to O; formaldehyde has only its C=O.",
            "Count the lines to O on the top two again."),
           "Bonds from carbon to O count up: methane 0, methanol 1, formaldehyde 2, formic acid 3. Orgo II calls this the oxidation level.",
           prov("bonds from C to O summed by RDKit bond order on each OPSIN structure", "17.7"),
           "structure_and_bonding", figure_kw={"explicit_h": True})

    # Match: a drawing to its formula. All four have two carbons, so the H count decides.
    pairs = []
    for pid, key, why in (("ane", "ethane", "Two carbons joined by a single bond: six H."),
                          ("ene", "ethene", "A double bond: each carbon has room for two H, four in all."),
                          ("yne", "ethyne", "A triple bond: one H on each carbon, two in all."),
                          ("ol", "ethanol", "Ethane's carbons plus an O: six H, one of them on the O.")):
        f = formula(species(key))
        shown = re.sub(r"(\d+)", lambda g: "".join("₀₁₂₃₄₅₆₇₈₉"[int(c)] for c in g.group(1)), f)
        pairs.append((pid, name_of(key).capitalize(), shown, why, shown, key, {"explicit_h": True}))
    match(node, "u0-ctl-match", "Match each drawing to its formula.",
          "Tap a drawing, then its formula.",
          pairs, "A molecular formula counts every atom. More bonds between two carbons leaves room for fewer H.",
          prov("formulas by RDKit CalcMolFormula on the OPSIN structures", "1.1"), "structure_and_bonding")

    draw(node, "u0-ctl-draw", "Draw ethanol.",
         "Start from two carbons and put an OH on the end.",
         structure("ethane", "ethane: add an OH to one end"), "ethanol",
         lambda s: formula(s) == "C2H6O" and mol(s).HasSubstructMatch(Chem.MolFromSmarts("[CH3][CH2][OH]")),
         "Ethanol is two carbons with an OH on the end, CH₃CH₂OH.",
         "Count the carbons, then check the O carries an H.",
         [("ethane", "ethane", "That is the starting two carbons. Put an OH on one end."),
          ("methanol", "methanol", "One carbon short. Ethanol has two carbons."),
          ("ether", "dimethyl_ether", "Same atoms, but the O sits between the carbons. Ethanol keeps its O-H.")],
         "Ethanol is CH₃CH₂OH: two carbons, and an O-H on the end.",
         prov("answer and misses from OPSIN names, InChI by RDKit; the answer must match C2H6O and CH3CH2OH by SMARTS", "3.1"))


# ---------------------------------------------------------------------------
# Chapter 2: bonds and formal charge
# ---------------------------------------------------------------------------

def fc_options(right: int) -> tuple[list[tuple[str, str, str]], dict[str, int]]:
    text = {1: "+1", 0: "0", -1: f"{MINUS}1"}
    vals = {"p": 1, "z": 0, "m": -1}
    return [(k, text[v], "") for k, v in vals.items()], vals


def ch2() -> None:
    node = "u0-bonding"
    nh4 = species("ammonium")
    n = next(a for a in mol(nh4).GetAtoms() if a.GetSymbol() == "N")
    mcq(node, "u0-bond-fc-nh4", "Four H atoms on one N. Pick the formal charge on that N.",
        [("p", "+1", "Right. N brings 5 valence electrons but owns only 4 here: one for each bond."),
         ("z", "0", "Neutral N has three bonds and a lone pair. This N has four bonds and no pair."),
         ("m", f"{MINUS}1", "A minus means extra electrons. This N has fewer than it brought.")],
        key_where({"p": 1, "z": 0, "m": -1}, n.GetFormalCharge()), "p",
        "Formal charge is valence electrons minus the electrons the atom owns. N in NH₄⁺ owns 4 of its 5, so it is +1.",
        prov("formal charge read from RDKit on ammonia protonated at N", "2.3"), structure("ammonium", pairs=True, charges=False),
        brief="Four bonds, no lone pair.", note=f"N formal charge {n.GetFormalCharge()}")

    oh = species("hydroxide")
    o = next(a for a in mol(oh).GetAtoms() if a.GetSymbol() == "O")
    mcq(node, "u0-bond-fc-oh", "One bond and three lone pairs on O. Pick its formal charge.",
        [("m", f"{MINUS}1", "Right. O brings 6 and owns 7: three lone pairs plus one from its bond."),
         ("z", "0", "Neutral O has two bonds, like water. This O has only one."),
         ("p", "+1", "A plus means the atom owns fewer electrons than it brought. This O owns more.")],
        key_where({"p": 1, "z": 0, "m": -1}, o.GetFormalCharge()), "m",
        "O in hydroxide has one bond and three lone pairs. It owns 7 electrons against the 6 it brought, so it is minus 1.",
        prov("hydroxide made by removing H+ from water; formal charge from RDKit", "2.3"), structure("hydroxide", pairs=True, charges=False),
        note=f"O formal charge {o.GetFormalCharge()}, lone pairs {lone_pairs(o)}")

    w = next(a for a in mol(species("water")).GetAtoms() if a.GetSymbol() == "O")
    mcq(node, "u0-bond-lp-water", "Pick how many lone pairs sit on the O in water.",
        [("two", "Two", "Right. Two bonds use 2 of O's 6 valence electrons; the other 4 make two pairs."),
         ("one", "One", "One pair is ammonia's N. O has one more valence electron pair to place."),
         ("three", "Three", "Three pairs is hydroxide's O, with one bond. Water's O has two bonds.")],
        key_where({"one": 1, "two": 2, "three": 3}, lone_pairs(w)), "two",
        "Neutral O makes two bonds and keeps two lone pairs. That is water.",
        prov("lone pairs counted from valence electrons, charge and bonds in RDKit", "1.12"), structure("water", pairs=True),
        note=f"lone pairs on O {lone_pairs(w)}")

    nn = next(a for a in mol(species("ammonia")).GetAtoms() if a.GetSymbol() == "N")
    mcq(node, "u0-bond-lp-nh3", "Pick how many lone pairs sit on the N in ammonia.",
        [("one", "One", "Right. Three bonds use 3 of N's 5 valence electrons; the last 2 are one pair."),
         ("zero", "None", "No pair is ammonium, NH₄⁺, where the pair became a fourth bond."),
         ("two", "Two", "Two pairs is water's O. N has one fewer valence electron than O.")],
        key_where({"zero": 0, "one": 1, "two": 2}, lone_pairs(nn)), "one",
        "Neutral N makes three bonds and keeps one lone pair. That pair is what makes ammonia a base.",
        prov("lone pairs counted in RDKit", "1.12"), structure("ammonia", pairs=True),
        note=f"lone pairs on N {lone_pairs(nn)}")

    hyb = {Chem.HybridizationType.SP3: "sp³", Chem.HybridizationType.SP2: "sp²", Chem.HybridizationType.SP: "sp"}
    pairs = []
    for pid, key, why in (("ane", "ethane", "Four single bonds: four sp3 orbitals."),
                          ("ene", "ethene", "One double bond: three sp2 orbitals plus a p for the pi bond."),
                          ("yne", "ethyne", "One triple bond: two sp orbitals plus two p for two pi bonds.")):
        c = next(a for a in mol(species(key)).GetAtoms() if a.GetSymbol() == "C")
        derived = hyb.get(c.GetHybridization())
        pairs.append((pid, f"Carbon in {name_of(key)}", f"{derived}", why, derived, key))
    match(node, "u0-bond-match-hyb", "Match each carbon to its hybridisation.",
          "Count the groups around carbon: four, three or two.",
          pairs, "Single bonds only: sp3. One double bond: sp2. A triple bond: sp.",
          prov("hybridisation from RDKit Atom.GetHybridization", "1.8 to 1.10"), "structure_and_bonding")


# ---------------------------------------------------------------------------
# Chapter 3: resonance
# ---------------------------------------------------------------------------

def ch3() -> None:
    node = "u0-resonance"
    ac = species("acetate")
    n_ac = resonance_count(ac)
    mcq(node, "u0-res-count", "Pick how many resonance contributors acetate has.",
        [("two", "Two", "Right. The minus can sit on either O, with the C=O on the other."),
         ("one", "One", "One would mean the charge is stuck on one O. A lone pair next to C=O can move."),
         ("three", "Three", "Three is carbonate, which has three O atoms around its carbon.")],
        key_where({"one": 1, "two": 2, "three": 3}, n_ac), "two",
        "Acetate has two contributors: the minus on one O or on the other. The real ion is a blend of both.",
        prov("contributors counted with Chem.ResonanceMolSupplier", "2.4"), structure("acetate", pairs=True),
        concept="resonance_and_delocalisation", note=f"ResonanceMolSupplier {n_ac}")

    minus_on: set[int] = set()
    for f in resonance_forms(ac):
        for a in f.GetAtoms():
            if a.GetFormalCharge() < 0:
                minus_on.add(a.GetIdx())
    syms = sorted(mol(ac).GetAtomWithIdx(i).GetSymbol() for i in minus_on)
    shared = "both_o" if syms == ["O", "O"] else "one_o" if syms == ["O"] else "carbon" if syms == ["C"] else None
    mcq(node, "u0-res-where", "Pick where the negative charge lives in real acetate.",
        [("both_o", "Shared by both O atoms", "Right. Each contributor puts it on a different O, so the real ion splits it."),
         ("one_o", "On one O only", "That is one contributor. Neither drawing is the real ion alone."),
         ("carbon", "On the central carbon", "The carbon has no lone pair in either contributor.")],
        shared, "both_o",
        "The charge is shared by both O atoms. That spreading is why acetate is a stable base.",
        prov("every contributor's charged atoms collected from ResonanceMolSupplier", "2.5"), structure("acetate"),
        concept="resonance_and_delocalisation", note=f"charged in some contributor: {syms}")

    counts = {k: resonance_count(species(k)) for k in ("acetate", "ethoxide", "methoxide")}
    many = [k for k, v in counts.items() if v > 1]
    mcq(node, "u0-res-which", "Pick the ion whose charge is spread by resonance.",
        [("acetate", "Acetate", "Right. Its minus O sits next to a C=O, so the pair can move."),
         ("ethoxide", "Ethoxide", "Ethoxide's O sits on an sp3 carbon. No pi bond is next door."),
         ("methoxide", "Methoxide", "Methoxide has no pi bond at all. The charge stays on its O.")],
        many[0] if len(many) == 1 else None, "acetate",
        "Resonance needs a pi bond next to the charge. Acetate has one; ethoxide and methoxide do not.",
        prov("contributors counted with ResonanceMolSupplier for each ion", "2.5"),
        None, concept="resonance_and_delocalisation", note=f"counts {counts}",
        tiles={k: named(k) for k in ("acetate", "ethoxide", "methoxide")})

    forms = resonance_forms(ac)
    skel = {frozenset((b.GetBeginAtomIdx(), b.GetEndAtomIdx()) for b in f.GetBonds()) for f in forms}
    orders = {tuple(b.GetBondTypeAsDouble() for b in f.GetBonds()) for f in forms}
    moved = "electrons" if len(skel) == 1 and len(orders) > 1 else None
    mcq(node, "u0-res-moves", "Pick what moves between two resonance contributors.",
        [("electrons", "Only electrons", "Right. The atoms and the skeleton stay put; pairs and pi bonds shift."),
         ("atoms", "Atoms", "If an atom moves, it is a different molecule, not a contributor."),
         ("both", "Atoms and electrons", "Atoms never move in resonance. Only the electrons are redrawn.")],
        moved, "electrons",
        "Contributors have the same atoms joined the same way. Only electrons move: lone pairs and pi bonds.",
        prov("the two acetate contributors compared bond by bond: same connections, different bond orders", "2.4"),
        structure("acetate"), concept="resonance_and_delocalisation", note=f"skeletons {len(skel)}, bond order sets {len(orders)}")

    words = {1: "One contributor", 2: "Two contributors", 3: "Three contributors"}
    pairs = []
    for pid, key, why in (("eto", "ethoxide", "No pi bond next to the O: one structure only."),
                          ("ac", "acetate", "Two O atoms on the carbon: the minus can sit on either."),
                          ("co3", "carbonate", "Three O atoms on the carbon: the C=O can be any of them.")):
        cnt = resonance_count(species(key))
        pairs.append((pid, name_of(key).capitalize(), words[2 if pid == "ac" else 1 if pid == "eto" else 3], why, words.get(cnt), key))
    match(node, "u0-res-match", "Match each ion to its number of contributors.",
          "Look for a pi bond next to the charge.", pairs,
          "Count the places the charge can go. Each place is one contributor.",
          prov("contributors counted with ResonanceMolSupplier", "2.5"), "resonance_and_delocalisation")


# ---------------------------------------------------------------------------
# Chapter 4: acids and bases
# ---------------------------------------------------------------------------

def ch4() -> None:
    node = "u0-acids"
    base = species("acetate")
    opts = {"acetate": species("acetate"), "carbanion": species("acetic_carbanion"), "protonated": species("acetic_protonated")}
    derived = key_where(opts, conj_base(species("acetic_acid"), "[OX2H1]"))
    mcq(node, "u0-acid-cb-acetic", "Pick the conjugate base of acetic acid, CH₃COOH.",
        [("acetate", "CH₃COO⁻, the O-H lost its H⁺", "Right. Take H⁺ off the O-H and the O keeps the pair."),
         ("carbanion", "⁻CH₂COOH, a C-H lost its H⁺", "The O-H proton is the acidic one: its base is spread over two O."),
         ("protonated", "CH₃C(OH)₂⁺, an H⁺ added", "Adding H⁺ makes the conjugate ACID. A base has one H⁺ fewer.")],
        derived, "acetate",
        "A conjugate base is the acid minus one H⁺. For acetic acid the H⁺ leaves the O-H, giving acetate.",
        prov("conjugate base made by removing H+ from the O-H in RDKit", "2.7"), structure("acetic_acid"),
        concept="pka_and_acidity", note=f"conjugate base {base}",
        tiles={"acetate": named("acetate"), "carbanion": named("acetic_carbanion", "C-H lost H⁺"),
               "protonated": named("acetic_protonated", "H⁺ added")})

    opts = {"oh": species("hydroxide"), "h3o": species("hydronium"), "o2": species("oxide")}
    mcq(node, "u0-acid-cb-water", "Pick the conjugate base of water.",
        [("oh", "HO⁻, hydroxide", "Right. Water minus one H⁺ is hydroxide."),
         ("h3o", "H₃O⁺, hydronium", "Hydronium is water plus H⁺: water's conjugate acid."),
         ("o2", "O²⁻, oxide", "That is two protons gone. A conjugate base differs by exactly one.")],
        key_where(opts, conj_base(species("water"), "[OX2H2]")), "oh",
        "Water loses one H⁺ to become hydroxide, its conjugate base. It gains one to become hydronium, its conjugate acid.",
        prov("conjugate base and acid made in RDKit", "2.7"), structure("water", pairs=True), concept="pka_and_acidity",
        tiles={"oh": named("hydroxide"), "h3o": named("hydronium"), "o2": named("oxide", "oxide")})

    pk = {k: PKA[k][0] for k in ("acetic_acid", "ethanol")}
    stronger = min(pk, key=pk.get)
    mcq(node, "u0-acid-stronger", "Pick the stronger acid: acetic acid or ethanol.",
        [("acetic_acid", "Acetic acid", f"Right. Its pKa is about {PKA['acetic_acid'][0]:g}, far lower than ethanol's {PKA['ethanol'][0]:g}."),
         ("ethanol", "Ethanol", f"Ethanol's pKa is about {PKA['ethanol'][0]:g}. Higher pKa means a weaker acid."),
         ("same", "About the same", "Both have an O-H, but acetate spreads its charge over two O atoms and ethoxide cannot.")],
        stronger, "acetic_acid",
        "Lower pKa, stronger acid. Acetic acid wins because acetate shares its charge over two O atoms.",
        prov("compared on the pKa table", "2.8", "PKA"), pair(named("acetic_acid"), named("ethanol")),
        concept="pka_and_acidity", note=f"pKa {pk}")

    cards = [("hcl", "Hydrogen chloride", "hcl", f"pKa about {PKA['hcl'][0]:g}: gives up H⁺ almost completely."),
             ("ac", "Acetic acid", "acetic_acid", f"pKa about {PKA['acetic_acid'][0]:g}: acetate shares its charge over two O."),
             ("ph", "Phenol", "phenol", f"pKa about {PKA['phenol'][0]:g}: the ring spreads phenoxide's charge."),
             ("et", "Ethanol", "ethanol", f"pKa about {PKA['ethanol'][0]:g}: ethoxide keeps its charge on one O.")]
    ladder(node, "u0-acid-sort", cards, lambda k: -PKA[k][0],
           "Drag these acids into order, strongest first.", "Lowest pKa at the top.",
           "acidity", "pka_and_acidity", ("Strongest acid", "Weakest acid"),
           "Rank hydrogen chloride, acetic acid, phenol and ethanol by acidity, strongest first.",
           ("Hydrogen chloride, then acetic acid, then phenol, then ethanol.",
            "Each step up the ladder is a lower pKa: a more stable conjugate base.",
            "Read the pKa on each card, lowest first."),
           ("The top two are swapped.", "Acetic acid is strong for an organic acid, but HCl's pKa is far lower.",
            "Compare the two lowest pKa values."),
           "Lower pKa, stronger acid. A more stable conjugate base makes a stronger acid.",
           prov("order read off the pKa table", "2.8", "PKA"), "pka_and_acidity")

    left, right = PKA["acetic_acid"][0], PKA["water"][0]
    side = "right" if left < right else "left"
    mcq(node, "u0-acid-equilibrium", "Acetic acid meets hydroxide. Pick the side the equilibrium favours.",
        [("right", "Acetate and water", f"Right. Water (pKa about {right:g}) is a weaker acid than acetic acid (about {left:g})."),
         ("left", "Acetic acid and hydroxide", "Equilibrium runs toward the WEAKER acid, and that is water here."),
         ("neither", "Neither side", "The pKa values differ by about eleven units, so one side wins by a mile.")],
        side, "right",
        "Acid and base react toward the weaker acid and weaker base. Water is a much weaker acid than acetic acid.",
        prov("the two acids' pKa compared on the table", "2.8", "PKA"), pair(named("acetic_acid"), named("hydroxide")),
        concept="pka_and_acidity", note=f"pKa acetic {left}, water {right}")


# ---------------------------------------------------------------------------
# Chapter 5: nucleophiles and electrophiles
# ---------------------------------------------------------------------------

def ch5() -> None:
    node = "u0-nuc-elec"
    br = species("bromomethane")
    dp_i = delta_plus(br)
    dp = None if dp_i is None else mol(br).GetAtomWithIdx(dp_i).GetSymbol()
    mcq(node, "u0-ne-ch3br", "Pick the electrophilic atom in bromomethane, CH₃Br.",
        [("c", "The carbon", "Right. Br pulls electron density away, leaving the carbon delta plus."),
         ("br", "The bromine", "Br is the electron rich end of the C-Br bond. It is what leaves."),
         ("h", "A hydrogen", "The C-H bonds are barely polar. The C-Br bond is the polar one.")],
        {"C": "c", "Br": "br"}.get(dp), "c",
        "An electrophile is electron poor. In CH₃Br the carbon is delta plus, because Br pulls on the C-Br bond.",
        prov("delta plus carbon by the bond polarity rule on the cited EN table (Gasteiger reported only)", "2.1", "EN"), structure("bromomethane", marks=[delta_plus(br)]),
        concept="nucleophiles_and_leaving_groups", note=f"Gasteiger {gasteiger(br)}")

    ace = species("acetone")
    i = delta_plus(ace)
    if i is None:
        fail("acetone: no delta plus carbon by the EN rule")
        return
    a = mol(ace).GetAtomWithIdx(i)
    is_carbonyl_c = a.GetSymbol() == "C" and any(n.GetSymbol() == "O" for n in a.GetNeighbors())
    mcq(node, "u0-ne-acetone", "Pick the electrophilic atom in acetone.",
        [("cc", "The C=O carbon", "Right. O pulls on the C=O, so the carbonyl carbon is delta plus."),
         ("o", "The oxygen", "O is delta minus. It has the lone pairs, so it is the nucleophilic end."),
         ("me", "A methyl carbon", "The CH₃ carbons are not attached to O, so they barely feel the pull.")],
        "cc" if is_carbonyl_c else None, "cc",
        "The carbonyl carbon is the electrophile in every aldehyde and ketone. Nucleophiles attack it.",
        prov("delta plus carbon by the bond polarity rule on the cited EN table (Gasteiger reported only)", "2.1", "EN"), structure("acetone", marks=[i]),
        concept="nucleophiles_and_leaving_groups", note=f"Gasteiger {gasteiger(ace)}")

    oh = species("hydroxide")
    j = nucleophile_atom(oh)
    mcq(node, "u0-ne-hydroxide", "Pick the nucleophilic atom in hydroxide, HO⁻.",
        [("o", "The oxygen", "Right. O carries the minus and three lone pairs to give."),
         ("h", "The hydrogen", "H has no lone pair. It has nothing to give."),
         ("bond", "The O-H bond", "Bond electrons hold O and H together. The lone pairs are the ones to give.")],
        "o" if j is not None and mol(oh).GetAtomWithIdx(j).GetSymbol() == "O" else None, "o",
        "A nucleophile gives a pair of electrons. In hydroxide that pair sits on the negative O.",
        prov("nucleophile site: an atom with a lone pair, most negative Gasteiger charge", "6.5"),
        structure("hydroxide", pairs=True), concept="nucleophiles_and_leaving_groups")

    opts = {"oh": "hydroxide", "me": "methyl_cation", "bh3": "borane"}
    nucs = [k for k, s in opts.items() if nucleophile_atom(species(s)) is not None]
    mcq(node, "u0-ne-which-nuc", "Pick the nucleophile.",
        [("oh", "Hydroxide, HO⁻", "Right. Its O has lone pairs to give."),
         ("me", "Methyl cation, CH₃⁺", "CH₃⁺ has an empty orbital and no pair: it wants electrons, so it is an electrophile."),
         ("bh3", "Borane, BH₃", "B has an empty orbital and no lone pair. Borane takes electrons.")],
        nucs[0] if len(nucs) == 1 else None, "oh",
        "Nucleophiles have a pair to give: a lone pair, often with a minus. Electrophiles have room to take one.",
        prov("lone pairs counted on every atom of each species in RDKit", "6.5"),
        None, concept="nucleophiles_and_leaving_groups",
        note=f"species with a lone pair: {nucs}",
        tiles={"oh": named("hydroxide", pairs=True), "me": named("methyl_cation"), "bh3": named("borane")})

    roles = {}
    for key in ("cyanide", "methyl_cation", "ammonia"):
        roles[key] = "Nucleophile" if nucleophile_atom(species(key)) is not None else "Electrophile"
    pk = "Electrophile, empty orbital"
    match(node, "u0-ne-match", "Match each species to its role.",
          "Look for a lone pair to give, or an empty orbital to fill.",
          [("cn", "Cyanide, CN⁻", "Nucleophile, with a minus", "C carries the minus and a lone pair.",
            "Nucleophile, with a minus" if roles["cyanide"] == "Nucleophile" and Chem.GetFormalCharge(mol(species("cyanide"))) < 0 else None, "cyanide"),
           ("me", "Methyl cation, CH₃⁺", pk, "Three bonds and a plus: an empty p orbital.",
            pk if roles["methyl_cation"] == "Electrophile" else None, "methyl_cation"),
           ("nh3", "Ammonia, NH₃", "Nucleophile, neutral", "N has one lone pair and no charge.",
            "Nucleophile, neutral" if roles["ammonia"] == "Nucleophile" and Chem.GetFormalCharge(mol(species("ammonia"))) == 0 else None, "ammonia")],
          "A lone pair makes a nucleophile, charged or not. An empty orbital makes an electrophile.",
          prov("lone pairs and charges from RDKit", "6.5"), "nucleophiles_and_leaving_groups")


# ---------------------------------------------------------------------------
# Chapter 6: curved arrows (the SN2 step the demo already animates)
# ---------------------------------------------------------------------------

def bond_changes(smarts: str) -> tuple[set[tuple[int, int]], set[tuple[int, int]]]:
    """(map number pairs bonded only in the products, pairs bonded only in the reactants), read off the template."""
    rx = AllChem.ReactionFromSmarts(smarts)

    def mapped(tmpls) -> set[tuple[int, int]]:
        out = set()
        for t in tmpls:
            for b in t.GetBonds():
                a, c = b.GetBeginAtom().GetAtomMapNum(), b.GetEndAtom().GetAtomMapNum()
                if a and c:
                    out.add(tuple(sorted((a, c))))
        return out

    before, after = mapped(rx.GetReactants()), mapped(rx.GetProducts())
    return after - before, before - after


def ch6() -> None:
    node = "u0-arrows"
    sm = SN2_SMARTS["O-"]
    formed, broken = bond_changes(sm)
    # Map 1 is the carbon, 2 the halogen, 3 the nucleophile's O (see SN2_SMARTS).
    tail_ok = formed == {(1, 3)} and broken == {(1, 2)}
    prods = only(react(sm, species("bromomethane"), species("hydroxide")), "SN2 hydroxide + bromomethane")
    mcq(node, "u0-arr-tail", "HO⁻ attacks CH₃Br. Pick where the first arrow starts.",
        [("lp", "A lone pair on the O", "Right. Arrows start at electrons, and the O's lone pair makes the new bond."),
         ("cbr", "The C-Br bond", "That is where the SECOND arrow starts. The first one brings electrons in."),
         ("c", "The carbon", "The carbon is where the first arrow ENDS. Arrows start at electrons.")],
        "lp" if tail_ok else None, "lp",
        "An arrow always starts at electrons: a lone pair or a bond. Here the O lone pair starts the new C-O bond.",
        prov("bonds made and broken read off the SN2 reaction SMARTS", "6.6"),
        pair(named("hydroxide", pairs=True), named("bromomethane")), concept="substitution_and_elimination",
        note=f"formed {formed}, broken {broken}")

    br = species("bromomethane")
    head = mol(br).GetAtomWithIdx(delta_plus(br)).GetSymbol() if delta_plus(br) is not None else None
    mcq(node, "u0-arr-head", "Pick where that first arrow ends.",
        [("c", "The carbon bonded to Br", "Right. The arrow ends on the delta plus carbon, where the new bond forms."),
         ("br", "The bromine", "Br is the electron rich end. The nucleophile goes for the poor end."),
         ("h", "A hydrogen on carbon", "Taking an H would be a base at work. This arrow makes a C-O bond.")],
        "c" if head == "C" and tail_ok else None, "c",
        "Nucleophile to electrophile: the arrow runs from the O lone pair to the delta plus carbon.",
        prov("arrow head is the delta plus carbon (EN rule), which the SMARTS bonds to O", "6.6", "EN"),
        structure("bromomethane", marks=[delta_plus(br)]), concept="substitution_and_elimination")

    gains = "br" if "[Br-]" in prods else None
    mcq(node, "u0-arr-second", "Pick where the C-Br bond's electrons go.",
        [("br", "Onto Br, which leaves as Br⁻", "Right. Both electrons go with Br, so it leaves with a minus."),
         ("c", "Onto the carbon", "The carbon is gaining a bond to O. Keeping the pair would give it five."),
         ("o", "Onto the O", "The O already gave its pair to make the new bond.")],
        gains, "br",
        "The second arrow starts on the C-Br bond and ends on Br. Bromide leaves holding both electrons.",
        prov("leaving group charge read off the SN2 SMARTS products", "6.6"), structure("bromomethane"),
        concept="substitution_and_elimination", note=f"products {prods}")

    orders = [b.GetBondTypeAsDouble() for b in mol(species("methanol")).GetBonds()]
    two = "pair" if 1.0 in orders else None
    mcq(node, "u0-arr-means", "Pick what one full curved arrow moves.",
        [("pair", "A pair of electrons", "Right. A full arrowhead is two electrons: one new single bond's worth."),
         ("atom", "An atom", "Arrows never move atoms. Atoms follow the electrons."),
         ("proton", "A proton", "A proton moves as a result, but the arrow itself tracks electrons.")],
        two, "pair",
        "A curved arrow with a full head moves two electrons, from where they are to where they go.",
        prov("the new C-O bond in the product is single (RDKit bond order 1): two electrons", "6.6"),
        structure("methanol"), concept="substitution_and_elimination")

    opts = {"meoh": sorted([species("methanol"), species("bromide")]),
            "none": sorted([species("bromomethane"), species("hydroxide")]),
            "ether": sorted([species("dimethyl_ether")])}
    mcq(node, "u0-arr-product", "Pick what the two arrows make.",
        [("meoh", "Methanol and bromide", "Right. O bonds to carbon, Br leaves: CH₃OH and Br⁻."),
         ("none", "Nothing changes", "Two arrows moved two pairs. A bond formed and a bond broke."),
         ("ether", "Dimethyl ether", "That needs two carbons. Only one CH₃ group is here.")],
        key_where(opts, prods), "meoh",
        "Follow the arrows: a new C-O bond, a broken C-Br bond. HO⁻ plus CH₃Br gives CH₃OH plus Br⁻.",
        prov("products from the SN2 reaction SMARTS", "11.2"), pair(named("hydroxide"), named("bromomethane")),
        concept="substitution_and_elimination")


# ---------------------------------------------------------------------------
# Chapter 7: SN1, SN2, E1, E2 at a glance
# ---------------------------------------------------------------------------

def ch7() -> None:
    node = "u0-subst-elim"
    s = species("bromopropane2")
    d = carbon_degree(s, lg_carbon(s))
    mcq(node, "u0-se-degree", "Pick the class of the carbon bearing Br in 2-bromopropane.",
        [("2", "2° (secondary)", "Right. The C-Br carbon has two carbons on it."),
         ("1", "1° (primary)", "1° would be one carbon on the C-Br carbon, as in 1-bromopropane."),
         ("3", "3° (tertiary)", "3° needs three carbons on it, as in tert-butyl bromide.")],
        {1: "1", 2: "2", 3: "3"}.get(d), "2",
        "Count the carbons bonded to the carbon that holds the leaving group. Two means 2°.",
        prov("carbon neighbours of the C-Br carbon counted in RDKit", "11.1"),
        structure("bromopropane2", marks=[lg_carbon(s)]), concept="substitution_and_elimination", note=f"degree {d}")

    mech = mechanism(species("bromomethane"), "strong_base")
    mcq(node, "u0-se-methyl", "CH₃Br meets HO⁻. Pick the mechanism.",
        [("SN2", "SN2", "Right. A methyl carbon is open to backside attack, and it has no beta H to eliminate."),
         ("SN1", "SN1", "SN1 needs a stable cation. The methyl cation is the least stable of all."),
         ("E2", "E2", "E2 removes an H from the next carbon over. Methyl has no next carbon.")],
        mech, "SN2",
        "Methyl and 1° carbons with a strong nucleophile react by SN2: one step, backside attack.",
        prov("degree from RDKit, decision from the SN/E table", "11.12", "SN_TABLE"), structure("bromomethane"),
        brief="Methyl carbon, strong nucleophile.", concept="substitution_and_elimination", note=f"table says {mech}")

    mech = mechanism(species("tbubr"), "weak")
    prod = only(react(SN1_WATER, species("tbubr"), species("water")), "SN1 water")
    alcohol = [p for p in prod if p != species("bromide")]
    mcq(node, "u0-se-sn1", "tert-Butyl bromide sits in warm water. Pick the mechanism.",
        [("SN1", "SN1, giving tert-butanol", "Right. A 3° cation forms, then water adds to it."),
         ("SN2", "SN2, giving tert-butanol", "Three carbons crowd the backside. A 3° carbon does not do SN2."),
         ("E2", "E2, giving an alkene", "E2 needs a strong base. Water is a weak one.")],
        "SN1" if mech.startswith("SN1") and alcohol == [species("tbuoh")] else None, "SN1",
        "3° carbon, weak nucleophile, protic solvent: the leaving group goes first (SN1). E1 competes, more so when hot.",
        prov("decision from the SN/E table; product from an SN1 SMARTS with water, checked against OPSIN tert-butanol", "11.4", "SN_TABLE"),
        structure("tbubr"), brief="3° carbon, weak nucleophile.", concept="substitution_and_elimination",
        note=f"table says {mech}; product {alcohol}")

    mech = mechanism(species("tbubr"), "bulky_base")
    alkenes = sorted({next(p for p in ps if p != species("bromide")) for ps in react(E2_SMARTS, species("tbubr"))})
    isobutylene = species("isobutylene")
    # The SN2 distractor's product, made by the SN2 SMARTS (round 2: it used to say tert-butanol, which no step makes).
    sn2_ether = [p for p in only(react(SN2_SMARTS["O-"], species("tbubr"), species("tbuo")), "SN2 t-BuO- on t-BuBr")
                 if p != species("bromide")]
    mcq(node, "u0-se-e2", "tert-Butyl bromide meets t-BuO⁻. Pick the product.",
        [("alkene", "2-Methylpropene, by E2", "Right. A bulky strong base takes a beta H; Br leaves; a C=C forms."),
         ("ether", "Di-tert-butyl ether, by SN2", "SN2 would bond t-BuO to that carbon, but its three carbons block the backside."),
         ("none", "No reaction", "A strong base and a 3° bromide react fast, by E2.")],
        "alkene" if mech == "E2" and alkenes == [isobutylene] and sn2_ether == [species("dtbe")] else None, "alkene",
        "Strong base, 3° carbon: E2. The base pulls a beta H as Br leaves, and a C=C forms in one step.",
        prov("decision from the SN/E table; alkene from the E2 SMARTS, checked against OPSIN 2-methylprop-1-ene", "11.8", "SN_TABLE"),
        structure("tbubr"), concept="substitution_and_elimination", note=f"table says {mech}; E2 products {alkenes}; SN2 distractor {sn2_ether}")

    mech = mechanism(species("bromobutane2"), "strong_base")
    found = sorted({next(p for p in ps if p != species("bromide")) for ps in react(E2_SMARTS, species("bromobutane2"))})
    zaitsev = max(found, key=alkene_subst)
    sn2_eto = [p for p in only(react(SN2_SMARTS["O-"], species("bromobutane2"), species("ethoxide")), "SN2 EtO- on 2-bromobutane")
               if p != species("bromide")]
    both = found == sorted([species("but1ene"), species("but2ene")]) and sn2_eto == [species("ethoxybutane")]
    mcq(node, "u0-se-zaitsev", "2-Bromobutane meets EtO⁻. Pick the major product.",
        [("b2", "But-2-ene", "Right. E2 with a small base gives the more substituted alkene (Zaitsev)."),
         ("b1", "But-1-ene", "That is the less substituted alkene, the minor one with a small base."),
         ("ether", "2-Ethoxybutane, by SN2", "With a 2° carbon and a strong base, E2 wins over SN2.")],
        "b2" if mech == "E2" and both and zaitsev == species("but2ene") else None, "b2",
        "2° carbon, strong base: E2. Of the two alkenes E2 can make, the more substituted one is major.",
        prov("decision from the SN/E table; both alkenes from the E2 SMARTS, major = most substituted C=C", "11.7", "SN_TABLE"),
        structure("bromobutane2"), concept="substitution_and_elimination", note=f"table says {mech}; E2 gave {found}; SN2 gives {sn2_eto}",
        tiles={"b2": named("but2ene"), "b1": named("but1ene"), "ether": named("ethoxybutane")})

    mech = mechanism(species("bromobutane1"), "good_nuc")
    prod = only(react(SN2_SMARTS["C-"], species("bromobutane1"), species("cyanide")), "SN2 cyanide")
    nitrile = [p for p in prod if p != species("bromide")]
    mcq(node, "u0-se-sn2", "1-Bromobutane meets CN⁻ in DMSO. Pick the mechanism.",
        [("SN2", "SN2, giving pentanenitrile", "Right. 1° carbon, good nucleophile, aprotic solvent: backside attack."),
         ("SN1", "SN1, through a 1° cation", "A 1° cation is too unstable to form."),
         ("E2", "E2, giving but-1-ene", "CN⁻ is a good nucleophile but a weak base, so it substitutes.")],
        "SN2" if mech == "SN2" and nitrile == [OPSIN.get("pentanenitrile")] else None, "SN2",
        "1° carbon, good nucleophile that is a weak base: SN2. The carbon chain grows by one, to pentanenitrile.",
        prov("decision from the SN/E table; product from the SN2 SMARTS, checked against OPSIN pentanenitrile", "11.3", "SN_TABLE"),
        structure("bromobutane1"), concept="substitution_and_elimination", note=f"table says {mech}; product {nitrile}")


# ---------------------------------------------------------------------------
# Chapter 8: stereochemistry basics
# ---------------------------------------------------------------------------

def ch8() -> None:
    node = "u0-stereo"
    n = len(stereocentres(species("bromobutane2")))
    mcq(node, "u0-st-count", "Pick how many stereocentres 2-bromobutane has.",
        [("1", "One", "Right. C2 holds four different groups: H, Br, CH₃ and CH₂CH₃."),
         ("0", "None", "C2 has four different groups on it. That makes a stereocentre."),
         ("2", "Two", "Only C2 has four different groups. C3 has two H atoms.")],
        {0: "0", 1: "1", 2: "2"}.get(n), "1",
        "A stereocentre is a carbon with four different groups. In 2-bromobutane only C2 qualifies.",
        prov("Chem.FindMolChiralCenters with includeUnassigned", "5.2"),
        structure("bromobutane2", marks=stereocentres(species("bromobutane2"))), concept="structure_and_bonding",
        note=f"stereocentres {n}")

    m = mol(species("r_butan2ol"))
    rdCIPLabeler.AssignCIPLabels(m)
    centre = stereocentres(species("r_butan2ol"))[0]
    from rdkit.Chem import rdCIPLabeler as _  # noqa: F401  (labels already set)
    ranks = list(Chem.CanonicalRankAtoms(m, breakTies=False))
    Chem.AssignStereochemistry(m, cleanIt=True, force=True)
    nbrs = [(int(x.GetProp("_CIPRank")) if x.HasProp("_CIPRank") else ranks[x.GetIdx()], x.GetSymbol(), x.GetDegree(), x.GetIdx())
            for x in m.GetAtomWithIdx(centre).GetNeighbors()]
    top = max(nbrs)
    top_word = "oh" if top[1] == "O" else None
    mcq(node, "u0-st-priority", "Pick the top CIP priority group on C2 of 2-butanol.",
        [("oh", "OH", "Right. O has the highest atomic number of the atoms on C2."),
         ("et", "CH₂CH₃", "Ethyl beats methyl, but its first atom is C. O outranks C."),
         ("me", "CH₃", "Methyl's first atom is C with only H on it: low priority.")],
        top_word, "oh",
        "CIP rule one: rank by the atomic number of the atom attached. O beats C beats H.",
        prov("CIP ranks from RDKit on the neighbours of the stereocentre", "5.5"), structure("r_butan2ol"),
        concept="structure_and_bonding", note=f"neighbour ranks {nbrs}")

    r_lab = cip_atoms(species("r_butan2ol")).get(centre)
    s_lab = cip_atoms(species("s_butan2ol")).get(stereocentres(species("s_butan2ol"))[0])
    mcq(node, "u0-st-mirror", "(R)-2-Butanol is reflected in a mirror. Pick the image's label.",
        [("S", "S", "Right. A mirror reverses the turn from priority 1 to 3, so R becomes S."),
         ("R", "R", "A reflection swaps the direction of travel. Only a rotation keeps R as R."),
         ("none", "No label, it is achiral", "C2 is still a stereocentre in the mirror image.")],
        s_lab if r_lab == "R" else None, "S",
        "The mirror image of an R centre is S. They are enantiomers.",
        prov("both labels from rdCIPLabeler; the mirror made by swapping every @ and @@", "5.5"),
        pair(named("r_butan2ol"), named("s_butan2ol")), concept="structure_and_bonding", note=f"R form {r_lab}, mirror {s_lab}")

    ez = list(cip_bonds(species("e_butene")).values())
    mcq(node, "u0-st-ez", "In 2-butene the two CH₃ groups sit on opposite sides. Pick the label.",
        [("E", "E", "Right. The two top priority groups are on opposite sides: E, from entgegen."),
         ("Z", "Z", "Z means the top priority groups are on the SAME side."),
         ("none", "Neither, no stereo", "Each alkene carbon holds two different groups, so E/Z applies.")],
        ez[0] if len(ez) == 1 else None, "E",
        "On each alkene carbon CH₃ outranks H. Opposite sides is E; same side is Z.",
        prov("E/Z from rdCIPLabeler on OPSIN (E)-but-2-ene", "7.5"), structure("e_butene"),
        concept="structure_and_bonding", note=f"bond label {ez}")

    words = {0: "No stereocentre", 1: "One stereocentre", 2: "Two stereocentres"}
    pairs = []
    for pid, key, why in (("eth", "ethanol", "No carbon has four different groups."),
                          ("but", "butan2ol", "C2 holds H, OH, CH₃ and CH₂CH₃."),
                          ("diol", "butanediol", "C2 and C3 each hold H, OH, CH₃ and the other half.")):
        cnt = len(stereocentres(species(key)))
        authored = {"eth": words[0], "but": words[1], "diol": words[2]}[pid]
        pairs.append((pid, name_of(key).capitalize(), authored, why, words.get(cnt), key))
    match(node, "u0-st-match", "Match each molecule to its stereocentre count.",
          "Look for carbons with four different groups.", pairs,
          "Count carbons with four different groups. Each one is a stereocentre.",
          prov("stereocentres from FindMolChiralCenters", "5.2"), "structure_and_bonding")


# ---------------------------------------------------------------------------
# Chapter 9: a peek at Orgo II, one understandable question per unit
# ---------------------------------------------------------------------------

def unit_titles() -> dict[str, str]:
    text = PATHWAY.read_text(encoding="utf-8")
    found = dict(re.findall(r'id: "(u\d+)",\s*\n\s*title: "([^"]+)"', text))
    if sorted(found, key=lambda k: int(k[1:])) != [f"u{i}" for i in range(1, 16)]:
        fail(f"pathwayMap.ts unit titles not found as expected: {sorted(found)}")
    return found


def preview(unit: str, titles: dict[str, str], *args, **kw) -> None:
    """One ch9 MCQ, tied to its unit. The brief names the unit from PATHWAY_UNITS."""
    id = args[0]
    name = titles[unit].split(" · ", 1)[1]
    mcq("u0-preview", *args, brief=f"{titles[unit].split(' · ')[0]}: {name}"[:CAPS['brief']], **kw)
    PREVIEW_UNITS[id] = unit


def ch9() -> None:
    t = unit_titles()
    if FAILURES:
        return

    da = only(react(DA_SMARTS, species("butadiene"), species("ethene")), "Diels-Alder")
    da_mol = mol(da[0])  # keep the Mol alive: RingInfo of a temporary Mol reads as empty
    ring = da_mol.GetRingInfo().AtomRings()
    preview("u1", t, "u0-pv-u1", "Butadiene and ethene join in a Diels-Alder. Pick the ring that forms.",
            [("six", "A six-membered ring", "Right. Four diene carbons plus two from ethene close one ring of six."),
             ("four", "A four-membered ring", "That would join only two C=C bonds. The diene brings four carbons."),
             ("five", "A five-membered ring", "Count again: four from the diene, two from ethene.")],
            {4: "four", 5: "five", 6: "six"}.get(len(ring[0])) if len(ring) == 1 and da[0] == OPSIN["cyclohexene"] else None, "six",
            "The Diels-Alder joins a diene and a C=C into a cyclohexene in one step. Unit 1 builds up to it.",
            prov("product from the Diels-Alder SMARTS, checked against OPSIN cyclohexene", "14.4"),
            pair(named("butadiene"), named("ethene")), concept="diels_alder", note=f"product {da}")

    aro = {k: all(a.GetIsAromatic() for a in mol(species(k)).GetAtoms() if a.IsInRing()) for k in ("benzene", "cyclohexene", "cyclohexane")}
    hits = [k for k, v in aro.items() if v]
    preview("u2", t, "u0-pv-u2", "Pick the aromatic ring.",
            [("benzene", "Benzene", "Right. Six p orbitals in a flat ring, six pi electrons."),
             ("cyclohexene", "Cyclohexene", "Its four sp3 carbons break the ring of p orbitals."),
             ("cyclohexane", "Cyclohexane", "No pi bonds at all.")],
            hits[0] if len(hits) == 1 else None, "benzene",
            "Benzene is aromatic: a flat, unbroken ring of p orbitals with six pi electrons. It is extra stable.",
            prov("RDKit aromatic flag on every ring atom", "15.3"), None, concept="aromaticity",
            note=f"aromatic {aro}", tiles={k: named(k) for k in ("benzene", "cyclohexene", "cyclohexane")})

    eas = only(react(EAS_BR, species("benzene"), canon("BrBr")), "EAS bromination")
    pb = [p for p in eas if p != canon("Br")][0]
    stays = all(a.GetIsAromatic() for a in mol(pb).GetAtoms() if a.IsInRing())
    preview("u3", t, "u0-pv-u3", "Benzene meets Br₂ and FeBr₃. Pick what happens to the ring.",
            [("h", "Br replaces an H; the ring stays aromatic", "Right. Substitution, not addition, keeps the aromatic ring."),
             ("add", "Br₂ adds across a C=C", "That is what an alkene does. Benzene would lose its aromaticity."),
             ("open", "The ring breaks open", "The ring survives: only one C-H becomes C-Br.")],
            "h" if stays and pb == OPSIN["bromobenzene"] else None, "h",
            "Aromatic rings substitute instead of adding: an electrophile replaces an H and the ring stays aromatic.",
            prov("product from an aromatic bromination SMARTS, checked against OPSIN bromobenzene; aromatic flag kept", "16.1"),
            structure("benzene"), concept="aromatic_substitution", note=f"product {pb}")

    snar = only(react(SNAR_OH, species("chloronitrobenzene"), species("hydroxide")), "SNAr")
    leaves = "cl" if canon("[Cl-]") in snar and OPSIN["4-nitrophenol"] in snar else None
    preview("u4", t, "u0-pv-u4", "HO⁻ attacks 4-chloronitrobenzene. Pick what leaves the ring.",
            [("cl", "Chloride, Cl⁻", "Right. The nitro group pulls density so HO⁻ can add; then Cl⁻ leaves."),
             ("no2", "The nitro group", "The nitro group stays. It is the helper that makes the attack possible."),
             ("h", "A hydride, H⁻", "Hydride is a terrible leaving group. The halide leaves.")],
            leaves, "cl",
            "On a ring with a strong electron pulling group, a nucleophile can replace a halide. Unit 4 is this.",
            prov("products from an SNAr SMARTS, checked against OPSIN 4-nitrophenol", "16.6"),
            structure("chloronitrobenzene"), concept="nucleophilic_aromatic_substitution", note=f"products {snar}")

    s = species("propan2ol")
    c = site(s, "[CX4][OX2H]")
    deg = carbon_degree(s, c)
    preview("u5", t, "u0-pv-u5", "Pick the class of 2-propanol as an alcohol.",
            [("2", "Secondary (2°)", "Right. The C-OH carbon has two carbons on it."),
             ("1", "Primary (1°)", "Primary would have one carbon on the C-OH carbon, like 1-propanol."),
             ("3", "Tertiary (3°)", "Tertiary needs three, like tert-butanol.")],
            {1: "1", 2: "2", 3: "3"}.get(deg), "2",
            "Alcohols are classed by the carbons on the C-OH carbon. The class decides how they react in Unit 5.",
            prov("carbon neighbours of the C-OH carbon counted in RDKit", "17.1"), structure("propan2ol", marks=[c]),
            concept="alcohol_leaving_groups", note=f"degree {deg}")

    bz = mol(species("benzene"))
    ring_n = bz.GetRingInfo().NumRings()
    kek = Chem.Mol(bz)
    Chem.Kekulize(kek, clearAromaticFlags=True)
    pis = sum(1 for b in kek.GetBonds() if b.GetBondType() == Chem.BondType.DOUBLE)
    preview("u6", t, "u0-pv-u6", "Pick the rings plus pi bonds in benzene, C₆H₆.",
            [("4", "Four", "Right. One ring and three C=C: four degrees of unsaturation."),
             ("3", "Three", "Three counts the C=C bonds but forgets the ring itself."),
             ("6", "Six", "Six is the number of carbons, not of rings and pi bonds.")],
            {3: "3", 4: "4", 6: "6"}.get(ring_n + pis), "4",
            "A formula tells you how many rings plus pi bonds a molecule has. Unit 6 uses it to solve structures.",
            prov("rings and Kekule double bonds counted in RDKit", "13.13"), structure("benzene"),
            concept="degrees_of_unsaturation", note=f"rings {ring_n}, pi {pis}")

    im = only(react(IMINE_SMARTS, species("acetone"), species("methylamine")), "imine")
    imine = [p for p in im if p != canon("O")][0]
    has_cn = mol(imine).HasSubstructMatch(Chem.MolFromSmarts("C=N"))
    preview("u7", t, "u0-pv-u7", "Acetone meets methylamine with mild acid. Pick the new bond.",
            [("cn", "A C=N double bond", "Right. The amine N replaces the C=O oxygen, which leaves as water."),
             ("coc", "A C-O-C link", "That would be an ether. Here N, not O, bonds to the carbon."),
             ("cc", "A C=C double bond", "No new carbon joins. The C=O becomes C=N.")],
            "cn" if has_cn and imine == OPSIN["N-methylpropan-2-imine"] else None, "cn",
            "Amines add to the carbonyl carbon and water leaves, giving an imine. Unit 7 is addition to C=O.",
            prov("product from an imine SMARTS, checked against OPSIN N-methylpropan-2-imine", "19.8"),
            pair(named("acetone"), named("methylamine")), concept="nucleophilic_addition_nitrogen", note=f"products {im}")

    es = only(react(ESTER_SMARTS, species("acetic_acid"), species("ethanol")), "Fischer ester")
    left = [p for p in es if p != OPSIN["ethyl acetate"]]
    preview("u8", t, "u0-pv-u8", "Acetic acid and ethanol make an ester. Pick what else forms.",
            [("water", "Water", "Right. The acid's OH and the alcohol's H leave together as H₂O."),
             ("h2", "Hydrogen gas", "No H-H bond forms. The O-H pieces combine into water."),
             ("co2", "Carbon dioxide", "No carbon is lost: both carbons of acetic acid stay in the ester.")],
            "water" if left == [species("water")] else None, "water",
            "Acid plus alcohol gives ester plus water. Unit 8 swaps groups on acid derivatives like this.",
            prov("products from a Fischer ester SMARTS, checked against OPSIN ethyl acetate", "21.3"),
            pair(named("acetic_acid"), named("ethanol")), concept="nucleophilic_acyl_substitution", note=f"products {es}")

    enol_n = resonance_count(species("enolate"))
    alpha = site(species("acetone"), "[CH3]")
    preview("u9", t, "u0-pv-u9", "A base pulls H⁺ off acetone. Pick the carbon it comes from.",
            [("alpha", "A carbon next to the C=O", "Right. That anion spreads onto O by resonance: an enolate."),
             ("co", "The C=O carbon", "The carbonyl carbon has no H on it in acetone."),
             ("none", "No carbon, only O-H", "Acetone has no O-H. Its alpha C-H is the acidic one.")],
            "alpha" if enol_n >= 2 else None, "alpha",
            "An H on the carbon next to C=O is acidic because its anion shares charge with O. Unit 9 builds on enolates.",
            prov("enolate made by removing an alpha H in RDKit; two contributors from ResonanceMolSupplier", "22.5"),
            structure("acetone", marks=[alpha]), concept="enols_and_enolates", note=f"enolate contributors {enol_n}")

    nn = next(a for a in mol(species("methylamine")).GetAtoms() if a.GetSymbol() == "N")
    preview("u10", t, "u0-pv-u10", "Pick what makes methylamine a base.",
            [("lp", "The lone pair on N", "Right. N's pair takes an H⁺: amines are the organic bases."),
             ("ch", "Its C-H bonds", "C-H bonds hold no free pair to give."),
             ("charge", "A negative charge", "Methylamine is neutral. The lone pair alone does the job.")],
            "lp" if lone_pairs(nn) == 1 and nn.GetFormalCharge() == 0 else None, "lp",
            "Amines are bases because N keeps one lone pair. Unit 10 is all about that pair.",
            prov("lone pairs and charge on N counted in RDKit", "24.3"), structure("methylamine", pairs=True),
            concept="amines")

    counts = {"phenoxide": resonance_count(species("phenoxide")), "cyclohexoxide": resonance_count(species("cyclohexoxide"))}
    spread = max(counts, key=counts.get)
    preview("u11", t, "u0-pv-u11", "Pick the anion whose charge spreads into a ring.",
            [("phenoxide", "Phenoxide, from phenol", "Right. The ring's pi system shares the O's charge."),
             ("cyclohexoxide", "Cyclohexoxide, from cyclohexanol", "Its ring has no pi bonds, so the charge stays on O."),
             ("same", "Both the same", "Only phenoxide has a pi system next to its O.")],
            spread if counts[spread] > 1 and counts["cyclohexoxide"] == 1 else None, "phenoxide",
            "Phenols are more acidic than ordinary alcohols because the ring spreads phenoxide's charge. That is Unit 11.",
            prov("contributors counted with ResonanceMolSupplier for both anions", "17.2"),
            pair(named("phenoxide"), named("cyclohexoxide")), concept="phenols", note=f"contributors {counts}")

    pi_in = sum(1 for k in ("butadiene", "ethene") for b in mol(species(k)).GetBonds() if b.GetBondType() == Chem.BondType.DOUBLE)
    preview("u12", t, "u0-pv-u12", "Pick how many pi electrons move in a Diels-Alder.",
            [("6", "Six", "Right. Two C=C from the diene, one from ethene: three pairs move at once."),
             ("4", "Four", "Four is the diene alone. The dienophile's C=C moves too."),
             ("2", "Two", "Two is a single C=C. Three move together, in a ring.")],
            {2: "2", 4: "4", 6: "6"}.get(pi_in * 2), "6",
            "Pericyclic reactions move electrons around a ring in one step. The Diels-Alder moves six. Unit 12.",
            prov("C=C bonds in the two reactants counted in RDKit, two electrons each", "30.1"),
            pair(named("butadiene"), named("ethene")), concept="diels_alder", note=f"pi bonds {pi_in}")

    gl = len(stereocentres(species("glucose_chain")))
    preview("u13", t, "u0-pv-u13", "Pick how many stereocentres open-chain glucose has.",
            [("4", "Four", "Right. C2 to C5 each hold four different groups."),
             ("6", "Six", "C1 is the C=O carbon and C6 is a CH₂OH: neither is a stereocentre."),
             ("1", "One", "Every carbon from C2 to C5 has H, OH and two different chains.")],
            {1: "1", 4: "4", 6: "6"}.get(gl), "4",
            "Sugars are packed with stereocentres, which is why there are so many of them. Unit 13 sorts them out.",
            prov("FindMolChiralCenters with includeUnassigned on OPSIN 2,3,4,5,6-pentahydroxyhexanal (no configuration typed)", "25.3"),
            structure("glucose_chain"), concept="structure_and_bonding", note=f"stereocentres {gl}")

    achiral = [k for k in ("glycine", "alanine") if not stereocentres(species(k))]
    preview("u14", t, "u0-pv-u14", "Pick the amino acid with no stereocentre.",
            [("glycine", "Glycine", "Right. Its alpha carbon holds two H, so no four different groups."),
             ("alanine", "Alanine", "Alanine's alpha carbon holds H, CH₃, NH₂ and COOH: a stereocentre."),
             ("both", "Both have one", "Glycine's alpha carbon has two identical H atoms.")],
            achiral[0] if len(achiral) == 1 else None, "glycine",
            "Every amino acid but glycine has a stereocentre at its alpha carbon. Unit 14 builds proteins from them.",
            prov("FindMolChiralCenters on OPSIN glycine and alanine", "26.1"),
            pair(named("glycine"), named("alanine")), concept="structure_and_bonding", note=f"achiral {achiral}")

    hyd = react(HYDROLYSIS, species("tributyrin"), species("hydroxide"))
    alcohols = set()
    # Run the hydrolysis three times, once per ester, on what is left each time.
    cur = species("tributyrin")
    for _ in range(3):
        out = react(HYDROLYSIS, cur, species("hydroxide"))
        if not out:
            break
        cur = max(out[0], key=lambda x: mol(x).GetNumAtoms() if "[O-]" not in x else -1)
    alcohols.add(cur)
    preview("u15", t, "u0-pv-u15", "A fat is split by NaOH, as in soap making. Pick the alcohol released.",
            [("glycerol", "Glycerol, with three OH", "Right. Each of its three OH groups held one fatty acid as an ester."),
             ("ethanol", "Ethanol", "Fats are not ethyl esters. The backbone has three carbons."),
             ("methanol", "Methanol", "Methyl esters are biodiesel, not fats.")],
            "glycerol" if alcohols == {species("glycerol")} and hyd else None, "glycerol",
            "A fat is three esters on glycerol. Base hydrolysis frees the glycerol and makes soap. Unit 15.",
            prov("three ester hydrolyses by SMARTS on OPSIN glyceryl tributanoate; the leftover checked against OPSIN glycerol", "27.1"),
            structure("tributyrin", "a small fat"), concept="carboxylic_acids", note=f"leftover {cur}",
            tiles={k: named(k) for k in ("glycerol", "ethanol", "methanol")})

    if sorted(PREVIEW_UNITS.values(), key=lambda k: int(k[1:])) != [f"u{i}" for i in range(1, 16)]:
        fail(f"ch9 must cover u1..u15 once each: {sorted(PREVIEW_UNITS.values())}")


# ---------------------------------------------------------------------------
# Guess first: one ungraded question per scene (Justin Sung's priming)
# ---------------------------------------------------------------------------

def tile(key: str, caption: str | None = None, **kw) -> dict:
    return named(key, caption, **kw)


def primes() -> None:
    """
    One "guess first" question per chapter scene, at level 0, so it plays as the
    scene lesson's meet step: a pick cannot fail and nothing is graded. Round 2:
    these are NEW questions; the chapter's practice items are never reused here
    (the critic saw the same MCQ ungraded, then graded, then in the test out).
    """
    p0 = {"levels": [0]}

    cands = {"water": "water", "methane": "methane", "ammonia": "ammonia"}
    hits = [k for k, key in cands.items() if formula(species(key)) == "H2O"]
    mcq("u0-controls-scene", "u0-prime-ch1", "Bloom found a page. Tap the drawing of water.",
        [("water", "Water", "Right. One O with two H: H₂O."),
         ("methane", "Methane", "That is one C with four H. Water has an O."),
         ("ammonia", "Ammonia", "That N carries three H. Water's O carries two.")],
        hits[0] if len(hits) == 1 else None, "water",
        "Water is H₂O: one O and two H. Heteroatoms like O and N are always written in a drawing.",
        prov("formula by RDKit CalcMolFormula on each OPSIN structure", "1.1"), None,
        brief="Tap a card, then CHECK.", tiles={k: tile(key, pairs=True) for k, key in cands.items()}, **p0)

    c = next(a for a in mol(species("methane")).GetAtoms() if a.GetSymbol() == "C")
    mcq("u0-bonding-scene", "u0-prime-ch2", "Guess first: how many bonds does carbon make in methane.",
        [("four", "Four", "Right. Carbon makes four bonds, here one to each H."),
         ("three", "Three", "Three bonds is nitrogen's habit, as in ammonia."),
         ("two", "Two", "Two bonds is oxygen's habit, as in water.")],
        {4: "four", 3: "three", 2: "two"}.get(c.GetTotalValence()), "four",
        "Neutral carbon makes four bonds, nitrogen three, oxygen two. Formal charge starts from these habits.",
        prov("bonds on C (total valence) read in RDKit", "1.3"), structure("methane"),
        concept="structure_and_bonding", **p0)

    ac = species("acetate")
    o_minus = idx(ac, "[O-]")
    other = next(f for f in resonance_forms(ac) if f.GetAtomWithIdx(o_minus).GetFormalCharge() == 0)
    opts = {"b": Chem.MolToSmiles(other), "acid": species("acetic_acid"), "eto": species("ethoxide")}
    same = [k for k, v in opts.items() if canon(v) == ac]
    mcq("u0-resonance-scene", "u0-prime-ch3", "Guess first: tap the other drawing of this ion.",
        [("b", "Drawing B", "Right. Same atoms, same skeleton: only the minus and the C=O swapped places."),
         ("acid", "Drawing A", "That one has an extra H on O. A second drawing never adds atoms."),
         ("eto", "Drawing C", "That has a CH₂ in place of the C=O. The atoms must stay the same.")],
        same[0] if len(same) == 1 else None, "b",
        "Two drawings of one ion that differ only in where electrons sit are resonance contributors.",
        prov("the other contributor from ResonanceMolSupplier; candidates compared by canonical SMILES", "2.4"),
        structure("acetate", "this ion", pairs=True), concept="resonance_and_delocalisation",
        tiles={"b": {"figure": figure(ac, source=other, pairs=True), "name": "B"},
               "acid": tile("acetic_acid", "A"), "eto": tile("ethoxide", "C", pairs=True)}, **p0)

    pk = {k: PKA[k][0] for k in ("hcl", "water")}
    mcq("u0-acids-scene", "u0-prime-ch4", "Guess first: which gives up its H⁺ more easily.",
        [("hcl", "Hydrogen chloride", f"Right. Its pKa is about {pk['hcl']:g}; water's is about {pk['water']:g}."),
         ("water", "Water", "Water holds its H⁺ tightly. HCl lets go almost completely."),
         ("same", "About the same", "Their pKa values are more than twenty units apart.")],
        min(pk, key=pk.get), "hcl",
        "A lower pKa means an acid gives up its H⁺ more easily. HCl is far stronger than water.",
        prov("compared on the pKa table", "2.8", "PKA"), pair(named("hcl"), named("water", pairs=True)),
        concept="pka_and_acidity", **p0)

    cands = {"nh3": "ammonia", "me": "methyl_cation", "bh3": "borane"}
    givers = [k for k, key in cands.items() if nucleophile_atom(species(key)) is not None]
    mcq("u0-nuc-elec-scene", "u0-prime-ch5", "Guess first: tap the one with a lone pair to give.",
        [("nh3", "Ammonia", "Right. N keeps one lone pair after its three bonds."),
         ("me", "Methyl cation", "Its carbon has an empty orbital and no pair."),
         ("bh3", "Borane", "Boron has an empty orbital and no pair.")],
        givers[0] if len(givers) == 1 else None, "nh3",
        "A lone pair is electrons to give. Ammonia has one; the methyl cation and borane have room to take one.",
        prov("lone pairs counted on every atom in RDKit", "6.5"), None,
        concept="nucleophiles_and_leaving_groups",
        tiles={k: tile(key, pairs=True) for k, key in cands.items()}, **p0)

    formed, _broken = bond_changes(SN2_SMARTS["O-"])
    mcq("u0-arrows-scene", "u0-prime-ch6", "Guess first: HO⁻ meets CH₃Br. Pick the new bond.",
        [("co", "A C-O bond", "Right. The O's pair bonds to the carbon."),
         ("ch", "A C-H bond", "The carbon already has its three H. No new H arrives."),
         ("obr", "An O-Br bond", "O and Br are both electron rich. They do not pair up.")],
        "co" if formed == {(1, 3)} else None, "co",
        "Electron rich O meets the carbon bonded to Br, and a C-O bond forms. Arrows show how.",
        prov("bonds made read off the SN2 reaction SMARTS (map 1 carbon, map 3 oxygen)", "6.6"),
        pair(named("hydroxide", pairs=True), named("bromomethane")), concept="substitution_and_elimination", **p0)

    cands = {"me": "bromomethane", "sec": "bromopropane2", "ter": "tbubr"}
    deg = {k: carbon_degree(species(key), lg_carbon(species(key))) for k, key in cands.items()}
    top = [k for k, v in deg.items() if v == max(deg.values())]
    mcq("u0-subst-elim-scene", "u0-prime-ch7", "Guess first: tap the most crowded C-Br carbon.",
        [("ter", "tert-Butyl bromide", "Right. Three carbons sit on its C-Br carbon."),
         ("sec", "2-Bromopropane", "Two carbons on its C-Br carbon. One drawing has three."),
         ("me", "Bromomethane", "No carbons at all on its C-Br carbon: the least crowded.")],
        top[0] if len(top) == 1 else None, "ter",
        "Count the carbons on the carbon holding Br. That crowding decides SN1, SN2, E1 or E2.",
        prov("carbon neighbours of the C-Br carbon counted in RDKit", "11.1"), None,
        concept="substitution_and_elimination",
        tiles={k: tile(key, marks=[lg_carbon(species(key))]) for k, key in cands.items()}, **p0)

    cands = {"but": "butan2ol", "eth": "ethanol", "ipr": "propan2ol"}
    chiral = [k for k, key in cands.items() if stereocentres(species(key))]
    mcq("u0-stereo-scene", "u0-prime-ch8", "Guess first: tap the molecule with a mirror image twin.",
        [("but", "2-Butanol", "Right. Its C2 holds four different groups, so its mirror image is a different molecule."),
         ("eth", "Ethanol", "No carbon in ethanol holds four different groups."),
         ("ipr", "2-Propanol", "Its C2 holds two identical CH₃ groups, so its mirror image is the same molecule.")],
        chiral[0] if len(chiral) == 1 else None, "but",
        "A carbon with four different groups makes a molecule that differs from its mirror image, like a hand.",
        prov("stereocentres from FindMolChiralCenters on each OPSIN structure", "5.2"), None,
        concept="structure_and_bonding", tiles={k: tile(key) for k, key in cands.items()}, **p0)

    n_units = len(unit_titles())
    mcq("u0-preview-scene", "u0-prime-ch9", "Guess first: how many units does the map hold.",
        [("15", "Fifteen", "Right. Fifteen units, from the Diels-Alder to fats and soap."),
         ("5", "Five", "More than that: Orgo II is a long course."),
         ("30", "Thirty", "Fewer than that. Each unit is a few weeks of a course.")],
        {15: "15", 5: "5", 30: "30"}.get(n_units), "15",
        "The map holds fifteen units. Every one starts from a page of this notebook.",
        prov("units counted in PATHWAY_UNITS (src/game/demo/pathwayMap.ts)", "14.1"),
        structure("cyclohexene", "where Unit 1 ends up"), concept="diels_alder", **p0)


# ---------------------------------------------------------------------------
# The test-out quiz: drawn from chapters 2 to 8, interleaved by chapter
# ---------------------------------------------------------------------------

EXAM_IDS = [
    "u0-bond-fc-nh4", "u0-res-where", "u0-acid-stronger", "u0-ne-ch3br", "u0-arr-tail", "u0-se-methyl", "u0-st-count",
    "u0-bond-lp-water", "u0-acid-equilibrium",
]
EXAM_CHAPTERS = ["u0-bonding", "u0-resonance", "u0-acids", "u0-nuc-elec", "u0-arrows", "u0-subst-elim", "u0-stereo"]


def check_exam() -> None:
    homes = {e.get("id") or e["beat"]["id"]: node for node, es in POOLS.items() for e in es}
    for i in EXAM_IDS:
        if homes.get(i) not in EXAM_CHAPTERS:
            fail(f"exam id {i} is not from chapters 2 to 8 ({homes.get(i)})")
    if not 8 <= len(EXAM_IDS) <= 10:
        fail("the test out quiz holds 8 to 10 items")
    if {homes[i] for i in EXAM_IDS if i in homes} != set(EXAM_CHAPTERS):
        fail("the test out quiz must sample every chapter 2 to 8")


# ---------------------------------------------------------------------------
# Story figures: what each scene step draws, with the atoms it points at
# ---------------------------------------------------------------------------

STORY: dict[str, dict] = {}


def story_fig(key: str, smi: str, name: str, atoms: dict[str, int] | None = None,
              bonds: dict[str, tuple[int, int]] | None = None, pairs: bool = False, source: Chem.Mol | None = None) -> None:
    """Atom indexes are RDKit's for `smi` exactly as written here (a canonical SMILES), so a renderer that
    parses the same string gets the same atom order. The drawing and every atom's place are emitted too."""
    where: dict[int, tuple[float, float]] = {}
    fig = figure(smi, pairs=pairs, where=where, source=source)
    n = mol(smi).GetNumAtoms()
    for k, i in (atoms or {}).items():
        if not 0 <= i < n:
            fail(f"story {key}: atom {k} index {i} out of range")
    for k, (i, j) in (bonds or {}).items():
        if mol(smi).GetBondBetweenAtoms(i, j) is None:
            fail(f"story {key}: bond {k} {i}-{j} is not a bond")
    STORY[key] = {"smiles": smi, "name": name, "figure": fig,
                  "atomXY": {str(i): list(xy) for i, xy in sorted(where.items())},
                  "atoms": atoms or {}, "bonds": {k: list(v) for k, v in (bonds or {}).items()}}


def idx(smi: str, smarts: str, n: int = 0) -> int:
    return mol(smi).GetSubstructMatches(Chem.MolFromSmarts(smarts))[0][n]


def build_story() -> None:
    eth = species("ethanol")
    story_fig("ethanol", eth, "ethanol", atoms={"o": idx(eth, "[OX2H]")})
    ac = species("acetate")
    o_minus = idx(ac, "[O-]")
    o_double = idx(ac, "[OX1]=C")
    c_ac = idx(ac, "[CX3](=O)[O-]")
    story_fig("acetate", ac, "acetate", atoms={"oMinus": o_minus, "oDouble": o_double, "carbon": c_ac},
              bonds={"co": (c_ac, o_minus), "cDoubleO": (c_ac, o_double)}, pairs=True)
    forms = resonance_forms(ac)
    other = next(f for f in forms if f.GetAtomWithIdx(o_minus).GetFormalCharge() == 0)
    story_fig("acetateB", ac, "acetate, the other contributor", atoms={"oMinus": o_double, "oDouble": o_minus, "carbon": c_ac},
              bonds={"co": (c_ac, o_double), "cDoubleO": (c_ac, o_minus)}, pairs=True, source=other)
    w = species("water")
    story_fig("water", w, "water", atoms={"o": idx(w, "[OX2]")}, pairs=True)
    am = species("ammonium")
    story_fig("ammonium", am, "ammonium", atoms={"n": idx(am, "[N+]")}, pairs=True)
    et = species("ethene")
    story_fig("ethene", et, "ethene", atoms={"c1": 0, "c2": 1}, bonds={"pi": (0, 1)})
    aa = species("acetic_acid")
    story_fig("aceticAcid", aa, "acetic acid", atoms={"oh": idx(aa, "[OX2H1]")})
    oh = species("hydroxide")
    story_fig("hydroxide", oh, "hydroxide", atoms={"o": 0}, pairs=True)
    br = species("bromomethane")
    story_fig("bromomethane", br, "bromomethane", atoms={"deltaPlus": delta_plus(br), "br": idx(br, "[Br]")},
              bonds={"cbr": (delta_plus(br), idx(br, "[Br]"))})
    sn2 = canon(species("hydroxide") + "." + species("bromomethane"))
    m = mol(sn2)
    o_i = idx(sn2, "[O-]")
    c_i = idx(sn2, "[CX4][Br]")
    b_i = idx(sn2, "[Br]")
    story_fig("sn2Start", sn2, "hydroxide and bromomethane", atoms={"nucleophile": o_i, "carbon": c_i, "leaving": b_i},
              bonds={"cbr": (c_i, b_i)}, pairs=True)
    del m
    prods = only(react(SN2_SMARTS["O-"], br, oh), "story SN2")
    story_fig("sn2End", canon(".".join(prods)), "methanol and bromide")
    tb = species("tbubr")
    story_fig("tbubr", tb, "tert-butyl bromide", atoms={"carbon": lg_carbon(tb)})
    cat = species("tbu_cation")
    c_plus = charged_atom(cat).GetIdx()
    beta_cat = next(n.GetIdx() for n in mol(cat).GetAtomWithIdx(c_plus).GetNeighbors() if n.GetSymbol() == "C")
    story_fig("tbuCation", cat, "tert-butyl cation", atoms={"carbon": c_plus, "beta": beta_cat},
              bonds={"cc": (c_plus, beta_cat)})
    # E1: the cation loses a beta H. Made by SMARTS, checked against OPSIN 2-methylpropene.
    e1 = only(react(E1_SMARTS, cat), "story E1")
    if e1 != [species("isobutylene")]:
        fail(f"story E1: expected 2-methylpropene, got {e1}")
    story_fig("e1Alkene", e1[0], "2-methylpropene (E1 product)")
    b2 = species("bromobutane2")
    # The beta carbon whose H the base takes: the one whose E2 product is the major (Zaitsev) alkene.
    beta = None
    for b_i, a_i, x_i in mol(b2).GetSubstructMatches(Chem.MolFromSmarts("[CX4;!H0][CX4][Br]")):
        rw = Chem.RWMol(mol(b2))
        rw.GetBondBetweenAtoms(b_i, a_i).SetBondType(Chem.BondType.DOUBLE)
        rw.RemoveAtom(x_i)
        Chem.SanitizeMol(rw)
        if canon(Chem.MolToSmiles(rw)) == species("but2ene"):
            beta = b_i
    if beta is None:
        fail("story: no beta carbon of 2-bromobutane gives but-2-ene")
        beta = 0
    story_fig("bromobutane2", b2, "2-bromobutane", atoms={"carbon": lg_carbon(b2), "beta": beta},
              bonds={"cbr": (lg_carbon(b2), idx(b2, "[Br]")), "cc": (beta, lg_carbon(b2))})
    story_fig("but2ene", OPSIN["but-2-ene"], "but-2-ene (major E2 product)")
    r2 = species("r_butan2ol")
    cen = stereocentres(r2)[0]
    if cip_atoms(r2).get(cen) != "R":
        fail("story: (R)-2-butanol is not R by CIP")
    story_fig("rButanol", r2, "(R)-2-butanol", atoms={"stereocentre": cen})
    story_fig("sButanol", species("s_butan2ol"), "(S)-2-butanol", atoms={"stereocentre": stereocentres(species("s_butan2ol"))[0]})
    story_fig("eButene", species("e_butene"), "(E)-2-butene", bonds={"alkene": tuple(next(
        (b.GetBeginAtomIdx(), b.GetEndAtomIdx()) for b in mol(species("e_butene")).GetBonds() if b.GetBondType() == Chem.BondType.DOUBLE))})
    story_fig("benzene", species("benzene"), "benzene")
    da = only(react(DA_SMARTS, species("butadiene"), species("ethene")), "story DA")[0]
    story_fig("cyclohexene", da, "cyclohexene, the Diels-Alder product")


# ---------------------------------------------------------------------------
# Guidebook drawings, in the guide's own format (scripts/guide_u1.py's figure code)
# ---------------------------------------------------------------------------

GUIDE_PRODUCTS: list[tuple[str, str, str]] = []  # (name, SMILES, how) for the report


def build_guide() -> dict:
    sys.path.insert(0, str(Path(__file__).resolve().parent))
    import guide_u1 as g  # the guide's drawing code, reused so both guides draw alike

    def gm(key: str, name: str | None = None, hi: tuple[str, ...] = (), explicit_h: bool = False) -> dict:
        return g.mol(species(key) if key in SP else key, name or (name_of(key) if key in SP else None), hi=hi, explicit_h=explicit_h)

    ex: dict[str, dict] = {}
    ex["u0-controls"] = {"caption": "Ethanol: two carbons and an O-H. Every control in Unit 0 starts from a drawing like this.",
                         "panels": [g.focus(gm("ethanol", hi=("[OX2H]",)))]}
    ex["u0-bonding"] = {"caption": "Ammonia keeps one lone pair; give it an H⁺ and N carries +1.",
                        "panels": [gm("ammonia"), g.arrow("H⁺"), g.focus(gm("ammonium", hi=("[N+]",)))]}
    ac = species("acetate")
    forms = resonance_forms(ac)
    pa, pts = g.mol_panel(Chem.MolToSmiles(forms[0]), "acetate", source=forms[0], hi=("[O-]",))
    pb, _ = g.mol_panel(Chem.MolToSmiles(forms[1]), None, coords=pts, source=forms[1], hi=("[O-]",))
    ex["u0-resonance"] = {"caption": "Acetate's two contributors: the minus sits on one O, then the other. Only electrons move.",
                          "panels": [pa, g.RES, pb]}
    ex["u0-acids"] = {"caption": "Acetic acid gives up its O-H proton; acetate shares the charge over two O.",
                      "panels": [gm("acetic_acid", hi=("[OX2H1]",)), g.arrow(f"{MINUS}H⁺"), g.focus(gm("acetate", hi=("[O-]",)))]}
    ex["u0-nuc-elec"] = {"caption": "Hydroxide's O gives a pair; bromomethane's delta plus carbon takes it.",
                         "panels": [gm("hydroxide", hi=("[O-]",)), g.PLUS, gm("bromomethane", hi=("[CX4]",))]}
    prods = only(react(SN2_SMARTS["O-"], species("bromomethane"), species("hydroxide")), "guide SN2")
    meoh = [p for p in prods if p != species("bromide")][0]
    GUIDE_PRODUCTS.append(("methanol", meoh, "SN2 SMARTS on bromomethane and hydroxide"))
    ex["u0-arrows"] = {"caption": "Two arrows, one step: the O lone pair makes a C-O bond as the C-Br bond leaves with Br.",
                       "panels": [gm("hydroxide"), g.PLUS, gm("bromomethane"), g.arrow("SN2"), g.focus(gm(meoh, "methanol"))]}
    e2 = sorted({next(p for p in ps if p != species("bromide")) for ps in react(E2_SMARTS, species("tbubr"))})
    if e2 != [OPSIN["2-methylprop-1-ene"]]:
        fail(f"guide E2: expected 2-methylpropene only, got {e2}")
    GUIDE_PRODUCTS.append(("2-methylpropene", e2[0], "E2 SMARTS on tert-butyl bromide, checked against OPSIN 2-methylprop-1-ene"))
    ex["u0-subst-elim"] = {"caption": "A strong bulky base on a 3° bromide: E2 makes the alkene.",
                           "panels": [gm("tbubr", hi=("[CX4][Br]",)), g.arrow("t-BuO⁻", "E2"), g.focus(gm(e2[0], "2-methylpropene"))]}
    ex["u0-stereo"] = {"caption": "(R)- and (S)-2-butanol are mirror images: one stereocentre, two labels.",
                       "panels": [gm("r_butan2ol", "(R)-2-butanol"), gm("s_butan2ol", "(S)-2-butanol")]}  # no connector: a resonance arrow would say they are one molecule
    da = only(react(DA_SMARTS, species("butadiene"), species("ethene")), "guide DA")[0]
    GUIDE_PRODUCTS.append(("cyclohexene", da, "Diels-Alder SMARTS on 1,3-butadiene and ethene"))
    ex["u0-preview"] = {"caption": "A first taste of Unit 1: a diene and a C=C close a six-membered ring.",
                        "panels": [gm("butadiene"), g.PLUS, gm("ethene"), g.arrow("heat"), g.focus(gm(da, "cyclohexene"))]}
    for e in ex.values():
        g.equalize(e["panels"])
    return ex


# ---------------------------------------------------------------------------
# Output
# ---------------------------------------------------------------------------

POOLS_HEADER = '''/**
 * Unit 0 ("Start here") practice pools. GENERATED by scripts/u0_pools.py with RDKit.
 * Do not edit by hand: edit the specs in the script and rerun it.
 *
 * EVERY ENTRY IS A DRAFT (`placeholder: true`) for the owner's review. Every
 * neutral structure came from a name through OPSIN, every ion was made from
 * one, and every answer was derived by RDKit; the script refuses to write this
 * file when an authored key disagrees. pKa values and the SN1/SN2/E1/E2 table
 * are cited tables, not derivations: scripts/u0_pools_report.md lists them
 * under OWNER FLAGS.
 *
 * Ladders are built with createProblem and createOrderingAnswer as
 * content/u2/pools.ts does; match boards go through buildMatchBoard.
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
import type { PoolEntry, UnitPools } from "../u1/types";

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
    tags: ["ladder", "u0-pool", "placeholder"],
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

FIGS_HEADER = '''/**
 * Unit 0 story figures. GENERATED by scripts/u0_pools.py with RDKit.
 * Do not edit by hand: change the script and rerun it.
 *
 * Every structure the story draws, as data: the canonical SMILES, the drawing
 * in the 120 by 84 figure format, where each atom sits in that drawing, and the
 * atoms and bonds a scene step points at, found by RDKit (the EN rule delta
 * plus carbon, the CIP stereocentre, the leaving group), never counted by hand.
 * Atom indexes are RDKit's for `smiles` exactly as written.
 *
 * Kept apart from pools.ts on purpose: the pathway map imports the story (for
 * its node lookup) and the story imports only this file, so the pools never
 * join the entry chunk.
 */
import type { Figure } from "../../onboarding/figures";

export interface StoryFigure {
  readonly smiles: string;
  readonly name: string;
  readonly figure: Figure;
  /** Atom index (as a string key) to its [x, y] in `figure`. */
  readonly atomXY: Readonly<Record<string, readonly [number, number]>>;
  /** Named atoms a scene can highlight, by RDKit index. */
  readonly atoms: Readonly<Record<string, number>>;
  /** Named bonds, as their two atom indexes. */
  readonly bonds: Readonly<Record<string, readonly [number, number]>>;
}

'''

GUIDE_HEADER = '''/**
 * Unit 0 guidebook drawings. GENERATED by scripts/u0_pools.py with RDKit,
 * using scripts/guide_u1.py's drawing code so both guides look alike.
 * Do not edit by hand: change the script and rerun it.
 *
 * Every structure is one the Unit 0 pools or story also use, and every product
 * was made by a reaction SMARTS. Drafts until the owner signs them off.
 */
import type { GuideExample } from "./types";

export const U0_GUIDE_EXAMPLES: Readonly<Record<string, GuideExample>> = '''


def ts(value) -> str:
    return json.dumps(value, ensure_ascii=False, indent=2)


def emit_pools() -> str:
    out = [POOLS_HEADER]
    out.append("\nexport const U0_POOLS: UnitPools = {")
    for node, entries in POOLS.items():
        out.append(f"  {json.dumps(node)}: [")
        for e in entries:
            if e.get("__ladder__"):
                spec = {k: v for k, v in e.items() if k != "__ladder__"}
                out.append("    ladder(" + ts(spec).replace("\n", "\n    ") + "),")
            elif e.get("__match__"):
                spec = {k: v for k, v in e.items() if k != "__match__"}
                out.append("    match(" + ts(spec).replace("\n", "\n    ") + "),")
            else:
                out.append("    " + ts(e).replace("\n", "\n    ") + ",")
        out.append("  ],")
    out.append("};\n")
    out.append("/** The drawing above each MCQ, keyed by beat id (beats/mcq/mcqFigures.ts mcqVisualFor). A tile question may have none. */")
    out.append("export const U0_VISUALS: Readonly<Record<string, McqVisual>> = " + ts(VISUALS) + ";\n")
    out.append("/** Drawn answer cards: beat id, then option id, to its molecule (mcqFigures.ts mcqOptionTiles). All options or none. */")
    out.append("export const U0_OPTION_TILES: Readonly<Record<string, Readonly<Record<string, NamedFigure>>>> = " + ts(TILES) + ";\n")
    out.append("/** A drawing for every sort card, keyed by beat id then item id. */")
    out.append("export const U0_SORT_FIGURES: Readonly<Record<string, Readonly<Record<string, NamedFigure>>>> = " + ts(SORT_FIGURES) + ";\n")
    out.append("/** Chapter 9: which Orgo II unit each preview question introduces, so the unit picker can link to it. */")
    out.append("export const U0_PREVIEW_UNITS: Readonly<Record<string, string>> = Object.freeze(" + ts(PREVIEW_UNITS) + ");\n")
    out.append("/** The test out quiz (u0-check): items set aside from chapters 2 to 8. */")
    out.append("export const U0_EXAM_IDS: readonly string[] = Object.freeze(" + ts(EXAM_IDS) + ");\n")
    out.append("/** The chapters the test out quiz interleaves, in teaching order. */")
    out.append("export const U0_EXAM_CHAPTERS: readonly string[] = Object.freeze(" + ts(EXAM_CHAPTERS) + ");\n")
    return "\n".join(out)


def sn_chart() -> dict:
    return {
        "cite": SN_CITE,
        "reagents": [REAGENT[r] for r in REAGENT],
        "rows": [{"substrate": DEGREE_WORD[d], "cells": [SN_TABLE[(d, r)] for r in REAGENT]} for d in range(4)],
    }


def emit_figs() -> str:
    return (FIGS_HEADER + "export const U0_STORY_FIGURES = " + ts(STORY)
            + " as const satisfies Readonly<Record<string, StoryFigure>>;\n\nexport type StoryFigureId = keyof typeof U0_STORY_FIGURES;\n"
            + "\n/** Chapter 7's decision chart: the cited SN/E table (an OWNER FLAG), substrate down the side, reagent across the top. */\n"
            + "export const U0_SN_CHART = " + ts(sn_chart()) + " as const;\n")


def emit_guide(ex: dict) -> str:
    body = {k: {**v, "placeholder": True} for k, v in ex.items()}
    return GUIDE_HEADER + json.dumps(body, indent=2, ensure_ascii=False) + ";\n"


def report() -> str:
    lines = [
        "# Unit 0 pools: derivation report",
        "",
        f"Generated by `{SCRIPT}`. Do not edit by hand. Every item is `placeholder: true`.",
        "",
        "## OWNER FLAGS",
        "",
        "These are the only answers in Unit 0 that RDKit cannot derive. They rest on the tables below.",
        "",
        "### 1. pKa values (table `PKA`)",
        "",
        "Read against the live OpenStax pages on 2026-10-17 (round 2): Table 2.3 for HCl, acetic acid, HCN, water and ethanol; Table 17.1 for phenol. Every value matched.",
        "",
        "| Acid | pKa | Read from | Used by |",
        "|---|---|---|---|",
    ]
    uses = {
        "hcl": "u0-acid-sort, u0-prime-ch4",
        "acetic_acid": "u0-acid-stronger, u0-acid-sort, u0-acid-equilibrium",
        "hcn": "(none yet; kept for the cyanide story line)",
        "phenol": "u0-acid-sort",
        "water": "u0-acid-equilibrium, u0-prime-ch4",
        "ethanol": "u0-acid-stronger, u0-acid-sort",
    }
    for k, (v, cite) in PKA.items():
        lines.append(f"| {name_of(k)} | {v:g} | {cite} | {uses[k]} |")
    lines += [
        "",
        "### 2. SN1 / SN2 / E1 / E2 at a glance (table `SN_TABLE`)",
        "",
        f"Read from: {SN_CITE}. Substrate degree is derived (carbon neighbours of the C-X carbon); the decision is the table's.",
        "",
        "| Substrate | " + " | ".join(REAGENT[r] for r in REAGENT) + " |",
        "|---|" + "---|" * len(REAGENT),
    ]
    for d in range(4):
        lines.append(f"| {DEGREE_WORD[d]} | " + " | ".join(SN_TABLE[(d, r)] for r in REAGENT) + " |")
    lines += [
        "",
        "Used by u0-se-methyl, u0-se-sn1, u0-se-e2, u0-se-zaitsev, u0-se-sn2. The 2° weak nucleophile and 3° good nucleophile cells are the ones courses teach differently.",
        "",
        "### 3. Electronegativity (table `EN`), for the delta plus carbon",
        "",
        f"Read from: {EN_CITE}. Rule (OpenStax 2.1): in a bond from carbon to a more electronegative atom the electrons are drawn toward that atom, so carbon is delta plus.",
        "",
        "| Atom | EN | Checked on the page |",
        "|---|---|---|",
        *[f"| {a} | {v:g} | {'yes, in the text' if a in EN_VERIFIED else 'NO: only in Figure 2.3, not in the page text'} |" for a, v in EN.items()],
        "",
        "Used by u0-ne-ch3br, u0-ne-acetone, u0-arr-head and the chapter 5 and 6 story drawings.",
        f"- **C-Br is only weakly polar on this table** (2.8 vs 2.5, a difference of 0.3, under the 0.5 OpenStax gives for polar covalent). Every textbook still draws CH3Br's carbon as delta plus; the item says so. Owner to confirm the wording.",
        f"- **Gasteiger disagrees for CH3Br**: {gasteiger(species('bromomethane'))} (index, atom, charge). The carbon is not positive at all, only less negative than Br. Gasteiger is therefore reported, never used, for the delta plus atom (round 2 critic).",
        "",
        "### 4. Other calls for the owner",
        "",
        "- **Zaitsev rule** (u0-se-zaitsev): the major E2 alkene is taken as the most substituted C=C of those the E2 SMARTS gives. A rule, applied by counting carbons.",
        "- **Chapter 1's drag card ranks bonds from carbon to O** (u0-ctl-sort): methane 0, methanol 1, formaldehyde 2, formic acid 3, summed by RDKit bond order. The brief suggested carbon count or formula weight; neither is a SortCriterion the beat type allows (beats/types.ts is another lane's file), and `oxidation_level` is exactly this count for one-carbon compounds, so it is honest and needs no new type.",
        "- **Guess first questions** (u0-prime-ch1 to ch9): new level 0 MCQs, one per scene node, played ungraded as that scene lesson's meet step. None reuses a practice item.",
        "- **u0-se-e2 distractor** now reads 'Di-tert-butyl ether, by SN2', the product the SN2 SMARTS makes from t-BuO⁻ and t-BuBr (checked against OPSIN). It used to say tert-butanol, which no step made.",
        "- **Concept ids**: CONCEPTS has no stereochemistry id, so the chapter 8 items and the u13 and u14 previews file under `structure_and_bonding`.",
        "- **Chapter nodes play as lessons, not in-a-row runs** (round 2, story.ts): each chapter's second node has role `lesson`, so every card plays once under one progress strip. The brief said role `practice`, which plays the ALEKS run: '0 of 3 for Pro', a Stop after three, and in round 1 it ended chapter 1 before every control and chapter 9 before Units 11 to 15. Only the test out (u0-check) is still a run, in exam mode.",
        "- **Lookup lines in shared files** (round 2): beats/mcq/mcqFigures.ts gained `?? U0_VISUALS[beatId]` and `?? U0_OPTION_TILES[beatId]`, and beats/PoolItemsStep.tsx `?? U0_SORT_FIGURES[entry.id]`, the same one-term lines Units 2 to 9 already added there.",
        "",
        "## Species",
        "",
        "| Key | SMILES | Formula | From |",
        "|---|---|---|---|",
    ]
    for k, v in SP.items():
        lines.append(f"| {k} | `{v['smi']}` | {formula(v['smi'])} | {v['how']} |")
    lines += ["", "## Guidebook products (made by reaction SMARTS)", "", "| Name | SMILES | How |", "|---|---|---|"]
    lines += [f"| {n} | `{s}` | {h} |" for n, s, h in GUIDE_PRODUCTS]
    lines += ["", "## Items", "", "| Id | Kind | Key | What RDKit said |", "|---|---|---|---|", *DERIVED, ""]
    lines += ["## Test out quiz", "", ", ".join(EXAM_IDS), ""]
    return "\n".join(lines)


def build() -> None:
    build_species()
    if FAILURES:
        return
    ch1(); ch2(); ch3(); ch4(); ch5(); ch6(); ch7(); ch8(); ch9()
    if not FAILURES:
        primes()
    check_exam()
    if not FAILURES:
        build_story()


def main() -> int:
    build()
    guide = build_guide() if not FAILURES else {}
    if FAILURES:
        print("REFUSED. Nothing written:")
        for f in FAILURES:
            print("  " + f)
        return 1
    outputs = {OUT_POOLS: emit_pools(), OUT_FIGS: emit_figs(), OUT_GUIDE: emit_guide(guide), REPORT: report()}
    for path, text in outputs.items():
        if EM_DASH in text:
            print(f"REFUSED: an em dash reached {path.name}")
            return 1
    if "--check" in sys.argv:
        stale = [p for p, t in outputs.items() if not p.exists() or p.read_text(encoding="utf-8") != t]
        if stale:
            print("stale or hand edited: " + ", ".join(str(p.relative_to(REPO)) for p in stale))
            return 1
        print("u0_pools: every file matches")
        return 0
    for path, text in outputs.items():
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_text(text, encoding="utf-8", newline="\n")
    for node, entries in POOLS.items():
        print(f"{node}: {len(entries)}")
    print("wrote " + ", ".join(str(p.relative_to(REPO)) for p in outputs))
    return 0


if __name__ == "__main__":
    sys.exit(main())
