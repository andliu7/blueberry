"""
Unit 3 (electrophilic aromatic substitution) problem pools, a DRAFT, derived with RDKit.

Run:     python scripts/u3_pools.py
Writes:  src/game/content/u3/pools.ts (never edit it by hand: edit the specs
         below and rerun). The owner's report for this unit is written by hand
         beside the run, from what this script prints.

WHY A GENERATOR. The owner's rule is "derive, never assert". Every problem
below states its chemistry as SMILES and its question as copy; the script
works the answer out and refuses to write anything (prints REFUSED) when an
authored key disagrees with what it derived. Every entry is
`placeholder: true`. Only the owner clears it.

THE MODEL. Check these rules, not the hundred answers.

1. Substituent classifier (the taught directing model, coded). Looks only at
   X, the first atom off the ring:
     X is F, Cl, Br or I                                    halogen    o/p, deactivating
     X carries a + charge, or X has a double or triple
       bond to O, N or S, or X is a carbon carrying two
       or more halogens                                     withdrawer meta, deactivating
     X is a neutral O or N (it has a lone pair)             donor      o/p, activating
     X is any other carbon (alkyl, aryl)                    alkyl      o/p, activating
   Rate tiers for ranking, fastest first: donor, alkyl, plain benzene,
   halogen, withdrawer. Only the tier is modelled: two groups in one tier are
   never ranked against each other, so a ladder may only hold one per tier.
   Fixtures (textbook expectations used ONLY to test the classifier) refuse
   the run on any mismatch.

2. Where the electrophile goes. Each ring C-H is related to each substituent
   by ring path length (1 ortho, 2 meta, 3 para, from RDKit's distance
   matrix). With several groups, the group in the fastest tier decides
   ("the strongest activator wins"); a site flanked by two groups refuses the
   run rather than guessing about sterics. Products are built by bonding the
   electrophile's fragment to that carbon and canonicalised, so two
   symmetry-equivalent sites give one product. The ortho to para ratio is NOT
   modelled: no item claims one over the other unless the map's own blurb
   says so (blocking: "Sulfonate para").

3. The sigma complex, walked. From a Kekule structure, the attacked carbon
   goes sp3 and the + starts on its neighbour; the walk moves the + along
   C=C bonds (allylic shift) and records every form, each sanitised by
   RDKit. A + on a ring carbon that carries a donor or a halogen adds one
   more form with the + on that atom (every atom an octet); a + on a carbon
   that carries a withdrawer is flagged as the bad form. Counts and charged
   positions are read off the forms.

4. Reactions as graph edits, each one canonicalised by RDKit:
     nitro reduction     ArNO2 to ArNH2 (reaction SMARTS)
     desulfonation       ArSO3H to ArH
     carbonyl to CH2     ArC(=O)R to ArCH2R
     benzylic bromination  one Br on each sp3 carbon bonded to the ring that
                         carries an H; none when there is no benzylic H
     benzylic oxidation  every ring-bonded sp3 carbon with an H: its whole
                         chain is cut back to COOH; a carbon with no H stays
     Birch reduction     two para carbons go sp3: a donor's (or an alkyl's)
                         ring carbon stays on a C=C, a withdrawer's ring carbon
                         goes sp3 (the taught rule; RDKit only builds it)
     Friedel-Crafts alkylation  the cation starts on the C-Cl carbon and makes
                         ONE 1,2 shift (H first, then methyl) only if it lands
                         on a more substituted carbon (degree counted)
   Friedel-Crafts on a ring with a withdrawer is called a failure: an
   authored convention, listed in the report.

5. Names. Every compound name shown goes through OPSIN (py2opsin) and must
   parse back to the drawn structure, else the run is refused.

CHECKED AGAINST, never adapted (licensed problems are a check only):
  OpenStax Organic Chemistry (CC BY-NC-SA 4.0), chapter 16:
  16.1 Electrophilic Aromatic Substitution Reactions: Bromination;
  16.2 Other Aromatic Substitutions; 16.3 Alkylation and Acylation of
  Aromatic Rings: The Friedel-Crafts Reaction; 16.4 Substituent Effects in
  Electrophilic Substitutions; 16.5 Trisubstituted Benzenes: Additivity of
  Effects; 16.9 Oxidation of Aromatic Compounds; 16.10 Reduction of Aromatic
  Compounds; 16.11 Synthesis of Polysubstituted Benzenes.
  https://openstax.org/books/organic-chemistry/pages/16-4-substituent-effects-in-electrophilic-substitutions
"""

from __future__ import annotations

import json
import math
import os
import re
import sys
import tempfile
from pathlib import Path

from rdkit import Chem, RDLogger
from rdkit.Chem import AllChem, rdDepictor
from rdkit.Chem.rdMolDescriptors import CalcMolFormula

RDLogger.DisableLog("rdApp.*")
rdDepictor.SetPreferCoordGen(True)

REPO = Path(__file__).resolve().parent.parent
OUT = REPO / "src" / "game" / "content" / "u3" / "pools.ts"

SCRIPT = "scripts/u3_pools.py"


def os16(section: str) -> str:
    return f"OpenStax Organic Chemistry {section} (CC BY-NC-SA), read as a check only"


EM_DASH = chr(0x2014)
MINUS = "−"
FAILURES: list[str] = []
NOTES: list[str] = []


def fail(msg: str) -> None:
    FAILURES.append(msg)


def note(msg: str) -> None:
    NOTES.append(msg)


# ---------------------------------------------------------------------------
# Basics
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


def is_aromatic(smi: str) -> bool:
    return any(a.GetIsAromatic() for a in mol(smi).GetAtoms())


def benzene_ring(m: Chem.Mol) -> tuple[int, ...] | None:
    """The one six-membered all-carbon aromatic ring, or None."""
    rings = [r for r in m.GetRingInfo().AtomRings()
             if len(r) == 6 and all(m.GetAtomWithIdx(i).GetIsAromatic() and m.GetAtomWithIdx(i).GetSymbol() == "C" for i in r)]
    return rings[0] if len(rings) == 1 else None


# ---------------------------------------------------------------------------
# Rule 1: the substituent classifier
# ---------------------------------------------------------------------------

HALOGENS = {"F", "Cl", "Br", "I"}
TIER = {"donor": 1, "alkyl": 2, "none": 3, "halogen": 4, "withdrawer": 5}
DIRECTS = {"donor": "op", "alkyl": "op", "halogen": "op", "withdrawer": "m"}
ACTIVATES = {"donor": True, "alkyl": True, "halogen": False, "withdrawer": False}


def classify_x(m: Chem.Mol, x: Chem.Atom) -> str | None:
    sym = x.GetSymbol()
    if sym in HALOGENS:
        return "halogen"
    if x.GetFormalCharge() > 0:
        return "withdrawer"
    for b in x.GetBonds():
        other = b.GetOtherAtom(x)
        if other.GetIsAromatic() and other.IsInRing() and x.GetIsAromatic():
            continue
        if b.GetBondType() in (Chem.BondType.DOUBLE, Chem.BondType.TRIPLE) and other.GetSymbol() in ("O", "N", "S"):
            return "withdrawer"
    if sym == "C" and sum(1 for n in x.GetNeighbors() if n.GetSymbol() in HALOGENS) >= 2:
        return "withdrawer"
    if sym in ("O", "N") and x.GetFormalCharge() == 0:
        return "donor"
    if sym == "C":
        return "alkyl"
    return None


def substituents(smi: str) -> list[tuple[int, int, str]]:
    """(ring atom, X atom, class) for every group on the benzene ring."""
    m = mol(smi)
    ring = benzene_ring(m)
    if ring is None:
        raise ValueError(f"{smi}: no single benzene ring")
    out = []
    for i in ring:
        for n in m.GetAtomWithIdx(i).GetNeighbors():
            if n.GetIdx() in ring:
                continue
            klass = classify_x(m, n)
            if klass is None:
                raise ValueError(f"{smi}: the classifier has no rule for {n.GetSymbol()}")
            out.append((i, n.GetIdx(), klass))
    return out


def one_class(smi: str) -> str:
    subs = substituents(smi)
    if len(subs) != 1:
        raise ValueError(f"{smi}: expected one substituent, found {len(subs)}")
    return subs[0][2]


def tier_of(smi: str) -> int:
    subs = substituents(smi)
    if not subs:
        return TIER["none"]
    if len(subs) != 1:
        raise ValueError(f"{smi}: tiers are only modelled for one group")
    return TIER[subs[0][2]]


# Textbook expectations, used ONLY to test the classifier. Never a source of answers.
CLASS_FIXTURES = {
    "Oc1ccccc1": "donor", "Nc1ccccc1": "donor", "COc1ccccc1": "donor", "CC(=O)Nc1ccccc1": "donor",
    "Cc1ccccc1": "alkyl", "CCc1ccccc1": "alkyl",
    "Fc1ccccc1": "halogen", "Clc1ccccc1": "halogen", "Brc1ccccc1": "halogen", "Ic1ccccc1": "halogen",
    "O=[N+]([O-])c1ccccc1": "withdrawer", "O=Cc1ccccc1": "withdrawer", "CC(=O)c1ccccc1": "withdrawer",
    "O=C(O)c1ccccc1": "withdrawer", "N#Cc1ccccc1": "withdrawer", "O=S(=O)(O)c1ccccc1": "withdrawer",
    "FC(F)(F)c1ccccc1": "withdrawer", "C[N+](C)(C)c1ccccc1": "withdrawer", "COC(=O)c1ccccc1": "withdrawer",
}


def run_class_fixtures() -> None:
    for smi, want in CLASS_FIXTURES.items():
        got = one_class(smi)
        if got != want:
            fail(f"classifier fixture {smi}: expected {want}, got {got}")


# ---------------------------------------------------------------------------
# Rule 2: where the electrophile goes, and the products
# ---------------------------------------------------------------------------

E_FRAG = {
    "Br": "Br",
    "Cl": "Cl",
    "NO2": "[N+](=O)[O-]",
    "SO3H": "S(=O)(=O)O",
    "Ac": "C(C)=O",
    "EtCO": "C(CC)=O",
    "PrCO": "C(CCC)=O",
    "PhCO": "C(=O)c1ccccc1",
    "CHO": "C=O",
}


def attach(smi: str, site: int, frag: str) -> str:
    """Bond fragment atom 0 to `site`, the way a substitution replaces that C-H."""
    m = mol(smi)
    f = mol(frag)
    combo = Chem.RWMol(Chem.CombineMols(m, f))
    combo.AddBond(site, m.GetNumAtoms(), Chem.BondType.SINGLE)
    out = combo.GetMol()
    Chem.SanitizeMol(out)
    return Chem.MolToSmiles(out)


def ring_sites(smi: str) -> list[int]:
    m = mol(smi)
    ring = benzene_ring(m)
    return [i for i in ring if m.GetAtomWithIdx(i).GetTotalNumHs() > 0]


def relation(m: Chem.Mol, a: int, b: int) -> str:
    d = int(Chem.GetDistanceMatrix(m)[a][b])
    return {1: "ortho", 2: "meta", 3: "para"}[d]


def favoured(klass: str, rel: str) -> bool:
    return rel in ("ortho", "para") if DIRECTS[klass] == "op" else rel == "meta"


def major_sites(smi: str) -> list[int]:
    m = mol(smi)
    subs = substituents(smi)
    sites = ring_sites(smi)
    if not subs:
        return sites
    best = min(TIER[k] for _, _, k in subs)
    leaders = [(r, k) for r, _, k in subs if TIER[k] == best]
    picked = [s for s in sites if all(favoured(k, relation(m, r, s)) for r, k in leaders)]
    for s in picked:
        flank = sum(1 for r, _, _ in subs if relation(m, r, s) == "ortho")
        if flank >= 2:
            fail(f"{smi}: a major site sits between two groups; the model refuses to rule on sterics")
    if not picked:
        fail(f"{smi}: the leading groups disagree on every site")
    return picked


def products_at(smi: str, sites: list[int], e: str) -> list[str]:
    return sorted({attach(smi, s, E_FRAG[e]) for s in sites})


def eas_major(smi: str, e: str) -> list[str]:
    return products_at(smi, major_sites(smi), e)


def eas_all(smi: str, e: str) -> list[str]:
    return products_at(smi, ring_sites(smi), e)


def distinct_sites(smi: str) -> int:
    m = mol(smi)
    ranks = list(Chem.CanonicalRankAtoms(m, breakTies=False))
    return len({ranks[i] for i in ring_sites(smi)})


def eas_fails(smi: str) -> bool:
    """Friedel-Crafts convention: a ring carrying a withdrawer does not react."""
    return any(k == "withdrawer" for _, _, k in substituents(smi))


# ---------------------------------------------------------------------------
# Rule 3: the sigma complex, walked
# ---------------------------------------------------------------------------

def sigma_forms(smi: str, attack: int, e: str = "Br") -> dict:
    """Every contributor of the sigma complex for attack at `attack`."""
    m = Chem.RWMol(mol(smi))
    Chem.Kekulize(m, clearAromaticFlags=True)
    ring = set(benzene_ring(mol(smi)))
    a = m.GetAtomWithIdx(attack)
    dbl = [b for b in a.GetBonds() if b.GetBondType() == Chem.BondType.DOUBLE and b.GetOtherAtomIdx(attack) in ring]
    if len(dbl) != 1:
        raise ValueError(f"{smi}: attacked atom {attack} has no ring double bond in the Kekule form")
    start = dbl[0].GetOtherAtomIdx(attack)
    dbl[0].SetBondType(Chem.BondType.SINGLE)
    ei = m.AddAtom(Chem.Atom(35 if e == "Br" else 17))
    m.AddBond(attack, ei, Chem.BondType.SINGLE)
    m.GetAtomWithIdx(start).SetFormalCharge(1)
    for i in (attack, start):
        m.GetAtomWithIdx(i).SetNoImplicit(False)
        m.GetAtomWithIdx(i).SetNumExplicitHs(0)
    base = m.GetMol()
    Chem.SanitizeMol(base)

    # One form per + position: in a cyclohexadienyl cation the position fixes the
    # whole form. (Keying on SMILES would merge mirror-image forms of benzene's.)
    forms: list[dict] = []
    seen: set[int] = set()
    todo = [(Chem.RWMol(base), start)]
    while todo:
        cur, plus = todo.pop()
        if plus in seen:
            continue
        seen.add(plus)
        forms.append({"smiles": Chem.MolToSmiles(cur), "plus": plus, "on": "C"})
        p = cur.GetAtomWithIdx(plus)
        for b in p.GetBonds():
            n = b.GetOtherAtomIdx(plus)
            if n not in ring or b.GetBondType() != Chem.BondType.SINGLE:
                continue
            for b2 in cur.GetAtomWithIdx(n).GetBonds():
                k = b2.GetOtherAtomIdx(n)
                if k in ring and k != plus and b2.GetBondType() == Chem.BondType.DOUBLE:
                    nxt = Chem.RWMol(cur)
                    nxt.GetBondBetweenAtoms(plus, n).SetBondType(Chem.BondType.DOUBLE)
                    nxt.GetBondBetweenAtoms(n, k).SetBondType(Chem.BondType.SINGLE)
                    nxt.GetAtomWithIdx(plus).SetFormalCharge(0)
                    nxt.GetAtomWithIdx(k).SetFormalCharge(1)
                    Chem.SanitizeMol(nxt)
                    todo.append((nxt, k))
    carbon_forms = list(forms)
    extra = []
    bad = []
    plus_atoms = sorted({f["plus"] for f in carbon_forms})
    sm = mol(smi)
    for p in plus_atoms:
        for n in sm.GetAtomWithIdx(p).GetNeighbors():
            if n.GetIdx() in ring:
                continue
            klass = classify_x(sm, n)
            if klass in ("donor", "halogen"):
                extra.append({"plus": n.GetIdx(), "on": n.GetSymbol(), "from": p})
            elif klass == "withdrawer":
                bad.append(p)
    # Every lone pair form must be a valid molecule: build it and sanitise.
    for x in extra:
        # the carbon form whose + sits on x["from"], rebuilt by the same walk
        fm = _form_with_plus(base, start, ring, x["from"])
        fm.GetBondBetweenAtoms(x["from"], x["plus"]).SetBondType(Chem.BondType.DOUBLE)
        fm.GetAtomWithIdx(x["from"]).SetFormalCharge(0)
        fm.GetAtomWithIdx(x["plus"]).SetFormalCharge(1)
        Chem.SanitizeMol(fm)
        x["smiles"] = Chem.MolToSmiles(fm)
    return {
        "base": Chem.MolToSmiles(base),
        "attack": attack,
        "plus_carbons": plus_atoms,
        "carbon_forms": len(carbon_forms),
        "extra_forms": extra,
        "bad_forms": bad,
        "total": len(carbon_forms) + len(extra),
    }


def _form_with_plus(base: Chem.Mol, start: int, ring: set[int], target: int) -> Chem.RWMol:
    todo = [(Chem.RWMol(base), start)]
    seen = set()
    while todo:
        cur, plus = todo.pop()
        if plus == target:
            return cur
        if plus in seen:
            continue
        seen.add(plus)
        for b in cur.GetAtomWithIdx(plus).GetBonds():
            n = b.GetOtherAtomIdx(plus)
            if n not in ring or b.GetBondType() != Chem.BondType.SINGLE:
                continue
            for b2 in cur.GetAtomWithIdx(n).GetBonds():
                k = b2.GetOtherAtomIdx(n)
                if k in ring and k != plus and b2.GetBondType() == Chem.BondType.DOUBLE:
                    nxt = Chem.RWMol(cur)
                    nxt.GetBondBetweenAtoms(plus, n).SetBondType(Chem.BondType.DOUBLE)
                    nxt.GetBondBetweenAtoms(n, k).SetBondType(Chem.BondType.SINGLE)
                    nxt.GetAtomWithIdx(plus).SetFormalCharge(0)
                    nxt.GetAtomWithIdx(k).SetFormalCharge(1)
                    Chem.SanitizeMol(nxt)
                    todo.append((nxt, k))
    raise ValueError(f"no form puts the + on atom {target}")


def site_of(smi: str, rel: str) -> int:
    """The lowest-index ring C-H at this relation to the one substituent (benzene: any C-H)."""
    m = mol(smi)
    subs = substituents(smi)
    if not subs:
        return ring_sites(smi)[0]
    r = subs[0][0]
    hits = [s for s in ring_sites(smi) if relation(m, r, s) == rel]
    return hits[0]


def sigma_at(smi: str, rel: str) -> dict:
    return sigma_forms(smi, site_of(smi, rel))


# ---------------------------------------------------------------------------
# Rule 4: reactions as graph edits
# ---------------------------------------------------------------------------

def run_all(smi: str, smarts: str) -> str:
    rxn = AllChem.ReactionFromSmarts(smarts)
    cur = mol(smi)
    for _ in range(6):
        outs = rxn.RunReactants((cur,))
        if not outs:
            break
        nxt = outs[0][0]
        Chem.SanitizeMol(nxt)
        cur = mol(Chem.MolToSmiles(nxt))
    return Chem.MolToSmiles(cur)


def reduce_nitro(smi: str) -> str:
    return run_all(smi, "[c:1][N+:2](=O)[O-]>>[c:1][N+0:2]")


def desulfonate(smi: str) -> str:
    return run_all(smi, "[c:1]S(=O)(=O)[OX2H1]>>[c:1]")


def aldehyde_or_ketone_to_ch2(smi: str) -> str:
    out = run_all(smi, "[c:1][CX3:2](=[O])[#6:3]>>[c:1][CH2:2][#6:3]")
    return run_all(out, "[c:1][CX3H1:2]=[O]>>[c:1][CH3:2]")


def benzylic_carbons(smi: str) -> list[int]:
    m = mol(smi)
    ring = benzene_ring(m)
    out = []
    for i in ring:
        for n in m.GetAtomWithIdx(i).GetNeighbors():
            if n.GetIdx() not in ring and n.GetSymbol() == "C" and n.GetHybridization() == Chem.HybridizationType.SP3 and n.GetTotalNumHs() > 0:
                out.append(n.GetIdx())
    return out


def benzylic_h_count(smi: str) -> int:
    m = mol(smi)
    return sum(m.GetAtomWithIdx(i).GetTotalNumHs() for i in benzylic_carbons(smi))


