"""Every lesson worked example as a drawn scheme (Learn rounds 4 and 6).

Writes src/data/workedExamples.ts and the drawings it names. Run from
grignard-app-source:

    python scripts/match_worked_examples.py

Each worked example in src/data/lessonTopics.ts names a composite picture,
public/cards/carbonyl_<id>.svg, made by the mechanism_trainer repo next door
(scripts/make_flashcards.py). Those pictures type their reagents at 5px, colour
atoms red and blue and have no dark copy, so the lesson draws every example with
the same scheme the reaction cards use instead. Two routes, in this order:

1. ROUND 4, THE REACTION DATA. Where the example's starting material and product
   equal, as RDKit canonical SMILES, a reactant and the product of one reaction in
   src/data/reactions.ts, the lesson draws that reaction. When two reactions
   qualify (Clemmensen and Wolff-Kishner both turn acetophenone into
   ethylbenzene) the one whose id is the picture's own id wins; if that does not
   settle it, the script refuses rather than guess.

2. ROUND 6, THE PICTURE'S OWN DATA. Every other example is drawn from the
   structures its picture was generated FROM: the Problem literal in
   mechanism_trainer (startingMaterial, product, the `reactants` SMILES that hold
   every species in the flask, reagentsAbove and reagentsBelow), or for a variant
   card the variants.py family and its base Problem. Nothing is typed from memory:
   - start and product SMILES are read from that source, parsed, and must
     round-trip (canonical, parsed again, the same canonical) before they are drawn;
   - each reagent's SMILES in STEPS below must be a species in that Problem's own
     `reactants`, or (one case, LABEL_SPECIES) the structure this repo's generator
     already draws for that exact bottle label;
   - each label and the conditions line must be words the source itself prints
     above or below its arrow ("then " dropped where the numbering says it).
   A drawn reagent reuses the generator's drawing when build_curriculum.py already
   draws that structure; otherwise it is drawn here with the generator's own reagent
   settings and ink, and named by PubChem's title for exactly that structure
   (build_learn_index.py's lookup, checked by round trip).

An example with no source for its chemistry stops the script: the lesson has no
fallback picture any more. The SVG cards and the decks are not touched (they are
generated; the decks use them).

Needs RDKit, the network (PubChem, for new reagent names) and the mechanism_trainer
checkout at ../../mechanism_trainer, which is read and never written.
"""
from __future__ import annotations

import json
import re
import sys
from pathlib import Path

from rdkit import Chem, RDLogger

RDLogger.DisableLog("rdApp.*")

ROOT = Path(__file__).resolve().parent.parent
TRAINER = ROOT.parent.parent / "mechanism_trainer"
OUT = ROOT / "src" / "data" / "workedExamples.ts"

# The same files, in the same order, make_flashcards.py reads.
PROBLEM_FILES = (
    "problems.ts", "exam2Problems.ts", "additionProblems.ts",
    "oxidationProblems.ts", "nitrogenProblems.ts", "acidProblems.ts",
    "aromaticProblems.ts",
)

sys.path.insert(0, str(TRAINER / "scripts"))
sys.path.insert(0, str(Path(__file__).resolve().parent))
from variants import FAMILIES, generate  # noqa: E402  (the trainer's own variant generator)
from build_curriculum import (  # noqa: E402  (the reaction generator's drawing code)
    ART, REAGENT_ART_DIR, REAGENT_BOND_LENGTH, REAGENT_FONT_SIZE, REAGENT_HEIGHT,
    REAGENT_INK, REAGENT_STRUCTURES, REAGENT_WIDTH, reagent_slug, render_svg,
)
from conservation_check import formula_of  # noqa: E402
from build_learn_index import pubchem_title  # noqa: E402

