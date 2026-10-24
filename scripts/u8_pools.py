"""
Unit 8 (carboxylic acids and their derivatives) problem pools, a DRAFT, derived with RDKit.

Run:     python scripts/u8_pools.py
Writes:  src/game/content/u8/pools.ts (never edit it by hand: edit the specs
         below and rerun). The owner's report for this unit is written by hand
         beside the run, from what this script prints.

Built on scripts/u7_pools.py: the figure, naming, entry, emit and graph-edit
basics are copied from it unchanged. Every entry is `placeholder: true`.

THE MODEL. Check these rules, not the hundred and fifty answers. Each is a
graph edit on RDKit molecules; the script never types a product. A nucleophile
is a SMILES with one [*] on the atom that bonds.

S. Acyl substitution: on C(=O)-L the C-L bond is cut and the carbon bonds to
   the nucleophile instead; the C=O stays. L leaves with an H (HCl, an
   alcohol, a carboxylic acid, an amine). Hydrolysis, Fischer, every acyl
   chloride and anhydride reaction, transesterification, amide formation,
   Gilman and the first Grignard addition all run through this one edit.
T. The tetrahedral intermediate: the nucleophile bonds to the acyl carbon and
   the C=O becomes C-O(-), with L still on.
L. The ladder: acyl chloride 5, anhydride 4, ester and acid 3, amide 2,
   carboxylate 1. A conversion runs on its own only downhill, and a free acid
   is the exception: an amine or base takes its proton first, so the acid needs
   activation even to go down (the corpus board org2-match-acyl-synthesis-jobs
   says so: "An amine attacking a carboxylic acid directly mostly makes a
   salt"). The ORDER is an
   authored convention, taken from the course record
   (documentation/COURSE-OUTLINE-ORGO2.md, nucleophilic_acyl_substitution) and
   the corpus ladder org2-order-acyl-reactivity; RDKit cannot rank it.
R. Reductions. LiAlH4: an acid, ester or lactone carbon goes to CH2-OH (L cut
   off), an amide loses its C=O oxygen (CH2-N), a nitrile goes to CH2-NH2.
   DIBAL-H (one equivalent, cold): an ester is cut to the aldehyde, a nitrile
   N is swapped for O. NaBH4: only aldehyde and ketone C=O (convention).
G. Organometallics: a Grignard runs S once (to a ketone) then adds to that
   ketone (u7 rule A). A cuprate or a Weinreb amide stops after S (convention).
N. Nitriles: SN2 swaps the halide for C#N; hydrolysis swaps N for O (and OH);
   amide dehydration removes the C=O oxygen and makes C#N; a Grignard bonds to
   the nitrile carbon and hydrolysis gives the ketone.
D. Decarboxylation: a CO2H whose alpha carbon is bonded to another C=O carbon
   (a beta-keto acid or a malonic acid, the BETA pattern) loses the
   CO2H carbon and its oxygens; the enol is put in its keto form by RDKit's
   tautomer canonicaliser. HVZ swaps an alpha C-H for C-Br. Kolbe joins two
   R groups after both carboxyl carbons leave; Hunsdiecker puts Br where the
   carboxyl carbon was.
B. Byproducts (HCl, SO2, CO, CO2, water, N2, DCU, AgBr, bromide) are keyed by
   RDKit atom and charge balance: only one candidate balances.

Names. Every drawn structure is named, and OPSIN must read the name back as
exactly the drawing.

What is a CONVENTION, flagged in each entry's provenance and printed by the
run: the ladder order, that LiAlH4 reduces every derivative while NaBH4
leaves esters, amides, acids and nitriles, that DIBAL-H stops at the aldehyde
and a cuprate or Weinreb amide at the ketone, that a Grignard is destroyed by
an O-H, that SN2 wants a primary halide, that diazomethane methylates only the
acid O-H, and Le Chatelier on the Fischer and transesterification equilibria.

CHECK SOURCE, never adapted: OpenStax Organic Chemistry (CC BY-NC-SA 4.0)
chapters 20 to 22 are NAMED as the check for each entry. They were not read in
this drafting run: the check is owed, and the owner report says so.
"""

from __future__ import annotations

import json
import math
import os
import re
import sys

import numpy as np
import tempfile
from pathlib import Path

from rdkit import Chem, RDLogger
from rdkit.Chem import AllChem, rdCIPLabeler, rdDepictor
from rdkit.Chem.rdMolDescriptors import CalcMolFormula

RDLogger.DisableLog("rdApp.*")
rdDepictor.SetPreferCoordGen(True)

REPO = Path(__file__).resolve().parent.parent
OUT = REPO / "src" / "game" / "content" / "u8" / "pools.ts"

SCRIPT = "scripts/u8_pools.py"


def os16(section: str) -> str:
    return f"OpenStax Organic Chemistry {section} (CC BY-NC-SA) is the named check, not yet read against this draft"


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
OPSIN_DIR = Path(tempfile.mkdtemp(prefix="u8_opsin_"))


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
    chiral = [a.GetIdx() for a in m.GetAtoms() if a.GetChiralTag() != Chem.ChiralType.CHI_UNSPECIFIED]
    ring_only = [i for i in chiral if m.GetAtomWithIdx(i).GetTotalNumHs() == 1
                 and all(n.IsInRing() for n in m.GetAtomWithIdx(i).GetNeighbors())]
    if ring_only:
        m = Chem.AddHs(m, onlyOnAtoms=tuple(ring_only))
    rdDepictor.Compute2DCoords(m)
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
        # a short bond between two labels (S=O in a crowded sulfonate) trims less, so it never vanishes
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
            # the narrow end sits on the stereocentre, which RDKit makes the bond's begin atom
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
        brief: str | None = None, level: int = 1, concepts: tuple[str, ...] = ("oxidation_state_ladder",),
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
    if not id.startswith("u8-"):
        fail(f"{id}: ids start u8-")
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
        "problemId": "u8-pool-" + id,
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
# Graph-edit basics, copied unchanged from scripts/u7_pools.py
# ---------------------------------------------------------------------------

from rdkit.Chem import rdPartialCharges  # noqa: E402
from rdkit.Chem.EnumerateStereoisomers import EnumerateStereoisomers  # noqa: E402
from rdkit.Chem.MolStandardize import rdMolStandardize  # noqa: E402

SINGLE, DOUBLE = Chem.BondType.SINGLE, Chem.BondType.DOUBLE
# An aldehyde or ketone C=O: the carbon has only C or H neighbours besides its O.
KETO = Chem.MolFromSmarts("[CX3;!$(C-[!#6;!#1]);!$(C=[!#8])]=[OX1]")


def cdeg(m: Chem.Mol, i: int) -> int:
    """Carbon neighbours of atom i: 0 methyl, 1 primary, 2 secondary, 3 tertiary."""
    return sum(1 for n in m.GetAtomWithIdx(i).GetNeighbors() if n.GetSymbol() == "C")


def match_one(smi: str, smarts: str) -> tuple[int, ...]:
    hits = mol(smi).GetSubstructMatches(Chem.MolFromSmarts(smarts))
    if len(hits) != 1:
        raise ValueError(f"{smi}: {len(hits)} matches for {smarts}")
    return hits[0]


def co_sites(smi: str) -> list[tuple[int, int]]:
    return [tuple(h) for h in mol(smi).GetSubstructMatches(KETO)]


def the_co(smi: str) -> tuple[int, int]:
    sites = co_sites(smi)
    if len(sites) != 1:
        raise ValueError(f"{smi}: {len(sites)} aldehyde or ketone C=O groups")
    return sites[0]


def frags(rw: Chem.RWMol) -> list[str]:
    m = rw.GetMol()
    m.UpdatePropertyCache(strict=False)
    Chem.SanitizeMol(m)
    return sorted(Chem.MolToSmiles(f) for f in Chem.GetMolFrags(m, asMols=True))


def one(rw: Chem.RWMol) -> str:
    got = frags(rw)
    if len(got) != 1:
        raise ValueError(f"expected one product, got {got}")
    return got[0]


def merge(smi: str, nu: str) -> tuple[Chem.RWMol, list[int], list[int]]:
    """Substrate then nucleophile in one editable molecule: (rw, the atoms that held [*], the [*] atoms)."""
    rw = Chem.RWMol(Chem.CombineMols(mol(smi), mol(nu)))
    dummies = [a.GetIdx() for a in rw.GetAtoms() if a.GetAtomicNum() == 0]
    heads = [rw.GetAtomWithIdx(d).GetNeighbors()[0].GetIdx() for d in dummies]
    return rw, heads, dummies


def drop(rw: Chem.RWMol, idxs: list[int]) -> None:
    for i in sorted(set(idxs), reverse=True):
        rw.RemoveAtom(i)


def as_nu(smi: str, smarts: str) -> str:
    """The same molecule with [*] on the one atom matching `smarts` (it gives up an H to bond)."""
    hits = mol(smi).GetSubstructMatches(Chem.MolFromSmarts(smarts))
    if len(hits) != 1:
        raise ValueError(f"{smi}: {len(hits)} matches for {smarts}")
    rw = Chem.RWMol(mol(smi))
    d = rw.AddAtom(Chem.Atom(0))
    rw.AddBond(hits[0][0], d, SINGLE)
    return one(rw)


# -- Rule A: addition

def add(smi: str, nu: str, site: tuple[int, int] | None = None, alkoxide: bool = False) -> str:
    c, o = site or the_co(smi)
    rw, heads, dummies = merge(smi, nu)
    rw.GetBondBetweenAtoms(c, o).SetBondType(SINGLE)
    rw.AddBond(c, heads[0], SINGLE)
    if alkoxide:
        rw.GetAtomWithIdx(o).SetFormalCharge(-1)
    drop(rw, dummies)
    return one(rw)


def grignard(smi: str, r: str) -> str:
    return add(smi, "[*]" + r)


def carbonate(r: str) -> str:
    """R-MgBr on CO2, then workup: rule A on one C=O of O=C=O."""
    return add("O=C=O", "[*]" + r, site=(1, 0))


def reduce_co(smi: str) -> str:
    """Rule R: every aldehyde or ketone C=O to CH-OH (NaBH4, LiAlH4, MPV)."""
    rw = Chem.RWMol(mol(smi))
    for c, o in co_sites(smi):
        rw.GetBondBetweenAtoms(c, o).SetBondType(SINGLE)
    return one(rw)

def keto_form(smi: str) -> str:
    return Chem.MolToSmiles(rdMolStandardize.TautomerEnumerator().Canonicalize(mol(smi)))

def c_ox_state(smi: str, c: int) -> int:
    """Oxidation state of one carbon: +1 per bond order to O, -1 per H."""
    a = mol(smi).GetAtomWithIdx(c)
    up = sum(int(b.GetBondTypeAsDouble()) for b in a.GetBonds() if b.GetOtherAtom(a).GetSymbol() == "O")
    return up - a.GetTotalNumHs()


def head_ox(smi: str) -> int:
    """The highest carbon oxidation state in the molecule (one-carbon ladders)."""
    m = mol(smi)
    return max(c_ox_state(smi, a.GetIdx()) for a in m.GetAtoms() if a.GetSymbol() == "C")


def ox_c1(smi: str) -> int:
    """Oxidation state of C1, the carbon that carries the functional group, or the end carbon."""
    m = mol(smi)
    cs = [a.GetIdx() for a in m.GetAtoms() if a.GetSymbol() == "C" and any(n.GetSymbol() == "O" for n in a.GetNeighbors())]
    if cs:
        return max(c_ox_state(smi, c) for c in cs)
    return c_ox_state(smi, 0)


def atoms_of(smis: list[str]) -> dict[str, int]:
    count: dict[str, int] = {}
    for s in smis:
        m = Chem.AddHs(mol(s))
        for a in m.GetAtoms():
            count[a.GetSymbol()] = count.get(a.GetSymbol(), 0) + 1
        count["charge"] = count.get("charge", 0) + Chem.GetFormalCharge(m)
    return {k: v for k, v in count.items() if v}


def balances(left: list[str], right: list[str]) -> bool:
    return atoms_of(left) == atoms_of(right)


def byproduct(left: list[str], main: list[str], candidates: dict[str, str]) -> str | None:
    """The one candidate that balances left against main plus it."""
    hits = [k for k, s in candidates.items() if balances(left, main + [s])]
    return hits[0] if len(hits) == 1 else None


def centres(smi: str) -> int:
    return len(Chem.FindMolChiralCenters(mol(smi), includeUnassigned=True, useLegacyImplementation=False))


def outcome(product: str, *reactants: str) -> tuple[str, int]:
    """(racemic or single, stereocentres in the product). Achiral reactants can only give a racemate."""
    chiral_in = any(centres(r) for r in reactants)
    return ("single" if chiral_in else "racemic", centres(product))


def ring_size_new(before: str, after: str) -> int | None:
    """Size of the one ring the product has that the reactant did not."""
    a = sorted(len(r) for r in Chem.GetSymmSSSR(mol(after)))
    b = sorted(len(r) for r in Chem.GetSymmSSSR(mol(before)))
    extra = list(a)
    for r in b:
        if r in extra:
            extra.remove(r)
    return extra[0] if len(extra) == 1 else None


# ---------------------------------------------------------------------------
# Entry helpers
# ---------------------------------------------------------------------------

def flat(smi: str) -> str:
    m = mol(smi)
    Chem.RemoveStereochemistry(m)
    return Chem.MolToSmiles(m)


def key_flat(options: dict[str, str], wanted: list[str]) -> str | None:
    want = {flat(s) for s in wanted}
    hits = [o for o, smi in options.items() if flat(smi) in want]
    return hits[0] if len(hits) == 1 else None


def no_rxn(smi: str, got: list[str]) -> list[str]:
    """A reaction that derives nothing leaves the starting material: the 'no reaction' tile is the start drawn again."""
    return got if got else [canon(smi)]


def guard_caption(id: str, visual: dict, right_text: str) -> None:
    caps = [visual.get("name")] if visual.get("kind") == "structure" else [visual["a"].get("name"), visual["b"].get("name")]
    for cap in caps:
        if cap and right_text.lower() in cap.lower():
            fail(f"{id}: caption '{cap}' names the answer")


def pick(node: str, id: str, prompt: str, opts: list[tuple[str, str, str, str, str]], derived: list[str] | None,
         correct: str, explanation: str, provenance: str, visual: dict, flat_key: bool = False, **kw) -> None:
    """
    An MCQ whose options are all drawn. opts: (option id, SMILES, OPSIN name,
    option text, why), right answer first. The key is the one option whose
    structure is in the derived product set.
    """
    smis = {o: s for o, s, _, _, _ in opts}
    if derived is None:
        key = None
    else:
        key = key_flat(smis, derived) if flat_key else key_in(smis, derived)
    tiles = {o: named(canon(s), n) for o, s, n, _, _ in opts}
    guard_caption(id, visual, [t for o, _, _, t, _ in opts if o == correct][0])
    mcq(node, id, prompt, [(o, t, w) for o, _, _, t, w in opts], key, correct, explanation, provenance, visual,
        tiles=tiles, **kw)


def ask(node: str, id: str, prompt: str, opts: list[tuple[str, str, str]], values: dict[str, object], derived: object,
        correct: str, explanation: str, provenance: str, visual: dict, **kw) -> None:
    """A text MCQ. values: option id -> the value that option claims; the key is the option equal to `derived`."""
    hits = [o for o, v in values.items() if v == derived]
    key = hits[0] if len(hits) == 1 else None
    guard_caption(id, visual, [t for o, t, _ in opts if o == correct][0])
    mcq(node, id, prompt, opts, key, correct, explanation, provenance, visual, **kw)


def lead(smi: str, name: str, caption: str) -> dict:
    return structure(canon(smi), name, caption)



# ---------------------------------------------------------------------------
# The Unit 8 model: graph edits on the acyl carbon
# ---------------------------------------------------------------------------

TRIPLE = Chem.BondType.TRIPLE


def new_o(rw: Chem.RWMol, c: int, order=DOUBLE) -> int:
    i = rw.AddAtom(Chem.Atom(8))
    rw.AddBond(c, i, order)
    return i

OUTLINE = "documentation/COURSE-OUTLINE-ORGO2.md (nucleophilic_acyl_substitution) and the corpus ladder org2-order-acyl-reactivity"

CLASSES = [
    ("acyl chloride", "[CX3](=[OX1])Cl"),
    ("anhydride", "[CX3](=[OX1])[OX2][CX3]=[OX1]"),
    ("carboxylate", "[CX3](=[OX1])[OX1-]"),
    ("carboxylic acid", "[CX3](=[OX1])[OX2H1]"),
    ("ester", "[CX3](=[OX1])[OX2][#6]"),
    ("amide", "[CX3](=[OX1])[NX3]"),
    ("nitrile", "[CX2]#[NX1]"),
]
# CONVENTION, from the course outline: the ladder, top rung first.
RANK = {"acyl chloride": 5, "anhydride": 4, "ester": 3, "carboxylic acid": 3, "amide": 2, "carboxylate": 1}
LADDER_CONV = "the acyl ladder order (acyl chloride, anhydride, ester and acid, amide, carboxylate) from the course outline"

LEAVE = "[CX3](=[OX1])-[Cl,Br,OX2,NX3]"
ACID = "[CX3](=[OX1])-[OX2H1]"
ESTER_L = "[CX3](=[OX1])-[OX2][#6]"


def acyl_class(smi: str) -> str:
    m = mol(smi)
    for name, sm in CLASSES:
        if m.HasSubstructMatch(Chem.MolFromSmarts(sm)):
            return name
    return "none"


def rank(smi: str) -> int:
    return RANK[acyl_class(smi)]


def sites(smi: str, pattern: str = LEAVE) -> list[tuple[int, int, int]]:
    return [tuple(h[:3]) for h in mol(smi).GetSubstructMatches(Chem.MolFromSmarts(pattern))]


def split(rw: Chem.RWMol, c: int) -> tuple[str, tuple[str, ...]]:
    """(the fragment holding atom c, every other fragment)."""
    m = rw.GetMol()
    m.UpdatePropertyCache(strict=False)
    Chem.SanitizeMol(m)
    groups = Chem.GetMolFrags(m)
    parts = Chem.GetMolFrags(m, asMols=True)
    main = [Chem.MolToSmiles(p) for p, g in zip(parts, groups) if c in g]
    rest = sorted(Chem.MolToSmiles(p) for p, g in zip(parts, groups) if c not in g)
    return main[0], tuple(rest)


def acyl_sub(smi: str, nu: str, pattern: str = LEAVE) -> tuple[str, tuple[str, ...]]:
    """Rule S: cut C-L, bond C-Nu, keep C=O. Refuses when two sites give different products."""
    outs = set()
    for c, _, l in sites(smi, pattern):
        rw, heads, dummies = merge(smi, nu)
        rw.RemoveBond(c, l)
        rw.AddBond(c, heads[0], SINGLE)
        drop(rw, dummies)
        outs.add(split(rw, c))
    if len(outs) != 1:
        raise ValueError(f"{smi} + {nu}: {len(outs)} different substitution outcomes")
    return outs.pop()


def acyl_sub_all(smi: str, nu: str, pattern: str) -> list[str]:
    """Rule S on every site matching `pattern` at once, each with its own copy of the nucleophile."""
    m = mol(smi)
    rw = Chem.RWMol(m)
    dummies = []
    for c, _, l in sites(smi, pattern):
        rw.RemoveBond(c, l)
        nm = mol(nu)
        base = rw.GetNumAtoms()
        rw.InsertMol(nm)
        d = base + [a.GetIdx() for a in nm.GetAtoms() if a.GetAtomicNum() == 0][0]
        rw.AddBond(c, rw.GetAtomWithIdx(d).GetNeighbors()[0].GetIdx(), SINGLE)
        dummies.append(d)
    drop(rw, dummies)
    return frags(rw)


def tet(smi: str, nu: str) -> str:
    """Rule T: the tetrahedral intermediate, L still attached, O negative."""
    c, o, _ = sites(smi)[0]
    rw, heads, dummies = merge(smi, nu)
    rw.GetBondBetweenAtoms(c, o).SetBondType(SINGLE)
    rw.GetAtomWithIdx(o).SetFormalCharge(-1)
    rw.AddBond(c, heads[0], SINGLE)
    drop(rw, dummies)
    return one(rw)


def deprotonate(acid: str) -> str:
    """Every CO2H to CO2-."""
    rw = Chem.RWMol(mol(acid))
    for _, _, l in sites(acid, ACID):
        rw.GetAtomWithIdx(l).SetFormalCharge(-1)
    return one(rw)


def hydrolyse(smi: str, pattern: str = LEAVE) -> tuple[str, tuple[str, ...]]:
    return acyl_sub(smi, "[*]O", pattern)


def saponify(smi: str) -> tuple[str, tuple[str, ...]]:
    main, rest = hydrolyse(smi)
    return deprotonate(main), rest


def nu_of(smi: str, smarts: str) -> str:
    return as_nu(smi, smarts)


def fischer(acid: str, alcohol: str) -> tuple[str, tuple[str, ...]]:
    return acyl_sub(acid, nu_of(alcohol, "[OX2H][CX4]"), ACID)


def intramolecular(smi: str, acid_pattern: str, nu_smarts: str) -> tuple[str, tuple[str, ...]]:
    """Rule S inside one molecule: the acyl C bonds to the molecule's own nucleophile atom."""
    m = mol(smi)
    outs = set()
    for c, _, l in sites(smi, acid_pattern):
        for hit in m.GetSubstructMatches(Chem.MolFromSmarts(nu_smarts)):
            n = hit[0]
            if n == l:
                continue
            rw = Chem.RWMol(m)
            rw.RemoveBond(c, l)
            rw.AddBond(c, n, SINGLE)
            outs.add(split(rw, c))
    if len(outs) != 1:
        raise ValueError(f"{smi}: {len(outs)} ring closures")
    return outs.pop()


def lialh4(smi: str) -> list[str]:
    """Rule R with LiAlH4 on every acid, ester, amide, nitrile, aldehyde and ketone."""
    m = mol(smi)
    rw = Chem.RWMol(m)
    gone = []
    for c, o, l in sites(smi, "[CX3](=[OX1])-[Cl,OX2]"):
        rw.RemoveBond(c, l)
        rw.GetBondBetweenAtoms(c, o).SetBondType(SINGLE)
    for c, o, _ in sites(smi, "[CX3](=[OX1])-[NX3]"):
        gone.append(o)
    for c, n in m.GetSubstructMatches(Chem.MolFromSmarts("[CX2]#[NX1]")):
        rw.GetBondBetweenAtoms(c, n).SetBondType(SINGLE)
    for c, o in co_sites(smi):
        rw.GetBondBetweenAtoms(c, o).SetBondType(SINGLE)
    drop(rw, gone)
    return frags(rw)


def nabh4(smi: str) -> str:
    """CONVENTION: NaBH4 reduces only aldehyde and ketone C=O."""
    return reduce_co(smi)


def dibal(smi: str) -> list[str]:
    """Rule R with one DIBAL-H, cold, then workup: ester cut to aldehyde; nitrile N swapped for O."""
    m = mol(smi)
    rw = Chem.RWMol(m)
    gone = []
    for c, _, l in sites(smi, "[CX3](=[OX1])-[OX2][#6]"):
        rw.RemoveBond(c, l)
    for c, n in m.GetSubstructMatches(Chem.MolFromSmarts("[CX2]#[NX1]")):
        o = rw.AddAtom(Chem.Atom(8))
        rw.AddBond(c, o, DOUBLE)
        gone.append(n)
    for c, _, n in sites(smi, "[CX3](=[OX1])-[NX3]([CH3])[OX2][CH3]"):
        rw.RemoveBond(c, n)
    drop(rw, gone)
    return frags(rw)


def grignard_twice(smi: str, r: str) -> tuple[str, tuple[str, ...]]:
    """Rule G: substitution to the ketone (or aldehyde), then addition to it."""
    ketone, rest = acyl_sub(smi, "[*]" + r)
    return add(ketone, "[*]" + r), rest


