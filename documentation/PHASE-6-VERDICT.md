# Phase 6, the Verdict

Written 2026-09-23, at commit `55550c8`, covering the 22 commits from `b48f7af`.
Nothing in this file ships. It is the record of what was built, why, and what still loses.

The one thing to know before reading: **three separate times this month the product told a
student something chemically untrue, and every one of them was caught by a critic measuring
the running app rather than by a test or a review.** That is the finding of Phase 6, and the
rest of this document is detail.

---

## What the trainer does now

A student draws arrows on a molecule. The grader answers in one line, and the rest waits
behind a tap.

**The verdict arrives like Duolingo's**, and that is measured rather than asserted: the sheet
rises over 200 ms on `cubic-bezier(0.35, 1.8, 0.35, 0.83)`, overshooting 10.9 percent at
83 ms against the bar's 11.1, verified to three decimals across sixteen runs. The button under
the student's thumb never moves, it changes colour: green on a win, the near-miss amber on a
miss, never red. It owns the whole row, because a verdict sharing a row with three other
controls reads as a control changing state rather than the screen turning a colour.

**The sheet opens on one sentence** and reveals one layer per tap. A correct answer keeps its
reason behind an opt-in "Why?". Mid-sequence wins say what actually happened, "Bromine left
with the pair.", rather than claiming the whole goal is achieved.

**The near-miss sheet names the student's own stray arrow**, in their terms: "from a lone pair
on bromine into a new bond to a CH₃ carbon". Or it says nothing, when no honest phrase points
at one atom. On tert-butyl bromide the three methyls are equivalent and the sheet declines to
name anything, which is the feature working rather than failing.

**The map is a diamond per unit**: a column in authored order, a concept, then two parallel
arms. A trunk chip says "Step 2 of 5"; an arm says "Route 1 of 2, either route may be taken
first" and never wears an index, because the arms unlock together and numbering them would
assert an order the data denies.

---

## What Phase 6 measured, and what it found

### The exit tests

| Phase | Exit condition | Verdict |
|---|---|---|
| 0, Survey | The inventory finds everything cold | **Failed, fixed.** All 18 sampled paths were dead: written against `blueberry_game/apps/web/src/`, which this repo has never had. 508 paths rewritten, 121 verified on disk |
| 2, Propagate | Lines go DOWN | **Failed.** 5,479 to 6,866 on the trainer surface, +25.3 percent over 16 commits. Still below the pre-refactor 8,269, so it passes on the loose reading and fails on the one actually written |
| 3 and 4, Chemistry | Derived, never recalled | **Failed twice, now clean.** See below |
| Test baseline | Suite green | **Passed.** 2,940 of 2,940, with `bootLoader` red on purpose |

### The gates that never ran

`deploy.yml` runs `npm ci` and `npm run build`. No test, no validator, no lint, no budget
step has ever gated a deploy.

Worse than unrun: **two budget gates are unmeasurable.** `game-route-payload.ts` and
`ketcher-route-isolation.ts` arm only when `apps/web/package.json` appears. That is the frozen
repo's path and it will never exist here, so both pass vacuously forever.

The number nobody had, now measured: the entry plus the game route is **527.7 KB gzipped**
against a 400 KB budget, failing by 32 percent. The 23 MB molecule editor is correctly lazy;
the bloat is `Dashboard` and `useSession` loading on every route, and GSAP whose dynamic import
is defeated by two static ones.

### The instruments themselves were broken

Both budget instruments failed for their own reasons rather than the app's.

`contrast:audit` threw inside its route loop while every log sits after it, so one unreachable
route destroyed every pair already measured; the only output was a stack trace. It now records
and continues, still exiting non-zero.

`hit:targets` failed a compliant control sixty times, because it measured the painted box and
the rail deliberately paints a 36 px circle inside a 44 px target. It now hit-tests the four
extremes and asks the document what receives the press. Re-run: **1,258 controls, 0 under the
floor.**

---

## The three chemistry failures, which are the real lesson

Each reached a student-facing surface. Each was caught by generating real output and reading
it, never by inspection.

**"Making it N=H".** The sheet described a pair landing in a bond as raising that bond, gated
by a table of per-element bond-order ceilings. A ceiling per element is not a valence. A
checker enumerated all 1,148 legal arrows over sixteen steps and found the sheet telling
students that a nitrogen already holding four bonds was becoming N=O. The fix was to delete the
prediction, not to harden it: "into the C–Br bond" is true whatever the gesture produces, and
one arrow in isolation does not determine a product.

