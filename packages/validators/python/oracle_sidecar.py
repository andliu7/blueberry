"""The RDKit oracle sidecar.

Reads one JSON request on stdin, writes one JSON response on stdout, exits.

D3 in docs/INHERITED-DECISIONS.md gives this process exactly one job: be the reference
implementation that grades chem-core's TypeScript. It runs in CI only. It never enters a
bundle, and nothing in apps/ or packages/chem-core/ can reach it.

Rules this file holds itself to, because a validator that cheats is worse than no
validator:

  - stdout carries the response and nothing else. RDKit's own logger is silenced so a
    warning cannot land in the middle of the JSON.
  - No network, no file reads, no file writes, no clock, no random source. Two runs on
    one input give byte identical output.
  - Nothing here is skipped when it is inconvenient. Where a molecule cannot be built the
    reason is reported as a structured error and the consuming check fails on it.

THE TWO CONVENTIONS, and how they were pinned.

Both of these are sign errors waiting to happen, and a flipped sign is invisible in a
green suite because it makes every answer wrong in the same direction. Neither was
guessed. Each was derived by measurement and each is re-checked on every invocation by
run_self_test().

  1. chem-core parity to RDKit chiral tag.

     chem-core (packages/chem-core/src/atom.ts): stand at neighbors[0], look toward the
     centre so the other three point away, read neighbors[1..3]. Clockwise from there is
     "clockwise".

     Derivation: RDKit was asked to embed F[C@@H](Cl)Br and F[C@H](Cl)Br in 3D and to
     label them with rdCIPLabeler. For each, the chem-core parity was computed from the
     conformer by the signed volume e . (a x b), where e, a, b are the vectors from the
     centre to neighbours 0, 1, 2 taken in RDKit's own bond order. The result:

       chem-core "clockwise"        <-> CHI_TETRAHEDRAL_CW
       chem-core "counterclockwise" <-> CHI_TETRAHEDRAL_CCW

     an identity mapping, provided the neighbour list order matches RDKit's bond order at
     the atom. It usually does not, so build_species() computes the permutation parity
     between the two orders and flips the tag on an odd permutation.

     Cross checked by hand, independent of RDKit: for neighbour list [F, Cl, Br, H] with
     parity clockwise, reversing to [H, Br, Cl, F] is an even permutation and so is also
     clockwise. Standing at H, the lowest priority, and reading Br > Cl > F clockwise is
     the definition of S. RDKit says S.

  2. Where RDKit puts a phantom lone pair.

     A three coordinate stereogenic centre, a sulfoxide sulfur, has @lonePair in its
     chem-core neighbour list. RDKit has no lone pair atom, so the phantom is the fourth
     neighbour. Measurement on O=S(CH3)(CH2CH3) built with bonds inserted in the order
     O, CH3, Et and tagged CHI_TETRAHEDRAL_CW gives S, which matches the hand derivation
     only if the phantom is treated as the LAST neighbour. So it is placed last, and the
     permutation parity machinery above does the rest.
"""

from __future__ import annotations

import json
import sys
import traceback
from typing import Any

PROTOCOL = "blueberry-oracle"
VERSION = 1

IMPLICIT_HYDROGEN = "@implicitH"
LONE_PAIR = "@lonePair"

# A local sentinel for the phantom fourth neighbour of a three coordinate centre. It is
# not an RDKit atom index and never collides with one, which are negative-free integers.
PHANTOM = -1

_ALLOWED_STATE_KEYS = {"stateRef", "id", "sanitizationMayFail", "species"}
_ALLOWED_SPECIES_KEYS = {"id", "label", "atoms", "bonds"}
_ALLOWED_ATOM_KEYS = {
    "id",
    "element",
    "isotope",
    "formalCharge",
    "lonePairs",
    "unpairedElectrons",
    "implicitHydrogens",
    "stereo",
}
_ALLOWED_BOND_KEYS = {"id", "a", "b", "order", "stereo"}
_ALLOWED_ATOM_STEREO_KEYS = {"kind", "neighbors", "parity", "authoredDescriptor"}
_ALLOWED_BOND_STEREO_KEYS = {"kind", "reference", "arrangement", "authoredDescriptor"}
_ALLOWED_MAY_FAIL_KEYS = {"expectedError", "justification", "declaredBy"}


class PayloadError(Exception):
    """A request that does not match CONTRACT.md. Never a chemistry result."""


