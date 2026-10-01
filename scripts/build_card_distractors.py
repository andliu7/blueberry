"""
The options for the Cards run's "Call the product" step, derived with RDKit.

Run:  python scripts/build_card_distractors.py
Writes: public/cards/predict/*.svg (light and dark per structure, the answer
        included) and src/game/cards/predictDistractors.generated.ts. Never
        edit that by hand.

WHY THIS EXISTS. The first version drew its wrong options from other registry
reactions, and a critic found the answer was the ONLY option carrying the
element the reagent brings on four of six starter cards. The second version
matched elements and carbon count, and the round 2 critic still solved 8 of 39
cards without chemistry: the answer was the odd one out (both wrong options
"substituted twice", or both the group moved onto the ring), and "pick the
option most like the start" found the answer on 25 of 39.

THE RULES A CARD'S TWO WRONG OPTIONS MEET, checked here and pinned again in
test/cardsRun.test.ts:

  1. Each has exactly the answer's set of elements, and its carbon count
     unless the reaction moves carbon: then the count may lie anywhere from
     the start's to the answer's, give or take carbon_shift(), the carbons
     the reaction itself adds or loses (owner decision, 1 Oct). Counting atoms still cannot tell the
     answer apart, since a reagent that brings carbon makes "how many
     carbons did it bring" a question about the reagent, which is chemistry.
  2. They are of two different kinds, so neither the drawings nor the captions
     pair up against the answer.
  3. The answer is not the odd one out on anything a non-chemist can count:
     formula, ring count, aromatic ring count, how many groups hang off each
     ring, whether the start's ring pattern survives, and the charge.
  4. They are not both farther from the start than the answer is. "Farther"
     is Morgan fingerprint similarity (radius 2) to the start, the critic's own
     proxy, with a tie band of TIE: inside it the difference is not a thing a
     student can see, and asking for strictly closer would make "never pick
     the closest" the new tell.
  5. Each matches the answer's species class: its net charge, whether it
     is an enol, enolate or enamine, and whether it has an ether oxygen the
     starts do not (round 6). Across a deck, a class only wrong options
     carry is a rule a student learns without chemistry (round 5).
  6. Neither is a product this card's own data or mechanism makes: see
     own_products() (the NBS card's other allyl end).
  7. Neither needs a reagent the card does not carry: no more carbon than the
     starts and consumed reagents supply, no reduction without a reductant and
     no oxidation without an oxidant. See carbon_supply() and
     needs_absent_reagent(). Round 6: a reduction hidden inside another
     edit counts too: no start's C=O carbon may gain an H on a card with no
     reductant (carbonyl_gains_h()), whatever the edit is called.

WHERE THE WRONG OPTIONS COME FROM. Derived, never recalled. Each candidate is
the answer or the start rewritten by one RDKit edit, or a structure the
registry itself records for this start (an intermediate of this very reaction,
or a sibling reaction's product). Real competing outcomes come first: the
other allyl end, stopping at an intermediate, what a sibling reagent does, the
halogen added across a double bond where the card's own reagent can do that,
the ring site where the registry shows the same reagent substituting a ring.
A move of a group onto an aromatic ring is offered ONLY in that last case: the
round 2 options that put an OH on the ring after LiAlH4 were changes no reagent
on the card makes. A reaction for which no pair survives gets no predict step,
and the script prints it: a weak question is worse than no question.
"""

from __future__ import annotations

import json
import sys
from itertools import combinations
from pathlib import Path

from rdkit import Chem, DataStructs, RDLogger
from rdkit.Chem import AllChem, rdFMCS, rdMolDescriptors
from rdkit.Chem import rdFingerprintGenerator

sys.path.insert(0, str(Path(__file__).resolve().parent))
from build_curriculum import REAGENT_STRUCTURES, render_svg  # noqa: E402  (same drawing code as the cards)

RDLogger.DisableLog("rdApp.*")

ROOT = Path(__file__).resolve().parent.parent
REACTIONS_TS = ROOT / "src" / "data" / "reactions.ts"
ART = ROOT / "public" / "cards" / "predict"
OUT = ROOT / "src" / "game" / "cards" / "predictDistractors.generated.ts"

# Rule 4's tie band, in Tanimoto units. 0.05 is the margin the round 2 critic
# used to call one option "most similar to the start" (g6-heur), so a card
# that passes here is one that heuristic cannot call.
TIE = 0.05

# What balance() aims for: a look-alike strategy may score at most a third
# plus this, across the deck. The test's bound is looser (two standard errors
# of a fair three-way guess), so the generator leaves headroom under it.
BALANCE_TARGET = 1 / 3 + 0.05

# THE OPTION DRAWINGS, the answer's included, all in one style so no option
# can be told by how it is drawn. The canvas matches the row each sits in on a
# phone (cards.css .predict__art: 5.5rem tall), and the labels are a fixed 23,
# which comes out about 16 units tall, 11px or more at that size; the round 2
# options had 6px labels. cardsContrast.test.ts measures both from the files.
OPTION_WIDTH = 300
OPTION_HEIGHT = 128
OPTION_FONT_SIZE = 23

# Dark heteroatom colours for the option tiles. The Product tile is the
# progress green mixed into the dark card, darker than the reaction panel the
# registry's palette was chosen for, and its blue N measured 3.53:1 there.
# These are the same hues lifted until each clears 4.5:1 on that tile and on
# the dark card; cardsContrast.test.ts recomputes every fill in the files.
OPTION_DARK_HETERO = {
    5: (0.98, 0.80, 0.90),    # B
    7: (0.78, 0.84, 1.00),    # N
    8: (1.00, 0.76, 0.76),    # O
    9: (0.73, 0.97, 0.80),    # F
    15: (1.00, 0.80, 0.62),   # P
    16: (1.00, 0.94, 0.54),   # S
    17: (0.73, 0.97, 0.80),   # Cl
    35: (1.00, 0.84, 0.70),   # Br
    53: (0.91, 0.84, 1.00),   # I
}

