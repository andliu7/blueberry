# Concepts Brief: Feedback channel and "flag this question"

Mode: BRAINSTORM. Six reviewers (design, codebase-details, zoom-out, comprehension, implementation-readiness, structural). Findings are deduplicated. Items no reviewer verified are marked "unverified".

## Overview

The concept: anyone, signed in or not, can send feedback with lesson, question, device and app version attached, and can one-tap flag a question. Flags are counted per question, and a threshold alert goes to the owners. Messages go to a Supabase table that visitors and students can only insert into. Staff (owner and TA) triage in a shared view. Signed-in senders can opt in to a "tell me when this is fixed" reply.

Verdict: the Supabase table with insert-only grants is the right base, and the repo already has the template (`supabase/migrations/20261024140000_analytics.sql`). The concept as written has four gaps that must be closed before a design doc:

1. It ignores the feedback system that already exists on Apps Script.
2. It copies an anonymous rate limit that the repo's own comments call "a sanity limit, not security".
3. It does not define what "one exact question" means.
4. It attaches more context than the existing consent model allows.

## Analysis

### Blocker

**B1. A feedback pipeline and staff triage UI already exist on Apps Script; the concept treats triage as new.**
Verified by four reviewers. `src/components/FeedbackInbox.tsx` is a staff panel. `src/lib/appsScript.ts` routes `setFeedbackState` and `promoteFeedback` (around lines 33-34, 63-65) to `apps-script/grignard.gs`. Adding a Supabase table beside it gives two inboxes and two sources of truth, with the Apps Script grant still unresolved.
Requirement: name Supabase as the only store. Say what happens to `FeedbackInbox.tsx` (rewrite it against the new table, do not extend it), to the old sheet rows (migrate once or declare read-only history), and to the `feedback` route in the `doPost` router (remove after real rows arrive in Supabase; no permanent dual-write). Dual-write for one release is acceptable as a rollback path (implementation-readiness), but only if the end date is stated.

**B2. Anonymous inserts have no real spam control.**
The analytics guard limits by `anon_id`, which the client chooses (analytics migration comment, about lines 82-84). A script rotating UUIDs inserts without bound using the public key. Free text is a worse target than a 2 KB event row because a human reads it. The same hole lets a script forge flag counts and trigger alerts that harass the owners. PostgREST cannot see the caller's IP.
Requirement: pick one of these, and state the chosen one.
- (a) Signed-in users insert directly with a per-`auth.uid()` limit enforced in the guard trigger. Anonymous users may only flag, not write text.
- (b) Anonymous text goes through an Edge Function that verifies a bot challenge (Turnstile or hCaptcha, secret held in the function) and rate-limits by IP hash.
Either way, add a global hourly ceiling on anonymous rows, with overflow marked `quarantined`. Confirm whether Auth CAPTCHA is on, since email sign-up is free for bots (unverified).
Zoom-out recommends (a) as the cheapest option at this scale. The owner should decide whether anonymous free text is needed at all.

**B3. A rejected or lost message looks like success.**
`FeedbackButton.tsx` (around lines 38-40) awaits the POST, ignores the result, and closes the widget. The analytics guard returns `null` on rate-limit, dropping the row silently, and `analytics.ts` `send()` drops 4xx responses. A student who is refused sees "sent". With zero traffic for three months and an unresolved Apps Script grant, "quiet" and "broken" cannot be told apart.
Requirement:
- Feedback uses its own submit path, not the analytics queue. It must work without analytics consent.
- The server rejects with an error instead of dropping.
- The widget shows "sent" only after a 2xx, keeps the draft on failure, and offers retry.
- Keep a queryable count of rejected submissions.
- Store alert state in a table and log alert failures.
- Send a weekly "system alive: N messages, M alerts, K failures" line.
- Run a synthetic submission before launch and again before exam week.

