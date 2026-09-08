# The oracle JSON contract

Version 1. Bump `version` on any incompatible change and make the sidecar reject a version
it does not understand, rather than guessing.

The sidecar is `oracle_sidecar.py`. It reads exactly one JSON object from stdin, writes
exactly one JSON object to stdout, and writes nothing anywhere else. It opens no sockets,
reads no files, and does not consult the clock or a random source. Two runs on the same
input produce byte identical output.

RDKit is CI only. See D3 in `docs/INHERITED-DECISIONS.md`. Nothing in this directory is
reachable from `apps/web`, `apps/mobile`, or `packages/chem-core`.

## Why the payload looks like chem-core

The `state` shape below is a field for field serialisation of `MechanismState` from
`packages/chem-core`, minus the parts RDKit has no opinion about: `role`, spectator
declarations, and declared torsions. The TypeScript bridge in
`packages/validators/src/checks/oracle/payload.ts` produces it from a real
`MechanismState`, so a fixture that exists as chem-core objects needs no separate
authoring pass to reach the oracle.

Unknown keys are a hard error at every level. A typo in a field name would otherwise be
read as "the author did not state this", which is the failure mode where a check quietly
stops checking.

## Request

```json
{
  "protocol": "blueberry-oracle",
  "version": 1,
  "states": [ State, ... ]
}
```

### State

```json
{
  "stateRef": "corpus/stereocenters.oracle.json#seq:s-bromochlorofluoromethane/state:0",
  "id": "state-1",
  "sanitizationMayFail": null,
  "species": [ Species, ... ]
}
```

- `stateRef` is an opaque human readable label. The sidecar never parses it; it echoes it
  back so a failure can name the file it came from.
- `sanitizationMayFail` is `null`, or a declaration. See "Declaring that sanitisation may
  fail" below.

### Species

```json
{
  "id": "sp-1",
  "label": "meso-2,3-dibromobutane",
  "atoms": [ Atom, ... ],
  "bonds": [ Bond, ... ]
}
```

`label` may be `null`.

### Atom

```json
{
  "id": "c2",
  "element": "C",
  "isotope": null,
  "formalCharge": 0,
  "lonePairs": 0,
  "unpairedElectrons": 0,
  "implicitHydrogens": 1,
  "stereo": null
}
```

Every key is required. `isotope` and `stereo` may be `null`.

`lonePairs` is carried because chem-core carries it. RDKit has no lone pair concept, so
the sidecar uses it for exactly one thing: nothing. It is echoed nowhere and affects no
result. It is in the payload so that the serialisation stays a faithful copy of the model
and a future check can use it without a contract change.

### Atom stereo

```json
{
  "kind": "tetrahedral",
  "neighbors": ["f1", "cl1", "br1", "@implicitH"],
  "parity": "clockwise",
  "authoredDescriptor": "S"
}
```

- Exactly four slots. Each is an atom id in the same species, or the chem-core sentinel
  `@implicitH`, or the sentinel `@lonePair`.
- `parity` follows the convention stated in `packages/chem-core/src/atom.ts`: stand at
  `neighbors[0]`, look toward the central atom so the other three point away, and read
  `neighbors[1]`, `neighbors[2]`, `neighbors[3]`. Clockwise from there is `clockwise`.
- `authoredDescriptor` is `"R"`, `"S"`, or `null`. It is the author's claim. The sidecar
  reports it back next to RDKit's answer and does not treat it as input to anything.

### Bond

```json
{
  "id": "b3",
  "a": "c2",
  "b": "c3",
  "order": 2,
  "stereo": null
}
```

`order` is 1, 2, or 3. There is no aromatic order; rings arrive in Kekule form and RDKit
perceives aromaticity itself.

### Bond stereo

```json
{
  "kind": "doubleBond",
  "reference": ["c1", "c4"],
  "arrangement": "cis",
  "authoredDescriptor": "Z"
}
```

