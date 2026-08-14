"""
Author, validate and emit the CHEM241 reaction set.

This follows reaction_generation_procedure.md. The important change from the
first version of this script: a reaction is staged structured data, never
flattened prose. The old version carried one `conditions` string per reaction,
which is exactly the shape that produced "sodium borohydride, acidic
conditions" - the hydride delivery and the aqueous workup collapsed into one
label that is chemically false. Here they are stage 1 and stage 2, each with
its own reagents, its own acid_base, and its own byproducts.

Pipeline, per section 3:
  C. RDKit hard checks   -> parse, valence, atom and charge conservation
  D. classification      -> Rxn-INSIGHT fact-checks the claimed reaction_type
  E. decide              -> ok publishes, flagged goes to the review queue

Nothing flagged is published. Section 3 step E, and section 11: an honest flag
is a success, a fabricated pass is the outcome the procedure exists to prevent.

Run: python scripts/build_curriculum.py
Do not use em dashes in output.
"""

from __future__ import annotations

import json
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))

from conservation_check import (  # noqa: E402
    DEFAULT_LEAVING_GROUP_PKA_CUTOFF,
    canonical,
    run_regression,
    validate_staged,
)

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / "src" / "data" / "reactions.ts"
FLAGGED = ROOT / "src" / "data" / "flagged_reactions.json"
ART = ROOT / "public" / "reactions"


# ==========================================================================
# Structure drawings
# ==========================================================================
#
# Drawn from the same canonical SMILES that passed the conservation checks, so
# the picture and the validated structure cannot disagree. Hand-drawn artwork
# can drift from the data it illustrates; a render cannot.
#
# Two files per structure, light and dark. RDKit writes literal colours into
# the SVG and an <img> does not inherit CSS, so `currentColor` is not available
# and a single file would be near-invisible in one theme. The component shows
# one and hides the other.

# slate-800 on light, stone-200 on dark: carbon skeleton only. Heteroatoms keep
# recognisable colours in both, brightened for dark so they stay legible
# against stone rather than glowing.
_LIGHT_CARBON = (0.12, 0.16, 0.23)
_DARK_CARBON = (0.90, 0.89, 0.88)
_DARK_HETERO = {
    7: (0.55, 0.68, 1.00),    # N
    8: (1.00, 0.50, 0.50),    # O
    9: (0.55, 0.90, 0.60),    # F
    15: (1.00, 0.65, 0.35),   # P
    16: (0.95, 0.85, 0.35),   # S
    17: (0.50, 0.92, 0.55),   # Cl
    35: (0.90, 0.60, 0.45),   # Br
    53: (0.80, 0.55, 0.95),   # I
}


def render_svg(smiles: str, path: Path, dark: bool, width: int = 340, height: int = 210) -> bool:
    """One structure to one SVG. False if RDKit will not draw it."""
    from rdkit import Chem
    from rdkit.Chem.Draw import rdMolDraw2D

    mol = Chem.MolFromSmiles(smiles)
    if mol is None:
        return False

    drawer = rdMolDraw2D.MolDraw2DSVG(width, height)
    opts = drawer.drawOptions()
    # Transparent, so the card behind it shows through and one render works on
    # any surface colour.
    opts.clearBackground = False
    opts.bondLineWidth = 2
    opts.padding = 0.08
    if dark:
        opts.setAtomPalette({-1: _DARK_CARBON})
        opts.updateAtomPalette(_DARK_HETERO)
    else:
        opts.setAtomPalette({-1: _LIGHT_CARBON})

    rdMolDraw2D.PrepareAndDrawMolecule(drawer, mol)
    drawer.FinishDrawing()
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(drawer.GetDrawingText(), encoding="utf-8")
    return True


def render_reaction_art(rxn) -> dict:
    """
    Start and product, each in both themes.

    Separate images rather than one scheme, because the product has to be
    hideable: covering half of a single drawing is not something a student can
    do, and "predict the product" is the exercise the page exists for.
    """
    art = {}
    jobs = [
        ("start", ".".join(rxn["reactants"])),
        ("product", rxn["product"]),
    ]
    for slot, smiles in jobs:
        for theme in ("light", "dark"):
            name = f"{rxn['id']}-{slot}-{theme}.svg"
            if render_svg(smiles, ART / name, dark=(theme == "dark")):
                art[f"{slot}_{theme}"] = f"reactions/{name}"
    return art


def stage(order, role, reagents, acid_base, solvent="", temperature_c=None,
          notes="", byproducts=None):
    return {
        "order": order,
        "role": role,
        "reagents": reagents,
        "conditions": {
            "temperature_c": temperature_c,
            "solvent": solvent,
            "acid_base": acid_base,
            "notes": notes,
        },
        "byproducts": byproducts or [],
    }


# Stage 2 of every hydride reduction and every carbanion addition. Named once so
# it cannot drift, and so the separation from stage 1 is structural rather than
# a thing each author remembers.
def acid_workup(order=2, notes="Separate step. The reduction itself is not acidic."):
    return stage(order, "workup", ["[H3O+]"], "acidic", solvent="water", notes=notes)


# ==========================================================================
# The inventory. Seed entries first: these are section 7 gold standard, taken
# from seed_reactions.md, which came off the course whiteboards. Their
# provenance is professor-slide, and per section 11 they are still not exempt
# from the checks.
# ==========================================================================