def once(smi: str, r: str) -> tuple[str, tuple[str, ...]]:
    """Rule G, stopped after one substitution (cuprate, Weinreb amide): CONVENTION."""
    return acyl_sub(smi, "[*]" + r)


def sn2(halide: str, nu: str) -> tuple[str, tuple[str, ...]]:
    """R-X: the C-X bond is cut and the carbon bonds to the nucleophile."""
    c, x = match_one(halide, "[CX4]-[Cl,Br,I]")
    rw, heads, dummies = merge(halide, nu)
    rw.RemoveBond(c, x)
    rw.AddBond(c, heads[0], SINGLE)
    drop(rw, dummies)
    return split(rw, c)


def nitrile_hydrolysis(smi: str, full: bool = True) -> list[str]:
    c, n = match_one(smi, "[CX2]#[NX1]")
    rw = Chem.RWMol(mol(smi))
    rw.RemoveBond(c, n)
    new_o(rw, c)
    if full:
        new_o(rw, c, SINGLE)
    else:
        rw.AddBond(c, rw.AddAtom(Chem.Atom(7)), SINGLE)
    return frags(rw)


def dehydrate_amide(smi: str) -> list[str]:
    c, o, n = match_one(smi, "[CX3](=[OX1])[NX3;H2]")
    rw = Chem.RWMol(mol(smi))
    rw.RemoveBond(c, o)
    rw.GetBondBetweenAtoms(c, n).SetBondType(TRIPLE)
    return frags(rw)


def nitrile_grignard(smi: str, r: str) -> list[str]:
    """Grignard bonds to the nitrile carbon; hydrolysis swaps the N for O."""
    c, n = match_one(smi, "[CX2]#[NX1]")
    rw, heads, dummies = merge(smi, "[*]" + r)
    rw.RemoveBond(c, n)
    rw.AddBond(c, heads[0], SINGLE)
    new_o(rw, c)
    drop(rw, dummies)
    return frags(rw)


BETA = "[OX1]=[CX3][CX4][CX3](=[OX1])[OX2H1]"


def decarboxylate(smi: str) -> list[str]:
    """Rule D: [] when no CO2H has an alpha carbon bonded to another C=O carbon (BETA)."""
    m = mol(smi)
    outs = set()
    for _, _, a, cc, o1, o2 in m.GetSubstructMatches(Chem.MolFromSmarts(BETA)):
        rw = Chem.RWMol(m)
        drop(rw, [cc, o1, o2])
        outs.add(one(rw))
    if len(outs) > 1:
        raise ValueError(f"{smi}: two different decarboxylations")
    return sorted(outs)


def ts_ring(smi: str) -> int:
    """Atoms in the cyclic decarboxylation path: the acid O-H oxygen to the other C=O oxygen, plus the H."""
    m = mol(smi)
    ko, _, _, _, _, oh = m.GetSubstructMatches(Chem.MolFromSmarts(BETA))[0]
    return len(Chem.GetShortestPath(m, oh, ko)) + 1


def alpha_carbon(acid: str) -> int:
    c, _, _ = sites(acid, ACID)[0]
    alphas = [n.GetIdx() for n in mol(acid).GetAtomWithIdx(c).GetNeighbors() if n.GetSymbol() == "C"]
    return alphas[0]


def hvz(acid: str) -> list[str]:
    a = alpha_carbon(acid)
    if mol(acid).GetAtomWithIdx(a).GetTotalNumHs() == 0:
        return []
    rw = Chem.RWMol(mol(acid))
    rw.AddBond(a, rw.AddAtom(Chem.Atom(35)), SINGLE)
    return [one(rw)]


def r_group(acid: str) -> tuple[Chem.Mol, int]:
    """The acid with its carboxyl carbon and oxygens removed: (R, the atom that held CO2H)."""
    c, o, l = sites(acid, ACID)[0]
    a = alpha_carbon(acid)
    rw = Chem.RWMol(mol(acid))
    rw.GetAtomWithIdx(a).SetNoImplicit(False)
    for i in sorted([c, o, l], reverse=True):
        rw.RemoveAtom(i)
    shift = sum(1 for i in (c, o, l) if i < a)
    return rw.GetMol(), a - shift


def kolbe(acid1: str, acid2: str) -> str:
    """Rule D (Kolbe): R-R' from two acids, both carboxyl carbons gone."""
    r1m, a1 = r_group(acid1)
    r2m, a2 = r_group(acid2)
    rw = Chem.RWMol(Chem.CombineMols(r1m, r2m))
    rw.AddBond(a1, r1m.GetNumAtoms() + a2, SINGLE)
    return one(rw)


def hunsdiecker(acid: str) -> str:
    rm, a = r_group(acid)
    rw = Chem.RWMol(rm)
    rw.AddBond(a, rw.AddAtom(Chem.Atom(35)), SINGLE)
    return one(rw)


def methylate_acid(acid: str) -> str:
    """Diazomethane: a CH3 on every CO2H oxygen (CONVENTION: not on an alcohol O-H)."""
    rw = Chem.RWMol(mol(acid))
    for _, _, l in sites(acid, ACID):
        rw.AddBond(l, rw.AddAtom(Chem.Atom(6)), SINGLE)
    return one(rw)


def shift(action: str, species: str, left: list[str], right: list[str]) -> str | None:
    """CONVENTION, Le Chatelier: adding a reactant or removing a product runs the equilibrium forward."""
    sp = canon(species)
    side = "left" if sp in {canon(x) for x in left} else "right" if sp in {canon(x) for x in right} else None
    if side is None:
        return None
    return "forward" if (action == "add") == (side == "left") else "backward"


WEINREB = "[CX3](=[OX1])N([CH3])O[CH3]"


def excess_grignard(smi: str, r: str) -> str:
    """Rule G with excess reagent; a Weinreb amide stops after one (CONVENTION)."""
    return once(smi, r)[0] if has(smi, WEINREB) else grignard_twice(smi, r)[0]


def carbons(smi: str) -> int:
    return sum(1 for a in mol(smi).GetAtoms() if a.GetSymbol() == "C")


def has(smi: str, smarts: str) -> bool:
    return mol(smi).HasSubstructMatch(Chem.MolFromSmarts(smarts))


def kind_of(smi: str) -> str:
    """The class a match board's right card names, read by SMARTS."""
    cls = acyl_class(smi)
    if cls != "none":
        return cls
    if has(smi, "[CX4][NX3;H2]"):
        return "primary amine"
    if has(smi, "[CX4][NX3;H0]([CX4])[CX4]"):
        return "tertiary amine"
    if has(smi, "[CX3H1](=O)"):
        return "aldehyde"
    if has(smi, "[CX4H2][OX2H]"):
        return "primary alcohol"
    return "other"


def o(id: str, smi: str, name: str, why: str, text: str | None = None) -> tuple[str, str, str, str, str]:
    """One drawn option. The text defaults to the name with a capital first letter."""
    if text is None:
        text = name if not name[0].isalpha() or name[:2] in ("N,", "N-") else name[0].upper() + name[1:]
    return (id, smi, name, text, why)


CH_ACID = "ch. 20"
CH_DER = "ch. 21"
CH_ALPHA = "ch. 22"
LAD = ("acyl_reactivity_ladder",)
NAS = ("nucleophilic_acyl_substitution",)
ACIDS = ("carboxylic_acids",)
RED = ("oxidation_state_ladder",)
NUCC = ("nucleophilic_addition_carbon",)
SUB = ("substitution_and_elimination",)

S = {
    "acetyl_cl": "CC(=O)Cl",
    "ac2o": "CC(=O)OC(C)=O",
    "etoac": "CCOC(C)=O",
    "meoac": "COC(C)=O",
    "acetamide": "CC(N)=O",
    "acoh": "CC(=O)O",
    "acetate": "CC(=O)[O-]",
    "dma": "CC(=O)N(C)C",
    "phcooh": "OC(=O)c1ccccc1",
    "phcocl": "ClC(=O)c1ccccc1",
    "phcoome": "COC(=O)c1ccccc1",
    "phcooet": "CCOC(=O)c1ccccc1",
    "phcn": "N#Cc1ccccc1",
    "buacid": "CCCC(=O)O",
    "mebut": "CCCC(=O)OC",
    "gbl": "O=C1CCCO1",
    "dvl": "O=C1CCCCO1",
    "succinic": "OC(=O)CCC(=O)O",
    "triacetin": "CC(=O)OCC(COC(C)=O)OC(C)=O",
}


# ---------------------------------------------------------------------------
# u8-ladder
# ---------------------------------------------------------------------------

def node_ladder() -> None:
    node = "u8-ladder"
    four = {"cl": S["acetyl_cl"], "anh": S["ac2o"], "est": S["etoac"], "amd": S["acetamide"]}
    pick(node, "u8-lad-meet", "Pick the acyl chloride.",
         [o("cl", four["cl"], "acetyl chloride", "Cl sits directly on the C=O carbon. That C-Cl is the leaving group the whole ladder starts from."),
          o("anh", four["anh"], "acetic anhydride", "Two C=O groups share one oxygen. That is an anhydride, one rung below the acyl chloride."),
          o("est", four["est"], "ethyl acetate", "The C=O carbon carries an O-ethyl group. That is an ester."),
          o("amd", four["amd"], "acetamide", "N on the C=O carbon makes an amide, near the bottom of the ladder.")],
         [s for s in four.values() if acyl_class(s) == "acyl chloride"], "cl",
         "Name the group on the C=O carbon first. Cl means acyl chloride, the top rung.",
         prov("SMARTS class of each derivative", CH_DER), lead(S["acoh"], "acetic acid", "four acetyl derivatives"),
         level=0, concepts=LAD)

    three = {"anh": S["ac2o"], "est": S["meoac"], "amd": S["dma"]}
    top = max(three, key=lambda k: rank(three[k]))
    pick(node, "u8-lad-top", "Pick the derivative highest on the reactivity ladder.",
         [o("anh", three["anh"], "acetic anhydride", "Its leaving group is a carboxylate, the best of these three. Anhydrides sit just under acyl chlorides."),
          o("est", three["est"], "methyl acetate", "Methoxide is a worse leaving group than a carboxylate, so the ester sits one rung lower."),
          o("amd", three["amd"], "N,N-dimethylacetamide", "Nitrogen holds onto the carbonyl hardest. Amides are the lowest neutral rung.")],
         [three[top]], "anh", "Anhydride above ester above amide: the better the leaving group, the higher the rung.",
         prov("ladder rank looked up by SMARTS class", CH_DER, LADDER_CONV),
         lead(S["acetyl_cl"], "acetyl chloride", "the ladder"), concepts=LAD, convention=LADDER_CONV)

    three = {"amd": S["acetamide"], "est": S["etoac"], "cl": S["phcocl"]}
    low = min(three, key=lambda k: rank(three[k]))
    pick(node, "u8-lad-bottom", "Pick the derivative lowest on the reactivity ladder.",
         [o("amd", three["amd"], "acetamide", "An amide: nitrogen is the worst leaving group of the three, so it reacts last."),
          o("est", three["est"], "ethyl acetate", "An ester sits above an amide. It reacts with hydroxide in water; an amide needs heat and time."),
          o("cl", three["cl"], "benzoyl chloride", "An acyl chloride is the top rung, even with a benzene ring on it.")],
         [three[low]], "amd", "Amides sit lowest of the neutral derivatives.",
         prov("ladder rank looked up by SMARTS class", CH_DER, LADDER_CONV),
         lead(S["acetamide"], "acetamide", "the bottom of the ladder"), concepts=LAD, convention=LADDER_CONV)

    moves = {"down": (S["acetyl_cl"], S["etoac"]), "up": (S["etoac"], S["acetyl_cl"]), "amide": (S["acetamide"], S["etoac"])}
    ask(node, "u8-lad-down", "Pick the change that runs downhill with no activating reagent.",
        [("down", "Acetyl chloride to ethyl acetate", "Acyl chloride to ester is a step down the ladder, so ethanol alone does it."),
         ("up", "Ethyl acetate to acetyl chloride", "That climbs two rungs. Chloride is a worse nucleophile than the ethoxide it would push out."),
         ("amide", "Acetamide to ethyl acetate", "That climbs one rung. An amide will not trade its nitrogen for an alcohol on its own.")],
        {k: rank(a) > rank(b) for k, (a, b) in moves.items()}, True, "down",
        "Downhill is free from an acyl chloride, anhydride or ester. A free acid is the exception: an amine or base takes its proton first, so the acid needs activation (SOCl₂ or DCC) even to go down.",
        prov("ladder ranks of start and end compared", CH_DER, LADDER_CONV),
        lead(S["acetyl_cl"], "acetyl chloride", "three conversions"), concepts=LAD, convention=LADDER_CONV)

    opts = {"est": S["meoac"], "anh": S["ac2o"], "acid": S["acoh"]}
    pick(node, "u8-lad-ester", "Pick the ester.",
         [o("est", opts["est"], "methyl acetate", "The C=O carbon has an O-CH₃ on it, and that CH₃ is not another C=O. That is an ester."),
          o("anh", opts["anh"], "acetic anhydride", "Its single-bonded O leads to a second C=O, which makes it an anhydride, not an ester."),
          o("acid", opts["acid"], "acetic acid", "The O on the C=O carbon carries H, not carbon. That is the acid.")],
         [s for s in opts.values() if acyl_class(s) == "ester"], "est",
         "An ester is C(=O)-O-C where the last carbon is not a carbonyl.",
         prov("SMARTS class of each option", CH_DER), lead(S["etoac"], "ethyl acetate", "three acyl groups"),
         concepts=NAS)

    opts = {"amd": S["dma"], "amine": "CC(=O)CN", "nitrile": "CC#N"}
    pick(node, "u8-lad-amide", "Pick the amide.",
         [o("amd", opts["amd"], "N,N-dimethylacetamide", "N bonds straight to the C=O carbon. That makes it an amide, even with two methyls on N."),
          o("amine", opts["amine"], "1-aminopropan-2-one", "Here N sits one carbon away from the C=O. That is a ketone with an amine, not an amide."),
          o("nitrile", opts["nitrile"], "acetonitrile", "C≡N with no C=O is a nitrile. It hydrolyses to an amide, but it is not one.")],
         [s for s in opts.values() if acyl_class(s) == "amide"], "amd",
         "An amide's nitrogen is on the C=O carbon itself.",
         prov("SMARTS class of each option", CH_DER), lead(S["acetamide"], "acetamide", "nitrogen and carbonyls"),
         concepts=NAS)

    rows = [("cl", "CH₃COCl", S["acetyl_cl"]), ("anh", "(CH₃CO)₂O", S["ac2o"]), ("est", "CH₃COOCH₃", S["meoac"]),
            ("amd", "CH₃CONH₂", S["acetamide"])]
    whys = {"acyl chloride": "Cl on the acyl carbon: the top rung.",
            "anhydride": "Two acyl groups sharing one O.",
            "ester": "O-CH₃ on the acyl carbon.",
            "amide": "NH₂ on the acyl carbon: the lowest neutral rung."}
    pairs = [(pid, left, acyl_class(smi).capitalize(), whys[acyl_class(smi)], acyl_class(smi).capitalize()) for pid, left, smi in rows]
    match(node, "u8-lad-match", "Match each formula to its derivative class.",
          "Read the group on the C=O carbon.", pairs,
          "Cl, O-C(=O), O-R and N on the acyl carbon: acyl chloride, anhydride, ester, amide.",
          prov("SMARTS class of each formula's structure", CH_DER), LAD)


# ---------------------------------------------------------------------------
# u8-tetrahedral
# ---------------------------------------------------------------------------

def node_tetrahedral() -> None:
    node = "u8-tetrahedral"
    s = S["acetyl_cl"]
    ti = tet(s, "[*]OC")
    hyb = [str(a.GetHybridization()).lower() for a in mol(ti).GetAtoms() if a.GetSymbol() == "C" and a.GetDegree() == 4][0]
    ask(node, "u8-tet-meet", "Methoxide adds to acetyl chloride's C=O. Pick the carbon's new shape.",
        [("sp3", "Tetrahedral, sp³", "The carbon now holds O⁻, OCH₃, Cl and CH₃: four single bonds, tetrahedral. That is why it is called the tetrahedral intermediate."),
         ("sp2", "Flat, sp²", "Flat was the C=O before attack. Once the pi bond breaks the carbon has four groups."),
         ("sp", "Linear, sp", "Linear needs two pi bonds on the carbon. This one has none left.")],
        {"sp3": "sp3", "sp2": "sp2", "sp": "sp"}, hyb, "sp3",
        "Addition makes a tetrahedral carbon; elimination then makes it flat again.",
        prov("Rule T, RDKit hybridisation of the acyl carbon", CH_DER),
        lead(s, "acetyl chloride", "acetyl chloride + CH₃O⁻"), level=0, concepts=NAS)

    pick(node, "u8-tet-int", "Pick the tetrahedral intermediate from acetyl chloride and CH₃O⁻.",
         [o("ti", ti, "1-chloro-1-methoxyethan-1-olate", "Methoxide bonds to the acyl carbon and the pi electrons go to oxygen. Cl is still attached.", "C(O⁻)(Cl)(OCH₃)CH₃"),
          o("est", S["meoac"], "methyl acetate", "That is after the intermediate collapses and Cl leaves. Ask for the moment before.", "Methyl acetate"),
          o("two", "CC(Cl)(OC)OC", "1-chloro-1,1-dimethoxyethane", "Only one methoxide adds. The oxygen carries the negative charge, it does not take a second methyl group.", "C(Cl)(OCH₃)₂CH₃")],
         [ti], "ti", "The intermediate keeps every group the carbon had, plus the nucleophile, and O⁻ in place of C=O.",
         prov("Rule T", CH_DER), lead(s, "acetyl chloride", "acetyl chloride + CH₃O⁻"), concepts=NAS)

    exits = {"cl": acyl_sub(s, "[*]OC")[0], "ome": s}
    best = min(exits, key=lambda k: rank(exits[k]))
    ask(node, "u8-tet-leave", "That intermediate collapses. Pick the group that leaves.",
        [("cl", "Chloride", "Losing Cl⁻ gives methyl acetate, a lower rung. Downhill is the way the C=O reforms."),
         ("ome", "Methoxide", "Losing methoxide just gives acetyl chloride back, a higher rung. That route runs uphill."),
         ("me", "The methyl group", "A C-C bond does not break here. CH₃⁻ is a hopeless leaving group.")],
        {"cl": best == "cl", "ome": best == "ome", "me": None}, True, "cl",
        "The group that leaves is the one that takes the molecule down the ladder.",
        prov("Rule S both ways; ladder ranks of the two exits compared", CH_DER, LADDER_CONV),
        structure(ti, "1-chloro-1-methoxyethan-1-olate", "tetrahedral intermediate"), concepts=LAD, convention=LADDER_CONV)

    main, rest = acyl_sub(s, "[*]OC")
    pick(node, "u8-tet-product", "Pick the product once that intermediate collapses.",
         [o("est", main, "methyl acetate", "C=O reforms and pushes out chloride. The methoxy group stays."),
          o("acid", S["acoh"], "acetic acid", "That would need water as the nucleophile. Here it was methoxide."),
          o("ether", "COC(C)Cl", "1-chloro-1-methoxyethane", "The C=O does not stay single. Acyl substitution ends with the carbonyl back.")],
         [main], "est", "Add, then eliminate: the net result swaps Cl for OCH₃ and keeps the C=O.",
         prov("Rule S", CH_DER), lead(s, "acetyl chloride", "acetyl chloride + CH₃O⁻"), concepts=NAS)

    keeps = has(main, "[CX3]=[OX1]") and not has(main, "Cl")
    ask(node, "u8-tet-net", "Pick what acyl substitution does overall.",
        [("swap", "Swaps the group on C=O; C=O stays", "Add then eliminate: the leaving group goes, the nucleophile stays, and the carbonyl is back at the end."),
         ("add", "Adds across C=O, like a ketone", "Aldehydes and ketones stop at addition because H and C are bad leaving groups. Acyl compounds have a real one."),
         ("lose", "Removes the C=O oxygen", "The carbonyl oxygen is never lost here. It goes to O⁻ and comes back as C=O.")],
        {"swap": True, "add": False, "lose": None}, keeps, "swap",
        "Substitution, not addition: the C=O survives and the group on it changes.",
        prov("Rule S product checked for C=O kept and Cl gone", CH_DER),
        lead(S["meoac"], "methyl acetate", "after the swap"), concepts=NAS)

    ti2 = tet(S["meoac"], "[*]O")
    pick(node, "u8-tet-hydroxide", "Pick the intermediate when hydroxide adds to methyl acetate.",
         [o("ti", ti2, "1-hydroxy-1-methoxyethan-1-olate", "OH bonds to the acyl carbon, O⁻ forms, and OCH₃ is still there.", "C(O⁻)(OH)(OCH₃)CH₃"),
          o("acid", S["acoh"], "acetic acid", "That is a product after methoxide leaves. The intermediate comes first.", "Acetic acid"),
          o("two", "COC(C)([O-])OC", "1,1-dimethoxyethan-1-olate", "The nucleophile was hydroxide, so the new group is OH, not a second OCH₃.", "C(O⁻)(OCH₃)₂CH₃")],
         [ti2], "ti", "Same pattern every time: nucleophile on, O⁻ formed, leaving group still attached.",
         prov("Rule T", CH_DER), lead(S["meoac"], "methyl acetate", "methyl acetate + HO⁻"), concepts=NAS)


# ---------------------------------------------------------------------------
# u8-to-acylcl
# ---------------------------------------------------------------------------

SOCL2 = "O=S(Cl)Cl"
OXALYL = "O=C(Cl)C(=O)Cl"