`reference[0]` must be a neighbour of `bond.a` and `reference[1]` a neighbour of `bond.b`.
`cis` means those two named atoms are on the same side. This is geometry, not CIP:
`arrangement` and `authoredDescriptor` are different statements and a bridge that confuses
them is exactly what the corpus entry `z-from-low-priority-references` exists to catch.

### Declaring that sanitisation may fail

```json
{
  "expectedError": "AtomValenceException",
  "justification": "...",
  "declaredBy": "problem-id or author"
}
```

CLAUDE.md: RDKit aromaticity perception is a model, not ground truth, and legitimate
reactive intermediates can fail its sanitisation. This declaration is the recorded,
attackable act that says so, in the same spirit as a spectator declaration in
`chem-core/src/state.ts`. It is not a skip:

- Undeclared sanitisation failure is a check FAILURE.
- Declared failure, where the raised exception class matches `expectedError`, is an
  ADJUDICATION item for a human, not a pass and not a failure.
- Declared failure with a different exception class is a check FAILURE, because the
  declaration covered a different problem than the one that occurred.
- Declared, and sanitisation SUCCEEDS, is a check FAILURE. A stale escape hatch is how an
  escape hatch becomes a blanket one.

## Response

```json
{
  "protocol": "blueberry-oracle",
  "version": 1,
  "rdkitVersion": "2026.03.5",
  "pythonVersion": "3.13.9",
  "selfTest": { "passed": true, "cases": [ SelfTestCase, ... ] },
  "states": [ StateResult, ... ],
  "fatal": null
}
```

`fatal` is a string when the request could not be processed at all: wrong protocol, wrong
version, unparseable JSON. When `fatal` is non null, `states` is empty. The bridge throws
on a non null `fatal`.

### SelfTestCase

```json
{ "name": "chfclbr-clockwise-is-S", "expected": "S", "actual": "S", "passed": true }
```

The self test runs on every invocation, through the same code path as real input. It pins
the two conventions that a sign error would otherwise flip silently: the chem-core parity
to RDKit chiral tag mapping, and the cis/trans to E/Z mapping. If `selfTest.passed` is
false the bridge throws and every oracle check fails. A wrong convention makes every
descriptor result wrong in the same direction, which is the failure a green suite would
otherwise hide.

### StateResult

```json
{
  "stateRef": "...",
  "id": "state-1",
  "species": [ SpeciesResult, ... ],
  "buildErrors": []
}
```

`buildErrors` holds structural problems found while translating the payload into an RDKit
molecule: a stereo slot naming an atom that is not a neighbour, a bond naming an unknown
atom, a slot count that is not four. These are data errors, not chemistry results, and
they fail the sanitisation check.

### SpeciesResult

```json
{
  "id": "sp-1",
  "label": "meso-2,3-dibromobutane",
  "sanitization": { "ok": true, "errorKind": null, "error": null },
  "canonicalSmiles": "C[C@@H](Br)[C@H](C)Br",
  "atomDescriptors": [
    { "atomId": "c2", "rdkit": "R", "authored": "R", "agrees": true }
  ],
  "bondDescriptors": [
    { "bondId": "b3", "rdkit": "Z", "authored": "Z", "agrees": true }
  ],
  "unspecifiedPotentialStereo": [
    { "kind": "atom", "ref": "c5" }
  ],
  "meso": {
    "isMeso": false,
    "definedTetrahedralCenters": 2,
    "canonicalSmiles": "...",
    "mirrorCanonicalSmiles": "..."
  },
  "aromaticAtomIds": [],
  "aromaticBondIds": [],
  "aromaticRingCount": 0
}
```

When `sanitization.ok` is false every field after it is `null` or empty. Nothing
downstream of a failed sanitisation is trustworthy and the sidecar does not report a
number it could not compute.

`agrees` is a convenience for a human reading raw sidecar output. The checks recompute the
comparison from `rdkit` and `authored` and ignore it, because a check that trusts the
thing it is checking has checked nothing.

