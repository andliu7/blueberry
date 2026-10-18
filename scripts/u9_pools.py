"""
Unit 9 (enols and enolates, alpha-carbon chemistry) problem pools, a DRAFT, derived with RDKit.

Run:     python scripts/u9_pools.py
Writes:  src/game/content/u9/pools.ts (never edit it by hand: edit the specs
         below and rerun). The owner's report for this unit is written by hand
         beside the run, from what this script prints.

Built on scripts/u8_pools.py: the figure, naming, entry, emit and graph-edit
basics are copied from it unchanged. Every entry is `placeholder: true`.

THE MODEL. Check these rules, not the hundred and sixty answers. Each is a
graph edit on RDKit molecules; the script never types a product. An alpha
carbon is an sp3 carbon with at least one H bonded to an aldehyde, ketone or
ester C=O carbon.

E. Enol and enolate: the C=O goes single and the C-alpha bond goes double (the
   O takes the H back, or carries the minus charge). Enolate C=C substitution
   is a count of heavy atoms on the two alkene carbons.
P. pKa: each proton is classified by SMARTS into a site of the course's own pKa
   table, packages/curriculum/src/pka.ts (PKA_TABLE), which this script READS
   (value and source) rather than restating. A base deprotonates a site fully
   when its conjugate acid's pKa is above the site's.
H. Alpha halogenation and alkylation: one alpha C-H becomes C-X or C-R. Under
   base every H on that carbon goes (convention); a methyl ketone then cleaves
   C(=O)-CX3 to a carboxylate and HCX3 (haloform).
A. Aldol: a donor's alpha carbon bonds to an aldehyde or ketone C=O carbon,
   whose C=O becomes C-OH. Condensation removes that OH with an H on the
   carbon next to the C=O, making the conjugated C=C.
C. Claisen: a donor's alpha carbon bonds to an ester's acyl carbon and the OR
   leaves (acyl substitution with a carbon nucleophile). Dieckmann and the
   intramolecular aldol are the same edits inside one molecule; ring sizes are
   RDKit ring counts and a bridged product is set aside.
M. Malonic and acetoacetic: alkylate (H), hydrolyse every ester (acyl C-OR cut,
   OH put on), then decarboxylate a CO2H whose alpha carbon carries another
   C=O (the CO2H carbon and its oxygens leave as CO2).
K. Conjugate addition: on C=C-C=O (or C=C-C#N) the nucleophile bonds to the
   beta carbon and the C=C goes single. 1,2-addition bonds to the C=O carbon.
   Which reagents add 1,4 (cuprates, stabilised enolates, enamines) and which
   add 1,2 (Grignards) is a convention.
N. Enamine and iminium: a secondary amine N replaces the C=O oxygen; the
   enamine carbon bonds to the electrophile, and hydrolysis swaps the C=N(+)
   back to C=O. Mannich is an enol on the iminium of CH2O and a secondary
   amine. Reformatsky bonds the C-Br carbon of a bromo ester to a C=O.
B. Byproducts are keyed by RDKit atom and charge balance: only one candidate
   balances.

Names. Every drawn structure is named, and OPSIN must read the name back as
exactly the drawing.

What is a CONVENTION, flagged in each entry's provenance and printed by the
run: kinetic (LDA, cold, the alpha carbon with more H) versus thermodynamic
(alkoxide, equilibrating, the more substituted enolate), mono halogenation
under acid at the more substituted carbon versus runaway under base, that
5- and 6-membered rings win, which partner a crossed reaction uses as the
acceptor, SN2 wanting a primary halide, which reagents add 1,4, and that the
base for a Claisen matches the ester's alkoxide.

CHECK SOURCE, never adapted: OpenStax Organic Chemistry (CC BY-NC-SA 4.0)
chapters 22 and 23 are NAMED as the check for each entry. They were not read in
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
OUT = REPO / "src" / "game" / "content" / "u9" / "pools.ts"

SCRIPT = "scripts/u9_pools.py"


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
OPSIN_DIR = Path(tempfile.mkdtemp(prefix="u9_opsin_"))


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
    if not id.startswith("u9-"):
        fail(f"{id}: ids start u9-")
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
        "problemId": "u9-pool-" + id,
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
# Unit 9 graph edits (the MODEL in the header). Nothing below types a product.
# ---------------------------------------------------------------------------

def o(id: str, smi: str, name: str, why: str, text: str | None = None) -> tuple[str, str, str, str, str]:
    """One drawn option, as in scripts/u8_pools.py. The text defaults to the name with a capital first letter."""
    if text is None:
        text = name if not name[0].isalpha() or name[:2] in ("N,", "N-") else name[0].upper() + name[1:]
    return (id, smi, name, text, why)


CH_ALPHA = "ch. 22"
CH_COND = "ch. 23"
CH_CONJ = "ch. 19"

ENOL = ("enols_and_enolates",)
ALDOL = ("aldol_and_claisen",)
ALK = ("alpha_alkylation",)
CONJ = ("conjugate_addition",)
SYN = ("multistep_synthesis",)
NADD = ("nucleophilic_addition_nitrogen",)
PKA = ("pka_keq_viability",)
KVT = ("kinetic_vs_thermodynamic_control",)
RES = ("resonance_delocalisation",)

# Alpha carbon of an aldehyde or ketone, and of an ester. A match starts (alpha C, carbonyl C, O).
ALPHA_KETO = "[CX4;!H0][CX3;!$(C-[!#6;!#1])]=[OX1]"
ALPHA_ESTER = "[CX4;!H0][CX3](=[OX1])[OX2][#6]"
ESTER = "[CX3](=[OX1])[OX2][#6]"


from rdkit.Chem import rdMolDescriptors  # noqa: E402


def hits(smi: str, smarts: str) -> list[tuple[int, ...]]:
    return [tuple(h) for h in mol(smi).GetSubstructMatches(Chem.MolFromSmarts(smarts))]


def combine(*smis: str) -> tuple[Chem.RWMol, list[int]]:
    """Several molecules in one editable molecule, with each one's first atom index."""
    m = mol(smis[0])
    offsets = [0]
    for s in smis[1:]:
        offsets.append(m.GetNumAtoms())
        m = Chem.CombineMols(m, mol(s))
    return Chem.RWMol(m), offsets


def largest(got: list[str]) -> str:
    return max(got, key=lambda s: (mol(s).GetNumHeavyAtoms(), s))


def unique(products, what: str) -> str | None:
    got = sorted({canon(p) for p in products})
    if len(got) != 1:
        fail(f"{what}: {len(got)} distinct products {got}")
        return None
    return got[0]


# -- Rule E: enols and enolates

def alpha_sites(smi: str, ester: bool = False) -> list[tuple[int, int, int]]:
    """(alpha C, carbonyl C, carbonyl O) for every alpha C-H next to a ketone or aldehyde C=O (or an ester's)."""
    if ester:
        return [(h[0], h[1], h[2]) for h in hits(smi, ALPHA_ESTER)]
    return [(h[0], h[1], h[2]) for h in hits(smi, ALPHA_KETO)]


def enol_at(smi: str, a: int, c: int, o: int, charge: int = 0) -> str:
    rw = Chem.RWMol(mol(smi))
    rw.GetBondBetweenAtoms(c, o).SetBondType(SINGLE)
    rw.GetBondBetweenAtoms(a, c).SetBondType(DOUBLE)
    if charge:
        rw.GetAtomWithIdx(o).SetFormalCharge(-1)
    return flat(one(rw))


def enols(smi: str, charge: int = 0) -> list[str]:
    """Every distinct enol (or enolate) of an aldehyde or ketone, E and Z not told apart."""
    return sorted({enol_at(smi, a, c, o, charge) for a, c, o in alpha_sites(smi)})


def h_on(smi: str, i: int) -> int:
    return mol(smi).GetAtomWithIdx(i).GetTotalNumHs()


def c_subst(smi: str, a: int, c: int) -> int:
    """Carbon neighbours of the alpha carbon other than the carbonyl carbon: what makes its enol C=C more substituted."""
    return sum(1 for n in mol(smi).GetAtomWithIdx(a).GetNeighbors() if n.GetSymbol() == "C" and n.GetIdx() != c)


KINETIC_CONV = ("LDA at -78 C removes the alpha H on the carbon with more H (kinetic); an alkoxide, warm, "
                "equilibrates to the more substituted enolate (thermodynamic)")


def best_alphas(smi: str, mode: str) -> list[tuple[int, int, int]]:
    """mode 'kinetic': the alpha carbons with the most H. 'thermo': the most substituted ones."""
    sites = alpha_sites(smi)
    if not sites:
        return []
    score = (lambda s: h_on(smi, s[0])) if mode == "kinetic" else (lambda s: c_subst(smi, s[0], s[1]))
    top = max(score(s) for s in sites)
    return [s for s in sites if score(s) == top]


def enolate(smi: str, mode: str) -> str | None:
    return unique([enol_at(smi, a, c, o, -1) for a, c, o in best_alphas(smi, mode)], f"{mode} enolate of {smi}")


def neg_atoms(smi: str) -> list[str]:
    """The atoms (by element, one entry per atom) that carry the minus charge across RDKit's resonance forms."""
    seen: set[tuple[int, str]] = set()
    for form in Chem.ResonanceMolSupplier(mol(smi)):
        for a in form.GetAtoms():
            if a.GetFormalCharge() < 0:
                seen.add((a.GetIdx(), a.GetSymbol()))
    return sorted(s for _, s in seen)


def hybrid(smi: str, i: int) -> str:
    return str(mol(smi).GetAtomWithIdx(i).GetHybridization())


# -- Rule P: pKa, read from the course table

def read_pka_table() -> dict[str, tuple[float, str]]:
    src = (REPO / "packages" / "curriculum" / "src" / "pka.ts").read_text(encoding="utf-8")
    rows = re.findall(r'id: "(\w+)",\s*label: "[^"]*",\s*pka: (-?[\d.]+),\s*source: "(\w+)"', src)
    if len(rows) < 10:
        raise ValueError("could not read PKA_TABLE from packages/curriculum/src/pka.ts")
    return {k: (float(v), s) for k, v, s in rows}


PKA_TABLE = read_pka_table()

# First match wins per atom: the more specific site comes first.
SITE_SMARTS = [
    ("carboxylic_acid", "[OX2H1][CX3]=[OX1]"),
    ("phenol", "[OX2H1]c"),
    ("alcohol", "[OX2H1][CX4]"),
    ("water", "[OX2H2]"),
    ("beta_dicarbonyl_alpha_ch", "[CX4;!H0]([CX3]=[OX1])[CX3]=[OX1]"),
    ("ketone_alpha_ch", ALPHA_KETO),
    ("ester_alpha_ch", ALPHA_ESTER),
    ("terminal_alkyne_ch", "[CX2H1]#C"),
    ("amine_nh", "[NX3;!H0;!$(NC=O)]"),
    ("vinylic_or_aromatic_ch", "[#6;X3;!H0]"),
    ("alkane_ch", "[CX4;!H0]"),
]


def sites_of(smi: str) -> dict[int, str]:
    """Each H-bearing heavy atom to its pKa site id."""
    out: dict[int, str] = {}
    for site, smarts in SITE_SMARTS:
        for h in hits(smi, smarts):
            out.setdefault(h[0], site)
    return out


def most_acidic(smi: str) -> str:
    return min(set(sites_of(smi).values()), key=lambda s: PKA_TABLE[s][0])


def pka_of(smi: str) -> float:
    return PKA_TABLE[most_acidic(smi)][0]


# A base and its conjugate acid's site in the course table.
BASES = {
    "LDA": "amine_nh",        # diisopropylamine N-H
    "NaOEt": "alcohol",       # ethanol O-H
    "NaOH": "water",
    "NaHCO3": "carbonic_acid",
}


def deprotonates_fully(base: str, site: str) -> bool:
    """Rule P: the base takes the proton fully when its conjugate acid's pKa is above the site's."""
    return PKA_TABLE[BASES[base]][0] > PKA_TABLE[site][0]


# -- Rule H: alpha halogenation and alkylation

def add_x(smi: str, i: int, x: str, n: int = 1) -> str:
    rw = Chem.RWMol(mol(smi))
    for _ in range(n):
        j = rw.AddAtom(Chem.Atom(x))
        rw.AddBond(i, j, SINGLE)
    return one(rw)


def halo_acid(smi: str, x: str) -> str | None:
    """Acid: one X on the alpha carbon of the more substituted enol (convention)."""
    return unique([add_x(smi, a, x) for a, _, _ in best_alphas(smi, "thermo")], f"acid halogenation of {smi}")


HALO_CONV = ("acid stops at one halogen, on the more substituted alpha carbon; base with excess halogen "
             "replaces every H on a methyl ketone's methyl, then cleaves (haloform)")
METHYL_KETONE = "[CH3][CX3](=[OX1])[#6]"


def is_methyl_ketone(smi: str) -> bool:
    return bool(hits(smi, METHYL_KETONE))


def trihalo(smi: str, x: str) -> str:
    """Base, excess X2: every H on the methyl of a methyl ketone."""
    return add_x(smi, match_one(smi, METHYL_KETONE)[0], x, 3)


def haloform(smi: str, x: str) -> list[str]:
    """Trihalogenate, then cut C(=O)-CX3: a carboxylate and HCX3."""
    t = trihalo(smi, x)
    h = match_one(t, f"[CX4]([{x}])([{x}])([{x}])[CX3](=[OX1])[#6]")
    cx3, c = h[0], h[4]
    rw = Chem.RWMol(mol(t))
    rw.RemoveBond(cx3, c)
    k = rw.AddAtom(Chem.Atom(8))
    rw.GetAtomWithIdx(k).SetFormalCharge(-1)
    rw.AddBond(c, k, SINGLE)
    return frags(rw)


HALIDE = "[CX4][Cl,Br,I]"


def alkylate(smi: str, a: int, halide: str, which: int = 0) -> str:
    """SN2 by the alpha carbon on one C-X carbon of the halide; X leaves as the anion."""
    rw, off = combine(smi, halide)
    cx = hits(halide, HALIDE)[which]
    rw.AddBond(a, off[1] + cx[0], SINGLE)
    rw.RemoveBond(off[1] + cx[0], off[1] + cx[1])
    rw.GetAtomWithIdx(off[1] + cx[1]).SetFormalCharge(-1)
    return largest(frags(rw))


def alkylate_intra(smi: str, a: int) -> str:
    """The second SN2 of a dihalide, inside one molecule: alpha carbon a onto the one C-X left."""
    cx = hits(smi, HALIDE)
    if len(cx) != 1:
        raise ValueError(f"{smi}: {len(cx)} C-X left")
    rw = Chem.RWMol(mol(smi))
    rw.AddBond(a, cx[0][0], SINGLE)
    rw.RemoveBond(cx[0][0], cx[0][1])
    rw.GetAtomWithIdx(cx[0][1]).SetFormalCharge(-1)
    return largest(frags(rw))


def alkylated(smi: str, mode: str, halide: str) -> str | None:
    return unique([alkylate(smi, a, halide) for a, _, _ in best_alphas(smi, mode)], f"alkylation of {smi}")


SN2_CONV = "SN2 by an enolate wants a methyl or primary halide; a tertiary halide eliminates and an aryl halide does not react"


def halide_class(halide: str) -> str:
    """methyl, primary, secondary, tertiary or aryl, read from the carbon that carries X."""
    if hits(halide, "c[Cl,Br,I]"):
        return "aryl"
    c = hits(halide, HALIDE)[0][0]
    return ["methyl", "primary", "secondary", "tertiary"][cdeg(mol(halide), c)]


# -- Rule A: aldol

def aldol(donor: str, a: int, acceptor: str, site: tuple[int, int] | None = None) -> str:
    rw, off = combine(donor, acceptor)
    c, o = site or the_co(acceptor)
    rw.AddBond(a, off[1] + c, SINGLE)
    rw.GetBondBetweenAtoms(off[1] + c, off[1] + o).SetBondType(SINGLE)
    return flat(one(rw))


def aldols(donor: str, acceptor: str, mode: str | None = None) -> list[str]:
    sites = alpha_sites(donor) if mode is None else best_alphas(donor, mode)
    return sorted({aldol(donor, a, acceptor) for a, _, _ in sites})


def aldol_one(donor: str, acceptor: str, mode: str | None = None) -> str | None:
    return unique(aldols(donor, acceptor, mode), f"aldol {donor} on {acceptor}")


BETA_OH = "[OX2H1][CX4][CX4;!H0][CX3]=[OX1]"


def condense(smi: str | None) -> list[str]:
    """E1cb: the beta OH leaves with an H from the carbon next to the C=O, giving the conjugated C=C."""
    if smi is None:
        return []
    out = set()
    for h in hits(smi, BETA_OH):
        oh, cb, ca = h[0], h[1], h[2]
        rw = Chem.RWMol(mol(smi))
        rw.GetBondBetweenAtoms(cb, ca).SetBondType(DOUBLE)
        rw.RemoveAtom(oh)
        out.add(flat(one(rw)))
    return sorted(out)


def condensed(smi: str | None) -> str | None:
    return unique(condense(smi), f"condensation of {smi}")


def retro_aldol(smi: str) -> list[str]:
    """The reverse edit: cut C(OH)-C(alpha); the C-OH becomes C=O."""
    h = match_one(smi, "[OX2H1][CX4][CX4][CX3]=[OX1]")
    oh, cb, ca = h[0], h[1], h[2]
    rw = Chem.RWMol(mol(smi))
    rw.RemoveBond(cb, ca)
    rw.GetBondBetweenAtoms(cb, oh).SetBondType(DOUBLE)
    return frags(rw)


def intra_aldols(smi: str) -> dict[int, set[str]]:
    """Every intramolecular aldol: an alpha carbon onto another C=O of the same molecule, keyed by new ring size."""
    out: dict[int, set[str]] = {}
    for a, c1, _ in alpha_sites(smi):
        for c2, o2 in co_sites(smi):
            if c2 == c1 or mol(smi).GetBondBetweenAtoms(a, c2) is not None:
                continue
            rw = Chem.RWMol(mol(smi))
            rw.AddBond(a, c2, SINGLE)
            rw.GetBondBetweenAtoms(c2, o2).SetBondType(SINGLE)
            p = flat(one(rw))
            size = ring_size_new(smi, p)
            if size is None or rdMolDescriptors.CalcNumBridgeheadAtoms(mol(p)) > 0:
                continue  # a bridged bicycle is set aside (header, rule C)
            out.setdefault(size, set()).add(p)
    return out


RING_CONV = "five- and six-membered rings form; three-, four- and seven-membered rings do not compete"


def favoured(sizes: dict[int, set[str]]) -> tuple[int | None, str | None]:
    """The one 5- or 6-membered ring (convention), and its one product."""
    ok = [s for s in sizes if s in (5, 6)]
    if len(ok) != 1:
        return None, None
    got = sorted(sizes[ok[0]])
    return (ok[0], got[0]) if len(got) == 1 else (ok[0], None)


# -- Rule C: Claisen

def claisen(donor: str, a: int, acceptor: str) -> list[str]:
    """The alpha carbon onto the ester's acyl carbon; the OR leaves (as the alcohol after workup)."""
    rw, off = combine(donor, acceptor)
    h = hits(acceptor, ESTER)[0]
    c, oal = h[0], h[2]
    rw.AddBond(a, off[1] + c, SINGLE)
    rw.RemoveBond(off[1] + c, off[1] + oal)
    return frags(rw)


def claisen_main(donor: str, acceptor: str, ester: bool = True, mode: str | None = None) -> str | None:
    sites = alpha_sites(donor, ester=ester) if mode is None else best_alphas(donor, mode)
    return unique([largest(claisen(donor, a, acceptor)) for a, _, _ in sites], f"Claisen {donor} on {acceptor}")


def dieckmanns(smi: str) -> dict[int, set[str]]:
    out: dict[int, set[str]] = {}
    for a, c1, _ in alpha_sites(smi, ester=True):
        for h in hits(smi, ESTER):
            c2, oal = h[0], h[2]
            if c2 == c1:
                continue
            rw = Chem.RWMol(mol(smi))
            rw.AddBond(a, c2, SINGLE)
            rw.RemoveBond(c2, oal)
            p = largest(frags(rw))
            size = ring_size_new(smi, p)
            if size is not None:
                out.setdefault(size, set()).add(flat(p))
    return out


BETA_KETO_CH = "[CX4;!H0]([CX3]=[OX1])[CX3]=[OX1]"
CLAISEN_CONV = "an alkoxide Claisen is pulled forward only when the product keeps an H between its two C=O to lose"
BASE_MATCH_CONV = "the alkoxide base matches the ester's OR, so transesterification changes nothing"


def claisen_driven(product: str | None) -> bool:
    return product is not None and bool(hits(product, BETA_KETO_CH))


# -- Rule M: malonic and acetoacetic

def hydrolyse(smi: str) -> list[str]:
    """Every ester: cut acyl C-OR, put OH on the acyl carbon; the OR leaves as its alcohol."""
    rw = Chem.RWMol(mol(smi))
    for h in hits(smi, ESTER):
        c, oal = h[0], h[2]
        rw.RemoveBond(c, oal)
        k = rw.AddAtom(Chem.Atom(8))
        rw.AddBond(c, k, SINGLE)
    return frags(rw)


BETA_ACID = "[OX2H1][CX3](=[OX1])[CX4][CX3]=[OX1]"


def decarboxylate(smi: str) -> tuple[str, int]:
    """Lose CO2 from each CO2H whose alpha carbon carries another C=O, until none is left."""
    lost = 0
    while hits(smi, BETA_ACID):
        h = hits(smi, BETA_ACID)[0]
        rw = Chem.RWMol(mol(smi))
        for i in sorted((h[0], h[1], h[2]), reverse=True):
            rw.RemoveAtom(i)
        smi = one(rw)
        lost += 1
    return smi, lost


def hydrolyse_decarb(smi: str) -> str:
    return decarboxylate(largest(hydrolyse(smi)))[0]


MALONATE = "CCOC(=O)CC(=O)OCC"
ACAC_ESTER = "CCOC(=O)CC(C)=O"


def central(smi: str) -> int:
    return match_one(smi, BETA_KETO_CH)[0]


def malonic(halides: list[str], donor: str = MALONATE) -> tuple[str, str]:
    """Alkylate the central carbon once per halide, then hydrolyse and decarboxylate: (alkylated, final)."""
    s = donor
    for h in halides:
        s = alkylate(s, central(s), h)
    return s, hydrolyse_decarb(s)


# -- Rule K: conjugate addition

ACCEPTOR = "[CX3]=[CX3]-[$([CX3]=[OX1]),$([CX2]#N)]"


def is_acceptor(smi: str) -> bool:
    return bool(hits(smi, ACCEPTOR))


def with_dummy(smi: str, i: int) -> str:
    rw = Chem.RWMol(mol(smi))
    d = rw.AddAtom(Chem.Atom(0))
    rw.AddBond(i, d, SINGLE)
    return one(rw)


def conj_add(smi: str, nu: str) -> str:
    """1,4: the nucleophile bonds to the beta carbon and the C=C goes single (the alpha carbon takes H at workup)."""
    h = hits(smi, ACCEPTOR)[0]
    beta, alpha = h[0], h[1]
    rw, heads, dummies = merge(smi, nu)
    rw.AddBond(beta, heads[0], SINGLE)
    rw.GetBondBetweenAtoms(beta, alpha).SetBondType(SINGLE)
    drop(rw, dummies)
    return flat(one(rw))


def michael(donor: str, acceptor: str) -> str:
    """A 1,3-dicarbonyl's central carbon (its most acidic C-H) adds 1,4."""
    return conj_add(acceptor, with_dummy(donor, central(donor)))


CONJ_CONV = "cuprates and stabilised enolates add 1,4; Grignard and organolithium reagents add 1,2"


# -- Rule N: enamines, iminium ions, Mannich, Reformatsky

def enamine(ketone: str, amine: str) -> list[str]:
    """The secondary amine N replaces the C=O oxygen and the C-alpha bond goes double."""
    out = set()
    c, o = the_co(ketone)
    n = match_one(amine, "[NX3;H1]")[0]
    for a, _, _ in alpha_sites(ketone):
        rw, off = combine(ketone, amine)
        rw.AddBond(c, off[1] + n, SINGLE)
        rw.GetBondBetweenAtoms(a, c).SetBondType(DOUBLE)
        rw.RemoveAtom(o)
        out.add(flat(one(rw)))
    return sorted(out)


