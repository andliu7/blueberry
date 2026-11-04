# Unit 3 plan: Electrophilic Aromatic Substitution (4 Nov 2026)

Round 1 draft, written before any generator is touched (UNIT-STYLE-GUIDE.md 8h). Nothing here is
built. All chemistry below is a claim still to be derived. Each species is given as SMILES, and the
RDKit table at the end names the script that will check it. Every species named in a worked example
or a new drawing was run through `scripts/u3_pools.py`'s own model on 4 Nov (a scratch check, 61
checks, all passed; see "RDKit derivations"). The model also logged one refusal, for mesitylene; that species was replaced, as recorded there.

Where this file lives: the run brief says `documentation/unit-plans/UNIT-3-PLAN.md`; style guide 8h
says `documentation/UNIT3-PLAN.md`. ASK which path the later units should use.

## What exists today, and what this plan changes

Kept, because it exists and works:
- The 12 spine lessons and 2 playable side quests on the map (`src/game/demo/pathwayMap.ts`, unit
  `u3`). Their pools (`scripts/u3_pools.py` writes `src/game/content/u3/pools.ts`, 89 entries) stay:
  every answer comes from the generator's classifier, sigma-complex walk and reaction edits.
- The teach/assume chain in `content/u23/lessonLinks.ts`, the explainers, walkthroughs and video slots
  in `content/u23/lessonPath.ts`, the guide (`scripts/guide_u3.py`), the section decks
  (`scripts/section_decks.py` writes `cards/sections/u3.generated.ts`), the four EAS trainers
  (`seq-eas`, `seq-eas-br`, `seq-sulfonation`, `seq-fc-acyl` in `demo/sequences.ts`) and the three
  synthesis gaps (`syn-u3-acyl-then-nitrate`, `syn-u3-bromo-aniline`, `syn-u3-nitro-acid`, checked
  by `scripts/u3_synthesis_gaps.py`).
- The 23 Oct audit order: directing straight after the arenium lesson, and alkylation and benzylic
  oxidation on the main line.

What is missing against the 3 Nov template (the reason for this plan):
- **No stages.** Unit 3 is one flat line of 12 lessons with no stage quiz. Sections are cut by length.
- **No production.** All 87 practice questions are MCQ; there is one ladder and one match board.
  There is no drawing, and no synthesis inside a lesson. The exam's three largest slots for this
  topic are mechanism, synthesis and prediction (outline section 6, about 29 points).
- No worked examples, no fade line, no say-why mix-ups, no Orgo I callback cards, no `u0:` primers
  for what the unit assumes, and no named cause on any MCQ wrong option (only the ladders carry causes).
- Most practice items are L1. There are no L3 items, and the unit has no exam ids
  (`U3_UNWIRED.u3-exam` plays nowhere).
- `u3-arenium` and `u3-nitration` both play `seq-eas`. No trainer pushes the three arenium resonance
  forms, which the exam front matter requires ("draw all resonance structures").

New: 4 stages with a quiz each, 4 new spine lessons (`u3-activation`, `u3-two-groups`,
`u3-seq-flip`, `u3-synthesis`) and 4 quizzes (`u3-quiz-a` to `u3-quiz-d`). Each practice lesson
gets a drawing or synthesis item, and each lesson gets a worked example and a fade line. Also new:
say-why lists, callback cards and primers, about 10 new cause ids, and a resonance trainer
(`res-arenium`) for the arenium lesson.

Moved:
- The `u3-directing` pool (14 items) is split three ways, into `u3-directing`, `u3-activation` and `u3-two-groups`.
- `u3-benzylic-br` moves from after `u3-halo` to Stage C, and `u3-birch` from after `u3-directing` to Stage C.
- The `u3-sequencing` pool is split: the flip items go to `u3-seq-flip`, and the three synthesis gaps go to `u3-synthesis`.
- In `U3_UNWIRED`, `u3-dir-ladder-rate2` goes to `u3-quiz-a`, `u3-exam-match-flip` to `u3-seq-flip`, and
  `u3-exam-match-toluene` to the unit exam.

Dropped from the Unit 3 map (ASK): the four poolless named-reaction side quests, `u3-ghh`,
`u3-vilsmeier`, `u3-kolbe` and `u3-reimer`. The outline gives them no exam weight. Kolbe and Reimer
already say "Shared with Unit 11", so they would live there only. `u3-gk` (Gattermann-Koch) stays,
as Stage B's side quest, because the outline names formylation "a named extra" and Chad's Prep 18.1
lists it.

## Header
- Unit id: u3
- Title: Electrophilic Aromatic Substitution
- Outline topics: `aromatic_substitution`, `eas_directing_effects` (including its "order of operations in aromatic synthesis" and "acylate then reduce" skills), `arene_side_chain_chemistry` (benzylic oxidation on the line; benzylic bromination and Birch as side quests). Not here: `nucleophilic_aromatic_substitution` (Unit 4), `phenols` reactions (Unit 11), `diazonium_chemistry` (Unit 10).
- Exam slots fed:
  - mechanism: F13, arrows with every arenium form drawn.
  - synthesis: F14, Act 1 rule, so every carbon of the starting material must end up in the product.
  - prediction: F16, all three directions.
  - conceptual: F7, rank by reactivity, and F9, explain under a word limit.
  - Not fed: pKa (only through spacing), spectroscopy.
  - Weight: `aromatic_substitution` plus `eas_directing_effects` is about 29 of 100 points on the Act 1 exam. `arene_side_chain_chemistry` is about 5, shared with ethers, and benzylic oxidation's weight is "low and falling" (outline section 3).
- Assumes from earlier units: u2:ring-resonance, u2:huckel, u2:induction, u2:donor-withdrawer, u2:opm, u2:keq-pka (spacing only), u1:cation-ranking, u1:allylic, u1:allylic-halogenation (side quest only), u0:resonance, u0:carbocation, u0:rearrangement (new primer), u0:lewis-acid (new), u0:equilibrium, u0:oxidation-level (new), u0:radical, u0:retrosynthesis (new)
- Cross-cutting concepts:
  - Introduced: none from outline section 5. ASK whether "order of operations" should become a ConceptId (`aromatic_order_of_operations`). It is the assessed skill, and Unit 10 (diazonium) reuses it.
  - Reused: `ewg_edg_rubric`, `resonance_delocalisation`, `carbocation_rearrangement`, `radical_stability` (side quest).
  - The pools also tag `oxidation_state_ladder` and `protecting_group_strategy`, but outline section 5 does not list this unit in either `reusedIn`. ASK whether to add `aromatic_substitution` to both.
- Sources checked:
  - OpenStax Organic Chemistry ch. 16, sections 16.1 to 16.5 and 16.9 to 16.11 (CC BY-NC-SA, a check only, as the generator header records).
  - Chad's Prep ch. 18, "Reactions of Aromatic Compounds", 18.1 to 18.5 and 18.7, fetched 4 Nov. Topic list at `scratchpad/units/chads/unit-3.txt`.
  - The exam record as summarised in COURSE-OUTLINE-ORGO2 sections 3, 6 and 7. The raw exams were not reopened.
  - LibreTexts: not checked this round.
- Status: draft

## Stages

| Stage | Topic | Main line (lesson ids in order) | Side quests | Ends on |
|---|---|---|---|---|
| A | Why the ring attacks, and where | u3-arenium (video), u3-directing, u3-activation (new), u3-two-groups (new) | none | u3-quiz-a |
| B | Making the electrophile: five reactions | u3-halo (video), u3-nitration, u3-sulfo, u3-fc-alkyl, u3-fc-acyl | u3-gk (Gattermann-Koch; no pool yet, ASK) | u3-quiz-b |
| C | Changing a group once it is on (the flips) | u3-nitro-red (video), u3-c-to-ch2, u3-benzylic-ox | u3-benzylic-br (moved), u3-birch (moved) | u3-quiz-c |
| D | Order of operations | u3-sequencing (video), u3-blocking, u3-seq-flip (new), u3-synthesis (new) | none | u3-quiz-d |

Why this order:
- Stage A puts theory above every reaction (8a). Owner rule: context (resonance, EWG/EDG) comes before ortho/meta/para. Stage A argues o/m/p from the arenium forms. Recall comes later.
- Stage B is the course's own "reaction/reagent table" block (Chad 18.1 and 18.2). Alkylation comes before acylation because acylation's payoff needs alkylation's failure first (23 Oct audit).
- Stage C collects every reaction that changes a group's directing class. Stage D needs those flips.
- Blocking sits in D, not B, because blocking is a sequencing tactic. It needs sulfonation (B), which is above it.
- No spine lesson assumes a side quest. Stage C's side quests assume u1:allylic-halogenation, u0:radical and u2:donor-withdrawer only.

## Lessons (one block per lesson)

Kind and level are written as `id (mcq L1)`. "new" marks an item to author. Every other id exists in
`content/u3/pools.ts`. Production items (draw, synthesis, trainer) play last.

