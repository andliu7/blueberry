# Reference extraction

What was taken from each reference, and what was deliberately left. Written 2026-08-25, after
reading all 88 images in `reference images/` and the three reference repositories.

Two families are in the folder, plus a third the filenames do not advertise:

1. **Duolingo screens**, iOS, captured 2026-08-24. Path, lesson, streak, result, shop, focus mode.
2. **An anatomy app in the same genre** ("Anato", mascot "Humerus"), captured 2026-08-24. This is
   the closer analogue: it is a 3D-model subject taught in the Duolingo shape, which is exactly our
   problem.
3. **Alchemie captures**, 2026-08-19 (`IMG_16xx`, `Screenshot 2026-08-19 *`). The mechanism bar,
   plus four Alchemie products the manifest does not cover: the 3D builder, the equation animator,
   the net-ionic typing surface, and the dimensional-analysis surface.

Rule applied throughout: extract the PATTERN, never the pixels. Nothing below proposes copying a
colour, a sprite, or a piece of authored content.

---

## Family 1: the drawing drill (5 images)

`(dark mode) drawing characters`, `in the middle of drawing characters - notice it follows the line
even if I'm off`, `example of drawing off of the lines`, `drawn letter`, `practice words`

This is the direct model for the **Draw the molecule** beat, and it settles the three-stage
progression in §4 with evidence rather than by assertion.

| Taken | Detail |
|---|---|
| Guide is a track, not an outline | The target glyph is a wide dim capsule. The student's stroke rides *inside* it. Ours: the bond skeleton is a dim wide capsule, the drawn bond snaps into it |
| Direction is a badge at the stroke START, plus a dashed arrow along the path | Stage 1 only. Ours: a numbered badge on the first atom, dashed arrow along the bond |
| Completed strokes go solid white; remaining path stays dashed blue | One glance tells you where you are. Ours: committed bonds solid, remaining dashed |
| Tolerance is enormous | `example of drawing off of the lines` is the proof: the freehand stroke misses the track by more than a stroke width in places and still resolves. Confirms "finger drawing, not CAD" |
| Off-guide input is never rejected mid-stroke | The app does not fight the finger. It snaps at release |
| `CHECK` is disabled until there is input | Ours already does this |
| COMBO xN rides above the progress bar | Green, small caps. This is the streak-within-a-lesson from §5 |
| Feedback bar slides up from the bottom with the verdict + CONTINUE | Not a modal. Ours: same, and it is the §8 "gradient blur rising from the bottom edge" surface |
| A flag icon sits in the feedback bar | Report-this-item. Cheap, and it is how a bad authored beat gets found |
| Review list rows carry a strength dot | `practice words`: 140 rows, each with a red dot. Ours: the review queue row shows decay state |

**Left:** the audio-first framing (a speaker button is the prompt). Chemistry has no audio prompt.

---

## Family 2: the anatomy app (17 images)

This app is the single most useful reference in the folder, because it has already solved
"Duolingo shape, 3D-model subject".

