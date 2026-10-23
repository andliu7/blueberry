"""
Shared plumbing for the unit guidebook generators after Unit 1
(guide_u2.py to guide_u10.py).

    python scripts/guide_uN.py          writes src/game/guide/uNGuide.figures.ts
    python scripts/guide_uN.py --check  rebuilds it in memory and fails if the file on disk differs

WHY A KIT. Unit 1's script (guide_u1.py) owns the drawing rules every judge
round settled: one bond length, the viewBox cut to the ink, charge signs in
the widest gap with a halo, wedges read back by RDKit. Those rules are
imported from it unchanged, so every unit's guide draws the same way and a
fix there reaches every unit. What differs per unit is only which pool the
products are checked against, and that lives here.

THE CHECKS each unit script gets from this file:
  - in_pool(smiles): the structure must be an answer SMILES in that unit's
    pool file (Unit 2 carries SMILES; the later units carry names instead).
  - named(...): a structure drawn with a chemical name. OPSIN must read the
    name back as exactly the drawn structure, the same rule the unit pool
    scripts hold their own names to. All names go to OPSIN in one batch.
A failed check stops the script and nothing is written.

THE HELPERS: react() runs an RDKit reaction template, so a unit script states
each reaction once and RDKit places every atom; alkene_isomer() picks E or Z
with RDKit's CIP labeller; charge_edit() protonates or deprotonates one atom.
"""
from __future__ import annotations

import json
import os
import re
import sys
import tempfile
from pathlib import Path

from rdkit import Chem
from rdkit.Chem import AllChem

# Unit 1's drawing helpers, reused as they are.
from guide_u1 import (  # noqa: F401  (re-exported for the unit scripts)
    PLUS,
    RES,
    arrow,
    canon,
    equalize,
    focus,
    mol_panel,
)
from guide_u1 import mol as _u1_mol

ROOT = Path(__file__).resolve().parent.parent
GUIDE_DIR = ROOT / "src" / "game" / "guide"

# Every (SMILES, name) a unit script asked OPSIN to confirm.
NAME_CHECKS: list[tuple[str, str]] = []


def pool_smiles(unit: str) -> set[str]:
    """Every answer SMILES a unit's pool file carries, canonical."""
    found: set[str] = set()
    for path in sorted((ROOT / "src" / "game" / "content" / unit).glob("*.ts")):
        for m in re.finditer(r'"?smiles"?\s*:\s*"([^"]+)"', path.read_text(encoding="utf-8")):
            parsed = Chem.MolFromSmiles(m.group(1))
            if parsed is not None:
                found.add(Chem.MolToSmiles(parsed))
    return found


def ester_on_ring(smiles: str) -> bool:
    """Unit 1 writes a methyl ester as one CO2CH3 label. That reads well on a
    ring, where it keeps the drawing clear; on a short chain it left a lone
    stub bond (methyl acetate drew as CH3O2C plus one line), so a chain ester
    is drawn bond by bond."""
    m = Chem.MolFromSmiles(smiles)
    return any(m.GetAtomWithIdx(a).IsInRing() for a, *_ in m.GetSubstructMatches(Chem.MolFromSmarts("[#6][CX3](=O)O[CH3]")))


def mol(smiles: str, name: str | None = None, **kw) -> dict:
    """Unit 1's mol(), with the methyl ester label only on rings (ester_on_ring)."""
    return _u1_mol(smiles, name, ester_label=ester_on_ring(smiles), **kw)


def named(smiles: str, name: str, note: str | None = None, label: str | None = None, **kw) -> dict:
    """A structure drawn under its chemical name, and `note` after a colon when
    given ("Benzene: 6 π, aromatic"). The name is checked by OPSIN before
    anything is written (check_names); the note is the unit script's own.
    `label` shows a short word in place of the name ("1,2 product") where two
    or three drawings share a row and full names would run into each other;
    the name is still checked."""
    NAME_CHECKS.append((smiles, name))
    shown = label if label is not None else name if note is None else f"{name}: {note}"
    return mol(smiles, shown, **kw)


def react(smarts: str, *reactants: str, product: int = 0) -> list[str]:
    """Every distinct product RDKit's reaction template makes from these
    reactants (product number `product` of each match), canonical. The unit
    scripts write each reaction once as a template and let RDKit place every
    atom."""
    rxn = AllChem.ReactionFromSmarts(smarts)
    out: list[str] = []
    for prods in rxn.RunReactants(tuple(Chem.MolFromSmiles(s) for s in reactants)):
        p = Chem.Mol(prods[product])
        try:
            Chem.SanitizeMol(p)
        except Exception:
            continue
        s = Chem.MolToSmiles(p)
        if s not in out:
            out.append(s)
    return out


