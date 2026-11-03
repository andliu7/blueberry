# Overnight log

## Wave 1

All three pieces: won blind = no, 4 rounds each. Files changed: none recorded in the result data (the admin-honesty verdict states nothing was edited).

### radical-anim
- Won blind: no. Rounds: 4.
- Files changed: not recorded. Notes cite src/game/mascot/mascot.css, berryState.ts and Berry.tsx as the radical Bloom fix, but no edit list was given.
- Open gap: the bar was not obtained (Brilliant animations are behind login, Mobbin gives stills). Ours is marked losing by the rule. Legibility at gallery size: the single dot plus a small hook can read as a bomb fuse or sparkle, not a lone unpaired electron. The hook is tiny, unlabelled and has no visible target. Animation was not captured over time, and the reduced-motion pose was not checked.

### admin-honesty
- Won blind: no. Rounds: 4.
- Files changed: none (admin home source was read only: AdminHome.tsx, adminHomeData.ts, adminHomeLive.ts, honesty.tsx).
- Open gap: with no live data the stat tiles read "No data" with no sparkline, so the page looks empty rather than like a labelled example. The "connected" footnote wording suggests a missing integration, not a sign-in prompt. "Open the app" appears three times. Sample figures remain in adminHomeData.ts and the Purchase interface is declared twice. The Stripe bar was text only, not screenshots.

### pathway-slideshow
- Won blind: no. Rounds: 4.
- Files changed: none recorded (PathwayDeck.tsx, deckModel.ts and AdminViewer.tsx were read).
- Open gap: slide stage does not fit. A short slide in Present mode gets an inner vertical scrollbar, the Challenge tab is clipped, and the Present (F) button overlaps the rail. The pace diagram has no arrowheads, so direction is ambiguous. Page is dark navy, not the lavender ground. Figma Slides and Brilliant bars were not fetched.

## Wave 2

### unit-style-guide
- Won blind: no. Rounds: 4.
- Files changed: none recorded (UNIT-STYLE-GUIDE.md and src/game/content/u1/lessonPath.ts were read; u1LessonPath, pace, difficulty and u1Pools tests passed).
- Open gap: no filmed video. Every U1_VIDEO_SLOTS entry is "not-filmed" (eight planned 2 to 3 minute clips), with nine text read-alongs in their place. Chad's Prep Ch 16 is filmed (about 75 minutes on the lessons fetched). pace.test.ts reports 72 of 149 lessons have fewer than two L2 questions, so "harder" plays as authored for them (count is across all units). Organic Chemistry Tutor not fetched. App not run, no screenshots.

### units-2-3
- Won blind: no. Rounds: 4.
- Files changed: none recorded (content/u23/lessonPath.ts and lessonLinks.ts were read).
- Open gap: bar only half obtained (Khan returned nothing, Chad's gave titles only) and our output was never run. No Unit 2 preview lesson found. Nomenclature lessons (u2-nomen, u2-nomen-priority) sit after u3-sequencing. No node for nucleophilic aromatic substitution (Chad's 18.5). Unit 3 branch nodes with no lesson: Gattermann-Koch, Gattermann/Houben-Hoesch, Vilsmeier-Haack, Kolbe-Schmitt, Reimer-Tiemann. Explainer cards restate pool explanations in text.

### reaction-lessons
- Won blind: no. Rounds: 4.
- Files changed: none recorded (model.ts, ids.ts, content.ts, ReactionLessonView.tsx read; reactionLessons.test.ts passed, 35 tests).
- Open gap: coverage. About 27 reaction ids are named by pathway lessons, only 12 have a walk (REACTION_LESSON_IDS). No walk for aldol, intra-aldol, michael-addition, diels-alder, enolate-alkylation, enamine-attack, grignard-12, grignard-nitrile, nitrile-hydride, dibal-ester, epoxidation, decarboxylation, alpha-bromination, diazonium-first, phenoxide-alkylation, wolff-extrusion, iminium-reduction, amide-iminium-reduction. Continue is always live, so a skipped move gives nothing. Bar not obtained, nothing rendered or compared.

## Wave 3

- energy-keq: not won blind (bar not obtained), 4 rounds, no files changed. Open gap: Chad's Prep URL returned 404 and Khan Academy returned only a title shell, so ours is marked losing; app not run or screenshotted (source read only). kcal/mol values and the Walk A/B/C scenarios are model values, not real reactions, and dead-end/irreversible-path teaching is not tied to drawn structures. Professor-style worked problems (e.g. ammonia plus ethoxide, delta pKa near 22) not compared side by side.
- nmr-ir-toolbar: not won blind (bar not obtained), 4 rounds, no files changed. Open gap: nmrdb.org needs an "I agree" privacy click that would submit a structure to a third party, and its predictor did not render a spectrum; no Khan Academy lessons fetched. In ours, #/app/spectra renders on a dark navy ground instead of the owner's lavender, the plot is mostly empty (thin needle peaks on a large panel), and mouse-wheel over the plot zooms instead of scrolling the page. Steps panel, image import, calibration and NmrProductQuestion flow not checked in the browser.
- adaptive-difficulty: won, 1 round. Files changed: src/game/beats/pace.ts, src/game/beats/difficulty.ts, src/game/admin/deckModel.ts, src/game/admin/PathwayDeck.tsx, src/game/content/u1/primers.ts, src/game/content/u1/lessonPath.ts, src/game/beats/LessonHelp.tsx, src/game/pathway-sheet/guidebookContent.ts, src/game/pathway-sheet/Guidebook.tsx, src/game/test/difficultyRules.test.ts, src/game/test/pathwayDeck.test.ts, documentation/UNIT-STYLE-GUIDE.md. tsc 0 errors; targeted vitest suites pass (difficultyRules 24 new, pathwayDeck 3); full npm test not run. Open gap: Duolingo/Brilliant bar not fetched, so the comparison is untested; the five Unit 0 primers are conceptual prose drafts needing the owner's read; no browser check of the new guidebook block or slides.
