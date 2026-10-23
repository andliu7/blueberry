"""
Unit 3 guidebook drawings, derived with RDKit.

    python scripts/guide_u3.py          writes src/game/guide/u3Guide.figures.ts
    python scripts/guide_u3.py --check  rebuilds it in memory and fails if the file on disk differs

WHAT THIS SCRIPT OWNS. The mini example drawn under each Unit 3 lesson in the
guidebook. Every starting material is a SMILES, mostly from scripts/u3_pools.py's
C table, and every product is made by that script's own rules: eas_major()
picks the sites the leading group directs to and attaches the electrophile,
sigma_forms() builds the sigma complex, and reduce_nitro(), desulfonate(),
aldehyde_or_ketone_to_ch2(), benzylic_bromination(), benzylic_oxidation(),
birch() and fc_alkylation() are the pool's graph edits. So the guide and the
questions follow one rule. Every name is read back by OPSIN. A failed check
stops the script and nothing is written.

WHAT IT DOES NOT OWN. The words: src/game/guide/u3Guide.ts, where every line
quotes a Unit 3 pool entry word for word (test/guideU3.test.ts holds that).
The drawing rules are Unit 1's (guide_u1.py, through guide_kit.py).

Every example is a draft (placeholder: true) until the owner signs it off.
"""
from __future__ import annotations

import sys

import u3_pools as u3
from guide_kit import PLUS, arrow, canon, focus, header, mol, named, only, run

BREAK = {"kind": "break"}


def s(key: str) -> str:
    """A Unit 3 species' SMILES, canonical."""
    return canon(u3.S(key))


def at(smiles: str, products: list[str], rel: str) -> str:
    """The product whose new group sits `rel` (ortho, meta, para) to the start's one group."""
    start = u3.mol(smiles)
    r = u3.substituents(smiles)[0][0]
    hits = []
    for p in products:
        # The new group is on the ring carbon that had an H in the start and has none now.
        pm = u3.mol(p)
        match = pm.GetSubstructMatch(start)
        new = [i for i in u3.benzene_ring(start) if start.GetAtomWithIdx(i).GetTotalNumHs() > pm.GetAtomWithIdx(match[i]).GetTotalNumHs()]
        if len(new) == 1 and u3.relation(start, r, new[0]) == rel:
            hits.append(p)
    return canon(only(hits))


def eas(smiles: str, e: str) -> list[str]:
    return [canon(p) for p in u3.eas_major(smiles, e)]