def stork(ketone: str, amine: str, electrophile: str, michael_acceptor: bool = False) -> tuple[str | None, list[str]]:
    """Enamine; its C=C carbon not on N bonds to the electrophile; the C=N+ then hydrolyses to C=O."""
    en = unique(enamine(ketone, amine), "enamine")
    if en is None:
        return None, []
    n_c, n, c_nu = match_one(en, "[CX3](-[NX3])=[CX3]")
    rw, off = combine(en, electrophile)
    if michael_acceptor:
        h = hits(electrophile, ACCEPTOR)[0]
        rw.AddBond(c_nu, off[1] + h[0], SINGLE)
        rw.GetBondBetweenAtoms(off[1] + h[0], off[1] + h[1]).SetBondType(SINGLE)
    else:
        cx = hits(electrophile, HALIDE)[0]
        rw.AddBond(c_nu, off[1] + cx[0], SINGLE)
        rw.RemoveBond(off[1] + cx[0], off[1] + cx[1])
        rw.GetAtomWithIdx(off[1] + cx[1]).SetFormalCharge(-1)
    # C=C goes single (the iminium forms), then water swaps the C=N+ for C=O and frees the amine
    rw.GetBondBetweenAtoms(n_c, c_nu).SetBondType(SINGLE)
    rw.RemoveBond(n_c, n)
    k = rw.AddAtom(Chem.Atom(8))
    rw.AddBond(n_c, k, DOUBLE)
    got = [g for g in frags(rw) if g not in ("[Br-]", "[I-]", "[Cl-]")]
    return en, [flat(g) for g in got]


def iminium(amine: str) -> str:
    """Formaldehyde and a secondary amine: the N replaces the O, CH2=N+."""
    rw, off = combine("C=O", amine)
    n = off[1] + match_one(amine, "[NX3;H1]")[0]
    rw.AddBond(0, n, DOUBLE)
    rw.GetAtomWithIdx(n).SetFormalCharge(1)
    rw.RemoveAtom(1)
    return one(rw)


def mannich(ketone: str, amine: str) -> str | None:
    ion = iminium(amine)
    c, n = match_one(ion, "[CH2]=[N+]")
    out = []
    for a, _, _ in alpha_sites(ketone):
        rw, off = combine(ketone, ion)
        rw.AddBond(a, off[1] + c, SINGLE)
        rw.GetBondBetweenAtoms(off[1] + c, off[1] + n).SetBondType(SINGLE)
        rw.GetAtomWithIdx(off[1] + n).SetFormalCharge(0)
        out.append(flat(one(rw)))
    return unique(out, f"Mannich on {ketone}")


def reformatsky(bromoester: str, carbonyl: str) -> str:
    """The C-Br carbon bonds to the C=O carbon; Br leaves (on zinc); the C=O becomes C-OH at workup."""
    cb, br = match_one(bromoester, "[CX4][Br]")
    c, o = the_co(carbonyl)
    rw, off = combine(bromoester, carbonyl)
    rw.AddBond(cb, off[1] + c, SINGLE)
    rw.RemoveBond(cb, br)
    rw.GetAtomWithIdx(br).SetFormalCharge(-1)
    rw.GetBondBetweenAtoms(off[1] + c, off[1] + o).SetBondType(SINGLE)
    return flat(largest(frags(rw)))


def bonds_between(smi: str, i: int, j: int) -> int:
    return len(Chem.GetShortestPath(mol(smi), i, j)) - 1


def x_position(smi: str, x_smarts: str) -> str:
    """Where a group sits relative to the nearest C=O carbon: on the alpha, beta or gamma carbon."""
    m = mol(smi)
    carrier = hits(smi, x_smarts)[0][1]
    cs = [h[0] for h in hits(smi, "[CX3]=[OX1]")]
    d = min(bonds_between(smi, carrier, c) for c in cs)
    return {0: "carbonyl", 1: "alpha", 2: "beta", 3: "gamma"}.get(d, "other")


def same_formula(a: str, b: str) -> bool:
    return formula(a) == formula(b)


# ---------------------------------------------------------------------------
# Shared structures (each is drawn and named where it is used)
# ---------------------------------------------------------------------------

S = {
    "acetone": "CC(C)=O", "butanone": "CCC(C)=O", "chx": "O=C1CCCCC1", "mechx": "CC1CCCCC1=O",
    "acetal": "CC=O", "propanal": "CCC=O", "phcho": "O=Cc1ccccc1", "acphen": "CC(=O)c1ccccc1",
    "etoac": "CCOC(C)=O", "etprop": "CCOC(=O)CC", "etbz": "CCOC(=O)c1ccccc1", "acac": "CC(=O)CC(C)=O",
    "carbonate": "CCOC(=O)OCC", "formate": "CCOC=O", "oxalate": "CCOC(=O)C(=O)OCC", "mvk": "C=CC(C)=O",
    "chxenone": "O=C1C=CCCC1", "adipate": "CCOC(=O)CCCCC(=O)OCC", "pimelate": "CCOC(=O)CCCCCC(=O)OCC",
    "glutarate": "CCOC(=O)CCCC(=O)OCC", "hex25": "CC(=O)CCC(C)=O", "hep26": "CC(=O)CCCC(C)=O",
    "oct27": "CC(=O)CCCCC(C)=O", "pyrr": "C1CCNC1", "me2nh": "CNC", "brac": "CCOC(=O)CBr",
    "mei": "CI", "etbr": "CCBr", "bnbr": "BrCc1ccccc1", "buBr": "CCCCBr", "prBr": "CCCBr", "tbubr": "CC(C)(C)Br",
    "phbr": "Brc1ccccc1", "acn": "C=CC#N", "mea": "C=CC(=O)OC", "acoh": "CC(=O)O", "etoh": "CCO",
    "phoh": "Oc1ccccc1", "isobut": "CC(C)C=O", "pinac": "CC(=O)C(C)(C)C",
}


def first(got: list[str]) -> str:
    return got[0] if got else "C"


# ---------------------------------------------------------------------------
# u9-tautomer
# ---------------------------------------------------------------------------

def node_tautomer() -> None:
    node = "u9-tautomer"
    pick(node, "u9-tau-meet", "Propan-2-one meets a trace of acid. Pick its enol tautomer.",
         [o("enol", "C=C(C)O", "prop-1-en-2-ol", "An α-H moves to the oxygen and the C=O becomes C=C. Same atoms, new places for one H and one π bond."),
          o("alc", "CC(C)O", "propan-2-ol", "That has two more H. A tautomer keeps the formula; this is a reduction."),
          o("allyl", "C=CCO", "prop-2-en-1-ol", "The OH has moved to a different carbon. In an enol the OH sits on the carbon that held the C=O.")],
         enols(S["acetone"]), "enol", "An enol is the C=C-OH partner of a C=O: one H and one π bond move.",
         prov("Rule E on each alpha C-H", CH_ALPHA), lead(S["acetone"], "propan-2-one", "propan-2-one"),
         level=0, concepts=ENOL)

    n = len(enols(S["butanone"]))
    ask(node, "u9-tau-count", "Pick how many different enols butan-2-one can form, ignoring E and Z.",
        [("two", "Two", "Each side of the C=O has α-H: the CH₃ side and the CH₂ side give different enols."),
         ("one", "One", "Both α-carbons carry H, and they are not the same carbon type, so there are two."),
         ("three", "Three", "There are only two α-carbons. The ethyl CH₃ is β, too far from the C=O.")],
        {"one": 1, "two": 2, "three": 3}, n, "two", "One enol per distinct α-carbon that carries an H.",
        prov("distinct enols counted by Rule E", CH_ALPHA), lead(S["butanone"], "butan-2-one", "butan-2-one"),
        concepts=ENOL)

    cands = {"phcho": S["phcho"], "acetal": S["acetal"], "chx": S["chx"], "etoac": S["etoac"]}
    none = [k for k, s in cands.items() if not alpha_sites(s) and not alpha_sites(s, ester=True)]
    pick(node, "u9-tau-none", "Pick the compound that has no enol form.",
         [o("phcho", S["phcho"], "benzaldehyde", "The C=O carbon's only carbon neighbour is a ring carbon with no H. No α-H, no enol."),
          o("acetal", S["acetal"], "acetaldehyde", "Its CH₃ is an α-carbon with three H, so it can enolise."),
          o("chx", S["chx"], "cyclohexanone", "Both ring CH₂ groups next to the C=O carry α-H."),
          o("etoac", S["etoac"], "ethyl acetate", "The acetyl CH₃ is α to the ester C=O and has H.")],
         [cands[k] for k in none], "phcho", "No α-H means no enol and no enolate.",
         prov("alpha C-H counted by SMARTS", CH_ALPHA), lead("CC(C)(C)C=O", "2,2-dimethylpropanal", "an aldehyde with no α-H"),
         concepts=ENOL)

    pick(node, "u9-tau-keto", "Cyclohex-1-en-1-ol settles to its keto form. Pick it.",
         [o("k", S["chx"], "cyclohexanone", "The OH H returns to the α-carbon and the C=C becomes C=O."),
          o("ol", "OC1CCCCC1", "cyclohexanol", "That adds two H. Tautomerisation only moves one."),
          o("enone", "O=C1C=CCCC1", "cyclohex-2-en-1-one", "That has two fewer H. A tautomer keeps the formula.")],
         [keto_form("OC1=CCCCC1")], "k", "The keto form is the one RDKit's tautomer rules and the course both favour.",
         prov("keto form from RDKit's tautomer canonicaliser", CH_ALPHA), lead("OC1=CCCCC1", "cyclohex-1-en-1-ol", "the enol"),
         concepts=ENOL)

    conj = [e for e in enols(S["acac"]) if hits(e, "C=C-C=O")]
    pick(node, "u9-tau-acac", "Pick the enol of pentane-2,4-dione whose C=C is conjugated with the other C=O.",
         [o("mid", "CC(=O)C=C(C)O", "4-hydroxypent-3-en-2-one", "The CH₂ between the carbonyls gives up its H. The new C=C sits right beside the other C=O: conjugated."),
          o("end", "C=C(O)CC(C)=O", "4-hydroxypent-4-en-2-one", "That enol uses an end CH₃. Its C=C is one carbon away from the other C=O, so not conjugated."),
          o("diol", "CC(O)CC(C)O", "pentane-2,4-diol", "That is a reduction product with four more H, not a tautomer.")],
         conj, "mid", "Enolising toward the middle carbon puts the C=C in conjugation with the second C=O.",
         prov("Rule E, conjugation read by SMARTS C=C-C=O", CH_ALPHA), lead(S["acac"], "pentane-2,4-dione", "pentane-2,4-dione"),
         concepts=ENOL + RES)

    same = {"formula": same_formula(S["acetone"], "C=C(C)O"),
            "co": len(hits(S["acetone"], "C=O")) == len(hits("C=C(C)O", "C=O")),
            "sp2": sum(1 for a in mol(S["acetone"]).GetAtoms() if str(a.GetHybridization()) == "SP2")
            == sum(1 for a in mol("C=C(C)O").GetAtoms() if str(a.GetHybridization()) == "SP2")}
    ask(node, "u9-tau-same", "Propan-2-one and prop-1-en-2-ol are tautomers. Pick what they share.",
        [("formula", "The molecular formula", "Both are C₃H₆O. Tautomers are constitutional isomers that differ in where one H and one π bond sit."),
         ("co", "A C=O group", "The enol has C=C and O-H instead of the C=O."),
         ("sp2", "The same number of sp² atoms", "The enol's CH₂ carbon is sp², but in the ketone that carbon is sp³.")],
        {k: True if k == "formula" else None for k in same}, True if same["formula"] and not same["co"] and not same["sp2"] else None, "formula",
        "Tautomers have one formula; what moves is an H and a double bond.",
        prov("formula and hybridisation compared by RDKit", CH_ALPHA),
        pair(named(S["acetone"], "propan-2-one"), named("C=C(C)O", "prop-1-en-2-ol")), concepts=ENOL)


# ---------------------------------------------------------------------------
# u9-pka
# ---------------------------------------------------------------------------

def node_pka() -> None:
    node = "u9-pka"
    sites = sites_of(S["acac"])
    mid = central(S["acac"])
    end = [i for i, s in sites.items() if s == "ketone_alpha_ch"][0]
    best = most_acidic(S["acac"])
    ask(node, "u9-pka-meet", "Pick the most acidic H in pentane-2,4-dione.",
        [("mid", "An H on the CH₂ between the two C=O", "Its carbanion is shared by both C=O groups. The course table puts this C-H near pKa 10."),
         ("end", "An H on an end CH₃", "That carbanion is stabilised by one C=O only, near pKa 20."),
         ("none", "None: C-H bonds are not acidic", "A C-H next to a C=O is acidic, because the C=O holds the negative charge.")],
        {"mid": sites[mid], "end": sites[end], "none": None}, best, "mid",
        "Between two carbonyls is the most acidic C-H in the unit.",
        prov("protons classified by SMARTS, pKa read from packages/curriculum/src/pka.ts", CH_ALPHA),
        lead(S["acac"], "pentane-2,4-dione", "pentane-2,4-dione"), level=0, concepts=PKA)

    site = most_acidic(S["acetone"])
    full = [b for b in ("LDA", "NaOEt", "NaOH", "NaHCO3") if deprotonates_fully(b, site)]
    ask(node, "u9-pka-acetone", "Pick the base that turns propan-2-one fully into its enolate.",
        [("LDA", "LDA", "Its conjugate acid, diisopropylamine, sits near pKa 35, far above the α-H at about 20."),
         ("NaOEt", "NaOEt", "Ethanol is near pKa 16, below 20. Only a small share of enolate forms."),
         ("NaOH", "NaOH", "Water is near pKa 16 too. The equilibrium lies on the ketone side."),
         ("NaHCO3", "NaHCO₃", "Carbonic acid is near pKa 6. Far too weak a base for a C-H.")],
        {b: (b if b in full else None) for b in ("LDA", "NaOEt", "NaOH", "NaHCO3")}, full[0] if len(full) == 1 else "x", "LDA",
        "Full deprotonation needs a base whose conjugate acid is weaker than the C-H.",
        prov("Rule P on the course pKa table", CH_ALPHA), lead(S["acetone"], "propan-2-one", "propan-2-one"), concepts=PKA)

    site = most_acidic(MALONATE)
    opts = ("NaOEt", "NaHCO3")
    full = [b for b in opts if deprotonates_fully(b, site)]
    ask(node, "u9-pka-malonate", "Pick the base strong enough to deprotonate diethyl malonate fully.",
        [("NaOEt", "NaOEt", "The CH₂ between two esters is near pKa 10; ethanol, near 16, is the weaker acid. The enolate wins."),
         ("NaHCO3", "NaHCO₃", "Carbonic acid, near 6.4, is a stronger acid than the C-H. The proton stays put."),
         ("H2O", "Water alone", "Hydronium is a far stronger acid than the C-H, so water barely removes it.")],
        {"NaOEt": "NaOEt" if "NaOEt" in full else None, "NaHCO3": "NaHCO3" if "NaHCO3" in full else None, "H2O": None},
        full[0] if len(full) == 1 else "x", "NaOEt",
        "A doubly activated C-H needs only an alkoxide.",
        prov("Rule P on the course pKa table", CH_ALPHA), lead(MALONATE, "diethyl propanedioate", "diethyl malonate"), concepts=PKA)

    cands = {"acoh": S["acoh"], "etoh": S["etoh"], "acetone": S["acetone"], "phoh": S["phoh"]}
    ch = [k for k, s in cands.items() if most_acidic(s).endswith("_ch")]
    pick(node, "u9-pka-ch", "Pick the compound whose most acidic H is on carbon.",
         [o("acetone", S["acetone"], "propan-2-one", "No O-H at all. Its most acidic H is α to the C=O, near pKa 20."),
          o("acoh", S["acoh"], "acetic acid", "The O-H, near pKa 5, beats its α-C-H by far."),
          o("etoh", S["etoh"], "ethanol", "The O-H, near 16, is its most acidic H."),
          o("phoh", S["phoh"], "phenol", "The phenol O-H, near 10, is the acidic one.")],
         [cands[k] for k in ch], "acetone", "Without an O-H, the α-C-H is the acidic site.",
         prov("protons classified by SMARTS, pKa read from pka.ts", CH_ALPHA), lead("CC(=O)CC", "butan-2-one", "a ketone"),
         concepts=PKA)

    k, e = pka_of(S["acetone"]), pka_of(S["etoac"])
    ask(node, "u9-pka-ester", "Pick which α-H is more acidic: propan-2-one's or ethyl acetate's.",
        [("ketone", "Propan-2-one's", "Near pKa 20 against about 25. The ester's OR donates into the C=O, so it holds the charge less well."),
         ("ester", "Ethyl acetate's", "The ester's α-H is the weaker acid, near 25. That gap is what makes a crossed Claisen controllable."),
         ("same", "About the same", "The course table puts them five units apart.")],
        {"ketone": "ketone", "ester": "ester", "same": "same"}, "ketone" if k < e else "ester" if e < k else "same", "ketone",
        "Ketone α-H near 20, ester α-H near 25.", prov("pKa read from pka.ts", CH_ALPHA),
        pair(named(S["acetone"], "propan-2-one"), named(S["etoac"], "ethyl acetate")), concepts=PKA)

    cards = [
        ("acid", "Acetic acid", S["acoh"], "acetic acid", "Carboxylic acid O-H, near pKa 5."),
        ("dione", "Pentane-2,4-dione", S["acac"], "pentane-2,4-dione", "C-H between two C=O, near pKa 10."),
        ("etoh", "Ethanol", S["etoh"], "ethanol", "Alcohol O-H, near pKa 16."),
        ("ketone", "Propan-2-one", S["acetone"], "propan-2-one", "Ketone α-H, near pKa 20."),
        ("ester", "Ethyl acetate", S["etoac"], "ethyl acetate", "Ester α-H, near pKa 25."),
    ]
    ladder(node, "u9-pka-ladder", cards, pka_of,
           "Rank by the most acidic H in each, most acidic first.",
           "Find each molecule's best acidic H first, then compare those.",
           "acidity", ("Most acidic", "Least acidic"),
           "Rank acetic acid, pentane-2,4-dione, ethanol, propan-2-one and ethyl acetate by acidity, most acidic first.",
           ("Acid, dione, alcohol, ketone, ester.", "Each step down is a conjugate base that holds its charge less well.",
            "Look for the O-H or C-H whose anion is best stabilised."),
           [("reversed", ["ester", "ketone", "etoh", "dione", "acid"], "ordering_is_reversed",
             ("The ladder read from the bottom.", "Lower pKa is more acidic.", "Put the carboxylic acid first.")),
            ("etoh-dione", ["acid", "etoh", "dione", "ketone", "ester"], "ordering_one_adjacent_pair_swapped",
             ("Ethanol above the dione.", "The dione's C-H, near 10, beats the alcohol O-H, near 16.", "Compare the dione's middle C-H with ethanol's O-H."))],
           "The α-proton ladder: two C=O near 10, one ketone near 20, one ester near 25.",
           prov("pKa read per card from pka.ts", CH_ALPHA), PKA, "enols_and_enolates")


# ---------------------------------------------------------------------------
# u9-enolate-res
# ---------------------------------------------------------------------------

def node_enolate_res() -> None:
    node = "u9-enolate-res"
    pick(node, "u9-res-meet", "A base removes an α-H from cyclohexanone. Pick the enolate.",
         [o("enolate", "[O-]C1=CCCCC1", "cyclohex-1-en-1-olate", "The C-H pair of electrons becomes the C=C, and the C=O electrons move onto O. Drawn with the charge on O."),
          o("alkoxide", "[O-]C1CCCCC1", "cyclohexanolate", "That is an alkoxide: it needs a hydride added to the C=O first."),
          o("enone", "O=C1C=CCCC1", "cyclohex-2-en-1-one", "That has lost two H, not one proton. It carries no charge.")],
         enols(S["chx"], -1), "enolate", "An enolate is the deprotonated enol: C=C-O⁻ ↔ ⁻C-C=O.",
         prov("Rule E with charge", CH_ALPHA), lead(S["chx"], "cyclohexanone", "cyclohexanone"), level=0, concepts=ENOL)

    atoms = neg_atoms("C=C(C)[O-]")
    ask(node, "u9-res-atoms", "Pick the atoms that share the negative charge in propan-2-one's enolate.",
        [("oc", "The O and the α-carbon", "Two resonance forms: C=C-O⁻ and ⁻C-C=O. The charge sits on O in one and on the α-carbon in the other."),
         ("ocarb", "The O and the carbonyl carbon", "The carbonyl carbon is the middle of the three-atom system. It never carries the charge."),
         ("o", "The O only", "The α-carbon's form is real too, and it is the one that makes new C-C bonds.")],
        {"oc": ["C", "O"], "ocarb": ["C", "O", "x"], "o": ["O"]}, atoms, "oc",
        "An enolate is an ambident nucleophile: O and the α-carbon.",
        prov("resonance forms enumerated by RDKit ResonanceMolSupplier", CH_ALPHA), lead("C=C(C)[O-]", "prop-1-en-2-olate", "the enolate"),
        concepts=ENOL + RES)

    hyb = hybrid("C=C(C)[O-]", 0)
    ask(node, "u9-res-hyb", "Pick the hybridisation of the α-carbon in an enolate.",
        [("sp2", "sp²", "It is part of the C=C-O π system, so it is trigonal planar and its p orbital overlaps the C=O."),
         ("sp3", "sp³", "That was the α-carbon before the proton left. Once it joins the π system it flattens."),
         ("sp", "sp", "That would need two π bonds on one carbon.")],
        {"sp2": "SP2", "sp3": "SP3", "sp": "SP"}, hyb, "sp2",
        "Planar enolate carbon: that is why its stereocentre, if it had one, is lost.",
        prov("hybridisation from RDKit", CH_ALPHA), lead("C=C(C)[O-]", "prop-1-en-2-olate", "the enolate"), concepts=ENOL)

    e = "C=C(C)[O-]"
    c_alk = alkylate(S["acetone"], alpha_sites(S["acetone"])[0][0], S["mei"])
    pick(node, "u9-res-c", "Propan-2-one's enolate reacts with CH₃I on carbon. Pick the product.",
         [o("c", c_alk, "butan-2-one", "The α-carbon attacks CH₃ in SN2. The new C-C bond makes a bigger ketone."),
          o("o", "C=C(C)OC", "2-methoxyprop-1-ene", "That is O-alkylation: the oxygen end attacked. This item asks for the carbon end."),
          o("alc", "CC(C)(C)O", "2-methylpropan-2-ol", "That is what CH₃MgBr does to the C=O, not what CH₃I does to an enolate.")],
         [c_alk], "c", "C-alkylation makes a new C-C bond at the α-carbon.",
         prov("Rule H alkylation at the alpha carbon", CH_ALPHA, "carbon is the usual site for alkyl halides"), lead(e, "prop-1-en-2-olate", "enolate + CH₃I"),
         concepts=ENOL + ALK, convention="carbon is the usual site for alkyl halides")

    rw = Chem.RWMol(mol("[O-]C1=CCCCC1"))
    j = rw.AddAtom(Chem.Atom(6))
    rw.AddBond(0, j, SINGLE)
    rw.GetAtomWithIdx(0).SetFormalCharge(0)
    o_alk = one(rw)
    pick(node, "u9-res-o", "Cyclohexanone's enolate reacts on oxygen with a methyl group. Pick the product.",
         [o("o", o_alk, "1-methoxycyclohex-1-ene", "The O end bonds to CH₃. The C=C stays, giving an enol ether."),
          o("c", "CC1CCCCC1=O", "2-methylcyclohexan-1-one", "That is C-alkylation, the carbon end. This item asks for the oxygen end."),
          o("ether", "COC1CCCCC1", "methoxycyclohexane", "That has no C=C. O-alkylation keeps the enolate's double bond.")],
         [o_alk], "o", "O-alkylation gives an enol ether; C-alkylation gives a ketone.",
         prov("Rule E then an O-C bond to methyl", CH_ALPHA), lead("[O-]C1=CCCCC1", "cyclohex-1-en-1-olate", "the enolate"),
         concepts=ENOL)

    n = len(neg_atoms("CC(=O)C=C(C)[O-]"))
    ask(node, "u9-res-acac", "Pick how many atoms share the charge in pentane-2,4-dione's enolate.",
        [("three", "Three", "Both oxygens and the middle carbon: three resonance forms. That spread is why its pKa is near 10."),
         ("two", "Two", "That is a simple enolate. Here a second C=O adds a third form."),
         ("five", "Five", "The end carbons and carbonyl carbons never hold the charge.")],
        {"two": 2, "three": 3, "five": 5}, n, "three", "More atoms sharing the charge, more stable anion, lower pKa.",
        prov("resonance forms enumerated by RDKit", CH_ALPHA), lead("CC(=O)C=C(C)[O-]", "4-oxopent-2-en-2-olate", "the enolate"),
        concepts=ENOL + RES)


# ---------------------------------------------------------------------------
# u9-kvt-enolate
# ---------------------------------------------------------------------------

