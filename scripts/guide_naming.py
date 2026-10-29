"""
Naming and acid-base guide drawings, derived with RDKit.

    python scripts/guide_naming.py          writes src/game/guide/nmGuide.figures.ts
    python scripts/guide_naming.py --check  rebuilds it in memory and fails if the file on disk differs

WHAT THIS SCRIPT OWNS. Every structure on the Naming and acid-base reference
page (src/game/naming) and on its flashcards. Nothing is typed from memory:

  * every structure is a SMILES RDKit parsed and drew;
  * every name is read back by OPSIN and must give the drawing's own SMILES;
  * the principal group of every naming example is FOUND by RDKit, walking the
    priority table below from the top with SMARTS, and must equal the group
    the entry claims. A wrong claim stops the script and nothing is written;
  * the ammonium, carboxylate and phenoxide are made from their acids by RDKit.

WHAT IT DOES NOT OWN. The words (src/game/naming/namingContent.ts) and the
pKa numbers, which the page reads at run time from the student's own table.
test/namingRef.test.ts keeps the two files in step.

Every example is a draft (placeholder: true) until the owner signs it off.
"""
from __future__ import annotations

import sys

from rdkit import Chem

from guide_kit import arrow, canon, focus, header, mol, named, react, run
from guide_u1 import mol_panel

# The priority table, highest first. (id, SMARTS of the group, suffix as a
# student writes it). A molecule's principal group is the FIRST row it matches.
PRIORITY: list[tuple[str, str]] = [
    ("acid", "[CX3](=O)[OX2H1]"),
    ("sulfonic-acid", "[SX4](=O)(=O)[OX2H1]"),
    ("anhydride", "[CX3](=O)[OX2][CX3](=O)"),
    ("ester", "[CX3](=O)[OX2][#6]"),
    ("acyl-chloride", "[CX3](=O)Cl"),
    ("amide", "[CX3](=O)[NX3]"),
    ("nitrile", "[CX2]#N"),
    ("aldehyde", "[CX3H1](=O)[#6]"),
    ("ketone", "[#6][CX3](=O)[#6]"),
    ("alcohol", "[OX2H][#6]"),
    ("amine", "[NX3;!$(N[CX3]=O);!$(N=*);!$([N+])][#6]"),
    ("alkene", "[CX3;!a]=[CX3;!a]"),
    ("alkyne", "[CX2]#[CX2]"),
]
HI = dict(PRIORITY)


def principal(smiles: str) -> str:
    """The first row of the priority table the molecule matches, or 'prefix-only'."""
    m = Chem.MolFromSmiles(smiles)
    for ident, smarts in PRIORITY:
        if m.HasSubstructMatch(Chem.MolFromSmarts(smarts)):
            return ident
    return "prefix-only"


