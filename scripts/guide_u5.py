"""
Unit 5 guidebook drawings, derived with RDKit.

    python scripts/guide_u5.py          writes src/game/guide/u5Guide.figures.ts
    python scripts/guide_u5.py --check  rebuilds it in memory and fails if the file on disk differs

WHAT THIS SCRIPT OWNS. The mini example drawn under each Unit 5 lesson in the
guidebook. Every starting material is a SMILES, mostly from scripts/u5_pools.py's
S table, and every product is made by that script's own rules: swap() and
sn1() for substitution, sn2_3d() for a backside attack placed in 3D, e1() and
zaitsev() for dehydration, oxidize(), tosylate(), o_alkylate(), silyl_off(),
markovnikov(), ether_cleave(), add_across() and open_epoxide(), diol_cleave(),
pinacol() and s_oxidize(). So the guide and the questions follow one rule.
Where the pool carries stereochemistry the drawing has wedges, and Unit 1's
mol() reads each wedge drawing back with RDKit before it is written. Every
name, R and S included, is read back by OPSIN as the drawing. A failed check
stops the script and nothing is written.

A fused epoxide carbon has no bond outside its rings to wedge, so cyclohexene
oxide is drawn flat: a three-membered ring on a six-membered one can only be
cis-fused, which is how the textbook draws it too.

WHAT IT DOES NOT OWN. The words: src/game/guide/u5Guide.ts, where every line
quotes a Unit 5 pool entry word for word (test/guideU5.test.ts holds that).
The drawing rules are Unit 1's (guide_u1.py, through guide_kit.py).

Every example is a draft (placeholder: true) until the owner signs it off.
"""
from __future__ import annotations

import sys

import u5_pools as u5
from guide_kit import PLUS, arrow, canon, focus, header, named, only, run

BREAK = {"kind": "break"}
S = u5.S


def oh(smiles: str) -> tuple[int, int]:
    return u5.the_oh(smiles)


