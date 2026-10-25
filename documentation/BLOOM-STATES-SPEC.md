# Bloom states and reactions: the build spec

Written 2026-10-24 for the six-builder run that brings the Design Bible's section 01 ("Mascot
states and reactions") into the game. It extends `MASCOT.md`, which stays the authority on the
axes and the tone. Read `MASCOT.md` first, then this. Paths are relative to the repo root unless
they start with `src/game/`, which is spelled out where it matters.

Sources: the owner's Design Bible artifact (section 01, A to F), a read-only inventory of
`src/game/mascot/` against it, and a Duolingo motion sheet (measured curves from duolingo.com's
production CSS, durations chosen on top of them). Duolingo is a motion reference only: no name,
owl, asset or font.

## 0. Ground rules every builder follows

- **Build on the engine, never rebuild it.** Mood (face that persists), behaviour (motion with a
  lifecycle), state (what the berry is made of), costume (cosmetic). A Bible row becomes a
  composition of those four, plus at most an overlay drawn beside the berry.
- **Do not change a shipped, tested value.** `berryReaction.test.ts` pins correct, wrong, near
  miss, charred and the combo chains. Those reactions stay exactly as they are. Every improvement
  below is additive: a new outcome, a new field, an overlay keyed on a field that already exists.
  Editing an existing assertion is weakening a check.
- **Shipped numbers stand.** The Bible differs from the code on blink (90ms vs 110ms), blink gap
  (3 to 6s vs 2.6 to 7.2s), breathe (2.4s bob vs 3.8s breathing under a 7s tilt) and the correct
  pose (0.85 / 1.1 vs 0.78 / 1.04 then 0.86 / 1.18). None of these is retuned in this run. They are
  owner taste calls, listed in section 7.
- **Face first, within one render of grading.** The mood swap happens in the same state update as
  the grade, so the first visible change lands on the next frame (far under 200ms). Body motion
  follows. Every answer reaction must read at 40px.
- **Reduced motion.** Every new motion has a still final pose that still reads, with at most a
  150ms opacity crossfade. Counters jump to their final value; particles become one static sparkle
  glyph. Overlays must key off a **prop-driven attribute** (`data-reduced="true"` on the stage),
  not only the media query, so the gallery's reduced-motion toggle can show the still poses. Keep
  the existing `@media (prefers-reduced-motion: reduce)` and `html[data-motion="reduced"]` rules
  working too, the way `mascot.css` already does.
- **CSS and SVG only.** No new dependency, no WebGL, no Rive, no Lottie. Animate transform and
  opacity only, as `mascot.css` does.
- **One berry per frame** (DESIGN-GOALS). Where a reaction needs Bloom on a screen that already
  has one, reuse that one; never add a second.
- **No em dashes.** One-line comments that name any non-obvious React pattern (the owner reads
  React but is not fluent in it), e.g. `// key={n} remounts the overlay so the animation replays`.
- **Sound is parked.** Where the timing table names a `cue`, call nothing. Do not add a `playCue`
  stub; a no-op hook nobody calls is dead code.

## 1. Every Bible state and its decision

Decision key:
- **Compose**: existing mood + behaviour + state; no new motion code.
- **New value**: a new entry on an existing axis (behaviour, state, outcome).
- **New keyframes**: new CSS keyframes or an overlay beside the berry.
- **Wire**: built already, needs a trigger or a placement.
- **Parked**: not built in this run, with the reason.

Owner family in brackets: [AMB] ambient, [ANS] answers, [PRO] progression, [CHM] chemical,
[COS] costumes, [WIR] wiring+gallery. Section 4 lists who owns which file.

### A. Ambient