def node_kvt() -> None:
    node = "u9-kvt-enolate"
    k = enolate(S["mechx"], "kinetic")
    t = enolate(S["mechx"], "thermo")
    pick(node, "u9-kvt-meet", "2-Methylcyclohexanone meets LDA at −78 °C. Pick the enolate formed.",
         [o("k", k, "6-methylcyclohex-1-en-1-olate", "LDA is bulky and the flask is cold: it takes the most reachable H, on the CH₂ side. This is the kinetic enolate."),
          o("t", t, "2-methylcyclohex-1-en-1-olate", "That is the more substituted, thermodynamic enolate. It needs equilibrating conditions."),
          o("alk", "CC1CCCCC1[O-]", "2-methylcyclohexan-1-olate", "That is an alkoxide. LDA removes a proton; it adds no hydride.")],
         [k], "k", "Cold, bulky, irreversible: the kinetic enolate, on the side with more H.",
         prov("Rule E at the alpha carbon with more H", CH_ALPHA, KINETIC_CONV), lead(S["mechx"], "2-methylcyclohexan-1-one", "LDA, −78 °C"),
         level=0, concepts=KVT + ENOL, convention=KINETIC_CONV)

    pick(node, "u9-kvt-thermo", "2-Methylcyclohexanone with NaOEt in warm ethanol. Pick the major enolate.",
         [o("t", t, "2-methylcyclohex-1-en-1-olate", "Ethoxide deprotonates reversibly, so the enolates equilibrate. The more substituted C=C wins."),
          o("k", k, "6-methylcyclohex-1-en-1-olate", "That forms faster, but under reversible conditions it reverts and ends up as the more stable one."),
          o("alk", "CC1CCCCC1[O-]", "2-methylcyclohexan-1-olate", "No hydride is present. An alkoxide base only moves protons.")],
         [t], "t", "Warm and reversible: the thermodynamic, more substituted enolate.",
         prov("Rule E at the more substituted alpha carbon", CH_ALPHA, KINETIC_CONV), lead(S["mechx"], "2-methylcyclohexan-1-one", "NaOEt, warm"),
         concepts=KVT + ENOL, convention=KINETIC_CONV)

    kb = enolate(S["butanone"], "kinetic")
    pick(node, "u9-kvt-butanone", "Butan-2-one meets LDA at −78 °C. Pick the enolate.",
         [o("k", kb, "but-1-en-2-olate", "The CH₃ has three H against the CH₂'s two, and it is less hindered. LDA takes one of those."),
          o("t", "CC=C([O-])C", "but-2-en-2-olate", "That is the internal, more substituted enolate: the thermodynamic one."),
          o("alk", "CCC(C)[O-]", "butan-2-olate", "That is an alkoxide, from a reduction, not a deprotonation.")],
         [kb], "k", "Kinetic deprotonation picks the methyl side.",
         prov("Rule E at the alpha carbon with more H", CH_ALPHA, KINETIC_CONV), lead(S["butanone"], "butan-2-one", "LDA, −78 °C"),
         concepts=KVT + ENOL, convention=KINETIC_CONV)

    ka, kc, _ = best_alphas(S["mechx"], "kinetic")[0]
    ta, tc, _ = best_alphas(S["mechx"], "thermo")[0]
    more = "subst" if c_subst(S["mechx"], ta, tc) > c_subst(S["mechx"], ka, kc) else None
    ask(node, "u9-kvt-why", "Pick why 2-methylcyclohex-1-en-1-olate is the more stable enolate.",
        [("subst", "Its C=C carries more alkyl groups", "Like alkenes, a more substituted enolate C=C is more stable. That is what equilibration finds."),
         ("acid", "Its α-H was more acidic to begin with", "Both α-H sit near pKa 20. Stability of the product, not speed of removal, decides here."),
         ("fast", "It forms faster", "The kinetic enolate forms faster. Stability and speed point to different sides here.")],
        {"subst": "subst", "acid": None, "fast": None}, more, "subst",
        "Thermodynamic means most stable, and for an enolate that means most substituted C=C.",
        prov("alkene substitution counted on each enolate", CH_ALPHA, KINETIC_CONV),
        lead(t, "2-methylcyclohex-1-en-1-olate", "the thermodynamic enolate"), concepts=KVT, convention=KINETIC_CONV)

    site = most_acidic(S["acetone"])
    irrev = {b: deprotonates_fully(b, site) for b in ("LDA", "NaOEt", "NaOH")}
    ask(node, "u9-kvt-conditions", "Pick the conditions that lock in the kinetic enolate.",
        [("LDA", "LDA in THF at −78 °C", "Diisopropylamine, near pKa 35, is far weaker than the α-H. Deprotonation is complete and does not reverse."),
         ("NaOEt", "NaOEt in ethanol, reflux", "Ethanol, near 16, can give the proton back. Reversible conditions end at the thermodynamic enolate."),
         ("NaOH", "NaOH in water, warm", "Water, near 16, also equilibrates the enolates.")],
        {b: ("irreversible" if irrev[b] else "reversible") for b in irrev}, "irreversible", "LDA",
        "Kinetic control needs a base the ketone cannot give the proton back to.",
        prov("Rule P on the course pKa table", CH_ALPHA, KINETIC_CONV), lead(S["mechx"], "2-methylcyclohexan-1-one", "2-methylcyclohexanone"),
        concepts=KVT + PKA, convention=KINETIC_CONV)

    dm = "CC1(C)CCCCC1=O"
    one_side = enols(dm, -1)
    pick(node, "u9-kvt-blocked", "2,2-Dimethylcyclohexanone meets LDA. Pick the enolate.",
         [o("e", first(one_side), "6,6-dimethylcyclohex-1-en-1-olate", "C2 has no H at all, so only the CH₂ side can lose a proton. Kinetic and thermodynamic give the same enolate."),
          o("alk", "CC1(C)CCCCC1[O-]", "2,2-dimethylcyclohexan-1-olate", "An alkoxide needs a hydride. LDA only removes a proton."),
          o("k", dm, "2,2-dimethylcyclohexan-1-one", "LDA is strong enough to deprotonate it. The ketone does not survive unchanged.")],
         one_side, "e", "A quaternary α-carbon cannot enolise, so only one enolate exists.",
         prov("Rule E on every alpha C-H; one exists", CH_ALPHA), lead(dm, "2,2-dimethylcyclohexan-1-one", "LDA"),
         concepts=KVT + ENOL)


# ---------------------------------------------------------------------------
# u9-halo-acid
# ---------------------------------------------------------------------------

def node_halo_acid() -> None:
    node = "u9-halo-acid"
    p = halo_acid(S["acetone"], "Br")
    pick(node, "u9-ha-meet", "Propan-2-one meets one Br₂ in acetic acid. Pick the product.",
         [o("mono", p, "1-bromopropan-2-one", "The enol attacks Br₂ once. Acid stops at one bromine."),
          o("tri", "CC(=O)C(Br)(Br)Br", "1,1,1-tribromopropan-2-one", "Three bromines is the base outcome. Under acid the first Br slows the next enol."),
          o("alc", "CC(C)Br", "2-bromopropane", "The C=O is still there in the product. Bromine replaces an α-H, not the oxygen.")],
         [p], "mono", "Acid: the enol, one halogen.",
         prov("Rule H, one X at the alpha carbon", CH_ALPHA, HALO_CONV), lead(S["acetone"], "propan-2-one", "Br₂, CH₃CO₂H"),
         level=0, concepts=ENOL, convention=HALO_CONV)

    p = halo_acid(S["butanone"], "Br")
    pick(node, "u9-ha-butanone", "Butan-2-one meets Br₂ with acid. Pick the major product.",
         [o("int", p, "3-bromobutan-2-one", "Acid forms the more substituted enol, toward the CH₂. Bromine lands there."),
          o("end", "CCC(=O)CBr", "1-bromobutan-2-one", "That comes from the less substituted enol. Under acid the internal enol dominates."),
          o("di", "CC(=O)C(C)(Br)Br", "3,3-dibromobutan-2-one", "Acid stops at one bromine.")],
         [p], "int", "Acid halogenation follows the more substituted enol.",
         prov("Rule H via the more substituted enol", CH_ALPHA, HALO_CONV), lead(S["butanone"], "butan-2-one", "Br₂, H⁺"),
         concepts=ENOL + KVT, convention=HALO_CONV)

    p = halo_acid(S["mechx"], "Br")
    pick(node, "u9-ha-ring", "2-Methylcyclohexanone meets Br₂ in acetic acid. Pick the product.",
         [o("t", p, "2-bromo-2-methylcyclohexan-1-one", "The more substituted enol puts its C=C toward C2, so Br bonds to the carbon that has the methyl."),
          o("k", "CC1CCCC(Br)C1=O", "2-bromo-6-methylcyclohexan-1-one", "That is the less substituted side, the one LDA would choose."),
          o("di", "CC1(Br)CCCC(Br)C1=O", "2,6-dibromo-2-methylcyclohexan-1-one", "One Br₂ under acid gives one bromine.")],
         [p], "t", "More substituted enol, so the more substituted α-carbon.",
         prov("Rule H via the more substituted enol", CH_ALPHA, HALO_CONV), lead(S["mechx"], "2-methylcyclohexan-1-one", "Br₂, CH₃CO₂H"),
         concepts=ENOL, convention=HALO_CONV)

    by = byproduct([S["acetone"], "BrBr"], [halo_acid(S["acetone"], "Br")], {"HBr": "Br", "H2": "[HH]", "H2O": "O", "Br-": "[Br-]"})
    ask(node, "u9-ha-byproduct", "Propan-2-one and Br₂ give 1-bromopropan-2-one. Pick the other product.",
        [("HBr", "HBr", "One Br bonds to carbon. The other leaves with the α-H as HBr, which also feeds the acid catalysis."),
         ("H2", "H₂", "No H-H bond forms. The α-H leaves as a proton."),
         ("H2O", "H₂O", "The oxygen stays in the ketone."),
         ("Br-", "Br⁻ alone", "Bromide alone leaves the H and the charge unbalanced.")],
        {"HBr": "HBr", "H2": "H2", "H2O": "H2O", "Br-": "Br-"}, by, "HBr",
        "Substitution of H by Br releases HBr.", prov("atom and charge balance", CH_ALPHA),
        lead(S["acetone"], "propan-2-one", "propan-2-one + Br₂"), concepts=ENOL)

    def charge_on(smi: str, i: int) -> float:
        m = Chem.AddHs(mol(smi))
        rdPartialCharges.ComputeGasteigerCharges(m)
        return m.GetAtomWithIdx(i).GetDoubleProp("_GasteigerCharge")
    enol0 = "C=C(C)O"
    enol1 = "BrC=C(C)O"
    c0 = charge_on(enol0, 0)
    c1 = charge_on(enol1, 1)
    slower = "less" if c1 > c0 else "more"
    ask(node, "u9-ha-stop", "Pick why acid halogenation stops after one bromine.",
        [("less", "Br makes the next enol's C=C less electron rich", "Bromine pulls electron density out of the C=C, so the bromo-enol attacks Br₂ more slowly than the first enol did."),
         ("more", "Br makes the next enol react faster", "That is the base story, where Br speeds the next deprotonation. Under acid the enol is the nucleophile, and Br slows it."),
         ("gone", "No α-H is left", "1-Bromopropan-2-one still has five α-H.")],
        {"less": "less", "more": "more", "gone": None}, slower, "less",
        "Under acid, each halogen deactivates the enol; under base, each halogen speeds the next step.",
        prov("Gasteiger charge on the nucleophilic enol carbon, with and without Br, computed by RDKit", CH_ALPHA, HALO_CONV),
        pair(named(enol0, "prop-1-en-2-ol"), named(enol1, "1-bromoprop-1-en-2-ol")), concepts=ENOL, convention=HALO_CONV)

    k = enols(S["acetone"])[0]
    ask(node, "u9-ha-enol", "Under acid, pick the species that attacks Br₂.",
        [("enol", "The neutral enol", "Acid catalyses tautomerisation. The enol's C=C is the nucleophile, and the ketone itself does not attack Br₂."),
         ("enolate", "The enolate anion", "Under acid there is essentially no enolate. That is the base route."),
         ("ketone", "The ketone's C=O", "The C=O is an electrophile. It needs to become the enol to act as a nucleophile.")],
        {"enol": Chem.GetFormalCharge(mol(k)), "enolate": -1, "ketone": None}, 0, "enol",
        "Acid route: ketone, enol, then halogen.", prov("Rule E, the enol is neutral", CH_ALPHA, HALO_CONV),
        lead(k, "prop-1-en-2-ol", "under acid"), concepts=ENOL, convention=HALO_CONV)


# ---------------------------------------------------------------------------
# u9-halo-base
# ---------------------------------------------------------------------------

def node_halo_base() -> None:
    node = "u9-halo-base"
    tri = trihalo(S["acetone"], "Br")
    pick(node, "u9-hb-meet", "Propan-2-one meets excess Br₂ and NaOH. Pick the product before any cleavage.",
         [o("tri", tri, "1,1,1-tribromopropan-2-one", "Each Br makes the H left on that carbon more acidic, so the same carbon is hit again and again."),
          o("mono", "CC(=O)CBr", "1-bromopropan-2-one", "Under base it does not stop. The second deprotonation is faster than the first."),
          o("spread", "BrCC(=O)CBr", "1,3-dibromopropan-2-one", "The brominated carbon is now the most acidic, so the same carbon reacts again.")],
         [tri], "tri", "Base: runaway halogenation on one carbon.",
         prov("Rule H, every H on the methyl", CH_ALPHA, HALO_CONV), lead(S["acetone"], "propan-2-one", "excess Br₂, NaOH"),
         level=0, concepts=ENOL, convention=HALO_CONV)

    def h_charge(smi: str, c: int) -> float:
        m = Chem.AddHs(mol(smi))
        rdPartialCharges.ComputeGasteigerCharges(m)
        return max(n.GetDoubleProp("_GasteigerCharge") for n in m.GetAtomWithIdx(c).GetNeighbors() if n.GetSymbol() == "H")
    more = "br" if h_charge("CC(=O)CBr", 3) > h_charge(S["acetone"], 0) else None
    ask(node, "u9-hb-why", "Pick why the second bromination is faster under base.",
        [("br", "Br makes the remaining α-H more acidic", "Bromine pulls electron density, so the H on the CH₂Br carbon is more positive and its anion more stable."),
         ("enol", "The bromo-enol is more nucleophilic", "Under base the step that matters is deprotonation, and Br speeds that."),
         ("less", "There are fewer H to remove", "Fewer H would make it slower, not faster.")],
        {"br": "br", "enol": None, "less": None}, more, "br",
        "Each halogen acidifies the next α-H, so base runs to CX₃.",
        prov("Gasteiger charge on the alpha H with and without Br, computed by RDKit", CH_ALPHA, HALO_CONV),
        pair(named(S["acetone"], "propan-2-one"), named("CC(=O)CBr", "1-bromopropan-2-one")), concepts=ENOL + PKA, convention=HALO_CONV)

    got = haloform(S["acetone"], "Br")
    anion = [g for g in got if "-" in g][0]
    pick(node, "u9-hb-cleave", "1,1,1-Tribromopropan-2-one meets NaOH. Pick the organic anion formed.",
         [o("ac", anion, "acetate", "Hydroxide adds to the C=O, and ⁻CBr₃ leaves: three Br make it a good enough leaving group. The acid then gives up its proton."),
          o("enolate", "BrC(Br)=C([O-])C", "1,1-dibromoprop-1-en-2-olate", "The CBr₃ carbon has no H left to lose. The next step is attack at the C=O."),
          o("brac", "O=C([O-])CBr", "bromoacetate", "The cut is between C=O and CBr₃, so all three Br leave together.")],
         [anion], "ac", "Haloform: a methyl ketone becomes a carboxylate one carbon shorter.",
         prov("Rule H then the C(=O)-CX3 cut", CH_ALPHA, HALO_CONV), lead(tri, "1,1,1-tribromopropan-2-one", "NaOH"),
         concepts=ENOL, convention=HALO_CONV)

    one_c = [g for g in got if "-" not in g][0]
    pick(node, "u9-hb-cbr3", "Pick the one-carbon product of the haloform cleavage of propan-2-one.",
         [o("chbr3", one_c, "tribromomethane", "The ⁻CBr₃ that leaves takes a proton: CHBr₃, bromoform.", text="CHBr₃ (bromoform)"),
          o("ch3br", "CBr", "bromomethane", "All three Br stay on the leaving carbon.", text="CH₃Br"),
          o("ch2br2", "BrCBr", "dibromomethane", "The leaving carbon carried three Br, not two.", text="CH₂Br₂")],
         [one_c], "chbr3", "The CX₃ group leaves as HCX₃.", prov("Rule H cut, the CX3 fragment", CH_ALPHA, HALO_CONV),
         lead(tri, "1,1,1-tribromopropan-2-one", "after NaOH"), concepts=ENOL, convention=HALO_CONV)

    t2 = trihalo(S["butanone"], "Br")
    pick(node, "u9-hb-butanone", "Butan-2-one meets excess Br₂ and NaOH. Pick the product before any cleavage.",
         [o("tri", t2, "1,1,1-tribromobutan-2-one", "Under base the methyl side is the one that runs away: each Br there acidifies the next H, ending at CBr₃."),
          o("int", "CC(=O)C(C)(Br)Br", "3,3-dibromobutan-2-one", "The CH₂ side is the acid-catalysed site. Under base the methyl ends up as CBr₃."),
          o("mono", "CCC(=O)CBr", "1-bromobutan-2-one", "Base does not stop at one Br.")],
         [t2], "tri", "Under base a methyl ketone's CH₃ becomes CX₃, ready for the haloform cut.",
         prov("Rule H, every H on the methyl", CH_ALPHA, HALO_CONV), lead(S["butanone"], "butan-2-one", "excess Br₂, NaOH"),
         concepts=ENOL, convention=HALO_CONV)

    rows = [("a", "Propan-2-one, Br₂, H⁺", "1-Bromopropan-2-one", "Acid: the enol, once.", lambda: halo_acid(S["acetone"], "Br")),
            ("b", "Propan-2-one, excess Br₂, NaOH", "Acetate and CHBr₃", "Base runs to CBr₃, then hydroxide cleaves.", lambda: haloform(S["acetone"], "Br")),
            ("c", "Acetophenone, excess I₂, NaOH", "Benzoate and CHI₃", "The same haloform, with iodine, on an aryl methyl ketone.", lambda: haloform(S["acphen"], "I"))]
    labels = {canon("CC(=O)CBr"): "1-Bromopropan-2-one",
              tuple(sorted(canon(s) for s in ("CC(=O)[O-]", "BrC(Br)Br"))): "Acetate and CHBr₃",
              tuple(sorted(canon(s) for s in ("O=C([O-])c1ccccc1", "IC(I)I"))): "Benzoate and CHI₃"}
    pairs = []
    for pid, left, right, why, run in rows:
        got = run()
        keyv = canon(got) if isinstance(got, str) else tuple(sorted(canon(s) for s in got))
        pairs.append((pid, left, right, why, labels.get(keyv)))
    match(node, "u9-hb-match", "Match each set of conditions to what forms.",
          "Acid stops at one halogen. Base with excess halogen runs a methyl ketone to the haloform cleavage.", pairs,
          "Acid: one X. Base: CX₃, then cleavage to a carboxylate and HCX₃.",
          prov("Rule H run on each row", CH_ALPHA, HALO_CONV), ENOL)


# ---------------------------------------------------------------------------
# u9-haloform (branch)
# ---------------------------------------------------------------------------

def node_haloform() -> None:
    node = "u9-haloform"
    got = haloform(S["acphen"], "I")
    one_c = [g for g in got if "-" not in g][0]
    anion = [g for g in got if "-" in g][0]
    pick(node, "u9-hf-meet", "Acetophenone meets excess I₂ and NaOH. Pick the one-carbon product.",
         [o("chi3", one_c, "triiodomethane", "The methyl is iodinated three times, then cleaved off as CHI₃, iodoform.", text="CHI₃ (iodoform)"),
          o("ch3i", "CI", "iodomethane", "The methyl gains three I before it leaves, not one.", text="CH₃I"),
          o("i2", "II", "diiodine", "I₂ is the reagent. It ends up on carbon and as iodide.", text="I₂")],
         [one_c], "chi3", "The iodoform test: a methyl ketone gives CHI₃.",
         prov("Rule H with I, then the C(=O)-CI3 cut", CH_ALPHA, HALO_CONV), lead(S["acphen"], "1-phenylethan-1-one", "I₂, NaOH"),
         level=0, concepts=ENOL, convention=HALO_CONV)

    pick(node, "u9-hf-anion", "Acetophenone, excess I₂, NaOH. Pick the carboxylate formed.",
         [o("bz", anion, "benzoate", "The ring keeps the carbonyl carbon, which becomes CO₂⁻. The methyl leaves as CHI₃."),
          o("pa", "O=C([O-])Cc1ccccc1", "2-phenylacetate", "That keeps an extra CH₂. The carbon lost is the methyl itself."),
          o("ac", "CC(=O)[O-]", "acetate", "The ring side is not cut. The bond that breaks is C(=O)-CI₃.")],
         [anion], "bz", "The carboxylate has one carbon fewer than the methyl ketone.",
         prov("Rule H cut", CH_ALPHA, HALO_CONV), lead(S["acphen"], "1-phenylethan-1-one", "acetophenone"),
         concepts=ENOL, convention=HALO_CONV)

    cands = {"butanone": S["butanone"], "pent3": "CCC(=O)CC", "chx": S["chx"], "bzph": "O=C(c1ccccc1)c1ccccc1"}
    yes = [k for k, s in cands.items() if is_methyl_ketone(s)]
    pick(node, "u9-hf-which", "Pick the ketone that gives a positive iodoform test.",
         [o("butanone", S["butanone"], "butan-2-one", "It has a CH₃ on the C=O, so it can be triply iodinated and cleaved."),
          o("pent3", "CCC(=O)CC", "pentan-3-one", "Both sides are ethyl. No CH₃ sits on the C=O."),
          o("chx", S["chx"], "cyclohexanone", "Its α-carbons are ring CH₂ groups, not a methyl."),
          o("bzph", "O=C(c1ccccc1)c1ccccc1", "diphenylmethanone", "No α-H at all.")],
         [cands[k] for k in yes], "butanone", "Only a methyl ketone, CH₃-C=O, passes.",
         prov("methyl ketone read by SMARTS", CH_ALPHA, HALO_CONV), lead("CC(=O)C1CCCCC1", "1-cyclohexylethan-1-one", "a methyl ketone"),
         concepts=ENOL, convention=HALO_CONV)

    a = [g for g in haloform(S["pinac"], "Br") if "-" in g][0]
    pick(node, "u9-hf-pinac", "3,3-Dimethylbutan-2-one, excess Br₂, NaOH. Pick the carboxylate.",
         [o("piv", a, "2,2-dimethylpropanoate", "The tert-butyl side has no α-H, so all the bromination is on the methyl, which then leaves as CHBr₃."),
          o("long", "CC(C)(C)CC(=O)[O-]", "3,3-dimethylbutanoate", "That keeps the methyl carbon. The haloform removes it."),
          o("ac", "CC(=O)[O-]", "acetate", "The tert-butyl group has no α-H, so it is never the side that leaves.")],
         [a], "piv", "The methyl leaves; the rest becomes the acid.",
         prov("Rule H cut", CH_ALPHA, HALO_CONV), lead(S["pinac"], "3,3-dimethylbutan-2-one", "Br₂, NaOH"),
         concepts=ENOL, convention=HALO_CONV)

    n = h_on(S["acphen"], match_one(S["acphen"], METHYL_KETONE)[0])
    ask(node, "u9-hf-count", "Pick how many iodines bond to acetophenone's methyl before cleavage.",
        [("three", "Three", "All three methyl H are replaced, making CI₃, which can leave as ⁻CI₃."),
         ("one", "One", "That is the acid outcome. Under base each I speeds the next."),
         ("two", "Two", "A third H is still there, and it is now the most acidic one.")],
        {"one": 1, "two": 2, "three": 3}, n, "three", "Every methyl H goes before the C-C bond breaks.",
        prov("H counted on the methyl", CH_ALPHA, HALO_CONV), lead(S["acphen"], "1-phenylethan-1-one", "acetophenone"),
        concepts=ENOL, convention=HALO_CONV)

    target = "O=C([O-])C1CCCCC1"
    opts = {"cy": "CC(=O)C1CCCCC1", "cyp": "CCC(=O)C1CCCCC1", "chx": S["chx"]}
    ok = [k for k, s in opts.items() if is_methyl_ketone(s) and canon(target) in {canon(g) for g in haloform(s, "I")}]
    pick(node, "u9-hf-retro", "Pick the ketone whose iodoform reaction gives cyclohexanecarboxylate.",
         [o("cy", opts["cy"], "1-cyclohexylethan-1-one", "Its methyl leaves as CHI₃ and the ring carbon keeps the new CO₂⁻."),
          o("cyp", opts["cyp"], "1-cyclohexylpropan-1-one", "An ethyl ketone has no methyl on the C=O, so it gives no haloform."),
          o("chx", S["chx"], "cyclohexanone", "No methyl on the C=O, and the ring would have to break.")],
         [opts[k] for k in ok], "cy", "Work back: add a CH₃ to the acid's carbon to find the methyl ketone.",
         prov("forward haloform run on each option", CH_ALPHA, HALO_CONV), lead(target, "cyclohexanecarboxylate", "the target"),
         concepts=ENOL + SYN, convention=HALO_CONV)


