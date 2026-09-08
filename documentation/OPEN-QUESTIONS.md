# Open questions on the new framework

**Four resolved by the owner, 2026-08-25.** Decisions recorded at the head of each item; the
reasoning below is kept because it is why the decision was a decision.

| # | Question | Ruling |
|---|---|---|
| 1 | Arrow primitive | **BOTH.** Drag a lit electron sphere on a tether in flight; on release the committed step renders as a curved arrow with a head |
| 3 | "Phase at SP" | **STANDBY.** Owner is not sure what it referred to either. Not acted on, not dropped |
| 4 | Five tabs | **YES**, as mapped below |
| 9 | Gauntlet loop | **Round 8 is a blind A/B** of the new hybrid against the current arrow-only trainer |

Questions 2, 5, 6, 7, 8 and 10 are still open. 10 carries a written answer awaiting confirmation.

Section 13: "Ask me clarifying questions on anything in this document that has two plausible
readings. Do not guess and build." These are the items where two readings would produce materially
different work. Recorded 2026-08-25.

Ordered by how much they block. 1 through 4 block the build order's first item.

---

## 1. The arrow primitive. RESOLVED: option (c), both.

Section 5 says "Draw the arrows yourself" and section 6 sets Alchemie as the bar for manipulation.
But **Alchemie does not draw a curved arrow with an arrowhead.** Across all 29 mechanism captures,
what the student drags is a **glowing white sphere on a dashed tether** — the electrons themselves —
from the source to the target (`IMG_1640`, `IMG_1645`). There is no arrowhead anywhere in the folder.

We have spent seven gauntlet rounds refining a curved dashed arrow with a head, and the last four
verdicts were all about the head: its size, where it lands, which way it points, whether it reads as
electrons flowing the wrong way. **Every one of those defects is a property of drawing an arrowhead
at all.** Alchemie does not have them because it does not draw one.

Which is it:

- **(a) Alchemie's primitive.** Drag a lit electron sphere on a tether. Solves four open trainer
  defects by deletion. Costs: it is not what a textbook or an exam shows, so a student practises a
  gesture that does not transfer to paper.
- **(b) Our curved arrow.** Matches the exam and the textbook, which is what the student is actually
  graded on in CHEM 241. Costs: rounds 8, 9, 10 of the same loop.
- **(c) Both.** Drag the electrons; on release, the committed step renders as a proper curved arrow.
  Manipulation feels like Alchemie, the record looks like an exam. This is my recommendation and it
  is more work than either alone.

## 2. Matching: connectors or columns? BLOCKING beat design.