def node_to_acylcl() -> None:
    node = "u8-to-acylcl"
    s = S["buacid"]
    main, _ = acyl_sub(s, "[*]Cl", ACID)
    pick(node, "u8-acl-meet", "Butanoic acid meets SOCl₂. Pick the product.",
         [o("cl", main, "butanoyl chloride", "The OH on the C=O carbon is swapped for Cl. The C=O stays."),
          o("alkyl", "CCCCCl", "1-chlorobutane", "That has lost the C=O. SOCl₂ does this to an alcohol, but an acid keeps its carbonyl."),
          o("alpha", "CCC(Cl)C(=O)O", "2-chlorobutanoic acid", "Cl goes where the OH was, on the acyl carbon, not on the next carbon.")],
         [main], "cl", "SOCl₂ turns RCOOH into RCOCl.",
         prov("Rule S, OH swapped for Cl", CH_DER), lead(s, "butanoic acid", "butanoic acid + SOCl₂"), level=0, concepts=NAS)

    cands = {"so2": "O=S=O.Cl", "h2o": "O.O=S", "so3": "O=S(=O)=O.[HH]"}
    ask(node, "u8-acl-byproducts", "Pick the byproducts when RCOOH meets SOCl₂.",
        [("so2", "SO₂ and HCl", "Count atoms: the S and one O leave as SO₂, the second Cl leaves with the acid's H as HCl. Both are gases."),
         ("h2o", "Water and SO", "That leaves a chlorine unaccounted for. The atoms do not balance."),
         ("so3", "SO₃ and H₂", "SOCl₂ has only one O. SO₃ would need oxygen that is not in the flask.")],
        {k: k for k in cands}, byproduct([s, SOCL2], [main], cands), "so2",
        "SOCl₂ leaves as two gases, SO₂ and HCl, which drives the reaction.",
        prov("RDKit atom balance over three candidates", CH_DER),
        lead(s, "butanoic acid", "RCOOH + SOCl₂"), concepts=NAS)

    cands = {"three": "[C-]#[O+].O=C=O.Cl", "two": "O=C=O.O=C=O.Cl", "cl2": "O=CC=O.ClCl"}
    ask(node, "u8-acl-oxalyl", "Pick the byproducts when RCOOH meets oxalyl chloride.",
        [("three", "CO, CO₂ and HCl", "Oxalyl chloride falls apart into two gases and HCl. The atoms balance exactly."),
         ("two", "Two CO₂ and HCl", "That needs one more oxygen than the flask has."),
         ("cl2", "Ethanedial and Cl₂", "Nothing is reduced to an aldehyde here, and those atoms do not balance.")],
        {k: k for k in cands}, byproduct([s, OXALYL], [main], cands), "three",
        "Oxalyl chloride does the same job as SOCl₂, leaving only gases.",
        prov("RDKit atom balance over three candidates", CH_DER),
        lead(OXALYL, "oxalyl chloride", "RCOOH + (COCl)₂"), concepts=NAS)

    moves = {"acid": (s, main), "ester": (S["acetyl_cl"], S["etoac"]), "sapon": (S["etoac"], S["acetate"])}
    ask(node, "u8-acl-uphill", "Pick the change that needs an activating reagent such as SOCl₂.",
        [("acid", "Acid to acyl chloride", "That climbs from the acid rung to the top rung. It needs a reagent that turns OH into a better leaving group."),
         ("ester", "Acyl chloride to ester", "That runs downhill. An alcohol does it alone."),
         ("sapon", "Ester to carboxylate (NaOH)", "That runs downhill to the bottom rung. Hydroxide does it alone.")],
        {k: rank(b) > rank(a) for k, (a, b) in moves.items()}, True, "acid",
        "Uphill moves on the ladder need activation. Downhill is free from an acyl chloride, anhydride or ester; a free acid needs activation even to go down.",
        prov("ladder ranks of start and end compared", CH_DER, LADDER_CONV),
        lead(s, "butanoic acid", "three conversions"), concepts=LAD, convention=LADDER_CONV)

    di = "OC(=O)CCCCC(=O)O"
    got = acyl_sub_all(di, "[*]Cl", ACID)
    pick(node, "u8-acl-diacid", "Hexanedioic acid meets excess SOCl₂. Pick the product.",
         [o("both", "O=C(Cl)CCCCC(=O)Cl", "hexanedioyl dichloride", "Excess SOCl₂ converts both acids. Each OH becomes Cl."),
          o("one", "O=C(O)CCCCC(=O)Cl", "6-chloro-6-oxohexanoic acid", "With excess reagent there is no reason one acid survives."),
          o("ring", "O=C1CCCCC(=O)O1", "oxepane-2,7-dione", "Closing a seven-membered anhydride is not what SOCl₂ does. It makes acyl chlorides.")],
         got, "both", "Every CO₂H is converted when the reagent is in excess.",
         prov("Rule S on every acid site", CH_DER), lead(di, "hexanedioic acid", "diacid + excess SOCl₂"), concepts=NAS)

    pc, _ = acyl_sub(S["phcooh"], "[*]Cl", ACID)
    pe, _ = acyl_sub(pc, "[*]OCC")
    pick(node, "u8-acl-next", "Benzoic acid meets SOCl₂, then ethanol. Pick the product.",
         [o("est", pe, "ethyl benzoate", "SOCl₂ climbs to benzoyl chloride, then ethanol takes it one step down to the ester."),
          o("acid", S["phcooh"], "benzoic acid", "The acyl chloride is attacked by ethanol, not by water, so the acid does not come back."),
          o("ring", "CCOC(=O)c1ccc(Cl)cc1", "ethyl 4-chlorobenzoate", "Cl goes onto the acyl carbon and then leaves. It never reaches the ring.")],
         [pe], "est", "Climb once with SOCl₂, then walk down to whatever derivative you need.",
         prov("Rule S twice", CH_DER), lead(S["phcooh"], "benzoic acid", "1. SOCl₂  2. ethanol"), level=2, concepts=NAS)


# ---------------------------------------------------------------------------
# u8-to-anhydride
# ---------------------------------------------------------------------------

def node_to_anhydride() -> None:
    node = "u8-to-anhydride"
    main, _ = acyl_sub(S["acetyl_cl"], "[*]OC(C)=O")
    pick(node, "u8-anm-meet", "Acetyl chloride meets sodium acetate. Pick the product.",
         [o("anh", main, "acetic anhydride", "Acetate's oxygen attacks the acyl carbon and chloride leaves. Two acetyls now share one O."),
          o("acid", S["acoh"], "acetic acid", "That needs water as the nucleophile. Here it is acetate."),
          o("dione", "CC(=O)C(C)=O", "butane-2,3-dione", "Acetate attacks through oxygen, so no C-C bond forms.")],
         [main], "anh", "A carboxylate plus an acyl chloride gives an anhydride.",
         prov("Rule S with acetate oxygen as the nucleophile", CH_DER), lead(S["acetyl_cl"], "acetyl chloride", "acetyl chloride + CH₃COO⁻"),
         level=0, concepts=NAS)

    mixed, _ = acyl_sub(S["phcocl"], "[*]OC(C)=O")
    pick(node, "u8-anm-mixed", "Benzoyl chloride meets sodium acetate. Pick the product.",
         [o("mix", mixed, "acetic benzoic anhydride", "Acetate replaces chloride on the benzoyl carbon: one acetyl and one benzoyl on one oxygen. A mixed anhydride."),
          o("ac2o", S["ac2o"], "acetic anhydride", "That has two acetyls. The benzoyl group cannot vanish from the product."),
          o("bz2o", "O=C(OC(=O)c1ccccc1)c1ccccc1", "benzoic anhydride", "That has two benzoyls. Only one benzoyl was in the flask per acetate.")],
         [mixed], "mix", "Two different acyl groups give a mixed anhydride.",
         prov("Rule S", CH_DER), lead(S["phcocl"], "benzoyl chloride", "benzoyl chloride + CH₃COO⁻"), concepts=NAS)

    sa, _ = intramolecular(S["succinic"], ACID, "[OX2H1]C=O")
    pick(node, "u8-anm-succinic", "Butanedioic acid is heated. Pick the product.",
         [o("anh", sa, "oxolane-2,5-dione", "One acid's OH attacks the other acid's carbon and water leaves. The two acyl groups close a ring through one O."),
          o("lac", S["gbl"], "oxolan-2-one", "That has lost a carbonyl. Heating a diacid keeps both C=O groups."),
          o("ene", "OC(=O)C=CC(=O)O", "but-2-enedioic acid", "Losing H₂ to make a C=C is not what heat does here. Water is what leaves.")],
         [sa], "anh", "A 1,4-diacid closes to a five-membered cyclic anhydride on heating.",
         prov("Rule S inside one molecule", CH_DER), lead(S["succinic"], "butanedioic acid", "butanedioic acid, heat"), concepts=NAS)

    glut = "OC(=O)CCCC(=O)O"
    ga, _ = intramolecular(glut, ACID, "[OX2H1]C=O")
    size = ring_size_new(glut, ga)
    ask(node, "u8-anm-ring", "Pentanedioic acid closes to its anhydride. Pick the ring size.",
        [("six", "Six-membered", "Count the ring: two C=O carbons, the three CH₂ between them, and the shared O. Five carbons and one O make six."),
         ("five", "Five-membered", "Five is butanedioic acid's ring. This chain has one more CH₂."),
         ("seven", "Seven-membered", "The carbonyl oxygens are outside the ring. Only one O is in it.")],
        {"six": 6, "five": 5, "seven": 7}, size, "six",
        "Count every atom between the two carbonyl carbons, the carbonyl carbons, and the one bridging O.",
        prov("Rule S inside one molecule; RDKit ring perception", CH_DER), lead(glut, "pentanedioic acid", "pentanedioic acid, heat"),
        concepts=NAS)

    phth = "OC(=O)c1ccccc1C(=O)O"
    pa, _ = intramolecular(phth, ACID, "[OX2H1]C=O")
    pick(node, "u8-anm-phthalic", "Benzene-1,2-dicarboxylic acid is heated. Pick the product.",
         [o("anh", pa, "2-benzofuran-1,3-dione", "The two neighbouring CO₂H groups lose water and close a five-membered anhydride on the ring."),
          o("benz", S["phcooh"], "benzoic acid", "That has lost a whole CO₂. Neither CO₂H has another C=O carbon bonded to its alpha carbon, so it does not decarboxylate."),
          o("lact", "O=C1OCc2ccccc21", "2-benzofuran-1(3H)-one", "That ring has only one C=O. Both carbonyls survive the dehydration.")],
         [pa], "anh", "Two acids on neighbouring ring carbons close to a cyclic anhydride.",
         prov("Rule S inside one molecule", CH_DER), lead(phth, "benzene-1,2-dicarboxylic acid", "the diacid, heat"), concepts=NAS)

    cands = {"h2o": "O", "co2": "O=C=O", "h2": "[HH]"}
    ask(node, "u8-anm-water", "Heating butanedioic acid to its anhydride also releases what. Pick one.",
        [("h2o", "Water", "One OH and one H come off as H₂O. The atoms balance."),
         ("co2", "Carbon dioxide", "Both carbonyl carbons stay in the anhydride, so no carbon leaves."),
         ("h2", "Hydrogen gas", "The oxygen of one OH has to go somewhere. H₂ leaves it behind.")],
        {k: k for k in cands}, byproduct([S["succinic"]], [sa], cands), "h2o",
        "Anhydride means 'without water': the ring closes by losing one H₂O.",
        prov("RDKit atom balance over three candidates", CH_DER), lead(S["succinic"], "butanedioic acid", "the diacid, heat"),
        concepts=NAS)


# ---------------------------------------------------------------------------
# u8-fischer
# ---------------------------------------------------------------------------

def node_fischer() -> None:
    node = "u8-fischer"
    main, _ = fischer(S["acoh"], "CCO")
    pick(node, "u8-fis-meet", "Acetic acid meets ethanol with H₂SO₄. Pick the ester.",
         [o("est", main, "ethyl acetate", "Ethanol's oxygen bonds to the acyl carbon and the acid's OH leaves as water."),
          o("ether", "CCOCC", "ethoxyethane", "Two ethanols can make an ether, but the question is the ester from the acid."),
          o("anh", S["ac2o"], "acetic anhydride", "That joins two acids. The alcohol is the partner here.")],
         [main], "est", "Fischer: acid plus alcohol, acid catalyst, ester plus water.",
         prov("Rule S, acid OH swapped for the alcohol O", CH_DER), lead(S["acoh"], "acetic acid", "acetic acid + ethanol, H⁺"),
         level=0, concepts=NAS)

    cands = {"h2o": "O", "h2": "[HH]", "ene": "C=C"}
    ask(node, "u8-fis-water", "Pick the second product of a Fischer esterification.",
        [("h2o", "Water", "The acid's OH and the alcohol's H leave together as H₂O. The atoms balance."),
         ("h2", "Hydrogen gas", "That leaves an oxygen over. The OH has to go somewhere."),
         ("ene", "Ethene", "Ethanol's carbons all end up in the ester. None are lost.")],
        {k: k for k in cands}, byproduct([S["acoh"], "CCO"], [main], cands), "h2o",
        "Fischer is a condensation: it releases one water.",
        prov("RDKit atom balance over three candidates", CH_DER), lead(S["acoh"], "acetic acid", "acetic acid + ethanol, H⁺"),
        concepts=NAS)

    target = canon("CCC(=O)OC")
    pairs = {"right": ("CCC(=O)O", "CO"), "swap": (S["acoh"], "CCO"), "form": ("O=CO", "CCCO")}
    ask(node, "u8-fis-retro", "Pick the pair that makes methyl propanoate.",
        [("right", "Propanoic acid + methanol", "The C=O side comes from the acid (three carbons), the O-CH₃ side from the alcohol."),
         ("swap", "Acetic acid + ethanol", "That gives ethyl acetate, an isomer with the same formula. The acyl side has only two carbons."),
         ("form", "Methanoic acid + propan-1-ol", "That gives propyl methanoate, another isomer. The carbons are on the wrong side of the ester O.")],
        {k: fischer(a, b)[0] == target for k, (a, b) in pairs.items()}, True, "right",
        "Split an ester at the single-bond C-O: the acyl half was the acid, the alkyl half the alcohol.",
        prov("Rule S run on each pair and compared with the target", CH_DER), lead(target, "methyl propanoate", "the target ester"),
        level=2, concepts=NAS)

    ha = "OCCCC(=O)O"
    lac, _ = intramolecular(ha, ACID, "[OX2H1][CX4]")
    pick(node, "u8-fis-lactone", "4-Hydroxybutanoic acid meets an acid catalyst. Pick the product.",
         [o("lac", lac, "oxolan-2-one", "The molecule's own OH attacks its acyl carbon. Water leaves and a five-membered ring ester, a lactone, closes."),
          o("thf", "C1CCOC1", "oxolane", "That has lost the C=O. Fischer keeps the carbonyl and loses the acid's OH."),
          o("ene", "C=CCC(=O)O", "but-3-enoic acid", "That is dehydration of the alcohol. With an acid in the same molecule, the ester closes instead.")],
         [lac], "lac", "An intramolecular Fischer esterification gives a lactone.",
         prov("Rule S inside one molecule", CH_DER), lead(ha, "4-hydroxybutanoic acid", "hydroxy acid, H⁺"), concepts=NAS)

    size = ring_size_new(ha, lac)
    ask(node, "u8-fis-ring", "That lactone closes a ring. Pick its size.",
        [("five", "Five-membered", "Four carbons and the ring O. The C=O oxygen sits outside the ring."),
         ("four", "Four-membered", "Count the ring O as well as the four carbons."),
         ("six", "Six-membered", "Six would need one more CH₂, as in 5-hydroxypentanoic acid.")],
        {"five": 5, "four": 4, "six": 6}, size, "five",
        "Ring size counts the carbons from C1 to the OH carbon, plus the ring oxygen.",
        prov("RDKit ring perception on the Rule S product", CH_DER), structure(lac, "oxolan-2-one", "the lactone"), concepts=NAS)

    # CONVENTION: Le Chatelier. Removing a product or adding a reactant lowers Q below K, so the forward reaction runs.
    left, right = [S["acoh"], "CCO"], [S["etoac"], "O"]
    forward = {"dry": shift("remove", "O", left, right), "wet": shift("add", "O", left, right),
               "ester": shift("add", S["etoac"], left, right)}
    ask(node, "u8-fis-drive", "Pick the change that pushes a Fischer esterification toward the ester.",
        [("dry", "Remove the water as it forms", "Water is a product. Taking it out keeps the equilibrium shifting toward ester."),
         ("wet", "Add more water", "Water is a product. Adding it pushes the equilibrium back toward acid and alcohol."),
         ("ester", "Add some ester at the start", "The ester is a product too, so adding it shifts the equilibrium backward.")],
        forward, "forward", "dry",
        "Fischer is an equilibrium: use excess alcohol or remove water to drive it.",
        prov("Le Chatelier on the balanced equation", CH_DER, "Le Chatelier's principle on the Fischer equilibrium"),
        lead(S["etoac"], "ethyl acetate", "acid + alcohol ⇌ ester + water"), concepts=NAS,
        convention="Le Chatelier's principle on the Fischer equilibrium")

    mb, _ = fischer(S["phcooh"], "CO")
    pick(node, "u8-fis-benzoate", "Benzoic acid meets methanol with H₂SO₄. Pick the ester.",
         [o("mb", mb, "methyl benzoate", "The benzoyl carbon keeps its C=O and gains O-CH₃."),
          o("pa", "CC(=O)Oc1ccccc1", "phenyl acetate", "Same formula, wrong way round: the ring is on the O and the acyl part is acetyl."),
          o("anis", "COc1ccccc1", "methoxybenzene", "That has lost the carbonyl carbon entirely.")],
         [mb], "mb", "The acid supplies the C=O half of the ester.",
         prov("Rule S", CH_DER), lead(S["phcooh"], "benzoic acid", "benzoic acid + methanol, H⁺"), concepts=NAS)


# ---------------------------------------------------------------------------
# u8-acylcl-all
# ---------------------------------------------------------------------------

def node_acylcl_all() -> None:
    node = "u8-acylcl-all"
    s = S["acetyl_cl"]
    acid, _ = acyl_sub(s, "[*]O")
    pick(node, "u8-all-meet", "Acetyl chloride meets water. Pick the product.",
         [o("acid", acid, "acetic acid", "Water attacks, chloride leaves, the C=O stays. Down two rungs to the acid."),
          o("ald", "CC=O", "acetaldehyde", "An aldehyde needs hydride. Water brings OH."),
          o("anh", S["ac2o"], "acetic anhydride", "That needs acetate as the nucleophile, not water.")],
         [acid], "acid", "Water turns an acyl chloride into the acid.",
         prov("Rule S", CH_DER), lead(s, "acetyl chloride", "acetyl chloride + H₂O"), level=0, concepts=NAS)

    est, _ = acyl_sub(s, "[*]OCC")
    pick(node, "u8-all-ester", "Acetyl chloride meets ethanol. Pick the product.",
         [o("est", est, "ethyl acetate", "Ethanol's O bonds to the acyl carbon and chloride leaves."),
          o("ket", "CCC(C)=O", "butan-2-one", "Ethanol attacks through O, not C, so no C-C bond forms."),
          o("chl", "CCCl", "chloroethane", "Chloride does not end up on the ethyl group. It leaves as HCl.")],
         [est], "est", "An acyl chloride plus an alcohol gives an ester.",
         prov("Rule S", CH_DER), lead(s, "acetyl chloride", "acetyl chloride + ethanol"), concepts=NAS)

    amd, rest = acyl_sub(s, "[*]N")
    pick(node, "u8-all-amide", "Acetyl chloride meets ammonia. Pick the product.",
         [o("amd", amd, "acetamide", "NH₃ attacks the acyl carbon, chloride leaves, and N-H is lost: an amide."),
          o("amine", "CCN", "ethanamine", "The C=O stays. Reducing to an amine would take LiAlH₄."),
          o("imide", "CC(=O)NC(C)=O", "N-acetylacetamide", "One NH₃ takes one acetyl group. The amide N is far too weak a nucleophile to be acylated again here.")],
         [amd], "amd", "An acyl chloride plus ammonia gives a primary amide.",
         prov("Rule S", CH_DER), lead(s, "acetyl chloride", "acetyl chloride + NH₃"), concepts=NAS)

    dm, _ = acyl_sub(S["phcocl"], nu_of("CNC", "[NX3;H1]"))
    pick(node, "u8-all-dimethyl", "Benzoyl chloride meets dimethylamine. Pick the product.",
         [o("dm", dm, "N,N-dimethylbenzamide", "The amine's N bonds to the acyl carbon and keeps both methyls. A tertiary amide."),
          o("nm", "CNC(=O)c1ccccc1", "N-methylbenzamide", "Both methyls stay on N. Nothing removes one."),
          o("ring", "CN(C)c1ccccc1", "N,N-dimethylaniline", "The C=O carbon is not lost. N bonds to the acyl carbon, not the ring.")],
         [dm], "dm", "A secondary amine gives an N,N-disubstituted amide.",
         prov("Rule S", CH_DER), lead(S["phcocl"], "benzoyl chloride", "benzoyl chloride + (CH₃)₂NH"), concepts=NAS)

    hcl = byproduct([s, "N"], [amd], {"hcl": "Cl", "cl2": "ClCl", "h2": "[HH]"})
    ask(node, "u8-all-two", "Acetyl chloride needs two NH₃ to make acetamide. Pick why.",
        [("hcl", "HCl forms and ties up the second NH₃", "Each substitution releases HCl. A second NH₃ takes that proton as NH₄⁺ so the first is not used up."),
         ("cl2", "Cl₂ forms and needs trapping", "The leftover atoms are H and Cl, which make HCl. No Cl₂ forms."),
         ("h2", "Both NH₃ bond to the acyl carbon", "The C=O comes back after one substitution. Only one N ends on the carbon.")],
        {"hcl": "hcl", "cl2": "cl2", "h2": None}, hcl, "hcl",
        "Amines are bases, so a second equivalent (or pyridine) mops up the HCl.",
        prov("RDKit atom balance names HCl; ammonia as the base", CH_DER, "a second equivalent of amine neutralises the HCl"),
        lead(s, "acetyl chloride", "acetyl chloride + 2 NH₃"), level=2, concepts=NAS,
        convention="a second equivalent of amine neutralises the HCl")

    rows = [("w", "H₂O", "[*]O"), ("a", "CH₃OH", "[*]OC"), ("n", "CH₃NH₂", "[*]NC"), ("c", "CH₃COO⁻", "[*]OC(C)=O")]
    whys = {"carboxylic acid": "Water gives the acid.", "ester": "An alcohol gives the ester.",
            "amide": "An amine gives the amide.", "anhydride": "A carboxylate gives the anhydride."}
    pairs = []
    for pid, left, nu in rows:
        k = acyl_class(acyl_sub(s, nu)[0])
        pairs.append((pid, left, k.capitalize(), whys[k], k.capitalize()))
    match(node, "u8-all-match", "Match each partner to what acetyl chloride makes with it.",
          "Every one is downhill from the top rung.", pairs,
          "Acyl chlorides make every lower derivative: acid, ester, amide, anhydride.",
          prov("Rule S on each pair; product class read by SMARTS", CH_DER), NAS)


# ---------------------------------------------------------------------------
# u8-anhydride
# ---------------------------------------------------------------------------

