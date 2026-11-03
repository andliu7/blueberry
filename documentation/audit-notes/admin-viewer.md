# Audit: admin pages and staff pathway viewer (read-only, 29 Oct 2026)

Method: source read only (dev server and screenshots not run). Paths are under `src/game/admin/` unless stated. Nothing edited.

## 1. Access: app through admin
- Entry points: staff-only "Lesson viewer" row on Me (`tabs/me/MeTab.tsx:264-282`, rendered at `:967` when `isStaffRole(role)`), or type the hash. Route parse `app/routes.ts:229` (`admin` + optional node); `hrefForAdmin` `routes.ts:320`. Not in ALL_TABS, no other link.
- Sub-pages are the same route with a reserved node: `home`, `activity`, `stats`, `tasks` (`AdminViewer.tsx:42`); anything else is a lesson id. Nav bar `AdminViewer.tsx:283-329` (Back to Me, Bloom gallery, Home/Activity/Stats/Tasks, Lessons). Home and Tasks are reachable only from this bar; Me links only to the lesson viewer.
- Gate: `App.tsx:248` -> `AdminGate` `App.tsx:388-434`. Signed out -> `AdminSignIn.tsx` card (rememberReturn then `#/signin`). Signed in non-staff -> `navigate(pathway)` (`App.tsx:410-412`). Staff = `isStaffRole` (`staff.ts:12`, role admin/owner, mirrors SQL `is_staff()`), read from profiles via `useAuth`. Chunk is lazy so students never download it.
- Dev bypass: `App.tsx:400-401` `devLocal = import.meta.env.DEV && isLocalHost(hostname)` opens the viewer with NO role and no sign-in on localhost dev (owner 29 Oct). Production never matches. Consequence: on localhost with no session `fetchLive` returns `signed-out`, so the home is all-sample; live numbers need a real sign-in even locally.
- Real protection is RLS only (UI gate is cosmetic, `staff.ts:3-8`): staff select policies on `profiles`, `progress_events` (`supabase/migrations/20261024163000_progress_events_staff_read.sql`), `analytics_events` (`20261024140000_analytics.sql:140`), `entitlements` (`20261029120000_entitlements_staff_read.sql`, header says NOT APPLIED).
- Onboarding is skipped for admin routes (`App.tsx:120,134`).
- Older site-level admin exists (`src/components/AdminPanel.tsx`, `Dashboard.tsx`, `WorkspaceActivity.tsx`, `tutoring/TutorAdminPanel.tsx`, `FeedbackInbox.tsx`, `OfficeHoursEditor.tsx`); not audited for numbers. `#/signoff` is dev-only (`src/App.tsx:95-99,181`).

## 2. Which numbers are real

### Admin home `#/app/admin/home` (`AdminHome.tsx`, `adminHomeData.ts`, `adminHomeLive.ts`)
Base is `sampleAdminHome` (`adminHomeData.ts:124`; header line 4: "EVERY NUMBER HERE IS MADE UP"). Live layer `fetchLive` (`adminHomeLive.ts:252-333`) overlays real values client side through RLS (no server function).

| Figure | Source | Status |
|---|---|---|
| New sign-ups stat, growth line, funnel "Signed up" | `profiles.created_at` (`adminHomeLive.ts:262`) | REAL if query succeeds (`:287`) |
| Active learners, Today block (learning now = event in last 15 min, signups today, lessons finished today, active today), Recent activity feed | `progress_events` user_id/kind/at/nodeId (`:263`); finished = `node_cleared` | REAL (`:292`) |
| Funnel: Visited | `analytics_events` name=screen_view, distinct anon_id (`:264,275`) | REAL only if rows return, else stage DROPPED (`buildFunnel` `:167`) |
| Funnel: started / finished / came back another day | `progress_events` node_started / node_cleared / 2+ days (`:305-311`) | REAL |
| Funnel: Went Pro; Paying learners stat | `entitlements` (`:265,278-281`) | REAL only after the owner applies the staff-read migration; `entsOk` needs >1 distinct user (`:278`), so a genuine single payer reads as not applied and stays sample |
| Monthly revenue stat, hero "Revenue, last N days", sparkline | `sampleAdminHome.stats` revenue 1534, -2.1% | SAMPLE always (Stripe holds amounts, `adminHomeLive.ts:10-13`). Hero (`AdminHome.tsx:280-300`) has no per-card tag |
| Billing table INV-1037..1042 and CSV "sample-invoices.csv" | `adminHomeData.ts:196-203` | SAMPLE; Billing card (`AdminHome.tsx:~562`) has no `SampleTag` |
| Payouts | `adminHomeData.ts:204` | SAMPLE; tagged (`:619`) |
| System status, incidents, uptime ticks | `adminHomeData.ts:185-195` | SAMPLE; System card (`:504`) untagged |
| "Needs you" list | `attentionItems` `:184-195` from invoices/services (sample) plus feed | MIXED: payment-retry and service-slow alerts come from invented data and can appear next to live figures. Live feed never emits a `flag` kind, so the flagged-question alert is sample-only |
| Paying sparkline | flat line of `payingNow` (`:299`) | not a trend |

