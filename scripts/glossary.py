"""
The glossary's data, derived with RDKit.

    python scripts/glossary.py          writes src/game/glossary/glossary.generated.ts
                                        and glossary.index.generated.ts
    python scripts/glossary.py --check  rebuilds both in memory and fails if a file on disk differs
                                        (drawing coordinates aside, see GEOMETRY)

WHAT THIS SCRIPT OWNS. Four lists the glossary page (src/game/glossary/)
reads, each one checked here before anything is written:

  1. SHORTHANDS. DMSO, THF, Ph, PCC, Jones and the rest. Each has a SMILES
     that RDKit must parse, and the drawing is made from it.
  2. COMPOUNDS. Every compound named on a reaction card. The list is READ from
     src/data/reactions.ts (the card registry) AND from the site's deck files
     (src/data/decks, the products they draw), never typed here, so a new card
     with a new compound fails this script until its name is explained. The
     owner's item 14 examples (OWNER_EXAMPLES) are added on top, since one of
     them, benzyl chloride, is on no card yet. A compound with one group on a
     benzene ring also gets that group's EWG / EDG effect, found by RDKit
     (RING_RULES). Each
     name is split into parts (aceto + phen + one) and every part carries a
     SMARTS pattern that RDKit must find in the structure: "-one" really is a
     ketone in acetophenone, or nothing is written.
  3. PKA EXAMPLES. One drawn acid per rung of the pKa ladder. The rung ids are
     READ from packages/curriculum/src/pka.ts, so a new rung fails here until it
     has a drawing. The NUMBERS are not here: the page reads them through
     settings/pka.ts, so the student's own table (course or textbook) is the
     one shown.
  4. REFERENCE REACTIONS. Every reaction line of the owner's reagent reference
     (documentation/ORGO2-REAGENT-REFERENCE.md), quoted word for word and filed
     under the functional group it starts from. The filing is authored below;
     a line the filing does not name, or a filing line that matches nothing,
     stops the script. The curriculum's own reaction table is NOT copied here:
     the page imports it from @blueberry/curriculum at run time.

Drawings reuse scripts/guide_u1.py's figure(), so a glossary structure is drawn
exactly like a guidebook one (same bond length, same labels).

A second, small file (glossary.index.generated.ts) holds only the compound and
shorthand names, so the Cards tab can put an info icon on a name without
loading the drawings.
"""
from __future__ import annotations

import json
import re
import sys
from pathlib import Path

from rdkit import Chem, RDLogger

RDLogger.DisableLog("rdApp.*")

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT / "scripts"))
from guide_u1 import figure  # noqa: E402  (the guidebook's drawing code, reused)

OUT = ROOT / "src" / "game" / "glossary" / "glossary.generated.ts"
INDEX_OUT = ROOT / "src" / "game" / "glossary" / "glossary.index.generated.ts"
CARDS = ROOT / "src" / "data" / "reactions.ts"
DECKS = ROOT / "src" / "data" / "decks"
PKA = ROOT / "packages" / "curriculum" / "src" / "pka.ts"
REFERENCE = ROOT / "documentation" / "ORGO2-REAGENT-REFERENCE.md"


def parse(smiles: str) -> Chem.Mol:
    mol = Chem.MolFromSmiles(smiles)
    assert mol is not None, f"RDKit cannot parse {smiles}"
    return mol


def canon(smiles: str) -> str:
    return Chem.MolToSmiles(parse(smiles))


def draw(smiles: str) -> dict:
    """A GuideFigure. A dummy atom (*) is the point a group joins the rest of
    the molecule, labelled R the way a textbook writes it."""
    fig, _ = figure(smiles)
    for label in fig.get("labels", []):
        if label["t"] == "*":
            label["t"] = "R"
    return fig


# --------------------------------------------------------------------------
# Functional group families. The order is the order the page lists them.
# --------------------------------------------------------------------------

FAMILIES = [
    "alkanes", "alkenes", "alkynes", "aromatics", "haloalkanes",
    "alcohols", "amines", "carbonyls", "acids", "esters",
]

# A compound's family, found by RDKit: the first pattern that matches wins, so
# the list runs from the group that names the compound down to the plain chain.
# The first six rows file a group sitting right on a benzene ring under
# aromatics, the same call FAMILY_OF_CLASS in glossaryModel.ts makes for the
# curriculum's aryl classes (aryl amine, arenediazonium salt, phenol, aryl
# ether, aryl ketone, benzoic acid). Without them the Aromatics filter would
# show the diazonium reactions but not the benzenediazonium compound.
FAMILY_BY_PATTERN = [
    ("aromatics", "c[N+]#N"),
    ("aromatics", "c[NX3;!$(N=*);!$([N+](=O)[O-]);!$(NC=O)]"),
    ("aromatics", "c[OX2H1]"),
    ("aromatics", "c[OX2][CX4]"),
    ("aromatics", "c[CX3](=O)[#6]"),
    ("aromatics", "c[CX3](=O)[OX2H1]"),
    ("acids", "[CX3](=O)[OX2H1,OX1-]"),
    ("esters", "[CX3](=O)[OX2][#6]"),
    ("acids", "[CX3](=O)[Cl,Br,NX3]"),
    ("acids", "C#N"),
    ("carbonyls", "[CX3;H0,H1,H2](=O)"),
    ("amines", "[N+]#N"),
    ("amines", "[NX3;!$(N=*);!$([N+](=O)[O-])]"),
    ("alcohols", "[OX2H][CX4]"),
    ("alcohols", "[#6][OX2][#6]"),
    ("haloalkanes", "[CX4][Cl,Br,I]"),
    ("aromatics", "c1ccccc1"),
    ("alkynes", "C#C"),
    ("alkenes", "C=C"),
    ("alkanes", "[CX4]"),
]


def family_of(mol: Chem.Mol) -> str:
    for family, smarts in FAMILY_BY_PATTERN:
        if mol.HasSubstructMatch(Chem.MolFromSmarts(smarts)):
            return family
    raise AssertionError(f"no family for {Chem.MolToSmiles(mol)}")


# --------------------------------------------------------------------------
# 1. Shorthands
# --------------------------------------------------------------------------

