# Trainer inventory

## How to use this file

This is the complete list of every place in `apps/web` where a student manipulates or answers a
chemistry question interactively, every route that reaches one, every grading path behind one, and
every reference asset a critic is meant to compare one against. It covers `apps/web`, `packages/`
and `docs/reference/`. It deliberately does NOT cover visual design review, copy review, the economy
ledger, or the server. It is an inventory, not a verdict.

Written 2026-09-04 on branch `phase-5`, at commit `5b4f10b`. Every path and every `file:line` below
was opened on disk during this audit and checked to contain what the sentence says it contains.
Where a fact could not be established it says `UNVERIFIED` and names what would settle it.
Amended 2026-09-07: instance 17, the pilot trainer screen, was added after the pilot gauntlet built
it; section 17 states what it is. Only that section and the counts around it were re-verified on
that date; everything else stands at its original verification.

**The honest qualifier on that promise, because a concurrent session is editing this tree.** Line
numbers were checked against `5b4f10b` plus the working tree at the time of writing. Files that were
DIRTY while this was written can have moved since, and Part 9 lists them by name. The two whose
citations drifted furthest during the audit itself were `apps/web/src/lesson/ProblemView.tsx` and
`apps/web/src/lesson/LessonPlayer.tsx`, both re-checked and re-written in instance 11. If a
`file:line` in this document points a few lines off inside a file Part 9 names as dirty, that is the
drift window and not a fabricated citation. Every PATH resolves; a line number in a dirty file is the
only thing that rots.

Two facts that will trip you if you do not read them first. `apps/mobile` **does not exist**, though
`CLAUDE.md`'s repository-layout table names it. `packages/economy` **does exist** and that same table
omits it. Both verified with `ls apps` and `ls packages`.

---

## Part 1 - The instance table

An instance is any place a student manipulates or answers a chemistry question interactively,
whether or not it draws arrows. Rows 1 to 4 and 17 are TRUE ARROW-PUSHING. Rows 5 to 16 are ADJACENT
SURFACES. Detail for every cell is in Part 2, one section per row, in this order.

| # | Instance | Entry file | Route | Reached from | Question kind | Undo | Step replay | Redraw | Curved arrows | Graded by |
|---|---|---|---|---|---|---|---|---|---|---|
| 1 | Trainer, reaction mode (TRUE ARROW-PUSHING) | `apps/web/src/tabs/trainer/TrainerTab.tsx` | `#/trainer` plus `?reaction=<id>#/trainer` | Tab bar, pathway node, in-tab picker | Single-step mechanism | Automatic only, no button | Yes, after a correct grade | Yes | Yes, constant width | `gradeDrawing`, `apps/web/src/tabs/trainer/grade.ts:72` |
| 2 | Trainer, sequence mode (TRUE ARROW-PUSHING, arrowless glyphs) | `apps/web/src/tabs/trainer/TrainerTab.tsx` | `?sequence=<id>#/trainer` | Pathway node, in-tab picker | Multi-step mechanism | Automatic only | Yes, plus Next step | Yes | No, electron dots | `gradeDrawing`, `apps/web/src/tabs/trainer/grade.ts:72` |
| 3 | Trainer, resonance hunt (TRUE ARROW-PUSHING, arrows forced) | `apps/web/src/tabs/trainer/TrainerTab.tsx` | `?hunt=<id>#/trainer` | Pathway node, in-tab picker | Resonance, one species | Automatic only | Yes | Yes | Yes, forced on | `gradeDrawing`, `apps/web/src/tabs/trainer/grade.ts:72` |
| 4 | Trainer, tutorial variant (TRUE ARROW-PUSHING, DEAD CODE) | `apps/web/src/tabs/trainer/TrainerTab.tsx` | None | Nothing, no caller passes `tutorial` | Single-step mechanism, pinned to SN2 | Automatic only | Yes | Yes | Yes | `gradeDrawing`, `apps/web/src/tabs/trainer/grade.ts:72` |
| 5 | MCQ beat (ADJACENT SURFACE) | `apps/web/src/beats/mcq/McqRunner.tsx` | `#/lesson/<node>` | Pathway START via ChargeGate, trainer picker | Pick one, then Check | No, pick is free until Check | No | No | No | `gradeMcq`, `apps/web/src/beats/mcq/grade.ts:117` |
| 6 | Match board beat (ADJACENT SURFACE) | `apps/web/src/beats/match/MatchBoard.tsx` | `#/lesson/<node>` | Same as row 5 | Pair prompt to target | No | No | No, wrong pairs bounce | No | `beatResultFor`, `apps/web/src/beats/match/board.ts:402` |
| 7 | Sort ladder beat (ADJACENT SURFACE) | `apps/web/src/beats/sort/SortBeatView.tsx` | `#/lesson/<node>` | Same as row 5 | Rank cards on a ladder | No | No | Yes, Adjust the ladder | No | `judgeSort`, `apps/web/src/beats/sort/judge.ts:127` |
| 8 | Synthesis gap beat (ADJACENT SURFACE) | `apps/web/src/beats/synthesis/SynthesisGapBeat.tsx` | `#/lesson/<node>` | Same as row 5 | Fill the blank in a route | Clear the blank, but only when picking from the bank | No | Yes, before Check | No | `gradeSynthesisGap`, `apps/web/src/beats/synthesis/grade.ts:299` |
| 9 | Trace beat, guided rungs L0 to L2 (ADJACENT SURFACE, UNREACHABLE) | `apps/web/src/beats/trace/GuidedCanvas.tsx` | None | Nothing, zero importers outside `src/beats/trace/` | Trace a structure onto guides | No | No | No | No | `gradeDrawing`, `apps/web/src/beats/trace/recognise.ts:275` |
| 10 | Trace beat, freehand rung L3 (ADJACENT SURFACE, UNREACHABLE) | `apps/web/src/beats/trace/FreehandCanvas.tsx` | None | Same as row 9 | Draw a structure from nothing | Yes, Undo and Clear | No | Yes, Clear | No | `gradeDrawing`, `apps/web/src/beats/trace/recognise.ts:275` |
| 11 | Courses lesson player (ADJACENT SURFACE) | `apps/web/src/lesson/LessonPlayer.tsx` | `#/courses/<courseId>/<topicId>` | Courses tab topic list | Seven curriculum kinds, three stubbed | No | No | No, locks on grade | No | `gradeAttempt`, `packages/curriculum/src/grading.ts:134` |
| 12 | Onboarding placement quiz (ADJACENT SURFACE) | `apps/web/src/onboarding/PlacementStep.tsx` | `#/start/placement` | Onboarding flow, legacy `#/start/quiz` | Real chemistry, reuses `ProblemView` | No | No | No, one shot per question | No | `reduceQuiz`, `packages/curriculum/src/quiz/machine.ts:287` |
| 13 | Cards review session (ADJACENT SURFACE) | `apps/web/src/cards/ui/ReviewSession.tsx` | `#/cards`, legacy `#/review` | Cards tab | Recall, then self-rate | No | No | No | No | Nothing, self-graded |
| 14 | Trainer scratchpaper (ADJACENT SURFACE, ungraded) | `apps/web/src/tabs/trainer/TrainerTools.tsx` | None, a modal over `#/trainer` | The trainer's plus-menu | Free ink, no question | Yes, its own Undo and Clear | No | Yes, Clear | No | Nothing, it is a napkin |
| 15 | Flashcard composer (ADJACENT SURFACE, ungraded) | `apps/web/src/cards/ui/CardComposer.tsx` | `#/cards` | The Cards landing's compose control | Write a three-sided reaction card | No | No | Yes, per side, until Save | No | Nothing, the student authors it |
| 16 | pKa settings editor (ADJACENT SURFACE, UNREACHABLE) | `apps/web/src/settings/PkaSettings.tsx` | None | Nothing, the component has zero importers | Edit the pKa ladder to match a professor | No, but a Clear my changes reset | No | Yes, per value | No | Nothing itself, but it FEEDS `judgeSort` |
| 17 | Pilot trainer screen (TRUE ARROW-PUSHING, DEV ROUTE) | `apps/web/src/pilot/screen/PilotScreen.tsx` | `#/gallery/pilot-trainer`, dev only | Typed by hand, nothing links to it, per the gallery-route rule | Resonance with tapered arrows, reaction with the arrowless electron gesture | Yes, an UNDO chip wired to the machine | Yes, a scrubber over the student's own recorded steps | Yes, a REDRAW chip, absent on the won screen | Yes on resonance only, tapered filled outline | `gradeDrawing`, `apps/web/src/tabs/trainer/grade.ts:72`, unchanged |

Seventeen instances (sixteen as originally audited, plus the pilot added 2026-09-07 after the pilot
gauntlet; see section 17 for what it is and is not). Four of the original sixteen are true
arrow-pushing, and all four are the same React component file under
three `Selection` branches plus two dead props, `tutorial` and `onSolved`. THREE of the sixteen are
built and UNREACHABLE, rows 9, 10 and 16, and they sit in two unrelated subsystems rather than one:
that is a pattern, and it is D18. Two more are ungraded by design, rows 14 and 15.

---

## Part 2 - One section per instance

### 1. Trainer, reaction mode

The default thing a student sees when they open the Train tab: one authored mechanism step, answered
by pushing curved arrows between atoms, lone pairs and bonds. It is the only surface in the product
where a student supplies electron flow, and it is the crown-jewel surface `CLAUDE.md` names.

Entry file:

- `apps/web/src/tabs/trainer/TrainerTab.tsx` (930 lines, component at `:220`)

Supporting files:

- `apps/web/src/tabs/trainer/DrawCanvas.tsx` (1225 lines, component at `:486`)
- `apps/web/src/tabs/trainer/hitLayout.ts` (563 lines, targets and the hit tester)
- `apps/web/src/tabs/trainer/grade.ts` (108 lines, the verdict)
- `apps/web/src/tabs/trainer/equivalence.ts` (144 lines, canonical arrow keys)
- `apps/web/src/tabs/trainer/distractors.ts` (154 lines, Tier 2 authored copy)
- `apps/web/src/tabs/trainer/mistakes.ts` (the mistake journal, a localStorage rendering cache that
  seeds the Cards review queue, never an entitlement)
- `apps/web/src/tabs/trainer/feedbackSound.ts` (the synthesised wrong-answer blip, paired with the
  failure animation)
- `apps/web/src/tabs/trainer/CanvasBackdrop.tsx` (the water behind the molecules; it is what makes
  reaction, sequence and hunt look different before a word is read)
- `apps/web/src/tabs/trainer/ProblemBrowser.tsx` (the in-tab problem picker, component at `:22`)
- `apps/web/src/tabs/trainer/TrainerTools.tsx` (the plus-menu and the scratchpaper, instance 14)
- `apps/web/src/demo/reactions.ts` (28 entries, `TRAINER_REACTIONS` declared at `:1936`)
- `apps/web/src/demo/pathwayMap.ts` (the node map the picker reads, 192 nodes across 15 units)
- `apps/web/src/render/layout/stepScene.ts` (one step precomputed as pure data for both renderers,
  and the home of the playback bow rule at `:245-255`)
- `apps/web/src/render/layout/layout.ts` (where each atom of a state sits, the coordinates chem-core
  deliberately does not carry)
- `apps/web/src/render/svg/MoleculeSvg.tsx` (the PLAYBACK renderer, not the draw canvas)
- `apps/web/src/demo/useStepProgress.ts` (the animation clock, supplying `play` and `scrub`)
- `apps/web/src/app/ui/Press.tsx` (the shared press button, imported at `TrainerTab.tsx:50`; the
  press contract is Part 6 item 5)
