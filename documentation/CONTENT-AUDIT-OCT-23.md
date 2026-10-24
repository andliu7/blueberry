# Content audit, 23 Oct 2026

Read-only audit of Blueberry's learning game (`src/game`, `packages/`) by student-reader agents, one per unit (U0 to U10), plus a live first-visit walkthrough and an adaptive-difficulty design pass. No repo file was changed except this one. Nothing is committed.

How to read this:
- **Confirmed** means a second agent re-read the file and re-ran RDKit to try to refute the finding, and could not.
- Chemistry that RDKit cannot compute (pKa, rates, mechanism, which product wins under heat) is marked **unverified**. Check it against the course text before you ship.
- Many pool files are generated: `src/game/content/u0,u2,u3,u4,u5,u6,u7,u8,u9,u10/pools.ts` come from `scripts/uN_pools.py`, and `content/u1/stage-*.ts` come from `scripts/u1_pools_*.py`. Every fix to those goes in the script, then you regenerate. Never hand-edit a generated `pools.ts`.
- Units 11 to 15 were not audited in this run.

---

## 1. Verdict

The chemistry is mostly right. RDKit agreed with almost every structure, name, count, product and stereo label the agents checked across 11 units, and the wrong-answer feedback is often the best part of the game. The problems are teaching order, repetition and assessment. First, lessons always play at rung 1, so about 160 harder questions that are already written never appear in a lesson. They show up for the first time in section tests, which pick hardest first. Second, almost every question is a three-option "Pick the product" with one throwaway option, so most items become a 50/50 guess. Third, several lessons ask something before it has been taught (Frost circles, the full SNAr mechanism, LiAlH4 on esters, directing groups, the aldol), which breaks the one-part-at-a-time rule. Fourth, unit exams and test-outs mostly replay lesson questions word for word, and side quests are never examined, even core ones like benzyne, ether cleavage, Hofmann elimination and Stork. Measured against a CHEM 241/242 exam, which asks students to draw products, push arrows, assign R/S and plan 2 to 4 step syntheses (the agents' judgement, not checked against a real UMD paper), the game is too easy almost everywhere. It trains recognition, not production. There are 19 confirmed errors to fix now. Most are one-line wording fixes. Three of them change what a student learns: the U3 sequencing key, the U7 E/Z feedback and the U8 decarboxylation rule.

---

## 2. Fix now

### 2a. Confirmed errors (verified by a second reader)

Ordered by how badly each one misteaches.

1. **U3, wrong answer keyed.** `src/game/beats/mcq/content.ts:864-889` (beat `mcq-sequencing-order`, node `u3-sequencing`), figure at `src/game/beats/mcq/mcqFigures.ts:611`.
   - Current: prompt "Pick the order that ends with the two groups meta." Keyed answer "Nitrate first, then alkylate". The distractor says "Both steps are real and both work".
   - Problem: the key runs Friedel-Crafts alkylation on nitrobenzene. The unit itself says this fails: `content/u3/pools.ts:3062-3083` (u3-alk-fails, "Nothing happens") and `src/game/guide/u3Guide.ts:426` ("Running Friedel-Crafts on nitrobenzene" is a named mistake). None of the three options reaches the drawn target, 3-nitrotoluene.
   - Fix: change the target to 1-bromo-3-nitrobenzene (`O=[N+]([O-])c1cccc(Br)c1`). Use the options "Nitrate first, then brominate" (correct), "Brominate first, then nitrate" and "Either order". Rewrite each "why", delete "Both steps are real and both work", and change the figure's vertex-0 group from CH3 to Br. Derive the regiochemistry with the owner's source before shipping (unverified).

2. **U7, E/Z taught backwards.** `src/game/content/u7/pools.ts:3670` (script `scripts/u7_pools.py:~2427`), u7-hwe-meet, option z.
   - Current: "Same connectivity, but the Z isomer is the minor one here: phenyl and ester end up on opposite sides."
   - Fix: "Same connectivity, but this is the Z isomer: phenyl and ester sit on the same side of the C=C. A stabilised phosphonate gives mostly E, where they sit on opposite sides."
   - Evidence: RDKit 3D dihedral is 2 deg for Z and 179 deg for E.

3. **U8, decarboxylation rule describes the wrong acid.** `scripts/u8_pools.py:2306`, `:2310` (u8-dec-which) and `:1498` (u8-anm-phthalic), plus `src/game/guide/u8Guide.ts:664-666` and `:728-731`.
   - Current: "Only a CO₂H with a C=O on its alpha carbon decarboxylates easily."
   - Problem: read literally, that is an alpha-keto acid (pyruvic acid), which the engine's own BETA pattern rejects. RDKit confirms the code is right and the text is wrong.
   - Fix: "Only a CO₂H whose alpha carbon is bonded to another C=O carbon (a beta-keto acid or a malonic acid) loses CO₂ easily." Make the same change to the :2306 and :1498 whys and the docstrings at :37 and :1089, then regenerate the guide. Optional: make 2-oxopropanoic acid a distractor in u8-dec-which.

4. **U8, headline rule fails on the classic trap.** `scripts/u8_pools.py:1283` (u8-lad-down), `:1430` (u8-acl-uphill), `src/game/guide/u8Guide.ts:42-44`.
   - Current: "Downhill on the ladder is free; uphill needs a reagent that activates the acid first."
   - Problem: acid (rank 3) to amide (rank 2) is "downhill", but acid plus amine gives the ammonium salt, not the amide (textbook convention, unverified).
   - Fix: "Downhill is free from an acyl chloride, anhydride or ester. A free acid is the exception: an amine or base takes its proton first, so the acid needs activation (SOCl₂ or DCC) even to go down." Add a single-part MCQ before u8-ste-amide: "Acetic acid meets CH₃NH₂ at room temperature. Pick the product." Key: methylammonium acetate. RDKit confirms both outcomes balance.

5. **U2, feedback calls the nitrogen a CH2.** `src/game/content/u2/pools.ts:1868-1877` (u2-het-dhp, option c). Source: `scripts/u2_pools.py:1871-1876` (dhp_why).
   - Current: option c (the N-H) shows "This is the CH2 opposite N. It is sp3 with no p orbital..." This is the same text the correct option b shows.
   - Fix: in dhp_why, check for the element N before the `per[i] is None` check, so the N gets "This is the N-H. Its pair can sit in a p orbital, as in pyrrole, so it does not break the loop. The trouble is elsewhere." Then regenerate.

6. **U2, "not whole n means antiaromatic".** `src/game/content/u2/pools.ts:2231` (correct option why) and `:2241` (explanation), u2-chg-cp-cation.
   - Current: "n = 0.5. Not a whole number, so the flat ring is antiaromatic."
   - Fix (2231): "...n = 0.5, not whole, so it is not aromatic. 4 is 4n (n = 1), so if the ring stays flat it is antiaromatic." Fix (2241): "The cation has 4 pi electrons. 4n + 2 gives n = 0.5, so it is not aromatic; 4 is 4n, so the flat ring is antiaromatic." Keep the options and the key.

7. **U9, two different pKa values for malonate in one lesson.** `src/game/beats/match/boards.ts:145` (and `:165`) vs `src/game/content/u9/pools.ts:500`.
   - Current: the board says "Malonic ester C-H: pKa about 13". The MCQ says "near pKa 10". The table at `packages/curriculum/src/pka.ts:133-141` has 10.
   - Fix: check the source key page cited at `pka.ts:139`. If it gives one value, set the board to "pKa about 10" and change "about seven units" to "about ten units". If it gives two values, split the table row and regenerate. Do not pick either number from memory.

8. **U1, NBS lesson teaches one product, the quiz expects two.** `src/game/beats/mcq/content.ts:1021` (mcq-nbs-position), and the quiz at `content/u1/stage-cd.ts:758-790`.
   - Current: "That carbon is C3, and the product is 3-bromobut-1-ene."
   - Fix: "That carbon is C3. The H that comes off is the allylic one, because the radical left behind is spread over C3 and C1. Both ends take Br, so two products form: 3-bromobut-1-ene and 1-bromobut-2-ene." RDKit gives two resonance ends and two distinct products. Optional and unverified: soften `:1016` "does not touch a ring" to "is not how you brominate a benzene ring".

9. **U9, false "secondary OH" claim.** `src/game/content/u9/pools.ts:4924` (script `scripts/u9_pools.py:2802`), u9-re-aldol, option eb.
   - Current: "Those give a secondary OH. This target's OH is on a carbon with two methyls."
   - Problem: one of the crossed aldols is tertiary (RDKit).
   - Fix: "No pairing gives this target: butan-2-one's enolate on ethanal gives a secondary OH, and ethanal's enolate on butan-2-one gives an aldehyde with an ethyl and a methyl on the C-OH carbon. The target is a ketone with two methyls on the C-OH carbon."

10. **U7, "no acidic H at all".** `src/game/content/u7/pools.ts:1854`, u7-grg-proton, option plain.
    - Problem: butan-2-one has 5 alpha H, the basis of Unit 9.
    - Fix: "No O-H or N-H, so nothing quenches the Grignard: it adds to the C=O and gives a tertiary alcohol after workup."

11. **U10, wrong base in Hofmann elimination.** `scripts/u10_pools.py:2191`, u10-he-meet, option one (this is the text shown for the correct answer).
    - Current: "The bulky N(CH₃)₃ leaving group takes an H..."
    - Fix: "Hydroxide takes an H from the less hindered CH₃ end, because the bulky N(CH₃)₃⁺ group crowds the inside CH₂: the less substituted alkene." Line 2193 already says hydroxide is the base. RDKit confirms the products.

12. **U10, amide-reduction lesson plays the NaBH3CN trainer.** `src/game/demo/pathwayMap.ts:393` points u10-amide-red at `iminium-reduction`. The text at `src/game/demo/reactions.ts:2318-2323` reads "The heart of reductive amination" and "NaBH₃CN's whole trick".
    - Fix: add a second TRAINER entry, e.g. `amide-iminium-reduction`, that reuses the same step with the brief "Amide reduction, second hydride: LiAlH₄ delivers H⁻ to the iminium carbon." Point pathwayMap.ts:393 at it. Update any id-listing tests to include it. Do not loosen them.

13. **U0, prompt contradicts its own scene.** `src/game/content/u0/pools.ts:2164` (u0-se-sn1), generated by `scripts/u0_pools.py`.
    - Current: "tert-Butyl bromide sits in warm water. Pick the mechanism." The key is SN1, and the scene says "Warm it instead... E1".
    - Fix: delete "warm", so the prompt reads "tert-Butyl bromide sits in water. Pick the mechanism." Keep the key and the explanation.

14. **U3, product does not match the stated workup.** `src/game/content/u3/pools.ts:2247` (u3-nred-acid), figure name at `:7866`.
    - Current: "Reduce 4-nitrobenzoic acid with Sn and HCl, then base." Key: the neutral acid.
    - Fix in `scripts/u3_pools.py`: "...with Sn and HCl, then NaOH, then H3O+ workup. Pick the product." Update the figure name to match. That NaOH deprotonates COOH is a pKa claim, unverified.

15. **U9, wrong unit reference and wrong cause tag.** `src/game/beats/mcq/content.ts:291` and `:297` (mcq-kvt-enolate-lda).
    - Current: "...as the diene, two units later." The diene is Unit 1, eight units earlier. The cause tag is `attacked_wrong_electrophilic_site`.
    - Fix: "...the same kinetic against thermodynamic split you met on dienes in Unit 1." Change the cause to `thermodynamic_product_under_kinetic_control`, which already exists in `packages/chem-core/src/causes.ts:122`. Side note: the u1-kvt options at content.ts:205, 229, 257, 268 probably carry the same mistag (not checked).

16. **U7, "isolated" C=C that is conjugated.** `src/game/content/u7/pools.ts:4793` (script `scripts/u7_pools.py:2808`), u7-mpv-enal, option both.
    - Fix: "MPV delivers hydride only to the C=O carbon, through the aluminium complex. The conjugated C=C is left alone, so only the C=O is reduced." RDKit marks the C=C as conjugated.

17. **U10, Sandmeyer mechanism lumped with cation capture.** `src/game/demo/sequences.ts:7370` (seq-diazo-sub successLine).
    - Current: "Swap the water for CuBr, CuCN or KI and the same skeleton delivers the whole Sandmeyer family."
    - Fix: "Water captures the phenyl cation. The copper salts (CuCl, CuBr, CuCN) give the matching aryl halide or nitrile by a different, radical path, and KI swaps in iodide without any copper." Mechanism is from the textbook account, not RDKit.

18. **U4, "three bonds" on an sp2 carbon.** `scripts/u4_pools.py:1126` (pools.ts:664), u4-meis-sp3, option nitro.
    - Fix: "That carbon still has only three atoms attached, and its p orbital stays in the ring's π system that carries the charge. It stays sp²." Leave line 1112 as it is.

19. **U0, flat drawing labelled "glucose".** `src/game/content/u0/pools.ts:3108` (u0-pv-u13), name at `scripts/u0_pools.py:159`.
    - Problem: the drawing has no configuration, so it is any aldohexose. The count of 4 is right.
    - Fix: "Pick how many stereocentres an open-chain aldohexose (such as glucose) has." Minor.

Also confirmed, but it is a placement problem, not chemistry: **U10 opens on an Orgo I ladder with no nitrogen in it.** See improvement #4 below.

### 2b. Likely wrong, not independently confirmed

Each of these is a one-line edit. Check the chemistry first.

| Where | Current | Fix |
|---|---|---|
| U6 `content/u6/pools.ts:547-549` (u6-hnmr-ratio-ether) | "Two signals is not a 1 : 1 ratio." | "1 : 1 would need the same number of H in each set. Here the two CH₃ groups hold six H and the two CH₂ groups hold four." |
| U6 `pools.ts:158-160` (u6-dou-halogen) | "makes nine H look one short" | "Leaving Br out leaves nine H against the alkane's ten, which does not even give a whole number. A halogen takes an H's place, so count C₄H₉Br as C₄H₁₀: zero." |
| U3 `beats/mcq/content.ts:106` (mcq-directing-meet) | "Meta is where the deactivators send an electrophile, so this is the pattern most substituents follow." | "Meta is where groups with no lone pair to share (NO2, C=O, CN) send the electrophile. Methyl helps the + at ortho and para instead, so those positions win." |
| U2 `pools.ts:1826` (u2-het-protonate) | "leaves the N with no p electrons" | "the N gets four single bonds and turns sp3, with no p orbital, so the loop has a gap." |
| U4 `u4_pools.py:1447-1452` (u4-dow-meet) | "hydroxide swaps for chlorine" | "Hydroxide pulls an H beside C-Cl, chloride leaves to make benzyne, then OH⁻ adds." |
| U4 `u4_pools.py:1007-1017` (u4-snar-acceptor) | "That is an acceptor, like NO₂." | "...so it is an acceptor, though a weaker one than NO₂." (rate claim unverified) |
| U8 `u8_pools.py:2575` (u8-wei-meet) | "N is the better nucleophile here, so the amide forms, not the ester." | "The OCH₃ oxygen is already bonded to N and CH₃, so it cannot hand an OCH₃ to the acyl carbon. The N-H is the only nucleophile: the amide forms." |
| U8 `u8_pools.py:1486` (u8-anm-ring) | muddled count of 4 vs 5 carbons | "Count the ring: two C=O carbons, the three CH₂ between them, and the shared O. Five carbons and one O make six." |
| U1 `content/u1/stage-cd.ts:1568` (u1-cd-phile-acn-role) | "the nitrile carbon has no place to form the ring's new sigma bond" | "Butadiene is the diene here: it has two C=C that can swing s-cis. Acrylonitrile's C=C is the electron-poor partner, and its C≡N only pulls density out of that C=C." |
| U1 `guide/u1Guide.ts:495` | "Put each group on the other partner and the gap still closes." | Say it is a different gap: the dienophile's HOMO now feeds the diene's LUMO. That is inverse demand. |
| U5 `demo/sequences.ts:7253-7310` (seq-mesylate) | chloride removes the proton | pyridine or Et₃N removes it, matching the lesson's MCQs |
| U0 `scripts/u0_pools.py` SN_TABLE 3° / good-nucleophile cell | "SN1 and E1" under a polar aprotic header | "slow; SN1/E1 only in protic solvent", per the CHEM 241 notes |
| U5 conceptIds (u5-ep-meet, u5-sd-*) | epoxidation and OsO₄ tagged `anti_addition_geometry` | tag as syn addition |
| U7 `beats/mcq/content.ts:660, :688` | acetal items tagged `oxidation_state_ladder` | use the acetal concept id |

---

## 3. Top 25 improvements (ranked by impact over effort)

Impact and effort are on a 1 to 5 scale. Each change is concrete.

1. **Play the harder questions that already exist.** `src/game/App.tsx:220`, `src/game/beats/BeatRunner.tsx:168` (`level = 1`), `beats/mcq/session.ts:77`. No caller passes a level, so roughly 125 level-2 MCQs in U3 to U8 and 35 in U1 never play in a lesson. They first appear in section tests, picked hardest first: for U5, 6 of the 10 questions in the first section test have never been seen. Change: have the recognise step play its L1 items, then its L2 items, each at its own declared level (copy `levelOf` from `beats/practice/PracticeRunner.tsx:68`). Until that lands, keep `testOutPool.ts` from drawing levels the lessons never play. (5/2)
2. **U1 unit exam passes on 3 answers.** `src/game/beats/practice/pools.ts:100`. Add `checkpointNodeId("u1")` to `EXAM_RUNS` so u1-check is scored as a whole set at 0.8, the same as U0 and U2. The code comment there says this is your call. (5/1)
3. **U8 opens on its hardest task.** `src/game/beats/template.ts:86` and `scripts/u8_pools.py:2875` (`UNWIRED = {"u8-ladder"}`). Lesson 1 is a level 2-3 drag-to-rank over text cards, while its six warm-up items and match board sit unwired. Wire that pool as meet and recognise steps, keep the sort as the order step, and draw the four cards (acetyl chloride, acetic anhydride, ethyl acetate, acetamide). (5/2)
4. **U10 opens on the wrong topic.** `src/game/beats/template.ts:87` maps u10-basicity to the HS⁻/OH⁻/F⁻/water nucleophilicity ladder, at rungs 2-3, with no nitrogen. The six amine basicity items are written and then popped in `scripts/u10_pools.py` build(). Delete the hold, remove u10-basicity from `HELD_NODES` in `src/game/test/u10Pools.test.ts` and set its count to 6, add an amine sort (cyclohexanamine > aniline > acetamide, derived from `basic_rank`), and rewrite `guide/u10Guide.ts:28-52`. The test that used to block this was already changed on 2026-10-20. (5/2)
5. **U0 never teaches.** `src/game/content/u0/story.ts:86-310` (STORY_CHAPTERS) is imported nowhere outside u0. The narration, the acetate arrows, the SN chart and "Clockwise is R" never show, and each chapter opens straight onto graded questions. Play each chapter's `scene.steps` as a tap-through card after the prime question. All the data is already there. (5/3)
6. **U4 asks for the full mechanism a lesson early, then repeats it twice.** `src/game/demo/pathwayMap.ts:240-242`. All three spine lessons play `seq-snar` (8 arrows), and lesson 1 plays it before the Meisenheimer lesson teaches where the charge goes. Remove it from u4-snar, make it the capstone of u4-lg-order, and give u4-meisenheimer a one-step resonance item. (5/2)
7. **U2 Frost circles graded, never taught.** u2-chg-frost-cp (`pools.ts:2697`), u2-chg-frost-trop (`:2737`), u2-ann-frost-cbd (`:1136`). Add an L0 worked meet in u2-huckel ("benzene: hexagon point down in a circle, 1 low, 2 matched (degenerate), 2, 1 high"), add a guide idea, and move the cyclobutadiene item ahead of the 5- and 7-ring items. (5/2)
8. **U3 sequencing's hardest slot is Orgo I.** `src/game/beats/synthesis/corpus.ts:47, 114, 186` ask about E2, hydroboration and a Grignard on an epoxide, with no benzene ring. Move these to an Orgo I review node and write three EAS gaps for u3-sequencing (e.g. benzene, then [?], then nitrobenzene, then Br₂/FeBr₃). Fix the comment at `beats/match/boards.ts:315`. (5/3)
9. **U6 IR says "Coming soon" with a board already built.** `pathwayMap.ts:285`, `beats/match/boards.ts:180-184`. Add `playable: { kind: "beat", id: "u6-ir" }`, cite a band table (OpenStax, with its licence), have you sign off the numbers, and add 5-6 MCQs. (5/3)
10. **Exams skip the side quests, including core topics.** `src/game/tabs/pathway/testOuts.ts:76-78` (`onLine` drops branches). Make these spine nodes: u4-benzyne, u5-cleavage, u5-alkoxymerc, u9-stork, u10-direct-alk, u10-gabriel, u10-hofmann-r, u10-hofmann-e, and consider u7-cyanohydrin and u7-ald-to-acid. The course outline counts these as examined. This is your decision. (5/2)
11. **Option captions give the answer away.** `src/game/beats/mcq/McqBeatView.tsx:359-361` shows each tile's IUPAC name. "Pick the thiol" has a tile labelled "ethanethiol" (U5), "Pick the ester" has "Methyl acetate" (U8), and the live U1 Q1 has "allyl cation". Hide captions (or show A, B, C) until after Check, and reveal the names in the answer tray. (4/2)
12. **Play pools easiest first.** U1 opens on sorts and draws, for example u1-rank-cation (`content/u1/stage-ab.ts:264`), and u1-hx-too-close is the second item. Sort each run queue by lowest level, keeping authored order for ties, in `run.ts`, or reorder in `scripts/u1_pools_ab.py` and `scripts/u1_pools_cd.py`. (4/2)
13. **U3 directing comes after the lessons that need it.** `pathwayMap.ts:211-216`. Move u3-directing straight after u3-arenium, and move u3-halo-nitro, u3-nit-ester, u3-nit-chloro and u3-sul-directs into it as apply items. Also put u3-fc-alkyl and u3-benzylic-ox on the spine, before u3-fc-acyl and u3-sequencing. (4/2)
14. **Wire the drafted exam ladders and boards.** `content/u3/pools.ts:3849-4192`, the u4 and u6 `*_UNWIRED` pools. Attach u3-dir-ladder-rate and u3-dir-match-class to u3-directing, u4-act-ladder to u4-snar, u4-exam-match-route to u4-benzyne, and u6-exam-match-split to u6-hnmr. Test-outs then pick them up on their own. (4/2)
15. **Checkpoints that test one lesson.** `src/game/beats/template.ts:274-294` (checkpointPlan) takes one step per slot, so the U6 check is u6-dou only and the U4 check is u4-snar only. Give U4 and U6 an `EXAM_SOURCES` entry in `beats/practice/pools.ts` that interleaves every spine lesson, as Unit 2's does. (4/2)
16. **Stem drawings that are the answer.** U4 u4-snar-meta-out, u4-lg-slowest and u4-dow-single (`scripts/u4_pools.py:965, 1182, 1483`) draw the keyed molecule above the question. Use a reagent-only stem instead. (4/1)
17. **U4 exam-level items hidden at rung 2.** In `scripts/u4_pools.py`, set u4-meis-oxygen (":1093"), u4-snar-two-cl and u4-bz-aryne to levels [1, 2], and order u4-bz-aryne before u4-bz-pct. (4/1)
18. **U7 protect lesson leans on later chemistry.** u7-pro-ester (`content/u7/pools.ts:971`) needs LiAlH₄ on esters and u7-pro-grignard (`:1088`) needs Grignard formation. Move them to the end of u7-hydride and u7-grignard, and add "Bromobenzene meets Mg in dry ether" before them. Do the same for u7-ch2-raney (`:2847`), which needs the thioacetal side quest: put a formation item first. (4/2)
19. **U10 three-step route before its parts.** u10-ds-route (`scripts/u10_pools.py:1784-1792`) needs aniline plus excess Br₂, which is first taught in u10-acyl-protect, the next lesson. Move u10-acyl-protect ahead of u10-diazonium. (4/1)
20. **U5 dehydration lesson ends on hydroxide E2.** `pathwayMap.ts:257` uses the `e2` trainer (2-bromopropane). Author a 3-step acid dehydration sequence on 2-methylbutan-2-ol (protonate, water leaves, lose H⁺). (4/3)
21. **U1 product picks with names only.** u1-hx-label-thermo, u1-hx-too-close, u1-hx-label-kinetic, u1-x2-chd-14, u1-x2-chd-warm (`content/u1/stage-ab.ts:4688, 4727, 4894, 5987, 6146`). Emit option tiles in `scripts/u1_pools_ab.py`. Same for u3-alk-fails (`content/u3/pools.ts:3059`) and the U4 product-set items. (4/2)
22. **U2 "n" means two things.** `content/u2/pools.ts:559`, u2-ann-meet-size: "n is the ring size". Use "the number in brackets is the ring size" and keep n for 4n + 2 only. (4/1)
23. **U9 resonance lesson plays the aldol.** `pathwayMap.ts:360` points u9-enolate-res at `seq-aldol`, six lessons before the aldol. Use an enolate-formation-only trainer or the resonance surface. (4/2)
24. **Prompts that point back at the previous screen.** "That (R) tosylate", "That TBS ether", "instead" (U5 `pools.ts:506, 1450, 304`), and "that complex", "Same four substrates", "those two carbons" (U4 `u4_pools.py:1079, 1182, 1377`). Test-outs shuffle the order, so make every prompt stand alone. (3/1)
25. **Ladders lose their drawings in tests.** `src/game/tabs/pathway/TestOutRun.tsx:165` and `beats/practice/PracticeRunner.tsx:265` only look up U1/U2 sort figures. Use the full fallback chain from `PoolItemsStep.tsx:89`. (3/1)

Close behind: U1 norbornene draw before the bridged lesson (`stage-cd.active.ts:648`), U0 test-out made from the 9 easiest seen items (`content/u0/pools.ts:8437`), U0 briefs that state the answer ("Methyl carbon, strong nucleophile.", `pools.ts:2125`), U2 1,4-dihydro "Atom C" letters on skeletal drawings, U6 basic triplet/quartet never practised (add chloroethane items before the septet, `pools.ts:608`), U4 u4-lg-bromo-fluoro solvable without activation (swap to 1-bromo-4-fluoro-2-nitrobenzene; OPSIN checked), and U8 test-out reusing lesson items.

---

## 4. Difficulty

### Per unit

| Unit | Read | Why |
|---|---|---|
| U0 Start here | Too easy, with two too-hard spots | Three-option recognition, about 8 items on HO⁻ + CH₃Br, no arrows, no R/S. The test-out is the 9 easiest items, already seen. Ch7 grades SN1/E2 calls without the chart shown, and ch9 grades 15 Orgo II previews (make them ungraded). |
| U1 Dienes | Right to slightly easy (A, B); short of exam in D | Good feedback. Pools open on their hardest items. The exam clears at 3. The endo adduct with wedges is never drawn. |
| U2 Aromaticity | Too easy, flat | 0 L2 MCQs. Stops at textbook species: no fused or two-heteroatom rings, no tropone, no azulene dipole, no basicity ranking. |
| U3 EAS | Right through the reactions, too easy at the top | The ceiling is "pick 1 of 3 orders". No rate ranking (drafted, unwired), no written 3-4 step synthesis, no aniline or phenol traps. |
| U4 SNAr/benzyne | Too easy on the spine | No drawing, no SNAr vs benzyne choice (unwired), the same "F beats I" fact four times. The side quests are about right but repeat each other. |
| U5 Alcohols, ethers | Too easy in lessons, unfair jump at tests | Every hard item is L2 and never played, then 6 of 10 section-test items are new. No reagent choice, no roadmaps. |
| U6 Spectroscopy | Too easy | Counting only. No spectra shown, no shifts, no IR, no fragmentation, no structure from data. |
| U7 Aldehydes, ketones | Too easy | All three-option, implausible distractors, no draws, no syntheses. Same 20 exam questions every retake. |
| U8 Acid derivatives | Too hard at lesson 1, too easy after | 62 of 145 items are "Pick the product". No L3, no draws. |
| U9 Enolates | Right for 9a, too easy for 9b/9c and the retro capstone | 0 L2 across 26 nodes. The capstone re-asks earlier molecules backwards. No "1) 2) 3)" questions, and the outline says those are about half of Act 3. |
| U10 Amines | Too easy on the spine | 0 L2 across 15 nodes. No diazonium synthesis planning, no anti/syn geometry. Core reactions are side quests. |

Common pattern: lessons sit at rung 1, tests jump, and the exam's production tasks (draw, push arrows, plan a synthesis) are almost absent.

### Adaptive difficulty: the simplest design that fits today's code

- **Signals.** (a) An optional one-tap row on the reward card: Too easy / About right / Too hard (`RewardSlot`, `BeatRunner.tsx:818`). (b) First-try accuracy, which the run already computes (`clearedBeats/totalBeats`, `recycled`, `missedMcqIds`). (c) `elapsedMs`, used only as a tie-breaker, because it measures reading speed as much as chemistry.
- **State.** A per-unit pace of -1, 0 or +1. It is derived from the journal by a pure function and never stored as a number, matching the repo's f(journal) rule. A tap wins. Otherwise pace goes to +1 after two flawless, recycle-free lessons in a row, and to -1 when first-try accuracy is under 50%. It decays to 0 on "About right" or a mixed result. This needs one new event, `lesson_rated {nodeId, rating}`, in `packages/economy/src/journal.ts` (union plus validator) and `rateLesson()` in `app/progress.ts`. Accuracy needs no new event, because `node_cleared.flawless` is already journalled.
- **What changes.** At +1: skip the meet step, play the node's L2 items first and then at most 2 L1, and offer the section test as "Skip ahead". Challenge plays L2 where it exists. At -1: keep the meet step, play L1 only, and add "Read the guide for this lesson" and flashcards to the reward card. Nothing is locked and diamonds are not touched. A node with fewer than 2 L2 items falls back to L1, so the run is never empty.
- **Where it lives.** A new pure module, `src/game/beats/pace.ts` (`paceFor(journal, unitId)`), and `planLesson(node, {pace})`. BeatRunner picks the list and level per step. Do not implement `MasterySource` (`beats/types.ts:659`); it is unused and overlaps Phase 6.
- **Mechanism nodes.** The trainer reports only solves, never misses. On nodes with a mechanism step, derive pace from the tap alone.
- **Tests.** `pace.test.ts` with hand-built journal fixtures, never the DEV `&flags=` clears (they fake the journal). Template tests: `planLesson('u5-roh-rx',{pace:1})` has no meet step and includes u5-rx-shift, u5-rx-noshift and u5-rx-which-shifts, and `planLesson('u9-aldol',{pace:1})` falls back to L1 and is not empty. A round-trip test for the `lesson_rated` validator. A coverage test that prints the count of nodes with fewer than 2 L2 items, reported and never padded.
- **What blocks it.** U9, U10 and U2 have nothing at L2, and every node has exactly one easier item. See section 6.

---

## 5. First-time visitor issues (live site, build of 21 Oct)

1. **Developer notes on the Train tab.** `src/game/tabs/trainer/ProblemBrowser.tsx:39` and `:56` render "161 of 208 nodes playable" and notes like "Arguably folds into Units 3 and 5." Remove the score line and the `{unit.note}`, or swap in student-facing one-liners. (Already listed as item 16 in SITE-REPLAN.md.)
2. **Three different lesson counts.** The landing page says "12 lessons", #/learn says "0 of 21 lessons finished" even after a lesson, and #/app says "1 of 109". The marketing "Unit 1" (a reading page) and the game's Unit 1 are different things. Rename the marketing items "Unit notes" and use one count everywhere.
3. **Everything after Unit 1 is locked, with no test-out visible.** A week-10 student cannot reach carbonyls. Unit 7 says "Finish Unit 1 to open this." Add "Test out of Unit 1" on locked pages (`testOuts.ts` exists). Change "15 units" to "12 units ready, 3 coming", and change "Free for now." to "Every unit is free while Blueberry is in beta."
4. **Placeholder section names.** Live shows "Part 1, Part 2..." for every unit but U1. The repo fixed u3/u5/u7/u8/u9 on 23 Oct (c09bc62). Deploy, and add `SECTION_ENDS` for u2, u4, u6, u10, u11 and u14 in `pathwaySections.ts`.
5. **The first lesson gives answers away, then jumps.** Q1's tile is captioned "allyl cation" (improvement #11). Q4 (`content/u1/stage-ab.ts:167`, level 2) asks the student to draw a cation on an empty canvas, on screen 4 of lesson 1, with chemistry from section 2. Add a one-tap item first ("H⁺ adds to C1: which carbon carries the +?"), start the canvas with the diene drawn, number C1 to C4, and disable CHECK on an empty board.
6. **The "why yours is wrong" text is folded away.** On a wrong pick, open the chosen option's "why" by default, under "Why yours isn't it".
7. **Molecules too small.** About 50-60 px in roughly 510 px cards, and the "1" overlaps the "+". Set a minimum bond length of about 30 px and offset atom numbers away from charges.
8. **Arrow stage gives no feedback on a missed drag.** UNDO lights up after a no-op. Pulse the handles on entry, say "Drop it on an atom or bond", and keep the progress bar continuous across stages.
9. **CTA overpromises.** "Start the first lesson ... About two minutes" goes to the Path. Point it at `#/app/lesson/u1-allylic` for new visitors, or relabel it.
10. **Rewards look broken on day one.** The first lesson earns 13 of 20 XP, so the streak stays at 0, and "Get 5 right" shows 0/5 after several right answers (cause unverified). Make day one's goal one lesson, count lesson answers toward the quest, and label the header icons.
11. **Smaller.** The map says "Section" and the guidebook says "Stage", with different boundaries. The headline changes between phone and desktop and never says "Organic chemistry II · UMD CHEM 241/242". The draw canvas is white in dark mode. "Point at a place to see it on the phone" is unclear. 97 U1 items are still flagged `placeholder: true`.

---

## 6. Content to author

Author one part at a time. Every key goes through its generator script with RDKit/OPSIN. Nothing from recall.

**Across all units**
- Draw items: at least one "Draw the product" per spine lesson, using the draw kind that already exists. U4, U5, U6 and U7 have none.
- Level 2 items: 2 per spine node in U2, U9 and U10, which have 0 today. First re-tag items that are already hard (U9: u9-in-oct, u9-cl-dead, u9-rob-wm, u9-mal-ring, u9-cc-ketone, u9-cu-quat, u9-di-mechx; U10: u10-ra-retro, u10-nr-route, u10-ds-route, u10-ap-route, u10-he-tert; U2: u2-chg-acid-pick, u2-het-imid-base, u2-het-dhp, u2-ann-10). Also 2 per node for u5-oxidation, u5-thiols, u8-tetrahedral, u8-to-anhydride, u8-lialh4 and all of U4.
- One more L0 worked item per spine node, so "too hard" has somewhere easier to go.
- Exam-only twins: same skill, new molecule, kept out of lesson pools, so test-outs stop replaying lesson screens (U2 14, U6, U8, U3).
- Better distractors: swap each throwaway (toluene, "Hydrogen gas", "No reaction", the unchanged starting material) for a real mistake, and add a fourth option where one exists.

**By unit**
- **U0**: assign R/S yourself (rank the groups on 2-butanol, then CC[C@@H](C)Br is R and CC[C@H](C)Br is S, both RDKit-checked); carbocation stability ladder; propene + HBr (Markovnikov, order unverified); formal charge on C⁺ and H₃O⁺; protic vs aprotic; "pick the more substituted alkene"; a capstone, (R)-2-bromobutane + CN⁻ gives the S nitrile (RDKit). Wire real arrow steps (sn2-demo-step, res-acetate).
- **U1**: endo draws with wedges (cyclopentadiene + methyl acrylate; (2E,4E)-hexa-2,4-diene + maleic anhydride); NBS draws where both ends differ (hex-1-ene, methylenecyclohexane); reverse "pick the conditions" items; real hetero Diels-Alder, or retitle u1-ied.
- **U2**: Frost meet; indole and purine "which N's pair is in the ring"; oxazole/thiazole; tropone and cyclopropenone; "which bromide ionises"; basicity of pyridine, pyrrole and piperidine; azulene dipole; nomenclature meet plus 3-substituent names.
- **U3**: rate ranking; build-the-route sort ladders (m-chloropropylbenzene, 2-bromo-4-nitrotoluene, 4-bromo-2-nitrotoluene, "which route fails"); aniline/phenol traps (tribromination, no Friedel-Crafts on aniline, acetanilide protection); I₂ needs an oxidant; briefs for the 93 items that have none.
- **U4**: a 3-step chain (chlorobenzene, nitrate twice, NaOCH₃, giving 2,4-dinitroanisole, OPSIN checked); drawn Meisenheimer complex; drawn benzyne product sets; guide figures (arrows, a two-hump energy diagram).
- **U5**: a reagent-choice item per Stage A lesson; a closing roadmap lesson; an inversion that keeps the letter ((R)-1-methoxypropan-2-ol to the (R) nitrile, RDKit); selective tosylation; epoxide + water alone; benzylic ether SN1 racemisation; HCl does not cleave ethers; triflate; acid dehydration trainer.
- **U6**: a structure-from-data block (C₄H₈O₂ and C₄H₈O sets, n+1 checked by RDKit); IR items (cited table); a qualitative shift rung (ethyl acetate vs methyl propanoate); stick spectra and multiplets drawn from computed data; fragmentation (butan-2-one 43/57); triplet and quartet basics.
- **U7**: rung-3 draws; a "Unit 7 synthesis" lesson with 4-option reagent roadmaps; imine pH; organolithium; making the Wittig ylide.
- **U8**: an acidity lesson (cited pKa); LiAlH(OtBu)₃ and LiAlH₄ on acyl chlorides; ester + NH₃; acid + amine salt trap; 2-4 step syntheses; held-out test variants.
- **U9**: Keq / which side of the equilibrium (words, not arithmetic); H/D exchange count (5 for butan-2-one); alpha racemisation; enol content of 1,3-diketones; new retro targets that need a choice of route; 8-10 new substrates.
- **U10**: diazonium order-of-steps syntheses (3-bromophenol, 4-methylbenzonitrile, 1,3-dibromobenzene); anti-periplanar Hofmann and syn Cope geometry (RDKit 3D); the Hofmann isocyanate intermediate; diazonium warmed above 5 °C gives phenol; N-nitrosamine.