| Image | Taken |
|---|---|
| `review reminder` | **"1 structure is fading"** + "A 60-second warm-up keeps your memory sharp". This is decay framing without loss framing, and it is exactly the tone CLAUDE.md demands. Ours: "1 mechanism is fading". Green primary button, `Maybe later` as a ghost. No punishment |
| `another way to make a track` | Path chrome: one pill holding energy / gems / streak, avatar at the right. Unit banner card carries a **bookmark-shaped icon**, unit number, title, one-line description, mascot peeking from the right edge. Nodes are large discs with a **lock badge in the lower right**, star nodes for checkpoints, **dotted trail** between nodes, decorative props scattered on a tinted ground |
| same | **Five tabs: Learn, Sandbox, Community, Shop, Profile.** This is the answer to "the periodic table is not a main attraction". Their Sandbox is our molecule sandbox; the periodic table is a tool inside it, not a tab |
| same | A floating `Study PRO` pill sits above the tab bar. Entitlement upsell without a tab |
| `matching - not ideal but okay` | Match-with-drawn-connectors: labels on the left, colour dots on the right, **curved bezier connectors in the label's colour**. The 3D model above is colour-keyed to the labels. Author's own note says "not ideal" — see the questions |
| `a how_to instruction...` | The same beat before any connection: dots are grey until used, mascot speech bubble gives the literal instruction, `CHECK` disabled |
| `colored area of image - select the option that matches it` | **The single most transferable beat.** A region of the 3D model is highlighted green; the question is clinical ("A patient cannot close their right eyelid..."); four plain answer rows. Ours: highlight one atom or bond green, ask the reactivity question |
| `fill in the blank` | Sentence with an inline blank chip; word bank below; used words grey out in place rather than vanishing. Ours: "The ___ attacks the carbonyl carbon" with a reagent bank |
| `short explanation` | After the answer: the **term is coloured green inline in the body text**, one paragraph of mechanism, then a one-line restatement in grey. Two depths on one screen — this is §7's spectrum of explicitness in its cheapest form |
| `another interface` (Ranks) | Segmented control Feed/Ranks/Friends; **system chips with mascot avatars** as the leaderboard's scope selector; tier trophies in a horizontal scroller; PROMOTION ZONE divider |
| `community feed` | Roadmap button, "a note from the team" card, invite card with a concrete reward ("300 gems, a streak freeze, and a cosmetic") |
| `mascot intro`, `acknowledgement of ads...` | Mascot named and introduced on its own screen before signup. Ads disclosed by the mascot in first person, plainly. Ours: Berry does this |
| `simple settings` | Grouped list: ACCOUNT / SUBSCRIPTION / SUPPORT / APPEARANCE, `SIGN OUT` outlined in red, `Delete Account` as quiet text. This is the §7 "settings at the bottom of the dashboard" shape |
| `setting profile picture` | Rank chip (`STUDENT · LVL 1`) with "1200 XP to Resident" underneath, and a **YOUR MASTERY** panel with a Front/Back segmented control over a body diagram. This is the answer to §10's "missing mechanic" — see the three candidates below |
| `card carousel and AI generated with gradient overlay and free course` | **"Pick your free system. Your free choice is permanent."** A carousel of system cards, each with lesson count. This is a far better free-tier shape than a daily counter, and it is worth considering against our "5 problems a day" |

**Left:** the AI-generated mascot art style, the specific colour palette (coral/salmon), and the
energy meter.

---

## Family 3: Duolingo proper (28 images)

