"""
Unit 4 (nucleophilic aromatic substitution and benzyne) problem pools, a DRAFT, derived with RDKit.

Run:     python scripts/u4_pools.py
Writes:  src/game/content/u4/pools.ts (never edit it by hand: edit the specs
         below and rerun). The owner's report for this unit is written by hand
         beside the run, from what this script prints.

Built on scripts/u3_pools.py: the figure, naming, entry and emit helpers are
copied from it unchanged (except that a nitronate, C=N with two O-, is drawn
atom by atom instead of condensed to NO2). Every entry is `placeholder: true`.

THE MODEL. Check these rules, not the forty answers.

1. Acceptor test. A ring group can take the ring's negative charge only if
   its first atom has a multiple bond to O or N (NO2, CN, CHO, COR). CF3,
   halogens, alkyl and lone pair donors are not acceptors.

2. SNAr. A ring halogen with at least one acceptor ortho or para to it (ring
   path length 1 or 3, from RDKit's distance matrix) is replaced at its own
   carbon. With one equivalent of nucleophile and two qualifying halogens,
   the one with more o/p acceptors goes first; a tie goes to the carbon with
   the higher Gasteiger charge, the computed stand-in for the taught rate
   order F > Cl > Br > I (an authored convention, flagged per entry).

3. Benzyne. With no activated halogen and a very strong base (NaNH2, or hot
   NaOH in the Dow process), each ortho C-H gives an aryne between it and
   the C-X carbon, and the nucleophile adds to either end. Product SETS are
   derived; ratios are not modelled. No ortho H: no aryne. Methoxide under
   mild conditions is not counted as a benzyne base (convention).

4. The Meisenheimer complex. Nu bonds to the attacked carbon (sp3); the ring
   pi bond it had becomes a minus on its neighbour; the walk moves that pair
   A(-)-B=C to A=B-C(-) across ring C=C and into acceptor groups, each form
   sanitised by RDKit. Charged positions are read off the forms.

5. Isotopes ride along as RDKit isotope labels. The 50:50 split rests on the
   two aryne carbons being equivalent by RDKit canonical rank once the label
   is ignored (isotope effect neglected, a convention).

CHECKED AGAINST, never adapted (licensed problems are a check only):
  OpenStax Organic Chemistry (CC BY-NC-SA 4.0), 16.6 Nucleophilic Aromatic
  Substitution and 16.7 Benzyne (Dow conditions, the labelled halobenzene,
  the two products from p-bromotoluene with NaOH).
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
OUT = REPO / "src" / "game" / "content" / "u4" / "pools.ts"

SCRIPT = "scripts/u4_pools.py"


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
# Names: OPSIN must read each one back as the drawn structure
# ---------------------------------------------------------------------------

NAME_CHECKS: list[tuple[str, str, str]] = []
OPSIN_DIR = Path(tempfile.mkdtemp(prefix="u4_opsin_"))


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
    # a lone ion (hydroxide, drawn as a reagent-only stem) has no bond to measure
    unit = sum(lengths) / len(lengths) if lengths else 1.0
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
    return f"{SCRIPT}: {what}. {os16(section)}.{tail}"


def mcq(node: str, id: str, prompt: str, options: list[tuple[str, str, str]], derived: str | None,
        correct: str, explanation: str, provenance: str, visual: dict, tiles: dict | None = None,
        brief: str | None = None, level: int = 1, concepts: tuple[str, ...] = ("ewg_edg_rubric",),
        convention: str | None = None, levels: list[int] | None = None) -> None:
    """`levels` overrides `level` for an item that plays on more than one rung (audit 23 Oct, top-25 #17)."""
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
    if not id.startswith("u4-"):
        fail(f"{id}: ids start u4-")
    IDS.add(id)
    ids = [o for o, _, _ in options]
    if len(set(ids)) != len(ids):
        fail(f"{id}: two options share an id")
    if correct in ids:
        CORRECT_INDEX.append(ids.index(correct))
    beat = {"kind": "mcq", "id": id, "node": node, "conceptIds": list(concepts), "levels": levels or [level], "prompt": prompt}
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
        "problemId": "u4-pool-" + id,
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
# The Unit 4 model: ring relations, acceptors, graph edits, a resonance walk
# ---------------------------------------------------------------------------

from rdkit.Chem import rdPartialCharges

HALOGENS = {"F", "Cl", "Br", "I"}
REL = {0: "ipso", 1: "ortho", 2: "meta", 3: "para"}


def ring_of(m: Chem.Mol) -> tuple[int, ...]:
    """The one benzene ring, in cyclic order (RDKit's AtomRings order)."""
    rings = [r for r in m.GetRingInfo().AtomRings() if len(r) == 6]
    if len(rings) != 1:
        raise ValueError(f"expected one six-membered ring in {Chem.MolToSmiles(m)}")
    return rings[0]


def relation(m: Chem.Mol, a: int, b: int) -> str:
    """ortho, meta or para, from RDKit's ring path length."""
    return REL[int(Chem.GetDistanceMatrix(m)[a][b])]


def ring_halogens(smi: str) -> list[tuple[int, int]]:
    """(ring carbon, halogen) for every halogen on the ring."""
    m = mol(smi)
    ring = set(ring_of(m))
    return [(c, n.GetIdx()) for c in ring for n in m.GetAtomWithIdx(c).GetNeighbors() if n.GetSymbol() in HALOGENS]


def is_acceptor(m: Chem.Mol, x: int) -> bool:
    """
    Rule 1. A group can take the ring's negative charge only if its first
    atom X has a multiple bond to O or N (NO2, CN, CHO, COR, SO2R). CF3 and
    the halogens pull by induction only and are not acceptors here.
    """
    a = m.GetAtomWithIdx(x)
    return any(b.GetBondTypeAsDouble() >= 2 and b.GetOtherAtom(a).GetSymbol() in ("O", "N") for b in a.GetBonds())


def acceptor_carbons(m: Chem.Mol) -> list[int]:
    """Ring carbons that carry an acceptor group."""
    ring = set(ring_of(m))
    return [c for c in ring for n in m.GetAtomWithIdx(c).GetNeighbors()
            if n.GetIdx() not in ring and is_acceptor(m, n.GetIdx())]


def op_acceptors(smi: str, c: int) -> int:
    """How many acceptors sit ortho or para to ring carbon c."""
    m = mol(smi)
    return sum(1 for a in acceptor_carbons(m) if relation(m, c, a) in ("ortho", "para"))


def ipso_charge(smi: str, c: int) -> float:
    """Gasteiger partial charge on ring carbon c: the computed proxy for how electron poor it is."""
    m = mol(smi)
    rdPartialCharges.ComputeGasteigerCharges(m)
    return m.GetAtomWithIdx(c).GetDoubleProp("_GasteigerCharge")


def fixed(m: Chem.Mol) -> Chem.RWMol:
    """An editable copy whose H counts are pinned, so bond edits never move a hydrogen."""
    rw = Chem.RWMol(m)
    for a in rw.GetAtoms():
        n = a.GetTotalNumHs()
        a.SetNoImplicit(True)
        a.SetNumExplicitHs(n)
    return rw


def add_group(rw: Chem.RWMol, at: int, frag: str) -> int:
    """Bond fragment `frag` (its first atom is the attaching one, written in brackets) to atom `at`."""
    f = fixed(mol(frag))
    f.GetAtomWithIdx(0).SetNumRadicalElectrons(0)
    base = rw.GetNumAtoms()
    for a in f.GetAtoms():
        rw.AddAtom(a)
    for b in f.GetBonds():
        rw.AddBond(base + b.GetBeginAtomIdx(), base + b.GetEndAtomIdx(), b.GetBondType())
    rw.AddBond(at, base, Chem.BondType.SINGLE)
    return base


def finish(rw: Chem.RWMol) -> str:
    out = rw.GetMol()
    for a in out.GetAtoms():
        a.SetNumRadicalElectrons(0)
    Chem.SanitizeMol(out)
    return Chem.MolToSmiles(out)


def set_h(rw: Chem.RWMol, i: int, delta: int) -> None:
    a = rw.GetAtomWithIdx(i)
    a.SetNumExplicitHs(a.GetNumExplicitHs() + delta)


def substitute(smi: str, c: int, x: int, nu: str) -> str:
    """Nu onto ring carbon c, halogen x off: the ipso product."""
    rw = fixed(mol(smi))
    add_group(rw, c, nu)
    rw.RemoveAtom(x)
    return finish(rw)


def cine(smi: str, c: int, x: int, j: int, nu: str) -> str:
    """Nu onto the ortho carbon j (which loses its H); c gains an H; halogen x off."""
    rw = fixed(mol(smi))
    add_group(rw, j, nu)
    set_h(rw, j, -1)
    set_h(rw, c, +1)
    rw.RemoveAtom(x)
    return finish(rw)


# Rule 2, SNAr: a ring halogen with at least one acceptor ortho or para is
# replaced at its own carbon. Where two halogens qualify, the one with more
# o/p acceptors goes first, and a tie goes to the more electron poor carbon
# (Gasteiger), which is the computed stand-in for the taught F > Cl > Br > I.

def snar_sites(smi: str) -> list[tuple[int, int]]:
    return [(c, x) for c, x in ring_halogens(smi) if op_acceptors(smi, c) > 0]


def snar_first(smi: str) -> tuple[int, int] | None:
    sites = snar_sites(smi)
    if not sites:
        return None
    return max(sites, key=lambda s: (op_acceptors(smi, s[0]), ipso_charge(smi, s[0])))


def snar(smi: str, nu: str) -> list[str]:
    """The one SNAr product with one equivalent of Nu, or [] when no halogen is activated."""
    site = snar_first(smi)
    return [] if site is None else [substitute(smi, site[0], site[1], nu)]


# Rule 3, benzyne: with no activated halogen, a very strong base removes an
# H ortho to the halogen and the halide leaves, giving an aryne between the
# two carbons. The nucleophile adds to either end of it. Every ortho C-H
# gives its own aryne; ratios are NOT modelled, only which products form.

def ortho_h(smi: str, c: int) -> list[int]:
    m = mol(smi)
    ring = set(ring_of(m))
    return [n.GetIdx() for n in m.GetAtomWithIdx(c).GetNeighbors() if n.GetIdx() in ring and n.GetTotalNumHs() > 0]


def benzyne_products(smi: str, nu: str) -> list[str]:
    out: set[str] = set()
    for c, x in ring_halogens(smi):
        for j in ortho_h(smi, c):
            out.add(canon(substitute(smi, c, x, nu)))
            out.add(canon(cine(smi, c, x, j, nu)))
    return sorted(out)


def aryne(smi: str, c: int, x: int, j: int) -> str:
    """The aryne between c and j, its ring written out bond by bond around the cycle."""
    m = mol(smi)
    ring = list(ring_of(m))
    rw = fixed(m)
    Chem.Kekulize(rw, clearAromaticFlags=True)
    k = ring.index(c)
    cyc = ring[k:] + ring[:k]
    if cyc[1] != j:
        cyc = [cyc[0]] + cyc[1:][::-1]
    orders = [Chem.BondType.TRIPLE, Chem.BondType.SINGLE, Chem.BondType.DOUBLE, Chem.BondType.SINGLE, Chem.BondType.DOUBLE, Chem.BondType.SINGLE]
    for n in range(6):
        rw.GetBondBetweenAtoms(cyc[n], cyc[(n + 1) % 6]).SetBondType(orders[n])
    set_h(rw, j, -1)
    rw.RemoveAtom(x)
    return finish(rw)


def outcome(smi: str, reagent: str) -> list[str]:
    """What the unit teaches happens: SNAr when a halogen is activated, else benzyne with NH2- or hot OH-, else nothing."""
    nu = {"NaOCH3": "[O]C", "NaOH": "[OH]", "NaNH2": "[NH2]"}[reagent]
    if snar_sites(smi):
        return snar(smi, nu)
    if reagent == "NaOCH3":
        return []
    return benzyne_products(smi, nu)


# Rule 4, the Meisenheimer complex, walked. Nu bonds to the attacked carbon,
# which goes sp3; the ring pi bond it had becomes a lone pair (the minus) on
# its neighbour. Each step moves that pair across one more pi bond:
# A(-)-B=C becomes A=B-C(-). C may be a ring carbon or the O or N of a group.
# Every form is sanitised by RDKit and kept once by canonical SMILES.

def meisenheimer(smi: str, c: int, nu: str, x: int | None = None) -> Chem.Mol:
    m = mol(smi)
    rw = fixed(m)
    Chem.Kekulize(rw, clearAromaticFlags=True)
    ring = set(ring_of(m))
    add_group(rw, c, nu)
    j = [b.GetOtherAtomIdx(c) for b in rw.GetAtomWithIdx(c).GetBonds()
         if b.GetBondType() == Chem.BondType.DOUBLE and b.GetOtherAtomIdx(c) in ring][0]
    rw.GetBondBetweenAtoms(c, j).SetBondType(Chem.BondType.SINGLE)
    rw.GetAtomWithIdx(j).SetFormalCharge(-1)
    out = rw.GetMol()
    for a in out.GetAtoms():
        a.SetNumRadicalElectrons(0)
    Chem.SanitizeMol(out)
    out.SetIntProp("moving", j)
    return out


def anion_forms(start: Chem.Mol) -> list[tuple[str, int, Chem.Mol]]:
    """Every form the walk reaches: (canonical SMILES, index of the atom holding the moving pair, mol)."""
    seen: dict[str, tuple[str, int, Chem.Mol]] = {}
    queue = [(start, start.GetIntProp("moving"))]
    while queue:
        cur, a = queue.pop(0)
        key = Chem.MolToSmiles(cur)
        if key in seen:
            continue
        seen[key] = (key, a, cur)
        if cur.GetAtomWithIdx(a).GetSymbol() != "C":
            continue
        for bond_ab in cur.GetAtomWithIdx(a).GetBonds():
            if bond_ab.GetBondType() != Chem.BondType.SINGLE:
                continue
            b = bond_ab.GetOtherAtomIdx(a)
            for bond_bc in cur.GetAtomWithIdx(b).GetBonds():
                c2 = bond_bc.GetOtherAtomIdx(b)
                if c2 == a or bond_bc.GetBondTypeAsDouble() < 2:
                    continue
                rw = Chem.RWMol(cur)
                rw.GetBondBetweenAtoms(a, b).SetBondType(Chem.BondType.DOUBLE)
                down = Chem.BondType.DOUBLE if bond_bc.GetBondType() == Chem.BondType.TRIPLE else Chem.BondType.SINGLE
                rw.GetBondBetweenAtoms(b, c2).SetBondType(down)
                rw.GetAtomWithIdx(a).SetFormalCharge(rw.GetAtomWithIdx(a).GetFormalCharge() + 1)
                rw.GetAtomWithIdx(c2).SetFormalCharge(rw.GetAtomWithIdx(c2).GetFormalCharge() - 1)
                nxt = rw.GetMol()
                try:
                    Chem.SanitizeMol(nxt)
                except Exception:
                    continue
                queue.append((nxt, c2))
    return list(seen.values())


def charge_sites(smi: str, c: int, nu: str) -> dict:
    """Where the moving minus lands: ring relations to c, and which acceptor groups take it."""
    forms = anion_forms(meisenheimer(smi, c, nu))
    m = mol(smi)
    ring_rel = set()
    groups = set()
    for _, a, f in forms:
        atom = f.GetAtomWithIdx(a)
        if atom.GetSymbol() == "C" and a < m.GetNumAtoms() and a in set(ring_of(m)):
            ring_rel.add(relation(m, c, a))
        else:
            groups.add(atom.GetNeighbors()[0].GetIdx())
    return {"forms": forms, "ring": ring_rel, "groups": groups}


def label_relation(smi: str) -> str:
    """For a labelled aniline or phenol: where the 14C sits relative to the carbon bearing N or O."""
    m = mol(smi)
    ring = set(ring_of(m))
    lab = [a.GetIdx() for a in m.GetAtoms() if a.GetIsotope() == 14][0]
    het = [c for c in ring for n in m.GetAtomWithIdx(c).GetNeighbors() if n.GetSymbol() in ("N", "O")][0]
    return relation(m, het, lab)


def labelled_atom(smi: str) -> int:
    return [a.GetIdx() for a in mol(smi).GetAtoms() if a.GetIsotope() == 14][0]


def site(smi: str) -> tuple[int, int]:
    """The single ring halogen of a monohalide."""
    hs = ring_halogens(smi)
    if len(hs) != 1:
        raise ValueError(f"{smi}: {len(hs)} ring halogens")
    return hs[0]


def key_set(options: dict[str, list[str]], derived: list[str]) -> str | None:
    """The one option whose product set equals the derived set."""
    want = {canon(s) for s in derived}
    hits = [o for o, smis in options.items() if {canon(s) for s in smis} == want]
    return hits[0] if len(hits) == 1 else None


def key_word(options: dict[str, object], value: object) -> str | None:
    hits = [o for o, v in options.items() if v == value]
    return hits[0] if len(hits) == 1 else None


C4 = {
    "cb": ("Clc1ccccc1", "chlorobenzene"),
    "pcnb": ("Clc1ccc([N+](=O)[O-])cc1", "1-chloro-4-nitrobenzene"),
    "ocnb": ("Clc1ccccc1[N+](=O)[O-]", "1-chloro-2-nitrobenzene"),
    "mcnb": ("Clc1cccc([N+](=O)[O-])c1", "1-chloro-3-nitrobenzene"),
    "cdnb": ("Clc1ccc([N+](=O)[O-])cc1[N+](=O)[O-]", "1-chloro-2,4-dinitrobenzene"),
    "ctnb": ("Clc1c([N+](=O)[O-])cc([N+](=O)[O-])cc1[N+](=O)[O-]", "2-chloro-1,3,5-trinitrobenzene"),
    "fdnb": ("Fc1ccc([N+](=O)[O-])cc1[N+](=O)[O-]", "1-fluoro-2,4-dinitrobenzene"),
    "bdnb": ("Brc1ccc([N+](=O)[O-])cc1[N+](=O)[O-]", "1-bromo-2,4-dinitrobenzene"),
    "idnb": ("Ic1ccc([N+](=O)[O-])cc1[N+](=O)[O-]", "1-iodo-2,4-dinitrobenzene"),
    "pfnb": ("Fc1ccc([N+](=O)[O-])cc1", "1-fluoro-4-nitrobenzene"),
    "pinb": ("Ic1ccc([N+](=O)[O-])cc1", "1-iodo-4-nitrobenzene"),
    "dcnb": ("Clc1ccc([N+](=O)[O-])cc1Cl", "1,2-dichloro-4-nitrobenzene"),
    "cfdnb": ("Clc1cc(F)c([N+](=O)[O-])cc1[N+](=O)[O-]", "1-chloro-5-fluoro-2,4-dinitrobenzene"),
    "bfnb": ("Brc1ccc(F)cc1[N+](=O)[O-]", "1-bromo-4-fluoro-2-nitrobenzene"),
    "pccn": ("N#Cc1ccc(Cl)cc1", "4-chlorobenzonitrile"),
    "pca": ("COc1ccc(Cl)cc1", "1-chloro-4-methoxybenzene"),
    "pct": ("Cc1ccc(Cl)cc1", "1-chloro-4-methylbenzene"),
    "oct": ("Cc1ccccc1Cl", "1-chloro-2-methylbenzene"),
    "mct": ("Cc1cccc(Cl)c1", "1-chloro-3-methylbenzene"),
    "pbt": ("Cc1ccc(Br)cc1", "1-bromo-4-methylbenzene"),
    "obt": ("Cc1ccccc1Br", "1-bromo-2-methylbenzene"),
    "bxyl": ("Cc1cccc(C)c1Br", "2-bromo-1,3-dimethylbenzene"),
    "pcan": ("Nc1ccc(Cl)cc1", "4-chloroaniline"),
}


def S4(key: str) -> str:
    return C4[key][0]


def N4(key: str) -> str:
    return C4[key][1]


def nm(smi: str, name: str, caption: str | None = None, **kw) -> dict:
    """A drawn, OPSIN-checked tile."""
    return named(canon(smi), name, caption, **kw)


def reagent(smi: str, caption: str) -> dict:
    """
    A reagent-only stem for a "pick one of these" item whose options are all
    drawn: the reagent ion, never a candidate, so the picture above the
    question is not the answer (audit 23 Oct, top-25 #16).
    """
    return structure(smi, "", caption, check=False)


SNAR_CONCEPTS = ("ewg_edg_rubric", "resonance_delocalisation")
MEIS_CONCEPTS = ("resonance_delocalisation", "carbanion_stability")
BZ_CONCEPTS = ("carbanion_stability",)
OS_SNAR = "16.6"
OS_BZ = "16.7"


# ---------------------------------------------------------------------------
# u4-snar: addition-elimination
# ---------------------------------------------------------------------------

def node_snar() -> None:
    node = "u4-snar"
    sec = OS_SNAR
    cdnb = S4("cdnb")
    opts = {"sub": "COc1ccc([N+](=O)[O-])cc1[N+](=O)[O-]",
            "h": "COc1c([N+](=O)[O-])ccc(Cl)c1[N+](=O)[O-]",
            "nitro": "COc1ccc(Cl)c([N+](=O)[O-])c1"}
    mcq(node, "u4-snar-meet", "Treat 1-chloro-2,4-dinitrobenzene with NaOCH₃. Pick the product.",
        [("sub", "OCH₃ in place of Cl", "Methoxide adds to the carbon holding Cl, the ring briefly loses aromaticity, then chloride leaves. Cl is the group swapped out."),
         ("h", "OCH₃ in place of a ring H", "Hydride is a terrible leaving group. The nucleophile adds where a halide can leave, not at a C-H."),
         ("nitro", "OCH₃ in place of a nitro group", "The nitro groups stay on the ring. Their job is to hold the negative charge while methoxide adds at the C-Cl carbon.")],
        key_in(opts, snar(cdnb, "[O]C")), "sub",
        "SNAr swaps the halogen for the nucleophile at the same carbon. The nitro groups ortho and para to it make the swap possible.",
        prov("Rule 2: the Cl carbon has two o/p acceptors, product built by swapping Cl for OCH3", sec),
        structure(cdnb, N4("cdnb"), "1-chloro-2,4-dinitrobenzene + NaOCH₃"),
        tiles={"sub": nm(opts["sub"], "1-methoxy-2,4-dinitrobenzene"),
               "h": nm(opts["h"], "1-chloro-3-methoxy-2,4-dinitrobenzene"),
               "nitro": nm(opts["nitro"], "4-chloro-1-methoxy-3-nitrobenzene")},
        level=0, concepts=SNAR_CONCEPTS)

    cands = {"para": S4("pcnb"), "meta": S4("mcnb"), "plain": S4("cb"), "methyl": S4("pct")}
    reacts = [k for k, s in cands.items() if snar_sites(s)]
    mcq(node, "u4-snar-which", "Only one of these reacts with NaOCH₃ by SNAr. Pick it.",
        [("para", "1-Chloro-4-nitrobenzene", "The nitro group is para to Cl. When methoxide adds, the negative charge can move onto the nitro oxygens."),
         ("meta", "1-Chloro-3-nitrobenzene", "Meta is the wrong place: the negative charge lands ortho and para to the attacked carbon, never on the nitro carbon."),
         ("plain", "Chlorobenzene", "No group on the ring can take the negative charge, so the addition intermediate is too unstable to form."),
         ("methyl", "1-Chloro-4-methylbenzene", "CH₃ gives electrons, the opposite of what an anion needs. No SNAr.")],
        reacts[0] if len(reacts) == 1 else None, "para",
        "SNAr needs an electron acceptor ortho or para to the leaving group, so the anion it forms has somewhere to put its charge.",
        prov("Rule 2: count o/p acceptors at each C-Cl carbon", sec),
        structure(S4("cb"), N4("cb"), "aryl chlorides + NaOCH₃"),
        tiles={k: nm(s, n) for k, (s, n) in {"para": C4["pcnb"], "meta": C4["mcnb"], "plain": C4["cb"], "methyl": C4["pct"]}.items()},
        concepts=SNAR_CONCEPTS)

    cands = {"meta": S4("mcnb"), "ortho": S4("ocnb"), "para": S4("pcnb"), "di": S4("cdnb")}
    inert = [k for k, s in cands.items() if not snar_sites(s)]
    mcq(node, "u4-snar-meta-out", "Three of these react with hydroxide by SNAr. Pick the one that does not.",
        [("meta", "1-Chloro-3-nitrobenzene", "The nitro group is meta to Cl, so it never meets the negative charge. It stays put."),
         ("ortho", "1-Chloro-2-nitrobenzene", "Ortho works: the carbon holding NO₂ is one of the carbons that carries the minus charge."),
         ("para", "1-Chloro-4-nitrobenzene", "Para works too: the minus charge reaches the carbon bonded to NO₂ and spreads onto its oxygens."),
         ("di", "1-Chloro-2,4-dinitrobenzene", "Two acceptors in the right places. This one reacts fastest of all.")],
        inert[0] if len(inert) == 1 else None, "meta",
        "Ortho and para acceptors activate; a meta one does not, because the charge never reaches its carbon.",
        prov("Rule 2: o/p acceptor count at each C-Cl carbon", sec),
        reagent("[OH-]", "NaOH"),
        tiles={k: nm(s, N4(k2)) for k, s, k2 in (("meta", cands["meta"], "mcnb"), ("ortho", cands["ortho"], "ocnb"), ("para", cands["para"], "pcnb"), ("di", cands["di"], "cdnb"))},
        concepts=SNAR_CONCEPTS)

    pfnb = S4("pfnb")
    opts = {"amine": "CN(C)c1ccc([N+](=O)[O-])cc1", "nitro": "CN(C)c1ccc(F)cc1", "none": pfnb}
    mcq(node, "u4-snar-amine", "Heat 1-fluoro-4-nitrobenzene with HN(CH₃)₂. Pick the product.",
        [("amine", "N,N-Dimethyl-4-nitroaniline", "The amine's lone pair adds at the C-F carbon, the para nitro group holds the charge, and fluoride leaves."),
         ("nitro", "4-Fluoro-N,N-dimethylaniline", "That swaps out the nitro group. The nitro group is the acceptor, not the leaving group."),
         ("none", "No reaction", "A neutral amine is a fine nucleophile here. The para nitro group is enough activation.")],
        key_in(opts, snar(pfnb, "[N](C)C")), "amine",
        "Amines do SNAr too: N bonds where F was, and the nitro group stays to stabilise the intermediate.",
        prov("Rule 2: C-F carbon has a para acceptor; F swapped for N(CH3)2", sec),
        structure(pfnb, N4("pfnb"), "1-fluoro-4-nitrobenzene + HN(CH₃)₂"),
        tiles={"amine": nm(opts["amine"], "N,N-dimethyl-4-nitroaniline"), "nitro": nm(opts["nitro"], "4-fluoro-N,N-dimethylaniline"),
               "none": nm(pfnb, N4("pfnb"))},
        concepts=SNAR_CONCEPTS)

    dcnb = S4("dcnb")
    opts = {"para": "COc1ccc([N+](=O)[O-])cc1Cl", "meta": "COc1cc([N+](=O)[O-])ccc1Cl", "both": "COc1ccc([N+](=O)[O-])cc1OC"}
    mcq(node, "u4-snar-two-cl", "One equivalent of NaOCH₃ meets 1,2-dichloro-4-nitrobenzene. Pick the product.",
        [("para", "The Cl para to NO₂ is replaced", "That Cl is para to the nitro group, so its addition intermediate can push the charge onto the nitro oxygens."),
         ("meta", "The Cl meta to NO₂ is replaced", "That Cl is meta to NO₂. Attack there never puts the charge on the nitro carbon, so it is not activated."),
         ("both", "Both Cl are replaced", "One equivalent of methoxide is enough for one swap, and only one Cl is activated anyway.")],
        key_in(opts, snar(dcnb, "[O]C")), "para",
        "Read each halogen's relation to the acceptor. Only the one ortho or para to NO₂ is replaced.",
        prov("Rule 2: o/p acceptor count at each C-Cl carbon, one equivalent", sec),
        structure(dcnb, N4("dcnb"), "1,2-dichloro-4-nitrobenzene + NaOCH₃"),
        tiles={"para": nm(opts["para"], "2-chloro-1-methoxy-4-nitrobenzene"), "meta": nm(opts["meta"], "1-chloro-2-methoxy-4-nitrobenzene"),
               "both": nm(opts["both"], "1,2-dimethoxy-4-nitrobenzene")},
        levels=[1, 2], concepts=SNAR_CONCEPTS)

    cands = {"cn": S4("pccn"), "ome": S4("pca"), "me": S4("pct"), "nh2": S4("pcan")}
    act = [k for k, s in cands.items() if snar_sites(s)]
    mcq(node, "u4-snar-acceptor", "Pick the para group that lets the C-Cl carbon react with NaOCH₃.",
        [("cn", "C≡N", "The nitrile's C≡N can take the ring's negative charge onto nitrogen, so it counts as an acceptor."),
         ("ome", "OCH₃", "Oxygen's lone pairs push electrons into the ring. That makes an added anion less stable, not more."),
         ("me", "CH₃", "An alkyl group gives a little electron density. It cannot hold a negative charge."),
         ("nh2", "NH₂", "Nitrogen's lone pair feeds the ring, the opposite of what SNAr needs.")],
        act[0] if len(act) == 1 else None, "cn",
        "An acceptor has a multiple bond to O or N on its first atom, so the charge can move onto that atom.",
        prov("Rule 1: acceptor test on the first atom of each para group", sec),
        structure(S4("cb"), N4("cb"), "4-X-chlorobenzene + NaOCH₃"),
        tiles={"cn": nm(cands["cn"], N4("pccn")), "ome": nm(cands["ome"], N4("pca")), "me": nm(cands["me"], N4("pct")), "nh2": nm(cands["nh2"], N4("pcan"))},
        concepts=SNAR_CONCEPTS)

    fdnb = S4("fdnb")
    opts = {"f": "CNc1ccc([N+](=O)[O-])cc1[N+](=O)[O-]", "nitro": "CNc1ccc(F)c([N+](=O)[O-])c1", "none": fdnb}
    mcq(node, "u4-snar-sanger", "1-Fluoro-2,4-dinitrobenzene meets CH₃NH₂. Pick the product.",
        [("f", "N-Methyl-2,4-dinitroaniline", "N adds at the C-F carbon, both nitro groups share the charge, and fluoride leaves. The amine ends up tagged with the ring."),
         ("nitro", "The para NO₂ swapped for NHCH₃", "The nitro groups are the acceptors. The leaving group is the halogen."),
         ("none", "No reaction", "Two acceptors ortho and para to F: this is one of the most reactive SNAr substrates there is.")],
        key_in(opts, snar(fdnb, "[NH]C")), "f",
        "With two o/p nitro groups, even a mild amine swaps out the fluorine.",
        prov("Rule 2: the C-F carbon has two o/p acceptors; F swapped for NHCH3", sec),
        structure(fdnb, N4("fdnb"), "1-fluoro-2,4-dinitrobenzene + CH₃NH₂"),
        tiles={"f": nm(opts["f"], "N-methyl-2,4-dinitroaniline"), "nitro": nm(opts["nitro"], "4-fluoro-N-methyl-3-nitroaniline"),
               "none": nm(fdnb, N4("fdnb"))},
        concepts=SNAR_CONCEPTS)

    pcnb = S4("pcnb")
    opts = {"ipso": "Oc1ccc([N+](=O)[O-])cc1", "cine": "Oc1cccc([N+](=O)[O-])c1", "nitro": "Oc1ccc(Cl)cc1"}
    mcq(node, "u4-snar-oh", "1-Chloro-4-nitrobenzene, NaOH at 130 °C, then H₃O⁺. Pick the product.",
        [("ipso", "4-Nitrophenol", "Hydroxide adds at the C-Cl carbon, the para nitro group holds the charge, chloride leaves. OH sits where Cl was."),
         ("cine", "3-Nitrophenol", "OH next door to where Cl was is the benzyne pattern. With a para acceptor, SNAr wins and the OH lands on the same carbon."),
         ("nitro", "4-Chlorophenol", "That replaces the nitro group. NO₂ is the acceptor, not the leaving group.")],
        key_in(opts, snar(pcnb, "[OH]")), "ipso",
        "SNAr keeps the substitution pattern: the new group takes the halogen's carbon.",
        prov("Rule 2: Cl carbon has a para acceptor; Cl swapped for OH. Conditions as given in OpenStax 16.6", sec),
        structure(pcnb, N4("pcnb"), "1-chloro-4-nitrobenzene + NaOH, then H₃O⁺"),
        tiles={"ipso": nm(opts["ipso"], "4-nitrophenol"), "cine": nm(opts["cine"], "3-nitrophenol"), "nitro": nm(opts["nitro"], "4-chlorophenol")},
        concepts=SNAR_CONCEPTS)


# ---------------------------------------------------------------------------
# u4-meisenheimer: the anion, walked
# ---------------------------------------------------------------------------

def node_meisenheimer() -> None:
    node = "u4-meisenheimer"
    sec = OS_SNAR
    pcnb = S4("pcnb")
    c, x = site(pcnb)
    info = charge_sites(pcnb, c, "[O]C")
    forms = [f for f, _, _ in info["forms"]]
    start = Chem.MolToSmiles(meisenheimer(pcnb, c, "[O]C"))
    # a wrong complex: methoxide added at the C-H carbon ortho to Cl
    j = ortho_h(pcnb, c)[0]
    wrong_ch = Chem.MolToSmiles(meisenheimer(pcnb, j, "[O]C"))
    product = snar(pcnb, "[O]C")[0]
    opts = {"right": start, "ch": wrong_ch, "prod": product}
    mcq(node, "u4-meis-meet", "Methoxide adds to 1-chloro-4-nitrobenzene. Pick the intermediate it forms.",
        [("right", "OCH₃ and Cl on one sp³ carbon", "Methoxide bonds to the carbon that holds Cl. For a moment that carbon has four groups and the ring carries a minus charge."),
         ("ch", "OCH₃ added at a C-H carbon", "Adding there would leave H to depart as hydride, which never leaves. The attack goes to the carbon with the halogen."),
         ("prod", "The finished product", "That is after chloride leaves. The intermediate comes first, with both OCH₃ and Cl still on the ring.")],
        key_in(opts, forms), "right",
        "The Meisenheimer complex has the nucleophile and the leaving group on one sp³ carbon, and a delocalised minus charge.",
        prov("Rule 4: OCH3 bonded to the C-Cl carbon, ring pi pair moved to its neighbour; the walk's forms", sec),
        structure(pcnb, N4("pcnb"), "1-chloro-4-nitrobenzene + ⁻OCH₃"),
        tiles={"right": named(start, "", "Meisenheimer complex A", check=False),
               "ch": named(wrong_ch, "", "Meisenheimer complex B", check=False),
               "prod": nm(product, "1-methoxy-4-nitrobenzene")},
        level=0, concepts=MEIS_CONCEPTS)

    rels = info["ring"]
    word = {frozenset({"ortho", "para"}): "op", frozenset({"meta"}): "meta", frozenset({"ipso"}): "ipso"}.get(frozenset(rels), "other")
    # Stands alone (audit 23 Oct, top-25 #24): tests shuffle the order, so "that complex" pointed at nothing.
    mcq(node, "u4-meis-sites", "Methoxide adds at C-Cl of 1-chloro-4-nitrobenzene. Pick where the ring's minus can sit.",
        [("op", "Ortho and para to the attacked carbon", "The pair moves across each C=C in turn: ortho, then para, then the other ortho. Every hop skips one carbon."),
         ("meta", "Meta to the attacked carbon", "The meta carbons sit between charged ones. The walk always jumps over them."),
         ("ipso", "On the attacked carbon itself", "That carbon is sp³, with four bonds and no lone pair. It cannot hold the charge.")],
        word, "op",
        "Like an arenium ion in reverse: the charge sits ortho and para to where the nucleophile added. That is why acceptors must be ortho or para.",
        prov(f"Rule 4 walk: {len(forms)} forms; ring carbons reached, by relation: {sorted(rels)}", sec),
        structure(start, "", "the complex from 1-chloro-4-nitrobenzene", check=False), concepts=MEIS_CONCEPTS)

    on_o = [f for f, a, mm in info["forms"] if mm.GetAtomWithIdx(a).GetSymbol() == "O"]
    on_c = [(f, a) for f, a, mm in info["forms"] if mm.GetAtomWithIdx(a).GetSymbol() == "C"]
    para_c = [f for f, a in on_c if a < mol(pcnb).GetNumAtoms() and relation(mol(pcnb), c, a) == "para"]
    ortho_c = [f for f, a in on_c if a < mol(pcnb).GetNumAtoms() and relation(mol(pcnb), c, a) == "ortho"]
    opts = {"o": on_o[0] if on_o else "C", "para": para_c[0] if para_c else "CC", "ortho": ortho_c[0] if ortho_c else "CCC"}
    mcq(node, "u4-meis-oxygen", "Pick the resonance form that puts the charge on a nitro oxygen.",
        [("o", "Form with C=N and two O⁻", "The pair on the para carbon pushes into the C-N bond, and the N=O pair moves onto oxygen. Oxygen holds a minus well."),
         ("para", "Form with C⁻ next to NO₂", "A real form, and the one that leads to the oxygen form. Here the charge is still on carbon."),
         ("ortho", "Form with C⁻ beside the sp³ carbon", "A real form too, but its charge sits on a ring carbon, two bonds from the carbon holding NO₂.")],
        key_eq(opts, on_o[0] if len(on_o) == 1 else None), "o",
        "The nitro group earns its place by taking the charge onto oxygen. That form is the exam drawing.",
        prov("Rule 4 walk: the one form whose moving pair lands on O", sec),
        structure(start, "", "Meisenheimer complex", check=False),
        tiles={"o": named(opts["o"], "", "Form 1", check=False), "para": named(opts["para"], "", "Form 2", check=False),
               "ortho": named(opts["ortho"], "", "Form 3", check=False)},
        levels=[1, 2], concepts=MEIS_CONCEPTS)

    mcnb = S4("mcnb")
    cm, _ = site(mcnb)
    meta_info = charge_sites(mcnb, cm, "[O]C")
    reaches = "no" if not meta_info["groups"] else "yes"
    mcq(node, "u4-meis-meta", "Methoxide adds at C-Cl of 1-chloro-3-nitrobenzene. Can the charge reach NO₂.",
        [("no", "No, it stays on ring carbons", "The charge visits only the carbons ortho and para to the attack. The nitro carbon is meta, so it is never charged."),
         ("yes", "Yes, onto a nitro oxygen", "That needs the minus on the carbon bonded to N first. From a meta position it never gets there."),
         ("n", "Only onto the nitrogen", "N in a nitro group already has a plus and four bonds. A pair can only end on oxygen, and here it does not even reach the group.")],
        reaches, "no",
        "A meta acceptor gives no oxygen form, so the anion is barely stabilised and the reaction does not go.",
        prov(f"Rule 4 walk on the meta isomer: ring relations reached {sorted(meta_info['ring'])}, groups reached {len(meta_info['groups'])}", sec),
        structure(mcnb, N4("mcnb"), "1-chloro-3-nitrobenzene + ⁻OCH₃"), concepts=MEIS_CONCEPTS)

    cplx = mol(start)
    sp3 = [a for a in cplx.GetAtoms() if a.IsInRing() and a.GetHybridization() == Chem.HybridizationType.SP3]
    which = None
    if len(sp3) == 1:
        nbs = {n.GetSymbol() for n in sp3[0].GetNeighbors()}
        which = "both" if {"Cl", "O"} <= nbs else "other"
    mcq(node, "u4-meis-sp3", "Pick the ring carbon that is sp³ in the Meisenheimer complex.",
        [("both", "The one holding Cl and OCH₃", "It gained a fourth bond to methoxide, so it is tetrahedral until chloride leaves."),
         ("nitro", "The one holding NO₂", "That carbon still has only three atoms attached, and its p orbital stays in the ring's π system that carries the charge. It stays sp²."),
         ("none", "None, the ring stays flat", "One carbon must take a fourth group for the nucleophile to add. The ring is not aromatic while it holds it.")],
        "both" if which == "both" else None, "both",
        "Addition makes one sp³ carbon carrying both the nucleophile and the leaving group.",
        prov("RDKit hybridisation of the complex's ring atoms", sec),
        structure(start, "", "the complex from 1-chloro-4-nitrobenzene", check=False), concepts=MEIS_CONCEPTS)

    arom = "not" if not any(a.GetIsAromatic() for a in cplx.GetAtoms()) else "yes"
    mcq(node, "u4-meis-aromatic", "Is the Meisenheimer complex aromatic. Pick the best answer.",
        [("not", "No, one ring carbon is sp³", "The sp³ carbon breaks the loop of p orbitals. Losing aromaticity is the cost the acceptor has to pay back."),
         ("yes", "Yes, it keeps six pi electrons", "Six electrons are there, but they cannot circle a ring that has a tetrahedral carbon in it."),
         ("anti", "Antiaromatic", "Antiaromatic needs a full ring of p orbitals with 4n electrons. The sp³ carbon rules out both labels.")],
        arom, "not",
        "Addition costs the ring its aromaticity, which is why a strong acceptor is needed to make it worth it.",
        prov("RDKit aromaticity perception on the complex", sec),
        structure(start, "", "the Meisenheimer complex", check=False), concepts=("resonance_delocalisation",))

    cdnb = S4("cdnb")
    cd, _ = site(cdnb)
    n_groups = len(charge_sites(cdnb, cd, "[O]C")["groups"])
    mcq(node, "u4-meis-dinitro", "Methoxide adds at C-Cl of 1-chloro-2,4-dinitrobenzene. Pick how many NO₂ take the charge.",
        [("two", "Both nitro groups", "One is ortho and one is para to the attacked carbon, and both of those carbons carry the charge in some form."),
         ("one", "Only the para nitro group", "Ortho counts too: the carbon next to the attacked one is the first to carry the charge."),
         ("zero", "Neither", "The charge reaches both nitro-bearing carbons, so each nitro group gets an oxygen form.")],
        {2: "two", 1: "one", 0: "zero"}.get(n_groups), "two",
        "Each o/p acceptor adds an oxygen form. Two of them is why this substrate reacts so easily.",
        prov(f"Rule 4 walk: nitro groups reached {n_groups}", sec),
        structure(cdnb, N4("cdnb"), "1-chloro-2,4-dinitrobenzene + ⁻OCH₃"), level=2, concepts=MEIS_CONCEPTS)


# ---------------------------------------------------------------------------
# u4-lg-order: F > Cl > Br > I
# ---------------------------------------------------------------------------

LG_CONVENTION = "the SNAr rate order F > Cl > Br > I (addition is rate determining); the Gasteiger charge on the C-X carbon is the computed proxy that orders it"


def node_lg_order() -> None:
    node = "u4-lg-order"
    sec = OS_SNAR
    series = {"f": "fdnb", "cl": "cdnb", "br": "bdnb", "i": "idnb"}
    charge = {k: ipso_charge(S4(v), site(S4(v))[0]) for k, v in series.items()}
    fastest = max(charge, key=charge.get)
    slowest = min(charge, key=charge.get)
    tiles = {k: nm(S4(v), N4(v)) for k, v in series.items()}
    mcq(node, "u4-lg-fastest", "These react with NaOCH₃ by SNAr. Pick the fastest.",
        [("f", "The fluoride", "F pulls hardest on its carbon, so methoxide adds fastest there. Breaking C-F comes later, in the fast step."),
         ("cl", "The chloride", "Chlorine pulls less than fluorine, so its carbon is less electron poor and addition is slower."),
         ("br", "The bromide", "Bromide is the better leaving group in SN2, but leaving is not the slow step here."),
         ("i", "The iodide", "Iodine pulls least, so its carbon is the least electron poor. This one is slowest.")],
        fastest, "f",
        "In SNAr the slow step is addition, so the most electronegative halogen wins: F > Cl > Br > I.",
        prov("Gasteiger charge on each C-X carbon: " + ", ".join(f"{k} {v:.3f}" for k, v in charge.items()), sec, LG_CONVENTION),
        structure(S4("cdnb"), N4("cdnb"), "1-X-2,4-dinitrobenzenes + NaOCH₃"), tiles=tiles,
        concepts=("ewg_edg_rubric",), convention=LG_CONVENTION)

    # Stands alone (top-25 #24) and its stem is the reagent, not the keyed iodide (top-25 #16).
    mcq(node, "u4-lg-slowest", "These 1-X-2,4-dinitrobenzenes react with NaOCH₃ by SNAr. Pick the slowest.",
        [("i", "The iodide", "Iodine is the least electronegative halogen, so the attacked carbon is least positive and addition is slowest."),
         ("f", "The fluoride", "Fluoride is the fastest: its carbon is the most electron poor, and addition is the slow step."),
         ("cl", "The chloride", "Chlorine sits second: slower than F, faster than Br and I."),
         ("br", "The bromide", "Close to iodide, but bromine still pulls a little harder.")],
        slowest, "i",
        "The SNAr order runs F > Cl > Br > I, the reverse of SN2.",
        prov("Gasteiger charge on each C-X carbon, lowest wins slowest", sec, LG_CONVENTION),
        reagent("C[O-]", "NaOCH₃"),
        tiles={k: tiles[k] for k in ("i", "f", "cl", "br")},
        concepts=("ewg_edg_rubric",), convention=LG_CONVENTION)

    why = "addition" if fastest == "f" else None
    mcq(node, "u4-lg-why", "Pick why the fluoride beats the iodide in SNAr.",
        [("addition", "Addition is slow, and F makes C1 most positive", "The rate is set by the nucleophile adding. F's pull makes that carbon the most electron poor, so addition is fastest."),
         ("bond", "The C-F bond breaks most easily", "C-F is the hardest C-X bond to break. It survives because breaking it happens in the fast second step."),
         ("sn2", "Fluoride is the best leaving group", "In SN2 fluoride is the worst. SNAr's order is reversed because leaving is not rate determining.")],
        why, "addition",
        "Leaving-group ability barely matters in SNAr: the slow step is addition, and F speeds that up.",
        prov("Gasteiger charge on C1 is highest for F; the reasoning is the taught one", sec, LG_CONVENTION),
        pair(nm(S4("fdnb"), N4("fdnb"), "X = F"), nm(S4("idnb"), N4("idnb"), "X = I")),
        concepts=("ewg_edg_rubric",), convention=LG_CONVENTION)

    cfdnb = S4("cfdnb")
    opts = {"f": "COc1cc(Cl)c([N+](=O)[O-])cc1[N+](=O)[O-]", "cl": "COc1cc(F)c([N+](=O)[O-])cc1[N+](=O)[O-]",
            "both": "COc1cc(OC)c([N+](=O)[O-])cc1[N+](=O)[O-]"}
    mcq(node, "u4-lg-mixed", "One equivalent of NaOCH₃ meets this ring. Pick the product.",
        [("f", "F is replaced", "Both halogens have one ortho and one para nitro group. With activation tied, the C-F carbon adds methoxide faster."),
         ("cl", "Cl is replaced", "Chloride leaves better in SN2, but here the faster addition decides, and that is at the C-F carbon."),
         ("both", "Both are replaced", "One equivalent of methoxide makes one swap.")],
        key_in(opts, snar(cfdnb, "[O]C")), "f",
        "Equal activation, so the halogen order decides: F goes first.",
        prov("Rule 2: both halogens have two o/p acceptors; tie broken by Gasteiger charge", sec, LG_CONVENTION),
        structure(cfdnb, N4("cfdnb")),
        tiles={"f": nm(opts["f"], "1-chloro-5-methoxy-2,4-dinitrobenzene"), "cl": nm(opts["cl"], "1-fluoro-5-methoxy-2,4-dinitrobenzene"),
               "both": nm(opts["both"], "1,5-dimethoxy-2,4-dinitrobenzene")},
        level=2, concepts=("ewg_edg_rubric",), convention=LG_CONVENTION)

    qf = ipso_charge(S4("pfnb"), site(S4("pfnb"))[0])
    qi = ipso_charge(S4("pinb"), site(S4("pinb"))[0])
    mcq(node, "u4-lg-pair", "Both have a para nitro group. Pick the one that reacts faster with NaOCH₃.",
        [("f", "1-Fluoro-4-nitrobenzene", "Same activation, so the halogen decides. F makes the attacked carbon most electron poor."),
         ("i", "1-Iodo-4-nitrobenzene", "Iodide leaves easily, but leaving is the fast step. Iodine helps the slow addition least."),
         ("same", "They react at the same rate", "The acceptor is the same, but the halogen still changes how electron poor the attacked carbon is.")],
        "f" if qf > qi else "i", "f",
        "Hold the acceptors constant and F beats I in SNAr.",
        prov(f"Gasteiger charge on C-X: F {qf:.3f}, I {qi:.3f}", sec, LG_CONVENTION),
        pair(nm(S4("pfnb"), N4("pfnb"), "A"), nm(S4("pinb"), N4("pinb"), "B")),
        concepts=("ewg_edg_rubric",), convention=LG_CONVENTION)

    # Halogens swapped (audit 23 Oct, close behind): when the activated halogen was F, "F is fastest"
    # got it right without reading activation. Now the activated one is Br and F sits meta to NO₂.
    bfnb = S4("bfnb")
    opts = {"br": "COc1ccc(F)cc1[N+](=O)[O-]", "f": "COc1ccc(Br)c([N+](=O)[O-])c1", "none": bfnb}
    mcq(node, "u4-lg-bromo-fluoro", "1-Bromo-4-fluoro-2-nitrobenzene meets NaOCH₃. Pick the product.",
        [("br", "Br is replaced", "Br is ortho to NO₂, so its carbon is activated. F is meta to NO₂ and is not."),
         ("f", "F is replaced", "F is the faster SNAr halogen only when both are activated. This F is meta to NO₂, so addition there gets no help."),
         ("none", "No reaction", "The C-Br carbon has an ortho nitro group. That is enough activation.")],
        key_in(opts, snar(bfnb, "[O]C")), "br",
        "Activation first, halogen second: only the halogen ortho or para to the acceptor reacts.",
        prov("Rule 2: only the C-Br carbon has an o/p acceptor", sec),
        structure(bfnb, N4("bfnb")),
        tiles={"br": nm(opts["br"], "4-fluoro-1-methoxy-2-nitrobenzene"), "f": nm(opts["f"], "1-bromo-4-methoxy-2-nitrobenzene"),
               "none": nm(bfnb, N4("bfnb"))},
        concepts=("ewg_edg_rubric",))


# ---------------------------------------------------------------------------
# u4-benzyne: elimination-addition
# ---------------------------------------------------------------------------

def node_benzyne() -> None:
    node = "u4-benzyne"
    sec = OS_BZ
    cb = S4("cb")
    opts = {"aniline": "Nc1ccccc1", "ortho": "Nc1ccccc1Cl", "none": cb}
    mcq(node, "u4-bz-meet", "Chlorobenzene with NaNH₂ in NH₃(l). Pick the product.",
        [("aniline", "Aniline", "NH₂⁻ pulls an ortho H, chloride leaves to give benzyne, then NH₂⁻ adds and the ring picks up H."),
         ("ortho", "2-Chloroaniline", "Cl does not stay. It leaves as the aryne forms, and only one NH₂ is added."),
         ("none", "No reaction", "No acceptor means no SNAr, but amide is a strong enough base to make benzyne.")],
        key_in(opts, outcome(cb, "NaNH2")), "aniline",
        "Without an acceptor, a very strong base goes the benzyne way: eliminate HCl, then add NH₂⁻ and H.",
        prov("Rule 3: aryne from the one ortho C-H, NH2 to either end; both ends give aniline", sec),
        structure(cb, N4("cb"), "chlorobenzene + NaNH₂, NH₃"),
        tiles={"aniline": nm(opts["aniline"], "aniline"), "ortho": nm(opts["ortho"], "2-chloroaniline"), "none": nm(cb, N4("cb"))},
        level=0, concepts=BZ_CONCEPTS)

    pct = S4("pct")
    c, x = site(pct)
    hs = ortho_h(pct, c)
    arynes = {canon(aryne(pct, c, x, j)) for j in hs}
    mct = S4("mct")
    cm, xm = site(mct)
    other = sorted({canon(aryne(mct, cm, xm, j)) for j in ortho_h(mct, cm)} - arynes)
    opts = {"right": sorted(arynes)[0], "wrong": other[0], "plain": canon("c1ccc#cc1")}
    mcq(node, "u4-bz-aryne", "1-Chloro-4-methylbenzene meets NaNH₂. Pick the aryne it forms.",
        [("right", "Triple bond meta and para to CH₃", "The H removed is ortho to Cl, which is meta to CH₃. The new pi bond joins that carbon and the old C-Cl carbon."),
         ("wrong", "Triple bond ortho and meta to CH₃", "That aryne comes from 3-chlorotoluene. Here Cl is para to CH₃, so the triple bond must include the para carbon."),
         ("plain", "Benzyne with no CH₃", "The methyl is a bystander. Only H and Cl leave.")],
        key_in(opts, list(arynes)) if len(arynes) == 1 else None, "right",
        "The aryne's two carbons are the old C-Cl carbon and the ortho carbon that lost its H.",
        prov(f"Rule 3: {len(arynes)} distinct aryne(s) from the ortho C-H set", sec),
        structure(pct, N4("pct"), "1-chloro-4-methylbenzene + NaNH₂"),
        tiles={"right": named(opts["right"], "2-methylcyclohexa-1,3-dien-5-yne", "aryne A"),
               "wrong": named(opts["wrong"], "1-methylcyclohexa-1,3-dien-5-yne", "aryne B"),
               "plain": named(opts["plain"], "cyclohexa-1,3-dien-5-yne", "aryne C")},
        levels=[1, 2], concepts=BZ_CONCEPTS)  # rung 1 too, and authored before u4-bz-pct, so the aryne is found before the mixture (top-25 #17)

    T = {"o": "Cc1ccccc1N", "m": "Cc1cccc(N)c1", "p": "Cc1ccc(N)cc1"}
    sets = {"mp": [T["m"], T["p"]], "p": [T["p"]], "m": [T["m"]], "op": [T["o"], T["p"]]}
    mcq(node, "u4-bz-pct", "1-Chloro-4-methylbenzene with NaNH₂, NH₃. Pick what forms.",
        [("mp", "3- and 4-methylaniline", "NH₂⁻ can add to either end of the aryne: at the old C-Cl carbon (para to CH₃) or next to it (meta)."),
         ("p", "Only 4-methylaniline", "That is what SNAr would give. Benzyne's two ends are both open to the nucleophile."),
         ("m", "Only 3-methylaniline", "Half right: addition at the other end of the aryne puts NH₂ where Cl was, para to CH₃."),
         ("op", "2- and 4-methylaniline", "The aryne never reaches the carbon ortho to CH₃, because Cl started para to it.")],
        key_set(sets, outcome(pct, "NaNH2")), "mp",
        "Benzyne gives a mixture: the new group lands on either carbon of the triple bond.",
        prov("Rule 3: aryne between C-Cl and its ortho carbon; NH2 to either end", sec),
        structure(pct, N4("pct"), "1-chloro-4-methylbenzene + NaNH₂"),
        tiles=None, concepts=BZ_CONCEPTS)

    oct_ = S4("oct")
    sets = {"om": [T["o"], T["m"]], "o": [T["o"]], "mp": [T["m"], T["p"]]}
    mcq(node, "u4-bz-oct", "1-Chloro-2-methylbenzene with NaNH₂, NH₃. Pick what forms.",
        [("om", "2- and 3-methylaniline", "Only one carbon beside C-Cl has an H. The aryne spans those two, and NH₂ adds to either end."),
         ("o", "Only 2-methylaniline", "That is the direct swap. The aryne's other end gives the meta product as well."),
         ("mp", "3- and 4-methylaniline", "That pattern starts from the para chloride. Here Cl is ortho to CH₃.")],
        key_set(sets, outcome(oct_, "NaNH2")), "om",
        "Find the ortho C-H, draw the aryne, and add NH₂ to each end.",
        prov("Rule 3: one ortho C-H (the other ortho carbon bears CH3)", sec),
        structure(oct_, N4("oct"), "1-chloro-2-methylbenzene + NaNH₂"), concepts=BZ_CONCEPTS)

    n = len(outcome(mct, "NaNH2"))
    mcq(node, "u4-bz-mct-count", "1-Chloro-3-methylbenzene with NaNH₂. Pick how many anilines form.",
        [("three", "Three", "Both carbons beside C-Cl carry an H, so two arynes form. Between them NH₂ reaches the ortho, meta and para spots."),
         ("two", "Two", "Two products come from one aryne. Here there are two different ortho C-H, so two arynes."),
         ("one", "One", "One product would need the nucleophile to land only where Cl was. That is SNAr, not benzyne.")],
        {3: "three", 2: "two", 1: "one"}.get(n), "three",
        "Count the ortho C-H, draw each aryne, then add to both ends of each.",
        prov(f"Rule 3: {len(ortho_h(mct, cm))} ortho C-H, distinct products {n}", sec),
        structure(mct, N4("mct"), "1-chloro-3-methylbenzene + NaNH₂"), level=2, concepts=BZ_CONCEPTS)

    bx = S4("bxyl")
    got = outcome(bx, "NaNH2")
    opts = {"none": [], "ipso": ["Cc1cccc(C)c1N"], "cine": ["Cc1ccc(N)c(C)c1"]}
    mcq(node, "u4-bz-no-h", "2-Bromo-1,3-dimethylbenzene with NaNH₂. Pick what happens.",
        [("none", "No aryne forms", "Both carbons beside C-Br carry CH₃, not H. With no ortho H to remove, elimination cannot start."),
         ("ipso", "2,6-Dimethylaniline forms", "That would need a direct swap at C-Br. With no acceptor, there is no SNAr route either."),
         ("cine", "2,4-Dimethylaniline forms", "That needs an aryne first, and an aryne needs an H next to the bromine.")],
        key_set(opts, got), "none",
        "Benzyne needs an H ortho to the halogen. Block both ortho spots and the reaction stops.",
        prov("Rule 3: ortho C-H set is empty", sec),
        structure(bx, N4("bxyl"), "2-bromo-1,3-dimethylbenzene + NaNH₂"), concepts=BZ_CONCEPTS)

    opts = {"none": [], "anisole": ["COc1ccccc1"], "mix": ["COc1ccccc1", "COc1ccccc1"]}
    mcq(node, "u4-bz-vs-snar", "Chlorobenzene with NaOCH₃ in methanol, mild heat. Pick what happens.",
        [("none", "No reaction", "No acceptor for SNAr, and methoxide is far too weak a base to pull a ring H and make benzyne."),
         ("anisole", "Anisole forms", "A direct swap needs an acceptor ortho or para to Cl. Chlorobenzene has none."),
         ("phenol", "Phenol forms", "No hydroxide or water attacks here, and the ring would need activation anyway.")],
        "none" if not outcome(cb, "NaOCH3") else None, "none",
        "Plain aryl halides sit untouched under SN2-style conditions. They need an acceptor (SNAr) or a very strong base (benzyne).",
        prov("Rules 2 and 3: no o/p acceptor; methoxide is not counted as a benzyne base", sec,
             "methoxide under mild conditions does not make benzyne"),
        structure(cb, N4("cb"), "chlorobenzene + NaOCH₃, CH₃OH"), concepts=BZ_CONCEPTS,
        convention="methoxide under mild conditions does not make benzyne")


# ---------------------------------------------------------------------------
# u4-isotope: the 14C proof
# ---------------------------------------------------------------------------

ISO_CONVENTION = "the 14C label does not change which end of the aryne the nucleophile adds to (isotope effect neglected), so symmetry-equivalent ends split 50:50"


def node_isotope() -> None:
    node = "u4-isotope"
    sec = OS_BZ
    lab1 = "Cl[14c]1ccccc1"
    prods = benzyne_products(lab1, "[NH2]")
    rels = sorted({label_relation(p) for p in prods})
    word = {("ipso", "ortho"): "two", ("ipso",): "ipso"}.get(tuple(rels), "other")
    vis = structure(lab1, "", "chlorobenzene, circled C is ¹⁴C", check=False, marks=[labelled_atom(lab1)])
    mcq(node, "u4-iso-meet", "This chlorobenzene meets NaNH₂. Pick where the ¹⁴C ends up.",
        [("two", "On C-NH₂ and the carbon beside it", "The aryne joins the labelled carbon to its neighbour. NH₂⁻ adds to either end, so the label lands on C-N or next to it."),
         ("ipso", "Only on the C-NH₂ carbon", "That is what a direct swap would give. The aryne has two ends, so the label can end up on either."),
         ("all", "Spread over all six carbons", "Only two carbons form the triple bond, so the label can only end up in two places.")],
        word, "two",
        "Half the aniline has the label on C-N, half next to it: the signature of a symmetric intermediate.",
        prov(f"Rule 3 with isotopes kept: label relations to C-N {rels}", sec),
        vis, level=0, concepts=BZ_CONCEPTS)

    plain = "Clc1ccccc1"
    c0, x0 = site(plain)
    m_ary = mol(aryne(plain, c0, x0, ortho_h(plain, c0)[0]))
    ranks = list(Chem.CanonicalRankAtoms(m_ary, breakTies=False))
    trip = [b for b in m_ary.GetBonds() if b.GetBondType() == Chem.BondType.TRIPLE]
    sym = len(trip) == 1 and ranks[trip[0].GetBeginAtomIdx()] == ranks[trip[0].GetEndAtomIdx()]
    # Stands alone (top-25 #24): "those two carbons" pointed back at the previous screen.
    mcq(node, "u4-iso-ratio", "Labelled chlorobenzene and NaNH₂ put ¹⁴C on C-N or beside it. Pick how it splits.",
        [("half", "About half and half", "Without the label the two aryne carbons are identical, so NH₂⁻ adds to each equally often."),
         ("ipso", "Nearly all on the C-NH₂ carbon", "That would mean the nucleophile prefers the old C-Cl end. The aryne's ends are equivalent."),
         ("ortho", "Nearly all beside C-NH₂", "Nothing favours the unlabelled end either. Equal ends give equal amounts.")],
        "half" if sym else None, "half",
        "The two ends of benzyne are the same, so the label splits 50:50 between C1 and C2.",
        prov("RDKit canonical ranks: the two triple-bond carbons of unlabelled benzyne are equivalent", sec, ISO_CONVENTION),
        vis, concepts=BZ_CONCEPTS, convention=ISO_CONVENTION)

    c, x = site(lab1)
    direct = substitute(lab1, c, x, "[NH2]")
    pred = label_relation(direct)
    mcq(node, "u4-iso-direct", "Suppose NH₂⁻ simply swapped for Cl in one step. Pick where the label would be.",
        [("ipso", "Only on the C-NH₂ carbon", "A direct swap keeps every carbon in place, so NH₂ bonds to the labelled carbon, every time."),
         ("ortho", "Only beside the C-NH₂ carbon", "That needs NH₂ to land on a different carbon from the one Cl left."),
         ("two", "Split between C-NH₂ and its neighbour", "That split is what the aryne route predicts, and a one-step swap cannot produce it.")],
        pred, "ipso",
        "A one-step swap predicts one labelled product. Seeing two rules it out.",
        prov("Rule 2 style ipso swap on the labelled ring, label relation read back", sec),
        vis, concepts=BZ_CONCEPTS)

    cine_p = [p for p in prods if label_relation(p) == "ortho"][0]
    para_p = canon("Nc1cc[14cH]cc1")
    opts = {"cine": cine_p, "ipso": canon(direct), "para": para_p}
    mcq(node, "u4-iso-tiles", "Pick the product with NH₂ on a carbon that never held Cl.",
        [("cine", "NH₂ beside the circled ¹⁴C", "NH₂⁻ added to the unlabelled end of the aryne, so N sits next to the labelled carbon."),
         ("ipso", "NH₂ on the circled ¹⁴C", "That carbon held the Cl. This is the other half of the mixture."),
         ("para", "NH₂ para to the circled ¹⁴C", "The aryne only involves the labelled carbon and its neighbour. Para is out of reach.")],
        key_eq(opts, cine_p), "cine",
        "The cine product puts the nucleophile one carbon over from where the halogen was.",
        prov("Rule 3 with isotopes: the product whose label is ortho to C-N", sec),
        vis,
        tiles={k: named(v, "", f"product {i}", check=False, marks=[labelled_atom(v)]) for i, (k, v) in enumerate(opts.items(), start=1)},
        level=2, concepts=BZ_CONCEPTS)

    lab2 = "Clc1[14cH]cccc1"
    n2 = len(benzyne_products(lab2, "[NH2]"))
    mcq(node, "u4-iso-c2", "Now the ¹⁴C starts beside C-Cl. Pick how many labelled anilines can form.",
        [("three", "Three", "Either ortho H can go. One aryne includes the label (label on C-N or ortho); the other does not (label ortho or meta)."),
         ("two", "Two", "That counts one aryne. Both ortho carbons carry an H, and they now differ."),
         ("one", "One", "Every aryne gives two ends, so one product is impossible.")],
        {3: "three", 2: "two", 1: "one"}.get(n2), "three",
        "Moving the label breaks the ring's symmetry, so the two arynes now give different labelled products.",
        prov(f"Rule 3 with isotopes on the C2 label: {n2} distinct products", sec),
        structure(lab2, "", "circled C is ¹⁴C", check=False, marks=[labelled_atom(lab2)]), level=2, concepts=BZ_CONCEPTS)

    ruled = "direct" if len(prods) == 2 and pred == "ipso" else None
    mcq(node, "u4-iso-proves", "Suppose the label turns up split between two carbons. Pick what that rules out.",
        [("direct", "A one-step swap at C-Cl", "A direct swap gives only label on C-N. Label next door would mean some other path ran."),
         ("sym", "A symmetric intermediate", "The split is the evidence FOR a symmetric intermediate, benzyne."),
         ("nh2", "NH₂⁻ acting as a nucleophile", "NH₂⁻ still ends up on the ring. It acts as base first, then nucleophile.")],
        ruled, "direct",
        "Two labelled products from one labelled start would point to benzyne, not to a direct substitution.",
        prov("compares the Rule 3 product set (two) with the ipso prediction (one)", sec),
        vis, concepts=BZ_CONCEPTS)


# ---------------------------------------------------------------------------
# u4-dow: hot NaOH
# ---------------------------------------------------------------------------

DOW = "NaOH, H₂O, 340 °C, 170 atm; then H₃O⁺"


def node_dow() -> None:
    node = "u4-dow"
    sec = OS_BZ
    conv = "the Dow process is taught through benzyne (OpenStax 16.7 does); hydroxide counted as a benzyne base at these temperatures"
    cb = S4("cb")
    opts = {"phenol": "Oc1ccccc1", "chloro": "Oc1ccccc1Cl", "cy": "OC1CCCCC1"}
    mcq(node, "u4-dow-meet", "Chlorobenzene, hot NaOH under pressure, then acid. Pick the product.",
        [("phenol", "Phenol", "Hydroxide pulls an H beside C-Cl, chloride leaves to make benzyne, then OH⁻ adds."),
         ("chloro", "2-Chlorophenol", "Cl leaves; it does not stay beside the new OH."),
         ("cy", "Cyclohexanol", "Nothing reduces the ring. It stays aromatic.")],
        key_in(opts, outcome(cb, "NaOH")), "phenol",
        "The Dow process: chlorobenzene and hot NaOH give phenol after acid workup.",
        prov("Rule 3 with OH as the nucleophile; conditions as given in OpenStax 16.7", sec, conv),
        structure(cb, N4("cb"), "chlorobenzene + " + DOW),
        tiles={"phenol": nm(opts["phenol"], "phenol"), "chloro": nm(opts["chloro"], "2-chlorophenol"), "cy": nm(opts["cy"], "cyclohexanol")},
        level=0, concepts=BZ_CONCEPTS, convention=conv)

    P = {"o": "Cc1ccccc1O", "m": "Cc1cccc(O)c1", "p": "Cc1ccc(O)cc1"}
    pbt = S4("pbt")
    sets = {"mp": [P["m"], P["p"]], "p": [P["p"]], "op": [P["o"], P["p"]]}
    mcq(node, "u4-dow-pbt", "1-Bromo-4-methylbenzene with hot NaOH. Pick what forms.",
        [("mp", "3- and 4-methylphenol", "A mixture is the clue: the aryne spans the old C-Br carbon and its neighbour, and OH⁻ adds to either end."),
         ("p", "Only 4-methylphenol", "A clean swap would need an acceptor on the ring. Without one, the aryne route gives two products."),
         ("op", "2- and 4-methylphenol", "OH can only land on the two aryne carbons, para and meta to CH₃.")],
        key_set(sets, outcome(pbt, "NaOH")), "mp",
        "Hot hydroxide on an unactivated aryl halide goes through benzyne, so two isomers form.",
        prov("Rule 3 with OH: aryne between C-Br and its ortho carbon; OH to either end gives two distinct products", sec, conv),
        structure(pbt, N4("pbt"), "1-bromo-4-methylbenzene + " + DOW), concepts=BZ_CONCEPTS, convention=conv)

    obt = S4("obt")
    sets = {"om": [P["o"], P["m"]], "o": [P["o"]], "mp": [P["m"], P["p"]]}
    mcq(node, "u4-dow-obt", "1-Bromo-2-methylbenzene with hot NaOH, then acid. Pick what forms.",
        [("om", "2- and 3-methylphenol", "Only the carbon on the far side from CH₃ has an H next to C-Br. The aryne spans those two carbons."),
         ("o", "Only 2-methylphenol", "The aryne has two ends, so the meta isomer forms as well."),
         ("mp", "3- and 4-methylphenol", "That pattern belongs to the para bromide.")],
        key_set(sets, outcome(obt, "NaOH")), "om",
        "Same benzyne logic as with NaNH₂: find the ortho H, draw the aryne, add to both ends.",
        prov("Rule 3 with OH on the ortho bromide", sec, conv),
        structure(obt, N4("obt"), "1-bromo-2-methylbenzene + " + DOW), concepts=BZ_CONCEPTS, convention=conv)

    cands = {"pcnb": S4("pcnb"), "pbt": pbt, "mct": S4("mct")}
    single = [k for k, s in cands.items() if len(outcome(s, "NaOH")) == 1]
    mcq(node, "u4-dow-single", "With hot NaOH, which gives ONE phenol, not a mixture. Pick it.",
        [("pcnb", "1-Chloro-4-nitrobenzene", "The para nitro group opens the SNAr path, which keeps OH on the old C-Cl carbon: one product."),
         ("pbt", "1-Bromo-4-methylbenzene", "No acceptor, so benzyne: two methylphenols."),
         ("mct", "1-Chloro-3-methylbenzene", "Two different ortho H, two arynes, three methylphenols.")],
        single[0] if len(single) == 1 else None, "pcnb",
        "An acceptor switches the mechanism to SNAr, and SNAr gives one product.",
        prov("Rule 2 where an o/p acceptor exists, else Rule 3; count products", sec, conv),
        reagent("[OH-]", "hot NaOH"),
        tiles={"pcnb": nm(S4("pcnb"), N4("pcnb")), "pbt": nm(pbt, N4("pbt")), "mct": nm(S4("mct"), N4("mct"))},
        level=2, concepts=BZ_CONCEPTS, convention=conv)

    n = len(outcome(S4("mct"), "NaOH"))
    mcq(node, "u4-dow-mct", "1-Chloro-3-methylbenzene with hot NaOH. Pick how many methylphenols form.",
        [("three", "Three", "Both carbons beside C-Cl have an H, so two arynes form; together they reach ortho, meta and para to CH₃."),
         ("two", "Two", "That is one aryne's worth. There are two ortho H here, and they are different."),
         ("one", "One", "One product needs a direct swap, which needs an acceptor this ring lacks.")],
        {3: "three", 2: "two", 1: "one"}.get(n), "three",
        "Two arynes, two ends each, three distinct phenols once duplicates are merged.",
        prov(f"Rule 3 with OH: {n} distinct products", sec, conv),
        structure(S4("mct"), N4("mct"), "1-chloro-3-methylbenzene + " + DOW), level=2, concepts=BZ_CONCEPTS, convention=conv)

    # Atom balance read off RDKit formulas: ArCl + NaOH -> ArOH + ?
    from collections import Counter

    def atoms(f: str) -> Counter:
        return Counter({el: int(n or 1) for el, n in re.findall(r"([A-Z][a-z]?)(\d*)", f)})

    left = atoms(formula(cb)) + Counter({"Na": 1, "O": 1, "H": 1})
    rest = left - atoms(formula("Oc1ccccc1"))
    salt = "NaCl" if rest == Counter({"Na": 1, "Cl": 1}) else None
    mcq(node, "u4-dow-salt", "Chlorobenzene plus NaOH gives phenol and one salt. Pick the salt.",
        [("NaCl", "NaCl", "Cl leaves as chloride and pairs with the sodium from NaOH. Count atoms: everything else is in phenol."),
         ("NaOCl", "NaOCl", "That would keep an oxygen off the ring. The OH goes onto the ring, so no O is left over."),
         ("HCl", "HCl", "In strong base any HCl is neutralised at once. The leftover atoms are Na and Cl.")],
        salt, "NaCl",
        "Balance it: C₆H₅Cl + NaOH gives C₆H₅OH + NaCl.",
        prov(f"atom balance from RDKit formulas: leftover {dict(rest)}", sec),
        pair(nm(cb, N4("cb"), "chlorobenzene"), nm("Oc1ccccc1", "phenol", "product")), concepts=BZ_CONCEPTS)


# ---------------------------------------------------------------------------
# u4-exam: ladders and a board for the checkpoint. The activation ladder and the
# route board play in u4-snar and u4-benzyne since 23 Oct (top-25 #14); the
# halogen ladder stays unwired, because it grades Cl strictly above Br on a
# Gasteiger gap the audit doubts (an owner call)
# ---------------------------------------------------------------------------

def exam_items() -> None:
    sec = OS_SNAR
    cards = [
        ("f", "F", S4("fdnb"), N4("fdnb"), "Most electronegative: the attacked carbon is most electron poor, so addition is fastest."),
        ("cl", "Cl", S4("cdnb"), N4("cdnb"), "Less pull than F, more than Br."),
        ("br", "Br", S4("bdnb"), N4("bdnb"), "Weak pull: slow addition, even though Br leaves well."),
        ("i", "I", S4("idnb"), N4("idnb"), "Least pull, slowest addition. Its good leaving ability does not help."),
    ]
    ladder("u4-exam", "u4-lg-ladder", cards, lambda s: -ipso_charge(s, site(s)[0]),
           "Rank by SNAr rate with NaOCH₃, fastest first.",
           "Each is 1-X-2,4-dinitrobenzene. Only X changes.",
           "ring_activation", ("Fastest", "Slowest"),
           "Rank the 1-halo-2,4-dinitrobenzenes (F, Cl, Br, I) by rate of SNAr with methoxide, fastest first.",
           ("F, Cl, Br, I.", "Addition is the slow step, and the more electronegative halogen makes its carbon more electron poor.",
            "Look at how hard each halogen pulls on the carbon the nucleophile attacks."),
           [("reversed", ["i", "br", "cl", "f"], "ordering_is_reversed",
             ("The SN2 leaving-group order.", "In SNAr the C-X bond breaks in the fast step, so leaving ability does not set the rate.", "Put F first.")),
            ("cl-up", ["cl", "f", "br", "i"], "ordering_one_adjacent_pair_swapped",
             ("Cl is placed above F.", "Fluorine pulls hardest, so its carbon adds the nucleophile fastest.", "Compare F and Cl by electronegativity."))],
           "SNAr rate follows halogen electronegativity: F > Cl > Br > I.",
           prov("Gasteiger charge on each C-X carbon orders the ladder", sec, LG_CONVENTION),
           ("ewg_edg_rubric",), "nucleophilic_aromatic_substitution")

    cards = [
        ("tri", "three NO₂", S4("ctnb"), N4("ctnb"), "Two ortho and one para nitro group: three oxygen forms for the anion."),
        ("di", "two NO₂", S4("cdnb"), N4("cdnb"), "One ortho, one para: two oxygen forms."),
        ("mono", "one NO₂", S4("pcnb"), N4("pcnb"), "One para nitro group: one oxygen form."),
        ("none", "no NO₂", S4("cb"), N4("cb"), "Nothing to take the charge. No SNAr under these conditions."),
    ]
    # Wired into u4-snar's lesson, where it fills the order slot (audit 23 Oct, top-25 #14).
    ladder("u4-snar", "u4-act-ladder", cards, lambda s: -op_acceptors(s, site(s)[0]),
           "Rank by SNAr rate with hydroxide, fastest first.",
           "Count the nitro groups ortho or para to Cl.",
           "ring_activation", ("Fastest", "Slowest"),
           "Rank chloro-trinitro, chloro-dinitro, chloro-nitro benzene and chlorobenzene by SNAr rate, fastest first.",
           ("Trinitro, dinitro, nitro, chlorobenzene.", "Each o/p nitro group gives the Meisenheimer complex one more place to hold the charge.",
            "Count the nitro groups ortho or para to the C-Cl carbon."),
           [("reversed", ["none", "mono", "di", "tri"], "ordering_is_reversed",
             ("The right ladder read from the slow end.", "More acceptors make the anion more stable and the reaction faster.", "Put the most nitrated ring first.")),
            ("di-up", ["di", "tri", "mono", "none"], "ordering_one_adjacent_pair_swapped",
             ("Dinitro is placed above trinitro.", "The third nitro group adds another oxygen form.", "Count o/p nitro groups on each."))],
           "Each ortho or para acceptor speeds SNAr.",
           prov("Rule 2: o/p acceptor count at the C-Cl carbon orders the ladder", sec, "rate rises with the count of o/p acceptors"),
           ("ewg_edg_rubric", "resonance_delocalisation"), "nucleophilic_aromatic_substitution")

    def describe(smi: str, reagent: str) -> str:
        got = outcome(smi, reagent)
        if snar_sites(smi):
            return "SNAr, one product"
        if not got:
            return "no reaction"
        return "benzyne, one product" if len(got) == 1 else f"benzyne, {len(got)} products"

    pairs = [
        ("snar", "1-chloro-4-nitrobenzene + NaOCH₃", "SNAr, one product", "The para nitro group activates the C-Cl carbon; methoxide swaps in there.", describe(S4("pcnb"), "NaOCH3")),
        ("bz2", "4-chlorotoluene + NaNH₂", "benzyne, 2 products", "No acceptor; amide makes the aryne, and NH₂ adds to either end.", describe(S4("pct"), "NaNH2")),
        ("bz1", "chlorobenzene + NaNH₂", "benzyne, one product", "The aryne's two ends are equivalent, so both give aniline.", describe(S4("cb"), "NaNH2")),
        ("none", "2-bromo-m-xylene + NaNH₂", "no reaction", "No H beside C-Br, so no aryne, and no acceptor for SNAr.", describe(S4("bxyl"), "NaNH2")),
    ]
    # Wired into u4-benzyne's lesson, where it fills the connect slot (top-25 #14): the one item that asks SNAr vs benzyne vs nothing.
    match("u4-benzyne", "u4-exam-match-route", "Match each reaction to its route and result.",
          "Look for an o/p acceptor first, then for an H beside the halogen.", pairs,
          "Acceptor present: SNAr. No acceptor, strong base, ortho H: benzyne. Neither: nothing.",
          prov("Rules 2 and 3 applied to each pair", OS_BZ), ("ewg_edg_rubric", "carbanion_stability"))


def build() -> None:
    node_snar()
    node_meisenheimer()
    node_lg_order()
    node_benzyne()
    node_isotope()
    node_dow()
    exam_items()
    check_names()
    for node, entries in POOLS.items():
        if node != "u4-exam" and not 6 <= len(entries) <= 12:
            fail(f"{node}: {len(entries)} items, outside 6 to 12")
    for slot in range(4):
        share = CORRECT_INDEX.count(slot) / max(1, len(CORRECT_INDEX))
        if share > 0.6:
            fail(f"{share:.0%} of MCQs put the answer in slot {slot}")


HEADER = '''/**
 * Unit 4 (nucleophilic aromatic substitution and benzyne) problem pools, a DRAFT.
 * GENERATED by scripts/u4_pools.py. Do not edit by hand: edit the specs in the
 * script and rerun it.
 *
 * EVERY ENTRY IS A DRAFT (`placeholder: true`) for the owner's review, never
 * presented as done. Each answer was derived by the script (an acceptor test,
 * ring path relations, a Meisenheimer resonance walk, aryne graph edits and
 * Gasteiger charges, all through RDKit; every plain name read back by OPSIN),
 * and the script refuses to write this file when an authored key disagrees
 * with what it derived. Where an answer rests on an authored convention RDKit
 * cannot check (the F > Cl > Br > I rate order, the isotope 50:50, the Dow
 * process through benzyne), the entry's provenance says so.
 *
 * The activation ladder (u4-act-ladder) plays in u4-snar's lesson and the
 * route board (u4-exam-match-route) in u4-benzyne's, since the 23 Oct audit
 * (top-25 #14). U4_UNWIRED keeps the halogen ladder under `u4-exam`, which is
 * not a map node, so NOTHING PLAYS IT: it grades Cl strictly above Br on a
 * Gasteiger gap the audit doubts, and wiring it is an owner decision.
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
    return body.replace('"u2-pool"', '"u4-pool"')


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
    lessons = [n for n in POOLS if n != "u4-exam"]
    out += emit_table("U4_POOLS", lessons, "/** Lesson pools keyed by map node id. Each lesson plays its MCQs (beats/practice/pools.ts). */")
    out += emit_table("U4_UNWIRED", ["u4-exam"], "/** Ladders and boards drafted for the checkpoint. Nothing plays them yet: see the header. */")
    out.append("/** The drawing beside each MCQ, keyed by beat id. */")
    out.append("export const U4_VISUALS: Readonly<Record<string, McqVisual>> = " + ts(VISUALS) + ";\n")
    out.append("/** Drawn options, keyed by beat id then option id. All or nothing per beat. */")
    out.append("export const U4_OPTION_TILES: Readonly<Record<string, Readonly<Record<string, NamedFigure>>>> = " + ts(TILES) + ";\n")
    out.append("/** A drawing for every sort card, keyed by beat id then item id. */")
    out.append("export const U4_SORT_FIGURES: Readonly<Record<string, Readonly<Record<string, NamedFigure>>>> = " + ts(SORT_FIGURES) + ";\n")
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
