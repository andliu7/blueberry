# Status

Updated 2026-10-17. This file is a thin live index: current state and pointers,
no detail that has a better home. Keep it thin and keep it current.

## Queue, 2026-10-17 (the to-do list; keep it current)

Since the night of 17 Oct, Claude commits and pushes to `main` when the owner asks (it deploys).
**Resume at "ORDERED QUEUE, 17 Oct night" below.** 5 game tests red since f980ab9 (checkpoint
counts, move counts, branch density, unit walls, ladder table): fix first, never loosen. `tsc` clean, `npm run build` passes, Learn tests
324/324 as of 17 Oct. Overnight run 17 Oct: Unit 1 upgrades + Unit 2 draft (progress page:
the f142b2c5 session scratchpad `progress.html`; the 16 Oct page is `progress-oct16.html`).

**Waiting on the owner**
- Unit 1 sign-off: all ~179 items are `placeholder: true`, which keeps them out of spaced review.
- Six pieces parked after 6 rounds without a blind win: X1 loader, X3 pomodoro, S2 home tint,
  X5 me + settings, A2 buttons + headings, X6 leaderboards/feed/messages. Keep or send back.
- Bloom gradient (A, A softer, keep); AI tutor personas; Twilio go-ahead.

**Stopped mid-build on 16 Oct (state on disk, unverified per piece)**
S1 gradient ground + card glow, A1 icon set + tab bar, X2 periodic table, X4 cards tab,
S3 Learn decision card + right rail, X7 search + courses + trainer, A3 lesson popover.

**Not started**
A4 HUD (XP/energy pips, streak screen); A8 pathway redesign (spec: scratchpad
`pathway-research.md`); F1-F5 flashcards (Review hub, deck options, study modes, custom decks,
more decks); drawing practice (extend `src/game/beats/trace`); Units 3-15 content (only
`src/game/content/u1/` exists).

**Running 17 Oct**: three runs (Unit 1 upgrades + Unit 2; Units 3-15 drafts; path, guides, Unit 0).
**Queued for a fourth run**: Bloom reactions in lessons and on the path, the next-lesson transition,
end-of-lesson feedback both ways (student summary + rating for the owner). Boot loader done by the lead:
six Bloom moves, hand-written wordmark, jump / curtain lift / land exit.

**Bloat cleanup, owner decisions 17 Oct (do as its own commit, full suite before it)**
- KEEP: `src/game/mastery/` (start of topic mastery, queued) and `src/game/beats/trace/`
  (base for drawing practice). Keep the 3D berry and three.js. Keep the structure/ranking/
  reagents answer shapes (rulebook "Four answer shapes"; owner 20 Oct, was on the DELETE list).
- DELETE: HomeIntro + BlobReveal + the 5 effects only it used; `packages/interaction/src/geometry/`
  + its tests; the mutation testing setup (never
  `validators.lock.json`); every unused site component in the audit (morph-gallery, auth-card,
  nav-pill, study-timer/toast, card-8, loader-10, loading-state, the lib copies of
  berryBehaviour/berryMood, ...); game `tokens.css`, `courses.css`, CanvasBackdrop + backdrop.css;
  unused deps gsap, @react-three/drei, @supabase/ssr, autoprefixer, postcss, duplicate @types/node,
  interaction's @vitest/coverage-v8.
- DO: the small tidy-ups (unused exports, test-only exports, one shared seeded shuffle, clamp,
  plural, Intl and crypto.randomUUID built-ins).
- NOT NOW: swapping Radix select/tooltip/dropdown and recharts for native (visible change).

**Next, right after the 17 Oct push (owner)**
- Buttons press and hold: the face sinks on pointer down and stays down until release, and the
  action fires on release only if the pointer is still on the button (drag off cancels). Today
  43 files (counted 18 Oct) fire on `onPointerDown`, so the action lands before the hold can show and a drag off
  still selects. Move actions to `onClick`; keep `:active` / `data-pressed` for the instant sink.
  DONE 23 Oct in db159dc, see "Progress, 22 Oct".
- Admin mode: sign in as admin, view the app as each plan (free / paid tiers), drop in videos,
  edit lessons, add reactions to cover. Roles already come from the Supabase roster; access stays
  server side (RLS), the plan switch is a view, never a grant.
- Social: friend suggestions, following, and celebrating friends' achievements in the feed. Needs
  real accounts (Supabase tables with RLS, follow rows owned by the follower); suggestions come
  from shared courses or classes, never from uploaded contacts without consent; no fake people.
- Shop, INSIDE the Me tab (owner 20 Oct; no sixth tab, per OPEN-QUESTIONS:305). Diamonds buy shop
  items; freezes stay 75 diamonds and can also come free from daily boxes. Real-money freezes are
  DROPPED for now (owner 20 Oct): they conflict with ECONOMY ("not buyable") and Monetisation.
