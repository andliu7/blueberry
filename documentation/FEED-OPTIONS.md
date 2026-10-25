# Feed options (STATUS F1, 24 Oct 2026)

Brainstorm only. Nothing in this file is built. It shows three directions for the Feed tab so the
owner can pick one, the same "show, then ask" pattern as the design runs. The admin activity view
(`#/app/admin/activity`) is a separate, built piece and is not one of these options.

## What the Feed has today

Read from `src/game/tabs/feed/` (FeedTab.tsx, feedModel.ts, activityModel.ts) on 24 Oct:

- **Welcome back card** (`welcomeCard()` / `welcomesBack()` in feedModel.ts): "Welcome back, Name!",
  the next lesson on the path, and a "Pick up where you left off" button. A brand-new student gets
  the first-win card instead. Separately, `ResumePrompt.tsx` asks "Welcome back! Pick up where you
  left off?" inside a lesson.
- **Reminders**: exam countdown, cards due today, the daily reminder hour, and "one lesson today keeps
  your streak going" when today is not counted yet.
- **Your activity**: your own wins (cleared, flawless, unit, quiz, challenge, cards, boss), newest first.
- **Daily quests**: the three quests (earn XP, keep streak, get 5 right) with chest bars.
- **From friends**: one honest line, "Cheers from friends will show up here once friend accounts open."
- **More**: the Lab mates invite card (a working Share button), Messages, and the flagged
  Leaderboards and Ask Blueberry rows.

## What is missing today

1. **No server feed.** "Your activity" reads the LOCAL journal only. A student who signs in on a new
   device sees an empty activity list even though `progress_events` (23 Oct) now holds their history.
2. **No other people.** There are no social tables (friends, follows, cheers, display names beyond
   `profiles.full_name`). The friends line and the Lab mates card are placeholders by design.
3. **No notifications.** Nothing reaches a student who has not opened the app; the reminder hour is
   stored but nothing sends it.
4. **No staff or TA voice.** The TA cannot post "office hours moved to 4" or "quiz 3 is up" anywhere
   a student will see it in the app.
5. **No weekly picture.** Every line is about today. There is no "this week you cleared 4 lessons"
   recap, which is the cheapest way to reward coming back.
6. **The streak line leans on loss.** "One lesson today keeps it going" is the only sentence that
   speaks to the streak, and it is phrased around keeping, not around what was earned.

## Direction A: Lab notebook (your own timeline)

**What a student sees.** One scrolling notebook about them. At the top, "Pick up where you left off"
with the exact lesson and question count. Below it a weekly recap card, then the timeline of real
wins grouped by day, with cards due folded in where they fall.

```
+------------------------------------------+
|  Welcome back, Maya!                     |
|  Allylic cations  .  question 4 of 9     |
|  [ Pick up where you left off ]          |
+------------------------------------------+
|  THIS WEEK                               |
|  4 lessons cleared   2 flawless          |
|  31 questions right on the first try     |
|  12 cards due Thursday                   |
+------------------------------------------+
|  TODAY                                   |
|  o Cleared Diels-Alder, no slips         |
|  o Reviewed 14 cards                     |
|  YESTERDAY                               |
|  o Finished Unit 1 checkpoint            |
+------------------------------------------+
```

**Why they come back.** Seeing their own week grow. A student who skipped three days opens to "Last
time you were on question 4", not to a broken streak. The recap counts what happened, never what
was missed.

**Data it needs.** The journal plus `progress_events` (already shipped). The weekly recap is a pure
fold over events in the window. Cards due come from the deck store already read by Reminders.
**No new tables.**

**Economy fit.** Pays nothing new and derives everything (ECONOMY.md: the client animates what the
server concluded). Recap lines are counts of real events. The streak line would be rewritten to
"You came back: +10 XP for today's goal" style wording, rewarding the return rather than warning
about loss.

**Effort.** Small. A recap fold in activityModel.ts with tests, reading the synced journal instead
of the device-only one, and a card on the existing Feed. Roughly one lane, one day.

## Direction B: Class pulse (anonymous course-wide, plus TA posts)

**What a student sees.** The notebook from A stays at the top, and below it a "Your class this week"
block: anonymous aggregates and posts from staff.

```
+------------------------------------------+
|  FROM YOUR TA                 Tue 2:10pm |
|  Office hours move to 4pm Thursday.      |
|  Quiz 3 covers Units 1 and 2.            |
+------------------------------------------+
|  YOUR CLASS THIS WEEK                    |
|  31 classmates cleared Allylic cations   |
|  Hardest question: E/Z of the diene      |
|     (42% right on the first try)         |
|  [ Try it ]                              |
+------------------------------------------+
|  YOUR WEEK (Direction A, smaller)        |
+------------------------------------------+
```

**Why they come back.** The TA's posts are worth checking, and "the hardest question this week" is
a challenge with a social edge but no names. It tells a student they are not alone on the hard one.

**Data it needs.** A `staff_posts` table (staff insert via `is_staff()`, everyone signed in reads)
and a SECURITY DEFINER aggregate view over `progress_events` that returns only counts and
first-try rates per lesson and per problem, and **hides any count under 5** so no single student can
be picked out. No names leave the server.

**Economy fit.** Aggregates pay nothing. "Try it" on the hardest question routes into the normal
lesson or practice flow, which pays by the normal rules. No leaderboard of people, so no rank
anxiety.

**Effort.** Medium. Two migrations (table + view, RLS on both), a staff compose box in the admin
viewer, the aggregate fold, and the Feed block. Roughly two lanes plus owner time applying
migrations and checking the privacy floor.

## Direction C: Lab mates (opt-in friends)

**What a student sees.** People they chose. "Sam cleared Diels-Alder", a one-tap cheer, and cheers
they received. Empty, honestly, until real friends exist.

```
+------------------------------------------+
|  LAB MATES                               |
|  Sam cleared Diels-Alder         [Cheer] |
|  Priya finished Unit 1           [Cheer] |
|  You got 3 cheers yesterday              |
+------------------------------------------+
|  Add a lab mate: code BX-4K7Q  [Share]   |
+------------------------------------------+
   (no friends yet: only the invite card shows)
```

**Why they come back.** Other people. Cheers are the warmest pull a study app has, and a friend
clearing the lesson you are stuck on is a nudge without a deadline.

**Data it needs.** `friendships` (pairs, both accept, by invite code), `cheers` (from, to, event id,
rate limited), display names students choose for this (not `full_name` by default), and a
friend-scoped read of `progress_events` (a SECURITY DEFINER function that returns only accepted
friends' clears). Never shown with fake people: with no friends the section is the invite card only.

**Economy fit.** Cheers pay nothing, or at most a capped cosmetic, so they cannot be farmed. No
"your friend passed you" comparisons and no streak shaming of others.

**Effort.** Large. Three tables, invite codes, moderation and blocking, a privacy review, and the
UI. Several lanes, and it is only worth it once a cohort is using the app together.

## The question for the owner

Which one should the Feed become?

- **A, Lab notebook**: recommended first. No new tables, uses the synced history that shipped 23
  Oct, and fixes the "empty feed on a new device" gap today.
- **B, Class pulse**: good once the TA is posting and enough students are active for the floor of 5.
- **C, Lab mates**: the biggest pull, the biggest build, and best after real cohort use.

They stack: A is the base of B, and B's privacy floor is the base of C. Picking A now does not close
the other two.
