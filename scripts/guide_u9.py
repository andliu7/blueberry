"""
Unit 9 guidebook drawings, derived with RDKit.

    python scripts/guide_u9.py          writes src/game/guide/u9Guide.figures.ts
    python scripts/guide_u9.py --check  rebuilds it in memory and fails if the file on disk differs

WHAT THIS SCRIPT OWNS. The mini example drawn under each Unit 9 lesson in the
guidebook. Each starting material is a SMILES; each product is MADE from it by
an RDKit reaction template (enolisation, alkylation, aldol, Claisen, Michael,
decarboxylation...), the graph edits scripts/u9_pools.py derives its answers
with. Every drawn structure carries the name the Unit 9 pool uses for it, and
OPSIN must read that name back as exactly the drawing, so the guide shows the
pool's own answer. A mismatch stops the script and nothing is written.

Where a rule picks between products (the kinetic enolate on the side with more
H, the thermodynamic one with the more substituted C=C, acid halogenation on
the more substituted enol, base halogenation running to CX3 on one carbon),
the rule is the pool's own, quoted in the guide words, and applied here by
counting atoms.

WHAT IT DOES NOT OWN. The words: src/game/guide/u9Guide.ts, where every line
quotes a Unit 9 pool entry word for word (test/guideU9.test.ts holds that).
The drawing rules are Unit 1's (guide_u1.py, through guide_kit.py).

Every example is a draft (placeholder: true) until the owner signs it off.
"""
from __future__ import annotations

import sys

from rdkit import Chem

from guide_kit import PLUS, RES, arrow, focus, header, mol_panel, named, only, react, run

# A ketone or aldehyde C=O with an alpha carbon that carries an H.
ENOLISABLE = "[C;!H0:3]-[CX3:1]=[OX1:2]"


def alpha_carbons(carbonyl: str) -> list[tuple[int, int]]:
    """(alpha carbon index, its H count) for every alpha carbon with an H."""
    m = Chem.MolFromSmiles(carbonyl)
    return sorted({(a, m.GetAtomWithIdx(a).GetTotalNumHs()) for a, _, _ in m.GetSubstructMatches(Chem.MolFromSmarts(ENOLISABLE.replace(":3", "").replace(":1", "").replace(":2", "")))})


def enol_at(carbonyl: str, alpha: int, charge: str = "") -> str:
    """The enol (or with charge '-', the enolate) whose C=C runs to this alpha carbon."""
    rw = Chem.RWMol(Chem.MolFromSmiles(carbonyl))
    c = next(n.GetIdx() for n in rw.GetAtomWithIdx(alpha).GetNeighbors()
             if any(b.GetBondType() == Chem.BondType.DOUBLE and b.GetOtherAtom(n).GetSymbol() == "O" for b in n.GetBonds()))
    o = next(b.GetOtherAtomIdx(c) for b in rw.GetAtomWithIdx(c).GetBonds() if b.GetBondType() == Chem.BondType.DOUBLE)
    rw.GetBondBetweenAtoms(c, o).SetBondType(Chem.BondType.SINGLE)
    rw.GetBondBetweenAtoms(c, alpha).SetBondType(Chem.BondType.DOUBLE)
    if charge == "-":
        rw.GetAtomWithIdx(o).SetFormalCharge(-1)
    for a in rw.GetAtoms():
        a.SetNoImplicit(False)
        a.SetNumExplicitHs(0)
    Chem.SanitizeMol(rw)
    return Chem.MolToSmiles(rw)


def kinetic_alpha(carbonyl: str) -> int:
    """The pool's kinetic rule: the alpha carbon with more H (less hindered)."""
    sites = alpha_carbons(carbonyl)
    best = max(h for _, h in sites)
    picks = [a for a, h in sites if h == best]
    assert len(picks) == 1 or len({enol_at(carbonyl, a) for a in picks}) == 1, sites
    return picks[0]


def substituted_alpha(carbonyl: str) -> int:
    """The thermodynamic (and acid halogenation) rule: the more substituted
    enol C=C, so the alpha carbon with fewer H."""
    sites = alpha_carbons(carbonyl)
    fewest = min(h for _, h in sites)
    picks = [a for a, h in sites if h == fewest]
    assert len(picks) == 1, sites
    return picks[0]