- `apps/web/src/app/useHashRoute.ts` (`navigate`, imported at `TrainerTab.tsx:72`; it assigns only to
  `window.location.hash`, which is D2's root)

The five mascot modules, listed because `TrainerTab.tsx` imports every one of them and a reader
chasing the berry will otherwise grep for it:

- `apps/web/src/mascot/Berry.tsx` (the component, `TrainerTab.tsx:51`)
- `apps/web/src/mascot/berryBehaviour.ts` (the behaviour type, `TrainerTab.tsx:52`)
- `apps/web/src/mascot/berryMood.ts` (the mood type, `TrainerTab.tsx:53`)
- `apps/web/src/mascot/berryCostume.ts` (`costumeForSurface`, `TrainerTab.tsx:54`)
- `apps/web/src/mascot/berryReaction.ts` (`reactionFor` and `SETTLED_AFTER_MISS`, `TrainerTab.tsx:55`)

Route: `#/trainer`. The tab id is declared at `apps/web/src/app/routes.ts:86`, parsed at
`routes.ts:158-160`, and rendered at `apps/web/src/app/Shell.tsx:110-111`. This is the ONLY tab
imported statically rather than lazily (`Shell.tsx:51`).

Deep link: `?reaction=<id>#/trainer`, read at `TrainerTab.tsx:168` and consumed at `TrainerTab.tsx:225`.

Wired to a lesson node or a Train-tab entry at:

- `apps/web/src/tabs/pathway/PathwayTab.tsx:933-939` (`hrefForPlayable`, which builds
  `?reaction=<id>#/trainer` for a `reaction` link)
- `apps/web/src/tabs/trainer/TrainerTab.tsx:567-570` (the `ProblemBrowser` mount,
  `onPick={openPlayable}`)
- `apps/web/src/tabs/trainer/ProblemBrowser.tsx:22` (the picker component itself, which calls
  `onPick(node.playable)` at `:29`; the opener chip reads `<current title> · change` at `:43`)
- `apps/web/src/tabs/trainer/TrainerTab.tsx:516-535` (`openPlayable`, the exhaustive switch)

Question kind: reaction-and-mechanism completion. Not a resonance problem. `resolveSelection`
(`TrainerTab.tsx:124-128`) sets `arrowless: false, resonance: false` for every reaction entry.

- UNDO: **no student-facing control.** The interaction machine has an undo stack, and the shell
  dispatches it automatically to retract an illegal or unrequested arrow, at `TrainerTab.tsx:444`
  and `TrainerTab.tsx:469`. The design note is at `TrainerTab.tsx:276-280`: "the machine has an undo
  stack but no clear command by design". The only labelled Undo in this tab belongs to the
  scratchpaper (`TrainerTools.tsx:305`), which draws ink, not arrows.
- STEP REPLAY: **yes, post-hoc only.** `useStepProgress` at `TrainerTab.tsx:274` supplies `play` and
  `scrub`. The Play/Replay button is at `TrainerTab.tsx:685-687` and the scrub slider at
  `TrainerTab.tsx:688-691`. Both live inside `mode === "play"`, and mode flips to `play` only on a
  correct verdict (`TrainerTab.tsx:428`) or under `?auto=1` (`TrainerTab.tsx:246`). There is no way
  to scrub the answer while attempting it, which `DrawCanvas.tsx:1079-1086` records as a deliberate
  anti-requirement, not an omission.
- REDRAW: **yes.** `reset` at `TrainerTab.tsx:537` bumps `epoch`, and `DrawCanvas` is keyed on epoch
  (`TrainerTab.tsx:625`), so a fresh store is built over a fresh draft. Three call sites: the ghost
  "Start over" at `TrainerTab.tsx:678-680`, "Draw it again" at `TrainerTab.tsx:692-694`, and the
  verdict card's footer `onStartOver` wired at `TrainerTab.tsx:653` and rendered at
  `TrainerTab.tsx:809-811`.
- CURVED ARROWS: **yes.** Three draw sites in this instance, all in
  `apps/web/src/tabs/trainer/DrawCanvas.tsx`: the committed arrow at `:1071-1072` (a `--card` halo at
  `strokeWidth={7}` under a `--primary` stroke at `strokeWidth={3}`), the rejected-arrow ghost at
  `:1133-1134` (dashed, `--warn`), and the in-flight arrow at `:1182-1208`. Arrowheads are SVG
  markers defined at `:880` (`draw-arrowhead`) and `:883` (`draw-arrowhead-warn`). The curve is
  `curveAway` at `:364-367`, over `bowAwayFrom` at `apps/web/src/tabs/trainer/hitLayout.ts:413-436`.
  For the CLOSED list of every arrow-drawing site in the app, and the proof that none of them tapers,
  see the subsection below.
- CURVED-ARROW COLOUR, named separately because "change how a curved arrow looks" most often means
  change its colour, and the tokens live two files away from the `<path>` that spends them. The three
  the arrows use are declared in the light block of `apps/web/src/theme.css`: `--primary` at `:112`,
  `--electron-glow` at `:281`, `--warn` at `:305`. Their dark overrides are in the same file at
  `:514`, `:558` and `:567`. `--primary` and `--warn` resolve one layer down into the primitive ramp
  at `apps/web/src/tokens.css:170` and `:184`; `--electron-glow` has no primitive and is authored
  directly in `theme.css`. Which token goes where: the committed arrow stroke is `--primary`
  (`apps/web/src/tabs/trainer/DrawCanvas.tsx:1072`) over a `--card` halo (`:1071`), the rejected ghost
  is `--warn` (`DrawCanvas.tsx:1134`), the arrowless electron dots are `--electron-glow`
  (`DrawCanvas.tsx:1066-1067`), and the playback arrow and its marker fill are `--primary`
  (`apps/web/src/render/svg/MoleculeSvg.tsx:233` and `:138`).
- GRADING: `gradeDrawing(step, mechanism.arrows)` at `apps/web/src/tabs/trainer/grade.ts:72`, called
  from `TrainerTab.tsx:417`. Returns `DrawVerdict` (`apps/web/src/tabs/trainer/grade.ts:41-45`). Tier 1 legality comes from
  chem-core's `arrowLegalityFindings` (`apps/web/src/tabs/trainer/grade.ts:73`), Tier 1 copy from `@blueberry/feedback`, and
  Tier 2 from `matchDistractor` (`apps/web/src/tabs/trainer/distractors.ts:152-153`), called at
  `TrainerTab.tsx:453`.

#### Every arrow-drawing site in `apps/web`, as a CLOSED list

An exhaustiveness claim a reader cannot check is worse than a list, so here is the complete set,
found by grepping `apps/web/src` for `<marker id=` and for `markerEnd=`. THREE files define an
arrowhead marker and THREE files use one. There are no others.

| File | Marker defined | Marker used | What it draws |
|---|---|---|---|
| `apps/web/src/tabs/trainer/DrawCanvas.tsx` | `:880` (`draw-arrowhead`), `:883` (`draw-arrowhead-warn`) | `:1072`, `:1134`, `:1208` | The student's electron-flow arrows: committed, rejected ghost, in flight |
| `apps/web/src/render/svg/MoleculeSvg.tsx` | `:137` (`arrowhead`, its OWN marker, a different id and different geometry from DrawCanvas's) | `:236` | The playback electron-flow arrows, on the same steps |
| `apps/web/src/beats/trace/GuidedCanvas.tsx` | `:263-267` (a template-literal id, `` `${markerId}-head` ``) | `:403` | **NOT an electron-flow arrow.** See below |

**Why `GuidedCanvas.tsx` is excluded from the electron-flow arrow count, stated rather than assumed.**
Its arrow is a dashed TRACING GUIDE: the not-yet-drawn remainder of a bond stroke, rendered at
`GuidedCanvas.tsx:396-405` as `polylineToPathData(remainder.points)` with `strokeWidth={5}` and
`strokeDasharray="12 10"`, with the head at the far end to show which way to draw. It says "your
finger goes this way", not "these electrons go there". It is also on an orphaned surface, per
instance 9. So it is a third arrowhead in the codebase and NOT a fourth electron-flow arrow, and both
halves of that sentence matter: a reader grepping for `markerEnd` will find it, and should know why
it is not on the list they are counting.

**And nothing tapers. Two numbers, stated separately, because a "draw site" and a `<path>` are not
the same thing and an earlier draft of this line conflated them.**

**FOUR sites draw an electron-flow arrow**: three in `DrawCanvas.tsx` and one in `MoleculeSvg.tsx`.
A FIFTH site, `GuidedCanvas.tsx`, draws the tracing guide excluded above, giving five arrow-drawing
sites in total. **Those five sites emit EIGHT `<path>` elements**, because three of the four
electron-flow sites lay a halo path underneath the stroke path so the arrow is not visually cut into
pieces where it crosses a hydrogen letter or a lone pair (the reason is written at
`DrawCanvas.tsx:1058-1060`).

| Site | Paths | `strokeWidth` |
|---|---|---|
| Committed arrow, `apps/web/src/tabs/trainer/DrawCanvas.tsx:1071-1072` | 2, a `--card` halo then a `--primary` stroke | `{7}` then `{3}` |
| Rejected ghost, `apps/web/src/tabs/trainer/DrawCanvas.tsx:1133-1134` | 2, halo then a dashed `--warn` stroke | `{7}` then `{3}` |
| In flight, `apps/web/src/tabs/trainer/DrawCanvas.tsx:1182` and `:1183-1209` | 2, halo then stroke | `{8}` then `{3.5}` (at `:1192`) |
| Playback, `apps/web/src/render/svg/MoleculeSvg.tsx:229-241` | 1, no halo | `{3.5}` (at `:234`) |
| Tracing guide, `apps/web/src/beats/trace/GuidedCanvas.tsx:396-405`, NOT electron flow | 1 | `{5}` (at `:400`) |

**The "nothing tapers" claim ranges over the EIGHT PATHS, not over the five sites.** Every one of the
eight is an SVG `stroke` on a `<path>`, and an SVG stroke has one width for the whole path, so the
claim is checkable by opening eight lines. Sequence mode is not a ninth: in `arrowless` mode the
committed render draws two `<circle>` electron dots at `DrawCanvas.tsx:1066-1067` and no path at all,
which is why instance 2's curved-arrow row reads "no". A tapered arrow is not a
stroke at all, it is a filled outline, which is a genuinely different construction from everything
now in the tree. See Part 5 for the reference image and Part 9 for why it is an open owner question
rather than a defect.

#### Where to change how a curved arrow looks, as a file list rather than a hunt

The commonest edit on this surface, so the files are listed in the order the change touches them
rather than left to a grep. Nothing here is a procedure with a required order; it is a map of which
question lands in which file.

| What you want to change | File and line |
|---|---|
| Its COLOUR, live | `apps/web/src/theme.css:112` (`--primary`), `:281` (`--electron-glow`), `:305` (`--warn`), dark overrides at `:514`, `:558`, `:567` |
| Its colour one layer down, the primitive ramp | `apps/web/src/tokens.css:170` and `:184`. `--electron-glow` has no primitive and is authored directly in `theme.css` |
| Which token the drawn arrow spends | `apps/web/src/tabs/trainer/DrawCanvas.tsx:1072` (stroke), `:1071` (halo), `:1134` (rejected ghost), `:1066-1067` (arrowless electron dots) |
| Which token the PLAYBACK arrow spends | `apps/web/src/render/svg/MoleculeSvg.tsx:233` and the marker fill at `:138` |
| Its thickness | The `strokeWidth` props listed in the paragraph above. Both copies, or draw and playback disagree |
| Its arrowhead shape | `apps/web/src/tabs/trainer/DrawCanvas.tsx:880` and `:883`, and separately `apps/web/src/render/svg/MoleculeSvg.tsx:137`. These are three different marker definitions and none of them is shared |
| How far it bows, on the draw canvas | `apps/web/src/tabs/trainer/hitLayout.ts:413-436` (`bowAwayFrom`), with `BOW_PX = 34` at `apps/web/src/tabs/trainer/DrawCanvas.tsx:213` |
| How far it bows, in playback | `apps/web/src/render/layout/stepScene.ts:245-255` and `apps/web/src/render/svg/MoleculeSvg.tsx:220-224`. A DIFFERENT rule, see Part 6 item 1 and D11 |
| Where it lands on the atom | `landingOnRim` at `apps/web/src/tabs/trainer/hitLayout.ts:439`, with `LAND_GAP = 16` at `DrawCanvas.tsx:223` |

The trap in that table is the pairing: colour is one edit because both renderers read the same token,
and geometry is two edits because they do not share a rule. Change one bow and the arrow a student
draws stops matching the arrow they are shown afterwards.

### 2. Trainer, sequence mode

The same component pointed at a multi-step chain: the student walks the steps of one reaction in
order, one screen per step, with a Next step button between them. Sequences run ARROWLESS on purpose,
because the electron gesture carries the answer and no arrow glyph is drawn at all.

Entry file:

- `apps/web/src/tabs/trainer/TrainerTab.tsx`

Supporting files:

- `apps/web/src/demo/sequences.ts` (34 entries, `TRAINER_SEQUENCES` declared at `:5006`)
- everything listed under instance 1

Route: `?sequence=<id>#/trainer`. Read at `TrainerTab.tsx:169`, consumed at `TrainerTab.tsx:226`.
No hash of its own.

Wired at `apps/web/src/tabs/pathway/PathwayTab.tsx:933-939` (a `sequence` link becomes
`?sequence=<id>#/trainer`) and at `apps/web/src/tabs/trainer/TrainerTab.tsx:521-523`
(`openPlayable`'s `sequence` branch).

Question kind: multi-step reaction-and-mechanism completion. Not resonance.

- UNDO: identical to instance 1. Automatic only, `TrainerTab.tsx:444` and `:469`.
- STEP REPLAY: yes, same controls, plus advancing. The "Next step" button at
  `TrainerTab.tsx:695-698` calls `pickSelection` with `stepIndex + 1`. The step counter is at
  `TrainerTab.tsx:572-576`.
- REDRAW: yes, identical to instance 1 (`TrainerTab.tsx:537`).
- CURVED ARROWS: **no.** `resolveSelection` sets `arrowless: true` at `TrainerTab.tsx:141`, which
  reaches `DrawCanvas` as a prop at `TrainerTab.tsx:625` and resolves the primitive to `electron` at
  `DrawCanvas.tsx:487`. The committed render then draws twin electron dots at the landing and
  explicitly no curve and no head, at `DrawCanvas.tsx:1061-1068`.
- GRADING: `gradeDrawing`, `apps/web/src/tabs/trainer/grade.ts:72`. Same path as instance 1.

### 3. Trainer, resonance hunt

One species, nothing reacting, and the student's job is to move the electrons that show a
contributing structure. Arrows are FORCED on here even when the global primitive flag says otherwise,
because the hunt is where the arrow itself is the lesson.

Entry file:

- `apps/web/src/tabs/trainer/TrainerTab.tsx`

Supporting files:

- `apps/web/src/demo/resonance.ts` (3 entries, `RESONANCE_HUNT` declared at `:138`)
- everything listed under instance 1

Route: `?hunt=<id>#/trainer`. Read at `TrainerTab.tsx:170`, consumed at `TrainerTab.tsx:227`. Note the
query parameter is spelled `hunt` while the `PlayableLink` kind is spelled `resonance`
(`apps/web/src/demo/pathwayMap.ts:23`); the translation happens at `PathwayTab.tsx:937`.

Wired at `apps/web/src/tabs/pathway/PathwayTab.tsx:933-939` and at
`apps/web/src/tabs/trainer/TrainerTab.tsx:524-526`.

Question kind: **this is the resonance problem.** `resolveSelection` sets `resonance: true` at
`TrainerTab.tsx:148`. The one-species note the student reads is at `TrainerTab.tsx:577-579`. The
canvas backdrop switches to the resonance mode at `TrainerTab.tsx:236-240`.

- UNDO: automatic only, `TrainerTab.tsx:444` and `:469`.
- STEP REPLAY: yes, `TrainerTab.tsx:685-691`.
- REDRAW: yes, `TrainerTab.tsx:537`.
- CURVED ARROWS: **yes, forced.** `forceArrows={playable.resonance}` at `TrainerTab.tsx:625`,
  resolved at `DrawCanvas.tsx:487`. Rendered at `DrawCanvas.tsx:1071-1072`, constant width.
- GRADING: `gradeDrawing`, `apps/web/src/tabs/trainer/grade.ts:72`. Success copy comes from the
  entry's `foundLine` rather than `successLine` (`TrainerTab.tsx:148`), which is the same field under
  two names.

### 4. Trainer, tutorial variant (DEAD CODE)

A guided five-step checklist over the SN2 step, with a Continue button that reports the first correct
answer to a caller. It is fully built and nothing calls it.

Entry file:

- `apps/web/src/tabs/trainer/TrainerTab.tsx`

Route: **none, and it has no route because it has no caller.** `TrainerTab` is mounted in exactly one
place, `apps/web/src/app/Shell.tsx:111`, as `<TrainerTab reducedMotion={reducedMotion} />`. A grep
for `tutorial={` across `apps/web/src` returns zero hits, and `onSolved` appears only inside
`TrainerTab.tsx` itself (`:209`, `:220`, `:700-701`).

Question kind: single-step mechanism, pinned to `FIRST_REACTION` at `TrainerTab.tsx:230` regardless
of the student's selection.

- The props are declared at `TrainerTab.tsx:205-210`.
- The five authored lines are `TUTORIAL_STEPS` at `TrainerTab.tsx:212-218`.
- The progress derivation is `tutorialIndex` at `TrainerTab.tsx:549-556`.
- The checklist renders at `TrainerTab.tsx:596-604`.
- The hand-off button is at `TrainerTab.tsx:700-702`.
- UNDO, STEP REPLAY, REDRAW, CURVED ARROWS and GRADING are all identical to instance 1, because this
  is instance 1 with two extra props. Only the problem picker is suppressed (`TrainerTab.tsx:566`).

### 5. MCQ beat

The recognise slot of a lesson: a question with option cards, free to change your mind, one Check
that commits, then an authored reveal. It is the most common beat on the map, serving eight nodes.

Entry file:

- `apps/web/src/beats/mcq/McqRunner.tsx` (runner, component at `:99`)

Supporting files:

- `apps/web/src/beats/mcq/McqBeatView.tsx` (the question view, component at `:107`)
- `apps/web/src/beats/mcq/grade.ts` (`gradeMcq` at `:117`, `revealHeading` at `:169`)
- `apps/web/src/beats/mcq/session.ts` (playing a RUN of easy beats, pure, no React and no clock)
- `apps/web/src/beats/mcq/content.ts` (the authored questions, and nothing but data)
- `apps/web/src/beats/mcq/card.ts` (turns a missed MCQ into a Cards offer, builds and saves nothing)
- `apps/web/src/beats/mcq/authoring.ts` (the authoring contract made executable, and the one importer
  of `voiceViolations`; see Part 6 item 7)
- `apps/web/src/beats/mcq/index.ts` (the barrel, so an integrating surface writes one path)
- `apps/web/src/beats/BeatRunner.tsx` (the host, component at `:105`)
- `apps/web/src/beats/template.ts` (the plan, `planLesson` at `:123`)
- `apps/web/src/beats/RecipeStrip.tsx`, `apps/web/src/beats/ChipPress.tsx`,
  `apps/web/src/beats/beat-chrome.css`

Route: `#/lesson/<node>`. Parsed at `apps/web/src/app/routes.ts:152`, built by `hrefForLesson`
(`routes.ts:168-170`), rendered by `apps/web/src/App.tsx:99-109`, which lazily mounts `BeatRunner`.

Wired to a lesson node at `apps/web/src/beats/template.ts:130-132` (`planLesson` pushes a
`recognise` step when `mcqBeatsForNode(node)` is non-empty) and mounted at
`apps/web/src/beats/BeatRunner.tsx:202-214`, lazily imported at `BeatRunner.tsx:82`. Reached from the
pathway at `apps/web/src/tabs/pathway/PathwayTab.tsx:936` (a `beat` link becomes `#/lesson/<id>`) and
from the trainer's picker at `apps/web/src/tabs/trainer/TrainerTab.tsx:527-529`.

Nodes served, from the `node:` keys in `apps/web/src/beats/mcq/content.ts`: `u1-kvt`, `u3-blocking`,
`u3-directing`, `u3-nitro-red`, `u7-protect`, `u9-kvt-enolate`, `u10-nitro-red`, `u11-acidity`.

Question kind: neither resonance nor a structure completion. It is a multiple choice recognition
question with an authored line per option.

- UNDO: **no.** There is no undo control. The selection is free to change until Check, which the
  copy states at `McqBeatView.tsx:104`. The commit happens in `primary()` at `McqRunner.tsx:131-145`.
- STEP REPLAY: **no.** Nothing is animated to replay.
- REDRAW: **no.** One commit per beat. After the reveal the same button advances
  (`McqRunner.tsx:132-138`).
- CURVED ARROWS: **no.** This surface has no canvas.
- GRADING: `gradeMcq(attempt)` at `apps/web/src/beats/mcq/grade.ts:117`, returning `McqReveal`
  (`apps/web/src/beats/mcq/grade.ts:67-107`), not a `BeatResult`. See Part 4.

### 6. Match board beat

The connect slot: prompt cards on one side, target cards on the other, and the student pairs them. A
wrong pair bounces rather than sticking, so the board a student finishes is always the author's board.

Entry file:

- `apps/web/src/beats/match/MatchBoard.tsx` (587 lines, component at `:143`)

Supporting files:

- `apps/web/src/beats/match/board.ts` (443 lines, the reducer, `beatResultFor` at `:402`,
  `boardVerdict` at `:369`, `causeForBoard` at `:384`, `cardForMiss` at `:427`)
- `apps/web/src/beats/match/boards.ts` (the authored boards)
- `apps/web/src/beats/match/spec.ts`
- `apps/web/src/beats/match/reasons.ts` (`messageForLanding` at `:71`, `messageForMiss` at `:92`)
- `apps/web/src/beats/match/match.css`
- `apps/web/src/beats/match/index.ts`
- `apps/web/src/beats/BeatRunner.tsx`

Route: `#/lesson/<node>`, same handling as instance 5.

Wired at `apps/web/src/beats/template.ts:133-135` and mounted at
`apps/web/src/beats/BeatRunner.tsx:215-224`, lazily imported at `BeatRunner.tsx:83`. The board for a
node is selected by `matchBoardsForNode` at `BeatRunner.tsx:70-72`.

Nodes served: `u5-syn-diol` (`apps/web/src/beats/match/boards.ts:65`), `u9-pka` (`boards.ts:125`),
`u6-ir` (`boards.ts:184`, **orphaned, see Part 8**), `u5-protecting` (`boards.ts:242`).

Question kind: a pairing question over authored cards. Not resonance, not a structure completion.

- UNDO: **no.** There is no undo and no reset. A wrong pair is refused and journalled as a miss, and
  a landed pair stays landed. The rationale is written at `apps/web/src/beats/match/board.ts:396-401`.
- STEP REPLAY: **no.**
- REDRAW: **no**, for the reason above.
- CURVED ARROWS: **no.**
- GRADING: `beatResultFor(spec, state, input)` at `apps/web/src/beats/match/board.ts:402`, called
  from the completion effect at `MatchBoard.tsx:271-280`. Returns a `BeatResult` and always with
  `kind: "correct"`, by design.

### 7. Sort ladder beat

The order slot: cards that must be ranked on a ladder, for example the oxidation ladder or acyl
reactivity. It is the only beat that lets a student re-open a judged answer and try the ordering
again.

Entry file:

- `apps/web/src/beats/sort/SortBeatView.tsx` (556 lines, component at `:141`)

Supporting files:

- `apps/web/src/beats/sort/judge.ts` (277 lines, `judgeSort` at `:127`, `SortJudgement` at `:61-73`)
- `apps/web/src/beats/sort/board.ts`
- `apps/web/src/beats/sort/ladders.ts`
- `apps/web/src/beats/sort/sort.css`
- `apps/web/src/beats/sort/index.ts`
- `apps/web/src/beats/BeatRunner.tsx`

Route: `#/lesson/<node>`, same handling as instance 5. Concretely `#/lesson/u5-oxidation`,
`#/lesson/u8-ladder`, `#/lesson/u10-basicity`.

Wired at `apps/web/src/beats/template.ts:136-139`, which reads `LADDER_FOR_NODE`
(`apps/web/src/beats/template.ts:76-80`), and mounted at `apps/web/src/beats/BeatRunner.tsx:225-234`,
lazily imported at `BeatRunner.tsx:84`.

Question kind: an ordering question. Not resonance, not a structure completion.

- UNDO: **no**, there is no per-move undo. Cards can be re-placed freely before Check
  (`SortBeatView.tsx:300-302`).
- STEP REPLAY: **no.**
- REDRAW: **yes.** "Adjust the ladder" at `SortBeatView.tsx:498` calls `adjust`
  (`SortBeatView.tsx:319-322`), which clears the judgement and restarts the timer, so a wrong
  ordering can be reworked. It is offered only when the beat was not cleared
  (`SortBeatView.tsx:492-499`).
- CURVED ARROWS: **no.**
- GRADING: `judgeSort(content, board, context)` at `apps/web/src/beats/sort/judge.ts:127`, called at
  `SortBeatView.tsx:304-317`. Returns `SortJudgement` (`apps/web/src/beats/sort/judge.ts:61-73`), which WRAPS a `BeatResult`
  rather than being one. See Part 4.
- **THE STUDENT-CONFIGURABLE INPUT, and it is the one thing about this beat a reader will not guess.**
  The pKa table this ladder is judged against is not fixed. `apps/web/src/beats/sort/SortBeatView.tsx:158`
  reads `const table = settings ?? liveSettings`, where the `settings` prop (`:126`) is a preview
  override and `liveSettings` is the live snapshot of the `pkaSettings` store imported at `:88-92`
  from `apps/web/src/settings/pka.ts`. So a student's own pKa numbers reach a grader on a routable
  surface. The editor for those numbers is `apps/web/src/settings/PkaSettings.tsx`, which is instance
  16, and it is UNREACHABLE: nothing in the app imports the component. The read here at `:154-156` is
  the store's ONLY use outside that editor, and it takes `subscribe` and `getSnapshot` only, so
  **every student who sorts this ladder is marked against the default preset.** The input is live,
  the control for it is not, and the full five-link proof is in instance 16. See D18.

### 8. Synthesis gap beat

The produce slot: a synthesis route with a hole in it, and the student supplies the missing reagent,
reactant or product, either by picking from a bank or by typing it at the top rung.

Entry file:

- `apps/web/src/beats/synthesis/SynthesisGapBeat.tsx` (389 lines, component at `:161`)

Supporting files:

- `apps/web/src/beats/synthesis/grade.ts` (434 lines, `gradeSynthesisGap` at `:299`,
  `beatCauseForCurriculumCause` at `:86`, `explainSynthesisResult` at `:381`)
- `apps/web/src/beats/synthesis/corpus.ts` (`synthesisGapsForNode` at `:568`)
- `apps/web/src/beats/synthesis/problem.ts` (the gap itself: a real multistep route with exactly one
  blank in it)
- `apps/web/src/beats/synthesis/parse.ts` (turns what a student TYPED into reagent tokens the
  curriculum checker can compare; this is what makes the top rung fair)
- `apps/web/src/beats/synthesis/cards.ts` (gap to Cards offer, and the bare default in D6 is here)
- `apps/web/src/beats/synthesis/speech.ts` (the spoken-answer SEAM; nothing in it recognises speech)
- `apps/web/src/beats/synthesis/structures.ts` (what a reactant gap's chips stand for, built through
  chem-core's real constructors)
- `apps/web/src/beats/synthesis/beats.ts` (the adapter that makes a gap satisfy `beats/types.ts`)
- `apps/web/src/beats/synthesis/index.ts` (the barrel: component, corpus, grader)
- `apps/web/src/beats/BeatRunner.tsx`

Route: `#/lesson/<node>`, same handling as instance 5. Concretely `#/lesson/u3-sequencing`,
`#/lesson/u9-retro`, `#/lesson/u14-orthogonal`.

Wired at `apps/web/src/beats/template.ts:140-142` and mounted at
`apps/web/src/beats/BeatRunner.tsx:235-244`, lazily imported at `BeatRunner.tsx:85-87`.

Node coverage in the corpus: `u3-sequencing` at `apps/web/src/beats/synthesis/corpus.ts:48`, `:115`
and `:187`; `u9-retro` at `:263`, `:318` and `:376`; `u14-orthogonal` at `:441` and `:498`. An earlier
audit pass wrongly reported these three nodes as empty; the gaps live in `corpus.ts`, not in
`beats.ts`, and all three resolve.

Question kind: the supply-the-reagents answer shape, read as a gap. Not resonance, not a structure
drawing.

- UNDO: **per slot, and CONDITIONALLY.** The "Clear the blank" control is at
  `SynthesisGapBeat.tsx:126-131`. It is offered twice, and both offers are gated: at
  `SynthesisGapBeat.tsx:263` on `banked && picked !== undefined && result === null`, and at `:275` on
  `picked !== undefined && result === null`. So a student who is PICKING from the bank can clear, and
  a student TYPING the top-rung answer described above gets no Clear at all. The table cell says
  "only when picking from the bank" for that reason.
- STEP REPLAY: **no.**
- REDRAW: **yes, before Check.** Clearing and re-picking is free until the Check at
  `SynthesisGapBeat.tsx:363` commits.
- CURVED ARROWS: **no.** The route is drawn as a scheme, not as electron flow.
- GRADING: `gradeSynthesisGap(input)` at `apps/web/src/beats/synthesis/grade.ts:299`. Returns a real
  `BeatResult`, which makes it one of only two graders in the app that can produce all four
  documented result types. See Part 4.

### 9. Trace beat, guided rungs (L0 to L2) - BUILT AND UNREACHABLE

A structure-drawing canvas with guides: the target skeleton is shown as a faint channel and the
student traces it, with the guides fading rung by rung. It is complete, tested, and wired to nothing.

Entry file:

- `apps/web/src/beats/trace/GuidedCanvas.tsx` (480 lines, component at `:87`)

Supporting files:

- `apps/web/src/beats/trace/TraceBeatView.tsx` (278 lines, host component at `:94`, guided branch at
  `:213`, Check at `:262`, `outcomeLine` at `:74-92`)
- `apps/web/src/beats/trace/recognise.ts` (346 lines, `recognise` at `:182`, `gradeDrawing` at `:275`,
  `toBeatResult` at `:314`, `guidedCause` at `:344`, `TraceOutcome` at `:261-264`)
- `apps/web/src/beats/trace/geometry.ts`
- `apps/web/src/beats/trace/target.ts`
- `apps/web/src/beats/trace/render.ts`
- `apps/web/src/beats/trace/content.ts`
- `apps/web/src/beats/trace/index.ts`
- `apps/web/src/beats/trace/PressButton.tsx` (this subtree's own press button, component at `:52`)
- Tests: `apps/web/test/traceContent.test.ts`, `apps/web/test/traceGeometry.test.ts`,
  `apps/web/test/traceRecognise.test.ts`

Route: **NONE, and here is the reason, stated so nobody re-derives it.** A grep for `TraceBeatView`,
`GuidedCanvas`, `FreehandCanvas` and `beats/trace` across `apps/web/src` excluding
`apps/web/src/beats/trace/` returns zero hits. The only importers anywhere are the three test files
above, and none of them imports a component. Separately, `ResolvedBeat`
(`apps/web/src/beats/template.ts:86-90`) has four members, `mcq | match | sort | synthesis`, and the
string `trace` does not occur anywhere in `apps/web/src/beats/template.ts`, so `planLesson` cannot
schedule a trace beat even if one were authored for a node. There is no hash that reaches this file.
This surface is not the app's only orphan, which an earlier pass of this file implied: instance 16 is
a third, in an unrelated subsystem. The pattern is D18.

Question kind: **this is the structure-drawing surface**, and it is the shape
`apps/web/src/lesson/ProblemView.tsx:90-101` currently stubs out with an apology. Related:
`apps/web/src/beats/types.ts:121-128` declares SEVEN beat kinds and three of them (`mechanism`,
`resonance`, `trace`) are never planned into a lesson.

- UNDO: **no.** `GuidedCanvas.tsx` contains no undo, no clear and no reset control. A grep for
  `undo|Undo|clear|Clear` over that file returns nothing.
- STEP REPLAY: **no.**
- REDRAW: **no.**
- CURVED ARROWS: **no.** This canvas draws bonds, not electron flow.
- GRADING: `gradeDrawing(target, drawn)` at `apps/web/src/beats/trace/recognise.ts:275`, called from
  `TraceBeatView.tsx:262`. Note this is a SECOND function named `gradeDrawing`, with a different
  signature and a different return type from the trainer's. Its `TraceOutcome`
  (`apps/web/src/beats/trace/recognise.ts:261-264`) is a three-way union collapsed to a `BeatResult`
  by `toBeatResult` at `apps/web/src/beats/trace/recognise.ts:314`.

### 10. Trace beat, freehand rung (L3) - BUILT AND UNREACHABLE

The same beat at the top rung, with no guides: the student draws the structure from nothing. It has
the most complete undo story in the product and nobody can reach it.

Entry file:

- `apps/web/src/beats/trace/FreehandCanvas.tsx` (315 lines, component at `:65`)

Supporting files: identical to instance 9. Mounted only by
`apps/web/src/beats/trace/TraceBeatView.tsx:211`.

Route: **NONE.** Same evidence as instance 9.

Question kind: structure drawing, freehand.

- UNDO: **yes**, and it is the most complete undo in the product: a real stack, on a real drawing.
  It is NOT the only student-facing undo on a question surface, and an earlier draft of this file
  said it was. `apps/web/src/beats/synthesis/SynthesisGapBeat.tsx:126-131` offers
  `onClear: () => setPickedId(null)` on a ROUTABLE surface (instance 8, `#/lesson/<node>`), which is
  a one-slot undo a student can actually reach today. The narrower claim that survives, and the one
  worth carrying: **the trainer, the crown-jewel arrow surface, has no undo control a student can
  press at all.** The button is at `FreehandCanvas.tsx:295-296`, the handler at
  `FreehandCanvas.tsx:154-158`. The stack
  is whole snapshots, pushed at `FreehandCanvas.tsx:92`, and the design note defending snapshots over
  inverse operations is at `FreehandCanvas.tsx:21-23`. It carries a bug, described in Part 6 and
  Part 8.
- STEP REPLAY: **no.**
- REDRAW: **yes.** "Clear" at `FreehandCanvas.tsx:298-299`, handler at `FreehandCanvas.tsx:160-163`.
- CURVED ARROWS: **no.**
- GRADING: `gradeDrawing`, `apps/web/src/beats/trace/recognise.ts:275`. Same as instance 9.

### 11. Courses lesson player

The authored-curriculum runner: a topic's problems, one at a time, graded by `packages/curriculum`.
It is the surface that carries the two thirds of the syllabus that is not mechanism chemistry.

Entry file:

- `apps/web/src/lesson/LessonPlayer.tsx` (519 lines, component at `:138`)

Supporting files:

- `apps/web/src/lesson/ProblemView.tsx` (445 lines, component at `:63`, the answer-kind switch at
  `:65-118`)
- `apps/web/src/lesson/Feedback.tsx` (`Explain` at `:25`, the result mapping at `:71`)
- `apps/web/src/lesson/RewardMoment.tsx`
- `apps/web/src/lesson/LessonVideo.tsx`
- `packages/curriculum/src/grading.ts` (`gradeAttempt` at `:134`, `GradingResult` at `:81-119`)
- `packages/curriculum/src/explanation.ts` (`voiceViolations` at `:115`)
- `apps/web/src/tabs/courses/CoursesTab.tsx` (the host, mounts the player at `:350-357`)

Route: `#/courses/<courseId>/<topicId>`, for example `#/courses/orgo_2/aromaticity`. The tab is parsed
at `apps/web/src/app/routes.ts:158-160` with the rest of the path handed through as `rest`
(`apps/web/src/app/Shell.tsx:118-119`), and `apps/web/src/tabs/courses/CoursesTab.tsx:340-357` turns
`rest` into a course and a topic. The player has no route of its own.

Wired to a lesson at `apps/web/src/tabs/courses/CoursesTab.tsx:350-357`. It is NOT reachable from a
pathway node and NOT reachable from the Train tab.

Question kind: **seven authored answer kinds, and three of them are stubs.** The seven are declared
once, in `packages/curriculum/src/kinds.ts:49-56`, with `answerKindCount()` at `:68` returning the
number so nothing has to count them by hand.
`apps/web/src/lesson/ProblemView.tsx:65-118` switches on `problem.answer.kind`. `multiple_choice`
(`:66-73`), `major_product` (`:74-83`), `numeric` (`:84-85`) and `reagents` (`:86-89`) are real
inputs. `structure` (`:90-101`) renders a dashed box saying the drawing canvas "arrives with the
editor route" and skips the question without penalty, even though instances 9 and 10 are exactly that
canvas, built and orphaned. `ordering` and `matching` (`:102-118`) skip for the same reason, pointing
at the beats runners that already exist.

- UNDO: **no.**
- STEP REPLAY: **no.**
- REDRAW: **no.** The inputs lock the moment a result exists: `locked={result !== null}` at
  `LessonPlayer.tsx:466`, and the prop is documented at `ProblemView.tsx:57-58`.
- CURVED ARROWS: **no.**
- GRADING: `gradeAttempt(problem, state)` from `@blueberry/curriculum`, called at
  `LessonPlayer.tsx:208`, defined at `packages/curriculum/src/grading.ts:134`. Returns
  `GradingResult` (`grading.ts:81-119`), a TIER vocabulary rather than an outcome vocabulary. See
  Part 4.

### 12. Onboarding placement quiz

Real chemistry sat before signup, which places the student into a course. It reuses the lesson's own
`ProblemView`, so its answer widgets are literally the same components as instance 11.

Entry file:

- `apps/web/src/onboarding/PlacementStep.tsx` (495 lines, component at `:118`)

Supporting files:

- `apps/web/src/lesson/ProblemView.tsx` (handed the problem at `PlacementStep.tsx:375`)
- `apps/web/src/onboarding/StructureFigure.tsx` (the drawn answer tiles, used at
  `PlacementStep.tsx:485`)
- `apps/web/src/onboarding/figures.ts` (the per-question figure data)
- `apps/web/src/onboarding/Onboarding.tsx` (the host, the placement case at `:293-304`)
- `apps/web/src/onboarding/flow.ts` (`placement` in the step list at `:48`, the legacy alias at
  `:63-64`, the progress band at `:110-123`)
- `apps/web/src/onboarding/Frame.tsx`
- `apps/web/src/onboarding/copy.ts`
- `apps/web/src/onboarding/icons.tsx`
- `apps/web/src/onboarding/onboarding.css`
- `packages/curriculum/src/quiz/machine.ts` (`createQuiz` at `:269`, `reduceQuiz` at `:287`; both
  imported at `apps/web/src/onboarding/PlacementStep.tsx:48`)

Route: `#/start/placement`. Parsed at `apps/web/src/app/routes.ts:149`, built by `hrefForOnboarding`
(`routes.ts:177-179`), rendered by `apps/web/src/App.tsx:90-97`. The legacy hash `#/start/quiz`
normalises to it at `apps/web/src/onboarding/flow.ts:63-64`.

Wired at `apps/web/src/onboarding/Onboarding.tsx:293-304`. The quiz itself is created at
`PlacementStep.tsx:126` and driven at `PlacementStep.tsx:131-138`.

Question kind: whatever the seeded corpus carries, rendered through `ProblemView`, so the same seven
kinds and the same three stubs as instance 11. `PlacementStep.tsx:323-325` records that the handed-off
shapes carry their own submit and skip, so the onboarding frame suppresses its own CHECK.

- UNDO: **no.** There is a Back control between steps, not within a question.
- STEP REPLAY: **no.**
- REDRAW: **no.** One submission per question (`PlacementStep.tsx:137`), with an explicit skip at
  `PlacementStep.tsx:138`.
- CURVED ARROWS: **no.** `StructureFigure.tsx` draws skeletons, not electron flow.
- GRADING: not graded in this file. `reduceQuiz` at `packages/curriculum/src/quiz/machine.ts:287`
  owns it, over the state `createQuiz` builds at `machine.ts:269`, driven from
  `apps/web/src/onboarding/PlacementStep.tsx:131` (`advance`) with the two events at `:137`
  (`answerSubmitted`) and `:138` (`skipped`). `PlacementStep.tsx:5` states this plainly: "NOTHING
  ABOUT PLACEMENT IS DECIDED HERE".

### 13. Cards review session

The spaced-repetition deck. A card front, tap to reveal, then four self-assessment chips. It is a
chemistry surface a student manipulates, and it is the only one where the student, not the engine,
supplies the verdict.

Entry file:

- `apps/web/src/cards/ui/ReviewSession.tsx` (259 lines, component at `:93`)

Supporting files:

- `apps/web/src/cards/ui/CardsHome.tsx` (the host, component at `:75`. It is a FOUR-FACE switch on
  `face.kind` (`:92`), not a single screen, and citing only the review face is how instance 15 was
  missed for a whole audit pass. The `Face` union itself is at `:44-48`. The four faces, all in this
  one file: `review` at `:93-101` mounts `ReviewSession` at `:95` (instance 13); `composer` at
  `:103-104` mounts `Composer` (instance 15); `tray` at `:106-135` mounts `DeckTray`
  (`apps/web/src/cards/ui/DeckTray.tsx`) at `:118-133`, the per-deck card list; `landing` at
  `:137-146` mounts `CardsLanding` (`apps/web/src/cards/ui/CardsLanding.tsx`) at `:139-145`, the face
  a student actually arrives on, which reaches the composer through `onCompose` at `:144`)
- `apps/web/src/cards/ui/CardFace.tsx` (the card, structures included, component at `:119`)
- `apps/web/src/tabs/cards/CardsTab.tsx` (mounts `CardsHome` at `:43`)
- `apps/web/src/cards/Recommendation.tsx` (the mistake-derived deck, `AuthoredExplanation` at `:166`,
  `ARROW_KEY_PATTERN` at `:200`, `arrowFromKey` at `:215`)

Route: `#/cards`, declared at `apps/web/src/app/routes.ts:87` and rendered at
`apps/web/src/app/Shell.tsx:114-115`. The legacy hash `#/review` redirects here at `routes.ts:156`.

Wired at `apps/web/src/cards/ui/CardsHome.tsx:93-101`, the `review` face of the four-face switch
described above, with the `ReviewSession` mount itself at `:95`.

Question kind: recall. Not resonance, not a structure completion, not engine-graded.

- UNDO: **no.**
- STEP REPLAY: **no.**
- REDRAW: **no.**
- CURVED ARROWS: **no.**
- GRADING: **none.** The student rates themselves. `rateCurrent(state, rating)` at
  `ReviewSession.tsx:160` records Again, Hard, Good or Easy and hands it to the scheduler at
  `ReviewSession.tsx:164`. The scheduler is `apps/web/src/cards/scheduler.ts` (238 lines), named here
  because "the scheduler" is otherwise a word with no path attached, and it is the spaced-repetition
  half of `CLAUDE.md`'s Anki borrow. No chemistry is checked on this surface.

### 14. Trainer scratchpaper

A full-screen ink canvas the student can open over the trainer to work something out by hand. It is
listed here because it sits inside a question surface and because it owns the only Undo button in the
Train tab, which is a control a reader will otherwise hunt for in the wrong file.

Entry file:

- `apps/web/src/tabs/trainer/TrainerTools.tsx` (325 lines, `TrainerTools` at `:31`, `Scratchpad` at
  `:216`, mounted at `:88`)

Route: **none.** It is a modal over `#/trainer`, opened from the plus-menu toggle at
`TrainerTools.tsx:61` and the tool button at `TrainerTools.tsx:72`. Its four siblings in that menu
are the periodic table (`:73`), a 3D view of the current step (`:74`), the feedback history (`:75`)
and `Re-centre view` (`:76-78`), which is the only one of the five that acts on the canvas behind the
menu rather than opening something over it.

Question kind: none. It is ungraded scratch.

- UNDO: **yes**, at `TrainerTools.tsx:299-306`. Implemented as a mutable `strokesRef.current.pop()`,
  uncapped.
- STEP REPLAY: **no.**
- REDRAW: **yes**, Clear at `TrainerTools.tsx:311-317`.
- CURVED ARROWS: **no.** Freehand ink only.
- GRADING: **none.**

### 15. Flashcard composer

A student writes their own reaction card: a three-sided card, Setup then Conditions then Product,
each side a textarea over a drawn reaction scheme, with a deck to save it into. It is a chemistry
surface a student manipulates, and it is here because the student is AUTHORING chemistry on it rather
than answering a question about it.

Entry file:

- `apps/web/src/cards/ui/CardComposer.tsx` (586 lines, `export function Composer` at `:147`. The
  filename note at `:61-63` explains why it is not `Composer.tsx`: `composer.ts` sits beside it and
  Windows resolves the two case-insensitively)

Supporting files:

- `apps/web/src/cards/ui/composer.ts` (the logic beside the view: `EMPTY_SIDES`, `SIDE_ORDER`,
  `canSave`, `cardFromDraft`, `newDeckId`, `setSide`, all imported at `CardComposer.tsx:69-80`)
- `apps/web/src/cards/ui/CardsHome.tsx` (the host, the `composer` face at `:103-104`)
- `apps/web/src/cards/ui/CardsLanding.tsx` (where a student presses to get here, reaching the
  composer through `onCompose` at `CardsHome.tsx:144`)
- `apps/web/src/cards/store.ts` (`decks`, the default `DeckSource`, imported at `CardComposer.tsx:68`)
- `apps/web/src/cards/types.ts` (`DeckId`, `DeckSource`, `ReactionSide`, `ReactionSides`)

Route: `#/cards`, the same hash as instance 13, because this is a FACE of `CardsHome` rather than a
route of its own. Declared at `apps/web/src/app/routes.ts:87`, rendered at
`apps/web/src/app/Shell.tsx:114-115`.

Mount chain, all three links stated because the composer is otherwise unfindable from the route:
`apps/web/src/cards/ui/CardsHome.tsx:39` imports it, `:103-104` mounts it in the `composer` face, and
`:144` is the `onCompose` that `CardsLanding` calls to switch the face.

Question kind: **none, and that is the point.** The student is not answering. `SIDE_ORDER` drives a
segmented Setup / Conditions / Product pill (`CardComposer.tsx:362` and `:454` set the active side,
and the three textareas set it on focus at `:411`, `:421` and `:432`). The deck chooser is a sheet
toggled at `:295` and rendered at `:311`. `Save to deck` is the button at `:475-484`, calling `save`
(`:216-235`), which creates the deck if there is none, saves the card, and resets the draft.

**There is no structure input on this surface, and the file says so itself.** Quoting
`CardComposer.tsx:398-402`: "This phase has no structure editor, and drawing a molecule that claimed
to be the student's reagent would be the composer lying about its own contents. It is aria-hidden, it
never changes with the text, and the day a structure input exists it is what replaces this." The
reaction scheme a student sees is decoration. Read that beside instances 9 and 10, which ARE a
structure-drawing canvas, and beside `apps/web/src/lesson/ProblemView.tsx:90-101`, which stubs the
structure answer kind: that is three places in one app waiting on one editor.

- UNDO: **no.** No undo control and no stack. Editing is free until Save, which is the same shape as
  the MCQ beat's "free until Check".
- STEP REPLAY: **no.** Nothing is animated.
- REDRAW: **yes, per side, until Save.** Each side is an independent textarea, so re-writing one does
  not touch the others. `save` at `:231-232` clears all three back to `EMPTY_SIDES` and returns the
  pill to `setup`, so a saved card cannot be edited from here.
- CURVED ARROWS: **no.**
- GRADING: **none.** Nothing checks the chemistry a student writes on this surface. That is a
  deliberate gap and not a defect: it is a personal card, in a personal deck, and the product does not
  claim otherwise. Worth knowing before anyone assumes a composed card was validated.

### 16. pKa settings editor - BUILT AND UNREACHABLE

A student edits the pKa ladder so the app's numbers match the numbers their own professor put on the
board. It is interactive chemistry, it is tested, and no code path in the app can open it.

Entry file:

- `apps/web/src/settings/PkaSettings.tsx` (507 lines, `export default function PkaSettings` at `:105`)

Supporting files:

- `apps/web/src/settings/pka.ts` (the store and the rules: the `pkaSettings` store, `pkaValueFor`,
  `sortBeatPkaConflicts` and the `PkaSettingsSnapshot` type. The screen only RENDERS these, which the
  header at `PkaSettings.tsx:13-18` states)
- `apps/web/src/beats/sort/SortBeatView.tsx` (the CONSUMER, see below)
- Tests: `apps/web/test/pka-settings.test.ts`

Route: **NONE.** The COMPONENT has zero importers anywhere in `apps/web/src`. A grep for
`PkaSettings` outside `apps/web/src/settings/` returns exactly two hits, both in
`apps/web/src/beats/sort/SortBeatView.tsx` (`:91` and `:126`), and both are the TYPE
`PkaSettingsSnapshot`, imported from the sibling store `apps/web/src/settings/pka.ts` at `:92`, never
the component. Widening that grep to `settings/pka` adds only that same import line and a comment at
`apps/web/src/beats/sort/index.ts:10`, which exists to say the pKa layer is deliberately NOT
re-exported through the sort barrel.
Built, tested, unreachable, exactly like instances 9 and 10 and in a completely unrelated subsystem.
That pattern is D18.

Question kind: not a question. The student supplies numbers, and the numbers change how a DIFFERENT
surface is graded.

- The preset chooser (whose table am I on) is `PresetChooser` at `:257`, with the preset buttons at
  `:316-317`.
- The per-rung value inputs are in `LadderRow` at `:346`, with the number input at `:446-461`.
- `Clear my changes` is at `:230-231`, disabled when nothing has been overridden.

**Why this orphan is sharper than the trace one, and the whole chain so it can be checked without a
search.** The trace beat is orphaned code that grades nothing. This is orphaned code that FEEDS a
grader, and every student is marked against the default preset because the only code that can change
it sits on a screen with no importer. Five links, in order:

1. The store is one module-scope instance: `export const pkaSettings = createPkaSettings()` at
   `apps/web/src/settings/pka.ts:901`.
2. It has exactly FIVE mutators, all of them in that file: `setPreset` at `:867`, `setOverride` at
   `:875`, `clearOverride` at `:884`, `clearAllOverrides` at `:890` and `reset` at `:894`. Each one
   is a call to the private `commit` at `:873`, `:881`, `:888`, `:892` and `:895`.
3. **Every call site of all five, in the whole of `apps/web/src`, is inside
   `apps/web/src/settings/PkaSettings.tsx`**: `clearAllOverrides` at `:230-231`, `setPreset` at
   `:269` and `:316-317`, `setOverride` at `:392`, `clearOverride` at `:477` and `:481`. `reset` has
   zero callers anywhere.
4. The one other importer of the module reads and never writes. `apps/web/src/beats/sort/SortBeatView.tsx:154-156`
   passes `pkaSettingsStore.subscribe` and `getSnapshot` to `useSyncExternalStore`, and nothing else.
5. That read reaches the grader: `apps/web/src/beats/sort/SortBeatView.tsx:158` is
   `const table = settings ?? liveSettings`, feeding `judgeSort`
   (`apps/web/src/beats/sort/judge.ts:127`) on the routable sort ladder of instance 7.

So: **a student-configurable input reaches a grader, the only UI that can configure it has zero
importers, and every student is therefore marked against the default preset.** Not "probably": the
five writers have one call site each and it is on the unreachable screen.
`apps/web/src/beats/sort/index.ts:10` shows the boundary was drawn deliberately, saying the pKa layer
is NOT re-exported through the sort barrel because `apps/web/src/settings/pka.ts` is meant to be the
one authority both surfaces read. The boundary is right. It was just never finished, because the
surface on the other side of it was never given a route.

- UNDO: **no per-edit undo**, but `Clear my changes` at `:230-231` resets every override at once.
- STEP REPLAY: **no.**
- REDRAW: **yes**, per value. Each rung is its own input and can be re-entered.
- CURVED ARROWS: **no.**
- GRADING: **none on this surface.** It changes what `judgeSort` grades elsewhere. See instance 7 and
  Part 4.

### 17. Pilot trainer screen

Added 2026-09-07, after the pilot gauntlet, and NOT part of the original sixteen-instance audit: it
is the reference screen the other trainer instances are intended to be rebuilt from, built new and
judged blind against the Alchemie bar piece by piece until every piece won. It deliberately does not
replace anything yet.

Entry file:

- `apps/web/src/pilot/screen/PilotScreen.tsx`, a self-contained full-viewport component taking
  `{ problem, onExit }` props, so re-homing `#/trainer` or `#/lesson` onto it later is a mount-point
  change. The integration note lives in its header.

Supporting files, all under `apps/web/src/pilot/`:

- `screen/screenModel.ts`, the pure state machine (phases, recorded steps, `availableControls()`)
- `screen/pilotLayout.ts`, layout constants
- `screen/PilotCanvas.tsx`, the canvas over the interaction store
- `screen/PilotTrainerGallery.tsx`, the dev wrapper with the Resonance / Reaction switcher
- `arrow/taperedArrow.ts` and `arrow/TaperedArrowSvg.tsx`, the tapered curved arrow as a closed
  filled outline (an SVG stroke cannot vary width, so this is a different construction), chord floor
  34 px with rim swing
- `drag/smoothing.ts`, the pointer smoother with settle guarantees and bow-side hysteresis
- `annotations/placement.ts`, lone pairs and hydrogens allocated together into the bond-free arc,
  rotation invariant; its header records the one-line edits that would carry the fix into
  `MoleculeSvg.tsx` and `hitLayout.ts`, which still fan lone pairs from `openAngle + PI`

Route: `#/gallery/pilot-trainer`, dev only, handled by the gallery branch in `apps/web/src/App.tsx`.
Typed by hand; nothing in the shell links to it, which is the documented gallery-route rule.

Two rulings this screen carries, decided during the gauntlet and binding on later trainer work:
curved arrows appear ONLY on resonance problems (a reaction shows the arrowless electron gesture
with a dashed guide, matching the bar), and the win is a quiet in-canvas acknowledgement with the
chemistry left on screen, the full-bleed celebration staying at the lesson level.

- UNDO: **yes**, a chip wired to the interaction machine's `undoDocument`, pinned by
  `apps/web/test/pilotScreenWiring.test.ts` (jsdom, proven able to fail).
- STEP REPLAY: **yes**, a slider scrubbing back and forth over the student's own recorded steps,
  keyboard steps included; it cannot mutate the draft.
- REDRAW: **yes**, and deliberately absent from the won layout so a stray press cannot destroy a
  correct solve; `availableControls()` in `screenModel.ts` rules the chip set.
- CURVED ARROWS: **yes on resonance only**, the tapered outline; a reaction draws none at any point.
- GRADING: `gradeDrawing`, `apps/web/src/tabs/trainer/grade.ts:72`, deliberately unchanged.

Tests: `apps/web/test/pilotTaperedArrow.test.ts`, `pilotSmoothing.test.ts`, `pilotPlacement.test.ts`,
`pilotScreen.test.ts`, `pilotScreenWiring.test.ts`. The suites are mutation-pinned: the judged
rounds repeatedly deleted each feature and verified a test went red.

---

## Part 3 - Routes and entry points

The parser is `parseHash` at `apps/web/src/app/routes.ts:140-162`. The dispatchers are
`apps/web/src/App.tsx:72-115` and `apps/web/src/app/Shell.tsx:107-146`.

| Hash | Renders | Handled at |
|---|---|---|
| `#/pathway` | Path tab, lazy | `routes.ts:85`, `:158-160`; `Shell.tsx:112-113` |
| `#/trainer` | Train tab, the mechanism trainer, STATIC import | `routes.ts:86`, `:158-160`; `Shell.tsx:110-111`, static import at `Shell.tsx:51` |
| `#/cards` | Cards tab, lazy | `routes.ts:87`, `:158-160`; `Shell.tsx:114-115` |
| `#/me` | Me tab, lazy | `routes.ts:88`, `:158-160`; `Shell.tsx:116-117` |
| `#/periodic`, `#/periodic/<symbol>` | Periodic table tool, lazy | `routes.ts:89`, `:158-160`; `Shell.tsx:122-123` |
| `#/search`, `#/search/<query>` | Reaction search tool, lazy | `routes.ts:90`, `:158-160`; `Shell.tsx:120-121` |
| `#/courses` | Course list | `routes.ts:91`, `:158-160`; `Shell.tsx:118-119` |
| `#/courses/<courseId>` | Topic list for that course | `CoursesTab.tsx:340-341` |
| `#/courses/<courseId>/<topicId>` | `LessonPlayer`, instance 11 | `CoursesTab.tsx:343-357` |
| `#/leaderboards` | Leaderboards behind a flag | `routes.ts:92`; `Shell.tsx:124-129` |
| `#/chat` | AI chat behind a flag | `routes.ts:93`; `Shell.tsx:130-135` |
| `#/messages` | Tutor messages behind a flag | `routes.ts:94`; `Shell.tsx:136-141` |
| `#/lesson/<nodeId>` | `BeatRunner`, lazy, instances 5 to 8 | `routes.ts:152`; `App.tsx:99-109` |
| `#/lesson` with no node | Falls through to the Path tab, deliberately | `routes.ts:150-152` then `:161` |
| `#/review` | Redirects to the Cards tab | `routes.ts:153-156` |
| `#/start/<step>` | Onboarding, lazy | `routes.ts:149`; `App.tsx:90-97` |
| `#/start` with no step | Onboarding at `welcome` | `routes.ts:149` |
| `#/start/quiz` | Normalises to `placement` | `apps/web/src/onboarding/flow.ts:63-64` |
| `#/gallery/<name>` | `BerryGallery`, DEV ONLY, lazy | `routes.ts:157`; `App.tsx:81-88` |
| `#/gallery` with no name | Same, defaults to `berry` | `routes.ts:157` |
| anything unrecognised | The Path tab | `routes.ts:161` |

### Development-only routes

Deliberately absent from `ALL_TABS` so nothing renders a link to them, per the comment at
`apps/web/src/app/routes.ts:130-135`:

- `#/gallery/berry`, the mascot workbench. Component at `apps/web/src/mascot/BerryGallery.tsx:70`
  (247 lines). The href builder is `hrefForGallery` at `apps/web/src/app/routes.ts:182-184`, and the
  comment there says it is typed by hand and nothing in the shell renders it. It is exempt from the
  onboarding redirect at `apps/web/src/App.tsx:47-50`, so a critic with a fresh profile can reach it.

### The separate critic HTML entry

Not a hash route and not part of the student app.

- `apps/web/critic.html`, a second Vite document. Its only content is a root div and a module script
  pointing at `/src/critic-main.tsx` (`critic.html:4`).
- `apps/web/src/critic-main.tsx`, 40 lines. It reads `?s=` from the query and renders
  `apps/web/src/lesson/RewardMoment.tsx` with a hardcoded receipt by default, or
  `apps/web/src/tabs/feed/FeedTab.tsx` when `?s=feed`.
- Reachable at `/critic.html?s=reward` (the default) and `/critic.html?s=feed`.
- **This is the only way to render `FeedTab` at all.** A grep for `FeedTab` and `tabs/feed` across
  `apps/web/src` returns EIGHT hits in THREE files, and the shape of the eight is the evidence, not
  the number: two are the harness (`apps/web/src/critic-main.tsx:6` and `:26`) and the other six are
  the feed folder naming itself (`apps/web/src/tabs/feed/FeedIcon.tsx:4`, `:6`, `:9`, and
  `apps/web/src/tabs/feed/FeedTab.tsx:101`, `:102`, `:462`). So there is **no importer outside the
  feed folder except the critic harness**. `apps/web/src/tabs/feed/FeedIcon.tsx:9` is worth reading
  before you "fix" that: the icon was split out of `FeedTab.tsx` on purpose, because the tab bar
  paints all five icons on first paint, and a static import of a lazy module pulls the whole chunk
  into the initial payload. There is no
  `feed` member in `TabId` (`apps/web/src/app/routes.ts:38-52`), so `#/feed` falls through
  `parseHash` to the Path tab. **Feed is built, has no route, and is reachable only through the
  critic harness. This is the SCHEDULED state, not a broken one**: the owner amendment of 2026-09-01
  in `CLAUDE.md` rules that the bar becomes five tabs with Feed joining Path, Train, Cards and Me,
  and says in the same passage that the placement table and the `routes.ts` change land in the R
  rebuild and not before. So it is pending, not a defect, and it is filed in Part 9 rather than in
  Part 8. The thing worth a reader's attention is the consequence: because `critic.html?s=feed` is
  the only renderer, nothing in the normal app exercises Feed, so whatever the R rebuild wires up
  will be the first time Feed runs inside the shell, under the real tab bar, with real routing and a
  real back button.

### A second non-route HTML entry

- `apps/web/public/device.html`, 236 lines. A device-frame harness that loads the app in an iframe at
  a chosen viewport. The route field defaults to `#/pathway` (`device.html:132`) and the device
  presets, including Pixel 6a and iPhone 12, are at `device.html:116-120`. It lives in `public/` on
  purpose so it needs no route, stated at `device.html:29-30`.

### The query-string deep links, and the fact that decides how they behave

Three deep links point the trainer at a specific problem:

- `?reaction=<id>#/trainer`, a single mechanism step (instance 1)
- `?sequence=<id>#/trainer`, a multi-step chain (instance 2)
- `?hunt=<id>#/trainer`, a resonance hunt (instance 3)

They are in the QUERY STRING, not the hash. **They are read exactly once, at module load**, at
`apps/web/src/tabs/trainer/TrainerTab.tsx:151` (the `URLSearchParams` construction) and at
`TrainerTab.tsx:168-170` (the three constants). They are consumed once more at `TrainerTab.tsx:224-229`
to seed the initial `Selection`. Nothing re-reads them and nothing writes them.

Two consequences follow and both are load bearing. First, a link of this shape must cause a full
document load to take effect, which is why `apps/web/src/charge/ChargeGate.tsx:96-102` resolves
non-hash hrefs with `window.location.assign` rather than through the router. The trap it avoids is
written out at `ChargeGate.tsx:81-95`. Second, the trainer never writes its selection back to the URL,
so the URL starts lying the moment a student picks a different problem. That is a defect and it is in
Part 8.

Four measurement flags live in the same file under the same module-load rule:

- `?auto=1`, `TrainerTab.tsx:152`, and also `apps/web/src/App.tsx:38-40` where it suppresses the
  onboarding redirect
- `?renderer=3d`, `TrainerTab.tsx:153`
- `?stats=1`, `TrainerTab.tsx:154`
- `?targets=1`, `TrainerTab.tsx:166`, which publishes the drop sites on `window` for the capture
  scripts, reasoning at `TrainerTab.tsx:155-165`

And one more on the canvas:

- `?primitive=arrow`, `apps/web/src/tabs/trainer/DrawCanvas.tsx:276`, which restores the
  pre-round-8 in-flight arrow glyph. Rationale at `DrawCanvas.tsx:263-275`.

### Headless and harness entry points that drive the trainer

Not student routes. Listed because a reader chasing "where else does the trainer get opened" needs
them and they are otherwise invisible.

- `apps/web/measurements/measure-headless.mjs:93` opens `http://127.0.0.1:<port>/?auto=1#/trainer`
- `apps/web/measurements/measure-device.mjs:56` prints `http://<lan>:<port>/?auto=1&stats=1#/trainer`
- `apps/web/measurements/capture-trainer.mjs:249` opens `?targets=1&primitive=<electron|arrow>#/trainer`
- `apps/web/measurements/capture-parity.mjs:101` opens `?targets=1&reaction=<id>#/trainer`
- `apps/web/measurements/hit-targets.mjs:78` includes `#/trainer` among the routes it measures
- `apps/web/measurements/economy-moments.mjs:2098` exports `TRAINER_HASH = "#/trainer"`, used at `:2143`

---

## Part 4 - Grading

Ten grading-related entry points, in nine files, returning seven different types. The important part
is not the count, it is that **three competing result vocabularies exist for the same four documented
outcomes**, and only one of them is checked by the compiler.

### Every grading path

| Entry function | File and line | Input type | Return type | Produces the four documented result types? |
|---|---|---|---|---|
| `gradeDrawing` | `apps/web/src/tabs/trainer/grade.ts:72` | `(step: MechanismStep, drawn: readonly ElectronFlowArrow[])` | `DrawVerdict` | **No, weaker.** No `correct_alternative_route`, and `not_requested` deliberately is NOT the registry's `valid_transformation_not_requested`. Adds a fifth non-result, `incomplete` |
| `missingArrows` | `apps/web/src/tabs/trainer/grade.ts:105` | `(step, drawn)` | `readonly ElectronFlowArrow[]` | n/a. **DEAD.** A grep across `apps/` and `packages/` including tests returns its own definition and a stale `apps/web/tsbuild/src/tabs/trainer/grade.d.ts:49`, nothing else |
| `matchDistractor` | `apps/web/src/tabs/trainer/distractors.ts:152` | `(step: MechanismStep, arrow: ElectronFlowArrow)` | `TrainerDistractor \| null` | n/a. A Tier 2 lookup, not a verdict |
| `gradeMcq` | `apps/web/src/beats/mcq/grade.ts:117` | `(attempt: McqAttempt)` | `McqReveal` | **No.** `McqReveal` (`apps/web/src/beats/mcq/grade.ts:67-107`) is a reveal payload carrying `matchedAnswer: boolean` and `firstMeeting: boolean`, not an outcome union |
| `beatResultFor` | `apps/web/src/beats/match/board.ts:402` | `(spec: MatchBoardSpec, state: BoardState, input: BeatResultInput)` | `BeatResult` | **Type yes, behaviour no.** It always returns `kind: "correct"`, by the design note at `apps/web/src/beats/match/board.ts:396-401`, so three of the four are unreachable here |
| `judgeSort` | `apps/web/src/beats/sort/judge.ts:127` | `(content: SortContent, board: SortBoard, context: JudgeContext)` | `SortJudgement` | **Wraps yes.** `SortJudgement` (`apps/web/src/beats/sort/judge.ts:61-73`) is `unfinished \| judged`, and the `judged` arm carries a full `BeatResult` plus a `tier` and an `Explanation` |
| `gradeSynthesisGap` | `apps/web/src/beats/synthesis/grade.ts:299` | `(input: GradeGapInput)` | `BeatResult` | **Yes, all four** |
| `gradeDrawing` (the other one) | `apps/web/src/beats/trace/recognise.ts:275` | `(target: TraceTarget, drawn: Graph)` | `TraceOutcome` | **No.** Three-way, `correct \| invalid \| undecided`, collapsed to two by `toBeatResult` at `apps/web/src/beats/trace/recognise.ts:314` |
| `gradeAttempt` | `packages/curriculum/src/grading.ts:134` | `(problem: Problem, submitted: AnswerState)` | `GradingResult` | **No, and a different question.** A TIER vocabulary of five members, not an outcome vocabulary |
| `reduceQuiz` | `packages/curriculum/src/quiz/machine.ts:287` | `(state: QuizState, event: QuizEvent)` | `QuizState` | **No, and it sits a level above.** It does not grade one answer, it folds graded answers into a placement. It is the grading path instance 12 actually runs on, so it is named here rather than left as a package name |

**One grader takes a student-configurable INPUT, and only one.** `judgeSort` is graded against a pKa
table that is not a constant: `apps/web/src/beats/sort/SortBeatView.tsx:158` resolves it as
`const table = settings ?? liveSettings`, reading the live `pkaSettings` store from
`apps/web/src/settings/pka.ts` (imported at `SortBeatView.tsx:88-92`). No other grader in the table
above reads anything a student can set. It is listed here because "what does this function grade
against" has a different answer for this one row, and because the only editor for that input,
`apps/web/src/settings/PkaSettings.tsx` (instance 16), has zero importers: the store's five mutators
(`apps/web/src/settings/pka.ts:867`, `:875`, `:884`, `:890`, `:894`) are called from that file and
nowhere else, so the value `judgeSort` reads is the default for every student today. See D18.

Three supporting functions a reader will look for under "grading": `messageForLanding` at
`apps/web/src/beats/match/reasons.ts:71` and `messageForMiss` at `reasons.ts:92` produce the match
board's per-pair copy, and `beatCauseForCurriculumCause` at
`apps/web/src/beats/synthesis/grade.ts:86` translates a curriculum cause into a beat shape cause.

**Two different exported functions are both called `gradeDrawing`**, with different signatures and
different return types: `apps/web/src/tabs/trainer/grade.ts:72` and
`apps/web/src/beats/trace/recognise.ts:275`. Nothing imports both, so this compiles, but a reader who
greps for `gradeDrawing` gets two answers.

### The three competing result vocabularies, side by side

This is the finding, so it is laid out rather than described.

| | `BeatResult` | `DrawVerdict` | `GradingResult` |
|---|---|---|---|
| Declared at | `apps/web/src/beats/types.ts:603-615` | `apps/web/src/tabs/trainer/grade.ts:41-45` | `packages/curriculum/src/grading.ts:81-119` |
| Member 1 | `correct` | `correct`, carries `cause` | `correct`, tier `null` |
| Member 2 | `correct_alternative_route`, carries `routeTaken` | **absent** | `named_cause`, tier 1 |
| Member 3 | `valid_not_requested`, carries `built` | `not_requested`, carries only the counts `missing` and `extra` | `matched_distractor`, tier 2 |
| Member 4 | `invalid` | `invalid`, carries `cause` and `finding` | `unmatched_wrong`, tier 3 |
| Member 5 | none | `incomplete`, carries `drawn` and `needed` | `indeterminate`, tier `null` |
| Compile-time guard against chem-core's `ResolutionKind` | **Yes, bidirectional**, at `apps/web/src/beats/types.ts:632-633`, over the `Assert` and `NoExtras` pair at `:629-630` | **None** | **None** |
| What it is | An outcome vocabulary. `CLAUDE.md`'s four exactly | An outcome vocabulary, weaker | A tier vocabulary, a different axis |

`BeatResult` is the only one the compiler holds to the specification, and the guard is worth reading
because it is the pattern the other two lack: `BeatOutcomeCoversResolutionKind` and
`ResolutionKindCoversBeatOutcome` at `apps/web/src/beats/types.ts:632-633` check both directions, so
neither side can grow a fifth outcome the other does not have.

`DrawVerdict` is the one the arrow-pushing trainer actually uses, and it is the one with no guard.
`apps/web/src/tabs/trainer/grade.ts:1-28` is honest about why: chem-core has no function from a drawn
`MechanismStep` to an `AttemptResolution`, because the validators compute resolutions from authored
fixtures rather than from live input. But an honest comment is not a check, so `DrawVerdict` can drift
further and nothing will fail.

`GradingResult` is not a rival so much as an orthogonal axis. It answers "which feedback tier
answered", which is the question the measured feedback-specificity budget in `CLAUDE.md` asks, and it
is why `apps/web/src/lesson/Feedback.tsx:71` can render an authored explanation directly while the
trainer has to assemble one.

A fourth, smaller union sits under the trace beat: `TraceOutcome` at
`apps/web/src/beats/trace/recognise.ts:261-264`, three-way, collapsed to `BeatResult` by
`toBeatResult` at `apps/web/src/beats/trace/recognise.ts:314`. It is a converter rather than a fourth contract, listed here so
nobody counts it as one.

### The four converters that each re-derive the mapping

Each of these independently turns something into a `BeatResult`, so the mapping onto the four
documented types exists four times:

- `apps/web/src/beats/sort/judge.ts:127`, inside `judgeSort`
- `apps/web/src/beats/synthesis/grade.ts:299`, plus `beatCauseForCurriculumCause` at `:86`
- `apps/web/src/beats/match/board.ts:402`, `beatResultFor`
- `apps/web/src/beats/trace/recognise.ts:314`, `toBeatResult`

---

## Part 5 - Reference assets

Paths are repo-relative. **Several contain a space in a directory or file name and are quoted so a
shell command copied from this file works.**

### Lead assets

- `docs/reference/design-goals/blueberry_r9-lesson-mechanism_1788289491.png`

  **THE TAPERED-ARROW REFERENCE.** Opened and looked at during this audit. A cream page. The header
  carries a violet 3D X-close chip, a green progress bar, and a purple flask charge counter reading
  89. The prompt reads "Push the arrows for the first step of this SN1." A white rounded canvas card
  holds a skeletal tert-butyl bromide on the left and an ether oxygen with lone pairs on the right;
  bromine sits in a green capsule highlight with its lone pairs shown. A purple curved arrow arcs
  from the C-Br bond to a target ring, THIN AT THE TAIL AND THICK AT THE HEAD, with a solid filled
  arrowhead and a fingertip cursor at the head. Below the card a pill hint reads "The leaving group
  leaves first". At the foot, two 3D chip buttons: UNDO and CHECK. The goggled berry mascot stands at
  the card's bottom right.

  Listed at `docs/reference/design-goals/MANIFEST.md:24` as "Mechanism question shell: canvas card,
  arrow mid-drag, green legal source, UNDO and CHECK, goggles mascot. Interaction judged against
  Alchemie captures, this locks only the shell". **Read that last clause before treating the taper as
  a requirement.** `docs/reference/design-goals/MANIFEST.md:3-8` says of this whole folder that the
  LAYOUT and the listed decision are binding and that draft text inside the images is model
  gibberish. Whether the taper is locked is an owner question, not a settled one. Two other things in
  this image are NOT in the shipped trainer and are worth naming: an UNDO button on the mechanism
  question itself, and a CHECK button; the shipped trainer grades on the last arrow landing
  (`apps/web/src/tabs/trainer/TrainerTab.tsx:410-417`) and has no student-facing undo.

#### Where the "Beats and Decks" artifact is, before it is cited again

It is **not a file in this repository**, which is why grepping for it finds only this inventory. It
is a published artifact and its address is:

`https://claude.ai/code/artifact/4e5c8d13-517c-4239-b988-8828cff22cb0`

It cites exactly **FOUR** images, all by bare filename with no path, and all four are listed in this
part with their real repo-relative locations. Two of the four are the structure-drawing captures in
the subsection below, so the gitignore caveat's "those three citations" is a count of the untracked
ones, not of the artifact's citations. The four, in the artifact's own order:

1. `orgosolver-02-flashcard-decks.png`, committed, at `docs/reference/competitors/orgosolver-02-flashcard-decks.png`
2. `mistakes.png`, UNTRACKED, at `"reference images/mistakes.png"`
3. `(dark mode) drawing characters.png`, UNTRACKED, at `"reference images/(dark mode) drawing characters.png"`
4. `in the middle of drawing characters...png`, UNTRACKED, at
   `"reference images/in the middle of drawing characters - notice it follows the line even if I'm off.png"`

- `docs/reference/competitors/orgosolver-02-flashcard-decks.png`

  Cited by the Beats and Decks artifact by bare filename, as the deck-picker model: a topic name, a
  card count, and a shuffle control. The only one of the artifact's four images that survives a fresh
  clone.

- `"reference images/mistakes.png"`

  Cited by the Beats and Decks artifact by bare filename. Opened during this audit: Duolingo's
  mistakes hub. A back arrow, the heading "Review 30 recent mistakes!" with an orange recycle badge,
  a full-width blue "START +20 XP" button, then a "30+ mistakes" list where each row is an exercise
  prompt with the sentence under it and a red dot on the right. The bottom tab bar is visible.

### The two structure-drawing references

Both are Duolingo's "Trace the letter" surface, and both are the direct reference for the trace
beat's guided canvas (instance 9). **Both are also cited by the Beats and Decks artifact**, which is
images three and four of its four, so they are not a separate set.

**BOTH ARE UNTRACKED.** They sit under `reference images/`, which is gitignored at `.gitignore:65`,
so neither survives a clone. The paths below work on a machine that has the staging folder and
nowhere else. This repeats the caveat at the end of this Part on purpose: a reader who copies a path
from here without reading on would otherwise carry away a path that resolves locally and fails for
everybody else.

- `"reference images/(dark mode) drawing characters.png"`

  Dark mode, the un-started state. The letter's stroke channel is drawn in dark grey behind an
  already-completed white stroke, a blue circular start puck with a right-pointing arrow marks the
  next stroke's origin, a dashed blue direction guide runs out of it, dashed centre guidelines cross
  the canvas, and CHECK is disabled.

- `"reference images/in the middle of drawing characters - notice it follows the line even if I'm off.png"`

  The same screen mid-stroke. Part of the stroke has been laid down in white and the remainder is a
  dashed blue guide ending in an arrowhead. The filename is the observation: the ink snaps to the
  channel even when the finger is off it.

### THE GITIGNORED-STAGING CAVEAT, DO NOT SKIP THIS

**A fresh clone of this repository does not contain `reference images/`.** The folder is gitignored
at `.gitignore:65`, and `git ls-files "reference images"` returns **zero** tracked files. The comment
at `.gitignore:63-64` says it is raw capture staging and that triaged copies belong in
`docs/reference/`, which is committed, because keeping both would double roughly 27 MB of PNGs in
`.git`.

There is **no committed copy of `mistakes.png` anywhere under `docs/reference/`**:
`git ls-files docs/reference | grep -i mistake` returns nothing. So the Beats and Decks artifact cites
an image that exists only on this machine. The same is true of both drawing-characters captures.
So THREE of the artifact's FOUR cited images are untracked, per the list under Lead assets; only
`orgosolver-02-flashcard-decks.png` survives a clone. Anyone acting on those three citations from a
clean checkout will not find the files, and the fix is to triage them into `docs/reference/`, not to
re-cite them.

### Directory inventory

Entry counts are `ls | wc -l` on this working tree. Tracked counts are `git ls-files | wc -l`.

| Directory | Entries on disk | Tracked files | Note |
|---|---|---|---|
| `docs/reference/alchemie/` | 13 | 21 for the whole tree | The mechanism-interaction bar. 10 numbered PNGs, 2 markdown files, `extra/` |
| `docs/reference/alchemie/extra/` | 9 | in the 21 above | Supplementary captures |
| `docs/reference/design-goals/` | 32 | 46 for the whole tree | 29 PNGs, `BUTTON-MECHANICS.md`, `MANIFEST.md`, `units/` |
| `docs/reference/design-goals/units/` | 15 | in the 46 above | 14 unit path JPGs plus a `MANIFEST.md` |
| `docs/reference/competitors/` | 13 at top level | 274 for the whole tree | Includes `duolingo-live/` (4), `mobbin/` (10), `repos/` (4), `inspirations/` (10) |
| `docs/reference/competitors/inspirations/` | 10 | in the 274 above | The blind-comparison set for pathway, leaderboard and language picker |
| `"docs/reference/competitors/mobbin/blueberry screens"` | a folder whose name contains a space | in the 274 above | Quote it in any shell command |
| `"reference images"` | 136 | **0** | UNTRACKED. See the caveat above |
| `"reference images/inspirations"` | 19 | **0** | UNTRACKED |
| `"reference images/onboarding"` | 16 | **0** | UNTRACKED |

### The ten Alchemie captures, by filename

`CLAUDE.md` says a critic reaches this bar by filename, so here they are in full:

- `docs/reference/alchemie/01-mechanism-canvas-full.png`
- `docs/reference/alchemie/02-warning-triangle-bond.png`
- `docs/reference/alchemie/03-warning-triangle-atom.png`
- `docs/reference/alchemie/04-error-spiky-atom.png`
- `docs/reference/alchemie/05-bond-break-particles.png`
- `docs/reference/alchemie/06-carbocation-badge.png`
- `docs/reference/alchemie/07-goal-achieved.png`
- `docs/reference/alchemie/08-intro-modal.png`
- `docs/reference/alchemie/09-orbital-3d.png`
- `docs/reference/alchemie/10-formula-keyboard.png`

The nine in `extra/`:

- `docs/reference/alchemie/extra/x01-drag-inflight-dashed-guide.png`
- `docs/reference/alchemie/extra/x02-bond-handle-drag.png`
- `docs/reference/alchemie/extra/x03-goal-achieved-arriving.png`
- `docs/reference/alchemie/extra/x04-goal-achieved-oxocarbenium.png`
- `docs/reference/alchemie/extra/x05-3d-builder-ar.png`
- `docs/reference/alchemie/extra/x06-3d-builder-rotated.png`
- `docs/reference/alchemie/extra/x07-3d-builder-rotated-2.png`
- `docs/reference/alchemie/extra/x08-equation-balancing.png`
- `docs/reference/alchemie/extra/x09-stoichiometry-dimensional-analysis.png`

The two prose companions, which supplement the images and never substitute for them:

- `docs/reference/alchemie/MANIFEST.md`
- `docs/reference/alchemie/OBSERVATIONS.md`

### The ten inspirations, by filename

The same principle, applied to the folder it was not applied to. `CLAUDE.md`'s owner ruling of
2026-08-21 makes `docs/reference/competitors/inspirations/` the BLIND-COMPARISON bar for the pathway,
the leaderboard tabs and the language picker, so a critic reaches it by filename exactly as it
reaches Alchemie. Every one of these contains a space, so every one is quoted: paste them straight
into a shell.

- `"docs/reference/competitors/inspirations/blockage duo.webp"`
- `"docs/reference/competitors/inspirations/duolingo - lessons but we can make it into real world applications of organic chemistry and examples.png"`
- `"docs/reference/competitors/inspirations/duolingo animation and focus on task.webp"`
- `"docs/reference/competitors/inspirations/duolingo path or track.png"`
- `"docs/reference/competitors/inspirations/inspo for find tutors.jpg"`
- `"docs/reference/competitors/inspirations/leaderboard insiration.png"`
- `"docs/reference/competitors/inspirations/memrise inspo for ui.webp"`
- `"docs/reference/competitors/inspirations/progress & buttons.png"`
- `"docs/reference/competitors/inspirations/quizlet subscription plan.jpg"`
- `"docs/reference/competitors/inspirations/rewards, progress, and guidebook duolingo.png"`

`leaderboard insiration.png` is spelled that way on disk. Do not correct it in a command.

### The four competitor repos, by name

`docs/reference/competitors/repos/` holds four checkouts, read-only reference, not dependencies:

- `docs/reference/competitors/repos/canvas-ui`
- `docs/reference/competitors/repos/duolingo-clone`
- `docs/reference/competitors/repos/ludolang`
- `docs/reference/competitors/repos/ludolang-backend`

### The Mobbin captures

`docs/reference/competitors/mobbin/` holds 10 entries, matching the table above: `MANIFEST.md`, seven
`duolingo--onboarding--0N.png` captures, the folder below, and its `.zip`.

- `"docs/reference/competitors/mobbin/blueberry screens"`, **61 files**. Quote it in any shell
  command. Read `docs/reference/competitors/mobbin/MANIFEST.md` first; 61 screens is too many to open
  blind.

### The other assets a trainer critic will want

- `docs/reference/design-goals/MANIFEST.md`, the file-to-decision map, with the binding-layout rule at `:3-8`
- `docs/reference/design-goals/BUTTON-MECHANICS.md`
- `docs/reference/design-goals/blueberry_r9-lesson-reaction_1788289506.png`, predict-the-product shell
- `docs/reference/design-goals/blueberry_r9-lesson-resonance_1788289496.png`, resonance question shell
- `docs/reference/design-goals/blueberry_r9-lesson-synthesis_1788289500.png`, synthesis question shell
- `docs/reference/design-goals/blueberry_r9-train-landing_1788289486.png`, the Train tab landing
- `docs/reference/design-goals/blueberry_spec-button-types_1788291091.png`, the press language
- `docs/reference/design-goals/blueberry_spec-question-badges_1788291079.png`, the badge per answer kind
- `docs/reference/design-goals/blueberry_r9-onboard-placement_1788289481.png`, instance 12's shell
- `docs/reference/design-goals/blueberry_r9-onboard-question_1788289477.png`, the onboarding question frame
- `docs/reference/competitors/orgosolver-03-skill-tree-progression.png`, the pathway worked example
- `docs/reference/competitors/orgosolver-01-quiz-stereocenters.png`
- `docs/reference/competitors/WEB-INSPIRATION.md`

---

## Part 6 - Duplicated versus per-question

### What is copy-pasted across instances

Every copy is cited. Each entry says whether the copies are identical or have drifted, and names the
drift.

**1. Curved-arrow bow geometry. DRIFTED, and this is the sharpest finding in the audit.**

- `apps/web/src/render/layout/stepScene.ts:245-255` sets the bow SIDE as
  `bow: index % 2 === 0 ? 1 : -1` at `:253`. That is arrow LIST INDEX PARITY, with no geometry input
  at all.
- `apps/web/src/render/svg/MoleculeSvg.tsx:220-224` consumes that sign with a fixed magnitude of
  `0.55 * PX`, which is 39.6 px, uncapped and unfloored.
- `apps/web/src/tabs/trainer/hitLayout.ts:413-436` (`bowAwayFrom`) caps and floors the magnitude at
  `Math.min(magnitude, Math.max(18, len * 0.32))` (`:430`) and chooses the side as whichever
  perpendicular candidate is farther from the scene centroid (`:435`).
- `apps/web/src/tabs/trainer/DrawCanvas.tsx:364-367` (`curveAway`) is the only caller of
  `bowAwayFrom`, with `BOW_PX = 34` (`DrawCanvas.tsx:213`). It is invoked twice per rendered arrow at
  `:1071-1072`, `:1133-1134` and `:1182-1208`.

Three named differences. **Side selection is not the same kind of rule**: the draw canvas arcs an
arrow away from the molecule, playback alternates by list position, so for any step whose arrows sit
on the same side of the centroid, playback drives the odd-indexed arrow through the molecule.
**Magnitude**: playback is a flat 39.6 px with no cap, and `apps/web/src/tabs/trainer/hitLayout.ts:419-429`
documents the cap as the fix for a real defect (a control point past the endpoint gives a backwards
tangent, so the arrowhead aims away from its target) that `MoleculeSvg` never received. **End trim**:
playback lerps both ends toward the control point by 0.18 and 0.22
(`apps/web/src/render/svg/MoleculeSvg.tsx:226-227`), while the draw canvas swings the landing onto the
atom rim with `landingOnRim` and `MIN_CHORD = 34` (`hitLayout.ts:439`, called from
`apps/web/src/tabs/trainer/DrawCanvas.tsx:287`, `:325` and `:1130`).

What a student sees: `apps/web/src/tabs/trainer/TrainerTab.tsx:428` flips to play mode the instant an
answer is correct, so they watch the arrow they just drew re-drawn on a different curve, possibly on
the other side, with a differently placed head.

**2. Scene-to-pixel projection and atom radius by element. DRIFTED.**

- `apps/web/src/render/svg/MoleculeSvg.tsx:34-48`: `PX = 72`, `ATOM_R = 21`, `ATOM_R_SMALL = 13`,
  `HIT_R = 22`, `px()` at `:45-48`, `radiusFor()` at `:41-43` with **two tiers**, H is 13 and
  everything else is 21.
- `apps/web/src/tabs/trainer/hitLayout.ts:34-51`: the same three constants re-declared, plus
  `ATOM_R_LARGE = 26`, `toPx()` at `:39-41`, `atomRadius()` at `:43-51` with **three tiers**, H is 13,
  Br, I, Cl, S and P are 26, everything else is 21.
- `apps/web/src/tabs/trainer/DrawCanvas.tsx:280-282` (`elementRadius`) is a thin wrapper over
  hitLayout's three-tier version.

`toPx` and `px` are byte-equivalent and the shared constants are re-declared rather than imported;
`apps/web/src/tabs/trainer/hitLayout.ts:7-10` admits the copy in prose. The real drift is the radius:
bromine, iodine, chlorine, sulfur and phosphorus are drawn at r=26 on the draw canvas and at r=21
during playback of the same step. Because `landingOnRim` receives the three-tier radius (through
`apps/web/src/tabs/trainer/DrawCanvas.tsx:285-289` and `:1129-1130`) with `LAND_GAP = 16`
(`DrawCanvas.tsx:223`), an arrow landing on a heavy halogen is computed against a rim 5 px larger than
the one playback draws. `TRAINER_REACTIONS[0]` is the SN2 at bromomethane, so this is the first thing
a student meets. **Severity note, stated rather than hidden: the two radius functions provably differ
and the wiring was read, but no specific authored step was stepped through to confirm the 5 px offset
on screen.**

**3. The arrow-key grammar, `${electrons}e ${source} -> ${sink}`. DRIFTED, with one live consequence.**

- `apps/web/src/tabs/trainer/grade.ts:47-70` (`sourceKey`, `sinkKey`, `arrowKey`), raw ids, no
  canonicalisation.
- `apps/web/src/tabs/trainer/equivalence.ts:104-125` (`canonicalArrowKey`), the same output grammar
  with every id replaced by its canonical form. Its own comment at `:102` says "Same shape as
  arrowKey in grade.ts so the two read alike side by side".
- `apps/web/src/cards/Recommendation.tsx:200` (`ARROW_KEY_PATTERN`) plus `arrowFromKey` at `:215`, the
  grammar written a third time, as a parser.
- `apps/web/src/tabs/trainer/distractors.ts:35-149` (`DISTRACTORS_BY_STEP`), the grammar hand-written
  into 15 authored literal data keys, for example `"2e lp:o1 -> atom:br1"` at `:36`.

The live consequence: `gradeDrawing` tallies with `canonicalArrowKey`
(`apps/web/src/tabs/trainer/grade.ts:89-90`) precisely so that a student who pushes the chemically
interchangeable pair is graded right. But `matchDistractor` looks up
`DISTRACTORS_BY_STEP[step.id]?.[arrowKey(arrow)]` with the RAW key
(`apps/web/src/tabs/trainer/distractors.ts:152-153`). So a student who draws a wrong arrow from the
equivalent-but-not-authored atom is correctly graded `not_requested` and then silently misses the
Tier 2 explanation written for exactly that mistake, falling through to generic copy. That is a direct
hit on the feedback-specificity win axis.

The fourth site, `missingArrows` at `apps/web/src/tabs/trainer/grade.ts:105-107`, is also on the raw
key but is **DEAD**, as recorded in Part 4. It is a latent copy, not a second live bug. The journal
path is internally consistent: `apps/web/src/tabs/trainer/TrainerTab.tsx:435` and `:455` store raw
keys and `apps/web/src/cards/Recommendation.tsx:215` parses raw, so any fix must migrate `grade.ts`,
the data keys in `distractors.ts`, and `Recommendation.tsx`'s regex together or not at all.

**4. Undo stack. DRIFTED, with opposite invariants for the same concept.**

- `packages/interaction/src/document.ts:41-71`: `commitDraft` (`:52`) pushes the OLD draft onto
  `past`, `undoDocument` (`:62`) reads `past[past.length - 1]`, the cap is `UNDO_DEPTH = 50` (`:33`),
  everything is frozen, and it returns `null` when empty so the caller can say so by name.
- `apps/web/src/beats/trace/FreehandCanvas.tsx:92`: `commit` pushes `snapshotOf(next)`, the NEW state,
  with `[...previous.slice(-30), ...]`; `undo` at `:154-158` reads `past[past.length - 2] ?? EMPTY`.
- `apps/web/src/tabs/trainer/TrainerTools.tsx:299-306`: a mutable `strokesRef.current.pop()` on
  pointer down, uncapped, ink strokes only.

`document.ts` stores PRE-states and reads index `length - 1`. `FreehandCanvas` stores POST-states and
reads `length - 2`. Two contradictory conventions for one concept, and the second carries a bug:
`slice(-30)` truncates the bottom of the stack while `past[past.length - 2]` walks toward it, so once
30 snapshots have accumulated, undoing to the bottom lands on `EMPTY` and the whole drawing is lost
rather than one step being taken back. Also `clear()` at
`apps/web/src/beats/trace/FreehandCanvas.tsx:160-163` sets `past` to `[]` without pushing, so a clear
is itself un-undoable; `resetDocument` at `packages/interaction/src/document.ts:69-71` has the same
behaviour but states it in its own comment. Mitigating fact: `FreehandCanvas` is unreachable, so this
cannot fire today.

**5. Press acknowledgement on pointer down. DRIFTED, but DELIBERATELY, and that matters.**

- `apps/web/src/theme.css:754-770`, `.press` and `.press:active`: `transform: scale(0.96)` plus
  `filter: brightness(0.92)`, transition 120 ms. Consumed by `apps/web/src/app/ui/Press.tsx:66`.
- `apps/web/src/beats/beat-chrome.css:114-116`, `.chip-press:active:not(:disabled)`:
  `translateY(var(--chip-press-travel))` with the box-shadow edge collapsing. Consumed by
  `apps/web/src/beats/ChipPress.tsx:36`.
- `apps/web/src/beats/trace/PressButton.tsx:61-91`: React `useState`, with
  `transform: pressed ? "translateY(2px) scale(0.98)" : "none"` at `:89` and a 90 ms transition at
  `:90`.
- `apps/web/src/tabs/trainer/TrainerTools.tsx:299-322`: `className="press"` plus raw `onPointerDown`
  handlers that do the work directly, bypassing both button components.

Each copy carries a written justification for existing separately, so this should NOT be collapsed to
one component. The narrower finding is that one contract on one sub-100 ms budget is implemented with
three different press GEOMETRIES (scale only, translate only, translate plus scale) and two different
DURATIONS (120 ms and 90 ms), and that `PressButton` is the only one with JavaScript in the
acknowledgement path, which is exactly what `apps/web/src/theme.css:750-753` avoids by using
`:active`. The tokens should be shared; the components should not.

**6. Hit testing, the ranking rule and its tolerance budget. DRIFTED, and the measured copy is
unreachable.**

- `packages/interaction/src/geometry/hit-test.ts` holds the rule, with the tolerance profiles at
  `packages/interaction/src/geometry/targets.ts:85-134`. Slop is PER TARGET KIND: touch is
  `{ atom: 0, lone_pair: 8, bond_handle: 8, implicit_hydrogen: 8 }` (`:124-128`), pen is
  `{ 0, 3, 3, 3 }` (`:100-104`), mouse is all zero (`:85-89`).
- `apps/web/src/tabs/trainer/hitLayout.ts:60`:
  `const SLOP: Record<PointerKind, number> = { touch: 10, pen: 6, mouse: 0 }`, PER POINTER only,
  applied uniformly to every kind, plus a touch floor of `Math.max(entry.radius + slop, 22)` inside
  `createHitTester` at `:538-563`, specifically `:544`.

The ranking rule is the same in both: normalised distance, smallest wins, margin is runner-up minus
winner. The budget is not. `packages/interaction/src/geometry/targets.ts:118-122` states the reason
atoms get zero, and it is the load-bearing sentence: tolerance is zero sum between neighbours, so
growing an atom's radius moves the decision boundary INTO the lone pairs on its rim. The shipped
tester gives atoms slop 10 and then floors every touch target at radius 22, inflating exactly the
target the analysis says must not grow. The two are not in comparable units either:
`targets.ts` works in points against a measured 71.5 pt atom, `hitLayout.ts` works in the shell's px
space at `PX = 72` per bond length with `ATOM_R = 21`, and nothing converts between them.

**And the measured half cannot be imported.** `packages/interaction/src/index.ts` exports
`geometryPort.js` at `:58-66` and never `./geometry/`, and `packages/interaction/package.json`
declares `exports` with only `"."`. So all EIGHT files in that folder are reachable only from
`packages/interaction/test/`: `packages/interaction/src/geometry/fingertip.ts`, `hit-test.ts`,
`index.ts`, `minimum-target.ts`, `reference-layouts.ts`, `targets.ts`, `tolerance.ts` and `units.ts`.
`index.ts` is on that list rather than exempt from it: the folder has its own barrel and the package
barrel never re-exports it, which is precisely why nothing outside the tests can reach the other
seven. The consequence for `CLAUDE.md`'s win-axis row is
direct: "mis-tap rate against a synthetic fingertip model at the tightest lone-pair and bond-handle
spacing" is scored against a model that no shipped code path runs.

**7. The authored explanation triple. SUPERFICIAL divergence, one real consequence, one real gap.**

Four namings of the same three jobs:

- `packages/feedback/src/types.ts:43`, `:50`, `:57`: `whatYouDid` / `why` / `lookAt`
- `packages/curriculum/src/explanation.ts:41`, `:49`, `:56`: `whatHappened` / `why` / `lookAt`. The
  rename is documented and defended at `:13-18`, on the grounds that the subject is the answer and
  not the student
- `apps/web/src/tabs/trainer/distractors.ts:21-28`: `what` / `why` / `lookAt`
- `apps/web/src/cards/Recommendation.tsx:166-179`: `what` / `why` / `lookAt` plus `tier`

The consequence: three independent renderers spell the labels out separately, so a change to the
feedback presentation is three edits in three directories.
`apps/web/src/tabs/trainer/TrainerTab.tsx:841`, `:856`, `:879`, `:906` and `:920` render
`<Detail label="Look at" .../>`; `apps/web/src/beats/sort/SortBeatView.tsx:531` renders
`<b>Look at</b>`; `apps/web/src/lesson/Feedback.tsx:37` renders `<dt>Look at</dt>` inside `Explain`
(`:25`), fed at `:71`.

The gap is sharper than the naming. `voiceViolations` at
`packages/curriculum/src/explanation.ts:115` is genuinely NOT duplicated, and
`apps/web/src/beats/mcq/authoring.ts` imports it rather than reimplementing it, which is the right
pattern. But the trainer's own distractor copy (`apps/web/src/tabs/trainer/distractors.ts`, 15
authored entries) and `packages/feedback`'s cause copy never pass through it, so `CLAUDE.md`'s
banned-construction lint covers the beats and the curriculum corpus and skips the two places the
mechanism trainer actually reads from.

**8. Small vector helpers. IDENTICAL formulas, four different zero-guards. Low severity.**

Unit normal `(-dy/len, dx/len)`, four copies with four guards:
`apps/web/src/beats/trace/render.ts:123-124` guards `length <= 1e-6`;
`apps/web/src/render/svg/depth.tsx:161-162` guards with `|| 1`;
`apps/web/src/onboarding/StructureFigure.tsx:69-70` guards with `|| 1`;
`apps/web/src/tabs/trainer/hitLayout.ts:431-433` guards with an early return at `:418` when `len < 1`.

Planar distance `Math.hypot(a.x - b.x, a.y - b.y)`: `apps/web/src/tabs/trainer/hitLayout.ts`
(private), `apps/web/src/beats/trace/geometry.ts` (exported), and
`packages/interaction/src/geometry/units.ts` (unreachable, see item 6).

`lerp` versus `mix`: `apps/web/src/render/layout/vec.ts` carries z and
`apps/web/src/tabs/trainer/hitLayout.ts:30-32` does not, and the split is documented at
`hitLayout.ts:29`. That one is defensible and should stay.

Multiple-bond offsets are three unshared constant sets: `apps/web/src/render/svg/depth.tsx:164` uses
`[-5.5, 5.5]` and `[-10, 0, 10]`; `apps/web/src/onboarding/StructureFigure.tsx:26-27` uses
`DOUBLE_GAP = 3.1` and `TRIPLE_GAP = 4.4`, applied at `:87`; `apps/web/src/beats/trace/render.ts:26`
uses `MULTIPLE_BOND_GAP = 9`, applied at `:125`, `:132` and `:140`. **Honest qualifier**: these are not
directly comparable numbers, because the three files draw in different coordinate spaces, and the
trace renderer is unreachable anyway. The claim is "three unshared constant sets", not "a student sees
three different gaps in one session".

### What legitimately differs per question and must stay data

- **`step: MechanismStep`**, at `apps/web/src/demo/reactions.ts:41`,
  `apps/web/src/demo/sequences.ts:36` and `apps/web/src/demo/resonance.ts:39`. This IS the question.
  It is chem-core's own type, already pure data, already the thing the validators and fixtures
  address. Nothing about it is code.
- **`fromHints` and `toHints`**, at `apps/web/src/demo/reactions.ts:42-43`,
  `apps/web/src/demo/sequences.ts:38-39` and `apps/web/src/demo/resonance.ts:40-41`. Where an author
  wants each atom placed. Genuinely per-question: two chemically identical steps can need different
  layouts to read on a phone. Already the right shape, an optional override on a computed layout.
- **`title`, `brief`, `successLine`, `foundLine`, `stepBrief`**, at
  `apps/web/src/demo/reactions.ts:35-40`, `apps/web/src/demo/sequences.ts:32-37` and
  `apps/web/src/demo/resonance.ts:35-38`. Authored copy, one per problem, reviewed by a person, and a
  human gate under `CLAUDE.md`'s voice section. The only cleanup available is naming: `successLine`
  and `foundLine` are the same field under two names, already merged at
  `apps/web/src/tabs/trainer/TrainerTab.tsx:127` and `:148`.
- **Tier 2 distractor entries, keyed by the offending arrow**, at
  `apps/web/src/tabs/trainer/distractors.ts:35-149`, matched at `:152-153`. The specific mistakes an
  instructor knows students make on that exact problem. Data by definition, and `CLAUDE.md` defines
  Tier 2 as per-problem authored data matched on mechanism state. The caveat is the key format,
  covered above.
- **`step.identity.reactionCenters`**, read at `apps/web/src/tabs/trainer/DrawCanvas.tsx:1087-1095` to
  draw the resting halo. Which atoms the question is about. The comment at `:1079-1086` explains it is
  what lets the canvas say WHERE the question lives without revealing an arrow, a per-question
  authoring decision with an anti-requirement attached.
- **Sequence step ordering and the per-step brief**, at `apps/web/src/demo/sequences.ts:35-40`.
  Correctly nested: the ordering is the question. One wart:
  `apps/web/src/tabs/trainer/TrainerTab.tsx:140` synthesises a non-final step's success line by regex,
  `item.stepBrief.replace(/^Step \d+ · /, "Done: ")`, which is authored copy transformed by code and
  should be an authored field.
- **The mastery rung and its guide style**, at `apps/web/src/beats/types.ts:225`
  (`traceGuideStyle`), which fades the guides across L0 to L3. The same authored question served at
  four difficulties. Correctly data-shaped already, and named here because it is the pattern the
  trainer lacks: there is no L0 to L3 ladder on a mechanism step, and `BeatRunner` is mounted with no
  `level` prop at `apps/web/src/App.tsx:103-107`, defaulting to 1 at
  `apps/web/src/beats/BeatRunner.tsx:105`, so nothing above L1 is reachable anywhere today.

**Two things that are currently CODE and should be DATA.** `arrowless` is hardcoded `true` for every
sequence at `apps/web/src/tabs/trainer/TrainerTab.tsx:141`, and `resonance` is hardcoded `true` for
every hunt at `:148`. Both are consumed as props at `:625` and resolved to a primitive at
`apps/web/src/tabs/trainer/DrawCanvas.tsx:487`, which supports the two switches INDEPENDENTLY. So
today there is no way to author a single-step reaction that runs arrowless, or a sequence that shows
arrows, even though both are legitimate per-question pedagogy: an early lesson may want the arrow
visible, a later single step may want the gesture only. Move both onto the registry entry with a
per-registry default.

**Element radius tier**, at `apps/web/src/tabs/trainer/hitLayout.ts:43-51`, is chemistry data
(coarsened van der Waals ratios, per the comment at `:44-47`) currently living as an inline
conditional in a layout file, and it is the direct cause of the r=26 versus r=21 replay drift in item
2. It should be one exported table the projection reads, not a branch two files disagree about.

---

## Part 7 - The shared engine that should exist

### Why a new package, before the code

Three constraints decide the boundary and all three point the same way.

**Why not `packages/chem-core`.** This code knows about pixels, atom radii and screen layout, and
`CLAUDE.md` says chem-core carries no rendering. The moment a bow magnitude in px lands in chem-core,
the 150 KB gzipped ceiling starts paying for screen geometry and the engine stops being testable
without a canvas.

**Why not `packages/interaction`.** Interaction is the pointer state machine, and
`packages/interaction/src/geometryPort.ts` deliberately declares `HitTester` as an interface it does
not implement, handing layout to whoever knows where things are drawn. That handoff is correct. It
was read as "the shell implements the whole thing", and the result is
`apps/web/src/tabs/trainer/hitLayout.ts`, 563 lines of shell code reimplementing a ranking rule
`packages/interaction/src/geometry/` already had, with the tolerance budget wrong. The LAYOUT is
shell knowledge. The RULE (how slop is spent, how a curve bows, how a key is spelled) is not.

**Why not `apps/web/src/tabs/trainer/`.** Because that is where it lives now, and Part 6 is the
evidence: two hit testers, two bow rules, four spellings of one string grammar, three undo
conventions and three result vocabularies (three, not four: `TraceOutcome` converts INTO `BeatResult`
rather than competing with it, per Part 4) all exist because the only home for shared trainer logic was a
directory a second shell cannot import.

Against the repository's package rules this is clean. `packages/curriculum` already sets the
precedent that a pure-TS package may depend on chem-core, `packages/interaction` already depends on
chem-core, and nothing here inverts the one forbidden direction, which is that chem-core must never
depend on curriculum.

### Name and location

**`@blueberry/mechanism-play`**, living at `packages/mechanism-play/`. A new pure-TypeScript package,
sibling to `packages/interaction`, depending on `@blueberry/chem-core` and `@blueberry/interaction`.

It has a one-line prerequisite that should land first whether or not the package is ever built:
`packages/interaction/src/index.ts` must re-export `./geometry/`, and
`packages/interaction/package.json` must widen its `exports` beyond `"."`, because the measured
hit-test rule and the synthetic fingertip model already exist there and are unreachable from any
shell today.

### What it owns

- **The projection.** `PX`, the atom radius tiers, scene to pixel, and element radius as ONE table.
  This kills the `apps/web/src/render/svg/MoleculeSvg.tsx:34-48` versus
  `apps/web/src/tabs/trainer/hitLayout.ts:34-51` split and the bromine r=26 versus r=21 replay drift.
- **Curve geometry as pure functions returning geometry, not path strings.** The bow (side rule AND
  cap and floor in one place), the rim landing, and the end trim. This is the fix for
  `apps/web/src/render/layout/stepScene.ts:253`'s index-parity bow, the audit's sharpest defect.
- **Target compilation.** Turning a `StepScene` plus a draft into the target list that
  `packages/interaction/src/geometry/hit-test.ts` already knows how to rank, with the per-KIND
  tolerance profile from `packages/interaction/src/geometry/targets.ts:85-134` instead of
  `apps/web/src/tabs/trainer/hitLayout.ts:60`'s uniform per-pointer slop.
- **The arrow-key grammar.** Exactly one encoder, one decoder and one canonicaliser, so
  `apps/web/src/tabs/trainer/grade.ts`, the data keys in `apps/web/src/tabs/trainer/distractors.ts`
  and the regex at `apps/web/src/cards/Recommendation.tsx:200` cannot drift apart again.
- **Verdict shaping.** `DrawVerdict` construction with the same compile-time `Assert<NoExtras<...>>`
  proof against chem-core's `ResolutionKind` that `apps/web/src/beats/types.ts:632-633` already
  demonstrates is workable.
- **The `Playable` normalisation** currently trapped inside
  `apps/web/src/tabs/trainer/TrainerTab.tsx:110-149`, with `arrowless` and `resonance` read from the
  registry entry rather than hardcoded by which registry the entry came from.

### What it must NOT own

- **React, JSX, hooks, or any DOM type.** Non-negotiable. It depends on `packages/interaction`, whose
  own header states no React and no DOM, and a package cannot loosen a constraint it imports under.
  `packages/chem-core` carries the same rule from `CLAUDE.md`.
- **SVG elements, markers, CSS, colour tokens, or the press language.**
  `apps/web/src/tabs/trainer/DrawCanvas.tsx` and `apps/web/src/render/svg/MoleculeSvg.tsx` stay in
  `apps/web` and keep every `<path>`, every `<marker>` and every `var(--primary)`. The engine returns
  numbers; the shell spends them on ink.
- **The pointer state machine, arming, the revise window, or the undo stack.** Those are
  `packages/interaction/src/machine.ts` and `packages/interaction/src/document.ts`, and duplicating
  them is how a third undo convention gets born.
- **Arrow legality or any chemistry judgement.** That is chem-core's `arrowLegalityFindings`, called
  through, never reimplemented.
- **Authored student-facing copy.** `packages/feedback` owns Tier 1 copy and the per-problem
  distractor tables stay data in `apps/web`. The engine may key them, never write them.
- **The registries themselves.** `apps/web/src/demo/reactions.ts`, `sequences.ts` and `resonance.ts`
  stay authored data in the app, or move to their own data package later. The engine takes them as an
  argument.
- **Anything that gates access or costs money.** Per `CLAUDE.md`'s non-negotiables that is server
  side, and this is a client geometry and grading library.

### The public API

```ts
// packages/mechanism-play/src/index.ts
// No React, no DOM, no rendering. See the constraints above.

import type {
  AtomId,
  CauseId,
  ElectronFlowArrow,
  MechanismState,
  MechanismStep,
  ResolutionKind,
} from "@blueberry/chem-core";
import type { HitTarget, HitTester, Point2, PointerKind } from "@blueberry/interaction";

/* ---- projection: one table, replacing the MoleculeSvg / hitLayout split ---- */

export interface CanvasScale {
  /** Pixels per bond length. 72 today, in both copies. */
  readonly pxPerBond: number;
  /** The ONE three-tier table. Chemistry data, not an inline conditional. */
  readonly radiusByElement: (element: string) => number;
}

export const DEFAULT_SCALE: CanvasScale;

export function toPx(v: { x: number; y: number; z: number }, scale?: CanvasScale): Point2;

/* ---- curve geometry: numbers out, never a path string ---- */

export interface ArrowCurve {
  readonly from: Point2;
  /** Quadratic control point, side and magnitude already decided. */
  readonly control: Point2;
  /** Landing, already swung onto the rim. */
  readonly to: Point2;
}

/**
 * THE single bow rule. Replaces stepScene.ts:253's index parity AND
 * MoleculeSvg.tsx:220-224's uncapped inline copy with hitLayout.ts:413-436's
 * capped, centroid-aware version, so draw and playback agree by construction.
 */
export function arrowCurve(args: {
  readonly source: Point2;
  readonly sinkCentre: Point2;
  readonly sinkRadius: number;
  readonly centroid: Point2;
  /** Default 34, matching DrawCanvas.tsx:213's BOW_PX. */
  readonly bowPx?: number;
  /** Default 16, matching DrawCanvas.tsx:223's LAND_GAP. */
  readonly landGapPx?: number;
}): ArrowCurve;

export function sceneCentroid(atomCentres: readonly Point2[]): Point2;

/* ---- targets and hit testing: the measured tolerance model, reachable at last ---- */

export interface DrawTarget {
  readonly target: HitTarget;
  readonly centre: Point2;
  readonly drawnRadius: number;
  readonly kind: "atom" | "lone_pair" | "bond_handle" | "implicit_hydrogen";
}

/**
 * Delegates ranking to packages/interaction/src/geometry/hit-test.ts and slop
 * to its per-KIND profiles. Atoms get zero slop, per targets.ts:118-122's
 * zero-sum result, instead of hitLayout.ts:60's uniform 10.
 */
export function createHitTester(
  getTargets: () => readonly DrawTarget[],
  pointer?: PointerKind,
): HitTester;

/** The mis-tap number CLAUDE.md's win axis asks for, over the layout that ships. */
export function misTapReport(
  targets: readonly DrawTarget[],
  pointer: PointerKind,
): {
  readonly worstEncroachmentPx: number;
  readonly violations: readonly { readonly aId: string; readonly bId: string }[];
};

/* ---- arrow identity: ONE grammar, encode plus decode plus canonicalise ---- */

export function arrowKey(arrow: ElectronFlowArrow): string;
export function canonicalArrowKey(state: MechanismState, arrow: ElectronFlowArrow): string;
export function arrowFromKey(key: string): ElectronFlowArrow | null;

/* ---- verdict shaping, guarded against chem-core's four ---- */

export type DrawVerdict =
  | { readonly kind: "correct"; readonly cause: CauseId }
  | { readonly kind: "invalid"; readonly cause: CauseId }
  | { readonly kind: "not_requested"; readonly missing: number; readonly extra: number }
  | { readonly kind: "incomplete"; readonly drawn: number; readonly needed: number };

type Assert<T extends true> = T;
type NoExtras<A, B> = [Exclude<A, B>] extends [never] ? true : false;

/** "incomplete" is the one deliberate extra, excluded BY NAME rather than by silence. */
export type DrawVerdictCoversResolutionKind = Assert<
  NoExtras<Exclude<DrawVerdict["kind"], "incomplete" | "not_requested">, ResolutionKind>
>;

export function gradeDrawing(
  step: MechanismStep,
  drawn: readonly ElectronFlowArrow[],
): DrawVerdict;

/* ---- the normaliser, lifted out of TrainerTab.tsx:110-149 ---- */

export interface Playable {
  readonly step: MechanismStep;
  readonly title: string;
  readonly brief: string;
  readonly successLine: string;
  /** Now READ from the entry, not hardcoded per registry branch. */
  readonly arrowless: boolean;
  readonly showArrowheads: boolean;
  readonly sequencePosition: {
    readonly index: number;
    readonly total: number;
    readonly last: boolean;
  } | null;
}

export interface PlayableSource {
  resolve(selection: {
    readonly kind: string;
    readonly id: string;
    readonly stepIndex?: number;
  }): Playable | null;
}

/** Which atoms the question is about, for the resting halo. Per-question data, read not derived. */
export function reactionCentres(step: MechanismStep): readonly AtomId[];
```

### Honest scope warning

This is a real extraction of roughly 1,200 lines across five files, and it carries two live behaviour
changes inside it: the bow rule and the tolerance budget. It will change what the trainer looks like
and what it grades. It must be measured against `apps/web/measurements/capture-trainer.mjs` and
`apps/web/measurements/capture-parity.mjs` before and after, not merged on a green typecheck.

**If only one thing is done, do the two-line version first.** Export `./geometry/` from
`packages/interaction/src/index.ts`, and route
`apps/web/src/tabs/trainer/distractors.ts:153` through `canonicalArrowKey`. Those are the two
highest-value fixes in this document and neither needs a new package.

---

## Part 7b - How to add a beat kind

Everything above this line is organised by THING: a surface, a file, a type. This section is the one
thing an inventory organised that way cannot hold, an EDGE: a sequence of files that must all change
together, in order, where doing four of the eleven leaves you with something that compiles, passes
its tests, and never appears on a screen. It is written out because it had to be assembled from
Parts 2, 4, D6, D8, D15 and D16 the last time somebody needed it, and three pieces were missed.

Steps 1 to 8 are the wiring and are not optional. Steps 9 to 11 are the content and the grader.

1. **`apps/web/src/beats/types.ts:121`**, add the member to the `BeatKind` union. **And
   `apps/web/src/beats/types.ts:130`, `BEAT_KINDS`**, the frozen runtime array beside it. This is the
   piece most often missed, because the union is what the compiler talks about and the array is what
   the runtime iterates. Nothing fails if you skip the array; things quietly do not appear.
2. **`apps/web/src/beats/types.ts:141`**, `BUILT_BEAT_KINDS`. Add it only when the kind really is
   built, because this is what makes a coverage report tell the truth about itself.
3. **`apps/web/src/beats/types.ts:160`**, `DEFAULT_LEVELS`, declaring which mastery rungs the kind can
   serve. Note D16 before spending long here: nothing above L1 is reachable today, because
   `apps/web/src/App.tsx:103-107` mounts `BeatRunner` with no `level` prop.
4. **`apps/web/src/beats/template.ts:86-90`**, add the arm to `ResolvedBeat`. **And
   `apps/web/src/beats/template.ts:92`, `SLOT_FOR_KIND`**, which is a
   `Readonly<Record<ResolvedBeat["kind"], ContentSlot>>`, so the compiler catches this one for you the
   moment step 4's first half lands. The `ContentSlot` you must choose from is declared at
   **`apps/web/src/beats/template.ts:62`**: `"hook" | "recognise" | "connect" | "order" | "produce"`.
   Those five words are used as prose throughout Part 2; that line is where they are actually defined.
5. **`apps/web/src/beats/template.ts:123-145`**, add a push block to `planLesson`, mirroring the four
   that are there: mcq at `:130-132`, match at `:133-135`, sort at `:136-139`, synthesis at
   `:140-142`. Each one asks "is there authored content for this node" and pushes a step if so. No
   push block means no step, and `planLesson` returns `null` for a node with no steps.
6. **`apps/web/src/beats/template.ts:160-162`**, `nodeHasBeat`. It is `planLesson(node) !== null`, so
   it comes free from step 5, but check it: it is what decides whether the pathway links the node at
   all, and D8 is a live example of this half being out of step with the content.
7. **`apps/web/src/beats/template.ts:282-298`**, `problemBadge`, add a case. Its bare `default` at
   `:296` is DELIBERATE and documented at `:280` (an unknown kind gets the mcq badge rather than
   throwing mid-lesson), so ADD A CASE rather than rewriting the default. See D6's closing paragraph.
8. **`apps/web/src/beats/BeatRunner.tsx`**, a `lazy()` import beside the four at `:82-87`, and a mount
   block beside the four at `:202-244`. Heavy imports are lazy per `CLAUDE.md`'s non-negotiables, so
   copy the shape rather than importing directly.
9. **The corpus module**, one per kind, and the existing four are the pattern:
   `apps/web/src/beats/mcq/content.ts`, `apps/web/src/beats/match/boards.ts`,
   `apps/web/src/beats/sort/ladders.ts`, `apps/web/src/beats/synthesis/corpus.ts`. Authored data,
   keyed by node, and it is what step 5's condition asks about.
10. **The grader**, a new entry function returning a `BeatResult`
    (`apps/web/src/beats/types.ts:603-615`). Part 4 lists the four that exist and what each one
    actually produces. Read Part 4's guard note first: `BeatResult` is the one union the compiler
    holds to the specification's four outcomes, and a new grader should keep it that way.
11. **Only if the kind must also appear in the COURSES player**, which is a second and separate
    system: `apps/web/src/lesson/ProblemView.tsx`'s answer-kind switch at `:65-118`, and
    `packages/curriculum`'s answer checker. The beats runner and the courses player do not share a
    grader, a vocabulary or a corpus. Do not assume step 11 follows from step 10.

**The payoff, and the reason the order matters.** An engineer who does step 1 and stops has shipped a
`BeatKind` that compiles, typechecks, and is never planned and never rendered. That is not a
hypothetical: it is sitting in the tree three times over, for `mechanism`, `resonance` and `trace`,
and it is D15. The compiler helps at exactly one point in this list, step 4, where `SLOT_FOR_KIND`'s
`Record<ResolvedBeat["kind"], ContentSlot>` forces the pairing. Everywhere else, skipping a step
produces silence.

---

## Part 8 - Defects found

Exactly ONE defect was fixed in this phase. Everything else below is REPORTED, NOT FIXED, and says so
on its own line.

Feed's missing route is deliberately NOT in this list. It is the scheduled state under `CLAUDE.md`'s
owner amendment of 2026-09-01, and it is filed in Part 9.

### D1. The lesson button opened the wrong chemistry. FIXED.

**Severity: high. Silent wrong content on 17 of the map's nodes.**

Evidence, reproduced in headless Chrome against `vite` on port 5311. Open `#/trainer`, press the
problem-browser opener chip (labelled `<current title> · change`), expand `Unit 1 · Conjugation,
Resonance & Dienes`, press `Kinetic vs thermodynamic control`. BEFORE the fix, `location.hash` stayed
`#/trainer` and the screen read `Allyl cation`. AFTER, `location.hash` is `#/lesson/u1-kvt` and the
lesson's first question renders.

Cause. `PlayableLink` (`apps/web/src/demo/pathwayMap.ts:20-30`) is a FOUR-kind union,
`reaction | sequence | resonance | beat`. The old `onPick` handler passed to `ProblemBrowser` was an
`if` / `else if` / bare `else` over those four, so a `beat` fell into the bare `else` and was
dispatched as `{ kind: "resonance", id: <node id> }`. `resolveSelection`
(`apps/web/src/tabs/trainer/TrainerTab.tsx:146-148`) then does
`RESONANCE_HUNT.find(...) ?? RESONANCE_HUNT[0]`, so every beat node silently opened the allyl cation
hunt under the right title. Silently is the expensive part: no error, no empty state, just the wrong
chemistry.

`hrefForPlayable` at `apps/web/src/tabs/pathway/PathwayTab.tsx:933-939` has always handled `beat`
correctly, so the two callers disagreed and only one of them was reachable from the trainer.

Fix. `onPick` is now a named `openPlayable` handler at
`apps/web/src/tabs/trainer/TrainerTab.tsx:516-535`, an exhaustive `switch` on `link.kind`, with
`beat` calling `navigate(hrefForLesson(link.id))` at `:528` and a `default` that assigns to `never` at
`:530-533`. A fifth `PlayableLink` kind is now a compile error rather than another silent redirect.
The reasoning is written into the file at `:495-515`.

Verification: `npx tsc -p tsconfig.json --noEmit` is clean, and `npm test` in `apps/web` reports 64
files and 1430 tests passing at the time of writing. **This is the only code change made in this
phase.**

### D2. The trainer never writes its selection to the URL. REPORTED, NOT FIXED.

**Severity: high. The URL lies, and a remount restores the wrong problem.**

`apps/web/src/tabs/trainer/TrainerTab.tsx:151` builds `URLSearchParams` at MODULE LOAD and
`:168-170` reads `?reaction=`, `?sequence=` and `?hunt=` once. `pickSelection`
(`TrainerTab.tsx:479-493`) changes React state and never touches the URL, and `navigate`
(`apps/web/src/app/useHashRoute.ts:33-35`) assigns only to `window.location.hash`.

Measured. Arrive at `?hunt=res-allyl-1#/trainer`, which shows "Allyl cation". Pick the 1,2 versus 1,4
addition node, and the title becomes "HBr + butadiene, 1,4 · 2 steps". Tap Cards, then tap Train, and
the title is "Allyl cation" again. The query string never changed throughout.

This is PROVEN pre-existing and reachable from the tab bar alone, so it predates D1's fix and is not
introduced by it. The real fix is making `pickSelection` sync the URL, which is a change to the
trainer's state model and out of scope for a phase that spends one code change.
`apps/web/src/charge/ChargeGate.tsx:81-101` documents the mirror image of this trap and is worth
reading beside it.

A narrower consequence of the same root: leaving the trainer for a lesson leaves a stale `?hunt=` or
`?reaction=` in the query string, because `navigate` sets only the hash. Pre-existing for every hash
navigation out of the trainer.

### D3. The lesson's exit is hardcoded to the Path tab. REPORTED, NOT FIXED.

**Severity: medium. A student is ejected somewhere they did not come from.**

`apps/web/src/App.tsx:99-108` mounts `BeatRunner` with
`onExit={() => navigate(hrefForTab("pathway"))}`. `BeatRunner` takes `onExit` as a prop
(`apps/web/src/beats/BeatRunner.tsx:93`), so the route cannot know where the student came from. A
student who opened a beat from the Train tab's picker, which is now possible because of D1's fix, is
dropped into Path with no way back to what they were doing.

### D4. The lesson route has two doors and only one is priced. REPORTED, NOT FIXED.

**Severity: medium. One path spends Charge and journals a start, the other does not.**

The pathway chip calls `preventDefault`, opens the node sheet, and START goes through `ChargeGate`,
which appends `node_started` and spends before navigating:
`apps/web/src/charge/ChargeGate.tsx:281-295`, with `progress.startNode(...)` at `:284` and the two
`go(model.node.href)` calls at `:286` and `:292`. A beat is priced as `"concept"` by
`apps/web/src/tabs/pathway/PathwayTab.tsx:926-930`.

`openPlayable` (`apps/web/src/tabs/trainer/TrainerTab.tsx:527-529`) navigates straight to
`#/lesson/<id>` with no sheet and no spend. So the same lesson costs Charge from one entrance and is
free from the other.

Related and worth fixing in the same pass: `apps/web/src/tabs/pathway/PathwayTab.tsx:936` hand-builds
the lesson href as a template literal rather than calling `hrefForLesson`
(`apps/web/src/app/routes.ts:168-170`), so one route has two spellings in the codebase.

Note that this is a client-side pricing inconsistency. Per `CLAUDE.md`'s non-negotiables the real
enforcement is server side anyway, so this is a correctness and fairness problem in the client model,
not an entitlement hole.

### D5. A bare default that costs a named cause. LATENT, NOT REACHABLE. REPORTED, NOT FIXED.

**Severity: would be high the day the trace beat is wired. Zero today.**

`apps/web/src/beats/trace/TraceBeatView.tsx:74-92` (`outcomeLine`) switches over `TraceCauseId` with
six named cases and a bare `default` at `:89-90` returning the generic line
`` `Not quite yet: ${outcome.detail}.` ``. Meanwhile `checkStructure` in
`packages/curriculum/src/answers/structure.ts` can emit `structure_does_not_match`
(`packages/curriculum/src/causes.ts:89`), `structure_comparison_budget_exhausted`
(`packages/curriculum/src/answers/structure.ts:491`, `packages/curriculum/src/causes.ts:104`) and
`structure_comparison_needs_stereochemistry` (`packages/curriculum/src/answers/structure.ts:455`,
`packages/curriculum/src/causes.ts:103`), none of which is handled. Each has authored copy in the
curriculum cause registry, so hitting the default degrades a Tier 1 named cause to a generic
sentence, on the exact axis `CLAUDE.md` says the product wins.

**Reachability, corrected and stated precisely.** This cannot bite today, because the whole trace
surface is orphaned. A grep across `apps/web/src` excluding `apps/web/src/beats/trace/` returns ZERO
importers of `TraceBeatView`, `GuidedCanvas`, `FreehandCanvas` or `beats/trace`, and the string
`trace` does not occur anywhere in `apps/web/src/beats/template.ts`, so `ResolvedBeat`
(`apps/web/src/beats/template.ts:86-90`) cannot carry a trace beat and `planLesson`
(`apps/web/src/beats/template.ts:123-145`) can never
schedule one.

Pair those two facts deliberately, because that is the trap: **this becomes reachable the moment
somebody wires the trace beat in**, which is exactly the kind of defect that gets discovered after the
wiring lands rather than before. Fix the default in the same change that adds `trace` to
`ResolvedBeat`, not after.

### D6. Four more bare defaults, lower severity. REPORTED, NOT FIXED.

Same class as D5, listed together because none of them is worth its own section:

- `apps/web/src/beats/synthesis/cards.ts:122-135`, a bare `default` at `:133-134` over the synthesis
  causes. Cosmetic: the fallback line is a reasonable sentence, so a missed cause loses specificity
  rather than saying something wrong.
- `apps/web/src/tabs/pathway/pathwayState.ts:103-122` handles 4 of the 10 `EconomyEvent` kinds with
  `default: break` at `:120-121`. `EconomyEvent` is declared at
  `packages/economy/src/journal.ts:54-95`, and the two that matter here are `resonance_found`
  (`packages/economy/src/journal.ts:75`) and `boss_cleared` (`packages/economy/src/journal.ts:74`),
  both silently ignored. **Latent, not live**:
  a grep across `apps/web/src` finds no producer for either event today.
- `apps/web/src/tabs/trainer/hitLayout.ts:379-396` (`targetAnchor`) switches over `HitTarget` with a
  `default: return null` at `:394-395`. Dead today because all seven kinds are handled, but it would
  swallow an eighth kind silently rather than failing the build.
- `apps/web/src/lesson/LessonPlayer.tsx:99-107` (`surfaceForProblem`) has a `default` at `:105-106`.
  It selects a mascot costume only, so the cost of a miss is the wrong outfit.

For contrast, `apps/web/src/beats/template.ts:282-298` (`problemBadge`) also has a bare `default`, at
`:296-297`, and it is DELIBERATE and documented at `apps/web/src/beats/template.ts:280`: an unknown answer kind gets the
mcq badge rather than throwing mid-lesson. That one is not a defect and should not be "fixed".

### D7. The test that should have caught D1 tests the wrong thing. REPORTED, NOT FIXED.

**Severity: medium. It is why D1 shipped.**

`apps/web/test/reactions.test.ts:126-146` validates that every playable link in the MAP resolves, and
its own comment at `:132-134` says "Falling through to the resonance list would have quietly passed
every beat link". But it tests the map DATA against the registries and `resolveBeat`; it does not test
the trainer's dispatch. **No test anywhere imports `apps/web/src/tabs/trainer/TrainerTab.tsx`.**

Making this testable means lifting `openPlayable` out of the component into an exported pure
`routeForPlayable(link)` and asserting all four kinds. The test belongs beside the ledger test in that
same file.

### D8. `u6-ir` has content nothing can reach, and under-reports coverage. REPORTED, NOT FIXED.

**Severity: low, but it makes the coverage number wrong about itself.**

`apps/web/src/beats/match/boards.ts:180-184` authors a match board for node `u6-ir`, so
`nodeHasBeat("u6-ir")` (`apps/web/src/beats/template.ts:160-162`) returns true. But `u6-ir` on the map
(`apps/web/src/demo/pathwayMap.ts:147`) is a `gate` with NO `playable` field, so the problem browser
disables it and nothing reaches the board. `coverage()`
(`apps/web/src/demo/pathwayMap.ts:348`) counts nodes that carry a `playable`, so it is wrong about
itself by one: authored content exists that the count does not see.

Fix is one of two, and it is an authoring decision rather than a code one: give `u6-ir` a
`playable: { kind: "beat", id: "u6-ir" }`, or delete the board. Do not do both.

### D9. Three grading vocabularies for the same four outcomes. REPORTED, NOT FIXED.

**Severity: medium, and it is architectural rather than behavioural.**

Laid out in full in Part 4. The short version: `BeatResult`
(`apps/web/src/beats/types.ts:603-615`) is the specification's four exactly and is the only one with a
compile-time guard (`apps/web/src/beats/types.ts:632-633`). `DrawVerdict`
(`apps/web/src/tabs/trainer/grade.ts:41-45`) is what the arrow-pushing trainer uses, cannot express
`correct_alternative_route` or `valid_not_requested`, adds a fifth non-result, and has no guard.
`GradingResult` (`packages/curriculum/src/grading.ts:81-119`) is a tier vocabulary on a different
axis. The cheapest defensible fix is giving `DrawVerdict` the same `Assert<NoExtras<...>>` pair, with
`incomplete` excluded by name rather than by silence, as sketched in Part 7.

### D10. The measured hit-tolerance model is unreachable from every shell. REPORTED, NOT FIXED.

**Severity: medium, and it undermines a `CLAUDE.md` win-axis measurement.**

Detailed in Part 6, item 6. `packages/interaction/src/index.ts` exports `geometryPort.js` at `:58-66`
and never `./geometry/`, and `packages/interaction/package.json` declares `exports` with only `"."`.
So all eight files in that folder, `fingertip.ts`, `hit-test.ts`, `index.ts`,
`minimum-target.ts`, `reference-layouts.ts`, `targets.ts`, `tolerance.ts` and `units.ts`, are
reachable only from `packages/interaction/test/`, the folder's own `index.ts` barrel included. The
shipped tester at `apps/web/src/tabs/trainer/hitLayout.ts:538-563` uses a uniform per-pointer slop
plus a 22 px touch floor, which inflates the atom target that
`packages/interaction/src/geometry/targets.ts:118-122` says must never grow. This is the two-line fix
named at the end of Part 7.

### D11. Playback re-draws the student's arrow on a different curve. REPORTED, NOT FIXED.

**Severity: medium, and it is the sharpest single line in the audit.**

Detailed in Part 6, item 1. `apps/web/src/render/layout/stepScene.ts:253` picks the bow side by arrow
LIST INDEX PARITY, with no geometry input, while
`apps/web/src/tabs/trainer/hitLayout.ts:435` picks it by distance from the scene centroid. For any
step whose arrows sit on the same side of the molecule, playback arcs the odd-indexed arrow through
it, and `apps/web/src/tabs/trainer/TrainerTab.tsx:428` shows that playback to the student immediately
after they get the step right.

### D12. Tier 2 distractors are keyed on a raw arrow key while grading is canonical. REPORTED, NOT FIXED.

**Severity: medium, and it is a direct hit on the feedback-specificity win axis.**

Detailed in Part 6, item 3. `apps/web/src/tabs/trainer/grade.ts:89-90` tallies with
`canonicalArrowKey`, but `apps/web/src/tabs/trainer/distractors.ts:152-153` looks up with the raw
`arrowKey`. A student who draws a wrong arrow from the equivalent-but-not-authored atom gets the right
verdict and the wrong copy: a generic line instead of the authored one written for exactly that
mistake. This is the second of the two highest-value fixes named at the end of Part 7.

### D13. `FreehandCanvas`'s undo loses the whole drawing past 30 steps. REPORTED, NOT FIXED.

**Severity: would be high if reachable. Zero today, because the TRACE surface is orphaned. That is a
statement about this surface, not about the app having one orphan; there are three, see D18.**

Detailed in Part 6, item 4. `apps/web/src/beats/trace/FreehandCanvas.tsx:92` caps the stack with
`slice(-30)` while `:154-158` reads `past[past.length - 2] ?? EMPTY`, so once 30 snapshots have
accumulated, undoing toward the bottom lands on `EMPTY` and the drawing is lost rather than one step
being taken back. `clear()` at `:160-163` is itself un-undoable. Same reachability caveat as D5: the
surface has zero importers, so this cannot fire until the trace beat is wired in.

### D14. Presentation policy encoded as code where it should be data. REPORTED, NOT FIXED.

**Severity: low today, blocking for authoring later.**

`arrowless` is hardcoded `true` for every sequence at
`apps/web/src/tabs/trainer/TrainerTab.tsx:141`, and `resonance` is hardcoded `true` for every hunt at
`:148`, even though `apps/web/src/tabs/trainer/DrawCanvas.tsx:487` supports the two switches
independently. There is no way to author a single-step reaction that runs arrowless, or a sequence
that shows arrows.

### D15. Three declared beat kinds can never be planned. REPORTED, NOT FIXED.

**Severity: low, but it makes the type system say something untrue.**

`apps/web/src/beats/types.ts:121-128` declares seven `BeatKind` members. `ResolvedBeat`
(`apps/web/src/beats/template.ts:86-90`) has four. So `mechanism`, `resonance` and `trace` exist in
the type system and can never reach a lesson. `apps/web/src/beats/types.ts:141` already names two of
them in `BUILT_BEAT_KINDS` so a coverage report can say so, which is the honest half; the dishonest
half is that `BeatKind` reads like a menu. The trace half of this is one of the three orphans in
D18, and the ordered fix for the general case, adding a beat kind so that it actually plans and
renders, is Part 7b.

Related and worth noting in the same breath: `apps/web/src/lesson/ProblemView.tsx:90-101` stubs the
`structure` answer kind with a message saying the drawing canvas "arrives with the editor route",
while `apps/web/src/beats/trace/` IS a working structure-drawing canvas with three test files. Two
halves of one feature exist and neither knows about the other.

### D16. Nothing above mastery level 1 is reachable. REPORTED, NOT FIXED.

**Severity: low today. It is a whole authored dimension nobody can see.**

`apps/web/src/App.tsx:103-107` mounts `BeatRunner` with no `level` prop, and
`apps/web/src/beats/BeatRunner.tsx:105` defaults it to 1. `apps/web/src/beats/types.ts:160` declares
which rungs each beat kind can serve and `apps/web/src/beats/types.ts:225` (`traceGuideStyle`) fades guides across L0 to
L3. None of it is reachable, because no caller ever passes a level.

### D17. A route comment says the wrong destination. REPORTED, NOT FIXED.

**Severity: low, and it is a documentation defect rather than a behaviour one. Reported per the house
rule on adjacent code rather than fixed silently.**

`apps/web/src/app/routes.ts:150-151` carries a comment saying that `#/lesson` with no node "falls
through to the trainer". It does not. It falls through to the PATH tab, at
`apps/web/src/app/routes.ts:161`, which is the same default every unrecognised hash takes, and which
Part 3's route table states correctly.

Worth its own line because of where it sits: `:150-151` is inside a range this inventory already
cites for the lesson route, so a reader who opens the citation reads the wrong sentence at the right
address. The fix is one comment, in `apps/web/src/app/routes.ts`. No behaviour changes.

### D18. Three built surfaces are unreachable, in two unrelated subsystems. REPORTED, NOT FIXED.

**Severity: medium, and it is a PATTERN rather than three accidents. One of the three gates a grader
input, which is the part that is not merely tidy-up.**

An earlier pass of this file treated the trace beat as the app's one orphan, and D5, D13 and D15 all
lean on that framing. It is wrong. There are THREE orphaned surfaces and they sit in two subsystems
that share no code:

| Orphan | File | Importers outside its own folder | What it costs |
|---|---|---|---|
| Instance 9, guided trace canvas | `apps/web/src/beats/trace/GuidedCanvas.tsx` | Zero. Only `apps/web/test/traceContent.test.ts`, `traceGeometry.test.ts`, `traceRecognise.test.ts` | The structure-drawing surface `apps/web/src/lesson/ProblemView.tsx:90-101` apologises for not having |
| Instance 10, freehand trace canvas | `apps/web/src/beats/trace/FreehandCanvas.tsx` | Zero, same evidence | The same, at the top rung, plus the product's best undo |
| Instance 16, pKa settings editor | `apps/web/src/settings/PkaSettings.tsx` | Zero for the COMPONENT. The only two hits for `PkaSettings` outside `apps/web/src/settings/` are `apps/web/src/beats/sort/SortBeatView.tsx:91` and `:126`, and both import the TYPE `PkaSettingsSnapshot` from `apps/web/src/settings/pka.ts` | A grader input a student is supposed to control |

The two subsystems are `apps/web/src/beats/trace/` and `apps/web/src/settings/`, which import nothing
from each other. So this is not one bad wiring job; it is a repeated one, and the thing to check on
any new surface is whether anything imports its component rather than whether it compiles and tests.

**The pKa one is the sharp one, and it is why this is a defect rather than an observation.** The
other two are unreachable code that grades nothing. This is unreachable code that FEEDS a grader:
`apps/web/src/beats/sort/SortBeatView.tsx:158` reads `const table = settings ?? liveSettings` from
the live `pkaSettings` store (`apps/web/src/settings/pka.ts:901`), so the pKa table `judgeSort`
(`apps/web/src/beats/sort/judge.ts:127`) marks a student against is meant to be configurable. **Today
every student is marked against the default preset**, and that is a closed argument rather than a
suspicion: the store's five mutators (`pka.ts:867`, `:875`, `:884`, `:890`, `:894`) have every one of
their call sites inside `apps/web/src/settings/PkaSettings.tsx`, and `reset` at `:894` is never
called at all. The only other importer, `SortBeatView.tsx:154-156`, takes `subscribe` and
`getSnapshot` and nothing else. Instance 16 walks the whole chain.
`apps/web/src/settings/PkaSettings.tsx:1-11` states the reason the screen exists:
a course handout prints water at 16 where a standard reference prints 15.7, and a student who sees
one number here and the other on their key stops trusting the app. That is exactly the harm the
unreachable screen was built to prevent.

Fix is a wiring decision, not a code one: give `PkaSettings` a home on the Me tab or in a settings
route, or delete it. Do not leave a tested screen with no importer, because the next audit will
rediscover it.

Consequential edits this makes to the sections above, recorded so nobody re-derives them: D5 and D13
still hold, but "the surface is orphaned" is a statement about the TRACE surface only and not about
the app having one orphan.

---

## Part 9 - What this audit did not verify

An inventory that hides its own gaps is worse than one that names them, so here they are.

**The tree moved under this audit three times.** Two commits landed from a concurrent session during
the work, `9a4f998` and `5b4f10b`, and `5b4f10b` swept the D1 fix up with unrelated work. Every line
number in this file was re-checked against the tree at `5b4f10b`, but the following files were dirty
in the working tree when this was written and their line numbers are the ones most likely to move
next: `apps/web/src/beats/BeatRunner.tsx`, `apps/web/src/beats/RecipeStrip.tsx`,
`apps/web/src/beats/beat-chrome.css`, `apps/web/src/beats/mcq/McqBeatView.tsx`,
`apps/web/src/beats/template.ts`, `apps/web/src/lesson/LessonPlayer.tsx`,
`apps/web/src/lesson/LessonVideo.tsx`, `apps/web/src/lesson/ProblemView.tsx`,
`apps/web/src/onboarding/onboarding.css`, `apps/web/src/tabs/feed/feed.css` and
`apps/web/src/critic-main.tsx`. By the time this file was finished the same session had also dirtied
`apps/web/src/beats/match/MatchBoard.tsx`, `apps/web/src/beats/sort/SortBeatView.tsx`,
`apps/web/src/beats/synthesis/SynthesisGapBeat.tsx`, `apps/web/src/beats/trace/TraceBeatView.tsx` and
`apps/web/src/lesson/ReactionStrip.tsx`, so instances 6, 7, 8 and 9, and the ordered list in Part 7b,
are the citations most exposed to the next drift. There is also one
untracked new test file, `apps/web/test/lessonTemplate.test.ts`, worth 21 tests.
`apps/web/src/lesson/LessonPlayer.tsx` and `apps/web/src/lesson/ProblemView.tsx` moved DURING the
audit, not just before it. `LessonPlayer.tsx` moved TWICE while this file was being written: it was
cited at 473 lines in the first pass, was 482 when the citations were re-checked, and is 519 on disk
now, with the component, the `gradeAttempt` call and the `locked` prop shifting each time. The
numbers in instance 11 are read from the 519-line version. Instance 11's citations are the re-checked ones and they are the numbers most worth
re-confirming before acting on them.

**Runtime, not verified for two beats.** The synthesis beat (`#/lesson/u3-sequencing`) and the match
beat (`#/lesson/u9-pka`) were reached and rendered headlessly, but the driver could not COMPLETE
them, because both need drag or typed input it does not perform. Their Continue paths are UNVERIFIED
AT RUNTIME. They are not known-broken, they are untested here. What would settle it: a driver that
performs pointer drags on `apps/web/src/beats/match/MatchBoard.tsx` and types into
`apps/web/src/beats/synthesis/SynthesisGapBeat.tsx:330-345`.

**The trace beat was never run.** Instances 9 and 10 have no route, so nothing in this audit executed
`GuidedCanvas`, `FreehandCanvas` or `recognise.ts` outside the three vitest files. Every claim about
them is a static read. That includes D5 and D13.

**The bromine radius drift was not observed on screen.** Part 6, item 2 verifies that
`apps/web/src/render/svg/MoleculeSvg.tsx:41-43` and `apps/web/src/tabs/trainer/hitLayout.ts:43-51`
differ and that `landingOnRim` receives the three-tier version. It does NOT step through a specific
`TRAINER_REACTIONS` entry and confirm a 5 px offset in a rendered frame. What would settle it: a
before-and-after capture through `apps/web/measurements/capture-parity.mjs` on the `sn2` reaction.

**The two hit testers were never shown to disagree on a real tap.** Part 6, item 6 establishes that
they differ structurally and that `packages/interaction/src/geometry/tolerance.ts` argues the shipped
shape is the wrong one. No numbers were run in either space, and the two are not in comparable units,
which is itself part of the finding rather than a hole in it. What would settle it: exporting
`./geometry/` and running `analyseContention` over the shipped layout.

**Whether the tapered arrow is a requirement is UNVERIFIED, and deliberately so.** The image at
`docs/reference/design-goals/blueberry_r9-lesson-mechanism_1788289491.png` plainly shows a tapered
arrow, and this audit opened it and confirms that. But
`docs/reference/design-goals/MANIFEST.md:3-8` says the LAYOUT is what binds in that folder and
`MANIFEST.md:24` says of this specific image that it "locks only the shell". Zero of the arrow-drawing
sites in `apps/web` is tapered, and none can be: all EIGHT `<path>` elements across the five sites,
enumerated in the table in instance 1, are a constant-width `stroke`, which cannot vary width along a
curve. A filled-outline arrow is a genuinely different construction
from everything now in the tree. **This should be settled by the owner before anyone builds one.**

**Feed is pending, not broken, and untested inside the shell.** Recorded here rather than in Part 8.
`apps/web/src/tabs/feed/FeedTab.tsx` is built, has no route, and is reachable only through
`apps/web/critic.html?s=feed` (it has no importer outside the feed folder except the harness at
`apps/web/src/critic-main.tsx:6` and `:26`, and `feed` is not a member of `TabId` at
`apps/web/src/app/routes.ts:38-52`; the full eight-hit grep is broken down in Part 3). Under `CLAUDE.md`'s
owner amendment of 2026-09-01 the bar becomes five tabs with Feed joining Path, Train, Cards and Me,
and the same passage says the placement table and the `routes.ts` change land in the R rebuild and not
before. So this is the scheduled state. The risk worth naming: because the critic harness is the only
renderer, nothing in the normal app exercises Feed, so whatever the R rebuild wires up will be the
first time Feed runs inside the shell, under the real tab bar, with real routing and a real back
button.

**Not audited at all.** `packages/validators` and its `validators.lock.json` integrity check.
`packages/curriculum/src/corpus/`. The economy ledger beyond the `EconomyEvent` union.
`apps/web/measurements/` beyond confirming which scripts open `#/trainer`. The mobile app, because
`apps/mobile` does not exist. `.claude/worktrees/ux/`, which is a stale duplicate checkout deliberately
excluded from every count and citation in this file.

**Not read end to end.** `apps/web/src/tabs/trainer/TrainerTab.tsx` (930 lines),
`apps/web/src/tabs/trainer/DrawCanvas.tsx` (1225 lines) and
`apps/web/src/beats/trace/GuidedCanvas.tsx` (480 lines) were read in the regions this inventory cites:
the state block, the grading effect, the selection resolver, the control row, the three arrow render
sites, the marker definitions and the constants. A duplication living in a region that was skipped
would not appear in Part 6.

**Where the scouts were corrected.** Three corrections are worth carrying forward, because the wrong
versions are in the scratch files. One scout reported "20 sequences"; the real count is 34, verified
by counting entries after `apps/web/src/demo/sequences.ts:5006`. One scout described `missingArrows`
(`apps/web/src/tabs/trainer/grade.ts:105`) as live; it is dead. And an earlier pass flagged
`u3-sequencing`, `u9-retro` and `u14-orthogonal` as having no authored content; all three resolve, and
their gaps live in `apps/web/src/beats/synthesis/corpus.ts` rather than in `beats.ts`.