# The SMARTS transforms: (key, caption, SMARTS list), each applied to the
# ANSWER. Each caption says what the drawing is relative to the answer, so the
# after-pick screen teaches rather than only marking.
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
        # H-C-C=X  ->  C=C-X-H, for X = O or N (enol, enamine), on a ketone,
        # aldehyde or imine carbon only: the "enol" of an acid or ester is an
        # ene-diol nobody draws (round 2's propene-1,1-diol on malonic ester).
        ["[CX4;!H0:1]-[C;!$(C-[O,N]):2]=[O,N:3]>>[C:1]=[C:2]-[*:3]"],
    ),
    (
        "reduced",
        "One reduction too far",
        # C=X -> C-X and C#X -> C=X, non-aromatic.
        ["[C;!a:1]=[O,N,C;!a:2]>>[C:1]-[*:2]", "[C;!a:1]#[N,C;!a:2]>>[C:1]=[*:2]"],
    ),
    (
        "oxidised",
        "One oxidation too far",
        # An aldehyde taken on to the acid: the PCC-against-chromic-acid
        # question. Offered only where the card carries an oxidant (rule 7).
        ["[CX3;H1;!a:1]=[O:2]>>[C:1](=[O:2])O"],
    ),
    (
        "reversed",
        "The same ester or amide written the other way round",
        # R-C(=O)-X-R'  ->  R-X-C(=O)-R' : which side carries the C=O, the
        # half of an ester or amide a student most often draws backwards.
        ["[c,C:1][C:2](=[O:3])[O,N:4][CX4,c:5]>>[*:1][*:4][C:2](=[O:3])[*:5]"],
    ),
    (
        "unsaturated",
        "A double bond the conditions do not make",
        ["[CX4;!H0;!R:1]-[CX4;!H0;!R:2]>>[C:1]=[C:2]"],
    ),
]

# Code-built kinds; see group_edits(), additions(), and candidates().
CAPTIONS = {
    "regio": "The same group on a different carbon",
    "twice": "Substituted twice",
    "branch": "The same carbons, branched differently",
    "intermediate": "An intermediate: the reaction stops short",
    "half": "Halfway: one of the two new C–O bonds",
    "on-oxygen": "The new group on the oxygen instead",
    "1,2-adduct": "1,2-addition: the nucleophile on the C=O carbon",
    "alpha-adduct": "The nucleophile on the alpha carbon, not the beta",
    "two-two": "A [2+2] four-ring instead of the [4+2] six-ring",
    "other-end": "The ring opened at its other carbon",
    "hetero": "The C=O as the diene's partner instead of the C=C",
    "over": "The reagent adding a second time",
}

# Preference: real competing outcomes of this reaction first (the other allyl
# end, stopping short, a sibling reagent's product, the reagent's other way of
# reacting), then plausible misplacements, then the rest.
PRIORITY = [
    "allylic", "intermediate", "1,2-adduct", "hetero", "over", "alpha-adduct", "two-two", "other-end", "half", "sibling", "addition", "ring-site", "on-oxygen",
    "shifted", "reversed", "regio", "twice", "tautomer", "reduced", "oxidised", "branch", "unsaturated",
]


def rank(kind: str) -> int:
    """PRIORITY position of a kind; "sibling:reduction" ranks as "sibling"."""
    return PRIORITY.index(kind.split(":")[0])


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


def group_edits(mol, mode: str, onto_ring: bool = False) -> list[str]:
    """
    Structures made by moving or copying one substituent:

      regio   a heteroatom group moved to another carbon that carries an H
              (bromo on C2 instead of C1)
      twice   a carbon-free, uncharged heteroatom group on an aromatic ring
              copied onto a second ring carbon (over-substitution)
      branch  in a pure hydrocarbon, a methyl moved to another carbon (the
              same carbons, a different skeleton)

    `onto_ring` picks the target carbons for regio and branch: chain carbons
    when False (the default, and the only moves offered unless the registry
    shows the reagent substituting a ring), aromatic ring carbons when True.
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
                out.update(_edits_across(mol, a, x, mode, hydrocarbon, onto_ring))
    return sorted(out)


def _edits_across(mol, a, x, mode: str, hydrocarbon: bool, onto_ring: bool) -> set[str]:
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
            if target.GetIsAromatic() != onto_ring:
                continue
            # A chain move keeps the group's kind: OH from one sp3 carbon to
            # another, not off a carboxyl carbon onto the chain, which turns
            # an acid into a hydroxy aldehyde (round 2's lactaldehyde on the
            # malonic ester card) rather than misplacing a group.
            if not onto_ring and target.GetHybridization() != a.GetHybridization():
                continue
            moved = Chem.RWMol(cut)
            moved.AddBond(b, x.GetIdx(), Chem.BondType.SINGLE)
            smiles = _finish(moved)
        if smiles is not None:
            out.add(smiles)
    return out


def additions(start_smiles: str, halogen: str) -> list[str]:
    """
    The halogen added across each C=C of the start, X on both carbons: what a
    student writes who treats the card's reagent as an X2 addition. Aromatic
    rings are kekulised first, so benzene offers the dibromocyclohexadiene
    that eas-bromination's own note names ("substitution, not addition").
    """
    mol = Chem.MolFromSmiles(start_smiles)
    if mol is None:
        return []
    Chem.Kekulize(mol, clearAromaticFlags=True)
    smarts = f"[C:1]=[C:2]>>[{halogen}][C:1]-[C:2][{halogen}]"
    return smarts_products(mol, smarts)


def x2_source(rxn: dict) -> str | None:
    """
    The halogen this reaction's reagent can deliver as X2, or None. Read from
    the drawn reagent structures: a halogen bonded to a halogen (Br2) or to N
    (NBS, whose own note names ionic addition as the competing path). HBr,
    PBr3 and bromide qualify as neither, so no card gets an addition its
    reagent cannot make.
    """
    for st in rxn["stages"]:
        for token in st["reagents"]:
            entry = REAGENT_STRUCTURES.get(token)
            mol = Chem.MolFromSmiles(entry[0]) if entry is not None else None
            if mol is None:
                continue
            for atom in mol.GetAtoms():
                if atom.GetSymbol() in ("Cl", "Br", "I") and any(
                    n.GetSymbol() in ("Cl", "Br", "I", "N") for n in atom.GetNeighbors()
                ):
                    return atom.GetSymbol()
    return None


def added_on_oxygen(answer_smiles: str, start_smiles: str) -> list[str]:
    """
    The group the reaction added, moved onto an O or N that carries an H: what
    a student writes who has the nucleophile attack the carbonyl OXYGEN (the
    methyl ether after a Grignard, the cyanate after cyanide). The added group
    is found, not named: the answer's atoms outside its largest common
    substructure with the start. Offered only when that is one group on one
    bond, so the move is a single, visible edit.
    """
    answer = Chem.MolFromSmiles(answer_smiles)
    start = Chem.MolFromSmiles(start_smiles)
    if answer is None or start is None:
        return []
    found = rdFMCS.FindMCS(
        [answer, start], timeout=2, bondCompare=rdFMCS.BondCompare.CompareAny, ringMatchesRingOnly=True
    )
    core = answer.GetSubstructMatch(Chem.MolFromSmarts(found.smartsString))
    added = {a.GetIdx() for a in answer.GetAtoms()} - set(core)
    if not added or not core:
        return []
    cut = [b for b in answer.GetBonds() if (b.GetBeginAtomIdx() in added) != (b.GetEndAtomIdx() in added)]
    if len(cut) != 1 or cut[0].GetBondType() != Chem.BondType.SINGLE:
        return []
    bond = cut[0]
    x = bond.GetBeginAtomIdx() if bond.GetBeginAtomIdx() in added else bond.GetEndAtomIdx()
    a = bond.GetOtherAtomIdx(x)
    out: set[str] = set()
    for target in core:
        atom = answer.GetAtomWithIdx(target)
        if target == a or atom.GetSymbol() not in ("O", "N") or atom.GetTotalNumHs() == 0:
            continue
        moved = Chem.RWMol(answer)
        moved.RemoveBond(a, x)
        moved.AddBond(target, x, Chem.BondType.SINGLE)
        smiles = _finish(moved)
        if smiles is not None:
            out.add(smiles)
    return sorted(out)


def _loose(mol):
    """A query of `mol`'s atoms with every bond loosened to "any"."""
    query = Chem.RWMol(Chem.MolFromSmarts(Chem.MolToSmarts(mol)))
    for bond in query.GetBonds():
        bond.SetQuery(Chem.MolFromSmarts("[*]~[*]").GetBondWithIdx(0))
    return query


