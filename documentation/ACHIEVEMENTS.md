# Achievements

Owner direction recorded 2026-09-24: "design an entire achievement system and draft it out
taking these successful games as an example." This file is that design. It is written so it
can be built without a further decision; the few things that are the owner's to settle are
collected in one list at the end rather than scattered as hedges.

Two rules from `ECONOMY.md` bind every line here and are restated so nothing below can drift:

1. **Server side or it does not exist.** An achievement is computed from the append-only
   journal, never client-reported. Until Phase 6 the client shows a local rendering cache,
   exactly like `src/game/app/progress.ts` does for every other number.
2. **Nothing buys correctness.** No achievement can be bought, and no achievement is reached
   by spending. Diamonds do not enter this file.

And one rule of its own, which is the whole design in a sentence:

3. **An achievement pays nothing and never moves down.** It is a dated record of a specific
   act, not a sixth currency. The reasoning is in the next section, and it is load bearing.

## The question an achievement answers

`ECONOMY.md` gives each of the five systems exactly one question a student is actually
asking, and rules that two numbers answering the same question means one should be cut. An
achievement answers a sixth question none of the five do:

| System | Answers |
|---|---|
| XP | How much work have I put in? |
| Mastery | How much do I actually know? |
| Streak | Am I still the kind of person who does this? |
| **Achievements** | **What have I done that I can point to?** |

The difference from XP is that XP is a sum and an achievement is a name. "1,240 XP" says how
much; "Cleared Unit 3, Electrophilic Aromatic Substitution, on 12 October" says what. The
difference from Mastery is the direction of the claim: Mastery asserts an ability the model
has evidence for, and an achievement asserts only that an act happened, which the journal
proves. That distinction is the honesty rule of this file and it is repeated where it bites.

Because the question is different, three things follow that make this system unlike
Duolingo's in mechanism while looking like it on screen:

**It pays nothing.** `ECONOMY.md` already pays every act this file records: first clears,
flawless bonuses, 75 diamonds at each streak milestone, 125 to 250 at each rank. Paying a
second time for the same act is the argument the Supersession section already made against
the Return bonus: it "pays a student twice for the same behaviour and makes both numbers
meaningless." A badge that pays is a farm target. A badge that records is a record.

**It never moves down.** Mastery decays and the streak can break, each with its recorded
mitigations. An achievement has neither, so it needs none: a rung earned is earned, a record
keeps its date. This is the rank-floor rule ("once a Mechanist, always a Mechanist")
generalised to everything on the wall, and it is why the wall is the one surface in the
product a stressed student can open before an exam and find nothing that has got worse.

**It lives on Me, not in the header.** `hudModel.ts` keeps Mastery out of the header because
"never show Mastery inside a node." The same applies here for a milder reason: an
achievement is a thing you look back at, and the header is for what is happening now.

**It absorbs three promises `ECONOMY.md` already makes and gives them a home.** That file
promises a "badge at each" streak milestone, a "unit badge" on a unit clear, and a "Badge"
per Mastery rank, and no surface holds any of them today. They are achievements in this
system. Nothing new is invented for them; they stop being three separate promises with no
screen.

## What the bar does, from the captures

Critics compare against artifacts, never against memory. The artifacts for this surface:

- `blueberry_game/docs/reference/competitors/mobbin/Duolingo ios Jan 2026/Duolingo ios Jan 2026 474.png`,
  `475.png`, `476.png`: the Achievements wall, the exact screens `SCORE.md` names.
- `blueberry_game/docs/reference/competitors/duolingo-live/2026-08-27-run2/p74` to `p77`:
  the lesson-complete moment, four frames.
- The scratchpad bar folder's `duolingo/web-practice-hub-quests-league.webp` and
  `duolingo/NOTES.md`: the quests rail and the analysis of what sells.
- `blueberry_game/docs/reference/competitors/orgosolver-03-skill-tree-progression.png`: the
  direct competitor, which has a numbered skill tree with Review nodes and no achievements
  at all. That absence is a finding: nothing in the category does this well yet.

What the wall is, read off 474 to 476:

- **Personal Records** is the top row: two or three cards, each a mark, a big number and a
  date ("Longest Streak, 845, Dec 8, 2025", "Most XP, 2225, Dec 24, 2023"). The date is what
  makes a record a record.