# How each unmatched example's reagents sit on its arrow: groups in order (a later
# group is a later step, numbered), each a list of (label, structure). A structure
# of None is a bottle label the source gives no structure for (CH3MgBr: the trainer
# writes the mechanistic [CH3-], and drawing a bare methyl anion would teach the
# wrong flask), or a catalyst whose label says more than its drawing would
# ("H+ cat."). Every structure is checked against the Problem's own reactants.
# The second item is the source's own conditions text that is not a reagent.
STEPS: dict[str, tuple[list[list[tuple[str, str | None]]], str]] = {
    "carbonyl_cyanohydrin.svg": ([[("NaCN", "[C-]#N")]], "H₂O, pH ≈ 10"),
    "carbonyl_wittig.svg": ([[("Ph₃P=CH₂", "[CH2-][P+](c1ccccc1)(c1ccccc1)c1ccccc1")]], "THF"),
    "carbonyl_var_grignard-add_8.svg": ([[("CH₃MgBr", None)], [("H₃O⁺", "[OH3+]")]], "Et₂O, anhydrous"),
    "carbonyl_vanillin-acetylation.svg": ([[("Ac₂O", "CC(=O)OC(C)=O"), ("NaOH", "[OH-]")]], "H₂O"),
    "carbonyl_anhydride.svg": ([[("CH₃CO₂⁻", "CC(=O)[O-]"), ("pyridine", "c1ccncc1")]], ""),
    "carbonyl_nitrile-acidic.svg": ([[("H₃O⁺", "[OH3+]")]], "heat"),
    "carbonyl_pcc.svg": ([[("PCC", "[O-][Cr](=O)(=O)Cl.c1cc[nH+]cc1")]], "CH₂Cl₂, anhydrous"),
    "carbonyl_jones.svg": ([[("CrO₃, H₂SO₄", "O[Cr](=O)(=O)O")]], "H₂O, acetone"),
    "carbonyl_imine.svg": ([[("CH₃NH₂", "CN")]], "H⁺ cat., pH 4-5"),
    "carbonyl_enamine-alkylation.svg": ([[("CH₃I", "CI")], [("H₂O", None)]], ""),
    "carbonyl_cyclic-hemiacetal.svg": ([[("H⁺ cat.", None)]], "(intramolecular)"),
}

# A bottle label whose structure the source's reactants do not list, drawn because
# this repo's generator already draws that label: the Grignard variants print
# "then H3O+" over a base Problem whose reactants stop at the Grignard step.
# build_curriculum.py REAGENT_STRUCTURES["[H3O+]"] is hydronium, [OH3+]; checked below.
LABEL_SPECIES = {"H₃O⁺": "[OH3+]"}

# PubChem's title is used as given unless it is not a usable name for the drawing.
# Each exception cites where the name comes from; printed beside the lookup.
NAME_EXCEPTIONS: dict[str, tuple[str, str]] = {
    # PubChem refuses this SMILES (HTTP 400). Its record CID 46846327, titled
    # "Pyridinium chlorochromate", draws the salt as CrO3 + pyridine + HCl;
    # RDKit gives both the same formula, C5H6ClCrNO3 (checked in main()).
    "[O]=[Cr](=[O])([O-])[Cl].c1cc[nH+]cc1": (
        "Pyridinium chlorochromate",
        "PubChem CID 46846327, SMILES C1=CC=NC=C1.O=[Cr](=O)=O.Cl",
    ),
}


def canonical(smiles: str) -> str | None:
    mol = Chem.MolFromSmiles(smiles)
    return Chem.MolToSmiles(mol) if mol else None


def round_trip(smiles: str, what: str) -> str:
    """The canonical SMILES, after checking it parses and parses back to itself."""
    first = canonical(smiles)
    if first is None:
        sys.exit(f"{what}: RDKit cannot parse {smiles!r}")
    if canonical(first) != first:
        sys.exit(f"{what}: {smiles!r} does not round-trip ({first!r} gives {canonical(first)!r})")
    return first


def reactions_data() -> dict:
    text = (ROOT / "src" / "data" / "reactions.ts").read_text(encoding="utf-8")
    start = text.index("=\n{") + 2
    return json.loads(text[start:text.index("\n}", start) + 2])


def problems() -> dict[str, dict]:
    """Problem id to what a scheme needs, read from the Problem literals."""
    text = "".join((TRAINER / "src" / "data" / f).read_text(encoding="utf-8") for f in PROBLEM_FILES)
    out: dict[str, dict] = {}
    for block in re.split(r"export const [A-Z_0-9]+: Problem = \{", text)[1:]:
        pid = re.search(r'id: "([^"]+)"', block)
        structures = re.findall(r'name:\s*"([^"]+)",\s*smiles:\s*"([^"]+)",\s*image:\s*"structures/', block)
        reactants = re.search(r'\n  reactants: "([^"]+)"', block)
        above = re.search(r"reagentsAbove: \[([^\]]*)\]", block)
        below = re.search(r"reagentsBelow: \[([^\]]*)\]", block)
        if pid and len(structures) >= 2:
            out[pid.group(1)] = {
                "start": structures[0],
                "product": structures[1],
                "reactants": reactants.group(1).split(".") if reactants else [],
                "words": re.findall(r'"([^"]+)"', (above.group(1) if above else "") + "," + (below.group(1) if below else "")),
            }
    return out


