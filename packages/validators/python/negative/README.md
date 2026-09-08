# Deliberately broken input

Nothing in this directory is read by any check. `packages/validators/src/checks/oracle/`
scans `../corpus/` only.

`docs/VERIFICATION.md` calls "requiring the validator suite to prove it fails on
deliberately broken fixtures before anything else begins" the highest leverage instruction
in the whole set. These files exist so that claim stays checkable by hand rather than
becoming a thing somebody once said was true.

Each file is corpus shaped, so the way to use one is to copy it into `../corpus/`, run the
suite, watch it go red, and take it out again. Windows PowerShell 5.1, and the lock has to
be regenerated on the way in and on the way out because the integrity check hashes every
file in the package:

```powershell
Copy-Item packages\validators\python\negative\undeclared-sanitization-failure.oracle.json packages\validators\python\corpus\
npm run lock:regen
npm run validate           # expect SUITE: fail
Remove-Item packages\validators\python\corpus\undeclared-sanitization-failure.oracle.json
npm run lock:regen
npm run validate           # expect SUITE: pass
```

| File | The check it must break | The failure it must name |
|---|---|---|
| `undeclared-sanitization-failure.oracle.json` | `oracle-sanitization` | pentavalent neutral carbon, `AtomValenceException`, nothing declared |
| `stale-may-fail-declaration.oracle.json` | `oracle-sanitization` | a `sanitizationMayFail` declaration on a state that sanitises cleanly |
| `wrong-cip-descriptor.oracle.json` | `oracle-stereo-descriptors` | authored `R` where RDKit says `S`, same molecule as the passing corpus entry |
| `wrong-ez-descriptor.oracle.json` | `oracle-stereo-descriptors` | authored `E` on cis-2-butene |
| `wrong-meso-expectation.oracle.json` | `oracle-meso-detection` | `expect.meso` true on the (2R,3R) diastereomer |
| `stereo-slot-not-a-neighbour.oracle.json` | `oracle-sanitization` | a stereo slot naming an atom the centre is not bonded to |
| `broken-aromaticity-invariant.oracle.json` | `oracle-aromaticity-stability` | ring carbons declared invariant across the step that dearomatises them |
| `undeclared-unspecified-stereo.oracle.json` | `oracle-stereo-descriptors` | the arenium's sp3 carbon reported unconfigured by RDKit with nothing declared about it |
| `stale-unspecified-stereo-declaration.oracle.json` | `oracle-stereo-descriptors` | an `expect.unspecifiedStereoDeclared` entry on a benzene carbon RDKit says nothing about |

`declared-sanitization-failure.oracle.json` is the one file here that must NOT fail the
suite. It carries a `sanitizationMayFail` declaration whose `expectedError` matches what
actually happens, so it produces an ADJUDICATION line and a passing run. Copy it in to see
the adjudication channel carry something, and read the justification in it: it is a
deliberately thin one, because the point of that declaration being recorded and attackable
is that an adversary can read it and argue with it.