class BuildError(Exception):
    """A species that cannot be translated into an RDKit molecule."""


# ---------------------------------------------------------------------------
# Import RDKit loudly.
#
# A missing RDKit must never look like a passing run. There is no try/except around this
# import that swallows anything: the traceback goes to stderr, the exit code is nonzero,
# and the TypeScript bridge turns that into a failed check with the stderr text attached.
# ---------------------------------------------------------------------------
from rdkit import Chem, RDLogger, rdBase  # noqa: E402
from rdkit.Chem import rdCIPLabeler  # noqa: E402

RDLogger.DisableLog("rdApp.*")

_BOND_TYPES = {
    1: Chem.BondType.SINGLE,
    2: Chem.BondType.DOUBLE,
    3: Chem.BondType.TRIPLE,
}


# ---------------------------------------------------------------------------
# Payload validation
# ---------------------------------------------------------------------------

def _require_keys(obj: Any, allowed: set[str], where: str) -> dict[str, Any]:
    if not isinstance(obj, dict):
        raise PayloadError(f"{where}: expected an object, got {type(obj).__name__}")
    unknown = sorted(set(obj) - allowed)
    if unknown:
        raise PayloadError(
            f"{where}: unknown key(s) {unknown}. "
            f"Allowed: {sorted(allowed)}. A typo read as an absent field is how a check "
            f"stops checking."
        )
    missing = sorted(allowed - set(obj))
    if missing:
        raise PayloadError(f"{where}: missing required key(s) {missing}")
    return obj


def _permutation_is_odd(source: list[Any], target: list[Any]) -> bool:
    """Parity of the permutation taking `source` to `target`.

    Both must be the same multiset with no repeats. Swapping any two entries of a
    tetrahedral neighbour list flips the parity of the centre, which is why this is
    computed rather than assumed.
    """
    if sorted(map(str, source)) != sorted(map(str, target)):
        raise BuildError(
            f"neighbour lists are not permutations of each other: {source} vs {target}"
        )
    working = list(source)
    swaps = 0
    for position, wanted in enumerate(target):
        if working[position] == wanted:
            continue
        found = working.index(wanted, position)
        working[position], working[found] = working[found], working[position]
        swaps += 1
    return swaps % 2 == 1


# ---------------------------------------------------------------------------
# Building
# ---------------------------------------------------------------------------

class BuiltSpecies:
    def __init__(self, mol: Chem.Mol, atom_index: dict[str, int], bond_index: dict[str, int]):
        self.mol = mol
        self.atom_index = atom_index
        self.bond_index = bond_index
        # RDKit index back to chem-core id. Materialised hydrogens are absent from this
        # map on purpose: they have no chem-core id and must never be reported under one.
        self.reverse_atoms = {value: key for key, value in atom_index.items()}
        self.reverse_bonds = {value: key for key, value in bond_index.items()}


def build_species(species: dict[str, Any]) -> BuiltSpecies:
    """Translate one chem-core species into an RDKit molecule. Does not sanitise."""
    _require_keys(species, _ALLOWED_SPECIES_KEYS, "species")
    species_id = species["id"]
    atoms = species["atoms"]
    bonds = species["bonds"]
    if not isinstance(atoms, list) or not isinstance(bonds, list):
        raise BuildError(f"species {species_id}: atoms and bonds must be lists")

    rw = Chem.RWMol()
    atom_index: dict[str, int] = {}

    for atom in atoms:
        _require_keys(atom, _ALLOWED_ATOM_KEYS, f"species {species_id} atom")
        atom_id = atom["id"]
        if atom_id in atom_index:
            raise BuildError(f"species {species_id}: duplicate atom id {atom_id}")
        try:
            rd_atom = Chem.Atom(atom["element"])
        except Exception as error:  # RDKit raises a bare RuntimeError on a bad symbol
            raise BuildError(
                f"species {species_id} atom {atom_id}: RDKit does not know element "
                f"{atom['element']!r} ({error})"
            ) from error
        # SetNoImplicit stops RDKit inventing hydrogens of its own. chem-core states the
        # hydrogen count explicitly and a silently added H would break mass accounting in
        # a way that reads as a chemistry error.
        rd_atom.SetNoImplicit(True)
        rd_atom.SetNumExplicitHs(int(atom["implicitHydrogens"]))
        rd_atom.SetFormalCharge(int(atom["formalCharge"]))
        rd_atom.SetNumRadicalElectrons(int(atom["unpairedElectrons"]))
        if atom["isotope"] is not None:
            rd_atom.SetIsotope(int(atom["isotope"]))
        atom_index[atom_id] = rw.AddAtom(rd_atom)

    bond_index: dict[str, int] = {}
    for bond in bonds:
        _require_keys(bond, _ALLOWED_BOND_KEYS, f"species {species_id} bond")
        bond_id = bond["id"]
        for end in ("a", "b"):
            if bond[end] not in atom_index:
                raise BuildError(
                    f"species {species_id} bond {bond_id}: end {end} names atom "
                    f"{bond[end]!r}, which is not in this species"
                )
        order = bond["order"]
        if order not in _BOND_TYPES:
            raise BuildError(
                f"species {species_id} bond {bond_id}: order {order!r} is not 1, 2, or 3"
            )
        bond_index[bond_id] = (
            rw.AddBond(atom_index[bond["a"]], atom_index[bond["b"]], _BOND_TYPES[order]) - 1
        )

    _materialise_stereo_hydrogens(rw, species, atom_index)
    _apply_atom_stereo(rw, species, atom_index)

    mol = rw.GetMol()
    return BuiltSpecies(mol, atom_index, bond_index)


