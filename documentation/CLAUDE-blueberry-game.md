# Blueberry

A chemistry learning platform. One web app and one Expo app over a shared core.

The product is a set of tabs, not a single game. The centre of gravity is mechanisms: interactive,
adjustable, something a student goes into and plays with, not watches.

- **Mechanism Trainer.** The organic chemistry mechanism engine, and the hardest thing here. This is
  the crown jewel and the reason the engine exists
- **The pathway.** A Duolingo shaped progress track through lessons broken down by topic, with
  unlocks along the way, mechanism cycles included, a skill rating, and a reward currency. See
  "Progression, rating, and economy" below
- **Courses.** General Chemistry I and II, Organic Chemistry I and II, and DAT and MCAT preparation
- **Reaction search.** A database a student can search by reagents or reactants when they do not
  know a reaction's name. The lookup a real student actually performs the night before an exam
- **Leaderboards.** Daily, weekly, and monthly, global. See the privacy note below
- **Onboarding quiz.** Real chemistry questions, sat before signup, that place a student into a course
- **Periodic table.** Interactive, always reachable. Since the amendment below it is a header
  TOOL rather than a tab, which is what makes "always" true inside a lesson
- **Short form video.** Roughly one minute per concept, embedded in lessons. Authored content from a
  named creator, not generated. See "Content pipeline" below
- **AI chat.** Server metered, sees the student's current state
- **Tutor messaging.** Async, moderated, shipped last. Connects tutors to customers; the logistics
  are an owner decision recorded before Phase 8 builds them

### The bar is four tabs, and the list above is a list of SURFACES, not of tabs

Owner amendment, 2026-08-28. The list above named ten things and the shell drew eight of them as
tabs in a fixed order. That is what changed; nothing in the list is cancelled by it.

> "Four tabs: Path, Train, Cards, Me. The periodic table and the reaction search are not
> destinations, they are tools a student reaches for mid problem, so they live in the header
> and are reachable from every tab and from inside a lesson. Courses collapses while there
> is one course. Leaderboards, chat and tutor messages go behind a flag until their servers
> exist. Nothing is deleted and no link 404s."

So every surface above still exists and still has a route. What it has instead of a tab is a
PLACEMENT, and `apps/web/src/app/routes.ts` is where the placements live:

| Placement | Surfaces | What it means |
|---|---|---|
| `nav` | Path, Train, Cards, Me | The four in the bar, in that order |
| `tool` | Periodic table, Reaction search | A header button on every screen and inside a lesson, opening a sheet over the current one. Still routes of their own |
| `collapsed` | Courses | Reachable from Me and from the pathway. One course does not need a browsing tab |
| `flagged` | Leaderboards, AI chat, Tutor messaging | Built, off by default, still routable. See `apps/web/src/app/flags.ts` |

Four, because mobile-ui's rule is that five is the hard limit and three or four is right, and
because tabs are destinations: a lookup a student performs mid problem is a tool, and a tool in
the bar costs a destination its place. **The periodic table's "always reachable" below is
strengthened by this, not weakened.** As a tab it was not reachable from inside a lesson at all;
as a header tool it is reachable from every screen in the product, which is what that phrase was
always asking for.

**Amended 2026-09-01, owner ruling at the calibration gate: the bar is FIVE tabs.** Feed
(daily quests, lab-mates activity) joins the bar: Path, Train, Cards, Feed, Me, in that
order. This deliberately supersedes the four-tab count above after the concern was raised
twice and reaffirmed; five is mobile-ui's hard limit and this sits exactly on it, so no
sixth ever joins without removing one. Feed's server-backed sections (friends activity)
render an honest not-open state until their servers exist, per the flagged-surface rule
below; its client-derivable sections (daily quests over the local journal) may ship live.
The placement table and `routes.ts` change land in the R rebuild, not before.
Further owner direction, 2026-09-02: TRAIN eventually leaves the bar, trending back toward
four tabs (Path, Cards, Feed, Me). Not this round: R ships five with Train, and Train's
surfaces (Puzzle Sprint, practice modes, the Daily Mechanism) must have a named home
before its tab is removed, because a surface without a destination is a deleted surface
and nothing here gets deleted. The re-homing design is a future round's brief.

Three rules travel with the amendment and are not a later round's to negotiate away:

- **Every route resolves.** A hash in a student's history lands on a page. A flagged surface
  renders an honest "not open yet" screen naming what it waits on; `#/review` lands on Cards.