**B4. Question identity is undefined; a flag may point at the wrong question or none.**
The only question identifier verified in code is `mcq.${beatId}` (`src/game/beats/mcq/McqRunner.tsx:230`, via `trackChoice`). Other question types (trainer, match, trace, cards, `cards/seed.ts`) were not shown to have stable ids. DATA-MODEL.md has no entry on question ids. Staff can edit course content at runtime through the Apps Script `course`/`setCourse` routes (codebase-details), so a bare id keeps counting flags against text that has changed. Analytics uses a free-text `question` prop, which suggests no strict convention.
Requirement:
- Before the design doc, check in code that every playable question has an authored, immutable, unique id.
- Define one function (for example `questionRef(beat)`) returning `{ id, contentVersion }`, used by every question type.
- Namespace ids per type.
- Add a test that fails on a duplicate, renamed or reused id.
- Store `question_id` plus a content version beside it. Group counts by both. A content edit starts a new count and re-arms the alert.
- Never derive the id from array position or a hash of the text.
- For generated or seeded items, flag the template, not the instance.
- Reject malformed ids server side with a regex CHECK. Beware that a regex alone lets anyone invent unlimited fake questions; an allowlist or lookup is stronger but content lives in code, not a table. Decide which.

**B5. The auto-attached context collides with the consent model.**
`analytics.ts` sends nothing without consent and honours Do Not Track. Its header says the Terms page claims nothing is sent from the browser. Attaching `anon_id`, `session_id`, timezone, referrer, UTM or user agent to feedback would hand a person who declined analytics a linkable identifier. The owner's "more data the better" is rejected by all six reviewers.
Requirement:
- Allowlist only: route, lesson id, question id, content version, app version, and coarse device class (phone/tablet/desktop, the same buckets analytics uses).
- Never attach `anon_id`, `session_id`, tz, referrer, UTM, user agent or IP.
- `user_id` comes only from `auth.uid()` on the server.
- Show the sender the exact attachment ("We'll include: lesson 4, question 12, phone, v1.4") before sending.
- State a retention period.
- Update the Terms and privacy text before launch.
- Add a build-time app version constant. None exists today (`vite.config.ts` `define` has only `global` and `process.env`).

### Major

**M1. Flags need their own table and a dedupe key.**
Flags and messages are different things. Use a `question_flags` table with a unique key on (`question_id`, `content_version`, reporter key). The reporter key is `user_id` when signed in. Flags carry no free text. Counts come from a staff-only view or trigger-maintained aggregate. The client never writes a count. Count distinct signed-in users separately from anonymous flags. The alert condition should use signed-in users only (or weight anonymous flags lower). A flag needs instant confirmation and an undo, or accidental flags will count. An optional reason (wrong answer / unclear / typo) is cheap and helps the TA.
Disagreement: zoom-out would put flags in the same table with `kind='flag'` and a staff view; structural and implementation-readiness prefer a separate table or a partial unique index. Either works; the unique constraint must exist.

**M2. Threshold alert: do it server side, once, and rate-capped.**
- Mechanism: a database webhook or `pg_net` trigger calls an Edge Function. Secrets (email provider key or Slack webhook URL) live in Edge Function secrets or Vault, never `VITE_`. Whether `pg_net` or `pg_cron` is enabled in the live project is unverified. Existing Edge Functions (chat, stripe-*) send no notifications.
- Never call the network inside the insert transaction. Write the crossing to a pending row; send afterwards.
- Idempotence: a `notified_at` or `alerted_at` column with `update ... where notified_at is null returning`. Re-arm only when the content version changes.
- Burst control: at most N alerts per hour, remaining ones rolled into one digest. A once-a-day digest is calmer than real-time for a two-person team in exam week.
- Alert bodies hold the question id, the count and a link. Never message text (Slack mentions, link injection).
- Channel: pick one. Email to the two owners is simplest and does not need the TA to be in Slack. Slack incoming webhook is acceptable. Put the channel behind one `notify(text)` function.
- Zoom-out would defer the push alert entirely and ship a staff-only `flag_counts` view first. That is a legitimate staging choice (see Staging).

**M3. Threshold value.** All reviewers agree an absolute number beats a percentage, because the denominator (analytics picks) is consent-biased and tiny. Suggested start: 3 distinct signed-in flaggers on one question at one content version. Store it as a config row, not code. Review after the first exam week. Also list top-flagged questions in the triage view so the owners do not depend on pings. The "3 signed-in OR 5 total" variant (design, implementation-readiness) reopens the anonymous forgery hole; avoid unless B2 is solved.

