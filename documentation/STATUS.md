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
  Review page (23 Oct, dev only): `npm run dev`, then http://localhost:5173/#/signoff (213 pool
  items in the students' own views, A/S/J/K). Verdicts land in `documentation/unit1-signoff.json`;
  no flag is flipped until the owner asks. Code: `src/game/signoff/`.
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
  - 24 Oct: shared shuffle and the test-only export audit done, see "tidy-leftovers DONE 24 Oct".
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

**Content fixes, 23 Oct (24 Oct 04:40 final check; audit documentation/CONTENT-AUDIT-OCT-23.md). Commits only, nothing pushed**
- Shipped per unit: U0 pool fixes, harder test out (2eed935). U1 exam scored whole at 80% (4240fd4),
  NBS names both products (27fd79a). U2 Frost circle taught first, level 2 items, wording and N-H
  fixes (59cce0f, 0acb268, a697d6e). U3 sequencing key fixed, directing after arenium, ladders wired,
  EAS synthesis gaps (fa81b0a, f8b1b71, 6c85a6a, 3ca76fa, bed0b3c, c20adc2). U4 audit set incl. unit
  exam (f440f9d, d1eafb5). U5 syn addition, seq-mesylate base, acid dehydration trainer (263f72f,
  eaafc3e, c392412). U6 splitting basics, unit exam, IR held (38ecbea, 16a238d, d505043). U7 E/Z,
  protect order, real distractors (8170367, 6251fe7). U8 decarboxylation and ladder rules, wired
  first lesson, test twins (6b8b03c). U9 malonate pKa, retro aldol, enolate resonance, level 2
  (dd557cb, 0074d10, f6b5526, b7ff450). U10 Hofmann base, Sandmeyer, amide reduction, basicity
  opener, level 2 (9f077e0, 291e0c9, d67a9dc, ea05bce, 40c3176, 3ba68be).
- Shipped across the game: harder questions played and paced (4d0d650), A/B/C tiles until Check
  (e12272f, e29d5a9), ladders keep drawings in tests (0607b96), why-yours-is-wrong open (5cd7803),
  bigger figures (a410a6c), missed-drag hint (6f9d448), CTA opens lesson 1 (104a930), section
  names (b12e9b0), Train tab dev notes gone (0fdb727), one lesson count and "notes" (9dc2a44,
  ce8b02f, 83104fb), rewards and quests (b80cf3a, fe67220, ccb69d3, 686ca0d, 85d74a3), Section
  wording, dark draw board, class in hero (f0b86a7, f888f24, a9ea54d).