# (id, smiles, name shown, name OPSIN must read as the same drawing, claimed group, atoms to colour)
NAMING = [
    ("nm-acid", "OC(=O)c1ccccc1", "benzoic acid", "benzoic acid", "acid", HI["acid"]),
    ("nm-sulfonic-acid", "OS(=O)(=O)c1ccccc1", "benzenesulfonic acid", "benzenesulfonic acid", "sulfonic-acid", HI["sulfonic-acid"]),
    ("nm-anhydride", "O=C(OC(=O)c1ccccc1)c1ccccc1", "benzoic anhydride", "benzoic anhydride", "anhydride", HI["anhydride"]),
    ("nm-ester", "COC(=O)c1ccccc1", "methyl benzoate", "methyl benzoate", "ester", HI["ester"]),
    ("nm-acyl-chloride", "O=C(Cl)c1ccccc1", "benzoyl chloride", "benzoyl chloride", "acyl-chloride", HI["acyl-chloride"]),
    ("nm-amide", "NC(=O)c1ccccc1", "benzamide", "benzamide", "amide", HI["amide"]),
    ("nm-nitrile", "N#Cc1ccccc1", "benzonitrile", "benzonitrile", "nitrile", HI["nitrile"]),
    ("nm-aldehyde", "O=Cc1ccccc1", "benzaldehyde", "benzaldehyde", "aldehyde", HI["aldehyde"]),
    ("nm-ketone", "CC(=O)c1ccccc1", "acetophenone", "1-phenylethan-1-one", "ketone", HI["ketone"]),
    ("nm-alcohol", "Oc1ccccc1", "phenol", "phenol", "alcohol", HI["alcohol"]),
    ("nm-amine", "Nc1ccccc1", "aniline", "aniline", "amine", HI["amine"]),
    ("nm-alkene", "C1=CCCCC1", "cyclohexene", "cyclohexene", "alkene", HI["alkene"]),
    ("nm-alkyne", "CCC#C", "but-1-yne", "but-1-yne", "alkyne", HI["alkyne"]),
    ("nm-halide", "Brc1ccccc1", "bromobenzene", "bromobenzene", "prefix-only", "[Br]"),
    ("nm-nitro", "O=[N+]([O-])c1ccccc1", "nitrobenzene", "nitrobenzene", "prefix-only", "[N+](=O)[O-]"),
    ("nm-ether", "COc1ccccc1", "methoxybenzene", "methoxybenzene", "prefix-only", "[OX2][CH3]"),
    # Groups on a ring: -carboxylic acid, -carbaldehyde, -carbonitrile.
    ("nm-ring-cooh", "OC(=O)C1CCCCC1", "cyclohexanecarboxylic acid", "cyclohexanecarboxylic acid", "acid", HI["acid"]),
    ("nm-ring-cho", "O=CC1CCCCC1", "cyclohexanecarbaldehyde", "cyclohexanecarbaldehyde", "aldehyde", HI["aldehyde"]),
    ("nm-ring-cn", "N#CC1CCCCC1", "cyclohexanecarbonitrile", "cyclohexanecarbonitrile", "nitrile", HI["nitrile"]),
    # di / tri multipliers with locants.
    ("nm-triol", "OCC(O)CO", "propane-1,2,3-triol", "propane-1,2,3-triol", "alcohol", HI["alcohol"]),
    ("nm-tribromo", "Oc1c(Br)cc(Br)cc1Br", "2,4,6-tribromophenol", "2,4,6-tribromophenol", "alcohol", HI["alcohol"]),
    # Numbering tie-breakers.
    ("nm-first-diff", "Cc1ccc(C)c(C)c1", "1,2,4-trimethylbenzene", "1,2,4-trimethylbenzene", "prefix-only", "[CH3]"),
    ("nm-alpha-tie", "Brc1cccc(Cl)c1", "1-bromo-3-chlorobenzene", "1-bromo-3-chlorobenzene", "prefix-only", "[Br,Cl]"),
    # N-substituents.
    ("nm-n-amide", "CNC(=O)c1ccccc1", "N-methylbenzamide", "N-methylbenzamide", "amide", HI["amide"]),
    ("nm-n-aniline", "CN(C)c1ccccc1", "N,N-dimethylaniline", "N,N-dimethylaniline", "amine", HI["amine"]),
    ("nm-n-amine", "CCCN(C)CC", "N-ethyl-N-methylpropan-1-amine", "N-ethyl-N-methylpropan-1-amine", "amine", HI["amine"]),
    # The rules, one structure each.
    ("nm-oxo", "CC(=O)CCC(=O)O", "4-oxopentanoic acid", "4-oxopentanoic acid", "acid", HI["acid"]),
    ("nm-keto-ol", "CC(=O)CCO", "4-hydroxybutan-2-one", "4-hydroxybutan-2-one", "ketone", HI["ketone"]),
    ("nm-en-ol", "C=CC(C)O", "but-3-en-2-ol", "but-3-en-2-ol", "alcohol", HI["alcohol"]),
    ("nm-nitrile-e", "CCC#N", "propanenitrile", "propanenitrile", "nitrile", HI["nitrile"]),
    ("nm-diol", "OCCCCO", "butane-1,4-diol", "butane-1,4-diol", "alcohol", HI["alcohol"]),
    ("nm-ring-acid", "OC(=O)c1ccc(O)c(Br)c1", "3-bromo-4-hydroxybenzoic acid", "3-bromo-4-hydroxybenzoic acid", "acid", HI["acid"]),
    ("nm-alpha", "Oc1ccc(Cl)cc1Br", "2-bromo-4-chlorophenol", "2-bromo-4-chlorophenol", "alcohol", HI["alcohol"]),
    ("nm-ring-ketone", "CC1CCCCC1=O", "2-methylcyclohexan-1-one", "2-methylcyclohexan-1-one", "ketone", HI["ketone"]),
]


def naming_example(ident: str, smiles: str, shown: str, check: str, claim: str, hi: str) -> dict:
    found = principal(smiles)
    assert found == claim, f"{ident}: RDKit finds {found} as the principal group, the entry says {claim}"
    smiles = canon(smiles)
    return {
        "caption": f"{shown}: the principal group is the {claim.replace('-', ' ')}." if claim != "prefix-only" else f"{shown}: no group on the table, so it is named with a prefix.",
        "panels": [
            mol(smiles, hi=(hi,)),
            arrow("Name it"),
            focus(named(smiles, check, label=shown, hi=(hi,))),
        ],
    }


