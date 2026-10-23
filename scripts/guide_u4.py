"""
Unit 4 guidebook drawings, derived with RDKit.

    python scripts/guide_u4.py          writes src/game/guide/u4Guide.figures.ts
    python scripts/guide_u4.py --check  rebuilds it in memory and fails if the file on disk differs

WHAT THIS SCRIPT OWNS. The mini example drawn under each Unit 4 lesson in the
guidebook. Every starting material is a species from scripts/u4_pools.py (its
C4 table, under the name the pool uses), and every product, intermediate and
aryne is made by that script's own rules: snar() for the swap, meisenheimer()
and anion_forms() for the complex, aryne() and benzyne_products() for the
elimination-addition. So the guide and the questions follow one rule. Every
name is read back by OPSIN. A mismatch stops the script and nothing is written.

WHAT IT DOES NOT OWN. The words: src/game/guide/u4Guide.ts, where every line
quotes a Unit 4 pool entry word for word (test/guideU4.test.ts holds that).
The drawing rules are Unit 1's (guide_u1.py, through guide_kit.py).

Every example is a draft (placeholder: true) until the owner signs it off.
"""
from __future__ import annotations

import sys

from rdkit import Chem

import u4_pools as u4
from guide_kit import PLUS, RES, arrow, canon, focus, header, mol, named, only, run

BREAK = {"kind": "break"}
NITRO = ("[N+](=O)[O-]",)


def species(key: str) -> tuple[str, str]:
    """(SMILES, display name) for a Unit 4 species, as the pool names it."""
    smiles, name = u4.C4[key]
    return canon(smiles), name[0].upper() + name[1:]


def sp(key: str, **kw) -> dict:
    smiles, name = species(key)
    return named(smiles, name, **kw)


def swap(key: str, nu: str) -> str:
    """The one SNAr product the Unit 4 rule gives with one equivalent of Nu."""
    return canon(only(u4.snar(species(key)[0], nu)))


