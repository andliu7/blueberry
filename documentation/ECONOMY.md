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
| Streak milestone | 75 | At 7, 14, 30, 60, 100, 180, 365 |
| Mastery rank | 125 to 250 | See the Mastery table |

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
| **Charge top-up** | **60** | Full refill to 30 |

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

| Item | Value | Notes |
|---|---|---|
| Full meter | 30 | Cap |
| Concept node | 5 | Charged on entry |
| Reaction node | 8 | Charged on entry |
| Unit quiz | 10 | Refunded in full on a pass |
| Branch node | 8 | Same as a reaction node |
| Review drill | 0 | Always free. Never gate what repairs decay |
| Tutorial and intro nodes | 0 | `CLAUDE.md`: what sells the product is never gated |
| A wrong answer | 0 | Load bearing. Do not let this drift |
| Regeneration | +1 per 30 min | Empty to full in 15h, so a night always resets it |
| Flawless clear | +3 | The better you get, the less it binds. Inverts Duolingo's incentive |
| Combo mini-game | +2 to 6 | Random reward on a correct streak |

**Exam window.** In the two weeks before the exam date collected at onboarding, Charge switches off
completely and says so: "Exam in 9 days. No limits until then." This is the whole ethical argument
for the mechanic in one gesture. A student who was not blocked during cramming week is a student
who tells other people.

Run the daily numbers and Charge almost never binds on the intended user: a Regular learner
clearing one concept and one reaction node spends 13 against 30 plus regeneration. It binds on the
fifth node in one sitting, which is the only place a limiter belongs.

No rewarded ads in v1.

## Streak

A day counts when the student **hits their daily XP goal**, not when they open the app. That is
why the goal picker at onboarding is load bearing: it is the user setting their own bar, which is
why they respect it.

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