def conjugate_misplacements(rxn: dict) -> list[tuple[str, str]]:
    """
    THE 1,2 vs 1,4 FAMILY (round 6). On a conjugate addition the nucleophile
    can also add to the C=O carbon of the enone: the 1,2-adduct, the textbook
    Michael trap. Derived, not typed: the enone start is found in the
    conjugate-addition product (the answer on a plain conjugate addition, the
    registry's intermediate on a sequence that starts with one), the bond the
    nucleophile made to the beta carbon is moved to the C=O carbon, the C=C
    is restored and the C=O becomes C-OH. The same cut also gives the
    "alpha-adduct": the nucleophile on the alpha carbon instead of the beta,
    the other carbon of the C=C a student can put it on.
    """
    if "conjugate addition" not in rxn["reaction_type"]:
        return []
    adducts = [rxn["product"]] if rxn["reaction_type"] == "conjugate addition" else rxn.get("intermediates", [])
    enone_smarts = Chem.MolFromSmarts("[CX3;!a]=[CX3;!a]-[CX3;!a]=[OX1]")
    out: set[tuple[str, str]] = set()
    for start in rxn["reactants"]:
        e_mol = Chem.MolFromSmiles(start)
        hit0 = e_mol.GetSubstructMatch(enone_smarts) if e_mol is not None else ()
        if not hit0:
            continue
        beta, alpha, carbonyl, oxygen = hit0
        query = _loose(e_mol)
        for smiles in adducts:
            mol = Chem.MolFromSmiles(smiles)
            if mol is None:
                continue
            for hit in mol.GetSubstructMatches(query, uniquify=False):
                # The enone keeps its ring membership: an acyclic enone's
                # image must not be laid over the other start's ring.
                if any(mol.GetAtomWithIdx(m).IsInRing() != e_mol.GetAtomWithIdx(i).IsInRing() for i, m in enumerate(hit)):
                    continue
                b, a, c, o = hit[beta], hit[alpha], hit[carbonyl], hit[oxygen]
                if mol.GetBondBetweenAtoms(c, o).GetBondType() != Chem.BondType.DOUBLE:
                    continue
                if mol.GetBondBetweenAtoms(b, a).GetBondType() != Chem.BondType.SINGLE:
                    continue
                outside = [n.GetIdx() for n in mol.GetAtomWithIdx(b).GetNeighbors() if n.GetIdx() not in hit]
                if len(outside) != 1 or mol.GetAtomWithIdx(outside[0]).GetSymbol() != "C":
                    continue
                nu = outside[0]
                edit = Chem.RWMol(mol)
                Chem.Kekulize(edit, clearAromaticFlags=True)
                edit.RemoveBond(b, nu)
                edit.GetBondBetweenAtoms(b, a).SetBondType(Chem.BondType.DOUBLE)
                edit.GetBondBetweenAtoms(c, o).SetBondType(Chem.BondType.SINGLE)
                edit.AddBond(nu, c, Chem.BondType.SINGLE)
                made = _finish(edit)
                if made is not None:
                    out.add(("1,2-adduct", made))
                moved = Chem.RWMol(mol)
                moved.RemoveBond(b, nu)
                moved.AddBond(nu, a, Chem.BondType.SINGLE)
                made = _finish(moved)
                if made is not None:
                    out.add(("alpha-adduct", made))
    return sorted(out)


