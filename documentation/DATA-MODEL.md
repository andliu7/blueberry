# Data model

Units, tracks, lessons, beats, molecules, mechanisms, review items, progress. Explanation first,
then the JSON shape. Nothing is built from this until the questions in `OPEN-QUESTIONS.md` are
answered.

Companion file: `data-model.example.json` holds Unit 0 filled in for real.

---

## The one structural decision everything else follows from

**A lesson is a sequence of beats, and a beat is a discriminated union.** Not a list of questions.

The reason is that §3 puts three different things in the same sequence: a question, an animation,
and a drawing task. If a lesson is `Problem[]`, the animation has to be smuggled in as a fake
problem with no answer, and every consumer grows an `if (problem.isReallyAnAnimation)`. If a beat is
a union tagged by `kind`, then adding "watch the intermediate form" is a new variant and a new
renderer, and the runner, the progress bar, and the review queue do not change at all.

This is the same shape `packages/curriculum` already uses for its five answer kinds, so it is a
widening of a decision we already made and validated, not a new one.

```
Course ─┬─ Unit ─┬─ Track ─┬─ Lesson ─── Beat[]
        │        │         │
        │        │         └─ prerequisite edges point at (unit, track), never at a lesson
        │        └─ 2 or 3 per unit: concepts | mechanisms | synthesis
        └─ Unit 0 is a real unit with an early unlock, not a special case
```

### Why Track is an entity and not a string on Lesson

§2: "a student can be deep in Mechanisms while still early in Synthesis." That means unlock state,
completion percentage, and the review queue all key on `(unitId, trackKind)`. If track were a label
on the lesson, every one of those queries becomes a scan-and-group, and the path cannot render a
branch without loading every lesson in the unit. As an entity it is one row, it carries its own
`orderIndex` and colour, and the path renders from ids alone.

It also makes "Spectroscopy has no Mechanisms track" representable by absence rather than by a
special case. A unit has the tracks it has.

### Why molecules are referenced, never inlined

A molecule appears in many beats across many lessons. Inlined, a correction to acetone's layout has
to be made in nineteen places and will be made in eighteen. Referenced by `moleculeId`, it is made
once. The same argument applies to mechanisms.

This also gives the sandbox and the reaction search something to point at, and it is what makes
"restrict lessons to a predefined set of reactants and reagents" (§6) enforceable: the lesson author
picks from `molecules`, and a validator can assert every `moleculeId` in every beat resolves.

### Why a mechanism step is a BE-matrix delta and an arrow is a view of it

§6 says keep the bond-electron matrix authoring model because it structurally prevents
spectator-omission errors. Concretely: a step is a delta over the **whole multiset** of species. A
proton that leaves has to go somewhere, and the delta will not balance if the author forgot to say
where. An arrow drawn on screen is then a *rendering* of one entry in that delta, and grading
compares deltas, not pictures.

The practical consequence is that "the student drew the right arrows in the wrong order" and "the
student drew an arrow we did not anticipate but which produces the same delta" are both answerable,
which is what §6's partial credit needs.

### Why review items live outside the lesson

§3 item 6 and the Lichess model. A `ReviewItem` points at the beat, the concepts it exercised, and
the attempt that created it. It is not a copy of the question. That way re-drilling a review item
runs the same beat through the same runner, and a fix to the beat fixes the review too.

Decay is a scheduler field on the review item (`dueAt`, `interval`, `ease`), which is where the Anki
borrow in CLAUDE.md lands. "1 mechanism is fading" reads `dueAt <= now`.

### Progress is server-authoritative

`Progress` below is the **shape of what the server returns**. The client keeps a rendering cache
with the identical shape behind the `ProgressSource` seam that already exists in
`apps/web/src/app/progress.ts`. Nothing in this file is a client-writable table. XP, rating,
currency, and unlock state are computed from `Attempt[]`, which is append-only.

---

## Entities

### Course
Top level. Orgo 2 is the flagship; Orgo 1, Gen Chem I/II, DAT, MCAT already exist as ids.

### Unit
One of the 15 topics in §2, plus Unit 0. Carries `orderIndex`, display `colour`, a one-line
`description` for the path banner, and an `unlockPolicy`.

