# Button copy guide

Goal: no generic "Continue" where a specific, warm line fits. Written 2026-10-29.

## What is verified and what is not

Verified on Mobbin (iOS screens I looked at, wording read off the image): the Duolingo, Brilliant, Headspace, Finch and Babbel rows marked (V) below. Mobbin returned only the screens listed, so some moments have a single example.

Not verified: Calm, Elevate, Khan Academy Kids and Clash of Clans/Royale. Mobbin returned no usable screens for them (the Clash Royale search returned Discord, Ahead, Sweatcoin and a Duolingo chest screen instead). Anything attributed to those apps is absent here on purpose. Rows marked (I) are my inference from general patterns, not something I saw.

Also note: Duolingo's own correct-answer button is "CONTINUE" (V). Duolingo and Brilliant both use plain Continue on the in-lesson step. The warm, specific wording lives on the moments around it (start, reward, streak, paywall). So the advice is: keep a short plain verb inside the question loop, and spend the personality on the edges.

## Evidence collected (Mobbin, exact primary-button text)

| App | Screen | Button text |
|---|---|---|
| Duolingo | Weekend Quest intro | I CAN DO IT |
| Duolingo | Question, before answer | CHECK |
| Duolingo | Correct answer ("Correct!", "Nicely done!") | CONTINUE |
| Duolingo | Lesson complete ("Go ahead, brag!") | CLAIM XP |
| Duolingo | Streak screen (6 day streak) | I'M COMMITTED |
| Duolingo | Friend streak start | CONTINUE |
| Duolingo | Pearl League recap | SHARE |
| Duolingo | Failed unit test ("You didn't unlock Unit 2, but you can try again later!") | CONTINUE |
| Duolingo | Triple XP reward | CLAIM MORE REWARDS (secondary: NO THANKS) |
| Duolingo | Shop, timer boosts | GET TIMER BOOSTS (secondary: NO THANKS) |
| Duolingo | Shop, cosmetic | BUY NOW $3.98 |
| Duolingo | Super paywall | TRY FOR $0.00 (secondary: NO THANKS) |
| Duolingo | Gift checkout | CONTINUE TO PAYMENT |
| Duolingo | Path node popup | REVIEW +15 XP, REVIEW +40 XP |
| Duolingo | Onboarding email step | NEXT |
| Duolingo | Join classroom, wrong code (error under field) | SUBMIT |
| Duolingo | Chest | "Tap for a chance to upgrade!" (no button, tap the chest) |
| Brilliant | Lesson complete (155 XP, 3/3) | Continue |
| Brilliant | Step solved ("Deliveries complete!") | Continue |
| Brilliant | Step before answer | Check |
| Brilliant | Welcome | I'm a learner / I'm a parent or teacher |
| Brilliant | Tutor prompt | Yes, makes sense / Not really |
| Brilliant | Path | Jump here |
| Headspace | Course page | Next Session |
| Headspace | Leave program dialog | Yes, I'm sure / Stay |
| Finch | Daily goal card | Start / Skip / Snooze |
| Finch | Goal list | Done |
| Finch | Weekly milestone | Claim |
| Babbel | Profile weekly goal | Continue learning |
| Babbel | Learning plan | Review now, Repeat |
| Ahead (not on the requested list) | Reward unlocked | Use it right away / Store in treasure garden |
| Discord (not on the list) | Quest reward | Claim Reward |

## Pattern, in one paragraph