def on_alpha(carbonyl: str, alpha: int, group: str) -> str:
    """Bond `group` (a SMILES fragment, first atom attaches) to this alpha carbon."""
    rw = Chem.RWMol(Chem.MolFromSmiles(carbonyl))
    frag = Chem.MolFromSmiles(group)
    offset = rw.GetNumAtoms()
    combo = Chem.RWMol(Chem.CombineMols(rw, frag))
    combo.AddBond(alpha, offset, Chem.BondType.SINGLE)
    for a in combo.GetAtoms():
        a.SetNoImplicit(False)
        a.SetNumExplicitHs(0)
    Chem.SanitizeMol(combo)
    return Chem.MolToSmiles(combo)


def ring_size_formed(product: str, reactant: str) -> int:
    """The size of the one ring the product has beyond the reactant's rings."""
    p, r = Chem.MolFromSmiles(product), Chem.MolFromSmiles(reactant)
    new = [len(x) for x in p.GetRingInfo().AtomRings()]
    old = [len(x) for x in r.GetRingInfo().AtomRings()]
    for size in old:
        new.remove(size)
    assert len(new) == 1, (product, new)
    return new[0]


# Templates.
ALDOL_ADD = "[C;!H0:3]-[CX3:1]=[OX1:2].[CX3:4]=[OX1:5]>>[C:4](-[O:5])-[C:3]-[C:1]=[O:2]"
ALDOL_COND = "[C;H2,H3:3]-[CX3:1]=[OX1:2].[CX3:4]=[OX1:5]>>[C:4]=[C:3]-[C:1]=[O:2]"
CLAISEN = "[#6:1]-[CX3:2](=[OX1:3])-O-[CH2]-[CH3].[CH3:4]-[CX3:5](=[OX1:6])-[OX2:7]-[CH2:8]-[CH3:9]>>[#6:1]-[C:2](=[O:3])-[C:4]-[C:5](=[O:6])-[O:7]-[C:8]-[C:9]"
ACTIVE_CH2 = "[CH2:1](-[CX3:2]=[OX1:3])-[CX3:4]=[OX1:5]"
DECARBOX_ESTER = "[C:1](-[CX3:2](=[OX1:3])-O-C-C)-C(=O)-O-C-C>>[C:1]-[C:2](=[O:3])-O"
KETO_ESTER_TO_KETONE = "[CX3:1](=[OX1:2])-[C:3]-C(=O)-O-C-C>>[C:1](=[O:2])-[C:3]"

# Colours.
NEW_CC = ("[CX4]-[OH]",)
ENONE = ("C=CC=O",)