- **Awards** is a three-across grid of character badges. Each earned badge prints the
  CURRENT rung's threshold on the badge itself ("750" on Mistake Mechanic) with the ladder
  position under the name ("9 of 10"). An unearned badge is a grey silhouette carrying the
  FIRST rung's threshold ("100" under XP Olympian at zero). A red NEW pill sits on a badge
  not yet looked at.
- The ladders run five to ten rungs: XP Olympian to 30,000 XP at 10 of 10, Mistake Mechanic
  to 750 at 9 of 10, Perfect Week 8 of 9, Flawless Finisher 5 of 5, Speed Racer 4 of 5.
  Early Riser and Sleepwalker reward the hour of day; Cheerleader and Social Butterfly reward
  follows and high-fives; League MVP rewards the league; Legend and Rarest Diamond sit next
  to paid features.
- The web rail (`web-practice-hub-quests-league.webp`) draws Daily Quests as chest-capped
  bars beside a Bronze League card. The Feed tab already ships the honest half of that: three
  quests derived from the local journal, chests as drawn state, per `feedModel.ts`.

What to take, and each is taken below: the dated record; the threshold printed on the badge,
so the badge says what was done rather than that something was; the silhouette carrying the
next threshold, which is the path's "grayed-out future content is itself a sell" applied to
the wall; one grid, three across, no category headings competing with the tiles; a plain
"n of m" beside every ladder; and Mistake Mechanic, the one award on that wall that rewards
learning from error rather than volume, which becomes our Second try.

What to leave is a section of its own, Refusals, because the reasons matter more than the
list.

## The shape

One definition table, one pure derivation, one new receipt field. Nothing stored.

- **`packages/economy/src/achievements.ts`**, beside `rules.ts`: the definitions as frozen
  constants (id, group, kind, thresholds, copy), and
  `deriveAchievements(journal, now, options)`. Pure, no `Date.now`, takes the universe the
  same way `deriveEconomy` does, because two awards read Mastery. Same test discipline as
  the rest of the package: fixed `now`, tables asserted against this file.
- **`EconomySnapshot` gains `achievements`**: for every definition, `{ id, rung, count,
  next, earnedAt }` where `rung` is 0 to 3 (or 0 to 1 for a one-off), `count` is the
  counter's current value, `next` is the threshold of the next rung or null at the top, and
  `earnedAt` is the ISO instant of each rung, read off the event that crossed it. Records are
  `{ id, value, at }`.
- **`Receipt` gains `achievements: readonly { id, rung }[]`**: the rungs this one event
  crossed, computed by `receiptFor` as a before/after diff, exactly how it already produces
  the "New rank" and milestone lines. The client animates that list and computes nothing.
- **Phase 6** runs the same fold over the server's attempt history. A rung the server
  cannot reproduce from the journal is an incident, the same clause as every balance.

Two kinds of thing on the wall:

- **A record** is a dated maximum. It has no rungs. There are three and there will not be a
  fourth without one leaving, because a row of records is a row of hero numbers and the
  round 2 ruling on hierarchy applies to a screen as much as to a moment.
- **An award** is one-off or a three-rung ladder. Which one is not a taste call; the next
  section gives the rule.

### Tiering, and why three rungs is honest and ten is padding

An award **tiers only when the counter is cumulative and every rung is the same act done
again.** Thirty flawless clears is ten flawless clears three times over, so Flawless is a
ladder. A unit is cleared once, a boss once, a rank reached once, so each is a one-off. A
one-off given rungs would be counting something else and calling it the same thing, which
is how Duolingo's Perfect Week reaches "8 of 9".

**Three rungs, not ten.** The thresholds are set against the course, not against a curve:
Organic Chemistry II in `src/game/demo/pathwayMap.ts` has 15 units, 90 playable nodes (19
beats, 29 reactions, 41 sequences, 1 resonance), 10 checkpoint gates and 1 boss. Rung III of
every ladder is reachable inside that one course by a student who does the whole thing
well, without a single replay, because replays earn no first clear and this file counts
nothing a replay produces. A ladder whose top needs more than the course contains is a
ladder built for grinding, and "XP Olympian, 30,000" is the shape of that. The ratio between
rungs is roughly 1 : 5 : 20, wide enough that each rung is news.

