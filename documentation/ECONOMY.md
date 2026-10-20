# The economy

Owner direction recorded 2026-08-27. **This revision supersedes the 2026-08-26 draft**, kept at
`docs/ECONOMY.v1.md` for the reasoning it still carries. What changed and why is in the
Supersession section at the bottom. Read that first if you worked from v1.

Two rules from `CLAUDE.md` bind every line here and are restated so nothing below can drift:

1. **Server side or it does not exist.** Balances, spends, XP, mastery, charge and streak state
   live in Postgres behind RLS with column-level GRANTs (Phase 6). Everything here is *computed
   from the append-only attempt history*, never client-reported. Until Phase 6 the client shows a
   local rendering cache clearly labelled as such, exactly like `progress.ts`.
2. **Nothing buys correctness.** Diamonds buy cosmetics and convenience. Charge buys nothing, it
   only paces. Feedback is the product, not a consumable.

## Five systems, five questions

Each number on screen answers exactly one question a student is actually asking. Two numbers
answering the same question means one of them should be cut.

| System | Answers | Moves | Spendable |
|---|---|---|---|
| **XP** | How much work have I put in? | Up only, forever | No |
| **Mastery** | How much do I actually know? | Up, with slow decay | No |
| **Diamonds** | What can I get for it? | Up and down | Yes |
| **Charge** | Can I do another node right now? | Drains, refills | It is the limiter |
| **Streak** | Am I still the kind of person who does this? | Up, or to zero | Protectable, not buyable |

## XP

Effort, never spent, therefore safe to make public and competitive. Feeds the daily goal and the
leaderboard.

| Event | XP | Why this and not more |
|---|---|---|
| Concept node first-clear | 10 | Recognition and ranking work, roughly 3 minutes |
| Reaction node first-clear | 15 | Fewer steps but arrow work is slower |
| Flawless clear | +5 | No wrong arrow on any step. First clear only, never on replay |
| Sequence completed in one sitting | +3 per step past the first | Multi-step endurance is the exam skill |
| Unit quiz passed | 30 | Drawn across the whole unit |
| Unit quiz flawless | +20 | The largest single award. It should feel like it |
| Branch node first-clear | 20 | Between a reaction node and a quiz |
| Resonance find | 8 | The delight loop, deliberately under a node clear |
| Daily goal met | +10 | Once per day, on top of whatever earned it |
| Review drill cleared | 12 | The one repeatable earner. Re-practice is the one thing worth repeating |
| Replay of a cleared node | 5 | Deliberately low. See the flat-rate constraint |
| Challenge passed | 12 | PROPOSED 2026-09-30, owner to confirm. Priced as a review drill; see `XP_CHALLENGE_PASSED` in rules.ts |
| Flashcard review run completed | 5 | Owner 2026-10-20: every lesson, quiz, practice run and review clear awards XP, and a card run was the one review that paid none. Same completed-run rules and daily cap as its diamonds. 5 is the replay rate, proposed. `XP_CARD_RUN` |
| Chest opened | 0, or the chest's fixed XP | Only the onboarding gift pays XP (20). Chest XP counts toward the total and the stage, never toward the day's goal or the "Earn XP" quest. See Chests |

Every clear path pays XP (owner 2026-10-20, checked in `test/xp-stage.test.ts`): a lesson's first
clear or replay of every kind, a review drill, a quiz pass, a Challenge pass and a completed card
run. Two paths pay none on purpose: a failed Challenge, and a practice session that ends before
it clears (it banks no clear at all). A `node_cleared` of kind `quiz` pays 0 because the quiz
pays through `quiz_passed`; no shipped surface journals a quiz-kind clear today.

### XP stages (owner 2026-10-20)

Bloom's level badge and the HUD line "N XP to the next stage!" (never "135 / 200"). There was
no level logic before, so the curve is the builder's, flagged for the owner: stage 1 starts at
0, and stage s to s + 1 takes 50 x s more XP, so stages open at 0, 50, 150, 300, 500, 750, and
so on (25 x s x (s - 1)). No top stage. `stageFor` and `XP_STAGE_STEP` in rules.ts; the snapshot
carries `xp.stage`, `xp.stageStartXp`, `xp.nextStageXp` and `xp.toNextStage`.

