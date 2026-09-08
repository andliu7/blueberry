# The mascot: Bloom

Owner direction recorded 2026-08-27. This file extends `apps/web/src/mascot/berryMood.ts` and
`berryBehaviour.ts`. It does not replace them. `CLAUDE.md` holds that the mascot is already built
and is imported, never rebuilt, and `INHERITED-DECISIONS.md` D4 explains why. Nothing below asks
for a rewrite of either file.

## The name

The character is **Bloom**. Blueberry is the product, Bloom is who lives in it.

Three readings at once: bloom is the real word for the pale waxy coating on a blueberry's skin, it
reads as the green calyx tip on the sprite, and it is what a student does over a semester. Use it
in copy as a character with opinions, never as a brand mark.

## Three composing axes, not one flat list

D4 records the existing insight: mood and behaviour compose, "because a mood is a face that
persists and a behaviour is a motion with a lifecycle." A design pass on 2026-08-27 produced a
list of 31 wanted states, and flattening them into either enum would have broken that. Most of
them are already expressible. The ones that are not share a shape, and that shape is a third axis.

| Axis | What it is | Where it lives | Count today |
|---|---|---|---|
| Mood | A face that persists | `berryMood.ts` | 13 |
| Behaviour | A motion with a lifecycle | `berryBehaviour.ts` | 10 |
| **State** | **A transform of the berry itself** | **new, `berryState.ts`** | **proposed 8** |

A state is not a face and not a motion. It is what the berry *is made of* for a moment: charred,
doubled, glowing, split, haloed. It composes with any mood and any behaviour, the same way mood
and behaviour already compose. Oxidized is not a mood, it is `charred` plus mood `sad` plus
behaviour `stressed`, and that decomposition is why it does not need new animation code.

`berryState.ts` follows the same contract as its two siblings: pure data and numbers, no `three`,
no `react`, no DOM.

### Proposed states

| State | Visual transform | Teaches |
|---|---|---|
| `neutral` | None. The default | |
| `charged` | Static halo, thins as Charge drains, flat grey at zero | The Charge meter |
| `protonated` | Blush, H+ badge, floats fractionally higher | Acid/base, leaving-group activation |
| `carbocation` | Positional jitter, spark particles, plus badge | SN1/E1, rearrangement |
| `radical` | Splits into two halves with an unpaired-electron halo | Radical halogenation |
| `resonance` | Two translucent copies trading opacity, never one | Delocalization |
| `aromatic` | Ring halo, sway forced to zero | Aromaticity, Huckel |
| `charred` | Darkens toward black, smoke particles | Third consecutive miss, recovery beat |

Every one of these is a shader or CSS transform over the existing drawing. None of them adds a
keyframe track, and none of them touches `BEHAVIOURS`.

## The 31 wanted states, decomposed

Everything the design pass asked for, expressed against what exists. **New** marks the only rows
that need code that is not already written.

### Ambient

| Wanted | State | Mood | Behaviour |
|---|---|---|---|
| Idle breathe | `neutral` | `curious` | `idle` |
| Blink and glance | `neutral` | `curious` | `idle` |
| Bored | `neutral` | `sleepy` | `idle` |
| Peek at the canvas | `neutral` | `curious` | `leanIn` |
| Dormant, 7+ days away | `neutral` | `sleepy` | `sleepy` |
| Zen focus, timed quiz | `neutral` | `focused` | `idle` |

Zero new work. All six are compositions of what shipped.

### Answer reactions

| Wanted | State | Mood | Behaviour |
|---|---|---|---|
| Correct | `neutral` | `happy` | `squash` then `bounce` |
| Combo, escalating | `neutral` | `excited` | `bounce` x n |
| Near miss | `neutral` | `thinking` | `leanIn` |
| Wrong | `neutral` | `sad` | `squash` |
| Wrong again, offers hint | `neutral` | `curious` | `leanIn` |
| Thinking | `neutral` | `thinking` | `idle` |
| Panic, last 10s | `neutral` | `stressed` | `stressed` |
| Oxidized, third miss | `charred` **new** | `sad` | `stressed` |

One new state. Seven free.

### Progression

| Wanted | State | Mood | Behaviour |
|---|---|---|---|
| XP pop | `neutral` | `happy` | `bounce` |
| Diamond catch | `neutral` | `cheer` | `celebrate` |
| Lesson complete | `neutral` | `cheer` | `celebrate` |
| Unit complete | `neutral` | `proud` | `celebrate` |
| Level up | `neutral` | `proud` | `celebrate` |
| Streak lit | `neutral` | `excited` | `bounce` |
| Streak at risk | `neutral` | `curious` | `leanIn` |
| Streak saved by a rest day | `neutral` | `calm` | `wave` |

Zero new work.

### Chemical

Each needs its state and nothing else. `protonated`, `carbocation`, `radical`, `resonance`,
`aromatic`, plus `charred` above. Deprotonated, solvated, enantiomers and excited-state were on
the wanted list and are deferred: they need particle work rather than a transform, and none of
them carries a teaching beat the authored copy cannot already carry.

### Summary

| Group | Rows | Free | New state | Deferred |
|---|---|---|---|---|
| Ambient | 6 | 6 | 0 | 0 |
| Answer reactions | 8 | 7 | 1 (`charred`) | 0 |
| Progression | 8 | 8 | 0 | 0 |
| Chemical | 9 | 0 | 5 | 4 |
| **Total** | **31** | **21** | **6** | **4** |

Of 31 wanted states, **21 are compositions of code that already exists**. Six need one new
`berryState` value each. Four are deferred. Nothing needs a new behaviour, a new mood, or a new
keyframe track.

## Costumes

A fourth axis, fully orthogonal and purely cosmetic. It never affects mood, behaviour or state.
It signals what kind of surface the student is on, which is information design rather than
decoration.

| Costume | Signals |
|---|---|
| Goggles and lab coat | Default, reaction nodes |
| Tweed and pointer | Concept nodes |
| Trench coat and loupe | Spectroscopy and structure elucidation |
| Backpack and map | Branch nodes, off the spine |
| Whistle and stripes | Unit quizzes. Neutral, does not cheer mid-quiz |
| Nightcap | Notification art only, never an in-app state |
| Cape | Leaderboard placement |
| Purchased skins | The cosmetic sink in `ECONOMY.md` |

## Tone

Bloom is never disappointed in the student. It is disappointed *with* them, at the problem. This
is the same rule `CLAUDE.md` already states for copy voice, applied to the face: the reader is
stressed, and the mascot's job is to be the friend who also got it wrong. A `sad` mood after a
miss recovers inside one second and never holds.

## One easter egg

At level up: dark screen, silhouette, white flash, "Bloom is evolving!" The flash clears and Bloom
is exactly the same size wearing a marginally larger hat. Caption: "Bloom did not evolve. Bloom got
a hat."

Play the genre trope, never the property. No borrowed names, no sprite likeness, no music cue that
quotes anything. Same rule this repo already applies to Alchemie: interaction patterns are fair
reference, assets and content are theirs.
