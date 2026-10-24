"""
Unit 10 guidebook drawings, derived with RDKit.

    python scripts/guide_u10.py          writes src/game/guide/u10Guide.figures.ts
    python scripts/guide_u10.py --check  rebuilds it in memory and fails if the file on disk differs

WHAT THIS SCRIPT OWNS. The mini example drawn under each Unit 10 lesson in the
guidebook. Each starting material is a SMILES; each product is MADE from it by
an RDKit reaction template (reductive amination, reductions, the diazonium
swaps, eliminations...), the graph edits scripts/u10_pools.py derives its
answers with. Every drawn structure carries the name the Unit 10 pool uses
for it where the pool names it, and OPSIN must read every name back as exactly
the drawing. A mismatch stops the script and nothing is written.

Where a rule picks between products (Hofmann elimination's less substituted
alkene, coupling para to the activating group), the rule is the pool's own,
quoted in the guide words, and applied here by counting atoms.

u10-basicity's lesson plays the nucleophilicity sort ladder
(beats/sort/ladders.ts), so its example draws the two anions that ladder
ranks first; test/guideU10.test.ts checks the drawn order against the
ladder's own.

WHAT IT DOES NOT OWN. The words: src/game/guide/u10Guide.ts, where every line
quotes a Unit 10 pool entry or lesson question word for word. The drawing
rules are Unit 1's (guide_u1.py, through guide_kit.py).

Every example is a draft (placeholder: true) until the owner signs it off.
"""
from __future__ import annotations

import sys

from rdkit import Chem

from guide_kit import PLUS, arrow, focus, header, mol, named, only, react, run


def keep_fragment(smiles: str, smarts: str) -> str:
    """The one fragment of a multi-part product that matches `smarts`."""
    parts = [p for p in smiles.split(".") if Chem.MolFromSmiles(p).HasSubstructMatch(Chem.MolFromSmarts(smarts))]
    assert len(parts) == 1, (smiles, smarts)
    return Chem.MolToSmiles(Chem.MolFromSmiles(parts[0]))


def alkylate_to_quaternary(amine: str, group: str) -> str:
    """Direct alkylation, one N-C bond at a time, until the N has no H and no
    lone pair: the quaternary salt (the pool's over-alkylation rule)."""
    current = amine
    for _ in range(4):
        step = react(f"[NX3;!H0:1]>>[N:1]-{group}", current) or react(f"[NX3;H0;+0:1]>>[N+:1]-{group}", current)
        if not step:
            break
        current = only(step)
    assert "+" in current, current
    return current


def alkene_carbons(smiles: str) -> int:
    """Carbons on the C=C, the yardstick for more or less substituted."""
    m = Chem.MolFromSmiles(smiles)
    b = next(b for b in m.GetBonds() if b.GetBondType() == Chem.BondType.DOUBLE)
    ends = (b.GetBeginAtomIdx(), b.GetEndAtomIdx())
    return sum(1 for i in ends for n in m.GetAtomWithIdx(i).GetNeighbors() if n.GetSymbol() == "C" and n.GetIdx() not in ends)


def hofmann_alkene(salt: str) -> str:
    """Every beta-H elimination from the C-N(CH3)3+ carbon; the pool's rule
    keeps the least substituted alkene."""
    options = react("[C;!H0:2]-[C:1]-[N+](-[CH3])(-[CH3])-[CH3]>>[C:2]=[C:1]", salt)
    least = min(alkene_carbons(o) for o in options)
    picks = [o for o in options if alkene_carbons(o) == least]
    return only(picks)