def _materialise_stereo_hydrogens(
    rw: Chem.RWMol, species: dict[str, Any], atom_index: dict[str, int]
) -> None:
    """Turn every @implicitH stereo slot into a real hydrogen atom.

    RDKit's rule for where an undrawn hydrogen sits in a neighbour ordering differs
    between SMILES input and molecule construction, and relying on either is a way to be
    wrong on half the corpus. Making the hydrogen explicit removes the question: the
    hydrogen becomes an ordinary neighbour and the permutation machinery in
    _apply_atom_stereo handles it like any other.
    """
    species_id = species["id"]
    for atom in species["atoms"]:
        stereo = atom["stereo"]
        if stereo is None:
            continue
        _require_keys(stereo, _ALLOWED_ATOM_STEREO_KEYS, f"species {species_id} atom stereo")
        if stereo["kind"] != "tetrahedral":
            raise BuildError(
                f"species {species_id} atom {atom['id']}: unknown atom stereo kind "
                f"{stereo['kind']!r}"
            )
        wanted = sum(1 for slot in stereo["neighbors"] if slot == IMPLICIT_HYDROGEN)
        if wanted == 0:
            continue
        centre = rw.GetAtomWithIdx(atom_index[atom["id"]])
        available = centre.GetNumExplicitHs()
        if available < wanted:
            raise BuildError(
                f"species {species_id} atom {atom['id']}: stereo names {wanted} "
                f"{IMPLICIT_HYDROGEN} slot(s) but the atom declares "
                f"implicitHydrogens={available}"
            )
        centre.SetNumExplicitHs(available - wanted)
        for _ in range(wanted):
            hydrogen = Chem.Atom("H")
            hydrogen.SetNoImplicit(True)
            new_index = rw.AddAtom(hydrogen)
            rw.AddBond(atom_index[atom["id"]], new_index, Chem.BondType.SINGLE)


