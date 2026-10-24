"""
Unit 10 (amines and diazonium chemistry) problem pools, a DRAFT, derived with RDKit.

Run:     python scripts/u10_pools.py
Writes:  src/game/content/u10/pools.ts (never edit it by hand: edit the specs
         below and rerun). The owner's report for this unit is written by hand
         beside the run, from what this script prints.

Built on scripts/u9_pools.py: the figure, naming, entry and emit basics are
copied from it unchanged. Every entry is `placeholder: true`.

THE MODEL. Check these rules, not the hundred answers. Each is a reaction
SMARTS or a graph edit run by RDKit; the script never types a product.

L. Lone pair class (basicity): an N bonded to a C=O carbon is an amide N, an
   N bonded to an aromatic ring is an aryl N, an aromatic N carrying an H is a
   pyrrole N (lone pair in the sextet), anything else is a localised alkyl N.
   The order alkyl > aryl > amide is the course outline's (a convention).
R. Reductive amination: C=O of an aldehyde or ketone plus an N-H: the O is
   dropped and the carbonyl carbon bonds to N.
D. Reductions: an amide C=O loses its O (C-N kept); a C#N goes to CH2-NH2;
   an aryl NO2 loses both O and becomes NH2.
S. Alkylation at N: an N-H plus a primary C-Br makes N-C. Repeating it until
   N has no H and then once more gives the quaternary salt (over alkylation).
   Azide and cyanide displace the same C-Br. Phthalimide N is alkylated, then
   both C(=O)-N bonds are cut to free R-NH2.
H. Hofmann rearrangement: R-C(=O)NH2 loses the carbonyl carbon and R bonds to
   N. Curtius: R-C(=O)Cl to R-C(=O)N3 to R-N=C=O (N2 out) to R-NH2 (CO2 out).
E. Eliminations: exhaustive methylation then a beta C-H and the C-N+ bond go
   to C=C (every candidate alkene is enumerated; the less substituted one is
   picked by the Hofmann convention). Cope: a tertiary amine's N-oxide, then
   the same edit with R2N-OH leaving.
Z. Diazonium: Ar-NH2 to Ar-N2+, then N2 is replaced by the group the reagent
   table names (a convention), or the terminal N bonds to the ortho/para C of
   an activated ring (azo coupling). Ortho and para are ring positions counted
   by RDKit from the substituent's carbon.
B. Byproducts are keyed by RDKit atom and charge balance: only one candidate
   balances.

Names. Every drawn structure is named, and OPSIN must read the name back as
exactly the drawing.

What is a CONVENTION, flagged in each entry's provenance and printed by the
run: the basicity order, the Sandmeyer reagent table, which ring positions
win (para before ortho), that only a primary aryl amine gives a usable
diazonium salt, that the azo electrophile needs a strongly activated ring,
SN2 wanting a primary halide, the Hofmann (less substituted) alkene, that
NaBH3CN reduces the iminium and not the C=O, that the Hofmann rearrangement
needs C(=O)NH2, and that H2O2 oxidises only a tertiary amine to the N-oxide.
No mechanism (arrows, the migration step, syn geometry of the Cope) is
asserted here; the owner report lists what was left out.

CHECK SOURCE, never adapted: OpenStax Organic Chemistry (CC BY-NC-SA 4.0)
chapters 20, 21 and 24 are NAMED as the check for each entry. They were not
read in this drafting run: the check is owed, and the owner report says so.
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
OUT = REPO / "src" / "game" / "content" / "u10" / "pools.ts"

SCRIPT = "scripts/u10_pools.py"


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
OPSIN_DIR = Path(tempfile.mkdtemp(prefix="u10_opsin_"))


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
    if not id.startswith("u10-"):
        fail(f"{id}: ids start u10-")
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
        "problemId": "u10-pool-" + id,
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
# Unit 10 graph edits (the MODEL in the header). Nothing below types a product.
# ---------------------------------------------------------------------------

def o(id: str, smi: str, name: str, why: str, text: str | None = None) -> tuple[str, str, str, str, str]:
    """One drawn option, as in scripts/u8_pools.py. The text defaults to the name with a capital first letter."""
    if text is None:
        text = name if not name[0].isalpha() or name[:2] in ("N,", "N-") else name[0].upper() + name[1:]
    return (id, smi, name, text, why)



CH_AMINE = "ch. 24"
CH_ACYL = "ch. 21"
CH_NITRILE = "ch. 20"

AMINE = ("amines",)
DIAZO = ("diazonium_chemistry",)
SYN = ("multistep_synthesis",)
EAS = ("eas_directing_effects",)
PKA = ("pka_keq_viability",)
RES = ("resonance_delocalisation",)
EWG = ("ewg_edg_rubric",)
PROT = ("protecting_group_strategy",)
OX = ("oxidation_state_ladder",)

BASIC_CONV = ("basicity order alkyl amine > aryl amine > amide, set by where the N lone pair is delocalised "
              "(the course outline's order)")
SAND_CONV = ("the diazonium reagent table: CuCl gives Cl, CuBr Br, CuCN CN, KI I, HBF4 with heat F, "
             "water with heat OH, H3PO2 H")
DIAZO_CONV = "only a primary aryl amine gives a diazonium salt that lasts long enough to use"
OP_CONV = ("NH2, NHAc, OH and NMe2 direct ortho and para; Br2 on aniline takes every ortho and para C-H; "
           "NHAc and the azo electrophile go para first, ortho when para is taken")
AZO_CONV = "the diazonium ion is a weak electrophile and couples only with a strongly activated ring (OH or NR2 on it)"
OVERALK_CONV = "the product amine is still a nucleophile, so it keeps reacting with the alkyl halide"
SN2_CONV = "SN2 by azide, cyanide or phthalimide wants a primary (or methyl) halide"
HOFE_CONV = "Hofmann elimination of a quaternary ammonium hydroxide gives the less substituted alkene"
CNBH3_CONV = "NaBH3CN reduces the iminium faster than the aldehyde or ketone it came from"
HOFR_CONV = "the Hofmann rearrangement needs a primary amide, C(=O)NH2"
COPE_CONV = "H2O2 oxidises a tertiary amine to its N-oxide; primary and secondary amines are not taken this way"
NITRO_CONV = "Fe or Sn with HCl, or H2 over Pd, reduce an aryl NO2 and leave the ring and a CO2H alone"
LIAL_CONV = "LiAlH4 removes an amide's O and keeps its C-N bond (an ester loses its OR instead)"
RING_CONV = ("a free N lone pair activates the ring most, sharing it with a C=O moderates it, and NO2 "
             "deactivates (the Unit 3 rubric)")
GROUP_CONV = "NO2 is a deactivating meta director and NH2 an activating ortho/para director (the Unit 3 rubric)"
EAS_CONV = ("NO2 directs meta; Br, NHAc and NH2 direct ortho and para, the para product taken as the major one; "
            "Br2 on free aniline takes every ortho and para C-H (the Unit 3 rubric)")
WARM_CONV = "an aryl diazonium salt is kept at 0 to 5 °C; warmer, in water, it loses N2 and water gives the phenol"
NITROSO_CONV = "a secondary amine with NaNO2 and HCl stops at the N-nitrosamine, R2N-N=O: it has no second N-H to lose"
ACYL_CONV = "an amine turns an acyl chloride into an amide (the Unit 8 rule)"


def products(smarts: str, *reactants: str) -> list[str]:
    """Every distinct sanitised first product of one reaction SMARTS, canonical."""
    rxn = AllChem.ReactionFromSmarts(smarts)
    out: set[str] = set()
    for prods in rxn.RunReactants(tuple(mol(r) for r in reactants)):
        p = Chem.Mol(prods[0])
        try:
            p.UpdatePropertyCache(strict=False)
            Chem.SanitizeMol(p)
        except Exception:
            continue
        out.add(Chem.MolToSmiles(p))
    return sorted(out)


def only(got: list[str], what: str) -> str | None:
    if len(got) != 1:
        fail(f"{what}: expected one product, got {got}")
        return None
    return got[0]


def first(got: list[str]) -> str:
    return got[0] if got else "C"


# -- Rule L: where the N lone pair goes

def n_class(smi: str, i: int) -> str:
    m = mol(smi)
    a = m.GetAtomWithIdx(i)
    if a.GetIsAromatic():
        return "pyrrole" if a.GetTotalNumHs() > 0 or a.GetDegree() == 3 else "pyridine"
    for n in a.GetNeighbors():
        if n.GetSymbol() == "C" and any(b.GetBondType() == DOUBLE and b.GetOtherAtom(n).GetSymbol() == "O" for b in n.GetBonds()):
            return "amide"
    if any(n.GetIsAromatic() for n in a.GetNeighbors()):
        return "aryl"
    return "alkyl"


def the_n(smi: str) -> int:
    ns = [a.GetIdx() for a in mol(smi).GetAtoms() if a.GetSymbol() == "N"]
    if len(ns) != 1:
        raise ValueError(f"{smi}: {len(ns)} N atoms")
    return ns[0]


BASIC_RANK = {"alkyl": 0, "aryl": 1, "amide": 2}


def basic_rank(smi: str) -> int:
    return BASIC_RANK[n_class(smi, the_n(smi))]


def n_carbons(smi: str) -> int:
    """C neighbours of the one N: 1 primary, 2 secondary, 3 tertiary, 4 quaternary."""
    return cdeg(mol(smi), the_n(smi))


def carbons(smi: str) -> int:
    return sum(1 for a in mol(smi).GetAtoms() if a.GetSymbol() == "C")


def n_ox(smi: str) -> int:
    """Oxidation state of the one N: its charge, plus one per bond order to O, minus one per bond to C or H."""
    m = mol(smi)
    a = m.GetAtomWithIdx(the_n(smi))
    up = sum(int(b.GetBondTypeAsDouble()) for b in a.GetBonds() if b.GetOtherAtom(a).GetSymbol() == "O")
    down = sum(int(b.GetBondTypeAsDouble()) for b in a.GetBonds() if b.GetOtherAtom(a).GetSymbol() == "C")
    return a.GetFormalCharge() + up - down - a.GetTotalNumHs()


# -- Rule R: reductive amination

RED_AM = "[CX3;!$(C-[!#6;!#1]):1]=[OX1].[NX3;!H0;!$(N-C=O);+0:2]>>[C:1]-[N:2]"


def red_am(carbonyl: str, amine: str) -> str | None:
    got = products(RED_AM, carbonyl, amine)
    return got[0] if len(got) == 1 else None


def imine(carbonyl: str, amine: str) -> str | None:
    return only(products("[CX3;!$(C-[!#6;!#1]):1]=[OX1].[NX3;H2:2]>>[C:1]=[N:2]", carbonyl, amine), "imine")


# -- Rule D: reductions

AMIDE = "[CX3](=[OX1])[NX3]"
AMIDE_RED = "[CX3:1](=[OX1])[NX3:2]>>[C:1][N:2]"
NITRILE_RED = "[C:1]#[N:2]>>[C:1][N:2]"
NITRO_RED = "[c:1][N+:2](=O)[O-]>>[c:1][NH2+0:2]"
CYANIDE = "[CH2:1][Br,I]>>[C:1]C#N"


def repeat(smarts: str, smi: str, until: str) -> str:
    """Run one SMARTS again and again until `until` no longer matches (every site of a group reduced)."""
    out = smi
    while mol(out).HasSubstructMatch(Chem.MolFromSmarts(until)):
        got = products(smarts, out)
        if not got:
            fail(f"{smarts} stalls on {out}")
            return out
        out = got[0]
    return out


def amide_red(smi: str) -> str:
    return repeat(AMIDE_RED, smi, AMIDE)


def nitrile_red(smi: str) -> str:
    return repeat(NITRILE_RED, smi, "C#N")


def nitro_red(smi: str) -> str:
    return repeat(NITRO_RED, smi, "[N+](=O)[O-]")


def cyanide(smi: str) -> str | None:
    return only(products(CYANIDE, smi), f"cyanide on {smi}")


# -- Rule S: alkylation at N

def alkylate_n(amine: str, halide: str) -> str | None:
    """One N-C bond: an N with an H gains R; an N with no H but a lone pair becomes the quaternary salt."""
    got = products("[NX3;!H0;!$(N-C=O);!$(N-a);+0:1].[CX4:2][Br,I]>>[N:1][C:2]", amine, halide)
    if not got:
        got = products("[NX3;H0;!$(N-C=O);!$(N-a);+0:1].[CX4:2][Br,I]>>[N+:1][C:2]", amine, halide)
    return got[0] if len(got) == 1 else None


def exhaust(amine: str, halide: str) -> list[str]:
    """The run of products, one N-C bond at a time, until N has no lone pair left."""
    out = []
    cur = amine
    while True:
        nxt = alkylate_n(cur, halide)
        if nxt is None:
            return out
        out.append(nxt)
        cur = nxt


AZIDE = "[CX4:1][Br,I]>>[C:1]N=[N+]=[N-]"
AZIDE_RED = "[C:1][N:2]=[N+]=[N-]>>[C:1][NH2:2]"


def azide(smi: str) -> str | None:
    return only(products(AZIDE, smi), f"azide on {smi}")


def azide_red(smi: str) -> str | None:
    return only(products(AZIDE_RED, smi), f"azide reduction of {smi}")


PHTHALIMIDE = "O=C1NC(=O)c2ccccc21"
GABRIEL_ALK = "[NX3;H1:1]1C(=O)c2ccccc2C1=O.[CX4:2][Br,I]>>[N:1]1([C:2])C(=O)c2ccccc2C1=O"
GABRIEL_CUT = "[C:2][N:1]1C(=O)c2ccccc2C1=O>>[C:2][NH2:1]"


def gabriel(halide: str) -> tuple[str | None, str | None]:
    n_alk = only(products(GABRIEL_ALK, PHTHALIMIDE, halide), f"phthalimide on {halide}")
    if n_alk is None:
        return None, None
    return n_alk, only(products(GABRIEL_CUT, n_alk), f"hydrazinolysis of {n_alk}")


def halide_class(halide: str) -> str:
    m = mol(halide)
    hits = m.GetSubstructMatches(Chem.MolFromSmarts("[#6][Cl,Br,I]"))
    if len(hits) != 1:
        raise ValueError(f"{halide}: {len(hits)} C-X")
    c = m.GetAtomWithIdx(hits[0][0])
    if c.GetIsAromatic():
        return "aryl"
    return {0: "methyl", 1: "primary", 2: "secondary", 3: "tertiary"}[cdeg(m, c.GetIdx())]


def sn2_ok(halide: str) -> bool:
    return halide_class(halide) in ("methyl", "primary")


# -- Rule H: rearrangements that lose the carbonyl carbon

HOF_R = "[#6:1][CX3](=[OX1])[NX3H2:2]>>[#6:1][N:2]"
ACYL_AZIDE = "[#6:1][CX3:2](=[OX1:3])Cl>>[#6:1][C:2](=[O:3])N=[N+]=[N-]"
ISOCYANATE = "[#6:1][CX3:2](=[OX1:3])[N:4]=[N+]=[N-]>>[#6:1][N:4]=[C:2]=[O:3]"
ISO_WATER = "[#6:1][N:2]=C=O>>[#6:1][NH2:2]"


def hofmann_r(smi: str) -> str | None:
    got = products(HOF_R, smi)
    return got[0] if len(got) == 1 else None


def curtius(acid_chloride: str) -> tuple[str | None, str | None, str | None]:
    a = only(products(ACYL_AZIDE, acid_chloride), f"acyl azide from {acid_chloride}")
    i = only(products(ISOCYANATE, a), f"isocyanate from {a}") if a else None
    n = only(products(ISO_WATER, i), f"amine from {i}") if i else None
    return a, i, n


# -- Rule E: eliminations at N

METHYL_I = "CI"


def quaternary(amine: str) -> tuple[str | None, int]:
    """Exhaustive methylation: the quaternary salt and how many CH3I it took."""
    run = exhaust(amine, METHYL_I)
    return (run[-1] if run else None), len(run)


HOF_E = "[C;!H0:1][C:2][N+:3]([CH3])([CH3])[CH3]>>[C:1]=[C:2]"
COPE_OX = "[NX3;H0;+0;!$(N-C=O);!$(N-a):1]>>[N+:1][O-]"
COPE_E = "[C;!H0:1][C:2][N+:3][O-]>>[C:1]=[C:2]"


def alkene_subst(smi: str) -> int:
    """Heavy-atom substituents on the C=C carbons, the count Zaitsev and Hofmann compare."""
    m = mol(smi)
    hit = m.GetSubstructMatch(Chem.MolFromSmarts("C=C"))
    return sum(m.GetAtomWithIdx(i).GetDegree() - 1 for i in hit)


def hofmann_e(salt: str) -> list[str]:
    return products(HOF_E, salt)


def least_subst(alkenes: list[str]) -> str | None:
    if not alkenes:
        return None
    low = min(alkene_subst(a) for a in alkenes)
    best = [a for a in alkenes if alkene_subst(a) == low]
    return best[0] if len(best) == 1 else None


def n_oxide(amine: str) -> str | None:
    got = products(COPE_OX, amine)
    return got[0] if len(got) == 1 else None


def cope(oxide: str) -> list[str]:
    return products(COPE_E, oxide)


# -- Rule Z: diazonium chemistry

DIAZOTISE = "[c:1][NH2:2]>>[c:1][N+:2]#N"
SAND = {
    "CuCl": "Cl",
    "CuBr": "Br",
    "CuCN": "C#N",
    "KI": "I",
    "HBF4, heat": "F",
    "H2O, heat": "O",
    "H3PO2": None,
}


def diazotise(smi: str) -> str | None:
    got = products(DIAZOTISE, smi)
    return got[0] if len(got) == 1 else None


def replace_n2(diazo: str, reagent: str) -> str | None:
    group = SAND[reagent]
    smarts = f"[c:1][N+]#N>>[c:1]{group}" if group else "[c:1][N+]#N>>[cH:1]"
    return only(products(smarts, diazo), f"{reagent} on {diazo}")


def ring_positions(smi: str, ipso: int) -> dict[str, list[int]]:
    """The benzene ring's other carbons, ortho, meta and para to `ipso`, counted round the ring."""
    m = mol(smi)
    rings = [r for r in m.GetRingInfo().AtomRings() if ipso in r and len(r) == 6]
    if len(rings) != 1:
        raise ValueError(f"{smi}: atom {ipso} is not on one six-membered ring")
    ring = list(rings[0])
    k = ring.index(ipso)

    def at(d: int) -> int:
        return ring[(k + d) % 6]

    return {"ortho": [at(1), at(5)], "meta": [at(2), at(4)], "para": [at(3)]}