**"CN" meaning cyanide.** The reagent label was taken as the last token in a stage, so 18 of 43
lines shipped raw SMILES. Imine formation told students its reagent was `CN`, which a tired
sophomore reads as cyanide; the data means methylamine. Fischer esterification showed `CO`,
which reads as carbon monoxide and means methanol.

**An acetylide that lost its carbon.** `CC#[C-]` is prop-1-ynyl. The label said "acetylide", so
a student would draw HC≡C⁻ and land on the wrong alcohol, on a card in the starter deck.

What the three have in common is not carelessness. Each was a **plausible abbreviation of true
data**, written by something that knew the chemistry well enough to be confident. The guard
that works is not review; it is refusing to state anything the data does not, and two label
refusals now stand on the record: no counterion the data withholds, and no "workup" on a
reaction where the acid is the reagent.

---

## What still loses

**To Duolingo, on the pathway.** Theirs makes a student want the next node; ours tells them
where they stand. They price the frontier ("START +25 XP"), give each section its own hue and
scene, and put chests between lessons. We name no reward anywhere on the screen. A correct
mechanism currently costs the same as a wrong one: nothing.

**To Anki, on the cards** — though this one nearly flipped. Ours wins where a reveal carries a
real authored note, and loses where it does not. The review face now draws the RDKit structures
the app has had all along.

**To Alchemie: judged at last, and the answer is one sentence.** We beat them on instruction
and we lose the canvas.

The comparison ran blind from captures, key written first, no verdict changed on unblinding.
Across all seven of their stills there is not one sentence: no goal, no diagnosis, no result.
A student finishing our step knows something; a student finishing theirs solved a puzzle. We
win the win outright, because theirs desaturates the whole canvas at success and offers no
forward control, so a correct answer dead-ends, while ours names the chemistry and continues.
We also tell a student more about a mistake, on their own count of two presentations carrying
zero words.

But their molecule advertises what can be grabbed, marks events where they happen, and changes
state visibly everywhere. Ours does none of the three. Their bonds carry white sphere handles
and their atoms are huge; our canvas has no grabbable-looking element at all and the molecule
floats in a third of an inset card. Their failure is marked ON the offending bond; ours is
described in a panel at the bottom with almost nothing changed on the canvas. They answer
WHERE and not WHY. We answer WHY and not WHERE.

**We built a better lesson around a weaker object**, which is the same defect Phase 1 found in
the tapered arrow: present in the code, not legible in the pixels.

The single highest-value change in the whole phase, and it is cheap: **on Check, paint the
verdict on the molecule at the same instant and in the same colour as the panel.** On a miss,
ring the exact bond or atom at fault in amber and hold it while the panel is up. On a win,
pulse what actually changed in green before the badges settle. The grader already knows which
element failed, or the sentence could not have been written. It is the root of three of the
four losses, and it turns our one real advantage into a usable one: today "Legal, but a
different change." has no antecedent on screen, so the student must re-derive which of their
own arrows it means.

Two limits on that verdict, stated rather than buried. Every artifact was a static still, so
nothing there judges motion, drag feel or latency. And no capture exists of what is behind our
own "What's off" control, so its value is assumed rather than shown; close that before anyone
claims the feedback axis outright.

**Carried, with numbers:**
- The drawing canvas is permanently 68 px shorter, the price of a control row that holds its
  height so it cannot appear under a moving finger.
- Light-theme contrast sits under the bar's: 1.83:1 on a miss, 1.33:1 on a win.
- The light miss label clears 4.5:1 by 0.10. Nothing may darken that face.
- The verdict commit stalls the main thread about 165 ms, reproduced twice.
- The done/green node state has never been painted: a fresh profile renders no completed nodes,
  so nobody has seen it.

---

## What this phase would tell the next one

1. **Make the critic generate, not inspect.** Every real bug came from enumerating inputs and
   running the actual code: 1,148 arrows, the label table over all 43 reactions, every legal
   arrow shape per step. Reasoning from source missed the same bugs twice.
2. **A diagnosis can be right and incomplete.** Round 4 blamed colour and was right; round 5
   proved colour shipped and blamed area; round 6 won on area and found the slab had grown into
   place; round 7 fixed that and found the fix made the win unsubmittable. Each answer held.
   Each was one layer short.
3. **A fix can ship a worse bug than it cured.** Moving Undo into a row that only appeared on
   the first edit reflowed the board mid-gesture, so a drag landed on nothing and the step could
   not be submitted at all.
4. **Check "pre-existing" claims against your own commits.** A builder reported a red test as
   pre-existing on the evidence that git showed the file unmodified. It was unmodified because
   it had just been committed, and the break was mine.