def node_anhydride() -> None:
    node = "u8-anhydride"
    s = S["ac2o"]
    est, rest = acyl_sub(s, "[*]OC")
    pick(node, "u8-anh-meet", "Acetic anhydride meets methanol. Pick the ester.",
         [o("est", est, "methyl acetate", "Methanol attacks one acyl carbon; the other half leaves as acetic acid."),
          o("di", "COC(C)(C)OC", "2,2-dimethoxypropane", "The C=O reforms after the leaving group goes. No second methanol adds."),
          o("acid", S["acoh"], "acetic acid", "Acetic acid is the leaving group, not the ester product.")],
         [est], "est", "Anhydrides acylate alcohols just like acyl chlorides, a little slower.",
         prov("Rule S", CH_DER), lead(s, "acetic anhydride", "acetic anhydride + methanol"), level=0, concepts=NAS)

    pick(node, "u8-anh-waste", "Acetic anhydride makes methyl acetate. Pick the other product.",
         [o("acid", rest[0], "acetic acid", "The leaving group is acetate, which picks up methanol's H. One acetyl is spent as acetic acid."),
          o("meoh", "CO", "methanol", "Methanol was the nucleophile. Its O ends up in the ester."),
          o("ald", "CC=O", "acetaldehyde", "Nothing is reduced. The leaving half keeps its C=O and its O, as an acid.")],
         list(rest), "acid", "One acyl group is wasted as the carboxylic acid.",
         prov("Rule S leaving fragment", CH_DER), lead(s, "acetic anhydride", "acetic anhydride + methanol"), concepts=NAS)

    amd, _ = acyl_sub(s, "[*]N")
    pick(node, "u8-anh-amide", "Acetic anhydride meets ammonia. Pick the product.",
         [o("amd", amd, "acetamide", "N bonds to an acyl carbon and acetate leaves: an amide."),
          o("imide", "CC(=O)NC(C)=O", "N-acetylacetamide", "Only one acyl group transfers per NH₃. The other leaves as acetate."),
          o("amine", "CCN", "ethanamine", "The C=O stays through acyl substitution.")],
         [amd], "amd", "Anhydride plus amine gives amide plus carboxylic acid.",
         prov("Rule S", CH_DER), lead(s, "acetic anhydride", "acetic anhydride + NH₃"), concepts=NAS)

    main, rest = acyl_sub(s, "[*]O")
    prods = sorted([main, *rest])
    ask(node, "u8-anh-water", "Acetic anhydride meets water. Pick the products.",
        [("two", "Two acetic acid", "Water attacks one acyl carbon, acetate leaves and takes an H. Both halves end as acetic acid."),
         ("one", "One acetic acid and ethanol", "No acyl carbon is reduced. Both halves keep their C=O."),
         ("est", "Ethyl acetate", "That needs ethanol. Water only splits the anhydride.")],
        {"two": sorted([S["acoh"], S["acoh"]]), "one": None, "est": None}, [canon(x) for x in prods], "two",
        "Hydrolysis of a symmetric anhydride gives two of the same acid.",
        prov("Rule S", CH_DER), lead(s, "acetic anhydride", "acetic anhydride + H₂O"), concepts=NAS)

    sal = "OC(=O)c1ccccc1O"
    asp, _ = acyl_sub(s, nu_of(sal, "[OX2H]c"))
    pick(node, "u8-anh-aspirin", "2-Hydroxybenzoic acid meets acetic anhydride. Pick the product.",
         [o("asp", asp, "2-(acetyloxy)benzoic acid", "The phenol O attacks an acyl carbon of the anhydride. The ring O ends up acetylated: aspirin."),
          o("me", "COC(=O)c1ccccc1O", "methyl 2-hydroxybenzoate", "No methanol is present. The acetyl goes on the phenol, not a methyl on the acid."),
          o("fc", "CC(=O)c1ccc(O)c(C(=O)O)c1", "5-acetyl-2-hydroxybenzoic acid", "Acetyl on the ring carbon needs Friedel-Crafts with AlCl₃. Here the O-H is the nucleophile.")],
         [asp], "asp", "Phenols are acylated by anhydrides at oxygen.",
         prov("Rule S with the phenol O as the nucleophile", CH_DER), lead(sal, "2-hydroxybenzoic acid", "+ acetic anhydride"),
         level=2, concepts=NAS)

    half, _ = acyl_sub("O=C1CCC(=O)O1", "[*]OC")
    pick(node, "u8-anh-cyclic", "Oxolane-2,5-dione meets methanol. Pick the product.",
         [o("half", half, "4-methoxy-4-oxobutanoic acid", "Methanol opens the ring at one acyl carbon. The leaving acid stays attached, so one molecule holds the ester and the acid."),
          o("di", "COC(=O)CCC(=O)OC", "dimethyl butanedioate", "That needs a second methanol on the acid end, a Fischer step this does not do."),
          o("lac", S["gbl"], "oxolan-2-one", "That ring has one C=O. Methanol opens the anhydride, it does not reduce it.")],
         [half], "half", "A cyclic anhydride opens to one molecule: half ester, half acid.",
         prov("Rule S; the leaving group stays in the same molecule", CH_DER), lead("O=C1CCC(=O)O1", "oxolane-2,5-dione", "cyclic anhydride + methanol"),
         level=2, concepts=NAS)

    pair = {"cl": S["acetyl_cl"], "anh": S["ac2o"], "est": S["etoac"]}
    best = max(pair, key=lambda k: rank(pair[k]))
    pick(node, "u8-anh-vs", "Pick the fastest of these at acetylating an amine.",
         [o("cl", pair["cl"], "acetyl chloride", "Top rung: chloride is the best leaving group here, so it reacts fastest."),
          o("anh", pair["anh"], "acetic anhydride", "Close behind, one rung lower. Often chosen because it is easier to handle."),
          o("est", pair["est"], "ethyl acetate", "An ester sits lower still. Ethoxide is a poor leaving group.")],
         [pair[best]], "cl", "Acyl chloride, then anhydride, then ester: the ladder sets the speed.",
         prov("ladder rank looked up by SMARTS class", CH_DER, LADDER_CONV), lead(s, "acetic anhydride", "three acetylating agents"),
         concepts=LAD, convention=LADDER_CONV)


# ---------------------------------------------------------------------------
# u8-hydrolysis
# ---------------------------------------------------------------------------

def node_hydrolysis() -> None:
    node = "u8-hydrolysis"
    s = S["etoac"]
    acid, rest = hydrolyse(s)
    pick(node, "u8-hyd-meet", "Ethyl acetate is heated with H₃O⁺. Pick the acid formed.",
         [o("acid", acid, "acetic acid", "Water attacks the acyl carbon and ethanol leaves. Fischer esterification run backwards."),
          o("ald", "CC=O", "acetaldehyde", "Hydrolysis keeps the oxidation level. Making an aldehyde would need a reducing agent."),
          o("ether", "CCOCC", "ethoxyethane", "The C=O carbon is not reduced. Water swaps the OEt for OH.")],
         [acid], "acid", "Acid hydrolysis: ester plus water gives acid plus alcohol, reversibly.",
         prov("Rule S with water", CH_DER), lead(s, "ethyl acetate", "ethyl acetate + H₃O⁺, heat"), level=0, concepts=NAS)

    carb, _ = saponify(S["phcoome"])
    pick(node, "u8-hyd-sapon", "Methyl benzoate is heated with NaOH. Pick the organic anion.",
         [o("carb", carb, "benzoate", "Hydroxide swaps OCH₃ for OH, then the acid is deprotonated straight away by base. Benzoate stays until workup."),
          o("acid", S["phcooh"], "benzoic acid", "In NaOH the acid cannot survive: it loses its proton. Benzoic acid only appears after acid workup."),
          o("alc", "OCc1ccccc1", "phenylmethanol", "That is a reduction product. Hydroxide does not deliver hydride.")],
         [carb], "carb", "Saponification ends at the carboxylate.",
         prov("Rule S with water, then the CO2H deprotonated", CH_DER), lead(S["phcoome"], "methyl benzoate", "an aryl ester + NaOH"),
         concepts=NAS)

    ladder_ok = rank(carb) == min(RANK.values())
    ask(node, "u8-hyd-irrev", "Pick why saponification does not run backwards.",
        [("bottom", "The carboxylate is the ladder's bottom rung", "A carboxylate has no leaving group to lose and repels nucleophiles. Nothing pulls it back up to the ester."),
         ("boil", "The alcohol boils off", "The alcohol stays in the flask. The reason is the carboxylate, not a lost product."),
         ("cat", "NaOH is only a catalyst", "Hydroxide is used up: one per ester. That is why it is not catalytic.")],
        {"bottom": True, "boil": None, "cat": False}, ladder_ok, "bottom",
        "Base hydrolysis is irreversible because it ends on the bottom rung.",
        prov("ladder rank of the Rule S product", CH_DER, LADDER_CONV),
        structure(carb, "benzoate", "the end of saponification"), concepts=LAD, convention=LADDER_CONV)

    pa = "CCCOC(C)=O"
    _, rest = hydrolyse(pa)
    pick(node, "u8-hyd-alcohol", "Propyl acetate is hydrolysed. Pick the alcohol released.",
         [o("pr", "CCCO", "propan-1-ol", "The O-propyl side leaves with the O. It picks up H and becomes propan-1-ol."),
          o("et", "CCO", "ethanol", "Ethanol would come from an ethyl ester. The two-carbon part here is the acetyl, which becomes the acid."),
          o("ipr", "CC(C)O", "propan-2-ol", "The O is on the end carbon of the propyl group, so the alcohol is primary.")],
         list(rest), "pr", "Hydrolysis returns the alcohol that made the ester.",
         prov("Rule S leaving fragment", CH_DER), lead(pa, "propyl acetate", "propyl acetate + H₃O⁺"), concepts=NAS)

    hyd, _ = saponify(S["dvl"])
    pick(node, "u8-hyd-lactone", "Oxan-2-one is heated with NaOH. Pick the product.",
         [o("open", hyd, "5-hydroxypentanoate", "The ring ester opens. Because the leaving O is in the same molecule, one chain holds both the carboxylate and the OH."),
          o("diol", "OCCCCCO", "pentane-1,5-diol", "That is the LiAlH₄ product. Hydroxide does not reduce."),
          o("acid", "CCCCC(=O)[O-]", "pentanoate", "The ring oxygen stays as an OH on C5. It does not leave the molecule.")],
         [hyd], "open", "Saponifying a lactone gives a hydroxy carboxylate.",
         prov("Rule S with water on the ring ester, then deprotonation", CH_DER), lead(S["dvl"], "oxan-2-one", "lactone + NaOH"),
         concepts=NAS)

    got = acyl_sub_all(S["triacetin"], "[*]O", ESTER_L)
    n_acid = sum(1 for g in got if acyl_class(g) == "carboxylic acid")
    ask(node, "u8-hyd-fat", "Propane-1,2,3-triyl triacetate is saponified. Pick the acetate count.",
        [("three", "Three acetates per molecule", "Each of the three esters is hydrolysed. Glycerol is left and three acetate ions form."),
         ("one", "One acetate per molecule", "All three ester groups react with excess base, not just one."),
         ("two", "Two acetates per molecule", "There are three ester carbonyls. Count the C=O groups.")],
        {"three": 3, "one": 1, "two": 2}, n_acid, "three",
        "Each ester gives one carboxylate, and the backbone is left as glycerol.",
        prov("Rule S on every ester site", CH_DER), lead(S["triacetin"], "propane-1,2,3-triyl triacetate", "a triester + NaOH"),
        level=2, concepts=NAS)

    gly = [g for g in got if acyl_class(g) == "none"]
    pick(node, "u8-hyd-glycerol", "Propane-1,2,3-triyl triacetate is saponified. Pick the alcohol left.",
         [o("gly", "OCC(O)CO", "propane-1,2,3-triol", "Every ester O stays on the three-carbon backbone and becomes OH: glycerol."),
          o("diol", "CC(O)CO", "propane-1,2-diol", "All three carbons carried an ester O, so all three end with OH."),
          o("prop", "CCCO", "propan-1-ol", "Two of the OH groups are missing. Each ester gives back its own OH.")],
         gly, "gly", "Glycerol is the backbone left when a glycerol triester is saponified.",
         prov("Rule S on every ester site", CH_DER), lead(S["triacetin"], "propane-1,2,3-triyl triacetate", "the triester backbone"),
         concepts=NAS)


# ---------------------------------------------------------------------------
# u8-transester
# ---------------------------------------------------------------------------

def node_transester() -> None:
    node = "u8-transester"
    s = S["meoac"]
    est, rest = acyl_sub(s, "[*]OCC", ESTER_L)
    pick(node, "u8-tre-meet", "Methyl acetate meets ethanol with H⁺. Pick the new ester.",
         [o("est", est, "ethyl acetate", "Ethanol's O replaces methanol's O on the acyl carbon. Same rung, new alkyl group."),
          o("acid", S["acoh"], "acetic acid", "That would need water. The nucleophile here is ethanol."),
          o("same", "CCC(=O)OC", "methyl propanoate", "The acyl part does not grow. The swap is on the O side.")],
         [est], "est", "Transesterification swaps the alkoxy group of an ester.",
         prov("Rule S", CH_DER), lead(s, "methyl acetate", "CH₃COOCH₃ + ethanol, H⁺"), level=0, concepts=NAS)

    pick(node, "u8-tre-out", "Methyl acetate becomes ethyl acetate. Pick the alcohol released.",
         [o("meoh", rest[0], "methanol", "The old OCH₃ leaves and picks up H."),
          o("etoh", "CCO", "ethanol", "Ethanol went in. Its O is now in the ester."),
          o("acid", "CC(=O)O", "acetic acid", "No water is present to make the acid. One alcohol is traded for another.")],
         list(rest), "meoh", "One alcohol in, the other alcohol out.",
         prov("Rule S leaving fragment", CH_DER), lead(s, "methyl acetate", "methyl acetate + ethanol, H⁺"), concepts=NAS)

    eb, _ = acyl_sub(S["phcoome"], "[*]OCC", ESTER_L)
    pick(node, "u8-tre-base", "Methyl benzoate meets NaOCH₂CH₃ in ethanol. Pick the ester.",
         [o("eb", eb, "ethyl benzoate", "Ethoxide adds, methoxide leaves. Base works as well as acid for this swap."),
          o("carb", "O=C([O-])c1ccccc1", "benzoate", "No water or hydroxide is present, so the acid salt cannot form."),
          o("ket", "CCC(=O)c1ccccc1", "1-phenylpropan-1-one", "Ethoxide attacks through O. A C-C bond would need a carbon nucleophile.")],
         [eb], "eb", "Alkoxide in its own alcohol gives transesterification.",
         prov("Rule S", CH_DER), lead(S["phcoome"], "methyl benzoate", "C₆H₅COOCH₃ + CH₃CH₂O⁻"), concepts=NAS)

    ask(node, "u8-tre-excess", "Pick how to push methyl acetate fully to ethyl acetate.",
        [("solvent", "Use ethanol as the solvent", "The swap is an equilibrium. A huge excess of ethanol shifts it toward the ethyl ester."),
         ("meoh", "Add extra methanol", "Methanol is a product. Adding it pushes back toward methyl acetate."),
         ("heat", "Use one equivalent of ethanol", "One to one leaves a mixture. Equilibria need a push.")],
        {"solvent": shift("add", "CCO", [s, "CCO"], [est, "CO"]), "meoh": shift("add", "CO", [s, "CCO"], [est, "CO"]), "heat": None},
        "forward", "solvent",
        "Transesterification is driven by using the new alcohol in excess.",
        prov("Le Chatelier on the balanced equation", CH_DER, "Le Chatelier's principle on the transesterification equilibrium"),
        lead(s, "methyl acetate", "ester ⇌ ester"), concepts=NAS,
        convention="Le Chatelier's principle on the transesterification equilibrium")

    got = acyl_sub_all(S["triacetin"], "[*]OC", ESTER_L)
    n_me = sum(1 for g in got if canon(g) == canon(S["meoac"]))
    ask(node, "u8-tre-biodiesel", "Propane-1,2,3-triyl triacetate meets excess methanol and acid. Pick the products.",
        [("three", "Three methyl acetate and glycerol", "Each of the three esters swaps to a methyl ester; the backbone leaves as glycerol. Fats make biodiesel by the same swap."),
         ("one", "One methyl acetate and a diester", "Excess methanol takes all three, not one."),
         ("acid", "Three acetic acid and glycerol", "That is hydrolysis. With methanol the products are methyl esters.")],
        {"three": 3, "one": 1, "acid": 0}, n_me, "three",
        "Transesterifying a glycerol triester with methanol gives three methyl esters and glycerol.",
        prov("Rule S on every ester site", CH_DER), lead(S["triacetin"], "propane-1,2,3-triyl triacetate", "triester + CH₃OH, H⁺"),
        level=2, concepts=NAS)

    pp, _ = acyl_sub("CCOC(=O)CC", "[*]OCCC", ESTER_L)
    pick(node, "u8-tre-propyl", "Ethyl propanoate meets excess propan-1-ol with H⁺. Pick the ester.",
         [o("pp", pp, "propyl propanoate", "Propanol's O replaces the ethoxy group. The acyl part, propanoyl, is untouched."),
          o("ep", "CCCC(=O)OCC", "ethyl butanoate", "Same formula, but the acyl chain grew. The swap happens on the O side."),
          o("pac", "CCCOC(C)=O", "propyl acetate", "The acyl group stays propanoyl. Only the alkoxy part changes.")],
         [pp], "pp", "Keep the acyl part, trade the alkoxy part.",
         prov("Rule S", CH_DER), lead("CCOC(=O)CC", "ethyl propanoate", "+ propan-1-ol, H⁺"), concepts=NAS)


# ---------------------------------------------------------------------------
# u8-amide-hyd
# ---------------------------------------------------------------------------

def node_amide_hyd() -> None:
    node = "u8-amide-hyd"
    s = S["acetamide"]
    acid, rest = hydrolyse(s)
    pick(node, "u8-amh-meet", "Acetamide is heated a long time in H₃O⁺. Pick the organic product.",
         [o("acid", acid, "acetic acid", "Water replaces NH₂ on the acyl carbon. NH₃ leaves and ends up as NH₄⁺ in acid."),
          o("amine", "CCN", "ethanamine", "That reduces C=O to CH₂, which takes LiAlH₄."),
          o("nitrile", "CC#N", "acetonitrile", "That removes water from the amide, the opposite of hydrolysis.")],
         [acid], "acid", "Amide hydrolysis gives the acid and the amine (as its salt).",
         prov("Rule S with water", CH_DER), lead(s, "acetamide", "acetamide + H₃O⁺, heat"), level=0, concepts=NAS)

    nmb = "CNC(=O)c1ccccc1"
    _, rest = hydrolyse(nmb)
    pick(node, "u8-amh-amine", "N-Methylbenzamide is heated in NaOH. Pick the amine released.",
         [o("mea", rest[0], "methanamine", "The C-N bond to the acyl carbon is cut. The N keeps its methyl and leaves as CH₃NH₂."),
          o("ani", "Nc1ccccc1", "aniline", "The ring is on the acyl side. It ends in the benzoate, not the amine."),
          o("bza", "NCc1ccccc1", "phenylmethanamine", "That would need the C=O reduced to CH₂. Hydrolysis cuts the C-N bond instead.")],
         list(rest), "mea", "The amine half is whatever was on the nitrogen.",
         prov("Rule S leaving fragment", CH_DER), lead(nmb, "N-methylbenzamide", "N-methylbenzamide + NaOH, heat"), concepts=NAS)

    lact = "O=C1CCCN1"
    op, _ = saponify(lact)
    pick(node, "u8-amh-lactam", "Pyrrolidin-2-one is heated in NaOH. Pick the product.",
         [o("open", op, "4-aminobutanoate", "The ring amide opens. The N stays in the same molecule as an NH₂ on the end carbon."),
          o("ring", "C1CCNC1", "pyrrolidine", "That is the LiAlH₄ product, C=O to CH₂ with the ring intact."),
          o("acid", "CCCC(=O)[O-]", "butanoate", "The nitrogen stays in the chain as NH₂. It does not leave the molecule.")],
         [op], "open", "Hydrolysing a lactam gives an amino carboxylate.",
         prov("Rule S with water on the ring amide, then deprotonation", CH_DER), lead(lact, "pyrrolidin-2-one", "lactam + NaOH, heat"),
         concepts=NAS)

    dip = "CC(NC(=O)CN)C(=O)O"
    main, rest = hydrolyse(dip, "[CX3](=[OX1])-[NX3]")
    halves = sorted(canon(x) for x in [main, *rest])
    ask(node, "u8-amh-peptide", "This dipeptide is hydrolysed. Pick the two products.",
        [("aa", "Glycine and alanine", "The one amide bond is cut. The acyl half is glycine, the amine half is alanine."),
         ("gly", "Two glycine", "The right-hand residue carries a CH₃ on its alpha carbon, so it is alanine."),
         ("one", "One amino acid and NH₃", "The N stays on the alanine half. It does not leave as ammonia.")],
        {"aa": sorted([canon("NCC(=O)O"), canon("CC(N)C(=O)O")]), "gly": [canon("NCC(=O)O")] * 2, "one": None}, halves, "aa",
        "A peptide bond is an amide; hydrolysis splits it into the two amino acids.",
        prov("Rule S on the amide", CH_DER), lead(dip, "2-[(2-aminoacetyl)amino]propanoic acid", "a dipeptide + H₃O⁺"),
        level=2, concepts=NAS)

    pair = {"amd": S["acetamide"], "est": S["etoac"]}
    ask(node, "u8-amh-why", "Pick why esters hydrolyse more easily than amides.",
        [("lower", "Amides sit a rung lower on the ladder", "The amide is lower: its nitrogen is a worse leaving group and donates more into the C=O."),
         ("same", "They sit on the same rung", "They do not: ester and acid share a rung, amides are below them."),
         ("higher", "Amides sit a rung higher", "Higher would mean faster. Amides are the slowest neutral derivative.")],
        {"lower": "lower", "same": "same", "higher": "higher"},
        "lower" if rank(pair["amd"]) < rank(pair["est"]) else "same" if rank(pair["amd"]) == rank(pair["est"]) else "higher", "lower",
        "Amide hydrolysis needs forcing conditions because amides are low on the ladder.",
        prov("ladder ranks compared", CH_DER, LADDER_CONV), lead(S["acetamide"], "acetamide", "amide and ester"),
        concepts=LAD, convention=LADDER_CONV)

    cards = [
        ("cl", "Acetyl chloride", S["acetyl_cl"], "acetyl chloride", "Chloride leaves best: the top rung."),
        ("anh", "Acetic anhydride", S["ac2o"], "acetic anhydride", "A carboxylate leaves: one rung down."),
        ("est", "Ethyl acetate", S["etoac"], "ethyl acetate", "An alkoxide leaves: the middle rung."),
        ("amd", "Acetamide", S["acetamide"], "acetamide", "Nitrogen leaves worst of the neutral ones."),
        ("carb", "Acetate", S["acetate"], "acetate", "Negative and no leaving group: the bottom."),
    ]
    ladder(node, "u8-amh-ladder", cards, lambda s: -rank(s),
           "Rank by reactivity toward nucleophiles, most reactive first.",
           "Name the group on the C=O carbon, then place it. The carboxylate goes below the amide.",
           "acyl_reactivity", ("Most reactive", "Least reactive"),
           "Rank acetyl chloride, acetic anhydride, ethyl acetate, acetamide and acetate by reactivity toward nucleophilic acyl substitution, most reactive first.",
           ("Acyl chloride, anhydride, ester, amide, carboxylate.", "The better the leaving group, the higher the rung.",
            "Look at the atom bonded to the acyl carbon."),
           [("reversed", ["carb", "amd", "est", "anh", "cl"], "ordering_is_reversed",
             ("The ladder read from the bottom.", "Acyl chlorides react fastest.", "Put acetyl chloride first.")),
            ("amd-carb", ["cl", "anh", "est", "carb", "amd"], "ordering_one_adjacent_pair_swapped",
             ("Carboxylate above amide.", "A carboxylate is negative and has no leaving group, so it is the bottom rung.", "Compare acetamide and acetate."))],
           "Every downhill step on this ladder runs on its own; amides and carboxylates are where reactions stop.",
           prov("ladder rank per card", CH_DER, LADDER_CONV), LAD, "nucleophilic_acyl_substitution")


# ---------------------------------------------------------------------------
# u8-nitrile
# ---------------------------------------------------------------------------

