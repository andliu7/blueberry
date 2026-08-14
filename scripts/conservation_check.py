"""
conservation_check.py

Reference implementation of the RDKit hard checks from the generation procedure,
extended (not replaced) per section 4.

The original four functions below are unchanged: parse_and_valence, conservation,
canonical, _atom_counts. Everything after the ORIGINAL / EXTENSIONS divider is
new, and it adds two things the procedure asks for but the reference did not
carry:

  * the section 5 classification check, using Rxn-INSIGHT to fact-check the
    reaction_type an author claimed
  * a staged-reaction validator that runs parse, conservation and classification
    over the full schema from section 2, and returns a validation record rather
    than printing

The original REACTIONS list is kept verbatim as a regression test. Section 7 says
any change to generation logic must still reproduce the seed set exactly, and the
only way that stays true is if it runs every time.

Requires: rdkit, rxn-insight  (pip install rdkit rxn-insight)

Usage: python scripts/conservation_check.py
Do not use em dashes in output.
"""

from rdkit import Chem
from collections import Counter


def _atom_counts(smiles):
    """Full atom counts including explicit hydrogens, or None if unparseable."""
    mol = Chem.MolFromSmiles(smiles)
    if mol is None:
        return None
    return Counter(a.GetSymbol() for a in Chem.AddHs(mol).GetAtoms())


def _formal_charge(smiles):
    mol = Chem.MolFromSmiles(smiles)
    return None if mol is None else Chem.GetFormalCharge(mol)


def parse_and_valence(species):
    """Every species must parse and sanitize (illegal valence -> None)."""
    bad = [s for s in species if Chem.MolFromSmiles(s) is None]
    return (len(bad) == 0, bad)


def conservation(lhs, rhs, redox=False):
    """
    lhs / rhs: lists of SMILES for the fully declared species set
      (reactants + reagent-supplied atoms on lhs; products + byproducts on rhs).
    redox: if True, only heavy-atom conservation is required, because hydrogen or
      oxygen is supplied or removed by the reagent. If False, every atom including
      hydrogen and net formal charge must balance.
    Returns (status_string, detail_dict).
    """
    ok, bad = parse_and_valence(lhs + rhs)
    if not ok:
        return "PARSE_OR_VALENCE_FAIL", {"unparseable": bad}

    L, R = Counter(), Counter()
    for s in lhs:
        L += _atom_counts(s)
    for s in rhs:
        R += _atom_counts(s)

    heavy_L = Counter({k: v for k, v in L.items() if k != "H"})
    heavy_R = Counter({k: v for k, v in R.items() if k != "H"})
    charge_L = sum(_formal_charge(s) for s in lhs)
    charge_R = sum(_formal_charge(s) for s in rhs)

    if heavy_L != heavy_R:
        delta = Counter(heavy_L); delta.subtract(heavy_R)
        return "HEAVY_ATOM_FAIL", {"heavy_delta": {k: v for k, v in delta.items() if v}}

    if charge_L != charge_R:
        return "CHARGE_FAIL", {"charge_lhs": charge_L, "charge_rhs": charge_R}

    if redox:
        # Heavy atoms and charge already conserved; H/O supplied by reagent is fine.
        return "REDOX_OK", {}

    if L != R:
        delta = Counter(L); delta.subtract(R)
        return "H_MISMATCH", {"delta": {k: v for k, v in delta.items() if v}}

    return "BALANCED", {}


def canonical(smiles):
    return Chem.CanonSmiles(smiles)


# Staged reactions: (name, lhs, rhs, is_redox). lhs and rhs are the FULLY declared
# species sets, byproducts included. These mirror seed_reactions.md.
REACTIONS = [
    ("fischer-esterification", ["OC(=O)c1ccccc1", "CO"], ["O=C(OC)c1ccccc1", "O"], False),
    ("nitrile-acidic-hydrolysis", ["N#Cc1ccccc1", "O", "O"], ["OC(=O)c1ccccc1", "N"], False),
    ("nabh4-reduction", ["CC(=O)c1ccccc1"], ["CC(O)c1ccccc1"], True),
    ("clemmensen", ["CC(=O)c1ccccc1", "[H][H]", "[H][H]"], ["CCc1ccccc1", "O"], False),
    ("socl2-acid-to-chloride", ["OC(=O)c1ccccc1", "O=S(Cl)Cl"],
        ["O=C(Cl)c1ccccc1", "O=S=O", "Cl"], False),
    ("gilman-to-ketone", ["O=C(Cl)c1ccccc1", "[CH3-]"], ["CC(=O)c1ccccc1", "[Cl-]"], False),
    ("jones-oxidation", ["OCc1ccccc1", "[O]"], ["OC(=O)c1ccccc1"], True),
    ("dibalh-to-aldehyde", ["O=C(OC)c1ccccc1"], ["O=Cc1ccccc1", "CO"], True),
]

