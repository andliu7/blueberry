"""Check the pKa paste aliases with RDKit (derive, never recall).

Reads src/game/settings/pkaAliases.json, the one source pkaAliases.ts imports,
and asserts:
  - every rung has a SMARTS and it parses
  - every alias SMILES parses
  - every alias SMILES matches its own rung's SMARTS, so a compound filed under
    "phenol" really carries a phenol O-H
  - the same three for sheetSmarts / sheetRows, the species the course sheet
    prints with no rung (HCl, HCN...), so "HCl" really is H-Cl

Names without a SMILES are vocabulary, not chemistry, and are not checked here
(pkaAliases.test.ts checks they are unique across rungs).

Run from the repo root:  python scripts/check_pka_aliases.py
Exits 0 when every check passes, 1 otherwise.
"""

import json
import sys
from pathlib import Path

from rdkit import Chem
from rdkit import RDLogger

RDLogger.DisableLog("rdApp.*")

SOURCE = Path(__file__).resolve().parent.parent / "src" / "game" / "settings" / "pkaAliases.json"


def check(smarts_by_rung: dict, aliases: dict, problems: list[str]) -> tuple[int, int]:
    """One table of SMARTS and its alias lists. Returns (patterns, SMILES checked)."""
    checked = 0

    patterns = {}
    for rung, smarts in smarts_by_rung.items():
        pattern = Chem.MolFromSmarts(smarts)
        if pattern is None:
            problems.append(f"{rung}: SMARTS {smarts!r} does not parse")
        else:
            patterns[rung] = pattern

    for rung, entries in aliases.items():
        if rung not in smarts_by_rung:
            problems.append(f"{rung}: has aliases but no rung SMARTS")
            continue
        for entry in entries:
            smiles = entry.get("smiles")
            if smiles is None:
                continue
            mol = Chem.MolFromSmiles(smiles)
            if mol is None:
                problems.append(f"{rung}: {entry['name']!r} SMILES {smiles!r} does not parse")
                continue
            # Explicit hydrogens are not needed: the SMARTS use H counts, which
            # RDKit reads from implicit hydrogens.
            pattern = patterns.get(rung)
            if pattern is not None and not mol.HasSubstructMatch(pattern):
                problems.append(
                    f"{rung}: {entry['name']!r} ({smiles}) does not match {smarts_by_rung[rung]!r}"
                )
            checked += 1

    for rung in smarts_by_rung:
        if rung not in aliases:
            problems.append(f"{rung}: has a SMARTS but no aliases")
    return len(patterns), checked


def main() -> int:
    data = json.loads(SOURCE.read_text(encoding="utf-8"))
    problems: list[str] = []
    rungs, checked = check(data["rungSmarts"], data["aliases"], problems)
    # Species the sheet prints with no rung (HCl, HCN...), checked the same way.
    rows, sheet_checked = check(data["sheetSmarts"], data["sheetRows"], problems)

    if problems:
        for line in problems:
            print("FAIL", line)
        return 1
    print(
        f"ok: {rungs} rung SMARTS parse, {checked} alias SMILES match their rung; "
        f"{rows} sheet-row SMARTS parse, {sheet_checked} sheet SMILES match their row"
    )
    return 0


if __name__ == "__main__":
    sys.exit(main())