DONOR = "[c;$(c-[OX2H1]),$(c-[NX3;+0])]"


def donor_ipso(smi: str) -> int:
    hits = mol(smi).GetSubstructMatches(Chem.MolFromSmarts(DONOR))
    if len(hits) != 1:
        raise ValueError(f"{smi}: {len(hits)} donor ring carbons")
    return hits[0][0]


def with_h(smi: str, idxs: list[int]) -> list[int]:
    m = mol(smi)
    return [i for i in idxs if m.GetAtomWithIdx(i).GetTotalNumHs() > 0]


def put_on(smi: str, sites: list[int], symbol: str) -> str:
    """Replace one H on each listed ring carbon with one atom (Br, Cl)."""
    rw = Chem.RWMol(mol(smi))
    for i in sites:
        j = rw.AddAtom(Chem.Atom(symbol))
        rw.AddBond(i, j, SINGLE)
    return one(rw)


def brominate_op(smi: str, mode: str) -> str:
    """mode 'all': every ortho and para C-H; mode 'para': the para C-H (convention OP_CONV)."""
    pos = ring_positions(smi, donor_ipso(smi))
    if mode == "all":
        return put_on(smi, with_h(smi, pos["ortho"] + pos["para"]), "Br")
    return put_on(smi, with_h(smi, pos["para"]), "Br")


EAS_GROUP = {"Br": "Br", "NO2": "[N+](=O)[O-]"}
META_DIRECTOR = "c[N+](=O)[O-]"


def eas_mono(smi: str, group: str) -> str:
    """
    One EAS step (EAS_CONV) for the order-of-steps items: on benzene any C; on a
    ring with one group, meta to NO2 and para to anything else; Br2 on a free
    aryl NH2 takes every ortho and para C-H (OP_CONV, brominate_op).
    """
    m = mol(smi)
    if group == "Br" and m.HasSubstructMatch(Chem.MolFromSmarts("c[NX3;H2;+0]")):
        return brominate_op(smi, "all")
    ring = benzene_ring(m)
    if ring is None:
        raise ValueError(f"{smi}: no benzene ring")
    subs = [i for i in ring if any(n.GetIdx() not in ring for n in m.GetAtomWithIdx(i).GetNeighbors())]
    if not subs:
        site = ring[0]
    elif len(subs) == 1:
        pos = ring_positions(smi, subs[0])
        site = pos["meta"][0] if m.HasSubstructMatch(Chem.MolFromSmarts(META_DIRECTOR)) else pos["para"][0]
    else:
        raise ValueError(f"{smi}: eas_mono takes a ring with at most one group")
    frag = mol(EAS_GROUP[group])
    rw = Chem.RWMol(Chem.CombineMols(m, frag))
    rw.AddBond(site, m.GetNumAtoms(), SINGLE)
    return one(rw)


def route(start: str, steps: list[str]) -> str | None:
    """Run named steps in order: "NO2" and "Br" (eas_mono), "reduce" (Rule D, nitro), "diazotise", or a SAND reagent."""
    cur: str | None = start
    for step in steps:
        if cur is None:
            return None
        if step in EAS_GROUP:
            cur = eas_mono(cur, step)
        elif step == "reduce":
            cur = nitro_red(cur)
        elif step == "diazotise":
            cur = diazotise(cur)
        else:
            cur = replace_n2(cur, step)
    return canon(cur) if cur else None


NITROSO = "[NX3;H1;+0;!$(N-C=O):1]>>[N:1]N=O"
ACYL_SUB = "[C:1](=[O:2])Cl.[NX3;!H0;+0:3]>>[C:1](=[O:2])[N:3]"


def acylate(amine: str) -> str | None:
    return only(products("[NX3;!H0;!$(N-C=O);+0:1]>>[N:1]C(C)=O", amine), f"Ac2O on {amine}")


def deacylate(amide: str) -> str | None:
    return only(products("[N:1]C(=O)[CH3]>>[N:1]", amide), f"hydrolysis of {amide}")


STRONG_DONOR = "[c;$(c-[OX2H1]),$(c-[NX3;!$(N-C=O);+0])]"


def is_strong_donor_ring(smi: str) -> bool:
    return mol(smi).HasSubstructMatch(Chem.MolFromSmarts(STRONG_DONOR))


def azo(diazo: str, partner: str) -> str | None:
    """Terminal N of Ar-N2+ bonds to the partner's para C, or ortho when para is taken (OP_CONV, AZO_CONV)."""
    if not is_strong_donor_ring(partner):
        return None
    pos = ring_positions(partner, donor_ipso(partner))
    sites = with_h(partner, pos["para"]) or with_h(partner, pos["ortho"])[:1]
    if not sites:
        return None
    m1 = mol(diazo)
    rw = Chem.RWMol(Chem.CombineMols(m1, mol(partner)))
    off = m1.GetNumAtoms()
    inner = [a.GetIdx() for a in m1.GetAtoms() if a.GetSymbol() == "N" and a.GetFormalCharge() == 1][0]
    outer = [n.GetIdx() for n in m1.GetAtomWithIdx(inner).GetNeighbors() if n.GetSymbol() == "N"][0]
    rw.GetAtomWithIdx(inner).SetFormalCharge(0)
    rw.GetBondBetweenAtoms(inner, outer).SetBondType(DOUBLE)
    rw.AddBond(outer, sites[0] + off, SINGLE)
    return one(rw)


def ring_rank(smi: str) -> int:
    """The ring activation ladder's key (RING_CONV): 0 free N lone pair on the ring, 1 shared with C=O, 2 bare, 3 NO2."""
    m = mol(smi)
    if m.HasSubstructMatch(Chem.MolFromSmarts("c[N+](=O)[O-]")):
        return 3
    if m.HasSubstructMatch(Chem.MolFromSmarts("c[NX3]C=O")):
        return 1
    if m.HasSubstructMatch(Chem.MolFromSmarts("c[NX3;+0]")):
        return 0
    return 2


def bond_order_nn(smi: str) -> int:
    m = mol(smi)
    hits = m.GetSubstructMatches(Chem.MolFromSmarts("[#7]~[#7]"))
    if len(hits) != 1:
        raise ValueError(f"{smi}: {len(hits)} N-N bonds")
    b = m.GetBondBetweenAtoms(*hits[0])
    return int(b.GetBondTypeAsDouble())


# -- The course pKa table, read rather than restated (as scripts/u9_pools.py does)

def read_pka_table() -> dict[str, tuple[float, str]]:
    src = (REPO / "packages" / "curriculum" / "src" / "pka.ts").read_text(encoding="utf-8")
    rows = re.findall(r'id: "(\w+)",\s*label: "[^"]*",\s*pka: (-?[\d.]+),\s*source: "(\w+)"', src)
    if len(rows) < 10:
        raise ValueError("could not read PKA_TABLE from packages/curriculum/src/pka.ts")
    return {k: (float(v), s) for k, v, s in rows}


PKA_TABLE = read_pka_table()


def pka(site: str) -> int:
    return round(PKA_TABLE[site][0])


# ---------------------------------------------------------------------------
# Starting materials (each drawn one is named, and OPSIN checks the name)
# ---------------------------------------------------------------------------

S = {
    "aniline": "Nc1ccccc1",
    "chxa": "NC1CCCCC1",
    "mechxa": "CNC1CCCCC1",
    "me2chxa": "CN(C)C1CCCCC1",
    "acetanilide": "CC(=O)Nc1ccccc1",
    "acetamide": "CC(N)=O",
    "pyrrole": "c1cc[nH]c1",
    "chxone": "O=C1CCCCC1",
    "bzald": "O=Cc1ccccc1",
    "acetone": "CC(C)=O",
    "propanal": "CCC=O",
    "ipa": "CC(C)O",
    "bzamine": "NCc1ccccc1",
    "nh3": "N",
    "menh2": "CN",
    "me2nh": "CNC",
    "nitrobenzene": "O=[N+]([O-])c1ccccc1",
    "pnt": "Cc1ccc([N+](=O)[O-])cc1",
    "toluidine": "Cc1ccc(N)cc1",
    "phenol": "Oc1ccccc1",
    "dma": "CN(C)c1ccccc1",
    "etbr": "CCBr",
    "bnbr": "BrCc1ccccc1",
    "bubr": "CCCCBr",
    "benzamide": "NC(=O)c1ccccc1",
    "bzcl": "O=C(Cl)c1ccccc1",
    "pentan2amine": "CC(N)CCC",
}
BZN2 = "N#[N+]c1ccccc1"


def ox_values(a: str, b: str) -> tuple[int, int]:
    return (n_ox(a), n_ox(b))


# ---------------------------------------------------------------------------
# u10-basicity
# ---------------------------------------------------------------------------

CLASS_TEXT = {
    "alkyl": "Localised lone pair",
    "aryl": "Lone pair spread into the ring",
    "amide": "Lone pair shared with C=O",
    "pyrrole": "Lone pair in the aromatic sextet",
}


def node_basicity() -> None:
    """Amine basicity, the unit's opener (audit 23 Oct, top-25 #4): six questions and the amine sort, all from Rule L."""
    node = "u10-basicity"
    opts = {"chxa": S["chxa"], "anil": S["aniline"], "amide": S["acetamide"]}
    low = min(basic_rank(s) for s in opts.values())
    pick(node, "u10-bas-meet", "Pick the strongest base of the three.",
         [o("chxa", S["chxa"], "cyclohexanamine", "Its N carries only alkyl groups, so the lone pair stays on N, fully available to a proton."),
          o("anil", S["aniline"], "aniline", "The lone pair is spread into the benzene ring by resonance, so less of it is available to a proton."),
          o("amide", S["acetamide"], "acetamide", "The lone pair is shared with the C=O. An amide N barely acts as a base.")],
         [s for s in opts.values() if basic_rank(s) == low], "chxa",
         "Alkyl amine above aryl amine above amide: the more the lone pair is spread out, the weaker the base.",
         prov("Rule L, the lone pair class of each N", CH_AMINE, BASIC_CONV), lead(S["menh2"], "methanamine", "compare each N with CH₃NH₂"),
         level=0, concepts=AMINE + RES, convention=BASIC_CONV)

    opts = {"anil": S["aniline"], "chxa": S["chxa"], "mechxa": S["mechxa"]}
    high = max(basic_rank(s) for s in opts.values())
    pick(node, "u10-bas-weakest", "Pick the weakest base of the three.",
         [o("anil", S["aniline"], "aniline", "Its lone pair is delocalised into the ring, so it is the one least ready to take a proton."),
          o("chxa", S["chxa"], "cyclohexanamine", "An alkyl amine. Nothing pulls its lone pair away from N."),
          o("mechxa", S["mechxa"], "N-methylcyclohexanamine", "Another alkyl amine, with a localised lone pair like cyclohexanamine's.")],
         [s for s in opts.values() if basic_rank(s) == high], "anil",
         "A ring on N spreads the lone pair out; alkyl groups do not.",
         prov("Rule L, the lone pair class of each N", CH_AMINE, BASIC_CONV), lead(S["chxa"], "cyclohexanamine", "an alkyl amine, for reference"),
         concepts=AMINE + RES, convention=BASIC_CONV)

    two = "NCc1ccc(N)cc1"
    m = mol(two)
    by_class = {n_class(two, a.GetIdx()): a.GetIdx() for a in m.GetAtoms() if a.GetSymbol() == "N"}
    ranked = sorted(by_class, key=lambda c: BASIC_RANK[c])
    derived = ranked[0] if len(ranked) == 2 and BASIC_RANK[ranked[0]] != BASIC_RANK[ranked[1]] else "same"
    ask(node, "u10-bas-two", "4-(Aminomethyl)aniline meets one H⁺. Pick the N it protonates.",
        [("ch2", "The CH₂NH₂ nitrogen", "That N has only sp3 carbon beside it, so its lone pair is localised. It is the stronger base and takes the proton."),
         ("ring", "The NH₂ on the ring", "Its lone pair is spread into the ring, so it holds a proton less well than the other N."),
         ("same", "Both equally", "One N sits on the ring and one is a CH₂ away from it, so their lone pairs are not alike.")],
        {"ch2": "alkyl", "ring": "aryl", "same": "same"}, derived, "ch2",
        "In a molecule with two N, the one whose lone pair is not delocalised is protonated first.",
        prov("Rule L on each N of the molecule", CH_AMINE, BASIC_CONV), lead(two, "4-(aminomethyl)aniline", "two kinds of N"),
        level=2, concepts=AMINE + RES, convention=BASIC_CONV)

    vals = {"ten": pka("ammonium"), "tf": pka("amine_nh"), "five": pka("carboxylic_acid")}
    ask(node, "u10-bas-pka", "Pick the course pKa for the N-H of an alkylammonium ion, R-NH₃⁺.",
        [("ten", f"About {vals['ten']}", "The course table puts the conjugate acid of an alkyl amine near 10, which is why an amine is a useful base."),
         ("tf", f"About {vals['tf']}", "That is an amine N-H losing a proton to make R-NH⁻, a far weaker acid. The table keeps the two apart."),
         ("five", f"About {vals['five']}", "That is a carboxylic acid O-H. An ammonium N-H holds its proton more tightly.")],
        vals, pka("ammonium"), "ten",
        "R-NH₃⁺ near pKa 10; R-NH₂ itself near 35. A stronger amine base has a higher pKa for its conjugate acid.",
        prov("pKa read from packages/curriculum/src/pka.ts", CH_AMINE), lead("C[NH3+]", "methanaminium", "CH₃NH₃⁺"),
        concepts=AMINE + PKA)

    ask(node, "u10-bas-amide", "Acetamide's N is barely basic. Pick the reason.",
        [("shared", "Its lone pair is shared with the C=O", "Resonance moves the N lone pair toward the carbonyl O, so little is left for a proton."),
         ("none", "Its N has no lone pair", "The N has three bonds and still one lone pair. The pair is there, just delocalised."),
         ("ring", "Its lone pair is part of a ring", "Acetamide has no ring at all.")],
        {"shared": "amide", "none": "none", "ring": "pyrrole"}, n_class(S["acetamide"], the_n(S["acetamide"])), "shared",
        "An amide N's lone pair is shared with the C=O, so amides are not basic at N.",
        prov("Rule L, the amide class", CH_AMINE, BASIC_CONV), lead(S["acetamide"], "acetamide", "acetamide"),
        concepts=AMINE + RES, convention=BASIC_CONV)

    rows = [("c", "Cyclohexanamine", S["chxa"], "Only alkyl groups on N, so its lone pair is localised on N."),
            ("a", "Aniline", S["aniline"], "The N sits on the ring, and its lone pair is spread into the ring by resonance."),
            ("m", "Acetamide", S["acetamide"], "The N sits on a C=O, and its lone pair is shared with the carbonyl."),
            ("p", "Pyrrole", S["pyrrole"], "The N is in the aromatic ring and its lone pair is two of the six pi electrons.")]
    pairs = [(pid, left, CLASS_TEXT[n_class(smi, the_n(smi))], why, CLASS_TEXT[n_class(smi, the_n(smi))]) for pid, left, smi, why in rows]
    for _, left, smi, _ in rows:
        check_name(smi, left.lower(), f"u10-bas-match {left}")
    match(node, "u10-bas-match", "Match each compound to where its N lone pair sits.",
          "Where the lone pair goes decides how basic the N is.", pairs,
          "Localised pair: a strong base. Spread into a ring or a C=O, or used in the sextet: a weak one.",
          prov("Rule L run on each card (RDKit aromaticity for pyrrole)", CH_AMINE, BASIC_CONV), AMINE + RES)

    cards = [
        ("chxa", "Cyclohexanamine", S["chxa"], "cyclohexanamine", "Only alkyl groups on N, so its lone pair stays on N, ready for a proton."),
        ("anil", "Aniline", S["aniline"], "aniline", "The N sits on the ring, and its lone pair is spread into the ring by resonance."),
        ("amide", "Acetamide", S["acetamide"], "acetamide", "The N sits on a C=O, and its lone pair is shared with the carbonyl. Barely basic."),
    ]
    ladder(node, "u10-bas-ladder", cards, basic_rank,
           "Rank these three by how strongly they take a proton, strongest base first.",
           "Follow the N lone pair: on N alone, spread into a ring, or shared with a C=O.",
           "basicity", ("Strongest base", "Weakest base"),
           "Rank cyclohexanamine, aniline and acetamide by basicity, strongest base first.",
           ("Cyclohexanamine, aniline, acetamide.", "The more the N lone pair is spread out, the weaker the base.",
            "Ask where the N lone pair can go."),
           [("reversed", ["amide", "anil", "chxa"], "ordering_is_reversed",
             ("The ladder read from the bottom.", "An amide N barely acts as a base; an alkyl N is the strongest here.", "Put cyclohexanamine first.")),
            ("anil-chxa", ["anil", "chxa", "amide"], "ordering_one_adjacent_pair_swapped",
             ("Aniline above cyclohexanamine.", "The ring pulls aniline's lone pair into its pi system; an alkyl N keeps its pair.",
              "Ask whether the N sits on the ring."))],
           "The more the N lone pair is spread out, the weaker the base: alkyl, then aryl, then amide.",
           prov("Rule L, basic_rank per card", CH_AMINE, BASIC_CONV), AMINE + RES, "amines")

    # Level 2 (audit 23 Oct, section 6): two N where neither is an alkyl amine.
    two = "CC(=O)Nc1ccc(N)cc1"
    m = mol(two)
    by_class = {n_class(two, a.GetIdx()): a.GetIdx() for a in m.GetAtoms() if a.GetSymbol() == "N"}
    ranked = sorted(by_class, key=lambda c: BASIC_RANK[c])
    derived = ranked[0] if len(ranked) == 2 and BASIC_RANK[ranked[0]] != BASIC_RANK[ranked[1]] else "same"
    ask(node, "u10-bas-aryl-amide", "N-(4-Aminophenyl)acetamide meets one H⁺. Pick the N it protonates.",
        [("ring", "The NH₂ on the ring", "Its pair is spread into the ring, but the other N shares its pair with a C=O as well. The aryl NH₂ is still the better base."),
         ("amide", "The N-H beside the C=O", "That is an amide N. Its lone pair is shared with the C=O, so it barely acts as a base."),
         ("same", "Both equally", "One N is an aryl amine and one is an amide N, so their lone pairs are not alike.")],
        {"ring": "aryl", "amide": "amide", "same": "same"}, derived, "ring",
        "Aryl amine above amide: even an NH₂ on a ring beats an N that shares its pair with a C=O.",
        prov("Rule L on each N of the molecule", CH_AMINE, BASIC_CONV), lead(two, "N-(4-aminophenyl)acetamide", "two kinds of N"),
        level=2, concepts=AMINE + RES, convention=BASIC_CONV)