def _apply_atom_stereo(
    rw: Chem.RWMol, species: dict[str, Any], atom_index: dict[str, int]
) -> None:
    species_id = species["id"]
    for atom in species["atoms"]:
        stereo = atom["stereo"]
        if stereo is None:
            continue
        atom_id = atom["id"]
        slots = stereo["neighbors"]
        if not isinstance(slots, list) or len(slots) != 4:
            raise BuildError(
                f"species {species_id} atom {atom_id}: stereo needs exactly four "
                f"neighbour slots, got {slots!r}. Parity over three is meaningless."
            )
        parity = stereo["parity"]
        if parity not in ("clockwise", "counterclockwise"):
            raise BuildError(
                f"species {species_id} atom {atom_id}: parity {parity!r} is neither "
                f"clockwise nor counterclockwise"
            )

        centre_index = atom_index[atom_id]
        centre = rw.GetAtomWithIdx(centre_index)
        # RDKit's neighbour ordering at this atom is the order its bonds were added.
        rdkit_order = [bond.GetOtherAtomIdx(centre_index) for bond in centre.GetBonds()]

        # The materialised hydrogens sit at the end of the bond list, in slot order,
        # because _materialise_stereo_hydrogens added them after every declared bond.
        hydrogen_queue = [
            index
            for index in rdkit_order
            if index not in atom_index.values()
        ]
        lone_pairs = 0
        declared: list[Any] = []
        for slot in slots:
            if slot == IMPLICIT_HYDROGEN:
                if not hydrogen_queue:
                    raise BuildError(
                        f"species {species_id} atom {atom_id}: more {IMPLICIT_HYDROGEN} "
                        f"slots than materialised hydrogens"
                    )
                declared.append(hydrogen_queue.pop(0))
                continue
            if slot == LONE_PAIR:
                lone_pairs += 1
                declared.append(PHANTOM)
                continue
            if slot not in atom_index:
                raise BuildError(
                    f"species {species_id} atom {atom_id}: stereo slot {slot!r} is not "
                    f"an atom in this species and is not a chem-core sentinel"
                )
            neighbour = atom_index[slot]
            if neighbour not in rdkit_order:
                raise BuildError(
                    f"species {species_id} atom {atom_id}: stereo slot {slot!r} is not "
                    f"bonded to it"
                )
            declared.append(neighbour)

        if lone_pairs > 1:
            raise BuildError(
                f"species {species_id} atom {atom_id}: {lone_pairs} {LONE_PAIR} slots. "
                f"RDKit can carry one phantom neighbour, not two, so this centre cannot "
                f"be labelled by the oracle."
            )
        if len(set(declared)) != 4:
            raise BuildError(
                f"species {species_id} atom {atom_id}: stereo slots are not four "
                f"distinct neighbours: {slots!r}"
            )
        if len(rdkit_order) + lone_pairs != 4:
            raise BuildError(
                f"species {species_id} atom {atom_id}: {len(rdkit_order)} bonded "
                f"neighbour(s) plus {lone_pairs} lone pair slot(s) is not four"
            )

        # The phantom goes last. See the module docstring, convention 2.
        actual = list(rdkit_order) + ([PHANTOM] if lone_pairs else [])
        odd = _permutation_is_odd(actual, declared)

        clockwise = parity == "clockwise"
        if odd:
            clockwise = not clockwise
        centre.SetChiralTag(
            Chem.ChiralType.CHI_TETRAHEDRAL_CW
            if clockwise
            else Chem.ChiralType.CHI_TETRAHEDRAL_CCW
        )


def _apply_bond_stereo(built: BuiltSpecies, species: dict[str, Any]) -> None:
    """Set cis/trans on double bonds. Runs after sanitisation, which needs ring info."""
    species_id = species["id"]
    mol = built.mol
    has_any = any(bond["stereo"] is not None for bond in species["bonds"])
    if not has_any:
        return
    Chem.FindPotentialStereoBonds(mol)
    for bond in species["bonds"]:
        stereo = bond["stereo"]
        if stereo is None:
            continue
        _require_keys(stereo, _ALLOWED_BOND_STEREO_KEYS, f"species {species_id} bond stereo")
        if stereo["kind"] != "doubleBond":
            raise BuildError(
                f"species {species_id} bond {bond['id']}: unknown bond stereo kind "
                f"{stereo['kind']!r}"
            )
        if bond["order"] != 2:
            raise BuildError(
                f"species {species_id} bond {bond['id']}: double bond stereo on an "
                f"order {bond['order']} bond"
            )
        arrangement = stereo["arrangement"]
        if arrangement not in ("cis", "trans"):
            raise BuildError(
                f"species {species_id} bond {bond['id']}: arrangement "
                f"{arrangement!r} is neither cis nor trans"
            )
        reference = stereo["reference"]
        if not isinstance(reference, list) or len(reference) != 2:
            raise BuildError(
                f"species {species_id} bond {bond['id']}: reference must be two atom ids"
            )
        rd_bond = mol.GetBondWithIdx(built.bond_index[bond["id"]])
        begin = rd_bond.GetBeginAtomIdx()
        end = rd_bond.GetEndAtomIdx()
        ends = {bond["a"]: begin, bond["b"]: end}
        for position, (ref, own_end) in enumerate(
            zip(reference, (bond["a"], bond["b"]))
        ):
            if ref not in built.atom_index:
                raise BuildError(
                    f"species {species_id} bond {bond['id']}: reference[{position}] "
                    f"{ref!r} is not an atom in this species"
                )
            centre = mol.GetAtomWithIdx(ends[own_end])
            neighbours = {n.GetIdx() for n in centre.GetNeighbors()}
            if built.atom_index[ref] not in neighbours:
                raise BuildError(
                    f"species {species_id} bond {bond['id']}: reference[{position}] "
                    f"{ref!r} is not a neighbour of {own_end!r}"
                )
        # SetStereoAtoms takes the two named reference atoms; STEREOCIS then means those
        # two, not RDKit's own pick, are on the same side. That is the whole point of the
        # reference pair being in the chem-core model.
        rd_bond.SetStereoAtoms(
            built.atom_index[reference[0]], built.atom_index[reference[1]]
        )
        rd_bond.SetStereo(
            Chem.BondStereo.STEREOCIS if arrangement == "cis" else Chem.BondStereo.STEREOTRANS
        )


