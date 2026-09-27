# Duolingo: retention mechanics and product-design cohesion (teardown for Blueberry)

> **Method note (read first):** In this session the egress proxy blocked direct page fetches (WebFetch) for blog.duolingo.com, lennysnewsletter.com, investors.duolingo.com, sec.gov and most other hosts. Every finding below comes from search-engine result extracts of the cited pages, not from full-page reads. Primary sources (Duolingo blog, research.duolingo.com, design.duolingo.com, shareholder letters) are marked **[primary]**. Third-party aggregators are marked **[secondary]**, and numbers from them should be treated as lower confidence. A report writer should spot-check the load-bearing numbers against the primary URLs before publishing.

## 1. Core loop: lesson length, session structure, the path (2022 redesign), what the user sees on open

### Takeaway
The home screen is one linear, guided "path" (launched to all learners on November 1, 2022). It replaced the branching skill tree, so the app always has a single obvious next action. Lessons are short and interleave concepts, and spaced-repetition review and Stories are built into the path instead of sitting in separate tabs. Duolingo says the path improved learning outcomes, not only engagement.

### Cited Findings
- The new home screen launched **November 1, 2022** for all learners. It is a path you follow step by step. **One level (each circle on the path) equals one crown level of a skill on the old home screen (the tree).** **[primary]** — [Duolingo Blog: The Science Behind Duolingo's Home Screen Redesign](https://blog.duolingo.com/new-duolingo-home-screen-design/)
- Lessons on the path are ordered to mix concepts (interleaving). Duolingo had previously recommended this and now made it the default. **[primary]** — [Duolingo Blog: home screen redesign](https://blog.duolingo.com/new-duolingo-home-screen-design/)
- **Practice sessions are built into the path** so learners regularly revisit material. The lesson order is grounded in spaced repetition, with gradually expanding intervals between practice. **[primary]** — [Duolingo Blog: home screen redesign](https://blog.duolingo.com/new-duolingo-home-screen-design/)
- In courses with Stories, **Stories were moved into the path** instead of living in a separate tab. **[primary]** — [Duolingo Blog: home screen redesign](https://blog.duolingo.com/new-duolingo-home-screen-design/)
- Duolingo tested the new path against the old design. Learners on the path had **improved learning outcomes, including higher reading and listening scores**. The extract gave no effect sizes. **[primary]** — [Duolingo Blog: home screen redesign](https://blog.duolingo.com/new-duolingo-home-screen-design/)
- Duolingo later added "mini-units" to make intermediate learning more engaging, which shows the path's content is still being re-chunked. **[primary, title only]** — [Duolingo Blog: New mini-units](https://blog.duolingo.com/intermediate-mini-units/)
- The redesign was criticized at launch because it removed learner choice (you can no longer pick skills freely) — [UX Collective: "Down the wrong path: the disaster of the latest Duolingo UI update"](https://uxdesign.cc/down-the-wrong-path-the-disaster-of-the-latest-duolingo-ui-update-a4cdd1e6ea1c); [duoplanet: New Learning Path HONEST Review](https://duoplanet.com/duolingo-new-learning-path-review/) **[secondary / opinion]**
- A later "core tabs" refresh: over the years Duolingo had added tabs (motivation, extra practice, social) that "didn't feel like part of the same family." They built one framework for design elements that scales across tabs, including **tiered header sizes based on each tab's purpose, with titles kept in a consistent position**. Their stated view: "craft is what turns a good product into a delightful one… not just how things look, but how learning feels." **[primary]** — [Duolingo Blog: Elevating craft: How we refreshed our core tabs](https://blog.duolingo.com/core-tabs-redesign/)
- Separate from the path: to extend a streak a learner **completes just one lesson**, and progress toward the daily XP goal is shown separately (see section 2) — [Duolingo Blog: Improving the streak](https://blog.duolingo.com/improving-the-streak/) **[primary]**

### Inferences
- The path's main retention job is to **remove decision cost on open**. There is one glowing "next" node, so the user can go from app open to lesson in one tap. For Blueberry: a single "next lesson" node on the home screen, with review auto-inserted, beats a topic menu (for example, a grid of "Alkenes / SN1 / SN2…").
- Duolingo justified the path with *learning* evidence (interleaving plus spacing), not only engagement. That framing transfers well to an academic tool, and Blueberry can honestly claim it if it builds spaced review into the path.
- Building review and stories into the path is also a consolidation move. Features that lived in side tabs got little use until they sat on the main line.

### Gaps
- I could not verify from a primary source the exact lesson length (commonly cited as ~3–5 minutes and ~10–15 challenges), the number of levels per unit, or the section/unit hierarchy numbers. The blog pages could not be fetched.
- I found no published retention/DAU delta for the path launch itself. Only the qualitative learning-outcome claim above.
- I could not confirm the current (2025–2026) layout of the open screen: the top bar with streak, gems, and hearts/energy, plus the course flag. This is widely observed but unsourced here.

---

## 2. Retention mechanics with evidence

### Takeaway
The streak is the single most important retention mechanic. Duolingo publishes repeated, small but compounding A/B wins on it: +0.38% DAU from allowing two freezes, and +3.3% D14 retention / +1% DAU from decoupling the streak from the XP goal. The next biggest mechanic historically was the 2018–19 league system (+17% learning time, 3x "highly engaged" learners). Behind all of it sits a growth model that made current-user retention (CURR) the north-star metric. Notifications are optimized by a published bandit algorithm (+0.5% DAU, +2% new-user retention). Social streaks (Friend Streak) are the 2024–2025 growth lever.

### Cited Findings

**Growth model / metric framing (historical, 2018–2022)**
- Jorge Mazal joined as Head of Product in late 2017. By mid-2018, DAU was growing at single-digit rates year over year. A growth model showed that improving **CURR (Current User Retention Rate) would have ~5x the DAU impact of the next-best lever**, so Duolingo formed a Retention Team with CURR as its north star. Over four years **CURR rose 21% relative, daily churn among current users fell >40%, and DAU grew 4.5x** (together with other product and marketing work). **[primary-ish, guest post by ex-CPO]** — [Lenny's Newsletter: How Duolingo reignited user growth (Jorge Mazal)](https://www.lennysnewsletter.com/p/how-duolingo-reignited-user-growth); summary via [Reach Capital](https://www.reachcapital.com/resources/thought-leadership/product-lessons-from-duolingos-former-chief-product-officer-jorge-mazal/)

**Leagues / leaderboards**
- Leaderboards were revamped on the model of Zynga's FarmVille 2 and streamlined for learning. They replaced an ineffective friends-only leaderboard. **Users are matched with others who had similar engagement the prior week.** Result: **overall learning time +17%, and "highly engaged learners" (≥1 hour/day, 5 days/week) tripled.** — [Lenny's Newsletter (Mazal)](https://www.lennysnewsletter.com/p/how-duolingo-reignited-user-growth), numbers as surfaced in search extracts; see also [James Bickerton: Duolingo, Leaderboards, and Why Your Retention Sucks](https://jamesbickerton.substack.com/p/duolingo-leaderboards-and-why-your) **[secondary]**
- Leaderboards were first tested in **2018**. Early versions had **5 leagues**; there are now **10** (Bronze, Silver, Gold, Sapphire, Ruby, Emerald, Amethyst, Pearl, Obsidian, Diamond). The top XP earners are promoted each week and the bottom earners are demoted. Adding tiers made reaching Diamond "an even bigger achievement." **[primary]** — [Duolingo Blog: Leagues & leaderboards](https://blog.duolingo.com/duolingo-leagues-leaderboards/); [Duolingo Help Center](https://www.duolingo.com/help/leaderboards-and-league)
- A third-party claim that leagues drove "+25% lesson completion" — [Deconstructor of Fun Duolingo microsite](https://duolingo.deconstructoroffun.com/mechanics/leagues) **[secondary, unverified; I could not find it in a Duolingo source]**

**Streaks (the core habit mechanic)**
- Learners who reach a **7-day streak are 3.6x more likely to complete their course**. **[primary]** — [Duolingo Blog: The Duolingo Streak Uses Habit Research](https://blog.duolingo.com/how-duolingo-streak-builds-habit/)
- Learners on a 7-day streak are **2.4x more likely to use Duolingo the next day** than learners without a streak. **[primary]** — [Duolingo Blog: Improving the streak](https://blog.duolingo.com/improving-the-streak/); [Streak habit post](https://blog.duolingo.com/how-duolingo-streak-builds-habit/)
- **Decoupling streak from daily XP goal:** a streak is extended by completing **one lesson**, and progress toward the daily goal is shown separately. Result: **+3.3% Day-14 retention, +1% overall daily active learners, and +10.5% in the share of daily learners on a streak, within 20 days.** **[primary]** — [Duolingo Blog: Improving the streak](https://blog.duolingo.com/improving-the-streak/)
- **Streak Freeze:** equipped in advance as "insurance." It fills in a missed day so the streak continues. Allowing learners to **equip up to two Freezes at once increased daily active learners by +0.38% (relative)**. **[primary]** — [Duolingo Blog: streak habit](https://blog.duolingo.com/how-duolingo-streak-builds-habit/)
- "Just over half" of daily learners had a streak of ≥7 days, **up from about a third a year earlier**, attributed to streak changes. **Over 6 million people** were on a 7+ day streak. The post date was not visible in the extract; it is likely around 2022–2023. **[primary]** — [Duolingo Blog: streak habit](https://blog.duolingo.com/how-duolingo-streak-builds-habit/)
- **Streak protection from outages:** the internal "Big Red Button" (BRB) lets Duolingo pause requests, tell learners about the pause, bring requests back gradually, and **repair streaks broken by site issues**. **[primary]** — [Duolingo Blog: How we protect learner streaks from site issues](https://blog.duolingo.com/protecting-streaks-from-site-issues/)
- A secondary claim that Streak Freeze "reduced churn by 21% for at-risk users" — [Orizon blog](https://www.orizon.co/blog/duolingos-gamification-secrets) **[secondary, unsourced; do not rely on it]**. Also unverified: a claim that an 8-word explanation of the streak significantly raised retention, and that testing 2–3 freezes vs 1 raised DAU. These appear in aggregator summaries of Jackson Shuttleworth's (Group PM, Retention) Lenny's Podcast episode — [podcast summary](https://www.getrecall.ai/summary/lennys-podcast/behind-the-product-duolingo-streaks-or-jackson-shuttleworth-group-pm-retention-team) **[secondary]**
- **Scale (shareholder letters):** DAU/MAU rose >4 points YoY to **34.7% in Q4 2024**. **Over 10 million users** had streaks of one year or longer, and **one-third of DAUs had a Friend Streak** (search-extract attribution to the Q4/FY2024 letter). **[primary]** — [Q4/FY2024 shareholder letter](https://investors.duolingo.com/static-files/99006c40-d8cf-41ca-b5b1-c5cb1fa5ba88)
- A search extract attributes "a quarter of Duolingo's users now maintain streaks of one year or longer" to a 2025 letter. **This is likely misphrased (it may be a quarter of DAUs); flag it and verify** — [Q3 FY2025 shareholder letter (SEC)](https://www.sec.gov/Archives/edgar/data/1562088/000162828025049514/q3fy25duolingo9-30x25share.htm)

**Friend Streak (social streaks, launched ~2024)**
- Users can share a streak with **up to five friends** and send **nudges**. Early results were "excellent" because users are accountable to friends as well as themselves. **[primary]** — [Duolingo shareholder letters (Q3 2024)](https://investors.duolingo.com/static-files/a1b3dab2-4153-4e35-83a6-d32ffb38f2bf); [Duolingo Blog: Friend Streak](https://blog.duolingo.com/friend-streak/)
- Learners with **at least one shared streak are 22% more likely to complete their daily lesson**, and the likelihood rises with more friend streaks. **[primary]** — [Duolingo Blog (search extract; likely the Friend Streak / product-lessons posts)](https://blog.duolingo.com/product-lessons-friend-streak/)

**Notifications**
- **"A Sleeping, Recovering Bandit Algorithm for Optimizing Recurring Notifications"** (Kevin Yancey and Burr Settles, KDD 2020). It introduces the **Recovering Difference Softmax** algorithm to choose among notification templates for millions of daily reminders. It addresses **novelty effects** ("recovering arms": new templates boost short-term conversion even when they are not better) and **conditional eligibility** ("sleeping arms": not every template applies to every user) with a **recency penalty** that lowers the probability of resending a template a user saw recently. Result: **+0.5% total DAU and +2% new-user retention over a strong baseline.** Replication data (~200M rows) is public. **[primary]** — [Paper PDF](https://research.duolingo.com/papers/yancey.kdd20.pdf); [ACM DL](https://dl.acm.org/doi/10.1145/3394486.3403351); [Harvard Dataverse](https://dataverse.harvard.edu/dataset.xhtml?persistentId=doi:10.7910/DVN/23ZWVI)
- Guilt-toned copy that critics cite as manipulative: "These reminders don't seem to be working. We'll stop sending them." — [Opinions and Conditions: The Duolingo Owl, Dark Patterns, and Digital Guilt](https://opinionsandconditions.substack.com/p/duolingo-owl-dark-patterns-digital-guilt) **[secondary / opinion]**

**Hearts → Energy (2025)**
- In **April 2025**, Duolingo replaced **Hearts** (lost on each wrong answer) with **Energy**. Energy works like a battery, **starting at 25 units with each question costing 1**, so it drains even on correct answers. Duolingo framed it as positive reinforcement (mistakes are no longer singled out). The free-user reaction was largely negative ("cash grab"; perfect lessons still drain energy; no opt-out). **[secondary, journalism]** — [Class Central: Duolingo Breaks Hearts for Energy](https://www.classcentral.com/report/duolingo-breaks-hearts-for-energy/); [Android Authority](https://www.androidauthority.com/quitting-duolingo-energy-system-3599842/); [UX Collective (Sam Liberty)](https://uxdesign.cc/duolingos-small-ui-switch-that-changes-everything-fae257203633)

**What was removed / rolled back / reprioritized**
- **Lingots** were replaced by **Gems** (at ~20 gems per lingot) to simplify the currency. **Forum discussions, sentence discussions, Clubs, and Events/meetups** were discontinued. **[secondary]** — [Duolingo Wiki: Discontinued features](https://duolingo.fandom.com/wiki/Category:Discontinued_feature); [duolingoguides: Why Duolingo got rid of Lingots](https://duolingoguides.com/why-did-duolingo-get-rid-of-lingots/)
- **2026 strategic reversal:** Duolingo said its DAU-growth deceleration was **partly due to increased focus on monetization in recent years**. For 2026 it deliberately shifted to "prioritize teaching better and user growth," accepting lower short-term financials. Q2 2026 DAU grew **23% YoY**, accelerating from Q1. **[primary]** — [Q2 2026 shareholder letter](https://investors.duolingo.com/static-files/3c8277ee-bc94-4f5d-9b77-0db3e46f88b8); [Q2 2026 press release (SEC)](https://www.sec.gov/Archives/edgar/data/1562088/000162828026053299/q2fy26duolingo6-30x26xpres.htm)
- Earlier scale context: Q3 2024 DAU growth of **54% YoY**. **>50M DAU in Q3 2025** (+36% YoY). 2025: >$1B bookings. **[primary]** — [Q3 2024 letter](https://investors.duolingo.com/static-files/a1b3dab2-4153-4e35-83a6-d32ffb38f2bf); [Q3 FY2025 press release (SEC)](https://www.sec.gov/Archives/edgar/data/1562088/000162828025049514/q3fy25duolingo9-30x25press.htm)
- **Performance counts as retention:** in 2024 the Android team ran **200+ A/B tests on performance** and got "hundreds of thousands" of DAU gains attributable to them. **[primary]** — [Duolingo Blog: Android app performance](https://blog.duolingo.com/android-app-performance/)

### Inferences
- The pattern across published results: **each mechanic moves DAU by well under 1–3%, and the wins compound.** Duolingo's edge is a culture of hundreds of small A/B tests, not one magic feature. A solo developer cannot A/B test at that scale, so Blueberry should copy the *already-validated* designs (one-lesson streak extension, a pre-equipped freeze, an explicit 7-day milestone) and not try to rediscover them.
- The best-evidenced streak wins all **lower the cost of keeping the streak** (one lesson is enough, two freezes, outage repair). None raise the stakes. For a study app, "one short review keeps your streak" is the key rule.
- The Hearts→Energy backlash and the 2026 admission that monetization slowed growth both suggest **friction mechanics tied to payment hurt trust**. A small academic tool should not gate study behind depletable resources.
- Leagues matched on prior-week engagement work at Duolingo's scale. A small user base cannot fill fair 30-person cohorts, so this is low priority for Blueberry (see section 6).

### Gaps
- I could not verify from primary text the details of Streak Society (a 365+ day perk tier), Streak Repair (paid or earned restore after a break), Perfect Streak, or Streak Wager (Double or Nothing). All are widely documented in fan wikis but not sourced here.
- Quests (daily/monthly quests, friend quests) and XP boosts: I found no published result numbers.
- I found no published Duolingo data on the effect of the ~11pm "streak at risk" notification or the iOS home-screen widget (the widget blog post exists: [How we developed our addictive and delightful widget](https://blog.duolingo.com/widget-feature/), but numbers weren't retrievable).
- I found no official data on the effect of the Energy change on DAU/retention.

---

## 3. Onboarding: first-run flow and published results

### Takeaway
Duolingo is the canonical example of **deferred signup / "gradual engagement."** Moving account creation until after the first lesson is repeatedly cited as producing about **+20% next-day retention**. The current flow puts personalization questions (language, reason, level, daily goal) before a first lesson, and signup comes after the user has earned something (a first-day streak).

### Cited Findings
- Moving the sign-up prompt until **after the user completed a first lesson** produced a **~20% jump in next-day retention**. **[secondary; attributed to Duolingo growth work. The original primary citation is not confirmed in this session]** — [First Round Review: The Tenets of A/B Testing from Duolingo's Master Growth Hacker (Gina Gotthilf)](https://review.firstround.com/the-tenets-of-a-b-testing-from-duolingos-master-growth-hacker/); [StriveCloud](https://www.strivecloud.io/blog/gamification-examples-boost-user-retention-duolingo)
- The flow is described as "gradual engagement": registration is postponed until users must register to keep progressing, with periodic prompts to save progress — [Appcues GoodUX: Duolingo's delightful user onboarding](https://goodux.appcues.com/blog/duolingo-user-onboarding) **[secondary]**
- A 2025–2026 teardown counts **~38 onboarding screens**, with account creation at about **screen 13**, after the first lesson and a **1-day streak** — [Tasu.ai library](https://tasu.ai/library/duolingo); [Relaunch teardown](https://relaunch.ai/blog/duolingo-onboarding-teardown-7-b-tests-behind-their-9-conver.html) **[secondary; screen counts vary by platform/test cell]**

### Inferences
- The order is **commit a small goal → prove value (one lesson) → celebrate (streak day 1) → then ask for an account**. For Blueberry, let a student do one reaction-mechanism mini-lesson with no login, show "Day 1," and then offer to save progress.
- The daily goal set during onboarding was later decoupled from the streak (section 2), so the goal sets intensity while the streak only requires one lesson.

### Gaps
- I found no primary Duolingo blog/IR source for the 20% figure or for the placement-test ("I know some already") impact. Treat 20% as widely repeated but secondhand.
- I could not verify the exact current screen order (the reason/"how did you hear," level, daily-goal minute options such as 5/10/15/20, notification-permission priming placement).

---

## 4. Feedback and delight: answer feedback, completion screens, character animation (Rive), haptics, mascot

### Takeaway
Duolingo treats motion and character as retention tools and measures them. New **streak-milestone animations** (Duo "powering up," phoenix-inspired) raised new-user D7 retention by **+1.7%**. The world characters **lip-sync in real time in lessons** using Rive state machines driven by phoneme timings from Duolingo's own speech models, with **20+ mouth shapes per character**. That is far cheaper than video and reactive to input.

### Cited Findings
- **Streak milestone animation:** milestone days (1 week, 1 month, 100 days, 1 year) were treated like **video-game "power-ups."** Duo physically transforms on milestone days, drawing on the **phoenix** image because it is recognized across cultures. **Seeing these animations increased the likelihood a new learner was still active 7 days later by +1.7%.** **[primary]** — [Duolingo Blog: Animating the Duolingo Streak](https://blog.duolingo.com/streak-milestone-design-animation/)
- **Character lip-sync (visemes):** Duolingo generates speech, runs it through **in-house speech recognition/pronunciation models** to get word and phoneme timings, and maps each sound to a **viseme** (a set designed from linguistic features). Each character got **its own set of 20+ mouth shapes** that fits its personality. Body poses and mouths are **separate Rive animation states** combined in a **Rive State Machine** and exported as a single runtime file. At lesson time the app fetches the audio and timings and drives the state machine in sync. This keeps data transfer "much less than sending down a little movie" and lets characters **react to the user in real time**. **[primary]** — [Duolingo Blog: How Duolingo Animates Its World Characters](https://blog.duolingo.com/world-character-visemes/)
- **Video Call with Lily** (Max tier AI conversation): modular animation pieces blended in real time. **8 head × 8 body animations yield more than 64 neutral variations, with the file under 1 MB.** **[secondary, describing a Rive case study]** — [DEV Community: How Duolingo uses Rive](https://dev.to/uianimation/how-duolingo-uses-rive-for-their-character-animation-and-how-you-can-build-a-similar-rive-mascot-5d19)
- Duolingo created a **"creative technologist"** role to bridge designers and developers for interactive animation handoff. **[primary, Rive blog]** — [Rive Blog: Duolingo creates new role bridging designers and devs](https://rive.app/blog/creative-technologists-duolingo-s-solution-to-the-designer-to-developer-handoff)
- Characters were given voices, and the cast exists to aid learning, not only decoration. **[primary, titles/extracts]** — [Giving our characters voices](https://blog.duolingo.com/character-voices/); [Building character](https://blog.duolingo.com/building-character/)
- **Answer feedback:** a correct answer triggers a bright chime (commonly transcribed "ding-dilin") and a positive message such as "Excellent!", and the correct-answer sound has become a meme. Feedback uses clean animation, sound, and **subtle haptics** instead of sensory overload. **[secondary]** — [Medium: The micro-interactions on Duolingo](https://medium.com/@Bundu/little-touches-big-impact-the-micro-interactions-on-duolingo-d8377876f682); [925 Studios: Duolingo UX breakdown](https://www.925studios.co/blog/duolingo-design-breakdown)
- Duo was redrawn/"reshaped" at some point, and there is a post documenting it. **[primary, title only]** — [Duolingo Blog: Reshaping Duo](https://blog.duolingo.com/reshaping-duo/)

### Inferences
- The +1.7% D7 lift shows **celebration at milestones is a measurable retention lever, not polish.** For Blueberry, invest animation budget in a few moments (streak day 7/30/100, lesson complete, first perfect mechanism) and not everywhere.
- The Rive state-machine approach (small vector runtime driven by inputs) fits a solo developer. One mascot with 3–5 states (idle, cheer, think, sad, celebrate) driven by app events gives most of the effect.
- Answer feedback follows a consistent grammar: a **color-coded bottom sheet** (green/correct, red/incorrect, with the correct answer shown), a distinct sound per outcome, and a single "Continue" button. This is widely observed. See Gaps for the missing primary source.

### Gaps
- I found no primary Duolingo source documenting the bottom-sheet feedback spec, exact sound design process, haptic patterns, or named lesson-complete animations (for example, stat cards for XP / accuracy / time). These are observable in the app but unsourced here. **Mobbin** (connector available) could supply screenshots.
- There is no published A/B result for sounds or haptics specifically.

---

## 5. Brand and design-system cohesion (illustration, color, type, voice, web and app as one product)

### Takeaway
Cohesion comes from **deriving everything from Duo**. The green palette comes from the owl, the custom typeface (Feather Bold) echoes the owl's shapes, the illustration style uses simple geometric building blocks, and a documented voice ("expressive, playful, embracing, worldly") applies to UI copy, notifications, and marketing, with Duo as "more of it." A public design site (design.duolingo.com) codifies color, identity, and writing.

### Cited Findings
- **Art style history:** early designs were static, hard-edged shapes on light gray. In **2018**, work on **Duolingo ABC/Kids** led the art team to brighter, rounder, friendlier illustrations. That style moved into the main app, and a **2018 UI redesign** introduced vibrant colors and **rounded buttons on a white background**. Characters are **built from simple geometric building blocks**. A defined minimal, playful style lets the team meet large illustration and animation demand without losing quality. **[primary]** — [Duolingo Blog: Shape language: Duolingo's art style](https://blog.duolingo.com/shape-language-duolingos-art-style/)
- **Color:** the brand's defining hue is **Feather Green #58CC02**, with **Mask Green #89E219** (background for Duo), **Eel #4B4B4B** (text) and **Snow (white)** as the primary background. The secondary palette is named after animals: **Macaw** (blue), **Cardinal** (red), **Bee** (yellow), **Fox** (orange), **Beetle** (purple), **Humpback** (blue). **[primary via design.duolingo.com; hex values as reported by secondary brand atlases]** — [design.duolingo.com: Color](https://design.duolingo.com/identity/color); [Canny Creative Brand Atlas](https://www.canny-creative.com/atlas/brand/duolingo/)
- **Typography:** **Feather Bold** is bespoke. Its angled, rounded letterforms echo Duo, down to a "g" whose flick mimics Duo's eyebrows. It is used **lowercase only** for headlines and impact moments. **DIN Next Rounded** is used in sentence case for subheads and body copy and is never mixed with Feather Bold in one sentence. **[secondary, summarizing the guidelines]** — [Canny Creative Brand Atlas](https://www.canny-creative.com/atlas/brand/duolingo/)
- **Shape tokens** (as reverse-engineered): ~16–20px card radii, ~12px button radii, fully rounded pills for chips and progress bars. **[secondary, community design-system extraction]** — [Refero Styles](https://styles.refero.design/style/7088d695-362b-4e09-b325-fa8136d4f350); [shadcn.io Duolingo design system](https://www.shadcn.io/design/duolingo)
- **Voice:** four qualities: **Expressive** (simple words for big feelings), **Playful**, **Embracing** ("biggest cheerleader for learners"), **Worldly**. The voice stays constant while the tone adapts to the reader's state of mind. Always "clear, human, and relaxed." **Duo's voice is the same, "he's just more of it."** **[primary]** — [design.duolingo.com: Voice](https://design.duolingo.com/writing/voice); [Tone](https://design.duolingo.com/writing/tone); [Duo](https://design.duolingo.com/writing/duo)
- An internal design interview series ("Duologues") and a design hub publish the team's thinking openly, which extends the brand into recruiting and credibility. **[primary, titles]** — [Duologues](https://blog.duolingo.com/duologues-design-conversations/); [Design hub](https://blog.duolingo.com/hub/design/)
- Core-tabs refresh: shared header framework and consistent title placement so tabs feel "like part of the same family" (see section 1). **[primary]** — [Elevating craft](https://blog.duolingo.com/core-tabs-redesign/)

### Inferences
- The cohesion recipe for Blueberry: **(1) one mascot or motif as the source of palette and shapes** (a blueberry: round and deep blue, which suggests a rounded-geometry system); **(2) one display face for "impact moments" plus one body face**, never mixed in a sentence; **(3) a named color palette** so the team (even a team of one) refers to tokens by name; **(4) a written voice guide** so notifications, empty states and the marketing site sound the same.
- Web and app feel like one product because the same illustrations, green buttons with a darker bottom "lip" (3D press effect), Feather Bold headlines and Duo appear on duolingo.com's marketing pages and in the app. The button-lip detail is observed, not sourced.

### Gaps
- I could not fetch design.duolingo.com directly, so I could not verify the full token list, the official hex values, or illustration rules (for example, "no outlines," "three basic shapes").
- I found no source describing the marketing-site structure: the hero "The free, fun, and effective way to learn a language!" with "Get started" / "I already have an account," a language carousel, and feature sections (ABC, Math, Music, English Test). This is observed from memory and unverified.
- Duolingo's multi-subject expansion (Math, Music, Chess) under one visual system is relevant but unsourced in this session.

---

## 6. Criticisms, dark patterns, and what doesn't transfer to a small academic tool

### Takeaway
The main criticisms are **guilt-based notifications and mascot pressure, streak anxiety/"streak creep," gamification over learning (grinding XP, choosing easy lessons for leagues), monetization friction (Energy, 2025)**, and the **2025 "AI-first" backlash**, when users deleted the app and gave up multi-year streaks in protest. Duolingo itself acknowledged in 2026 that monetization focus had slowed user growth.

### Cited Findings
- Critics call streaks and notifications guilt-driven, citing "These reminders don't seem to be working. We'll stop sending them" and escalating attention-seeking notifications and promos — [Opinions and Conditions: Dark Patterns and Digital Guilt](https://opinionsandconditions.substack.com/p/duolingo-owl-dark-patterns-digital-guilt); [Livin' in Weekly: How Duolingo Became Evil](https://livininweekly.substack.com/p/how-duolingo-became-evil-and-why) **[opinion]**
- "Streak creep": gamified engagement mechanics can backfire when the metric replaces the goal — [The Decision Lab: Streak Creep](https://thedecisionlab.com/insights/consumer-insights/streak-creep-the-perils-of-too-much-gamification) **[secondary analysis]**
- Users report declining quality and gamification taking priority over language learning (2025) — [BigGo Finance](https://finance.biggo.com/news/202509301943_Duolingo_Quality_Concerns) **[secondary journalism]**
- **AI-first memo (April 28, 2025):** CEO Luis von Ahn said Duolingo would become "AI-first" and phase out contractors for work AI can do. Users posted videos deleting the app and giving up multi-year streaks, and Duolingo lost hundreds of thousands of TikTok followers within weeks — [Yahoo Finance](https://finance.yahoo.com/news/duolingo-went-ai-first-then-070000682.html); [Ban the Bots explainer](https://www.banthebots.org/explainers/duolingo-ai-backlash) **[secondary journalism]**
- Energy (2025) was seen as a paywall-driven "cash grab" that drains even on perfect lessons — [Class Central](https://www.classcentral.com/report/duolingo-breaks-hearts-for-energy/); [Android Authority](https://www.androidauthority.com/quitting-duolingo-energy-system-3599842/) **[secondary]**
- The 2022 path removed learner choice and was criticized as a "disaster" by some UX writers — [UX Collective](https://uxdesign.cc/down-the-wrong-path-the-disaster-of-the-latest-duolingo-ui-update-a4cdd1e6ea1c) **[opinion]**
- Removing forums and sentence discussions took away peer explanation, a learning resource — [Duolingo Wiki: Discontinued features](https://duolingo.fandom.com/wiki/Category:Discontinued_feature) **[secondary]**
- Duolingo's own admission: its DAU-growth deceleration was partly due to monetization focus, and 2026 priorities shifted to "teaching better and user growth" — [Q2 2026 shareholder letter](https://investors.duolingo.com/static-files/3c8277ee-bc94-4f5d-9b77-0db3e46f88b8) **[primary]**

### Inferences (what transfers vs. what doesn't, for "Blueberry")
- **Transfers well (low cost, evidence-backed):** a single "next" node on the home screen; ~one-lesson streak extension with 1–2 pre-equipped freezes and outage/grace repair; a 7-day milestone celebration; deferred signup after the first lesson; spaced review built into the path; one mascot with a few Rive states; a written voice guide; a named color palette and a two-typeface rule.
- **Transfers poorly:**
  - **Leagues** need large, activity-matched cohorts. With hundreds of users, weekly 30-person brackets will be empty or unfair. A study-group or friend streak (validated: +22% daily lesson completion) scales down better.
  - **Bandit-optimized notifications** need millions of sends. Use a few well-written, time-of-day-appropriate reminders and **avoid guilt copy**.
  - **Hearts/Energy** gate learning to drive subscriptions. Punishing wrong answers in orgo (where mistakes are how students learn mechanisms) is directly counter to the pedagogy.
  - **XP grinding and leagues** reward easy repetition. For a study tool, reward *accuracy on spaced review* or *mastery*, not raw volume.
- **Academic context:** students study around exams and have real breaks (holidays, exam weeks). A strict daily streak may conflict with how they study. Consider a weekly goal or a generous freeze, which is consistent with Duolingo's own finding that lowering streak-keeping cost raised retention. This is an inference and was not tested by Duolingo in an academic setting.

### Gaps
- I found no peer-reviewed or Duolingo-published evidence isolating the *learning* effect (vs. engagement effect) of streaks, leagues, or XP.
- I found no published Duolingo data on notification opt-out/uninstall rates tied to guilt messaging.
- I did not find credible research on Duolingo-style gamification specifically in STEM or organic-chemistry learning.