# ---------------------------------------------------------------------------
# u10-red-amination
# ---------------------------------------------------------------------------

CNBH3 = {"NaBH3CN": "iminium"}


def node_red_amination() -> None:
    node = "u10-red-amination"
    p = red_am(S["chxone"], S["menh2"])
    pick(node, "u10-ra-meet", "Cyclohexanone meets CH₃NH₂ and NaBH₃CN. Pick the product.",
         [o("amine", p, "N-methylcyclohexanamine", "The amine and ketone make an iminium, and NaBH₃CN delivers H to its carbon. The C=O carbon ends bonded to N."),
          o("alcohol", "OC1CCCCC1", "cyclohexanol", "NaBH₃CN is chosen because it leaves the ketone alone and reduces the iminium instead."),
          o("imine", "CN=C1CCCCC1", "N-cyclohexylidenemethanamine", "That is the C=N on the way. The reductant is in the pot, so the C=N is reduced.")],
         [p], "amine", "Reductive amination: C=O plus N-H, then reduce, gives a new C-N single bond.",
         prov("Rule R", CH_AMINE, CNBH3_CONV), lead(S["chxone"], "cyclohexanone", "CH₃NH₂, NaBH₃CN"),
         level=0, concepts=AMINE, convention=CNBH3_CONV)

    p = red_am(S["bzald"], S["nh3"])
    pick(node, "u10-ra-nh3", "Benzaldehyde meets NH₃ and NaBH₃CN. Pick the product.",
         [o("amine", p, "phenylmethanamine", "The aldehyde carbon bonds to N and gains an H. The product is a primary amine, PhCH₂NH₂."),
          o("alcohol", "OCc1ccccc1", "phenylmethanol", "That is reduction of the C=O itself, which NaBH₃CN avoids."),
          o("imine", "N=Cc1ccccc1", "1-phenylmethanimine", "That C=N is the intermediate, and it is reduced in the same pot.")],
         [p], "amine", "With NH₃ the product is a primary amine.",
         prov("Rule R", CH_AMINE, CNBH3_CONV), lead(S["bzald"], "benzaldehyde", "NH₃, NaBH₃CN"),
         concepts=AMINE, convention=CNBH3_CONV)

    p = red_am(S["chxone"], S["me2nh"])
    pick(node, "u10-ra-2deg", "Cyclohexanone meets (CH₃)₂NH and NaBH₃CN. Pick the product.",
         [o("amine", p, "N,N-dimethylcyclohexanamine", "A secondary amine makes an iminium with no N-H, and its reduction gives a tertiary amine."),
          o("lost", S["mechxa"], "N-methylcyclohexanamine", "Both methyl groups stay on N. Nothing here removes one."),
          o("enamine", "CN(C)C1=CCCCC1", "N,N-dimethylcyclohex-1-en-1-amine", "That enamine forms without a reductant. NaBH₃CN reduces the iminium it is in balance with.")],
         [p], "amine", "A secondary amine gives a tertiary amine.",
         prov("Rule R", CH_AMINE, CNBH3_CONV), lead(S["chxone"], "cyclohexanone", "(CH₃)₂NH, NaBH₃CN"),
         concepts=AMINE, convention=CNBH3_CONV)

    target = "CC(C)NCc1ccccc1"
    opts = {"acetone": S["acetone"], "propanal": S["propanal"], "ipa": S["ipa"]}
    hits = [s for s in opts.values() if red_am(s, S["bzamine"]) == canon(target)]
    pick(node, "u10-ra-retro", "Benzylamine and NaBH₃CN make this amine. Pick the carbonyl partner.",
         [o("acetone", S["acetone"], "propan-2-one", "Its C=O carbon carries two CH₃, so it becomes the CH that holds the N."),
          o("propanal", S["propanal"], "propanal", "The aldehyde carbon is at the chain end, which would put N on a CH₂, not a CH."),
          o("ipa", S["ipa"], "propan-2-ol", "An alcohol has no C=O, so no iminium can form.")],
         hits, "acetone", "Work back: the carbon on N that carries the H came from a C=O carbon.",
         prov("Rule R run forward on each option", CH_AMINE, CNBH3_CONV), lead(target, "N-benzylpropan-2-amine", "the target amine"),
         level=2, concepts=AMINE + SYN, convention=CNBH3_CONV)

    p = red_am(S["bzald"], S["me2nh"])
    ask(node, "u10-ra-class", "Benzaldehyde and (CH₃)₂NH meet NaBH₃CN. Pick the amine class made.",
        [("three", "Tertiary", "N ends with three carbons: two methyls and the new CH₂ from the aldehyde."),
         ("two", "Secondary", "That would need one methyl to leave. Both stay."),
         ("one", "Primary", "A primary amine comes from NH₃, not from (CH₃)₂NH.")],
        {"one": 1, "two": 2, "three": 3}, n_carbons(p), "three",
        "Each reductive amination adds one carbon group to N.",
        prov("Rule R, then the C count on N", CH_AMINE, CNBH3_CONV), lead(S["bzald"], "benzaldehyde", "(CH₃)₂NH, NaBH₃CN"),
        concepts=AMINE, convention=CNBH3_CONV)

    ask(node, "u10-ra-select", "Pick what NaBH₃CN reduces fastest in a reductive amination pot.",
        [("iminium", "The iminium C=N⁺", "The charged C=N⁺ is the better electrophile, and NaBH₃CN is mild enough to wait for it."),
         ("ketone", "The ketone C=O", "If it reduced the ketone first, the pot would make an alcohol and no amine."),
         ("both", "Both at the same rate", "Then half the ketone would be wasted as alcohol. The reagent is chosen to avoid that.")],
        {"iminium": "iminium", "ketone": "ketone", "both": "both"}, CNBH3["NaBH3CN"], "iminium",
        "NaBH₃CN reduces the iminium, not the C=O, so amine and carbonyl can share one pot.",
        prov("the reductant's selectivity, a convention", CH_AMINE, CNBH3_CONV), lead(S["chxone"], "cyclohexanone", "CH₃NH₂, NaBH₃CN"),
        concepts=AMINE, convention=CNBH3_CONV)

    target = "c1ccc(NC2CCCCC2)cc1"
    pairs = {"one": red_am(S["chxone"], S["aniline"]), "ol": red_am("OC1CCCCC1", S["aniline"]), "bz": red_am(S["bzald"], S["chxa"])}
    ask(node, "u10-ra-pair", "Pick the pair that NaBH₃CN joins into this amine.",
        [("one", "Cyclohexanone and aniline", "The ring CH on N was the ketone's C=O carbon. An aryl carbon can never come from a C=O, so the cut goes on the cyclohexyl side."),
         ("ol", "Cyclohexanol and aniline", "An alcohol has no C=O, so no iminium forms and nothing is joined."),
         ("bz", "Cyclohexanamine and benzaldehyde", "That puts a CH₂ between ring and N: N-benzylcyclohexanamine, one carbon too many.")],
        {k: (canon(v) if v else None) for k, v in pairs.items()}, canon(target), "one",
        "Work back from the C-N bond: the carbon on N that carries an H came from a C=O carbon.",
        prov("Rule R run forward on each pair", CH_AMINE, CNBH3_CONV), lead(target, "N-cyclohexylaniline", "the target amine"),
        level=2, concepts=AMINE + SYN, convention=CNBH3_CONV)


# ---------------------------------------------------------------------------
# u10-amide-red
# ---------------------------------------------------------------------------

def node_amide_red() -> None:
    node = "u10-amide-red"
    a = "CN(C)C(=O)c1ccccc1"
    p = amide_red(a)
    pick(node, "u10-ar-meet", "N,N-Dimethylbenzamide meets LiAlH₄, then water. Pick the product.",
         [o("amine", p, "N,N-dimethyl-1-phenylmethanamine", "The C=O oxygen is removed and the carbon becomes CH₂. The C-N bond and both methyls stay."),
          o("alcohol", "OCc1ccccc1", "phenylmethanol", "That would mean losing the N as an ester loses its OR. An amide loses its O instead."),
          o("lost", "CNCc1ccccc1", "N-methyl-1-phenylmethanamine", "LiAlH₄ does not touch the N-methyl groups.")],
         [p], "amine", "LiAlH₄ turns C(=O)N into CH₂N.",
         prov("Rule D, amide", CH_ACYL, LIAL_CONV), lead(a, "N,N-dimethylbenzamide", "LiAlH₄, then H₂O"),
         level=0, concepts=AMINE, convention=LIAL_CONV)

    a = "CCNC(C)=O"
    p = amide_red(a)
    pick(node, "u10-ar-2deg", "N-Ethylacetamide meets LiAlH₄, then water. Pick the product.",
         [o("amine", p, "N-ethylethanamine", "The acetyl C=O becomes CH₂, so N now carries two ethyl groups."),
          o("cut", "CCN", "ethanamine", "The C-N bond is kept. Only the O leaves."),
          o("alcohol", "CCO", "ethanol", "That would need the N to leave, which an amide does not do with LiAlH₄.")],
         [p], "amine", "A secondary amide gives a secondary amine.",
         prov("Rule D, amide", CH_ACYL, LIAL_CONV), lead(a, "N-ethylacetamide", "LiAlH₄, then H₂O"), concepts=AMINE, convention=LIAL_CONV)

    a = "NC(=O)Cc1ccccc1"
    p = amide_red(a)
    pick(node, "u10-ar-carbon", "2-Phenylacetamide meets LiAlH₄, then water. Pick the product.",
         [o("amine", p, "2-phenylethan-1-amine", "Every carbon stays. The C=O carbon becomes the CH₂ next to N."),
          o("short", S["bzamine"], "phenylmethanamine", "One carbon fewer is the Hofmann rearrangement. LiAlH₄ keeps the carbon."),
          o("alcohol", "OCCc1ccccc1", "2-phenylethan-1-ol", "The N stays bonded. Only the O leaves.")],
         [p], "amine", "Amide reduction keeps the carbon count.",
         prov("Rule D, amide", CH_ACYL, LIAL_CONV), lead(a, "2-phenylacetamide", "LiAlH₄, then H₂O"), concepts=AMINE, convention=LIAL_CONV)

    a = "O=C1CCCN1"
    p = amide_red(a)
    pick(node, "u10-ar-lactam", "Pyrrolidin-2-one meets LiAlH₄, then water. Pick the product.",
         [o("ring", p, "pyrrolidine", "The ring C=O becomes CH₂ and the ring stays closed, because the C-N bond is never cut."),
          o("open", "CCCCN", "butan-1-amine", "Opening the ring would need the C-N bond to break, and it does not."),
          o("aminoalc", "NCCCCO", "4-aminobutan-1-ol", "That is the ring opened and the C=O reduced, which an amide does not do here.")],
         [p], "ring", "A cyclic amide gives a cyclic amine.",
         prov("Rule D, amide", CH_ACYL, LIAL_CONV), lead(a, "pyrrolidin-2-one", "LiAlH₄, then H₂O"), concepts=AMINE, convention=LIAL_CONV)

    target = "CCNC1CCCCC1"
    opts = {"acet": "CC(=O)NC1CCCCC1", "form": "O=CNC1CCCCC1", "rev": "CCNC(=O)C1CCCCC1"}
    hits = [s for s in opts.values() if canon(amide_red(s)) == canon(target)]
    pick(node, "u10-ar-retro", "Pick the amide whose LiAlH₄ reduction gives this amine.",
         [o("acet", opts["acet"], "N-cyclohexylacetamide", "Its acetyl C=O becomes the CH₂ of the ethyl group on N."),
          o("form", opts["form"], "N-cyclohexylformamide", "A formyl C=O becomes CH₃, giving N-methyl, one carbon short."),
          o("rev", opts["rev"], "N-ethylcyclohexanecarboxamide", "Here the C=O is on the ring side, so the product has a CH₂ between ring and N.")],
         hits, "acet", "Work back: the CH₂ next to N in the amine was the amide's C=O.",
         prov("Rule D run forward on each option", CH_ACYL, LIAL_CONV), lead(target, "N-ethylcyclohexanamine", "the target amine"),
         level=2, concepts=AMINE + SYN, convention=LIAL_CONV)

    tests = ["CN(C)C(=O)c1ccccc1", "CCNC(C)=O", "NC(=O)Cc1ccccc1"]
    same = all(n_carbons(t) == n_carbons(amide_red(t)) and carbons(t) == carbons(amide_red(t)) for t in tests)
    ask(node, "u10-ar-keep", "Pick what stays the same when LiAlH₄ reduces an amide.",
        [("pattern", "The N's substitution pattern", "N keeps every carbon it had, so a 1°, 2° or 3° amide gives a 1°, 2° or 3° amine."),
         ("co", "The C=O group", "The C=O is the part that changes: it becomes CH₂."),
         ("count", "Nothing, one carbon is lost", "No carbon is lost. Losing one is the Hofmann rearrangement.")],
        {"pattern": True, "co": "co", "count": "count"}, same, "pattern",
        "Same carbons, same N substitution; only the C=O becomes CH₂.",
        prov("Rule D on three amides, then N and C counts compared", CH_ACYL, LIAL_CONV),
        lead("CN(C)C(=O)c1ccccc1", "N,N-dimethylbenzamide", "LiAlH₄, then H₂O"), concepts=AMINE, convention=LIAL_CONV)

    amide = only(products(ACYL_SUB, S["bzcl"], S["me2nh"]), "benzoyl chloride with dimethylamine")
    p = amide_red(amide) if amide else None
    pick(node, "u10-ar-route", "Benzoyl chloride meets (CH₃)₂NH, then LiAlH₄ and water. Pick the product.",
         [o("amine", p, "N,N-dimethyl-1-phenylmethanamine", "The amine makes the amide first, then LiAlH₄ turns its C=O into CH₂. Both methyls stay on N."),
          o("amide", amide, "N,N-dimethylbenzamide", "That is the halfway point. LiAlH₄ then removes the amide's O."),
          o("alcohol", "OCc1ccccc1", "phenylmethanol", "LiAlH₄ gives that from the acyl chloride alone. The amine reacts first, so an amide is what gets reduced.")],
         [p] if p else None, "amine", "Acyl chloride to amide, then amide to amine: two steps, and the new C-N bond is kept.",
         prov("acyl substitution by the amine, then Rule D", CH_ACYL, ACYL_CONV + "; " + LIAL_CONV),
         lead(S["bzcl"], "benzoyl chloride", "(CH₃)₂NH; LiAlH₄, then H₂O"), level=2, concepts=AMINE + SYN, convention=LIAL_CONV)


