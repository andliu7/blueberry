"""Unit 1 say-why: rebuild the route each allowlisted mix-up takes, with RDKit.

src/game/content/u1/sayWhyMixups.ts lists, for each rule step, the wrong
reasons it offers, and says which wrong option each one leads to. This script
is the check behind those comments (criterion 1: a believer picks a WRONG
answer on this question). Each HX and X2 route is built as a molecule (E on
one diene carbon, Nu on another, the pi bond left between the other two) and
matched to the option's name with OPSIN. Each Diels-Alder route is built both
ways round and the ring relation between the two groups is read off the
product. Run from the repo root: python scripts/u1_saywhy_routes.py
Exit 1 if any route does not land on its named option.
"""
import os, sys, tempfile
from rdkit import Chem
from rdkit.Chem import RWMol


def canon(s):
    return Chem.MolToSmiles(Chem.MolFromSmiles(s))


def opsin(names):
    from py2opsin import py2opsin
    here = os.getcwd()
    os.chdir(tempfile.mkdtemp())
    try:
        got = py2opsin(names)
    finally:
        os.chdir(here)
    got = got if isinstance(got, list) else [got]
    return [canon(g) if g else "" for g in got]


def mapped(smiles):
    m = Chem.MolFromSmiles(smiles)
    return {a.GetAtomMapNum(): a.GetIdx() for a in m.GetAtoms() if a.GetAtomMapNum()}, m


def clean(rw):
    out = rw.GetMol()
    for at in out.GetAtoms():
        at.SetAtomMapNum(0)
        at.SetNoImplicit(False)
        at.SetNumExplicitHs(0)
    Chem.SanitizeMol(out)
    return Chem.MolToSmiles(out)


def add(diene, e, nu, a, b, both=False):
    """E on diene carbon a, Nu on b (map numbers 1-4); the pi bond left is the one between the other two carbons."""
    idx, m = mapped(diene)
    rw = RWMol(m)
    for i in (1, 2, 3):
        rw.GetBondBetweenAtoms(idx[i], idx[i + 1]).SetBondType(Chem.BondType.SINGLE)
    if both:
        for c in (1, 2, 3, 4):
            n = rw.AddAtom(Chem.Atom(e))
            rw.AddBond(idx[c], n, Chem.BondType.SINGLE)
    else:
        for c, el in ((a, e), (b, nu)):
            if el != "H":
                n = rw.AddAtom(Chem.Atom(el))
                rw.AddBond(idx[c], n, Chem.BondType.SINGLE)
        rest = [c for c in (1, 2, 3, 4) if c not in (a, b)]
        assert abs(rest[0] - rest[1]) == 1, (a, b)
        rw.GetBondBetweenAtoms(idx[rest[0]], idx[rest[1]]).SetBondType(Chem.BondType.DOUBLE)
    return clean(rw)


def da(diene, phile, c1_to):
    """Diene map 1-4, dienophile map 5 (CH2 end) and 6 (carbon carrying the group). Diene C1 bonds to c1_to."""
    m = Chem.CombineMols(Chem.MolFromSmiles(diene), Chem.MolFromSmiles(phile))
    idx = {a.GetAtomMapNum(): a.GetIdx() for a in m.GetAtoms() if a.GetAtomMapNum()}
    rw = RWMol(m)
    for i, j, t in ((1, 2, 1), (2, 3, 2), (3, 4, 1), (5, 6, 1)):
        rw.GetBondBetweenAtoms(idx[i], idx[j]).SetBondType(Chem.BondType.DOUBLE if t == 2 else Chem.BondType.SINGLE)
    other = 6 if c1_to == 5 else 5
    rw.AddBond(idx[1], idx[c1_to], Chem.BondType.SINGLE)
    rw.AddBond(idx[4], idx[other], Chem.BondType.SINGLE)
    for at in rw.GetAtoms():
        at.SetAtomMapNum(0)
    out = rw.GetMol()
    Chem.SanitizeMol(out)
    return Chem.MolToSmiles(out)


def relation(product, sub_a, sub_b):
    """Ring relation (1,2 / 1,3 / 1,4) between the ring atoms that match two SMARTS."""
    m = Chem.MolFromSmiles(product)
    ring = [r for r in m.GetRingInfo().AtomRings() if len(r) == 6][0]

    def anchor(smarts):
        for match in m.GetSubstructMatches(Chem.MolFromSmarts(smarts)):
            if match[0] in ring:
                return match[0]
        raise ValueError(smarts)

    i, j = anchor(sub_a), anchor(sub_b)
    return f"1,{len(Chem.GetShortestPath(m, i, j))}"


BD = "[CH2:1]=[CH:2][CH:3]=[CH2:4]"
DMB = "[CH2:1]=[C:2](C)[C:3](C)=[CH2:4]"
ISO = "[CH2:1]=[C:2](C)[CH:3]=[CH2:4]"
MP2 = "[CH2:1]=[C:2](C)[CH:3]=[CH:4]C"  # 2-methylpenta-1,3-diene
MP4 = "[CH2:1]=[CH:2][CH:3]=[C:4](C)C"  # 4-methylpenta-1,3-diene

