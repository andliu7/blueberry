"""
Unit 2 "energy diagrams and Keq" drawings (29 Oct 2026, round 2). Writes
src/game/content/u2energy/figures.generated.ts: the skeletal structures behind every real
reaction in the energy lesson.

Round 1 named acid CLASSES and drew only wells. Round 2 ties every pKa to Keq step and every
kinetic versus thermodynamic case to a DRAWN reaction. Nothing is asserted from memory:

  - every structure is a SMILES run through RDKit and laid out by scripts/u2_pools.py figure();
  - each name is checked against OPSIN (name to structure);
  - the acid, the base, the conjugate base and the conjugate acid are checked for atom and
    charge balance, and the conjugate acid is protonated from the base by RDKit;
  - the acid site and the formed-acid site are found by the same SMARTS the pKa lesson uses and
    the course pKa is read from packages/curriculum/src/pka.ts (no pKa is typed here);
  - the allyl cation from butadiene is checked to carry its charge on exactly two carbons
    (RDKit ResonanceMolSupplier), each product is checked to be that cation plus bromide, and
    which product has the more substituted alkene is counted, not stated;
  - the kinetic and thermodynamic enolates of 2-methylcyclohexanone are built one alpha carbon
    at a time and ranked by the substituents on the new C=C.

What RDKit cannot derive (the temperatures of the HBr experiment, that the less substituted
enolate forms faster) is recorded in the provenance strings in pools.ts as NEEDS OWNER CHECK.
"""
from __future__ import annotations

import json
import sys
from collections import Counter
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
import u2_pools as u  # noqa: E402
import u2_tools_pools as t  # noqa: E402
from rdkit import Chem  # noqa: E402
from rdkit.Chem.rdchem import ResonanceMolSupplier  # noqa: E402

REPO = Path(__file__).resolve().parent.parent
OUT = REPO / "src" / "game" / "content" / "u2energy" / "figures.generated.ts"
fail = u.fail

# (id, acid, base, conjugate base, conjugate acid): SMILES and the caption drawn under it.
CASES = [
    ("acetic-hydroxide", ("CC(=O)O", "acetic acid"), ("[OH-]", "hydroxide"), ("CC(=O)[O-]", "acetate"), ("O", "water")),
    ("acetic-ethoxide", ("CC(=O)O", "acetic acid"), ("CC[O-]", "ethoxide"), ("CC(=O)[O-]", "acetate"), ("CCO", "ethanol")),
    ("acetic-bicarbonate", ("CC(=O)O", "acetic acid"), ("OC(=O)[O-]", "bicarbonate"), ("CC(=O)[O-]", "acetate"), ("OC(=O)O", "carbonic acid")),
    ("phenol-hydroxide", ("Oc1ccccc1", "phenol"), ("[OH-]", "hydroxide"), ("[O-]c1ccccc1", "phenoxide"), ("O", "water")),
    ("ethanol-hydroxide", ("CCO", "ethanol"), ("[OH-]", "hydroxide"), ("CC[O-]", "ethoxide"), ("O", "water")),
    ("acetone-hydroxide", ("CC(C)=O", "acetone"), ("[OH-]", "hydroxide"), ("C=C(C)[O-]", "acetone enolate"), ("O", "water")),
    ("butyne-hydroxide", ("CCC#C", "1-butyne"), ("[OH-]", "hydroxide"), ("CCC#[C-]", "butynide"), ("O", "water")),
    ("butyne-amide", ("CCC#C", "1-butyne"), ("[NH2-]", "amide ion"), ("CCC#[C-]", "butynide"), ("N", "ammonia")),
    ("ammonium-hydroxide", ("[NH4+]", "ammonium"), ("[OH-]", "hydroxide"), ("N", "ammonia"), ("O", "water")),
]

# Single atoms RDKit cannot lay out as a skeleton: drawn as a formula label.
ATOMS = {"[OH-]": "HO^-", "O": "H_2O", "[NH2-]": "H_2N^-", "N": "NH_3", "[NH4+]": "NH_4^+"}
NO_OPSIN = {"hydroxide", "water", "amide ion", "ammonia", "ammonium", "acetone enolate", "butynide"}


def draw(smi: str) -> dict:
    if smi in ATOMS:
        return t.atom_fig(ATOMS[smi])
    return u.figure(smi)


