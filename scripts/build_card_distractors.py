"""
The wrong answers for the Cards run's "Call the product" step, derived with RDKit.

Run:  python scripts/build_card_distractors.py
Writes: public/cards/predict/*.svg (light and dark per structure) and
        src/game/cards/predictDistractors.generated.ts. Never edit that by hand.

WHY THIS EXISTS. The first version of the predict step drew its wrong options
from other registry reactions. A critic measured the result: on four of the six
starter cards the answer was the ONLY option carrying the element the reagent
brings (the only N after methylamine, the only Cl after SOCl2, the only Br after
HBr), so a student could pick it by counting atoms with no chemistry at all.

THE RULE EVERY WRONG OPTION MEETS, checked here and pinned again in
test/cardsRun.test.ts: it has exactly the answer's set of elements and exactly
its carbon count. So the option cannot be told apart by which atoms it has; it
can only be told apart by where they are, which is the chemistry the card drills.

WHERE THE WRONG OPTIONS COME FROM. Derived, never recalled. Each candidate is
either (a) another registry reaction's product that passes the rule above, or
(b) the answer product rewritten by one RDKit reaction SMARTS from the table
below. Each transform is a named, plausible wrong outcome a student actually
writes (the other end of an allyl system, the tautomer, the substituent on the
wrong carbon, one reduction too far), and the option's caption says which, in
words derived from the transform rather than a name typed from memory. A
reaction for which fewer than two candidates survive gets no predict step at
all, and the script prints it: a weak question is worse than no question.
"""

from __future__ import annotations

import json
import sys
from pathlib import Path

from rdkit import Chem
from rdkit.Chem import AllChem, rdMolDescriptors

sys.path.insert(0, str(Path(__file__).resolve().parent))
from build_curriculum import render_svg  # noqa: E402  (same drawing style as the cards)

ROOT = Path(__file__).resolve().parent.parent
REACTIONS_TS = ROOT / "src" / "data" / "reactions.ts"
ART = ROOT / "public" / "cards" / "predict"
OUT = ROOT / "src" / "game" / "cards" / "predictDistractors.generated.ts"

WRONG_OPTIONS = 2

# The SMARTS transforms: (key, caption, SMARTS list). Each is applied to the
# ANSWER product. Each caption says what the drawing is relative to the answer,
# so the after-pick screen teaches rather than only marking.
TRANSFORMS: list[tuple[str, str, list[str]]] = [
    (
        "allylic",
        "The other end of the allyl system",
        # X-C-C=C  ->  C=C-C-X : the group and the double bond swap ends. For
        # the diene + HBr card this is how the 1,2 product is derived from the
        # registry's 1,4 product, rather than typed in.
        ["[!#6;!#1:1]-[CX4;!H0:2]-[C:3]=[C;!H0:4]>>[C:2]=[C:3]-[C:4]-[*:1]"],
    ),
    (
        "shifted",
        "The double bond one carbon over",
        ["[C;!a:1]=[C;!a:2]-[CX4;!H0:3]>>[C:1]-[C:2]=[C:3]"],
    ),
    (
        "tautomer",
        "A tautomer: the double bond on carbon instead",
        # H-C-C=X  ->  C=C-X-H, for X = O or N (enol, enamine).
        ["[CX4;!H0:1]-[C:2]=[O,N:3]>>[C:1]=[C:2]-[*:3]"],
    ),
    (
        "reduced",
        "One reduction too far",
        # C=X -> C-X and C#X -> C=X, non-aromatic.
        ["[C;!a:1]=[O,N,C;!a:2]>>[C:1]-[*:2]", "[C;!a:1]#[N,C;!a:2]>>[C:1]=[*:2]"],
    ),
    (
        "unsaturated",
        "A double bond the conditions do not make",
        ["[CX4;!H0;!R:1]-[CX4;!H0;!R:2]>>[C:1]=[C:2]"],
    ),
]