Unit 0 (`Intro to Carbonyls`) sits before Unit 7 in `orderIndex` terms but carries
`unlockPolicy: "early"`, which is how §2's "sits before Unit 7 and is unlocked early" is expressed
without a hardcoded exception.

### Track
`concepts | mechanisms | synthesis | structure_determination`. Two or three per unit. Carries its
own `prerequisites: TrackRef[]`.

### Lesson
6 to 10 beats. Carries `kaiVideoId?` and `readingId?` for the §3 item 2 pair — the transcript is a
sibling of the video, never a child, because a lesson may ship the reading before the video exists
and must still stand.

### Beat
The union. `kind` discriminates. Every beat carries `beatId`, `conceptIds[]` (what it exercises —
this is what the end-of-lesson concept cover reads), and `xp`.

Concept beats, from §4:
- `matching` — pairs, with a `presentation` of `connectors | columns` (see question 2)
- `draw_molecule` — carries `stage: "trace" | "guided" | "freehand"` and a `targetMoleculeId`
- `rank_order` — an ordered list plus the `criterion` (`pka | reactivity_sn2 | ...`) and a
  `sourceExam?` so a set pulled off a real exam front page is traceable
- `group_recognition` — a yes/no on a named functional group, with `timed: true` and a `parScoreMs`
- `stereochemistry_3d` — needs the real 3D molecule; carries `task: "assign_rs" | "assign_resi" |
  "rank_priorities"`. Priority tapping is `rank_priorities` and is graded on the tap ORDER

Reaction beats, from §5:
- `draw_arrows` — the core. References a `mechanismId` and a `stepIndex`. Intermediates are their
  own beat, so a three-step mechanism is three `draw_arrows` beats plus the animation beats between
- `species_roles` — nucleophile / base / leaving group / spectator assignment over the species on
  the canvas
- `animation` — unlocked, never shown before an attempt (§12). Carries `mechanismId`, `stepIndex`,
  and `controls: ["rewind","replay","speed"]`

Support beats:
- `reading` — the formatted transcript
- `video` — Kai, skippable
- `micro_quiz` — the couple of quick questions about what is currently on screen

### Molecule
`smiles`, optional `molfile`, a `displayName`, a `card` (the §3 molecule card, toggleable), and
`layoutHints` for the renderer. `beMatrix` is derived and cached, never authored by hand.

### Mechanism
Ordered `steps[]`. Each step carries `delta` (the BE-matrix change over the multiset), the
`arrows[]` that are the canonical rendering of that delta, an authored `explanation`, and
`distractors[]` — the Tier 2 anticipated wrong answers that already exist in our curriculum schema.

### ReviewItem
`beatId`, `conceptIds`, `sourceAttemptId`, `dueAt`, `interval`, `ease`, `origin: "missed" | "kept"`.
`kept` is the student choosing it at the concept cover; `missed` is automatic.

### Attempt
Append-only. `beatId`, `submitted` (shape depends on beat kind), `resolution` (the four result types
from CLAUDE.md), `causeId?`, `distractorId?`, `elapsedMs`, `createdAt`. Everything else is derived
from this table.

### Progress
Derived and returned by the server: `xpTotal`, `rating`, `cash`, `streak`, per-track
`{completedLessonIds, percentage, unlocked}`, and `reviewDue`.

---

## Naming note

CLAUDE.md says the currency is Diamonds. §10 of the new framework says cash. The JSON below uses
`cash` and this is flagged as question 7, because CLAUDE.md is the file that wins on conflict and
one of the two has to be edited.

## Owner direction, 2026-08-26: reactions split into reaction lessons

The reaction database is not a monolith the trainer points at. Every reaction gets split up and
placed into the reaction lessons: a reaction's mechanism becomes `draw_arrows` beats, one per step,
inside the owning topic's Mechanisms track, with the intermediates as their own beats between. The
`Mechanism` entity above is already shaped for this (steps are addressable by `stepIndex`, beats
reference `mechanismId` + `stepIndex`), so the split is authoring work, not schema work. The
reaction search keeps reading the same rows; a lesson and a search result point at one shared
mechanism, never at two copies.