# ---------------------------------------------------------------------------
# u9-aldol
# ---------------------------------------------------------------------------

def node_aldol() -> None:
    node = "u9-aldol"
    p = aldol_one(S["acetal"], S["acetal"])
    pick(node, "u9-ald-meet", "Two ethanal molecules meet NaOH, cold. Pick the aldol product.",
         [o("ald", p, "3-hydroxybutanal", "One ethanal's enolate adds to the other's C=O. The new C-C bond links the α-carbon to the carbonyl carbon."),
          o("cond", "CC=CC=O", "but-2-enal", "That is the condensation product. Cold conditions stop at the β-hydroxy aldehyde."),
          o("ester", "CCOC(C)=O", "ethyl acetate", "That joins the carbons through an O. An aldol makes a C-C bond.")],
         [p], "ald", "Aldol addition: enolate plus C=O gives a β-hydroxy carbonyl.",
         prov("Rule A, self aldol", CH_COND), lead(S["acetal"], "acetaldehyde", "2 × ethanal, NaOH"), level=0, concepts=ALDOL)

    p = aldol_one(S["propanal"], S["propanal"])
    pick(node, "u9-ald-propanal", "Two propanal molecules meet NaOH, cold. Pick the aldol product.",
         [o("ald", p, "3-hydroxy-2-methylpentanal", "The α-carbon is C2, which carries the CH₃. It bonds to the other propanal's C1."),
          o("lin", "CCC(O)CCC=O", "4-hydroxyhexanal", "That bond starts from C3, which is β, not α. Only the α-carbon is nucleophilic."),
          o("cond", "CCC=C(C)C=O", "2-methylpent-2-enal", "That has lost water. Cold conditions keep the OH.")],
         [p], "ald", "The α-carbon brings its substituent into the branch.",
         prov("Rule A, self aldol", CH_COND), lead(S["propanal"], "propanal", "2 × propanal, NaOH"), concepts=ALDOL)

    p = aldol_one(S["acetone"], S["acetone"])
    pick(node, "u9-ald-acetone", "Two propan-2-one molecules meet base. Pick the aldol product.",
         [o("ald", p, "4-hydroxy-4-methylpentan-2-one", "A methyl α-carbon adds to the other ketone's C=O. That carbon becomes a tertiary C-OH."),
          o("pinacol", "CC(C)(O)C(C)(C)O", "2,3-dimethylbutane-2,3-diol", "That joins the two carbonyl carbons, a reductive coupling. An aldol joins α-carbon to C=O."),
          o("lin", "CC(=O)CCC(C)=O", "hexane-2,5-dione", "No new OH means no addition to a C=O took place.")],
         [p], "ald", "Ketones do the aldol too; the product carries a tertiary alcohol.",
         prov("Rule A, self aldol", CH_COND), lead(S["acetone"], "propan-2-one", "2 × propan-2-one, base"), concepts=ALDOL)

    back = retro_aldol(p)
    pick(node, "u9-ald-retro", "4-Hydroxy-4-methylpentan-2-one is warmed with base. Pick the retro-aldol product.",
         [o("ac", first(back), "propan-2-one", "The C(OH)-C bond breaks: the alkoxide re-forms C=O and the enolate leaves. Two propan-2-one."),
          o("acetal", S["acetal"], "acetaldehyde", "Retro-aldol returns the pieces that went in, both three carbons here."),
          o("cond", "CC(=O)C=C(C)C", "4-methylpent-3-en-2-one", "That is dehydration, the forward condensation, not the retro step.")],
         back, "ac", "The aldol is reversible: base can cut the new C-C bond again.",
         prov("Rule A reversed", CH_COND), lead(p, "4-hydroxy-4-methylpentan-2-one", "base, warm"), concepts=ALDOL)

    pos = x_position(aldol_one(S["acetal"], S["acetal"]), "[OX2H1][CX4]")
    ask(node, "u9-ald-beta", "Pick where the OH sits in every aldol addition product.",
        [("beta", "On the β-carbon", "The acceptor's C=O carbon becomes the C-OH, two bonds from the donor's carbonyl carbon: the β position."),
         ("alpha", "On the α-carbon", "The α-carbon is the one that made the new bond. It carries no OH."),
         ("carbonyl", "On the carbonyl carbon", "That would be a hydrate. The donor's C=O survives as C=O.")],
        {"beta": "beta", "alpha": "alpha", "carbonyl": "carbonyl"}, pos, "beta",
        "Aldol products are β-hydroxy aldehydes or ketones.", prov("bond count from the OH carbon to the C=O carbon", CH_COND),
        lead(aldol_one(S["acetal"], S["acetal"]), "3-hydroxybutanal", "an aldol product"), concepts=ALDOL)

    rw_a, c_a, _ = alpha_sites(S["acetal"])[0]
    ask(node, "u9-ald-bond", "Pick the two carbons the aldol bond joins.",
        [("ac", "Donor α-carbon to acceptor C=O carbon", "The enolate's nucleophilic α-carbon attacks the electrophilic carbonyl carbon."),
         ("cc", "Two carbonyl carbons", "Both carbonyl carbons are electrophiles. Two electrophiles do not bond to each other."),
         ("aa", "Two α-carbons", "Two nucleophiles do not bond to each other either.")],
        {"ac": ("alpha", "carbonyl"), "cc": ("carbonyl", "carbonyl"), "aa": ("alpha", "alpha")}, ("alpha", "carbonyl"), "ac",
        "Nucleophile α-carbon, electrophile C=O carbon.", prov("Rule A, the bond the edit adds", CH_COND),
        lead(aldol_one(S["acetal"], S["acetal"]), "3-hydroxybutanal", "the new C-C bond"), concepts=ALDOL)


# ---------------------------------------------------------------------------
# u9-aldol-cond
# ---------------------------------------------------------------------------

def node_aldol_cond() -> None:
    node = "u9-aldol-cond"
    a = aldol_one(S["acetal"], S["acetal"])
    p = condensed(a)
    pick(node, "u9-cond-meet", "3-Hydroxybutanal is heated with NaOH. Pick the product.",
         [o("enal", p, "but-2-enal", "The α-H leaves to make an enolate, which pushes out the β-OH. The new C=C is conjugated with C=O."),
          o("enol", "C=CCC=O", "but-3-enal", "That C=C is not next to the C=O. E1cb puts it between α and β."),
          o("back", S["acetal"], "acetaldehyde", "That is retro-aldol. Heat with base here drives dehydration.")],
         [p], "enal", "Condensation is aldol plus loss of water, by E1cb.", prov("Rule A then E1cb", CH_COND),
         lead(a, "3-hydroxybutanal", "NaOH, heat"), level=0, concepts=ALDOL)

    p = condensed(aldol_one(S["propanal"], S["propanal"]))
    pick(node, "u9-cond-propanal", "Two propanal molecules are heated with NaOH. Pick the product.",
         [o("enal", p, "2-methylpent-2-enal", "Aldol to the β-hydroxy aldehyde, then water leaves between C2 and C3."),
          o("ald", "CCC(O)C(C)C=O", "3-hydroxy-2-methylpentanal", "That is the addition product. Heat takes it one step further."),
          o("lin", "CCC=CCC=O", "hex-3-enal", "That chain is unbranched. The α-carbon's CH₃ becomes a branch.")],
         [p], "enal", "Heat: the α,β-unsaturated aldehyde.", prov("Rule A then E1cb", CH_COND),
         lead(S["propanal"], "propanal", "2 × propanal, NaOH, heat"), concepts=ALDOL)

    p = condensed(aldol_one(S["acetone"], S["acetone"]))
    pick(node, "u9-cond-acetone", "Two propan-2-one molecules condense with heat. Pick the product.",
         [o("enone", p, "4-methylpent-3-en-2-one", "Aldol, then the tertiary OH leaves with an α-H, giving the conjugated enone."),
          o("ald", "CC(=O)CC(C)(C)O", "4-hydroxy-4-methylpentan-2-one", "That still carries the OH. Heat removes it."),
          o("dk", "CC(=O)CC(C)=O", "pentane-2,4-dione", "That would need an oxidation. Condensation only loses water.")],
         [p], "enone", "Ketones condense to enones.", prov("Rule A then E1cb", CH_COND),
         lead(S["acetone"], "propan-2-one", "2 × propan-2-one, heat"), concepts=ALDOL)

    a = aldol_one(S["acetone"], S["acetone"])
    by = byproduct([a], [condensed(a)], {"H2O": "O", "H2": "[HH]", "MeOH": "CO", "OH-": "[OH-]"})
    ask(node, "u9-cond-water", "Pick what is lost overall when an aldol product condenses.",
        [("H2O", "Water", "An α-H and the β-OH leave together. That is why it is called a condensation."),
         ("H2", "Hydrogen gas", "Nothing is oxidised. Removing H₂ would need a catalyst or oxidant."),
         ("MeOH", "Methanol", "No new carbon leaves. The carbons all stay in the enone."),
         ("OH-", "Hydroxide alone", "Hydroxide does leave the enolate, but the base took an α-H first, so the net loss is H₂O and the base comes back.")],
        {"H2O": "H2O", "H2": "H2", "MeOH": "MeOH", "OH-": "OH-"}, by, "H2O",
        "Condensation releases water.", prov("atom balance", CH_COND), lead(a, "4-hydroxy-4-methylpentan-2-one", "heat"), concepts=ALDOL)

    p = condensed(aldol_one(S["acetal"], S["acetal"]))
    conj = "conj" if hits(p, "C=C-C=O") else None
    ask(node, "u9-cond-why", "Pick why the new C=C forms between the α- and β-carbons.",
        [("conj", "It is conjugated with the C=O", "The α,β C=C overlaps with C=O. Conjugation lowers the energy and pulls the equilibrium."),
         ("less", "It is the less substituted alkene", "Substitution is not the deciding factor here. Conjugation is."),
         ("ring", "It avoids forming a ring", "No ring is involved in an open-chain condensation.")],
        {"conj": "conj", "less": None, "ring": None}, conj, "conj",
        "Conjugation with C=O is the driving force.", prov("conjugation read by SMARTS C=C-C=O", CH_COND),
        lead(p, "but-2-enal", "the condensation product"), concepts=ALDOL + RES)

    p = condensed(aldol_one(S["chx"], S["chx"]))
    pick(node, "u9-cond-chx", "Two cyclohexanone molecules condense with base and heat. Pick the product.",
         [o("e", p, "2-cyclohexylidenecyclohexan-1-one", "One ring's α-carbon adds to the other's C=O. Losing water puts a C=C between the two rings."),
          o("ald", "O=C1CCCCC1C1(O)CCCCC1", "2-(1-hydroxycyclohexyl)cyclohexan-1-one", "That is the addition product. Heat removes the water."),
          o("bi", "O=C1CCCCC1C1CCCCC1", "2-cyclohexylcyclohexan-1-one", "That has two extra H where the C=C should be.")],
         [p], "e", "Two rings joined by a conjugated C=C.", prov("Rule A then E1cb", CH_COND),
         lead(S["chx"], "cyclohexanone", "2 × cyclohexanone, heat"), concepts=ALDOL)

    cands = {"q": aldol_one(S["isobut"], S["phcho"]), "a": aldol_one(S["acetal"], S["acetal"]), "k": aldol_one(S["acetone"], S["acetone"])}
    stuck = [s for s in cands.values() if s is not None and not condense(s)]
    pick(node, "u9-cond-stuck", "Pick the aldol product that cannot dehydrate by E1cb.",
         [o("q", cands["q"], "3-hydroxy-2,2-dimethyl-3-phenylpropanal", "Its α-carbon has two methyls and no H. With no α-H there is no enolate, so the OH cannot leave by E1cb."),
          o("a", cands["a"], "3-hydroxybutanal", "Its α-CH₂ has H, so it dehydrates to but-2-enal."),
          o("k", cands["k"], "4-hydroxy-4-methylpentan-2-one", "Its α-CH₂ has H, so it dehydrates to the enone.")],
         stuck, "q", "E1cb needs an α-H to form the enolate first.", prov("E1cb run on each option", CH_COND),
         lead(S["isobut"], "2-methylpropanal", "an aldehyde with one α-H"), concepts=ALDOL)


# ---------------------------------------------------------------------------
# u9-crossed
# ---------------------------------------------------------------------------

CROSS_CONV = "in a crossed aldol the partner with no alpha H can only be the acceptor"


def node_crossed() -> None:
    node = "u9-crossed"
    p = condensed(aldol_one(S["acetone"], S["phcho"]))
    pick(node, "u9-cx-meet", "Benzaldehyde and propan-2-one meet NaOH with heat. Pick the crossed product.",
         [o("e", p, "4-phenylbut-3-en-2-one", "Benzaldehyde has no α-H, so it is only the acceptor. Propan-2-one's enolate adds, then water leaves."),
          o("self", "CC(=O)C=C(C)C", "4-methylpent-3-en-2-one", "That is propan-2-one with itself. Benzaldehyde is the better acceptor."),
          o("ald", "CC(=O)CC(O)c1ccccc1", "4-hydroxy-4-phenylbutan-2-one", "That is the addition product. Heat dehydrates it.")],
         [p], "e", "A partner with no α-H makes a crossed aldol clean.", prov("Rule A then E1cb", CH_COND, CROSS_CONV),
         pair(named(S["phcho"], "benzaldehyde"), named(S["acetone"], "propan-2-one")), level=0, concepts=ALDOL, convention=CROSS_CONV)

    cands = {"phcho": S["phcho"], "acetal": S["acetal"], "acetone": S["acetone"], "propanal": S["propanal"]}
    acc = [s for s in cands.values() if not alpha_sites(s)]
    pick(node, "u9-cx-acceptor", "Pick the partner that can only ever be the acceptor.",
         [o("phcho", S["phcho"], "benzaldehyde", "No α-H, so it cannot form an enolate. It can only be attacked."),
          o("acetal", S["acetal"], "acetaldehyde", "Its CH₃ has α-H, so it can be donor or acceptor."),
          o("acetone", S["acetone"], "propan-2-one", "Six α-H: it can be the donor."),
          o("propanal", S["propanal"], "propanal", "Its CH₂ has α-H.")],
         acc, "phcho", "No α-H: acceptor only.", prov("alpha H counted by SMARTS", CH_COND, CROSS_CONV),
         lead("CC(C)(C)C=O", "2,2-dimethylpropanal", "a partner with no α-H"), concepts=ALDOL, convention=CROSS_CONV)

    def count(a: str, b: str) -> int:
        prods: set[str] = set()
        for d in (a, b):
            for acc_ in (a, b):
                prods |= set(aldols(d, acc_))
        return len(prods)
    pairs_ = {"bz": (S["phcho"], S["acetone"]), "ep": (S["acetal"], S["propanal"]), "pb": (S["propanal"], "CCCC=O")}
    counts = {k: count(*v) for k, v in pairs_.items()}
    fewest = min(counts, key=counts.get) if sorted(counts.values())[0] < sorted(counts.values())[1] else None
    ask(node, "u9-cx-pair", "Pick the pair that gives the fewest possible aldol addition products.",
        [("bz", "Benzaldehyde and propan-2-one", "Only propan-2-one can be the donor, so at most two products form, and the crossed one dominates."),
         ("ep", "Acetaldehyde and propanal", "Both have α-H and both are good acceptors: four products."),
         ("pb", "Propanal and butanal", "Both enolise and both accept: four products.")],
        {"bz": "bz", "ep": "ep", "pb": "pb"}, fewest, "bz",
        "Count donors times acceptors. A partner with no α-H halves it.",
        prov("every donor-acceptor aldol enumerated by Rule A", CH_COND, CROSS_CONV),
        lead(S["phcho"], "benzaldehyde", "choosing a partner"), concepts=ALDOL, convention=CROSS_CONV)

    p = aldol_one(S["isobut"], "C=O")
    pick(node, "u9-cx-hcho", "2-Methylpropanal and methanal meet base. Pick the crossed aldol product.",
         [o("p", p, "3-hydroxy-2,2-dimethylpropanal", "Methanal has no α-H and is a very reactive acceptor. The enolate's α-carbon gains a CH₂OH."),
          o("self", "CC(C)C(O)C(C)(C)C=O", "3-hydroxy-2,2,4-trimethylpentanal", "That is 2-methylpropanal with itself. Methanal outcompetes it as acceptor."),
          o("red", "CC(C)CO", "2-methylpropan-1-ol", "No C-C bond formed here; that is a reduction.")],
         [p], "p", "Methanal is the best acceptor of all.", prov("Rule A", CH_COND, CROSS_CONV),
         pair(named(S["isobut"], "2-methylpropanal"), named("C=O", "methanal")), concepts=ALDOL, convention=CROSS_CONV)

    p = aldol_one(S["chx"], S["phcho"])
    pick(node, "u9-cx-lda", "Cyclohexanone, LDA, then benzaldehyde, then H₂O. Pick the product.",
         [o("p", p, "2-[hydroxy(phenyl)methyl]cyclohexan-1-one", "LDA turns all the ketone into enolate first, so only the crossed addition can happen."),
          o("self", "O=C1CCCCC1C1(O)CCCCC1", "2-(1-hydroxycyclohexyl)cyclohexan-1-one", "No free ketone is left to be attacked once LDA has acted."),
          o("alc", "OC(c1ccccc1)C1CCCCC1", "cyclohexyl(phenyl)methanol", "The ring C=O survives. The enolate carbon, not the C=O carbon, made the bond.")],
         [p], "p", "A preformed enolate controls which partner is the donor.", prov("Rule A on the preformed enolate", CH_COND),
         pair(named(S["chx"], "cyclohexanone"), named(S["phcho"], "benzaldehyde")), concepts=ALDOL)

    p = condensed(aldol_one(S["acphen"], S["phcho"]))
    pick(node, "u9-cx-chalcone", "Acetophenone and benzaldehyde meet NaOH with heat. Pick the product.",
         [o("p", p, "1,3-diphenylprop-2-en-1-one", "Acetophenone's methyl is the only α-carbon. It adds to benzaldehyde, then water leaves."),
          o("ald", "O=C(CC(O)c1ccccc1)c1ccccc1", "3-hydroxy-1,3-diphenylpropan-1-one", "That keeps the OH. Heat dehydrates it."),
          o("bz", "O=C(c1ccccc1)c1ccccc1", "diphenylmethanone", "No C-C bond would be made. The product must hold both partners' carbons.")],
         [p], "p", "Crossed aldol condensation, aryl ketone donor.", prov("Rule A then E1cb", CH_COND, CROSS_CONV),
         pair(named(S["acphen"], "1-phenylethan-1-one"), named(S["phcho"], "benzaldehyde")), concepts=ALDOL, convention=CROSS_CONV)


# ---------------------------------------------------------------------------
# u9-intra
# ---------------------------------------------------------------------------

def node_intra() -> None:
    node = "u9-intra"
    rings = intra_aldols(S["hex25"])
    size, a = favoured(rings)
    p = condensed(a)
    small = first(sorted(rings.get(3, set())))
    pick(node, "u9-in-meet", "Hexane-2,5-dione is heated with base. Pick the ring product.",
         [o("five", p, "3-methylcyclopent-2-en-1-one", "A terminal α-carbon reaches the other C=O and closes a five-membered ring. Water leaves to give the enone."),
          o("three", small, "1-(2-hydroxy-2-methylcyclopropyl)ethan-1-one", "The inner α-carbon could only close a strained three-membered ring. It does not compete."),
          o("open", "CC(=O)C=CC(C)=O", "hex-3-ene-2,5-dione", "That is an oxidation. An aldol makes a ring here.")],
         [p], "five", "Five- and six-membered rings win the intramolecular aldol.",
         prov("every intramolecular aldol enumerated, ring size by RDKit", CH_COND, RING_CONV), lead(S["hex25"], "hexane-2,5-dione", "base, heat"),
         level=0, concepts=ALDOL, convention=RING_CONV)

    rings6 = intra_aldols(S["hep26"])
    size6, a6 = favoured(rings6)
    p6 = condensed(a6)
    four = first(sorted(rings6.get(4, set())))
    pick(node, "u9-in-hep", "Heptane-2,6-dione is heated with base. Pick the product.",
         [o("six", p6, "3-methylcyclohex-2-en-1-one", "A terminal methyl attacks the far C=O: six-membered ring, then the conjugated enone."),
          o("four", four, "1-(2-hydroxy-2-methylcyclobutyl)ethan-1-one", "The inner CH₂ could only make a four-membered ring. Too strained to compete."),
          o("five", "CC1=CC(=O)CC1", "3-methylcyclopent-2-en-1-one", "That ring is from hexane-2,5-dione. This chain is one carbon longer.")],
         [p6], "six", "Count atoms to see which ring closes.", prov("every intramolecular aldol enumerated", CH_COND, RING_CONV),
         lead(S["hep26"], "heptane-2,6-dione", "base, heat"), concepts=ALDOL, convention=RING_CONV)

    ask(node, "u9-in-size", "Pick the ring size hexane-2,5-dione closes in its aldol.",
        [("five", "Five", "C1 attacks C5: C1, C2, C3, C4, C5 make the ring."),
         ("six", "Six", "Six needs one more carbon in the chain, as in heptane-2,6-dione."),
         ("three", "Three", "The C3 enolate could only make a three-membered ring, which is too strained.")],
        {"three": 3, "five": 5, "six": 6}, size, "five", "Number the ring atoms from the α-carbon to the attacked C=O.",
        prov("ring size by RDKit", CH_COND, RING_CONV), lead(S["hex25"], "hexane-2,5-dione", "the dione"), concepts=ALDOL, convention=RING_CONV)

    other = sorted(s for s in intra_aldols(S["hep26"]) if s != size6)
    ask(node, "u9-in-other", "In heptane-2,6-dione, pick the ring the inner α-carbon would make.",
        [("four", "Four", "C3 to C6 closes C3, C4, C5, C6: a four-membered ring, which is why it loses."),
         ("six", "Six", "Six comes from the terminal C1 attacking C6."),
         ("seven", "Seven", "No pair of atoms here is seven apart.")],
        {"four": 4, "six": 6, "seven": 7}, other[0] if len(other) == 1 else None, "four",
        "The losing ring is the strained one.", prov("every intramolecular aldol enumerated", CH_COND, RING_CONV),
        lead(S["hep26"], "heptane-2,6-dione", "the inner α-carbon"), concepts=ALDOL, convention=RING_CONV)

    s8, a8 = favoured(intra_aldols(S["oct27"]))
    p8 = condensed(a8)
    pick(node, "u9-in-oct", "Octane-2,7-dione is heated with base. Pick the product.",
         [o("five", p8, "1-(2-methylcyclopent-1-en-1-yl)ethan-1-one", "The inner CH₂ at C3 attacks C7: a five-membered ring. The terminal CH₃ would make seven."),
          o("seven", "CC1=CC(=O)CCCC1", "3-methylcyclohept-2-en-1-one", "Seven-membered rings close too slowly to compete with five."),
          o("six", "CC1=CC(=O)CCC1", "3-methylcyclohex-2-en-1-one", "That needs heptane-2,6-dione.")],
         [p8], "five", "The ring size decides which α-carbon reacts.", prov("every intramolecular aldol enumerated", CH_COND, RING_CONV),
         lead(S["oct27"], "octane-2,7-dione", "base, heat"), concepts=ALDOL, convention=RING_CONV)

    cands = {"hex": S["hex25"], "hep": S["hep26"], "oct": S["oct27"]}
    six = [s for s in cands.values() if favoured(intra_aldols(s))[0] == 6]
    pick(node, "u9-in-which", "Pick the dione that closes a six-membered ring.",
         [o("hep", S["hep26"], "heptane-2,6-dione", "Its terminal CH₃ is five bonds from the far C=O, which closes six."),
          o("hex", S["hex25"], "hexane-2,5-dione", "That closes a five-membered ring."),
          o("oct", S["oct27"], "octane-2,7-dione", "That closes five as well, using an inner α-carbon.")],
         six, "hep", "1,5-diketones give six-membered rings.", prov("ring size by RDKit", CH_COND, RING_CONV),
         lead("O=C1CCCC1", "cyclopentanone", "the ring to compare"), concepts=ALDOL, convention=RING_CONV)


# ---------------------------------------------------------------------------
# u9-claisen
# ---------------------------------------------------------------------------