def acid_base() -> dict[str, dict]:
    ex: dict[str, dict] = {}
    water, hydroxide = "O", "[OH-]"

    def deprotonate(acid: str, smarts: str) -> str:
        out = react(smarts, acid)
        assert len(out) == 1, (acid, out)
        return out[0]

    cooh = "[CX3:1](=[O:2])[OX2H1:3]>>[CX3:1](=[O:2])[OX1-:3]"
    acetic = canon("CC(=O)O")
    acetate = deprotonate(acetic, cooh)
    assert acetate == canon("CC(=O)[O-]")
    ex["nm-ab-acetate"] = {
        "caption": "A base takes the O-H proton from acetic acid, leaving acetate, and the base becomes water.",
        "panels": [mol(acetic), {"kind": "plus"}, mol(hydroxide), arrow("base"), focus(named(acetate, "acetate")), {"kind": "plus"}, mol(water)],
    }
    benzoic = canon("OC(=O)c1ccccc1")
    benzoate = deprotonate(benzoic, cooh)
    ex["nm-ab-benzoate"] = {
        "caption": "The same step on benzoic acid gives benzoate. A carboxylic acid becomes -oate when it loses its proton.",
        "panels": [mol(benzoic, hi=(HI["acid"],)), {"kind": "plus"}, mol(hydroxide), arrow("base"), focus(named(benzoate, "benzoate", hi=("[CX3](=O)[OX1-]",))), {"kind": "plus"}, mol(water)],
    }
    # Ammonium: ammonia takes a proton. H+ is the proton, NH4+ is the ion that holds one.
    ammonia = "N"
    mol_ammonia = Chem.MolFromSmiles(ammonia)
    ammonium = canon("[NH4+]")
    chk = Chem.AddHs(Chem.MolFromSmiles(ammonium))
    assert chk.GetNumAtoms() == 5 and Chem.GetFormalCharge(chk) == 1 and mol_ammonia.GetAtomWithIdx(0).GetTotalNumHs() == 3
    ex["nm-ab-ammonium"] = {
        "caption": "Ammonia takes a proton and becomes ammonium. H+ is the bare proton that moves; NH4+ is the ion that carries one.",
        "panels": [mol(ammonia, explicit_h=True), {"kind": "plus"}, mol("[H+]"), arrow("H+"), focus(named(ammonium, "azanium", label="ammonium", explicit_h=True))],
    }
    methylamine = canon("CN")
    methylammonium = canon("C[NH3+]")
    chk = Chem.MolFromSmiles(methylammonium)
    assert Chem.GetFormalCharge(chk) == 1 and chk.GetAtomWithIdx(1).GetTotalNumHs() == 3
    ex["nm-ab-amine"] = {
        "caption": "An amine takes a proton on its lone pair and becomes an ammonium. That ion is the amine's conjugate acid.",
        "panels": [mol(methylamine), {"kind": "plus"}, mol("[OH3+]"), arrow("acid"), focus(named(methylammonium, "methylazanium", label="methylammonium", hi=("[NX4+]",))), {"kind": "plus"}, mol(water)],
    }
    phenol = canon("Oc1ccccc1")
    phenoxide = deprotonate(phenol, "[OX2H1:1][c:2]>>[OX1-:1][c:2]")
    ex["nm-ab-phenoxide"] = {
        "caption": "Phenol is a stronger acid than an alcohol, so hydroxide can take its proton. Phenoxide is the conjugate base.",
        "panels": [mol(phenol), {"kind": "plus"}, mol(hydroxide), arrow("base"), focus(named(phenoxide, "phenoxide", hi=("[OX1-]",))), {"kind": "plus"}, mol(water)],
    }
    ex.update(ario(deprotonate))
    return ex


def forms_of(smiles: str):
    """RDKit's resonance contributors of a structure, as molecules."""
    base = Chem.MolFromSmiles(smiles)
    return [m for m in Chem.ResonanceMolSupplier(base, Chem.ALLOW_CHARGE_SEPARATION)]


def charged_label(m: Chem.Mol, base: Chem.Mol) -> str:
    """Where the negative charge sits in this contributor, read off the graph."""
    a = next(x for x in m.GetAtoms() if x.GetFormalCharge() < 0)
    if a.GetSymbol() == "O":
        return "Charge on O"
    ring = base.GetRingInfo()
    o = next(x for x in m.GetAtoms() if x.GetSymbol() == "O")
    d = len(Chem.GetShortestPath(m, o.GetIdx(), a.GetIdx())) - 1
    return {2: "Charge on ortho C", 3: "Charge on meta C", 4: "Charge on para C"}[d]