def build() -> dict:
    ex: dict[str, dict] = {}
    OME = "[O]C"

    # STAGE A: SNAr.
    ex["u4-snar"] = {
        "caption": "Methoxide takes the place of Cl at the same carbon. The nitro groups ortho and para to it make the swap possible.",
        "panels": [
            sp("cdnb"), arrow("NaOCH₃"), focus(named(swap("cdnb", OME), "1-Methoxy-2,4-dinitrobenzene", hi=("[CH3]O",))),
            BREAK,
            sp("pfnb"), arrow("HN(CH₃)₂", "heat"), focus(named(swap("pfnb", "[N](C)C"), "N,N-Dimethyl-4-nitroaniline", hi=("[CH3]N",))),
        ],
    }

    # The Dow process: no acceptor, so hot hydroxide goes the benzyne way.
    pbt, _ = species("pbt")
    assert not u4.snar_sites("Clc1ccccc1")
    phenol = only(u4.outcome("Clc1ccccc1", "NaOH"))
    cresols = u4.outcome(pbt, "NaOH")
    assert len(cresols) == 2, cresols
    meta_cresol, para_cresol = sorted(cresols, key=lambda s: s != canon("Cc1cccc(O)c1"))
    ex["u4-dow"] = {
        "caption": "Hot NaOH turns chlorobenzene into phenol. With a methyl on the ring, two isomers form: the aryne spans the old C-Br carbon and its neighbour.",
        "panels": [
            named("Clc1ccccc1", "Chlorobenzene"), arrow("1. NaOH, heat", "2. H₃O⁺"), focus(named(phenol, "Phenol", hi=("[OH]",))),
            BREAK,
            sp("pbt"), arrow("1. NaOH, heat", "2. H₃O⁺"),
            focus(named(meta_cresol, "3-Methylphenol", hi=("[OH]",))), PLUS, focus(named(para_cresol, "4-Methylphenol", hi=("[OH]",))),
        ],
    }

    # The Meisenheimer complex: the first form, then the form with the charge on a nitro oxygen.
    pcnb, _ = species("pcnb")
    c, _x = u4.site(pcnb)
    start = u4.meisenheimer(pcnb, c, OME)
    forms = u4.anion_forms(start)
    on_oxygen = [smi for smi, at, f in forms if f.GetAtomWithIdx(at).GetSymbol() == "O"]
    assert len(on_oxygen) == 1, on_oxygen
    ex["u4-meisenheimer"] = {
        "caption": "Methoxide bonds to the carbon that holds Cl. That carbon goes sp³, and the ring's minus charge can move onto a nitro oxygen.",
        "panels": [
            sp("pcnb"), arrow("CH₃O⁻"), mol(Chem.MolToSmiles(start), "Charge on the ring", hi=("[#6](Cl)O",)),
            RES,
            focus(mol(on_oxygen[0], "Charge on oxygen", hi=("C=[N+]([O-])[O-]",))),
        ],
    }

    # The reversed leaving group order: activation first, then F before the other halogens.
    ex["u4-lg-order"] = {
        "caption": "F is ortho to NO₂, so its carbon is activated. Br is meta to NO₂ and is not.",
        "panels": [
            sp("bfnb"), arrow("NaOCH₃"), focus(named(swap("bfnb", OME), "4-Bromo-1-methoxy-2-nitrobenzene", hi=("[CH3]O",))),
            BREAK,
            sp("cfdnb"), arrow("NaOCH₃", "1 equiv"), focus(named(swap("cfdnb", OME), "1-Chloro-5-methoxy-2,4-dinitrobenzene", hi=("[CH3]O",))),
        ],
    }

    # STAGE B (side quests): benzyne.
    pct, _ = species("pct")
    assert not u4.snar_sites(pct)
    pc, px = u4.site(pct)
    (j,) = u4.ortho_h(pct, pc)[:1]
    arynes = {canon(u4.aryne(pct, pc, px, h)) for h in u4.ortho_h(pct, pc)}
    assert len(arynes) == 1, arynes  # both ortho H give the same aryne by symmetry
    toluidines = u4.outcome(pct, "NaNH2")
    assert sorted(toluidines) == sorted({canon("Cc1cccc(N)c1"), canon("Cc1ccc(N)cc1")}), toluidines
    ex["u4-benzyne"] = {
        "caption": "NH₂⁻ can add to either end of the aryne: at the old C-Cl carbon (para to CH₃) or next to it (meta).",
        "panels": [
            sp("pct"), arrow("NaNH₂", "NH₃(l)"), mol(u4.aryne(pct, pc, px, j), "Aryne", hi=("C#C",)),
            BREAK,
            mol(u4.aryne(pct, pc, px, j), "Aryne"), arrow("NH₂⁻, then H⁺"),
            focus(named(canon("Cc1cccc(N)c1"), "3-Methylaniline", hi=("[NH2]",))), PLUS,
            focus(named(canon("Cc1ccc(N)cc1"), "4-Methylaniline", hi=("[NH2]",))),
        ],
    }

    lab = "Cl[14c]1ccccc1"
    labelled = u4.outcome(lab, "NaNH2")
    assert len(labelled) == 2, labelled
    rel = {u4.label_relation(s): s for s in labelled}
    assert set(rel) == {"ipso", "ortho"}, rel
    ex["u4-isotope"] = {
        "caption": "The aryne joins the labelled carbon to its neighbour. NH₂⁻ adds to either end, so the label lands on C-N or next to it.",
        "panels": [
            mol(lab, "¹⁴C at C-Cl", hi=("[14#6]-Cl",)), arrow("NaNH₂", "NH₃(l)"),
            focus(mol(rel["ipso"], "¹⁴C on C-N", hi=("[14#6]-N",))), PLUS,
            focus(mol(rel["ortho"], "¹⁴C beside it", hi=("[14#6]~[#6]-N",))),
        ],
    }
    assert not u4.FAILURES, u4.FAILURES
    return ex


HEAD = header("Unit 4", "scripts/guide_u4.py", "test/guideU4.test.ts", "U4_GUIDE_EXAMPLES")

if __name__ == "__main__":
    sys.exit(run(build, "u4Guide.figures.ts", HEAD))