**Flat-rate constraint.** Keep XP per minute roughly level across node types. If concept nodes pay
10 in three minutes and reaction nodes pay 15 in eight, students farm concept nodes and never draw
an arrow, which is the one thing this product exists to teach. Instrument median completion time
per node type in the first week of real use and retune from that, not from this table.

### Daily goals

| Tier | Daily XP | Roughly |
|---|---|---|
| Casual | 10 | One concept node |
| Regular | 20 | One of each |
| Serious | 35 | Two or three nodes |
| Exam mode | 60 | Offered only inside the exam window |

## Mastery

XP answers how much you have done. It never answers the question students are anxious about,
which is whether they will be okay on the exam. Mastery is that number: 0 to 100 per course,
computed from the current decayed strength of every cleared node weighted by difficulty. It moves
slowly. A single node should move it a point at most.

| Mastery | Rank | What it claims | Award |
|---|---|---|---|
| 0 to 15 | Reader | Name the structure, spot the reactive site | Badge |
| 16 to 30 | Arrow Pusher | Move electrons the right way for the right reason | Badge + 125 |
| 31 to 50 | Mechanist | Predict a product from an unseen mechanism | Badge + 125 |
| 51 to 70 | Synthesist | Plan a two or three step route forward | Badge + 125 |
| 71 to 85 | Retrosynthesist | Work backwards from a cold target | Badge + 125 |
| 86 to 100 | Exam Ready | Handle a full mixed exam under time | Badge + 250 |

Each rank also unlocks a free Bloom costume and a shareable card. The card is the growth loop: a
class group chat is where the next hundred users are.

### Presentation rules

These are what keep a decaying number from reading as punishment, and they are not optional.

- **Lead with the sentence, not the number.** "You can now predict E2 products" first, 34 second.
- **Never render decay as a loss.** Not "you dropped 3 points." Instead "4 reactions are cracking,
  review to restore," with a one-tap fix that takes three minutes.
- **Cap the visible dip** at 2 points a day regardless of what the model says. The model may be
  harsh. The display may not be.
- **Ranks have a floor.** Once a Mechanist, always a Mechanist. The badge is permanent even if the
  score sags. Taking back an earned rank is the most demoralizing thing this system could do.
- **Never show Mastery inside a node.** It belongs on the pathway and the profile. Mid-problem it
  is only anxiety.

### The claim these ranks make

The rank descriptions assert something about a student's ability, and today nothing backs them but
difficulty tags we assigned ourselves. That is an acceptable v1 proxy and it should ship.

The v2 prize is calibrating Mastery against real past exam items, so the app can say "you are
currently answering at the level of a B+ on a typical Orgo 2 midterm." That is the most valuable
sentence this product could say, no competitor can copy it without the same data, and it is a
second reason the class code at onboarding matters. Do not make the claim until the data supports
it. Per `LEARNING-SCIENCE.md`, an unread row is a to-do, not evidence, and the same standard
applies here.

## Diamonds

Scale unchanged from v1. Every diamond still traces to a learning event.