- **Non-Orgo courses render greyed with an honest coming treatment**, never a dead end and never
  a broken link. `orgo_2` is the only selectable course today, and
  `apps/web/src/app/courses.ts` is the single list that says so.
- **A flag decides whether the app LINKS to a surface, never whether it renders**, and it is
  never an entitlement. Anything that gates access stays server side per the non-negotiables.

The reasoning, the superseded five-tab mapping it replaces, and the one thing still open are in
`docs/OPEN-QUESTIONS.md`, section 4 and the section at the end of that file.

## Progression, rating, and economy

Owner direction, recorded 2026-08-20. Three systems, and each has a server side rule.

**The pathway.** Lessons grouped by topic in a visible track with unlock gates, the shape Duolingo
and chess.com use. `docs/reference/competitors/orgosolver-03-skill-tree-progression.png` is a worked
example already committed. Unlockables include mechanism cycles. Unlock state is progress, so it is
enforced server side per the non-negotiables; the client renders it and never decides it.

**The rating.** Chess.com's Elo is the named inspiration. True Elo is head to head; a study app is a
student against a problem, so the honest implementation is an Elo LIKE rating where problems carry
difficulty and a student's rating moves by expected against actual outcome. It feeds the leaderboards
and placement. Computed server side, from the append only attempt history, never client supplied.

**The currencies.** Five systems, one per question a student actually asks: XP for effort, mastery
for ability, diamonds for spending, charge for pacing, streak for ritual. Full tables and the
reasoning in `docs/ECONOMY.md`. An economy is an entitlement system, so every balance lives in
Postgres behind RLS with the same column level GRANT discipline as roles: a client that can write
its own balance has a free store. Nothing buys correctness, and no wrong answer costs anything;
the retention loop ships with the mitigation set recorded in that file, amended 2026-08-27.

**Leaderboards.** Daily, weekly, monthly, global. Two rules that are not optional. Computed server
side from attempts, never client reported. And the privacy floor: assume minors, so leaderboards show
a chosen display name never a real one, opt out exists, and no profile is reachable from a
leaderboard row beyond that display name.

## Deployment, the end goal of every phase

Owner direction, recorded 2026-08-21. The phases end in a deployed product that does not crash, and
every phase is measured against that rather than against its own green suite.

- **iOS first.** The App Store is the primary target. `apps/mobile` is Expo / React Native per the
  repository layout, built and submitted through EAS. The app's display name on the home screen is
  "Blueberry" and the bundle identifier is an owner decision recorded before Phase 9 submits
- **Android second, verified in an emulator.** The Android build targets SDK 35 (the Play Store's
  current minimum target API), and the app manifest carries the label "Blueberry" so the name lands
  on the launcher. Verification is a clean install and launch in an Android emulator, not a claim
- **Web stays.** `apps/web` deploys on push through GitHub Actions, per D1, and is the surface the
  gauntlet loops judge against the bars
- **Not Flutter.** A Flutter note (3.38.9, Dart 3.10) exists in the owner's notes; it is recorded
  here so the question is settled. Flutter cannot import the TypeScript engines this repo is built
  on, so a Flutter shell would mean rewriting chem-core, interaction and curriculum in Dart.
  Reopening this needs the cost stated first
- **Crash free is measured.** Phase 9 adds crash reporting and a release checklist; a release with
  a crash in the first session on either reference device does not ship

## Monetisation

Owner direction, recorded 2026-08-20. The subscription is priced as a fraction of a real course
cost, because the comparison a student actually makes is against the roughly 1200 dollar summer
course, not against other apps. Framing, trials, and the exact fraction are owner decisions at
Phase 5's human gate, where the funnel copy is reviewed. Entitlement enforcement is server side per
the non-negotiables, and the free tier stays as specified: tutorial, intro lessons, periodic table,
5 problems a day.

## Content pipeline

Short form video, about one minute per concept, authored by a named creator (Kai), planned as
costumed, catchy, single concept explainers. The app treats these as authored lesson assets:
embedded in lessons, never autoplaying with sound, always skippable, transcript stored with the
video for accessibility and search. Video hosting and egress are a Phase 9 cost item; nothing in
the free tier depends on video being present, so lessons must stand without them.

Spectroscopy is pathway start, not a later wave. Lesson 1 of the flagship course is IR, DOU and
NMR, and structure determination is exactly 10 points on six of six real exams, so curriculum's
numeric and structure determination forms are needed the day the pathway opens. This does not move
spectroscopy into chem-core; it moves it up the schedule.