def build() -> dict:
    ex: dict[str, dict] = {}
    acetone = "CC(C)=O"
    butanone = "CCC(C)=O"
    cyclohexanone = "O=C1CCCCC1"
    methylcyclohexanone = "CC1CCCCC1=O"

    # STAGE A: enols and enolates.
    ex["u9-tautomer"] = {
        "caption": "An α-H moves to the oxygen and the C=O becomes C=C: same atoms, new places for one H and one π bond.",
        "panels": [named(acetone, "Propan-2-one"), arrow("trace H⁺"), focus(named(enol_at(acetone, alpha_carbons(acetone)[0][0]), "Prop-1-en-2-ol", hi=("C=C[OH]",)))],
    }
    ex["u9-pka"] = {
        "caption": "Between two carbonyls is the most acidic C-H in the unit, near pKa 10, because both C=O groups share the carbanion.",
        "panels": [focus(named("CC(=O)CC(C)=O", "Pentane-2,4-dione", "the CH₂ between, near pKa 10", hi=("O=C[CH2]C=O",)))],
    }
    enolate = enol_at(cyclohexanone, alpha_carbons(cyclohexanone)[0][0], "-")
    base = Chem.MolFromSmiles(enolate)
    forms = [m for m in Chem.ResonanceMolSupplier(base)]
    assert len(forms) == 2, enolate

    def charged_on(m: Chem.Mol) -> str:
        atom = next(a for a in m.GetAtoms() if a.GetFormalCharge() != 0)
        return "Charge on O" if atom.GetSymbol() == "O" else "Charge on C"

    first, coords = mol_panel(Chem.MolToSmiles(forms[0]), charged_on(forms[0]), source=forms[0])
    second, _ = mol_panel(Chem.MolToSmiles(forms[1]), charged_on(forms[1]), coords, source=forms[1])
    assert {first["name"], second["name"]} == {"Charge on O", "Charge on C"}
    ex["u9-enolate-res"] = {
        "caption": "An enolate is one ion drawn two ways: the charge on O or on the α-carbon. Both ends can attack.",
        "panels": [focus(first), RES, focus(second)],
    }
    kinetic = enol_at(methylcyclohexanone, kinetic_alpha(methylcyclohexanone), "-")
    thermo = enol_at(methylcyclohexanone, substituted_alpha(methylcyclohexanone), "-")
    assert kinetic != thermo
    ex["u9-kvt-enolate"] = {
        "caption": "Cold, bulky LDA takes the most reachable H: the kinetic enolate. Warm, reversible ethoxide lets the enolates settle on the more substituted C=C.",
        "panels": [
            named(methylcyclohexanone, "2-Methylcyclohexanone"), arrow("LDA", "−78 °C"), focus(named(kinetic, "6-Methylcyclohex-1-en-1-olate", label="Kinetic", hi=("C=C[O-]",))),
            {"kind": "break"},
            named(methylcyclohexanone, "2-Methylcyclohexanone"), arrow("NaOEt", "warm EtOH"), focus(named(thermo, "2-Methylcyclohex-1-en-1-olate", label="Thermodynamic", hi=("C=C[O-]",))),
        ],
    }
    ex["u9-halo-acid"] = {
        "caption": "Acid forms the more substituted enol, toward the CH₂, and it attacks Br₂ once: one bromine, on that carbon.",
        "panels": [named(butanone, "Butan-2-one"), arrow("Br₂", "acetic acid"), focus(named(on_alpha(butanone, substituted_alpha(butanone), "Br"), "3-Bromobutan-2-one", hi=("[#6]-Br",)))],
    }
    tribromo = only(react("[CH3:1]-[CX3:2]=[OX1:3]>>[C:1](-Br)(-Br)(-Br)-[C:2]=[O:3]", acetone))
    ex["u9-halo-base"] = {
        "caption": "Under base each Br makes the H left on that carbon more acidic, so the same carbon is hit again and again: CBr₃.",
        "panels": [named(acetone, "Propan-2-one"), arrow("excess Br₂", "NaOH"), focus(named(tribromo, "1,1,1-Tribromopropan-2-one", hi=("C(Br)(Br)Br",)))],
    }
    acetophenone = "CC(=O)c1ccccc1"
    ex["u9-haloform"] = {
        "caption": "A methyl ketone's CH₃ is iodinated three times, then cut off as iodoform. The ring keeps the carbonyl carbon as a carboxylate.",
        "panels": [
            named(acetophenone, "Acetophenone"), arrow("excess I₂", "NaOH"),
            focus(named(only(react("[CH3]-[CX3:1](=[OX1:2])-[c:3]>>[O-]-[C:1](=[O:2])-[c:3]", acetophenone)), "Benzoate")), PLUS,
            focus(named(only(react("[CH3:1]-[CX3](=O)-c1ccccc1>>[C:1](-I)(-I)-I", acetophenone)), "Iodoform", hi=("C(I)(I)I",))),
        ],
    }

    # STAGE B: aldol and Claisen.
    ex["u9-aldol"] = {
        "caption": "One ethanal's enolate adds to the other's C=O. The new C-C bond joins the α-carbon to the carbonyl carbon: a β-hydroxy aldehyde.",
        "panels": [named("CC=O", "Ethanal"), PLUS, named("CC=O", "Ethanal"), arrow("NaOH", "cold"), focus(named(only(react(ALDOL_ADD, "CC=O", "CC=O")), "3-Hydroxybutanal", hi=NEW_CC))],
    }
    ex["u9-mannich"] = {
        "caption": "Methanal and dimethylamine make an iminium ion, and the ketone's enol attacks its CH₂: a β-amino ketone.",
        "panels": [named(acetone, "Propan-2-one"), arrow("CH₂O, (CH₃)₂NH", "H⁺"), focus(named(on_alpha(acetone, alpha_carbons(acetone)[0][0], "CN(C)C"), "4-(Dimethylamino)butan-2-one", hi=("CN(C)C",)))],
    }
    ex["u9-aldol-cond"] = {
        "caption": "Heat takes the aldol on: the α-H and the β-OH leave as water and the new C=C sits in conjugation with the C=O.",
        "panels": [named("CCC=O", "Propanal"), PLUS, named("CCC=O", "Propanal"), arrow("NaOH", "heat"), focus(named(only(react(ALDOL_COND.replace("[C;H2,H3:3]", "[CH2:3]"), "CCC=O", "CCC=O")), "2-Methylpent-2-enal", hi=ENONE))],
    }
    ex["u9-knoevenagel"] = {
        "caption": "The doubly activated CH₂ adds to the aldehyde, then water leaves: an aldol condensation with a stabilised donor.",
        "panels": [
            named("CCOC(=O)CC(=O)OCC", "Diethyl malonate"), PLUS, named("O=Cc1ccccc1", "Benzaldehyde"), arrow("piperidine", "heat"),
            focus(named(only(react(f"{ACTIVE_CH2}.[CX3H1:6]=[OX1]>>[C:1](-[C:2]=[O:3])(-[C:4]=[O:5])=[C:6]", "CCOC(=O)CC(=O)OCC", "O=Cc1ccccc1")), "Diethyl 2-benzylidenepropanedioate", hi=("C=C(C=O)C=O",))),
        ],
    }
    ex["u9-crossed"] = {
        "caption": "Benzaldehyde has no α-H, so it can only be the acceptor. Propan-2-one's enolate adds, then water leaves.",
        "panels": [named("O=Cc1ccccc1", "Benzaldehyde"), PLUS, named(acetone, "Propan-2-one"), arrow("NaOH", "heat"), focus(named(only(react(ALDOL_COND, acetone, "O=Cc1ccccc1")), "4-Phenylbut-3-en-2-one", hi=ENONE))],
    }
    # The template bonds the CH3 side; the kinetic rule must pick that same side.
    assert Chem.MolFromSmiles(butanone).GetAtomWithIdx(kinetic_alpha(butanone)).GetTotalNumHs() == 3
    directed = only(react(ALDOL_ADD.replace("[C;!H0:3]", "[CH3:3]"), butanone, "CC=O"))
    ex["u9-directed"] = {
        "caption": "LDA at −78 °C turns all the ketone into its kinetic enolate first, on the CH₃ side. Only then is the aldehyde added: one partner, one product.",
        "panels": [named(butanone, "Butan-2-one"), arrow("1. LDA, −78 °C", "2. CH₃CHO, 3. H₂O"), focus(named(directed, "5-Hydroxyhexan-3-one", hi=NEW_CC))],
    }
    dione = "CC(=O)CCC(C)=O"
    ring = only(react("[CH3:1]-[CX3:2](=[OX1:3])-[CH2:4]-[CH2:5]-[CX3:6](=[OX1])-[CH3:8]>>[C:2]1(=[O:3])-[C:1]=[C:6](-[C:8])-[C:5]-[C:4]-1", dione))
    assert ring_size_formed(ring, dione) == 5
    ex["u9-intra"] = {
        "caption": "A terminal α-carbon reaches the other C=O and closes a five-membered ring; water leaves to give the enone.",
        "panels": [named(dione, "Hexane-2,5-dione"), arrow("base", "heat"), focus(named(ring, "3-Methylcyclopent-2-en-1-one", hi=ENONE))],
    }
    etoac = "CCOC(C)=O"
    ex["u9-claisen"] = {
        "caption": "One ester's enolate attacks the other's C=O and ethoxide leaves: a β-keto ester.",
        "panels": [named(etoac, "Ethyl acetate"), PLUS, named(etoac, "Ethyl acetate"), arrow("1. NaOEt", "2. H₃O⁺"), focus(named(only(react(CLAISEN, etoac, etoac)), "Ethyl 3-oxobutanoate", hi=("C(=O)CC(=O)",)))],
    }
    ex["u9-reformatsky"] = {
        "caption": "Zinc inserts into C-Br to make a zinc enolate, mild enough not to self-condense. Its carbon adds to the ketone: a β-hydroxy ester.",
        "panels": [
            named("CCOC(=O)CBr", "Ethyl bromoacetate"), arrow("1. Zn, 2. propan-2-one", "3. H₃O⁺"),
            focus(named(only(react("[CH2:1]-Br.[CX3:4]=[OX1:5]>>[C:4](-[O:5])-[C:1]", "CCOC(=O)CBr", acetone)), "Ethyl 3-hydroxy-3-methylbutanoate", hi=NEW_CC)),
        ],
    }
    adipate = "CCOC(=O)CCCCC(=O)OCC"
    dieck = only(react("[CH2:1](-[CX3:2](=[OX1:3])-[OX2:4]-[CH2:10]-[CH3:11])-[CH2:5]-[CH2:6]-[CH2:7]-[CX3:8](=[OX1:9])-O-C-C>>[C:8]1(=[O:9])-[C:1](-[C:2](=[O:3])-[O:4]-[C:10]-[C:11])-[C:5]-[C:6]-[C:7]-1", adipate))
    assert ring_size_formed(dieck, adipate) == 5
    ex["u9-dieckmann"] = {
        "caption": "A Claisen inside one molecule: one end's α-carbon attacks the other end's ester C=O and closes a five-membered ring.",
        "panels": [named(adipate, "Diethyl hexanedioate"), arrow("1. NaOEt", "2. H₃O⁺"), focus(named(dieck, "Ethyl 2-oxocyclopentane-1-carboxylate", hi=("O=C1CCCC1",)))],
    }
    ex["u9-crossed-claisen"] = {
        "caption": "Ethyl benzoate has no α-H, so only ethyl acetate makes an enolate, and it attacks the benzoate.",
        "panels": [named("CCOC(=O)c1ccccc1", "Ethyl benzoate"), PLUS, named(etoac, "Ethyl acetate"), arrow("1. NaOEt", "2. H₃O⁺"), focus(named(only(react(CLAISEN, "CCOC(=O)c1ccccc1", etoac)), "Ethyl 3-oxo-3-phenylpropanoate", hi=("C(=O)CC(=O)",)))],
    }

    # STAGE C: building C-C bonds.
    ex["u9-alkylation"] = {
        "caption": "LDA makes the enolate fully, and its α-carbon attacks CH₃I in an SN2: a new C-C bond at the α-carbon.",
        "panels": [named(cyclohexanone, "Cyclohexanone"), arrow("1. LDA", "2. CH₃I"), focus(named(on_alpha(cyclohexanone, alpha_carbons(cyclohexanone)[0][0], "C"), "2-Methylcyclohexan-1-one", hi=("[CH3]-[#6]",)))],
    }
    enamine = only(react("[CX3:1](=[OX1])-[C;!H0:3]>>[C:1](-N1CCCC1)=[C:3]", cyclohexanone))
    stork = only(react("[NX3]1(-[C:2]=[C:3])CCCC1>>O=[C:2]-[C:3]-C", enamine))
    ex["u9-stork"] = {
        "caption": "The enamine's β-carbon attacks CH₃I like an enolate would, and hydrolysis turns the iminium back into the ketone.",
        "panels": [
            named(cyclohexanone, "Cyclohexanone"), arrow("pyrrolidine", "trace H⁺"), focus(named(enamine, "1-(Cyclohex-1-en-1-yl)pyrrolidine", hi=("N-C=C",))),
            {"kind": "break"},
            named(enamine, "1-(Cyclohex-1-en-1-yl)pyrrolidine"), arrow("1. CH₃I", "2. H₃O⁺"), focus(named(stork, "2-Methylcyclohexan-1-one", hi=("[CH3]-[#6]",))),
        ],
    }
    malonate = "CCOC(=O)CC(=O)OCC"
    ethylated = only(react(f"{ACTIVE_CH2}>>[C:1](-[C:2]=[O:3])(-[C:4]=[O:5])-C-C", malonate))
    ex["u9-malonic"] = {
        "caption": "Alkylate the carbon between the two esters, then hydrolyse and lose one CO₂: R-X becomes R-CH₂-CO₂H.",
        "panels": [
            named(malonate, "Diethyl malonate"), arrow("1. NaOEt", "2. CH₃CH₂Br"), focus(named(ethylated, "Diethyl 2-ethylpropanedioate", hi=("[CH2][CH3]",))),
            {"kind": "break"},
            named(ethylated, "Diethyl 2-ethylpropanedioate"), arrow("H₃O⁺", "heat, −CO₂"), focus(named(only(react(DECARBOX_ESTER, ethylated)), "Butanoic acid", hi=("C(=O)[OH]",))),
        ],
    }
    eaa = "CCOC(=O)CC(C)=O"
    methylated = only(react(f"{ACTIVE_CH2}>>[C:1](-[C:2]=[O:3])(-[C:4]=[O:5])-C", eaa))
    ex["u9-acetoacetic"] = {
        "caption": "Same three steps on ethyl acetoacetate: alkylate between the carbonyls, hydrolyse, lose CO₂. Out comes a methyl ketone.",
        "panels": [
            named(eaa, "Ethyl acetoacetate"), arrow("1. NaOEt", "2. CH₃I"), focus(named(methylated, "Ethyl 2-methyl-3-oxobutanoate", hi=("[CH3]-[CH1]",))),
            {"kind": "break"},
            named(methylated, "Ethyl 2-methyl-3-oxobutanoate"), arrow("H₃O⁺", "heat, −CO₂"), focus(named(only(react(KETO_ESTER_TO_KETONE, methylated)), "Butan-2-one")),
        ],
    }
    mvk = "C=CC(C)=O"
    ex["u9-michael"] = {
        "caption": "The malonate carbon adds to the β-carbon, the CH₂ end of the C=C, and the ketone survives.",
        "panels": [
            named(malonate, "Diethyl malonate"), PLUS, named(mvk, "But-3-en-2-one"), arrow("NaOEt"),
            focus(named(only(react(f"{ACTIVE_CH2}.[CH2:6]=[CH1:7]-[CX3:8]=[OX1:9]>>[C:1](-[C:2]=[O:3])(-[C:4]=[O:5])-[C:6]-[C:7]-[C:8]=[O:9]", malonate, mvk)), "Diethyl 2-(3-oxobutyl)propanedioate", hi=("[CH1](C=O)(C=O)[CH2][CH2]",))),
        ],
    }
    ex["u9-cuprate"] = {
        "caption": "The cuprate delivers its ethyl to the β-carbon, 1,4, and the chain grows to six carbons with the ketone intact.",
        "panels": [named(mvk, "But-3-en-2-one"), arrow("1. (CH₃CH₂)₂CuLi", "2. H₂O"), focus(named(only(react("[CH2:3]=[C:2]-[C:1]=[O:4]>>[C:3](-C-C)-[C:2]-[C:1]=[O:4]", mvk)), "Hexan-2-one", hi=("[CH2]-[CH2]-[CH3]",)))],
    }
    michael = only(react("[CH2:3]1-[CX3:1](=[OX1:2])-[CH2:9]-[CH2:10]-[CH2:11]-[CH2:12]-1.[CH2:6]=[CH1:7]-[CX3:8]=[OX1:13]>>[C:3]1(-[C:6]-[C:7]-[C:8]=[O:13])-[C:1](=[O:2])-[C:9]-[C:10]-[C:11]-[C:12]-1", cyclohexanone, mvk))
    annulated = only(react("[CH3:1]-[CX3:2](=[OX1:3])-[CH2:4]-[CH2:5]-[CH1:6]-[CX3:7]=[OX1]>>[C:2]1(=[O:3])-[C:1]=[C:7]-[C:6]-[C:5]-[C:4]-1", michael))
    assert ring_size_formed(annulated, michael) == 6
    ex["u9-robinson"] = {
        "caption": "Michael addition first gives a 1,5-diketone. Then the new chain's methyl attacks the ring C=O and water leaves: a new six-membered ring.",
        "panels": [
            named(cyclohexanone, "Cyclohexanone"), PLUS, named(mvk, "But-3-en-2-one"), arrow("base", "Michael"), focus(named(michael, "2-(3-Oxobutyl)cyclohexan-1-one")),
            {"kind": "break"},
            named(michael, "2-(3-Oxobutyl)cyclohexan-1-one"), arrow("base, heat", "aldol, −H₂O"), focus(named(annulated, "4,4a,5,6,7,8-Hexahydronaphthalen-2(3H)-one", label="Fused bicyclic enone", hi=ENONE)),
        ],
    }
    ethyl_on = only(react(f"{ACTIVE_CH2}>>[C:1](-[C:2]=[O:3])(-[C:4]=[O:5])-C-C", eaa))
    target = only(react(KETO_ESTER_TO_KETONE, ethyl_on))
    ex["u9-retro"] = {
        "caption": "Find the methyl ketone, then the R on its α-carbon: pentan-2-one is CH₃COCH₂ plus an ethyl, so bromoethane goes on acetoacetate.",
        "panels": [named(eaa, "Ethyl acetoacetate"), PLUS, named("CCBr", "Bromoethane"), arrow("1. NaOEt", "2. H₃O⁺, heat"), focus(named(target, "Pentan-2-one", hi=("[CH2]-[CH2]-[CH3]",)))],
    }
    return ex


HEAD = header("Unit 9", "scripts/guide_u9.py", "test/guideU9.test.ts", "U9_GUIDE_EXAMPLES")

if __name__ == "__main__":
    sys.exit(run(build, "u9Guide.figures.ts", HEAD))