def build() -> dict:
    ex: dict[str, dict] = {}
    cyclohexanone = "O=C1CCCCC1"
    bromobutane = "CCCCBr"

    # STAGE A: basicity and making amines.
    ex["u10-basicity"] = {
        "caption": "In ethanol, HS⁻ attacks carbon faster than OH⁻, even though OH⁻ is the stronger base: speed is a rate, not an equilibrium.",
        "panels": [focus(named("[SH-]", "Hydrosulfide", "attacks faster")), {"kind": "break"}, focus(named("[OH-]", "Hydroxide", "the stronger base"))],
    }
    ex["u10-direct-alk"] = {
        "caption": "Every amine made is still a nucleophile, so excess bromoethane keeps going until N has four ethyls and no lone pair.",
        "panels": [named("N", "Ammonia"), arrow("excess CH₃CH₂Br"), focus(named(alkylate_to_quaternary("N", "CC"), "Tetraethylammonium", hi=("[N+]",)))],
    }
    imide = "O=C1NC(=O)c2ccccc21"
    benzylated = only(react("[NH:1](-[CX3:2]=[OX1:3])-[CX3:4]=[OX1:5]>>[N:1](-[C:2]=[O:3])(-[C:4]=[O:5])-C-c1ccccc1", imide))
    freed = keep_fragment(only(react("[CH2:2]-[N:1](-[CX3]=O)-[CX3]=O>>[C:2]-[N:1]", benzylated)), "[NH2]")
    ex["u10-gabriel"] = {
        "caption": "The phthalimide N takes one alkyl group by SN2, then hydrazine cuts it free: one clean primary amine.",
        "panels": [
            named(imide, "Phthalimide"), arrow("1. KOH", "2. PhCH₂Br"), focus(named(benzylated, "2-Benzylisoindole-1,3-dione", hi=("N-[CH2]",))),
            {"kind": "break"},
            named(benzylated, "2-Benzylisoindole-1,3-dione"), arrow("N₂H₄"), focus(named(freed, "Phenylmethanamine", hi=("[CH2]-[NH2]",))),
        ],
    }
    ex["u10-red-amination"] = {
        "caption": "The amine and ketone make an iminium, and NaBH₃CN delivers H to its carbon: a new C-N single bond.",
        "panels": [named(cyclohexanone, "Cyclohexanone"), arrow("CH₃NH₂", "NaBH₃CN"), focus(named(only(react("[CX3:1]=[OX1]>>[C:1]-N-C", cyclohexanone)), "N-Methylcyclohexanamine", hi=("[CH1]-N",)))],
    }
    amine = "CCCC(C)N"
    salt = alkylate_to_quaternary(amine, "C")
    ex["u10-hofmann-e"] = {
        "caption": "Exhaustive methylation makes N(CH₃)₃⁺ a leaving group. Hydroxide takes an H from the less hindered CH₃ end, where the bulky group crowds least: the less substituted alkene.",
        "panels": [
            named(amine, "Pentan-2-amine"), arrow("excess CH₃I"), focus(named(salt, "N,N,N-Trimethylpentan-2-aminium", hi=("[N+]",))),
            {"kind": "break"},
            named(salt, "N,N,N-Trimethylpentan-2-aminium"), arrow("Ag₂O", "heat"), focus(named(hofmann_alkene(salt), "Pent-1-ene", hi=("C=C",))),
        ],
    }
    tertiary = "CN(C)C1CCCCC1"
    oxide = only(react("[NX3;H0;+0:1]>>[N+:1]-[O-]", tertiary))
    ex["u10-cope"] = {
        "caption": "H₂O₂ gives the N-oxide. Heated, its O⁻ takes a β-H and the C-N bond breaks: the alkene, plus a hydroxylamine.",
        "panels": [
            named(tertiary, "N,N-Dimethylcyclohexanamine"), arrow("H₂O₂"), focus(mol(oxide, "The N-oxide", hi=("[N+]-[O-]",))),
            {"kind": "break"},
            mol(oxide, "The N-oxide"), arrow("heat"), focus(named(only(react("[C;!H0:2]-[C:1]-[N+](-C)(-C)-[O-]>>[C:2]=[C:1]", oxide)), "Cyclohexene", hi=("C=C",))),
        ],
    }
    ex["u10-amide-red"] = {
        "caption": "LiAlH₄ turns C(=O)N into CH₂N: the acetyl C=O becomes CH₂, so a secondary amide gives a secondary amine.",
        "panels": [named("CCNC(C)=O", "N-Ethylacetamide"), arrow("1. LiAlH₄", "2. H₂O"), focus(named(only(react("[CX3:1](=[OX1])-[N:3]>>[C:1]-[N:3]", "CCNC(C)=O")), "N-Ethylethanamine", hi=("[CH2]-N",)))],
    }
    ex["u10-hofmann-r"] = {
        "caption": "The carbonyl carbon is lost and the ring ends bonded straight to N: one carbon shorter.",
        "panels": [named("NC(=O)c1ccccc1", "Benzamide"), arrow("Br₂", "NaOH"), focus(named(only(react("[#6:2]-[CX3](=O)-[NH2:3]>>[#6:2]-[N:3]", "NC(=O)c1ccccc1")), "Aniline", hi=("[#6]-[NH2]",)))],
    }
    acyl_azide = only(react("[CX3:1](=[OX1:2])-Cl>>[C:1](=[O:2])-N=[N+]=[N-]", "O=C(Cl)c1ccccc1"))
    ex["u10-curtius"] = {
        "caption": "Azide replaces Cl at the acyl carbon. Heated, the acyl azide loses N₂ and the ring ends on N, in an isocyanate.",
        "panels": [
            named("O=C(Cl)c1ccccc1", "Benzoyl chloride"), arrow("NaN₃"), focus(named(acyl_azide, "Benzoyl azide", hi=("N=[N+]=[N-]",))),
            {"kind": "break"},
            named(acyl_azide, "Benzoyl azide"), arrow("heat", "−N₂"), focus(named(only(react("[#6:3]-[CX3:1](=[OX1:2])-N=[N+]=[N-]>>[#6:3]-N=[C:1]=[O:2]", acyl_azide)), "Isocyanatobenzene", hi=("N=C=O",))),
        ],
    }
    nitrile = only(react("[CH2:1]-Br>>[C:1]-C#N", bromobutane))
    ex["u10-nitrile-red"] = {
        "caption": "Cyanide adds one carbon by SN2, and LiAlH₄ turns that C≡N into CH₂NH₂: four carbons become five.",
        "panels": [named(bromobutane, "1-Bromobutane"), arrow("1. NaCN", "2. LiAlH₄, 3. H₂O"), focus(named(only(react("[C:1]#[N:2]>>[C:1]-[N:2]", nitrile)), "Pentan-1-amine", hi=("[CH2]-[NH2]",)))],
    }
    azide = only(react("[CH2:1]-Br>>[C:1]-N=[N+]=[N-]", bromobutane))
    ex["u10-azide"] = {
        "caption": "Azide displaces bromide by SN2, then reduction keeps the N on carbon and lets the other two go as N₂: no carbon added.",
        "panels": [
            named(bromobutane, "1-Bromobutane"), arrow("NaN₃", "SN2"), focus(named(azide, "1-Azidobutane", hi=("N=[N+]=[N-]",))),
            {"kind": "break"},
            named(azide, "1-Azidobutane"), arrow("1. LiAlH₄", "2. H₂O"), focus(named(only(react("[C:1]-[N:2]=[N+]=[N-]>>[C:1]-[N:2]", azide)), "Butan-1-amine", hi=("[CH2]-[NH2]",))),
        ],
    }

    # STAGE B: aryl amines and diazonium salts.
    ex["u10-nitro-red"] = {
        "caption": "Both O atoms leave and the N gains two H; the ring stays aromatic. A meta director becomes an ortho and para one.",
        "panels": [named("O=[N+]([O-])c1ccccc1", "Nitrobenzene"), arrow("Fe, HCl", "then base"), focus(named(only(react("[c:1]-[N+](=O)[O-]>>[c:1]-N", "O=[N+]([O-])c1ccccc1")), "Aniline", hi=("[#6]-[NH2]",)))],
    }
    diazonium = only(react("[c:1]-[NH2]>>[c:1]-[N+]#N", "Nc1ccccc1"))
    ex["u10-diazonium"] = {
        "caption": "Cold NaNO₂ and HCl turn the NH₂ into N≡N⁺ on the same ring carbon: the diazonium ion.",
        "panels": [named("Nc1ccccc1", "Aniline"), arrow("NaNO₂, HCl", "0 to 5 °C"), focus(named(diazonium, "Benzenediazonium", hi=("[N+]#N",)))],
    }
    tolyl = only(react("[c:1]-[NH2]>>[c:1]-[N+]#N", "Cc1ccc(N)cc1"))
    swap = lambda new: only(react(f"[c:1]-[N+]#N>>[c:1]{new}", tolyl))  # noqa: E731
    ex["u10-diazo-sub"] = {
        "caption": "N₂ leaves and a new group takes that ring carbon: CN with copper, I with KI, and H with H₃PO₂, which deletes the N altogether.",
        "panels": [
            named(tolyl, "4-Methylbenzenediazonium"), arrow("CuCN"), focus(named(swap("-C#N"), "4-Methylbenzonitrile", label="Ar-CN", hi=("C#N",))),
            {"kind": "break"},
            named(tolyl, "4-Methylbenzenediazonium"), arrow("KI"), focus(named(swap("-I"), "1-Iodo-4-methylbenzene", label="Ar-I", hi=("[#6]-I",))),
            {"kind": "break"},
            named(tolyl, "4-Methylbenzenediazonium"), arrow("H₃PO₂"), focus(named(swap(""), "Toluene", label="Ar-H")),
        ],
    }
    para = "[OH:6]-[c:7]1:[c:8]:[c:9]:[cH:5]:[c:10]:[c:11]:1"
    ex["u10-azo"] = {
        "caption": "The diazonium ion is the electrophile. Its terminal N bonds to the ring carbon para to OH, and N=N joins two rings: an azo dye.",
        "panels": [
            named(diazonium, "Benzenediazonium"), PLUS, named("Oc1ccccc1", "Phenol"), arrow("mild base"),
            focus(named(only(react(f"[c:1]-[N+]#N.{para}>>[c:1]-N=N-[c:5]1:[c:9]:[c:8]:[c:7](-[OH:6]):[c:11]:[c:10]:1", diazonium, "Oc1ccccc1")), "4-(Phenyldiazenyl)phenol", hi=("N=N",))),
        ],
    }
    acetanilide = only(react("[c:1]-[NH2:2]>>[c:1]-[N:2]-C(=O)C", "Nc1ccccc1"))
    ex["u10-acyl-protect"] = {
        "caption": "Ac₂O turns NH₂ into NHAc, which shares its lone pair with the C=O. The calmer ring brominates once, para.",
        "panels": [
            named("Nc1ccccc1", "Aniline"), arrow("Ac₂O"), focus(named(acetanilide, "N-Phenylacetamide", hi=("NC(=O)C",))),
            {"kind": "break"},
            named(acetanilide, "N-Phenylacetamide"), arrow("Br₂"),
            focus(named(only(react("[CH3:1]-[C:2](=[O:3])-[NH:4]-[c:5]1:[c:6]:[c:7]:[cH:8]:[c:9]:[c:10]:1>>[C:1]-[C:2](=[O:3])-[N:4]-[c:5]1:[c:6]:[c:7]:[c:8](-Br):[c:9]:[c:10]:1", acetanilide)), "N-(4-Bromophenyl)acetamide", hi=("[#6]-Br",))),
        ],
    }
    return ex


HEAD = header("Unit 10", "scripts/guide_u10.py", "test/guideU10.test.ts", "U10_GUIDE_EXAMPLES")

if __name__ == "__main__":
    sys.exit(run(build, "u10Guide.figures.ts", HEAD))