# (short, aliases, full name, kind, what it is for, SMILES)
SHORTHANDS = [
    ("DMSO", [], "dimethyl sulfoxide", "solvent",
     "A polar aprotic solvent. It is also the oxidant in a Swern oxidation.", "CS(C)=O"),
    ("THF", [], "tetrahydrofuran", "solvent",
     "An ether solvent. Grignard reagents and hydrides are run in it because it has no O-H to destroy them.", "C1CCOC1"),
    ("DMF", [], "N,N-dimethylformamide", "solvent",
     "A polar aprotic solvent, good for SN2.", "CN(C)C=O"),
    ("DMS", ["Me2S"], "dimethyl sulfide", "reagent",
     "The reductive workup after ozonolysis, so the pieces stop at aldehydes and ketones.", "CSC"),
    ("Py", ["pyridine"], "pyridine", "reagent",
     "A weak base that mops up the HCl a reaction gives off. Often the solvent too.", "c1ccncc1"),
    ("Et3N", ["triethylamine"], "triethylamine", "reagent",
     "A base that mops up acid, like pyridine.", "CCN(CC)CC"),
    ("Me", [], "methyl", "group", "A CH3 group.", "[*]C"),
    ("Et", [], "ethyl", "group", "A CH2CH3 group.", "[*]CC"),
    ("Ph", [], "phenyl", "group", "A benzene ring as a group.", "[*]c1ccccc1"),
    ("Bn", [], "benzyl", "group", "A benzene ring on a CH2.", "[*]Cc1ccccc1"),
    ("tBu", ["t-Bu", "tert-butyl"], "tert-butyl", "group",
     "A carbon holding three methyls. Big, so it blocks things near it.", "[*]C(C)(C)C"),
    ("Ac", ["acetyl"], "acetyl", "group", "A CH3 on a C=O, as a group.", "[*]C(C)=O"),
    ("Ts", ["TsCl", "TsOH", "tosyl"], "tosyl (para-toluenesulfonyl)", "group",
     "TsCl turns an alcohol into a tosylate, a good leaving group. TsOH is a strong acid catalyst.",
     "[*]S(=O)(=O)c1ccc(C)cc1"),
    ("Ms", ["MsCl", "mesyl"], "mesyl (methanesulfonyl)", "group",
     "MsCl turns an alcohol into a mesylate, a good leaving group.", "[*]S(C)(=O)=O"),
    ("PCC", [], "pyridinium chlorochromate", "reagent",
     "An oxidant that stops a primary alcohol at the aldehyde.", "c1cc[nH+]cc1.[O-][Cr](=O)(=O)Cl"),
    ("PDC", [], "pyridinium dichromate", "reagent",
     "Does the same job as PCC.",
     "c1cc[nH+]cc1.c1cc[nH+]cc1.[O-][Cr](=O)(=O)O[Cr](=O)(=O)[O-]"),
    ("DMP", ["Dess-Martin"], "Dess-Martin periodinane", "reagent",
     "A mild oxidant: a primary alcohol to the aldehyde, a secondary one to the ketone.",
     "CC(=O)OI1(OC(C)=O)(OC(C)=O)OC(=O)c2ccccc21"),
    ("Jones", ["Jones reagent", "H2CrO4", "CrO3"], "Jones reagent (CrO3 and H2SO4 in water, which make chromic acid, H2CrO4)", "reagent",
     "A strong oxidant: a primary alcohol goes all the way to the carboxylic acid, a secondary one to the ketone. Drawn here as chromic acid.",
     "O[Cr](=O)(=O)O"),
    ("Swern", ["(COCl)2"], "Swern oxidation: oxalyl chloride and DMSO, then Et3N, cold", "reagent",
     "A primary alcohol to the aldehyde, without chromium. Drawn here as oxalyl chloride.", "O=C(Cl)C(Cl)=O"),
    ("mCPBA", ["MCPBA"], "meta-chloroperoxybenzoic acid", "reagent",
     "Makes an epoxide from an alkene. Also the Baeyer-Villiger oxidant.", "OOC(=O)c1cccc(Cl)c1"),
    ("OsO4", [], "osmium tetroxide", "reagent",
     "Adds two OH groups to the same face of an alkene (syn).", "O=[Os](=O)(=O)=O"),
    ("NMO", [], "N-methylmorpholine N-oxide", "reagent",
     "Turns used OsO4 back into OsO4, so only a little osmium is needed.", "C[N+]1([O-])CCOCC1"),
    ("LDA", [], "lithium diisopropylamide", "reagent",
     "A strong, bulky base. Cold (-78 °C) it pulls the less hindered alpha H: the kinetic enolate.",
     "[Li+].CC(C)[N-]C(C)C"),
    ("NaH", [], "sodium hydride", "reagent", "A strong base that takes the H off an alcohol.", "[Na+].[H-]"),
    ("NaNH2", [], "sodium amide", "reagent",
     "A very strong base: it takes the H off a terminal alkyne.", "[Na+].[NH2-]"),
    ("NaOEt", [], "sodium ethoxide", "reagent",
     "The base for a Claisen condensation and the malonic ester route.", "[Na+].CC[O-]"),
    ("KOtBu", ["t-BuOK", "tBuOK"], "potassium tert-butoxide", "reagent",
     "A bulky base. In an E2 it gives the less substituted alkene.", "[K+].CC(C)(C)[O-]"),
    ("NBS", [], "N-bromosuccinimide", "reagent",
     "Keeps a little Br2 around, so light or a peroxide brominates the allylic or benzylic C-H.",
     "O=C1CCC(=O)N1Br"),
    ("ROOR", ["peroxide"], "a peroxide", "reagent",
     "Starts a radical reaction. The O-O bond breaks easily.", "[*]OO[*]"),
    ("AIBN", [], "azobisisobutyronitrile", "reagent",
     "Starts a radical reaction, like a peroxide.", "CC(C)(C#N)N=NC(C)(C)C#N"),
    ("NaBH4", [], "sodium borohydride", "reagent",
     "A mild hydride: aldehydes and ketones to alcohols. Fine in water or alcohol.", "[Na+].[BH4-]"),
    ("LiAlH4", ["LAH"], "lithium aluminium hydride", "reagent",
     "A strong hydride: also esters, acids and amides. Dry ether first, then the H3O+ workup.",
     "[Li+].[AlH4-]"),
    ("DIBAL-H", ["DIBAL"], "diisobutylaluminium hydride", "reagent",
     "One equivalent at -78 °C reduces an ester to the aldehyde and stops.", "CC(C)C[AlH]CC(C)C"),
    ("NaBH3CN", [], "sodium cyanoborohydride", "reagent",
     "A gentle hydride for reductive amination: it reduces the iminium, not the ketone.", "[Na+].[BH3-]C#N"),
    ("DCC", [], "dicyclohexylcarbodiimide", "reagent",
     "Joins a carboxylic acid to an amine or an alcohol.", "C1CCC(CC1)N=C=NC1CCCCC1"),
    ("DMAP", [], "4-(dimethylamino)pyridine", "reagent",
     "A catalyst that speeds up acylation.", "CN(C)c1ccncc1"),
    ("Tollens", ["Tollens' reagent"], "Tollens' reagent, Ag(NH3)2+", "reagent",
     "Oxidises an aldehyde to the acid and leaves a silver mirror: the aldehyde test.", "[Ag+].N.N"),
    ("H3O+", ["workup"], "hydronium, the acid workup", "reagent",
     "Protonates the alkoxide a reaction leaves behind, giving the alcohol.", "[OH3+]"),
]


# --------------------------------------------------------------------------
# 2. Name parts, and the compounds on the cards
# --------------------------------------------------------------------------