def node_nitrile() -> None:
    node = "u8-nitrile"
    br = "CCCCBr"
    nit, _ = sn2(br, "[*]C#N")
    pick(node, "u8-nit-meet", "1-Bromobutane meets NaCN. Pick the product.",
         [o("nit", nit, "pentanenitrile", "Cyanide's carbon displaces bromide in an SN2. The chain gains the C≡N carbon."),
          o("short", "CCCC#N", "butanenitrile", "That forgets the cyanide carbon. The new C-C bond adds one carbon."),
          o("iso", "CCCC[N+]#[C-]", "1-isocyanobutane", "That bonds through N. Cyanide attacks through carbon here.")],
         [nit], "nit", "R-X plus cyanide gives a nitrile one carbon longer.",
         prov("SN2 edit: C-Br swapped for C-CN", CH_ACID), lead(br, "1-bromobutane", "1-bromobutane + NaCN"), level=0, concepts=SUB)

    ask(node, "u8-nit-count", "1-Bromobutane becomes a nitrile. Pick its carbon count.",
        [("five", "Five carbons", "Four from the butyl group, one from cyanide."),
         ("four", "Four carbons", "The nitrile carbon is a new carbon, so the count goes up."),
         ("six", "Six carbons", "Only one cyanide adds. One new carbon.")],
        {"five": 5, "four": 4, "six": 6}, carbons(nit), "five",
        "Cyanide is a one-carbon chain extension.",
        prov("RDKit carbon count of the SN2 product", CH_ACID), lead(br, "1-bromobutane", "1-bromobutane + NaCN"), concepts=SUB)

    acid = [x for x in nitrile_hydrolysis(nit) if acyl_class(x) == "carboxylic acid"]
    pick(node, "u8-nit-acid", "Pentanenitrile is heated in H₃O⁺. Pick the organic product.",
         [o("acid", acid[0], "pentanoic acid", "Full hydrolysis: the nitrile carbon ends with C=O and OH, and the N leaves as ammonium."),
          o("amine", "CCCCCN", "pentan-1-amine", "That is the LiAlH₄ product. Water and acid do not reduce."),
          o("short", "CCCC(=O)O", "butanoic acid", "The nitrile carbon stays. It becomes the carboxyl carbon.")],
         acid, "acid", "Nitrile plus water, heat, gives the acid.",
         prov("Rule N, N swapped for O and OH", CH_ACID), lead(nit, "pentanenitrile", "pentanenitrile + H₃O⁺, heat"), concepts=ACIDS)

    part = [x for x in nitrile_hydrolysis(S["phcn"], full=False) if acyl_class(x) == "amide"]
    pick(node, "u8-nit-partial", "Benzonitrile is partly hydrolysed. Pick the product.",
         [o("amd", part[0], "benzamide", "One water adds and the C≡N becomes C(=O)NH₂: the amide, halfway to the acid."),
          o("acid", S["phcooh"], "benzoic acid", "That is full hydrolysis, one step further."),
          o("amine", "NCc1ccccc1", "phenylmethanamine", "That is a reduction. Water adds O, not H.")],
         part, "amd", "The amide is the halfway point between nitrile and acid.",
         prov("Rule N, partial", CH_ACID), lead(S["phcn"], "benzonitrile", "benzonitrile + H₂O"), concepts=ACIDS)

    dn = dehydrate_amide("CCCC(N)=O")
    pick(node, "u8-nit-dehyd", "Butanamide meets SOCl₂. Pick the organic product.",
         [o("nit", [x for x in dn if x != "O"][0], "butanenitrile", "SOCl₂ pulls the C=O oxygen off a primary amide and the C-N becomes C≡N."),
          o("cl", "CCCC(=O)Cl", "butanoyl chloride", "An amide's NH₂ does not swap for Cl. SOCl₂ dehydrates a primary amide."),
          o("amine", "CCCCN", "butan-1-amine", "Nothing here adds hydride. The carbon keeps three bonds to N.")],
         dn, "nit", "Dehydrating a primary amide gives the nitrile.",
         prov("Rule N, the amide's C=O oxygen removed", CH_ACID), lead("CCCC(N)=O", "butanamide", "butanamide + SOCl₂"), concepts=ACIDS)

    k = [x for x in nitrile_grignard(S["phcn"], "C") if x != "N"]
    pick(node, "u8-nit-grignard", "Benzonitrile meets CH₃MgBr, then H₃O⁺. Pick the product.",
         [o("ket", k[0], "1-phenylethan-1-one", "Methyl adds to the nitrile carbon once, giving an imine anion. Workup hydrolyses the imine to the ketone."),
          o("alc", "CC(C)(O)c1ccccc1", "2-phenylpropan-2-ol", "A second methyl cannot add: the imine anion is negative and does not react again."),
          o("amine", "CC(N)c1ccccc1", "1-phenylethan-1-amine", "Workup is hydrolysis, not reduction. The N leaves and O comes in.")],
         k, "ket", "A Grignard on a nitrile gives a ketone after hydrolysis.",
         prov("Rule N, one carbon nucleophile then N swapped for O", CH_ACID), lead(S["phcn"], "benzonitrile", "1. CH₃MgBr  2. H₃O⁺"),
         level=2, concepts=NUCC)


# ---------------------------------------------------------------------------
# u8-lialh4
# ---------------------------------------------------------------------------

LAH_CONV = "LiAlH4 reduces every acid derivative and nitrile"


def node_lialh4() -> None:
    node = "u8-lialh4"
    got = lialh4(S["mebut"])
    pick(node, "u8-lah-meet", "Methyl butanoate meets LiAlH₄, then H₃O⁺. Pick the main product.",
         [o("ol", "CCCCO", "butan-1-ol", "Two hydrides reach the acyl carbon: the ester is cut to the aldehyde, which is reduced again to CH₂OH. Methanol is released."),
          o("ald", "CCCC=O", "butanal", "The aldehyde forms on the way but LiAlH₄ is strong enough to reduce it at once."),
          o("acid", S["buacid"], "butanoic acid", "That is hydrolysis. Hydride takes the carbon down, not sideways.")],
         got, "ol", "LiAlH₄ takes an ester all the way to the primary alcohol.",
         prov("Rule R with LiAlH4", CH_DER, LAH_CONV), lead(S["mebut"], "methyl butanoate", "methyl butanoate + LiAlH₄"),
         level=0, concepts=RED, convention=LAH_CONV)

    got = lialh4(S["phcooh"])
    pick(node, "u8-lah-acid", "Benzoic acid meets LiAlH₄, then H₃O⁺. Pick the product.",
         [o("ol", "OCc1ccccc1", "phenylmethanol", "The acid carbon is reduced to CH₂OH. LiAlH₄ is one of the few reagents strong enough for an acid."),
          o("ald", "O=Cc1ccccc1", "benzaldehyde", "The aldehyde does not survive LiAlH₄. It is reduced further."),
          o("tol", "Cc1ccccc1", "toluene", "The oxygen stays as OH. Hydride does not remove it.")],
         got, "ol", "Acids reduce to primary alcohols with LiAlH₄.",
         prov("Rule R with LiAlH4", CH_ACID, LAH_CONV), lead(S["phcooh"], "benzoic acid", "benzoic acid + LiAlH₄"),
         concepts=RED, convention=LAH_CONV)

    amd = "CN(C)C(=O)c1ccccc1"
    got = lialh4(amd)
    pick(node, "u8-lah-amide", "N,N-Dimethylbenzamide meets LiAlH₄, then H₂O. Pick the product.",
         [o("amine", got[0], "N,N-dimethyl-1-phenylmethanamine", "An amide loses its C=O oxygen: the carbon becomes CH₂ and keeps the N. An amine."),
          o("alc", "OCc1ccccc1", "phenylmethanol", "The N is not lost. Amides keep their C-N bond and lose the O instead."),
          o("ald", "O=Cc1ccccc1", "benzaldehyde", "That would cut the C-N bond and stop. LiAlH₄ on an amide goes to the amine.")],
         got, "amine", "LiAlH₄ turns an amide into an amine: C=O becomes CH₂.",
         prov("Rule R with LiAlH4, amide O removed", CH_DER, LAH_CONV), lead(amd, "N,N-dimethylbenzamide", "amide + LiAlH₄"),
         concepts=RED, convention=LAH_CONV)

    got = lialh4("CCCC#N")
    pick(node, "u8-lah-nitrile", "Butanenitrile meets LiAlH₄, then H₂O. Pick the product.",
         [o("amine", got[0], "butan-1-amine", "Two hydrides add across C≡N. The carbon ends as CH₂ and the N as NH₂."),
          o("ald", "CCCC=O", "butanal", "That is the DIBAL-H result after hydrolysis. LiAlH₄ keeps going."),
          o("short", "CCCN", "propan-1-amine", "The nitrile carbon stays and becomes the CH₂ next to N.")],
         got, "amine", "Nitriles reduce to primary amines.",
         prov("Rule R with LiAlH4, C≡N to CH2-NH2", CH_ACID, LAH_CONV), lead("CCCC#N", "butanenitrile", "nitrile + LiAlH₄"),
         concepts=RED, convention=LAH_CONV)

    got = lialh4(S["gbl"])
    pick(node, "u8-lah-lactone", "Oxolan-2-one meets LiAlH₄, then H₃O⁺. Pick the product.",
         [o("diol", got[0], "butane-1,4-diol", "The ring ester is cut and the acyl carbon becomes CH₂OH. The ring O stays on the other end as OH."),
          o("thf", "C1CCOC1", "oxolane", "That keeps the ring and removes the C=O oxygen. Esters do not lose O like amides do."),
          o("acid", "OCCCC(=O)O", "4-hydroxybutanoic acid", "That is hydrolysis. Hydride reduces the acyl carbon.")],
         got, "diol", "A lactone reduces to a diol.",
         prov("Rule R with LiAlH4 on the ring ester", CH_DER, LAH_CONV), lead(S["gbl"], "oxolan-2-one", "lactone + LiAlH₄"),
         concepts=RED, convention=LAH_CONV)

    rows = [("e", "Ethyl acetate", S["etoac"]), ("a", "N,N-Dimethylacetamide", S["dma"]), ("n", "Acetonitrile", "CC#N"),
            ("k", "Acetic acid", S["acoh"])]
    whys = {"primary alcohol": "Ester or acid carbon to CH₂OH.", "tertiary amine": "C=O to CH₂; the N keeps both methyls.",
            "primary amine": "C≡N to CH₂NH₂."}
    pairs = []
    names = {"primary alcohol": "Ethanol", "tertiary amine": "Tertiary amine", "primary amine": "Primary amine"}
    for pid, left, smi in rows:
        prods = [p for p in lialh4(smi) if p != "O"]
        kinds = sorted({kind_of(p) for p in prods})
        derived = names[kinds[0]] if len(kinds) == 1 else None
        if derived == "Ethanol" and len(prods) == 2:
            derived = "Ethanol (two of it)"
        right = "Ethanol (two of it)" if pid == "e" else {"a": "Tertiary amine", "n": "Primary amine", "k": "Ethanol"}[pid]
        why = "Both halves of ethyl acetate end as ethanol." if pid == "e" else whys[kinds[0]]
        pairs.append((pid, left, right, why, derived))
    match(node, "u8-lah-match", "Match each compound to what LiAlH₄ makes from it.",
          "Esters and acids keep the C=O oxygen in CH₂OH. Amides lose it and keep the N; nitriles keep the N.", pairs,
          "LiAlH₄ reduces every rung: acids and esters to alcohols, amides and nitriles to amines.",
          prov("Rule R on each; product class read by SMARTS", CH_DER, LAH_CONV), RED)


# ---------------------------------------------------------------------------
# u8-dibal
# ---------------------------------------------------------------------------

DIBAL_CONV = "one equivalent of DIBAL-H at -78 C stops an ester at the aldehyde"


def node_dibal() -> None:
    node = "u8-dibal"
    got = dibal(S["phcoome"])
    pick(node, "u8-dib-meet", "Methyl benzoate meets one DIBAL-H at −78 °C, then H₂O. Pick the product.",
         [o("ald", "O=Cc1ccccc1", "benzaldehyde", "One hydride adds. Cold, the intermediate holds until workup, which releases the aldehyde."),
          o("alc", "OCc1ccccc1", "phenylmethanol", "That is the LiAlH₄ product. One equivalent of DIBAL-H, cold, stops a rung earlier."),
          o("acid", S["phcooh"], "benzoic acid", "Hydride reduces. An acid is the same level as the ester, not lower.")],
         got, "ald", "DIBAL-H, one equivalent, cold: ester to aldehyde.",
         prov("Rule R with DIBAL-H", CH_DER, DIBAL_CONV), lead(S["phcoome"], "methyl benzoate", "ester + DIBAL-H, −78 °C"),
         level=0, concepts=RED, convention=DIBAL_CONV)

    got = dibal("CCCC#N")
    pick(node, "u8-dib-nitrile", "Butanenitrile meets DIBAL-H, then H₃O⁺. Pick the product.",
         [o("ald", [g for g in got if g != "N"][0], "butanal", "One hydride makes an imine anion. Aqueous acid hydrolyses it to the aldehyde."),
          o("amine", "CCCCN", "butan-1-amine", "That takes two hydrides, the LiAlH₄ result."),
          o("alc", "CCCCO", "butan-1-ol", "The aldehyde forms during workup, after the hydride is gone, so it is not reduced.")],
         got, "ald", "DIBAL-H on a nitrile gives an aldehyde.",
         prov("Rule R with DIBAL-H, N swapped for O", CH_ACID, DIBAL_CONV), lead("CCCC#N", "butanenitrile", "nitrile + DIBAL-H"),
         concepts=RED, convention=DIBAL_CONV)

    got = dibal("CCCCC(=O)OCC")
    pick(node, "u8-dib-alcohol", "Ethyl pentanoate meets DIBAL-H, cold. Pick the alcohol released.",
         [o("et", "CCO", "ethanol", "The O-ethyl group is cut off the acyl carbon and leaves as ethanol."),
          o("pent", "CCCCCO", "pentan-1-ol", "That is the acyl side fully reduced. DIBAL-H stops it at pentanal."),
          o("me", "CO", "methanol", "Methanol would come from a methyl ester. This one is ethyl.")],
         got, "et", "The alkoxy group always leaves as its alcohol.",
         prov("Rule R with DIBAL-H", CH_DER, DIBAL_CONV), lead("CCCCC(=O)OCC", "ethyl pentanoate", "ester + DIBAL-H, cold"),
         concepts=RED, convention=DIBAL_CONV)

    c_ester = c_ox_state(S["phcoome"], sites(S["phcoome"], ESTER_L)[0][0])
    c_ald = c_ox_state("O=Cc1ccccc1", match_one("O=Cc1ccccc1", "[CX3H1]=O")[0])
    ask(node, "u8-dib-ox", "DIBAL-H turns an ester into an aldehyde. Pick the change at that carbon.",
        [("two", "Down two oxidation levels", "Three bonds to O became two bonds to O plus one H: oxidation level falls by two."),
         ("one", "Down one oxidation level", "Gaining one C-H and losing one C-O each lower the level by one. That is two in total."),
         ("none", "No change", "Hydride added, so this is a reduction.")],
        {"two": 2, "one": 1, "none": 0}, c_ester - c_ald, "two",
        "Ester to aldehyde is one rung down the oxidation ladder: two levels.",
        prov("carbon oxidation state computed before and after", CH_DER), lead(S["phcoome"], "methyl benzoate", "ester to aldehyde"),
        level=2, concepts=RED)

    e = S["phcoome"]
    reagents = {"dibal": kind_of([g for g in dibal(e) if g != "CO"][0]),
                "lah": kind_of([g for g in lialh4(e) if g != "CO"][0]),
                "nabh4": acyl_class(nabh4(e))}
    ask(node, "u8-dib-choose", "Pick the reagent that stops an ester at the aldehyde.",
        [("dibal", "One DIBAL-H at −78 °C", "A single, bulky hydride at low temperature stops at the aldehyde."),
         ("lah", "Excess LiAlH₄", "LiAlH₄ reduces the aldehyde as soon as it forms: primary alcohol."),
         ("nabh4", "NaBH₄", "NaBH₄ is too mild to reduce an ester at all.")],
        reagents, "aldehyde", "dibal",
        "DIBAL-H, cold and one equivalent, is the aldehyde reagent.",
        prov("Rule R per reagent", CH_DER, DIBAL_CONV + "; NaBH4 leaves esters"), lead(S["phcoome"], "methyl benzoate", "ester to aldehyde"),
        concepts=RED, convention=DIBAL_CONV + "; NaBH4 leaves esters")

    cards = [
        ("est", "Methyl butanoate (C1)", S["mebut"], "methyl butanoate", "Three bonds to O on C1: the top."),
        ("ald", "Butanal", "CCCC=O", "butanal", "Two bonds to O and one H: DIBAL-H stops here."),
        ("alc", "Butan-1-ol", "CCCCO", "butan-1-ol", "One bond to O: LiAlH₄ ends here."),
        ("ane", "Butane", "CCCC", "butane", "No bonds to O: the bottom."),
    ]
    ladder(node, "u8-dib-ladder", cards, lambda s: -c_ox_state(s, sites(s, ESTER_L)[0][0]) if acyl_class(s) == "ester" else -ox_c1(s),
           "Rank by oxidation level of C1, most oxidised first.",
           "Count bonds to O minus bonds to H on C1. DIBAL-H steps down once, LiAlH₄ twice.",
           "oxidation_level", ("Most oxidised", "Least oxidised"),
           "Rank methyl butanoate, butanal, butan-1-ol and butane by the oxidation level of C1, most oxidised first.",
           ("Ester, aldehyde, alcohol, alkane.", "Each hydride swaps a bond to O for a bond to H.",
            "Count bonds to oxygen on C1."),
           [("reversed", ["ane", "alc", "ald", "est"], "ordering_is_reversed",
             ("The ladder read from the bottom.", "More bonds to O means more oxidised.", "Put the ester first.")),
            ("ald-alc", ["est", "alc", "ald", "ane"], "ordering_one_adjacent_pair_swapped",
             ("Alcohol above aldehyde.", "The aldehyde has two bonds to O, the alcohol one.", "Compare C1 in butanal and butan-1-ol."))],
           "DIBAL-H stops one step down; LiAlH₄ goes two.",
           prov("carbon oxidation state computed per card", CH_DER), RED, "oxidation_and_reduction_ladder")


# ---------------------------------------------------------------------------
# u8-organomet
# ---------------------------------------------------------------------------

def node_organomet() -> None:
    node = "u8-organomet"
    p, _ = grignard_twice(S["meoac"], "C")
    pick(node, "u8-org-meet", "Methyl acetate meets excess CH₃MgBr, then H₃O⁺. Pick the product.",
         [o("t", p, "2-methylpropan-2-ol", "The first methyl substitutes for OCH₃ to give propanone. Ketones are more reactive than esters, so a second methyl adds at once."),
          o("k", "CC(C)=O", "propan-2-one", "The ketone forms but cannot be stopped: it reacts faster than the ester."),
          o("e", "CCO", "ethanol", "That is a reduction product. A Grignard adds carbon, not hydride.")],
         [p], "t", "Esters take two Grignards and give tertiary alcohols.",
         prov("Rule G: substitution then addition", CH_DER), lead(S["meoac"], "methyl acetate", "ester + excess CH₃MgBr"),
         level=0, concepts=NUCC)

    p, _ = grignard_twice(S["phcooet"], "CC")
    pick(node, "u8-org-benzoate", "Ethyl benzoate meets excess CH₃CH₂MgBr, then H₃O⁺. Pick the product.",
         [o("t", p, "3-phenylpentan-3-ol", "Two ethyl groups end on the old acyl carbon, with the phenyl and the OH."),
          o("k", "CCC(=O)c1ccccc1", "1-phenylpropan-1-one", "That ketone is the halfway point. Excess Grignard adds again."),
          o("s", "CCC(O)c1ccccc1", "1-phenylpropan-1-ol", "Only one ethyl there. Esters take two.")],
         [p], "t", "Two identical groups on the carbinol carbon is the fingerprint of ester plus Grignard.",
         prov("Rule G", CH_DER), lead(S["phcooet"], "ethyl benzoate", "ester + excess CH₃CH₂MgBr"), concepts=NUCC)

    added = carbons(grignard_twice(S["meoac"], "C")[0]) - (carbons(S["meoac"]) - 1)
    ask(node, "u8-org-count", "Pick how many CH₃MgBr add to one methyl acetate.",
        [("two", "Two", "One substitutes for the OCH₃, one adds to the ketone it makes."),
         ("one", "One", "One would stop at the ketone, which is more reactive than the ester and does not survive."),
         ("three", "Three", "After two additions there is no C=O left to attack.")],
        {"two": 2, "one": 1, "three": 3}, added, "two",
        "Esters consume two equivalents of Grignard.",
        prov("RDKit carbon count before and after Rule G", CH_DER), lead(S["meoac"], "methyl acetate", "ester + CH₃MgBr"), concepts=NUCC)

    p, _ = grignard_twice("CCOC=O", "c1ccccc1")
    pick(node, "u8-org-formate", "Ethyl methanoate meets excess C₆H₅MgBr, then H₃O⁺. Pick the product.",
         [o("s", p, "diphenylmethanol", "The acyl carbon of a formate carries H. Two phenyls add, so it ends as a secondary alcohol."),
          o("t", "OC(c1ccccc1)(c1ccccc1)c1ccccc1", "triphenylmethanol", "Only two phenyls add; the third group on that carbon is the formate's H."),
          o("a", "O=Cc1ccccc1", "benzaldehyde", "The aldehyde is the halfway point and is attacked again.")],
         [p], "s", "A formate ester gives a secondary alcohol with two identical groups.",
         prov("Rule G", CH_DER), lead("CCOC=O", "ethyl formate", "formate + excess C₆H₅MgBr"), level=2, concepts=NUCC)

    target = canon("CCC(C)(O)CC")
    pairs = {"r": (S["meoac"], "CC"), "w": ("CCC(=O)OC", "C"), "x": ("CCC(=O)OCC", "CC")}
    ask(node, "u8-org-retro", "Pick the ester and Grignard pair that makes 3-methylpentan-3-ol.",
        [("r", "Methyl acetate + excess CH₃CH₂MgBr", "The acyl methyl stays; the two ethyls come from the Grignard."),
         ("w", "Methyl propanoate + excess CH₃MgBr", "That gives 2-methylbutan-2-ol: two methyls and one ethyl."),
         ("x", "Ethyl propanoate + excess CH₃CH₂MgBr", "That gives 3-ethylpentan-3-ol: three ethyls.")],
        {k: grignard_twice(a, r)[0] == target for k, (a, r) in pairs.items()}, True, "r",
        "The two identical groups came from the Grignard; the odd one out was the acyl group.",
        prov("Rule G on each pair, compared with the target", CH_DER), lead(target, "3-methylpentan-3-ol", "the target"),
        level=2, concepts=NUCC)

    acidic = has(S["acoh"], "[OX2H]")
    ask(node, "u8-org-acid", "Acetic acid meets CH₃MgBr. Pick what happens first.",
        [("base", "Methane forms and the acid becomes a salt", "The Grignard is a strong base and the O-H is acidic. Proton transfer wins before any addition."),
         ("add", "Methyl adds to the C=O", "The O-H proton is taken first, and a carboxylate does not accept a Grignard."),
         ("none", "Nothing happens", "Something happens fast: the Grignard is destroyed by the O-H.")],
        {"base": True, "add": False, "none": None}, acidic, "base",
        "A Grignard reagent never survives an O-H.",
        prov("SMARTS for the acidic O-H", CH_ACID, "a Grignard is destroyed by any O-H"), lead(S["acoh"], "acetic acid", "acid + CH₃MgBr"),
        concepts=NUCC, convention="a Grignard is destroyed by any O-H")

    p, _ = grignard_twice(S["gbl"], "C")
    pick(node, "u8-org-lactone", "Oxolan-2-one meets excess CH₃MgBr, then H₃O⁺. Pick the product.",
         [o("diol", p, "4-methylpentane-1,4-diol", "The ring opens at the acyl carbon, which then takes a second methyl. The old ring O ends as a primary OH."),
          o("ring", "CC1(C)CCCO1", "2,2-dimethyloxolane", "After workup the ring O is an OH. The ring does not close again."),
          o("ket", "CC(=O)CCCO", "5-hydroxypentan-2-one", "The ketone is attacked by the second methyl.")],
         [p], "diol", "A lactone plus excess Grignard gives a diol.",
         prov("Rule G on the ring ester", CH_DER), lead(S["gbl"], "oxolan-2-one", "lactone + excess CH₃MgBr"), level=2, concepts=NUCC)


# ---------------------------------------------------------------------------
# u8-gilman
# ---------------------------------------------------------------------------

GILMAN_CONV = "a cuprate adds once to an acyl chloride and stops at the ketone"


