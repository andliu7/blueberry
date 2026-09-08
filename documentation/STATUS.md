# Status

Updated 2026-09-05. This file is a thin live index: current state and pointers, no detail
that has a better home. The parent CLAUDE.md names this file the live source. Keep it thin
and keep it current.

## Where things stand right now

- Branch `phase-5`, HEAD `b83bceb`. **Uncommitted work is in the tree and it is real**:
  `src/charge/ChargeMeter.tsx` and its model, `src/mastery/`, `beats/LessonGems.tsx`,
  `app/ui/CourseFlask.tsx`, four new test files, and the integrator's Shell, routes and
  theme edits. It is green and it is not in a commit. Commit it before anything else
- The Economy and Bloom gauntlet is CLOSED with nine verdicts: F, P1, P2, P3, P4, S1, S2,
  S3 (0.66) and S4 (0.93, the highest). Full record:
  `apps/web/measurements/gauntlet-economy/LOG.md`
- **The R rebuild is in flight** and it judges differently: the exit is CONFORMANCE against
  a named image in `docs/reference/design-goals/`, not a blind pick against Duolingo. This
  run finished four pieces and got one verdict. celebration-feed and onboarding were built
  over two rounds each and NOT judged. P5's charge meter was rebuilt against the states
  sheet and NOT judged. lesson-flow ran three rounds, 105 minutes, was judged, and **DOES
  NOT CONFORM**. Integration landed: the bar is five tabs and the header carries the flask
  course chip
- The design direction is LAW: `docs/DESIGN-GOALS.md` plus 29 committed reference images.
  Four owner rulings of 2026-09-04 bind every surface: every question is visual first, the
  image before the name, fill in the blank scratched, every node carries its motif.
  `docs/THREE-TEACHERS.md` carries the borrowable qualities as testable sentences
- The lavender-versus-cream conflict is CLOSED. `docs/DESIGN-TOKENS.md` records the dated
  supersession and `theme.css` ships the warm cream ground (`--background` `#f1ede2` light)
- Feature roadmap in `docs/ROADMAP-FEATURES.md`. Every place a student answers something is
  inventoried in `docs/TRAINER-INVENTORY.md`

## The sticker gate runs again, and its recorded cause was wrong

Both gates had been dark since 2026-09-02. The sticker audit completes as of
2026-09-05: **30 routes, 94,224 elements, 0 drive retries, 512 violations**, and
`sticker-audit.json` is this tree rather than one four days old.

**The diagnosis this file carried for two days was wrong.** It said the audit
crashed because the fill-in-the-blank scratch moved an input the driver types
into. The input never moved. `LESSON_HASH` read `?serveAll=1#/start/lesson`, and
`start` is the ONBOARDING head in `app/routes.ts`, so the URL never opened a
lesson at all: it landed on the welcome screen and the driver waited ten seconds
for a numeric field that was never coming. Disproving it took one browser and
four minutes, against a record that had stood since 2026-09-03.

Fourteen assumptions in the instrument had to be corrected, and every one of
them was TRUE WHEN WRITTEN. A lesson is a composition of beats now, not a run of
three numerics; a choice beat submits on pick; ordering and matching carry the
app's own Skip; the combo interstitial fires mid-lesson; the lesson ends itself
into the reward; the reward's control is CLAIM; the node sheet sits between a
node and the charge gate; the pip strip is a capsule with three authored label
forms; the exam band says "Exam window / paused"; the bar is FIVE tabs; the tool
rail is one menu; and `textContent` doubled the tab labels in a second place.
The build moved and nothing noticed, because the gate had not run in four days.

**Two findings are owner decisions and are NOT resolved:**

- Of the 196 `3-no-shadows` groups, **52 are zero-blur offsets**: the 3D button
  lip asked for by name ("make them more 3d and clickable that actually would
  press down"). The other 144 carry a real blur. Rule 3 now contradicts a
  standing instruction and cannot tell an extrusion from a shadow:
  `3-fake-extrusion` scored 0 while 52 extrusions were counted as shadows.
  Reclassifying them to improve the number is what CLAUDE.md forbids
- **72 `8-display-floor`**, text under the 16px floor: `path-signpost__tag` at
  10.9px and `path-node__counter` at 11.2px. Both legitimately use
  `--font-display` by that token's own definition, so raising them or moving
  them to the system face changes how the pathway reads

`contrast-audit.json` on disk is still a probe's output rather than a full walk.
The audit is being re-run on the repaired instrument.

## Phases

| Phase | Mode | State |
|---|---|---|
| 0 Contracts and validators | Gauntlet loop | DONE |
| 1 Mechanism core | Gauntlet loop | DONE, merged to main |
| 2 Interaction layer | Gauntlet loop | DONE, merged to main |
| 3 Curriculum engine and placement | Gauntlet loop | DONE, merged to main |
| 4 Rendering | Single pass, human gate | DONE, merged to main |
| 5 App shell, economy, design | Gauntlet run on `phase-5` | Economy gauntlet closed. R rebuild in flight: lesson-flow re-round, three pieces unjudged, then the team runthrough gate |
| 6 Auth, data, free tier | Gauntlet loop | Not started |
| 7 AI chat as the Tier 3 tail | Gauntlet loop | Not started |
| 8 Tutor messaging | Gauntlet loop | Not started |
| 9 Scale hardening | Single pass | Not started |

## Environments

| Thing | Value |
|---|---|
| Git remote | `https://github.com/andliu7/blueberry_game.git` |
| Supabase production, read only reference | `kwoqzfvssoxxuvlzzhrp` (`blueberry`). Do not attack |
| Supabase test environment | `gvixhlhzuqcjzvahozfc` (`blueberry-mechanisms-test`), us-east-1 |
| Blueberry sibling repo | `C:\Users\zeusa\Downloads\Projects\grignard\grignard-app-source` |
| Phone harness | `npm run dev` opens `device.html`; `/` still serves the app |

## The gates, last full measurement

Typecheck clean. 1488 web tests in 67 files, 2753 across every workspace, none failing.
Validator suite 30 of 30, integrity unmodified, 101 fixtures. Hit targets 0 under 44 by 44
over 1902 controls. **Payload 351.8 KB gzipped against the 400 ceiling**, up from 191.9 and
the number to watch: 48.2 KB of headroom is left for every R piece not yet built, and the
authored figure sets are the growth. Contrast and sticker are the two dark gates above.
Numbers move; LOG.md and the measurement JSONs are authoritative.
