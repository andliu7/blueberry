# Onboarding, Answer Feedback, Celebration Animation, and "Feels Like a Company" Brand Systems (for Blueberry, an organic-chemistry study web app)

Research notes, September 2026. Scope: named, reproducible patterns from Duolingo, Brilliant, Headspace, Spotify Wrapped, Linear, Math Academy and similar products, plus how each is built, adapted for a solo React + TypeScript + Vite + Tailwind stack (motion/framer-motion, GSAP, three.js, Rive possible).

Source-quality note: many first-party pages (blog.duolingo.com, rive.app, growth.design, engineering.atspotify.com, linear.app, medium.com subdomains) were blocked by the network proxy, so some facts rest on search-result summaries of those pages. Those are marked "(via search summary)". The strongest primary source I could read in full is the transcript of Lenny's Podcast with Jackson Shuttleworth, Group PM of Duolingo's Retention team (Dec 2024). Mobbin screenshots (Duolingo and Brilliant iOS, 2025-2026 captures) were used as direct visual evidence of current flows.

---

## 1. Onboarding: goal-setting, personalization quiz, value before signup, commitment devices, first win

### Takeaway
The best learning apps put a real lesson (the "first win") before account creation, ask 3-6 quick personalization questions whose answers visibly shape a plan, and close with an explicit commitment screen. Duolingo's own numbers show that delaying signup and wording the commit button as a commitment ("Commit to my goal") both produced large retention wins. Brilliant uses the same pattern with a mascot speech bubble, a progress bar, and a "your learning path" signup wall.

### Cited Findings