- Left from the audit: top-25 #5 (U0 story chapters; StoryScene.tsx and u0/u1 edits sit
  uncommitted, tsc -b red on StoryScene.tsx:78 until it lands), #12 (easiest first), #21 for
  U1 (picks with names only; U3's u3-alk-fails got drawn tiles in f8b1b71); section 5 #3
  (test out on locked pages) and #10 day-one goal; section 6 draw items in U4 to U7, extra L0
  items, exam twins for U2/U3/U6, distractor swaps, and the by-unit authoring lists.
- Final check: tsc -b one error (StoryScene.tsx, untracked, in progress); build passes; vitest
  75 red in the full run with a second workflow on the machine, all timeouts but two (U6 exam
  follow-ups, fixed in d505043); reruns green except learn.test's first two Learn addresses
  (cold lazy load past its 3 s settle under load). Payload 400.3 KB gz first open (was 341.8):
  supabase-js (53 KB) is back on #/app first open since c926b19 (G1 sign in before the app).
- OWNER decisions pending: side quests on exams (top-25 #10, not done); IR band numbers sign-off
  (#9: signed off and live 24 Oct, see the Owner brief, 23 Oct block).

**23 Oct workflow run (wf_6a2d3c6a-47c), finished. Commits only, nothing pushed**
- Passed the critic: supabase lazy (9066e61), 21 supernova (already shipped), 24 back disc
  (c9637b1), 22 footer (5e77a62, fcbc006: Find me email now matches andliu.dev), 11 welcome back
  (3f45107, 86ae178: league nickname kept apart from the account name), guides u3-u6, glossary
  (4bc2015, 3a33426: info icons in the Learn review run too), sections split u3/5/7/8/9
  (c09bc62), 16 scratch paper + sketch spike (fde080b), 23 admin viewer at #/app/admin
  (cda5fc4), press and hold, action on release (db159dc).
- Tidy-ups (7bca639, fa870d0) did NOT pass the second critic: four hand-written seeded shuffles
  remain (data/tips.ts, glass-folder-cards.tsx, beats/match/board.ts, lib/helpers.ts; fold them
  into one shuffle(items, random)), and the test-only exports item was skipped. Open.
  - tidy-leftovers DONE 24 Oct: one shared shuffle(items, random = Math.random) in
    src/lib/helpers.ts is the only Fisher-Yates loop left in src; seededShuffle, tips dayOrder,
    the glass-folder noise permutation and the match board's target column all call it, every
    order byte-identical (src/test/sharedShuffle.test.ts holds frozen copies of the four old
    loops and compares them over fixed seeds, lengths, days and every shipped match board).
    Test-only exports audited: 448 exports are referenced only by tests outside their own file,
    all imported for real, so 0 unexported. Left on purpose: 296 used in their own module and
    exported for a test to pin (A), 76 package barrel surface (B), 3 lazy-loaded pages whose
    named export the test reads (SchedulePage, GlossaryPage, PkaSettings) (C), 43 authoring
    budgets, validators, fixtures, test resets and the tutoring SQL mirrors (D). OWNER: rule on these 30 (E), production
    code nothing but a test calls; delete each with its test, or keep: SoundToggle (mounted
    nowhere), hudReadouts, readBestRun, quotableText, previousOnPath, sort/board emptyBoard,
    openingBoard, allCards, applyDrop, hitTarget, isSound, stagedReagentLine, offerFromMistake,
    DeckIcon, dueInDeck, deckFromPlaylist, skippedBeatsNote, composer canSave, importIdNote,
    cards/ui/session sessionProgress, trackMapModel, flowOrder, authoredDistractors,
    trailAtSpeed, hasEquivalentAtoms, hitLayout resettleOpenAngles, terminalNeighbor,
    orbitPoint, crossesHeading, pkaCard. No owner step otherwise.
- Final check: tsc clean, 4880/4880 tests (bootLoader red on purpose), build passes, payload
  341.8 KB gz first open (was 399.2; supabase-js 53 KB plus the footer left the first open).
- Found: `npm run test:packages` exits 1 because packages/validators has no vitest config
  (its 14 test files, 87 tests, pass with one). OWNER: add the config (validators package).
- OWNER: glossary info icons on the site's own deck cards (src/data/decks), recorded by the
  glossary worker, not built.

**Owner brief, 23 Oct (queued after the 23 Oct workflow run; not started)**
Tutoring (business test 1)
- T1 Tutoring end to end, testable with seeded model cases: bring a tutor in, the tutor sets
  availability, students book specific slots, the tutor is paid per booked session, and the tutor
  sees a short questionnaire about the student. Today tutoring still runs on Apps Script; this needs
  Supabase tables + RLS and Stripe (money server side). DECIDED 23 Oct: a ledger paid by hand
  (site records hours and what is owed, owner pays and marks paid). $25/hour, $30/hour once a
  tutor has 6 months (a semester), good ratings, a minimum number of lessons and referrals (easy
  benchmarks; admin-editable numbers).
  - Note 24 Oct: the "still runs on Apps Script" line above was already stale. Free office hours
    moved to Supabase on 7 Oct (office_hours tables, #/tutoring redirects to #/schedule?view=hours)
    and are unchanged by this item; paid tutoring sits beside them.
  - tutoring DONE 24 Oct: paid tutoring on Supabase, migration
    supabase/migrations/20261024120000_tutoring.sql (tutors keyed by email and linked to the
    account by trigger, no new profiles.role; weekly hours + time off; bookings with the
    double-booking guard as an exclusion constraint; the four-question questionnaire readable only
    by the booked tutor and staff; ratings; referrals; a ledger written only by a trigger that
    prices each completed session from tenure and stats at its end, $25 or $30, with the basis
    stored per row; admin-editable benchmarks in tutor_pay_rules, defaults avg >= 4.5 over >= 5
    ratings, >= 20 lessons, >= 2 referrals, 6 months). Pages, all lazy: #/tutors (Book a tutor:
    a week of open hours, questionnaire sheet, Add to my calendar, My tutoring sessions with
    cancel and 1-5 stars), #/d/tutor (Tutor desk: 3-step walk-through, weekly hours grid, time
    off, upcoming sessions with the questionnaire, Mark done / No-show, own rate and ledger),
    #/d/tutors (Tutors, staff: bring a tutor in with a copyable invite and mailto, list with
    $25/$30 badge, missing benchmarks named, amount owed, unpaid sessions with Mark paid, pay
    benchmarks editor). Schedule's header gains "Book a tutor" (everyone) and "Tutors" (staff).
    Until the migration is applied every page says "opens soon" honestly; no localStorage data.
    Model cases: supabase/seed.sql (LOCAL ONLY) seeds seven tutors on the rate edges (6.0 vs 5.9
    months, 4.5 vs 4.4 over 10 ratings, 4 vs 5 ratings, 19 vs 20 lessons, 1 vs 2 referrals);
    supabase/rls-tests/tutoring.sql passes on the local stack (19 checks: rates at AT, the
    constraint refusing a direct overlapping insert, refusals, who reads answers, money columns,
    ledger on completion); office_hours.sql still passes; 51 vitest tests in
    src/test/tutoring*.test.ts mirror the rule and the guard. Payload: no first-open change
    (400.2 KB measured with and without this item's entry edits; the gap from 341.8 is other
    sessions' uncommitted edits in the tree). OWNER: (1) apply the office_hours migration if not yet
    applied, then 20261024120000_tutoring.sql (it enables btree_gist, which Supabase ships);
    (2) never run supabase/seed.sql against the live project (`supabase db push` does not);
    (3) invite emails are copy/mailto for now, an Edge Function sender is optional later.
    Owner questions: (a) the student cannot read back their own questionnaire (brief followed
    strictly); allow it? (b) a session is priced on the record before it, so the 20th lesson is
    still $25 and the 21st is the first $30; right? (c) referrals are addresses a tutor enters on
    their desk, credited once that student completes any session; is that the referral you meant?
    (d) cancellations have no cutoff (any time before the start); want a 24-hour rule?
  - tutoring fix round 24 Oct: a referral no longer pays for typing in a student who is already
    taught. tutor_stats now credits a referred address only if that student had booked no
    tutoring at all (any tutor, any status) before the referral row, and the completed session
    ends after the referral. created_at on tutor_referrals is not client-writable (insert grant
    is referred_email only), so it cannot be backdated. New rls-test case (an active student
    typed in as a referral, not credited) fails on the old function and passes on the new one;
    all 19 tutoring checks and office_hours.sql pass locally. Payload on a clean checkout of HEAD:
    399.3 KB total gz, 399.1 KB before the tutoring commit (+0.2 KB, the lazy route entry); the
    341.8 figure in the run brief is stale for this harness. OWNER: the migration file changed
    before it was ever applied, so apply 20261024120000_tutoring.sql as it stands now.
    More owner questions: (e) the tutor alone marks a session done, which writes a ledger row
    with no student confirmation, so a no-show can be billed as completed; fine while you pay by
    hand, or should the student confirm (or only staff)? (f) a deactivated tutor loses all
    access, including reading their own ledger, and their future booked sessions stay booked
    with nobody told; staff also cannot edit a mistyped invite email (deactivate and invite
    again). Change either? (g) "exceptions" are time off only; a tutor cannot add a one-off
    extra hour outside the weekly pattern. Want extra hours too?
- T2 Admin view for the owner and TAs (roster already makes Kai, Ryan Rathbun and V. Wedekin admin;
  Ryan and V. have no account yet and become admin on first sign-in): preview + edit, tutor testing,
  watch test accounts complete lessons.
Course (business test 2)
- C1 Syllabus import: paste an Orgo II syllabus, reorder units/lessons to its schedule, adjustable by
  hand afterwards (the site already has an Apps Script syllabus PDF import for the calendar).
  - RULE, owner 24 Oct: Side quests (benzyne, Hofmann and the like) count on quizzes and exams only
    when the student's syllabus covers them; default no. The syllabus import (C1) sets it. Today's
    behaviour already matches the default: test-outs and exams draw from the main line only
    (onLine in src/game/tabs/pathway/testOuts.ts drops branches).
- C2 pKa sheet paste updates the site's pKa values, with visible feedback on what changed.
  DECIDED 23 Oct: a student's own values only.
  - pka-per-student DONE 24 Oct: Me, Settings, pKa values has a "Paste your sheet" card. A student
    pastes a table (spreadsheet, CSV, PDF copy with names and values on alternating lines,
    bullets, Unicode minus, subscripts); each line is matched to a rung by name, formula or
    parent compound (src/game/settings/pkaAliases.json, every SMILES checked by RDKit in
    scripts/check_pka_aliases.py; substituted compounds like TFA are never aliases). The card
    shows Changed (old -> new), Already the same, and Could not use with a reason (unknown name,
    no rung yet, two values for one rung, a range, a slipped digit), plus "Reset to Blueberry's
    values". One store commit per paste. Lessons, cards, glossary and the conflict panel already
    read the student's values; the site's pKa reference deck now shows an overridden rung as
    "15.7 (yours)" (overrides only, not the preset). Values sync to the account when signed in
    (src/game/settings/pkaSync.ts, newer side wins, another account's values are stashed, never
    pushed); until the table exists they stay on the device and the card says so. Payload: no
    first-open change (everything new is in the lazy settings chunk or a dynamic import; total gz
    400.1 KB measured with and without this item, the overage coming from other sessions'
    uncommitted edits in the tree). OWNER: apply
    supabase/migrations/20261023130000_user_pka_settings.sql. Owner questions: (1) the HX acids,
    HCN, HN3, carbocations and amides have no rung, so a pasted value for them is reported, not
    used; add rungs (a curriculum change)? (2) authored prose and feedback that print a pKa as
    text (lesson copy, the match board, Unit 9's "about 10") still say Blueberry's number; leave,
    or route them through pkaValueFor? (3) "Reset" clears the student's own changes only and keeps
    the chosen table (worksheet or textbook); should it also switch back to the worksheet?
  - pka-per-student FIX 24 Oct: the site's pKa deck now shows every value the game grades with.
    A student on "Standard textbook" sees its numbers there ("4.8 (your table)", resolved by the
    game's own pkaValueFor through src/game/settings/pkaSiteBridge.ts, loaded only when needed);
    their own values read "(yours)"; the Hydronium / protonated alcohol row shows either rung. Rows
    with no rung (HI, HBr, HCl, H2SO4, HNO3, HF, HN3, HCN, carbocations, amide) now take a pasted
    value for the deck only (src/game/settings/pkaSheet.ts; names and SMILES in pkaAliases.json,
    RDKit-checked by scripts/check_pka_aliases.py), so owner question (1) is now only "should
    lessons get rungs for them". Opening the deck signed in runs account sync, so a new device
    shows the account's values without opening #/app. A change made just before sign-out is now
    pushed at once. Question (2), authored prose, is unchanged and still the owner's call.
    Payload: no change on the #/app first open (no pka chunk in the first-open set; total gz
    400.3 KB with and without this fix in the same tree, so the overage over 400 comes from
    other sessions' uncommitted edits, not C2). OWNER: apply supabase/migrations/20261023130000_user_pka_settings.sql
    then 20261024130000_user_pka_sheet_values.sql (until the second is applied, sync reports
    "saved on this device" and values stay local).
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
  - account-progress DONE 23 Oct: every journal event now carries an id (old caches get stable
    legacy:<hash> ids), and a signed-in student's journal syncs to a new table progress_events
    (append only, own rows only, insert by column grant). On sign-in the app pulls the account's
    events, merges by id (nothing local is lost on a first sign-in, lesson records rebuild from
    the journal), then pushes what the account lacks, batched, retrying with backoff; the local
    journal is the offline queue. A second account on the same device gets its own journal and
    the first one's store is kept under blueberry.progress.v2.stash:<id>. Until the table exists
    sync goes local-only and Me says "Lessons save on this device for now." Feed's sign-in links
    now read "Sign in to save your progress and your name". Payload: #/app first open 398.3 KB of
    400 (progressSync is its own lazy chunk). OWNER: apply
    supabase/migrations/20261023120000_progress_events.sql, then sign in on two devices, finish a
    lesson on one and reload the other. Known limits: each session pulls the whole history (fine
    at today's sizes; switch to an id-only diff if journals grow); events are client-claimed (the
    Phase 6 server check is not in scope); crypto.randomUUID needs a secure context, as the
    existing callers already do.
- A2 REPLACED 23 Oct by a rule: the first lesson of every section in every unit is open, so a
  student can start anywhere; only the lessons after it are gated. Completing a lesson plays a
  green glow down the path to the next node, a lock-unlocking animation, a bright glow and a
  small celebration (no confetti; reference Duolingo and others on Mobbin).
  - unlock-sections DONE 23 Oct: every section's first lesson is open on every unit, later
    lessons open behind the stop before them in their own section, side quests behind their own
    prerequisite, a unit check once its unit's lessons are cleared (sectionStarts.ts, laid over
    the old rule). START stays where it was. The unlock plays once on return to the path
    (unlockCelebration.ts, pathUnlock.css): glow down the road, padlock lifts, bounce, halo,
    sparkle ring; reduced motion shows a still halo. No migration or deploy. Owner: the old
    stricter rule is still pinned by its tests as the base layer (pathwayUnlock, checkpointStakes:
    unitLockSaid, the "Locked. Finish Unit N" note); the student never sees those locks now.
    Keep them as the base, or retire them?
Sign-in, Pro, paywalls, ads (owner, 23 Oct)
- G1 Sign-in before anything: #/app sends a signed-out visitor to a sign-in page with a Pro
  suggestion (owner chose this over lesson-first after the trade-off was raised). The admin viewer
  gets a sign-in CTA too.
  - signin-gate DONE 23 Oct: a signed-out open of #/app (any sub-route) replaces the hash with
    #/signin, remembering where they were headed; signing in (Google, password or email code)
    brings them back there. The gate sits at the site router (AppGate.tsx, appGate.ts) and reuses
    the existing sign-in page and returnTo errand. A stored session shows the loader while it
    restores, never the sign-in page; a cold signed-out open never loads supabase-js or the game.
    The sign-in page, when headed into the app, says why and shows a quiet Pro card linking
    #/d/subscriptions (no price, no promises); headed to #/app/admin it adds a staff line. The
    admin viewer offers a sign-in card instead of bouncing a signed-out visitor. Payload: #/app
    first open 397.4 KB of 400 (supabase-js is now counted, since the game only renders signed
    in); a signed-out #/app open, which lands on #/signin, is about 251 KB (255 with the loader
    tip). Nothing to apply or deploy (no migration, no Edge Function, Google redirect URL
    unchanged). A1's "reminder to sign in to save progress" is moot inside the game now.
    Owner questions: (1) the puppeteer harnesses in measurements/ (contrast-audit, economy-moments,
    hit-targets) open #/app signed out against a configured build and will now land on #/signin;
    run them against a build with VITE_SUPABASE_* unset (the gate lets everyone in when sign-in
    is not configured), or decide another way. (2) Pro card copy is a draft: "Thinking of going
    further? Pro is there when you want it." (3) The game's onboarding funnel (#/start then #/app)
    now meets sign-in on its way into the app; say if the funnel should ask earlier.
- G2 Stripe for Pro now, gated so only staff can test it (server side), Stripe test mode.
  DONE 23 Oct in 3e58e81: Pro checkout gated server side (stripe-checkout refuses non-staff while
  PRO_CHECKOUT_OPEN is not "true", and refuses sk_live_ keys while shut); staff see Test checkout,
  everyone else Pro is coming soon; return URL fixed to #/d/subscriptions. No new migration (the
  billing migration already denies clients any write on entitlements). Payload unchanged by this
  item (#/app first open 398.4 KB, billing is dashboard only). Owner: run the OWNER STEPS below
  (also in documentation/STRIPE.md, "Staff-only test gate").
  OWNER STEPS:
  1. Check the billing migration is applied: `npx supabase migration list`; if
     20260907120000_billing is missing remotely, `npx supabase db push`.
  2. Stripe dashboard in TEST mode: create product "Blueberry Pro" with a monthly price (and a
     yearly one if wanted) and "Semester pass" with a one-time price; copy the price_... ids.
  3. `npx supabase secrets set STRIPE_SECRET_KEY=sk_test_... STRIPE_PRICE_PRO_MONTHLY=price_... STRIPE_PRICE_PRO_YEARLY=price_... STRIPE_PRICE_SEMESTER_PASS=price_... SEMESTER_PASS_ENDS_ON=2026-12-20 SITE_URL=https://andliu7.github.io/blueberry`
     (leave PRO_CHECKOUT_OPEN unset; that is the gate).
  4. Deploy: `npx supabase functions deploy stripe-checkout --use-api`,
     `npx supabase functions deploy stripe-prices --use-api --no-verify-jwt`, and stripe-webhook
     (`--no-verify-jwt`) and stripe-portal if they were never deployed.
  5. Stripe test-mode webhook endpoint
     https://kwoqzfvssoxxuvlzzhrp.supabase.co/functions/v1/stripe-webhook with events
     checkout.session.completed and customer.subscription.created/updated/deleted; then
     `npx supabase secrets set STRIPE_WEBHOOK_SECRET=whsec_...`.
  6. Test: sign in as owner, #/d/subscriptions, Test checkout (staff only), card
     4242 4242 4242 4242, any future expiry, any CVC. Expect a webhook 200, one entitlements row,
     the Current badge on Pro. Check that a non-staff account sees "Pro is coming soon", and that
     calling stripe-checkout with a student token returns 403 checkout-closed.
  7. Going public later = set PRO_CHECKOUT_OPEN=true and switch to live keys, once the copyright
     question in STRIPE.md is settled. Owner decision, not part of this build.
- G3 Paywalls after value: after the first completed lesson, then intermittent reminders like
  Duolingo.
  DONE 23 Oct: the Pro sheet (src/game/upsell/). Shown once on the path after the first completed
  lesson, then at most once a local day, never on two clears in a row, every 3 lessons growing
  to 6, 12, 24 and waiting 1, 2, 4, 8, 14 days as "Not now" taps add up; a streak milestone (7,
  14, 30 days) skips the lesson gap; "Tell me when it opens" leaves only streak milestones; never
  mid-lesson, never over a chest, never to a Pro account (checked when it draws). Staff see "Try
  the test checkout"; everyone else "Pro is coming soon. Nothing is on sale yet." and "Tell me
  when it opens", which writes pro_interest (falls back to "Saved on this device" if the table
  is missing). Lines of what Pro adds come only from the Pro card in subscription-plans.tsx
  (pinned by upsellCopy.test.ts). Schedule is per device (localStorage blueberry.upsell) until
  account progress syncs it. Payload +0.3 KB (#/app first open 399.5 KB of 400 with the tree's
  other uncommitted work). Owner: apply supabase/migrations/20261023180000_pro_interest.sql
  (`npx supabase db push`). Owner questions: (1) the sheet lists "Mechanism practice, marked as
  you draw it" and "Importing your own notes" because the Pro card does, but both are free in
  the game today; confirm or trim the card. (2) pro_interest collects who asked; nothing emails
  them yet: say whether Pro opening should be an email or only the in-app sheet.
  FIX 24 Oct (critic round): "never twice in a row" now holds in production (noteLessonClear
  decides before it counts the clear; pinned by a show-then-next-clear test in
  upsellNote.test.ts). The sheet lists only "No ads", the one thing Pro gates today (AdSlotBody
  hides ads for Pro), added to the Pro card too; mechanism practice and note import are off the
  sheet because they are free. The fallback now says "Saved on this device. We'll ask less
  often. It didn't reach us, so no email is coming." instead of promising a notice nobody
  sends. A Pro account that reaches the sheet is recorded with the longest backoff (14 days, 24
  lessons), so Pro users stop fetching it after every lesson. Owner question (1) now applies to
  the hidden Pro card only. Ads stay off until the AdSense ids are set, so today "No ads" is
  true but sells little. #/app first open 399.9 KB with the tree's other uncommitted work.
- G4 Ads from a real ad network, easy to remove (Pro removes them), consent first.
  DONE 23 Oct, OFF by default: Google AdSense slots (src/components/ads/, src/lib/ads/). With
  VITE_ADSENSE_CLIENT or VITE_ADSENSE_SLOT empty (today) there are no ads, no consent prompt, and
  the ad chunk is never fetched. With both set: one slot per unit between its first two path
  sections, one on the feed under "Your activity", one at the foot of Home and FAQ; never in a
  lesson, quiz, test-out, review, sign-in, the funnel, checkout or the admin viewer (pinned by
  adPlacement.test.ts). Each slot asks first ("Allow ads" / "No thanks"); Google's script loads
  only after "Allow ads", never for a Pro account, never while Pro is still being checked
  (adSlot.test.ts). "No thanks" leaves one line, "Ads are off. Remove ads with Pro". "Ad choices"
  (in each slot, and in the site footer when ads are on) forgets the answer. The answer is per
  device (localStorage blueberry.adConsent). The consent card copy is a DRAFT for the owner.
  Payload +0.3 KB (#/app first open 399.9 KB of 400; 399.6 without ads, the rest is the tree's
  other uncommitted work). Owner steps: (1) create an AdSense account and add the site; decide
  github.io versus a custom domain (AdSense wants a domain you control, see (4)). (2) Create ONE
  responsive Display ad unit; leave Auto ads OFF. (3) Set repo secrets VITE_ADSENSE_CLIENT=ca-pub-...
  and VITE_ADSENSE_SLOT=<unit id> (deploy.yml already reads them), then redeploy. (4) Publish
  ads.txt at the DOMAIN root with Google's line `google.com, pub-<your id>, DIRECT,
  f08c47fec0942fa0`, copied from the AdSense ads.txt page, not typed. (5) Write a privacy policy
  page (Terms has no privacy section today). AdSense requires it to say, in your own words: third
  party vendors including Google use cookies to serve ads based on a user's prior visits; Google's
  advertising cookies let it and its partners serve ads based on visits to this and other sites;
  users can opt out of personalised ads at Google's Ads Settings; and a link to Google's "How
  Google uses information from sites or apps that use our services". Also say Blueberry asks
  before loading any ad code and that Pro removes ads. (6) Decide on EEA/UK: Google requires a
  certified consent platform (CMP) there; the in-site prompt is not one. Until decided, either
  keep ads off or restrict serving to non-EEA/UK regions in AdSense. Manual check still to do
  with real ids: DevTools Network shows no pagead2 request before "Allow ads", none for Pro,
  none inside a lesson.
- u6-ir LIVE 24 Oct (audit top-25 #9, owner signed off the IR bands: C=O around 1690 to 1720
  with shifts, the 1500 and 3000 lines, broad O-H and N-H). The map links it; the lesson plays 9
  MCQs then IR_SIGNAL_BOARD. The six held items moved into U6_POOLS (U6_IR_HELD is gone) plus three
  new: the 3000 line (sp3 below, sp2 above, terminal alkyne 3300), N-H count (two, one, none) and
  the C=O shift (conjugated lower, ester higher, read from the 1715 ketone). Bands cited from
  OpenStax sections 12.8, 19.14, 20.8, 21.10 (CC BY-NC-SA) in scripts/u6_pools.py. The u6
  guidebook gains its IR section and a C=O drawing (guide_u6.py); NODE_MOVES u6-ir 1 to 3
  (measured). Not drawn by the Unit 6 exam yet: OWNER, should it be?

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
  339.4 KB. The Find me Email chip now mails zeus.andrewliu@gmail.com, the address andliu.dev's
  footer uses (FIND_ME_EMAIL in src/data/site.ts), and opens the mail app without a new tab. The
  contact page and office hours still use EMAIL, andliu@terpmail.umd.edu; say if they should move too.
- Item 21 (pathway supernova) DONE 21 Oct in af74062, on origin/main: four-point star flash closing
  to a red or blue glow with one ripple; reduced motion shows two still glows; pinned by
  src/game/test/pathSupernova.test.ts. Owner to check it on the live pathway.
- Item 11 (welcome back) DONE 23 Oct: the name now saves to the account (profiles.full_name; Me
  and Leaderboards ask a signed-out student to sign in, then return to #/app), a second open tab
  no longer wipes it (progress.ts storage listener), and the Feed opens on "Welcome back, <name>"
  with "Pick up where you left off" to the path, reminders, and one honest friends line.
  #/app first open 340.2 KB. Signed-in view not checked in a browser (needs a real sign-in).
  Fix round 23 Oct: the league nickname is its own device field again (progress.ts leagueName), so
  it never becomes the account name and a real name never lands on a board unchosen; a blank save
  keeps the student off. A signed-in student with an empty journal (new device, iPad app) gets
  Welcome back with "Start a lesson". The return to #/app fires only on SIGNED_IN and is dropped
  when the student browses away from #/signin. A name save that matched no profiles row now says
  so. #/app first open 341.8 KB. Pre-existing dead code: src/components/ui/profile-fields.tsx is
  only reachable through auth-card.tsx, which nothing imports.
- Items 14 and 27 (core) DONE 23 Oct: the glossary page (556c370) now has an "i" beside every
  named compound and reagent shorthand on a Cards tab card (term list, Test and Write question,
  Write's shown answer; Flashcards and the Learn review run show the same as a chip row under the
  card, the run's product chip only after the call; Match none, since its tiles are tap targets).
  While the sheet is open the card's own keys are off (Flashcards arrows, the run's 1 to 4 and
  Escape). It opens the entry in a bottom sheet, a 0.7 KB lazy chunk; the
  drawings load on the first tap, never with the Cards tab. Compounds now also come from the site
  decks' drawn products (101 in all), and a compound with one group on a benzene ring carries the
  EWG / EDG line, found by RDKit (scripts/glossary.py RING_RULES; every other aromatic compound
  has a written reason in NO_RING_NOTE). Pinned by glossaryCardLinks.test.ts plus the --check
  byte match, which now covers the small names index too. #/app first open 341.8 KB (weigh.ts
  "total gz", 23 Oct fix round; no Cards or glossary chunk is in it, the Cards tab is lazy).
  Still open: the personal definitions store, the full reaction catalogue, and deck STARTING
  materials (the deck files hold names in prose only; they would come from mechanism_trainer's
  generator, owner decision). ASK: the site's own deck cards (src/data/decks, drawn by
  QuestionCard.tsx and review/DeckStudy.tsx) have NO info icon; their products are in the
  glossary but reachable only from the glossary page. An icon there would have to leave the deck
  for #/app/glossary (the sheet lives in the game), so it waits for the owner: link out, or not.
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