Curriculum content scope: Organic Chemistry II exists as a full breakdown from the owner, now
mined and synthesised into `docs/COURSE-OUTLINE-ORGO2.md`, which is the authoritative structure. Organic
Chemistry I is generated from the topic scope already recorded and reviewed at the same human gate
as other authored content.

**Real world application lessons, owner direction recorded 2026-08-21.** Duolingo teaches "how to
date in this language" beside the grammar; Blueberry teaches where the chemistry shows up in the
world beside the mechanism. Each topic block carries at least one application lesson, authored and
interactive rather than a reading: HOMO and LUMO, Diels Alder and conjugated systems explain why
fruit, leaves and pigments have the colours they do, and the lesson is a small game about that
(lengthen the conjugated chain, watch the absorbed wavelength move, predict the colour). These are
side and enrichment material on the pathway, never on the exam weighted spine, and they follow the
same authored problem schema so they are graded and counted like everything else.

**Learning science, owner direction recorded 2026-08-21.** Product decisions cite evidence where it
exists. The reading list lives in `docs/LEARNING-SCIENCE.md` and grows; the starting entries are the
ChemRxiv study on mechanism learning the owner supplied and the AAMC Post-MCAT Questionnaire's
2020 to 2024 self study data (flashcard use up from 67.4 to 71.4 percent, free online flashcard
programs from 37.3 to 50.2 percent), which is evidence for the Anki style retention scheduler and
for a flashcard surface the product does not yet have. A decision that contradicts a cited finding
says why.

Most of the curriculum is not mechanism chemistry. Gas laws, thermodynamics, kinetics, titration
curves, stoichiometry, and spectroscopy interpretation do not touch `chem-core` at all. They need an
authored problem and answer checking engine, which is a second system alongside the first, not an
extension of it. Do not route a limiting reactant problem through a mechanism validator.

This file is the single source of truth. Where the build prompt, a subagent instruction, or a code
comment disagrees with this file, this file wins. If you find a conflict, report it rather than
picking silently.

Read `docs/INHERITED-DECISIONS.md` before Phase 0. It records decisions already made on evidence
in the sibling repository. Reopening one costs time and, in two cases, costs a repository.

## Repository layout

```
packages/chem-core     Mechanism engine. No React, no DOM, no rendering, no RDKit. Pure TS.
packages/interaction   Pointer state machine and hit geometry. No React, no DOM. Pure TS.
packages/curriculum    Authored problems, answer checking, placement, mastery. Pure TS.
packages/feedback      Authored student facing copy for the named causes in chem-core. Pure TS.
packages/validators    Executable checks. Headless, exits nonzero on failure. Dev only.
apps/web               React 19 + Vite + Tailwind v4. New app, not the Blueberry app.
apps/mobile            Expo / React Native.
docs/reference/        Reference artifacts for critics. Read only.
```

`packages/curriculum` carries the two thirds of the syllabus that is not mechanisms. It has its own
answer checking, its own problem schema, and its own validators. It may depend on `chem-core` for a
structure question. `chem-core` must never depend on it.

`apps/web` is a **new** application in this repository. It is not the existing Blueberry app and it
does not live inside it. See `docs/INHERITED-DECISIONS.md` D1 for the two measured reasons, both of
which are about repository size and neither of which is stylistic.

Anything that imports React does not belong in `chem-core`. If you find yourself wanting to, the
abstraction is wrong. Stop and say so rather than working around it. `berryBehaviour.ts` in the
sibling repo is the proof this constraint is holdable, by the same author, on a comparable problem.

## Environment

The shell, its PowerShell gotchas, and the package manager are stated once in `../CLAUDE.md`,
which loads alongside this file. That is their only home. Two facts are Blueberry's own:

- Python 3 with RDKit is required for the validator suite. Verify before Phase 0 and report if absent
- `dist/` is in `.gitignore` from the first commit. Never commit build output

## FILL BEFORE RUNNING PHASE 0

The run does not start until these are real. A validator built on a placeholder checks nothing.

- Alchemie reference images present in `docs/reference/alchemie/` and listed in `MANIFEST.md`: yes
- Supabase project ref for the test environment: `gvixhlhzuqcjzvahozfc`
- Two seeded test account emails for the RLS attack test: `zeus.andrewliu+rlstest1@gmail.com` and `zeus.andrewliu+rlstest2@gmail.com`
- Blueberry repo available locally for import reference at: `C:\Users\zeusa\Downloads\Projects\grignard\grignard-app-source`