# ---------------------------------------------------------------------------
# u10-nitrile-red
# ---------------------------------------------------------------------------

def node_nitrile_red() -> None:
    node = "u10-nitrile-red"
    n = "N#Cc1ccccc1"
    p = nitrile_red(n)
    pick(node, "u10-nr-meet", "Benzonitrile meets LiAlH₄, then water. Pick the product.",
         [o("amine", p, "phenylmethanamine", "Two hydrides add to the C≡N carbon. It ends as CH₂ bonded to NH₂."),
          o("anil", S["aniline"], "aniline", "The nitrile carbon is not lost. It becomes the CH₂ between ring and N."),
          o("ald", S["bzald"], "benzaldehyde", "An aldehyde is what a partial reduction and water give. LiAlH₄ goes all the way to the amine.")],
         [p], "amine", "R-C≡N with LiAlH₄ gives R-CH₂-NH₂.",
         prov("Rule D, nitrile", CH_NITRILE), lead(n, "benzonitrile", "LiAlH₄, then H₂O"), level=0, concepts=AMINE)

    cn = cyanide(S["bubr"])
    p = nitrile_red(cn)
    pick(node, "u10-nr-route", "1-Bromobutane meets NaCN, then LiAlH₄ and water. Pick the product.",
         [o("amine", p, "pentan-1-amine", "Cyanide adds one carbon by SN2, and reducing that C≡N gives CH₂NH₂. Four carbons become five."),
          o("short", "CCCCN", "butan-1-amine", "That keeps four carbons. The cyanide carbon stays in the product."),
          o("nitrile", cn, "pentanenitrile", "That is the halfway point. LiAlH₄ reduces the C≡N.")],
         [p], "amine", "NaCN then LiAlH₄: one more carbon, ending in CH₂NH₂.",
         prov("SN2 by cyanide, then Rule D", CH_NITRILE, SN2_CONV), lead(S["bubr"], "1-bromobutane", "NaCN, then LiAlH₄"),
         level=2, concepts=AMINE + SYN, convention=SN2_CONV)

    change = carbons(p) - carbons(S["bubr"])
    ask(node, "u10-nr-count", "1-Bromobutane goes through NaCN, then LiAlH₄. Pick the carbon count change.",
        [("plus", "One more carbon", "The cyanide carbon joins the chain and becomes the CH₂ next to N."),
         ("zero", "No change", "That is the azide route, which adds N and no carbon."),
         ("minus", "One fewer carbon", "Losing a carbon is the Hofmann rearrangement, not this route.")],
        {"plus": 1, "zero": 0, "minus": -1}, change, "plus",
        "The nitrile route lengthens the chain by one.",
        prov("carbon counts of start and product", CH_NITRILE, SN2_CONV), lead(S["bubr"], "1-bromobutane", "NaCN, then LiAlH₄"),
        concepts=AMINE + SYN, convention=SN2_CONV)

    target = "NCCc1ccccc1"
    opts = {"bn": "N#CCc1ccccc1", "ph": "N#Cc1ccccc1", "pr": "N#CCCc1ccccc1"}
    hits = [s for s in opts.values() if canon(nitrile_red(s)) == canon(target)]
    pick(node, "u10-nr-retro", "Pick the nitrile whose LiAlH₄ reduction gives 2-phenylethan-1-amine.",
         [o("bn", opts["bn"], "2-phenylacetonitrile", "Its C≡N carbon becomes the CH₂ next to N, and the ring CH₂ stays: two carbons between ring and N."),
          o("ph", opts["ph"], "benzonitrile", "That gives one CH₂ between ring and N, benzylamine."),
          o("pr", opts["pr"], "3-phenylpropanenitrile", "That gives three CH₂ between ring and N, one too many.")],
         hits, "bn", "Work back: the CH₂ on N was the nitrile carbon.",
         prov("Rule D run forward on each option", CH_NITRILE), lead(target, "2-phenylethan-1-amine", "the target amine"),
         level=2, concepts=AMINE + SYN)

    n = "N#CCCCCC#N"
    p = nitrile_red(n)
    pick(node, "u10-nr-di", "Hexanedinitrile meets excess LiAlH₄, then water. Pick the product.",
         [o("di", p, "hexane-1,6-diamine", "Excess hydride reduces both C≡N groups, so both ends become CH₂NH₂."),
          o("half", "N#CCCCCCN", "6-aminohexanenitrile", "With excess LiAlH₄ the second C≡N is reduced too."),
          o("mono", "CCCCCCN", "hexan-1-amine", "Nothing removes the second N. It ends as a second NH₂.")],
         [p], "di", "Every C≡N is reduced when the hydride is in excess.",
         prov("Rule D at every nitrile", CH_NITRILE), lead(n, "hexanedinitrile", "excess LiAlH₄"), concepts=AMINE)

    made = {n_carbons(nitrile_red(s)) for s in ("N#Cc1ccccc1", "CCCCC#N", "N#CCc1ccccc1")}
    ask(node, "u10-nr-class", "Pick the amine class that every nitrile reduction gives.",
        [("one", "Primary, R-CH₂-NH₂", "The N of a nitrile has only one carbon, and it keeps only that one."),
         ("two", "Secondary", "A secondary amine needs a second carbon on N. A nitrile's N has none to give."),
         ("three", "Tertiary", "A tertiary amine needs three carbons on N. A nitrile's N has one.")],
        {"one": {1}, "two": {2}, "three": {3}}, made, "one",
        "Nitrile reduction is a clean primary amine route.",
        prov("Rule D on three nitriles, then the C count on N", CH_NITRILE), lead("CCCCC#N", "pentanenitrile", "LiAlH₄, then H₂O"),
        concepts=AMINE)


# ---------------------------------------------------------------------------
# u10-nitro-red
# ---------------------------------------------------------------------------

GROUP = [("c[N+](=O)[O-]", "deactivating meta"), ("c[NH2]", "activating o/p")]


def ring_group(smi: str) -> str:
    hits = [g for s, g in GROUP if mol(smi).HasSubstructMatch(Chem.MolFromSmarts(s))]
    return hits[0] if len(hits) == 1 else "none"


def node_nitro_red() -> None:
    node = "u10-nitro-red"
    p = nitro_red(S["nitrobenzene"])
    pick(node, "u10-no-meet", "Nitrobenzene meets Fe and HCl, then base. Pick the product.",
         [o("anil", p, "aniline", "Both O atoms leave and the N gains two H. The ring stays aromatic."),
          o("noso", "O=Nc1ccccc1", "nitrosobenzene", "N=O is partway down. The metal and acid take the N all the way to NH₂."),
          o("chx", S["chxa"], "cyclohexanamine", "The ring is not reduced. Only the nitro group changes.")],
         [p], "anil", "Ar-NO₂ to Ar-NH₂: the standard way onto an aryl amine.",
         prov("Rule D, nitro", CH_AMINE, NITRO_CONV), lead(S["nitrobenzene"], "nitrobenzene", "Fe, HCl, then NaOH"),
         level=0, concepts=AMINE + OX, convention=NITRO_CONV)

    p = nitro_red(S["pnt"])
    pick(node, "u10-no-tol", "1-Methyl-4-nitrobenzene meets H₂ over Pd. Pick the product.",
         [o("tol", p, "4-methylaniline", "NO₂ becomes NH₂ in the same ring position, para to the methyl."),
          o("chx", "CC1CCC(N)CC1", "4-methylcyclohexan-1-amine", "Under these conditions the aromatic ring is left alone."),
          o("lost", "Cc1ccccc1", "toluene", "The N stays on the ring. It is reduced, not removed.")],
         [p], "tol", "Catalytic hydrogenation also reduces Ar-NO₂ to Ar-NH₂.",
         prov("Rule D, nitro", CH_AMINE, NITRO_CONV), lead(S["pnt"], "1-methyl-4-nitrobenzene", "H₂, Pd"),
         concepts=AMINE + OX, convention=NITRO_CONV)

    ox = ox_values(S["nitrobenzene"], nitro_red(S["nitrobenzene"]))
    ask(node, "u10-no-ox", "Nitrobenzene becomes aniline. Pick the change in the N's oxidation state.",
        [("a", "From +3 to −3", "Three bonds to O count +3 for nitro N, plus its charge, minus its C. In aniline N has only C and H bonds: −3."),
         ("b", "From +5 to −3", "+5 is the N of nitric acid. Nitro N bonded to a ring sits at +3."),
         ("c", "From +3 to 0", "Aniline's N carries two H and a C, all less electronegative, so it sits at −3, not 0.")],
        {"a": (3, -3), "b": (5, -3), "c": (3, 0)}, ox, "a",
        "Six electrons gained by N: this is a reduction, as the reagents say.",
        prov("N oxidation state counted from bonds and charge", CH_AMINE), lead(S["nitrobenzene"], "nitrobenzene", "Fe, HCl"),
        concepts=AMINE + OX)

    d = "O=[N+]([O-])c1cccc([N+](=O)[O-])c1"
    p = nitro_red(d)
    pick(node, "u10-no-di", "1,3-Dinitrobenzene meets excess H₂ over Pd. Pick the product.",
         [o("di", p, "benzene-1,3-diamine", "With excess H₂ both nitro groups are reduced, each to NH₂."),
          o("half", "Nc1cccc([N+](=O)[O-])c1", "3-nitroaniline", "That reduces only one. Excess H₂ takes both."),
          o("one", S["aniline"], "aniline", "Neither N is removed. Both stay on the ring as NH₂.")],
         [p], "di", "Every Ar-NO₂ becomes Ar-NH₂.", prov("Rule D at every nitro group", CH_AMINE, NITRO_CONV),
         lead(d, "1,3-dinitrobenzene", "excess H₂, Pd"), concepts=AMINE + OX, convention=NITRO_CONV)

    a = "O=C(O)c1ccc([N+](=O)[O-])cc1"
    p = nitro_red(a)
    pick(node, "u10-no-acid", "4-Nitrobenzoic acid meets Sn and HCl, then neutral workup. Pick the product.",
         [o("paba", p, "4-aminobenzoic acid", "Sn and HCl reduce the nitro group and leave the CO₂H as it was."),
          o("alc", "Nc1ccc(CO)cc1", "(4-aminophenyl)methanol", "Reducing CO₂H to CH₂OH needs LiAlH₄. Metal and acid leave it."),
          o("decarb", S["aniline"], "aniline", "The CO₂H is not lost. Only the nitro group reacts.")],
         [p], "paba", "Metal and acid are selective for Ar-NO₂.", prov("Rule D, nitro, at the one NO₂", CH_AMINE, NITRO_CONV),
         lead(a, "4-nitrobenzoic acid", "Sn, HCl"), concepts=AMINE + OX, convention=NITRO_CONV)

    change = (ring_group(S["nitrobenzene"]), ring_group(nitro_red(S["nitrobenzene"])))
    ask(node, "u10-no-director", "Reducing Ar-NO₂ to Ar-NH₂ changes the ring. Pick how.",
        [("flip", "Deactivating meta to activating o/p", "NO₂ pulls density out and sends E⁺ meta. NH₂ pushes its lone pair in and sends E⁺ ortho and para."),
         ("back", "Activating o/p to deactivating meta", "That is the wrong way round. NO₂ is the deactivating one."),
         ("none", "No change in how it directs", "The two groups direct in opposite ways, which is why the reduction is so useful in a synthesis.")],
        {"flip": ("deactivating meta", "activating o/p"), "back": ("activating o/p", "deactivating meta"), "none": ("same", "same")},
        change, "flip", "One reduction flips a meta director into an ortho/para director.",
        prov("Rule D, then each group read by SMARTS against the Unit 3 table", CH_AMINE, GROUP_CONV),
        lead(S["nitrobenzene"], "nitrobenzene", "Fe, HCl"), concepts=AMINE + EWG, convention=GROUP_CONV)

    phbr = "Brc1ccccc1"
    p = route(phbr, ["NO2", "reduce"])
    pick(node, "u10-no-route", "Bromobenzene: HNO₃ and H₂SO₄, then Sn and HCl. Pick the product.",
         [o("para", p, "4-bromoaniline", "Br directs the NO₂ ortho and para, para mostly, and Sn with HCl then reduces it to NH₂."),
          o("meta", "Nc1cccc(Br)c1", "3-bromoaniline", "Br is an ortho/para director, so the NO₂ does not go meta to it."),
          o("nitro", eas_mono(phbr, "NO2"), "1-bromo-4-nitrobenzene", "That is the halfway point. Sn and HCl reduce the NO₂ to NH₂.")],
         [p] if p else None, "para", "Nitrate where the ring directs, then reduce: the NH₂ lands where the NO₂ went.",
         prov("EAS position counted by RDKit, then Rule D", CH_AMINE, EAS_CONV + "; " + NITRO_CONV),
         lead(phbr, "bromobenzene", "HNO₃, H₂SO₄; Sn, HCl"), level=2, concepts=AMINE + SYN + EAS, convention=EAS_CONV)

    target = "Nc1cccc(Br)c1"
    orders = {"nbr": ["NO2", "Br", "reduce"], "brn": ["Br", "NO2", "reduce"], "nrb": ["NO2", "reduce", "Br"]}
    ask(node, "u10-no-order", "Pick the order that turns benzene into 3-bromoaniline.",
        [("nbr", "Nitrate, brominate, reduce", "NO₂ goes on first and sends the Br meta. Reducing last turns NO₂ into NH₂, meta to Br."),
         ("brn", "Brominate, nitrate, reduce", "Br goes on first and sends the NO₂ para: that makes 4-bromoaniline."),
         ("nrb", "Nitrate, reduce, brominate", "Reducing first gives aniline, and Br₂ then takes all three ortho and para C-H: 2,4,6-tribromoaniline.")],
        {k: route("c1ccccc1", v) for k, v in orders.items()}, canon(target), "nbr",
        "Order sets position: put on the meta director while it is still NO₂, and reduce it last.",
        prov("each order run step by step: EAS position counted by RDKit, Rule D", CH_AMINE, EAS_CONV),
        lead(target, "3-bromoaniline", "the target"),
        brief="Nitrate = HNO₃, H₂SO₄. Brominate = Br₂, FeBr₃. Reduce = Sn, HCl.",
        level=2, concepts=AMINE + SYN + EAS, convention=EAS_CONV)


# ---------------------------------------------------------------------------
# u10-diazonium
# ---------------------------------------------------------------------------

