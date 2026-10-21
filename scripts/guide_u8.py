"""
Unit 8 guidebook drawings, derived with RDKit.

    python scripts/guide_u8.py          writes src/game/guide/u8Guide.figures.ts
    python scripts/guide_u8.py --check  rebuilds it in memory and fails if the file on disk differs

WHAT THIS SCRIPT OWNS. The mini example drawn under each Unit 8 lesson in the
guidebook. Each starting material is a SMILES; each product is MADE from it by
an RDKit reaction template (acyl substitution, reduction, decarboxylation...),
the same graph edits scripts/u8_pools.py derives its answers with. Every drawn
structure carries the name the Unit 8 pool uses for it, and OPSIN must read
that name back as exactly the drawing, so the guide shows the pool's own
answer. A mismatch stops the script and nothing is written.

WHAT IT DOES NOT OWN. The words: src/game/guide/u8Guide.ts, where every line
quotes a Unit 8 pool entry word for word (test/guideU8.test.ts holds that).
The drawing rules are Unit 1's (guide_u1.py, through guide_kit.py).

Every example is a draft (placeholder: true) until the owner signs it off.
"""
from __future__ import annotations

import sys

from guide_kit import PLUS, arrow, focus, header, mol, named, only, react, run

# An acyl carbon with its leaving group L: C(=O)-L.
ACID = "[CX3:1](=[OX1:2])-[OX2H1]"
ACYL_CL = "[CX3:1](=[OX1:2])-Cl"
METHYL_ESTER = "[CX3:1](=[OX1:2])-[OX2]-[CH3]"
# A ketone C=O: the carbon has two carbon neighbours.
KETONE = "[CX3;$(C([#6])[#6]):1]=[OX1:2]"
ALCOHOL = "[OX2H1:3]-[#6:4]"

# What each example colours: the acyl group's new partner.
NEW_O = ("[CX3](=O)-[OX2]-[#6]",)
NEW_N = ("[CX3](=O)-[#7]",)


def substitute(acyl: str, leaving: str, nu: str, *partner: str) -> str:
    """Acyl substitution: `leaving` goes, `nu` takes its place, C=O stays.
    `partner` is the reactant the nucleophile comes from, when it is drawn."""
    return only(react(f"{leaving}{'.' + ALCOHOL if partner else ''}>>[C:1](=[O:2])-{nu}", acyl, *partner))