## Budgets

Fixed. Do not adjust one to make a check pass.

| Budget | Value |
|---|---|
| `chem-core` bundle ceiling | 150 KB gzipped, enforced by CI |
| Game route initial payload, Ketcher excluded | 400 KB gzipped |
| Ketcher route | Lazy only. Must never be reachable from the game route's initial chunk |
| Reference devices for frame rate | Pixel 6a and iPhone 12 |
| Sustained frame rate target | 60 fps during bond formation animation |
| Interaction to visual feedback | under 100 ms |
| Minimum hit target | 44 by 44 points |
| Text contrast | WCAG AA |
| Free tier | The full tutorial, the introductory lessons, the periodic table, and 5 problems per day |
| AI chat per user | 20,000 tokens per day |
| AI chat global ceiling | 25 USD per day |
| Wrong attempts resolved without a model call | 90 percent or better, at Tier 1 or Tier 2 |
| Onboarding quiz, time to a course recommendation | Under 3 minutes |

The tutorial and the introductory lessons are free and are never gated, because they are what sells
the rest. They are held to the highest quality bar in the product. A student who bounces off a free
lesson never sees a paid one.

The free tier is enforced server side. See the non-negotiable below. A client side counter is a
suggestion, not a limit.

The Ketcher rows exist because `ketcher-standalone` inlines the Indigo WASM engine at 15.5 MB, with
`ketcher-react` a further 3.1 MB. A single unguarded import puts that download in front of every
student. A CI check must assert that the game route's dependency graph does not reach it.

## The bar

Four bars. Each owns one surface, so no critic has to guess which reference applies to what.

| Surface | Bar | How a critic reaches it |
|---|---|---|
| Mechanism Trainer interaction | Alchemie's Mechanisms | The committed captures in `docs/reference/alchemie/`, by filename |
| Placement quiz, onboarding funnel, reward moment | Duolingo | The live product, in a browser |
| Curriculum breadth, mastery mapping, explanation quality | Khan Academy chemistry | The live product, in a browser |
| Interactive periodic table | ptable.com | The live site, in a browser |

Critics compare against the artifact, never against the product name and never from memory. A critic
that cannot open or reach its assigned reference reports that and stops. It does not reconstruct the
reference from a description. `docs/reference/alchemie/OBSERVATIONS.md` records structured
observations and is a supplement to the images, not a substitute for them.

**Inspirations beyond the four bars, owner invited, recorded 2026-08-20.** The bars stay the bars:
critics compare against them and nothing else. But design may draw on other named products where a
specific mechanic fits, and each one carries what to take and what to leave:

- **Anki, spaced repetition.** The single highest value borrow for DAT and MCAT prep: the pathway
  resurfaces mechanisms at expanding intervals based on the attempt history it already keeps.
  Retention is the product a test prep student is actually buying. Take the scheduler; leave the
  interface entirely
- **NYT Games, the daily ritual.** One daily mechanism, same for everyone, a small shareable result.
  A reason to open the app that is an appointment rather than an obligation, and it feeds the daily
  leaderboard. Take the ritual and the shareable moment; leave nothing, this one is clean
- **chess.com Puzzle Rush.** A timed sprint of mechanisms rising in difficulty is the natural fuel
  for leaderboards and the Elo like rating. Take the sprint format; leave the fail-out anxiety
  framing, a run ending should feel like a score, not a death
- **Brilliant.** Problem first lessons, where the lesson IS doing the thing. Already the shape of
  our tutorial rule, real mechanisms not a UI tour, so this is confirmation more than borrowing

**Duolingo is the bar for the reward moment, and since 2026-08-27 for the retention loop too.**
Take the large single number for a session result, the full bleed celebration distinct from the
working state, and the tiered badge that means something because it was scarce. The mascot is
already built and is imported, never rebuilt. See `docs/INHERITED-DECISIONS.md` D4 and
`docs/MASCOT.md`.

