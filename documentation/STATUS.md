# Status

Updated 2026-09-10. This file is a thin live index: current state and pointers,
no detail that has a better home. Keep it thin and keep it current.

The 2026-09-05 status this file replaced described the game's OLD repository,
branch `phase-5` at `b83bceb`, and travelled here verbatim in the merge. Its
gauntlet record and owner decisions still matter and still live where they
always did: `blueberry_game/apps/web/measurements/` and
`blueberry_game/STATUS.md` (marked historical). Nothing in that record is
re-stated here, because a copy is a thing that goes stale.

## Multistep strip and decision points, 2026-09-12

The engine now carries a step strip for multistep questions (header row, in place of the progress bar),
a look-back replay of completed steps with its own scrubber, and decision points as data: a step may
carry a `fork` with two or three routes, the chooser marks the decision point the way Alchemie does
by darkening the screen (light theme: a tint over the canvas; dark theme: the ground under the
molecule, because a tint there drops the small H labels under 4.5:1) plus an accent frame, and
grading is two-stage (arrows through `gradeDrawing`, then whether the route is
favoured, with an advisory cause from the registry on a miss). Six causes added to chem-core for it.
Seven forks authored from the course keys: diene warm and cold, SN1 in water, cuprate on an enone,
Grignard on a carboxylic acid, the benzylic alcohol under heat and in the cold. The map's cuprate node
now plays the fork; the other new sequences are reachable by deep link only until nodes are assigned.
Detail: `documentation/TRAINER-INVENTORY.md`, amendment of 2026-09-12.

Judged 11 to 12 Sep by fresh critics: the strip passed blind in round five, the fork won blind in both
themes in round nine, and a chemistry checker signed off all seven problems and six causes against the
course keys. Still open, not blocking: `packages/validators/validators.lock.json` does not yet record
the two new `competingRoutes` entries (elimination and substitution not favoured), so
`npm run lock:check -w packages/validators` reports MODIFIED; regenerating it is the owner's
deliberate, separate commit per `CLAUDE-blueberry-game.md`. The same check also flags
`src/checks/conservation/fixture-schema.ts`, unchanged since the packages came in and not this work.
The validators package's own tests live in `tests/`, which no vitest config picks up, so
`npm run test:packages` stops there. Named design gap for later: the fork does not mark the atoms it
acts on, which Alchemie's lit bonds do.

## The trainer surface is one engine, 2026-09-11

Instances 1, 2, 3 and the lesson runner all mount `src/game/tabs/trainer/engine/TrainerScreen.tsx`
with a question as data; the old `DrawCanvas`, `TrainerTools`, the tutorial variant and `Scene3D`
are gone. Trainer surface 8,269 raw lines to 5,900. Detail and the blind evidence:
`documentation/TRAINER-INVENTORY.md`, amendment of 2026-09-11. Uncommitted on
`ui/cta-and-background` alongside someone else's six dirty site files.

## Where things stand right now

- **The game lives HERE, at `src/game/`, and ships from this repository.**
  Live at https://andliu7.github.io/blueberry/ under `#/app`, deployed by
  GitHub Actions on every push to `main`. blueberry_game is frozen: reference
  images and the measurement harness stay there, code does not. Its README
  says the same thing from the other side
- The engine is `packages/` (chem-core, curriculum, economy, feedback,
  interaction, validators), consumed through npm workspaces. All six match the
  old repository file for file as of the move; **from now on they are edited
  here and only here**
- The site around the game: decks, lessons, calendar, tutoring, the `#/start`
  funnel, the dashboard. `#/unit/<id>` gives each of the fifteen units its own
  address
- Billing is built and dormant: four Stripe Edge Functions, two tables, the
  plans panel. Nothing charges until the secrets are set. The walkthrough is
  `documentation/STRIPE.md`, and the thing to settle before a live charge is at the
  foot of it

## Test baseline, 2026-09-10

`npm test`: 144 files, 143 green, roughly 2,850 tests. One file is red **on
purpose**: `src/game/test/bootLoader.test.ts` guards a contract that genuinely
changed when the game stopped owning its own document. The decision it is
waiting on is written in `documentation/BOOT-LOADER-BLOCKER.md`. Do not edit
that assertion to make it pass.

`jsdom` is a devDependency again: `pilotScreenWiring.test.ts` declares a jsdom
environment and the move dropped the package, so that file errored instead of
running.

## Known issues, reproduced in a browser 2026-09-10

- **FIXED, same day: the pathway's node links missed the `#/app` prefix.**
  `hrefForPlayable` in `PathwayTab.tsx` built `#/lesson/...` and
  `#/trainer?...` by hand instead of through `app/routes.ts`, so the charge
  gate's Start took five charge and landed on the site's 404.
  `shellRoutes.test.ts` now asserts the hrefs go through the helpers
- **The game's onboarding is placeholder copy on the live site.** Every line
  under `#/app/start` renders "[HUMAN GATE] ... pending owner review". The
  words are Andrew's to write; the flow itself works end to end
- **Two onboardings coexist.** The site's funnel at `#/start` (indigo, goals
  then a lesson then the ask) and the game's at `#/app/start` (cream, the
  Duolingo-shaped capture). Which one greets a stranger is a product decision
  nobody has made yet
- **The palette changes at the handoff.** The site is indigo-to-fuchsia on
  cream-white; the game keeps its own purple on warm cream. Deliberate at
  merge time, jarring at the seam
- **The boot front door does not render** (see the blocker doc). The game
  still loads correctly behind the site's Suspense fallback

## What did not move, and where it is

- `blueberry_game/docs/reference/`: 833MB, 2,022 files of captures,
  competitor screenshots and Mobbin sets. Critics read from there. A newly
  downloaded Duolingo Mobbin set (324MB zip + extraction) sits there
  **untracked**; if it is ever committed, commit the extracted folder only.
  The zip alone is over GitHub's 100MB hard limit and would wedge every push
- `blueberry_game/apps/web/measurements/`: the gauntlet and audit harness.
  Its drive scripts still target the game's OLD addresses (`#/start/lesson`
  and friends); repointing them at `#/app/...` is the price of running an
  audit against this repository, and it has not been paid yet
- The design law (`documentation/DESIGN-GOALS.md` and friends) is here, but
  the images it judges against are in `blueberry_game/docs/reference/`. Where
  the two repositories' copies of a spec disagree, this one is the live one