def build() -> dict:
    ex: dict[str, dict] = {}
    benzene, toluene, anisole = s("benzene"), s("toluene"), s("anisole")

    # STAGE A: the arenium ion and the five reactions.
    sigma = u3.sigma_forms(benzene, u3.ring_sites(benzene)[0], "Br")
    assert sigma["carbon_forms"] == 3 and not sigma["extra_forms"], sigma
    bromobenzene = only(eas(benzene, "Br"))
    ex["u3-arenium"] = {
        "caption": "Losing that H⁺ puts its bond pair back into the ring: six pi electrons on six sp² carbons, aromatic again. That is bromobenzene.",
        "panels": [
            named(benzene, "Benzene"), arrow("Br₂", "FeBr₃"), mol(sigma["base"], "Sigma complex", hi=("[CH+]",)),
            BREAK,
            mol(sigma["base"], "Sigma complex"), arrow("−H⁺"), focus(named(bromobenzene, "Bromobenzene", hi=("Br",))),
        ],
    }

    tol_br = eas(toluene, "Br")
    nitro_br = only(eas(s("nitrobenzene"), "Br"))
    ex["u3-halo"] = {
        "caption": "CH₃ directs ortho and para, so both of those form. NO₂ is a meta director.",
        "panels": [
            named(toluene, "Toluene"), arrow("Br₂", "FeBr₃"),
            focus(named(at(toluene, tol_br, "ortho"), "1-Bromo-2-methylbenzene", hi=("Br",))), PLUS,
            focus(named(at(toluene, tol_br, "para"), "1-Bromo-4-methylbenzene", hi=("Br",))),
            BREAK,
            named(s("nitrobenzene"), "Nitrobenzene"), arrow("Br₂", "FeBr₃"), focus(named(nitro_br, "1-Bromo-3-nitrobenzene", hi=("Br",))),
        ],
    }

    ethyl = s("ethylbenzene")
    assert u3.benzylic_h_count(ethyl) == 2
    ex["u3-benzylic-br"] = {
        "caption": "Only the CH₂ next to the ring is benzylic. Its radical is stabilised by the ring, so Br goes there.",
        "panels": [named(ethyl, "Ethylbenzene"), arrow("NBS", "light"), focus(named(canon(u3.benzylic_bromination(ethyl)), "(1-Bromoethyl)benzene", hi=("Br",)))],
    }

    ester = s("mebenzoate")
    ex["u3-nitration"] = {
        "caption": "The ester carbonyl is a withdrawer, so nitration goes meta. A second nitro group also goes meta to the first.",
        "panels": [
            named(ester, "Methyl benzoate"), arrow("HNO₃", "H₂SO₄"), focus(named(only(eas(ester, "NO2")), "Methyl 3-nitrobenzoate", hi=("[N+](=O)[O-]",))),
            BREAK,
            named(s("nitrobenzene"), "Nitrobenzene"), arrow("HNO₃", "H₂SO₄"),
            focus(named(only(eas(s("nitrobenzene"), "NO2")), "1,3-Dinitrobenzene", hi=("[N+](=O)[O-]",))),
        ],
    }

    bsa = only(eas(benzene, "SO3H"))
    assert canon(u3.desulfonate(bsa)) == benzene
    ex["u3-sulfo"] = {
        "caption": "Sulfonation puts SO₃H on the ring. Hot dilute acid takes the SO₃H off and puts H back.",
        "panels": [
            named(benzene, "Benzene"), arrow("SO₃", "H₂SO₄"), focus(named(bsa, "Benzenesulfonic acid", hi=("S(=O)(=O)O",))),
            BREAK,
            named(bsa, "Benzenesulfonic acid"), arrow("H₃O⁺", "heat"), focus(named(canon(u3.desulfonate(bsa)), "Benzene")),
        ],
    }

    ex["u3-fc-acyl"] = {
        "caption": "The acylium ion cannot rearrange, so the three-carbon chain arrives straight, attached through its C=O carbon.",
        "panels": [
            named(benzene, "Benzene"), PLUS, named("CCC(=O)Cl", "Propanoyl chloride"), arrow("AlCl₃"),
            focus(named(only(eas(benzene, "EtCO")), "1-Phenylpropan-1-one", hi=("C=O",))),
        ],
    }

    frag, shift, degree = u3.fc_cation_carbon("CCCCl")
    assert (shift, degree) == ("hydride", "secondary"), (shift, degree)
    frag2, shift2, degree2 = u3.fc_cation_carbon("CC(C)(C)CCl")
    assert (shift2, degree2) == ("methyl", "tertiary"), (shift2, degree2)
    ex["u3-fc-alkyl"] = {
        "caption": "The primary cation takes a hydride from the next carbon and becomes secondary. With no H next door, a methyl shifts instead.",
        "panels": [
            named(benzene, "Benzene"), PLUS, named("CCCCl", "1-Chloropropane"), arrow("AlCl₃"),
            focus(named(canon(u3.fc_alkylation(benzene, "CCCCl")), "Isopropylbenzene", hi=("[CH1](C)C",))),
            BREAK,
            named(benzene, "Benzene"), PLUS, named("CC(C)(C)CCl", "1-Chloro-2,2-dimethylpropane"), arrow("AlCl₃"),
            focus(named(canon(u3.fc_alkylation(benzene, "CC(C)(C)CCl")), "(2-Methylbutan-2-yl)benzene", hi=("[CX4H0]-[#6;R]",))),
        ],
    }

    # STAGE B: directing effects and strategy.
    assert u3.one_class(anisole) == "donor"
    anis_br = eas(anisole, "Br")
    methylanisole = s("methylanisole")
    ex["u3-directing"] = {
        "caption": "When two groups disagree, the stronger activator decides. OMe beats CH₃, so Br goes ortho to the OMe.",
        "panels": [
            named(anisole, "Anisole"), arrow("Br₂", "FeBr₃"),
            focus(named(at(anisole, anis_br, "ortho"), "1-Bromo-2-methoxybenzene", hi=("Br",))), PLUS,
            focus(named(at(anisole, anis_br, "para"), "1-Bromo-4-methoxybenzene", hi=("Br",))),
            BREAK,
            named(methylanisole, "1-Methoxy-4-methylbenzene"), arrow("Br₂", "FeBr₃"),
            focus(named(only(eas(methylanisole, "Br")), "2-Bromo-1-methoxy-4-methylbenzene", hi=("Br",))),
        ],
    }

    tbt = s("tbutoluene")
    ex["u3-benzylic-ox"] = {
        "caption": "The CH₃ has benzylic H and becomes COOH. The tert-butyl carbon bonded to the ring has no H, so it survives.",
        "panels": [
            named(tbt, "1-tert-Butyl-4-methylbenzene"), arrow("1. KMnO₄, heat", "2. H₃O⁺"),
            focus(named(canon(u3.benzylic_oxidation(tbt)), "4-tert-Butylbenzoic acid", hi=("C(=O)[OH]",))),
        ],
    }

    benzoic = s("benzoic")
    ex["u3-birch"] = {
        "caption": "OMe is a donor, so its carbon stays on a C=C. COOH is a withdrawer, so its carbon goes sp³ and the C=C bonds sit away from it.",
        "panels": [
            named(anisole, "Anisole"), arrow("Na, NH₃(l)", "EtOH"), focus(named(canon(u3.birch(anisole)), "1-Methoxycyclohexa-1,4-diene", hi=("C=C",))),
            BREAK,
            named(benzoic, "Benzoic acid"), arrow("Na, NH₃(l)", "EtOH"),
            focus(named(canon(u3.birch(benzoic)), "Cyclohexa-2,5-diene-1-carboxylic acid", hi=("C=C",))),
        ],
    }

    # Blocking: SO3H takes the para seat (the map's own "Sulfonate para"), Br goes ortho, then the SO3H comes off.
    ptsa = at(toluene, eas(toluene, "SO3H"), "para")
    blocked_br = only(eas(ptsa, "Br"))
    ortho = canon(u3.desulfonate(blocked_br))
    assert ortho == canon("Cc1ccccc1Br")
    ex["u3-blocking"] = {
        "caption": "With para blocked, CH₃ sends Br ortho; removing SO₃H at the end gives the pure ortho product.",
        "panels": [
            named(toluene, "Toluene"), arrow("SO₃", "H₂SO₄"), named(ptsa, "4-Methylbenzenesulfonic acid", hi=("S(=O)(=O)O",)),
            BREAK,
            named(ptsa, "4-Methylbenzenesulfonic acid"), arrow("Br₂", "FeBr₃"), named(blocked_br, "3-Bromo-4-methylbenzenesulfonic acid", hi=("Br",)),
            BREAK,
            named(blocked_br, "3-Bromo-4-methylbenzenesulfonic acid"), arrow("H₃O⁺", "heat"), focus(named(ortho, "1-Bromo-2-methylbenzene", hi=("Br",))),
        ],
    }

    mnt, dnb = canon("Cc1cccc([N+](=O)[O-])c1"), canon("O=[N+]([O-])c1cccc([N+](=O)[O-])c1")
    ex["u3-nitro-red"] = {
        "caption": "Every NO₂ becomes NH₂ and nothing else on the ring changes.",
        "panels": [
            named(mnt, "1-Methyl-3-nitrobenzene"), arrow("1. Sn, HCl", "2. base"), focus(named(canon(u3.reduce_nitro(mnt)), "3-Methylaniline", hi=("[NH2]",))),
            BREAK,
            named(dnb, "1,3-Dinitrobenzene"), arrow("H₂", "Pd/C"), focus(named(canon(u3.reduce_nitro(dnb)), "Benzene-1,3-diamine", hi=("[NH2]",))),
        ],
    }

    aceto, propio = s("acetophenone"), s("propiophenone")
    ex["u3-c-to-ch2"] = {
        "caption": "Clemmensen reduction takes the C=O all the way to CH₂. Wolff-Kishner also ends at CH₂.",
        "panels": [
            named(aceto, "Acetophenone"), arrow("Zn(Hg), HCl"), focus(named(canon(u3.aldehyde_or_ketone_to_ch2(aceto)), "Ethylbenzene", hi=("[CH2]",))),
            BREAK,
            named(propio, "1-Phenylpropan-1-one"), arrow("H₂NNH₂, KOH", "heat"),
            focus(named(canon(u3.aldehyde_or_ketone_to_ch2(propio)), "Propylbenzene", hi=("[CH2]-[#6;R]",))),
        ],
    }

    nitrobenzene = only(eas(benzene, "NO2"))
    meta_target = only(eas(nitrobenzene, "Br"))
    para_target = at(bromobenzene, eas(bromobenzene, "NO2"), "para")
    assert u3.route_gives(benzene, ["nitrate", "brominate"], meta_target)
    assert not u3.route_gives(benzene, ["brominate", "nitrate"], meta_target)
    assert u3.route_gives(benzene, ["brominate", "nitrate"], para_target)
    ex["u3-sequencing"] = {
        "caption": "Put the group that directs where you need on first: nitrate then brominate for the meta product, brominate then nitrate for the para one.",
        "panels": [
            named(benzene, "Benzene"), arrow("1. HNO₃, H₂SO₄", "2. Br₂, FeBr₃"), focus(named(meta_target, "1-Bromo-3-nitrobenzene", hi=("Br",))),
            BREAK,
            named(benzene, "Benzene"), arrow("1. Br₂, FeBr₃", "2. HNO₃, H₂SO₄"), focus(named(para_target, "1-Bromo-4-nitrobenzene", hi=("[N+](=O)[O-]",))),
        ],
    }
    assert not u3.FAILURES, u3.FAILURES
    return ex


HEAD = header("Unit 3", "scripts/guide_u3.py", "test/guideU3.test.ts", "U3_GUIDE_EXAMPLES")

if __name__ == "__main__":
    sys.exit(run(build, "u3Guide.figures.ts", HEAD))