**Amended 2026-08-27, superseding "do not take the streak loss anxiety loop."** A streak, a charge
limiter and a decaying mastery score all ship. Owner direction: these mechanics work and the
product should use what works. The original objection is not retracted, only answered, and it
still reads true on its own terms: this is used before exams by people who are already stressed,
and a mechanic built on fear of losing a number is the wrong tool for that audience. The answer is
the mitigation set in `docs/ECONOMY.md`, namely weekly rest days, automatic freezes, an
exam-window pause on both charge and streak, charge that never prices a mistake, a capped visible
mastery dip, and permanent rank floors. Those are load bearing, not decoration. Do not strip one
without recording why in that file's Supersession section.

Interaction patterns are fair reference. Alchemie's assets, visual design, problem sets, and
authored content are theirs. Author your own content and keep the visual language recognizably
Blueberry, per `docs/DESIGN-TOKENS.md`.

Four win axes. Each has a measured half the loop runs on and a judged half that is a human gate.

| Axis | Measured, loop runs on this | Judged, human gate |
|---|---|---|
| Mobile touch ergonomics | Hit target geometry, mis-tap rate against a synthetic fingertip model at the tightest lone-pair and bond-handle spacing, time to first successful arrow, tap-only completion possible for every mechanism, pen pointer handled distinctly from touch | Whether it feels good in the hand |
| Feedback specificity when wrong | Count of distinct named failure causes, percentage of wrong attempts resolving to a named cause rather than a generic failure. The bar's observed count is one, a yellow triangle | Whether the wording teaches |
| Depth of correctness verification | Check count, fixture count, adversary findings per phase, mutation survival rate | None. Fully measurable |
| Visual modernity | Contrast ratios, type scale consistency, motion timing conformance to `docs/DESIGN-TOKENS.md` | Whether it looks current |

## Non-negotiables

**Never weaken a check to make it pass.** Stated in full in `../CLAUDE.md`. Blueberry adds one
clause: it applies to validators written in the same session, and a validator that fails repeatedly
is reported as a blocker rather than adjusted.

**Never put secrets in `VITE_` variables.** Anything prefixed `VITE_` is inlined into the public
bundle at build time. `VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY`, and
`VITE_GOOGLE_CLIENT_ID` are non-secret by design. The Supabase `sb_secret_...` key and the Anthropic
API key live server side only.

**Server side enforcement for anything that costs money or gates access.** Free tier limits, rate
limits, and token budgets are enforced in Edge Functions or RLS policies. A client side check is a
suggestion, not a limit.

**Row Level Security on every user scoped table**, written and attacked before any client code reads
from it. RLS filters rows, not columns. Any table with an entitlement or progress column also needs
a column level GRANT. See `docs/INHERITED-DECISIONS.md` D6 for the real escalation this prevented.

**Heavy imports are lazy.** Every multi-megabyte dependency sits behind `React.lazy` and `Suspense`
with a real loading state, not a blank rectangle.

## Chemistry correctness

Every mechanism step must conserve mass, formal charge, and electron count. Every state must pass
valence checks. These are not warnings. A mechanism that violates them is a bug that teaches
students wrong chemistry.

### System boundary

A state is a multiset of species, not a single molecule. Reagents, counterions, and any solvent
molecule that participates are members. Conservation is asserted over the multiset. A species not in
the multiset cannot donate or accept anything.

Spectators may be declared and excluded, but declaring a spectator is an explicit, recorded act that
a validator can see and an adversary can attack.

This exists because protonation and deprotonation are the most common steps in the corpus, and they
do not conserve charge on the substrate alone. Without this, the suite is red from the first fixture
and the loop burns five iterations on a modelling error.

### The reference detail

The engine split, the CIP decision, and the five graded chemistry fixtures (neopentyl, E2
periplanarity, SN1 stereorandomness, SN2 inversion, anti addition) are in
`docs/CHEMISTRY-CORRECTNESS.md`. **Read it before writing or changing any code in `chem-core`
or `packages/curriculum`.** It is reference rather than always-loaded rule, and it does not
override anything in this file.

Two of its rulings are load bearing often enough to restate here, and only these two:

- A student attempt is never a boolean, and a disfavoured route is never a boolean reject.
  The engine names the competing pathway, because that is the lesson
- Where RDKit and chem-core disagree, RDKit is presumed correct, except on aromaticity, which
  is a model rather than ground truth and goes to human adjudication

### Result types

A student attempt never resolves to a boolean. Four outcomes:

1. `correct` via the requested route
2. `correct_alternative_route`, correct product by a different valid mechanism, carrying the name of
   the route taken
3. `valid_not_requested`, chemically sound but a different transformation, carrying the name of what
   they actually built
4. `invalid`, chemically impossible, carrying the specific rule violated