def node_diazonium() -> None:
    node = "u10-diazonium"
    p = diazotise(S["aniline"])
    pick(node, "u10-dz-meet", "Aniline meets NaNO₂ and HCl, cold. Pick the product.",
         [o("dz", p, "benzenediazonium", "The NH₂ becomes N≡N⁺ on the same ring carbon: the diazonium ion."),
          o("nitro", S["nitrobenzene"], "nitrobenzene", "NaNO₂ does not oxidise the N to NO₂. It turns NH₂ into N≡N⁺."),
          o("phenol", S["phenol"], "phenol", "Phenol forms only if the diazonium salt is later warmed in water.")],
         [p], "dz", "Ar-NH₂ with NaNO₂ and HCl at 0 to 5 °C gives Ar-N₂⁺.",
         prov("Rule Z, diazotisation", CH_AMINE, DIAZO_CONV), lead(S["aniline"], "aniline", "NaNO₂, HCl, 0 to 5 °C"),
         level=0, concepts=DIAZO, convention=DIAZO_CONV)

    p = diazotise(S["toluidine"])
    pick(node, "u10-dz-tol", "4-Methylaniline meets NaNO₂ and HCl, cold. Pick the product.",
         [o("dz", p, "4-methylbenzenediazonium", "Only the NH₂ changes. The methyl stays para to the new N≡N⁺."),
          o("lost", BZN2, "benzenediazonium", "The methyl is not touched."),
          o("nitro", S["pnt"], "1-methyl-4-nitrobenzene", "The N is not oxidised to NO₂.")],
         [p], "dz", "The rest of the ring rides along unchanged.", prov("Rule Z, diazotisation", CH_AMINE, DIAZO_CONV),
         lead(S["toluidine"], "4-methylaniline", "NaNO₂, HCl, 0 to 5 °C"), concepts=DIAZO, convention=DIAZO_CONV)

    opts = {"br": "Nc1ccc(Br)cc1", "nme": "CNc1ccccc1", "chx": S["chxa"], "nme2": S["dma"]}
    hits = [s for s in opts.values() if diazotise(s) is not None]
    pick(node, "u10-dz-which", "Pick the amine that gives an aryl diazonium salt with NaNO₂ and HCl.",
         [o("br", opts["br"], "4-bromoaniline", "A primary NH₂ on a ring: both N-H can go, leaving Ar-N≡N⁺."),
          o("nme", opts["nme"], "N-methylaniline", "A secondary amine has only one N-H, so it cannot reach N≡N⁺."),
          o("chx", opts["chx"], "cyclohexanamine", "An alkyl diazonium ion loses N₂ almost at once, so it is never kept as a salt."),
          o("nme2", opts["nme2"], "N,N-dimethylaniline", "A tertiary amine has no N-H at all.")],
         hits, "br", "Only a primary aryl amine gives a usable diazonium salt.",
         prov("Rule Z SMARTS, primary aryl NH₂ only", CH_AMINE, DIAZO_CONV), lead(S["aniline"], "aniline", "NaNO₂, HCl"),
         concepts=DIAZO + AMINE, convention=DIAZO_CONV)

    leave = byproduct([BZN2, "[Cl-]"], ["Clc1ccccc1"], {"n2": "N#N", "nh3": "N", "no2": "O=N[O-]"})
    ask(node, "u10-dz-leaves", "Benzenediazonium becomes chlorobenzene. Pick what leaves.",
        [("n2", "N₂ gas", "Both N atoms leave together as N₂, a very stable molecule. That is why the group is such a good leaving group."),
         ("nh3", "NH₃", "NH₃ would need three H the diazonium group does not have."),
         ("no2", "Nitrite, NO₂⁻", "No O is bonded to the diazonium N. Nitrite was the reagent, not the leaving group.")],
        {"n2": "n2", "nh3": "nh3", "no2": "no2"}, leave, "n2",
        "Ar-N₂⁺ swaps N₂ for a new group.",
        prov("atom and charge balance on the substitution", CH_AMINE), lead(BZN2, "benzenediazonium", "CuCl"), concepts=DIAZO)

    ask(node, "u10-dz-bond", "Pick the bond between the two N atoms in Ar-N₂⁺.",
        [("triple", "A triple bond", "N≡N⁺: the inner N carries the + charge and four bonds, the outer N a lone pair."),
         ("double", "A double bond", "N=N is the azo dye link, made only after coupling."),
         ("single", "A single bond", "N-N single is a hydrazine. The diazonium N are joined much more tightly.")],
        {"triple": 3, "double": 2, "single": 1}, bond_order_nn(BZN2), "triple",
        "Diazonium: N≡N⁺, the same bond as in N₂ itself.", prov("bond order read off the RDKit graph", CH_AMINE),
        lead(BZN2, "benzenediazonium", "Ar-N₂⁺"), concepts=DIAZO)

    target = diazotise("Nc1ccc(Cl)cc1")
    opts = {"p": "Nc1ccc(Cl)cc1", "m": "Nc1cccc(Cl)c1", "nme": "CNc1ccc(Cl)cc1"}
    hits = [s for s in opts.values() if diazotise(s) == target]
    pick(node, "u10-dz-retro", "Pick the amine that NaNO₂ and HCl turn into this diazonium salt.",
         [o("p", opts["p"], "4-chloroaniline", "The N≡N⁺ sits where the NH₂ was, para to the Cl."),
          o("m", opts["m"], "3-chloroaniline", "That puts the Cl meta to the N. Diazotisation moves nothing."),
          o("nme", opts["nme"], "4-chloro-N-methylaniline", "A secondary amine cannot become N≡N⁺.")],
         hits, "p", "Work back: put NH₂ where the N≡N⁺ is.", prov("Rule Z run forward on each option", CH_AMINE, DIAZO_CONV),
         lead(target, "4-chlorobenzenediazonium", "the diazonium salt"), concepts=DIAZO, convention=DIAZO_CONV)

    p = replace_n2(diazotise(S["aniline"]), "H2O, heat")
    pick(node, "u10-dz-warm", "Aniline meets NaNO₂ and HCl at 40 °C in water. Pick the main product.",
         [o("oh", p, "phenol", "Warm, the diazonium salt loses N₂ as fast as it forms, and water takes that ring carbon: phenol."),
          o("dz", BZN2, "benzenediazonium", "That salt is kept only at 0 to 5 °C. At 40 °C in water it does not last."),
          o("cl", "Clc1ccccc1", "chlorobenzene", "Cl⁻ is only the counter-ion. Without CuCl, water is what replaces the N₂.")],
         [p] if p else None, "oh", "Keep it cold: a warm diazonium salt in water turns into the phenol.",
         prov("Rule Z, then water on the diazonium salt", CH_AMINE, WARM_CONV), lead(S["aniline"], "aniline", "NaNO₂, HCl, 40 °C"),
         level=2, concepts=DIAZO, convention=WARM_CONV)

    nme = "CNc1ccccc1"
    p = only(products(NITROSO, nme), "nitrosation of N-methylaniline")
    pick(node, "u10-dz-nitroso", "N-Methylaniline meets NaNO₂ and HCl, cold. Pick the product.",
         [o("nno", p, "N-methyl-N-phenylnitrous amide", "Its one N-H is swapped for N=O. With no second N-H to lose, it stops at this N-nitrosamine.",
            text="PhN(CH₃)-N=O"),
          o("dz", BZN2, "benzenediazonium", "The N-CH₃ bond does not break, so the N can never reach N≡N⁺."),
          o("ring", "CNc1ccc(N=O)cc1", "N-methyl-4-nitrosoaniline", "The N-H is where the N=O goes, not the ring.")],
         [p] if p else None, "nno", "A secondary amine with NaNO₂ and HCl stops at R₂N-N=O, never a diazonium salt.",
         prov("N-nitrosation edit on the one N-H", CH_AMINE, NITROSO_CONV), lead(nme, "N-methylaniline", "NaNO₂, HCl, 0 to 5 °C"),
         level=2, concepts=DIAZO + AMINE, convention=NITROSO_CONV)


# ---------------------------------------------------------------------------
# u10-diazo-sub
# ---------------------------------------------------------------------------

def node_diazo_sub() -> None:
    node = "u10-diazo-sub"
    p = replace_n2(BZN2, "CuCN")
    pick(node, "u10-ds-meet", "Benzenediazonium meets CuCN. Pick the product.",
         [o("cn", p, "benzonitrile", "N₂ leaves and the copper salt delivers CN to that ring carbon."),
          o("cl", "Clc1ccccc1", "chlorobenzene", "The Cl⁻ counter-ion is not the reagent. The copper salt sets the group."),
          o("oh", S["phenol"], "phenol", "OH needs warm water, not CuCN.")],
         [p], "cn", "CuCN on Ar-N₂⁺ gives Ar-CN.", prov("Rule Z, the reagent table", CH_AMINE, SAND_CONV),
         lead(BZN2, "benzenediazonium", "CuCN"), level=0, concepts=DIAZO, convention=SAND_CONV)

    me = diazotise(S["toluidine"])
    p = replace_n2(me, "KI")
    pick(node, "u10-ds-ki", "4-Methylbenzenediazonium meets KI. Pick the product.",
         [o("i", p, "1-iodo-4-methylbenzene", "Iodide replaces N₂ directly. No copper is needed for I."),
          o("oh", "Cc1ccc(O)cc1", "4-methylphenol", "That is the warm water product."),
          o("h", "Cc1ccccc1", "toluene", "That is the H₃PO₂ product.")],
         [p], "i", "KI on Ar-N₂⁺ gives Ar-I.", prov("Rule Z, the reagent table", CH_AMINE, SAND_CONV),
         lead(me, "4-methylbenzenediazonium", "KI"), concepts=DIAZO, convention=SAND_CONV)

    p = replace_n2(me, "H3PO2")
    pick(node, "u10-ds-h", "4-Methylbenzenediazonium meets H₃PO₂. Pick the product.",
         [o("h", p, "toluene", "H₃PO₂ replaces N₂ with H, so the N is gone from the ring altogether."),
          o("nh2", S["toluidine"], "4-methylaniline", "H₃PO₂ does not give the NH₂ back. It removes the N."),
          o("oh", "Cc1ccc(O)cc1", "4-methylphenol", "OH comes from warm water, not H₃PO₂.")],
         [p], "h", "H₃PO₂ deletes the group: the NH₂ was only a temporary director.",
         prov("Rule Z, the reagent table", CH_AMINE, SAND_CONV), lead(me, "4-methylbenzenediazonium", "H₃PO₂"),
         concepts=DIAZO, convention=SAND_CONV)

    nd = diazotise("Nc1cccc([N+](=O)[O-])c1")
    p = replace_n2(nd, "H2O, heat")
    pick(node, "u10-ds-oh", "3-Nitrobenzenediazonium is warmed in water. Pick the product.",
         [o("oh", p, "3-nitrophenol", "Water replaces N₂ with OH. The nitro group stays meta to it."),
          o("nh2", "Nc1cccc([N+](=O)[O-])c1", "3-nitroaniline", "The NH₂ does not come back. Water gives OH."),
          o("h", S["nitrobenzene"], "nitrobenzene", "That is the H₃PO₂ product.")],
         [p], "oh", "Warm water on Ar-N₂⁺ gives a phenol.", prov("Rule Z, the reagent table", CH_AMINE, SAND_CONV),
         lead(nd, "3-nitrobenzenediazonium", "H₂O, heat"), concepts=DIAZO, convention=SAND_CONV)

    tri = brominate_op(S["aniline"], "all")
    p = replace_n2(diazotise(tri), "H3PO2")
    pick(node, "u10-ds-route", "Aniline: excess Br₂, then NaNO₂ and HCl, then H₃PO₂. Pick the product.",
         [o("135", p, "1,3,5-tribromobenzene", "NH₂ sends Br to both ortho and the para carbon, then the N is removed: three Br, each meta to the others."),
          o("124", "Brc1ccc(Br)c(Br)c1", "1,2,4-tribromobenzene", "No direct bromination of benzene puts Br there. The NH₂ set every position."),
          o("one", "Brc1ccccc1", "bromobenzene", "Excess Br₂ on aniline takes all three ortho and para positions.")],
         [p], "135", "NH₂ as a temporary director: place the groups, then delete it.",
         prov("ortho and para counted by RDKit, Rule Z, then the reagent table", CH_AMINE, OP_CONV + "; " + SAND_CONV),
         lead(S["aniline"], "aniline", "Br₂, NaNO₂ and HCl, H₃PO₂"), level=2, concepts=DIAZO + SYN + EAS, convention=OP_CONV)

    target = "Oc1cccc(Br)c1"
    orders = {"nbr": ["NO2", "Br", "reduce", "diazotise", "H2O, heat"],
              "brn": ["Br", "NO2", "reduce", "diazotise", "H2O, heat"],
              "nrb": ["NO2", "reduce", "Br", "diazotise", "H2O, heat"]}
    ask(node, "u10-ds-order", "Pick the order that turns benzene into 3-bromophenol.",
        [("nbr", "Nitrate, brominate, reduce, diazotise, warm", "NO₂ sends the Br meta, then NO₂ becomes NH₂, then N₂⁺, then OH: OH and Br end meta."),
         ("brn", "Brominate, nitrate, reduce, diazotise, warm", "Br first sends the NO₂ para, so the OH ends para to Br: 4-bromophenol."),
         ("nrb", "Nitrate, reduce, brominate, diazotise, warm", "Free aniline takes three Br, so the route ends at 2,4,6-tribromophenol.")],
        {k: route("c1ccccc1", v) for k, v in orders.items()}, canon(target), "nbr",
        "OH cannot go straight onto the meta carbon: place a NO₂, let it direct, then turn it into OH through N₂⁺.",
        prov("each order run step by step: EAS position counted by RDKit, Rule D, Rule Z, the reagent table", CH_AMINE,
             EAS_CONV + "; " + SAND_CONV),
        lead(target, "3-bromophenol", "the target"),
        brief="Nitrate = HNO₃, H₂SO₄. Brominate = Br₂, FeBr₃. Reduce = Sn, HCl. Diazotise = NaNO₂, HCl. Warm = H₂O, heat.",
        level=2, concepts=DIAZO + SYN + EAS, convention=EAS_CONV)

    rows = [("cucl", "CuCl", "chlorobenzene", "Copper chloride delivers Cl, the Sandmeyer reaction."),
            ("cubr", "CuBr", "bromobenzene", "Copper bromide delivers Br."),
            ("cucn", "CuCN", "benzonitrile", "Copper cyanide delivers CN, a new C-C bond."),
            ("ki", "KI", "iodobenzene", "Iodide needs no copper."),
            ("hbf4", "HBF₄, heat", "fluorobenzene", "The tetrafluoroborate salt loses N₂ and BF₃ on heating, leaving F."),
            ("h3po2", "H₃PO₂", "benzene", "H₃PO₂ replaces N₂ with H.")]
    keys = {"cucl": "CuCl", "cubr": "CuBr", "cucn": "CuCN", "ki": "KI", "hbf4": "HBF4, heat", "h3po2": "H3PO2"}
    label_of = {opsin_smiles(name): name[0].upper() + name[1:] for _, _, name, _ in rows}
    pairs = [(pid, left, name[0].upper() + name[1:], why, label_of.get(replace_n2(BZN2, keys[pid]) or "")) for pid, left, name, why in rows]
    match(node, "u10-ds-match", "Match each reagent to what it makes from benzenediazonium.",
          "Each reagent swaps N₂ for a different group. This list is learned member by member.", pairs,
          "Cl, Br, CN with copper; I with KI; F with HBF₄ and heat; H with H₃PO₂.",
          prov("Rule Z run per reagent, product read against OPSIN", CH_AMINE, SAND_CONV), DIAZO)


# ---------------------------------------------------------------------------
# u10-acyl-protect
# ---------------------------------------------------------------------------

def node_acyl_protect() -> None:
    node = "u10-acyl-protect"
    p = acylate(S["aniline"])
    pick(node, "u10-ap-meet", "Aniline meets acetic anhydride. Pick the product.",
         [o("amide", p, "N-phenylacetamide", "The N lone pair attacks the anhydride, and N gains an acetyl group: an amide."),
          o("ring", "CC(=O)c1ccc(N)cc1", "1-(4-aminophenyl)ethan-1-one", "The N is a far better nucleophile than the ring, so the acetyl goes on N."),
          o("ester", "CC(=O)Oc1ccccc1", "phenyl acetate", "Aniline has no O to acylate.")],
         [p], "amide", "Ac₂O turns Ar-NH₂ into Ar-NHAc.", prov("N acylation edit", CH_AMINE),
         lead(S["aniline"], "aniline", "Ac₂O"), level=0, concepts=PROT + AMINE)

    p = brominate_op(S["aniline"], "all")
    pick(node, "u10-ap-over", "Aniline meets excess Br₂. Pick the product.",
         [o("tri", p, "2,4,6-tribromoaniline", "NH₂ activates the ring so strongly that every ortho and para C-H is brominated."),
          o("mono", "Nc1ccc(Br)cc1", "4-bromoaniline", "Stopping at one Br is what the acetyl protection is for. Free aniline runs on."),
          o("meta", "Nc1cccc(Br)c1", "3-bromoaniline", "NH₂ directs ortho and para, not meta.")],
         [p], "tri", "Free aniline is too activated to stop at one Br.",
         prov("ortho and para counted by RDKit", CH_AMINE, OP_CONV), lead(S["aniline"], "aniline", "excess Br₂"),
         concepts=PROT + EAS, convention=OP_CONV)

    p = brominate_op(S["acetanilide"], "para")
    pick(node, "u10-ap-para", "N-Phenylacetamide meets Br₂. Pick the major product.",
         [o("para", p, "N-(4-bromophenyl)acetamide", "NHAc still directs ortho and para, but more gently, and the bulky group favours para. One Br."),
          o("tri", "CC(=O)Nc1c(Br)cc(Br)cc1Br", "N-(2,4,6-tribromophenyl)acetamide", "Sharing the lone pair with C=O calms the ring, so it stops at one Br."),
          o("meta", "CC(=O)Nc1cccc(Br)c1", "N-(3-bromophenyl)acetamide", "NHAc is an ortho/para director, as NH₂ is.")],
         [p], "para", "Protected aniline brominates once, para.",
         prov("para position counted by RDKit", CH_AMINE, OP_CONV), lead(S["acetanilide"], "N-phenylacetamide", "Br₂"),
         concepts=PROT + EAS, convention=OP_CONV)

    p = deacylate(brominate_op(acylate(S["aniline"]), "para"))
    pick(node, "u10-ap-route", "Aniline: Ac₂O, then Br₂, then H₃O⁺ with heat. Pick the product.",
         [o("para", p, "4-bromoaniline", "Protect, brominate once para, then hydrolyse the amide back to NH₂."),
          o("tri", "Nc1c(Br)cc(Br)cc1Br", "2,4,6-tribromoaniline", "That is what happens without the acetyl step."),
          o("amide", "CC(=O)Nc1ccc(Br)cc1", "N-(4-bromophenyl)acetamide", "The last step, acid and heat, removes the acetyl group.")],
         [p], "para", "Protect, react, deprotect.",
         prov("acylation, para bromination, then amide hydrolysis", CH_AMINE, OP_CONV), lead(S["aniline"], "aniline", "Ac₂O; Br₂; H₃O⁺, heat"),
         level=2, concepts=PROT + SYN, convention=OP_CONV)

    ask(node, "u10-ap-why", "Pick why the acetyl group calms the aniline ring.",
        [("shared", "The N lone pair is shared with C=O", "The amide C=O pulls on the lone pair, so less of it pushes into the ring."),
         ("removed", "Acetyl removes the N lone pair", "The lone pair is still on N. It is now spread over N and the C=O."),
         ("meta", "Acetyl makes N a meta director", "NHAc still directs ortho and para. It is only less activating.")],
        {"shared": "amide", "removed": "none", "meta": "meta"}, n_class(S["acetanilide"], the_n(S["acetanilide"])), "shared",
        "Protection works by sharing the lone pair, not removing it.",
        prov("Rule L, the amide class", CH_AMINE, RING_CONV), lead(S["acetanilide"], "N-phenylacetamide", "acetanilide"),
        concepts=PROT + RES, convention=RING_CONV)

    p = deacylate(eas_mono(acylate(S["aniline"]), "NO2"))
    pick(node, "u10-ap-nitro", "Aniline: Ac₂O, then HNO₃ and H₂SO₄, then H₃O⁺ with heat. Pick the product.",
         [o("para", p, "4-nitroaniline", "Protect as NHAc, nitrate once para, then hydrolyse the amide back to NH₂."),
          o("amide", "CC(=O)Nc1ccc([N+](=O)[O-])cc1", "N-(4-nitrophenyl)acetamide", "The last step, acid and heat, removes the acetyl group."),
          o("meta", "Nc1cccc([N+](=O)[O-])c1", "3-nitroaniline", "NHAc directs ortho and para, never meta.")],
         [p] if p else None, "para", "Protect, nitrate para, deprotect.",
         prov("acylation, para nitration, then amide hydrolysis", CH_AMINE, EAS_CONV),
         lead(S["aniline"], "aniline", "Ac₂O; HNO₃, H₂SO₄; H₃O⁺, heat"), level=2, concepts=PROT + SYN + EAS, convention=EAS_CONV)

    cards = [
        ("anil", "Aniline", S["aniline"], "aniline", "A free N lone pair pushes straight into the ring: the most activated."),
        ("acet", "Acetanilide", S["acetanilide"], "N-phenylacetamide", "The lone pair is shared with the C=O, so it activates less."),
        ("bz", "Benzene", "c1ccccc1", "benzene", "No group to push or pull."),
        ("nitro", "Nitrobenzene", S["nitrobenzene"], "nitrobenzene", "NO₂ pulls electron density out: deactivated."),
    ]
    ladder(node, "u10-ap-ladder", cards, ring_rank,
           "Rank by how fast each ring reacts with Br₂, fastest first.",
           "Follow the N lone pair: free, shared with C=O, absent, or replaced by a group that pulls.",
           "ring_activation", ("Most activated", "Least activated"),
           "Rank aniline, acetanilide, benzene and nitrobenzene by ring activation toward EAS, most activated first.",
           ("Aniline, acetanilide, benzene, nitrobenzene.", "Acetylation turns the strongest activator into a moderate one.",
            "Ask how much N lone pair reaches the ring."),
           [("reversed", ["nitro", "bz", "acet", "anil"], "ordering_is_reversed",
             ("The ladder read from the bottom.", "Nitro deactivates; NH₂ activates most.", "Put aniline first.")),
            ("acet-anil", ["acet", "anil", "bz", "nitro"], "ordering_one_adjacent_pair_swapped",
             ("Acetanilide above aniline.", "Sharing the lone pair with C=O lowers the push into the ring.", "Compare a free NH₂ with NHAc."))],
           "Protection moves aniline one rung down the ladder, which is what makes one bromination possible.",
           prov("ring_rank rule per card", CH_AMINE, RING_CONV), EWG + PROT, "amines")