def other_cycloadducts(rxn: dict) -> list[tuple[str, str]]:
    """
    THE OTHER 2-PI PARTNER (round 6). On a Diels-Alder whose dienophile also
    carries a C=O, the diene can close onto the C=O instead of the C=C: a
    hetero-Diels-Alder dihydropyran. Derived by running the same [4+2] on the
    card's own starts with the C=O as the 2-pi component. "two-two" is the
    other wrong ring the same two starts can be drawn closing: a [2+2]
    cyclobutane from one C=C of the diene and the dienophile's C=C, the
    thermally forbidden mode the card's "one concerted step" rules out.
    """
    if "cycloaddition" not in rxn["reaction_type"]:
        return []
    modes = [
        ("hetero", AllChem.ReactionFromSmarts(
            "[C:1]=[C:2]-[C:3]=[C:4].[C:5]=[O:6]>>[C:1]1-[C:2]=[C:3]-[C:4]-[O:6]-[C:5]-1")),
        ("two-two", AllChem.ReactionFromSmarts(
            "[C:1]=[C:2]-[C:3]=[C:4].[C:5]=[C:6]>>[C:1]1-[C:2](-[C:3]=[C:4])-[C:6]-[C:5]-1")),
    ]
    mols = [Chem.MolFromSmiles(s) for s in rxn["reactants"]]
    out: set[tuple[str, str]] = set()
    for i, diene in enumerate(mols):
        for j, partner in enumerate(mols):
            if i == j or diene is None or partner is None:
                continue
            for kind, mode in modes:
                for products in mode.RunReactants((diene, partner)):
                    made = canonical(Chem.Mol(products[0]))
                    if made is not None and "." not in made:
                        out.add((kind, made))
    return sorted(out)


def other_end_openings(rxn: dict) -> list[str]:
    """
    THE OTHER CARBON OF A THREE-RING (round 6). An epoxide opened by a
    nucleophile can break at either C-O bond, and which one is the question
    (base: the less hindered carbon; acid: the more substituted one). The
    start's epoxide is found in the answer, and the ring O and the
    nucleophile trade carbons.
    """
    epoxide = Chem.MolFromSmarts("[C:1]1-[O:2]-[C:3]-1")
    out: set[str] = set()
    answer = Chem.MolFromSmiles(rxn["product"])
    for start in rxn["reactants"]:
        s_mol = Chem.MolFromSmiles(start)
        ring = s_mol.GetSubstructMatch(epoxide) if s_mol is not None else ()
        if not ring or answer is None:
            continue
        for broken in (ring[0], ring[2]):
            # The start with one ring C-O bond cut is what the answer contains.
            cut = Chem.RWMol(s_mol)
            cut.RemoveBond(broken, ring[1])
            hits = answer.GetSubstructMatches(_loose(cut.GetMol()), uniquify=False)
            out.update(_swap_opening(answer, hits, ring[1], ring[2] if broken == ring[0] else ring[0], broken))
    return sorted(out)


def _swap_opening(answer, hits, o_index: int, kept_index: int, opened_index: int) -> set[str]:
    """other_end_openings for one cut: the ring O and the nucleophile trade carbons."""
    out: set[str] = set()
    for hit in hits:
        o, kept, opened = hit[o_index], hit[kept_index], hit[opened_index]
        nucs = [n.GetIdx() for n in answer.GetAtomWithIdx(opened).GetNeighbors() if n.GetIdx() not in hit]
        if len(nucs) != 1:
            continue
        swap = Chem.RWMol(answer)
        swap.RemoveBond(o, kept)
        swap.RemoveBond(nucs[0], opened)
        swap.AddBond(o, opened, Chem.BondType.SINGLE)
        swap.AddBond(nucs[0], kept, Chem.BondType.SINGLE)
        made = _finish(swap)
        if made is not None:
            out.add(made)
    return out


def half_acetal(answer_smiles: str) -> list[str]:
    """
    A cyclic acetal opened at one ring C-O bond, OH on the carbon: the
    hemiacetal a student stops at, one of the two new C-O bonds made. Exempt
    from the UNSTABLE filter, because stopping there is the error it names.
    """
    mol = Chem.MolFromSmiles(answer_smiles)
    if mol is None:
        return []
    out: set[str] = set()
    for bond in mol.GetBonds():
        if not bond.IsInRing() or bond.GetBondType() != Chem.BondType.SINGLE:
            continue
        for c, o in ((bond.GetBeginAtom(), bond.GetEndAtom()), (bond.GetEndAtom(), bond.GetBeginAtom())):
            if c.GetSymbol() != "C" or o.GetSymbol() != "O":
                continue
            if sum(1 for n in c.GetNeighbors() if n.GetSymbol() == "O") != 2:
                continue
            opened = Chem.RWMol(mol)
            opened.RemoveBond(c.GetIdx(), o.GetIdx())
            hydroxyl = opened.AddAtom(Chem.Atom(8))
            opened.AddBond(c.GetIdx(), hydroxyl, Chem.BondType.SINGLE)
            smiles = _finish(opened)
            if smiles is not None:
                out.add(smiles)
    return sorted(out)


# Structures no student should be offered even as a wrong answer, because they
# are not isolable products: a gem-diol, a hemiacetal or hemiaminal, and an
# alpha-halo alcohol. A transform can make them; the filter drops them. A
# registry intermediate is exempt, since the data itself records it.
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


_MORGAN = rdFingerprintGenerator.GetMorganGenerator(radius=2, fpSize=2048)


def similarity(smiles: str, starts: list[str]) -> float:
    """Rule 4's measure: Morgan (radius 2) Tanimoto to the closest start, 3 places."""
    fp = _MORGAN.GetFingerprint(Chem.MolFromSmiles(smiles))
    best = max(
        DataStructs.TanimotoSimilarity(fp, _MORGAN.GetFingerprint(Chem.MolFromSmiles(s))) for s in starts
    )
    return round(best, 3)


def _ring_groups(mol) -> tuple[int, ...]:
    """How many bonds leave each ring, sorted: the 'one group or two' a student counts."""
    out = []
    for ring in mol.GetRingInfo().AtomRings():
        members = set(ring)
        out.append(sum(1 for i in ring for n in mol.GetAtomWithIdx(i).GetNeighbors() if n.GetIdx() not in members))
    return tuple(sorted(out))


def eyeball(smiles: str, start: str) -> dict[str, object]:
    """Rule 3's features: everything a non-chemist can count or match by eye."""
    mol = Chem.MolFromSmiles(smiles)
    start_mol = Chem.MolFromSmiles(start)
    ring_info = mol.GetRingInfo()
    return {
        "formula": rdMolDescriptors.CalcMolFormula(mol),
        "rings": ring_info.NumRings(),
        "aromatic rings": rdMolDescriptors.CalcNumAromaticRings(mol),
        "groups per ring": _ring_groups(mol),
        "start ring pattern kept": start_mol.GetRingInfo().NumRings() > 0 and _ring_groups(mol) == _ring_groups(start_mol),
        "charge": Chem.GetFormalCharge(mol),
    }


