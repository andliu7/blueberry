# Authoring format: how to hand over a question type

Owner asked, 2026-09-03: "If I were able to design the curriculum or change the curriculum,
that process should be replicable... make a format so that I can give you question types
later on."

This is that format. It exists so a new question type is a FILLED FORM rather than a
conversation, and so the same form works whether the type is a synthesis, a predict the
product, or something neither of us has thought of yet.

## Why a form at all

Every question type in this product has to answer the same five questions before a line of
code is worth writing, and every type that skipped one of them cost a round. The form is
those five questions in a fixed order. Fill it in prose; do not write code. If a row is
genuinely not known yet, write UNKNOWN rather than a guess, because UNKNOWN is a question
someone can answer and a guess is a bug someone will inherit.

## The form

```
TYPE NAME:            one or two words, the name a student would recognise

1. WHAT THE STUDENT DOES
   The physical gesture. Taps one of four. Drags a reagent onto a slot. Pushes an
   arrow between two atoms. Orders four cards. Types a number with units.

2. WHAT COUNTS AS THE ANSWER
   The shape of the thing being graded, not its content. One choice. An ordered
   list of reagents. A set of arrows across steps. A structure. A number plus a unit.

3. HOW IT IS GRADED
   Which engine decides, and what "right" means when it is not simply equal:
     - chem-core for anything with electrons; resolves to the four result types
     - canonical structure equivalence for a drawn or chosen structure
     - an authored answer with accepted equivalents for reagents
     - exact or tolerance match for a number, and say which and what tolerance
   Name the ACCEPTED ALTERNATIVES here. This is the row that is always
   underestimated: a student who is right by another route must not be told they
   are wrong.

4. THE THREE WAYS TO BE WRONG
   List the specific mistakes a real student makes on this type, each with the
   sentence you would say to them. These become Tier 2 authored distractors, which
   is where the feedback axis is actually won. Three is a floor, not a target.

5. WHAT IT LOOKS LIKE
   Either a reference image, or a sentence naming an existing surface it behaves
   like ("same frame as the MCQ beat, but the options are structures").

OPTIONAL, and worth filling when known:
6. WHERE IT SITS in the lesson template: hook, recognise, connect, order, produce,
   recycle. If it can be more than one, say which is primary.
7. WHAT IT GATES: a later unit or reaction family that should not open until this
   type is passed.
8. CARDS: what a mistake on this type should become as a flashcard, if anything.
```

## A filled example, so the form is unambiguous

```
TYPE NAME:            Supply the reagents

1. WHAT THE STUDENT DOES
   Drags reagent chips from a bank onto empty slots on a synthesis arrow. Slots
   fill in any order; the sequence is what is graded.

2. WHAT COUNTS AS THE ANSWER
   An ordered list of reagent sets, one per arrow.

3. HOW IT IS GRADED
   Against an authored answer with accepted equivalents. Order matters between
   steps and does not matter within a step. Accepted alternatives: any reagent set
   that reaches the same intermediate by a route the authored answer names as
   valid. Read backwards this is retrosynthesis, and it is graded by the same
   comparison run in the other direction; it is not a separate type.

4. THE THREE WAYS TO BE WRONG
   - Right reagents, wrong order: "These are the right reagents. Nitration has to
     come before reduction here, because the amine would be protonated in the acid
     and stop directing."
   - A reagent that works in principle but not in these conditions.
   - Skipping a protection step, which is the most common one on real exams.

5. WHAT IT LOOKS LIKE
   docs/reference/design-goals/blueberry_r9-lesson-synthesis_*.png

6. WHERE IT SITS: produce.
7. WHAT IT GATES: the acyl ladder cannot open until this passes once.
8. CARDS: a missed step becomes a three-sided card, setup / conditions / product.
```

## What happens after you hand one over

1. The form becomes a schema entry in `packages/curriculum`, its grading a pure function
   with the accepted alternatives as fixtures, and the three wrong ways as its first tests
2. The interaction gesture goes to `packages/interaction`, which stays pure TypeScript
3. The surface is built as a beat and judged against the reference in row 5
4. Row 4's sentences are authored copy and go through the human gate, like all copy

The point of the split is that rows 1 to 4 are chemistry and pedagogy, which are yours, and
only row 5 is design. A question type handed over as this form can be built without another
conversation about what it means.

## Changing the curriculum, not just adding to it

The same replicability applies to content. The pathway is generated from
`apps/web/src/demo/pathwayMap.ts`, where a unit is a title plus a list of lessons and each
lesson names its topic, its blurb, and what it gates. Adding a unit, reordering lessons, or
moving a reaction between units is an edit to that data, and the path, its branches, its
node labels and its gates redraw from it. Nothing about the pathway's appearance is
hand-placed per unit, which is what makes a curriculum change a data change rather than a
design job. The per-unit backgrounds vary from a placement table keyed by unit, so a new
unit gets a scene without anyone drawing one.