# ---------------------------------------------------------------------------
# u10-direct-alk (branch)
# ---------------------------------------------------------------------------

def node_direct_alk() -> None:
    node = "u10-direct-alk"
    run = exhaust(S["nh3"], S["etbr"])
    pick(node, "u10-da-meet", "NH₃ meets excess bromoethane. Pick where the alkylation ends.",
         [o("quat", run[-1], "tetraethylazanium", "Each new amine is still a nucleophile, so alkylation runs on until N has four ethyls and no lone pair.", text="(CH₃CH₂)₄N⁺, the quaternary salt"),
          o("one", run[0], "ethanamine", "Ethylamine is the first product, and it keeps reacting with the excess bromoethane."),
          o("three", run[2], "N,N-diethylethanamine", "Triethylamine still has a lone pair, so it takes one more ethyl.")],
         [run[-1]], "quat", "With excess R-X, direct alkylation of NH₃ runs to the quaternary salt.",
         prov("Rule S repeated until N has no lone pair", CH_AMINE, OVERALK_CONV), lead(S["etbr"], "bromoethane", "NH₃, excess CH₃CH₂Br"),
         level=0, concepts=AMINE, convention=OVERALK_CONV)

    keeps = alkylate_n(run[0], S["etbr"]) is not None
    ask(node, "u10-da-why", "NH₃ and bromoethane give a mixture of amines. Pick why.",
        [("nu", "The product amine is still a nucleophile", "Ethylamine has a lone pair and N-H, so it competes with NH₃ for the bromoethane."),
         ("none", "NH₃ is not a nucleophile", "NH₃ does attack bromoethane. The trouble is that its product attacks too."),
         ("elim", "Bromoethane eliminates instead", "Elimination is minor with a primary halide and a weak base.")],
        {"nu": True, "none": "none", "elim": "elim"}, keeps, "nu",
        "Over alkylation: every amine product is another nucleophile.",
        prov("Rule S run on the first product", CH_AMINE, OVERALK_CONV), lead(run[0], "ethanamine", "the first product"),
        concepts=AMINE, convention=OVERALK_CONV)

    ask(node, "u10-da-count", "Pick how many N products NH₃ and excess bromoethane can make.",
        [("four", "Four", "Primary, secondary, tertiary and the quaternary salt: one N-C bond added at a time."),
         ("two", "Two", "It does not stop at two. Each product has a lone pair until the fourth."),
         ("one", "One", "One clean product is what Gabriel and the azide route are for.")],
        {"four": 4, "two": 2, "one": 1}, len(run), "four", "One NH₃ can end in any of four products.",
        prov("Rule S repeated, products counted", CH_AMINE, OVERALK_CONV), lead(S["etbr"], "bromoethane", "NH₃, excess CH₃CH₂Br"),
        concepts=AMINE, convention=OVERALK_CONV)

    q = exhaust(S["chxa"], METHYL_I)
    pick(node, "u10-da-mei", "Cyclohexanamine meets excess CH₃I. Pick the product.",
         [o("quat", q[-1], "N,N,N-trimethylcyclohexanaminium", "Three methyls go on, one per step, and the N ends with four carbons and a + charge."),
          o("one", q[0], "N-methylcyclohexanamine", "One methyl is only the first step. Excess CH₃I keeps going."),
          o("two", q[1], "N,N-dimethylcyclohexanamine", "The tertiary amine still has a lone pair for one more CH₃.")],
         [q[-1]], "quat", "Excess CH₃I: exhaustive methylation to R-N(CH₃)₃⁺.",
         prov("Rule S repeated with CH₃I", CH_AMINE, OVERALK_CONV), lead(S["chxa"], "cyclohexanamine", "excess CH₃I"),
         concepts=AMINE, convention=OVERALK_CONV)

    tea = "CCN(CC)CC"
    p = alkylate_n(tea, S["etbr"])
    pick(node, "u10-da-tert", "Triethylamine meets bromoethane. Pick the product.",
         [o("quat", p, "tetraethylazanium", "No N-H, but the lone pair is still there, so it takes a fourth ethyl.", text="(CH₃CH₂)₄N⁺"),
          o("none", tea, "N,N-diethylethanamine", "A tertiary amine is still a nucleophile. It reacts."),
          o("ene", "C=C", "ethene", "Elimination needs a strong base and a hindered halide. Here N attacks carbon.")],
         [p], "quat", "A tertiary amine alkylates once, to the quaternary salt.",
         prov("Rule S", CH_AMINE, OVERALK_CONV), lead(tea, "N,N-diethylethanamine", "CH₃CH₂Br"),
         concepts=AMINE, convention=OVERALK_CONV)

    opts = {"tert": S["me2chxa"], "prim": S["chxa"], "sec": S["mechxa"]}
    once = [s for s in opts.values() if len(exhaust(s, METHYL_I)) == 1]
    pick(node, "u10-da-once", "Pick the amine that CH₃I can alkylate only once.",
         [o("tert", opts["tert"], "N,N-dimethylcyclohexanamine", "No N-H is left, so one CH₃ takes it straight to the quaternary salt."),
          o("prim", opts["prim"], "cyclohexanamine", "Two N-H and a lone pair: it can take three methyls."),
          o("sec", opts["sec"], "N-methylcyclohexanamine", "One N-H and a lone pair: it can take two methyls.")],
         once, "tert", "Count the N-H, then add one for the lone pair.",
         prov("Rule S repeated, steps counted", CH_AMINE, OVERALK_CONV), lead("CI", "iodomethane", "CH₃I"),
         concepts=AMINE, convention=OVERALK_CONV)


# ---------------------------------------------------------------------------
# u10-gabriel (branch)
# ---------------------------------------------------------------------------

def node_gabriel() -> None:
    node = "u10-gabriel"
    nbn, bn = gabriel(S["bnbr"])
    pick(node, "u10-gb-meet", "Phthalimide meets KOH, then benzyl bromide. Pick the product.",
         [o("nalk", nbn, "2-benzylisoindole-1,3-dione", "The phthalimide anion's N attacks the CH₂Br carbon. N gains a benzyl."),
          o("amine", bn, "phenylmethanamine", "The amine is freed only in the next step, with hydrazine."),
          o("none", PHTHALIMIDE, "isoindole-1,3-dione", "The deprotonated N is a good nucleophile, so the SN2 does happen.")],
         [nbn], "nalk", "Step one: N-alkyl phthalimide.", prov("Rule S, phthalimide", CH_AMINE, SN2_CONV),
         lead(PHTHALIMIDE, "isoindole-1,3-dione", "KOH, then PhCH₂Br"), level=0, concepts=AMINE, convention=SN2_CONV)

    pick(node, "u10-gb-free", "2-Benzylisoindole-1,3-dione meets hydrazine, N₂H₄. Pick the amine.",
         [o("amine", bn, "phenylmethanamine", "Both C(=O)-N bonds are cut and the N leaves with its one benzyl as PhCH₂NH₂."),
          o("di", "c1ccc(CNCc2ccccc2)cc1", "N-benzyl-1-phenylmethanamine", "The phthalimide N could take only one alkyl, so no second benzyl is possible."),
          o("tol", "Cc1ccccc1", "toluene", "The C-N bond to the benzyl is kept. The bonds cut are to the C=O groups.")],
         [bn], "amine", "Step two frees a pure primary amine.", prov("Rule S, the two C(=O)-N cuts", CH_AMINE),
         lead(nbn, "2-benzylisoindole-1,3-dione", "N₂H₄"), concepts=AMINE)

    cands = {"ph": "O=C1NNC(=O)c2ccccc21", "acid": "O=C(O)c1ccccc1C(=O)O", "imide": PHTHALIMIDE}
    side = byproduct([nbn, "NN"], [bn], cands)
    pick(node, "u10-gb-side", "Hydrazine frees benzylamine from N-benzylphthalimide. Pick the byproduct.",
         [o("ph", cands["ph"], "2,3-dihydrophthalazine-1,4-dione", "Both N of hydrazine bond to the two C=O carbons, closing a new six-membered ring."),
          o("acid", cands["acid"], "benzene-1,2-dicarboxylic acid", "That is the acid hydrolysis byproduct. With N₂H₄ the C=O carbons bond to N."),
          o("imide", cands["imide"], "isoindole-1,3-dione", "Phthalimide itself is not given back: its N leaves with the benzyl.")],
         [cands[side]] if side else None, "ph", "Hydrazine ends up in a cyclic hydrazide.",
         prov("atom balance picks the one byproduct", CH_AMINE), lead(nbn, "2-benzylisoindole-1,3-dione", "N₂H₄"),
         concepts=AMINE)

    ask(node, "u10-gb-class", "Pick the amine class the Gabriel synthesis gives.",
        [("one", "Primary only", "The phthalimide N takes one alkyl group and gives it up as R-NH₂."),
         ("two", "Secondary", "The N can be alkylated only once, so a second R never arrives."),
         ("mix", "A mixture", "A mixture is the direct alkylation problem. Gabriel avoids it.")],
        {"one": 1, "two": 2, "mix": "mix"}, n_carbons(bn), "one",
        "Gabriel: one clean primary amine.", prov("Rule S, then the C count on N", CH_AMINE),
        lead(PHTHALIMIDE, "isoindole-1,3-dione", "the phthalimide N-H"), concepts=AMINE)

    target = "NCCCc1ccccc1"
    opts = {"c3": "BrCCCc1ccccc1", "c2": "BrCCc1ccccc1", "c1": S["bnbr"]}
    hits = [s for s in opts.values() if gabriel(s)[1] == canon(target)]
    pick(node, "u10-gb-retro", "Pick the bromide that Gabriel turns into 3-phenylpropan-1-amine.",
         [o("c3", opts["c3"], "(3-bromopropyl)benzene", "Its C-Br carbon becomes the CH₂ on N, three carbons from the ring."),
          o("c2", opts["c2"], "(2-bromoethyl)benzene", "That gives two carbons between ring and N."),
          o("c1", opts["c1"], "(bromomethyl)benzene", "That gives benzylamine, one carbon between ring and N.")],
         hits, "c3", "Gabriel swaps Br for NH₂ and adds no carbon.", prov("Rule S run forward on each option", CH_AMINE, SN2_CONV),
         lead(target, "3-phenylpropan-1-amine", "the target amine"), concepts=AMINE + SYN, convention=SN2_CONV)

    opts = {"p": S["bubr"], "t": "CC(C)(C)Br", "a": "Brc1ccccc1"}
    good = [s for s in opts.values() if sn2_ok(s)]
    pick(node, "u10-gb-halide", "Pick the halide the phthalimide anion substitutes well.",
         [o("p", opts["p"], "1-bromobutane", "A primary C-Br is open to backside attack, so the SN2 runs."),
          o("t", opts["t"], "2-bromo-2-methylpropane", "A tertiary carbon blocks backside attack. The bulky anion eliminates instead."),
          o("a", opts["a"], "bromobenzene", "An aryl C-Br cannot be attacked from behind.")],
         good, "p", "Gabriel works through SN2, so it wants a primary halide.",
         prov("halide class read by RDKit", CH_AMINE, SN2_CONV), lead(PHTHALIMIDE, "isoindole-1,3-dione", "KOH, then R-Br"),
         concepts=AMINE, convention=SN2_CONV)


# ---------------------------------------------------------------------------
# u10-azide (branch)
# ---------------------------------------------------------------------------

def node_azide() -> None:
    node = "u10-azide"
    az = azide(S["bubr"])
    pick(node, "u10-az-meet", "1-Bromobutane meets NaN₃. Pick the product.",
         [o("az", az, "1-azidobutane", "Azide displaces bromide by SN2, giving R-N₃."),
          o("amine", "CCCCN", "butan-1-amine", "The amine needs a reduction step after this."),
          o("cn", "CCCCC#N", "pentanenitrile", "That is what cyanide gives. Azide adds three N, no carbon.")],
         [az], "az", "Step one: R-Br to R-N₃.", prov("Rule S, azide", CH_AMINE, SN2_CONV),
         lead(S["bubr"], "1-bromobutane", "NaN₃"), level=0, concepts=AMINE, convention=SN2_CONV)

    p = azide_red(az)
    pick(node, "u10-az-red", "1-Azidobutane meets LiAlH₄, then water. Pick the product.",
         [o("amine", p, "butan-1-amine", "The N bonded to carbon stays and gains two H. The other two N leave as N₂."),
          o("long", "CCCCCN", "pentan-1-amine", "The azide route adds no carbon. Five carbons is the nitrile route."),
          o("alc", "CCCCO", "butan-1-ol", "The C-N bond is kept. Only N-N bonds break.")],
         [p], "amine", "R-N₃ reduces to R-NH₂.", prov("Rule S, azide reduction", CH_AMINE),
         lead(az, "1-azidobutane", "LiAlH₄, then H₂O"), concepts=AMINE)

    leave = byproduct([az, "[H][H]"], [p], {"n2": "N#N", "nh3": "N", "hn3": "N=[N+]=[N-]"})
    ask(node, "u10-az-leaves", "1-Azidobutane meets H₂ over Pd. Pick what leaves.",
        [("n2", "N₂", "The two outer N leave together as nitrogen gas, which drives the reduction."),
         ("nh3", "NH₃", "Only one N stays on carbon, and the other two leave bonded to each other."),
         ("hn3", "HN₃", "Hydrazoic acid would mean all three N leave and the amine is lost.")],
        {"n2": "n2", "nh3": "nh3", "hn3": "hn3"}, leave, "n2",
        "R-N₃ plus H₂ gives R-NH₂ and N₂.", prov("atom balance on the reduction", CH_AMINE),
        lead(az, "1-azidobutane", "H₂, Pd"), concepts=AMINE)

    change = carbons(p) - carbons(S["bubr"])
    ask(node, "u10-az-count", "1-Bromobutane goes through NaN₃, then LiAlH₄. Pick the carbon count change.",
        [("zero", "No change", "Azide brings only N, so the amine has the halide's four carbons."),
         ("plus", "One more carbon", "That is the cyanide route."),
         ("minus", "One fewer carbon", "That is the Hofmann rearrangement.")],
        {"plus": 1, "zero": 0, "minus": -1}, change, "zero",
        "The azide route keeps the carbon count.", prov("carbon counts of start and product", CH_AMINE, SN2_CONV),
        lead(S["bubr"], "1-bromobutane", "NaN₃, then LiAlH₄"), concepts=AMINE + SYN, convention=SN2_CONV)

    p = azide_red(azide(S["bnbr"]))
    pick(node, "u10-az-bn", "Benzyl bromide meets NaN₃, then H₂ over Pd. Pick the product.",
         [o("amine", p, "phenylmethanamine", "Br becomes N₃, then NH₂, on the same CH₂."),
          o("long", "NCCc1ccccc1", "2-phenylethan-1-amine", "That extra CH₂ would come from cyanide, not azide."),
          o("di", "c1ccc(CNCc2ccccc2)cc1", "N-benzyl-1-phenylmethanamine", "The alkyl azide is not a nucleophile, so no second benzyl adds.")],
         [p], "amine", "Azide gives one clean primary amine.", prov("Rule S, azide then reduction", CH_AMINE, SN2_CONV),
         lead(S["bnbr"], "(bromomethyl)benzene", "NaN₃, then H₂, Pd"), concepts=AMINE, convention=SN2_CONV)

    target = "CCCCCN"
    opts = {"c5": "CCCCCBr", "c4": S["bubr"], "c6": "CCCCCCBr"}
    hits = [s for s in opts.values() if azide_red(azide(s)) == canon(target)]
    pick(node, "u10-az-retro", "Pick the bromide the azide route turns into pentan-1-amine.",
         [o("c5", opts["c5"], "1-bromopentane", "Same five carbons, with Br where NH₂ will be."),
          o("c4", opts["c4"], "1-bromobutane", "Four carbons would need cyanide to reach five."),
          o("c6", opts["c6"], "1-bromohexane", "Six carbons is one too many; the azide route removes none.")],
         hits, "c5", "Work back: put Br where the NH₂ is.", prov("azide route run forward on each option", CH_AMINE, SN2_CONV),
         lead(target, "pentan-1-amine", "the target amine"), concepts=AMINE + SYN, convention=SN2_CONV)