- Bloom pet (owner idea, 17 Oct; needs a design pass before any build): care for Bloom and feed
  him to evolve, Pokemon style; collect blueberries in different colours. A few collected berries
  hop around your screen, and with enough of them the loading transition becomes a swarm running
  left to right across the screen. Ties into diamonds, daily boxes and the shop.
- Later: merch, e.g. printed flashcard sets shipped to students (needs a print and shipping
  vendor; not before the shop works).

**Owner brief, 17 Oct evening (PAUSED by the owner the same night; still queued, see the ordered queue below)**
1. Unit 1 test-outs, Duolingo style: each section's treasure chest node is always open and is a
   10 to 15 question quiz over that section, harder each section, the last the hardest. Mix of
   drag-and-drop, matching and MCQ; conceptual, light on nomenclature (molecules shown as
   structures, not names; ask properties, reactivity, K, Q, pKa). A little harder than the
   lessons, e.g. a short multistep synthesis as a challenge item.
2. A 20 question unit exam per unit, and skip to any unit at any time. Unit 1 always free; quizzes
   always open. Passing lights up the section and moves the progress bar.
3. Rewards: start nobody at zero. An onboarding gift chest (random diamonds + XP). XP as a learning
   metric seen in lessons and on the leaderboard, with Duolingo-style XP animations and Bloom
   reactions. Same evening: redo the diamond animation, the energy (charge) bar, and add an XP
   bar that tracks XP (this is A4 HUD below).
3b. Guide tabs for every current unit. DONE as drafts: u2 and u7 to u10 (ca87baf), u3 to u6
   added 23 Oct (scripts/guide_u3.py to guide_u6.py, test/guideU3 to U6), each lazy loaded.
   Owner sign-off pending on all of them. Still open: quiz questions to draw on the owner's
   class problem sets (path pending).
4. Admin view: toggle Member / Pro (and ads for Member, owner wants ad revenue) to preview each
   plan; admin role comes from the same Supabase roster as the site (Kai Walsh signs in on
   Blueberry and is admin in the app too). The plan switch is a view, never a grant.
5. QUEUED: build out the other units the same way, and cut token spend while doing it (the units
   repeat one question style with added complexity, e.g. a Claisen unit: generate from shared
   templates rather than writing each by hand).
6. QUEUED: reaction maps. A circle with a reactant in the middle (ketone, aldehyde, carboxylic
   acid, an allylic carbocation...), reagents around it (Grignard, halogenation...), products
   beyond; zoom in and out.
7. QUEUED, not yet: an organic chemistry 1 course after the Orgo 2 units are done.

**Progress, 20 Oct (subagent run)**
- Phase 0: 5 red tests green (2 regenerated tables, 3 by owner decision); budget validators measure
  the real app again; deploy gate ON for tests (budgets commented in deploy.yml until the owner runs
  `npm run lock:regen -w packages/validators` and the game route is under its limit); all controls
  >= 44 px; contrast audit runs to the end. Weight cuts done (supabase lazy, precomputed topic
  counts, lazy guidebooks/FocusTimer/BlueberryBot, lazy decks): the validator says 341 KB, but a
  real cold load also fetches the on-mount supabase and decks chunks, 432.6 KB; being fixed so the
  measurement counts on-mount chunks and #/app stops loading decks. Also stale: the mutation score
  (`npm run mutate -w packages/validators`).
- Wave 1 done: Practice spelling, no dark box on the unit picker + "Free for now.", closed courses
  tagged and unpressable, Bloom pressable on the path, text pass on Unit 1 and Unit 0.
- DONE 22 Oct (was NEW TASK): drives reach their moments again (826fd38), all but streak-exam:
  in the exam window the day's gift, journalled on open, already counts the day, so no clear
  opens the streak stage. OWNER: count the gift as "opening the app" or not? Contrast 54 to 27
  failing pairs (1ecd5a9): every text, icon and gauge pair clears AA. The 27 left are art or a
  brand mark: path road and chest shadows, Feed scenery and avatars, Me's hero scene, Bloom's
  limbs on the reward, the review folder's glass rim, the Charge flask's card-coloured halo, the
  Google "G". OWNER: recolour the art, or rule decorative (aria-hidden) art out of the audit?
- DONE 22 Oct: #/app back under 400 KB on every open (d2a9bf8). The manifest now weighs the tip
  list and, for the day's first open, the gift sheet: 401.0 to 397.9 KB first open of the day,
  398.5 to 395.4 KB after (404 page lazy, motif names split from the drawings).

**Owner brief, 23 Oct (queued after the 23 Oct workflow run; not started)**
Tutoring (business test 1)
- T1 Tutoring end to end, testable with seeded model cases: bring a tutor in, the tutor sets
  availability, students book specific slots, the tutor is paid per booked session, and the tutor
  sees a short questionnaire about the student. Today tutoring still runs on Apps Script; this needs
  Supabase tables + RLS and Stripe (money server side). OWNER: how tutors get paid (Stripe Connect
  payouts, or a ledger paid by hand) and the rate.