def odd_one_out(answer: dict, first: dict, second: dict) -> list[str]:
    """The features on which the answer differs while the two wrong options agree."""
    return [k for k in answer if first[k] == second[k] and answer[k] != first[k]]


def ring_substituting_reaction(rxn: dict, registry: list[dict]) -> dict | None:
    """
    Another registry reaction whose type is aromatic substitution and that
    shares a drawn reagent with this one, or None. When it exists, the data
    says this reagent also puts its group on a ring, so that site is a real
    competing outcome (Br2 on acetophenone: the alpha carbon or the ring).
    """
    mine = {t for st in rxn["stages"] for t in st["reagents"] if t in REAGENT_STRUCTURES}
    for other in sorted(registry, key=lambda r: r["id"]):
        if other["id"] == rxn["id"] or "aromatic substitution" not in other["reaction_type"]:
            continue
        theirs = {t for st in other["stages"] for t in st["reagents"]}
        if mine & theirs:
            return other
    return None


Candidate = tuple[str, str, str, str]  # (kind, caption, smiles, source)


def _carbons(smiles: str) -> int:
    mol = Chem.MolFromSmiles(smiles)
    return 0 if mol is None else sum(1 for atom in mol.GetAtoms() if atom.GetSymbol() == "C")


def carbon_shift(rxn: dict) -> int:
    """
    How far rule 1 lets a wrong option's carbon count stray past the span
    from the start's count to the answer's: 0 unless the reaction moves
    carbon, read from the registry's own balance.
    It moves carbon when a species it consumes that is not a start carries
    carbon (CH3- of a Grignard or Gilman, the ylide, the acetylide, cyanide,
    methylamine, CH3I) or a byproduct does (the methanol an ester reduction
    loses, the CO2 of a decarboxylation). The amount is the carbons between
    the first start and the answer, so a Gilman card may offer a structure one
    carbon away (the second methyl), not twenty (the ylide's phenyls), and a
    malonic ester card the methylated diester it passes through.
    """
    starts = {canonical(Chem.MolFromSmiles(s)) for s in rxn["reactants"]}
    product = canonical(Chem.MolFromSmiles(rxn["product"]))
    consumed = [s for s in rxn.get("balance_lhs", []) if canonical(Chem.MolFromSmiles(s) or Chem.Mol()) not in starts]
    released = [s for s in rxn.get("balance_rhs", []) if canonical(Chem.MolFromSmiles(s) or Chem.Mol()) != product]
    if not any(_carbons(s) > 0 for s in consumed + released):
        return 0
    return abs(_carbons(rxn["product"]) - _carbons(rxn["reactants"][0]))


def passes_rule_1(smiles: str, rxn: dict) -> bool:
    """Rule 1: the answer's elements exactly, and its carbons as carbon_shift() allows."""
    mine, target = signature(smiles), signature(rxn["product"])
    if mine is None or target is None or mine[0] != target[0]:
        return False
    shift = carbon_shift(rxn)
    if shift == 0:
        return mine[1] == target[1]
    start = _carbons(rxn["reactants"][0])
    return min(start, target[1]) - shift <= mine[1] <= max(start, target[1]) + shift