| Event | Diamonds | Why this and not more |
|---|---|---|
| Node first-clear, spine or branch | 10 | The core loop. Once per node forever, so grinding earns nothing |
| Spine node bonus | +5 | The spine is the course; the map's classification does the weighting |
| Sequence completed in one sitting | +5 per step past the first | Endurance is the exam skill |
| Flawless clear | +5 | Visible before starting, never shamed after |
| Resonance find | 8 | Hunting supplements, never replaces |
| Unit cleared | 50 + unit badge | The big celebratory moment, full-bleed |
| Boss, multistep synthesis | 200 | Gated on five units. The endgame paycheck |
| Review drill cleared | 5 | Retention pays, lightly and repeatably |
| Challenge passed | 5 | PROPOSED 2026-09-30, owner to confirm. Every pass, only on a cleared node; entry costs the node's own charge |
| Flashcard review run completed | 5 | Owner decision 2026-10-01, the review drill rate; diamonds only, no XP. Completed means the run reached its summary with at least 5 distinct cards graded, and at most 3 runs pay per local day, so opening and closing a run, or re-running a small deck, pays nothing more. The 5 cards and the cap of 3 are the builder's choice, flagged for the owner. `cards_reviewed` event, `DIAMONDS_CARD_RUN` in rules.ts |
| Streak milestone | 75 | At 7, 14, 30, 60, 100, 180, 365 |
| Mastery rank | 125 to 250 | See the Mastery table |
| Chest opened | 5 to 50 | Fixed per kind of chest, paid when it is OPENED, not when it is earned. See Chests |

Not earners: watching videos, and anything a client could fabricate without an attempt record.

### Sinks

| Sink | Cost | Notes |
|---|---|---|
| Berry outfits and moods | 100 to 300 | Pure identity. The `berryState` and costume work in `MASCOT.md` |
| Pathway themes | 250 | The generated theme options become the first three skins |
| Canvas skins | 150 | Cosmetic only. Contrast floors still enforced |
| Cloud-clear, open one branch early | 75 | Sells earliness, not access. A branch is reachable free later |
| Scratchpad pen colours | 50 | Small, cheap, personal |
| **Streak freeze** | **75** | Hold up to 2. Consumed automatically before the streak breaks |
| **Streak repair** | **150** | 48h window after a break. Capped at once a month |
| **Charge top-up** | **60** | Full refill to 20 (the cap since owner 2026-10-20) |

Not sinks: anything on the spine, hints or answers, and retries. Wrong answers are free and
journaled. Charging for mistakes is charging for learning.

The three new prices are set against the earn rate in the table above, not imported from another
scale. A Regular learner clearing roughly two nodes a day on five days earns about 120 diamonds a
week, plus 50 on a unit clear, so call it 150 to 200. That puts a streak freeze at about half a
week, a charge top-up at a third of one, a repair at most of one, and a costume at one to two
weeks of saving. Those ratios are the actual design intent; the absolute numbers are the part to
retune once real earn rates exist.

## Charge

The limiter. Duolingo replaced hearts with energy: 25 to start, and **every question answered costs
1, right or wrong**, which is why free users report two to three lessons before stopping and why
the common complaint is that it is more restrictive than hearts were. Ours is a deliberate
correction of that, and two rules do the work.

1. **Charge is spent when a node starts, never per question.** If there was enough to begin, there
   is enough to finish. Nobody is stranded mid-mechanism.
2. **Mistakes cost nothing.** Charge paces volume. It never prices being wrong.

Charge is "Energy" on screen. Every number below was set by the owner on 2026-10-20 (it was:
cap 30, concept 5, reaction and branch 8, quiz 10, +1 per 30 min, flawless +3). The intent, in
the owner's words: a full tank covers a ~5 lesson section and runs out just before its final, and
the free plan must still give real value. Five lessons at 3 is 15 of 20, leaving 5, one short of
the final's 6.

| Item | Value | Notes |
|---|---|---|
| Full meter | 20 | Cap. Owner 2026-10-20 |
| A regular lesson (concept, reaction or branch node) | 3 | Charged on entry. Owner 2026-10-20 |
| A Challenge run | 6 | Charged on entry, whatever the node's kind (`node_started.entry = "challenge"`). Owner 2026-10-20 |
| A section final or unit checkpoint | 6 | Charged on entry (`node_started.entry = "final"`; a map node with role `quiz`, or the unit checkpoint). Owner 2026-10-20 |
| Unit quiz (`quiz` kind) | 6 | Refunded in full on a `quiz_passed` |
| Review drill | 0 | Always free. Never gate what repairs decay |
| Tutorial and intro nodes | 0 | `CLAUDE.md`: what sells the product is never gated |
| A wrong answer | 0 | Load bearing. Do not let this drift |
| Regeneration | +10 per 30 min | Capped at 20, so empty to full in an hour. Owner 2026-10-20 |
| Review drill cleared | +3 | Every clear. Owner 2026-10-20 |
| Daily quest completed | +5 | Each of the day's three. Owner 2026-10-20 |
| Flawless lesson (no misses) | +2 | Concept, reaction and branch clears only, first clear or replay: a replay costs 3 and returns 2, so it cannot be farmed, and a free kind returning charge would be a faucet. Owner 2026-10-20 (was +3, on any kind) |
| Combo mini-game | +2 to 6 | Random reward on a correct streak |

