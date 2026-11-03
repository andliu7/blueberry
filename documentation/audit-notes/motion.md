# Motion audit (read-only), 29 Oct 2026

Scope: every `@keyframes` and `transition` in `src/` (about 230 keyframes across 334 files). Source read only, dev server not run, so nothing below is measured on screen. Paths are relative to `grignard-app-source/`. Nothing was edited.

## 1. The radical that splits in half and looks like an electron pair

Files: `src/game/mascot/berryState.ts:164`, `Berry.tsx:519-553`, `mascot.css:224-243, 287-315, 413-440, 450-488`.

Radical state is `{split:true, haloKind:"unpaired", haloStrength:0.9, badge:"•"}` (`berryState.ts:164`). It stacks four things, each reasonable alone:

1. Split (`mascot.css:290-315`, 2400ms ease-in-out infinite). The same `face` node is rendered twice (`Berry.tsx:524-525`) and clipped with `clip-path: inset(0 50% 0 0)` and `inset(0 0 0 50%)`. The left half drifts translateX -3% to -7% and rotates -1.5 to -3.5deg, the right half mirrors it. Both pivot on their own box centre, which is the seam, so the cut opens as a wedge up to 14% of the berry width plus rotation. Each half carries one eye, one cheek and half the mouth.
2. Halo dot (`mascot.css:226-243`, 1600ms ease-in-out infinite): an 11% solid warn-colour circle with a glow, centred on the seam at top 9%, bobbing -12% and scaling 1.18.
3. Badge "•" (`mascot.css:422`): a second dot in a charge chip, top right (right -2%, top 8%).
4. The loops differ (2400 vs 1600ms), so the dot and the gap never sync.

Why it reads as an electron pair, ranked:
- (a) Two dots at the same height at the top of the berry: the halo dot (centre) and the "•" badge (right). Two dots is the lone-pair ":" glyph the site already uses for Thinking (`bloomMotion.ts:80-86`, `BloomStage.tsx:80`) and the deprotonated badge. Students have been taught that two dots means a pair.
- (b) The halves are two near-identical lobes with one eye each, moving in anti-phase. This is the homolysis picture (one electron to each fragment), but it is unlabelled and the berry is the species, not the bond.
- (c) The glow (`box-shadow 0 0 9% var(--warn-ink-strong)`) fills the gap with light, so the cut looks like a pair of bright orbitals instead of a missing slice.
- (d) `drop-shadow-md` on the SVG (`Berry.tsx:498`) sits inside the clipped span, so the shadow is cut hard at the seam on both halves.
- (e) Reduced motion freezes the widest pose (`mascot.css:473-478`, +/-5%, +/-2.5deg), so the person who asked for less motion gets the most pair-like frame permanently.

Chemistry: a radical is one unpaired electron. Split plus a dot teaches the bond-break, not the species. Fix direction (not applied): drop the badge dot (the halo dot is already the single electron), shrink the split to a 2-3% crack with no rotation or use a single half-shaded berry, and keep exactly one dot.

## 2. Tokens: three "ease-out"s and four reduced-motion switches

Tokens (`src/tokens.css:58-72`): press 60ms, release 160ms, ui 200ms, enter 320ms, roll 750ms, wipe 720ms. Eases: ui `.2,0,0,1`, out `.19,1,.22,1`, spring `.34,1.56,.64,1`, wipe `.76,0,.24,1`, sheet `.35,1.8,.35,.83`, elastic equals spring (a `linear()` version at :177).

- Inconsistent: three ease-outs. `--bb-ease-out` (.19,1,.22,1), `--bloom-ease-out` (.22,1,.36,1, `bloom-motion.css:18`), and bare `--ease-out`. `theme.css:373-378` says bare `--ease-out` is deliberately not defined in the game and falls through to Tailwind's default (Tailwind 4 default is `0,0,.2,1`, not verified at runtime). It is used bare at `theme.css:1285, 1418, 1428`, `streak.css:461, 486, 718`, `cards.css:311, 775`, so reward and streak reveals use a flatter curve than the rest. `game/tokens.css:225` defines a fourth value (`.2,.8,.3,1`) that nothing imports.
- Literal curves typed instead of tokens: `.22,1,.36,1` in `startpop.css:94`, `charge.css:116`, `tools.css:134`, `hud.css:319/359/428/500`, `shop.css:301`, `guide.css:374`, `pathway-sheet.css:304`. `.35,1.8,.35,.83` in `preview.css:50,82,138,168,266,301,375`, `tabs.css:153`, `pathway.css:2401-2407`, `push.css:50`. `.2,.8,.3,1` in `mascot.css:525,569`, `theme.css:1231,1304,1663`, `push.css:24`.
- Four reduced-motion mechanisms: `@media (prefers-reduced-motion)` (83 files), `html[data-motion="reduced"]` (site CSS, `tokens.css:252`), `[data-motion="still"]` on components (Berry, elixir, chem states), and the blanket `index.css:185-189` 1ms rule. Some game files only handle the media query (for example `startpop.css:332-401`, `chestOpening.css:271`), so the in-app toggle probably misses them (check per file).
- `tokens.css:252` sets `--bb-dur-enter:0ms` under reduced, so `learn.css:108` and `schedule.css:167` sheets pop in with no fade, while `bloomMotion.ts:24` promises a 150ms crossfade.