| Image | Taken | Left |
|---|---|---|
| `celebration after every lesson...`, `xp animation` | Three result tiles — **TOTAL XP / GREAT (accuracy %) / SPEEDY (time)** — each with its own border colour, above CLAIM XP with a share button beside it. XP lightning bolts converge into the tile. This is the §8 star transition's landing screen | The owl |
| `mistakes`, `mistake database` | **"Review 30 recent mistakes!"** with START +20 XP, then the list. Each row = prompt type + the actual item + a red strength dot. This is the Lichess review queue, and it lives outside the lesson exactly as §3 requires | — |
| `come back to missed question...` | "Let's correct the exercises you missed!" **before** the lesson is marked done. This is §3 item 6's ordering, confirmed | — |
| `promotion and demotion` | PROMOTION ZONE / DEMOTION ZONE dividers inside one list, the student's own row tinted | **The demotion zone.** CLAUDE.md bans the anxiety loop. We take promotion, we do not take relegation |
| `streak cal`, `streak cal top` | Calendar with practised days, "Days practiced / Freezes used" as two stat cards, a Streak Goal bar from day 1 to day 7 | "Don't lose your 334 day streak" emails in `image9` |
| `image9` (Lock-In System #5) | Read as a **catalogue of what not to ship**: "You're falling behind!", "1:34:31 to extend your streak", guilt-framed notifications. Useful precisely because it names the pattern CLAUDE.md forbids | All of it |
| `practice words` / `Flashcard Frenzy` (`reminders and xp reward`) | A named side mode with LEVEL n of N and EARN nXP, entered for an energy cost | The energy cost |
| `duolingo FOCUS MODE`, `SELECT DISTRACTING APPS...`, `example that clearly explains how to accept...`, `you have to get into the site to unlock break mode` | The **permission pre-prompt**: the mascot explains what the OS dialog will ask, and an arrow points at the button to press, BEFORE the dialog appears. This is a genuinely good pattern and applies to our notification and PencilKit prompts | Screen Time blocking itself |
| `pay for diamonds`, `shop - xp streek super...`, `buy timers and streak freezes...`, `chest tiers...` | Shop information architecture: My Items row, Subscriptions, Special Offers, then currency packs. `POPULAR` ribbon on the middle tier | **Energy.** The author's own filename says it: `I don't think I like the energy option...`. Also: no loot-box chests with probability tiers, on a minors-present product |
| `savings listed, plus highlighted, clean and clear` (Busuu) | The **feature × tier matrix** with checks and dashes, "We'll notify you before your trial ends", and the exact billing sentence spelled out | The purple gradient ground. §12 bans it |
| `quizlet subscription plan` | The **trial timeline**: Today → June 1 reminder → June 4 billed. Three rows, dated, unambiguous | — |
| `onboarding page` | "Why are you learning Korean?" as a single-select list with a progress bar and a checked row outlined in blue | — |
| `start = launch = rocketship interface screen` | Full-bleed pre-lesson launch screen with one button | The purple gradient |
| `pair left and right side` | Tap-the-matching-pairs as a plain two-column card grid — **no connectors**. Compare with the anatomy app's connector version | — |
| `tap on words...` | A **PREVIOUS MISTAKE** ribbon above a re-asked question. Author's note: "maybe tap on atoms and bonds... counting carbons for an intramolecular Claisen". Recorded as a beat idea | — |
| `unlocking widget icons`, `duo shrinks screen to a video...` | Cosmetic unlocks tied to streak days; the app shrinks itself into an inset video to teach an OS-level action | — |
| `clear social media icons`, `duolingo cute baby mascot big eyes` | Mascot expression range. Confirms §8's "blueberries come in all shapes and sizes" | The owl itself |

---

## Family 4: Alchemie, the bar (29 images)

`IMG_1640`–`IMG_1661`, `Screenshot 2026-08-19 *`

### The mechanism canvas

| Taken | Detail |
|---|---|
| Ball-and-stick with a **hinge joint** | Bonds terminate in a small white sphere ON the atom rim, not a rod slotted into a ball. Double bonds are two parallel capsules with their own joints. Our gauntlet round 2 already found this; the captures confirm it |
| Charge is a **flat grey disc on the silhouette** | Never a floating glyph. `IMG_1640`, `IMG_1643` |
| Implicit H as a **thin arc of small H glyphs** | `IMG_1644`, `IMG_1646`. Confirms our round-3 fix |
| Lone pairs are **naked white dots** in a fan around the atom | `IMG_1641`. Not lobes. Worth re-testing against our lobe decision |
| Electrons in flight are a **glowing white sphere on a dashed leash** | `IMG_1640`: one bright sphere with a warm halo, dashed line back to its source. This is a fundamentally different arrow language from ours and is the sharpest single finding in the folder — see below |
| Long-range attack is a **long dashed straight line**, not an arc | `IMG_1645`: the dashed line runs the full width of the canvas between two species |
| **Failure is animated, not rejected** | `IMG_1647`, `IMG_1648`, `IMG_1649`, `IMG_1650`, `Screenshot 054525`: the atom that cannot take the electrons goes **black and spiky**, a yellow warning triangle appears ON it, and the offending bond stretches thin and glows. The molecule visibly tried. This is §6's "let the molecule visibly try and fail" already shipped |
| Success is a **flat banner**, bottom right: "Goal Achieved!" | Understated. `IMG_1643`, `IMG_1644`, `IMG_1646` |
| Multiple species on one canvas, freely draggable | `IMG_1645`, `IMG_1646`: reagent and product coexist and are separately positionable |

**The arrow finding.** Our seven gauntlet rounds have been refining a *curved dashed arrow with an
arrowhead*. Alchemie does not draw one. It draws **the electrons themselves as a lit sphere, on a
dashed tether, dragged by the finger**. There is no arrowhead in any capture. This reframes rounds
1–7: we have been polishing the wrong primitive. Recorded here rather than acted on, because it is
an owner decision — see question 5.

### The Alchemie products the manifest missed

| Capture | What it is | Why it matters |
|---|---|---|
| `IMG_1651`–`IMG_1653` | **3D molecule builder / sandbox.** Element palette (Cl, Br, …) down the right, AR toggle, LOAD/SAVE, explode button, trash, recentre, and `POP OUT HYDROGENS` / `SYMBOLS` toggles | This is §6's free-tier sandbox, already built by the bar. Pairs exactly with the anatomy app's Sandbox tab |
| `Screenshot 053859` | **Equation animator.** `O₂+CH₄ → CO₂+H₂O` in an editable field with an `Update` button; reactants animate on the left of a divider, products on the right; play/pause scrubber | The model for a balancing/stoichiometry beat |
| `Screenshot 053927` | **Net-ionic equation input.** A custom keyboard: digits, `(aq) (l) (g) (s)`, parens, `+`, `→`, `⊕ ⊖`, element keys, and a **superscript toggle** | We need this keyboard for numeric and equation beats. Do not build a text input |
| `Screenshot 053952` | **Dimensional analysis.** Draggable unit tiles arranged as fractions, with **cancelled units struck through in red**. Coefficient tiles above | The best interaction in the folder for stoichiometry, and it makes unit cancellation visible instead of asserted |
| `Screenshot 053917` | Orbital viewer: σ/π toggle, translucent lobes on a black ground | Reference for a conjugation/HOMO-LUMO application lesson |

### Competitor App Store listings (`IMG_1654`–`IMG_1661`)

Two apps, read as market context, not as bars.

- **Chem AI: Chemistry Solver** — molar mass calculator, interactive periodic table, "Solve Any Text
  Problem" with the same custom chemistry keyboard, scan-and-solve, step-by-step AI answers.
  Confirms the §9 calculator and the consolidated Ask-AI surface are table stakes, not novelties.
- **OrgoSolver** — bite-sized lessons, flash cards by topic with card counts, and a **path drawn as a
  molecular graph**: numbered nodes on a hexagonal lattice over a faint structure wallpaper, with an
  explicit legend `Done / Current / Open / Review / Locked` and dedicated REVIEW nodes on the track.
  `orgosolver-03-skill-tree-progression.png` in `docs/reference/competitors/` is the same product.
  The legend and the review-node-on-the-path idea are both worth taking.

---

## The three reference repositories

Read for structure. Neither ludolang repo nor the duolingo-clone is a shipped product, so their
choices are worth understanding and are not evidence about what works at scale.

### Adopting

| Pattern | Source | Why |
|---|---|---|
| `challenge` / `challengeOption` / `challengeProgress` split | duolingo-clone `db/schema.ts` | Question, its options, and per-user completion are three tables. Progress never lives on the content row. We already hold this line; it is confirmation |
| Discriminated challenge `type` enum | duolingo-clone | Their enum is two values (`SELECT`, `ASSIST`). Ours is ~12 beat kinds. Same shape, and it is why adding a beat type is additive |
| Lesson runner as a **single reducer over an index** | duolingo-clone `app/lesson/quiz.tsx` | `activeIndex`, `status: none/wrong/correct`, `percentage`. The whole runner is one state machine. Ours becomes a pure reducer in `packages/curriculum` so it is testable headlessly, which theirs is not |
| Resume at the first uncompleted item | duolingo-clone | `challenges.findIndex(c => !c.completed)`. Free, and it is what a student expects |
| Result tiles as a component with a `variant` | duolingo-clone `result-card.tsx` | Maps directly onto our TOTAL XP / ACCURACY / SPEED tiles |
| **Flat tree, not nested** | ludolang `FlatSectionTree.ts` | `{courseId, units: [{id, orderIndex, lessons: [{id, orderIndex}]}]}` — ids and order only, no content. The path renders from this; content loads per lesson. For a 16-unit × 3-track course this is the difference between a 4 KB path payload and a 400 KB one |
| Unit carries its own `color` and `orderIndex`, path reads them | ludolang `UnitPath.tsx` | Section break between units comes from the unit, not from the lesson list |
| A ref on the current lesson button for scroll-into-view | ludolang `currentLessonButtonRef` | This is how "fast scroll decelerates to the start of the last topic" (§8) gets implemented |
| **Cursor pagination on the leaderboard, computed server-side** | ludolang-backend `LeaderboardService.kt` | `findTopOrdered` / `findAfterCursor(points, id)`, cursor is `"${points}:${id}"`. The client sends a cursor and receives rows. It never sends a score. This is our non-negotiable, implemented |

### Rejecting

| Pattern | Source | Why |
|---|---|---|
| **Hearts** | duolingo-clone `MAX_HEARTS`, `reduceHearts` | A wrong answer costs a life and eventually locks the lesson. Hearts stay rejected. **Amended 2026-08-27:** the energy variant is no longer rejected wholesale, it is corrected. `docs/ECONOMY.md` ships Charge, which is spent when a node starts rather than per question, so a student is never stranded mid-mechanism. The load-bearing half of this row survives unchanged: **a wrong answer costs nothing** but a review-queue entry |
| The 8-step indentation cycle | duolingo-clone `lesson-button.tsx` `cycleLength = 8` | Our own gauntlet round already measured this: at period 8 the five nodes a viewport holds are all one limb of the wave, so the track reads as a diagonal list. We use period 4. **Our version is better and the measurement is recorded** |
| `react-circular-progressbar` | duolingo-clone | A dependency for one ring. Ours is an SVG `stroke-dasharray`, already built |
| Client-side grading | duolingo-clone `quiz.tsx` compares `correctOption.id === selectedOption` in the browser | Fine for a tutorial build. Ours grades in `chem-core` / `curriculum` for feedback, and the server re-grades anything that moves XP, rating, or entitlement |
| `react-confetti` at 500 pieces | duolingo-clone | §8 specifies the molecule-to-star transition. Generic confetti is the thing we are trying not to be |
| Points as a single scalar on the user row | duolingo-clone `userProgress.points` | Our rating is Elo-like and computed from an append-only attempt history. A mutable integer on the user row is exactly the column a client can be tempted to write |
| `toast.error("Something went wrong")` | duolingo-clone | §12: no silent failures, and no meaningless ones either |
| Next.js server actions as the whole data layer | duolingo-clone | We are Vite + Supabase. Not portable, and not a criticism of theirs |

---

## Summary of what this changes about our current build

1. **Eight tabs becomes five.** Learn, Sandbox, Community, Shop, Profile. Periodic table moves inside
   Sandbox and into a lesson-summoned sheet. Trainer is not a tab; it is what a lesson node opens.
2. **The arrow primitive is in question.** Alchemie drags lit electrons on a tether. We draw a curved
   dashed arrow. Seven gauntlet rounds have been spent on the second thing.
3. **A beat is not a problem.** Our `Problem` is a graded question. A `Beat` can also be an animation
   or a drawing drill, and the lesson is a sequence of beats.
4. **Track is a first-class entity**, because unlock state is per-track.
5. **Hearts are out. Energy is in, corrected**, per the 2026-08-27 amendment. Hearts stay rejected
   because a wrong answer must never cost anything. The energy variant ships as Charge, spent when
   a node starts rather than per question, so it paces volume without pricing mistakes. See
   `docs/ECONOMY.md`.