def build() -> dict:
    ex: dict[str, dict] = {}

    # STAGE A: alcohols.
    r2 = S["r2butanol"]
    inverted = canon(u5.sn2_3d(r2, *oh(r2), "Br"))
    m3 = S["3mb2ol"]
    hbr = canon(u5.sn1(m3, *oh(m3), "Br"))
    ex["u5-roh-rx"] = {
        "caption": "PBr₃ never makes a cation: bromide attacks from behind, so R becomes S. HBr goes through a cation, which shifts once to become tertiary.",
        "panels": [
            named(r2, "(R)-Butan-2-ol"), arrow("PBr₃"), focus(named(inverted, "(S)-2-Bromobutane", hi=("Br",))),
            BREAK,
            named(canon(m3), "3-Methylbutan-2-ol"), arrow("HBr"), focus(named(hbr, "2-Bromo-2-methylbutane", hi=("Br",))),
        ],
    }

    ex["u5-appel"] = {
        "caption": "No cation forms in the Appel, so nothing can shift. Br takes the place of the activated oxygen on C2.",
        "panels": [named(canon(m3), "3-Methylbutan-2-ol"), arrow("CBr₄", "PPh₃"), focus(named(canon(u5.swap(m3, *oh(m3), "Br")), "2-Bromo-3-methylbutane", hi=("Br",)))],
    }

    ots = canon(u5.tosylate(r2))
    c, o = u5.tosylate_atoms(ots)
    nitrile = canon(u5.sn2_3d(ots, c, o, "C#N"))
    ex["u5-tosylate"] = {
        "caption": "Only the O-H bond reacts, so the tosylate keeps R. Cyanide then attacks from behind: SN2 with inversion.",
        "panels": [
            named(r2, "(R)-Butan-2-ol"), arrow("TsCl", "pyridine"),
            focus(named(ots, "(R)-Butan-2-yl 4-methylbenzenesulfonate", label="(R)-Butan-2-yl tosylate", hi=("[CX4]O[SX4]",))),
            BREAK,
            named(ots, "(R)-Butan-2-yl 4-methylbenzenesulfonate", label="(R)-Butan-2-yl tosylate"), arrow("NaCN", "DMSO"),
            focus(named(nitrile, "(S)-2-Methylbutanenitrile", hi=("C#N",))),
        ],
    }

    dm = S["33dmb2ol"]
    acid_ene = u5.zaitsev(u5.e1(dm, *oh(dm)))
    pocl3_ene = only(u5.e1(dm, *oh(dm), allow_shift=False))
    ex["u5-dehydration"] = {
        "caption": "In hot acid the cation shifts a methyl, then the most substituted C=C forms. POCl₃ in pyridine makes no cation, so nothing shifts.",
        "panels": [
            named(canon(dm), "3,3-Dimethylbutan-2-ol"), arrow("H₂SO₄", "heat"), focus(named(canon(acid_ene), "2,3-Dimethylbut-2-ene", hi=("C=C",))),
            BREAK,
            named(canon(dm), "3,3-Dimethylbutan-2-ol"), arrow("POCl₃", "pyridine"), focus(named(canon(pocl3_ene), "3,3-Dimethylbut-1-ene", hi=("C=C",))),
        ],
    }

    pinacol = "CC(C)(O)C(C)(C)O"
    pinacolone, moved, _ = u5.pinacol(pinacol)
    assert moved == "C"
    ex["u5-pinacol"] = {
        "caption": "One OH leaves as water, a methyl shifts to the cation, and the other C-OH becomes C=O.",
        "panels": [named(pinacol, "2,3-Dimethylbutane-2,3-diol"), arrow("H₂SO₄", "heat"), focus(named(canon(pinacolone), "3,3-Dimethylbutan-2-one", hi=("C=O",)))],
    }

    pr = S["propanol"]
    ex["u5-oxidation"] = {
        "caption": "PCC takes a primary alcohol one level, to the aldehyde. Jones has water, so it goes on to the acid.",
        "panels": [
            named(pr, "Propan-1-ol"), arrow("PCC", "CH₂Cl₂"), focus(named(canon(only(u5.oxidize(pr, strong=False))), "Propanal", hi=("C=O",))),
            BREAK,
            named(pr, "Propan-1-ol"), arrow("CrO₃, H₂SO₄", "water"), focus(named(canon(only(u5.oxidize(pr, strong=True))), "Propanoic acid", hi=("C(=O)O",))),
        ],
    }

    pent = S["pentanol"]
    ex["u5-swern"] = {
        "caption": "Swern is dry and mild, so a primary alcohol stops at the aldehyde.",
        "panels": [named(pent, "Pentan-1-ol"), arrow("(COCl)₂, DMSO", "then Et₃N"), focus(named(canon(only(u5.oxidize(pent, strong=False))), "Pentanal", hi=("C=O",)))],
    }

    bromo = "CCCCBr"
    sulfide = "CCSCC"
    ex["u5-thiols"] = {
        "caption": "HS⁻ is a strong nucleophile: Br out, SH in. One equivalent of oxidant adds one S=O.",
        "panels": [
            named(bromo, "1-Bromobutane"), arrow("NaSH"), focus(named(canon(u5.swap(bromo, 3, 4, "S")), "Butane-1-thiol", hi=("[SH]",))),
            BREAK,
            named(sulfide, "Diethyl sulfide"), arrow("H₂O₂", "1 equiv"), focus(named(canon(u5.s_oxidize(sulfide, 1)), "Diethyl sulfoxide", hi=("S=O",))),
        ],
    }
    assert u5.s_level(u5.s_oxidize(sulfide, 1)) == 1

    # STAGE B: ethers.
    tbuo = "CC(C)(C)[O-]"
    assert u5.williamson_ok(tbuo, "CI") and not u5.williamson_ok("C[O-]", "CC(C)(C)Br")
    ether = canon(u5.swap("CI", 0, 1, "OC(C)(C)C"))
    methoxy = canon(u5.o_alkylate(r2, "C"))
    ex["u5-williamson"] = {
        "caption": "The bulky part rides on the alkoxide and the halide carbon is a methyl. The stereocentre's C-O bond is never broken, so R stays R.",
        "panels": [
            named(tbuo, "2-Methylpropan-2-olate"), PLUS, named("CI", "Iodomethane"), arrow("SN2"),
            focus(named(ether, "2-Methoxy-2-methylpropane", hi=("[CH3]O",))),
            BREAK,
            named(r2, "(R)-Butan-2-ol"), arrow("1. NaH", "2. CH₃I"), focus(named(methoxy, "(R)-2-Methoxybutane", hi=("[CH3]O",))),
        ],
    }

    alkene = "C=CC(C)(C)C"
    ex["u5-alkoxymerc"] = {
        "caption": "Mercury bridges the two alkene carbons, so no methyl can shift. Acid makes a free cation, and a methyl does shift.",
        "panels": [
            named(alkene, "3,3-Dimethylbut-1-ene"), arrow("1. Hg(OAc)₂, CH₃OH", "2. NaBH₄"),
            focus(named(canon(u5.markovnikov(alkene, "OC", allow_shift=False)), "2-Methoxy-3,3-dimethylbutane", hi=("[CH3]O",))),
            BREAK,
            named(alkene, "3,3-Dimethylbut-1-ene"), arrow("CH₃OH", "H₂SO₄"),
            focus(named(canon(u5.markovnikov(alkene, "OC", allow_shift=True)), "2-Methoxy-2,3-dimethylbutane", hi=("[CH3]O",))),
        ],
    }

    anisole, mtbe = "COc1ccccc1", "COC(C)(C)C"
    phenol, mei = sorted(u5.ether_cleave(anisole, "I", excess=True), key=lambda x: "c" not in x)
    assert canon(mei) == canon("CI"), mei
    tbui, meoh = sorted(u5.ether_cleave(mtbe, "I", excess=False), key=lambda x: len(x), reverse=True)
    assert canon(meoh) == canon("CO"), meoh
    ex["u5-cleavage"] = {
        "caption": "Iodide attacks the CH₃ carbon, so the O stays on the ring. A tertiary carbon cleaves by cation: SN1.",
        "panels": [
            named(anisole, "Methoxybenzene"), arrow("HI", "excess, heat"),
            focus(named(canon(phenol), "Phenol", hi=("[OH]",))), PLUS, focus(named(canon(mei), "Iodomethane", hi=("I",))),
            BREAK,
            named(mtbe, "2-Methoxy-2-methylpropane"), arrow("HI", "1 equiv"),
            focus(named(canon(tbui), "2-Iodo-2-methylpropane", hi=("I",))), PLUS, focus(named(canon(meoh), "Methanol")),
        ],
    }

    bu = S["butanol"]
    tbs = canon(u5.o_alkylate(bu, u5.TBS))
    assert canon(u5.silyl_off(tbs)) == canon(bu)
    ex["u5-protecting"] = {
        "caption": "The alcohol's O bonds to silicon: the OH is masked. Fluoride attacks silicon and the alcohol comes back unchanged.",
        "panels": [
            named(bu, "Butan-1-ol"), arrow("TBSCl", "imidazole"), focus(named(tbs, "tert-Butyl(butoxy)dimethylsilane", label="TBS ether", hi=("O[Si]",))),
            BREAK,
            named(tbs, "tert-Butyl(butoxy)dimethylsilane", label="TBS ether"), arrow("TBAF"), focus(named(canon(u5.silyl_off(tbs)), "Butan-1-ol", hi=("[OH]",))),
        ],
    }

    # STAGE C: epoxides and diols.
    z_ep = only(u5.add_across(S["zbut"], "epoxide"))
    assert u5.describe_set([z_ep]) == "meso"
    chox = only(u5.add_across(S["cyhexene"], "epoxide"))
    ex["u5-epoxidation"] = {
        "caption": "Both C-O bonds form at once on the same face, so the two methyls that were cis stay cis.",
        "panels": [
            named(canon(S["zbut"]), "(Z)-But-2-ene"), arrow("mCPBA"),
            focus(named(canon(z_ep), "(2R,3S)-2,3-Dimethyloxirane", label="cis-2,3-Dimethyloxirane", hi=("C1OC1",))),
            BREAK,
            named(S["cyhexene"], "Cyclohexene"), arrow("mCPBA"), focus(named(u5.flat(chox), "7-Oxabicyclo[4.1.0]heptane", label="Cyclohexene oxide", hi=("C1OC1",))),
        ],
    }

    dmox = S["dmox"]
    acid_open = only(u5.open_epoxide(dmox, True, "OC"))
    trans_set = u5.open_epoxide(chox, True, "O")
    assert u5.describe_set(trans_set) == "enantiomers"
    ex["u5-ep-acid"] = {
        "caption": "Under acid, methanol attacks the tertiary carbon. Water attacks from the back, so the two OH end up trans.",
        "panels": [
            named(canon(dmox), "2,2-Dimethyloxirane"), arrow("CH₃OH", "H₂SO₄"), focus(named(canon(acid_open), "2-Methoxy-2-methylpropan-1-ol", hi=("[CH3]O",))),
            BREAK,
            named(u5.flat(chox), "7-Oxabicyclo[4.1.0]heptane", label="Cyclohexene oxide"), arrow("H₃O⁺"),
            focus(named(trans_set[0], u5.cip_name(trans_set[0], "cyclohexane-1,2-diol"), label="trans-Cyclohexane-1,2-diol", hi=("[OH]",))),
        ],
    }

    base_open = only(u5.open_epoxide(dmox, False, "OC"))
    rpox = S["rpox"]
    kept = only(u5.open_epoxide(rpox, False, "OC", racemic=False))
    ex["u5-ep-base"] = {
        "caption": "Methoxide attacks by SN2 at the less crowded CH₂. That carbon is not a stereocentre, so the stereocentre keeps its arrangement.",
        "panels": [
            named(canon(dmox), "2,2-Dimethyloxirane"), arrow("NaOCH₃", "CH₃OH"), focus(named(canon(base_open), "1-Methoxy-2-methylpropan-2-ol", hi=("[CH3]O",))),
            BREAK,
            named(canon(rpox), "(R)-2-Methyloxirane"), arrow("NaOCH₃", "CH₃OH"), focus(named(canon(kept), "(R)-1-Methoxypropan-2-ol", hi=("[CH3]O",))),
        ],
    }

    z_syn = only(u5.add_across(S["zbut"], "syn"))
    assert u5.describe_set([z_syn]) == "meso"
    cis_diol = only(u5.add_across(S["cyhexene"], "syn"))
    ex["u5-syn-diol"] = {
        "caption": "OsO₄ adds both oxygens from one face. On a cis alkene that gives meso; on a ring, both OH on the same face.",
        "panels": [
            named(canon(S["zbut"]), "(Z)-But-2-ene"), arrow("1. OsO₄", "2. NMO"),
            focus(named(canon(z_syn), "(2R,3S)-Butane-2,3-diol", label="meso-Butane-2,3-diol", hi=("[OH]",))),
            BREAK,
            named(S["cyhexene"], "Cyclohexene"), arrow("1. OsO₄", "2. NMO"),
            focus(named(canon(cis_diol), u5.cip_name(cis_diol, "cyclohexane-1,2-diol"), label="cis-Cyclohexane-1,2-diol", hi=("[OH]",))),
        ],
    }

    butanediol, ring_diol = "CC(O)C(C)O", "CC1(O)CCCCC1O"
    ethanal = set(u5.diol_cleave(butanediol))
    assert ethanal == {canon("CC=O")}, ethanal
    ex["u5-diol-cleave"] = {
        "caption": "HIO₄ cuts the C-C bond between the two OH carbons. In a ring the chain opens: C1, with its methyl, becomes a ketone and C2 an aldehyde.",
        "panels": [
            named(butanediol, "Butane-2,3-diol"), arrow("HIO₄"), focus(named(canon("CC=O"), "Ethanal", "two of them", hi=("C=O",))),
            BREAK,
            named(ring_diol, "1-Methylcyclohexane-1,2-diol"), arrow("HIO₄"), focus(named(canon(only(u5.diol_cleave(ring_diol))), "6-Oxoheptanal", hi=("C=O",))),
        ],
    }

    e_anti = u5.add_across(S["ebut"], "anti")
    assert u5.describe_set(e_anti) == "meso" and e_anti == u5.open_epoxide(u5.add_across(S["ebut"], "epoxide")[0], True, "O")
    z_anti = u5.add_across(S["zbut"], "anti")
    assert u5.describe_set(z_anti) == "enantiomers"
    rr, ss = sorted(z_anti, key=lambda x: u5.cip_name(x, "butane-2,3-diol", ("2", "3")) != "(2R,3R)-butane-2,3-diol")
    ex["u5-anti-diol"] = {
        "caption": "Epoxide then acid adds the two OH anti. A trans alkene gives meso; a cis alkene gives the pair of enantiomers.",
        "panels": [
            named(canon(S["ebut"]), "(E)-But-2-ene"), arrow("1. mCPBA", "2. H₃O⁺"),
            focus(named(only(e_anti), "(2R,3S)-Butane-2,3-diol", label="meso-Butane-2,3-diol", hi=("[OH]",))),
            BREAK,
            named(canon(S["zbut"]), "(Z)-But-2-ene"), arrow("1. mCPBA", "2. H₃O⁺"),
            focus(named(rr, "(2R,3R)-Butane-2,3-diol", label="(2R,3R)", hi=("[OH]",))), PLUS,
            focus(named(ss, "(2S,3S)-Butane-2,3-diol", label="(2S,3S)", hi=("[OH]",))),
        ],
    }
    assert not u5.FAILURES, u5.FAILURES
    return ex


HEAD = header("Unit 5", "scripts/guide_u5.py", "test/guideU5.test.ts", "U5_GUIDE_EXAMPLES")

if __name__ == "__main__":
    sys.exit(run(build, "u5Guide.figures.ts", HEAD))