Case 2 exists because students reach right answers by legitimate other paths, and grading that as
"not the requested transformation" is unfair and generates support mail.

The sibling repo's `checkAnswer.ts` returns `{ ok, mine, theirs }`, which is richer than a boolean
and still short of this. Treat it as a starting point, not the target.

Every one of the four carries a named cause. The bar shows a yellow triangle and nothing else. That
gap is the win condition on the feedback axis.

## Four answer shapes, not one

A question is not only a prompt. It is an answer SHAPE, and the shape decides what the student
touches on screen and what the engine compares against. There are four, and only the first is built.

| Shape | The student supplies | Graded against |
|---|---|---|
| **Mechanism** | Curved arrows across one or more steps | `chem-core`, the four result types |
| **Predict the product** | A structure | Canonical structure equivalence, Indigo on lazy routes |
| **Supply the reagents** | A reagent set, and for a synthesis an ordered sequence of them | An authored reagent answer with accepted equivalents |
| **Major product** | A choice among candidate products, and the reason it wins | The authored major product plus the ranking argument |

`StudentAttempt.built` is a `MechanismStep` today, so the engine understands exactly one of these.
That is a real gap and it is recorded here rather than discovered in Phase 3.

The chemistry the other three test is already in the cause registry: `regiochemistry_contradicts_stability`
is Markovnikov, `attacked_wrong_electrophilic_site` is 1,2 against 1,4, `skipped_favourable_rearrangement`
is the cation that shifts before it is trapped, and `route_requires_conditions_not_present` is about
reagents. What is missing is the answer shape, not the reasoning.

**Phase 2 must design the interaction layer for four input modes, not one.** That is the whole reason
this is written down now. A state machine built only for dragging arrows has to be rebuilt to accept a
structure, a reagent list, or a ranked choice, and rebuilding Phase 2 after Phase 3 depends on it is
the expensive version of this decision. Phase 3 implements the three non mechanism shapes in
`packages/curriculum`.

A synthesis question is the reagent shape read backwards: the product is given and the reagents are
the answer. It is not a fifth shape, and it must not become one, because retrosynthesis grading is the
same comparison run in the other direction.

## Every control acknowledges the press, before any work happens

Owner requirement, recorded 2026-08-20. This is the UX contract for every interactive element in
both shells, and it is what the 100 ms interaction budget means in practice.

- Every button has a pressed state that renders on pointer down, not on completion. The press itself
  is the first frame of feedback, always, even when the action then takes time.
- Nothing waits silently. If the action loads, the acknowledgement continues immediately as a loading
  affordance: the button itself enters a loading state, or the destination renders as a skeleton.
  Which one is a per-surface design choice; that there is one is not.
- A blank rectangle is never a loading state. This is already the rule for lazy loaded routes in the
  non-negotiables, and it applies at button scale too.
- The pressed state is on the interaction budget: pointer down to visible acknowledgement is part of
  the under 100 ms row, and Phase 4's headless frame measurement should include it.

The interaction package already carries the hooks for this: notices are emitted synchronously on
pointer down, so a shell has what it needs to acknowledge before any async work begins. A shell that
waits for a server round trip before rendering the press has ignored this section.

## Feedback: every step explains itself, and almost none of it costs a token

Every step in the Mechanism Trainer gives feedback and an explanation. Not only wrong steps. A
correct step says why it was right, because a student who guesses correctly has learned nothing.

Three tiers, in this order. A tier is only reached when the one above it has nothing to say.

Refinement, orchestrator ruling at Phase 3 after the curriculum builder escalated it: within the
two free tiers, SPECIFICITY wins over tier number. A notation cause where the chemistry was right,
sig figs, units, ambiguity, pre-empts distractor matching, because telling a student their correct
chemistry matched a wrong answer distractor would be false. But a generic diagnostic cause does not
pre-empt a specific authored distractor: the distractor's explanation was written for the exact
mistake, and the feedback axis is won on specificity. So the order is notation causes, then
authored distractors, then diagnostic causes, then the logged tail. Read literally, tier one
pre-empting everything would let the vaguest sentence beat the most specific one, which inverts the
axis this table exists to win.