# ---------------------------------------------------------------------------
# Analysis
# ---------------------------------------------------------------------------

def _mirror(mol: Chem.Mol) -> Chem.Mol:
    """The mirror image: every chiral tag inverted and every cis/trans bond flipped."""
    mirror = Chem.RWMol(mol)
    for atom in mirror.GetAtoms():
        tag = atom.GetChiralTag()
        if tag == Chem.ChiralType.CHI_TETRAHEDRAL_CW:
            atom.SetChiralTag(Chem.ChiralType.CHI_TETRAHEDRAL_CCW)
        elif tag == Chem.ChiralType.CHI_TETRAHEDRAL_CCW:
            atom.SetChiralTag(Chem.ChiralType.CHI_TETRAHEDRAL_CW)
    for bond in mirror.GetBonds():
        stereo = bond.GetStereo()
        if stereo == Chem.BondStereo.STEREOCIS:
            bond.SetStereo(Chem.BondStereo.STEREOTRANS)
        elif stereo == Chem.BondStereo.STEREOTRANS:
            bond.SetStereo(Chem.BondStereo.STEREOCIS)
    return mirror.GetMol()


def analyse_species(species: dict[str, Any]) -> dict[str, Any]:
    built = build_species(species)
    mol = built.mol

    empty = {
        "id": species["id"],
        "label": species.get("label"),
        "canonicalSmiles": None,
        "atomDescriptors": [],
        "bondDescriptors": [],
        "unspecifiedPotentialStereo": [],
        "meso": None,
        "aromaticAtomIds": [],
        "aromaticBondIds": [],
        "aromaticRingCount": None,
    }

    try:
        Chem.SanitizeMol(mol)
    except Exception as error:
        result = dict(empty)
        result["sanitization"] = {
            "ok": False,
            "errorKind": type(error).__name__,
            "error": str(error),
        }
        return result

    _apply_bond_stereo(built, species)
    # cleanIt is False on purpose. cleanIt=True strips the cis/trans marks that
    # _apply_bond_stereo has just set, and the run then silently reports no E/Z at all.
    Chem.AssignStereochemistry(mol, cleanIt=False, force=True)
    rdCIPLabeler.AssignCIPLabels(mol)

    atom_descriptors = []
    for atom in species["atoms"]:
        stereo = atom["stereo"]
        rd_atom = mol.GetAtomWithIdx(built.atom_index[atom["id"]])
        rdkit_label = rd_atom.GetProp("_CIPCode") if rd_atom.HasProp("_CIPCode") else None
        authored = stereo["authoredDescriptor"] if stereo is not None else None
        if rdkit_label is None and authored is None and stereo is None:
            continue
        atom_descriptors.append(
            {
                "atomId": atom["id"],
                "rdkit": rdkit_label,
                "authored": authored,
                "agrees": rdkit_label == authored,
            }
        )

    bond_descriptors = []
    for bond in species["bonds"]:
        stereo = bond["stereo"]
        rd_bond = mol.GetBondWithIdx(built.bond_index[bond["id"]])
        properties = rd_bond.GetPropsAsDict()
        rdkit_label = properties.get("_CIPCode")
        authored = stereo["authoredDescriptor"] if stereo is not None else None
        if rdkit_label is None and authored is None and stereo is None:
            continue
        bond_descriptors.append(
            {
                "bondId": bond["id"],
                "rdkit": rdkit_label,
                "authored": authored,
                "agrees": rdkit_label == authored,
            }
        )

    unspecified = []
    for element in Chem.FindPotentialStereo(mol):
        if element.specified == Chem.StereoSpecified.Specified:
            continue
        if element.type in (
            Chem.StereoType.Atom_Tetrahedral,
            Chem.StereoType.Atom_SquarePlanar,
            Chem.StereoType.Atom_TrigonalBipyramidal,
            Chem.StereoType.Atom_Octahedral,
        ):
            ref = built.reverse_atoms.get(element.centeredOn)
            unspecified.append({"kind": "atom", "ref": ref})
        else:
            ref = built.reverse_bonds.get(element.centeredOn)
            unspecified.append({"kind": "bond", "ref": ref})

    aromatic_atoms = sorted(
        built.reverse_atoms[atom.GetIdx()]
        for atom in mol.GetAtoms()
        if atom.GetIsAromatic() and atom.GetIdx() in built.reverse_atoms
    )
    aromatic_bonds = sorted(
        built.reverse_bonds[bond.GetIdx()]
        for bond in mol.GetBonds()
        if bond.GetIsAromatic() and bond.GetIdx() in built.reverse_bonds
    )
    ring_info = mol.GetRingInfo()
    aromatic_rings = sum(
        1
        for ring in ring_info.AtomRings()
        if all(mol.GetAtomWithIdx(index).GetIsAromatic() for index in ring)
    )

    # Hydrogens are removed for the canonical SMILES only. The materialised stereo
    # hydrogens are an implementation detail of this file and must not change the string
    # two molecules are compared by.
    for_smiles = Chem.RemoveHs(Chem.Mol(mol))
    canonical = Chem.MolToSmiles(for_smiles)
    mirror_canonical = Chem.MolToSmiles(_mirror(for_smiles))
    defined_centres = sum(
        1
        for atom in for_smiles.GetAtoms()
        if atom.GetChiralTag()
        in (Chem.ChiralType.CHI_TETRAHEDRAL_CW, Chem.ChiralType.CHI_TETRAHEDRAL_CCW)
    )

    return {
        "id": species["id"],
        "label": species.get("label"),
        "sanitization": {"ok": True, "errorKind": None, "error": None},
        "canonicalSmiles": canonical,
        "atomDescriptors": atom_descriptors,
        "bondDescriptors": bond_descriptors,
        "unspecifiedPotentialStereo": unspecified,
        "meso": {
            # Two or more defined centres is required. A molecule with none is achiral,
            # not meso, and letting those two share an answer would let a fixture with no
            # stereochemistry at all satisfy a meso expectation.
            "isMeso": defined_centres >= 2 and canonical == mirror_canonical,
            "definedTetrahedralCenters": defined_centres,
            "canonicalSmiles": canonical,
            "mirrorCanonicalSmiles": mirror_canonical,
        },
        "aromaticAtomIds": aromatic_atoms,
        "aromaticBondIds": aromatic_bonds,
        "aromaticRingCount": aromatic_rings,
    }


