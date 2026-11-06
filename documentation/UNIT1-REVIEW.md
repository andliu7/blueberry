# Unit 1 review: chemistry check and teaching suggestions (3 Nov 2026)

Written on 3 Nov as a read-and-report review. The owner's answers were applied on 3 and 4 Nov and are not committed yet. Each item below is marked done or not done at its heading. Scope: all 220 pool entries
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

**M1. The first question of the unit gives its answer away by word matching.** *Done (3 Nov): the options now describe where the + sits ("The + sits one bond from the C=C") and name no species. Tile captions read A, B, C until Check.*
`stage-ab.ts:55` (u1-allylic-pick), from `scripts/u1_pools_ab.py:1014`. The prompt is "Pick the
allylic cation." The right option reads "The allyl cation", and its tile is captioned "allyl
cation". A student can match words and never look at a structure. This is the content audit's
point #11, still live. **Fix:** label the options A, B, C (drawn only) until the student answers,
or hide tile captions until after the answer (`McqBeatView.tsx:359-361`).

**M2. Regiochemistry is explained with an idea no lesson teaches.** *Done (3 Nov): every regiochemistry why starts with the resonance picture: the donor's δ− end of the diene joins the δ+ CH2 of the dienophile. "Biggest lobe" appears only afterwards, as the orbital version. `u1_pools_cd.py` section 3 finds the δ− and δ+ ends with RDKit and stops if that pairing disagrees with Hückel.*
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

**M3. "Always a cyclohexene" contradicts the alkyne items.** *Done (3 Nov): "with an alkene dienophile ... an alkyne keeps one extra C=C" now appears in the explainer, the walkthrough, the priming, the guide and the section deck.*
`lessonExplainers.ts:119` says "So the product is always a cyclohexene". Line 121 and
`lessonPath.ts:109` say the same, and so does the u1-cd-da-ring explanation at
`stage-cd.ts:1361`, which the walkthroughs and guide quote. But u1-cd-pred-dmad and
u1-cd-qd-draw-dmad correctly teach that an alkyne dienophile gives a cyclohexa-1,4-diene. A
student who learned "always" gets those wrong. **Fix:** "With an alkene dienophile the product is
a cyclohexene; an alkyne keeps one extra C=C." The quote tests will need the new wording in all
three places.

**M4. Ortho, meta and para are used before any context, against the owner's rule.** *Done (3 Nov): benzyl now reads "the two ring carbons beside the one bonded to CH2, and the one straight across". Diels-Alder items start with "1,2 / 1,4 on the ring", plus one sentence saying chemists call these ortho and para. The u1-da-predict map blurb says the same. Second pass (3 Nov): the two "meta" miss labels (u1-cd-pred-draw-para, u1-cd-exam-draw-mvk) now read "1,3 on the ring (the meta product)", with the relation read off the drawn product.*
u1-rad-benzyl at `stage-ab.ts:2456` (`u1_pools_ab.py:1747`) asks for "the CH2, both ortho and
para" of the benzyl radical. Students meet this in Unit 1, units before benzene and EAS. The
Diels-Alder "ortho (1,2)" and "para (1,4)" labels (u1-da-predict, quiz-d, exam, `priming.ts:597`,
`u1Guide.ts:419`) have the same problem. **Fix:** for benzyl, write "the two ring carbons next to
the CH2 and the one straight across". For Diels-Alder, lead with "1,2" and "1,4 on the ring".
Add one sentence that chemists call these ortho and para, nicknames borrowed from benzene that
the aromatic unit explains.

**L1. Wrong feedback category on the kinetic/thermo MCQs.** *Done (3 Nov): these misses are now tagged `thermodynamic_product_under_kinetic_control`. The warm item's 1,2 distractor is tagged `kinetic_product_under_thermodynamic_control`.*
`beats/mcq/content.ts:205, 229, 257, 268` (mcq-kvt-cold, -warm, -statement) tag
temperature-reasoning mistakes as `attacked_wrong_electrophilic_site`. The right cause exists:
`thermodynamic_product_under_kinetic_control` (`packages/chem-core/src/causes.ts:122`). Missed
questions are filed under the wrong idea in flashcards and stats. **Fix:** retag.