### u3-arenium: The arenium (sigma complex) mechanism
- Stage / kind / role: A / spine / video
- Teaches: u3:arenium
- Assumes: u2:ring-resonance, u2:huckel, u1:cation-ranking, u0:resonance
- Primer:
  - Big question: an alkene adds Br2 and keeps both Br. Why does benzene keep only one?
  - Pretest item: u3-aren-which
  - Ideas: (1) the ring's pi electrons attack E+, so the ring is the nucleophile; (2) the attacked carbon goes sp3 and the ring stops being aromatic; (3) the + sits on three carbons, never the sp3 one; (4) losing H+ restores aromaticity, so substitution beats addition.
- Worked example: cumene `CC(C)c1ccccc1` with Br2, FeBr3, attacked para to the isopropyl group.
  - Steps:
    1. Mark the attacked carbon sp3.
    2. Put the + on its neighbour.
    3. Walk the + along the C=C bonds: three forms, with the + on carbons 2, 4 and 6 counted from the sp3 carbon.
    4. Notice that one form puts the + on the ring carbon that carries the isopropyl group. That form is a 3° cation (this sets up Stage A's later lessons).
    5. Base removes H+ from the sp3 carbon to give `CC(C)c1ccc(Br)cc1`.
  - Figure: the three forms with curved arrows (8e resonance row), from `u3_pools.sigma_at(cumene, "para")`. The derived walk is 3 carbon forms, 0 extra forms.
  - The first choice, mesitylene, was REFUSED by the model (every site sits between two groups), so it was replaced.
- First step (fade line): "First step: find the carbon the electrophile bonds to. It goes sp3 and drops out of the ring's loop."
- Practice (play order):
  - Recognise: u3-aren-meet-where (mcq L0), u3-aren-sp3 (mcq L1), u3-aren-pi (mcq L1), u3-aren-count (mcq L1), u3-aren-rearom (mcq L1), u3-aren-which (mcq L1).
  - Reason: u3-aren-tert (mcq L2), u3-aren-anisole (mcq L2).
  - Produce: new res-arenium, a resonance trainer that pushes the + round the ring, all three forms, L2. Then seq-eas-br (trainer L3).
- Why items:
  - u3-aren-rearom ("why lose H+ rather than add Br−") pairs with the seq-eas-br product step.
  - u3-aren-tert pairs with u3-aren-count.
- Say-why mix-ups:
  1. "The electrophile adds across one C=C, as it would to an alkene." Fix: the cation loses H+ instead, because that restores the aromatic ring; adding the anion would leave a non-aromatic diene.
  2. "The sp3 carbon carries the + in one of the forms." Fix: the sp3 carbon has four bonds and no empty p orbital; the + only visits the three sp2 carbons ortho and para to it.
- Picture: resonance row. All three arenium forms with arrows from RDKit bond orders, plus the turnable flat ring for the sp3 carbon (spatial row). The sp3 carbon visibly leaves the plane of p orbitals.
- Video slot: 3 minutes, kept from VIDEO_SLOTS. Shows:
  - "The electrophile met by the pi cloud"
  - "The cation spread over three carbons"
  - "H+ leaving and the ring closing again"

### u3-directing: Where the second group goes
- Stage / kind / role: A / spine / practice
- Teaches: u3:directing
- Assumes: u3:arenium, u2:donor-withdrawer, u2:induction, u2:opm
- Primer:
  - Big question: why does a group already on the ring decide where the next one lands?
  - Pretest item: u3-dir-phenol
  - Ideas: (1) attack o or p, and one arenium form puts the + on the carbon carrying the group; meta attack never does; (2) a lone pair on the first atom can share that +, so donors send o/p; (3) a withdrawer next to a + is the worst form, so withdrawers send meta, the least bad position; (4) reason it from the forms, do not recall a list.
- Worked example: ethoxybenzene `CCOc1ccccc1` with Br2, FeBr3. Ethoxybenzene is in no Unit 3 pool.
  - Steps:
    1. Classify X: O with lone pairs, so a donor.
    2. Draw the arenium for ortho, meta and para attack.
    3. Only o and p give a form with the + on C1. O's lone pair adds a fourth form in which every atom has an octet.
    4. So the majors are `CCOc1ccc(Br)cc1` and `CCOc1ccccc1Br`, and meta `CCOc1cccc(Br)c1` is not a major (derived).
  - Figure: the meta and para areniums side by side, the extra oxonium form highlighted.
- First step (fade line): "First step: look at the first atom of the group on the ring. Does it have a lone pair, a + or a double bond to O?"
- Practice (play order):
  - Recognise: u3-dir-phenol (mcq L1), u3-dir-acetanilide (mcq L1), u3-dir-ethyl (mcq L1), u3-dir-bromo (mcq L1), u3-dir-cn (mcq L1), u3-dir-cf3 (mcq L1).
  - Connect: u3-dir-match-class (match L1).
  - Reason: u3-dir-bad-count (mcq L2), u3-dir-why-nitro (mcq L2).
  - Produce: new u3-dir-draw-cumene (draw L3). Nitrate `CC(C)c1ccccc1` and draw a major product; either `CC(C)c1ccc([N+](=O)[O-])cc1` or the ortho isomer is accepted, because the model does not rank o against p.
- Why items:
  - u3-dir-why-nitro pairs with u3-dir-cn.
  - u3-dir-bad-count pairs with u3-dir-draw-cumene.
- Say-why mix-ups:
  1. "A withdrawer sends the electrophile meta because it makes meta electron rich." Fix: a withdrawer drains every position; meta is only the least drained, because meta attack never puts the + next to the group.
  2. "A group directs to the carbons nearest it, so every group directs ortho." Fix: position comes from where the arenium's + can sit; meta attack never puts the + on the group's carbon.
- Picture: resonance row (o/m/p areniums with arrows), and the match board as the connect step. No list of directors in the prompt.
- Video slot: n/a. A practice lesson; the existing 3-minute slot moves to u3-arenium's "shows" list or the guide (ASK).

### u3-activation: Fast rings and slow rings (new)
- Stage / kind / role: A / spine / practice
- Teaches: u3:activation (new concept id)
- Assumes: u3:directing, u2:induction, u2:energy-keq
- Primer:
  - Big question: two rings and one flask of Br2. Which ring reacts first, and why?
  - Pretest item: u3-dir-why-fast
  - Ideas: (1) a donor lowers the barrier to the arenium; a withdrawer raises it (the Unit 2 energy diagram); (2) rate tiers, fastest first: lone-pair donor, alkyl, plain benzene, halogen, withdrawer; (3) halogens are the exception: induction slows the ring, the lone pair still steers o/p.
- Worked example: rank ethoxybenzene `CCOc1ccccc1`, cyclohexylbenzene `C1CCC(CC1)c1ccccc1` and methyl phenyl sulfone `CS(=O)(=O)c1ccccc1` by EAS rate.
  - Steps:
    1. Classify each first atom. The derived classes are donor, alkyl and withdrawer.
    2. Place each in its tier.
    3. Read the order off the tiers: ethoxybenzene, then cyclohexylbenzene, then methyl phenyl sulfone.
  - Figure: one energy diagram with three humps (8e "rate vs stability" row).
  - The model ranks tiers only, never two groups in one tier, so the example holds one ring per tier.
- First step (fade line): "First step: sort each ring into its tier: lone-pair donor, alkyl, plain, halogen or withdrawer."
- Practice (play order):
  - Recognise: u3-dir-why-fast (mcq L2), u3-dir-cl-why (mcq L2), new u3-act-halo-tier (mcq L1, "halobenzene faster or slower than benzene").
  - Order: u3-dir-ladder-rate (sort L2).
  - Produce: new u3-act-draw-compete (draw L3). Anisole `COc1ccccc1` and nitrobenzene `O=[N+]([O-])c1ccccc1` compete for one equivalent of Br2, FeBr3; draw the product. The key is `COc1ccc(Br)cc1` or its ortho isomer, derived from the tiers.
- Why items:
  - u3-dir-why-fast pairs with u3-dir-ladder-rate.
  - u3-dir-cl-why pairs with u3-act-halo-tier.
- Say-why mix-ups:
  1. "Halogens direct o/p, so they speed the ring up like other o/p directors." Fix: direction and speed are two questions; induction makes a halogen slow the ring, and the lone pair still decides position.
  2. "A group that pulls by induction cannot donate by resonance." Fix: both act at once; for O and N the resonance donation wins, for halogens the inductive pull wins.
- Picture: the sort ladder for the ranking, and one energy diagram reused across the lesson. Never a list in the prompt.
- Video slot: n/a

### u3-two-groups: Two groups on the ring (new)
- Stage / kind / role: A / spine / practice
- Teaches: u3:two-groups (new concept id)
- Assumes: u3:activation, u3:directing
- Primer:
  - Big question: two groups disagree about where the next one goes. Who wins?
  - Pretest item: u3-dir-compete
  - Ideas: (1) when both point at the same carbon, that is the answer; (2) when they disagree, the group in the faster tier wins; (3) a carbon squeezed between two groups is usually skipped. Idea 3 is not modelled yet; see ASK.
- Worked example: N-(4-methylphenyl)acetamide `CC(=O)Nc1ccc(C)cc1` with Br2, FeBr3.
  - Steps:
    1. Classify both groups: NHAc is a donor (lone pair on N), CH3 is alkyl.
    2. The donor tier is faster, so NHAc decides.
    3. Its o/p sites: para is taken, so the Br goes ortho to NHAc, giving `CC(=O)Nc1ccc(C)cc1Br` (derived, single major).
  - Figure: the ring with each group's preferred carbons tinted.
- First step (fade line): "First step: classify both groups and find which one sits in the faster tier."
- Practice (play order):
  - Recognise: u3-dir-agree (mcq L1), u3-dir-compete (mcq L2).
  - Connect: new u3-two-match (match L2). Four disubstituted rings matched to the carbon that reacts, each derived by `eas_major`; the rings are chosen at generation so that none is flanked.
  - Produce: new u3-two-draw-agree (draw L3). Brominate 4-nitrotoluene `Cc1ccc([N+](=O)[O-])cc1`; the key is `Cc1ccc([N+](=O)[O-])cc1Br`. Both groups agree on that carbon (derived, single major).
- Why items: u3-dir-compete pairs with u3-two-match.
- Say-why mix-ups:
  1. "When two groups disagree, the withdrawer wins because it acts more strongly." Fix: the faster-tier group wins, because it lowers the barrier to its own sites the most.
  2. "Two groups always give a mixture, so no single answer exists." Fix: when both point to the same carbon, or one group clearly outranks the other, one carbon is the major site.
- Picture: skeletal structure with site markers (any-molecule row), and the match board.
- Video slot: n/a

### u3-quiz-a: Stage A checkpoint
- Stage / kind / role: A / spine / quiz
- Teaches: none (checkpoint)
- Assumes: u3:arenium, u3:directing, u3:activation, u3:two-groups
- Primer: n/a (quiz)
- Worked example: n/a
- First step (fade line): n/a
- Practice: 8 items, every one L2 or L3, no hint.
  - u3-dir-ladder-rate2 (sort L2, moved from U3_UNWIRED)
  - new u3-qa-meta-forms (mcq L2: why meta attack never gives a form with + on the group's carbon)
  - new u3-qa-why-halogen (mcq L2)
  - new u3-qa-two-groups (mcq L2)
  - new u3-qa-space-u2-pka (mcq L2, spacing)
  - new u3-qa-space-u1-cation (mcq L2, spacing)
  - new u3-qa-draw-dir (draw L3)
  - new u3-qa-draw-two (draw L3)
  - Species for the new quiz items are picked at generation from rings no Stage A lesson draws, and each passes `eas_major`. None are named here, so none are claimed yet.
- Why items: u3-qa-meta-forms and u3-qa-why-halogen.
- Say-why mix-ups: the quiz uses the lesson lists by concept, as `u1-quiz-a` does (`sayWhyMixups.ts`).
- Picture: as the lessons.
- Video slot: n/a

### u3-halo: Halogenation
- Stage / kind / role: B / spine / video
- Teaches: u3:halogenation, u3:electrophile-making (new id, shared by Stage B)
- Assumes: u3:arenium, u3:directing, u0:lewis-acid
- Primer:
  - Big question: Br2 adds to an alkene on its own. Why does benzene need FeBr3?
  - Pretest item: u3-halo-meet
  - Ideas: (1) the aromatic ring is a weaker nucleophile than an alkene, so the electrophile must be made stronger; (2) the Lewis acid takes Br− and leaves Br+ to be delivered; (3) the Lewis acid carries the same halogen, so the product is not scrambled; (4) directing still decides where it lands.
- Worked example: ethyl benzoate `CCOC(=O)c1ccccc1` with Br2, FeBr3.
  - Steps:
    1. FeBr3 binds Br2 and makes it Br+ like.
    2. Classify the ester group: C=O on the first atom, so a withdrawer that sends meta.
    3. Attack at meta, then lose H+, giving `CCOC(=O)c1cccc(Br)c1` (derived, single major).
  - Figure: the Br2-FeBr3 complex and the product.
  - Methyl benzoate is in u3-nitration's pool; ethyl benzoate is in none.
- First step (fade line): "First step: let the Lewis acid pull one halogen off as X−. The other is now the electrophile."
- Practice (play order):
  - Recognise: u3-halo-meet (mcq L0), u3-halo-cl (mcq L1), u3-halo-tol-out (mcq L1), u3-halo-nitro (mcq L1), u3-halo-anisole (mcq L1), u3-halo-vs-nbs (mcq L1).
  - Reason: u3-halo-pxylene (mcq L2).
  - Produce: seq-eas-br (trainer). Then new u3-halo-draw-acetanilide (draw L3): brominate acetanilide `CC(=O)Nc1ccccc1`; the key is `CC(=O)Nc1ccc(Br)cc1` or the ortho isomer.
- Why items:
  - u3-halo-vs-nbs pairs with u3-halo-cl. This is the outline's near-miss pair, NBS against Br2 with a Lewis acid.
  - u3-halo-pxylene pairs with u3-halo-draw-acetanilide.
- Say-why mix-ups:
  1. "FeBr3 is a reagent that ends up in the product." Fix: the Lewis acid is regenerated; it only makes the halogen electrophilic.
  2. "Br2 alone brominates benzene the way it brominates an alkene." Fix: the aromatic ring is too weak a nucleophile for plain Br2; it needs the Lewis acid.
- Picture: mechanism row (trainer), plus skeletal reactant and product.
- Video slot: 2 minutes, kept. Shows:
  - "The Lewis acid making the electrophile"
  - "The three arenium moves"
  - "A directed product"

### u3-nitration: Nitration
- Stage / kind / role: B / spine / practice
- Teaches: u3:nitration
- Assumes: u3:electrophile-making, u3:directing
- Primer:
  - Big question: where does NO2+ come from, and why does nitration stop after one?
  - Pretest item: u3-nit-electrophile
  - Ideas: (1) H2SO4 protonates HNO3, which loses water to give NO2+ (Orgo I acid-base: the stronger acid protonates the weaker); (2) NO2 is a withdrawer, so the product is slower than benzene and the reaction stops; (3) a second nitro goes meta.
- Worked example: fluorobenzene `Fc1ccccc1` with HNO3, H2SO4.
  - Steps:
    1. Make NO2+.
    2. Classify F: a halogen, so slow but o/p.
    3. The majors are `O=[N+]([O-])c1ccc(F)cc1` and the ortho isomer (derived).
  - Figure: the NO2+ formation and the para arenium with the F-stabilised form.
  - Fluorobenzene is drawn in the directing pool only, not in nitration's.
- First step (fade line): "First step: make NO2+ from the acid mixture, then classify the group already on the ring."
- Practice (play order):
  - Recognise: u3-nit-meet (mcq L0), u3-nit-electrophile (mcq L1), u3-nit-ester (mcq L1), u3-nit-chloro (mcq L1), u3-nit-toluene (mcq L1), u3-nit-stop (mcq L1).
  - Reason: u3-nit-second (mcq L2).
  - Produce: seq-eas (trainer). Then new u3-nit-draw-benzoic (draw L3): nitrate benzoic acid `O=C(O)c1ccccc1`; the key is `O=C(O)c1cccc([N+](=O)[O-])c1` (derived, single major).
- Why items:
  - u3-nit-stop pairs with u3-nit-second.
  - u3-nit-electrophile pairs with seq-eas step 1.
- Say-why mix-ups:
  1. "HNO3 itself is the electrophile that attacks the ring." Fix: sulfuric acid turns it into NO2+; neutral HNO3 is not electrophilic enough.
  2. "Nitration keeps going until every position has a nitro group." Fix: each NO2 slows the ring, so one nitration is the default.
- Picture: mechanism row (trainer); skeletal product.
- Video slot: n/a. The 2-minute slot is kept for the guide.

### u3-sulfo: Sulfonation and desulfonation
- Stage / kind / role: B / spine / practice
- Teaches: u3:sulfonation
- Assumes: u3:electrophile-making, u3:directing, u0:equilibrium
- Primer:
  - Big question: which EAS can you undo, and why would you want to?
  - Pretest item: u3-sul-reverse
  - Ideas: (1) SO3 in H2SO4 adds SO3H; (2) in hot dilute acid, water pushes the equilibrium back (Le Chatelier, Orgo I); (3) SO3H is a meta-directing withdrawer like NO2.
- Worked example: tert-butylbenzene `CC(C)(C)c1ccccc1` with SO3, H2SO4.
  - Steps:
    1. Classify t-Bu as an alkyl donor, o/p.
    2. The model gives para `CC(C)(C)c1ccc(S(=O)(=O)O)cc1` and ortho as majors. The plan's claim "a bulky group favours para" is NOT modelled. ASK: show only "o/p", or author a sterics note (Chad 18.3 states it).
    3. Hot dilute H2SO4 returns `CC(C)(C)c1ccccc1`.
  - Figure: forward and back arrows (equilibrium).
- First step (fade line): "First step: decide which way the equilibrium is pushed: concentrated SO3 forward, hot dilute acid back."
- Practice (play order):
  - Recognise: u3-sul-meet (mcq L0), u3-sul-directs (mcq L1), u3-sul-toluene (mcq L1), u3-sul-ptsa (mcq L1), u3-sul-reverse (mcq L1).
  - Reason: u3-sul-formula (mcq L2).
  - Produce: seq-sulfonation (trainer L3).
- Why items: u3-sul-reverse ("why water reverses it") pairs with u3-sul-ptsa.
- Say-why mix-ups:
  1. "Every EAS is one way, like nitration." Fix: sulfonation sits at equilibrium; excess water and heat pull SO3H off again.
  2. "SO3H directs o/p because S carries lone pairs." Fix: S carries a double bond to O and a + character, so it withdraws and sends meta.
- Picture: mechanism row; one equilibrium diagram (rate vs stability row).
- Video slot: n/a

### u3-fc-alkyl: Friedel-Crafts alkylation
- Stage / kind / role: B / spine / practice
- Teaches: u3:fc-alkyl
- Assumes: u3:electrophile-making, u3:activation, u1:cation-ranking, u0:rearrangement
- Primer:
  - Big question: you want propylbenzene. Why does RCl with AlCl3 not give it?
  - Pretest item: u3-alk-propyl
  - Ideas: (1) AlCl3 makes a carbocation (or a cation-like complex); (2) it shifts H or CH3 to a more substituted carbon first, as in Orgo I SN1 and E1; (3) the product is more activated than the start, so it reacts again (polyalkylation); (4) it fails on a ring carrying a strong withdrawer.
- Worked example: benzene with 1-chlorobutane `CCCCCl` and AlCl3.
  - Steps:
    1. AlCl3 takes Cl− to make a 1° cation.
    2. A 1,2-hydride shift gives a 2° cation.
    3. The ring attacks that carbon, giving sec-butylbenzene `CCC(C)c1ccccc1` (derived by `fc_alkylation`, one shift).
  - Figure: the shift drawn with the Unit 1 cation ladder beside it.
  - Uncertainty, flagged: the real reaction gives a mixture of n-butyl and sec-butyl. The plan claims "mainly the rearranged product", which the model asserts as a convention and RDKit cannot check. ASK whether the item wording should say "major".
- First step (fade line): "First step: find the cation AlCl3 makes, and ask whether one shift makes it more substituted."
- Practice (play order):
  - Recognise: u3-alk-meet (mcq L0), u3-alk-propyl (mcq L1), u3-alk-sec (mcq L1), u3-alk-isobutyl (mcq L1), u3-alk-poly (mcq L1).
  - Reason: u3-alk-neopentyl (mcq L2), u3-alk-fails (mcq L2).
  - Produce: new u3-alk-draw-shift (draw L3): benzene, 1-chloro-2-methylbutane `CCC(C)CCl`, AlCl3. The key is tert-pentylbenzene `CCC(C)(C)c1ccccc1` (derived: 1° to 3° by one hydride shift).
- Why items:
  - u3-alk-neopentyl ("why it shifts") pairs with u3-alk-draw-shift.
  - u3-alk-fails pairs with u3-alk-poly.
- Say-why mix-ups:
  1. "The alkyl group goes on exactly as it is drawn in the alkyl halide." Fix: the cation shifts first when one shift makes it more substituted, the same as in Orgo I SN1 and E1.
  2. "Alkylation stops after one group, like acylation." Fix: an alkyl group activates the ring, so the product reacts faster than benzene and alkylates again.
- Picture: skeletal reactant and product, plus a cation ladder (sort row) for the shift.
- Video slot: n/a. The 3-minute slot is kept for the guide.

### u3-fc-acyl: Friedel-Crafts acylation
- Stage / kind / role: B / spine / practice
- Teaches: u3:fc-acyl
- Assumes: u3:fc-alkyl, u3:directing
- Primer:
  - Big question: how do you put a carbon chain on a ring without it rearranging?
  - Pretest item: u3-acyl-norearr
  - Ideas: (1) the acylium ion has a C≡O+ form, so it never shifts; (2) the aryl ketone is deactivated, so the reaction stops at one; (3) it fails on strong withdrawers too, but a halobenzene still reacts (Chad 18.2).
- Worked example: toluene `Cc1ccccc1` with propanoyl chloride `CCC(=O)Cl` and AlCl3.
  - Steps:
    1. AlCl3 makes the acylium ion.
    2. CH3 is alkyl, so o/p.
    3. The majors are `CCC(=O)c1ccc(C)cc1` and the ortho isomer (derived). The para preference for a bulky acyl is NOT modelled; ASK, as for sulfonation.
  - Figure: the acylium ion's two forms (resonance row).
- First step (fade line): "First step: draw the acylium ion. It cannot shift, so the chain arrives as drawn."
- Practice (play order):
  - Recognise: u3-acyl-meet (mcq L0), u3-acyl-ion (mcq L1), u3-acyl-norearr (mcq L1), u3-acyl-once (mcq L1), u3-acyl-anisole (mcq L1), u3-acyl-benzoyl (mcq L1).
  - Reason: u3-acyl-fails (mcq L2).
  - Produce: seq-fc-acyl (trainer). Then new u3-acyl-draw-chloro (draw L3): chlorobenzene `Clc1ccccc1` with acetyl chloride and AlCl3. The key is `CC(=O)c1ccc(Cl)cc1` or the ortho isomer; the model does not call a halobenzene a Friedel-Crafts failure. This is the confronting item for "Friedel-Crafts fails on any deactivated ring".
- Why items:
  - u3-acyl-norearr pairs with u3-acyl-draw-chloro.
  - u3-acyl-once pairs with u3-acyl-benzoyl.
- Say-why mix-ups:
  1. "The acylium ion rearranges just as an alkyl cation does." Fix: its C≡O+ form spreads the charge onto oxygen, so it has nothing to gain by shifting.
  2. "Friedel-Crafts fails on every deactivated ring, halobenzenes included." Fix: only strong withdrawers (NO2, C=O, CN, SO3H, NR3+) stop it; a halobenzene still reacts.
- Picture: resonance row (acylium); mechanism row (trainer).
- Video slot: n/a

### u3-gk: Gattermann-Koch formylation (side quest)
- Stage / kind / role: B / branch / practice
- Teaches: u3:formylation (new id)
- Assumes: u3:fc-acyl
- Primer: ASK. There is no pool. The outline calls formylation "a named extra", and its exam weight is unmeasured. Proposed: three MCQ (what CO, HCl and AlCl3/CuCl deliver; product; why HCOCl is not used directly) and one draw. The species would be chosen at generation through `E_FRAG["CHO"]`, which already exists.
- Worked example: ASK
- First step (fade line): ASK
- Practice: ASK
- Why items: ASK
- Say-why mix-ups: ASK
- Picture: skeletal row
- Video slot: n/a

### u3-quiz-b: Stage B checkpoint
- Stage / kind / role: B / spine / quiz
- Teaches: none
- Assumes: Stage A, plus u3:halogenation, u3:nitration, u3:sulfonation, u3:fc-alkyl, u3:fc-acyl
- Primer / worked example / fade: n/a
- Practice: 9 items, all L2 or L3.
  - new u3-qb-reagent (mcq L2, F16 "reagent from start plus product")
  - new u3-qb-start (mcq L2, F16 "starting material from reagent plus product")
  - new u3-qb-why-acyl (mcq L2)
  - new u3-qb-fc-fails (mcq L2)
  - new u3-qb-sulfo-back (mcq L2)
  - new u3-qb-space-directing (mcq L2, spacing from Stage A)
  - new u3-qb-space-u1-shift (mcq L2, spacing from Orgo I and Unit 1)
  - new u3-qb-draw-acyl (draw L3)
  - new u3-qb-mech (trainer L3: seq-eas with the resonance step)
- Why items: u3-qb-why-acyl and u3-qb-sulfo-back.
- Say-why mix-ups: lesson lists by concept.
- Picture: as the lessons.
- Video slot: n/a

### u3-nitro-red: Nitro to amine
- Stage / kind / role: C / spine / video
- Teaches: u3:nitro-reduction, u3:director-flip (new id, shared by Stage C)
- Assumes: u3:nitration, u3:directing, u0:oxidation-level
- Primer:
  - Big question: you need an NH2 on a ring. Why put on an NO2 first?
  - Pretest item: u3-nred-flip
  - Ideas: (1) NH2 cannot go on by EAS, but NO2 can; (2) H2 with Pd, or Fe, Sn or Zn with HCl, reduces each NO2 to NH2; (3) this flips a meta withdrawer into a strong o/p donor; (4) this is the doorway to Unit 10.
- Worked example: methyl 3-nitrobenzoate `COC(=O)c1cccc([N+](=O)[O-])c1`, reduced to `COC(=O)c1cccc(N)c1` (derived as a graph edit).
  - Steps:
    1. Find every NO2.
    2. Swap each one for NH2.
    3. Leave the ester alone.
    4. Reclassify the group.
  - Figure: before and after, with the class labels.
  - Uncertainty, flagged: "the ester survives H2/Pd" and "a ring C-Cl survives Fe/HCl" are chemoselectivity claims. RDKit cannot check them, and the model edits only NO2. A source must be cited (OpenStax 24.6 or Unit 10 notes) before an item states them. ASK whether to keep the ester example or switch to an alkyl ring.
- First step (fade line): "First step: find every NO2 on the ring. Each becomes NH2 and nothing else changes."
- Practice (play order):
  - Recognise: u3-nred-pnt (mcq L0), u3-nred-formula (mcq L0), u3-nred-mnt (mcq L1), u3-nred-acid (mcq L1), u3-nred-flip (mcq L1).
  - Reason: u3-nred-dinitro (mcq L2).
  - Produce: new u3-nred-draw (draw L3). 1-chloro-3-nitrobenzene `Clc1cccc([N+](=O)[O-])c1` with Fe, HCl; the key is `Nc1cccc(Cl)c1` (derived; the C-Cl survival is flagged above).
- Why items: u3-nred-flip pairs with u3-nred-draw.
- Say-why mix-ups:
  1. "Reducing NO2 leaves the ring's directing pattern unchanged." Fix: NH2 has a lone pair on its first atom, so the ring becomes a strong o/p donor.
  2. "NH2 can be put on a ring directly by EAS." Fix: there is no NH2+ electrophile; the route is nitrate, then reduce.
- Picture: skeletal before and after; text for the rule.
- Video slot: 2 minutes, kept. Shows:
  - "NO2 becoming NH2"
  - "The ring's director flipping"
  - "Where this leads"

### u3-c-to-ch2: Carbonyl to CH2 after acylation
- Stage / kind / role: C / spine / practice
- Teaches: u3:carbonyl-to-ch2
- Assumes: u3:fc-acyl, u3:fc-alkyl, u3:director-flip
- Primer:
  - Big question: how do you get a straight chain on a ring, given that alkylation rearranges?
  - Pretest item: u3-ch2-why
  - Ideas: (1) acylate, then turn the C=O into CH2; (2) Zn(Hg) with HCl (Clemmensen) or H2NNH2 with KOH and heat (Wolff-Kishner); (3) the director flips from a meta withdrawer to an o/p alkyl.
- Worked example: 4-methylpropiophenone `CCC(=O)c1ccc(C)cc1`, the product of u3-fc-acyl's worked example, reduced to 1-methyl-4-propylbenzene `CCCc1ccc(C)cc1` (derived).
  - Steps:
    1. Find the C=O on the carbon bonded to the ring.
    2. Replace O with two H.
    3. Note that the chain is unbranched.
  - Figure: the two-step route against direct alkylation's rearranged product.
- First step (fade line): "First step: find the C=O bonded to the ring. It becomes CH2 and the chain keeps its shape."
- Practice (play order):
  - Recognise: u3-ch2-meet (mcq L0), u3-ch2-butyro (mcq L1), u3-ch2-anisyl (mcq L1), u3-ch2-formula (mcq L1), u3-ch2-flip (mcq L1).
  - Reason: u3-ch2-why (mcq L2), u3-ch2-wk (mcq L2).
  - Produce: new u3-ch2-draw (draw L3): cyclohexyl phenyl ketone `O=C(c1ccccc1)C1CCCCC1` with Zn(Hg) and HCl; the key is `C(c1ccccc1)C1CCCCC1` (derived).
- Why items:
  - u3-ch2-why pairs with u3-ch2-butyro.
  - u3-ch2-flip pairs with u3-ch2-draw.
- Say-why mix-ups:
  1. "Clemmensen turns the C=O into an alcohol." Fix: both C-O bonds go; the carbon ends as CH2. An alcohol is NaBH4's product.
  2. "Acylate-then-reduce gives the same branched chain as direct alkylation." Fix: the acylium ion cannot shift, so the chain stays straight.
- Picture: skeletal before and after.
- Video slot: n/a

### u3-benzylic-ox: Benzylic oxidation
- Stage / kind / role: C / spine / practice
- Teaches: u3:benzylic-ox
- Assumes: u3:director-flip, u1:allylic, u0:oxidation-level
- Primer:
  - Big question: what does hot KMnO4 do to a ring with side chains, and what does it leave alone?
  - Pretest item: u3-box-tbu-alone
  - Ideas: (1) any side chain whose ring-bonded carbon has an H is cut back to COOH; (2) no benzylic H means no reaction (t-Bu); (3) an alkyl donor becomes a COOH withdrawer, which is the third flip.
- Worked example: 1-bromo-4-ethylbenzene `CCc1ccc(Br)cc1` with KMnO4 and heat, giving 4-bromobenzoic acid `O=C(O)c1ccc(Br)cc1` (derived).
  - Steps:
    1. Find the carbon bonded to the ring and check it has an H.
    2. Cut the chain back to that carbon.
    3. Make it COOH.
- First step (fade line): "First step: look at the side-chain carbon bonded to the ring. Does it carry an H?"
- Practice (play order):
  - Recognise: u3-box-meet (mcq L0), u3-box-ethyl (mcq L1), u3-box-pxylene (mcq L1), u3-box-tbu-alone (mcq L1), u3-box-flip (mcq L1).
  - Reason: u3-box-tbu (mcq L2).
  - Produce: new u3-box-draw (draw L3): 1-tert-butyl-4-isopropylbenzene `CC(C)c1ccc(C(C)(C)C)cc1` with KMnO4 and heat; the key is `CC(C)(C)c1ccc(C(=O)O)cc1` (derived).
- Why items: u3-box-tbu pairs with u3-box-draw.
- Say-why mix-ups:
  1. "KMnO4 stops at the aldehyde, as PCC does." Fix: hot KMnO4 goes all the way to COOH, as in Orgo I's "strong oxidant goes to the acid".
  2. "A longer chain keeps its extra carbons and gains a COOH at the end." Fix: the chain is cut at the benzylic carbon, which becomes the COOH carbon.
- Picture: skeletal before and after.
- Video slot: n/a. ASK: the outline marks this topic "low and falling". Keep it on the spine (the 23 Oct audit put it there for Stage D's routes), or make it a side quest and keep only its flip in Stage D.

### u3-benzylic-br: Benzylic bromination (side quest, moved)
- Stage / kind / role: C / branch / practice
- Teaches: u3:benzylic-br
- Assumes: u1:allylic-halogenation, u0:radical, u3:halogenation
- Primer:
  - Big question: NBS and light against Br2 and FeBr3: same ring, different carbon. Why?
  - Pretest item: u3-bbr-meet
  - Ideas: (1) NBS with light makes radicals; (2) the benzylic radical is shared with the ring, like Unit 1's allylic radical; (3) no benzylic H means no reaction.
- Worked example: 1-bromo-4-ethylbenzene `CCc1ccc(Br)cc1` with NBS and light, giving `CC(Br)c1ccc(Br)cc1` (derived).
  - Steps:
    1. Find the benzylic carbons.
    2. Pick the one with an H.
    3. Br goes there; the ring Br is untouched.
  - The same start as the oxidation worked example is used on purpose: one ring, two reagents, two answers.
- First step (fade line): "First step: circle every sp3 carbon bonded to the ring. Those are benzylic."
- Practice (play order):
  - Recognise: u3-bbr-meet (mcq L0), u3-bbr-count (mcq L0), u3-bbr-ethyl (mcq L1), u3-bbr-cumene (mcq L1), u3-bbr-propyl (mcq L1).
  - Reason: u3-bbr-tbu (mcq L2).
- Why items: u3-bbr-tbu pairs with u3-bbr-propyl.
- Say-why mix-ups:
  1. "NBS brominates the ring, like Br2 with FeBr3." Fix: NBS and light run a radical chain at the benzylic C-H; the ring needs a Lewis acid.
  2. "The Br goes on the end carbon of the chain." Fix: it goes on the carbon bonded to the ring, whose radical the ring shares.
- Picture: resonance row (benzylic radical with half-headed arrows).
- Video slot: n/a. The 2-minute slot is kept for the guide.

### u3-birch: Birch reduction (side quest, moved)
- Stage / kind / role: C / branch / practice
- Teaches: u3:birch
- Assumes: u2:donor-withdrawer, u3:directing
- Primer:
  - Big question: how do you take a ring's aromaticity away without reducing it all the way?
  - Pretest item: u3-bir-meet
  - Ideas: (1) Na in NH3(l) with ROH adds H to two para carbons; (2) a donor's carbon stays on a C=C; (3) a withdrawer's carbon takes an H.
- Worked example: ASK. The pool already uses anisole, toluene and benzoic acid. The model gives anisole as `COC1=CCC=CC1`. A new start ring (for example ethoxybenzene) needs a check through `u3_pools.birch` before it is named.
- First step (fade line): "First step: classify the group. Donor carbons stay on a C=C; withdrawer carbons take an H."
- Practice (play order):
  - Recognise: u3-bir-meet (mcq L0), u3-bir-sp3 (mcq L0), u3-bir-anisole (mcq L1), u3-bir-acid (mcq L1), u3-bir-conj (mcq L1).
  - Reason: u3-bir-toluene (mcq L2).
- Why items: u3-bir-conj pairs with u3-bir-anisole.
- Say-why mix-ups:
  1. "Birch gives the conjugated 1,3-diene." Fix: the two new H go on para carbons, which leaves two isolated C=C bonds (1,4).
  2. "Every group ends on an sp3 carbon." Fix: a donor's carbon stays on a C=C; only a withdrawer's carbon goes sp3.
- Picture: skeletal before and after.
- Video slot: n/a

### u3-quiz-c: Stage C checkpoint
- Stage / kind / role: C / spine / quiz
- Teaches: none
- Assumes: Stages A and B, plus u3:nitro-reduction, u3:carbonyl-to-ch2, u3:benzylic-ox. Side quests are not assumed.
- Primer / worked example / fade: n/a
- Practice: 8 items, all L2 or L3.
  - new u3-qc-which-flip (mcq L2)
  - new u3-qc-reagent (mcq L2)
  - new u3-qc-tbu (mcq L2)
  - new u3-qc-why-two-steps (mcq L2)
  - new u3-qc-space-fc (mcq L2, Stage B acylation in a reduction setting)
  - new u3-qc-space-directing (mcq L2, Stage A)
  - new u3-qc-draw-flip (draw L3)
  - new u3-qc-draw-ox (draw L3)
- Why items: u3-qc-why-two-steps.
- Say-why mix-ups: lesson lists by concept.
- Picture / video: n/a

### u3-sequencing: Order of operations
- Stage / kind / role: D / spine / video
- Teaches: u3:sequencing
- Assumes: u3:directing, u3:fc-acyl, u3:director-flip, u0:retrosynthesis
- Primer:
  - Big question: two groups, and two orders to add them in. How do you know which goes on first?
  - Pretest item: u3-seq-mbr
  - Ideas: (1) work backwards from the target: which group points at the other's position? (2) that group goes on first; (3) do Friedel-Crafts before any strong withdrawer; (4) if neither group points the right way, use a flip (next lessons).
- Worked example: benzene to 3-bromoacetophenone `CC(=O)c1cccc(Br)c1`.
  - Steps:
    1. The groups are meta to each other.
    2. Which one sends meta? Only the acyl group.
    3. So acylate first, giving `CC(=O)c1ccccc1`.
    4. Then Br2 and FeBr3.
  - Derived: acylate-then-brominate reaches the target; brominate-then-acylate does not (`route_gives`).
  - Figure: both routes, side by side.
- First step (fade line): "First step: name the relation between the two groups in the target, then ask which one points there."
- Practice (play order):
  - Recognise: u3-seq-mbr (mcq L0), u3-seq-pbr (mcq L1), u3-seq-mbra (mcq L1).
  - Reason: u3-seq-acyl-first (mcq L2).
  - Produce: new u3-seq-order-board (sort L2), which orders the reagents of a three-step route. The target is chosen at generation and passes `route_gives`.
- Why items: u3-seq-acyl-first pairs with u3-seq-order-board.
- Say-why mix-ups:
  1. "Add the groups in the order they appear in the name." Fix: order follows which group directs to the other's position, not the name.
  2. "The order only changes the yield, not the product." Fix: the first group decides where the second lands, so the wrong order gives a different isomer.
- Picture: sort ladder for the route; skeletal start and target.
- Video slot: 3 minutes, kept. Shows:
  - "A target and the group that must go first"
  - "A flip used on purpose"
  - "A Friedel-Crafts step placed early"

### u3-blocking: Blocking groups
- Stage / kind / role: D / spine / practice
- Teaches: u3:blocking
- Assumes: u3:sulfonation, u3:directing, u3:sequencing
- Primer:
  - Big question: toluene gives ortho and para together. How do you get only ortho?
  - Pretest item: u3-blk-without
  - Ideas: (1) put SO3H on para first; (2) the next electrophile is forced ortho to the director (and SO3H agrees, since that carbon is meta to it); (3) hot dilute acid removes SO3H; (4) only a reversible group can block.
- Worked example: toluene to 2-nitrotoluene `Cc1ccccc1[N+](=O)[O-]`.
  - Steps:
    1. SO3 with H2SO4 gives `Cc1ccc(S(=O)(=O)O)cc1`. The model gives para and ortho; "para mainly" is authored, from the map's own blurb. ASK.
    2. HNO3 with H2SO4 goes ortho to CH3, giving `Cc1ccc(S(=O)(=O)O)cc1[N+](=O)[O-]` (derived, single major).
    3. Hot dilute H2SO4 gives the target (derived).
- First step (fade line): "First step: find the position you do not want, and block it with SO3H."
- Practice (play order):
  - Recognise: u3-blk-without (mcq L0), u3-blk-why-so3h (mcq L1), u3-blk-step2 (mcq L1), u3-blk-step3 (mcq L1), u3-blk-remove (mcq L1).
  - Reason: u3-blk-anisole (mcq L2).
  - Produce: new u3-blk-draw (draw L3). Toluene with (1) SO3 and H2SO4, (2) Cl2 and FeCl3, (3) hot dilute H2SO4. The key is 2-chlorotoluene `Cc1ccccc1Cl` (derived step by step).
- Why items: u3-blk-why-so3h pairs with u3-blk-draw.
- Say-why mix-ups:
  1. "Any group can block a position, NO2 included." Fix: the blocker must come off cleanly at the end; only SO3H is reversible.
  2. "Blocking para gives you the para product." Fix: blocking para sends the next group ortho; the para seat is held until the blocker leaves.
- Picture: three-step scheme, skeletal.
- Video slot: n/a

### u3-seq-flip: Using a flip on purpose (new)
- Stage / kind / role: D / spine / practice
- Teaches: u3:flip-strategy (new id)
- Assumes: u3:sequencing, u3:director-flip, u3:benzylic-ox, u3:nitro-reduction, u3:carbonyl-to-ch2
- Primer:
  - Big question: the target's groups are meta, but you only have an o/p director. What now?
  - Pretest item: u3-seq-pnba
  - Ideas: (1) a group can change class after it does its directing; (2) direct while the class is right, then flip; (3) the three flips are NO2 to NH2, C=O to CH2 and CH3 to COOH.
- Worked example: toluene to 4-chlorobenzoic acid `O=C(O)c1ccc(Cl)cc1`.
  - Steps:
    1. The target needs Cl para to COOH, but COOH sends meta.
    2. So chlorinate while the group is still CH3 (o/p), giving `Cc1ccc(Cl)cc1` among the majors.
    3. Then KMnO4 (derived).
  - The reverse order gives 3-chlorobenzoic acid (derived), which is shown as the trap.
- First step (fade line): "First step: ask what the group is now and what it will become. Direct while it points the right way."
- Practice (play order):
  - Recognise: u3-seq-pnba (mcq L1).
  - Reason: u3-seq-mnba (mcq L2).
  - Connect: u3-exam-match-flip (match L1, moved from U3_UNWIRED).
  - Produce: new u3-flip-draw-mcba (draw L3). Toluene with (1) KMnO4 and heat, (2) Cl2 and FeCl3. The key is `O=C(O)c1cccc(Cl)c1` (derived).
- Why items: u3-seq-mnba pairs with u3-flip-draw-mcba.
- Say-why mix-ups:
  1. "A group's directing class is fixed once it is on the ring." Fix: reduction and oxidation change the first atom, and with it the class.
  2. "Oxidise CH3 first, because COOH is the group the target has." Fix: once it is COOH it sends meta; direct first while it is still CH3.
- Picture: match board; skeletal schemes.
- Video slot: n/a

### u3-synthesis: Build the route (new)
- Stage / kind / role: D / spine / practice
- Teaches: u3:synthesis (new id)
- Assumes: u3:sequencing, u3:blocking, u3:flip-strategy
- Primer:
  - Big question: given benzene and a target, write every step. That is the exam's 10-point page.
  - Pretest item: syn-u3-acyl-then-nitrate
  - Ideas: (1) count carbons: Act 1 requires every starting carbon in the product; (2) work backwards, one group at a time; (3) reagents and products for each step, no mechanism.
- Worked example: benzene to 1-bromo-3-propylbenzene `CCCc1cccc(Br)c1`.
  - Steps:
    1. A straight propyl chain needs acylate-then-reduce.
    2. Br is meta to the chain, so it must go on while the group is the meta-directing ketone.
    3. Propanoyl chloride `CCC(=O)Cl` with AlCl3 gives `CCC(=O)c1ccccc1`.
    4. Br2 with FeBr3 gives `CCC(=O)c1cccc(Br)c1` (derived, meta).
    5. Zn(Hg) with HCl gives the target (derived).
  - Uncertainty, flagged: that the aryl C-Br survives Clemmensen is a chemoselectivity claim RDKit cannot check. It needs a cited source; ASK, or use Wolff-Kishner.
- First step (fade line): "First step: count the target's carbons off the ring, and decide whether they need acylate-then-reduce."
- Practice (play order):
  - Order: syn-u3-acyl-then-nitrate (synthesis L2), syn-u3-bromo-aniline (synthesis L2), syn-u3-nitro-acid (synthesis L2), all moved from u3-sequencing. Then new u3-syn-chloronitro (synthesis L2), benzene to `Clc1cccc([N+](=O)[O-])c1`, nitrate then chlorinate (derived meta).
  - Produce: new u3-syn-butyl (synthesis L3), benzene to butylbenzene `CCCCc1ccccc1` by butanoyl chloride `CCCC(=O)Cl` then Clemmensen (derived; confronts direct alkylation). Then new u3-syn-propylaniline (synthesis L3), benzene to 4-propylaniline `CCCc1ccc(N)cc1`: acylate, reduce C=O, nitrate (para among majors), reduce NO2 (derived). The trap, nitrating before the C=O reduction, goes meta (derived).
- Why items: new u3-syn-why-reduce-first (mcq L2), "why reduce the ketone before nitrating?", pairs with u3-syn-propylaniline.
- Say-why mix-ups:
  1. "Synthesis answers should show the mechanism of each step." Fix: the exam forbids mechanism here; it wants the reagents and the product of each step.
  2. "Any route that reaches the formula is right." Fix: the isomer must match; the order decides o, m or p.
- Picture: synthesis board (mechanism row's sibling); skeletal target.
- Video slot: n/a

### u3-quiz-d: Stage D checkpoint
- Stage / kind / role: D / spine / quiz
- Teaches: none
- Assumes: Stages A to C main line, plus u3:sequencing, u3:blocking, u3:flip-strategy, u3:synthesis
- Primer / worked example / fade: n/a
- Practice: 9 items, all L2 or L3.
  - new u3-qd-order (mcq L2)
  - new u3-qd-block (mcq L2)
  - new u3-qd-flip-why (mcq L2)
  - new u3-qd-space-sulfo (mcq L2, Stage B)
  - new u3-qd-space-flip (mcq L2, Stage C)
  - new u3-qd-start (mcq L2, F16 starting material)
  - new u3-qd-syn-1 (synthesis L3)
  - new u3-qd-syn-2 (synthesis L3)
  - new u3-qd-draw (draw L3)
- Why items: u3-qd-flip-why.
- Say-why mix-ups: lesson lists by concept.
- Picture / video: n/a

## Orgo I callbacks

| Stage | Lesson | Orgo I idea | Carry-over sentence | Primer id | Why item id |
|---|---|---|---|---|---|
| A | u3-arenium | Carbocation stability and resonance (Unit 1 allylic cation) | "The arenium is Unit 1's allylic cation bent into a ring: the + is shared over three carbons, and anything that shares it more makes it steadier." Story differs: an alkene's cation is captured by a nucleophile; the ring's cation loses H+ to get aromaticity back. | u0:resonance, u0:carbocation | new u3-qa-space-u1-cation ("the form with + on the CH3-bearing carbon is the best one, for the same reason 3° beats 1° in SN1") |
| A | u3-directing | EWG vs EDG, induction vs resonance (Unit 2, phenol rubric) | "The same rubric that ranked phenols by acidity ranks rings by speed: decide resonance or induction, then where." | (u2:donor-withdrawer, taught in Unit 2) | new u3-qa-space-u2-pka |
| B | u3-fc-alkyl | Carbocation rearrangement (SN1, E1, HX addition) | "AlCl3 makes the same cation SN1 makes, and it shifts the same way before the ring can grab it." | u0:rearrangement (new) | u3-alk-neopentyl, new u3-qb-space-u1-shift |
| B | u3-halo | Lewis acids and electrophiles (charge) | "FeBr3 is a Lewis acid, an electron-pair acceptor, so it pulls Br− off and leaves the other Br electron poor." | u0:lewis-acid (new) | u3-halo-cl (reworded to ask why) |
| B | u3-sulfo | Equilibrium and Le Chatelier | "Sulfonation is an equilibrium, and water is a product of the reverse: flood it with water and heat, and it runs backwards." | u0:equilibrium | u3-sul-reverse |
| C | u3-nitro-red | Oxidation level and functional groups | "Count bonds to O and N on the ring carbon's group: reduction lowers it, oxidation raises it, and the group's class changes with it." | u0:oxidation-level (new) | u3-nred-flip |
| C | u3-benzylic-ox | Strong oxidants go to the acid (Orgo I alcohol oxidation) | "Hot KMnO4 is the 'goes to the acid' oxidant from Orgo I, now aimed at a benzylic C-H." | u0:oxidation-level | u3-box-tbu |
| C | u3-benzylic-br (side quest) | Radical stability (Unit 1 NBS) | "The benzylic radical is the allylic radical with a ring as its C=C." | u0:radical | u3-bbr-tbu |
| D | u3-sequencing | Retrosynthesis (Orgo I multistep synthesis) | "Work backwards from the target, one disconnection at a time, as in Orgo I's alkyne and alkene syntheses." | u0:retrosynthesis (new) | u3-seq-acyl-first |
| D | u3-synthesis | Substitution vs elimination appears only as embedded steps (outline section 2) | n/a: no Unit 3 route uses SN or E steps this round. ASK whether a side-chain SN2 step (benzylic bromide plus nucleophile) belongs in a route. | n/a | n/a |

## Misconceptions

Cause ids in `code` exist today. Ids marked (new) must be added to `packages/chem-core/src/causes.ts`
(8d: add a cause rather than borrow the nearest one). Today no Unit 3 MCQ option carries a cause.

| Cause id | Wrong idea (student's words) | Why it tempts | Confronting item | Correction |
|---|---|---|---|---|
| eas_addition_not_substitution (new) | "Br2 adds across a C=C of benzene." | Alkenes do exactly that in Orgo I | u3-aren-which, u3-aren-rearom | Losing H+ restores aromaticity; addition would leave it lost |
| `carbocation_on_destabilised_center` | "A nitro group sends the next group ortho/para like everything else." | Most groups met so far direct o/p | u3-dir-why-nitro | o/p attack puts the + next to NO2, the worst form; meta avoids it |
| halogen_rate_from_direction (new) | "Halogens direct o/p, so they activate." | o/p is learned as "the activators' pattern" | u3-dir-cl-why, u3-act-halo-tier, the ladder's `halogen-up` distractor | Induction sets the rate (slow), the lone pair sets the position (o/p) |
| weaker_director_chosen (new) | "The withdrawer wins because it is stronger." | "Strong withdrawer" sounds like a strong effect | u3-dir-compete, u3-two-match | The faster-tier group decides |
| `skipped_favourable_rearrangement` | "1-chloropropane gives propylbenzene." | The halide's carbon skeleton looks like the answer | u3-alk-propyl, u3-alk-draw-shift | The cation shifts first when that makes it more substituted |
| polyalkylation_ignored (new) | "One alkylation, then it stops." | Nitration and acylation stop at one | u3-alk-poly | An alkyl group activates the product, so it reacts again |
| fc_on_deactivated_ring (new) | "Friedel-Crafts works on nitrobenzene" and, the opposite slip, "it fails on chlorobenzene" | Every EAS is taught as working on every ring | u3-alk-fails, u3-acyl-fails, u3-acyl-draw-chloro | Strong withdrawers stop it; halobenzenes still react |
| sulfonation_treated_irreversible (new) | "Once SO3H is on, it stays on." | Every other EAS is one way | u3-sul-reverse | Hot dilute acid reverses it, which is why it can block |
| ring_vs_benzylic_confused (new) | "NBS brominates the ring." | Same element, same ring | u3-halo-vs-nbs, u3-bbr-meet | NBS and light: benzylic C-H, radical. Br2 and FeBr3: ring, cation |
| director_flip_ignored (new) | "After reduction, NH2 still directs meta like NO2 did." | The position is remembered with the group | u3-nred-flip, u3-ch2-flip, u3-box-flip | The new first atom sets the new class |
| benzylic_h_required_ignored (new) | "KMnO4 oxidises every alkyl group." | "Alkyl groups oxidise" is the slogan | u3-box-tbu, u3-box-tbu-alone | No H on the benzylic carbon means no reaction |
| `synthesis_steps_out_of_order` (curriculum) | "Add groups in the order they are named." | Names list groups in order | u3-seq-mbr, u3-seq-order-board | The group that directs to the other's position goes first |
| blocker_not_removable (new) | "Use NO2 to block para." | NO2 also goes on easily | u3-blk-why-so3h | A blocker must come off; only SO3H is reversible |

## Spacing

| Item id | Tests (stage or earlier unit, concept) | Plays in (quiz / exam) |
|---|---|---|
| u3-qa-space-u2-pka (new) | Unit 2, `ewg_edg_rubric` via pKa. "4-Nitrophenol `O=[N+]([O-])c1ccc(O)cc1` is the stronger acid than phenol `Oc1ccccc1`; what does the same NO2 do to EAS rate, and why is it the same reason?" The pKa values are NOT RDKit-derivable; they need a cited table (Unit 2's `u2-keq-pka` source), else the item uses "stronger/weaker" only. | u3-quiz-a |
| u3-qa-space-u1-cation (new) | Unit 1, cation ranking (`resonance_delocalisation`) | u3-quiz-a |
| u3-qb-space-directing (new) | Stage A, directing, in a nitration setting | u3-quiz-b |
| u3-qb-space-u1-shift (new) | Orgo I and Unit 1, `carbocation_rearrangement` | u3-quiz-b |
| u3-qc-space-fc (new) | Stage B, acylation inside a reduction question | u3-quiz-c |
| u3-qc-space-directing (new) | Stage A, two groups after a flip | u3-quiz-c |
| u3-qd-space-sulfo (new) | Stage B, sulfonation reversibility | u3-quiz-d |
| u3-qd-space-flip (new) | Stage C, the flips | u3-quiz-d |
| u3-exam-space-u1-allylic (new) | Unit 1, `radical_stability` (benzylic against allylic radical) | unit exam |
| u3-exam-space-u2-hetero (new) | Unit 2, heterocycle EAS site, "argued from where the + sits" (outline `eas_directing_effects`). ASK: needs a pyrrole or pyridine model the generator lacks; not derived. | unit exam (ASK) |

## Difficulty

New items are counted. Today most lessons are L0/L1 only; every lesson gets an L2 and an L3. Fail-back
items are the L2 and L3 items that play in quizzes and Challenge: failing one sends the learner back one question.

| Lesson | L0 | L1 | L2 | L3 | Fail-back items |
|---|---|---|---|---|---|
| u3-arenium | 1 | 5 | 3 (incl. res-arenium) | 1 (seq-eas-br) | none (trainer step, so no Challenge) |
| u3-directing | 0 | 7 | 2 | 1 | Challenge: u3-dir-bad-count, u3-dir-why-nitro, u3-dir-draw-cumene |
| u3-activation | 0 | 1 | 3 | 1 | u3-dir-why-fast, u3-dir-cl-why, u3-dir-ladder-rate, u3-act-draw-compete |
| u3-two-groups | 0 | 1 | 2 | 1 | u3-dir-compete, u3-two-match, u3-two-draw-agree |
| u3-quiz-a | 0 | 0 | 6 | 2 | all 8 |
| u3-halo | 1 | 5 | 1 | 2 | none (trainer) |
| u3-nitration | 1 | 5 | 1 | 2 | none (trainer) |
| u3-sulfo | 1 | 4 | 1 | 1 | none (trainer) |
| u3-fc-alkyl | 1 | 4 | 2 | 1 | u3-alk-neopentyl, u3-alk-fails, u3-alk-draw-shift |
| u3-fc-acyl | 1 | 5 | 1 | 2 | none (trainer) |
| u3-quiz-b | 0 | 0 | 7 | 2 | all 9 |
| u3-nitro-red | 2 | 3 | 1 | 1 | u3-nred-dinitro, u3-nred-draw |
| u3-c-to-ch2 | 1 | 4 | 2 | 1 | u3-ch2-why, u3-ch2-wk, u3-ch2-draw |
| u3-benzylic-ox | 1 | 4 | 1 | 1 | u3-box-tbu, u3-box-draw |
| u3-benzylic-br | 2 | 3 | 1 | 0 (ASK: add a draw) | u3-bbr-tbu |
| u3-birch | 2 | 3 | 1 | 0 (ASK: add a draw) | u3-bir-toluene |
| u3-quiz-c | 0 | 0 | 6 | 2 | all 8 |
| u3-sequencing | 1 | 2 | 2 | 0 (ASK: does the sort board count as produce?) | u3-seq-acyl-first, u3-seq-order-board |
| u3-blocking | 1 | 4 | 1 | 1 | u3-blk-anisole, u3-blk-draw |
| u3-seq-flip | 0 | 2 | 1 | 1 | u3-seq-mnba, u3-flip-draw-mcba |
| u3-synthesis | 0 | 0 | 5 | 2 | u3-syn-why-reduce-first, all synthesis items |
| u3-quiz-d | 0 | 0 | 6 | 3 | all 9 |

Re-level ASK: u3-blk-without and u3-nred-pnt are L0 but sit mid-lesson. Plays-easiest-first moves them
to the front, which the play orders above already do.

## Checkpoints and test-outs
- Stage quizzes:
  - u3-quiz-a: 8 items, spaced u3-qa-space-u2-pka and u3-qa-space-u1-cation.
  - u3-quiz-b: 9 items, spaced u3-qb-space-directing and u3-qb-space-u1-shift.
  - u3-quiz-c: 8 items, spaced u3-qc-space-fc and u3-qc-space-directing.
  - u3-quiz-d: 9 items, spaced u3-qd-space-sulfo and u3-qd-space-flip.
  - Each ends its section, so `unitSections` cuts sections at the quizzes instead of by length.
- Section chests: u3-s1-test 10, u3-s2-test 12, u3-s3-test 13, u3-s4-test 15. These follow `sectionTestSize` over 4 sections (10, 11.7, 13.3, 15, rounded).
- Unit exam sources (20 items, `u3-unit-test`, plus a named `U3_EXAM_IDS` list as Unit 2 has):
  - Stage A: u3-dir-ladder-rate (sort), u3-aren-anisole, u3-dir-why-nitro, u3-two-draw-agree
  - Stage B: u3-alk-neopentyl, u3-acyl-fails, u3-nit-second, u3-sul-formula, u3-acyl-draw-chloro
  - Stage C: u3-ch2-why, u3-box-tbu, u3-nred-dinitro, u3-ch2-draw
  - Stage D: u3-blk-anisole, u3-seq-mnba, u3-syn-propylaniline
  - Side quests: u3-bbr-propyl, u3-bir-anisole, u3-exam-match-toluene (moved from U3_UNWIRED; it pairs NBS, Br2/FeBr3, KMnO4 and Birch on one ring)
  - Spacing: u3-exam-space-u1-allylic
  - That is 20, all L2 or L3 except the match board, which the generator tags L1 today. ASK: raise it to L2, since it combines four rules.

## RDKit derivations

| Script | Derives | Stops the generator when |
|---|---|---|
| `scripts/u3_pools.py` (exists) | Substituent class and tier; major EAS sites (`eas_major`); sigma-complex forms (`sigma_forms`); nitro reduction, desulfonation, C=O to CH2, benzylic bromination and oxidation, Birch, Friedel-Crafts with one shift; names by OPSIN | An authored key disagrees (REFUSED), a site sits between two groups, leading groups disagree, a name does not read back, or the class fixtures fail |
| `scripts/u3_pools.py` (to extend) | Every worked example and new draw, quiz and spacing item above. The new resonance trainer `res-arenium` forms come from `sigma_forms` | Same, plus: a worked example's species appears in its own lesson's pool (new check), or a lesson lacks an L2 or L3 item (new check) |
| `scripts/u3_synthesis_gaps.py` (exists, to extend) | The three moved synthesis gaps, plus u3-syn-chloronitro, u3-syn-butyl, u3-syn-propylaniline and the two quiz routes, through `route_gives` (extend STEP with `chlorinate`, `sulfonate`, `desulfonate`, `reduce_co`, `acylate_et`, `acylate_pr`) | A route misses its target, a wrong chip reaches it, or a name does not read back |
| `scripts/guide_u3.py`, `scripts/section_decks.py` (exist) | Guide rows and section cards, rerun after the pools change; tests byte-match | `--check` mismatch |
| Scratch check, 4 Nov: `scratchpad/units/u3check/check_plan.py` (not in the repo) | 61 checks of the plan claims above, against the generator's own model, all passed. The model also logged a refusal in its failure list | The logged refusal: mesitylene `Cc1cc(C)cc(C)c1` (every site flanked), so the arenium worked example was changed to cumene. It also found that 1,4-disubstituted rings with two identical groups (`Clc1ccc(Cl)cc1`, `COc1ccc(OC)cc1`) are refused as "leading groups disagree", a model gap to fix before any such item. |
| Not derivable by RDKit (flagged, needs a cited source) | Ortho:para ratios and "bulky goes para"; chemoselectivity (ester or C-Cl surviving nitro reduction, C-Br surviving Clemmensen); the real 1-chlorobutane product mix; phenol and 4-nitrophenol pKa values | Each is either removed from the item or cited before generation. Never asserted. |

## Open questions for the owner
- ASK: plan path. `documentation/unit-plans/UNIT-3-PLAN.md` (this run) or `documentation/UNIT3-PLAN.md` (style guide 8h)?
- ASK: four stages as above, with blocking moved from after sulfonation into Stage D. Agree?
- ASK: split `u3-directing` into three lessons (directing, activation, two groups)? It is the heaviest-weighted idea in the unit, and 14 items is the biggest pool on the map.
- ASK: drop `u3-ghh` and `u3-vilsmeier` from the map, and keep `u3-kolbe` and `u3-reimer` in Unit 11 only? Keep `u3-gk` as Stage B's side quest and author a small pool?
- ASK: benzylic oxidation is "low and falling" on the exam list. Keep it on the spine for the Stage D flips, or make it a side quest?
- ASK: show "bulky groups favour para" (Chad 18.3), or keep "o/p" only, since the model cannot rank o against p?
- ASK: add the `res-arenium` resonance trainer, and give the four EAS sequences a resonance step, since the exam demands every arenium form drawn?
- ASK: add `aromatic_order_of_operations` as a ConceptId, and add `aromatic_substitution` to `oxidation_state_ladder` and `protecting_group_strategy` in `reusedIn`?
- ASK: heteroaromatic EAS sites (pyrrole, pyridine). The outline lists them under `eas_directing_effects`, but the generator has no model for them. Add one, or leave them out of Unit 3?
- ASK: the chemoselectivity examples (ester and C-Cl through nitro reduction, C-Br through Clemmensen). Cite a source, or swap them for alkyl-only rings?