REACTIONS = [
    # ---------------- Tier 1: carbonyl core ----------------
    {
        "id": "grignard-addition-ketone",
        "name": "Grignard addition to a ketone",
        "family": "carbonyls/addition",
        "tier": 1,
        "reactants": ["CC(=O)c1ccccc1"],
        "reactant_labels": ["acetophenone"],
        "stages": [
            stage(1, "reagent", ["[CH3-]", "CH3MgBr"], "basic", solvent="THF",
                  notes="Strictly anhydrous. A Grignard is basic enough to be quenched by "
                        "any O-H before it reaches the carbonyl."),
            acid_workup(),
        ],
        "intermediates": ["CC(C)([O-])c1ccccc1"],
        "product": "CC(C)(O)c1ccccc1",
        "product_label": "2-phenylpropan-2-ol",
        "reaction_type": "nucleophilic addition",
        "reversible": False,
        "committed_step_index": 1,
        "provenance": "professor-slide",
        "balance_lhs": ["CC(=O)c1ccccc1", "[CH3-]", "[H+]"],
        "balance_rhs": ["CC(C)(O)c1ccccc1"],
        "redox": False,
    },
    {
        "id": "cyanohydrin",
        "name": "Cyanohydrin formation",
        "family": "carbonyls/addition",
        "tier": 1,
        "reactants": ["O=Cc1ccccc1"],
        "reactant_labels": ["benzaldehyde"],
        "stages": [
            stage(1, "reagent", ["[C-]#N", "NaCN"], "basic",
                  notes="Modelled as HCN for balance; in practice NaCN then acid."),
        ],
        "intermediates": [],
        "product": "N#CC(O)c1ccccc1",
        "product_label": "mandelonitrile",
        "reaction_type": "nucleophilic addition",
        "reversible": True,
        "committed_step_index": None,
        "provenance": "professor-slide",
        "balance_lhs": ["O=Cc1ccccc1", "C#N"],
        "balance_rhs": ["N#CC(O)c1ccccc1"],
        "redox": False,
    },
    {
        "id": "acetylide-addition",
        "name": "Acetylide addition to an aldehyde",
        "family": "carbonyls/addition",
        "tier": 1,
        "reactants": ["O=Cc1ccccc1"],
        "reactant_labels": ["benzaldehyde"],
        "stages": [
            stage(1, "reagent", ["CC#[C-]"], "basic", solvent="THF",
                  notes="Acetylide from terminal alkyne plus NaNH2."),
            acid_workup(),
        ],
        "intermediates": ["CC#CC([O-])c1ccccc1"],
        "product": "CC#CC(O)c1ccccc1",
        "product_label": "propargylic alcohol",
        "reaction_type": "nucleophilic addition",
        "reversible": False,
        "committed_step_index": 1,
        "provenance": "professor-slide",
        "balance_lhs": ["O=Cc1ccccc1", "CC#[C-]", "[H+]"],
        "balance_rhs": ["CC#CC(O)c1ccccc1"],
        "redox": False,
    },
    {
        "id": "wittig-olefination",
        "name": "Wittig olefination",
        "family": "carbonyls/addition",
        "tier": 1,
        "reactants": ["CC(=O)c1ccccc1"],
        "reactant_labels": ["acetophenone"],
        "stages": [
            stage(1, "reagent", ["[CH2-][P+](c1ccccc1)(c1ccccc1)c1ccccc1"], "basic",
                  solvent="THF",
                  notes="Ylide from CH3-PPh3+ deprotonated by R-Li.",
                  byproducts=["O=P(c1ccccc1)(c1ccccc1)c1ccccc1"]),
        ],
        "intermediates": [],
        "product": "C=C(C)c1ccccc1",
        "product_label": "2-phenylpropene",
        "reaction_type": "olefination",
        "reversible": False,
        "committed_step_index": 1,
        "provenance": "professor-slide",
        "balance_lhs": ["CC(=O)c1ccccc1", "[CH2-][P+](c1ccccc1)(c1ccccc1)c1ccccc1"],
        "balance_rhs": ["C=C(C)c1ccccc1", "O=P(c1ccccc1)(c1ccccc1)c1ccccc1"],
        "redox": False,
    },
    {
        "id": "imine-formation",
        "name": "Imine formation",
        "family": "carbonyls/imine-enamine",
        "tier": 1,
        "reactants": ["CC(=O)c1ccccc1"],
        "reactant_labels": ["acetophenone"],
        "stages": [
            stage(1, "reagent", ["CN"], "acidic", temperature_c=None,
                  notes="pH about 4 to 5. Too acidic and the amine is protonated into a "
                        "non-nucleophile; too basic and dehydration never happens.",
                  byproducts=["O"]),
        ],
        "intermediates": [],
        "product": "C/N=C(\\C)c1ccccc1",
        "product_label": "N-methyl imine",
        # Addition-elimination, not just "condensation": the classifier sees the
        # amine adding, and naming both halves is more accurate anyway.
        "reaction_type": "condensation by addition-elimination",
        "reversible": True,
        "committed_step_index": 1,
        "provenance": "professor-slide",
        "balance_lhs": ["CC(=O)c1ccccc1", "CN"],
        "balance_rhs": ["C/N=C(\\C)c1ccccc1", "O"],
        "redox": False,
    },
    {
        "id": "acetal-protection",
        "name": "Acetal protection",
        "family": "carbonyls/protecting-groups",
        "tier": 1,
        "reactants": ["CC(=O)c1ccccc1"],
        "reactant_labels": ["acetophenone"],
        "stages": [
            stage(1, "reagent", ["OCCO"], "acidic",
                  notes="Catalytic acid, water removed to drive it. Reversed by aqueous acid, "
                        "which is what makes it a protecting group.",
                  byproducts=["O"]),
        ],
        "intermediates": [],
        "product": "CC1(c2ccccc2)OCCO1",
        "product_label": "cyclic acetal",
        "reaction_type": "protection",
        "reversible": True,
        "committed_step_index": None,
        "provenance": "professor-slide",
        "balance_lhs": ["CC(=O)c1ccccc1", "OCCO"],
        "balance_rhs": ["CC1(c2ccccc2)OCCO1", "O"],
        "redox": False,
    },

    # ---------------- Tier 2: reduction and oxidation ----------------
    {
        "id": "nabh4-reduction",
        "name": "Sodium borohydride reduction",
        "family": "carbonyls/reduction",
        "tier": 2,
        "reactants": ["CC(=O)c1ccccc1"],
        "reactant_labels": ["acetophenone"],
        "stages": [
            stage(1, "reagent", ["[BH4-]", "NaBH4"], "basic", solvent="methanol",
                  notes="Basic, nucleophilic hydride delivery. NOT acidic. A protic solvent "
                        "is fine; acid is not, because borohydride is destroyed by acid "
                        "before it reduces anything. Scope: aldehydes, ketones, epoxides, "
                        "acid chlorides."),
            acid_workup(notes="The acid appears only here. This is the stage that was "
                              "wrongly labelled as the reaction's conditions."),
        ],
        "intermediates": ["CC([O-])c1ccccc1"],
        "product": "CC(O)c1ccccc1",
        "product_label": "1-phenylethanol",
        "reaction_type": "reduction",
        "reversible": False,
        "committed_step_index": 1,
        "provenance": "professor-slide",
        "balance_lhs": ["CC(=O)c1ccccc1"],
        "balance_rhs": ["CC(O)c1ccccc1"],
        "redox": True,
    },
    {
        "id": "lialh4-reduction",
        "name": "Lithium aluminium hydride reduction",
        "family": "carbonyls/reduction",
        "tier": 2,
        "reactants": ["O=C(OC)c1ccccc1"],
        "reactant_labels": ["methyl benzoate"],
        "stages": [
            stage(1, "reagent", ["[AlH4-]", "LiAlH4"], "basic", solvent="THF",
                  notes="Aprotic solvent only. Stronger than NaBH4: additionally reduces "
                        "esters, anhydrides and amides. LiBH4 sits between the two, and like "
                        "every borohydride is destroyed by acid.",
                  byproducts=["CO"]),
            acid_workup(),
        ],
        "intermediates": [],
        "product": "OCc1ccccc1",
        "product_label": "benzyl alcohol",
        "reaction_type": "reduction",
        "reversible": False,
        "committed_step_index": 1,
        "provenance": "professor-slide",
        "balance_lhs": ["O=C(OC)c1ccccc1"],
        "balance_rhs": ["OCc1ccccc1", "CO"],
        "redox": True,
    },
    {
        "id": "clemmensen",
        "name": "Clemmensen reduction",
        "family": "carbonyls/reduction",
        "tier": 2,
        "reactants": ["CC(=O)c1ccccc1"],
        "reactant_labels": ["acetophenone"],
        "stages": [
            stage(1, "reagent", ["Zn(Hg)", "HCl"], "acidic", notes="Genuinely acidic, unlike "
                  "a hydride reduction. Choose this when the molecule survives acid but not base.",
                  byproducts=["O"]),
        ],
        "intermediates": [],
        "product": "CCc1ccccc1",
        "product_label": "ethylbenzene",
        "reaction_type": "deoxygenation",
        "reversible": False,
        "committed_step_index": 1,
        "provenance": "professor-slide",
        "balance_lhs": ["CC(=O)c1ccccc1", "[H][H]", "[H][H]"],
        "balance_rhs": ["CCc1ccccc1", "O"],
        "redox": False,
    },
    {
        "id": "wolff-kishner",
        "name": "Wolff-Kishner reduction",
        "family": "carbonyls/reduction",
        "tier": 2,
        "reactants": ["CC(=O)c1ccccc1"],
        "reactant_labels": ["acetophenone"],
        "stages": [
            stage(1, "reagent", ["NN"], "neutral", notes="Hydrazone forms first.",
                  byproducts=["O"]),
            stage(2, "reagent", ["[OH-]", "KOH"], "basic", temperature_c=200,
                  notes="Strongly basic and hot. The basic counterpart to Clemmensen: pick "
                        "whichever the rest of the molecule tolerates.",
                  byproducts=["N#N"]),
        ],
        "intermediates": ["CC(=NN)c1ccccc1"],
        "product": "CCc1ccccc1",
        "product_label": "ethylbenzene",
        "reaction_type": "deoxygenation",
        "reversible": False,
        "committed_step_index": 2,
        "provenance": "professor-slide",
        "balance_lhs": ["CC(=O)c1ccccc1", "NN"],
        "balance_rhs": ["CCc1ccccc1", "N#N", "O"],
        "redox": False,
    },
    {
        "id": "jones-oxidation",
        "name": "Jones oxidation",
        "family": "alcohols-ethers/oxidation",
        "tier": 2,
        "reactants": ["OCc1ccccc1"],
        "reactant_labels": ["benzyl alcohol"],
        "stages": [
            stage(1, "reagent", ["H2CrO4"], "acidic", solvent="water/acetone",
                  notes="Aqueous chromium goes all the way to the acid, because the aldehyde "
                        "hydrate is what gets oxidised the second time. PCC in dry DCM stops "
                        "at the aldehyde for exactly that reason."),
        ],
        "intermediates": ["O=Cc1ccccc1"],
        "product": "OC(=O)c1ccccc1",
        "product_label": "benzoic acid",
        "reaction_type": "oxidation",
        "reversible": False,
        "committed_step_index": 1,
        "provenance": "professor-slide",
        "balance_lhs": ["OCc1ccccc1", "[O]"],
        "balance_rhs": ["OC(=O)c1ccccc1"],
        "redox": True,
    },

    # ---------------- Acids and derivatives ----------------
    {
        "id": "socl2-acid-to-chloride",
        "name": "Carboxylic acid to acid chloride",
        "family": "derivatives/substitution",
        "tier": 1,
        "reactants": ["OC(=O)c1ccccc1"],
        "reactant_labels": ["benzoic acid"],
        "stages": [
            stage(1, "reagent", ["O=S(Cl)Cl"], "neutral",
                  notes="Pyridine optional. Byproducts are gases, so nothing needs separating.",
                  byproducts=["O=S=O", "Cl"]),
        ],
        "intermediates": [],
        "product": "O=C(Cl)c1ccccc1",
        "product_label": "benzoyl chloride",
        "reaction_type": "nucleophilic acyl substitution",
        "reversible": False,
        "committed_step_index": 1,
        "provenance": "professor-slide",
        "balance_lhs": ["OC(=O)c1ccccc1", "O=S(Cl)Cl"],
        "balance_rhs": ["O=C(Cl)c1ccccc1", "O=S=O", "Cl"],
        "redox": False,
    },
    {
        "id": "fischer-esterification",
        "name": "Fischer esterification",
        "family": "derivatives/substitution",
        "tier": 1,
        "reactants": ["OC(=O)c1ccccc1", "CO"],
        "reactant_labels": ["benzoic acid", "methanol"],
        "stages": [
            stage(1, "reagent", ["CO"], "acidic",
                  notes="Every step reversible. Driven by excess alcohol or by removing "
                        "water, not by the acid, which is only a catalyst.",
                  byproducts=["O"]),
        ],
        "intermediates": [],
        "product": "O=C(OC)c1ccccc1",
        "product_label": "methyl benzoate",
        "reaction_type": "nucleophilic acyl substitution",
        "reversible": True,
        "committed_step_index": None,
        "provenance": "professor-slide",
        "balance_lhs": ["OC(=O)c1ccccc1", "CO"],
        "balance_rhs": ["O=C(OC)c1ccccc1", "O"],
        "redox": False,
    },
    {
        "id": "acidchloride-to-amide",
        "name": "Acid chloride to amide",
        "family": "derivatives/substitution",
        "tier": 1,
        "reactants": ["O=C(Cl)c1ccccc1", "CN"],
        "reactant_labels": ["benzoyl chloride", "methylamine"],
        "stages": [
            stage(1, "reagent", ["CN"], "basic",
                  notes="Downhill only on the reactivity ladder: acid chloride > anhydride > "
                        "ester > amide. An amide will not go back up it.",
                  byproducts=["Cl"]),
        ],
        "intermediates": [],
        "product": "O=C(NC)c1ccccc1",
        "product_label": "N-methylbenzamide",
        "reaction_type": "nucleophilic acyl substitution",
        "reversible": False,
        "committed_step_index": 1,
        "provenance": "professor-slide",
        "balance_lhs": ["O=C(Cl)c1ccccc1", "CN"],
        "balance_rhs": ["O=C(NC)c1ccccc1", "Cl"],
        "redox": False,
    },
    {
        "id": "ester-acidic-hydrolysis",
        "name": "Acidic ester hydrolysis",
        "family": "derivatives/hydrolysis",
        "tier": 1,
        "reactants": ["O=C(OC)c1ccccc1", "O"],
        "reactant_labels": ["methyl benzoate", "water"],
        "stages": [
            stage(1, "reagent", ["[H3O+]"], "acidic", solvent="water",
                  notes="Reversible, being Fischer esterification run backwards. NaOH instead "
                        "gives the carboxylate and is effectively irreversible.",
                  byproducts=["CO"]),
        ],
        "intermediates": [],
        "product": "OC(=O)c1ccccc1",
        "product_label": "benzoic acid",
        "reaction_type": "nucleophilic acyl substitution",
        "reversible": True,
        "committed_step_index": None,
        "provenance": "professor-slide",
        "balance_lhs": ["O=C(OC)c1ccccc1", "O"],
        "balance_rhs": ["OC(=O)c1ccccc1", "CO"],
        "redox": False,
    },
    {
        "id": "gilman-to-ketone",
        "name": "Gilman reagent to a ketone",
        "family": "derivatives/substitution",
        "tier": 2,
        "reactants": ["O=C(Cl)c1ccccc1"],
        "reactant_labels": ["benzoyl chloride"],
        "stages": [
            stage(1, "reagent", ["[CH3-]", "(CH3)2CuLi"], "basic", temperature_c=-78,
                  solvent="THF",
                  notes="Acid chlorides only. The soft cuprate and the low temperature are "
                        "what stop it adding twice to give the alcohol.",
                  byproducts=["[Cl-]"]),
            acid_workup(notes="Workup for the other reagents present, not part of the "
                              "substitution itself."),
        ],
        "intermediates": [],
        "product": "CC(=O)c1ccccc1",
        "product_label": "acetophenone",
        "reaction_type": "nucleophilic acyl substitution",
        "reversible": False,
        "committed_step_index": 1,
        "provenance": "professor-slide",
        "balance_lhs": ["O=C(Cl)c1ccccc1", "[CH3-]"],
        "balance_rhs": ["CC(=O)c1ccccc1", "[Cl-]"],
        "redox": False,
    },
    {
        "id": "dibalh-to-aldehyde",
        "name": "DIBAL-H partial reduction of an ester",
        "family": "derivatives/reduction",
        "tier": 2,
        "reactants": ["O=C(OC)c1ccccc1"],
        "reactant_labels": ["methyl benzoate"],
        "stages": [
            stage(1, "reagent", ["DIBALH"], "basic", temperature_c=-78, solvent="toluene",
                  notes="One hydride delivery. The tetrahedral alkoxide is stable at -78 C "
                        "and does not collapse until workup, which is the whole reason this "
                        "stops at the aldehyde.",
                  byproducts=["CO"]),
            acid_workup(),
        ],
        "intermediates": [],
        "product": "O=Cc1ccccc1",
        "product_label": "benzaldehyde",
        "reaction_type": "reduction",
        "reversible": False,
        "committed_step_index": 1,
        "provenance": "professor-slide",
        "balance_lhs": ["O=C(OC)c1ccccc1"],
        "balance_rhs": ["O=Cc1ccccc1", "CO"],
        "redox": True,
    },

    # ---------------- Nitriles ----------------
    {
        "id": "nitrile-formation",
        "name": "Amide dehydration to a nitrile",
        "family": "nitriles/formation",
        "tier": 2,
        "reactants": ["O=C(N)c1ccccc1"],
        "reactant_labels": ["benzamide"],
        "stages": [
            stage(1, "reagent", ["O=S(Cl)Cl"], "neutral",
                  notes="Primary amide only. Mechanism not tested per the board, so encode "
                        "the transformation without requiring a drawing.",
                  byproducts=["O=S=O", "Cl", "Cl"]),
        ],
        "intermediates": [],
        "product": "N#Cc1ccccc1",
        "product_label": "benzonitrile",
        "reaction_type": "dehydration",
        "reversible": False,
        "committed_step_index": 1,
        "provenance": "professor-slide",
        "balance_lhs": ["O=C(N)c1ccccc1", "O=S(Cl)Cl"],
        "balance_rhs": ["N#Cc1ccccc1", "O=S=O", "Cl", "Cl"],
        "redox": False,
    },
    {
        "id": "nitrile-acidic-hydrolysis",
        "name": "Acidic nitrile hydrolysis",
        "family": "nitriles/hydrolysis",
        "tier": 2,
        "reactants": ["N#Cc1ccccc1", "O", "O"],
        "reactant_labels": ["benzonitrile", "water", "water"],
        "stages": [
            stage(1, "reagent", ["[H3O+]"], "acidic", temperature_c=100, solvent="water",
                  notes="Harsh. Passes through the amide, same mechanism as amide hydrolysis. "
                        "Proton transfers and resonance make this a good drawing exercise.",
                  byproducts=["N"]),
        ],
        "intermediates": ["O=C(N)c1ccccc1"],
        "product": "OC(=O)c1ccccc1",
        "product_label": "benzoic acid",
        "reaction_type": "hydrolysis",
        "reversible": False,
        "committed_step_index": 1,
        "provenance": "professor-slide",
        "balance_lhs": ["N#Cc1ccccc1", "O", "O"],
        "balance_rhs": ["OC(=O)c1ccccc1", "N"],
        "redox": False,
    },
    {
        "id": "nitrile-basic-hydrolysis",
        "name": "Basic nitrile hydrolysis",
        "family": "nitriles/hydrolysis",
        "tier": 2,
        "reactants": ["N#Cc1ccccc1"],
        "reactant_labels": ["benzonitrile"],
        "stages": [
            stage(1, "reagent", ["[OH-]", "NaOH"], "basic", temperature_c=100, solvent="water",
                  notes="Harsh. Goes through the amide and includes a tautomerisation. The "
                        "steps before the committed hydration are reversible detours.",
                  byproducts=["N"]),
        ],
        "intermediates": ["O=C(N)c1ccccc1"],
        "product": "[O-]C(=O)c1ccccc1",
        "product_label": "benzoate",
        "reaction_type": "hydrolysis",
        "reversible": False,
        "committed_step_index": 1,
        "provenance": "professor-slide",
        "balance_lhs": ["N#Cc1ccccc1", "O", "[OH-]"],
        "balance_rhs": ["[O-]C(=O)c1ccccc1", "N"],
        "redox": False,
    },
    {
        "id": "nitrile-reduction",
        "name": "Nitrile reduction to a primary amine",
        "family": "nitriles/reduction",
        "tier": 2,
        "reactants": ["N#Cc1ccccc1"],
        "reactant_labels": ["benzonitrile"],
        "stages": [
            stage(1, "reagent", ["[AlH4-]", "LiAlH4"], "basic", solvent="THF",
                  notes="Two hydride deliveries. Full mechanism is on the board, so this is a "
                        "good drawing exercise."),
            acid_workup(),
        ],
        "intermediates": [],
        "product": "NCc1ccccc1",
        "product_label": "benzylamine",
        "reaction_type": "reduction",
        "reversible": False,
        "committed_step_index": 1,
        "provenance": "professor-slide",
        "balance_lhs": ["N#Cc1ccccc1"],
        "balance_rhs": ["NCc1ccccc1"],
        "redox": True,
    },

    # ---------------- Tier 3: enolate chemistry (Ch 22) ----------------
    # Higher difficulty and more pathway-dependent than tiers 1 and 2, and it
    # builds on both: every one of these is an enolate attacking a carbonyl that
    # tier 1 already explained. Provenance is ai-proposed, not professor-slide:
    # these were not on the whiteboards in seed_reactions.md, so nothing here
    # claims a source it does not have.
    {
        "id": "aldol-addition",
        "name": "Aldol addition",
        "family": "enolates/aldol",
        "tier": 3,
        "reactants": ["CC=O", "CC=O"],
        "reactant_labels": ["acetaldehyde", "acetaldehyde"],
        "stages": [
            stage(1, "catalyst", ["[OH-]", "NaOH"], "basic", solvent="water", temperature_c=5,
                  notes="Dilute base and cold. One molecule is deprotonated alpha to the "
                        "carbonyl; that enolate attacks the carbonyl of another."),
        ],
        "intermediates": ["[CH2-]C=O"],
        "product": "CC(O)CC=O",
        "product_label": "3-hydroxybutanal",
        "reaction_type": "aldol addition",
        "reversible": True,
        "committed_step_index": None,
        "provenance": "ai-proposed",
        "balance_lhs": ["CC=O", "CC=O"],
        "balance_rhs": ["CC(O)CC=O"],
        "redox": False,
    },
    {
        "id": "aldol-condensation",
        "name": "Aldol condensation",
        "family": "enolates/aldol",
        "tier": 3,
        "reactants": ["CC=O", "CC=O"],
        "reactant_labels": ["acetaldehyde", "acetaldehyde"],
        "stages": [
            stage(1, "catalyst", ["[OH-]", "NaOH"], "basic", solvent="water",
                  notes="The aldol addition first."),
            stage(2, "reagent", ["[OH-]"], "basic", temperature_c=80,
                  notes="Heat dehydrates the aldol. The alkene that forms is conjugated with "
                        "the carbonyl, and that conjugation is what makes the loss of water "
                        "worth it.",
                  byproducts=["O"]),
        ],
        "intermediates": ["CC(O)CC=O"],
        "product": "CC=CC=O",
        "product_label": "but-2-enal",
        "reaction_type": "aldol condensation",
        "reversible": False,
        "committed_step_index": 2,
        "provenance": "ai-proposed",
        "balance_lhs": ["CC=O", "CC=O"],
        "balance_rhs": ["CC=CC=O", "O"],
        "redox": False,
    },
    {
        "id": "claisen-condensation",
        "name": "Claisen condensation",
        "family": "enolates/claisen",
        "tier": 3,
        "reactants": ["CCOC(C)=O", "CCOC(C)=O"],
        "reactant_labels": ["ethyl acetate", "ethyl acetate"],
        "stages": [
            stage(1, "reagent", ["CC[O-]", "NaOEt"], "basic", solvent="ethanol",
                  notes="The alkoxide must match the ester's alkoxy group, or "
                        "transesterification scrambles the product into a mixture.",
                  byproducts=["CCO"]),
            acid_workup(notes="The product is unusually acidic between the two carbonyls, so "
                              "it sits deprotonated until this step."),
        ],
        "intermediates": [],
        "product": "CCOC(=O)CC(C)=O",
        "product_label": "ethyl acetoacetate",
        "reaction_type": "claisen condensation",
        "reversible": False,
        "committed_step_index": 1,
        "provenance": "ai-proposed",
        "balance_lhs": ["CCOC(C)=O", "CCOC(C)=O"],
        "balance_rhs": ["CCOC(=O)CC(C)=O", "CCO"],
        "redox": False,
    },
    {
        "id": "michael-addition",
        "name": "Michael addition",
        "family": "enolates/michael",
        "tier": 3,
        "reactants": ["C=CC(C)=O", "CC(C)=O"],
        "reactant_labels": ["but-3-en-2-one", "acetone"],
        "stages": [
            stage(1, "catalyst", ["[OH-]"], "basic",
                  notes="1,4 rather than 1,2 because a stabilised, soft enolate adds "
                        "conjugately. A Grignard on the same substrate adds 1,2 instead."),
        ],
        "intermediates": [],
        "product": "CC(=O)CCCC(C)=O",
        "product_label": "heptane-2,6-dione",
        "reaction_type": "conjugate addition",
        "reversible": False,
        "committed_step_index": 1,
        "provenance": "ai-proposed",
        "balance_lhs": ["C=CC(C)=O", "CC(C)=O"],
        "balance_rhs": ["CC(=O)CCCC(C)=O"],
        "redox": False,
    },
    {
        "id": "alpha-halogenation",
        "name": "Alpha halogenation",
        "family": "enolates/halogenation",
        "tier": 3,
        "reactants": ["CC(=O)c1ccccc1"],
        "reactant_labels": ["acetophenone"],
        "stages": [
            stage(1, "reagent", ["BrBr"], "acidic", solvent="acetic acid",
                  notes="Under acid the enol forms slowly and is the nucleophile, so "
                        "monohalogenation is controllable. Under base the first halogenation "
                        "makes the next one faster and it runs on to the trihalide.",
                  byproducts=["Br"]),
        ],
        "intermediates": ["OC(=C)c1ccccc1"],
        "product": "BrCC(=O)c1ccccc1",
        "product_label": "phenacyl bromide",
        "reaction_type": "alpha halogenation",
        "reversible": False,
        "committed_step_index": 1,
        "provenance": "ai-proposed",
        "balance_lhs": ["CC(=O)c1ccccc1", "BrBr"],
        "balance_rhs": ["BrCC(=O)c1ccccc1", "Br"],
        "redox": False,
    },
    {
        "id": "malonic-ester-synthesis",
        "name": "Malonic ester synthesis",
        "family": "enolates/decarboxylation",
        "tier": 3,
        "reactants": ["CCOC(=O)CC(=O)OCC"],
        "reactant_labels": ["diethyl malonate"],
        "stages": [
            stage(1, "reagent", ["CC[O-]", "NaOEt"], "basic", solvent="ethanol",
                  notes="The carbon between two esters is acidic enough for an alkoxide to "
                        "deprotonate it completely.",
                  byproducts=["CCO"]),
            stage(2, "reagent", ["CI", "CH3I"], "neutral",
                  notes="SN2, so a primary halide only. A tertiary one eliminates instead.",
                  byproducts=["I"]),
            stage(3, "workup", ["[H3O+]"], "acidic", temperature_c=100, solvent="water",
                  notes="Hydrolyses both esters, then heat drives off one carboxyl as CO2. "
                        "The diacid decarboxylates readily because the second carbonyl can "
                        "take the electrons.",
                  byproducts=["CCO", "O=C=O"]),
        ],
        "intermediates": ["CCOC(=O)C(C)C(=O)OCC"],
        "product": "CCC(=O)O",
        "product_label": "propanoic acid",
        "reaction_type": "alkylation then decarboxylation",
        "reversible": False,
        "committed_step_index": 2,
        "provenance": "ai-proposed",
        "balance_lhs": ["CCOC(=O)CC(=O)OCC", "CI", "O", "O"],
        "balance_rhs": ["CCC(=O)O", "O=C=O", "CCO", "CCO", "I"],
        "redox": False,
    },
    {
        "id": "robinson-annulation",
        "name": "Robinson annulation",
        "family": "enolates/annulation",
        "tier": 3,
        "reactants": ["O=C1CCCCC1", "C=CC(C)=O"],
        "reactant_labels": ["cyclohexanone", "but-3-en-2-one"],
        "stages": [
            stage(1, "catalyst", ["[OH-]"], "basic",
                  notes="Michael addition first, making a 1,5-diketone."),
            stage(2, "reagent", ["[OH-]"], "basic", temperature_c=80,
                  notes="Then an intramolecular aldol condensation closes the new six ring. "
                        "Two named reactions in sequence, which is why it is worth learning "
                        "as one.",
                  byproducts=["O"]),
        ],
        "intermediates": ["O=C1CCCCC1CCC(C)=O"],
        "product": "O=C1CCC2CCCCC2=C1",
        "product_label": "bicyclic enone",
        "reaction_type": "annulation by conjugate addition then aldol condensation",
        "reversible": False,
        "committed_step_index": 2,
        "provenance": "ai-proposed",
        "balance_lhs": ["O=C1CCCCC1", "C=CC(C)=O"],
        "balance_rhs": ["O=C1CCC2CCCCC2=C1", "O"],
        "redox": False,
    },

    # ---------------- The rest of the syllabus ----------------
    # Chapters 14, 15, 17, 18, 24 and 25. The carbonyl block above is where most
    # exam mechanisms hang off, but a course page that stops there is missing
    # the first two weeks and the last two. All ai-proposed.

    # Ch 17: alcohols
    {
        "id": "alcohol-to-halide",
        "name": "Alcohol to alkyl halide with HX",
        "family": "alcohols-ethers/substitution",
        "tier": 2,
        "reactants": ["CC(C)(C)O"],
        "reactant_labels": ["tert-butanol"],
        "stages": [
            stage(1, "reagent", ["Br", "HBr"], "acidic",
                  notes="Protonate first. OH is a terrible leaving group and water is a good "
                        "one, and that swap is the whole chapter. Tertiary here, so SN1.",
                  byproducts=["O"]),
        ],
        "intermediates": ["CC(C)(C)[OH2+]"],
        "product": "CC(C)(C)Br",
        "product_label": "2-bromo-2-methylpropane",
        "reaction_type": "nucleophilic substitution",
        "reversible": False,
        "committed_step_index": 1,
        "provenance": "ai-proposed",
        "balance_lhs": ["CC(C)(C)O", "Br"],
        "balance_rhs": ["CC(C)(C)Br", "O"],
        "redox": False,
    },
    {
        "id": "alcohol-pbr3",
        "name": "Alcohol to alkyl halide with PBr3",
        "family": "alcohols-ethers/substitution",
        "tier": 2,
        "reactants": ["CCCCO"],
        "reactant_labels": ["butan-1-ol"],
        "stages": [
            stage(1, "reagent", ["BrP(Br)Br", "PBr3"], "neutral", solvent="ether",
                  temperature_c=0,
                  notes="PBr3 rather than HBr for a primary alcohol: no carbocation forms, so "
                        "nothing rearranges. Three alcohols per PBr3.",
                  byproducts=["OP(O)O"]),
        ],
        "intermediates": [],
        "product": "CCCCBr",
        "product_label": "1-bromobutane",
        "reaction_type": "nucleophilic substitution",
        "reversible": False,
        "committed_step_index": 1,
        "provenance": "ai-proposed",
        "balance_lhs": ["CCCCO", "CCCCO", "CCCCO", "BrP(Br)Br"],
        "balance_rhs": ["CCCCBr", "CCCCBr", "CCCCBr", "OP(O)O"],
        "redox": False,
    },
    {
        "id": "alcohol-dehydration",
        "name": "Acid-catalysed dehydration",
        "family": "alkenes/elimination",
        "tier": 2,
        "reactants": ["CC(C)(C)O"],
        "reactant_labels": ["tert-butanol"],
        "stages": [
            stage(1, "catalyst", ["OS(=O)(=O)O", "H2SO4"], "acidic", temperature_c=140,
                  notes="E1 through the carbocation, so Zaitsev: the more substituted alkene "
                        "wins. Heat drives the water off.",
                  byproducts=["O"]),
        ],
        "intermediates": ["CC(C)(C)[OH2+]"],
        "product": "CC(C)=C",
        "product_label": "2-methylpropene",
        "reaction_type": "elimination",
        "reversible": True,
        "committed_step_index": 1,
        "provenance": "ai-proposed",
        "balance_lhs": ["CC(C)(C)O"],
        "balance_rhs": ["CC(C)=C", "O"],
        "redox": False,
    },
    {
        "id": "pcc-oxidation",
        "name": "PCC oxidation to an aldehyde",
        "family": "alcohols-ethers/oxidation",
        "tier": 2,
        "reactants": ["CCCCO"],
        "reactant_labels": ["butan-1-ol"],
        "stages": [
            stage(1, "reagent", ["PCC"], "neutral", solvent="dichloromethane",
                  notes="Anhydrous, which is the entire point. With no water there is no "
                        "aldehyde hydrate, and with no hydrate there is nothing to oxidise a "
                        "second time. Jones is aqueous and runs on to the acid."),
        ],
        "intermediates": [],
        "product": "CCCC=O",
        "product_label": "butanal",
        "reaction_type": "oxidation",
        "reversible": False,
        "committed_step_index": 1,
        "provenance": "ai-proposed",
        "balance_lhs": ["CCCCO"],
        "balance_rhs": ["CCCC=O"],
        "redox": True,
    },

    # Ch 18: ethers and epoxides
    {
        "id": "ether-cleavage",
        "name": "Acid-catalysed ether cleavage",
        "family": "alcohols-ethers/substitution",
        "tier": 2,
        "reactants": ["CCOC(C)(C)C"],
        "reactant_labels": ["ethyl tert-butyl ether"],
        "stages": [
            stage(1, "reagent", ["Br", "HBr"], "acidic", temperature_c=100,
                  notes="The halide attacks whichever carbon better supports positive charge. "
                        "Tertiary here, so the tert-butyl side becomes the halide and the "
                        "ethyl side leaves as the alcohol."),
        ],
        "intermediates": [],
        "product": "CCO",
        "product_label": "ethanol (with 2-bromo-2-methylpropane)",
        "reaction_type": "nucleophilic substitution",
        "reversible": False,
        "committed_step_index": 1,
        "provenance": "ai-proposed",
        "balance_lhs": ["CCOC(C)(C)C", "Br"],
        "balance_rhs": ["CCO", "CC(C)(C)Br"],
        "redox": False,
    },
    {
        "id": "epoxidation-mcpba",
        "name": "Epoxidation with mCPBA",
        "family": "alkenes/epoxidation",
        "tier": 2,
        "reactants": ["CC=CC"],
        "reactant_labels": ["but-2-ene"],
        "stages": [
            stage(1, "reagent", ["OOC(=O)c1cccc(Cl)c1", "mCPBA"], "neutral",
                  solvent="dichloromethane",
                  notes="One concerted oxygen delivery, so the alkene geometry is carried "
                        "straight into the epoxide. cis stays cis.",
                  byproducts=["OC(=O)c1cccc(Cl)c1"]),
        ],
        "intermediates": [],
        "product": "CC1OC1C",
        "product_label": "2,3-dimethyloxirane",
        "reaction_type": "epoxidation",
        "reversible": False,
        "committed_step_index": 1,
        "provenance": "ai-proposed",
        "balance_lhs": ["CC=CC", "OOC(=O)c1cccc(Cl)c1"],
        "balance_rhs": ["CC1OC1C", "OC(=O)c1cccc(Cl)c1"],
        "redox": False,
    },
    {
        "id": "epoxide-opening-base",
        "name": "Epoxide opening under base",
        "family": "alkenes/epoxide-opening",
        "tier": 2,
        "reactants": ["CC1(C)OC1"],
        "reactant_labels": ["2,2-dimethyloxirane"],
        "stages": [
            stage(1, "reagent", ["C[O-]", "NaOMe"], "basic", solvent="methanol",
                  notes="Basic conditions: the nucleophile hits the LESS hindered carbon, "
                        "because this is a plain SN2 and sterics decide. Acid flips it, since "
                        "the protonated epoxide has carbocation character at the more "
                        "substituted side."),
            acid_workup(),
        ],
        "intermediates": [],
        "product": "CC(C)(O)COC",
        "product_label": "1-methoxy-2-methylpropan-2-ol",
        "reaction_type": "nucleophilic substitution",
        "reversible": False,
        "committed_step_index": 1,
        "provenance": "ai-proposed",
        "balance_lhs": ["CC1(C)OC1", "CO"],
        "balance_rhs": ["CC(C)(O)COC"],
        "redox": False,
    },

    # Ch 14: conjugation and the Diels-Alder
    {
        "id": "nbs-allylic",
        "name": "Allylic bromination with NBS",
        "family": "alkenes/substitution",
        "tier": 2,
        "reactants": ["C=CCC"],
        "reactant_labels": ["but-1-ene"],
        "stages": [
            stage(1, "reagent", ["BrN1C(=O)CCC1=O", "NBS"], "neutral",
                  solvent="carbon tetrachloride", temperature_c=80,
                  notes="NBS rather than Br2 because it holds the bromine concentration very "
                        "low, which favours the radical allylic substitution over ionic "
                        "addition across the double bond.",
                  byproducts=["O=C1CCC(=O)N1"]),
        ],
        "intermediates": [],
        "product": "C=CC(Br)C",
        "product_label": "3-bromobut-1-ene",
        "reaction_type": "radical substitution",
        "reversible": False,
        "committed_step_index": 1,
        "provenance": "ai-proposed",
        "balance_lhs": ["C=CCC", "BrN1C(=O)CCC1=O"],
        "balance_rhs": ["C=CC(Br)C", "O=C1CCC(=O)N1"],
        "redox": False,
    },
    {
        "id": "diene-1-4-addition",
        "name": "1,4-addition to a conjugated diene",
        "family": "dienes/conjugate-addition",
        "tier": 2,
        "reactants": ["C=CC=C"],
        "reactant_labels": ["buta-1,3-diene"],
        "stages": [
            stage(1, "reagent", ["Br", "HBr"], "acidic", temperature_c=40,
                  notes="One equivalent. Cold traps the 1,2 product because it forms fastest; "
                        "warm lets it revert and settle on the more substituted 1,4 alkene. "
                        "Temperature is the variable being examined, not the reagent."),
        ],
        "intermediates": ["C[CH+]C=C"],
        "product": "CC=CCBr",
        "product_label": "1-bromobut-2-ene",
        "reaction_type": "electrophilic addition",
        "reversible": True,
        "committed_step_index": 1,
        "provenance": "ai-proposed",
        "balance_lhs": ["C=CC=C", "Br"],
        "balance_rhs": ["CC=CCBr"],
        "redox": False,
    },
    {
        "id": "diels-alder",
        "name": "Diels-Alder cycloaddition",
        "family": "dienes/diels-alder",
        "tier": 2,
        "reactants": ["C=CC=C", "C=CC=O"],
        "reactant_labels": ["buta-1,3-diene", "acrolein"],
        "stages": [
            stage(1, "reagent", ["C=CC=O"], "neutral", temperature_c=100,
                  notes="One concerted step, no intermediate. The electron-withdrawing group "
                        "lowers the dienophile LUMO toward the diene HOMO, which is why a "
                        "plain alkene is a poor dienophile. The diene must reach s-cis or "
                        "nothing happens at all."),
        ],
        "intermediates": [],
        "product": "O=CC1CCC=CC1",
        "product_label": "cyclohex-3-ene-1-carbaldehyde",
        "reaction_type": "cycloaddition",
        "reversible": True,
        "committed_step_index": 1,
        "provenance": "ai-proposed",
        "balance_lhs": ["C=CC=C", "C=CC=O"],
        "balance_rhs": ["O=CC1CCC=CC1"],
        "redox": False,
    },

    # Ch 15: aromaticity
    {
        "id": "eas-bromination",
        "name": "Electrophilic aromatic bromination",
        "family": "aromaticity/eas",
        "tier": 2,
        "reactants": ["c1ccccc1"],
        "reactant_labels": ["benzene"],
        "stages": [
            stage(1, "reagent", ["BrBr", "FeBr3"], "neutral",
                  notes="Substitution, not addition: getting the aromatic sextet back is "
                        "worth more than the second new sigma bond addition would give. FeBr3 "
                        "is there to make Br2 electrophilic enough.",
                  byproducts=["Br"]),
        ],
        "intermediates": ["Br[C+]1C=CC=CC1"],
        "product": "Brc1ccccc1",
        "product_label": "bromobenzene",
        "reaction_type": "electrophilic aromatic substitution",
        "reversible": False,
        "committed_step_index": 1,
        "provenance": "ai-proposed",
        "balance_lhs": ["c1ccccc1", "BrBr"],
        "balance_rhs": ["Brc1ccccc1", "Br"],
        "redox": False,
    },
    {
        "id": "friedel-crafts-acylation",
        "name": "Friedel-Crafts acylation",
        "family": "aromaticity/eas",
        "tier": 2,
        "reactants": ["c1ccccc1"],
        "reactant_labels": ["benzene"],
        "stages": [
            stage(1, "reagent", ["CC(=O)Cl", "AlCl3"], "neutral",
                  notes="Acylation rather than alkylation when you want exactly one "
                        "substituent: the acylium ion cannot rearrange, and the ketone "
                        "product is deactivated so it does not react again.",
                  byproducts=["Cl"]),
        ],
        "intermediates": ["C[C+]=O"],
        "product": "CC(=O)c1ccccc1",
        "product_label": "acetophenone",
        "reaction_type": "electrophilic aromatic substitution",
        "reversible": False,
        "committed_step_index": 1,
        "provenance": "ai-proposed",
        "balance_lhs": ["c1ccccc1", "CC(=O)Cl"],
        "balance_rhs": ["CC(=O)c1ccccc1", "Cl"],
        "redox": False,
    },
    {
        "id": "nitration",
        "name": "Nitration",
        "family": "aromaticity/eas",
        "tier": 2,
        "reactants": ["c1ccccc1"],
        "reactant_labels": ["benzene"],
        "stages": [
            stage(1, "reagent", ["O[N+](=O)[O-]", "HNO3"], "acidic",
                  notes="H2SO4 is not the solvent, it is there to make the nitronium ion. "
                        "Without it HNO3 is not electrophilic enough.",
                  byproducts=["O"]),
        ],
        "intermediates": ["O=[N+]=O"],
        "product": "O=[N+]([O-])c1ccccc1",
        "product_label": "nitrobenzene",
        "reaction_type": "electrophilic aromatic substitution",
        "reversible": False,
        "committed_step_index": 1,
        "provenance": "ai-proposed",
        "balance_lhs": ["c1ccccc1", "O[N+](=O)[O-]"],
        "balance_rhs": ["O=[N+]([O-])c1ccccc1", "O"],
        "redox": False,
    },

    # Ch 24: amines
    {
        "id": "diazonium-formation",
        "name": "Diazonium salt formation",
        "family": "amines/diazonium",
        "tier": 3,
        "reactants": ["Nc1ccccc1"],
        "reactant_labels": ["aniline"],
        "stages": [
            stage(1, "reagent", ["ON=O", "NaNO2", "HCl"], "acidic", temperature_c=0,
                  solvent="water",
                  notes="Zero to five degrees, and that is not a suggestion. Above about 5 C "
                        "the salt decomposes. It is a handle rather than a destination: "
                        "Sandmeyer and Schiemann both replace it with something else.",
                  byproducts=["O", "O"]),
        ],
        "intermediates": [],
        "product": "[N+](#N)c1ccccc1",
        "product_label": "benzenediazonium ion",
        "reaction_type": "diazotisation",
        "reversible": False,
        "committed_step_index": 1,
        "provenance": "ai-proposed",
        "balance_lhs": ["Nc1ccccc1", "ON=O", "Cl"],
        "balance_rhs": ["[N+](#N)c1ccccc1", "O", "O", "[Cl-]"],
        "redox": False,
    },
    {
        "id": "sandmeyer",
        "name": "Sandmeyer reaction",
        "family": "amines/substitution",
        "tier": 3,
        "reactants": ["[N+](#N)c1ccccc1"],
        "reactant_labels": ["benzenediazonium ion"],
        "stages": [
            stage(1, "reagent", ["[Br-]", "CuBr"], "neutral",
                  notes="Nitrogen gas leaving is what makes this irreversible, and it is the "
                        "best leaving group in the course. This is how you put a halide "
                        "somewhere EAS would not have directed it.",
                  byproducts=["N#N"]),
        ],
        "intermediates": [],
        "product": "Brc1ccccc1",
        "product_label": "bromobenzene",
        "reaction_type": "nucleophilic substitution",
        "reversible": False,
        "committed_step_index": 1,
        "provenance": "ai-proposed",
        "balance_lhs": ["[N+](#N)c1ccccc1", "[Br-]"],
        "balance_rhs": ["Brc1ccccc1", "N#N"],
        "redox": False,
    },

    # Ch 25: carbohydrates
    {
        "id": "periodic-cleavage",
        "name": "Periodic acid cleavage",
        "family": "carbohydrates/oxidation",
        "tier": 3,
        "reactants": ["OCCO"],
        "reactant_labels": ["ethane-1,2-diol"],
        "stages": [
            stage(1, "reagent", ["O[I](=O)(=O)=O", "HIO4"], "neutral", solvent="water",
                  notes="Cleaves the bond between two carbons that each carry an OH. Counting "
                        "the fragments is how the ring size and substitution of a sugar gets "
                        "worked out.",
                  byproducts=["O[I](=O)=O", "O"]),
        ],
        "intermediates": [],
        "product": "C=O",
        "product_label": "formaldehyde (two equivalents)",
        "reaction_type": "oxidative cleavage",
        "reversible": False,
        "committed_step_index": 1,
        "provenance": "ai-proposed",
        "balance_lhs": ["OCCO", "O[I](=O)(=O)=O"],
        "balance_rhs": ["C=O", "C=O", "O[I](=O)=O", "O"],
        "redox": False,
    },
]


