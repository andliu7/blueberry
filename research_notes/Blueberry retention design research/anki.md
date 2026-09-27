# Anki and its competitors: why spaced repetition apps retain serious students, and what a polished layer adds

Research date: 2026-09-27. Note: docs.ankiweb.net, changes.ankiweb.net, pmc.ncbi.nlm.nih.gov, quizlet.com and controlaltbackspace.org were blocked by the network proxy in this session. Anki manual content was read from the manual's GitHub source (ankitects/anki-manual), and release notes from GitHub releases. Where a claim comes only from search snippets or third-party blogs, that is noted.

## 1. Structure: the data model, the due queue, the rating buttons, and FSRS vs SM-2

### Takeaway
Anki's core loop is simple: every day there is a finite queue of cards that are "due", you grade each one (Again/Hard/Good/Easy), and the scheduler sets the next interval. The big 2023-2025 change was FSRS, a machine-learned memory model. It was built into Anki 23.10 (late 2023), got substantially updated along with load balancing, Easy Days and a workload simulator in 24.11 (Nov 26, 2024), and moved to FSRS-6 in 25.07 (July 2025). Its main claim is 20-30% fewer reviews for the same retention. The version and benchmark facts are solid. The "20-30%" figure is widely repeated but I could only confirm it through secondary sources.