**No bronze, silver, gold.** Two reasons. Metal colours would make colour the only carrier
of the rung, which the accessibility rule forbids, and metals rank a student against an
imagined podium when every ladder here is against themselves. The rung is shown as the
threshold number printed on the badge (the bar's own convention) plus a row of three pips,
and it is said in words in the caption and the accessible name.

**Thresholds retune from real earn rates, not from this table.** Same clause as
`ECONOMY.md`'s flat-rate constraint: instrument the first weeks of real use and move the
numbers; keep the ratios and the one-course rule.

## The list

Every trigger below is a fold over the journal in `packages/economy/src/journal.ts`. The
"Counter" column says exactly what is counted; "Source" says whether it exists in
`derive.ts` today or is new work, so nothing here can quietly assume a number the engine
does not produce. "Announced by" is the screen that plays it, and each is announced by
exactly one.

### Records (the top row, dated)

| Record | Value | Counter | Source |
|---|---|---|---|
| Longest streak | days | `streak.best` | Exists |
| Most XP in a day | XP | max over local days of XP awarded that day, with the day | **New** field `xp.bestDay: { xp, date }`; `derive.ts` already folds XP per local day for `xp.today` |
| Longest run right | correct answers | longest run of consecutive `attempt` events with `correct: true` across the whole journal, in timestamp order | **New** field `attempts.bestCorrectRun: { run, at }` |

Records show the value, the name and the date it was set. The third one is the only record
a wrong answer touches, and it touches it by ending a run, never by subtracting: the record
already set stays. It is not a speed measure and it does not care how long the run took.

### The course (one-off)

| Award | Copy at award | Trigger | Source | Announced by |
|---|---|---|---|---|
| First clear | "Your first node, cleared." | first `node_cleared` of any kind | `firstClears` | Achievement moment |
| Unit N cleared, 15 of them | "Unit 3 cleared. Electrophilic Aromatic Substitution, end to end." | `unit_cleared` for that `unitId`; title from `PATHWAY_UNITS` | Exists | Achievement moment |
| The boss | "Multistep synthesis. Five units, one route." | `boss_cleared` | Exists | Achievement moment |
| Course complete | "Every unit of Organic Chemistry II, cleared." | `unit_cleared` present for every unit in `PATHWAY_UNITS` | Exists | Achievement moment |
| First resonance | "You found a resonance form the problem did not ask for." | first `resonance_found` | Exists | Achievement moment |

First resonance is a one-off and not a ladder on purpose: the map has one resonance playable
today. **No rung ships that the content cannot reach.** When more resonance nodes are
authored it becomes a 1 / 10 / 30 ladder, and the rule in `rules.ts` for the Mastery
denominator is the precedent: the floor "stops binding by itself" when content grows,
and nothing else has to change.

Unit badges take the unit's own title, and the copy at award says the unit's name in full,
because "Unit 3" is a number and "Electrophilic Aromatic Substitution" is what the student
will recognise on an exam paper.

### Craft (ladders on correctness quality)

| Award | Rungs | Copy at rung III | Counter | Source | Announced by |
|---|---|---|---|---|---|
| Flawless | 1 / 10 / 30 | "30 nodes cleared without a wrong arrow." | `node_cleared` events that were first clears with `flawless: true` | Exists (`flawless`, `firstClears`) | Achievement moment |
| Flawless checkpoint | 1 / 3 / 6 | "6 checkpoint quizzes, nothing wrong." | `quiz_passed` with `flawless: true` | Exists | Achievement moment |
| One sitting | 1 / 5 / 15 | "15 multi-step mechanisms, start to finish in one go." | first-clear `node_cleared` with `stepsInOneSitting >= 3` | Exists | Achievement moment |
| Checkpoints | 1 / 5 / 10 | "All 10 checkpoints passed." | `quiz_passed`, distinct `unitId` | Exists | Achievement moment |

Flawless is the ladder most likely to be misread, so the rule is written here: it rewards
correctness, not caution. The Flawless bonus is already "visible before starting, never
shamed after" (`ECONOMY.md`), a wrong arrow costs nothing, and this ladder is never shown
inside a node, so there is no in-problem pressure to protect a run. 30 of 90 playable nodes
is a third of the course flawless, which is strong work and not perfection.

### Retention (ladders)

| Award | Rungs | Copy at rung III | Counter | Source | Announced by |
|---|---|---|---|---|---|
| Review | 5 / 25 / 100 | "100 review drills cleared." | `node_cleared` with `nodeKind: "review"`, every clear (review is the one repeatable earner) | Exists | Achievement moment |
| Restored | 1 / 10 / 40 | "40 cracking reactions, brought back." | a review clear of a node whose strength was below `MASTERY_CRACKING_THRESHOLD` at that instant | **New** counter `mastery.restored`; the strength is already computed per node at every event in the fold | Achievement moment |

Review costs no charge and pays 12 XP per clear by `ECONOMY.md`'s own decision that
"re-practice is the one thing worth repeating." A ladder on it cannot be farmed for anything
the economy does not already permit, and it points a student at the one activity that
repairs the number they are anxious about. Restored is the sharper of the two: it counts the
repair itself.

### Learning from error (ladder)

| Award | Rungs | Copy at rung III | Counter | Source | Announced by |
|---|---|---|---|---|---|
| Second try | 1 / 10 / 50 | "50 problems you got wrong, then got right." | distinct `problemId` with an `attempt` `correct: false` followed later by an `attempt` `correct: true` | **New** counter `attempts.secondTries`, a fold over events that exist | Achievement moment |

This is Mistake Mechanic's idea and the single most important award in the file, because it
is the product's stance made visible: wrong answers are free, journaled, and worth
something. It is the one ladder a wrong answer advances. Yes, a student could answer wrong
on purpose and then right; the rung pays nothing and the act still ends in a right answer to
that problem, so there is nothing to defend against.

The trainer's own mistake journal (`src/game/tabs/trainer/mistakes.ts`) is client-side
localStorage and not in the economy journal, so nothing here reads it. An award on named
causes ("the same cause never twice") waits until mistakes reach the journal in Phase 6.

### Ritual

| Award | Rungs | Copy | Counter | Source | Announced by |
|---|---|---|---|---|---|
| Streak | 7 / 14 / 30 / 60 / 100 / 180 / 365 | "30 days." | `streak.best >= milestone`, one badge per milestone in `STREAK_MILESTONES` | Exists | **StreakScreen's milestone band**, never re-announced |
| Goal days | 10 / 50 / 150 | "150 days you hit your goal." | count of local days on which the daily goal was met, consecutive or not | **New** field `xp.goalDaysTotal`; the per-day walk exists for the streak | Achievement moment |

Streak is the one ladder in this file with more than three rungs, and it is not this file's
to shorten: `ECONOMY.md` fixes the seven milestones and pays 75 diamonds at each, and this
system records the badge that file promised. It reads `best`, not `current`, so the badge
stays after a break, which is the rank-floor rule applied to the streak. Its announcement is
already built: `StreakScreen.tsx` plays a milestone band at 1700 ms, so this system adds the
badge to the wall and says nothing on the day.

Goal days is the streak's anxiety-free twin and the reason the Ritual group has two rows.
It counts up forever, a missed day costs it nothing, and it is the number a student who
just broke a 40-day streak can look at and see that the 40 days still happened.

### Mastery ranks (one-off, five)

| Award | Copy | Trigger | Source | Announced by |
|---|---|---|---|---|
| Arrow Pusher, Mechanist, Synthesist, Retrosynthesist, Exam Ready | the rank's own `claim` from `MASTERY_RANKS` | `mastery.floorRank` reaches the rank | Exists | **RankUpMoment**, never re-announced |

Read from `floorRank`, the permanent floor, so the wall agrees with `ECONOMY.md`'s
"Ranks have a floor." Reader is the starting state and is not an award. The rank marks are
the existing `src/game/mastery/RankMark.tsx` motifs; nothing is redrawn.

### Cards (v2, named so it is not forgotten)

Cards reviewed (50 / 250 / 1,000) and Due cleared (a day where every due card was reviewed,
10 / 50 / 150) are the right awards for the Cards tab and **they do not ship in v1**, because
the cards store (`src/game/cards/store.ts`) keeps its own localStorage and writes nothing to
the economy journal. They need a `card_reviewed` event in `journal.ts` first, with the same
`at` and `tz` discipline. An award counting a store the server will never see would be the
one thing on the wall Phase 6 could not verify.

### What is not on the list, and why

- No award for XP totals: XP is already the header's fraction and the reward moment's hero.
  Putting it on the wall shows the same number a third time.
- No award for nodes started, attempts made, minutes spent, sessions, or app opens. Every
  counter here is a correct outcome or a completed unit of work. A counter of volume
  without correctness pays guessing.
- No award for spending, buying, or holding diamonds, freezes, costumes or themes.
- No award for branch breadth. The spine is the exam. Branches are there for a student who
  wants them, and a badge for wandering would pull a stressed student off the spine two
  weeks out.
- Nothing inside the exam window asks for more. See Refusals.

## Where they appear

### The award moment

**Never inside a node.** The verdict sheet (`src/game/tabs/trainer/engine/FeedbackSheet.tsx`)
owns the post-answer moment: the 200 ms rise, then the deferred work `TrainerScreen.tsx`'s
`afterRise` runs once the sheet has landed, which is the mascot, the sound, the buzz and the
win tween, and nothing joins that list. A toast over the sheet would be two things fighting
for the same frame, and the round-four motion critic already measured what a heavy verdict
frame costs. So an achievement is never a toast, never mid-lesson, never over the sheet.
Achievements are **receipt lines, and receipts play at the clear.** An award whose counter
advances on an attempt (Second try, Longest run right) accrues silently and is announced by
the receipt of the next clear, which is where the student is already being told what
happened.

**The post-clear sequence today** is `RewardMoment` (2,500 ms) then `StreakScreen` (only on
the day's first count) then `RankUpMoment` (1,800 ms), orchestrated by `LessonPlayer.tsx`.
Achievements add one screen, **`AchievementMoment`**, between the streak screen and the
rank-up:

1. Reward: what did this clear pay.
2. Streak: am I still the kind of person who does this.
3. **Achievement: what did I just do that I can point to.**
4. Rank-up: what can I now do.

That order ends on the scarcest thing, and it is also the order of the claims from weakest
to strongest, so a still of any frame is a bigger statement than the one before. The
achievement screen plays **only when `receipt.achievements` contains a rung no other screen
owns.** Streak milestones belong to the streak screen's band and ranks to the rank-up, so
those rungs are written to the wall and skipped here. Nothing on any screen is shown twice,
which is the same law the reward moment's header restates three times.

**When two rungs land in one clear** (Flawless II and One sitting I on the same sequence,
say), one screen plays, not two: the hero is the highest rung by ladder position, and the
rest sit in an "Also earned" row beneath as small marks with names. Four screens in a row is
the ceiling, it is rare, every one is tap-skippable, and the achievement screen is the
shortest of the four.

**Choreography**, one clock, the shape the three sibling moments already use:

| ms | Beat |
|---|---|
| 0 | The mark arrives alone, on the completed-state glow from `DESIGN-GOALS.md`, not confetti. RankUpMoment's argument holds here too: a celebration identical to the one after every lesson is not a scarcer moment, it is the same moment twice. The mark carries its threshold numeral from frame zero |
| 380 | The award's name under it, in the display face |
| 600 | The act sentence, the "Copy" column above. It names what was done and never what the student now is |
| 850 | The pip row: the new rung's pip fills and a check glyph lands in it. The pips that were already filled are filled from frame zero |
| 1,050 | "Also earned" row, when there is one |
| 1,200 | Continue, the same control the sibling moments end on |
| 1,400 | Done. Shorter than the rank-up's 1,800 because it has less to say |

The mascot: `proud` plus `celebrate` for a unit badge, the boss, and Course complete, the
`MASCOT.md` Progression rows for "Unit complete"; `happy` plus `bounce`, the "XP pop" row,
for every ladder rung. Bloom's biggest reaction stays reserved for the biggest things. No
new sound: the reward moment one screen earlier already played, and a second one here would
be the confetti problem in audio.

**This is the fourth copy of `useStageClock`.** `RankUpMoment.tsx`'s header says it is the
third and that "if a fourth appears it should be lifted into a hook of its own." This is
the fourth. Building this screen lifts the hook to `src/game/beats/useStageClock.ts` and
points the three siblings at it in the same change, which is a refactor with a test
(`reducedMotion` starts at `end`, a skip sets `end`, one rAF loop) and not a new behaviour.

**Reduced motion** renders the 1,400 ms frame at once: mark, name, sentence, filled pip with
its check, Continue. The glow is static. There is no count-up to skip because there is no
number that counts. This is what jsdom sees too, so the screen's tests assert the rest state
and the beat table separately, as the streak screen's do.

**Where the sequence is wired.** `LessonPlayer.tsx` (lesson clears through
`progress.completeLesson`) and `src/game/beats/BeatRunner.tsx` line 225 (concept clears
through `progress.clearNode`) are the two places a receipt is produced today, so they are
the two places the screen slots in. **`TrainerScreen.tsx` does not journal a clear.** A
trainer win reaches the verdict sheet and the mascot and stops; no `node_cleared`, no
receipt, no reward moment. That is a pre-existing gap and not this design's to fix, but
this design depends on it: until reaction and sequence wins reach the journal, Flawless,
One sitting and every unit badge can only ever count beat nodes. It is the first row of the
build list.

### Where they live afterwards

**The Me tab**, `src/game/tabs/me/MeTab.tsx`. Me is "everything that is about the STUDENT
rather than about the chemistry," and a record of what the student has done is exactly
that. Today the tab has a three-stat band (Diamonds, Day streak, Active days) and nothing
else about progress. A new section, **Records**, goes between the stat band and "Your
studying":

- The three records as three cards in a row: mark, the number in the display face, the
  name, the date. This is the bar's top row and it is right.
- Under them, **Awards**: the first six tiles of the wall (most recently earned first, then
  nearest to a next rung) and a "See all" row.
- "See all" opens the full wall at its own address, **`#/app/achievements`**: a new
  `achievements` id in `src/game/app/routes.ts` with placement `collapsed` and parent `me`,
  the same placement Courses uses and for the same reason (reachable, not in the bar), plus
  a row in `src/lib/useDocumentTitle.ts` per the trap list in `CLAUDE.md`. It is a route and
  not an expanding section because a shareable card needs an address to point at.
- The wall itself is `src/game/tabs/me/AchievementsWall.tsx` drawing, and
  `src/game/tabs/me/achievementsModel.ts` deciding: no React, no DOM, no colours, every
  sentence and every "n of m" a pure function of the snapshot, the split `hudModel.ts`,
  `streakModel.ts` and `feedModel.ts` all use and for the reason each of their headers gives.

**The wall's layout**, top to bottom: the three records; the **unit strip**, fifteen small
marks in course order, earned ones filled, the rest outlined with the unit number, so the
fifteen unit badges do not swamp the grid; then the **Awards** grid, three across, one tile
per award in a fixed order (course, craft, retention, error, ritual, ranks) so a tile never
moves once a student has learned where it is.

**Tile anatomy.** A 64 px mark on a rounded plate, the award's name, and a caption.

- Earned: outline in `--bb-primary-ink`, plate fill `--tab-active`, the current rung's
  threshold printed on the mark in the display face, the pip row beneath with the reached
  pips filled, caption in words: "2 of 3, next at 30."
- Not yet earned: outline `--bb-border`, glyph in `--bb-muted-foreground`, the FIRST rung's
  threshold on the mark, empty pips, caption "4 of 10 flawless" so the student can see the
  counter moving before the first rung lands. Unearned is quieter, never invisible: captions
  stay at the 4.5:1 body floor.
- A one-off has no pips; its caption is the date earned or "Not yet."
- Every tile is a 44 px-minimum button opening a small sheet: the act sentence for each
  rung earned with its date, and the next rung's threshold in words. That sheet is where
  the full copy lives; the grid carries only names and numbers.
- **New**: a small pill on a tile earned since the wall was last opened, cleared when the
  wall is opened. The seen-set is a localStorage convenience
  (`blueberry.achievements.seen.v1`), a rendering cache and not state, and it never reaches
  the journal. There is no dot on the Me tab and no badge on the tab bar; see Refusals.

**Marks are SVG, currentColor, traced, never raster, never emoji**, per the owner finding
of 2026-09-02 in `DESIGN-GOALS.md`. Rank tiles reuse `RankMark.tsx`. Each other award gets
one mark drawn in the same vocabulary; the unit strip uses one hexagonal plate with the unit
number. Marks are chemistry, not characters: an arrow for Flawless, a flask for Review, a
mended ring for Restored, two arrows in sequence for One sitting, a struck-then-ticked line
for Second try. Bloom appears on the moment, not on the badges, so the wall stays legible
at tile size and the mascot stays a character rather than a sticker sheet.

**Share card, v2.** `ECONOMY.md` promises a shareable card per rank ("a class group chat is
where the next hundred users are"). The rank card and an achievement card are one generator
reading the wall's model; it needs `#/app/achievements/<id>` and an image route, and it is
out of v1 so that the wall can ship before the card is designed.

**The pathway changes nothing.** Finished units already glow; a badge on the map would be
the completed state drawn twice.

### The palette and the fill-only rule

- Chrome is the primary, `#5a3fd8` light and `#6d5ae0` dark, ink `#472ab4`, exactly the
  tokens `theme.css` ships as `--bb-primary` and `--bb-primary-ink`. No lavender anywhere on
  the wall or the moment. The mascot palette (`#7c3aed`, `#5b21b6`) stays on Bloom.
- Green `#7ed957` appears in one place: the fill of the small check disc that lands in a
  newly filled pip and sits under an earned one-off, with dark ink (`--bb-foreground`) for
  the check glyph on it. Never as a line, never under white text, which measures 1.76:1 on
  it, and never as the tile outline.
- Nothing red. Duolingo's NEW pill is red because red is its urgency colour; ours is the
  primary tint with ink text, because a badge you have not looked at yet is not urgent.

## Accessibility

- **Reduced motion** is a first-class path on both surfaces, stated above: the moment
  renders its final frame at once with a static glow, and the wall has no motion to reduce
  beyond the press acknowledgement every control already has.
- **Colour is never the only carrier.** A rung is a filled pip AND a check glyph AND a
  number on the mark AND a sentence in the caption. Earned versus not is outline weight AND
  fill AND the caption's words AND the accessible name: "Flawless, 2 of 3 earned, 14 of 30,
  next at 30." A record's card reads "Longest streak, 47 days, set 3 October."
- **Contrast**: captions on unearned tiles clear 4.5:1 against the card; tile outlines
  clear 3:1 against the ground per WCAG 1.4.11, the same floor the 2026-09-23 palette
  measurement enforced. A contrast ratio written here is a claim; `npm run contrast:audit`
  is the fact, and the wall gets a moment in `measurements/economy-moments.mjs`.
- **Hit targets**: every tile and every record card is at least 44 by 44 and runs under
  `npm run hit:targets`.
- **Screen readers** get the wall as a list of three regions (Records, Units, Awards) and
  the moment as a live region announcing the act sentence once, after the mark, so the
  sentence is heard and not the name alone.

## Honesty rules

These are the rules an achievement is written and tested under. A proposed award that breaks
one is a bug, not a trade-off.

1. **Copy names the act, never the ability.** "30 nodes cleared without a wrong arrow", not
   "you've mastered arrow pushing." Sentences about ability belong to Mastery alone, whose
   ranks have a model and a claim table behind them. `ECONOMY.md` already forbids making
   the Mastery claim "until the data supports it"; an achievement never had the data.
2. **Only correct outcomes and completed work count.** No counter of attempts, time, speed,
   sessions, opens, or taps. Speed in particular: a counter that a faster wrong answer
   could improve teaches guessing, and `SCORE.md`'s reading of Duolingo's own move away
   from volume metrics is the precedent.
3. **Nothing counts twice.** Replays advance no ladder (`firstClears` gates every
   first-clear counter). Review is the deliberate exception because the repeat is the act.
4. **Never down.** A rung earned stays. A record keeps its date. The wall never shows a
   loss, a lapse, an expiry, or a "you were on track for."
5. **No rung the content cannot reach.** First resonance is a one-off until there is more
   than one resonance node.
6. **Every rung III is reachable inside one course without grinding.** The thresholds table
   is justified against 90 playable nodes, 15 units, 10 gates and 1 boss, and retunes only
   with that constraint intact.
7. **Announced once**, by the screen that owns it. The wall records everything; the
   moment plays only what no other screen said.
8. **Derived, recomputable, server-verifiable.** The client animates the receipt. An award
   that needs a counter the journal does not hold is either new journal work, named as
   such above, or it does not ship.

## Refusals: what this deliberately does not copy

Duolingo's wall is the bar for the shape and not for the contents. `duolingo/NOTES.md`
records that "the error moment is the paid-AI upsell moment. Frustration is converted at
its peak." This product is a study tool a student pays for before an exam, and an
achievement that manufactures anxiety is a bug. Each refusal below names the mechanic and
the reason, so a future change that wants one back has to answer the reason.

- **Early Riser and Sleepwalker** (lessons before 7am, after midnight). A student at 2am
  before an exam should not be rewarded for being there. Sleep is the exam skill, and a
  badge for skipping it is the single most harmful thing on the bar's wall for this
  audience.
- **Speed Racer** (timed lessons). Rewards speed over correctness, teaches guessing, and
  prices deliberation, which is the thing arrow pushing requires. Honesty rule 2.
- **Perfect Week** (every day of a week). The streak already rewards exactly this behaviour
  and pays 75 diamonds at its milestones. A second award for the same days is the Return
  bonus error. Goal days exists instead, counting up and never resetting.
- **XP Olympian** (30,000 XP on a ten-rung ladder). Shows a number the product already
  shows twice, rewards volume, and its top rung is a monument to grinding.
- **Ten-rung ladders in general.** Three, with the one-course rule.
- **Cheerleader, Social Butterfly, League MVP** (high-fives, follows, league rank). No
  servers exist for any of it, and the rulebook's leaderboard privacy floor ("assume
  minors", display names only, no profile reachable from a row) rules out follow counts
  outright. When leaderboards open, a league award is still refused: it rewards being
  placed above other students in a week, which is not an act the student did.
- **Legend and Rarest Diamond** (paid-adjacent). Nothing bought earns a badge, and no badge
  sits next to a purchase. Rule 2 of `ECONOMY.md`.
- **Quest Explorer** (completing quests). A reward for collecting rewards. The Feed's quests
  already pay through the engine's own daily goal.
- **The red NEW pill on the tab bar and unread dots.** A pill lives on the tile inside the
  wall and nowhere else. No dot on Me, no badge on the tab bar, no push notification for an
  achievement, no "you're one away" nudge. The evening streak nudge in `ECONOMY.md` is the
  entire notification budget for the retention loop and this file adds nothing to it.
- **Anything at the wrong-answer moment.** The verdict sheet stays what it is: the
  explanation, Undo, and Bloom. No achievement, no progress-toward, no upsell ever appears
  there. `hudModel.ts`'s header says "nothing that prices a mistake"; nothing here rewards
  the moment of one either, except Second try, which pays only once the problem is right.
- **Anything in the exam window that asks for more.** The window is where the product
  switches Charge off and says "No limits until then." No award is scoped to it, no rung
  is timed against it, and a student who does nothing but review for two weeks will see
  Review and Restored climb and nothing else change.
- **Expiry, decay, seasons, limited-time awards.** Rule 4. The wall is the one place
  nothing gets worse.

## Build list, as step then verify

1. **Trainer wins reach the journal.** `TrainerScreen.tsx` journals `node_cleared` with
   `flawless`, `stepsInOneSitting`, `spine` and `difficulty` on a win, through the same
   `progress.clearNode` `BeatRunner.tsx` uses. Verify: a trainer win produces a receipt and
   the reward moment plays. This is a pre-existing gap and an owner item; everything below
   is thin until it is closed.
2. **`packages/economy/src/achievements.ts`**: definitions and `deriveAchievements`.
   Verify: one test per row of the tables above, fixed `now`, plus one asserting no rung
   is reachable by a replay and one that a broken streak leaves every streak badge in place.
3. **`derive.ts`**: `xp.bestDay`, `xp.goalDaysTotal`, `attempts.bestCorrectRun`,
   `attempts.secondTries`, `mastery.restored`; `Receipt.achievements` in `receiptFor`.
   Verify: the existing derive tests still pass unchanged (this adds fields and changes no
   number), and `wrong-answers-are-free.test.ts` still finds no wrong-answer term.
4. **`achievementsModel.ts`** and **`AchievementsWall.tsx`**, the Me section, the
   `achievements` route with placement `collapsed`, the `useDocumentTitle` row. Verify: a
   model test per caption sentence; `hit:targets` and `contrast:audit` moments added in
   `measurements/economy-moments.mjs`.
5. **`useStageClock` lifted** to `src/game/beats/useStageClock.ts`; the three siblings
   import it. Verify: their existing beat tests pass unchanged.
6. **`AchievementMoment.tsx`**, wired in `LessonPlayer.tsx` and `BeatRunner.tsx` between the
   streak screen and the rank-up. Verify: plays only for rungs no other screen owns; the
   four-frame burst at 0 / 400 / 900 / 2,500 against the beat table; the reduced-motion
   still equals the 1,400 ms frame.
7. **v2**: `card_reviewed` journal event and the two Cards awards; the share card.

## Owner decisions

- **Trainer clears reaching the journal** is a product gap this design depends on, listed
  first above. Whether it is fixed as part of this work or before it is the owner's call.
- **Thresholds** are set against the course size and retune from real earn rates. The
  ratios and the one-course rule are the design intent; the absolute numbers are the part
  to move.
- **A route or a section.** This file says route (`#/app/achievements`, collapsed under
  Me), because a share card needs an address. If the share card is dropped for good, a
  section on Me is enough and the route row comes out.
- **Unit badge titles.** This file uses the unit's full title from `pathwayMap.ts`. If the
  titles are renamed in the authoring wave, the badges follow them automatically.