**Exam window.** In the two weeks before the exam date the student sets in the Me tab (onboarding never asked
for it, and is skipped since 2026-10-17), Charge switches off
completely and says so: "Exam in 9 days. No limits until then." This is the whole ethical argument
for the mechanic in one gesture. A student who was not blocked during cramming week is a student
who tells other people.

Run the daily numbers and Charge almost never binds on the intended user: a Regular learner
clearing one concept and one reaction node spends 6 against 20, and regeneration refills 10 every
half hour. It binds at the end of a section taken in one sitting, just before the final, which is
the only place a limiter belongs (owner 2026-10-20).

No rewarded ads in v1.

## Chests (owner 2026-10-20)

Chests are EARNED and SAVED. Completing a task drops a chest right away, with "Open now" and
"Save for later"; saved chests stack in an inventory and open one by one or all at once. Every
reward is FIXED: a random-XP chest is held until XP is stored server side. The amounts are the
builder's proposal except where the owner set them; `CHEST_REWARD` in rules.ts.

| Chest | Earned by | Opens for | Notes |
|---|---|---|---|
| Section final | Clearing a section final or unit checkpoint (`chest_earned`, `source: "section_final"`, `ref` = the pathway chest id) | 15 diamonds | `DIAMONDS_CHEST`, the pathway chest's price since before 2026-10-20, so an old journal derives the same balance |
| Daily quest | Completing a daily quest (derived, never journalled) | 5 diamonds | The C1 chest: five diamonds fly to the counter |
| Daily gift | The first open of the app in a local day (`chest_earned`, `source: "daily_gift"`) | 5 diamonds | One per local day, read in the zone the student was in |
| Onboarding gift | The first visit (`chest_earned`, `source: "onboarding_gift"`) | 50 diamonds + 20 XP | Once, ever. The owner set "fixed"; the amounts are proposed |

Rules the derivation enforces, so no client can mint a chest:

- The chest id is the derivation's, never the client's: `daily-gift:<local date>`,
  `onboarding-gift`, `quest:<local date>:<quest id>`, or the pathway chest id. A duplicate earns
  nothing. A section final cannot claim one of the minted prefixes.
- Opening (`chest_opened`) pays the chest's fixed reward once. A minted id opened before it was
  earned pays nothing and stays openable.
- A pathway chest opened with no `chest_earned` (every journal before 2026-10-20) keeps the old
  rule: 15 diamonds once per id.
- Chest XP is in the total and the stage, never in the day's goal, so opening a gift cannot keep
  a streak alive.

## Daily quests (owner 2026-10-20)

Three per local day, derived from the journal. Completing one earns a daily quest chest and +5
energy. No XP doubler: that is held.

| Quest | Kind | Counts |
|---|---|---|
| Finish 3 lessons or quizzes | Recurring | Any non-review clear, or a quiz pass |
| Train for 30 minutes | Recurring | A PROXY: 5 minutes per training activity (a lesson or review clear, a quiz pass, a paid Challenge, a card run of at least 5 cards), so six activities. The journal records no time spent; swap in real time once it does |
| Clear a review drill | Rotating | A review clear |
| Finish a lesson with no misses | Rotating | A flawless lesson clear or quiz pass |
| Finish a flashcard review | Rotating | A card run of at least 5 cards |
| Earn 40 XP | Rotating | The day's XP from work (no goal bonus, no chest XP) |

