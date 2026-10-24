"""
Unit 6 (spectroscopy and structure determination) problem pools, a DRAFT, derived with RDKit.

Run:     python scripts/u6_pools.py
Writes:  src/game/content/u6/pools.ts (never edit it by hand: edit the specs
         below and rerun). The owner's report for this unit is written by hand
         beside the run, from what this script prints.

Built on scripts/u4_pools.py: the figure, naming, entry and emit helpers are
copied from it unchanged. Every entry is `placeholder: true`.

THE MODEL. Check these rules, not the fifty answers. Nothing below is a
spectrum value from memory: every number a student sees is counted off the
molecular graph or computed from RDKit's isotope table.

1. Degrees of unsaturation, two ways that must agree. From the formula:
   (2C + 2 + N - H - X) / 2, halogens counted as H, O and S ignored. From
   the structure: rings (RDKit ring count) plus pi bonds (bond order minus
   one, summed over the Kekule form). A disagreement refuses the run.

2. Equivalent atoms. Two atoms are equivalent when RDKit's canonical ranking
   with ties unbroken (CanonicalRankAtoms, breakTies=False) gives them the
   same rank on the molecule with explicit H. That is TOPOLOGICAL symmetry.
   It misses diastereotopic H and cis/trans H on a C=C, so every NMR molecule
   is refused unless it has no stereocentre and no non-aromatic C=C.

3. 1H NMR. Signals: one per equivalence class of C-H hydrogens. Integration:
   H per class, reduced. Multiplicity: the n + 1 rule, n = the H on carbons
   bonded to this H's carbon that are not in its own class (first order, all
   J taken equal, O-H and N-H not counted: conventions, flagged).

4. 13C and DEPT. Signals: one per equivalence class of carbons. DEPT reads
   the H count on each carbon. What DEPT-90 and DEPT-135 show (CH only; CH and
   CH3 up, CH2 down, C absent) is the definition of the experiment, flagged
   as a convention on each entry that uses it.

5. Mass spectrometry. Isotope masses and abundances come from RDKit's
   periodic table (Chem.GetPeriodicTable), a cited dataset, and the script
   checks each element's listed abundances sum to 100. The molecular ion
   cluster is the full convolution over every atom, binned by mass number.
   The nominal molecular ion is the cluster's lightest-isotope peak.

6. 2D NMR, as graph distances. COSY: H classes on bonded carbons (H-C-C-H).
   HSQC: each H-bearing carbon class to its own H. HMBC: H to carbons two or
   three bonds away (topological distance 1 or 2 from the H's carbon). The
   bond counts are what the experiments are defined by (convention, flagged).

7. Conjugation (u6-uv). The largest set of pi bonds joined through single
   bonds RDKit marks conjugated, on the Kekule form. That a longer conjugated
   system absorbs at a longer wavelength is the HOMO-LUMO trend Unit 1
   teaches, flagged as a convention. No lambda max number is shown anywhere:
   Woodward-Fieser increments are recall, not derivable, so they are left
   out (see the owner report).

HELD: u6-ir. Its items rest on band positions quoted from OpenStax ch. 12.8
and 20.8 (see ir_items), emitted as U6_IR_HELD and read by nothing until the
owner signs off the numbers. LEFT OUT: alpha-cleavage and McLafferty (named
fragmentations RDKit cannot decide), and chemical shift values. See the
owner report.

CHECKED AGAINST: nothing yet. Each provenance names the OpenStax chapter the
owner should read it against; this run did not read it.
"""

from __future__ import annotations

import json
import math
import os
import re
import sys
import tempfile
from fractions import Fraction
from math import gcd
from pathlib import Path

from rdkit import Chem, RDLogger
from rdkit.Chem import Descriptors, rdDepictor
from rdkit.Chem.rdMolDescriptors import CalcMolFormula

RDLogger.DisableLog("rdApp.*")
rdDepictor.SetPreferCoordGen(True)

REPO = Path(__file__).resolve().parent.parent
OUT = REPO / "src" / "game" / "content" / "u6" / "pools.ts"

SCRIPT = "scripts/u6_pools.py"


def book(section: str) -> str:
    return f"Textbook check still owed: OpenStax Organic Chemistry {section} (CC BY-NC-SA), not read in this run"


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
# Names: OPSIN must read each one back as the drawn structure
# ---------------------------------------------------------------------------

NAME_CHECKS: list[tuple[str, str, str]] = []
OPSIN_DIR = Path(tempfile.mkdtemp(prefix="u6_opsin_"))


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
        if (a.GetSymbol() == "N" and a.GetFormalCharge() == 1 and len(oxy) == 2 and not a.IsInRing()
                and any(m.GetBondBetweenAtoms(a.GetIdx(), o).GetBondTypeAsDouble() == 2 for o in oxy)):
            # a neutral nitro only: a nitronate (C=N, both O charged) is drawn atom by atom
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
    return f"{SCRIPT}: {what}. {book(section)}.{tail}"


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
    if not id.startswith("u6-"):
        fail(f"{id}: ids start u6-")
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
        "problemId": "u6-pool-" + id,
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
# The Unit 6 model: counts off the molecular graph, RDKit's isotope table
# ---------------------------------------------------------------------------

HALOGENS = {"F", "Cl", "Br", "I"}
WORD = {0: "Zero", 1: "One", 2: "Two", 3: "Three", 4: "Four", 5: "Five", 6: "Six", 7: "Seven", 8: "Eight"}
SPLIT = {1: "Singlet", 2: "Doublet", 3: "Triplet", 4: "Quartet", 5: "Quintet", 6: "Sextet", 7: "Septet"}
SUB = str.maketrans("0123456789", "₀₁₂₃₄₅₆₇₈₉")


def atom_counts(smi: str) -> dict[str, int]:
    m = Chem.AddHs(mol(smi))
    out: dict[str, int] = {}
    for a in m.GetAtoms():
        out[a.GetSymbol()] = out.get(a.GetSymbol(), 0) + 1
    return out


def pretty(smi: str) -> str:
    """The formula with Unicode subscripts, for prompts (C₆H₁₀)."""
    return formula(smi).translate(SUB)


def fig_formula(smi: str) -> str:
    """The formula in the figure label syntax (C_6H_{10})."""
    return re.sub(r"(\d+)", lambda g: "_" + (g.group(1) if len(g.group(1)) == 1 else "{" + g.group(1) + "}"), formula(smi))


def saturated_h(smi: str) -> int:
    """H count of the saturated, acyclic compound with the same C and N (halogens counted as H)."""
    c = atom_counts(smi)
    return 2 * c.get("C", 0) + 2 + c.get("N", 0)


def dou_formula(smi: str) -> int:
    c = atom_counts(smi)
    h = c.get("H", 0) + sum(c.get(x, 0) for x in HALOGENS)
    twice = saturated_h(smi) - h
    if twice % 2:
        fail(f"{smi}: odd H deficit {twice}")
    return twice // 2


def dou_structure(smi: str) -> int:
    m = Chem.Mol(mol(smi))
    Chem.Kekulize(m, clearAromaticFlags=True)
    pi = sum(int(b.GetBondTypeAsDouble()) - 1 for b in m.GetBonds())
    return m.GetRingInfo().NumRings() + pi


def dou(smi: str) -> int:
    a, b = dou_formula(smi), dou_structure(smi)
    if a != b:
        fail(f"{smi}: degrees of unsaturation from the formula {a}, from the structure {b}")
    return a


def nmr_mol(smi: str) -> Chem.Mol:
    """The molecule with explicit H, refused when topological symmetry would miscount (rule 2)."""
    m = mol(smi)
    centres = Chem.FindMolChiralCenters(m, includeUnassigned=True, useLegacyImplementation=False)
    if centres:
        fail(f"{smi}: has a stereocentre, so its CH2 H may be diastereotopic")
    for b in m.GetBonds():
        if b.GetBondType() == Chem.BondType.DOUBLE and not b.GetIsAromatic():
            ends = (b.GetBeginAtom(), b.GetEndAtom())
            if all(a.GetSymbol() == "C" for a in ends):
                fail(f"{smi}: has a C=C, whose cis and trans H topology cannot tell apart")
    return Chem.AddHs(m)


def ranks(m: Chem.Mol) -> list[int]:
    return list(Chem.CanonicalRankAtoms(m, breakTies=False))


def h_classes(smi: str) -> dict[int, list[int]]:
    """C-H hydrogens grouped by equivalence: rank -> H atom indices."""
    m = nmr_mol(smi)
    r = ranks(m)
    out: dict[int, list[int]] = {}
    for a in m.GetAtoms():
        if a.GetSymbol() == "H" and a.GetNeighbors()[0].GetSymbol() == "C":
            out.setdefault(r[a.GetIdx()], []).append(a.GetIdx())
    return out


def h_signals(smi: str) -> int:
    return len(h_classes(smi))


def c_classes(smi: str) -> dict[int, list[int]]:
    m = nmr_mol(smi)
    r = ranks(m)
    out: dict[int, list[int]] = {}
    for a in m.GetAtoms():
        if a.GetSymbol() == "C":
            out.setdefault(r[a.GetIdx()], []).append(a.GetIdx())
    return out


def c_signals(smi: str) -> int:
    return len(c_classes(smi))