def benzylic_bromination(smi: str) -> str | None:
    sites = benzylic_carbons(smi)
    if not sites:
        return None
    return sorted({attach(smi, s, "Br") for s in sites})[0] if len(sites) == 1 else None


def benzylic_oxidation(smi: str) -> str:
    m = Chem.RWMol(mol(smi))
    ring = set(benzene_ring(m))
    cuts = []
    for i in ring:
        for n in m.GetAtomWithIdx(i).GetNeighbors():
            if n.GetIdx() not in ring and n.GetSymbol() == "C" and n.GetHybridization() == Chem.HybridizationType.SP3 and n.GetTotalNumHs() > 0:
                cuts.append((i, n.GetIdx()))
    drop: set[int] = set()
    for ring_atom, alpha in cuts:
        # everything reachable from alpha without passing back through the ring
        stack, seen = [alpha], {alpha}
        while stack:
            x = stack.pop()
            for nb in m.GetAtomWithIdx(x).GetNeighbors():
                j = nb.GetIdx()
                if j in ring or j in seen:
                    continue
                seen.add(j)
                stack.append(j)
        drop |= seen
    new_atoms = []
    for ring_atom, _ in cuts:
        c = m.AddAtom(Chem.Atom(6))
        o1 = m.AddAtom(Chem.Atom(8))
        o2 = m.AddAtom(Chem.Atom(8))
        m.AddBond(ring_atom, c, Chem.BondType.SINGLE)
        m.AddBond(c, o1, Chem.BondType.DOUBLE)
        m.AddBond(c, o2, Chem.BondType.SINGLE)
        new_atoms.append(c)
    for idx in sorted(drop, reverse=True):
        m.RemoveAtom(idx)
    out = m.GetMol()
    for a in out.GetAtoms():
        a.SetNoImplicit(False)
        a.SetNumExplicitHs(0)
    Chem.SanitizeMol(out)
    return Chem.MolToSmiles(out)


def birch(smi: str) -> str:
    """Rule 4, Birch: which para pair goes sp3 is decided by the one substituent's class."""
    m = mol(smi)
    ring = list(benzene_ring(m))
    subs = substituents(smi)
    if len(subs) > 1:
        raise ValueError("Birch is modelled for one group at most")
    D = Chem.GetDistanceMatrix(m)
    if subs:
        r, _, klass = subs[0]
        if klass == "withdrawer":
            pair = (r, [i for i in ring if int(D[r][i]) == 3][0])
        else:
            o = sorted(i for i in ring if int(D[r][i]) == 1)[0]
            pair = (o, [i for i in ring if int(D[o][i]) == 3][0])
    else:
        pair = (ring[0], [i for i in ring if int(D[ring[0]][i]) == 3][0])
    rw = Chem.RWMol(m)
    Chem.Kekulize(rw, clearAromaticFlags=True)
    for i in ring:
        for b in rw.GetAtomWithIdx(i).GetBonds():
            if b.GetOtherAtomIdx(i) in ring:
                b.SetBondType(Chem.BondType.SINGLE)
    rest = [i for i in ring if i not in pair]
    # the four remaining carbons form two C=C bonds: pair them along the ring
    done = set()
    for i in rest:
        if i in done:
            continue
        for b in rw.GetAtomWithIdx(i).GetBonds():
            j = b.GetOtherAtomIdx(i)
            if j in rest and j not in done:
                b.SetBondType(Chem.BondType.DOUBLE)
                done |= {i, j}
                break
    for a in rw.GetAtoms():
        a.SetIsAromatic(False)
        a.SetNoImplicit(False)
        a.SetNumExplicitHs(0)
    for b in rw.GetBonds():
        b.SetIsAromatic(False)
    out = rw.GetMol()
    Chem.SanitizeMol(out)
    return Chem.MolToSmiles(out)


def degree(m: Chem.Mol, i: int) -> int:
    return sum(1 for n in m.GetAtomWithIdx(i).GetNeighbors() if n.GetSymbol() == "C")


def fc_cation_carbon(rcl: str) -> tuple[str, int, str]:
    """The alkyl part of R-Cl with the cation carbon after at most one 1,2 shift.

    Returns (alkyl SMILES with the cation carbon as atom 0, the shift made, the
    degree word). The alkyl is rebuilt as a fragment rooted on the cation carbon.
    """
    m = Chem.RWMol(mol(rcl))
    cl = [a.GetIdx() for a in m.GetAtoms() if a.GetSymbol() == "Cl"]
    if len(cl) != 1:
        raise ValueError(rcl)
    c0 = m.GetAtomWithIdx(cl[0]).GetNeighbors()[0].GetIdx()
    m.RemoveAtom(cl[0])
    alkyl = m.GetMol()
    Chem.SanitizeMol(alkyl)
    c0 = c0 if c0 < cl[0] else c0 - 1
    d0 = degree(alkyl, c0)
    best = (d0, c0, "none")
    for n in alkyl.GetAtomWithIdx(c0).GetNeighbors():
        j = n.GetIdx()
        if n.GetTotalNumHs() > 0:
            d = degree(alkyl, j)
            if d > best[0]:
                best = (d, j, "hydride")
    if best[2] == "none":
        for n in alkyl.GetAtomWithIdx(c0).GetNeighbors():
            j = n.GetIdx()
            methyls = [k for k in n.GetNeighbors() if k.GetIdx() != c0 and k.GetSymbol() == "C" and degree(alkyl, k.GetIdx()) == 1]
            if methyls:
                # after one methyl moves from j to c0, j has lost one carbon neighbour
                d = degree(alkyl, j) - 1
                if d > d0:
                    rw = Chem.RWMol(alkyl)
                    mi = methyls[0].GetIdx()
                    rw.RemoveBond(j, mi)
                    rw.AddBond(c0, mi, Chem.BondType.SINGLE)
                    for a in rw.GetAtoms():
                        a.SetNoImplicit(False)
                        a.SetNumExplicitHs(0)
                    shifted = rw.GetMol()
                    Chem.SanitizeMol(shifted)
                    return (Chem.MolToSmiles(shifted, rootedAtAtom=j), "methyl", DEG_WORD[degree(shifted, j)])
    return (Chem.MolToSmiles(alkyl, rootedAtAtom=best[1]), best[2], DEG_WORD[best[0]])


DEG_WORD = {1: "primary", 2: "secondary", 3: "tertiary"}


def fc_alkylation(arene: str, rcl: str, rearrange: bool = True) -> str:
    if rearrange:
        frag, _, _ = fc_cation_carbon(rcl)
    else:
        m = Chem.RWMol(mol(rcl))
        cl = [a.GetIdx() for a in m.GetAtoms() if a.GetSymbol() == "Cl"][0]
        c0 = m.GetAtomWithIdx(cl).GetNeighbors()[0].GetIdx()
        m.RemoveAtom(cl)
        al = m.GetMol()
        Chem.SanitizeMol(al)
        frag = Chem.MolToSmiles(al, rootedAtAtom=c0 if c0 < cl else c0 - 1)
    return attach(arene, ring_sites(arene)[0], frag)


# ---------------------------------------------------------------------------
# Names: OPSIN must read each one back as the drawn structure
# ---------------------------------------------------------------------------

NAME_CHECKS: list[tuple[str, str, str]] = []
OPSIN_DIR = Path(tempfile.mkdtemp(prefix="u3_opsin_"))


def run_opsin(names: list[str]) -> list[str]:
    """py2opsin writes a temp file in the working directory, so run it in a private one."""
    from py2opsin import py2opsin

    here = os.getcwd()
    os.chdir(OPSIN_DIR)
    try:
        got = py2opsin(names)
    finally:
        os.chdir(here)
    return list(got) if isinstance(got, list) else [got]


def check_name(smi: str, name: str, where: str) -> None:
    NAME_CHECKS.append((smi, name, where))


def check_names() -> None:
    if not NAME_CHECKS or COLLECT:
        return
    parsed = run_opsin([n for _, n, _ in NAME_CHECKS])
    for (smi, name, where), got in zip(NAME_CHECKS, parsed):
        if not got or canon(got) != canon(smi):
            fail(f"{where}: OPSIN reads '{name}' as {got or 'nothing'}, the drawing is {canon(smi)}")


# ---------------------------------------------------------------------------
# Figures (Unit 1's format: bonds, labels, rings, 120 x 84), as in u2_pools.py
# ---------------------------------------------------------------------------

W, H_FIG = 120, 84


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
        # an anchored label runs one way from x: about 0.6 em per visible character
        width = 0.6 * lab.get("size", 15) * len(lab["t"].replace("_", ""))
        if lab.get("anchor") == "start" and lab["x"] + width > W:
            fail(f"figure {what}: label {lab['t']} runs off the right edge")
        if lab.get("anchor") == "end" and lab["x"] - width < 0:
            fail(f"figure {what}: label {lab['t']} runs off the left edge")
    for r in fig.get("rings", []):
        if r["x"] - r["r"] < 0 or r["x"] + r["r"] > W or r["y"] - r["r"] < 0 or r["y"] + r["r"] > H_FIG:
            fail(f"figure {what}: marker ring outside the viewBox")


def figure(smi: str, marks: list[int] | None = None, h_on: list[int] | None = None) -> dict:
    """
    A skeletal drawing in Unit 1's format. Off-ring heteroatoms are condensed
    with their H count (OH, NH_2); charges sit beside their atom; `marks`
    circles atoms; `h_on` draws one explicit H on each listed carbon (the
    sigma complex's sp3 C-H is the point of an arenium question).
    """
    base = Chem.Mol(mol(smi))
    Chem.Kekulize(base, clearAromaticFlags=True)
    m = base
    rdDepictor.Compute2DCoords(m)
    conf = m.GetConformer()
    pts = [(conf.GetAtomPosition(i).x, -conf.GetAtomPosition(i).y) for i in range(m.GetNumAtoms())]
    marks = marks or []

    xs = [p[0] for p in pts]
    ys = [p[1] for p in pts]
    span_x = max(xs) - min(xs) or 1.0
    span_y = max(ys) - min(ys) or 1.0
    lengths = [math.dist(pts[b.GetBeginAtomIdx()], pts[b.GetEndAtomIdx()]) for b in m.GetBonds()]
    unit = sum(lengths) / len(lengths)
    scale = min(20.0 / unit, 84.0 / span_x, 50.0 / span_y)
    cx = (max(xs) + min(xs)) / 2
    cy = (max(ys) + min(ys)) / 2

    def at(i: int) -> tuple[float, float]:
        return (W / 2 + (pts[i][0] - cx) * scale, H_FIG / 2 + 2 + (pts[i][1] - cy) * scale)

    # NO2 and SO3H are written condensed, as a textbook does: their oxygens are
    # not drawn and one label stands for the group.
    hidden: set[int] = set()
    condensed: dict[int, tuple[str, str]] = {}
    for a in m.GetAtoms():
        nh2 = [n.GetIdx() for n in a.GetNeighbors() if n.GetSymbol() == "N" and n.GetDegree() == 1]
        if a.GetSymbol() == "N" and a.GetDegree() == 2 and len(nh2) == 1 and not a.IsInRing():
            # a hydrazone's =N-NH2 is written NNH2, so no N-N stub sits between two labels
            condensed[a.GetIdx()] = ("NNH_2", "H_2NN")
            hidden |= set(nh2)
            continue
        oxy = [n.GetIdx() for n in a.GetNeighbors() if n.GetSymbol() == "O"]
        if a.GetDegree() != len(oxy) + 1:
            continue  # only a group hanging off something else is condensed
        if a.GetSymbol() == "N" and a.GetFormalCharge() == 1 and len(oxy) == 2 and not a.IsInRing():
            condensed[a.GetIdx()] = ("NO_2", "O_2N")
            hidden |= set(oxy)
        elif a.GetSymbol() == "S" and len(oxy) == 3 and not a.IsInRing():
            condensed[a.GetIdx()] = ("SO_3H", "HO_3S")
            hidden |= set(oxy)

    labelled = {a.GetIdx() for a in m.GetAtoms() if a.GetSymbol() != "C"}
    bonds = []
    for b in m.GetBonds():
        i, j = b.GetBeginAtomIdx(), b.GetEndAtomIdx()
        if i in hidden or j in hidden:
            continue
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
            elif right == "NNH_2":
                # the bond must meet the first N, not the middle of the text
                labels.append({"x": r1(x - 4.5), "y": r1(y + 5), "t": right, "size": 13, "anchor": "start"})
            else:
                labels.append({"x": r1(x), "y": r1(y + 5), "t": right, "size": 13})
            continue
        theta = gap_angle(i)
        if i in labelled:
            x, y = at(i)
            hs = a.GetTotalNumHs()
            t = sym + ("H" if hs else "") + (f"_{hs}" if hs > 1 else "")
            labels.append({"x": r1(x), "y": r1(y + 5), "t": t, "size": 13})
        mark = "+" if a.GetFormalCharge() > 0 else MINUS if a.GetFormalCharge() < 0 else None
        if mark is not None:
            if sym == "C":
                x, y = out(i, 8, theta)
            else:
                x, y = at(i)
                x += 9 if len(labels[-1]["t"]) == 1 else 13
                y -= 6
            labels.append({"x": r1(x), "y": r1(y + 4.5), "t": mark, "size": 13})
    rings = []
    for i in marks:
        x, y = at(i)
        rings.append({"x": r1(x), "y": r1(y), "r": 7})
    for i in h_on or []:
        th = gap_angle(i)
        # Two groups on an sp3 ring carbon: the H goes on the other side of the gap from the E.
        x1, y1 = out(i, 3, th + 0.9)
        x2, y2 = out(i, 10, th + 0.9)
        hx, hy = out(i, 15, th + 0.9)
        bonds.append({"x1": r1(x1), "y1": r1(y1), "x2": r1(x2), "y2": r1(y2)})
        labels.append({"x": r1(hx), "y": r1(hy + 4), "t": "H", "size": 11})

    fig: dict = {"bonds": bonds}
    if labels:
        fig["labels"] = labels
    if rings:
        fig["rings"] = rings
    check_bounds(fig, smi)
    return fig


# ---------------------------------------------------------------------------
# Entries
# ---------------------------------------------------------------------------

POOLS: dict[str, list[dict]] = {}
VISUALS: dict[str, dict] = {}
TILES: dict[str, dict] = {}
SORT_FIGURES: dict[str, dict] = {}
IDS: set[str] = set()
CORRECT_INDEX: list[int] = []
CONVENTIONS: dict[str, str] = {}

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


def named(smi: str, name: str, caption: str | None = None, check: bool = True, **kw) -> dict:
    if check:
        check_name(smi, name, caption or name)
    return {"figure": figure(smi, **kw), "name": caption or name}


def structure(smi: str, name: str, caption: str | None = None, check: bool = True, **kw) -> dict:
    return {"kind": "structure", **named(smi, name, caption, check, **kw)}


def pair(a: dict, b: dict) -> dict:
    return {"kind": "pair", "a": a, "b": b}


def prov(what: str, section: str, convention: str | None = None) -> str:
    tail = f" Rests on an authored convention: {convention}." if convention else ""
    return f"{SCRIPT}: {what}. {os16(section)}.{tail}"


def mcq(node: str, id: str, prompt: str, options: list[tuple[str, str, str]], derived: str | None,
        correct: str, explanation: str, provenance: str, visual: dict, tiles: dict | None = None,
        brief: str | None = None, level: int = 1, concepts: tuple[str, ...] = ("ewg_edg_rubric",),
        convention: str | None = None) -> None:
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
    # Specs are written right answer first; rotate by a stable hash of the id so
    # the key lands in every slot across the unit, the same order on every run.
    turn = sum(map(ord, id)) % len(options)
    options = options[turn:] + options[:turn]
    if derived is None:
        fail(f"{id}: the script could not derive an answer")
    elif derived != correct:
        fail(f"{id}: authored answer {correct}, derived answer {derived}")
    if id in IDS:
        fail(f"duplicate id {id}")
    if not id.startswith("u3-"):
        fail(f"{id}: ids start u3-")
    IDS.add(id)
    ids = [o for o, _, _ in options]
    if len(set(ids)) != len(ids):
        fail(f"{id}: two options share an id")
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
    VISUALS[id] = visual
    if tiles is not None:
        if set(tiles) != set(ids):
            fail(f"{id}: tiles {sorted(tiles)} do not match options")
        TILES[id] = tiles
    if convention:
        CONVENTIONS[id] = convention


def ladder(node: str, id: str, cards: list[tuple[str, str, str, str, str]], key, prompt: str, brief: str,
           criterion: str, track: tuple[str, str], problem_prompt: str, solution: tuple[str, str, str],
           distractors: list[tuple[str, list[str], str, tuple[str, str, str]]], explanation: str,
           provenance: str, concepts: tuple[str, ...], topic: str, difficulty: int = 1100) -> None:
    """
    One sort ladder. cards: (card id, label, SMILES, OPSIN name, why), authored
    first-to-last. `key(smiles)` gives each card's derived rank value; the
    authored order must be strictly increasing in it, else the run is refused.
    """
    if id in IDS:
        fail(f"duplicate id {id}")
    IDS.add(id)
    ranks = [key(c[2]) for c in cards]
    if ranks != sorted(ranks) or len(set(ranks)) != len(ranks):
        fail(f"{id}: ladder order is not derivable: {list(zip([c[0] for c in cards], ranks))}")
    order = [c[0] for c in cards]
    for did, dorder, _, _ in distractors:
        if sorted(dorder) != sorted(order):
            fail(f"{id}: distractor {did} is not a permutation")
        if dorder == order:
            fail(f"{id}: distractor {did} is the right answer")
    for cid, label, _, _, why in cards:
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
        "problemId": "u3-pool-" + id,
        "topic": topic,
        "difficulty": difficulty,
        "problemPrompt": problem_prompt,
        "criterionText": track[0].lower(),
        "items": [{"id": c[0], "text": c[1]} for c in cards],
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
            "notes": {c[0]: c[4] for c in cards},
        },
        "trackEnds": {"first": track[0], "last": track[1]},
        "meanings": [
            {"id": did, "cause": "order_fully_reversed" if cause == "ordering_is_reversed" else "order_adjacent_pair_swapped"}
            for did, _, cause, _ in distractors
        ],
        "explanation": explanation,
        "provenance": provenance,
    })
    SORT_FIGURES[id] = {c[0]: named(c[2], c[3], c[1]) for c in cards}