The rotating quest is picked by local date: the list in order, by the number of days since
1970-01-01, modulo four. `RECURRING_QUESTS`, `QUEST_ROTATION` and `questsFor` in the package.

## Streak

A day counts when the student **hits their daily XP goal**, not when they open the app. That is
why the goal picker is load bearing: it is the user setting their own bar, which is why they
respect it. Since onboarding is skipped (2026-10-17) the picker lives in the Me tab and a new
student starts on the default goal until they change it (owner, 2026-10-20).

| Mechanic | Cost | Behaviour |
|---|---|---|
| Streak freeze | 75 | Up to 2 held, consumed automatically. They find out it saved them |
| **Rest day** | Free | **One per week, auto-applied.** The one change from Duolingo |
| Streak repair | 150 | 48h window, once a month maximum |
| Milestones | +75 | 7, 14, 30, 60, 100, 180, 365, badge at each |
| 30 day accessory | Free | A permanent Bloom accessory. Cannot be bought |
| Evening nudge | Free | At the chosen time. Bloom in a nightcap shielding a guttering flame |
| Exam window | Free | Requirement drops to opening the app |

**Rest days are the release valve.** A hard streak motivates right up until a student has three
midterms in one week, and then a 90 day streak breaking is not a bad day, it is a churn event.
People do not restart at 1, they quit. One free rest day a week, applied automatically and
announced after the fact ("Tuesday was a rest day. Streak safe at 47."), removes the cliff while
keeping the pressure, because two missed days still costs it.

Then stop. A streak that cannot break is not a streak. Rest day plus freezes plus a monthly repair
is the entire forgiveness budget this system can absorb. Do not add a fourth.

## Anti-abuse, from day one of Phase 6

- Every balance is a **derived column**: `f(attempt history, spend history)`. Recomputable from
  scratch. A mismatch is an incident, not a support ticket.
- First-clear flags live server side keyed by (user, node). Replays earn zero, silently.
- Charge regeneration is computed from server time on read, never accumulated by a client tick.
- Streak days are derived from attempt timestamps in the user's stored timezone, so a client clock
  cannot manufacture one.
- The client *animates* what the server *concluded*. The reward moment plays from the server's
  receipt, never from local math.

## The moment

Per the `CLAUDE.md` reward-moment rules: one large number, full-bleed, distinct from the working
state. The gem count-up uses the shine pass. Bloom gets excited (`cheer` plus `celebrate`, see
`MASCOT.md`). The **first** diamond a student ever earns gets the long version. Scarcity of
ceremony is what keeps ceremony meaningful.

## Supersession, 2026-08-27

v1 held: "Reward returning. Never punish leaving. No decay, no loss, no you're falling behind,"
with a 15 diamond **Return bonus** as a deliberate anti-streak, and filed the Duolingo lock-in
screenshots in `reference images/` as the anti-pattern.

Owner direction on 2026-08-27 supersedes that. A streak ships, Charge ships, and Mastery decays.
The stated reason is that these mechanics work and the product should use what works. The Return
bonus is removed, because rewarding a return and rewarding a streak at once pays a student twice
for the same behaviour and makes both numbers meaningless.

**The concern v1 was written to address has not gone away**, and it is recorded here rather than
dropped, because it was correct on its own terms: this product is used before exams by people who
are already stressed, and a mechanic built on fear of losing a number is a poor fit for that
audience. The mitigations above are the answer to it and they are not decoration. Weekly rest
days, automatic freezes, the exam-window pause on both Charge and the streak, Charge never pricing
a mistake, the capped visible Mastery dip, and permanent rank floors are each load bearing. If a
future change strips them out one at a time, this file will describe Duolingo's lock-in loop with
extra steps, which is the thing the owner rejected in the first place. Remove one only
deliberately, and record why here.

`CLAUDE.md` line ~235 has been amended to point at this section.
