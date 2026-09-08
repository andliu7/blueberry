# Testing notes

Things learned the expensive way. Read before writing tests in a new package.

## The Stryker and Vitest false survivor

**Symptom.** Your mutation score is lower than it should be, and mutants you are certain your tests
kill are reported as Survived with covering tests and zero killers.

**Cause.** When a mutant breaks module load, the test file fails at import. Vitest then reports a
failed FILE with zero failing TESTS. Stryker reads failing tests, sees none, and records the mutant
as survived. Every test file that builds its fixtures at module scope is exposed, because a mutant
in a constructor those fixtures call takes the whole file down before a single test runs.

**Fix.** Build test data inside `it()` bodies, never at module scope.

**Evidence.** In `packages/chem-core`, restructuring the existing tests this way moved the score from
92.18 to 93.59 percent with no new assertions written. Those kills were always real and were being
miscounted. Two of the false survivors were `allElements()` and `allMechanismRoutes()` with their
bodies removed, which no plausible test suite would actually miss.

**Where it will bite next.** `packages/curriculum`, and any package that adopts the same stack.

## Why the mutation gate is split in two

`npm run mutate` takes minutes. A check that slow inside `npm run validate` means validate gets run
once a day instead of once an edit, and a check nobody waits for is a check nobody runs.

So the slow command writes a record, and a fast check reads it on every validate. The obvious hole
is measure once and coast forever, and it is closed by a fingerprint stored in the record covering
`chem-core` `src`, `test`, and both config files. Change the engine or delete a test and the check
fails as STALE and names the command that fixes it.

Covering the test files is the part that matters. A fingerprint over `src` alone would let someone
delete half the suite and keep a green gate.

This has fired unprompted twice, both times when a builder touched `causes.ts` and did not think
about the mutation score.

## STALE and MODIFIED are different verbs

Two integrity mechanisms exist and they mean different things. Do not conflate them.

- **MODIFIED**, from `validators.lock.json`, means the suite itself changed. The correct reaction is
  to refuse to report results, because a suite edited by the agent under test is not evidence.
- **STALE**, from the mutation record, means the subject changed since it was measured. The correct
  reaction is to force a fresh measurement, not to refuse.

The suite exists to grade `chem-core`, so `chem-core` is deliberately outside the lock's fingerprint.
Reporting MODIFIED on every engine edit would say that improving the thing under test invalidated
the evidence, which is backwards.

## What the lock covers outside its own package

The lock hashes `packages/validators`, plus a declared set of external data that validator
assertions read as an answer key. Today that is the `competingRoutes` arrays in
`packages/feedback`, extracted from source text, plus the two files that serve them.

Two rules worth knowing before adding a dependency:

- The declaration is enforced by a census over the import graph. An undeclared package imported for
  its values is a hard stop, and `lock regen` refuses to write while a finding exists, so
  regeneration cannot bless the thing it should be catching.
- Fingerprint the projections used as an answer key. Never fingerprint what the suite exists to
  react to.

Known gap, unfixed: `packages/feedback` is consumed as built `dist/` while the lock fingerprints
committed `src`. A stale build means a check runs on data the lock never saw.
