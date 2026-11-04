# Unit 4 plan: Nucleophilic Aromatic Substitution and Benzyne (4 Nov 2026)

This is the round 1 draft, written before any generator is touched (UNIT-STYLE-GUIDE.md 8h). Nothing here
is built or committed.

**Every chemistry statement in this file is a claim still to be derived.** Each species is given
as SMILES. The RDKit table at the end names the script that will check it. On 4 Nov every worked
example, new drawing, quiz item and spaced item below was run through `scripts/u4_pools.py`'s own
model, with `scripts/u3_pools.py` for the EAS steps. That scratch check passed 66 of its claims. Two
claims failed the first time and were corrected: one was a fragment-writing slip, the other a form
count that symmetry halves. Both are recorded under "RDKit derivations". The model never derives
rates, ratios or pKa values. Any item that leans on one says so and names the source it needs.

How to read it:
- *kept* means the item exists and works.
- *moved*, *retagged* and *reordered* mark a change.
- **NEW** marks a lesson or item that does not exist yet.
- *dropped* marks a removal.
- Existing item ids are in `src/game/content/u4/pools.ts`, which `scripts/u4_pools.py` generates.

Where this file lives: the run brief says `documentation/unit-plans/UNIT-4-PLAN.md`, and style
guide 8h says `documentation/UNIT4-PLAN.md`. Units 2 and 3 used the first path, and so does this
plan. The question is the same ASK as Unit 3's.

## What Unit 4 is today (inventory, 4 Nov)

- **Pathway** (`src/game/demo/pathwayMap.ts`, unit `u4`, "Short unit: aromatic reactivity inverts"):
  - Three spine lessons: `u4-snar` (beat), `u4-meisenheimer` (resonance trainer `res-meisenheimer`)
    and `u4-lg-order` (sequence trainer `seq-snar`).
  - Three side quests: `u4-benzyne`, `u4-isotope`, and `u4-dow`, which hangs `after: ["u4-snar"]`
    (owner, 20 Oct).
  - There are no stages, no stage quizzes and no section chests. Sections are cut by length.
- **Pools** (`scripts/u4_pools.py` writes `content/u4/pools.ts`): 42 entries.
  - u4-snar has 8 MCQs plus the `u4-act-ladder` sort.
  - u4-meisenheimer has 7, u4-lg-order 6, u4-benzyne 7 plus the `u4-exam-match-route` board,
    u4-isotope 6 and u4-dow 6.
  - `U4_UNWIRED` holds one sort, `u4-lg-ladder`. It is unwired because it grades Cl strictly above
    Br on a Gasteiger-charge gap that the audit doubts. That is an owner call, still open.
  - Every MCQ wrong option lacks a named cause. Only the two ladders carry causes.
  - There is no drawing and no synthesis item. Four entries carry two levels (`[1, 2]`).
- **Model** (the generator header): rule 1 is the acceptor test, rule 2 is SNAr at the halogen
  with the most o/p acceptors, rule 3 is benzyne product SETS (ratios are not modelled), rule 4
  is the Meisenheimer walk, and rule 5 is the isotope label.
  - The F > Cl > Br > I rate order is an authored convention. The Gasteiger charge stands in for
    it, and each entry flags this.
- **Trainers**:
  - `seq-snar` (`demo/sequences.ts`) has two steps and eight arrows on 1-fluoro-4-nitrobenzene
    plus methoxide. It plays at the end of `u4-lg-order`.
  - `res-meisenheimer-ring-to-o` (`demo/resonance.ts`) is one push, ring carbanion to nitro O,
    and its forms come from `anion_forms`.
- **Unit check**: `EXAM_SOURCES[checkpointNodeId("u4")]` (`beats/practice/pools.ts`) interleaves
  the graded entries of the three spine lessons. Side quests are off.
- **Guide**: `src/game/guide/u4Guide.ts`, with drawings by `scripts/guide_u4.py` and the test in
  `test/guideU4.test.ts`. The section deck is `cards/sections/u4.generated.ts` (30 cards, from
  `scripts/section_decks.py`). The Unit 0 preview item is `u0-pv-u4`.
- **Missing**: there is no `content/u4/lessonLinks.ts`, no walk-through, no read-along, no video
  slot, no priming, no worked example, no fade line, no say-why list and no callback card. Unit 4
  has none of the 3a or 8b furniture.

What breaks the 3 Nov template, and what this plan does about it:
1. **No stages, quizzes or chests** (8a, 8b.6, 8b.7). This plan adds three stages with a quiz each.
2. **No production.** The exam slots this topic feeds are prediction, mechanism and one Act 2
   SNAr question (outline D6, section 2), and every item today is a pick. This plan adds a
   drawing per practice lesson, two synthesis gaps, and a mechanism lesson that ends on `seq-snar`.
3. **The full mechanism sits at the end of the leaving-group lesson.** `seq-snar` is a capstone, and
   it asks the exam's mechanism slot (F13). It moves to a Stage C lesson of its own.
4. **A dependency hole.** `u4-dow` hangs on `u4-snar`, but three of its six items (`u4-dow-pbt`,
   `u4-dow-obt`, `u4-dow-mct`) are benzyne product mixtures, which only `u4-benzyne` teaches. A
   student who opens Dow from Stage A meets an idea no earlier lesson taught, and 3a's rule 2
   forbids that. This plan moves Dow into the benzyne stage. ASK, because this moves an owner placement.
5. **u4-snar teaches two ideas.** Half its pool (`u4-snar-which`, `u4-snar-meta-out`,
   `u4-snar-acceptor`, `u4-snar-two-cl`, `u4-act-ladder`) asks where an acceptor must sit and
   which groups count. The Meisenheimer lesson is what explains that, and it comes after u4-snar.
   Those items move to a **NEW** `u4-activation` lesson placed after `u4-meisenheimer`.
6. **Four entries carry two levels.** `u4-snar-two-cl`, `u4-meis-oxygen`, `u4-bz-aryne` and
   `u4-exam-match-route` are each retagged to one honest level (8g).

New:
- 3 stages, with stage quizzes `u4-quiz-a`, `u4-quiz-b` and `u4-quiz-c`.
- 5 new spine lessons: `u4-activation`, `u4-bz-regio`, `u4-route`, `u4-predict`, `u4-synthesis`.
  A sixth, `u4-mechanism`, holds the moved `seq-snar`.
- A drawing per practice lesson (11 new draw items).
- 2 synthesis gaps, with a new checker `scripts/u4_synthesis_gaps.py`.
- Lesson links, walk-throughs, worked examples, fade lines, say-why lists and callback cards.
- 4 new `u0:` primers and about 8 new cause ids.

Moved:
- `seq-snar` moves from `u4-lg-order` to `u4-mechanism`.
- Five u4-snar items and two u4-meisenheimer items move to `u4-activation`.
- Three u4-benzyne items move to `u4-bz-regio`.
- `u4-exam-match-route` moves from u4-benzyne to `u4-route`.
- `u4-dow` moves from after u4-snar to after u4-bz-regio.

Promoted (ASK): `u4-benzyne` moves from side quest to spine. The outline lists "benzyne by
elimination and addition, needing no EWG, giving a mixture" as one of the four teachable skills of
`nucleophilic_aromatic_substitution`, and Chad 18.6 teaches it as one of the page's two mechanisms.
It is not an extra.

Dropped: nothing. `u4-lg-ladder` stays unwired until the owner rules (ASK below).