# id: (the part as written, what it means, SMARTS RDKit must find, or None for
# a naming rule that is not a structure). Kept short: one line a student reads.
PARTS = {
    "meth": ("meth-", "one carbon", "[#6]"),
    "eth": ("eth-", "two carbons in a row", "[#6]~[#6]"),
    "prop": ("prop-", "three carbons in a row", "[#6]~[#6]~[#6]"),
    "but": ("but-", "four carbons in a row (from butyric acid, found in butter)", "[#6]~[#6]~[#6]~[#6]"),
    "hex": ("hex-", "six carbons (Greek for six)", "[#6]~[#6]~[#6]~[#6]~[#6]~[#6]"),
    "pent": ("pent-", "five carbons (Greek for five)", "[#6]~[#6]~[#6]~[#6]~[#6]"),
    "hept": ("hept-", "seven carbons (Greek for seven)", "[#6]~[#6]~[#6]~[#6]~[#6]~[#6]~[#6]"),
    "cyclo": ("cyclo-", "the carbons close into a ring", "[#6;R]"),
    "ane": ("-ane", "the main chain has only single bonds", "[CX4]"),
    "ene": ("-ene / -en-", "a C=C double bond", "C=C"),
    "diene": ("-diene", "two C=C double bonds (di = two)", "C=C.C=C"),
    "yne": ("-yne / -yn-", "a C≡C triple bond", "C#C"),
    "methylene": ("methylene-", "a CH2 joined to the rest by a double bond (=CH2). In the ylide that bond is drawn split, CH2- beside P+",
                  "[$([CH2]=*),$([CH2-][P+])]"),
    "ol": ("-ol", "an alcohol: OH on a carbon", "[CX4][OX2H]"),
    "diol": ("-diol", "two OH groups (di = two)", "[CX4][OX2H].[CX4][OX2H]"),
    "al": ("-al", "an aldehyde: the C=O sits at the end of the chain, with an H on it", "[CX3H1](=O)[#6]"),
    "aldehyde": ("aldehyde", "a C=O with at least one H on it", "[CX3;H1,H2]=O"),
    "carbaldehyde": ("-carbaldehyde", "an aldehyde (CHO) hanging off a ring", "[CX3H1](=O)[#6;R]"),
    "one": ("-one", "a ketone: a C=O with a carbon on each side", "[#6][CX3](=O)[#6]"),
    "dione": ("-dione", "two ketone C=O groups (di = two)", "[#6][CX3](=O)[#6].[#6][CX3](=O)[#6]"),
    "oic": ("-oic acid", "a carboxylic acid, COOH", "[CX3](=O)[OX2H1]"),
    "ic": ("-ic acid", "a carboxylic acid, COOH, in an old name kept by IUPAC", "[CX3](=O)[OX2H1]"),
    "oate": ("-oate / -ate", "the acid's O-H has become O-R (an ester) or O- (a carboxylate)",
             "[CX3](=O)[$([OX2][#6]),$([OX1-])]"),
    "oyl": ("-oyl chloride", "an acyl chloride: the acid's OH swapped for Cl", "[CX3](=O)Cl"),
    "ylchloride": ("-yl chloride", "an acyl chloride: the acid's OH swapped for Cl (acetic acid gives acetyl chloride)", "[CX3](=O)Cl"),
    "anhydride": ("anhydride", "two acyl groups sharing one O: two acids joined with the loss of water (Greek an-hydor, without water)",
                  "[CX3](=O)[OX2][CX3](=O)"),
    "cyanohydrin": ("cyanohydrin", "a CN and an OH on the same carbon: HCN added across the C=O of the compound named first",
                    "[CX4]([OX2H])C#N"),
    "ethyleneacetal": ("ethylene acetal",
                       "the C=O of the compound named first became a five membered ring: two O on that carbon, joined by CH2CH2 from ethane-1,2-diol",
                       "[CX4]1OCCO1"),
    "imine": ("-imine", "a C=N double bond in place of a C=O", "[CX3]=[NX2]"),
    "aldimine": ("aldimine", "an imine made from an aldehyde: the C=N carbon keeps the aldehyde's H", "[CX3H1]=[NX2]"),
    "enamine": ("enamine", "a nitrogen on a C=C carbon (ene + amine)", "[NX3][CX3]=[CX3]"),
    "pyrrolidino": ("pyrrolidino-", "a pyrrolidine ring (five atoms, one of them N) joined through its N", "[NX3]1CCCC1"),
    "phosphorane": ("phosphorane", "the phosphorus ylide, Ph3P=CH2, drawn here as P+ beside C-", "[P+]-[#6-]"),
    "amide": ("-amide", "a C=O joined to a nitrogen", "[CX3](=O)[NX3]"),
    "amine": ("amine", "a nitrogen with carbons or H on it, and no C=O next to it", "[NX3;!$(NC=O)]"),
    "nitrile": ("-nitrile", "a C≡N triple bond", "C#N"),
    "nitro": ("nitro-", "an NO2 group", "[N+](=O)[O-]"),
    "chloro": ("chloro-", "a chlorine atom", "Cl"),
    "diazonium": ("diazonium", "an N≡N+ group, two nitrogens with a positive charge", "[N+]#N"),
    "bromo": ("bromo- / bromide", "a bromine atom", "Br"),
    "chloride": ("chloride", "a chlorine atom", "Cl"),
    "hydroxy": ("hydroxy-", "an OH named as a side group, because a higher ranked group took the ending", "[OX2H]"),
    "methoxy": ("methoxy-", "an O-CH3 group", "[CH3][OX2][#6]"),
    "methyl": ("methyl", "a CH3 branch", "[CH3]"),
    "ethyl": ("ethyl", "a CH2CH3 group", "[CH3][CH2]"),
    "propyl": ("propyl", "a CH2CH2CH3 group", "[CH3][CH2][CH2]"),
    "tbu": ("tert-butyl", "a carbon holding three methyls (tert = tertiary: that carbon has three carbons on it)",
            "[CX4]([CH3])([CH3])[CH3]"),
    "phenyl": ("phenyl / phen-", "a benzene ring used as a group (from Greek phainein, to shine: benzene was found in gas for lamps)",
               "c1ccccc1-[#6,#7,#8,#15]"),
    "benz": ("benz-", "a benzene ring (the name comes from gum benzoin, a resin)", "c1ccccc1"),
    "benzyl": ("benzyl", "a benzene ring on a CH2", "c1ccccc1[CH2]"),
    "acet": ("acet-", "a CH3 on a C=O, the acetyl part (from acetic acid, Latin acetum, vinegar)", "[CH3]C(=O)"),
    "acetoacet": ("acetoacet-", "an acetyl part on the CH2 next to another C=O", "[CH3]C(=O)[CH2]C(=O)"),
    "form": ("form-", "one carbon, from formic acid (Latin formica, ant)", "[CX3H2]=O"),
    "malon": ("malon-", "a CH2 between two C=O groups (malonic acid was first made from malic acid, Greek malon, apple)",
              "O=C[CH2]C=O"),
    "mandel": ("mandel-", "from German Mandel, almond: this cyanohydrin is in bitter almonds",
               "c1ccccc1[CH1]([OX2H])C#N"),
    "phenacyl": ("phenacyl", "a phenyl ketone on a CH2, PhC(=O)CH2", "c1ccccc1C(=O)[CH2]"),
    "phenylacet": ("phenylacet-", "the acetyl CH3 with one H swapped for a phenyl, so PhCH2C(=O)", "c1ccccc1[CH2]C(=O)"),
    "primelocant": ("4′-", "a primed number counts around the ring, not along the chain the name is built on", "c1ccccc1"),
    "propargyl": ("propargyl", "the sp3 carbon next to a C≡C (from propyne and Latin argentum, silver: it forms silver salts)",
                  "C#C[CX4]"),
    "ether": ("ether", "an O with a carbon on each side", "[#6][OX2][#6]"),
    "alcohol": ("alcohol", "an OH on a carbon", "[CX4][OX2H]"),
    "oxirane": ("oxirane", "a three membered ring with one oxygen: an epoxide (ox = oxygen, -irane = three ring)",
                "C1OC1"),
    "nlocant": ("N-", "the next group sits on the nitrogen, not on a carbon", "[#7][CH3]"),
    "acrolein": ("acrolein", "an old name, kept: Latin acer (sharp) and oleum (oil), for its sharp smell", "C=CC=O"),
    "aniline": ("aniline", "an old name, kept: from anil, the indigo plant, which it was first made from", "c1ccccc1[NH2]"),
    "acetone": ("acetone", "an old name, kept: acet- (from acetic acid) and -one (a ketone)", "[CH3]C(=O)[CH3]"),
    "benzene": ("benzene", "the six carbon aromatic ring itself", "c1ccccc1"),
    "toluene": ("toluene", "an old name, kept: methylbenzene, first made from tolu balsam, a tree resin", "[CH3]c1ccccc1"),
    "styrene": ("styrene", "an old name, kept: vinylbenzene, first distilled from storax, a tree resin", "[CH2]=[CH]c1ccccc1"),
    "vanillin": ("vanillin", "an old name, kept: the flavour compound of vanilla, 4-hydroxy-3-methoxybenzaldehyde",
                 "O=[CH]c1ccc(O)c(O[CH3])c1"),
}