def ratio(smi: str) -> str:
    """Integration, largest first, reduced: '3 : 1'."""
    sizes = sorted((len(v) for v in h_classes(smi).values()), reverse=True)
    g = 0
    for s in sizes:
        g = gcd(g, s)
    return " : ".join(str(s // g) for s in sizes)


def class_of_carbon(smi: str, c: int) -> int:
    m = nmr_mol(smi)
    return ranks(m)[[n.GetIdx() for n in m.GetAtomWithIdx(c).GetNeighbors() if n.GetSymbol() == "H"][0]]


def neighbours_h(smi: str, c: int) -> int:
    """n for the n + 1 rule: H on bonded carbons, outside this H's own class (rule 3)."""
    m = nmr_mol(smi)
    r = ranks(m)
    mine = class_of_carbon(smi, c)
    n = 0
    for nb in m.GetAtomWithIdx(c).GetNeighbors():
        if nb.GetSymbol() != "C":
            continue
        n += sum(1 for h in nb.GetNeighbors() if h.GetSymbol() == "H" and r[h.GetIdx()] != mine)
    return n


def split(smi: str, c: int) -> str:
    return SPLIT[neighbours_h(smi, c) + 1]


def h_on(smi: str, c: int) -> int:
    return mol(smi).GetAtomWithIdx(c).GetTotalNumHs()


def dept135(smi: str, c: int) -> str:
    n = h_on(smi, c)
    return "Absent" if n == 0 else "Points down" if n == 2 else "Points up"


def quaternary_classes(smi: str) -> int:
    m = nmr_mol(smi)
    return sum(1 for atoms in c_classes(smi).values() if m.GetAtomWithIdx(atoms[0]).GetTotalNumHs(includeNeighbors=True) == 0)


def has_ch(smi: str) -> bool:
    return any(a.GetSymbol() == "C" and a.GetTotalNumHs() == 1 for a in mol(smi).GetAtoms())


# Rule 6: 2D NMR as graph distances.

def cosy_partners(smi: str, c: int) -> set[int]:
    """Carbons (heavy atom indices) whose H couple to the H on carbon c through H-C-C-H."""
    m = mol(smi)
    mine = class_of_carbon(smi, c)
    out = set()
    for nb in m.GetAtomWithIdx(c).GetNeighbors():
        if nb.GetSymbol() == "C" and nb.GetTotalNumHs() > 0 and class_of_carbon(smi, nb.GetIdx()) != mine:
            out.add(nb.GetIdx())
    return out


def cosy_pairs(smi: str) -> int:
    """Distinct pairs of H classes that show a COSY cross peak."""
    m = mol(smi)
    pairs = set()
    for a in m.GetAtoms():
        if a.GetSymbol() == "C" and a.GetTotalNumHs() > 0:
            for p in cosy_partners(smi, a.GetIdx()):
                pairs.add(frozenset((class_of_carbon(smi, a.GetIdx()), class_of_carbon(smi, p))))
    return len(pairs)


def hsqc_peaks(smi: str) -> int:
    m = nmr_mol(smi)
    return sum(1 for atoms in c_classes(smi).values() if m.GetAtomWithIdx(atoms[0]).GetTotalNumHs(includeNeighbors=True) > 0)


def hmbc_targets(smi: str, c: int) -> set[int]:
    """Carbons two or three bonds from the H on carbon c (graph distance 1 or 2 from c)."""
    d = Chem.GetDistanceMatrix(mol(smi))
    m = mol(smi)
    return {a.GetIdx() for a in m.GetAtoms() if a.GetSymbol() == "C" and d[c][a.GetIdx()] in (1, 2)}


# Rule 5: mass spectrometry from RDKit's isotope table.

PT = Chem.GetPeriodicTable()
ISOTOPES = {"H": (1, 2), "C": (12, 13), "N": (14, 15), "O": (16, 17, 18), "F": (19,), "S": (32, 33, 34, 36),
            "Cl": (35, 37), "Br": (79, 81), "I": (127,)}


def check_isotope_table() -> None:
    for el, nums in ISOTOPES.items():
        total = sum(PT.GetAbundanceForIsotope(el, n) for n in nums)
        if abs(total - 100) > 0.1:
            fail(f"isotope list for {el} sums to {total:.3f} percent, not 100")


def cluster(smi: str) -> dict[int, float]:
    """The molecular ion cluster: mass number -> relative abundance, tallest is 100."""
    dist = {0: 1.0}
    for el, n in atom_counts(smi).items():
        if el not in ISOTOPES:
            fail(f"{smi}: no isotope list for {el}")
            continue
        for _ in range(n):
            new: dict[int, float] = {}
            for mass, p in dist.items():
                for iso in ISOTOPES[el]:
                    q = p * PT.GetAbundanceForIsotope(el, iso) / 100
                    new[mass + iso] = new.get(mass + iso, 0.0) + q
            dist = {k: v for k, v in new.items() if v > 1e-9}
    top = max(dist.values())
    return {k: 100 * v / top for k, v in sorted(dist.items())}


def m_plus(smi: str) -> int:
    """The nominal molecular ion: the lightest-isotope peak of the cluster."""
    lightest = min(cluster(smi))
    if lightest != round(Descriptors.ExactMolWt(mol(smi))):
        fail(f"{smi}: lightest-isotope ion {lightest} disagrees with the monoisotopic mass")
    return lightest


def rel(smi: str, offset: int) -> float:
    """Height of M + offset as a percent of M."""
    c = cluster(smi)
    m = min(c)
    return 100 * c.get(m + offset, 0.0) / c[m]


def m2_pattern(smi: str) -> str:
    r = rel(smi, 2)
    if r >= 80:
        return "M and M+2 nearly equal"
    if 20 <= r <= 45:
        return "M+2 about a third of M"
    if r < 10:
        return "M+2 small or missing"
    fail(f"{smi}: M+2 is {r:.1f} percent of M, between the bands")
    return "unclassified"


def cluster_text(smi: str) -> str:
    """M, M+2, M+4 as percents of M, rounded: 'M 100, M+2 64, M+4 10'."""
    return f"M 100, M+2 {round(rel(smi, 2))}, M+4 {round(rel(smi, 4))}"


def two_tallest(smi: str) -> str:
    c = cluster(smi)
    a, b = sorted(sorted(c, key=lambda k: -c[k])[:2])
    return f"m/z {a} and {b}"


# Rule 7: conjugation.

def pi_count(smi: str, a: str | None = None, b: str | None = None) -> int:
    """Double bonds in the molecule, optionally only those between elements a and b."""
    n = 0
    for bond in mol(smi).GetBonds():
        if bond.GetBondType() != Chem.BondType.DOUBLE:
            continue
        ends = sorted((bond.GetBeginAtom().GetSymbol(), bond.GetEndAtom().GetSymbol()))
        if a is None or ends == sorted((a, b)):
            n += 1
    return n


def conjugated_pi(smi: str) -> int:
    """Pi bonds in the largest conjugated system (Kekule form, RDKit conjugation flags)."""
    m = Chem.Mol(mol(smi))
    Chem.Kekulize(m, clearAromaticFlags=True)
    pis = [b.GetIdx() for b in m.GetBonds() if b.GetBondTypeAsDouble() >= 2]
    parent = {p: p for p in pis}

    def find(x: int) -> int:
        while parent[x] != x:
            x = parent[x]
        return x

    for b in m.GetBonds():
        if b.GetBondTypeAsDouble() != 1 or not b.GetIsConjugated():
            continue
        touching = [p for p in pis if {m.GetBondWithIdx(p).GetBeginAtomIdx(), m.GetBondWithIdx(p).GetEndAtomIdx()}
                    & {b.GetBeginAtomIdx(), b.GetEndAtomIdx()}]
        for p in touching[1:]:
            parent[find(p)] = find(touching[0])
    sizes: dict[int, int] = {}
    for p in pis:
        sizes[find(p)] = sizes.get(find(p), 0) + 1
    return max(sizes.values(), default=0)


def key_val(values: dict[str, object], derived: object) -> str | None:
    """The one option whose derived value equals the target; None if zero or two do."""
    hits = [o for o, v in values.items() if v == derived]
    return hits[0] if len(hits) == 1 else None


def key_max(values: dict[str, float]) -> str | None:
    best = max(values.values())
    hits = [o for o, v in values.items() if v == best]
    return hits[0] if len(hits) == 1 else None


def formula_visual(smi: str, caption: str) -> dict:
    fig = {"bonds": [], "labels": [{"x": 60.0, "y": 50.0, "t": fig_formula(smi), "size": 20}]}
    check_bounds(fig, smi)
    return {"kind": "structure", "figure": fig, "name": caption}


def cue_visual(text: str, caption: str, size: int = 16) -> dict:
    """
    The stem drawing for a tiled MCQ: a short text cue, no molecule. The tiles
    already draw every option, so a single structure here would be one of the
    options shown again under a plural caption.
    """
    if 0.6 * size * len(text.replace("_", "").replace("{", "").replace("}", "")) > W - 8:
        fail(f"cue {text}: too wide for the figure")
    fig = {"bonds": [], "labels": [{"x": 60.0, "y": 48.0, "t": text, "size": size}]}
    check_bounds(fig, text)
    return {"kind": "structure", "figure": fig, "name": caption}


def tile(smi: str, name: str, caption: str | None = None, **kw) -> dict:
    return named(smi, name, caption, **kw)


S_DOU = "ch. 7 (degree of unsaturation)"
S_MS = "ch. 12 (mass spectrometry)"
S_NMR = "ch. 13 (NMR spectroscopy)"
S_UV = "ch. 14 (conjugated compounds and ultraviolet spectroscopy)"
DOU_C = ("degrees_of_unsaturation",)
NMR_C = ("spectroscopy_nmr",)
MS_C = ("structure_determination",)
UV_C = ("resonance_delocalisation",)

N1 = "first-order splitting by the n + 1 rule, all couplings taken equal"
DEPT = "DEPT-90 shows CH only; DEPT-135 shows CH and CH3 up, CH2 down, and no quaternary C (the experiment's definition)"
COSY = "COSY links H on bonded carbons (H-C-C-H, three bonds)"
HSQC = "HSQC links each H to the carbon it sits on (one bond)"
HMBC = "HMBC links an H to carbons two or three bonds away, and not to its own carbon"
LAMBDA = "more pi bonds in one conjugated system narrows the HOMO-LUMO gap, so lambda max is longer (the Unit 1 MO trend)"


# ---------------------------------------------------------------------------
# u6-dou: degrees of unsaturation
# ---------------------------------------------------------------------------

def node_dou() -> None:
    node = "u6-dou"
    sec = S_DOU
    bz = "c1ccccc1"
    mcq(node, "u6-dou-meet-ring", "Pick how many degrees of unsaturation a benzene ring holds.",
        [("4", "Four", "One ring plus three C=C bonds. That is why four or more degrees in a formula hints at a benzene ring."),
         ("3", "Three", "That counts the three C=C bonds and forgets the ring. Closing a ring costs two H, the same as a pi bond."),
         ("1", "One", "One ring is one degree, but each of the three C=C bonds adds one more."),
         ("6", "Six", "Six carbons is not six degrees. Count rings plus pi bonds: one ring, three C=C.")],
        key_val({"4": 4, "3": 3, "1": 1, "6": 6}, dou(bz)), "4",
        "Each ring and each pi bond is one degree of unsaturation. Benzene has one ring and three C=C, so four.",
        prov("rule 1, rings plus pi bonds on the Kekule form, checked against the formula count", sec),
        structure(bz, "benzene"), brief="A ring and a pi bond each remove two H from the saturated formula.",
        level=0, concepts=DOU_C)

    hexene = "C1=CCCCC1"
    sat = saturated_h(hexene)
    mcq(node, "u6-dou-c6h10", f"A compound is {pretty(hexene)}. Pick its degrees of unsaturation.",
        [("2", "Two", f"Saturated six-carbon is C₆H{str(sat).translate(SUB)}. Ten H is four short, and each degree removes two H."),
         ("4", "Four", "Four is the H shortfall, not the degrees. Each ring or pi bond removes two H, so halve it."),
         ("1", "One", "One degree would be C₆H₁₂. Ten H is two H fewer again, so one more degree."),
         ("5", "Five", f"That halves the ten H. Compare with the saturated count, {sat} H, instead.")],
        key_val({"2": 2, "4": 4, "1": 1, "5": 5}, dou(hexene)), "2",
        "Compare with the saturated alkane, CₙH₂ₙ₊₂: every two H missing is one ring or one pi bond.",
        prov("rule 1, formula count, with cyclohexene as the structure check", sec),
        formula_visual(hexene, "formula only"), level=1, concepts=DOU_C)

    brb = "CCCCBr"
    if (saturated_h(brb), atom_counts(brb)["H"]) != (10, 9):
        fail("u6-dou-halogen: the copy says nine H against the alkane's ten")
    mcq(node, "u6-dou-halogen", f"A compound is {pretty(brb)}. Pick its degrees of unsaturation.",
        [("0", "Zero", "Count Br as an H: that makes C₄H₁₀, the saturated alkane. No rings, no pi bonds."),
         ("1", "One", "Leaving Br out leaves nine H against the alkane's ten, which does not even give a whole number. A halogen takes an H's place, so count C₄H₉Br as C₄H₁₀: zero."),
         ("2", "Two", "Br is not a site of unsaturation. It takes an H's place, so the count is the alkane's.")],
        key_val({"0": 0, "1": 1, "2": 2}, dou(brb)), "0",
        "Halogens count as hydrogens. C₄H₉Br counts like C₄H₁₀, which is saturated.",
        prov("rule 1, halogen counted as H, with 1-bromobutane as the structure check", sec),
        formula_visual(brb, "formula only"), concepts=DOU_C)

    pyr = "c1ccncc1"
    sat = saturated_h(pyr)
    if (sat - atom_counts(pyr)["H"], atom_counts(pyr)["H"]) != (8, 5):
        fail("u6-dou-nitrogen: the copy says five H, eight short")
    mcq(node, "u6-dou-nitrogen", f"A compound is {pretty(pyr)}. Pick its degrees of unsaturation.",
        [("4", "Four", f"Each N raises the saturated count by one: C₅ with one N saturates at {sat} H. Five H is eight short, four degrees."),
         ("3", "Three", "That treats N like a halogen and subtracts it. Nitrogen adds one H to the saturated count instead."),
         ("5", "Five", f"One too many. With the N counted, the saturated compound has {sat} H. Five H is eight short, so four degrees, not five.")],
        key_val({"4": 4, "3": 3, "5": 5}, dou(pyr)), "4",
        "Add one H to the saturated count for each nitrogen. Oxygen changes nothing.",
        prov("rule 1, N adds one to the saturated H count, with pyridine as the structure check", sec),
        formula_visual(pyr, "formula only"), level=2, concepts=DOU_C)

    opts = {"one": "CC(C)=O", "ol": "CCCO", "al": "C=CC=O"}
    fits = [k for k, s in opts.items() if formula(s) == "C3H6O"]
    mcq(node, "u6-dou-fit-c3h6o", "Pick the structure that fits C₃H₆O.",
        [("one", "Propan-2-one", f"C₃H₆O, one degree, spent on the C=O. Oxygen does not change the count."),
         ("ol", "Propan-1-ol", f"This is {pretty(opts['ol'])}: no rings or pi bonds, so zero degrees. Two H too many."),
         ("al", "Prop-2-enal", f"This is {pretty(opts['al'])}: a C=C and a C=O, two degrees. Two H too few.")],
        fits[0] if len(fits) == 1 else None, "one",
        "C₃H₆O has one degree of unsaturation: one ring or one pi bond, here a C=O.",
        prov("RDKit formula of each option compared with C3H6O", sec),
        formula_visual("CC(C)=O", "the formula to match"),
        tiles={"one": tile(opts["one"], "propan-2-one"), "ol": tile(opts["ol"], "propan-1-ol"), "al": tile(opts["al"], "prop-2-enal")},
        concepts=DOU_C)

    opts = {"ene": "C1=CCCCC1", "ane": "C1CCCCC1", "hex": "C=CCCCC"}
    misfit = [k for k, s in opts.items() if formula(s) != "C6H12"]
    mcq(node, "u6-dou-not-c6h12", "C₆H₁₂ has one degree of unsaturation. Pick the structure it cannot be.",
        [("ene", "Cyclohexene", f"A ring and a C=C is two degrees, {pretty(opts['ene'])}. Too few H for C₆H₁₂."),
         ("ane", "Cyclohexane", "One ring, one degree: this fits. A ring and a pi bond cost the same two H."),
         ("hex", "Hex-1-ene", "One C=C, one degree: this fits too. The formula alone cannot tell a ring from a pi bond.")],
        misfit[0] if len(misfit) == 1 else None, "ene",
        "One degree is one ring OR one pi bond. Cyclohexane and hex-1-ene share the formula; spectra tell them apart.",
        prov("RDKit formula of each option compared with C6H12", sec),
        formula_visual("C1CCCCC1", "the formula to match"),
        tiles={k: tile(s, n) for k, s, n in (("ene", opts["ene"], "cyclohexene"), ("ane", opts["ane"], "cyclohexane"), ("hex", opts["hex"], "hex-1-ene"))},
        level=2, concepts=DOU_C)

    opts = {"eb": "CCc1ccccc1", "yne": "C#CCCCCCC", "oct": "C1CCCCCCC1"}
    fits = [k for k, s in opts.items() if formula(s) == "C8H10"]
    mcq(node, "u6-dou-fit-c8h10", "Pick the structure that fits C₈H₁₀.",
        [("eb", "Ethylbenzene", "C₈H₁₀ has four degrees, and a benzene ring holds exactly four."),
         ("yne", "Oct-1-yne", f"A triple bond is two degrees, so this is {pretty(opts['yne'])}. Four H too many."),
         ("oct", "Cyclooctane", f"One ring, one degree: {pretty(opts['oct'])}. Far too many H.")],
        fits[0] if len(fits) == 1 else None, "eb",
        f"C₈H₁₀ is {dou('CCc1ccccc1')} degrees. Four or more is the cue to look for a benzene ring first.",
        prov("RDKit formula of each option compared with C8H10", sec),
        formula_visual("CCc1ccccc1", "the formula to match"),
        tiles={"eb": tile(opts["eb"], "ethylbenzene"), "yne": tile(opts["yne"], "oct-1-yne"), "oct": tile(opts["oct"], "cyclooctane")},
        brief="Four or more degrees is a hint to look for a benzene ring.", concepts=DOU_C)

    est = "CCOC(C)=O"
    mcq(node, "u6-dou-ester", f"A compound is {pretty(est)}. Pick its degrees of unsaturation.",
        [("1", "One", "Ignore the O atoms: C₄H₈ is two H short of C₄H₁₀, so one ring or one pi bond, often a C=O."),
         ("0", "Zero", "Eight H is two short of the saturated ten. Something, a ring or a pi bond, is there."),
         ("3", "Three", "Oxygen atoms add nothing. Only C, H, N and halogens enter the count.")],
        key_val({"1": 1, "0": 0, "3": 3}, dou(est)), "1",
        "Oxygen does not enter the count. C₄H₈O₂ has one degree, which an ester spends on its C=O.",
        prov("rule 1, oxygen ignored, with ethyl acetate as the structure check", sec),
        formula_visual(est, "formula only"), concepts=DOU_C)


# ---------------------------------------------------------------------------
# u6-hnmr: signals, integration, splitting
# ---------------------------------------------------------------------------

def node_hnmr() -> None:
    node = "u6-hnmr"
    sec = S_NMR
    bk = "CC(=O)CC"
    mcq(node, "u6-hnmr-meet-count", "Pick how many ¹H NMR signals butan-2-one gives.",
        [("3", "Three", "The CH₃ on C=O, the CH₂, and the far CH₃: three different neighbourhoods, three signals."),
         ("4", "Four", "That counts the carbons. The C=O carbon carries no H, so it gives no ¹H signal."),
         ("2", "Two", "The two CH₃ groups are not alike: one sits on the C=O, the other on the CH₂.")],
        key_val({"3": 3, "4": 4, "2": 2}, h_signals(bk)), "3",
        "One signal per set of equivalent H. Ask whether a symmetry operation swaps two groups; if not, they differ.",
        prov("rule 2, H classes from RDKit canonical ranks with ties unbroken", sec),
        structure(bk, "butan-2-one"), brief="Equivalent H give one signal. Different surroundings give different signals.",
        level=0, concepts=NMR_C)

    pk = "CCC(=O)CC"
    mcq(node, "u6-hnmr-symmetry", "Pick how many ¹H NMR signals pentan-3-one gives.",
        [("2", "Two", "A mirror through the C=O swaps the two ethyl groups, so both CH₂ match and both CH₃ match."),
         ("4", "Four", "That counts each CH₂ and CH₃ on its own. The molecule's symmetry makes the two sides identical."),
         ("5", "Five", "Five is the carbon count. Only H-bearing environments give ¹H signals, and the halves match.")],
        key_val({"2": 2, "4": 4, "5": 5}, h_signals(pk)), "2",
        "Symmetry cuts the signal count: pentan-3-one's two ethyl groups are one environment.",
        prov("rule 2, H classes from RDKit canonical ranks with ties unbroken", sec),
        structure(pk, "pentan-3-one"), concepts=NMR_C)

    px = "Cc1ccc(C)cc1"
    mcq(node, "u6-hnmr-xylene", "Pick how many ¹H NMR signals 1,4-dimethylbenzene gives.",
        [("2", "Two", "Both CH₃ groups match, and all four ring H match, because the ring is symmetric end to end and side to side."),
         ("3", "Three", "The ring H are all alike here: each sits between a CH₃-bearing carbon and another ring CH."),
         ("4", "Four", "That splits the ring H into two kinds. In the para isomer, symmetry makes all four the same.")],
        key_val({"2": 2, "3": 3, "4": 4}, h_signals(px)), "2",
        "Para substitution with two identical groups gives the most symmetric ring: one ring H signal.",
        prov("rule 2, H classes from RDKit canonical ranks with ties unbroken", sec),
        structure(px, "1,4-dimethylbenzene"), concepts=NMR_C)

    opts = {"neo": "CC(C)(C)C", "but": "CCCC", "iso": "CC(C)C"}
    counts = {k: h_signals(s) for k, s in opts.items()}
    mcq(node, "u6-hnmr-one-signal", "Pick the compound whose ¹H NMR shows one signal.",
        [("neo", "2,2-Dimethylpropane", "Four CH₃ groups on one central carbon, all alike: one signal."),
         ("but", "Butane", f"The CH₃ ends and the CH₂ middle differ: {WORD[counts['but']].lower()} signals."),
         ("iso", "2-Methylpropane", f"Three CH₃ groups match, but the CH is different: {WORD[counts['iso']].lower()} signals.")],
        key_val(counts, 1), "neo",
        "Only a molecule whose every H is swapped into every other by symmetry gives one signal.",
        prov("rule 2, H classes from RDKit canonical ranks with ties unbroken", sec),
        structure("CCCC", "butane", "C₅ and C₄ alkanes"),
        tiles={"neo": tile(opts["neo"], "2,2-dimethylpropane"), "but": tile(opts["but"], "butane"), "iso": tile(opts["iso"], "2-methylpropane")},
        concepts=NMR_C)

    eth = "CCOCC"
    if sorted(len(v) for v in h_classes(eth).values()) != [4, 6]:
        fail("u6-hnmr-ratio-ether: the copy says six H on the CH3 groups and four on the CH2 groups")
    mcq(node, "u6-hnmr-ratio-ether", "Pick the integration ratio of ethoxyethane's two signals.",
        [("r", "3 : 2", "Two CH₃ groups give six H, two CH₂ groups give four. Six to four is 3 : 2."),
         ("e", "1 : 1", "1 : 1 would need the same number of H in each set. Here the two CH₃ groups hold six H and the two CH₂ groups hold four."),
         ("t", "3 : 1", "That compares one CH₃ with one CH₂ H. Count every H in each set.")],
        key_val({"r": "3 : 2", "e": "1 : 1", "t": "3 : 1"}, ratio(eth)), "r",
        "Integration is proportional to the number of H in each set, so count all of them and reduce.",
        prov("rule 3, H per class from RDKit canonical ranks, reduced", sec),
        structure(eth, "ethoxyethane"), level=1, concepts=NMR_C)

    mtbe = "COC(C)(C)C"
    mcq(node, "u6-hnmr-ratio-mtbe", "Pick the integration ratio of 2-methoxy-2-methylpropane.",
        [("r", "3 : 1", "Nine H on the three matching CH₃ groups, three on the OCH₃. Nine to three is 3 : 1."),
         ("e", "1 : 1", "Each signal is a CH₃ type, but one stands for three CH₃ groups at once."),
         ("f", "4 : 1", "That counts four CH₃ groups against one. Three CH₃ match each other; the OCH₃ is the fourth.")],
        key_val({"r": "3 : 1", "e": "1 : 1", "f": "4 : 1"}, ratio(mtbe)), "r",
        "A tert-butyl group is nine equivalent H, a large singlet that is easy to spot.",
        prov("rule 3, H per class from RDKit canonical ranks, reduced", sec),
        structure(mtbe, "2-methoxy-2-methylpropane"), concepts=NMR_C)

    # Close-behind item in the 23 Oct audit: the everyday ethyl triplet and
    # quartet come first, so the septet and sextet are not the first splittings.
    cle = "CCCl"
    mcq(node, "u6-hnmr-triplet", "Pick the splitting of the circled CH₃ in chloroethane.",
        [("3", "Triplet", "Two H on the CH₂Cl next door: two plus one, three lines."),
         ("4", "Quartet", "That counts the CH₃'s own three H. H in the same set do not split each other; count the H on the carbon next door."),
         ("2", "Doublet", "That counts one neighbour H. The CH₂Cl next door carries two.")],
        key_val({"3": "Triplet", "4": "Quartet", "2": "Doublet"}, split(cle, 0)), "3",
        "A signal splits into n + 1 lines, n being the H on neighbouring carbons. An ethyl CH₃ sees the two H of its CH₂: a triplet.",
        prov("rule 3, n counted on bonded carbons", sec, N1),
        structure(cle, "chloroethane", "chloroethane, CH₃ circled", marks=[0]),
        brief="Count the H on the neighbouring carbons, then add one.", concepts=NMR_C, convention=N1)

    mcq(node, "u6-hnmr-quartet", "Pick the splitting of the circled CH₂ in chloroethane.",
        [("4", "Quartet", "Three H on the CH₃ next door: three plus one, four lines. The Cl carries no H."),
         ("3", "Triplet", "That counts the CH₂'s own two H. Its neighbour is the CH₃, which has three."),
         ("6", "Sextet", "That adds this CH₂'s own two H to the CH₃'s three. H in the same set do not split each other.")],
        key_val({"4": "Quartet", "3": "Triplet", "6": "Sextet"}, split(cle, 1)), "4",
        "An ethyl CH₂ sees the three H of its CH₃, so it is a quartet. A 3H triplet beside a 2H quartet is an ethyl group.",
        prov("rule 3, n counted on bonded carbons", sec, N1),
        structure(cle, "chloroethane", "chloroethane, CH₂ circled", marks=[1]), concepts=NMR_C, convention=N1)

    ipc = "CC(Cl)C"
    mcq(node, "u6-hnmr-septet", "Pick the splitting of the circled CH in 2-chloropropane.",
        [("7", "Septet", "Six H on the two CH₃ neighbours: six plus one, a septet."),
         ("2", "Doublet", "That is the CH₃ signal, split by the one CH. The CH itself sees six H."),
         ("4", "Quartet", "That counts one CH₃. Both CH₃ groups are bonded to the CH, six H in all.")],
        key_val({"7": "Septet", "2": "Doublet", "4": "Quartet"}, split(ipc, 1)), "7",
        "A signal splits into n + 1 lines, n being the H on neighbouring carbons. An isopropyl CH is a septet.",
        prov("rule 3, n counted on bonded carbons", sec, N1),
        structure(ipc, "2-chloropropane", "2-chloropropane, CH circled", marks=[1]), level=2, concepts=NMR_C, convention=N1)

    npc = "CCCCl"
    mcq(node, "u6-hnmr-sextet", "Pick the splitting of the circled CH₂ in 1-chloropropane.",
        [("6", "Sextet", "Three H on the CH₃ and two on the CH₂Cl: five neighbours, six lines."),
         ("4", "Quartet", "That counts only the CH₃ side. The CH₂Cl on the other side adds two more H."),
         ("3", "Triplet", "That counts only the CH₂Cl side. The CH₃ next door adds three more H.")],
        key_val({"6": "Sextet", "4": "Quartet", "3": "Triplet"}, split(npc, 1)), "6",
        "Neighbours on both sides add up under the n + 1 rule when the couplings are similar.",
        prov("rule 3, n counted on bonded carbons", sec, N1),
        structure(npc, "1-chloropropane", "1-chloropropane, middle CH₂ circled", marks=[1]), level=2, concepts=NMR_C, convention=N1)

    ea = "CC(=O)OCC"
    if h_on(ea, 1) != 0 or [a.GetIdx() for a in mol(ea).GetAtomWithIdx(0).GetNeighbors()] != [1]:
        fail("u6-hnmr-singlet: the copy says the CH3's only neighbour is a C=O carbon with no H")
    mcq(node, "u6-hnmr-singlet", "Pick the splitting of the circled CH₃ in ethyl acetate.",
        [("1", "Singlet", "Its only neighbour is the C=O carbon, which has no H. Zero neighbours, one line."),
         ("3", "Triplet", "A triplet needs two H next door. The carbonyl carbon beside this CH₃ has none."),
         ("4", "Quartet", "The ethyl CH₂ is across the ester O, too far to split this CH₃.")],
        key_val({"1": "Singlet", "3": "Triplet", "4": "Quartet"}, split(ea, 0)), "1",
        "This CH₃'s only neighbour is the ester C=O carbon, which has no H, so it is a singlet.",
        prov("rule 3, n counted on bonded carbons", sec, N1),
        structure(ea, "ethyl acetate", "ethyl acetate, acetyl CH₃ circled", marks=[0]), concepts=NMR_C, convention=N1)


# ---------------------------------------------------------------------------
# u6-cnmr: carbon count, symmetry, DEPT
# ---------------------------------------------------------------------------

def node_cnmr() -> None:
    node = "u6-cnmr"
    sec = S_NMR
    pk = "CCC(=O)CC"
    mcq(node, "u6-cnmr-meet-count", "Pick how many ¹³C NMR signals pentan-3-one gives.",
        [("3", "Three", "The C=O carbon, the two matching CH₂ carbons, the two matching CH₃ carbons: three."),
         ("5", "Five", "Five carbons, but the mirror through the C=O makes the two ethyl groups one environment."),
         ("2", "Two", "The C=O carbon has no H but still gives a ¹³C signal. Every carbon environment counts.")],
        key_val({"3": 3, "5": 5, "2": 2}, c_signals(pk)), "3",
        "One ¹³C signal per carbon environment, quaternary and C=O carbons included.",
        prov("rule 2, carbon classes from RDKit canonical ranks with ties unbroken", sec),
        structure(pk, "pentan-3-one"), brief="Count the carbon environments. Carbons with no H still give a signal.",
        level=0, concepts=NMR_C)

    px = "Cc1ccc(C)cc1"
    mcq(node, "u6-cnmr-xylene", "Pick how many ¹³C NMR signals 1,4-dimethylbenzene gives.",
        [("3", "Three", "The CH₃ carbons, the two ring carbons that hold CH₃, and the four ring CH: three environments."),
         ("2", "Two", "That matches the ¹H count. In ¹³C the ring carbons that carry CH₃ show up as their own signal."),
         ("8", "Eight", "Eight carbons, but symmetry folds them into a few environments.")],
        key_val({"3": 3, "2": 2, "8": 8}, c_signals(px)), "3",
        "Ring carbons bearing a substituent have no H, yet they still give a ¹³C signal.",
        prov("rule 2, carbon classes from RDKit canonical ranks with ties unbroken", sec),
        structure(px, "1,4-dimethylbenzene"), concepts=NMR_C)

    tol = "Cc1ccccc1"
    mcq(node, "u6-cnmr-toluene", "Pick how many ¹³C NMR signals methylbenzene gives.",
        [("5", "Five", "CH₃, the ring carbon holding it, then the ortho, meta and para ring carbons: five."),
         ("7", "Seven", "Seven carbons, but the mirror through CH₃ and the para carbon pairs ortho with ortho and meta with meta."),
         ("4", "Four", "The ring carbon bonded to CH₃ has no H, and it still gives its own ¹³C signal.")],
        key_val({"5": 5, "7": 7, "4": 4}, c_signals(tol)), "5",
        "A monosubstituted benzene gives four ring carbon signals: ipso, ortho, meta, para.",
        prov("rule 2, carbon classes from RDKit canonical ranks with ties unbroken", sec),
        structure(tol, "methylbenzene"), level=2, concepts=NMR_C)

    opts = {"p": "Cc1ccc(C)cc1", "o": "Cc1ccccc1C", "m": "Cc1cccc(C)c1"}
    counts = {k: c_signals(s) for k, s in opts.items()}
    mcq(node, "u6-cnmr-isomer", "Pick the dimethylbenzene that gives three ¹³C signals.",
        [("p", "1,4-Dimethylbenzene", "Para is the most symmetric: CH₃, C-CH₃ and CH, three signals."),
         ("o", "1,2-Dimethylbenzene", f"Ortho has a single mirror: {WORD[counts['o']].lower()} signals."),
         ("m", "1,3-Dimethylbenzene", f"Meta has a single mirror through C2 and C5: {WORD[counts['m']].lower()} signals.")],
        key_val(counts, 3), "p",
        "Isomers with one formula can differ in ¹³C signal count. Symmetry is what tells them apart.",
        prov("rule 2, carbon classes from RDKit canonical ranks with ties unbroken", sec),
        formula_visual("Cc1ccc(C)cc1", "three isomers share this formula"),
        tiles={"p": tile(opts["p"], "1,4-dimethylbenzene"), "o": tile(opts["o"], "1,2-dimethylbenzene"), "m": tile(opts["m"], "1,3-dimethylbenzene")},
        concepts=NMR_C)

    neo = "CC(C)(C)C"
    mcq(node, "u6-cnmr-neopentane", "Pick how many ¹³C NMR signals 2,2-dimethylpropane gives.",
        [("2", "Two", "Four matching CH₃ carbons and the central carbon: two signals."),
         ("1", "One", "That is the ¹H count. The central carbon has no H but still gives a ¹³C signal."),
         ("5", "Five", "Five carbons, but the four CH₃ groups are swapped into one another by symmetry.")],
        key_val({"2": 2, "1": 1, "5": 5}, c_signals(neo)), "2",
        "¹H and ¹³C counts can differ: a quaternary carbon shows only in ¹³C.",
        prov("rule 2, carbon classes from RDKit canonical ranks with ties unbroken", sec),
        structure(neo, "2,2-dimethylpropane"), concepts=NMR_C)

    bk = "CC(=O)CC"
    mcq(node, "u6-cnmr-dept135", "In DEPT-135, pick how the circled carbon's signal appears.",
        [("down", "Points down", "The circled carbon is a CH₂. DEPT-135 turns CH₂ signals upside down."),
         ("up", "Points up", "Up is for CH and CH₃. This carbon carries two H."),
         ("gone", "Absent", "Only carbons with no H vanish in DEPT. This one has two.")],
        key_val({"down": "Points down", "up": "Points up", "gone": "Absent"}, dept135(bk, 3)), "down",
        "DEPT-135 sorts carbons by H count: CH and CH₃ up, CH₂ down, no-H carbons gone.",
        prov("rule 4, H count on the circled carbon", sec, DEPT),
        structure(bk, "butan-2-one", "butan-2-one, CH₂ circled", marks=[3]), concepts=NMR_C, convention=DEPT)

    opts = {"ipa": "CC(C)O", "et": "CCO", "tba": "CC(C)(C)O"}
    hits = [k for k, s in opts.items() if has_ch(s)]
    mcq(node, "u6-cnmr-dept90", "Pick the compound that shows a peak in DEPT-90.",
        [("ipa", "Propan-2-ol", "Its middle carbon is a CH, the only kind DEPT-90 shows."),
         ("et", "Ethanol", "A CH₃ and a CH₂, no CH. DEPT-90 shows nothing."),
         ("tba", "2-Methylpropan-2-ol", "CH₃ carbons and a carbon with no H. Neither appears in DEPT-90.")],
        hits[0] if len(hits) == 1 else None, "ipa",
        "DEPT-90 shows CH carbons only, so it picks out every C bonded to exactly one H.",
        prov("rule 4, H count on each carbon", sec, DEPT),
        cue_visual("DEPT-90", "the experiment"),
        tiles={"ipa": tile(opts["ipa"], "propan-2-ol"), "et": tile(opts["et"], "ethanol"), "tba": tile(opts["tba"], "2-methylpropan-2-ol")},
        level=2, concepts=NMR_C, convention=DEPT)

    tbb = "CC(C)(C)c1ccccc1"
    mcq(node, "u6-cnmr-quaternary", "Pick how many of tert-butylbenzene's ¹³C signals vanish in DEPT-135.",
        [("2", "Two", "The central C of the tert-butyl group and the ring carbon it is bonded to: both have no H."),
         ("1", "One", "The ring carbon holding the tert-butyl group has no H either, so it vanishes too."),
         ("0", "Zero", "Carbons with no H give no DEPT signal, and this molecule has two kinds.")],
        key_val({"2": 2, "1": 1, "0": 0}, quaternary_classes(tbb)), "2",
        "Compare the full ¹³C spectrum with DEPT-135: whatever disappears is a carbon with no H.",
        prov("rule 4, carbon classes with no H", sec, DEPT),
        structure(tbb, "tert-butylbenzene"), concepts=NMR_C, convention=DEPT)


# ---------------------------------------------------------------------------
# u6-ms: molecular ion and isotope clusters
# ---------------------------------------------------------------------------

def node_ms() -> None:
    node = "u6-ms"
    sec = S_MS
    bk = "CC(=O)CC"
    m = m_plus(bk)
    mcq(node, "u6-ms-meet-mplus", "Pick the m/z of butan-2-one's molecular ion.",
        [("m", f"m/z {m}", f"C₄H₈O with the most common isotopes, ¹²C, ¹H and ¹⁶O, weighs {m}."),
         ("m1", f"m/z {m - 1}", "That ion has lost an H. The molecular ion is the whole molecule minus one electron."),
         ("p1", f"m/z {m + 1}", "That is the small M+1 peak, from molecules holding one ¹³C.")],
        key_val({"m": m, "m1": m - 1, "p1": m + 1}, m_plus(bk)), "m",
        "The molecular ion is the intact molecule with one electron removed, so its m/z is the molecular mass.",
        prov("rule 5, lightest-isotope peak of the computed cluster, checked against RDKit's monoisotopic mass", sec),
        structure(bk, "butan-2-one"), brief="Mass with the most common isotope of each element.", level=0, concepts=MS_C)

    brp = "CCCBr"
    pats = ("M and M+2 nearly equal", "M+2 about a third of M", "M+2 small or missing")
    mcq(node, "u6-ms-br", "Pick the molecular ion pattern of 1-bromopropane.",
        [("eq", pats[0], f"⁷⁹Br and ⁸¹Br are near half and half, so M+2 is {round(rel(brp, 2))} percent of M."),
         ("third", pats[1], "That is chlorine's pattern, from ³⁵Cl and ³⁷Cl at about three to one."),
         ("none", pats[2], "Bromine has two common isotopes two mass units apart, so M+2 is large.")],
        key_val({"eq": pats[0], "third": pats[1], "none": pats[2]}, m2_pattern(brp)), "eq",
        "One Br gives two molecular ion peaks two units apart, nearly the same height.",
        prov("rule 5, isotope cluster from RDKit abundances", sec),
        structure(brp, "1-bromopropane"), concepts=MS_C)

    cle = "CCCl"
    mcq(node, "u6-ms-cl", "Pick the molecular ion pattern of chloroethane.",
        [("third", pats[1], f"³⁵Cl is about three quarters of chlorine and ³⁷Cl a quarter, so M+2 is {round(rel(cle, 2))} percent of M."),
         ("eq", pats[0], "That is bromine's pattern. Chlorine's heavy isotope is the minor one."),
         ("none", pats[2], "Chlorine has a common heavy isotope two units up, so M+2 is clear.")],
        key_val({"eq": pats[0], "third": pats[1], "none": pats[2]}, m2_pattern(cle)), "third",
        "One Cl gives an M+2 peak about a third the height of M.",
        prov("rule 5, isotope cluster from RDKit abundances", sec),
        structure(cle, "chloroethane"), concepts=MS_C)

    opts = {"br": "Brc1ccccc1", "cl": "Clc1ccccc1", "i": "Ic1ccccc1", "f": "Fc1ccccc1"}
    mcq(node, "u6-ms-which-br", "Pick the compound whose M and M+2 peaks are nearly equal.",
        [("br", "Bromobenzene", "Bromine's two isotopes, 79 and 81, are near half and half."),
         ("cl", "Chlorobenzene", f"Chlorine gives M+2 at about a third of M ({round(rel(opts['cl'], 2))} percent)."),
         ("i", "Iodobenzene", "Iodine has one natural isotope, ¹²⁷I, so it adds no M+2 peak."),
         ("f", "Fluorobenzene", "Fluorine has one natural isotope, ¹⁹F, so it adds no M+2 peak.")],
        key_val({k: m2_pattern(s) for k, s in opts.items()}, pats[0]), "br",
        "An M+2 nearly as tall as M is the signature of one bromine.",
        prov("rule 5, isotope cluster from RDKit abundances", sec),
        cue_visual("M and M+2", "the molecular ion cluster"),
        tiles={"br": tile(opts["br"], "bromobenzene"), "cl": tile(opts["cl"], "chlorobenzene"), "i": tile(opts["i"], "iodobenzene"), "f": tile(opts["f"], "fluorobenzene")},
        level=2, concepts=MS_C)

    opts = {"amine": "CCCN", "ol": "CCCO", "bu": "CCCC"}
    masses = {k: m_plus(s) for k, s in opts.items()}
    odd = [k for k, v in masses.items() if v % 2]
    mcq(node, "u6-ms-nitrogen", "Pick the compound whose molecular ion has an odd m/z.",
        [("amine", "Propan-1-amine", f"One N makes the mass odd: m/z {masses['amine']}. Odd molecular ion, odd number of N."),
         ("ol", "Propan-1-ol", f"No N: m/z {masses['ol']}, even. Oxygen keeps the mass even."),
         ("bu", "Butane", f"No N: m/z {masses['bu']}, even, like every hydrocarbon.")],
        odd[0] if len(odd) == 1 else None, "amine",
        "The nitrogen rule: an odd molecular ion means an odd number of nitrogens.",
        prov("rule 5, nominal masses computed; the nitrogen rule is read off them", sec),
        cue_visual("odd m/z", "the molecular ion"),
        tiles={"amine": tile(opts["amine"], "propan-1-amine"), "ol": tile(opts["ol"], "propan-1-ol"), "bu": tile(opts["bu"], "butane")},
        concepts=MS_C)

    opts = {"dec": "CCCCCCCCCC", "hex": "CCCCCC", "but": "CCCC"}
    m1 = {k: rel(s, 1) for k, s in opts.items()}
    mcq(node, "u6-ms-m1", "Pick the compound with the tallest M+1 peak compared with M.",
        [("dec", "Decane", f"Ten carbons, ten chances to hold a ¹³C: M+1 is {round(m1['dec'])} percent of M."),
         ("hex", "Hexane", f"Six carbons: M+1 is {round(m1['hex'])} percent of M, less than decane's."),
         ("but", "Butane", f"Four carbons: M+1 is only {round(m1['but'])} percent of M.")],
        key_max(m1), "dec",
        "Each carbon has about a one percent chance of being ¹³C, so M+1 grows with the carbon count.",
        prov("rule 5, isotope cluster from RDKit abundances", sec),
        cue_visual("M+1 : M", "the peak height to compare"),
        tiles={"dec": tile(opts["dec"], "decane"), "hex": tile(opts["hex"], "hexane"), "but": tile(opts["but"], "butane")},
        level=2, concepts=MS_C)

    meb = "CBr"
    lo = m_plus(meb)
    mcq(node, "u6-ms-mebr", "Pick the two tallest molecular ion peaks of bromomethane.",
        [("r", f"m/z {lo} and {lo + 2}", "CH₃⁷⁹Br and CH₃⁸¹Br, two units apart and nearly equal."),
         ("one", f"m/z {lo} and {lo + 1}", f"M+1 from ¹³C is small with one carbon. The partner peak is ⁸¹Br, at {lo + 2}."),
         ("hi", f"m/z {lo + 1} and {lo + 3}", "Those are the small ¹³C peaks beside each bromine peak.")],
        key_val({"r": f"m/z {lo} and {lo + 2}", "one": f"m/z {lo} and {lo + 1}", "hi": f"m/z {lo + 1} and {lo + 3}"}, two_tallest(meb)), "r",
        "A bromine compound shows its molecular ion twice, two mass units apart.",
        prov("rule 5, isotope cluster from RDKit abundances", sec),
        structure(meb, "bromomethane"), concepts=MS_C)

    dcm, mcl, dbm = "ClCCl", "CCl", "BrCBr"
    texts = {"cl2": cluster_text(dcm), "cl1": cluster_text(mcl), "br2": cluster_text(dbm)}
    mcq(node, "u6-ms-cl2", "Pick the molecular ion cluster of dichloromethane.",
        [("cl2", texts["cl2"], "Two Cl: each can be 35 or 37, so M, M+2 and M+4 appear, falling off as more ³⁷Cl is needed."),
         ("cl1", texts["cl1"], "That is one Cl. With two, a molecule can hold two ³⁷Cl, which gives M+4."),
         ("br2", texts["br2"], "That is two Br. Chlorine's heavy isotope is the minor one, so M stays tallest.")],
        key_val(texts, cluster_text(dcm)), "cl2",
        "Each extra Cl or Br adds a peak two units higher. Their heights follow the isotope abundances.",
        prov("rule 5, isotope clusters of CH2Cl2, CH3Cl and CH2Br2 from RDKit abundances", sec),
        structure(dcm, "dichloromethane"), level=2, concepts=MS_C)


# ---------------------------------------------------------------------------
# u6-2d: COSY, HSQC, HMBC as bond counts
# ---------------------------------------------------------------------------

def node_2d() -> None:
    node = "u6-2d"
    sec = S_NMR
    npc = "CCCCl"
    partners = cosy_partners(npc, 0)
    mcq(node, "u6-2d-meet-cosy", "In COSY, pick the signal the circled CH₃ shows a cross peak with.",
        [("mid", "The middle CH₂", "Its H sit on the carbon bonded to the CH₃ carbon: H-C-C-H, three bonds."),
         ("cl", "The CH₂ bonded to Cl", "Those H are four bonds from the CH₃ H. COSY shows H on neighbouring carbons."),
         ("none", "No other signal", "The CH₃ is split by the middle CH₂, and whatever splits a signal shows in COSY.")],
        "mid" if partners == {1} else "cl" if partners == {2} else "none" if not partners else None, "mid",
        "COSY pairs H that couple, which for a chain means H on bonded carbons.",
        prov("rule 6, H classes on bonded carbons", sec, COSY),
        structure(npc, "1-chloropropane", "1-chloropropane, CH₃ circled", marks=[0]),
        brief="COSY shows which H are on neighbouring carbons.", level=0, concepts=NMR_C, convention=COSY)

    ea = "CC(=O)OCC"
    lonely = [c for c, k in ((0, "ac"), (4, "och2"), (5, "me")) if not cosy_partners(ea, c)]
    mcq(node, "u6-2d-cosy-none", "In ethyl acetate's COSY, pick the signal with no cross peak.",
        [("ac", "The CH₃ on the C=O", "Its neighbour is the C=O carbon, which has no H, so nothing couples to it."),
         ("och2", "The OCH₂", "The OCH₂ H sit next to the ethyl CH₃, so those two share a cross peak."),
         ("me", "The ethyl CH₃", "The ethyl CH₃ couples to the OCH₂ beside it.")],
        {0: "ac", 4: "och2", 5: "me"}.get(lonely[0]) if len(lonely) == 1 else None, "ac",
        "A singlet in ¹H has no partner in COSY.",
        prov("rule 6, H classes on bonded carbons", sec, COSY),
        structure(ea, "ethyl acetate"), concepts=NMR_C, convention=COSY)

    mcq(node, "u6-2d-cosy-count", "Pick how many COSY cross-peak pairs 1-chloropropane shows.",
        [("2", "Two", "CH₃ with the middle CH₂, and the middle CH₂ with the CH₂Cl. The two ends are too far apart."),
         ("3", "Three", "That pairs the CH₃ with the CH₂Cl. They are four bonds apart, not neighbours."),
         ("1", "One", "The middle CH₂ couples to both ends, so it makes two pairs.")],
        key_val({"2": 2, "3": 3, "1": 1}, cosy_pairs(npc)), "2",
        "Walk the chain: each bond between two H-bearing carbons gives one COSY pair.",
        prov("rule 6, distinct pairs of H classes on bonded carbons", sec, COSY),
        structure(npc, "1-chloropropane"), level=2, concepts=NMR_C, convention=COSY)

    bk = "CC(=O)CC"
    mcq(node, "u6-2d-hsqc-count", "Pick how many HSQC cross peaks butan-2-one shows.",
        [("3", "Three", "Each H-bearing carbon environment, two CH₃ and one CH₂, gives one HSQC peak."),
         ("4", "Four", "The C=O carbon has no H, so it cannot show in HSQC."),
         ("2", "Two", "The two CH₃ groups differ, so they give separate HSQC peaks.")],
        key_val({"3": 3, "4": 4, "2": 2}, hsqc_peaks(bk)), "3",
        "HSQC links each H to the carbon it sits on, so carbons without H are missing.",
        prov("rule 6, carbon classes bearing H", sec, HSQC),
        structure(bk, "butan-2-one"), concepts=NMR_C, convention=HSQC)

    no_h = [c for c in (1, 0, 3) if h_on(bk, c) == 0]
    mcq(node, "u6-2d-hsqc-none", "In butan-2-one's HSQC, pick the carbon with no cross peak.",
        [("co", "The C=O carbon", "It carries no H, and HSQC only links H to the carbon they sit on."),
         ("ch2", "The CH₂ carbon", "Two H sit on this carbon, so it shows a cross peak."),
         ("me", "The CH₃ on the C=O", "Three H sit on this carbon, so it shows a cross peak.")],
        {1: "co", 3: "ch2", 0: "me"}.get(no_h[0]) if len(no_h) == 1 else None, "co",
        "A carbon with no H is invisible in HSQC; HMBC is how it gets assigned.",
        prov("rule 6, H count on each carbon", sec, HSQC),
        structure(bk, "butan-2-one"), concepts=NMR_C, convention=HSQC)

    reach = hmbc_targets(bk, 0)
    far = [k for k, c in (("far", 4), ("co", 1), ("ch2", 3)) if c not in reach]
    mcq(node, "u6-2d-hmbc", "The circled CH₃'s H: pick the carbon they show no HMBC peak to.",
        [("far", "The far CH₃ carbon", "It is four bonds from these H, past HMBC's two-to-three-bond reach."),
         ("co", "The C=O carbon", "Two bonds from these H, so HMBC links them. This is how a C=O gets placed."),
         ("ch2", "The CH₂ carbon", "Three bonds from these H, H-C-C-C, so HMBC shows it.")],
        far[0] if len(far) == 1 else None, "far",
        "HMBC reaches two or three bonds from an H, which is how it connects pieces across a C=O.",
        prov("rule 6, graph distance from the H-bearing carbon", sec, HMBC),
        structure(bk, "butan-2-one", "butan-2-one, CH₃ on C=O circled", marks=[0]), level=2, concepts=NMR_C, convention=HMBC)


# ---------------------------------------------------------------------------
# u6-uv: conjugation length, no lambda max numbers
# ---------------------------------------------------------------------------

def node_uv() -> None:
    node = "u6-uv"
    sec = S_UV
    opts = {"tri": "C=CC=CC=C", "di": "C=CC=C", "ene": "C=C"}
    conj = {k: conjugated_pi(s) for k, s in opts.items()}
    mcq(node, "u6-uv-meet", "Pick the compound with the longest-wavelength UV absorption.",
        [("tri", "Hexa-1,3,5-triene", "Three conjugated C=C: the smallest HOMO-LUMO gap of the three, so the longest wavelength."),
         ("di", "Buta-1,3-diene", "Two conjugated C=C. One more conjugated pi bond would shrink the gap further."),
         ("ene", "Ethene", "One C=C, the largest gap here, so the shortest wavelength.")],
        key_max(conj), "tri",
        "Each pi bond added to a conjugated system narrows the HOMO-LUMO gap and moves the absorption to longer wavelength.",
        prov("rule 7, pi bonds in the largest conjugated system", sec, LAMBDA),
        cue_visual("λ_{max}", "longest wavelength", size=20),
        tiles={"tri": tile(opts["tri"], "hexa-1,3,5-triene"), "di": tile(opts["di"], "buta-1,3-diene"), "ene": tile(opts["ene"], "ethene")},
        brief="Longer conjugation, smaller gap, longer wavelength.", level=0, concepts=UV_C, convention=LAMBDA)

    opts = {"13": "C=CC=CC", "14": "C=CCC=C", "15": "C=CCCC=C"}
    if any(pi_count(s, "C", "C") != 2 for s in opts.values()):
        fail("u6-uv-conj-diene: the caption says two C=C in every option")
    conjd = [k for k, s in opts.items() if conjugated_pi(s) == 2]
    mcq(node, "u6-uv-conj-diene", "Pick the conjugated diene.",
        [("13", "Penta-1,3-diene", "The two C=C are joined by one single bond, so their p orbitals overlap in one system."),
         ("14", "Penta-1,4-diene", "A CH₂ sits between the two C=C. Its sp³ carbon breaks the overlap: two isolated alkenes."),
         ("15", "Hexa-1,5-diene", "Two CH₂ groups separate the C=C. Isolated, not conjugated.")],
        conjd[0] if len(conjd) == 1 else None, "13",
        "Conjugated pi bonds alternate with single bonds. One sp³ carbon in between isolates them.",
        prov("rule 7, RDKit conjugation flags on the single bonds", sec),
        cue_visual("C=C and C=C", "two C=C in every option"),
        tiles={"13": tile(opts["13"], "penta-1,3-diene"), "14": tile(opts["14"], "penta-1,4-diene"), "15": tile(opts["15"], "hexa-1,5-diene")},
        concepts=UV_C)

    opts = {"13": "C1=CC=CCC1", "14": "C1=CCC=CC1", "ene": "C1=CCCCC1"}
    conj = {k: conjugated_pi(s) for k, s in opts.items()}
    mcq(node, "u6-uv-ring", "Pick the ring compound that absorbs at the longest UV wavelength.",
        [("13", "Cyclohexa-1,3-diene", "Its two C=C are conjugated, one system of four p orbitals."),
         ("14", "Cyclohexa-1,4-diene", "Two C=C, but CH₂ groups separate them. Each absorbs like a lone alkene."),
         ("ene", "Cyclohexene", "One C=C, nothing to conjugate with.")],
        key_max(conj), "13",
        "Counting C=C is not enough. Only pi bonds in one conjugated system lengthen the wavelength.",
        prov("rule 7, pi bonds in the largest conjugated system", sec, LAMBDA),
        cue_visual("λ_{max}", "six-membered rings", size=20),
        tiles={"13": tile(opts["13"], "cyclohexa-1,3-diene"), "14": tile(opts["14"], "cyclohexa-1,4-diene"), "ene": tile(opts["ene"], "cyclohexene")},
        concepts=UV_C, convention=LAMBDA)

    opts = {"conj": "C=CC(C)=O", "one": "C=CCC(C)=O", "two": "C=CCCC(C)=O"}
    if any((pi_count(s, "C", "C"), pi_count(s, "C", "O")) != (1, 1) for s in opts.values()):
        fail("u6-uv-enone: the caption says one C=C and one C=O in every option")
    conjd = [k for k, s in opts.items() if conjugated_pi(s) == 2]
    mcq(node, "u6-uv-enone", "Pick the compound whose C=C and C=O are conjugated.",
        [("conj", "But-3-en-2-one", "The C=C and C=O are joined by one single bond: one conjugated system."),
         ("one", "Pent-4-en-2-one", "A CH₂ separates the C=C from the C=O, so they are isolated."),
         ("two", "Hex-5-en-2-one", "Two CH₂ groups separate them. Not conjugated.")],
        conjd[0] if len(conjd) == 1 else None, "conj",
        "A C=O conjugates like a C=C does, when only one single bond separates it from the next pi bond.",
        prov("rule 7, RDKit conjugation flags on the single bonds", sec),
        cue_visual("C=C and C=O", "one of each in every option"),
        tiles={"conj": tile(opts["conj"], "but-3-en-2-one"), "one": tile(opts["one"], "pent-4-en-2-one"), "two": tile(opts["two"], "hex-5-en-2-one")},
        level=2, concepts=UV_C)

    oct_ = "C=CC=CCCC=C"
    mcq(node, "u6-uv-count", "Pick how many π bonds share one conjugated system in octa-1,3,7-triene.",
        [("2", "Two", "C1=C2 and C3=C4 are conjugated. The C7=C8 bond sits past two CH₂ groups, on its own."),
         ("3", "Three", "Three C=C, but the last one is cut off by sp³ carbons."),
         ("1", "One", "C1=C2 and C3=C4 are separated by one single bond, so they do conjugate.")],
        key_val({"2": 2, "3": 3, "1": 1}, conjugated_pi(oct_)), "2",
        "Count only the pi bonds you can reach through alternating single bonds.",
        prov("rule 7, pi bonds in the largest conjugated system", sec),
        structure(oct_, "octa-1,3,7-triene"), concepts=UV_C)

    opts = {"14": "C=CCC=C", "13": "C=CC=C", "enone": "C=CC(C)=O"}
    if any(pi_count(s) != 2 for s in opts.values()):
        fail("u6-uv-not: the caption says two pi bonds in every option")
    iso = [k for k, s in opts.items() if conjugated_pi(s) < 2]
    mcq(node, "u6-uv-not", "Pick the compound that is not conjugated.",
        [("14", "Penta-1,4-diene", "The CH₂ between its two C=C breaks the overlap."),
         ("13", "Buta-1,3-diene", "C=C, single bond, C=C: the textbook conjugated diene."),
         ("enone", "But-3-en-2-one", "C=C, single bond, C=O: conjugated through the carbonyl.")],
        iso[0] if len(iso) == 1 else None, "14",
        "Look between the pi bonds: a single bond alone conjugates, an sp³ carbon isolates.",
        prov("rule 7, RDKit conjugation flags on the single bonds", sec),
        cue_visual("isolated", "two π bonds in every option"),
        tiles={"14": tile(opts["14"], "penta-1,4-diene"), "13": tile(opts["13"], "buta-1,3-diene"), "enone": tile(opts["enone"], "but-3-en-2-one")},
        concepts=UV_C)


# ---------------------------------------------------------------------------
# u6-ir: HELD for the owner's sign-off (audit 23 Oct, top-25 #9)
# ---------------------------------------------------------------------------
#
# Band positions are not derivable, so they are a cited table, like pKa. Every
# number below is quoted from OpenStax Organic Chemistry (CC BY-NC-SA), read
# 23 Oct 2026: section 12.8 (C=O 1670 to 1780, saturated ketone 1715; alcohol
# O-H 3400 to 3650; amine N-H 3300 to 3500) and section 20.8 (acid O-H very
# broad, 2500 to 3300; acid C=O near 1710; nitrile C≡N near 2250). Which
# groups a molecule has is RDKit substructure matching; the band each group
# gives is the cited table. These items are emitted as U6_IR_HELD, which no
# lesson, checkpoint or test-out reads, and u6-ir keeps no map link, so it
# still shows "Coming soon" until the owner signs off the numbers.

IR_SOURCE = ("IR band positions quoted from OpenStax Organic Chemistry ch. 12.8 and ch. 20.8 "
             "(CC BY-NC-SA), read 23 Oct 2026; held for the owner's sign-off")
IR_C = ("spectroscopy_ir",)
IR_GROUPS = {
    # band name: SMARTS for the group that gives it
    "acid O-H": "[CX3](=O)[OX2H1]",
    "alcohol O-H": "[OX2H1][CX4]",
    "N-H": "[NX3;H1,H2;!$(NC=O)]",
    "C=O": "[CX3]=[OX1]",
    "C≡N": "[CX2]#[NX1]",
}


def ir_bands(smi: str) -> frozenset[str]:
    m = mol(smi)
    return frozenset(b for b, sma in IR_GROUPS.items() if m.HasSubstructMatch(Chem.MolFromSmarts(sma)))


def ir_prov(what: str) -> str:
    return (f"{SCRIPT}: {what}. Band positions from OpenStax Organic Chemistry ch. 12 (sections 12.8 and 20.8, "
            "CC BY-NC-SA), read 23 Oct 2026. Held: the owner signs off the numbers before u6-ir goes live.")


def ir_items() -> None:
    node = "u6-ir"

    def key_bands(options: dict[str, str], want: set[str]) -> str | None:
        hits = [k for k, smi in options.items() if ir_bands(smi) == frozenset(want)]
        return hits[0] if len(hits) == 1 else None

    def tiles3(opts: dict[str, str], names: dict[str, str]) -> dict:
        return {k: tile(opts[k], names[k]) for k in opts}

    bk = "CC(=O)CC"
    bond_band = {"co": "C=O", "oh": "alcohol O-H", "cn": "C≡N"}
    present = [k for k, b in bond_band.items() if b in ir_bands(bk)]
    mcq(node, "u6-ir-meet", "Butan-2-one shows a strong, sharp band at 1715 cm⁻¹. Pick the bond behind it.",
        [("co", "C=O", "A saturated ketone's C=O stretches at 1715 cm⁻¹, inside the 1670 to 1780 carbonyl range."),
         ("oh", "O-H", "An alcohol O-H sits much higher, 3400 to 3650 cm⁻¹, and butan-2-one has no O-H."),
         ("cn", "C≡N", "A nitrile's C≡N is near 2250 cm⁻¹, and butan-2-one has no nitrogen.")],
        present[0] if len(present) == 1 else None, "co",
        "Each bond stretches in its own range. A strong, sharp band from 1670 to 1780 cm⁻¹ is a C=O.",
        ir_prov("carbonyl band, butan-2-one's groups by RDKit substructure match"),
        structure(bk, "butan-2-one"), brief="Each kind of bond absorbs in its own range of the IR spectrum.",
        level=0, concepts=IR_C, convention=IR_SOURCE)

    opts = {"one": "CCC(=O)CC", "ol": "CCCCCO", "acid": "CCCCC(=O)O"}
    mcq(node, "u6-ir-ketone", "A strong band at 1715 cm⁻¹ and no O-H band. Pick the compound.",
        [("one", "Pentan-3-one", "A C=O and nothing else: the 1715 band with an empty O-H region."),
         ("ol", "Pentan-1-ol", "An alcohol shows its O-H at 3400 to 3650 cm⁻¹ and has no C=O to give 1715."),
         ("acid", "Pentanoic acid", "An acid has the C=O, but also a very broad O-H from 2500 to 3300 cm⁻¹.")],
        key_bands(opts, {"C=O"}), "one",
        "Read the carbonyl range and the O-H range together: a C=O with no O-H is a ketone, an aldehyde or an ester.",
        ir_prov("each option's groups by RDKit substructure match, read against the cited bands"),
        cue_visual("1715 cm⁻¹", "the IR band"),
        tiles=tiles3(opts, {"one": "pentan-3-one", "ol": "pentan-1-ol", "acid": "pentanoic acid"}),
        concepts=IR_C, convention=IR_SOURCE)

    opts = {"ol": "CCCCO", "al": "CCCC=O", "ether": "CCOCC"}
    mcq(node, "u6-ir-alcohol", "A band at 3400 to 3650 cm⁻¹ and none from 1670 to 1780. Pick the compound.",
        [("ol", "Butan-1-ol", "The O-H gives the band at 3400 to 3650, and with no C=O the carbonyl range is empty."),
         ("al", "Butanal", "An aldehyde's C=O would fill the 1670 to 1780 range, and it has no O-H."),
         ("ether", "Ethoxyethane", "An ether has C-O bonds but no O-H, so nothing appears at 3400 to 3650.")],
        key_bands(opts, {"alcohol O-H"}), "ol",
        "3400 to 3650 cm⁻¹ is the alcohol O-H. An ether has the same O but no O-H, so it shows no band there.",
        ir_prov("each option's groups by RDKit substructure match, read against the cited bands"),
        cue_visual("3400-3650 cm⁻¹", "the IR band", size=13),
        tiles=tiles3(opts, {"ol": "butan-1-ol", "al": "butanal", "ether": "ethoxyethane"}),
        concepts=IR_C, convention=IR_SOURCE)

    opts = {"cn": "CCCC#N", "nh": "CCCCN", "one": "CCCC(C)=O"}
    hits = [k for k, smi in opts.items() if "C≡N" in ir_bands(smi)]
    mcq(node, "u6-ir-nitrile", "An intense band near 2250 cm⁻¹. Pick the compound.",
        [("cn", "Butanenitrile", "A saturated nitrile's C≡N gives an intense band near 2250 cm⁻¹."),
         ("nh", "Butan-1-amine", "An amine's N-H absorbs at 3300 to 3500 cm⁻¹, far above 2250."),
         ("one", "Pentan-2-one", "A ketone's C=O sits at 1715 cm⁻¹, not near 2250.")],
        hits[0] if len(hits) == 1 else None, "cn",
        "An intense band near 2250 cm⁻¹ is the C≡N of a nitrile.",
        ir_prov("each option's groups by RDKit substructure match, read against the cited bands"),
        cue_visual("2250 cm⁻¹", "the IR band"),
        tiles=tiles3(opts, {"cn": "butanenitrile", "nh": "butan-1-amine", "one": "pentan-2-one"}),
        concepts=IR_C, convention=IR_SOURCE)

    opts = {"acid": "CCCC(=O)O", "ol": "CCCCO", "ester": "CCOC(C)=O"}
    mcq(node, "u6-ir-acid", "A very broad band from 2500 to 3300 cm⁻¹, and one near 1710. Pick the compound.",
        [("acid", "Butanoic acid", "The carboxyl O-H gives the very broad band, and its C=O the one near 1710."),
         ("ol", "Butan-1-ol", "An alcohol's O-H sits at 3400 to 3650 cm⁻¹, and it has no C=O for the 1710 band."),
         ("ester", "Ethyl acetate", "An ester has the C=O but no O-H, so nothing broad appears from 2500 to 3300.")],
        key_bands(opts, {"acid O-H", "C=O"}), "acid",
        "Only a carboxylic acid has both: an O-H band so broad it runs down to 2500 cm⁻¹, and a C=O near 1710.",
        ir_prov("each option's groups by RDKit substructure match, read against the cited bands"),
        cue_visual("2500-3300 cm⁻¹", "the IR bands", size=13),
        tiles=tiles3(opts, {"acid": "butanoic acid", "ol": "butan-1-ol", "ester": "ethyl acetate"}),
        level=2, concepts=IR_C, convention=IR_SOURCE)

    sm, pr = "OC1CCCCC1", "O=C1CCCCC1"
    lost, gained = ir_bands(sm) - ir_bands(pr), ir_bands(pr) - ir_bands(sm)
    change = {"fwd": (frozenset({"alcohol O-H"}), frozenset({"C=O"})),
              "back": (frozenset({"C=O"}), frozenset({"alcohol O-H"})),
              "cn": (frozenset(), frozenset({"C≡N"}))}
    hits = [k for k, v in change.items() if v == (lost, gained)]
    mcq(node, "u6-ir-oxidation", "Cyclohexanol is oxidised to cyclohexanone. Pick the IR change that shows it.",
        [("fwd", "O-H band gone, a band at 1715 appears", "The O-H at 3400 to 3650 cm⁻¹ leaves with the alcohol, and the new C=O shows at 1715."),
         ("back", "1715 band gone, an O-H band appears", "That is the reverse, a ketone reduced to an alcohol."),
         ("cn", "A band near 2250 appears", "2250 cm⁻¹ is a C≡N. Oxidation adds no nitrogen.")],
        hits[0] if len(hits) == 1 else None, "fwd",
        "IR follows a reaction by the groups it makes and breaks: oxidising an alcohol to a ketone trades the O-H band for a C=O band.",
        ir_prov("starting material and product groups by RDKit substructure match, read against the cited bands"),
        pair(named(sm, "cyclohexanol"), named(pr, "cyclohexanone")),
        level=2, concepts=IR_C, convention=IR_SOURCE)


# ---------------------------------------------------------------------------
# u6-exam: match boards for the checkpoint (the split board now plays in u6-hnmr)
# ---------------------------------------------------------------------------

def exam_items() -> None:
    ipc, cle, mtbe = "CC(Cl)C", "CCCl", "COC(C)(C)C"
    pairs = [
        ("sept", "CH of 2-chloropropane", "septet", "Six H on the two CH₃ neighbours: seven lines.", split(ipc, 1).lower()),
        ("dbl", "CH₃ of 2-chloropropane", "doublet", "One H on the CH next door: two lines.", split(ipc, 0).lower()),
        ("trip", "CH₃ of chloroethane", "triplet", "Two H on the CH₂Cl next door: three lines.", split(cle, 0).lower()),
        ("quart", "CH₂ of chloroethane", "quartet", "Three H on the CH₃ next door: four lines.", split(cle, 1).lower()),
        ("sing", "OCH₃ of 2-methoxy-2-methylpropane", "singlet", "Across an O from a carbon with no H: no neighbours, one line.", split(mtbe, 0).lower()),
    ]
    # Audit 23 Oct, top-25 #14: the splitting board plays in u6-hnmr as its
    # connect step (the id keeps its u6-exam- prefix so saved progress still matches).
    match("u6-hnmr", "u6-exam-match-split", "Match each set of H to its splitting.",
          "Count the H on neighbouring carbons, then add one.", pairs,
          "The n + 1 rule: n H on neighbouring carbons split a signal into n + 1 lines.",
          prov("rule 3, n counted on bonded carbons", S_NMR, N1), NMR_C)

    mols = [("c2h6", "CC", "zero"), ("c2h4", "C=C", "one"), ("c2h2", "C#C", "two"), ("c6h8", "C1=CC=CCC1", "three"), ("c6h6", "c1ccccc1", "four")]
    why = {
        "c2h6": "Saturated: C₂ allows six H.",
        "c2h4": "Two H short of saturated: one pi bond.",
        "c2h2": "Four H short: a triple bond is two pi bonds.",
        "c6h8": "Six H short of C₆H₁₄: three rings or pi bonds.",
        "c6h6": "Eight H short: a ring and three C=C.",
    }
    pairs = [(k, pretty(s), w, why[k], WORD[dou(s)].lower()) for k, s, w in mols]
    match("u6-exam", "u6-exam-match-dou", "Match each formula to its degrees of unsaturation.",
          "Compare each H count with the saturated CₙH₂ₙ₊₂, then halve the gap.", pairs,
          "Every two H missing from the saturated formula is one ring or one pi bond.",
          prov("rule 1, formula count checked against rings plus pi bonds", S_DOU), DOU_C)


def build() -> None:
    check_isotope_table()
    node_dou()
    node_hnmr()
    node_cnmr()
    node_ms()
    node_2d()
    node_uv()
    ir_items()
    exam_items()
    check_names()
    for node, entries in POOLS.items():
        if node != "u6-exam" and not 6 <= len(entries) <= 12:
            fail(f"{node}: {len(entries)} items, outside 6 to 12")
    for slot in range(4):
        share = CORRECT_INDEX.count(slot) / max(1, len(CORRECT_INDEX))
        if share > 0.5:
            fail(f"{share:.0%} of MCQs put the answer in slot {slot}")


HEADER = '''/**
 * Unit 6 (spectroscopy and structure determination) problem pools, a DRAFT.
 * GENERATED by scripts/u6_pools.py. Do not edit by hand: edit the specs in the
 * script and rerun it.
 *
 * EVERY ENTRY IS A DRAFT (`placeholder: true`) for the owner's review, never
 * presented as done. Every number a student sees was counted or computed by
 * the script (degrees of unsaturation two ways, equivalence classes from
 * RDKit canonical ranks, n + 1 neighbour counts, graph distances for 2D NMR,
 * isotope clusters from RDKit's abundance table, conjugation from RDKit's
 * flags; every name read back by OPSIN), and the script refuses to write this
 * file when an authored key disagrees with what it derived. Where an answer
 * rests on a convention RDKit cannot check (first-order splitting, what DEPT
 * and the 2D experiments show, the conjugation and wavelength trend), the
 * entry's provenance says so. No chemical shift, IR band or lambda max value
 * appears in a played item: none of them is derivable here. The IR items
 * (U6_IR_HELD) quote cited band positions and are held, unplayed, for the
 * owner's sign-off.
 *
 * The splitting board (u6-exam-match-split) plays in u6-hnmr as its connect
 * step (audit 23 Oct, top-25 #14). U6_UNWIRED holds the one board still
 * unplayed, the degrees of unsaturation board, under `u6-exam`, which is not
 * a map node. No sort ladder is drafted: no SortCriterion names a
 * spectroscopy property.
 *
 * Match boards go through buildMatchBoard, the same adapter the shipped
 * boards use, so a bad board throws at import time.
 */
import type { McqVisual, NamedFigure } from "../../beats/mcq/mcqFigures";
import { buildMatchBoard } from "../../beats/match/spec";
import type { MatchBeat } from "../../beats/types";
import type { PoolEntry, UnitPools } from "../u1/types";
'''


def match_helper() -> str:
    """The match() helper, the same text content/u2/pools.ts carries."""
    src = (REPO / "src" / "game" / "content" / "u2" / "pools.ts").read_text(encoding="utf-8")
    start = src.index("function match(")
    end = src.index("\n}\n", start) + 3
    return "/** One match board as a pool entry. */\n" + src[start:end]


def ts(value) -> str:
    return json.dumps(value, ensure_ascii=False, indent=2)


def emit_table(name: str, nodes: list[str], doc: str) -> list[str]:
    out = [doc, f"export const {name}: UnitPools = {{"]
    for node in nodes:
        entries = POOLS[node]
        out.append(f"  {json.dumps(node)}: [")
        for e in entries:
            if e.get("__match__"):
                spec = {k: v for k, v in e.items() if k != "__match__"}
                out.append("    match(" + ts(spec).replace("\n", "\n    ") + "),")
            else:
                out.append("    " + ts(e).replace("\n", "\n    ") + ",")
        out.append("  ],")
    out.append("};\n")
    return out


def emit() -> str:
    out = [HEADER, match_helper()]
    lessons = [n for n in POOLS if n not in ("u6-exam", "u6-ir")]
    out += emit_table("U6_POOLS", lessons, "/** Lesson pools keyed by map node id. Each lesson plays its MCQs (beats/practice/pools.ts). */")
    out += emit_table("U6_UNWIRED", ["u6-exam"], "/** The board drafted for the checkpoint and still unplayed: see the header. */")
    out += emit_table("U6_IR_HELD", ["u6-ir"], "/** IR questions with cited band numbers, HELD for the owner's sign-off: nothing reads this table, and u6-ir keeps no map link. */")
    out.append("/** The drawing beside each MCQ, keyed by beat id. */")
    out.append("export const U6_VISUALS: Readonly<Record<string, McqVisual>> = " + ts(VISUALS) + ";\n")
    out.append("/** Drawn options, keyed by beat id then option id. All or nothing per beat. */")
    out.append("export const U6_OPTION_TILES: Readonly<Record<string, Readonly<Record<string, NamedFigure>>>> = " + ts(TILES) + ";\n")
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
    except Exception:  # the collecting pass only gathers names
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