**L2. Map blurbs promise things the lessons contradict or do not teach.** *Done (3 Nov): the u1-allylic and u1-12v14 blurbs are reworded. u1-kvt keeps "Hammond postulate" because its read-along now teaches it (suggestion 5).*
`demo/pathwayMap.ts`:
- 142, u1-12v14: "Kinetic 1,2 cold, thermodynamic 1,4 warm." The unit later teaches "Do not
  assume 1,4 always wins" (u1-qb-rule, u1-hx-mp4-warm).
- 143, u1-kvt: "Hammond postulate". No Unit 1 item or card teaches it.
- 132, u1-allylic: "the allyl cation, radical and anion". The lesson covers only the cation.

**Fix:** reword the three blurbs, or add the missing content (see suggestion 5 for Hammond).

**L3. Ambiguous "same split".** *Done (3 Nov): "Same idea as 1,2 against 1,4 in stage B."*
`stage-cd.ts:2370` (u1-cd-3d-exo-heat) says "Same split as 1,2 against 1,4 in stage B." Next to
"about 55:45", this reads as the same ratio. Butadiene and HBr is 15:85. **Fix:** "Same idea as
1,2 against 1,4 in stage B."

**L4. The answer to the inverse-demand question depends on a condition the prompt leaves out.** *Done (3 Nov): the prompt names both groups.*
`beats/mcq/content.ts:1094` (mcq-ied-roles). The prompt says only "A withdrawing group sits on
the diene." The right answer ("the roles flip") also needs a donor on the dienophile, which is
said only in the brief. **Fix:** move that into the prompt: "A withdrawing group sits on the
diene and a donor on the dienophile."

**L5. The first lesson asks for diene protonation before it is taught.** *Done (3 Nov): u1-allylic now assumes u0:hx-addition, so its primer is shown.*
u1-allylic-plus-carbon (`stage-ab.ts:154`) and u1-allylic-draw-cation (`stage-ab.ts:193`) ask
what H+ on C1 of butadiene gives. Diene protonation is taught in u1-12v14. `lessonLinks.ts` says
u1-allylic assumes only u0:resonance and u0:carbocation, so the chain test cannot catch this.
**Fix:** add u0:hx-addition to u1-allylic's assumes (it has a primer), or move both items to
u1-12v14 and give u1-allylic an allyl cation drawn from propene instead.

**L6. Stale header comments.** *Done (3 Nov): both headers.*
`stage-ab.ts:17-18` and `stage-cd.ts:18-19` say the visuals and option tiles "are not read yet".
They are (`beats/mcq/mcqFigures.ts:719, 864`). This is docs only, but it misleads the next agent.

## (c) Needs the owner's eye

1. **How much is resonance worth: one rule for cations, another for radicals.** *Owner, 3 Nov: the cation ladder stays. The side-by-side card and question are added (suggestion 4).* The cation
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
2. **Carbanion order methyl > 1° > 2° > 3°.** *Owner, 3 Nov: keep.* This is the standard solution-phase textbook trend,
   and the unit uses it consistently. In the gas phase, bigger alkyl groups can stabilise an
   anion. Fine for CHEM 242 unless your professor teaches otherwise.
3. **Why 1,2 is the faster product.** *Owner, 3 Nov: keep both reasons.* The unit gives two reasons together: bromide is still next
   to C2, and C2 holds more of the charge (u1-12v14-why-fast, mcq-kvt-cold). OpenStax states that
   1,2 is faster without giving a reason. Klein leans on nearness. Check this matches your
   lecture.
4. **"Too close to call" answers** *Done (3 Nov): both items now ask for the reason ("both C=C carry two carbons"). "No clear winner" appears only in the explanation. Fourth pass (4 Nov, checker): the say-why step for both no longer offers that sentence as its right reason either; it asks for the rule. Fifth pass: that rule now reads "Warm, the more stable product wins, and alkene substitution decides which one that is" (the dichloride, on u1-x2-chd-warm), since "carries more carbons" matched the retry's "carry two carbons" word for word. Since the seventh pass neither item is on the say-why allowlist, so neither gets a say-why step; both still ask for the reason in the question itself.* (u1-hx-too-close, u1-x2-chd-warm). These are honest, but
   students may ask "so which one is it?". Decide whether to keep "the rule cannot call it" as an
   exam-style answer, or to say only "the rule gives no winner" in the explanation.
