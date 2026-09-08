# The Orgo Competency Score

Owner specification, 2026-09-06. This is the answer to "how good am I?", which is a
different question from XP ("how much have I done?") and streak ("did I show up?").
`docs/ECONOMY.md` already draws that line: **XP for effort, mastery for ability**. This file
is what mastery becomes.

It also unblocks P6. That piece was judged against "Duolingo Score in the committed
captures" and stopped, correctly, because no such capture exists: the 547-screen
`mobbin/Duolingo ios Jan 2026` set carries the profile (#463, which advertises "Add your
Duolingo Score to LinkedIn"), the achievements wall (#474 to #476) and the settings tree,
and no Score screen. **The bar is this file from now on.** A specification a critic can read
beats a screenshot a critic has to interpret, and this one names the mechanism rather than
the pixels.

## Part 1, what Duolingo actually does, and why it matters here

Duolingo moved from XP and streaks to the **Duolingo Score**, 10 to 160, because the
gamified numbers had stopped meaning anything about ability.

**Item Response Theory.** Every exercise carries a hidden difficulty parameter and a
discrimination parameter. A correct answer on a hard item moves the latent trait more than
a correct answer on an easy one; a miss on an elementary item moves it down and triggers
calibrating questions. The score is not a running percentage of right answers.

**A published band mapping.** The 10 to 160 range maps onto CEFR: 10-29 A1, 30-59 A2, 60-99
B1, 100-129 B2, 130-160 C1/C2. The number is meaningless without the bands, and the bands
are what make it portable.

**Subscores, in two layers.** Individual: Speaking, Writing, Reading, Listening. Then
*integrated* pairs, because real tasks fire several skills at once: Literacy = Reading +
Writing, Comprehension = Reading + Listening, Conversation = Speaking + Listening,
Production = Speaking + Writing.

**The three problems it solves**, and all three are ours:

1. **The passive user.** A 1,000 day streak spent on easy review is high XP and low ability.
   The score decouples grinding from mastery.
2. **Cognitive load.** Knowing the latent capability lets the app serve work in the zone
   between boredom and frustration.
3. **Trust outside the app.** Alignment with the Duolingo English Test is what lets an
   institution believe the number. Our equivalent is the MCAT and the DAT.

## Part 2, what the neighbours do

| Platform | Shape | The idea worth taking |
|---|---|---|
| **Khan Academy** | Course mastery 0-100%, a state machine: Not started, Started, Familiar, Proficient, Mastered | Mastery unlocks only through spaced cumulative challenges, so cramming cannot buy it |
| **LeetCode** | Elo contest rating plus a per-tag proficiency map (Dynamic Programming 42%) | The rating moves by DIFFICULTY faced, not by problems counted, and the tag map says where you are weak |
| **Brilliant** | No number: conceptual node completion over a visual topology | A downstream node does not unlock until the intuition upstream is demonstrated |

CLAUDE.md already names chess.com's Elo as the inspiration for our rating and Anki for the
scheduler. LeetCode's tag map is the missing third: a single number cannot tell a student
what to do next.

## Part 3, the Orgo Competency Score

### The scale

**100 to 800**, deliberately MCAT-shaped so the number reads as familiar to the student who
is actually buying this.

```
[100] ---------> [400] ---------> [600] ---------> [800]
 Foundational   Single-step      Multi-step      Macromolecules
 chemistry      reactions        synthesis       and med-chem
```

### The four subscores

These are the cognitive skills Orgo II actually separates, and they are not interchangeable:

| Subscore | What it measures |
|---|---|
| **Electron Tracking** | Arrow mechanisms, nucleophile and electrophile identification, 3D stereochemistry: R/S, chair conformations |
| **Retrosynthetic Logic** | Reading a target backwards to simple starting materials |
| **Spectroscopic Decoding** | Deducing a structure from raw NMR, IR and mass spec output |
| **Biochemical Bridge** | Applying mechanisms in biological context: peptide bonds, amino acid synthesis, metabolic steps |

### The integrated pair scores

Duolingo's insight, applied: real problems fire more than one skill.

- **Mechanism Proficiency** = Electron Tracking + Retrosynthetic Logic
- **Diagnostic Accuracy** = Spectroscopic Decoding + Electron Tracking

### The tiers

| Range | Tier | What the student can do | MCAT read |
|---|---|---|---|
| 100-299 | Foundational | Functional groups, formal charge, Lewis and skeletal structures, R/S assignment | Critical deficit on chemical foundations |
| 300-499 | Intermediate | Major and minor products for single steps: SN1, SN2, E1, E2, simple additions. Carbocation rearrangements | Baseline, handles discrete questions |
| 500-649 | Advanced | Three to five step synthesis through carbonyl chemistry: aldol, Claisen. Structures from combined IR and 1H-NMR | 75th to 90th percentile on passages |
| 650-800 | Mastery | Novel mechanisms for complex rearrangements, biological reactions by explicit arrow pushing, 2D-NMR | 95th percentile and above |

## Part 4, how this lands on what already exists

**The rank ladder is not replaced.** `packages/economy/src/rules.ts` already carries six
named ranks with claims, on a 0 to 100 scale:

| Rank | At | Claim |
|---|---|---|
| Reader | 0 | Name the structure, spot the reactive site |
| Arrow Pusher | 16 | Move electrons the right way for the right reason |
| Mechanist | 31 | Predict a product from an unseen mechanism |
| Synthesist | 51 | Plan a two or three step route forward |
| Retrosynthesist | 71 | Work backwards from a cold target |
| Exam Ready | 86 | Handle a full mixed exam under time |

That ladder is already the Duolingo Score idea: a named ability rung that carries a claim.
The OCS adds the three things it does not have, and takes nothing away.

1. **A numeric scale a student recognises.** 100-800 beside the rank name, the way Duolingo
   prints 120 beside B2. The rank stays the headline; ECONOMY.md's permanent floor rule is
   untouched, "once a Mechanist, always a Mechanist".
2. **The four subscores.** One number cannot say what to practise. This is LeetCode's tag
   map and it is the part that changes what a student does tomorrow.
3. **Difficulty-weighted movement.** Today mastery counts cleared nodes. Under IRT a clear
   moves the score by the item's difficulty against the student's current estimate, so
   replaying easy nodes stops paying.

### The engine, in the order it should be built

1. **Difficulty on every item.** Authored problems already carry a `difficulty`; it becomes
   the IRT difficulty parameter. Discrimination can start at a constant and be fitted later
   from real attempt data, and saying so is more honest than inventing one now.
2. **Score derived, never stored.** Same rule as every balance in `app/progress.ts`: the
   journal is the truth and the score is a projection of it. A stored score is a score that
   drifts, and CLAUDE.md puts anything that gates or costs behind the server.
3. **Subscores from the answer shape.** A mechanism beat feeds Electron Tracking, a
   synthesis gap feeds Retrosynthetic Logic, a spectra question feeds Spectroscopic
   Decoding. The mapping lives in one table, not scattered at the call sites.
4. **The prerequisite graph.** Every reaction is a node in a directed acyclic graph:
   Grignard is not tested until carbonyl reactivity and alkyl halide formation are
   proficient. `demo/pathwayMap.ts` already has the units and nodes; what it lacks is edges.
5. **Adaptive step length.** A failed five step retrosynthesis is re-served at two steps to
   isolate which reagent broke it. This is the Zone of Proximal Development in practice and
   it is the payoff for having a latent estimate at all.

### What it must not do

It never gates content behind a score, and it never prices a mistake. `docs/ECONOMY.md`'s
mitigation set stands: wrong answers cost nothing, the visible dip is capped, and rank
floors are permanent. A score that can fall far enough to lock a student out is the
anxiety mechanic that section exists to prevent.

It is computed server side from the append-only attempt history, per CLAUDE.md's
non-negotiables, because a client that can write its own ability score is a client that can
claim to be Exam Ready.