def build() -> dict:
    ex: dict[str, dict] = {}
    acetyl_cl = "CC(=O)Cl"
    ethanol = "CCO"

    # STAGE A: the ladder and the mechanism.
    ethyl_acetate = substitute(acetyl_cl, ACYL_CL, "[O:3]-[#6:4]", ethanol)
    ex["u8-ladder"] = {
        "caption": "Acyl chloride to ester is a step down the ladder, so ethanol alone does it. Uphill would need an activating reagent.",
        "panels": [named(acetyl_cl, "Acetyl chloride"), PLUS, named(ethanol, "Ethanol"), arrow("no activator"), focus(named(ethyl_acetate, "Ethyl acetate", hi=NEW_O))],
    }
    tetrahedral = only(react(f"{ACYL_CL}>>[C:1](-[O-:2])(-Cl)-O-C", acetyl_cl))
    methyl_acetate = only(react("[C:1](-[O-:2])(-Cl)-[O:3]>>[C:1](=[O+0:2])-[O:3]", tetrahedral))
    ex["u8-tetrahedral"] = {
        "caption": "Methoxide adds and the carbon goes tetrahedral, still holding Cl. The C=O reforms and pushes chloride out: add, then eliminate.",
        "panels": [
            named(acetyl_cl, "Acetyl chloride"), arrow("CH₃O⁻"), focus(mol(tetrahedral, "Tetrahedral intermediate", hi=("[CX4]",))),
            {"kind": "break"},
            mol(tetrahedral, "Tetrahedral intermediate"), arrow("−Cl⁻"), focus(named(methyl_acetate, "Methyl acetate", hi=NEW_O)),
        ],
    }
    ex["u8-to-acylcl"] = {
        "caption": "SOCl₂ swaps the acid's OH for Cl and the C=O stays: a climb to the top rung. SO₂ and HCl leave as gases.",
        "panels": [named("CCCC(=O)O", "Butanoic acid"), arrow("SOCl₂"), focus(named(substitute("CCCC(=O)O", ACID, "Cl"), "Butanoyl chloride", hi=("C(=O)Cl",)))],
    }
    ex["u8-hvz"] = {
        "caption": "HVZ puts one Br on the alpha carbon, next to the C=O, and the acid comes back on workup.",
        "panels": [
            named("CCC(=O)O", "Propanoic acid"), arrow("Br₂, PBr₃", "then H₂O"),
            focus(named(only(react("[C;!H0:5]-[CX3:1](=[OX1:2])-[OX2H1:3]>>[C:5](-Br)-[C:1](=[O:2])-[O:3]", "CCC(=O)O")), "2-Bromopropanoic acid", hi=("[#6]-Br",))),
        ],
    }
    succinic = "O=C(O)CCC(=O)O"
    anhydride = only(react("[OH]-[C:1](=[O:2])-[C:3]-[C:4]-[C:5](=[O:6])-[OH:7]>>[C:1]1(=[O:2])-[C:3]-[C:4]-[C:5](=[O:6])-[O:7]-1", succinic))
    ex["u8-to-anhydride"] = {
        "caption": "Heat a 1,4-diacid and one OH attacks the other acid's carbon: water leaves and a five-membered cyclic anhydride closes.",
        "panels": [named(succinic, "Butanedioic acid"), arrow("heat", "−H₂O"), focus(named(anhydride, "Oxolane-2,5-dione", hi=("C(=O)OC(=O)",)))],
    }

    # STAGE B: making and breaking esters and amides.
    ex["u8-fischer"] = {
        "caption": "Fischer: acid plus alcohol with an acid catalyst gives ester plus water, an equilibrium driven by excess alcohol or removing water.",
        "panels": [named("CC(=O)O", "Acetic acid"), PLUS, named(ethanol, "Ethanol"), arrow("H₂SO₄"), focus(named(substitute("CC(=O)O", ACID, "[O:3]-[#6:4]", ethanol), "Ethyl acetate", hi=NEW_O))],
    }
    ex["u8-steglich"] = {
        "caption": "Steglich is mild: DCC and DMAP make the ester with no strong acid, so even a bulky tertiary alcohol works.",
        "panels": [named("CC(=O)O", "Acetic acid"), PLUS, named("CC(C)(C)O", "2-Methylpropan-2-ol"), arrow("DCC, DMAP"), focus(named(substitute("CC(=O)O", ACID, "[O:3]-[#6:4]", "CC(C)(C)O"), "tert-Butyl acetate", hi=NEW_O))],
    }
    ex["u8-diazomethane"] = {
        "caption": "Diazomethane turns an acid into its methyl ester, and the only byproduct is N₂ gas.",
        "panels": [named("O=C(O)c1ccccc1", "Benzoic acid"), arrow("CH₂N₂", "−N₂"), focus(named(substitute("O=C(O)c1ccccc1", ACID, "O-C"), "Methyl benzoate", hi=("[#6;R]-C(=O)-O-[CH3]",)))],
    }
    ex["u8-acylcl-all"] = {
        "caption": "An acyl chloride makes every lower derivative: water gives the acid, an alcohol the ester, ammonia the amide.",
        "panels": [
            named(acetyl_cl, "Acetyl chloride"), arrow("H₂O"), focus(named(substitute(acetyl_cl, ACYL_CL, "O"), "Acetic acid")),
            {"kind": "break"},
            named(acetyl_cl, "Acetyl chloride"), arrow("CH₃CH₂OH"), focus(named(substitute(acetyl_cl, ACYL_CL, "O-C-C"), "Ethyl acetate", hi=NEW_O)),
            {"kind": "break"},
            named(acetyl_cl, "Acetyl chloride"), arrow("2 NH₃"), focus(named(substitute(acetyl_cl, ACYL_CL, "N"), "Acetamide", hi=NEW_N)),
        ],
    }
    ac2o = "CC(=O)OC(C)=O"
    opened = "[CX3:1](=[OX1:2])-[OX2:3]-[CX3:4]=[OX1:5].[OX2H1:6]-[CH3:7]>>[C:1](=[O:2])-[O:6]-[C:7].[O:3]-[C:4]=[O:5]"
    ex["u8-anhydride"] = {
        "caption": "Methanol attacks one acyl carbon of the anhydride. The other half leaves and ends as acetic acid: one acyl group is wasted.",
        "panels": [
            named(ac2o, "Acetic anhydride"), PLUS, named("CO", "Methanol"), arrow("no catalyst needed"),
            focus(named(only(react(opened, ac2o, "CO")), "Methyl acetate", hi=NEW_O)), PLUS,
            focus(named(only(react(opened, ac2o, "CO", product=1)), "Acetic acid")),
        ],
    }
    benzoate = substitute("COC(=O)c1ccccc1", METHYL_ESTER, "[O-]")
    ex["u8-hydrolysis"] = {
        "caption": "Hydroxide swaps OCH₃ for OH, then base takes the acid's proton at once: saponification ends at the carboxylate, the bottom rung.",
        "panels": [named("COC(=O)c1ccccc1", "Methyl benzoate"), arrow("NaOH, H₂O", "heat"), focus(named(benzoate, "Benzoate", hi=("C(=O)[O-]",)))],
    }
    ex["u8-transester"] = {
        "caption": "Ethanol's O replaces methanol's O on the acyl carbon: same rung, new alkyl group. Excess ethanol pushes it over.",
        "panels": [named("COC(C)=O", "Methyl acetate"), arrow("CH₃CH₂OH (solvent)", "H⁺"), focus(named(substitute("COC(C)=O", METHYL_ESTER, "O-C-C"), "Ethyl acetate", hi=NEW_O)), PLUS, focus(named("CO", "Methanol"))],
    }
    ex["u8-carboxylate-alk"] = {
        "caption": "The carboxylate oxygen attacks CH₃ in an SN2 and iodide leaves: a methyl ester. Methyl and primary halides only.",
        "panels": [
            named(benzoate, "Benzoate"), PLUS, named("CI", "Iodomethane"), arrow("SN2"),
            focus(named(only(react("[CX3:1](=[OX1:2])-[O-:3].[CH3:4]-I>>[C:1](=[O:2])-[O+0:3]-[C:4]", benzoate, "CI")), "Methyl benzoate", hi=("C(=O)-O-[CH3]",))),
        ],
    }
    ex["u8-amide-hyd"] = {
        "caption": "Amides are low on the ladder, so hydrolysis needs a long time in hot acid. Water replaces NH₂ and the acid forms.",
        "panels": [named("CC(N)=O", "Acetamide"), arrow("H₃O⁺", "heat, a long time"), focus(named(substitute("CC(N)=O", "[CX3:1](=[OX1:2])-[NH2]", "O"), "Acetic acid", hi=("C(=O)[OH]",)))],
    }
    nitrile = only(react("[CH2:1]-Br>>[C:1]-C#N", "CCCCBr"))
    ex["u8-nitrile"] = {
        "caption": "Cyanide displaces bromide in an SN2, one carbon longer. Heated in acid, the nitrile goes all the way to the carboxylic acid.",
        "panels": [
            named("CCCCBr", "1-Bromobutane"), arrow("NaCN", "SN2"), focus(named(nitrile, "Pentanenitrile", hi=("C#N",))),
            {"kind": "break"},
            named(nitrile, "Pentanenitrile"), arrow("H₃O⁺", "heat"), focus(named(only(react("[C:1]#N>>[C:1](=O)O", nitrile)), "Pentanoic acid", hi=("C(=O)O",))),
        ],
    }

    # STAGE C: reductions and organometallics.
    amide = "CN(C)C(=O)c1ccccc1"
    ex["u8-lialh4"] = {
        "caption": "LiAlH₄ takes the amide's C=O oxygen away: the carbon becomes CH₂ and keeps the N, so the amide becomes an amine.",
        "panels": [named(amide, "N,N-Dimethylbenzamide"), arrow("1. LiAlH₄", "2. H₂O"), focus(named(only(react("[CX3:1](=[OX1])-[NX3:3]>>[C:1]-[N:3]", amide)), "N,N-Dimethyl-1-phenylmethanamine", hi=("[CH2]-N",)))],
    }
    keto_ester = "COC(=O)CC(C)=O"
    ex["u8-nabh4"] = {
        "caption": "NaBH₄ reduces the ketone to CH-OH and leaves the ester alone.",
        "panels": [named(keto_ester, "Methyl 3-oxobutanoate"), arrow("NaBH₄"), focus(named(only(react(f"{KETONE}>>[C:1]-[O:2]", keto_ester)), "Methyl 3-hydroxybutanoate", hi=("[CX4]-[OH]",)))],
    }
    ex["u8-dibal"] = {
        "caption": "One DIBAL-H at −78 °C adds one hydride and holds there until workup, which releases the aldehyde.",
        "panels": [named("COC(=O)c1ccccc1", "Methyl benzoate"), arrow("1. DIBAL-H, −78 °C", "2. H₂O"), focus(named(only(react(f"{METHYL_ESTER}>>[C:1]=[O:2]", "COC(=O)c1ccccc1")), "Benzaldehyde", hi=("[CH]=O",)))],
    }
    ketone = substitute("COC(C)=O", METHYL_ESTER, "C")
    tertiary = only(react(f"{KETONE}>>[C:1](-C)-[O:2]", ketone))
    ex["u8-organomet"] = {
        "caption": "The first methyl swaps out the OCH₃ to give a ketone, and the ketone takes a second methyl at once: a tertiary alcohol.",
        "panels": [named("COC(C)=O", "Methyl acetate"), arrow("1. excess CH₃MgBr", "2. H₃O⁺"), focus(named(tertiary, "2-Methylpropan-2-ol", hi=("[CX4]-[OH]",)))],
    }
    weinreb = "CON(C)C(=O)c1ccccc1"
    ex["u8-weinreb"] = {
        "caption": "One methyl adds to the Weinreb amide and a chelate holds the intermediate until workup, so the ketone never meets a second Grignard.",
        "panels": [named(weinreb, "N-Methoxy-N-methylbenzamide"), arrow("1. CH₃MgBr", "2. H₃O⁺"), focus(named(substitute(weinreb, "[CX3:1](=[OX1:2])-N(-C)-O-C", "C"), "1-Phenylethan-1-one", hi=("C(=O)[CH3]",)))],
    }
    butanoyl = "CCCC(=O)Cl"
    gilman = substitute(butanoyl, ACYL_CL, "C")
    overshoot = only(react(f"{KETONE}>>[C:1](-C)-[O:2]", gilman))
    ex["u8-gilman"] = {
        "caption": "A cuprate adds one methyl and stops at the ketone. Excess Grignard overshoots: it adds again and gives the tertiary alcohol.",
        "panels": [
            named(butanoyl, "Butanoyl chloride"), arrow("(CH₃)₂CuLi"), focus(named(gilman, "Pentan-2-one", hi=("C(=O)[CH3]",))),
            {"kind": "break"},
            named(butanoyl, "Butanoyl chloride"), arrow("1. excess CH₃MgBr", "2. H₃O⁺"), focus(named(overshoot, "2-Methylpentan-2-ol", hi=("[CX4]-[OH]",))),
        ],
    }

    # STAGE D: losing CO2.
    keto_acid = "CC(=O)CC(=O)O"
    ex["u8-decarb"] = {
        "caption": "The CO₂H sits beta to the ketone C=O, so on gentle warming it leaves as CO₂ through a six-membered path. The enol settles as the ketone.",
        "panels": [named(keto_acid, "3-Oxobutanoic acid"), arrow("warm", "−CO₂"), focus(named(only(react("[CX3:1](=[OX1:2])-[C:3]-C(=O)[OH]>>[C:1](=[O:2])-[C:3]", keto_acid)), "Propan-2-one"))],
    }
    propanoate = "CCC(=O)[O-]"
    ex["u8-kolbe-e"] = {
        "caption": "Each propanoate loses CO₂ at the anode to give an ethyl radical, and two ethyls join: butane.",
        "panels": [named(propanoate, "Propanoate"), arrow("electrolysis", "−2 CO₂"), focus(named(only(react("[C:1]-C(=O)[O-].[C:2]-C(=O)[O-]>>[C:1]-[C:2]", propanoate, propanoate)), "Butane"))],
    }
    ex["u8-hunsdiecker"] = {
        "caption": "The carboxyl carbon leaves as CO₂ and Br goes where it was: one carbon shorter.",
        "panels": [named("CCCC(=O)[O-]", "Butanoate"), arrow("Ag⁺ salt, Br₂", "−CO₂, −AgBr"), focus(named(only(react("[C:1]-C(=O)[O-]>>[C:1]-Br", "CCCC(=O)[O-]")), "1-Bromopropane", hi=("[#6]-Br",)))],
    }
    return ex


HEAD = header("Unit 8", "scripts/guide_u8.py", "test/guideU8.test.ts", "U8_GUIDE_EXAMPLES")

if __name__ == "__main__":
    sys.exit(run(build, "u8Guide.figures.ts", HEAD))