def node_gilman() -> None:
    node = "u8-gilman"
    k, _ = once(S["phcocl"], "C")
    pick(node, "u8-gil-meet", "Benzoyl chloride meets (CH₃)₂CuLi. Pick the product.",
         [o("k", k, "1-phenylethan-1-one", "The cuprate's methyl replaces Cl. Cuprates do not add to the ketone, so it stops there."),
          o("t", "CC(C)(O)c1ccccc1", "2-phenylpropan-2-ol", "That is what excess Grignard gives. A cuprate stops after one."),
          o("a", "O=Cc1ccccc1", "benzaldehyde", "A cuprate delivers carbon, not hydride.")],
         [k], "k", "Gilman reagents turn acyl chlorides into ketones.",
         prov("Rule G stopped after substitution", CH_DER, GILMAN_CONV), lead(S["phcocl"], "benzoyl chloride", "acyl chloride + (CH₃)₂CuLi"),
         level=0, concepts=NUCC, convention=GILMAN_CONV)

    k, _ = once("CCC(=O)Cl", "CC")
    pick(node, "u8-gil-pent", "Propanoyl chloride meets (CH₃CH₂)₂CuLi. Pick the product.",
         [o("k", k, "pentan-3-one", "An ethyl replaces Cl: ethyl on both sides of the C=O."),
          o("t", "CCC(O)(CC)CC", "3-ethylpentan-3-ol", "That is two additions, the Grignard outcome."),
          o("b", "CCCC(C)=O", "pentan-2-one", "Same formula, but the C=O has moved. The new bond is at the old acyl carbon.")],
         [k], "k", "The ketone's two groups: the acyl group and one cuprate group.",
         prov("Rule G stopped after substitution", CH_DER, GILMAN_CONV), lead("CCC(=O)Cl", "propanoyl chloride", "+ (CH₃CH₂)₂CuLi"),
         concepts=NUCC, convention=GILMAN_CONV)

    s = "CCCC(=O)Cl"
    outs = {"cu": once(s, "C")[0], "mg": grignard_twice(s, "C")[0], "lah": lialh4(s)[0]}
    ask(node, "u8-gil-choose", "Pick the reagent that turns butanoyl chloride into a methyl ketone.",
        [("cu", "(CH₃)₂CuLi", "The cuprate adds one methyl and stops: pentan-2-one."),
         ("mg", "Excess CH₃MgBr", "The Grignard adds twice and gives the tertiary alcohol."),
         ("lah", "LiAlH₄", "That adds hydride, not methyl: butan-1-ol.")],
        {k: bool(co_sites(v)) for k, v in outs.items()}, True, "cu",
        "Cuprate for the ketone, Grignard for the alcohol.",
        prov("Rule G and Rule R per reagent; product checked for a ketone C=O", CH_DER, GILMAN_CONV),
        lead(s, "butanoyl chloride", "three reagents"), concepts=NUCC, convention=GILMAN_CONV)

    target = canon("CCC(C)=O")
    pairs = {"x": ("CC(=O)Cl", "C"), "a": ("CCC(=O)Cl", "C"), "b": ("CC(=O)Cl", "CC")}
    ask(node, "u8-gil-retro", "Pick the pair that does NOT make butan-2-one.",
        [("x", "Acetyl chloride + (CH₃)₂CuLi", "That joins two methyls to the C=O: propanone, one carbon short."),
         ("a", "Propanoyl chloride + (CH₃)₂CuLi", "This works: ethyl from the acyl chloride, methyl from the cuprate."),
         ("b", "Acetyl chloride + (CH₃CH₂)₂CuLi", "This works too: methyl from the acyl chloride, ethyl from the cuprate.")],
        {k: once(a, r)[0] != target for k, (a, r) in pairs.items()}, True, "x",
        "A ketone has two disconnections; either side can come from the cuprate.",
        prov("Rule G stopped after substitution, each pair compared with the target", CH_DER, GILMAN_CONV),
        lead(target, "butan-2-one", "the target ketone"), level=2, concepts=NUCC, convention=GILMAN_CONV)

    p, _ = grignard_twice(s, "C")
    pick(node, "u8-gil-vs", "Butanoyl chloride meets excess CH₃MgBr instead. Pick the product.",
         [o("t", p, "2-methylpentan-2-ol", "The Grignard substitutes, then adds to the ketone it made: two methyls on the old acyl carbon."),
          o("k", "CCCC(C)=O", "pentan-2-one", "That is the cuprate product. A Grignard does not stop at the ketone."),
          o("s", "CCCC(C)O", "pentan-2-ol", "Only one methyl there, and an H that came from nowhere.")],
         [p], "t", "Grignard reagents overshoot the ketone; that is why cuprates exist.",
         prov("Rule G", CH_DER), lead(s, "butanoyl chloride", "acyl chloride + excess CH₃MgBr"), concepts=NUCC)

    cc = "O=C(Cl)C1CCCCC1"
    k, _ = once(cc, "C")
    pick(node, "u8-gil-ring", "Cyclohexanecarbonyl chloride meets (CH₃)₂CuLi. Pick the product.",
         [o("k", k, "1-cyclohexylethan-1-one", "Methyl replaces Cl; the ring stays on the other side of the C=O."),
          o("ring", "CC1(C(=O)Cl)CCCCC1", "1-methylcyclohexane-1-carbonyl chloride", "The cuprate attacks the acyl carbon, not the ring."),
          o("ch", "CC1CCCCC1", "methylcyclohexane", "The C=O carbon is kept. Only Cl is replaced.")],
         [k], "k", "Same rule on any acyl chloride: Cl out, R in.",
         prov("Rule G stopped after substitution", CH_DER, GILMAN_CONV), lead(cc, "cyclohexanecarbonyl chloride", "+ (CH₃)₂CuLi"),
         concepts=NUCC, convention=GILMAN_CONV)


# ---------------------------------------------------------------------------
# u8-decarb
# ---------------------------------------------------------------------------

def node_decarb() -> None:
    node = "u8-decarb"
    s = "CC(=O)CC(=O)O"
    got = decarboxylate(s)
    pick(node, "u8-dec-meet", "3-Oxobutanoic acid is warmed. Pick the organic product.",
         [o("k", got[0], "propan-2-one", "The CO₂H sits beta to the ketone C=O, so it leaves as CO₂ and the enol tautomerises to propanone."),
          o("acid", S["acoh"], "acetic acid", "The carbon lost is the carboxyl carbon. The ketone part stays."),
          o("ald", "CCC=O", "propanal", "The C=O stays where the ketone was, on C2.")],
         got, "k", "Beta-keto acids lose CO₂ on gentle heating.",
         prov("Rule D", CH_ALPHA), lead(s, "3-oxobutanoic acid", "β-keto acid, heat"), level=0, concepts=ACIDS)

    # The alpha-keto acid is the misreading the audit (23 Oct, 2a #3) named: a C=O ON the alpha carbon,
    # which the BETA pattern rejects. Its keeping its CO2H is the textbook convention, not an RDKit result.
    three = {"beta": s, "gamma": "CC(=O)CCC(=O)O", "plain": S["buacid"], "alpha": "CC(=O)C(=O)O"}
    pick(node, "u8-dec-which", "Pick the acid that loses CO₂ on gentle heating.",
         [o("beta", three["beta"], "3-oxobutanoic acid", "Its alpha carbon is bonded to a second C=O carbon (the ketone sits beta to the CO₂H), so a six-membered cyclic path is available."),
          o("gamma", three["gamma"], "4-oxopentanoic acid", "The ketone is one carbon too far away. No six-membered path."),
          o("plain", three["plain"], "butanoic acid", "No second C=O at all. Simple acids keep their CO₂H."),
          o("alpha", three["alpha"], "2-oxopropanoic acid", "Here the C=O is on the alpha carbon itself (an alpha-keto acid). The six-membered path needs that C=O one carbon further out, so it keeps its CO₂H.")],
         [k for k in three.values() if decarboxylate(k)], "beta",
         "Only a CO₂H whose alpha carbon is bonded to another C=O carbon (a beta-keto acid or a malonic acid) loses CO₂ easily.",
         prov("SMARTS for a C=O carbon bonded to the alpha carbon of a CO2H", CH_ALPHA), lead(S["buacid"], "butanoic acid", "four acids, heat"),
         concepts=ACIDS)

    mal = "CC(C(=O)O)C(=O)O"
    got = decarboxylate(mal)
    pick(node, "u8-dec-malonic", "2-Methylpropanedioic acid is heated. Pick the product.",
         [o("p", got[0], "propanoic acid", "One CO₂H is beta to the other's C=O, so one leaves as CO₂. The other stays."),
          o("e", "CC", "ethane", "Only one CO₂ is lost. The second acid has no beta C=O left."),
          o("a", S["acoh"], "acetic acid", "The methyl branch stays. Three carbons remain.")],
         got, "p", "A malonic acid loses one CO₂ to give a substituted acetic acid.",
         prov("Rule D", CH_ALPHA), lead(mal, "2-methylpropanedioic acid", "malonic acid, heat"), concepts=ACIDS)

    ask(node, "u8-dec-ring", "Pick the ring size of decarboxylation's cyclic path.",
        [("six", "Six atoms", "H, the acid O, the carboxyl C, the alpha C, the ketone C and the ketone O: six."),
         ("four", "Four atoms", "Count from the O-H all the way round to the ketone oxygen."),
         ("five", "Five atoms", "Do not forget the moving H.")],
        {"six": 6, "four": 4, "five": 5}, ts_ring(s), "six",
        "A six-membered cyclic path is why beta-keto acids decarboxylate easily.",
        prov("RDKit shortest path from the acid O to the ketone O, plus the H", CH_ALPHA), lead(s, "3-oxobutanoic acid", "the cyclic path"),
        level=2, concepts=ACIDS)

    cands = {"co2": "O=C=O", "co": "[C-]#[O+]", "h2o": "O"}
    ask(node, "u8-dec-gas", "Pick the small molecule decarboxylation releases.",
        [("co2", "Carbon dioxide", "The carboxyl carbon leaves with both its oxygens. The atoms balance."),
         ("co", "Carbon monoxide", "That leaves an O behind. Two oxygens go with the carbon."),
         ("h2o", "Water", "No carbon would be lost, and the product has one fewer.")],
        {k: k for k in cands}, byproduct([s], got_keto(s), cands), "co2",
        "Decarboxylation releases CO₂.",
        prov("RDKit atom balance over three candidates", CH_ALPHA), lead(s, "3-oxobutanoic acid", "β-keto acid, heat"), concepts=ACIDS)

    enol = "C=C(C)O"
    pick(node, "u8-dec-enol", "Decarboxylation first gives prop-1-en-2-ol. Pick what it becomes.",
         [o("k", keto_form(enol), "propan-2-one", "An enol tautomerises: the O-H proton moves to carbon and C=O forms."),
          o("ol", "CC(C)O", "propan-2-ol", "Tautomerism moves a proton; it does not add H₂."),
          o("ald", "CCC=O", "propanal", "The C=O forms on the carbon that held the OH, C2.")],
         [keto_form(enol)], "k", "The enol is short lived; the keto form is what you isolate.",
         prov("RDKit tautomer canonicaliser on the enol", CH_ALPHA), lead(enol, "prop-1-en-2-ol", "the enol"), concepts=ACIDS)

    ring = "O=C1CCCCC1C(=O)O"
    got = decarboxylate(ring)
    pick(node, "u8-dec-ring-acid", "2-Oxocyclohexane-1-carboxylic acid is heated. Pick the product.",
         [o("k", got[0], "cyclohexanone", "The CO₂H is on the carbon next to the ring C=O. It leaves as CO₂."),
          o("acid", "OC(=O)C1CCCCC1", "cyclohexanecarboxylic acid", "That loses the ketone O instead. Heat removes CO₂, not O."),
          o("ene", "O=C1CCCC=C1", "cyclohex-2-en-1-one", "No H₂ is lost. The alpha carbon just takes an H.")],
         got, "k", "Ring or chain, a beta-keto acid loses CO₂.",
         prov("Rule D", CH_ALPHA), lead(ring, "2-oxocyclohexane-1-carboxylic acid", "β-keto acid, heat"), level=2, concepts=ACIDS)


def got_keto(s: str) -> list[str]:
    return decarboxylate(s)


# ---------------------------------------------------------------------------
# Side quests
# ---------------------------------------------------------------------------

DCC = "C1CCC(CC1)N=C=NC1CCCCC1"
DCU = "O=C(NC1CCCCC1)NC1CCCCC1"


SALT_CONV = ("an amine and a free carboxylic acid make the ammonium carboxylate salt, not the amide "
             "(corpus board org2-match-acyl-synthesis-jobs: an amine attacking a carboxylic acid directly mostly makes a salt)")


def proton_transfer(acid: str, base: str) -> str:
    """The acid's CO2H proton moves to the base's N: the carboxylate and the ammonium ion, as one salt SMILES."""
    rw = Chem.RWMol(mol(acid + "." + base))
    _, _, oh = sites(acid, ACID)[0]
    n = [a.GetIdx() for a in rw.GetAtoms() if a.GetSymbol() == "N" and a.GetIdx() >= mol(acid).GetNumAtoms()][0]
    for i, charge, dh in ((oh, -1, -1), (n, 1, 1)):
        a = rw.GetAtomWithIdx(i)
        a.SetNumExplicitHs(a.GetTotalNumHs() + dh)
        a.SetNoImplicit(True)
        a.SetFormalCharge(charge)
    m = rw.GetMol()
    Chem.SanitizeMol(m)
    return Chem.MolToSmiles(m)


def node_steglich() -> None:
    node = "u8-steglich"
    mb, _ = fischer(S["phcooh"], "CO")
    pick(node, "u8-ste-meet", "Benzoic acid meets methanol with DCC and DMAP. Pick the product.",
         [o("mb", mb, "methyl benzoate", "DCC activates the acid; methanol's O ends on the acyl carbon. Same ester as Fischer, with no strong acid."),
          o("anh", "O=C(OC(=O)c1ccccc1)c1ccccc1", "benzoic anhydride", "Methanol is there to catch the activated acid, so the ester forms."),
          o("anis", "COc1ccccc1", "methoxybenzene", "The acyl carbon is kept. Only the OH is replaced.")],
         [mb], "mb", "Steglich: acid plus alcohol, DCC and DMAP, ester.",
         prov("Rule S, acid OH swapped for the alcohol O", CH_DER), lead(S["phcooh"], "benzoic acid", "+ CH₃OH, DCC, DMAP"), level=0, concepts=NAS)

    pick(node, "u8-ste-dcu", "DCC drives that esterification. Pick the byproduct it becomes.",
         [o("dcu", DCU, "1,3-dicyclohexylurea", "DCC takes up the water the ester releases and becomes the urea, DCU, which precipitates."),
          o("dcc", DCC, "N,N'-dicyclohexylcarbodiimide", "That is DCC itself. It is used up, not regenerated."),
          o("amine", "NC1CCCCC1", "cyclohexanamine", "The C=N bonds become a C=O and two N-H. The rings stay on N.")],
         [p for p in [DCU] if balances([DCC, "O"], [DCU])], "dcu",
         "DCC plus the elements of water gives DCU.",
         prov("RDKit atom balance: DCC plus water against DCU", CH_DER), lead(DCC, "N,N'-dicyclohexylcarbodiimide", "DCC"), concepts=NAS)

    # Audit 23 Oct, 2a #4: the trap the ladder rule used to get wrong, practised alone before DCC fixes it.
    salt = proton_transfer(S["acoh"], "CN")
    wrong_amide, _ = acyl_sub(S["acoh"], nu_of("CN", "[NX3;H2]"), ACID)
    pick(node, "u8-ste-salt", "Acetic acid meets CH₃NH₂ at room temperature. Pick the product.",
         [o("salt", salt, "methylammonium acetate", "The amine is a base, and the acid's O-H is the fastest thing to react: the proton moves to N and a salt forms."),
          o("amd", wrong_amide, "N-methylacetamide", "Acid to amide is downhill, but the amine takes the acid's proton first. The salt needs strong heat or DCC to become the amide."),
          o("est", S["meoac"], "methyl acetate", "No methanol is present. The amine's carbon never ends up on O.")],
         [salt] if balances([S["acoh"], "CN"], [salt]) and balances([S["acoh"], "CN"], [wrong_amide, "O"]) else None, "salt",
         "A free acid and an amine make a salt first, so the acid needs activation (SOCl₂ or DCC) even to go down.",
         prov("proton moved from the acid O-H to the amine N; RDKit atom balance of salt and of amide plus water", CH_DER, SALT_CONV),
         lead(S["acoh"], "acetic acid", "+ CH₃NH₂, room temperature"), concepts=NAS, convention=SALT_CONV)

    amd, _ = acyl_sub(S["acoh"], nu_of("NCc1ccccc1", "[NX3;H2]"), ACID)
    pick(node, "u8-ste-amide", "Acetic acid meets phenylmethanamine and DCC. Pick the product.",
         [o("amd", amd, "N-benzylacetamide", "The activated acid is caught by the amine's N: an amide. This is how peptide bonds are made."),
          o("salt", "CC(=O)OCc1ccccc1", "benzyl acetate", "There is no benzyl alcohol here. The amine bonds through N, not O."),
          o("imine", "CC=NCc1ccccc1", "N-benzylethanimine", "An imine needs an aldehyde. The acid keeps its oxidation level.")],
         [amd], "amd", "With an amine instead of an alcohol, DCC makes an amide.",
         prov("Rule S", CH_DER), lead(S["acoh"], "acetic acid", "+ PhCH₂NH₂, DCC"), concepts=NAS)

    tb, _ = fischer(S["acoh"], "CC(C)(C)O")
    pick(node, "u8-ste-tbu", "Acetic acid meets 2-methylpropan-2-ol with DCC and DMAP. Pick the ester.",
         [o("tb", tb, "tert-butyl acetate", "Steglich is mild, so even a bulky tertiary alcohol forms its ester."),
          o("ene", "C=C(C)C", "2-methylprop-1-ene", "No strong acid is present, so the tertiary alcohol is not dehydrated."),
          o("ib", "CC(=O)OCC(C)C", "2-methylpropyl acetate", "The O stays on the central carbon. Nothing rearranges.")],
         [tb], "tb", "Mild conditions suit acid-sensitive or bulky alcohols.",
         prov("Rule S", CH_DER, "Steglich tolerates tertiary alcohols where Fischer fails"), lead(S["acoh"], "acetic acid", "+ (CH₃)₃COH, DCC, DMAP"),
         concepts=NAS, convention="Steglich tolerates tertiary alcohols where Fischer fails")

    cands = {"h2o": "O", "hcl": "Cl", "co2": "O=C=O"}
    ask(node, "u8-ste-water", "DCC becomes DCU. Pick what it took from the reaction.",
        [("h2o", "The elements of water", "DCC plus H₂O balances to DCU exactly. That water would have come from the acid and alcohol."),
         ("hcl", "HCl", "There is no chlorine anywhere in the flask."),
         ("co2", "CO₂", "DCU has one carbonyl carbon, which DCC already had.")],
        {k: k for k in cands}, ([k for k, v in cands.items() if balances([DCC, v], [DCU])] + [None])[0]
        if sum(balances([DCC, v], [DCU]) for v in cands.values()) == 1 else None, "h2o",
        "DCC is a dehydrating agent: it soaks up the water.",
        prov("RDKit atom balance over three candidates", CH_DER), structure(DCU, "1,3-dicyclohexylurea", "DCU"), concepts=NAS)

    pa, _ = acyl_sub("CCC(=O)O", nu_of("Nc1ccccc1", "[NX3;H2]"), ACID)
    pick(node, "u8-ste-anilide", "Propanoic acid meets aniline and DCC. Pick the product.",
         [o("amd", pa, "N-phenylpropanamide", "Aniline's N catches the activated acid: an amide on the ring N."),
          o("ring", "CCC(=O)c1ccc(N)cc1", "1-(4-aminophenyl)propan-1-one", "Acylating a ring carbon needs Friedel-Crafts. The NH₂ is the nucleophile."),
          o("acid", "CCC(=O)O", "propanoic acid", "DCC makes the acid reactive enough for the amine.")],
         [pa], "amd", "DCC couples acids to amines.",
         prov("Rule S", CH_DER), lead("CCC(=O)O", "propanoic acid", "+ aniline, DCC"), level=2, concepts=NAS)


DZM = "C=[N+]=[N-]"
DZM_CONV = "diazomethane methylates a CO2H but not an alcohol O-H"


def node_diazomethane() -> None:
    node = "u8-diazomethane"
    mb = methylate_acid(S["phcooh"])
    pick(node, "u8-dzm-meet", "Benzoic acid meets CH₂N₂. Pick the product.",
         [o("mb", mb, "methyl benzoate", "The acid protonates diazomethane and the carboxylate takes the CH₃. A methyl ester."),
          o("homo", "OC(=O)Cc1ccccc1", "phenylacetic acid", "CH₂ is not inserted into the chain. The new CH₃ lands on O."),
          o("tol", "Cc1ccccc1", "toluene", "The carboxyl group stays. Only its H is replaced.")],
         [mb], "mb", "Diazomethane turns an acid into its methyl ester.",
         prov("acid O-H swapped for O-CH3", CH_ACID, DZM_CONV), lead(S["phcooh"], "benzoic acid", "+ CH₂N₂"), level=0, concepts=ACIDS,
         convention=DZM_CONV)

    cands = {"n2": "N#N", "nh3": "N", "h2": "[HH]"}
    ask(node, "u8-dzm-gas", "Pick the gas released when an acid meets CH₂N₂.",
        [("n2", "Nitrogen, N₂", "Both N atoms leave as N₂, which is why the reaction is quantitative and also why it is dangerous."),
         ("nh3", "Ammonia", "There is not enough H for NH₃ and an N would be left over."),
         ("h2", "Hydrogen", "Both nitrogens would be unaccounted for.")],
        {k: k for k in cands}, byproduct([S["phcooh"], DZM], [mb], cands), "n2",
        "The only byproduct is N₂ gas.",
        prov("RDKit atom balance over three candidates", CH_ACID), lead(DZM, "diazomethane", "CH₂N₂"), concepts=ACIDS)

    di = methylate_acid(S["succinic"])
    pick(node, "u8-dzm-diacid", "Butanedioic acid meets excess CH₂N₂. Pick the product.",
         [o("di", di, "dimethyl butanedioate", "Each CO₂H is methylated, giving the diester."),
          o("mono", "COC(=O)CCC(=O)O", "4-methoxy-4-oxobutanoic acid", "With excess reagent both acids react."),
          o("anh", "O=C1CCC(=O)O1", "oxolane-2,5-dione", "Ring closure needs heat. Diazomethane just methylates.")],
         [di], "di", "Every CO₂H is methylated.",
         prov("every acid O-H swapped for O-CH3", CH_ACID, DZM_CONV), lead(S["succinic"], "butanedioic acid", "+ excess CH₂N₂"),
         concepts=ACIDS, convention=DZM_CONV)

    s = "OCc1ccc(cc1)C(=O)O"
    p = methylate_acid(s)
    pick(node, "u8-dzm-select", "4-(Hydroxymethyl)benzoic acid meets one CH₂N₂. Pick the product.",
         [o("ester", p, "methyl 4-(hydroxymethyl)benzoate", "Only the acid O-H is acidic enough to protonate diazomethane. The alcohol is untouched."),
          o("ether", "COCc1ccc(cc1)C(=O)O", "4-(methoxymethyl)benzoic acid", "An alcohol O-H is far less acidic and does not react."),
          o("both", "COCc1ccc(cc1)C(=O)OC", "methyl 4-(methoxymethyl)benzoate", "One equivalent, and only the acid reacts.")],
         [p], "ester", "Diazomethane picks the acid out of a molecule.",
         prov("acid O-H swapped for O-CH3", CH_ACID, DZM_CONV), lead(s, "4-(hydroxymethyl)benzoic acid", "+ CH₂N₂"), level=2,
         concepts=ACIDS, convention=DZM_CONV)

    added = carbons(mb) - carbons(S["phcooh"])
    ask(node, "u8-dzm-carbons", "Pick how many carbons CH₂N₂ adds to an acid.",
        [("one", "One, as the O-CH₃", "The CH₂ picks up the acid's proton and becomes the ester's methyl."),
         ("two", "Two", "Diazomethane has only one carbon."),
         ("zero", "None", "The methyl group of the ester is new.")],
        {"one": 1, "two": 2, "zero": 0}, added, "one",
        "One carbon in, on the oxygen.",
        prov("RDKit carbon count before and after", CH_ACID), lead(S["phcooh"], "benzoic acid", "+ CH₂N₂"), concepts=ACIDS)

    ma = methylate_acid(S["acoh"])
    pick(node, "u8-dzm-acetic", "Acetic acid meets CH₂N₂. Pick the product.",
         [o("ma", ma, "methyl acetate", "CH₃ on the acid O: the methyl ester."),
          o("ea", S["etoac"], "ethyl acetate", "One carbon is added, not two."),
          o("pa", "CCC(=O)O", "propanoic acid", "Same formula, but the carbon went into the chain. It goes on O.")],
         [ma], "ma", "Diazomethane makes methyl esters, never anything longer.",
         prov("acid O-H swapped for O-CH3", CH_ACID, DZM_CONV), lead(S["acoh"], "acetic acid", "+ CH₂N₂"), concepts=ACIDS, convention=DZM_CONV)


