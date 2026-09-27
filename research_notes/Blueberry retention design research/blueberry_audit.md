# Blueberry today: a fresh-eyes audit of the product (code + running app)

Method and evidence conventions (read first):
- Source of truth was the code at HEAD `926fda1` (branch as checked out, `git status` clean) and the app run locally with `npx vite` (dev server, port 5173), driven by Playwright/Chromium on 2026-09-27. Every page was loaded with `?flags=` so the game's dev-only beta flags (`unlockall`, `infinitecharge`, which are ON by default in dev: `src/game/app/flags.ts` `devDefaults()`) were OFF, approximating production.
- The live site (https://andliu7.github.io/blueberry/) could NOT be fetched: the sandbox egress proxy rejected the CONNECT to andliu7.github.io (HTTP 403). Everything below is from the code and the local run. The local build had no Supabase/Apps Script env vars, so every server-backed surface showed its "not configured" state; the live deploy may differ on those surfaces only.
- Citations are repo-relative `path:line`. "Observed" citations point at screenshots saved under `/tmp/claude-0/-home-user-blueberry/c02aeb8a-d6a5-5257-8ff3-a8f9073e4a57/scratchpad/shots/` (scratch, not committed). Repo design docs (`documentation/*.md`, comments) were read only to locate code, not taken as truth; where a comment's claim is contradicted by observed behaviour, both are noted.

---

## 1. Information architecture: every route, how users move between them, first-time vs returning, the "next thing to do"

### Takeaway
Blueberry is two routers glued together: a site router (`src/App.tsx`) with ~20 hash routes built around decks, lessons and course tools for one UMD course, and a self-contained game (`#/app/*`, its own 5-tab shell, own router, own onboarding) that the home page's single CTA now funnels into. There is one obvious next action on the home page (Get Started → game), but the game has no way back to the site, and the game's main pathway nodes currently link to site 404s.

### Cited Findings
**Site routes (all hash routes, dispatched in `src/App.tsx:261-354`):**
- `#/` and `#/home` → `HomePage` (hero + "Everything else" bento board + fake testimonials + Plans + footer) — `src/App.tsx:261`, `src/components/HomePage.tsx:56-220`
- `#/enter` → `EntryGate` ("SYSTEM" window, one button "Start the first lesson") — `src/App.tsx:267`; the button sets `location.hash = TRAINER_URL` = `#/app` — `src/components/EntryGate.tsx:84,117-118`, `src/data/site.ts` (`TRAINER_URL = "#/app"`)
- `#/start`, `#/start/<step>` → `StartPage`, the site's own older 6-step funnel (welcome, course, exam, topics, lesson, finish) — `src/App.tsx:273-275`, `src/components/start/flow.ts:16`. The code comment at `src/App.tsx:271-272` still says EntryGate "lands on `#/start/course`", but EntryGate now goes to `#/app` (`src/components/EntryGate.tsx:76-84`). The funnel is still reachable from the "mechanism trainer" release banner ("Try the first lesson" → `#/start`, `src/data/releases.ts:79`), which is shown on `#/study-decks` (observed `s_decks.png`).
- `#/app`, `#/app/*` → `GamePage` → `BlueberryGame` (whole separate app) — `src/App.tsx:280`, `src/components/GamePage.tsx`
- `#/study-decks` (deck library), `#/folder/<group>`, `#/deck/<id>` (study deck = `StudyApp` in `src/App.tsx:371+`, or `ReferenceApp` for reference decks) — `src/App.tsx:281,315-354`
- `#/lessons`, `#/lessons/<section>[/<reaction>]` — `src/App.tsx:282-290`
- `#/calendar`, `#/tutoring` ("Office hours"), `#/reactions`, `#/new-reaction`, `#/draw/<id>` (Ketcher, ~19MB WASM) — `src/App.tsx:291-297`
- `#/contact` (also `#/about`), `#/terms` — `src/App.tsx:300-301`
- `#/d`, `#/d/<section>` → Dashboard pages (Profile, Notifications, Calendar, Tutoring, Settings, Categories: Lessons / Concepts "soon" / Study Decks / Reactions, Extra Options, More info) — `src/App.tsx:304-306`, observed `s_dash.png`, `src/components/ui/dashboard-nav.tsx:158` (Concepts flagged soon)
- `#/workspace` ("Unlinked from the nav on purpose; reached from the name on the About card") — `src/App.tsx:307-310`, link at `src/components/SiteActions.tsx:139`
- `#/signin`, `#/signup`, `#/staff` — `src/App.tsx:311-313`
- Anything else → `NotFoundPage` ("404 Looks like you're lost", offers "All decks" and "Grignard deck") — `src/App.tsx:325-326`, observed `s_404.png`
- Persistent overlays mounted outside the router on every site route: Focus timer, Global search ("/" key), Blueberry bot (Ask Blueberry), Account corner; all hidden on `#/app` — `src/main.tsx:21-31`, `src/components/SiteChrome.tsx:20-33`

**Game routes (inside `#/app`, `src/game/app/routes.ts`):**
- Five bottom/side tabs: Path, Train, Cards, Feed, Me — `src/game/app/routes.ts:109-114,125`
- Header tools: Periodic table, Reaction search; "collapsed" Courses; flagged (off) Leaderboards, Ask Blueberry (chat), Tutor messages — all still routable — `src/game/app/routes.ts:115-120`, `src/game/app/flags.ts` (`FLAG_IDS`)
- `#/app/start/<step>` onboarding, `#/app/lesson/<node>` lessons, `#/app/gallery/<name>` dev gallery — `src/game/app/routes.ts:239-257`, `src/game/App.tsx:96-148`
- First visit with no stored progress is force-redirected into onboarding — `src/game/App.tsx:65-68`

**How users move between surfaces:**
- Site → game entrances: hero "Get Started" (`#/enter` → `#/app`) `src/components/HomeHero.tsx:200`; home board's big "The game" tile (`href={TRAINER_URL}`) `src/components/HomePage.tsx:284`; footer "The game" `src/components/ui/site-footer.tsx:38`.
- Game → site: none found. The game's "Blueberry" wordmark is an `aria-hidden` span, not a link — `src/game/app/Shell.tsx:360-361`; a grep of `src/game` for `#/home`, `#/study-decks`, `#/lessons` returns no matches. Site chrome (search, timer, bot, account) is removed on `#/app` — `src/components/SiteChrome.tsx:22`.
- Terms is reachable only from the profile dropdown — `src/components/ui/profile-dropdown.tsx:114`; the footer lists Study Decks, Lessons, The game, Home, Contact, Source, GitHub, LinkedIn, Email but not Terms or Plans — `src/components/ui/site-footer.tsx:36-54`.

**First-time visitor, in order (observed, 1280×800, fresh storage):**
1. Blueberry loader, then home hero: lowercase serif wordmark "blueberry.", headline "Organic chemistry that actually sticks.", sub-copy, gradient "Get Started" button, "Free to start. No card. About two minutes.", live count "18 DECKS · 581 CARDS · 43 CHECKED REACTIONS", 3D berry mascot, "Everything else" scroll cue — observed `home.png`; copy in `src/data/site.ts` (`HERO`).
2. Scrolling: "Everything else" board (The game tile, Lessons, Study Decks, Calendar "CHEM241, Summer II", Focus), then "What Orgo Students Are Saying" testimonial carousel, then "Plans" (Open site / Member / Pro / Semester pass), footer — `src/components/HomePage.tsx:196-220,247-400`.
3. Get Started → `#/enter` SYSTEM window: "A real organic chemistry lesson, right now." / "Two quick questions about your course, then you are straight into it. No account, nothing to pay." / "Start the first lesson" — observed `enter.png`, `src/components/EntryGate.tsx:234,247`.
4. → `#/app` → game onboarding at `#/app/start/welcome` ("Hi! I'm Berry.") and 8 steps (welcome, intro, hear, why, placement [8 questions], overview, goal, start) — observed `ob_00…ob_16.png`, `src/game/onboarding/flow.ts:43-52`.
5. → `#/app/pathway` (Path tab, "Organic Chemistry II, 0 of 86 lessons done") — observed `g_path.png`.

**Returning visitor:**
- Home skips the full particle opening if `blueberry_intro_seen` is set (`src/components/HomePage.tsx:63-64`, `src/lib/intro.ts`), otherwise the home page is the same pitch page; the berry's mood on the hero is computed from site deck ratings only (`src/components/HomeHero.tsx:8,54`). An opt-in setting can open the dashboard on arrival (`src/components/Dashboard.tsx:77`, key `blueberry_open_dashboard_on_arrival`).
- Nothing on the home page reflects game progress (the site imports nothing from `src/game` except `GamePage`; grep of `@/game` outside `src/game` returns only `src/components/GamePage.tsx:1`).
- The Dashboard front page offers "start from where you left off", but its stats are site-deck stats only ("18 Decks, 581 Cards, 0 Cards you've rated") — observed `s_dash.png`.
- A returning game player who presses Get Started → Start the first lesson lands on the pathway (onboarding done flag in `blueberry.progress.v2`).

### Inferences
- The site has one clear first-run "next thing" (Get Started → game), but the promise on the gate ("Two quick questions") does not match what follows (5 questions + an 8-item placement quiz + a goal + a start choice), so the "next thing" is honest about direction but not effort.
- Once in the game, a user cannot navigate back to decks/lessons without the browser back button or typing a URL; from the user's perspective the site and the game are two products sharing a domain.
- A returning user has no single "continue" entry point on the home page: deck progress, game progress, and the dashboard are three separate places to resume.

### Gaps
- Live-site behaviour (whether production has Supabase configured, whether the deployed build matches HEAD) could not be verified: network blocked.
- Folder IDs for `#/folder/<id>` were not enumerated (a guessed `#/folder/orgo2` 404'd, which is expected for a wrong ID, not a bug).

---

## 2. Feature inventory, inspiration mapping, and what is connected vs. an island

### Takeaway
There are at least two of nearly everything: two flashcard systems, two onboarding funnels, two goal stores, two mascots, two "Ask Blueberry" states, two progress stores. The game carries the Duolingo/ALEKS/Alchemie/Anki-scheduler features; the site carries the Anki-like self-rated decks and course utilities. The only thing they genuinely share is the `theme` localStorage key.

### Cited Findings
**Site-side features (`src/components`, `src/lib`):**
- Study decks (18 decks, 581 cards observed), per-card self-rating Review / Almost / Got It (red/yellow/green), "Needs Review" filter, order by number/hardest/easiest, shuffle, six view modes (list, carousel, scroll, stack, gallery, table), card styles "Cards"/"Flip", notes, hold-to-reset — `src/App.tsx:107-122,138-142,210-215,1259-1266`; saved per deck in localStorage `grignard_lcta_progress_v1` (`src/lib/progress.ts:13-16`). No interval scheduling: status is just a colour per card (`src/App.tsx:129,373`). [≈ Anki's self-rating, without its scheduler]
- Reference decks (pKa, IR, NMR, resonance) — `src/components/ReferenceApp.tsx`; plan copy `src/components/ui/subscription-plans.tsx:57`.
- Lessons for "ORGANIC CHEMISTRY II / CHEM241": 12 sections, 43 checked reactions, video slots, "Practice this section → Open study deck" — observed `s_lessons.png`; `src/components/LessonsPage.tsx`.
- Reactions library (43 validated, "through RDKit") — observed `s_react.png`; composer/draw with Ketcher — `src/App.tsx:92-101`.
- Calendar (course dates from Supabase `course_dates`), Office hours booking with named TAs (`src/lib/tutoring.ts:136-137`), Focus timer with 20-20-20 reminders and task list, Global search, Ask Blueberry chatbot (Supabase Edge Function `chat`, sign-in required: `src/lib/askBlueberry.ts:21`, `src/components/ui/blueberry-bot.tsx:93`), Notifications panel of releases/changelog (`src/components/ui/notifications.tsx`, `src/data/changelog.ts`, `src/data/releases.ts`), Contact form (Apps Script), Workspace/admin/feedback inbox for staff (`src/components/AdminPanel.tsx`, `FeedbackInbox.tsx`), Plans with Stripe checkout (`src/lib/billing.ts:171-183`).
- Site funnel `#/start`: course, exam date, 1–3 topics, a mini lesson, finish → signup/lessons/game; goals saved to `blueberry_goals_v1` — `src/components/StartPage.tsx:7,66,490,532-538`, `src/lib/goals.ts`.

**Game-side features (`src/game`, `packages/*`):**
- Duolingo-style pathway ("UNIT 1 · CONJUGATION, RESONANCE & DIENES", nodes, START bubble, mascot beside current node) — observed `g_path.png`, `src/game/tabs/pathway/PathwayTab.tsx`. [≈ Duolingo]
- Economy: XP, diamonds, daily goal tiers, streak with freezes/repairs/milestones, "charge" energy (cap 30, regen 1 per 30 min), costumes as sinks — `packages/economy/src/rules.ts:40-171`. [≈ Duolingo XP/gems/streak/hearts-energy]
- Mastery ranks Reader → Arrow Pusher → Mechanist → Synthesist → Retrosynthesist → Exam Ready, with half-life decay — `packages/economy/src/rules.ts:186-213`, `src/game/mastery/`. [≈ ALEKS mastery/knowledge-decay]
- Placement quiz (8 questions) during onboarding; "Where I tested / Right at the start" — observed `ob_05…ob_16`; `packages/curriculum/src/placement.ts`. [≈ ALEKS initial knowledge check]
- Train tab: arrow-pushing mechanism trainer on 3-D atoms ("Sₙ2 at bromomethane… 0 of 2 arrows drawn"), grading engine names the broken rule — observed `g_train.png`; `packages/chem-core`, `packages/interaction`, `packages/feedback`. [≈ Alchemie Mechanisms]
- Cards tab: SM-2-lite scheduler (again/hard/good/easy; intervals 1,3,8,20…365 days), "Due today", "My mistakes" auto-deck, custom decks, CSV import/export — `src/game/cards/scheduler.ts:1-50`, `src/game/cards/ui/importCsv.ts`, `exportDeck.ts`, observed `g_cards.png`. [≈ Anki scheduler]
- Feed tab: Daily Quests (Earn 10 XP, Keep the streak, Get 5 right) live from the local journal; "Lab mates" (friends) not open — observed `g_feed.png`. [≈ Duolingo quests/friends]
- Me tab: Diamonds / Day streak / Active days, Courses (1 of 6 open), periodic table, reaction search, Light/Dark, Language; "On the way": Leaderboards, Ask Blueberry, Tutor messages — observed `g_me.png`.
- Mascot "Berry" with mood/behaviour/state/costume axes — `src/game/mascot/`, dev gallery observed `g_gallery.png`.

**Connections vs islands (verified):**
- Game progress lives only in localStorage `blueberry.progress.v2` (a journal from which XP/diamonds/streak/charge are derived) and `blueberry.cards.v1` — `src/game/app/progress.ts:1-45,536,685`; observed localStorage after onboarding held only `blueberry.progress.v2`.
- No Supabase usage anywhere in `src/game` (grep for `supabase` in `src/game` returns nothing). The site's Supabase calls touch only `profiles`, `course_overrides`, `course_dates`, `entitlements`, `founding_members`, and Edge Functions `chat`/`stripe-*` — `src/lib/AuthContext.tsx:93`, `src/lib/useCourse.ts:103-169`, `src/lib/calendar.ts:126-181`, `src/lib/billing.ts:132-183`, `src/components/ui/founding-seats.tsx:51`, `src/lib/askBlueberry.ts:21`.
- Tables `mechanism_attempts`, `user_decks`, `user_cards` exist in migrations (`supabase/migrations/20260815063859_initial_schema.sql:76`, `20260819120000_user_cards_and_decks.sql:15,56`) but no client code reads or writes them (grep of `.from("` in `src`).
- Site deck ratings (`grignard_lcta_progress_v1`), site saved cards (`blueberry_saved_cards_v1`), and site goals (`blueberry_goals_v1`) are never read by the game; game XP/streak/diamonds/daily goal are never read by the site.
- The game's Cards tab does not contain the site's 18 decks (observed: only "My mistakes, 0 cards").
- Shared: the `theme` localStorage key (`src/components/ui/animated-theme-toggler.tsx:33`, `src/game/app/hooks.ts:53`).

### Inferences
- The four inspirations map cleanly onto code, but the Anki half is split: Anki's *interface* (self-rating) lives in the site decks, and Anki's *scheduler* lives in the game's Cards tab; neither half is connected to the other.
- There is no shared account, currency, or progress between site and game. Account (Supabase) exists only on the site and gates only course utilities and the chatbot.

### Gaps
- Whether Stripe prices are live in production (the Plans cards read prices from the `stripe-prices` Edge Function) could not be checked; locally they show "TBD / not on sale yet".
- Mechanism trainer grading was not exercised end-to-end (drag-drawing arrows was not automated).

---

## 3. Progress and retention mechanics

### Takeaway
Retention machinery (streak, XP, daily goal, quests, spaced repetition, mastery decay, energy) exists only inside the game and only on-device; the site has per-deck colour ratings and a completion toast. There are no push/email reminders, no leaderboards, and no cross-device sync of any learning progress.

### Cited Findings
- Streaks: game only — rules `STREAK_FREEZE_MAX_HELD = 2`, repair window 48h, 1 repair/month, 1 rest day/week, milestones 7…365, "at risk" hour 18 — `packages/economy/src/rules.ts:157-171`. Observed streak went 0 → 1 after one lesson (`lb_05.png`). No streak anywhere on the site (grep of `src/components`/`src/lib` for streak/XP finds only visual/animation uses).
- XP and daily goal: Casual 10 / Regular 20 / Serious 35 XP a day, chosen in onboarding — observed `ob_15`; `packages/economy/src/rules.ts:60-73`. "TODAY'S GOAL" segmented bar in the game header — observed `g_path.png`.
- Diamonds: +10 first clear, +50 unit, +200 boss, +75 streak milestone, streak freeze costs 75 — `packages/economy/src/rules.ts:75-115`. Observed: a lesson finished with 0 of 1 correct still paid "+15 diamonds" and counted as "1 of 86 lessons done" (`lb_04.png`, `lb_05.png`).
- Charge (energy): cap 30, 1 per 30 min, review/tutorial/intro nodes free — `packages/economy/src/rules.ts:120-148`. Observed charge 30 → 22 after starting one node and finishing one lesson.
- Spaced repetition: game Cards tab SM-2-lite — `src/game/cards/scheduler.ts:1-50`. Site decks: no scheduling, only Review/Almost/Got It status — `src/App.tsx:138-142`.
- Mastery with decay (half-life starting 7 days, doubling, max 365) — `packages/economy/src/rules.ts:199-213`.
- Leaderboards: flagged off, renders "Leaderboards are not open yet" — observed `g_leader.png`, `src/game/app/flags.ts`.
- Notifications: no browser Notification API or service worker in `src` (grep for `new Notification|requestPermission` returns nothing). The site's "Notifications" is an in-page bell listing releases/changelog (`src/components/ui/notifications.tsx:238-319`, `src/data/changelog.ts:29-59`). Email exists only as Supabase auth templates (`supabase/templates/confirmation.html`, `magic_link.html`).
- Accounts: Supabase auth on the site (Google / magic link), roles member/admin/owner/staff — `src/lib/supabase.ts`, `src/lib/account.ts:5`, `src/main.tsx:35-43`. Locally: "Sign-in is not configured for this build yet" (observed `s_signin.png`). The game has no sign-in; its "I already have an account" just marks onboarding done and opens the pathway — `src/game/onboarding/Onboarding.tsx:404-407,424`.
- Saved progress: all learning progress is localStorage-only (site: `src/lib/progress.ts:13`; game: `src/game/app/progress.ts:536`). The game's own header comment calls the local store "a rendering cache and an offline draft" to be replaced by a Supabase source in a later phase — `src/game/app/progress.ts:5-15`.
- Plans copy promises Member = "Progress that follows you between machines", "Your ratings and notes backed up", "An onboarding quiz that sets the site up around your course" — `src/components/ui/subscription-plans.tsx:64-74`; Terms page says "Ratings, notes, the focus timer and your display picture are kept in your own browser and are not sent anywhere" (observed `s_terms.png`).

### Inferences
- The Member plan's promise of cross-machine progress is not implemented in client code today (no reads/writes of progress to Supabase), and the onboarding quiz it lists as a Member benefit is available with no account in the game. This contradicts the Terms page.
- Rewarding a 0/1 lesson with diamonds and a "lesson done" tick weakens the signal value of the economy (inference; the "The ones that got away" retry does re-ask the missed item).
- The non-open Leaderboards screen says "Your attempts are already going into the history it will rank" (`src/game/app/ui/NotOpenYet.tsx:36`), but attempts are only in localStorage; nothing is sent to a server, so that sentence is inaccurate today.

### Gaps
- Whether the production build has Supabase configured (which would make sign-in, calendar, tutoring and Ask Blueberry live) could not be verified.

---

## 4. Onboarding

### Takeaway
There are two complete first-run funnels (the site's `#/start` and the game's `#/app/start`) with different mascot names, different questions, and separate storage; the home CTA uses the game's funnel, whose every screen displays a visible "[HUMAN GATE] Placeholder copy, pending owner review." notice.

### Cited Findings
- Game onboarding steps: welcome ("Hi! I'm Berry. Learn organic chemistry by doing it. GET STARTED / I already have an account"), intro ("I will be right here the whole way. Nothing here is a test."), hear ("How did you hear about us?", skippable), why ("Orgo II exam prep / DAT / MCAT / Surviving my course / Curiosity"), placement (8 questions, SKIP available), overview ("Here is your course." unit list), goal (Casual/Regular/Serious XP), start ("Where I tested / Right at the start", "TAKE ME IN") — observed `ob_00…ob_16`; `src/game/onboarding/flow.ts:43-169`.
- Every onboarding screen shows "[HUMAN GATE] Placeholder copy, pending owner review." — observed on all 17 captures; `src/game/onboarding/copy.ts:179` (`GATE_NOTICE`), `src/game/onboarding/flow.ts:37`.
- Placement includes general-chemistry items (pH of 0.0100 M HCl, dilution volume, limiting reagent, mass of water) for a user who picked "Orgo II" — observed `ob_06…ob_11`. (The Courses screen says Gen Chem problems "already run inside the placement quiz", observed `g_courses.png`.)
- Onboarding stores `course: "orgo_2"`, `startTopics`, `dailyGoal`, `onboardingDone: true` — observed localStorage after the walk.
- EntryGate promises "Two quick questions about your course" — `src/components/EntryGate.tsx:234` — versus the observed 8 steps plus 8 placement items.
- Site funnel `#/start`: "Hi, I'm Blueberry. Let's set this up around your exam. Three questions, and then you are straight into a lesson." with Get started / I already have an account (→ `#/signin`) — observed `s_start.png`, `src/components/StartPage.tsx:272,278`; collects course, exam date, topics (`src/components/start/flow.ts:20-30`) into `blueberry_goals_v1`.
- The EntryGate comment says the switch to the game's funnel was "Owner direction: one placement quiz, not two" — `src/components/EntryGate.tsx:76-84` — yet `#/start` still renders and is still linked from the Study Decks release banner (`src/data/releases.ts:79`).
- The game's onboarding asks no exam date; the site's asks no daily goal; neither reads the other's answers.
- No sign-up step at the end of either funnel in the game path (the legacy `paywall` step maps to `start`: `src/game/onboarding/flow.ts:63-67`).

### Inferences
- A first-time user meets two different mascots with two names within about a minute (the site hero's 3-D berry and the game's "Berry"), and a user who later clicks the Study Decks banner can be walked through a second, different setup flow introduced by "Blueberry".

### Gaps
- None material; both funnels were walked end to end locally.

---

## 5. Feedback and animation

### Takeaway
Feedback is rich but written in two idioms: the site celebrates with emoji toasts, pixel-fire buttons, and confetti; the game uses Duolingo-style CHECK/CONTINUE bars, named-cause explanations, a lesson-complete card with diamonds, streak and rank-up moments. The README's animation catalogue describes only the site (deck pages), not the game.

### Cited Findings
**Site (study decks):**
- Rating buttons Review/Almost/Got It with press-depth — `src/App.tsx:138-142,171-199`; README "Press depth" `README.md:486`.
- Halfway toast "🔥 Halfway there. Good spot to stretch…" with "Keep going / Take a break" pixel-fire buttons; finish toast "Deck finished. N cards still marked Review or Almost…" or "🎉 Every card, green… Go and sit down." + "More confetti"; confetti fires once when every card is reviewed — `src/App.tsx:560-660`.
- Multiple choice with instant right/wrong feedback; select-all grading on Check — `README.md:80-82`.
- README "Every animation" lists pointer-driven (magnetic pull, spotlight, 3-D tilt, expanding pills, press depth, link sweep, title hover), click-driven (particle burst, idle sparkle, gooey droplet merge, toolbar unfurl, theme morph sun→moon, 260ms theme crossfade, hold-to-reset 1.2s, confetti), scroll-driven (hero hand-off, hub seam, card choreography, rolling stack, scroll-to-top) — `README.md:474-513`.
- Home: loader, particle opening (skipped for returning visitors), time-of-day photo backgrounds with weather, "Everything else" rolling heading, CTA pulse, floating 3-D berry that can be dragged/poked, page-curtain transitions, `MechanismBoard` looping cyanohydrin arrow animation marked "Correct · nucleophilic addition" — `src/components/HomePage.tsx:104-114,248`, `src/components/HomeHero.tsx:190-234`, observed `home.png`.
- Site-wide click sound via one delegated listener — `src/main.tsx:10-12`, `src/lib/clickSound.ts`.
- EntryGate: text-scramble headline — `src/components/EntryGate.tsx:7`.

**Game:**
- Lesson: segmented progress ("Quick questions / The ones that got away / Collect the lesson"), CHECK button; wrong answer shows "your pick / correct answer" tags plus "Not yet, and this is a common road." and a written reason for each option; "Something wrong with this question?" report link; missed items re-asked — observed `lb_00…lb_03`.
- Lesson end: "Lesson complete — You cleared 0 of 1… +15 diamonds — One is still settling…" card with mascot — observed `lb_04.png`; `src/game/lesson/RewardMoment.tsx`.
- Other moments present in code: `StreakScreen.tsx`, `ComboInterstitial.tsx`, `RankUpMoment.tsx`, charge meter/gate (`src/game/charge/`), cards save animation (`src/game/cards/save-animation.css`), mascot moods/costumes (`src/game/mascot/`).
- Game copy rule "Nothing here is a gradient on a button" — `src/game/tokens.css:11`; the site's primary CTAs are gradients (`from-brand-from to-brand-to`, `src/components/HomeHero.tsx:203`, `src/components/HomePage.tsx:311`).

### Inferences
- A correct/incorrect answer on a deck and on a game lesson feel like different products (different button language "Got It" vs "CHECK/CONTINUE", different celebration vocabulary: emoji+confetti vs diamonds+mascot).

### Gaps
- Streak screen, rank-up and combo moments were not triggered in the local run (need more sessions/days); described from file presence only.

---

## 6. Brand and visual system; marketing, pricing, legal, contact

### Takeaway
The site and the game do not look like the same company: different wordmark casing and typeface, different fonts overall (Fraunces/Inter/Caveat vs system + rounded), different mascot art and name, different button styles, and different voice (first-person student-builder vs product mascot vs engineering-status copy). The site does have a marketing-style home (hero, fake testimonials, Plans), a contact page, and an unfinished Terms page; there is no About page, no privacy policy proper, no pricing numbers.

### Cited Findings
- Name: `SITE_NAME = "Blueberry"`, "Named for the fruit, in the manner of a certain computer company" — `src/data/site.ts`. Package name is still `"grignard-app"` — `package.json`. Tab titles "blueberry · …" lowercase — `src/lib/useDocumentTitle.ts:6,49-57`.
- Wordmark: site hero "blueberry." lowercase Fraunces serif with a gradient underline — `src/components/HomeHero.tsx:156-170`; sign-in page "Blueberry" serif capitalised with a small berry — observed `s_signin.png`; game rail "Blueberry" capitalised in the rounded display face — `src/game/app/Shell.tsx:360-361`, observed `g_path.png`.
- Fonts: site loads Fraunces (headings), Inter (UI), Caveat (handwriting accents such as "click here!") — `package.json` deps, `src/index.css:311,360-366,410-414`. Game: system sans + `ui-rounded`/"SF Pro Rounded"/"Arial Rounded MT Bold"/Baloo 2/Quicksand for display — `src/game/theme.css:115-116`; `src/game/tokens.css:22-28` records that "Fraunces for display, Inter for UI" was SUPERSEDED for the game.
- Color: site brand gradient `--color-brand-from: #1d4ed8` → `--color-brand-to: #3b82f6` — `src/index.css:107-108`; site also uses indigo/purple accents throughout (e.g. `text-indigo-600` labels, `src/components/HomePage.tsx:287`) and photographic backgrounds (Unsplash, `src/components/ui/site-footer.tsx:105-111`). Game: `--bb-primary: var(--blue-600)` with raised-edge flat buttons, purple accent demoted — `src/game/tokens.css:7-11,170-175,212`; observed the game CTA is a flat periwinkle/indigo uppercase button ("GET STARTED", "CHECK", "CONTINUE").
- Mascot: site uses several berry renderings (`src/components/ui/blueberry.tsx`, `blueberry-bot-2d.tsx`, `blueberry-bot-3d.tsx`, `home-blueberry.tsx`, `blueberry-mark.tsx`) — a matte dark-blue 3-D berry with a simple smile (observed `home.png`, `s_lessons.png`); the game uses `src/game/mascot/Berry.tsx`, a glossy bright-blue berry with a star crown and blush (observed `app_first.crop.png`, `lb_04.png`). Names differ: site "Hi, I'm Blueberry." (`src/components/StartPage.tsx:278`), chatbot "Ask Blueberry" (`src/components/ui/blueberry-bot.tsx:143-154`); game "Hi! I'm Berry." (`src/game/onboarding/copy.ts:62`).
- Page-header patterns on the site alone vary: full nav bar with Dashboard/Search/Contact/Sign in (`#/study-decks`), "< Home" back link (`#/lessons`, `#/calendar`), sidebar dashboard (`#/d`), "Back to Blueberry" (`#/signin`), handwriting "click here!" hint on decks — observed `site_grid.png`.
- Voice: site footer "Organic chemistry for CHEM 241 and 242 at Maryland. Built while taking it. © 2026 Andrew Liu" and "Flashcard decks I built…" (first person) — observed `s_dash.png`, `s_decks.png`; Contact "Found a mistake?… I'll try to get back within a few business days!" — observed `s_contact.png`; hero marketing voice "Organic chemistry that actually sticks." — `src/data/site.ts`; game mascot voice ("I will be right here the whole way.") mixed with engineering-status copy shown to users: "Lab mates… arrives in Phase 6. Nothing here is made up in the meantime" (observed `g_feed.png`, `src/game/tabs/feed/FeedTab.tsx:410,492-494`), "Built, not open. Each one is waiting on a piece of server it would be dishonest to ship without" (observed `g_me.png`), "Development surface, not a tab: see docs/MASCOT.md" on `#/app/gallery/berry` (observed `g_gallery.png`).
- Course naming varies: README "CHEM 242 lab LCTAs" (`README.md:3`), home tile "CHEM241, Summer II" (`src/components/HomePage.tsx:373`), Lessons "LESSONS / ORGANIC CHEMISTRY II · CHEM241" (observed `s_lessons.png`), game "Orgo II / Organic Chemistry II" (observed `g_path.png`), sign-in "Organic chemistry, University of Maryland" (observed `s_signin.png`).
- Marketing/landing: home hero + board + testimonials + Plans (`src/components/HomePage.tsx:196-220`). Testimonials are six invented personas ("Anonymous Junior", "A Very Tired TA", "Future Dentist"…) — `src/data/testimonials.ts:14-62` — and the carousel itself prints "(these are fake testimonials)" — `src/components/ui/testimonials.tsx:117`, observed `home.png` text. Meanwhile the founding-seats component's comment argues "A carousel of invented students saying the site changed their grade is the single fastest way to lose somebody" — `src/components/ui/founding-seats.tsx:7-12`; its `founding_members` table does not exist in migrations, so it renders nothing (comment: "The table this reads is not created yet").
- Pricing: four tiers Open site (Free), Member (Free), Pro (TBD, "not on sale yet"), Semester pass (TBD) — `src/components/ui/subscription-plans.tsx:46-100`. Pro lists "Mechanism practice, marked as you draw it" as a paid feature (`:83`) while the game's Train tab is free with no account.
- About: no route; `#/about` redirects to Contact; "About itself is a card opened over whatever you were looking at" — `src/App.tsx:298-300`.
- Legal: `#/terms` "Terms & policies… This page is not finished… not a substitute for terms of service, and nothing here has been reviewed by anyone qualified" — `src/components/TermsPage.tsx:43`, observed `s_terms.png`. No separate privacy policy route.
- Contact: form (Apps Script endpoint) plus email `andliu@terpmail.umd.edu`, GitHub, LinkedIn — `src/data/site.ts`, observed `s_contact.png`.

### Inferences
- On the brand question (does it look like one company?), the observed answer is no. The site reads as a polished personal student project with an editorial, photographic, serif look. The game reads as a Duolingo-style product with a rounded, flat, mascot-led look. The SYSTEM-window gate between them (navy, monospace chrome, "Solo Leveling" framing per `src/components/EntryGate.tsx:15`) is a third look.
- The fake-testimonials section is labelled as fake on the page, which is honest but conflicts with the page's own marketing framing and with the project's stated anti-fake-social-proof stance.

### Gaps
- No brand asset spec (logo files, official palette) exists in `public/` beyond `favicon.svg` and `icons.svg`, so "official" brand could not be determined from assets. The design-doc claims in `documentation/DESIGN-TOKENS.md` were not relied on.

---

## 7. Dead ends, dev-only routes, placeholders, inconsistencies, broken or orphaned features

### Takeaway
The most serious verified defect is that the game's pathway nodes link to un-namespaced hashes (`#/trainer?…`, `#/lesson/…`) that the site router treats as 404s. That breaks the core path→lesson loop that the home CTA funnels every new user into, and it still spends charge. There are also many visible placeholders and a lot of stale copy left from before the merge.

### Cited Findings
**Broken (verified by running):**
- Pathway node links are built without the `app/` prefix: `hrefForPlayable` returns `` `#/lesson/${id}` `` or `` `#/trainer?${param}=${id}` `` — `src/game/tabs/pathway/PathwayTab.tsx:934-943`; every other game link uses `#/${BASE}/…` — `src/game/app/routes.ts:177,239-257`. Observed: pressing the first node's start in the pathway sheet navigated to `#/trainer?hunt=res-allyl-1` and rendered the site's "404 Looks like you're lost" page; the journal still recorded `node_started` for `u1-allylic` (charge 30 → lower). Loading `#/app/lesson/u3-directing` directly works (observed `lb_00…lb_05`).
- Every game screen's browser tab title is "blueberry · Not Found" because `titleForRoute` has no entry for `app` — `src/lib/useDocumentTitle.ts:16-57` (observed titles for `#/app/*` in every capture).
- No in-UI exit from the game back to the site (see §1).

**Placeholders visible to users:**
- "[HUMAN GATE] Placeholder copy, pending owner review." on all game onboarding screens — `src/game/onboarding/copy.ts:179`.
- Lessons page video: "TEMPLATE … Placeholder. No video has been recorded for this section yet." — `src/components/ui/lesson-video.tsx:106`, observed `s_lessons.png`.
- Study Decks "ORGANIC CHEMISTRY I — Nothing here yet." — observed `s_decks.png`.
- Dashboard "Concepts — soon" — `src/components/ui/dashboard-nav.tsx:158`.
- Terms "This page is not finished." — `src/components/TermsPage.tsx:43`.
- Game Courses: 5 of 6 courses "Soon" — observed `g_courses.png`; Feed "Lab mates · Phase 6 data"; Me "On the way" list; Leaderboards / Ask Blueberry / Tutor messages "not open yet" screens.
- Plans Pro/Semester pass "TBD · not on sale yet" — `src/components/ui/subscription-plans.tsx:80-98`.

**Stale or contradictory copy (verified):**
- Home game tile still says "Opens the mechanism trainer · a separate app, for now" although it now routes in-page to `#/app` — `src/components/HomePage.tsx:326` vs `src/data/site.ts` (`TRAINER_URL = "#/app"`, comment "It has moved in").
- Release banner on Study Decks says the trainer "is still its own app" and sends users to the old `#/start` funnel — `src/data/releases.ts:66-80`.
- `src/App.tsx:271-272` comment says EntryGate lands on `#/start/course`; it lands on `#/app`.
- Site changelog: "Ask Blueberry works when you are signed in" (`src/data/changelog.ts:39`), versus the game's "Ask Blueberry is not open yet" (observed `g_chat.png`). The same product name is live in one half and "not open" in the other.
- Home hero comment "There are no reviews yet" (`src/components/HomeHero.tsx:244`) sits above a testimonial carousel of invented reviews.
- Count mismatches: home Lessons tile "6 topics across 2 units · 43 checked reactions" (observed `home.png`) vs Lessons page "12 sections, 43 checked reactions" (observed `s_lessons.png`); game pathway "0 of 86 lessons" vs Courses "0 of 32 topics done" (observed `g_path.png`, `g_courses.png`).
- README describes an older product: "eight [decks]", "Three decks, one per lab, chosen from a hub at `#/home`", Grignard at `#/` — `README.md:3-5,13-17,72`. It never mentions the game (grep of README for "the game", "#/app", "mechanism trainer" returns no matches). The site shows 18 decks.

**Orphaned or unused:**
- Site `#/start` funnel and its `blueberry_goals_v1` store: no longer the Get Started path; only the release banner links to it (see §4).
- Supabase tables `mechanism_attempts`, `user_decks`, `user_cards` have no client reads or writes; `founding_members` is queried but never created — see §2, `src/components/ui/founding-seats.tsx:18-35`.
- `#/reactions` still exists and is linked from the dashboard (`src/components/ui/dashboard-nav.tsx:160`) though the home board says "Reactions used to be a tile of its own. They are inside Lessons now" (`src/components/HomePage.tsx:343-345` comment).
- `#/workspace` intentionally unlinked from nav (`src/App.tsx:307-309`).

**Dev-only surfaces reachable in production:**
- `#/app/gallery/<name>` (e.g. `berry`, `pilot-arrow`, `pilot-trainer`), the mascot/pilot development gallery — `src/game/App.tsx:96-110`, observed `g_gallery.png`.
- `?flags=unlockall,infinitecharge` (beta), `?flags=leaderboards,chat,messages` (feature flags) can be set from the URL or localStorage `blueberry.flags` in any build — `src/game/app/flags.ts` (`read()`), and default ON in dev.
- `#/staff` sign-in mode — `src/App.tsx:313`.

### Inferences
- The pathway-link defect is a merge regression: the game was designed to own the whole hash space, and the move under `#/app` missed `PathwayTab.tsx`. Because Get Started now funnels every new visitor into this pathway, a first-time user's first node tap likely ends on a 404. This is a strong inference, not a certainty, since only the first node was tested; the code path is shared by all non-beat nodes, and beat nodes produce `#/lesson/…`, which the site router also 404s.
- The volume of internal-process copy in the UI ("Phase 6", "HUMAN GATE", "Development surface", "dishonest to ship without") would read to a student as an unfinished product rather than a deliberate voice.

### Gaps
- Mechanism (trainer) nodes played via their correct `#/app/trainer?…` URL were not exercised.
- Mobile layouts were spot-checked only for `#/` and `#/app/pathway` (390×844): both render. The game shows a bottom 5-tab bar on mobile and a left rail on desktop (observed `mobile_grid.png`, `g_path.png`).
- Staff/admin surfaces (`AdminPanel`, `FeedbackInbox`, workspace editing) were not exercised because sign-in is not configured locally.
