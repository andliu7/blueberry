# Verification report

The prompt set in this repository is a corrected version of an earlier draft. This file records
what was wrong with that draft and why each thing changed, so a decision is not quietly reversed by
someone who does not know what it cost.

Two passes produced these findings. The first checked the draft against the gauntlet pattern's own
failure modes and against the chemistry. The second read the sibling repository `andliu7/blueberry`
and found that four of the draft's assumptions were contradicted by code and measurements already
sitting in it.

Severity: BLOCKER means the run will not start, or will start and produce false confidence.
SERIOUS means it will waste iterations or teach students wrong chemistry. MINOR means worth fixing
and not fatal.

---

## BLOCKERS

### B1. The bar was not fetchable, which is the pattern's most common failure

Alchemie's Mechanisms passes the "named" and "comparable" tests and fails the "fetchable" one. It
is a native mobile app. A subagent on Windows cannot install it, launch it, or screenshot it. The
draft said "the bar is Alchemie's Mechanisms" and gave critics no path to it.

What happens then: the critic reconstructs the app from training data and from the surrounding
prose, then judges the build against that reconstruction. It approves almost anything, because the
imagined bar drifts toward whatever it read most recently. A bar that is perfectly specific in a
human's head is, from the agent's side, a vague bar.

Fixed by `docs/reference/alchemie/`. Critics read committed files by path and never the app name. A
critic that cannot open its assigned file reports that and stops rather than proceeding from memory.
`OBSERVATIONS.md` records structured observations as a supplement. The images themselves are still
outstanding and still block Phase 0.

### B2. Two of the four win axes had no exit condition, in a document that forbade looping on them

The draft named four axes to beat: mobile touch ergonomics, feedback specificity, correctness depth,
visual modernity. Axes two and three are machine-checkable. Axis one is part checkable and part
taste. Axis four is pure taste. The same document then said never loop on aesthetics, because there
is no exit condition for "looks good."

So the win was defined in terms the document forbade itself from measuring. An orchestrator reading
it literally either loops forever on visual modernity or silently drops it, and you would not know
which.

Fixed by splitting every axis into a measured half the loop runs on and a judged half that is a
human gate. See the table in `CLAUDE.md`.

### B3. Six budgets were blank

The draft said, correctly, that validators built on placeholder numbers check nothing, then left six
blanks. Phase 0 cannot emit a CI check for a ceiling written as `___ KB`.

Fixed with values in `CLAUDE.md`, plus two new rows that the codebase survey forced. See B6.

### B4. RDKit could not live where the draft put it

`chem-core` was specified as pure TypeScript at 150 KB, and Phase 0 required RDKit sanitization on
every state. RDKit is a C++ library reachable through Python bindings or an approximately 7 to 10 MB
WebAssembly build. Either one blows the budget by two orders of magnitude inside `chem-core`, and
the Python path is not importable from TypeScript at all.

A builder handed that contradiction does one of three things, all bad: vendors RDKit.js and blows
the gate, hand-rolls something that is not RDKit and keeps the name, or stalls.

Fixed by inverting the relationship. `chem-core` implements valence, mass, charge, and electron
bookkeeping in TypeScript because those must run in the student's browser inside 100 ms. RDKit runs
out of band in CI as the oracle that grades chem-core against a reference implementation. See D3 in
`docs/INHERITED-DECISIONS.md` for the three-engine split this became once the codebase was read.

### B5. Charge conservation would have failed on almost every protonation

"Formal charge conserved across every step" holds only for a closed system, and mechanism drawings
are open. A student protonating a carbonyl with hydronium adds a proton from a species that is often
not drawn. Tracking only the substrate means charge is not conserved and every protonation fixture
fails.

Protonation and deprotonation are the most common steps in the corpus. The suite would have been red
from the first fixture and the loop would have spent all five iterations on a modelling error rather
than an implementation error.

Fixed with an explicit system boundary. A state is a multiset of species. Conservation is asserted
over the multiset. Spectators may be declared and excluded, but declaring one is a recorded act a
validator can see and an adversary can attack.

### B6. The draft targeted the wrong repository, and the reasons are measured

The draft said `apps/web` was the existing Blueberry app and that Phase 3 would extend Blueberry's
SVG renderer. `MECHANISM_TRAINER_PROMPT.md`, already in the Blueberry repo, records a decision not
to put this work there, with two numbers:

- `ketcher-standalone/dist/main.js` is 15.5 MB and `ketcher-react` a further 3.1 MB. Blueberry's
  heaviest existing chunk is 890 kB and already had to be made lazy.
- Blueberry commits build output to git. Vite content-hashes filenames, so every build writes blobs
  that never delta-compress. Its `.git` is 34 MB against a packed size of 862 KiB.

Fixed. `apps/web` is a new app in this repository that borrows Blueberry's visual language.
Blueberry is a read-only reference. See D1.

### B7. Three chemistry engines were in play with no job assignment

Beyond `chem-core` and RDKit, the sibling repo already loads Indigo through `ketcher-standalone`,
and `src/lib/checkAnswer.ts` already uses it for canonical structure comparison. The trainer prompt
separately proposed adding `@rdkit/rdkit` WASM to the client for the same job.

Left unassigned, different builders pick different engines in different files, and one of them adds
a second multi-megabyte payload to do work the first already does.

Fixed by the table in D3. chem-core for per-interaction checks, Indigo for canonicalization on lazy
routes, RDKit in CI only. `@rdkit/rdkit` is not a client dependency.

---

## SERIOUS

### S1. "SN1 racemizes" is not correct

SN1 gives partial racemization, not complete racemization. Ion pairing shields the front face
briefly, so the inversion product is typically in excess, with reported ranges commonly running from
roughly 50 to 80 percent racemization with net inversion depending on substrate, solvent, and
leaving group.