def analyse_state(state: dict[str, Any]) -> dict[str, Any]:
    _require_keys(state, _ALLOWED_STATE_KEYS, "state")
    may_fail = state["sanitizationMayFail"]
    if may_fail is not None:
        _require_keys(may_fail, _ALLOWED_MAY_FAIL_KEYS, "sanitizationMayFail")
        for key in _ALLOWED_MAY_FAIL_KEYS:
            if not isinstance(may_fail[key], str) or may_fail[key].strip() == "":
                raise PayloadError(
                    f"sanitizationMayFail.{key} must be a non empty string. An "
                    f"undefended escape hatch is a blanket one."
                )

    species_results = []
    build_errors = []
    for species in state["species"]:
        try:
            species_results.append(analyse_species(species))
        except BuildError as error:
            build_errors.append(str(error))

    return {
        "stateRef": state["stateRef"],
        "id": state["id"],
        "sanitizationMayFail": may_fail,
        "species": species_results,
        "buildErrors": build_errors,
    }


# ---------------------------------------------------------------------------
# Self test
# ---------------------------------------------------------------------------

def _atom(
    atom_id: str,
    element: str,
    hydrogens: int = 0,
    charge: int = 0,
    lone_pairs: int = 0,
    stereo: dict[str, Any] | None = None,
) -> dict[str, Any]:
    return {
        "id": atom_id,
        "element": element,
        "isotope": None,
        "formalCharge": charge,
        "lonePairs": lone_pairs,
        "unpairedElectrons": 0,
        "implicitHydrogens": hydrogens,
        "stereo": stereo,
    }