# ---------------------------------------------------------------------------
# u10-hofmann-r (branch)
# ---------------------------------------------------------------------------

def node_hofmann_r() -> None:
    node = "u10-hofmann-r"
    p = hofmann_r(S["benzamide"])
    pick(node, "u10-hr-meet", "Benzamide meets Br₂ and NaOH. Pick the amine.",
         [o("anil", p, "aniline", "The carbonyl carbon is lost and the ring ends bonded straight to N."),
          o("bn", S["bzamine"], "phenylmethanamine", "Keeping the carbon as CH₂ is LiAlH₄ reduction, not this."),
          o("acid", "O=C(O)c1ccccc1", "benzoic acid", "Hydrolysis would lose the N. Here N stays and C leaves.")],
         [p], "anil", "R-C(=O)NH₂ to R-NH₂, one carbon shorter.", prov("Rule H, Hofmann", CH_AMINE, HOFR_CONV),
         lead(S["benzamide"], "benzamide", "Br₂, NaOH"), level=0, concepts=AMINE, convention=HOFR_CONV)

    a = "NC(=O)CCc1ccccc1"
    p = hofmann_r(a)
    pick(node, "u10-hr-chain", "3-Phenylpropanamide meets Br₂ and NaOH. Pick the amine.",
         [o("short", p, "2-phenylethan-1-amine", "The C=O carbon leaves, so two CH₂ sit between ring and N."),
          o("same", "NCCCc1ccccc1", "3-phenylpropan-1-amine", "That keeps every carbon, which LiAlH₄ would do."),
          o("acid", "O=C(O)CCc1ccccc1", "3-phenylpropanoic acid", "The N stays in the product.")],
         [p], "short", "The amine is one carbon shorter than the amide.", prov("Rule H, Hofmann", CH_AMINE, HOFR_CONV),
         lead(a, "3-phenylpropanamide", "Br₂, NaOH"), concepts=AMINE, convention=HOFR_CONV)

    ask(node, "u10-hr-count", "Pick the carbon count change from amide to amine in a Hofmann rearrangement.",
        [("minus", "One fewer carbon", "The carbonyl carbon leaves, so the amine is one carbon shorter."),
         ("zero", "No change", "That is amide reduction with LiAlH₄."),
         ("plus", "One more carbon", "Adding a carbon is the nitrile route.")],
        {"plus": 1, "zero": 0, "minus": -1}, carbons(p) - carbons(a), "minus",
        "Hofmann: lose the C=O carbon.", prov("carbon counts of amide and amine", CH_AMINE, HOFR_CONV),
        lead(a, "3-phenylpropanamide", "Br₂, NaOH"), concepts=AMINE, convention=HOFR_CONV)

    target = S["chxa"]
    opts = {"carb": "NC(=O)C1CCCCC1", "acet": "NC(=O)CC1CCCCC1", "nsub": "CC(=O)NC1CCCCC1"}
    hits = [s for s in opts.values() if hofmann_r(s) == canon(target)]
    pick(node, "u10-hr-retro", "Pick the amide that the Hofmann rearrangement turns into cyclohexanamine.",
         [o("carb", opts["carb"], "cyclohexanecarboxamide", "Its C=O carbon leaves and the ring carbon bonds straight to N."),
          o("acet", opts["acet"], "2-cyclohexylacetamide", "That leaves a CH₂ between ring and N."),
          o("nsub", opts["nsub"], "N-cyclohexylacetamide", "Its N has only one H, so it is not a C(=O)NH₂ and does not rearrange.")],
         hits, "carb", "Work back: add one C(=O) between the carbon and the N.",
         prov("Rule H run forward on each option", CH_AMINE, HOFR_CONV), lead(target, "cyclohexanamine", "the target amine"),
         concepts=AMINE + SYN, convention=HOFR_CONV)

    a = "CCCCC(N)=O"
    p = hofmann_r(a)
    pick(node, "u10-hr-pent", "Pentanamide meets Br₂ and NaOH. Pick the amine.",
         [o("bu", p, "butan-1-amine", "Five carbons in the amide, four in the amine."),
          o("pe", "CCCCCN", "pentan-1-amine", "That keeps all five carbons."),
          o("acid", "CCCCC(=O)O", "pentanoic acid", "The N is kept. A carbon is what leaves.")],
         [p], "bu", "One carbon shorter, every time.", prov("Rule H, Hofmann", CH_AMINE, HOFR_CONV),
         lead(a, "pentanamide", "Br₂, NaOH"), concepts=AMINE, convention=HOFR_CONV)

    opts = {"nme2": "CN(C)C(=O)c1ccccc1", "bz": S["benzamide"], "ac": S["acetamide"]}
    no = [s for s in opts.values() if hofmann_r(s) is None]
    pick(node, "u10-hr-cannot", "Pick the amide that cannot do the Hofmann rearrangement.",
         [o("nme2", opts["nme2"], "N,N-dimethylbenzamide", "Its N has no H, so it cannot start the rearrangement."),
          o("bz", opts["bz"], "benzamide", "A primary amide, C(=O)NH₂: it gives aniline."),
          o("ac", opts["ac"], "acetamide", "A primary amide: it gives methylamine.")],
         no, "nme2", "Only a primary amide rearranges.", prov("Rule H SMARTS needs C(=O)NH₂", CH_AMINE, HOFR_CONV),
         lead(S["benzamide"], "benzamide", "Br₂, NaOH"), concepts=AMINE, convention=HOFR_CONV)


# ---------------------------------------------------------------------------
# u10-curtius (branch)
# ---------------------------------------------------------------------------

def node_curtius() -> None:
    node = "u10-curtius"
    acyl, iso, amine = curtius(S["bzcl"])
    pick(node, "u10-cu-meet", "Benzoyl chloride meets NaN₃. Pick the product.",
         [o("az", acyl, "benzoyl azide", "Azide replaces Cl at the acyl carbon: an acyl azide, C(=O)N₃."),
          o("amide", S["benzamide"], "benzamide", "An amide would need NH₃, not azide."),
          o("phaz", "[N-]=[N+]=Nc1ccccc1", "azidobenzene", "The C=O carbon is still there at this stage. It leaves later, not now.")],
         [acyl], "az", "Step one: the acyl azide.", prov("Rule H, acyl substitution by azide", CH_AMINE),
         lead(S["bzcl"], "benzoyl chloride", "NaN₃"), level=0, concepts=AMINE)

    pick(node, "u10-cu-iso", "Benzoyl azide is heated. Pick the organic product.",
         [o("iso", iso, "isocyanatobenzene", "N₂ leaves and the ring ends on N, with the C=O carbon now in N=C=O."),
          o("anil", S["aniline"], "aniline", "The amine needs water after this step."),
          o("cn", "N#Cc1ccccc1", "benzonitrile", "The O stays on the carbon, in N=C=O.")],
         [iso], "iso", "Heat turns the acyl azide into an isocyanate.", prov("Rule H, acyl azide to isocyanate", CH_AMINE),
         lead(acyl, "benzoyl azide", "heat"), concepts=AMINE)

    leave = byproduct([acyl], [iso], {"n2": "N#N", "nh3": "N", "hn3": "N=[N+]=[N-]"})
    ask(node, "u10-cu-leaves", "Benzoyl azide becomes isocyanatobenzene on heating. Pick what leaves.",
        [("n2", "N₂", "Two of the three azide N leave as nitrogen gas."),
         ("nh3", "NH₃", "No H is on the azide to make NH₃."),
         ("hn3", "HN₃", "One N stays in the product, so all three cannot leave.")],
        {"n2": "n2", "nh3": "nh3", "hn3": "hn3"}, leave, "n2",
        "Losing N₂ is what drives the step.", prov("atom balance on the step", CH_AMINE),
        lead(acyl, "benzoyl azide", "heat"), concepts=AMINE)

    side = byproduct([iso, "O"], [amine], {"co2": "O=C=O", "co": "[C-]#[O+]", "hcooh": "O=CO"})
    pick(node, "u10-cu-water", "Isocyanatobenzene meets water. Pick the amine.",
         [o("anil", amine, "aniline", "Water adds to N=C=O and the carbon leaves as CO₂, leaving Ar-NH₂."),
          o("amide", S["benzamide"], "benzamide", "The ring is bonded to N now, not to C. An amide would need the reverse."),
          o("acid", "O=C(O)c1ccccc1", "benzoic acid", "The ring-N bond is kept. The carbon is what leaves.")],
         [amine] if side == "co2" else None, "anil", "Water on R-N=C=O gives R-NH₂ and CO₂.",
         prov("Rule H, isocyanate hydrolysis, CO₂ checked by atom balance", CH_AMINE), lead(iso, "isocyanatobenzene", "H₂O"),
         concepts=AMINE)

    ask(node, "u10-cu-count", "Benzoyl chloride goes all the way to aniline. Pick the carbon count change.",
        [("minus", "One fewer carbon", "The acyl carbon leaves as CO₂, as in the Hofmann rearrangement."),
         ("zero", "No change", "The C=O carbon does not stay."),
         ("plus", "One more carbon", "Nothing in the sequence adds carbon.")],
        {"plus": 1, "zero": 0, "minus": -1}, carbons(amine) - carbons(S["bzcl"]), "minus",
        "Curtius, like Hofmann: one carbon shorter.", prov("carbon counts of start and amine", CH_AMINE),
        lead(S["bzcl"], "benzoyl chloride", "NaN₃; heat; H₂O"), concepts=AMINE)

    target = "NC1CCCC1"
    opts = {"c5": "O=C(Cl)C1CCCC1", "c6": "O=C(Cl)C1CCCCC1", "ch2": "O=C(Cl)CC1CCCC1"}
    hits = [s for s in opts.values() if curtius(s)[2] == canon(target)]
    pick(node, "u10-cu-retro", "Pick the acid chloride the Curtius route turns into cyclopentanamine.",
         [o("c5", opts["c5"], "cyclopentanecarbonyl chloride", "Its acyl carbon leaves and N lands on the ring carbon."),
          o("c6", opts["c6"], "cyclohexanecarbonyl chloride", "That gives a six-membered ring on N."),
          o("ch2", opts["ch2"], "2-cyclopentylacetyl chloride", "That leaves a CH₂ between the ring and N.")],
         hits, "c5", "Work back: add a C(=O)Cl where the N is.", prov("Rule H Curtius run forward on each option", CH_AMINE),
         lead(target, "cyclopentanamine", "the target amine"), concepts=AMINE + SYN)


# ---------------------------------------------------------------------------
# u10-hofmann-e (branch)
# ---------------------------------------------------------------------------

def node_hofmann_e() -> None:
    node = "u10-hofmann-e"
    q, steps = quaternary(S["pentan2amine"])
    alkenes = hofmann_e(q)
    p = least_subst(alkenes)
    pick(node, "u10-he-meet", "This salt meets Ag₂O, then heat. Pick the major alkene.",
         [o("one", p, "pent-1-ene", "Hydroxide takes an H from the less hindered CH₃ end, because the bulky N(CH₃)₃⁺ group crowds the inside CH₂: the less substituted alkene."),
          o("two", "CC=CCC", "pent-2-ene", "That more substituted alkene is the Zaitsev product, which a halide gives. Here it is minor."),
          o("alc", "CCCC(C)O", "pentan-2-ol", "Hydroxide acts as a base here, and heat drives elimination.")],
         [p] if p else None, "one", "Hofmann elimination: the less substituted alkene wins.",
         prov("Rule E, every alkene enumerated, the least substituted picked", CH_AMINE, HOFE_CONV),
         lead(q, "N,N,N-trimethylpentan-2-aminium", "Ag₂O, H₂O, heat"), level=0, concepts=AMINE, convention=HOFE_CONV)

    ask(node, "u10-he-mei", "Pick how many CH₃I it takes to make pentan-2-amine a quaternary salt.",
        [("three", "Three", "Two N-H to replace, then the lone pair takes a third CH₃."),
         ("two", "Two", "After two the N has no H, but it still has a lone pair for one more."),
         ("one", "One", "One CH₃ only replaces one N-H.")],
        {"three": 3, "two": 2, "one": 1}, steps, "three", "A primary amine takes three CH₃.",
        prov("Rule S repeated, steps counted", CH_AMINE, OVERALK_CONV), lead(S["pentan2amine"], "pentan-2-amine", "excess CH₃I"),
        concepts=AMINE, convention=OVERALK_CONV)

    run = exhaust(S["pentan2amine"], METHYL_I)
    pick(node, "u10-he-salt", "Pentan-2-amine meets excess CH₃I. Pick the product.",
         [o("q", run[-1], "N,N,N-trimethylpentan-2-aminium", "Exhaustive methylation: N ends with three CH₃, the pentyl, and a + charge."),
          o("one", run[0], "N-methylpentan-2-amine", "Excess CH₃I does not stop at one."),
          o("two", run[1], "N,N-dimethylpentan-2-amine", "The lone pair is still free for a third CH₃.")],
         [run[-1]], "q", "Step one of a Hofmann elimination: make N(CH₃)₃⁺ a leaving group.",
         prov("Rule S repeated with CH₃I", CH_AMINE, OVERALK_CONV), lead(S["pentan2amine"], "pentan-2-amine", "excess CH₃I"),
         concepts=AMINE, convention=OVERALK_CONV)

    q2, _ = quaternary("CCC(C)(C)N")
    p2 = least_subst(hofmann_e(q2))
    pick(node, "u10-he-tert", "2-Methylbutan-2-amine: excess CH₃I, then Ag₂O and heat. Pick the major alkene.",
         [o("one", p2, "2-methylbut-1-ene", "Six H on the two CH₃ against two on the CH₂, and the CH₃ are less hindered: C=C at the end."),
          o("two", "CC=C(C)C", "2-methylbut-2-ene", "The more substituted alkene is the Zaitsev answer, minor here."),
          o("alc", "CCC(C)(C)O", "2-methylbutan-2-ol", "Hydroxide removes an H; it does not replace the N.")],
         [p2] if p2 else None, "one", "Hofmann elimination prefers the less substituted alkene.",
         prov("Rule E, every alkene enumerated, the least substituted picked", CH_AMINE, HOFE_CONV),
         lead("CCC(C)(C)N", "2-methylbutan-2-amine", "excess CH₃I; Ag₂O, heat"), level=2, concepts=AMINE, convention=HOFE_CONV)

    side = byproduct([q, "[OH-]"], [p, "O"], {"tma": "CN(C)C", "dma": "CNC", "nh3": "N"})
    ask(node, "u10-he-leaves", "Pick the leaving group a Hofmann elimination loses.",
        [("tma", "Trimethylamine, N(CH₃)₃", "The C-N bond breaks and the N leaves with its three methyls as a neutral amine."),
         ("dma", "Dimethylamine", "No methyl is lost from N. It leaves with all three."),
         ("nh3", "Ammonia", "N keeps its three methyls when it leaves.")],
        {"tma": "tma", "dma": "dma", "nh3": "nh3"}, side, "tma",
        "Leaving group: N(CH₃)₃, neutral and stable.", prov("atom and charge balance", CH_AMINE),
        lead(q, "N,N,N-trimethylpentan-2-aminium", "OH⁻, heat"), concepts=AMINE)

    ask(node, "u10-he-count", "Pick how many different alkenes this salt can give, ignoring E and Z.",
        [("two", "Two", "There are two kinds of β-carbon with H: the CH₃ (C1) and the CH₂ (C3)."),
         ("one", "One", "C1 and C3 are both β to N and both carry H."),
         ("three", "Three", "Only the two β-carbons can lose an H. C4 and C5 are too far away.")],
        {"two": 2, "one": 1, "three": 3}, len(alkenes), "two", "One major, one minor.",
        prov("Rule E, alkenes enumerated", CH_AMINE), lead(q, "N,N,N-trimethylpentan-2-aminium", "Ag₂O, heat"),
        concepts=AMINE)