**The voice, owner direction recorded 2026-08-20.** Accuracy was never the problem; tone was. The
copy must uplift and encourage, never condescend. The reader is stressed, and the product is meant to
be one they want to return to, so the voice is a coach who is on the student's side: name what
happened plainly, treat the mistake as the normal step it is, and make the next action feel within
reach. Concretely: no scolding constructions, no "you should have", no rhetorical questions, no
faux patience. Warmth is allowed and wanted; condescension is the failure mode, and the test for it
is whether the sentence would annoy a smart friend. Encouragement must be specific to what the
student actually did, because generic praise reads as hollow and specific praise reads as seen.
Chemistry claims stay exactly as accurate as they are.

**Tier 1, the named cause.** `chem-core` resolves every attempt to a named cause in a closed union.
The count is whatever `causeCount()` returns and is deliberately not written here, because a literal
in this file goes stale the first time a builder adds a cause, and one already did. Each cause
carries authored teaching copy in `packages/feedback`: what the student did, why it is wrong, and
what to look at instead. Written once, reviewed once, served forever. Zero tokens.

The registry of cause ids lives in `chem-core`, because the engine has to resolve an attempt whether
or not any copy is loaded. Only the student facing copy lives in `packages/feedback`. `chem-core`
also carries a short `summary` and `teaches` on each cause definition: those are engine facing, sized
for a log line and a validator report, and they are never what a student reads. If the two ever
disagree on chemistry, that is a bug in one of them and not a style difference.

**Tier 2, the anticipated distractor.** Each authored problem carries a list of predicted wrong
answers with their own authored explanation. These are the specific mistakes an instructor knows
students make on that exact problem: attacking the wrong carbonyl face, pushing an arrow from an
electron sink, protonating the wrong oxygen. Matching is on mechanism state, not on prose. Zero
tokens.

**Tier 3, AI chat.** Only for an attempt no cause and no distractor matched. This is the tail, and
it should be a small one. Every Tier 3 hit is logged with the state that produced it, because a
recurring Tier 3 is a missing Tier 2 that should be authored and never generated again.

The measured consequence, and it is a hard requirement: the percentage of wrong attempts resolved at
Tier 1 or Tier 2 is reported on every validator run. A build where that number falls is a build that
got more expensive and less consistent at the same time. The AI budget in the Budgets table is a
ceiling on the tail, not a running cost of normal use.

A generated explanation is never cached and replayed as though it were authored. Authored copy is
reviewed by a person; generated copy is not, and quietly promoting one to the other is how a wrong
explanation becomes permanent.

## Loop discipline

Loop until the stated numeric exit condition is met, or five iterations, whichever comes first. On
the fifth failure, stop and write a report: what failed, what was tried, what you believe the
blocker is.

Never loop on subjective quality. There is no exit condition for "looks good" and the loop will not
terminate. Visual and pacing judgment are human review gates.

Run the full builder / validator / adversary loop on Phases 0, 1, 2, 3, 6, 7, and 8, which are the
correctness critical and security critical ones. Use single pass builders on Phases 4, 5, and 9, and
stop for human review. Rendering feel, game pacing, and onboarding copy are judgment calls, and a
critic will loop on them indefinitely while producing nothing you would not have decided faster
yourself.

Phase 5 carries the onboarding funnel and the free lessons, which are the highest leverage copy in
the product. That makes it a human gate, not a loop. There is no exit condition for "this lesson
converts."

**Owner ruling, 2026-08-21, after reviewing the Phase 5 build:** four surfaces loop after all, on a
blind comparison against a committed capture rather than on taste: the trainer's arrow drawing and
feedback against the Alchemie captures, and the pathway, leaderboard tabs and language picker against
`docs/reference/competitors/inspirations/`. The exit is a fresh-context critic picking ours blind,
and the five iteration cap still applies per piece. The onboarding copy stays a human gate.

## Suite integrity

`packages/validators` carries a committed `validators.lock.json` holding a hash of every file in the
package. Every validator run recomputes and compares first. On mismatch the validator reports
MODIFIED with the changed file list and refuses to report results.

Regenerating the lock is a separate commit, made deliberately, never in the same commit as a fix to
something the suite was failing.

## Git discipline

One branch per phase. Commit before and after every adversary run so its diff is auditable. No force
push. The orchestrator rejects any adversary run whose diff touches a path outside
`packages/validators/fixtures/` and `packages/validators/tests/`.

## Communication

How to work with the author, including the React pattern rule and the no em dashes rule, is stated
once in `../CLAUDE.md`. Two additions belong to this repository:

- Report problems noticed in adjacent code rather than silently fixing them
- State assumptions explicitly rather than picking silently