You saved both, and captioned one of them yourself: `matching - not ideal but okay` is the anatomy
app's version with **drawn bezier connectors** between labels and colour dots. `pair left and right
side` is Duolingo's, a **plain two-column card grid with no connectors**, tap one then tap the other.

"Not ideal but okay" reads as a reservation you did not spell out. My own concern is different from
what I'd guess yours is: connectors need a drag, and section 9 wants heavy gesture use elsewhere,
so spending drag on matching competes with the arrow gesture in the same lesson. Columns are
tap-only, which also satisfies CLAUDE.md's "tap-only completion possible for every mechanism".

Which, and if connectors, what was "not ideal" about it?

## 3. What is "Phase at SP"? RESOLVED: standby.

**Owner ruling: not sure either, keep it on standby.** Nothing is removed and nothing is built
around it. Left here so it is not silently dropped; if it surfaces in the Grignard app or on a
periodic table cell later, this row is where it gets closed.

Section 12: "No 'Phase at SP'." It appears nowhere in the codebase, nowhere in `CLAUDE.md`, and
nowhere in the 88 reference images. I cannot remove it without knowing what it is. My two guesses:

- a label somewhere in the shipped Grignard flashcard app, not this one
- "phase" as in state-of-matter, at "SP" = standard pressure, in a gen-chem context

Neither is confident. What is it, and where did you see it?

## 4. Five tabs, replacing eight? RESOLVED: yes, as mapped. SUPERSEDED 2026-08-28 by "Four tabs, and two of them were never tabs" at the end of this file.

"Periodic Table is good, but it is not a main attraction. We will somehow wiggle it into a button."
The anatomy app you saved runs **five**: Learn, Sandbox, Community, Shop, Profile. We currently run
eight (Trainer, Pathway, Courses, Search, Leaderboards, Periodic, Chat, Messages).

Proposed mapping, please confirm or correct:

| New tab | Absorbs |
|---|---|
| **Learn** | Pathway. The trainer stops being a tab and becomes what a lesson node opens |
| **Sandbox** | The free-tier molecule builder (§6). Periodic table lives here, plus the calculator and the notepad |
| **Community** | Leaderboards, friends, the feed |
| **Shop** | Currency, subscription, streak protection |
| **Profile** | Settings, mastery, appearance, the review queue entry point |
| *(not a tab)* | Reaction search + Ask AI, consolidated into the swipe-down search surface (§9) |
| *(not a tab)* | Tutor messages, reached from Profile |

The periodic table then also appears as a summoned sheet inside a lesson when a beat needs it.

## 5. Currency: cash or diamonds?

`CLAUDE.md` says diamonds, and it is the file that wins on conflict. Section 10 says "Currency is
cash, not diamonds." One of the two has to be edited and I will not pick silently. If cash wins I
will edit `CLAUDE.md` in the same turn, per the routers rule.

Related: the anatomy app and Duolingo both show **two** currencies (gems + energy). **Answered
2026-08-27**, and more broadly than this question asked: there are five systems, not two. Diamonds
are the spendable one, XP and Mastery are non-purchasable, Charge is the energy-style limiter, and
the streak is protectable but not buyable. `docs/ECONOMY.md` has the tables. The naming half of this
question, diamonds versus cash, resolved to diamonds.

## 6. Free tier: daily counter, or permanent free unit?

`CLAUDE.md` fixes the free tier as "the full tutorial, the introductory lessons, the periodic table,
and 5 problems per day." But you saved `card carousel and AI generated with gradient overlay and
free course` approvingly, and its model is different and better: **"Pick your free system. You can
unlock more anytime — your free choice is permanent."**

A permanent free unit converts better than a daily counter, because the student finishes something
instead of being interrupted mid-thought five problems in, and it gives the paywall a concrete
comparison. It is also a change to a Budgets-table row, which I will not touch without you saying so.

## 7. Does negative XP subtract?

Section 3: "Time limit challenge for negative XP. Opt in, not default."

Still open, and the 2026-08-27 amendment does not settle it. That amendment allows a streak, a
charge limiter and a decaying mastery score, but `docs/ECONOMY.md` keeps XP as the one number that
moves up only, forever. Negative XP would break that, so the question stands on its own terms.

If a timed run can drive the XP total DOWN, a student can end a study session worse off than they
started, which is the punishment mechanic in a different costume. Two readings:

- **(a)** It really subtracts from the lifetime total. Opt-in makes it fair.
- **(b)** "Negative XP" means the run's own score can go negative and the floor on the session is
  zero, so a bad run earns nothing but never takes anything away.

I would build (b) unless told otherwise.

## 8. Blue primary versus the committed purple.

`docs/DESIGN-TOKENS.md` makes purple the led colour, cream the ground, and Phase 4 and 5 shipped
against it; the gauntlet's pathway win was judged on it. Section 7 makes **blue** the trust colour
carrying primary actions, with purple demoted to an accent.

`apps/web/src/tokens.css` is written the new way. Confirm, and I will rewrite `DESIGN-TOKENS.md` to
match rather than leaving two docs disagreeing. The mascot stays blueberry-coloured either way.

## 9. Build order versus the running gauntlet loop. RESOLVED: option (c).

Your build order puts the mechanism engine first. The trainer gauntlet loop is at round 7 of 5-per-piece
(the cap is per piece and it has been reset twice by new defects). Question 1 above may invalidate
rounds 1 through 7 wholesale.

Do I: **(a)** stop the trainer loop until question 1 is answered, **(b)** run one more round on the
current primitive while you decide, or **(c)** run round 8 as an A/B of the two primitives and let
a blind critic pick?

I would do (c). It turns the open question into a measurement instead of a preference.

## 10. Horizontal tab swipes. Answering your own question before implementing.

You asked this to be answered in writing first, so here it is.

**It would get annoying, and Duolingo left it out on purpose.** Three reasons, in order of weight:

1. **It collides with content that scrolls horizontally.** The path scrolls vertically but the
   leaderboard tier strip, the card carousel, and our own molecule canvas all pan horizontally. On a
   phone the gesture recogniser has to guess, and it guesses wrong often enough that a student
   drawing an arrow near the screen edge would sometimes change tabs mid-mechanism. That is
   unacceptable on the one surface the whole product is built around.
2. **Tabs are destinations, not a sequence.** Swipe implies adjacency and order. Learn is not "next
   to" Shop in any sense a student holds in their head, so the gesture teaches a false model and
   gives no way to reach a non-adjacent tab without passing through the ones between.
3. **It costs the back gesture.** iOS uses edge-swipe for back. A tab swipe either fights it or has
   to start further in, which makes it undiscoverable, which makes it decoration.

Duolingo's own core-tabs write-up frames the tab bar as fixed, always-visible orientation. A gesture
that moves it undermines the thing it is for.

**Recommendation: no horizontal tab swipes.** Spend the gesture budget where it does not compete:
bottom sheets, long-hold context actions, swipe-down search. All three are in section 9 and none of
them collides with the canvas.

---

## Not a question: the three candidate "getting better at the app" mechanics

Section 10 asks for three candidates with tradeoffs before building one. It must be legible at a
glance, hard to game, and reflect genuine improvement in speed and accuracy **on material already
seen**.

### Candidate A: Fluency, a per-concept decay-weighted speed score

For each concept, hold the median time-to-correct on that concept's beats over the last N attempts,
normalised against the authored par time. Fluency is the share of your seen concepts currently
answered at or under par. Shown as one number, 0 to 100, on the profile.

- **Legible:** one number, and "82% fluent" means something without a manual.
- **Hard to game:** grinding easy beats does not move it, because it only counts concepts you have
  already been shown, and par is per-beat and authored.
- **Genuine:** speed on seen material is exactly the thing that improves with practice, and it is
  the thing an exam measures.
- **Against it:** rewards speed, which can push guessing on multiple choice. Needs an accuracy gate
  (a wrong answer contributes nothing regardless of speed) or it is harmful.
- **Cost:** cheap. Everything needed is already in `Attempt`.

### Candidate B: First-try rate on returning material

Of the review items resurfacing this week, what fraction did you get right on the first attempt with
no hint? One number, trending.

- **Legible:** "You are getting 7 of 10 returning mechanisms first try, up from 5."
- **Hard to game:** you do not choose what returns; the scheduler does. Gaming means learning.
- **Genuine:** this is retention, which is what a test-prep student is actually buying, and it is
  the metric the Anki borrow in `CLAUDE.md` is aimed at.
- **Against it:** slow to move. A student practising hard sees nothing change for days, which is the
  opposite of the reward loop this mechanic is supposed to feed.
- **Cost:** cheap, and it needs the review scheduler, which is being built anyway.

### Candidate C: Depth, the hardest thing you can currently do

Track the highest difficulty tier at which you are still correct at least 70 percent of the time,
per track. Rendered as a small labelled rung on the profile, one per track: Concepts at tier 4,
Mechanisms at tier 3, Synthesis at tier 2.

- **Legible:** very. It is a level, and it is per-track so it shows you where you are lopsided.
- **Hard to game:** you cannot raise it without succeeding on harder problems, and it falls if you
  stop.
- **Genuine:** it measures capability rather than volume, and it maps directly onto "am I ready for
  the exam".
- **Against it:** needs a calibrated difficulty on every beat. We have Elo-like problem difficulty
  planned, but it is not authored yet, so this one cannot ship until the rating system does. It is
  also the one most likely to feel like a punishment when it drops.
- **Cost:** highest of the three. Depends on the rating system landing first.

**My recommendation: A now, C later, and not B.** A is buildable today from data we already collect,
moves fast enough to feel responsive, and with the accuracy gate it is honest. C is the better
long-term answer and should replace or join it once problem difficulty is calibrated. B is real but
too slow to function as the glanceable signal this is asking for, and it is already partly visible
in the review queue's own counters.

## Pathway backdrop theme

Owner ruling, 2026-08-26, after reviewing the three generated options
(`C:\Users\zeusa\generations\blueberry_pathway-theme-{a,b,c}_*.png`):

- **B (twilight lanterns) is the current favourite.** A (sunlit meadow) is "almost there";
  C (cloud-sea) is "a little too much".
- **Not final.** More options get generated and the pick is discussed with the team before any
  backdrop ships. Do not wire a backdrop into PathwayTab until that happens.
- The two unpicked themes remain candidates for the diamond store per `docs/ECONOMY.md`.

## Motion stack for the web MVP

Owner ruling, 2026-08-28. **Lenis and GSAP ScrollTrigger are approved for `apps/web`.**

- **Lenis**, about 3 KB gzipped, for momentum smooth scroll.
- **GSAP ScrollTrigger**, about 30 KB gzipped, for scroll timelines and pinning.
- **Three.js and any WebGL are NOT approved** and are refused by default. The depth-map
  2.5D effect the reference site uses costs roughly 600 KB, which is more than three
  times the entire current game route payload, and the effect a viewer actually reads
  is the `clip-path` reveal sitting on top of it, which is free. See the motion brief
  in the Blueberry Compendium artifact for the full priced table.
- Rive stays deferred. It is the right tool if Bloom ever outgrows CSS keyframes, and
  it is not needed for the pathway.

**The budget still binds.** The game route ceiling is 400 KB gzipped and it sits at
183.6 KB. Both libraries together are about 33 KB, so the expected landing point is
roughly 217 KB. Report the measured delta when they land; approval is for these two
libraries at these sizes, not for a general motion budget.

Everything else in the motion brief (layered parallax, clip-path lens reveals, SVG
mask panels, per-letter stagger, stroke-dashoffset line draws, per-unit palette swaps,
the loader-to-page wipe) is transform, opacity, clip-path or mask, and needs no library
at all. Gate the whole motion layer behind `prefers-reduced-motion` with a real static
frame as the fallback, never an empty box.

## Pathway backdrop theme, reopened

Owner direction, 2026-08-28, superseding the 2026-08-26 ruling above.

The pathway descends rather than ascends, and the backdrop is designed to match the
flow of the lessons, so a backdrop IS now wired into `PathwayTab`. The motif is the
reaction coordinate: units are wells, gate quizzes are the humps between them, and a
multi-step unit carries a shallow local minimum for its intermediate. Clouds stay, and
small chemistry props (an Erlenmeyer on a far shelf, a condenser silhouette) stay, kept
rare and small. Studio Ghibli is explicitly NOT a requirement.

**Art sourcing:** regeneration restarts from `blueberry_pathway-theme-{a,b,c}`. The
later set, `theme-d` through `theme-h`, chased the Ghibli reference harder and moved
away from what the owner wanted; it is not a starting point. The two approved card
concepts in `generations/` are the tone reference.

## Four tabs, and two of them were never tabs

Owner direction, 2026-08-28, superseding section 4 above and the eight-tab list in `CLAUDE.md`.

> "Four tabs: Path, Train, Cards, Me. The periodic table and the reaction search are not
> destinations, they are tools a student reaches for mid problem, so they live in the header
> and are reachable from every tab and from inside a lesson. Courses collapses while there
> is one course. Leaderboards, chat and tutor messages go behind a flag until their servers
> exist. Nothing is deleted and no link 404s."

What changed against section 4, and why the five-tab mapping there is not what shipped:

- **Sandbox is gone as a tab.** Section 4 parked the periodic table inside a Sandbox tab. The
  amendment goes further and says the table is not a destination at all. It is now a header
  button that opens a sheet over whatever is on screen, which is the one thing a tab could
  never do: a tab unmounts the lesson a student is three steps into. `CLAUDE.md`'s "interactive,
  always reachable" is better served by the header than it was by the tab, not worse.
- **Community, Shop and Profile collapse into Me.** Leaderboards is flagged off until it is
  computed server side, the store has nothing to sell before Phase 6 prices it, and what is
  left over is settings and identity, which is one screen and not three.
- **Cards is the new one.** The review deck was `#/review`, linked from the Charge sheet and
  nothing else. `CLAUDE.md`'s learning science section already cites the AAMC's 2020 to 2024
  flashcard numbers as evidence for both the scheduler and "a flashcard surface the product
  does not yet have"; a daily habit measurably held by most examinees is a destination.

Rules the amendment carries that are not negotiable in a later round:

1. **Every route still resolves.** A hash a student has in their history lands on a page. The
   three flagged surfaces render an honest "not open yet" screen naming what they are waiting
   on, and `#/review` lands on the Cards tab it became. `apps/web/test/shellRoutes.test.ts`
   asserts this rather than trusting it.
2. **Non-Orgo courses are greyed, never removed and never broken.** `orgo_2` is the one open
   course; the other five render a card that says what it is waiting on, and their routes
   resolve to the same honest screen. `apps/web/src/app/courses.ts` is the one list.
3. **A flag decides whether the app LINKS to a surface, never whether it renders.** It is not
   an entitlement, and it never becomes one: anything that gates access is server side per
   `CLAUDE.md`'s non-negotiables.

Still open, and reported rather than decided here: the placement quiz can still recommend a
course that is not authored yet, because the recommender scores across all six. Today the
courses surface catches that honestly and offers Organic Chemistry II. Whether the recommender
itself should be restricted to open courses is an onboarding question, and onboarding copy is
a human gate.