# Every compound name on the cards, split into its parts. The name list itself
# is read from the card registry; this table only explains it.
NAME_PARTS = {
    "1-bromobut-2-ene": ["bromo", "but", "ene"],
    "1-bromobutane": ["bromo", "but", "ane"],
    "1-methoxy-2-methylpropan-2-ol": ["methoxy", "methyl", "prop", "ol"],
    "1-phenylethanol": ["phenyl", "eth", "ol"],
    "2,2-dimethyloxirane": ["methyl", "oxirane"],
    "2,3-dimethyloxirane": ["methyl", "oxirane"],
    "2-bromo-2-methylpropane": ["bromo", "methyl", "prop", "ane"],
    "2-methylpropene": ["methyl", "prop", "ene"],
    "2-phenylpropan-2-ol": ["phenyl", "prop", "ol"],
    "2-phenylpropene": ["phenyl", "prop", "ene"],
    "3-bromobut-1-ene": ["bromo", "but", "ene"],
    "3-hydroxybutanal": ["hydroxy", "but", "al"],
    "N-methylbenzamide": ["nlocant", "methyl", "benz", "amide"],
    "acetaldehyde": ["acet", "aldehyde"],
    "acetone": ["acetone", "one"],
    "acetophenone": ["acet", "phenyl", "one"],
    "acrolein": ["acrolein", "al"],
    "aniline": ["aniline", "amine"],
    "benzaldehyde": ["benz", "aldehyde"],
    "benzamide": ["benz", "amide"],
    "benzene": ["benzene"],
    "benzenediazonium ion": ["benz", "diazonium"],
    "benzoate": ["benz", "oate"],
    "benzoic acid": ["benz", "oic"],
    "benzonitrile": ["benz", "nitrile"],
    "benzoyl chloride": ["benz", "oyl"],
    "benzyl alcohol": ["benzyl", "alcohol"],
    "benzylamine": ["benzyl", "amine"],
    "benzyl chloride": ["benzyl", "chloride"],
    "bromobenzene": ["bromo", "benz"],
    "but-1-ene": ["but", "ene"],
    "but-2-ene": ["but", "ene"],
    "but-2-enal": ["but", "ene", "al"],
    "but-3-en-2-one": ["but", "ene", "one"],
    "buta-1,3-diene": ["but", "diene"],
    "butan-1-ol": ["but", "ane", "ol"],
    "butanal": ["but", "al"],
    "cyclohex-3-ene-1-carbaldehyde": ["cyclo", "hex", "ene", "carbaldehyde"],
    "cyclohexanone": ["cyclo", "hex", "one"],
    "diethyl malonate": ["ethyl", "malon", "oate"],
    "ethane-1,2-diol": ["eth", "ane", "diol"],
    "ethanol": ["eth", "ol"],
    "ethyl acetate": ["ethyl", "acet", "oate"],
    "ethyl acetoacetate": ["ethyl", "acetoacet", "oate"],
    "ethyl tert-butyl ether": ["ethyl", "tbu", "ether"],
    "ethylbenzene": ["ethyl", "benz"],
    "formaldehyde": ["form", "aldehyde"],
    "heptane-2,6-dione": ["hept", "ane", "dione"],
    "mandelonitrile": ["mandel", "nitrile"],
    "methanol": ["meth", "ol"],
    "methyl benzoate": ["methyl", "benz", "oate"],
    "methylamine": ["methyl", "amine"],
    "nitrobenzene": ["nitro", "benz"],
    "phenacyl bromide": ["phenacyl", "bromo"],
    "propanoic acid": ["prop", "oic"],
    "propargylic alcohol": ["propargyl", "alcohol"],
    "tert-butanol": ["tbu", "ol"],
    # From the site's deck files (src/data/decks), products only.
    "1-methylcyclohexan-1-ol": ["methyl", "cyclo", "hex", "ane", "ol"],
    "1-pyrrolidinocyclohexene": ["pyrrolidino", "cyclo", "hex", "ene", "enamine"],
    "2-methyl-3-butyn-2-ol": ["methyl", "but", "yne", "ol"],
    "2-methylcyclohexanone": ["methyl", "cyclo", "hex", "one"],
    "4-chlorobenzaldehyde": ["chloro", "benz", "aldehyde"],
    "4-ethyltoluene": ["ethyl", "toluene"],
    "4-methoxybenzoic acid": ["methoxy", "benz", "oic"],
    "4-methoxybenzoyl chloride": ["methoxy", "benz", "oyl"],
    "4-methoxybenzyl alcohol": ["methoxy", "benzyl", "alcohol"],
    "4-methylbenzoic acid": ["methyl", "benz", "oic"],
    "4-nitrostyrene": ["nitro", "styrene"],
    "4′-chloroacetophenone": ["primelocant", "chloro", "acet", "phenyl", "one"],
    "N-methyl-4-chlorobenzaldimine": ["nlocant", "methyl", "chloro", "benz", "aldimine"],
    "N-methylbenzaldimine": ["nlocant", "methyl", "benz", "aldimine"],
    "N-methylcyclohexanimine": ["nlocant", "methyl", "cyclo", "hex", "imine"],
    "N-methylpropanimine": ["nlocant", "methyl", "prop", "imine"],
    "acetic acid": ["acet", "ic"],
    "acetic anhydride": ["acet", "anhydride"],
    "acetone cyanohydrin": ["cyanohydrin"],
    "acetyl chloride": ["acet", "ylchloride"],
    "benzaldehyde ethylene acetal": ["benz", "ethyleneacetal"],
    "butan-2-ol": ["but", "ane", "ol"],
    "butan-2-one": ["but", "ane", "one"],
    "butan-2-one ethylene acetal": ["but", "ethyleneacetal"],
    "butanal cyanohydrin": ["but", "cyanohydrin"],
    "butanoic acid": ["but", "oic"],
    "butanoyl chloride": ["but", "oyl"],
    "cyclohexane": ["cyclo", "hex", "ane"],
    "cyclohexanol": ["cyclo", "hex", "ol"],
    "cyclohexanone cyanohydrin": ["cyclo", "hex", "cyanohydrin"],
    "cyclohexanone ethylene acetal": ["cyclo", "hex", "ethyleneacetal"],
    "methyl 4-nitrobenzoate": ["methyl", "nitro", "benz", "oate"],
    "methyl acetate": ["methyl", "acet", "oate"],
    "methyl propanoate": ["methyl", "prop", "oate"],
    "methylenecyclohexane": ["methylene", "cyclo", "hex"],
    "methylenetriphenylphosphorane": ["methylene", "phenyl", "phosphorane"],
    "pentan-2-one": ["pent", "ane", "one"],
    "pentan-3-one": ["pent", "ane", "one"],
    "phenylacetaldehyde": ["phenylacet", "aldehyde"],
    "phenylacetic acid": ["phenylacet", "ic"],
    "propan-1-ol": ["prop", "ane", "ol"],
    "propylbenzene": ["propyl", "benz"],
    "styrene": ["styrene"],
    "vanillin acetate": ["vanillin", "acet", "oate"],
}

