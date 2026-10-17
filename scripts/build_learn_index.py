"""Learn's derived index: reagent names and functional groups (Learn round 3).

Writes src/data/learnIndex.ts. Run from grignard-app-source:

    python scripts/build_learn_index.py

Two tables, both DERIVED, never typed from memory (owner rule: chemistry shown
to a student comes from RDKit, never recall):

1. REAGENT_NAMES: what each drawn reagent is CALLED, for its alt text and for
   search. A screen reader used to read the bottle label ("CH3C#C-" comes out
   as "C H 3 C number C minus"). The name is PubChem's own title for the exact
   structure: PubChem is asked by the drawn token's SMILES for
   the compound with that structure (checked by round trip), and its title is
   used as given. Four titles are not usable names (a placeholder, a CAS index
   name, one that names a different species); those take the name the repo's
   own data gives, each cited in REPO_NAMES. Nothing is typed from memory.

2. REACTION_GROUPS: the functional groups in each reaction's starting material
   and product, found by RDKit substructure match against the SMARTS table
   below. So "ketone" finds every reaction whose structures hold a ketone,
   not only the two that say "ketone" in their names.

Needs RDKit and the network (PubChem). Stdlib otherwise.
"""
from __future__ import annotations

import json
import re
import sys
import time
import urllib.parse
import urllib.request
from pathlib import Path

from rdkit import Chem, RDLogger

RDLogger.DisableLog("rdApp.*")

ROOT = Path(__file__).resolve().parent.parent
SRC = ROOT / "src" / "data" / "reactions.ts"
OUT = ROOT / "src" / "data" / "learnIndex.ts"

sys.path.insert(0, str(Path(__file__).resolve().parent))
from build_curriculum import REAGENT_STRUCTURES  # noqa: E402  (the generator's own token to SMILES table)

# One SMARTS per group, the group's plain name as the key. Order is the order
# a result lists them. Each pattern is the textbook definition written as a
# substructure; the anhydride and acid chloride are excluded from "ester" and
# "ketone" by their own atoms, not by a later rule.
GROUPS: dict[str, str] = {
    "aldehyde": "[CX3H1](=O)[#6,#1]",
    "ketone": "[#6][CX3](=O)[#6]",
    "carboxylic acid": "[CX3](=O)[OX2H1]",
    "carboxylate": "[CX3](=O)[OX1-]",
    "ester": "[#6][CX3](=O)[OX2][#6;!$(C=O)]",
    "anhydride": "[CX3](=O)[OX2][CX3](=O)",
    "acid chloride": "[CX3](=O)[Cl]",
    "amide": "[CX3](=O)[NX3]",
    "nitrile": "[CX2]#[NX1]",
    "alcohol": "[CX4][OX2H]",
    "phenol": "c[OX2H]",
    "alkoxide": "[CX4][OX1-]",
    "ether": "[OD2]([#6;!$(C=O)])[#6;!$(C=O)]",
    "epoxide": "C1OC1",
    "acetal": "[CX4;!$(C=O)]([OX2][#6])[OX2][#6]",
    "hemiacetal": "[CX4]([OX2H])[OX2][#6]",
    "amine": "[NX3;!$(N[C,S]=[O,S,N]);!$(N[N,O]);!$(N-a)][#6]",
    "aniline": "[NX3;!$(NC=[O,S])]c",
    "imine": "[CX3]=[NX2][#6,#1]",
    "enamine": "[CX3]=[CX3][NX3]",
    "alkene": "[CX3]=[CX3]",
    "diene": "[CX3]=[CX3][CX3]=[CX3]",
    "unsaturated carbonyl": "[CX3]=[CX3][CX3]=O",
    "alkyne": "[CX2]#[CX2]",
    "aromatic ring": "a1aaaaa1",
    "alkyl halide": "[CX4][Cl,Br,I]",
    "aryl halide": "c[Cl,Br,I]",
    "nitro": "[N+](=O)[O-]",
    "diazonium": "[N+]#N",
}
PATTERNS = {name: Chem.MolFromSmarts(s) for name, s in GROUPS.items()}
bad = [n for n, p in PATTERNS.items() if p is None]
if bad:
    sys.exit(f"SMARTS did not parse: {bad}")


def load_data() -> dict:
    text = SRC.read_text(encoding="utf-8")
    start = text.index("=\n{") + 2
    end = text.index("\n};", start) + 2
    return json.loads(text[start:end])


def groups_of(smiles_list: list[str]) -> list[str]:
    found: list[str] = []
    for smi in smiles_list:
        mol = Chem.MolFromSmiles(smi)
        if mol is None:
            continue
        for name, patt in PATTERNS.items():
            if name not in found and mol.HasSubstructMatch(patt):
                found.append(name)
    return [n for n in GROUPS if n in found]