SN2_CONV = "SN2 works on methyl and primary halides, not tertiary or aryl ones"


def o_alkylate(carboxylate: str, halide: str) -> tuple[str, tuple[str, ...]]:
    """SN2 with the carboxylate O: the acid form's O-H oxygen is the atom that bonds."""
    acid = canon(carboxylate.replace("[O-]", "O"))
    return sn2(halide, nu_of(acid, "[OX2H1][CX3]=O"))


def node_carboxylate_alk() -> None:
    node = "u8-carboxylate-alk"
    bz = "O=C([O-])c1ccccc1"
    p, _ = o_alkylate(bz, "CI")
    pick(node, "u8-cxa-meet", "Benzoate meets iodomethane. Pick the product.",
         [o("mb", p, "methyl benzoate", "The carboxylate O attacks CH₃ in an SN2 and iodide leaves. A methyl ester."),
          o("ket", "CC(=O)c1ccccc1", "1-phenylethan-1-one", "The nucleophile is O, not the acyl carbon."),
          o("acid", S["phcooh"], "benzoic acid", "Nothing supplies a proton. The CH₃ takes the O.")],
         [p], "mb", "Carboxylate plus a methyl or primary halide gives an ester.",
         prov("SN2 edit with the carboxylate O", CH_ACID, SN2_CONV), lead(bz, "benzoate", "benzoate + CH₃I"), level=0, concepts=SUB,
         convention=SN2_CONV)

    hal = {"p": "CCCCBr", "t": "CC(C)(C)Br", "a": "Brc1ccccc1"}
    kinds = {k: ("aryl" if mol(h).GetAtomWithIdx(match_one(h, "[#6]Br")[0]).GetIsAromatic()
                 else ["methyl", "primary", "secondary", "tertiary"][cdeg(mol(h), match_one(h, "[#6]Br")[0])]) for k, h in hal.items()}
    pick(node, "u8-cxa-halide", "Pick the halide that gives a clean ester with acetate.",
         [o("p", hal["p"], "1-bromobutane", "Primary: the back side is open for an SN2."),
          o("t", hal["t"], "2-bromo-2-methylpropane", "Tertiary: three groups block the back side, so no SN2 happens there."),
          o("a", hal["a"], "bromobenzene", "An aryl C-Br cannot be attacked from behind. No SN2.")],
         [hal[k] for k, v in kinds.items() if v in ("methyl", "primary")], "p",
         "Methyl and primary halides only.",
         prov("RDKit degree of the C-Br carbon", CH_ACID, SN2_CONV), lead(S["acetate"], "acetate", "acetate + three halides"),
         concepts=SUB, convention=SN2_CONV)

    p, _ = o_alkylate(S["acetate"], "BrCc1ccccc1")
    pick(node, "u8-cxa-benzyl", "Acetate meets (bromomethyl)benzene. Pick the product.",
         [o("ba", p, "benzyl acetate", "The O bonds to the CH₂ and bromide leaves."),
          o("ket", "CC(=O)Cc1ccccc1", "1-phenylpropan-2-one", "A C-C bond would need a carbon nucleophile. Acetate attacks through O."),
          o("pa", "CC(=O)Oc1ccccc1", "phenyl acetate", "The O lands on the CH₂, not on the ring.")],
         [p], "ba", "Same SN2, a different halide.",
         prov("SN2 edit with the carboxylate O", CH_ACID, SN2_CONV), lead("BrCc1ccccc1", "(bromomethyl)benzene", "+ acetate"), concepts=SUB,
         convention=SN2_CONV)

    p, rest = o_alkylate(S["acetate"], "CCBr")
    cands = {"br": "[Br-]", "hbr": "Br", "br2": "BrBr"}
    ask(node, "u8-cxa-leaving", "Acetate meets bromoethane. Pick what leaves.",
        [("br", "Bromide ion", "The C-Br electrons go with Br, so it leaves as Br⁻. Atoms and charge balance."),
         ("hbr", "HBr", "No H is lost from either partner, so HBr cannot form."),
         ("br2", "Br₂", "Only one Br is in the reaction.")],
        {k: k for k in cands}, byproduct([S["acetate"], "CCBr"], [p], cands), "br",
        "The halide leaves as its anion.",
        prov("RDKit atom and charge balance", CH_ACID), lead("CCBr", "bromoethane", "acetate + bromoethane"), concepts=SUB)

    on_o = has(p, "[CX3](=O)O[CH2]C")
    ask(node, "u8-cxa-which", "Pick the atom of acetate that bonds to the ethyl group.",
        [("o", "A carboxylate oxygen", "The negative charge sits on the oxygens, so an O is the nucleophile."),
         ("c", "The carbonyl carbon", "The carbonyl carbon is an electrophile, not a nucleophile."),
         ("me", "The methyl carbon", "The methyl carbon has no lone pair to share.")],
        {"o": True, "c": False, "me": None}, on_o, "o",
        "Carboxylate alkylation is O-alkylation.",
        prov("SMARTS on the SN2 product", CH_ACID), lead(S["acetate"], "acetate", "acetate + CH₃CH₂Br"), concepts=SUB)

    s = "[O-]C(=O)CCCBr"
    m = mol(s)
    rw = Chem.RWMol(m)
    c, x = match_one(s, "[CX4]-Br")
    on = match_one(s, "[OX1-]")[0]
    rw.RemoveBond(c, x)
    rw.AddBond(on, c, SINGLE)
    rw.GetAtomWithIdx(on).SetFormalCharge(0)
    rw.GetAtomWithIdx(x).SetFormalCharge(-1)
    lac, _ = split(rw, c)
    pick(node, "u8-cxa-ring", "4-Bromobutanoate cyclises in an SN2. Pick the product.",
         [o("lac", lac, "oxolan-2-one", "The carboxylate O attacks its own CH₂Br. A five-membered ring ester, a lactone."),
          o("thf", "C1CCOC1", "oxolane", "The C=O stays. Only the C-Br bond changes."),
          o("cpa", "OC(=O)C1CC1", "cyclopropanecarboxylic acid", "That would need a carbon nucleophile. The O is what attacks.")],
         [lac], "lac", "Intramolecular O-alkylation makes a lactone.",
         prov("SN2 edit inside one molecule", CH_ACID, SN2_CONV), lead(s, "4-bromobutanoate", "intramolecular SN2"), level=2, concepts=SUB,
         convention=SN2_CONV)


WEIN = "CON(C)C(=O)c1ccccc1"
WEIN_CONV = "a Weinreb amide takes one organometallic or hydride and stops at the ketone or aldehyde"


def node_weinreb() -> None:
    node = "u8-weinreb"
    w, _ = acyl_sub(S["phcocl"], nu_of("CNOC", "[NX3;H1]"))
    pick(node, "u8-wei-meet", "Benzoyl chloride meets CH₃NHOCH₃. Pick the product.",
         [o("w", w, "N-methoxy-N-methylbenzamide", "The N bonds to the acyl carbon and Cl leaves: a Weinreb amide, with OCH₃ and CH₃ on N."),
          o("est", S["phcoome"], "methyl benzoate", "The OCH₃ oxygen is already bonded to N and CH₃, so it cannot hand an OCH₃ to the acyl carbon. The N-H is the only nucleophile: the amide forms."),
          o("nm", "CNC(=O)c1ccccc1", "N-methylbenzamide", "The N keeps its OCH₃. Nothing removes it.")],
         [w], "w", "A Weinreb amide is an N-methoxy-N-methyl amide.",
         prov("Rule S", CH_DER), lead(S["phcocl"], "benzoyl chloride", "+ CH₃NHOCH₃"), level=0, concepts=NAS)

    k, rest = once(WEIN, "C")
    pick(node, "u8-wei-ketone", "That Weinreb amide meets CH₃MgBr, then H₃O⁺. Pick the product.",
         [o("k", k, "1-phenylethan-1-one", "One methyl adds; the intermediate is held by a chelate until workup, which releases the ketone."),
          o("t", "CC(C)(O)c1ccccc1", "2-phenylpropan-2-ol", "That is the ester outcome. The Weinreb amide stops after one."),
          o("a", "O=Cc1ccccc1", "benzaldehyde", "The Grignard adds a methyl, not a hydride.")],
         [k], "k", "Weinreb amide plus Grignard gives a ketone.",
         prov("Rule G stopped after substitution", CH_DER, WEIN_CONV), lead(WEIN, "N-methoxy-N-methylbenzamide", "+ CH₃MgBr"),
         concepts=NUCC, convention=WEIN_CONV)

    got = dibal(WEIN)
    pick(node, "u8-wei-aldehyde", "That Weinreb amide meets one DIBAL-H, then H₃O⁺. Pick the product.",
         [o("a", [g for g in got if acyl_class(g) == "none" and "c1" in g][0], "benzaldehyde", "One hydride adds and stops; workup releases the aldehyde."),
          o("alc", "OCc1ccccc1", "phenylmethanol", "That is two hydrides. The Weinreb amide stops after one."),
          o("amine", "CN(OC)Cc1ccccc1", "N-methoxy-N-methyl-1-phenylmethanamine", "That would remove the C=O oxygen, as LiAlH₄ does to an ordinary amide.")],
         got, "a", "Weinreb amide plus hydride gives an aldehyde.",
         prov("Rule R with DIBAL-H on the Weinreb amide", CH_DER, WEIN_CONV), lead(WEIN, "N-methoxy-N-methylbenzamide", "+ DIBAL-H"),
         concepts=RED, convention=WEIN_CONV)

    _, rest = once(WEIN, "C")
    pick(node, "u8-wei-out", "After that ketone forms, pick the amine released.",
         [o("ho", rest[0], "N-methoxymethanamine", "The whole N(OCH₃)CH₃ group leaves and picks up H."),
          o("mea", "CN", "methanamine", "The OCH₃ stays on the N; it leaves as one piece."),
          o("hy", "CON", "O-methylhydroxylamine", "The N keeps its CH₃ as well as the OCH₃.")],
         list(rest), "ho", "The Weinreb N group leaves intact.",
         prov("Rule S leaving fragment", CH_DER), lead(WEIN, "N-methoxy-N-methylbenzamide", "Weinreb amide + CH₃MgBr"), concepts=NAS)

    subs = {"w": WEIN, "e": S["phcoome"], "c": S["phcocl"]}
    stops = {k: bool(co_sites(excess_grignard(v, "C"))) for k, v in subs.items()}
    ask(node, "u8-wei-choose", "Pick the one that gives a ketone with excess CH₃MgBr.",
        [("w", "The Weinreb amide", "Its chelated intermediate does not collapse until workup, so the ketone never meets the Grignard."),
         ("e", "Methyl benzoate", "The ketone forms in the flask and is attacked again: tertiary alcohol."),
         ("c", "Benzoyl chloride", "The ketone forms in the flask and takes a second Grignard: tertiary alcohol.")],
        stops, True, "w",
        "Only the Weinreb amide protects the ketone from a second addition.",
        prov("Rule G per substrate, with the Weinreb stop", CH_DER, WEIN_CONV), lead(WEIN, "N-methoxy-N-methylbenzamide", "three substrates"),
        level=2, concepts=NUCC, convention=WEIN_CONV)

    target = canon("CCC(=O)c1ccccc1")
    pairs = {"x": ("CON(C)C(C)=O", "c1ccccc1"), "a": (WEIN, "CC"), "b": ("CCC(=O)N(C)OC", "c1ccccc1")}
    ask(node, "u8-wei-retro", "Pick the pair that does NOT make 1-phenylpropan-1-one.",
        [("x", "Weinreb acetamide + C₆H₅MgBr", "That gives 1-phenylethan-1-one: the acyl part is only two carbons."),
         ("a", "Weinreb benzamide + CH₃CH₂MgBr", "This works: phenyl from the amide, ethyl from the Grignard."),
         ("b", "Weinreb propanamide + C₆H₅MgBr", "This works too: ethyl from the amide, phenyl from the Grignard.")],
        {k: once(a, r)[0] != target for k, (a, r) in pairs.items()}, True, "x",
        "Either side of the ketone can come from the Grignard.",
        prov("Rule G stopped after substitution, each pair compared with the target", CH_DER, WEIN_CONV),
        lead(target, "1-phenylpropan-1-one", "the target ketone"), level=2, concepts=NUCC, convention=WEIN_CONV)


NAB_CONV = "NaBH4 reduces aldehydes and ketones but not esters, amides, acids or nitriles"


def node_nabh4() -> None:
    node = "u8-nabh4"
    s = "COC(=O)CC(C)=O"
    p = nabh4(s)
    pick(node, "u8-nab-meet", "Methyl 3-oxobutanoate meets NaBH₄. Pick the product.",
         [o("ol", p, "methyl 3-hydroxybutanoate", "NaBH₄ reduces the ketone and leaves the ester."),
          o("diol", "CC(O)CCO", "butane-1,3-diol", "That reduces both groups, the LiAlH₄ result."),
          o("ald", "CC(=O)CC=O", "3-oxobutanal", "NaBH₄ cannot touch the ester at all, so no aldehyde forms from it.")],
         [p], "ol", "NaBH₄ picks the ketone and leaves the ester.",
         prov("Rule R with NaBH4", CH_DER, NAB_CONV), lead(s, "methyl 3-oxobutanoate", "keto ester + NaBH₄"), level=0, concepts=RED,
         convention=NAB_CONV)

    s = "CC(=O)c1ccc(cc1)C(N)=O"
    p = nabh4(s)
    pick(node, "u8-nab-amide", "4-Acetylbenzamide meets NaBH₄. Pick the product.",
         [o("ol", p, "4-(1-hydroxyethyl)benzamide", "The ketone becomes a secondary alcohol; the amide is far too unreactive for NaBH₄."),
          o("amine", "CC(=O)c1ccc(CN)cc1", "1-[4-(aminomethyl)phenyl]ethan-1-one", "That reduces the amide and spares the ketone, the reverse of NaBH₄'s choice."),
          o("both", "CC(O)c1ccc(CN)cc1", "1-[4-(aminomethyl)phenyl]ethan-1-ol", "That is LiAlH₄ on both groups.")],
         [p], "ol", "Amides survive NaBH₄.",
         prov("Rule R with NaBH4", CH_DER, NAB_CONV), lead(s, "4-acetylbenzamide", "+ NaBH₄"), concepts=RED, convention=NAB_CONV)

    s = "O=Cc1ccc(cc1)C(=O)O"
    p = nabh4(s)
    pick(node, "u8-nab-acid", "4-Formylbenzoic acid meets NaBH₄, then H₃O⁺. Pick the product.",
         [o("ol", p, "4-(hydroxymethyl)benzoic acid", "The aldehyde becomes CH₂OH; the acid is untouched."),
          o("ald", "O=Cc1ccc(CO)cc1", "4-(hydroxymethyl)benzaldehyde", "That reduces the acid and keeps the aldehyde. NaBH₄ does the opposite."),
          o("diol", "OCc1ccc(CO)cc1", "[4-(hydroxymethyl)phenyl]methanol", "Reducing the acid as well takes LiAlH₄.")],
         [p], "ol", "Acids survive NaBH₄.",
         prov("Rule R with NaBH4", CH_ACID, NAB_CONV), lead(s, "4-formylbenzoic acid", "+ NaBH₄"), concepts=RED, convention=NAB_CONV)

    s = "N#CC1CCC(=O)CC1"
    p = nabh4(s)
    pick(node, "u8-nab-nitrile", "4-Oxocyclohexane-1-carbonitrile meets NaBH₄. Pick the product.",
         [o("ol", p, "4-hydroxycyclohexane-1-carbonitrile", "The ring ketone becomes CH-OH; the nitrile is left."),
          o("amine", "NCC1CCC(=O)CC1", "4-(aminomethyl)cyclohexan-1-one", "Reducing C≡N needs LiAlH₄."),
          o("ane", "N#CC1CCCCC1", "cyclohexanecarbonitrile", "NaBH₄ adds hydride to C=O; it does not remove the oxygen.")],
         [p], "ol", "Nitriles survive NaBH₄.",
         prov("Rule R with NaBH4", CH_ACID, NAB_CONV), lead(s, "4-oxocyclohexane-1-carbonitrile", "+ NaBH₄"), level=2, concepts=RED,
         convention=NAB_CONV)

    groups = {"ester": "COC(C)=O", "ketone": "CC(C)=O", "ald": "CC=O"}
    untouched = {k: canon(nabh4(v)) == canon(v) for k, v in groups.items()}
    ask(node, "u8-nab-group", "Pick the group NaBH₄ leaves untouched.",
        [("ester", "An ester", "The ester sits too low on the ladder for a mild hydride."),
         ("ketone", "A ketone", "Ketones are reduced to secondary alcohols."),
         ("ald", "An aldehyde", "Aldehydes are reduced fastest of all.")],
        untouched, True, "ester",
        "NaBH₄ is for aldehydes and ketones only.",
        prov("Rule R with NaBH4 on each group", CH_DER, NAB_CONV), lead("COC(C)=O", "methyl acetate", "three carbonyls + NaBH₄"),
        concepts=RED, convention=NAB_CONV)

    s = "COC(=O)CC(C)=O"
    got = [g for g in lialh4(s) if g != "CO"]
    pick(node, "u8-nab-lah", "Methyl 3-oxobutanoate meets LiAlH₄ instead. Pick the product.",
         [o("diol", got[0], "butane-1,3-diol", "LiAlH₄ reduces both: the ketone to CH-OH and the ester to CH₂OH."),
          o("ol", "COC(=O)CC(C)O", "methyl 3-hydroxybutanoate", "That is the NaBH₄ product. LiAlH₄ takes the ester too."),
          o("acid", "CC(O)CC(=O)O", "3-hydroxybutanoic acid", "No water attacks the ester; hydride does.")],
         got, "diol", "Swap NaBH₄ for LiAlH₄ and the ester goes too.",
         prov("Rule R with LiAlH4", CH_DER, LAH_CONV), lead(s, "methyl 3-oxobutanoate", "keto ester + LiAlH₄"), concepts=RED,
         convention=LAH_CONV)


def node_hvz() -> None:
    node = "u8-hvz"
    s = "CCC(=O)O"
    got = hvz(s)
    pick(node, "u8-hvz-meet", "Propanoic acid meets Br₂ and PBr₃, then H₂O. Pick the product.",
         [o("a", got[0], "2-bromopropanoic acid", "Br replaces one H on the alpha carbon, next to the C=O. The acid comes back on workup."),
          o("b", "OC(=O)CCBr", "3-bromopropanoic acid", "HVZ brominates the carbon next to the carbonyl, not the end carbon."),
          o("c", "CCC(=O)Br", "propanoyl bromide", "The acyl bromide forms along the way, but water turns it back into the acid.")],
         got, "a", "HVZ puts one Br on the alpha carbon of an acid.",
         prov("Rule D (HVZ): an alpha C-H swapped for C-Br", CH_ALPHA), lead(s, "propanoic acid", "1. Br₂, PBr₃  2. H₂O"), level=0, concepts=ACIDS)

    three = {"piv": "CC(C)(C)C(=O)O", "but": S["buacid"], "iso": "CC(C)C(=O)O"}
    pick(node, "u8-hvz-none", "Pick the acid that HVZ cannot brominate.",
         [o("piv", three["piv"], "2,2-dimethylpropanoic acid", "Its alpha carbon carries three methyls and no H, so there is nothing to replace."),
          o("but", three["but"], "butanoic acid", "Its alpha carbon is a CH₂, which has H to swap."),
          o("iso", three["iso"], "2-methylpropanoic acid", "Its alpha carbon still carries one H.")],
         [v for v in three.values() if not hvz(v)], "piv",
         "No alpha H, no HVZ.",
         prov("RDKit H count on the alpha carbon", CH_ALPHA), lead(S["buacid"], "butanoic acid", "three acids, Br₂/PBr₃"), concepts=ACIDS)

    br = got[0]
    ala, _ = sn2(br, "[*]N")
    pick(node, "u8-hvz-amino", "2-Bromopropanoic acid meets excess NH₃. Pick the product.",
         [o("ala", ala, "2-aminopropanoic acid", "NH₃ displaces bromide at the alpha carbon: an amino acid, alanine."),
          o("amd", "CC(Br)C(N)=O", "2-bromopropanamide", "The alpha C-Br is the target here, an SN2. The acid stays."),
          o("ol", "CC(O)C(=O)O", "2-hydroxypropanoic acid", "That needs water or hydroxide as the nucleophile.")],
         [ala], "ala", "The alpha bromide is a handle for SN2: here, an amino acid.",
         prov("SN2 edit on the HVZ product", CH_ALPHA), lead(br, "2-bromopropanoic acid", "+ excess NH₃"), level=2, concepts=SUB)

    ask(node, "u8-hvz-where", "HVZ adds one Br to butanoic acid. Pick its carbon.",
        [("alpha", "C2, next to the C=O", "HVZ works through the enol of the acyl bromide, which reacts at the alpha carbon."),
         ("c1", "C1, the carbonyl carbon", "C1 already has three bonds to O and one to C. Br sits on C1 only in the acyl bromide intermediate."),
         ("end", "C4, the far end", "That is radical chemistry. HVZ is selective for the alpha carbon.")],
        {"alpha": True, "c1": False, "end": None}, has(hvz(S["buacid"])[0], "Br[CX4][CX3](=O)[OX2H]"),
        "alpha", "HVZ brominates the alpha carbon only.",
        prov("Rule D (HVZ) product read by SMARTS", CH_ALPHA), lead(S["buacid"], "butanoic acid", "butanoic acid + Br₂, PBr₃"), concepts=ACIDS)

    pa = "OC(=O)Cc1ccccc1"
    got = hvz(pa)
    pick(node, "u8-hvz-phenyl", "Phenylacetic acid meets Br₂ and PBr₃, then H₂O. Pick the product.",
         [o("a", got[0], "2-bromo-2-phenylacetic acid", "The CH₂ between the ring and the C=O is the alpha carbon. Br goes there."),
          o("ring", "OC(=O)Cc1ccc(Br)cc1", "2-(4-bromophenyl)acetic acid", "Ring bromination needs FeBr₃. HVZ targets the alpha carbon."),
          o("ab", "O=C(Br)Cc1ccccc1", "2-phenylacetyl bromide", "Water at the end returns the acid.")],
         got, "a", "Same rule with an aryl group: the alpha CH₂ is brominated.",
         prov("Rule D (HVZ)", CH_ALPHA), lead(pa, "phenylacetic acid", "1. Br₂, PBr₃  2. H₂O"), concepts=ACIDS)

    ask(node, "u8-hvz-stereo", "Pick the stereo outcome of 2-bromopropanoic acid made by HVZ.",
        [("rac", "Racemic", "The new stereocentre forms from achiral starting materials, so both enantiomers form equally."),
         ("one", "One enantiomer", "Nothing chiral is in the flask to favour one."),
         ("none", "No stereocentre", "C2 holds H, Br, CH₃ and CO₂H: four different groups.")],
        {"rac": ("racemic", 1), "one": ("single", 1), "none": ("racemic", 0)}, outcome(br, s), "rac",
        "Achiral in, racemic out.",
        prov("RDKit stereocentre count; reactants achiral", CH_ALPHA), lead(s, "propanoic acid", "propanoic acid + Br₂, PBr₃"),
        level=2, concepts=ACIDS)


