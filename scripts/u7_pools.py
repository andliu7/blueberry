"""
Unit 7 (aldehydes and ketones: nucleophilic addition) problem pools, a DRAFT, derived with RDKit.

Run:     python scripts/u7_pools.py
Writes:  src/game/content/u7/pools.ts (never edit it by hand: edit the specs
         below and rerun). The owner's report for this unit is written by hand
         beside the run, from what this script prints.

Built on scripts/u5_pools.py: the figure, naming, entry and emit helpers are
copied from it unchanged. Every entry is `placeholder: true`.

THE MODEL. Check these rules, not the hundred answers. Each is a graph edit on
RDKit molecules; the script never types a product. A nucleophile is written as
a SMILES with one [*] marking the atom that bonds (two for a diol or dithiol).

A. Addition: the nucleophile bonds to the aldehyde or ketone carbon, the C=O
   becomes C-O, and workup puts H on the O (or leaves the alkoxide, when an
   item asks for the intermediate). Grignard, organolithium, hydride, cyanide,
   water and one alcohol all run through this one edit.

C. Condensation: the C=O oxygen leaves (as water) and the carbonyl carbon bonds
   to the nucleophile instead: one double bond (C=N for an imine, oxime,
   hydrazone; C=C for a Wittig or HWE alkene) or two single bonds (an acetal or
   thioacetal; one ring when both ends belong to one diol).

E. Enamine: a secondary amine bonds by a single bond, the oxygen leaves, and a
   C=C forms to each alpha carbon that carries an H, so every constitutional
   enamine comes out. A tertiary amine has no N-H and gives nothing.

H. Hydrolysis runs C or E backwards: the C=N, the enamine N-C, or both acetal
   C-O bonds are cut and the carbon gets its C=O back.

R. Reductions: hydride turns C=O into CH-OH. LiAlH4 also cuts an ester's acyl
   C-O bond and reduces the acyl carbon to CH2-OH. To CH2 (Clemmensen,
   Wolff-Kishner, Raney Ni on a thioacetal): the oxygen (or both sulfurs) is
   removed and the carbon takes H in its place.

K. 1,4 addition: on C=C-C=O the nucleophile bonds to the far alkene carbon,
   that C=C becomes single and the C=O stays (the keto form; the enol and keto
   forms are compared with RDKit's tautomer scoring where an item asks).

B. Baeyer-Villiger: an O is inserted between the carbonyl carbon and the group
   that moves. Which group moves is migratory aptitude (H > 3 > 2 = aryl > 1 >
   methyl), an authored convention; the script refuses a ketone where two
   groups of different kinds tie.

O. Aldehyde oxidation inserts O into the aldehyde C-H. No C-H, no reaction.
   Cannizzaro (an aldehyde with no alpha H) gives one alcohol (rule R) and one
   carboxylate. MPV and Oppenauer are rule R and its reverse with propan-2-ol
   and acetone as the partners.

Mass balance. Where an item asks for a byproduct (water, N2, Ph3PO, a
phosphate, acetone), the right one is the only candidate whose atoms balance,
counted by RDKit.

Names. Every drawn structure is named, and OPSIN must read the name back as
exactly the drawing.

What is a CONVENTION, flagged in each entry's provenance and printed by the
run: which carbonyl is more reactive or more hydrated (counted from alkyl and
halogen substituents; RDKit's Gasteiger charges disagree, see the owner
report), hard nucleophiles add 1,2 and cuprates 1,4, NaBH4 leaves an ester,
acetals survive base and fall apart in aqueous acid, an HWE gives the E alkene,
migratory aptitude, which reagents oxidise only aldehydes (Tollens), and that
formaldehyde is the one oxidised in a crossed Cannizzaro.

CHECK SOURCE, never adapted: OpenStax Organic Chemistry (CC BY-NC-SA 4.0)
chapter 19 is NAMED as the check for each entry. It was not read in this
drafting run: the check is owed, and the owner report says so.
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
OUT = REPO / "src" / "game" / "content" / "u7" / "pools.ts"

SCRIPT = "scripts/u7_pools.py"


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
OPSIN_DIR = Path(tempfile.mkdtemp(prefix="u7_opsin_"))


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
    if not id.startswith("u7-"):
        fail(f"{id}: ids start u7-")
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
        "problemId": "u7-pool-" + id,
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
# The Unit 7 model: graph edits on the aldehyde or ketone C=O
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


ESTER = Chem.MolFromSmarts("[CX3](=[OX1])[OX2][#6]")


def lialh4(smi: str) -> list[str]:
    """Rule R with LiAlH4: ketones and aldehydes to alcohols, each ester to two alcohols."""
    m = mol(reduce_co(smi)) if co_sites(smi) else mol(smi)
    rw = Chem.RWMol(m)
    for c, o, oa, _ in m.GetSubstructMatches(ESTER):
        rw.RemoveBond(c, oa)
        rw.GetBondBetweenAtoms(c, o).SetBondType(SINGLE)
    return frags(rw)


# -- Rule C: condensation

def condense(smi: str, nu: str, site: tuple[int, int] | None = None) -> str:
    c, o = site or the_co(smi)
    rw, heads, dummies = merge(smi, nu)
    if len(heads) == 1:
        rw.AddBond(c, heads[0], DOUBLE)
    else:
        for h in heads:
            rw.AddBond(c, h, SINGLE)
    drop(rw, dummies + [o])
    return one(rw)


def amine_hs(smi: str) -> int:
    n = match_one(smi, "[NX3;!$(N-C=O)]")
    return mol(smi).GetAtomWithIdx(n[0]).GetTotalNumHs()


def enamines(smi: str, nu: str) -> list[str]:
    """Rule E: one product per alpha carbon that carries an H."""
    c, o = the_co(smi)
    m = mol(smi)
    alphas = [n.GetIdx() for n in m.GetAtomWithIdx(c).GetNeighbors()
              if n.GetSymbol() == "C" and not n.GetIsAromatic() and n.GetTotalNumHs() > 0]
    out = set()
    for a in alphas:
        rw, heads, dummies = merge(smi, nu)
        rw.AddBond(c, heads[0], SINGLE)
        rw.GetBondBetweenAtoms(c, a).SetBondType(DOUBLE)
        drop(rw, dummies + [o])
        out.add(one(rw))
    return sorted(out)


def with_amine(smi: str, amine: str) -> list[str]:
    """Primary amine: the imine. Secondary: every enamine. Tertiary: nothing."""
    hs = amine_hs(amine)
    if hs == 2:
        return [condense(smi, as_nu(amine, "[NX3;H2]"))]
    if hs == 1:
        return enamines(smi, as_nu(amine, "[NX3;H1]"))
    return []


# -- Rule H: hydrolysis

def new_o(rw: Chem.RWMol, c: int, order=DOUBLE) -> int:
    i = rw.AddAtom(Chem.Atom(8))
    rw.AddBond(c, i, order)
    return i


def hydrolyse_imine(smi: str) -> list[str]:
    c, n = match_one(smi, "[CX3]=[NX2]")
    rw = Chem.RWMol(mol(smi))
    rw.RemoveBond(c, n)
    new_o(rw, c)
    return frags(rw)


def hydrolyse_enamine(smi: str) -> list[str]:
    n, c, a = match_one(smi, "[NX3]-[CX3]=[CX3]")
    rw = Chem.RWMol(mol(smi))
    rw.RemoveBond(n, c)
    rw.GetBondBetweenAtoms(c, a).SetBondType(SINGLE)
    new_o(rw, c)
    return frags(rw)


def hydrolyse_acetal(smi: str) -> list[str]:
    hits = mol(smi).GetSubstructMatches(Chem.MolFromSmarts("[CX4]([OX2,SX2;!H1][#6])[OX2,SX2;!H1][#6]"))
    centres = {h[0] for h in hits}
    if len(centres) != 1:
        raise ValueError(f"{smi}: {len(centres)} acetal carbons")
    c = hits[0][0]
    rw = Chem.RWMol(mol(smi))
    for h in [x for x in (hits[0][1], hits[0][3])]:
        rw.RemoveBond(c, h)
    new_o(rw, c)
    return frags(rw)


# -- Rule R, to CH2

def to_ch2(smi: str) -> str:
    c, o = the_co(smi)
    rw = Chem.RWMol(mol(smi))
    drop(rw, [o])
    return one(rw)


def raney(smi: str) -> list[str]:
    """Every sulfur removed; each carbon it held takes an H instead."""
    rw = Chem.RWMol(mol(smi))
    drop(rw, [a.GetIdx() for a in rw.GetAtoms() if a.GetSymbol() == "S"])
    return frags(rw)


# -- Rule K: 1,4 addition

def conj(smi: str, nu: str) -> str:
    b, a, c, o = match_one(smi, "[CX3]=[CX3]-[CX3]=[OX1]")
    rw, heads, dummies = merge(smi, nu)
    rw.GetBondBetweenAtoms(b, a).SetBondType(SINGLE)
    rw.AddBond(b, heads[0], SINGLE)
    drop(rw, dummies)
    return one(rw)


def keto_form(smi: str) -> str:
    return Chem.MolToSmiles(rdMolStandardize.TautomerEnumerator().Canonicalize(mol(smi)))


# -- Rule B: Baeyer-Villiger; rule O: oxidation

APTITUDE = {"H": 5, "tertiary": 4, "secondary": 3, "aryl": 3, "primary": 2, "methyl": 1}


def group_kind(m: Chem.Mol, c: int, g: int | None) -> str:
    if g is None:
        return "H"
    a = m.GetAtomWithIdx(g)
    if a.GetIsAromatic():
        return "aryl"
    return ["methyl", "primary", "secondary", "tertiary"][cdeg(m, g) - 1]


def insert_o(smi: str, c: int, g: int | None, charge: int = 0) -> str:
    rw = Chem.RWMol(mol(smi))
    if g is None:
        o = new_o(rw, c, SINGLE)
        rw.GetAtomWithIdx(o).SetFormalCharge(charge)
    else:
        rw.RemoveBond(c, g)
        o = rw.AddAtom(Chem.Atom(8))
        rw.AddBond(c, o, SINGLE)
        rw.AddBond(o, g, SINGLE)
    return one(rw)


def bv(smi: str) -> tuple[str, str] | None:
    """(product, kind of group that moved), or None when two groups of different kinds tie."""
    c, o = the_co(smi)
    m = mol(smi)
    groups: list[int | None] = [n.GetIdx() for n in m.GetAtomWithIdx(c).GetNeighbors() if n.GetIdx() != o]
    if m.GetAtomWithIdx(c).GetTotalNumHs():
        groups.append(None)
    kinds = {g: group_kind(m, c, g) for g in groups}
    best = max(APTITUDE[k] for k in kinds.values())
    top = [g for g, k in kinds.items() if APTITUDE[k] == best]
    if len({kinds[g] for g in top}) != 1:
        return None
    products = {insert_o(smi, c, g) for g in top}
    if len(products) != 1:
        return None
    return products.pop(), kinds[top[0]]


def oxidise_ald(smi: str, charge: int = 0) -> list[str]:
    c, o = the_co(smi)
    if mol(smi).GetAtomWithIdx(c).GetTotalNumHs() == 0:
        return []
    return [insert_o(smi, c, None, charge)]


def alpha_h(smi: str) -> int:
    c, _ = the_co(smi)
    a = mol(smi).GetAtomWithIdx(c)
    return sum(n.GetTotalNumHs() for n in a.GetNeighbors()
               if n.GetSymbol() == "C" and n.GetHybridization() == Chem.HybridizationType.SP3)


def cannizzaro(smi: str) -> list[str]:
    """No alpha H: one molecule to the alcohol, one to the carboxylate. Else nothing."""
    if alpha_h(smi) > 0:
        return []
    return sorted([reduce_co(smi), oxidise_ald(smi, charge=-1)[0]])


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


def reactivity(smi: str) -> tuple[int, int]:
    """CONVENTION: halogens on the alpha carbons first, then fewer carbons on the C=O carbon, means more reactive."""
    c, _ = the_co(smi)
    m = mol(smi)
    hal = sum(1 for n in m.GetAtomWithIdx(c).GetNeighbors() for x in n.GetNeighbors() if x.GetSymbol() in ("F", "Cl", "Br"))
    return (hal, -cdeg(m, c))


def gasteiger_c(smi: str) -> float:
    c, _ = the_co(smi)
    m = Chem.AddHs(mol(smi))
    rdPartialCharges.ComputeGasteigerCharges(m)
    return m.GetAtomWithIdx(c).GetDoubleProp("_GasteigerCharge")


def label_ez(smi: str, want: str) -> str:
    """The stereoisomer of `smi` whose one C=C RDKit labels `want` (E or Z) by CIP."""
    for iso in EnumerateStereoisomers(mol(smi)):
        Chem.AssignStereochemistry(iso, cleanIt=True, force=True)
        labels = [b.GetStereo() for b in iso.GetBonds() if b.GetStereo() != Chem.BondStereo.STEREONONE]
        if len(labels) != 1:
            continue
        rdCIPLabeler.AssignCIPLabels(iso)
        cip = [b.GetProp("_CIPCode") for b in iso.GetBonds() if b.HasProp("_CIPCode")]
        if cip == [want]:
            return Chem.MolToSmiles(iso)
    raise ValueError(f"{smi}: no {want} isomer")


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


CH = "ch. 19"
CH_ACID = "ch. 20"
CARB = ("carbonyl_chemistry",)
NUC = ("nucleophilic_addition_carbon",)
OXY = ("nucleophilic_addition_oxygen",)
NIT = ("nucleophilic_addition_nitrogen",)
PROT = ("protecting_group_strategy",)
RED = ("oxidation_state_ladder",)
EWG = ("carbonyl_chemistry", "ewg_edg_rubric")
CONJ = ("conjugate_addition",)

S = {
    "hcho": "C=O",
    "mecho": "CC=O",
    "etcho": "CCC=O",
    "acetone": "CC(C)=O",
    "butanone": "CCC(C)=O",
    "chx": "O=C1CCCCC1",
    "cpn": "O=C1CCCC1",
    "phcho": "O=Cc1ccccc1",
    "acph": "CC(=O)c1ccccc1",
    "pent3": "CCC(=O)CC",
    "pinacolone": "CC(=O)C(C)(C)C",
    "chloral": "O=CC(Cl)(Cl)Cl",
    "pivald": "CC(C)(C)C=O",
    "chxenone": "O=C1C=CCCC1",
    "mvk": "C=CC(C)=O",
    "mesityl": "CC(=O)C=C(C)C",
    "keto_ester": "CC(=O)CCC(=O)OC",
}


# ---------------------------------------------------------------------------
# u7-mechanism
# ---------------------------------------------------------------------------

def node_mechanism() -> None:
    node = "u7-mechanism"
    s = S["acetone"]
    c, o = the_co(s)
    m = Chem.AddHs(mol(s))
    rdPartialCharges.ComputeGasteigerCharges(m)
    plus = "C" if m.GetAtomWithIdx(c).GetDoubleProp("_GasteigerCharge") > 0 > m.GetAtomWithIdx(o).GetDoubleProp("_GasteigerCharge") else "O"
    ask(node, "u7-mech-meet", "A nucleophile meets the C=O of propanone. Pick the atom it attacks.",
        [("c", "The carbonyl carbon", "Oxygen pulls the shared electrons toward itself, so the carbon is electron poor (partial plus). Electron-rich nucleophiles go there."),
         ("o", "The carbonyl oxygen", "The oxygen is the electron-rich end (partial minus). Electrophiles and acids go to oxygen; nucleophiles do not."),
         ("me", "A methyl carbon", "A methyl carbon has only C-H and C-C bonds and no pi bond to break, so it gives a nucleophile nowhere to put electrons.")],
        {"c": "C", "o": "O", "me": "Me"}, plus, "c",
        "C=O is polar: the carbon is the electrophile, the oxygen the nucleophile.",
        prov("Gasteiger partial charges: carbonyl C positive, O negative", CH),
        lead(s, "propan-2-one", "propanone"), level=0, concepts=CARB)

    pick(node, "u7-mech-alkoxide", "Propanone meets CH₃MgBr. Pick the species before any workup.",
         [("alk", add(s, "[*]C", alkoxide=True), "2-methylpropan-2-olate", "2-Methylpropan-2-olate",
           "The methyl bonds to the carbonyl carbon and the pi electrons land on oxygen. Nothing has protonated that oxygen yet, so it is an alkoxide."),
          ("alc", "CC(C)(C)O", "2-methylpropan-2-ol", "2-Methylpropan-2-ol",
           "That is the product after workup. Before acid is added there is no proton source in a Grignard flask."),
          ("h", "CC(C)[O-]", "propan-2-olate", "Propan-2-olate",
           "That adds H to the carbon. The Grignard brings a methyl, so the new bond is C-CH₃.")],
         [add(s, "[*]C", alkoxide=True)], "alk",
         "Addition stops at the alkoxide. The O-H only appears in a separate workup step.",
         prov("Rule A, alkoxide left unprotonated", CH),
         lead(s, "propan-2-one", "propanone + CH₃MgBr"), concepts=NUC)

    alk = add(s, "[*]C", alkoxide=True)
    pick(node, "u7-mech-workup", "The alkoxide from propanone and CH₃MgBr meets H₃O⁺. Pick the product.",
         [("alc", "CC(C)(C)O", "2-methylpropan-2-ol", "2-Methylpropan-2-ol",
           "Workup only adds a proton to the negative oxygen. The carbon skeleton is already complete."),
          ("ene", "C=C(C)C", "2-methylprop-1-ene", "2-Methylpropene",
           "That loses water, a dehydration. Cold dilute workup protonates; it does not eliminate."),
          ("ket", s, "propan-2-one", "Propanone",
           "The methyl does not leave again. A carbanion is a very poor leaving group, so the addition is not reversed.")],
         [canon(alk.replace("[O-]", "O"))], "alc",
         "Workup is its own step: it turns the alkoxide into the alcohol.",
         prov("Rule A, then the O- protonated", CH),
         structure(alk, "2-methylpropan-2-olate", "alkoxide + H₃O⁺"), concepts=NUC)

    prod = add(s, "[*]C")
    pm = mol(prod)
    cc = [a for a in pm.GetAtoms() if a.GetSymbol() == "C" and any(n.GetSymbol() == "O" for n in a.GetNeighbors())][0]
    hyb = str(cc.GetHybridization()).lower()
    ask(node, "u7-mech-sp3", "After addition, the old carbonyl carbon is hybridised how. Pick one.",
        [("sp3", "sp³, four single bonds", "It now holds O, the nucleophile and its two old groups: four sigma bonds, tetrahedral."),
         ("sp2", "sp², still trigonal", "The pi bond is gone, so nothing keeps it flat. Trigonal was the starting carbonyl."),
         ("sp", "sp, linear", "sp needs two pi bonds, as in a nitrile or alkyne carbon. This carbon has none.")],
        {"sp3": "sp3", "sp2": "sp2", "sp": "sp"}, hyb, "sp3",
        "Addition turns a flat sp² carbon into a tetrahedral sp³ one.",
        prov("RDKit hybridisation of the carbinol carbon in the product", CH),
        lead(prod, "2-methylpropan-2-ol", "after addition"), concepts=CARB)

    trio = {"hcho": S["hcho"], "mecho": S["mecho"], "acetone": S["acetone"]}
    best = max(trio, key=lambda k: reactivity(trio[k]))
    pick(node, "u7-mech-reactive", "Pick the carbonyl most reactive toward a nucleophile.",
         [("hcho", S["hcho"], "formaldehyde", "Methanal",
           "No alkyl groups: the carbon is the least crowded and gets no electron donation, so it is the most electrophilic."),
          ("mecho", S["mecho"], "acetaldehyde", "Ethanal",
           "One methyl donates a little electron density and adds a little bulk. Reactive, but less than methanal."),
          ("acetone", S["acetone"], "propan-2-one", "Propanone",
           "Two alkyl groups: more crowding at the carbon and more donation. Ketones are the least reactive here.")],
         [trio[best]], "hcho",
         "Aldehydes beat ketones, and methanal beats every other aldehyde: fewer alkyl groups, more reactive.",
         prov("carbon neighbours of each carbonyl carbon counted", CH, "fewer alkyl groups on C=O means more reactive"),
         lead(S["mecho"], "acetaldehyde", "three carbonyls"), level=2, concepts=EWG,
         convention="fewer alkyl groups on C=O means more reactive")

    p = add(S["mecho"], "[*]CC")
    ask(node, "u7-mech-racemic", "Ethanal meets CH₃CH₂MgBr, then H₃O⁺. Pick what forms.",
        [("rac", "Racemic butan-2-ol", "The new stereocentre forms on a flat carbon that is attacked equally from both faces, so both enantiomers form."),
         ("one", "One enantiomer of butan-2-ol", "One enantiomer needs something chiral in the flask. Nothing here is chiral."),
         ("none", "Butan-2-ol with no stereocentre", "C2 holds H, OH, methyl and ethyl: four different groups, so it is a stereocentre.")],
        {"rac": ("racemic", 1), "one": ("single", 1), "none": ("racemic", 0)}, outcome(p, S["mecho"], "CC[Mg]Br"), "rac",
        "An achiral carbonyl plus an achiral nucleophile gives a racemate whenever a stereocentre forms.",
        prov("Rule A, then RDKit counts stereocentres in the product; reactants are achiral", CH),
        lead(S["mecho"], "acetaldehyde", "ethanal + CH₃CH₂MgBr"), level=2, concepts=("prochirality_re_si",))


# ---------------------------------------------------------------------------
# u7-hydration
# ---------------------------------------------------------------------------

def node_hydration() -> None:
    node = "u7-hydration"
    s = S["chx"]
    pick(node, "u7-hyd-meet", "Cyclohexanone sits in water with a trace of acid. Pick the hydrate.",
         [("gem", hydrate(s), "cyclohexane-1,1-diol", "Cyclohexane-1,1-diol",
           "Water adds across C=O: OH on the carbonyl carbon and H on the oxygen. Both OH groups end up on one carbon, a gem-diol."),
          ("vic", "OC1CCCCC1O", "cyclohexane-1,2-diol", "Cyclohexane-1,2-diol",
           "That puts OH on two neighbouring carbons, which is alkene chemistry. Water adds to the one carbonyl carbon."),
          ("ol", "OC1CCCCC1", "cyclohexanol", "Cyclohexanol",
           "That is a reduction: H on carbon. Water brings OH to carbon, not H.")],
         [hydrate(s)], "gem",
         "Hydration puts two OH groups on the old carbonyl carbon: a gem-diol.",
         prov("Rule A with water", CH), lead(s, "cyclohexanone", "cyclohexanone + H₂O"), level=0, concepts=OXY)

    s = S["hcho"]
    pick(node, "u7-hyd-hcho", "Methanal dissolves in water. Pick its hydrate.",
         [("diol", hydrate(s), "methanediol", "Methanediol",
           "Water adds across the C=O to give CH₂(OH)₂. For methanal this hydrate is most of what is in the flask."),
          ("meoh", "CO", "methanol", "Methanol",
           "That needs a hydride. Water gives the carbon an OH, not an H."),
          ("acid", "O=CO", "formic acid", "Methanoic acid",
           "That is an oxidation. Hydration adds water; the carbon's oxidation level does not change.")],
         [hydrate(s)], "diol",
         "The hydrate keeps the carbonyl's oxidation level: two C-O bonds instead of one C=O.",
         prov("Rule A with water", CH), lead(s, "formaldehyde", "methanal in water"), concepts=OXY)

    trio = {"chloral": S["chloral"], "mecho": S["mecho"], "acetone": S["acetone"]}
    best = max(trio, key=lambda k: reactivity(trio[k]))
    pick(node, "u7-hyd-chloral", "Pick the carbonyl with the most hydrate at equilibrium.",
         [("chloral", S["chloral"], "2,2,2-trichloroacetaldehyde", "Trichloroethanal",
           "Three chlorines pull electron density away from the carbonyl carbon, so the C=O is less stable and the hydrate wins."),
          ("mecho", S["mecho"], "acetaldehyde", "Ethanal",
           "An aldehyde with a plain methyl. Without the chlorines the C=O holds on better, so less hydrate forms."),
          ("acetone", S["acetone"], "propan-2-one", "Propanone",
           "Two alkyl groups stabilise the C=O and crowd the hydrate. Very little hydrate forms.")],
         [trio[best]], "chloral",
         "Electron-withdrawing groups next to C=O favour the hydrate; alkyl groups disfavour it.",
         prov("halogens on the alpha carbon and alkyl groups on C=O counted", CH, "electron-withdrawing groups favour the hydrate"),
         lead(S["chloral"], "2,2,2-trichloroacetaldehyde", "three carbonyls in water"), level=2, concepts=EWG,
         convention="electron-withdrawing groups favour the hydrate")

    # 18O exchange: the hydrate's two OH are equal, so losing either one is allowed.
    s = S["acetone"]
    hyd = add(s, "[*][18OH]")
    rw = mol(hyd)
    gem = match_one(hyd, "[CX4]([OX2H])[OX2H]")
    backs = set()
    for leave in (gem[1], gem[2]):
        e = Chem.RWMol(rw)
        keep = gem[2] if leave == gem[1] else gem[1]
        e.GetAtomWithIdx(keep).SetNumExplicitHs(0)
        e.GetBondBetweenAtoms(gem[0], keep).SetBondType(DOUBLE)
        drop(e, [leave])
        backs.add(one(e))
    labelled = canon("[18O]=C(C)C") in backs
    ask(node, "u7-hyd-label", "Propanone stirs in H₂¹⁸O with a trace of acid. Pick where ¹⁸O ends up.",
        [("co", "In the C=O of propanone", "The hydrate has two equal OH groups, one of them ¹⁸O. Losing the ordinary OH gives back propanone carrying ¹⁸O."),
         ("water", "Only in the water", "That would need the hydrate to always lose the labelled OH. The two OH groups are equivalent, so either can leave."),
         ("ch3", "On a methyl carbon", "No step touches the methyl groups. Only the carbonyl carbon gains and loses oxygen.")],
        {"co": True, "water": False, "ch3": "methyl"}, labelled, "co",
        "Hydration is reversible, so the carbonyl oxygen swaps with water's.",
        prov("Rule A with H2(18)O, then each OH removed in turn and the products compared", CH),
        lead(s, "propan-2-one", "propanone in H₂¹⁸O"), concepts=OXY)

    diff = {k: atoms_of([hydrate(S["butanone"])]).get(k, 0) - atoms_of([S["butanone"]]).get(k, 0) for k in ("H", "O")}
    ask(node, "u7-hyd-atoms", "Butanone becomes its hydrate. Pick what was added.",
        [("h2o", "H₂O, H to O and OH to C", "The hydrate has two more H and one more O than butanone: one water, split across C=O."),
         ("h2", "H₂, one H to each atom", "That is a reduction to butan-2-ol. The hydrate gains an oxygen, which H₂ cannot give."),
         ("o", "One O, nothing else", "An extra O alone would be an oxidation. The hydrate also has two more H.")],
        {"h2o": {"H": 2, "O": 1}, "h2": {"H": 2, "O": 0}, "o": {"H": 0, "O": 1}}, diff, "h2o",
        "Hydration adds exactly one water.",
        prov("Rule A with water; atoms counted on both sides", CH),
        lead(S["butanone"], "butan-2-one", "butanone + H₂O"), concepts=OXY)

    trio = {"hfa": "FC(F)(F)C(=O)C(F)(F)F", "acetone": S["acetone"], "pent3": S["pent3"]}
    best = max(trio, key=lambda k: reactivity(trio[k]))
    pick(node, "u7-hyd-fluoro", "Three ketones sit in water. Pick the one mostly hydrated.",
         [("hfa", trio["hfa"], "1,1,1,3,3,3-hexafluoropropan-2-one", "Hexafluoropropanone",
           "Six fluorines strip electron density from the carbonyl carbon. The C=O is so destabilised that the hydrate dominates."),
          ("acetone", trio["acetone"], "propan-2-one", "Propanone",
           "Two methyls donate electron density and stabilise the C=O. The hydrate is a tiny fraction."),
          ("pent3", trio["pent3"], "pentan-3-one", "Pentan-3-one",
           "Two ethyls: as much donation as propanone and more bulk around the carbon, so even less hydrate.")],
         [trio[best]], "hfa",
         "Withdrawing groups make a ketone behave like a very reactive aldehyde.",
         prov("halogens on the alpha carbons counted", CH, "electron-withdrawing groups favour the hydrate"),
         lead(S["acetone"], "propan-2-one", "three ketones in water"), level=2, concepts=EWG,
         convention="electron-withdrawing groups favour the hydrate")


def hydrate(smi: str) -> str:
    return add(smi, "[*]O")


# ---------------------------------------------------------------------------
# u7-acetal
# ---------------------------------------------------------------------------

def node_acetal() -> None:
    node = "u7-acetal"
    s = S["etcho"]
    hemi = add(s, "[*]OC")
    acetal = condense(s, "[*]OC.[*]OC")
    pick(node, "u7-acl-meet", "Propanal meets one CH₃OH with a trace of acid. Pick the first adduct.",
         [("hemi", hemi, "1-methoxypropan-1-ol", "1-Methoxypropan-1-ol",
           "One alcohol adds across C=O: OCH₃ and OH on the same carbon. That is a hemiacetal."),
          ("acetal", acetal, "1,1-dimethoxypropane", "1,1-Dimethoxypropane",
           "That needs a second methanol and loss of water. With one equivalent the first adduct is the hemiacetal."),
          ("ester", "CCC(=O)OC", "methyl propanoate", "Methyl propanoate",
           "An ester keeps a C=O. Addition removes the C=O; it never oxidises the carbon.")],
         [hemi], "hemi",
         "One alcohol gives a hemiacetal: one OR and one OH on the old carbonyl carbon.",
         prov("Rule A with methanol", CH), lead(s, "propanal", "propanal + CH₃OH"), level=0, concepts=OXY)

    pick(node, "u7-acl-acetal", "Propanal meets excess CH₃OH and acid, water removed. Pick the product.",
         [("acetal", acetal, "1,1-dimethoxypropane", "1,1-Dimethoxypropane",
           "The hemiacetal's OH is protonated and leaves as water; a second methanol takes its place. Two OR on one carbon: an acetal."),
          ("hemi", hemi, "1-methoxypropan-1-ol", "1-Methoxypropan-1-ol",
           "That is the halfway point. Excess alcohol and removing water push on to the acetal."),
          ("ether", "CCCOC", "1-methoxypropane", "1-Methoxypropane",
           "That has lost an oxygen from the old carbonyl carbon. An acetal keeps two C-O bonds there.")],
         [acetal], "acetal",
         "Excess alcohol with water removed takes the hemiacetal on to the acetal.",
         prov("Rule C with two methanols", CH), lead(s, "propanal", "propanal + excess CH₃OH"), concepts=OXY)

    s = S["chx"]
    cyc = condense(s, "[*]OCCO[*]")
    pick(node, "u7-acl-diol", "Cyclohexanone meets ethane-1,2-diol and acid. Pick the product.",
         [("cyc", cyc, "1,4-dioxaspiro[4.5]decane", "1,4-Dioxaspiro[4.5]decane",
           "Both OH groups of one diol bond to the carbonyl carbon, closing a five-membered ring: a cyclic acetal."),
          ("open", "OCCOC1(O)CCCCC1", "1-(2-hydroxyethoxy)cyclohexan-1-ol", "Open hemiacetal",
           "That is the hemiacetal on the way. The second OH is held close, so it closes the ring and water leaves."),
          ("ether", "OCCOC1CCCCC1", "2-(cyclohexyloxy)ethan-1-ol", "2-(Cyclohexyloxy)ethanol",
           "That has lost an oxygen and gained an H on the ring carbon. No reducing agent is present.")],
         [cyc], "cyc",
         "A 1,2-diol gives a cyclic acetal, a 1,3-dioxolane ring.",
         prov("Rule C with both ends of one diol", CH), lead(s, "cyclohexanone", "cyclohexanone + HOCH₂CH₂OH"), concepts=OXY)

    s = "OCCCCC=O"
    lactol = intramolecular_hemiacetal(s)
    pick(node, "u7-acl-lactol", "5-Hydroxypentanal closes on itself. Pick the cyclic hemiacetal.",
         [("six", lactol, "oxan-2-ol", "Oxan-2-ol",
           "The OH on C5 reaches the C1 carbonyl. The ring holds C1 to C5 and the O: six atoms."),
          ("five", "OC1CCCO1", "oxolan-2-ol", "Oxolan-2-ol",
           "A five-membered ring needs the OH on C4. Here it is on C5, so the ring is one atom bigger."),
          ("diol", "OCCCCCO", "pentane-1,5-diol", "Pentane-1,5-diol",
           "That reduces the aldehyde. Closing the ring only adds O-H across the C=O inside one molecule.")],
         [lactol], "six",
         "A hydroxy aldehyde that can reach a five or six-membered ring closes to a lactol.",
         prov("Rule A inside one molecule; RDKit ring size read", CH), lead(s, "5-hydroxypentanal", "5-hydroxypentanal"),
         level=2, concepts=OXY)

    s = "COC(C)(C)OC"
    back = hydrolyse_acetal(s)
    pick(node, "u7-acl-hydrolysis", "2,2-Dimethoxypropane meets aqueous acid. Pick the carbonyl formed.",
         [("acetone", "CC(C)=O", "propan-2-one", "Propanone",
           "Both C-OCH₃ bonds break and the carbon gets its C=O back. The central carbon held two methyls, so it is propanone."),
          ("ester", "COC(C)=O", "methyl acetate", "Methyl acetate",
           "That keeps one OCH₃ on the carbon. Excess water removes both methoxy groups."),
          ("ald", "CCC=O", "propanal", "Propanal",
           "The carbon skeleton does not rearrange. The acetal carbon had two methyls, so it returns as a ketone.")],
         back, "acetone",
         "Acetal hydrolysis returns the carbonyl and two alcohols; it is formation run backwards.",
         prov("Rule H on the acetal", CH), lead(s, "2,2-dimethoxypropane", "2,2-dimethoxypropane + H₃O⁺"), concepts=OXY)

    left = [S["etcho"], "CO", "CO"]
    cand = {"water": "O", "oh": "[OH-]", "meoh": "CO"}
    ask(node, "u7-acl-water", "Propanal and two CH₃OH give the dimethyl acetal. Pick the other product.",
        [("water", "Water", "The carbonyl oxygen leaves as water once it is protonated. That is why removing water drives the acetal to form."),
         ("oh", "Hydroxide ion", "In acid the OH is protonated first and leaves as neutral water. Hydroxide is a poor leaving group and is never set free here."),
         ("meoh", "Methanol", "Both methanols are built into the acetal. None is given back while it forms.")],
        {k: k for k in cand}, byproduct(left, [acetal], cand), "water",
        "Acetal formation releases one water, so removing water pushes it forward.",
        prov("Rule C, then RDKit atom balance over each candidate", CH),
        lead(acetal, "1,1-dimethoxypropane", "the acetal"), concepts=OXY)

    s = "OCCCC=O"
    lac = intramolecular_hemiacetal(s)
    ring = ring_size_new(s, lac)
    ask(node, "u7-acl-ring", "4-Hydroxybutanal closes to a lactol. Pick the ring size.",
        [("five", "Five-membered ring", "C1 to C4 plus the O that attacks: five atoms. Five and six-membered rings form easily."),
         ("four", "Four-membered ring", "That counts only the carbons. The attacking oxygen is in the ring too."),
         ("six", "Six-membered ring", "Six needs the OH on C5. Here the chain stops at C4.")],
        {"five": 5, "four": 4, "six": 6}, ring, "five",
        "Count the chain from C1 to the OH carbon, then add the oxygen.",
        prov("Rule A inside one molecule; RDKit ring size read", CH), lead(s, "4-hydroxybutanal", "4-hydroxybutanal"),
        concepts=OXY)


def intramolecular_hemiacetal(smi: str) -> str:
    c, o = the_co(smi)
    oh = match_one(smi, "[CX4][OX2H]")[1]
    rw = Chem.RWMol(mol(smi))
    rw.GetBondBetweenAtoms(c, o).SetBondType(SINGLE)
    rw.AddBond(c, oh, SINGLE)
    return one(rw)


# ---------------------------------------------------------------------------
# u7-protect
# ---------------------------------------------------------------------------

def node_protect() -> None:
    node = "u7-protect"
    s = S["acph"]
    prot = condense(s, "[*]OCCO[*]")
    pick(node, "u7-pro-meet", "Acetophenone meets ethane-1,2-diol and acid. Pick the protected form.",
         [("diox", prot, "2-methyl-2-phenyl-1,3-dioxolane", "2-Methyl-2-phenyl-1,3-dioxolane",
           "The diol closes a five-membered acetal on the ketone carbon. No C=O is left for a nucleophile."),
          ("hemi", "CC(O)(OCCO)c1ccccc1", "1-(2-hydroxyethoxy)-1-phenylethan-1-ol", "Open hemiacetal",
           "That is the halfway point. In acid the OH is protonated and leaves as water, and the diol's second OH closes the five-membered ring."),
          ("ether", "CC(OCCO)c1ccccc1", "2-(1-phenylethoxy)ethan-1-ol", "Ether alcohol",
           "That has lost an oxygen from the ketone carbon. Protection keeps both oxygens on it.")],
         [prot], "diox",
         "Protection turns the C=O into an acetal ring that nucleophiles and bases ignore.",
         prov("Rule C with ethane-1,2-diol", CH), lead(s, "1-phenylethan-1-one", "acetophenone + diol"), level=0, concepts=PROT)

    # u7-pro-ester and u7-pro-grignard used to sit here. They lean on LiAlH4 on
    # esters and on Grignard formation, taught later, so they now close
    # u7-hydride and u7-grignard (audit 23 Oct, top-25 #18): see the
    # protect_capstone_* functions below.
    # Two single-step items take their place: put the acetal on (u7-pro-ring, played
    # before u7-pro-off so the acetal is formed before it is taken off), and see
    # that base leaves it on (u7-pro-base).
    ring_s = S["chx"]
    ring = condense(ring_s, "[*]OCCO[*]")
    pick(node, "u7-pro-ring", "Cyclohexanone meets ethane-1,2-diol and acid. Pick the protected form.",
         [("five", ring, "1,4-dioxaspiro[4.5]decane", "1,4-Dioxaspiro[4.5]decane",
           "Two O and the diol's two CH₂ close a five-membered ring on the old carbonyl carbon."),
          ("six", "C1CCC2(CC1)OCCCO2", "1,5-dioxaspiro[5.5]undecane", "1,5-Dioxaspiro[5.5]undecane",
           "A six-membered acetal ring needs three CH₂ between the oxygens, from propane-1,3-diol. This diol has two."),
          ("hemi", "OCCOC1(O)CCCCC1", "2-[(1-hydroxycyclohexyl)oxy]ethan-1-ol", "Open hemiacetal",
           "That is the halfway point. The OH is protonated and leaves as water, and the second OH closes the ring.")],
         [ring], "five",
         "The diol's chain sets the ring: two carbons between the oxygens make a five-membered acetal.",
         prov("Rule C with ethane-1,2-diol", CH), lead(ring_s, "cyclohexanone", "cyclohexanone + diol"), concepts=PROT)

    back = hydrolyse_acetal(prot)
    pick(node, "u7-pro-off", "2-Methyl-2-phenyl-1,3-dioxolane meets H₃O⁺. Pick the organic product.",
         [("ket", s, "1-phenylethan-1-one", "Acetophenone",
           "Aqueous acid runs acetal formation backwards: both C-O bonds break and the ketone returns."),
          ("alc", "CC(O)c1ccccc1", "1-phenylethan-1-ol", "1-Phenylethanol",
           "That is a reduction. Deprotection only swaps the two C-O bonds back for one C=O."),
          ("diol", "CC(O)(O)c1ccccc1", "1-phenylethane-1,1-diol", "The hydrate",
           "The hydrate is in equilibrium with the ketone and loses water. What you isolate is the ketone.")],
         back, "ket",
         "H₃O⁺ takes the acetal off and gives the original ketone back.",
         prov("Rule H on the acetal", CH), structure(prot, "2-methyl-2-phenyl-1,3-dioxolane", "protected ketone + H₃O⁺"),
         concepts=PROT)

    s, prot = ring_s, ring
    got = no_rxn(prot, [])
    pick(node, "u7-pro-base", "1,4-Dioxaspiro[4.5]decane is warmed in aqueous NaOH. Pick what you recover.",
         [("same", prot, "1,4-dioxaspiro[4.5]decane", "The acetal, unchanged",
           "Base has no proton to put on an acetal oxygen, so no oxygen can leave. That is why the acetal is a protecting group."),
          ("ket", s, "cyclohexanone", "Cyclohexanone",
           "That is what aqueous acid does. Hydroxide cannot open an acetal."),
          ("hemi", "OCCOC1(O)CCCCC1", "2-[(1-hydroxycyclohexyl)oxy]ethan-1-ol", "Open hemiacetal",
           "Opening the ring needs an acetal oxygen protonated first. In base nothing is.")],
         got, "same",
         "Acetals survive base and come off only in aqueous acid.",
         prov("No rule applies: the acetal is drawn again", CH, "acetals survive base and fall apart in aqueous acid"),
         structure(prot, "1,4-dioxaspiro[4.5]decane", "protected ketone + NaOH, water"), level=2, concepts=PROT,
         convention="acetals survive base and fall apart in aqueous acid")

    s = S["keto_ester"]
    hit = {"ket": len(co_sites(s)) == 1, "ester": False, "both": len(co_sites(s)) == 2}
    ask(node, "u7-pro-site", "Methyl 4-oxopentanoate meets ethane-1,2-diol and acid. Pick the group that reacts.",
        [("ket", "The ketone C=O", "A ketone carbon has only carbon groups, so it adds the diol and closes the acetal."),
         ("ester", "The ester C=O", "The ester's OCH₃ lone pair is shared with its C=O, so it is a poor electrophile and forms no acetal."),
         ("both", "Both C=O groups", "Only aldehydes and ketones form acetals. The ester is left as it is.")],
        {"ket": True, "ester": hit["ester"], "both": hit["both"]}, hit["ket"], "ket",
        "Acetals form from aldehydes and ketones, which is why one can hide a ketone beside an ester.",
        prov("SMARTS for an aldehyde or ketone C=O, which excludes the ester", CH, "esters do not form acetals"),
        lead(s, "methyl 4-oxopentanoate", "keto ester + diol"), concepts=PROT, convention="esters do not form acetals")

    s = "CC(=O)CCC=O"
    sites = co_sites(s)
    m = mol(s)
    pref = max(sites, key=lambda site: -cdeg(m, site[0]))
    once = condense(s, "[*]OCCO[*]", site=pref)
    pick(node, "u7-pro-which", "4-Oxopentanal meets one equivalent of ethane-1,2-diol. Pick the main product.",
         [("ald", once, "4-(1,3-dioxolan-2-yl)butan-2-one", "Aldehyde protected",
           "The aldehyde carbon carries one alkyl group, the ketone two, so the aldehyde is the more reactive C=O and is protected first."),
          ("ket", condense(s, "[*]OCCO[*]", site=[x for x in sites if x != pref][0]), "3-(2-methyl-1,3-dioxolan-2-yl)propanal", "Ketone protected",
           "The ketone is more crowded and less electrophilic. With only one equivalent it is left for last."),
          ("both", condense(once, "[*]OCCO[*]"), "2-methyl-2-[2-(1,3-dioxolan-2-yl)ethyl]-1,3-dioxolane", "Both protected",
           "That needs two equivalents of diol. With one, the faster carbonyl takes it.")],
         [once], "ald",
         "Aldehydes protect before ketones: fewer alkyl groups, faster addition.",
         prov("Rule C at the carbonyl with fewer carbon neighbours", CH, "aldehydes react faster than ketones"),
         lead(s, "4-oxopentanal", "keto aldehyde + one diol"), level=2, concepts=PROT,
         convention="aldehydes react faster than ketones")


def protect_capstone_ester(node: str) -> None:
    """u7-pro-ester, the closing question of u7-hydride: it needs LiAlH4 on an ester (u7-hdr-lah-ester) first."""
    s = S["keto_ester"]
    step1 = condense(s, "[*]OCCO[*]")
    step2 = [f for f in lialh4(step1) if f != "CO"]
    step3 = [f for f in hydrolyse_acetal(step2[0]) if f != "OCCO"]
    pick(node, "u7-pro-ester", "Methyl 4-oxopentanoate: diol and H⁺, then LiAlH₄, then H₃O⁺. Pick the product.",
         [("target", step3[0], "5-hydroxypentan-2-one", "5-Hydroxypentan-2-one",
           "The ketone hides as an acetal, LiAlH₄ reduces only the ester to CH₂OH, and acid brings the ketone back."),
          ("diol", "CC(O)CCCO", "pentane-1,4-diol", "Pentane-1,4-diol",
           "That is what LiAlH₄ gives with no protection: both carbonyls reduced."),
          ("keto", "CC(O)CCC(=O)OC", "methyl 4-hydroxypentanoate", "Methyl 4-hydroxypentanoate",
           "That reduces the ketone and keeps the ester, backwards on both counts: the ketone was hidden, and LiAlH₄ reduces esters.")],
         step3, "target",
         "Protect, react elsewhere, deprotect: the ketone comes through untouched.",
         prov("Rule C, then rule R with LiAlH4, then rule H, applied in turn", CH, "acetals survive LiAlH4 and fall apart in aqueous acid"),
         lead(s, "methyl 4-oxopentanoate", "keto ester, three steps"), level=2, concepts=PROT,
         convention="acetals survive LiAlH4 and fall apart in aqueous acid")


def protect_capstone_grignard(node: str) -> None:
    """u7-pro-grignard, the closing question of u7-grignard, after u7-grg-mg has made a Grignard from Mg."""
    # Grignard on a protected bromoaldehyde.
    s = "BrCCCC=O"
    p1 = condense(s, "[*]OCCO[*]")
    nu = Chem.RWMol(mol(p1))
    br = [a.GetIdx() for a in nu.GetAtoms() if a.GetSymbol() == "Br"][0]
    nu.ReplaceAtom(br, Chem.Atom(0))
    rnu = one(nu)
    p2 = add(S["acetone"], rnu)
    p3 = [f for f in hydrolyse_acetal(p2) if f != "OCCO"]
    # The question stops before the acid step: the open chain 5-hydroxy aldehyde
    # could close to a lactol (see u7-acl-lactol), so it is not asked for here.
    pick(node, "u7-pro-grignard", "Protected 4-bromobutanal: Mg, then propanone, then neutral water. Pick the product.",
         [("acetal", p2, "5-(1,3-dioxolan-2-yl)-2-methylpentan-2-ol", "Still protected",
           "With the aldehyde hidden, Mg makes a Grignard at C-Br, it adds to propanone, and water protonates the alkoxide. The acetal stays."),
          ("diol", "CC(C)(O)CCCCO", "5-methylhexane-1,5-diol", "5-Methylhexane-1,5-diol",
           "That has lost the acetal and reduced the aldehyde. None of these steps is a hydride source."),
          ("target", p3[0], "5-hydroxy-5-methylhexanal", "5-Hydroxy-5-methylhexanal",
           "Taking the acetal off needs aqueous acid. Neutral water leaves it on.")],
         [p2], "acetal",
         "A Grignard and an aldehyde cannot share a molecule unless the aldehyde is protected.",
         prov("Rule C, Br to MgBr, rule A on propanone, applied in turn", CH, "acetals survive Grignard reagents and a neutral workup"),
         lead(s, "4-bromobutanal", "4-bromobutanal, three steps"), level=2, concepts=PROT,
         convention="acetals survive Grignard reagents and a neutral workup")


# ---------------------------------------------------------------------------
# u7-imine
# ---------------------------------------------------------------------------

def node_imine() -> None:
    node = "u7-imine"
    s = S["chx"]
    imine = with_amine(s, "CN")
    pick(node, "u7-imn-meet", "Cyclohexanone meets CH₃NH₂ with a trace of acid. Pick the product.",
         [("imine", imine[0], "N-methylcyclohexanimine", "N-Methylcyclohexanimine",
           "The amine adds, the carbinolamine loses water, and N keeps a double bond to the old carbonyl carbon: C=N, an imine."),
          ("carb", "CNC1(O)CCCCC1", "1-(methylamino)cyclohexan-1-ol", "The carbinolamine",
           "That is the intermediate. Its OH is protonated and leaves as water to give the C=N."),
          ("amine", "CNC1CCCCC1", "N-methylcyclohexanamine", "N-Methylcyclohexanamine",
           "That needs a reducing agent, as in reductive amination. Without one the C=N stays.")],
         imine, "imine",
         "A primary amine and a ketone give an imine and water.",
         prov("Rule C with a primary amine", CH), lead(s, "cyclohexanone", "cyclohexanone + CH₃NH₂"), level=0, concepts=NIT)

    s = S["phcho"]
    imine = with_amine(s, "Nc1ccccc1")
    pick(node, "u7-imn-aniline", "Benzaldehyde meets aniline with a trace of acid. Pick the product.",
         [("imine", imine[0], "N-benzylideneaniline", "N-Benzylideneaniline",
           "Aniline is a primary amine, so it ends as C=N-Ph with water lost."),
          ("amide", "O=C(Nc1ccccc1)c1ccccc1", "N-phenylbenzamide", "N-Phenylbenzamide",
           "An amide keeps C=O and needs an acid derivative. An aldehyde loses its oxygen here."),
          ("amine", "c1ccc(CNc2ccccc2)cc1", "N-benzylaniline", "N-Benzylaniline",
           "That has two H added across C=N. No reducing agent is present.")],
         imine, "imine",
         "Aryl or alkyl, a primary amine gives an imine.",
         prov("Rule C with a primary amine", CH), lead(s, "benzaldehyde", "benzaldehyde + aniline"), concepts=NIT)

    amines = {"prim": "CCCN", "sec": "CCNCC", "tert": "CCN(CC)CC"}
    gives = {k: (lambda p: "imine" if p and mol(p[0]).HasSubstructMatch(Chem.MolFromSmarts("C=N")) else "other")(with_amine(S["acetone"], v)) for k, v in amines.items()}
    pick(node, "u7-imn-which", "Pick the amine that turns propanone into an imine.",
         [("prim", amines["prim"], "propan-1-amine", "Propan-1-amine",
           "Primary: N has two H. One goes in the carbinolamine step, the other in the last step that forms C=N."),
          ("sec", amines["sec"], "N-ethylethanamine", "Diethylamine",
           "Secondary: after addition N has no H left to lose, so it cannot form C=N. It makes an enamine."),
          ("tert", amines["tert"], "N,N-diethylethanamine", "Triethylamine",
           "Tertiary: no N-H at all, so the addition cannot finish. No imine or enamine forms.")],
         [amines[k] for k, v in gives.items() if v == "imine"], "prim",
         "Imine formation needs two N-H: a primary amine.",
         prov("Rule E/C on each amine, product read for C=N", CH), lead(S["acetone"], "propan-2-one", "propanone + three amines"),
         concepts=NIT)

    s = "CCCN=C(C)C"
    back = hydrolyse_imine(s)
    pick(node, "u7-imn-hydrolysis", "N-Propylpropan-2-imine meets aqueous acid. Pick the carbonyl formed.",
         [("acetone", "CC(C)=O", "propan-2-one", "Propanone",
           "Water adds to C=N and the amine leaves. The carbon side of C=N becomes C=O: two methyls, so propanone."),
          ("propanal", "CCC=O", "propanal", "Propanal",
           "That would come from the nitrogen's propyl group. The C=O forms on the carbon that held the C=N."),
          ("amide", "CCCNC(C)=O", "N-propylacetamide", "N-Propylacetamide",
           "An amide would need a carbon to be oxidised. Hydrolysis only swaps =N for =O.")],
         back, "acetone",
         "Split a C=N at the double bond: the carbon half becomes the carbonyl, the N half the amine.",
         prov("Rule H on the imine", CH), lead(s, "N-propylpropan-2-imine", "imine + H₃O⁺"), concepts=NIT)

    target = canon("C(=NC1CCCCC1)c1ccccc1")
    pairs = {"right": (S["phcho"], "NC1CCCCC1"), "swap": (S["chx"], "NCc1ccccc1"), "acid": ("OC(=O)c1ccccc1", "NC1CCCCC1")}
    made = {}
    for k, (carb, am) in pairs.items():
        try:
            made[k] = with_amine(carb, am)
        except ValueError:
            made[k] = []
    ask(node, "u7-imn-retro", "Pick the pair that makes N-benzylidenecyclohexanamine.",
        [("right", "Benzaldehyde + cyclohexanamine", "Cut the C=N: the CH carbon came from the aldehyde, the N with its cyclohexyl from the amine."),
         ("swap", "Cyclohexanone + benzylamine", "That puts the C=N inside the ring: N-benzylcyclohexanimine, a different imine."),
         ("acid", "Benzoic acid + cyclohexanamine", "An acid has no aldehyde or ketone C=O to add to, so no imine forms here.")],
        {k: (made[k] == [target]) for k in pairs}, True, "right",
        "Disconnect C=N into a carbonyl half and an amine half.",
        prov("Rule C run on each pair and compared with the target", CH),
        lead(target, "N-benzylidenecyclohexanamine", "the target imine"), level=2, concepts=NIT)

    s = "CC(=O)CCCN"
    rw = Chem.RWMol(mol(s))
    c, o = the_co(s)
    n = match_one(s, "[NX3H2]")[0]
    rw.AddBond(c, n, DOUBLE)
    drop(rw, [o])
    cyc = one(rw)
    pick(node, "u7-imn-ring", "5-Aminopentan-2-one cyclises. Pick the cyclic imine.",
         [("five", cyc, "5-methyl-3,4-dihydro-2H-pyrrole", "5-Methyl-3,4-dihydro-2H-pyrrole",
           "N on C5 reaches the C2 carbonyl: C2, C3, C4, C5 and N make a five-membered ring with the C=N inside it."),
          ("six", "CC1=NCCCC1", "6-methyl-2,3,4,5-tetrahydropyridine", "Six-membered cyclic imine",
           "A six-membered ring needs one more CH₂ between the C=O and the NH₂."),
          ("amine", "CC1CCCN1", "2-methylpyrrolidine", "2-Methylpyrrolidine",
           "That is the reduced ring. Without a hydride source the C=N stays.")],
         [cyc], "five",
         "An amine and a ketone in one chain close to a cyclic imine when the ring is five or six.",
         prov("Rule C inside one molecule; ring size read by RDKit", CH), lead(s, "5-aminopentan-2-one", "5-aminopentan-2-one"),
         level=2, concepts=NIT)

    cand = {"water": "O", "nh3": "N", "oh": "[OH-]"}
    left = [S["chx"], "CN"]
    ask(node, "u7-imn-water", "Cyclohexanone and CH₃NH₂ give the imine. Pick the other product.",
        [("water", "Water", "The carbonyl O leaves with two H: one from N and one from the acid catalyst, then returned. Net: water."),
         ("nh3", "Ammonia", "The nitrogen stays in the imine. Losing NH₃ would remove the very atom that makes the C=N."),
         ("oh", "Hydroxide ion", "The trace of acid protonates the carbinolamine OH, so it leaves as neutral water, not as hydroxide.")],
        {k: k for k in cand}, byproduct(left, with_amine(S["chx"], "CN"), cand), "water",
        "Imines form by condensation: water is lost.",
        prov("Rule C, then RDKit atom balance over each candidate", CH),
        lead(S["chx"], "cyclohexanone", "cyclohexanone + CH₃NH₂"), concepts=NIT)


# ---------------------------------------------------------------------------
# u7-enamine
# ---------------------------------------------------------------------------

def node_enamine() -> None:
    node = "u7-enamine"
    s = S["chx"]
    en = with_amine(s, "C1CCNC1")
    pick(node, "u7-enm-meet", "Cyclohexanone meets pyrrolidine, acid, water removed. Pick the product.",
         [("en", en[0], "1-(cyclohex-1-en-1-yl)pyrrolidine", "1-(Cyclohex-1-enyl)pyrrolidine",
           "The secondary amine adds and water leaves, giving an iminium with no N-H. An alpha C-H is lost instead, so C=C forms beside N."),
          ("sat", "C1CCC(N2CCCC2)CC1", "1-cyclohexylpyrrolidine", "1-Cyclohexylpyrrolidine",
           "That has no C=C or C=N. Getting there needs a reducing agent."),
          ("allyl", "C1=CC(N2CCCC2)CCC1", "1-(cyclohex-2-en-1-yl)pyrrolidine", "1-(Cyclohex-2-enyl)pyrrolidine",
           "The C=C must touch the carbon bonded to N: it forms by losing the H next to the iminium carbon.")],
         en, "en",
         "A secondary amine gives an enamine: N-C=C.",
         prov("Rule E with pyrrolidine", CH), lead(s, "cyclohexanone", "cyclohexanone + pyrrolidine"), level=0, concepts=NIT)

    amines = {"sec": "C1CCNC1", "prim": "CCCN", "tert": "CN1CCCC1"}
    kind = {}
    for k, v in amines.items():
        p = with_amine(S["chx"], v)
        kind[k] = "enamine" if p and mol(p[0]).HasSubstructMatch(Chem.MolFromSmarts("[NX3]C=C")) else "other"
    pick(node, "u7-enm-which", "Pick the amine that turns cyclohexanone into an enamine.",
         [("sec", amines["sec"], "pyrrolidine", "Pyrrolidine",
           "Secondary: one N-H, used in the addition. The iminium then has no N-H, so an alpha C-H goes and C=C forms."),
          ("prim", amines["prim"], "propan-1-amine", "Propan-1-amine",
           "Primary: N still has an H at the end, so it loses that one and forms C=N, an imine."),
          ("tert", amines["tert"], "1-methylpyrrolidine", "1-Methylpyrrolidine",
           "Tertiary: no N-H, so the addition cannot finish to a neutral product.")],
         [amines[k] for k, v in kind.items() if v == "enamine"], "sec",
         "Enamines come from secondary amines.",
         prov("Rule E/C on each amine, product read for N-C=C", CH), lead(S["chx"], "cyclohexanone", "cyclohexanone + three amines"),
         concepts=NIT)

    # the iminium from a secondary amine has no N-H, so the last H must come off carbon
    c, o = the_co(S["chx"])
    rw, heads, dummies = merge(S["chx"], as_nu("C1CCNC1", "[NX3;H1]"))
    rw.AddBond(c, heads[0], DOUBLE)
    rw.GetAtomWithIdx(heads[0]).SetFormalCharge(1)
    drop(rw, dummies + [o])
    iminium = one(rw)
    nh = mol(iminium).GetAtomWithIdx(match_one(iminium, "[N+]")[0]).GetTotalNumHs()
    ask(node, "u7-enm-site", "The iminium from cyclohexanone and pyrrolidine loses H⁺. Pick where from.",
        [("alpha", "A carbon next to the C=N⁺ carbon", "The N⁺ carries no H, so the base takes an alpha C-H. Its electrons form C=C and neutralise the N."),
         ("n", "The nitrogen", "In this iminium the N holds two ring carbons and the C=N: no H left. With a primary amine it would, giving an imine."),
         ("cn", "The C=N⁺ carbon itself", "That carbon has no H: it holds N and two ring carbons.")],
        {"alpha": 0, "n": 1, "cn": -1}, nh, "alpha",
        "The final deprotonation site decides imine (N-H) or enamine (alpha C-H).",
        prov("Iminium built by rule C with N+, then RDKit counts H on N", CH),
        structure(iminium, "1-cyclohexylidenepyrrolidin-1-ium", "the iminium ion"), concepts=NIT)

    s = S["etcho"]
    en = with_amine(s, "CNC")
    pick(node, "u7-enm-ald", "Propanal meets dimethylamine with acid, water removed. Pick the enamine.",
         [("en", en[0], "N,N-dimethylprop-1-en-1-amine", "N,N-Dimethylprop-1-en-1-amine",
           "The N bonds to C1 and the C=C forms from C1 to C2, the only alpha carbon with H."),
          ("allyl", "C=CCN(C)C", "N,N-dimethylprop-2-en-1-amine", "N,N-Dimethylprop-2-en-1-amine",
           "Here the C=C is not on the carbon bonded to N. An enamine's C=C starts at the N-bearing carbon."),
          ("imine", "CCC=[N+](C)C", "N-methyl-N-propylidenemethanaminium", "The iminium ion",
           "That is the step before. Losing an alpha H turns it into the neutral enamine.")],
         en, "en", "Aldehydes give enamines too, as long as an alpha carbon has an H.",
         prov("Rule E with dimethylamine", CH), lead(s, "propanal", "propanal + (CH₃)₂NH"), flat_key=True, concepts=NIT)

    s = "C1=C(CCCC1)N1CCOCC1"
    back = hydrolyse_enamine(s)
    pick(node, "u7-enm-hydrolysis", "4-(Cyclohex-1-enyl)morpholine meets aqueous acid. Pick the carbonyl formed.",
         [("ket", S["chx"], "cyclohexanone", "Cyclohexanone",
           "Protonating the alpha carbon gives back the iminium, water adds, and morpholine leaves: the ketone returns."),
          ("ol", "OC1CCCCC1", "cyclohexanol", "Cyclohexanol",
           "No hydride is present. Hydrolysis restores C=O, it does not reduce it."),
          ("enol", "OC1=CCCCC1", "cyclohex-1-en-1-ol", "The enol",
           "The enol is a tautomer that turns into the ketone. What you isolate is cyclohexanone.")],
         back, "ket",
         "Enamine hydrolysis returns the ketone and the secondary amine.",
         prov("Rule H on the enamine", CH), lead(s, "4-(cyclohex-1-en-1-yl)morpholine", "enamine + H₃O⁺"), concepts=NIT)

    s = "CC1CCCCC1=O"
    ens = with_amine(s, "C1CCNC1")
    ask(node, "u7-enm-count", "2-Methylcyclohexanone meets pyrrolidine. Pick how many enamines can form.",
        [("two", "Two, one on each side", "Both alpha carbons carry H: the CH with the methyl and the ring CH₂. Each can lose one to form the C=C."),
         ("one", "One only", "That counts only one side. The carbonyl has an alpha carbon on each side, and both have an H."),
         ("three", "Three", "Each alpha carbon gives one C=C position, and there are two alpha carbons.")],
        {"two": 2, "one": 1, "three": 3}, len(ens), "two",
        "Each alpha carbon with an H can host the enamine C=C. Which one dominates is a separate question.",
        prov("Rule E enumerated over alpha carbons; distinct products counted", CH),
        lead(s, "2-methylcyclohexan-1-one", "2-methylcyclohexanone + pyrrolidine"), level=2, concepts=NIT)


# ---------------------------------------------------------------------------
# u7-grignard
# ---------------------------------------------------------------------------

def alc_kind(smi: str) -> str:
    m = mol(smi)
    if m.HasSubstructMatch(Chem.MolFromSmarts("[CX3](=O)[OX2H1]")):
        return "carboxylic acid"
    c, _ = match_one(smi, "[CX4][OX2H]")
    return ["methanol", "primary alcohol", "secondary alcohol", "tertiary alcohol"][cdeg(m, c)]


def grignard_reagent(smi: str) -> str:
    """The one C-Br bond cut and Mg put between the two atoms: R-Br to R-Mg-Br."""
    c, br = match_one(smi, "[#6]Br")
    rw = Chem.RWMol(mol(smi))
    rw.RemoveBond(c, br)
    mg = rw.AddAtom(Chem.Atom(12))
    rw.AddBond(c, mg, SINGLE)
    rw.AddBond(mg, br, SINGLE)
    return one(rw)


def node_grignard() -> None:
    node = "u7-grignard"
    s = S["hcho"]
    p = grignard(s, "CC")
    pick(node, "u7-grg-meet", "Methanal meets CH₃CH₂MgBr, then H₃O⁺. Pick the product.",
         [("p", p, "propan-1-ol", "Propan-1-ol",
           "The ethyl bonds to the carbonyl carbon, which had only H. After workup the OH sits on a CH₂: a primary alcohol with three carbons."),
          ("e", "CCO", "ethanol", "Ethanol",
           "That forgets the methanal carbon. The new C-C bond adds one carbon to the ethyl."),
          ("s", "CC(C)O", "propan-2-ol", "Propan-2-ol",
           "The OH stays on the old carbonyl carbon, which is at the end of the new chain.")],
         [p], "p", "Methanal plus a Grignard gives a primary alcohol, one carbon longer.",
         prov("Rule A with an ethyl nucleophile", CH), lead(s, "formaldehyde", "methanal + CH₃CH₂MgBr"), level=0, concepts=NUC)

    s = S["etcho"]
    p = grignard(s, "C")
    pick(node, "u7-grg-ald", "Propanal meets CH₃MgBr, then H₃O⁺. Pick the product.",
         [("p", p, "butan-2-ol", "Butan-2-ol",
           "Methyl adds to C1 of propanal. That carbon now holds OH, H, ethyl and methyl: a secondary alcohol."),
          ("one", "CCCCO", "butan-1-ol", "Butan-1-ol",
           "A primary alcohol would need methanal. The aldehyde carbon keeps its ethyl, so it ends secondary."),
          ("ket", "CCC(C)=O", "butan-2-one", "Butan-2-one",
           "Workup protonates the alkoxide; nothing oxidises it.")],
         [p], "p", "Any other aldehyde gives a secondary alcohol.",
         prov("Rule A with a methyl nucleophile", CH), lead(s, "propanal", "propanal + CH₃MgBr"), concepts=NUC)

    s = S["acetone"]
    p = grignard(s, "c1ccccc1")
    pick(node, "u7-grg-ket", "Propanone meets C₆H₅MgBr, then H₃O⁺. Pick the product.",
         [("p", p, "2-phenylpropan-2-ol", "2-Phenylpropan-2-ol",
           "Phenyl bonds to the ketone carbon, which keeps both methyls: three carbon groups and OH, a tertiary alcohol."),
          ("ring", "CC(C)c1ccc(O)cc1", "4-(propan-2-yl)phenol", "4-Isopropylphenol",
           "The phenyl is the nucleophile, not the electrophile. The OH ends on the old carbonyl carbon."),
          ("sec", "CC(O)c1ccccc1", "1-phenylethan-1-ol", "1-Phenylethanol",
           "That has lost a methyl. Addition keeps both of the ketone's groups.")],
         [p], "p", "A ketone gives a tertiary alcohol.",
         prov("Rule A with a phenyl nucleophile", CH), lead(s, "propan-2-one", "propanone + C₆H₅MgBr"), concepts=NUC)

    p = carbonate("c1ccccc1")
    pick(node, "u7-grg-co2", "C₆H₅MgBr meets CO₂, then H₃O⁺. Pick the product.",
         [("acid", p, "benzoic acid", "Benzoic acid",
           "Phenyl adds to the CO₂ carbon. One C=O becomes C-O⁻ (a carboxylate) and workup makes the acid."),
          ("ald", "O=Cc1ccccc1", "benzaldehyde", "Benzaldehyde",
           "CO₂ brings two oxygens, and both stay. An aldehyde has only one."),
          ("phenol", "Oc1ccccc1", "phenol", "Phenol",
           "That would need O to bond to the ring. The new bond is C-C, to the CO₂ carbon.")],
         [p], "acid", "Carbonation adds one carbon as COOH.",
         prov("Rule A on one C=O of CO2", CH_ACID), lead("c1ccccc1Br", "bromobenzene", "PhMgBr + CO₂"), concepts=NUC)

    target = canon("CCC(C)(C)O")
    pairs = {"a": (S["acetone"], "CC"), "b": (S["butanone"], "C"), "c": (S["etcho"], "CC")}
    gives = {k: grignard(c, r) == target for k, (c, r) in pairs.items()}
    ask(node, "u7-grg-retro", "Pick the pair that does NOT make 2-methylbutan-2-ol.",
        [("c", "Propanal + CH₃CH₂MgBr", "That gives pentan-3-ol: the aldehyde carbon ends with one H, so the alcohol is secondary."),
         ("a", "Propanone + CH₃CH₂MgBr", "This one works: the ketone brings two methyls, the Grignard the ethyl."),
         ("b", "Butanone + CH₃MgBr", "This one works too: the ketone brings methyl and ethyl, the Grignard the second methyl.")],
        {k: (not v) for k, v in gives.items()}, True, "c",
        "A tertiary alcohol has three disconnections; any one of its groups can come from the Grignard.",
        prov("Rule A run on each pair and compared with the target", CH),
        lead(target, "2-methylbutan-2-ol", "the target alcohol"), level=2, concepts=NUC)

    subs = {"oh": "CC(=O)CCO", "ome": "COCCC(C)=O", "plain": S["butanone"]}
    acidic = {k: mol(v).HasSubstructMatch(Chem.MolFromSmarts("[OX2H,NX3;!H0]")) for k, v in subs.items()}
    pick(node, "u7-grg-proton", "Pick the ketone that CH₃MgBr cannot add to cleanly.",
         [("oh", subs["oh"], "4-hydroxybutan-2-one", "4-Hydroxybutan-2-one",
           "Its O-H is an acid. The Grignard is a strong base, takes that proton first and becomes methane."),
          ("ome", subs["ome"], "4-methoxybutan-2-one", "4-Methoxybutan-2-one",
           "An ether has no O-H, so the Grignard reaches the ketone."),
          ("plain", subs["plain"], "butan-2-one", "Butan-2-one",
           "No O-H or N-H, so nothing quenches the Grignard: it adds to the C=O and gives a tertiary alcohol after workup.")],
         [subs[k] for k, v in acidic.items() if v], "oh",
         "Any O-H or N-H destroys a Grignard before it can add.",
         prov("SMARTS for O-H or N-H on each substrate", CH, "a Grignard is destroyed by any O-H or N-H"),
         lead(subs["oh"], "4-hydroxybutan-2-one", "three ketones + CH₃MgBr"), level=2, concepts=NUC,
         convention="a Grignard is destroyed by any O-H or N-H")

    rows = [("hcho", "Methanal + CH₃MgBr", S["hcho"]), ("ald", "Ethanal + CH₃MgBr", S["mecho"]),
            ("ket", "Propanone + CH₃MgBr", S["acetone"]), ("co2", "CO₂ + CH₃MgBr", None)]
    pairs = []
    whys = {"primary alcohol": "Methanal's carbon had two H, so it ends as CH₂OH.",
            "secondary alcohol": "An aldehyde carbon keeps one H: secondary.",
            "tertiary alcohol": "A ketone carbon keeps two carbon groups: tertiary.",
            "carboxylic acid": "CO₂ keeps both oxygens: COOH after workup."}
    for pid, left, carb in rows:
        prod = carbonate("C") if carb is None else grignard(carb, "C")
        kind = alc_kind(prod)
        pairs.append((pid, left, kind.capitalize(), whys[kind], kind.capitalize()))
    match(node, "u7-grg-match", "Match each carbonyl to what CH₃MgBr makes from it.",
          "Count the H on the carbonyl carbon before you add.", pairs,
          "Methanal: primary. Aldehyde: secondary. Ketone: tertiary. CO₂: carboxylic acid.",
          prov("Rule A on each pair; product class read by SMARTS", CH), NUC)

    # Making the Grignard comes before the protected-bromoaldehyde capstone
    # that needs it (audit 23 Oct, top-25 #18).
    s = "Brc1ccccc1"
    rgx = grignard_reagent(s)
    pick(node, "u7-grg-mg", "Bromobenzene meets Mg in dry ether. Pick the main species formed.",
         [("rmgx", rgx, "phenylmagnesium bromide", "Phenylmagnesium bromide",
           "Mg slips into the C-Br bond: C-Mg-Br. The ring carbon now carries the electron density of a carbanion."),
          ("bz", "c1ccccc1", "benzene", "Benzene",
           "That is what the Grignard becomes if water gets in: it takes an H and is destroyed. Dry ether keeps water out."),
          ("biph", "c1ccc(-c2ccccc2)cc1", "biphenyl", "Biphenyl",
           "Two phenyls joining is a minor side reaction. Most of the bromobenzene becomes the Grignard reagent.")],
         [rgx], "rmgx", "R-Br plus Mg in dry ether gives R-MgBr, the Grignard reagent.",
         prov("Mg inserted into the C-Br bond", CH, "dry ether; water destroys the reagent"),
         lead(s, "bromobenzene", "bromobenzene + Mg, ether"), concepts=NUC,
         convention="dry ether; water destroys the reagent")

    protect_capstone_grignard(node)


# ---------------------------------------------------------------------------
# u7-hydride
# ---------------------------------------------------------------------------

def node_hydride() -> None:
    node = "u7-hydride"
    s = S["chx"]
    pick(node, "u7-hdr-meet", "Cyclohexanone meets NaBH₄ in methanol. Pick the product.",
         [("ol", reduce_co(s), "cyclohexanol", "Cyclohexanol",
           "Hydride adds to the carbonyl carbon and the alkoxide takes H from methanol: a secondary alcohol."),
          ("ane", "C1CCCCC1", "cyclohexane", "Cyclohexane",
           "Removing the oxygen entirely takes Clemmensen or Wolff-Kishner. Hydride stops at the alcohol."),
          ("oxide", "[O-]C1CCCCC1", "cyclohexanolate", "The alkoxide",
           "That is the halfway point, right after hydride adds. Methanol hands an H to the O, so what you isolate is the alcohol.")],
         [reduce_co(s)], "ol", "Hydride turns a ketone into a secondary alcohol.",
         prov("Rule R", CH), lead(s, "cyclohexanone", "cyclohexanone + NaBH₄"), level=0, concepts=RED)

    s = S["phcho"]
    pick(node, "u7-hdr-lah", "Benzaldehyde meets LiAlH₄, then H₃O⁺. Pick the product.",
         [("ol", reduce_co(s), "phenylmethanol", "Phenylmethanol",
           "Hydride adds to the aldehyde carbon, which ends as CH₂OH: a primary alcohol."),
          ("tol", "Cc1ccccc1", "toluene", "Toluene",
           "That removes the oxygen. LiAlH₄ on an aldehyde stops at the alcohol."),
          ("acid", "OC(=O)c1ccccc1", "benzoic acid", "Benzoic acid",
           "That is an oxidation, the opposite of what a hydride does.")],
         [reduce_co(s)], "ol", "Aldehydes reduce to primary alcohols.",
         prov("Rule R", CH), lead(s, "benzaldehyde", "benzaldehyde + LiAlH₄"), concepts=RED)

    s = S["keto_ester"]
    nab = [reduce_co(s)]
    lah = lialh4(s)
    # Para keto ester: the new OH and the ester sit across a benzene ring, so the
    # product cannot close to a lactone (methyl 4-oxopentanoate's product can).
    para = "COC(=O)c1ccc(C(C)=O)cc1"
    para_nab = [reduce_co(para)]
    para_diol = [f for f in lialh4(para) if f != "CO"][0]
    pick(node, "u7-hdr-nabh4-ester", "Methyl 4-acetylbenzoate meets NaBH₄. Pick the product.",
         [("keto", para_nab[0], "methyl 4-(1-hydroxyethyl)benzoate", "Methyl 4-(1-hydroxyethyl)benzoate",
           "NaBH₄ is mild: it reduces the ketone and leaves the ester."),
          ("diol", para_diol, "1-[4-(hydroxymethyl)phenyl]ethan-1-ol", "Both reduced",
           "That is the LiAlH₄ product, with the ester reduced too."),
          ("ald", "CC(=O)c1ccc(CO)cc1", "1-[4-(hydroxymethyl)phenyl]ethan-1-one", "Ester reduced, ketone kept",
           "That reduces the ester and spares the ketone, the reverse of what NaBH₄ does.")],
         para_nab, "keto", "NaBH₄ picks ketones and aldehydes over esters.",
         prov("Rule R on the ketone only", CH, "NaBH4 leaves an ester alone"),
         lead(para, "methyl 4-acetylbenzoate", "keto ester + NaBH₄"), level=2, concepts=RED,
         convention="NaBH4 leaves an ester alone")

    pick(node, "u7-hdr-lah-ester", "Methyl 4-oxopentanoate meets LiAlH₄, then H₃O⁺. Pick the main product.",
         [("diol", "CC(O)CCCO", "pentane-1,4-diol", "Pentane-1,4-diol",
           "LiAlH₄ reduces both: the ketone to CH-OH and the ester to CH₂OH, releasing methanol."),
          ("keto", nab[0], "methyl 4-hydroxypentanoate", "Methyl 4-hydroxypentanoate",
           "That is the NaBH₄ result. LiAlH₄ is strong enough to reduce esters too."),
          ("acid", "CC(O)CCC(=O)O", "4-hydroxypentanoic acid", "4-Hydroxypentanoic acid",
           "An acid would need the ester hydrolysed, not reduced. LiAlH₄ takes the ester carbon down to CH₂OH.")],
         lah, "diol", "LiAlH₄ reduces esters as well as ketones.",
         prov("Rule R with LiAlH4: ketone and ester", CH, "LiAlH4 reduces esters"),
         lead(s, "methyl 4-oxopentanoate", "keto ester + LiAlH₄"), concepts=RED,
         convention="LiAlH4 reduces esters")

    p = reduce_co(S["butanone"])
    ask(node, "u7-hdr-racemic", "Butanone meets NaBH₄. Pick what forms.",
        [("rac", "Racemic butan-2-ol", "Hydride reaches the flat carbonyl from either face equally, so both enantiomers form."),
         ("one", "One enantiomer of butan-2-ol", "NaBH₄ and butanone are both achiral, so nothing favours one face."),
         ("none", "Butan-2-ol with no stereocentre", "C2 ends with H, OH, methyl and ethyl: four different groups.")],
        {"rac": ("racemic", 1), "one": ("single", 1), "none": ("racemic", 0)}, outcome(p, S["butanone"]), "rac",
        "Reducing an unsymmetrical ketone makes a stereocentre, as a racemate.",
        prov("Rule R, then RDKit counts stereocentres; reactants achiral", CH),
        lead(S["butanone"], "butan-2-one", "butanone + NaBH₄"), level=2, concepts=("prochirality_re_si",))

    cards = [
        ("acid", "Butanoic acid", "CCCC(=O)O", "butanoic acid", "Three bonds to O on C1: the top."),
        ("ald", "Butanal", "CCCC=O", "butanal", "Two bonds to O and one H on C1."),
        ("alc", "Butan-1-ol", "CCCCO", "butan-1-ol", "One bond to O and two H on C1."),
        ("ane", "Butane", "CCCC", "butane", "No bonds to O: the bottom."),
    ]
    ladder(node, "u7-hdr-ladder", cards, lambda s: -ox_c1(s),
           "Rank by oxidation level of C1, most oxidised first.",
           "Count bonds to O minus bonds to H on C1. Hydride walks a carbon down this ladder.",
           "oxidation_level", ("Most oxidised", "Least oxidised"),
           "Rank butanoic acid, butanal, butan-1-ol and butane by the oxidation level of C1, most oxidised first.",
           ("Acid, aldehyde, alcohol, alkane.", "Each hydride step swaps one bond to O for a bond to H.",
            "Count bonds to oxygen on C1."),
           [("reversed", ["ane", "alc", "ald", "acid"], "ordering_is_reversed",
             ("The ladder read from the bottom.", "More bonds to O means more oxidised.", "Put the acid first.")),
            ("ald-alc", ["acid", "alc", "ald", "ane"], "ordering_one_adjacent_pair_swapped",
             ("Alcohol above aldehyde.", "The aldehyde has two bonds to O, the alcohol one.", "Compare C1 in butanal and butan-1-ol."))],
           "Reduction moves down the ladder one step per hydride.",
           prov("carbon oxidation state computed per card", CH), RED, "oxidation_and_reduction_ladder")

    # Closes the lesson once LiAlH4 on an ester has been met (audit 23 Oct, top-25 #18).
    protect_capstone_ester(node)


# ---------------------------------------------------------------------------
# u7-wittig
# ---------------------------------------------------------------------------

def wittig(smi: str, alkylidene: str) -> str:
    return condense(smi, "[*]" + alkylidene)


def node_wittig() -> None:
    node = "u7-wittig"
    s = S["chx"]
    p = wittig(s, "C")
    pick(node, "u7-wit-meet", "Cyclohexanone meets Ph₃P=CH₂. Pick the alkene.",
         [("exo", p, "methylidenecyclohexane", "Methylenecyclohexane",
           "The ylide carbon takes the place of the carbonyl oxygen: C=O becomes C=CH₂, exactly where the C=O was."),
          ("endo", "CC1=CCCCC1", "1-methylcyclohex-1-ene", "1-Methylcyclohexene",
           "That C=C is in the ring. Wittig puts the double bond where the C=O was, never anywhere else."),
          ("alc", "CC1(O)CCCCC1", "1-methylcyclohexan-1-ol", "1-Methylcyclohexanol",
           "That is a Grignard-type product. The ylide's oxygen-loving P removes the O completely.")],
         [p], "exo", "Wittig swaps =O for =CHR at the same carbon.",
         prov("Rule C with a CH2 alkylidene", CH), lead(s, "cyclohexanone", "cyclohexanone + Ph₃P=CH₂"), level=0, concepts=NUC)

    s = S["phcho"]
    p = wittig(s, "CC")
    pick(node, "u7-wit-ald", "Benzaldehyde meets Ph₃P=CHCH₃. Pick the alkene (ignore E or Z).",
         [("p", p, "prop-1-en-1-ylbenzene", "Prop-1-enylbenzene",
           "The aldehyde carbon becomes one end of the C=C and the ylide carbon the other: Ph-CH=CH-CH₃."),
          ("allyl", "C=CCc1ccccc1", "prop-2-en-1-ylbenzene", "Allylbenzene",
           "That moves the C=C one carbon out. The new double bond joins the two carbons that met."),
          ("alc", "CCC(O)c1ccccc1", "1-phenylpropan-1-ol", "1-Phenylpropan-1-ol",
           "The oxygen leaves with phosphorus. No OH survives a Wittig.")],
         [p], "p", "The new C=C joins the carbonyl carbon to the ylide carbon.",
         prov("Rule C with an ethylidene", CH), lead(s, "benzaldehyde", "benzaldehyde + Ph₃P=CHCH₃"), flat_key=True, concepts=NUC)

    left = [S["chx"], "C=P(c1ccccc1)(c1ccccc1)c1ccccc1"]
    cand = {"tppo": "O=P(c1ccccc1)(c1ccccc1)c1ccccc1", "tpp": "P(c1ccccc1)(c1ccccc1)c1ccccc1", "water": "O"}
    ask(node, "u7-wit-byproduct", "Cyclohexanone and Ph₃P=CH₂ give the alkene. Pick the other product.",
        [("tppo", "Ph₃P=O", "The carbonyl oxygen ends on phosphorus. The very strong P=O bond is what drives the reaction."),
         ("tpp", "Ph₃P", "That has lost the oxygen somewhere. The O must go to one product, and it bonds to P."),
         ("water", "Water", "No hydrogens are freed here. The oxygen leaves with phosphorus, not with H.")],
        {k: k for k in cand}, byproduct(left, [wittig(S["chx"], "C")], cand), "tppo",
        "Every Wittig makes triphenylphosphine oxide.",
        prov("Rule C, then RDKit atom balance over each candidate", CH),
        lead(S["chx"], "cyclohexanone", "cyclohexanone + Ph₃P=CH₂"), concepts=NUC)

    target = canon("CCC=C1CCCCC1")
    pairs = {"a": (S["chx"], "CCC"), "b": (S["etcho"], "C1CCCCC1"), "c": ("O=CC1CCCCC1", "CC")}
    gives = {k: wittig(c, r) == target for k, (c, r) in pairs.items()}
    ask(node, "u7-wit-retro", "Pick the pair that does NOT make propylidenecyclohexane.",
        [("c", "Cyclohexanecarbaldehyde + Ph₃P=CHCH₃", "That gives prop-1-enylcyclohexane: the C=C ends one carbon outside the ring."),
         ("a", "Cyclohexanone + Ph₃P=CHCH₂CH₃", "This works: the ring carbon was the C=O, the propylidene the ylide."),
         ("b", "Propanal + the cyclohexylidene ylide", "This works too: either side of a C=C can be the carbonyl.")],
        {k: (not v) for k, v in gives.items()}, True, "c",
        "Cut the C=C: one side was the carbonyl, the other the ylide, either way round.",
        prov("Rule C run on each pair and compared with the target", CH),
        lead(target, "propylidenecyclohexane", "the target alkene"), level=2, concepts=NUC)

    s = S["acetone"]
    p = wittig(s, "Cc1ccccc1")
    pick(node, "u7-wit-benzyl", "Propanone meets Ph₃P=CHC₆H₅. Pick the alkene.",
         [("p", p, "(2-methylprop-1-en-1-yl)benzene", "(2-Methylprop-1-enyl)benzene",
           "The ketone carbon with its two methyls joins the ylide's CH-Ph: (CH₃)₂C=CH-Ph."),
          ("q", "C=C(C)Cc1ccccc1", "(2-methylprop-2-en-1-yl)benzene", "(2-Methylallyl)benzene",
           "That puts the C=C on the far side of the ketone carbon. Wittig keeps it where the C=O was."),
          ("r", "CC(C)(O)Cc1ccccc1", "2-methyl-1-phenylpropan-2-ol", "2-Methyl-1-phenylpropan-2-ol",
           "An OH means the oxygen stayed. In a Wittig it leaves with phosphorus.")],
         [p], "p", "Ketones work too: the C=C forms at the old C=O carbon.",
         prov("Rule C with a benzylidene", CH), lead(s, "propan-2-one", "propanone + Ph₃P=CHPh"), concepts=NUC)

    target = wittig(S["chx"], "C")
    ylides = {"ch2": "C", "ethyl": "CC", "o": None}
    made = {k: (wittig(S["chx"], v) if v else None) for k, v in ylides.items()}
    ask(node, "u7-wit-ylide", "Pick the ylide that turns cyclohexanone into methylenecyclohexane.",
        [("ch2", "Ph₃P=CH₂", "Its carbon carries two H, so the new alkene end is =CH₂."),
         ("ethyl", "Ph₃P=CHCH₃", "That gives ethylidenecyclohexane: the alkene end carries a methyl."),
         ("o", "Ph₃P=O", "That is the byproduct, not a reagent. It has no carbon to give.")],
        {k: (v == target) for k, v in made.items()}, True, "ch2",
        "Read the ylide carbon's groups straight onto the new alkene end.",
        prov("Rule C run with each ylide and compared with the target", CH),
        lead(target, "methylidenecyclohexane", "the target alkene"), concepts=NUC)


# ---------------------------------------------------------------------------
# u7-12v14
# ---------------------------------------------------------------------------

def node_12v14() -> None:
    node = "u7-12v14"
    s = S["chxenone"]
    p12 = grignard(s, "C")
    p14 = conj(s, "[*]C")
    pick(node, "u7-cj-meet", "Cyclohex-2-enone meets CH₃MgBr, then H₃O⁺. Pick the main product.",
         [("12", p12, "1-methylcyclohex-2-en-1-ol", "1-Methylcyclohex-2-en-1-ol",
           "A Grignard is a hard nucleophile and goes straight to the carbonyl carbon: 1,2-addition, an allylic alcohol."),
          ("14", p14, "3-methylcyclohexan-1-one", "3-Methylcyclohexanone",
           "That is 1,4-addition, the cuprate result. CH₃MgBr goes to the C=O carbon."),
          ("alpha", "CC1CCCCC1=O", "2-methylcyclohexan-1-one", "2-Methylcyclohexanone",
           "Neither pathway puts the methyl on the alpha carbon. It lands on C1 or C3.")],
         [p12], "12", "Grignards and organolithiums add 1,2 to enones.",
         prov("Rule A at the C=O", CH, "hard nucleophiles add 1,2"), lead(s, "cyclohex-2-en-1-one", "cyclohexenone + CH₃MgBr"),
         level=0, concepts=CONJ, convention="hard nucleophiles add 1,2")

    pick(node, "u7-cj-cuprate", "Cyclohex-2-enone meets (CH₃)₂CuLi, then H₃O⁺. Pick the product.",
         [("14", p14, "3-methylcyclohexan-1-one", "3-Methylcyclohexanone",
           "A cuprate is soft and adds to the far alkene carbon (C3). The enolate takes H at the alpha carbon, leaving the ketone."),
          ("12", p12, "1-methylcyclohex-2-en-1-ol", "1-Methylcyclohex-2-en-1-ol",
           "That is the Grignard result. Cuprates skip the carbonyl carbon."),
          ("alc", "CC1CCCC(O)C1", "3-methylcyclohexan-1-ol", "3-Methylcyclohexanol",
           "The C=O survives conjugate addition. Nothing in the flask reduces it.")],
         [p14], "14", "Cuprates add 1,4: the carbonyl survives.",
         prov("Rule K", CH, "cuprates add 1,4"), lead(s, "cyclohex-2-en-1-one", "cyclohexenone + (CH₃)₂CuLi"),
         concepts=CONJ, convention="cuprates add 1,4")

    s = S["mvk"]
    p14 = conj(s, "[*]C")
    pick(node, "u7-cj-mvk", "But-3-en-2-one meets (CH₃)₂CuLi, then H₃O⁺. Pick the product.",
         [("14", p14, "pentan-2-one", "Pentan-2-one",
           "Methyl bonds to C4, the end of the C=C, and the ketone stays: a five-carbon ketone."),
          ("12", grignard(s, "C"), "2-methylbut-3-en-2-ol", "2-Methylbut-3-en-2-ol",
           "That is 1,2-addition. Cuprates leave the carbonyl carbon alone."),
          ("a", "CC(=O)C(C)C", "3-methylbutan-2-one", "3-Methylbutan-2-one",
           "That puts the methyl on C3, the alpha carbon. Conjugate addition hits the beta carbon.")],
         [p14], "14", "1,4-addition extends the chain at the beta carbon.",
         prov("Rule K", CH, "cuprates add 1,4"), lead(s, "but-3-en-2-one", "but-3-en-2-one + (CH₃)₂CuLi"),
         concepts=CONJ, convention="cuprates add 1,4")

    # Tag the enone's atoms, add, and read which tagged carbon the new methyl is bonded to.
    tagged = Chem.RWMol(mol(s))
    for a in tagged.GetAtoms():
        a.SetAtomMapNum(a.GetIdx() + 1)
    b, a, c, o = match_one(s, "[CX3]=[CX3]-[CX3]=[OX1]")
    role = {b + 1: "beta", a + 1: "alpha", c + 1: "carbonyl"}
    pm = mol(conj(Chem.MolToSmiles(tagged), "[*]C"))
    new_c = [x for x in pm.GetAtoms() if x.GetSymbol() == "C" and x.GetAtomMapNum() == 0][0]
    where = role.get(new_c.GetNeighbors()[0].GetAtomMapNum(), "other")
    ask(node, "u7-cj-site", "A cuprate adds to but-3-en-2-one. Pick the carbon it bonds to.",
        [("beta", "C4, the far end of the C=C", "C=C-C=O spreads the positive charge to C4, and soft cuprates go there."),
         ("carb", "C2, the carbonyl carbon", "That is the 1,2 site, used by Grignards and hydrides."),
         ("alpha", "C3, next to the C=O", "C3 is electron rich in the enolate that forms. It is where H⁺ goes at workup.")],
        {"beta": "beta", "carb": "carbonyl", "alpha": "alpha"}, where, "beta",
        "Conjugate addition means the beta carbon.",
        prov("Rule K; RDKit checks the new C-C bond is to the terminal alkene carbon", CH, "cuprates add 1,4"),
        lead(s, "but-3-en-2-one", "but-3-en-2-one"), concepts=CONJ, convention="cuprates add 1,4")

    s = S["mesityl"]
    p14 = conj(s, "[*]c1ccccc1")
    pick(node, "u7-cj-phenyl", "4-Methylpent-3-en-2-one meets (C₆H₅)₂CuLi, then H₃O⁺. Pick the product.",
         [("14", p14, "4-methyl-4-phenylpentan-2-one", "4-Methyl-4-phenylpentan-2-one",
           "Phenyl adds to C4, the far end of the C=C, even though it already holds two methyls. The ketone stays."),
          ("12", grignard(s, "c1ccccc1"), "4-methyl-2-phenylpent-3-en-2-ol", "4-Methyl-2-phenylpent-3-en-2-ol",
           "That is the PhMgBr result. Cuprates do not add to the C=O."),
          ("a", "CC(=O)C(c1ccccc1)C(C)C", "4-methyl-3-phenylpentan-2-one", "4-Methyl-3-phenylpentan-2-one",
           "C3 is the alpha carbon. The new bond forms at the beta carbon.")],
         [p14], "14", "1,4-addition can build a quaternary carbon.",
         prov("Rule K", CH, "cuprates add 1,4"), lead(s, "4-methylpent-3-en-2-one", "enone + (C₆H₅)₂CuLi"), level=2,
         concepts=CONJ, convention="cuprates add 1,4")

    enol = "CC1CCCC(O)=C1"
    keto = keto_form(enol)
    pick(node, "u7-cj-keto", "After 1,4-addition the enol 3-methylcyclohex-1-en-1-ol forms. Pick what it becomes.",
         [("keto", keto, "3-methylcyclohexan-1-one", "3-Methylcyclohexanone",
           "An enol moves its O-H proton to the alpha carbon and becomes the ketone, which is far more stable."),
          ("enol", enol, "3-methylcyclohex-1-en-1-ol", "It stays the enol",
           "Simple enols are a tiny fraction at equilibrium. The C=O form wins."),
          ("alc", "CC1CCCC(O)C1", "3-methylcyclohexan-1-ol", "3-Methylcyclohexanol",
           "That adds two H. Tautomerisation only moves one H from O to C.")],
         [keto], "keto", "1,4-products are drawn as ketones because the enol tautomerises.",
         prov("RDKit tautomer canonicalisation of the enol", CH), lead(enol, "3-methylcyclohex-1-en-1-ol", "the enol after addition"),
         concepts=CONJ)


# ---------------------------------------------------------------------------
# u7-to-ch2
# ---------------------------------------------------------------------------

def node_to_ch2() -> None:
    node = "u7-to-ch2"
    s = S["acph"]
    pick(node, "u7-ch2-meet", "Acetophenone meets Zn(Hg) and HCl, heated. Pick the product.",
         [("ane", to_ch2(s), "ethylbenzene", "Ethylbenzene",
           "Clemmensen removes the carbonyl oxygen completely: C=O becomes CH₂."),
          ("ol", "CC(O)c1ccccc1", "1-phenylethan-1-ol", "1-Phenylethanol",
           "That is the NaBH₄ product. Clemmensen goes past the alcohol to CH₂."),
          ("cl", "CC(Cl)c1ccccc1", "(1-chloroethyl)benzene", "(1-Chloroethyl)benzene",
           "HCl is the acid here, not a source of Cl on carbon. Both C-O bonds are replaced by C-H.")],
         [to_ch2(s)], "ane", "Clemmensen: C=O to CH₂ in hot acid.",
         prov("Rule R, to CH2", CH), lead(s, "1-phenylethan-1-one", "acetophenone + Zn(Hg), HCl"), level=0, concepts=RED)

    s = S["chx"]
    hz = condense(s, "[*]NN")
    pick(node, "u7-ch2-wk", "Cyclohexanone meets H₂NNH₂ and KOH, heated. Pick the product.",
         [("ane", to_ch2(s), "cyclohexane", "Cyclohexane",
           "The hydrazone forms first, then hot base pulls off N₂ and leaves CH₂: Wolff-Kishner."),
          ("hz", hz, "cyclohexylidenehydrazine", "The hydrazone",
           "The hydrazone is the intermediate. Strong base and heat take it on to the alkane."),
          ("ol", "OC1CCCCC1", "cyclohexanol", "Cyclohexanol",
           "No hydride adds to give an alcohol. The oxygen is removed entirely.")],
         [to_ch2(s)], "ane", "Wolff-Kishner: C=O to CH₂ in hot base.",
         prov("Rule C with hydrazine, then rule R to CH2", CH), lead(s, "cyclohexanone", "cyclohexanone + H₂NNH₂, KOH"),
         concepts=RED)

    cand = {"n2": "N#N", "nh3": "N", "water": "O"}
    ask(node, "u7-ch2-n2", "The hydrazone of cyclohexanone becomes cyclohexane. Pick the gas released.",
        [("n2", "N₂", "Both nitrogens leave together as N₂, a very stable molecule. Its escape drives the reaction."),
         ("nh3", "NH₃", "Count the atoms: the two N leave together, and there are not enough H for two NH₃."),
         ("water", "Water", "The oxygen already left when the hydrazone formed. This step loses nitrogen.")],
        {k: k for k in cand}, byproduct([hz], [to_ch2(s)], cand), "n2",
        "Wolff-Kishner releases N₂.",
        prov("RDKit atom balance over each candidate", CH), structure(hz, "cyclohexylidenehydrazine", "the hydrazone, hot base"),
        concepts=RED)

    s = "CC(=O)CCC1OCCO1"
    acid_sensitive = mol(s).HasSubstructMatch(Chem.MolFromSmarts("[CX4]([OX2][#6])[OX2][#6]"))
    ask(node, "u7-ch2-acetal", "The ketone in 4-(1,3-dioxolan-2-yl)butan-2-one must go to CH₂. Pick a method.",
        [("wk", "Wolff-Kishner, hot base", "The acetal survives base, so the ketone goes to CH₂ and the protected aldehyde is untouched."),
         ("clem", "Clemmensen, hot HCl", "Hot aqueous acid opens the acetal too, exposing the aldehyde."),
         ("nabh4", "NaBH₄", "NaBH₄ stops at the alcohol. It never reaches CH₂.")],
        {"wk": True, "clem": False, "nabh4": None}, acid_sensitive, "wk",
        "Pick the conditions the rest of the molecule survives: base for acetals.",
        prov("SMARTS finds the acetal", CH, "acetals survive base and fall apart in aqueous acid"),
        lead(s, "4-(1,3-dioxolan-2-yl)butan-2-one", "ketone with an acetal"), level=2, concepts=RED,
        convention="acetals survive base and fall apart in aqueous acid")

    # The thioacetal side quest is optional, so the lesson makes the thioacetal
    # itself before Raney Ni takes it on (audit 23 Oct, top-25 #18).
    s = S["chx"]
    thio = condense(s, "[*]SCCS[*]")
    pick(node, "u7-ch2-thio", "Cyclohexanone meets ethane-1,2-dithiol and BF₃. Pick the product.",
         [("t", thio, "1,4-dithiaspiro[4.5]decane", "The thioacetal",
           "Both SH groups bond to the carbonyl carbon and water leaves: a five-membered ring with two S on the old C=O carbon."),
          ("o", "C1CCC2(CC1)OCCO2", "1,4-dioxaspiro[4.5]decane", "The oxygen acetal",
           "That ring has oxygens, from ethane-1,2-diol. A dithiol puts sulfur in their place."),
          ("half", "OC1(SCCS)CCCCC1", "2-[(1-hydroxycyclohexyl)sulfanyl]ethane-1-thiol", "One S added, OH kept",
           "That is the halfway point. The OH leaves as water and the second SH closes the ring.")],
         [thio], "t", "A dithiol makes a thioacetal the way a diol makes an acetal.",
         prov("Rule C with ethane-1,2-dithiol", CH), lead(s, "cyclohexanone", "cyclohexanone + HSCH₂CH₂SH"), concepts=OXY)

    out = raney(thio)
    pick(node, "u7-ch2-raney", "Cyclohexanone's thioacetal meets Raney nickel. Pick the ring product.",
         [("ane", "C1CCCCC1", "cyclohexane", "Cyclohexane",
           "Raney Ni replaces both C-S bonds with C-H. The old carbonyl carbon ends as CH₂."),
          ("ket", s, "cyclohexanone", "Cyclohexanone",
           "Taking the thioacetal off to the ketone needs a hydrolysis (Hg²⁺). Raney Ni reduces instead."),
          ("thiol", "SC1CCCCC1", "cyclohexanethiol", "Cyclohexanethiol",
           "Both C-S bonds break, not just one. No sulfur stays on the ring.")],
         out, "ane", "Thioacetal then Raney Ni is a third route from C=O to CH₂, under neutral conditions.",
         prov("Rule R: every S removed", CH), structure(thio, "1,4-dithiaspiro[4.5]decane", "thioacetal + Raney Ni"),
         concepts=RED)

    # u7-ch2-ester (Clemmensen for a keto ester) was removed in the critic fix
    # round: hot HCl also hydrolyses an ester, so neither method truly spares it.
    # See the Unit 7 owner report. This plain Wolff-Kishner item takes its place.
    s = "CC(=O)CCc1ccccc1"
    p = to_ch2(s)
    pick(node, "u7-ch2-chain", "4-Phenylbutan-2-one meets H₂NNH₂ and KOH, heated. Pick the product.",
         [("ane", p, "butylbenzene", "Butylbenzene",
           "The C=O carbon becomes CH₂. The chain keeps all four carbons, in the same order."),
          ("ol", "CC(O)CCc1ccccc1", "4-phenylbutan-2-ol", "4-Phenylbutan-2-ol",
           "That is the NaBH₄ product. Wolff-Kishner removes the oxygen entirely."),
          ("hz", condense(s, "[*]NN"), "(4-phenylbutan-2-ylidene)hydrazine", "The hydrazone",
           "That is the intermediate. Hot KOH takes it on, losing N₂, to CH₂.")],
         [p], "ane", "Wolff-Kishner: C=O to CH₂, carbon skeleton unchanged.",
         prov("Rule C with hydrazine, then rule R to CH2", CH), lead(s, "4-phenylbutan-2-one", "ketone + H₂NNH₂, KOH"),
         concepts=RED)


# ---------------------------------------------------------------------------
# u7-cyanohydrin
# ---------------------------------------------------------------------------

def nitrile_to_acid(smi: str) -> str:
    c, n = match_one(smi, "[CX2]#[NX1]")
    rw = Chem.RWMol(mol(smi))
    drop(rw, [n])
    new_o(rw, c, DOUBLE)
    new_o(rw, c, SINGLE)
    return one(rw)


def node_cyanohydrin() -> None:
    node = "u7-cyanohydrin"
    s = S["acetone"]
    p = add(s, "[*]C#N")
    pick(node, "u7-cyn-meet", "Propanone meets HCN with a little NaCN. Pick the product.",
         [("p", p, "2-hydroxy-2-methylpropanenitrile", "2-Hydroxy-2-methylpropanenitrile",
           "Cyanide's carbon bonds to the carbonyl carbon and the alkoxide takes H from HCN: OH and CN on one carbon."),
          ("n", "CC(C)C#N", "2-methylpropanenitrile", "2-Methylpropanenitrile",
           "That has lost the oxygen. Addition keeps it, as the OH."),
          ("iso", "CC(C)(O)N", "2-aminopropan-2-ol", "2-Aminopropan-2-ol",
           "Cyanide bonds through carbon and keeps its C≡N. Nothing reduces it to an amine.")],
         [p], "p", "A cyanohydrin is OH and CN on the old carbonyl carbon.",
         prov("Rule A with cyanide", CH), lead(s, "propan-2-one", "propanone + HCN"), level=0, concepts=NUC)

    s = S["phcho"]
    p = add(s, "[*]C#N")
    pick(node, "u7-cyn-phcho", "Benzaldehyde meets HCN and NaCN. Pick the product.",
         [("p", p, "2-hydroxy-2-phenylacetonitrile", "2-Hydroxy-2-phenylacetonitrile",
           "CN adds to the aldehyde carbon, which ends with H, OH, CN and phenyl."),
          ("ring", "N#Cc1ccc(C=O)cc1", "4-formylbenzonitrile", "4-Formylbenzonitrile",
           "Cyanide attacks the C=O carbon, not the ring. The aldehyde is gone in the product."),
          ("amide", "NC(=O)C(O)c1ccccc1", "2-hydroxy-2-phenylacetamide", "2-Hydroxy-2-phenylacetamide",
           "That is a hydrolysed nitrile. HCN addition alone keeps the C≡N.")],
         [p], "p", "Aldehydes form cyanohydrins readily.",
         prov("Rule A with cyanide", CH), lead(s, "benzaldehyde", "benzaldehyde + HCN"), concepts=NUC)

    gain = sum(1 for a in mol(p).GetAtoms() if a.GetSymbol() == "C") - sum(1 for a in mol(s).GetAtoms() if a.GetSymbol() == "C")
    ask(node, "u7-cyn-carbon", "Benzaldehyde becomes its cyanohydrin. Pick the change in carbon count.",
        [("one", "One carbon more", "Cyanide brings exactly one carbon, its C≡N carbon, bonded to the old carbonyl carbon."),
         ("same", "No change", "The C≡N carbon is new: it came from HCN."),
         ("two", "Two carbons more", "HCN has only one carbon. The N does not count.")],
        {"one": 1, "same": 0, "two": 2}, gain, "one",
        "Cyanohydrin formation is a one-carbon homologation.",
        prov("RDKit counts carbons before and after rule A", CH), lead(s, "benzaldehyde", "benzaldehyde + HCN"), concepts=NUC)

    p = add(S["etcho"], "[*]C#N")
    ask(node, "u7-cyn-racemic", "Propanal meets HCN and NaCN. Pick what forms.",
        [("rac", "A racemic cyanohydrin", "The new carbon holds H, OH, CN and ethyl, and CN reaches both faces equally: both enantiomers."),
         ("one", "One enantiomer", "Nothing chiral is present, so neither face is favoured."),
         ("none", "No stereocentre", "Four different groups sit on that carbon, so it is a stereocentre.")],
        {"rac": ("racemic", 1), "one": ("single", 1), "none": ("racemic", 0)}, outcome(p, S["etcho"], "C#N"), "rac",
        "Achiral starting materials give a racemate.",
        prov("Rule A, then RDKit counts stereocentres", CH), lead(S["etcho"], "propanal", "propanal + HCN"), level=2,
        concepts=("prochirality_re_si",))

    cy = add(S["acetone"], "[*]C#N")
    acid = nitrile_to_acid(cy)
    pick(node, "u7-cyn-acid", "Propanone cyanohydrin is heated in H₃O⁺. Pick the product.",
         [("acid", acid, "2-hydroxy-2-methylpropanoic acid", "2-Hydroxy-2-methylpropanoic acid",
           "Hot aqueous acid turns C≡N into COOH. The OH stays: an alpha-hydroxy acid."),
          ("back", S["acetone"], "propan-2-one", "Propanone",
           "Losing HCN is the reverse reaction. Hot acid hydrolyses the nitrile."),
          ("amine", "CC(C)(O)CN", "1-amino-2-methylpropan-2-ol", "1-Amino-2-methylpropan-2-ol",
           "That reduces C≡N to CH₂NH₂. Aqueous acid is not a hydride source.")],
         [acid], "acid", "The nitrile is a handle: hydrolysis gives an alpha-hydroxy acid.",
         prov("Rule A, then C≡N to COOH", CH_ACID, "hot aqueous acid hydrolyses a nitrile to the acid"),
         structure(cy, "2-hydroxy-2-methylpropanenitrile", "cyanohydrin + H₃O⁺, heat"), level=2, concepts=NUC,
         convention="hot aqueous acid hydrolyses a nitrile to the acid")

    s = S["chx"]
    p = add(s, "[*]C#N")
    pick(node, "u7-cyn-ring", "Cyclohexanone meets HCN and NaCN. Pick the product.",
         [("p", p, "1-hydroxycyclohexane-1-carbonitrile", "1-Hydroxycyclohexane-1-carbonitrile",
           "OH and CN end on the same ring carbon, the old carbonyl carbon."),
          ("vic", "N#CC1CCCCC1O", "2-hydroxycyclohexane-1-carbonitrile", "2-Hydroxycyclohexane-1-carbonitrile",
           "That splits OH and CN over two carbons. Both bond to the carbonyl carbon."),
          ("n", "N#CC1CCCCC1", "cyclohexanecarbonitrile", "Cyclohexanecarbonitrile",
           "The oxygen is kept as OH.")],
         [p], "p", "Ketones form cyanohydrins too.",
         prov("Rule A with cyanide", CH), lead(s, "cyclohexanone", "cyclohexanone + HCN"), concepts=NUC)


# ---------------------------------------------------------------------------
# u7-thioacetal
# ---------------------------------------------------------------------------

def node_thioacetal() -> None:
    node = "u7-thioacetal"
    s = S["chx"]
    t = condense(s, "[*]SCCS[*]")
    pick(node, "u7-thi-meet", "Cyclohexanone meets ethane-1,2-dithiol and BF₃. Pick the product.",
         [("t", t, "1,4-dithiaspiro[4.5]decane", "1,4-Dithiaspiro[4.5]decane",
           "Both SH groups bond to the carbonyl carbon and water leaves: a five-membered thioacetal ring."),
          ("o", "C1CCC2(CC1)OCCO2", "1,4-dioxaspiro[4.5]decane", "The oxygen acetal",
           "That comes from ethane-1,2-diol. With the dithiol, sulfur takes the place of oxygen."),
          ("sh", "SCCSC1CCCCC1", "2-(cyclohexylsulfanyl)ethane-1-thiol", "Thioether thiol",
           "That has lost an oxygen and gained an H. The ring closes instead.")],
         [t], "t", "Dithiols make thioacetals exactly as diols make acetals.",
         prov("Rule C with ethane-1,2-dithiol", CH), lead(s, "cyclohexanone", "cyclohexanone + HSCH₂CH₂SH"), level=0, concepts=OXY)

    s = S["phcho"]
    t = condense(s, "[*]SCCCS[*]")
    pick(node, "u7-thi-dithiane", "Benzaldehyde meets propane-1,3-dithiol and acid. Pick the product.",
         [("t", t, "2-phenyl-1,3-dithiane", "2-Phenyl-1,3-dithiane",
           "Three CH₂ between the sulfurs plus the two S and the old carbonyl carbon: a six-membered ring."),
          ("five", "c1ccc(C2SCCS2)cc1", "2-phenyl-1,3-dithiolane", "2-Phenyl-1,3-dithiolane",
           "A five-membered ring needs a two-carbon dithiol. This one has three carbons."),
          ("o", "c1ccc(C2OCCCO2)cc1", "2-phenyl-1,3-dioxane", "2-Phenyl-1,3-dioxane",
           "That ring has oxygens, from a diol. The dithiol gives sulfur.")],
         [t], "t", "Ring size follows the chain between the two SH groups.",
         prov("Rule C with propane-1,3-dithiol", CH), lead(s, "benzaldehyde", "benzaldehyde + HS(CH₂)₃SH"), concepts=OXY)

    out = raney(t)
    pick(node, "u7-thi-raney", "2-Phenyl-1,3-dithiane meets Raney nickel. Pick the aromatic product.",
         [("tol", "Cc1ccccc1", "toluene", "Toluene",
           "Both C-S bonds become C-H, so the old aldehyde carbon ends as CH₃ on the ring."),
          ("ald", S["phcho"], "benzaldehyde", "Benzaldehyde",
           "Getting the aldehyde back needs hydrolysis. Raney Ni reduces."),
          ("half", "SCCCSCc1ccccc1", "3-(benzylsulfanyl)propane-1-thiol", "One C-S bond cut",
           "Raney Ni cuts every C-S bond, not just one. No sulfur stays on the old aldehyde carbon.")],
         out, "tol", "Raney Ni desulfurises: CHO to CH₃ in two steps.",
         prov("Rule R: every S removed", CH), structure(t, "2-phenyl-1,3-dithiane", "dithiane + Raney Ni"), concepts=RED)

    left = [S["chx"], "SCCS"]
    cand = {"water": "O", "h2s": "S", "oh": "[OH-]"}
    ask(node, "u7-thi-water", "Cyclohexanone and ethane-1,2-dithiol form the thioacetal. Pick the other product.",
        [("water", "Water", "The carbonyl oxygen leaves with the two SH hydrogens."),
         ("h2s", "H₂S", "Both sulfurs stay in the ring. It is the oxygen that leaves."),
         ("oh", "Hydroxide ion", "The Lewis acid takes hold of the O first, so it leaves as water with the two SH hydrogens, not as free hydroxide.")],
        {k: k for k in cand}, byproduct(left, [condense(S["chx"], "[*]SCCS[*]")], cand), "water",
        "Thioacetal formation releases water, like acetal formation.",
        prov("Rule C, then RDKit atom balance over each candidate", CH),
        lead(S["chx"], "cyclohexanone", "cyclohexanone + dithiol"), concepts=OXY)

    s = S["acph"]
    two_step = raney(condense(s, "[*]SCCS[*]"))
    clem = to_ch2(s)
    ask(node, "u7-thi-same", "Acetophenone: thioacetal, then Raney Ni. Pick the reaction that gives the same product.",
        [("clem", "Clemmensen, Zn(Hg) and HCl", "Both routes turn C=O into CH₂: ethylbenzene either way, by acid or by sulfur."),
         ("nabh4", "NaBH₄, then H₃O⁺", "That stops at 1-phenylethanol, with the O still on."),
         ("wittig", "Ph₃P=CH₂", "That builds a C=C, giving a new alkene, not ethylbenzene.")],
        {"clem": clem in two_step, "nabh4": reduce_co(s) in two_step, "wittig": wittig(s, "C") in two_step}, True, "clem",
        "Thioacetal plus Raney Ni is the neutral way to C=O to CH₂.",
        prov("Rule C then rule R compared with Clemmensen, NaBH4 and Wittig products", CH),
        lead(s, "1-phenylethan-1-one", "acetophenone, two steps"), level=2, concepts=RED)

    s = "CC(=O)CC"
    t = condense(s, "[*]SCCS[*]")
    pick(node, "u7-thi-butanone", "Butanone meets ethane-1,2-dithiol and BF₃. Pick the product.",
         [("t", t, "2-ethyl-2-methyl-1,3-dithiolane", "2-Ethyl-2-methyl-1,3-dithiolane",
           "The ketone carbon keeps its methyl and ethyl and gains two S in a five-membered ring."),
          ("thiol", "CCC(C)(S)SCCS", "2-[(2-sulfanylethyl)sulfanyl]butane-2-thiol", "Open dithio adduct",
           "That leaves one SH free. The ring closes, and water, not H₂S, is what leaves."),
          ("ald", "CCCCC1SCCS1", "2-butyl-1,3-dithiolane", "2-Butyl-1,3-dithiolane",
           "That would come from pentanal. Butanone's carbonyl carbon holds two groups, so the ring carbon does too.")],
         [t], "t", "Ketones form thioacetals too, keeping both groups.",
         prov("Rule C with ethane-1,2-dithiol", CH), lead(s, "butan-2-one", "butanone + dithiol"), concepts=OXY)


# ---------------------------------------------------------------------------
# u7-derivative-tests
# ---------------------------------------------------------------------------

DNP = "[*]NNc1ccc(cc1[N+](=O)[O-])[N+](=O)[O-]"


def derivative_kind(smi: str) -> str:
    m = mol(smi)
    if m.HasSubstructMatch(Chem.MolFromSmarts("C=N[OX2H]")):
        return "oxime"
    if m.HasSubstructMatch(Chem.MolFromSmarts("C=NNc")):
        return "2,4-DNP hydrazone"
    if m.HasSubstructMatch(Chem.MolFromSmarts("C=NNC(=O)N")):
        return "semicarbazone"
    if m.HasSubstructMatch(Chem.MolFromSmarts("C=N[NX3H2]")):
        return "hydrazone"
    return "other"


def node_derivatives() -> None:
    node = "u7-derivative-tests"
    s = S["acetone"]
    p = condense(s, "[*]NO")
    pick(node, "u7-der-meet", "Propanone meets hydroxylamine, NH₂OH. Pick the product.",
         [("ox", p, "N-propan-2-ylidenehydroxylamine", "Propanone oxime",
           "NH₂OH acts like a primary amine: N bonds to the carbonyl carbon by C=N and water leaves. C=N-OH is an oxime."),
          ("carb", "CC(C)(O)NO", "2-(hydroxyamino)propan-2-ol", "The addition product",
           "That is the intermediate. It loses water to give C=N."),
          ("ether", "CC(C)ON", "O-propan-2-ylhydroxylamine", "O-Isopropylhydroxylamine",
           "The nitrogen is the nucleophile in NH₂OH, and the C=N forms. Nothing bonds through oxygen.")],
         [p], "ox", "Oximes come from NH₂OH, by the imine route.",
         prov("Rule C with hydroxylamine", CH), lead(s, "propan-2-one", "propanone + NH₂OH"), level=0, concepts=NIT)

    s = S["chx"]
    p = condense(s, DNP)
    pick(node, "u7-der-dnp", "Cyclohexanone meets 2,4-dinitrophenylhydrazine. Pick the product.",
         [("dnp", p, "1-cyclohexylidene-2-(2,4-dinitrophenyl)hydrazine", "Cyclohexanone 2,4-DNP hydrazone",
           "The terminal NH₂ of the hydrazine condenses with the C=O, giving C=N-NH-Ar, a hydrazone."),
          ("ring", "O=C1CCCCC1NNc1ccc([N+](=O)[O-])cc1[N+](=O)[O-]", "2-[2-(2,4-dinitrophenyl)hydrazinyl]cyclohexan-1-one", "Substituted on the ring",
           "That bonds N to the alpha carbon and keeps the C=O. The reaction is at the carbonyl carbon."),
          ("amine", "C1CCC(CC1)NNc1ccc(cc1[N+](=O)[O-])[N+](=O)[O-]", "1-cyclohexyl-2-(2,4-dinitrophenyl)hydrazine", "Reduced hydrazine",
           "That has H added across C=N. Nothing reduces it.")],
         [p], "dnp", "2,4-DNP gives the hydrazone, by the same imine logic.",
         prov("Rule C with 2,4-dinitrophenylhydrazine", CH), lead(s, "cyclohexanone", "cyclohexanone + 2,4-DNP"), concepts=NIT)

    s = S["acetone"]
    p = condense(s, "[*]NNC(N)=O")
    pick(node, "u7-der-semi", "Propanone meets semicarbazide, H₂NNHC(O)NH₂. Pick the product.",
         [("sc", p, "(propan-2-ylideneamino)urea", "Propanone semicarbazone",
           "Only the terminal NH₂ on the hydrazine end condenses: C=N-NH-C(O)NH₂."),
          ("amide", "CC(C)=NC(=O)NN", "N-propan-2-ylidenehydrazinecarboxamide", "Joined at the amide N",
           "The amide NH₂ is a poor nucleophile because its lone pair is shared with the C=O. The hydrazine NH₂ reacts."),
          ("hz", "CC(C)=NN", "propan-2-ylidenehydrazine", "Propanone hydrazone",
           "That loses the urea part. Semicarbazide keeps all of it.")],
         [p], "sc", "Semicarbazones form at the hydrazine NH₂.",
         prov("Rule C at the terminal hydrazine N", CH, "the hydrazine NH2, not the amide NH2, condenses"),
         lead(s, "propan-2-one", "propanone + semicarbazide"), level=2, concepts=NIT,
         convention="the hydrazine NH2, not the amide NH2, condenses")

    s = S["phcho"]
    p = condense(s, "[*]NN")
    pick(node, "u7-der-hz", "Benzaldehyde meets one equivalent of hydrazine, H₂NNH₂. Pick the product.",
         [("hz", p, "benzylidenehydrazine", "Benzaldehyde hydrazone",
           "One NH₂ condenses with the C=O: C=N-NH₂. This is the Wolff-Kishner intermediate."),
          ("azine", "C(=NN=Cc1ccccc1)c1ccccc1", "1,2-dibenzylidenehydrazine", "The azine",
           "That uses both NH₂ groups with two aldehydes. One equivalent of each stops at the hydrazone."),
          ("amine", "NNCc1ccccc1", "benzylhydrazine", "Benzylhydrazine",
           "That is reduced. No hydride is present.")],
         [p], "hz", "Hydrazine gives a hydrazone, the same imine logic.",
         prov("Rule C with hydrazine", CH), lead(s, "benzaldehyde", "benzaldehyde + H₂NNH₂"), concepts=NIT)

    rows = [("nh2oh", "NH₂OH", "[*]NO"), ("hz", "H₂NNH₂", "[*]NN"), ("dnp", "2,4-DNP", DNP), ("sc", "Semicarbazide", "[*]NNC(N)=O")]
    whys = {"oxime": "N-OH on the C=N: an oxime.", "hydrazone": "N-NH₂ on the C=N: a hydrazone.",
            "2,4-DNP hydrazone": "N-NH-aryl with two nitro groups: the 2,4-DNP hydrazone.",
            "semicarbazone": "N-NH-C(O)NH₂ on the C=N: a semicarbazone."}
    pairs = []
    for pid, left, nu in rows:
        kind = derivative_kind(condense(S["acetone"], nu))
        label = {"oxime": "Oxime", "hydrazone": "Hydrazone", "2,4-DNP hydrazone": "2,4-DNP hydrazone", "semicarbazone": "Semicarbazone"}.get(kind, kind)
        pairs.append((pid, left + " + propanone", label, whys.get(kind, "unknown"), label))
    match(node, "u7-der-match", "Match each reagent to the derivative it makes from propanone.",
          "Read what hangs off the nitrogen of the new C=N.", pairs,
          "Every derivative is a C=N; the group on N names it.",
          prov("Rule C on each pair; product named by SMARTS", CH), NIT)

    subs = {"ket": S["butanone"], "alc": "CCC(C)O", "ester": "CCOC(C)=O"}
    has = {k: len(co_sites(v)) == 1 for k, v in subs.items()}
    pick(node, "u7-der-which", "Pick the compound that condenses with 2,4-DNP to a hydrazone.",
         [("ket", subs["ket"], "butan-2-one", "Butan-2-one",
           "It has a ketone C=O, which condenses with the hydrazine to the hydrazone."),
          ("alc", subs["alc"], "butan-2-ol", "Butan-2-ol",
           "An alcohol has no C=O to condense with."),
          ("ester", subs["ester"], "ethyl acetate", "Ethyl acetate",
           "An ester's C=O is stabilised by its OR group and does not form the hydrazone under test conditions.")],
         [subs[k] for k, v in has.items() if v], "ket",
         "2,4-DNP condenses with aldehydes and ketones.",
         prov("SMARTS for an aldehyde or ketone C=O on each compound", CH, "esters and acids do not give a DNP test"),
         lead(subs["ket"], "butan-2-one", "three compounds + 2,4-DNP"), concepts=NIT,
         convention="esters and acids do not give a DNP test")


# ---------------------------------------------------------------------------
# u7-hwe
# ---------------------------------------------------------------------------

PHOS = "[*]CC(=O)OCC"


def node_hwe() -> None:
    node = "u7-hwe"
    s = S["phcho"]
    flatp = condense(s, PHOS)
    e = label_ez(flatp, "E")
    z = label_ez(flatp, "Z")
    pick(node, "u7-hwe-meet", "Benzaldehyde meets (EtO)₂P(O)CH₂CO₂Et and NaH. Pick the main product.",
         [("e", e, "ethyl (2E)-3-phenylprop-2-enoate", "Ethyl (E)-3-phenylpropenoate",
           "The phosphonate carbanion adds and the phosphate leaves, forming C=C. With an ester on the carbanion the E alkene dominates."),
          ("z", z, "ethyl (2Z)-3-phenylprop-2-enoate", "Ethyl (Z)-3-phenylpropenoate",
           "Same connectivity, but this is the Z isomer: phenyl and ester sit on the same side of the C=C. A stabilised phosphonate gives mostly E, where they sit on opposite sides."),
          ("ald", "CCOC(=O)CC(O)c1ccccc1", "ethyl 3-hydroxy-3-phenylpropanoate", "Ethyl 3-hydroxy-3-phenylpropanoate",
           "That is the addition step without the elimination. The phosphate leaves and takes the oxygen with it.")],
         [e], "e", "HWE: an ester-stabilised carbanion gives the E-alkene.",
         prov("Rule C; E isomer chosen by RDKit CIP label", CH, "a stabilised HWE gives the E alkene"),
         lead(s, "benzaldehyde", "benzaldehyde + phosphonate, NaH"), level=0, concepts=NUC,
         convention="a stabilised HWE gives the E alkene")

    s = S["chx"]
    p = condense(s, PHOS)
    pick(node, "u7-hwe-ketone", "Cyclohexanone meets (EtO)₂P(O)CH₂CO₂Et and NaH. Pick the product.",
         [("p", p, "ethyl 2-cyclohexylideneacetate", "Ethyl cyclohexylideneacetate",
           "The ring carbon that held the C=O now holds C=CH-CO₂Et. A symmetric ketone gives no E or Z."),
          ("endo", "CCOC(=O)CC1=CCCCC1", "ethyl 2-(cyclohex-1-en-1-yl)acetate", "C=C inside the ring",
           "The new C=C forms where the C=O was, outside the ring."),
          ("ol", "CCOC(=O)CC1(O)CCCCC1", "ethyl 2-(1-hydroxycyclohexyl)acetate", "The hydroxy ester",
           "That keeps the oxygen. In HWE it leaves with phosphorus.")],
         [p], "p", "HWE works on ketones as well as aldehydes.",
         prov("Rule C with the phosphonate carbanion", CH), lead(s, "cyclohexanone", "cyclohexanone + phosphonate"), concepts=NUC)

    left = [S["chx"], "CCOC(=O)[CH-]P(=O)(OCC)OCC"]
    cand = {"phos": "CCOP(=O)([O-])OCC", "tppo": "O=P(c1ccccc1)(c1ccccc1)c1ccccc1", "water": "O"}
    ask(node, "u7-hwe-byproduct", "The phosphonate carbanion and cyclohexanone give the alkene. Pick the other product.",
        [("phos", "Diethyl phosphate anion", "The oxygen ends on phosphorus as (EtO)₂PO₂⁻, a salt that washes out in water."),
         ("tppo", "Ph₃P=O", "That is the Wittig byproduct. This reagent has OEt groups on P, not phenyls."),
         ("water", "Water", "No H is free to leave with the O. It bonds to phosphorus.")],
        {k: k for k in cand}, byproduct(left, [condense(S["chx"], PHOS)], cand), "phos",
        "HWE leaves a water-soluble phosphate, easier to remove than Ph₃P=O.",
        prov("Rule C, then RDKit atom and charge balance over each candidate", CH),
        lead(S["chx"], "cyclohexanone", "cyclohexanone + phosphonate anion"), concepts=NUC)

    s = S["etcho"]
    flatp = condense(s, PHOS)
    e = label_ez(flatp, "E")
    pick(node, "u7-hwe-propanal", "Propanal meets (EtO)₂P(O)CH₂CO₂Et and NaH. Pick the main product.",
         [("e", e, "ethyl (2E)-pent-2-enoate", "Ethyl (E)-pent-2-enoate",
           "Three carbons from propanal plus two from the phosphonate: a five-carbon enoate, E."),
          ("z", label_ez(flatp, "Z"), "ethyl (2Z)-pent-2-enoate", "Ethyl (Z)-pent-2-enoate",
           "The Z isomer is minor with a stabilised phosphonate."),
          ("short", label_ez(condense(S["mecho"], PHOS), "E"), "ethyl (2E)-but-2-enoate", "Ethyl (E)-but-2-enoate",
           "That would come from ethanal. Propanal keeps its ethyl.")],
         [e], "e", "Count carbons: aldehyde chain plus CH-CO₂Et.",
         prov("Rule C; E isomer chosen by RDKit CIP label", CH, "a stabilised HWE gives the E alkene"),
         lead(s, "propanal", "propanal + phosphonate"), level=2, concepts=NUC,
         convention="a stabilised HWE gives the E alkene")

    target = canon(label_ez(condense(S["mecho"], PHOS), "E"))
    alds = {"mecho": S["mecho"], "hcho": S["hcho"], "etcho": S["etcho"]}
    made = {k: flat(condense(v, PHOS)) for k, v in alds.items()}
    pick(node, "u7-hwe-retro", "Pick the aldehyde that gives ethyl but-2-enoate by HWE.",
         [("mecho", S["mecho"], "acetaldehyde", "Ethanal",
           "Cut the C=C: the CH₃-CH= half was the aldehyde, ethanal."),
          ("hcho", S["hcho"], "formaldehyde", "Methanal",
           "That gives ethyl propenoate, with a CH₂= end."),
          ("etcho", S["etcho"], "propanal", "Propanal",
           "That gives ethyl pent-2-enoate, one carbon longer.")],
         [alds[k] for k, v in made.items() if v == flat(target)], "mecho",
         "The carbonyl half of the C=C keeps all its groups.",
         prov("Rule C run on each aldehyde and compared with the target", CH),
         lead(target, "ethyl (2E)-but-2-enoate", "the target enoate"), concepts=NUC)

    s = S["phcho"]
    p = condense(s, PHOS)
    pm = mol(p)
    dbl = [b for b in pm.GetBonds() if b.GetBondType() == DOUBLE and {b.GetBeginAtom().GetSymbol(), b.GetEndAtom().GetSymbol()} == {"C"}]

    def end_kind(x: Chem.Atom) -> str:
        if any(n.GetIsAromatic() for n in x.GetNeighbors()):
            return "aldehyde carbon"
        if any(n.GetSymbol() == "C" and any(y.GetSymbol() == "O" for y in n.GetNeighbors()) for n in x.GetNeighbors()):
            return "carbanion carbon"
        return "other"
    ends = sorted(end_kind(x) for b in dbl for x in (b.GetBeginAtom(), b.GetEndAtom()))
    ask(node, "u7-hwe-where", "In the HWE of benzaldehyde, pick the two carbons joined by the new C=C.",
        [("right", "The aldehyde C and the P-CH₂ carbon", "The carbanion carbon (between P and the ester) bonds to the aldehyde carbon, and those two become the C=C."),
         ("ester", "The aldehyde C and the ester C=O carbon", "The ester carbon keeps its C=O and is untouched."),
         ("ring", "Two ring carbons", "The ring stays aromatic. The new bond is outside it.")],
        {"right": ["aldehyde carbon", "carbanion carbon"], "ester": ["aldehyde carbon", "ester carbon"], "ring": ["ring", "ring"]}, ends, "right",
        "Olefinations join the carbonyl carbon to the carbanion carbon.",
        prov("Rule C; RDKit reads the neighbours of each end of the new C=C", CH),
        lead(s, "benzaldehyde", "benzaldehyde + phosphonate"), concepts=NUC)


# ---------------------------------------------------------------------------
# u7-bv
# ---------------------------------------------------------------------------

def node_bv() -> None:
    node = "u7-bv"
    s = S["chx"]
    p, _ = bv(s)
    pick(node, "u7-bv-meet", "Cyclohexanone meets mCPBA. Pick the product.",
         [("lac", p, "oxepan-2-one", "Oxepan-2-one",
           "An O slips in beside the carbonyl carbon, so the six-membered ring grows to seven: a lactone."),
          ("ep", "C1CCC2OC2C1", "7-oxabicyclo[4.1.0]heptane", "Cyclohexene oxide",
           "mCPBA epoxidises alkenes. Cyclohexanone has no C=C; with a ketone it inserts O."),
          ("acid", "O=C(O)CCCCC(=O)O", "hexanedioic acid", "Hexanedioic acid",
           "That is ring cleavage to a diacid, a much harsher oxidation. Baeyer-Villiger keeps the ring.")],
         [p], "lac", "Baeyer-Villiger turns a cyclic ketone into a lactone one atom bigger.",
         prov("Rule B; both ring bonds give the same product", CH), lead(s, "cyclohexanone", "cyclohexanone + mCPBA"), level=0,
         concepts=RED)

    s = S["cpn"]
    p, _ = bv(s)
    pick(node, "u7-bv-five", "Cyclopentanone meets mCPBA. Pick the product.",
         [("six", p, "oxan-2-one", "Oxan-2-one",
           "Five ring atoms plus the inserted O: a six-membered lactone."),
          ("five", "O=C1CCCO1", "oxolan-2-one", "Oxolan-2-one",
           "That ring is the same size as the ketone. Inserting O always adds one atom."),
          ("open", "OCCCCC(=O)O", "5-hydroxypentanoic acid", "5-Hydroxypentanoic acid",
           "That is the lactone opened by water. mCPBA only inserts the O, and nothing here hydrolyses the ring.")],
         [p], "six", "Ring size goes up by one.",
         prov("Rule B; ring size read by RDKit", CH), lead(s, "cyclopentanone", "cyclopentanone + mCPBA"), concepts=RED)

    s = S["pent3"]
    p, _ = bv(s)
    pick(node, "u7-bv-sym", "Pentan-3-one meets mCPBA. Pick the product.",
         [("p", p, "ethyl propanoate", "Ethyl propanoate",
           "Both groups are ethyl, so whichever moves gives the same ester: CH₃CH₂C(O)OCH₂CH₃."),
          ("acid", "CCC(=O)O", "propanoic acid", "Propanoic acid",
           "The inserted O stays bonded to the migrating ethyl. The whole ester is the product."),
          ("ether", "CCCOCC", "1-ethoxypropane", "1-Ethoxypropane",
           "The C=O stays. Only an O is added next to it.")],
         [p], "p", "A symmetric ketone gives one ester.",
         prov("Rule B; both groups give the same product", CH), lead(s, "pentan-3-one", "pentan-3-one + mCPBA"), concepts=RED)

    for id, smi, nm1, txt, other, nm2, txt2, why_r, why_w, cap, acid, nm3, txt3 in [
        ("u7-bv-tbu", S["pinacolone"], "tert-butyl acetate", "tert-Butyl acetate",
         "CC(C)(C)C(=O)OC", "methyl 2,2-dimethylpropanoate", "Methyl 2,2-dimethylpropanoate",
         "The tertiary group migrates far better than methyl, so the O ends on the tert-butyl carbon.",
         "That has methyl migrating. Methyl is the worst migrator.", "3,3-dimethylbutan-2-one",
         "CC(C)(C)C(=O)O", "2,2-dimethylpropanoic acid", "2,2-Dimethylpropanoic acid"),
        ("u7-bv-ph", S["acph"], "phenyl acetate", "Phenyl acetate",
         "COC(=O)c1ccccc1", "methyl benzoate", "Methyl benzoate",
         "Phenyl migrates in preference to methyl, so the O ends between the C=O and the ring.",
         "That is methyl migrating. Aryl beats methyl.", "1-phenylethan-1-one",
         "OC(=O)c1ccccc1", "benzoic acid", "Benzoic acid"),
        ("u7-bv-chx", "CC(=O)C1CCCCC1", "cyclohexyl acetate", "Cyclohexyl acetate",
         "COC(=O)C1CCCCC1", "methyl cyclohexanecarboxylate", "Methyl cyclohexanecarboxylate",
         "The secondary cyclohexyl migrates in preference to methyl, so the O ends on the ring carbon.",
         "Methyl migrating gives this. Secondary beats methyl.", "1-cyclohexylethan-1-one",
         "OC(=O)C1CCCCC1", "cyclohexanecarboxylic acid", "Cyclohexanecarboxylic acid"),
    ]:
        got = bv(smi)
        shown = "acetophenone" if smi == S["acph"] else cap  # the name other lessons use
        pick(node, id, f"{nm_cap(shown)} meets mCPBA. Pick the main product.",
             [("r", got[0] if got else smi, nm1, txt, why_r),
              ("w", other, nm2, txt2, why_w),
              ("k", acid, nm3, txt3, "That loses the methyl carbon, as a haloform reaction would. mCPBA keeps every carbon and inserts one O.")],
             [got[0]] if got else None, "r",
             "Migratory aptitude: H, then 3°, then 2° and aryl, then 1°, then methyl.",
             prov(f"Rule B: the {got[1] if got else '?'} group moves", CH, "migratory aptitude H > 3 > 2 = aryl > 1 > methyl"),
             lead(smi, cap, f"{cap} + mCPBA"), level=2, concepts=RED,
             convention="migratory aptitude H > 3 > 2 = aryl > 1 > methyl")


def nm_cap(name: str) -> str:
    """Sentence case for a name that may open with locants: 3,3-dimethyl... -> 3,3-Dimethyl..."""
    i = next((k for k, ch in enumerate(name) if ch.isalpha()), 0)
    return name[:i] + name[i].upper() + name[i + 1:]


# ---------------------------------------------------------------------------
# u7-ald-to-acid
# ---------------------------------------------------------------------------

def node_ald_to_acid() -> None:
    node = "u7-ald-to-acid"
    s = "CCCC=O"
    p = oxidise_ald(s)
    pick(node, "u7-ox-meet", "Butanal meets Jones reagent (CrO₃, H₂SO₄, water). Pick the product.",
         [("acid", p[0], "butanoic acid", "Butanoic acid",
           "The aldehyde C-H becomes C-OH: one more bond to oxygen, a carboxylic acid."),
          ("alc", "CCCCO", "butan-1-ol", "Butan-1-ol",
           "That is a reduction. Jones is an oxidant."),
          ("ester", "CCCC(=O)OCCCC", "butyl butanoate", "Butyl butanoate",
           "An ester needs an alcohol partner. Jones in water stops at the acid.")],
         p, "acid", "Aldehydes oxidise easily to carboxylic acids.",
         prov("Rule O: O inserted into the aldehyde C-H", CH), lead(s, "butanal", "butanal + Jones reagent"), level=0,
         concepts=RED)

    subs = {"ald": S["phcho"], "ket": S["acph"], "alc": "OCc1ccccc1"}
    pos = {k: bool(co_sites(v)) and bool(oxidise_ald(v)) for k, v in subs.items()}
    pick(node, "u7-ox-tollens", "Pick the compound that Tollens reagent oxidises.",
         [("ald", subs["ald"], "benzaldehyde", "Benzaldehyde",
           "Its aldehyde C-H is oxidised to the acid while Ag⁺ is reduced."),
          ("ket", subs["ket"], "1-phenylethan-1-one", "Acetophenone",
           "A ketone has no H on its carbonyl carbon, so mild Tollens cannot oxidise it."),
          ("alc", subs["alc"], "phenylmethanol", "Phenylmethanol",
           "Tollens is too mild to oxidise an alcohol. Only aldehydes react.")],
         [subs[k] for k, v in pos.items() if v], "ald",
         "Tollens is the aldehyde test: C-H on the carbonyl carbon.",
         prov("SMARTS finds an aldehyde C-H; rule O", CH, "Tollens oxidises aldehydes only"),
         lead(subs["ald"], "benzaldehyde", "three compounds + Tollens"), concepts=RED,
         convention="Tollens oxidises aldehydes only")

    s = S["acph"]
    got = no_rxn(s, oxidise_ald(s))
    pick(node, "u7-ox-ketone", "Acetophenone meets Tollens reagent. Pick what happens.",
         [("none", s, "1-phenylethan-1-one", "No reaction",
           "The carbonyl carbon holds two carbon groups and no H. There is no C-H to turn into C-OH."),
          ("acid", "OC(=O)c1ccccc1", "benzoic acid", "Benzoic acid",
           "That would need a C-C bond broken. Tollens cannot do that."),
          ("ester", "CC(=O)Oc1ccccc1", "phenyl acetate", "Phenyl acetate",
           "That is a Baeyer-Villiger product, which needs a peracid.")],
         got, "none", "No aldehyde C-H, no Tollens reaction.",
         prov("Rule O: no C-H on the carbonyl carbon", CH), lead(s, "1-phenylethan-1-one", "acetophenone + Tollens"),
         concepts=RED)

    s = "O=CC1CCCCC1"
    p = oxidise_ald(s)
    pick(node, "u7-ox-ring", "Cyclohexanecarbaldehyde meets Jones reagent. Pick the product.",
         [("acid", p[0], "cyclohexanecarboxylic acid", "Cyclohexanecarboxylic acid",
           "The CHO becomes COOH; the ring is untouched."),
          ("ket", "O=C1CCCCC1", "cyclohexanone", "Cyclohexanone",
           "That loses the CHO carbon. Oxidation keeps every carbon."),
          ("alc", "OCC1CCCCC1", "cyclohexylmethanol", "Cyclohexylmethanol",
           "That is the NaBH₄ product.")],
         p, "acid", "CHO to COOH, whatever it is attached to.",
         prov("Rule O", CH), lead(s, "cyclohexanecarbaldehyde", "cyclohexanecarbaldehyde + Jones"), concepts=RED)

    s = S["phcho"]
    p = oxidise_ald(s, charge=-1)
    pick(node, "u7-ox-tollens-product", "Benzaldehyde meets Tollens reagent (Ag⁺, NH₃, water). Pick the organic product.",
         [("ate", p[0], "benzoate", "Benzoate",
           "The aldehyde is oxidised. In the basic ammonia solution the acid is present as its carboxylate."),
          ("alc", "OCc1ccccc1", "phenylmethanol", "Phenylmethanol",
           "Silver is reduced, so the organic partner must be oxidised, not reduced."),
          ("acid", "OC(=O)c1ccccc1", "benzoic acid", "Benzoic acid",
           "Right oxidation, wrong form. In the basic ammonia solution the acid loses its proton; benzoic acid only appears after acid workup.")],
         p, "ate", "Tollens makes the carboxylate, and acid workup gives the acid.",
         prov("Rule O, then the acid drawn as its anion in basic solution", CH),
         lead(s, "benzaldehyde", "benzaldehyde + Tollens"), level=2, concepts=RED)

    cards = [
        ("co2", "Carbon dioxide", "O=C=O", "carbon dioxide", "Four bonds to O: as oxidised as carbon gets."),
        ("acid", "Methanoic acid", "O=CO", "formic acid", "Three bonds to O and one H."),
        ("ald", "Methanal", "C=O", "formaldehyde", "Two bonds to O and two H."),
        ("alc", "Methanol", "CO", "methanol", "One bond to O and three H: the bottom here."),
    ]
    ladder(node, "u7-ox-ladder", cards, lambda s: -head_ox(s),
           "Rank one-carbon compounds by oxidation level, most oxidised first.",
           "Count bonds to O minus bonds to H on the carbon.",
           "oxidation_level", ("Most oxidised", "Least oxidised"),
           "Rank carbon dioxide, methanoic acid, methanal and methanol by carbon oxidation level, most oxidised first.",
           ("CO₂, acid, aldehyde, alcohol.", "Each step up swaps a C-H for another bond to O.",
            "Count bonds to oxygen on the one carbon."),
           [("reversed", ["alc", "ald", "acid", "co2"], "ordering_is_reversed",
             ("The ladder read from the bottom.", "More bonds to O means more oxidised.", "Put carbon dioxide first.")),
            ("ald-acid", ["co2", "ald", "acid", "alc"], "ordering_one_adjacent_pair_swapped",
             ("Aldehyde above acid.", "The acid has one more bond to O.", "Compare methanal and methanoic acid."))],
           "Aldehyde oxidation is one step up this ladder.",
           prov("carbon oxidation state computed per card", CH), RED, "oxidation_and_reduction_ladder")


# ---------------------------------------------------------------------------
# u7-cannizzaro
# ---------------------------------------------------------------------------

def node_cannizzaro() -> None:
    node = "u7-cannizzaro"
    alds = {"phcho": S["phcho"], "mecho": S["mecho"], "etcho": S["etcho"]}
    pick(node, "u7-can-meet", "Concentrated NaOH meets three aldehydes. Pick the one that does a Cannizzaro.",
         [("phcho", S["phcho"], "benzaldehyde", "Benzaldehyde",
           "Its carbonyl carbon is bonded to a ring carbon with no H, so no enolate can form. Hydroxide adds to C=O instead."),
          ("mecho", S["mecho"], "acetaldehyde", "Ethanal",
           "Its methyl has three alpha H. Base removes one and an aldol follows instead."),
          ("etcho", S["etcho"], "propanal", "Propanal",
           "The CH₂ next to the C=O carries alpha H, so base makes the enolate and aldol chemistry wins.")],
         [alds[k] for k, v in alds.items() if alpha_h(v) == 0], "phcho",
         "Cannizzaro needs an aldehyde with no alpha H.",
         prov("RDKit counts H on sp3 alpha carbons", CH), lead(S["phcho"], "benzaldehyde", "three aldehydes + conc. NaOH"),
         level=0, concepts=RED)

    s = S["phcho"]
    got = cannizzaro(s)
    ask(node, "u7-can-pair", "Benzaldehyde meets concentrated NaOH. Pick the pair formed.",
        [("both", "Phenylmethanol and benzoate", "One aldehyde is reduced to the alcohol and the other oxidised to the carboxylate."),
         ("alc", "Two phenylmethanol", "Something must be oxidised for one aldehyde to be reduced. Hydride comes from the other aldehyde."),
         ("acid", "Two benzoate", "That would need an outside oxidant, and none is present.")],
        {"both": sorted([canon("OCc1ccccc1"), canon("[O-]C(=O)c1ccccc1")]), "alc": [canon("OCc1ccccc1")] * 2,
         "acid": [canon("[O-]C(=O)c1ccccc1")] * 2}, [canon(x) for x in got], "both",
        "Cannizzaro is a disproportionation: one up, one down.",
        prov("Rule O for Cannizzaro", CH), lead(s, "benzaldehyde", "benzaldehyde + conc. NaOH"), concepts=RED)

    s = S["pivald"]
    got = cannizzaro(s)
    ox = [g for g in got if "-" in g]
    pick(node, "u7-can-piv", "2,2-Dimethylpropanal meets concentrated NaOH. Pick the oxidised product.",
         [("ate", ox[0] if ox else s, "2,2-dimethylpropanoate", "2,2-Dimethylpropanoate",
           "The alpha carbon is quaternary, so no enolate forms. Half the aldehyde becomes this carboxylate."),
          ("alc", "CC(C)(C)CO", "2,2-dimethylpropan-1-ol", "2,2-Dimethylpropan-1-ol",
           "That is the reduced half. The question asks for the oxidised one."),
          ("aldol", "CC(C)(C)C(O)C(C)(C)C=O", "3-hydroxy-2,2,4,4-tetramethylpentanal", "An aldol",
           "An aldol needs an alpha H to make the enolate. This aldehyde has none.")],
         ox, "ate", "A quaternary alpha carbon means no alpha H: Cannizzaro.",
         prov("Rule O for Cannizzaro", CH), lead(s, "2,2-dimethylpropanal", "2,2-dimethylpropanal + NaOH"), concepts=RED)

    ask(node, "u7-can-crossed", "Benzaldehyde and excess methanal meet concentrated NaOH. Pick what benzaldehyde becomes.",
        [("alc", "Phenylmethanol", "Methanal is the more reactive aldehyde, so hydroxide adds to it and it delivers the hydride. Benzaldehyde is reduced."),
         ("ate", "Benzoate", "That happens when benzaldehyde reacts with itself. With methanal present, methanal is oxidised instead."),
         ("same", "Unchanged benzaldehyde", "It is the hydride acceptor here, so it does react.")],
        {"alc": "reduced", "ate": "oxidised", "same": "none"},
        "reduced" if reactivity(S["hcho"]) > reactivity(S["phcho"]) else "oxidised", "alc",
        "In a crossed Cannizzaro, methanal is sacrificed as formate.",
        prov("reactivity counted from carbons on each C=O", CH, "the more reactive aldehyde is the one oxidised"),
        lead(S["phcho"], "benzaldehyde", "benzaldehyde + methanal, NaOH"), level=2, concepts=RED,
        convention="the more reactive aldehyde is the one oxidised")

    s = S["phcho"]
    c, _ = the_co(s)
    start = c_ox_state(s, c)
    got = cannizzaro(s)
    deltas = [c_ox_state(g, [a.GetIdx() for a in mol(g).GetAtoms() if a.GetSymbol() == "C" and any(n.GetSymbol() == "O" for n in a.GetNeighbors())][0]) - start for g in got]
    states = sorted((d > 0) - (d < 0) for d in deltas)
    ask(node, "u7-can-redox", "In the Cannizzaro of benzaldehyde, pick what happens to the two carbonyl carbons.",
        [("split", "One oxidised, one reduced", "The alcohol carbon drops one oxidation level and the carboxylate carbon rises one."),
         ("down", "Both reduced", "No outside reductant is present. One aldehyde is the reductant for the other."),
         ("none", "Neither changes", "The alcohol carbon has gained an H and the carboxylate carbon an O, so both have changed level.")],
        {"split": [-1, 1], "down": [-1, -1], "none": [0, 0]}, states, "split",
        "Disproportionation: the same starting level goes both ways.",
        prov("RDKit carbon oxidation states before and after", CH), lead(s, "benzaldehyde", "benzaldehyde, Cannizzaro"),
        level=2, concepts=RED)

    alds = {"fur": "O=Cc1ccco1", "but": "CCCC=O", "chx": "O=CC1CCCCC1"}
    pick(node, "u7-can-furfural", "Pick the aldehyde that can undergo a Cannizzaro reaction.",
         [("fur", alds["fur"], "furan-2-carbaldehyde", "Furan-2-carbaldehyde",
           "Its CHO sits on an aromatic ring carbon with no H, so no enolate is possible."),
          ("but", alds["but"], "butanal", "Butanal",
           "C2 has two alpha H, so base gives the aldol instead."),
          ("chx", alds["chx"], "cyclohexanecarbaldehyde", "Cyclohexanecarbaldehyde",
           "The ring CH next to the CHO has one alpha H, enough for an enolate.")],
         [alds[k] for k, v in alds.items() if alpha_h(v) == 0], "fur",
         "Look at the carbon next to CHO: any H there rules Cannizzaro out.",
         prov("RDKit counts H on sp3 alpha carbons", CH), lead(alds["chx"], "cyclohexanecarbaldehyde", "three aldehydes"),
         concepts=RED)


# ---------------------------------------------------------------------------
# u7-mpv
# ---------------------------------------------------------------------------

def node_mpv() -> None:
    node = "u7-mpv"
    s = S["chx"]
    p = reduce_co(s)
    pick(node, "u7-mpv-meet", "Cyclohexanone meets Al(OiPr)₃ in propan-2-ol. Pick the product.",
         [("ol", p, "cyclohexanol", "Cyclohexanol",
           "A hydride moves from the isopropoxide's C-H to the ketone carbon: the ketone is reduced."),
          ("ether", "CC(C)OC1CCCCC1", "(propan-2-yloxy)cyclohexane", "Isopropyl cyclohexyl ether",
           "No C-O bond forms between the two partners. Only a hydride is passed across."),
          ("ipr", "CC(C)C1(O)CCCCC1", "1-(propan-2-yl)cyclohexan-1-ol", "Isopropyl added",
           "No C-C bond forms. The isopropoxide gives a hydride from its C-H, not its carbon chain.")],
         [p], "ol", "MPV: propan-2-ol is the hydride source.",
         prov("Rule R", CH), lead(s, "cyclohexanone", "cyclohexanone + Al(OiPr)₃"), level=0, concepts=RED)

    left = [S["chx"], "CC(C)O"]
    cand = {"acetone": "CC(C)=O", "h2": "[H][H]", "water": "O"}
    ask(node, "u7-mpv-byproduct", "Cyclohexanone is reduced by propan-2-ol (MPV). Pick the other product.",
        [("acetone", "Propanone", "Propan-2-ol gives up the H on its carbon and becomes the ketone. Distilling propanone out drives the reaction."),
         ("h2", "Hydrogen gas", "No H₂ is set free. The hydride goes straight from propan-2-ol's carbon to the ketone carbon."),
         ("water", "Water", "No oxygen leaves. Both partners keep theirs.")],
        {k: k for k in cand}, byproduct(left, [reduce_co(S["chx"])], cand), "acetone",
        "MPV swaps oxidation levels: the ketone down, propan-2-ol up.",
        prov("Rule R, then RDKit atom balance over each candidate", CH),
        lead(S["chx"], "cyclohexanone", "cyclohexanone + propan-2-ol"), concepts=RED)

    s = "OC1CCCCC1"
    pick(node, "u7-mpv-oppenauer", "Cyclohexanol meets Al(OtBu)₃ and excess propanone (Oppenauer). Pick the product.",
         [("ket", S["chx"], "cyclohexanone", "Cyclohexanone",
           "MPV run backwards: the alcohol gives its C-H hydride to propanone, which is in excess, and becomes the ketone."),
          # Two near misses replace a dehydration product and "No reaction" (audit 23 Oct, 2b).
          ("hemi", "CC(C)(O)OC1CCCCC1", "2-(cyclohexyloxy)propan-2-ol", "Hemiketal",
           "The alcohol can add to propanone's C=O, but that hemiketal is a reversible dead end. The aluminium passes a hydride instead, and the alcohol carbon becomes C=O."),
          ("diacid", "OC(=O)CCCCC(=O)O", "hexanedioic acid", "Hexanedioic acid",
           "That breaks a C-C bond in the ring. Oppenauer only moves a hydride, so it stops at the ketone.")],
         [the_reverse("OC1CCCCC1")], "ket", "Oppenauer is the reverse of MPV, driven by excess propanone.",
         prov("Rule R reversed", CH, "excess propanone drives the equilibrium"), lead(s, "cyclohexanol", "cyclohexanol + propanone, Al(OtBu)₃"),
         concepts=RED, convention="excess propanone drives the equilibrium")

    s = "O=C/C=C/c1ccccc1"
    p = reduce_co(s)
    pick(node, "u7-mpv-enal", "(E)-3-Phenylprop-2-enal meets Al(OiPr)₃ in propan-2-ol. Pick the product.",
         [("ol", p, "(2E)-3-phenylprop-2-en-1-ol", "(E)-3-Phenylprop-2-en-1-ol",
           "The hydride goes only to the C=O carbon through the aluminium complex, so the C=C survives."),
          ("sat", "O=CCCc1ccccc1", "3-phenylpropanal", "3-Phenylpropanal",
           "That reduces the C=C and keeps the C=O, the opposite selectivity."),
          ("both", "OCCCc1ccccc1", "3-phenylpropan-1-ol", "3-Phenylpropan-1-ol",
           "MPV delivers hydride only to the C=O carbon, through the aluminium complex. The conjugated C=C is left alone, so only the C=O is reduced.")],
         [p], "ol", "MPV is chemoselective for C=O.",
         prov("Rule R on the C=O only", CH, "MPV leaves C=C alone"), lead(s, "(2E)-3-phenylprop-2-enal", "cinnamaldehyde + Al(OiPr)₃"),
         level=2, concepts=RED, convention="MPV leaves C=C alone")

    s = S["acph"]
    p = reduce_co(s)
    pick(node, "u7-mpv-acph", "Acetophenone meets Al(OiPr)₃ in propan-2-ol. Pick the product.",
         [("ol", p, "1-phenylethan-1-ol", "1-Phenylethanol",
           "The ketone carbon takes a hydride and the oxygen, after workup, an H."),
          ("ane", "CCc1ccccc1", "ethylbenzene", "Ethylbenzene",
           "MPV stops at the alcohol. Removing the O needs Clemmensen or Wolff-Kishner."),
          ("ipr", "CC(C)C(C)(O)c1ccccc1", "3-methyl-2-phenylbutan-2-ol", "Isopropyl added",
           "No C-C bond forms. The isopropoxide gives a hydride, not its carbon chain.")],
         [p], "ol", "MPV reduces aryl ketones too.",
         prov("Rule R", CH), lead(s, "1-phenylethan-1-one", "acetophenone + Al(OiPr)₃"), concepts=RED)

    def kinds(smis: list[str]) -> list[str]:
        out = []
        for x in smis:
            m = mol(x)
            out.append("ketone" if m.HasSubstructMatch(KETO) else "alcohol" if m.HasSubstructMatch(Chem.MolFromSmarts("[CX4][OX2H]")) else "other")
        return sorted(out)
    left = kinds([S["chx"], "CC(C)O"])
    right = kinds([reduce_co(S["chx"]), "CC(C)=O"])
    ask(node, "u7-mpv-why", "MPV runs easily in both directions. Pick the reason.",
        [("same", "Each side is one ketone and one alcohol", "Swapping a hydride between two ketone and alcohol pairs changes little energy, so the equilibrium is set by concentrations."),
         ("gas", "A gas is lost on one side", "Nothing leaves as a gas. Both directions are run in solution."),
         ("water", "Water is formed and removed", "No water forms: no oxygen is lost by either partner.")],
        {"same": True, "gas": False, "water": None}, left == right, "same",
        "MPV and Oppenauer are one equilibrium, pushed by which ketone or alcohol is in excess.",
        prov("Rule R; RDKit classifies each species as ketone or alcohol on both sides", CH),
        lead(S["chx"], "cyclohexanone", "MPV equilibrium"), level=2, concepts=RED)


def the_reverse(alcohol: str) -> str:
    """Oppenauer: CH-OH back to C=O (the reverse of rule R)."""
    c, o = match_one(alcohol, "[CX4;H1][OX2H]")
    rw = Chem.RWMol(mol(alcohol))
    rw.GetBondBetweenAtoms(c, o).SetBondType(DOUBLE)
    return one(rw)


# ---------------------------------------------------------------------------
# Build and emit
# ---------------------------------------------------------------------------

def build() -> None:
    node_mechanism()
    node_hydration()
    node_acetal()
    node_protect()
    node_imine()
    node_enamine()
    node_grignard()
    node_hydride()
    node_wittig()
    node_12v14()
    node_to_ch2()
    node_cyanohydrin()
    node_thioacetal()
    node_derivatives()
    node_hwe()
    node_bv()
    node_ald_to_acid()
    node_cannizzaro()
    node_mpv()
    check_names()
    for node, entries in POOLS.items():
        if not 6 <= len(entries) <= 12:
            fail(f"{node}: {len(entries)} items, outside 6 to 12")
    for slot in range(4):
        share = CORRECT_INDEX.count(slot) / max(1, len(CORRECT_INDEX))
        if share > 0.5:
            fail(f"{share:.0%} of MCQs put the answer in slot {slot}")


HEADER = '''/**
 * Unit 7 (aldehydes and ketones: nucleophilic addition) problem pools, a DRAFT.
 * GENERATED by scripts/u7_pools.py. Do not edit by hand: edit the specs in the
 * script and rerun it.
 *
 * EVERY ENTRY IS A DRAFT (`placeholder: true`) for the owner's review, never
 * presented as done. Each answer was derived by the script (graph edits for
 * addition, condensation, hydrolysis, reduction, 1,4-addition, Baeyer-Villiger
 * and Cannizzaro; RDKit atom balance for byproducts; every name read back by
 * OPSIN), and the script refuses to write this file when an authored key
 * disagrees with what it derived. Where an answer rests on an authored
 * convention RDKit cannot check (hard 1,2 against soft 1,4, migratory
 * aptitude, E-selective HWE, which carbonyl is more reactive), the entry's
 * provenance says so.
 *
 * Every pool here is a LESSON pool: MCQs join the node's recognise step, and
 * the few ladders and match boards fill the lesson's order and connect slots
 * (beats/template.ts planLesson). Ladders are built with createProblem and
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
    return body.replace('"u5-pool"', '"u7-pool"')


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
    out += emit_table("U7_POOLS", list(POOLS), "/** Lesson pools keyed by map node id (beats/practice/pools.ts). */")
    out.append("/** The drawing beside each MCQ, keyed by beat id. */")
    out.append("export const U7_VISUALS: Readonly<Record<string, McqVisual>> = " + ts(VISUALS) + ";\n")
    out.append("/** Drawn options, keyed by beat id then option id. All or nothing per beat. */")
    out.append("export const U7_OPTION_TILES: Readonly<Record<string, Readonly<Record<string, NamedFigure>>>> = " + ts(TILES) + ";\n")
    out.append("/** A drawing for every sort card, keyed by beat id then item id. */")
    out.append("export const U7_SORT_FIGURES: Readonly<Record<string, Readonly<Record<string, NamedFigure>>>> = " + ts(SORT_FIGURES) + ";\n")
    return "\n".join(out)


def reset() -> None:
    for table in (POOLS, VISUALS, TILES, SORT_FIGURES, CONVENTIONS):
        table.clear()
    for seq in (CORRECT_INDEX, NAME_CHECKS, FAILURES, NOTES):
        seq.clear()
    IDS.clear()


def report_disagreements() -> None:
    """Where RDKit's own numbers and the textbook convention part ways, printed for the owner report."""
    trio = [("formaldehyde", S["hcho"]), ("acetaldehyde", S["mecho"]), ("acetone", S["acetone"])]
    by_gasteiger = [n for n, _ in sorted(trio, key=lambda t: -gasteiger_c(t[1]))]
    by_convention = [n for n, _ in sorted(trio, key=lambda t: reactivity(t[1]), reverse=True)]
    print("carbonyl C Gasteiger charge: " + ", ".join(f"{n} {gasteiger_c(s):.4f}" for n, s in trio))
    if by_gasteiger != by_convention:
        print(f"DISAGREES: Gasteiger order {by_gasteiger}, convention order {by_convention}")


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
    report_disagreements()
    print(f"wrote {OUT.relative_to(REPO)}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
