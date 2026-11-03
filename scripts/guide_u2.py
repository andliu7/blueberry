"""
Unit 2 guidebook drawings, derived with RDKit.

    python scripts/guide_u2.py          writes src/game/guide/u2Guide.figures.ts
    python scripts/guide_u2.py --check  rebuilds it in memory and fails if the file on disk differs

WHAT THIS SCRIPT OWNS. The mini example drawn under each Unit 2 lesson in the
guidebook. Every structure is a species from scripts/u2_pools.py (its SPECIES
table, so the guide and the questions draw the same molecule), every pi count
and verdict printed under a drawing is that script's own Huckel counter run on
it (u2_pools.H), and every species the Unit 2 pool also draws is checked
against the pool's SMILES. Names are read back by OPSIN. A mismatch stops the
script and nothing is written.

WHAT IT DOES NOT OWN. The words: src/game/guide/u2Guide.ts, where every line
quotes a Unit 2 pool entry word for word (test/guideU2.test.ts holds that).
The drawing rules are Unit 1's (guide_u1.py, through guide_kit.py).

Every example is a draft (placeholder: true) until the owner signs it off.
"""
from __future__ import annotations

import sys

from rdkit import Chem

import u2_pools as u2
import u2_tools_pools as tools
from guide_kit import canon, focus, header, mol, named, pool_smiles, run, arrow

POOL = pool_smiles("u2")


def species(name: str) -> str:
    """A species' SMILES from the Unit 2 script, which must be in the pool too."""
    smiles = canon(u2.SPECIES[name][0])
    assert smiles in POOL, f"{name} ({smiles}) is not drawn anywhere in the Unit 2 pool"
    return smiles


def verdict(name: str) -> str:
    """'6 π, aromatic' or 'nonaromatic', from the Huckel counter, never typed."""
    r = u2.H(name)
    assert not u2.FAILURES, u2.FAILURES
    if r["pi"] is None:
        return "nonaromatic"
    return f"{r['pi']} π, {r['klass']}"


def deprotonate_ch2(smiles: str) -> str:
    """Take H+ off the ring's one sp3 CH2: that carbon keeps the pair, charge -1."""
    rw = Chem.RWMol(Chem.MolFromSmiles(smiles))
    ch2 = [a.GetIdx() for a in rw.GetAtoms() if a.GetSymbol() == "C" and a.GetTotalNumHs() == 2 and a.IsInRing()]
    assert len(ch2) == 1, smiles
    atom = rw.GetAtomWithIdx(ch2[0])
    atom.SetFormalCharge(-1)
    atom.SetNumExplicitHs(1)
    atom.SetNoImplicit(True)
    Chem.SanitizeMol(rw)
    return Chem.MolToSmiles(rw)


def xylene(pattern: str) -> str:
    """Dimethylbenzene with the two methyls `pattern` apart, checked by the
    Unit 2 script's own ring path rule (u2_pools.relation)."""
    smiles = {"ortho": "Cc1ccccc1C", "meta": "Cc1cccc(C)c1", "para": "Cc1ccc(C)cc1"}[pattern]
    assert u2.relation(smiles) == pattern, (smiles, u2.relation(smiles))
    return smiles


def where(r: dict) -> str:
    """Where the ring N's lone pair sits, in words, from the counter's tally."""
    home = list(r["home"].values())
    assert len(home) == 1, home
    return {"sp2": "sits out", "p": "joins in"}[home[0]]


# Compared structures each get their own row: side by side, their names ran
# into each other on a phone.
BREAK = {"kind": "break"}

# What each example colours.
SP3_CH2 = ("[CH2;R]",)
RING_N = ("[#7;R]",)


