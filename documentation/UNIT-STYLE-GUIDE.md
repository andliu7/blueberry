# Unit style guide, from Unit 1 as built (29 Oct 2026, revised 30 Oct)

Derived from the code in `src/game/content/u1/`, `src/game/beats/` (`template.ts`, `pace.ts`, `practice/pools.ts`), `src/game/demo/pathwayMap.ts`, `src/game/tabs/pathway/testOuts.ts` and `src/game/guide/u1Guide.ts`. Written so Units 2 and 3 can be authored by following it. Where the code and the owner's wishes differ, both are stated. Not run in a browser; counts of questions were not tallied.

Hard rules for every unit (owner, standing): lavender ground and `#5a3fd8`; Nunito; calm; no low-ROI trivia; context before ortho/meta/para; skeletal structures, never bare formulas; chemistry derived with RDKit, never recalled; one part at a time; no built-in calculator; NMR/IR/periodic table hidden in challenges and tests; no heavy new dependencies. Every authored item stays `placeholder: true` until the owner signs it off.

## 1. How a unit is shaped

A unit is a title, a gating note, an exam blurb and a list of nodes (`PathwayUnit` in `demo/pathwayMap.ts`). Unit 1 is "Conjugation, Resonance & Dienes", four stages:

| Stage | Topic | Main line | Ends on |
|---|---|---|---|
| A | Allylic stability | allylic, rank cation, rank anion | `u1-quiz-a` |
| B | Addition to dienes | 1,2 vs 1,4, kinetic vs thermodynamic, energy diagrams, HX + dienes, X2 | `u1-quiz-b` |
| C | Allylic halogenation (side quests) | NBS explainer, NBS practice | `u1-quiz-c` |
| D | Diels-Alder | pi MO ladders, Diels-Alder, dienes, dienophiles, predict, stereo, 3-D products | `u1-quiz-d` |

Rules this encodes, to repeat in other units:
- One main line in dependency order. A question may only ask for something an earlier node taught (owner rule 1 Oct: 12v14 before kvt because the kvt questions ask for "the 1,2 product").
- Stages are the checkpoints. Each stage ends in a quiz node, and the quiz ends a "section" with a treasure chest (`tabs/pathway/pathwaySections.ts`).
- Node `kind`: `spine` (required) or `branch` (side quest, optional, never lit by a test-out, lane holds two items). `mentionOnly` nodes are listed but have no lesson (radical polymerisation).
- Node `role`: `video` (explainer), `practice` (drill), `quiz` (stage check). The role names the intent; the lesson plan is built from what content exists.
- Order inside a stage: explainer first, then drill, then quiz. Mechanism or theory prerequisites sit above the thing that uses them (pi MO ladders before Diels-Alder, because the Diels-Alder checklist opens with "HOMO and LUMO in phase").
- The first lesson of every section is open. Finishing a node unlocks the next but does not mark it green; a test-out does (owner 29 Oct).
- One unit checkpoint (`u1-check`) is the unit exam: every question once across stages A, B, D; stage C and the radical node appear only in Challenge. Pass is 80% first time. Units 2 and 3 name their own exam sources in `EXAM_SOURCES` (`beats/practice/pools.ts`).

## 2. Where each thing goes

| Thing | Where it lives | Rule |
|---|---|---|
| Lesson | A node, played by `BeatRunner` from `planLesson(node)` | Built from seven slots, below |
| Questions | `content/uN/*.ts` as `UnitPools` keyed by node id | Data only, each an existing beat type; id unique across the unit |
| Flashcards | The Cards tab; a missed question becomes a card via `mcqCardId(beat.id)` | A draft question is never offered as a card (`mayOfferCard`); every entry needs an explanation because that text is the card back. The pace -1 reward card points at the guide and flashcards |
| Videos | The `hook` slot, `lesson/LessonVideo.tsx`, `videoMinutes` on the node | None filmed. Marked "Template", a one-row strip, skippable, never autoplays with sound, transcript stored; the lesson must stand without it. The `meet` step fills the hook meanwhile |
| Guidelines | `guide/uNGuide.ts`, opened from the pathway as `#/app/pathway?unit=u1&guide=u1.b` | Per stage, per lesson: ideas, common mistakes, one worked example. No new chemistry: every idea cites a pool entry as `source` and copies a `quote` verbatim; a test fails a quote the source does not contain. Generated drawings by `scripts/guide_uN.py` |
| Context | The `meet` step (first-meeting questions) and the first `ideas` of the guide; the explanation of a question | Why it matters comes before the rule. For aromatic work, say why ortho/meta/para matters before asking for it |
| Challenges | The same node, played with the safety net removed (`challengeable(node)`) | See section 6 |
| Test-outs | The section chest and the unit exam | See section 6 |
| Algorithms / decision flows | No content type exists | Use a sort or a match plus a guide idea until the owner designs one |