Labelling: all-sample page shows one chip "Sample data, not live" (`AdminHome.tsx:817`); in mixed mode `SampleTag` (`:47-53`) appears only on growth, funnel, feed, payouts, and a "Sample" tag on stat cells (`:266`). Hero, Billing and System have no tag, so in mixed mode invented revenue, invoices and uptime sit unmarked beside live counts. This breaks the owner rule "real or labelled".
Other issues: `fetchAll` caps 8000 rows per table, newest first (`:236-248`), so big periods silently undercount with no truncation notice; "This term" start hard-coded 24 Aug / 12 Jan (`:44`); `sampleView` scales funnel counts by a factor (`:223`), so invented numbers move with the date picker. Failure copy exists for no-supabase/signed-out/blocked/error (`AdminHome.tsx:788-793`).

### Learners board `#/app/admin/stats` tab 1 (`StatsBoard.tsx`, via `BoardsPage.tsx`)
100% SAMPLE. `StatsBoardPage` passes `sampleAdminStats` (`StatsBoard.tsx:269-272`), chip "Sample data, not live" (`:185-192`). Invented: learners 640, paying 88, CAC 14, best join hour 21/Sunday, retention 62/38/21 %, device split, 30-day sign-ups, sessions by hour, attempts per unit (61,400/term), flagged per unit, exam seasonality. Contract `:17-35` expects a staff Edge Function that does not exist. It duplicates metrics the home already computes live.

### Growth board `#/app/admin/stats` tab 2 (`src/components/admin/GrowthBoard.tsx`, engine `components/ui/finance-bento.tsx`)
100% SAMPLE (`sampleGrowthData`, `isSample: true` `:83-85`, chip `:146-151`). Contract `:10-44` wants a service-role Edge Function. Covers learners by plan, funnel, day-7 return, CAC, exams, feedback, flagged lessons, weekday activity.

### Activity `#/app/admin/activity` (`AdminActivity.tsx`, `activityModel.ts`)
REAL, no sample. `progress_events` last 48 h (`WINDOW_MS`), LIMIT 500, refresh 15 s, optional account filter from `profiles` id/full_name/email (`:222-253`). Detects the "RLS silently returns only my rows" case (`own-only` notice). Account picks in localStorage (per viewer). The 500 limit truncates a busy window silently.

### Task board `#/app/admin/tasks` (`TaskBoard.tsx`)
Not metrics. Kanban seeded in code (`seed(...)` e.g. `:107`), state in this browser's localStorage only (`:158-256`), not shared across devices or staff, never the queue file.

### Gaps against owner rules
- Owner wording is "No data, example" with an example graph; the app says "Sample data, not live" and draws the sample as if populated. No true zero-data state: live signups of 0 draw a flat line with no "No data" message.
- CAC could be real: `marketing_spend` has staff select/insert RLS (`migrations/20261024140000_analytics.sql:173-184`); nothing reads it.
- Real but unused: `progress_events` can give retention day 1/7/30, median days to first lesson, attempts per unit; `analytics_events` can give device and sessions by hour. Today all invented. The `analytics_*` views are revoked from API roles (`StatsBoard.tsx:17-19`), so compute client side like the home, or add an Edge Function.
- Tests: `test/adminHome.test.ts`, `adminHomeLive.test.ts`, `statsBoard.test.ts`, `adminActivity.test.ts`, `adminSignIn.test.ts`, `taskBoard.test.ts`, `adminViewer.test.ts`.