def picture_sources() -> dict[str, dict]:
    """Picture file name to its chemistry, as make_flashcards.py names the pictures."""
    probs = problems()
    out = {f"carbonyl_{pid}.svg": p for pid, p in probs.items()}
    # Variants are numbered within their deck group, in generation order (make_flashcards.py main()).
    variants, refused = generate()
    if refused:
        sys.exit("variants.py refused some substrates; fix that first:\n" + "\n".join(refused))
    by_group: dict[str, list[dict]] = {}
    for v in variants:
        by_group.setdefault(v["group"], []).append(v)
    bases = {f["id"]: f["base"] for f in FAMILIES}
    for group in by_group.values():
        for i, v in enumerate(group):
            base = probs.get(bases[v["family"]], {})
            out[f"carbonyl_var_{v['family']}_{i}.svg"] = {
                "start": (v["substrate_name"], v["substrate_smiles"]),
                "product": (v["product_name"], v["product_smiles"]),
                # The family's reagents are its base Problem's; its words are its own.
                "reactants": base.get("reactants", []),
                "words": list(v["above"]) + list(v["below"]),
            }
    return out


def reagent_drawing(smiles: str, written: str, existing: dict[str, dict], label: str, picture: str) -> dict:
    """The drawing for one reagent: the generator's own when it has one, else drawn here.

    `written` is the SMILES as the source spells it, for PubChem, which refuses
    RDKit's bracketed canonical form of the chromium species."""
    for token, (drawn, _why) in REAGENT_STRUCTURES.items():
        if canonical(drawn) == smiles and token in existing:
            art = existing[token]
            return {"light": art["light"], "dark": art["dark"], "formula": art["formula"]}
    slug = reagent_slug(smiles)
    art: dict = {}
    for theme in ("light", "dark"):
        name = f"{slug}-{theme}.svg"
        if not render_svg(smiles, REAGENT_ART_DIR / name, dark=(theme == "dark"), width=REAGENT_WIDTH,
                          height=REAGENT_HEIGHT, bond_length=REAGENT_BOND_LENGTH,
                          font_size=REAGENT_FONT_SIZE, ink=REAGENT_INK[theme]):
            sys.exit(f"{picture}: RDKit would not draw {label} ({smiles})")
        art[theme] = f"reagents/{name}"
    art["formula"] = formula_of(smiles)
    title = NAME_EXCEPTIONS[smiles][0] if smiles in NAME_EXCEPTIONS else pubchem_title(written)
    if not title:
        sys.exit(f"{picture}: PubChem has no title for {label} ({smiles}); add a cited NAME_EXCEPTIONS entry")
    art["name"] = title
    return art


def scheme_for(picture: str, src: dict, existing: dict[str, dict]) -> dict:
    if picture not in STEPS:
        sys.exit(f"{picture}: no reaction in the data and no STEPS entry; say how its reagents sit")
    groups_in, conditions = STEPS[picture]
    start_name, start_smiles = src["start"]
    product_name, product_smiles = src["product"]
    start = round_trip(start_smiles, f"{picture} start")
    product = round_trip(product_smiles, f"{picture} product")
    species = {round_trip(s, f"{picture} reactant") for s in src["reactants"]}
    words = " | ".join(src["words"])
    if conditions and conditions not in words:
        sys.exit(f"{picture}: conditions {conditions!r} are not the source's words ({words})")

    groups = []
    reagent_smiles = []
    for group in groups_in:
        out = []
        for label, smiles in group:
            if label not in words:
                sys.exit(f"{picture}: label {label!r} is not the source's words ({words})")
            step: dict = {"label": label}
            if smiles is not None:
                s = round_trip(smiles, f"{picture} {label}")
                by_label = LABEL_SPECIES.get(label)
                # A salt (PCC) is drawn as its ions; each ion must be in the flask.
                in_flask = all(round_trip(f, f"{picture} {label}") in species for f in s.split("."))
                if not in_flask and not (by_label is not None and canonical(by_label) == s):
                    sys.exit(f"{picture}: {label} drawn as {s}, which is not in its Problem's reactants")
                if s == start:
                    sys.exit(f"{picture}: {label} is the starting material, already drawn left of the arrow")
                art = reagent_drawing(s, smiles, existing, label, picture)
                name = art.pop("name", None)
                step["art"] = art
                if name:
                    step["name"] = name
                reagent_smiles.append(s)
            out.append(step)
        groups.append(out)

    key = picture.removeprefix("carbonyl_").removesuffix(".svg")
    art = {}
    for slot, smiles in (("start", start), ("product", product)):
        for theme in ("light", "dark"):
            name = f"worked-{key}-{slot}-{theme}.svg"
            if not render_svg(smiles, ART / name, dark=(theme == "dark")):
                sys.exit(f"{picture}: RDKit would not draw the {slot}")
            art[f"{slot}_{theme}"] = f"reactions/{name}"
    return {
        "reactant_labels": [start_name],
        "product_label": product_name,
        "art": art,
        "groups": groups,
        "conditions": conditions,
        "smiles": {"start": start, "reagents": reagent_smiles, "product": product},
    }