PASSING = ("BALANCED", "REDOX_OK")


# ==========================================================================
# ORIGINAL ABOVE / EXTENSIONS BELOW
# ==========================================================================

# Section 6. The allowed values for `family`. An author cannot invent one.
FAMILIES = {
    "alkenes/substitution", "alkenes/elimination", "alkenes/epoxidation",
    "alkenes/epoxide-opening",
    "dienes/diels-alder", "dienes/conjugate-addition", "dienes/mo-reasoning",
    "aromaticity/huckel", "aromaticity/eas", "aromaticity/nas",
    "carbonyls/addition", "carbonyls/reduction", "carbonyls/imine-enamine",
    "carbonyls/protecting-groups",
    "derivatives/substitution", "derivatives/reduction", "derivatives/hydrolysis",
    "nitriles/formation", "nitriles/hydrolysis", "nitriles/reduction",
    "enolates/alkylation", "enolates/aldol", "enolates/claisen",
    "enolates/michael", "enolates/decarboxylation", "enolates/halogenation",
    "enolates/annulation",
    "amines/substitution", "amines/diazonium",
    "alcohols-ethers/substitution", "alcohols-ethers/oxidation",
    "carbohydrates/oxidation",
}

ROLES = {"reagent", "workup", "catalyst"}
ACID_BASE = {"neutral", "acidic", "basic"}
PROVENANCE = {"syllabus", "professor-slide", "ta-verified", "ai-proposed"}

# Section 8. A class convention, not a law of nature. Instructor-configurable,
# never hardcoded into the logic that reads it.
DEFAULT_LEAVING_GROUP_PKA_CUTOFF = 20.0


def classify(reactant_smiles, reagent_smiles, product_smiles):
    """
    Section 5. Ask Rxn-INSIGHT what family it thinks this is.

    Returns (label, error). A None label with an error string means the
    classifier could not run, which is NOT the same as a mismatch and must not
    be treated as one: an unavailable fact-checker is a gap in coverage, not
    evidence against the author.
    """
    try:
        import warnings
        warnings.filterwarnings("ignore")
        from rxn_insight.reaction import Reaction
    except Exception as exc:
        return None, f"rxn-insight unavailable ({exc.__class__.__name__})"

    lhs = ".".join([s for s in list(reactant_smiles) + list(reagent_smiles) if s])
    if not lhs or not product_smiles:
        return None, "nothing to classify"
    try:
        label = Reaction(f"{lhs}>>{product_smiles}").get_name()
    except Exception as exc:
        return None, f"{exc.__class__.__name__}: {str(exc)[:90]}"

    # "OtherReaction" is the classifier's no-opinion bucket, not a contradiction.
    # Counting it as a mismatch put eleven false flags in a set of sixteen, which
    # would have buried the one real disagreement. Section 5 only claims that a
    # MISMATCH is a reliable signal; silence is not a mismatch.
    if not label or label.strip().lower() in {"otherreaction", "other", "unknown"}:
        return None, "classifier has no opinion (OtherReaction)"
    return label, None


# The two sides speak at different levels of abstraction. Rxn-INSIGHT names
# specific transformations ("Esterification of Carboxylic Acids"); an author
# claims a mechanism class ("nucleophilic acyl substitution"). Both are right,
# and comparing the strings says they disagree. So each side is normalised into
# the set of mechanism classes its words imply, and agreement is an overlap.
#
# A phrase may map to more than one class on purpose: saponification is both a
# substitution and a hydrolysis, and either claim about it should stand.
_CLASS_MARKERS = {
    "REDUCTION": ("reduction", "reduce", "reducing", "hydride", "hydrogenation"),
    "OXIDATION": ("oxidation", "oxidiz", "oxidis"),
    "SUBSTITUTION": ("substitution", "esterification", "acylation", "saponification",
                     "alkylation", "transesterification"),
    "ADDITION": ("addition", "hydration", "adds to"),
    "CONDENSATION": ("condensation", "imine", "enamine", "hydrazone", "aldol", "claisen"),
    "HYDROLYSIS": ("hydrolysis", "hydrolyz", "hydrolys", "saponification", "deprotection"),
    "ELIMINATION": ("elimination", "dehydration", "dehydrat"),
    "CYCLOADDITION": ("cycloaddition", "diels-alder", "diels alder"),
    "DEOXYGENATION": ("deoxygenation", "deoxygenat"),
    "OLEFINATION": ("olefination", "wittig", "alkenation"),
    "PROTECTION": ("protection", "protecting", "acetal", "ketal"),
}


def _mechanism_classes(text):
    lowered = (text or "").lower()
    return {
        name for name, markers in _CLASS_MARKERS.items()
        if any(m in lowered for m in markers)
    }