## 3. How a lesson walks through

`planLesson` returns one step per slot, in this order, skipping any slot the node has no content for:

1. hook: the `meet` step. The node's first-meeting (L0) questions. They cannot fail and show the answer forming. Skipped at pace +1.
2. recognise: quick multiple choice. The node's graded questions, each at its own declared rung. Misses are tracked.
3. connect: a match board (pairs), authored or from the pool.
4. order: a sort ladder (rank things), authored or from the pool.
5. produce: a synthesis gap, a drawing, or the mechanism trainer. A drawing shares produce with the trainer (drawn first, then the engine).
6. recycle: the missed quick questions come back once. Never loops. Never replays a synthesis, since a miss has just shown the full worked answer.
7. reward: always closes the lesson and says what it paid.

Slots 1 to 5 fill only from authored content; slots 6 and 7 are run slots. A unit checkpoint borrows one step per slot from different lessons in teaching order, so the check is a mix of kinds of question. A practice or quiz node with a pool plays as a single in-a-row run through `PracticeRunner` (pool in authored order). Nodes that end in the trainer (`content/u1/lessonTrainers.ts`, for example `u1-x2` keeps its sequence) report solves, never misses, so they have no Challenge and a clear says nothing about accuracy.

Pattern for a typical Unit 1 lesson: meet it, 3 to 6 quick questions climbing from rung 1 to rung 2, a ladder or match board where the idea is a ranking or a pairing, then a drawing or trainer step to produce it. Video nodes carry two or three recognise questions so they stand without the video (owner 29 Sep).

### 3a. Lessons build on each other, and a stuck student has a path

Added 30 Oct at the owner's request. The order of the pathway array is not enough to promise that a lesson assumes only what earlier lessons taught, so the dependency is data (`content/u1/lessonLinks.ts`): each lesson lists the concepts it `teaches` and the concepts it `assumes`. A concept is `u1:name` when a lesson in the unit teaches it, `u0:name` when it comes from Unit 0. `test/u1LessonPath.test.ts` holds four rules:

- every concept is taught by exactly one lesson;
- every `u1:` concept a lesson assumes is taught by a lesson earlier on the path;
- a spine lesson never assumes something only a side quest teaches (a student who skips the branch must still be able to follow);
- a walk-through quote comes from this lesson or an earlier one, never a later one.

The Chad's Prep order is the check on the order itself: resonance (his Ch 2) before conjugation (Ch 16), the pi MOs before addition to dienes and Diels-Alder. Blueberry's `u1-mo` sits before `u1-da` for the same reason.

**Walk-through.** `content/u1/lessonPath.ts` holds two to four steps per lesson, each an instruction in the order a student does it on a problem. No new chemistry: every step names a pool entry (`source`) and copies words from its explanation (`quote`), and a test fails a quote the entry does not contain.

**Need-help path.** `helpPathFor(node)` returns, in the order to try it: (1) the walk-through, (2) the earlier lessons this one assumes, nearest first, (3) Unit 0 refreshers for assumptions that live there, (4) the unit guide, last because it is the longest read. It is derived from the links, so it cannot point at a lesson that does not teach the idea. Where a student sees it (`beats/LessonHelp.tsx`, a closed fold, no score, no cost): on the lesson preview before the first question, and open on the reward screen when the pace leans easier (rule R6 included). Also in the middle of a question (30 Oct, round 2): a small "?" beside the progress strip (`beats/QuestionHelp.tsx`) opens the same path in a sheet over the question; closing it returns to the same question, nothing is scored. Not offered in a Challenge, which is a test.

