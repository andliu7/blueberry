"""
Unit 7 guidebook drawings, derived with RDKit.

    python scripts/guide_u7.py          writes src/game/guide/u7Guide.figures.ts
    python scripts/guide_u7.py --check  rebuilds it in memory and fails if the file on disk differs

WHAT THIS SCRIPT OWNS. The mini example drawn under each Unit 7 lesson in the
guidebook. Each starting material is a SMILES; each product is MADE from it by
an RDKit reaction template, the same graph edit the Unit 7 pool script states
as its rule (scripts/u7_pools.py, rules A, C, E, H, R, K, B, O). Every drawn
structure carries the name the Unit 7 pool uses for it, and OPSIN must read
that name back as exactly the drawing, so the guide shows the pool's own
answer. A mismatch stops the script and nothing is written.

Where a rule picks between products (1,2 for a Grignard and 1,4 for a cuprate,
E for an HWE, which group a Baeyer-Villiger moves), the rule is the pool's
own, quoted in the guide words, and applied here by counting atoms.

WHAT IT DOES NOT OWN. The words: src/game/guide/u7Guide.ts, where every line
quotes a Unit 7 pool entry word for word (test/guideU7.test.ts holds that).
The drawing rules are Unit 1's (guide_u1.py, through guide_kit.py).

Every example is a draft (placeholder: true) until the owner signs it off.
"""
from __future__ import annotations

import sys

from rdkit import Chem

from guide_kit import PLUS, alkene_isomer, arrow, charge_edit, focus, header, named, only, react, run

# An aldehyde or ketone C=O: the carbon has no heteroatom single bonded to it.
CO = "[CX3;!$(C-[!#6;!#1]):1]=[OX1:2]"
# Colour the new bonds' atoms.
C_O = ("[#6]-[OX2]",)


def add(carbonyl: str, nu: str) -> str:
    """Rule A: the nucleophile bonds to the carbonyl carbon, C=O becomes C-O-."""
    return only(react(f"{CO}>>[C:1](-{nu})-[O-:2]", carbonyl))


def protonate(alkoxide: str) -> str:
    """Workup: H+ on the negative oxygen."""
    return charge_edit(alkoxide, "O", -1, 0)


def add_then_workup(carbonyl: str, nu: str) -> str:
    return protonate(add(carbonyl, nu))


def condense(carbonyl: str, new: str) -> str:
    """Rule C: the C=O oxygen leaves, the carbon takes `new` in its place."""
    return only(react(f"{CO}>>[C:1]{new}", carbonyl))


def migrator_rank(mol: Chem.Mol, atom: int) -> int:
    """The pool's migratory aptitude, quoted in the guide: H, then 3°, then 2°
    and aryl, then 1°, then methyl. Higher migrates. Counted off the graph."""
    a = mol.GetAtomWithIdx(atom)
    if a.GetIsAromatic():
        return 3
    carbons = sum(1 for n in a.GetNeighbors() if n.GetSymbol() == "C") - 1  # minus the carbonyl carbon
    return {0: 1, 1: 2, 2: 3, 3: 4}[carbons]


def baeyer_villiger(ketone: str) -> str:
    """Rule B: O inserted between the carbonyl carbon and the group that moves."""
    mol = Chem.MolFromSmiles(ketone)
    c, o = mol.GetSubstructMatch(Chem.MolFromSmarts(CO.replace(":1", "").replace(":2", "")))
    sides = [n.GetIdx() for n in mol.GetAtomWithIdx(c).GetNeighbors() if n.GetIdx() != o]
    ranks = sorted(((migrator_rank(mol, s), s) for s in sides), reverse=True)
    assert ranks[0][0] > ranks[1][0], f"{ketone}: the two groups tie, so the rule does not pick one"
    mover = ranks[0][1]
    rw = Chem.RWMol(mol)
    rw.RemoveBond(c, mover)
    new_o = rw.AddAtom(Chem.Atom(8))
    rw.AddBond(c, new_o, Chem.BondType.SINGLE)
    rw.AddBond(new_o, mover, Chem.BondType.SINGLE)
    Chem.SanitizeMol(rw)
    return Chem.MolToSmiles(rw)