def node_kolbe() -> None:
    node = "u8-kolbe-e"
    p = kolbe(S["acoh"], S["acoh"])
    pick(node, "u8-kol-meet", "Acetate is electrolysed (Kolbe). Pick the hydrocarbon.",
         [o("e", p, "ethane", "Each acetate loses CO₂ to give a methyl radical, and two methyls join: ethane."),
          o("m", "CCCC", "butane", "Two methyls give two carbons. Butane would need two ethyls."),
          o("pr", "CCC", "propane", "Two methyls make two carbons. Propane needs a third.")],
         [p], "e", "Kolbe: two R-CO₂⁻ give R-R and two CO₂.",
         prov("Rule D (Kolbe): R-R after both carboxyl carbons leave", CH_ACID), lead(S["acetate"], "acetate", "acetate, electrolysis"),
         level=0, concepts=ACIDS)

    p = kolbe("CCC(=O)O", "CCC(=O)O")
    pick(node, "u8-kol-prop", "Propanoate is electrolysed. Pick the hydrocarbon.",
         [o("b", p, "butane", "Two ethyl radicals join: four carbons."),
          o("h", "CCCCCC", "hexane", "Each propanoate loses its carboxyl carbon first. Two ethyls, not two propyls."),
          o("e", "CC", "ethane", "Two ethyls join, so the chain doubles.")],
         [p], "b", "The R groups double; the carboxyl carbons leave.",
         prov("Rule D (Kolbe)", CH_ACID), lead("CCC(=O)[O-]", "propanoate", "propanoate, electrolysis"), concepts=ACIDS)

    a, b = S["acoh"], "CCC(=O)O"
    mix = sorted({kolbe(a, a), kolbe(a, b), kolbe(b, b)})
    ask(node, "u8-kol-mixed", "Acetate and propanoate are electrolysed together. Pick the products.",
        [("all", "Ethane, propane and butane", "Methyl and ethyl radicals pair at random: methyl with methyl, methyl with ethyl, ethyl with ethyl."),
         ("cross", "Propane only", "Nothing makes the radicals pick a partner of the other kind."),
         ("homo", "Ethane and butane only", "Methyl and ethyl radicals can also meet each other, giving propane.")],
        {"all": sorted([canon("CC"), canon("CCC"), canon("CCCC")]), "cross": [canon("CCC")], "homo": sorted([canon("CC"), canon("CCCC")])},
        mix, "all", "A mixed Kolbe gives a statistical mixture.",
        prov("Rule D (Kolbe) on every pairing", CH_ACID), lead("CCC(=O)[O-]", "propanoate", "acetate + propanoate"), level=2, concepts=ACIDS)

    def atoms_no_charge(smis: list[str]) -> dict[str, int]:
        return {k: v for k, v in atoms_of(smis).items() if k != "charge"}
    cands = {"co2": "O=C=O.O=C=O", "co": "[C-]#[O+].[C-]#[O+].O.O", "h2o": "O.O"}
    hits = [k for k, v in cands.items() if atoms_no_charge([S["acoh"], S["acoh"]]) == atoms_no_charge([kolbe(S["acoh"], S["acoh"]), v, "[HH]"])]
    ask(node, "u8-kol-gas", "Pick the gas each carboxylate gives off at the anode.",
        [("co2", "Carbon dioxide", "The carboxyl carbon leaves with both oxygens as CO₂."),
         ("co", "Carbon monoxide", "That leaves an oxygen behind with nowhere to go."),
         ("h2o", "Water", "No carbon would be lost, but the product has fewer carbons.")],
        {k: k for k in cands}, hits[0] if len(hits) == 1 else None, "co2",
        "Kolbe loses one CO₂ per carboxylate.",
        prov("RDKit atom balance for two acetic acids against ethane, H2 at the cathode and each candidate", CH_ACID),
        lead(S["acetate"], "acetate", "acetate at the anode"), concepts=ACIDS)

    p = kolbe("CCCCC(=O)O", "CCCCC(=O)O")
    ask(node, "u8-kol-count", "Pentanoate is electrolysed. Pick the product's carbon count.",
        [("eight", "Eight", "Each pentanoate loses one carbon as CO₂, leaving butyl. Two butyls: eight."),
         ("ten", "Ten", "The carboxyl carbons leave. Five minus one, twice."),
         ("four", "Four", "The radicals join in pairs, so the count doubles.")],
        {"eight": 8, "ten": 10, "four": 4}, carbons(p), "eight",
        "Kolbe: twice the R group, minus the carboxyl carbons.",
        prov("RDKit carbon count of the Kolbe product", CH_ACID), lead("CCCCC(=O)[O-]", "pentanoate", "pentanoate, electrolysis"), concepts=ACIDS)

    p = kolbe("OC(=O)C1CCCCC1", "OC(=O)C1CCCCC1")
    pick(node, "u8-kol-ring", "Cyclohexanecarboxylate is electrolysed. Pick the product.",
         [o("bi", p, "1,1'-bi(cyclohexane)", "Each ring loses its CO₂ and the two ring radicals join by one bond."),
          o("ch", "C1CCCCC1", "cyclohexane", "The radicals join each other rather than picking up H."),
          o("me", "CC1CCCCC1", "methylcyclohexane", "The carboxyl carbon leaves; it does not stay as a methyl.")],
         [p], "bi", "Kolbe joins any two R groups, rings included.",
         prov("Rule D (Kolbe)", CH_ACID), lead("[O-]C(=O)C1CCCCC1", "cyclohexanecarboxylate", "electrolysis"), level=2, concepts=ACIDS)


def node_hunsdiecker() -> None:
    node = "u8-hunsdiecker"
    s = S["buacid"]
    p = hunsdiecker(s)
    pick(node, "u8-hun-meet", "Silver butanoate meets Br₂. Pick the product.",
         [o("p", p, "1-bromopropane", "The carboxyl carbon leaves as CO₂ and Br goes where it was: one carbon shorter."),
          o("b", "CCCCBr", "1-bromobutane", "The carboxyl carbon does not stay. The chain loses it."),
          o("hvz", "CCC(Br)C(=O)O", "2-bromobutanoic acid", "That is HVZ. Hunsdiecker removes the CO₂H.")],
         [p], "p", "Hunsdiecker: RCO₂Ag plus Br₂ gives R-Br.",
         prov("Rule D (Hunsdiecker): Br where the carboxyl carbon was", CH_ACID), lead("CCCC(=O)[O-]", "butanoate", "silver butanoate + Br₂"),
         level=0, concepts=ACIDS)

    ask(node, "u8-hun-count", "Pick how the carbon count changes in a Hunsdiecker reaction.",
        [("minus", "One fewer carbon", "The carboxyl carbon leaves as CO₂."),
         ("same", "No change", "The CO₂H carbon is lost, so the count drops."),
         ("plus", "One more carbon", "Nothing adds carbon here.")],
        {"minus": -1, "same": 0, "plus": 1}, carbons(p) - carbons(s), "minus",
        "One carbon shorter, every time.",
        prov("RDKit carbon count before and after", CH_ACID), lead("CCCC(=O)[O-]", "butanoate", "silver butanoate + Br₂"), concepts=ACIDS)

    salt = "CCCC(=O)O[Ag]"
    cands = {"co2": "O=C=O.Br[Ag]", "co": "[C-]#[O+].O[Ag]", "hbr": "Br.O=C=O"}
    ask(node, "u8-hun-byproducts", "Pick the byproducts of silver butanoate plus Br₂.",
        [("co2", "CO₂ and AgBr", "The carboxyl group leaves as CO₂, and silver ends with the second bromine."),
         ("co", "CO and silver hydroxide", "Neither oxygen of the carboxyl is left behind on silver."),
         ("hbr", "HBr and CO₂", "There is no H to lose here, and silver has to go somewhere.")],
        {k: k for k in cands}, byproduct([salt, "BrBr"], [p], cands), "co2",
        "CO₂ and AgBr leave; the alkyl bromide stays.",
        prov("RDKit atom balance over three candidates", CH_ACID), lead("CCCC(=O)[O-]", "butanoate", "silver butanoate + Br₂"), concepts=ACIDS)

    ring = "OC(=O)C1CCCCC1"
    p2 = hunsdiecker(ring)
    pick(node, "u8-hun-ring", "Silver cyclohexanecarboxylate meets Br₂. Pick the product.",
         [o("br", p2, "bromocyclohexane", "The CO₂H carbon leaves and Br bonds to the ring carbon that held it."),
          o("bm", "BrCC1CCCCC1", "(bromomethyl)cyclohexane", "That keeps the carboxyl carbon as CH₂. It is lost as CO₂."),
          o("acid", "OC(=O)C1(Br)CCCCC1", "1-bromocyclohexane-1-carboxylic acid", "That is HVZ, which keeps the acid.")],
         [p2], "br", "Same rule on a ring.",
         prov("Rule D (Hunsdiecker)", CH_ACID), lead("[O-]C(=O)C1CCCCC1", "cyclohexanecarboxylate", "the silver salt + Br₂"), concepts=ACIDS)

    target = canon("CCCCBr")
    opts = {"pent": "CCCCC(=O)O", "but": S["buacid"], "hex": "CCCCCC(=O)O"}
    ask(node, "u8-hun-retro", "Pick the acid whose silver salt gives 1-bromobutane.",
        [("pent", "Pentanoic acid", "Five carbons in, the carboxyl carbon lost: four carbons with Br on the end."),
         ("but", "Butanoic acid", "That gives 1-bromopropane: one carbon too few."),
         ("hex", "Hexanoic acid", "That gives 1-bromopentane: one carbon too many.")],
        {k: hunsdiecker(v) == target for k, v in opts.items()}, True, "pent",
        "Work backwards by adding one carbon as CO₂H where the Br is.",
        prov("Rule D (Hunsdiecker) on each, compared with the target", CH_ACID), lead(target, "1-bromobutane", "the target"),
        level=2, concepts=ACIDS)

    changes = {"huns": carbons(hunsdiecker(s)) - carbons(s), "hvz": carbons(hvz(s)[0]) - carbons(s)}
    ask(node, "u8-hun-vs", "Pick what Hunsdiecker does that HVZ does not.",
        [("lose", "Removes the CO₂H carbon", "Hunsdiecker loses one carbon as CO₂. HVZ keeps every carbon and the acid."),
         ("alpha", "Puts Br on the alpha carbon", "That is HVZ. Hunsdiecker puts Br where the carboxyl was."),
         ("keep", "Keeps the carboxylic acid", "HVZ keeps the acid; Hunsdiecker destroys it.")],
        {"lose": changes["huns"] < 0 and changes["hvz"] == 0, "alpha": False, "keep": None}, True, "lose",
        "Both use Br₂ on an acid; only Hunsdiecker shortens the chain.",
        prov("RDKit carbon counts of both products", CH_ACID), lead(s, "butanoic acid", "Br₂ on an acid, two ways"), level=2, concepts=ACIDS)
# ---------------------------------------------------------------------------
# Held-out twins, for test-outs only
# ---------------------------------------------------------------------------

# Audit 23 Oct (top-25 "close behind", section 6 "exam-only twins"): the section tests and the unit exam
# replayed lesson screens word for word. Each twin asks a level 2 lesson item's skill on a new molecule, is
# derived by the same rule, and is written to U8_TEST_ONLY, which no lesson plays (testOutPool.ts reads it).
HELD: set[str] = set()


def node_held() -> None:
    before = set(IDS)

    pc, _ = acyl_sub("CCC(=O)O", "[*]Cl", ACID)
    pe, _ = acyl_sub(pc, "[*]OC")
    pick("u8-to-acylcl", "u8-held-acl-next", "Propanoic acid meets SOCl₂, then methanol. Pick the product.",
         [o("est", pe, "methyl propanoate", "SOCl₂ climbs to propanoyl chloride, then methanol takes it one step down to the ester."),
          o("cl", pc, "propanoyl chloride", "That is the halfway point. Methanol then attacks it and chloride leaves."),
          o("acid", "CCC(=O)O", "propanoic acid", "Methanol, not water, attacks the acyl chloride, so the acid does not come back.")],
         [pe], "est", "Climb once with SOCl₂, then walk down to whatever derivative you need.",
         prov("Rule S twice", CH_DER), lead("CCC(=O)O", "propanoic acid", "1. SOCl₂  2. methanol"), level=2, concepts=NAS)

    ring = "O=C1CCCC1C(=O)O"
    got = decarboxylate(ring)
    pick("u8-decarb", "u8-held-dec-ring", "2-Oxocyclopentane-1-carboxylic acid is heated. Pick the product.",
         [o("k", got[0], "cyclopentanone", "The CO₂H is on the carbon next to the ring C=O. It leaves as CO₂ and the enol gives the ketone."),
          o("acid", "OC(=O)C1CCCC1", "cyclopentanecarboxylic acid", "That loses the ketone O instead. Heat removes CO₂, not O."),
          o("ene", "O=C1C=CCC1", "cyclopent-2-en-1-one", "No H₂ is lost. The alpha carbon just takes an H.")],
         got, "k", "Ring or chain, a beta-keto acid loses CO₂.",
         prov("Rule D", CH_ALPHA), lead(ring, "2-oxocyclopentane-1-carboxylic acid", "β-keto acid, heat"), level=2, concepts=ACIDS)

    p, _ = grignard_twice("CCC(=O)OC", "c1ccccc1")
    pick("u8-organomet", "u8-held-org-phenyl", "Methyl propanoate meets excess C₆H₅MgBr, then H₃O⁺. Pick the product.",
         [o("t", p, "1,1-diphenylpropan-1-ol", "Two phenyls end on the old acyl carbon, with the ethyl and the OH."),
          o("k", "CCC(=O)c1ccccc1", "1-phenylpropan-1-one", "That ketone is the halfway point. Excess Grignard adds again."),
          o("s", "CCC(O)c1ccccc1", "1-phenylpropan-1-ol", "Only one phenyl there. Esters take two.")],
         [p], "t", "Two identical groups on the carbinol carbon is the fingerprint of ester plus Grignard.",
         prov("Rule G", CH_DER), lead("CCC(=O)OC", "methyl propanoate", "ester + excess C₆H₅MgBr"), level=2, concepts=NUCC)

    amd = "CCN(CC)C(C)=O"
    got = lialh4(amd)
    pick("u8-lialh4", "u8-held-lah-amide", "N,N-Diethylacetamide meets LiAlH₄, then H₂O. Pick the product.",
         [o("a", got[0], "N,N-diethylethanamine", "LiAlH₄ removes the amide's C=O oxygen. The C-N bond stays: a tertiary amine."),
          o("alc", "CCO", "ethanol", "That cuts the C-N bond, the ester outcome. An amide keeps its N and loses its O."),
          o("sec", "CCNCC", "N-ethylethanamine", "The acetyl carbon is not cut off. It stays on N as a third ethyl.")],
         got, "a", "LiAlH₄ turns an amide into an amine with the same carbons.",
         prov("Rule R with LiAlH4, amide O removed", CH_DER, LAH_CONV), lead(amd, "N,N-diethylacetamide", "amide + LiAlH₄"),
         level=2, concepts=RED, convention=LAH_CONV)

    est = "CCCOC(=O)c1ccc(C)cc1"
    carb, _ = saponify(est)
    pick("u8-hydrolysis", "u8-held-hyd-sapon", "Propyl 4-methylbenzoate is heated with NaOH. Pick the organic anion.",
         [o("carb", carb, "4-methylbenzoate", "Hydroxide swaps the propoxy group for OH, then base takes the acid's proton. The carboxylate stays until workup."),
          o("acid", "Cc1ccc(C(=O)O)cc1", "4-methylbenzoic acid", "In NaOH the acid cannot survive: it loses its proton. The acid only appears after acid workup."),
          o("alc", "Cc1ccc(CO)cc1", "(4-methylphenyl)methanol", "That is a reduction product. Hydroxide does not deliver hydride.")],
         [carb], "carb", "Saponification ends at the carboxylate.",
         prov("Rule S with water, then the CO2H deprotonated", CH_DER), lead(est, "propyl 4-methylbenzoate", "an aryl ester + NaOH"),
         level=2, concepts=NAS)

    HELD.update(IDS - before)


# ---------------------------------------------------------------------------
# Build and emit
# ---------------------------------------------------------------------------

# u8-ladder's drafted items are WIRED (audit 23 Oct, top-25 #3): its lesson opened on the level 2-3 acyl
# sort with nothing before it. They now play as the lesson's meet, recognise and connect steps, and the
# authored sort (beats/template.ts LADDER_FOR_NODE) stays its order step, the way u5-oxidation was wired on
# 2026-10-20. The sort's four cards are drawn from the table below.
ACYL_SORT = "sort-acyl-reactivity"


def acyl_sort_figures() -> None:
    """Drawings for the authored acyl sort (beats/sort/ladders.ts), keyed by its card ids, one acetyl compound each."""
    cards = {"acid-chloride": (S["acetyl_cl"], "acetyl chloride"), "anhydride": (S["ac2o"], "acetic anhydride"),
             "ester": (S["etoac"], "ethyl acetate"), "amide": (S["acetamide"], "acetamide")}
    want = {"acid-chloride": "acyl chloride", "anhydride": "anhydride", "ester": "ester", "amide": "amide"}
    for card, (smi, _) in cards.items():
        if acyl_class(smi) != want[card]:
            fail(f"{ACYL_SORT} card {card}: {smi} is a {acyl_class(smi)}")
    SORT_FIGURES[ACYL_SORT] = {card: named(smi, name) for card, (smi, name) in cards.items()}


def build() -> None:
    node_ladder()
    node_tetrahedral()
    node_to_acylcl()
    node_to_anhydride()
    node_fischer()
    node_acylcl_all()
    node_anhydride()
    node_hydrolysis()
    node_transester()
    node_amide_hyd()
    node_nitrile()
    node_lialh4()
    node_dibal()
    node_organomet()
    node_gilman()
    node_decarb()
    node_steglich()
    node_diazomethane()
    node_carboxylate_alk()
    node_weinreb()
    node_nabh4()
    node_hvz()
    node_kolbe()
    node_hunsdiecker()
    node_held()
    acyl_sort_figures()
    check_names()
    for node, entries in lesson_pools().items():
        if not 6 <= len(entries) <= 12:
            fail(f"{node}: {len(entries)} items, outside 6 to 12")
    for slot in range(4):
        share = CORRECT_INDEX.count(slot) / max(1, len(CORRECT_INDEX))
        if share > 0.5:
            fail(f"{share:.0%} of MCQs put the answer in slot {slot}")


HEADER = '''/**
 * Unit 8 (carboxylic acids and their derivatives) problem pools, a DRAFT.
 * GENERATED by scripts/u8_pools.py. Do not edit by hand: edit the specs in the
 * script and rerun it.
 *
 * EVERY ENTRY IS A DRAFT (`placeholder: true`) for the owner's review, never
 * presented as done. Each answer was derived by the script (graph edits for
 * acyl substitution, the tetrahedral intermediate, reductions, organometallic
 * additions, nitrile chemistry, decarboxylation, HVZ, Kolbe and Hunsdiecker;
 * RDKit atom balance for byproducts; every name read back by OPSIN), and the
 * script refuses to write this file when an authored key disagrees with what
 * it derived. Where an answer rests on an authored convention RDKit cannot
 * check (the reactivity ladder order, which hydride or organometallic stops
 * where, Le Chatelier), the entry's provenance says so.
 *
 * Every pool in U8_POOLS is a LESSON pool: MCQs join the node's recognise
 * step, and the ladders and match boards fill the lesson's order and connect
 * slots (beats/template.ts planLesson). u8-ladder's pool opens its lesson,
 * and its authored sort ladder (LADDER_FOR_NODE) stays the order step, drawn
 * from U8_SORT_FIGURES["sort-acyl-reactivity"]. U8_TEST_ONLY holds held-out
 * twins of level 2 items (same rule, new molecule) that only test-outs draw.
 * Ladders are built with createProblem and
 * createOrderingAnswer exactly as content/u5/pools.ts does; match boards go
 * through buildMatchBoard, so a bad board throws at import time.
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
    """The ladder() and match() helpers, the same text content/u5/pools.ts carries."""
    src = (REPO / "src" / "game" / "content" / "u5" / "pools.ts").read_text(encoding="utf-8")
    start = src.index("interface Expl {")
    end = src.index("/** Lesson pools keyed by map node id.")
    body = src[start:end].rstrip() + "\n\n"
    return body.replace('"u5-pool"', '"u8-pool"')


def ts(value) -> str:
    return json.dumps(value, ensure_ascii=False, indent=2)


def lesson_pools() -> dict[str, list[dict]]:
    return {n: [e for e in es if e.get("id") not in HELD] for n, es in POOLS.items()}


def held_pools() -> dict[str, list[dict]]:
    out = {n: [e for e in es if e.get("id") in HELD] for n, es in POOLS.items()}
    return {n: es for n, es in out.items() if es}


def emit_table(name: str, pools: dict[str, list[dict]], doc: str) -> list[str]:
    out = [doc, f"export const {name}: UnitPools = {{"]
    for node, entries in pools.items():
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
    out += emit_table("U8_POOLS", lesson_pools(), "/** Lesson pools keyed by map node id (beats/practice/pools.ts). */")
    out += emit_table("U8_TEST_ONLY", held_pools(),
                      "/** Held-out twins keyed by the lesson they twin: test-outs only (tabs/pathway/testOutPool.ts), never a lesson. */")
    out.append("/** The drawing beside each MCQ, keyed by beat id. */")
    out.append("export const U8_VISUALS: Readonly<Record<string, McqVisual>> = " + ts(VISUALS) + ";\n")
    out.append("/** Drawn options, keyed by beat id then option id. All or nothing per beat. */")
    out.append("export const U8_OPTION_TILES: Readonly<Record<string, Readonly<Record<string, NamedFigure>>>> = " + ts(TILES) + ";\n")
    out.append("/** A drawing for every sort card, keyed by beat id then item id. */")
    out.append("export const U8_SORT_FIGURES: Readonly<Record<string, Readonly<Record<string, NamedFigure>>>> = " + ts(SORT_FIGURES) + ";\n")
    return "\n".join(out)


def reset() -> None:
    for table in (POOLS, VISUALS, TILES, SORT_FIGURES, CONVENTIONS):
        table.clear()
    for seq in (CORRECT_INDEX, NAME_CHECKS, FAILURES, NOTES):
        seq.clear()
    IDS.clear()
    HELD.clear()


def report_disagreements() -> None:
    """Where RDKit's own numbers and the ladder convention part ways, printed for the owner report."""
    four = [("acetyl chloride", S["acetyl_cl"]), ("acetic anhydride", S["ac2o"]), ("ethyl acetate", S["etoac"]), ("acetamide", S["acetamide"])]
    def charge(smi: str) -> float:
        m = Chem.AddHs(mol(smi))
        rdPartialCharges.ComputeGasteigerCharges(m)
        return max(m.GetAtomWithIdx(c).GetDoubleProp("_GasteigerCharge") for c, _, _ in sites(smi))
    by_gasteiger = [n for n, s in sorted(four, key=lambda t: -charge(t[1]))]
    by_ladder = [n for n, s in sorted(four, key=lambda t: -rank(t[1]))]
    print("acyl C Gasteiger charge: " + ", ".join(f"{n} {charge(s):.4f}" for n, s in four))
    if by_gasteiger != by_ladder:
        print(f"DISAGREES: Gasteiger order {by_gasteiger}, ladder order {by_ladder}")


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
    for node, entries in lesson_pools().items():
        print(f"{node}: {len(entries)}")
        total += len(entries)
    print(f"total: {total}")
    print(f"held-out twins (test-outs only): {len(HELD)}")
    print("answer slot spread: " + ", ".join(f"{s}: {CORRECT_INDEX.count(s)}" for s in range(4)))
    print("entries resting on an authored convention:")
    for k, v in CONVENTIONS.items():
        print(f"  {k}: {v}")
    report_disagreements()
    print(f"wrote {OUT.relative_to(REPO)}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
