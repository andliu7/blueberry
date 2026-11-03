# Unit 1 review: chemistry check and teaching suggestions (3 Nov 2026)

Read-and-report only. No source, content or test file was changed. Scope: all 220 pool entries
(`src/game/content/u1/stage-ab.ts`, `stage-cd.ts`, `stage-cd.active.ts`), the five Unit 1 MCQs in
`src/game/beats/mcq/content.ts` (u1-kvt, u1-nbs, u1-ied), `lessonExplainers.ts`, `lessonPath.ts`,
`primers.ts`, `priming.ts`, `lessonLinks.ts`, `lessonTrainers.ts`, `guide/u1Guide.ts`, the Unit 1
nodes in `demo/pathwayMap.ts`, and the generators `scripts/u1_pools_ab.py` and `u1_pools_cd.py`.

## (a) Verdict

The chemistry in Unit 1 is sound. I found no wrong answer key, no distractor that is actually
right, and no structure that disagrees with its name. I checked this with my own RDKit and
Hückel scripts, not by trusting the generators. The real problems are in the teaching. The
practice lessons (ranking, HX and X2 on dienes, predicting Diels-Alder products, 3-D products)
go straight into questions with no worked example. Several "why" explanations lean on ideas no
lesson teaches; the biggest is "largest HOMO coefficient" for Diels-Alder regiochemistry. The
unit also says two different things about how much resonance is worth (one rule for cations,
another for radicals) and never says why. A struggling student would come out able to apply the
rules (protonate an end carbon, cold gives 1,2, warm gives the better alkene, shape before
donors, cis stays cis), but often without the reason behind them. The fixes are mostly small:
one worked example per practice lesson, one "why" card in each place a rule appears with no
reason, and a "say why" step when mistakes are replayed.

**Tests.** I ran 15 Unit 1 vitest files (guideU1, u1Active, u1LessonPath, u1LessonReach,
u1Pools, u1PoolsAb, u1PoolsCd, u1Priming, u1PrimingPlay, unit1Pathway, pkaSheet, pkaSync,
sortFigures, guideSections, sectionStarts). All 15 files and all 216 tests pass. That includes
guideU1's "matches what scripts/guide_u1.py derives, byte for byte".

**What I verified with tools.**
- All 29 draw answers parse in RDKit. Each answer's InChI matches the one stored with it, and no
  "miss" is the same molecule as the answer.
- For all 26 named draw answers, I wrote the structure from the name myself and it matched the
  answer.
- Resonance positions, from RDKit's ResonanceMolSupplier: allyl C1/C3; pentadienyl C1/C3/C5;
  heptatrienyl C1/C3/C5/C7; benzyl CH2 plus both ortho carbons and the para carbon.
- NBS product counts, by enumerating both ends of every allylic radical. Cyclohexene,
  cyclopentene and 2-methylpropene give 1 product each. Hex-1-ene, but-1-ene, (E)-but-2-ene,
  2,3-dimethylbut-2-ene and methylenecyclohexane give 2 each. All counts match the keys.
- Meso and racemate: the cis diester from maleate is the same as its mirror image (meso). The
  trans diester from fumarate is chiral (racemate). cis-3,6-dimethylcyclohexene is meso. An
  embedded 3-D model puts both maleate esters on one ring face; the fumarate esters land on
  opposite faces in that model, which is the trans relation the key needs.
- Hückel MOs. HOMO and LUMO, and node counts of k minus one, for ethene, allyl, butadiene,
  hexatriene and octatetraene. Allyl ψ2 has zero coefficient on C2. Butadiene ψ2 has
  opposite-phase ends, while ψ1 and ψ3 have matching ends. The HOMO-LUMO gap shrinks with
  each added C=C (2.00, 1.24, 0.89, 0.69 β).
- Regiochemistry. With a simple OMe Hückel model, a 1-donor diene has its biggest HOMO
  coefficient on C4, and a 2-donor diene has it on C1. Propenal's biggest LUMO coefficient is
  on its CH2 end. Those give the ortho and para keys.