# Where PubChem's title is not a usable name, the name the repo's own data
# already gives the species, with where it says so. Applied after the lookup and
# printed beside it, so a reader sees both.
REPO_NAMES: dict[str, tuple[str, str]] = {
    # PubChem titles [OH3+] "Oxonium"; the generator names the species it drew.
    "[H3O+]": ("hydronium", "build_curriculum.py REAGENT_STRUCTURES: 'hydronium, the aqueous acid workup'"),
    # PubChem's title for CC[O-] is "1-Hydroxyethyl radical", which is not this species.
    "CC[O-]": ("ethoxide", "build_curriculum.py REAGENT_STRUCTURES: 'the ethoxide anion of the NaOEt'"),
    # PubChem's title is the CAS index name "Aluminate(1-), tetrahydro-, (T-4)-", read in order.
    "[AlH4-]": ("tetrahydroaluminate", "PubChem CAS index name 'Aluminate(1-), tetrahydro-'"),
    # PubChem has no title (CID 20212685) and its IUPAC name is the neutral alkyne.
    "CC#[C-]": ("prop-1-ynyl anion", "reactionCard.ts REAGENT_LABELS: 'Prop-1-ynyl, NOT acetylide'"),
}


def same_structure(a: str, b: str) -> bool:
    """One compound, by RDKit canonical SMILES or, for two drawings of one
    compound (the ylide's P=C and its charge-separated form), by standard InChI."""
    ma, mb = Chem.MolFromSmiles(a), Chem.MolFromSmiles(b)
    if ma is None or mb is None:
        return False
    return Chem.MolToSmiles(ma) == Chem.MolToSmiles(mb) or Chem.MolToInchi(ma) == Chem.MolToInchi(mb)


def pubchem_title(smiles: str) -> str | None:
    """PubChem's title for exactly this structure, or None.

    Asked by SMILES, and the answer is only used when PubChem's own SMILES for
    the compound it returns is the same structure (`same_structure`), so a
    near match (a neutral parent for an anion) is refused."""
    url = (
        "https://pubchem.ncbi.nlm.nih.gov/rest/pug/compound/smiles/property/Title,SMILES/JSON?smiles="
        + urllib.parse.quote(smiles)
    )
    try:
        with urllib.request.urlopen(url, timeout=30) as r:
            props = json.load(r)["PropertyTable"]["Properties"]
    except Exception as e:
        print(f"  no PubChem record for {smiles}: {e}")
        return None
    finally:
        time.sleep(0.25)  # PubChem asks for at most 5 requests a second
    for p in props:
        title = p.get("Title") or ""
        if not same_structure(p.get("SMILES", ""), smiles):
            print(f"  PubChem CID {p.get('CID')} is a different structure ({p.get('SMILES')}); refused")
            continue
        if title and not re.fullmatch(r"CID ?\d+", title):
            return title
    return None


def main() -> None:
    data = load_data()
    names: dict[str, str] = {}
    for token in sorted(data["reagentArt"]):
        smiles = REAGENT_STRUCTURES[token][0]
        title = pubchem_title(smiles)
        name = REPO_NAMES[token][0] if token in REPO_NAMES else title
        note = f"   (PubChem: {title}; repo: {REPO_NAMES[token][1]})" if token in REPO_NAMES else ""
        print(f"{token:45s} {name}{note}")
        if name:
            names[token] = name
    groups = {
        r["id"]: {"start": groups_of(r["reactants"]), "product": groups_of([r["product"]])}
        for r in data["reactions"]
    }
    lines = [
        "// GENERATED by scripts/build_learn_index.py. Do not edit by hand.",
        "//",
        "// REAGENT_NAMES: PubChem's title for each drawn reagent, looked up by the",
        "// structure RDKit checks against the token (REAGENT_STRUCTURES in",
        "// build_curriculum.py), or the repo name cited in the script. Alt text and",
        "// search use it; a token with neither falls back to its bottle label.",
        "// REACTION_GROUPS: functional groups RDKit finds by SMARTS in each",
        "// reaction's starting materials and product (the table in the script).",
        "",
        "export const REAGENT_NAMES: Readonly<Record<string, string>> = "
        + json.dumps(names, indent=2, ensure_ascii=False)
        + ";",
        "",
        "export const REACTION_GROUPS: Readonly<Record<string, { start: readonly string[]; product: readonly string[] }>> = "
        + json.dumps(groups, indent=2, ensure_ascii=False)
        + ";",
        "",
    ]
    OUT.write_text("\n".join(lines), encoding="utf-8")
    missing = sorted(set(data["reagentArt"]) - set(names))
    print(f"wrote {OUT.relative_to(ROOT)}: {len(names)} names, {len(groups)} reactions; unnamed: {missing}")
    # The counts the search test pins, printed so they can be checked against it.
    for g in ("ketone", "aldehyde", "ester", "alcohol", "carboxylic acid"):
        n = sum(1 for v in groups.values() if g in v["start"] or g in v["product"])
        print(f"  reactions with a {g} in start or product: {n}")


if __name__ == "__main__":
    main()