def candidates(rxn: dict, registry: list[dict]) -> list[Candidate]:
    """Every wrong option that passes rule 1, in PRIORITY order."""
    answer = Chem.MolFromSmiles(rxn["product"])
    answer_smiles = canonical(Chem.Mol(answer))
    if answer_smiles is None or signature(rxn["product"]) is None:
        return []
    starts = {canonical(Chem.MolFromSmiles(s)) for s in rxn["reactants"]}
    found: list[Candidate] = []
    seen = {answer_smiles} | starts | own_products(rxn, registry)  # rule 6
    answer_class = {**species_class(rxn["product"]), "new ether": new_ether(rxn["product"], rxn)}
    supply = carbon_supply(rxn)

    def keep(key: str, caption: str, smiles: str | None, source: str, check_stable: bool = True) -> None:
        if smiles is None or smiles in seen or not passes_rule_1(smiles, rxn):
            return
        if check_stable and not stable(smiles):
            return
        if {**species_class(smiles), "new ether": new_ether(smiles, rxn)} != answer_class:
            return  # rule 5
        if needs_absent_reagent(key, rxn) or (key != "over" and _carbons(smiles) > supply):
            return  # rule 7
        if carbonyl_gains_h(smiles, rxn) and not has_reductant(rxn):
            return  # rule 7, a reduction hidden inside another edit
        seen.add(smiles)
        found.append((key, caption, smiles, source))

    # The registry's own record of this reaction and its start come first, so
    # a structure that is also reachable by an edit keeps the caption that
    # says what it really is.
    for smiles in rxn.get("intermediates", []):
        keep("intermediate", CAPTIONS["intermediate"], canonical(Chem.MolFromSmiles(smiles)), rxn["id"], False)
    first_start = rxn["reactants"][0]
    for other in sorted(registry, key=lambda r: r["id"]):
        # A sibling starts from the same compound: what a different reagent
        # really does to it. Other reactions' products are NOT offered: the
        # round 2 critic found them unrelated to the card (a cyanohydrin
        # beside an amide), and an unrelated drawing is eliminated on sight.
        # Its kind carries the sibling's reaction type, so two siblings are two
        # different errors (taking LiAlH4 for DIBAL-H, or for hydrolysis), and
        # rule 2 treats them so; rule 3 still checks what the eye can count.
        if other["id"] != rxn["id"] and other["reactants"][0] == first_start:
            keep(f"sibling:{other['reaction_type']}", f"What {other['name']} gives",
                 canonical(Chem.MolFromSmiles(other["product"])), other["id"])
    # The same reagent acting again: a registry reaction that starts from THIS
    # answer and consumes a carbon-carrying species this one consumes too
    # (Gilman's methyl added twice is the Grignard's tertiary alcohol, the
    # thing the card's own note says the cuprate exists to prevent).
    mine = {canonical(Chem.MolFromSmiles(s) or Chem.Mol()) for s in rxn.get("balance_lhs", []) if _carbons(s) > 0}
    for other in sorted(registry, key=lambda r: r["id"]):
        theirs = {canonical(Chem.MolFromSmiles(s) or Chem.Mol()) for s in other.get("balance_lhs", []) if _carbons(s) > 0}
        if other["id"] != rxn["id"] and canonical(Chem.MolFromSmiles(other["reactants"][0])) == answer_smiles and (mine & theirs) - starts:
            keep("over", CAPTIONS["over"], canonical(Chem.MolFromSmiles(other["product"])), other["id"])
    # An alkyl halide the card consumes, adding a second time at the answer's
    # enolisable carbon: the dialkylation one equivalent of CH3I is there to
    # avoid on the malonic ester card. Same kind as above: this card's own
    # reagent acting again.
    twice = AllChem.ReactionFromSmarts("[CX4;!H0:1]-[CX3:2]=[O:3].[CX4:4]-[Cl,Br,I]>>[C:4]-[C:1]-[C:2]=[O:3]")
    for halide in rxn.get("balance_lhs", []):
        reagent = Chem.MolFromSmiles(halide)
        if reagent is None or canonical(Chem.Mol(reagent)) in starts:
            continue
        for products in twice.RunReactants((answer, reagent)):
            keep("over", CAPTIONS["over"], canonical(Chem.Mol(products[0])), "derived")
    for smiles in half_acetal(rxn["product"]):
        keep("half", CAPTIONS["half"], smiles, "derived", False)
    for kind, smiles in conjugate_misplacements(rxn) + other_cycloadducts(rxn):
        keep(kind, CAPTIONS[kind], smiles, "derived")
    for smiles in other_end_openings(rxn):
        keep("other-end", CAPTIONS["other-end"], smiles, "derived")
    # The card's own X2 halogenating the same alpha carbon again: the
    # polyhalogenation the alpha-halogenation card's own note contrasts
    # (acid stops at one, base runs on). Same kind as CH3I acting twice.
    halogen = x2_source(rxn)
    if halogen is not None:
        again = f"[CX4;!H0:1](-[{halogen}:2])-[CX3:3]=[O:4]>>[C:1](-[{halogen}:2])({halogen})-[C:3]=[O:4]"
        for smiles in smarts_products(answer, again):
            keep("over", CAPTIONS["over"], smiles, "derived")
    for start in rxn["reactants"]:
        for smiles in added_on_oxygen(rxn["product"], start):
            keep("on-oxygen", CAPTIONS["on-oxygen"], smiles, "derived")
    halogen = x2_source(rxn)
    if halogen is not None:
        for start in rxn["reactants"]:
            for smiles in additions(start, halogen):
                keep("addition", f"{halogen}2 added across a double bond instead", smiles, "derived")
    ring_reaction = ring_substituting_reaction(rxn, registry)
    if ring_reaction is not None:
        for smiles in group_edits(answer, "regio", onto_ring=True):
            keep("ring-site", f"On the ring instead, as in {ring_reaction['name']}", smiles, ring_reaction["id"])
    for key, caption, smarts_list in TRANSFORMS:
        for smarts in smarts_list:
            for smiles in smarts_products(answer, smarts):
                keep(key, caption, smiles, "derived")
    for key in ("regio", "branch"):
        for smiles in group_edits(answer, key):
            keep(key, CAPTIONS[key], smiles, "derived")
    # Over-substitution only where the reaction itself substitutes a ring:
    # round 2 offered two dibromobenzenes on the Sandmeyer card, where one N2
    # leaves and one Br arrives and a second Br has nowhere to come from.
    if "aromatic substitution" in rxn["reaction_type"]:
        for smiles in group_edits(answer, "twice"):
            keep("twice", CAPTIONS["twice"], smiles, "derived")
    return sorted(found, key=lambda entry: rank(entry[0]))


# RULE 5 (round 5): no option class that only wrong options carry. The round 3
# critic found answers never charged and never enols while eight wrong options
# were alkoxides or enols, so "never pick the charged one or the enol" beat
# chance (0.45 against 0.33) with no chemistry. A wrong option must match the
# answer on each class below. Rule 3 compared counts per card; this compares
# what KIND of species the drawing is, which a student learns across a deck.
# ENOL_FORM covers enols, enolates and enamines: C=C with O or N on it.
ENOL_FORM = Chem.MolFromSmarts("[CX3]=[CX3]-[OX2H1,OX1-,NX3;H1,H2]")


def species_class(smiles: str) -> dict[str, object]:
    """The classes rule 5 compares: net formal charge and enol/enamine form."""
    mol = Chem.MolFromSmiles(smiles)
    return {"charge": Chem.GetFormalCharge(mol), "enol": mol.HasSubstructMatch(ENOL_FORM)}


# An ether oxygen: two carbons, neither of them a C=O or C=N carbon (so an
# ester's or an acid's O is not one). Acetals and epoxides count: both are
# a C-O-C a student sees.
ETHER = Chem.MolFromSmarts("[OX2;!$(O[#6]=[O,N])]([#6;!$([#6]=[O,N])])[#6;!$([#6]=[O,N])]")


def _ethers(smiles: str) -> int:
    mol = Chem.MolFromSmiles(smiles)
    return 0 if mol is None else len(mol.GetSubstructMatches(ETHER))


def new_ether(smiles: str, rxn: dict) -> bool:
    """
    RULE 5's third class (round 6): more ether oxygens than any start has.
    The round 4 critic found every new C-O-C on a wrong option ("on-oxygen")
    and none on an answer, so "never pick the new ether" beat chance.
    """
    return _ethers(smiles) > max(_ethers(s) for s in rxn["reactants"])


def has_reductant(rxn: dict) -> bool:
    """The registry's own flag and type: does this card carry a reductant."""
    return bool(rxn["redox"]) and "reduction" in rxn["reaction_type"]


_CARBONYL = Chem.MolFromSmarts("[CX3;!a]=[OX1]")