def node_claisen() -> None:
    node = "u9-claisen"
    p = claisen_main(S["etoac"], S["etoac"])
    pick(node, "u9-cl-meet", "Two ethyl acetate molecules meet NaOEt, then H₃O⁺. Pick the product.",
         [o("p", p, "ethyl 3-oxobutanoate", "One ester's enolate attacks the other's C=O; ethoxide leaves. The result is a β-keto ester."),
          o("ald", "CCOC(=O)CC(C)(O)OCC", "ethyl 3-ethoxy-3-hydroxybutanoate", "That is the tetrahedral intermediate. Ethoxide leaves from it, like any acyl substitution."),
          o("acid", "CC(=O)O", "acetic acid", "That is hydrolysis. No water is present until the end.")],
         [p], "p", "Claisen: an ester enolate does acyl substitution on another ester.", prov("Rule C, self Claisen", CH_COND),
         lead(S["etoac"], "ethyl acetate", "2 × ethyl acetate, NaOEt"), level=0, concepts=ALDOL)

    p = claisen_main(S["etprop"], S["etprop"])
    pick(node, "u9-cl-prop", "Two ethyl propanoate molecules meet NaOEt, then H₃O⁺. Pick the product.",
         [o("p", p, "ethyl 2-methyl-3-oxopentanoate", "The α-carbon, carrying CH₃, bonds to the other ester's acyl carbon."),
          o("lin", "CCOC(=O)CCC(=O)CC", "ethyl 4-oxohexanoate", "That bond starts from the β-carbon, which is not acidic."),
          o("ket", "CCC(=O)CC", "pentan-3-one", "That would follow hydrolysis and decarboxylation, which this step does not include.")],
         [p], "p", "The donor's α-substituent ends up between the two C=O.", prov("Rule C, self Claisen", CH_COND),
         lead(S["etprop"], "ethyl propanoate", "2 × ethyl propanoate, NaOEt"), concepts=ALDOL)

    got = claisen(S["etoac"], alpha_sites(S["etoac"], ester=True)[0][0], S["etoac"])
    small = [g for g in got if g != largest(got)]
    by = byproduct([S["etoac"], S["etoac"]], [largest(got)], {"EtOH": "CCO", "H2O": "O", "MeOH": "CO", "CO2": "O=C=O"})
    ask(node, "u9-cl-lg", "Pick the small molecule the Claisen of ethyl acetate releases.",
        [("EtOH", "Ethanol", "The OEt on the attacked ester leaves as ethoxide and ends as ethanol."),
         ("H2O", "Water", "That is an aldol condensation's loss. A Claisen loses the alkoxy group."),
         ("MeOH", "Methanol", "Methanol would come from a methyl ester. These are ethyl esters."),
         ("CO2", "CO₂", "No carbon is lost in the Claisen itself.")],
        {"EtOH": "EtOH", "H2O": "H2O", "MeOH": "MeOH", "CO2": "CO2"}, by, "EtOH",
        "The leaving group is the ester's own alkoxide.", prov("atom balance", CH_COND),
        lead(S["etoac"], "ethyl acetate", "2 × ethyl acetate"), concepts=ALDOL)

    cands = {"iso": "CCOC(=O)C(C)C", "ac": S["etoac"], "pr": S["etprop"], "bu": "CCCC(=O)OCC"}
    dead = [s for s in cands.values() if not claisen_driven(claisen_main(s, s))]
    pick(node, "u9-cl-dead", "Pick the ester whose self-Claisen with NaOEt does not go.",
         [o("iso", cands["iso"], "ethyl 2-methylpropanoate", "Its product's carbon between the two C=O has no H, so ethoxide cannot deprotonate it. Nothing pulls the equilibrium."),
          o("ac", cands["ac"], "ethyl acetate", "Its product has a CH₂ between the C=O groups, which ethoxide deprotonates."),
          o("pr", cands["pr"], "ethyl propanoate", "Its product keeps one H between the C=O groups. That is enough."),
          o("bu", cands["bu"], "ethyl butanoate", "Its product keeps one H between the C=O groups.")],
         dead, "iso", "A Claisen needs two α-H on the donor: one to react, one to lose at the end.",
         prov("Rule C, then the product's C-H between the carbonyls checked", CH_COND, CLAISEN_CONV),
         lead("CCOC(=O)C(C)(C)C(=O)C(C)C", "ethyl 2,2,4-trimethyl-3-oxopentanoate", "the product it would need"),
         concepts=ALDOL + PKA, convention=CLAISEN_CONV)

    prod = claisen_main(S["etoac"], S["etoac"])
    drive = "deprot" if PKA_TABLE[most_acidic(prod)][0] < PKA_TABLE["alcohol"][0] else None
    ask(node, "u9-cl-drive", "Pick what pulls the Claisen forward.",
        [("deprot", "Ethoxide deprotonates the β-keto ester", "The CH₂ between two C=O, near pKa 10, is far more acidic than ethanol, near 16. That last step is downhill and pulls the rest."),
         ("lg", "Ethoxide is an excellent leaving group", "Ethoxide is a fair leaving group, but its loss alone is not downhill enough."),
         ("ket", "A ketone is more stable than an ester", "The ketone is less stabilised than the ester. That is why the earlier steps are uphill.")],
        {"deprot": "deprot", "lg": None, "ket": None}, drive, "deprot",
        "A full equivalent of base is needed because it is used up.", prov("pKa of the product read from pka.ts", CH_COND, CLAISEN_CONV),
        lead(prod, "ethyl 3-oxobutanoate", "the product"), concepts=ALDOL + PKA, convention=CLAISEN_CONV)

    or_ = canon(hydrolyse(S["etprop"])[0]) if canon(hydrolyse(S["etprop"])[0]) != canon("CCC(=O)O") else canon(hydrolyse(S["etprop"])[1])
    alcohols = {"NaOEt": canon("CCO"), "NaOMe": canon("CO"), "NaOH": canon("O")}
    match_ = [b for b, a in alcohols.items() if a == or_]
    ask(node, "u9-cl-base", "Pick the base for the Claisen of ethyl propanoate.",
        [("NaOEt", "NaOEt", "It matches the ester's OEt. Any attack by the base on the ester just swaps OEt for OEt."),
         ("NaOMe", "NaOMe", "Methoxide would swap some OEt for OMe, giving a mixture of esters."),
         ("NaOH", "NaOH", "Hydroxide saponifies the ester to a carboxylate, which cannot do a Claisen.")],
        {b: (b if b in match_ else None) for b in alcohols}, match_[0] if len(match_) == 1 else None, "NaOEt",
        "Match the alkoxide to the ester's alkoxy group.", prov("the ester's alcohol from Rule M hydrolysis compared with each base", CH_COND, BASE_MATCH_CONV),
        lead(S["etprop"], "ethyl propanoate", "choosing the base"), concepts=ALDOL, convention=BASE_MATCH_CONV)


# ---------------------------------------------------------------------------
# u9-dieckmann
# ---------------------------------------------------------------------------

def node_dieckmann() -> None:
    node = "u9-dieckmann"
    d6 = dieckmanns(S["adipate"])
    size, p = favoured(d6)
    pick(node, "u9-dk-meet", "Diethyl hexanedioate meets NaOEt, then H₃O⁺. Pick the product.",
         [o("p", p, "ethyl 2-oxocyclopentane-1-carboxylate", "One end's α-carbon attacks the other end's ester C=O: a Claisen inside one molecule closes a five-membered ring."),
          o("six", "CCOC(=O)C1CCCCC1=O", "ethyl 2-oxocyclohexane-1-carboxylate", "Six comes from the seven-carbon diester. This one has six carbons in its chain."),
          o("open", "CCOC(=O)CCCCC(=O)O", "6-ethoxy-6-oxohexanoic acid", "That is hydrolysis of one ester. NaOEt does not hydrolyse.")],
         [p] if p else None, "p", "Dieckmann: an intramolecular Claisen to a cyclic β-keto ester.",
         prov("Rule C inside one molecule; ring size by RDKit", CH_COND, RING_CONV), lead(S["adipate"], "diethyl hexanedioate", "NaOEt"),
         level=0, concepts=ALDOL, convention=RING_CONV)

    s7, p7 = favoured(dieckmanns(S["pimelate"]))
    pick(node, "u9-dk-pim", "Diethyl heptanedioate meets NaOEt, then H₃O⁺. Pick the product.",
         [o("p", p7, "ethyl 2-oxocyclohexane-1-carboxylate", "One more carbon in the chain closes a six-membered ring."),
          o("five", "CCOC(=O)C1CCCC1=O", "ethyl 2-oxocyclopentane-1-carboxylate", "That ring comes from the hexanedioate."),
          o("k", S["chx"], "cyclohexanone", "That would need hydrolysis and decarboxylation after the ring closes.")],
         [p7] if p7 else None, "p", "Seven-carbon diester, six-membered ring.", prov("Rule C inside one molecule", CH_COND, RING_CONV),
         lead(S["pimelate"], "diethyl heptanedioate", "NaOEt"), concepts=ALDOL, convention=RING_CONV)

    ask(node, "u9-dk-size", "Pick the ring size diethyl hexanedioate closes.",
        [("five", "Five", "The α-carbon C2 attacks C6: C2, C3, C4, C5, C6 make the ring."),
         ("six", "Six", "The ring runs C2 to C6, five atoms. C1 stays outside the ring as the ester."),
         ("seven", "Seven", "The ester O atoms are not in the ring.")],
        {"five": 5, "six": 6, "seven": 7}, size, "five", "Count from the α-carbon to the attacked carbonyl carbon.",
        prov("ring size by RDKit", CH_COND, RING_CONV), lead(S["adipate"], "diethyl hexanedioate", "the diester"), concepts=ALDOL, convention=RING_CONV)

    got = None
    for a, c1, _ in alpha_sites(S["adipate"], ester=True)[:1]:
        for h in hits(S["adipate"], ESTER):
            if h[0] != c1:
                rw = Chem.RWMol(mol(S["adipate"]))
                rw.AddBond(a, h[0], SINGLE)
                rw.RemoveBond(h[0], h[2])
                got = frags(rw)
                break
    by = byproduct([S["adipate"]], [largest(got)], {"EtOH": "CCO", "H2O": "O", "CO2": "O=C=O"}) if got else None
    ask(node, "u9-dk-by", "Pick what the Dieckmann of diethyl hexanedioate releases.",
        [("EtOH", "Ethanol", "The attacked ester loses its OEt, as in any Claisen."),
         ("H2O", "Water", "No OH is lost. This is acyl substitution."),
         ("CO2", "CO₂", "The ester carbon stays in the ring as the ketone C=O.")],
        {"EtOH": "EtOH", "H2O": "H2O", "CO2": "CO2"}, by, "EtOH", "Same leaving group as the Claisen.",
        prov("atom balance", CH_COND), lead(S["adipate"], "diethyl hexanedioate", "NaOEt"), concepts=ALDOL)

    cands = {"pim": S["pimelate"], "adi": S["adipate"], "glu": S["glutarate"]}
    six = [s for s in cands.values() if favoured(dieckmanns(s))[0] == 6]
    pick(node, "u9-dk-which", "Pick the diester whose Dieckmann gives a six-membered ring.",
         [o("pim", S["pimelate"], "diethyl heptanedioate", "Seven carbons in the chain: the α-carbon and the far C=O are five bonds apart."),
          o("adi", S["adipate"], "diethyl hexanedioate", "Six carbons in the chain close a five-membered ring."),
          o("glu", S["glutarate"], "diethyl pentanedioate", "Five carbons would close a strained four-membered ring.")],
         six, "pim", "Ring size is chain length minus one.", prov("ring size by RDKit", CH_COND, RING_CONV),
         lead(S["chx"], "cyclohexanone", "the ring wanted"), concepts=ALDOL, convention=RING_CONV)

    k = hydrolyse_decarb(p) if p else None
    pick(node, "u9-dk-decarb", "Ethyl 2-oxocyclopentane-1-carboxylate meets H₃O⁺ and heat. Pick the product.",
         [o("k", k, "cyclopentanone", "The ester hydrolyses to a β-keto acid, which loses CO₂ through a six-atom ring."),
          o("acid", "O=C(O)C1CCCC1=O", "2-oxocyclopentane-1-carboxylic acid", "That is hydrolysis only. With heat the β-keto acid also loses CO₂."),
          o("ol", "OC1CCCC1", "cyclopentanol", "Nothing reduces the ketone.")],
         [k] if k else None, "k", "Dieckmann then decarboxylation makes a cyclic ketone.",
         prov("Rule M hydrolysis then decarboxylation", CH_COND), lead(p, "ethyl 2-oxocyclopentane-1-carboxylate", "H₃O⁺, heat"),
         concepts=ALDOL + ALK)


# ---------------------------------------------------------------------------
# u9-crossed-claisen
# ---------------------------------------------------------------------------

DONOR_CONV = "the partner with the more acidic alpha H is the donor"


def node_crossed_claisen() -> None:
    node = "u9-crossed-claisen"
    p = claisen_main(S["etoac"], S["etbz"])
    pick(node, "u9-cc-meet", "Ethyl benzoate and ethyl acetate meet NaOEt, then H₃O⁺. Pick the crossed product.",
         [o("p", p, "ethyl 3-oxo-3-phenylpropanoate", "Ethyl benzoate has no α-H, so only ethyl acetate makes an enolate. It attacks the benzoate."),
          o("self", "CCOC(=O)CC(C)=O", "ethyl 3-oxobutanoate", "That is ethyl acetate with itself. Running it with the benzoate in excess limits this."),
          o("rev", "CCOC(=O)C(C(C)=O)c1ccccc1", "ethyl 3-oxo-2-phenylbutanoate", "Ethyl benzoate cannot be the donor: its carbonyl has no α-carbon with H.")],
         [p], "p", "Crossed Claisen: one ester with no α-H as the acceptor.", prov("Rule C, crossed", CH_COND, CROSS_CONV),
         pair(named(S["etbz"], "ethyl benzoate"), named(S["etoac"], "ethyl acetate")), level=0, concepts=ALDOL, convention=CROSS_CONV)

    cands = {"carb": S["carbonate"], "ac": S["etoac"], "pr": S["etprop"], "bu": "CCCC(=O)OCC"}
    acc = [s for s in cands.values() if not alpha_sites(s, ester=True)]
    pick(node, "u9-cc-acceptor", "Pick the ester that can only be the acceptor.",
         [o("carb", S["carbonate"], "diethyl carbonate", "Its carbonyl carbon has only O neighbours. No α-carbon, no enolate."),
          o("ac", S["etoac"], "ethyl acetate", "Its CH₃ is α and has H."),
          o("pr", S["etprop"], "ethyl propanoate", "Its CH₂ is α and has H."),
          o("bu", cands["bu"], "ethyl butanoate", "Its CH₂ next to the C=O has H.")],
         acc, "carb", "Carbonates, formates, benzoates and oxalates have no α-H.", prov("alpha H counted by SMARTS", CH_COND, CROSS_CONV),
         lead(S["formate"], "ethyl formate", "another no-α-H ester"), concepts=ALDOL, convention=CROSS_CONV)

    p = claisen_main(S["chx"], S["carbonate"], ester=False)
    pick(node, "u9-cc-carbonate", "Cyclohexanone and diethyl carbonate meet NaOEt. Pick the product.",
         [o("p", p, "ethyl 2-oxocyclohexane-1-carboxylate", "The ketone enolate attacks the carbonate C=O and one OEt leaves. A CO₂Et is put on the α-carbon."),
          o("ether", "CCOC1=CCCCC1", "1-ethoxycyclohex-1-ene", "That is O-alkylation. The carbonate is attacked at its C=O by carbon."),
          o("carb", "CCOC(=O)OC1=CCCCC1", "cyclohex-1-en-1-yl ethyl carbonate", "The enolate's carbon end does the acyl substitution, not the oxygen end.")],
         [p], "p", "A carbonate adds an ester group: an α-acylation.", prov("Rule C with a ketone donor", CH_COND),
         pair(named(S["chx"], "cyclohexanone"), named(S["carbonate"], "diethyl carbonate")), concepts=ALDOL)

    p = claisen_main(S["etoac"], S["formate"])
    pick(node, "u9-cc-formate", "Ethyl acetate and ethyl formate meet NaOEt, then H₃O⁺. Pick the crossed product.",
         [o("p", p, "ethyl 3-oxopropanoate", "The formate has no α-H. The acetate enolate adds an aldehyde CHO to its α-carbon."),
          o("self", "CCOC(=O)CC(C)=O", "ethyl 3-oxobutanoate", "That is the acetate self-Claisen. Formate is the more reactive acceptor."),
          o("ald", "CC=O", "acetaldehyde", "No reduction happens. The formate transfers a CHO group.")],
         [p], "p", "Ethyl formate adds a formyl group.", prov("Rule C, crossed", CH_COND, CROSS_CONV),
         pair(named(S["etoac"], "ethyl acetate"), named(S["formate"], "ethyl formate")), concepts=ALDOL, convention=CROSS_CONV)

    k, e = pka_of(S["acetone"]), pka_of(S["etoac"])
    donor = "ketone" if k < e else "ester"
    p = claisen_main(S["acetone"], S["etoac"], ester=False)
    pick(node, "u9-cc-ketone", "Propan-2-one and ethyl acetate meet NaOEt, then H₃O⁺. Pick the main product.",
         [o("p", p, "pentane-2,4-dione", "Ketone α-H, near pKa 20, beats ester α-H, near 25, so the ketone is the donor. Its enolate attacks the ester."),
          o("rev", "CCOC(=O)CC(C)(C)O", "ethyl 3-hydroxy-3-methylbutanoate", "That makes the ester the donor, adding to the ketone. The ketone's α-H is the more acidic."),
          o("self", "CCOC(=O)CC(C)=O", "ethyl 3-oxobutanoate", "That is the ester with itself. The ketone enolate forms more easily.")],
         [p] if donor == "ketone" else None, "p", "The more acidic partner is the donor.",
         prov("pKa from pka.ts picks the donor; Rule C", CH_COND, DONOR_CONV),
         pair(named(S["acetone"], "propan-2-one"), named(S["etoac"], "ethyl acetate")), concepts=ALDOL + PKA, convention=DONOR_CONV)

    p = claisen_main(S["etprop"], S["oxalate"])
    pick(node, "u9-cc-oxalate", "Diethyl oxalate and ethyl propanoate meet NaOEt, then H₃O⁺. Pick the product.",
         [o("p", p, "diethyl 2-methyl-3-oxobutanedioate", "The propanoate enolate attacks one oxalate C=O and an OEt leaves. Oxalate has no α-H."),
          o("self", "CCOC(=O)C(C)C(=O)CC", "ethyl 2-methyl-3-oxopentanoate", "That is the propanoate with itself. Oxalate is the more reactive acceptor."),
          o("di", "CCOC(=O)C(=O)C(=O)C(=O)OCC", "diethyl 2,3-dioxobutanedioate", "No propanoate carbons in it. The product must contain the donor.")],
         [p], "p", "Oxalate adds a CO-CO₂Et group.", prov("Rule C, crossed", CH_COND, CROSS_CONV),
         pair(named(S["oxalate"], "diethyl oxalate"), named(S["etprop"], "ethyl propanoate")), concepts=ALDOL, convention=CROSS_CONV)


# ---------------------------------------------------------------------------
# u9-alkylation
# ---------------------------------------------------------------------------

def node_alkylation() -> None:
    node = "u9-alkylation"
    p = alkylated(S["chx"], "kinetic", S["mei"])
    pick(node, "u9-alk-meet", "Cyclohexanone meets LDA, then CH₃I. Pick the product.",
         [o("p", p, "2-methylcyclohexan-1-one", "LDA makes the enolate fully. Its α-carbon attacks CH₃I in SN2."),
          o("o", "COC1=CCCCC1", "1-methoxycyclohex-1-ene", "That is O-alkylation. With CH₃I the carbon end reacts."),
          o("alc", "CC1(O)CCCCC1", "1-methylcyclohexan-1-ol", "That is a Grignard result at the C=O. An enolate keeps its C=O.")],
         [p], "p", "Enolate alkylation makes a new C-C bond at the α-carbon.", prov("Rule H alkylation", CH_ALPHA, SN2_CONV),
         lead(S["chx"], "cyclohexanone", "LDA, then CH₃I"), level=0, concepts=ALK, convention=SN2_CONV)

    p = alkylated(S["mechx"], "kinetic", S["mei"])
    pick(node, "u9-alk-kin", "2-Methylcyclohexanone, LDA at −78 °C, then CH₃I. Pick the product.",
         [o("p", p, "2,6-dimethylcyclohexan-1-one", "LDA cold makes the kinetic enolate on the CH₂ side, so the new methyl goes to C6."),
          o("t", "CC1(C)CCCCC1=O", "2,2-dimethylcyclohexan-1-one", "That comes from the thermodynamic enolate, at the carbon that already has CH₃."),
          o("none", S["mechx"], "2-methylcyclohexan-1-one", "LDA and CH₃I do react. The ketone gains a methyl.")],
         [p], "p", "The enolate choice sets where the alkyl group goes.", prov("Rule H at the kinetic site", CH_ALPHA, KINETIC_CONV),
         lead(S["mechx"], "2-methylcyclohexan-1-one", "LDA, −78 °C, then CH₃I"), concepts=ALK + KVT, convention=KINETIC_CONV)

    cands = {"bu": S["buBr"], "tbu": S["tbubr"], "ph": S["phbr"]}
    ok = [s for s in cands.values() if halide_class(s) in ("methyl", "primary")]
    pick(node, "u9-alk-halide", "Pick the halide that alkylates a ketone enolate cleanly.",
         [o("bu", S["buBr"], "1-bromobutane", "A primary carbon: SN2 is fast and elimination is minor."),
          o("tbu", S["tbubr"], "2-bromo-2-methylpropane", "Tertiary. The enolate acts as a base and E2 gives an alkene."),
          o("ph", S["phbr"], "bromobenzene", "An aryl C-Br cannot be attacked from the back side. No SN2.")],
         ok, "bu", "Enolates need methyl or primary halides.", prov("halide carbon class read by RDKit", CH_ALPHA, SN2_CONV),
         lead(S["chx"], "cyclohexanone", "enolate + R-X"), concepts=ALK, convention=SN2_CONV)

    p = alkylated(S["acetone"], "kinetic", S["bnbr"])
    pick(node, "u9-alk-benzyl", "Propan-2-one, LDA, then benzyl bromide. Pick the product.",
         [o("p", p, "4-phenylbutan-2-one", "The enolate carbon attacks the CH₂Br carbon. A CH₂Ph is added to the α-carbon."),
          o("o", "C=C(C)OCc1ccccc1", "(prop-1-en-2-yloxymethyl)benzene", "That is O-alkylation, the minor path with a soft halide."),
          o("alc", "CC(C)(O)Cc1ccccc1", "2-methyl-1-phenylpropan-2-ol", "That would be a Grignard on the C=O. The enolate keeps its C=O.")],
         [p], "p", "Benzylic halides are excellent SN2 partners.", prov("Rule H alkylation", CH_ALPHA, SN2_CONV),
         pair(named(S["acetone"], "propan-2-one"), named(S["bnbr"], "(bromomethyl)benzene")), concepts=ALK, convention=SN2_CONV)

    li = "[Li+].C=C(C)[O-]"
    by = byproduct([li, S["mei"]], [alkylate(S["acetone"], alpha_sites(S["acetone"])[0][0], S["mei"])],
                   {"LiI": "[Li+].[I-]", "HI": "I", "I2": "II", "CH3Li": "[Li]C"})
    ask(node, "u9-alk-salt", "Lithium enolate of propan-2-one meets CH₃I. Pick the inorganic product.",
        [("LiI", "LiI", "Iodide leaves in the SN2 and pairs with the lithium that was on the enolate."),
         ("HI", "HI", "No proton is released. The proton left earlier, taken by LDA."),
         ("I2", "I₂", "Nothing is oxidised. Iodide leaves as the anion."),
         ("CH3Li", "CH₃Li", "The methyl ends on carbon, in the ketone.")],
        {"LiI": "LiI", "HI": "HI", "I2": "I2", "CH3Li": "CH3Li"}, by, "LiI",
        "SN2 releases the halide; the enolate's counterion keeps it company.", prov("atom and charge balance", CH_ALPHA),
        lead(li, "lithium prop-1-en-2-olate", "the lithium enolate"), concepts=ALK)

    p = alkylated(S["butanone"], "kinetic", S["mei"])
    pick(node, "u9-alk-butanone", "Butan-2-one, LDA at −78 °C, then CH₃I. Pick the product.",
         [o("p", p, "pentan-3-one", "The kinetic enolate is on the CH₃ side. Adding CH₃ there makes an ethyl group: pentan-3-one."),
          o("t", "CC(=O)C(C)C", "3-methylbutan-2-one", "That is alkylation on the CH₂ side, from the thermodynamic enolate."),
          o("di", "CCC(=O)C(C)C", "2-methylpentan-3-one", "One CH₃I adds one methyl.")],
         [p], "p", "Kinetic enolate, then alkylation on the less substituted side.", prov("Rule H at the kinetic site", CH_ALPHA, KINETIC_CONV),
         lead(S["butanone"], "butan-2-one", "LDA, −78 °C, then CH₃I"), concepts=ALK + KVT, convention=KINETIC_CONV)


# ---------------------------------------------------------------------------
# u9-malonic
# ---------------------------------------------------------------------------

DECARB_CONV = "a beta-keto or malonic acid loses CO2 on heating"