checks = [
    ("u1-hx-label-thermo", "kvt-thermo-is-fast: the 1,2 (kinetic)", add(MP2, "H", "Cl", 1, 2), "4-chloro-4-methylpent-2-ene"),
    ("u1-hx-label-thermo", "add-x-on-subst: Cl on the 3 deg C2", add(MP2, "H", "Cl", 1, 2), "4-chloro-4-methylpent-2-ene"),
    ("u1-hx-label-thermo", "RIGHT: the 1,4", add(MP2, "H", "Cl", 1, 4), "4-chloro-2-methylpent-2-ene"),
    ("u1-hx-dmb-warm", "add-x-on-subst: Br on the 3 deg C2", add(DMB, "H", "Br", 1, 2), "3-bromo-2,3-dimethylbut-1-ene"),
    ("u1-hx-dmb-warm", "add-inner-proton: H+ C2, Br C1", add(DMB, "H", "Br", 2, 1), "4-bromo-2,3-dimethylbut-1-ene"),
    ("u1-hx-dmb-warm", "RIGHT", add(DMB, "H", "Br", 1, 4), "1-bromo-2,3-dimethylbut-2-ene"),
    ("u1-qb-mp2-warm", "add-x-on-subst: Br on the 3 deg C2", add(MP2, "H", "Br", 1, 2), "4-bromo-4-methylpent-2-ene"),
    ("u1-qb-mp2-warm", "kvt-thermo-is-fast: the 1,2 (kinetic)", add(MP2, "H", "Br", 1, 2), "4-bromo-4-methylpent-2-ene"),
    ("u1-qb-mp2-warm", "RIGHT", add(MP2, "H", "Br", 1, 4), "4-bromo-2-methylpent-2-ene"),
    ("u1-hx-mp4-warm", "RIGHT: the 1,2", add(MP4, "H", "Br", 1, 2), "4-bromo-2-methylpent-2-ene"),
    ("u1-hx-mp4-warm", "add-x-on-subst: the 1,4, Br on 3 deg", add(MP4, "H", "Br", 1, 4), "4-bromo-4-methylpent-2-ene"),
    ("u1-hx-mp4-warm", "hx-less-subst-cation: H+ C4, Br C3", add(MP4, "H", "Br", 4, 3), "3-bromo-4-methylpent-1-ene"),
    ("u1-hx-mp4-warm", "hx-less-subst-cation: H+ C4, Br C1", add(MP4, "H", "Br", 4, 1), "1-bromo-4-methylpent-2-ene"),
    ("u1-hx-dmb-cold", "RIGHT: the 1,2", add(DMB, "H", "Br", 1, 2), "3-bromo-2,3-dimethylbut-1-ene"),
    ("u1-hx-dmb-cold", "add-inner-proton: H+ C2, Br C1", add(DMB, "H", "Br", 2, 1), "4-bromo-2,3-dimethylbut-1-ene"),
    ("u1-hx-dmb-cold", "kvt-stable-is-fast: the 1,4", add(DMB, "H", "Br", 1, 4), "1-bromo-2,3-dimethylbut-2-ene"),
    ("u1-x2-warm-br", "x2-equiv-both", add(BD, "Br", "Br", 0, 0, both=True), "1,2,3,4-tetrabromobutane"),
    ("u1-x2-warm-br", "x2-halonium-closed: the 1,2", add(BD, "Br", "Br", 1, 2), "3,4-dibromobut-1-ene"),
    ("u1-x2-warm-br", "RIGHT", add(BD, "Br", "Br", 1, 4), "1,4-dibromobut-2-ene"),
    ("u1-x2-dmb-warm", "x2-equiv-both", add(DMB, "Cl", "Cl", 0, 0, both=True), "1,2,3,4-tetrachloro-2,3-dimethylbutane"),
    ("u1-x2-dmb-warm", "x2-halonium-closed: the 1,2", add(DMB, "Cl", "Cl", 1, 2), "3,4-dichloro-2,3-dimethylbut-1-ene"),
    ("u1-x2-dmb-warm", "RIGHT", add(DMB, "Cl", "Cl", 1, 4), "1,4-dichloro-2,3-dimethylbut-2-ene"),
    ("u1-x2-isoprene-warm", "x2-halonium-closed: 1,2 at C3=C4", add(ISO, "Br", "Br", 4, 3), "3,4-dibromo-2-methylbut-1-ene"),
    ("u1-x2-isoprene-warm", "add-x-on-subst: 1,2 at C1=C2, Br on 3 deg", add(ISO, "Br", "Br", 1, 2), "3,4-dibromo-3-methylbut-1-ene"),
    ("u1-x2-isoprene-warm", "RIGHT", add(ISO, "Br", "Br", 1, 4), "1,4-dibromo-2-methylbut-2-ene"),
    ("u1-qb-isoprene-cl2", "x2-halonium-closed: 1,2 at C3=C4", add(ISO, "Cl", "Cl", 4, 3), "3,4-dichloro-2-methylbut-1-ene"),
    ("u1-qb-isoprene-cl2", "add-x-on-subst: Cl on the 3 deg C2", add(ISO, "Cl", "Cl", 1, 2), "3,4-dichloro-3-methylbut-1-ene"),
    ("u1-qb-isoprene-cl2", "RIGHT", add(ISO, "Cl", "Cl", 1, 4), "1,4-dichloro-2-methylbut-2-ene"),
    ("u1-x2-draw-warm", "RIGHT", add(BD, "Br", "Br", 1, 4), "1,4-dibromobut-2-ene"),
    ("u1-x2-draw-warm", "x2-halonium-closed", add(BD, "Br", "Br", 1, 2), "3,4-dibromobut-1-ene"),
    ("u1-x2-draw-warm", "x2-equiv-both", add(BD, "Br", "Br", 0, 0, both=True), "1,2,3,4-tetrabromobutane"),
    ("u1-x2-dmb-cold", "RIGHT: the 1,2", add(DMB, "Br", "Br", 1, 2), "3,4-dibromo-2,3-dimethylbut-1-ene"),
    ("u1-x2-dmb-cold", "x2-equiv-both", add(DMB, "Br", "Br", 0, 0, both=True), "1,2,3,4-tetrabromo-2,3-dimethylbutane"),
    ("u1-x2-dmb-cold", "kvt-stable-is-fast: the 1,4", add(DMB, "Br", "Br", 1, 4), "1,4-dibromo-2,3-dimethylbut-2-ene"),
    ("u1-x2-dmb-cold", "DROPPED x2-inner-first: lands on RIGHT", add(DMB, "Br", "Br", 2, 1), "3,4-dibromo-2,3-dimethylbut-1-ene"),
]
bad = 0
for (item, route, got, name), want in zip(checks, opsin([c[3] for c in checks])):
    ok = canon(got) == want
    bad += not ok
    print(f"{'OK ' if ok else 'BAD'} {item:20} {route:42} {got:26} = {name}")