def charge_edit(smiles: str, element: str, before: int, after: int) -> str:
    """Move the one atom of `element` with charge `before` to charge `after`,
    and let RDKit refill its H (a protonation or deprotonation)."""
    mol = Chem.RWMol(Chem.MolFromSmiles(smiles))
    atoms = [a for a in mol.GetAtoms() if a.GetSymbol() == element and a.GetFormalCharge() == before]
    assert len(atoms) == 1, (smiles, element, before)
    atoms[0].SetFormalCharge(after)
    atoms[0].SetNumExplicitHs(0)
    atoms[0].SetNoImplicit(False)
    Chem.SanitizeMol(mol)
    return Chem.MolToSmiles(mol)


def only(products: list[str]) -> str:
    """The one product a reaction gives; more than one stops the script."""
    assert len(products) == 1, products
    return products[0]


def alkene_isomer(smiles: str, want: str) -> str:
    """The E or Z isomer of a structure with one stereo C=C, picked by RDKit's
    CIP labeller from the isomers RDKit enumerates (which one forms is the
    unit's rule, quoted in its guide words; the label is computed here)."""
    from rdkit.Chem import rdCIPLabeler
    from rdkit.Chem.EnumerateStereoisomers import EnumerateStereoisomers

    hits = []
    for isomer in EnumerateStereoisomers(Chem.MolFromSmiles(smiles)):
        rdCIPLabeler.AssignCIPLabels(isomer)
        labels = [b.GetProp("_CIPCode") for b in isomer.GetBonds() if b.HasProp("_CIPCode")]
        if labels == [want]:
            hits.append(Chem.MolToSmiles(isomer))
    return only(sorted(set(hits)))


def opsin(names: list[str]) -> list[str]:
    """What OPSIN reads each name as, canonical ('' when it cannot read it).
    py2opsin writes a temp file in the working directory, so it runs in a
    private one, as the unit pool scripts do."""
    from py2opsin import py2opsin

    here = os.getcwd()
    os.chdir(tempfile.mkdtemp(prefix="guide_opsin_"))
    try:
        got = py2opsin(names)
    finally:
        os.chdir(here)
    got = list(got) if isinstance(got, list) else [got]
    out = []
    for smiles in got:
        parsed = Chem.MolFromSmiles(smiles) if smiles else None
        out.append(Chem.MolToSmiles(parsed) if parsed is not None else "")
    return out


def check_names() -> list[str]:
    """Every name OPSIN does not read back as its drawing, as a message."""
    if not NAME_CHECKS:
        return []
    asked = list(dict.fromkeys(NAME_CHECKS))
    read = opsin([name for _, name in asked])
    bad = []
    for (smiles, name), got in zip(asked, read):
        if got != canon(smiles):
            bad.append(f"OPSIN reads '{name}' as {got or 'nothing'}, the drawing is {canon(smiles)}")
    return bad


def header(unit_label: str, script: str, test: str, const: str) -> str:
    return f'''/**
 * {unit_label} guidebook drawings. GENERATED by {script} with RDKit.
 * Do not edit by hand: change the script and rerun it.
 *
 * Every structure is a SMILES RDKit parsed, drawn by Unit 1's rules
 * (scripts/guide_u1.py, through scripts/guide_kit.py). Every product was made
 * by RDKit from its starting material, and every name was read back by OPSIN
 * as the drawing. {test} reruns the script with --check, so a hand edit here
 * fails the suite. Drafts until the owner signs them off.
 */
import type {{ GuideExample }} from "./types";

export const {const}: Readonly<Record<string, GuideExample>> = '''


def run(build, out_name: str, head: str) -> int:
    """Write the figures file, or with --check compare it with the one on disk."""
    examples = build()
    for example in examples.values():
        equalize(example["panels"])
    bad = check_names()
    if bad:
        print("REFUSED. Nothing written:")
        for line in bad:
            print("  " + line)
        return 1
    text = head + _body(examples)
    out = GUIDE_DIR / out_name
    if "--check" in sys.argv:
        on_disk = out.read_text(encoding="utf-8") if out.exists() else ""
        if on_disk != text:
            print(f"{out.relative_to(ROOT)} is stale or hand edited: rerun the script that writes it")
            return 1
        print(f"{out_name}: every structure parses, every name reads back, and the file matches")
        return 0
    out.write_text(text, encoding="utf-8", newline="\n")
    print(f"wrote {out.relative_to(ROOT)}")
    return 0


def _body(examples: dict) -> str:
    """The examples as Unit 1's render writes them: JSON, every one a draft."""
    body = {k: {**v, "placeholder": True} for k, v in examples.items()}
    return json.dumps(body, indent=2, ensure_ascii=False) + ";\n"