## Header
- Unit id: u4
- Title: Nucleophilic Aromatic Substitution and Benzyne
- Outline topics: `nucleophilic_aromatic_substitution`, which has all four of its skills (SNAr by
  addition-elimination with an o/p EWG, the Meisenheimer intermediate, the reversed leaving-group
  order, and benzyne by elimination-addition giving a mixture). Stage C also uses
  `aromatic_substitution` and `eas_directing_effects` from Unit 3 ("order of operations in aromatic
  synthesis") as its route-planning context. Not here: `phenols` reactions (Unit 11), and diazonium
  substitution (Unit 10, the other way to replace a ring group).
- Exam slots fed:
  - prediction (F16, all three directions): product, reagent, starting material.
  - mechanism (F13): `seq-snar`, with the nitro-oxygen form drawn, because "all resonance
    structures where appropriate".
  - synthesis (F14, Act 1 rule: every starting-material carbon ends up in the product).
  - conceptual (F7 rank by reactivity; F9 explain under a word limit).
  - Not fed: pKa (only through spacing) and spectroscopy.
- Exam weight: no separate figure.
  - Outline D6 records SNAr as `[measured]` examined but never lectured: "a graded part of Act 1's
    prediction block and ... a full question on one semester's Act 2 exam".
  - Section 6's Act 1 table gives no NAS row. The weight is therefore one or two parts of the 30 to
    40 point prediction block, plus one Act 2 question in one semester of three. ASK whether a short
    unit should stay short (see the two-stage option at the end).
  - Act 2 assumes it, since "Act 2's exam carries forward SNAr and aromatic activation logic"
    (section 4). That is why Stage C exists.
- Assumes from earlier units:
  - u3:arenium (the contrast) and u3:directing (Stage C routes).
  - u3:nitration and u3:halogenation (Stage C).
  - u3:nitro-reduction (Stage C, one gap) and u3:sequencing (Stage C).
  - u2:donor-withdrawer, u2:induction and u2:ring-resonance.
  - u2:huckel (the Meisenheimer complex is not aromatic).
  - u2:phenol-rubric (**planned** in UNIT-2-PLAN, not built; used only by a spaced item and a
    callback, ASK).
  - u2:keq-pka and u1:anion-ranking.
  - u0:resonance and u0:orbitals.
  - u0:substitution (**NEW primer**: SN2 needs the back of the C-X carbon, SN1 needs a cation).
  - u0:leaving-group (**NEW**: a weak base leaves well, I- best in SN2).
  - u0:elimination (**NEW**: E2 takes an H beside the C-X carbon with a strong base).
  - u0:rate-step (**NEW**: the slow step sets the rate; the Ea of that step is what changes it).
- Cross-cutting concepts:
  - Introduced: none from outline section 5.
  - Reused:
    - `ewg_edg_rubric`: the outline lists this unit in `reusedIn`.
    - `resonance_delocalisation`: the pools tag it, but section 5 does not list NAS in its
      `reusedIn` (ASK: add it).
    - `carbanion_stability`: tagged in the pools; section 5 lists only `enols_and_enolates` (ASK: add
      NAS).
    - `conjugate_base_stability_argument`, through the phenol callback: ASK whether to tag it.
  - Not a ConceptId but taught here: "substitution vs elimination order" (addition then
    elimination for SNAr, elimination then addition for benzyne). This is the owner's Orgo I
    callback item; see "Orgo I callbacks".
- Sources checked:
  - OpenStax Organic Chemistry 16.6 (Nucleophilic Aromatic Substitution) and 16.7 (Benzyne),
    CC BY-NC-SA, used as a check only, as the generator header records. They were not reopened
    this round.
  - Chad's Prep 18.6 "Nucleophilic Aromatic Substitution", fetched 4 Nov. Its text states only
    "strong nucleophile ... replaces a halide" and "EWGs ortho or para make it easier", and its two
    mechanisms are images that were not read. The topic list is at
    `C:\Users\zeusa\AppData\Local\Temp\claude\ea7e655515975cdc\1add9f70-e01b-4949-82d3-12251ebbebdb\scratchpad\units\chads\unit-4.txt`.
  - COURSE-OUTLINE-ORGO2 sections 1 (D6), 2, 3, 4, 5, 6 and 7. The raw exams were not reopened.
  - LibreTexts was not checked this round.
- Status: draft

## Stages

| Stage | Topic | Main line (lesson ids in order) | Side quests | Ends on |
|---|---|---|---|---|
| A | SNAr: the ring takes a nucleophile | u4-snar (video), u4-meisenheimer, u4-activation (NEW), u4-lg-order | none | u4-quiz-a |
| B | Benzyne: no acceptor, very strong base | u4-benzyne (video, promoted), u4-bz-regio (NEW), u4-route (NEW) | u4-isotope (after u4-benzyne), u4-dow (moved, after u4-bz-regio) | u4-quiz-b |
| C | Using it: predict, plan, push arrows | u4-predict (NEW, video), u4-synthesis (NEW), u4-mechanism (NEW, holds `seq-snar`) | none | u4-quiz-c |

Why this order:
- **Mechanism above its uses** (8a).
  - u4-snar shows the two steps.
  - u4-meisenheimer shows where the charge goes.
  - Only then does u4-activation ask where the acceptor must sit, because the answer IS the
    Meisenheimer picture: o/p puts the charge on the nitro O, meta never does.
  - Leaving-group order comes last in A, because its reason ("the addition step is slow") needs both
    steps named.
- **Owner rule, context before o/m/p.** Unit 4 says "ortho or para to the halogen" constantly. Every
  time, the reason comes first: the charge lands on the carbons ortho and para to the attacked
  carbon. This is the same pattern as the arenium in Unit 3, with the sign flipped.
- **Benzyne after SNAr.** Chad 18.6 and OpenStax 16.6 to 16.7 teach it in this order, and the
  route decision ("acceptor? then SNAr; none, very strong base and an ortho H? benzyne") needs both.
- **Isotope hangs on u4-benzyne**, where the aryne is first drawn. **Dow hangs on u4-bz-regio**,
  because its mixture items are regio questions. Each stop carries at most one side quest, which
  respects the owner's 20 Oct "no stop carries three".
- **Stage C is the exam's three production slots for this topic.** Chad's 18.7 (aromatic
  retrosynthesis) follows NAS for the same reason. The mechanism lesson goes last, so the
  eight-arrow trainer is the last thing played before the quiz and it is played once.
- **No spine lesson assumes a side quest.** u4-isotope and u4-dow teach nothing a later spine
  lesson assumes (rule 3 of 3a).

## Lessons (one block per lesson)

Kinds and levels are written as `id (mcq L1)`. Production items (draw, synthesis, trainer) play
last. "**NEW**" marks an item to author. Every other id exists today. All SMILES are claims, and
the "RDKit derivations" table says which were checked on 4 Nov.

### u4-snar: SNAr, addition then elimination
- Stage / kind / role: A / spine / video
- Teaches: u4:snar
- Assumes: u3:arenium, u2:donor-withdrawer, u0:substitution (NEW primer), u0:leaving-group (NEW primer)
- Primer:
  - Big question: "Chlorobenzene shrugs off hydroxide at room temperature. Put a nitro group
    para to the Cl and it swaps. What changed?"
  - Pretest item: u4-snar-meet.
  - Ideas:
    1. The ring is usually the nucleophile (Unit 3). Here it is the electrophile.
    2. The nucleophile adds first and the halide leaves second, so this is two steps, not SN2.
    3. The added pair needs somewhere to go: a group ortho or para that can take a negative charge.
    4. The product keeps the ring, and only the halogen is swapped.
- Worked example: 1-fluoro-2-nitrobenzene `Fc1ccccc1[N+](=O)[O-]` with NaOCH2CH3, giving
  1-ethoxy-2-nitrobenzene `CCOc1ccccc1[N+](=O)[O-]`. RDKit check, 4 Nov: `u4.snar` gives exactly this
  one product. The species is not drawn anywhere in the Unit 4 pool.
  - Steps:
    1. Find the halogen.
    2. Look ortho and para to it for a group that can hold a minus. Here NO2 is ortho.
    3. Ethoxide adds to the C-F carbon, which goes sp3.
    4. The ring's pair moves onto the carbons ortho and para to that carbon, and from there onto
       the nitro O.
    5. The pair comes back, the ring re-forms, and F- leaves.
  - Figure: start, then complex, then product, three panels by `figure()`. The complex panel
    points at u4-meisenheimer for the full forms.
- First step (fade line): "First step: find the halogen, then look ortho and para to it for a group
  that can hold a negative charge."
- Practice (play order):
  - Meet:
    - u4-snar-meet (mcq L0), kept.
    - **NEW** u4-snar-meet-steps (mcq L0): "Which happens first: methoxide bonds, or chloride leaves?"
  - Recognise:
    - u4-snar-amine (mcq L1), kept.
    - u4-snar-sanger (mcq L1), kept.
    - u4-snar-oh (mcq L1), kept.
    - **NEW** u4-snar-why-not-sn2 (mcq L1, why).
  - Reason:
    - **NEW** u4-snar-vs-eas (mcq L2, confronting): "Nitrobenzene is slow in EAS. What does the same
      NO2 do to SNAr at a para C-Cl?" The species is 1-chloro-4-nitrobenzene
      `Clc1ccc([N+](=O)[O-])cc1`.
  - Produce:
    - **NEW** u4-snar-draw-ome (draw L3): 1-fluoro-4-nitrobenzene `Fc1ccc([N+](=O)[O-])cc1` with
      NaOCH3. Draw `COc1ccc([N+](=O)[O-])cc1` (checked).
- Moved out to u4-activation: u4-snar-which, u4-snar-meta-out, u4-snar-acceptor, u4-snar-two-cl
  and u4-act-ladder. The pool goes from 9 to 8, inside the generator's 6 to 12.
- Why items:
  - u4-snar-why-not-sn2 ("why can't methoxide come in from the back of the C-Cl carbon, as in SN2:
    the ring is in the way") pairs with u4-snar-meet.
  - u4-snar-vs-eas pairs with u4-snar-oh.
- Say-why mix-ups:
  1. "It is SN2 on a ring: one step, backside attack." Fix: the back of the C-Cl carbon is inside
     the ring, so nothing can reach it. The nucleophile adds to the face of the ring first, and the
     halide leaves in a second step.
  2. "A nitro group slows every reaction of the ring." Fix: it slows EAS, where the ring must give
     electrons. SNAr needs the ring to take electrons, so a withdrawer helps.
- Picture: the 8e Mechanism row (the trainer comes in Stage C; here, the three-panel figure) and the
  Any-molecule row. The read-along shows start, complex and product by pointer.
- Video slot: 3 minutes. Shows:
  - "Hydroxide bouncing off chlorobenzene, then swapping in once a para NO2 is added"
  - "The nucleophile adding to the face of the ring, and the carbon going sp3"
  - "The halide leaving and the ring closing again"

### u4-meisenheimer: Where the charge goes
- Stage / kind / role: A / spine / practice. It was the resonance-trainer node, and the trainer stays
  as its produce step.
- Teaches: u4:meisenheimer
- Assumes: u4:snar, u2:ring-resonance, u2:huckel, u1:anion-ranking, u0:resonance
- Primer:
  - Big question: "The ring has just taken a pair of electrons it did not want. Where does it put them?"
  - Pretest item: u4-meis-meet.
  - Ideas:
    1. The attacked carbon is sp3 and drops out of the loop.
    2. The minus sits on the carbons ortho and para to it, never meta.
    3. A nitro group on one of those carbons takes the minus onto oxygen, which is the best form.
    4. The complex is not aromatic. That is why this step is slow.
- Worked example: methoxide adds at the C-Br carbon of 1-bromo-2-nitrobenzene
  `Brc1ccccc1[N+](=O)[O-]`. That carbon is not drawn in this lesson's pool. RDKit check, 4 Nov:
  `anion_forms` gives four forms.
  - The three ring forms: `COC1(Br)[CH-]C=CC=C1[N+](=O)[O-]`, `COC1(Br)C=C[CH-]C=C1[N+](=O)[O-]`
    and `COC1(Br)C=CC=C[C-]1[N+](=O)[O-]`.
  - The nitro-oxygen form: `COC1(Br)C=CC=CC1=[N+]([O-])[O-]`.
  - Charge sites: ortho and para; one group (the NO2) takes it.
  - Steps:
    1. Mark the sp3 carbon.
    2. Put the minus on its neighbour.
    3. Walk the minus across each C=C, which reaches ortho, para, and the other ortho.
    4. The ortho carbon carries NO2, so push the pair onto N=O and the minus lands on O.
  - Figure: all four forms with arrows (8e Resonance row).
- First step (fade line): "First step: mark the carbon the nucleophile bonds to. It goes sp3, and
  the minus starts on its neighbour."
- Practice (play order):
  - Meet: u4-meis-meet (mcq L0).
  - Recognise:
    - u4-meis-sites (mcq L1), u4-meis-sp3 (mcq L1) and u4-meis-aromatic (mcq L1), all kept.
    - **NEW** u4-meis-why-o (mcq L1, why): "Why is the form with the minus on O the best one?"
  - Reason:
    - u4-meis-oxygen (mcq, *retagged* from L1/L2 to L2).
    - **NEW** u4-meis-ortho (mcq L2, confronting): methoxide at C-Cl of 1-chloro-2-nitrobenzene
      `Clc1ccccc1[N+](=O)[O-]`. "Can an ortho nitro take the charge?" Yes. This answers the
      "only para works" slip.
  - Produce:
    - res-meisenheimer (resonance trainer L2), kept, one push.
    - Draw: ASK. "Draw the form with the charge on a nitro O" needs the editor to take an sp3 ring
      carbon and a ring anion. Until the owner rules, the trainer is the produce step.
- Moved out to u4-activation: u4-meis-meta, u4-meis-dinitro. The pool is 7 entries.
- Why items:
  - u4-meis-why-o pairs with u4-meis-oxygen.
  - u4-meis-aromatic ("why the complex is not aromatic") pairs with the trainer.
- Say-why mix-ups:
  1. "The Meisenheimer complex is aromatic, because it is still a six-membered ring." Fix: one ring
     carbon is sp3, so the loop of p orbitals is broken (Unit 2's first test fails).
  2. "The minus can sit on the meta carbons too." Fix: walking the pair across C=C bonds moves it
     two atoms at a time, so from the attacked carbon it reaches only ortho and para.
- Picture: the 8e Resonance row (four forms with arrows from RDKit bond orders) and the Spatial row
  (a turnable complex, showing the sp3 carbon out of the p-orbital plane).
- Video slot: n/a (practice).

### u4-activation: Where the acceptor must sit (NEW)
- Stage / kind / role: A / spine / practice
- Teaches: u4:activation (which groups are acceptors, and why o/p and not meta)
- Assumes: u4:meisenheimer, u2:donor-withdrawer, u2:induction
- Primer:
  - Big question: "Two chloroacetophenones, one acetyl group each. Why does only one react?"
  - Pretest item: **NEW** u4-act-meet.
  - Ideas:
    1. An acceptor's first atom has a multiple bond to O or N (NO2, CN, CHO, COR). This is
       generator rule 1, taught as "it can take the pair onto O or N".
    2. It helps only at ortho or para, where the minus lands.
    3. More acceptors at o/p mean more places for the charge, so the reaction is faster.
    4. CF3 and the halogens pull by induction, but they cannot take the pair by resonance.
- Worked example: 4-chloroacetophenone `CC(=O)c1ccc(Cl)cc1` against 3-chloroacetophenone
  `CC(=O)c1cccc(Cl)c1`, each with NaOCH3. RDKit check, 4 Nov: there is 1 o/p acceptor at the C-Cl
  carbon of the 4-isomer and 0 at the 3-isomer. The 4-isomer gives `COc1ccc(C(C)=O)cc1`, and the
  3-isomer gives no SNAr. Neither species is in the pool.
  - Steps:
    1. Find the halogen.
    2. Count the ring path to the acetyl carbon: 3 bonds (para) or 2 bonds (meta).
    3. Para: the minus reaches the ring carbon that carries the C=O, so it moves onto O.
    4. Meta: it never does, so there is no reaction.
  - Figure: the two complexes side by side, with the reaching arrow and the blocked one.
- First step (fade line): "First step: from the halogen's carbon, count to each acceptor. One or
  three bonds away helps; two does not."
- Practice (play order):
  - Meet: **NEW** u4-act-meet (mcq L0): NO2 against CH3 para to Cl, "which can hold the charge".
  - Recognise:
    - u4-snar-which (mcq L1), *moved*.
    - u4-snar-meta-out (mcq L1), *moved*.
    - u4-snar-acceptor (mcq L1), *moved*.
    - u4-meis-meta (mcq L1), *moved*.
    - **NEW** u4-act-why-meta (mcq L1, why).
  - Reason:
    - u4-meis-dinitro (mcq L2), *moved*.
    - u4-snar-two-cl (mcq, *moved*, *retagged* to L2).
    - **NEW** u4-act-cf3 (mcq L2, confronting): 4-chlorobenzotrifluoride `FC(F)(F)c1ccc(Cl)cc1` with
      NaOCH3. The rule-1 answer is no SNAr (checked).
    - **NEW** u4-act-dinitro-meta (mcq L2, confronting): 1-chloro-3,5-dinitrobenzene
      `Clc1cc([N+](=O)[O-])cc([N+](=O)[O-])c1`. Two withdrawers, but both meta, so no SNAr (checked).
  - Order: u4-act-ladder (sort L2), *moved*.
  - Produce: **NEW** u4-act-draw-me (draw L3): 1-chloro-2-methyl-4-nitrobenzene
    `Cc1cc([N+](=O)[O-])ccc1Cl` with NaOCH3 gives `COc1ccc([N+](=O)[O-])cc1C` (checked).
- Pool: 11 entries.
- Real-chemistry flag on u4-act-cf3: the model's "not an acceptor" is a teaching rule, not a rate
  measurement. Real 4-chlorobenzotrifluoride is slow but not inert under forcing conditions. The
  item must say "at room temperature" or "compared with the nitro compound", and the claim needs a
  cited source before it ships (ASK).
- Why items:
  - u4-act-why-meta pairs with u4-snar-meta-out.
  - u4-act-cf3's reason card ("CF3 pulls but cannot take the pair") pairs with u4-snar-acceptor.
- Say-why mix-ups:
  1. "Any withdrawing group anywhere on the ring turns SNAr on." Fix: only ortho or para, because
     only those carbons carry the minus. Meta gets induction only.
  2. "CF3 is a strong withdrawer, so it activates like NO2." Fix: CF3 has no multiple bond to take
     the pair, so it can only pull through sigma bonds. That is not enough.
- Picture: the 8e Rankings row (`u4-act-ladder`) and the Resonance row (the worked example pair).
- Video slot: n/a.

### u4-lg-order: The reversed leaving-group order
- Stage / kind / role: A / spine / practice
- Teaches: u4:lg-order
- Assumes: u4:snar, u4:activation, u0:leaving-group, u0:rate-step (NEW primer)
- Primer:
  - Big question: "In SN2, iodide leaves best. In SNAr, fluoride wins. How can both be true?"
  - Pretest item: **NEW** u4-lg-meet.
  - Ideas:
    1. Addition is the slow step, and the halide leaves in the fast one.
    2. So whatever speeds addition speeds the reaction.
    3. F pulls hardest and makes its carbon the most electron poor, so addition is fastest at C-F.
    4. Leaving ability no longer sets the rate.
- Worked example: 2-chloro-4-fluoro-1-nitrobenzene `O=[N+]([O-])c1ccc(F)cc1Cl` with one equivalent
  of NaOCH3. RDKit check, 4 Nov: both halogens have exactly one o/p acceptor (a tie). By the F > Cl
  convention, F is swapped, giving `COc1ccc([N+](=O)[O-])c(Cl)c1`. The species is not in the pool.
  - Steps:
    1. Check each halogen for o/p acceptors. Both have one (Cl ortho, F para).
    2. Tie, so ask which carbon adds faster: the one with the most electronegative halogen.
    3. Swap F, and keep Cl.
  - Figure: start and product, with the C-F carbon marked.
- First step (fade line): "First step: check each halogen for an acceptor ortho or para. Only a
  tie goes to the halogen order."
- Practice (play order):
  - Meet: **NEW** u4-lg-meet (mcq L0): 1-fluoro- against 1-iodo-2,4-dinitrobenzene, "which is faster".
  - Recognise:
    - u4-lg-fastest, u4-lg-slowest, u4-lg-why and u4-lg-pair (all mcq L1), kept.
  - Reason:
    - u4-lg-mixed (mcq L2), kept.
    - u4-lg-bromo-fluoro (mcq, *retagged* L1 to L2, confronting). In 1-bromo-4-fluoro-2-nitrobenzene
      only Br has an o/p acceptor, so Br goes, not F. This answers "F always leaves first".
    - **NEW** u4-lg-why-sn2 (mcq L2, confronting): "You chose the iodide because I- is the best
      leaving group. Why is that the SN2 answer, not the SNAr one?"
  - Order: u4-lg-ladder (sort L2), wiring is an ASK. It stays unwired until the owner rules on the
    Cl-above-Br gap.
  - Produce: **NEW** u4-lg-draw (draw L3): 4-bromo-2-fluoro-1-nitrobenzene
    `Brc1ccc([N+](=O)[O-])c(F)c1` with one equivalent of NaOCH3. Both halogens are activated, so F is
    swapped, giving `COc1cc(Br)ccc1[N+](=O)[O-]` (checked).
- Moved out: `seq-snar` goes to u4-mechanism. With no trainer step left, the lesson gains a Challenge.
- Why items:
  - u4-lg-why (kept) pairs with u4-lg-fastest.
  - u4-lg-why-sn2 pairs with u4-lg-slowest.
- Say-why mix-ups:
  1. "The best leaving group reacts fastest, as in SN2." Fix: in SNAr the C-X bond breaks after the
     slow step, so how well X leaves does not set the rate.
  2. "Fluorine always leaves first." Fix: the acceptor test comes first. An unactivated C-F does
     nothing, and an activated C-Br wins over it.
- Picture: the 8e Rankings row (the ladder, if wired) and the Rate-vs-stability row: one energy
  diagram of methoxide plus 1-fluoro-4-nitrobenzene with the first hump tallest. The barrier heights
  are not derivable by RDKit and the diagram is qualitative. ASK whether one qualitative diagram is
  acceptable.
- Video slot: n/a.

### u4-quiz-a: Stage A checkpoint
- Stage / kind / role: A / spine / quiz
- Items (all L2 or L3, no hint; all **NEW**):
  - u4-qa-which-reacts (mcq L2): which reacts with NaOCH3. The options are 4-chlorobenzaldehyde
    `O=Cc1ccc(Cl)cc1`, 3-chlorobenzaldehyde `O=Cc1cccc(Cl)c1`, 4-chlorotoluene `Cc1ccc(Cl)cc1` and
    chlorobenzene (checked: the 4-CHO only).
  - u4-qa-where (mcq L2): where the charge sits in the complex from 4-chlorobenzaldehyde, and
    whether it reaches the C=O oxygen (checked: ortho, para, and the aldehyde O).
  - u4-qa-meta-trap (mcq L2): 1-fluoro-3-nitrobenzene `Fc1cccc([N+](=O)[O-])c1` with NaOCH3, which
    gives no reaction (checked).
  - u4-qa-lg-tie (mcq L2): 4-chloro-2-fluoro-1-nitrobenzene `O=[N+]([O-])c1ccc(Cl)cc1F`, where F is
    swapped (checked).
  - u4-qa-why-not-aromatic (mcq L2).
  - u4-qa-draw (draw L3): 1-fluoro-2,4-dinitrobenzene with CH3CH2NH2 gives
    `CCNc1ccc([N+](=O)[O-])cc1[N+](=O)[O-]` (checked).
  - u4-qa-space-u2-phenol (spaced; see Spacing).
  - u4-qa-space-u3-eas (spaced).
- That is 8 items.

### u4-benzyne: Benzyne, elimination then addition
- Stage / kind / role: B / spine (*promoted* from branch, ASK) / video
- Teaches: u4:benzyne
- Assumes: u4:snar, u4:activation, u0:elimination (NEW primer), u0:orbitals, u2:keq-pka
- Primer:
  - Big question: "Chlorobenzene has no acceptor, yet NaNH2 turns it into aniline. How, if SNAr
    is shut?"
  - Pretest item: u4-bz-meet.
  - Ideas:
    1. With no acceptor, a very strong base takes the H beside the halogen instead.
    2. The halide leaves and the two carbons share a new, weak pi bond. That is benzyne.
    3. NH2- adds to either end, and NH3 gives the H back.
    4. No H beside the halogen means no benzyne.
- Worked example: 1-bromo-4-ethylbenzene `CCc1ccc(Br)cc1` with NaNH2 in NH3(l). RDKit check, 4 Nov:
  both ortho H's give the same aryne (`CCc1cc#ccc1`, by symmetry). The products are the set
  {4-ethylaniline `CCc1ccc(N)cc1`, 3-ethylaniline `CCc1cccc(N)c1`}. The species is not in the pool.
  - Steps:
    1. Check for an acceptor. There is none, so not SNAr.
    2. Find an H on a carbon next to the C-Br.
    3. NH2- takes that H and Br- leaves, giving benzyne.
    4. NH2- adds to either aryne carbon, giving two anilines.
  - Figure: start, aryne, then the two products. The ratio is NOT shown or claimed.
- First step (fade line): "First step: check for an acceptor. None? Then look for an H on the
  carbon next to the halogen."
- Practice (play order):
  - Meet: u4-bz-meet (mcq L0).
  - Recognise:
    - u4-bz-no-h (mcq L1), kept.
    - u4-bz-vs-snar (mcq L1), kept.
    - **NEW** u4-bz-why-base (mcq L1, why): "Why NaNH2 and not NaOCH3?"
  - Reason:
    - u4-bz-aryne (mcq, *retagged* L1/L2 to L2).
    - **NEW** u4-bz-orbital (mcq L2): "The new bond in benzyne is weak because its two sp2 orbitals
      lie in the ring plane and overlap side-on poorly." This is NOT RDKit-derivable and needs a
      cited source (OpenStax 16.7) before it ships.
  - Produce: **NEW** u4-bz-draw-tbu (draw L3): 1-bromo-4-tert-butylbenzene `CC(C)(C)c1ccc(Br)cc1`
    with NaNH2. Draw both anilines {`CC(C)(C)c1ccc(N)cc1`, `CC(C)(C)c1cccc(N)c1`} (checked). ASK:
    the draw item grades one structure today. A two-product answer needs a set grader or two boxes.
- Moved out to u4-bz-regio: u4-bz-pct, u4-bz-oct, u4-bz-mct-count.
- Moved out to u4-route: u4-exam-match-route.
- Pool: 6 entries.
- Why items:
  - u4-bz-why-base pairs with u4-bz-meet.
  - u4-bz-no-h's explanation is reworded to ask why (no H next door, so no elimination). It pairs
    with u4-bz-aryne.
- Say-why mix-ups:
  1. "NH2 always lands on the carbon that held the halogen." Fix: benzyne has two ends, and the
     nucleophile adds to either one.
  2. "Any strong nucleophile makes benzyne." Fix: it takes a base strong enough to remove an aryl
     C-H. Methoxide is not. Amide (and hot NaOH under pressure) is.
- Picture: the 8e Spatial row (a turnable aryne, showing the in-plane sp2 lobes beside the pi
  cloud; RDKit ETKDG cannot embed a strained aryne cleanly, so ASK, or fall back to a hand-free
  2-D figure plus a sentence) and the Any-molecule row.
- Video slot: 3 minutes. Shows:
  - "Amide pulling the H beside Br, and Br leaving"
  - "The new pi bond lying flat in the ring plane, separate from the ring's own pi cloud"
  - "NH2 adding to either end, giving two anilines"

### u4-isotope: The isotope-label proof (side quest)
- Stage / kind / role: B / branch / practice, after u4-benzyne (unchanged)
- Teaches: u4:isotope-proof
- Assumes: u4:benzyne
- Primer:
  - Big question: "How do we know benzyne exists, when nobody can bottle it?"
  - Pretest item: u4-iso-meet.
  - Ideas:
    1. Put 14C on the C-Cl carbon.
    2. A one-step swap would leave N on the labelled carbon only.
    3. Benzyne puts N on it or next to it.
    4. A 50:50 split is the signature.
- Worked example: bromobenzene-1-14C `Br[14c]1ccccc1` with NaNH2. Claim: the label sits on C-N or
  ortho to it, 50:50. Rule 5 holds: the two aryne carbons are equivalent by canonical rank, isotope
  effect neglected. Checked 4 Nov: `outcome` gives `N[14c]1ccccc1` (ipso) and `Nc1cccc[14cH]1` (ortho); the 50:50 is rule 5's convention. Bromobenzene is not in the pool.
- First step (fade line): "First step: follow the labelled carbon through the aryne. Which two
  carbons can N bond to?"
- Practice (play order):
  - Meet: u4-iso-meet (mcq L0).
  - Recognise: u4-iso-ratio (mcq L1), u4-iso-direct (mcq L1, why: what one-step would give) and
    u4-iso-proves (mcq L1).
  - Reason: u4-iso-tiles (mcq L2) and u4-iso-c2 (mcq L2).
  - Produce: none. ASK whether a side quest needs a drawing. Unit 3's plan asked the same.
- Why items: u4-iso-direct pairs with u4-iso-ratio.
- Say-why mix-ups:
  1. "The label stays where the Cl was." Fix: the nucleophile adds to either aryne carbon.
  2. "A 50:50 split means two different mechanisms ran." Fix: one mechanism with two equivalent ends.
- Picture: the Any-molecule row, with the labelled atom marked.
- Video slot: n/a.

### u4-bz-regio: Substituted benzynes give mixtures (NEW)
- Stage / kind / role: B / spine / practice
- Teaches: u4:benzyne-regio (product SETS only, never ratios)
- Assumes: u4:benzyne
- Primer:
  - Big question: "4-Chlorotoluene and NaNH2 give two anilines, but 2-chlorotoluene gives two
    different ones. How do you predict the set?"
  - Pretest item: **NEW** u4-reg-meet.
  - Ideas:
    1. Each H beside the halogen gives its own aryne.
    2. Each aryne gives two products, one from each end.
    3. Equivalent arynes or products count once.
    4. This unit asks which products form, not how much of each.
- Worked example: 1-bromo-2-ethylbenzene `CCc1ccccc1Br` with NaNH2. RDKit check, 4 Nov: there is one
  ortho H, so one aryne, and the set is {2-ethylaniline `CCc1ccccc1N`, 3-ethylaniline
  `CCc1cccc(N)c1`}. Contrast 1-bromo-3-ethylbenzene `CCc1cccc(Br)c1`: two arynes and three anilines
  (checked). Neither is in the pool.
  - Steps:
    1. List the C-H's next to C-Br.
    2. Draw each aryne.
    3. Add N to each end.
    4. Strike the duplicates.
  - Figure: the one aryne and its two products. A second row shows the three-product case.
- First step (fade line): "First step: count the hydrogens on carbons next to the halogen. Each one
  gives an aryne."
- Practice (play order):
  - Meet: **NEW** u4-reg-meet (mcq L0).
  - Recognise:
    - u4-bz-pct (mcq L1), *moved*.
    - u4-bz-oct (mcq L1), *moved*.
    - **NEW** u4-reg-why-two-ends (mcq L1, why).
  - Reason:
    - u4-bz-mct-count (mcq L2), *moved*.
    - **NEW** u4-reg-anisole (mcq L2): 4-bromoanisole `COc1ccc(Br)cc1` with NaNH2, set {4- and
      3-methoxyaniline} (checked). Real-chemistry flag: the literature gives mostly the meta product
      here (an inductive effect). The item asks only which products FORM. ASK whether to show
      "mostly meta" with a cited source, or keep sets only.
  - Connect: **NEW** u4-reg-match (match L2): substrate to number of products. Bromobenzene gives 1,
    1-bromo-4-ethylbenzene 2, 1-bromo-3-ethylbenzene 3, and 2-bromo-1,3-diethylbenzene
    `CCc1cccc(CC)c1Br` 0 (all checked).
  - Produce: **NEW** u4-reg-draw (draw L3): 1-chloro-3,5-dimethylbenzene `Cc1cc(C)cc(Cl)c1` with
    NaNH2, set {`Cc1cc(C)cc(N)c1`, `Cc1ccc(N)c(C)c1`} (checked). This waits on the same multi-product
    draw ASK as u4-bz-draw-tbu. Fallback: the draw asks for "the product with NH2 on a carbon that
    never held Cl".
- Pool: 7 entries.
- Why items: u4-reg-why-two-ends pairs with u4-bz-oct.
- Say-why mix-ups:
  1. "A substituted benzyne gives one product, like chlorobenzene." Fix: once the ring carries a
     group, the two ends of the aryne are different, so two products.
  2. "Count products by counting halogens." Fix: count H's beside the halogen, then two ends per aryne.
- Picture: the 8e Any-molecule row (sets drawn as tiles) and a match board.
- Video slot: n/a.

### u4-dow: The Dow phenol process (side quest, moved)
- Stage / kind / role: B / branch / practice. It moves from after u4-snar to after u4-bz-regio (ASK).
- Teaches: u4:dow
- Assumes: u4:benzyne, u4:benzyne-regio
- Primer:
  - Big question: "Industry made phenol from chlorobenzene with plain NaOH. What made it work?"
  - Pretest item: u4-dow-meet.
  - Ideas:
    1. 340 °C and pressure let hydroxide do what amide does at -33 °C.
    2. It goes the benzyne way, so substituted rings give mixtures.
    3. Acid at the end turns phenoxide into phenol.
- Worked example: 1-bromo-4-ethylbenzene `CCc1ccc(Br)cc1` with hot NaOH, then H3O+. Claim: the set
  {4-ethylphenol `CCc1ccc(O)cc1`, 3-ethylphenol `CCc1cccc(O)c1`}, by the same rule 3 with an OH
  fragment. Checked 4 Nov through the `outcome(..., "NaOH")` path. This is the u4-benzyne example species with a
  new nucleophile, and the Dow pool does not draw it.
- First step (fade line): "First step: no acceptor, so ask whether the base is strong enough for
  benzyne. Hot NaOH under pressure is."
- Practice (play order):
  - Meet: u4-dow-meet (mcq L0).
  - Recognise: u4-dow-pbt (mcq L1), u4-dow-obt (mcq L1) and u4-dow-salt (mcq L1).
  - Reason: u4-dow-single (mcq L2) and u4-dow-mct (mcq L2).
  - Produce: none (ASK, as for u4-isotope).
- Why items: **NEW** u4-dow-why-heat (mcq L1): "why does NaOH need 340 °C here when NaNH2 needs none".
  It pairs with u4-dow-meet. Without the new item the pool is 6.
- Say-why mix-ups:
  1. "Hot NaOH is just SNAr." Fix: chlorobenzene has no acceptor, and the methylated rings give
     mixtures, which is the benzyne signature.
  2. "The product is the phenoxide salt." Fix: the acid step protonates it to phenol.
- Picture: the Any-molecule row.
- Video slot: n/a.

### u4-route: SNAr, benzyne, or nothing (NEW)
- Stage / kind / role: B / spine / practice
- Teaches: u4:route-choice
- Assumes: u4:activation, u4:lg-order, u4:benzyne-regio
- Primer:
  - Big question: "Aryl halide plus a nucleophile. Before drawing anything: which way, if any?"
  - Pretest item: **NEW** u4-route-meet.
  - Ideas:
    1. Acceptor ortho or para? SNAr, one product at that carbon.
    2. No acceptor, very strong base, an H next door? Benzyne, possibly a mixture.
    3. Neither? No reaction.
    4. Check in that order.
- Worked example: 4-bromobenzonitrile `N#Cc1ccc(Br)cc1` with NaOCH3. Para CN, so SNAr, giving
  `COc1ccc(C#N)cc1`. Against bromobenzene with NaOCH3 (no reaction) and bromobenzene with NaNH2
  (aniline). All checked 4 Nov, and none is in the pool.
  - Steps: the three checks, in order, for each pair.
  - Figure: three rows, one per verdict.
- First step (fade line): "First step: look for an acceptor ortho or para to the halogen before you
  look at the base."
- Practice (play order):
  - Meet: **NEW** u4-route-meet (mcq L0).
  - Recognise:
    - **NEW** u4-route-why (mcq L1, why: "why check the acceptor before the base").
    - **NEW** u4-route-cf3 (mcq L1): 4-chlorobenzotrifluoride gives nothing with NaOCH3 and two
      anilines with NaNH2 (checked by the model; same real-chemistry flag as u4-act-cf3).
  - Reason:
    - **NEW** u4-route-trap (mcq L2, confronting): 4-chlorotoluene with NaOCH3. No acceptor and too
      weak a base, so no reaction (checked).
    - **NEW** u4-route-diethyl (mcq L2): 2-bromo-1,3-diethylbenzene with NaNH2. No ortho H, so no
      reaction (checked).
  - Connect: u4-exam-match-route (match, *moved* from u4-benzyne, *retagged* L1/L2 to L2).
  - Produce: **NEW** u4-route-draw (draw L3): 4-fluorobenzaldehyde `O=Cc1ccc(F)cc1` with NaOCH3
    gives `COc1ccc(C=O)cc1` (checked).
- Pool: 7 entries.
- Why items:
  - u4-route-why pairs with u4-exam-match-route.
  - u4-route-trap's reason pairs with u4-route-draw.
- Say-why mix-ups:
  1. "A strong nucleophile replaces any aryl halogen." Fix: without an o/p acceptor or a base
     strong enough for benzyne, nothing happens.
  2. "With NaNH2 it is always benzyne." Fix: if an acceptor sits o/p, SNAr is open and is the
     route the unit teaches. ASK: real nitroarenes with NaNH2 can do other chemistry, so the plan
     keeps NaNH2 off nitro rings entirely.
- Picture: the 8e Any-molecule row and a match board.
- Video slot: n/a.

### u4-quiz-b: Stage B checkpoint
- Items (all **NEW**, L2 or L3):
  - u4-qb-count (mcq L2): 3-bromoanisole `COc1cccc(Br)c1` with NaNH2, "how many methoxyanilines"
    (checked: 3).
  - u4-qb-no-h (mcq L2): 2-bromo-1,3-diisopropylbenzene `CC(C)c1cccc(C(C)C)c1Br` with NaNH2. No
    reaction (checked).
  - u4-qb-route (mcq L2): 4-chlorobenzonitrile `N#Cc1ccc(Cl)cc1` with NaOCH3, SNAr, giving
    `COc1ccc(C#N)cc1` (checked).
  - u4-qb-label (mcq L2): bromobenzene-1-14C, the label split (checked 4 Nov: ipso and ortho, rule 5).
  - u4-qb-why-base (mcq L2).
  - u4-qb-draw (draw L3): 1-chloro-3,5-dimethylbenzene with NaNH2. This is the u4-reg-draw species,
    so ASK. Swap it for a fresh species once the multi-product draw is settled.
  - u4-qb-space-activation (spaced).
  - u4-qb-space-lg (spaced).
- That is 8 items.

### u4-predict: Predict it three ways (NEW)
- Stage / kind / role: C / spine / video
- Teaches: u4:prediction (product, reagent or starting material: outline F16's three sub-forms)
- Assumes: u4:route-choice, u3:directing, u3:halogenation
- Primer:
  - Big question: "The exam hides the box in three places: the product, the reagent or the start.
    Same rules, three directions. Can you run them backwards?"
  - Pretest item: **NEW** u4-pred-meet.
  - Ideas:
    1. Forward: route check, then swap.
    2. Reagent: what changed on the ring tells you the nucleophile.
    3. Start: the new group sits where an activated halogen was.
    4. The same ring can do EAS with E+ or SNAr with Nu-, so read the reagent first.
- Worked example: 1-chloro-2,4-dinitrobenzene `Clc1ccc([N+](=O)[O-])cc1[N+](=O)[O-]` with piperidine
  gives `O=[N+]([O-])c1ccc(N2CCCCC2)c([N+](=O)[O-])c1` (checked 4 Nov), worked forward and then
  backward ("which amine gave this?"). Piperidine is not in the pool, but the chlorodinitrobenzene is
  (`cdnb`, in u4-snar and u4-meisenheimer, not in this lesson).
- First step (fade line): "First step: find what changed on the ring. That names the reagent, or
  tells you where the halogen was."
- Practice (play order):
  - Meet: **NEW** u4-pred-meet (mcq L0).
  - Recognise:
    - **NEW** u4-pred-amine (mcq L1): 1-fluoro-4-nitrobenzene with morpholine gives
      `O=[N+]([O-])c1ccc(N2CCOCC2)cc1` (checked).
    - **NEW** u4-pred-why (mcq L1, why).
  - Reason:
    - **NEW** u4-pred-reagent (mcq L2): start 1-fluoro-4-nitrobenzene, product 4-(4-nitrophenyl)
      morpholine. Pick the reagent.
    - **NEW** u4-pred-sm (mcq L2): product 4-methoxybenzonitrile from NaOCH3. Pick the start among
      4-fluorobenzonitrile `N#Cc1ccc(F)cc1` (SNAr, checked), 3-fluorobenzonitrile `N#Cc1cccc(F)c1`
      (no SNAr, checked) and 4-fluorotoluene `Cc1ccc(F)cc1` (no reaction, checked).
    - **NEW** u4-pred-eas-or-snar (mcq L2, confronting): 1-chloro-4-nitrobenzene with Br2/FeBr3
      against NaOCH3. EAS puts Br ortho to Cl, giving `O=[N+]([O-])c1ccc(Cl)c(Br)c1` (u3 model,
      checked). SNAr swaps Cl for OCH3.
  - Produce: **NEW** u4-pred-draw (draw L3): the worked example's partner, 1-fluoro-2,4-dinitrobenzene
    with piperidine, giving `O=[N+]([O-])c1ccc(N2CCCCC2)c([N+](=O)[O-])c1` (checked 4 Nov).
- Pool: 7 entries.
- Why items: u4-pred-why ("why the same ring gives different products with Br2/FeBr3 and NaOCH3")
  pairs with u4-pred-eas-or-snar.
- Say-why mix-ups:
  1. "A nitro ring does EAS at the C-Cl carbon, like SNAr." Fix: EAS replaces an H and follows the
     directing rules. SNAr replaces the halogen.
  2. "Any fluoroarene gives this methoxy product." Fix: the start must carry an acceptor o/p to the F.
- Picture: the Any-molecule row (start, reagent and product, with one box blank).
- Video slot: 3 minutes. Shows:
  - "One ring, two reagents: Br2/FeBr3 and NaOCH3, two different products"
  - "Reading a product backwards to the nucleophile"
  - "Reading a product backwards to the halogen's carbon"

### u4-synthesis: Plan a route that ends in SNAr (NEW)
- Stage / kind / role: C / spine / practice
- Teaches: u4:snar-synthesis
- Assumes: u4:prediction, u3:sequencing, u3:nitration, u3:halogenation, u3:nitro-reduction
- Primer:
  - Big question: "You want 4-nitroanisole from benzene. Nitrate first, or chlorinate first?"
  - Pretest item: **NEW** u4-syn-meet.
  - Ideas:
    1. SNAr needs the halogen and the acceptor ortho or para to each other.
    2. So the group that sends the next one o/p must go on first.
    3. Then the acceptor, then the swap.
    4. A nitro group can be reduced afterwards (Unit 3).
- Worked example: benzene to 1-methoxy-4-nitrobenzene.
  - Route: Cl2/FeCl3 gives chlorobenzene. HNO3/H2SO4 gives the o/p set (u3 `eas_major`, checked:
    4- and 2-chloronitrobenzene). Take para, then NaOCH3 gives `COc1ccc([N+](=O)[O-])cc1` (checked).
  - The wrong order: nitrate first, and chlorination goes meta to give `Clc1cccc([N+](=O)[O-])c1`
    (checked). Then SNAr fails (checked).
  - Act 1 carbon rule: all six benzene carbons are in the product.
  - Flags: the o:p split is NOT derivable. Real nitration gives both, and the route says "separate
    the para isomer". Also, nitrating anisole directly gives o/p too; why the SNAr route is preferred
    is a claim that needs a source, ASK.
  - Figure: the two routes side by side, the dead end marked.
- First step (fade line): "First step: in the target, find the two groups SNAr needs and check that
  they are ortho or para to each other."
- Practice (play order):
  - Meet: **NEW** u4-syn-meet (mcq L0).
  - Recognise: **NEW** u4-syn-why-order (mcq L1, why).
  - Reason:
    - **NEW** u4-syn-wrong-order (mcq L2, confronting: the meta dead end).
    - **NEW** u4-syn-sort (sort L2: the three steps in order).
  - Produce:
    - **NEW** syn-u4-nitroanisole (synthesis L3, bank).
    - **NEW** syn-u4-anisidine (synthesis L3, typed): the same route, then H2/Pd-C gives
      4-methoxyaniline `COc1ccc(N)cc1`.
  - The two gaps get a new checker, `scripts/u4_synthesis_gaps.py`, modelled on
    `u3_synthesis_gaps.py` (`route_gives`). It adds STEP entries `snar_ome`, `snar_oh` and
    `snar_amine`.
- Pool: 6 entries.
- Why items: u4-syn-why-order pairs with syn-u4-nitroanisole.
- Say-why mix-ups:
  1. "Put the groups on in the order they are named." Fix: put first the group that directs the
     next one to the position SNAr needs.
  2. "Nitrate last; the nitro group is only needed in the product." Fix: the nitro group must be
     there BEFORE the swap, because it is what lets the swap happen.
- Picture: the Any-molecule row (route figures) and a sort ladder.
- Video slot: n/a.

### u4-mechanism: The full SNAr mechanism (NEW, holds seq-snar)
- Stage / kind / role: C / spine / practice
- Teaches: u4:snar-arrows
- Assumes: u4:snar, u4:meisenheimer, u4:lg-order, u4:benzyne (for the contrast item)
- Primer:
  - Big question: "Eight arrows, two steps. The exam gives 10 points for them and demands every
    resonance form. Can you push all of them?"
  - Pretest item: **NEW** u4-mech-meet.
  - Ideas:
    1. Step 1: the nucleophile's pair to carbon, the C=C pair moving along to the nitro O.
    2. Step 2: the O pair comes back, the ring re-forms, and the C-F pair leaves with F.
    3. Draw the oxygen form; the exam requires it.
    4. Benzyne is the same two events in the opposite order.
- Worked example: the `seq-snar` species itself is the trainer, so the worked example must be
  another one. Use 1-chloro-2,4-dinitrobenzene with hydroxide, which gives
  `Oc1ccc([N+](=O)[O-])cc1[N+](=O)[O-]` (checked), with every arrow narrated.
  - Figure: the arrow panels from `guide_u4.py`'s `meisenheimer` walk.
- First step (fade line): "First step: draw the arrow from the nucleophile's lone pair to the
  carbon that holds the halogen."
- Practice (play order):
  - Meet: **NEW** u4-mech-meet (mcq L0: "which arrow comes first").
  - Recognise:
    - **NEW** u4-mech-count (mcq L1: "how many arrows in step 1"). The trainer's own step brief says
      four, so this is read from `seq-snar`, not from recall.
    - **NEW** u4-mech-why-relay (mcq L1, why).
  - Reason:
    - **NEW** u4-mech-restore (mcq L2: which pair re-forms the ring in step 2).
    - **NEW** u4-mech-bz-order (sort L2, confronting): order the four events for SNAr and for benzyne.
    - **NEW** u4-mech-which-slow (mcq L2: which step is slow, and why that explains F > I).
  - Produce: seq-snar (trainer L3), *moved*.
- Pool: 6 entries plus the trainer. Ending on the trainer means the lesson has no Challenge.
- Why items: u4-mech-why-relay pairs with the trainer's step 1.
- Say-why mix-ups:
  1. "The halide leaves first, then the nucleophile adds." Fix: that order belongs to benzyne. SNAr
     adds first, because the acceptor holds the charge while both groups are on the carbon.
  2. "The resonance forms are optional once the arrows are right." Fix: on this exam a resonance
     explanation needs the forms drawn (front matter, outline section 7).
- Picture: the 8e Mechanism row (the trainer).
- Video slot: n/a.

### u4-quiz-c: Stage C checkpoint
- Items (all **NEW**, L2 or L3):
  - u4-qc-pred-1 (mcq L2): 1-chloro-4-nitrobenzene with NaOH, then H3O+, giving 4-nitrophenol
    `Oc1ccc([N+](=O)[O-])cc1` (checked).
  - u4-qc-reagent (mcq L2).
  - u4-qc-sm (mcq L2).
  - u4-qc-eas-or-snar (mcq L2).
  - u4-qc-syn (synthesis L3): benzene to 4-nitrophenol. Cl2/FeCl3, then HNO3/H2SO4 (para), then
    NaOH with heat, then H3O+. To check in `u4_synthesis_gaps.py`.
  - u4-qc-why-order (mcq L2).
  - u4-qc-mech: ASK. A quiz is pool-only today, so a trainer step in a quiz needs the runner's
    support. The fallback is u4-qc-oxygen-form (mcq L2: pick the oxygen form).
  - u4-qc-space-bz (spaced).
  - u4-qc-space-meis (spaced).
- That is 9 items.

## Orgo I callbacks

| Stage | Lesson | Orgo I idea | Carry-over sentence | Primer id | Why item id |
|---|---|---|---|---|---|
| A | u4-snar | Substitution vs elimination; SN2 needs a backside | "SN2 needs the back of the C-X carbon, and here the ring sits there. SN1 needs a cation, and an aryl cation is too unstable. So the ring takes a third way: add first, leave second." Story differs: Orgo I substitution is one step (SN2) or leave-first (SN1); SNAr is add-first. | u0:substitution (NEW) | u4-snar-why-not-sn2 |
| A | u4-meisenheimer | Charge on the most electronegative atom (formal charge, resonance) | "The best form puts the minus on oxygen, for the same reason an alkoxide holds a charge better than a carbanion." | u0:resonance | u4-meis-why-o |
| A | u4-activation | EWG vs EDG, induction vs resonance (Unit 2 rubric) | "The rubric from phenol acidity, unchanged: a group helps by resonance only ortho or para, and meta gets induction only. 4-Nitrophenoxide and the Meisenheimer complex put their charge on the same nitro oxygen." Story differs: in EAS (Unit 3) the same NO2 slowed the ring; here it speeds it. | (u2:donor-withdrawer, taught in Unit 2) | u4-act-why-meta, u4-qa-space-u2-phenol |
| A | u4-lg-order | Rate-determining step; leaving-group ability (SN2) | "Only the slow step sets the rate. In SN2 that step breaks C-X, so I- wins; in SNAr it makes C-Nu, so F wins." | u0:rate-step (NEW), u0:leaving-group (NEW) | u4-lg-why-sn2 |
| B | u4-benzyne | E2 needs a strong base and an H next to the leaving group; pKa decides which base can do it | "It is an E2 with an aryl H: a strong base takes the H beside the C-X carbon as the halide leaves. Methoxide is too weak for an aryl C-H; amide is not." pKa values for NH3 and an aryl C-H are NOT derived and need a cited table before any number is shown. | u0:elimination (NEW) | u4-bz-why-base |
| B | u4-benzyne | Orbitals: pi bonds come from side-on p overlap | "Benzyne's extra bond is side-on overlap of two sp2 orbitals in the ring plane, so it is weak and reacts fast." | u0:orbitals | u4-bz-orbital (source needed) |
| C | u4-synthesis | Retrosynthesis, and functional group interconversion | "Work backwards: the last step is the swap, so the step before it must have put an acceptor o/p to the halogen." | u0:retrosynthesis (planned NEW in UNIT-3-PLAN) | u4-syn-why-order |
| C | u4-mechanism | Substitution vs elimination order of events | "Add then leave is SNAr; leave then add is benzyne. Orgo I asked which bond breaks first in SN1 and SN2; this is the same question." | u0:substitution | u4-mech-bz-order |

## Misconceptions

Cause ids in `code` exist in `packages/chem-core/src/causes.ts` today. Ids marked (new) must be
added (8d). Today no Unit 4 MCQ option carries a cause.

| Cause id | Wrong idea (student's words) | Why it tempts | Confronting item | Correction |
|---|---|---|---|---|
| `nucleophile_cannot_reach_backside` | "It is SN2 on the ring carbon." | SN2 is the substitution they know | u4-snar-why-not-sn2 | The ring blocks the back. Add-then-leave instead |
| eas_effect_carried_to_snar (new) | "Nitro slows the ring, so it slows SNAr too." | Unit 3 just drilled "NO2 deactivates" | u4-snar-vs-eas, u4-qa-space-u3-eas | A withdrawer slows a ring that gives electrons and speeds one that takes them |
| meisenheimer_called_aromatic (new) | "The complex is aromatic; it is still a benzene ring." | It looks like a six-membered ring | u4-meis-aromatic, u4-qa-why-not-aromatic | One carbon is sp3, so the loop is broken |
| meta_acceptor_counted (new) | "A nitro anywhere on the ring activates it." | "EWG present" is the slogan | u4-snar-meta-out, u4-act-dinitro-meta, u4-qa-meta-trap | The minus reaches only o/p, so a meta acceptor cannot take it |
| inductive_group_as_acceptor (new) | "CF3 is a strong withdrawer, so it activates SNAr." | CF3 ranks as a strong deactivator in EAS | u4-act-cf3, u4-route-cf3 | It cannot take the pair by resonance (flagged: needs a cited rate source) |
| sn2_leaving_group_order_in_snar (new) | "Iodide leaves best, so the iodo compound is fastest." | The SN2 order is drilled in Orgo I | u4-lg-why-sn2, u4-lg-slowest, u4-lg-ladder | The slow step is addition; C-X breaks after it |
| unactivated_halogen_swapped (new) | "F always leaves first." | Lesson A just taught F > Cl | u4-lg-bromo-fluoro | The acceptor test comes first. The order only breaks a tie |
| benzyne_ipso_only (new) | "NH2 lands where the halogen was." | SNAr just taught ipso swaps | u4-bz-pct, u4-iso-tiles, u4-reg-why-two-ends | Two ends, two products |
| benzyne_without_ortho_h (new) | "Any aryl halide plus NaNH2 makes benzyne." | The reagent is memorised, the H is not | u4-bz-no-h, u4-route-diethyl, u4-qb-no-h | No H next to the halogen means no elimination, so no aryne |
| `route_requires_conditions_not_present` | "Methoxide makes benzyne from chlorobenzene." | It is a strong base in Orgo I | u4-bz-vs-snar, u4-route-trap | Too weak to remove an aryl H, and no acceptor either |
| `synthesis_steps_out_of_order` (curriculum, as in Unit 3) | "Nitrate first, then chlorinate, then swap." | Order of naming | u4-syn-wrong-order, u4-qc-why-order | The o/p director goes first, or the swap has no acceptor |
| `step_out_of_order` | "The halide leaves first, then the nucleophile adds." | SN1 habit, and benzyne in the same unit | u4-mech-bz-order | Add-then-leave for SNAr; leave-then-add for benzyne |

## Spacing

| Item id | Tests (stage or earlier unit, concept) | Plays in (quiz / exam) |
|---|---|---|
| u4-qa-space-u2-phenol (NEW) | Unit 2, `ewg_edg_rubric` / `conjugate_base_stability_argument`. "4-Nitrophenol `Oc1ccc([N+](=O)[O-])cc1` is a stronger acid than 3-nitrophenol `Oc1cccc([N+](=O)[O-])c1`. Which picture explains both that and SNAr at para?" Stronger/weaker only. pKa values need a cited table (Unit 2's source), never typed from recall. Depends on u2-phenol being built (ASK). | u4-quiz-a |
| u4-qa-space-u3-eas (NEW) | Unit 3, `eas_directing_effects`. Nitrobenzene in EAS against 1-chloro-4-nitrobenzene in SNAr: same group, opposite effect, why | u4-quiz-a |
| u4-qb-space-activation (NEW) | Stage A, activation in a benzyne-stage setting: 1-chloro-2,4-dinitrobenzene with NaOH gives 2,4-dinitrophenol `Oc1ccc([N+](=O)[O-])cc1[N+](=O)[O-]` by SNAr, not benzyne (checked) | u4-quiz-b |
| u4-qb-space-lg (NEW) | Stage A, leaving-group order. 1-iodo-2,4-dinitrobenzene with NaOH gives the same phenol (checked), but slower than the fluoro compound (convention) | u4-quiz-b |
| u4-qc-space-bz (NEW) | Stage B, product sets inside a prediction: 1-bromo-4-tert-butylbenzene with NaNH2 (checked; this is u4-bz-draw-tbu's species, so ASK to swap in a fresh one) | u4-quiz-c |
| u4-qc-space-meis (NEW) | Stage A, the oxygen form, asked from the mechanism side | u4-quiz-c |
| u4-exam-space-u1-anion (NEW) | Unit 1, `u1:anion-ranking` / `carbanion_stability`: the Meisenheimer anion against an allylic anion, "why both are steadied the same way" | unit exam |
| u4-exam-space-u3-seq (NEW) | Unit 3, order of operations, in an SNAr route | unit exam |

## Difficulty

New items are counted, and retags are applied. Fail-back items are the L2 and L3 items that play in
quizzes and Challenge. Failing one sends the learner back one question.

| Lesson | L0 | L1 | L2 | L3 | Fail-back items |
|---|---|---|---|---|---|
| u4-snar | 2 | 4 | 1 | 1 | Challenge: u4-snar-vs-eas, u4-snar-draw-ome |
| u4-meisenheimer | 1 | 4 | 2 + trainer | 0 (draw is an ASK) | none (trainer step, so no Challenge) |
| u4-activation | 1 | 5 | 5 | 1 | u4-meis-dinitro, u4-snar-two-cl, u4-act-cf3, u4-act-dinitro-meta, u4-act-ladder, u4-act-draw-me |
| u4-lg-order | 1 | 4 | 3 (+ ladder if wired) | 1 | u4-lg-mixed, u4-lg-bromo-fluoro, u4-lg-why-sn2, u4-lg-draw |
| u4-quiz-a | 0 | 0 | 7 | 1 | all 8 |
| u4-benzyne | 1 | 3 | 2 | 1 | u4-bz-aryne, u4-bz-orbital, u4-bz-draw-tbu |
| u4-isotope (side) | 1 | 3 | 2 | 0 (ASK) | u4-iso-tiles, u4-iso-c2 |
| u4-bz-regio | 1 | 3 | 3 | 1 | u4-bz-mct-count, u4-reg-anisole, u4-reg-match, u4-reg-draw |
| u4-dow (side) | 1 | 4 | 2 | 0 (ASK) | u4-dow-single, u4-dow-mct |
| u4-route | 1 | 2 | 3 | 1 | u4-route-trap, u4-route-diethyl, u4-exam-match-route, u4-route-draw |
| u4-quiz-b | 0 | 0 | 7 | 1 | all 8 |
| u4-predict | 1 | 2 | 3 | 1 | u4-pred-reagent, u4-pred-sm, u4-pred-eas-or-snar, u4-pred-draw |
| u4-synthesis | 1 | 1 | 2 | 2 | u4-syn-wrong-order, u4-syn-sort, syn-u4-nitroanisole, syn-u4-anisidine |
| u4-mechanism | 1 | 2 | 3 | trainer | none (trainer step) |
| u4-quiz-c | 0 | 0 | 8 | 1 | all 9 |

## Checkpoints and test-outs
- Stage quizzes:
  - u4-quiz-a: 8 items, with spaced items u4-qa-space-u2-phenol and u4-qa-space-u3-eas.
  - u4-quiz-b: 8 items, with spaced items u4-qb-space-activation and u4-qb-space-lg.
  - u4-quiz-c: 9 items, with spaced items u4-qc-space-bz and u4-qc-space-meis.
  - Each quiz ends its section, so `unitSections` cuts sections at the quizzes instead of by length.
- Section chests: u4-s1-test 10, u4-s2-test 13 and u4-s3-test 15. These follow `sectionTestSize`
  over 3 sections: 10, 12.5 and 15, where `Math.round(12.5)` is 13.
- Unit exam sources: 20 items, `u4-unit-test`. The derived `EXAM_SOURCES` row for u4 becomes a
  named `U4_EXAM_IDS` list, as Unit 2 has, because side quests must feed it (8b.7).
  - Stage A: u4-snar-vs-eas, u4-meis-oxygen, u4-meis-ortho, u4-act-ladder, u4-act-dinitro-meta,
    u4-lg-bromo-fluoro, u4-lg-why-sn2.
  - Stage B: u4-bz-aryne, u4-bz-mct-count, u4-reg-match, u4-route-trap, u4-exam-match-route.
  - Stage C: u4-pred-sm, u4-pred-eas-or-snar, u4-syn-wrong-order, syn-u4-nitroanisole.
  - Side quests: u4-iso-c2, u4-dow-single.
  - Spacing: u4-exam-space-u1-anion, u4-exam-space-u3-seq.
  - That is 20, all L2 or L3.

## RDKit derivations

| Script | Derives | Stops the generator when |
|---|---|---|
| `scripts/u4_pools.py` (exists) | Rule 1 acceptor test; rule 2 SNAr site and product (`snar`, `snar_first`); rule 3 benzyne product sets (`benzyne_products`, `aryne`, `outcome`); rule 4 Meisenheimer forms (`meisenheimer`, `anion_forms`, `charge_sites`); rule 5 isotope split; names by OPSIN | An authored key disagrees, a name does not read back, a lesson pool falls outside 6 to 12, or more than 60% of MCQ keys share a slot |
| `scripts/u4_pools.py` (to extend) | Every worked example, new item, quiz item and spaced item above, plus the node moves (u4-activation, u4-bz-regio, u4-route, u4-predict, u4-synthesis, u4-mechanism) and single-level tags | Same, plus new checks: a worked example's species appears in its own lesson's pool; a lesson lacks an L2 or L3 item; an MCQ wrong option has no cause id |
| `scripts/u3_pools.py` (imported, not edited) | The EAS steps in Stage C: `eas_major` for chlorobenzene nitration (4- and 2-chloronitrobenzene), nitrobenzene chlorination (meta only), and bromination of 1-chloro-4-nitrobenzene (ortho to Cl) | As its own checks |
| `scripts/u4_synthesis_gaps.py` (NEW, modelled on `u3_synthesis_gaps.py`) | syn-u4-nitroanisole, syn-u4-anisidine, u4-qc-syn, through `route_gives` with STEP entries `snar_ome`, `snar_oh`, `snar_amine` plus the u3 ones | A route misses its target, a wrong chip reaches it, or a name does not read back |
| `scripts/guide_u4.py`, `scripts/section_decks.py` (exist) | Guide rows and section cards, rerun after the pools change. Tests byte-match. The guide's stages follow the three new stages | `--check` mismatch |
| Scratch check, 4 Nov: `C:\Users\zeusa\AppData\Local\Temp\claude\ea7e655515975cdc\1add9f70-e01b-4949-82d3-12251ebbebdb\scratchpad\units\u4check\check_plan.py` (not in the repo) | 66 claims above (63 in the script, plus 3 one-off checks the same day for Dow, the isotope split and the piperidine draw), checked against the generator's own model, all passing. The species it covers: every worked example, every new draw, every quiz and spaced species listed with "checked", and confirmation that no worked-example species appears in `u4_pools.py` | Two first-run failures were corrected, not bent. (1) The amine fragment must be written `[NH]CC`, as the pool writes `[NH]C`; `[N]CC` left a radical. (2) **The model's form count halves under symmetry.** For a para acceptor, `anion_forms` returns 3 unique forms (the two ortho carbanion forms are identical by canonical SMILES), not the 4 a student draws. No item may ask "how many forms" from `len(forms)`. Ask "where can the charge sit" (as u4-meis-sites does), or count forms by atom position. The same holds for `pcnb` (3 unique). |
| Not derivable by RDKit (flagged; needs a cited source or stays out) | The F > Cl > Br > I rates (a convention, Gasteiger proxy; the Cl-vs-Br step is the audit's doubt); real CF3 reactivity; benzyne product ratios (4-bromoanisole, mostly meta in the literature); the weak in-plane aryne bond; pKa of NH3, aryl C-H and the nitrophenols; o:p ratio in chlorobenzene nitration; nitroarenes with NaNH2 | Each is removed from the item, or cited before generation. Never asserted. |

## Open questions for the owner
- ASK: plan path. Is it `documentation/unit-plans/UNIT-4-PLAN.md` (this run) or
  `documentation/UNIT4-PLAN.md` (style guide 8h)?
- ASK: three stages (SNAr, benzyne, use it), or a two-stage option? The outline gives NAS no
  separate Act 1 weight. The two-stage option keeps Stage A and folds Stage C's three lessons into a
  smaller Stage B after benzyne. That would break 8a's "three to five stages", so it needs your
  ruling.
- ASK: promote `u4-benzyne` from side quest to spine. It is one of the outline's four skills for
  this topic, and Chad 18.6 gives it equal billing.
- ASK: move `u4-dow` from after u4-snar (your 20 Oct placement) to after u4-bz-regio? Three of its
  six items need benzyne mixtures, which u4-snar does not teach.
- ASK: split `u4-snar` into u4-snar and u4-activation, placing activation after the Meisenheimer
  lesson so "why o/p" is taught before it is asked?
- ASK: move `seq-snar` from the end of u4-lg-order to a new u4-mechanism lesson at the end of
  Stage C? This gives u4-lg-order a Challenge and puts the 10-point mechanism slot where the unit
  ends.
- ASK: wire `u4-lg-ladder`? It grades Cl above Br on a Gasteiger gap the audit doubts. The options
  are to keep it unwired, cite a rate table, or make it a three-rung ladder (F above the rest).
- ASK: multi-product draw. u4-bz-draw-tbu, u4-reg-draw and u4-qb-draw need a two-structure answer.
  Is that a set grader, two boxes, or "draw the cine product" only?
- ASK: an anion with an sp3 ring carbon in the draw editor (u4-meisenheimer's draw). Until then the
  trainer is the produce step.
- ASK: a trainer inside a stage quiz (u4-qc-mech), or the MCQ fallback?
- ASK: CF3. The rule says "not an acceptor", but the real compound is slow, not inert. Should the
  item cite a source and say "compared with NO2", or should CF3 be dropped?
- ASK: 4-bromoanisole with NaNH2. Keep sets only, or teach "mostly meta" (inductive) with a citation?
- ASK: the spaced phenol item depends on `u2-phenol`, which UNIT-2-PLAN proposes but nobody has
  built yet. Keep it, conditional on that lesson?
- ASK: add `nucleophilic_aromatic_substitution` to `resonance_delocalisation` and `carbanion_stability`
  in `reusedIn` (outline section 5), since the pools already tag both.
- ASK: four new `u0:` primers (substitution, leaving-group, elimination, rate-step). Unit 3's plan
  also proposed `u0:retrosynthesis`, which Unit 4 reuses. Write them once, in Unit 0's primer table?
- ASK: one qualitative energy diagram for u4-lg-order, with the first hump tallest. RDKit cannot
  derive barrier heights.