- T2 Admin view for the owner and TAs (roster already makes Kai, Ryan Rathbun and V. Wedekin admin;
  Ryan and V. have no account yet and become admin on first sign-in): preview + edit, tutor testing,
  watch test accounts complete lessons.
Course (business test 2)
- C1 Syllabus import: paste an Orgo II syllabus, reorder units/lessons to its schedule, adjustable by
  hand afterwards (the site already has an Apps Script syllabus PDF import for the calendar).
- C2 pKa sheet paste updates the site's pKa values, with visible feedback on what changed.
  OWNER: everyone's values (admin only) or a student's own sheet?
- C3 Problem sets, Khan Academy style: small sets with a celebration each, split a pasted set into
  parts, suggest similar problems from the database.
- C4 Lesson confidence: a student rates a lesson; "too easy" raises the difficulty. Needs a design.
- C5 Lesson build pass: tutorial folded into the first lesson; the Alchemie-like interface with
  clearer animation (see the Arrow Pusher bar).
Discoverability
- D1 A first-time visitor finds what they came for; the marketing says where things are.
- D2 Flashcards: premade decks for every unit, one deck per section; iterate on the interaction.
Feed and accounts
- F1 Brainstorm the feed (show options first), plus a feed view in admin to test with the TA.
- A1 Lessons tracked on the account (server-side progress, table + RLS; today progress lives in
  localStorage only) and a reminder to sign in to save progress.
- A2 BUG (owner): only the first lesson can be opened. Reproduce first: live site or local, signed
  in or out, which unit.

**Progress, 22 Oct (Wave 3 item 12 = evening brief items 1+2: test-outs)**
- Every section chest of units 1-10 offers a test-out (10 to 15 questions, longer each section);
  every unit has a 20 question exam ("Test out" row on the path). Questions come from the
  lessons' own pools, hardest rung first, no naming lessons, no structure-editor items, a ladder
  or board every third question where the section has them. A pass journals `tested_out`, lights
  that section and all before it (a unit exam lights every earlier unit too), pays XP once per
  test and saves the section's chest. Checked in a production preview: offer, run, 8/10 pass mark.
- Payload: #/app first open now 399.9 KB of 400 (testOuts.ts is a 1.5 KB chunk the path needs).
  The next feature on the first load must cut weight first.
- DONE 23 Oct: supabase-js (53 KB gz) off the first open. AuthProvider loads it on mount only
  when a stored session or a sign-in redirect is present, otherwise on the first sign-in,
  checkout or editor press. #/app first open 399.2 to 346.4 KB, checked headless: cold #/app
  does not fetch it; a stored session, ?code=, and the Google button each do. The validator itself will not run
  until the owner runs `npm run lock:regen -w packages/validators` (mutation files removed).
- Item 24 (back disc over images) DONE: built 21 Oct in 86a8a5a (one shared .bb-back-disc in
  theme.css), now pinned on all six game back buttons (glossary added) by backDisc.test.ts, which
  also checks the icon ink against the disc over pure black and pure white images in both themes:
  worst case 3.74:1 (dark theme, muted ink, over white), floor 3:1. Lowering the disc fill fails it.
- Still open from the brief: harder-than-lesson items (a short multistep synthesis as a challenge)
  need authoring; today the draw only reorders existing lesson items, all still `placeholder`.
- Item 22 (site footer) DONE: built in 47ec43b (Find me chips grow into words on hover and focus,
  FAQ card, footer comes up from under the page; pinned by siteFooter.test.ts), and now loaded
  lazily from SiteChrome so #/app never downloads it or the About sheet: #/app first open 346.4 to
  339.4 KB. ASK: the footer mails andliu@terpmail.umd.edu (src/data/site.ts EMAIL), andliu.dev
  uses zeus.andrewliu@gmail.com; which one should Blueberry show?
- Item 21 (pathway supernova) DONE 21 Oct in af74062, on origin/main: four-point star flash closing
  to a red or blue glow with one ripple; reduced motion shows two still glows; pinned by
  src/game/test/pathSupernova.test.ts. Owner to check it on the live pathway.
