# Alchemie (alchem.ie) and the Organic Chemistry Learning Market: teardown for Blueberry

> **Method note:** This session's network egress policy blocked direct page fetches from alchem.ie, apps.apple.com, chemrxiv.org, pubs.acs.org, par.nsf.gov, semanticscholar, michiganbusiness.org, appgrooves.com, realochem.study, and verbalexperiment.com. Every finding below comes from **search-engine result snippets for the cited URLs**, so it could not be checked against the full page. The quoted wording comes from those snippets and should be spot-checked before anyone quotes it publicly. Where snippets conflict, both versions are shown. Treat anything on alchem.ie or an App Store listing as a **marketing claim**. Treat J. Chem. Educ., CERP, and ChemRxiv items as **evidence**, noting that Alchemie staff wrote most of the Alchemie papers.

---

## 1. Product structure, pricing, sales channels, website IA, and company self-presentation

### Takeaway
Alchemie is a small, NSF-SBIR-funded Michigan company. It started with standalone consumer iOS game apps (Chairs!, Mechanisms, ModelAR, Animator). By 2025–2026 it presents itself as an "accessible STEM learning" B2B supplier: "born-accessible" interactives sold through Learnosity and WileyPLUS and plugged into LMSs. The Mechanisms consumer app still exists as a cheap unlock ($9.99), and an instructor dashboard sits beside it. There is no single paid suite. The apps are separate, and the website ties them together with a Products/Explore hub, a mission page, a team page, research papers, and a blog.