### Cited Findings
**SM-2 (the legacy scheduler)**
- The Anki manual lists SM-2 defaults: starting ease 250%, with ease changing by -20% on Again, -15% on Hard and +15% on Easy. These settings are hidden when FSRS is turned on. — [Anki manual source, deck-options.md](https://raw.githubusercontent.com/ankitects/anki-manual/main/src/deck-options.md)
- Under SM-2, if you only ever press Again and Good, ease can only go down (Again lowers it, Good does not raise it), so it sinks to the 130% floor. The "Straight Rewards" add-on was built to raise ease gently after repeated Good answers. This is the mechanism behind "ease hell". — [search snippet via AnkiHabitica/add-on docs, GitHub](https://github.com/NameLessGO/AnkiHabitica) (secondary; the add-on's own page was not fetched)

**FSRS timeline**
- **Anki 23.10:** "Support for FSRS (which improves upon the scheduling provided by SM-2) is now integrated into Anki. You can compute the model weights directly inside Anki, and no longer need to use custom scheduling." The integration was done by L-M-Sherlock (Jarrett Ye) with dae and asukaminato0721. — [Anki 23.10 changes (search snippet of changes.ankiweb.net)](https://changes.ankiweb.net/changes/23.10.html)
- **Anki 24.11, released Nov 26, 2024:** "FSRS has received significant changes in this release, and should be even more efficient." (This is FSRS-5.) The same release added:
  - an FSRS simulator and forgetting-curve visualization;
  - load balancing: "Within your fuzz range, Anki will now try to pick days that have fewer reviews waiting";
  - Easy Days, which lets you lighten or skip reviews on chosen weekdays;
  - "true retention stats" and "estimated total knowledge by note, and daily load";
  - sorting decks by descending retrievability;
  - AnkiHub sign-in integration.
  — [GitHub release 24.11](https://github.com/ankitects/anki/releases/tag/24.11)
- **Anki 25.07 (July 2025):** FSRS-6 became available. It adds a 21st parameter (w20) that personalizes the shape of the forgetting curve. — [Expertium's technical explanation of FSRS](https://expertium.github.io/Algorithm.html); [Anki 25.07.5 release](https://github.com/ankitects/anki/releases/tag/25.07.5) (both surfaced via search snippets)

**What FSRS does and how it is configured (Anki manual)**
- The manual describes FSRS as helping users "remember more material in the same amount of time". — [Anki manual source](https://raw.githubusercontent.com/ankitects/anki-manual/main/src/deck-options.md)
- Desired retention defaults to 90%, described as "a good balance of retention and workload". The manual warns that "above 97% the workload can be overwhelming". — same source
- The optimizer "uses machine learning to learn your memory patterns". The manual advises reoptimizing roughly monthly. — same source
- A "Health Check" flags when FSRS is doing badly, for example from too little review history or misuse of the Hard button. — same source

**Benchmark evidence**
- The open-spaced-repetition srs-benchmark uses about 727M reviews from 10,000 Anki collections (349.9M reviews used for evaluation once same-day reviews are excluded). Results:

  | Model | Log loss | RMSE(bins) | AUC |
  |---|---|---|---|
  | FSRS-6 | 0.3460 | 0.0653 | 0.7034 |
  | FSRS-5 | 0.3561 | 0.0742 | 0.7010 |
  | FSRS-4.5 | 0.3625 | 0.0764 | 0.6891 |

  An "FSRS-7 recency" variant scores log loss 0.3370, and neural models (GRU, LSTM, RWKV) do better still. The README I fetched does **not** include an SM-2 row. — [srs-benchmark README](https://github.com/open-spaced-repetition/srs-benchmark)

**The "20-30% fewer reviews" claim**
- Many blogs repeat that FSRS needs "20-30% fewer reviews" than SM-2 for the same retention. — [StudyCardsAI](https://studycardsai.com/blog/anki-fsrs-algorithm), [MedAnkiGen](https://medankigen.com/blog/fsrs-anki), [Flica](https://flica.app/article/fsrs-vs-sm2)
  - These are all secondary and commercial sources. The fsrs4anki README I fetched did not contain the figure.
  - One snippet says the model was trained on "700 million reviews from 20,000 users". That conflicts with the benchmark's 10,000 collections, which may just reflect different dataset versions.

**Other apps adopting FSRS**
- RemNote uses FSRS as an option. By default a card becomes due when RemNote estimates a 10% chance you have forgotten it, i.e. a 90% retention target. — [RemNote Help: FSRS](https://help.remnote.com/en/articles/9124137-the-fsrs-spaced-repetition-algorithm); [RemNote spaced repetition page](https://www.remnote.com/feature/spaced-repetition)

### Inferences
- **Data model (background knowledge, not re-verified this session):**
  - A *note* is a set of fields, and a *note type* has templates that generate one or more *cards* from it. Cloze notes generate one card per cloze deletion.
  - *Decks* hold cards, and *presets* hold the scheduling settings.
  - Separating notes from cards lets one piece of content, such as a reaction, produce several prompts in different directions. For Blueberry that suits reactant→product, product→reagents and name→mechanism cards.
- **The four buttons are meaningful because FSRS uses them as training labels.** The manual's Health Check specifically calls out Hard-button misuse. If Blueberry uses self-rating, the button meanings need to be stable and explained, for example "Hard = recalled, but with effort", not "Hard = wrong".
- **The 24.11 features answer long-standing complaints about pile-ups and uneven workload with scheduler-level fixes** (load balancing, Easy Days, simulator). That is a signal that workload smoothing is now expected in a serious SRS.
- **FSRS also removes the ease-hell problem at its root.** There is no ease factor, and difficulty in FSRS can recover.

### Gaps
- I could not fetch the official changelog pages or confirm Anki's own wording for the "20-30%" claim. The benchmark README I saw had no SM-2 row. Older benchmark versions reported FSRS beating SM-2 for a very large majority of users, but I could not confirm the current figure.
- **Review forecast and heatmap:**
  - Anki's Statistics screen has a "Future Due" forecast graph.
  - The popular "Review Heatmap" add-on (Glutanimate) shows a GitHub-style calendar with streaks.
  - Newer Anki versions show a built-in calendar/heatmap in stats.

  All three come from background knowledge and were not verified this session.
- **AnkiDroid and AnkiMobile:** my understanding is that both follow the desktop FSRS integration through the shared Rust backend, and that AnkiMobile is a paid iOS app (about $24.99) while desktop, AnkiDroid and AnkiWeb are free. I did not verify this.

## 2. Why Anki sticks: the due count as an obligation, med-school culture, shared decks, add-ons, and the evidence on outcomes

### Takeaway
Anki's stickiness comes from three things:
- **A daily obligation mechanic.** The due count feels like a debt that grows if you skip a day.
- **A med-school ecosystem.** The AnKing Step Deck and the AnkiHub subscription turn "which cards should I make" into "subscribe to the canonical deck".
- **A real learning-science basis.** Retrieval practice and spacing are among the best-supported study techniques.

The Anki-specific outcome evidence is observational and modest: correlations with Step 1 scores, not causal proof.

### Cited Findings
**Learning science (strong, experimental evidence)**
- Dunlosky et al. (2013, *Psychological Science in the Public Interest*) reviewed 10 study techniques. Only two were rated "high utility": **practice testing** and **distributed practice**, because they help learners of different ages and abilities across many tasks, including in real classrooms. — [APS press release](https://www.psychologicalscience.org/news/releases/which-study-strategies-make-the-grade.html); [SAGE abstract](https://journals.sagepub.com/doi/abs/10.1177/1529100612453266)
- Roediger & Karpicke (2006): after a 5-minute delay, repeated studying beat testing. On delayed tests (2 days, 1 week), prior testing produced much better retention. Forgetting over the delay was:
  - 56% in the repeated-study condition,
  - 26% in the test/re-presentation condition,
  - 13% in the repeated-test condition.

  (Forgetting figures are as summarized in search snippets from the Roediger & Karpicke PDF.) — [Roediger & Karpicke 2006 PDF](http://psychnet.wustl.edu/memory/wp-content/uploads/2018/04/Roediger-Karpicke-2006_PPS.pdf); [SAGE](https://journals.sagepub.com/doi/10.1111/j.1467-9280.2006.01693.x)
  - The design lesson: cramming feels better in the short term, while retrieval pays off later. This helps explain why SRS feels hard but works.
- Cepeda et al. (2008): the best gap between study sessions scales with how long you need to remember. It is about 20-40% of a 1-week test delay, falling to about 5-10% of a 1-year delay. — [Cepeda et al. 2008, Psych Science](https://journals.sagepub.com/doi/10.1111/j.1467-9280.2008.02209.x); [ERIC full text](https://files.eric.ed.gov/fulltext/ED505660.pdf)

**Anki-specific outcomes in medical education (observational)**
- Deng et al. (2015, *Perspectives on Medical Education*) surveyed 72 students. After controlling for academic and psychological factors, unique Anki flashcards seen independently predicted Step 1 score: about +1 point per 1,700 cards. — [Deng et al., Perspect Med Educ](https://pmejournal.org/articles/10.1007/S40037-015-0220-X)
- Wothe et al. (May 2023, *J Med Educ Curric Dev*) had 165 respondents, 92 (56%) of them daily Anki users. Daily use correlated with:
  - higher Step 1 score (P = .039), but not Step 2;
  - better sleep quality (P = .01), with no difference in other wellness measures.

  The authors concluded "a variety of study methods can be used to achieve similar medical school outcomes". — [Wothe et al. 2023](https://dx.doi.org/10.1177/23821205231173289)
- A systematic review, "Anki Use and Academic Performance in Medical Education", exists on PMC, and a 2025 *Medical Science Educator* paper on first-years ("Wellness and Work: Anki, Study Habits, and Exam Outcomes") also appeared. I could not read their contents because PMC was blocked. — [PMC systematic review](https://pmc.ncbi.nlm.nih.gov/articles/PMC13197492/); [Med Sci Educ 2025](https://link.springer.com/article/10.1007/s40670-025-02549-8)

**The AnKing / AnkiHub ecosystem**
- The AnKing Step Deck is marketed as covering USMLE Step 1/2/3, "updated daily", and "trusted by over 100,000 medical students" (vendor claim). — [AnkiHub Step Deck](https://www.ankihub.net/step-deck); [The AnKing](https://www.theanking.com/med-student)
- AnkiHub syncs collaborative deck updates to subscribers in real time. Reported tiers are free, Core (about $6/mo), Premium (about $10/mo, with AI features) and lifetime, plus scholarships (third-party summary). — [AnkiHub](https://www.ankihub.net/); [StudyCardsAI AnkiHub guide](https://studycardsai.com/blog/ankihub-guide)
- AnKing marketing says "70% of medical students are using Anki". This is a vendor claim and I found no independent source for it. — [The AnKing](https://www.theanking.com/med-student)
- Anki 24.11 added AnkiHub sign-in inside Anki itself, which shows how central the med-school ecosystem has become. — [GitHub release 24.11](https://github.com/ankitects/anki/releases/tag/24.11)

**The backlog as a motivational trap (practitioner advice)**
- Advice circulated from Control-Alt-Backspace (Soren Bjornstad), via search snippet:
  - "if you miss a day it's absolutely critical that you catch up the following day".
  - Two missed days produce "a real backlog that weighs on your mind and makes you even less likely to start catching up".
  - Recommended fix: set the daily review limit to a number you can stomach and grind it down over days.

  — [Control-Alt-Backspace: Catching Up](https://controlaltbackspace.org/catch-up/) (page blocked, snippet only; this is anecdote and expert opinion)

### Inferences
- The due count works as both commitment device and guilt device. The same mechanic that makes Anki sticky for highly motivated med students (daily streaks, fear of the pile) drives drop-off for everyone else.
- **Med-school stickiness is largely social and content-driven, not UI-driven.** A canonical, community-maintained deck matched to a high-stakes exam removes the most expensive step, making cards, and creates peer norms ("unsuspend the cards for today's lecture").
  - For Blueberry, the analogue is curated organic chemistry decks mapped to common textbook chapters and exams such as the ACS final or MCAT/DAT organic chemistry.
- The outcome evidence supports telling users that "retrieval + spacing works" (experimental literature). It does not support claiming "our app raises your grade by X". The Anki-specific studies are small, self-selected and correlational.

### Gaps
- No independent, recent data on what share of med students use Anki (only the vendor's 70%).
- Could not read the full systematic review for pooled effect sizes.
- No quantitative data found on Anki's day-1/7/30 retention or churn. Claims like "most people who download Anki quit within the first week" appear only in competitor marketing ([memoryOS](https://memoryos.com/article/best-anki-alternatives-in-2026-apps-that-beat-anki-for-most-people)) and are unsourced.

## 3. Where Anki's UX fails: learning curve, onboarding, ease hell, pile-ups, and how people cope

### Takeaway
Anki's failures are consistent across sources:
- an intimidating, dated interface;
- no built-in onboarding, so users rely on YouTube and Reddit;
- jargon-heavy settings;
- under SM-2, "ease hell" (intervals stuck short because ease only decreases);
- backlogs after missed days that snowball into quitting.

Users cope by capping reviews, turning off new cards, using add-ons, and now FSRS, load balancing and Easy Days.

### Cited Findings
- Reviews and alternative-app roundups describe the Anki UI as looking "old and functional instead of helpful", "designed by engineers for engineers". They say onboarding "depends heavily on community tutorials rather than built-in guidance", and that beginners get "decks," "cards," "intervals," and "scheduling" thrown at them. — [G2 Anki reviews](https://www.g2.com/products/anki/reviews); [Nibble review](https://nibble-app.com/blog/anki-review); [memoryOS](https://memoryos.com/article/best-anki-alternatives-in-2026-apps-that-beat-anki-for-most-people)
  - Anecdote and opinion. Several of these are competitor blogs with an incentive to criticize.
- Brainscape's own article frames Anki's customization and plugin setup as the main barrier. This is a competitor-authored source. — [Brainscape Academy: Does Anki work?](https://www.brainscape.com/academy/does-anki-work/)
- Ease hell under SM-2: ease falls on Again (-20%) and Hard (-15%), rises only on Easy (+15%), and Good leaves it unchanged. Users who never press Easy see ease slide toward the 130% minimum. — [Anki manual source](https://raw.githubusercontent.com/ankitects/anki-manual/main/src/deck-options.md); [AnkiHabitica / Straight Rewards snippet](https://github.com/NameLessGO/AnkiHabitica)
- Coping with backlogs:
  - Cap daily reviews and pause new cards until caught up. — [Control-Alt-Backspace](https://controlaltbackspace.org/catch-up/) (snippet)
  - Anki 24.11's load balancer and Easy Days, and the FSRS Helper add-on, which offers "Postpone & Advance & Load Balance & Easy Days & Disperse Siblings". — [FSRS Helper on AnkiWeb](https://ankiweb.net/shared/info/759844606); [fsrs4anki-helper README](https://github.com/open-spaced-repetition/fsrs4anki-helper)
  - Anki 24.11 also added sorting reviews by descending retrievability. — [GitHub release 24.11](https://github.com/ankitects/anki/releases/tag/24.11)
- The manual warns that setting desired retention above 97% can make the workload "overwhelming". This is an explicit acknowledgment that overload is the main failure mode. — [Anki manual source](https://raw.githubusercontent.com/ankitects/anki-manual/main/src/deck-options.md)
- The manual's FSRS Health Check exists partly because users misuse the Hard button, for example pressing Hard when they actually forgot. — same source

### Inferences
- **Two distinct failure modes:**
  - *Day 1 friction:* setup, card creation, jargon.
  - *Week 3+ collapse:* the backlog grows, dread sets in, and the user abandons the app.
- Polished competitors mostly fix the first. The algorithm-side fixes (FSRS, load balancing, retrievability ordering) address the second.
- For Blueberry, the second matters more for retention. Useful features:
  - a "catch-up mode" that caps the day's reviews and orders them by most-at-risk (lowest retrievability) first;
  - a non-punitive framing of missed days;
  - an automatic pause on new cards when there is a backlog.

### Gaps
- No rigorous user research found quantifying Anki onboarding drop-off; the evidence is reviews and anecdotes.
- Could not access r/Anki or r/medicalschool threads directly (not attempted, given the tool budget). The Reddit folklore, such as "don't miss a day" and "unsuspend lecture cards", comes via secondary summaries.

## 4. What polished competitors do differently: onboarding, feedback, visuals

### Takeaway
Competitors keep Anki's core mechanic (self-rated recall with spaced scheduling) and change the surface around it:
- **Quizlet:** multi-modal "Learn" sessions, a single Memory Score and automated scheduled review.
- **Brainscape:** a 1-5 "confidence" rating plus mastery percentages.
- **RemNote:** cards created inline in notes, keeping context, plus an exam-date scheduler, FSRS and AI generation.
- **Mochi:** a Markdown-first, offline-first model with clean visuals and linked cards.

The common pattern is less configuration, more progress feedback, and card creation embedded in the user's existing workflow.

### Cited Findings
**Quizlet**
- Learn mode uses an ML model that ranks cards within a session by predicted recall and brings missed cards back sooner. — [learnclash.com](https://learnclash.com/blog/does-quizlet-have-spaced-repetition); [Mindomax](https://www.mindomax.com/quizlet-spaced-repetition) (third-party)
- Quizlet shows a personalized "Memory Score" to track long-term memory gains while you sort cards into "know" and "don't know". — [Quizlet spaced-repetition feature page](https://quizlet.com/gb/features/spaced-repetition); [Quizlet official Memory Score set](https://quizlet.com/842835984/official-how-memory-score-with-scheduled-review-works-spaced-repetition-flash-cards/) (quizlet.com blocked for fetching; details from search snippets)
- "AI-powered Scheduled Review, launched in February 2026". Per the same third-party source, Quizlet published its Learn approach in 2017 but has no public benchmark. — [learnclash.com](https://learnclash.com/blog/does-quizlet-have-spaced-repetition)
  - The launch date is from a third party and was not verified on Quizlet's site.
  - Quizlet's 2017 write-up: [Quizlet blog: Spaced Repetition for All](https://quizlet.com/blog/spaced-repetition-for-all-cognitive-science-meets-big-data-in-a-procrastinating-world)

**Brainscape**
- Confidence-Based Repetition (CBR): after revealing the answer you rate confidence 1-5. A 1 comes back most often, and a 5 means "Mastered" and "will hardly repeat at all". — [Brainscape Help Center: How CBR works](https://brainscape.zendesk.com/hc/en-us/articles/13103043051149-How-Does-Brainscape-s-Spaced-Repetition-Algorithm-Work); [Brainscape Academy: CBR](https://www.brainscape.com/academy/confidence-based-repetition-definition/)
- Brainscape presents the confidence rating as adding "engagement and metacognitive effort" and publishes help articles on "what if I don't rate correctly". This is effectively onboarding for the rating system. — [Brainscape Help: rating](https://brainscape.zendesk.com/hc/en-us/articles/115002736872-How-should-I-rate-my-confidences-When-should-I-rate-a-5); [what if I don't rate correctly](https://brainscape.zendesk.com/hc/en-us/articles/115002384312-What-if-I-don-t-rate-my-1-5-confidences-correctly)

**RemNote**
- Cards are made inline in notes with `==` or `>>` separators. When reviewing, "your cards always show their full context".
- You can set an exam date and RemNote adjusts the schedule so everything is reviewed before the test.
- It supports AI-generated cards from notes and PDFs.
- By default a card is due when estimated forgetting probability reaches 10%.

— [RemNote spaced repetition](https://www.remnote.com/feature/spaced-repetition); [RemNote Help: Flashcard Basics](https://help.remnote.com/en/articles/8663109-flashcard-basics); [RemNote Help: FSRS](https://help.remnote.com/en/articles/9124137-the-fsrs-spaced-repetition-algorithm)

**Mochi**
- Cards are Markdown documents, and a `---` line splits them into sides.
- Cards can link to each other with automatic backlinks.
- It is offline-first with no sign-up needed. Sync costs US$5/month (Pro).

— [Mochi](https://mochi.cards/); [Mochi docs](https://mochi.cards/docs/); [Nibomo review 2026](https://nibomo.com/blog/mochi-alternative/)

### Inferences
- **Rating scales:**
  - Brainscape's 1-5 "confidence" rating lowers the cognitive cost of grading ("how sure am I?" rather than "which of four scheduling buttons?"). The cost is a fuzzier signal.
  - Anki's 4 buttons map to scheduling outcomes, and FSRS needs Again to mean "failed".
  - A good middle ground for Blueberry: keep 4 grades but label them by experience ("Forgot / Struggled / Got it / Too easy"), show the next interval under each button (Anki does this), and add a one-time explainer.
- **Feedback visuals:** a single aggregate number (Quizlet's Memory Score, Brainscape's mastery %, Anki 24.11's "estimated total knowledge") gives the progress feeling Anki's raw due count lacks. Pairing an obligation metric (due today) with a growth metric (cards known, retention) likely helps motivation. This is an inference; no A/B data was found.
- **Exam-date scheduling (RemNote)** fits organic chemistry students, who have fixed midterms and finals rather than lifelong retention goals. Cepeda's result (the best gap shrinks relative to how long you need to remember) supports compressing intervals before an exam.
- **Context retention (RemNote)** matters for organic chemistry. Isolated facts ("reagent X does Y") are less useful than cards linked back to the mechanism or reaction map they belong to.

### Gaps
- No verified onboarding flow teardowns (screens, steps) for Quizlet, Brainscape or RemNote. Mobbin screen search could fill this if needed.
- No published retention or learning-outcome comparisons between these apps and Anki.
- Quizlet's official pages could not be fetched, so Memory Score mechanics (range, decay) remain unverified.

## 5. Lessons for an organic chemistry app (Blueberry): image occlusion, mechanism card types, etc.

### Takeaway
The directly transferable Anki patterns for organic chemistry are:
- **image occlusion** on structures, reaction schemes and reagent tables (built into Anki since 23.10 per background knowledge; previously the "Image Occlusion Enhanced" add-on);
- **multi-direction cards** from one reaction note (reactants→product, product→reagents, name→conditions);
- **public mechanism decks**, which show demand.

Practitioners warn that mechanisms need active drawing and practice, not just recognition.

### Cited Findings
- Students use Image Occlusion to memorize reagents and to build decks of reaction pathways with products, conditions and reactants hidden. — [JHU guide: How to use Image Occlusion Enhanced](https://stripe.jhu.edu/news/how-to-use-image-occlusion-enhanced-anki); [SDN forum: Using Anki for Organic?](https://forums.studentdoctor.net/threads/using-anki-for-organic.1231345/)
- Practitioner caution from the SDN thread: reactions "need to be practiced out", becoming "muscle memory", or else "you'll have a hard time recalling them on exams when presented differently". Writing out mechanisms lets "patterns emerge and connections form". — [SDN forum](https://forums.studentdoctor.net/threads/using-anki-for-organic.1231345/) (anecdote)
- Shared organic chemistry decks already exist on AnkiWeb and third-party sites: "Organic Chemistry 1 Mechanisms", "OCR A Level Chemistry Reaction pathways" and "CHM 170: Organic Chemistry Mechanisms". — [AnkiWeb: Organic Chemistry 1 Mechanisms](https://ankiweb.net/shared/info/1212273385); [AnkiWeb: OCR A Level Reaction pathways](https://ankiweb.net/shared/info/2085063444); [anki-decks.com CHM 170](https://anki-decks.com/anki-decks/chemistry/chm-170-organic-chemistry-mechanism/)
- Retrieval practice benefits show up on delayed tests (Roediger & Karpicke 2006), and Dunlosky rates practice testing highly across "many criterion tasks". This supports quizzing that requires producing an answer (drawing, choosing reagents) over recognition. — [Roediger & Karpicke 2006](https://journals.sagepub.com/doi/10.1111/j.1467-9280.2006.01693.x); [APS summary of Dunlosky 2013](https://www.psychologicalscience.org/news/releases/which-study-strategies-make-the-grade.html)

### Inferences (design recommendations for Blueberry)
1. **Note → multiple cards.** One "reaction" note (substrate, reagents/conditions, product, mechanism steps, stereochemistry) should generate several cards:
   - forward (predict the product);
   - reverse (which reagents?);
   - named-reaction recall;
   - stereo/regio outcome.

   This follows Anki's note/card separation and gives interleaving across directions.
2. **Mechanism step cards.** Break a mechanism into sequential occlusions: hide arrows or intermediates one step at a time ("occlude one, reveal all" style). This tests each step in context rather than the whole mechanism at once.
3. **Self-rating plus an optional objective check.** For mechanisms, have the user sketch on paper or a canvas, then reveal and self-rate. Where possible (reagent choice, product selection), use objective multiple-choice or tap-to-select answers to calibrate self-ratings, which reduces Hard/Again misuse.
4. **Scheduler.** Use FSRS (there are open-source implementations from open-spaced-repetition) rather than SM-2, to avoid ease hell. Default to 90% desired retention, and offer an exam-date mode that compresses intervals (the RemNote pattern).
5. **Backlog protection.** Include:
   - a daily review cap;
   - load balancing;
   - an automatic pause on new cards when overdue exceeds a threshold;
   - catch-up ordering by lowest retrievability;
   - copy that frames a missed day as recoverable.
6. **Progress visuals.** Combine the due-today count with a growth metric (cards mastered per chapter, estimated retention) and a heatmap or streak calendar. Brainscape, Quizlet and Anki 24.11 all converge on a "knowledge estimate".
7. **Curated decks mapped to courses.** This is the AnKing lesson: pre-made, maintained decks aligned to common organic chemistry syllabi (and MCAT/DAT) remove the card-creation barrier, which is the main reason casual users never reach the habit stage.
8. **Onboarding.** Explain the 4 buttons once, with each button's next interval shown. Start with a small new-card limit (Anki's commonly cited default is 20/day, per background knowledge not verified this session) so the first week's review load builds gently.

### Gaps
- Could not verify details of Anki's built-in Image Occlusion (introduced in 23.10 per background knowledge; the manual page was blocked).
- No studies found specifically on spaced repetition for organic chemistry mechanisms. The evidence comes from general retrieval and spacing research plus student anecdote.
- No data on whether drawing-based retrieval outperforms recognition for mechanisms in an app context.