`meso.isMeso` is true when the species has at least two defined tetrahedral centres and
its canonical SMILES equals the canonical SMILES of its mirror image, where the mirror is
formed by inverting every chiral tag and every cis/trans bond. Fewer than two defined
centres reports `isMeso: false`, because a molecule with no stereocentres is achiral
rather than meso and conflating the two would let an unstereo fixture pass a meso
expectation.

## Corpus files

`corpus/*.oracle.json` is the oracle's own input corpus. It is not
`packages/validators/fixtures/`, which another builder owns; when chem-core fixtures land,
the bridge serialises them through `payload.ts` and they join this corpus without a
contract change. Any file in the fixtures directory whose name ends `.oracle.json` is
picked up automatically and must match the corpus shape below.

```json
{
  "protocol": "blueberry-oracle-corpus",
  "version": 1,
  "name": "stereocenters",
  "description": "...",
  "sequences": [
    {
      "id": "s-bromochlorofluoromethane",
      "description": "...",
      "aromaticityInvariantAtomIds": [],
      "states": [ State, ... ]
    }
  ]
}
```

A sequence is an ordered list of states standing for consecutive states of a mechanism.
Atom ids are stable across a step, per the invariant in `chem-core/src/ids.ts`, so the
aromaticity check compares the same atom id between consecutive states.

`aromaticityInvariantAtomIds` is an authored claim that those atoms keep the same
perceived aromaticity across every state in the sequence. It is a claim about the author's
chemistry, not about RDKit's model, which is why contradicting it is a check failure the
author can withdraw, while an aromaticity change anywhere else in the sequence is an
adjudication item.

A `Species` inside a corpus state may carry one extra key the wire format does not have:

```json
"expect": { "meso": true }
```

The bridge strips `expect` before sending and keeps it for the meso check to compare
against. `expect.meso` is required to be present on every species in a sequence that any
meso expectation appears in, so that a species silently losing its expectation is
visible.

### Declaring an unspecified stereo element an artifact

A `Species` may also carry `expect.unspecifiedStereoDeclared`, a list. The key is
optional; absent and `[]` are the same statement, which is that nothing is declared.

```json
"expect": {
  "meso": false,
  "unspecifiedStereoDeclared": [
    {
      "kind": "atom",
      "ref": "c1",
      "justification": "...",
      "declaredBy": "problem-id or author"
    }
  ]
}
```

`kind` and `ref` name one entry of the species' `unspecifiedPotentialStereo` result, so a
declaration is only meaningful after RDKit has answered. That is why it rides in `expect`
and is stripped by the bridge rather than travelling on the wire: the sidecar must not be
able to read a claim it is being used to grade.

An element RDKit reports with no configuration on it is normally a check FAILURE, because
CLAUDE.md's one exception is written narrowly around aromaticity perception and says
nothing about unlabelled stereocentres. Some elements are nonetheless artifacts of how a
state is written rather than centres anybody could pin. The benzenonium sigma complex is
the case this was built for: the corpus writes one localised resonance structure, so the
two ring branches leaving the sp3 carbon are inequivalent to RDKit's CIP ranking, while
the real delocalised cation has a mirror plane through that carbon. This declaration is
the recorded, attackable act that says so, and it follows `sanitizationMayFail` case for
case:

- Unspecified element, nothing declared, is a check FAILURE. Unchanged.
- Unspecified element, declared, with a non empty `justification`, is an ADJUDICATION item
  for a human, not a pass and not a failure.
- Declared with an empty `justification` is a check FAILURE. An unsigned skip is not a
  declaration. The corpus loader also refuses to read the file, and the rule is asserted
  again in the evaluator so it belongs to the check rather than to whichever reader ran
  first.
- Declared, and the element is no longer unspecified, is a check FAILURE. A stale escape
  hatch is how an escape hatch becomes a blanket one.
- Declared, and `ref` names no atom or bond in the species, is a check FAILURE.

`declaredBy` and `justification` are printed verbatim in the adjudication line, so an
adversary reads the reasoning and argues with it. The declaration never suppresses a
descriptor comparison: an authored `R` that RDKit calls `S` still fails, declaration or
no.