**M4. TA role: reviewers disagree; the owner must decide.**
Verified: `staff_roster.role` allows only `admin` or `owner` (`20260815064800_grants_and_roles.sql` line 38), and `is_staff()` is true for both. Implementation-readiness and design say the TAs are already `admin`; I did not confirm that roster content.
- Option 1 (zoom-out, comprehension, implementation-readiness): reuse `is_staff()`. No schema change. Cost: any `is_staff()` user can read analytics, marketing spend, profiles (including emails) and tutoring data. Adding a TA is one roster insert.
- Option 2 (codebase-details, structural): add `is_reviewer()` backed by a separate `feedback_reviewers` table, so the TA reads feedback and flags only. Avoids touching the roster CHECK, `handle_new_user`, `current_user_role` and the demote trigger. Cost: a second role system next to staff_roster, tutors and the Apps Script admin list.
- Common ground: staff update only triage columns (status, note) via column GRANT, never message body or `user_id`; no delete for the TA; the TA does not see sender email by default.
Recommendation: Option 2 if the TA is not meant to see student emails and analytics; otherwise Option 1. This is an owner question.

**M5. "Tell me when this is fixed."**
Store `notify_on_fix boolean` plus the server-set `user_id`, nothing else. No email column. Enforce `notify_on_fix = false or user_id = auth.uid()`. Staff mark an item fixed; an Edge Function resolves the address from `auth.users`/`profiles` at send time with the service role, sends once, sets `notified_at`, then clears the opt-in. Anonymous senders get no opt-in, and the form says so. Account deletion removes the pending notice. The list view never shows the address. Two cheaper alternatives: reply by hand from the inbox, or show an in-app "fixed" notice on the sender's next sign-in (no mail service, no extra personal data). Zoom-out and implementation-readiness say manual is enough for 3 months.

**M6. Inbox lifecycle, abuse and pasted personal details.**
- States: new, seen, fixed/resolved, wontfix, spam/quarantined, hidden. Default view: new, grouped by question, newest first, with a count of hidden items. Index on (status, created_at).
- Auto-close stale items; purge or redact bodies after a fixed period (suggestions range from 90 to 180 days, 12 months for unresolved). The retention job needs `pg_cron` or a scheduled function (unverified).
- Staff actions: archive, hide, redact (null the body), block list keyed on `user_id`.
- Students will paste names, emails and student IDs. Automatic detection is unreliable; do not build a scrubber. Show "Please don't include your name, email or ID" next to the box, optionally with an advisory client warning on email or phone patterns.
- Hard body length cap in both the RLS check and a CHECK constraint (about 2,000 characters).

**M7. First-open game budget.** The game route is about 369 of 400 KB gzip (brief figure; the 400 KB limit is confirmed in `CLAUDE-blueberry-game.md`). The game has no feedback entry today. The flag action is a bare `fetch` to PostgREST in the style of `analytics.ts`, with no supabase-js. The message form, validation and any captcha script load via `React.lazy` on tap. `FeedbackButton` pulls `motion/react`; measure before importing it into the game. Share URL/key/token helpers with `analytics.ts` from one small module instead of copying them. Check the delta against the budget in the PR. Place the flag button on the result or explanation screen.

**M8. Privacy of the staff view.** The triage view must render message text as plain text only (no `dangerouslySetInnerHTML`, no markdown, no auto-linking). Any triage view readable by staff from the browser needs `security_invoker` and RLS (the analytics views are the opposite: revoked from API roles). Do not expose sender email in list views or exports.

### Nit