5. **X2 drawn as an open allylic cation.** *Done (3 Nov): the callback line is in the u1-x2 worked example and in u1-x2-why-14's explanation.* The unit models Br2 and Cl2 addition to dienes through
   "Br+ on C1, then an allylic cation". That is the usual Orgo II picture for dienes, but Orgo I
   taught the bromonium ion. A one-line callback ("with a diene the bromonium opens to an allylic
   cation, so both ends are reachable") would stop students thinking the two lessons disagree.
6. **u1-cd-phile-ether-role and u1-cd-phile-fastest** *Owner, 3 Nov: keep.* say methyl vinyl ether is a worse
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

**1. A worked example before the first question in every practice lesson.** *Done (3 Nov): all nine nodes have a worked-example explainer, shown on the lesson preview. `content/u1/workedFade.ts` puts its first step on the first question only, and on no question after that. Challenge and the exam get no step. Third pass (after the checker): each worked example now solves a DIFFERENT problem of the same kind, on species no question in its lesson draws (cyclopentyl and cyclopent-2-enyl cations, the 2-methylallyl anion, cyclopent-2-enyl against tert-butyl radical, a K/T diagram of its own, 2-ethylbuta-1,3-diene with HBr and with Br2, pent-1-ene with NBS, 2-methoxybutadiene with methyl vinyl ketone, 2,3-dimethylbutadiene with dimethyl maleate). Every call is derived in the generators and every drawing is a worked-example figure, never a question's own; test/u1LessonPath.test.ts holds this. The u1-rank-cation example draws only the species it names. The first-step lines hold for whichever question comes first.*
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

**2. Teach Diels-Alder regiochemistry with resonance first (fixes M2).** *Done (3 Nov): the u1-da-predict worked example has the δ− and δ+ cards. Two new questions, u1-cd-pred-delta-minus and u1-cd-pred-delta-plus. u1-dienophiles has a new "Where the pull lands" card, and the guide line is rewritten. The existing u1-cd-pred-draw-para covers joining the ends and drawing the product.*
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

**3. Replay mistakes as "say why".** *Done (3 Nov), in `beats/sayWhy.ts`. When a missed question comes back (the lesson's recycle step, or a retry in an in-a-row run), the student first answers its reason, at level 0 so it cannot fail. Where a paired reason question exists, that is asked (today only the u1-x2 pairs, such as u1-x2-why-14). Otherwise, if the item is on the allowlist (`SAY_WHY_STEPS`, see the seventh pass), the student picks the question's own reason from three; an item not on the list gets no step, and since the third pass (after the checker) the two wrong options are COMMON MIX-UPS about the SAME lesson (`content/u1/sayWhyMixups.ts`), for example "The 1,4 product forms faster, because the halide attacks the far end" against an HBr question. All three options are about the missed question's own reaction, so matching the topic no longer finds the answer; only the reason does. Each mix-up is false as a general rule, uses only ideas its lesson or an earlier one teaches, and its feedback says "A common mix-up" and gives the correction. Stages A to C never see HOMO, LUMO, endo, exo, δ or a ring relation, no option names ortho, meta or para, no stereochemistry rule is called a Diels-Alder rule, and no option is template text. test/sayWhy.test.ts checks every step built from the real pools for all of this. The right reason's place moves between first, middle and last. Fourth pass (4 Nov, after the checker rejected the third): every mix-up now says which reaction it is about, so no H+ mix-up stands against a Br2 or Cl2 question and no halogen mix-up against an HBr or HCl one (mix-ups true of both say "the halide"); every mix-up names the rules it gets wrong, and one about a rule the question turns on (read from the reason and the prompt, `RULE_CUES`) is never offered, so "Cold, the products re-sort" no longer stands against a cold question; and the reason no longer names the product or the count the retry asks for (u1-cd-qc-butene1-shifted, -mch-count and -hexene-count, `SAY_WHY_AUTHORED`). Fifth pass (4 Nov, after the checker found the fourth pass still gave answers away on about 60 items): the old check matched only the whole right option, so "C4", "A", "ψ3", "Br2" and paraphrases got through, and the right option's feedback was the full explanation, which reaches the answer ("no clear winner" on u1-hx-too-close). Now (a) the right option's feedback is the reason alone; (b) `givesAway` compares the words that tell the options apart and rejects a reason that shares more of them with the right option than with any wrong one, or states a count before a "how many" question; mix-ups and their corrections are held to the same check on labels, carbons, orbitals and reagents; (c) a hand-checked list (`SAY_WHY_SKIP`) catches the paraphrases word matching cannot see; (d) about 25 items have a new authored reason that states the rule without the answer (u1-cat-tbu-vs-allyl, the MO items, u1-cd-st-cis, u1-hx-too-close and u1-x2-chd-warm, which now say "alkene substitution decides" instead of "carries more carbons"). Questions that ask for the reason, rule or definition itself (u1-12v14-why-fast, u1-x2-why-14, u1-kvt-define-kinetic, the role questions) and those whose one true reason is the answer (u1-12v14-which-carbon, u1-cd-qc-br-source, racemate and meso items) get no rule step and replay as before: 165 of 229 items get a say-why step (157 rule steps, 8 paired), down from 220. Also in the fifth pass: on an HX or X2 item the wrong options are mix-ups about the addition itself, never a diagram-reading slip (Hammond, "a valley is a transition state"), which had stood against u1-hx-isoprene-site and u1-hx-pentadiene-site; "Once formed, the two products can never turn into each other" now carries the temperature and stability rules, so it no longer stands against a warm item (u1-qb-isoprene-cl2, u1-x2-isoprene-warm, u1-ed-switch); and a prompt in degrees ("40 degrees", "minus 80 degrees") now reads as a temperature question. test/sayWhy.test.ts runs every Unit 1 item through the builder for all of this, and pins each item the checker named. Sixth pass (4 Nov, after the checker ran the builder over all 229 items itself): (a) a negation in other words got through, because the same-rule check used the builder's own cues ("For radicals substitution beats resonance" stood against "resonance counts for more than substitution" on u1-rad-benzyl-vs-3, and "resonance beats substitution" against "resonance decides" on u1-cat-allyl-vs-2 and u1-qb-space-cations). Every rule step's reason now carries hand tags for the rules it states (`SAY_WHY_REASON_RULES`, one line per item, never read off the words), and no mix-up on one of those rules is offered; the test adds a two-idea check in its own vocabulary on top. (b) Paraphrases of the answer got through, and draw, sort and match steps were never checked. `givesAway` now folds phrases with one meaning together first ("the lower hump" and "kinetic" with "the faster one", "deeper well" with "more stable", "donate" with "push", "a single face" with "the same face", "bonded to a C=C carbon" with "next to the double bond"); every reason, on every kind of item, is held to a list of outcomes it may never state (a product type, "end up cis", "bridged", "(para)", an order such as "3° > 2°", "not equal", "warm ... 1,4"); and about 30 items have a new authored reason (the draw steps that said "end up cis", "gives the 1,4 dibromide" or "a cyclohexa-1,4-diene", the cold items that said "gives the 1,2 product", u1-12v14-more-subst, u1-qa-heptatrienyl, u1-cd-nbsp-hexene-site, u1-cd-3d-junction). Items whose every true reason is the answer joined `SAY_WHY_SKIP`: the five contributor items, u1-ani-why-alkyl, u1-qb-rule, the four diagram items whose options say "the faster one" or "the more stable one", u1-ed-goes-back, u1-x2-chd-14, u1-cd-mo-allyl-node and the norbornene draw, plus five one-factor ladders and draws where the only mix-up that could lead to a wrong answer is the reason's own negation. (c) A paired step's feedback described the retry's answer ("Bromide there puts ... Br on C4 ...: the 1,4 product"); it now confirms the reason and stops. (d) u1-qb-first-cation's wrong options are both HBr slips about another part of the mechanism, not "Two products ... always form at the same rate". 145 of 229 items got a say-why step (137 rule steps, 33 of them draw, sort or match: 23 draw, 8 sort, 2 match; and 8 paired). Seventh pass (4 Nov, after the checker rejected the sixth): the wrong options were still picked automatically, by rule tags and word cues over each lesson's list, and that kept producing bad ones: mix-ups that were the right reason negated or whose correction restated it (the cation, anion and radical ladders, u1-qa-best-anion, u1-rad-benzyl-vs-3, u1-rad-ring), mix-ups a student could reject by topic alone (the maleate, fumarate and inside/outside items, the quiz D regiochemistry items, u1-cat-pentadienyl, u1-qa-heptatrienyl, u1-cat-vinyl), and on u1-cd-nbsp-tetramethyl-count a reason that ruled out both wrong answers by itself. Say-why is now OPT-IN: `SAY_WHY_STEPS` in `content/u1/sayWhyMixups.ts` lists each item that gets a rule step and its two wrong reasons by id, and nothing else is offered. A wrong reason is listed only if a student who believed it would pick a wrong answer on that very question (the eighth pass found this claim was not met; see below), it is about the species and reaction on screen, it is not the right reason negated or restated and neither is its correction, and the right reason does not rule out the wrong answers by itself. An item with fewer than two such mix-ups gets no step. The four paired steps whose answer is a label (u1-12v14-pick-14, u1-hx-label-kinetic, u1-hx-draw-isoprene-cold, u1-qb-isoprene-warm, whose wrong-option feedback read "The reason is: C4") were unpaired. test/sayWhy.test.ts fails if any step offers a mix-up outside its entry, and still runs every Unit 1 item through the builder. 41 of 229 items now get a say-why step (37 rule steps: 25 MCQ, 11 draw, 1 sort; and 4 paired). Coverage shrank on purpose; the owner's rule is that quality cannot. Eighth pass (5 Nov, after the checker rejected the seventh): the seventh pass said every route had been rebuilt with RDKit, and it had not. On u1-x2-dmb-cold the mix-up "the first halogen atom adds to an inner carbon" led to the right answer, since with Br2 both added atoms are Br; and the comment above the regiochemistry entries said one mix-up gave a 1,2 product from a 2-substituted diene, which RDKit shows cannot form (both mix-ups give 1,3). The check now exists as a script, `scripts/u1_saywhy_routes.py`: it builds every HX and X2 route as a molecule and matches it to its option's name with OPSIN, and builds each Diels-Alder route both ways round and reads the ring relation off the product; it exits non-zero if a route misses. Seven steps left the allowlist because no honest pair of wrong reasons remains: u1-cat-allyl-vs-2, u1-cat-3allyl-vs-3 and u1-rad-benzyl-vs-3 (the right reason says resonance decides, which rules out "they tie" and the alkyl option by its words, and the C=C-counts-as-a-neighbour correction restated it), u1-cd-da-ring and u1-cd-phile-fastest (the right reason ruled out an option by its words, and the corrections mirrored it), and u1-12v14-draw-14 and u1-hx-hexadiene-cold (the halide-on-the-middle-carbon mix-up leads to no structure a student could draw, and on the hexadiene the two products' alkenes are equally substituted, so no other mix-up leads to a definite wrong one). The radical p-orbital mix-up is gone from the unit. u1-hx-dmb-cold and u1-x2-dmb-cold keep a step with a new second mix-up, "The more stable product is always the quicker one to form", whose believer draws the 1,4 product with the tetrasubstituted C=C. The (E)-penta-1,3-diene mix-up now numbers the diene as its name does (methyl on C4). u1-cd-pred-ortho-ome and u1-cd-pred-ortho-acrolein are unpaired, since their paired questions ask for a carbon ("The reason is: C4, the far end of the diene"); the test now requires a paired question to ask for a reason. 32 of 229 items now get a say-why step (30 rule steps: 20 MCQ, 9 draw, 1 sort; and 2 paired). Ninth pass (5 Nov, after the checker rejected the eighth): "H+ goes on the end that leaves the less substituted cation" led a believer to no option on u1-hx-label-thermo and u1-qb-mp2-warm, so both now offer "the thermodynamic product forms faster" and "a halogen on a 3° carbon makes the product more stable" instead, and RDKit confirms both lead to the 1,2 product with the halogen on the 3° carbon. u1-cd-pred-retro-cn left the list (its diene mix-up did not rule out the right pair). The correction "a group on C2 pushes density onto C1" now says "a donor", since a withdrawing group does the opposite; the halogen-position correction no longer claims branching never steadies a neutral product. On the HX and X2 steps the right reason no longer begins "Warm" or "Cold", which matched the prompt's temperature; and the long right reasons were cut (the 2-methylpropene NBS reason from 109 to 66 characters, the stereospecific and δ− reasons by about 25), so the right reason is no longer usually the longest option. 31 of 229 items now get a say-why step (29 rule steps and 2 paired).*
- Change: when a missed product question comes back in the recycle step, ask its reason first.
  Many pairs already exist: u1-hx-isoprene-site asks the site and u1-qb-first-cation asks the
  cation; u1-12v14-pick-14 is paired with u1-12v14-why-fast. Where no pair exists, have the
  student choose the "why" sentence of the right option from three.
- Where: the recycle slot (`beats/template.ts`, the recycle step) and Unit 1's pools.
- Why it helps: your standing rule. Retrieving the reason, not the answer, is what transfers to
  a new diene on the exam.
- Benchmark: Khan Academy-style "explain your answer" checks (not fetched); your own rule list.
- Effort: M.

**4. Name the two resonance rules side by side.** *Done (3 and 4 Nov). In u1-rank-radical: one card in its worked example, the question u1-rad-vs-cation (its prompt names the degrees, derived in the generator), and the radical line in the guide. In u1-quiz-a, both halves: u1-qa-why-alkyl-counts for the cation side (no give-away: the prompt states what the drawing shows and the right option does not repeat it) and the radical side is u1-rad-allylic-vs-tbu (but-3-en-2-yl against tert-butyl: tied as cations on the takeaway scale, the allylic one ahead as radicals, both derived). It sat in u1-quiz-a for a day as u1-qa-rad-vs-cation; the checker sent it back (4 Nov) because the owner's 24 Oct rule keeps a side quest optional, so it now lives in u1-rank-radical and reaches u1-quiz-a through its Challenge, or as a lent problem when the student's syllabus covers radicals. Its prompt no longer says the cations "only" tie, and u1-quiz-a calls the C4 allylic cation but-3-en-2-yl throughout, the name of the structure drawn. Since 4 Nov (seventh pass) the whole unit uses that one name: u1-cat-allyl-vs-2, the allylic ladder and the C4 ladder (which also now draws the contributor its name describes) no longer say crotyl or but-2-enyl. RDKit confirms all three names were one ion. In the guide: a cation-side line in u1-rank-cation quoting u1-cat-hyperconj.*
- Change: one card and one question at the start of u1-rank-radical. "For cations, resonance is
  worth about one carbon. For radicals it is worth more. Why? A half-filled orbital gains little
  from alkyl donation." Then ask the student to pick the reason.
- Where: u1-rank-radical, u1-quiz-a, `u1Guide.ts:50` and line 94.
- Why it helps: today the two lessons quietly disagree, and a careful student will notice. See
  (c)1.
- Benchmark: Chad's Prep and Klein both tie radical stability to bond strengths (BDE).
- Effort: S.

**5. One Orgo I callback card per stage.** *Done (3 Nov): a "You already know this" card in each stage. u1-allylic: hyperconjugation and induction. u1-kvt: ΔG, Ea and Hammond, with a new u0:equilibrium primer. u1-nbs: the radical chain. u1-mo: OCH3 donates by resonance.*
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

**6. One energy diagram for the whole 1,2 against 1,4 story.** *Done (3 Nov): the energy scenario `butadiene-hbr` shows one cation, two humps and two wells. It appears on u1-12v14, u1-kvt and the u1-energy-diagram worked example. EnergyLab opens on its Cold or warm tab, with the OpenStax ratios. The heights only sketch the shape; they are not measured. u1-da-3d ties endo and exo back to this diagram.*
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

**7. Remove give-aways and pure word matching (fixes M1).** *Done (3 Nov): tile captions already read A, B, C until Check, and u1-allylic-pick is reworded. A script checked every Unit 1 MCQ for a prompt word that only the right option repeats and found no other give-aways.*
- Change: label option tiles A, B, C until the student answers, and only then show their names.
  Audit the other "Pick the X" items for the same match.
- Where: `McqBeatView.tsx:359-361`; u1-allylic-pick first.
- Why it helps: a question a student can answer by reading words teaches nothing and inflates
  their confidence.
- Benchmark: Khan Academy practice items do not caption the answer choices with their names.
- Effort: S.

**8. Put drawing items after the MCQs, with a starting structure.** *Done (3 Nov): all 29 drawings open on their starting material. In every practice pool, the drawings now play last (u1-x2 added to the practice pools). The generators refuse a start that would already grade as the answer.*
- Change: move each "draw" item to the end of its node, and give it the starting material on the
  canvas. Today 28 of the 29 draw items start blank (no `start`), and most sit at item 3.
- Where: every u1 node with a "d2" item early (rank-cation, rank-anion, rank-radical, quiz-a,
  energy-diagram, hx-dienes, nbs-practice, mo, da-predict, da-3d, quiz-c, quiz-d).
- Why it helps: producing a structure from nothing is the hardest step. It should come after
  recognition, not before. The content audit flagged the same jump (#5, #12).
- Benchmark: the Organic Chemistry Tutor's problem sets ramp from "identify" to "draw" (general
  knowledge).
- Effort: S, generator order only.

**9. Pictures where a picture beats text: curved arrows and 3-D for endo and exo.** *Done (3 Nov): every stage A/B resonance pair has curved arrows, worked out from RDKit bond orders (half-headed for radicals). The endo, exo and fumarate norbornene adducts have models the student can turn by hand, built with RDKit ETKDG + MMFF and drawn as plain SVG (no 3-D library). They appear on the u1-da-stereo and u1-da-3d cards, and in a fold that opens after the answer on the four endo/exo questions.*
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

**10. Teach the inside/outside rule before it is needed.** *Done (3 Nov): an "Inside and outside" card in u1-da-stereo and two questions, u1-cd-st-inside-outside and -product. `u1_pools_cd.py` section 5 derives the rule from s-cis 3-D geometry for the EE, EZ and ZZ hexadienes.*
- Change: one card and two questions on diene substituents. Outside groups end up cis to each
  other; an inside and an outside group end up trans. Do this before u1-cd-3d-hexadiene, which
  today relies on a one-line brief.
- Where: u1-da-stereo, before u1-da-3d. This is also the rule your Diels-Alder builder request
  (STATUS 28 Oct) depends on.
- Why it helps: it is an exam staple and the one stereo rule the unit uses without teaching.
- Benchmark: Chad's Prep Diels-Alder stereoselectivity section (fetched topic list).
- Effort: M.

**11. Space stage A and C back into later practice.** *Done (3 and 4 Nov). Stage A: u1-qb-space-cations in quiz-b and u1-cd-qd-space-donor in quiz-d, and the exam draws from both quizzes. Stage C and radicals stay optional (owner 24 Oct; the 4 Nov pass that put them in every student's exam was sent back by the checker): when the student's syllabus covers u1-quiz-c, it lends the unit exam the three stage C problems picked for it (`beats/practice/pools.ts` U1_EXAM_C_IDS: u1-cd-qc-why-weak, u1-cd-qc-butene1-shifted, u1-cd-qc-mch-count), and a covered radical node lends its first graded problems, through the existing side-quest mechanism. With nothing covered the exam asks neither. test/u1Pools.test.ts and test/syllabusQuizzes.test.ts hold this.*
- Change: let quiz-b, quiz-d and the unit exam each carry one or two stage A items in a new
  setting. For example: "why does a donor raise the diene's HOMO? Pick the resonance form." Or
  "rank the cations these two protonations make". Stage C (NBS) and the radical node never
  appear in the exam today.
- Where: `beats/practice/pools.ts` EXAM_SOURCES; quiz-b and quiz-d pools.
- Why it helps: spaced retrieval across stages beats blocked practice for long-term memory, and
  it shows students that stage A is the reason behind everything after it.
- Benchmark: Khan Academy unit tests mix earlier lessons (not fetched).
- Effort: S.

**12. Retag stage C and D difficulty so the ramp is real.** *Done (3 Nov): each stage C and D item has one level instead of 0/1/2 at once. Quiz and exam items are 2. In the lessons an item is 1 when it applies one taught rule and 2 when it combines rules, works backward or turns on a subtle point, and every drawing is 2; so lesson pools such as u1-da-predict, u1-da-3d, u1-mo and u1-nbs-practice hold both. Pools play easiest first.*
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