Inside a question loop the apps keep it flat and short (Check, Continue). Rewards use the noun you receive (CLAIM XP, Claim, Claim Reward). Streaks and daily goals use a first-person promise (I'M COMMITTED, I CAN DO IT). Paywalls name the thing or the price (TRY FOR $0.00, GET TIMER BOOSTS) and always pair it with a quiet NO THANKS. Resume or next-step buttons name the object (Next Session, Review now, Continue learning). Choice screens give two honest labels instead of Yes/No (Use it right away vs Store in treasure garden).

## Recommended Blueberry wording by moment

Rules: 1 to 3 words, warm, no em dashes, names the next action. Keep the key a verb or a promise. Sentence case in source; the key renders uppercase.

| Moment | What the best apps say | Blueberry recommendation | Basis |
|---|---|---|---|
| Lesson start | Start (Finch), I CAN DO IT (Duolingo quest), Jump here (Brilliant) | "Let's go" on a new lesson, "Pick up" on a saved one, "Again" kept for a done one | V for the apps, I for "Let's go" |
| Check an answer | CHECK (Duolingo), Check (Brilliant) | Keep "Check" | V |
| Correct answer | CONTINUE (Duolingo), Continue (Brilliant) | "Keep going" (already used in Sort). Alternative on streaks of right answers: "Next one" | V for the baseline, I for the swap |
| Wrong answer | CONTINUE (Duolingo, same button as correct) | "Got it" when the tray explains, "Try again" when the question is retried. Never "Continue" on a miss | V for baseline, I for the fix |
| Lesson complete | CLAIM XP (Duolingo), Continue (Brilliant) | "Claim gems" if gems are shown, otherwise "Nice, next" is too long, so use "Collect" | V for Claim XP, I for the rest |
| Map rebuilt (recap) | Continue (Brilliant) | "See my map" | I |
| Reward or chest open | Claim Reward (Discord), Claim (Finch), tap the chest (Duolingo) | "Open now" for a closed reward, "Claim" once it is open | V for Claim, I for "Open now" |
| Streak or milestone | I'M COMMITTED (Duolingo), CONTINUE on friend streak | "I'm in" (streak extended), "Keep it up" (milestone) | V for the pattern, I for the words |
| Level up or rank up | Not found on Mobbin for the requested apps | "Let's go" | I |
| Shop purchase | BUY NOW $3.98, GET TIMER BOOSTS (Duolingo) | "Buy" with the price, or "Get [item]" | V |
| Onboarding step | NEXT (Duolingo), I'm a learner (Brilliant), Continue (Brilliant/Duolingo) | Question steps: "Next". Intro steps: "Let's go". Final step: "Start learning" | V for Next, I for the rest |
| Daily goal | Start / Skip / Snooze (Finch), Done (Finch) | "Set goal" on pick, "Start" on the goal card | V |
| Error or retry | "Try again later" with CONTINUE (Duolingo) | "Try again" for retryable, "Back to lessons" when it is not | V for the message, I for the label |
| Paywall or upgrade | TRY FOR $0.00, GET TIMER BOOSTS, NO THANKS (Duolingo) | Primary names the plan ("Try free"), secondary "Not now" | V |
| Empty state | Not found on Mobbin in my searches | Name the next action ("Add a card", "Start a lesson") | I |
| Leave or confirm dialogs | Yes, I'm sure / Stay (Headspace) | "Leave" / "Stay" | V |
| Resume | Continue learning (Babbel), Next Session (Headspace) | "Pick up" with the lesson name beside it | V for the pattern |

## Blueberry buttons to change

Audit of src/ by grep, not by running the app. Line numbers as of this audit.

### Generic Continue, change these

| File:line | Moment | Change to |
|---|---|---|
| src/game/beats/BeatRunner.tsx (CONTINUE key, EndingFooter, docs around line 595 of beat-chrome.css) | Lesson ending footer | "Collect" or "Claim" per reward |
| src/game/beats/mcq/session.ts:400 | MCQ after reveal (correct or wrong) | Correct: "Keep going". Wrong: "Got it". Needs a correct flag passed into commitLabel |
| src/game/beats/draw/DrawBeatView.tsx:265 | Draw, after a correct draw | "Keep going" |
| src/game/beats/draw/DrawBeatView.tsx:277 | Draw, after a miss | "Try again" is already there, keep |
| src/game/beats/draw/DrawBeatView.tsx:293 | Draw, after reveal | "Got it" |
| src/game/beats/LessonRecap.tsx:193 | Lesson recap tray | "Keep going" |
| src/game/beats/LessonRecap.tsx:214 | "Map rebuilt!" tray | "See my map" |
| src/game/beats/match/MatchBoard.tsx:425 | Match cleared | "Keep going" |
| src/game/beats/trace/TraceBeatView.tsx:269 | Trace cleared | "Keep going" |
| src/game/beats/StoryScene.tsx:170 | Story scene, last page ("Continue") and others ("Next") | Last: "Let's go". Others: "Next" is fine |
| src/game/app/ui/ButtonGallery.tsx:21, 84, 89 | Gallery only, mirrors the tray | Update to match the new tray wording so the gallery does not lie |
| src/game/lesson/StreakScreen.tsx:334 | Streak screen default label (callers LessonPlayer.tsx:295, BeatRunner.tsx:562 do not override it) | "I'm in" |
| src/game/mistakes/MistakesPage.tsx:225 | Mistakes review, after picking a reason | "Got it". The disabled "Pick why to go on" is fine |
| src/game/tabs/cards/TestMode.tsx:201 | Card test, next question | "Next" (last one already "See results") |
| src/game/pathway-sheet/NodeSheet.tsx:297 | Pathway node sheet | "Pick up" when saved, "Let's go" when not (Start becomes Let's go) |
| src/components/UnitPage.tsx:481 | Unit page action | Same: "Pick up" or "Let's go" |
| src/game/onboarding/copy.ts:159 (CONTINUE), used at Onboarding.tsx:485, 623, PlacementStep.tsx:180, 205 | Onboarding steps | Intro screens "Let's go". Question screens "Next". Placement result "Start learning" |
| src/game/onboarding/Onboarding.tsx:518 (goLabel default) | Onboarding question step | "Next" |
| src/components/StartPage.tsx:122, 155 | Start flow steps | "Next" for choices, "Let's go" on the last |
| src/game/app/i18n.ts:152 | "action.continue" string, shared | Keep as the neutral fallback, stop using it for lesson moments |
| src/game/lesson/LessonPlayer.tsx:350 | "Next" and "Finish lesson" | "Finish lesson" to "Finish" or "Collect" |

### Other generic labels to review

| File:line | Moment | Note |
|---|---|---|
| src/game/guide/UnitGuide.tsx:384 | Lesson key, "Start" and "Again" | "Let's go" for Start |
| src/game/charge/chargeGateModel.ts:346, 361, 409; ChargeGate.tsx:168 | Charge gate, start a lesson | "Let's go" |
| src/game/charge/chargeGateModel.ts:382 | "Review drills are always free" as a button label | Reads as a sentence, not a verb. Use "Start review" and move the free note out of the key |
| src/game/onboarding/copy.ts:100 | PLACEMENT_START "Start" | "Let's go" |
| src/game/beats/sort/SortBeatView.tsx:579 | "Keep going" / "Try again" | Already good, use as the model |
| src/game/lesson/RewardMoment.tsx:906 | continueLabel default "Claim" | Already good |
| src/game/cards/ui/landing.ts:111, 119 | "All clear" / "Review" | Fine |
| src/game/lesson/StreakPage.tsx:504; StreakGallery.tsx:81 | "Back to lessons" | Fine, specific |
| src/components/HomePhoneDemo.tsx:294 | "Got it" | Marketing demo, leave |

### Icon-only close buttons, leave alone

aria-label "Close" and "Dismiss" are screen-reader names for X icons, not visible copy: ToolRail.tsx:133, LanguagePicker.tsx:93, ChargeGate.tsx:382, StreakPage.tsx:297, 363, and the shared components. PkaSettings.tsx:471 shows a visible "Close" toggle, which is a label for collapsing a panel and is fine.

## Caveats

- The grep is pattern based. Labels built from variables, i18n keys or template strings may be missed. Search "label=" and "actionLabel" again after the change.
- Several tests match on label text (for example u1Priming.test.ts expects ">Skip<"). Run them after renaming.
- Onboarding copy is wrapped in draft() in copy.ts, which suggests the copy is pending owner review. Change it there, once, and the onboarding screens follow.
- Do not edit generated Carbonyls decks by hand.
- Chemistry text is untouched by this guide.
