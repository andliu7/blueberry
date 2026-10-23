"""
Unit 6 guidebook drawings, derived with RDKit.

    python scripts/guide_u6.py          writes src/game/guide/u6Guide.figures.ts
    python scripts/guide_u6.py --check  rebuilds it in memory and fails if the file on disk differs

WHAT THIS SCRIPT OWNS. The mini example drawn under each Unit 6 lesson in the
guidebook. Unit 6 is spectroscopy, so the examples are molecules with a
number under each: degrees of unsaturation, signal counts, integration,
splitting, DEPT, the molecular ion and its isotope peaks, COSY and HSQC
counts, conjugated pi bonds. Every number is computed by scripts/u6_pools.py's
own functions (dou, h_signals, c_signals, ratio, split, quaternary_classes,
two_tallest, m2_pattern, m_plus, cosy_pairs, hsqc_peaks, conjugated_pi), the
same ones that key the Unit 6 questions. No number is typed by hand. Every
name is read back by OPSIN. A failed check stops the script and nothing is
written.

WHAT IT DOES NOT OWN. The words: src/game/guide/u6Guide.ts, where every line
quotes a Unit 6 pool entry word for word (test/guideU6.test.ts holds that).
The drawing rules are Unit 1's (guide_u1.py, through guide_kit.py).

Every example is a draft (placeholder: true) until the owner signs it off.
"""
from __future__ import annotations

import sys

from rdkit import Chem

import u6_pools as u6
from guide_kit import canon, focus, header, named, run

BREAK = {"kind": "break"}


def count(n: int, one: str, many: str) -> str:
    """'1 signal' or '3 signals'."""
    return f"{n} {one if n == 1 else many}"


def carbon(smiles: str, smarts: str) -> int:
    """The one atom index the first atom of `smarts` matches."""
    hits = {m[0] for m in u6.mol(smiles).GetSubstructMatches(Chem.MolFromSmarts(smarts))}
    assert len(hits) == 1, (smiles, smarts, hits)
    return hits.pop()


def build() -> dict:
    ex: dict[str, dict] = {}

    # STAGE A: reading a formula and an NMR spectrum.
    dou_rows = [("CCc1ccccc1", "Ethylbenzene"), ("CC(C)=O", "Propan-2-one"), ("C1CCCCC1", "Cyclohexane")]
    panels = []
    for smiles, name in dou_rows:
        n = u6.dou(smiles)
        panels += [focus(named(canon(smiles), name, f"{u6.pretty(smiles)}, {count(n, 'degree', 'degrees')}")), BREAK]
    ex["u6-dou"] = {
        "caption": "Each ring and each pi bond is one degree. A benzene ring holds four; a C=O or a ring alone is one.",
        "panels": panels[:-1],
    }

    two_butanone, three_pentanone, chloro = "CCC(C)=O", "CCC(=O)CC", "CC(C)Cl"
    ch = carbon(chloro, "[CH1]Cl")
    ex["u6-hnmr"] = {
        "caption": "Butan-2-one has three sets of H. Pentan-3-one's two ethyl groups are one environment, so it has two.",
        "panels": [
            focus(named(two_butanone, "Butan-2-one", count(u6.h_signals(two_butanone), "signal", "signals"))),
            BREAK,
            focus(named(three_pentanone, "Pentan-3-one", count(u6.h_signals(three_pentanone), "signal", "signals"))),
            BREAK,
            focus(named(chloro, "2-Chloropropane", f"CH is a {u6.split(chloro, ch).lower()}", hi=("[CH1]Cl",))),
            BREAK,
            focus(named("COC(C)(C)C", "2-Methoxy-2-methylpropane", f"ratio {u6.ratio('COC(C)(C)C')}", hi=("[CH3]O",))),
        ],
    }

    xylenes = [("Cc1ccccc1C", "1,2-Dimethylbenzene"), ("Cc1cccc(C)c1", "1,3-Dimethylbenzene"), ("Cc1ccc(C)cc1", "1,4-Dimethylbenzene")]
    assert len({u6.formula(s) for s, _ in xylenes}) == 1
    panels = []
    for smiles, name in xylenes:
        panels += [focus(named(canon(smiles), name, f"{u6.c_signals(smiles)} ¹³C signals")), BREAK]
    tbb = "CC(C)(C)c1ccccc1"
    panels.append(focus(named(tbb, "tert-Butylbenzene", f"{u6.quaternary_classes(tbb)} vanish in DEPT-135", hi=("[CX4H0]-[#6;R]",))))
    ex["u6-cnmr"] = {
        "caption": "One formula, three isomers, different ¹³C counts: symmetry tells them apart. Carbons with no H vanish in DEPT-135.",
        "panels": panels,
    }

    bromomethane, chloroethane, amine = "CBr", "CCCl", "CCCN"
    assert u6.m_plus(amine) % 2 == 1
    ex["u6-ms"] = {
        "caption": "One Br gives two molecular ion peaks two units apart, nearly the same height. One Cl gives an M+2 about a third of M. One N makes M odd.",
        "panels": [
            focus(named(bromomethane, "Bromomethane", u6.two_tallest(bromomethane), hi=("Br",))),
            BREAK,
            focus(named(chloroethane, "Chloroethane", u6.m2_pattern(chloroethane), hi=("Cl",))),
            BREAK,
            focus(named(amine, "Propan-1-amine", f"M⁺ at m/z {u6.m_plus(amine)}", hi=("N",))),
        ],
    }

    # STAGE B (side quests): 2D NMR and UV.
    chloropropane = "CCCCl"
    ex["u6-2d"] = {
        "caption": "COSY pairs H on bonded carbons. HSQC links each H to the carbon it sits on, so the C=O carbon has no peak.",
        "panels": [
            focus(named(chloropropane, "1-Chloropropane", count(u6.cosy_pairs(chloropropane), "COSY pair", "COSY pairs"))),
            BREAK,
            focus(named(two_butanone, "Butan-2-one", count(u6.hsqc_peaks(two_butanone), "HSQC peak", "HSQC peaks"), hi=("C=O",))),
        ],
    }

    def conj(smiles: str) -> str:
        n = u6.conjugated_pi(smiles)
        return "isolated" if n == 1 else f"{n} π conjugated"

    uv_rows = [("C=CCC=C", "Penta-1,4-diene"), ("C=CC=CC", "Penta-1,3-diene"), ("C=CC=CC=C", "Hexa-1,3,5-triene")]
    panels = []
    for smiles, name in uv_rows:
        panels += [focus(named(canon(smiles), name, conj(smiles), hi=("C=C",))), BREAK]
    ex["u6-uv"] = {
        "caption": "A single bond between two C=C conjugates them; a CH₂ isolates them. More conjugated pi bonds, longer wavelength.",
        "panels": panels[:-1],
    }
    assert not u6.FAILURES, u6.FAILURES
    return ex


HEAD = header("Unit 6", "scripts/guide_u6.py", "test/guideU6.test.ts", "U6_GUIDE_EXAMPLES")

if __name__ == "__main__":
    sys.exit(run(build, "u6Guide.figures.ts", HEAD))