| Bible state | Tier | Decision | Composition and build |
|---|---|---|---|
| Idle breathe | T1 | Compose (built) | neutral + curious + idle, plus `MODIFIERS.breathing`. No retune (section 7). |
| Blink and glance | T1 | Built blink; **new**: glance [AMB] | Blink is built. Glance: the renderer starts reading `MoodShape.lookX/lookY` (defined today, read by nothing), and Berry gains an optional `lookAt` prop (a direction, -1 to 1 on each axis). With no `lookAt`, a seeded glance schedule (deterministic, like the blink clock) looks off every 3 to 6s and back. Pure schedule in `berryGlance.ts`. |
| Bored, 20s no input | T2 | **New value** `sigh` behaviour [AMB], trigger [WIR] | sleepy mood + `sigh` (reactive, returns to idle). Sink, a slow tilt, back; then the eyes look at the user (lookAt 0,0). No foot tap or roll: there are no feet, and a roll on a flat SVG reads as a tumble. Fires once per idle spell, never loops. |
| Peek during a mechanism problem | T2 | **New value** `peek` behaviour [AMB], wire [WIR] | curious + `peek` then leanIn. `peek` rises from below its anchor with one overshoot. The TrainerScreen berry (`tabs/trainer/engine/TrainerScreen.tsx:646-653`) plays `peek` on mount and passes `lookAt` toward the last arrow drop. It already hides while choosing; that is the duck-out. |
| Dormant, 7+ days | T3 | **Parked** | No days-away signal exists, and rebuilding one would revive the removed Return bonus (`ECONOMY.md` supersession, 2026-08-27). Dust and cobwebs also read as a guilt trip for leaving. The friendly half (Duolingo's family 14, peek then wave, no sad frame) is built as the return greet below, so the motion is ready if the owner later adds a signal. |
| Return greet (Duolingo 14, the forward-only replacement for dormant and streak lost) | n/a | Compose [WIR] | happy + `peek` chained into `wave`. Mounted on the Feed's existing "Welcome back" card (`tabs/feed/feedModel.ts:238-274`, rendered at `FeedTab.tsx:304`), which has no Bloom today. Uses whatever condition already shows that card; adds no new condition. |
| Zen focus, timed quiz | T2 | **Parked** | No timed mode exists ("Nothing here is timed", `McqBeatView.tsx:156`). Adding a clock is a product decision, not a mascot one. focused + idle is ready if one ships. |

### B. Answer reactions

| Bible state | Tier | Decision | Composition and build |
|---|---|---|---|
| Correct | T1 | Compose (built), **wire** [WIR] | neutral + happy + squash then bounce + three sparkles, unchanged. The work is wiring it onto the main lesson path (section 3), where today nothing reacts. |
| Combo 3 / 5 / 8 | T1 | Built chain; **new keyframes** overlay [ANS] | Chain stays bounce x2 / x3 / x4 (pinned). Escalation is drawn beside the berry, keyed on `reaction.combo`: 3 = three sparkles (existing), 5 = six sparkles, 8 = a 24-piece confetti burst that stays inside the stage. No fist pump or spin: no arms, and a spin would change the pinned chain. Capped at 8; breaking a combo plays nothing. |
| Near miss | T2 | Compose (built), **wire** [WIR] | thinking + leanIn, unchanged. MCQ has no near-miss outcome, so it fires only where a grader already yields one (trainer, LessonPlayer). Do not invent a near-miss grade for MCQ. |
| Wrong | T1 | Compose (built), **wire** [WIR] | neutral + sad + squash, 900ms hold, settles to curious + leanIn. Unchanged; see conflict 5 in section 2 for why it stays. |
| Wrong again, hint offer | T2 | **New value**: outcome `wrongAgain` [ANS], wire [WIR] | A second miss on the **same item** returns curious + leanIn with `hint: true` and no sad hold. The berry leans toward the problem; the hint offer is the tray's existing hint control getting the attention ring (1s, 1 to 1.5 scale, fading). No pointing arm. The `missRun` charred rule still wins when it applies. |
| Thinking, 15s mid-item | T2 | Compose + **new keyframes** lone pair [ANS], idle timer [AMB], wire [WIR] | thinking + idle, plus a floating lone pair: two dots side by side above the head, the ":" of a lone pair, bobbing slowly (the right dot a beat behind), opacity 0.7 to 1. Under reduced motion it holds still and fully visible. Replaced the three rising thought dots on the owner's answer to question 7. Starts at 15s without input on an unanswered item, clears on any input. |
| Panic, last 10s timed | T3 | **Parked** | Timed mode only, and no timed mode exists. |
| Oxidized, third miss | T3 | Compose (built), **wire** [WIR] | charred + sad + stressed, smoke, darken 0.75, caption `CHARRED_LINE`. Unchanged. No cough (conflict 4). |
| Reduced, after oxidized | T3 | **New keyframes** [ANS] | On the next correct after charred, the existing `flashKey` ring plays and the stage wrapper puffs: uniform scale 1 to 1.08 to 1 plus brightness 1.15 fading to 1, 600ms. Uniform scale lives on the wrapper because a pose cannot change volume by design. |

### C. Progression

| Bible state | Tier | Decision | Composition and build |
|---|---|---|---|
| XP pop | T1 | Built in the Hud; **new keyframes** for the lesson end [PRO] | The Hud `XpStage` is built but lessons render outside Shell, so the pop plays late. Add a "+N XP" chip that floats off the reward berry on the lesson-complete screen (pop in, rise 32px, fade). The Hud pop is unchanged. |
| Diamond catch | T1 | **New keyframes** `BloomCatch` [PRO] | The diamond falls toward the berry (ease-in), Bloom goes wideEyed as it falls and bounces as it lands, the diamond rests above the head (there are no arms: "holds it up" is the diamond sitting on top, bobbing once), then flies to the counter. Used on the lesson-complete screen and in `chest/ChestOpening.tsx`, which has no Bloom today. |
| Lesson complete | T1 | Compose + **new keyframes** `BloomLessonComplete` [PRO] | cheer + celebrate, entering from below with one overshoot, CSS confetti, the pose held while the summary counts up. CONTINUE live by 1500ms. Replaces the bare 96px Berry in BeatRunner's `RewardSlot`. |
| Unit complete, quiz passed | T2 | Compose + **new keyframes** [PRO] | **proud** + celebrate (MASCOT.md's row; `ExamEnd.tsx:74` uses cheer today), a trophy rising behind, 40-piece confetti, CTA live by 2000ms. The path lighting up behind and the camera pull are **parked**: they belong to the pathway map, which no family owns in this run. |
| Level up | T2 | **New keyframes** `BloomLevelUp`, lazy [PRO] | proud + celebrate on a wrapper that grows to 1.15 and back, a glow ring 1 to 1.5 fading, the badge rolling to the new level. Trigger: the stage number changing inside `app/ui/Hud.tsx` `XpStage` (`:444-560`). It plays where the Hud is, on return to a tab, which is honest about where the level is shown. |
| "Bloom is evolving!" easter egg | n/a | **New keyframes**, lazy, inside `BloomLevelUp` [PRO] | Dark screen, silhouette, white flash, Bloom the same size in a marginally larger hat. Caption exactly as MASCOT.md: "Bloom did not evolve. Bloom got a hat." Plays on a stage change at most once per stage, tap to skip, under 2.4s. Genre trope only: no borrowed sprite, name or sound. Reduced motion: the caption and the hat, no flash. |
| Streak lit | T1 | Compose + **new keyframes** [PRO], mount on main path [WIR] | excited + bounce (MASCOT.md's row; `StreakScreen.tsx:389-418` uses calm + wave today), the flame igniting **behind** Bloom and scaled by length: `flameScaleFor(days)` (pure, tested). Today only LessonPlayer shows `StreakScreen`; [WIR] mounts it after BeatRunner's reward when the receipt read at `BeatRunner.tsx:402` says the streak was just counted. |
| Streak at risk | T2 | **Parked in app** | The Bible calls it push-notification art; MASCOT.md says the nightcap is notification art only and no notification surface exists. In app, a worried Bloom guarding a flame is the anxiety loop the economy's mitigations exist to prevent. The Hud flame's existing `hud-flame-risk` class stays the only in-app signal. |
| Streak lost | T2 | **Parked** (conflict 2) | No grief beat, no smoke, no "lost" state (`hudModel.ts:144` has none, by design). When the streak restarts it is simply lit at day 1 with the normal Streak lit beat. Copy never mentions the loss. |
| Streak saved by a rest day (MASCOT.md extra) | n/a | Compose [PRO] if the data exists | calm + wave on `StreakScreen` with the after-the-fact line ("Tuesday was a rest day. Streak safe at 47.", `ECONOMY.md`). Build only if the streak receipt already says a rest day was used; if it does not, park it and say so. Do not add an economy field. |

### D. Chemical

| Bible state | Tier | Decision | Composition and build |
|---|---|---|---|
| Protonated | T2 | Built; **wire** via topic table [CHM] | State exists. New pure table `stateForNode(nodeId)` maps acid/base and leaving-group nodes to `protonated`. |
| Deprotonated | T2 | **New value** state `deprotonated`, built 2026-10-25 (Q3) [CHM] | Cool blue (a CSS filter keyed on `data-state="deprotonated"`), a ":" lone-pair badge, and the serene line: the calm and curious faces level their mouth on this state, every reaction mood keeps its own. Lazy CSS with the other three. Nodes: `u9-pka`, `u9-kvt-enolate`, `u11-acidity` (live beat lessons); `u9-halo-base`, `u11-phenoxide` mapped but unseen (reaction lessons do not read the table). |
| Carbocation | T2 | Built; wire via topic table [CHM] | SN1 / E1 / rearrangement nodes. Composed with mood stressed for "visibly unstable and knows it" (gallery preset). |
| Radical | T3 | Built; wire via topic table [CHM] | Radical halogenation nodes. "Chaotic eyes" composes as mood excited. |
| Resonance | T2 | Built; wire via topic table [CHM] | Delocalization nodes. |
| Aromatic | T3 | Built; wire via topic table [CHM] | Aromaticity nodes. "Deeply smug" composes as mood proud. |
| Mind blown, first resonance reveal (top card) | n/a | Compose [CHM data], trigger [WIR] | resonance + excited + wideEyed, once per learner: the first time a resonance state is shown. Pure `isFirstResonance(seen)` plus a one-key local flag. Hook: the first `resonance` beat in BeatRunner (`BeatRunner.tsx:795`). |
| Nucleophile | T2 | **Parked** | Needs an arrow-arm drawing and a live electrophile target on the canvas; the trainer's arrow engine owns that canvas and no family touches it in this run. Not in MASCOT.md's decomposition either. |
| Oxidized / Reduced | T3 | See B | Built through `charred`; Reduced is [ANS]. |
| Excited state | T3 | **New value + new keyframes**, lazy CSS, built 2026-10-25 (Q3) [CHM] | Glow halo, 0.8px hum, a photon dot emitted upward every 2400ms as the glow drops back. Named `excitedState` so it never collides with the mood `excited`. Nodes: `u6-uv` (live); `u12-22` mapped, no lesson yet. |
| Enantiomers | T3 | **New value**, lazy CSS, built 2026-10-25 (Q3) [CHM] | Two solid copies (`ghostCount: 2`), the second mirrored, a dashed mirror plane, R and S chips on the berry's own box so they read at 40px. Both copies sit under the one pose transform, so the twin copies every hop. Nodes: `u13-fischer`, `u14-strecker`, `u5-sharpless`, none of which has a lesson, so **gallery-only today**. |
| Solvated | T3 | **New value**, lazy CSS, built 2026-10-25 (Q3) [CHM] | A shell of six water molecules (O and two H each, box-shadows of one element) turning once per 9000ms, kept inside the berry's box. Slow motion is `pace: 0.5` on the state: Berry.tsx runs the idle clock and breathing at half speed, reactions at full speed. Node: `u14-zwitterion` (the map has no dedicated solvent-effect node), which has no lesson, so **gallery-only today**. |
| Charged (repo extra) | n/a | Built and wired | Unchanged. |

MASCOT.md deferred Deprotonated, Excited state, Enantiomers and Solvated because they need
"particle work rather than a transform", and `berryState.test.ts` pinned that deferral. The owner
lifted it on 2026-10-25 (section 7 Q3), which is what changed those pinned counts. All four ship
in one lazy stylesheet, `bloom-chem-states.css`, fetched by `berryStateStyles.ts` from an effect
in `Berry.tsx` the first time one of them renders.

**What a learner sees today.** Only beat lessons read `NODE_STATE` (`stateForNode` in
`BeatRunner.tsx`, `bloomLookForNode` in `BeatRunner.tsx` and `McqRunner.tsx`). A node with no
`playable` in `demo/pathwayMap.ts`, or a `reaction` one, has the mapping and nothing to mount it
on. So **enantiomers and solvated are gallery-only**: the map has no playable stereochemistry or
solvent-effect node, and every node they are mapped to is lesson-less. Excited state shows only on
`u6-uv`; deprotonated only on `u9-pka`, `u9-kvt-enolate` and `u11-acidity`. The mapping stays,
so each state turns on by itself when its lesson lands. `berryTopicState.test.ts` pins the
gallery-only list, so that day fails a test and this paragraph gets updated.

### E. Costumes

| Costume | Decision |
|---|---|
| Goggles and lab coat | Built. **Wire** onto the main lesson path: reaction nodes pass `labcoat` (helper below), goggles down while working. |
| Tweed and pointer | Built. Wire: concept nodes. "Slightly more formal posture" is costume art only (costumes never change a pose, MASCOT.md). |
| Trench and loupe | Built. Wire: spectroscopy and structure nodes. |
| Backpack and map | Built-but-unwired. Wire: branch nodes off the spine. |
| Whistle and stripes | Built-but-unwired. Wire: unit quiz and test-out (`ExamEnd.tsx`, PracticeRunner). Plays no mid-quiz cheer; celebrates only at the end, which is how `ExamEnd` already works. |
| Nightcap | Built. Notification art only; shown in the gallery, never in app. |
| Cape | Built-but-unwired. Wire: `tabs/leaderboards/LeaderboardsTab.tsx:86` swaps the bare `BlueberryMark` for a `Berry` in the cape, only when the student places. |
| Seasonal skins (diamond sink) | **Parked.** No cosmetic shop or inventory exists, and the Duolingo "suit is yours" reveal has no surface to live on until one does. |
| Costume change | **New keyframes** [COS]: when a berry's costume changes, a 300ms wiggle (tilt 0, 4deg, -3deg, 0) on the costume layer only. Reduced motion: an instant swap. |

New pure helper [COS]: `costumeForNode(nodeId)` in `berryCostume.ts`, built on the existing
`costumeForSurface` and `SURFACE_COSTUME`, so the lesson path can dress the berry without each
surface re-deriving it.

## 2. Conflicts between the Bible and the repo rules, and how they resolve

The task brief summarised the repo as "no streak-loss anxiety loop, no decay". That was the v1
rule. `CLAUDE-blueberry-game.md:288-296` and `ECONOMY.md` "Supersession, 2026-08-27" amended it: a
streak, Charge and decaying mastery all ship, and fear of loss is answered by rest days, automatic
freezes, the exam-window pause, Charge never pricing a mistake, a capped mastery dip and rank
floors. The working rule for builders: **reward returning, never punish leaving, never punish a
mistake, and stay inside those mitigations.**

1. **Streak at risk** (worried, shielding a flame): parked in app. Notification art only.
2. **Streak lost** (flame out, smoke, a beat of grief): parked. The restart is an ordinary Streak
   lit at day 1. No loss copy, no smoke, no Bloom on a zero streak.
3. **Dormant** (dusty, cobwebbed): parked, and the friendly half ships as the return greet. No
   days-away signal is built, because that would revive the removed Return bonus.
4. **Oxidized** (coughs): no cough. Darken stays 0.75 so the face is readable, the caption stays on
   the student's side, the sad face holds 900ms and the char clears on the next correct.
5. **Wrong** ("flinch back, eyebrows up, never frowns at the user"): the shipped reaction is sad +
   squash for 900ms, then curious + leanIn. MASCOT.md sanctions exactly that, under the one-second
   rule, and `berryReaction.test.ts` pins it, so it stays. The Duolingo alternative (no sad frame,
   tilt toward the problem, only the wrong option card shakes) is an owner question in section 7,
   not a builder change.
6. **Panic, Zen focus**: parked; they need a timed mode the product does not have.
7. **Combo**: capped at tier 8, and breaking a combo plays nothing, so escalation never becomes a
   pressure loop.
8. **Level-up easter egg**: trope, never property.
9. **Rive for section F**: the Bible itself defers to MASCOT.md, and the task's hard rule is CSS
   and SVG only. CSS and SVG it is.

## 3. Motion timing table

### 3a. Units and how they map onto the engine

- Body motion is keyframe data in `berryBehaviour.ts`, sampled by Berry's single rAF loop.
  `scaleY` is authored and `scaleX` is derived in `poseAt`, so volume is preserved by
  construction. Squash amounts below are therefore `scaleY` only.
- `lift` is in **body radii**. Duolingo's heights are percent of the berry's height, and the
  height is two radii, so `-18%` of height is `lift: 0.36`. The shipped `bounce` peak (0.34)
  already matches the Duolingo correct hop, which is why correct is not retuned.
- Overlays (sparkles, dots, confetti, diamonds, flames, glow) are CSS, timed by the custom
  properties below.
- Uniform growth (level up, the Reduced puff) cannot be a pose. It is a CSS transform on the stage
  wrapper, `transform-origin: 50% 100%`.

### 3b. Shared CSS custom properties

File: `src/game/mascot/bloom-motion.css` [AMB], imported once by `Berry.tsx`. The `--bloom-`
prefix is deliberate: `--bb-ease-out` and `--bb-dur-press` already exist in `src/tokens.css`
with **different** values from the Duolingo sheet, so reusing those names would silently retime
the site. Where a site token already has the exact curve, alias it.

```css
:root {
  --bloom-ease-pop: var(--bb-ease-sheet);              /* .35,1.8,.35,.83, big overshoot */
  --bloom-ease-settle: var(--bb-ease-spring);          /* .34,1.56,.64,1, small overshoot */
  --bloom-ease-out: cubic-bezier(.22, 1, .36, 1);      /* ease-out-quint, card moves */
  --bloom-ease-windup: cubic-bezier(.6, -.28, .735, .045); /* anticipation */
  --bloom-ease-breathe: cubic-bezier(.45, 0, .55, 1);  /* sine in-out, loops */
  --bloom-ease-fall: cubic-bezier(.5, 0, .75, 0);      /* accelerate into a target */
  --bloom-dur-fast: 200ms;
  --bloom-dur-base: 400ms;
  --bloom-dur-slow: 700ms;
  --bloom-dur-crossfade: 150ms;                        /* the only motion under reduced */
}
```

### 3c. Shared TS constants

File: `src/game/mascot/bloomMotion.ts` [AMB]. Pure data, no React, no DOM, same contract as the
siblings. Every builder imports from here rather than typing a number. Values in ms unless named
otherwise. Names are binding; the comments are the reasoning.

| Constant | Value | Used by | Source |
|---|---|---|---|
| `REACTION_BUDGET_MS` | 200 | [WIR] tests | Bible B |
| `GLANCE.gapMinMs` / `gapMaxMs` | 3000 / 6000 | [AMB] | Bible A |
| `GLANCE.moveMs` / `holdMs` | 200 / 900 | [AMB] | Duolingo 6 |
| `GLANCE.eyesLeadMs` | 80 | [AMB] eyes move before the head | Duolingo 6 |
| `GLANCE.maxLook`, `GLANCE.minReach` | 1, 0.7 | [AMB] a glance reaches 0.7 to 1 of the eye travel | measured at 40px: 0.6 (the first pick) moved the face about 1.3 screen px and did not read |
| `IDLE.thinkingAfterMs` | 15000 | [AMB] timer, [ANS] dots | Bible B (Duolingo says 6s; the owner's Bible wins) |
| `IDLE.boredAfterMs` | 20000 | [AMB] | Bible A |
| `SIGH` | 1400ms; scaleY 0.94 at 0.35; tilt 0.05 rad at 0.6; rest at 1 | [AMB] behaviour `sigh` | chosen on `--bloom-ease-breathe` |
| `PEEK` | 600ms; lift -0.8 at 0, 0.06 at 0.7 (scaleY 1.06), 0 at 1 | [AMB] behaviour `peek` | Duolingo 14 |
| `LONE_PAIR` | loop 2400, stagger 160, opacity 0.7 to 1, bob 50% of a dot | [ANS] | Owner, question 7 (was `THOUGHT_DOTS`, loop 1200, opacity 0.3 to 1, Duolingo 6) |
| `COMBO_SPARKLES` | `{3: 3, 5: 6, 8: 6}` | [ANS] | Duolingo 3 |
| `COMBO_CONFETTI` | at 8 only: 24 pieces, 1200ms, `--bloom-ease-fall` | [ANS] | Duolingo 3, capped |
| `HINT_RING` | 1000ms, scale 1 to 1.5, opacity 0.6 to 0, once | [ANS] | measured attention ring |
| `REDUCED_PUFF` | 600ms, scale 1.08 at 0.35, brightness 1.15 to 1, `--bloom-ease-settle` | [ANS] | Bible B, Duolingo curve |
| `XP_FLYER` | pop 0 to 1.2 to 1 over 240; rise 32px and fade over 240 to 900 | [PRO] | Duolingo 7 |
| `CATCH` | hang 80, fall 600 (`--bloom-ease-fall`), rest 700, fly to counter 500 (`--bloom-ease-out`) | [PRO] | Duolingo 8 |
| `LESSON_COMPLETE` | entry 500 from translateY 40%, land 120, headline at 600, stats from 800 staggered 120, count-up 600, CONTINUE live by 1500 | [PRO] | Duolingo 9 |
| `UNIT_COMPLETE` | trophy rise 400 (`--bloom-ease-out`), confetti 40 pieces over 1500, CTA live by 2000 | [PRO] | Duolingo 10 |
| `LEVEL_UP` | dip 0.95 over 120, grow to 1.15 and back over 600 (`--bloom-ease-pop`), ring 1 to 1.5 fading over 1000, badge roll 300 | [PRO] | Duolingo 11 |
| `EVOLVING` | dark 400, silhouette 800, flash 160, reveal and caption; under 2400 total; tap skips | [PRO] | MASCOT.md |
| `STREAK_LIT` | flame .4 to 1.25 to 1 over 360 (`--bloom-ease-pop`), flicker scaleY .96 to 1.04 loop 600, day roll 400, dots stagger 80 | [PRO] | Duolingo 12 |
| `flameScaleFor(days)` | `min(1.6, 1 + 0.12 * log2(max(1, days)))` | [PRO] | Bible "scales with streak length", capped so it never leaves the card |
| `CHEST` | shake ±4deg x3 at 80 each, lid at 240 over 200 (`--bloom-ease-pop`), reward rise 400 | [PRO] | Duolingo 13 |
| `COSTUME_WIGGLE` | 300ms, tilt 0, 4deg, -3deg, 0 | [COS] | Duolingo costume reveal |
| `EXCITED_STATE` | glow pulse 1200 loop, photon every 2400, photon rise 600 | [CHM] | chosen |
| `SOLVATED_ORBIT` | 9000ms per turn | [CHM] | chosen, slow on purpose |

Global rules from the sheet: one overshoot per beat, never a repeated wobble; a celebration never
holds CONTINUE past 1500ms (2000ms for a unit); squash pivots at the base. Under reduced motion,
every row above collapses to its final frame plus `--bloom-dur-crossfade`.

## 4. Trigger table: game event, reaction, hook

All hooks below are [WIR] unless marked. Line numbers are from the inventory on 2026-10-24;
confirm each before editing, because other work is landing in the same tree.

| Event | Fires at | Reaction | Bloom on screen today? What to do |
|---|---|---|---|
| MCQ graded (lesson, recycle, meet, practice, test-out) | `beats/mcq/McqRunner.tsx:158-166`, after `commitPick` | `reactionFor(outcome, run)` with `run` from `currentRun(session)` (`beats/mcq/session.ts:236`) and a new `currentMissRun(session)` [WIR adds, tested]. `wrongAgain` when the same item was already missed | **No.** The bar berry (`McqBeatView.tsx:465-467`) unmounts when the tray rises. Keep exactly one Berry: move it into the `AnswerTray` header at 56px while the tray is up, so the same moment has one berry and one effect. Remove the static 36px how-to berry's role only if it would make two berries in one frame. |
| Match result | `beats/match/MatchBoard.tsx:285` (`onComplete`) | correct or wrong from the board's result | No Berry. Add the reaction to the result area inside the view, not to BeatRunner. |
| Sort result | `beats/sort/SortBeatView.tsx:366` (`onResult`) | same | No Berry. Same rule. |
| Synthesis result | `beats/synthesis/SynthesisGapBeat.tsx:225` (`onResolved`) | same | No Berry. Same rule. |
| Pool item done | `beats/PoolItemsStep.tsx:68` | per item: the runner's own result | No Berry. Same rule. |
| Trainer verdict | `tabs/trainer/engine/TrainerScreen.tsx:346, 364, 369, 386, 395` | unchanged table | Yes. But the reaction waits for `afterRise` (`:306-315`, `RISE_MS` 200 in `FeedbackSheet.tsx:30`), so the face lands at 200ms plus a render, on the edge of budget. Swap the **mood** at t=0 and let only the body motion wait for the sheet. |
| LessonPlayer graded | `lesson/LessonPlayer.tsx:210-237` | built | Yes. Leave it; do not migrate it to the shared hook in this run. |
| Combo milestone | McqRunner, same site as grading | combo overlay [ANS] on the tray berry; tray chip `AnswerTray.tsx:108, 128` gets the pop scale (0 to 1.15 to 1, 240ms) | Tray berry, see first row. |
| Third consecutive miss | McqRunner, needs `currentMissRun` | charred, caption `CHARRED_LINE` in the tray | Tray berry. Clear the char on the next correct with `flashKey` + the Reduced puff. |
| 15s without input on an unanswered item | new `useIdleInput` [AMB] mounted in `McqBeatView` | thinking + idle + lone pair | The bar berry, which is on screen before the tray. |
| 20s without input on an ambient screen | `useIdleInput` mounted where an ambient Berry already stands: `PathMascot` on the path | sleepy + `sigh`, then lookAt the user | Yes (`PathwayTab.tsx:844-847`). |
| Mechanism canvas | TrainerScreen mount and arrow drops (`:399, :428, :637`) | `peek` on mount, `lookAt` the last drop | Yes. |
| Lesson complete | `BeatRunner.tsx` reward phase, `RewardSlot` at `:1069` (challenge end `:1023`) | `BloomLessonComplete` [PRO] + XP flyer + `BloomCatch` for the diamonds (`:1043`, `:1089`) | Yes, a bare 96px Berry. Replace it with the [PRO] component. |
| Streak counted on the main path | receipt read at `BeatRunner.tsx:402` | `StreakScreen` [PRO upgraded] after the reward | No streak screen on BeatRunner. Mount the existing one, as LessonPlayer does at `:281-285`. |
| Unit / stage quiz passed, test-out passed | `beats/practice/ExamEnd.tsx:74`; `tabs/pathway/TestOutRun.tsx:78-100` | proud + celebrate + trophy [PRO], referee costume | Yes (104px). [PRO] edits `ExamEnd` directly. |
| Chest opened | `chest/ChestOpening.tsx:125-186` (via `ChestHost`, `Shell.tsx:470`) | leanIn + wideEyed during the shake, bounce on the lid, `BloomCatch` flying diamonds [PRO] | **No.** [PRO] adds one Berry inside `ChestOpening`. |
| Level / stage change | `app/ui/Hud.tsx` `XpStage`, `:444-560` | `BloomLevelUp` (lazy) [PRO], easter egg once per stage | Yes, the 36px Hud Bloom. The lazy component overlays the screen. |
| Path node unlocked | `tabs/pathway/unlockCelebration.ts` `readCelebration`, `PathwayTab.tsx:1782`, FX `:852-882` | happy + bounce once as the unlock FX plays | Yes, `PathMascot` stands on the new node but ignores the unlock. |
| First resonance shown | first `resonance` beat, `BeatRunner.tsx:795` | resonance + excited + wideEyed, once per learner [CHM data] | Yes, the TrainerScreen berry. |
| Lesson topic has a chemical state | lesson mount, by node | `stateForNode(nodeId)` [CHM] on the bar berry | Yes, the bar berry. |
| Lesson surface has a costume | lesson mount, by node | `costumeForNode(nodeId)` [COS] on the bar and tray berry | Yes. |
| Leaderboard placement | `tabs/leaderboards/LeaderboardsTab.tsx:86` | cape [COS] | Bare `BlueberryMark`; [COS] swaps it. |
| Returning (Feed welcome card) | `feedModel.ts:238-274`, `FeedTab.tsx:304` | happy + `peek` then `wave` | **No.** Add one Berry to the card. |
| Timed quiz, streak at risk, streak lost, days away | do not exist or are parked | none | Parked, section 2. |

**One-line React notes for the wiring:** a reaction replays with the same name by bumping
`behaviourKey`, which is a counter the renderer watches; an overlay replays by changing its `key`,
which makes React unmount and remount it so the CSS animation restarts.

## 5. File ownership: six families

Each file has exactly one owner. Builders share one working tree and stage by path, so two
families editing one file would commit each other's half-finished work. If you need a change in a
file you do not own, ask its owner through the orchestrator; do not make it.

**Step 0, before anyone commits:** [AMB] lands the foundation as its first commit:
`bloomMotion.ts`, `bloom-motion.css`, the `sigh` and `peek` behaviours, Berry's `lookAt` prop,
the `import "./bloom-motion.css"`, and moving Berry's per-state label map (`Berry.tsx:90-98`) into
`berryState.ts` as `STATE_LABEL` so [CHM] can add states without touching `Berry.tsx`. Other
families may write their own files in parallel against the names in this spec, but commit only
after the foundation commit exists.

| Family | Owns (create or edit) | Must not touch | New tests (in `src/game/test/`) |
|---|---|---|---|
| **[AMB] ambient** | `mascot/Berry.tsx`, `mascot/berryBehaviour.ts`, `mascot/berryMood.ts`, new `mascot/bloomMotion.ts`, new `mascot/bloom-motion.css`, new `mascot/berryGlance.ts`, new `mascot/useIdleInput.ts` (+ its pure `idleStage(msSinceInput, context)`) | everything else | `berryBehaviour.test.ts` (every behaviour finishes or loops, `sigh` and `peek` return to idle, keyframes start and end at rest, `at` ascending); `berryGlance.test.ts` (deterministic for a seed, gaps inside 3000 to 6000, look within `maxLook`); `bloomIdle.test.ts` (15s thinking only mid-item, 20s bored only ambient, input resets) |
| **[ANS] answers** | `mascot/berryReaction.ts`, `mascot/useBerryReactions.ts`, new `mascot/BloomStage.tsx` (the wrapper with `data-reduced`, combo sparkles and confetti, lone pair, hint ring hookup, Reduced puff), new `mascot/bloom-answers.css` imported by `BloomStage` | `Berry.tsx`, any beat view | extend `berryReaction.test.ts` with **new** cases only: `wrongAgain` (curious + leanIn, no sad hold, `hint: true`), charred still wins at 3 misses, `comboOverlayFor(combo)` returns 3 / 6 / 6 sparkles and confetti only at 8, nothing for a broken combo |
| **[PRO] progression** | new `mascot/progression/BloomLessonComplete.tsx`, `BloomCatch.tsx`, `BloomXpFlyer.tsx`, `BloomLevelUp.tsx` (includes the easter egg), `bloom-progression.css`, `progression.ts` (pure: `flameScaleFor`, `stageChanged`, `shouldPlayEvolving`); edits `beats/practice/ExamEnd.tsx`, `lesson/StreakScreen.tsx` (+ `lesson/streak.css`), `chest/ChestOpening.tsx`, `app/ui/Hud.tsx` (only the `XpStage` level-change detection and the lazy mount) | `BeatRunner.tsx` (wiring mounts [PRO] components there), `hudModel.ts`, `packages/economy` | `bloomProgression.test.ts`: `flameScaleFor` (1 at day 1, monotonic, capped 1.6), `stageChanged`, `shouldPlayEvolving` once per stage; keep `hudXpMoment.test.ts` and `hudAnatomy.test.ts` green |
| **[CHM] chemical** | **Shipped (65a54cb):** `mascot/berryTopicState.ts` and its test. **Built 2026-10-25 after Q3:** `mascot/berryState.ts` (states `deprotonated`, `excitedState`, `enantiomers`, `solvated`; badge union; `STATE_LABEL`; `pace`), new `mascot/bloom-chem-states.css` (all four, lazy), new `mascot/berryStateStyles.ts` (`loadStateStyles(state)`: dynamic `import("./bloom-chem-states.css")` for those four only), the `NODE_STATE` rows, and the `Berry.tsx` effect and pace hook | `Berry.tsx`, content files | extend `berryState.test.ts` with new cases: every new state has a shape and a label, enantiomers has two ghosts, deprotonated badge is ":"; `berryTopicState.test.ts`: real node ids from the pathway (read, never edit, `demo/pathwayMap.ts`) map to the right states, unknown nodes give neutral |
| **[COS] costumes** | `mascot/berryCostume.ts` (`costumeForNode`), `mascot/BlueberryMark.tsx` (costume art, the wiggle hook), new `mascot/bloom-costumes.css`, `tabs/leaderboards/LeaderboardsTab.tsx` (cape on placement only) | `Berry.tsx`, beat views | `berryCostume.test.ts` (none exists): every surface maps to a costume, nightcap never returned for an in-app surface, `costumeForNode` gives backpack for branch nodes, labcoat for reaction nodes, referee for unit quizzes |
| **[WIR] wiring + gallery** | `beats/mcq/McqRunner.tsx`, `beats/mcq/McqBeatView.tsx`, `beats/mcq/session.ts` (`currentMissRun`, `missedThisItemBefore`), `beats/AnswerTray.tsx`, `beats/match/MatchBoard.tsx`, `beats/sort/SortBeatView.tsx`, `beats/synthesis/SynthesisGapBeat.tsx`, `beats/PoolItemsStep.tsx`, `beats/BeatRunner.tsx` (see the warning below), `tabs/trainer/engine/TrainerScreen.tsx`, `tabs/pathway/PathMascot.tsx`, `tabs/pathway/PathwayTab.tsx` (unlock reaction only), `tabs/feed/FeedTab.tsx`, `mascot/BerryGallery.tsx`, `admin/AdminViewer.tsx`, `admin/admin.css` | `game/App.tsx`, `admin/slides.ts`, `signoff/**`, content | `mcqBeat.test.ts` or a new `bloomWiring.test.ts` in the pattern of `trainerMascotWiring.test.ts`: McqRunner calls `reactionFor` in the commit handler (same tick as the grade), exactly one Berry in the tray frame, `currentMissRun` counts and resets on a correct; `trainerMascotWiring.test.ts` gains a case that the mood swaps before `afterRise`; a gallery test that every `BERRY_STATES`, `BERRY_MOODS`, behaviour and costume appears |

**The gallery.** `BerryGallery` already lives at `#/gallery/berry`, lazy, and exempt from
onboarding. [WIR] makes it show every mood, every behaviour (with a replay button that bumps
`behaviourKey`), every state including the new ones, every costume, and one row per Bible state
from section 1 labelled with its Bible name and decision (parked rows say "parked" and why). A
**reduced-motion toggle** at the top passes `reducedMotion` to every Berry and `data-reduced` to
every `BloomStage`. Reach it from the staff viewer: a link in `admin/AdminViewer.tsx` to
`#/gallery/berry`. `game/App.tsx` is not edited; the route already exists.

**Warning on `BeatRunner.tsx`.** It currently carries another workflow's uncommitted hunks (the
Unit 0 story scene). [WIR] edits it last and keeps its edits to mounting [PRO] components and the
streak screen. Before staging, run `git diff src/game/beats/BeatRunner.tsx`. If foreign hunks are
still there, do not stage the file: leave the edit in the tree, say so in the report, and let the
orchestrator commit it after the other workflow lands. Never revert or stash their hunks.

## 6. Payload plan

The #/app first paint is weighed at about 342 KB gz against a 400 KB ceiling. `Berry` is on it,
statically imported by `app/ui/Hud.tsx:181` inside Shell, and `mascot.css` ships eagerly through
`theme.css`. So anything that `Berry.tsx`, `berryBehaviour.ts`, `berryMood.ts`, `berryState.ts`,
`berryCostume.ts`, `BlueberryMark.tsx`, `mascot.css` or `Hud.tsx` imports statically is first
paint.

| What | Where it ships | Budget (gz) |
|---|---|---|
| `bloomMotion.ts`, `bloom-motion.css`, `sigh` and `peek` data, glance schedule, `lookAt`, `useIdleInput` | Eager, through Berry | 3 KB [AMB] |
| New state shapes, labels, the pace hook in Berry, `berryStateStyles.ts` (a set plus one dynamic import) | Eager | 1 KB [CHM] |
| All four late states' CSS (`deprotonated`, `excitedState`, `enantiomers`, `solvated`) | **Lazy**, `bloom-chem-states.css`, loaded the first time such a state renders | 0 eager |
| `costumeForNode`, wiggle CSS | Eager (costume art already is) | 1 KB [COS] |
| `XpStage` stage-change check and the `React.lazy` stub | Eager, in Hud | 0.5 KB [PRO] |
| `BloomLevelUp` and the easter egg | **Lazy**, `React.lazy` from Hud, fetched on the first stage change | 0 eager |
| `BloomLessonComplete`, `BloomCatch`, `BloomXpFlyer`, `bloom-progression.css` | Lesson and chest chunks (not first paint); if `ChestOpening` turns out to be in the entry chunk, lazy-load `BloomCatch` there | 0 eager |
| `BloomStage`, `bloom-answers.css`, McqRunner and tray changes | Lesson chunks (McqRunner is already `lazy` in BeatRunner) | 0 eager |
| Gallery | Lazy, unchanged | 0 eager |

Total eager growth across the run: at most **6 KB gz**. Every family weighs before it commits,
with `npx vite build`, then from `packages/validators`:
`node --experimental-strip-types "C:/Users/zeusa/AppData/Local/Temp/claude/C--Users-zeusa-Downloads-Projects-grignard/f791e72b-4d42-4477-a805-f92fa63cabb4/scratchpad/weigh.ts"`.
A family over its row reports the number and moves the code lazy; it does not ask another family
to shrink. Never touch `validators.lock.json`.

## 7. Open questions for the owner

1. **Shipped numbers vs the Bible.** Blink 110ms vs 90ms, gaps 2.6 to 7.2s vs 3 to 6s, breathing
   3.8s with a 7s tilt vs a 2.4s bob, correct squash 0.78 / 1.04 then 0.86 / 1.18 vs 0.85 / 1.1.
   Keep or retune? The gallery shows the current values side by side at 40, 96 and 160px.
2. **The wrong face.** Keep sad + squash for 900ms (MASCOT.md, tested), or move to the Duolingo
   read (no sad frame, a tilt toward the problem, only the wrong card shakes)? The second needs the
   pinned test changed by the owner's decision, not by a builder.
3. **DECIDED 2026-10-25: build them.** The owner: "build them in, unless they cost too much and
   we can save by pushing them off". Built as section D records, all four on a lazy stylesheet,
   with the pinned counts in `berryState.test.ts` and MASCOT.md's table changed on that answer.
   The question as it was put: **Deprotonated, excited state, enantiomers, solvated: NOT built, parked.** MASCOT.md defers
   all four and `berryState.test.ts` pins it (4 deferred rows, 6 new states, no deferred name in
   the union). This spec told [CHM] both to build them and to extend that same test, so the spec
   and the pinned test disagree, and only the owner can pick. Choices: (a) keep the deferral and
   delete the four rows from section D; (b) lift it: the owner updates the pinned counts in
   `berryState.test.ts` and MASCOT.md's chemical table, then [CHM] adds the four states
   (Deprotonated eager in `mascot.css`, the other three in a lazy `bloom-chem-t3.css` loaded by
   `berryStateStyles.ts`) and maps the pKa and enolate nodes to `deprotonated` in `NODE_STATE`.
   Note for (b): the lazy load needs one `useEffect` in `Berry.tsx` calling
   `loadStateStyles(state)`. [AMB] owns `Berry.tsx`, so that hunk goes to [AMB] or the
   orchestrator, never to [CHM].
4. **Return greet trigger.** It rides the Feed's existing welcome card. A real days-away signal
   would need a decision that does not revive the Return bonus.
5. **Path lighting on unit complete** and the **Nucleophile arrow-arm** are parked for lack of an
   owner in this run.
6. **DECIDED 2026-10-25: keep the spill.** The owner: "keep it". No change. The question as it
   was put: **Combo 8 confetti spills past the stage.** Section 1 says the burst "stays inside the stage".
   As built ([ANS], `confettiPieces`) it lands up to 0.75 of the stage width from the centre (a
   quarter stage past each edge) and rises up to 0.55 of the stage height above the head. Why: the
   berry fills its stage and the confetti passes behind it, so a burst held inside the box is
   almost all hidden, and one that fell straight down covered the eyes at 40px. Keep the spill, or
   hold it inside the box? [WIR]: a tray header with `overflow: hidden` clips it; give the stage
   room or let it overflow.
7. **DECIDED 2026-10-25: a floating lone pair.** The owner: "sure floating lone pair". Thinking
   draws a ":" lone pair, two dots side by side floating above the head, instead of the rising
   dots (built 2026-10-25, `LONE_PAIR` in bloomMotion.ts). The question as it was put:
   **Thought dots shape.** Section 1 asks for three staggered dots and also reads the Bible's
   floating lone pair as a ":" pair. As built it is three dots rising up and to the right, small to
   large, like a thought bubble's tail (`THOUGHT_DOTS` timing). Keep the trail, or draw the lone
   pair as ":" beside the head?
8. **DECIDED 2026-10-25: change the face on the commit frame.** The owner: "sure". The trainer
   swaps Bloom's mood the instant an answer is graded, and the pinned hold-until-`RISE_MS`
   assertion in `trainerMascotWiring.test.ts` changes on that answer. The question as it was put:
   **Trainer reaction timing.** Section 4 asks the trainer to swap Bloom's mood at t=0 and let only
   the body motion wait for the sheet, because `RISE_MS` (200) plus a render sits on the 200ms
   budget. `trainerMascotWiring.test.ts` pins the opposite ("holds the waiting face until RISE_MS
   has passed"), so [WIR] left `TrainerScreen.tsx` as it was. Keep the deferred face, or change the
   pin and swap the mood on the commit frame? Under reduced motion it already reacts at t=0.
9. **DECIDED 2026-10-25: add a Hint button.** The owner: "add hint". The answer tray gets a real
   Hint control, and the hint ring goes on it. The question as it was put: **Hint offer without a
   hint key.** Section B rings "the tray's existing hint control", but the
   answer tray has none. As built the ring goes on the tray's help control: "Why?" when there is
   more to read, else "Why yours isn't it". Most wrong sort ladders carry no authored explanation
   and so no Why?, and there the ring circles the headline, which is the ladder's next step ("Start
   from the ends"). In the MCQ it fires only in the recycle slot (the one place the same question
   comes back), in the sort on a wrong ladder after Try again. The tray body scrolls, so a ring
   swelling to 1.5 was cut at its edges: in the tray it swells to 1.12 from the body edge on a
   Why?, and only fades on a headline (bloom-tray.css). Keep that, or add a real Hint key to the
   tray?

## 8. Commit rules for builders

- Stage only your own files, by path. Never `git add -A`, `commit -a`, `stash`, `checkout --` or
  `reset`. Never push.
- Do not edit, stage, revert or delete: `src/game/content/u0/**`, `u1/**`, `u6/**`, guides,
  `src/game/demo/pathwayMap.ts`, `src/game/signoff/**`, `src/App.tsx`, `src/lib/siteNav.ts`,
  `src/lib/useDocumentTitle.ts`, `vite.config.ts`, `src/game/admin/slides.ts`,
  `src/game/test/_scratch_ft/**`, the root `.jpg`, `validators.lock.json`.
- `bootLoader.test.ts` is red on purpose. Every other test you touch stays green; new behaviour
  gets new tests.
- Scratch files only under
  `C:/Users/zeusa/AppData/Local/Temp/claude/C--Users-zeusa-Downloads-Projects-grignard/f791e72b-4d42-4477-a805-f92fa63cabb4/scratchpad/bloom`.
- Commit messages end with `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.