- Item 11 (welcome back) DONE 23 Oct: the name now saves to the account (profiles.full_name; Me
  and Leaderboards ask a signed-out student to sign in, then return to #/app), a second open tab
  no longer wipes it (progress.ts storage listener), and the Feed opens on "Welcome back, <name>"
  with "Pick up where you left off" to the path, reminders, and one honest friends line.
  #/app first open 340.2 KB. Signed-in view not checked in a browser (needs a real sign-in).
- Items 14 and 27 (core) DONE 23 Oct: the glossary page (556c370) now has an "i" beside every
  named compound and reagent shorthand on a Cards tab card (term list, Test and Write question,
  Write's shown answer; Flashcards shows the same as a chip row under the card, Match none, since
  its tiles are tap targets). It opens the entry in a bottom sheet, a 0.7 KB lazy chunk; the
  drawings load on the first tap, never with the Cards tab. Compounds now also come from the site
  decks' drawn products (101 in all), and a compound with one group on a benzene ring carries the
  EWG / EDG line, found by RDKit (scripts/glossary.py RING_RULES; every other aromatic compound
  has a written reason in NO_RING_NOTE). Pinned by glossaryCardLinks.test.ts plus the --check
  byte match, which now covers the small names index too. #/app first open 340.3 KB.
  Still open: the personal definitions store, the full reaction catalogue, and deck STARTING
  materials (the deck files hold names in prose only; they would come from mechanism_trainer's
  generator, owner decision).
- Item 16 (scratchpad) DONE 23 Oct: the "Draw it" screen keeps Ketcher and gains scratch paper
  for a finger or Apple Pencil under it (src/game/beats/trace/ScratchpadCanvas.tsx, its own lazy
  chunk; open by default from 900px wide, a "Scratch paper" key on a phone). Never graded.
  Pencil pressure sets the width; once a Pencil has touched it every touch is a palm and refused
  (beats/trace/ink.ts, shared with FreehandCanvas); Undo, and Clear that Undo brings back. Pinned
  by scratchpadInk.test.ts. Stacked, not side by side: the 36rem lesson column is too narrow to
  halve Ketcher. #/app first open 340.7 KB. Owner to check on an iPad: rest a palm while drawing
  with the Pencil, no stray strokes. Sketch to molecule: research only, in
  documentation/SKETCH-TO-MOLECULE-SPIKE.md; recommends the offline in-house route first,
  AWAITING an owner pick (three questions at its end).
- Item 23 + evening brief item 4 (client side) DONE 23 Oct: staff lesson viewer at #/app/admin
  (src/game/admin/, lazy; Me > Your tools > Lesson viewer, shown to admin/owner only from the
  site's profiles role). Every lesson as slides in run order, Prev/Next and arrow keys, View
  Admin/Student (answers, whys, provenance, draft tags only in Admin), Plan Member (Free)/Pro as
  React state only: never a grant, pinned by adminViewer.test.ts. Member draws a lock on Pro
  lessons plus an ad placeholder; the free rule (u0, u1, quizzes, checkpoints) is PROVISIONAL in
  admin/planView.ts, owner to confirm. Edit in place NOT built: needs a server change, proposed
  (not applied) in documentation/ADMIN-EDITS-PROPOSAL.md. #/app first open 341.3 KB.
- Buttons press and hold DONE 23 Oct in db159dc: 22 game files moved their action from
  `onPointerDown` to `onClick`. The face still sinks on pointer down (`:active`), the action lands
  on release over the control, so sliding off cancels, a scroll that starts on a map node no longer
  opens it, and Enter and Space now work on every key. Drag, scrub and tap-to-skip surfaces keep
  pointer events. Pinned by src/game/test/pressOnRelease.test.ts (source allowlist, MatchBoard and
  ProblemView pointerdown-does-not-pick). Owner to check that four liked surfaces feel right now
  they commit on release: map node taps, the flag button, the node sheet keys and the answer
  tiles; any one can be reverted alone. #/app first open 341.3 KB (unchanged).

**Progress, 21 Oct (Wave 2 items 6, 8, 10 and item 15; committed, not pushed)**
- Top bar A3: one row, Bloom with his level badge, a short XP bar, "N XP to the next stage!",
  energy as a plain number, no cost on spend. +XP moment B1 plays when XP lands (verified after a
  lesson). On phones the course chip left the row to make room (desktop keeps it; Me > Your tools
  > Courses still switches course).
- Chests C1: earned and saved (daily gift and onboarding gift on app open, daily quests, section
  finals and review stops), "Open now / Save for later" sheet, three-tap opening with a gem clink
  per diamond, saved chests in Me (open one or all). The map's treasure chest plays C1 too.
- Daily quests on the Feed now come from the economy (two recurring, one rotating). The Feed's
  older three (earn the goal, keep the streak, get five right) are off screen but still in
  feedModel.ts with their tests: OWNER, retire them or keep them?
- Item 15: every reaction blank says "What forms?" or "Which reagent?" (Cards, lesson schemes, the
  draw beat, the site's review decks); the card SVGs match mechanism_trainer/scripts/make_flashcards.py,
  whose `blank=` change is still uncommitted in that repo.
- Measurement harness: settleBoot saves the day's gift chest, so the modal sheet does not hide
  the page the gates measure.

**Owner decisions, 20 Oct (answers to the calibration questions; recorded here, docs amended)**
- Real-money streak freezes dropped for now; Shop lives inside Me. XP doubler and random-XP chest
  held until XP is stored server side; the onboarding gift chest pays a FIXED amount.
- Leaderboards: daily, weekly and all time, flagged off in production until server tables + RLS.
- Native: Capacitor (rulebook amended). Answer shapes kept (bloat list amended).
- Over the payload budget: cut weight, do not raise the limit. Sound: copy the island module in.
- "Paid later" copy waits for the UMD content sort; Wave 1 says "Free for now" only.
- orgo_1 keeps "Opening next"; all other closed courses read "Not open yet".
- Skipped onboarding: default goal until changed in Me (ECONOMY amended). Label: "Practice" (US).
- Owner-approved test changes (20 Oct): beatRunner (a ladder lesson may open on a warm-up but
  must contain its ladder), pathwayState (test the next unit WITH content), u4-dow hangs on
  u4-snar; plus explicit per-test timeouts for tests that are slow on their own.
- Wave 2 picks (20 Oct): top bar = A3 decluttered: ONE row; energy as a plain number (no bar);
  a short XP bar at the top with Bloom's level badge; label "N XP to the next stage!" (later
  "N XP to pass <classmate>" once leaderboards are real), never "135 / 200"; NO energy cost shown
  on spend (no -N chip, no cost slice). +XP moment = B1. Chest = C1 (three taps, five diamonds
  fly one by one to the counter). Add DAILY GIFTS.
- Chests are EARNED and SAVED (owner 20 Oct): completing a task (a daily quest, a section final, a
  daily gift) drops a chest right away with "Open now" / "Save for later"; saved chests stack in a
  chest inventory (in Me, or a corner badge) and can be opened one by one or all at once.
- Section rewards and deck collection (owner 20 Oct): reaching a NEW section gifts that section's
  card deck (saved into the student's deck collection) and may also gift a chest. The starting
  point counts: wherever a student starts (Unit 1, or a later unit if they skip ahead because they
  joined late) they are gifted that section's deck. Every section has its own deck. Collecting
  decks unlocks achievements. Students can make folders to organise decks, like the review folders
  on the Blueberry site (reuse that pattern). Builds on the chest model (Wave 2) and the cards tab.
- Tips and quotes (owner 20 Oct): a list of study tips (how to study orgo) and app tips (how to use
  Blueberry) shown while pages load and when the site opens, plus famous motivational quotes.
  Quotes must be real and correctly attributed (verify each source; no invented or misattributed
  lines). Short enough to read during a load; rotate without repeats; respect the boot loader's
  open owner decision (documentation/BOOT-LOADER-BLOCKER.md) when placing them there.
- Energy (owner 20 Oct, amends ECONOMY): cap 20; lesson -3; challenge or section final -6;
  refill +10 every 30 min; EARN energy: review drill +3, each daily quest +5, flawless lesson +2;
  wrong answers never cost. Intent: a full tank covers a ~5-lesson section and runs out just
  before its final; the free plan must still give real value.
- Sections: split units 3, 5, 7, 8, 9 into ~5-lesson sections, each ending in a chest test-out
  quiz like Unit 1 (Wave 3, with the test-outs).
- Course progress marker: how far through the course a student is, visible to classmates
  relative to them (needs server tables + classes; Wave 3).
- Work mode: subagents, no gauntlet; a validator agent checks Phase 0 + Wave 1 before the push.
- DUPLICATES MERGED: W12 = evening brief items 1+2 (build once, in Wave 3); W6 = evening item 3 =
  A4 HUD (build once, in Wave 2). W3 is mostly built already (courses.ts greys closed courses).

**Calibration, 18 Oct (run before the loop; full reports in `grignard/reports/calibration-2026-10-18/`,
outside the repo; 05_user_report.md is the one to read). Do these BEFORE Wave 1:**
- D1 make the 5 red tests pass (pathwayState, nodeDifficulty, checkpointStakes, pathwayBranchDensity,
  beatRunner) by fixing code or regenerating numbers, never by editing the tests. DONE 20 Oct: two
  regenerated; three test premises changed BY OWNER DECISION (see Owner decisions, 20 Oct).
- D2 the budget validators point at `apps/web`, gone since 09-08 (`packages/validators/src/measure/web-app.ts:47`),
  so they never run; CI only builds. Point them at `src/game`; add vitest + validators to deploy.yml
  before deploy. OWNER OK NEEDED (it can block deploys).
- D3 (superseded by Progress, 20 Oct) `#/app` cold load measured ~585 KB gz vs the 400 KB row; re-measure once D2 works, cut weight before W8/W9/W21.
- D4 36 tap targets under 44 px across 9 controls (`measurements/hit-targets.mjs` exit 1); fix, rerun after W7/W18/W22.
- D6 every new guide/glossary file (W14, EB3b) ships with an RDKit byte-match test like `guideU1.test.ts`.
- Also: D5 keep leaderboard/social/shop flagged off until server tables + RLS exist; D10 contrast audit
  crashes on `#/` (boot settle); D7 W12 = EB1+EB2 and W6 = EB3 = A4, build once; onPointerDown is in 43
  files, not 34; W3 mostly built; W1 already reads "Practise this unit" (see Q8).
- OPEN OWNER QUESTIONS (Q2-Q14 in the report): real-money freezes vs ECONOMY (75 diamonds, "not buyable");
  Shop tab vs Shop inside Me (OPEN-QUESTIONS:305); XP doubler / random XP chest vs the flat XP table;
  leaderboard windows; Capacitor vs the rulebook's Expo/EAS; keep or delete the structure/ranking/reagents
  answer shapes (rulebook 385-399); payload: cut or raise; default goal tier with onboarding skipped;
  guideU1 timeout; copying the island sound module; "paid later" copy timing; orgo_1 "Opening next".

**ORDERED QUEUE, 17 Oct night (owner: "queue these in the order you see fit"; a gauntlet loop
works this top to bottom; the evening brief above and the older items fold in where noted)**

Wave 1, quick fixes (small, visible, low risk)
1. Learn > Start > "Practice this unit": the owner says the word should end in S ("practise").
   ASK before changing: US English uses "practice" for both noun and verb; confirm which he wants.
2. Unit 1 sheet on the path: drop the dark purple square-cornered rectangle behind it; add a line
   that the course is free for now and will be paid later.
3. Courses picker: every course but Orgo 2 visibly not selectable, labelled "Not open yet"
   (Organic Chemistry 1, Gen Chem, DAT, MCAT).
4. Bloom on the path is pressable: a small jump (and a line from him) on tap.
5. Text pass on path lessons: cut AI tells (padding, and over-clipped fragments); read as human.

Wave 2, rewards and the HUD (folds in evening brief item 3 and A4)
6. XP that visibly moves: award on every lesson, quiz and practice; an XP bar; Duolingo-style
   +XP animation with Bloom. The owner finished tasks and saw no XP change.
7. Energy bar redesign: not the circle ("looks ugly"); a bar that says why it matters (what a
   lesson costs, when it refills).
8. Chest opening: 2 to 3 taps, the box shakes, light grows behind it, it bursts open, light fills
   the screen, several 3D diamonds hover a beat then fly into the top-right counter, which counts
   up. Find references first (Clash Royale / Clash of Clans chests, Duolingo chest).
9. Sound: coin/gem pickup (Clash of Clans-like but our own) and a correct-answer chime
   (Duolingo-like, not a copy), with a Sound on/off setting. Build them with the island's
   synthesized sound module (andliu-portfolio/island, `sound` in island/CONTRACT.md: tone() +
   sfx.*), not audio files.
10. Daily quests: three a day, two recurring (complete 2-3 lessons/quizzes; 30 minutes of
   training) and one random (e.g. an XP doubler). XP ranks the leaderboard, daily and all time.

Wave 3, accounts and the home screen
11. A display name typed while signed out does not save: ask the person to sign in, then greet
   "Welcome back, <their name>" with "pick up where you left off" (links to the path), and feed
   notifications (friends' encouragement), quests and reminders. That is what the feed is for.
12. Skip ahead: unlock a unit not yet started by testing out (evening brief items 1-2).

Wave 4, cards and starter reactions
13. Starter reactions feel like a separate app: keep the feel, make it cohesive with the shell.
14. Glossary of every compound on the cards (acetophenone, benzoic acid, benzyl chloride, methyl
   benzoate, buta-1,3-diene, ...): structure (RDKit), name, and WHY it is named that way (-oic
   acid, -one = ketone, phen- = the benzene ring, aceto- = the acetyl part), plus the owner's
   lecture point on substituent reactivity (EWG / EDG). An info icon on each molecule opens it.
   DONE 23 Oct, see "Progress, 22 Oct".
15. The dashed "?" box under each card: replace with an arrow (it is a reaction) and a specific
   prompt ("What forms?" / "Which reagent?").
16. Answers on the product side: a name, a formula, or a drawing. Keep the Ketcher editor; add a
   scratchpad for finger / Apple Pencil (iPad), and try turning a sketch into a close molecule
   in the editor (research spike first; may be hard).
   SCRATCHPAD DONE 23 Oct, spike written; sketch to molecule awaits an owner pick, see "Progress, 22 Oct".

Wave 5, lessons
17. Prediction revisit: at the end, "Here was your prediction. Still agree?" yes/no, then right or
   wrong with the reason, or ask for feedback; the map step after it, made cohesive (today it
   does not match).
18. Practice inside Learn: trim empty space so a question fits one phone screen.
19. Double bonds: the second line on the INNER side of the angle, parallel to the single bond,
   the skeleton unchanged (careful: a fix here can make it worse; measure before and after).
20. Decide where a flagged question goes (owner likes flagging; destination undecided).

Wave 6, polish
21. Pathway supernova: a bright four-point star flash that closes to a red or blue glow with a
   slight ripple (today it does not read as a supernova).
22. Site footer like andliu.dev; "Find me" as GitHub / LinkedIn / email logos that expand into
   words on hover; make FAQ easier to find (he likes that page; maybe recolour later).
   DONE 23 Oct, see "Progress, 22 Oct".

Added 20 Oct (owner)
23. Admin lesson viewer: open ANY lesson at any time, step through its questions as a slideshow,
   toggle student view and Pro / Free view, and edit the text in place (edits saved server side,
   admin only; the plan toggle is a view, never a grant). Folds into Wave 3's admin view.
24. Back buttons over images (guides first): a faint circle behind the back button so it reads on
   any header image. Small; do with the next quick-fix batch. DONE 23 Oct, see "Progress, 22 Oct".
25. SANDBOX tab: play with molecules in several views (2D, 3D, skeletal/condensed); draw with
   finger, mouse or Apple Pencil (test on iPad); build with the molecule editor (Ketcher, lazy);
   arrow-pushing mode where you search and add reactions; save intermediates and replay them as a
   slideshow. Needs a design pass and a tab-count decision (the rulebook caps tabs: probably inside
   an existing tab or replacing one; ASK).
26. Stereochemistry: little is built in. Add it where reactions need it (anti/syn additions,
   epoxide opening, Diels-Alder endo, SN2 inversion, enolates, Fischer projections). See the audit.
27. Glossary (merges W14): Orgo II nomenclature; personal definitions a student saves, marked with
   an award badge as their own; pKa table; EVERY reaction, categorised by functional group so the
   reaction maps (EB6) can be built from it (alkanes, alkenes, alkynes, aromatics, haloalkanes,
   alcohols, thiols/amines, aldehydes/ketones, carboxylic acids, esters, with each interconversion);
   shorthands (DMSO, THF, tBu, DMS, Py, Ph, Me, Ts, PCC, Jones = H2CrO4 in Orgo II). Structures from
   RDKit with byte-match tests (D6). CORE DONE 23 Oct, see "Progress, 22 Oct"; personal
   definitions and the full reaction catalogue still open.
28. Curriculum audit against the owner's reagent reference
   (`documentation/ORGO2-REAGENT-REFERENCE.md`); gaps in
   `grignard/reports/curriculum-vs-reference-2026-10-20.md` (outside the repo). Feeds item 5 of the
   evening brief (build the other units from shared templates).

Kept, owner likes (do not regress): the progress bar, lesson progression, the lesson guide, the
map, predictions up front, numbered carbons, flagging, full screen on iPad, the selecting
interaction in practice.

Also queued earlier tonight: the iPhone preview for Netlify is at `grignard/iphone-preview`.

**Later, by owner decision (17 Oct)**: native apps via Capacitor (Android Studio + emulator with
live reload; iOS needs a Mac or a cloud Mac), after Unit 1 is solid. No Kotlin/Swift rewrite.

## Review built (replan phase 7), uncommitted, 2026-10-07

`#/study-decks` is Review: Due today, My decks, the library as tiles. A deck opens on its first
card, which flips on a tap and tilts on a hold, with progress in words. The deck page is
`src/components/review/` and is lazy; entry bundle 373.2 to 327.3 kB. Addresses unchanged.
**"Due today" means the cards marked Missed or Unsure** (decks have no scheduler; ratings stay
local), pending the owner. Six deck view modes became study card plus list and table. Detail:
`site-build-log.md`, "Phase 7".

## Learn built (replan phase 5), uncommitted, 2026-10-07

`#/learn` is the Learn index; `#/lessons` and `#/reactions` redirect there, the old
reactions page is gone, and a reaction is a card that opens a sheet inside its lesson.
**The lesson-to-unit mapping, `src/data/learnMap.ts`, is the DRAFT from
`DRAFTS-2026-10-07.md` section 2, pending the owner's approval.** Diazonium formation and
Sandmeyer stay under Amines until he decides. Detail and open items: the builder's
`site-build-log.md`, "Phase 5".

## Home rebuilt (replan phases 4a to 4d), uncommitted, 2026-10-07

Section 7's five beats: a CSS loader, the hero with Bloom, a lazy phone demo (Learn,
Practice, Review, Schedule), the four destinations with counts from `src/data/taxonomy.ts`,
a backwards-arrow proof in the game's own words, and the close. Nunito is loaded for titles.
Entry bundle 433.1 to **384.3 kB**, under the 400 kB budget; GSAP is imported nowhere.
**The headline is a marked stand-in, `HOME_HEADLINE` in `src/data/site.ts`: Andrew writes
it before the next deploy.** Detail: `site-build-log.md`, "Phase 4a" to "Phase 4d".

## Site replan phases 0 to 3 built, uncommitted, 2026-10-07

`documentation/SITE-REPLAN.md` section 11, phases 0 to 3, on `ui/cta-and-background`:
tokens (`src/tokens.css`), the mechanism promo and template video out, one lavender
ground with no photograph behind text, and one header, phone bar and footer drawn by
`SiteChrome` for every site page (the five destinations live in `src/lib/siteNav.ts`;
retired addresses in `src/lib/redirects.ts`). `measurements/contrast-audit.mjs` now
reads oklch colours and has a `--site` run over 28 site pages: 4 rows left, both
marks the owner should rule on (Google's "G" logo, a Ketcher glyph the audit cannot
see behind). The builder's log, with every number and the open items, was written to
that session's scratchpad as `site-build-log.md`.

## Reagents are drawn, not spelled, 2026-09-28

Owner rule, stated twice: "always draw it out in the skeletal structure", and "also draw
out the reagents in the reactions". `scripts/build_curriculum.py` now renders every
drawable reagent to `public/reagents/` with RDKit and emits `REAGENT_ART` into
`src/data/reactions.ts`, keyed by the token the stages spell. That map, not a shape test,
is the registry of which reagent tokens are structures: `CN`, `CO`, `NN`, `BrBr`, `Br` and
`CI` are SMILES that read like formulas, and `PCC` and `NBS` are formulas that parse as
SMILES, so nothing about the characters can tell them apart. The generator fails the build
on a reagent it cannot classify.

37 of the 43 reactions now draw every reagent. The six that do not are data gaps, listed
with their reasons in `src/game/test/reactionCards.test.ts` ("draws every reagent whose
structure the data carries"). **Two open owner decisions live there:** `[H3O+]` is not
valid SMILES, so the generator holds `[OH3+]` for it in one annotated line rather than
editing 11 stages and re-running classification; and the Grignard and Gilman carry only
`[CH3-]`, so their organometallic bottles have no structure to draw.

Still text, and out of scope until the owner rules: the lesson and MCQ scheme cards
(`src/game/lesson/lessonFigures.ts`, `src/game/beats/mcq/mcqFigures.ts`) show reagents as
authored strings over the arrow, and their substrates are hand-authored geometry rather
than RDKit renders. Drawing one side with RDKit would put two drawing styles in one scheme.

## The numbered gauntlet is finished, 2026-09-23

Phase 6 closed; its record is `documentation/PHASE-6-VERDICT.md`, and its headline is
not a win. Three times this month the product told a student something chemically
untrue, and a critic measuring the running app caught every one while tests and review
caught none. Two budget instruments turned out to be broken on their own terms and were
repaired. The entry plus game route measures 527.7 KB gzipped against a 400 KB budget,
which is an owner decision, not a bug. Phase 5 was overtaken by the 17 Sep order that
dropped decorative backgrounds. What is still open is the 17 Sep product brief, tracked
in the Seven Gauntlets artifact rather than here.

## The palette is a measured blue-violet, 2026-09-23

`--bb-primary` is `#5a3fd8` in light and `#6d5ae0` at night, with ink `#472ab4` and edge
`#33208c`. Chosen by measuring, not by family: both beat the values they replace, and the
night value fixed a live failure, since the `#2457d6` it replaces measured 2.79:1 against
the night ground, under the 3:1 floor WCAG 1.4.11 asks of an interface component.

**The trap this exposed, worth carrying:** `theme.css` had drifted into lying twice over.
Its light block argued for a violet `#6d3fd4` and quoted that colour's ratios while
shipping a plain blue; its dark block derived `#5b60c8` while shipping `#2457d6`;
`meter.css` claimed `--bb-primary-bright` "alone is #8b5cf6" when the shipped value was
`#4779ee`. In this repo a contrast ratio in a comment is a claim, not a fact. Re-measure
before trusting one, and move the prose in the same edit as the colour.

The 2026-09-05 status this file replaced described the game's OLD repository,
branch `phase-5` at `b83bceb`, and travelled here verbatim in the merge. Its
gauntlet record and owner decisions still matter and still live where they
always did: `blueberry_game/apps/web/measurements/` and
`blueberry_game/STATUS.md` (marked historical). Nothing in that record is
re-stated here, because a copy is a thing that goes stale.

## Two measured checks now run against this build, 2026-09-13

`measurements/` holds two of the old harness's checks, pointed here: `npm run build`, then
`npm run hit:targets` (the 44 by 44 floor) or `npm run contrast:audit` (WCAG AA). Their seeds
and drives are `measurements/economy-moments.mjs`, copied from blueberry_game with the `#/app`
prefix added where they navigate. The rest of the harness is still in blueberry_game.

- **hit:targets passes:** 1,928 controls, 12 routes, two viewports, 0 under the floor
- **contrast:audit stops at its `boot` moment, correctly.** The front door does not exist inside
  the site, which is the decision `documentation/BOOT-LOADER-BLOCKER.md` waits on. Retiring the
  front door removes that route in the same commit; re-homing it makes it reachable again. Do
  not withdraw the route to get a run
- A one-off diagnostic with boot withdrawn, not kept, found 32 distinct pairs under the floor
  across the other 24 screens. Unjudged: that build carried uncommitted site edits, and many
  rows are measured against the site's page ground `rgb(245,247,251)`, which may mean the
  backdrop climb now reaches past the game to the site behind it
- **The frame rate and interaction budgets have no working measurement.** `measure-headless`
  and `capture-trainer` depend on `?auto=1` and `?primitive=`, which lived in the old
  `TrainerTab` and `DrawCanvas`; the 2026-09-11 rebuild removed both. A hook in
  `TrainerScreen` has to exist before they can be ported
- Every game route titles itself "blueberry · Course", the trainer included; the
  `useDocumentTitle` table may be missing rows. Seen, not investigated

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