def _bond(
    bond_id: str, a: str, b: str, order: int = 1, stereo: dict[str, Any] | None = None
) -> dict[str, Any]:
    return {"id": bond_id, "a": a, "b": b, "order": order, "stereo": stereo}


def _chfclbr(neighbors: list[str], parity: str) -> dict[str, Any]:
    return {
        "id": "sp",
        "label": "bromochlorofluoromethane",
        "atoms": [
            _atom(
                "c1",
                "C",
                hydrogens=1,
                stereo={
                    "kind": "tetrahedral",
                    "neighbors": neighbors,
                    "parity": parity,
                    "authoredDescriptor": None,
                },
            ),
            _atom("f1", "F", lone_pairs=3),
            _atom("cl1", "Cl", lone_pairs=3),
            _atom("br1", "Br", lone_pairs=3),
        ],
        "bonds": [
            _bond("b1", "c1", "f1"),
            _bond("b2", "c1", "cl1"),
            _bond("b3", "c1", "br1"),
        ],
    }


def _sulfoxide(parity: str) -> dict[str, Any]:
    return {
        "id": "sp",
        "label": "ethyl methyl sulfoxide",
        "atoms": [
            _atom(
                "s1",
                "S",
                lone_pairs=1,
                stereo={
                    "kind": "tetrahedral",
                    "neighbors": ["o1", "c1", "c2", LONE_PAIR],
                    "parity": parity,
                    "authoredDescriptor": None,
                },
            ),
            _atom("o1", "O", lone_pairs=2),
            _atom("c1", "C", hydrogens=3),
            _atom("c2", "C", hydrogens=2),
            _atom("c3", "C", hydrogens=3),
        ],
        "bonds": [
            _bond("b1", "s1", "o1", order=2),
            _bond("b2", "s1", "c1"),
            _bond("b3", "s1", "c2"),
            _bond("b4", "c2", "c3"),
        ],
    }


def _butene(arrangement: str) -> dict[str, Any]:
    return {
        "id": "sp",
        "label": "2-butene",
        "atoms": [
            _atom("c1", "C", hydrogens=3),
            _atom("c2", "C", hydrogens=1),
            _atom("c3", "C", hydrogens=1),
            _atom("c4", "C", hydrogens=3),
        ],
        "bonds": [
            _bond("b1", "c1", "c2"),
            _bond(
                "b2",
                "c2",
                "c3",
                order=2,
                stereo={
                    "kind": "doubleBond",
                    "reference": ["c1", "c4"],
                    "arrangement": arrangement,
                    "authoredDescriptor": None,
                },
            ),
            _bond("b3", "c3", "c4"),
        ],
    }


def _first_atom_label(species: dict[str, Any], atom_id: str) -> str | None:
    result = analyse_species(species)
    if not result["sanitization"]["ok"]:
        return f"SANITIZATION FAILED: {result['sanitization']['error']}"
    for descriptor in result["atomDescriptors"]:
        if descriptor["atomId"] == atom_id:
            return descriptor["rdkit"]
    return None


def _bond_label(species: dict[str, Any], bond_id: str) -> str | None:
    result = analyse_species(species)
    if not result["sanitization"]["ok"]:
        return f"SANITIZATION FAILED: {result['sanitization']['error']}"
    for descriptor in result["bondDescriptors"]:
        if descriptor["bondId"] == bond_id:
            return descriptor["rdkit"]
    return None