**Duolingo: value before signup**
- Moving the signup screen to after the first lesson increased DAUs by 20% (via search summary of growth.design's Duolingo case study) — [growth.design](https://growth.design/case-studies/duolingo-user-retention)
- Current Duolingo iOS flow (Mobbin): after the first lesson, a "Learning legend! You just completed your first lesson!" screen shows Duo (the mascot) bursting out of a nest, plus three stat cards (TOTAL XP 25 / AMAZING 100% / SPEEDY 1:54) and a "CLAIM XP" button. Next comes a "1 day streak" screen with a week-dot calendar and an "I'M COMMITTED" CTA, then Duo holding a clipboard saying "Don't lose your progress! Let's create a profile." with CREATE PROFILE and LATER buttons. Signup is framed as protecting progress the learner already has — [Mobbin: Duolingo "Choosing a learning goal" flow](https://mobbin.com/flows/e8ee7348-2019-4b8f-8179-7f4961ef6ea8); [Mobbin flow 2](https://mobbin.com/flows/25145623-749c-4a2c-bd32-ddea59ee235d)
- Duolingo commitment-device screen (Mobbin): "Commit to learning!" is a 4-row list: 7 day streak / Good, 14 day streak / Great, 30 day streak / Incredible, 50 day streak / Unstoppable. Duo holds a flame and says "Streak goals help you stay committed!", and the CTA "COMMIT TO MY GOAL" stays disabled until the learner picks a row — [Mobbin](https://mobbin.com/flows/25145623-749c-4a2c-bd32-ddea59ee235d)
- The copy change on the goal screen from "Continue" to "Commit to my goal" was "a massive win". Shuttleworth calls it the biggest current-user-retention-rate (CURR) win the team had had at that point, "a top three CURR win" — [Lenny's Podcast transcript, Jackson Shuttleworth](https://github.com/ChatPRD/lennys-podcast-transcripts/blob/main/episodes/jackson-shuttleworth/transcript.md)
- Showing the outcome when a learner starts a streak ("you're 7x more likely to finish the course if you have a 30-day streak") was a "huge win". The idea came from a monetization-team string ("5.6x more likely to finish the course if you subscribe") — [Shuttleworth transcript](https://github.com/ChatPRD/lennys-podcast-transcripts/blob/main/episodes/jackson-shuttleworth/transcript.md)
- Duolingo delays advanced concepts: "we actually don't introduce the concept of a perfect streak until after you've hit seven days". Introducing "too many concepts to users too early... pretty universally they lose" in tests — [Shuttleworth transcript](https://github.com/ChatPRD/lennys-podcast-transcripts/blob/main/episodes/jackson-shuttleworth/transcript.md)
- Changing the streak unit from an XP goal to "do one lesson a day" was one of the most impactful experiments. Design the streak around the product's "unit of use" — [Shuttleworth transcript](https://github.com/ChatPRD/lennys-podcast-transcripts/blob/main/episodes/jackson-shuttleworth/transcript.md)
- Duolingo has run 600+ streak experiments in 4 years (roughly one every other day) and has built copy-testing infrastructure — [Shuttleworth transcript](https://github.com/ChatPRD/lennys-podcast-transcripts/blob/main/episodes/jackson-shuttleworth/transcript.md)
- Aggregator claim: Duolingo converts about 8.9% of MAU to paid, against roughly 2% typical for apps (relaunch.ai teardown, via search summary; the underlying figure presumably comes from Duolingo's FY2024 filings but was not verified) — [relaunch.ai](https://relaunch.ai/blog/duolingo-onboarding-teardown-7-b-tests-behind-their-9-conver.html)

**Brilliant: personalization quiz with mascot and progress bar**
- Brilliant iOS onboarding (Mobbin, 14 screens): a thin green progress bar at the top. A small green blob character (the "Blorb" mascot) with a yellow-outlined speech bubble asks "What's your top goal?" with 6 emoji-iconed options (Professional growth, Staying sharp, Excelling in school, Helping my child learn, Helping my students learn, Something else). A level picker uses 2x2 cards, each with a code snippet illustrating the level (Beginner `print("hello")` … Advanced `def circle(size):`), and the mascot replies playfully to each answer ("So we speak the same language(s). Cool."). A habit-anchor question ("Morning routine during breakfast or my commute / Quick break / Nightly ritual after dinner or while in bed / Another time") gets "Source code by starlight. Sounds dreamy." A claim screen reads "Learn 6x more effectively... Interactive learning has been shown to be 6x more effective than watching lecture videos". The signup wall comes last: "Sign up for free to discover your learning path" with Apple/Google/email — [Mobbin: Brilliant Onboarding](https://mobbin.com/flows/20ad012b-2683-4c0c-beb8-8ff62c6f509e)
- After a quiz, Brilliant shows a personalized plan and an exact goal date before signup (teardown summary) — [Savvy: Brilliant onboarding](https://trysavvy.com/example/brilliant-onboarding)
- A broader onboarding study claims users will answer 5-6 questions if the output is obviously personalized to them — [daniliants.com, 1,460 onboarding flows](https://daniliants.com/insights/i-studied-1460-onboarding-flows-heres-what-i-found/)

**Headspace: implementation intentions**
- Headspace onboarding asks why the user came (goal) and builds meditation into a daily routine. An experiment's "precommitment" condition had users complete a quiz, receive a course recommendation, and make a concrete plan for when, where and how often they'd meditate (via search summary) — [Kristen Berman / Irrational Labs substack](https://kristenberman.substack.com/p/lessons-on-habit-formation-from-an)
- Purchasely's writeup is titled "Behavioral Science Boosts Headspace Course Starts by Over 100%". The page was blocked, so the exact figures and conditions are unverified — [Purchasely](https://www.purchasely.com/blog/headspace-behavioral-science-onboarding-experiment)
- A Headspace teardown notes the design team chose not to ask "how often do you plan to meditate" in onboarding (via search summary) — [tearthemdown](https://tearthemdown.substack.com/p/headspace)

### Inferences
- **Pattern O1 "Lesson-first, account-later"**: route `/start` straight into a 60-90 second micro-lesson (e.g. "Which carbon is the nucleophile?" with 3-4 interactive items). Store progress in `localStorage` or an anonymous Supabase session, and only then show "Save your progress", framed as loss prevention in Duolingo's wording. Keep the anonymous state server-mergeable so signup does not reset anything.
- **Pattern O2 "Mascot-voiced quiz with witty replies"**: 4-5 steps, each one tap, top progress bar (motion `layout` width animation). A mascot bubble reacts to the previous answer with a one-line quip (Brilliant's "Source code by starlight"). Chemistry questions: goal (ace Orgo I exam / MCAT / refresh / curiosity), course stage (Orgo I, Orgo II, specific chapter), exam date (enables a "goal date" plan like Brilliant's), when you'll study (habit anchor like Brilliant/Headspace), comfort level (cards showing a sample structure at each level, such as a simple alkane, then a mechanism arrow, then a stereocenter, then a multi-step synthesis, mirroring Brilliant's code-snippet level cards).
- **Pattern O3 "Commit screen"**: 4-row selectable list (7/14/30/50 days, labels Good/Great/Incredible/Unstoppable), CTA disabled until selection, CTA text "Commit to my goal", not "Continue". A cheap copy test with a documented big win.
- **Pattern O4 "Outcome framing"**: once Blueberry has data, state a concrete outcome stat when a streak starts ("learners who study 5 days/week before an exam score X"). Don't fabricate the stat before data exists. Use a softer, non-numeric framing until then.
- Placement test: Brilliant's level cards are a lightweight self-placement. An optional 5-question diagnostic ("Test out of chapters 1-3") is the organic-chemistry equivalent of Duolingo's "start from scratch vs. find my level" fork.

### Gaps
- Speak, Headway, Blinkist, Duolingo Math, Notion and Linear onboarding specifics were not researched in depth (tool budget). No published conversion data found for Brilliant's quiz.
- The Headspace experiment's exact numbers are unverified (source blocked).
- The Duolingo +20% DAU figure for delayed signup comes only from a growth.design summary. The original Duolingo source was not located.

---

## 2. Answer feedback micro-interactions: correct/incorrect, explanations, partial credit

### Takeaway
The canonical pattern is a bottom "check" bar that turns into a colored feedback sheet: green with a chime for correct, red with the correct answer shown and an explanation affordance for wrong. Brilliant layers on custom per-answer feedback and encouragement when learners struggle. Duolingo has made "Explain My Answer" (LLM-generated "why wrong") free for all learners.

### Cited Findings
- Brilliant's method: visual, interactive, single-concept lessons with immediate feedback. "Each interactive problem gives instant, custom feedback based on your answer" — [Brilliant About](https://brilliant.org/about/)
- Brilliant's product design (with ustwo) included components for feedback on performance: "in-lesson celebrations when learners enter the correct answer, and moments of encouragement when learners are struggling", plus lesson/challenge tiles, lesson-detail tooltips, and progress trackers showing points earned (via search summary) — [ustwo x Brilliant](https://ustwo.com/work/brilliant/)
- Brilliant's User Motivation team redesigned game mechanics in early 2023 and uses Rive for customized learning-path colors, the streak counter, and other motivation animations (via search summary of Rive's case study) — [Rive blog: How Brilliant.org motivates learners](https://rive.app/blog/how-brilliant-org-motivates-learners-with-rive-animations)
- Duolingo "Explain My Answer": after certain exercises, learners tap a button for personalized feedback on their answer, correct or incorrect. It takes into account "the error you made and what about the pattern or rule can be challenging". It started as a Duolingo Max (GPT-4) feature and is now free for all learners (via search summary) — [Duolingo blog: Explain My Answer now free](https://blog.duolingo.com/explain-my-answer-now-free); [TechRadar](https://www.techradar.com/news/duolingos-new-gpt-4-ai-will-happily-explain-why-your-spanish-is-wrong)
- Duolingo's explanation-feedback sheet (Mobbin) offers structured quality reporting: "My answer is correct / My mistake was not explained / The explanation is wrong / not helpful / contradictory / The examples are wrong / Other issue" — [Mobbin screen](https://mobbin.com/screens/f6732d72-7715-44a5-9a4b-630f4acfff42)
- Duolingo said per-mistake heart loss "was not the most effective way to support learning" and replaced hearts with an Energy system (via search summary) — [Class Central](https://www.classcentral.com/report/duolingo-breaks-hearts-for-energy/)
- Duolingo's correct-answer sound is a short bright chime ("ding-dilin"), now an internet meme sound (secondary sources only) — [Sound Instants](https://soundinstants.com/sound/duolingo-correct-sound-effect); [Medium: micro-interactions on Duolingo](https://medium.com/@Bundu/little-touches-big-impact-the-micro-interactions-on-duolingo-d8377876f682)
- Math Academy: wrong answers penalize or strengthen related concepts in the knowledge graph ("Fractional Implicit Repetition"), so review targets concepts at the edge of forgetting. 1 XP is roughly 1 minute of focused effort — [dgore review](https://drgore.substack.com/p/my-review-of-math-academy); [The Math Academy Way (PDF)](https://www.justinmath.com/files/the-math-academy-way.pdf)

### Inferences (build recipes for Blueberry)
- **Pattern F1 "Check bar → feedback sheet"**: a fixed bottom bar with a disabled "Check" button that enables on input. On submit, the bar's background animates to success (green) or error (red/coral) using a `motion.div` with `animate={{ backgroundColor }}`, and the sheet slides up about 8px with a spring (`type: "spring", stiffness: 500, damping: 30`). Content: an icon, a headline ("Nice!" / "Not quite"), the correct answer on error, and a "Why?" link that expands an explanation (`AnimatePresence` + height auto). Button text becomes "Continue" (correct) or "Got it" (wrong).
- **Pattern F2 "Tactile 3D button"**: Duolingo-style buttons have a darker bottom border (e.g. `border-b-4`) that collapses on `:active` (`active:border-b-0 active:translate-y-[4px]`). This is cheap in Tailwind and a big part of the "game feel".
- **Pattern F3 "Wrong-answer shake"**: a 300-400ms horizontal shake on the selected option (`animate={{ x: [0,-8,8,-6,6,-3,3,0] }}`), disabled under reduced motion (replace with a color flash). Never shake the whole screen.
- **Pattern F4 "Chemistry-specific why-wrong"**: organic chemistry has enumerable misconceptions (wrong nucleophile, wrong arrow direction, missing formal charge, SN1 vs SN2 confusion). Tag each distractor with a misconception ID and author a targeted explanation per distractor. This is the "custom feedback based on your answer" that Brilliant advertises. An LLM "Explain my answer" button can be a fallback for free-response input (drawn mechanisms, typed names), with a Duolingo-style report-a-problem list to catch bad explanations.
- **Pattern F5 "Partial credit"**: for multi-part answers (e.g. a 3-step mechanism), highlight each correct step green in sequence (stagger 80-120ms), mark the first wrong step red, and pulse the missing piece. The learner sees what they got right before what they got wrong, matching Brilliant's "encouragement when struggling" intent.
- **Pattern F6 "Combo meter"**: after 3+ correct in a row, show a small "3 in a row!" chip with a flame or particle burst. Increment an in-lesson combo counter, and use it on the lesson-complete screen as a stat card ("Combo: 7").
- **Mastery signal over hearts**: given Duolingo's public retreat from punitive hearts, avoid a lives system in a study tool. Use Math Academy-style consequences instead: wrong answers schedule review, and XP measures effort.

### Gaps
- Could not read Brilliant's own blog or Rive's case study in full (blocked), so the exact Brilliant feedback timing, sounds and Rive state machine inputs are unknown.
- No source found on Duolingo's actual feedback animation durations or easing values.

---

## 3. Session-end and milestone celebrations: lesson complete, streak extension, level-up, year-in-review

### Takeaway
Celebration screens should pause the user on purpose. Duolingo's retention PM explicitly wants learners to "stop and land on the screen", and animation plus haptics on streak extension "wins" in tests. The canonical lesson-complete screen is: mascot animation, headline, 3 staggered stat cards, one CTA. Streak screens should lead with the number (an odometer tick), not the metaphor. Wrapped-style recaps are now built as a single designer-authored animation file (Lottie, then Rive) that engineering drives with user data.

### Cited Findings
- Shuttleworth on celebration: "using not only animation, haptics, sound effects... haptics are something we have done a lot of testing on... a really cool haptic pattern as you extend your streak, all of this stuff wins." "It causes you to pause on that screen... sometimes I just want you to pause there and enjoy the moment. If I can get you to enjoy the moment more, you're going to care more about your streak." Caveat: "You got to be careful not to do this for too many screens." Duolingo had no sound effects on the streak screen at the time — [Shuttleworth transcript](https://github.com/ChatPRD/lennys-podcast-transcripts/blob/main/episodes/jackson-shuttleworth/transcript.md)
- Streak screen redesign: "Kurt, one of our animators, did this awesome odometer animation where... your number would tick every day." Lesson: "form should follow function... we're really leading with the number, not necessarily the flame." At milestones Duo becomes "Phoenix Duo" and "lights on fire". For early-streak users, the goal is comprehension; more spectacle is saved for deeper-streak users — [Shuttleworth transcript](https://github.com/ChatPRD/lennys-podcast-transcripts/blob/main/episodes/jackson-shuttleworth/transcript.md)
- Duolingo's streak-milestone design blog: research showed the "keep the flame alive" analogy isn't shared by all cultures, so milestones were treated as video-game "power ups" with Duo physically changing (phoenix) (via search summary) — [Duolingo blog: streak milestone design animation](https://blog.duolingo.com/streak-milestone-design-animation)
- Secondary claims (not verified at a primary source): the phoenix/streak-extension animation redesign moved new-learner D7 retention +1.7%, and learners reaching a 7-day streak were 3.6x likelier to finish a course — [Deconstructor of Fun: Duolingo streaks](https://duolingo.deconstructoroffun.com/mechanics/streaks). A 40% increase in learners maintaining 7+ day streaks is claimed by [designfolio substack](https://designfolio.substack.com/p/crazy-ux-redesign-duolingo)
- "Perfect Streak": if no streak freeze is used, the streak turns gold and the calendar progress bar "just looks a little bit nicer". There is no other reward, and it is "really powerful" — [Shuttleworth transcript](https://github.com/ChatPRD/lennys-podcast-transcripts/blob/main/episodes/jackson-shuttleworth/transcript.md)
- Flexibility mechanics: 2 streak freezes beat 1, and 3 was no better than 2. Giving two free freezes when a new streak starts was a huge win. "Earn Back" (do a few lessons soon after losing a streak to restore it) beat paid Streak Repair. Once users pass day 7 "loss aversion kicks in", and retention gains flatten after day 7 — [Shuttleworth transcript](https://github.com/ChatPRD/lennys-podcast-transcripts/blob/main/episodes/jackson-shuttleworth/transcript.md)
- Notifications: a practice reminder 23.5 hours after yesterday's practice, and a "streak saver" at 10 PM if the streak isn't extended yet. Users perceive the latter as positive because they care about the streak. Over 9 million users hold 1-year+ streaks — [Shuttleworth transcript](https://github.com/ChatPRD/lennys-podcast-transcripts/blob/main/episodes/jackson-shuttleworth/transcript.md)
- Leagues: weekly leaderboards of 30 people (you plus 29 others), driven by XP — [Shuttleworth transcript](https://github.com/ChatPRD/lennys-podcast-transcripts/blob/main/episodes/jackson-shuttleworth/transcript.md)
- Duolingo lesson-complete variants catalogued on 60fps.design: "Duo explodes in a playful cartoon animation to celebrate a perfect lesson, followed by staggered stat cards"; an anime-themed version with a floating mascot, expanding stats card and staggered counters; streak animations at 2, 30, 126 days and "longest ever" — [60fps: head-explode](https://60fps.design/shots/duolingo-lesson-complete-head-explode-animation); [60fps: anime lesson complete](https://60fps.design/shots/duolingo-anime-lesson-complete-animation); [60fps: 30 day streak](https://60fps.design/shots/duolingo-30-day-streak-animation); [60fps Duolingo index](https://60fps.design/apps/duolingo)
- Duolingo acquired two Detroit motion studios, Gunner (2022) and Hobbes, to amplify game mechanics with animation. Hobbes now keeps the haptics work too — [TipRanks press release](https://www.tipranks.com/news/press-releases/duolingo-doubles-down-on-design-and-animation-with-acquisition-of-hobbes); [Shuttleworth transcript](https://github.com/ChatPRD/lennys-podcast-transcripts/blob/main/episodes/jackson-shuttleworth/transcript.md)
- Brilliant's streak (Mobbin): a lime "Streak extended!" toast pill at the top of the path. The streak panel shows a big "2 ⚡", a Mon-Fri row of lightning-bolt circles, and "Max streak / Lessons complete" stats. A share sheet produces a branded card ("2 day learning streak" with sparkles and the mascot) exportable to Messages or Save Image — [Mobbin screens](https://mobbin.com/screens/ec3fe703-fe07-489e-92a5-45eb5b3d4720); [Mobbin](https://mobbin.com/screens/ebbb0933-c541-43ae-8eb1-4661d36beeae)
- Duolingo Year in Review is a roughly 10-page, story-style summary of lessons completed, minutes learned, words learned and more — [Digital Trends](https://www.digitaltrends.com/phones/duolingo-year-in-review-2024-how-to-find-yours/)
- Spotify Wrapped: historically built natively per platform (view/layer transforms, path manipulation, gradients, blurs). For 2023 (adding web), motion designers created a single animation file served to all platforms for visual parity (via search summary). For 2025, Spotify prototyped the motion with dummy data, built the final animation in Rive, and engineering drove it with real user data. In 2024, 245M+ users engaged across 184 markets — [Spotify Engineering: 2023 Wrapped animation](https://engineering.atspotify.com/2024/01/exploring-the-animation-landscape-of-2023-wrapped); [Rive blog: Spotify Wrapped 2025](https://rive.app/blog/spotify-used-rive-for-spotify-wrapped-2025); [Interesting Engineering](https://interestingengineering.com/culture/spotify-wrapped-2024-explained)

### Inferences (build recipes)
- **Pattern C1 "Lesson complete"**: sequence of mascot/hero animation (0-600ms) → headline (Feather-style display font) → 3 stat cards staggered 120ms each with a count-up (motion `animate(0, value, { duration: 0.8 })` into a `useMotionValue` rendered with `Math.round`). Suggested cards: XP, Accuracy %, Time. Then one CTA. Card colors follow the Duolingo convention: each stat gets its own hue header (yellow XP, green accuracy, blue speed). Add a confetti burst via `canvas-confetti` with `disableForReducedMotion: true` only on "perfect" lessons, so confetti stays special.
- **Pattern C2 "Streak odometer"**: render the old number, then roll digits to the new number (per-digit vertical translate, spring), with a weekday dot row where today's dot fills with a check. Lead with the number. Haptics are not available on desktop web, but `navigator.vibrate([20, 40, 30])` works on Android Chrome (not iOS Safari). Pair it with a short sound.
- **Pattern C3 "Milestone transformation"**: at 7/30/100/365 days, swap the mascot for a "powered-up" variant (Duolingo's Phoenix Duo). For Blueberry: a blueberry that gains a molecular "aura" or becomes a benzene-ring crown. Save this spectacle for milestones; keep day 1-6 screens explanatory ("A streak counts how many days you've studied in a row" — Duolingo's exact explanatory line on its 5-day screen, seen on Mobbin).
- **Pattern C4 "Perfect week gold state"**: the streak turns gold if no freeze was used. Zero reward, cheap to build, documented as powerful.
- **Pattern C5 "Shareable card"**: generate a branded PNG (html-to-image, or satori on the server) of streak or milestone stats, following Brilliant's share-sheet pattern. It also serves as marketing.
- **Pattern C6 "Semester Wrapped"**: a 6-10 card story at semester end (reactions mastered, most-missed mechanism, hours, longest streak, "your signature functional group"). Build it with GSAP timelines or motion, each card a full-screen section with tap-to-advance and a progress segment bar (Instagram-stories pattern). Rive with data-bound text is the Spotify 2025 approach if a designer is available.
- Use Duolingo's day-7 inflection: give 2 free streak freezes at streak start, and put the most design effort into days 1-7.

### Gaps
- No primary source with actual Duolingo animation timings, easing curves, or haptic patterns.
- The +1.7% D7 figure is attributed to Duolingo's blog only by secondary sites. I could not open the blog post to confirm.
- League promotion and level-up screen construction details were not found.

---

## 4. Mascot use: when it helps vs. hurts

### Takeaway
Mascots work when they are a modular, state-driven character that reacts to the learner (idle, success, failure, speaking) and speaks in the brand voice during onboarding. They hurt when they add cognitive load or when the metaphor doesn't translate across cultures. Duolingo built its characters in Rive from composable head and body pieces. Brilliant introduced a minimal geometric blob mascot in its 2023 rebrand.

### Cited Findings
- Duolingo's Rive characters: modular animation pieces blended in real time by the State Machine. 8 head x 8 body animations yield 64+ neutral variations. Separate states for poses and mouths, 20+ mouth shapes (visemes) per character, exported as one runtime file. At runtime the character syncs with audio, reacts to word taps, stops speaking when the user finishes early, idles (blinks, head nods), and transitions to success or failure reactions (via search summaries of Duolingo's and Rive's writeups) — [Duolingo blog: world character visemes](https://blog.duolingo.com/world-character-visemes); [DEV: How Duolingo uses Rive](https://dev.to/uianimation/how-duolingo-uses-rive-for-their-character-animation-and-how-you-can-build-a-similar-rive-mascot-5d19)
- Brilliant's 2023 refresh (with Koto's LA studio, starting fall 2023, aimed at young professionals) introduced a globe-like app icon, a light all-caps sans-serif wordmark, a "PIX" illustration style built from straight-edged line segments, and "a goofy character named Blorb who encouraged you along your learning journey" (via search summary of designer Peter Cho's post) — [Peter Cho: A Brilliant brand refresh](https://pcho.medium.com/a-brilliant-brand-refresh-4af021c11486)
- In Brilliant's current onboarding the mascot appears as a small icon beside a speech bubble, reacting with a quip to each answer, and changes expression or props (e.g. a mug for "nightly ritual") — [Mobbin: Brilliant onboarding](https://mobbin.com/flows/20ad012b-2683-4c0c-beb8-8ff62c6f509e)
- Duolingo found the flame metaphor culturally non-universal and moved to leading with the number. Clarity comes first for new users, with more delight for deeper-streak users — [Shuttleworth transcript](https://github.com/ChatPRD/lennys-podcast-transcripts/blob/main/episodes/jackson-shuttleworth/transcript.md); [Duolingo blog via search summary](https://blog.duolingo.com/streak-milestone-design-animation)
- Duolingo's Feather Bold typeface borrows shapes from Duo: angled, rounded protrusions, and a "g" with a flick mimicking Duo's eyebrows. The mascot and type system are designed together — [Canny Creative brand atlas](https://www.canny-creative.com/atlas/brand/duolingo/); [Beth Johnson: Duolingo identity & typeface](https://bethjohnson.design/duolingo)

### Inferences
- For a solo developer, a Brilliant-style minimal mascot (a geometric blueberry with two dot eyes and a mouth) is far more feasible than Duolingo's full character. Build it as SVG with 4-6 states (idle blink, happy bounce, thinking, "oops" wince, celebrate, sleepy for streak-at-risk). Drive it with motion variants, or build one Rive file with a state machine exposing inputs such as `isCorrect` (boolean trigger), `streakMilestone` (number), and `talking` (boolean).
- Put the mascot where emotion matters: onboarding speech bubbles, the lesson-complete screen, streak-at-risk nudges, and empty states. Keep it out of the problem-solving view, where it competes with the molecule for attention. This follows Duolingo's lesson that spectacle should not beat comprehension.
- Let the mascot's shapes inform other brand assets (icon, loading spinner, favicon), as Duolingo did with Feather Bold.

### Gaps
- Headspace character design specifics were not researched (budget).
- No quantitative evidence found for mascot vs. no-mascot A/B results.

---

## 5. Sound design and accessibility (prefers-reduced-motion, sound toggles)

### Takeaway
Short, distinct, pitch-coded sounds (bright chime for correct, soft low tone for incorrect, a rising flourish for completion) are part of Duolingo's identity. Duolingo tests haptics heavily and considers them part of the motion practice. On the web, respect `prefers-reduced-motion` globally via motion's `MotionConfig`, gate confetti, and give sound its own toggle that defaults sensibly.

### Cited Findings
- Duolingo's correct-answer chime has become a widely recognized meme sound, evidence of sonic branding strength (secondary) — [Sound Instants](https://soundinstants.com/sound/duolingo-correct-sound-effect); [LinkedIn: How Duolingo leverages emotional design using sound](https://www.linkedin.com/pulse/how-duolingo-leverages-emotional-design-sound-engage-users-lolo-a0i7f)
- Haptics at Duolingo started as engineers "cobbling together" patterns, moved to product designers, and now sit with the Hobbes animation studio. Shuttleworth tried to hire a dedicated haptics designer and found the skill set rare ("kind of sound effects, kind of motion design, sort of technical") — [Shuttleworth transcript](https://github.com/ChatPRD/lennys-podcast-transcripts/blob/main/episodes/jackson-shuttleworth/transcript.md)
- motion (motion.dev) for React: `<MotionConfig reducedMotion="user">` automatically disables transform and layout animations for users with Reduced Motion on, while preserving opacity and backgroundColor animations. The `useReducedMotion()` hook returns a boolean for custom logic — [Motion: React accessibility](https://motion.dev/docs/react-accessibility); [Motion: useReducedMotion](https://motion.dev/docs/react-use-reduced-motion)
- canvas-confetti's `disableForReducedMotion` option (default false) disables confetti entirely for users who prefer reduced motion — [canvas-confetti README](https://github.com/catdad/canvas-confetti/blob/master/README.md)
- A designer exploring a non-visual Duolingo rethought "what delight can look and sound like when visuals are no longer the primary medium" — [wendy li, Medium](https://medium.com/@wndyli/reimagining-duolingo-a-non-visual-approach-to-language-learning-728e4e8733f9)

### Inferences (implementation)
- Wrap the app in `<MotionConfig reducedMotion="user">`. For GSAP, use `gsap.matchMedia()` with `(prefers-reduced-motion: reduce)` to swap timelines for instant or opacity-only versions. For three.js scenes, pause auto-rotation under reduced motion.
- Build a tiny sound module on the Web Audio API or Howler.js with 4-6 sprites (correct, incorrect, combo, complete, streak, level-up), all under 400ms except complete. Preload after first user gesture, because browsers require a gesture before audio plays. Tune pitch so the correct chime rises and the incorrect tone is softer and lower, never harsh. Add an in-app settings toggle (Sound on/off, persisted), plus a quick mute icon in the lesson header. Consider defaulting sound on for lessons but off for ambient UI.
- Never convey correctness by color alone: pair green/red with an icon (check/x) and text ("Correct" / "Not quite"). Announce results in an `aria-live="polite"` region.
- Haptics on the web: `navigator.vibrate` works on Android Chrome only, so treat it as progressive enhancement behind the same "effects" toggle.

### Gaps
- No primary interview with Duolingo's or Brilliant's sound designers was found.
- Brilliant's sound design could not be characterized from sources.

---

## 6. "Feels like a company": design system, voice, narrative, marketing site, illustration, naming, icon, email voice

### Takeaway
Small products feel like real companies when a few rules are applied everywhere: one core color with a named secondary palette, one display face plus one text face with strict pairing rules, a written voice guide, one illustration style, a mascot that shares shapes with the type and icon, and public artifacts of craft (changelog, design writing). Linear shows how a tiny token set (3 inputs → full theme) keeps everything consistent. Arc and Raycast show changelogs as brand marketing.

### Cited Findings
- Duolingo brand system: Feather Green is the core color. The named secondary palette is Macaw (blue), Cardinal (red), Bee (yellow), Fox (orange), Beetle (purple) and Humpback (blue), used for illustrations and full-bleed backgrounds without diluting the green. Feather Bold (bespoke, lowercase only) is for headlines and impact moments, DIN Next Rounded for body, and they are never mixed in the same sentence. Voice is "expressive, playful, embracing and worldly", in simple, globally understandable language without exclusionary slang — [Duolingo brand guidelines: tone](https://design.duolingo.com/writing/tone); [Duolingo: typography](https://design.duolingo.com/identity/typography); [Duolingo: color](https://design.duolingo.com/identity/color); [Canny Creative](https://www.canny-creative.com/atlas/brand/duolingo/)
- Linear's 2024 UI redesign rebuilt theme generation in the LCH color space (perceptually uniform lightness, unlike HSL). Instead of defining 98 variables per theme, each theme is defined by 3 inputs: base color, accent color and contrast. The same system generates the default light and dark themes and custom themes — [Linear: How we redesigned the Linear UI (part II)](https://linear.app/now/how-we-redesigned-the-linear-ui); [Linear changelog: new UI](https://linear.app/changelog/2024-03-20-new-linear-ui)
- Karri Saarinen (Linear CEO): "We started with quality"; "you should design something for someone... impossible even — to design something really good for everyone". At Linear, quality comes from connected teams with "no handoff to dev" where everyone owns the result — [First Round Review: Linear's path to PMF](https://review.firstround.com/linears-path-to-product-market-fit/); [Figma blog: Karri Saarinen's 10 rules](https://www.figma.com/blog/karri-saarinens-10-rules-for-crafting-products-that-stand-out/); [YC: Brand design tips from Karri Saarinen](https://www.ycombinator.com/library/Mk-brand-design-tips-from-linear-founder-karri-saarinen)
- Arc (The Browser Company) treats release notes as marketing: short stories about the decision behind features, notes initialed by staff, with images or video explainers — [Ducalis: Arc release notes review](https://hi.ducalis.io/changelog/examples/arc-broweser-release-notes-in-app)
- Raycast's brand decoration is full-fidelity in-product UI (command-palette mockups), and it keeps a "Craft" blog category — [awesome-design-md: Raycast DESIGN.md](https://github.com/VoltAgent/awesome-design-md/blob/main/design-md/raycast/DESIGN.md); [Raycast blog: Craft](https://www.raycast.com/blog/category/craft)
- Things (Cultured Code) is a small, intentionally lean Stuttgart team focused on one product, competing on design excellence over feature breadth — [Things (software), Wikipedia](https://en.wikipedia.org/wiki/Things_(software)); [culturedcode.com](https://www.culturedcode.com/)
- Brilliant's 2023 refresh with Koto aimed for a brand "across all touchpoints that would read as modern, cohesive, and engaging": app icon, wordmark, PIX illustration style and mascot as one system (via search summary) — [Peter Cho, Medium](https://pcho.medium.com/a-brilliant-brand-refresh-4af021c11486)
- Math Academy, a small team, punches above its weight by publishing its pedagogy openly: *The Math Academy Way* (free book-length PDF), plus technical writing on its knowledge-graph engine and FIRe spaced repetition — [The Math Academy Way](https://www.justinmath.com/files/the-math-academy-way.pdf); [Justin Skycak: The tip of Math Academy's technical iceberg](https://www.justinmath.com/the-tip-of-math-academys-technical-iceberg/)
- Brilliant's onboarding includes an efficacy claim screen ("Interactive learning has been shown to be 6x more effective than watching lecture videos"): proof used inside the product, not only on the marketing site — [Mobbin](https://mobbin.com/screens/fcd19786-c1c1-4c6f-8121-b7e58ff9418c)

### Inferences (a Blueberry brand-system checklist)
- **Tokens**: define Tailwind v4 `@theme` CSS variables. One core color ("Blueberry" indigo-blue), plus 5-6 named secondaries with chemistry-flavored names (e.g. "Benzene" yellow, "Chlorine" green, "Bromine" red-brown, "Nitrogen" blue, "Carbon" charcoal), echoing Duolingo's animal-named palette. Consider generating light and dark themes from base + accent + contrast in OKLCH (Tailwind v4 is OKLCH-native), mirroring Linear's 3-input approach. Semantic tokens: `--success`, `--danger`, `--xp`, `--streak`, each used for exactly one meaning.
- **Type rules**: one rounded, characterful display face for headlines, celebration numbers and the streak count, plus one neutral text face. Write the pairing rule down ("never mix in one sentence", as Duolingo does).
- **Voice guide (1 page)**: 3-4 adjectives (e.g. "curious, precise, warm, a little nerdy"), do/don't lists, and example strings for correct, incorrect, streak-at-risk, and error states. Chemistry puns allowed only in celebratory contexts. Error and explanation copy stays precise.
- **Illustration style**: pick one constructible style a solo dev can repeat (Brilliant's PIX = straight line segments). For Blueberry, skeletal-formula line art (bond-line drawing) is on-topic and easy to generate consistently in SVG.
- **Marketing site structure**: hero (one-sentence promise + an interactive mechanism demo, i.e. "value before signup" on the site too) → proof (efficacy claim or testimonials, Brilliant's 6x screen as model) → how it works (3 steps: diagnose, practice, review) → curriculum map → pricing + FAQ → about/founder note (Math Academy-style pedagogy essay) → changelog (Arc/Linear-style short dated entries with a GIF each) → legal/privacy → status page (a free hosted one is fine).
- **Consistency surfaces**: favicon and app icon derived from the mascot silhouette. Transactional and notification emails in the same voice, with the mascot's 1-line quip and the same button style. Duolingo-style notification timing (reminder ~23.5h after last session, "streak saver" late evening) should be copy-tested.
- **One hero narrative**: e.g. "Orgo is a language of arrows — Blueberry teaches you to read it", repeated in the hero, onboarding claim screen, App Store/OG image, and email footer.

### Gaps
- Could not read Linear's post in full (blocked), so its typography specifics (e.g. Inter Display) are unconfirmed.
- No quantitative evidence found that brand cohesion improves conversion for small ed-tech. The claims here are qualitative.
- Speak, Headway, Blinkist and Notion brand systems were not researched.

---

## 7. Motion/animation libraries and galleries

### Takeaway
Rive (interactive state machines, data binding, one file across platforms) is now the tool of choice for character and celebration animation at Duolingo, Brilliant and Spotify Wrapped 2025. motion (framer-motion) covers UI micro-interactions with built-in reduced-motion support. GSAP suits timeline-heavy recap stories. Lottie remains fine for non-interactive one-shots. Galleries such as 60fps.design and Mobbin give frame-level references.

### Cited Findings
- Rive State Machine: a visual graph connecting animation states, letting engineers programmatically control which states play and how they transition and blend. Duolingo uses it for characters, Brilliant for streaks and path colors — [DEV: Rive mascot state machines](https://dev.to/uianimation/engineering-interactive-mascots-with-rives-state-machine-and-runtime-architecture-4e2h); [Rive blog: Brilliant](https://rive.app/blog/how-brilliant-org-motivates-learners-with-rive-animations)
- Spotify Wrapped 2025 was built in Rive, with motion prototyped on dummy data and then driven by real user data — [Rive blog: Spotify Wrapped 2025](https://rive.app/blog/spotify-used-rive-for-spotify-wrapped-2025)
- motion: `MotionConfig reducedMotion="user"` and `useReducedMotion` — [motion.dev accessibility](https://motion.dev/docs/react-accessibility)
- canvas-confetti: a performant canvas confetti library with a reduced-motion option — [GitHub: catdad/canvas-confetti](https://github.com/catdad/canvas-confetti)
- Galleries with specific Duolingo references: 60fps.design (frame-level recordings of lesson-complete and streak animations) — [60fps.design Duolingo](https://60fps.design/apps/duolingo). Mobbin (full flows: Duolingo goal/commit flow, Brilliant onboarding) — [Mobbin Duolingo flow](https://mobbin.com/flows/25145623-749c-4a2c-bd32-ddea59ee235d); [Mobbin Brilliant flow](https://mobbin.com/flows/20ad012b-2683-4c0c-beb8-8ff62c6f509e)

### Inferences
- Suggested split for Blueberry: **motion** for all UI state (feedback sheet, buttons, progress bars, stat-card count-ups, layout transitions). **Rive** (`@rive-app/react-canvas`) for the mascot and streak or milestone hero animations, where a state machine with inputs replaces dozens of separate files. **GSAP** only for scroll-driven marketing-site sections and a Wrapped-style recap timeline. **three.js** for 3D molecule viewers, not for celebrations. **canvas-confetti** for perfect-lesson bursts. Avoid shipping both Lottie and Rive; pick Rive if a mascot is planned.
- A Rive runtime file is one asset shared by web and any future mobile app, the same parity argument Spotify made for Wrapped.

### Gaps
- Bundle-size and performance comparisons (Rive WASM runtime vs. Lottie vs. motion) were not researched.
- The Rive community and LottieFiles galleries were not browsed for specific files (budget).