# Labels on the cards that describe a structure rather than name a compound,
# so there is no name to explain. Listed, not ignored: a new label must land in
# NAME_PARTS or here, or the script stops.
NOT_A_NAME = {
    "N-methyl imine", "bicyclic enone", "cyclic acetal", "water",
    # From the deck files: a description of the product, not its name.
    "cyclic hemiacetal", "less substituted enamine", "dimethyl ketal",
}

# Compounds the owner named in item 14 (STATUS.md, "Wave 4") that no card
# shows yet. Name to SMILES; each still has its parts checked by RDKit below.
# If a card later shows one, the card's drawing must agree with this one.
OWNER_EXAMPLES = {
    "acetophenone": "CC(=O)c1ccccc1",
    "benzoic acid": "OC(=O)c1ccccc1",
    "benzyl chloride": "ClCc1ccccc1",
    "methyl benzoate": "COC(=O)c1ccccc1",
    "buta-1,3-diene": "C=CC=C",
}


def card_compounds() -> dict[str, str]:
    """Name to canonical SMILES, for every labelled compound on the cards."""
    text = CARDS.read_text(encoding="utf-8")
    data, _ =json.JSONDecoder().raw_decode(text[text.index("{\n  \"pkaLeavingGroupCutoff\""):])
    found: dict[str, str] = {}

    def add(label: str, smiles: str) -> None:
        name = re.sub(r"\s*\(.*\)$", "", label).strip()  # "ethanol (with X)" names ethanol
        if name in NOT_A_NAME:
            return
        smi = canon(smiles)
        if name in found:
            assert found[name] == smi, f"the cards draw {name} two ways: {found[name]} and {smi}"
        found[name] = smi

    for reaction in data["reactions"]:
        for smiles, label in zip(reaction["reactants"], reaction["reactant_labels"]):
            add(label, smiles)
        add(reaction["product_label"], reaction["product"])
    return found


def deck_compounds() -> dict[str, str]:
    """Name to canonical SMILES, for every product the site's decks draw.

    A deck question that draws its product carries both `badge: "<name>"` and
    `product: "<SMILES>"` in one object; questions without a product field
    (the retro and name-reagent decks) have nothing drawn to explain. Badges
    are written as titles ("Methyl benzoate"), so the name is lower cased with
    a leading N- put back."""
    found: dict[str, str] = {}
    for path in sorted(DECKS.rglob("*.ts")):
        text = path.read_text(encoding="utf-8")
        for obj in re.findall(r"\{[^{}]*\}", text):
            badge = re.search(r'badge: "([^"]*)"', obj)
            product = re.search(r'product: "([^"]*)"', obj)
            if badge is None or product is None:
                continue
            name = badge.group(1).lower()
            if name.startswith("n-"):
                name = "N-" + name[2:]
            if name in NOT_A_NAME:
                continue
            smi = canon(product.group(1))
            if name in found:
                assert found[name] == smi, f"the decks draw {name} two ways: {found[name]} and {smi}"
            found[name] = smi
    return found


def merged_compounds() -> dict[str, str]:
    """The cards' names plus the decks', keeping the card spelling on a tie
    (the same name in another case is one compound)."""
    found = card_compounds()
    by_lower = {name.lower(): name for name in found}
    for name, smi in deck_compounds().items():
        key = by_lower.get(name.lower(), name)
        assert found.get(key, smi) == smi, f"{key} is drawn two ways: {found[key]} on the cards and {smi} in the decks"
        found[key] = smi
        by_lower[key.lower()] = key
    return found


# --------------------------------------------------------------------------
# EWG / EDG on a ring: the owner's lecture point, per compound
# --------------------------------------------------------------------------

# (SMARTS from the ring carbon to the first atom of the group, the group in
# words, the effect). The effect words are the Unit 3 pools' ("o/p director,
# activating", "meta director, deactivating", "o/p director, deactivating"),
# the same words SUBSTITUENTS below draws. The first row that matches wins.
RING_RULES = [
    ("c-[CX3;!$(C[O-])]=O", "the C=O", "meta director, deactivating"),
    ("c-C#N", "the C≡N", "meta director, deactivating"),
    ("c-[N+](=O)[O-]", "the NO2", "meta director, deactivating"),
    ("c-[NX3;H2,H1;!$(NC=O)]", "the NH2", "o/p director, activating"),
    ("c-[OX2H]", "the OH", "o/p director, activating"),
    ("c-[OX2][CX4]", "the OR", "o/p director, activating"),
    ("c-[CX4;!$(C[!#6;!#1])]", "the alkyl group", "o/p director, activating"),
    ("c-[F,Cl,Br,I]", "the halogen", "o/p director, deactivating"),
]

# Aromatic compounds that get no ring note, each with the reason. Listed, not
# ignored, the same way NOT_A_NAME is: an aromatic compound in neither place
# stops the script, so a new one is looked at before it is shipped.
NO_RING_NOTE = {
    "benzene": "nothing on the ring yet",
    "benzenediazonium ion": "the diazonium is a leaving group here, not a ring director the pools grade",
    "benzoate": "a charged carboxylate; the pools grade neutral groups",
    "benzyl alcohol": "the group joins the ring through a CH2 that carries an O",
    "benzylamine": "the group joins the ring through a CH2 that carries an N",
    "benzyl chloride": "the group joins the ring through a CH2 that carries a Cl",
    "1-phenylethanol": "the group joins the ring through a CH that carries an O",
    "2-phenylpropan-2-ol": "the group joins the ring through a carbon that carries an O",
    "mandelonitrile": "the group joins the ring through a CH that carries an O and a CN",
    "propargylic alcohol": "the group joins the ring through a CH that carries an O",
    "2-phenylpropene": "a C=C on the ring, which the pools do not grade",
    "styrene": "a C=C on the ring, which the pools do not grade",
    "N-methylbenzaldimine": "a C=N on the ring, which the pools do not grade",
    "benzaldehyde ethylene acetal": "the group joins the ring through a carbon that carries two O",
    "methylenetriphenylphosphorane": "three rings, each on a phosphorus",
    "4-chlorobenzaldehyde": "two groups on the ring",
    "4-ethyltoluene": "two groups on the ring",
    "4-methoxybenzoic acid": "two groups on the ring",
    "4-methoxybenzoyl chloride": "two groups on the ring",
    "4-methoxybenzyl alcohol": "two groups on the ring",
    "4-methylbenzoic acid": "two groups on the ring",
    "4-nitrostyrene": "two groups on the ring",
    "4′-chloroacetophenone": "two groups on the ring",
    "N-methyl-4-chlorobenzaldimine": "two groups on the ring",
    "methyl 4-nitrobenzoate": "two groups on the ring",
    "vanillin acetate": "three groups on the ring",
}

