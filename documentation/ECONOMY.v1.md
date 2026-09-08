# The diamond economy — draft for owner review

Requested 2026-08-26 ("draft up how we are going to reward the user with diamonds or something").
DRAFT: numbers are proposals, the structure is the deliverable. Two rules from CLAUDE.md bind
every line here and are restated so nothing below can drift from them:

1. **Server side or it does not exist.** Balances and spends live in Postgres behind RLS with
   column-level GRANTs (Phase 6). Everything in this file is *computed from the append-only
   attempt history*, never client-reported. Until Phase 6, the client shows a local rendering
   cache clearly labelled as such, exactly like `progress.ts`.
2. **Reward returning. Never punish leaving.** No decay, no loss, no "you're falling behind."
   The Duolingo lock-in screenshots in `reference images/` are filed as the anti-pattern.

Note: this also resolves open question 5 in `docs/OPEN-QUESTIONS.md` toward **diamonds** (the
owner's own word here), matching CLAUDE.md. The framework's "cash" line is superseded.

## Earning — every diamond traces to a learning event

| Event | Diamonds | Why this and not more |
|---|---|---|
| **First-clear of a node** (spine or branch) | 10 | The core loop. Once per node forever, so grinding one easy node earns nothing |
| Spine node first-clear bonus | +5 | The spine is the course; the map's own classification does the weighting |
| **Sequence completed** (all steps, one sitting) | +5 per step past the first | Multi-step endurance is the exam skill |
| **Flawless clear** (no wrong arrow on any step) | +5 | Precision bonus; visible before starting, never shamed after |
| **Resonance find** | 8 | Finds are the delight loop; slightly under a node clear so hunting supplements, never replaces |
| **Return bonus** | 15 | Opening the app on a day after a day away. The anti-streak: rewards coming BACK, caps at once/day, never resets anything |
| **Unit cleared** (all spine nodes in a unit) | 50 + the unit badge | The big celebratory moment, full-bleed per the Duolingo reward-moment rule |
| **Boss (multistep synthesis)** | 200 | Gated on five units; the endgame paycheck |
| Review drill cleared (once the queue ships) | 5 | Retention pays, lightly and repeatably — this is the one repeatable earner, because re-practice is the one thing worth repeating |

Explicitly **not** earners: logging in daily (that's the streak-anxiety loop wearing a coin
costume), watching videos, and anything a client could fabricate without an attempt record.

## Spending — cosmetic and convenience, never capability

| Sink | Cost | Notes |
|---|---|---|
| Berry outfits/moods (cosmetic) | 100–300 | The mascot family the owner described; pure identity |
| Pathway themes (meadow / twilight / cloud-sea) | 250 | The generated theme options become the first three skins |
| Canvas skins (scene ground palettes) | 150 | Cosmetic only; contrast floors still enforced |
| **Cloud-clear: open one side quest early** | 75 | The veiled side quests; buying curiosity, not skipping the spine. A branch is *reachable at no cost later* per the map, so this sells earliness, not access |
| Scratchpad pen colours | 50 | Small, cheap, personal |

Explicitly **not** sinks: anything on the spine (progress is never for sale), hints or answers
(feedback is the product, not a consumable), and retries (wrong answers are already free and
journaled — charging for mistakes is charging for learning).

## Anti-abuse, from day one of Phase 6

- Diamonds are a **derived column**: `balance = f(attempt history, spend history)`. Recomputable
  from scratch; a mismatch is an incident, not a support ticket.
- First-clear flags live server side keyed by (user, node); replays earn zero silently.
- The client *animates* what the server *concluded* — the reward moment plays from the server's
  receipt, never from local math.

## The moment (what the student sees)

Per the CLAUDE.md reward-moment rules: one large number, full-bleed, distinct from the working
state; the gem count-up uses the shine pass the owner specced; the berry gets excited. And the
FIRST diamond a student ever earns gets the long version of the animation — scarcity of ceremony
is what keeps ceremony meaningful.