**Checked against sources.** UV: 217, 258 and 290 nm match the usual textbook values (OpenStax
and McMurry), and no other unit quotes different numbers. Exo:endo of about 55:45 at 190 °C
matches the literature (54 to 57% exo; Craig, Pincock, quoted in Green Chem. 2009,
https://pubs.rsc.org/en/content/articlehtml/2009/gc/b813485e). OpenStax 14.3 gives 71:29 (1,2)
at 0 °C and 15:85 at 40 °C for HBr and butadiene. The unit's cold and warm calls agree.

No Unit 1 item quotes a pKa or an NMR shift, so nothing there could disagree with the rest of
the repo. No item is a nomenclature-trivia question: names appear only as captions under drawn
structures.

## (b) Errors found

Severity: **High** means a wrong answer or a wrong chemical claim. **Medium** means a student is
misled or the unit contradicts itself. **Low** means wording, labels or docs. There are no High
errors. Pool files are generated, so each fix goes in the named script, then regenerate.

**M1. The first question of the unit gives its answer away by word matching.**
`stage-ab.ts:55` (u1-allylic-pick), from `scripts/u1_pools_ab.py:1014`. The prompt is "Pick the
allylic cation." The right option reads "The allyl cation", and its tile is captioned "allyl
cation". A student can match words and never look at a structure. This is the content audit's
point #11, still live. **Fix:** label the options A, B, C (drawn only) until the student answers,
or hide tile captions until after the answer (`McqBeatView.tsx:359-361`).

**M2. Regiochemistry is explained with an idea no lesson teaches.**
`stage-cd.ts:1847, 1852, 1882, 1921, 1926, 1955, 2965`; `stage-cd.active.ts:1705`; from
`scripts/u1_pools_cd.py:1766, 1837`. Every ortho/para "why" says "largest HOMO lobe (diene C4)
bonds to largest LUMO lobe". But u1-mo teaches only counting MOs, filling them and counting
nodes. Coefficient size is never taught, so the "why" is a new fact stated as if known. That
breaks the unit's own rule (`lessonLinks.ts`: assume only what an earlier lesson taught). The
chemistry is right; I checked it with Hückel. **Fix:** teach it the way Chad's Prep and Klein do.
Draw the resonance contributor of each partner: the donor puts a δ− on one end of the diene, and
the withdrawing group puts a δ+ on the CH2 end of the dienophile. Then join δ− to δ+. This
reuses Orgo I resonance and EDG/EWG. Keep "largest lobe" only as the orbital version, after the
resonance picture.

**M3. "Always a cyclohexene" contradicts the alkyne items.**
`lessonExplainers.ts:119` says "So the product is always a cyclohexene". Line 121 and
`lessonPath.ts:109` say the same, and so does the u1-cd-da-ring explanation at
`stage-cd.ts:1361`, which the walkthroughs and guide quote. But u1-cd-pred-dmad and
u1-cd-qd-draw-dmad correctly teach that an alkyne dienophile gives a cyclohexa-1,4-diene. A
student who learned "always" gets those wrong. **Fix:** "With an alkene dienophile the product is
a cyclohexene; an alkyne keeps one extra C=C." The quote tests will need the new wording in all
three places.

**M4. Ortho, meta and para are used before any context, against the owner's rule.**
u1-rad-benzyl at `stage-ab.ts:2456` (`u1_pools_ab.py:1747`) asks for "the CH2, both ortho and
para" of the benzyl radical. Students meet this in Unit 1, units before benzene and EAS. The
Diels-Alder "ortho (1,2)" and "para (1,4)" labels (u1-da-predict, quiz-d, exam, `priming.ts:597`,
`u1Guide.ts:419`) have the same problem. **Fix:** for benzyl, write "the two ring carbons next to
the CH2 and the one straight across". For Diels-Alder, lead with "1,2" and "1,4 on the ring".
Add one sentence that chemists call these ortho and para, nicknames borrowed from benzene that
the aromatic unit explains.

**L1. Wrong feedback category on the kinetic/thermo MCQs.**
`beats/mcq/content.ts:205, 229, 257, 268` (mcq-kvt-cold, -warm, -statement) tag
temperature-reasoning mistakes as `attacked_wrong_electrophilic_site`. The right cause exists:
`thermodynamic_product_under_kinetic_control` (`packages/chem-core/src/causes.ts:122`). Missed
questions are filed under the wrong idea in flashcards and stats. **Fix:** retag.

**L2. Map blurbs promise things the lessons contradict or do not teach.**
`demo/pathwayMap.ts`:
- 142, u1-12v14: "Kinetic 1,2 cold, thermodynamic 1,4 warm." The unit later teaches "Do not
  assume 1,4 always wins" (u1-qb-rule, u1-hx-mp4-warm).
- 143, u1-kvt: "Hammond postulate". No Unit 1 item or card teaches it.
- 132, u1-allylic: "the allyl cation, radical and anion". The lesson covers only the cation.

**Fix:** reword the three blurbs, or add the missing content (see suggestion 5 for Hammond).

**L3. Ambiguous "same split".**
`stage-cd.ts:2370` (u1-cd-3d-exo-heat) says "Same split as 1,2 against 1,4 in stage B." Next to
"about 55:45", this reads as the same ratio. Butadiene and HBr is 15:85. **Fix:** "Same idea as
1,2 against 1,4 in stage B."

**L4. The answer to the inverse-demand question depends on a condition the prompt leaves out.**
`beats/mcq/content.ts:1094` (mcq-ied-roles). The prompt says only "A withdrawing group sits on
the diene." The right answer ("the roles flip") also needs a donor on the dienophile, which is
said only in the brief. **Fix:** move that into the prompt: "A withdrawing group sits on the
diene and a donor on the dienophile."

**L5. The first lesson asks for diene protonation before it is taught.**
u1-allylic-plus-carbon (`stage-ab.ts:154`) and u1-allylic-draw-cation (`stage-ab.ts:193`) ask
what H+ on C1 of butadiene gives. Diene protonation is taught in u1-12v14. `lessonLinks.ts` says
u1-allylic assumes only u0:resonance and u0:carbocation, so the chain test cannot catch this.
**Fix:** add u0:hx-addition to u1-allylic's assumes (it has a primer), or move both items to
u1-12v14 and give u1-allylic an allyl cation drawn from propene instead.

**L6. Stale header comments.**
`stage-ab.ts:17-18` and `stage-cd.ts:18-19` say the visuals and option tiles "are not read yet".
They are (`beats/mcq/mcqFigures.ts:719, 864`). This is docs only, but it misleads the next agent.

## (c) Needs the owner's eye

1. **How much is resonance worth: one rule for cations, another for radicals.** The cation
   lesson teaches "Resonance is worth about one extra carbon of substitution, so 1° allylic
   sits near 2° alkyl and below 3°" (u1-cat-tbu-vs-allyl, `stage-ab.ts:1177`). The radical
   lesson teaches "resonance counts for more than one extra alkyl group": a 2° allylic radical
   and a benzylic radical both beat 3° (u1-rad-ring and u1-rad-benzyl-vs-3,
   `stage-ab.ts:2749, 2709`). Both claims are defensible. Bond strengths (allylic C-H about
   88 kcal/mol against tertiary about 96) support the radical one, and the "allyl about equal to
   2°" ladder is the OpenStax and McMurry cation ladder. The generator header already lists this
   as "a modelling choice the owner should check". But no card or question tells the student
   why the two differ. One sentence would do: alkyl groups help an empty orbital a lot and a
   half-filled one only a little, so for radicals resonance dominates. Please confirm which
   cation ladder your professor uses. Some textbooks (Wade) put allyl level with 3°.
2. **Carbanion order methyl > 1° > 2° > 3°.** This is the standard solution-phase textbook trend,
   and the unit uses it consistently. In the gas phase, bigger alkyl groups can stabilise an
   anion. Fine for CHEM 242 unless your professor teaches otherwise.
3. **Why 1,2 is the faster product.** The unit gives two reasons together: bromide is still next
   to C2, and C2 holds more of the charge (u1-12v14-why-fast, mcq-kvt-cold). OpenStax states that
   1,2 is faster without giving a reason. Klein leans on nearness. Check this matches your
   lecture.
4. **"Too close to call" answers** (u1-hx-too-close, u1-x2-chd-warm). These are honest, but
   students may ask "so which one is it?". Decide whether to keep "the rule cannot call it" as an
   exam-style answer, or to say only "the rule gives no winner" in the explanation.
5. **X2 drawn as an open allylic cation.** The unit models Br2 and Cl2 addition to dienes through
   "Br+ on C1, then an allylic cation". That is the usual Orgo II picture for dienes, but Orgo I
   taught the bromonium ion. A one-line callback ("with a diene the bromonium opens to an allylic
   cation, so both ends are reachable") would stop students thinking the two lessons disagree.
6. **u1-cd-phile-ether-role and u1-cd-phile-fastest** say methyl vinyl ether is a worse
   dienophile than ethene. That is right for normal demand, but rarely tested as a ranking; keep
   it if your exams ask it.

## (d) Suggestions

Ranked by how much each would help a student understand rather than recall. Benchmark notes:
Chad's Prep's Diels-Alder page was fetched (its text gives only the topic order: basics, then
dienes, dienophiles, stereo, regio, cyclic dienes and endo, then orbital symmetry; the worked
examples are images). Khan Academy's unit page returned only a script shell, so no Khan lesson
text was read. I could not find a confirmed Organic Chemistry Tutor YouTube video for these
topics, and organicchemistrytutor.com is the site you asked me not to use. Where a suggestion
names one of these teachers' styles, it comes from my general knowledge of how they teach, not
from a page fetched today.

**1. A worked example before the first question in every practice lesson.**
- Change: open each practice node with one fully worked problem, step by step, before any
  question. Narrate the decision at each step ("protonate C1 because...", "the C=C moves
  because..."). Then fade it: the next item gives the first step, the one after gives nothing.
- Where: u1-rank-cation, u1-rank-anion, u1-rank-radical, u1-energy-diagram, u1-hx-dienes,
  u1-x2, u1-nbs-practice, u1-da-predict, u1-da-3d. None of these has an explainer today. Most
  open on a drawing at item 3.
- Why it helps: a novice learns more from studying a solved example than from solving the same
  problem cold (the worked-example effect, already cited in `LEARNING-SCIENCE.md`). Today a
  struggling student meets the method only through feedback on a miss.
- Benchmark: Chad's Prep and the Organic Chemistry Tutor both solve one example on screen before
  asking anything.
- Effort: M. The "meet" step and the walkthroughs already hold the right quotes, and the
  explainer card format fits.

**2. Teach Diels-Alder regiochemistry with resonance first (fixes M2).**
- Change: add two cards and two questions to u1-da-predict. Card 1: draw the donor diene's
  contributor and find the δ− end. Card 2: draw the dienophile's contributor and find the δ+ CH2
  end. Questions: "mark the δ− carbon", then "join δ− to δ+ and draw the product". Then say "this
  is why 1-substituted gives 1,2 and 2-substituted gives 1,4". Use "biggest lobe" only as the
  orbital version.
- Where: u1-da-predict, u1-dienophiles (the EDG/EWG cards), `u1Guide.ts` around line 419.
- Why it helps: it turns a memorised "ortho/para rule" into a two-step reason built on Orgo I
  resonance and EDG/EWG, as your 29 Oct rule asks.
- Benchmark: Chad's Prep "Regioselectivity in Diels-Alder" (pairs D with W); Klein's
  partial-charge treatment.
- Effort: M.

**3. Replay mistakes as "say why".**
- Change: when a missed product question comes back in the recycle step, ask its reason first.
  Many pairs already exist: u1-hx-isoprene-site asks the site and u1-qb-first-cation asks the
  cation; u1-12v14-pick-14 is paired with u1-12v14-why-fast. Where no pair exists, have the
  student choose the "why" sentence of the right option from three.
- Where: the recycle slot (`beats/template.ts`, the recycle step) and Unit 1's pools.
- Why it helps: your standing rule. Retrieving the reason, not the answer, is what transfers to
  a new diene on the exam.
- Benchmark: Khan Academy-style "explain your answer" checks (not fetched); your own rule list.
- Effort: M.

**4. Name the two resonance rules side by side.**
- Change: one card and one question at the start of u1-rank-radical. "For cations, resonance is
  worth about one carbon. For radicals it is worth more. Why? A half-filled orbital gains little
  from alkyl donation." Then ask the student to pick the reason.
- Where: u1-rank-radical, u1-quiz-a, `u1Guide.ts:50` and line 94.
- Why it helps: today the two lessons quietly disagree, and a careful student will notice. See
  (c)1.
- Benchmark: Chad's Prep and Klein both tie radical stability to bond strengths (BDE).
- Effort: S.

**5. One Orgo I callback card per stage.**
- Change: a single "you already know this" card at the start of each stage.
  - A: hyperconjugation and induction, the same reason 3° beats 1° in SN1.
  - B: ΔG sets Keq and Ea sets rate, plus the Hammond postulate that the blurb promises: the
    more stable cation has the earlier, lower transition state. A u2-style energy diagram can
    show it.
  - C: the radical chain from Orgo I alkane halogenation.
  - D: EDG/EWG by resonance against induction (why OCH3 donates on a C=C even though O is
    electronegative).
- Where: the first lesson of each stage (u1-allylic, u1-12v14 or u1-kvt, u1-nbs, u1-mo).
- Why it helps: your 29 Oct rule that Orgo II keeps rebuilding Orgo I. It also fixes L2's
  Hammond gap.
- Benchmark: the Organic Chemistry Tutor's habit of re-deriving the Orgo I rule before applying
  it (from general knowledge).
- Effort: S to M.

**6. One energy diagram for the whole 1,2 against 1,4 story.**
- Change: build stage B around one drawn diagram for butadiene and HBr. Show the shared allylic
  cation, the two humps (1,2 lower) and the two wells (1,4 deeper), using the cold and warm
  ratios (OpenStax: 71:29 at 0 °C, 15:85 at 40 °C). Then let the student drag the temperature in
  EnergyLab and watch the ratio flip. Later, use the same picture for endo and exo
  (u1-cd-3d-exo-heat already links them).
- Where: u1-12v14, u1-kvt and u1-energy-diagram, which today are three separate lessons with
  generic "A/B" diagrams.
- Why it helps: students meet the abstract A/B diagram and the real reaction separately, and must
  join them alone. Seeing the real molecules on the diagram is the single picture that makes
  "kinetic or thermodynamic" click.
- Benchmark: Khan Academy's kinetic against thermodynamic treatment (not fetched); OpenStax 14.3,
  Figure 14.6.
- Effort: M.

**7. Remove give-aways and pure word matching (fixes M1).**
- Change: label option tiles A, B, C until the student answers, and only then show their names.
  Audit the other "Pick the X" items for the same match.
- Where: `McqBeatView.tsx:359-361`; u1-allylic-pick first.
- Why it helps: a question a student can answer by reading words teaches nothing and inflates
  their confidence.
- Benchmark: Khan Academy practice items do not caption the answer choices with their names.
- Effort: S.

**8. Put drawing items after the MCQs, with a starting structure.**
- Change: move each "draw" item to the end of its node, and give it the starting material on the
  canvas. Today 28 of the 29 draw items start blank (no `start`), and most sit at item 3.
- Where: every u1 node with a "d2" item early (rank-cation, rank-anion, rank-radical, quiz-a,
  energy-diagram, hx-dienes, nbs-practice, mo, da-predict, da-3d, quiz-c, quiz-d).
- Why it helps: producing a structure from nothing is the hardest step. It should come after
  recognition, not before. The content audit flagged the same jump (#5, #12).
- Benchmark: the Organic Chemistry Tutor's problem sets ramp from "identify" to "draw" (general
  knowledge).
- Effort: S, generator order only.

**9. Pictures where a picture beats text: curved arrows and 3-D for endo and exo.**
- Change: show the curved arrows on every resonance pair, including the u1-allylic-moves and
  u1-cat-major pairs, which show two contributors with no arrow between them. Add a rotatable 3-D
  model (the chem-vis/3Dmol pattern) for endo against exo and the norbornene faces.
- Where: stage A pair visuals; u1-cd-st-endo, u1-cd-3d-endo-where, u1-cd-3d-junction,
  u1-cd-3d-fumarate-cp. Their options are words like "Toward the C=C, away from the CH2".
- Why it helps: "endo points under the C=C bridge" is a spatial idea. Students who cannot
  picture it memorise the words and fail the wedge-dash version on the exam.
- Benchmark: Chad's Prep draws the endo transition state before the rule (topic order fetched;
  images not read).
- Effort: M for arrows, L for 3-D.

**10. Teach the inside/outside rule before it is needed.**
- Change: one card and two questions on diene substituents. Outside groups end up cis to each
  other; an inside and an outside group end up trans. Do this before u1-cd-3d-hexadiene, which
  today relies on a one-line brief.
- Where: u1-da-stereo, before u1-da-3d. This is also the rule your Diels-Alder builder request
  (STATUS 28 Oct) depends on.
- Why it helps: it is an exam staple and the one stereo rule the unit uses without teaching.
- Benchmark: Chad's Prep Diels-Alder stereoselectivity section (fetched topic list).
- Effort: M.

**11. Space stage A and C back into later practice.**
- Change: let quiz-b, quiz-d and the unit exam each carry one or two stage A items in a new
  setting. For example: "why does a donor raise the diene's HOMO? Pick the resonance form." Or
  "rank the cations these two protonations make". Stage C (NBS) and the radical node never
  appear in the exam today.
- Where: `beats/practice/pools.ts` EXAM_SOURCES; quiz-b and quiz-d pools.
- Why it helps: spaced retrieval across stages beats blocked practice for long-term memory, and
  it shows students that stage A is the reason behind everything after it.
- Benchmark: Khan Academy unit tests mix earlier lessons (not fetched).
- Effort: S.

**12. Retag stage C and D difficulty so the ramp is real.**
- Change: every stage C and D item is tagged levels 0/1/2 at once, so the pace system cannot
  order easy before hard. Give each item one honest level and order pools easiest first.
- Where: `stage-cd.ts`, `stage-cd.active.ts` (`levels`).
- Why it helps: a struggling student should meet "count the MOs" before "phase of the end lobes".
  Adaptive difficulty only works on real tags.
- Benchmark: the style guide's own rung 1 to rung 2 climb (`UNIT-STYLE-GUIDE.md` section 3).
- Effort: S.

## (e) What already works (keep it)

- **Derive, never assert, actually holds.** Every answer I rebuilt independently matched.
  Generators refuse to write when a key disagrees.
- **Distractors teach.** Almost every wrong option says why it is tempting and why it fails ("That
  is the cation answer", "Forming first does not make a product permanent").
- **"Do not assume 1,4 always wins"** (u1-hx-mp4-warm, u1-qb-rule, u1-hx-too-close). This is
  exactly the kind of misconception confrontation the benchmarks do, and better than most.
- **Shape before donors** (u1-cd-dienes-edg-locked) and **stereospecific before endo**
  (u1-cd-3d-fumarate-cp). These are good "which rule comes first" questions.
- **The read-along explainers** start with why the lesson matters and end with "Take this with
  you". Keep that shape for the new ones.
- **Priming previews and the lesson chain tests.** The pretest guess and the quote-locked
  walkthroughs stop drift between the pages.
- **The calm UI rules hold.** One question per screen, back one question on a miss in a run, and
  no calculator.
