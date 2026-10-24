"""
Unit 5 (alcohols, diols, ethers and epoxides) problem pools, a DRAFT, derived with RDKit.

Run:     python scripts/u5_pools.py
Writes:  src/game/content/u5/pools.ts (never edit it by hand: edit the specs
         below and rerun). The owner's report for this unit is written by hand
         beside the run, from what this script prints.

Built on scripts/u4_pools.py: the figure, naming, entry and emit helpers are
copied from it, with one addition: figures now draw wedge and hash bonds
(RDKit's WedgeMolBonds) so a stereo answer is never shown flat. Every entry is
`placeholder: true`.

THE MODEL. Check these rules, not the hundred answers. Each is applied by a
graph edit on RDKit molecules; the script never types a product.

S. Activation then SN2 (PBr3, Appel, a tosylate plus a nucleophile): the
   leaving group comes off the C-O carbon and the nucleophile bonds there.
   Stereo is built in 3D: the carbon is pushed through the plane of its other
   three groups and the nucleophile placed behind it, then RDKit reads the
   configuration back from the coordinates (AssignStereochemistryFrom3D).

T. Sulfonylation, silylation and alkylation on O (TsCl, MsCl, TBSCl, NaH then
   CH3I or BnBr): only the O-H changes, so the stereo tag on carbon is carried.

C. Cations (HX, acid dehydration, acid-catalysed ether formation): a cation
   forms on the carbon that loses water and moves once if a neighbouring H
   (first choice) or methyl moving over leaves a carbon with more carbon
   neighbours. Carbon-neighbour count is the computed stand-in for cation
   stability. E1 products are enumerated from the final cation and the one
   with most carbons on the C=C is taken (Zaitsev, a convention). POCl3 and
   pyridine run the same enumeration with no cation and so no shift.

O. Oxidation: a mild oxidant (PCC, Dess-Martin, Swern, TEMPO) moves a C-OH
   carbon that holds an H up one level; a strong aqueous one (Jones) takes a
   primary alcohol on to the acid. No H on the carbon, no reaction. Which
   reagent belongs to which group is the course's own equivalence table
   (documentation/COURSE-OUTLINE-ORGO2.md section 6), a convention.

W. Williamson: the halide carbon must be sp3 and methyl or primary; any
   alkoxide will do. A tertiary halide gives the E2 alkene instead.

E. Epoxides. Formation and dihydroxylation are built in 3D: O or OH groups
   placed on one face (syn) or opposite faces (anti) of the C=C, both faces
   run, so the product SET comes out and meso versus racemic is read by
   comparing each product with its mirror image. Opening: under acid the
   nucleophile takes the carbon with more carbon neighbours, under base the
   one with fewer, always from behind (3D placement as in rule S).

M. Alkoxymercuration: OR to the alkene carbon with more carbon neighbours,
   H to the other, no shift. The acid-catalysed version runs rule C's shift.

X. Ether cleavage with HX: one equivalent cuts the C-O bond to a tertiary
   carbon (SN1) or else the one to the least substituted carbon (SN2); an
   aryl C-O never breaks; excess HX cuts every sp3 C-O and turns each alcohol
   so formed into the halide.

D. HIO4: the C-C bond between two C-OH carbons is cut and each becomes C=O.

R. Pinacol: the OH whose carbon has more carbon neighbours leaves; one group
   on the other carbon moves over and that carbon's OH becomes C=O. The
   script refuses a case where groups of two kinds could move (migratory
   aptitude is a convention RDKit cannot derive).

Mass balance. Where an item asks for byproducts (SOCl2, Appel, Swern), the
right set is the only one whose atoms and charge balance, counted by RDKit.

Names. Every drawn structure is named, and OPSIN must read the name back as
exactly the drawing. Stereo names are found the same way: each R/S
combination is read by OPSIN and the one that matches the drawing is kept.

CHECK SOURCES, never adapted: OpenStax Organic Chemistry (CC BY-NC-SA 4.0)
sections 8.7, 8.8, 17.6 to 17.8 and 18.2 to 18.8 are NAMED as the check for
each entry. They were not read in this drafting run: the check is owed, and
the owner report says so.
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
OUT = REPO / "src" / "game" / "content" / "u5" / "pools.ts"

SCRIPT = "scripts/u5_pools.py"


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
OPSIN_DIR = Path(tempfile.mkdtemp(prefix="u5_opsin_"))


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
    if not id.startswith("u5-"):
        fail(f"{id}: ids start u5-")
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
        "problemId": "u5-pool-" + id,
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
# The Unit 5 model: graph edits for the constitution, 3D placement for stereo
# ---------------------------------------------------------------------------



def fixed(m: Chem.Mol) -> Chem.RWMol:
    """An editable copy whose H counts are pinned, so bond edits never move a hydrogen."""
    rw = Chem.RWMol(m)
    for a in rw.GetAtoms():
        n = a.GetTotalNumHs()
        a.SetNoImplicit(True)
        a.SetNumExplicitHs(n)
    return rw


def set_h(rw: Chem.RWMol, i: int, delta: int) -> None:
    a = rw.GetAtomWithIdx(i)
    if a.GetNumExplicitHs() + delta < 0:
        raise ValueError(f"atom {i} has no H to remove")
    a.SetNumExplicitHs(a.GetNumExplicitHs() + delta)


def finish(rw: Chem.RWMol) -> str:
    out = rw.GetMol()
    Chem.SanitizeMol(out)
    return Chem.MolToSmiles(out)


def add_frag(rw: Chem.RWMol, at: int, frag: str, order=Chem.BondType.SINGLE) -> int:
    """Bond fragment `frag` (first atom attaches; written so its H count already allows the new bond) to atom `at`."""
    f = fixed(mol(frag))
    # frag is a neutral molecule (HBr as "Br", methanol as "OC"); its first atom gives up one H for the new bond
    if f.GetAtomWithIdx(0).GetNumExplicitHs() > 0:
        set_h(f, 0, -1)
    base = rw.GetNumAtoms()
    for a in f.GetAtoms():
        rw.AddAtom(a)
    for b in f.GetBonds():
        rw.AddBond(base + b.GetBeginAtomIdx(), base + b.GetEndAtomIdx(), b.GetBondType())
    rw.AddBond(at, base, order)
    return base


def cdeg(m: Chem.Mol, i: int) -> int:
    """Carbon neighbours of atom i: 0 methyl, 1 primary, 2 secondary, 3 tertiary."""
    return sum(1 for n in m.GetAtomWithIdx(i).GetNeighbors() if n.GetSymbol() == "C")


def match_one(smi: str, smarts: str) -> tuple[int, ...]:
    hits = mol(smi).GetSubstructMatches(Chem.MolFromSmarts(smarts))
    if len(hits) != 1:
        raise ValueError(f"{smi}: {len(hits)} matches for {smarts}")
    return hits[0]


def hydroxyls(smi: str) -> list[tuple[int, int]]:
    """(sp3 carbon, O) for every C-OH."""
    return list(mol(smi).GetSubstructMatches(Chem.MolFromSmarts("[CX4][OX2H]")))


def the_oh(smi: str) -> tuple[int, int]:
    hits = hydroxyls(smi)
    if len(hits) != 1:
        raise ValueError(f"{smi}: {len(hits)} C-OH groups")
    return hits[0]


def alcohol_class(smi: str) -> int:
    c, _ = the_oh(smi)
    return cdeg(mol(smi), c)


def drop_fragment(rw: Chem.RWMol, keep: int) -> Chem.RWMol:
    """Delete every atom not connected to atom `keep` (the leaving group, once its bond is cut)."""
    m = rw.GetMol()
    frags = Chem.GetMolFrags(m, asMols=False, sanitizeFrags=False)
    mine = [f for f in frags if keep in f][0]
    for i in sorted(set(range(m.GetNumAtoms())) - set(mine), reverse=True):
        rw.RemoveAtom(i)
    return rw


# -- Rule O: oxidation. Mild (PCC, DMP, Swern, TEMPO) moves one level; strong (Jones) goes on to the acid.

def oxidize(smi: str, strong: bool) -> list[str]:
    """Every C-OH whose carbon carries an H is oxidised; a tertiary one is left alone. Empty: no reaction."""
    m = mol(smi)
    sites = [(c, o) for c, o in hydroxyls(smi) if m.GetAtomWithIdx(c).GetTotalNumHs() > 0]
    if not sites:
        return []
    rw = fixed(m)
    for c, o in sites:
        primary = rw.GetAtomWithIdx(c).GetNumExplicitHs() == 2
        rw.GetBondBetweenAtoms(c, o).SetBondType(Chem.BondType.DOUBLE)
        set_h(rw, c, -1)
        set_h(rw, o, -1)
        if strong and primary:
            add_frag(rw, c, "O")
            set_h(rw, c, -1)
    return [finish(rw)]


# -- Rule C: cations. A cation forms on the carbon that loses its leaving group. It shifts once if a
#    neighbour's H (first choice) or methyl moving over leaves a more substituted cation. Substitution
#    count is the computed stand-in for cation stability.

def shifted(m: Chem.Mol, c: int) -> tuple[int, int | None, str]:
    """(final cation carbon, migrating carbon or None, 'none' | 'H' | 'C')."""
    best = (cdeg(m, c), c, None, "none")
    for n in m.GetAtomWithIdx(c).GetNeighbors():
        j = n.GetIdx()
        if n.GetSymbol() == "C" and n.GetTotalNumHs() > 0 and cdeg(m, j) > best[0]:
            best = (cdeg(m, j), j, None, "H")
    if best[3] == "none":
        for n in m.GetAtomWithIdx(c).GetNeighbors():
            j = n.GetIdx()
            if n.GetSymbol() != "C":
                continue
            for g in n.GetNeighbors():
                if g.GetIdx() != c and g.GetSymbol() == "C" and g.GetDegree() == 1 and cdeg(m, j) - 1 > best[0]:
                    best = (cdeg(m, j) - 1, j, g.GetIdx(), "C")
                    break
    return best[1], best[2], best[3]


def sn1(smi: str, c: int, lg: int, nu: str, allow_shift: bool = True) -> str:
    """Leaving group off, shift if it pays, nucleophile on the final cation carbon (constitution only)."""
    rw, final = _core(smi, c, lg, allow_shift)
    add_frag(rw, final, nu)
    return finish(rw)


def _core(smi: str, c: int, lg: int, allow_shift: bool = True) -> tuple[Chem.RWMol, int]:
    m = mol(smi)
    for a in m.GetAtoms():
        a.SetIntProp("orig", a.GetIdx())
    final, group, kind = shifted(m, c) if allow_shift else (c, None, "none")
    rw = fixed(m)
    rw.RemoveBond(c, lg)
    if kind == "H":
        set_h(rw, final, -1)
        set_h(rw, c, 1)
    elif kind == "C":
        rw.RemoveBond(final, group)
        rw.AddBond(c, group, Chem.BondType.SINGLE)
    rw = drop_fragment(rw, final)
    idx = [a.GetIdx() for a in rw.GetAtoms() if a.GetIntProp("orig") == final][0]
    return rw, idx


def e1(smi: str, c: int, lg: int, allow_shift: bool = True) -> list[str]:
    """Every alkene from the (possibly shifted) cation, by loss of one beta H."""
    base, final = _core(smi, c, lg, allow_shift)
    base = base.GetMol()
    out = []
    for n in base.GetAtomWithIdx(final).GetNeighbors():
        if n.GetSymbol() == "C" and n.GetNumExplicitHs() > 0:
            rw = Chem.RWMol(base)
            rw.GetBondBetweenAtoms(final, n.GetIdx()).SetBondType(Chem.BondType.DOUBLE)
            set_h(rw, n.GetIdx(), -1)
            out.append(finish(rw))
    return sorted(set(canon(s) for s in out))


def alkene_subst(smi: str) -> int:
    """Carbon substituents on the C=C carbons (the Zaitsev count)."""
    m = mol(smi)
    a, b = match_one(smi, "C=C")
    return cdeg(m, a) + cdeg(m, b) - 2


def zaitsev(products: list[str]) -> str | None:
    """The one most substituted alkene; None on a tie or nothing."""
    ranked = sorted(products, key=alkene_subst, reverse=True)
    if not ranked or (len(ranked) > 1 and alkene_subst(ranked[0]) == alkene_subst(ranked[1])):
        return None
    return ranked[0]


def swap(smi: str, c: int, lg: int, nu: str) -> str:
    """Constitution of a substitution at c: lg (and all it holds) off, nu on. No stereo."""
    m = mol(smi)
    for a in m.GetAtoms():
        a.SetIntProp("orig", a.GetIdx())
    rw = fixed(m)
    rw.RemoveBond(c, lg)
    rw = drop_fragment(rw, c)
    idx = [a.GetIdx() for a in rw.GetAtoms() if a.GetIntProp("orig") == c][0]
    add_frag(rw, idx, nu)
    return finish(rw)


# -- Stereo by placement in 3D. Each product is built on a 3D conformer with the new atom put where
#    the mechanism puts it (behind the leaving group for SN2, on one face of the C=C for an addition),
#    then RDKit reads the configuration back from the coordinates. No R or S is typed by hand.

def embed(smi: str, seed: int = 11) -> Chem.Mol:
    m = Chem.AddHs(mol(smi))
    if AllChem.EmbedMolecule(m, randomSeed=seed) != 0:
        raise ValueError(f"could not embed {smi}")
    return m


def pos(m: Chem.Mol, i: int) -> np.ndarray:
    p = m.GetConformer().GetAtomPosition(i)
    return np.array([p.x, p.y, p.z])


def read_3d(rw: Chem.RWMol) -> str:
    m = rw.GetMol()
    for a in m.GetAtoms():
        if a.GetAtomicNum() != 1:
            a.SetNoImplicit(False)
            a.SetNumExplicitHs(0)
    Chem.SanitizeMol(m)
    Chem.AssignStereochemistryFrom3D(m)
    return Chem.MolToSmiles(Chem.RemoveHs(m))


def sn2_3d(smi: str, c: int, lg: int, nu: str, keep_lg: bool = False, invert: bool = True) -> str:
    """
    nu (one heavy atom plus whatever it carries, written as SMILES) onto carbon c,
    behind the leaving atom (invert) or exactly where it was (retain). keep_lg:
    the leaving atom stays in the molecule and takes an H (an epoxide oxygen).
    """
    m = embed(smi)
    for a in m.GetAtoms():
        a.SetIntProp("orig", a.GetIdx())
    pc, pl = pos(m, c), pos(m, lg)
    d = (pl - pc) / np.linalg.norm(pl - pc)
    if invert:
        # Walden inversion: the carbon passes through the plane of its other three
        # groups (the umbrella flips) and the nucleophile bonds on the far side.
        rest = [pos(m, n.GetIdx()) for n in m.GetAtomWithIdx(c).GetNeighbors() if n.GetIdx() != lg]
        g = sum(rest) / 3
        new_c = 2 * g - pc
        out_dir = (new_c - g) / np.linalg.norm(new_c - g)
        m.GetConformer().SetAtomPosition(c, new_c.tolist())
        where = new_c + out_dir * 1.9
    else:
        where, out_dir = pl, d
    rw = Chem.RWMol(m)
    rw.RemoveBond(c, lg)
    if keep_lg:
        h = rw.AddAtom(Chem.Atom(1))
        rw.AddBond(lg, h, Chem.BondType.SINGLE)
        rw.GetConformer().SetAtomPosition(h, (pl + d).tolist())
    else:
        rw = drop_fragment(rw, c)
    idx = [a.GetIdx() for a in rw.GetAtoms() if a.HasProp("orig") and a.GetIntProp("orig") == c][0]
    frag = Chem.AddHs(mol(nu))
    base = rw.GetNumAtoms()
    for a in frag.GetAtoms():
        rw.AddAtom(a)
    for b in frag.GetBonds():
        rw.AddBond(base + b.GetBeginAtomIdx(), base + b.GetEndAtomIdx(), b.GetBondType())
    rw.AddBond(idx, base, Chem.BondType.SINGLE)
    conf = rw.GetConformer()
    for k in range(base, rw.GetNumAtoms()):
        conf.SetAtomPosition(k, (where + out_dir * 1.5 * (k - base)).tolist())
    # the attaching atom gave up one H for the new bond
    hs = [n.GetIdx() for n in rw.GetAtomWithIdx(base).GetNeighbors() if n.GetAtomicNum() == 1]
    if hs:
        rw.RemoveAtom(hs[0])
    return read_3d(rw)


def stereo_set(smis: list[str]) -> list[str]:
    return sorted(set(canon(s) for s in smis))


def add_across(smi: str, mode: str) -> list[str]:
    """
    syn or anti OH,OH across the one C=C, or an epoxide O, from both faces, so
    the product SET comes out: one meso compound, or a pair of enantiomers.
    """
    out = []
    for face in (1.0, -1.0):
        m = embed(smi)
        a, b = m.GetSubstructMatch(Chem.MolFromSmarts("C=C"))
        pa, pb = pos(m, a), pos(m, b)
        other = [n.GetIdx() for n in m.GetAtomWithIdx(a).GetNeighbors() if n.GetIdx() != b][0]
        nrm = np.cross(pb - pa, pos(m, other) - pa)
        nrm = face * nrm / np.linalg.norm(nrm)
        rw = Chem.RWMol(m)
        rw.GetBondBetweenAtoms(a, b).SetBondType(Chem.BondType.SINGLE)
        rw.GetBondBetweenAtoms(a, b).SetStereo(Chem.BondStereo.STEREONONE)
        conf = rw.GetConformer()
        if mode == "epoxide":
            o = rw.AddAtom(Chem.Atom(8))
            rw.AddBond(a, o, Chem.BondType.SINGLE)
            rw.AddBond(b, o, Chem.BondType.SINGLE)
            conf.SetAtomPosition(o, ((pa + pb) / 2 + 1.2 * nrm).tolist())
        else:
            for atom, p, sign in ((a, pa, 1.0), (b, pb, 1.0 if mode == "syn" else -1.0)):
                o = rw.AddAtom(Chem.Atom(8))
                rw.AddBond(atom, o, Chem.BondType.SINGLE)
                conf.SetAtomPosition(o, (p + sign * 1.4 * nrm).tolist())
        out.append(read_3d(rw))
    return stereo_set(out)


def mirror(smi: str) -> str:
    return canon(smi.replace("@@", "!").replace("@", "@@").replace("!", "@"))


def describe_set(products: list[str]) -> str:
    """'meso', 'enantiomers', 'achiral' or 'one enantiomer'."""
    if len(products) == 1:
        p = products[0]
        if "@" not in p:
            return "achiral"
        return "meso" if mirror(p) == canon(p) else "one enantiomer"
    if len(products) == 2 and mirror(products[0]) == canon(products[1]):
        return "enantiomers"
    return "mixture"


def cip(smi: str) -> str:
    m = mol(smi)
    rdCIPLabeler.AssignCIPLabels(m)
    return ",".join(f"{a.GetIdx()}{a.GetSymbol()}:{a.GetProp('_CIPCode')}" for a in m.GetAtoms() if a.HasProp("_CIPCode"))


def epoxide_atoms(smi: str) -> tuple[int, int, int]:
    """(carbon a, carbon b, O) of the one epoxide."""
    a, o, b = match_one(smi, "[#6;r3]1[#8;r3][#6;r3]1")
    return a, b, o


def open_epoxide(smi: str, acidic: bool, nu: str, racemic: bool = True) -> list[str]:
    """
    Acid: the nucleophile takes the MORE substituted carbon; base: the LESS
    substituted. Backside attack; the epoxide O stays on the other carbon as OH.
    An achiral or meso epoxide is opened at both equivalent carbons, so the set
    holds both enantiomers of the product, as the racemate forms.
    """
    out = []
    starts = [canon(smi)] if not racemic or mirror(smi) == canon(smi) else [canon(smi), mirror(smi)]
    for s in starts:
        m = mol(s)
        a, b, o = epoxide_atoms(s)
        da, db = cdeg(m, a), cdeg(m, b)
        if da == db:
            targets = [a, b]
        else:
            more, less = (a, b) if da > db else (b, a)
            targets = [more if acidic else less]
        for t in targets:
            out.append(sn2_3d(s, t, o, nu, keep_lg=True))
    if racemic:
        out += [mirror(p) for p in out]
    return stereo_set(out)


# -- Mass balance: a byproduct option is right only if the equation balances, atom for atom and charge.

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


# ---------------------------------------------------------------------------
# Unit 5 helpers built on the model
# ---------------------------------------------------------------------------

def flat(smi: str) -> str:
    """Canonical SMILES with stereo removed, for constitution-only keys."""
    m = mol(smi)
    Chem.RemoveStereochemistry(m)
    return Chem.MolToSmiles(m)


def key_flat(options: dict[str, str], wanted: list[str]) -> str | None:
    """key_in on constitution only: the one option whose skeleton is in the derived set."""
    want = {flat(s) for s in wanted}
    hits = [o for o, smi in options.items() if flat(smi) in want]
    return hits[0] if len(hits) == 1 else None


def no_rxn(smi: str, got: list[str]) -> list[str]:
    """A reaction that derives nothing leaves the starting material: the 'no reaction' tile is the start drawn again."""
    return got if got else [canon(smi)]


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
    mcq(node, id, prompt, [(o, t, w) for o, _, _, t, w in opts], key, correct, explanation, provenance, visual,
        tiles=tiles, **kw)


def tosylate(smi: str, group: str = "S(=O)(=O)c1ccc(C)cc1") -> str:
    """O-H to O-SO2R: the C-O bond is never touched, so the carbon keeps its configuration."""
    _, o = the_oh(smi)
    rw = fixed(mol(smi))
    set_h(rw, o, -1)
    add_frag(rw, o, group)
    return finish(rw)


def o_alkylate(smi: str, group: str) -> str:
    """Alkoxide O onto a methyl or primary carbon (Williamson, benzyl, silyl): O-H becomes O-R, C-O untouched."""
    return tosylate(smi, group)


def tosylate_atoms(smi: str) -> tuple[int, int]:
    """(carbon, the O bonded to S) of a sulfonate ester."""
    c, o, _ = match_one(smi, "[CX4][OX2][SX4]")
    return c, o


def williamson_ok(alkoxide_side: str, halide: str) -> bool:
    """Rule W: the halide carbon must be methyl or primary and sp3; any alkoxide will do."""
    m = mol(halide)
    c, _ = match_one(halide, "[#6][Br,I,Cl]")
    a = m.GetAtomWithIdx(c)
    return (not a.GetIsAromatic()) and a.GetHybridization() == Chem.HybridizationType.SP3 and cdeg(m, c) <= 1


def silyl_off(smi: str) -> str:
    """TBAF: cut every Si-O bond, the O takes back its H. Nothing else is touched."""
    m = mol(smi)
    for a in m.GetAtoms():
        a.SetIntProp("orig", a.GetIdx())
    rw = fixed(m)
    pairs = [(b.GetBeginAtomIdx(), b.GetEndAtomIdx()) for b in m.GetBonds()
             if {b.GetBeginAtom().GetSymbol(), b.GetEndAtom().GetSymbol()} == {"Si", "O"}]
    keep = None
    for i, j in pairs:
        o = i if m.GetAtomWithIdx(i).GetSymbol() == "O" else j
        rw.RemoveBond(i, j)
        set_h(rw, o, 1)
        keep = o
    rw = drop_fragment(rw, keep)
    return finish(rw)


def benzyl_off(smi: str) -> list[str]:
    """H2, Pd/C: cut each O-CH2Ph bond, H onto both ends. Returns both pieces."""
    m = mol(smi)
    o, ch2 = match_one(smi, "[OX2]-[CH2]c1ccccc1")[:2]
    rw = fixed(m)
    rw.RemoveBond(o, ch2)
    set_h(rw, o, 1)
    set_h(rw, ch2, 1)
    return components(finish(rw))


def components(smi: str) -> list[str]:
    return sorted(Chem.MolToSmiles(f) for f in Chem.GetMolFrags(mol(smi), asMols=True))


def thp_ether(alcohol: str) -> str:
    """Rule P: the alcohol O bonds to the C=C carbon next to the ring O (the oxocarbenium carbon); H goes on the other."""
    dhp = mol("C1=COCCC1")
    a, b = match_one("C1=COCCC1", "[CH1;$(C-O)]=[CH1]")  # wrong order guard below
    combo = Chem.CombineMols(dhp, mol(alcohol))
    rw = fixed(combo)
    ring_o_side = [x for x in (a, b) if any(n.GetSymbol() == "O" for n in dhp.GetAtomWithIdx(x).GetNeighbors())][0]
    other = b if ring_o_side == a else a
    off = dhp.GetNumAtoms()
    _, oh = the_oh(alcohol)
    rw.GetBondBetweenAtoms(a, b).SetBondType(Chem.BondType.SINGLE)
    set_h(rw, other, 1)
    set_h(rw, off + oh, -1)
    rw.AddBond(ring_o_side, off + oh, Chem.BondType.SINGLE)
    return finish(rw)


def alkene_carbons(m: Chem.Mol) -> tuple[int, int]:
    hits = m.GetSubstructMatches(Chem.MolFromSmarts("C=C"))
    if len(hits) != 1:
        raise ValueError(f"{Chem.MolToSmiles(m)}: {len(hits)} C=C")
    return hits[0]


def markovnikov(alkene: str, nu: str, allow_shift: bool) -> str:
    """
    Rule M: H goes to the C=C carbon with fewer carbon neighbours, the other
    carbon carries the charge (a cation if allow_shift, a mercurinium-bound
    carbon that never shifts if not), then the nucleophile bonds there.
    """
    m = mol(alkene)
    a, b = alkene_carbons(m)
    if cdeg(m, a) == cdeg(m, b):
        raise ValueError(f"{alkene}: no Markovnikov preference")
    less, more = (a, b) if cdeg(m, a) < cdeg(m, b) else (b, a)
    rw = fixed(m)
    rw.GetBondBetweenAtoms(a, b).SetBondType(Chem.BondType.SINGLE)
    set_h(rw, less, 1)
    site = more
    if allow_shift:
        tmp = rw.GetMol()
        tmp.UpdatePropertyCache(strict=False)
        final, group, kind = shifted(tmp, more)
        if kind == "H":
            set_h(rw, final, -1)
            set_h(rw, more, 1)
        elif kind == "C":
            rw.RemoveBond(final, group)
            rw.AddBond(more, group, Chem.BondType.SINGLE)
        site = final
    add_frag(rw, site, nu)
    return finish(rw)


def ether_cleave(smi: str, hx: str, excess: bool) -> list[str]:
    """
    Rule X. One equivalent: the C-O bond to a tertiary carbon breaks (SN1); with
    none, the one to the less substituted carbon (SN2). An aryl C-O never breaks.
    Excess: every sp3 C-O breaks, and each alcohol so formed goes on to C-X.
    Returns the organic products (water left out).
    """
    patt = Chem.MolFromSmarts("[CX4]-[OX2]")
    cur = [canon(smi)]
    for _ in range(6):
        nxt: list[str] = []
        changed = False
        for s in cur:
            m = mol(s)
            bonds = m.GetSubstructMatches(patt)
            ethers = [(c, o) for c, o in bonds if m.GetAtomWithIdx(o).GetTotalNumHs() == 0]
            alcohols = [(c, o) for c, o in bonds if m.GetAtomWithIdx(o).GetTotalNumHs() == 1]
            if ethers and (excess or not changed and s == canon(smi)):
                tert = [(c, o) for c, o in ethers if cdeg(m, c) == 3]
                c, o = tert[0] if tert else min(ethers, key=lambda p: cdeg(m, p[0]))
                rw = fixed(m)
                rw.RemoveBond(c, o)
                set_h(rw, o, 1)
                add_frag(rw, c, hx)
                nxt += components(finish(rw))
                changed = True
            elif excess and alcohols:
                c, o = alcohols[0]
                nxt.append(swap(s, c, o, hx))
                changed = True
            else:
                nxt.append(s)
        cur = sorted(set(nxt))
        if not changed or not excess:
            return cur
    return cur


def diol_cleave(smi: str) -> list[str]:
    """Rule D: HIO4 cuts the C-C bond between two C-OH carbons; each carbon becomes C=O."""
    hits = mol(smi).GetSubstructMatches(Chem.MolFromSmarts("[OX2H]-[CX4]-[CX4]-[OX2H]"))
    if not hits:
        return []
    o1, c1, c2, o2 = hits[0]
    rw = fixed(mol(smi))
    rw.RemoveBond(c1, c2)
    for c, o in ((c1, o1), (c2, o2)):
        rw.GetBondBetweenAtoms(c, o).SetBondType(Chem.BondType.DOUBLE)
        set_h(rw, o, -1)
    return components(finish(rw))


def pinacol(smi: str) -> tuple[str, str, int]:
    """
    Rule R. The OH on the carbon with more carbon neighbours leaves (the more
    substituted cation); one group on the other carbon moves over, and that
    carbon's OH becomes C=O. Returns (product, 'H' or 'C', cation carbon's
    substitution). Refuses a choice between two different kinds of group, which
    rests on migratory aptitude, a convention RDKit cannot derive.
    """
    m = mol(smi)
    o1, c1, c2, o2 = match_one(smi, "[OX2H]-[CX4]-[CX4]-[OX2H]")
    if cdeg(m, c1) == cdeg(m, c2):
        cat, nb, lg, keep_o = c1, c2, o1, o2
    elif cdeg(m, c1) > cdeg(m, c2):
        cat, nb, lg, keep_o = c1, c2, o1, o2
    else:
        cat, nb, lg, keep_o = c2, c1, o2, o1
    groups = [n for n in m.GetAtomWithIdx(nb).GetNeighbors() if n.GetIdx() not in (cat, keep_o)]
    hs = m.GetAtomWithIdx(nb).GetTotalNumHs()
    kinds = {("ar" if g.GetIsAromatic() else "alkyl") for g in groups} | ({"H"} if hs else set())
    if len(kinds) != 1:
        raise ValueError(f"{smi}: groups of different kinds could move ({kinds}); needs migratory aptitude")
    rw = fixed(m)
    rw.RemoveBond(cat, lg)
    if hs:
        kind = "H"
        set_h(rw, nb, -1)
        set_h(rw, cat, 1)
    else:
        kind = "C"
        g = groups[0].GetIdx()
        rw.RemoveBond(nb, g)
        rw.AddBond(cat, g, Chem.BondType.SINGLE)
    rw.GetBondBetweenAtoms(nb, keep_o).SetBondType(Chem.BondType.DOUBLE)
    set_h(rw, keep_o, -1)
    rw = drop_fragment(rw, nb)
    return finish(rw), kind, cdeg(m, cat)


def s_level(smi: str) -> int:
    """O atoms double bonded to the one S: 0 sulfide or thiol, 1 sulfoxide, 2 sulfone."""
    m = mol(smi)
    s = [a for a in m.GetAtoms() if a.GetSymbol() == "S"]
    if len(s) != 1:
        raise ValueError(f"{smi}: {len(s)} S atoms")
    return sum(1 for b in s[0].GetBonds() if b.GetBondTypeAsDouble() == 2 and b.GetOtherAtom(s[0]).GetSymbol() == "O")


def s_oxidize(smi: str, steps: int) -> str:
    """One step: sulfide to sulfoxide (S=O). Two: on to the sulfone."""
    rw = fixed(mol(smi))
    s = [a.GetIdx() for a in rw.GetAtoms() if a.GetSymbol() == "S"][0]
    for _ in range(steps):
        o = rw.AddAtom(Chem.Atom(8))
        rw.GetAtomWithIdx(o).SetNoImplicit(True)
        rw.AddBond(s, o, Chem.BondType.DOUBLE)
    return finish(rw)


def c_ox_state(smi: str, c: int) -> int:
    """Oxidation state of one carbon: +1 per bond order to O, -1 per H."""
    a = mol(smi).GetAtomWithIdx(c)
    up = sum(int(b.GetBondTypeAsDouble()) for b in a.GetBonds() if b.GetOtherAtom(a).GetSymbol() == "O")
    return up - a.GetTotalNumHs()


def key_word(options: dict[str, object], value: object) -> str | None:
    hits = [o for o, v in options.items() if v == value]
    return hits[0] if len(hits) == 1 else None


def nm(smi: str, name: str, caption: str | None = None, **kw) -> dict:
    """A drawn, OPSIN-checked tile."""
    return named(canon(smi), name, caption, **kw)


S = {
    "butanol": "CCCCO",
    "r2butanol": "C[C@@H](O)CC",
    "tbuoh": "CC(C)(C)O",
    "3mb2ol": "CC(C)C(C)O",
    "pentanol": "CCCCCO",
    "cyhexol": "OC1CCCCC1",
    "2mb2ol": "CCC(C)(C)O",
    "1mecyhexol": "CC1(O)CCCCC1",
    "33dmb2ol": "CC(O)C(C)(C)C",
    "2mecyhexol": "CC1CCCCC1O",
    "propanol": "CCCO",
    "cyhexmeoh": "OCC1CCCCC1",
    "cyhexene": "C1=CCCCC1",
    "zbut": "C/C=C\\C",
    "ebut": "C/C=C/C",
    "mecyhexene": "CC1=CCCCC1",
    "dmox": "CC1(C)CO1",
    "pox": "CC1CO1",
    "rpox": "C[C@@H]1CO1",
    "chox": "C1CCC2OC2C1",
    "mechox": "CC12CCCCC1O2",
    "limonene": "CC1=CCC(CC1)C(C)=C",
}


def lead(smi: str, name: str, caption: str) -> dict:
    return structure(canon(smi), name, caption)


ROH = "17.6"
OXI = "17.7"
PROT = "17.8"
ETH = "18.2"
CLV = "18.3"
EPX = "18.5"
EPO = "18.6"
THI = "18.8"
ALK = "8.7"
CUT = "8.8"

LG = ("conjugate_base_stability_argument",)
REARR = ("carbocation_rearrangement",)
OXL = ("oxidation_state_ladder",)
GEOM = ("anti_addition_geometry",)
# Epoxidation and OsO4 add both new bonds to one face (audit 23 Oct 2b): tagged syn, not anti.
SYN = ("syn_addition_geometry",)
PROTECT = ("protecting_group_strategy",)
DEPROT = ("pka_keq_viability",)


# ---------------------------------------------------------------------------
# u5-roh-rx: alcohol to alkyl halide
# ---------------------------------------------------------------------------

def node_roh_rx() -> None:
    node = "u5-roh-rx"
    s = S["butanol"]
    c, o = the_oh(s)
    pick(node, "u5-rx-meet", "Butan-1-ol meets PBr₃. Pick the product.",
         [("br", swap(s, c, o, "Br"), "1-bromobutane", "1-Bromobutane",
           "PBr₃ turns the OH into a leaving group on phosphorus, and bromide pushes it out from behind. Br lands on the carbon that held OH."),
          ("ene", "C=CCC", "but-1-ene", "But-1-ene",
           "Nothing here is a strong base, and a primary carbon has no cation to lose a proton from. Substitution wins."),
          ("shift", "CCC(C)Br", "2-bromobutane", "2-Bromobutane",
           "Br on C2 would need a cation and a shift. PBr₃ works by backside attack, so no cation forms and nothing moves.")],
         [swap(s, c, o, "Br")], "br",
         "PBr₃ is the no-cation route: the C-O carbon becomes the C-Br carbon.",
         prov("Rule S: PBr3 swaps OH for Br at the same carbon by SN2", ROH),
         lead(s, "butan-1-ol", "butan-1-ol + PBr₃"), level=0, concepts=LG)

    s = S["r2butanol"]
    c, o = the_oh(s)
    inv, ret = sn2_3d(s, c, o, "Br"), sn2_3d(s, c, o, "Br", invert=False)
    pick(node, "u5-rx-invert", "(R)-Butan-2-ol meets PBr₃. Pick the product.",
         [("inv", inv, "(S)-2-bromobutane", "(S)-2-Bromobutane",
           "Bromide attacks the back of the C-O carbon as the activated oxygen leaves, so the other three groups flip like an umbrella."),
          ("ret", ret, "(R)-2-bromobutane", "(R)-2-Bromobutane",
           "Retention would need Br to arrive from the same side the oxygen leaves. Backside attack puts it on the opposite side."),
          ("ene", "CC=CC", "but-2-ene", "But-2-ene",
           "PBr₃ gives a substitution. No strong base is present to take a proton.")],
         [inv], "inv",
         "PBr₃ is SN2 at carbon: one stereocentre in, inverted out. Here R becomes S.",
         prov("Rule S: Br placed behind the leaving O on a 3D conformer, configuration read back by RDKit", ROH),
         lead(s, "(R)-butan-2-ol", "(R)-butan-2-ol + PBr₃"), concepts=LG)

    s = S["tbuoh"]
    c, o = the_oh(s)
    pick(node, "u5-rx-tert", "2-Methylpropan-2-ol meets HCl. Pick the product.",
         [("cl", sn1(s, c, o, "Cl"), "2-chloro-2-methylpropane", "2-Chloro-2-methylpropane",
           "Acid protonates the OH, water leaves, and chloride traps the tertiary cation on the same carbon."),
          ("prim", "CC(C)CCl", "1-chloro-2-methylpropane", "1-Chloro-2-methylpropane",
           "Cl on the CH₂ would need the cation to move to a primary carbon, which is less stable. The cation stays tertiary."),
          ("ene", "C=C(C)C", "2-methylprop-1-ene", "2-Methylpropene",
           "Loss of H⁺ competes, but with chloride present in excess the cation is trapped as the chloride.")],
         [sn1(s, c, o, "Cl")], "cl",
         "A tertiary alcohol with HX goes through a cation, and the halide bonds where the cation sits.",
         prov("Rule C: OH off as water, cation at the tertiary carbon, no shift improves it, Cl on", ROH,
              "with excess halide the cation is trapped by substitution, not elimination"),
         lead(s, "2-methylpropan-2-ol", "2-methylpropan-2-ol + HCl"), concepts=REARR)

    s = S["3mb2ol"]
    c, o = the_oh(s)
    shifted_p, plain = sn1(s, c, o, "Br"), swap(s, c, o, "Br")
    pick(node, "u5-rx-shift", "3-Methylbutan-2-ol meets HBr. Pick the major product.",
         [("shift", shifted_p, "2-bromo-2-methylbutane", "2-Bromo-2-methylbutane",
           "Water leaves a secondary cation next to a carbon with an H and three carbon neighbours. The hydride shift makes it tertiary, and Br bonds there."),
          ("plain", plain, "2-bromo-3-methylbutane", "2-Bromo-3-methylbutane",
           "That is Br where the OH was, which skips the shift. A secondary cation one hydride away from a tertiary one shifts first."),
          ("ene", "CC=C(C)C", "2-methylbut-2-ene", "2-Methylbut-2-ene",
           "With bromide in excess the cation is trapped, so the product keeps a Br.")],
         [shifted_p], "shift",
         "HX makes a cation, and a cation moves if one shift makes it more substituted.",
         prov("Rule C: hydride shift from C3 (three carbon neighbours) to C2 (two), Br on the tertiary carbon", ROH,
              "with excess halide the cation is trapped by substitution, not elimination"),
         lead(s, "3-methylbutan-2-ol", "3-methylbutan-2-ol + HBr"), level=2, concepts=REARR)

    pick(node, "u5-rx-noshift", "3-Methylbutan-2-ol meets PBr₃. Pick the product.",
         [("plain", plain, "2-bromo-3-methylbutane", "2-Bromo-3-methylbutane",
           "PBr₃ never makes a cation. Bromide displaces the activated oxygen at C2, so the skeleton stays as drawn."),
          ("shift", shifted_p, "2-bromo-2-methylbutane", "2-Bromo-2-methylbutane",
           "A hydride shift needs a cation to move toward. With PBr₃ there is none, so Br stays on C2."),
          ("ene", "CC=C(C)C", "2-methylbut-2-ene", "2-Methylbut-2-ene",
           "PBr₃ gives substitution, not elimination.")],
         [swap(s, c, o, "Br")], "plain",
         "Same alcohol, two reagents: HBr can rearrange, PBr₃ cannot.",
         prov("Rule S: PBr3 swaps OH for Br at the same carbon, no cation, no shift", ROH),
         lead(s, "3-methylbutan-2-ol", "3-methylbutan-2-ol + PBr₃"), level=2, concepts=REARR)

    s = S["pentanol"]
    c, o = the_oh(s)
    prod = swap(s, c, o, "Cl")
    left = [s, "O=S(Cl)Cl"]
    sets = {"so2": [prod, "O=S=O", "Cl"], "cl2": [prod, "O=S=O", "ClCl"], "h2so3": [prod, "OS(O)=O", "Cl"]}
    good = [k for k, v in sets.items() if balances(left, v)]
    mcq(node, "u5-rx-socl2", "Pentan-1-ol meets SOCl₂ with pyridine. Pick the two byproducts.",
        [("so2", "SO₂ and HCl", "Both atoms balance: the O-H hydrogen and one Cl leave as HCl, and S keeps two oxygens as SO₂. Pyridine soaks up the HCl."),
         ("cl2", "SO₂ and Cl₂", "Count hydrogens: the alcohol's O-H hydrogen has to go somewhere, and Cl₂ has none to take it."),
         ("h2so3", "H₂SO₃ and HCl", "That needs three H on the right but the alcohol gives up only one. The equation does not balance.")],
        good[0] if len(good) == 1 else None, "so2",
        "SOCl₂ turns C-OH into C-Cl and sheds SO₂ gas and HCl, which is why the reaction runs one way.",
        prov("mass balance computed atom by atom over each candidate set", ROH),
        lead(s, "pentan-1-ol", "pentan-1-ol + SOCl₂"), concepts=LG)

    cands = {"shift": S["3mb2ol"], "sec": "CCC(C)O", "cy": S["cyhexol"], "tert": S["2mb2ol"]}
    moves = [k for k, v in cands.items() if shifted(mol(v), the_oh(v)[0])[2] != "none"]
    pick(node, "u5-rx-which-shifts", "With HBr, only one of these alcohols rearranges. Pick it.",
         [("shift", cands["shift"], "3-methylbutan-2-ol", "3-Methylbutan-2-ol",
           "Its cation is secondary with a tertiary C-H next door. One hydride shift makes it tertiary."),
          ("sec", cands["sec"], "butan-2-ol", "Butan-2-ol",
           "Its cation is secondary and both neighbours are no better, so a shift gains nothing."),
          ("cy", cands["cy"], "cyclohexanol", "Cyclohexanol",
           "Every ring neighbour is also secondary. Moving the charge around the ring changes nothing."),
          ("tert", cands["tert"], "2-methylbutan-2-ol", "2-Methylbutan-2-ol",
           "Its cation is already tertiary. There is nothing better one shift away.")],
         [cands[moves[0]]] if len(moves) == 1 else None, "shift",
         "Look one carbon over from the cation: if a shift makes it more substituted, it happens.",
         prov("Rule C: shift test on each alcohol's cation", ROH),
         lead("CCC(C)O", "butan-2-ol", "four alcohols + HBr"), level=2, concepts=REARR)


# ---------------------------------------------------------------------------
# u5-tosylate: sulfonate esters
# ---------------------------------------------------------------------------

def node_tosylate() -> None:
    node = "u5-tosylate"
    s = S["butanol"]
    ots = tosylate(s)
    pick(node, "u5-ts-meet", "Butan-1-ol meets TsCl with pyridine. Pick the product.",
         [("ots", ots, "butyl 4-methylbenzenesulfonate", "Butyl tosylate",
           "The alcohol's O attacks sulfur and chloride leaves from S. The O-H loses its H; the C-O bond stays whole."),
          ("cl", "CCCCCl", "1-chlorobutane", "1-Chlorobutane",
           "Chloride leaves sulfur and is swept up by pyridine as pyridinium chloride. It does not replace the O on carbon here."),
          ("cs", "CCCCS(=O)(=O)c1ccc(C)cc1", "1-(butane-1-sulfonyl)-4-methylbenzene", "Butyl tolyl sulfone",
           "That bonds S to carbon. The nucleophile is the alcohol's oxygen, so S ends up on O.")],
         [ots], "ots",
         "Tosylation makes a good leaving group on oxygen without touching the carbon.",
         prov("Rule T: O-H becomes O-SO2Ar, the C-O bond is kept", ROH),
         lead(s, "butan-1-ol", "butan-1-ol + TsCl, pyridine"), level=0, concepts=LG)

    s = S["r2butanol"]
    ots = tosylate(s)
    pick(node, "u5-ts-retain", "(R)-Butan-2-ol meets TsCl with pyridine. Pick the product.",
         [("ret", ots, "(2R)-butan-2-yl 4-methylbenzenesulfonate", "(R)-Butan-2-yl tosylate",
           "Only the O-H bond reacts. The stereocentre's four bonds are untouched, so its configuration is kept."),
          ("inv", mirror(ots), "(2S)-butan-2-yl 4-methylbenzenesulfonate", "(S)-Butan-2-yl tosylate",
           "Inversion needs an attack at carbon. Here oxygen attacks sulfur, and the carbon is a bystander."),
          ("cl", sn2_3d(s, *the_oh(s), "Cl"), "(S)-2-chlorobutane", "(S)-2-Chlorobutane",
           "Pyridine holds the chloride as a salt. The product is the sulfonate ester, not a chloride.")],
         [ots], "ret",
         "Making the tosylate keeps the configuration; the inversion comes later, when a nucleophile displaces it.",
         prov("Rule T: the C-O bond is kept, so RDKit's stereo tag on carbon is carried unchanged", ROH),
         lead(s, "(R)-butan-2-ol", "(R)-butan-2-ol + TsCl, pyridine"), concepts=LG)

    c, o = tosylate_atoms(ots)
    cn_inv, cn_ret = sn2_3d(ots, c, o, "C#N"), sn2_3d(ots, c, o, "C#N", invert=False)
    pick(node, "u5-ts-cyanide", "(R)-Butan-2-yl tosylate meets NaCN in DMSO. Pick the product.",
         [("inv", cn_inv, "(2S)-2-methylbutanenitrile", "(S)-2-Methylbutanenitrile",
           "Cyanide attacks behind the C-OTs bond and tosylate leaves: SN2 at a secondary carbon, with inversion."),
          ("ret", cn_ret, "(2R)-2-methylbutanenitrile", "(R)-2-Methylbutanenitrile",
           "That keeps the configuration, which needs a front side attack. The backside is the only open path in SN2."),
          ("ene", "CC=CC", "but-2-ene", "But-2-ene",
           "Cyanide is a good nucleophile and a weak base, and DMSO speeds SN2, so substitution wins.")],
         [cn_inv], "inv",
         "Tosylate is the leaving group the alcohol could not be. The displacement is a clean SN2 with inversion.",
         prov("Rule S: CN placed behind the leaving O on a 3D conformer, configuration read back by RDKit", ROH,
              "cyanide in DMSO substitutes rather than eliminates at a secondary carbon"),
         lead(ots, "(2R)-butan-2-yl 4-methylbenzenesulfonate", "(R)-butan-2-yl tosylate + NaCN"), concepts=LG)

    br_inv = sn2_3d(ots, c, o, "Br")
    pick(node, "u5-ts-two-step", "(R)-Butan-2-ol: TsCl and pyridine, then NaBr. Pick the product.",
         [("inv", br_inv, "(S)-2-bromobutane", "(S)-2-Bromobutane",
           "Step one keeps R (only O-H reacts). Step two is SN2 at carbon, which inverts it."),
          ("ret", sn2_3d(ots, c, o, "Br", invert=False), "(R)-2-bromobutane", "(R)-2-Bromobutane",
           "One inversion happens, in the bromide step. Retention would need both steps to keep or both to invert."),
          ("ots", ots, "(2R)-butan-2-yl 4-methylbenzenesulfonate", "The tosylate, unchanged",
           "Bromide is a good nucleophile and tosylate a very good leaving group. The second step goes.")],
         [br_inv], "inv",
         "Count inversions step by step: tosylation keeps, SN2 inverts. Net: one inversion.",
         prov("Rule T then Rule S, each built on a 3D conformer", ROH),
         lead(S["r2butanol"], "(R)-butan-2-ol", "(R)-butan-2-ol, then TsCl, then NaBr"), level=2, concepts=LG)

    s = S["butanol"]
    _, o = the_oh(s)
    prod = mol(tosylate(s))
    kept_co = prod.HasSubstructMatch(Chem.MolFromSmarts("[CH2][OX2][SX4]"))
    lost_oh = not prod.HasSubstructMatch(Chem.MolFromSmarts("[OX2H]"))
    derived = "oh" if kept_co and lost_oh else None
    mcq(node, "u5-ts-bond", "In making a tosylate from an alcohol, pick the bond that breaks.",
        [("oh", "The O-H bond", "The alcohol's H leaves (taken by pyridine) and O bonds to S. Carbon keeps its O, which is why its configuration survives."),
         ("co", "The C-O bond", "If C-O broke, carbon would lose its oxygen, and the product would not be an O-tosyl compound at all."),
         ("ch", "A C-H bond", "No C-H bond takes part. Only the oxygen's H is acidic enough for pyridine to remove.")],
        derived, "oh",
        "Tosylation is an O-H reaction. Carbon is untouched until a nucleophile arrives later.",
        prov("graph comparison: product keeps the C-O bond and has no O-H", ROH),
        lead(ots, "(2R)-butan-2-yl 4-methylbenzenesulfonate", "a tosylate"), concepts=LG)

    s = S["cyhexol"]
    oms = tosylate(s, "S(=O)(=O)C")
    pick(node, "u5-ts-mesyl", "Cyclohexanol meets MsCl with Et₃N. Pick the product.",
         [("oms", oms, "cyclohexyl methanesulfonate", "Cyclohexyl mesylate",
           "MsCl works like TsCl: the alcohol's O bonds to S, Et₃N takes the H and the HCl."),
          ("cl", "ClC1CCCCC1", "chlorocyclohexane", "Chlorocyclohexane",
           "The chloride ends up as Et₃NH⁺Cl⁻. The new group sits on oxygen."),
          ("ene", "C1=CCCCC1", "cyclohexene", "Cyclohexene",
           "Et₃N only takes the O-H proton here. Elimination needs a later, stronger push.")],
         [oms], "oms",
         "Mesylate and tosylate do the same job: turn OH into a leaving group without touching carbon.",
         prov("Rule T with a methanesulfonyl group", ROH),
         lead(s, "cyclohexanol", "cyclohexanol + MsCl, Et₃N"), concepts=LG)


# ---------------------------------------------------------------------------
# u5-dehydration
# ---------------------------------------------------------------------------

def node_dehydration() -> None:
    node = "u5-dehydration"
    s = S["cyhexol"]
    c, o = the_oh(s)
    pick(node, "u5-dh-meet", "Cyclohexanol is heated with H₂SO₄. Pick the product.",
         [("ene", zaitsev(e1(s, c, o)) or "C", "cyclohexene", "Cyclohexene",
           "Acid turns OH into water, water leaves, and the cation loses a neighbouring H to make the C=C."),
          ("one", "O=C1CCCCC1", "cyclohexanone", "Cyclohexanone",
           "That is an oxidation. Sulfuric acid removes water; it does not remove H₂ from the C-O carbon."),
          ("ether", "C1CCC(CC1)OC1CCCCC1", "(cyclohexyloxy)cyclohexane", "Dicyclohexyl ether",
           "Ethers form at lower temperature. With heat, loss of water to the alkene wins.")],
         e1(s, c, o), "ene",
         "Dehydration removes H from one carbon and OH from the next: an alkene and water.",
         prov("Rule C then E1: every beta H loss enumerated, one product", ROH,
              "heat favours the alkene over the ether"),
         lead(s, "cyclohexanol", "cyclohexanol, H₂SO₄, heat"), level=0, concepts=REARR)

    s = S["2mb2ol"]
    c, o = the_oh(s)
    pick(node, "u5-dh-zaitsev", "2-Methylbutan-2-ol is heated with H₂SO₄. Pick the major alkene.",
         [("tri", "CC=C(C)C", "2-methylbut-2-ene", "2-Methylbut-2-ene",
           "Three carbons on the C=C. The more substituted alkene is the more stable one, so it is the major product."),
          ("di", "C=C(C)CC", "2-methylbut-1-ene", "2-Methylbut-1-ene",
           "This forms too, but its C=C carries only two carbons. It is the minor product."),
          ("shift", "C=CC(C)C", "3-methylbut-1-ene", "3-Methylbut-1-ene",
           "That would need a C=C away from the cation carbon. The double bond forms at the cation.")],
         [zaitsev(e1(s, c, o))] if zaitsev(e1(s, c, o)) else None, "tri",
         "From the cation, lose the H that gives the most substituted alkene.",
         prov("E1 products enumerated, ranked by carbons on the C=C", ROH, "Zaitsev: the most substituted alkene is major"),
         lead(s, "2-methylbutan-2-ol", "2-methylbutan-2-ol, H₂SO₄, heat"), concepts=REARR)

    s = S["1mecyhexol"]
    c, o = the_oh(s)
    pick(node, "u5-dh-ring", "1-Methylcyclohexan-1-ol is heated with H₃PO₄. Pick the major alkene.",
         [("endo", "CC1=CCCCC1", "1-methylcyclohex-1-ene", "1-Methylcyclohexene",
           "The C=C inside the ring carries three carbons. That beats the two-carbon exocyclic alkene."),
          ("exo", "C=C1CCCCC1", "methylidenecyclohexane", "Methylenecyclohexane",
           "Losing an H from the methyl gives a C=C with only two carbons on it. Minor."),
          ("far", "CC1CC=CCC1", "4-methylcyclohex-1-ene", "4-Methylcyclohexene",
           "The double bond has to start at the cation carbon, C1. This one is three carbons away.")],
         [zaitsev(e1(s, c, o))] if zaitsev(e1(s, c, o)) else None, "endo",
         "Count carbons on each possible C=C: the most substituted one is major.",
         prov("E1 products enumerated, ranked by carbons on the C=C", ROH, "Zaitsev: the most substituted alkene is major"),
         lead(s, "1-methylcyclohexan-1-ol", "1-methylcyclohexanol, H₃PO₄, heat"), concepts=REARR)

    s = S["33dmb2ol"]
    c, o = the_oh(s)
    pick(node, "u5-dh-shift", "3,3-Dimethylbutan-2-ol is heated with H₂SO₄. Pick the major alkene.",
         [("tetra", "CC(C)=C(C)C", "2,3-dimethylbut-2-ene", "2,3-Dimethylbut-2-ene",
           "The secondary cation sits next to a carbon with three methyls. A methyl shift makes it tertiary, then the most substituted C=C forms."),
          ("plain", "C=CC(C)(C)C", "3,3-dimethylbut-1-ene", "3,3-Dimethylbut-1-ene",
           "That alkene comes from the unshifted cation. A methyl shift that turns secondary into tertiary happens first."),
          ("hof", "C=C(C)C(C)C", "2,3-dimethylbut-1-ene", "2,3-Dimethylbut-1-ene",
           "Right skeleton after the shift, but its C=C carries two carbons. The four-carbon alkene is major.")],
         [zaitsev(e1(s, c, o))] if zaitsev(e1(s, c, o)) else None, "tetra",
         "In acid, rearrange first, then eliminate toward the most substituted alkene.",
         prov("Rule C: methyl shift to the tertiary carbon, then E1 products ranked", ROH, "Zaitsev: the most substituted alkene is major"),
         lead(s, "3,3-dimethylbutan-2-ol", "3,3-dimethylbutan-2-ol, H₂SO₄, heat"), level=2, concepts=REARR)

    pick(node, "u5-dh-pocl3", "3,3-Dimethylbutan-2-ol meets POCl₃ in pyridine. Pick the product.",
         [("plain", "C=CC(C)(C)C", "3,3-dimethylbut-1-ene", "3,3-Dimethylbut-1-ene",
           "POCl₃ makes the OH a leaving group and pyridine removes a beta H in one step. No cation, no shift, and only the CH₃ side has an H."),
          ("tetra", "CC(C)=C(C)C", "2,3-dimethylbut-2-ene", "2,3-Dimethylbut-2-ene",
           "That needs the methyl shift, and a shift needs a cation. The POCl₃ route has none."),
          ("hof", "C=C(C)C(C)C", "2,3-dimethylbut-1-ene", "2,3-Dimethylbut-1-ene",
           "Also a shifted skeleton. Without a cation the carbons stay where they are.")],
         e1(s, c, o, allow_shift=False), "plain",
         "POCl₃ with pyridine is the E2 route: no cation, so no rearrangement.",
         prov("E2 with no cation: beta H loss enumerated from the unshifted carbon", ROH),
         lead(s, "3,3-dimethylbutan-2-ol", "3,3-dimethylbutan-2-ol, POCl₃, pyridine"), level=2, concepts=REARR)

    cands = {"tert": S["tbuoh"], "sec": "CCC(C)O", "prim": S["butanol"]}
    fastest = max(cands, key=lambda k: alcohol_class(cands[k]))
    pick(node, "u5-dh-rate", "With hot H₂SO₄, pick the alcohol that dehydrates fastest.",
         [("tert", cands["tert"], "2-methylpropan-2-ol", "2-Methylpropan-2-ol",
           "Its cation is tertiary, the most stabilised by neighbouring carbons. The slow step, losing water, is easiest here."),
          ("sec", cands["sec"], "butan-2-ol", "Butan-2-ol",
           "A secondary cation forms, but more slowly than a tertiary one."),
          ("prim", cands["prim"], "butan-1-ol", "Butan-1-ol",
           "A primary cation is too unstable to form freely. This one needs the harshest conditions.")],
         [cands[fastest]], "tert",
         "E1 rate follows the cation: tertiary faster than secondary faster than primary.",
         prov("alcohol class counted as carbon neighbours of the C-OH carbon", ROH,
              "E1 rate follows cation substitution"),
         lead("CCC(C)O", "butan-2-ol", "three alcohols, H₂SO₄"), concepts=REARR)

    s = S["2mecyhexol"]
    c, o = the_oh(s)
    pick(node, "u5-dh-hshift", "2-Methylcyclohexan-1-ol is heated with H₂SO₄. Pick the major alkene.",
         [("tri", "CC1=CCCCC1", "1-methylcyclohex-1-ene", "1-Methylcyclohexene",
           "Whether or not the hydride shifts to make the tertiary cation, the best C=C to form carries three carbons."),
          ("di", "CC1CCCC=C1", "3-methylcyclohex-1-ene", "3-Methylcyclohexene",
           "This alkene forms by losing the H on the other side. Its C=C has only two carbons."),
          ("exo", "C=C1CCCCC1", "methylidenecyclohexane", "Methylenecyclohexane",
           "Only possible from the shifted cation via the methyl H, and its C=C has two carbons. Minor.")],
         [zaitsev(e1(s, c, o))] if zaitsev(e1(s, c, o)) else None, "tri",
         "The cation can move to the tertiary carbon, and the trisubstituted alkene is major either way.",
         prov("Rule C: hydride shift to the tertiary carbon, E1 products ranked", ROH, "Zaitsev: the most substituted alkene is major"),
         lead(s, "2-methylcyclohexan-1-ol", "2-methylcyclohexanol, H₂SO₄, heat"), level=2, concepts=REARR)


# ---------------------------------------------------------------------------
# u5-oxidation
# ---------------------------------------------------------------------------

def node_oxidation() -> None:
    node = "u5-oxidation"
    s = S["propanol"]
    pick(node, "u5-ox-meet", "Propan-1-ol meets PCC in CH₂Cl₂. Pick the product.",
         [("ald", "CCC=O", "propanal", "Propanal",
           "PCC removes two H (one from O, one from the C-O carbon) and stops. With no water, the aldehyde is not oxidised further."),
          ("acid", "CCC(=O)O", "propanoic acid", "Propanoic acid",
           "Going on to the acid needs water to make the hydrate. PCC is used dry, so it stops at the aldehyde."),
          ("ene", "C=CC", "prop-1-ene", "Propene",
           "That is a dehydration. PCC is an oxidant: it removes H₂, not H₂O.")],
         no_rxn(s, oxidize(s, strong=False)), "ald",
         "A primary alcohol goes one level up with PCC: to the aldehyde.",
         prov("Rule O: one level for a mild oxidant", OXI),
         lead(s, "propan-1-ol", "propan-1-ol + PCC"), level=0, concepts=OXL)

    s = S["butanol"]
    pick(node, "u5-ox-jones", "Butan-1-ol meets Jones reagent (CrO₃, H₂SO₄, water). Pick the product.",
         [("acid", "CCCC(=O)O", "butanoic acid", "Butanoic acid",
           "In water the aldehyde forms its hydrate, a new C-OH that is oxidised again. Two levels: alcohol to acid."),
          ("ald", "CCCC=O", "butanal", "Butanal",
           "That is where PCC stops. Jones runs in water, so the aldehyde keeps going."),
          ("ket", "CCC(C)=O", "butan-2-one", "Butan-2-one",
           "A ketone needs the OH on an inner carbon. Here it is on C1.")],
         no_rxn(s, oxidize(s, strong=True)), "acid",
         "Strong, aqueous oxidants take a primary alcohol all the way to the carboxylic acid.",
         prov("Rule O: a strong oxidant goes on to the acid", OXI),
         lead(s, "butan-1-ol", "butan-1-ol + Jones reagent"), concepts=OXL)

    s = "CCC(C)O"
    pick(node, "u5-ox-sec", "Butan-2-ol meets PCC. Pick the product.",
         [("ket", "CCC(C)=O", "butan-2-one", "Butan-2-one",
           "A secondary alcohol has one H on its C-OH carbon. Removing it with the O-H gives the ketone."),
          ("ald", "CCCC=O", "butanal", "Butanal",
           "An aldehyde needs the oxygen on an end carbon. Oxidation never moves the oxygen."),
          ("acid", "CCC(C)C(=O)O", "2-methylbutanoic acid", "2-Methylbutanoic acid",
           "That adds a carbon. Oxidants only change bonds to O and H on the carbon that already has the O.")],
         no_rxn(s, oxidize(s, strong=False)), "ket",
         "Secondary alcohols become ketones, and a ketone has no C-H left to oxidise.",
         prov("Rule O: one level for a secondary alcohol", OXI),
         lead(s, "butan-2-ol", "butan-2-ol + PCC"), concepts=OXL)

    s = S["tbuoh"]
    pick(node, "u5-ox-tert", "2-Methylpropan-2-ol meets Jones reagent. Pick what happens.",
         [("none", s, "2-methylpropan-2-ol", "No reaction",
           "The C-OH carbon has no H to lose. Breaking a C-C bond is beyond these conditions."),
          ("ald", "CC(C)C=O", "2-methylpropanal", "2-Methylpropanal",
           "That moves the oxygen to another carbon. Oxidation works on the carbon that holds the O."),
          ("acid", "CC(C)C(=O)O", "2-methylpropanoic acid", "2-Methylpropanoic acid",
           "Going to an acid needs two C-H bonds on the C-OH carbon. A tertiary alcohol has none.")],
         no_rxn(s, oxidize(s, strong=True)), "none",
         "No C-H on the carbinol carbon, no oxidation.",
         prov("Rule O: the C-OH carbon has no H, nothing is oxidised", OXI),
         lead(s, "2-methylpropan-2-ol", "2-methylpropan-2-ol + Jones reagent"), concepts=OXL)

    s = S["cyhexmeoh"]
    pick(node, "u5-ox-pcc-ring", "Cyclohexylmethanol meets PCC. Pick the product.",
         [("ald", "O=CC1CCCCC1", "cyclohexanecarbaldehyde", "Cyclohexanecarbaldehyde",
           "The OH is on a CH₂, so this is a primary alcohol. PCC takes it one level, to the aldehyde."),
          ("acid", "OC(=O)C1CCCCC1", "cyclohexanecarboxylic acid", "Cyclohexanecarboxylic acid",
           "That is the Jones product. PCC has no water to make the hydrate."),
          ("ket", "O=C1CCCCC1", "cyclohexanone", "Cyclohexanone",
           "That drops the CH₂ carbon. Oxidation keeps every carbon.")],
         no_rxn(s, oxidize(s, strong=False)), "ald",
         "Classify by the carbon holding OH, not by the ring: CH₂OH is primary.",
         prov("Rule O: one level for a mild oxidant", OXI),
         lead(s, "cyclohexylmethanol", "cyclohexylmethanol + PCC"), concepts=OXL)

    cands = {"sec": S["cyhexol"], "prim": S["cyhexmeoh"], "tert": S["1mecyhexol"]}
    ketone = [k for k, v in cands.items() if oxidize(v, strong=True) and mol(oxidize(v, True)[0]).HasSubstructMatch(Chem.MolFromSmarts("[#6][CX3](=O)[#6]"))]
    pick(node, "u5-ox-which-ketone", "Jones reagent turns only one of these into a ketone. Pick it.",
         [("sec", cands["sec"], "cyclohexanol", "Cyclohexanol",
           "Secondary: one H on the C-OH carbon. It becomes cyclohexanone and stops there."),
          ("prim", cands["prim"], "cyclohexylmethanol", "Cyclohexylmethanol",
           "Primary: Jones takes it past the aldehyde to the carboxylic acid."),
          ("tert", cands["tert"], "1-methylcyclohexan-1-ol", "1-Methylcyclohexanol",
           "Tertiary: no H on the C-OH carbon, so no reaction.")],
         [cands[ketone[0]]] if len(ketone) == 1 else None, "sec",
         "Ketones come from secondary alcohols, whatever the oxidant.",
         prov("Rule O applied to each alcohol, product class read by SMARTS", OXI),
         lead(S["cyhexol"], "cyclohexanol", "three alcohols + Jones reagent"), concepts=OXL)


# ---------------------------------------------------------------------------
# u5-williamson
# ---------------------------------------------------------------------------

def node_williamson() -> None:
    node = "u5-williamson"
    prod = swap("CI", 0, 1, "OCC")
    pick(node, "u5-wl-meet", "Sodium ethoxide meets iodomethane. Pick the product.",
         [("ether", prod, "methoxyethane", "Methoxyethane",
           "Ethoxide's O attacks the CH₃ carbon from behind and iodide leaves: SN2 makes the C-O-C bond."),
          ("diethyl", "CCOCC", "ethoxyethane", "Ethoxyethane",
           "Each partner brings one carbon group. Ethoxide gives the ethyl; iodomethane gives the methyl."),
          ("ene", "C=C", "ethene", "Ethene",
           "Iodomethane has no carbon next door to lose an H from, so it cannot eliminate.")],
         [prod], "ether",
         "Williamson: alkoxide plus methyl or primary halide, SN2, an ether.",
         prov("Rule W: alkoxide O onto the halide carbon", ETH),
         lead("CC[O-].[Na+]", "sodium ethoxide", "sodium ethoxide + CH₃I"), level=0, concepts=DEPROT)

    pairs = {"good": ("CC(C)(C)[O-]", "CI"), "bad": ("C[O-]", "CC(C)(C)Br"), "none": ("CO", "CC(C)(C)O")}
    ok = [k for k, (alk, hal) in pairs.items() if k != "none" and williamson_ok(alk, hal)]
    mcq(node, "u5-wl-pair", "Pick the best pair to make 2-methoxy-2-methylpropane.",
        [("good", "(CH₃)₃CO⁻ with CH₃I", "The halide carbon is a methyl, the best SN2 target. The bulky part rides on the alkoxide, where bulk does no harm."),
         ("bad", "CH₃O⁻ with (CH₃)₃CBr", "A tertiary halide cannot be attacked from behind. Methoxide acts as a base and makes 2-methylpropene."),
         ("none", "CH₃OH with (CH₃)₃COH", "Two neutral alcohols: neither has a leaving group, and neither is an alkoxide.")],
        ok[0] if len(ok) == 1 else None, "good",
        "Put the crowded group on the oxygen and the methyl or primary carbon on the halide.",
        prov("Rule W tested on each disconnection: the halide carbon must be methyl or primary sp3", ETH),
        lead("COC(C)(C)C", "2-methoxy-2-methylpropane", "the target ether"), concepts=DEPROT)

    s = "CC(C)(C)Br"
    c, x = match_one(s, "[CX4]Br")
    ene = e1(s, c, x, allow_shift=False)
    pick(node, "u5-wl-e2", "Sodium methoxide meets 2-bromo-2-methylpropane. Pick the main product.",
         [("ene", ene[0] if ene else "C", "2-methylprop-1-ene", "2-Methylpropene",
           "Three methyls block the back of the C-Br carbon. Methoxide takes a beta H instead: E2."),
          ("ether", "COC(C)(C)C", "2-methoxy-2-methylpropane", "2-Methoxy-2-methylpropane",
           "That ether needs backside attack at a tertiary carbon, which is too crowded."),
          ("alc", "CC(C)(C)O", "2-methylpropan-2-ol", "2-Methylpropan-2-ol",
           "There is no water or hydroxide here to supply the OH.")],
         ene if not williamson_ok("C[O-]", s) else None, "ene",
         "Alkoxide plus tertiary halide is an elimination, not a Williamson synthesis.",
         prov("Rule W fails (tertiary halide carbon); E2 products enumerated", ETH,
              "a tertiary halide with an alkoxide eliminates"),
         lead(s, "2-bromo-2-methylpropane", "2-bromo-2-methylpropane + NaOCH₃"), concepts=DEPROT)

    s = "OCCCCBr"
    m = mol(s)
    o = match_one(s, "[OX2H]")[0]
    c, x = match_one(s, "[CX4]Br")
    rw = fixed(m)
    set_h(rw, o, -1)
    rw.RemoveBond(c, x)
    rw.AddBond(o, c, Chem.BondType.SINGLE)
    rw = drop_fragment(rw, o)
    ring = finish(rw)
    pick(node, "u5-wl-ring", "4-Bromobutan-1-ol meets NaH. Pick the product.",
         [("thf", ring, "oxolane", "Oxolane (THF)",
           "NaH removes the O-H proton. The alkoxide reaches back to the C-Br carbon of its own chain and closes a five-membered ring."),
          ("ene", "C=CCCO", "but-3-en-1-ol", "But-3-en-1-ol",
           "The C-Br carbon is primary, which favours SN2, and a five-membered ring closes fast."),
          ("ald", "O=CCCCBr", "4-bromobutanal", "4-Bromobutanal",
           "NaH is a base, not an oxidant. It takes H⁺ from O and nothing else.")],
         [ring], "thf",
         "A Williamson can happen inside one molecule. Count atoms to see the ring size.",
         prov("Rule W applied intramolecularly: O-H off, O bonded to the C-Br carbon", ETH,
              "a five-membered ring closes faster than the molecule finds a partner"),
         lead(s, "4-bromobutan-1-ol", "4-bromobutan-1-ol + NaH"), level=2, concepts=DEPROT)

    pairs = {"good": ("[O-]c1ccccc1", "CI"), "aryl": ("C[O-]", "Brc1ccccc1")}
    ok = [k for k, (alk, hal) in pairs.items() if williamson_ok(alk, hal)]
    mcq(node, "u5-wl-aryl", "Pick the pair that makes methoxybenzene.",
        [("good", "PhO⁻ with CH₃I", "Phenoxide's O attacks the methyl carbon. Methyl is the ideal SN2 partner."),
         ("aryl", "CH₃O⁻ with PhBr", "Bromobenzene's C-Br carbon is sp² and inside the ring, so nothing can attack it from behind."),
         ("none", "PhOH with CH₃OH", "Neither partner has a leaving group, and no alkoxide is made.")],
        ok[0] if len(ok) == 1 else None, "good",
        "The aryl group must sit on the oxygen. An aryl halide does not do SN2.",
        prov("Rule W: the halide carbon must be sp3 methyl or primary; aromatic carbon fails", ETH),
        lead("COc1ccccc1", "methoxybenzene", "the target ether"), concepts=DEPROT)

    s = S["r2butanol"]
    eth = o_alkylate(s, "C")
    pick(node, "u5-wl-retain", "(R)-Butan-2-ol: NaH, then CH₃I. Pick the product.",
         [("ret", eth, "(2R)-2-methoxybutane", "(R)-2-Methoxybutane",
           "The new bond is O-CH₃. The stereocentre's C-O bond is never broken, so R stays R."),
          ("inv", mirror(eth), "(2S)-2-methoxybutane", "(S)-2-Methoxybutane",
           "The inversion, if any, happens at the carbon attacked: the CH₃ of iodomethane, which is not a stereocentre."),
          ("ene", "CC=CC", "but-2-ene", "But-2-ene",
           "Iodomethane cannot eliminate, and the alkoxide attacks it cleanly.")],
         [eth], "ret",
         "In a Williamson the alcohol's carbon keeps its configuration; the halide carbon is the one attacked.",
         prov("Rule W: O-H becomes O-CH3, the stereocentre's bonds are untouched", ETH),
         lead(s, "(R)-butan-2-ol", "(R)-butan-2-ol, NaH, then CH₃I"), concepts=DEPROT)


# ---------------------------------------------------------------------------
# u5-protecting
# ---------------------------------------------------------------------------

TBS = "[SiH](C)(C)C(C)(C)C"


def node_protecting() -> None:
    node = "u5-protecting"
    s = S["butanol"]
    tbs = o_alkylate(s, TBS)
    pick(node, "u5-pg-meet", "Butan-1-ol meets TBSCl with imidazole. Pick the product.",
         [("tbs", tbs, "butoxy(tert-butyl)dimethylsilane", "The TBS ether",
           "The alcohol's O bonds to silicon and chloride leaves Si. The OH is now masked as O-Si."),
          ("cl", "CCCCCl", "1-chlorobutane", "1-Chlorobutane",
           "Chloride leaves silicon and ends up with imidazole as a salt. Carbon is not touched."),
          ("none", s, "butan-1-ol", "No reaction",
           "Imidazole helps the O attack silicon, and the Si-O bond is strong. The reaction goes.")],
         [tbs], "tbs",
         "Silyl protection: O-H becomes O-SiR₃, ready to survive bases and Grignards.",
         prov("Rule P: O-H becomes O-Si, the C-O bond is kept", PROT),
         lead(s, "butan-1-ol", "butan-1-ol + TBSCl, imidazole"), level=0, concepts=PROTECT)

    pick(node, "u5-pg-tbaf", "The TBS ether of butan-1-ol meets TBAF. Pick the organic product.",
         [("oh", silyl_off(tbs), "butan-1-ol", "Butan-1-ol",
           "Fluoride attacks silicon and the Si-O bond breaks. The alcohol comes back unchanged."),
          ("f", "CCCCF", "1-fluorobutane", "1-Fluorobutane",
           "Fluoride goes to silicon, not to carbon. The C-O bond is never touched."),
          ("same", tbs, "butoxy(tert-butyl)dimethylsilane", "The TBS ether, unchanged",
           "TBAF is the standard way off: the Si-F bond formed is stronger than the Si-O bond lost.")],
         [silyl_off(tbs)], "oh",
         "TBAF removes silyl groups and nothing else.",
         prov("Rule P: TBAF cuts Si-O only", PROT, "fluoride removes silyl ethers selectively"),
         lead(tbs, "butoxy(tert-butyl)dimethylsilane", "the TBS ether + TBAF"), concepts=PROTECT)

    s = "OCCCCBr"
    protic = mol(s).HasSubstructMatch(Chem.MolFromSmarts("[O,N;!H0]"))
    mcq(node, "u5-pg-why", "You want a Grignard from 4-bromobutan-1-ol. Pick what to mask first.",
        [("oh", "The OH group", "A Grignard is a strong base. Formed next to an O-H, it takes that proton and destroys itself."),
         ("br", "The C-Br bond", "C-Br is where magnesium inserts. Masking it would stop the Grignard forming at all."),
         ("none", "Nothing, it works as drawn", "The O-H proton is far more acidic than the Grignard's conjugate acid, so it quenches the reagent.")],
        "oh" if protic else None, "oh",
        "Any O-H or N-H in the molecule must be protected before a Grignard or organolithium is made.",
        prov("protic H found by SMARTS on O or N", PROT, "a Grignard is destroyed by any O-H or N-H in the same molecule"),
        lead(s, "4-bromobutan-1-ol", "4-bromobutan-1-ol, then Mg"), concepts=PROTECT)

    s = S["cyhexol"]
    bn = o_alkylate(s, "Cc1ccccc1")
    pick(node, "u5-pg-benzyl", "Cyclohexanol: NaH, then benzyl bromide. Pick the product.",
         [("bn", bn, "(benzyloxy)cyclohexane", "Benzyl cyclohexyl ether",
           "NaH makes the alkoxide, which attacks the benzylic CH₂ by SN2. A Williamson that installs a protecting group."),
          ("br", "BrC1CCCCC1", "bromocyclohexane", "Bromocyclohexane",
           "Bromide is the leaving group. It stays off carbon in this step."),
          ("cbn", "OC1(Cc2ccccc2)CCCCC1", "1-benzylcyclohexan-1-ol", "1-Benzylcyclohexanol",
           "The nucleophile is the oxygen, so the benzyl group ends up on O, not on the ring carbon.")],
         [bn], "bn",
         "Benzyl ethers form by Williamson and survive acids, bases and most oxidants.",
         prov("Rule W: alkoxide O onto the benzylic CH2", PROT),
         lead(s, "cyclohexanol", "cyclohexanol, NaH, then BnBr"), concepts=PROTECT)

    pieces = benzyl_off(bn)
    pick(node, "u5-pg-h2", "Benzyl cyclohexyl ether meets H₂ with Pd/C. Pick the alcohol released.",
         [("oh", S["cyhexol"], "cyclohexanol", "Cyclohexanol",
           "H₂ on Pd cuts the benzylic C-O bond. The cyclohexyl side keeps its O and gets the H; the benzyl side leaves as toluene."),
          ("bnoh", "OCc1ccccc1", "phenylmethanol", "Benzyl alcohol",
           "That would cut the other C-O bond. Hydrogenolysis breaks the bond to the benzylic carbon."),
          ("ring", "C1CCC(CC1)COC1CCCCC1", "(cyclohexylmethoxy)cyclohexane", "Ring reduced, ether kept",
           "Pd/C with H₂ at room conditions cleaves the benzylic C-O bond long before it reduces a benzene ring.")],
         pieces, "oh",
         "Benzyl comes off by hydrogenolysis: alcohol plus toluene.",
         prov("Rule P: the O-CH2Ph bond is cut, H onto both ends", PROT, "H2, Pd/C cleaves benzylic C-O before reducing the ring"),
         lead(bn, "(benzyloxy)cyclohexane", "the benzyl ether + H₂, Pd/C"), concepts=PROTECT)

    both = o_alkylate("OCCCCOCc1ccccc1", TBS)
    off = silyl_off(both)
    pick(node, "u5-pg-orthogonal", "This molecule carries a TBS ether and a benzyl ether. Add TBAF. Pick the product.",
         [("tbs", off, "4-(benzyloxy)butan-1-ol", "Benzyl kept, TBS removed",
           "TBAF attacks only silicon. The benzyl ether has no silicon, so it survives."),
          ("both", "OCCCCO", "butane-1,4-diol", "Both groups removed",
           "Each group has its own key. TBAF does not unlock a benzyl ether; H₂ on Pd does."),
          ("bn", "OCCCCO" + TBS.replace("[SiH]", "[Si]"), "4-[(tert-butyldimethylsilyl)oxy]butan-1-ol", "TBS kept, benzyl removed",
           "That is the H₂ on Pd result. Fluoride cannot cut a C-O bond.")],
         [off], "tbs",
         "Orthogonal groups come off one at a time, each with its own reagent.",
         prov("Rule P: TBAF cuts Si-O only", PROT, "fluoride removes silyl ethers and leaves benzyl ethers"),
         lead(both, "tert-butyl[4-(benzyloxy)butoxy]dimethylsilane", "TBS and benzyl ethers + TBAF"), level=2, concepts=PROTECT)

    thp = thp_ether(S["butanol"])
    pick(node, "u5-pg-thp", "Butan-1-ol meets dihydropyran with a trace of acid. Pick the product.",
         [("c2", thp, "2-butoxyoxane", "2-Butoxyoxane (THP ether)",
           "Acid protonates the C=C so the cation sits next to the ring O, where O can share its lone pair. The alcohol bonds there."),
          ("c3", "CCCCOC1CCCOC1", "3-butoxyoxane", "3-Butoxyoxane",
           "A cation on that carbon gets no help from the ring oxygen, so it does not form."),
          ("none", S["butanol"], "butan-1-ol", "No reaction",
           "A trace of acid is all it takes: the oxygen-stabilised cation forms easily.")],
         [thp], "c2",
         "A THP ether is an acetal: the alcohol bonds to the carbon beside the ring O.",
         prov("Rule P: alcohol O onto the C=C carbon bonded to ring O, H onto the other", PROT,
              "the cation forms on the carbon next to the ring oxygen"),
         lead("C1=COCCC1", "3,4-dihydro-2H-pyran", "butan-1-ol + dihydropyran, H⁺"), concepts=PROTECT)


# ---------------------------------------------------------------------------
# u5-epoxidation
# ---------------------------------------------------------------------------

def node_epoxidation() -> None:
    node = "u5-epoxidation"
    s = S["cyhexene"]
    ep = add_across(s, "epoxide")
    pick(node, "u5-ep-meet", "Cyclohexene meets mCPBA. Pick the product.",
         [("ep", ep[0], "(1R,6S)-7-oxabicyclo[4.1.0]heptane", "Cyclohexene oxide",
           "The peracid hands one O to both alkene carbons at once, from one face. A three-membered C-O-C ring forms."),
          ("diol", add_across(s, "anti")[0], "(1R,2R)-cyclohexane-1,2-diol", "trans-Cyclohexane-1,2-diol",
           "The diol needs a second step: aqueous acid to open the epoxide. mCPBA alone stops at the epoxide."),
          ("one", "O=C1CCCCC1", "cyclohexanone", "Cyclohexanone",
           "One oxygen goes across the C=C, bonded to both carbons. No C=O forms.")],
         ep, "ep",
         "A peracid turns a C=C into an epoxide in one step.",
         prov("O placed on one face of the C=C in 3D, both faces run, configuration read back", ALK),
         lead(s, "cyclohexene", "cyclohexene + mCPBA"), level=0, concepts=SYN)

    z, e = add_across(S["zbut"], "epoxide"), add_across(S["ebut"], "epoxide")
    pick(node, "u5-ep-cis", "(Z)-But-2-ene meets mCPBA. Pick the product.",
         [("cis", z[0], "(2R,3S)-2,3-dimethyloxirane", "cis-2,3-Dimethyloxirane",
           "Both C-O bonds form at once on the same face, so the two methyls that were cis stay cis. It is meso."),
          ("trans", e[0], cip_name(e[0], "2,3-dimethyloxirane", ("2", "3")), "trans-2,3-Dimethyloxirane",
           "Trans methyls would need rotation about the C-C bond mid reaction. A concerted addition gives no time to rotate."),
          ("ethyl", "CCC1CO1", "2-ethyloxirane", "2-Ethyloxirane",
           "The O bridges the two carbons of the original C=C, C2 and C3. The skeleton does not change.")],
         z, "cis",
         "Epoxidation is stereospecific: cis alkene, cis epoxide.",
         prov("O placed on each face of the (Z) alkene in 3D; meso read back by comparing mirror images", ALK),
         lead(S["zbut"], "(Z)-but-2-ene", "(Z)-but-2-ene + mCPBA"), concepts=SYN)

    pick(node, "u5-ep-trans", "(E)-But-2-ene meets mCPBA. Pick the product (it forms with its mirror image).",
         [("trans", e[0], cip_name(e[0], "2,3-dimethyloxirane", ("2", "3")), "trans-2,3-Dimethyloxirane",
           "Trans methyls stay trans. Attack on either face gives one of the two mirror images, so the product is racemic."),
          ("cis", z[0], "(2R,3S)-2,3-dimethyloxirane", "cis-2,3-Dimethyloxirane",
           "Cis would mean the methyls swapped sides, which a one-step addition cannot do."),
          ("one", "CCC(C)=O", "butan-2-one", "Butan-2-one",
           "That is a rearranged, oxidised product. A peracid simply adds O across the C=C.")],
         e, "trans",
         "Trans in, trans out, as a pair of enantiomers.",
         prov("O placed on each face of the (E) alkene in 3D; two enantiomers read back", ALK),
         lead(S["ebut"], "(E)-but-2-ene", "(E)-but-2-ene + mCPBA"), concepts=SYN)

    s = S["mecyhexene"]
    ep = add_across(s, "epoxide")
    pick(node, "u5-ep-methyl", "1-Methylcyclohexene meets mCPBA. Pick the product (shown as one enantiomer).",
         [("ep", ep[0], cip_name(ep[0], "1-methyl-7-oxabicyclo[4.1.0]heptane", ("1", "6")), "1-Methylcyclohexene oxide",
           "O bridges C1 and C2, the two carbons of the C=C. The methyl stays on C1."),
          ("one", "CC1CCCCC1=O", "2-methylcyclohexan-1-one", "2-Methylcyclohexanone",
           "No C=O forms. The peracid adds one O to both alkene carbons."),
          ("diol", add_across(s, "syn")[0], cip_name(add_across(s, "syn")[0], "1-methylcyclohexane-1,2-diol"), "1,2-Diol, both OH on the same face",
           "A diol needs two oxygens, from OsO₄ or from opening the epoxide later. mCPBA delivers one.")],
         ep, "ep",
         "Trisubstituted or not, the C=C becomes an epoxide in place.",
         prov("O placed on each face of the C=C in 3D", ALK),
         lead(s, "1-methylcyclohex-1-ene", "1-methylcyclohexene + mCPBA"), concepts=SYN)

    s = "OC1CCCCC1Br"
    o = match_one(s, "[OX2H]")[0]
    c, x = match_one(s, "[CX4]Br")
    rw = fixed(mol(s))
    set_h(rw, o, -1)
    rw.RemoveBond(c, x)
    rw.AddBond(o, c, Chem.BondType.SINGLE)
    rw = drop_fragment(rw, o)
    closed = finish(rw)
    chox = add_across(S["cyhexene"], "epoxide")[0]
    pick(node, "u5-ep-halohydrin", "trans-2-Bromocyclohexan-1-ol meets NaOH. Pick the product.",
         [("ep", chox, "(1R,6S)-7-oxabicyclo[4.1.0]heptane", "Cyclohexene oxide",
           "Hydroxide removes the O-H proton, and the alkoxide pushes out bromide from the next carbon. The ring closes."),
          ("diol", "OC1CCCCC1O", "cyclohexane-1,2-diol", "Cyclohexane-1,2-diol",
           "Hydroxide could attack C-Br from outside, but the alkoxide is already in place next door. Ring closing wins."),
          ("one", "O=C1CCCCC1", "cyclohexanone", "Cyclohexanone",
           "Nothing here oxidises the C-OH carbon. The base just removes the O-H proton.")],
         [closed], "ep",
         "Halohydrin plus base is the second way into an epoxide: an intramolecular SN2.",
         prov("Rule W applied intramolecularly: O-H off, O bonded to the C-Br carbon", EPX,
              "the neighbouring alkoxide closes the ring faster than hydroxide substitutes"),
         lead("O[C@@H]1CCCC[C@H]1Br", "(1R,2R)-2-bromocyclohexan-1-ol", "trans-2-bromocyclohexanol + NaOH"),
         flat_key=True, concepts=GEOM)

    s = S["limonene"]
    m = mol(s)
    alkenes = m.GetSubstructMatches(Chem.MolFromSmarts("C=C"))
    def ep_at(a: int, b: int) -> str:
        rw = fixed(m)
        rw.GetBondBetweenAtoms(a, b).SetBondType(Chem.BondType.SINGLE)
        o = rw.AddAtom(Chem.Atom(8))
        rw.GetAtomWithIdx(o).SetNoImplicit(True)
        rw.AddBond(a, o, Chem.BondType.SINGLE)
        rw.AddBond(b, o, Chem.BondType.SINGLE)
        return finish(rw)
    ranked = sorted(alkenes, key=lambda ab: cdeg(m, ab[0]) + cdeg(m, ab[1]), reverse=True)
    best = ep_at(*ranked[0]) if cdeg(m, ranked[0][0]) + cdeg(m, ranked[0][1]) > cdeg(m, ranked[1][0]) + cdeg(m, ranked[1][1]) else None
    pick(node, "u5-ep-select", "Limonene meets one equivalent of mCPBA. Pick the main product.",
         [("ring", ep_at(*ranked[0]), "1-methyl-4-(prop-1-en-2-yl)-7-oxabicyclo[4.1.0]heptane", "The ring C=C epoxidised",
           "The ring alkene carries three carbons, the side chain alkene two. More alkyl groups make a C=C richer in electrons, and the peracid reacts with it first."),
          ("side", ep_at(*ranked[1]), "2-methyl-2-(4-methylcyclohex-3-en-1-yl)oxirane", "The side chain C=C epoxidised",
           "That alkene has only two carbon groups, so it reacts more slowly. With one equivalent it mostly survives."),
          ("both", "CC12CCC(CC1O2)C1(C)CO1", "1-methyl-4-(2-methyloxiran-2-yl)-7-oxabicyclo[4.1.0]heptane", "Both C=C epoxidised",
           "One equivalent of mCPBA delivers one oxygen per molecule.")],
         [best] if best else None, "ring",
         "With a choice of alkenes, the peracid picks the most substituted one.",
         prov("each C=C counted for carbon substituents, the epoxide built on the higher count", EPX,
              "a more substituted alkene reacts faster with a peracid"),
         lead(s, "1-methyl-4-(prop-1-en-2-yl)cyclohex-1-ene", "limonene + mCPBA (one equivalent)"), level=2, concepts=SYN)


# ---------------------------------------------------------------------------
# u5-ep-acid
# ---------------------------------------------------------------------------

def node_ep_acid() -> None:
    node = "u5-ep-acid"
    s = S["dmox"]
    acid, base = open_epoxide(s, True, "OC"), open_epoxide(s, False, "OC")
    pick(node, "u5-ea-meet", "2,2-Dimethyloxirane meets CH₃OH with a trace of H₂SO₄. Pick the product.",
         [("more", acid[0], "2-methoxy-2-methylpropan-1-ol", "2-Methoxy-2-methylpropan-1-ol",
           "Acid protonates the epoxide O. The C-O bond to the tertiary carbon is weakest and carries the most + charge, so methanol attacks there."),
          ("less", base[0], "1-methoxy-2-methylpropan-2-ol", "1-Methoxy-2-methylpropan-2-ol",
           "That is the basic result, where methoxide hits the less crowded CH₂. Under acid, charge decides, not crowding."),
          ("diol", "CC(C)(O)CO", "2-methylpropane-1,2-diol", "2-Methylpropane-1,2-diol",
           "The nucleophile is the solvent, methanol, so the new group is OCH₃, not OH.")],
         acid, "more",
         "Acidic opening: the nucleophile goes to the more substituted carbon.",
         prov("Rule E: acid sends the nucleophile to the carbon with more carbon neighbours", EPO),
         lead(s, "2,2-dimethyloxirane", "2,2-dimethyloxirane + CH₃OH, H⁺"), level=0, concepts=GEOM)

    hbr = open_epoxide(s, True, "Br")
    pick(node, "u5-ea-hbr", "2,2-Dimethyloxirane meets one equivalent of dry HBr. Pick the product.",
         [("more", hbr[0], "2-bromo-2-methylpropan-1-ol", "2-Bromo-2-methylpropan-1-ol",
           "HBr protonates the O, and bromide attacks the tertiary carbon, the one that best holds the developing + charge."),
          ("less", open_epoxide(s, False, "Br")[0], "1-bromo-2-methylpropan-2-ol", "1-Bromo-2-methylpropan-2-ol",
           "Br on the CH₂ is the pattern for a basic, SN2-like opening. Here the epoxide is protonated first."),
          ("di", "CC(C)(Br)CBr", "1,2-dibromo-2-methylpropane", "1,2-Dibromo-2-methylpropane",
           "One equivalent of HBr opens the ring once. The OH left behind would need more HBr.")],
         hbr, "more",
         "Same rule with any nucleophile under acid: more substituted carbon.",
         prov("Rule E: acid sends the nucleophile to the carbon with more carbon neighbours", EPO),
         lead(s, "2,2-dimethyloxirane", "2,2-dimethyloxirane + HBr"), concepts=GEOM)

    s = S["chox"]
    trans = open_epoxide(s, True, "O")
    cis = add_across(S["cyhexene"], "syn")
    pick(node, "u5-ea-trans", "Cyclohexene oxide meets H₃O⁺. Pick the product (it forms with its mirror image).",
         [("trans", trans[0], "(1R,2R)-cyclohexane-1,2-diol", "trans-Cyclohexane-1,2-diol",
           "Water attacks the back of the protonated C-O bond, so the new OH ends up on the face opposite the old one: trans."),
          ("cis", cis[0], "(1R,2S)-cyclohexane-1,2-diol", "cis-Cyclohexane-1,2-diol",
           "Cis needs both OH groups on one face. Backside attack puts them on opposite faces."),
          ("ene", "OC1CCCC=C1", "cyclohex-2-en-1-ol", "Cyclohex-2-en-1-ol",
           "Water is the nucleophile here. The protonated epoxide is opened, not turned into an alkene.")],
         trans, "trans",
         "Opening is backside attack: the two groups end up anti, trans on a ring.",
         prov("Rule E: nucleophile placed behind the C-O bond in 3D, configuration read back", EPO),
         lead(add_across(S["cyhexene"], "epoxide")[0], "(1R,6S)-7-oxabicyclo[4.1.0]heptane", "cyclohexene oxide + H₃O⁺"), concepts=GEOM)

    s = add_across(S["mecyhexene"], "epoxide")[0]
    a_set = open_epoxide(s, True, "OC")
    b_set = open_epoxide(s, False, "OC")
    a, b_, o = epoxide_atoms(s)
    more = a if cdeg(mol(s), a) > cdeg(mol(s), b_) else b_
    same_face = sn2_3d(s, more, o, "OC", keep_lg=True, invert=False)
    pick(node, "u5-ea-ring", "1-Methylcyclohexene oxide meets CH₃OH with H⁺. Pick the product.",
         [("right", a_set[0], cip_name(a_set[0], "2-methoxy-2-methylcyclohexan-1-ol"), "OCH₃ on the tertiary C, trans to OH",
           "Under acid methanol attacks the more substituted carbon, C1, from the back. OCH₃ and OH end up trans."),
          ("regio", b_set[0], cip_name(b_set[0], "2-methoxy-1-methylcyclohexan-1-ol"), "OCH₃ on the CH, trans to OH",
           "That is the basic pattern: attack at the less crowded carbon. Acid favours the carbon that holds + charge better."),
          ("cis", same_face, cip_name(same_face, "2-methoxy-2-methylcyclohexan-1-ol"), "OCH₃ on the tertiary C, cis to OH",
           "Right carbon, wrong face. The nucleophile comes in opposite the C-O bond that breaks, so the groups are trans.")],
         a_set, "right",
         "Under acid: more substituted carbon, and anti.",
         prov("Rule E: regiochemistry by carbon neighbours, anti by 3D placement", EPO),
         lead(s, cip_name(s, "1-methyl-7-oxabicyclo[4.1.0]heptane", ("1", "6")), "1-methylcyclohexene oxide + CH₃OH, H⁺"),
         level=2, concepts=GEOM)

    s = S["dmox"]
    conds = {"acid": open_epoxide(s, True, "OC")[0], "base": open_epoxide(s, False, "OC")[0]}
    tert = [k for k, p in conds.items() if mol(p).HasSubstructMatch(Chem.MolFromSmarts("CO[CX4](C)(C)C"))]
    mcq(node, "u5-ea-conditions", "Pick the conditions that put OCH₃ on the tertiary carbon of 2,2-dimethyloxirane.",
        [("acid", "CH₃OH with H₂SO₄", "Protonating the O first lets the tertiary C-O bond stretch and carry + charge. Methanol bonds there."),
         ("base", "NaOCH₃ in CH₃OH", "Methoxide attacks without help from acid, so crowding decides: the CH₂ carbon."),
         ("neutral", "CH₃OH alone, no catalyst", "Neutral methanol is too weak a nucleophile to open an unprotonated epoxide.")],
        tert[0] if len(tert) == 1 else None, "acid",
        "Acid and base give opposite regiochemistry on the same epoxide.",
        prov("Rule E run under each condition, product read by SMARTS", EPO, "neutral methanol does not open the epoxide"),
        lead(s, "2,2-dimethyloxirane", "2,2-dimethyloxirane"), concepts=GEOM)

    # Replaces u5-ea-charge and u5-ea-water (cut in the fix round): same rule, a new substrate.
    s = "CCC1(C)CO1"
    pick(node, "u5-ea-ethyl", "2-Ethyl-2-methyloxirane meets CH₃CH₂OH with H₂SO₄. Pick the product.",
         [("more", "CCOC(C)(CC)CO", "2-ethoxy-2-methylbutan-1-ol", "2-Ethoxy-2-methylbutan-1-ol",
           "Acid protonates the epoxide O, and ethanol bonds to the tertiary carbon, the one with more carbon neighbours."),
          ("less", "CCOCC(C)(O)CC", "1-ethoxy-2-methylbutan-2-ol", "1-Ethoxy-2-methylbutan-2-ol",
           "Ethoxy on the CH₂ is the basic pattern, ethoxide attacking the less crowded carbon. Here acid acts first."),
          ("diol", "CCC(C)(O)CO", "2-methylbutane-1,2-diol", "2-Methylbutane-1,2-diol",
           "The nucleophile is the solvent, ethanol, so the new group is OCH₂CH₃, not OH.")],
         open_epoxide(s, True, "OCC"), "more",
         "Acidic opening: the nucleophile goes to the more substituted carbon, whatever the alcohol.",
         prov("Rule E: acid sends the nucleophile to the carbon with more carbon neighbours; constitution compared", EPO),
         lead(s, "2-ethyl-2-methyloxirane", "2-ethyl-2-methyloxirane + CH₃CH₂OH, H⁺"), flat_key=True, concepts=GEOM)


def cip_name(smi: str, stem: str, locants: tuple[str, ...] = ("1", "2")) -> str:
    """
    The stereo name for a drawn structure, found by round trip: every R/S
    combination on the given locants is read by OPSIN, and the one that reads
    back as exactly this structure is kept. No R or S is typed by hand.
    """
    import itertools
    names = [f"({','.join(l + x for l, x in zip(locants, combo))})-{stem}" for combo in itertools.product("RS", repeat=len(locants))]
    for n in names:
        if opsin_smiles(n) == canon(smi):
            return n
    if not COLLECT:
        fail(f"no R/S combination of {stem} on {locants} reads back as {canon(smi)}")
    return names[0]


# ---------------------------------------------------------------------------
# u5-ep-base
# ---------------------------------------------------------------------------

def node_ep_base() -> None:
    node = "u5-ep-base"
    s = S["dmox"]
    base, acid = open_epoxide(s, False, "OC"), open_epoxide(s, True, "OC")
    pick(node, "u5-eb-meet", "2,2-Dimethyloxirane meets NaOCH₃ in CH₃OH. Pick the product.",
         [("less", base[0], "1-methoxy-2-methylpropan-2-ol", "1-Methoxy-2-methylpropan-2-ol",
           "Methoxide attacks by SN2, so it goes to the less crowded CH₂. The ring O leaves with the tertiary carbon and picks up H."),
          ("more", acid[0], "2-methoxy-2-methylpropan-1-ol", "2-Methoxy-2-methylpropan-1-ol",
           "That is the acid result. With no acid, nothing builds + charge on the tertiary carbon, and crowding decides."),
          ("diol", "CC(C)(O)CO", "2-methylpropane-1,2-diol", "2-Methylpropane-1,2-diol",
           "The nucleophile is methoxide, so the new group is OCH₃.")],
         base, "less",
         "Basic opening: SN2 at the less substituted carbon.",
         prov("Rule E: base sends the nucleophile to the carbon with fewer carbon neighbours", EPO),
         lead(s, "2,2-dimethyloxirane", "2,2-dimethyloxirane + NaOCH₃"), level=0, concepts=GEOM)

    s = S["pox"]
    cn = open_epoxide(s, False, "C#N")
    pick(node, "u5-eb-cyanide", "2-Methyloxirane meets NaCN, then H₃O⁺. Pick the product.",
         [("less", flat(cn[0]), "3-hydroxybutanenitrile", "3-Hydroxybutanenitrile",
           "Cyanide attacks the CH₂ end. The new C-C bond adds one carbon, and workup protonates the alkoxide."),
          ("more", "CC(C#N)CO", "3-hydroxy-2-methylpropanenitrile", "3-Hydroxy-2-methylpropanenitrile",
           "That is attack at the CH carbon. In basic SN2 the less crowded CH₂ wins."),
          ("cyano", "CCC(O)C#N", "2-hydroxybutanenitrile", "2-Hydroxybutanenitrile",
           "That puts OH and CN on one carbon, a cyanohydrin from a carbonyl. The epoxide gives them on neighbouring carbons.")],
         cn, "less",
         "Carbon nucleophiles open epoxides too, at the less hindered carbon, adding a carbon chain.",
         prov("Rule E: base sends the nucleophile to the carbon with fewer carbon neighbours", EPO),
         lead(s, "2-methyloxirane", "2-methyloxirane + NaCN, then H₃O⁺"), flat_key=True, concepts=GEOM)

    s = add_across(S["cyhexene"], "epoxide")[0]
    tr = open_epoxide(s, False, "OC")
    a, b_, o = epoxide_atoms(s)
    cisp = sn2_3d(s, a, o, "OC", keep_lg=True, invert=False)
    pick(node, "u5-eb-trans", "Cyclohexene oxide meets NaOCH₃. Pick the product (it forms with its mirror image).",
         [("trans", tr[0], cip_name(tr[0], "2-methoxycyclohexan-1-ol"), "trans-2-Methoxycyclohexanol",
           "Methoxide attacks from the face opposite the epoxide O. After opening, OCH₃ and OH sit on opposite faces."),
          ("cis", cisp, cip_name(cisp, "2-methoxycyclohexan-1-ol"), "cis-2-Methoxycyclohexanol",
           "Same face would need a front side attack. SN2 always comes from behind."),
          ("lost", "COC1CCCCC1", "methoxycyclohexane", "Methoxycyclohexane",
           "The epoxide O is not lost: it stays on the other carbon and becomes the OH.")],
         tr, "trans",
         "Basic opening is SN2: inversion at the carbon attacked, so trans on a ring.",
         prov("Rule E: nucleophile placed behind the C-O bond in 3D, configuration read back", EPO),
         lead(s, "(1R,6S)-7-oxabicyclo[4.1.0]heptane", "cyclohexene oxide + NaOCH₃"), concepts=GEOM)

    s = S["pox"]
    gr = open_epoxide(s, False, "C")
    pick(node, "u5-eb-grignard", "2-Methyloxirane meets CH₃MgBr, then H₃O⁺. Pick the product.",
         [("less", flat(gr[0]), "butan-2-ol", "Butan-2-ol",
           "The Grignard's carbon attacks the CH₂ end: CH₃ adds there, and the O stays on the CH as an OH after workup."),
          ("more", "CC(C)CO", "2-methylpropan-1-ol", "2-Methylpropan-1-ol",
           "That puts the new CH₃ on the more crowded CH carbon. A Grignard opens at the less hindered end."),
          ("noC", "CC(C)O", "propan-2-ol", "Propan-2-ol",
           "No new C-C bond here. The Grignard carbon bonds to the epoxide carbon, adding one carbon.")],
         gr, "less",
         "Grignards open epoxides at the less hindered carbon: a two-carbon extension with an OH.",
         prov("Rule E: base sends the nucleophile (CH3) to the carbon with fewer carbon neighbours", EPO,
              "a Grignard opens an epoxide like any strong nucleophile, by SN2"),
         lead(s, "2-methyloxirane", "2-methyloxirane + CH₃MgBr, then H₃O⁺"), flat_key=True, concepts=GEOM)

    s = S["dmox"]
    h = open_epoxide(s, False, "[H][H]")
    pick(node, "u5-eb-hydride", "2,2-Dimethyloxirane meets LiAlH₄, then H₃O⁺. Pick the product.",
         [("tert", h[0], "2-methylpropan-2-ol", "2-Methylpropan-2-ol",
           "Hydride attacks the CH₂ end, which becomes CH₃. The O stays on the tertiary carbon."),
          ("prim", "CC(C)CO", "2-methylpropan-1-ol", "2-Methylpropan-1-ol",
           "That needs hydride at the tertiary carbon, the more hindered end. SN2 avoids it."),
          ("diol", "CC(C)(O)CO", "2-methylpropane-1,2-diol", "2-Methylpropane-1,2-diol",
           "Hydride adds H, not OH. Only one O is present, from the epoxide.")],
         h, "tert",
         "Hydride is a nucleophile too: less hindered carbon.",
         prov("Rule E: base sends the nucleophile (H) to the carbon with fewer carbon neighbours", EPO,
              "LiAlH4 delivers hydride by SN2 to the less hindered carbon"),
         lead(s, "2,2-dimethyloxirane", "2,2-dimethyloxirane + LiAlH₄"), concepts=GEOM)

    s = S["rpox"]
    keep = open_epoxide(s, False, "OC", racemic=False)
    acidish = open_epoxide(s, True, "OC", racemic=False)
    pick(node, "u5-eb-stereo", "(R)-2-Methyloxirane meets NaOCH₃. Pick the product.",
         [("keep", keep[0], cip_name(keep[0], "1-methoxypropan-2-ol", ("2",)), "(R)-1-Methoxypropan-2-ol",
           "Methoxide attacks the CH₂, which is not a stereocentre. The stereocentre's bonds are untouched, so it keeps its arrangement."),
          ("inv", mirror(keep[0]), cip_name(mirror(keep[0]), "1-methoxypropan-2-ol", ("2",)), "(S)-1-Methoxypropan-2-ol",
           "Inversion happens only where the nucleophile attacks, the CH₂. The stereocentre is a bystander."),
          ("more", acidish[0], cip_name(acidish[0], "2-methoxypropan-1-ol", ("2",)), "2-Methoxypropan-1-ol",
           "That is attack at the CH, the acid pattern. Methoxide picks the less hindered CH₂.")],
         keep, "keep",
         "Find the carbon attacked first; only that carbon inverts.",
         prov("Rule E run on the single (R) enantiomer in 3D, configuration read back", EPO),
         lead(s, "(2R)-2-methyloxirane", "(R)-2-methyloxirane + NaOCH₃"), level=2, concepts=GEOM)

    s = add_across(S["mecyhexene"], "epoxide")[0]
    b_set, a_set = open_epoxide(s, False, "OC"), open_epoxide(s, True, "OC")
    a, b_, o = epoxide_atoms(s)
    less = a if cdeg(mol(s), a) < cdeg(mol(s), b_) else b_
    same_face = sn2_3d(s, less, o, "OC", keep_lg=True, invert=False)
    pick(node, "u5-eb-ring", "1-Methylcyclohexene oxide meets NaOCH₃. Pick the product.",
         [("right", b_set[0], cip_name(b_set[0], "2-methoxy-1-methylcyclohexan-1-ol"), "OCH₃ on the CH, trans to OH",
           "Methoxide attacks the less hindered ring carbon (the CH) from the back, so OCH₃ and OH end up trans."),
          ("regio", a_set[0], cip_name(a_set[0], "2-methoxy-2-methylcyclohexan-1-ol"), "OCH₃ on the tertiary C, trans to OH",
           "That is the acid result. With methoxide, crowding steers it to the CH carbon."),
          ("cis", same_face, cip_name(same_face, "2-methoxy-1-methylcyclohexan-1-ol"), "OCH₃ on the CH, cis to OH",
           "Right carbon, wrong face: SN2 comes from behind the breaking C-O bond.")],
         b_set, "right",
         "Under base: less substituted carbon, and anti.",
         prov("Rule E: regiochemistry by carbon neighbours, anti by 3D placement", EPO),
         lead(s, cip_name(s, "1-methyl-7-oxabicyclo[4.1.0]heptane", ("1", "6")), "1-methylcyclohexene oxide + NaOCH₃"), level=2, concepts=GEOM)


# ---------------------------------------------------------------------------
# u5-syn-diol and u5-anti-diol, taught as a pair
# ---------------------------------------------------------------------------

SET_TEXT = {"meso": "One meso compound", "enantiomers": "A pair of enantiomers", "one enantiomer": "A single enantiomer"}


def node_syn_diol() -> None:
    node = "u5-syn-diol"
    s = S["cyhexene"]
    syn, anti = add_across(s, "syn"), add_across(s, "anti")
    pick(node, "u5-sd-meet", "Cyclohexene meets OsO₄, then NMO. Pick the product.",
         [("cis", syn[0], "(1R,2S)-cyclohexane-1,2-diol", "cis-Cyclohexane-1,2-diol",
           "OsO₄ adds both oxygens at once from one face, through a cyclic osmate ester. Both OH groups end up on the same face."),
          ("trans", anti[0], "(1R,2R)-cyclohexane-1,2-diol", "trans-Cyclohexane-1,2-diol",
           "Trans comes from the two-step route, epoxide then acid. OsO₄ delivers both O from one side."),
          ("ep", add_across(s, "epoxide")[0], "(1R,6S)-7-oxabicyclo[4.1.0]heptane", "Cyclohexene oxide",
           "That is the peracid product. OsO₄ gives two C-OH bonds, not a bridging O.")],
         syn, "cis",
         "OsO₄ is syn dihydroxylation: both OH on one face.",
         prov("two OH placed on one face of the C=C in 3D, both faces run, configuration read back", ALK),
         lead(s, "cyclohexene", "cyclohexene + OsO₄, NMO"), level=0, concepts=SYN)

    zs, es = add_across(S["zbut"], "syn"), add_across(S["ebut"], "syn")
    pick(node, "u5-sd-z", "(Z)-But-2-ene meets OsO₄, then NMO. Pick the product.",
         [("meso", zs[0], "(2R,3S)-butane-2,3-diol", "meso-Butane-2,3-diol",
           "Syn addition to a cis alkene gives a product with a mirror plane through the middle: meso."),
          ("chiral", es[0], "(2R,3R)-butane-2,3-diol", "(2R,3R)-Butane-2,3-diol",
           "That one comes from syn addition to the trans alkene, or anti addition to this cis one."),
          ("12", "CCC(O)CO", "butane-1,2-diol", "Butane-1,2-diol",
           "The OH groups go on the two carbons of the C=C, C2 and C3.")],
         zs, "meso",
         "cis alkene plus syn addition gives meso.",
         prov("syn OH placement on the (Z) alkene in 3D; meso read back by comparing mirror images", ALK),
         lead(S["zbut"], "(Z)-but-2-ene", "(Z)-but-2-ene + OsO₄"), concepts=SYN)

    pick(node, "u5-sd-e", "(E)-But-2-ene meets OsO₄, then NMO. Pick a product (its mirror image forms too).",
         [("chiral", es[0], "(2R,3R)-butane-2,3-diol", "(2R,3R)-Butane-2,3-diol",
           "Syn addition to a trans alkene gives a chiral diol; the two faces give the two enantiomers equally."),
          ("meso", zs[0], "(2R,3S)-butane-2,3-diol", "meso-Butane-2,3-diol",
           "meso comes from the cis alkene with syn addition. Starting trans changes the answer."),
          ("one", "CC(=O)C(C)O", "3-hydroxybutan-2-one", "3-Hydroxybutan-2-one",
           "NMO only regenerates OsO₄. Nothing oxidises the diol further.")],
         es, "chiral",
         "trans alkene plus syn addition gives the racemic pair.",
         prov("syn OH placement on the (E) alkene in 3D, two enantiomers read back", ALK),
         lead(S["ebut"], "(E)-but-2-ene", "(E)-but-2-ene + OsO₄"), concepts=SYN)

    s = S["mecyhexene"]
    syn, anti = add_across(s, "syn"), add_across(s, "anti")
    pick(node, "u5-sd-kmno4", "1-Methylcyclohexene meets cold, dilute KMnO₄ with NaOH. Pick a product.",
         [("cis", syn[0], cip_name(syn[0], "1-methylcyclohexane-1,2-diol"), "1,2-Diol, both OH on the same face",
           "Cold permanganate works like OsO₄: a cyclic manganate ester delivers both O from one face."),
          ("trans", anti[0], cip_name(anti[0], "1-methylcyclohexane-1,2-diol"), "1,2-Diol, OH on opposite faces",
           "OH on opposite faces needs the epoxide route. Permanganate adds both O together."),
          ("one", "CC1CCCCC1=O", "2-methylcyclohexan-1-one", "2-Methylcyclohexanone",
           "Cold, dilute, basic conditions stop at the diol. Neither carbon becomes C=O.")],
         syn, "cis",
         "Cold dilute KMnO₄ and OsO₄ are the same reaction type: syn dihydroxylation.",
         prov("syn OH placement in 3D, configuration read back", ALK, "cold dilute basic KMnO4 stops at the cis diol"),
         lead(s, "1-methylcyclohex-1-ene", "1-methylcyclohexene + cold KMnO₄"), concepts=SYN)

    for oid, alk, label in (("u5-sd-set-z", S["zbut"], "(Z)"), ("u5-sd-set-e", S["ebut"], "(E)")):
        got = describe_set(add_across(alk, "syn"))
        key = {"meso": "meso", "enantiomers": "pair", "one enantiomer": "single"}.get(got)
        right = key
        whys = {
            "meso": ("One meso compound", "Syn addition to a cis alkene puts the two OH and the two CH₃ in mirror positions. The molecule is its own mirror image."),
            "pair": ("A pair of enantiomers", "Syn addition to a trans alkene gives a chiral diol, and the two faces of the C=C give the two mirror images equally."),
            "single": ("A single enantiomer", "Nothing chiral is present to favour one face, so both faces react equally."),
        }
        correct = "meso" if label == "(Z)" else "pair"
        mcq(node, oid, f"{label}-But-2-ene meets OsO₄. Pick how the product set is described.",
            [(k, t, w) for k, (t, w) in sorted(whys.items(), key=lambda kv: kv[0] != correct)],
            right, correct,
            "Pair the alkene geometry with the addition mode: cis with syn, or trans with anti, gives meso.",
            prov("both faces run in 3D; meso or enantiomer pair read back by comparing mirror images", ALK),
            lead(alk, f"{label}-but-2-ene", f"{label}-but-2-ene + OsO₄"),
            level=2, concepts=SYN)


def node_anti_diol() -> None:
    node = "u5-anti-diol"
    s = S["cyhexene"]
    syn, anti = add_across(s, "syn"), add_across(s, "anti")
    ep = add_across(s, "epoxide")[0]
    via = open_epoxide(ep, True, "O")
    if via != anti:
        fail(f"u5-anti-diol: epoxide then H3O+ gives {via}, anti addition gives {anti}")
    pick(node, "u5-ad-meet", "Cyclohexene: mCPBA, then H₃O⁺. Pick a product (its mirror image forms too).",
         [("trans", anti[0], "(1R,2R)-cyclohexane-1,2-diol", "trans-Cyclohexane-1,2-diol",
           "Step one puts an O on one face. Step two, water attacks from the opposite face. The two OH groups end up trans."),
          ("cis", syn[0], "(1R,2S)-cyclohexane-1,2-diol", "cis-Cyclohexane-1,2-diol",
           "cis is the OsO₄ answer. Opening an epoxide is always backside, so this route gives trans."),
          ("ep", ep, "(1R,6S)-7-oxabicyclo[4.1.0]heptane", "Cyclohexene oxide",
           "That is the product after step one only. Aqueous acid opens it.")],
         anti, "trans",
         "Epoxidation then acid opening is anti dihydroxylation.",
         prov("epoxide built in 3D then opened from the back; matches anti OH placement", ALK),
         lead(s, "cyclohexene", "cyclohexene, mCPBA, then H₃O⁺"), level=0, concepts=GEOM)

    za, ea = add_across(S["zbut"], "anti"), add_across(S["ebut"], "anti")
    pick(node, "u5-ad-z", "(Z)-But-2-ene: mCPBA, then H₃O⁺. Pick a product (its mirror image forms too).",
         [("chiral", za[0], "(2R,3R)-butane-2,3-diol", "(2R,3R)-Butane-2,3-diol",
           "Anti addition to a cis alkene gives the chiral diol; attack at either epoxide carbon gives the two enantiomers."),
          ("meso", add_across(S["zbut"], "syn")[0], "(2R,3S)-butane-2,3-diol", "meso-Butane-2,3-diol",
           "meso from the cis alkene needs syn addition, the OsO₄ route."),
          ("ep", add_across(S["zbut"], "epoxide")[0], "(2R,3S)-2,3-dimethyloxirane", "cis-2,3-Dimethyloxirane",
           "That is the intermediate. H₃O⁺ opens it to the diol.")],
         za, "chiral",
         "cis alkene plus anti addition gives the racemic pair.",
         prov("anti OH placement on the (Z) alkene in 3D, two enantiomers read back", ALK),
         lead(S["zbut"], "(Z)-but-2-ene", "(Z)-but-2-ene, mCPBA, then H₃O⁺"), concepts=GEOM)

    pick(node, "u5-ad-e", "(E)-But-2-ene: mCPBA, then H₃O⁺. Pick the product.",
         [("meso", ea[0], "(2R,3S)-butane-2,3-diol", "meso-Butane-2,3-diol",
           "Anti addition to a trans alkene gives the meso diol: both routes of attack lead to the same achiral product."),
          ("chiral", add_across(S["ebut"], "syn")[0], "(2R,3R)-butane-2,3-diol", "(2R,3R)-Butane-2,3-diol",
           "That is syn addition to the trans alkene. Anti flips one centre."),
          ("12", "CCC(O)CO", "butane-1,2-diol", "Butane-1,2-diol",
           "The OH groups land on C2 and C3, the carbons of the C=C.")],
         ea, "meso",
         "trans alkene plus anti addition gives meso.",
         prov("anti OH placement on the (E) alkene in 3D; meso read back by comparing mirror images", ALK),
         lead(S["ebut"], "(E)-but-2-ene", "(E)-but-2-ene, mCPBA, then H₃O⁺"), concepts=GEOM)

    s = S["mecyhexene"]
    syn, anti = add_across(s, "syn"), add_across(s, "anti")
    pick(node, "u5-ad-methyl", "1-Methylcyclohexene: mCPBA, then H₃O⁺. Pick a product.",
         [("trans", anti[0], cip_name(anti[0], "1-methylcyclohexane-1,2-diol"), "1,2-Diol, OH on opposite faces",
           "Water opens the protonated epoxide from the back, at the tertiary carbon. The two OH groups end up on opposite faces."),
          ("cis", syn[0], cip_name(syn[0], "1-methylcyclohexane-1,2-diol"), "1,2-Diol, both OH on the same face",
           "Both OH on one face is the OsO₄ result. The epoxide route always gives anti."),
          ("one", "CC1CCCCC1=O", "2-methylcyclohexan-1-one", "2-Methylcyclohexanone",
           "Opening an epoxide with water gives a diol. No C=O forms.")],
         anti, "trans",
         "Anti dihydroxylation on a ring always gives the trans diol.",
         prov("anti OH placement in 3D, configuration read back", ALK),
         lead(s, "1-methylcyclohex-1-ene", "1-methylcyclohexene, mCPBA, then H₃O⁺"), concepts=GEOM)

    got = describe_set(add_across(S["zbut"], "anti"))
    mcq(node, "u5-ad-set", "(Z)-But-2-ene: mCPBA, then H₃O⁺. Pick how the product set is described.",
        [("pair", "A pair of enantiomers", "Anti addition to a cis alkene gives a chiral diol, formed as both mirror images in equal amounts."),
         ("meso", "One meso compound", "meso needs cis with syn, or trans with anti. This is cis with anti."),
         ("single", "A single enantiomer", "No chiral reagent is used, so both enantiomers form equally.")],
        {"meso": "meso", "enantiomers": "pair", "one enantiomer": "single"}.get(got), "pair",
        "Geometry and mode together decide meso or racemic.",
        prov("both routes run in 3D; enantiomer pair read back by comparing mirror images", ALK),
        lead(S["zbut"], "(Z)-but-2-ene", "(Z)-but-2-ene, epoxide route"), level=2, concepts=GEOM)

    routes = {
        "match": (add_across(S["ebut"], "anti"), add_across(S["zbut"], "syn")),
        "e_both": (add_across(S["ebut"], "anti"), add_across(S["ebut"], "syn")),
        "z_both": (add_across(S["zbut"], "anti"), add_across(S["zbut"], "syn")),
    }
    same = [k for k, (x, y) in routes.items() if x == y]
    mcq(node, "u5-ad-same", "Pick the two routes that give the same butane-2,3-diol.",
        [("match", "(E) via epoxide, and (Z) with OsO₄", "Both give meso: trans with anti, cis with syn. Two wrongs of geometry make the same right."),
         ("e_both", "(E) via epoxide, and (E) with OsO₄", "Same alkene, opposite modes: one gives meso, the other the chiral pair."),
         ("z_both", "(Z) via epoxide, and (Z) with OsO₄", "Same alkene, opposite modes: the chiral pair from one, meso from the other.")],
        same[0] if len(same) == 1 else None, "match",
        "Flip the alkene geometry and flip the mode, and the product comes out the same.",
        prov("product sets from the four routes built in 3D and compared", ALK),
        lead(S["zbut"], "(Z)-but-2-ene", "but-2-ene, four routes"), level=2, concepts=GEOM + SYN)



# ---------------------------------------------------------------------------
# u5-appel (side quest)
# ---------------------------------------------------------------------------

PPH3 = "c1ccc(P(c2ccccc2)c2ccccc2)cc1"
PPH3O = "O=P(c1ccccc1)(c1ccccc1)c1ccccc1"


def node_appel() -> None:
    node = "u5-appel"
    s = S["butanol"]
    c, o = the_oh(s)
    pick(node, "u5-ap-meet", "Butan-1-ol meets CBr₄ and PPh₃. Pick the product.",
         [("br", swap(s, c, o, "Br"), "1-bromobutane", "1-Bromobutane",
           "PPh₃ and CBr₄ turn the OH into O-PPh₃⁺, a superb leaving group. Bromide displaces it from behind."),
          ("ene", "C=CCC", "but-1-ene", "But-1-ene",
           "No strong base is present, and a primary carbon does not eliminate easily. Substitution wins."),
          ("ether", "CCCCOCCCC", "1-butoxybutane", "Dibutyl ether",
           "The nucleophile that attacks carbon is bromide, the most available one, not a second alcohol.")],
         [swap(s, c, o, "Br")], "br",
         "The Appel reaction is another OH to Br swap at the same carbon, with no cation.",
         prov("Rule S: the activated O is swapped for Br at the same carbon", ROH,
              "Appel conditions substitute by SN2 at the C-O carbon"),
         lead(s, "butan-1-ol", "butan-1-ol + CBr₄, PPh₃"), level=0, concepts=LG)

    s = S["r2butanol"]
    c, o = the_oh(s)
    inv, ret = sn2_3d(s, c, o, "Br"), sn2_3d(s, c, o, "Br", invert=False)
    pick(node, "u5-ap-invert", "(R)-Butan-2-ol meets CBr₄ and PPh₃. Pick the product.",
         [("inv", inv, "(S)-2-bromobutane", "(S)-2-Bromobutane",
           "Bromide attacks behind the C-O bond as Ph₃P=O leaves, so the stereocentre inverts, exactly as with PBr₃."),
          ("ret", ret, "(R)-2-bromobutane", "(R)-2-Bromobutane",
           "Retention would need Br to arrive on the side the oxygen leaves from. SN2 comes in from behind."),
          ("ene", "CC=CC", "but-2-ene", "But-2-ene",
           "Bromide is a good nucleophile and a weak base. It substitutes.")],
         [inv], "inv",
         "Appel at a stereocentre: inversion.",
         prov("Rule S: Br placed behind the leaving O on a 3D conformer, configuration read back", ROH,
              "Appel conditions substitute by SN2 at the C-O carbon"),
         lead(s, "(R)-butan-2-ol", "(R)-butan-2-ol + CBr₄, PPh₃"), concepts=LG)

    s = S["butanol"]
    prod = swap(s, *the_oh(s), "Br")
    left = [s, "BrC(Br)(Br)Br", PPH3]
    sets = {"good": [prod, PPH3O, "BrC(Br)Br"], "hbr": [prod, PPH3O, "Br"], "noox": [prod, PPH3, "BrC(Br)Br", "O"]}
    good = [k for k, v in sets.items() if balances(left, v)]
    mcq(node, "u5-ap-byproducts", "Butan-1-ol, CBr₄ and PPh₃ give 1-bromobutane. Pick the byproducts.",
        [("good", "Ph₃P=O and CHBr₃", "Every atom balances: the alcohol's O ends on phosphorus, its H on the CBr₃ fragment. The strong P=O bond pays for the reaction."),
         ("hbr", "Ph₃P=O and HBr", "Count carbons: CBr₄ brought one carbon in, and HBr has none. The equation does not balance."),
         ("noox", "PPh₃ back, CHBr₃ and H₂O", "Count hydrogens: the right side has two more than the left. The O goes to phosphorus, not into water.")],
        good[0] if len(good) == 1 else None, "good",
        "Phosphorus ends up as Ph₃P=O: the oxygen the alcohol gave up.",
        prov("mass balance computed atom by atom over each candidate set", ROH),
        lead(s, "butan-1-ol", "butan-1-ol + CBr₄ + PPh₃"), concepts=LG)

    s = S["pentanol"]
    c, o = the_oh(s)
    pick(node, "u5-ap-ccl4", "Pentan-1-ol meets CCl₄ and PPh₃. Pick the product.",
         [("cl", swap(s, c, o, "Cl"), "1-chloropentane", "1-Chloropentane",
           "Same reaction with CCl₄: the halide comes from the tetrahalomethane, so here it is chloride."),
          ("br", "CCCCCBr", "1-bromopentane", "1-Bromopentane",
           "There is no bromine in this flask. The halide that arrives is the one CCl₄ supplies."),
          ("ald", "CCCCC=O", "pentanal", "Pentanal",
           "Nothing here oxidises the alcohol. Its O is handed to phosphorus.")],
         [swap(s, c, o, "Cl")], "cl",
         "Swap CBr₄ for CCl₄ and the Appel gives the chloride.",
         prov("Rule S: the activated O is swapped for Cl at the same carbon", ROH,
              "Appel conditions substitute by SN2 at the C-O carbon"),
         lead(s, "pentan-1-ol", "pentan-1-ol + CCl₄, PPh₃"), concepts=LG)

    s = S["3mb2ol"]
    c, o = the_oh(s)
    pick(node, "u5-ap-noshift", "3-Methylbutan-2-ol meets CBr₄ and PPh₃. Pick the product.",
         [("plain", swap(s, c, o, "Br"), "2-bromo-3-methylbutane", "2-Bromo-3-methylbutane",
           "No cation forms in the Appel, so nothing can shift. Br takes the place of the activated oxygen on C2."),
          ("shift", sn1(s, c, o, "Br"), "2-bromo-2-methylbutane", "2-Bromo-2-methylbutane",
           "That is the HBr result, where a cation forms and a hydride shifts. The Appel never makes the cation."),
          ("ene", "CC=C(C)C", "2-methylbut-2-ene", "2-Methylbut-2-ene",
           "Bromide substitutes here. Without acid, nothing drives loss of water.")],
         [swap(s, c, o, "Br")], "plain",
         "Use Appel or PBr₃ when a skeleton must not rearrange.",
         prov("Rule S: no cation, so no shift test", ROH, "Appel conditions substitute by SN2 at the C-O carbon"),
         lead(s, "3-methylbutan-2-ol", "3-methylbutan-2-ol + CBr₄, PPh₃"), level=2, concepts=REARR)

    s = S["cyhexol"]
    c, o = the_oh(s)
    pick(node, "u5-ap-ring", "Cyclohexanol meets CBr₄ and PPh₃. Pick the product.",
         [("br", swap(s, c, o, "Br"), "bromocyclohexane", "Bromocyclohexane",
           "The secondary C-O carbon is still open to backside attack, so bromide replaces the activated O."),
          ("ene", "C1=CCCCC1", "cyclohexene", "Cyclohexene",
           "Bromide is a weak base. With no acid and no strong base, elimination is minor."),
          ("one", "O=C1CCCCC1", "cyclohexanone", "Cyclohexanone",
           "The O is transferred to phosphorus, not oxidised. The carbon gains Br.")],
         [swap(s, c, o, "Br")], "br",
         "Primary or secondary, the Appel gives the alkyl bromide.",
         prov("Rule S: the activated O is swapped for Br at the same carbon", ROH,
              "Appel conditions substitute by SN2 at the C-O carbon"),
         lead(s, "cyclohexanol", "cyclohexanol + CBr₄, PPh₃"), concepts=LG)


# ---------------------------------------------------------------------------
# u5-swern (side quest): reagent choice among the mild oxidants
# ---------------------------------------------------------------------------

def node_swern() -> None:
    node = "u5-swern"
    s = S["butanol"]
    pick(node, "u5-sw-meet", "Butan-1-ol: (COCl)₂ and DMSO at minus 78 °C, then Et₃N. Pick the product.",
         [("ald", "CCCC=O", "butanal", "Butanal",
           "The Swern is a mild oxidation: activated DMSO takes the alcohol's H atoms, and there is no water, so it stops at the aldehyde."),
          ("acid", "CCCC(=O)O", "butanoic acid", "Butanoic acid",
           "Over-oxidation needs water to form the hydrate. The Swern runs dry."),
          ("cl", "CCCCCl", "1-chlorobutane", "1-Chlorobutane",
           "Oxalyl chloride activates DMSO, not the alcohol carbon. The alcohol's carbon is oxidised, not substituted.")],
         no_rxn(s, oxidize(s, strong=False)), "ald",
         "Swern, Dess-Martin and TEMPO all stop a primary alcohol at the aldehyde.",
         prov("Rule O: one level for a mild oxidant", OXI, "the Swern belongs with the mild oxidants"),
         lead(s, "butan-1-ol", "butan-1-ol, Swern conditions"), level=0, concepts=OXL)

    s = S["cyhexol"]
    pick(node, "u5-sw-dmp", "Cyclohexanol meets Dess-Martin periodinane. Pick the product.",
         [("ket", "O=C1CCCCC1", "cyclohexanone", "Cyclohexanone",
           "A secondary alcohol goes up one level to the ketone, and a ketone has no C-H left on that carbon to oxidise."),
          ("ene", "C1=CCCCC1", "cyclohexene", "Cyclohexene",
           "Dess-Martin is an oxidant. It removes H₂, not H₂O."),
          ("acid", "OC(=O)CCCCC(=O)O", "hexanedioic acid", "Hexanedioic acid",
           "Breaking the ring needs a harsh oxidant and heat. Dess-Martin is mild.")],
         no_rxn(s, oxidize(s, strong=False)), "ket",
         "Mild oxidants and strong ones agree on a secondary alcohol: the ketone.",
         prov("Rule O: one level for a secondary alcohol", OXI, "Dess-Martin belongs with the mild oxidants"),
         lead(s, "cyclohexanol", "cyclohexanol + Dess-Martin"), concepts=OXL)

    s = S["2mb2ol"]
    pick(node, "u5-sw-tert", "2-Methylbutan-2-ol meets Swern conditions. Pick what happens.",
         [("none", s, "2-methylbutan-2-ol", "No reaction",
           "The C-OH carbon has no H. Every oxidant here removes an H from that carbon, so nothing happens."),
          ("ald", "CCC(C)C=O", "2-methylbutanal", "2-Methylbutanal",
           "That puts the O on a different carbon. Oxidation never moves the oxygen."),
          ("ene", "CC=C(C)C", "2-methylbut-2-ene", "2-Methylbut-2-ene",
           "Swern conditions are basic and cold, not the hot acid that dehydrates a tertiary alcohol.")],
         no_rxn(s, oxidize(s, strong=False)), "none",
         "Tertiary alcohols resist every oxidant on this list.",
         prov("Rule O: no H on the C-OH carbon, nothing is oxidised", OXI),
         lead(s, "2-methylbutan-2-ol", "2-methylbutan-2-ol, Swern conditions"), concepts=OXL)

    s = S["butanol"]
    left = [s, "O=C(Cl)C(=O)Cl", "CS(C)=O", "CCN(CC)CC", "CCN(CC)CC"]
    salt = "CC[NH+](CC)CC.[Cl-]"
    sets = {
        "good": ["CCCC=O", "CSC", "[C-]#[O+]", "O=C=O", salt, salt],
        "sulfone": ["CCCC=O", "CS(C)(=O)=O", "[C-]#[O+]", salt, salt],
        "twoco2": ["CCCC=O", "CSC", "O=C=O", "O=C=O", salt, salt],
    }
    good = [k for k, v in sets.items() if balances(left, v)]
    mcq(node, "u5-sw-byproducts", "Pick the byproducts of a Swern oxidation of butan-1-ol.",
        [("good", "Me₂S, CO, CO₂ and Et₃NH⁺Cl⁻", "Atoms balance only this way. Dimethyl sulfide, the famous smell, is DMSO after giving up its O."),
         ("sulfone", "Me₂SO₂, CO and Et₃NH⁺Cl⁻", "DMSO is the oxidant, so its S is reduced to Me₂S, not oxidised to a sulfone. The atoms do not balance either."),
         ("twoco2", "Me₂S, two CO₂ and Et₃NH⁺Cl⁻", "Count oxygens: two CO₂ need one more O than the reagents supply.")],
        good[0] if len(good) == 1 else None, "good",
        "The Swern trades DMSO's oxygen for two of the alcohol's H atoms and sheds small gases.",
        prov("mass balance computed atom by atom and charge over each candidate set", OXI),
        lead("CS(C)=O", "(methanesulfinyl)methane", "DMSO, the Swern oxidant"), concepts=OXL)

    s = S["pentanol"]
    mild, strong = oxidize(s, False)[0], oxidize(s, True)[0]
    names = {canon("CCCCC=O"): "pentanal", canon("CCCCC(=O)O"): "pentanoic acid"}
    pair_key = (names.get(mild), names.get(strong))
    opts = {"split": ("pentanal", "pentanoic acid"), "acid": ("pentanoic acid", "pentanoic acid"), "ald": ("pentanal", "pentanal")}
    mcq(node, "u5-sw-pair", "Pentan-1-ol: Swern in one flask, Jones in another. Pick the two products.",
        [("split", "Pentanal, then pentanoic acid", "Swern is dry and mild: aldehyde. Jones has water: the aldehyde hydrate is oxidised again to the acid."),
         ("acid", "Pentanoic acid from both", "Swern has no water, so no hydrate forms and the aldehyde survives."),
         ("ald", "Pentanal from both", "Jones runs in aqueous acid, which lets the aldehyde go on to the acid.")],
        key_word(opts, pair_key), "split",
        "This is the near miss pair: same alcohol, mild versus strong oxidant, two different answers.",
        prov("Rule O run twice, mild and strong", OXI),
        lead(s, "pentan-1-ol", "pentan-1-ol, two oxidants"), level=2, concepts=OXL)

    s = "OCCc1ccccc1"
    pick(node, "u5-sw-tempo", "2-Phenylethan-1-ol meets TEMPO with NaOCl. Pick the product.",
         [("ald", "O=CCc1ccccc1", "2-phenylacetaldehyde", "2-Phenylacetaldehyde",
           "TEMPO is a mild, selective oxidant: the primary CH₂OH becomes CHO and the ring is untouched."),
          ("acid", "OC(=O)Cc1ccccc1", "2-phenylacetic acid", "2-Phenylacetic acid",
           "Stopping at the aldehyde is the point of the mild reagents. Going on to the acid takes a strong aqueous oxidant."),
          ("ket", "CC(=O)c1ccccc1", "1-phenylethan-1-one", "Acetophenone",
           "That puts C=O on the benzylic carbon, which holds no O here. Oxidation stays on the C-OH carbon.")],
         no_rxn(s, oxidize(s, strong=False)), "ald",
         "TEMPO joins PCC, Swern and Dess-Martin: primary alcohol to aldehyde.",
         prov("Rule O: one level for a mild oxidant", OXI, "TEMPO with bleach belongs with the mild oxidants"),
         lead(s, "2-phenylethan-1-ol", "2-phenylethanol + TEMPO, NaOCl"), concepts=OXL)


# ---------------------------------------------------------------------------
# u5-alkoxymerc (side quest)
# ---------------------------------------------------------------------------

def node_alkoxymerc() -> None:
    node = "u5-alkoxymerc"
    s = "C=CC"
    pick(node, "u5-am-meet", "Propene: Hg(OAc)₂ in CH₃OH, then NaBH₄. Pick the product.",
         [("mark", markovnikov(s, "OC", False), "2-methoxypropane", "2-Methoxypropane",
           "Methanol attacks the mercurinium ion at the carbon that holds + charge better, the CH. NaBH₄ then swaps Hg for H."),
          ("anti", "COCCC", "1-methoxypropane", "1-Methoxypropane",
           "That is anti-Markovnikov. Alkoxymercuration puts OR on the more substituted carbon."),
          ("alc", "CC(C)O", "propan-2-ol", "Propan-2-ol",
           "The solvent is methanol, so the O that adds carries a CH₃. Water would give the alcohol.")],
         [markovnikov(s, "OC", False)], "mark",
         "Alkoxymercuration-demercuration makes a Markovnikov ether with no rearrangement.",
         prov("Rule M: OR to the alkene carbon with more carbon neighbours, H to the other, no shift", ETH),
         lead(s, "propene", "propene, Hg(OAc)₂, CH₃OH, then NaBH₄"), level=0, concepts=REARR)

    s = "C=C(C)C"
    pick(node, "u5-am-tert", "2-Methylpropene: Hg(OAc)₂ in ethanol, then NaBH₄. Pick the product.",
         [("mark", markovnikov(s, "OCC", False), "2-ethoxy-2-methylpropane", "2-Ethoxy-2-methylpropane",
           "Ethanol bonds to the carbon carrying two methyls, the one best able to hold the partial + charge."),
          ("anti", "CCOCC(C)C", "1-ethoxy-2-methylpropane", "1-Ethoxy-2-methylpropane",
           "OR on the CH₂ end is the anti-Markovnikov pattern, which this reaction does not give."),
          ("alc", "CC(C)(C)O", "2-methylpropan-2-ol", "2-Methylpropan-2-ol",
           "Ethanol is the nucleophile here, so an ethoxy group adds, not OH.")],
         [markovnikov(s, "OCC", False)], "mark",
         "OR goes where H⁺ would put the cation: the more substituted carbon.",
         prov("Rule M: OR to the alkene carbon with more carbon neighbours", ETH),
         lead(s, "2-methylprop-1-ene", "2-methylpropene, Hg(OAc)₂, EtOH, then NaBH₄"), concepts=REARR)

    s = S["mecyhexene"]
    pick(node, "u5-am-ring", "1-Methylcyclohexene: Hg(OAc)₂ in CH₃OH, then NaBH₄. Pick the product.",
         [("mark", markovnikov(s, "OC", False), "1-methoxy-1-methylcyclohexane", "1-Methoxy-1-methylcyclohexane",
           "C1 carries the methyl and two ring carbons, so it holds + charge best. Methanol bonds there."),
          ("anti", "COC1CCCCC1C", "1-methoxy-2-methylcyclohexane", "1-Methoxy-2-methylcyclohexane",
           "That puts OCH₃ on the less substituted alkene carbon."),
          ("alc", "CC1(O)CCCCC1", "1-methylcyclohexan-1-ol", "1-Methylcyclohexanol",
           "That is the oxymercuration product in water. In methanol the ether forms.")],
         [markovnikov(s, "OC", False)], "mark",
         "Ring or chain, the same rule: OR to the more substituted carbon.",
         prov("Rule M: OR to the alkene carbon with more carbon neighbours", ETH),
         lead(s, "1-methylcyclohex-1-ene", "1-methylcyclohexene, Hg(OAc)₂, CH₃OH"), concepts=REARR)

    s = "C=CC(C)(C)C"
    hg, acid = markovnikov(s, "OC", False), markovnikov(s, "OC", True)
    pick(node, "u5-am-noshift", "3,3-Dimethylbut-1-ene: Hg(OAc)₂ in CH₃OH, then NaBH₄. Pick the product.",
         [("plain", hg, "2-methoxy-3,3-dimethylbutane", "2-Methoxy-3,3-dimethylbutane",
           "Mercury bridges the two alkene carbons, so no free cation forms and no methyl can shift. OCH₃ lands on C2."),
          ("shift", acid, "2-methoxy-2,3-dimethylbutane", "2-Methoxy-2,3-dimethylbutane",
           "That skeleton needs a methyl shift, which needs a free cation. The mercurinium ion never becomes one."),
          ("anti", "COCCC(C)(C)C", "1-methoxy-3,3-dimethylbutane", "1-Methoxy-3,3-dimethylbutane",
           "OR on the CH₂ is anti-Markovnikov, which this reaction does not give.")],
         [hg], "plain",
         "No free cation, no rearrangement: the reason to choose mercury.",
         prov("Rule M without a shift (mercurinium bridge)", ETH, "the mercurinium ion does not rearrange"),
         lead(s, "3,3-dimethylbut-1-ene", "3,3-dimethylbut-1-ene, Hg(OAc)₂, CH₃OH"), level=2, concepts=REARR)

    pick(node, "u5-am-acid", "3,3-Dimethylbut-1-ene meets CH₃OH with H₂SO₄. Pick the major product.",
         [("shift", acid, "2-methoxy-2,3-dimethylbutane", "2-Methoxy-2,3-dimethylbutane",
           "Acid makes a free secondary cation next to a carbon with three methyls. A methyl shifts to make it tertiary, then methanol bonds."),
          ("plain", hg, "2-methoxy-3,3-dimethylbutane", "2-Methoxy-3,3-dimethylbutane",
           "That is the mercury result. With acid, a real cation forms and shifts before methanol arrives."),
          ("anti", "COCCC(C)(C)C", "1-methoxy-3,3-dimethylbutane", "1-Methoxy-3,3-dimethylbutane",
           "Protonation puts H on the CH₂ end, so OR never goes there.")],
         [acid], "shift",
         "Acid-catalysed ether formation can rearrange; alkoxymercuration cannot.",
         prov("Rule M with Rule C's shift test", ETH),
         lead(s, "3,3-dimethylbut-1-ene", "3,3-dimethylbut-1-ene, CH₃OH, H₂SO₄"), level=2, concepts=REARR)

    s = "C=Cc1ccccc1"
    pick(node, "u5-am-styrene", "Styrene: Hg(OAc)₂ in CH₃OH, then NaBH₄. Pick the product.",
         [("mark", markovnikov(s, "OC", False), "(1-methoxyethyl)benzene", "(1-Methoxyethyl)benzene",
           "The carbon next to the ring holds + charge best, so methanol bonds there."),
          ("anti", "COCCc1ccccc1", "(2-methoxyethyl)benzene", "(2-Methoxyethyl)benzene",
           "OCH₃ on the end CH₂ is anti-Markovnikov."),
          ("alc", "CC(O)c1ccccc1", "1-phenylethan-1-ol", "1-Phenylethanol",
           "Methanol is the solvent and the nucleophile, so the product is an ether, not an alcohol.")],
         [markovnikov(s, "OC", False)], "mark",
         "The benzylic carbon is the more substituted alkene carbon here.",
         prov("Rule M: OR to the alkene carbon with more carbon neighbours", ETH),
         lead(s, "ethenylbenzene", "styrene, Hg(OAc)₂, CH₃OH"), concepts=REARR)


# ---------------------------------------------------------------------------
# u5-cleavage (side quest): ethers with HX
# ---------------------------------------------------------------------------

def node_cleavage() -> None:
    node = "u5-cleavage"
    s = "CCOCC"
    got = ether_cleave(s, "I", excess=True)
    pick(node, "u5-cl-meet", "Ethoxyethane is heated with excess HI. Pick the organic product.",
         [("ei", "CCI", "iodoethane", "Iodoethane (two of them)",
           "HI protonates the O, iodide cuts one C-O bond, and the ethanol made is turned into iodoethane by more HI."),
          ("eoh", "CCO", "ethanol", "Ethanol",
           "With one equivalent, ethanol would be left. Excess HI converts it to iodoethane too."),
          ("ene", "C=C", "ethene", "Ethene",
           "Iodide is an excellent nucleophile and a weak base. It substitutes.")],
         got, "ei",
         "Excess HX turns every alkyl C-O into C-X.",
         prov("Rule X with excess HX: every sp3 C-O cut, alcohols carried on to C-I", CLV),
         lead(s, "ethoxyethane", "diethyl ether + excess HI, heat"), level=0, concepts=LG)

    s = "COc1ccccc1"
    got = ether_cleave(s, "I", excess=True)
    pick(node, "u5-cl-aryl", "Methoxybenzene is heated with excess HI. Pick the aromatic product.",
         [("phenol", "Oc1ccccc1", "phenol", "Phenol",
           "Iodide attacks the CH₃ carbon. The ring carbon is sp² and cannot be attacked from behind, so the O stays on the ring."),
          ("phi", "Ic1ccccc1", "iodobenzene", "Iodobenzene",
           "That needs substitution at the ring carbon, which neither SN2 nor SN1 can do."),
          ("ring", "COc1ccc(I)cc1", "1-iodo-4-methoxybenzene", "4-Iodoanisole",
           "HI cleaves ethers; it does not put iodine on the ring.")],
         got, "phenol",
         "Aryl alkyl ethers cleave to a phenol and an alkyl halide, never an aryl halide.",
         prov("Rule X: aryl C-O never cut, the methyl C-O cut", CLV),
         lead(s, "methoxybenzene", "anisole + excess HI, heat"), concepts=LG)

    s = "CCOC"
    got = ether_cleave(s, "I", excess=False)
    halide = [p for p in got if "I" in p]
    pick(node, "u5-cl-sn2", "Methoxyethane meets one equivalent of HI. Pick the alkyl iodide formed.",
         [("mei", "CI", "iodomethane", "Iodomethane",
           "Neither carbon can make a stable cation, so iodide attacks by SN2 at the less crowded one, the CH₃."),
          ("eti", "CCI", "iodoethane", "Iodoethane",
           "SN2 favours the least hindered carbon. CH₃ beats CH₂."),
          ("none", s, "methoxyethane", "No reaction",
           "HI is strong enough to protonate the ether, and iodide is an excellent nucleophile. The cleavage goes.")],
         halide if halide else None, "mei",
         "With one equivalent, cleavage follows SN2: iodide to the smaller group.",
         prov("Rule X, one equivalent: no tertiary carbon, so the less substituted C-O is cut", CLV),
         lead(s, "methoxyethane", "ethyl methyl ether + HI (one equivalent)"), concepts=LG)

    s = "COC(C)(C)C"
    got = ether_cleave(s, "I", excess=False)
    halide = [p for p in got if "I" in p]
    pick(node, "u5-cl-sn1", "2-Methoxy-2-methylpropane meets one equivalent of HI. Pick the alkyl iodide.",
         [("tbu", "CC(C)(C)I", "2-iodo-2-methylpropane", "2-Iodo-2-methylpropane",
           "Protonation lets the tertiary C-O bond break on its own, giving a tertiary cation. Iodide bonds there: SN1."),
          ("mei", "CI", "iodomethane", "Iodomethane",
           "That is the SN2 answer. With a tertiary carbon on one side, the cation route is faster."),
          ("iso", "CC(C)CI", "1-iodo-2-methylpropane", "1-Iodo-2-methylpropane",
           "That puts I on a carbon that was never bonded to O.")],
         halide if halide else None, "tbu",
         "Check for SN1 first: a tertiary carbon on the ether cleaves by cation.",
         prov("Rule X, one equivalent: the tertiary C-O is cut", CLV),
         lead(s, "2-methoxy-2-methylpropane", "tert-butyl methyl ether + HI (one equivalent)"), level=2, concepts=REARR)

    s = "C1CCOC1"
    got = ether_cleave(s, "Br", excess=True)
    pick(node, "u5-cl-thf-excess", "Oxolane (THF) is heated with excess HBr. Pick the product.",
         [("di", "BrCCCCBr", "1,4-dibromobutane", "1,4-Dibromobutane",
           "Cutting a ring C-O bond opens the ring into one chain. Excess HBr then turns the new OH into Br as well."),
          ("one", "OCCCCBr", "4-bromobutan-1-ol", "4-Bromobutan-1-ol",
           "That is where one equivalent stops. Excess HBr carries on to the dibromide."),
          ("mono", "CCCCBr", "1-bromobutane", "1-Bromobutane",
           "Both ends of the chain held the O, so both end up with Br. No C-H forms.")],
         got, "di",
         "A cyclic ether opens to one chain with a group at each end.",
         prov("Rule X with excess HX on a ring", CLV),
         lead(s, "oxolane", "THF + excess HBr, heat"), concepts=LG)

    s = "C1CCOC1"
    got = ether_cleave(s, "I", excess=False)
    pick(node, "u5-cl-thf-one", "Oxolane (THF) meets one equivalent of HI. Pick the product.",
         [("one", "OCCCCI", "4-iodobutan-1-ol", "4-Iodobutan-1-ol",
           "Iodide opens the protonated ring at one CH₂. The other end keeps the O as an OH."),
          ("di", "ICCCCI", "1,4-diiodobutane", "1,4-Diiodobutane",
           "Turning the OH into I needs a second equivalent of HI."),
          ("ene", "C=CCCO", "but-3-en-1-ol", "But-3-en-1-ol",
           "Iodide substitutes; it is far too weak a base to eliminate.")],
         got, "one",
         "One equivalent opens the ring once: a halo alcohol.",
         prov("Rule X, one equivalent, on a ring", CLV),
         lead(s, "oxolane", "THF + HI (one equivalent)"), concepts=LG)


# ---------------------------------------------------------------------------
# u5-diol-cleave (side quest): HIO4
# ---------------------------------------------------------------------------

def node_diol_cleave() -> None:
    node = "u5-diol-cleave"
    s = "CC(O)C(C)O"
    pick(node, "u5-dc-meet", "Butane-2,3-diol meets HIO₄. Pick the product.",
         [("ald", "CC=O", "acetaldehyde", "Ethanal (two of them)",
           "Periodate bridges the two OH groups as a cyclic ester, then cuts the C-C bond between them. Each carbon becomes C=O."),
          ("dione", "CC(=O)C(C)=O", "butane-2,3-dione", "Butane-2,3-dione",
           "That oxidises each C-OH but keeps the C-C bond. Periodate breaks that bond."),
          ("acid", "CC(=O)O", "acetic acid", "Ethanoic acid",
           "Periodate stops at the carbonyl level. It does not add another O to the aldehyde.")],
         diol_cleave(s), "ald",
         "HIO₄ splits a 1,2-diol into two carbonyls.",
         prov("Rule D: the C-C bond between the two C-OH carbons is cut, each C-OH becomes C=O", CUT),
         lead(s, "butane-2,3-diol", "butane-2,3-diol + HIO₄"), level=0, concepts=OXL)

    s = "OC1CCCCC1O"
    pick(node, "u5-dc-ring", "Cyclohexane-1,2-diol meets HIO₄. Pick the product.",
         [("dial", "O=CCCCCC=O", "hexanedial", "Hexanedial",
           "Cutting the bond inside a ring opens it: one six-carbon chain with CHO at each end."),
          ("dione", "O=C1CCCCC1=O", "cyclohexane-1,2-dione", "Cyclohexane-1,2-dione",
           "That keeps the C1-C2 bond. Periodate cleaves it."),
          ("acid", "OC(=O)CCCCC(=O)O", "hexanedioic acid", "Hexanedioic acid",
           "Periodate gives aldehydes from CH(OH) carbons. Going on to acids takes a stronger oxidant.")],
         diol_cleave(s), "dial",
         "A ring diol opens to one chain.",
         prov("Rule D on a ring", CUT),
         lead(s, "cyclohexane-1,2-diol", "cyclohexane-1,2-diol + HIO₄"), concepts=OXL)

    s = "CC(O)C(C)(C)O"
    got = diol_cleave(s)
    ket = [p for p in got if mol(p).HasSubstructMatch(Chem.MolFromSmarts("[#6][CX3](=O)[#6]"))]
    pick(node, "u5-dc-ketone", "2-Methylbutane-2,3-diol meets HIO₄. Pick the ketone formed.",
         [("acetone", "CC(C)=O", "propan-2-one", "Propanone",
           "C2 carries two methyls and an OH. After the cut it keeps both methyls and becomes C=O: acetone."),
          ("butanone", "CCC(C)=O", "butan-2-one", "Butan-2-one",
           "That keeps four carbons together. Periodate cuts the C2-C3 bond, splitting the chain."),
          ("hk", "CC(=O)C(C)(C)O", "3-hydroxy-3-methylbutan-2-one", "3-Hydroxy-3-methylbutan-2-one",
           "Oxidising one OH without the cut is not what periodate does. It cleaves.")],
         ket, "acetone",
         "Each carbinol carbon keeps its other groups: two alkyls give a ketone, one gives an aldehyde.",
         prov("Rule D, products read by SMARTS", CUT),
         lead(s, "2-methylbutane-2,3-diol", "2-methylbutane-2,3-diol + HIO₄"), concepts=OXL)

    cands = {"13": "OCCCO", "12": "OCCO", "23": "CC(O)C(C)O", "ring": "OC1CCCCC1O"}
    inert = [k for k, v in cands.items() if not diol_cleave(v)]
    pick(node, "u5-dc-which", "HIO₄ leaves only one of these diols intact. Pick it.",
         [("13", cands["13"], "propane-1,3-diol", "Propane-1,3-diol",
           "Its OH groups are on C1 and C3. Periodate needs them on neighbouring carbons to form the cyclic ester."),
          ("12", cands["12"], "ethane-1,2-diol", "Ethane-1,2-diol",
           "Neighbouring OH groups: it is cut into two formaldehydes."),
          ("23", cands["23"], "butane-2,3-diol", "Butane-2,3-diol",
           "A 1,2-diol: it is cut into two acetaldehydes."),
          ("ring", cands["ring"], "cyclohexane-1,2-diol", "Cyclohexane-1,2-diol",
           "A 1,2-diol in a ring: it opens to hexanedial.")],
         [cands[inert[0]]] if len(inert) == 1 else None, "13",
         "Periodate cleavage needs a 1,2-diol: OH groups on adjacent carbons.",
         prov("Rule D: SMARTS test for HO-C-C-OH", CUT),
         lead("OCCO", "ethane-1,2-diol", "four diols + HIO₄"), concepts=OXL)

    s = "CC1(O)CCCCC1O"
    pick(node, "u5-dc-keto-ald", "1-Methylcyclohexane-1,2-diol meets HIO₄. Pick the product.",
         [("ka", "CC(=O)CCCCC=O", "6-oxoheptanal", "6-Oxoheptanal",
           "The ring opens. C1, with its methyl, becomes a ketone; C2, with an H, becomes an aldehyde."),
          ("dial", "O=CCCCCCC=O", "heptanedial", "Heptanedial",
           "C1 carries a methyl, not an H, so it cannot become CHO. It becomes a methyl ketone."),
          ("acid", "CC(=O)CCCCC(=O)O", "6-oxoheptanoic acid", "6-Oxoheptanoic acid",
           "Periodate stops at the aldehyde.")],
         diol_cleave(s), "ka",
         "Read each carbinol carbon: with an H it becomes CHO, without one a ketone.",
         prov("Rule D on a ring", CUT),
         lead(s, "1-methylcyclohexane-1,2-diol", "1-methylcyclohexane-1,2-diol + HIO₄"), level=2, concepts=OXL)

    s = "OCC(O)c1ccccc1"
    got = diol_cleave(s)
    arom = [p for p in got if mol(p).HasSubstructMatch(Chem.MolFromSmarts("c"))]
    pick(node, "u5-dc-aryl", "1-Phenylethane-1,2-diol meets HIO₄. Pick the aromatic product.",
         [("bzh", "O=Cc1ccccc1", "benzaldehyde", "Benzaldehyde",
           "The C-C bond between the two carbinol carbons breaks. The ring side keeps one carbon, now CHO; the other leaves as formaldehyde."),
          ("acph", "CC(=O)c1ccccc1", "1-phenylethan-1-one", "Acetophenone",
           "That keeps both carbons together. Periodate cuts between them."),
          ("bzoh", "OC(=O)c1ccccc1", "benzoic acid", "Benzoic acid",
           "Periodate gives the aldehyde, not the acid.")],
         arom, "bzh",
         "Find the C-C bond between the two OH carbons; everything else rides along.",
         prov("Rule D, aromatic piece read by SMARTS", CUT),
         lead(s, "1-phenylethane-1,2-diol", "1-phenylethane-1,2-diol + HIO₄"), concepts=OXL)


# ---------------------------------------------------------------------------
# u5-pinacol (side quest)
# ---------------------------------------------------------------------------

def node_pinacol() -> None:
    node = "u5-pinacol"
    s = "CC(C)(O)C(C)(C)O"
    prod, kind, _ = pinacol(s)
    pick(node, "u5-pn-meet", "Pinacol (2,3-dimethylbutane-2,3-diol) is heated with H₂SO₄. Pick the product.",
         [("one", prod, "3,3-dimethylbutan-2-one", "3,3-Dimethylbutan-2-one",
           "One OH leaves as water, a methyl shifts to the cation, and the other C-OH becomes C=O. That is pinacolone."),
          ("ald", "CC(C)(C)CC=O", "3,3-dimethylbutanal", "3,3-Dimethylbutanal",
           "An aldehyde needs an H on the C=O carbon. The carbon that keeps its O still carries a methyl after the shift, so it becomes a ketone."),
          ("ene", "C=C(C)C(C)(C)O", "2,3-dimethylbut-3-en-2-ol", "2,3-Dimethylbut-3-en-2-ol",
           "Losing H⁺ next to the cation competes, but the shift gives an O-stabilised cation that ends as C=O.")],
         [prod], "one",
         "Pinacol: lose water, shift a group, gain a C=O.",
         prov("Rule R: graph edit for the 1,2-shift, both carbons tertiary so either OH may leave", ROH),
         lead(s, "2,3-dimethylbutane-2,3-diol", "pinacol + H₂SO₄, heat"), level=0, concepts=REARR)

    mcq(node, "u5-pn-moves", "In the pinacol rearrangement of pinacol, pick the group that moves.",
        [("me", "A methyl group", "The carbon next to the cation carries two methyls and an OH. A methyl moves over with its bonding pair."),
         ("h", "A hydride", "No H is on that carbon: it holds two methyls and the OH, so a hydride cannot move."),
         ("oh", "The OH group", "The OH stays put and becomes the C=O. Its lone pair is what stabilises the new cation.")],
        {"C": "me", "H": "h"}.get(kind), "me",
        "The group that moves comes from the carbon that keeps its OH.",
        prov("Rule R: migrating group read off the graph", ROH),
        lead(s, "2,3-dimethylbutane-2,3-diol", "pinacol, H₂SO₄"), concepts=REARR)

    s = "CC(C)(O)CO"
    prod, kind, cat_deg = pinacol(s)
    pick(node, "u5-pn-hshift", "2-Methylpropane-1,2-diol is heated with H₂SO₄. Pick the product.",
         [("ald", prod, "2-methylpropanal", "2-Methylpropanal",
           "The tertiary OH leaves. A hydride moves from the CH₂OH carbon, which becomes CHO."),
          ("ket", "CCC(C)=O", "butan-2-one", "Butan-2-one",
           "That needs the primary OH to leave and a methyl to move. A primary cation does not form."),
          ("ene", "C=C(C)CO", "2-methylprop-2-en-1-ol", "2-Methylprop-2-en-1-ol",
           "With an OH next door, the shift to an O-stabilised cation beats simple loss of H⁺.")],
         [prod], "ald",
         "The tertiary OH leaves; what moves is whatever the other carbon has, here H.",
         prov("Rule R: the OH on the carbon with more carbon neighbours leaves; only H can move", ROH),
         lead(s, "2-methylpropane-1,2-diol", "2-methylpropane-1,2-diol + H₂SO₄"), level=2, concepts=REARR)

    m = mol(s)
    o1, c1, c2, o2 = match_one(s, "[OX2H]-[CX4]-[CX4]-[OX2H]")
    leaves = "tert" if max(cdeg(m, c1), cdeg(m, c2)) == 3 and cdeg(m, c1) != cdeg(m, c2) else None
    mcq(node, "u5-pn-which-oh", "2-Methylpropane-1,2-diol meets H₂SO₄. Pick the OH that leaves.",
        [("tert", "The OH on the tertiary carbon", "Losing that water leaves a tertiary cation, far more stable than a primary one."),
         ("prim", "The OH on the CH₂", "That would leave a primary cation, which is too unstable to form."),
         ("both", "Both leave together", "One water leaves; the other O stays and ends up as the C=O.")],
        leaves, "tert",
        "The leaving OH is the one whose departure makes the better cation.",
        prov("Rule R: carbon neighbours of each C-OH carbon compared", ROH),
        lead(s, "2-methylpropane-1,2-diol", "2-methylpropane-1,2-diol, H⁺"), concepts=REARR)

    s = "OC1(CCCC1)C1(O)CCCC1"
    prod, kind, _ = pinacol(s)
    pick(node, "u5-pn-expand", "1,1'-Bi(cyclopentane)-1,1'-diol is heated with acid. Pick the product.",
         [("spiro", prod, "spiro[4.5]decan-6-one", "Spiro[4.5]decan-6-one",
           "A ring C-C bond is the group that shifts. Its ring grows by one carbon, to six, and keeps the C=O."),
          ("small", "O=C1CCCC12CCCC2", "spiro[4.4]nonan-1-one", "Spiro[4.4]nonan-1-one",
           "That loses a carbon. When a ring bond moves, the ring takes the cation carbon in and grows."),
          ("ene", "OC1(CCCC1)C1=CCCC1", "1-(cyclopent-1-en-1-yl)cyclopentan-1-ol", "Dehydrated, no shift",
           "The shift gives an O-stabilised cation, which wins over losing a ring H.")],
         [prod], "spiro",
         "In a ring, the pinacol shift is a ring expansion.",
         prov("Rule R: the migrating group is a ring C-C bond; graph edit gives the larger ring", ROH),
         lead(s, "[1,1'-bi(cyclopentane)]-1,1'-diol", "the bicyclopentyl diol + H⁺"), level=2, concepts=REARR)

    s = "CC(C)(O)C(C)(C)O"
    prod, _, _ = pinacol(s)
    is_ket = mol(prod).HasSubstructMatch(Chem.MolFromSmarts("[#6][CX3](=O)[#6]"))
    is_ald = mol(prod).HasSubstructMatch(Chem.MolFromSmarts("[CX3H1](=O)"))
    mcq(node, "u5-pn-class", "Pick the functional group pinacol becomes in hot acid.",
        [("ket", "A ketone", "The carbon that keeps its O also keeps a methyl, so the new C=O has carbon on both sides."),
         ("ald", "An aldehyde", "An aldehyde needs an H on the C=O carbon. That carbon carries two methyls before the shift and one after."),
         ("ep", "An epoxide", "The O ends as a C=O, not a three-membered ring.")],
        "ket" if is_ket and not is_ald else ("ald" if is_ald else None), "ket",
        "Pinacol rearrangements end as carbonyls; what is on the C=O carbon decides which kind.",
        prov("Rule R product read by SMARTS", ROH),
        lead(s, "2,3-dimethylbutane-2,3-diol", "pinacol, H⁺, heat"), concepts=REARR)


# ---------------------------------------------------------------------------
# u5-thiols (side quest)
# ---------------------------------------------------------------------------

def node_thiols() -> None:
    node = "u5-thiols"
    cands = {"thiol": "CCS", "sulfide": "CCSCC", "alcohol": "CCO", "sulfoxide": "CS(C)=O"}
    thiols = [k for k, v in cands.items() if mol(v).HasSubstructMatch(Chem.MolFromSmarts("[SX2H1]"))]
    pick(node, "u5-th-meet", "Pick the thiol.",
         [("thiol", cands["thiol"], "ethanethiol", "Ethanethiol",
           "S-H on a carbon: the sulfur cousin of an alcohol."),
          ("sulfide", cands["sulfide"], "(ethylsulfanyl)ethane", "Diethyl sulfide",
           "S between two carbons, no S-H: the sulfur cousin of an ether."),
          ("alcohol", cands["alcohol"], "ethanol", "Ethanol",
           "O-H, not S-H. Same shape, different element."),
          ("sulfoxide", cands["sulfoxide"], "(methanesulfinyl)methane", "Dimethyl sulfoxide",
           "S=O with two carbons: an oxidised sulfide, with no S-H.")],
         [cands[thiols[0]]] if len(thiols) == 1 else None, "thiol",
         "Thiol: R-SH. Sulfide: R-S-R. Sulfoxide and sulfone add one or two S=O.",
         prov("SMARTS test for S-H", THI),
         lead("CCS", "ethanethiol", "sulfur and oxygen compounds"), level=0, concepts=DEPROT)

    s = "CCCCBr"
    c, x = match_one(s, "[CX4]Br")
    pick(node, "u5-th-nash", "1-Bromobutane meets NaSH. Pick the product.",
         [("sh", swap(s, c, x, "S"), "butane-1-thiol", "Butane-1-thiol",
           "HS⁻ is a strong nucleophile and the carbon is primary: clean SN2, Br out, SH in."),
          ("oh", "CCCCO", "butan-1-ol", "Butan-1-ol",
           "The nucleophile is HS⁻, so sulfur bonds to carbon, not oxygen."),
          ("ene", "C=CCC", "but-1-ene", "But-1-ene",
           "HS⁻ is a weak base and a good nucleophile, so it substitutes at a primary carbon.")],
         [swap(s, c, x, "S")], "sh",
         "Thiols are made like alcohols would be by SN2, but with HS⁻.",
         prov("Rule S: SH swapped in for Br", THI),
         lead(s, "1-bromobutane", "1-bromobutane + NaSH"), concepts=DEPROT)

    s = "CI"
    pick(node, "u5-th-sulfide", "Sodium ethanethiolate meets iodomethane. Pick the product.",
         [("ses", swap(s, 0, 1, "SCC"), "(methylsulfanyl)ethane", "Ethyl methyl sulfide",
           "Thiolate S attacks the CH₃ carbon and iodide leaves: a sulfur Williamson."),
          ("dis", "CCSSCC", "(ethyldisulfanyl)ethane", "Diethyl disulfide",
           "An S-S bond needs an oxidant. Here sulfur makes a bond to carbon."),
          ("mesh", "CS", "methanethiol", "Methanethiol",
           "The thiolate brings its ethyl group with it, so the product keeps both carbon groups.")],
         [swap(s, 0, 1, "SCC")], "ses",
         "Thiolate plus methyl or primary halide gives a sulfide.",
         prov("Rule W with sulfur: S onto the halide carbon", THI),
         lead("CC[S-].[Na+]", "sodium ethanethiolate", "sodium ethanethiolate + CH₃I"), concepts=DEPROT)

    s = "CCSCC"
    pick(node, "u5-th-ox1", "Diethyl sulfide meets one equivalent of H₂O₂. Pick the product.",
         [("sox", s_oxidize(s, 1), "(ethanesulfinyl)ethane", "Diethyl sulfoxide",
           "One oxidant, one oxygen: the sulfur gains one S=O."),
          ("sone", s_oxidize(s, 2), "(ethanesulfonyl)ethane", "Diethyl sulfone",
           "A second S=O needs a second equivalent of oxidant."),
          ("thiol", "CCS", "ethanethiol", "Ethanethiol",
           "Oxidation adds O to sulfur. It does not break a C-S bond.")],
         [s_oxidize(s, 1)], "sox",
         "Sulfide, then sulfoxide, then sulfone: one O at a time.",
         prov("one S=O added by graph edit", THI, "one equivalent of H2O2 stops at the sulfoxide"),
         lead(s, "(ethylsulfanyl)ethane", "diethyl sulfide + H₂O₂ (one equivalent)"), concepts=OXL)

    cands = {"sone": "CCS(=O)(=O)CC", "sox": "CCS(=O)CC", "sulfide": "CCSCC", "thiol": "CCS"}
    sones = [k for k, v in cands.items() if s_level(v) == 2]
    pick(node, "u5-th-sulfone", "Pick the sulfone.",
         [("sone", cands["sone"], "(ethanesulfonyl)ethane", "Diethyl sulfone",
           "Two S=O bonds on a sulfur between two carbons: the most oxidised of the four."),
          ("sox", cands["sox"], "(ethanesulfinyl)ethane", "Diethyl sulfoxide",
           "One S=O: a sulfoxide, one step short of the sulfone."),
          ("sulfide", cands["sulfide"], "(ethylsulfanyl)ethane", "Diethyl sulfide",
           "No S=O at all: the sulfide, where oxidation starts."),
          ("thiol", cands["thiol"], "ethanethiol", "Ethanethiol",
           "S-H and no S=O: a thiol.")],
         [cands[sones[0]]] if len(sones) == 1 else None, "sone",
         "Count the S=O bonds: none sulfide, one sulfoxide, two sulfone.",
         prov("S=O bonds counted on each S", THI),
         lead("CCS(=O)CC", "(ethanesulfinyl)ethane", "four sulfur compounds"), concepts=OXL)

    s = "CCS"
    rw = fixed(Chem.CombineMols(mol(s), mol(s)))
    ss = [a.GetIdx() for a in rw.GetAtoms() if a.GetSymbol() == "S"]
    for i in ss:
        set_h(rw, i, -1)
    rw.AddBond(ss[0], ss[1], Chem.BondType.SINGLE)
    disulfide = finish(rw)
    pick(node, "u5-th-disulfide", "Ethanethiol meets Br₂ (a mild oxidant). Pick the product.",
         [("dis", disulfide, "(ethyldisulfanyl)ethane", "Diethyl disulfide",
           "Each S loses its H, and the two sulfurs bond to each other. Two thiols become one disulfide."),
          ("sulfide", "CCSCC", "(ethylsulfanyl)ethane", "Diethyl sulfide",
           "A sulfide has one S. Joining two thiols keeps both sulfurs."),
          ("br", "CCBr", "bromoethane", "Bromoethane",
           "Br₂ oxidises the S-H here. It does not cut the C-S bond.")],
         [disulfide], "dis",
         "Thiols oxidise to disulfides, the S-S link that holds proteins in shape.",
         prov("graph edit: two S-H off, one S-S on", THI, "mild oxidants such as Br2 or I2 couple thiols to disulfides"),
         lead(s, "ethanethiol", "ethanethiol + Br₂"), concepts=OXL)


# ---------------------------------------------------------------------------
# u5-exam: ladders and a board for the checkpoint (unwired, as Units 3 and 4)
# ---------------------------------------------------------------------------

def exam_items() -> None:
    def ox_of(smi: str) -> int:
        m = mol(smi)
        cs = [a.GetIdx() for a in m.GetAtoms() if a.GetSymbol() == "C" and any(n.GetSymbol() == "O" for n in a.GetNeighbors())]
        return max(c_ox_state(smi, c) for c in cs) if cs else c_ox_state(smi, 0)

    cards = [
        ("acid", "Ethanoic acid", "CC(=O)O", "acetic acid", "Three bonds to O on C1: the top of the ladder."),
        ("ald", "Ethanal", "CC=O", "acetaldehyde", "Two bonds to O and one H on C1."),
        ("alc", "Ethanol", "CCO", "ethanol", "One bond to O and two H on C1."),
        ("ane", "Ethane", "CC", "ethane", "No bonds to O: the bottom of the ladder."),
    ]
    ladder("u5-exam", "u5-ox-ladder", cards, lambda s: -ox_of(s),
           "Rank by oxidation level of C1, most oxidised first.",
           "Count bonds to O minus bonds to H on the carbon that changes.",
           "oxidation_level", ("Most oxidised", "Least oxidised"),
           "Rank ethanoic acid, ethanal, ethanol and ethane by the oxidation level of C1, most oxidised first.",
           ("Acid, aldehyde, alcohol, alkane.", "Each step up the ladder swaps a C-H for one more bond to O.",
            "Count bonds to oxygen on C1."),
           [("reversed", ["ane", "alc", "ald", "acid"], "ordering_is_reversed",
             ("The ladder read from the bottom.", "More bonds to O means more oxidised.", "Put the acid first.")),
            ("ald-up", ["ald", "acid", "alc", "ane"], "ordering_one_adjacent_pair_swapped",
             ("Aldehyde above acid.", "The acid has one more bond to O than the aldehyde.", "Compare C1 in the aldehyde and the acid."))],
           "Oxidation level climbs one step per extra bond to oxygen.",
           prov("carbon oxidation state computed per card", OXI),
           OXL, "oxidation_and_reduction_ladder")

    cards = [
        ("me", "CH₃Br", "CBr", "bromomethane", "No carbon neighbours: the back of the C-Br bond is wide open."),
        ("prim", "1-Bromobutane", "CCCCBr", "1-bromobutane", "One carbon neighbour: still open, a little slower."),
        ("sec", "2-Bromobutane", "CCC(C)Br", "2-bromobutane", "Two carbon neighbours crowd the back side: slow, and E2 competes."),
        ("tert", "2-Bromo-2-methylpropane", "CC(C)(C)Br", "2-bromo-2-methylpropane", "Three carbon neighbours block the back side. An alkoxide eliminates instead."),
    ]
    ladder("u5-exam", "u5-wl-ladder", cards, lambda s: cdeg(mol(s), match_one(s, "[CX4]Br")[0]),
           "Rank as Williamson partners for NaOCH₃, best first.",
           "Look at how crowded the C-Br carbon is.",
           "sn2_rate", ("Best partner", "Worst partner"),
           "Rank bromomethane, 1-bromobutane, 2-bromobutane and 2-bromo-2-methylpropane by SN2 rate with methoxide, fastest first.",
           ("Methyl, primary, secondary, tertiary.", "SN2 needs the back of the C-Br bond, and each carbon neighbour blocks more of it.",
            "Count carbon neighbours on the C-Br carbon."),
           [("reversed", ["tert", "sec", "prim", "me"], "ordering_is_reversed",
             ("The SN1 order.", "Cation stability does not matter in SN2; open access to the back side does.", "Put the methyl first.")),
            ("prim-up", ["prim", "me", "sec", "tert"], "ordering_one_adjacent_pair_swapped",
             ("Primary above methyl.", "Methyl has no carbon neighbours at all, so it is the least crowded.", "Compare CH₃Br with the primary halide."))],
           "Williamson works on methyl and primary halides; the rate falls with each carbon neighbour.",
           prov("carbon neighbours of each C-Br carbon counted", ETH, "SN2 rate falls with substitution at the attacked carbon"),
           DEPROT, "ethers")

    cards = [
        ("sone", "Diethyl sulfone", "CCS(=O)(=O)CC", "(ethanesulfonyl)ethane", "Two S=O: the most oxidised sulfur here."),
        ("sox", "Diethyl sulfoxide", "CCS(=O)CC", "(ethanesulfinyl)ethane", "One S=O."),
        ("sulfide", "Diethyl sulfide", "CCSCC", "(ethylsulfanyl)ethane", "No S=O: where oxidation starts."),
    ]
    ladder("u5-exam", "u5-s-ladder", cards, lambda s: -s_level(s),
           "Rank by how oxidised the sulfur is, most first.",
           "Count S=O bonds.",
           "oxidation_level", ("Most oxidised", "Least oxidised"),
           "Rank diethyl sulfone, diethyl sulfoxide and diethyl sulfide by sulfur oxidation level, most oxidised first.",
           ("Sulfone, sulfoxide, sulfide.", "Each oxidation adds one S=O.", "Count S=O bonds on each sulfur."),
           [("reversed", ["sulfide", "sox", "sone"], "ordering_is_reversed",
             ("The ladder read from the bottom.", "More S=O bonds means more oxidised.", "Put the sulfone first.")),
            ("sox-up", ["sox", "sone", "sulfide"], "ordering_one_adjacent_pair_swapped",
             ("Sulfoxide above sulfone.", "The sulfone has one more S=O.", "Compare the sulfoxide and the sulfone."))],
           "Sulfur climbs its own ladder: sulfide, sulfoxide, sulfone.",
           prov("S=O bonds counted per card", THI),
           OXL, "oxidation_and_reduction_ladder")

    def describe(smi: str, strong: bool) -> str:
        got = oxidize(smi, strong)
        if not got:
            return "no reaction"
        p = mol(got[0])
        if p.HasSubstructMatch(Chem.MolFromSmarts("[CX3](=O)[OX2H]")):
            return "carboxylic acid"
        if p.HasSubstructMatch(Chem.MolFromSmarts("[CX3H1](=O)")):
            return "aldehyde"
        if p.HasSubstructMatch(Chem.MolFromSmarts("[#6][CX3](=O)[#6]")):
            return "ketone"
        return "other"

    pairs = [
        ("p-pcc", "primary alcohol + PCC", "aldehyde", "PCC moves one level and has no water to make the hydrate.", describe(S["butanol"], False)),
        ("p-jones", "primary alcohol + Jones", "carboxylic acid", "Jones runs in water, so the aldehyde goes on to the acid.", describe(S["butanol"], True)),
        ("s-pcc", "secondary alcohol + PCC", "ketone", "One C-H on the carbinol carbon: one level, and it stops.", describe("CCC(C)O", False)),
        ("t-jones", "tertiary alcohol + Jones", "no reaction", "No C-H on the carbinol carbon, so nothing to remove.", describe(S["tbuoh"], True)),
    ]
    match("u5-exam", "u5-exam-match-ox", "Match each alcohol and oxidant to its product.",
          "Classify the alcohol, then ask if the oxidant stops at one level.", pairs,
          "Primary: aldehyde with a mild oxidant, acid with a strong one. Secondary: ketone. Tertiary: nothing.",
          prov("Rule O applied to each pair, product class read by SMARTS", OXI), OXL)


def build() -> None:
    node_roh_rx()
    node_tosylate()
    node_dehydration()
    node_oxidation()
    node_williamson()
    node_protecting()
    node_epoxidation()
    node_ep_acid()
    node_ep_base()
    node_syn_diol()
    node_anti_diol()
    node_appel()
    node_swern()
    node_alkoxymerc()
    node_cleavage()
    node_diol_cleave()
    node_pinacol()
    node_thiols()
    exam_items()
    check_names()
    for node, entries in POOLS.items():
        if node != "u5-exam" and not 6 <= len(entries) <= 12:
            fail(f"{node}: {len(entries)} items, outside 6 to 12")
    for slot in range(4):
        share = CORRECT_INDEX.count(slot) / max(1, len(CORRECT_INDEX))
        if share > 0.5:
            fail(f"{share:.0%} of MCQs put the answer in slot {slot}")


HEADER = '''/**
 * Unit 5 (alcohols, diols, ethers and epoxides) problem pools, a DRAFT.
 * GENERATED by scripts/u5_pools.py. Do not edit by hand: edit the specs in the
 * script and rerun it.
 *
 * EVERY ENTRY IS A DRAFT (`placeholder: true`) for the owner's review, never
 * presented as done. Each answer was derived by the script (graph edits for
 * substitution, oxidation, cleavage and the pinacol shift; 3D placement for
 * inversion and syn or anti addition, read back by RDKit; mass balance for
 * byproducts; every name read back by OPSIN), and the script refuses to write
 * this file when an authored key disagrees with what it derived. Where an
 * answer rests on an authored convention RDKit cannot check (Zaitsev, which
 * reagents count as mild oxidants, migratory aptitude), the entry's
 * provenance says so.
 *
 * U5_UNWIRED holds the unit's sort ladders and match board under `u5-exam`,
 * which is not a map node. NOTHING PLAYS THEM YET: pool ladders and boards
 * only play in an in-a-row run, Unit 5 has no practice node, and the Unit 5
 * checkpoint keeps its derived mix. Wiring them is an
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
    return body.replace('"u2-pool"', '"u5-pool"')


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
    lessons = [n for n in POOLS if n != "u5-exam"]
    out += emit_table("U5_POOLS", lessons, "/** Lesson pools keyed by map node id. Each lesson plays its MCQs (beats/practice/pools.ts). */")
    out += emit_table("U5_UNWIRED", ["u5-exam"], "/** Ladders and boards drafted for the checkpoint. Nothing plays them yet: see the header. */")
    out.append("/** The drawing beside each MCQ, keyed by beat id. */")
    out.append("export const U5_VISUALS: Readonly<Record<string, McqVisual>> = " + ts(VISUALS) + ";\n")
    out.append("/** Drawn options, keyed by beat id then option id. All or nothing per beat. */")
    out.append("export const U5_OPTION_TILES: Readonly<Record<string, Readonly<Record<string, NamedFigure>>>> = " + ts(TILES) + ";\n")
    out.append("/** A drawing for every sort card, keyed by beat id then item id. */")
    out.append("export const U5_SORT_FIGURES: Readonly<Record<string, Readonly<Record<string, NamedFigure>>>> = " + ts(SORT_FIGURES) + ";\n")
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