def carbonyl_gains_h(smiles: str, rxn: dict) -> bool:
    """
    RULE 7, round 6: True when the option gives a start's C=O carbon an H it
    did not have, which is a reduction whatever the edit is called (the
    critic's "on-oxygen" methyl ether: the carbonyl carbon became CH-O).
    Each start with a C=O is matched into the option by its atoms with every
    bond loosened; a C=O carbon "keeps" when some match lands it on a carbon
    with no more H than it had. A start used twice (aldol) needs two keeping
    images. A start the option does not contain says nothing: a skeleton
    change is rules 1 to 4's business, not this one's.
    """
    mol = Chem.MolFromSmiles(smiles)
    if mol is None:
        return False
    counts: dict[str, int] = {}
    for start in rxn["reactants"]:
        key = canonical(Chem.MolFromSmiles(start))
        counts[key] = counts.get(key, 0) + 1
    for key, uses in counts.items():
        start = Chem.MolFromSmiles(key)
        sites = [hit[0] for hit in start.GetSubstructMatches(_CARBONYL)]
        if not sites:
            continue
        query = _loose(start)
        images: set[int] = set()
        kept: set[int] = set()
        for hit in mol.GetSubstructMatches(query, uniquify=False, maxMatches=10000):
            for site in sites:
                image = hit[site]
                images.add(image)
                if mol.GetAtomWithIdx(image).GetTotalNumHs() <= start.GetAtomWithIdx(site).GetTotalNumHs():
                    kept.add(image)
        if images and len(kept) < min(uses * len(sites), len(images)):
            return True
    return False


def own_products(rxn: dict, registry: list[dict]) -> set[str]:
    """
    RULE 6 (round 5): what this card's own data or mechanism makes, so never a
    WRONG option. The round 3 critic found the NBS card marking 1-bromobut-2-ene
    wrong, a product of the card's own allylic radical. Listed here:
      - every species the balance releases, and the product;
      - the product of any registry reaction from the same start with the same
        reagents (the same experiment written twice);
      - for a RADICAL substitution, the other end of the allyl system: the
        radical the mechanism makes is delocalised over both ends and nothing on
        the card picks one. The diene + HBr card is different on purpose: its
        data records the cation AND names the condition that picks the end
        (temperature), which is the question it asks.
    """
    out = {canonical(Chem.MolFromSmiles(s)) for s in [rxn["product"], *rxn.get("balance_rhs", [])]}
    reagents = sorted(t for st in rxn["stages"] for t in st["reagents"])
    for other in registry:
        same = other["reactants"] == rxn["reactants"]
        if same and sorted(t for st in other["stages"] for t in st["reagents"]) == reagents:
            out.add(canonical(Chem.MolFromSmiles(other["product"])))
    if "radical" in rxn["reaction_type"]:
        answer = Chem.MolFromSmiles(rxn["product"])
        for _key, _caption, smarts_list in (t for t in TRANSFORMS if t[0] == "allylic"):
            for smarts in smarts_list:
                out.update(smarts_products(answer, smarts))
    out.discard(None)
    return out


def carbon_supply(rxn: dict) -> int:
    """
    RULE 7 (round 5): the most carbons a wrong option may hold, what the card's
    starts and its consumed reagents supply between them, one equivalent each.
    The Grignard card offered the ethylene ketal, two carbons from a diol the
    card never shows; rule 1's window allowed it because CH3- moves ONE.
    "over" is exempt: it is this card's own reagent adding a second time.
    """
    starts = {canonical(Chem.MolFromSmiles(s)) for s in rxn["reactants"]}
    consumed = [s for s in rxn.get("balance_lhs", []) if canonical(Chem.MolFromSmiles(s) or Chem.Mol()) not in starts]
    return sum(_carbons(s) for s in rxn["reactants"]) + sum(_carbons(s) for s in consumed)


def needs_absent_reagent(kind: str, rxn: dict) -> bool:
    """
    RULE 7's other half: an edit that is itself a redox step needs that
    reagent on the card. "One reduction too far" with no reductant (the
    acetylide, cyanohydrin and Friedel-Crafts cards) and "a double bond the
    conditions do not make", which is an oxidation, with no oxidant: the
    registry's own redox flag and reaction type say which cards carry one.
    "One oxidation too far" is the same gate the other way round.
    """
    if kind == "reduced":
        return not (rxn["redox"] and "reduction" in rxn["reaction_type"])
    if kind in ("unsaturated", "oxidised"):
        return not (rxn["redox"] and "oxidation" in rxn["reaction_type"])
    return False


Pair = tuple[tuple[int, float], list[Candidate], dict[str, float]]


def valid_pairs(rxn: dict, found: list[Candidate]) -> list[Pair]:
    """
    Every pair that meets rules 2 to 4, best first: the lowest summed PRIORITY
    rank (the most believable kinds), then the pair closer to the start. Each
    carries the similarities, for balance() and for the generated file.
    """
    starts = rxn["reactants"]
    answer_sim = similarity(rxn["product"], starts)
    sims = {smiles: similarity(smiles, starts) for _, _, smiles, _ in found}
    looks = {smiles: eyeball(smiles, starts[0]) for _, _, smiles, _ in found}
    answer_eye = eyeball(rxn["product"], starts[0])
    out: list[Pair] = []
    for first, second in combinations(found, 2):
        if first[0] == second[0]:
            continue  # rule 2
        if odd_one_out(answer_eye, looks[first[2]], looks[second[2]]):
            continue  # rule 3
        if max(sims[first[2]], sims[second[2]]) < answer_sim - TIE:
            continue  # rule 4
        score = (rank(first[0]) + rank(second[0]), -(sims[first[2]] + sims[second[2]]))
        out.append((score, [first, second], {first[2]: sims[first[2]], second[2]: sims[second[2]], "answer": answer_sim}))
    return sorted(out, key=lambda pair: pair[0])


STRATEGIES = ("closest", "middle", "farthest")


def credit(sims: dict[str, float]) -> dict[str, float]:
    """
    What each look-alike strategy scores on one card: pick the option most
    like the start, the middle one, or the least like it. An exact tie splits
    the credit, as a coin would.
    """
    values = [("answer", sims["answer"])] + [(k, v) for k, v in sims.items() if k != "answer"]
    ordered = sorted(v for _, v in values)[::-1]
    out = {}
    for name, position in zip(STRATEGIES, range(3)):
        tied = [k for k, v in values if v == ordered[position]]
        out[name] = tied.count("answer") / len(tied)
    return out