def match(node: str, id: str, prompt: str, brief: str, pairs: list[tuple[str, str, str, str, str | None]],
          explanation: str, provenance: str, concepts: tuple[str, ...]) -> None:
    """
    One match board. pairs: (pair id, left card, right card, why, derived
    right card). The authored right card must equal the derived one.
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


def key_in(options: dict[str, str], wanted: list[str]) -> str | None:
    """The one option whose structure is in the derived set; None if zero or two match."""
    want = {canon(s) for s in wanted}
    hits = [o for o, smi in options.items() if canon(smi) in want]
    return hits[0] if len(hits) == 1 else None


def key_out(options: dict[str, str], wanted: list[str]) -> str | None:
    """The one option whose structure is NOT in the derived set."""
    want = {canon(s) for s in wanted}
    hits = [o for o, smi in options.items() if canon(smi) not in want]
    return hits[0] if len(hits) == 1 else None


def key_eq(options: dict[str, str], target: str | None) -> str | None:
    if target is None:
        return None
    return key_in(options, [target])


def tiles_of(options: dict[str, tuple[str, str]]) -> dict:
    """options: id -> (SMILES, OPSIN name). Every tile is drawn and its name checked."""
    return {o: named(smi, name) for o, (smi, name) in options.items()}


CLASS_TEXT = {
    "donor": "o/p director, activating",
    "alkyl": "o/p director, activating",
    "halogen": "o/p director, deactivating",
    "withdrawer": "meta director, deactivating",
}


# ---------------------------------------------------------------------------
# Compounds used across nodes. (SMILES, OPSIN-checkable name)
# ---------------------------------------------------------------------------

C = {
    "benzene": ("c1ccccc1", "benzene"),
    "toluene": ("Cc1ccccc1", "toluene"),
    "anisole": ("COc1ccccc1", "anisole"),
    "phenol": ("Oc1ccccc1", "phenol"),
    "aniline": ("Nc1ccccc1", "aniline"),
    "acetanilide": ("CC(=O)Nc1ccccc1", "N-phenylacetamide"),
    "ethylbenzene": ("CCc1ccccc1", "ethylbenzene"),
    "cumene": ("CC(C)c1ccccc1", "isopropylbenzene"),
    "tbubenzene": ("CC(C)(C)c1ccccc1", "tert-butylbenzene"),
    "propylbenzene": ("CCCc1ccccc1", "propylbenzene"),
    "butylbenzene": ("CCCCc1ccccc1", "butylbenzene"),
    "chlorobenzene": ("Clc1ccccc1", "chlorobenzene"),
    "bromobenzene": ("Brc1ccccc1", "bromobenzene"),
    "nitrobenzene": ("O=[N+]([O-])c1ccccc1", "nitrobenzene"),
    "benzaldehyde": ("O=Cc1ccccc1", "benzaldehyde"),
    "benzonitrile": ("N#Cc1ccccc1", "benzonitrile"),
    "benzoic": ("O=C(O)c1ccccc1", "benzoic acid"),
    "acetophenone": ("CC(=O)c1ccccc1", "acetophenone"),
    "propiophenone": ("CCC(=O)c1ccccc1", "1-phenylpropan-1-one"),
    "butyrophenone": ("CCCC(=O)c1ccccc1", "1-phenylbutan-1-one"),
    "benzophenone": ("O=C(c1ccccc1)c1ccccc1", "benzophenone"),
    "mebenzoate": ("COC(=O)c1ccccc1", "methyl benzoate"),
    "cf3benzene": ("FC(F)(F)c1ccccc1", "(trifluoromethyl)benzene"),
    "bsa": ("O=S(=O)(O)c1ccccc1", "benzenesulfonic acid"),
    "pxylene": ("Cc1ccc(C)cc1", "1,4-dimethylbenzene"),
    "oxylene": ("Cc1ccccc1C", "1,2-dimethylbenzene"),
    "chlorotoluene2": ("Cc1ccccc1Cl", "1-chloro-2-methylbenzene"),
    "pnitrotoluene": ("Cc1ccc([N+](=O)[O-])cc1", "1-methyl-4-nitrobenzene"),
    "tbutoluene": ("Cc1ccc(C(C)(C)C)cc1", "1-tert-butyl-4-methylbenzene"),
    "methylanisole": ("COc1ccc(C)cc1", "1-methoxy-4-methylbenzene"),
}


def S(key: str) -> str:
    return C[key][0]


def N(key: str) -> str:
    return C[key][1]


# ---------------------------------------------------------------------------
# u3-arenium: the sigma complex
# ---------------------------------------------------------------------------

def node_arenium() -> None:
    node = "u3-arenium"
    concepts = ("resonance_delocalisation",)
    sec = "16.1"
    bz = S("benzene")
    sig = sigma_at(bz, "ortho")
    m = mol(bz)
    rel_words = sorted({relation(m, sig["attack"], p) for p in sig["plus_carbons"]})
    derived = "op" if rel_words == ["ortho", "para"] else "m" if rel_words == ["meta"] else "self" if sig["attack"] in sig["plus_carbons"] else None
    # draw the sigma complex with the sp3 C-H shown
    base_m = mol(sig["base"])
    sp3 = [a.GetIdx() for a in base_m.GetAtoms() if a.IsInRing() and a.GetHybridization() == Chem.HybridizationType.SP3]
    vis = structure(sig["base"], "", "the sigma complex: Br added at the sp3 carbon", check=False, h_on=sp3)
    mcq(node, "u3-aren-meet-where", "Bromine adds to one ring carbon. Pick where the plus charge spreads.",
        [("op", "Ortho and para to the new C-Br carbon", "The + moves along the ring's C=C bonds, two carbons at a time, so it lands on the carbons ortho and para to the sp3 carbon. Three carbons share it."),
         ("m", "Meta to the new C-Br carbon", "Walk the + along a C=C: it jumps two atoms each time, from ortho to para to the other ortho. The meta carbons are never reached."),
         ("self", "On the carbon that took the bromine", "That carbon is now sp3 with four bonds (ring, ring, H, Br). It has no empty p orbital, so it cannot hold the +.")],
        derived, "op",
        "The arenium (sigma complex) cation spreads its + over three carbons: the two ortho to the sp3 carbon and the one para to it.",
        prov("sigma complex walk on benzene: + on " + ", ".join(rel_words) + " carbons", sec), vis,
        brief="Start the + beside the sp3 carbon, then push each C=C toward it.", level=0, concepts=concepts)

    derived = {3: "three", 2: "two", 4: "four"}.get(sig["total"])
    mcq(node, "u3-aren-count", "Count the resonance forms of benzene's sigma complex.",
        [("two", "2 forms", "The + moves twice along the ring, not once: ortho, then para, then the other ortho. That is three positions."),
         ("three", "3 forms", "The + sits on each of three carbons in turn (ortho, para, ortho to the sp3 carbon), so there are three forms."),
         ("six", "6 forms", "Only five carbons are still sp2, and the walk only ever reaches alternate ones. Six would need the + on every ring carbon, including the sp3 one.")],
        derived, "three",
        "Three forms: the + walks ortho, para, ortho around the five sp2 carbons. The sp3 carbon never carries it.",
        prov(f"sigma complex walk on benzene: {sig['total']} forms, each sanitised by RDKit", sec), vis, concepts=concepts)

    hyb = mol(sig["base"]).GetAtomWithIdx(sig["attack"]).GetHybridization()
    derived = {Chem.HybridizationType.SP3: "sp3", Chem.HybridizationType.SP2: "sp2"}.get(hyb)
    mcq(node, "u3-aren-sp3", "Pick the hybridisation of the ring carbon that just took the Br.",
        [("sp2", "sp2, still part of the ring's pi system", "It was sp2 before the attack. Its p orbital electrons went into the new C-Br bond, so it now has four sigma bonds."),
         ("sp3", "sp3, with an H and a Br on it", "Four sigma bonds (two ring carbons, H, Br) make it sp3. That is why the ring has stopped being aromatic for this step."),
         ("sp", "sp, like a carbon in a triple bond", "An sp carbon has two pi bonds. This carbon has none left after the attack.")],
        derived, "sp3",
        "The attacked carbon goes sp3. One sp3 carbon breaks the ring's loop of p orbitals, so the sigma complex is not aromatic.",
        prov("RDKit hybridisation of the attacked carbon in the sanitised sigma complex", sec), vis, concepts=concepts)

    k = Chem.Mol(mol(sig["base"]))
    Chem.Kekulize(k, clearAromaticFlags=True)
    dbl = sum(1 for b in k.GetBonds() if b.GetBondType() == Chem.BondType.DOUBLE and b.IsInRing())
    pi_e = 2 * dbl
    sp2_c = sum(1 for a in k.GetAtoms() if a.IsInRing() and a.GetHybridization() == Chem.HybridizationType.SP2)
    derived = "four-five" if (pi_e, sp2_c) == (4, 5) else None
    mcq(node, "u3-aren-pi", "Pick the pi electron count spread over the sigma complex's sp2 carbons.",
        [("six-six", "6 electrons over 6 carbons", "That is benzene before the attack. Two of the six pi electrons left to make the C-Br bond, and one carbon went sp3."),
         ("four-five", "4 electrons over 5 carbons", "Two C=C bonds remain, 4 electrons, spread over the five carbons that are still sp2. Five p orbitals, four electrons: a cation."),
         ("six-five", "6 electrons over 5 carbons", "Six electrons on five carbons would be an anion. The ring gave two electrons to the bromine, so it is short, not over.")],
        derived, "four-five",
        "Four pi electrons over five carbons: one electron short of neutral, which is the + of the sigma complex.",
        prov(f"Kekule sigma complex: {dbl} ring C=C, {sp2_c} sp2 ring carbons", sec), vis, concepts=concepts)

    # last step: lose H+ from the sp3 carbon
    prod_sub = canon("Brc1ccccc1")
    prod_add = canon("BrC1C=CC=CC1Br")
    derived = "sub" if is_aromatic(prod_sub) and not is_aromatic(prod_add) else None
    mcq(node, "u3-aren-rearom", "Pick the step that finishes the substitution.",
        [("sub", "Lose H+ from the sp3 carbon", "Losing that H+ puts its bond pair back into the ring: six pi electrons on six sp2 carbons, aromatic again. That is bromobenzene."),
         ("add", "Add Br- to a + carbon", "An alkene's cation does that. Here it would leave two sp3 ring carbons, a nonaromatic diene, and throw away the ring's stabilisation."),
         ("lose-br", "Lose Br+ from the sp3 carbon", "That just runs the first step backwards and gives benzene again. It happens, but it does not finish the substitution.")],
        derived, "sub",
        "A base takes the H+ off the sp3 carbon and the ring is aromatic again. Adding bromide instead would leave a nonaromatic diene.",
        prov("RDKit aromatic flags: bromobenzene aromatic, 5,6-dibromocyclohexa-1,3-diene not", sec), vis, concepts=concepts)

    vis2 = pair(named(prod_sub, "bromobenzene"), named(prod_add, "5,6-dibromocyclohexa-1,3-diene"))
    mcq(node, "u3-aren-which", "Compare the two possible products and pick the one benzene gives.",
        [("sub", "Bromobenzene, the substitution product", "Its ring is still aromatic: six sp2 carbons, six pi electrons. Keeping that is worth more than anything an addition offers."),
         ("add", "The dibromodiene, the addition product", "Two sp3 carbons break the ring's p orbital loop, so it is not aromatic. Alkenes add Br2; benzene does not."),
         ("both", "Both, in about equal amounts", "Only one of them keeps aromaticity. The addition product is not formed under Br2 and FeBr3.")],
        derived, "sub",
        "Substitution keeps the aromatic ring; addition would destroy it. That single difference is why EAS is substitution.",
        prov("RDKit aromatic flags on both products", sec), vis2, level=1, concepts=concepts)

    # toluene para attack: + reaches the carbon that carries CH3
    tol = S("toluene")
    sp = sigma_at(tol, "para")
    sm = sigma_at(tol, "meta")
    ring_c = substituents(tol)[0][0]
    derived = "para" if ring_c in sp["plus_carbons"] and ring_c not in sm["plus_carbons"] else None
    mcq(node, "u3-aren-tert", "Pick the attack on toluene that puts the + on the CH3-bearing carbon.",
        [("para", "Attack para to the CH3", "Para attack puts the + ortho, para, ortho to the new sp3 carbon, and the para one is the ring carbon holding CH3. That form is a tertiary cation."),
         ("meta", "Attack meta to the CH3", "From a meta sp3 carbon the + lands on the other three alternate carbons, and the CH3-bearing carbon is not one of them."),
         ("none", "No attack does that", "Ortho and para attack both reach it. The walk always skips one carbon, so check the distance from the sp3 carbon to the CH3 carbon.")],
        derived, "para",
        "Ortho or para attack lets one form put the + on the carbon carrying CH3, a tertiary cation. Meta attack never does, which is why CH3 directs ortho and para.",
        prov("sigma complex walk on toluene, para versus meta attack", sec),
        structure(tol, N("toluene"), "toluene", marks=[ring_c]), level=2, concepts=concepts)

    an = S("anisole")
    pa = sigma_at(an, "para")
    me = sigma_at(an, "meta")
    derived = {(4, 3): "4v3"}.get((pa["total"], me["total"]))
    mcq(node, "u3-aren-anisole", "Count the forms for para versus meta attack on anisole.",
        [("4v3", "Para 4 forms, meta 3 forms", "Para attack puts the + on the carbon holding OMe, and oxygen's lone pair adds a fourth form where every atom has an octet. Meta attack never reaches that carbon."),
         ("3v3", "Para 3 forms, meta 3 forms", "That counts only the carbon forms. The oxonium form, with O+ double bonded to the ring, only exists when the + reaches the OMe carbon."),
         ("3v4", "Para 3 forms, meta 4 forms", "The extra form needs the + beside the oxygen. From a meta sp3 carbon the + never lands on the OMe carbon.")],
        derived, "4v3",
        "Para (and ortho) attack on anisole gives a fourth form with O+ and full octets. Meta gets three. More forms, more stable cation, faster attack.",
        prov(f"sigma complex walk on anisole: para {pa['total']} forms, meta {me['total']}", sec),
        structure(an, N("anisole"), "anisole"), level=2, concepts=concepts)


# ---------------------------------------------------------------------------
# Halogenation, nitration, sulfonation, acylation: product questions
# ---------------------------------------------------------------------------

def product_tiles(start: str, e: str, names: dict[str, str]) -> tuple[dict[str, str], dict]:
    """ortho / meta / para products of `start` with electrophile e; names keyed by rel."""
    m = mol(start)
    r = substituents(start)[0][0]
    smis = {}
    for rel in ("ortho", "meta", "para"):
        s = [x for x in ring_sites(start) if relation(m, r, x) == rel][0]
        smis[rel] = attach(start, s, E_FRAG[e])
    tiles = {rel: named(smis[rel], names[rel]) for rel in names}
    return {rel: smis[rel] for rel in names}, tiles


def node_halo() -> None:
    node = "u3-halo"
    sec = "16.1"
    concepts = ("ewg_edg_rubric",)
    bz = S("benzene")
    prod = eas_major(bz, "Br")
    opts = {"sub": canon("Brc1ccccc1"), "add": canon("BrC1C=CC=CC1Br"), "cyc": canon("BrC1CCCCC1")}
    mcq(node, "u3-halo-meet", "Treat benzene with Br₂ and FeBr₃, then pick the product.",
        [("sub", "Bromobenzene", "One ring H is swapped for Br and the ring stays aromatic. That is substitution, and it is what FeBr3 makes possible."),
         ("add", "The dibromodiene", "That is Br2 adding across a C=C, the alkene reaction. Benzene would lose its aromaticity doing it, so it does not."),
         ("cyc", "Bromocyclohexane", "That needs the ring's three C=C bonds gone. Br2 and FeBr3 add no hydrogen; the ring keeps all of its pi bonds.")],
        key_in(opts, prod), "sub",
        "Benzene with Br2 and FeBr3 gives bromobenzene: one C-H becomes C-Br and the ring stays aromatic.",
        prov("Rule 2: Br on the one unique ring site of benzene", sec), structure(bz, "benzene", "benzene + Br₂, FeBr₃"),
        tiles={"sub": named(opts["sub"], "bromobenzene"), "add": named(opts["add"], "5,6-dibromocyclohexa-1,3-diene"),
               "cyc": named(opts["cyc"], "bromocyclohexane")}, level=0, concepts=concepts)

    prod = eas_major(bz, "Cl")
    opts = {"cl": canon("Clc1ccccc1"), "dicl": canon("Clc1ccccc1Cl"), "br": canon("Brc1ccccc1")}
    mcq(node, "u3-halo-cl", "Treat benzene with Cl₂ and FeCl₃, then pick the product.",
        [("cl", "Chlorobenzene", "Cl2 with its matching Lewis acid FeCl3 puts one Cl on the ring in place of one H."),
         ("dicl", "1,2-Dichlorobenzene", "Two Cl in one pass would need a second substitution. Chlorine deactivates the ring, so the first product reacts slower than benzene."),
         ("br", "Bromobenzene", "No bromine is in the flask. The halogen on the ring is the one in the X2, and the Lewis acid is matched to it.")],
        key_in(opts, prod), "cl",
        "Cl2 and FeCl3 give chlorobenzene. The Lewis acid carries the same halogen so it cannot scramble the product.",
        prov("Rule 2: Cl on benzene's unique site", sec), structure(bz, "benzene", "benzene + Cl₂, FeCl₃"),
        tiles={"cl": named(opts["cl"], "chlorobenzene"), "dicl": named(opts["dicl"], "1,2-dichlorobenzene"), "br": named(opts["br"], "bromobenzene")},
        concepts=concepts)

    tol = S("toluene")
    major = eas_major(tol, "Br")
    smis, tiles = product_tiles(tol, "Br", {"ortho": "1-bromo-2-methylbenzene", "meta": "1-bromo-3-methylbenzene", "para": "1-bromo-4-methylbenzene"})
    mcq(node, "u3-halo-tol-out", "Brominate toluene with Br₂ and FeBr₃. Pick the product that barely forms.",
        [("ortho", "The ortho product", "CH3 is an o/p director, so ortho attack is one of the two main routes: its sigma complex has a tertiary cation form."),
         ("meta", "The meta product", "Meta attack never puts the + on the CH3-bearing carbon, so it gets no help from the methyl. Very little forms."),
         ("para", "The para product", "Para is a main product: its sigma complex has a tertiary cation form beside the CH3.")],
        key_out(smis, major), "meta",
        "CH3 directs ortho and para. Both of those form; meta is the minor one.",
        prov("Rule 1: CH3 is alkyl, o/p. Rule 2 major sites ortho and para", sec), structure(tol, N("toluene"), "toluene + Br₂, FeBr₃"),
        tiles=tiles, concepts=concepts)

    nb = S("nitrobenzene")
    major = eas_major(nb, "Br")
    smis, tiles = product_tiles(nb, "Br", {"ortho": "1-bromo-2-nitrobenzene", "meta": "1-bromo-3-nitrobenzene", "para": "1-bromo-4-nitrobenzene"})
    mcq(node, "u3-halo-nitro", "Brominate nitrobenzene with Br₂ and FeBr₃, then pick the product.",
        [("ortho", "The ortho product", "Ortho attack puts one form's + right beside the N+ of the nitro group. Two positive centres next to each other: the worst cation, so it is avoided."),
         ("meta", "The meta product", "Meta attack is the only route whose + never sits beside the nitro group. NO2 is a meta director."),
         ("para", "The para product", "Para attack, like ortho, puts a + on the carbon bonded to N+. That form is badly destabilised.")],
        key_in(smis, major), "meta",
        "NO2 withdraws electrons and directs meta: only meta attack keeps the + away from the carbon bonded to N+.",
        prov("Rule 1: NO2 is a withdrawer (N+). Rule 2 major site meta", sec), structure(nb, N("nitrobenzene"), "nitrobenzene + Br₂, FeBr₃"),
        tiles=tiles, concepts=concepts)

    an = S("anisole")
    major = eas_major(an, "Cl")
    m = mol(an)
    r = substituents(an)[0][0]
    para = attach(an, [s for s in ring_sites(an) if relation(m, r, s) == "para"][0], "Cl")
    meta = attach(an, [s for s in ring_sites(an) if relation(m, r, s) == "meta"][0], "Cl")
    opts = {"para": para, "meta": meta, "ipso": canon("Clc1ccccc1")}
    mcq(node, "u3-halo-anisole", "Chlorinate anisole, then pick the product shown that forms.",
        [("para", "1-Chloro-4-methoxybenzene", "OMe is an o/p director, and para attack gets the oxygen's lone pair form. The ortho product forms too; it is not shown here."),
         ("meta", "1-Chloro-3-methoxybenzene", "Meta attack never puts the + next to the oxygen, so it misses the lone pair form. Very little forms."),
         ("ipso", "Chlorobenzene", "That swaps the whole OMe group for Cl. EAS replaces a ring H, not a substituent.")],
        key_in(opts, major), "para",
        "OMe is an o/p director: the para (and ortho) product forms. Meta is minor, and the OMe stays put.",
        prov("Rule 1: OMe is a donor, o/p. Rule 2 major sites ortho and para", sec), structure(an, N("anisole"), "anisole + Cl₂, FeCl₃"),
        tiles={"para": named(para, "1-chloro-4-methoxybenzene"), "meta": named(meta, "1-chloro-3-methoxybenzene"), "ipso": named(opts["ipso"], "chlorobenzene")},
        concepts=concepts)

    px = S("pxylene")
    n_px = len(eas_all(px, "Br"))
    derived = {1: "one", 2: "two", 3: "three"}.get(n_px)
    mcq(node, "u3-halo-pxylene", "Brominate 1,4-dimethylbenzene once. Pick how many products are possible.",
        [("one", "One product", "All four ring C-H are equivalent by symmetry: each sits ortho to one CH3 and meta to the other. Any of them gives the same compound."),
         ("two", "Two products", "Two would need two kinds of ring C-H. Turn the ring over: every C-H looks the same."),
         ("three", "Three products", "Toluene has three kinds of ring C-H (ortho, meta, para). The second CH3, para to the first, makes all four remaining positions equal.")],
        derived, "one",
        "1,4-Dimethylbenzene has one kind of ring C-H, so one monobromination product.",
        prov(f"RDKit symmetry classes of the ring C-H: {distinct_sites(px)}; distinct products: {n_px}", sec),
        structure(px, N("pxylene")), level=2, concepts=concepts)

    # Ring halogenation vs benzylic: the conditions decide
    bb = canon("BrCc1ccccc1")
    ring_p = eas_major(tol, "Br")
    opts = {"ring": attach(tol, [s for s in ring_sites(tol) if relation(mol(tol), substituents(tol)[0][0], s) == "para"][0], "Br"),
            "side": bb, "none": tol}
    mcq(node, "u3-halo-vs-nbs", "Toluene, Br₂ and FeBr₃ in the dark. Pick where Br goes.",
        [("ring", "On the ring, para (or ortho) to CH3", "FeBr3 makes an electrophile, and electrophiles attack the ring's pi electrons. CH3 sends it ortho and para."),
         ("side", "On the CH3, giving (bromomethyl)benzene", "That is the radical reaction, with NBS and light. FeBr3 in the dark gives no radicals, so the methyl is left alone."),
         ("none", "Nowhere, toluene does not react", "Toluene is more reactive than benzene, because CH3 activates the ring. It brominates readily.")],
        key_in(opts, ring_p), "ring",
        "With a Lewis acid the ring is attacked (EAS, o/p to CH3). The benzylic C-H needs radical conditions instead.",
        prov("Rule 2 on toluene with Br; benzylic product built by Rule 4 for the contrast", sec),
        structure(tol, N("toluene"), "toluene + Br₂, FeBr₃, dark"),
        tiles={"ring": named(opts["ring"], "1-bromo-4-methylbenzene"), "side": named(bb, "(bromomethyl)benzene"), "none": named(tol, "toluene")},
        concepts=concepts)


def node_nitration() -> None:
    node = "u3-nitration"
    sec = "16.2"
    concepts = ("ewg_edg_rubric",)
    bz = S("benzene")
    prod = eas_major(bz, "NO2")
    opts = {"nitro": canon(S("nitrobenzene")), "aniline": canon(S("aniline")), "phenol": canon(S("phenol"))}
    mcq(node, "u3-nit-meet", "Treat benzene with HNO₃ and H₂SO₄, then pick the product.",
        [("nitro", "Nitrobenzene", "One ring H is replaced by NO2. The nitronium ion NO2+ is the electrophile the acid mixture makes."),
         ("aniline", "Aniline", "Aniline has NH2, which needs a reduction after nitration. Nothing in this flask is a reducing agent."),
         ("phenol", "Phenol", "Nitric acid does not put an OH on the ring. The nitrogen ends up bonded to the ring carbon.")],
        key_in(opts, prod), "nitro",
        "Nitration puts NO2 on the ring: benzene gives nitrobenzene.",
        prov("Rule 2: NO2 on benzene's unique site", sec), structure(bz, "benzene", "benzene + HNO₃, H₂SO₄"),
        tiles={k: named(v, {"nitro": "nitrobenzene", "aniline": "aniline", "phenol": "phenol"}[k]) for k, v in opts.items()},
        level=0, concepts=concepts)

    # electrophile: formula and charge computed
    species = {"no2p": "O=[N+]=O", "no2m": "O=N[O-]", "hno3": "O=[N+]([O-])O", "no3m": "O=[N+]([O-])[O-]"}
    charge = {k: Chem.GetFormalCharge(mol(v)) for k, v in species.items()}
    formul = {k: formula(v) for k, v in species.items()}
    cation = [k for k, c in charge.items() if c == 1]
    derived = cation[0] if len(cation) == 1 else None
    mcq(node, "u3-nit-electrophile", "Pick the electrophile that attacks the ring in nitration.",
        [("no2p", "NO₂⁺, the nitronium ion", "Linear O=N+=O. It is positive and short of electrons at N, so the ring's pi electrons attack it. Sulfuric acid makes it from nitric acid."),
         ("no2m", "NO₂⁻, the nitrite ion", "Nitrite carries a negative charge. An anion is a nucleophile, and the ring needs something electron poor to attack."),
         ("hno3", "HNO₃ itself", "Nitric acid alone is too weak an electrophile for benzene. The sulfuric acid is there to turn it into NO2+."),
         ("no3m", "NO₃⁻, nitrate", "Nitrate is the anion left behind. It is a spectator, and negative, so it cannot be the electrophile.")],
        derived, "no2p",
        "The nitronium ion, NO2+, is the electrophile. It carries the + the ring's pi electrons need to attack.",
        prov("RDKit formal charges: " + ", ".join(f"{formul[k]} {charge[k]:+d}" for k in species) + "; NO2+ named as the electrophile by the pathway map's own blurb", sec),
        structure("O=[N+]=O", "nitronium", "nitronium ion, NO₂⁺", check=False), concepts=concepts)

    mb = S("mebenzoate")
    major = eas_major(mb, "NO2")
    smis, tiles = product_tiles(mb, "NO2", {"ortho": "methyl 2-nitrobenzoate", "meta": "methyl 3-nitrobenzoate", "para": "methyl 4-nitrobenzoate"})
    mcq(node, "u3-nit-ester", "Nitrate methyl benzoate, then pick the major product.",
        [("ortho", "Methyl 2-nitrobenzoate", "Ortho attack puts a + on the carbon bonded to the ester's C=O carbon, which is already electron poor. That form is avoided."),
         ("meta", "Methyl 3-nitrobenzoate", "The ester's C=O withdraws electrons and directs meta: only meta attack keeps the + off the carbon that carries it."),
         ("para", "Methyl 4-nitrobenzoate", "Para attack, like ortho, puts a + beside the electron-poor C=O carbon.")],
        key_in(smis, major), "meta",
        "The ester carbonyl is a withdrawer, so nitration goes meta: methyl 3-nitrobenzoate.",
        prov("Rule 1: CO2Me has C=O on X, a withdrawer. Rule 2 major site meta", sec),
        structure(mb, N("mebenzoate"), "methyl benzoate + HNO₃, H₂SO₄"), tiles=tiles, concepts=concepts)

    cb = S("chlorobenzene")
    major = eas_major(cb, "NO2")
    smis, tiles = product_tiles(cb, "NO2", {"ortho": "1-chloro-2-nitrobenzene", "meta": "1-chloro-3-nitrobenzene", "para": "1-chloro-4-nitrobenzene"})
    mcq(node, "u3-nit-chloro", "Nitrate chlorobenzene. Pick the product that barely forms.",
        [("ortho", "The ortho product", "Chlorine is an o/p director: its lone pair gives ortho and para attack an extra form, so ortho forms."),
         ("meta", "The meta product", "Meta attack never puts the + beside the Cl, so the lone pair cannot help. Little meta product forms."),
         ("para", "The para product", "Para is a main product: Cl's lone pair gives its sigma complex an extra form.")],
        key_out(smis, major), "meta",
        "Chlorine deactivates the ring but still directs ortho and para. Meta is the minor product.",
        prov("Rule 1: Cl is a halogen, o/p. Rule 2 major sites ortho and para", sec),
        structure(cb, N("chlorobenzene"), "chlorobenzene + HNO₃, H₂SO₄"), tiles=tiles, concepts=concepts)

    nb = S("nitrobenzene")
    major = eas_major(nb, "NO2")
    smis, tiles = product_tiles(nb, "NO2", {"ortho": "1,2-dinitrobenzene", "meta": "1,3-dinitrobenzene", "para": "1,4-dinitrobenzene"})
    mcq(node, "u3-nit-second", "Nitrate nitrobenzene a second time, then pick the product.",
        [("ortho", "1,2-Dinitrobenzene", "Ortho attack would put a + on the carbon bonded to the first N+. The first nitro group steers away from that."),
         ("meta", "1,3-Dinitrobenzene", "The first NO2 is a meta director, so the second NO2 goes meta to it."),
         ("para", "1,4-Dinitrobenzene", "Para attack also puts a + next to the N+. A nitro group directs meta, not para.")],
        key_in(smis, major), "meta",
        "The first nitro group directs the second one meta: 1,3-dinitrobenzene. It also slows the second nitration down.",
        prov("Rule 1: NO2 is a withdrawer. Rule 2 major site meta", sec),
        structure(nb, N("nitrobenzene"), "nitrobenzene + HNO₃, H₂SO₄, heat"), tiles=tiles, level=2, concepts=concepts)

    derived = "slower" if TIER[one_class(nb)] > TIER["none"] else None
    mcq(node, "u3-nit-stop", "Pick why benzene stops at one nitro group under mild conditions.",
        [("slower", "Nitrobenzene reacts slower than benzene", "The NO2 just added pulls electron density out of the ring, so a second attack is slower. The reaction stops after one."),
         ("faster", "Nitrobenzene reacts faster than benzene", "If the product were more reactive, it would be nitrated again and again. That is the alkylation problem, not this one."),
         ("used", "The acid is used up after one", "Nothing here says the acid runs out. The product ring is less reactive than benzene, and that is why it stops.")],
        derived, "slower",
        "A nitro group is a deactivator, so the mononitro product is less reactive than benzene and the reaction stops at one.",
        prov("Rule 1: NO2 is in the withdrawer tier, below plain benzene", sec),
        structure(nb, N("nitrobenzene")), concepts=concepts)

    tol = S("toluene")
    major = eas_major(tol, "NO2")
    smis, tiles = product_tiles(tol, "NO2", {"ortho": "1-methyl-2-nitrobenzene", "meta": "1-methyl-3-nitrobenzene", "para": "1-methyl-4-nitrobenzene"})
    smis.pop("ortho")
    tiles.pop("ortho")
    smis["benz"] = canon(S("nitrobenzene"))
    tiles["benz"] = named(smis["benz"], "nitrobenzene")
    mcq(node, "u3-nit-toluene", "Nitrate toluene, then pick the product shown that forms.",
        [("para", "1-Methyl-4-nitrobenzene", "CH3 is an o/p director. Para forms, and so does ortho, which is not shown."),
         ("meta", "1-Methyl-3-nitrobenzene", "Meta attack gets no tertiary cation form from the CH3. It is the minor product."),
         ("benz", "Nitrobenzene", "That would mean losing the CH3. EAS replaces a ring H; the methyl stays.")],
        key_in(smis, major), "para",
        "Toluene nitrates ortho and para to the CH3. The methyl group stays on the ring.",
        prov("Rule 1: CH3 alkyl, o/p. Rule 2 major sites ortho and para", sec),
        structure(tol, N("toluene"), "toluene + HNO₃, H₂SO₄"), tiles=tiles, concepts=concepts)


def node_sulfo() -> None:
    node = "u3-sulfo"
    sec = "16.2"
    concepts = ("ewg_edg_rubric",)
    bz = S("benzene")
    bsa = S("bsa")
    prod = eas_major(bz, "SO3H")
    opts = {"bsa": canon(bsa), "phenol": canon(S("phenol")), "thiophenol": canon("Sc1ccccc1")}
    mcq(node, "u3-sul-meet", "Treat benzene with fuming H₂SO₄ (SO₃), then pick the product.",
        [("bsa", "Benzenesulfonic acid", "The sulfur bonds to the ring carbon, giving Ar-SO3H. One ring H is replaced."),
         ("phenol", "Phenol", "No oxygen goes directly onto the ring here. The new bond is C-S, not C-O."),
         ("thiophenol", "Benzenethiol", "A thiol has S-H and no oxygens on sulfur. Sulfonation keeps all three oxygens on the sulfur.")],
        key_in(opts, prod), "bsa",
        "Sulfonation puts SO3H on the ring, through a new C-S bond: benzenesulfonic acid.",
        prov("Rule 2: SO3H on benzene's unique site", sec), structure(bz, "benzene", "benzene + SO₃, H₂SO₄"),
        tiles={"bsa": named(opts["bsa"], "benzenesulfonic acid"), "phenol": named(opts["phenol"], "phenol"), "thiophenol": named(opts["thiophenol"], "benzenethiol")},
        level=0, concepts=concepts)

    back = desulfonate(bsa)
    opts = {"bz": canon(bz), "phenol": canon(S("phenol")), "same": canon(bsa)}
    mcq(node, "u3-sul-reverse", "Heat benzenesulfonic acid in dilute aqueous acid. Pick the product.",
        [("bz", "Benzene, with its C-H back", "Sulfonation runs backwards in hot dilute acid: H+ goes back onto the ring and SO3 leaves. That reversibility is the whole point of the group."),
         ("phenol", "Phenol", "Water does not swap onto the ring here. The C-S bond breaks and the carbon gets an H back."),
         ("same", "No change", "The reaction is an equilibrium. Lots of water and heat push it back toward benzene and sulfuric acid.")],
        key_eq(opts, back), "bz",
        "Desulfonation: hot dilute acid takes the SO3H off and puts H back. Sulfonation is reversible.",
        prov("Rule 4 desulfonation SMARTS on benzenesulfonic acid", sec),
        structure(bsa, N("bsa"), "benzenesulfonic acid + H₃O⁺, heat"),
        tiles={"bz": named(opts["bz"], "benzene"), "phenol": named(opts["phenol"], "phenol"), "same": named(opts["same"], "benzenesulfonic acid")},
        concepts=concepts)

    derived = "meta" if one_class(bsa) == "withdrawer" else None
    mcq(node, "u3-sul-directs", "Pick where a second electrophile goes on benzenesulfonic acid.",
        [("op", "Ortho and para to the SO3H", "Ortho and para attack put a + on the carbon bonded to sulfur, which carries two S=O. That form is avoided."),
         ("meta", "Meta to the SO3H", "Sulfur has two S=O bonds and pulls electrons out of the ring. Like NO2, it directs meta."),
         ("any", "Anywhere, it has no effect", "SO3H is a strong withdrawer. It slows the ring down and steers the next group meta.")],
        derived, "meta",
        "SO3H is a meta director and a deactivator, the same class as NO2.",
        prov("Rule 1: S on X has double bonds to O, a withdrawer", sec), structure(bsa, N("bsa")), concepts=concepts)

    tol = S("toluene")
    ptsa = "Cc1ccc(S(=O)(=O)O)cc1"
    back = desulfonate(ptsa)
    opts = {"tol": canon(tol), "bz": canon(bz), "cresol": canon("Cc1ccc(O)cc1")}
    mcq(node, "u3-sul-ptsa", "Heat 4-methylbenzenesulfonic acid in dilute acid. Pick the product.",
        [("tol", "Toluene", "Only the C-S bond breaks; the CH3 is untouched. The ring carbon gets its H back."),
         ("bz", "Benzene", "Desulfonation removes only the SO3H group. The methyl is a C-C bond and survives."),
         ("cresol", "4-Methylphenol", "No OH ends up on the ring. The sulfonic acid leaves as SO3 and an H takes its place.")],
        key_eq(opts, back), "tol",
        "Hot dilute acid removes the SO3H and leaves toluene.",
        prov("Rule 4 desulfonation SMARTS", sec),
        structure(ptsa, "4-methylbenzenesulfonic acid", "4-methylbenzenesulfonic acid + H₃O⁺, heat"),
        tiles={"tol": named(opts["tol"], "toluene"), "bz": named(opts["bz"], "benzene"), "cresol": named(opts["cresol"], "4-methylphenol")},
        concepts=concepts)

    major = eas_major(tol, "SO3H")
    smis, tiles = product_tiles(tol, "SO3H", {"ortho": "2-methylbenzenesulfonic acid", "meta": "3-methylbenzenesulfonic acid", "para": "4-methylbenzenesulfonic acid"})
    mcq(node, "u3-sul-toluene", "Sulfonate toluene. Pick the product that barely forms.",
        [("ortho", "2-Methylbenzenesulfonic acid", "CH3 directs ortho and para, so ortho attack is a main route."),
         ("meta", "3-Methylbenzenesulfonic acid", "Meta attack gets no tertiary cation form from the CH3. It is the minor product."),
         ("para", "4-Methylbenzenesulfonic acid", "Para is a main product of an o/p director.")],
        key_out(smis, major), "meta",
        "CH3 directs ortho and para; the meta sulfonic acid is the minor product.",
        prov("Rule 1: CH3 alkyl, o/p. Rule 2", sec), structure(tol, N("toluene"), "toluene + SO₃, H₂SO₄"), tiles=tiles, concepts=concepts)

    f_before, f_after = formula(bz), formula(bsa)
    derived = "so3" if (f_before, f_after) == ("C6H6", "C6H6O3S") else None
    mcq(node, "u3-sul-formula", "Compare benzene with benzenesulfonic acid. Pick what the ring gained.",
        [("so3", "One SO₃ unit, no H lost overall", "C6H6 becomes C6H6O3S: the ring's H left, but the new group brings its own H on oxygen. Net, SO3 was added."),
         ("so4", "One H₂SO₄ unit", "Sulfuric acid is the solvent and acid. The formula only grows by S and three O."),
         ("so2", "One SO₂ unit", "Count the oxygens on sulfur: two S=O and one OH, three in all.")],
        derived, "so3",
        f"Benzene ({f_before}) becomes benzenesulfonic acid ({f_after}): SO3 added. That is why SO3 is called the electrophile.",
        prov(f"RDKit formulas {f_before} and {f_after}", sec), pair(named(bz, "benzene"), named(bsa, "benzenesulfonic acid")),
        level=2, concepts=concepts)


def node_fc_acyl() -> None:
    node = "u3-fc-acyl"
    sec = "16.3"
    concepts = ("ewg_edg_rubric",)
    bz = S("benzene")
    prod = eas_major(bz, "Ac")
    opts = {"ac": canon(S("acetophenone")), "et": canon(S("ethylbenzene")), "ester": canon("CC(=O)Oc1ccccc1")}
    mcq(node, "u3-acyl-meet", "Treat benzene with CH₃COCl and AlCl₃, then pick the product.",
        [("ac", "Acetophenone", "The acyl group CH3C=O bonds to the ring through its carbonyl carbon: an aryl ketone."),
         ("et", "Ethylbenzene", "That would need the C=O reduced afterwards. Acylation leaves the carbonyl in place."),
         ("ester", "Phenyl acetate", "That is an ester, with O between the ring and C=O. In acylation the ring carbon bonds straight to the carbonyl carbon.")],
        key_in(opts, prod), "ac",
        "Friedel-Crafts acylation of benzene with acetyl chloride gives acetophenone, an aryl ketone.",
        prov("Rule 2: acetyl on benzene's unique site", sec), structure(bz, "benzene", "benzene + CH₃COCl, AlCl₃"),
        tiles={"ac": named(opts["ac"], "acetophenone"), "et": named(opts["et"], "ethylbenzene"), "ester": named(opts["ester"], "phenyl acetate")},
        level=0, concepts=concepts)

    acylium = "CC#[O+]"
    ch = Chem.GetFormalCharge(mol(acylium))
    f = formula(acylium)
    derived = "acylium" if ch == 1 else None
    mcq(node, "u3-acyl-ion", "Pick the electrophile AlCl₃ makes from acetyl chloride.",
        [("acylium", "The acylium ion, CH₃C≡O⁺", "AlCl3 pulls the Cl off. The cation left is held by oxygen's lone pair as a C triple bond O+, so it does not rearrange."),
         ("carbanion", "An acetyl anion, CH₃C(=O)⁻", "A negative carbon would be a nucleophile. The ring is the nucleophile here; the acyl piece must be electron poor."),
         ("radical", "An acetyl radical", "No light or initiator is present. AlCl3 is a Lewis acid and makes a cation.")],
        derived, "acylium",
        f"The acylium ion ({f}, charge {ch:+d}) is the electrophile. Its resonance form with C triple bond O+ is why it never rearranges.",
        prov(f"RDKit formula {f} and formal charge {ch:+d} of the acylium ion", sec),
        structure(acylium, "acylium", "the acylium ion", check=False), concepts=concepts)

    acp = S("acetophenone")
    derived = "deact" if one_class(acp) == "withdrawer" else None
    mcq(node, "u3-acyl-once", "Pick why acylation stops after one acyl group goes on.",
        [("deact", "The ketone product is deactivated", "The new C=O pulls electron density from the ring, so acetophenone reacts slower than benzene. No second acylation."),
         ("steric", "There is no room for a second group", "Five ring C-H are still free. Room is not the issue; the ring has become electron poor."),
         ("act", "The product is activated, so it stops", "An activated product would react again, as in alkylation. The ketone does the opposite.")],
        derived, "deact",
        "The aryl ketone is a deactivated ring, so acylation stops at one. Alkylation has the opposite problem.",
        prov("Rule 1: the ketone's C=O on X makes it a withdrawer", sec), structure(acp, N("acetophenone")), concepts=concepts)

    rc = "CCC(=O)Cl"
    prod = eas_major(bz, "EtCO")
    alk = fc_alkylation(bz, "CCCCl")
    opts = {"acyl": canon(S("propiophenone")), "branched": canon("CC(C=O)c1ccccc1"), "alk": alk}
    if formula(opts["branched"]) != formula(opts["acyl"]):
        fail("u3-acyl-norearr: the branched distractor must be an isomer of the product")
    mcq(node, "u3-acyl-norearr", "Acylate benzene with propanoyl chloride and AlCl₃. Pick the product.",
        [("acyl", "1-Phenylpropan-1-one", "The acylium ion cannot rearrange, so the three-carbon chain arrives straight, attached through its C=O carbon."),
         ("branched", "2-Phenylpropanal", "Same atoms, but the ring sits on the middle carbon and the C=O at the end. Acylation bonds the ring to the C=O carbon itself."),
         ("alk", "Isopropylbenzene", "That is what an alkyl cation does after a shift. An acyl cation stays put, which is the reason to acylate.")],
        key_in(opts, prod), "acyl",
        "Acylation delivers the chain unrearranged: 1-phenylpropan-1-one.",
        prov("Rule 2: propanoyl on benzene; the isopropyl contrast built by Rule 4's one-shift cation model", sec),
        structure(bz, "benzene", "benzene + CH₃CH₂COCl, AlCl₃"),
        tiles={"acyl": named(opts["acyl"], "1-phenylpropan-1-one"), "branched": named(opts["branched"], "2-phenylpropanal"), "alk": named(alk, "isopropylbenzene")},
        concepts=("carbocation_rearrangement",))

    an = S("anisole")
    major = eas_major(an, "Ac")
    m = mol(an)
    r = substituents(an)[0][0]
    para = attach(an, [s for s in ring_sites(an) if relation(m, r, s) == "para"][0], "C(C)=O")
    meta = attach(an, [s for s in ring_sites(an) if relation(m, r, s) == "meta"][0], "C(C)=O")
    opts = {"para": para, "meta": meta, "acp": canon(S("acetophenone"))}
    mcq(node, "u3-acyl-anisole", "Acylate anisole with CH₃COCl and AlCl₃. Pick the product shown that forms.",
        [("para", "1-(4-Methoxyphenyl)ethan-1-one", "OMe directs ortho and para; para attack gets the oxygen lone pair form."),
         ("meta", "1-(3-Methoxyphenyl)ethan-1-one", "Meta attack never puts the + beside the oxygen, so it gets no help from the lone pair."),
         ("acp", "Acetophenone", "That would replace the OMe. EAS replaces a ring H and the OMe stays.")],
        key_in(opts, major), "para",
        "Anisole acylates ortho and para to OMe; para is shown here.",
        prov("Rule 1: OMe donor. Rule 2 major sites ortho and para", sec),
        structure(an, N("anisole"), "anisole + CH₃COCl, AlCl₃"),
        tiles={"para": named(para, "1-(4-methoxyphenyl)ethan-1-one"), "meta": named(meta, "1-(3-methoxyphenyl)ethan-1-one"), "acp": named(opts["acp"], "acetophenone")},
        concepts=concepts)

    nb = S("nitrobenzene")
    derived = "none" if eas_fails(nb) else None
    m = mol(nb)
    r = substituents(nb)[0][0]
    meta = attach(nb, [s for s in ring_sites(nb) if relation(m, r, s) == "meta"][0], "C(C)=O")
    para = attach(nb, [s for s in ring_sites(nb) if relation(m, r, s) == "para"][0], "C(C)=O")
    opts = {"meta": meta, "para": para, "none": canon(nb)}
    mcq(node, "u3-acyl-fails", "Try to acylate nitrobenzene with CH₃COCl and AlCl₃. Pick the outcome.",
        [("meta", "The meta ketone", "Meta is where a nitro group would steer an electrophile, but the ring is too electron poor to attack an acylium ion at all."),
         ("para", "The para ketone", "Nitro does not direct para, and in any case the ring is too deactivated for Friedel-Crafts."),
         ("none", "No reaction, nitrobenzene is recovered", "Friedel-Crafts reactions fail on strongly deactivated rings, so nitrobenzene comes back unchanged.")],
        derived, "none",
        "Friedel-Crafts acylation and alkylation fail on rings carrying a strong withdrawer such as NO2.",
        prov("Rule 1: NO2 withdrawer; Friedel-Crafts failure on a withdrawer ring", sec, "Friedel-Crafts fails on rings with a meta director"),
        structure(nb, N("nitrobenzene"), "nitrobenzene + CH₃COCl, AlCl₃"),
        tiles={"meta": named(meta, "1-(3-nitrophenyl)ethan-1-one"), "para": named(para, "1-(4-nitrophenyl)ethan-1-one"), "none": named(opts["none"], "nitrobenzene")},
        level=2, concepts=concepts, convention="Friedel-Crafts fails on a ring carrying a withdrawer (meta director)")

    tol = S("toluene")
    major = eas_major(tol, "PhCO")
    m = mol(tol)
    r = substituents(tol)[0][0]
    para = attach(tol, [s for s in ring_sites(tol) if relation(m, r, s) == "para"][0], E_FRAG["PhCO"])
    meta = attach(tol, [s for s in ring_sites(tol) if relation(m, r, s) == "meta"][0], E_FRAG["PhCO"])
    opts = {"para": para, "meta": meta, "bp": canon(S("benzophenone"))}
    mcq(node, "u3-acyl-benzoyl", "Acylate toluene with benzoyl chloride and AlCl₃. Pick the product shown that forms.",
        [("para", "(4-Methylphenyl)phenylmethanone", "The CH3 ring is the more reactive ring, and CH3 directs para (and ortho). The benzoyl group lands there."),
         ("meta", "(3-Methylphenyl)phenylmethanone", "Meta to CH3 is the minor route: no tertiary cation form."),
         ("bp", "Benzophenone", "That would mean losing the methyl. Only a ring H is replaced.")],
        key_in(opts, major), "para",
        "Toluene is acylated ortho and para to the CH3; the para ketone is shown.",
        prov("Rule 1: CH3 alkyl, o/p. Rule 2", sec),
        structure(tol, N("toluene"), "toluene + PhCOCl, AlCl₃"),
        tiles={"para": named(para, "(4-methylphenyl)(phenyl)methanone"), "meta": named(meta, "(3-methylphenyl)(phenyl)methanone"), "bp": named(opts["bp"], "benzophenone")},
        concepts=concepts)


# ---------------------------------------------------------------------------
# u3-directing
# ---------------------------------------------------------------------------

CLASS_OPTIONS = [
    ("op-act", "o/p director, activating"),
    ("op-deact", "o/p director, deactivating"),
    ("m-deact", "meta director, deactivating"),
]
CLASS_KEY = {"donor": "op-act", "alkyl": "op-act", "halogen": "op-deact", "withdrawer": "m-deact"}


def class_mcq(node: str, id: str, key: str, group: str, whys: dict[str, str], expl: str, level: int = 1) -> None:
    smi, name = C[key]
    klass = one_class(smi)
    r = substituents(smi)[0][1]
    mcq(node, id, f"Classify the circled {group} group for EAS.",
        [(o, t, whys[o]) for o, t in CLASS_OPTIONS],
        CLASS_KEY[klass], CLASS_KEY[klass],
        expl, prov(f"Rule 1: X is {mol(smi).GetAtomWithIdx(r).GetSymbol()}, class {klass}", "16.4"),
        structure(smi, name, marks=[r]), level=level)


def node_directing() -> None:
    node = "u3-directing"
    sec = "16.4"
    for id, key, group, whys, expl in [
        ("u3-dir-phenol", "phenol", "OH",
         {"op-act": "The O bonded to the ring has lone pairs. Ortho or para attack lets oxygen share one with the + (an extra form with full octets), so the ring reacts faster and at o/p.",
          "op-deact": "Halogens are the o/p deactivators. Oxygen's lone pair donation into the ring outweighs its pull, so OH activates strongly.",
          "m-deact": "Meta directors have a + or a multiple bond to O or N on the first atom. OH has neither; its O has lone pairs to give."},
         "OH is an o/p director and a strong activator: oxygen's lone pair stabilises the sigma complex."),
        ("u3-dir-acetanilide", "acetanilide", "NHCOCH₃",
         {"op-act": "The N bonded to the ring still has a lone pair to share with the +, so it directs o/p and activates. The C=O next door shares that pair too, which makes it weaker than NH2.",
          "op-deact": "Only halogens sit in that box. The N's lone pair still reaches the ring, so this group activates.",
          "m-deact": "The C=O is one atom further out. What matters is the first atom on the ring, the N, and it has a lone pair."},
         "The amide N has a lone pair on the first atom, so NHCOCH3 is an o/p director and an activator (milder than NH2)."),
        ("u3-dir-ethyl", "ethylbenzene", "ethyl",
         {"op-act": "An alkyl group donates weakly. Ortho or para attack gives a form with the + on the carbon carrying it, a more substituted cation.",
          "op-deact": "Alkyl groups have no electronegative atom to pull electrons away. They donate, so they activate.",
          "m-deact": "Nothing on the first carbon is positive or double bonded to O. It is a plain alkyl carbon."},
         "Alkyl groups are o/p directors and weak activators."),
        ("u3-dir-bromo", "bromobenzene", "Br",
         {"op-act": "Bromine's lone pairs direct o/p, but its pull through the sigma bond wins on rate. The ring is slower than benzene.",
          "op-deact": "The halogen anomaly: bromine withdraws through the sigma bond (slower than benzene), yet its lone pair still gives o/p attack an extra form.",
          "m-deact": "A meta director has no lone pair to offer the +. Bromine has three, so it still steers o/p."},
         "Halogens deactivate the ring but direct o/p: induction sets the rate, the lone pair sets the position."),
        ("u3-dir-cn", "benzonitrile", "CN",
         {"op-act": "The first atom, C, has a triple bond to N and no lone pair to give. It pulls electrons out.",
          "op-deact": "That is the halogen box. CN has no lone pair on the carbon bonded to the ring to rescue o/p attack.",
          "m-deact": "C triple bond N on the first atom withdraws electrons. Ortho or para attack would put the + next to it, so meta wins."},
         "A nitrile is a meta director and a deactivator: a multiple bond to N on the first atom."),
        ("u3-dir-cf3", "cf3benzene", "CF₃",
         {"op-act": "It looks like an alkyl group, but three fluorines pull hard through the sigma bonds. It withdraws.",
          "op-deact": "The carbon bonded to the ring has no lone pair to give. Only halogens bonded straight to the ring sit in that box.",
          "m-deact": "Three F atoms make the first carbon strongly electron poor. Ortho or para attack would put the + right next to it, so it steers meta."},
         "CF3 is a meta director and a deactivator, by induction alone."),
    ]:
        class_mcq(node, id, key, group, whys, expl)

    # halogen anomaly with the walk
    cb = S("chlorobenzene")
    p = sigma_at(cb, "para")
    mt = sigma_at(cb, "meta")
    derived = "lonepair" if len(p["extra_forms"]) == 1 and not mt["extra_forms"] else None
    mcq(node, "u3-dir-cl-why", "Chlorobenzene reacts slower than benzene. Pick why it still goes o/p.",
        [("lonepair", "Para attack gets an extra Cl+ form", "Para (and ortho) attack puts the + on the carbon holding Cl, and a Cl lone pair forms a C=Cl+ form with full octets. Meta attack gets no such form."),
         ("induction", "Cl pulls more weakly at o/p", "Its pull through the sigma bond makes every position slower. Position is set by the lone pair form, not by induction."),
         ("steric", "Meta is crowded", "Meta is further from Cl than ortho is. Crowding would favour meta if anything.")],
        derived, "lonepair",
        "Induction makes chlorobenzene slower than benzene; resonance from Cl's lone pair still makes o/p the least bad positions.",
        prov(f"sigma complex walk on chlorobenzene: para {p['total']} forms, meta {mt['total']}", sec),
        structure(cb, N("chlorobenzene")), level=2)

    # strongest activator wins
    ma = S("methylanisole")
    major = eas_major(ma, "Br")
    m = mol(ma)
    subs = {k: r for r, _, k in substituents(ma)}
    o_ome = [s for s in ring_sites(ma) if relation(m, subs["donor"], s) == "ortho"][0]
    o_me = [s for s in ring_sites(ma) if relation(m, subs["alkyl"], s) == "ortho"][0]
    opts = {"ome": attach(ma, o_ome, "Br"), "me": attach(ma, o_me, "Br"), "ipso": canon("COc1ccc(Br)cc1")}
    mcq(node, "u3-dir-compete", "Brominate 4-methylanisole once. Pick the major product.",
        [("ome", "Br ortho to the OMe", "Both groups are o/p directors and para is taken. OMe is the stronger activator (a lone pair beats an alkyl), so it decides: Br goes ortho to OMe."),
         ("me", "Br ortho to the CH3", "CH3 also directs there, but a methyl's help is weaker than oxygen's lone pair. The stronger activator wins."),
         ("ipso", "Br in place of the CH3", "EAS replaces a ring H. The methyl stays.")],
        key_in(opts, major), "ome",
        "When two groups disagree, the stronger activator decides. OMe beats CH3, so Br goes ortho to the OMe.",
        prov("Rules 1 and 2: donor tier leads alkyl tier", sec, "the strongest activator decides between competing groups"),
        structure(ma, N("methylanisole"), "4-methylanisole + Br₂, FeBr₃"),
        tiles={"ome": named(opts["ome"], "2-bromo-1-methoxy-4-methylbenzene"), "me": named(opts["me"], "2-bromo-4-methoxy-1-methylbenzene"),
               "ipso": named(opts["ipso"], "1-bromo-4-methoxybenzene")},
        level=2, convention="the strongest activator decides between competing groups")

    pnt = S("pnitrotoluene")
    major = eas_major(pnt, "Br")
    m = mol(pnt)
    subs = {k: r for r, _, k in substituents(pnt)}
    o_me = [s for s in ring_sites(pnt) if relation(m, subs["alkyl"], s) == "ortho"][0]
    o_no2 = [s for s in ring_sites(pnt) if relation(m, subs["withdrawer"], s) == "ortho"][0]
    opts = {"agree": attach(pnt, o_me, "Br"), "other": attach(pnt, o_no2, "Br"), "ipso": canon("O=[N+]([O-])c1ccc(Br)cc1")}
    mcq(node, "u3-dir-agree", "Brominate 4-nitrotoluene once. Pick the product.",
        [("agree", "Br ortho to CH3, meta to NO2", "Here the two groups agree: ortho to CH3 is also meta to NO2. Both point at the same carbons."),
         ("other", "Br ortho to NO2", "That carbon is meta to CH3 and ortho to NO2: neither group wants it."),
         ("ipso", "Br in place of the CH3", "EAS swaps a ring H, never the methyl.")],
        key_in(opts, major), "agree",
        "When the groups agree, the answer is easy: ortho to CH3 is meta to NO2, so Br goes there.",
        prov("Rules 1 and 2 on 4-nitrotoluene: alkyl leads, its ortho sites are meta to the nitro group", sec),
        structure(pnt, N("pnitrotoluene"), "4-nitrotoluene + Br₂, FeBr₃"),
        tiles={"agree": named(opts["agree"], "2-bromo-1-methyl-4-nitrobenzene"), "other": named(opts["other"], "2-bromo-4-methyl-1-nitrobenzene"),
               "ipso": named(opts["ipso"], "1-bromo-4-nitrobenzene")})

    # exam: the rate ladder and the class board
    ladder_cards = [
        ("phenol", "phenol", S("phenol"), "phenol", "OH gives a lone pair to the sigma complex: the fastest tier."),
        ("toluene", "toluene", S("toluene"), "toluene", "An alkyl group helps a little, by making one form a more substituted cation."),
        ("benzene", "benzene", S("benzene"), "benzene", "The reference point: no group helps or hurts."),
        ("chloro", "chlorobenzene", S("chlorobenzene"), "chlorobenzene", "Cl pulls through the sigma bond, so it is slower than benzene, though it still directs o/p."),
        ("nitro", "nitrobenzene", S("nitrobenzene"), "nitrobenzene", "NO2 pulls hard and puts a + beside any o/p sigma complex: the slowest."),
    ]
    ladder("u3-exam", "u3-dir-ladder-rate", ladder_cards, tier_of,
           "Rank these by how fast they nitrate, fastest first.",
           "Lone pair donors, then alkyl, then benzene, then halogens, then withdrawers.",
           "ring_activation", ("Fastest", "Slowest"),
           "Rank phenol, toluene, benzene, chlorobenzene and nitrobenzene by rate of electrophilic aromatic substitution, fastest first.",
           ("Phenol, toluene, benzene, chlorobenzene, nitrobenzene.",
            "Each one sits in a different tier: lone pair donor, alkyl, nothing, halogen, withdrawer. The more a group feeds the ring, the faster the attack.",
            "Look at the first atom on the ring: a lone pair, a plain carbon, a halogen, or a group with a + or a C=O."),
           [("reversed", ["nitro", "chloro", "benzene", "toluene", "phenol"], "ordering_is_reversed",
             ("The right ladder read from the slow end.", "Every step holds, but the track asks for the fastest at the top.", "Put phenol, the lone pair donor, first.")),
            ("halogen-up", ["phenol", "toluene", "chloro", "benzene", "nitro"], "ordering_one_adjacent_pair_swapped",
             ("Chlorobenzene is placed above benzene.", "Chlorine directs o/p like an activator, but it slows the ring: its pull through the sigma bond beats its lone pair on rate.", "Compare chlorobenzene with plain benzene: the halogen tier sits below benzene."))],
           "Rate follows the tier of the group on the ring: donor, alkyl, none, halogen, withdrawer.",
           prov("Rule 1 tiers; one card per tier, so the model alone decides each step", sec, "the five rate tiers"),
           ("ewg_edg_rubric",), "eas_directing_effects")

    ladder_cards2 = [
        ("acetanilide", "N-phenylacetamide", S("acetanilide"), "N-phenylacetamide", "The N bonded to the ring has a lone pair for the sigma complex: the donor tier."),
        ("ethyl", "ethylbenzene", S("ethylbenzene"), "ethylbenzene", "An alkyl group: a little faster than benzene."),
        ("bromo", "bromobenzene", S("bromobenzene"), "bromobenzene", "A halogen: slower than benzene, by induction."),
        ("ald", "benzaldehyde", S("benzaldehyde"), "benzaldehyde", "C=O on the first atom: a withdrawer, the slowest tier."),
    ]
    ladder("u3-exam", "u3-dir-ladder-rate2", ladder_cards2, tier_of,
           "Rank these by how fast they brominate, fastest first.",
           "Read the first atom on the ring each time.",
           "ring_activation", ("Fastest", "Slowest"),
           "Rank N-phenylacetamide, ethylbenzene, bromobenzene and benzaldehyde by rate of electrophilic aromatic substitution, fastest first.",
           ("N-Phenylacetamide, ethylbenzene, bromobenzene, benzaldehyde.",
            "Lone pair donor, alkyl, halogen, withdrawer: one card in each tier.",
            "Check whether the atom bonded to the ring has a lone pair, is a plain carbon, is a halogen, or carries a C=O."),
           [("reversed", ["ald", "bromo", "ethyl", "acetanilide"], "ordering_is_reversed",
             ("The right ladder read from the slow end.", "Each step holds, but the track wants the fastest first.", "Start with the amide N, which still has a lone pair.")),
            ("amide-down", ["ethyl", "acetanilide", "bromo", "ald"], "ordering_one_adjacent_pair_swapped",
             ("The amide is placed below the alkyl group.", "The amide's C=O shares the N lone pair, but the N still gives the ring more than an alkyl group does.", "Look at the atom bonded to the ring: N with a lone pair."))],
           "The tier of the first atom decides: donor, alkyl, halogen, withdrawer.",
           prov("Rule 1 tiers, one card per tier", sec, "the five rate tiers"),
           ("ewg_edg_rubric",), "eas_directing_effects")

    pairs = []
    for pid, left, key in (("ome", "-OCH₃ on a ring", "anisole"), ("me", "-CH₃ on a ring", "toluene"),
                           ("br", "-Br on a ring", "bromobenzene"), ("cho", "-CHO on a ring", "benzaldehyde")):
        k = one_class(S(key))
        right = {"donor": "o/p, activates by a lone pair", "alkyl": "o/p, activates weakly", "halogen": "o/p, deactivates", "withdrawer": "meta, deactivates"}[k]
        why = {"donor": "Oxygen's lone pair joins the sigma complex when the + reaches its carbon: o/p and fast.",
               "alkyl": "A methyl makes one o/p form a more substituted cation: o/p, a little faster than benzene.",
               "halogen": "The lone pair sets o/p; the pull through the sigma bond makes it slower than benzene.",
               "withdrawer": "The C=O carbon is electron poor; o/p attack would put a + beside it, so meta, and slower."}[k]
        pairs.append((pid, left, right, why, right))
    match("u3-exam", "u3-dir-match-class", "Match each group to how it directs and how it changes the rate.",
          "Look at the first atom bonded to the ring.", pairs,
          "Lone pair donors and alkyls direct o/p and activate; halogens direct o/p but deactivate; withdrawers direct meta.",
          prov("Rule 1 class of each group", sec), ("ewg_edg_rubric",))


# ---------------------------------------------------------------------------
# u3-blocking
# ---------------------------------------------------------------------------

def node_blocking() -> None:
    node = "u3-blocking"
    sec = "16.11"
    concepts = ("protecting_group_strategy",)
    conv = "the sulfonic acid goes para (the map's own 'Sulfonate para')"
    tol = S("toluene")
    m = mol(tol)
    r = substituents(tol)[0][0]
    step1 = attach(tol, [s for s in ring_sites(tol) if relation(m, r, s) == "para"][0], E_FRAG["SO3H"])
    step2 = eas_major(step1, "Br")
    step3 = desulfonate(step2[0]) if len(step2) == 1 else None
    want = canon("Cc1ccccc1Br")

    meta_br = "Cc1ccc(S(=O)(=O)O)c(Br)c1"
    opts = {"ok": step2[0] if len(step2) == 1 else "", "meta": canon(meta_br), "ipso": canon("Cc1ccc(Br)cc1")}
    mcq(node, "u3-blk-step2", "The para spot of toluene holds SO₃H. Brominate it, then pick the product.",
        [("ok", "Br ortho to the CH3", "Para is taken. CH3 sends Br ortho to itself, and that carbon is also meta to SO3H, so both groups agree."),
         ("meta", "Br ortho to the SO₃H", "That carbon is meta to CH3 and ortho to SO3H. Neither group sends the electrophile there."),
         ("ipso", "Br in place of the SO₃H", "Swapping out the SO3H is a different reaction. Under Br2 and FeBr3 a ring H is replaced.")],
        key_in(opts, step2), "ok",
        "With para blocked, CH3 steers bromine ortho, and SO3H agrees because that carbon is meta to it.",
        prov("Rule 2 on 4-methylbenzenesulfonic acid: alkyl leads, its ortho site is meta to SO3H", sec, conv),
        structure(step1, "4-methylbenzenesulfonic acid", "4-methylbenzenesulfonic acid + Br₂, FeBr₃"),
        tiles={"ok": named(opts["ok"], "3-bromo-4-methylbenzenesulfonic acid"), "meta": named(opts["meta"], "2-bromo-4-methylbenzenesulfonic acid"),
               "ipso": named(opts["ipso"], "1-bromo-4-methylbenzene")},
        concepts=concepts, convention=conv)

    opts = {"o": want, "p": canon("Cc1ccc(Br)cc1"), "keep": step2[0]}
    mcq(node, "u3-blk-step3", "Heat 3-bromo-4-methylbenzenesulfonic acid in dilute acid. Pick the product.",
        [("o", "2-Bromotoluene", "Hot dilute acid takes off only the SO3H. The Br and CH3 stay where they were: ortho to each other."),
         ("p", "4-Bromotoluene", "Nothing moves around the ring. The Br went on ortho to CH3 and stays there; the para spot is now an H."),
         ("keep", "No change", "Desulfonation is the reverse of sulfonation, and lots of water and heat drive it.")],
        key_eq(opts, step3), "o",
        "Removing the blocker leaves 2-bromotoluene, the ortho product, with no para isomer to separate.",
        prov("Rule 4 desulfonation SMARTS on the step 2 product", sec, conv),
        structure(step2[0], "3-bromo-4-methylbenzenesulfonic acid", "+ H₃O⁺, heat"),
        tiles={"o": named(want, "1-bromo-2-methylbenzene"), "p": named(opts["p"], "1-bromo-4-methylbenzene"), "keep": named(step2[0], "3-bromo-4-methylbenzenesulfonic acid")},
        concepts=concepts, convention=conv)

    derived = "rev" if canon(desulfonate(S("bsa"))) == canon(S("benzene")) and canon(reduce_nitro(S("nitrobenzene"))) != canon(S("benzene")) else None
    mcq(node, "u3-blk-why-so3h", "Pick why SO₃H works as a blocker and NO₂ does not.",
        [("rev", "SO₃H comes back off; NO₂ does not", "Hot dilute acid removes SO3H and returns the C-H. Nitration has no such reverse step, and reducing NO2 gives NH2, not H."),
         ("dir", "SO₃H directs o/p; NO₂ directs meta", "Both are meta directors. The difference is that only one of them can be taken back off the ring."),
         ("size", "SO₃H is smaller", "Size is not the point. A blocker has to leave cleanly at the end, and only SO3H does.")],
        derived, "rev",
        "A blocking group must come off at the end. Sulfonation is reversible; nitration is not, and reducing NO2 leaves NH2.",
        prov("Rule 4: desulfonation returns benzene; nitro reduction returns aniline, not benzene", sec),
        pair(named(S("bsa"), "benzenesulfonic acid"), named(S("nitrobenzene"), "nitrobenzene")), concepts=concepts)

    # anisole -> 2-bromoanisole by blocking
    an = S("anisole")
    m = mol(an)
    r = substituents(an)[0][0]
    b1 = attach(an, [s for s in ring_sites(an) if relation(m, r, s) == "para"][0], E_FRAG["SO3H"])
    b2 = eas_major(b1, "Br")
    b3 = desulfonate(b2[0]) if len(b2) == 1 else None
    opts = {"o": canon("COc1ccccc1Br"), "p": canon("COc1ccc(Br)cc1"), "m": canon("COc1cccc(Br)c1")}
    mcq(node, "u3-blk-anisole", "Sulfonate anisole para, brominate, then desulfonate. Pick the final product.",
        [("o", "2-Bromoanisole", "Blocked para leaves OMe to send Br ortho; removing SO3H at the end gives the pure ortho product."),
         ("p", "4-Bromoanisole", "Para was occupied by SO3H during the bromination, so Br could not go there."),
         ("m", "3-Bromoanisole", "Meta to OMe is the minor site with or without the blocker. OMe directs ortho.")],
        key_eq(opts, b3), "o",
        "Block para with SO3H, brominate ortho, then remove the SO3H: 2-bromoanisole.",
        prov("Rules 2 and 4 run step by step on anisole", sec, conv),
        structure(an, N("anisole"), "anisole: SO₃/H₂SO₄; Br₂/FeBr₃; H₃O⁺ heat"),
        tiles={"o": named(opts["o"], "1-bromo-2-methoxybenzene"), "p": named(opts["p"], "1-bromo-4-methoxybenzene"), "m": named(opts["m"], "1-bromo-3-methoxybenzene")},
        level=2, concepts=concepts, convention=conv)

    # what the blocker is for: without it, which products
    direct = eas_major(tol, "Br")
    derived = "two" if len(direct) == 2 else None
    mcq(node, "u3-blk-without", "Brominate toluene with no blocker. Pick what you get.",
        [("two", "A mix of ortho and para products", "CH3 directs both ortho and para, so both form. Separating them is the cost the blocker removes."),
         ("ortho", "Only the ortho product", "Ortho alone needs para to be unavailable. Without a blocker, para forms too."),
         ("meta", "Only the meta product", "CH3 is an o/p director. Meta is the minor product.")],
        derived, "two",
        "Toluene alone gives ortho and para together. Blocking para is how you get the ortho product cleanly.",
        prov(f"Rule 2 on toluene: {len(direct)} major products", sec),
        structure(tol, N("toluene"), "toluene + Br₂, FeBr₃"), level=0, concepts=concepts)

    derived = "rev" if canon(desulfonate(step1)) == canon(tol) else None
    mcq(node, "u3-blk-remove", "Pick the conditions that take the SO₃H blocker off at the end.",
        [("rev", "Dilute H₃O⁺ and heat", "Sulfonation is an equilibrium. Plenty of water and heat push it back: H returns to the ring and SO3H leaves."),
         ("fuming", "Fuming H₂SO₄", "Fuming sulfuric acid is rich in SO3, so it pushes the equilibrium toward MORE sulfonation."),
         ("reduce", "H₂ and Pd", "Hydrogenation does not cut the C-S bond here. Reversal of sulfonation is done with acid and water.")],
        derived, "rev",
        "Hot dilute acid reverses sulfonation; concentrated SO3 drives it forward. The same equilibrium, pushed two ways.",
        prov("Rule 4 desulfonation SMARTS returns toluene from the blocked ring", sec),
        structure(step1, "4-methylbenzenesulfonic acid"), concepts=concepts)


# ---------------------------------------------------------------------------
# u3-nitro-red
# ---------------------------------------------------------------------------

def node_nitro_red() -> None:
    node = "u3-nitro-red"
    sec = "16.2"
    concepts = ("oxidation_state_ladder",)
    sn = ("Sn and HCl, then base", "Sn, HCl; then NaOH")
    pd = ("H₂ and Pd/C", "H₂, Pd/C")
    cases = [
        ("u3-nred-mnt", "1-methyl-3-nitrobenzene", "Cc1cccc([N+](=O)[O-])c1", "3-methylaniline",
         {"amine": "3-methylaniline", "hydroxyl": "3-methylphenol", "keep": "1-methyl-3-nitrobenzene"}, 1),
        ("u3-nred-pnt", "1-methyl-4-nitrobenzene", "Cc1ccc([N+](=O)[O-])cc1", "4-methylaniline",
         {"amine": "4-methylaniline", "hydroxyl": "4-methylphenol", "keep": "1-methyl-4-nitrobenzene"}, 0),
        ("u3-nred-dinitro", "1,3-dinitrobenzene", "O=[N+]([O-])c1cccc([N+](=O)[O-])c1", "benzene-1,3-diamine",
         {"amine": "benzene-1,3-diamine", "hydroxyl": "3-nitroaniline", "keep": "1,3-dinitrobenzene"}, 2),
        ("u3-nred-acid", "4-nitrobenzoic acid", "O=C(O)c1ccc([N+](=O)[O-])cc1", "4-aminobenzoic acid",
         {"amine": "4-aminobenzoic acid", "hydroxyl": "4-hydroxybenzoic acid", "keep": "4-nitrobenzoic acid"}, 1),
    ]
    for id, sname, smi, pname, names, level in cases:
        words, caption = pd if level == 0 else sn
        if id == "u3-nred-acid":
            # Audit 23 Oct (2a #14): a base step alone would leave the carboxylate,
            # not the neutral acid the key draws, so the acid workup is stated.
            # That NaOH deprotonates COOH is a pKa claim RDKit cannot check.
            words, caption = "Sn and HCl, then NaOH, then H₃O⁺ workup", "Sn, HCl; then NaOH; then H₃O⁺"
        if id == "u3-nred-dinitro":
            # 3-nitroaniline is a real product of milder or limited reduction, so say excess
            words, caption = "excess " + words, "excess " + caption
        out = reduce_nitro(smi)
        opts = {k: opsin_smiles(n) for k, n in names.items()}
        whys = {
            "amine": f"Every NO2 becomes NH2 and nothing else on the ring changes. That is {pname}.",
            "hydroxyl": "The nitrogen stays bonded to the ring; it is reduced to NH2, not swapped for OH." if "phenol" in names["hydroxyl"] or "hydroxy" in names["hydroxyl"] else "Excess reducing agent takes every nitro group down, not just one.",
            "keep": "The reagent reduces the nitro group. Leaving it unchanged ignores what is in the flask.",
        }
        mcq(node, id, f"Reduce {sname} with {words}. Pick the product.",
            [("amine", names["amine"][0].upper() + names["amine"][1:], whys["amine"]),
             ("hydroxyl", names["hydroxyl"][0].upper() + names["hydroxyl"][1:], whys["hydroxyl"]),
             ("keep", names["keep"][0].upper() + names["keep"][1:], whys["keep"])],
            key_eq(opts, out), "amine",
            f"Nitro reduction turns each ArNO2 into ArNH2: {sname} gives {pname}.",
            prov("Rule 4 nitro reduction SMARTS, every nitro group", sec),
            structure(smi, sname, f"{sname} + {caption}"),
            tiles={k: named(opts[k], names[k]) for k in names}, level=level, concepts=concepts)

    nb, an = S("nitrobenzene"), S("aniline")
    derived = "flip" if one_class(nb) == "withdrawer" and one_class(reduce_nitro(nb)) == "donor" else None
    mcq(node, "u3-nred-flip", "Compare NO₂ with the NH₂ it becomes. Pick what changes for EAS.",
        [("flip", "Meta deactivator becomes o/p activator", "N+ with two N-O bonds pulls electrons and directs meta. NH2 has a lone pair to give, so it directs o/p and activates strongly."),
         ("same", "Nothing, both are nitrogen groups", "Same element, opposite behaviour. What matters is whether the N bonded to the ring carries a + or a lone pair."),
         ("weaker", "It stays meta, just weaker", "NH2 has a lone pair, so ortho or para attack gains an extra form. That makes it o/p.")],
        derived, "flip",
        "Reducing NO2 to NH2 flips the ring from a meta deactivator to an o/p activator. That flip is a sequencing tool.",
        prov("Rule 1 on both: NO2 withdrawer (N+), NH2 donor", sec),
        pair(named(nb, "nitrobenzene"), named(an, "aniline")), concepts=("ewg_edg_rubric",))

    f1, f2 = formula(nb), formula(an)
    derived = "lose2o" if (f1, f2) == ("C6H5NO2", "C6H7N") else None
    mcq(node, "u3-nred-formula", "Compare nitrobenzene with aniline. Pick what the reduction did.",
        [("lose2o", "Took away 2 O and added 2 H", f"{f1} becomes {f2}: both oxygens leave and nitrogen gains two H. Losing O and gaining H is reduction."),
         ("add2o", "Added 2 O", "Oxygens leave, they are not added. Adding O would be oxidation."),
         ("same", "Only moved electrons, no atoms", "Count the atoms: two O are gone and two H are new.")],
        derived, "lose2o",
        f"Nitrobenzene ({f1}) to aniline ({f2}): oxygen out, hydrogen in, a reduction.",
        prov(f"RDKit formulas {f1} and {f2}", sec), pair(named(nb, "nitrobenzene"), named(an, "aniline")),
        level=0, concepts=concepts)


def opsin_smiles(name: str) -> str:
    """The structure OPSIN reads from a name, used to build an option FROM its name."""
    if COLLECT:
        WANTED.append(name)
        return "CC"
    if name not in _OPSIN:
        got = run_opsin([name])[0]
        if not got:
            raise ValueError(f"OPSIN could not read {name}")
        _OPSIN[name] = canon(got)
    return _OPSIN[name]


_OPSIN: dict[str, str] = {}
# A first pass collects every name opsin_smiles is asked for, so OPSIN (a Java
# start each call) runs once for all of them before the real pass.
COLLECT = False
WANTED: list[str] = []


def prefetch_opsin() -> None:
    todo = [n for n in dict.fromkeys(WANTED) if n not in _OPSIN]
    if not todo:
        return
    for n, got in zip(todo, run_opsin(todo)):
        if not got:
            raise ValueError(f"OPSIN could not read {n}")
        _OPSIN[n] = canon(got)


# ---------------------------------------------------------------------------
# u3-c-to-ch2
# ---------------------------------------------------------------------------

def node_c_to_ch2() -> None:
    node = "u3-c-to-ch2"
    sec = "16.10"
    concepts = ("oxidation_state_ladder",)
    cases = [
        ("u3-ch2-meet", "acetophenone", S("acetophenone"), {"ch2": ("ethylbenzene", ""), "alc": ("1-phenylethan-1-ol", ""), "keep": ("acetophenone", "")}, 0),
        ("u3-ch2-butyro", "1-phenylbutan-1-one", S("butyrophenone"), {"ch2": ("butylbenzene", ""), "alc": ("1-phenylbutan-1-ol", ""), "keep": ("1-phenylbutan-1-one", "")}, 1),
        ("u3-ch2-anisyl", "1-(4-methoxyphenyl)ethan-1-one", "COc1ccc(C(C)=O)cc1", {"ch2": ("1-ethyl-4-methoxybenzene", ""), "alc": ("1-(4-methoxyphenyl)ethan-1-ol", ""), "keep": ("1-(4-methoxyphenyl)ethan-1-one", "")}, 1),
    ]
    for id, sname, smi, names, level in cases:
        out = aldehyde_or_ketone_to_ch2(smi)
        opts = {k: opsin_smiles(v[0]) for k, v in names.items()}
        mcq(node, id, f"Reduce {sname} with Zn(Hg) and HCl. Pick the product.",
            [("ch2", names["ch2"][0][0].upper() + names["ch2"][0][1:], "Clemmensen reduction takes the C=O all the way to CH2. The chain stays straight because it went on as an acyl group."),
             ("alc", names["alc"][0][0].upper() + names["alc"][0][1:], "Stopping at the alcohol is what NaBH4 does. Zn(Hg) in HCl removes the oxygen completely."),
             ("keep", names["keep"][0][0].upper() + names["keep"][0][1:], "The reagent is chosen to reduce the ketone. Leaving it unchanged ignores it.")],
            key_eq(opts, out), "ch2",
            f"Clemmensen (or Wolff-Kishner) turns the aryl ketone's C=O into CH2: {sname} gives {names['ch2'][0]}.",
            prov("Rule 4 carbonyl-to-CH2 SMARTS", sec),
            structure(smi, sname, f"{sname} + Zn(Hg), HCl"),
            tiles={k: named(opts[k], names[k][0]) for k in names}, level=level, concepts=concepts)

    # the point: acylate then reduce beats direct alkylation
    bz = S("benzene")
    route = aldehyde_or_ketone_to_ch2(eas_major(bz, "EtCO")[0])
    direct = fc_alkylation(bz, "CCCCl")
    opts = {"acyl": canon(S("propylbenzene")), "alk": canon(S("cumene"))}
    derived_route = key_eq(opts, route)
    derived_direct = key_eq(opts, direct)
    derived = "acylred" if derived_route == "acyl" and derived_direct == "alk" else None
    mcq(node, "u3-ch2-why", "You want propylbenzene from benzene. Pick the route that gives it.",
        [("acylred", "Propanoyl chloride/AlCl₃, then Zn(Hg)/HCl", "The acylium ion cannot rearrange, so the straight chain goes on; reducing C=O to CH2 leaves propylbenzene."),
         ("alk", "1-Chloropropane and AlCl₃", "The primary cation shifts a hydride to become secondary, so the main product is isopropylbenzene, not propylbenzene."),
         ("both", "Either route gives propylbenzene", "Only one of them avoids the cation shift. Direct alkylation with a primary halide rearranges, so propylbenzene is at most a minor product.")],
        derived, "acylred",
        "Acylate then reduce: the acyl group goes on straight and C=O becomes CH2. Direct alkylation gives mainly isopropylbenzene.",
        prov("Rule 4: the acylation route built step by step; the one-shift cation model on 1-chloropropane gives isopropyl", sec),
        structure(S("propylbenzene"), N("propylbenzene"), "target: propylbenzene"), level=2, concepts=("carbocation_rearrangement",),
        convention="a primary cation shifts before it bonds, so the rearranged product is the main one")

    acp = S("acetophenone")
    eb = aldehyde_or_ketone_to_ch2(acp)
    derived = "flip" if one_class(acp) == "withdrawer" and one_class(eb) == "alkyl" else None
    mcq(node, "u3-ch2-flip", "Compare acetophenone with ethylbenzene. Pick what the reduction did to the ring.",
        [("flip", "Meta deactivator became o/p activator", "The C=O on the first carbon withdrew electrons and directed meta. Once it is CH2, the group is a plain alkyl: o/p and activating."),
         ("same", "Nothing, both are carbon groups", "The first carbon changed from C=O to CH2. That switches the group from withdrawer to alkyl."),
         ("deact", "It made the ring more deactivated", "Removing the C=O removes the pull. The ring becomes more reactive, not less.")],
        derived, "flip",
        "Reducing the ketone flips the director: acyl (meta, deactivating) becomes alkyl (o/p, activating). Order matters in a synthesis.",
        prov("Rule 1 on both structures", sec), pair(named(acp, "acetophenone"), named(eb, "ethylbenzene")), concepts=("ewg_edg_rubric",))

    f1, f2 = formula(acp), formula(eb)
    derived = "o-h2" if (f1, f2) == ("C8H8O", "C8H10") else None
    mcq(node, "u3-ch2-formula", "Compare acetophenone with ethylbenzene. Pick what changed.",
        [("o-h2", "O removed, 2 H added", f"{f1} becomes {f2}: the carbonyl O is gone and the carbon carries two H. A reduction."),
         ("c-lost", "A carbon was lost", "Both have eight carbons. The chain keeps its length; only C=O became CH2."),
         ("ring", "The ring was reduced", "The ring is untouched and still aromatic. Only the side chain's C=O changed.")],
        derived, "o-h2",
        f"{f1} to {f2}: C=O became CH2. The carbon skeleton is the same.",
        prov(f"RDKit formulas {f1} and {f2}", sec), pair(named(acp, "acetophenone"), named(eb, "ethylbenzene")), concepts=concepts)

    # Wolff-Kishner: same product
    out = aldehyde_or_ketone_to_ch2(S("propiophenone"))
    opts = {"ch2": canon(S("propylbenzene")), "hydrazone": canon("CCC(=NN)c1ccccc1"), "alc": opsin_smiles("1-phenylpropan-1-ol")}
    mcq(node, "u3-ch2-wk", "Treat 1-phenylpropan-1-one with H₂NNH₂ and KOH, heat. Pick the final product.",
        [("ch2", "Propylbenzene", "Wolff-Kishner also ends at CH2: the hydrazone forms, then base and heat drive off N2."),
         ("hydrazone", "1-Phenylpropan-1-one hydrazone", "The hydrazone is the intermediate. Strong base and heat take it on to the CH2 and N2 gas."),
         ("alc", "1-Phenylpropan-1-ol", "No hydride reagent is present, and the oxygen leaves entirely.")],
        key_eq(opts, out), "ch2",
        "Wolff-Kishner and Clemmensen give the same CH2 product; one runs in base, the other in acid.",
        prov("Rule 4 carbonyl-to-CH2 SMARTS (the same skeleton edit for both named reductions)", sec),
        structure(S("propiophenone"), N("propiophenone"), "1-phenylpropan-1-one + H₂NNH₂, KOH, heat"),
        tiles={"ch2": named(opts["ch2"], "propylbenzene"), "hydrazone": named(opts["hydrazone"], "1-phenylpropan-1-one hydrazone"), "alc": named(opts["alc"], "1-phenylpropan-1-ol")},
        level=2, concepts=concepts)


# ---------------------------------------------------------------------------
# u3-sequencing
# ---------------------------------------------------------------------------

STEP = {
    "nitrate": lambda s: eas_major(s, "NO2"),
    "brominate": lambda s: eas_major(s, "Br"),
    "reduce": lambda s: [reduce_nitro(s)],
    "oxidise": lambda s: [benzylic_oxidation(s)],
    "acylate": lambda s: eas_major(s, "Ac"),
}


def route_gives(start: str, steps: list[str], target: str) -> bool:
    """True when the target is among the major products of running the steps in order."""
    frontier = {canon(start)}
    for st in steps:
        nxt = set()
        for s in frontier:
            if st == "acylate" and eas_fails(s):
                continue
            nxt |= {canon(x) for x in STEP[st](s)}
        frontier = nxt
    return canon(target) in frontier


def lower_first(text: str) -> str:
    """Lower-case a leading word, but leave a formula such as KMnO4 as written."""
    return text[0].lower() + text[1:] if text[1:2].islower() else text


def node_sequencing() -> None:
    node = "u3-sequencing"
    sec = "16.11"
    concepts = ("ewg_edg_rubric",)
    bz = S("benzene")
    cases = [
        ("u3-seq-mbr", "1-bromo-3-nitrobenzene", "Brc1cccc([N+](=O)[O-])c1",
         [("nb", "Nitrate, then brominate", ["nitrate", "brominate"],
           "NO2 goes on first and directs the bromine meta. That is the target."),
          ("bn", "Brominate, then nitrate", ["brominate", "nitrate"],
           "Br goes on first and directs the nitro group ortho and para, so the meta product barely forms."),
          ("either", "Either order works", None,
           "Each first group steers the second. Only the meta director first gives the meta product.")], 0),
        ("u3-seq-pbr", "1-bromo-4-nitrobenzene", "Brc1ccc([N+](=O)[O-])cc1",
         [("bn", "Brominate, then nitrate", ["brominate", "nitrate"],
           "Br directs o/p, so nitration then gives the para product (with ortho beside it)."),
          ("nb", "Nitrate, then brominate", ["nitrate", "brominate"],
           "NO2 first sends Br meta. The para isomer would barely form."),
          ("either", "Either order works", None,
           "The first group decides where the second lands. Here the o/p director has to go first.")], 1),
        ("u3-seq-mbra", "3-bromoaniline", "Nc1cccc(Br)c1",
         [("nbr", "Nitrate, brominate, then reduce", ["nitrate", "brominate", "reduce"],
           "NO2 steers Br meta; reducing NO2 to NH2 last gives 3-bromoaniline."),
          ("nrb", "Nitrate, reduce, then brominate", ["nitrate", "reduce", "brominate"],
           "Reducing first makes NH2, an o/p director, so bromine would land ortho and para to it."),
          ("bnr", "Brominate, nitrate, then reduce", ["brominate", "nitrate", "reduce"],
           "Br first sends the nitro group o/p, so the final amine is not meta to Br.")], 1),
    ]
    for id, tname, tsmi, opts, level in cases:
        good = [o for o, _, steps, _ in opts if steps is not None and route_gives(bz, steps, tsmi)]
        derived = good[0] if len(good) == 1 else None
        correct = opts[0][0]
        mcq(node, id, "Pick the order that makes the target from benzene.",
            [(o, t, w) for o, t, _, w in opts], derived, correct,
            f"Put the group that directs where you need on first. For {tname}: " + opts[0][1].lower() + ".",
            prov("routes run through Rules 2 and 4 step by step; one option reaches the target", sec),
            structure(tsmi, tname, f"target: {tname}"), level=level, concepts=concepts)

    tol = S("toluene")
    cases = [
        ("u3-seq-pnba", "4-nitrobenzoic acid", "O=C(O)c1ccc([N+](=O)[O-])cc1",
         [("no", "Nitrate, then KMnO₄", ["nitrate", "oxidise"],
           "CH3 sends the nitro group para (and ortho); KMnO4 then turns CH3 into COOH."),
          ("on", "KMnO₄, then nitrate", ["oxidise", "nitrate"],
           "Oxidising first makes COOH, a meta director, so nitration would go meta."),
          ("either", "Either order works", None,
           "The CH3 is an o/p director and the COOH is a meta director. Which one is on the ring during nitration decides it.")], 1),
        ("u3-seq-mnba", "3-nitrobenzoic acid", "O=C(O)c1cccc([N+](=O)[O-])c1",
         [("on", "KMnO₄, then nitrate", ["oxidise", "nitrate"],
           "COOH first, a meta director: nitration then goes meta to it."),
          ("no", "Nitrate, then KMnO₄", ["nitrate", "oxidise"],
           "CH3 first sends NO2 ortho and para, so the acid would end up o/p, not meta."),
          ("either", "Either order works", None,
           "Oxidation flips the CH3 (o/p) into COOH (meta). The order decides the pattern.")], 2),
    ]
    for id, tname, tsmi, opts, level in cases:
        good = [o for o, _, steps, _ in opts if steps is not None and route_gives(tol, steps, tsmi)]
        derived = good[0] if len(good) == 1 else None
        mcq(node, id, "Pick the order that makes the target from toluene.",
            [(o, t, w) for o, t, _, w in opts], derived, opts[0][0],
            f"Nitrate while the group on the ring points where you need it. For {tname}: " + lower_first(opts[0][1]) + ".",
            prov("routes run through Rules 2 and 4 step by step (benzylic oxidation interleaved from u3-benzylic-ox)", sec),
            structure(tsmi, tname, f"target: {tname}"), level=level, concepts=concepts)

    # FC on a deactivated ring: order
    target = "CC(=O)c1cccc([N+](=O)[O-])c1"
    good_an = route_gives(bz, ["acylate", "nitrate"], target)
    bad_na = route_gives(bz, ["nitrate", "acylate"], target)
    derived = "an" if good_an and not bad_na else None
    mcq(node, "u3-seq-acyl-first", "Make 1-(3-nitrophenyl)ethan-1-one from benzene. Pick the order.",
        [("an", "Acylate, then nitrate", "The acetyl group goes on while the ring is still reactive, and it directs the nitro group meta."),
         ("na", "Nitrate, then acylate", "Nitrobenzene is too deactivated for Friedel-Crafts. The acylation step would fail."),
         ("either", "Either order works", "Both groups are meta directors, but only one order lets the Friedel-Crafts step happen at all.")],
        derived, "an",
        "Do the Friedel-Crafts step before any strong withdrawer goes on. Acylate, then nitrate.",
        prov("routes run through Rules 2 and 4 with the Friedel-Crafts failure rule", sec, "Friedel-Crafts fails on a ring carrying a withdrawer"),
        structure(target, "1-(3-nitrophenyl)ethan-1-one", "target: 1-(3-nitrophenyl)ethan-1-one"), level=2,
        concepts=concepts, convention="Friedel-Crafts fails on a ring carrying a withdrawer")


# ---------------------------------------------------------------------------
# u3-fc-alkyl (branch)
# ---------------------------------------------------------------------------

def node_fc_alkyl() -> None:
    node = "u3-fc-alkyl"
    sec = "16.3"
    concepts = ("carbocation_rearrangement",)
    bz = S("benzene")
    cases = [
        ("u3-alk-meet", "2-chloro-2-methylpropane", "CC(C)(C)Cl",
         {"t": ("tert-butylbenzene", "The tert-butyl cation is already tertiary, so it has nowhere better to shift. It bonds to the ring as is."),
          "iso": ("isobutylbenzene", "That would need a tertiary cation to become primary. Cations only shift toward more substituted carbons."),
          "none": ("benzene", "Benzene reacts with this cation readily; AlCl3 pulls off the chloride to make it.")}, "t", 0),
        ("u3-alk-propyl", "1-chloropropane", "CCCCl",
         {"iso": ("isopropylbenzene", "The primary cation takes a hydride from the next carbon and becomes secondary. The ring then bonds at the middle carbon."),
          "n": ("propylbenzene", "That keeps the primary carbon. A hydride shift turns it into a secondary cation, so the rearranged product is the main one."),
          "none": ("benzene", "AlCl3 does activate 1-chloropropane. The trouble is what the cation does next, not whether it forms.")}, "iso", 1),
        ("u3-alk-isobutyl", "1-chloro-2-methylpropane", "CC(C)CCl",
         {"t": ("tert-butylbenzene", "The primary cation's neighbour carries an H; a hydride shift makes a tertiary cation, and the ring bonds there."),
          "iso": ("isobutylbenzene", "That keeps the primary carbon. A tertiary cation is one hydride shift away, so it shifts."),
          "sec": ("butan-2-ylbenzene", "A methyl shift would give this secondary cation, but a hydride shift gives a tertiary one, and the more substituted cation wins.")}, "t", 1),
        ("u3-alk-neopentyl", "1-chloro-2,2-dimethylpropane", "CC(C)(C)CCl",
         {"tam": ("(2-methylbutan-2-yl)benzene", "The neighbouring carbon has no H, so a methyl shifts instead. The cation becomes tertiary and the ring bonds there."),
          "neo": ("(2,2-dimethylpropyl)benzene", "That keeps the primary carbon. A methyl shift gives a tertiary cation, so it happens first."),
          "t": ("tert-butylbenzene", "That loses a carbon. A shift moves a group; it never removes one.")}, "tam", 2),
    ]
    for id, rname, rcl, names, correct, level in cases:
        out = fc_alkylation(bz, rcl)
        opts = {k: opsin_smiles(v[0]) for k, v in names.items()}
        _, shift, deg = fc_cation_carbon(rcl)
        mcq(node, id, f"Treat benzene with {rname} and AlCl₃. Pick the main product.",
            [(k, v[0][0].upper() + v[0][1:], v[1]) for k, v in names.items()],
            key_eq(opts, out), correct,
            f"The cation from {rname} ends up {deg} (shift: {shift}), and the ring bonds to that carbon.",
            prov(f"Rule 4 one-shift cation model: {shift} shift, {deg} cation", sec),
            structure(rcl, rname, f"{rname} + AlCl₃, with benzene"),
            tiles={k: named(opts[k], v[0]) for k, v in names.items()}, level=level, concepts=concepts,
            convention="the cation makes at most one 1,2 shift, toward a more substituted carbon")

    tol = S("toluene")
    derived = "poly" if TIER[one_class(tol)] < TIER["none"] else None
    mcq(node, "u3-alk-poly", "Alkylate benzene with CH₃Cl and AlCl₃. Pick the problem you hit.",
        [("poly", "The product alkylates again", "Toluene is more reactive than benzene, because CH3 activates the ring. It competes for the electrophile and picks up more methyl groups."),
         ("stop", "It stops cleanly at one group", "That is acylation, where the product is deactivated. An alkyl product is activated."),
         ("meta", "The second group goes meta", "CH3 is an o/p director. Extra methyls go ortho and para, which only adds to the mixture.")],
        derived, "poly",
        "Each alkyl group activates the ring, so the product outcompetes benzene: polyalkylation. Acylation does not have this problem.",
        prov("Rule 1: the alkyl product is in a faster tier than benzene", sec),
        pair(named(S("benzene"), "benzene"), named(tol, "toluene")), concepts=("ewg_edg_rubric",))

    nb = S("nitrobenzene")
    derived = "none" if eas_fails(nb) else None
    # Drawn tiles, as u3-acyl-fails has for the acylation twin (audit 23 Oct, top-25 #21).
    m = mol(nb)
    r = substituents(nb)[0][0]
    meta = attach(nb, [s for s in ring_sites(nb) if relation(m, r, s) == "meta"][0], "C(C)C")
    para = attach(nb, [s for s in ring_sites(nb) if relation(m, r, s) == "para"][0], "C(C)C")
    mcq(node, "u3-alk-fails", "Try to alkylate nitrobenzene with 2-chloropropane and AlCl₃. Pick the outcome.",
        [("none", "No reaction, nitrobenzene is recovered", "A nitro group makes the ring too electron poor for a Friedel-Crafts electrophile. Nothing happens."),
         ("meta", "The meta product", "Meta is where NO2 would send an electrophile, but this ring is too deactivated to react at all."),
         ("para", "The para product", "NO2 does not direct para, and the ring does not react anyway.")],
        derived, "none",
        "Friedel-Crafts fails on rings carrying a strong withdrawer such as NO2.",
        prov("Rule 1 withdrawer; Friedel-Crafts failure rule", sec, "Friedel-Crafts fails on a ring carrying a withdrawer"),
        structure(nb, N("nitrobenzene"), "nitrobenzene + 2-chloropropane, AlCl₃"),
        tiles={"meta": named(meta, "1-nitro-3-(propan-2-yl)benzene"), "para": named(para, "1-nitro-4-(propan-2-yl)benzene"), "none": named(canon(nb), "nitrobenzene")},
        level=2, concepts=("ewg_edg_rubric",),
        convention="Friedel-Crafts fails on a ring carrying a withdrawer")

    out2 = fc_alkylation(bz, "CC(C)Cl")
    opts = {"iso": canon(S("cumene")), "n": canon(S("propylbenzene")), "di": canon("CC(C)c1ccc(C(C)C)cc1")}
    mcq(node, "u3-alk-sec", "Treat benzene with 2-chloropropane and AlCl₃. Pick the main monoalkyl product.",
        [("iso", "Isopropylbenzene", "The secondary cation forms at the middle carbon and has no better cation one shift away. It bonds as is."),
         ("n", "Propylbenzene", "That would need a secondary cation to become primary. Shifts only go toward more substituted carbons."),
         ("di", "1,4-Diisopropylbenzene", "Some of that does form, since isopropylbenzene is activated. The main monoalkyl product is isopropylbenzene.")],
        key_eq(opts, out2), "iso",
        "A secondary cation with no better neighbour bonds as is: isopropylbenzene.",
        prov("Rule 4 one-shift cation model: no shift", sec),
        structure("CC(C)Cl", "2-chloropropane", "2-chloropropane + AlCl₃, with benzene"),
        tiles={"iso": named(opts["iso"], "isopropylbenzene"), "n": named(opts["n"], "propylbenzene"), "di": named(opts["di"], "1,4-diisopropylbenzene")},
        concepts=concepts)


# ---------------------------------------------------------------------------
# u3-benzylic-br (branch)
# ---------------------------------------------------------------------------

def node_benzylic_br() -> None:
    node = "u3-benzylic-br"
    sec = "16.9"
    concepts = ("radical_stability",)
    cases = [
        ("u3-bbr-meet", "toluene", S("toluene"),
         {"bn": ("(bromomethyl)benzene", "The benzylic C-H breaks, because the radical it leaves is stabilised by the ring. Br goes on the CH3 carbon."),
          "ring": ("1-bromo-4-methylbenzene", "Ring bromination needs a Lewis acid and gives an electrophile. NBS and light make radicals, which take the benzylic H."),
          "none": ("toluene", "Toluene has three benzylic H, so the reaction runs.")}, "bn", 0),
        ("u3-bbr-ethyl", "ethylbenzene", S("ethylbenzene"),
         {"alpha": ("(1-bromoethyl)benzene", "Only the CH2 next to the ring is benzylic. Its radical is stabilised by the ring, so Br goes there."),
          "beta": ("(2-bromoethyl)benzene", "The CH3 carbon is one bond further out. Its radical gets no help from the ring."),
          "ring": ("1-bromo-4-ethylbenzene", "Radical conditions leave the ring C-H alone; the benzylic C-H is far weaker.")}, "alpha", 1),
        ("u3-bbr-cumene", "isopropylbenzene", S("cumene"),
         {"tert": ("(2-bromopropan-2-yl)benzene", "The one benzylic H sits on a carbon that becomes a tertiary benzylic radical: the best radical on offer."),
          "prim": ("(1-bromopropan-2-yl)benzene", "The CH3 carbons are not benzylic. Their radicals are primary and get no ring help."),
          "none": ("isopropylbenzene", "One benzylic H is enough, and its radical is especially stable.")}, "tert", 1),
        ("u3-bbr-propyl", "propylbenzene", S("propylbenzene"),
         {"alpha": ("(1-bromopropyl)benzene", "The CH2 bonded to the ring is the benzylic one. Br goes there."),
          "beta": ("(2-bromopropyl)benzene", "That carbon is secondary but not benzylic. Benzylic resonance beats one extra alkyl."),
          "gamma": ("(3-bromopropyl)benzene", "The end CH3 is primary and far from the ring: the worst radical in the chain.")}, "alpha", 1),
    ]
    for id, sname, smi, names, correct, level in cases:
        out = benzylic_bromination(smi)
        opts = {k: opsin_smiles(v[0]) for k, v in names.items()}
        mcq(node, id, f"Treat {sname} with NBS and light. Pick the product.",
            [(k, v[0][0].upper() + v[0][1:], v[1]) for k, v in names.items()],
            key_eq(opts, out), correct,
            "NBS and light brominate the benzylic carbon: the sp3 carbon bonded to the ring, whose radical the ring stabilises.",
            prov("Rule 4 benzylic bromination on the one benzylic carbon", sec),
            structure(smi, sname, f"{sname} + NBS, hν"),
            tiles={k: named(opts[k], v[0]) for k, v in names.items()}, level=level, concepts=concepts)

    tb = S("tbubenzene")
    derived = "none" if benzylic_bromination(tb) is None else None
    mcq(node, "u3-bbr-tbu", "Treat tert-butylbenzene with NBS and light. Pick the outcome.",
        [("none", "No benzylic bromination", "The carbon bonded to the ring carries three CH3 groups and no H. With no benzylic H, there is nothing for the radical to take."),
         ("benz", "Br on the carbon bonded to the ring", "That carbon has no H to replace. A substitution needs an H on that carbon."),
         ("ring", "Br on the ring, para", "Radical conditions do not attack the ring; that needs Br2 and a Lewis acid.")],
        derived, "none",
        "No benzylic H, no benzylic bromination.",
        prov(f"benzylic H count {benzylic_h_count(tb)}", sec), structure(tb, N("tbubenzene"), "tert-butylbenzene + NBS, hν"),
        level=2, concepts=concepts)

    eb = S("ethylbenzene")
    n = benzylic_h_count(eb)
    derived = {2: "two", 3: "three", 5: "five"}.get(n)
    mcq(node, "u3-bbr-count", "Count the benzylic H in ethylbenzene.",
        [("two", "2", "Only the CH2 bonded to the ring is benzylic, and it carries two H."),
         ("three", "3", "The CH3 is one carbon further from the ring. Its H are not benzylic."),
         ("five", "5", "That counts every side chain H. Benzylic means on the carbon bonded straight to the ring.")],
        derived, "two",
        "Two benzylic H, both on the CH2 bonded to the ring.",
        prov(f"benzylic H count from RDKit: {n}", sec), structure(eb, N("ethylbenzene")), level=0, concepts=concepts)


# ---------------------------------------------------------------------------
# u3-benzylic-ox (branch)
# ---------------------------------------------------------------------------

def node_benzylic_ox() -> None:
    node = "u3-benzylic-ox"
    sec = "16.9"
    concepts = ("oxidation_state_ladder",)
    cases = [
        ("u3-box-meet", "toluene", S("toluene"),
         {"acid": ("benzoic acid", "KMnO4 oxidises the benzylic carbon all the way to COOH."),
          "ald": ("benzaldehyde", "Hot KMnO4 does not stop at the aldehyde; it goes on to the acid."),
          "phenol": ("phenol", "The ring is not touched, and no O goes onto it. The CH3 carbon becomes COOH.")}, "acid", 0),
        ("u3-box-ethyl", "ethylbenzene", S("ethylbenzene"),
         {"acid": ("benzoic acid", "The whole chain is cut back to one carbon: the benzylic carbon becomes COOH and the rest leaves."),
          "long": ("2-phenylacetic acid", "The benzylic carbon is the one that is attacked, so it becomes COOH. The chain does not survive beyond it."),
          "ket": ("acetophenone", "Hot KMnO4 does not stop at the ketone. It cuts the chain back to the ring carbon.")}, "acid", 1),
        ("u3-box-pxylene", "1,4-dimethylbenzene", S("pxylene"),
         {"di": ("terephthalic acid", "Both CH3 groups have benzylic H, so both become COOH."),
          "mono": ("4-methylbenzoic acid", "KMnO4 is in excess, and the second CH3 has benzylic H too."),
          "none": ("1,4-dimethylbenzene", "Each methyl has three benzylic H, so it is oxidised.")}, "di", 1),
        ("u3-box-tbu", "1-tert-butyl-4-methylbenzene", S("tbutoluene"),
         {"one": ("4-tert-butylbenzoic acid", "The CH3 has benzylic H and becomes COOH. The tert-butyl carbon bonded to the ring has no H, so it survives."),
          "both": ("terephthalic acid", "The tert-butyl group has no benzylic H, so KMnO4 cannot start on it."),
          "none": ("1-tert-butyl-4-methylbenzene", "The CH3 still has three benzylic H, so that side reacts.")}, "one", 2),
    ]
    for id, sname, smi, names, correct, level in cases:
        out = benzylic_oxidation(smi)
        opts = {k: opsin_smiles(v[0]) for k, v in names.items()}
        mcq(node, id, f"Heat {sname} with KMnO₄, then acidify. Pick the product.",
            [(k, v[0][0].upper() + v[0][1:], v[1]) for k, v in names.items()],
            key_eq(opts, out), correct,
            "Every side chain with a benzylic H is cut back to COOH; a side chain with no benzylic H survives.",
            prov("Rule 4 benzylic oxidation", sec),
            structure(smi, sname, f"{sname} + KMnO₄, heat; H₃O⁺"),
            tiles={k: named(opts[k], v[0]) for k, v in names.items()}, level=level, concepts=concepts)

    tb = S("tbubenzene")
    derived = "none" if canon(benzylic_oxidation(tb)) == canon(tb) else None
    mcq(node, "u3-box-tbu-alone", "Heat tert-butylbenzene with KMnO₄. Pick the outcome.",
        [("none", "No oxidation", "The carbon bonded to the ring has no H, so KMnO4 has nowhere to start."),
         ("acid", "Benzoic acid", "That needs a benzylic H to begin. This carbon carries three CH3 and no H."),
         ("ring", "The ring is oxidised", "The aromatic ring resists KMnO4; only benzylic C-H bonds are attacked.")],
        derived, "none",
        "No benzylic H, no reaction. tert-Butyl groups survive KMnO4.",
        prov(f"benzylic H count {benzylic_h_count(tb)}", sec), structure(tb, N("tbubenzene"), "tert-butylbenzene + KMnO₄, heat"),
        concepts=concepts)

    tol = S("toluene")
    ba = benzylic_oxidation(tol)
    derived = "flip" if one_class(tol) == "alkyl" and one_class(ba) == "withdrawer" else None
    mcq(node, "u3-box-flip", "Compare toluene with benzoic acid. Pick what oxidation did to the ring.",
        [("flip", "o/p activator became meta deactivator", "CH3 was an alkyl group (o/p, activating). COOH has C=O on the first carbon, so it pulls electrons and directs meta."),
         ("same", "Nothing, both are carbon groups", "The first carbon went from CH3 to C=O with an OH. That makes it a withdrawer."),
         ("more", "It made the ring more activated", "The carbonyl withdraws electrons, so the ring becomes slower, not faster.")],
        derived, "flip",
        "Oxidising CH3 to COOH flips o/p to meta. Use it to reach meta patterns that an alkyl group cannot give.",
        prov("Rule 1 on both structures", sec), pair(named(tol, "toluene"), named(ba, "benzoic acid")), concepts=("ewg_edg_rubric",))


# ---------------------------------------------------------------------------
# u3-birch (branch)
# ---------------------------------------------------------------------------

def node_birch() -> None:
    node = "u3-birch"
    sec = "16.10"
    concepts = ("ewg_edg_rubric",)
    conv = "Birch regiochemistry: a donor's ring carbon stays on a C=C, a withdrawer's goes sp3"
    cases = [
        ("u3-bir-meet", "benzene", S("benzene"),
         {"14": ("cyclohexa-1,4-diene", "Two para carbons pick up H and the two C=C left are not conjugated."),
          "13": ("cyclohexa-1,3-diene", "The Birch product's two C=C are separated by sp3 carbons on both sides, not next to each other."),
          "hex": ("cyclohexane", "Birch adds only two H atoms. Full hydrogenation needs H2 and a metal catalyst.")}, "14", 0),
        ("u3-bir-anisole", "anisole", S("anisole"),
         {"on": ("1-methoxycyclohexa-1,4-diene", "OMe is a donor, so its carbon stays on a C=C. The sp3 carbons are ortho and meta to it."),
          "off": ("3-methoxycyclohexa-1,4-diene", "That puts OMe on an sp3 carbon. A donor's carbon stays on a C=C in the Birch product."),
          "13": ("1-methoxycyclohexa-1,3-diene", "Birch dienes are 1,4, not conjugated.")}, "on", 1),
        ("u3-bir-acid", "benzoic acid", S("benzoic"),
         {"sp3": ("cyclohexa-2,5-diene-1-carboxylic acid", "COOH is a withdrawer, so its carbon goes sp3 and the C=C bonds sit away from it."),
          "on": ("cyclohexa-1,4-diene-1-carboxylic acid", "That keeps the withdrawer's carbon on a C=C. A withdrawer's carbon is the one that picks up H."),
          "full": ("cyclohexanecarboxylic acid", "Birch adds two H, not six.")}, "sp3", 1),
        ("u3-bir-toluene", "toluene", S("toluene"),
         {"on": ("1-methylcyclohexa-1,4-diene", "An alkyl group behaves like a donor: its carbon stays on a C=C."),
          "off": ("3-methylcyclohexa-1,4-diene", "That puts the CH3 on an sp3 carbon, the withdrawer pattern."),
          "13": ("1-methylcyclohexa-1,3-diene", "The Birch diene is 1,4: the two C=C are not conjugated.")}, "on", 2),
    ]
    for id, sname, smi, names, correct, level in cases:
        out = birch(smi)
        opts = {k: opsin_smiles(v[0]) for k, v in names.items()}
        mcq(node, id, f"Treat {sname} with Na, NH₃(l) and EtOH. Pick the product.",
            [(k, v[0][0].upper() + v[0][1:], v[1]) for k, v in names.items()],
            key_eq(opts, out), correct,
            "Birch reduction adds H to two para carbons and leaves a nonconjugated 1,4-diene.",
            prov("Rule 4 Birch placement", sec, conv if id != "u3-bir-meet" else None),
            structure(smi, sname, f"{sname} + Na, NH₃(l), EtOH"),
            tiles={k: named(opts[k], v[0]) for k, v in names.items()}, level=level, concepts=concepts,
            convention=conv if id != "u3-bir-meet" else None)

    p = birch(S("benzene"))
    pm = mol(p)
    conj = any(b.GetIsConjugated() for b in pm.GetBonds() if b.GetBondType() == Chem.BondType.SINGLE)
    derived = "no" if not conj and not is_aromatic(p) else None
    mcq(node, "u3-bir-conj", "Look at cyclohexa-1,4-diene. Pick what it is.",
        [("no", "Not aromatic, and the C=C are not conjugated", "Two sp3 carbons sit between the C=C bonds, so the pi bonds never share a p orbital system."),
         ("conj", "Not aromatic, but conjugated", "Conjugated C=C need a single bond between them. Here each gap is an sp3 CH2."),
         ("arom", "Still aromatic", "Two sp3 carbons break the ring's p orbital loop. The aromaticity is gone.")],
        derived, "no",
        "The Birch product has isolated C=C bonds and no aromaticity.",
        prov("RDKit conjugation and aromatic flags on cyclohexa-1,4-diene", sec), structure(p, "cyclohexa-1,4-diene"), concepts=concepts)

    n_sp3 = sum(1 for a in pm.GetAtoms() if a.GetHybridization() == Chem.HybridizationType.SP3)
    derived = {2: "two", 4: "four", 6: "six"}.get(n_sp3)
    mcq(node, "u3-bir-sp3", "Count the sp3 carbons in benzene's Birch product.",
        [("two", "2", "Two para carbons each picked up an H and went sp3. The other four stay on the two C=C."),
         ("four", "4", "Four sp3 carbons would leave only one C=C. Birch keeps two."),
         ("six", "6", "That is cyclohexane, which needs full hydrogenation.")],
        derived, "two",
        "Two sp3 carbons, para to each other, between the two C=C.",
        prov(f"RDKit hybridisation count: {n_sp3}", sec), structure(p, "cyclohexa-1,4-diene"), level=0, concepts=concepts)


# ---------------------------------------------------------------------------
# Exam extras (match boards built on derived reactions)
# ---------------------------------------------------------------------------

def exam_boards() -> None:
    sec = "16.9"
    tol = S("toluene")
    m = mol(tol)
    r = substituents(tol)[0][0]

    def what_changed(prod: str | None) -> str | None:
        if prod is None:
            return None
        p = mol(prod)
        if not is_aromatic(prod):
            return "the ring loses aromaticity"
        ring = benzene_ring(p)
        ring_br = any(n.GetSymbol() == "Br" for i in ring for n in p.GetAtomWithIdx(i).GetNeighbors())
        if ring_br:
            return "Br on the ring"
        if p.HasSubstructMatch(mol("BrCc1ccccc1")):
            return "Br on the CH₃ carbon"
        if p.HasSubstructMatch(Chem.MolFromSmarts("c[CX3](=O)[OX2H1]")):
            return "CH₃ becomes COOH"
        return None

    ring_br = attach(tol, [s for s in ring_sites(tol) if relation(m, r, s) == "para"][0], "Br")
    pairs = [
        ("fe", "Br₂, FeBr₃", "Br on the ring", "A Lewis acid makes an electrophile, and electrophiles attack the ring's pi electrons.", what_changed(ring_br)),
        ("nbs", "NBS, light", "Br on the CH₃ carbon", "Light makes bromine radicals, which take the weak benzylic C-H.", what_changed(benzylic_bromination(tol))),
        ("kmno4", "KMnO₄, heat", "CH₃ becomes COOH", "The benzylic carbon is oxidised all the way to the acid.", what_changed(benzylic_oxidation(tol))),
        ("birch", "Na, NH₃(l), EtOH", "the ring loses aromaticity", "Birch adds H to two para ring carbons, leaving a 1,4-diene.", what_changed(birch(tol))),
    ]
    match("u3-exam", "u3-exam-match-toluene", "Match each reagent to what it does to toluene.",
          "Ring, side chain, or the whole ring system: each reagent hits one.", pairs,
          "Same toluene, four reagents, four different sites: the reagent picks the site.",
          prov("each product built by Rules 2 and 4 on toluene, then described from the structure", sec), ("ewg_edg_rubric",))

    pairs = []
    for pid, left, key, op in (("no2", "Nitrobenzene + Sn, HCl", "nitrobenzene", reduce_nitro),
                               ("ket", "Acetophenone + Zn(Hg), HCl", "acetophenone", aldehyde_or_ketone_to_ch2),
                               ("ox", "Toluene + KMnO₄", "toluene", benzylic_oxidation)):
        before, after = one_class(S(key)), one_class(op(S(key)))
        right = {("withdrawer", "donor"): "meta to o/p, by a lone pair", ("withdrawer", "alkyl"): "meta to o/p, now an alkyl",
                 ("alkyl", "withdrawer"): "o/p to meta"}.get((before, after))
        why = {"no2": "N+ with two N-O bonds becomes NH2, which has a lone pair to give.",
               "ket": "C=O becomes CH2, so the group is a plain alkyl.",
               "ox": "CH3 becomes COOH, which has C=O on the first carbon."}[pid]
        pairs.append((pid, left, right or "", why, right))
    match("u3-exam", "u3-exam-match-flip", "Match each step to how it changes the group's directing effect.",
          "Classify the group before and after.", pairs,
          "Three steps that flip a director: use them to reach patterns no single group gives.",
          prov("Rule 1 on each structure before and after its Rule 4 edit", "16.11"), ("ewg_edg_rubric",))


# ---------------------------------------------------------------------------
# Build, emit
# ---------------------------------------------------------------------------

def build() -> None:
    run_class_fixtures()
    node_arenium()
    node_halo()
    node_nitration()
    node_sulfo()
    node_fc_acyl()
    node_directing()
    node_blocking()
    node_nitro_red()
    node_c_to_ch2()
    node_sequencing()
    node_fc_alkyl()
    node_benzylic_br()
    node_benzylic_ox()
    node_birch()
    exam_boards()
    check_names()
    for node, entries in POOLS.items():
        if node != "u3-exam" and not 6 <= len(entries) <= 12:
            fail(f"{node}: {len(entries)} items, outside 6 to 12")
    # The right answer should not sit in one slot every time.
    for slot in range(4):
        share = CORRECT_INDEX.count(slot) / max(1, len(CORRECT_INDEX))
        if share > 0.6:
            fail(f"{share:.0%} of MCQs put the answer in slot {slot}")


HEADER = '''/**
 * Unit 3 (electrophilic aromatic substitution) problem pools, a DRAFT.
 * GENERATED by scripts/u3_pools.py. Do not edit by hand: edit the specs in the
 * script and rerun it.
 *
 * EVERY ENTRY IS A DRAFT (`placeholder: true`) for the owner's review, never
 * presented as done. Each answer was derived by the script (a substituent
 * classifier, ring path relations, a sigma complex walk, and reaction edits,
 * all canonicalised by RDKit; every name read back by OPSIN), and the script
 * refuses to write this file when an authored key disagrees with what it
 * derived. Where an answer rests on an authored convention RDKit cannot check,
 * the entry's provenance says so.
 *
 * U3_UNWIRED holds the unit's sort ladders and match boards under `u3-exam`,
 * which is not a map node. NOTHING PLAYS THEM YET: pool ladders and boards
 * only play in an in-a-row run, Unit 3 has no practice node, and the one place
 * they would fit, the Unit 3 checkpoint, is pinned to its derived mix by
 * test/u1Pools.test.ts and test/checkpointStakes.test.ts. Wiring them is an
 * owner decision, listed in the unit's owner report.
 *
 * Ladders are built with createProblem and createOrderingAnswer exactly as
 * content/u2/pools.ts does; match boards go through buildMatchBoard, the
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
import type { PoolEntry, UnitPools } from "../u1/types";
'''


def ladder_helpers() -> str:
    """The ladder() and match() helpers, the same text content/u2/pools.ts carries."""
    src = (REPO / "src" / "game" / "content" / "u2" / "pools.ts").read_text(encoding="utf-8")
    start = src.index("interface Expl {")
    end = src.index("export const U2_POOLS")
    body = src[start:end]
    return body.replace('"u2-pool"', '"u3-pool"')


def ts(value) -> str:
    return json.dumps(value, ensure_ascii=False, indent=2)


def emit_table(name: str, nodes: list[str], doc: str) -> list[str]:
    out = [doc, f"export const {name}: UnitPools = {{"]
    for node in nodes:
        entries = POOLS[node]
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
    return out


def emit() -> str:
    out = [HEADER, ladder_helpers()]
    lessons = [n for n in POOLS if n != "u3-exam"]
    out += emit_table("U3_POOLS", lessons, "/** Lesson pools keyed by map node id. Each lesson plays its MCQs (beats/practice/pools.ts). */")
    out += emit_table("U3_UNWIRED", ["u3-exam"], "/** Ladders and boards drafted for the checkpoint. Nothing plays them yet: see the header. */")
    out.append("/** The drawing beside each MCQ, keyed by beat id. */")
    out.append("export const U3_VISUALS: Readonly<Record<string, McqVisual>> = " + ts(VISUALS) + ";\n")
    out.append("/** Drawn options, keyed by beat id then option id. All or nothing per beat. */")
    out.append("export const U3_OPTION_TILES: Readonly<Record<string, Readonly<Record<string, NamedFigure>>>> = " + ts(TILES) + ";\n")
    out.append("/** A drawing for every sort card, keyed by beat id then item id. */")
    out.append("export const U3_SORT_FIGURES: Readonly<Record<string, Readonly<Record<string, NamedFigure>>>> = " + ts(SORT_FIGURES) + ";\n")
    return "\n".join(out)


def reset() -> None:
    for table in (POOLS, VISUALS, TILES, SORT_FIGURES, CONVENTIONS):
        table.clear()
    for seq in (CORRECT_INDEX, NAME_CHECKS, FAILURES, NOTES):
        seq.clear()
    IDS.clear()


def main() -> int:
    global COLLECT
    COLLECT = True
    try:
        build()
    except Exception:  # the collecting pass runs on placeholder structures; only the names matter
        pass
    COLLECT = False
    prefetch_opsin()
    reset()
    build()
    if FAILURES:
        print("REFUSED. Nothing written:")
        for f in FAILURES:
            print("  " + f)
        return 1
    text = emit()
    if EM_DASH in text:
        print("REFUSED: an em dash reached the output")
        return 1
    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_text(text, encoding="utf-8", newline="\n")
    total = 0
    for node, entries in POOLS.items():
        print(f"{node}: {len(entries)}")
        total += len(entries)
    print(f"total: {total}")
    print("answer slot spread: " + ", ".join(f"{s}: {CORRECT_INDEX.count(s)}" for s in range(4)))
    print("entries resting on an authored convention:")
    for k, v in CONVENTIONS.items():
        print(f"  {k}: {v}")
    print(f"wrote {OUT.relative_to(REPO)}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