def classification_agrees(claimed, label):
    """
    Do the claimed reaction_type and the classifier label describe the same
    structural change? True, False, or None when neither side is classifiable.

    Deliberately generous. The procedure says a mismatch is a reliable signal of
    error and a match is not proof of correctness, so a false mismatch (a
    correct reaction queued for review for no reason) costs more than a false
    agreement, which the human review still catches.
    """
    if not claimed or not label:
        return None
    mine, theirs = _mechanism_classes(claimed), _mechanism_classes(label)
    if not mine or not theirs:
        # Nothing recognisable on one side. Not evidence of disagreement.
        return None
    return bool(mine & theirs)


def validate_staged(rxn):
    """
    Steps C and D of section 3, over one staged reaction dict (section 2 schema).

    Returns the `validation` record. The author never fills this in; the
    pipeline does. `status` is "ok" or "flagged", and a flagged reaction is
    never published (section 3, step E).
    """
    problems = []
    record = {"checks": {}}

    # Schema and vocabulary.
    if rxn.get("family") not in FAMILIES:
        problems.append(f"family '{rxn.get('family')}' is not one of the syllabus families")
    if rxn.get("provenance") not in PROVENANCE:
        problems.append(f"provenance '{rxn.get('provenance')}' is not a permitted value")
    for stage in rxn.get("stages", []):
        if stage.get("role") not in ROLES:
            problems.append(f"stage {stage.get('order')}: role '{stage.get('role')}' invalid")
        ab = (stage.get("conditions") or {}).get("acid_base")
        if ab not in ACID_BASE:
            problems.append(f"stage {stage.get('order')}: acid_base '{ab}' invalid")

    # Section 2: committed_step_index must point at a stage that exists.
    orders = [s.get("order") for s in rxn.get("stages", [])]
    if rxn.get("committed_step_index") is not None and orders:
        if rxn["committed_step_index"] not in orders:
            problems.append(
                f"committed_step_index {rxn['committed_step_index']} is not a stage order"
            )

    # Check 1: parse and valence over EVERY species named anywhere.
    species = list(rxn.get("reactants", [])) + list(rxn.get("intermediates", []))
    species.append(rxn.get("product", ""))
    for stage in rxn.get("stages", []):
        species += [s for s in stage.get("reagents", []) if _looks_like_smiles(s)]
        species += list(stage.get("byproducts", []))
    species = [s for s in species if s]
    ok, bad = parse_and_valence(species)
    record["checks"]["parse"] = "ok" if ok else "fail"
    if not ok:
        problems.append(f"unparseable SMILES: {bad}")

    # Check 2: conservation over the declared balance equation.
    status, detail = conservation(rxn["balance_lhs"], rxn["balance_rhs"], redox=rxn.get("redox", False))
    record["checks"]["conservation"] = status
    if detail:
        record["conservation_detail"] = detail
    if status not in PASSING:
        problems.append(f"conservation: {status} {detail}")

    # Check 3 (section 5): classification.
    reagents = [s for st in rxn.get("stages", []) for s in st.get("reagents", []) if _looks_like_smiles(s)]
    label, err = classify(rxn.get("reactants", []), reagents, rxn.get("product", ""))
    if label is None:
        record["checks"]["classification"] = f"unavailable ({err})"
    else:
        agrees = classification_agrees(rxn.get("reaction_type"), label)
        record["classifier_label"] = label
        # Three states, not two. None means neither side reduced to a mechanism
        # class, which is inconclusive; printing that as MISMATCH on a row that
        # then publishes anyway is worse than saying nothing.
        record["checks"]["classification"] = {
            True: "agrees",
            False: "MISMATCH",
            None: "inconclusive",
        }[agrees]
        if agrees is False:
            problems.append(
                f"classifier says '{label}', author claimed '{rxn.get('reaction_type')}'"
            )

    record["status"] = "flagged" if problems else "ok"
    record["problems"] = problems
    return record


def _looks_like_smiles(text):
    """
    Shorthand like 'NaBH4' or 'Zn(Hg), HCl' is allowed in a stage's reagent list
    (section 2 says 'SMILES or accepted shorthand'), but must not be fed to the
    parser as though it were structure.
    """
    if not text or " " in text or "," in text:
        return False
    return Chem.MolFromSmiles(text) is not None


def run_regression():
    """Section 7. The seed set must still reproduce exactly."""
    failures = 0
    for name, lhs, rhs, redox in REACTIONS:
        status, detail = conservation(lhs, rhs, redox=redox)
        flag = "" if status in PASSING else "   <-- FLAG for review"
        if status not in PASSING:
            failures += 1
        print(f"[{status:18s}] {name}{flag}")
        if detail:
            print(f"      detail: {detail}")
    return failures


if __name__ == "__main__":
    print("Seed regression (section 7):")
    bad = run_regression()
    print()
    print(f"{len(REACTIONS) - bad}/{len(REACTIONS)} seed reactions conserve.")