**Read-along explainers.** `content/u1/lessonExplainers.ts` holds four to six authored cards (heading plus one to three sentences) for each video lesson and the pi MO lesson. They carry the WHY that the walk-through quotes do not, they lean only on ideas earlier lessons taught (a test holds `uses` inside the lesson's `assumes`), and they open the help path. They are labelled "read-along", never video. They are also the script the clip will be filmed from. Card prose is text; a card's drawing is a pointer, never a typed structure (round 4, 30 Oct).

**Narrated drawing (30 Oct, round 4).** The read-along is now shown as a narrated drawing, because a student without a chemistry background learns from a picture that changes with the sentence. Each card may carry `draw`: one or two pointers, either `{ beat }` (reuse the drawing a pool question of this lesson or an earlier one already shows; a pair can be cut with `part: "a" | "b"`) or `{ figure, name }` (an entry of `CD_FIGURES`, written by `scripts/u1_pools_cd.py` from RDKit coordinates). Nothing is drawn by hand; `beats/readAlongDrawing.ts` resolves the pointer and never a scheme (a scheme is a question with a box to fill). `test/u1LessonPath.test.ts` holds that every explainer draws beside at least two cards, every pointer resolves, a card shows at most two structures, and a `beat` pointer never comes from a later lesson. The player (`beats/LessonHelp.tsx`, `ReadAlong`) has Back, Next, Listen (the browser's own speech, started only by a press, never on load) and Play all (steps on when each card ends). On the lesson preview a video lesson shows the narrated drawing in front of the student, not behind the need-help fold. It is labelled "narrated drawing, not a filmed video": it does not replace the clip, the 14-lesson filmed course, or a presenter; nothing the build can do closes that gap.

**Video slots.** `U1_VIDEO_SLOTS` plans each video lesson's clip (minutes and three things it shows), written from the walk-through so the page and the clip agree. Nothing is filmed, and a filmed clip needs the owner or a presenter; that is not something the build can produce. Until then the read-along explainer above is the teaching. **Filming pack (30 Oct, round 3).** `filmingScriptFor(node)` derives a shoot script from the slot and the read-along cards (opening to camera, one shot per `shows` line with its narration, closing, and the transcript to store); a test holds that every card is spoken exactly once. `documentation/UNIT1-FILMING-PACK.md` is generated from it, so an afternoon with a presenter films all eight clips (about 20 minutes) with nothing left to write. The gap that remains is the one the build cannot close: the clips themselves, the 180-page study guide and the 850+ solved questions the bar has. Each lesson stands without a clip; the `meet` step fills the hook. For scale: Chad's Prep Ch 16 is filmed lessons 16.1 to 16.5d of 2 to 12 minutes each plus slide study guides (course page, fetched 30 Oct); ours is eight planned clips of 2 to 3 minutes against nine read-along explainers.

## 4. Question styles

Five pool item kinds (`content/u1/types.ts`) plus the trainer:

| Kind | Student does | Graded by | Use for |
|---|---|---|---|
| mcq | Taps one of 3 to 4 options. Often a drawn structure beside the question (`McqVisual`: scheme, structure, or a pair) or drawn option tiles | Authored correct id | Recognition, "which is more stable", conditions-to-product |
| sort | Orders cards along a track with named ends (a ladder) | Curriculum ordering answer | Rankings: cation, anion, radical stability, MO energy |
| match | Pairs two columns on a board | Board spec | Connecting a name to a drawing, a condition to an outcome |
| draw | Draws a structure in the editor | Canonical structure equivalence | Produce: product of a Diels-Alder, allylic halogenation products |
| synthesis | Fills reagent gaps, from a bank at L2, typed at L3 | Authored reagent answer with accepted equivalents | Sequences; read backwards it is retrosynthesis, not a new type |
| mechanism / resonance (trainer) | Pushes curved arrows | chem-core | The mechanism itself |

Authoring limits, enforced by tests (`beats/mcq/authoring.ts`), not suggestions: 3 to 4 options, option text at most 48 characters, prompt at most 90, brief at most 110, each explanation at most 320, no arithmetic, one concept per question, an explanation on every option including the right one, copy that passes the voice lint (no "try again"). Wrong options must have a named cause. A sort or match card needs an authored note. A new type is proposed through `AUTHORING-QUESTIONS.md` (five questions: what the student does, what counts as the answer, how it is graded with accepted alternatives, the three ways to be wrong, what it looks like).

Every pool entry carries three things beyond the question: an `explanation` (shown after a miss, what a card back is made of), optional `conditions` (temperature, solvent, equivalents, stated never implied), and `provenance` (the RDKit script and the OpenStax or LibreTexts page used to check it). No entry ships without them.

Content rules specific to question style:
- Draw structures, not formulas, wherever a molecule is identified (names alone give wrong structures).
- Derive every drawing, product and number with RDKit. Do not type a structure from memory.
- No low-ROI trivia and no nomenclature drill beyond what the exam asks. Molecules shown as structures, asking properties, reactivity and conditions.
- Build one part at a time: no multi-part question until each part has been cleared alone as its own item. Never quietly edit an orgo problem you are adapting.
- No calculator question. Arithmetic is barred from the easy beat.

## 5. How difficulty is chosen

Four rungs (`MasteryLevel`): L0 meet it (cannot fail), L1 guided, L2 recall, L3 produce. A question declares the rungs it may appear at in `levels`; a runner never infers it, and an MCQ cannot declare L3 (picking is never producing).

### 5a. Inside a lesson
- Order is easy to hard: meet (L0), then L1, then L2. A question authored at both L0 and L1 is played only in the L1 step so it is not asked twice in a row.
- Every lesson, video nodes included, needs questions on at least two rungs, so pace has something to move between. A video node with only L0 items cannot play easier or harder; Unit 1 had three such lessons until 30 Oct.

### 5b. Between lessons: the algorithm
The next lesson plays at pace -1 (easier), 0 (as authored) or +1 (harder). `beats/difficulty.ts` computes it from the append-only journal, so it is never stored and can be recomputed on any device. `App.tsx` calls `adviceForNode` when a lesson opens. A Challenge always plays the authored lesson. What each pace does to the lesson (`beats/template.ts`):

| Pace | Meet step | Questions | Reward card |
|---|---|---|---|
| +1 harder | skipped | the lesson's L2 questions first, then at most two L1 (needs two or more above L1, else it plays as 0) | offers the section test as "Skip ahead" |
| 0 as authored | kept | L1, then L2 | plain |
| -1 easier | kept | L1 only | offers the guide, the flashcards and the need-help path |

The rules, applied in order. Each is pinned by `test/pace.test.ts` or `test/difficulty.test.ts`.

1. **R1, a tap wins.** The one-tap rating after a lesson (too easy, about right, too hard) sets pace to +1, 0 or -1. It restarts the count of flawless clears.
2. **R2, two flawless in a row.** Two flawless (recycle-free) lessons in a row set +1. One flawless lesson lifts -1 to 0 and leaves 0 or +1 where it is.
3. **R3, rough means easier.** First-try accuracy under 50% on a lesson sets -1. Exactly half is not rough.
4. **R4, mixed decays.** Any other result (some misses, at least half right) brings pace to 0. A clear with no first-try count is never read as rough. A lesson that ends on the mechanism trainer reports solves, never misses, so only its tap counts.
5. **R5, prerequisite.** Every lesson names the lessons it assumes (`content/u1/lessonLinks.ts`). If one of those was last cleared under 75% first-try, this lesson plays at most at 0: it keeps its meet step and L2 does not jump the queue. R5 never lowers a pace below what R1 to R4 gave. It never reads a clear with no count as weak, and a later flawless clear of the prerequisite cancels it.
6. **R6, stuck.** Two clears of this same lesson in a row, both under 50% first-try, with no tap on it since, set -1 and open the need-help path (section 3a). A tap after the second clear ends it.

Direction is read off the final pace: -1 easier, 0 same, +1 harder. `adviceForNode` returns the pace, the direction, the weak prerequisites, the stuck flag and one plain sentence per rule that changed the result, so a screen can say why.

The rules as words live in `DIFFICULTY_RULES` (`beats/difficulty.ts`); the staff slideshow prints that table, and `test/difficultyRules.test.ts` pins R1 to R6 in Units 1 to 3. Students missing the Unit 0 background get plain primers (`content/u1/primers.ts`) in the need-help path and the guidebook.

Constants live next to the code: `WEAK_PREREQ_BELOW` 0.75, `STUCK_BELOW` 0.5, `STUCK_CLEARS` 2. Change them in one place and the tests name the rule that moved.

### 5c. Across a unit
- Difficulty rises through the stage: explainer, drill, quiz; each stage quiz is harder than its lessons.
- Between sections, test-out length steps up evenly from 10 questions (section 1) to 15 (last); a unit exam is 20 (`testOuts.ts`: `SECTION_TEST_MIN`, `SECTION_TEST_MAX`, `UNIT_EXAM_SIZE`).
- Failing a prodigy or master question goes back one question only (owner 29 Oct).
- Do not use a timer, and do not use "harder" to mean more obscure. Harder means more steps or less scaffolding on the same ideas.

## 6. Practice, Challenge, quiz, test-out, exam

- Practice: forgiving. A miss comes back once in recycle. A hint is available, but a hinted lesson is not flawless.
- Challenge: a harder run of a node already cleared, same questions, no recycle pass, the first step with a miss ends the run, a pass is every question right on the first try. Pays on a pass. No hint. Nodes with a mechanism or resonance step, and checkpoints, have none. Tools such as NMR, IR and the periodic table are hidden.
- Stage quiz: a graded final, no hint, ends the section.
- Section test-out: the treasure chest, always open, 10 to 15 questions drawn from the section's lessons. A pass lights that section and all earlier ones in the unit. Side quests are never lit.
- Unit exam: 20 questions, open at any time. A pass lights every earlier unit too.

## 7. Checklist for Unit 2 and Unit 3

1. List the stages and put them in dependency order; mark each node spine or branch and give it a role.
2. For each node, author in this order: the meet questions (L0), the L1 and L2 quick questions, then any match, sort, draw or synthesis item the idea calls for; mechanism nodes use the trainer.
3. Put at least two or three quick questions on every video node so it stands alone, and make sure they span at least two rungs (L0 and L1 or L2) so pace can move.
4. Derive every structure and answer in RDKit; record the script and source page in `provenance`.
5. Write `explanation` and, where it matters, `conditions` on every item. Write option `why` text for every option.
6. Mark every item `placeholder: true`; submit for the owner sign-off page. No flashcards for drafts.
6a. Write the lesson links (what each lesson teaches and assumes), a two to four step walk-through per lesson with sourced quotes, and a video slot for each video node.
7. Add the guide (`guide/uNGuide.ts`): per stage, ideas with `source` and `quote` copied from pool text, one mistake per lesson, one example.
8. Name the exam sources, split by lesson so the run interleaves topics in teaching order.
9. Run only the tests touched plus neighbours; confirm the first lesson of each section opens, the quiz appears at the end of each stage, and the pathway branch density holds.
10. Open questions to the owner before building: video plan for the hook slot, algorithms content type, and whether Unit 2's first lesson (u2 Huckel) opens as the first in its section (STATUS lists it as shown locked).

## 8. Template for Units 2-10 (3 Nov)

Unit 1 as revised by `UNIT1-REVIEW.md` (all twelve suggestions applied, 3 and 4 Nov) is the model. Units 2 to 10 copy its shape, below, and each starts as a plan file (8h) that the owner reads before any pool is generated. Topics and order come from `COURSE-OUTLINE-ORGO2.md` sections 1 and 3, prerequisite edges from its section 4, callbacks and spacing from its section 5. Where this section and sections 1 to 7 differ, this section wins.

### 8a. Stages and sections
- Three to five stages per unit, in dependency order. A stage is one section: lessons, then the stage quiz (checkpoint), then the section chest (test-out).
- A stage holds three to seven spine lessons and at most two side quests (`branch`). A spine lesson never assumes something only a side quest teaches.
- The stage opens on a `video` (explainer) lesson; the rest are `practice`; the last node is the `quiz`. Mechanism and theory prerequisites sit above the lesson that uses them.
- Every lesson lists `teaches` and `assumes` in `content/uN/lessonLinks.ts`; `test/uNLessonPath.test.ts` holds the four rules of 3a.

### 8b. Lesson kinds, in this order
1. **Primer.** The priming preview (big question, one pretest guess, three to five ideas as a map) and the L0 `meet` questions. Every `u0:` or earlier-unit assumption has a primer on the help path.
2. **Worked example, then fade.** Every practice lesson opens on one fully worked problem on its preview, each step narrating the decision ("protonate C1 because..."). It solves a different problem of the same kind, on a species no question in the lesson draws, with its own figure. Fade: the first question carries the example's first step (`content/uN/workedFade.ts`, worded to hold for whichever question comes first); the questions after it carry nothing.
3. **Practice.** Recognise (MCQ), then connect (match) or order (sort), then produce (draw or synthesis, opening on the starting material) or the trainer. Drawings play last.
4. **Reason ("why") items.** At least one per lesson, paired with a product question where one exists ("which carbon" before "draw the product"). A replayed miss (recycle, or a retry in a run) first asks its reason at L0 (`beats/sayWhy.ts`); a rule step is opt-in: `SAY_WHY_STEPS` in `content/uN/sayWhyMixups.ts` lists the item and its two wrong reasons by id, each one a belief that leads to a wrong answer on that question, never the right reason negated, never template text. No entry, no step.
5. **Challenge.** The same node with the safety net off (section 6). Nothing to author; a lesson with a trainer step has none.
6. **Checkpoint.** The stage quiz: every item L2 or L3, no hint, one or two items spaced from earlier stages (8f).
7. **Test-out.** The section chest (10 to 15 items, stepping up through the unit) and the 20-item unit exam, drawn from every stage, side quests included through named exam ids (as `U1_EXAM_C_IDS`).

### 8c. Orgo I callbacks
- At least one per stage: a "You already know this" card on the stage's first lesson, naming the Orgo I idea and one sentence that carries it over (Unit 1: hyperconjugation for A, ΔG/Ea/Hammond for B, the radical chain for C, OCH3 donating by resonance for D).
- The idea is assumed as `u0:<idea>` with a primer in `primers.ts`, so a student who lacks it gets the refresher.
- At least one question per stage asks the callback as a why ("the same reason 3° beats 1° in SN1"), never as recall of a definition.
- Pick from the owner's list (charge, resonance, induction, orbitals, equilibrium, kinetic vs thermodynamic, Keq vs pKa, functional groups, EWG vs EDG, substitution vs elimination) and from the outline's cross-cutting concepts this unit reuses.
- Where Orgo II tells a story differently from Orgo I (bromonium vs open allylic cation), the card says so in one line.

### 8d. Misconceptions, named and confronted
- Every wrong option carries a named cause from `packages/chem-core/src/causes.ts`; add a cause rather than borrow the nearest wrong one (review L1).
- The plan names two to four misconceptions per stage: the wrong idea in a student's words, why it tempts, the item that makes it fail, the correction.
- Each gets at least one confronting item, where the tempting rule gives the wrong answer ("Do not assume 1,4 always wins", "shape before donors"); its feedback opens "A common mix-up".
- No absolute the unit later breaks ("always a cyclohexene", review M3). Grep the explainers, walk-throughs, guide and deck for the claim before shipping.
- No give-aways: a prompt word only the right option repeats fails (review M1); tiles read A, B, C until Check.

### 8e. Where pictures beat text
| Idea | Picture | Never |
|---|---|---|
| Any molecule | Skeletal structure from RDKit | A formula, or a name alone |
| Resonance | Both contributors with curved arrows from RDKit bond orders (half-headed for radicals) | Two contributors and no arrow |
| Rate vs stability | One energy diagram of the real reaction, reused across the stage | Generic A/B diagrams beside the real reaction |
| Spatial (endo/exo, chairs, faces, anti opening) | A turnable 3-D model (RDKit ETKDG + MMFF, plain SVG) | Words like "toward the C=C" |
| Rankings | A sort ladder | A list in the prompt |
| Mechanism | The trainer | A described arrow |
| Definitions, rules, the reason | Text, one to three sentences | A picture with no sentence |

A read-along card shows at most two structures, by pointer, never typed.

### 8f. Spacing earlier material into later quizzes
- Every stage quiz after the first carries one or two items from earlier stages of the unit, in a new setting (as `u1-qb-space-cations`).
- The unit exam draws from every stage and from side quests through named ids.
- Each unit's first stage quiz and its exam carry at least one item on a cross-cutting concept from an earlier unit (outline section 5, where this unit is in `reusedIn`), for example kinetic vs thermodynamic on enolates, pKa and Keq on carbonyl addition.
- A spaced item is a new item, never a copy; its id names where it plays (`uN-qb-space-...`).

### 8g. Difficulty tags
- One honest level per item, never 0/1/2 at once (review suggestion 12). L0 meet (cannot fail); L1 applies one taught rule; L2 combines rules, works backwards or turns on a subtle point; L3 produces (draw, typed synthesis). An MCQ is never L3; a drawing is at least L2.
- Quiz and exam items are L2 or L3. Every lesson holds at least two levels; pools play easiest first.
- The L2 and L3 items in quizzes and Challenge are the hard ones: failing one sends the learner back one question. Mark them in the plan.
- Harder means more steps or less scaffolding on the same ideas, never more obscure. No timer, no arithmetic, no nomenclature beyond what pays off on a test.

### 8h. The plan file each unit must use
One file per unit, `documentation/UNIT{N}-PLAN.md`, written before any generator is touched. Every field is filled, or marked `ASK` (owner question) or `n/a`. Chemistry in a plan is a claim to derive, not a fact: the RDKit table names the script that will check it.

```
# Unit N plan: <title> (<date>)

## Header
- Unit id: uN
- Title:
- Outline topics: <COURSE-OUTLINE-ORGO2 section 3 topic ids>
- Exam slots fed: <pKa | conceptual | mechanism | synthesis | prediction | spectroscopy>
- Assumes from earlier units: <uM:concept, u0:concept, ...>
- Cross-cutting concepts: introduced <ids>; reused <ids>
- Sources checked: <OpenStax / LibreTexts pages, exam record>
- Status: draft | owner-read | approved

## Stages
| Stage | Topic | Main line (lesson ids in order) | Side quests | Ends on |

## Lessons (one block per lesson)
### uN-<id>: <title>
- Stage / kind / role: <A> / spine|branch / video|practice|quiz
- Teaches: uN:<concept>, ...
- Assumes: uN:|uM:|u0:<concept>, ...
- Primer: big question; pretest item id; three to five ideas
- Worked example: problem (species not in the pool); steps; figure
- First step (fade line):
- Practice: item ids with kind and level, in play order (drawings last)
- Why items: ids, and the product item each pairs with
- Say-why mix-ups: two, each false as a rule, with its correction
- Picture: the 8e row, and what it shows
- Video slot: minutes; three "shows" lines | n/a

## Orgo I callbacks
| Stage | Lesson | Orgo I idea | Carry-over sentence | Primer id | Why item id |

## Misconceptions
| Cause id | Wrong idea (student's words) | Why it tempts | Confronting item | Correction |

## Spacing
| Item id | Tests (stage or earlier unit, concept) | Plays in (quiz / exam) |

## Difficulty
| Lesson | L0 | L1 | L2 | L3 | Fail-back items |

## Checkpoints and test-outs
- Stage quizzes: id, item count, spaced items
- Section chests: sizes (10 to 15, stepping up)
- Unit exam sources: ids by stage, side-quest ids

## RDKit derivations
| Script | Derives | Stops the generator when |

## Open questions for the owner
- ASK: ...
```