def node_malonic() -> None:
    node = "u9-malonic"
    alk, fin = malonic([S["etbr"]])
    pick(node, "u9-mal-meet", "Diethyl malonate meets NaOEt, then bromoethane. Pick the product.",
         [o("p", alk, "diethyl 2-ethylpropanedioate", "Ethoxide removes the CH₂ proton between the esters. That carbon attacks bromoethane."),
          o("o", "CCOC(=O)C=C(OCC)OCC", "ethyl 3,3-diethoxyprop-2-enoate", "That is O-alkylation, the oxygen end attacking. Carbon is the nucleophilic end in this route."),
          o("acid", "CCC(C(=O)O)C(=O)O", "2-ethylpropanedioic acid", "That needs hydrolysis, which comes later with H₃O⁺.")],
         [alk], "p", "Step one of the malonic synthesis: alkylate the central carbon.", prov("Rule H on the central carbon", CH_ALPHA, SN2_CONV),
         lead(MALONATE, "diethyl propanedioate", "NaOEt, then CH₃CH₂Br"), level=0, concepts=ALK, convention=SN2_CONV)

    pick(node, "u9-mal-final", "Diethyl 2-ethylmalonate meets H₃O⁺ and heat. Pick the final product.",
         [o("p", fin, "butanoic acid", "Both esters hydrolyse to a diacid, and one CO₂H leaves as CO₂. The ethyl group plus CH₂CO₂H remain."),
          o("diacid", "CCC(C(=O)O)C(=O)O", "2-ethylpropanedioic acid", "That is hydrolysis only. Heat removes one CO₂."),
          o("short", "CCC(=O)O", "propanoic acid", "The central carbon stays. Only one carboxyl carbon is lost.")],
         [fin], "p", "Malonic synthesis: R-X becomes R-CH₂-CO₂H.", prov("Rule M hydrolysis and decarboxylation", CH_ALPHA, DECARB_CONV),
         lead(alk, "diethyl 2-ethylpropanedioate", "H₃O⁺, heat"), concepts=ALK, convention=DECARB_CONV)

    target = canon("CCCCCC(=O)O")
    opts = {"bu": S["buBr"], "pe": "CCCCCBr", "pr": S["prBr"]}
    ok = [s for s in opts.values() if malonic([s])[1] == target]
    pick(node, "u9-mal-retro", "Pick the halide that gives hexanoic acid by the malonic ester route.",
         [o("bu", S["buBr"], "1-bromobutane", "R-CH₂-CO₂H: the halide supplies four carbons, malonate two."),
          o("pe", "CCCCCBr", "1-bromopentane", "Five carbons plus two gives heptanoic acid."),
          o("pr", S["prBr"], "1-bromopropane", "Three plus two gives pentanoic acid.")],
         ok, "bu", "The product is the halide's R plus CH₂CO₂H.", prov("forward route run on each option", CH_ALPHA, DECARB_CONV),
         lead("CCCCCC(=O)O", "hexanoic acid", "the target"), concepts=ALK + SYN, convention=DECARB_CONV)

    _, two = malonic([S["mei"], S["mei"]])
    pick(node, "u9-mal-twice", "Diethyl malonate is methylated twice, then H₃O⁺ and heat. Pick the product.",
         [o("p", two, "2-methylpropanoic acid", "The central carbon carries two methyls. After decarboxylation it is CH(CH₃)₂ on CO₂H."),
          o("one", "CCC(=O)O", "propanoic acid", "That is the result of one methylation."),
          o("di", "CC(C)(C(=O)O)C(=O)O", "2,2-dimethylpropanedioic acid", "Heat removes one CO₂.")],
         [two], "p", "Two alkylations, two branches.", prov("Rule H twice then Rule M", CH_ALPHA, DECARB_CONV),
         lead(MALONATE, "diethyl propanedioate", "2 × (NaOEt, CH₃I), then H₃O⁺, heat"), concepts=ALK, convention=DECARB_CONV)

    site = most_acidic(MALONATE)
    ask(node, "u9-mal-base", "Pick why NaOEt is strong enough for diethyl malonate.",
        [("ten", "Its central C-H is near pKa 10", "Ethanol, near 16, is the weaker acid, so ethoxide takes the proton fully."),
         ("twenty", "Its C-H is near pKa 20", "That is a simple ketone α-H. Two C=O make this one far more acidic."),
         ("strong", "NaOEt is as strong as LDA", "It is not: ethanol is near 16, diisopropylamine near 35.")],
        {"ten": "beta_dicarbonyl_alpha_ch", "twenty": "ketone_alpha_ch", "strong": None}, site if deprotonates_fully("NaOEt", site) else None, "ten",
        "Two carbonyls let a mild base do the job.", prov("Rule P on the course pKa table", CH_ALPHA),
        lead(MALONATE, "diethyl propanedioate", "diethyl malonate"), concepts=ALK + PKA)

    diacid = largest(hydrolyse(alk))
    prod, lost = decarboxylate(diacid)
    by = byproduct([diacid], [prod], {"CO2": "O=C=O", "CO": "[C-]#[O+]", "H2O": "O", "EtOH": "CCO"})
    ask(node, "u9-mal-gas", "Pick the gas lost when 2-ethylpropanedioic acid is heated.",
        [("CO2", "CO₂", "One carboxyl carbon and its two O leave as CO₂ through a six-atom ring."),
         ("CO", "CO", "Two O leave with that carbon, not one."),
         ("H2O", "Water", "No condensation happens. The acid group is lost whole."),
         ("EtOH", "Ethanol", "Ethanol left earlier, in the hydrolysis.")],
        {"CO2": "CO2", "CO": "CO", "H2O": "H2O", "EtOH": "EtOH"}, by, "CO2",
        "Decarboxylation releases CO₂.", prov("atom balance", CH_ALPHA, DECARB_CONV),
        lead(diacid, "2-ethylpropanedioic acid", "heat"), concepts=ALK, convention=DECARB_CONV)

    s = alkylate(MALONATE, central(MALONATE), "BrCCCCBr")
    ring = hydrolyse_decarb(alkylate_intra(s, central(s)))
    pick(node, "u9-mal-ring", "Diethyl malonate, 2 NaOEt, 1,4-dibromobutane, then H₃O⁺ and heat. Pick the product.",
         [o("p", ring, "cyclopentanecarboxylic acid", "The central carbon is alkylated by one end, then by the other end: a five-membered ring. Then the usual decarboxylation."),
          o("chain", "O=C(O)CCCCCBr", "6-bromohexanoic acid", "The second NaOEt lets the same carbon attack the other C-Br, closing the ring."),
          o("six", "O=C(O)C1CCCCC1", "cyclohexanecarboxylic acid", "Four CH₂ plus the central carbon make five ring atoms, not six.")],
         [ring], "p", "A dihalide on malonate closes a ring.", prov("Rule H twice, the second inside the molecule, then Rule M", CH_ALPHA, SN2_CONV),
         lead("BrCCCCBr", "1,4-dibromobutane", "with diethyl malonate"), concepts=ALK, convention=SN2_CONV)


# ---------------------------------------------------------------------------
# u9-acetoacetic
# ---------------------------------------------------------------------------

def node_acetoacetic() -> None:
    node = "u9-acetoacetic"
    alk, fin = malonic([S["mei"]], ACAC_ESTER)
    pick(node, "u9-aa-meet", "Ethyl acetoacetate meets NaOEt, then CH₃I. Pick the product.",
         [o("p", alk, "ethyl 2-methyl-3-oxobutanoate", "The CH₂ between the ketone and the ester is the acidic one. It gains the methyl."),
          o("end", "CCOC(=O)CC(=O)CC", "ethyl 3-oxopentanoate", "The terminal CH₃ is far less acidic, near pKa 20 against 10."),
          o("o", "CCOC(=O)C=C(C)OC", "ethyl 3-methoxybut-2-enoate", "That is O-alkylation. Carbon is the reactive end with CH₃I in this route.")],
         [alk], "p", "Acetoacetic route step one: alkylate between the carbonyls.", prov("Rule H on the central carbon", CH_ALPHA, SN2_CONV),
         lead(ACAC_ESTER, "ethyl 3-oxobutanoate", "NaOEt, then CH₃I"), level=0, concepts=ALK, convention=SN2_CONV)

    pick(node, "u9-aa-final", "Ethyl 2-methyl-3-oxobutanoate meets H₃O⁺ and heat. Pick the product.",
         [o("p", fin, "butan-2-one", "The ester hydrolyses to a β-keto acid, which loses CO₂. What remains is a methyl ketone."),
          o("acid", "CC(=O)C(C)C(=O)O", "2-methyl-3-oxobutanoic acid", "That is hydrolysis only. Heat removes the CO₂."),
          o("ac", S["acetone"], "propan-2-one", "That ignores the methyl that was added.")],
         [fin], "p", "Acetoacetic synthesis makes methyl ketones.", prov("Rule M hydrolysis and decarboxylation", CH_ALPHA, DECARB_CONV),
         lead(alk, "ethyl 2-methyl-3-oxobutanoate", "H₃O⁺, heat"), concepts=ALK, convention=DECARB_CONV)

    _, bn = malonic([S["bnbr"]], ACAC_ESTER)
    pick(node, "u9-aa-benzyl", "Ethyl acetoacetate, NaOEt, benzyl bromide, then H₃O⁺ and heat. Pick the product.",
         [o("p", bn, "4-phenylbutan-2-one", "Benzyl joins the central carbon; decarboxylation leaves CH₃-CO-CH₂-CH₂Ph."),
          o("acid", "O=C(O)CCc1ccccc1", "3-phenylpropanoic acid", "That is the malonic ester answer. Acetoacetate gives a ketone."),
          o("short", S["acphen"], "1-phenylethan-1-one", "The CH₂ of the acetoacetate stays in the chain.")],
         [bn], "p", "R-X becomes CH₃COCH₂R.", prov("Rule H then Rule M", CH_ALPHA, DECARB_CONV),
         lead(ACAC_ESTER, "ethyl 3-oxobutanoate", "NaOEt, PhCH₂Br, then H₃O⁺, heat"), concepts=ALK, convention=DECARB_CONV)

    target = canon("CCCCC(C)=O")
    opts = {"pr": S["prBr"], "bu": S["buBr"], "et": S["etbr"]}
    ok = [s for s in opts.values() if malonic([s], ACAC_ESTER)[1] == target]
    pick(node, "u9-aa-retro", "Pick the halide that gives hexan-2-one by the acetoacetic route.",
         [o("pr", S["prBr"], "1-bromopropane", "CH₃COCH₂ supplies three carbons; propyl supplies the other three."),
          o("bu", S["buBr"], "1-bromobutane", "Butyl gives heptan-2-one."),
          o("et", S["etbr"], "bromoethane", "Ethyl gives pentan-2-one.")],
         ok, "pr", "Remove CH₃COCH₂ from the target: what is left is R.", prov("forward route run on each option", CH_ALPHA, DECARB_CONV),
         lead("CCCCC(C)=O", "hexan-2-one", "the target"), concepts=ALK + SYN, convention=DECARB_CONV)

    cls = "methyl" if is_methyl_ketone(fin) else None
    ask(node, "u9-aa-class", "Pick the kind of product the acetoacetic ester route always gives.",
        [("methyl", "A methyl ketone", "The acetyl CH₃-C=O of acetoacetate survives every step."),
         ("acid", "A carboxylic acid", "That is the malonic route, where both ends were esters."),
         ("ald", "An aldehyde", "The C=O is flanked by two carbons, so it is a ketone.")],
        {"methyl": "methyl", "acid": None, "ald": None}, cls, "methyl",
        "Malonic gives acids, acetoacetic gives methyl ketones.", prov("methyl ketone read by SMARTS on the product", CH_ALPHA),
        lead(fin, "butan-2-one", "a product of the route"), concepts=ALK)

    sites = sites_of(ACAC_ESTER)
    mid = central(ACAC_ESTER)
    best = most_acidic(ACAC_ESTER)
    ask(node, "u9-aa-proton", "Pick the H that NaOEt removes from ethyl acetoacetate.",
        [("mid", "An H on the CH₂ between the two C=O", "Shared by the ketone and the ester C=O, near pKa 10."),
         ("me", "An H on the acetyl CH₃", "One C=O stabilises that anion, near pKa 20."),
         ("et", "An H on the ethyl group", "Not next to a C=O at all.")],
        {"mid": sites[mid], "me": "ketone_alpha_ch", "et": "alkane_ch"}, best, "mid",
        "The carbon between two carbonyls is the one that reacts.", prov("protons classified by SMARTS, pKa from pka.ts", CH_ALPHA),
        lead(ACAC_ESTER, "ethyl 3-oxobutanoate", "ethyl acetoacetate"), concepts=ALK + PKA)


# ---------------------------------------------------------------------------
# u9-michael
# ---------------------------------------------------------------------------

def node_michael() -> None:
    node = "u9-michael"
    p = michael(MALONATE, S["mvk"])
    pick(node, "u9-mi-meet", "Diethyl malonate and but-3-en-2-one meet NaOEt. Pick the Michael product.",
         [o("p", p, "diethyl 2-(3-oxobutyl)propanedioate", "The malonate carbon adds to the β-carbon, the CH₂ end of the C=C. The ketone survives."),
          o("12", "CCOC(=O)C(C(=O)OCC)C(C)(O)C=C", "diethyl 2-(2-hydroxybut-3-en-2-yl)propanedioate", "That is 1,2-addition at the C=O. Stabilised enolates add 1,4.", text="The 1,2-adduct"),
          o("alk", "C=CC(C)=O", "but-3-en-2-one", "The reagents do combine. The product contains both.")],
         [p], "p", "Michael: a soft, stabilised nucleophile adds to the β-carbon.", prov("Rule K", CH_COND, CONJ_CONV),
         pair(named(MALONATE, "diethyl propanedioate"), named(S["mvk"], "but-3-en-2-one")), level=0, concepts=CONJ, convention=CONJ_CONV)

    beta = hits(S["mvk"], ACCEPTOR)[0][0]
    kind = "beta" if h_on(S["mvk"], beta) == 2 else None
    ask(node, "u9-mi-site", "Pick the atom of but-3-en-2-one that the Michael donor bonds to.",
        [("beta", "The CH₂ end of the C=C (β)", "Resonance puts a partial positive charge on the β-carbon, two atoms from the C=O carbon."),
         ("co", "The carbonyl carbon", "That is 1,2-addition, what hard nucleophiles like Grignards do."),
         ("alpha", "The CH of the C=C (α)", "The α-carbon gains a proton afterwards. It is not attacked.")],
        {"beta": "beta", "co": None, "alpha": None}, kind, "beta",
        "Conjugate addition is at the β-carbon.", prov("Rule K, the beta carbon of the acceptor", CH_COND, CONJ_CONV),
        lead(S["mvk"], "but-3-en-2-one", "the acceptor"), concepts=CONJ, convention=CONJ_CONV)

    cands = {"mvk": S["mvk"], "ene": "C=CCC", "ket": S["butanone"], "ol": "C=CCCO"}
    acc = [s for s in cands.values() if is_acceptor(s)]
    pick(node, "u9-mi-acceptor", "Pick the Michael acceptor.",
         [o("mvk", S["mvk"], "but-3-en-2-one", "Its C=C is conjugated with C=O, which makes the β-carbon electrophilic."),
          o("ene", "C=CCC", "but-1-ene", "A plain alkene has no C=O to pull electrons."),
          o("ket", S["butanone"], "butan-2-one", "No C=C. It can do 1,2-addition only."),
          o("ol", "C=CCCO", "but-3-en-1-ol", "The C=C is not conjugated with anything electron-poor.")],
         acc, "mvk", "Acceptor: C=C-C=O (or C=C-C≡N).", prov("acceptor read by SMARTS", CH_COND),
         lead("C=CC#N", "prop-2-enenitrile", "another acceptor"), concepts=CONJ)

    p = michael(ACAC_ESTER, S["acn"])
    pick(node, "u9-mi-acn", "Ethyl acetoacetate and prop-2-enenitrile meet NaOEt. Pick the product.",
         [o("p", p, "ethyl 2-acetyl-4-cyanobutanoate", "The central carbon adds to the CH₂ end of the C=C. A nitrile works as the acceptor's pull."),
          o("cn", "CCOC(=O)C(C(C)=O)C(C)C#N", "ethyl 2-acetyl-3-cyanobutanoate", "That bonds to the carbon next to the nitrile, the α-carbon. Michael bonds to β."),
          o("o", "CCOC(=O)C=C(C)OCCC#N", "ethyl 3-(2-cyanoethoxy)but-2-enoate", "That is the oxygen end attacking. Carbon is the nucleophile in a Michael.")],
         [p], "p", "Nitriles are Michael acceptors too.", prov("Rule K", CH_COND, CONJ_CONV),
         pair(named(ACAC_ESTER, "ethyl 3-oxobutanoate"), named(S["acn"], "prop-2-enenitrile")), concepts=CONJ, convention=CONJ_CONV)

    cands = {"mal": MALONATE, "ac": S["acetone"], "etoh": S["etoh"]}
    best = min(cands, key=lambda k: pka_of(cands[k]) if most_acidic(cands[k]).endswith("_ch") else 99)
    pick(node, "u9-mi-donor", "Pick the best Michael donor with NaOEt.",
         [o("mal", MALONATE, "diethyl propanedioate", "A C-H near pKa 10: ethoxide makes the stabilised enolate fully, and it adds 1,4."),
          o("ac", S["acetone"], "propan-2-one", "Its C-H, near 20, is only partly deprotonated by ethoxide."),
          o("etoh", S["etoh"], "ethanol", "Its acidic H is on O, so it gives ethoxide, an O nucleophile.")],
         [cands[best]], "mal", "Michael donors are usually 1,3-dicarbonyls.", prov("most acidic C-H from pka.ts", CH_COND, CONJ_CONV),
         lead(S["mvk"], "but-3-en-2-one", "the acceptor"), concepts=CONJ + PKA, convention=CONJ_CONV)

    p = michael(S["acac"], S["mea"])
    pick(node, "u9-mi-dione", "Pentane-2,4-dione and methyl prop-2-enoate meet base. Pick the product.",
         [o("p", p, "methyl 4-acetyl-5-oxohexanoate", "The dione's central carbon adds to the CH₂ end of the acrylate."),
          o("ester", "COC(=O)CC(C(C)=O)C(C)=O", "methyl 3-acetyl-4-oxopentanoate", "That chain is one carbon short. The acrylate brings two carbons plus the ester carbon."),
          o("alpha", "COC(=O)C(C)C(C(C)=O)C(C)=O", "methyl 3-acetyl-2-methyl-4-oxopentanoate", "That bonds to the acrylate's α-carbon. Michael donors bond to the β-carbon, the CH₂ end.")],
         [p], "p", "Esters work as the acceptor's pull too.", prov("Rule K", CH_COND, CONJ_CONV),
         pair(named(S["acac"], "pentane-2,4-dione"), named(S["mea"], "methyl prop-2-enoate")), concepts=CONJ, convention=CONJ_CONV)


# ---------------------------------------------------------------------------
# u9-cuprate
# ---------------------------------------------------------------------------

def node_cuprate() -> None:
    node = "u9-cuprate"
    p = conj_add(S["chxenone"], "[*]C")
    pick(node, "u9-cu-meet", "Cyclohex-2-en-1-one meets (CH₃)₂CuLi, then H₂O. Pick the product.",
         [o("p", p, "3-methylcyclohexan-1-one", "The cuprate delivers CH₃ to the β-carbon. Workup protonates the enolate back to the ketone."),
          o("12", "CC1(O)C=CCCC1", "1-methylcyclohex-2-en-1-ol", "That is 1,2-addition, the Grignard result."),
          o("both", "CC1(O)CCCC(C)C1", "1,3-dimethylcyclohexan-1-ol", "A cuprate adds once and leaves the C=O alone.")],
         [p], "p", "Cuprates add 1,4.", prov("Rule K with methyl", CH_CONJ, CONJ_CONV), lead(S["chxenone"], "cyclohex-2-en-1-one", "(CH₃)₂CuLi"),
         level=0, concepts=CONJ, convention=CONJ_CONV)

    g = add(S["chxenone"], "[*]C")
    pick(node, "u9-cu-grignard", "Cyclohex-2-en-1-one meets CH₃MgBr, then H₃O⁺. Pick the product.",
         [o("g", g, "1-methylcyclohex-2-en-1-ol", "A Grignard is a hard nucleophile and attacks the C=O carbon directly: 1,2-addition."),
          o("14", "CC1CCCC(=O)C1", "3-methylcyclohexan-1-one", "That is the cuprate result, 1,4."),
          o("red", "OC1C=CCCC1", "cyclohex-2-en-1-ol", "That needs a hydride. The Grignard adds a carbon.")],
         [g], "g", "Here the reagent decides 1,2 against 1,4.", prov("Rule A at the C=O", CH_CONJ, CONJ_CONV),
         lead(S["chxenone"], "cyclohex-2-en-1-one", "CH₃MgBr"), concepts=CONJ, convention=CONJ_CONV)

    ask(node, "u9-cu-reagent", "Pick the reagent that adds a methyl 1,4 to an enone.",
        [("cu", "(CH₃)₂CuLi", "The Gilman reagent is the dedicated 1,4 carbon nucleophile."),
         ("mg", "CH₃MgBr", "Grignards add 1,2 to enones, at the C=O carbon."),
         ("li", "CH₃Li", "Organolithiums are harder still and add 1,2.")],
        {"cu": "14", "mg": "12", "li": "12"}, "14", "cu", "Cuprate for 1,4; Grignard and RLi for 1,2.",
        prov("the course's reagent rule", CH_CONJ, CONJ_CONV), lead(S["chxenone"], "cyclohex-2-en-1-one", "1,4 or 1,2"),
        concepts=CONJ, convention=CONJ_CONV)

    p = conj_add(S["mvk"], "[*]CC")
    pick(node, "u9-cu-mvk", "But-3-en-2-one meets (CH₃CH₂)₂CuLi, then H₂O. Pick the product.",
         [o("p", p, "hexan-2-one", "Ethyl bonds to the CH₂ end of the C=C, which extends the chain to six carbons."),
          o("12", "C=CC(C)(O)CC", "3-methylpent-1-en-3-ol", "That is 1,2-addition, a Grignard result."),
          o("short", "CCCC(C)=O", "pentan-2-one", "Ethyl has two carbons, not one.")],
         [p], "p", "Cuprate 1,4 on an acyclic enone.", prov("Rule K with ethyl", CH_CONJ, CONJ_CONV),
         lead(S["mvk"], "but-3-en-2-one", "(CH₃CH₂)₂CuLi"), concepts=CONJ, convention=CONJ_CONV)

    target = canon("O=C1CCCC(c2ccccc2)C1")
    opts = {"ph": "[*]c1ccccc1", "me": "[*]C", "bn": "[*]Cc1ccccc1"}
    ok = [k for k, nu in opts.items() if canon(conj_add(S["chxenone"], nu)) == target]
    ask(node, "u9-cu-retro", "Pick the cuprate that turns cyclohex-2-en-1-one into 3-phenylcyclohexan-1-one.",
        [("ph", "(C₆H₅)₂CuLi", "The phenyl group lands on the β-carbon, C3."),
         ("me", "(CH₃)₂CuLi", "That puts a methyl at C3."),
         ("bn", "(C₆H₅CH₂)₂CuLi", "That would add a benzyl, one CH₂ too many.")],
        {k: k for k in opts}, ok[0] if len(ok) == 1 else None, "ph",
        "The group on copper is the group that arrives.", prov("Rule K run for each cuprate", CH_CONJ, CONJ_CONV),
        lead("O=C1CCCC(c2ccccc2)C1", "3-phenylcyclohexan-1-one", "the target"), concepts=CONJ + SYN, convention=CONJ_CONV)

    s = "CC(=O)C=C(C)C"
    p = conj_add(s, "[*]C")
    pick(node, "u9-cu-quat", "4-Methylpent-3-en-2-one meets (CH₃)₂CuLi, then H₂O. Pick the product.",
         [o("p", p, "4,4-dimethylpentan-2-one", "The β-carbon already carries two methyls. A third makes a quaternary carbon, which cuprates can do."),
          o("12", "CC(C)=CC(C)(C)O", "2,4-dimethylpent-3-en-2-ol", "That is 1,2-addition."),
          o("none", "CC(=O)CC(C)C", "4-methylpentan-2-one", "That adds an H, not a methyl. The cuprate delivers carbon.")],
         [p], "p", "1,4-addition can build a quaternary carbon.", prov("Rule K", CH_CONJ, CONJ_CONV),
         lead(s, "4-methylpent-3-en-2-one", "(CH₃)₂CuLi"), concepts=CONJ, convention=CONJ_CONV)

    # Each right card names the site AND the group that arrives, so no two are true for the same reagent.
    # The site is read off the derived product: a ketone C=O left means the group went to the beta-carbon.
    def site(p: str) -> str:
        return "β-carbon" if hits(p, "[#6][CX3](=[OX1])[#6]") else "C=O carbon"
    products = {"14": conj_add(S["chxenone"], "[*]C"), "12": add(S["chxenone"], "[*]C"),
                "14m": michael(MALONATE, S["chxenone"])}
    groups = {"14": "a CH₃", "12": "a CH₃", "14m": "CH(CO₂Et)₂"}
    derived = {k: f"{site(p)} gains {groups[k]}" if p else None for k, p in products.items()}
    rows = [("cu", "(CH₃)₂CuLi on an enone", "β-carbon gains a CH₃", "Soft cuprate, 1,4.", "14"),
            ("mg", "CH₃MgBr on an enone", "C=O carbon gains a CH₃", "Hard Grignard, 1,2.", "12"),
            ("mal", "Malonate enolate on an enone", "β-carbon gains CH(CO₂Et)₂", "Stabilised enolate, 1,4, a Michael addition.", "14m")]
    match(node, "u9-cu-match", "Match each nucleophile to where it adds on an enone.",
          "Here the reagent decides: soft ones add 1,4, hard ones 1,2.",
          [(pid, left, right, why, derived[k]) for pid, left, right, why, k in rows],
          "Cuprates and stabilised enolates add 1,4; Grignards add 1,2.",
          prov("Rule K and Rule A run on cyclohexenone", CH_CONJ, CONJ_CONV), CONJ)