## 3. Staff pathway/lesson viewer `#/app/admin[/<node>]` (`AdminViewer.tsx`, `slides.ts`, `planView.ts`)
Lists every unit (Start here `STORY_UNIT`, then `PATHWAY_UNITS`) and each node where `planLesson(node) !== null` and not `mentionOnly`; a unit checkpoint is appended if absent (`slides.ts:73-87`). A node is flattened from `planLesson(node).steps` into slides in play order (`lessonSlides` `slides.ts:186-267`); arrow keys and Prev/Next, "Slide i of n". Toggles View Admin/Student and Plan Member(Free)/Pro (`AdminViewer.tsx:354-373`); plan is React state only, never a grant (test reads imports). Links: "Play this lesson" (writes this device's journal, banner `:349-352`) and "Play the challenge" when `challengeable(node)` (`beats/template.ts:670`; false for checkpoints and any plan with mechanism/resonance steps).

Per question, staff view (`AdminViewer.tsx:87-192`): kind, prompt, brief, visual (`McqVisualCard`), drawn option tiles (`StructureFigure`), cards for sort/match; correct answer marked, per-option `why`, Answer lines, Explanation, Conditions, Provenance, Id and slot, Draft tag. Student view hides all of those. Plan preview: "Pro lesson" lock and "Ad space" strip for Free; rule is provisional (u0/u1 and quizzes/gates open, rest Pro, `planView.ts:9-36`, "owner to confirm").

| Content | In viewer? | Notes |
|---|---|---|
| Multiple choice (meet + graded) | YES with answers/why | meet questions de-duplicated from graded step (`slides.ts:195-199`) |
| Sort, match, draw, synthesis gaps, practice pool | YES | provenance/conditions only for pool entries; ladder sort and authored match give none; synthesis `why` shown as explanation |
| Explanations | PARTIAL | pool items and synthesis; MCQ per-option `why`; no beat-level explanation for non-pool MCQ |
| Arrow-pushing / resonance trainer steps | NO | placeholder slide "plays in the trainer" (`slides.ts:174-183`); no mechanism answer key |
| Story/hook scene text (Start here `StoryScene`) | NO | only as meet MCQs |
| Flashcards | NO | Cards tab (`cards/seed.ts`, reaction cards from `data/reactions.ts`) is not linked to lessons in the viewer |
| Videos | NO | `lesson/LessonVideo.tsx` renders an unfilmed "Template" strip; no node has a clip (`beats/template.ts:401-402`); `videoMinutes` on nodes (`demo/pathwayMap.ts:132,167`) and role `video` are not displayed; `lesson_media` bucket (`migrations/20260816020000_lesson_media.sql`) is never listed |
| Guidelines | NO | unit guidebooks `guide/u0Guide.ts` to `u10Guide.ts`, `nmGuide.ts` (key ideas, common mistakes) and `pathway-sheet/Guidebook.tsx` (placeholder copy) not surfaced |
| Challenges | LINK ONLY | no list of its questions or pass rule; checkpoints excluded |
| Algorithms (decision flows, e.g. SN1/SN2/E1/E2) | NO | no algorithm content type exists in `src/game` (grep finds only trace geometry); nothing to show |
| Editing | NONE | needs table + RLS, `documentation/ADMIN-EDITS-PROPOSAL.md` |
| Per-question analytics (attempts, pass rate, flags) | NO | flagged counts exist only in the sample board |

Other: Free + Pro-only lesson sets `aria-hidden` on the whole slide (`:102`), so staff cannot inspect it in that preview; slide `Id` mixes pool ids and beat ids (`slides.ts:103`); `signoff/SignoffPage.tsx` reuses `poolEntrySlide` (`slides.ts:136`) as a dev-only Unit 1 answer key. No calculator or NMR/IR/periodic table in the viewer; chemistry re-shown from RDKit-built tables.

## 4. Suggested follow-ups (not done)
1. Tag Hero revenue, Billing, System status and "Needs you" as sample in mixed mode; adopt "No data, example" wording and example graph for empty states.
2. Feed the Learners board from queries the home already runs (sign-ups, active, retention, device, CAC from `marketing_spend`); keep only revenue, payouts, invoices, uptime as labelled example.
3. Fix the `entsOk` single-payer heuristic; show a notice at the 8000-row and 500-row caps.
4. Viewer: per-lesson panels for video slot/transcript, unit guide entry, related Cards, challenge questions, mechanism answer key; per-question counts from `progress_events`.
5. Owner action: apply `20261029120000_entitlements_staff_read.sql` for a live Paying figure.