A validator asserting a 50:50 ratio fails on correct chemistry, and an app built on it tells
students something an instructor will mark wrong. The assertion is now "both configurations present
at the reaction center, mechanism recorded as stereorandom." Ratio is an authoring annotation.

### S2. "Neopentyl hindrance flagged as SN2-blocking" overstates it

Neopentyl halides do undergo SN2, roughly 10^-5 times slower than ethyl. Useless in practice, not
forbidden in principle. A boolean block is chemically wrong and pedagogically wrong, because the
interesting thing about neopentyl is that it is slow enough for competing pathways to win, including
methyl shift to a tertiary cation. That is the lesson, and a hard reject deletes it. Steric
accessibility is now a graded score with named tiers.

### S3. Anti-periplanar as a hard E2 requirement has known exceptions

Syn-periplanar E2 is real in conformationally locked systems where anti geometry is inaccessible.
Hard-rejecting anything outside the anti window marks correct answers on bicyclic and constrained
cyclic substrates invalid. Now: require periplanarity, prefer anti, flag syn as needing an authored
conformational justification.

### S4. CIP from scratch is a multi-week project with a correctness cliff

Correct CIP needs the hierarchical digraph with duplicate atoms, ring handling, and like/unlike
auxiliary descriptors. Shipped implementations have carried bugs in this for years. A builder given
one bullet produces something right on simple stereocenters and wrong on exactly the cases a course
cares about. chem-core no longer implements CIP; it computes geometry and RDKit labels.

### S5. Mass conservation and implicit hydrogens interact badly

A proton transfer changes implicit H counts on two atoms and nothing else. A mass check walking
explicit atoms reports conservation while the molecule silently gained or lost a proton. That is
precisely the class of bug the adversary exists to find, and it would have found it on iteration
four after three were paid for. Now a required Phase 0 broken fixture.

### S6. The adversary had Write and Edit behind a prose restriction

Granting Write and Edit to an agent whose job is finding ways around boundaries, then telling it in
prose to touch only fixtures, is an honor system. Now: named path prefixes, commit before and after
so the diff is auditable, and an orchestrator step that rejects any run whose diff leaves those
prefixes.

### S7. Suite integrity had no mechanism

The draft asked the validator to confirm the suite was unmodified since the last run and gave it no
way to know. It would skip the step or invent a confirmation. Now a committed
`validators.lock.json` of file hashes, compared before any result is reported.

### S8. Three exit conditions were not executable

- 60 fps on two named physical devices. No device farm exists in the loop. Now an automatable proxy
  gate in headless Chromium plus a human gate, with the agent producing a repeatable measurement
  script rather than claiming a number it cannot obtain.
- The RLS attack test needs a live Supabase project and two seeded accounts. Right instinct, right
  test, but a prerequisite rather than something the loop can conjure. Now named in the FILL block.
- A load test proving a spend ceiling works would spend real money and could trip the ceiling. Now
  a mock endpoint returning synthetic token counts, plus one live call for the accounting path.

### S9. Two real gaps inherited from the sibling app

`src/lib/progress.ts` writes to localStorage and never touches Supabase, despite
`mechanism_attempts` existing in the schema for exactly that, and it is a mutable status map rather
than append-only. Separately, the AI spend gate lives in a Google Apps Script outside the repo, so
it is unproven rather than absent. Both are now inherited work rather than patterns to copy. See D7.

---

## MINOR

- **M1.** Three overlapping source documents disagreed with each other, including on whether sterics
  and hybridization checks existed and whether drag-free completion was required. One canonical
  `CLAUDE.md` now wins every conflict.
- **M2.** The three-way result type missed a fourth case: a student reaching the correct product by a
  legitimate alternative route. Grading that as "not the requested transformation" is unfair and
  generates support mail. Now `correct_alternative_route`, carrying the route name.
- **M3.** The five-iteration cap contradicts the gauntlet pattern's rule that exits should be
  comparative rather than counted. Kept anyway, and correctly: these exits are numeric, so a cap is a
  circuit breaker. A cap on a taste gate would be a way to ship something that lost.
- **M4.** Over-specification. The pattern prescribes 120 to 180 words; this prompt set is far longer.
  Upheld, because here the constraints are the product. Valence rules are not the agent's to invent.
  What was stripped is prescribed file layout inside packages, which is the agent's call.
- **M5.** "The existing mascot behaviour machine" and "the existing SVG renderer" were referenced
  without paths, so an agent would grep, guess, and possibly rebuild what Phase 4 forbids rebuilding.
  Now in the FILL block.
- **M6.** Nothing stopped a builder refactoring the existing app. Now an explicit read-only rule plus
  branch-per-phase discipline.
- **M7.** Stylus was omitted entirely, though the trainer prompt names iPad Safari and Apple Pencil as
  first-class. Pen is now a distinct pointer type in Phase 2, not folded into touch. See D11.
- **M8.** The phases do not each end in something clickable, which the trainer prompt asked for.
  Named rather than hidden, with the Ketcher anchoring spike as the resolution. See D13.

---

## What was already right and is worth protecting

The strongest idea in the original draft is the split in its own Note 1: run the full
builder/validator/adversary loop only on the correctness-critical machine-checkable phases, and use
single-pass builders on rendering, game feel, and onboarding copy. Most people apply the gauntlet
uniformly and then wonder why the UI loop never terminates.

Also correct from the start: validators denied Write and Edit, builders never grading their own
work, results never boolean, metering shipped with the AI feature rather than retrofitted, RLS
written before any client read, and requiring the validator suite to prove it fails on deliberately
broken fixtures before anything else begins. That last one is the highest-leverage instruction in
the whole set.