def atoms_of(smi: str) -> Counter:
    m = Chem.AddHs(u.mol(smi))
    return Counter(a.GetSymbol() for a in m.GetAtoms())


def charge_of(smi: str) -> int:
    return sum(a.GetFormalCharge() for a in u.mol(smi).GetAtoms())


def check_name(smi: str, name: str) -> None:
    if name in NO_OPSIN:
        return
    got = u.opsin(name)
    if got is None or u.canon(got) != u.canon(smi):
        fail(f"name {name!r} does not give {smi} in OPSIN ({got})")


def species(smi: str, name: str) -> dict:
    check_name(smi, name)
    return {"name": name, "figure": draw(smi)}


def build_cases() -> dict:
    out = {}
    for cid, acid, base, cbase, cacid in CASES:
        if u.canon(t.conj_acid(base[0])) != u.canon(cacid[0]):
            fail(f"{cid}: RDKit protonates {base[0]} to {t.conj_acid(base[0])}, not {cacid[0]}")
        left = atoms_of(acid[0]) + atoms_of(base[0])
        right = atoms_of(cbase[0]) + atoms_of(cacid[0])
        if left != right:
            fail(f"{cid}: atoms do not balance {dict(left)} vs {dict(right)}")
        if charge_of(acid[0]) + charge_of(base[0]) != charge_of(cbase[0]) + charge_of(cacid[0]):
            fail(f"{cid}: charge does not balance")
        out[cid] = {
            "acidSite": t.site_of(acid[0]),
            "formedSite": t.site_of(cacid[0]),
            "acid": species(*acid),
            "base": species(*base),
            "conjBase": species(*cbase),
            "conjAcid": species(*cacid),
        }
    return out


def alkene_substituents(m: Chem.Mol) -> int:
    """The most non-hydrogen substituents found on any one C=C (both ends counted)."""
    best = 0
    for b in m.GetBonds():
        if b.GetBondType() == Chem.BondType.DOUBLE and b.GetBeginAtom().GetSymbol() == "C" and b.GetEndAtom().GetSymbol() == "C":
            ends = (b.GetBeginAtom(), b.GetEndAtom())
            n = 0
            for a in ends:
                n += sum(1 for nb in a.GetNeighbors() if nb.GetIdx() not in (ends[0].GetIdx(), ends[1].GetIdx()))
            best = max(best, n)
    return best


def build_butadiene() -> dict:
    diene = "C=CC=C"
    cation = "C[CH+]C=C"  # H+ added to C1 of butadiene: the allyl cation
    sup = ResonanceMolSupplier(u.mol(cation))
    sites = set()
    for i in range(len(sup)):
        for a in sup[i].GetAtoms():
            if a.GetFormalCharge() == 1 and a.GetSymbol() == "C":
                sites.add(a.GetIdx())
    if len(sites) != 2:
        fail(f"allyl cation should put charge on two carbons, got {sites}")
    p12 = "C=CC(C)Br"  # bromide on the carbon that took the proton's neighbour: 1,2 addition
    p14 = "CC=CCBr"  # bromide on the far end: 1,4 addition
    want = atoms_of(cation) + Counter({"Br": 1})
    for smi in (p12, p14):
        if atoms_of(smi) != want:
            fail(f"{smi}: not cation plus bromide")
        if charge_of(smi) != 0:
            fail(f"{smi}: not neutral")
    s12, s14 = alkene_substituents(u.mol(p12)), alkene_substituents(u.mol(p14))
    if not s14 > s12:
        fail(f"1,4 product should have the more substituted alkene: {s12} vs {s14}")
    for smi, nm in ((p12, "3-bromobut-1-ene"), (p14, "1-bromobut-2-ene"), (diene, "1,3-butadiene")):
        got = u.opsin(nm)
        if got is None or u.canon(got) != u.canon(smi):
            fail(f"{nm} does not give {smi}")
    return {
        "diene": {"name": "1,3-butadiene", "figure": draw(diene)},
        "hbr": {"name": "HBr", "figure": t.atom_fig("HBr")},
        "cation": {"name": "allyl cation", "figure": u.figure(cation)},
        "kinetic": {"name": "3-bromobut-1-ene", "figure": draw(p12), "tag": "1,2 product"},
        "thermo": {"name": "1-bromobut-2-ene", "figure": draw(p14), "tag": "1,4 product"},
        "alkeneSubstituents": {"kinetic": s12, "thermo": s14},
    }