# Code-built kinds, see regio_moves(), second_substitutions(), branch_moves().
CAPTIONS = {
    "regio": "The same group on a different carbon",
    "twice": "Substituted twice",
    "branch": "The same carbons, branched differently",
}

# Preference when more than two survive: real alternative outcomes of this
# reaction first (the other allyl end, the tautomer, what a sibling reagent
# does to the same start), then plausible misplacements, then the rest.
PRIORITY = ["allylic", "shifted", "tautomer", "sibling", "reduced", "regio", "twice", "branch", "unsaturated", "registry"]


def load_registry() -> dict:
    """The generated registry, read as JSON out of its TypeScript wrapper."""
    text = REACTIONS_TS.read_text(encoding="utf-8")
    start = text.index("} =\n{", text.index("const DATA")) + 4
    end = text.index("export const REACTIONS")
    return json.loads(text[start:end].rstrip().rstrip(";"))


def canonical(mol) -> str | None:
    """Canonical SMILES without stereo, so two drawings that look alike dedupe."""
    try:
        Chem.SanitizeMol(mol)
        return Chem.MolToSmiles(mol, isomericSmiles=False)
    except Exception:  # noqa: BLE001  (RDKit raises several types for a bad edit)
        return None


def signature(smiles: str) -> tuple[frozenset[str], int] | None:
    """The element set and the carbon count: what an atom-counting student sees."""
    mol = Chem.MolFromSmiles(smiles)
    if mol is None:
        return None
    elements = frozenset(atom.GetSymbol() for atom in mol.GetAtoms())
    carbons = sum(1 for atom in mol.GetAtoms() if atom.GetSymbol() == "C")
    return elements, carbons


def smarts_products(mol, smarts: str) -> list[str]:
    """Every distinct product one reaction SMARTS makes from `mol`, canonical."""
    rxn = AllChem.ReactionFromSmarts(smarts)
    out: set[str] = set()
    for products in rxn.RunReactants((mol,)):
        smiles = canonical(Chem.Mol(products[0]))
        if smiles is not None:
            out.add(smiles)
    return sorted(out)


def _finish(rw) -> str | None:
    """Let RDKit recount hydrogens after an edit, then canonicalise one fragment."""
    for atom in rw.GetAtoms():
        atom.SetNoImplicit(False)
        atom.SetNumExplicitHs(0)
    smiles = canonical(rw)
    return smiles if smiles is not None and "." not in smiles else None


def group_edits(mol, mode: str) -> list[str]:
    """
    Structures made by moving or copying one substituent, the three code-built
    kinds:

      regio   a heteroatom group moved to another carbon that carries an H
              (chloro on the ring instead of the acyl carbon)
      twice   a carbon-free, uncharged heteroatom group on an aromatic ring
              copied onto a second ring carbon (over-substitution)
      branch  in a pure hydrocarbon, a methyl moved to another carbon (the
              same carbons, a different skeleton)

    Only single, acyclic bonds are cut, and only when the group is the smaller
    side, so the skeleton a student recognises stays put.
    """
    hydrocarbon = all(atom.GetSymbol() in ("C", "H") for atom in mol.GetAtoms())
    out: set[str] = set()
    for bond in mol.GetBonds():
        if bond.GetBondType() != Chem.BondType.SINGLE or bond.IsInRing():
            continue
        # Either end can be the group, so both orientations are tried.
        for a, x in ((bond.GetBeginAtom(), bond.GetEndAtom()), (bond.GetEndAtom(), bond.GetBeginAtom())):
            if a.GetSymbol() == "C":
                out.update(_edits_across(mol, a, x, mode, hydrocarbon))
    return sorted(out)