BENZENE = Chem.MolFromSmarts("c1ccccc1")


def ring_note(name: str, mol: Chem.Mol) -> dict | None:
    """The EWG / EDG line for a compound with exactly one benzene ring that
    carries exactly one group, or None for a compound with no aromatic ring.
    Every other aromatic compound must be in NO_RING_NOTE."""
    if not any(atom.GetIsAromatic() for atom in mol.GetAtoms()):
        assert name not in NO_RING_NOTE, f"{name} is in NO_RING_NOTE but has no aromatic ring"
        return None
    rings = mol.GetSubstructMatches(BENZENE)
    ring_sets = {frozenset(r) for r in rings}
    note = None
    if len(ring_sets) == 1:
        ring = next(iter(ring_sets))
        bonds = [(a, n.GetIdx()) for a in ring for n in mol.GetAtomWithIdx(a).GetNeighbors()
                 if n.GetIdx() not in ring and n.GetAtomicNum() > 1]
        if len(bonds) == 1:
            ring_atom, group_atom = bonds[0]
            for smarts, group, effect in RING_RULES:
                hits = mol.GetSubstructMatches(Chem.MolFromSmarts(smarts))
                if any(hit[0] == ring_atom and hit[1] == group_atom for hit in hits):
                    note = {"group": group, "effect": effect}
                    break
    if name in NO_RING_NOTE:
        assert note is None, f"{name} is in NO_RING_NOTE, but RDKit finds {note}"
        return None
    assert note is not None, f"{name} is aromatic with no ring note: add a RING_RULES row or a NO_RING_NOTE reason"
    return note


def compounds() -> list[dict]:
    on_cards = merged_compounds()
    for name, smiles in OWNER_EXAMPLES.items():
        smi = canon(smiles)
        assert on_cards.get(name, smi) == smi, f"the cards draw {name} as {on_cards[name]}, the owner list as {smi}"
        on_cards[name] = smi
    missing = sorted(set(on_cards) - set(NAME_PARTS))
    assert not missing, f"compounds on the cards with no name parts here: {missing}"
    stale = sorted(set(NAME_PARTS) - set(on_cards))
    assert not stale, f"name parts for compounds no card shows: {stale}"
    out = []
    for name in sorted(on_cards, key=str.lower):
        smiles = on_cards[name]
        mol = parse(smiles)
        for part in NAME_PARTS[name]:
            smarts = PARTS[part][2]
            assert mol.HasSubstructMatch(Chem.MolFromSmarts(smarts)), \
                f"{name}: the part {PARTS[part][0]} says {smarts}, and RDKit does not find it in {smiles}"
        entry = {
            "name": name,
            "smiles": smiles,
            "family": family_of(mol),
            "parts": NAME_PARTS[name],
            "figure": draw(smiles),
        }
        ring = ring_note(name, mol)
        if ring is not None:
            entry["ring"] = ring
        out.append(entry)
    stale = sorted(set(NO_RING_NOTE) - set(on_cards))
    assert not stale, f"NO_RING_NOTE names compounds no card shows: {stale}"
    return out


# --------------------------------------------------------------------------
# 3. pKa examples: one drawn acid per rung of the curriculum's ladder
# --------------------------------------------------------------------------

PKA_EXAMPLES = {
    "protonated_carbonyl": "CC(C)=[OH+]",
    "protonated_alcohol": "CC[OH2+]",
    "hydronium": "[OH3+]",
    "carboxylic_acid": "CC(=O)O",
    "carbonic_acid": "OC(=O)O",
    "phenol": "Oc1ccccc1",
    "ammonium": "C[NH3+]",
    "beta_dicarbonyl_alpha_ch": "CCOC(=O)CC(C)=O",
    "water": "O",
    "alcohol": "CCO",
    "ketone_alpha_ch": "CC(C)=O",
    "ester_alpha_ch": "CCOC(C)=O",
    "terminal_alkyne_ch": "CC#C",
    "amine_nh": "CC(C)NC(C)C",
    "vinylic_or_aromatic_ch": "c1ccccc1",
    "alkane_ch": "CC",
}

# What each example must contain, so a drawing cannot sit on the wrong rung.
PKA_SITE_PATTERNS = {
    "protonated_carbonyl": "[CX3]=[OX2H1+]",
    "protonated_alcohol": "[CX4][OX3H2+]",
    "hydronium": "[OX3H3+]",
    "carboxylic_acid": "[CX3](=O)[OX2H1]",
    "carbonic_acid": "[OX2H1]C(=O)[OX2H1]",
    "phenol": "c[OX2H1]",
    "ammonium": "[NX4H3+]",
    "beta_dicarbonyl_alpha_ch": "C(=O)[CH2]C(=O)",
    "water": "[OX2H2]",
    "alcohol": "[CX4][OX2H1]",
    "ketone_alpha_ch": "[CH3][CX3](=O)[#6]",
    "ester_alpha_ch": "[CH3][CX3](=O)[OX2][#6]",
    "terminal_alkyne_ch": "[CH]#C",
    "amine_nh": "[CX4][NX3H1][CX4]",
    "vinylic_or_aromatic_ch": "[cH]",
    "alkane_ch": "[CH3][CH3]",
}


def pka_examples() -> dict:
    text = PKA.read_text(encoding="utf-8")
    union = text[text.index("export type PkaSiteId"):text.index(";", text.index("export type PkaSiteId"))]
    ids = re.findall(r'"([a-z_]+)"', union)
    assert sorted(ids) == sorted(PKA_EXAMPLES), \
        f"pKa rungs and drawings disagree: ladder {sorted(ids)}, drawn {sorted(PKA_EXAMPLES)}"
    out = {}
    for site in ids:
        smiles = PKA_EXAMPLES[site]
        mol = parse(smiles)
        assert mol.HasSubstructMatch(Chem.MolFromSmarts(PKA_SITE_PATTERNS[site])), f"{site}: {smiles} lacks its acidic site"
        out[site] = {"smiles": canon(smiles), "figure": draw(smiles)}
    return out


# --------------------------------------------------------------------------
# Substituent effects: the four rings the EWG / EDG note draws
# --------------------------------------------------------------------------