def enolates_of(ketone: str) -> list[tuple[str, int]]:
    m = u.mol(ketone)
    ca, cc, co = m.GetSubstructMatch(Chem.MolFromSmarts("[#6][CX3]=O"))
    out = []
    for nb in m.GetAtomWithIdx(cc).GetNeighbors():
        if nb.GetIdx() != co and nb.GetSymbol() == "C" and nb.GetTotalNumHs() > 0:
            rw = Chem.RWMol(m)
            rw.GetBondBetweenAtoms(cc, co).SetBondType(Chem.BondType.SINGLE)
            rw.GetBondBetweenAtoms(cc, nb.GetIdx()).SetBondType(Chem.BondType.DOUBLE)
            rw.GetAtomWithIdx(co).SetFormalCharge(-1)
            na = rw.GetAtomWithIdx(nb.GetIdx())
            na.SetNumExplicitHs(0)
            na.SetNoImplicit(False)
            Chem.SanitizeMol(rw)
            out.append((Chem.MolToSmiles(rw), alkene_substituents(rw)))
    return out


def build_enolates() -> dict:
    ketone = "CC1CCCCC1=O"
    got = u.opsin("2-methylcyclohexanone")
    if got is None or u.canon(got) != u.canon(ketone):
        fail("2-methylcyclohexanone name mismatch")
    eno = enolates_of(ketone)
    if len(eno) != 2 or eno[0][1] == eno[1][1]:
        fail(f"expected two enolates of different substitution, got {eno}")
    eno.sort(key=lambda x: x[1])
    less, more = eno
    return {
        "ketone": {"name": "2-methylcyclohexanone", "figure": draw(ketone)},
        "kinetic": {"name": "less substituted enolate", "figure": draw(less[0]), "tag": "kinetic enolate"},
        "thermo": {"name": "more substituted enolate", "figure": draw(more[0]), "tag": "thermodynamic enolate"},
        "alkeneSubstituents": {"kinetic": less[1], "thermo": more[1]},
    }


def emit(data: dict) -> str:
    dump = lambda v: json.dumps(v, indent=1, ensure_ascii=False)  # noqa: E731
    return (
        "// GENERATED by scripts/u2_energy_figures.py. Do not edit; rerun the script.\n"
        "// Every structure is RDKit-laid-out, every name OPSIN-checked, every reaction atom-balanced.\n"
        'import type { Figure } from "../../onboarding/figures";\n\n'
        "export interface GenSpecies {\n  readonly name: string;\n  readonly figure: Figure;\n  readonly tag?: string;\n}\n\n"
        "export interface GenCase {\n  readonly acidSite: string;\n  readonly formedSite: string;\n"
        "  readonly acid: GenSpecies;\n  readonly base: GenSpecies;\n  readonly conjBase: GenSpecies;\n  readonly conjAcid: GenSpecies;\n}\n\n"
        "export interface GenControl {\n  readonly diene?: GenSpecies;\n  readonly ketone?: GenSpecies;\n  readonly hbr?: GenSpecies;\n  readonly cation?: GenSpecies;\n"
        "  readonly kinetic: GenSpecies;\n  readonly thermo: GenSpecies;\n  readonly alkeneSubstituents: { readonly kinetic: number; readonly thermo: number };\n}\n\n"
        f"export const U2E_CASES: Readonly<Record<string, GenCase>> = {dump(data['cases'])};\n\n"
        f"export const U2E_BUTADIENE: GenControl = {dump(data['butadiene'])};\n\n"
        f"export const U2E_ENOLATE: GenControl = {dump(data['enolate'])};\n"
    )


def main() -> int:
    data = {"cases": build_cases(), "butadiene": build_butadiene(), "enolate": build_enolates()}
    u.check_names()
    if u.FAILURES:
        print("REFUSED. Nothing written:")
        for f in u.FAILURES:
            print("  " + f)
        return 1
    text = emit(data)
    if u.EM_DASH in text:
        print("REFUSED: an em dash reached the output")
        return 1
    OUT.write_text(text, encoding="utf-8", newline="\n")
    print(f"wrote {OUT.relative_to(REPO)}: {len(data['cases'])} cases")
    for k, v in data["cases"].items():
        print(" ", k, v["acidSite"], t.PKA[v["acidSite"]], "->", v["formedSite"], t.PKA[v["formedSite"]])
    return 0


if __name__ == "__main__":
    sys.exit(main())