def build() -> dict:
    ex: dict[str, dict] = {}
    acetone = "CC(C)=O"
    cyclohexanone = "O=C1CCCCC1"

    # STAGE A: adding to C=O.
    alkoxide = add(acetone, "C")
    ex["u7-mechanism"] = {
        "caption": "CH₃MgBr adds to propanone's carbonyl carbon and stops at the alkoxide. Workup with H₃O⁺ is its own step and gives the alcohol.",
        "panels": [
            named(acetone, "Propanone"), arrow("CH₃MgBr"), focus(named(alkoxide, "2-Methylpropan-2-olate")),
            {"kind": "break"},
            named(alkoxide, "2-Methylpropan-2-olate"), arrow("H₃O⁺", "workup"), focus(named(protonate(alkoxide), "2-Methylpropan-2-ol")),
        ],
    }
    ex["u7-hydration"] = {
        "caption": "Water adds across cyclohexanone's C=O: two OH groups on the old carbonyl carbon, a gem-diol.",
        "panels": [named(cyclohexanone, "Cyclohexanone"), arrow("H₂O", "trace H⁺"), focus(named(add_then_workup(cyclohexanone, "O"), "Cyclohexane-1,1-diol", hi=C_O))],
    }
    hemiacetal = add_then_workup("CCC=O", "OC")
    acetal = only(react("[C:1]-[OH]>>[C:1]-O-C", hemiacetal))
    ex["u7-acetal"] = {
        "caption": "One methanol gives the hemiacetal. With excess methanol and the water removed, the OH leaves and a second OCH₃ takes its place: the acetal.",
        "panels": [
            named("CCC=O", "Propanal"), arrow("CH₃OH", "H⁺"), focus(named(hemiacetal, "1-Methoxypropan-1-ol", hi=C_O)),
            {"kind": "break"},
            named(hemiacetal, "1-Methoxypropan-1-ol"), arrow("CH₃OH, H⁺", "water removed"), focus(named(acetal, "1,1-Dimethoxypropane", hi=C_O)),
        ],
    }
    acetophenone = "CC(=O)c1ccccc1"
    protected = condense(acetophenone, "1OCCO1")
    ex["u7-protect"] = {
        "caption": "Ethane-1,2-diol closes a five-membered acetal on the ketone. No C=O is left for a nucleophile, and H₃O⁺ takes it off again.",
        "panels": [named(acetophenone, "Acetophenone"), arrow("HOCH₂CH₂OH", "H⁺"), focus(named(protected, "2-Methyl-2-phenyl-1,3-dioxolane", hi=C_O))],
    }
    ester = baeyer_villiger(acetophenone)
    ex["u7-bv"] = {
        "caption": "mCPBA slips an O in beside the carbonyl carbon. Phenyl migrates before methyl, so the O lands between the C=O and the ring.",
        "panels": [named(acetophenone, "1-Phenylethan-1-one"), arrow("mCPBA"), focus(named(ester, "Phenyl acetate", hi=("[#6;R]-O-C=O",)))],
    }
    acid = only(react("[CX3H1:1]=[OX1:2]>>[C:1](=[O:2])-O", "CCCC=O"))
    ex["u7-ald-to-acid"] = {
        "caption": "Jones reagent turns the aldehyde C-H into C-OH: butanal becomes butanoic acid.",
        "panels": [named("CCCC=O", "Butanal"), arrow("CrO₃, H₂SO₄", "water"), focus(named(acid, "Butanoic acid", hi=("C(=O)O",)))],
    }
    dithio = condense(cyclohexanone, "1SCCS1")
    ex["u7-thioacetal"] = {
        "caption": "A dithiol makes a thioacetal just as a diol makes an acetal. Raney nickel then swaps both C-S bonds for C-H.",
        "panels": [
            named(cyclohexanone, "Cyclohexanone"), arrow("HSCH₂CH₂SH", "BF₃"), focus(named(dithio, "1,4-Dithiaspiro[4.5]decane", hi=("[#6]-[SX2]",))),
            {"kind": "break"},
            named(dithio, "1,4-Dithiaspiro[4.5]decane"), arrow("Raney Ni"), focus(named(only(react("[C:1](-S)-S>>[C:1]", dithio)), "Cyclohexane")),
        ],
    }

    # STAGE B: nitrogen nucleophiles.
    ex["u7-imine"] = {
        "caption": "A primary amine adds, water leaves, and N keeps a double bond to the old carbonyl carbon: an imine.",
        "panels": [named(cyclohexanone, "Cyclohexanone"), arrow("CH₃NH₂", "trace H⁺"), focus(named(condense(cyclohexanone, "=NC"), "N-Methylcyclohexanimine", hi=("C=N",)))],
    }
    ex["u7-derivative-tests"] = {
        "caption": "NH₂OH reacts like a primary amine: C=N-OH, an oxime. Every derivative is a C=N, named by the group on N.",
        "panels": [named(acetone, "Propanone"), arrow("NH₂OH"), focus(named(condense(acetone, "=NO"), "Propanone oxime", hi=("C=N",)))],
    }
    enamine = only(react("[CX3:1](=[OX1])-[C;!H0:3]>>[C:1](-N1CCCC1)=[C:3]", cyclohexanone))
    ex["u7-enamine"] = {
        "caption": "A secondary amine has no N-H left for the last step, so an alpha C-H goes instead and the C=C forms beside N: an enamine.",
        "panels": [named(cyclohexanone, "Cyclohexanone"), arrow("pyrrolidine", "H⁺, water removed"), focus(named(enamine, "1-(Cyclohex-1-enyl)pyrrolidine", hi=("N-C=C",)))],
    }

    # STAGE C: carbon and hydride nucleophiles.
    ex["u7-grignard"] = {
        "caption": "A ketone gives a tertiary alcohol: the phenyl joins the two methyls on the old carbonyl carbon.",
        "panels": [named(acetone, "Propanone"), arrow("1. C₆H₅MgBr", "2. H₃O⁺"), focus(named(add_then_workup(acetone, "c1ccccc1"), "2-Phenylpropan-2-ol", hi=("[CX4]-[OH]",)))],
    }
    keto_ester = "COC(=O)c1ccc(C(C)=O)cc1"
    # NaBH4 is mild: the template only matches the ketone C=O (CO), never the ester's.
    ex["u7-hydride"] = {
        "caption": "NaBH₄ is mild: it reduces the ketone and leaves the ester alone.",
        "panels": [named(keto_ester, "Methyl 4-acetylbenzoate"), arrow("NaBH₄", "CH₃OH"), focus(named(add_then_workup(keto_ester, "[H]"), "Methyl 4-(1-hydroxyethyl)benzoate", hi=("[CX4]-[OH]",)))],
    }
    benzaldehyde = "O=Cc1ccccc1"
    alpha = Chem.MolFromSmiles(benzaldehyde).GetSubstructMatch(Chem.MolFromSmarts("[CX3H1](=O)[#6]"))
    assert Chem.MolFromSmiles(benzaldehyde).GetAtomWithIdx(alpha[2]).GetTotalNumHs() == 0, "Cannizzaro needs no alpha H"
    ex["u7-cannizzaro"] = {
        "caption": "Benzaldehyde has no alpha H. In strong base one molecule is reduced to the alcohol and another oxidised to the carboxylate.",
        "panels": [
            named(benzaldehyde, "Benzaldehyde"), arrow("conc. NaOH"),
            focus(named(add_then_workup(benzaldehyde, "[H]"), "Phenylmethanol")), PLUS,
            focus(named(only(react("[CX3H1:1]=[OX1:2]>>[C:1](=[O:2])-[O-]", benzaldehyde)), "Benzoate")),
        ],
    }
    ex["u7-mpv"] = {
        "caption": "Propan-2-ol hands a hydride to the ketone through aluminium. The ketone goes down to the alcohol and propan-2-ol goes up to propanone.",
        "panels": [
            named(cyclohexanone, "Cyclohexanone"), PLUS, named("CC(C)O", "Propan-2-ol"), arrow("Al(OiPr)₃"),
            focus(named(add_then_workup(cyclohexanone, "[H]"), "Cyclohexanol")), PLUS,
            focus(named(only(react("[CX4H1:1]-[OH:2]>>[C:1]=[O:2]", "CC(C)O")), "Propanone")),
        ],
    }
    ex["u7-cyanohydrin"] = {
        "caption": "Cyanide's carbon bonds to the carbonyl carbon, so OH and CN end on one carbon: one carbon more.",
        "panels": [named(acetone, "Propanone"), arrow("HCN", "NaCN"), focus(named(add_then_workup(acetone, "C#N"), "2-Hydroxy-2-methylpropanenitrile", hi=("C#N",)))],
    }

    # STAGE D: alkenes, enones and CH2.
    ex["u7-wittig"] = {
        "caption": "The ylide carbon takes the place of the carbonyl oxygen: C=O becomes C=CH₂ exactly where the C=O was.",
        "panels": [named(cyclohexanone, "Cyclohexanone"), arrow("Ph₃P=CH₂"), focus(named(condense(cyclohexanone, "=C"), "Methylenecyclohexane", hi=("C=[CH2]",)))],
    }
    hwe_flat = condense(benzaldehyde, "=CC(=O)OCC")
    ex["u7-hwe"] = {
        "caption": "The phosphonate carbanion joins the aldehyde carbon in a new C=C. With an ester on the carbanion, the E alkene is the main product.",
        "panels": [named(benzaldehyde, "Benzaldehyde"), arrow("(EtO)₂P(O)CH₂CO₂Et", "NaH"), focus(named(alkene_isomer(hwe_flat, "E"), "Ethyl (E)-3-phenylpropenoate", hi=("[CH]=[CH]",)))],
    }
    enone = "O=C1C=CCCC1"
    one_two = only(react("[C:3]=[C:2]-[C:1]=[O:4]>>[C:3]=[C:2]-[C:1](-C)-[O:4]", enone))
    one_four = only(react("[C:3]=[C:2]-[C:1]=[O:4]>>[C:3](-C)-[C:2]-[C:1]=[O:4]", enone))
    ex["u7-12v14"] = {
        "caption": "A Grignard is hard and adds 1,2, straight to the carbonyl carbon. A cuprate is soft and adds 1,4, to the far alkene carbon, and the C=O survives.",
        "panels": [
            named(enone, "Cyclohex-2-enone"), arrow("1. CH₃MgBr", "2. H₃O⁺"), focus(named(one_two, "1-Methylcyclohex-2-en-1-ol", label="1,2 product", hi=("[CH3]-[#6]",))),
            {"kind": "break"},
            named(enone, "Cyclohex-2-enone"), arrow("1. (CH₃)₂CuLi", "2. H₃O⁺"), focus(named(one_four, "3-Methylcyclohexanone", label="1,4 product", hi=("[CH3]-[#6]",))),
        ],
    }
    ex["u7-to-ch2"] = {
        "caption": "Clemmensen removes the carbonyl oxygen completely: C=O becomes CH₂ in hot acid.",
        "panels": [named(acetophenone, "Acetophenone"), arrow("Zn(Hg), HCl", "heat"), focus(named(condense(acetophenone, ""), "Ethylbenzene", hi=("[CH2]",)))],
    }
    return ex


HEAD = header("Unit 7", "scripts/guide_u7.py", "test/guideU7.test.ts", "U7_GUIDE_EXAMPLES")

if __name__ == "__main__":
    sys.exit(run(build, "u7Guide.figures.ts", HEAD))