def run_self_test() -> dict[str, Any]:
    """Pin the two conventions on every invocation.

    Each expectation below was derived by hand from CIP rules and independently agreed
    with by RDKit during the derivation recorded in the module docstring. If a future
    RDKit release, or an edit to this file, flips either convention, every descriptor in
    every run would be wrong in the same direction and nothing else in the suite would
    notice. That is what these six cases exist to stop.
    """
    base = ["f1", "cl1", "br1", IMPLICIT_HYDROGEN]
    swapped = ["f1", "br1", "cl1", IMPLICIT_HYDROGEN]
    cases = [
        # [F, Cl, Br, H] clockwise. Reversing to [H, Br, Cl, F] is an even permutation, so
        # standing at H and reading Br > Cl > F is also clockwise, which is S.
        ("chfclbr-clockwise-is-S", "S", _first_atom_label(_chfclbr(base, "clockwise"), "c1")),
        (
            "chfclbr-counterclockwise-is-R",
            "R",
            _first_atom_label(_chfclbr(base, "counterclockwise"), "c1"),
        ),
        # One transposition of the neighbour list must flip the descriptor. This is the
        # case that catches a permutation parity that is computed but never applied.
        (
            "chfclbr-one-transposition-flips",
            "R",
            _first_atom_label(_chfclbr(swapped, "clockwise"), "c1"),
        ),
        # Phantom lone pair last. O > CH2CH3 > CH3 > lone pair, and [O, CH3, Et, LP]
        # clockwise reverses to [LP, Et, CH3, O]; two further swaps give [LP, O, Et, CH3],
        # still clockwise, so standing at the lone pair and reading O > Et > CH3 clockwise
        # is S.
        ("sulfoxide-lone-pair-is-last", "S", _first_atom_label(_sulfoxide("clockwise"), "s1")),
        # cis with both reference atoms being the higher priority substituent is Z.
        ("cis-2-butene-is-Z", "Z", _bond_label(_butene("cis"), "b2")),
        ("trans-2-butene-is-E", "E", _bond_label(_butene("trans"), "b2")),
    ]
    reported = [
        {"name": name, "expected": expected, "actual": actual, "passed": expected == actual}
        for name, expected, actual in cases
    ]
    return {"passed": all(case["passed"] for case in reported), "cases": reported}


# ---------------------------------------------------------------------------
# Entry point
# ---------------------------------------------------------------------------

def handle(request: Any) -> dict[str, Any]:
    response: dict[str, Any] = {
        "protocol": PROTOCOL,
        "version": VERSION,
        "rdkitVersion": rdBase.rdkitVersion,
        "pythonVersion": ".".join(str(part) for part in sys.version_info[:3]),
        "selfTest": run_self_test(),
        "states": [],
        "fatal": None,
    }

    if not isinstance(request, dict):
        response["fatal"] = f"request must be a JSON object, got {type(request).__name__}"
        return response
    if request.get("protocol") != PROTOCOL:
        response["fatal"] = (
            f"protocol is {request.get('protocol')!r}, this sidecar speaks {PROTOCOL!r}"
        )
        return response
    if request.get("version") != VERSION:
        response["fatal"] = (
            f"request version {request.get('version')!r}, this sidecar speaks {VERSION}. "
            f"Refusing to guess at a shape it does not know."
        )
        return response
    states = request.get("states")
    if not isinstance(states, list):
        response["fatal"] = "request.states must be a list"
        return response

    results = []
    for position, state in enumerate(states):
        try:
            results.append(analyse_state(state))
        except PayloadError as error:
            response["fatal"] = f"states[{position}]: {error}"
            response["states"] = []
            return response
        except BuildError as error:
            results.append(
                {
                    "stateRef": state.get("stateRef") if isinstance(state, dict) else None,
                    "id": state.get("id") if isinstance(state, dict) else None,
                    "sanitizationMayFail": None,
                    "species": [],
                    "buildErrors": [str(error)],
                }
            )
    response["states"] = results
    return response


def main() -> int:
    raw = sys.stdin.read()
    try:
        request = json.loads(raw)
    except json.JSONDecodeError as error:
        json.dump(
            {
                "protocol": PROTOCOL,
                "version": VERSION,
                "rdkitVersion": rdBase.rdkitVersion,
                "pythonVersion": ".".join(str(part) for part in sys.version_info[:3]),
                "selfTest": {"passed": False, "cases": []},
                "states": [],
                "fatal": f"stdin is not valid JSON: {error}",
            },
            sys.stdout,
            sort_keys=True,
        )
        sys.stdout.write("\n")
        return 1

    response = handle(request)
    json.dump(response, sys.stdout, sort_keys=True)
    sys.stdout.write("\n")
    return 0 if response["fatal"] is None else 1


if __name__ == "__main__":
    try:
        sys.exit(main())
    except Exception:
        # Anything reaching here is a defect in this file. It goes to stderr with a full
        # traceback and a nonzero exit, never to stdout, so the bridge cannot mistake it
        # for a response.
        traceback.print_exc(file=sys.stderr)
        sys.exit(2)