def ario(deprotonate) -> dict[str, dict]:
    """Why the pKa numbers differ: Atom, Resonance, Induction, Orbital."""
    ex: dict[str, dict] = {}
    # Atom: the same H on O, N and C. The charge has to sit on that atom.
    ex["nm-ario-atom"] = {
        "caption": "Atom: the same kind of H on three atoms in one row. The more electronegative atom holds the charge best, so O-H is the most acidic.",
        "panels": [
            named("CCO", "ethanol", label="O-H", hi=("[OX2H]",)),
            arrow("weaker acid"),
            named("CCN", "ethanamine", label="N-H", hi=("[NX3H2]",)),
            named("CC", "ethane", label="C-H", hi=("[CH3]",)),
        ],
    }
    # Resonance: phenoxide, contributors derived by RDKit; the ring carbons share the charge.
    phenoxide = canon("[O-]c1ccccc1")
    base = Chem.MolFromSmiles(phenoxide)
    forms = forms_of(phenoxide)
    labelled = {}
    for m in forms:
        labelled.setdefault(charged_label(m, base), m)
    assert set(labelled) == {"Charge on O", "Charge on ortho C", "Charge on para C"}, set(labelled)
    panels = []
    coords = None
    for i, key in enumerate(["Charge on O", "Charge on ortho C", "Charge on para C"]):
        m = labelled[key]
        p, coords = mol_panel(Chem.MolToSmiles(m), key, coords, source=m)
        if i == 1:
            panels.append(arrow("charge moves"))
        elif i == 2:
            panels.append({"kind": "resonance"})
        panels.append(p)
    ex["nm-ario-phenoxide"] = {
        "caption": "Resonance: the phenoxide charge is not stuck on O. It moves onto the ortho and para carbons of the ring, so it is spread over four atoms.",
        "panels": panels,
    }
    acetate = canon("CC(=O)[O-]")
    base = Chem.MolFromSmiles(acetate)
    two = [m for m in forms_of(acetate)]
    sites = {next(a.GetIdx() for a in m.GetAtoms() if a.GetFormalCharge() < 0) for m in two}
    assert len(sites) == 2 and all(base.GetAtomWithIdx(i).GetSymbol() == "O" for i in sites), sites
    p1, c = mol_panel(Chem.MolToSmiles(two[0]), "Charge on one O", source=two[0])
    p2, _ = mol_panel(Chem.MolToSmiles(two[1]), "Charge on the other O", c, source=two[1])
    ex["nm-ario-carboxylate"] = {
        "caption": "Resonance: in acetate the charge and the C=O swap places, so both O atoms carry half of it. Alcohol anions have no such partner.",
        "panels": [p1, arrow("charge moves"), p2],
    }
    # Induction: electron-withdrawing atoms pull on the charge through the bonds.
    ex["nm-ario-induction"] = {
        "caption": "Induction: Cl and F pull electron density through the sigma bonds and steady the carboxylate. More of them, and closer, means a stronger acid.",
        "panels": [
            named("CC(=O)O", "acetic acid", hi=("[CH3]",)),
            arrow("stronger acid"),
            named("ClCC(=O)O", "chloroacetic acid", hi=("[Cl]",)),
            named("OC(=O)C(F)(F)F", "trifluoroacetic acid", hi=("[F]",)),
        ],
    }
    # Orbital: s character of the carbon the charge sits on.
    ex["nm-ario-orbital"] = {
        "caption": "Orbital: the more s character in the carbon's orbital, the closer the lone pair sits to the nucleus. sp (50% s) beats sp2 (33%) beats sp3 (25%).",
        "panels": [
            named("CCC#C", "but-1-yne", label="sp C-H", hi=("[CH]#C",)),
            arrow("weaker acid"),
            named("C=CCC", "but-1-ene", label="sp2 C-H", hi=("[CH2]=C",)),
            named("CCCC", "butane", label="sp3 C-H", hi=("[CH3]C",)),
        ],
    }
    # Predicting an acid you have not seen: 4-nitrophenol vs phenol.
    nitrophenol = canon("Oc1ccc([N+](=O)[O-])cc1")
    ex["nm-ario-predict"] = {
        "caption": "A new case: 4-nitrophenol. The nitro group sits para and can take the ring's charge through resonance, so it is a stronger acid than phenol.",
        "panels": [
            named(nitrophenol, "4-nitrophenol", hi=("[N+](=O)[O-]",)),
            arrow("stronger than"),
            named("Oc1ccccc1", "phenol"),
        ],
    }
    return ex


def build() -> dict:
    # The priority walk must be what the table says: no two examples out of order
    # is checked in test/namingRef.test.ts; here each claim is checked by RDKit.
    ex = {i: naming_example(i, s, n, c, g, h) for i, s, n, c, g, h in NAMING}
    ex.update(acid_base())
    return ex


if __name__ == "__main__":
    head = header("Naming and acid-base", "scripts/guide_naming.py", "test/namingRef.test.ts", "NM_GUIDE_EXAMPLES")
    sys.exit(run(build, "nmGuide.figures.ts", head))