# (name, SMILES, effect). The effect words match the Unit 3 pools ("o/p
# director, activating", "meta director, deactivating", "o/p director,
# deactivating").
SUBSTITUENTS = [
    ("anisole", "COc1ccccc1", "edg"),
    ("toluene", "Cc1ccccc1", "edg"),
    ("chlorobenzene", "Clc1ccccc1", "halogen"),
    ("nitrobenzene", "O=[N+]([O-])c1ccccc1", "ewg"),
]


def substituents() -> list[dict]:
    return [{"name": n, "smiles": canon(s), "effect": e, "figure": draw(s)} for n, s, e in SUBSTITUENTS]


# --------------------------------------------------------------------------
# 4. The owner's reagent reference, filed by functional group
# --------------------------------------------------------------------------

# (section number, start of the line, the families it starts from). An empty
# tuple files the line under no family: an analytical or conceptual line with
# no reagents to learn. Every line in the reference must match exactly one row.
FILING = [
    (1, "1,2- vs 1,4-addition", ("alkenes",)),
    (1, "Addition of X2", ("alkenes",)),
    (1, "Diels-Alder", ("alkenes",)),
    (1, "Inverse/hetero", ("alkenes", "carbonyls")),
    (1, "Allylic halogenation", ("alkenes",)),
    (1, "Radical polymerization", ("alkenes",)),
    (2, "No new preparative", ()),
    (2, "Recognizing aromatic", ()),
    (3, "Halogenation", ("aromatics",)),
    (3, "Nitration", ("aromatics",)),
    (3, "Sulfonation", ("aromatics",)),
    (3, "Friedel-Crafts alkylation", ("aromatics",)),
    (3, "Friedel-Crafts acylation", ("aromatics",)),
    (3, "Gattermann-Koch", ("aromatics",)),
    (3, "Gattermann / Houben-Hoesch", ("aromatics",)),
    (3, "Kolbe-Schmitt", ("aromatics",)),
    (3, "Reimer-Tiemann", ("aromatics",)),
    (3, "Side-chain reactions", ("aromatics",)),
    (3, "Carbonyl to CH2", ("aromatics", "carbonyls")),
    (3, "Nitro reduction", ("aromatics",)),
    (3, "Birch reduction", ("aromatics",)),
    (4, "SNAr", ("aromatics",)),
    (4, "Benzyne", ("aromatics",)),
    (4, "Phenol synthesis", ("aromatics",)),
    (5, "Alcohol to alkyl halide", ("alcohols",)),
    (5, "Alcohol to tosylate", ("alcohols",)),
    (5, "Dehydration", ("alcohols",)),
    (5, "Oxidation", ("alcohols",)),
    (5, "Williamson", ("alcohols", "haloalkanes")),
    (5, "Alkoxymercuration", ("alkenes",)),
    (5, "Ether cleavage", ("alcohols",)),
    (5, "Epoxide synthesis", ("alkenes",)),
    (5, "Epoxide opening, acidic", ("alcohols",)),
    (5, "Epoxide opening, basic", ("alcohols",)),
    (5, "Syn-dihydroxylation", ("alkenes",)),
    (5, "Anti-dihydroxylation", ("alkenes",)),
    (5, "Oxidative cleavage", ("alcohols",)),
    (5, "Pinacol", ("alcohols",)),
    (5, "Thiol/sulfide", ("haloalkanes", "amines")),
    (6, "No preparative", ()),
    (6, "IR functional-group", ()),
    (6, "1H NMR", ()),
    (6, "Mass spec", ()),
    (7, "Hydration", ("carbonyls",)),
    (7, "Cyanohydrin", ("carbonyls",)),
    (7, "Bisulfite", ("carbonyls",)),
    (7, "Acetal / hemiacetal", ("carbonyls",)),
    (7, "Thioacetal", ("carbonyls",)),
    (7, "Imine", ("carbonyls",)),
    (7, "Enamine", ("carbonyls",)),
    (7, "Oxime", ("carbonyls",)),
    (7, "Wittig", ("carbonyls",)),
    (7, "Grignard", ("carbonyls",)),
    (7, "Reduction to alcohol", ("carbonyls",)),
    (7, "Reduction to CH2", ("carbonyls",)),
    (7, "Meerwein-Ponndorf-Verley", ("carbonyls",)),
    (7, "Baeyer-Villiger", ("carbonyls",)),
    (7, "Oxidation of aldehyde", ("carbonyls",)),
    (7, "Cannizzaro", ("carbonyls",)),
    (8, "Acid to acyl chloride", ("acids",)),
    (8, "Acid to anhydride", ("acids",)),
    (8, "Fischer esterification", ("acids",)),
    (8, "Acid to ester (other)", ("acids",)),
    (8, "Acyl chloride to ester", ("acids",)),
    (8, "Anhydride to", ("acids",)),
    (8, "Ester hydrolysis", ("esters",)),
    (8, "Transesterification", ("esters",)),
    (8, "Amide hydrolysis", ("acids",)),
    (8, "Nitrile", ("acids", "haloalkanes")),
    (8, "Reductions", ("acids", "esters")),
    (8, "Organometallics on derivatives", ("esters", "acids")),
    (8, "Weinreb amide", ("acids",)),
    (8, "Hell-Volhard-Zelinsky", ("acids",)),
    (8, "Decarboxylation", ("acids",)),
    (9, "α-Halogenation (acid)", ("carbonyls",)),
    (9, "α-Halogenation (base)", ("carbonyls",)),
    (9, "HVZ", ("acids",)),
    (9, "Aldol addition", ("carbonyls",)),
    (9, "Crossed/mixed aldol", ("carbonyls",)),
    (9, "Intramolecular aldol", ("carbonyls",)),
    (9, "Claisen condensation", ("esters",)),
    (9, "Malonic ester", ("esters",)),
    (9, "Acetoacetic ester", ("esters",)),
    (9, "Michael addition", ("carbonyls",)),
    (9, "Stork enamine", ("carbonyls", "amines")),
    (9, "Robinson annulation", ("carbonyls",)),
    (9, "Enolate alkylation", ("carbonyls",)),
    (9, "Mannich", ("carbonyls",)),
    (9, "Knoevenagel", ("carbonyls",)),
    (9, "Reformatsky", ("esters",)),
    (9, "Conjugate organocuprate", ("carbonyls",)),
    (10, "Reductive amination", ("carbonyls", "amines")),
    (10, "Direct alkylation", ("amines", "haloalkanes")),
    (10, "Gabriel synthesis", ("haloalkanes", "amines")),
    (10, "Azide route", ("haloalkanes", "amines")),
    (10, "Nitrile reduction", ("acids", "amines")),
    (10, "Amide reduction", ("acids", "amines")),
    (10, "Nitro reduction", ("aromatics", "amines")),
    (10, "Hofmann rearrangement", ("acids", "amines")),
    (10, "Curtius rearrangement", ("acids", "amines")),
    (10, "Hofmann elimination", ("amines",)),
    (10, "Cope elimination", ("amines",)),
    (10, "Diazonium formation", ("aromatics", "amines")),
    (10, "Diazonium substitutions", ("aromatics",)),
    (10, "Azo coupling", ("aromatics",)),
    (10, "Acylation to protect", ("amines",)),
    (11, "Acidity / salt formation", ("aromatics",)),
    (11, "Williamson", ("aromatics",)),
    (11, "Ester formation", ("aromatics",)),
    (11, "EAS on phenol", ("aromatics",)),
    (11, "Kolbe-Schmitt", ("aromatics",)),
    (11, "Reimer-Tiemann", ("aromatics",)),
    (11, "Oxidation to a quinone", ("aromatics",)),
    (11, "Claisen rearrangement", ("aromatics",)),
    (12, "Cycloadditions", ("alkenes",)),
    (12, "Electrocyclic", ("alkenes",)),
    (12, "Sigmatropic", ("alkenes",)),
    (12, "A reagent-light chapter", ()),
    (13, "Mutarotation", ("carbonyls",)),
    (13, "Glycoside formation", ("carbonyls",)),
    (13, "Ether/ester (protecting)", ("alcohols",)),
    (13, "Oxidation", ("carbonyls",)),
    (13, "Reduction", ("carbonyls",)),
    (13, "Kiliani-Fischer", ("carbonyls",)),
    (13, "Wohl / Ruff", ("carbonyls",)),
    (13, "Osazone", ("carbonyls",)),
    (14, "Strecker synthesis", ("carbonyls",)),
    (14, "Gabriel-malonic", ("esters",)),
    (14, "Reductive amination of", ("carbonyls", "amines")),
    (14, "Peptide coupling", ("acids", "amines")),
    (14, "Deprotection", ("amines",)),
    (14, "Edman degradation", ("amines",)),
    (14, "Ninhydrin", ()),
    (14, "Sanger's reagent", ("aromatics", "amines")),
    (15, "Fat/oil hydrolysis", ("esters",)),
    (15, "Hydrogenation of oils", ("alkenes",)),
    (15, "Terpene / steroid", ()),
    (15, "Multistep synthesis", ()),
]