def main() -> int:
    print("Section 7 regression, seed set must still reproduce:")
    if run_regression() > 0:
        print("\nSeed regression FAILED. Refusing to go further.")
        return 1
    print()

    print(f"Validating {len(REACTIONS)} staged reactions (sections 4 and 5):")
    published, flagged = [], []

    for rxn in REACTIONS:
        # Canonicalise every structure before checking, so what is published and
        # what mechanism_trainer compares against are the same strings.
        for key in ("reactants", "intermediates"):
            rxn[key] = [canonical(s) for s in rxn.get(key, [])]
        rxn["product"] = canonical(rxn["product"])

        record = rxn["validation"] = validate_staged(rxn)
        cons = record["checks"].get("conservation", "?")
        cls = record["checks"].get("classification", "?")

        if record["status"] == "ok":
            # Only published reactions get artwork. Drawing a flagged one would
            # put a picture of unverified chemistry in the public folder, where
            # nothing stops it being linked to.
            rxn["art"] = render_reaction_art(rxn)
            published.append(rxn)
            print(f"  ok      {rxn['id']:<28} {cons:<10} {cls}")
        else:
            flagged.append(rxn)
            print(f"  FLAG    {rxn['id']:<28} {cons:<10} {cls}")
            for p in record["problems"]:
                print(f"            - {p}")

    print()
    print(f"{len(published)} published, {len(flagged)} flagged for human review.")

    # Section 3 step E: flagged reactions never reach a student. They go to a
    # separate file so the review queue is a real artifact and not a log line.
    FLAGGED.write_text(
        json.dumps(
            [{"id": r["id"], "name": r["name"], "validation": r["validation"]} for r in flagged],
            indent=2,
        ),
        encoding="utf-8",
    )

    payload = {
        "pkaLeavingGroupCutoff": DEFAULT_LEAVING_GROUP_PKA_CUTOFF,
        "reactions": published,
    }
    OUT.write_text(
        "// GENERATED by scripts/build_curriculum.py. Do not edit by hand.\n"
        "//\n"
        "// Every reaction here passed RDKit parse, valence and conservation checks,\n"
        "// and its claimed reaction_type was fact-checked against Rxn-INSIGHT.\n"
        "// Reactions that failed any check are NOT here; they are in\n"
        "// flagged_reactions.json awaiting human review.\n"
        "//\n"
        "// Conditions are staged. A hydride reduction is stage 1 (hydride, basic)\n"
        "// then stage 2 (aqueous acid workup). They never collapse into one label,\n"
        "// because that is what produced 'NaBH4, acidic conditions'.\n"
        "//\n"
        "// Source: CHEM241 Summer II 2026 syllabus and course whiteboards.\n\n"
        "export interface StageConditions {\n"
        "  temperature_c: number | null;\n  solvent: string;\n"
        '  acid_base: "neutral" | "acidic" | "basic";\n  notes: string;\n}\n\n'
        "export interface Stage {\n"
        "  order: number;\n"
        '  role: "reagent" | "workup" | "catalyst";\n'
        "  reagents: string[];\n  conditions: StageConditions;\n  byproducts: string[];\n}\n\n"
        "export interface Validation {\n"
        '  status: "ok" | "flagged";\n'
        "  checks: Record<string, string>;\n"
        "  problems: string[];\n  classifier_label?: string;\n}\n\n"
        "export interface StagedReaction {\n"
        "  id: string;\n  name: string;\n  family: string;\n  tier: number;\n"
        "  reactants: string[];\n  reactant_labels: string[];\n"
        "  stages: Stage[];\n  intermediates: string[];\n"
        "  product: string;\n  product_label: string;\n"
        "  reaction_type: string;\n  reversible: boolean;\n"
        "  committed_step_index: number | null;\n"
        '  provenance: "syllabus" | "professor-slide" | "ta-verified" | "ai-proposed";\n'
        "  validation: Validation;\n"
        "  balance_lhs: string[];\n  balance_rhs: string[];\n  redox: boolean;\n"
        "  /** Paths under BASE_URL. Rendered by RDKit from the canonical SMILES. */\n"
        "  art: {\n"
        "    start_light?: string;\n    start_dark?: string;\n"
        "    product_light?: string;\n    product_dark?: string;\n  };\n}\n\n"
        "const DATA: { pkaLeavingGroupCutoff: number; reactions: StagedReaction[] } =\n"
        + json.dumps(payload, indent=2, ensure_ascii=False)
        + ";\n\n"
        "export const REACTIONS = DATA.reactions;\n\n"
        "/** Section 8: a class convention, not a law of nature. Instructor-configurable. */\n"
        "export const PKA_LEAVING_GROUP_CUTOFF = DATA.pkaLeavingGroupCutoff;\n\n"
        "export const byFamily = (family: string) =>\n"
        "  REACTIONS.filter((r) => r.family === family);\n"
        "export const byTier = (tier: number) => REACTIONS.filter((r) => r.tier === tier);\n",
        encoding="utf-8",
    )

    print(f"Wrote {OUT.name} ({len(published)}) and {FLAGGED.name} ({len(flagged)}).")
    return 0


if __name__ == "__main__":
    sys.exit(main())
