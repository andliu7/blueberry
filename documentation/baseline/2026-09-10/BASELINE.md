# Baseline, 2026-09-10

The state of the merged site-plus-game, recorded right after the merge settled
and before the next round of changes. Taken against the dev server on the
`ui/cta-and-background` branch; the live site was `main` at `fd6d813`, one
UI round behind what these show.

192KB of screenshots, on purpose. This repository once grew a 132MB folder it
could not push, and blueberry_game keeps 833MB of captures for exactly this
kind of evidence. Five small frames that a status claim can point at is the
budget; a screenshot-per-change habit is not.

## Authority, settled

- The game is edited at `src/game/` in THIS repository and nowhere else.
  blueberry_game froze at the move (its last two commits: save the pilot
  trainer work, then say the code moved). Reference images and the
  measurement harness stay there; see `documentation/STATUS.md`
- Deployed: GitHub Pages from `main` via Actions. At capture time, `fd6d813`,
  deploy run green. The merge commit itself (`837c197`) failed its deploy
  once, on the build stamp, fixed by `fd6d813`

## Build and tests

- `tsc -b` clean, `vite build` green (CI run for `fd6d813` succeeded)
- `npm test`: 144 files, 143 green, ~2,850 tests, ~12s
- One file red on purpose: `bootLoader.test.ts`, decision pending in
  `documentation/BOOT-LOADER-BLOCKER.md`. Not a regression; do not "fix" it
- `jsdom@^25` restored as a devDependency; the move dropped it and
  `pilotScreenWiring.test.ts` errored instead of running

## The journeys, walked in Chrome

| Frame | What it shows |
|---|---|
| `game-pathway.jpg` | `#/app`: Unit 1 pathway, five tabs, flask chip, gems / streak / charge. Zero page errors; the boot front door does not draw (known, documented) |
| `game-onboarding-human-gate.jpg` | `#/app/start/welcome`: the flow works and every sentence is "[HUMAN GATE] placeholder", live today |
| `charge-gate.jpg` | Node sheet → START → the 5-charge gate, meter animating the spend |
| `lesson-404-before-fix.jpg` | **The P1 this pass found**: the gate's Start navigated to un-prefixed `#/lesson/u1-kvt`, the site 404, after charge was spent |
| `lesson-after-fix.jpg` | Same journey after `hrefForPlayable` was routed through `app/routes.ts`: a real kinetic-vs-thermodynamic question renders at `#/app/lesson/u1-kvt` |

Site-side journeys (home, `#/start` funnel, decks) were walked on 2026-09-07
during the funnel rebuild; the `#/unit/u7` page renders its full node list.
Pages carrying the 3-D berry time out CDP screenshots, which is why home has
no frame here: verify those with the accessibility tree, not pixels.

## Open, in one place

`documentation/STATUS.md` carries the live list. Headlines: onboarding copy is
placeholder, two onboardings coexist (`#/start` and `#/app/start`), the palette
changes at the site-to-game seam, the boot front door needs a decision, and the
audit harness still points at the game's old addresses.