## 3. Buttons and presses

| Item | File:line | Trigger | Duration / easing |
|---|---|---|---|
| `.btn3d` | `app/ui/press.css:49-52` | :active | 90ms `.4,0,.2,1` transform and shadow; filter 160ms ease. Sinks by the lip (4px, 3px small) |
| `.press` | `theme.css:932-945` | :active | 120ms `.4,0,.2,1`, 2px sink plus brightness .94 |
| site nav press | `components/ui/site-shell.css:26-60` | :active | plain CSS, 3px sink |
| home cards | `home-destinations.css:19`, `home.css:98` | hover and press | 160ms spring (overshoot on a pure hover) |
| tab icon pop | `app/ui/tabs.css:153` | tab selected | 360ms `.35,1.8,.35,.83`, scale .82 to 1 |
| brand dance | `tabs.css:288` | desktop hover | 640ms ease, 1.5-3deg wobble |

- Inconsistent: three press durations (60ms token used only at `site-shell.css:68`, 90ms btn3d, 120ms press). `.btn3d` brightens 1.08 on hover, `.press` darkens .94 on active.
- `transition-all` at 19 sites, for example `EntryGate.tsx:457`.
- Framer-motion is used in 10+ components with its own numbers (`EntryGate.tsx:212` 0.34s `[.16,1,.3,1]`, a fifth ease-out).

## 4. Page entries and sheets

| Item | File:line | Duration / easing |
|---|---|---|
| Radix menus and dialogs | `index.css:147-180` | ui-fade/pop/menu in and out |
| Home loader berry drop, wipe | `home.css:26, 34` | 300ms spring; 720ms `.76,0,.24,1` +110ms |
| Hero board | `home-hero-board.css:18` | 600ms spring +200ms |
| Close band, hop | `home-sections.css:44-45` | 700ms `--bb-ease-out`; hop 700ms linear (mechanical) |
| Bloom bob | `home.css:160`, `home-sections.css:34` | 4.6s and 5.5s alternate for the same keyframe |
| Phone demo | `home-phone.css:55-132` | scripted 0.15s to 2.7s delays, mostly linear fades |
| Newsletter swap | `home-newsletter.css:34-37` | out 300ms ui, in 560ms spring, staggered |
| Sheets (site) | `learn.css:108`, `schedule.css:167` | 320ms spring |
| Sheets (game) | `tools.css:134`, `pathway-sheet.css:304`, `charge.css:116`, `shop.css:301`, `guide.css:374` 260ms quint; `hud.css:359`, `cards.css:775` 220ms |
| Answer tray | `beat-chrome.css:893` | 260ms `.35,1.5,.45,.95` (a sixth curve) |
| Lesson celebration | `celebration.css:142-253` | seconds units, `ch-land` delayed 1.7s |

Inconsistent: site sheets overshoot (spring), game sheets do not (quint), and durations are 220, 260 and 320ms.

## 5. Bloom states (`src/game/mascot/`)

Constants in `bloomMotion.ts`, CSS tokens in `bloom-motion.css`.
- Glance: 3-6s gap, move 200ms ease-out, eyes lead 80ms (`bloom-motion.css:49-58`). Matches spec.
- Resonance (`mascot.css:259-285`): opacity .85/.32 swap, 1900ms ease-in-out, never solid. Good.
- Sparks (`:323-365`): 4 dots, 1333ms linear (linear reads mechanical). Smoke (`:369-411`): 4 puffs, 2666ms ease-out.
- Excited (`bloom-chem-states.css:60-104`): glow 1200ms, photon 2400ms linear. Solvated orbit `:204` 9000ms.
- Thinking lone pair (`bloom-answers.css:106`): 2400ms, 160ms stagger. Collides visually with the radical dots (section 1).
- Reactions: puff 600ms (`bloom-answers.css:51`), combo sparkle 900ms, hint ring 1000ms, confetti 1200ms, berry-sparkle 900ms and berry-flash 640ms (`mascot.css:525, 569`). Budget 200ms (`bloomMotion.ts:21`).
- Costume wiggle 300ms; level up dip 120/grow 600/ring 1000; streak lit flame 360, flicker 600, day roll 400.
- Janky: `bloom-hat-flicker` is `200ms steps(1) infinite` (`bloom-progression.css:457`), 5 state changes a second. Reduced rule exists (`:563-604`).
- `--bloom-ease-pop` aliases `--bb-ease-sheet`, which `tokens.css:68` says is for the feedback sheet only, yet it drives chips and counts (`bloom-tray.css:69`, `bloom-progression.css:315`).
- A 40px lesson berry can run glance plus halo plus 4 sparks plus 4 puffs, the heaviest ambient motion in the lesson screen.

