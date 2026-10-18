"""
Unit 1 problem pools, stages A and B, derived with RDKit.

Run:     python scripts/u1_pools_ab.py
Writes:  src/game/content/u1/stage-ab.ts. Never edit that file by hand: edit
         the problem specs below and rerun.

WHY A GENERATOR. The owner's rule is "derive, never assert": any structure,
product, regiochemistry or ranking a student sees comes from a script, not
from recall. So every problem below states the CHEMISTRY as SMILES and the
QUESTION as copy, and the script works out the answer itself and refuses to
write the file when the authored key disagrees with what it derived.

WHAT IS DERIVED, AND THE MODEL BEHIND EACH CALL. These are teaching models,
the same ones the takeaways in the Unit 1 build prompt state, written down so
the owner can check the model rather than a hundred answers.

  Charge positions   RDKit's ResonanceMolSupplier enumerates the contributors
                     of an ion. The carbons that carry the charge in any
                     contributor are the "positions". A radical is enumerated
                     through its cation analogue (same atoms, the unpaired
                     electron swapped for a + charge), because the allylic and
                     benzylic delocalisation pattern is the same.

  Cation and radical stability factors, per species:
                     n    how many carbons share the charge (resonance)
                     max  carbon neighbours of the best position (substitution)
                     sum  carbon neighbours summed over all positions
  Anion stability factors:
                     n    as above
                     s    s character of the charged carbon in the first
                          contributor: 50 in a triple bond, 33 in a double
                          bond, 25 otherwise
                     -alk the alkyl (sp3, non delocalised) carbons on the
                          charged positions, negated, because alkyl groups
                          destabilise a carbanion

  Ranking rule for cations and anions: DOMINANCE. A is more stable than B only
  when A is at least as good on every factor and better on one. When the
  factors point opposite ways the taught rules cannot decide, and the script
  refuses to rank that pair in a ladder or to use it as correct against
  distractor. This is what keeps "1 degree allylic is about as stable as
  2 degree alkyl" from being silently ranked either way.

  The one exception, used only where a problem says so: the takeaway scale
  for cations, max + (n - 1), which is the takeaway's own "a 1 degree allylic
  cation is about as stable as a 2 degree alkyl one" written as arithmetic.

  Ranking rule for radicals: resonance first (n), then substitution (max,
  sum). The radical takeaway says allylic and benzylic radicals are the best,
  and the allylic C-H bond (about 88 kcal/mol in propene) is weaker than a
  tertiary C-H (about 96.5), so resonance outranks substitution here, unlike
  for cations. This is a modelling choice the owner should check.

  Diene addition:    for each conjugated C=C-C=C, the electrophile (H or X)
                     goes on a terminal carbon, the cation forms on the next
                     carbon and is shared with the far terminus. The cation is
                     ranked with the dominance rule above; the better
                     orientation is the one that runs. 1,2 product: the
                     nucleophile on the carbon next to the electrophile. 1,4
                     product: the nucleophile on the far terminus, the double
                     bond moved to the middle.
  Thermodynamic call: the product whose C=C carries more carbon substituents.
                     Equal counts means the rule cannot call it, and the
                     problem says so rather than picking one.
  Kinetic call:      the 1,2 product, the course's proximity rule. The script
                     only uses it where the 1,2 carbon is at least as
                     substituted as the 1,4 carbon, so proximity and charge
                     agree and the call does not hang on a contested argument.

  Energy diagrams:   the figure is drawn from numbers (TS height and product
                     depth for two products), and the answer is read off the
                     same numbers.

CHECKED AGAINST, never adapted (licensed problems are a check only):
  OpenStax Organic Chemistry (CC BY-NC-SA 4.0), 14.2 "Electrophilic Additions
  to Conjugated Dienes: Allylic Carbocations" and 14.3 "Kinetic versus
  Thermodynamic Control of Reactions"; 7.9 "Carbocation Structure and
  Stability"; 10.5 "Stability of the Allyl Radical: Resonance Revisited".
  https://openstax.org/books/organic-chemistry/pages/14-2-electrophilic-additions-to-conjugated-dienes-allylic-carbocations
  https://openstax.org/books/organic-chemistry/pages/14-3-kinetic-versus-thermodynamic-control-of-reactions
  https://openstax.org/books/organic-chemistry/pages/7-9-carbocation-structure-and-stability
  https://openstax.org/books/organic-chemistry/pages/10-5-stability-of-the-allyl-radical-resonance-revisited
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
OUT = REPO / "src" / "game" / "content" / "u1" / "stage-ab.ts"

SCRIPT = "scripts/u1_pools_ab.py"
OS_14_2 = "OpenStax Organic Chemistry 14.2 (CC BY-NC-SA), read as a check only"
OS_14_3 = "OpenStax Organic Chemistry 14.3 (CC BY-NC-SA), read as a check only"
OS_7_9 = "OpenStax Organic Chemistry 7.9 (CC BY-NC-SA), read as a check only"
OS_10_5 = "OpenStax Organic Chemistry 10.5 (CC BY-NC-SA), read as a check only"

FAILURES: list[str] = []


def fail(msg: str) -> None:
    FAILURES.append(msg)


# ---------------------------------------------------------------------------
# Chemistry
# ---------------------------------------------------------------------------


def mol(smi: str) -> Chem.Mol:
    m = Chem.MolFromSmiles(smi)
    if m is None:
        raise ValueError(f"RDKit refused SMILES {smi}")
    return m


def canon(smi: str) -> str:
    return Chem.MolToSmiles(mol(smi))


def is_radical(m: Chem.Mol) -> bool:
    return any(a.GetNumRadicalElectrons() > 0 for a in m.GetAtoms())


def cation_analogue(m: Chem.Mol) -> Chem.Mol:
    """Swap each unpaired electron for a + charge, keeping atom indices."""
    rw = Chem.RWMol(m)
    for a in rw.GetAtoms():
        if a.GetNumRadicalElectrons() == 1:
            a.SetNumRadicalElectrons(0)
            a.SetFormalCharge(1)
            a.SetNoImplicit(True)
    out = rw.GetMol()
    Chem.SanitizeMol(out)
    return out


def positions(smi: str) -> list[int]:
    """Atom indices that carry the charge (or the odd electron) in any contributor."""
    m = mol(smi)
    probe = cation_analogue(m) if is_radical(m) else m
    found: set[int] = set()
    for contributor in Chem.ResonanceMolSupplier(probe):
        if contributor is None:
            continue
        for a in contributor.GetAtoms():
            if a.GetFormalCharge() != 0 and a.GetSymbol() == "C":
                found.add(a.GetIdx())
    if not found:
        raise ValueError(f"{smi} has no charged or radical carbon")
    return sorted(found)


def kind_of(smi: str) -> str:
    m = mol(smi)
    if is_radical(m):
        return "radical"
    charge = sum(a.GetFormalCharge() for a in m.GetAtoms())
    return "cation" if charge > 0 else "anion"


def carbon_neighbours(m: Chem.Mol, idx: int) -> int:
    return sum(1 for n in m.GetAtomWithIdx(idx).GetNeighbors() if n.GetSymbol() == "C")


def in_multiple_bond(m: Chem.Mol, idx: int) -> bool:
    return any(b.GetBondTypeAsDouble() > 1 for b in m.GetAtomWithIdx(idx).GetBonds())


def s_character(m: Chem.Mol, idx: int) -> int:
    orders = [b.GetBondTypeAsDouble() for b in m.GetAtomWithIdx(idx).GetBonds()]
    if 3.0 in orders:
        return 50
    if 2.0 in orders or 1.5 in orders:
        return 33
    return 25


def factors(smi: str) -> tuple[int, ...]:
    m = mol(smi)
    pos = positions(smi)
    if kind_of(smi) == "anion":
        charged = [a.GetIdx() for a in m.GetAtoms() if a.GetFormalCharge() < 0][0]
        # A carbon inside the delocalised system is not an alkyl group: the
        # middle carbon of an allyl anion is the pi partner, not a substituent.
        alkyl = sum(alkyl_on(m, p, pos) for p in pos)
        return (len(pos), s_character(m, charged), -alkyl)
    subs = [carbon_neighbours(m, p) for p in pos]
    return (len(pos), max(subs), sum(subs))


def compare(a: str, b: str) -> int:
    """+1 when a is more stable, -1 when b is, 0 when the taught rules cannot decide."""
    ka, kb = kind_of(a), kind_of(b)
    if ka != kb:
        raise ValueError(f"comparing a {ka} with a {kb}")
    fa, fb = factors(a), factors(b)
    if ka == "radical":
        return (fa > fb) - (fa < fb)
    ge = all(x >= y for x, y in zip(fa, fb))
    le = all(x <= y for x, y in zip(fa, fb))
    if ge and not le:
        return 1
    if le and not ge:
        return -1
    return 0


def takeaway_scale(smi: str) -> int:
    n, best, _ = factors(smi)
    return best + (n - 1)


def most_stable(smis: list[str]) -> str | None:
    """The one species every other is decidably below, or None."""
    for s in smis:
        if all(compare(s, t) == 1 for t in smis if t != s):
            return s
    return None


def least_stable(smis: list[str]) -> str | None:
    for s in smis:
        if all(compare(s, t) == -1 for t in smis if t != s):
            return s
    return None


def chain_ok(order: list[str]) -> bool:
    """Every adjacent pair of a ladder is decidable and in the authored direction."""
    return all(compare(order[i], order[i + 1]) == 1 for i in range(len(order) - 1))


def contributor_charge_subs(smi: str) -> list[int]:
    """For each charge position, the carbon substitution there (major contributor finding)."""
    m = mol(smi)
    return [carbon_neighbours(m, p) for p in positions(smi)]


def alkyl_on(m: Chem.Mol, idx: int, pos: list[int]) -> int:
    return sum(
        1
        for n in m.GetAtomWithIdx(idx).GetNeighbors()
        if n.GetSymbol() == "C" and n.GetIdx() not in pos and not in_multiple_bond(m, n.GetIdx())
    )


# --- dienes -----------------------------------------------------------------


def diene_units(m: Chem.Mol) -> list[tuple[int, int, int, int]]:
    """Every a=b-c=d path of non aromatic carbons, both directions."""
    out = []
    for b1 in m.GetBonds():
        if b1.GetBondType() != Chem.BondType.DOUBLE:
            continue
        for a, b in ((b1.GetBeginAtomIdx(), b1.GetEndAtomIdx()), (b1.GetEndAtomIdx(), b1.GetBeginAtomIdx())):
            for nb in m.GetAtomWithIdx(b).GetNeighbors():
                c = nb.GetIdx()
                if c == a:
                    continue
                if m.GetBondBetweenAtoms(b, c).GetBondType() != Chem.BondType.SINGLE:
                    continue
                for nc in m.GetAtomWithIdx(c).GetNeighbors():
                    d = nc.GetIdx()
                    if d == b:
                        continue
                    if m.GetBondBetweenAtoms(c, d).GetBondType() == Chem.BondType.DOUBLE:
                        out.append((a, b, c, d))
    return out


def _finish(rw: Chem.RWMol) -> str:
    out = rw.GetMol()
    for a in out.GetAtoms():
        a.SetNoImplicit(False)
        a.SetNumExplicitHs(0)
    Chem.SanitizeMol(out)
    return Chem.MolToSmiles(out)


def add_across(diene: str, unit, e: str, nu: str, mode: str) -> str:
    """mode '12', '14' or 'cation'. e is 'H' or a halogen symbol."""
    a, b, c, d = unit
    rw = Chem.RWMol(mol(diene))
    rw.GetBondBetweenAtoms(a, b).SetBondType(Chem.BondType.SINGLE)
    if e != "H":
        x = rw.AddAtom(Chem.Atom(e))
        rw.AddBond(a, x, Chem.BondType.SINGLE)
    if mode == "cation":
        rw.GetAtomWithIdx(b).SetFormalCharge(1)
        return _finish(rw)
    y = rw.AddAtom(Chem.Atom(nu))
    if mode == "12":
        rw.AddBond(b, y, Chem.BondType.SINGLE)
    else:
        rw.GetBondBetweenAtoms(b, c).SetBondType(Chem.BondType.DOUBLE)
        rw.GetBondBetweenAtoms(c, d).SetBondType(Chem.BondType.SINGLE)
        rw.AddBond(d, y, Chem.BondType.SINGLE)
    return _finish(rw)


def alkene_substitution(smi: str) -> int:
    """Carbon substituents on the most substituted non aromatic C=C."""
    m = mol(smi)
    best = -1
    for bond in m.GetBonds():
        if bond.GetBondType() != Chem.BondType.DOUBLE:
            continue
        i, j = bond.GetBeginAtomIdx(), bond.GetEndAtomIdx()
        if m.GetAtomWithIdx(i).GetSymbol() != "C" or m.GetAtomWithIdx(j).GetSymbol() != "C":
            continue
        count = carbon_neighbours(m, i) - 1 + carbon_neighbours(m, j) - 1
        best = max(best, count)
    return best


def diene_addition(diene: str, e: str, nu: str) -> dict:
    """Run the addition. Returns the winning orientation and the losers for distractors."""
    m = mol(diene)
    runs = []
    for unit in diene_units(m):
        cat = add_across(diene, unit, e, nu, "cation")
        runs.append(
            {
                "unit": unit,
                "cation": cat,
                "p12": add_across(diene, unit, e, nu, "12"),
                "p14": add_across(diene, unit, e, nu, "14"),
            }
        )
    if not runs:
        raise ValueError(f"{diene} has no conjugated diene")
    winners = [r for r in runs if all(compare(r["cation"], s["cation"]) >= 0 for s in runs)]
    winners = [r for r in winners if all(compare(r["cation"], s["cation"]) == 1 or canon(r["cation"]) == canon(s["cation"]) for s in runs)]
    if not winners:
        raise ValueError(f"{diene}: no orientation gives a decidably best cation")
    win = winners[0]
    for r in winners:
        if {canon(r["p12"]), canon(r["p14"])} != {canon(win["p12"]), canon(win["p14"])}:
            raise ValueError(f"{diene}: two winning orientations give different products")
    losers = [r for r in runs if canon(r["cation"]) != canon(win["cation"])]
    p12, p14 = canon(win["p12"]), canon(win["p14"])
    s12, s14 = alkene_substitution(p12), alkene_substitution(p14)
    thermo = p12 if s12 > s14 else p14 if s14 > s12 else None
    if p12 == p14:
        thermo = p12
    # Kinetic: the 1,2 product, only where proximity and charge agree.
    a, b, c, d = win["unit"]
    sub_b = carbon_neighbours(m, b)
    sub_d = carbon_neighbours(m, d)
    kinetic = p12 if (p12 == p14 or sub_b >= sub_d) else None
    return {
        "attacked": a,
        "cation": canon(win["cation"]),
        "p12": p12,
        "p14": p14,
        "thermo": thermo,
        "kinetic": kinetic,
        "alkene_subs": (s12, s14),
        "losers": [{"attacked": r["unit"][0], "cation": canon(r["cation"]), "p12": canon(r["p12"]), "p14": canon(r["p14"])} for r in losers],
    }


# ---------------------------------------------------------------------------
# Figures: RDKit 2D coordinates into the 120 by 84 Figure spec
# ---------------------------------------------------------------------------

W, H = 120, 84
EM_DASH = chr(0x2014)
MINUS = "−"
DOT = "•"


def r1(v: float) -> float:
    return round(v, 1)


def figure(smi: str, marks: list[int] | None = None, numbers: dict[int, str] | None = None) -> dict:
    """
    A skeletal drawing. Carbons are vertices, heteroatoms are labels, a charge
    or an odd electron is a small mark beside its carbon. `marks` circles
    atoms (the figure vocabulary's "this one"). `numbers` writes a small
    locant beside an atom.
    """
    m = Chem.Mol(mol(smi))
    Chem.Kekulize(m, clearAromaticFlags=True)
    rdDepictor.Compute2DCoords(m)
    conf = m.GetConformer()
    pts = [(conf.GetAtomPosition(i).x, -conf.GetAtomPosition(i).y) for i in range(m.GetNumAtoms())]
    marks = marks or []
    numbers = numbers or {}

    if m.GetNumAtoms() == 1:
        a = m.GetAtomWithIdx(0)
        t = "CH_3" + ("^+" if a.GetFormalCharge() > 0 else "^" + MINUS if a.GetFormalCharge() < 0 else "")
        if a.GetNumRadicalElectrons():
            t = "CH_3" + DOT
        return {"labels": [{"x": 60, "y": 47, "t": t, "size": 16}]}

    if m.GetNumAtoms() == 2:
        # Two carbons drawn as two bare vertices read as nothing (a lone "="),
        # so the smallest species are drawn the way textbooks draw them: each
        # carbon written out with its hydrogens, the bond between them.
        out_labels = []
        xs2 = [38.0, 82.0]
        for a in m.GetAtoms():
            hs = a.GetTotalNumHs()
            t = a.GetSymbol() + ("H" if hs else "") + (f"_{hs}" if hs > 1 else "")
            if a.GetFormalCharge() > 0:
                t += "^+"
            elif a.GetFormalCharge() < 0:
                t += "^" + MINUS
            elif a.GetNumRadicalElectrons():
                t += DOT
            out_labels.append({"x": xs2[a.GetIdx()], "y": 47, "t": t, "size": 14})
        order = int(m.GetBondWithIdx(0).GetBondTypeAsDouble())
        bond = {"x1": 51, "y1": 42, "x2": 69, "y2": 42}
        if order > 1:
            bond["order"] = order
        fig2 = {"bonds": [bond], "labels": out_labels}
        check_bounds(fig2, smi)
        return fig2

    xs = [p[0] for p in pts]
    ys = [p[1] for p in pts]
    span_x = max(xs) - min(xs) or 1.0
    span_y = max(ys) - min(ys) or 1.0
    # RDKit's bond length is 1.5 (coordgen) or about 1.0; measure it.
    lengths = [math.dist(pts[b.GetBeginAtomIdx()], pts[b.GetEndAtomIdx()]) for b in m.GetBonds()]
    unit = sum(lengths) / len(lengths)
    scale = 20.0 / unit
    scale = min(scale, 88.0 / span_x, 52.0 / span_y)
    cx = (max(xs) + min(xs)) / 2
    cy = (max(ys) + min(ys)) / 2

    def at(i: int) -> tuple[float, float]:
        return (W / 2 + (pts[i][0] - cx) * scale, H / 2 + 2 + (pts[i][1] - cy) * scale)

    labelled = {a.GetIdx() for a in m.GetAtoms() if a.GetSymbol() != "C"}

    def clearance(i: int, ux: float, uy: float) -> float:
        """
        How far a bond must stop short of a labelled atom so its line does not
        run into the letters. The label (size 13, bold) is treated as a box:
        about 0.55 em per letter wide and 0.7 em tall, plus a 1.5 unit gap.
        A flat 6 was enough for "O" but ran through "Br" and "Cl" (U1-P2 r4).
        """
        half_w = 0.55 * 13 * len(m.GetAtomWithIdx(i).GetSymbol()) / 2 + 1.5
        half_h = 0.7 * 13 / 2 + 1.5
        reach_x = half_w / abs(ux) if abs(ux) > 1e-6 else math.inf
        reach_y = half_h / abs(uy) if abs(uy) > 1e-6 else math.inf
        return max(6.0, min(reach_x, reach_y))

    bonds = []
    for b in m.GetBonds():
        i, j = b.GetBeginAtomIdx(), b.GetEndAtomIdx()
        (x1, y1), (x2, y2) = at(i), at(j)
        dx, dy = x2 - x1, y2 - y1
        length = math.hypot(dx, dy)
        ux, uy = dx / length, dy / length
        if i in labelled:
            cut = clearance(i, ux, uy)
            x1, y1 = x1 + ux * cut, y1 + uy * cut
        if j in labelled:
            cut = clearance(j, ux, uy)
            x2, y2 = x2 - ux * cut, y2 - uy * cut
        order = int(b.GetBondTypeAsDouble())
        bond = {"x1": r1(x1), "y1": r1(y1), "x2": r1(x2), "y2": r1(y2)}
        if order > 1:
            bond["order"] = order
        bonds.append(bond)

    def away(i: int, dist: float) -> tuple[float, float]:
        """A point `dist` out from atom i, in the widest gap between its bonds."""
        x, y = at(i)
        angles = sorted(math.atan2(ny - y, nx - x) for nx, ny in (at(n.GetIdx()) for n in m.GetAtomWithIdx(i).GetNeighbors()))
        if len(angles) == 1:
            theta = angles[0] + math.pi
        else:
            gaps = [((angles[(k + 1) % len(angles)] - angles[k]) % (2 * math.pi) or 2 * math.pi, angles[k]) for k in range(len(angles))]
            width, start_angle = max(gaps)
            theta = start_angle + width / 2
        return (x + math.cos(theta) * dist, y + math.sin(theta) * dist)

    labels = []
    for a in m.GetAtoms():
        i = a.GetIdx()
        if i in labelled:
            x, y = at(i)
            labels.append({"x": r1(x), "y": r1(y + 5), "t": a.GetSymbol(), "size": 13})
        mark = None
        if a.GetFormalCharge() > 0:
            mark = "+"
        elif a.GetFormalCharge() < 0:
            mark = MINUS
        elif a.GetNumRadicalElectrons():
            mark = DOT
        if mark is not None:
            x, y = away(i, 8)
            labels.append({"x": r1(x), "y": r1(y + 5), "t": mark, "size": 14})
        if i in numbers:
            x, y = away(i, 9 if mark is None else 15)
            labels.append({"x": r1(x), "y": r1(y + 4), "t": numbers[i], "size": 10})
    rings = []
    for i in marks:
        x, y = at(i)
        rings.append({"x": r1(x), "y": r1(y), "r": 6})

    fig: dict = {"bonds": bonds}
    if labels:
        fig["labels"] = labels
    if rings:
        fig["rings"] = rings
    check_bounds(fig, smi)
    return fig


def check_bounds(fig: dict, what: str) -> None:
    for b in fig.get("bonds", []):
        for k in ("x1", "x2"):
            if not 0 <= b[k] <= W:
                fail(f"figure {what}: bond {k} {b[k]} outside 0..{W}")
        for k in ("y1", "y2"):
            if not 0 <= b[k] <= H:
                fail(f"figure {what}: bond {k} {b[k]} outside 0..{H}")
    for lab in fig.get("labels", []):
        if not 2 <= lab["x"] <= W - 2 or not 6 <= lab["y"] <= H - 1:
            fail(f"figure {what}: label {lab['t']} at {lab['x']},{lab['y']} too near the edge")
    for r in fig.get("rings", []):
        if r["x"] - r["r"] < 0 or r["x"] + r["r"] > W or r["y"] - r["r"] < 0 or r["y"] + r["r"] > H:
            fail(f"figure {what}: marker ring outside the viewBox")


def energy_figure(
    ta: float,
    pa: float,
    tb: float,
    pb: float,
    start: float = 4.0,
    gaps: list[tuple[float, float, float, str]] | None = None,
    names: tuple[str, str] = ("A", "B"),
) -> dict:
    """
    A two product reaction coordinate diagram, drawn from numbers.

    Energies run 0 (low) to 10 (high). The common start sits in the middle,
    product A on the left, product B on the right. y grows downward in the
    figure, so energy e sits at y = 74 - 6e.
    """

    def y(e: float) -> float:
        return r1(74 - 6 * e)

    bonds = [{"x1": 4, "y1": 80, "x2": 4, "y2": 8, "arrow": True}]
    # start plateau
    bonds.append({"x1": 52, "y1": y(start), "x2": 68, "y2": y(start)})

    def hump(x_from: float, e_from: float, x_peak: float, e_peak: float, x_to: float, e_to: float) -> list[dict]:
        segs = []
        steps = 4
        prev = (x_from, y(e_from))
        for k in range(1, steps + 1):
            t = k / steps
            x = x_from + (x_peak - x_from) * t
            e = e_from + (e_peak - e_from) * math.sin(math.pi * t / 2)
            cur = (r1(x), y(e))
            segs.append({"x1": prev[0], "y1": prev[1], "x2": cur[0], "y2": cur[1]})
            prev = cur
        for k in range(1, steps + 1):
            t = k / steps
            x = x_peak + (x_to - x_peak) * t
            e = e_peak + (e_to - e_peak) * (1 - math.cos(math.pi * t / 2))
            cur = (r1(x), y(e))
            segs.append({"x1": prev[0], "y1": prev[1], "x2": cur[0], "y2": cur[1]})
            prev = cur
        return segs

    bonds += hump(52, start, 36, ta, 22, pa)
    bonds.append({"x1": 22, "y1": y(pa), "x2": 10, "y2": y(pa)})
    bonds += hump(68, start, 84, tb, 98, pb)
    bonds.append({"x1": 98, "y1": y(pb), "x2": 112, "y2": y(pb)})
    labels = [
        {"x": 16, "y": r1(y(pa) + 11), "t": names[0], "size": 12},
        {"x": 105, "y": r1(y(pb) + 11), "t": names[1], "size": 12},
        {"x": 10, "y": 10, "t": "G", "size": 11},
    ]
    # Gap arrows: (x, energy from, energy to, letter). Drawn as a reaction
    # arrow, which is the only arrowhead the figure vocabulary has.
    for gx, e_from, e_to, letter in gaps or []:
        bonds.append({"x1": gx, "y1": y(e_from), "x2": gx, "y2": y(e_to), "arrow": True})
        labels.append({"x": gx + 5, "y": r1((y(e_from) + y(e_to)) / 2 + 4), "t": letter, "size": 11, "anchor": "start"})
    fig = {"bonds": bonds, "labels": labels}
    check_bounds(fig, "energy diagram")
    return fig


# ---------------------------------------------------------------------------
# Output helpers
# ---------------------------------------------------------------------------

POOLS: dict[str, list[dict]] = {}
VISUALS: dict[str, dict] = {}
TILES: dict[str, dict] = {}
SORT_FIGURES: dict[str, dict] = {}
IDS: set[str] = set()


def named(smi: str, name: str, **kw) -> dict:
    return {"figure": figure(smi, **kw), "name": name}


def struct_visual(smi: str, name: str, **kw) -> dict:
    return {"kind": "structure", "figure": figure(smi, **kw), "name": name}


def pair_visual(a: tuple[str, str], b: tuple[str, str]) -> dict:
    return {"kind": "pair", "a": named(*a), "b": named(*b)}


def scheme_visual(left: str, left_name: str, over: str, under: str | None = None, right: str | None = None, right_name: str | None = None, left_kw: dict | None = None) -> dict:
    sch = {"left": figure(left, **(left_kw or {})), "leftName": left_name, "over": over}
    if under is not None:
        sch["under"] = under
    if right is not None:
        sch["right"] = figure(right)
        sch["rightName"] = right_name
    return {"kind": "scheme", "scheme": sch}


def energy_visual(name: str, *args, **kw) -> dict:
    return {"kind": "structure", "figure": energy_figure(*args, **kw), "name": name}


def mcq(
    node: str,
    id: str,
    prompt: str,
    options: list[tuple[str, str, str]],
    correct: str,
    explanation: str,
    provenance: str,
    visual: dict,
    tiles: dict | None = None,
    brief: str | None = None,
    level: int = 1,
    concepts: tuple[str, ...] = ("resonance_delocalisation",),
    conditions: str | None = None,
    derived: str | None = None,
) -> None:
    """
    One MCQ pool entry. `derived` is the option id the script worked out; it
    must equal the authored `correct`, or the file is not written.
    """
    if derived is not None and derived != correct:
        fail(f"{id}: authored answer {correct}, derived answer {derived}")
    if id in IDS:
        fail(f"duplicate id {id}")
    IDS.add(id)
    beat = {
        "kind": "mcq",
        "id": id,
        "node": node,
        "conceptIds": list(concepts),
        "levels": [level],
        "prompt": prompt,
    }
    if brief is not None:
        beat["brief"] = brief
    beat["correctOptionId"] = correct
    beat["options"] = [{"id": o, "text": t, "why": w} for o, t, w in options]
    entry = {"id": id, "item": {"kind": "mcq", "beat": beat}, "explanation": explanation}
    if conditions is not None:
        entry["conditions"] = conditions
    entry["provenance"] = provenance
    entry["placeholder"] = True
    POOLS.setdefault(node, []).append(entry)
    if visual is None and tiles is None:
        fail(f"{id}: a question with neither a drawing nor drawn options")
    if visual is not None:
        VISUALS[id] = visual
    if tiles is not None:
        if set(tiles) != {o for o, _, _ in options}:
            fail(f"{id}: tiles {sorted(tiles)} do not match options")
        TILES[id] = tiles


def ladder(
    node: str,
    id: str,
    species: list[tuple[str, str, str, str]],
    prompt: str,
    brief: str,
    criterion: str,
    direction: str,
    track: tuple[str, str],
    problem_prompt: str,
    solution: tuple[str, str, str],
    distractors: list[tuple[str, list[str], str, tuple[str, str, str]]],
    explanation: str,
    provenance: str,
    topic: str,
    concepts: tuple[str, ...],
    difficulty: int = 1100,
    conditions: str | None = None,
) -> None:
    """
    One sort ladder. `species` is (item id, card label, SMILES, why) in the
    authored order, most stable first. The script checks every adjacent pair
    is decidable in that direction before the ladder is written.
    """
    if id in IDS:
        fail(f"duplicate id {id}")
    IDS.add(id)
    # A card label names the species, never its rank: "tert-butyl, 3°" let a
    # student read the order off the labels (U1-P3 round 2 critic). The card
    # still draws the structure, so the student has to count from the drawing.
    for i, label, _, _ in species:
        if "°" in label or "allylic" in label or "C=C" in label or ", sp" in label:
            fail(f"{id}: card {i} label {label!r} gives the ranking away")
    smis = [s for _, _, s, _ in species]
    if not chain_ok(smis):
        bad = [(species[i][0], species[i + 1][0], compare(smis[i], smis[i + 1])) for i in range(len(smis) - 1)]
        fail(f"{id}: ladder order is not derivable: {bad}")
    order = [i for i, _, _, _ in species]
    for did, dorder, cause, _ in distractors:
        if sorted(dorder) != sorted(order):
            fail(f"{id}: distractor {did} is not a permutation")
        if dorder == order:
            fail(f"{id}: distractor {did} is the right answer")
    POOLS.setdefault(node, []).append(
        {
            "__ladder__": True,
            "id": id,
            "node": node,
            "problemId": "u1-" + id,
            "topic": topic,
            "difficulty": difficulty,
            "problemPrompt": problem_prompt,
            "criterionText": track[0].lower(),
            "items": [{"id": i, "text": label} for i, label, _, _ in species],
            "order": order,
            "solution": {"whatHappened": solution[0], "why": solution[1], "lookAt": solution[2]},
            "distractors": [
                {
                    "id": did,
                    "cause": cause,
                    "order": dorder,
                    "explanation": {"whatHappened": e[0], "why": e[1], "lookAt": e[2]},
                }
                for did, dorder, cause, e in distractors
            ],
            "beat": {
                "conceptIds": list(concepts),
                "prompt": prompt,
                "brief": brief,
                "criterion": criterion,
                "direction": direction,
                "notes": {i: why for i, _, _, why in species},
            },
            "trackEnds": {"first": track[0], "last": track[1]},
            "meanings": [
                {"id": did, "cause": "order_fully_reversed" if cause == "ordering_is_reversed" else "order_adjacent_pair_swapped"}
                for did, _, cause, _ in distractors
            ],
            "explanation": explanation,
            "conditions": conditions,
            "provenance": provenance,
        }
    )
    SORT_FIGURES[id] = {i: named(s, label) for i, label, s, _ in species}


def opt_for(answer_smi: str | None, table: dict[str, str]) -> str | None:
    """Which option id holds the derived SMILES."""
    if answer_smi is None:
        return None
    hits = [o for o, s in table.items() if s is not None and canon(s) == canon(answer_smi)]
    return hits[0] if len(hits) == 1 else None


def atom_index(smi: str, mapnum: int) -> int:
    for a in mol(smi).GetAtoms():
        if a.GetAtomMapNum() == mapnum:
            return a.GetIdx()
    raise ValueError(f"no atom map {mapnum} in {smi}")


def unmap(smi: str) -> str:
    m = mol(smi)
    for a in m.GetAtoms():
        a.SetAtomMapNum(0)
    return Chem.MolToSmiles(m, canonical=False)


def same_ion(a: str, b: str) -> bool:
    """True when a and b are two contributors of one species (same atoms, electrons moved)."""
    ma, mb = mol(a), mol(b)
    if is_radical(ma):
        ma, mb = cation_analogue(ma), cation_analogue(mb)
    forms = {Chem.MolToSmiles(c) for c in Chem.ResonanceMolSupplier(ma) if c is not None}
    return Chem.MolToSmiles(mb) in forms


def numbered(mapped: str, marks: tuple[int, ...] = (), show: bool = True) -> dict:
    """A figure from a SMILES with atom maps: maps become locants, `marks` circles by map."""
    nums = {}
    for a in mol(mapped).GetAtoms():
        if a.GetAtomMapNum() and show:
            nums[a.GetIdx()] = str(a.GetAtomMapNum())
    ring = [atom_index(mapped, k) for k in marks]
    return figure(unmap(mapped), marks=ring, numbers=nums)


def inner_product(diene: str, e: str, nu: str) -> str:
    """The electrophile on an INNER carbon, which leaves a non allylic cation on the end."""
    a, b, _, _ = diene_units(mol(diene))[0]
    rw = Chem.RWMol(mol(diene))
    rw.GetBondBetweenAtoms(a, b).SetBondType(Chem.BondType.SINGLE)
    if e != "H":
        x = rw.AddAtom(Chem.Atom(e))
        rw.AddBond(b, x, Chem.BondType.SINGLE)
    y = rw.AddAtom(Chem.Atom(nu))
    rw.AddBond(a, y, Chem.BondType.SINGLE)
    return _finish(rw)


def inner_cation(diene: str) -> str:
    """H+ on an inner carbon: the cation that forms on the end carbon."""
    a, b, _, _ = diene_units(mol(diene))[0]
    rw = Chem.RWMol(mol(diene))
    rw.GetBondBetweenAtoms(a, b).SetBondType(Chem.BondType.SINGLE)
    rw.GetAtomWithIdx(a).SetFormalCharge(1)
    return _finish(rw)


def saturate(smi: str, x: str) -> str:
    """Add X2 across every remaining C=C."""
    rw = Chem.RWMol(mol(smi))
    for bond in list(rw.GetBonds()):
        if bond.GetBondType() == Chem.BondType.DOUBLE:
            i, j = bond.GetBeginAtomIdx(), bond.GetEndAtomIdx()
            bond.SetBondType(Chem.BondType.SINGLE)
            for k in (i, j):
                n = rw.AddAtom(Chem.Atom(x))
                rw.AddBond(k, n, Chem.BondType.SINGLE)
    return _finish(rw)


def tile_set(table: dict[str, tuple[str, str]]) -> dict:
    return {o: named(s, name) for o, (s, name) in table.items()}


def pick(answer: str | None, table: dict[str, tuple[str, str]]) -> str | None:
    return opt_for(answer, {o: s for o, (s, _) in table.items()})


def prov(what: str, *pages: str) -> str:
    return f"{SCRIPT}: {what}. " + "; ".join(pages) + "."


# Copy caps, mirrored from src/game/beats/mcq/authoring.ts so a long line fails
# here, before the TS suite. The suite is still the authority.
CAPS = {"prompt": 90, "brief": 110, "option": 48, "why": 320}


def lint_copy(where: str, text: str, cap: int | None = None) -> None:
    if cap is not None and len(text) > cap:
        fail(f"{where}: {len(text)} characters, over {cap}: {text}")
    if "?" in text:
        fail(f"{where}: has a question mark")
    if EM_DASH in text:
        fail(f"{where}: has an em dash")
    if text.strip() == "":
        fail(f"{where}: empty")


_mcq_raw = mcq


def mcq(node, id, prompt, options, correct, explanation, provenance, visual, **kw):  # type: ignore[no-redef]
    lint_copy(f"{id} prompt", prompt, CAPS["prompt"])
    if kw.get("brief") is not None:
        lint_copy(f"{id} brief", kw["brief"], CAPS["brief"])
    for o, t, w in options:
        lint_copy(f"{id} option {o}", t, CAPS["option"])
        lint_copy(f"{id} why {o}", w, CAPS["why"])
    lint_copy(f"{id} explanation", explanation)
    if visual is None:
        fail(f"{id}: every pool MCQ carries a question drawing; the wiring test reads mcqVisualFor")
    if "derived" not in kw:
        fail(f"{id}: no derived answer was computed for it")
    elif kw["derived"] is None:
        fail(f"{id}: the script could not derive an answer, or it disagrees")
    _mcq_raw(node, id, prompt, options, correct, explanation, provenance, visual, **kw)


# ---------------------------------------------------------------------------
# Stage A species
# ---------------------------------------------------------------------------

CONCEPT_RES = ("resonance_delocalisation",)
CONCEPT_KVT = ("kinetic_vs_thermodynamic_control",)
CONCEPT_ANION = ("carbanion_stability", "resonance_delocalisation")
CONCEPT_CARBANION = ("carbanion_stability",) + CONCEPT_RES
CONCEPT_RADICAL = ("radical_stability",) + CONCEPT_RES

ALLYL_C = "[CH2+]C=C"
VINYL_C = "C=[CH+]"
HOMOALLYL_C = "[CH2+]CC=C"
METHYL_C = "[CH3+]"
ETHYL_C = "C[CH2+]"
IPR_C = "C[CH+]C"
TBU_C = "C[C+](C)C"
CROTYL_C = "C=C[CH+]C"
CROTYL_C_1 = "[CH2+]C=CC"
PRENYL_C = "C=C[C+](C)C"
METHALLYL_C = "[CH2+]C(C)=C"
CYHEXENYL_C = "[CH+]1C=CCCC1"
CYHEXADIENYL_C = "[CH+]1C=CC=CC1"
CYHEXYL_C = "[CH+]1CCCCC1"
CYHEXMETHYL_C = "[CH2+]C1CCCCC1"


def ref(smi: str, name: str) -> dict:
    """A reference drawing beside a tiled question: context, never one of the options."""
    return {"kind": "structure", "figure": figure(smi), "name": name}


def propene_ref() -> dict:
    return {"kind": "structure", "figure": numbered("[CH2:1]=[CH:2][CH3:3]"), "name": "propene: C3 is the allylic carbon"}


def anion(smi: str) -> str:
    return smi.replace("+", "-")


def radical(smi: str) -> str:
    return smi.replace("+]", "]")


def rev(first: str) -> tuple[str, str, str]:
    return (
        "The right ladder read from the other end.",
        "Every comparison in it holds, so the ranking work is done. The track asks for the most stable species at the top.",
        f"Put {first} in the first position and the rest follow down from there.",
    )


# ---------------------------------------------------------------------------
# u1-allylic (video): three recognise MCQs so the lesson stands without video
# ---------------------------------------------------------------------------


def node_allylic() -> None:
    node = "u1-allylic"
    t = {"vinyl": (VINYL_C, "vinyl cation"), "allyl": (ALLYL_C, "allyl cation"), "homo": (HOMOALLYL_C, "but-3-enyl cation")}
    derived = [o for o, (s, _) in t.items() if len(positions(s)) > 1]
    mcq(
        node, "u1-allylic-pick", "Pick the allylic cation.",
        [
            ("vinyl", "The vinyl cation", "Here the charge sits ON a carbon of the double bond, not next to it. Its empty orbital points at right angles to the pi bond, so the pi electrons cannot reach it and there is no second contributor."),
            ("allyl", "The allyl cation", "The charged carbon is bonded to one end of a C=C. The pi electrons can shift toward it, which moves the charge to the far end, so C1 and C3 share it. That neighbouring pi bond is what allylic means."),
            ("homo", "The but-3-enyl cation", "There is a C=C in the molecule, but one carbon too far away. A CH2 sits between the charge and the pi bond, so no arrow connects them and the charge stays on one carbon."),
        ],
        "allyl",
        "Allylic means the charged carbon is bonded to a carbon of a C=C. A charge on the double bond carbon itself (vinyl), or one carbon further away, gets no resonance.",
        prov("contributors enumerated with ResonanceMolSupplier; only the allyl cation has the charge on two carbons", OS_14_2),
        propene_ref(),
        tiles=tile_set(t), brief="Allylic means the charged carbon sits right next to a C=C.", level=0,
        derived=derived[0] if len(derived) == 1 else None,
    )
    mapped = "[CH2+:1][CH:2]=[CH2:3]"
    where = sorted(mol(mapped).GetAtomWithIdx(i).GetAtomMapNum() for i in positions(unmap(mapped)))
    mcq(
        node, "u1-allylic-where", "Pick the carbons that share the positive charge in the allyl cation.",
        [
            ("c1", "C1 only", "That is one contributor read as the whole story. Push the C2=C3 pi electrons toward C1 and the charge appears on C3. The real ion is a blend of both pictures."),
            ("c13", "C1 and C3", "Push the pi bond toward C1: C1 gains a bond and C3 loses one. So the charge sits on C1 in one contributor and on C3 in the other, and the real ion shares it between the two ends."),
            ("c2", "C2, the middle carbon", "C2 is the carbon the pi bond swings across. It has four bonds in both contributors, so it never carries the charge."),
            ("all", "All three carbons equally", "Only a carbon that ends up with three bonds in some contributor carries the charge. C2 has four bonds in both pictures, so the charge skips it."),
        ],
        "c13",
        "In an allyl system the charge is shared by the two END carbons, C1 and C3. The middle carbon keeps four bonds in every contributor.",
        prov("charge positions from ResonanceMolSupplier on the allyl cation", OS_14_2),
        {"kind": "structure", "figure": numbered(mapped), "name": "the allyl cation, numbered"},
        level=0, derived="c13" if where == [1, 3] else None,
    )
    a, b = "[CH2+]C=C", "C=C[CH2+]"
    ok = same_ion(a, b) and Chem.MolToSmiles(mol(a)) == Chem.MolToSmiles(mol(b))
    mcq(
        node, "u1-allylic-moves", "These two contributors are one ion. Pick what differs between them.",
        [
            ("atoms", "A hydrogen has moved along the chain", "Moving an atom makes a different molecule, which is a reaction and not resonance. Every atom here sits in the same place in both drawings."),
            ("flip", "Which form the ion is in at that moment", "The ion does not flip back and forth. It is one structure at all times, a blend of both drawings, with the charge spread over C1 and C3."),
            ("electrons", "Only where the electrons are drawn", "Same atoms, same positions, same hydrogens. Only the pi electrons and the charge are drawn in a different place, and that is all resonance ever changes."),
        ],
        "electrons",
        "Resonance contributors differ only in where electrons are drawn. Atoms never move, and the real species is one blend of all its contributors.",
        prov("RDKit confirms the two drawings are contributors of one ion with identical atoms and hydrogens", OS_14_2),
        {"kind": "pair", "a": named(a, "contributor 1"), "b": named(b, "contributor 2")},
        level=0, derived="electrons" if ok else None,
    )


# ---------------------------------------------------------------------------
# u1-rank-cation (practice): three ladders, nine MCQs
# ---------------------------------------------------------------------------


def node_rank_cation() -> None:
    node = "u1-rank-cation"
    ladder(
        node, "u1-cat-ladder-alkyl",
        [
            ("tbu", "tert-butyl", TBU_C, "Three carbons on the charged carbon feed its empty p orbital by hyperconjugation. The most help of the four."),
            ("ipr", "isopropyl", IPR_C, "Two carbons on the charged carbon, one rung below tert-butyl."),
            ("et", "ethyl", ETHYL_C, "One carbon on the charged carbon. Some help, not much."),
            ("me", "methyl", METHYL_C, "No carbon neighbours at all, so nothing feeds the empty orbital."),
        ],
        "Rank these cations, most stable at the top.",
        "Count the carbons bonded to the charged carbon.",
        "carbocation_stability", "descending", ("Most stable", "Least stable"),
        "Rank these four carbocations by stability, most stable first: tert-butyl, isopropyl, ethyl and methyl.",
        (
            "tert-Butyl, then isopropyl, then ethyl, then methyl.",
            "Each carbon bonded to the cationic carbon brings C-H and C-C bonds that lean into the empty p orbital, which is hyperconjugation. More neighbouring carbons means more of that help, so 3° beats 2° beats 1° beats methyl.",
            "Count the carbons attached to the positive carbon on each card. The count is the rank.",
        ),
        [
            ("ranked-least-stable-first", ["me", "et", "ipr", "tbu"], "ordering_is_reversed", rev("the cation with three carbon neighbours")),
            ("isopropyl-above-tert-butyl", ["ipr", "tbu", "et", "me"], "ordering_one_adjacent_pair_swapped", (
                "Isopropyl is placed above tert-butyl.",
                "tert-Butyl has three carbons on the charged carbon and isopropyl has two. One more neighbour is one more set of bonds feeding the empty orbital, so tert-butyl sits higher.",
                "Count carbon neighbours on those two cards alone: three against two.",
            )),
            ("methyl-above-ethyl", ["tbu", "ipr", "me", "et"], "ordering_one_adjacent_pair_swapped", (
                "Methyl is placed above ethyl.",
                "The methyl cation has no carbon neighbours, so nothing can donate into its empty orbital. Ethyl has one, which is a little help and more than none.",
                "Compare carbon neighbours on those two: one against none.",
            )),
        ],
        "Count the carbons on the charged carbon: 3° > 2° > 1° > methyl. Each neighbouring carbon donates into the empty p orbital by hyperconjugation.",
        prov("substitution counted per charged carbon; every adjacent pair checked decidable", OS_7_9),
        "carbocation_stability_and_rearrangement", CONCEPT_RES, 1000,
    )
    ladder(
        node, "u1-cat-ladder-allylic",
        [
            ("all3", "prenyl", PRENYL_C, "Resonance shares the charge with the far end, and the charged carbon also carries two methyls."),
            ("all2", "crotyl", CROTYL_C, "Shared by resonance, and one methyl on the better charged carbon."),
            ("all1", "allyl", ALLYL_C, "Shared by resonance, but both charged ends are primary."),
            ("et", "ethyl", ETHYL_C, "No pi bond next door, so one primary carbon holds the whole charge."),
        ],
        "Rank these cations, most stable at the top.",
        "Find the ones with a C=C next to the charge, then count substitution.",
        "carbocation_stability", "descending", ("Most stable", "Least stable"),
        "Rank these four carbocations by stability, most stable first: three allylic cations of rising substitution and the ethyl cation.",
        (
            "3° allylic, then 2° allylic, then the allyl cation, then ethyl.",
            "The three allylic cations all share the charge over two carbons, so resonance ties among them and substitution breaks the tie. Ethyl has a primary carbon like the allyl cation and no resonance at all, so it is last.",
            "Pick out the cards with a C=C beside the charge first. Among those, count the carbons on the charged carbon.",
        ),
        [
            ("ranked-least-stable-first", ["et", "all1", "all2", "all3"], "ordering_is_reversed", rev("the 3° allylic cation")),
            ("allyl-above-secondary-allylic", ["all3", "all1", "all2", "et"], "ordering_one_adjacent_pair_swapped", (
                "The allyl cation is placed above the 2° allylic one.",
                "Both share the charge between two carbons. The 2° allylic cation also has a methyl on a charged carbon, which adds hyperconjugation on top of the resonance.",
                "Both have resonance, so compare the carbons on the charged carbons.",
            )),
            ("ethyl-above-allyl", ["all3", "all2", "et", "all1"], "ordering_one_adjacent_pair_swapped", (
                "Ethyl is placed above the allyl cation.",
                "Both charged carbons are primary, so substitution ties. Only the allyl cation has a pi bond next door to share the charge with its far end, and that resonance puts it higher.",
                "Check which of those two has a C=C on the carbon beside the charge.",
            )),
        ],
        "Resonance spreads the charge first; among allylic cations, more substitution on the charged carbons wins. 3° allylic > 2° allylic > 1° allylic > 1° alkyl.",
        prov("charge positions from ResonanceMolSupplier and substitution counted per position; every adjacent pair checked decidable", OS_7_9, OS_14_2),
        "carbocation_stability_and_rearrangement", CONCEPT_RES, 1150,
    )
    ladder(
        node, "u1-cat-ladder-ring",
        [
            ("diene", "cyclohexadienyl", CYHEXADIENYL_C, "Two pi bonds in a row share the charge over three carbons."),
            ("ene", "cyclohexenyl", CYHEXENYL_C, "One pi bond next door shares the charge over two secondary carbons."),
            ("cy", "cyclohexyl", CYHEXYL_C, "A secondary carbon and no pi bond, so one carbon holds it all."),
            ("cym", "cyclohexylmethyl", CYHEXMETHYL_C, "A primary carbon outside the ring and no pi bond. The least help of the four."),
        ],
        "Rank these ring cations, most stable at the top.",
        "Count how many carbons share the charge first, then substitution.",
        "carbocation_stability", "descending", ("Most stable", "Least stable"),
        "Rank these four six-ring carbocations by stability, most stable first: cyclohexa-2,4-dienyl, cyclohex-2-enyl, cyclohexyl and cyclohexylmethyl.",
        (
            "Cyclohexadienyl, then cyclohexenyl, then cyclohexyl, then cyclohexylmethyl.",
            "Each conjugated C=C next to the charge adds one more carbon that can hold it: three carbons, then two, then one. Between the two with no resonance, the secondary ring carbon beats the primary CH2.",
            "Draw every contributor of each card and count the carbons that ever carry the +.",
        ),
        [
            ("ranked-least-stable-first", ["cym", "cy", "ene", "diene"], "ordering_is_reversed", rev("the cation with two C=C in the ring")),
            ("one-ene-above-diene", ["ene", "diene", "cy", "cym"], "ordering_one_adjacent_pair_swapped", (
                "The one-alkene cation is placed above the two-alkene cation.",
                "The second C=C, conjugated with the first, pushes the charge one carbon further, so three carbons share it instead of two. More contributors means more stable.",
                "Push arrows on the two-alkene card until the charge stops moving, and count where it landed.",
            )),
            ("primary-above-secondary", ["diene", "ene", "cym", "cy"], "ordering_one_adjacent_pair_swapped", (
                "Cyclohexylmethyl is placed above cyclohexyl.",
                "Neither has resonance, so substitution decides. The charge in cyclohexyl sits on a ring carbon with two carbon neighbours; in cyclohexylmethyl it sits on a CH2 with one.",
                "Count carbon neighbours on the charged carbon of those two: two against one.",
            )),
        ],
        "More conjugated pi bonds share the charge over more carbons. With no resonance, substitution decides.",
        prov("charge positions from ResonanceMolSupplier; every adjacent pair checked decidable", OS_7_9, OS_14_2),
        "carbocation_stability_and_rearrangement", CONCEPT_RES, 1250,
    )

    t = {"vinyl": (VINYL_C, "vinyl cation"), "ethyl": (ETHYL_C, "ethyl cation"), "allyl": (ALLYL_C, "allyl cation")}
    mcq(
        node, "u1-cat-vinyl", "Pick the most stable cation.",
        [
            ("vinyl", "The vinyl cation", "A double bond is right there, but the charge sits on one of its own carbons. That empty orbital is at right angles to the pi bond, so the pi electrons cannot reach it and there is no second contributor."),
            ("ethyl", "The ethyl cation", "One carbon neighbour gives a little hyperconjugation and nothing else. No pi bond, so the charge stays on one carbon."),
            ("allyl", "The allyl cation", "The charged carbon sits next to a C=C, so the pi electrons can shift over and put the charge on C3 as well. Sharing beats a single primary carbon."),
        ],
        "allyl",
        "A C=C helps only when it is NEXT to the charged carbon. A charge on the alkene carbon itself (vinyl) gets no resonance.",
        prov("most stable by dominance over charge positions and substitution", OS_7_9, OS_14_2),
        ref(METHYL_C, "for scale: methyl, no help at all"),
        tiles=tile_set(t), brief="Look for a pi bond the charge can actually share.",
        derived=pick(most_stable([s for s, _ in t.values()]), t),
    )
    # OWNER SWAP 2026-10-17 (owner-direction.md): this id used to pair the allyl
    # cation (1° allylic) with isopropyl and keep "about as stable" as the
    # answer. That ranking depends on the source, so the pair is now one every
    # source agrees on: crotyl (2° allylic) against isopropyl (2°). Same
    # substitution on the best charged carbon, plus resonance, so crotyl wins.
    # The script refuses to write the item unless compare() and the takeaway
    # scale both say so.
    crotyl_wins = compare(CROTYL_C, IPR_C) == 1 and takeaway_scale(CROTYL_C) > takeaway_scale(IPR_C)
    mcq(
        node, "u1-cat-allyl-vs-2", "Compare these two cations. Pick the closest statement.",
        [
            ("crotyl", "The crotyl cation is more stable", "Its best charged carbon is secondary, just like isopropyl's. On top of that, resonance spreads the charge over a second carbon. Same substitution plus resonance wins."),
            ("ipr", "The isopropyl cation is more stable", "Isopropyl's charged carbon is secondary, but so is the crotyl cation's best one. Isopropyl has no C=C next door, so its one carbon holds the whole charge."),
            ("tie", "They are about as stable as each other", "Count the substitution first: both have a secondary charged carbon, so that part ties. Then look for resonance. Only the crotyl cation has it, so the tie breaks."),
        ],
        "crotyl",
        "Same substitution, plus resonance: a 2° allylic cation beats a 2° alkyl cation, because resonance spreads the charge over a second carbon.",
        prov("compare() dominance: crotyl (2 charge positions, best 2°) over isopropyl (1 position, 2°); takeaway scale 3 against 2", OS_7_9, OS_14_2),
        {"kind": "pair", "a": named(CROTYL_C, "crotyl cation"), "b": named(IPR_C, "isopropyl cation")},
        brief="Count the substitution on each charged carbon, then look for resonance.",
        derived="crotyl" if crotyl_wins else None,
    )
    subs = sorted(carbon_neighbours(mol(CROTYL_C), p) for p in positions(CROTYL_C))
    ok = same_ion(CROTYL_C, CROTYL_C_1) and subs == [1, 2]
    mcq(
        node, "u1-cat-major", "One cation, two contributors. Pick the one that counts for more.",
        [
            ("equal", "Both count equally", "Both are real, and they are not equal. A contributor that puts the charge where more carbons can help it weighs more."),
            ("sec", "The one with + on the 2° carbon", "That carbon has two carbon neighbours to donate into its empty orbital, so this picture is lower in energy and counts for more."),
            ("pri", "The one with + on the 1° carbon", "This contributor puts the charge where fewer carbons help it. It still matters, which is why a nucleophile can attack there, but it is the smaller share."),
        ],
        "sec",
        "Contributors are not equal. The one with the charge on the more substituted carbon counts for more.",
        prov("RDKit confirms the two drawings are one ion; substitution counted at each charge position", OS_14_2),
        {"kind": "pair", "a": named(CROTYL_C, "+ on the 2° carbon"), "b": named(CROTYL_C_1, "+ on the 1° carbon")},
        derived="sec" if ok else None,
    )
    mapped = "[CH2+:1][CH:2]=[CH:3][CH:4]=[CH2:5]"
    where = sorted(mol(mapped).GetAtomWithIdx(i).GetAtomMapNum() for i in positions(unmap(mapped)))
    mcq(
        node, "u1-cat-pentadienyl", "Pick the carbons that share the charge in this cation.",
        [
            ("two", "C1 and C3", "That is one arrow push. The C=C made by that push can push again, which moves the charge on to C5."),
            ("five", "All five carbons", "C2 and C4 keep four bonds in every contributor, so they never carry the charge. It lands on every other carbon."),
            ("three", "C1, C3 and C5", "Push the C2=C3 pi bond toward C1 and the charge moves to C3; push C4=C5 toward C3 and it moves to C5. Three contributors, three carbons."),
        ],
        "three",
        "Keep pushing arrows until the charge stops moving. In a conjugated chain it lands on every other carbon.",
        prov("charge positions from ResonanceMolSupplier", OS_14_2),
        {"kind": "structure", "figure": numbered(mapped), "name": "a pentadienyl cation, numbered"},
        derived="three" if where == [1, 3, 5] else None,
    )
    # CONVERTED 2026-10-17 (U1-P3): was a pick-the-most-stable MCQ with the same
    # id and the same three cations. All three pairs are decidable, so the full
    # order is asked for instead of the top card alone.
    ladder(
        node, "u1-cat-middle-methyl",
        [
            ("crotyl", "but-2-enyl", CROTYL_C_1, "Resonance shares the charge between C1 and C3, and C3 carries the methyl, so one of the two charged carbons is secondary."),
            ("methallyl", "2-methylallyl", METHALLYL_C, "Resonance shares the charge, but the methyl sits on the middle carbon, which never carries it. Both charged carbons stay primary."),
            ("homo", "but-3-enyl", HOMOALLYL_C, "The C=C is one carbon too far from the charge, so there is no resonance. A plain primary cation."),
        ],
        "Rank these C4 cations, most stable at the top.",
        "All three have one C=C. Draw the contributors before you count methyls.",
        "carbocation_stability", "descending", ("Most stable", "Least stable"),
        "Rank three C4 carbocations with one C=C by stability, most stable first: but-2-enyl, 2-methylallyl and but-3-enyl.",
        (
            "But-2-enyl, then 2-methylallyl, then but-3-enyl.",
            "The two allylic cations share the charge over two carbons, so both beat but-3-enyl, whose C=C is too far away to help. Between the allylic two, only but-2-enyl has its methyl on a carbon that carries the charge.",
            "Draw both contributors of each card, then count carbons on the charged carbons only.",
        ),
        [
            ("ranked-least-stable-first", ["homo", "methallyl", "crotyl"], "ordering_is_reversed", rev("but-2-enyl")),
            ("methallyl-above-crotyl", ["methallyl", "crotyl", "homo"], "ordering_one_adjacent_pair_swapped", (
                "2-Methylallyl is placed above but-2-enyl.",
                "Both have resonance. The methyl only helps when it sits on a charged carbon: in but-2-enyl it does (C3), in 2-methylallyl it sits on the middle carbon, which never carries the charge.",
                "Mark the two charged carbons on each card, then look for the methyl on one of them.",
            )),
            ("homo-above-methallyl", ["crotyl", "homo", "methallyl"], "ordering_one_adjacent_pair_swapped", (
                "But-3-enyl is placed above 2-methylallyl.",
                "Both charged carbons in each are primary, so substitution ties. Only 2-methylallyl has a C=C right next to the charge to share it.",
                "Check which of those two has its C=C on the carbon beside the charge.",
            )),
        ],
        "A methyl only helps if it sits on a carbon that carries the charge in some contributor. Draw the contributors before you count.",
        prov("charge positions from ResonanceMolSupplier and substitution counted per position; every adjacent pair checked decidable", OS_7_9, OS_14_2),
        "carbocation_stability_and_rearrangement", CONCEPT_RES, 1200,
    )
    ok = compare(TBU_C, ETHYL_C) == 1 and factors(TBU_C)[0] == 1 and factors(ETHYL_C)[0] == 1
    mcq(
        node, "u1-cat-hyperconj", "tert-Butyl beats ethyl. Pick the reason.",
        [
            ("res", "tert-Butyl has resonance", "No pi bond sits next to either charged carbon, so neither has a second contributor. The difference here is hyperconjugation alone."),
            ("hyper", "More C-H bonds feed the empty p orbital", "Each neighbouring carbon brings C-H bonds that can lean into the empty orbital. tert-Butyl has three such carbons and ethyl has one."),
            ("withdraw", "Methyl groups pull density away", "Backwards. Alkyl groups donate into an electron-poor carbon, which is why more of them helps a cation."),
        ],
        "hyper",
        "Alkyl groups stabilise a carbocation by hyperconjugation: their C-H and C-C bonds donate into the empty p orbital.",
        prov("neither species has a second charge position; substitution 3 against 1", OS_7_9),
        {"kind": "pair", "a": named(TBU_C, "tert-butyl"), "b": named(ETHYL_C, "ethyl")},
        level=0, derived="hyper" if ok else None,
    )
    mcq(
        node, "u1-cat-3allyl-vs-3", "Pick the more stable cation.",
        [
            ("tie", "They tie, both are 3°", "Both charged carbons are tertiary, so substitution ties. Only one also has a C=C next door, and resonance is extra help on top."),
            ("tbu", "tert-Butyl", "Three methyls is strong help, and the allylic cation has that same substitution plus a second carbon to share the charge."),
            ("allyl", "The 3° allylic cation", "Same substitution at the charged carbon, plus resonance with the C=C next door. Both effects count, and it wins on the second."),
        ],
        "allyl",
        "When substitution ties, resonance breaks the tie. A 3° allylic cation beats a 3° alkyl one.",
        prov("dominance: equal substitution, more charge positions", OS_7_9),
        {"kind": "pair", "a": named(PRENYL_C, "3° allylic"), "b": named(TBU_C, "tert-butyl, 3°")},
        derived="allyl" if compare(PRENYL_C, TBU_C) == 1 else None,
    )
    ok = takeaway_scale(TBU_C) > takeaway_scale(ALLYL_C)
    mcq(
        node, "u1-cat-tbu-vs-allyl", "Pick the more stable cation.",
        [
            ("tbu", "tert-Butyl", "Three carbon neighbours put tert-butyl at 3°. A 1° allylic cation sits about level with 2°, so tert-butyl stays ahead."),
            ("allyl", "The allyl cation", "Resonance helps the allyl cation, and that help is worth about one extra carbon. One primary carbon plus resonance lands near 2°, still below 3°."),
            ("tie", "They tie", "A tie would need resonance to be worth two extra carbons here. It is worth about one, which puts allyl level with 2° and below 3°."),
        ],
        "tbu",
        "Resonance is worth about one extra carbon of substitution, so 1° allylic sits near 2° alkyl and below 3° alkyl.",
        prov("takeaway scale (best substitution plus one per extra charge position): tert-butyl 3, allyl 2", OS_7_9),
        {"kind": "pair", "a": named(TBU_C, "tert-butyl, 3°"), "b": named(ALLYL_C, "allyl, 1° allylic")},
        level=2, derived="tbu" if ok else None,
    )
    t = {"ipr": (IPR_C, "isopropyl, 2°"), "allyl": (ALLYL_C, "allyl, 1° allylic"), "et": (ETHYL_C, "ethyl, 1°"), "crotyl": (CROTYL_C, "2° allylic")}
    mcq(
        node, "u1-cat-count-both", "Count both effects, then pick the most stable cation.",
        [
            ("ipr", "isopropyl, 2°", "Secondary is good, and the 2° allylic cation has a secondary charged carbon too, plus resonance on top."),
            ("allyl", "allyl, 1° allylic", "Resonance, yes, but both charged carbons are primary. The 2° allylic cation has the same resonance and a methyl as well."),
            ("et", "ethyl, 1°", "A primary carbon and no resonance, so it is the least helped of the four."),
            ("crotyl", "2° allylic", "It is the only one that scores on both counts: resonance shares the charge, and the better charged carbon is secondary."),
        ],
        "crotyl",
        "Score each cation on resonance and on substitution. The one that is at least as good on both and better on one wins.",
        prov("most stable by dominance over charge positions and substitution", OS_7_9, OS_14_2),
        ref(METHYL_C, "for scale: methyl, no help at all"),
        tiles=tile_set(t),
        derived=pick(most_stable([s for s, _ in t.values()]), t),
    )


# ---------------------------------------------------------------------------
# u1-rank-anion (practice): three ladders, nine MCQs
#
# The ladders rank by "carbanion_stability", descending: most stable first.
# (Until 2026-10-07 they borrowed "basicity", ascending, which is the same
# order, because a more stable carbanion is a weaker base.) The student sees
# the track ends ("Most stable" / "Least stable"), never the criterion.
# ---------------------------------------------------------------------------

METHYL_A = "[CH3-]"
ETHYL_A = "C[CH2-]"
IPR_A = "C[CH-]C"
TBU_A = "C[C-](C)C"
ALLYL_A = "[CH2-]C=C"
VINYL_A = "C=[CH-]"
ETHYNYL_A = "C#[C-]"
PENTADIENYL_A = "[CH2-]C=CC=C"
CROTYL_A_1 = "[CH2-]C=CC"
CROTYL_A_2 = "C=C[CH-]C"
CYHEXENYL_A = "[CH-]1C=CCCC1"
CYHEXYL_A = "[CH-]1CCCCC1"
MECYHEXYL_A = "C[C-]1CCCCC1"


def node_rank_anion() -> None:
    node = "u1-rank-anion"
    ladder(
        node, "u1-ani-ladder-alkyl",
        [
            ("me", "methyl", METHYL_A, "No alkyl groups pushing density onto the lone pair. The best of the four."),
            ("et", "ethyl", ETHYL_A, "One alkyl group donating onto a carbon that already holds a negative charge."),
            ("ipr", "isopropyl", IPR_A, "Two alkyl groups, so more unwanted donation."),
            ("tbu", "tert-butyl", TBU_A, "Three alkyl groups. The best cation of the four is the worst anion."),
        ],
        "Rank these carbanions, most stable at the top.",
        "The cation trend flips: alkyl groups push density onto a carbon that is already full.",
        "carbanion_stability", "descending", ("Most stable", "Least stable"),
        "Rank these four carbanions by stability, most stable first: methyl, ethyl, isopropyl and tert-butyl.",
        (
            "Methyl, then ethyl, then isopropyl, then tert-butyl.",
            "Alkyl groups are weak electron donors. A cation wants that donation; a carbanion already holds a lone pair and a full negative charge, so each alkyl group makes it worse. The order is the cation ladder upside down.",
            "Count the carbons on the charged carbon of each card. Fewest is most stable.",
        ),
        [
            ("ranked-least-stable-first", ["tbu", "ipr", "et", "me"], "ordering_is_reversed", (
                "This is the carbocation ladder, tert-butyl first.",
                "Every step is the right size and in the wrong direction. Alkyl donation helps a cation and hurts a carbanion, so the anion ladder runs the other way.",
                "Put the anion with no carbon neighbours, methyl, in the first position.",
            )),
            ("ethyl-above-methyl", ["et", "me", "ipr", "tbu"], "ordering_one_adjacent_pair_swapped", (
                "Ethyl is placed above methyl.",
                "Ethyl has one alkyl group donating onto the charged carbon and methyl has none. For an anion, none is better.",
                "Count carbon neighbours on those two: one against none.",
            )),
            ("tert-butyl-above-isopropyl", ["me", "et", "tbu", "ipr"], "ordering_one_adjacent_pair_swapped", (
                "tert-Butyl is placed above isopropyl.",
                "tert-Butyl carries three alkyl groups and isopropyl two. Each one pushes more density onto a full carbon, so tert-butyl sits lowest.",
                "Count carbon neighbours on those two: three against two.",
            )),
        ],
        "For carbanions the alkyl trend flips: methyl > 1° > 2° > 3°, because alkyl groups donate density onto a carbon that already has a lone pair.",
        prov("alkyl groups counted on the charged carbon; every adjacent pair checked decidable", OS_7_9),
        "pka_and_acidity", CONCEPT_ANION, 1050,
    )
    ladder(
        node, "u1-ani-ladder-s",
        [
            ("sp", "ethynyl", ETHYNYL_A, "The lone pair sits in an sp orbital, 50 percent s, held closest to the nucleus."),
            ("sp2", "vinyl", VINYL_A, "An sp2 lone pair, 33 percent s. Held less tightly than sp, more than sp3."),
            ("sp3", "ethyl", ETHYL_A, "An sp3 lone pair, 25 percent s, plus one alkyl group."),
            ("sp3t", "tert-butyl", TBU_A, "Also sp3, and three alkyl groups instead of one."),
        ],
        "Rank these carbanions, most stable at the top.",
        "Name the orbital that holds each lone pair first.",
        "carbanion_stability", "descending", ("Most stable", "Least stable"),
        "Rank these four carbanions by stability, most stable first: ethynyl, vinyl, ethyl and tert-butyl.",
        (
            "Ethynyl, then vinyl, then ethyl, then tert-butyl.",
            "An orbital with more s character holds its electrons closer to the nucleus, which steadies a negative charge: sp beats sp2 beats sp3. The two sp3 anions are then split by alkyl groups, and fewer is better.",
            "Write sp, sp2 or sp3 beside each charged carbon, then count alkyl groups on the two that tie.",
        ),
        [
            ("ranked-least-stable-first", ["sp3t", "sp3", "sp2", "sp"], "ordering_is_reversed", rev("the sp anion, ethynyl")),
            ("vinyl-above-ethynyl", ["sp2", "sp", "sp3", "sp3t"], "ordering_one_adjacent_pair_swapped", (
                "Vinyl is placed above ethynyl.",
                "The ethynyl lone pair sits in an sp orbital, half s character. The vinyl one is sp2, a third s. More s character holds the charge closer to the nucleus.",
                "Compare the orbital on those two charged carbons: sp against sp2.",
            )),
            ("tert-butyl-above-ethyl", ["sp", "sp2", "sp3t", "sp3"], "ordering_one_adjacent_pair_swapped", (
                "tert-Butyl is placed above ethyl.",
                "Both lone pairs are sp3, so the orbital ties. tert-Butyl then has three alkyl groups pushing density onto the charge and ethyl has one.",
                "Those two tie on the orbital, so count alkyl groups.",
            )),
        ],
        "More s character steadies a carbanion: sp > sp2 > sp3. When the orbital ties, fewer alkyl groups wins.",
        prov("hybridisation read from the bonds at the charged carbon; every adjacent pair checked decidable", OS_7_9),
        "pka_and_acidity", CONCEPT_ANION, 1150,
    )
    ladder(
        node, "u1-ani-ladder-res",
        [
            ("penta", "pentadienyl", PENTADIENYL_A, "Two pi bonds share the charge over three carbons."),
            ("allyl", "allyl", ALLYL_A, "One pi bond shares the charge over two carbons."),
            ("me", "methyl", METHYL_A, "No resonance and no alkyl groups."),
            ("et", "ethyl", ETHYL_A, "No resonance, and one alkyl group pushing density onto the charge."),
        ],
        "Rank these carbanions, most stable at the top.",
        "Count the carbons that share the charge, then the alkyl groups.",
        "carbanion_stability", "descending", ("Most stable", "Least stable"),
        "Rank these four carbanions by stability, most stable first: pentadienyl, allyl, methyl and ethyl.",
        (
            "Pentadienyl, then allyl, then methyl, then ethyl.",
            "Resonance helps an anion just as it helps a cation: the charge spread over three carbons beats two, and two beats one. Between the two with no resonance, the alkyl group on ethyl pushes it below methyl.",
            "Push arrows on each card until the charge stops moving and count the carbons it visited.",
        ),
        [
            ("ranked-least-stable-first", ["et", "me", "allyl", "penta"], "ordering_is_reversed", rev("the anion with two conjugated C=C")),
            ("methyl-above-allyl", ["penta", "me", "allyl", "et"], "ordering_one_adjacent_pair_swapped", (
                "Methyl is placed above the allyl anion.",
                "Methyl has no alkyl groups, which is good for an anion, and so does the allyl anion: its middle carbon is the pi partner, not an alkyl group. Only allyl also shares the charge, so it sits higher.",
                "Draw the second contributor of the allyl anion and see where the charge goes.",
            )),
            ("ethyl-above-methyl", ["penta", "allyl", "et", "me"], "ordering_one_adjacent_pair_swapped", (
                "Ethyl is placed above methyl.",
                "Neither has resonance, so alkyl groups decide, and for an anion an alkyl group hurts. Ethyl has one and methyl has none.",
                "Count alkyl groups on those two charged carbons.",
            )),
        ],
        "Resonance stabilises a carbanion: more carbons sharing the charge is better. With no resonance, fewer alkyl groups wins.",
        prov("charge positions from ResonanceMolSupplier, alkyl groups counted per position; every adjacent pair checked decidable", OS_7_9),
        "pka_and_acidity", CONCEPT_ANION, 1200,
    )

    mcq(
        node, "u1-ani-flip", "Pick the more stable carbanion.",
        [
            ("tbu", "The tert-butyl anion", "That is the cation trend. Alkyl groups donate density, which helps a carbon short of electrons and hurts one that already holds a lone pair."),
            ("tie", "They tie, neither has resonance", "Neither has resonance, true, so the alkyl groups decide, and here they hurt. Three of them make tert-butyl the worst of the alkyl anions."),
            ("me", "The methyl anion", "No alkyl groups push density onto its lone pair. For a carbanion, the fewer donors the better."),
        ],
        "me",
        "For a carbanion the alkyl trend flips: methyl > 1° > 2° > 3°.",
        prov("dominance: no resonance in either, fewer alkyl groups on methyl", OS_7_9),
        {"kind": "pair", "a": named(TBU_A, "tert-butyl anion"), "b": named(METHYL_A, "methyl anion")},
        derived="me" if compare(METHYL_A, TBU_A) == 1 else None,
        concepts=CONCEPT_CARBANION,
    )
    ok = compare(METHYL_A, ETHYL_A) == 1 and factors(METHYL_A)[0] == factors(ETHYL_A)[0] == 1
    mcq(
        node, "u1-ani-why-alkyl", "Alkyl groups destabilise a carbanion. Pick the reason.",
        [
            ("pull", "They pull density away from the carbon", "Alkyl groups are weak donors, not withdrawers. Donation is welcome on an empty orbital and unwelcome on a lone pair."),
            ("res", "They add a resonance contributor", "An alkyl group has no pi bond, so it adds no contributor. Its effect is donation, and donation pushes the wrong way here."),
            ("push", "They push density onto an already full carbon", "The charged carbon already has a lone pair and a negative charge. Donating more density onto it raises its energy."),
        ],
        "push",
        "Alkyl groups donate electron density. That helps an electron-poor cation and hurts an electron-rich anion.",
        prov("neither species has a second charge position; ethyl has one alkyl group, methyl none", OS_7_9),
        {"kind": "pair", "a": named(METHYL_A, "methyl anion"), "b": named(ETHYL_A, "ethyl anion")},
        level=0, derived="push" if ok else None,
        concepts=CONCEPT_CARBANION,
    )
    m = mol(CROTYL_A_1)
    pos = positions(CROTYL_A_1)
    alk = {p: alkyl_on(m, p, pos) for p in pos}
    best_end = min(alk, key=alk.get)
    ok = same_ion(CROTYL_A_1, CROTYL_A_2) and alk[best_end] == 0 and carbon_neighbours(m, best_end) == 1
    mcq(
        node, "u1-ani-major", "One anion, two contributors. Pick the one that counts for more.",
        [
            ("sec", "The one with − on the 2° carbon", "That is the cation answer. For an anion, the methyl on that carbon pushes more density onto the lone pair, so the charge prefers the other end."),
            ("pri", "The one with − on the 1° carbon", "The end carbon has no alkyl group donating onto it, so a negative charge sits there more comfortably. That picture counts for more."),
            ("equal", "Both count equally", "Both are real, and they are not equal. The methyl makes one end a worse home for a negative charge."),
        ],
        "pri",
        "For an anion, the better contributor puts the charge on the LESS substituted carbon, the reverse of a cation.",
        prov("RDKit confirms the two drawings are one ion; alkyl groups counted at each charge position", OS_7_9),
        {"kind": "pair", "a": named(CROTYL_A_2, "− on the 2° carbon"), "b": named(CROTYL_A_1, "− on the 1° carbon")},
        derived="pri" if ok else None,
        concepts=CONCEPT_CARBANION,
    )
    ok = factors(ETHYNYL_A)[1] > factors(ETHYL_A)[1] and factors(ETHYNYL_A)[0] == 1 and compare(ETHYNYL_A, ETHYL_A) == 1
    mcq(
        node, "u1-ani-why-sp", "The ethynyl anion beats the ethyl anion. Pick the reason.",
        [
            ("res", "The triple bond shares the charge", "The lone pair sits in an sp orbital along the axis, at right angles to both pi bonds. It cannot overlap with them, so there is no second contributor."),
            ("s", "More s character holds the lone pair closer", "An sp orbital is half s, and s electrons sit closer to the nucleus. A lone pair held closer is a steadier negative charge."),
            ("h", "It carries fewer hydrogens", "Hydrogen count is not the effect. What changes is the orbital the lone pair sits in: sp here, sp3 in ethyl."),
        ],
        "s",
        "More s character in the orbital holding the lone pair steadies a carbanion: sp > sp2 > sp3.",
        prov("hybridisation read from the bonds at the charged carbon; neither has a second charge position", OS_7_9),
        {"kind": "pair", "a": named(ETHYNYL_A, "ethynyl anion"), "b": named(ETHYL_A, "ethyl anion")},
        level=0, derived="s" if ok else None,
        concepts=CONCEPT_CARBANION,
    )
    # CONVERTED 2026-10-17 (U1-P3): was a pick-the-most-stable MCQ with the same
    # id and the same three anions; every pair is decidable, so the whole order is asked.
    ladder(
        node, "u1-ani-ring",
        [
            ("ene", "cyclohex-2-enyl anion", CYHEXENYL_A, "The C=C next door shares the charge with the far end of the allyl unit. Resonance helps an anion just as it helps a cation."),
            ("cy", "cyclohexyl anion", CYHEXYL_A, "A secondary carbanion with no pi bond nearby, so one carbon holds the whole charge."),
            ("me", "1-methylcyclohexyl anion", MECYHEXYL_A, "Tertiary is the worst place for a carbanion: three alkyl groups donating onto it, and no resonance."),
        ],
        "Rank these ring carbanions, most stable at the top.",
        "Resonance first. Then remember the alkyl trend flips for anions.",
        "carbanion_stability", "descending", ("Most stable", "Least stable"),
        "Rank three six-ring carbanions by stability, most stable first: cyclohex-2-enyl, cyclohexyl and 1-methylcyclohexyl.",
        (
            "Cyclohex-2-enyl, then cyclohexyl, then 1-methylcyclohexyl.",
            "Only cyclohex-2-enyl can share its charge by resonance, so it is first. The other two have none, and for a carbanion each alkyl group on the charged carbon makes it worse, so the tertiary one is last.",
            "Look for a C=C next to the charge first, then count carbons on the charged carbon: fewer is better.",
        ),
        [
            ("ranked-least-stable-first", ["me", "cy", "ene"], "ordering_is_reversed", rev("the cyclohex-2-enyl anion")),
            ("tertiary-above-secondary", ["ene", "me", "cy"], "ordering_one_adjacent_pair_swapped", (
                "1-Methylcyclohexyl is placed above cyclohexyl.",
                "That is the cation trend. A carbanion already holds a lone pair, so the extra alkyl group on the tertiary one pushes in density it does not want.",
                "Count carbons on the charged carbon of those two: for an anion, fewer wins.",
            )),
            ("secondary-above-allylic", ["cy", "ene", "me"], "ordering_one_adjacent_pair_swapped", (
                "Cyclohexyl is placed above cyclohex-2-enyl.",
                "Cyclohex-2-enyl shares its charge with the far end of the C=C; cyclohexyl keeps it on one carbon. Resonance outranks substitution here.",
                "Push the lone pair of the cyclohex-2-enyl anion into the C=C and see where the charge lands.",
            )),
        ],
        "Resonance helps an anion just as it helps a cation. With no resonance, the more substituted carbanion is the less stable one.",
        prov("charge positions, orbital and alkyl groups counted; every adjacent pair checked decidable", OS_7_9),
        "pka_and_acidity", CONCEPT_CARBANION, 1150,
    )
    t = {"vinyl": (VINYL_A, "vinyl anion"), "allyl": (ALLYL_A, "allyl anion"), "tbu": (TBU_A, "tert-butyl anion")}
    mcq(
        node, "u1-ani-least", "Pick the LEAST stable carbanion.",
        [
            ("vinyl", "vinyl anion", "Its lone pair sits in an sp2 orbital, with more s character than sp3, and no alkyl group pushes on it. Not the worst."),
            ("allyl", "allyl anion", "Resonance spreads its charge over two carbons. That makes it one of the better carbanions here."),
            ("tbu", "tert-butyl anion", "An sp3 lone pair, no resonance, and three alkyl groups pushing density onto it. Every factor points the wrong way."),
        ],
        "tbu",
        "A carbanion is worst with no resonance, an sp3 lone pair and many alkyl groups. tert-Butyl has all three.",
        prov("least stable by dominance over charge positions, orbital and alkyl groups", OS_7_9),
        ref(METHYL_A, "for scale: the methyl anion"), tiles=tile_set(t),
        derived=pick(least_stable([s for s, _ in t.values()]), t),
        concepts=CONCEPT_CARBANION,
    )
    mcq(
        node, "u1-ani-sp2-sp3", "Pick the more stable carbanion.",
        [
            ("tie", "They tie, one carbon neighbour each", "Same number of carbon neighbours, yes. The difference is the orbital: the vinyl lone pair is sp2, the ethyl one sp3."),
            ("vinyl", "The vinyl anion", "Its lone pair sits in an sp2 orbital, a third s character, held closer than ethyl's sp3 pair. The alkyl count ties, so the orbital decides."),
            ("ethyl", "The ethyl anion", "Ethyl's lone pair is sp3, the least s character. Nothing else in its favour here, so it sits below vinyl."),
        ],
        "vinyl",
        "When nothing else differs, the carbanion whose lone pair has more s character is more stable.",
        prov("dominance: same position count, sp2 against sp3, no alkyl group on vinyl", OS_7_9),
        {"kind": "pair", "a": named(VINYL_A, "vinyl anion"), "b": named(ETHYL_A, "ethyl anion")},
        derived="vinyl" if compare(VINYL_A, ETHYL_A) == 1 else None,
        concepts=CONCEPT_CARBANION,
    )
    alkyl = [METHYL_A, ETHYL_A, IPR_A, TBU_A]
    ok = least_stable(alkyl) == TBU_A and most_stable([METHYL_C, ETHYL_C, IPR_C, TBU_C]) == TBU_C
    mcq(
        node, "u1-ani-vs-cation", "tert-Butyl is the best alkyl cation. Pick where it ranks as an anion.",
        [
            ("best", "Also the best", "The same three methyls are at work, and they push the other way here. Donation that fills an empty orbital overfills a lone pair."),
            ("worst", "The worst of the alkyl anions", "Three alkyl groups donate onto the charged carbon. That rescues a cation and burdens an anion, so the ladder turns upside down."),
            ("middle", "Somewhere in the middle", "Nothing about tert-butyl is middling. It has the most alkyl groups of any alkyl anion, so it sits at one end."),
        ],
        "worst",
        "Same alkyl groups, opposite effect: 3° is the best alkyl cation and the worst alkyl anion.",
        prov("cation and anion alkyl ladders both derived; tert-butyl tops one and bottoms the other", OS_7_9),
        {"kind": "pair", "a": named(TBU_C, "tert-butyl cation"), "b": named(TBU_A, "tert-butyl anion")},
        derived="worst" if ok else None,
        concepts=CONCEPT_CARBANION,
    )
    mcq(
        node, "u1-ani-allyl-vs-methyl", "Pick the more stable carbanion.",
        [
            ("me", "The methyl anion, no alkyl groups", "No alkyl groups is a real advantage, and the allyl anion has none on its charged carbons either: its middle carbon is the pi partner. So resonance decides."),
            ("allyl", "The allyl anion", "Its charge is shared between two carbons by resonance, and neither charged carbon carries an alkyl group. Methyl has to hold the whole charge on one carbon."),
            ("tie", "They tie, both are primary or less", "Counting the vinyl group as an alkyl group misreads it. It is a pi bond that takes up half the charge, which pushes allyl ahead."),
        ],
        "allyl",
        "A neighbouring C=C is not an alkyl group. It shares a carbanion's charge by resonance.",
        prov("dominance: two charge positions against one, no alkyl group on either", OS_7_9),
        {"kind": "pair", "a": named(METHYL_A, "methyl anion"), "b": named(ALLYL_A, "allyl anion")},
        derived="allyl" if compare(ALLYL_A, METHYL_A) == 1 else None,
        concepts=CONCEPT_CARBANION,
    )


# ---------------------------------------------------------------------------
# u1-rank-radical (branch, practice, optional). MCQs only: no radical ladder
# is authored yet, though the criterion "radical_stability" now exists.
# ---------------------------------------------------------------------------


def node_rank_radical() -> None:
    node = "u1-rank-radical"
    tbu, ipr, et, me = radical(TBU_C), radical(IPR_C), radical(ETHYL_C), radical(METHYL_C)
    allyl, vinyl, propyl = radical(ALLYL_C), radical(VINYL_C), "CC[CH2]"
    benzyl = "[CH2]c1ccccc1"
    cy_ene, me_cy, cy = radical(CYHEXENYL_C), "C[C]1CCCCC1", radical(CYHEXYL_C)

    # CONVERTED 2026-10-17 (U1-P3 round 2): was a pick-the-most-stable MCQ with
    # the same id and the same three radicals. Every adjacent pair is decidable,
    # so the whole order is asked for, with methyl added at the bottom.
    ladder(
        node, "u1-rad-alkyl",
        [
            ("tbu", "tert-butyl radical", tbu, "Three carbon neighbours donate into the half-empty orbital. Radicals follow the cation trend, so 3° is first."),
            ("ipr", "isopropyl radical", ipr, "Two carbon neighbours: good help, one less than tert-butyl."),
            ("et", "ethyl radical", et, "One carbon neighbour gives a little hyperconjugation."),
            ("me", "methyl radical", me, "No carbon neighbours at all, so nothing helps the odd electron."),
        ],
        "Rank these radicals, most stable at the top.",
        "No resonance in any of them. Count what is attached to each radical carbon.",
        "radical_stability", "descending", ("Most stable", "Least stable"),
        "Rank four alkyl radicals by stability, most stable first: tert-butyl, isopropyl, ethyl and methyl.",
        (
            "tert-Butyl, then isopropyl, then ethyl, then methyl.",
            "A radical carbon is one electron short of an octet, so each alkyl group on it donates a little density and helps. More carbons on the radical carbon, more stable: 3° > 2° > 1° > methyl, the cation trend.",
            "Count the carbons bonded to each radical carbon: more is better for a radical.",
        ),
        [
            ("ranked-least-stable-first", ["me", "et", "ipr", "tbu"], "ordering_is_reversed", rev("tert-butyl")),
            ("isopropyl-above-tertbutyl", ["ipr", "tbu", "et", "me"], "ordering_one_adjacent_pair_swapped", (
                "Isopropyl is placed above tert-butyl.",
                "Three carbon neighbours beat two. A radical is electron poor, so each extra alkyl group helps it.",
                "Count carbons on the radical carbon of those two.",
            )),
            ("ethyl-above-isopropyl", ["tbu", "et", "ipr", "me"], "ordering_one_adjacent_pair_swapped", (
                "Ethyl is placed above isopropyl.",
                "Isopropyl's radical carbon has two carbon neighbours, ethyl's has one. More donation, more stable.",
                "Count carbons on the radical carbon of those two.",
            )),
        ],
        "Alkyl radicals follow the cation trend: 3° > 2° > 1° > methyl, because the radical carbon is electron poor.",
        prov("ranking by charge positions then substitution, the radical model in the script header; every adjacent pair checked decidable", OS_10_5),
        "allylic_halogenation", CONCEPT_RADICAL, 1100,
    )
    t = {"vinyl": (vinyl, "vinyl radical"), "propyl": (propyl, "propyl radical"), "allyl": (allyl, "allyl radical")}
    mcq(
        node, "u1-rad-allyl", "Pick the most stable radical.",
        [
            ("vinyl", "vinyl radical", "The odd electron sits on a carbon of the C=C itself, in an orbital that cannot overlap the pi bond. No second contributor."),
            ("propyl", "propyl radical", "A primary radical with no pi bond nearby. One carbon holds the odd electron alone."),
            ("allyl", "allyl radical", "The C=C next door shares the odd electron between both ends. Resonance makes allylic radicals among the most stable you will meet."),
        ],
        "allyl",
        "An allylic radical is shared between two carbons by resonance, which beats any simple alkyl radical.",
        prov("ranking by charge positions then substitution; positions found through the cation analogue", OS_10_5),
        propene_ref(), tiles=tile_set(t),
        derived=pick(most_stable([s for s, _ in t.values()]), t),
        concepts=CONCEPT_RADICAL,
    )
    ok = compare(tbu, me) == 1 and compare(TBU_C, METHYL_C) == 1 and compare(TBU_A, METHYL_A) == -1
    mcq(
        node, "u1-rad-trend", "Pick the trend alkyl radicals follow.",
        [
            ("none", "No trend, alkyl radicals all tie", "They do not tie. Each carbon on the radical carbon donates a little into its half-empty orbital, so substitution matters."),
            ("anion", "The anion trend, methyl best", "A carbanion has a full lone pair, so donation hurts it. A radical is one electron short of an octet, so donation helps, as for a cation."),
            ("cation", "The cation trend, 3° best", "The radical carbon is one electron short of an octet, so it welcomes donation from alkyl groups, just as a cation does."),
        ],
        "cation",
        "Radicals are electron poor, so they follow the cation trend: 3° > 2° > 1° > methyl.",
        prov("radical, cation and anion alkyl comparisons all derived; radical and cation agree", OS_10_5),
        {"kind": "pair", "a": named(tbu, "tert-butyl radical"), "b": named(me, "methyl radical")},
        level=0, derived="cation" if ok else None,
        concepts=CONCEPT_RADICAL,
    )
    mcq(
        node, "u1-rad-why", "Alkyl groups steady a radical. Pick the reason.",
        [
            ("short", "The carbon is one electron short of an octet", "Seven valence electrons leaves the radical carbon electron poor, so donation from neighbouring C-H bonds helps it, as it helps a cation."),
            ("neg", "The radical carbon is negatively charged", "A radical carries no charge. It has one unpaired electron, which leaves it one short of an octet."),
            ("pull", "Alkyl groups pull density away from it", "Alkyl groups donate rather than withdraw, and an electron-poor radical carbon welcomes that donation."),
        ],
        "short",
        "A radical carbon has seven valence electrons, one short of an octet, so electron donation from alkyl groups stabilises it.",
        prov("radical carbon electron count from RDKit (one radical electron, no charge)", OS_10_5),
        {"kind": "structure", "figure": figure(tbu), "name": "tert-butyl radical"},
        level=0, derived="short" if mol(tbu).GetAtomWithIdx(1).GetNumRadicalElectrons() == 1 and mol(tbu).GetAtomWithIdx(1).GetFormalCharge() == 0 else None,
        concepts=CONCEPT_RADICAL,
    )
    mapped = "[CH2:1]c1[cH:2][cH:4][cH:5][cH:6][cH:3]1"
    pos = positions(unmap(mapped))
    where = sorted(mol(mapped).GetAtomWithIdx(i).GetAtomMapNum() for i in pos)
    mcq(
        node, "u1-rad-benzyl", "Pick where the odd electron of the benzyl radical can sit.",
        [
            ("ch2", "Only on the CH2 carbon", "The CH2 carbon sits next to the ring's pi system, so the odd electron is shared into it. Push one electron at a time and it reaches three ring carbons."),
            ("all", "On the CH2 and every ring carbon", "It skips carbons, the same every-other pattern as the allyl system. The ipso and meta carbons never carry it."),
            ("op", "On the CH2, both ortho and para", "Shift one electron at a time into the ring and the odd electron lands on the two ortho carbons and the para carbon: four carbons in all."),
        ],
        "op",
        "A benzylic radical is shared by the CH2 carbon and the ring's ortho and para carbons. That delocalisation makes it among the most stable radicals.",
        prov("positions from ResonanceMolSupplier on the benzyl cation analogue: CH2, two ortho, para", OS_10_5),
        {"kind": "structure", "figure": numbered(mapped, show=False), "name": "benzyl radical"},
        derived="op" if where == [1, 2, 3, 5] else None,
        concepts=CONCEPT_RADICAL,
    )
    a, b = radical(CROTYL_C), radical(CROTYL_C_1)
    m = mol(a)
    ok = same_ion(a, b) and sorted(carbon_neighbours(m, p) for p in positions(a)) == [1, 2]
    mcq(
        node, "u1-rad-major", "One radical, two contributors. Pick the one that counts for more.",
        [
            ("pri", "The one with the dot on the 1° carbon", "Fewer carbons help the odd electron there. That picture is real and it is the smaller share."),
            ("sec", "The one with the dot on the 2° carbon", "Two carbon neighbours feed that half-empty orbital, so this picture is lower in energy. Radicals follow the cation pattern here."),
            ("equal", "Both count equally", "Both are real, and the methyl makes one end the better home for the odd electron."),
        ],
        "sec",
        "As for cations, the radical contributor with the odd electron on the more substituted carbon counts for more.",
        prov("RDKit confirms one species through the cation analogue; substitution counted at each position", OS_10_5),
        {"kind": "pair", "a": named(a, "dot on the 2° carbon"), "b": named(b, "dot on the 1° carbon")},
        derived="sec" if ok else None,
        concepts=CONCEPT_RADICAL,
    )
    t = {"allyl": (allyl, "allyl radical"), "et": (et, "ethyl radical"), "me": (me, "methyl radical")}
    mcq(
        node, "u1-rad-least", "Pick the LEAST stable radical.",
        [
            ("allyl", "allyl radical", "Resonance spreads its odd electron over two carbons, the best of the three."),
            ("et", "ethyl radical", "One carbon neighbour is a little help, and that is more than methyl gets."),
            ("me", "methyl radical", "No carbon neighbours and no resonance. Nothing helps the odd electron at all."),
        ],
        "me",
        "With no carbon neighbours and no resonance, the methyl radical is the least stable.",
        prov("least stable by charge positions then substitution", OS_10_5),
        ref(tbu, "for scale: tert-butyl radical"), tiles=tile_set(t),
        derived=pick(least_stable([s for s, _ in t.values()]), t),
        concepts=CONCEPT_RADICAL,
    )
    mcq(
        node, "u1-rad-benzyl-vs-3", "Pick the more stable radical.",
        [
            ("tbu", "tert-Butyl, it is 3°", "Three carbon neighbours is the best substitution can do, and resonance is worth more for a radical. The benzylic odd electron is spread over four carbons."),
            ("benzyl", "Benzyl", "Its odd electron is shared over four carbons through the ring. For radicals, resonance like this outweighs being 3°."),
            ("tie", "They tie", "They do not. A benzylic C-H is weaker than a tertiary one, which is how we know the benzylic radical sits lower."),
        ],
        "benzyl",
        "For radicals, allylic and benzylic resonance beats substitution: a benzylic radical is more stable than a 3° alkyl one.",
        prov("radical model: resonance first, then substitution. The radical takeaway names allylic and benzylic as the best", OS_10_5),
        {"kind": "pair", "a": named(tbu, "tert-butyl radical"), "b": named(benzyl, "benzyl radical")},
        level=2, derived="benzyl" if compare(benzyl, tbu) == 1 else None,
        concepts=CONCEPT_RADICAL,
    )
    ring = "[CH:1]1=[CH:2][CH2:3][CH2:4][CH2:5][CH2:6]1"
    made = {"c1": "[C]1=CCCCC1", "c3": radical(CYHEXENYL_C), "c4": "[CH]1CC=CCC1"}
    best = most_stable(list(made.values()))
    pick_c = [k for k, v in made.items() if v == best]
    t2 = {
        "c1": {"figure": numbered(ring, marks=(1,), show=False), "name": "a C=C carbon"},
        "c3": {"figure": numbered(ring, marks=(3,), show=False), "name": "next to the C=C"},
        "c4": {"figure": numbered(ring, marks=(4,), show=False), "name": "two carbons away"},
    }
    mcq(
        node, "u1-rad-ring-h", "Take one H off cyclohexene to make the best radical. Pick the carbon.",
        [
            ("c1", "On a carbon of the C=C", "That leaves the odd electron on the alkene carbon itself, in an orbital at right angles to the pi bond, so the pi electrons cannot share it. No resonance."),
            ("c3", "On the carbon next to the C=C", "That is the allylic carbon. The radical left behind is shared with the far end of the alkene, so it is the cheapest one to make."),
            ("c4", "Two carbons away from the C=C", "A plain secondary radical. The C=C is too far away to share the odd electron."),
        ],
        "c3",
        "The allylic position gives the most stable radical, because the odd electron is shared with the far end of the C=C.",
        prov("the three radicals built and ranked by charge positions then substitution", OS_10_5),
        {"kind": "structure", "figure": numbered(ring), "name": "cyclohexene, numbered"}, tiles=t2, brief="Picture the radical each choice leaves behind.",
        derived=pick_c[0] if len(pick_c) == 1 else None,
        concepts=CONCEPT_RADICAL,
    )
    # CONVERTED 2026-10-17 (U1-P3 round 2): was a pick-the-most-stable MCQ with
    # the same id and the same three radicals; every pair is decidable.
    ladder(
        node, "u1-rad-ring",
        [
            ("ene", "cyclohex-2-enyl radical", cy_ene, "Allylic: the C=C next door shares the odd electron with the far end, and resonance counts for more than one extra alkyl group."),
            ("me", "1-methylcyclohexyl radical", me_cy, "Tertiary is the best a plain alkyl radical can do, with no resonance."),
            ("cy", "cyclohexyl radical", cy, "Secondary with no resonance. It loses to both of the others."),
        ],
        "Rank these ring radicals, most stable at the top.",
        "Look for resonance first, then count carbons on the radical carbon.",
        "radical_stability", "descending", ("Most stable", "Least stable"),
        "Rank three six-ring radicals by stability, most stable first: cyclohex-2-enyl, 1-methylcyclohexyl and cyclohexyl.",
        (
            "Cyclohex-2-enyl, then 1-methylcyclohexyl, then cyclohexyl.",
            "Only cyclohex-2-enyl can share its odd electron by resonance, so it is first. Without resonance, substitution decides, and for a radical more carbons on the radical carbon is better, so tertiary beats secondary.",
            "Look for a C=C next to the radical carbon first, then count carbons on it.",
        ),
        [
            ("ranked-least-stable-first", ["cy", "me", "ene"], "ordering_is_reversed", rev("the cyclohex-2-enyl radical")),
            ("tertiary-above-allylic", ["me", "ene", "cy"], "ordering_one_adjacent_pair_swapped", (
                "1-Methylcyclohexyl is placed above cyclohex-2-enyl.",
                "Being 3° helps, but resonance helps more: the allylic radical spreads its odd electron over two carbons.",
                "Push one electron of the C=C toward the radical carbon of cyclohex-2-enyl and see where the odd electron lands.",
            )),
            ("secondary-above-tertiary", ["ene", "cy", "me"], "ordering_one_adjacent_pair_swapped", (
                "Cyclohexyl is placed above 1-methylcyclohexyl.",
                "That is the anion trend. A radical is electron poor, so the extra methyl on the tertiary carbon helps it.",
                "Count carbons on the radical carbon of those two: for a radical, more wins.",
            )),
        ],
        "Allylic resonance outweighs substitution for radicals: a 2° allylic radical beats a 3° alkyl one, which beats a 2° alkyl one.",
        prov("radical model: resonance first, then substitution; every adjacent pair checked decidable", OS_10_5),
        "allylic_halogenation", CONCEPT_RADICAL, 1150,
    )


# ---------------------------------------------------------------------------
# u1-quiz-a: a mixed 10 over cations, anions and resonance. No radicals:
# radical items reach a quiz only through Challenge mode.
# ---------------------------------------------------------------------------

PRENYL_C_1 = "[CH2+]C=C(C)C"
PRENYL_C_3 = "C=C[C+](C)C"


def node_quiz_a() -> None:
    node = "u1-quiz-a"
    ladder(
        node, "u1-qa-ladder-cation",
        [
            ("penta", "pentadienyl", "[CH2+]C=CC=C", "Three carbons share the charge."),
            ("all2", "crotyl", CROTYL_C, "Two carbons share it, and one of them is secondary."),
            ("ipr", "isopropyl", IPR_C, "Secondary, but one carbon holds the whole charge."),
            ("et", "ethyl", ETHYL_C, "Primary and no resonance."),
        ],
        "Rank these cations, most stable at the top.",
        "Draw every contributor before you rank.",
        "carbocation_stability", "descending", ("Most stable", "Least stable"),
        "Rank these four carbocations by stability, most stable first: pentadienyl, but-3-en-2-yl, isopropyl and ethyl.",
        (
            "Pentadienyl, then 2° allylic, then isopropyl, then ethyl.",
            "The pentadienyl cation shares its charge over three carbons and the 2° allylic over two, with the same best substitution. The 2° allylic cation also beats isopropyl: same secondary carbon, plus resonance. Ethyl is primary with nothing else.",
            "For each card, count the carbons that carry the charge, then the carbons on the best one.",
        ),
        [
            ("ranked-least-stable-first", ["et", "ipr", "all2", "penta"], "ordering_is_reversed", rev("the cation with two conjugated C=C")),
            ("isopropyl-above-allylic", ["penta", "ipr", "all2", "et"], "ordering_one_adjacent_pair_swapped", (
                "Isopropyl is placed above the 2° allylic cation.",
                "Both have a secondary charged carbon. Only the allylic one also shares the charge with a second carbon, so it sits higher.",
                "Draw the second contributor of the allylic card.",
            )),
            ("allylic-above-pentadienyl", ["all2", "penta", "ipr", "et"], "ordering_one_adjacent_pair_swapped", (
                "The 2° allylic cation is placed above pentadienyl.",
                "Pentadienyl has a second conjugated C=C that carries the charge on to a third carbon, and its middle charged carbon is secondary too.",
                "Keep pushing arrows on the pentadienyl card until the charge stops moving.",
            )),
        ],
        "Draw every contributor, count the carbons sharing the charge, then count substitution.",
        prov("charge positions from ResonanceMolSupplier; every adjacent pair checked decidable", OS_7_9, OS_14_2),
        "carbocation_stability_and_rearrangement", CONCEPT_RES, 1300,
    )
    ladder(
        node, "u1-qa-ladder-anion",
        [
            ("sp", "ethynyl", ETHYNYL_A, "sp lone pair, held closest."),
            ("sp2", "vinyl", VINYL_A, "sp2 lone pair."),
            ("me", "methyl", METHYL_A, "sp3 lone pair, and no alkyl groups."),
            ("et", "ethyl", ETHYL_A, "sp3 lone pair plus an alkyl group pushing on it."),
        ],
        "Rank these carbanions, most stable at the top.",
        "Orbital first, then alkyl groups.",
        "carbanion_stability", "descending", ("Most stable", "Least stable"),
        "Rank these four carbanions by stability, most stable first: ethynyl, vinyl, methyl and ethyl.",
        (
            "Ethynyl, then vinyl, then methyl, then ethyl.",
            "More s character holds the lone pair closer: sp, then sp2, then sp3. Methyl and ethyl are both sp3, and the alkyl group on ethyl pushes more density onto its charge.",
            "Name each lone pair's orbital, then count alkyl groups on the two sp3 cards.",
        ),
        [
            ("ranked-least-stable-first", ["et", "me", "sp2", "sp"], "ordering_is_reversed", rev("the sp anion, ethynyl")),
            ("methyl-above-vinyl", ["sp", "me", "sp2", "et"], "ordering_one_adjacent_pair_swapped", (
                "Methyl is placed above vinyl.",
                "Neither has an alkyl group on its charged carbon, so the orbital decides: vinyl's lone pair is sp2 and methyl's is sp3.",
                "Name the orbital on those two charged carbons.",
            )),
            ("ethyl-above-methyl", ["sp", "sp2", "et", "me"], "ordering_one_adjacent_pair_swapped", (
                "Ethyl is placed above methyl.",
                "Both lone pairs are sp3. Ethyl carries one alkyl group donating onto the charge and methyl none.",
                "Those two tie on the orbital, so count alkyl groups.",
            )),
        ],
        "For a carbanion: more s character first, then fewer alkyl groups.",
        prov("hybridisation read from the bonds at the charged carbon; every adjacent pair checked decidable", OS_7_9),
        "pka_and_acidity", CONCEPT_ANION, 1250,
    )
    m = mol(PRENYL_C_1)
    subs = {p: carbon_neighbours(m, p) for p in positions(PRENYL_C_1)}
    ok = same_ion(PRENYL_C_1, PRENYL_C_3) and sorted(subs.values()) == [1, 3]
    mcq(
        node, "u1-qa-prenyl-cation", "One cation, two contributors. Pick the one that counts for more.",
        [
            ("pri", "The one with + on the 1° carbon", "One carbon neighbour helps there. Two methyls help at the other end, so this is the smaller share."),
            ("equal", "Both count equally", "Both are real, and one puts the charge where three carbons help it."),
            ("ter", "The one with + on the 3° carbon", "Three carbon neighbours feed that empty orbital, so this picture is lower in energy and counts for more."),
        ],
        "ter",
        "For a cation, the better contributor puts the charge on the MORE substituted carbon.",
        prov("RDKit confirms one ion; substitution counted at each charge position", OS_14_2),
        {"kind": "pair", "a": named(PRENYL_C_1, "+ on the 1° carbon"), "b": named(PRENYL_C_3, "+ on the 3° carbon")},
        derived="ter" if ok else None,
    )
    a1, a3 = anion(PRENYL_C_1), anion(PRENYL_C_3)
    m = mol(a1)
    pos = positions(a1)
    alk = sorted(alkyl_on(m, p, pos) for p in pos)
    ok = same_ion(a1, a3) and alk == [0, 2]
    mcq(
        node, "u1-qa-prenyl-anion", "Same skeleton, now an anion. Pick the contributor that counts for more.",
        [
            ("ter", "The one with − on the 3° carbon", "That is the cation answer. Two methyls push density onto that end, which hurts a negative charge."),
            ("pri", "The one with − on the 1° carbon", "No alkyl group donates onto the end carbon, so the negative charge sits there more comfortably."),
            ("equal", "Both count equally", "Both are real, and the two methyls make one end a much worse home for a negative charge."),
        ],
        "pri",
        "For an anion, the better contributor puts the charge on the LESS substituted carbon.",
        prov("RDKit confirms one ion; alkyl groups counted at each charge position", OS_7_9),
        {"kind": "pair", "a": named(a3, "− on the 3° carbon"), "b": named(a1, "− on the 1° carbon")},
        derived="pri" if ok else None,
        concepts=CONCEPT_CARBANION,
    )
    t = {"tbu": (TBU_C, "tert-butyl, 3°"), "all2": (CROTYL_C, "2° allylic"), "all3": (PRENYL_C, "3° allylic"), "all1": (ALLYL_C, "allyl, 1° allylic")}
    mcq(
        node, "u1-qa-best-cation", "Pick the most stable cation.",
        [
            ("tbu", "tert-butyl, 3°", "Tertiary, but one carbon holds the whole charge. The 3° allylic cation is just as substituted and shares the charge too."),
            ("all2", "2° allylic", "Resonance, and a secondary charged carbon. The 3° allylic cation has the same resonance and one more methyl."),
            ("all3", "3° allylic", "It wins on both counts: resonance shares the charge, and the better charged carbon is tertiary."),
            ("all1", "allyl, 1° allylic", "Resonance, but both charged carbons are primary."),
        ],
        "all3",
        "The most stable cation is the one at least as good as every other on both resonance and substitution.",
        prov("most stable by dominance over charge positions and substitution", OS_7_9),
        ref(METHYL_C, "for scale: methyl, no help at all"), tiles=tile_set(t),
        derived=pick(most_stable([s for s, _ in t.values()]), t),
    )
    t = {"ipr": (IPR_A, "isopropyl anion"), "et": (ETHYL_A, "ethyl anion"), "tbu": (TBU_A, "tert-butyl anion"), "allyl": (ALLYL_A, "allyl anion")}
    mcq(
        node, "u1-qa-best-anion", "Pick the most stable carbanion.",
        [
            ("ipr", "isopropyl anion", "Two alkyl groups push on its charge, and nothing shares it."),
            ("et", "ethyl anion", "The best of the plain alkyl anions here, with one alkyl group. The allyl anion has none and resonance too."),
            ("tbu", "tert-butyl anion", "Three alkyl groups and no resonance: the worst of the four."),
            ("allyl", "allyl anion", "Resonance shares the charge over two carbons, and no alkyl group pushes on either one."),
        ],
        "allyl",
        "Resonance stabilises a carbanion and alkyl groups destabilise it. The allyl anion has the first and none of the second.",
        prov("most stable by dominance over charge positions, orbital and alkyl groups", OS_7_9),
        ref(METHYL_A, "for scale: the methyl anion"), tiles=tile_set(t),
        derived=pick(most_stable([s for s, _ in t.values()]), t),
        concepts=CONCEPT_CARBANION,
    )
    mcq(
        node, "u1-qa-middle-methyl", "Pick the more stable cation.",
        [
            ("crotyl", "The 2° allylic cation", "One of its two charged carbons is secondary. The other cation's methyl sits on the middle carbon, which never carries the charge."),
            ("methallyl", "2-methylallyl, it has a methyl", "Its methyl is on C2, the carbon the charge skips. Both of its charged carbons are primary."),
            ("tie", "They tie, same atoms", "Same formula, different positions. Only a methyl on a charged carbon helps."),
        ],
        "crotyl",
        "Substitution only counts on carbons that carry the charge. Draw the contributors first.",
        prov("dominance over charge positions and substitution", OS_7_9, OS_14_2),
        {"kind": "pair", "a": named(CROTYL_C, "2° allylic"), "b": named(METHALLYL_C, "2-methylallyl")},
        derived="crotyl" if compare(CROTYL_C, METHALLYL_C) == 1 else None,
    )
    mapped = "[CH2+:1][CH:2]=[CH:3][CH:4]=[CH:5][CH:6]=[CH2:7]"
    where = sorted(mol(mapped).GetAtomWithIdx(i).GetAtomMapNum() for i in positions(unmap(mapped)))
    mcq(
        node, "u1-qa-heptatrienyl", "Pick the carbons that share the charge in this cation.",
        [
            ("three", "C1, C3 and C5", "Two pushes in, the third C=C can still push again and carry the charge on to C7."),
            ("four", "C1, C3, C5 and C7", "Three conjugated C=C bonds carry the charge to every odd-numbered carbon, all the way to the end."),
            ("seven", "All seven carbons", "The even-numbered carbons keep four bonds in every contributor, so they never carry the charge."),
        ],
        "four",
        "In a conjugated chain the charge lands on every other carbon, as far as the pi bonds reach.",
        prov("charge positions from ResonanceMolSupplier", OS_14_2),
        {"kind": "structure", "figure": numbered(mapped), "name": "a heptatrienyl cation, numbered"},
        derived="four" if where == [1, 3, 5, 7] else None,
    )
    t = {"allyl": (ALLYL_C, "allyl cation"), "homo": (HOMOALLYL_C, "but-3-enyl cation"), "ene": (CYHEXENYL_C, "cyclohex-2-enyl cation")}
    single = [o for o, (s, _) in t.items() if len(positions(s)) == 1]
    mcq(
        node, "u1-qa-no-resonance", "Pick the cation with NO second resonance contributor.",
        [
            ("allyl", "allyl cation", "Its charged carbon sits next to a C=C, so the charge is shared with the far end."),
            ("homo", "but-3-enyl cation", "A CH2 separates the charge from the C=C, so no arrow connects them. One carbon holds the charge."),
            ("ene", "cyclohex-2-enyl cation", "In a ring or not, the charged carbon is next to a C=C, so the charge is shared."),
        ],
        "homo",
        "Resonance needs the C=C directly next to the charged carbon. One CH2 in between switches it off.",
        prov("contributors enumerated with ResonanceMolSupplier", OS_14_2),
        propene_ref(), tiles=tile_set(t),
        derived=single[0] if len(single) == 1 else None,
    )
    ok = (
        compare(ALLYL_C, "CC[CH2+]") == 1
        and compare(ALLYL_A, "CC[CH2-]") == 1
        and compare(IPR_C, ETHYL_C) == 1
        and compare(IPR_A, ETHYL_A) == -1
        and compare(VINYL_A, ETHYL_A) == 1
    )
    mcq(
        node, "u1-qa-shared-rule", "Pick the effect that steadies BOTH cations and anions.",
        [
            ("alkyl", "More alkyl groups on the charged carbon", "Alkyl groups donate. That helps a cation and hurts an anion, so it is the effect that flips."),
            ("s", "More s character at the charged carbon", "That steadies a lone pair, so it helps anions. A cation's empty orbital gains nothing from it."),
            ("res", "Resonance that spreads the charge", "Spreading a charge over more carbons helps whatever its sign. The allyl cation and the allyl anion both owe their stability to it."),
        ],
        "res",
        "Resonance helps both. Alkyl groups help cations and hurt anions; s character helps anions.",
        prov("allyl beats propyl for both charges; isopropyl beats ethyl as a cation and loses as an anion", OS_7_9, OS_14_2),
        {"kind": "pair", "a": named(ALLYL_C, "allyl cation"), "b": named(ALLYL_A, "allyl anion")},
        derived="res" if ok else None,
    )


# ---------------------------------------------------------------------------
# Stage B
#
# Every product caption that is a systematic name is checked with OPSIN
# (py2opsin): the name is parsed back to a structure and must match the
# structure drawn above it, so a caption cannot drift from its drawing.
# ---------------------------------------------------------------------------

NAME_CHECKS: list[tuple[str, str, str]] = []


def iupac(smi: str, name: str, where: str) -> dict:
    NAME_CHECKS.append((smi, name, where))
    return named(smi, name)


def check_names() -> None:
    if not NAME_CHECKS:
        return
    from py2opsin import py2opsin

    parsed = py2opsin([n for _, n, _ in NAME_CHECKS])
    for (smi, name, where), got in zip(NAME_CHECKS, parsed):
        if not got or canon(got) != canon(smi):
            fail(f"{where}: OPSIN reads '{name}' as {got or 'nothing'}, the drawing is {canon(smi)}")


def iupac_tiles(table: dict[str, tuple[str, str]], where: str) -> dict:
    return {o: iupac(s, n, f"{where}::{o}") for o, (s, n) in table.items()}


def ed(ta: float, pa: float, tb: float, pb: float, start: float = 4.0) -> dict:
    """Read a two product diagram: who is fast, who is stable, who goes back easily."""
    return {
        "kinetic": "A" if ta < tb else "B" if tb < ta else None,
        "thermo": "A" if pa < pb else "B" if pb < pa else None,
        "back": "A" if ta - pa < tb - pb else "B" if tb - pb < ta - pa else None,
        "above": [k for k, p in (("A", pa), ("B", pb)) if p > start],
    }


def energy(name: str, ta: float, pa: float, tb: float, pb: float, **kw) -> dict:
    return {"kind": "structure", "figure": energy_figure(ta, pa, tb, pb, **kw), "name": name}


def attach(mapped: str, mapnum: int, x: str) -> str:
    """Neutralise the charged atom at `mapnum` by bonding X to it."""
    rw = Chem.RWMol(mol(unmap(mapped)))
    idx = atom_index(mapped, mapnum)
    rw.GetAtomWithIdx(idx).SetFormalCharge(0)
    n = rw.AddAtom(Chem.Atom(x))
    rw.AddBond(idx, n, Chem.BondType.SINGLE)
    return _finish(rw)


BUTADIENE = "C=CC=C"
ISOPRENE = "C=C(C)C=C"
DMB = "C=C(C)C(C)=C"
PIPERYLENE = "C=CC=CC"
HEXADIENE = "CC=CC=CC"
MP2 = "C=C(C)C=CC"
MP4 = "C=CC=C(C)C"
CHD = "C1=CCCC=C1"
CPD = "C1=CCC=C1"

COLD = "minus 80 degrees: nothing reverses, so the faster product is locked in"
WARM = "40 degrees, given time: both products can return to the cation"
COLD_UNDER = "-80 degrees"
WARM_UNDER = "40 degrees"


def node_kvt() -> None:
    node = "u1-kvt"
    d = ed(7.0, 2.6, 8.6, 0.8)
    mcq(
        node, "u1-kvt-define-kinetic", "Pick what makes a product the kinetic product.",
        [
            ("deep", "It sits lower in energy at the end", "That is the thermodynamic product, B here. Depth is stability, and stability wins only when the reaction can reverse."),
            ("low", "It forms over the lower barrier", "Kinetic means fastest, and the fastest product is the one with the lowest transition state to climb. On this diagram that is A."),
            ("alkene", "It has the more substituted alkene", "That is how to spot the more stable product of a diene addition, the thermodynamic one. Kinetic is about the barrier, not the product."),
        ],
        "low",
        "The kinetic product has the lowest barrier (lowest transition state), so it forms fastest.",
        prov("read off the diagram's numbers: A has the lower transition state, B the deeper well", OS_14_3),
        energy("A: lower hump. B: deeper well.", 7.0, 2.6, 8.6, 0.8),
        level=0, concepts=CONCEPT_KVT, derived="low" if d["kinetic"] == "A" and d["thermo"] == "B" else None,
    )
    d = ed(8.4, 0.8, 7.0, 2.6)
    mcq(
        node, "u1-kvt-define-conditions", "Pick the conditions that let the thermodynamic product win.",
        [
            ("cold", "Cold, so nothing goes back", "Cold makes the first product permanent, so the fastest route wins. That is the kinetic product, B on this diagram."),
            ("warm", "Warm and reversible, given time", "Warm gives both products enough energy to climb back to the start. Given time, the mixture settles into the deepest well, A here."),
            ("wait", "Any temperature, if you wait long enough", "Waiting does nothing if the products cannot climb back. When it is cold the climb back is too high, so the fast product stays."),
        ],
        "warm",
        "The thermodynamic product has the lowest G. It wins when the reaction is warm and reversible, so the products can re-sort by stability.",
        prov("read off the diagram's numbers: B has the lower transition state, A the deeper well", OS_14_3),
        energy("A: deeper well. B: lower hump.", 8.4, 0.8, 7.0, 2.6),
        level=0, concepts=CONCEPT_KVT, derived="warm" if d["thermo"] == "A" and d["kinetic"] == "B" else None,
    )


def node_energy() -> None:
    node = "u1-energy-diagram"
    k = dict(concepts=CONCEPT_KVT)

    p = (7.0, 2.6, 8.6, 0.8)
    mcq(
        node, "u1-ed-faster", "Pick the product that forms faster.",
        [
            ("b", "B", "B sits deeper, which is stability, not speed. Speed is set by the height of the hump, and B's is the taller one."),
            ("a", "A", "A's hump is lower, so less energy is needed to reach its transition state and more molecules make it over each second."),
            ("same", "They form equally fast", "Equal speed would need equal humps. A's transition state sits clearly lower than B's."),
        ],
        "a", "TS height is speed: the lower hump forms its product faster.",
        prov("kinetic product read off the diagram's transition state heights", OS_14_3),
        energy("two products from one start", *p), level=0, derived="a" if ed(*p)["kinetic"] == "A" else None, **k,
    )
    p = (8.6, 0.8, 7.0, 2.6)
    mcq(
        node, "u1-ed-stable", "Pick the more stable product.",
        [
            ("a", "A", "A ends in the deeper well. Lower free energy at the end of the path is what stable means."),
            ("b", "B", "B's hump is lower, so B forms faster. Stability is the depth of the well at the end, and A's is deeper."),
            ("same", "Neither, both start in the same place", "A shared start says nothing about where each path ends. Compare the two wells."),
        ],
        "a", "Product depth is stability: the deeper well is the more stable product.",
        prov("thermodynamic product read off the diagram's product depths", OS_14_3),
        energy("two products from one start", *p), level=0, derived="a" if ed(*p)["thermo"] == "A" else None, **k,
    )
    p = (7.2, 2.8, 8.6, 0.8)
    mcq(
        node, "u1-ed-cold", "Run this cold, where nothing reverses. Pick the major product.",
        [
            ("b", "B, the more stable one", "B is more stable, and stability only gets a vote when products can go back. Cold, they cannot, so the faster route decides."),
            ("mix", "An even mix", "An even mix would need equal humps. A's is lower, and cold locks in whichever forms faster."),
            ("a", "A, the faster one", "Cold means each molecule goes over the lower hump and stays there. A's transition state is lower, so A is the major product."),
        ],
        "a", "Cold and irreversible: the product over the lower hump (kinetic) wins.",
        prov("kinetic product read off the diagram's transition state heights", OS_14_3),
        energy("two products from one start", *p), conditions=COLD, derived="a" if ed(*p)["kinetic"] == "A" else None, **k,
    )
    p = (8.4, 0.6, 7.0, 2.6)
    mcq(
        node, "u1-ed-warm", "Run this warm, where both products can go back. Pick the major product.",
        [
            ("b", "B, the faster one", "B forms first, and warm gives it a way back up its low hump. Once both can reverse, the mixture settles into the deepest well, which is A."),
            ("a", "A, the more stable one", "Warm lets both products return to the start and choose again. Over time they collect in the deeper well, and that is A."),
            ("mix", "An even mix", "An even mix needs equal wells. A's well is deeper, so A collects."),
        ],
        "a", "Warm and reversible: the product in the deeper well (thermodynamic) wins.",
        prov("thermodynamic product read off the diagram's product depths", OS_14_3),
        energy("two products from one start", *p), conditions=WARM, derived="a" if ed(*p)["thermo"] == "A" else None, **k,
    )
    p = (7.0, 0.8, 8.6, 2.6)
    d = ed(*p)
    mcq(
        node, "u1-ed-both", "Pick the major product when warm, and when cold.",
        [
            ("ba", "B cold, A warm", "Cold picks the lower hump, and that is A's, not B's."),
            ("ab", "A cold, B warm", "Warm picks the deeper well, and A has that too. Here one product wins on both counts."),
            ("aa", "A at both temperatures", "A has the lower hump and the deeper well, so speed and stability agree. Temperature only matters when they disagree."),
        ],
        "aa", "When one product has both the lower TS and the deeper well, it wins at every temperature.",
        prov("kinetic and thermodynamic products both read off the diagram", OS_14_3),
        energy("two products from one start", *p), derived="aa" if d["kinetic"] == d["thermo"] == "A" else None, **k,
    )
    p = (7.2, 2.0, 8.6, 1.0)
    gaps = [(44, 4.0, 7.2, "x"), (12, 2.0, 7.2, "y"), (76, 4.0, 8.6, "z")]
    ok = gaps[0][1] == 4.0 and gaps[0][2] == p[0]
    mcq(
        node, "u1-ed-gap", "Pick the gap that sets how fast A forms.",
        [
            ("y", "y", "y is the climb from A back up to the top of its hump. That is the barrier for A going BACK, which matters when the flask is warm."),
            ("z", "z", "z is B's climb, from the start up to B's transition state. It sets how fast B forms."),
            ("x", "x", "x runs from the start up to A's transition state. That climb is A's activation energy, and a smaller climb means faster."),
        ],
        "x", "The forward barrier, from the start to the transition state, sets the rate.",
        prov("gap x drawn from the start level to A's transition state", OS_14_3),
        energy("three gaps, x, y and z", *p, gaps=gaps), derived="x" if ok else None, **k,
    )
    p = (7.0, 3.0, 8.6, 0.8)
    mcq(
        node, "u1-ed-goes-back", "Warm the flask. Pick the product that climbs back more easily.",
        [
            ("a", "A", "A's well is shallow and its hump is low, so the climb back up is short. That is why warming drains A toward the deeper product."),
            ("b", "B", "B sits in a deep well under a tall hump. The climb back is long, which is why B is the product that piles up."),
            ("none", "Neither, products cannot go back", "Warm is exactly when they can. Every step here reverses if the molecule has the energy for the climb back."),
        ],
        "a", "The kinetic product usually has the shorter climb back, so warming drains it toward the thermodynamic product.",
        prov("reverse barriers (TS minus product) read off the diagram", OS_14_3),
        energy("two products from one start", *p), derived="a" if ed(*p)["back"] == "A" else None, **k,
    )
    p = (8.6, 0.8, 7.2, 2.8)
    d = ed(*p)
    mcq(
        node, "u1-ed-disagree", "Pick what speed and stability say on this diagram.",
        [
            ("same", "Both pick A", "A wins on depth only. B's hump is the lower one, so B is faster."),
            ("ba", "Speed picks B, stability picks A", "B has the lower hump, so it forms faster. A has the deeper well, so it is more stable. They point at different products."),
            ("ab", "Speed picks A, stability picks B", "Both halves are reversed. Speed is the lower hump, B's; stability is the deeper well, A's."),
        ],
        "ba", "TS height is speed and product depth is stability. They can point at different products.",
        prov("kinetic and thermodynamic products both read off the diagram", OS_14_3),
        energy("two products from one start", *p), derived="ba" if d["kinetic"] == "B" and d["thermo"] == "A" else None, **k,
    )
    p = (7.6, 2.8, 7.6, 1.0)
    mcq(
        node, "u1-ed-equal-ts", "Pick the product that forms faster.",
        [
            ("b", "B, it ends lower", "Ending lower is stability. Speed is the height of the hump, and these two humps are the same height."),
            ("a", "A", "A's hump is no lower than B's. Equal humps means equal speed."),
            ("same", "About equally fast", "The two transition states sit at the same height, so the two products form at about the same rate."),
        ],
        "same", "Equal transition state heights mean equal rates, whatever the wells look like.",
        prov("transition state heights on the diagram are equal", OS_14_3),
        energy("two products from one start", *p), derived="same" if ed(*p)["kinetic"] is None else None, **k,
    )
    p = (7.0, 1.6, 8.4, 1.6)
    mcq(
        node, "u1-ed-equal-depth", "Warm and reversible, given time. Pick the outcome.",
        [
            ("a", "Mostly A, it formed first", "Warm means A can go back. Once both can reverse, only depth matters, and the two wells are the same depth."),
            ("mix", "About an even mix", "Given time to reverse, the mixture settles by depth alone, and the two wells are equally deep."),
            ("b", "Mostly B", "B's hump is taller and its well no deeper, so nothing favours it."),
        ],
        "mix", "Under thermodynamic control only the depths matter. Equal depths give an even mix.",
        prov("product depths on the diagram are equal", OS_14_3),
        energy("two products from one start", *p), conditions=WARM, derived="mix" if ed(*p)["thermo"] is None else None, **k,
    )
    p = (7.8, 5.4, 8.8, 1.4)
    d = ed(*p)
    mcq(
        node, "u1-ed-uphill", "Pick the product that ends HIGHER than the start.",
        [
            ("b", "B", "B's path ends well below the start, so B is lower in energy than where the reaction began."),
            ("none", "Neither, products always end lower", "A product can end above the start, and the diagram shows one: A's well sits above the start's line."),
            ("a", "A", "A's well sits above the starting level. Making A costs energy overall, so warm conditions drain it away."),
        ],
        "a", "Read each product's depth against the start's line, not just against the other product.",
        prov("product levels compared with the start level on the diagram", OS_14_3),
        energy("two products from one start", *p), derived="a" if d["above"] == ["A"] else None, **k,
    )
    p = (7.0, 2.6, 8.6, 0.6)
    d = ed(*p)
    mcq(
        node, "u1-ed-switch", "Cool this flask from 40 to minus 80 degrees. Pick how the major product changes.",
        [
            ("ab", "From A to B", "Reversed. Warm gave the deeper well, B. Cold gives the lower hump, A."),
            ("ba", "From B to A", "Warm, the deeper well wins, and that is B. Cold, nothing reverses, so the lower hump wins, and that is A."),
            ("none", "No change, B both times", "B wins only while products can reverse. At minus 80 they cannot, so the lower hump decides, and that is A's."),
        ],
        "ba", "Warm gives the thermodynamic product, cold the kinetic one. When they differ, cooling switches the major product.",
        prov("kinetic and thermodynamic products both read off the diagram", OS_14_3),
        energy("two products from one start", *p), level=2, derived="ba" if d["thermo"] == "B" and d["kinetic"] == "A" else None, **k,
    )


def node_12v14() -> None:
    node = "u1-12v14"
    k = dict(concepts=CONCEPT_KVT + CONCEPT_RES)
    r = diene_addition(BUTADIENE, "H", "Br")
    ok = r["attacked"] in (0, 3) and compare(r["cation"], inner_cation(BUTADIENE)) == 1
    mcq(
        node, "u1-12v14-protonate", "H+ adds to buta-1,3-diene first. Pick the carbon it adds to.",
        [
            ("c2", "C2, an inner carbon", "Protonating C2 leaves the charge on C1, an end carbon with no pi bond beside it. A primary cation with no resonance is the worst choice."),
            ("either", "Either one, same cation", "They give different cations: C1 gives an allylic one shared over two carbons, C2 a primary one stuck on one carbon."),
            ("c1", "C1, an end carbon", "Protonating C1 leaves the charge on C2, right beside the C3=C4 pi bond. That is an allylic cation, shared between C2 and C4."),
        ],
        "c1", "Protonate an END carbon of the diene: that is the move that leaves an allylic cation.",
        prov("both protonations built; the allylic cation from C1 beats the primary one from C2", OS_14_2),
        {"kind": "structure", "figure": numbered("[CH2:1]=[CH:2][CH:3]=[CH2:4]"), "name": "buta-1,3-diene, numbered"},
        level=0, derived="c1" if ok else None, **k,
    )
    c2 = "[CH3:1][CH+:2][CH:3]=[CH2:4]"
    c4 = "[CH3:1][CH:2]=[CH:3][CH2+:4]"
    ok = same_ion(unmap(c2), unmap(c4)) and canon(attach(c4, 4, "Br")) == r["p14"] and canon(attach(c2, 2, "Br")) == r["p12"]
    mcq(
        node, "u1-12v14-which-carbon", "Bromide attacks this cation. Pick the carbon that gives the 1,4 product.",
        [
            ("c2", "C2", "Bromide on C2, right beside the new C-H, is the 1,2 product. The 1,4 product puts it on the far end."),
            ("c4", "C4", "C4 carries the charge in the second contributor. Bromide there puts H on C1 and Br on C4, with the C=C moved to the middle: the 1,4 product."),
            ("c3", "C3", "C3 keeps four bonds in both contributors, so it never carries the charge and bromide has nothing to bond to there."),
        ],
        "c4", "Both contributors are needed: C2 gives the 1,2 product and C4 gives the 1,4 product.",
        prov("bromide attached at each charged carbon; C4 reproduces the 1,4 product", OS_14_2),
        {"kind": "pair", "a": {"figure": numbered(c2), "name": "+ on C2"}, "b": {"figure": numbered(c4), "name": "+ on C4"}},
        level=0, derived="c4" if ok else None, **k,
    )
    t = {
        "p12": (r["p12"], "3-bromobut-1-ene"),
        "inner": (inner_product(BUTADIENE, "H", "Br"), "4-bromobut-1-ene"),
        "p14": (r["p14"], "1-bromobut-2-ene"),
    }
    mcq(
        node, "u1-12v14-pick-14", "Pick the 1,4 product of HBr and buta-1,3-diene.",
        [
            ("p12", "3-bromobut-1-ene", "This is the 1,2 product: H on C1 and Br on C2, right next door. The 1,4 product puts Br on C4 and moves the C=C to the middle."),
            ("inner", "4-bromobut-1-ene", "H on C2 and Br on C1 needs the primary cation with no resonance. Protonation goes to the end carbon instead, the move that makes an allylic cation."),
            ("p14", "1-bromobut-2-ene", "H on C1, Br on C4, and the C=C now between C2 and C3. Only the second contributor of the allylic cation explains it."),
        ],
        "p14", "1,4 addition: H on C1, the nucleophile on C4, and the double bond moves to C2=C3.",
        prov("1,2 and 1,4 products built from the allylic cation; names checked with OPSIN", OS_14_2),
        scheme_visual(BUTADIENE, "buta-1,3-diene", "HBr"),
        tiles=iupac_tiles(t, "u1-12v14-pick-14"), level=0, derived=pick(r["p14"], t), **k,
    )


def produce(
    node: str,
    id: str,
    diene: str,
    diene_name: str,
    e: str,
    nu: str,
    warm: bool,
    prompt: str,
    options: list,
    correct: str,
    explanation: str,
    table: dict,
    brief: str | None = None,
    level: int = 1,
    as_draw: bool = False,
) -> None:
    """A run-it item: given diene, reagent and temperature, pick the major product.

    CONVERTED with as_draw (U1-P3 round 2): the same id, diene, conditions and
    derived answer, asked as "Draw the major product". Each wrong option becomes
    a named miss whose coach line is that option's own authored why, so a
    student who draws the 1,2 product is told exactly what the MCQ would have
    told them for picking it."""
    r = diene_addition(diene, e, nu)
    answer = r["thermo"] if warm else r["kinetic"]
    reagent = {"H": "H" + nu, "Br": "Br_2", "Cl": "Cl_2"}[e]
    if as_draw:
        if pick(answer, table) != correct:
            fail(f"{id}: the derived answer is not the authored correct option")
            return
        roles = {"p12": "the 1,2 product", "p14": "the 1,4 product", "inner": "the product of H+ on an inner carbon",
                 "loser": "the product of the weaker cation", "tetra": "the product of two equivalents"}
        whys = {key: text for key, _, text in options}
        draw_prompt = prompt.replace("Pick the major product.", "Draw the major product.")
        if draw_prompt == prompt:
            fail(f"{id}: converted prompt did not change")
        first = "H+" if e == "H" else "the first " + e
        draw(
            node, id, draw_prompt,
            brief or f"Decide where {first} goes, then read the temperature.",
            scheme_visual(diene, diene_name, reagent + ", 1 equiv", WARM_UNDER if warm else COLD_UNDER),
            answer, table[correct][1], whys[correct], explanation, explanation,
            prov(f"{'thermodynamic' if warm else 'kinetic'} call from diene_addition; misses are the MCQ's derived options; names checked with OPSIN", OS_14_2, OS_14_3),
            conditions=("one equivalent; " + (WARM if warm else COLD)),
            misses=[(key, table[key][0], roles.get(key, table[key][1]), whys[key]) for key in table if key != correct],
            keep_place=True,
        )
        return
    mcq(
        node, id, prompt, options, correct, explanation,
        prov(f"{'thermodynamic' if warm else 'kinetic'} call from diene_addition; names checked with OPSIN", OS_14_2, OS_14_3),
        scheme_visual(diene, diene_name, reagent + ", 1 equiv", WARM_UNDER if warm else COLD_UNDER),
        tiles=iupac_tiles(table, id), conditions=("one equivalent; " + (WARM if warm else COLD)), brief=brief, level=level,
        concepts=CONCEPT_KVT, derived=pick(answer, table),
    )


def map_of(mapped: str, idx: int) -> int:
    return mol(mapped).GetAtomWithIdx(idx).GetAtomMapNum()


def node_hx() -> None:
    node = "u1-hx-dienes"
    k = dict(concepts=CONCEPT_KVT)

    # --- recognise: label a given pair ---------------------------------
    r = diene_addition(MP2, "H", "Cl")
    n12, n14 = "4-chloro-4-methylpent-2-ene", "4-chloro-2-methylpent-2-ene"
    derived = "p14" if r["thermo"] == r["p14"] and r["thermo"] != r["p12"] else None
    mcq(
        node, "u1-hx-label-thermo", "Both form from 2-methylpenta-1,3-diene and HCl. Pick the thermodynamic one.",
        [
            ("p12", n12, "This is the 1,2 product, chlorine on the tertiary carbon. Its C=C carries only two carbons, so it is not the more stable one."),
            ("close", "Too close to call by alkene substitution", "The two alkenes differ here: one C=C carries three carbons and the other two. The rule can call it."),
            ("p14", n14, "Its C=C carries three carbons against two in the other product. The more substituted alkene is the more stable product."),
        ],
        "p14", "Call the thermodynamic product by alkene substitution: the product whose C=C carries more carbons.",
        prov("both products from diene_addition; alkene substitution 2 against 3; names checked with OPSIN", OS_14_3),
        {"kind": "pair", "a": iupac(r["p12"], n12, "u1-hx-label-thermo a"), "b": iupac(r["p14"], n14, "u1-hx-label-thermo b")},
        level=0, derived=derived, **k,
    )
    r = diene_addition(HEXADIENE, "H", "Br")
    n12, n14 = "4-bromohex-2-ene", "2-bromohex-3-ene"
    mcq(
        node, "u1-hx-too-close", "Both form from hexa-2,4-diene and HBr. Pick the thermodynamic one.",
        [
            ("p14", n14, "Tempting, because 1,4 often wins warm. That is only because it usually has the more substituted C=C, and here both alkenes carry two carbons."),
            ("close", "Too close to call by alkene substitution", "Each product's C=C carries two carbons, so the substitution rule gives no winner. That is the honest answer from this rule."),
            ("p12", n12, "Nothing favours the 1,2 product on stability here either. Both alkenes are disubstituted."),
        ],
        "close", "Decide the thermodynamic product by alkene substitution, not by 1,4 always wins. When the counts tie, the rule cannot call it.",
        prov("both products from diene_addition; alkene substitution 2 against 2; names checked with OPSIN", OS_14_3),
        {"kind": "pair", "a": iupac(r["p12"], n12, "u1-hx-too-close a"), "b": iupac(r["p14"], n14, "u1-hx-too-close b")},
        level=2, derived="close" if r["thermo"] is None else None, **k,
    )
    r = diene_addition(ISOPRENE, "H", "Br")
    n12, n14 = "3-bromo-3-methylbut-1-ene", "1-bromo-3-methylbut-2-ene"
    mcq(
        node, "u1-hx-label-kinetic", "Both form from isoprene and HBr. Pick the kinetic one.",
        [
            ("p12", n12, "Bromide is captured right beside the new C-H, on the carbon that carries most of the charge. That is the fast, 1,2 product."),
            ("p14", n14, "This one has the more substituted C=C, so it is the stable one. Stability is the thermodynamic call, not the kinetic one."),
            ("same", "Neither, they form at the same rate", "They do not. Bromide reaches the nearby tertiary carbon first, so the 1,2 product forms faster."),
        ],
        "p12", "The kinetic product is the 1,2 product: the nucleophile attacks the charged carbon next to the new C-H.",
        prov("both products from diene_addition; 1,2 carbon tertiary, 1,4 carbon primary; names checked with OPSIN", OS_14_2, OS_14_3),
        {"kind": "pair", "a": iupac(r["p12"], n12, "u1-hx-label-kinetic a"), "b": iupac(r["p14"], n14, "u1-hx-label-kinetic b")},
        level=0, derived="p12" if r["kinetic"] == r["p12"] else None, **k,
    )

    # --- where H+ goes first -----------------------------------------
    mapped = "[CH2:1]=[C:2]([CH3:5])[CH:3]=[CH2:4]"
    r = diene_addition(unmap(mapped), "H", "Br")
    mcq(
        node, "u1-hx-isoprene-site", "H+ adds to isoprene first. Pick the carbon it adds to.",
        [
            ("c4", "C4", "Protonating C4 does give an allylic cation, but its charged carbons are C3, secondary, and C1, primary. C1 gives a better one."),
            ("c1", "C1", "Protonating C1 puts the charge on C2, which carries the methyl and is tertiary, shared with C4. That is the best cation on offer."),
            ("c2", "C2", "Adding H+ to an inner carbon leaves the charge on an end carbon with no pi bond beside it, so there is no resonance at all."),
        ],
        "c1", "Protonate the end carbon that leaves the best allylic cation.",
        prov("every protonation built and the cations ranked by dominance", OS_14_2),
        {"kind": "structure", "figure": numbered(mapped), "name": "isoprene, numbered"},
        brief="Build the cation each choice makes, then rank the cations.",
        derived=f"c{map_of(mapped, r['attacked'])}" if compare(r["cation"], inner_cation(unmap(mapped))) == 1 else None, **k,
    )
    mapped = "[CH2:1]=[CH:2][CH:3]=[CH:4][CH3:5]"
    r = diene_addition(unmap(mapped), "H", "Br")
    mcq(
        node, "u1-hx-pentadiene-site", "H+ adds to penta-1,3-diene first. Pick the carbon it adds to.",
        [
            ("c3", "C3", "C3 is an inner carbon. H+ there leaves a charge with no C=C beside it, so there is no resonance."),
            ("c4", "C4", "Protonating C4 gives a charge shared by C3, secondary, and C1, primary. Close, and still a step worse than protonating C1."),
            ("c1", "C1", "Protonating C1 puts the charge on C2 and C4, and both of those are secondary. That is the better allylic cation."),
        ],
        "c1", "Protonate the end carbon that leaves the best allylic cation.",
        prov("every protonation built and the cations ranked by dominance", OS_14_2),
        {"kind": "structure", "figure": numbered(mapped), "name": "penta-1,3-diene, numbered"},
        brief="Build the cation each choice makes, then rank the cations.",
        derived=f"c{map_of(mapped, r['attacked'])}", **k,
    )

    # --- produce: diene, HX, temperature -> major product --------------
    r = diene_addition(DMB, "H", "Br")
    t = {
        "p14": (r["p14"], "1-bromo-2,3-dimethylbut-2-ene"),
        "p12": (r["p12"], "3-bromo-2,3-dimethylbut-1-ene"),
        "inner": (inner_product(DMB, "H", "Br"), "4-bromo-2,3-dimethylbut-1-ene"),
    }
    produce(
        node, "u1-hx-dmb-cold", DMB, "2,3-dimethylbuta-1,3-diene", "H", "Br", False,
        "Add HBr at minus 80 degrees. Pick the major product.",
        [
            ("p14", t["p14"][1], "The 1,4 product, with its four-carbon alkene, is the stable one. Cold, nothing reverses, so stability gets no vote."),
            ("p12", t["p12"][1], "H on C1, then bromide captured at C2, the nearby tertiary carbon. Cold locks in this fast, 1,2 product."),
            ("inner", t["inner"][1], "This needs H+ on an inner carbon, which leaves a primary cation with no resonance. Protonation goes to the end instead."),
        ],
        "p12", "Cold and irreversible: the 1,2 (kinetic) product.", t,
        as_draw=True,
    )
    produce(
        node, "u1-hx-dmb-warm", DMB, "2,3-dimethylbuta-1,3-diene", "H", "Br", True,
        "Add HBr at 40 degrees and wait. Pick the major product.",
        [
            ("p12", t["p12"][1], "This forms first, and warm gives it a way back to the cation. Given time, the mixture drifts to the more stable alkene."),
            ("inner", t["inner"][1], "This needs H+ on an inner carbon, which leaves a primary cation with no resonance. It does not form."),
            ("p14", t["p14"][1], "Its C=C carries four carbons, against two in the 1,2 product. Warm and reversible, the most substituted alkene wins."),
        ],
        "p14", "Warm and reversible: the product with the more substituted alkene.", t,
    )
    r = diene_addition(HEXADIENE, "H", "Br")
    t = {
        "inner": (inner_product(HEXADIENE, "H", "Br"), "5-bromohex-2-ene"),
        "p14": (r["p14"], "2-bromohex-3-ene"),
        "p12": (r["p12"], "4-bromohex-2-ene"),
    }
    produce(
        node, "u1-hx-hexadiene-cold", HEXADIENE, "hexa-2,4-diene", "H", "Br", False,
        "Add HBr at minus 80 degrees. Pick the major product.",
        [
            ("inner", t["inner"][1], "This needs H+ on an inner carbon of the diene, which leaves a cation with no resonance. Protonation goes to an end carbon instead."),
            ("p14", t["p14"][1], "The 1,4 product forms through the far end of the allylic cation. Cold favours the near end, beside the new C-H."),
            ("p12", t["p12"][1], "H on C2, then bromide captured on C3, right beside it. Both charged carbons are secondary, so nearness decides: the 1,2 product."),
        ],
        "p12", "Cold: the nucleophile is captured at the nearer charged carbon, the 1,2 product.", t,
        as_draw=True,
    )
    r = diene_addition(CHD, "H", "Br")
    t = {
        "one": (r["p12"], "3-bromocyclohexene"),
        "vinyl": ("BrC1=CCCCC1", "1-bromocyclohexene"),
        "inner": (inner_product(CHD, "H", "Br"), "4-bromocyclohexene"),
    }
    ok = r["p12"] == r["p14"]
    mcq(
        node, "u1-hx-chd", "Add HBr to cyclohexa-1,3-diene at 40 degrees. Pick the major product.",
        [
            ("vinyl", t["vinyl"][1], "Bromine on a C=C carbon would need a vinyl cation, which has no resonance. The proton goes to an end of the diene instead."),
            ("one", t["one"][1], "The ring makes C2 and C4 equivalent, so 1,2 and 1,4 addition give the same compound. One product, whatever the temperature."),
            ("inner", t["inner"][1], "Bromine two carbons from the C=C needs a cation with no resonance. The allylic cation puts bromine right beside the C=C."),
        ],
        "one", "A symmetric allylic cation gives the same product by 1,2 and 1,4 addition.",
        prov("1,2 and 1,4 products from diene_addition are the same canonical SMILES; names checked with OPSIN", OS_14_2),
        scheme_visual(CHD, "cyclohexa-1,3-diene", "HBr, 1 equiv", WARM_UNDER),
        tiles=iupac_tiles(t, "u1-hx-chd"), conditions="one equivalent; " + WARM,
        derived="one" if ok and pick(r["p12"], t) == "one" else None, **k,
    )
    r = diene_addition(PIPERYLENE, "H", "Br")
    loser = r["losers"][0]
    t = {
        "lp14": (loser["p14"], "1-bromopent-2-ene"),
        "lp12": (loser["p12"], "3-bromopent-1-ene"),
        "win": (r["p12"], "4-bromopent-2-ene"),
    }
    ok = r["p12"] == r["p14"]
    mcq(
        node, "u1-hx-pentadiene", "Add HBr to penta-1,3-diene at minus 80 degrees. Pick the major product.",
        [
            ("lp14", t["lp14"][1], "This comes from H+ on C4, which gives a cation shared by a secondary and a primary carbon. H+ on C1 gives a better one."),
            ("lp12", t["lp12"][1], "Also from H+ on C4, the weaker cation. Protonating C1 instead shares the charge between two secondary carbons."),
            ("win", t["win"][1], "H+ on C1 shares the charge between C2 and C4, and bromide on either one gives this same compound. One product from the best cation."),
        ],
        "win", "Protonate to make the best allylic cation first. Here its two ends give the same product.",
        prov("both protonations built; the best cation's 1,2 and 1,4 products are the same SMILES; names checked with OPSIN", OS_14_2),
        scheme_visual(PIPERYLENE, "penta-1,3-diene", "HBr, 1 equiv", COLD_UNDER),
        tiles=iupac_tiles(t, "u1-hx-pentadiene"), conditions="one equivalent; " + COLD,
        derived="win" if ok and pick(r["p12"], t) == "win" else None, level=2, **k,
    )
    r = diene_addition(MP4, "H", "Br")
    t = {
        "p14": (r["p14"], "4-bromo-4-methylpent-2-ene"),
        "loser": (r["losers"][0]["p12"], "3-bromo-4-methylpent-1-ene"),
        "p12": (r["p12"], "4-bromo-2-methylpent-2-ene"),
    }
    produce(
        node, "u1-hx-mp4-warm", MP4, "4-methylpenta-1,3-diene", "H", "Br", True,
        "Add HBr at 40 degrees and wait. Pick the major product.",
        [
            ("p14", t["p14"][1], "The 1,4 product often wins warm, but only because it usually has the better alkene. Here its C=C carries two carbons and the 1,2 product's carries three."),
            ("loser", t["loser"][1], "This comes from H+ on C4, which makes a weaker cation. H+ on C1 puts the charge on a secondary and a tertiary carbon."),
            ("p12", t["p12"][1], "Its C=C carries three carbons, against two in the 1,4 product. Warm, the more substituted alkene wins, and here that is the 1,2 product."),
        ],
        "p12", "Decide thermo by alkene substitution, not by 1,4 always wins. Here the 1,2 product has the better alkene.", t, level=2,
        as_draw=True,
    )
    r = diene_addition(MP2, "H", "Br")
    t = {
        "p12": (r["p12"], "4-bromo-4-methylpent-2-ene"),
        "p14": (r["p14"], "4-bromo-2-methylpent-2-ene"),
        "loser": (r["losers"][0]["p12"], "3-bromo-2-methylpent-1-ene"),
    }
    produce(
        node, "u1-hx-mp2-cold", MP2, "2-methylpenta-1,3-diene", "H", "Br", False,
        "Add HBr at minus 80 degrees. Pick the major product.",
        [
            ("p12", t["p12"][1], "H on C1, then bromide captured at C2, the tertiary carbon right beside it. Cold locks in this fast, 1,2 product."),
            ("p14", t["p14"][1], "This has the better alkene, so it wins warm. Cold, nothing reverses, and the near carbon captures bromide first."),
            ("loser", t["loser"][1], "This needs H+ on C4, which gives a weaker cation than H+ on C1."),
        ],
        "p12", "Cold: protonate for the best cation, then the nucleophile is captured at the near charged carbon.", t,
    )


def node_x2() -> None:
    node = "u1-x2"
    k = dict(concepts=CONCEPT_KVT)
    r = diene_addition(BUTADIENE, "Br", "Br")
    tetra = saturate(r["p12"], "Br")
    t = {
        "p12": (r["p12"], "3,4-dibromobut-1-ene"),
        "tetra": (tetra, "1,2,3,4-tetrabromobutane"),
        "p14": (r["p14"], "1,4-dibromobut-2-ene"),
    }
    mcq(
        node, "u1-x2-pick-14", "Add one equivalent of Br2 to buta-1,3-diene. Pick the 1,4 product.",
        [
            ("p12", t["p12"][1], "Br on C1 and C2, side by side, with the second C=C untouched. That is the 1,2 product."),
            ("tetra", t["tetra"][1], "Adding across both C=C bonds takes two equivalents of Br2. With one, each diene picks up one Br2."),
            ("p14", t["p14"][1], "Br on C1 and C4, and the C=C moved to the middle. Same allylic cation logic as HBr, with bromide caught at the far end."),
        ],
        "p14", "X2 adds 1,2 or 1,4 by the same allylic cation as HX: X on C1, then X on C2 or C4.",
        prov("1,2 and 1,4 dibromides from diene_addition with Br on the first carbon; names checked with OPSIN", OS_14_2),
        scheme_visual(BUTADIENE, "buta-1,3-diene", "Br_2, 1 equiv"),
        tiles=iupac_tiles(t, "u1-x2-pick-14"), conditions="one equivalent of Br2",
        derived=pick(r["p14"], t), **k,
    )
    r = diene_addition(BUTADIENE, "Cl", "Cl")
    t = {
        "p14": (r["p14"], "1,4-dichlorobut-2-ene"),
        "p12": (r["p12"], "3,4-dichlorobut-1-ene"),
        "tetra": (saturate(r["p12"], "Cl"), "1,2,3,4-tetrachlorobutane"),
    }
    produce(
        node, "u1-x2-cold-cl", BUTADIENE, "buta-1,3-diene", "Cl", "Cl", False,
        "Add Cl2 at minus 80 degrees. Pick the major product.",
        [
            ("p14", t["p14"][1], "The more stable product, with the internal C=C. Cold, nothing reverses, so the faster route decides."),
            ("p12", t["p12"][1], "Chloride is captured next door to the first Cl, the fast route. Cold locks this 1,2 product in, as it does for HBr."),
            ("tetra", t["tetra"][1], "Two equivalents of Cl2 would saturate both C=C bonds. One equivalent leaves one C=C behind."),
        ],
        "p12", "Same temperature rule as HX: cold gives the 1,2 (kinetic) dihalide.", t,
    )
    t = {
        "tetra": (tetra, "1,2,3,4-tetrabromobutane"),
        "p14": (diene_addition(BUTADIENE, "Br", "Br")["p14"], "1,4-dibromobut-2-ene"),
        "p12": (diene_addition(BUTADIENE, "Br", "Br")["p12"], "3,4-dibromobut-1-ene"),
    }
    produce(
        node, "u1-x2-warm-br", BUTADIENE, "buta-1,3-diene", "Br", "Br", True,
        "Add Br2 at 40 degrees and wait. Pick the major product.",
        [
            ("tetra", t["tetra"][1], "Two equivalents of Br2 would saturate both C=C bonds. One equivalent leaves one C=C behind."),
            ("p14", t["p14"][1], "Its C=C sits inside the chain and carries two carbons; the 1,2 product's carries one. Warm and reversible, the better alkene wins."),
            ("p12", t["p12"][1], "This forms first, and warm lets it return to the cation. Given time, the mixture drifts to the more stable 1,4 product."),
        ],
        "p14", "Same temperature rule as HX: warm and reversible gives the dihalide with the more substituted alkene.", t,
    )
    r = diene_addition(ISOPRENE, "Br", "Br")
    t = {
        "loser": (r["losers"][0]["p12"], "3,4-dibromo-2-methylbut-1-ene"),
        "p12": (r["p12"], "3,4-dibromo-3-methylbut-1-ene"),
        "p14": (r["p14"], "1,4-dibromo-2-methylbut-2-ene"),
    }
    produce(
        node, "u1-x2-isoprene-warm", ISOPRENE, "isoprene", "Br", "Br", True,
        "Add Br2 to isoprene at 40 degrees and wait. Pick the major product.",
        [
            ("loser", t["loser"][1], "This comes from Br+ on C4, which makes the weaker cation. Br+ on C1 puts the charge on the tertiary C2."),
            ("p12", t["p12"][1], "The fast product, bromide on the tertiary carbon next door. Warm, it can return to the cation and re-sort."),
            ("p14", t["p14"][1], "Its C=C carries three carbons, against one in the 1,2 product. Warm and reversible, the more substituted alkene wins."),
        ],
        "p14", "Br+ goes where it makes the best cation; warm, the dibromide with the better alkene wins.", t,
    )
    r = diene_addition(ISOPRENE, "Cl", "Cl")
    t = {
        "p12": (r["p12"], "3,4-dichloro-3-methylbut-1-ene"),
        "p14": (r["p14"], "1,4-dichloro-2-methylbut-2-ene"),
        "loser": (r["losers"][0]["p12"], "3,4-dichloro-2-methylbut-1-ene"),
    }
    produce(
        node, "u1-x2-isoprene-cold", ISOPRENE, "isoprene", "Cl", "Cl", False,
        "Add Cl2 to isoprene at minus 80 degrees. Pick the major product.",
        [
            ("p12", t["p12"][1], "Cl+ on C1 makes the tertiary allylic cation, and chloride is captured at C2 right next door. Cold locks in this fast product."),
            ("p14", t["p14"][1], "This has the better alkene, so it wins warm. Cold, nothing reverses, and the nearby carbon captures chloride first."),
            ("loser", t["loser"][1], "This comes from Cl+ on C4, which makes the weaker cation. Cl+ on C1 puts the charge on the tertiary C2."),
        ],
        "p12", "Cold: the 1,2 dihalide from the best cation.", t,
    )
    r = diene_addition(DMB, "Cl", "Cl")
    t = {
        "tetra": (saturate(r["p12"], "Cl"), "1,2,3,4-tetrachloro-2,3-dimethylbutane"),
        "p14": (r["p14"], "1,4-dichloro-2,3-dimethylbut-2-ene"),
        "p12": (r["p12"], "3,4-dichloro-2,3-dimethylbut-1-ene"),
    }
    produce(
        node, "u1-x2-dmb-warm", DMB, "2,3-dimethylbuta-1,3-diene", "Cl", "Cl", True,
        "Add Cl2 at 40 degrees and wait. Pick the major product.",
        [
            ("tetra", t["tetra"][1], "Saturating both C=C bonds takes two equivalents of Cl2. One equivalent leaves one C=C behind."),
            ("p14", t["p14"][1], "Its C=C carries four carbons, the most substituted alkene possible. Warm and reversible, it wins."),
            ("p12", t["p12"][1], "This forms first. Its C=C carries only two carbons, so warm conditions drain it toward the 1,4 product."),
        ],
        "p14", "Warm: the dihalide with the most substituted alkene.", t,
    )
    r = diene_addition(DMB, "Br", "Br")
    t = {
        "p14": (r["p14"], "1,4-dibromo-2,3-dimethylbut-2-ene"),
        "tetra": (saturate(r["p12"], "Br"), "1,2,3,4-tetrabromo-2,3-dimethylbutane"),
        "p12": (r["p12"], "3,4-dibromo-2,3-dimethylbut-1-ene"),
    }
    produce(
        node, "u1-x2-dmb-cold", DMB, "2,3-dimethylbuta-1,3-diene", "Br", "Br", False,
        "Add Br2 at minus 80 degrees. Pick the major product.",
        [
            ("p14", t["p14"][1], "The most stable product, with its four-carbon alkene. Cold, nothing reverses, so the fast route decides instead."),
            ("tetra", t["tetra"][1], "Saturating both C=C bonds takes two equivalents of Br2. One equivalent leaves one C=C behind."),
            ("p12", t["p12"][1], "Bromide is captured at C2, the tertiary carbon beside the first Br. Cold locks in this fast, 1,2 product."),
        ],
        "p12", "Cold: the 1,2 dihalide.", t,
        as_draw=True,
    )
    r = diene_addition(CHD, "Br", "Br")
    n12, n14 = "3,4-dibromocyclohexene", "3,6-dibromocyclohexene"
    ok = r["p12"] != r["p14"]
    mcq(
        node, "u1-x2-chd-14", "Br2 adds to cyclohexa-1,3-diene. Pick the 1,4 product.",
        [
            ("same", "They are the same compound", "That holds for HBr, where H and Br differ and the ring makes the two ends match. With Br2 a Br sits on C1 already, so the two ends no longer match."),
            ("a", n12, "Br on C1 and C2, side by side: that is the 1,2 product."),
            ("b", n14, "Br on C1 and C4, across the ring, with the C=C between C2 and C3. That is the 1,4 product."),
        ],
        "b", "With X2 the first X marks C1, so the 1,2 and 1,4 dihalides are different compounds even on a symmetric diene.",
        prov("1,2 and 1,4 dibromides from diene_addition differ as SMILES; names checked with OPSIN", OS_14_2),
        {"kind": "pair", "a": iupac(r["p12"], n12, "u1-x2-chd-14 a"), "b": iupac(r["p14"], n14, "u1-x2-chd-14 b")},
        conditions="one equivalent of Br2", derived="b" if ok else None, **k,
    )
    r = diene_addition(BUTADIENE, "Br", "Br")
    t = {
        "p14": (r["p14"], "1,4-dibromobut-2-ene"),
        "tetra": (tetra, "1,2,3,4-tetrabromobutane"),
        "p12": (r["p12"], "3,4-dibromobut-1-ene"),
    }
    ok = saturate(r["p12"], "Br") == saturate(r["p14"], "Br") == tetra
    mcq(
        node, "u1-x2-two-equiv", "Add TWO equivalents of Br2 to buta-1,3-diene. Pick the final product.",
        [
            ("p14", t["p14"][1], "This is where the first equivalent can stop. The second Br2 then adds across the C=C that is left."),
            ("tetra", t["tetra"][1], "The second Br2 saturates whichever C=C the first one left. The 1,2 and 1,4 routes both end here."),
            ("p12", t["p12"][1], "One equivalent can stop here, but a second Br2 adds across the remaining C=C."),
        ],
        "tetra", "Count equivalents: two Br2 saturate both C=C bonds, and both the 1,2 and 1,4 routes reach the same tetrabromide.",
        prov("both dibromides saturated with Br2 give the same canonical tetrabromide; names checked with OPSIN", OS_14_2),
        scheme_visual(BUTADIENE, "buta-1,3-diene", "Br_2, 2 equiv"),
        tiles=iupac_tiles(t, "u1-x2-two-equiv"), conditions="two equivalents of Br2",
        derived="tetra" if ok else None, level=2, **k,
    )
    c2 = "Br[CH2:1][CH+:2][CH:3]=[CH2:4]"
    c4 = "Br[CH2:1][CH:2]=[CH:3][CH2+:4]"
    where = sorted(map_of(c2, i) for i in positions(unmap(c2)))
    mcq(
        node, "u1-x2-why-14", "Br2 gives a 1,4 product as well. Pick the reason.",
        [
            ("move", "Br adds to C4 first, then moves", "Atoms do not wander here. Br+ adds once, to C1, and the second bromine goes where the charge is."),
            ("shared", "The cation's charge is shared by C2 and C4", "After Br+ adds to C1, the cation is allylic: the charge sits on C2 in one contributor and C4 in the other. Bromide can attack either one."),
            ("sub", "C4 is the most substituted carbon", "C4 is a CH2 end carbon, the least substituted here. It gets bromide only because it carries the charge in one contributor."),
        ],
        "shared", "The allylic cation after X+ adds to C1 has the charge on C2 and C4, which is why X2 gives 1,2 and 1,4 products.",
        prov("charge positions of the bromo allylic cation from ResonanceMolSupplier: C2 and C4", OS_14_2),
        {"kind": "pair", "a": {"figure": numbered(c2), "name": "+ on C2"}, "b": {"figure": numbered(c4), "name": "+ on C4"}},
        level=0, derived="shared" if where == [2, 4] and same_ion(unmap(c2), unmap(c4)) else None, **k,
    )
    r = diene_addition(PIPERYLENE, "Br", "Br")
    t = {
        "p12": (r["p12"], "4,5-dibromopent-2-ene"),
        "p14": (r["p14"], "1,4-dibromopent-2-ene"),
        "loser": (r["losers"][0]["p12"], "3,4-dibromopent-1-ene"),
    }
    mcq(
        node, "u1-x2-pentadiene-14", "Br2 adds to penta-1,3-diene. Pick the 1,4 product.",
        [
            ("p12", t["p12"][1], "Br on C1 and C2, side by side, with the C3=C4 bond untouched. That is the 1,2 product."),
            ("p14", t["p14"][1], "Br+ on C1 gives a cation shared by C2 and C4; bromide on C4 moves the C=C to C2=C3. That is the 1,4 product."),
            ("loser", t["loser"][1], "This needs Br+ on C4 first, which makes a weaker cation than Br+ on C1."),
        ],
        "p14", "1,4 addition of X2: X on C1, X on C4, and the C=C moves to the middle.",
        prov("1,4 dibromide from diene_addition on the best cation; names checked with OPSIN", OS_14_2),
        scheme_visual(PIPERYLENE, "penta-1,3-diene", "Br_2, 1 equiv"),
        tiles=iupac_tiles(t, "u1-x2-pentadiene-14"), conditions="one equivalent of Br2",
        derived=pick(r["p14"], t), **k,
    )
    r = diene_addition(CHD, "Cl", "Cl")
    n12, n14 = "3,4-dichlorocyclohexene", "3,6-dichlorocyclohexene"
    mcq(
        node, "u1-x2-chd-warm", "Cl2 adds to cyclohexa-1,3-diene at 40 degrees. Pick the alkene rule's call.",
        [
            ("b", n14, "Often the 1,4 product wins warm because it has the better alkene. Here both ring C=C bonds carry two carbons."),
            ("a", n12, "Nothing favours the 1,2 product on alkene substitution either. Both are disubstituted ring alkenes."),
            ("close", "Too close to call by alkene substitution", "Both ring alkenes carry two carbons, so substitution gives no winner. The rule is silent here."),
        ],
        "close", "When the two alkenes are equally substituted, the substitution rule cannot pick the thermodynamic product.",
        prov("both dichlorides from diene_addition; alkene substitution 2 against 2; names checked with OPSIN", OS_14_3),
        {"kind": "pair", "a": iupac(r["p12"], n12, "u1-x2-chd-warm a"), "b": iupac(r["p14"], n14, "u1-x2-chd-warm b")},
        conditions="one equivalent of Cl2; " + WARM, level=2, derived="close" if r["thermo"] is None else None, **k,
    )


def node_quiz_b() -> None:
    node = "u1-quiz-b"
    k = dict(concepts=CONCEPT_KVT)
    p = (7.4, 2.4, 8.8, 0.6)
    mcq(
        node, "u1-qb-diagram-warm", "Run this warm and reversible. Pick the major product.",
        [
            ("a", "A, the faster one", "A forms first, and warm lets it climb back out. Given time, the products collect in the deeper well."),
            ("mix", "An even mix", "An even mix needs equal wells. B's is deeper."),
            ("b", "B, the more stable one", "Warm and reversible, the products re-sort by depth, and B sits in the deeper well."),
        ],
        "b", "Warm and reversible: the deeper well wins.",
        prov("thermodynamic product read off the diagram's product depths", OS_14_3),
        energy("two products from one start", *p), conditions=WARM, derived="b" if ed(*p)["thermo"] == "B" else None, **k,
    )
    p = (7.0, 2.6, 8.4, 1.0)
    r = diene_addition(BUTADIENE, "H", "Br")
    d = ed(*p)
    ok = d["kinetic"] == "A" and d["thermo"] == "B" and r["kinetic"] == r["p12"] and r["thermo"] == r["p14"]
    mcq(
        node, "u1-qb-diagram-diene", "This diagram is HBr adding to buta-1,3-diene. Pick what A is.",
        [
            ("p14", "The 1,4 product", "The 1,4 product is the more stable one, so it sits in the deeper well, and that is B."),
            ("p12", "The 1,2 product", "A has the lower hump, so it is the kinetic product, and for butadiene and HBr the kinetic product is the 1,2 product."),
            ("cant", "Either, the diagram cannot say", "It can: the lower hump marks the kinetic product and the deeper well the thermodynamic one, and those are known here."),
        ],
        "p12", "Lower hump means kinetic, which is the 1,2 product; deeper well means thermodynamic, the 1,4 product.",
        prov("diagram read off its numbers; kinetic and thermodynamic products of butadiene and HBr from diene_addition", OS_14_3),
        energy("HBr plus buta-1,3-diene", *p), derived="p12" if ok else None, **k,
    )
    r = diene_addition(PIPERYLENE, "H", "Cl")
    t = {
        "win": (r["p12"], "4-chloropent-2-ene"),
        "lp12": (r["losers"][0]["p12"], "3-chloropent-1-ene"),
        "lp14": (r["losers"][0]["p14"], "1-chloropent-2-ene"),
    }
    mcq(
        node, "u1-qb-pentadiene", "Add HCl to penta-1,3-diene at 40 degrees. Pick the major product.",
        [
            ("win", t["win"][1], "H+ on C1 makes a cation shared by two secondary carbons, and chloride on either gives this one compound."),
            ("lp12", t["lp12"][1], "This needs H+ on C4, which gives the weaker cation, shared by a secondary and a primary carbon."),
            ("lp14", t["lp14"][1], "Also from H+ on C4, the weaker cation. Mechanism first: protonate for the best cation."),
        ],
        "win", "Mechanism first: protonate for the best cation, then read the products off it.",
        prov("both protonations built; the best cation gives one product; names checked with OPSIN", OS_14_2),
        scheme_visual(PIPERYLENE, "penta-1,3-diene", "HCl, 1 equiv", WARM_UNDER),
        tiles=iupac_tiles(t, "u1-qb-pentadiene"), conditions="one equivalent; " + WARM,
        derived="win" if r["p12"] == r["p14"] and pick(r["thermo"], t) == "win" else None, **k,
    )
    r = diene_addition(CPD, "H", "Br")
    t = {
        "vinyl": ("BrC1=CCCC1", "1-bromocyclopentene"),
        "inner": (inner_product(CPD, "H", "Br"), "4-bromocyclopentene"),
        "one": (r["p12"], "3-bromocyclopentene"),
    }
    mcq(
        node, "u1-qb-cpd", "Add HBr to cyclopenta-1,3-diene at minus 80 degrees. Pick the major product.",
        [
            ("vinyl", t["vinyl"][1], "Bromine on a C=C carbon needs a vinyl cation, which has no resonance. The proton goes to an end of the diene."),
            ("inner", t["inner"][1], "Bromine two carbons from the C=C needs a cation with no resonance. The allylic cation puts it right beside the C=C."),
            ("one", t["one"][1], "The ring makes the two charged carbons equivalent, so 1,2 and 1,4 addition give this same compound."),
        ],
        "one", "A symmetric allylic cation gives one product, cold or warm.",
        prov("1,2 and 1,4 products from diene_addition are the same SMILES; names checked with OPSIN", OS_14_2),
        scheme_visual(CPD, "cyclopenta-1,3-diene", "HBr, 1 equiv", COLD_UNDER),
        tiles=iupac_tiles(t, "u1-qb-cpd"), conditions="one equivalent; " + COLD,
        derived="one" if r["p12"] == r["p14"] and pick(r["kinetic"], t) == "one" else None, **k,
    )
    r = diene_addition(ISOPRENE, "H", "Br")
    t = {
        "p12": (r["p12"], "3-bromo-3-methylbut-1-ene"),
        "loser": (r["losers"][0]["p12"], "3-bromo-2-methylbut-1-ene"),
        "p14": (r["p14"], "1-bromo-3-methylbut-2-ene"),
    }
    produce(
        node, "u1-qb-isoprene-warm", ISOPRENE, "isoprene", "H", "Br", True,
        "Add HBr to isoprene at 40 degrees and wait. Pick the major product.",
        [
            ("p12", t["p12"][1], "The fast product, bromide on the tertiary carbon. Warm, it returns to the cation and the mixture re-sorts."),
            ("loser", t["loser"][1], "This needs H+ on C4, which makes the weaker cation."),
            ("p14", t["p14"][1], "Its C=C carries three carbons, against one in the 1,2 product. Warm and reversible, it wins."),
        ],
        "p14", "Warm: protonate for the best cation, then pick the product with the more substituted alkene.", t,
    )
    r = diene_addition(MP2, "H", "Br")
    t = {
        "loser": (r["losers"][0]["p12"], "3-bromo-2-methylpent-1-ene"),
        "p14": (r["p14"], "4-bromo-2-methylpent-2-ene"),
        "p12": (r["p12"], "4-bromo-4-methylpent-2-ene"),
    }
    produce(
        node, "u1-qb-mp2-warm", MP2, "2-methylpenta-1,3-diene", "H", "Br", True,
        "Add HBr at 40 degrees and wait. Pick the major product.",
        [
            ("loser", t["loser"][1], "This needs H+ on C4, which makes the weaker cation."),
            ("p14", t["p14"][1], "Its C=C carries three carbons, against two in the 1,2 product. Warm and reversible, the better alkene wins."),
            ("p12", t["p12"][1], "The fast product, and it wins cold. Warm, it can return to the cation, and its C=C carries only two carbons."),
        ],
        "p14", "Warm: the product with the more substituted alkene.", t,
    )
    r4 = diene_addition(MP4, "H", "Br")
    rb = diene_addition(BUTADIENE, "H", "Br")
    n12, n14 = "4-bromo-2-methylpent-2-ene", "4-bromo-4-methylpent-2-ene"
    ok = r4["thermo"] == r4["p12"] and rb["thermo"] == rb["p14"]
    mcq(
        node, "u1-qb-rule", "Pick the rule for the major product when warm and reversible.",
        [
            ("always14", "Always the 1,4 product", "True for butadiene, and wrong for this pair from 4-methylpenta-1,3-diene: here the 1,2 product has the more substituted C=C."),
            ("alkene", "The one with the more substituted C=C", "Warm and reversible, the products re-sort by stability, and alkene substitution is how to read stability here. Usually that is 1,4, not always."),
            ("always12", "Always the 1,2 product", "The 1,2 product is the usual kinetic product. Warm conditions ask which is more stable, a different question."),
        ],
        "alkene", "Decide thermo by alkene substitution, not by 1,4 always wins.",
        prov("thermodynamic calls from diene_addition: 1,4 for butadiene, 1,2 for 4-methylpenta-1,3-diene; names checked with OPSIN", OS_14_3),
        {"kind": "pair", "a": iupac(r4["p12"], n12, "u1-qb-rule a"), "b": iupac(r4["p14"], n14, "u1-qb-rule b")},
        derived="alkene" if ok else None, **k,
    )
    r = diene_addition(ISOPRENE, "Cl", "Cl")
    t = {
        "p14": (r["p14"], "1,4-dichloro-2-methylbut-2-ene"),
        "loser": (r["losers"][0]["p12"], "3,4-dichloro-2-methylbut-1-ene"),
        "p12": (r["p12"], "3,4-dichloro-3-methylbut-1-ene"),
    }
    produce(
        node, "u1-qb-isoprene-cl2", ISOPRENE, "isoprene", "Cl", "Cl", True,
        "Add Cl2 to isoprene at 40 degrees and wait. Pick the major product.",
        [
            ("p14", t["p14"][1], "Its C=C carries three carbons, against one in the 1,2 product. Warm and reversible, it wins."),
            ("loser", t["loser"][1], "This needs Cl+ on C4, which makes the weaker cation."),
            ("p12", t["p12"][1], "The fast product, and it wins cold. Warm, it returns to the cation and the mixture re-sorts."),
        ],
        "p14", "X2 follows the same rule: warm gives the dihalide with the better alkene.", t,
    )
    p = (8.6, 0.6, 7.0, 2.6)
    mcq(
        node, "u1-qb-diagram-cold", "Run this cold, where nothing reverses. Pick the major product.",
        [
            ("b", "B, the faster one", "B's hump is lower, so B forms faster, and cold locks it in."),
            ("a", "A, the more stable one", "A is more stable, and that only matters when products can go back. Cold, they cannot."),
            ("mix", "An even mix", "An even mix needs equal humps. B's is lower."),
        ],
        "b", "Cold and irreversible: the lower hump wins.",
        prov("kinetic product read off the diagram's transition state heights", OS_14_3),
        energy("two products from one start", *p), conditions=COLD, derived="b" if ed(*p)["kinetic"] == "B" else None, **k,
    )
    mapped = "[CH2:1]=[C:2]([CH3:5])[CH:3]=[CH2:4]"
    plain = unmap(mapped)
    r = diene_addition(plain, "H", "Br")
    t2 = {
        "c4": {"figure": figure(r["losers"][0]["cation"]), "name": "H+ added at C4"},
        "c1": {"figure": figure(r["cation"]), "name": "H+ added at C1"},
        "c2": {"figure": figure(inner_cation(plain)), "name": "H+ added at an inner carbon"},
    }
    attacked = map_of(mapped, r["attacked"])
    mcq(
        node, "u1-qb-first-cation", "Mechanism first. Pick the cation HBr makes from isoprene.",
        [
            ("c4", "From H+ on C4", "Allylic, and its charge is shared by a secondary and a primary carbon. H+ on C1 does better."),
            ("c1", "From H+ on C1", "Allylic, with the charge shared by C2, tertiary, and C4. That is the best cation, so it is the one that forms."),
            ("c2", "From H+ on an inner carbon", "The charge lands on an end carbon with no C=C beside it: primary, and no resonance."),
        ],
        "c1", "Mechanism first: the proton goes where it leaves the most stable allylic cation.",
        prov("every protonation built and the cations ranked by dominance", OS_14_2),
        {"kind": "structure", "figure": numbered(mapped), "name": "isoprene, numbered"},
        tiles=t2, derived="c1" if attacked == 1 else None, **k,
    )


# ---------------------------------------------------------------------------
# Draw it (U1-P3, 2026-10-17): produce-style items graded in the browser by
# standard InChI (src/game/beats/draw/grade.ts). The answer SMILES is the
# script's own derived product, never typed; its InChI is computed here with
# RDKit and the browser compares the student's drawing against it with the
# stereo layers dropped (no item here asks about E/Z or wedges).
# ---------------------------------------------------------------------------

PRACTICE_NODES = {"u1-rank-cation", "u1-rank-anion", "u1-rank-radical", "u1-quiz-a", "u1-energy-diagram", "u1-hx-dienes", "u1-quiz-b"}


def no_stereo(inchi: str) -> str:
    """The browser grader's comparison for a no-stereo item (beats/draw/grade.ts withoutStereo)."""
    head, *layers = inchi.split("/")
    return "/".join([head] + [layer for layer in layers if not layer.startswith(("b", "t", "m", "s"))])


def inchi_of(smi: str) -> str:
    out = Chem.MolToInchi(mol(smi))
    if not out.startswith("InChI=1S/"):
        fail(f"no standard InChI for {smi}")
    return out


def draw(
    node: str,
    id: str,
    prompt: str,
    brief: str,
    visual: dict,
    answer: str | None,
    answer_name: str,
    why: str,
    look_at: str,
    explanation: str,
    provenance: str,
    conditions: str | None = None,
    concepts: tuple[str, ...] = CONCEPT_KVT,
    any_contributor: bool = False,
    misses: list[tuple[str, str | None, str, str]] | None = None,
    keep_place: bool = False,
) -> None:
    """
    One "Draw it" entry. `misses` (round 2) are (id, SMILES, what it is, coach
    line): wrong structures the screen names when a student draws one. Each is
    built by a derivation in this file and must grade differently from the
    answer and from every other miss (stereo layers dropped, as the browser
    grader does), or the file is refused. `keep_place` appends the entry where
    an MCQ with the same id used to sit (a converted item) instead of third. `answer` is the derived SMILES (None means the script
    could not derive it, which refuses the file). With any_contributor, every
    resonance contributor of the answer must share its InChI, so drawing either
    one is graded right, which is what the prompt then promises.
    """
    if answer is None:
        fail(f"{id}: the script could not derive the structure to draw")
        return
    if id in IDS:
        fail(f"duplicate id {id}")
    IDS.add(id)
    lint_copy(f"{id} prompt", prompt, CAPS["prompt"])
    lint_copy(f"{id} brief", brief, CAPS["brief"])
    for where, text in (("why", why), ("lookAt", look_at), ("explanation", explanation)):
        lint_copy(f"{id} {where}", text, CAPS["why"])
    smi = canon(answer)
    key = inchi_of(smi)
    if any_contributor:
        forms = {Chem.MolToSmiles(c) for c in Chem.ResonanceMolSupplier(mol(smi)) if c is not None}
        if len(forms) < 2:
            fail(f"{id}: promised either contributor, but {smi} has one")
        for f in forms:
            if inchi_of(f) != key:
                fail(f"{id}: contributor {f} has a different InChI, so it would be marked wrong")
    elif "+" not in smi and "-" not in smi:
        NAME_CHECKS.append((smi, answer_name, id))
    graded = {no_stereo(key): "the answer"}
    out_misses = []
    for mid, msmi, mname, says in misses or []:
        if msmi is None:
            fail(f"{id} miss {mid}: the script could not derive it")
            continue
        lint_copy(f"{id} miss {mid} says", says, 220)
        lint_copy(f"{id} miss {mid} name", mname, 60)
        m_key = inchi_of(canon(msmi))
        if no_stereo(m_key) in graded:
            fail(f"{id} miss {mid}: grades the same as {graded[no_stereo(m_key)]}")
            continue
        graded[no_stereo(m_key)] = mid
        out_misses.append({"id": mid, "inchi": m_key, "smiles": canon(msmi), "name": mname, "says": says})
    beat = {
        "kind": "draw",
        "id": id,
        "node": node,
        "conceptIds": list(concepts),
        "levels": [2],
        "prompt": prompt,
        "brief": brief,
        "visual": visual,
        "answer": {"smiles": smi, "inchi": key, "name": answer_name, "figure": figure(smi)},
        "stereo": False,
        "why": why,
        "lookAt": look_at,
    }
    if out_misses:
        beat["misses"] = out_misses
    entry = {"id": id, "item": {"kind": "draw", "beat": beat}, "explanation": explanation}
    if conditions is not None:
        entry["conditions"] = conditions
    entry["provenance"] = provenance
    entry["placeholder"] = True
    pool = POOLS.setdefault(node, [])
    # In an in-a-row run the third problem is a drawing, so a student who stops
    # at the first tier still draws once. In a lesson the order does not matter:
    # the drawings get their own produce step (template.ts).
    if node in PRACTICE_NODES and len(pool) >= 2 and not keep_place:
        pool.insert(2, entry)
    else:
        pool.append(entry)


def hydrogenated(smi: str) -> str:
    """Every C=C made single: the drawing of a student who added twice."""
    rw = Chem.RWMol(mol(smi))
    for bond in rw.GetBonds():
        if bond.GetBondType() == Chem.BondType.DOUBLE:
            bond.SetBondType(Chem.BondType.SINGLE)
    return _finish(rw)


def br_moved_off_allylic(smi: str) -> str | None:
    """Move the Br of a 3-bromocycloalkene to the ring carbon two away from the
    C=C, and prove that carbon is not allylic: the 'Br not next to the C=C' drawing."""
    m = mol(smi)
    br = [a for a in m.GetAtoms() if a.GetSymbol() == "Br"]
    if len(br) != 1:
        return None
    c = br[0].GetNeighbors()[0]
    ring = [r for r in m.GetRingInfo().AtomRings() if c.GetIdx() in r]
    if not ring:
        return None
    alkene = {a.GetIdx() for b in m.GetBonds() if b.GetBondType() == Chem.BondType.DOUBLE for a in (b.GetBeginAtom(), b.GetEndAtom())}
    for cand in ring[0]:
        if cand in alkene or cand == c.GetIdx():
            continue
        if any(n.GetIdx() in alkene for n in m.GetAtomWithIdx(cand).GetNeighbors()):
            continue  # still allylic
        rw = Chem.RWMol(m)
        rw.RemoveBond(c.GetIdx(), br[0].GetIdx())
        rw.AddBond(cand, br[0].GetIdx(), Chem.BondType.SINGLE)
        return _finish(rw)
    return None


def node_draws() -> None:
    # ROUND 2 (2026-10-17): the briefs no longer hand over the deciding rule
    # (where Br goes, which product temperature picks). That moved into lookAt,
    # which shows only after a first miss. Every item names the wrong structures
    # a student is likely to draw (misses), each derived here.

    # u1-allylic: protonate the diene, draw the cation. Either contributor.
    r = diene_addition(BUTADIENE, "H", "Br")
    draw(
        "u1-allylic", "u1-allylic-draw-cation",
        "H+ adds to C1 of buta-1,3-diene. Draw the cation that forms.",
        "Count the bonds on each carbon once the H is on. Either resonance contributor counts.",
        scheme_visual(BUTADIENE, "buta-1,3-diene", "H^+"),
        r["cation"], "the but-3-en-2-yl cation, an allylic cation",
        "H+ goes on the end carbon, so the + lands on C2, right next to the remaining C=C. That pi bond can shift over and share the charge with C4.",
        "Put the H on C1, then put the + on the carbon next to it. It is allylic, which is why this end gets protonated.",
        "Protonating the end carbon of a diene gives an allylic cation: the charge is shared by C2 and C4.",
        prov("cation from diene_addition, the end-carbon orientation; contributors from ResonanceMolSupplier share one InChI; misses built from the same diene", OS_14_2),
        concepts=CONCEPT_RES, any_contributor=True,
        misses=[
            ("inner", inner_cation(BUTADIENE), "the cation from H+ on C2",
             "That + sits on an end carbon with no C=C beside it, so nothing can share it. The prompt puts the H on C1."),
            ("product", r["p12"], "the finished product",
             "That is after bromide arrives. Stop one step earlier: draw the cation, with its +."),
        ],
    )
    # u1-12v14: the 1,4 product. CHANGED round 4 (critic): on butadiene the
    # prompt had to spell out "bromide attacks C4", and the lesson's priming
    # question names 1-bromobut-2-ene as the 1,4 product a few screens
    # earlier, so the drawing could be copied from memory. A new diene makes
    # it transfer: the student has to find the diene's own C1 to C4 inside a
    # six-carbon chain and apply "1,4" there. hexa-2,4-diene is symmetric, so
    # both ends protonate alike and the 1,2 and 1,4 products are distinct.
    hexa = "CC=CC=CC"
    rh = diene_addition(hexa, "H", "Br")
    draw(
        "u1-12v14", "u1-12v14-draw-14",
        "HBr adds to hexa-2,4-diene. Draw the 1,4 product.",
        "The 1 and 4 count the diene's four C=C carbons, not the chain's six.",
        scheme_visual(hexa, "hexa-2,4-diene", "HBr"),
        rh["p14"] if not rh["losers"] else None, "2-bromohex-3-ene",
        "The diene is C2 to C5 of the chain. H goes on C2, the diene's first carbon, which shares the + between C3 and C5. Br on C5, the diene's fourth carbon, moves the C=C to the middle: C3=C4.",
        "Count only the diene: chain C2 is its 1, chain C5 its 4. H on the 1, Br on the 4, and the C=C slides into the middle, between the diene's 2 and 3.",
        "1,4 addition: E+ on the diene's first carbon, the nucleophile on its fourth, and the double bond moves into the middle.",
        prov("1,4 product from diene_addition on hexa-2,4-diene (both ends protonate alike, no losing cation); misses are its 1,2 and inner-protonation products; name checked with OPSIN", OS_14_2),
        conditions="one equivalent of HBr",
        misses=[
            ("p12", rh["p12"], "the 1,2 product",
             "Br landed on the near end of the allylic cation, right beside the new H. That is 1,2 addition: the diene's carbons 1 and 2."),
            ("inner", inner_product(hexa, "H", "Br"), "the product of H+ on an inner carbon",
             "That needs H+ on a middle carbon of the diene, which leaves a cation with no resonance. H+ goes on an end of the diene."),
        ],
    )
    # u1-kvt: warm means thermodynamic.
    r = diene_addition(DMB, "H", "Br")
    draw(
        "u1-kvt", "u1-kvt-draw-warm",
        "HBr, 40 degrees, given time. Draw the major product.",
        "Read the temperature first. It decides which product you draw.",
        scheme_visual(DMB, "2,3-dimethylbuta-1,3-diene", "HBr, 1 equiv", WARM_UNDER),
        r["thermo"], "1-bromo-2,3-dimethylbut-2-ene",
        "At 40 degrees both products can return to the cation, so the mixture settles into the more stable one: the 1,4 product, whose C=C carries four carbons.",
        "Warm means thermodynamic. Draw both products, then keep the one with more carbons on its C=C.",
        "Warm and reversible gives the thermodynamic product, the one with the more substituted alkene.",
        prov("thermodynamic call from diene_addition (alkene substitution counted); misses are the kinetic and inner products; name checked with OPSIN", OS_14_2, OS_14_3),
        conditions="one equivalent; " + WARM,
        misses=[
            ("p12", r["kinetic"], "the 1,2 product, the kinetic one",
             "It forms fastest, but at 40 degrees it can ionise again. Given time, the mixture drifts to the more stable alkene."),
            ("inner", inner_product(DMB, "H", "Br"), "the product of H+ on an inner carbon",
             "That needs a cation with no resonance. H+ goes on an end carbon."),
        ],
    )
    # u1-x2: Br2, warm, 1,4.
    r = diene_addition(BUTADIENE, "Br", "Br")
    draw(
        "u1-x2", "u1-x2-draw-warm",
        "Br2, one equivalent, 40 degrees. Draw the major product.",
        "Br2 adds through the same kind of cation as HBr. Read the temperature.",
        scheme_visual(BUTADIENE, "buta-1,3-diene", "Br_2, 1 equiv", WARM_UNDER),
        r["thermo"], "1,4-dibromobut-2-ene",
        "Br+ adds to C1 and the allylic cation is shared by C2 and C4. Warm and reversible, the 1,4 product wins: its C=C sits in the middle with two carbons on it.",
        "Put one Br on C1. Warm conditions send the second Br to C4, and the double bond moves to C2=C3.",
        "Br2 adds like HBr: warm and reversible gives the 1,4 dibromide.",
        prov("thermodynamic call from diene_addition with Br as electrophile and nucleophile; misses are the 1,2 dibromide and the tetrabromide; name checked with OPSIN", OS_14_2, OS_14_3),
        conditions="one equivalent; " + WARM,
        misses=[
            ("p12", r["p12"], "the 1,2 product",
             "It forms first, and at 40 degrees it can go back to the cation. Given time, the mixture settles into the more stable alkene."),
            ("tetra", saturate(r["p12"], "Br"), "the product of two equivalents",
             "Adding across both C=C takes two Br2. With one equivalent, one C=C stays."),
        ],
    )
    # u1-hx-dienes: cold, kinetic, unsymmetrical diene.
    r = diene_addition(ISOPRENE, "H", "Br")
    draw(
        "u1-hx-dienes", "u1-hx-draw-isoprene-cold",
        "HBr, minus 80 degrees. Draw the major product.",
        "Decide where H+ goes first, then read the temperature.",
        scheme_visual(ISOPRENE, "isoprene", "HBr, 1 equiv", COLD_UNDER),
        r["kinetic"], "3-bromo-3-methylbut-1-ene",
        "H+ goes on C1, which puts the + on the tertiary, allylic C2. Cold, nothing reverses, so Br lands right next to where the H went: the 1,2 product.",
        "Protonate C1 to get the tertiary allylic cation, then put Br on that same carbon. Cold keeps the 1,2 product.",
        "Cold gives the kinetic, 1,2 product from the best cation.",
        prov("kinetic call from diene_addition (best cation by dominance); misses are its 1,4 product and the weaker cation's products; name checked with OPSIN", OS_14_2, OS_14_3),
        conditions="one equivalent; " + COLD,
        misses=[
            ("p14", r["p14"], "the 1,4 product",
             "That is the product that wins when warm. At minus 80 degrees nothing reverses, so the first-formed product stays."),
        ] + [
            (f"loser{i}", lose["p12"], "the product of the weaker cation",
             "That comes from H+ on the other end, which gives a cation that is only secondary. The tertiary allylic cation forms faster.")
            for i, lose in enumerate(r["losers"])
        ],
    )
    # u1-quiz-b: cyclohexa-1,3-diene, where 1,2 and 1,4 coincide.
    r = diene_addition(CHD, "H", "Br")
    answer = r["thermo"] if r["p12"] == r["p14"] else None
    draw(
        "u1-quiz-b", "u1-qb-draw-chd",
        "HBr adds to cyclohexa-1,3-diene. Draw the product.",
        "Draw the 1,2 and the 1,4 product. Then look again.",
        scheme_visual(CHD, "cyclohexa-1,3-diene", "HBr, 1 equiv"),
        answer, "3-bromocyclohexene",
        "In this ring the 1,2 and 1,4 products are the same molecule, 3-bromocyclohexene, so temperature does not change the answer.",
        "Draw both products and number them from the C=C: Br sits next to the double bond either way.",
        "When the diene is symmetric in a ring, the 1,2 and 1,4 products can be one compound.",
        prov("p12 and p14 from diene_addition are one canonical SMILES; misses are the non-allylic isomer and the doubly added ring; name checked with OPSIN", OS_14_2),
        conditions="one equivalent of HBr",
        misses=[
            ("far", br_moved_off_allylic(answer) if answer else None, "a Br two carbons from the C=C",
             "Bromide adds to a carbon that carried the +, and both of those sit right next to the remaining C=C."),
            ("no-ene", hydrogenated(answer) if answer else None, "a ring with no C=C",
             "One equivalent of HBr adds once. One C=C stays in the ring."),
        ],
    )
    # u1-energy-diagram: read the diagram, then produce the structure (round 2).
    p = (7.0, 2.6, 8.6, 0.8)
    d = ed(*p)
    r = diene_addition(BUTADIENE, "H", "Br")
    ok = d["kinetic"] == "A" and d["thermo"] == "B" and r["kinetic"] == r["p12"] and r["thermo"] == r["p14"]
    draw(
        "u1-energy-diagram", "u1-ed-draw-cold",
        "The diagram is HBr plus buta-1,3-diene. At minus 80 degrees, draw the major product.",
        "Read the diagram for a cold flask, then draw that product.",
        energy_visual("the two routes from the allylic cation", *p, names=("1,2", "1,4")),
        r["p12"] if ok else None, "3-bromobut-1-ene",
        "Cold, no product can climb back over its hump, so the one over the lower hump wins. That is the 1,2 product: H on C1, Br on C2.",
        "Cold means the lower hump wins. That is the 1,2 route: Br on C2, right beside the new H, with the C=C left at the end.",
        "Cold and irreversible: the product over the lower transition state (kinetic) wins.",
        prov("kinetic route read off the diagram's transition state heights and checked against diene_addition's kinetic call; name checked with OPSIN", OS_14_3),
        conditions="one equivalent; " + COLD,
        misses=[
            ("p14", r["p14"], "the 1,4 product",
             "That is the deeper well, the stable one. Cold, nothing climbs back, so depth gets no vote: the lower hump decides."),
        ],
    )


# ---------------------------------------------------------------------------
# Round 2 (U1-P3): a "Draw it" item for each stability node, so every Unit 1
# node asks the student to produce a structure. Each answer is the species the
# script's own stability model (compare / most_stable) picks among EVERY
# candidate it enumerates, and every other candidate becomes a named miss.
# ---------------------------------------------------------------------------


def protonations(alkene: str) -> list[str]:
    """H+ on each end of each C=C: the cation left on the other carbon."""
    m = mol(alkene)
    out: list[str] = []
    for bond in m.GetBonds():
        if bond.GetBondType() != Chem.BondType.DOUBLE:
            continue
        for h_on, plus_on in ((bond.GetBeginAtomIdx(), bond.GetEndAtomIdx()), (bond.GetEndAtomIdx(), bond.GetBeginAtomIdx())):
            rw = Chem.RWMol(m)
            rw.GetBondBetweenAtoms(h_on, plus_on).SetBondType(Chem.BondType.SINGLE)
            rw.GetAtomWithIdx(plus_on).SetFormalCharge(1)
            got = canon(_finish(rw))
            if got not in out:
                out.append(got)
    return out


def carbanions(smi: str, sp3_only: bool = False) -> list[str]:
    """A proton off each carbon that has one: every carbanion, by constitution.
    sp3_only skips C=C carbons: the anion model cannot rank a vinyl anion
    against an allylic one (s character and resonance disagree), so an item
    that needs a decidable winner asks only about the sp3 C-H."""
    m = mol(smi)
    out: list[str] = []
    for a in m.GetAtoms():
        if a.GetSymbol() != "C" or a.GetTotalNumHs() == 0:
            continue
        if sp3_only and in_multiple_bond(m, a.GetIdx()):
            continue
        rw = Chem.RWMol(m)
        atom = rw.GetAtomWithIdx(a.GetIdx())
        atom.SetFormalCharge(-1)
        atom.SetNumExplicitHs(a.GetTotalNumHs() - 1)
        atom.SetNoImplicit(True)
        p = rw.GetMol()
        Chem.SanitizeMol(p)
        got = canon(Chem.MolToSmiles(p))
        if got not in out:
            out.append(got)
    return out


def brominations(smi: str) -> list[tuple[str, str]]:
    """For each carbon with an H: (the radical left when Br. takes that H, the
    bromide made when Br2 then caps it). The radical is built as the cation
    analogue and converted with radical(), the model the radical node uses."""
    m = mol(smi)
    out: list[tuple[str, str]] = []
    seen: set[str] = set()
    for a in m.GetAtoms():
        if a.GetSymbol() != "C" or a.GetTotalNumHs() == 0:
            continue
        rw = Chem.RWMol(m)
        atom = rw.GetAtomWithIdx(a.GetIdx())
        atom.SetFormalCharge(1)
        atom.SetNumExplicitHs(a.GetTotalNumHs() - 1)
        atom.SetNoImplicit(True)
        p = rw.GetMol()
        Chem.SanitizeMol(p)
        cat = Chem.MolToSmiles(p)
        rw2 = Chem.RWMol(m)
        br = rw2.AddAtom(Chem.Atom("Br"))
        rw2.AddBond(a.GetIdx(), br, Chem.BondType.SINGLE)
        product = canon(_finish(rw2))
        if product in seen:
            continue
        seen.add(product)
        out.append((canon(radical(canon(cat))), product))
    return out


def charged_on_alkene(smi: str) -> bool:
    m = mol(smi)
    return any((a.GetFormalCharge() != 0 or a.GetNumRadicalElectrons() > 0) and in_multiple_bond(m, a.GetIdx()) for a in m.GetAtoms())


def degree_word(smi: str) -> str:
    m = mol(smi)
    idx = [a.GetIdx() for a in m.GetAtoms() if a.GetFormalCharge() != 0 or a.GetNumRadicalElectrons() > 0][0]
    return {0: "methyl", 1: "primary", 2: "secondary", 3: "tertiary"}[carbon_neighbours(m, idx)]


def node_produce_more() -> None:
    # u1-rank-cation: Markovnikov protonation, the best cation.
    alkene = "C=C(C)C"
    cats = protonations(alkene)
    best = most_stable(cats)
    draw(
        "u1-rank-cation", "u1-cat-draw-protonate",
        "H+ adds to 2-methylpropene. Draw the cation that forms.",
        "There are two ways to put the H on. Draw the cation each one leaves, then keep one.",
        struct_visual(alkene, "2-methylpropene"),
        best, "the tert-butyl cation",
        "H+ goes on the CH2 end, which leaves the + on the carbon carrying three carbons. Three alkyl groups donate into the empty orbital, so this cation forms much faster than the primary one.",
        "Put the H on the CH2 end. The + then sits on the central carbon, with three carbons around it.",
        "H+ adds to the end of the C=C that leaves the more substituted, more stable cation.",
        prov("both protonations built and ranked with the script's cation model (compare)", OS_7_9),
        concepts=CONCEPT_RES,
        misses=[(f"c{i}", c, f"the {degree_word(c)} cation",
                 "That puts the + on the carbon with fewer carbons around it. H+ goes on the end that leaves the more substituted cation.")
                for i, c in enumerate(cats) if c != best],
    )
    # u1-quiz-a: the same move on a ring, mixed into the stage A quiz.
    alkene = "CC1=CCCCC1"
    cats = protonations(alkene)
    best = most_stable(cats)
    draw(
        "u1-quiz-a", "u1-qa-draw-protonate",
        "H+ adds to 1-methylcyclohexene. Draw the cation that forms.",
        "Two carbons could take the H. Compare the cations they leave.",
        struct_visual(alkene, "1-methylcyclohexene"),
        best, "the 1-methylcyclohexyl cation",
        "H+ goes on the ring CH of the C=C, which leaves the + on the carbon carrying the methyl: three carbons around it, a tertiary cation.",
        "Put the H on the C=C carbon that has an H already. The + lands on the carbon with the methyl.",
        "Protonation leaves the more substituted cation: here, tertiary beats secondary.",
        prov("both protonations built and ranked with the script's cation model (compare)", OS_7_9),
        concepts=CONCEPT_RES,
        misses=[(f"c{i}", c, f"the {degree_word(c)} cation",
                 "That leaves the + on a carbon with only two carbons around it. The other carbon of the C=C gives a tertiary cation.")
                for i, c in enumerate(cats) if c != best],
    )
    # u1-rank-anion: deprotonate pent-1-ene at its best sp3 C-H.
    start = "C=CCCC"
    anions = carbanions(start, sp3_only=True)
    best = most_stable(anions)
    draw(
        "u1-rank-anion", "u1-ani-draw-pentene",
        "A strong base takes one H from an sp3 carbon of pent-1-ene. Draw the most stable anion.",
        "Three sp3 carbons carry H. Draw the anion each one gives, then compare. Either contributor counts.",
        struct_visual(start, "pent-1-ene"),
        best, "the pent-1-en-3-yl anion, an allylic anion",
        "Taking an H from C3 leaves a lone pair next to the C=C, so the charge is shared by C3 and C1. The other sp3 carbons give anions with no resonance and more alkyl groups pushing on them.",
        "Take the H from C3, the allylic carbon, right next to the C=C. The pi bond shares the negative charge.",
        "Resonance makes the allylic C-H the most acidic sp3 C-H in an alkene.",
        prov("every sp3 carbanion of pent-1-ene built and ranked with the script's anion model (resonance, then orbital, then alkyl groups); contributors share one InChI", OS_7_9),
        concepts=CONCEPT_CARBANION, any_contributor=True,
        misses=[(f"a{i}", a, "an anion with no C=C beside it",
                 "No pi bond sits next to that carbon, so one carbon holds the whole charge. The allylic carbon can share it.")
                for i, a in enumerate(anions) if a != best],
    )
    # u1-rank-radical: radical bromination goes through the most stable radical.
    start = "CC1CCCCC1"
    rows = brominations(start)
    rads = [r for r, _ in rows]
    best_rad = most_stable(rads)
    product = next((p for r, p in rows if r == best_rad), None) if best_rad is not None else None
    draw(
        "u1-rank-radical", "u1-rad-draw-bromination",
        "Methylcyclohexane, Br2, light. Draw the major monobromide.",
        "Br• takes one H first. Picture the radical each H would leave.",
        scheme_visual(start, "methylcyclohexane", "Br_2", "hν"),
        product, "1-bromo-1-methylcyclohexane",
        "Br• is choosy: it takes the H that leaves the most stable radical. Here that is the tertiary ring carbon carrying the methyl, so Br ends up there.",
        "Take the H from the carbon with three carbons around it, the tertiary one, then put Br where that H was.",
        "Bromination goes through the most stable radical: tertiary beats secondary beats primary.",
        prov("every H abstraction built, the radicals ranked with the script's radical model, Br placed on the winner; name checked with OPSIN", OS_10_5),
        concepts=CONCEPT_RADICAL,
        misses=[(f"b{i}", p, f"Br on a {degree_word(r)} carbon",
                 f"That H leaves a {degree_word(r)} radical. Br• takes the H that leaves the most stable radical, and a tertiary one is on offer.")
                for i, (r, p) in enumerate(rows) if r != best_rad],
    )


def build() -> None:
    node_allylic()
    node_rank_cation()
    node_rank_anion()
    node_rank_radical()
    node_quiz_a()
    node_kvt()
    node_energy()
    node_12v14()
    node_hx()
    node_x2()
    node_quiz_b()
    node_draws()
    node_produce_more()
    check_names()


# ---------------------------------------------------------------------------
# Emit
# ---------------------------------------------------------------------------

HEADER = '''/**
 * Unit 1 problem pools, stages A and B. GENERATED by scripts/u1_pools_ab.py.
 * Do not edit by hand: edit the specs in the script and rerun it.
 *
 * EVERY ENTRY IS A DRAFT (`placeholder: true`) until the owner signs it off.
 * The chemistry in each one (structures, products, regiochemistry, rankings)
 * was derived by the script with RDKit, and the script refuses to write this
 * file when an authored answer disagrees with what it derived. The model
 * behind each call is written down in the script's header, so the owner can
 * check the model rather than every answer.
 *
 * WHAT THIS FILE EXPORTS BESIDE THE POOLS, and why. The drawings an MCQ shows
 * live in side tables keyed by beat id, the same shim shape
 * beats/mcq/mcqFigures.ts uses (its VISUALS and OPTION_FIGURES tables are
 * private to that file). STAGE_AB_VISUALS is the question drawing and
 * STAGE_AB_OPTION_TILES the drawn options; STAGE_AB_SORT_FIGURES draws each
 * sort card. The lookups mcqVisualFor and mcqOptionTiles do not read these
 * yet; wiring them in is an engine change, recorded in the authoring log.
 *
 * Ladders are built by ./ladder.ts, shared with stage-cd.active.ts, with the
 * same createProblem and createOrderingAnswer calls beats/sort/ladders.ts makes.
 */
import type { McqVisual, NamedFigure } from "../../beats/mcq/mcqFigures";
import type { UnitPools } from "./types";
import { ladder } from "./ladder";
'''


def ts(value) -> str:
    return json.dumps(value, ensure_ascii=False, indent=2)


def emit() -> str:
    out = [HEADER]
    out.append("\nexport const STAGE_AB_POOLS: UnitPools = {")
    for node, entries in POOLS.items():
        out.append(f"  {json.dumps(node)}: [")
        for e in entries:
            if e.get("__ladder__"):
                spec = {k: v for k, v in e.items() if k != "__ladder__" and v is not None}
                out.append("    ladder(" + ts(spec).replace("\n", "\n    ") + "),")
            else:
                out.append("    " + ts(e).replace("\n", "\n    ") + ",")
        out.append("  ],")
    out.append("};\n")
    out.append("/** The drawing beside each MCQ, keyed by beat id. A beat with drawn options may have none. */")
    out.append("export const STAGE_AB_VISUALS: Readonly<Record<string, McqVisual>> = " + ts(VISUALS) + ";\n")
    out.append("/** Drawn options, keyed by beat id then option id. All or nothing per beat. */")
    out.append(
        "export const STAGE_AB_OPTION_TILES: Readonly<Record<string, Readonly<Record<string, NamedFigure>>>> = "
        + ts(TILES)
        + ";\n"
    )
    out.append("/** A drawing for every sort card, keyed by beat id then item id. */")
    out.append(
        "export const STAGE_AB_SORT_FIGURES: Readonly<Record<string, Readonly<Record<string, NamedFigure>>>> = "
        + ts(SORT_FIGURES)
        + ";\n"
    )
    return "\n".join(out)


def main() -> int:
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
    OUT.write_text(text, encoding="utf-8", newline="\n")
    for node, entries in POOLS.items():
        print(f"{node}: {len(entries)}")
    print(f"wrote {OUT.relative_to(REPO)}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