- N1. Follow the analytics migration exactly: `revoke all` from anon and authenticated, explicit column-level `grant insert`, `user_id` and timestamps forced in a `security definer` guard trigger with `set search_path = ''`, status excluded from the insert grant, staff select through `(select public.is_staff())`.
- N2. Add an adversarial RLS test in the style of the role-escalation fixture (D6): anon cannot read, cannot set status, cannot set `user_id`, cannot exceed the length cap.
- N3. Decide whether the existing "How's this study guide?" helpful/not-helpful widget and the new bug-report channel are one entry point with a category choice or two. Two buttons side by side will confuse students. Reusing the `FeedbackButton` props (title, placeholder) per page is cheaper than a new component.
- N4. `grignard_lcta_feedback_v1` in localStorage is an unbounded plaintext copy of every message, which matters on shared lab computers. Clear it on confirmed send, or cap it. Do not auto-migrate old entries.
- N5. Add a `source` field (site or game) and optionally a receipt id for the sender.
- N6. A new panel or route needs a row in `src/lib/useDocumentTitle.ts` (AGENTS.md).
- N7. Define "flag", "feedback", "triage" and "threshold" once in the design doc. Prompt injection: keep the body in its own column, comment it as untrusted, never concatenate it into instructions or alert strings.
- N8. Missing version or content rev shows as null in the triage view, not an empty string.
- N9. Edge Functions are deployed under the project's design-first process (AGENTS.md).

## Goals vs Non-Goals

Goals
- One store (Supabase) for feedback and flags, with insert-only access for visitors and students.
- A failed send is visible to the sender and to the owners.
- A flag points at one exact question at one content version, counted per distinct person.
- One alert per question per version, rate-capped, with no secret in the client bundle.
- A triage view the owner and TA can clear to zero, with states and retention.
- Context limited to an allowlist the sender can see.

Non-Goals
- AI triage, usage analytics, acquisition cost, paid features (as stated).
- A PII scrubber.
- A captcha on day one (unless anonymous text is kept; see B2).
- A new generalized role system.
- Free-text reply threads or chat with the sender.
- Real-time alerts for every flag.
- Joining feedback to analytics history.

## Key Decisions and Staging

Decisions the owner must make before the design doc

| # | Decision | Reviewer lean |
|---|---|---|
| 1 | Store | Supabase only; retire the Apps Script feedback and triage routes (unanimous) |
| 2 | Anonymous free text: keep or require sign-in | Require sign-in for text; allow anonymous flags at most (B2 option a) |
| 3 | TA access | Owner call between `is_staff()` reuse and a narrow `is_reviewer()` (M4) |
| 4 | Ping channel | Email to the two owners from an Edge Function; one channel only |
| 5 | Threshold | 3 distinct signed-in flaggers per question per version, in a config row |
| 6 | Fix notice | Flag plus `user_id`, email resolved at send time; or in-app notice only |
| 7 | Retention | A stated period for bodies (90 to 180 days) |
| 8 | Question id source | Confirm in code first (B4) |

Open facts to check before design (no reviewer verified these)
- Does every playable question type have a stable, unique id?
- Is `pg_net`, `pg_cron` or Vault enabled in the live Supabase project?
- Is Auth CAPTCHA on?
- Does `staff_roster.role` have a CHECK constraint, and who is on the roster?
- Does the Apps Script sheet hold rows worth keeping? (The grant is unresolved per project memory; no repo file confirms it.)
- Is `beatId` unique across lessons?

Suggested staging
1. Stage 0 (verify): the open facts above; add app version constant; define `questionRef`.
2. Stage 1 (core): `feedback_messages` and `question_flags` tables, RLS and guard triggers following the analytics template, a lazy form with honest failure handling, a flag button in the game, staff `flag_counts` view, and `FeedbackInbox` rewritten against Supabase. Apps Script feedback left running in parallel for one release only if a rollback path is wanted.
3. Stage 2 (after real rows exist): retire the Apps Script feedback route; add status lifecycle, retention job and the weekly liveness line.
4. Stage 3 (only if the count view gets ignored): threshold alert through an Edge Function with `notified_at` and a digest cap; "fixed" notice.
5. Deferred: captcha for anonymous text, reviewer-only role if not done in Stage 1, any AI reader.

Rollback: the tables are additive. Stop the client posting and keep the data; do not drop tables. Keep the `VITE_FEEDBACK_ENDPOINT` override readable so a rollback build still works.