## 6. Chest (three systems)

- Pathway chest (`pathway.css:2398-2407`): bob 1.6s, pop and lid 520ms sheet curve, say 240ms.
- Opening ceremony (`chestOpening.css`): rays 14s linear (:105), shake 460ms ease-ui (:123), burst squash 420ms spring (:134), gem bob 900ms, gem spin 1300ms, result-in 420ms, amount-pop 650ms, coin flip 520ms linear, tally 380ms, beam 1500ms.
- Card chest (`chest.css:79-107`): inner-up 380ms, lid swing 520ms spring, hoard-up 560ms +120ms, twinkle 900ms.
- Feed chest pop 480ms (`feed.css:331`).
- Dead spec: `CHEST` in `bloomMotion.ts:183` (shake 80ms x3, lid 200ms, rise 400ms) is matched by none of the CSS above.
- Risk: the 14s rotating `repeating-conic-gradient` (`chestOpening.css:101-106`) re-rasterises unless promoted to a layer. The glow scale is driven by `--light` (:112), confirm it is not set per frame through React state.

## 7. Energy (`src/game/elixir/elixir.css`)

- Level rise `transition transform 1.1s .3,.9,.3,1` (:18). Bar fill `transition: width 1.1s` (:45), a layout-driven property.
- Loops: liquid roll 3.2s and 5s linear, bubbles 3.6s, shimmer 3.4s, low/empty warn 2.4s (:65), zzz 3s, sweat 3.6s.
- Drink sequence (:111-152): sip 1.6s, stream 1.3s +.45s, pulse 1.6s +.9s, flash 1.5s +.7s, gain 1.8s +.8s, drops 1.5s +.8s. Six overlapping animations, about 2.6s total.
- Every piece has a `data-motion="still"` guard.
- Hard-coded pink `rgba(242,92,201,...)` at :127-129 and `#fff` at :23, outside theme tokens.

## 8. Streak, rewards, pathway

- Flame flicker has three periods for one flame: lick 2600/1900ms (`streak.css:50-54, 1070-1074`), page 1.4s (`streak-page.css:102`), lit 600ms (`streak-lit.css:36`).
- Four near-identical pops with different durations: reward-land 420/460ms, badge-pop 420/520ms (`theme.css:1111, 1351, 1372, 1440, 1555`).
- `gem-reward.css:238` and `:343` both declare `gr-throw` and `gr-spin`; the later one wins, so the first is dead.
- Pathway unlock (`pathUnlock.css:128-152`): fill .6s, travel .75s, shackle .2s +.75s, lock .2s +.95s, bounce .4s +1.05s, halo 1.35s, spark .8s +1.1s. About 2.4s. Check it is skippable.
- Pathway stars (`pathStars.css`): drift linear, shoot 1.2s, bloom .8s, glow 2.2s, ripple 1.6s.
- Trainer backdrop (`backdrop.css`): 33s, 38s, 19s ambient loops, ripple 2600ms. Slow, so fine, but the filter cost is unchecked.
- Trainer push: throb .7s infinite, land ring 320ms, refuse 520ms, mark pop 360ms, handle hello .9s x3 (`push.css`).
- Home-phone, glass folder (`gf-drop/bump/roll/turn`), cards save-animation (`sa-*`, 140-380ms, uses its own `--ease-fly`) are self-contained and token-aware.

## 9. Flagged, in priority order

1. Radical: two dots plus a wedge split (section 1).
2. Three ease-outs; the game's bare `--ease-out` falls to the Tailwind default.
3. Reduced motion is split four ways; some game CSS only honours the OS query.
4. Sheet entry mismatch between site and game; 220/260/320ms.
5. Four near-identical pop keyframes with different durations; three flame flicker periods.
6. `bloom-hat-flicker` at 5Hz steps.
7. `CHEST` constants used by no CSS; three chests with unrelated timings.
8. `transition-all` at 19 sites; width transitions on bars (`elixir.css:45`, `hud.css:612`).
9. Many infinite ambient loops on one screen (berry sparks, smoke, halo; elixir four loops; `hud-gutter` 2600ms; `path-halo` 1.9s; `path-start-bob` 1.6s). No visibility gating found.
10. Mixed units (`s` and `ms`), hard-coded colours in elixir.

Not verified: the runtime value of Tailwind `--ease-out`, real frame cost of the conic rays and backdrop filters, and the call sites of `hud-gutter` and `centre-breathe`.