def build() -> dict:
    ex: dict[str, dict] = {}

    # STAGE A: the four tests.
    assert u2.H("benzene")["klass"] == "aromatic"
    assert u2.H("chd13")["gate"] == "porbital"
    ex["u2-huckel"] = {
        "caption": "Benzene passes all four tests with 6 π electrons. Cyclohexa-1,3-diene fails at its sp3 CH₂ carbons: no p orbital, so the loop breaks.",
        "panels": [
            focus(named(species("benzene"), "Benzene", verdict("benzene"))),
            BREAK,
            focus(named(species("chd13"), "Cyclohexa-1,3-diene", verdict("chd13"), hi=SP3_CH2)),
        ],
    }

    anion = deprotonate_ch2(species("cyclopentadiene"))
    assert anion == species("cp_anion"), anion
    assert u2.H("cyclopentadiene")["klass"] == "nonaromatic" and u2.H("cp_anion")["klass"] == "aromatic"
    ex["u2-charged"] = {
        "caption": "Take H⁺ off cyclopentadiene's CH₂ and that carbon's lone pair closes the loop: 6 π electrons, aromatic.",
        "panels": [
            named(species("cyclopentadiene"), "Cyclopentadiene", verdict("cyclopentadiene"), hi=SP3_CH2),
            arrow("base", "−H⁺"),
            focus(mol(anion, f"Anion: {verdict('cp_anion')}")),
        ],
    }

    assert u2.H("cyclobutadiene")["klass"] == "antiaromatic"
    assert u2.H("cot")["klass"] == "nonaromatic" and u2.H("cot")["gate"] == "planar"
    ex["u2-annulene"] = {
        "caption": "Cyclobutadiene is a flat square with 4 π electrons: antiaromatic. Cyclooctatetraene has 8 but folds into a tub, so it is nonaromatic.",
        "panels": [
            focus(named(species("cyclobutadiene"), "Cyclobutadiene", verdict("cyclobutadiene"))),
            BREAK,
            focus(named(species("cot"), "Cyclooctatetraene", f"{u2.H('cot')['pi']} π, a tub, nonaromatic")),
        ],
    }

    # STAGE B: heterocycles and the ring current.
    pyridine, pyrrole = u2.H("pyridine"), u2.H("pyrrole")
    assert pyridine["pi"] == pyrrole["pi"] == 6
    assert list(pyridine["home"].values()) == ["sp2"] and list(pyrrole["home"].values()) == ["p"]
    ex["u2-hetero"] = {
        "caption": "Pyridine's N is in a C=N bond, so its pair sits out in the plane. Pyrrole's N has no ring double bond, so its pair joins in. Both have 6 π electrons.",
        "panels": [
            focus(named(species("pyridine"), "Pyridine", f"pair {where(pyridine)}", hi=RING_N)),
            BREAK,
            focus(named(species("pyrrole"), "Pyrrole", f"pair {where(pyrrole)}", hi=RING_N)),
        ],
    }

    benzene_h, cot_h = u2.h_class("benzene", "all"), u2.h_class("cot", "all")
    assert (benzene_h, cot_h) == ("aromatic", "vinylic"), (benzene_h, cot_h)
    ppm = lambda cls: u2.SHIFT_RANGE[cls].replace("about ", "")  # noqa: E731
    ex["u2-nmr"] = {
        "caption": f"The ring current deshields benzene's H, about {ppm(benzene_h)}. Tub shaped cyclooctatetraene has none, so its H sit in the vinylic band, about {ppm(cot_h)}.",
        "panels": [
            focus(named(species("benzene"), "Benzene", f"H at {ppm(benzene_h)}")),
            BREAK,
            focus(named(species("cot"), "Cyclooctatetraene", f"H at {ppm(cot_h)}")),
        ],
    }

    # SIDE QUEST: naming benzene rings.
    ex["u2-nomen"] = {
        "caption": "Count the ring bonds between the two groups: one is ortho (1,2), two is meta (1,3), three is para (1,4).",
        "panels": [focus(named(xylene(p), f"{p[0]}-Xylene", hi=("[CH3]-[#6]",))) for p in ("ortho", "meta", "para")],
    }
    # TOOLS LESSONS (29 Oct 2026, scripts/u2_tools_pools.py). Every number below is that script's own derivation.
    acetic, chloro = "CC(=O)O", "OC(=O)CCl"
    d_cl = tools.halogen_distance(chloro)
    assert tools.ref(chloro) < tools.ref(acetic) and not tools.halogen_resonance_path(chloro)
    ex["u2-induction"] = {
        "caption": "Cl is more electronegative than carbon and pulls electron density along the sigma bonds. That steadies the carboxylate, so chloroacetic acid is the stronger acid.",
        "panels": [
            focus(named(acetic, "Acetic acid", "no Cl")),
            BREAK,
            focus(named(chloro, "Chloroacetic acid", f"Cl is {d_cl} bonds from the acid carbon, stronger", hi=("[Cl]",))),
        ],
    }

    ethanol = "CCO"
    pk = lambda smi: f"{tools.pka_of(smi):g}"  # noqa: E731
    assert tools.pka_of(acetic) < tools.pka_of(ethanol)
    ex["u2-keq-pka"] = {
        "caption": "The lower the pKa, the stronger the acid. An equilibrium rests on the side of the weaker acid, the one with the higher pKa.",
        "panels": [
            focus(named(acetic, "Acetic acid", f"pKa about {pk(acetic)}, stronger")),
            BREAK,
            focus(named(ethanol, "Ethanol", f"pKa about {pk(ethanol)}, weaker")),
        ],
    }

    ex["u2-energy"] = {
        "caption": "Cold with steps that cannot be undone, the lower hump wins. Warm with steps that can, the deeper well wins. A Keq between 10 to the minus 7 and 10 to the 7 means a step runs both ways.",
        "panels": [{"kind": "energy"}],
    }

    benz_len = tools.cc_lengths("c1ccccc1")
    assert max(benz_len) - min(benz_len) < 0.01
    cp = species("cp_anion")
    assert len(tools.charge_carriers(cp)) == 5
    ex["u2-resonance"] = {
        "caption": "Resonance forms differ only in where the pi electrons are drawn. The real benzene is one blend, so its six C-C bonds are equal, and the cyclopentadienyl anion spreads its charge over all five carbons.",
        "panels": [
            focus(named(species("benzene"), "Benzene", "six equal C-C bonds")),
            BREAK,
            focus(mol(cp, "Cyclopentadienyl anion: charge on all 5 C")),
        ],
    }

    anisole, nitro = "COc1ccccc1", "[O-][N+](=O)c1ccccc1"
    assert tools.substituent_kind(anisole) == "res_donor" and tools.substituent_kind(nitro) == "res_withdrawer"
    ex["u2-ewg-edg"] = {
        "caption": "A lone pair next to the ring donates into it by resonance. A group with a pi bond leading out of the ring withdraws by resonance. Donors speed an electrophile's attack and withdrawers slow it.",
        "panels": [
            focus(named(anisole, "Anisole", "donor, ring richer", hi=("[OX2]",))),
            BREAK,
            focus(mol(nitro, "Nitrobenzene: withdrawer, ring poorer")),
        ],
    }

    hba = "OC(=O)c1ccc(O)cc1"
    assert tools.principal(hba) == "carboxylic acid"
    ex["u2-nomen-priority"] = {
        "caption": "When a ring has an acid and an alcohol, the acid sets the suffix and the OH becomes the prefix hydroxy. Number the ring so the lowest locants go to the rest.",
        "panels": [focus(named(hba, "4-hydroxybenzoic acid", "acid first", hi=("[CX3](=O)[OX2H1]",)))],
    }
    return ex


HEAD = header("Unit 2", "scripts/guide_u2.py", "test/guideU2.test.ts", "U2_GUIDE_EXAMPLES")

if __name__ == "__main__":
    sys.exit(run(build, "u2Guide.figures.ts", HEAD))