def main() -> int:
    data = reactions_data()
    rx = data["reactions"]
    existing = data["reagentArt"]
    if canonical(REAGENT_STRUCTURES["[H3O+]"][0]) != canonical(LABEL_SPECIES["H₃O⁺"]):
        sys.exit("LABEL_SPECIES no longer matches the generator's hydronium")
    for smiles, (_name, cite) in NAME_EXCEPTIONS.items():
        theirs = cite.split("SMILES ")[1]
        if formula_of(smiles) != formula_of(theirs):
            sys.exit(f"NAME_EXCEPTIONS: {smiles} is not the formula of {theirs}")
    sources = picture_sources()
    topics = (ROOT / "src" / "data" / "lessonTopics.ts").read_text(encoding="utf-8")
    pictures = re.findall(r'"(carbonyl_[^"]+\.svg)"', topics)

    matched: dict[str, str] = {}
    drawn: dict[str, dict] = {}
    for picture in pictures:
        if picture not in sources:
            sys.exit(f"{picture}: no Problem or variant draws this picture; cannot read its chemistry")
        src = sources[picture]
        start, product = (canonical(s) for s in (src["start"][1], src["product"][1]))
        hits = [
            r["id"] for r in rx
            if canonical(r["product"]) == product and start in {canonical(s) for s in r["reactants"]}
        ]
        if len(hits) > 1:
            own = picture.removeprefix("carbonyl_").removesuffix(".svg")
            hits = [h for h in hits if h == own]
            if len(hits) != 1:
                sys.exit(f"{picture}: more than one reaction has this chemistry and none is named {own}")
        if hits:
            matched[picture] = hits[0]
        else:
            drawn[picture] = scheme_for(picture, src, existing)

    lines = [
        "// GENERATED by scripts/match_worked_examples.py. Do not edit by hand.",
        "//",
        "// Every lesson worked example (keyed by its old picture in public/cards/),",
        "// drawn with the reaction cards' scheme. WORKED_EXAMPLE_REACTION: the",
        "// example's starting material and product are, as RDKit canonical SMILES,",
        "// one reaction of reactions.ts, and the lesson draws that reaction.",
        "// WORKED_EXAMPLE_SCHEME: every other example, drawn from the structures its",
        "// picture was generated from (mechanism_trainer's Problem or variant), each",
        "// SMILES parsed and round-tripped by RDKit. `smiles` is provenance only and",
        "// is never shown to a student.",
        "",
        'import type { ReagentStep } from "@/game/cards/types";',
        "",
        "/** A reagent on the arrow; `name` is its spoken name where the reagent index has none. */",
        "export type WorkedStep = ReagentStep & { readonly name?: string };",
        "",
        "export interface WorkedScheme {",
        "  readonly reactant_labels: readonly string[];",
        "  readonly product_label: string;",
        "  readonly art: {",
        "    readonly start_light: string;",
        "    readonly start_dark: string;",
        "    readonly product_light: string;",
        "    readonly product_dark: string;",
        "  };",
        "  /** In order; a later group is a later step. Reagents in one group go in together. */",
        "  readonly groups: readonly (readonly WorkedStep[])[];",
        "  /** The source's own words under its arrow that are not a reagent; may be empty. */",
        "  readonly conditions: string;",
        "  readonly smiles: { readonly start: string; readonly reagents: readonly string[]; readonly product: string };",
        "}",
        "",
        "export const WORKED_EXAMPLE_REACTION: Readonly<Record<string, string>> = {",
        *(f'  "{k}": "{v}",' for k, v in matched.items()),
        "};",
        "",
        "export const WORKED_EXAMPLE_SCHEME: Readonly<Record<string, WorkedScheme>> = "
        + json.dumps(drawn, indent=2, ensure_ascii=False)
        + ";",
        "",
    ]
    OUT.write_text("\n".join(lines), encoding="utf-8", newline="\n")
    print(f"{len(matched)} matched to a reaction, {len(drawn)} drawn from their own data; wrote {OUT.relative_to(ROOT)}")
    for k, v in matched.items():
        print(f"  {k} -> {v}")
    for k, v in drawn.items():
        steps = " ; ".join(", ".join(f"{s['label']}{' (drawn: ' + s['name'] + ')' if 'name' in s else (' (drawn)' if 'art' in s else '')}" for s in g) for g in v["groups"])
        print(f"  {k}: {v['smiles']['start']} -> {v['smiles']['product']}  [{steps}]  {v['conditions']}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