EST = "[CH2:5]=[CH:6]C(=O)OC"
NIT = "[CH2:5]=[CH:6]C#N"
ALD = "[CH2:5]=[CH:6]C=O"
MVK = "[CH2:5]=[CH:6]C(C)=O"
OME2 = "[CH2:1]=[C:2](OC)[CH:3]=[CH2:4]"
PENTA = "[CH2:1]=[CH:2]/[CH:3]=[CH:4]/C"  # (E)-penta-1,3-diene: the methyl is C5, on C4
print()
for item, diene, phile, dsub, psub in [
    ("u1-cd-pred-para-ester", ISO, EST, "[R;$([R]-[CH3])]", "[R;$([R]-C(=O)O)]"),
    ("u1-cd-pred-para-ome", OME2, NIT, "[R;$([R]-O)]", "[R;$([R]-C#N)]"),
    ("u1-cd-pred-draw-para", ISO, ALD, "[R;$([R]-[CH3])]", "[R;$([R]-[CH]=O)]"),
    ("u1-cd-qd-para-ketone", ISO, MVK, "[R;$([R]-[CH3])]", "[R;$([R]-C(=O)C)]"),
    ("u1-cd-ex-para-ome-ester", OME2, EST, "[R;$([R]-O)]", "[R;$([R]-C(=O)O)]"),
    ("u1-cd-exam-draw-mvk", ISO, MVK, "[R;$([R]-[CH3])]", "[R;$([R]-C(=O)C)]"),
    ("u1-cd-qd-ortho-ester", PENTA, EST, "[R;$([R]-[CH3])]", "[R;$([R]-C(=O)O)]"),
]:
    for label, c1_to in (("diene C1 to the CH2", 5), ("diene C1 to the C with the group", 6)):
        p = da(diene, phile, c1_to)
        print(f"{item:24} {label:34} {relation(p, dsub, psub)}  {p}")
# The draw items' wrong structure (diene C1 joined to the carbon with the group), named and read back.
for item, smiles, name in [
    ("u1-cd-pred-draw-para", da(ISO, ALD, 6), "3-methylcyclohex-3-ene-1-carbaldehyde"),
    ("u1-cd-exam-draw-mvk", da(ISO, MVK, 6), "1-(3-methylcyclohex-3-en-1-yl)ethan-1-one"),
]:
    ok = canon(smiles) == opsin([name])[0]
    bad += not ok
    print(f"{'OK ' if ok else 'BAD'} {item:24} both mix-ups draw {smiles} = {name}")
sys.exit(1 if bad else 0)
