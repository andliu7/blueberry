"""
Premade flashcards for every section of the path, built from the unit guidebooks.

    python scripts/section_decks.py          writes src/game/cards/sections/u0..u10.generated.ts and index.generated.ts
    python scripts/section_decks.py --check  rebuilds them in memory and fails if a file on disk differs

WHERE THE CARDS COME FROM. Nothing here is new chemistry. Every card is cut
from a unit guidebook, which already holds one checked mini example per lesson
and the key ideas, each quoting a pool entry word for word:

  - REACTION cards, from the guide drawings (src/game/guide/uNGuide.figures.ts,
    written by scripts/guide_uN.py with RDKit, products made by each unit pool
    script's own rules, names read back by OPSIN). One card per drawn row that
    is a plain reaction: starting material(s), one arrow, product(s). The front
    draws what goes in and the arrow; the back draws the product and names it.
    Every SMILES is parsed again here by RDKit and stored in canonical form, so
    a card can never carry a structure RDKit cannot read.
  - IDEA cards, from the guide's key ideas (uNGuide.ts). The front is the idea
    with its marked words (or the part after its colon, ", so" or ";") taken
    out; the back is those words. The why is the idea's `quote`, the pool
    entry's own words, which test/guideUN.test.ts already holds verbatim.
  - SLIP cards, from the guide's common mistakes: the slip on the front, the
    fix on the back, the pool quote as the why. A slip goes to the lesson whose
    pool entry it quotes (read from src/game/content).

Each unit is deduplicated on its own: no two cards share a front, and no two
reaction cards share the same reactants, reagents and products (canonical
SMILES). Cards are keyed by LESSON, not by section: the app cuts sections at
run time (unitSections in tabs/pathway/testOuts.ts), so a re-cut of the path
never needs this script rerun.

A failed check (a SMILES RDKit cannot parse, a guide lesson with no words, an
idea without its quote) stops the script and nothing is written. Every card is
a draft until the owner signs it off, like the guides it comes from.
"""
from __future__ import annotations

import json
import re
import sys
from pathlib import Path

from rdkit import Chem

ROOT = Path(__file__).resolve().parent.parent
GUIDE_DIR = ROOT / "src" / "game" / "guide"
CONTENT_DIR = ROOT / "src" / "game" / "content"
OUT_DIR = ROOT / "src" / "game" / "cards" / "sections"
UNITS = [f"u{n}" for n in range(11)]

FIELD = re.compile(r'^\s*(\w+):\s*"((?:[^"\\]|\\.)*)",?\s*$')
# A pool beat names its id, then its node, in both the JSON pools and Unit 1's TS specs.
ENTRY_NODE = re.compile(r'"?id"?:\s*"([^"]+)",\s*"?node"?:\s*"([^"]+)"')


class Refused(Exception):
    pass


def canon(smiles: str) -> str:
    mol = Chem.MolFromSmiles(smiles)
    if mol is None:
        raise Refused(f"RDKit cannot parse {smiles}")
    return Chem.MolToSmiles(mol)


def read_figures(unit: str) -> dict:
    """The guide drawings: the JSON object a guide script wrote after `= `."""
    text = (GUIDE_DIR / f"{unit}Guide.figures.ts").read_text(encoding="utf-8")
    start = text.index("= {", text.index("export const")) + 2
    end = text.rindex("}") + 1
    return json.loads(text[start:end])


def read_words(unit: str) -> list[dict]:
    """The guide's stages, lessons, ideas and mistakes, read line by line.
    Every field in uNGuide.ts sits on one line as `key: "value",`, which is
    what this reads; test/sectionDecks.test.ts compares the result with the
    guide the app loads, so a format change fails there."""
    stages: list[dict] = []
    mode = None
    lesson = None
    for line in (GUIDE_DIR / f"{unit}Guide.ts").read_text(encoding="utf-8").splitlines():
        stripped = line.strip()
        if stripped.startswith("ideas: ["):
            mode = "ideas"
            continue
        if stripped.startswith("example: {"):
            mode = "example"
            continue
        if stripped.startswith("mistakes: ["):
            mode = "mistakes"
            lesson = None
            continue
        m = FIELD.match(line)
        if m is None:
            continue
        key, value = m.group(1), json.loads(f'"{m.group(2)}"')
        # Only a stage carries an id (ideas, examples and mistakes do not).
        if key == "id":
            lesson = None
            stages.append({"id": value, "lessons": [], "mistakes": []})
            mode = None
            continue
        if key == "node":
            lesson = {"node": value, "ideas": []}
            stages[-1]["lessons"].append(lesson)
            mode = None
            continue
        if mode == "ideas" and lesson is not None:
            if key == "text":
                lesson["ideas"].append({"text": value})
            elif key in ("mark", "source", "quote"):
                lesson["ideas"][-1][key] = value
        elif mode == "mistakes":
            if key == "mistake":
                stages[-1]["mistakes"].append({"mistake": value})
            elif key in ("fix", "source", "quote"):
                stages[-1]["mistakes"][-1][key] = value
    for stage in stages:
        for lesson in stage["lessons"]:
            for idea in lesson["ideas"]:
                if not all(k in idea for k in ("text", "source", "quote")):
                    raise Refused(f"{unit} {lesson['node']}: an idea without its text, source or quote: {idea}")
        for slip in stage["mistakes"]:
            if not all(k in slip for k in ("mistake", "fix", "source", "quote")):
                raise Refused(f"{unit}: a mistake without its fix, source or quote: {slip}")
    return stages


