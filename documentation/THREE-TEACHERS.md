# Three teachers: the borrowable qualities, named

From the Three Teachers artifact (owner, 2026-09-04:
https://claude.ai/code/artifact/b2d91a3f-098b-4c62-a93d-42a00f8ca0be). Recorded here because
a quality a builder can act on has to live in the repo, not in a link.

Its thesis is worth keeping: "I want it to feel like X" is a correct instinct that dies when
you type it at an agent, because the agent does not know WHICH three things about X you
mean. So each borrow below is named as a testable sentence rather than a product name. The
bars in CLAUDE.md are unchanged; this is vocabulary for briefs, not a new bar.

## Duolingo, the funnel and the face

- REACTION TONE IS GRADED, NOT BINARY. A near miss gets a squint and a "so close"; a
  flat-out wrong answer gets a different face. Ours currently treats wrong as one state.
  This is the single most actionable line in the artifact and it lands on the Berry
  emotions and states work
- THE MASCOT REACTS WITHIN 200 MS. A number, so it can be measured
- PERSONALISE BEFORE YOU COMMIT: the motivation and level questions come BEFORE signup, so
  the app already knows the student before it asks for anything. Ours already does this;
  the artifact names why it works
- A REAL WIN BEFORE THE ASK: a whole lesson is finished before any paywall appears
- SCREENS THAT ONLY BOND. At least one onboarding screen teaches nothing and exists so the
  mascot is a relationship rather than a UI element
- PERMISSIONS ASKED LATE, after value is felt, and re-asked later if declined. Never screen
  one
- THE GOAL IS CHOSEN, NOT ASSIGNED. A self-picked daily target is why a streak feels earned

### The anti-pattern, and it validates a decision already made

Duolingo's newer ENERGY system deducts on every question, right or wrong, and is reported as
feeling more restrictive than the hearts it replaced. `docs/ECONOMY.md` already rules that
mistakes never cost charge and that the empty state says so in its own words. That ruling is
now externally corroborated: the bar tried the other thing and it reads worse. P5 must not
drift toward it, and the empty-charge copy should keep saying the quiet part out loud.

### Funnel length, honestly

20 to 40 screens works for someone idly curious about Spanish. Our student is stressed, has
an exam, and arrived on purpose. Seven steps stays right; borrow the SHAPE (one question per
screen, bond, choose the goal), not the length.

## Anki, and Alchemie

Their borrows were already settled: the scheduler over the attempt history, and the arrow
interaction judged against the committed captures. Nothing in the artifact reopens either.

## Seven card ideas for the Cards tab

Recorded as a queue, not scope. Each is generated from material the app already has, which
is why they are cheap:

1. FORK CARDS: shown an intermediate and its conditions, name which path wins and why.
   Grades against the authored reactivity ladder
2. CLOZE-ARROW CARDS: a completed mechanism with exactly one curved arrow erased; redraw
   that one. Authored by masking a step from any lesson attempt already graded
3. NAMED-CAUSE CARDS: every distinct cause id chem-core has handed back becomes a standing
   card. A pure projection of the engine's own vocabulary
4. OCCLUSION SPECTRA CARDS: mask one peak or splitting pattern in a labelled NMR or IR
   spectrum. Matches the Detective costume already planned for structure elucidation
5. COMPARE-CONTRAST PAIRS: same substrate, two conditions, two products side by side.
   Trains fork reasoning without a full interactive problem
6. RETROSYNTHESIS REVERSE CARDS: shown the product, recall the reagents. The mirror of the
   synthesis gap beat, from the same authored routes
7. SAY-IT CARDS: record yourself naming the reaction or narrating the mechanism, self
   graded. For the walking-to-class case

## The screen spec, and how it relates to the authoring form

The artifact carries a seven field SCREEN spec (screen and tab, one sentence job, entry,
states, the one UI effect, and so on). `docs/AUTHORING-QUESTIONS.md` carries a five row
QUESTION TYPE form. They are not rivals and neither replaces the other: the screen spec
describes a SURFACE, the authoring form describes an ANSWER SHAPE. A new question type
usually needs both, filled in that order.