def _edits_across(mol, a, x, mode: str, hydrocarbon: bool) -> set[str]:
    """group_edits for one orientation of one bond: `x` starts the group, `a` stays."""
    out: set[str] = set()
    cut = Chem.RWMol(mol)
    cut.RemoveBond(a.GetIdx(), x.GetIdx())
    frags = Chem.GetMolFrags(cut, asMols=False, sanitizeFrags=False)
    group = next(f for f in frags if x.GetIdx() in f)
    core = next(f for f in frags if a.GetIdx() in f)
    if len(group) >= len(core):
        return out
    group_atoms = [mol.GetAtomWithIdx(i) for i in group]
    if mode == "regio" and x.GetSymbol() == "C":
        return out
    if mode == "branch" and not (hydrocarbon and len(group) == 1):
        return out
    if mode == "twice" and (
        x.GetSymbol() == "C"
        or not a.GetIsAromatic()
        or any(g.GetSymbol() == "C" for g in group_atoms)
        or sum(g.GetFormalCharge() for g in group_atoms) != 0
    ):
        return out
    for b in core:
        target = mol.GetAtomWithIdx(b)
        if b == a.GetIdx() or target.GetSymbol() != "C" or target.GetTotalNumHs() == 0:
            continue
        if mode == "twice":
            if not target.GetIsAromatic():
                continue
            copy = Chem.RWMol(mol)
            index = {}
            for g in group_atoms:
                fresh = Chem.Atom(g.GetAtomicNum())
                fresh.SetFormalCharge(g.GetFormalCharge())
                index[g.GetIdx()] = copy.AddAtom(fresh)
            for gb in mol.GetBonds():
                u, v = gb.GetBeginAtomIdx(), gb.GetEndAtomIdx()
                if u in index and v in index:
                    copy.AddBond(index[u], index[v], gb.GetBondType())
            copy.AddBond(b, index[x.GetIdx()], Chem.BondType.SINGLE)
            smiles = _finish(copy)
        else:
            moved = Chem.RWMol(cut)
            moved.AddBond(b, x.GetIdx(), Chem.BondType.SINGLE)
            smiles = _finish(moved)
        if smiles is not None:
            out.add(smiles)
    return out


# Structures no student should be offered even as a wrong answer, because they
# are not isolable products: a gem-diol, a hemiacetal or hemiaminal, and an
# alpha-halo alcohol. A transform can make them; the filter drops them.
UNSTABLE = [
    Chem.MolFromSmarts(s)
    for s in (
        "[CX4]([OX2H1,OX1-])[OX2H1,OX1-]",
        "[CX4]([OX2H1,OX1-])[OX2,NX3]",
        "[CX4]([OX2H1,OX1-])[Cl,Br,I]",
    )
]


def stable(smiles: str) -> bool:
    mol = Chem.MolFromSmiles(smiles)
    return mol is not None and not any(mol.HasSubstructMatch(q) for q in UNSTABLE)


def candidates(rxn: dict, registry: list[dict]) -> list[tuple[str, str, str, str]]:
    """(key, caption, smiles, source) for every wrong option that passes the rule, best first."""
    answer = Chem.MolFromSmiles(rxn["product"])
    answer_smiles = canonical(Chem.Mol(answer))
    target = signature(rxn["product"])
    if answer_smiles is None or target is None:
        return []
    starts = {canonical(Chem.MolFromSmiles(s)) for s in rxn["reactants"]}
    found: list[tuple[str, str, str, str]] = []
    seen = {answer_smiles} | starts

    def keep(key: str, caption: str, smiles: str, source: str) -> None:
        if smiles in seen or signature(smiles) != target or not stable(smiles):
            return
        seen.add(smiles)
        found.append((key, caption, smiles, source))

    # Derived kinds first, so a structure that is also some registry product
    # keeps the caption that explains it for THIS reaction.
    for key, caption, smarts_list in TRANSFORMS:
        for smarts in smarts_list:
            for smiles in smarts_products(answer, smarts):
                keep(key, caption, smiles, "derived")
    for key in ("regio", "twice", "branch"):
        for smiles in group_edits(answer, key):
            keep(key, CAPTIONS[key], smiles, "derived")

    first_start = rxn["reactants"][0]
    for other in sorted(registry, key=lambda r: r["id"]):
        if other["id"] == rxn["id"]:
            continue
        smiles = canonical(Chem.MolFromSmiles(other["product"]))
        if smiles is None:
            continue
        # A sibling starts from the same compound: what a different reagent
        # really does to it, the best wrong answer there is.
        key = "sibling" if other["reactants"][0] == first_start else "registry"
        keep(key, f"What {other['name']} gives", smiles, other["id"])

    return sorted(found, key=lambda entry: PRIORITY.index(entry[0]))