def entry_nodes() -> dict[str, str]:
    """Pool entry id to the lesson node it plays in, across every unit's content."""
    found: dict[str, str] = {}
    for path in sorted(CONTENT_DIR.rglob("*.ts")):
        for m in ENTRY_NODE.finditer(path.read_text(encoding="utf-8")):
            found.setdefault(m.group(1), m.group(2))
    return found


def rows(panels: list[dict]) -> list[list[dict]]:
    out: list[list[dict]] = [[]]
    for panel in panels:
        if panel["kind"] == "break":
            out.append([])
        else:
            out[-1].append(panel)
    return out


def reaction_of(row: list[dict]) -> dict | None:
    """A row that is one plain reaction: molecules and pluses, one arrow,
    molecules and pluses, every product named. Anything else (resonance, a
    comparison, an energy diagram, two arrows) is not a card."""
    kinds = [p["kind"] for p in row]
    if kinds.count("arrow") != 1 or any(k not in ("mol", "plus", "arrow") for k in kinds):
        return None
    at = kinds.index("arrow")
    lead = [p for p in row[:at] if p["kind"] == "mol"]
    result = [p for p in row[at + 1:] if p["kind"] == "mol"]
    if not lead or not result or any(not p.get("name") for p in result):
        return None
    return {"lead": lead, "arrow": row[at], "result": result}


def reagents_of(arrow: dict) -> str:
    return ", ".join(part for part in (arrow.get("over", ""), arrow.get("under", "")) if part)


def cloze(text: str, mark: str | None) -> tuple[str, str] | None:
    """The idea with its key words taken out, and those words."""
    if mark and mark in text:
        return text.replace(mark, "____", 1), mark
    for cut in (": ", ", so ", "; ", " because "):
        if cut in text:
            head, tail = text.split(cut, 1)
            if len(tail.strip()) >= 3:
                return f"{head}{cut}____", tail.strip()
    return None


def build_unit(unit: str, nodes_of: dict[str, str]) -> tuple[list[dict], list[str]]:
    figures = read_figures(unit)
    stages = read_words(unit)
    lessons = [lesson for stage in stages for lesson in stage["lessons"]]
    order = [lesson["node"] for lesson in lessons]
    missing = [node for node in figures if node not in order]
    if missing:
        raise Refused(f"{unit}: drawings with no lesson in the words file: {missing}")

    slips: dict[str, list[dict]] = {node: [] for node in order}
    for stage in stages:
        for slip in stage["mistakes"]:
            node = nodes_of.get(slip["source"])
            if node in slips:
                slips[node].append(slip)

    cards: list[dict] = []
    fronts: set[str] = set()
    keys: set[str] = set()

    def add(card: dict, key: str | None = None) -> None:
        if card["front"] in fronts or (key is not None and key in keys):
            return
        fronts.add(card["front"])
        if key is not None:
            keys.add(key)
        cards.append(card)

    for lesson in lessons:
        node = lesson["node"]
        example = figures.get(node)
        reactions: list[tuple[dict, str]] = []
        if example is not None:
            for index, row in enumerate(rows(example["panels"])):
                rxn = reaction_of(row)
                if rxn is None:
                    continue
                reactants = [canon(p["smiles"]) for p in rxn["lead"]]
                products = [canon(p["smiles"]) for p in rxn["result"]]
                reagents = reagents_of(rxn["arrow"])
                start = " + ".join(p.get("name") or "the drawn structure" for p in rxn["lead"])
                front = f"{start}, with {reagents}: what forms?" if reagents else f"{start}: what forms?"
                card = {
                    "id": f"sec:{node}:rx{index}",
                    "lesson": node,
                    "kind": "reaction",
                    "front": front,
                    "back": " + ".join(p["name"] for p in rxn["result"]),
                    "why": example["caption"],
                    "fig": index,
                    "reactants": reactants,
                    "products": products,
                }
                reactions.append((card, f"{'.'.join(reactants)}>{reagents}>{'.'.join(products)}"))
        ideas: list[dict] = []
        taken: set[str] = set()
        for idea in lesson["ideas"]:
            cut = cloze(idea["text"], idea.get("mark"))
            if cut is None:
                continue
            ident = f"sec:{node}:idea:{idea['source']}"
            while ident in taken:
                ident += "+"
            taken.add(ident)
            ideas.append({"id": ident, "lesson": node, "kind": "idea", "front": cut[0], "back": cut[1], "why": idea["quote"]})
        # Reactions and ideas alternate, so a deck that takes a lesson's first
        # few cards gets a drawing and an idea, not two of one kind.
        for at in range(max(len(reactions), len(ideas))):
            if at < len(reactions):
                add(*reactions[at])
            if at < len(ideas):
                add(ideas[at])
        for slip in slips[node]:
            add({
                "id": f"sec:{node}:slip:{slip['source']}",
                "lesson": node,
                "kind": "slip",
                "front": f"Spot the slip: {slip['mistake']}",
                "back": slip["fix"],
                "why": slip["quote"],
            })
    return cards, order