# ---------------------------------------------------------------------------
# u10-cope (branch)
# ---------------------------------------------------------------------------

def node_cope() -> None:
    node = "u10-cope"
    ox = n_oxide(S["me2chxa"])
    pick(node, "u10-co-meet", "N,N-Dimethylcyclohexanamine meets H₂O₂. Pick the product.",
         [o("ox", ox, "N,N-dimethylcyclohexanamine N-oxide", "The N lone pair takes an O, giving N⁺-O⁻, the amine oxide.", text="The N-oxide, R₃N⁺-O⁻"),
          o("dem", S["mechxa"], "N-methylcyclohexanamine", "H₂O₂ adds O to N. It does not remove a methyl."),
          o("alc", "OC1CCCCC1", "cyclohexanol", "The C-N bond stays at this step.")],
         [ox], "ox", "Step one of a Cope elimination: the N-oxide.", prov("Rule E, N-oxide", CH_AMINE, COPE_CONV),
         lead(S["me2chxa"], "N,N-dimethylcyclohexanamine", "H₂O₂"), level=0, concepts=AMINE, convention=COPE_CONV)

    alkenes = cope(ox)
    pick(node, "u10-co-heat", "The N-oxide of N,N-dimethylcyclohexanamine is heated. Pick the alkene.",
         [o("ene", first(alkenes), "cyclohexene", "The O⁻ takes a β-H and the C-N bond breaks: a C=C in the ring."),
          o("alc", "OC1CCCCC1", "cyclohexanol", "The O stays on N and leaves with it."),
          o("back", S["me2chxa"], "N,N-dimethylcyclohexanamine", "Heat does not just remove the O; it breaks the C-N bond.")],
         alkenes, "ene", "Heat the N-oxide: an alkene and a hydroxylamine.", prov("Rule E, Cope", CH_AMINE),
         lead(ox, "N,N-dimethylcyclohexanamine N-oxide", "heat"), concepts=AMINE)

    cands = {"hyd": "CN(C)O", "dma": "CNC", "tma": "CN(C)C"}
    side = byproduct([ox], [first(alkenes)], cands)
    pick(node, "u10-co-side", "Pick the byproduct when this N-oxide is heated.",
         [o("hyd", cands["hyd"], "N,N-dimethylhydroxylamine", "N leaves with its two methyls and the O, now carrying the β-H as O-H."),
          o("dma", cands["dma"], "N-methylmethanamine", "The O does not leave N, so the byproduct keeps it."),
          o("tma", cands["tma"], "N,N-dimethylmethanamine", "That is the Hofmann leaving group, from a quaternary salt.")],
         [cands[side]] if side else None, "hyd", "Cope leaves R₂N-OH.", prov("atom balance picks the one byproduct", CH_AMINE),
         lead(ox, "N,N-dimethylcyclohexanamine N-oxide", "heat"), concepts=AMINE)

    ask(node, "u10-co-count", "Pick how many different alkenes this N-oxide gives on heating.",
        [("one", "One", "Both ring β-carbons give the same cyclohexene, and the methyls have no β-carbon."),
         ("two", "Two", "The two ring β-carbons are mirror images of each other, so they give one product."),
         ("three", "Three", "A methyl on N has no carbon beyond it to lose an H.")],
        {"one": 1, "two": 2, "three": 3}, len(alkenes), "one", "Symmetry leaves one alkene.",
        prov("Rule E, alkenes enumerated", CH_AMINE), lead(ox, "N,N-dimethylcyclohexanamine N-oxide", "heat"), concepts=AMINE)

    opts = {"tert": S["me2chxa"], "sec": S["mechxa"], "prim": S["chxa"]}
    ok = [s for s in opts.values() if n_oxide(s) is not None]
    pick(node, "u10-co-start", "Pick the amine that H₂O₂ turns into an N-oxide for a Cope.",
         [o("tert", opts["tert"], "N,N-dimethylcyclohexanamine", "A tertiary amine: no N-H, so the lone pair takes the O cleanly."),
          o("sec", opts["sec"], "N-methylcyclohexanamine", "A secondary amine's N-H changes what H₂O₂ makes, so the Cope needs a tertiary one."),
          o("prim", opts["prim"], "cyclohexanamine", "A primary amine is not taken to an N-oxide this way.")],
         ok, "tert", "Cope starts from a tertiary amine.", prov("N-oxide SMARTS, tertiary N only", CH_AMINE, COPE_CONV),
         lead("OO", "hydrogen peroxide", "H₂O₂"), concepts=AMINE, convention=COPE_CONV)

    a = "CN(C)CCc1ccccc1"
    got = cope(n_oxide(a))
    pick(node, "u10-co-styrene", "N,N-Dimethyl-2-phenylethan-1-amine: H₂O₂, then heat. Pick the alkene.",
         [o("sty", first(got), "ethenylbenzene", "The only β-H are on the CH₂ next to the ring, so the C=C forms there, conjugated with it."),
          o("alc", "OCCc1ccccc1", "2-phenylethan-1-ol", "The O leaves with N. No alcohol forms."),
          o("et", "CCc1ccccc1", "ethylbenzene", "The C-N bond becomes a C=C, not a C-H.")],
         got, "sty", "One β-carbon, one alkene.", prov("Rule E, Cope", CH_AMINE, COPE_CONV),
         lead(a, "N,N-dimethyl-2-phenylethan-1-amine", "H₂O₂; heat"), concepts=AMINE, convention=COPE_CONV)


# ---------------------------------------------------------------------------
# u10-azo (branch)
# ---------------------------------------------------------------------------

def node_azo() -> None:
    node = "u10-azo"
    p = azo(BZN2, S["phenol"])
    pick(node, "u10-az2-meet", "Benzenediazonium meets phenol in mild base. Pick the product.",
         [o("para", p, "4-(phenyldiazenyl)phenol", "The terminal N bonds to the ring carbon para to OH. The N=N link joins two rings: an azo dye."),
          o("ortho", "Oc1ccccc1N=Nc1ccccc1", "2-(phenyldiazenyl)phenol", "Ortho is open too, but para is less crowded and wins."),
          o("ether", "c1ccc(Oc2ccccc2)cc1", "phenoxybenzene", "The ring carbon, not the O, is the nucleophile, and N₂ is kept.")],
         [p] if p else None, "para", "Azo coupling: Ar-N₂⁺ is the electrophile, para to the activating group.",
         prov("Rule Z, coupling at the para C counted by RDKit", CH_AMINE, AZO_CONV + "; " + OP_CONV),
         lead(S["phenol"], "phenol", "PhN₂⁺, NaOH"), level=0, concepts=DIAZO + EAS, convention=OP_CONV)

    p = azo(BZN2, S["dma"])
    pick(node, "u10-az2-dma", "Benzenediazonium meets N,N-dimethylaniline. Pick the product.",
         [o("para", p, "N,N-dimethyl-4-(phenyldiazenyl)aniline", "NMe₂ activates the ring, and the N=N goes para to it."),
          o("ortho", "CN(C)c1ccccc1N=Nc1ccccc1", "N,N-dimethyl-2-(phenyldiazenyl)aniline", "Ortho to the bulky NMe₂ is crowded; para is open."),
          o("meta", "CN(C)c1cccc(N=Nc2ccccc2)c1", "N,N-dimethyl-3-(phenyldiazenyl)aniline", "NMe₂ directs ortho and para, not meta.")],
         [p] if p else None, "para", "Aryl amines couple para, like phenols.",
         prov("Rule Z, coupling at the para C", CH_AMINE, AZO_CONV + "; " + OP_CONV), lead(S["dma"], "N,N-dimethylaniline", "PhN₂⁺"),
         concepts=DIAZO + EAS, convention=OP_CONV)

    opts = {"ph": S["phenol"], "bz": "c1ccccc1", "no2": S["nitrobenzene"], "cl": "Clc1ccccc1"}
    ok = [s for s in opts.values() if azo(BZN2, s) is not None]
    pick(node, "u10-az2-partner", "Pick the ring that couples with benzenediazonium.",
         [o("ph", opts["ph"], "phenol", "OH pushes its lone pair into the ring, enough for a weak electrophile like Ar-N₂⁺."),
          o("bz", opts["bz"], "benzene", "Plain benzene is not electron rich enough for this weak electrophile."),
          o("no2", opts["no2"], "nitrobenzene", "NO₂ pulls density out. That ring is even less willing."),
          o("cl", opts["cl"], "chlorobenzene", "Cl deactivates the ring slightly.")],
         ok, "ph", "The partner needs OH or NR₂ on the ring.", prov("strong donor SMARTS on each ring", CH_AMINE, AZO_CONV),
         lead(BZN2, "benzenediazonium", "the electrophile"), concepts=DIAZO + EWG, convention=AZO_CONV)

    ask(node, "u10-az2-bond", "Pick the N-N bond in an azo dye, Ar-N=N-Ar.",
        [("double", "A double bond", "Coupling turns N≡N⁺ into N=N: one bond to each ring, one double bond between the N."),
         ("triple", "A triple bond", "The triple bond belongs to the diazonium ion before it couples."),
         ("single", "A single bond", "N-N single would need two more H. The azo link is N=N.")],
        {"double": 2, "triple": 3, "single": 1}, bond_order_nn(azo(BZN2, S["phenol"])), "double",
        "Diazonium N≡N⁺, azo N=N.", prov("bond order read off the coupled product", CH_AMINE),
        lead(azo(BZN2, S["phenol"]), "4-(phenyldiazenyl)phenol", "an azo dye"), concepts=DIAZO)

    cresol = "Cc1ccc(O)cc1"
    p = azo(BZN2, cresol)
    pick(node, "u10-az2-blocked", "Benzenediazonium meets 4-methylphenol. Pick the product.",
         [o("ortho", p, "4-methyl-2-(phenyldiazenyl)phenol", "Para to OH is taken by the methyl, so the N=N goes ortho to OH."),
          o("meta", "Cc1ccc(O)cc1N=Nc1ccccc1", "4-methyl-3-(phenyldiazenyl)phenol", "That is ortho to the methyl but meta to OH, which OH does not direct to."),
          o("lost", "Oc1ccc(N=Nc2ccccc2)cc1", "4-(phenyldiazenyl)phenol", "The methyl is not displaced.")],
         [p] if p else None, "ortho", "Para blocked: coupling goes ortho.", prov("Rule Z, para taken so ortho", CH_AMINE, OP_CONV),
         lead(cresol, "4-methylphenol", "PhN₂⁺, NaOH"), concepts=DIAZO + EAS, convention=OP_CONV)

    target = "O=[N+]([O-])c1ccc(N=Nc2ccc(O)cc2)cc1"
    opts = {"p": diazotise("Nc1ccc([N+](=O)[O-])cc1"), "h": BZN2, "m": diazotise("Nc1cccc([N+](=O)[O-])c1")}
    hits = [s for s in opts.values() if azo(s, S["phenol"]) == canon(target)]
    pick(node, "u10-az2-retro", "Phenol is the partner. Pick the diazonium salt that gives this dye.",
         [o("p", opts["p"], "4-nitrobenzenediazonium", "The ring without OH came from the diazonium salt, and its NO₂ is para to the N."),
          o("h", opts["h"], "benzenediazonium", "That gives the dye with no NO₂."),
          o("m", opts["m"], "3-nitrobenzenediazonium", "That puts the NO₂ meta to the N=N.")],
         hits, "p", "Cut the N=N: the ring without OH was the diazonium salt.", prov("Rule Z run forward on each option", CH_AMINE, OP_CONV),
         lead(target, "4-[(4-nitrophenyl)diazenyl]phenol", "the target dye"), concepts=DIAZO + SYN, convention=OP_CONV)


# ---------------------------------------------------------------------------
# Build and emit
# ---------------------------------------------------------------------------

def build() -> None:
    node_basicity()
    node_red_amination()
    node_amide_red()
    node_nitrile_red()
    node_nitro_red()
    node_diazonium()
    node_diazo_sub()
    node_acyl_protect()
    node_direct_alk()
    node_gabriel()
    node_azide()
    node_hofmann_r()
    node_curtius()
    node_hofmann_e()
    node_cope()
    node_azo()
    check_names()
    for node, entries in POOLS.items():
        if not 6 <= len(entries) <= 12:
            fail(f"{node}: {len(entries)} items, outside 6 to 12")
    for slot in range(4):
        share = CORRECT_INDEX.count(slot) / max(1, len(CORRECT_INDEX))
        if share > 0.5:
            fail(f"{share:.0%} of MCQs put the answer in slot {slot}")


HEADER = '''/**
 * Unit 10 (amines and diazonium chemistry) problem pools, a DRAFT.
 * GENERATED by scripts/u10_pools.py. Do not edit by hand: edit the specs in
 * the script and rerun it.
 *
 * EVERY ENTRY IS A DRAFT (`placeholder: true`) for the owner's review, never
 * presented as done. Each answer was derived by the script (reaction SMARTS
 * and graph edits for reductive amination, amide, nitrile, nitro and azide
 * reductions, alkylation at N, Gabriel, Hofmann and Curtius, Hofmann and
 * Cope eliminations, diazotisation, the diazonium substitutions and azo
 * coupling; the lone pair class of each N; pKa from the course table in
 * packages/curriculum/src/pka.ts; atom balance for byproducts; every name
 * read back by OPSIN), and the script refuses to write this file when an
 * authored key disagrees with what it derived. Where an answer rests on an
 * authored convention RDKit cannot check (the basicity order, the reagent
 * table, para before ortho, the Hofmann alkene), the entry's provenance says so.
 *
 * Every pool in U10_POOLS is a LESSON pool: MCQs join the node's recognise
 * step, and the ladder and match boards fill the lesson's order and connect
 * slots (beats/template.ts planLesson). Ladders are built with createProblem
 * and createOrderingAnswer exactly as content/u5/pools.ts does; match boards
 * go through buildMatchBoard, so a bad board throws at import time.
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
    return body.replace('"u5-pool"', '"u10-pool"')


def ts(value) -> str:
    return json.dumps(value, ensure_ascii=False, indent=2)


def emit_table(name: str, nodes: list[str], doc: str) -> list[str]:
    out = [doc, f"export const {name}: UnitPools = {{"]
    for node in nodes:
        out.append(f"  {json.dumps(node)}: [")
        for e in POOLS[node]:
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
    out += emit_table("U10_POOLS", list(POOLS), "/** Lesson pools keyed by map node id (beats/practice/pools.ts). */")
    out.append("/** The drawing beside each MCQ, keyed by beat id. */")
    out.append("export const U10_VISUALS: Readonly<Record<string, McqVisual>> = " + ts(VISUALS) + ";\n")
    out.append("/** Drawn options, keyed by beat id then option id. All or nothing per beat. */")
    out.append("export const U10_OPTION_TILES: Readonly<Record<string, Readonly<Record<string, NamedFigure>>>> = " + ts(TILES) + ";\n")
    out.append("/** A drawing for every sort card, keyed by beat id then item id. */")
    out.append("export const U10_SORT_FIGURES: Readonly<Record<string, Readonly<Record<string, NamedFigure>>>> = " + ts(SORT_FIGURES) + ";\n")
    return "\n".join(out)


def reset() -> None:
    for table in (POOLS, VISUALS, TILES, SORT_FIGURES, CONVENTIONS):
        table.clear()
    for seq in (CORRECT_INDEX, NAME_CHECKS, FAILURES, NOTES):
        seq.clear()
    IDS.clear()


def report_disagreements() -> None:
    """Where RDKit's own model and the course convention could part ways, printed for the owner report."""
    # RDKit's aromaticity flag on each ring N the unit draws, against a pi count done here.
    for name, smi in (("pyrrole", S["pyrrole"]), ("pyridine", "c1ccncc1")):
        m = mol(smi)
        n = m.GetAtomWithIdx(the_n(smi))
        print(f"{name}: RDKit aromatic N {n.GetIsAromatic()}, lone pair class {n_class(smi, the_n(smi))}")
    # Gasteiger charge on N, a crude computed proxy for lone pair availability, beside the course order.
    for name, smi in (("cyclohexanamine", S["chxa"]), ("aniline", S["aniline"]), ("acetamide", S["acetamide"])):
        m = Chem.AddHs(mol(smi))
        rdPartialCharges.ComputeGasteigerCharges(m)
        print(f"{name}: Gasteiger charge on N {m.GetAtomWithIdx(the_n(smi)).GetDoubleProp('_GasteigerCharge'):.4f}")


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