# ---------------------------------------------------------------------------
# u9-robinson
# ---------------------------------------------------------------------------

ROB_CONV = RING_CONV + "; the Robinson donor is the ketone's alpha carbon, and then the MVK methyl attacks the ring C=O"


def robinson(donor: str) -> tuple[str | None, str | None, int | None]:
    """Michael at the donor's most acidic alpha carbon, then the intramolecular aldol to the 6 ring, then E1cb."""
    sites = [central(donor)] if hits(donor, BETA_KETO_CH) else [a for a, _, _ in alpha_sites(donor)]
    m = unique([conj_add(S["mvk"], with_dummy(donor, a)) for a in sites], f"Michael of {donor}")
    if m is None:
        return None, None, None
    size, a = favoured(intra_aldols(m))
    return m, condensed(a) if a else None, size


def node_robinson() -> None:
    node = "u9-robinson"
    m, p, size = robinson(S["chx"])
    pick(node, "u9-rob-meet", "Cyclohexanone and but-3-en-2-one meet base with heat. Pick the annulation product.",
         [o("p", p, "4,4a,5,6,7,8-hexahydronaphthalen-2(3H)-one", "Michael addition first, then the new chain's methyl attacks the ring C=O, closing a six-membered ring, and water leaves.", text="The fused bicyclic enone"),
          o("m", m, "2-(3-oxobutyl)cyclohexan-1-one", "That is the Michael product only. Heat with base carries on to the ring.", text="The open-chain diketone"),
          o("cond", "CC(=O)C=C1CCCCC1", "1-cyclohexylidenepropan-2-one", "That is a plain aldol condensation, with no conjugate addition.", text="A cyclohexylidene ketone")],
         [p], "p", "Robinson annulation: Michael, then intramolecular aldol condensation, a new six-membered ring.",
         prov("Rule K then the intramolecular aldol, ring size by RDKit, then E1cb", CH_COND, ROB_CONV),
         pair(named(S["chx"], "cyclohexanone"), named(S["mvk"], "but-3-en-2-one")), level=0, concepts=CONJ + ALDOL, convention=ROB_CONV)

    pick(node, "u9-rob-michael", "Pick the intermediate the Robinson annulation of cyclohexanone passes through.",
         [o("m", m, "2-(3-oxobutyl)cyclohexan-1-one", "The enolate adds 1,4 to but-3-en-2-one, giving a 1,5-diketone."),
          o("12", "C=CC(C)(O)C1CCCCC1=O", "2-(2-hydroxybut-3-en-2-yl)cyclohexan-1-one", "That is 1,2-addition to the C=O. The enolate adds 1,4."),
          o("ald", "CC(=O)CC1(O)CCCCC1", "1-(1-hydroxycyclohexyl)propan-2-one", "That is an aldol, the second step's type. The first step is conjugate addition.")],
         [m], "m", "Step one is a Michael addition, which makes a 1,5-diketone.", prov("Rule K", CH_COND, CONJ_CONV),
         pair(named(S["chx"], "cyclohexanone"), named(S["mvk"], "but-3-en-2-one")), concepts=CONJ, convention=CONJ_CONV)

    dione = "CC1C(=O)CCCC1=O"
    wm, wp, _ = robinson(dione)
    wald = first(sorted(intra_aldols(wm).get(6, set()))) if wm else "C"
    pick(node, "u9-rob-wm", "2-Methylcyclohexane-1,3-dione meets but-3-en-2-one, base, heat. Pick the product.",
         [o("p", wp, "8a-methyl-3,4,8,8a-tetrahydronaphthalene-1,6(2H,7H)-dione", "The carbon between the two C=O is the Michael donor. Then the new chain's methyl closes a six-membered ring onto a ring C=O.", text="Wieland-Miescher ketone (fused)"),
          o("m", wm, "2-methyl-2-(3-oxobutyl)cyclohexane-1,3-dione", "That is the Michael product only. Heat carries on to the ring.", text="The triketone from the Michael step"),
          o("ald", wald, "4a-hydroxy-8a-methyloctahydronaphthalene-1,6(2H,7H)-dione", "That is the ring-closed aldol before water leaves. Heat with base removes it.", text="The ring-closed β-hydroxy ketone")],
         [wp], "p", "The Wieland-Miescher ketone, the classic Robinson product.",
         prov("Rule K at the most acidic C-H, the fused intramolecular aldol, then E1cb", CH_COND, ROB_CONV),
         pair(named(dione, "2-methylcyclohexane-1,3-dione"), named(S["mvk"], "but-3-en-2-one")), concepts=CONJ + ALDOL, convention=ROB_CONV)

    ask(node, "u9-rob-size", "Pick the size of the ring a Robinson annulation adds.",
        [("six", "Six", "The 1,5-diketone's methyl attacks the ring C=O: the new ring has six atoms."),
         ("five", "Five", "Five rings come from 1,4-diketones. The Michael step makes a 1,5-diketone."),
         ("four", "Four", "Four-membered rings are too strained to form this way.")],
        {"four": 4, "five": 5, "six": 6}, size, "six", "Robinson annulation adds a cyclohexenone ring.",
        prov("ring size by RDKit", CH_COND, ROB_CONV), lead(p, "4,4a,5,6,7,8-hexahydronaphthalen-2(3H)-one", "the annulation product"),
        concepts=ALDOL, convention=ROB_CONV)

    ring_after = ring_size_new(m, first(sorted(intra_aldols(m).get(6, {"C"})))) if m else None
    ring_first = ring_size_new(S["chx"], m) if m else None
    order = "mich_then_ald" if ring_first is None and ring_after == 6 else None
    ask(node, "u9-rob-order", "Pick the order of the two reactions in a Robinson annulation.",
        [("mich_then_ald", "Michael, then aldol condensation", "The Michael step joins the chains with no new ring. The aldol then closes the six-membered ring and loses water."),
         ("ald_then_mich", "Aldol, then Michael", "There is no 1,5-diketone for an aldol until the Michael has made one."),
         ("claisen", "Claisen, then Michael", "No ester is involved, so no Claisen.")],
        {"mich_then_ald": "mich_then_ald", "ald_then_mich": None, "claisen": None}, order, "mich_then_ald",
        "First join, then close.", prov("ring count after each edit by RDKit", CH_COND, ROB_CONV),
        lead(m, "2-(3-oxobutyl)cyclohexan-1-one", "after step one"), concepts=CONJ + ALDOL, convention=ROB_CONV)

    a6 = first(sorted(intra_aldols(m).get(6, set()))) if m else None
    by = byproduct([a6], [p], {"H2O": "O", "MeOH": "CO", "H2": "[HH]"}) if a6 and p else None
    ask(node, "u9-rob-water", "Pick what the ring-closing step of the Robinson annulation loses.",
        [("H2O", "Water", "The aldol makes a β-hydroxy ketone, and E1cb removes the OH with an α-H."),
         ("MeOH", "Methanol", "No methoxy group is present. The methyl stays as ring CH₂ after the aldol."),
         ("H2", "H₂", "Nothing is oxidised.")],
        {"H2O": "H2O", "MeOH": "MeOH", "H2": "H2"}, by, "H2O", "The condensation half of the annulation loses water.",
        prov("atom balance", CH_COND), lead(m, "2-(3-oxobutyl)cyclohexan-1-one", "base, heat"), concepts=ALDOL)


# ---------------------------------------------------------------------------
# u9-retro
# ---------------------------------------------------------------------------

def node_retro() -> None:
    node = "u9-retro"
    t = canon("CC(=O)CC(C)(C)O")
    opts = {"aa": (S["acetone"], S["acetone"]), "eb": (S["acetal"], S["butanone"]), "pp": (S["propanal"], S["propanal"])}
    ok = [k for k, (d, a) in opts.items() if t in {canon(x) for x in aldols(d, a) + aldols(a, d)}]
    ask(node, "u9-re-aldol", "Pick the aldol partners for 4-hydroxy-4-methylpentan-2-one.",
        [("aa", "Two propan-2-one", "Cut the bond between the C-OH carbon and the α-carbon: both halves are propan-2-one."),
         ("eb", "Ethanal and butan-2-one", "Those give a secondary OH. This target's OH is on a carbon with two methyls."),
         ("pp", "Two propanal", "Those give an aldehyde product. The target is a ketone.")],
        {k: k for k in opts}, ok[0] if len(ok) == 1 else None, "aa",
        "Disconnect the α-to-β bond of the β-hydroxy carbonyl.", prov("forward aldol run on each option", CH_COND),
        lead("CC(=O)CC(C)(C)O", "4-hydroxy-4-methylpentan-2-one", "the target"), level=0, concepts=SYN + ALDOL)

    t = canon("CC(=O)C=Cc1ccccc1")
    opts = {"ba": (S["acetone"], S["phcho"]), "aa": (S["acphen"], S["acetal"]), "bb": (S["butanone"], S["phcho"])}
    ok = [k for k, (d, a) in opts.items() if t in {canon(x) for y in aldols(d, a) for x in condense(y)}]
    ask(node, "u9-re-enone", "Pick the starting materials for 4-phenylbut-3-en-2-one by aldol condensation.",
        [("ba", "Propan-2-one and benzaldehyde", "Cut the C=C: the C=O side came from propan-2-one, the other from benzaldehyde."),
         ("aa", "Acetophenone and ethanal", "That puts the phenyl on the C=O carbon, giving a different enone."),
         ("bb", "Butan-2-one and benzaldehyde", "That leaves an extra carbon in the product.")],
        {k: k for k in opts}, ok[0] if len(ok) == 1 else None, "ba",
        "An enone's C=C marks the aldol bond.", prov("forward aldol and E1cb run on each option", CH_COND),
        lead("CC(=O)C=Cc1ccccc1", "4-phenylbut-3-en-2-one", "the target"), concepts=SYN + ALDOL)

    t = canon("CCOC(=O)CC(=O)c1ccccc1")
    opts = {"ba": (S["etoac"], S["etbz"]), "ab": (S["etbz"], S["etoac"]), "pp": (S["etprop"], S["etbz"])}
    ok = [k for k, (d, a) in opts.items() if alpha_sites(d, ester=True) and claisen_main(d, a) == t]
    ask(node, "u9-re-claisen", "Pick the Claisen partners for ethyl 3-oxo-3-phenylpropanoate.",
        [("ba", "Ethyl acetate donor, ethyl benzoate acceptor", "Cut between the CH₂ and the ketone C=O: the CH₂CO₂Et came from ethyl acetate."),
         ("ab", "Ethyl benzoate donor, ethyl acetate acceptor", "Ethyl benzoate has no α-H and cannot be the donor."),
         ("pp", "Ethyl propanoate and ethyl benzoate", "That would put a methyl between the two C=O.")],
        {k: k for k in opts}, ok[0] if len(ok) == 1 else None, "ba",
        "β-Keto ester: cut the α-carbon to ketone C=O bond.", prov("forward Claisen run on each option", CH_COND),
        lead("CCOC(=O)CC(=O)c1ccccc1", "ethyl 3-oxo-3-phenylpropanoate", "the target"), concepts=SYN + ALDOL)

    t = canon("CCCC(C)=O")
    opts = {"et": S["etbr"], "pr": S["prBr"], "me": S["mei"]}
    ok = [k for k, h in opts.items() if malonic([h], ACAC_ESTER)[1] == t]
    pick(node, "u9-re-aa", "Pick the halide that makes pentan-2-one by the acetoacetic ester route.",
         [o("et", S["etbr"], "bromoethane", "Pentan-2-one is CH₃CO-CH₂-CH₂CH₃: remove CH₃COCH₂ and an ethyl is left."),
          o("pr", S["prBr"], "1-bromopropane", "Propyl gives hexan-2-one."),
          o("me", S["mei"], "iodomethane", "Methyl gives butan-2-one.")],
         [opts[k] for k in ok], "et", "Find the methyl ketone, then the R on its α-carbon.", prov("forward route run on each option", CH_ALPHA, DECARB_CONV),
         lead("CCCC(C)=O", "pentan-2-one", "the target"), concepts=SYN + ALK, convention=DECARB_CONV)

    t = canon("O=C(O)CCc1ccccc1")
    opts = {"bn": S["bnbr"], "ph": S["phbr"], "pe": "BrCCc1ccccc1"}
    ok = [k for k, h in opts.items() if halide_class(h) != "aryl" and malonic([h])[1] == t]
    pick(node, "u9-re-mal", "Pick the halide that makes 3-phenylpropanoic acid by the malonic ester route.",
         [o("bn", S["bnbr"], "(bromomethyl)benzene", "Remove CH₂CO₂H from the target: a benzyl group is left."),
          o("ph", S["phbr"], "bromobenzene", "An aryl halide does not do SN2."),
          o("pe", "BrCCc1ccccc1", "(2-bromoethyl)benzene", "That adds one CH₂ too many: 4-phenylbutanoic acid.")],
         [opts[k] for k in ok], "bn", "Malonic: target acid minus CH₂CO₂H is the halide's R.", prov("forward route run on each option", CH_ALPHA, SN2_CONV),
         lead("O=C(O)CCc1ccccc1", "3-phenylpropanoic acid", "the target"), concepts=SYN + ALK, convention=SN2_CONV)

    t = canon("O=C1CCCC(CC)C1")
    opts = {"et": "[*]CC", "me": "[*]C", "pr": "[*]CCC"}
    ok = [k for k, nu in opts.items() if canon(conj_add(S["chxenone"], nu)) == t]
    ask(node, "u9-re-cuprate", "Pick the reagents for 3-ethylcyclohexan-1-one from an enone.",
        [("et", "Cyclohex-2-en-1-one, then (CH₃CH₂)₂CuLi", "The ethyl sits β to the C=O: a 1,4-addition put it there."),
         ("me", "Cyclohex-2-en-1-one, then (CH₃)₂CuLi", "That gives 3-methylcyclohexanone."),
         ("pr", "Cyclohex-2-en-1-one, then (CH₃CH₂CH₂)₂CuLi", "That gives 3-propylcyclohexanone.")],
        {k: k for k in opts}, ok[0] if len(ok) == 1 else None, "et",
        "A group β to a ketone suggests a conjugate addition.", prov("Rule K run for each option", CH_CONJ, CONJ_CONV),
        lead("O=C1CCCC(CC)C1", "3-ethylcyclohexan-1-one", "the target"), concepts=SYN + CONJ, convention=CONJ_CONV)


# ---------------------------------------------------------------------------
# u9-stork (branch)
# ---------------------------------------------------------------------------

STORK_CONV = "a secondary amine gives an enamine; a primary amine gives an imine; the enamine carbon is the nucleophile"


def node_stork() -> None:
    node = "u9-stork"
    en = unique(enamine(S["chx"], S["pyrr"]), "enamine")
    pick(node, "u9-st-meet", "Cyclohexanone and pyrrolidine meet a trace of acid. Pick the enamine.",
         [o("e", en, "1-(cyclohex-1-en-1-yl)pyrrolidine", "The N replaces the O; the ring loses an α-H to make the C=C next to N."),
          o("im", "C1CCC(=[N+]2CCCC2)CC1", "1-cyclohexylidenepyrrolidin-1-ium", "That is the iminium on the way. It loses an α-H to become the neutral enamine."),
          o("am", "C1CCC(N2CCCC2)CC1", "1-cyclohexylpyrrolidine", "That is the reductive amination product, which needs a hydride.")],
         [en], "e", "Ketone plus secondary amine gives an enamine.", prov("Rule N", CH_COND, STORK_CONV),
         pair(named(S["chx"], "cyclohexanone"), named(S["pyrr"], "pyrrolidine")), level=0, concepts=NADD + ALK, convention=STORK_CONV)

    by = byproduct([S["chx"], S["pyrr"]], [en], {"H2O": "O", "H2": "[HH]", "NH3": "N"})
    ask(node, "u9-st-water", "Pick the byproduct of enamine formation.",
        [("H2O", "Water", "The C=O oxygen leaves with the N-H and an α-H: one water."),
         ("H2", "H₂", "Nothing is oxidised."),
         ("NH3", "Ammonia", "The pyrrolidine N stays in the enamine.")],
        {"H2O": "H2O", "H2": "H2", "NH3": "NH3"}, by, "H2O", "Enamine formation is a condensation.", prov("atom balance", CH_COND),
        lead(en, "1-(cyclohex-1-en-1-yl)pyrrolidine", "the enamine"), concepts=NADD)

    _, got = stork(S["chx"], S["pyrr"], S["mei"])
    k = [g for g in got if g != canon(S["pyrr"])]
    pick(node, "u9-st-mei", "The pyrrolidine enamine of cyclohexanone meets CH₃I, then H₃O⁺. Pick the product.",
         [o("p", first(k), "2-methylcyclohexan-1-one", "The enamine's β-carbon attacks CH₃I. The iminium that forms is hydrolysed back to the ketone."),
          o("n", "C[N+]1(C2=CCCCC2)CCCC1", "1-(cyclohex-1-en-1-yl)-1-methylpyrrolidin-1-ium", "N-alkylation happens a little, but it is not the product after workup."),
          o("chx", S["chx"], "cyclohexanone", "The methyl was added before hydrolysis, so it stays.")],
         k, "p", "Stork: enamine alkylation, then hydrolysis, alkylates the ketone.", prov("Rule N then hydrolysis", CH_COND, STORK_CONV),
         lead(en, "1-(cyclohex-1-en-1-yl)pyrrolidine", "CH₃I, then H₃O⁺"), concepts=NADD + ALK, convention=STORK_CONV)

    _, got = stork(S["chx"], S["pyrr"], S["mvk"], michael_acceptor=True)
    k = [g for g in got if g != canon(S["pyrr"])]
    pick(node, "u9-st-mvk", "Cyclohexanone's pyrrolidine enamine meets but-3-en-2-one, then H₃O⁺. Pick the product.",
         [o("p", first(k), "2-(3-oxobutyl)cyclohexan-1-one", "Enamines are soft: they add 1,4 to the enone, then hydrolysis returns the ring ketone."),
          o("12", "C=CC(C)(O)C1CCCCC1=O", "2-(2-hydroxybut-3-en-2-yl)cyclohexan-1-one", "Enamines add 1,4, not 1,2."),
          o("ring", "O=C1CCC2CCCCC2=C1", "4,4a,5,6,7,8-hexahydronaphthalen-2(3H)-one", "Ring closure needs base and heat afterwards. This stops at the diketone.", text="The fused bicyclic enone")],
         k, "p", "A Stork enamine does Michael additions too.", prov("Rule N with Rule K, then hydrolysis", CH_COND, STORK_CONV),
         lead(en, "1-(cyclohex-1-en-1-yl)pyrrolidine", "but-3-en-2-one, then H₃O⁺"), concepts=NADD + CONJ, convention=STORK_CONV)

    nh = {"pyrr": h_on(S["pyrr"], match_one(S["pyrr"], "[NX3]")[0]), "mea": 2, "tea": 0}
    ok = [k for k, n in nh.items() if n == 1]
    pick(node, "u9-st-amine", "Pick the amine that turns a ketone into an enamine.",
         [o("pyrr", S["pyrr"], "pyrrolidine", "A secondary amine has one N-H. After it bonds, the N has no H to lose, so an α-H leaves: C=C, the enamine."),
          o("mea", "CN", "methanamine", "A primary amine keeps an N-H and loses it, giving a C=N imine instead."),
          o("tea", "CCN(CC)CC", "N,N-diethylethanamine", "A tertiary amine has no N-H to start condensation.")],
         [S["pyrr"]] if ok == ["pyrr"] else None, "pyrr", "Secondary amine, enamine. Primary amine, imine.",
         prov("N-H counted by RDKit", CH_COND, STORK_CONV), lead(S["chx"], "cyclohexanone", "+ an amine"), concepts=NADD, convention=STORK_CONV)

    n_c, n, c_nu = match_one(en, "[CX3](-[NX3])=[CX3]")
    kind = "beta" if c_nu not in (n_c, n) and mol(en).GetBondBetweenAtoms(c_nu, n) is None else None
    ask(node, "u9-st-site", "Pick the nucleophilic carbon of an enamine.",
        [("beta", "The C=C carbon not bonded to N", "The N lone pair pushes into the C=C, so the far carbon carries the electron density, like an enolate α-carbon."),
         ("alpha", "The C=C carbon bonded to N", "That carbon becomes the iminium carbon, the electrophilic end."),
         ("n", "A pyrrolidine CH₂ next to N", "Those CH₂ groups are not part of the π system.")],
        {"beta": "beta", "alpha": None, "n": None}, kind, "beta",
        "An enamine is an enolate equivalent: the carbon two atoms from N attacks.", prov("Rule N, the C=C carbon off N", CH_COND, STORK_CONV),
        lead(en, "1-(cyclohex-1-en-1-yl)pyrrolidine", "the enamine"), concepts=NADD + ALK, convention=STORK_CONV)


# ---------------------------------------------------------------------------
# u9-mannich (branch)
# ---------------------------------------------------------------------------

def node_mannich() -> None:
    node = "u9-mannich"
    p = mannich(S["acetone"], S["me2nh"])
    carbons = lambda smi: sum(1 for a in mol(smi).GetAtoms() if a.GetSymbol() == "C")
    if p and carbons(p) != carbons("C=C(C)N(C)C") + 1:
        fail("u9-ma-meet: the Mannich product should have one carbon more than the enamine")
    pick(node, "u9-ma-meet", "Propan-2-one, methanal and dimethylamine meet acid. Pick the Mannich product.",
         [o("p", p, "4-(dimethylamino)butan-2-one", "Methanal and the amine make an iminium ion. The ketone's enol attacks its CH₂, adding CH₂N(CH₃)₂."),
          o("ald", "CC(=O)CCO", "4-hydroxybutan-2-one", "That is the aldol with methanal. The amine turns methanal into a better electrophile first."),
          o("en", "C=C(C)N(C)C", "N,N-dimethylprop-1-en-2-amine", "That is the enamine of propan-2-one. It has no carbon from methanal. The Mannich product gains one CH₂.")],
         [p], "p", "Mannich: enol plus iminium gives a β-amino ketone.", prov("Rule N, Mannich", CH_COND),
         lead(S["acetone"], "propan-2-one", "CH₂O, (CH₃)₂NH, H⁺"), level=0, concepts=NADD + ALDOL)

    ion = iminium(S["me2nh"])
    pick(node, "u9-ma-ion", "Pick the electrophile formed from methanal and dimethylamine.",
         [o("i", ion, "N-methyl-N-methylidenemethanaminium", "The amine adds to methanal and water leaves, giving CH₂=N⁺(CH₃)₂.", text="CH₂=N⁺(CH₃)₂, an iminium ion"),
          o("am", "CN(C)CO", "(dimethylamino)methanol", "That is the first adduct. It loses water to become the iminium.", text="(CH₃)₂NCH₂OH"),
          o("tma", "CN(C)C", "N,N-dimethylmethanamine", "That would need a hydride.", text="(CH₃)₃N")],
         [ion], "i", "The iminium carbon is the Mannich electrophile.", prov("Rule N, iminium", CH_COND),
         pair(named("C=O", "methanal"), named(S["me2nh"], "N-methylmethanamine")), concepts=NADD)

    p2 = mannich(S["chx"], S["me2nh"])
    pick(node, "u9-ma-chx", "Cyclohexanone, methanal and dimethylamine meet acid. Pick the product.",
         [o("p", p2, "2-[(dimethylamino)methyl]cyclohexan-1-one", "The α-carbon gains a CH₂N(CH₃)₂."),
          o("n", "CN(C)C1CCCCC1", "N,N-dimethylcyclohexanamine", "That is reductive amination at the C=O. The Mannich keeps the C=O."),
          o("ald", "O=C1CCCCC1CO", "2-(hydroxymethyl)cyclohexan-1-one", "That is the methanal aldol. The amine is part of the product.")],
         [p2], "p", "The α-carbon is aminomethylated.", prov("Rule N, Mannich", CH_COND),
         lead(S["chx"], "cyclohexanone", "CH₂O, (CH₃)₂NH, H⁺"), concepts=NADD)

    by = byproduct(["C=O", S["me2nh"], "[H+]"], [ion], {"H2O": "O", "H2": "[HH]", "MeOH": "CO"})
    ask(node, "u9-ma-water", "Pick what leaves when methanal and dimethylamine form the iminium under acid.",
        [("H2O", "Water", "The methanal oxygen leaves as water once protonated."),
         ("H2", "H₂", "No oxidation happens."),
         ("MeOH", "Methanol", "The methanal carbon stays as the iminium CH₂.")],
        {"H2O": "H2O", "H2": "H2", "MeOH": "MeOH"}, by, "H2O", "Iminium formation is a condensation.", prov("atom and charge balance", CH_COND),
        pair(named("C=O", "methanal"), named(S["me2nh"], "N-methylmethanamine")), concepts=NADD)

    pos = x_position(p, "[NX3]-[CH2]")
    ask(node, "u9-ma-beta", "Pick where the nitrogen sits in a Mannich product.",
        [("beta", "On the β-carbon", "The new CH₂ is bonded to the α-carbon, and the N hangs off it: a β-amino ketone."),
         ("alpha", "On the α-carbon", "The α-carbon made the C-C bond. The N is one carbon further on."),
         ("carbonyl", "On the carbonyl carbon", "The C=O survives.")],
        {"beta": "beta", "alpha": "alpha", "carbonyl": "carbonyl"}, pos, "beta",
        "Mannich bases are β-amino carbonyl compounds.", prov("bond count from the N carbon to the C=O carbon", CH_COND),
        lead(p, "4-(dimethylamino)butan-2-one", "the product"), concepts=NADD)

    ask(node, "u9-ma-elec", "Pick the atom the enol attacks in the Mannich reaction.",
        [("c", "The iminium CH₂ carbon", "C=N⁺ is more electrophilic than C=O, so the enol bonds to that carbon."),
         ("n", "The iminium nitrogen", "N⁺ has no empty orbital to accept a pair. The charge is shared onto carbon."),
         ("co", "Another ketone's C=O carbon", "That would be an aldol. The iminium outcompetes it.")],
        {"c": "c", "n": None, "co": None}, "c" if match_one(ion, "[CH2]=[N+]") else None, "c",
        "Iminium carbon: the Mannich electrophile.", prov("Rule N, the bond the edit adds", CH_COND),
        lead(ion, "N-methyl-N-methylidenemethanaminium", "the iminium"), concepts=NADD)