def balance(choices: dict[str, list[Pair]]) -> dict[str, Pair]:
    """
    One pair per card, so that no look-alike strategy beats a guess across
    the deck. Starts from each card's best pair, then, while one strategy
    scores above BALANCE_TARGET, makes the single swap that lowers the worst
    strategy most at the least cost in believability.
    """
    picked = {rid: pairs[0] for rid, pairs in choices.items()}

    def worst(state: dict[str, Pair]) -> float:
        totals = {s: sum(credit(p[2])[s] for p in state.values()) for s in STRATEGIES}
        return max(totals.values()) / max(1, len(state))

    while worst(picked) > BALANCE_TARGET:
        best = None
        for rid, pairs in choices.items():
            for pair in pairs:
                if pair is picked[rid]:
                    continue
                trial = {**picked, rid: pair}
                key = (worst(trial), pair[0][0] - picked[rid][0][0])
                if key[0] < worst(picked) and (best is None or key < best[0]):
                    best = (key, rid, pair)
        if best is None:
            break
        picked[best[1]] = best[2]
    return picked


def art_name(smiles: str, theme: str) -> str:
    """
    A neutral filename from the structure alone. The answer is drawn here too,
    in the same style and the same folder, so neither the drawing nor its path
    tells it from the wrong options.
    """
    import hashlib

    return f"{hashlib.sha1(smiles.encode('utf-8')).hexdigest()[:12]}-{theme}.svg"


def draw_option(smiles: str) -> dict[str, str]:
    """Both themes of one option in the option style; the paths that drew."""
    out = {}
    for theme in ("light", "dark"):
        name = art_name(smiles, theme)
        if render_svg(
            smiles,
            ART / name,
            dark=(theme == "dark"),
            width=OPTION_WIDTH,
            height=OPTION_HEIGHT,
            font_size=OPTION_FONT_SIZE,
            dark_hetero=OPTION_DARK_HETERO,
        ):
            out[theme] = f"cards/predict/{name}"
    return out


def formula(smiles: str) -> str:
    return rdMolDescriptors.CalcMolFormula(Chem.MolFromSmiles(smiles))


HEADER = """// GENERATED by scripts/build_card_distractors.py. Do not edit by hand.
// The options for the Cards run's predict step, derived with RDKit; the rules
// they meet are in the script's header and pinned in test/cardsRun.test.ts.

export interface PredictDistractor {
  /** Canonical SMILES. Data for tests; never shown to a student. */
  readonly smiles: string;
  /** RDKit's formula of the same structure. */
  readonly formula: string;
  /** What this structure is relative to the answer, shown after the pick. */
  readonly caption: string;
  readonly kind: string;
  /** "derived", or the registry reaction this structure comes from. */
  readonly source: string;
  /** Morgan (radius 2) Tanimoto to the closest start, the rule 4 measure. */
  readonly similarity: number;
  /** Rule 5's classes, from RDKit: net formal charge, and enol/enamine form. */
  readonly charge: number;
  readonly enol: boolean;
  /** Rule 5, round 6: an ether oxygen none of the starts has. */
  readonly newEther: boolean;
  /** Rule 7, round 6: a start's C=O carbon gained an H (a hidden reduction). */
  readonly carbonylGainsH: boolean;
  readonly light?: string;
  readonly dark?: string;
}

/** The answer, drawn in the options' own style, and its similarity to the start. */
export interface PredictAnswer {
  readonly similarity: number;
  readonly charge: number;
  readonly enol: boolean;
  readonly newEther: boolean;
  /** Rule 6: what this card's own data or mechanism makes; never a wrong option. */
  readonly ownProducts: readonly string[];
  readonly light?: string;
  readonly dark?: string;
}

"""


def main() -> int:
    data = load_registry()
    registry = data["reactions"]
    table: dict[str, list[dict]] = {}
    answers: dict[str, dict] = {}
    gaps: list[str] = []
    # Every file here is this script's output, so stale drawings from an older
    # pick are cleared rather than left for nothing to point at.
    for old in ART.glob("*.svg"):
        old.unlink()
    choices: dict[str, list[Pair]] = {}
    for rxn in sorted(registry, key=lambda r: r["id"]):
        pairs = valid_pairs(rxn, candidates(rxn, registry))
        if pairs:
            choices[rxn["id"]] = pairs
        else:
            gaps.append(rxn["id"])
            print(f"  GAP     {rxn['id']}: no pair of wrong options meets the rules; no predict step")
    picked = balance(choices)
    for rxn in sorted(registry, key=lambda r: r["id"]):
        if rxn["id"] not in picked:
            continue
        _score, chosen, sims = picked[rxn["id"]]
        entries = []
        for key, caption, smiles, source in chosen:
            entry = {"smiles": smiles, "formula": formula(smiles), "caption": caption, "kind": key,
                     "source": source, "similarity": sims[smiles], **species_class(smiles),
                     "newEther": new_ether(smiles, rxn), "carbonylGainsH": carbonyl_gains_h(smiles, rxn),
                     **draw_option(smiles)}
            entries.append(entry)
            print(f"  {rxn['id']:<28} {key:<12} {sims[smiles]:.2f} {smiles}")
        table[rxn["id"]] = entries
        answers[rxn["id"]] = {"similarity": sims["answer"], **species_class(rxn["product"]),
                              "newEther": new_ether(rxn["product"], rxn),
                              "ownProducts": sorted(own_products(rxn, registry)), **draw_option(rxn["product"])}
        print(f"  {'':<28} {'answer':<12} {sims['answer']:.2f} {rxn['product']}")

    body = (
        "export const PREDICT_DISTRACTORS: Readonly<Record<string, readonly PredictDistractor[]>> = "
        + json.dumps(table, indent=2, ensure_ascii=False)
        + ";\n\nexport const PREDICT_ANSWERS: Readonly<Record<string, PredictAnswer>> = "
        + json.dumps(answers, indent=2, ensure_ascii=False)
        + ";\n\n/** Registry reactions with no honest predict step: no pair of wrong options meets the rules. */\n"
        + "export const PREDICT_GAPS: readonly string[] = "
        + json.dumps(gaps)
        + ";\n"
    )
    OUT.write_text(HEADER + body, encoding="utf-8")
    print(f"wrote {OUT.relative_to(ROOT)}: {len(table)} reactions, {len(gaps)} gaps: {', '.join(gaps)}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