HEADER = '''/**
 * {label} section flashcards. GENERATED by scripts/section_decks.py from the
 * Unit guidebook (src/game/guide/{unit}Guide.ts and {unit}Guide.figures.ts).
 * Do not edit by hand: change the guide or the script and rerun it.
 *
 * Reaction cards carry their structures as canonical RDKit SMILES and draw
 * them from the guide row named by `fig`; idea and slip cards quote the pool
 * entry the guide quotes. test/sectionDecks.test.ts reruns the script with
 * --check, so a hand edit here fails the suite. Drafts until the owner signs
 * them off.
 */
import type {{ SectionCardSeed }} from "./sectionDecks";

export const SECTION_CARDS: readonly SectionCardSeed[] = '''

INDEX_HEADER = '''/**
 * How many premade cards each guide lesson has, and each unit's lessons in
 * guide order. GENERATED by scripts/section_decks.py; do not edit by hand.
 * Small on purpose: the Cards tab shelf reads it to list every section deck
 * with its count without loading any unit's cards or drawings.
 */
'''


def render() -> dict[Path, str]:
    nodes_of = entry_nodes()
    files: dict[Path, str] = {}
    counts: dict[str, int] = {}
    lessons_of: dict[str, list[str]] = {}
    for unit in UNITS:
        cards, order = build_unit(unit, nodes_of)
        label = "Unit " + unit[1:]
        files[OUT_DIR / f"{unit}.generated.ts"] = HEADER.format(label=label, unit=unit) + json.dumps(cards, indent=2, ensure_ascii=False) + ";\n"
        lessons_of[unit] = order
        for node in order:
            counts[node] = sum(1 for card in cards if card["lesson"] == node)
    files[OUT_DIR / "index.generated.ts"] = (
        INDEX_HEADER
        + "export const SECTION_CARD_COUNTS: Readonly<Record<string, number>> = "
        + json.dumps(counts, indent=2, ensure_ascii=False)
        + ";\n\nexport const SECTION_UNIT_LESSONS: Readonly<Record<string, readonly string[]>> = "
        + json.dumps(lessons_of, indent=2, ensure_ascii=False)
        + ";\n"
    )
    return files


def main() -> int:
    try:
        files = render()
    except Refused as error:
        print(f"REFUSED. Nothing written: {error}")
        return 1
    if "--check" in sys.argv:
        stale = [p for p, text in files.items() if not p.exists() or p.read_text(encoding="utf-8") != text]
        if stale:
            for p in stale:
                print(f"{p.relative_to(ROOT)} is stale or hand edited: rerun scripts/section_decks.py")
            return 1
        print(f"section decks: every SMILES parses and all {len(files)} files match")
        return 0
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    for p, text in files.items():
        p.write_text(text, encoding="utf-8", newline="\n")
        print(f"wrote {p.relative_to(ROOT)}")
    if "--print" in sys.argv:
        for unit in sys.argv[sys.argv.index("--print") + 1:]:
            for card in json.loads(files[OUT_DIR / f"{unit}.generated.ts"].split("= ", 1)[1].rstrip(";\n")):
                print(f"  [{card['kind']}] {card['front']}  ->  {card['back']}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