# ---------------------------------------------------------------------------
# u9-knoevenagel (branch)
# ---------------------------------------------------------------------------

def knoev(donor: str, aldehyde: str) -> str | None:
    a = central(donor) if hits(donor, BETA_KETO_CH) else match_one(donor, "[CH2](C#N)C=O")[0]
    return condensed(aldol(donor, a, aldehyde))


def node_knoevenagel() -> None:
    node = "u9-knoevenagel"
    p = knoev(MALONATE, S["phcho"])
    pick(node, "u9-kn-meet", "Diethyl malonate and benzaldehyde are heated with piperidine. Pick the product.",
         [o("p", p, "diethyl 2-benzylidenepropanedioate", "The doubly activated CH₂ adds to the aldehyde, then water leaves, making C=C."),
          o("ald", "CCOC(=O)C(C(=O)OCC)C(O)c1ccccc1", "diethyl 2-[hydroxy(phenyl)methyl]propanedioate", "That is the addition product. Heat dehydrates it."),
          o("mi", "CCOC(=O)C(Cc1ccccc1)C(=O)OCC", "diethyl 2-benzylpropanedioate", "That has two extra H. Nothing is reduced.")],
         [p], "p", "Knoevenagel: aldol condensation with a stabilised donor.", prov("Rule A then E1cb", CH_COND),
         pair(named(MALONATE, "diethyl propanedioate"), named(S["phcho"], "benzaldehyde")), level=0, concepts=ALDOL)

    p2 = knoev(S["acac"], S["phcho"])
    pick(node, "u9-kn-dione", "Pentane-2,4-dione and benzaldehyde condense with a weak amine base. Pick the product.",
         [o("p", p2, "3-benzylidenepentane-2,4-dione", "The central carbon joins the aldehyde carbon with a C=C."),
          o("end", "CC(=O)CC(=O)C=Cc1ccccc1", "6-phenylhex-5-ene-2,4-dione", "That uses an end CH₃, near pKa 20. The central C-H, near 10, reacts."),
          o("ald", "CC(=O)C(C(C)=O)C(O)c1ccccc1", "3-[hydroxy(phenyl)methyl]pentane-2,4-dione", "That still holds the OH.")],
         [p2], "p", "The most acidic carbon is the one that condenses.", prov("Rule A then E1cb", CH_COND),
         pair(named(S["acac"], "pentane-2,4-dione"), named(S["phcho"], "benzaldehyde")), concepts=ALDOL)

    cands = {"mal": MALONATE, "ac": S["acetone"], "et": S["etoac"]}
    best = [s for s in cands.values() if most_acidic(s) == "beta_dicarbonyl_alpha_ch"]
    pick(node, "u9-kn-donor", "Pick the donor a weak amine base can enolise for a Knoevenagel.",
         [o("mal", MALONATE, "diethyl propanedioate", "Its C-H near pKa 10 is acidic enough for a weak base."),
          o("ac", S["acetone"], "propan-2-one", "Near 20: a weak amine base barely touches it."),
          o("et", S["etoac"], "ethyl acetate", "Near 25: even less acidic.")],
         best, "mal", "Knoevenagel donors sit between two withdrawing groups.", prov("most acidic site from pka.ts", CH_COND),
         lead(S["phcho"], "benzaldehyde", "the acceptor"), concepts=ALDOL + PKA)

    by = byproduct([MALONATE, S["phcho"]], [p], {"H2O": "O", "EtOH": "CCO", "CO2": "O=C=O"})
    ask(node, "u9-kn-water", "Pick the byproduct of the Knoevenagel of diethyl malonate with benzaldehyde.",
        [("H2O", "Water", "The aldehyde O leaves with the two H from the CH₂: water."),
         ("EtOH", "Ethanol", "Both esters survive. Nothing substitutes at the ester."),
         ("CO2", "CO₂", "No decarboxylation without hydrolysis first.")],
        {"H2O": "H2O", "EtOH": "EtOH", "CO2": "CO2"}, by, "H2O", "A condensation loses water.", prov("atom balance", CH_COND),
        lead(p, "diethyl 2-benzylidenepropanedioate", "the product"), concepts=ALDOL)

    p3 = knoev("CCOC(=O)CC#N", S["phcho"])
    pick(node, "u9-kn-cyano", "Ethyl cyanoacetate and benzaldehyde condense with piperidine. Pick the product.",
         [o("p", p3, "ethyl 2-cyano-3-phenylprop-2-enoate", "The CH₂ between C≡N and the ester is the donor. The new C=C joins it to the aldehyde carbon."),
          o("ald", "CCOC(=O)C(C#N)C(O)c1ccccc1", "ethyl 2-cyano-3-hydroxy-3-phenylpropanoate", "That keeps the OH. Heat removes water."),
          o("amide", "CCOC(=O)CC(N)=O", "ethyl 3-amino-3-oxopropanoate", "The nitrile is not hydrolysed under these conditions.")],
         [p3], "p", "A nitrile activates a CH₂ like a C=O does.", prov("Rule A then E1cb", CH_COND),
         pair(named("CCOC(=O)CC#N", "ethyl cyanoacetate"), named(S["phcho"], "benzaldehyde")), concepts=ALDOL)

    p4 = knoev(MALONATE, S["propanal"])
    pick(node, "u9-kn-propanal", "Diethyl malonate and propanal condense with piperidine. Pick the product.",
         [o("p", p4, "diethyl 2-propylidenepropanedioate", "The malonate carbon and the aldehyde carbon end up joined by a C=C."),
          o("self", "CCC=C(C)C=O", "2-methylpent-2-enal", "That is propanal with itself. The malonate is far more acidic, so it is the donor."),
          o("ald", "CCOC(=O)C(C(=O)OCC)C(O)CC", "diethyl 2-(1-hydroxypropyl)propanedioate", "That is the addition product. Heat dehydrates it.")],
         [p4], "p", "Aliphatic aldehydes work as acceptors too.", prov("Rule A then E1cb", CH_COND),
         pair(named(MALONATE, "diethyl propanedioate"), named(S["propanal"], "propanal")), concepts=ALDOL)


# ---------------------------------------------------------------------------
# u9-reformatsky (branch)
# ---------------------------------------------------------------------------

def node_reformatsky() -> None:
    node = "u9-reformatsky"
    p = reformatsky(S["brac"], S["acetone"])
    pick(node, "u9-rf-meet", "Ethyl bromoacetate, zinc, then propan-2-one, then H₃O⁺. Pick the product.",
         [o("p", p, "ethyl 3-hydroxy-3-methylbutanoate", "Zinc inserts into C-Br to make a zinc enolate. Its carbon adds to the ketone C=O."),
          o("cl", "CCOC(=O)CC(C)=O", "ethyl 3-oxobutanoate", "That is a Claisen product. The zinc enolate adds to the ketone, not to another ester."),
          o("alk", "CCOC(=O)CC(C)C", "ethyl 3-methylbutanoate", "No OH there. The ketone C=O becomes C-OH.")],
         [p], "p", "Reformatsky: a zinc ester enolate adds to a ketone or aldehyde.", prov("Rule N, Reformatsky", CH_COND),
         pair(named(S["brac"], "ethyl bromoacetate"), named(S["acetone"], "propan-2-one")), level=0, concepts=ALDOL)

    p2 = reformatsky(S["brac"], S["phcho"])
    pick(node, "u9-rf-phcho", "Ethyl bromoacetate, zinc, then benzaldehyde, then H₃O⁺. Pick the product.",
         [o("p", p2, "ethyl 3-hydroxy-3-phenylpropanoate", "The CH₂ that held Br bonds to the aldehyde carbon, which becomes CH(OH)."),
          o("cin", "CCOC(=O)C=Cc1ccccc1", "ethyl 3-phenylprop-2-enoate", "That has lost water. Reformatsky stops at the β-hydroxy ester."),
          o("bz", "OCc1ccccc1", "phenylmethanol", "That needs a hydride. Zinc gives a carbon nucleophile.")],
         [p2], "p", "The product is a β-hydroxy ester.", prov("Rule N, Reformatsky", CH_COND),
         pair(named(S["brac"], "ethyl bromoacetate"), named(S["phcho"], "benzaldehyde")), concepts=ALDOL)

    pos = x_position(p, "[OX2H1][CX4]")
    ask(node, "u9-rf-beta", "Pick where the OH sits in a Reformatsky product.",
        [("beta", "On the β-carbon", "The former C-Br carbon is α; the former C=O carbon, now C-OH, is next to it: β."),
         ("alpha", "On the α-carbon", "The α-carbon is the one that held the Br. It now bonds to the new carbon."),
         ("gamma", "On the γ-carbon", "Only one carbon separates the C-OH from the ester carbonyl.")],
        {"beta": "beta", "alpha": "alpha", "gamma": "gamma"}, pos, "beta",
        "Reformatsky products are β-hydroxy esters, like an ester aldol.", prov("bond count from the OH carbon to the C=O carbon", CH_COND),
        lead(p, "ethyl 3-hydroxy-3-methylbutanoate", "the product"), concepts=ALDOL)

    p3 = reformatsky("CCOC(=O)C(C)Br", S["chx"])
    pick(node, "u9-rf-chx", "Ethyl 2-bromopropanoate, zinc, then cyclohexanone, then H₃O⁺. Pick the product.",
         [o("p", p3, "ethyl 2-(1-hydroxycyclohexyl)propanoate", "The CH that held Br bonds to the ring C=O carbon, which becomes a tertiary C-OH."),
          o("lin", "CCOC(=O)CCC1(O)CCCCC1", "ethyl 3-(1-hydroxycyclohexyl)propanoate", "That bond starts from the CH₃, which never held the Br."),
          o("chx", "OC1CCCCC1", "cyclohexanol", "That needs a hydride.")],
         [p3], "p", "The carbon that held Br is the one that bonds.", prov("Rule N, Reformatsky", CH_COND),
         pair(named("CCOC(=O)C(C)Br", "ethyl 2-bromopropanoate"), named(S["chx"], "cyclohexanone")), concepts=ALDOL)

    p4 = condensed(p2)
    pick(node, "u9-rf-dehyd", "Ethyl 3-hydroxy-3-phenylpropanoate is dehydrated. Pick the product.",
         [o("p", p4, "ethyl 3-phenylprop-2-enoate", "The OH and an α-H leave, putting the C=C in conjugation with both the ring and the ester."),
          o("beta", "CCOC(=O)CC=Cc1ccccc1", "ethyl 4-phenylbut-3-enoate", "That has one more carbon. Dehydration does not change the chain."),
          o("acid", "OC(=O)C=Cc1ccccc1", "3-phenylprop-2-enoic acid", "The ester is not hydrolysed in a dehydration.")],
         [p4], "p", "β-Hydroxy esters dehydrate to α,β-unsaturated esters.", prov("E1cb", CH_COND),
         lead(p2, "ethyl 3-hydroxy-3-phenylpropanoate", "dehydration"), concepts=ALDOL)

    t = canon("CCOC(=O)C(C)C(C)(C)O")
    opts = {"a2": "CCOC(=O)C(C)Br", "a1": S["brac"], "b3": "CCOC(=O)CCBr"}
    ok = [k for k, b in opts.items() if canon(reformatsky(b, S["acetone"])) == t]
    pick(node, "u9-rf-retro", "Pick the bromo ester that gives ethyl 3-hydroxy-2,3-dimethylbutanoate with propan-2-one.",
         [o("a2", opts["a2"], "ethyl 2-bromopropanoate", "The target's α-carbon carries a methyl, so the C-Br carbon must carry one too."),
          o("a1", opts["a1"], "ethyl bromoacetate", "That gives ethyl 3-hydroxy-3-methylbutanoate, with no methyl on the α-carbon."),
          o("b3", opts["b3"], "ethyl 3-bromopropanoate", "Its Br is on the β-carbon. The new bond would land one carbon too far from the ester.")],
         [opts[k] for k in ok], "a2", "Work back from the C-OH: the carbon beside it held the Br.", prov("forward Reformatsky run on each option", CH_COND),
         lead(t, "ethyl 3-hydroxy-2,3-dimethylbutanoate", "the target"), concepts=ALDOL + SYN)


# ---------------------------------------------------------------------------
# u9-directed (branch)
# ---------------------------------------------------------------------------

def node_directed() -> None:
    node = "u9-directed"
    p = aldol_one(S["butanone"], S["acetal"], "kinetic")
    pick(node, "u9-di-meet", "Butan-2-one, LDA at −78 °C, then ethanal, then H₂O. Pick the product.",
         [o("p", p, "5-hydroxyhexan-3-one", "LDA makes the kinetic enolate on the CH₃ side. That carbon then adds to ethanal."),
          o("t", "CC(=O)C(C)C(C)O", "4-hydroxy-3-methylpentan-2-one", "That comes from the more substituted enolate, which cold LDA does not make."),
          o("self", "CC(O)CC=O", "3-hydroxybutanal", "Ethanal never makes its own enolate: it is added after the ketone is fully enolised.")],
         [p], "p", "Directed aldol: make one enolate fully, then add the acceptor.", prov("Rule A at the kinetic site", CH_COND, KINETIC_CONV),
         lead(S["butanone"], "butan-2-one", "LDA, −78 °C, then CH₃CHO"), level=0, concepts=ALDOL + KVT, convention=KINETIC_CONV)

    t = aldol_one(S["butanone"], S["acetal"], "thermo")
    pick(node, "u9-di-thermo", "Pick the aldol product if butan-2-one's more substituted enolate added to ethanal.",
         [o("t", t, "4-hydroxy-3-methylpentan-2-one", "The CH₂ side carbon, carrying a CH₃, bonds to ethanal: a branch next to the C=O."),
          o("k", "CCC(=O)CC(C)O", "5-hydroxyhexan-3-one", "That is the kinetic, methyl-side product."),
          o("cond", "CC=C(C)C(C)=O", "3-methylpent-3-en-2-one", "That has lost water. Addition keeps the OH.")],
         [t], "t", "The enolate's carbon decides the product's skeleton.", prov("Rule A at the more substituted site", CH_COND, KINETIC_CONV),
         lead(S["butanone"], "butan-2-one", "the internal enolate"), concepts=ALDOL + KVT, convention=KINETIC_CONV)

    site = most_acidic(S["butanone"])
    ask(node, "u9-di-why", "Pick why the aldehyde is added only after LDA has acted.",
        [("full", "LDA turns all the ketone into enolate first", "Diisopropylamine, near pKa 35, cannot reprotonate the enolate. With no free ketone or free aldehyde enolate, only one aldol can happen."),
         ("cold", "Cold stops the aldehyde from reacting", "Cold slows things but does not stop the aldehyde from enolising if base were still present."),
         ("lda", "LDA reacts with the aldehyde C=O", "LDA is too hindered to add to a C=O. It only removes protons.")],
        {"full": "full" if deprotonates_fully("LDA", site) else None, "cold": None, "lda": None}, "full", "full",
        "Full, irreversible enolate formation first: then one partner, one product.", prov("Rule P on the course pKa table", CH_COND, KINETIC_CONV),
        lead(S["butanone"], "butan-2-one", "LDA, −78 °C"), concepts=ALDOL + PKA, convention=KINETIC_CONV)

    p2 = aldol_one(S["chx"], S["propanal"], "kinetic")
    pick(node, "u9-di-chx", "Cyclohexanone, LDA, then propanal, then H₂O. Pick the product.",
         [o("p", p2, "2-(1-hydroxypropyl)cyclohexan-1-one", "The ring enolate adds to propanal, whose carbon becomes CH(OH)CH₂CH₃."),
          o("self", "CCC(O)C(C)C=O", "3-hydroxy-2-methylpentanal", "Propanal's own enolate never forms: there is no base left when it is added."),
          o("ring", "O=C1CCCCC1C1(O)CCCCC1", "2-(1-hydroxycyclohexyl)cyclohexan-1-one", "No free cyclohexanone is left to be attacked.")],
         [p2], "p", "Enolate first, aldehyde second.", prov("Rule A", CH_COND, KINETIC_CONV),
         pair(named(S["chx"], "cyclohexanone"), named(S["propanal"], "propanal")), concepts=ALDOL, convention=KINETIC_CONV)

    p3 = aldol_one(S["mechx"], S["phcho"], "kinetic")
    pick(node, "u9-di-mechx", "2-Methylcyclohexanone, LDA at −78 °C, then benzaldehyde, then H₂O. Pick the product.",
         [o("p", p3, "2-[hydroxy(phenyl)methyl]-6-methylcyclohexan-1-one", "The kinetic enolate is on the CH₂ side, so the new bond is at C6, away from the methyl.", text="New CH(OH)Ph on the CH₂ side"),
          o("t", "CC1(C(O)c2ccccc2)CCCCC1=O", "2-[hydroxy(phenyl)methyl]-2-methylcyclohexan-1-one", "That is the thermodynamic side, at the carbon with the methyl.", text="New CH(OH)Ph on the methyl carbon"),
          o("cond", "CC1CCCC(=Cc2ccccc2)C1=O", "2-benzylidene-6-methylcyclohexan-1-one", "That has lost water. Cold, the addition product stays.")],
         [p3], "p", "Kinetic enolate, then aldol on the less substituted side.", prov("Rule A at the kinetic site", CH_COND, KINETIC_CONV),
         lead(S["mechx"], "2-methylcyclohexan-1-one", "LDA, −78 °C, then PhCHO"), concepts=ALDOL + KVT, convention=KINETIC_CONV)

    p4 = aldol_one(S["acphen"], S["acetone"], "kinetic")
    pick(node, "u9-di-ketone", "Acetophenone, LDA, then propan-2-one, then H₂O. Pick the product.",
         [o("p", p4, "3-hydroxy-3-methyl-1-phenylbutan-1-one", "The acetophenone enolate adds to propan-2-one's C=O, making a tertiary C-OH."),
          o("self", "CC(=O)CC(C)(C)O", "4-hydroxy-4-methylpentan-2-one", "That would need propan-2-one's enolate. Only acetophenone was deprotonated."),
          o("rev", "CC(O)(CC(C)=O)c1ccccc1", "4-hydroxy-4-phenylpentan-2-one", "That has the partners' roles swapped.")],
         [p4], "p", "Directed aldol even works with a ketone acceptor.", prov("Rule A on the preformed enolate", CH_COND),
         pair(named(S["acphen"], "1-phenylethan-1-one"), named(S["acetone"], "propan-2-one")), concepts=ALDOL)


# ---------------------------------------------------------------------------
# Build and emit
# ---------------------------------------------------------------------------

def build() -> None:
    node_tautomer()
    node_pka()
    node_enolate_res()
    node_kvt()
    node_halo_acid()
    node_halo_base()
    node_aldol()
    node_aldol_cond()
    node_crossed()
    node_intra()
    node_claisen()
    node_dieckmann()
    node_crossed_claisen()
    node_alkylation()
    node_malonic()
    node_acetoacetic()
    node_michael()
    node_cuprate()
    node_robinson()
    node_retro()
    node_haloform()
    node_stork()
    node_mannich()
    node_knoevenagel()
    node_reformatsky()
    node_directed()
    check_names()
    for node, entries in POOLS.items():
        if not 6 <= len(entries) <= 12:
            fail(f"{node}: {len(entries)} items, outside 6 to 12")
    for slot in range(4):
        share = CORRECT_INDEX.count(slot) / max(1, len(CORRECT_INDEX))
        if share > 0.5:
            fail(f"{share:.0%} of MCQs put the answer in slot {slot}")


HEADER = '''/**
 * Unit 9 (enols and enolates, alpha-carbon chemistry) problem pools, a DRAFT.
 * GENERATED by scripts/u9_pools.py. Do not edit by hand: edit the specs in the
 * script and rerun it.
 *
 * EVERY ENTRY IS A DRAFT (`placeholder: true`) for the owner's review, never
 * presented as done. Each answer was derived by the script (graph edits for
 * enols, enolates, alpha halogenation, the haloform cut, aldol, E1cb,
 * Claisen, Dieckmann, alkylation, malonic and acetoacetic routes, conjugate
 * addition, enamines, Mannich and Reformatsky; pKa from the course table in
 * packages/curriculum/src/pka.ts; RDKit resonance forms, ring sizes,
 * hybridisation and atom balance; every name read back by OPSIN), and the
 * script refuses to write this file when an authored key disagrees with what
 * it derived. Where an answer rests on an authored convention RDKit cannot
 * check (kinetic against thermodynamic enolates, acid against base
 * halogenation, which ring sizes win, which reagents add 1,4), the entry's
 * provenance says so.
 *
 * Every pool in U9_POOLS is a LESSON pool: MCQs join the node's recognise
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
    return body.replace('"u5-pool"', '"u9-pool"')


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
    out += emit_table("U9_POOLS", list(POOLS), "/** Lesson pools keyed by map node id (beats/practice/pools.ts). */")
    out.append("/** The drawing beside each MCQ, keyed by beat id. */")
    out.append("export const U9_VISUALS: Readonly<Record<string, McqVisual>> = " + ts(VISUALS) + ";\n")
    out.append("/** Drawn options, keyed by beat id then option id. All or nothing per beat. */")
    out.append("export const U9_OPTION_TILES: Readonly<Record<string, Readonly<Record<string, NamedFigure>>>> = " + ts(TILES) + ";\n")
    out.append("/** A drawing for every sort card, keyed by beat id then item id. */")
    out.append("export const U9_SORT_FIGURES: Readonly<Record<string, Readonly<Record<string, NamedFigure>>>> = " + ts(SORT_FIGURES) + ";\n")
    return "\n".join(out)


def reset() -> None:
    for table in (POOLS, VISUALS, TILES, SORT_FIGURES, CONVENTIONS):
        table.clear()
    for seq in (CORRECT_INDEX, NAME_CHECKS, FAILURES, NOTES):
        seq.clear()
    IDS.clear()


def report_disagreements() -> None:
    """Where RDKit's own model and the course convention could part ways, printed for the owner report."""
    # RDKit's tautomer canonicaliser against the course's "keto form wins" for a 1,3-dicarbonyl.
    acac = keto_form("CC(=O)C=C(C)O")
    print(f"RDKit canonical tautomer of pentane-2,4-dione's enol: {acac}"
          + ("" if canon(acac) == canon(S["acac"]) else "  DISAGREES with the diketone the course draws"))
    # Gasteiger charge on the two alpha carbons of 2-methylcyclohexanone, for the kinetic site.
    m = Chem.AddHs(mol(S["mechx"]))
    rdPartialCharges.ComputeGasteigerCharges(m)
    for a, c, _ in alpha_sites(S["mechx"]):
        print(f"2-methylcyclohexanone alpha C{a}: {h_on(S['mechx'], a)} H, Gasteiger {m.GetAtomWithIdx(a).GetDoubleProp('_GasteigerCharge'):.4f}")


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