def pick(found: list[tuple[str, str, str, str]]) -> list[tuple[str, str, str, str]]:
    """Two options, one per kind of wrong where possible, in preference order."""
    chosen: list[tuple[str, str, str, str]] = []
    for entry in found:
        if len(chosen) < WRONG_OPTIONS and all(entry[0] != c[0] for c in chosen):
            chosen.append(entry)
    for entry in found:
        if len(chosen) < WRONG_OPTIONS and entry not in chosen:
            chosen.append(entry)
    return chosen


def art_name(smiles: str, theme: str) -> str:
    """
    A neutral filename. The answer lives under reactions/ and these under
    cards/predict/, so the name itself must not say "wrong" or number them.
    """
    import hashlib

    return f"{hashlib.sha1(smiles.encode('utf-8')).hexdigest()[:12]}-{theme}.svg"


def formula(smiles: str) -> str:
    return rdMolDescriptors.CalcMolFormula(Chem.MolFromSmiles(smiles))


def main() -> int:
    data = load_registry()
    registry = data["reactions"]
    table: dict[str, list[dict]] = {}
    gaps: list[str] = []
    for rxn in sorted(registry, key=lambda r: r["id"]):
        chosen = pick(candidates(rxn, registry))
        if len(chosen) < WRONG_OPTIONS:
            gaps.append(rxn["id"])
            print(f"  GAP     {rxn['id']}: {len(chosen)} wrong option(s) pass the rule; no predict step")
            continue
        entries = []
        for key, caption, smiles, source in chosen:
            entry = {"smiles": smiles, "formula": formula(smiles), "caption": caption, "kind": key, "source": source}
            for theme in ("light", "dark"):
                name = art_name(smiles, theme)
                if render_svg(smiles, ART / name, dark=(theme == "dark")):
                    entry[theme] = f"cards/predict/{name}"
            entries.append(entry)
            print(f"  {rxn['id']:<28} {key:<11} {smiles}")
        table[rxn["id"]] = entries

    header = (
        "// GENERATED by scripts/build_card_distractors.py. Do not edit by hand.\n"
        "// The wrong options for the Cards run's predict step: each has exactly the\n"
        "// answer's element set and carbon count, derived with RDKit (see the script).\n\n"
        "export interface PredictDistractor {\n"
        "  /** Canonical SMILES. Data for tests; never shown to a student. */\n"
        "  readonly smiles: string;\n"
        "  /** RDKit's formula of the same structure. */\n"
        "  readonly formula: string;\n"
        "  /** What this structure is relative to the answer, shown after the pick. */\n"
        "  readonly caption: string;\n"
        "  readonly kind: string;\n"
        "  /** \"derived\", or the registry reaction whose product this is. */\n"
        "  readonly source: string;\n"
        "  readonly light?: string;\n"
        "  readonly dark?: string;\n"
        "}\n\n"
    )
    body = (
        "export const PREDICT_DISTRACTORS: Readonly<Record<string, readonly PredictDistractor[]>> = "
        + json.dumps(table, indent=2, ensure_ascii=False)
        + ";\n\n/** Registry reactions with no honest predict step: fewer than two options pass. */\n"
        + "export const PREDICT_GAPS: readonly string[] = "
        + json.dumps(gaps)
        + ";\n"
    )
    OUT.write_text(header + body, encoding="utf-8")
    print(f"wrote {OUT.relative_to(ROOT)}: {len(table)} reactions, {len(gaps)} gaps")
    return 0


if __name__ == "__main__":
    sys.exit(main())