def reference_reactions() -> list[dict]:
    lines: list[tuple[int, str, str]] = []  # (section, section title, bullet)
    section, title, inside = 0, "", False
    for raw in REFERENCE.read_text(encoding="utf-8").splitlines():
        heading = re.match(r"^## (\d+)\. (.+)$", raw)
        if heading:
            section, title, inside = int(heading.group(1)), heading.group(2).strip(), False
            continue
        if raw.startswith("Reactions (reagents / conditions):"):
            inside = True
            continue
        if inside and raw.startswith("- "):
            lines.append((section, title, raw[2:].strip()))
        elif inside and raw.strip() and not raw.startswith("- "):
            inside = False

    used = [0] * len(FILING)
    out = []
    for section, title, text in lines:
        rows = [i for i, (s, start, _) in enumerate(FILING) if s == section and text.startswith(start)]
        # The longest start wins, so "Nitrile reduction" is not filed as "Nitrile".
        assert rows, f"section {section}: no filing row for the line {text!r}"
        best = max(rows, key=lambda i: len(FILING[i][1]))
        used[best] += 1
        families = list(FILING[best][2])
        for f in families:
            assert f in FAMILIES, f"unknown family {f}"
        head, _, rest = text.partition(": ")
        out.append({
            "section": section,
            "topic": title,
            "title": head if rest else text,
            "detail": rest,
            "families": families,
        })
    unused = [FILING[i][:2] for i, n in enumerate(used) if n == 0]
    assert not unused, f"filing rows that match no line of the reference: {unused}"
    doubled = [FILING[i][:2] for i, n in enumerate(used) if n > 1]
    assert not doubled, f"filing rows that match more than one line: {doubled}"
    return out


# --------------------------------------------------------------------------
# Output
# --------------------------------------------------------------------------

HEADER = '''/**
 * The glossary's data. GENERATED by scripts/glossary.py with RDKit.
 * Do not edit by hand: change the script and rerun it.
 *
 * Every structure is a SMILES RDKit parsed and drew. Compound names are read
 * from the card registry and every part of a name is a SMARTS pattern RDKit
 * found in that compound. The reference lines are quoted word for word from
 * documentation/ORGO2-REAGENT-REFERENCE.md. test/glossary.test.ts reruns the
 * script with --check, so a hand edit here fails the suite.
 */
import type { GlossaryData } from "./types";

export const GLOSSARY_DATA: GlossaryData = '''


def build() -> dict:
    for short, _aliases, _full, _kind, _for, smiles in SHORTHANDS:
        parse(smiles)
    return {
        "families": FAMILIES,
        "shorthands": [
            {"short": s, "aliases": a, "full": f, "kind": k, "use": u, "smiles": canon(sm), "figure": draw(sm)}
            for s, a, f, k, u, sm in SHORTHANDS
        ],
        "parts": {k: {"text": t, "means": m} for k, (t, m, _s) in PARTS.items()},
        "compounds": compounds(),
        "pka": pka_examples(),
        "substituents": substituents(),
        "reference": reference_reactions(),
    }


INDEX_HEADER = '''/**
 * The glossary's names only. GENERATED by scripts/glossary.py with
 * glossary.generated.ts; do not edit by hand.
 *
 * Small on purpose: the Cards tab imports it (cardLinks.ts) to know which
 * names on a card have a glossary entry, without loading the drawings. The
 * entry ids are made from these names by slug.ts, the same way
 * glossaryModel.ts makes them.
 */
'''


def render(data: dict) -> str:
    return HEADER + json.dumps(data, indent=1, ensure_ascii=False) + ";\n"


def render_index(data: dict) -> str:
    names = [c["name"] for c in data["compounds"]]
    shorts = {s["short"]: [s["short"], *s["aliases"]] for s in data["shorthands"]}
    return (
        INDEX_HEADER
        + "export const GLOSSARY_COMPOUND_NAMES: readonly string[] = "
        + json.dumps(names, indent=1, ensure_ascii=False)
        + ";\n\n/** Each shorthand, keyed by its short form, with every way it is written. */\n"
        + "export const GLOSSARY_SHORTHAND_NAMES: Readonly<Record<string, readonly string[]>> = "
        + json.dumps(shorts, indent=1, ensure_ascii=False)
        + ";\n"
    )


# RDKit lays some molecules out with different 2D coordinates on Windows and on
# Linux. Found in CI on 27 Oct: 46 bond lines, 30 label positions and two figure
# sizes differed, and nothing else in the file did. So --check blanks the drawing
# numbers on both sides and compares the rest exactly: names, SMILES, name parts,
# labels and bond kinds still cannot drift or be hand edited.
GEOMETRY = re.compile(r'"(x1|y1|x2|y2|x|y|w|h)": -?\d+(?:\.\d+)?')


def without_geometry(text: str) -> str:
    return GEOMETRY.sub(r'"\1": 0', text)


def main() -> int:
    data = build()
    outputs = [(OUT, render(data)), (INDEX_OUT, render_index(data))]
    if "--check" in sys.argv:
        for path, text in outputs:
            on_disk = path.read_text(encoding="utf-8") if path.exists() else ""
            if without_geometry(on_disk) != without_geometry(text):
                print(f"{path.relative_to(ROOT)} is stale or hand edited: rerun python scripts/glossary.py")
                return 1
        print("glossary: every structure parses and both files match")
        return 0
    for path, text in outputs:
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_text(text, encoding="utf-8", newline="\n")
        print(f"wrote {path.relative_to(ROOT)}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