### Cited Findings
**Products (what exists)**
- **Mechanisms** (iOS + web, no native Android per current site copy): "the first app for organic chemistry that allows you to practice and learn reaction mechanisms by moving and manipulating electrons." It has 260+ puzzles covering both semesters, "from introductory mechanisms through advanced carbonyl chemistry." — [Alchemie Mechanisms page](https://www.alchem.ie/mechanisms); [App Store listing](https://apps.apple.com/us/app/mechanisms-organic-chemistry/id1157056029)
  - Android: an older package `com.alchemiesolns.mechanisms` (v1.22) circulates on APK mirrors. Current copy says "no Android version is currently available." — [APK4Fun](https://www.apk4fun.com/apps/com.alchemiesolns.mechanisms/); [soft112](https://mechanisms-by-alchemie-organic-chemistry.soft112.com/); [Alchemie Mechanisms page](https://www.alchem.ie/mechanisms)
- **Chairs!** (iOS): a cyclohexane ring-flip puzzle game. The RSC called it a "top chemistry app," and it was a 2016 SXSW LaunchEDU finalist. — [App Store: Chairs!](https://apps.apple.com/us/app/chairs-organic-chemistry-game/id916843853); [J. Chem. Educ. 2016, Chairs!](https://pubs.acs.org/doi/10.1021/acs.jchemed.5b00872)
- **ModelAR: Organic Chemistry** (iOS + Android, package `com.alchemie.modelset`): a 3D/AR molecular model kit. "Drag an atom from the side bar onto the main workspace… drag between atoms to create new chemical bonds," "swipe to rotate molecule and spin bonds," a "focus tool," and a toggle "to pop into AR." It is pitched as turning "stereochemistry into play." — [App Store: ModelAR](https://apps.apple.com/us/app/modelar-organic-chemistry/id1438760201); [Google Play: ModelAR](https://play.google.com/store/apps/details?id=com.alchemie.modelset&amp;hl=es_AR&amp;gl=US)
- **Alchemie Animator: Chemistry** (iOS): "build and share molecular animations." — [App Store: Animator](https://apps.apple.com/us/app/alchemie-animator-chemistry/id1154549992)
- **Free web tools** (Lewis Structures, VSEPR/molecular geometry, Hybridization, "and more"), described as "fully screenreader-accessible." The Lewis tool lets you attach atoms and add lone pairs "while tracking the formal charge and the number of electrons contributing to the octet." The geometry tool shows electron and molecular geometry in 3D with a "Model Data box." — [Alchemie Lewis](https://www.alchem.ie/lewis); [Alchemie Explore](https://www.alchem.ie/explore); [Lewis Structure Explorer web app](https://alchemie-lewis2.web.app/)
- **KASI**: an assistive-technology R&D project that uses ML, computer vision, and multisensory AR to support blind and low-vision learners working with physical manipulatives. — [search snippet attributed to NSF/Alchemie materials, via Julia Winter search results](https://www.alchem.ie/team)
- **"Kinverse"**: no Alchemie product by this name was found. The only "Kinverse" in search results is an unrelated social app. — [kinverse.app](https://www.kinverse.app/)

**Pricing**
- Consumer: "50 puzzles (10 each of Intro, Structure, Acid-Base, Addition, & Carbonyls) are included for free… Access to the remaining 220 puzzles can be unlocked for a **one-time purchase of $9.99**." — [Alchemie Mechanisms FAQ & Resources](https://www.alchem.ie/resources)
- **Conflict:** other snippets describe "$9.99 for a **6-month subscription**" (attributed to an app-store/Android listing). — [App Store listing snippet](https://apps.apple.com/us/app/mechanisms-organic-chemistry/id1157056029); [APK4Fun](https://www.apk4fun.com/apps/com.alchemiesolns.mechanisms/)
- **Conflict on free tier size:** some copy says "40 different chemistry-based puzzles" are free, and other copy says 50. Total is "260+" on the product page versus 50 + 220 = 270 on the FAQ. — [Alchemie Mechanisms page](https://www.alchem.ie/mechanisms); [Alchemie Resources](https://www.alchem.ie/resources)
- Institutional: instructors "contact Alchemie to request a course code" and get the **Epiphany Dashboard** to "create assignments and monitor student progress." Students then open assigned puzzles in the app. No public per-seat price was found. — [Alchemie Resources](https://www.alchem.ie/resources); [EdTech Impact listing](https://edtechimpact.com/products/alchemie/)

**Institutional channels (B2B)**
- Homepage positioning: "born-accessible interactive tools for general and organic chemistry… deployed at scale through **Learnosity and WileyPLUS**, and seamlessly integrated with **Canvas, Blackboard, Moodle**, and other major LMS platforms." — [Alchemie homepage](https://www.alchem.ie/)
- Its WileyPLUS partnership built "a suite of drawing tools designed specifically for chemistry education, **replacing Marvin Sketch**." — [search snippet from Alchemie homepage / WileyPLUS results](https://www.alchem.ie/)
- Learnosity lists an Alchemie partner demo page with "game-inspired interactives." — [Learnosity Demos: Alchemie](https://demos.learnosity.com/partners/alchemie.php)
- Scale claim: "Over **150,000 students** have used Mechanisms." (marketing) — [Alchemie homepage/Mechanisms page](https://www.alchem.ie/mechanisms)

**Website IA and company self-presentation (from indexed page titles)**
- The indexed pages are Home ("Alchemie | Accessible STEM Learning"), `/products` ("All Products"), `/explore` ("Explore Interactive Chemistry Tools"), `/mechanisms`, `/lewis`, `/resources` ("Mechanisms FAQ & Resources"), `/about`, `/vision-mission`, `/team` ("Our Team | Alchemie Solutions"), and `/blog/...` (for example, "The Lewis Structure Explorer by Sarah Wegwerth" and "Mechanisms Student Feedback by Gianna Manchester"). — [Home](https://www.alchem.ie/); [Products](https://www.alchem.ie/products); [Explore](https://www.alchem.ie/explore); [Vision & Mission](https://www.alchem.ie/vision-mission); [Team](https://www.alchem.ie/team); [Blog: Lewis Explorer](https://www.alchem.ie/blog/the-lewis-structure-explorer); [Blog: student feedback](https://www.alchem.ie/blog/modelar-student-feedback)
- Vision: "a world with well-designed tools in which ALL students can succeed in STEM." Mission: "transform education through exploratory and accessible learning." — [Vision & Mission](https://www.alchem.ie/vision-mission)
- Accessibility pitch: "AI-powered alt text, keyboard controls, and multi-sensory design," and "co-design with end users." — [Alchemie homepage](https://www.alchem.ie/)
- Team story: founder and CEO **Julia Winter** taught organic and AP chemistry for 20+ years at Detroit Country Day School and received ACS's **James Bryant Conant Award (2016)**. Co-founders are COO Carl Rundell and CTO **Joe Engalan**, who has a game-design and software background of 25+ years. — [Alchemie Team](https://www.alchem.ie/team); [Michigan Business success story](https://www.michiganbusiness.org/reports-data/success-stories/alchemie/)
- Origin: an NSF SBIR Phase I award (PI Julia Winter) in January 2016. The company was incorporated then, and Winter left teaching "to build the Mechanism Game." — [Michigan Business success story](https://www.michiganbusiness.org/reports-data/success-stories/alchemie/)
- Later funding: an NSF Phase II award of **$1,000,000 (May 1, 2024)** for "an accessible system for generating standardized STEM diagram descriptions with AI-driven learning assistance for screen reader users." Alchemie was also a finalist in the NSF **VITAL Prize Challenge**. — [search snippet from Alchemie About/Team](https://www.alchem.ie/about)
- Peer-reviewed papers are part of the brand story (see Section 4), and blog posts by staff (Wegwerth, Manchester) summarize them.

### Inferences
- Alchemie holds together as "one company" through (a) a single founder-teacher origin story, (b) a single value (exploratory plus accessible), (c) one shared interaction language across apps (direct manipulation: drag atoms, drag electrons, flip chairs), and (d) research citations as proof. The standalone apps are less a suite than the channel that led to the B2B platform business.
- The pivot toward accessibility and B2B (WileyPLUS, Learnosity, NSF accessibility grants) suggests the consumer app is not the main business. That leaves room in direct-to-student organic chemistry games.
- The $9.99 one-time unlock sets price expectations low for a "mechanism puzzle game." A solo developer probably cannot charge much more for puzzles alone.

### Gaps
- Exact current homepage nav labels, testimonial text, and instructor-page content could not be verified because alchem.ie was blocked.
- Institutional per-seat pricing is not public.
- Whether the consumer price is currently one-time or a 6-month subscription is unresolved. Snippets conflict, and the pricing may differ by platform or date.
- Could not confirm whether a "Stereochemistry" app is separate from ModelAR, or whether "Molecules/Model Kit" is ModelAR under another name.

---

## 2. Interaction design of Mechanisms (gesture, electrons, hints, feedback, progression, stars, sound, animation)

### Takeaway
Mechanisms uses **direct manipulation of electrons**, not freehand arrow drawing. Students drag electrons with a finger (lone pairs and bond electrons) to make and break bonds. The structure updates live as they move, and the app responds right away with graphics and audio. It gives hints after wrong moves and shows stars when goals are met. Puzzles are grouped into topic packs (Intro, Structure, Acid-Base, Addition, Carbonyls, and more).

### Cited Findings
- "students are asked to solve each mechanistic step by **pushing electrons with their fingers on the screen** of a phone or tablet." Design goal: "provide scaffolding of concepts for students while allowing for **experimentation and hypothesis testing**." — [J. Chem. Educ. 2020, "The Shrewd Guess"](https://pubs.acs.org/doi/10.1021/acs.jchemed.0c00246); [ERIC EJ1280215](https://eric.ed.gov/?id=EJ1280215)
- "students investigate reactions by moving electrons to make and break bonds, to which the App **responds immediately using graphical and audio feedback**." — [J. Chem. Educ. "Shrewd Guess" (ACS landing page snippet)](https://pubs.acs.org/jceda8/article/97/12/4520/615153/The-Shrewd-Guess-Can-a-Software-System-Assist)
- "move and manipulate electrons to form and break bonds while completing real reaction mechanisms, and **shows the resultant structure form as electrons are rearranged**." — [Alchemie Mechanisms page](https://www.alchem.ie/mechanisms)
- "you will receive **hints and feedback based on the moves you make**, and Mechanisms provides **real-time assessment**, giving you a measure of your performance and comprehension every step of the way." — [App Store listing](https://apps.apple.com/us/app/mechanisms-organic-chemistry/id1157056029)
- Scaffolding includes "**hints after incorrect moves** and **stars appearing when goals are achieved**." — [search snippet for Alchemie/App Store pages](https://www.alchem.ie/mechanisms)
- Marketing framing: "Arrow pushing is the hardest skill in organic chemistry and most students only practice it on paper… understanding **why** electrons move requires a different kind of practice." "A place to actually push electrons, **make mistakes**, and build intuition through guided exploration." — [Alchemie Mechanisms page](https://www.alchem.ie/mechanisms)
- Progression: puzzles are organized by topic packs, "10 each of Intro, Structure, Acid-Base, Addition, & Carbonyls" in the free tier, and "both semesters" in full. — [Alchemie Resources](https://www.alchem.ie/resources)
- Data use: the development paper includes "an example of **pattern recognition from data collected by the app**." The app logs moves, including wrong ones. — [ChemRxiv 2019, Winter et al., Development paper](https://chemrxiv.org/engage/chemrxiv/article-details/60c740a39abda2dd11f8bd1b)
- A user asked for a "'**repeat progress**' and/or '**clean up structure**' button to really see the electrons in motion." This implies there is no replay of the solved mechanism and that structures can get visually messy after several moves. — [App Store review (via snippet)](https://apps.apple.com/us/app/mechanisms-organic-chemistry/id1157056029)
- Comparison, Pearson Mastering (MarvinJS): students **draw** curved arrows in a desktop chemical editor. The arrowhead can go "on the atom or in the space between atoms," with a "dotted line" for a new bond. Mechanism questions "should be completed on a computer, not on a smartphone." — [Pearson Mastering help: mechanism questions (Marvin JS)](https://help.pearsoncmg.com/mastering/student/standalone/TopicsStudent/answering_marvin_mechanism.htm); [Pearson: Mechanism Flows evaluator](https://help.pearsoncmg.com/mastering/authoring/simple_editor/Topics/chem_mech_flows_evaluator.htm)

### Inferences
- Alchemie's key design choice is to **make electrons the object you touch**. The curved arrow becomes a trace of the drag, not a drawing task. That makes it forgiving on touch screens and turns "arrow pushing" into a manipulation puzzle. A Blueberry trainer could copy the core idea (drag from source to sink, snap to valid targets) and differ in feel, pacing, and meta-game.
- The hint model appears to be **reactive**: hints come after an incorrect move. No evidence was found of a pre-emptive "suggest next step" button or of explanations of *why* an arrow is wrong beyond hints.
- There is little evidence of long-term engagement systems (streaks, XP, spaced review, daily challenges). Stars per puzzle appear to be the main reward.

### Gaps
- No verified detail on how electrons are drawn (dots versus arrows as the drag happens), exact star criteria (for example, fewest wrong moves), sound design specifics, reaction animation after a correct step, or whether a mechanism replay exists. The ChemRxiv PDFs that describe this were blocked.
- Unknown whether stars gate progression or are only cosmetic.

---

## 3. Onboarding, tutorial patterns, and visual style

### Takeaway
Direct evidence here is thin. The picture that comes through is a free, topic-ordered "Intro" pack that works as the tutorial, direct-manipulation gestures kept consistent across apps, and 3D/AR models in ModelAR. The newer web tools use an accessibility-first UI (keyboard control panel, dynamic alt text).

### Cited Findings
- The first free pack is "Intro," followed by Structure, Acid-Base, Addition, and Carbonyls, so the easy puzzles double as onboarding. — [Alchemie Resources](https://www.alchem.ie/resources)
- In Chairs!, "players are presented with the two different conformational isomers of cyclohexane, with a bond shown on one conformer and a **pulsing circle** marking the corresponding position on the other." This is a visual-cue pattern for target positions. — [J. Chem. Educ. 2016, Chairs!](https://pubs.acs.org/doi/10.1021/acs.jchemed.5b00872)
- ModelAR's gesture set is drag atom from sidebar, drag between atoms to bond, swipe to rotate or spin bonds, a focus tool, and an AR toggle. — [App Store: ModelAR](https://apps.apple.com/us/app/modelar-organic-chemistry/id1438760201)
- The Lewis Structure Explorer has a "form-driven **keyboard accessible control panel**" and alt text "generated dynamically with user input." — [J. Chem. Educ. 2024, Lewis Structure Explorer](https://pubs.acs.org/doi/10.1021/acs.jchemed.4c00187); [ChemRxiv preprint](https://chemrxiv.org/engage/chemrxiv/article-details/65cfc5d8e9ebbb4db9867dc2)
- Pearson Mastering onboards mechanism drawing with a dedicated "Introduction to Organic Mechanisms" item (instructions, videos, hints, practice). This is a tool tutorial, not a game tutorial. — [Pearson Mastering help](https://help.pearsoncmg.com/mastering/student/standalone/TopicsStudent/answering_marvin_mechanism.htm)

### Inferences
- Alchemie's onboarding appears to be "learn by doing easy puzzles" rather than a separate scripted tutorial. Clear first-run guidance could set Blueberry apart, given the competitor learning curves (MarvinJS needs a desktop, and Mechanisms reviewers call problems "frustrating").

### Gaps
- Colors, typography, atom rendering in Mechanisms (2D skeletal versus ball-and-stick), and first-run tutorial screens could not be verified because the App Store screenshots and alchem.ie were blocked.

---

## 4. Published efficacy studies and awards (evidence versus marketing)

### Takeaway
Alchemie has an unusually strong publication record for a small edtech company: several J. Chem. Educ. papers and ChemRxiv preprints on Mechanisms, Chairs!, and the Lewis Structure Explorer. These are mostly **design and development papers with formative or usability data**, not controlled efficacy trials, and Alchemie staff wrote most of them. The headline "90% of students find it beneficial" is a self-reported perception figure.

### Cited Findings
**Evidence (peer-reviewed or preprint)**
- **Winter, Wegwerth, DeKorver, Morsch. "The Mechanisms App: Development of a New Learning Tool for Active Learning in Organic Chemistry" (ChemRxiv, March 2019).** It covers development "from conception to development and early testing," improvements from instructor and student feedback, "preliminary research studies," active-learning use cases, and pattern recognition from app data. — [ChemRxiv](https://chemrxiv.org/engage/chemrxiv/article-details/60c740a39abda2dd11f8bd1b); [ResearchGate](https://www.researchgate.net/publication/331458212_The_Mechanisms_App_Development_of_a_New_Learning_Tool_for_Active_Learning_in_Organic_Chemistry)
- **"The Mechanisms App: Electron-Pushing Formalism as a Software System" (ChemRxiv, 5 March 2020).** Authors are from Alchemie, Augsburg University, Georgia Tech, UW–Green Bay, and Hartnell College. It studies "whether the open-ended experience to construct understanding of EPF is valuable as a **formative assessment** method." — [ChemRxiv](https://chemrxiv.org/engage/chemrxiv/article-details/60c74896bdbb89df07a38fea)
- **"The Shrewd Guess: Can a Software System Assist Students in Hypothesis-Driven Learning for Organic Chemistry?" J. Chem. Educ. 2020, 97(12), 4520.** This appears to be the peer-reviewed version of the 2020 preprint. — [ACS](https://pubs.acs.org/doi/10.1021/acs.jchemed.0c00246); [ERIC EJ1280215](https://eric.ed.gov/?id=EJ1280215)
- **"Chairs!: A Mobile Game for Organic Chemistry Students To Learn the Ring Flip of Cyclohexane." J. Chem. Educ. 2016, 93(9), 1657.** — [ACS](https://pubs.acs.org/doi/10.1021/acs.jchemed.5b00872)
- **"The Lewis Structure Explorer: Accessible by Design." J. Chem. Educ. 2024, 101, 2880.** It draws on a faculty survey, a usability study with **300+ sighted college students** ("of the valid structures submitted, **81% were correct**"; most errors were in lone pairs or formal charges), and a study with **4 blind or low-vision adults**. — [ACS](https://pubs.acs.org/doi/10.1021/acs.jchemed.4c00187); [ADS abstract](https://ui.adsabs.harvard.edu/abs/2024JChEd.101.2880W/abstract)
- NSF public-access record "Playing with chemistry" (par.nsf.gov 10074744) is related to Alchemie SBIR outputs. Content was not verified. — [par.nsf.gov](https://par.nsf.gov/servlets/purl/10074744)

**Marketing claims (not independently verified)**
- "90% of college students find Mechanisms to be beneficial to their studies." — [Alchemie Mechanisms page](https://www.alchem.ie/mechanisms)
- "Over 150,000 students have used Mechanisms." — [Alchemie homepage](https://www.alchem.ie/)
- Chairs! was an RSC "top chemistry app" and a 2016 SXSW LaunchEDU finalist. — [App Store: Chairs!](https://apps.apple.com/us/app/chairs-organic-chemistry-game/id916843853)
- Awards and funding: Winter's ACS Conant Award (2016, for teaching, not the product), NSF SBIR Phase I (2016), NSF Phase II $1M (2024, accessibility), and NSF VITAL Prize finalist. — [Alchemie Team](https://www.alchem.ie/team); [Michigan Business](https://www.michiganbusiness.org/reports-data/success-stories/alchemie/)

**Related evidence from competitors**
- OrgChem101 "Organic Mechanisms: Mastering the Arrows" (Flynn group, uOttawa, open educational resource) found "significant learning gains between the pre- and post-test," with gains "observed after only **one hour**." — [CERP 2020](https://pubs.rsc.org/en/content/articlelanding/2020/RP/C9RP00274J); [Flynn Research Group](http://www.flynnresearchgroup.com/language)
- Chirality-2 (J. Chem. Educ. 2018) describes itself as "one of the first purpose-built mobile applications… to teach organic chemistry and the only one to feature **multiple levels, a reward system, and social media integration**." — [J. Chem. Educ. 2018](https://pubs.acs.org/doi/10.1021/acs.jchemed.7b00856); [ERIC](https://eric.ed.gov/?id=EJ1184697&q=application+on+computer)

### Inferences
- No randomized or controlled exam-score study of Mechanisms turned up. The evidence supports "usable, liked, and valuable as formative feedback," not "improves grades." A solo developer could build credibility the same way: publish design rationale and in-app data patterns, and describe it as formative practice.

### Gaps
- Could not get sample sizes or quantitative results for the Mechanisms papers because the full texts were blocked.

---

## 5. App store reviews: what students love and complain about

### Takeaway
Reviews are split. The US App Store shows about **3.2/5 from 67 ratings** (per snippet). Fans call it a "game changer" and credit it for exam success. Complaints center on difficulty or frustration, bugs, and missing replay or cleanup tools. The paywall or subscription model may add friction.

### Cited Findings
- Rating: "3.2 out of 5 stars rating based on 67 ratings" (US App Store, per search snippet, date unknown). — [App Store listing](https://apps.apple.com/us/app/mechanisms-organic-chemistry/id1157056029)
- AppGrooves aggregates about 175–177 reviews across stores. — [AppGrooves](https://appgrooves.com/app/alchemie-mechanisms-by-alchemie-solutions-inc/positive)
- Positive: "it is absolutely a **game changer** for students." "I just got an **A on my first mechanisms exam** basically by reading the Wikipedia articles for each and playing with this app." "probably the best way to memorize organic chemistry reactions and learn the basics of electron flow on the app store." — [App Store reviews via snippet](https://apps.apple.com/us/app/mechanisms-organic-chemistry/id1157056029); [AppGrooves](https://appgrooves.com/app/alchemie-mechanisms-by-alchemie-solutions-inc/positive)
- Positive (Alchemie's own blog): students "appreciate the hints within the puzzles because they provide **instant feedback that does not exist when doing mechanisms on paper**." — [Alchemie blog: Mechanisms Student Feedback](https://www.alchem.ie/blog/modelar-student-feedback)
- Negative or neutral: one review says "problems can be **frustrating**" while defending the app against other reviewers who called it "worst app ever" and "so stupid." This suggests a strand of angry low-star reviews. — [App Store via snippet](https://apps.apple.com/us/app/mechanisms-organic-chemistry/id1157056029)
- Feature request: "needs a '**repeat progress**' and/or '**clean up structure**' button to really see the electrons in motion." — [App Store via snippet](https://apps.apple.com/us/app/mechanisms-organic-chemistry/id1157056029)
- Release notes repeatedly list "many more bug fixes." — [App Store via snippet](https://apps.apple.com/us/app/mechanisms-organic-chemistry/id1157056029)
- Chirality (a competitor): "I've already taken organic chemistry I and II and did well. However, I found this game to be challenging (in a good way.)" — [App Store: Chirality](https://apps.apple.com/au/app/chirality/id1168523802)

### Inferences
- The 3.2 average with polarized reviews points to a gap between how the puzzles feel to strong students (great) and to struggling ones (frustrating, "stupid"). Better hint ramps, explanations, and a replay or cleanup view match the stated complaints directly.
- Many ratings likely come from students *assigned* the app by instructors, which tends to pull ratings down relative to self-chosen apps.

### Gaps
- Full review text, dates, and Google Play ratings were not accessible. No r/OrganicChemistry or r/chemhelp threads about Alchemie came up in search, which may itself say something about low word-of-mouth among students.

---

## 6. Competitors: engagement features and gaps, and where the white space is

### Takeaway
The market splits into (a) **publisher homework platforms** (Pearson Mastering, Macmillan Sapling/Achieve, WileyPLUS) that grade curved arrows in desktop editors, are assigned and not loved, and offer no game layer; (b) **video and content subscriptions** (The Organic Chemistry Tutor, Chad's Prep, Master Organic Chemistry) with huge reach but passive or quiz-only practice; (c) **academic mini-games** (Alchemie apps, Chirality, OrgChem101) that are well researched but narrow, dated, or unmaintained; and (d) a 2025–2026 wave of **AI "solver" and tutor apps** that give answers rather than practice. The white space is a **modern, mobile-first, habit-forming mechanism game with real explanations**. No player combines Alchemie-style direct electron manipulation with Duolingo-style retention loops (streaks, spaced review, daily puzzles) and good "why" feedback.

### Cited Findings
**Publisher platforms (institutional, assigned)**
- **Pearson Mastering Chemistry** uses ChemAxon **Marvin JS** for mechanism questions, drawing "curved arrows to indicate electron flow." It is desktop only ("should be completed on a computer, not on a smartphone"), with a "Mechanism Flows evaluator" for grading. — [Pearson help](https://help.pearsoncmg.com/mastering/student/standalone/TopicsStudent/answering_marvin_mechanism.htm); [Pearson authoring: Mechanism Flows](https://help.pearsoncmg.com/mastering/authoring/simple_editor/Topics/chem_mech_flows_evaluator.htm)
- Pearson also offers consumer "Study Prep / Channels" with organic chemistry practice problems and an **Organic Chemistry AI tutor**. — [Pearson Study Prep: reaction mechanism](https://www.pearson.com/channels/organic-chemistry/exam-prep/acids-and-bases/reaction-mechanism); [Pearson AI tutor](https://www.pearson.com/channels/organic-chemistry/ai-tutor)
- **Macmillan Sapling Learning / Achieve**: "real-time grading, response-specific coaching… draw chemical structures – including stereochemistry and **curved arrows**," and "drag-and-drop synthetic routes." — [Miami University Sapling overview](http://chemistry.muohio.edu/gung/CHM241/Sapling.pdf); [Macmillan Achieve drawing help](https://mhe.my.site.com/macmillanlearning/s/article/Achieve-Sapling-Learning-Drawing-molecules-in-Assessments-Organic-Chemistry)
- **WileyPLUS** (Klein, Solomons texts) now uses Alchemie drawing tools that replace Marvin Sketch. — [WileyPLUS Klein 5e](https://www.wileyplus.com/chemistry/klein-organic-chemistry-5th-edition-eprof23240/); [Alchemie homepage](https://www.alchem.ie/)
- Pain point (secondary source, not verified primary): multiple-choice and auto-graded formats "don't reward partial credit." "Getting the first four steps correct but misplacing one curved arrow on the fifth step often earns the same score as getting the whole problem wrong." — [Skyline Academic blog](https://skylineacademic.com/blog/is-organic-chemistry-hard/)

**Content subscriptions**
- **The Organic Chemistry Tutor** (YouTube): about **10.6M subscribers** and 3,000+ videos (passive video, free). — [Genius Lab Gear roundup](https://geniuslabgear.com/blogs/for-scientists/best-organic-chemistry-tutor-websites-youtube-channels); [Social Blade](https://socialblade.com/youtube/channel/UCEWpbFLzoYGPfuWUMFPSaoA)
- **Chad's Prep**: Organic Chemistry course at **$9.99/month**, with 22 chapters of video, a 160-page outline, 60 quizzes, 3 practice finals, and "over 800 practice questions." A $13/month bundle covers multiple courses. — [Chad's Prep pricing](https://www.chadsprep.com/pricing/); [Chad's Prep organic course](https://www.chadsprep.com/organic-chemistry-course/)
- **Master Organic Chemistry**: membership at $12.95/month, $99/year, or $39.95 for one month non-recurring. It includes "3500+ practice questions" plus the Reaction Guide ("step-by-step explanations, reagents, mechanisms…") and PDF summary sheets and flashcards. — [MOC Membership](https://www.masterorganicchemistry.com/moc-membership/); [MOC Select a Plan](https://www.masterorganicchemistry.com/select-a-plan/)
- **Chegg**: management blamed ChatGPT for a sharp drop in sign-ups starting in March 2023. The homework-answer model is under pressure from AI. — [Motley Fool](https://www.fool.com/investing/2023/06/16/is-chegg-stock-a-buy-now); [Wikipedia: Chegg](https://en.wikipedia.org/wiki/Chegg)

**Game and interactive academic tools**
- **Chirality / Chirality-2** (iOS): drag-and-drop puzzles on functional groups, classification, IMFs, isomers, chiral carbons, and naming. Each question ends with a "fun fact," players earn **medals** by score, and it has **social-media competition** with classmates. — [App Store: Chirality](https://apps.apple.com/ca/app/chirality/id1168523802); [App Store: Chirality-2](https://apps.apple.com/us/app/chirality-2/id1251289926); [J. Chem. Educ. 2018](https://pubs.acs.org/doi/10.1021/acs.jchemed.7b00856)
- **OrgChem101** (free open educational resource): interactive videos, instant-feedback questions, and **metacognitive** prompts, with measured one-hour learning gains. — [CERP 2020](https://pubs.rsc.org/en/content/articlelanding/2020/RP/C9RP00274J)
- Other free web arrow-drawing drills exist: cheminteractive.ie "Mechanism Problems: Draw Curved Arrows" and realochem.study "Mechanism Arrow Drawing Practice." Details were not verified. — [cheminteractive.ie](https://cheminteractive.ie/mech1.php); [realochem.study](https://realochem.study/mechanism-draw/)
- "Organic Chemistry Reactions" iOS app: "141 videos… explain reaction mechanisms in detail using curved arrows" (video, not interactive). — [App Store](https://apps.apple.com/us/app/-/id1175675932)
- **Brilliant**: search found a general "The Chemical Reaction" course ("puzzles and patterns… charge, energy, and probability") and wiki pages on organic reactions. **No dedicated organic chemistry or mechanism course was found.** — [Brilliant: The Chemical Reaction](https://brilliant.org/courses/chemical-reaction/); [Brilliant Chemistry](https://brilliant.org/chemistry/); [Brilliant wiki: organic reactions](https://brilliant.org/wiki/common-types-of-organic-reactions/)

**AI solvers and tutors (2025–2026)**
- "Chemistry AI: Organic Solver" (iOS): "snap a reaction… step-by-step mechanism guidance… curved-arrow logic." — [App Store](https://apps.apple.com/us/app/chemistry-ai-organic-solver/id6761053719)
- OrganicChemistryAI.com, AskSia (claims "+0.6 GPA," unverified marketing), Edubrain, and others. — [OrganicChemistryAI](https://organicchemistryai.com/); [AskSia](https://www.asksia.ai/ai-college/organic-chemistry-ai); [Edubrain](https://edubrain.ai/organic-chemistry-helper/)

### Inferences (white space for Blueberry)
1. **Retention loop:** no mechanism-practice product found uses streaks, spaced repetition of previously missed mechanisms, daily puzzles, or progression maps. Alchemie has stars. Chirality has medals and social sharing but covers only intro topics and dates from about 2017–2018.
2. **"Why" feedback:** Alchemie gives reactive hints, and publisher tools grade right or wrong. A trainer that explains *why* an arrow is wrong (for example, "the arrow starts at an electron-poor atom; arrows go from electron source to electron sink") in plain language is under-served. This would also answer the "frustrating" reviews.
3. **Replay and animate:** a student directly asked for a replay/"see electrons in motion" button. An animated step replay and a clean final mechanism summary card are cheap wins.
4. **Mobile-first, cross-platform web:** Pearson is desktop only, and Alchemie has no current Android app. A responsive web game works on any phone.
5. **Practice versus answers:** AI solvers give answers, and students still need *practice* for exams. Blueberry could present itself as the "do-it-yourself" complement, with optional AI explanations only after an attempt.
6. **Pricing anchor:** consumer prices cluster around $9.99 (one-time or per month: Alchemie, Chad's Prep) and $12.95/month (MOC). A free core with a cheap unlock is the norm.
7. **Credibility:** Alchemie's research-plus-teacher-founder story is its moat with instructors. A solo developer can't match that directly, but can show transparent design rationale, cite the EPF literature (source to sink), and share anonymized aggregate "common wrong arrows" data.

### Gaps
- Reddit student sentiment on Sapling, Mastering, and Alchemie could not be retrieved through search. Direct Reddit access would help.
- No current data on the market share or active users of Chirality, OrgChem101, or the AI solvers.
- Did not verify ChemDraw's educational offerings (Revvity ChemDraw for students) or any ChemDraw-adjacent mechanism trainers.
