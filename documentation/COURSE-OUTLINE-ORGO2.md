# Organic Chemistry II course outline

## Owner rulings since synthesis, recorded 2026-08-21

- **Recency weighting.** The most recent materials, 2024 through 2026, weigh slightly heavier than
  older ones when semesters disagree. The 2019 exams are corroboration, never a tiebreaker. This
  formalises what the mining already leaned toward.
- **Question style inspiration is sanctioned.** Authors take inspiration from the FORMS and
  STRUCTURE of the real exam and worksheet questions, the slot shapes, the three direction
  prediction block, the carbon count constrained synthesis, the underlined proton pKa opener,
  while never copying a specific question. The form census in this document is the palette.
- **Exams are not exhaustive.** Coverage exceeds the exam; weighting, not exclusion, honours the
  exam signal.


The authoritative course structure for `orgo_2`. Everything in `packages/curriculum/src/placement.ts`
under the `orgo_2` course, and everything a later wave authors as Orgo 2 content, traces to this file.

Where this file and `CLAUDE.md` disagree, `CLAUDE.md` wins and the conflict gets reported. Section 9
lists the conflicts found while writing this.

## 0. Provenance

Derived from the owner's own Organic Chemistry II course materials for **structure only**: three
semesters of exams with keys, eleven lecture decks, two handwritten note files, twenty three topic
worksheets with keys, and an owner generated, PhD reviewed reagent reference covering fifteen topics.

Three rules held while writing this:

- **Structure, not content.** No problem, prompt, substrate, or answer from those materials is
  reproduced here or anywhere in the repository. What is recorded is teaching order, prerequisite
  structure, assessment weighting, question form, and reagent vocabulary. All shipped content is
  authored fresh.
- **The materials stay uncommitted.** `reference images/` is gitignored and stays that way. This file
  is the committed artifact; the source is not.
- **One course is not the curriculum.** The lecture and exam record is one instructor at one
  institution across three semesters. The reagent reference is the deliberately over inclusive,
  institution neutral spine, and it is used as the top level partition for exactly that reason. Where
  the delivered course is narrower, that is recorded as a weighting signal, not as a scope cut.

Confidence is marked inline. `[measured]` means it was counted in the source. `[inferred]` means it
was reasoned from evidence that is stated with it. `[set aside]` means it was found and deliberately
not used, with the reason in section 9.

---

## 1. The spine: fifteen topics, reconciled with the delivered order

The reagent reference's fifteen topic partition is the top level spine. The delivered lecture order
is a different sequence over most of the same material. Both are real, and they disagree in eleven
places. Each disagreement below names the reconciliation actually adopted.

Reference partition, in its own order:

| # | Reference topic | Universal | Where it lands here |
|---|---|---|---|
| 1 | Conjugation, Resonance and Dienes | flagged "often end of Orgo I" | Act 1, mid |
| 2 | Aromaticity and Benzene | yes | Act 1, late |
| 3 | Electrophilic Aromatic Substitution | yes, "core of Orgo II" | Act 1, late |
| 4 | Nucleophilic Aromatic Substitution and Benzyne | depth varies | Act 1, late |
| 5 | Alcohols, Diols, Ethers and Epoxides | reaction chemistry lands in II | Act 1, **first** |
| 6 | Spectroscopy and Structure Determination | placement "varies widely" | **Act 0, lesson 1** |
| 7 | Aldehydes and Ketones, Nucleophilic Addition | yes | Act 2 |
| 8 | Carboxylic Acids and Derivatives | yes | Act 2 |
| 9 | Enols and Enolates | yes, "typically the hardest block" | Act 3 |
| 10 | Amines | yes | Act 3, split (see D7) |
| 11 | Phenols | sometimes folded in | Act 1, split (see D3) |
| 12 | Pericyclic Reactions | **not universal** | Deferred except Diels-Alder |
| 13 | Carbohydrates | **not universal** | Deferred, capability gap |
| 14 | Amino Acids and Peptides | **not universal** | Deferred |
| 15 | Lipids and Optional Capstones | **not universal** | Deferred |

### Where the partition and the delivered order disagree

**D1. Spectroscopy is topic 6 in the reference and lesson 1 in delivery.** `[measured]` Roughly 37 of
46 slides of the first lecture are IR, degrees of unsaturation, and NMR structure elucidation, and
structure determination is a 10 point slot on 6 of 6 exams examined. The reference itself flags the
placement as varying widely.
**Reconciled:** spectroscopy and structure determination are **Act 0**, the pathway's first
teachable content, not a topic 6 in sequence. This has a schedule consequence, recorded as correction
C2 in section 9.

**D2. Alcohols, ethers and epoxides are topic 5 in the reference and lecture 2 in delivery.**
`[measured]` The alcohol block opens the chemistry of the course and the ether/epoxide block follows
immediately, both before any pi system material.
**Reconciled:** the `alcohol_leaving_groups` / `ethers` / `epoxides` chain opens Act 1. This matters
because it is where the leaving group, nucleophile, and anti addition vocabulary that Acts 2 and 3
assume actually gets built.

**D3. Phenols are a standalone topic 11 in the reference and are delivered split.** `[measured]`
Phenol acidity is taught in the benzene lecture, before aromaticity and before EAS, and its
substituent rubric is then reused wholesale for EAS directing effects. The reference's own
Kolbe-Schmitt, Reimer-Tiemann and quinone chemistry is marked optional and appears in no lecture.
**Reconciled:** one topic `phenols`, placed in Act 1 **before** `aromaticity` rather than after EAS,
because its job in this course is to be the EWG/EDG teaching site. The optional reactions stay listed
but carry no exam weight.

**D4. Dienes are topic 1 in the reference and arrive fifth in delivery.** The reference flags topic 1
as often closing Orgo I. Delivered, dienes arrive after alcohols and ethers and immediately before
conjugation.
**Reconciled:** dienes sit mid Act 1, after the alcohol chain, with `conjugation_and_mo` as a peer
rather than a follow on. `diene_addition` needs allylic delocalisation and `conjugation_and_mo` needs
nothing from dienes, so the edge runs one way only.

**D5. Allylic halogenation (NBS) is a line item inside reference topic 1 and is delivered as its own
day.** `[inferred, medium-high]` NBS appears on both versions of the instructor's exam topic list and
in no lecture deck present. Its slot is forced: the only unaccounted teaching day sits between the
ether/epoxide block and dienes, and dienes open straight into allylic cation chemistry with no
introduction, which implies the delocalised allylic radical and cation were already taught.
**Reconciled:** `allylic_halogenation` is its own topic and a prerequisite of `diene_addition`. If
the inference is wrong the edge is still harmless, because allylic delocalisation is genuinely
prerequisite either way.

**D6. Nucleophilic aromatic substitution is reference topic 4 and is examined without being
lectured.** `[measured]` No lecture deck covers SNAr or benzyne. SNAr appears as a graded part of Act
1's prediction block and as a full question on one semester's Act 2 exam.
**Reconciled:** `nucleophilic_aromatic_substitution` stays a topic in Act 1 and is explicitly marked
as re-tested in Act 2. This is a real gap in the delivered course, not in the subject, and content
authored against it should assume the student has not been lectured on it.

**D7. Amines are one reference topic and are delivered as two different things two acts apart.**
`[measured]` Amines acting as nucleophiles on a carbonyl, giving imines and enamines, is Act 2
material. Amine basicity, amine synthesis routes, Hofmann chemistry and diazonium chemistry is Act 3
material, worth roughly 16 points on Act 3's exam.
**Reconciled:** split into `nucleophilic_addition_nitrogen` (Act 2) and `amines` plus
`diazonium_chemistry` (Act 3). `amines` does not depend on `nucleophilic_addition_nitrogen`; both
depend on the shared amine classification skill, which lives in `nucleophilic_addition_nitrogen`
because that is where it is first needed. `diazonium_chemistry` depends on `eas_directing_effects`,
which is the edge that closes Act 3 back onto Act 1.

**D8. Carboxylic acid derivatives follow aldehydes and ketones in the reference and are a peer in
delivery.** `[measured]` Act 2's exam splits almost evenly between nucleophilic addition, roughly 34
points, and nucleophilic acyl substitution, roughly 33 points, and the reaction web interconverting
the derivative family is Act 2's organizing artifact.
**Reconciled:** `nucleophilic_acyl_substitution` is a peer of the three addition topics under the
`carbonyl_chemistry` gateway, not a child of them. Both depend on the gateway; neither depends on the
other.

**D9. Nomenclature is folded into other reference topics and is delivered as its own gate.**
`[measured]` The delivered course spends a full slide block on the suffix priority table and the
prefix table immediately before any carbonyl reaction, and name to structure is a 6 point exam slot
present on Act 2's exam in every semester.
**Reconciled:** `iupac_nomenclature` is a topic and a hard prerequisite of `carbonyl_chemistry`. It is
delivered in two installments, aryl naming in Act 1 and carbonyl naming at the Act 1 to Act 2 seam,
and is modelled as one node because it is assessed as one slot.

**D10. Pericyclic chemistry is reference topic 12 and is deferred by the reference itself, except
Diels-Alder, which delivery elevates to a full lecture.** `[measured]` Diels-Alder gets a whole
lecture with two dedicated practice slides and four edge case slides, taught orbital symmetry first
with an explicit four item requirements checklist.
**Reconciled:** `diels_alder` is a first class Act 1 topic. Everything else pericyclic is deferred,
which is the reference's own recommendation.

**D11. Epoxide opening uses reagents the course has not formally taught yet.** `[measured]` The
handwritten ether and epoxide notes list Grignard reagents and acetylides as epoxide opening
nucleophiles in week one. The formal introduction of RMgX, RLi, acetylide and cyanide happens in week
three, on carbonyls.
**Reconciled, and this is the ordering fix:** `epoxides` depends on `nucleophiles_and_leaving_groups`,
a lightweight Orgo 1 node covering what a nucleophile is, relative nucleophile strength, and what a
leaving group is. It does **not** depend on `nucleophilic_addition_carbon`. A prerequisite graph built
naively from "where is this reagent first formally taught" puts epoxides after carbonyls, which
reverses the delivered order and gates two weeks of Act 1 behind Act 2. `nucleophilic_addition_carbon`
depends on the same lightweight node, so the two are siblings rather than a chain.

---

## 2. The three act structure

The acts are not an editorial device. They are the exam boundaries, stable across three semesters
`[measured]`, and each act's exam assumes the previous act completely.

- **Act 0, the spine.** Carried prerequisites and the four things every exam tests regardless of act.
  Not an exam of its own.
- **Act 1, pi systems and the aromatic ring.** Alcohols, ethers and epoxides as the entry chain, then
  allylic and diene chemistry, conjugation, Diels-Alder, phenol acidity, aromaticity, EAS and its
  directing effects, SNAr, arene side chain chemistry.
- **Act 2, the carbonyl as electrophile.** Nucleophilic addition with carbon, oxygen and nitrogen
  nucleophiles, prochirality, carboxylic acids, and the nucleophilic acyl substitution ladder.
- **Act 3, the carbonyl as nucleophile, plus amines.** Enols and enolates, aldol and Claisen,
  alpha alkylation and the ester syntheses, conjugate addition, amines, diazonium chemistry, and
  multistep synthesis as the terminal skill.

What each act assumes and never re-teaches `[measured]`:

- Act 1 assumes resonance, pKa magnitudes, carbocation stability and rearrangement, SN1/SN2/E1/E2
  selection, alkene addition, and R/S and E/Z. Notably, **SN1/SN2/E1/E2 never appear as standalone
  questions**. They appear only as embedded steps inside multistep sequences.
- Act 2 assumes Act 1. Aryl rings are the default substituent, phenol acts as a nucleophile, and one
  semester puts a full SNAr question on Act 2's exam.
- Act 3 assumes Act 2 non negotiably. A Claisen is acyl substitution with an enolate nucleophile and
  an aldol is addition with an enolate nucleophile. Act 3 also re-tests Act 1's kinetic versus
  thermodynamic control, on enolates instead of dienes. That is the course's own spaced repetition
  spine and section 4 models it.

---

## 3. Topic tree: act, topic, subtopic, teachable skill

Topic ids are the `TopicId` values in `packages/curriculum/src/placement.ts`. Subtopics and skills
live here only; they are the granularity a Duolingo shaped lesson track renders, and they become
`LessonId` values when the lesson schema exists. Nothing below is a free string in code today, on
purpose: see section 6 note.

### Act 0, the spine

**`pka_and_acidity`** (orgo_2) `[measured: 3 points on 6 of 6 exams, plus 4 to 22 more per exam]`
- pKa assignment
  - Assign an approximate pKa to a specific indicated proton
  - Find the most acidic site in a polyfunctional molecule, which is a whole molecule comparison
  - The course's own value ladder: -7, 0, 5, 10, 15 to 16, 20, 25, 35, 40, 50
- Keq from a pKa difference
  - `Keq = 10^(pKa of acid formed - pKa of acid consumed)`
  - Read Keq less than 1, equal to 1, greater than 1 as which side is favored
  - The Keq equals 1 case, taught deliberately, so the answer reads as a comparison not a rule
- Acidity arguments
  - Rank by acidity, anchored to a supplied reference pKa
  - Justify from **conjugate base** stability, never from the acid
- Step viability
  - A leaving group is good when its conjugate acid pKa is at or below 20, which makes the step
    reversible
  - A bad leaving group, conjugate acid pKa near 50, makes the step irreversible forward
  - Select the correct equilibrium arrow per mechanistic step

**`spectroscopy_nmr`** (orgo_1) and existing **`spectroscopy_ir`**, **`degrees_of_unsaturation`**
- The four NMR observables as a checklist: signal count, integration, multiplicity, chemical shift
- Multiplicity by n plus 1, neighbours three bonds away or fewer, Pascal's triangle through septet
- Shift as environment, downfield equals deshielded equals EWG
- 13C and its shift ranges

**`structure_determination`** (orgo_2) `[measured: exactly 10 points on 6 of 6 exams, always last]`
- The instructor's own ordered procedure: degrees of unsaturation first, four or more suggests an
  aryl ring; scan IR and 13C and 1H for functional groups; integrations to fragments; re-check the
  formula; multiplicities to assemble; shift last and only if needed
- Isomer discrimination: two isomers of one formula, assign each spectrum
- Formula in, reagents, formula out, structure

**`resonance_and_delocalisation`** (orgo_1)
- Arrows to structure, and the inverse, structure to arrows
- Enumerate the complete contributor set, then rank, then circle the major one
- Draw the hybrid with partial bonds and partial charges
- Formal charge and lone pair bookkeeping as an always required sub answer
- Motifs: lone pair into pi, pi to lone pair, allylic and pentadienyl, carboxylate and nitro,
  into and out of a ring, and onto an electron deficient boron

**`carbocation_stability_and_rearrangement`** (orgo_1)
- The full ranked series: vinyl and methyl, primary, secondary, allylic, benzylic, tertiary,
  conjugation stabilised
- Hydride and methyl shifts to a more stable cation, and when they run

**`nucleophiles_and_leaving_groups`** (orgo_1)
- What a nucleophile is, and relative strength
- What makes a leaving group good, tied to the conjugate acid pKa rule above
- Strong base quenched by a protic solvent, and why a carbon base cannot survive water
- **This is the lightweight node D11 exists for.** It carries no reagent catalogue.

### Act 1, pi systems and the aromatic ring

**`alcohol_leaving_groups`** (orgo_2)
- The framing: OH is a bad leaving group and must be activated
- Path A, activation with retention at carbon, no cation
  - Sulfonate esters: tosylate, mesylate, triflate
  - Halide by reagent: SOCl2 with pyridine, PBr3
- Path B, acid mediated ionisation, cation live, rearrangement live
  - HX substitution across the substrate ladder
  - Dehydration with hot sulfuric acid, E1, Zaitsev versus Hofmann alkene set
  - Rearrangement before elimination
- Two step activation then displacement, where the nucleophile and solvent decide the mechanism
- Chemoselectivity on diols where only one OH is activated

**`oxidation_and_reduction_ladder`** (orgo_2)
- The one level idea: weak oxidant moves one level, strong oxidant goes to the acid
- Substrate rule: primary to aldehyde to acid, secondary to ketone, tertiary no reaction
- The gem diol as the intermediate that lets an aldehyde go on to the acid
- Chemoselectivity: one polyfunctional substrate, two reagents, two different answers
- Reduction side: hydride reagents and their selectivity, hydrogenation

**`ethers`** (orgo_2)
- Formation: acid catalysed Markovnikov addition, alkoxymercuration and demercuration, and the
  Williamson synthesis with its methyl or primary halide constraint
- Cleavage with HX: HI and HBr work, HCl and HF do not
- The decision procedure the instructor writes out: check for SN1, if no then SN2 at the less
  crowded carbon
- The contrast case: a benzylic ether where SN1 does run, and both enantiomers appear
- Product bookkeeping: acyclic gives two products, cyclic gives one bifunctional product

**`epoxides`** (orgo_2) `[measured: the most heavily worked topic in the handwritten record]`
- Formation: peracid on an alkene, stereospecific; halohydrin then base, closing by intramolecular
  SN2
- Opening under acid: protonate, neutral nucleophile attacks the **more** substituted carbon, anti,
  then deprotonate
- Opening under base: nucleophile attacks the **less** hindered carbon first, anti, then a workup
  protonation
- Stereochemistry: the OH from the epoxide oxygen ends up trans to the nucleophile, inversion at the
  site attacked
- Syn versus anti dihydroxylation as a matched pair on one substrate
- The declared spectator: the counterion of the acid catalyst is explicitly excluded as a nucleophile
- Negative case: epoxide plus water alone is no reaction
- Intramolecular competition and cascades, where the first formed alkoxide is not the final answer

**`allylic_halogenation`** (orgo_2) `[inferred, see D5]`
- NBS with a radical initiator or light
- The allylic radical, and its delocalisation
- Contrast with ring bromination, which NBS does not do

**`conjugation_and_mo`** (orgo_2) `[measured: roughly 12 points on Act 1's exam]`
- Pi molecular orbital ladders: build, count nodes, label HOMO and LUMO
- The deliberate control substrate, an isolated diene, which gets a two orbital diagram
- Conjugation length against lambda max, as a table and as a direction of shift
- HOMO-LUMO gap shrinks as conjugation extends, so longer wavelength
- Absorbed colour versus observed colour
- Extending conjugation by deprotonation, which changes the chromophore

**`diene_addition`** (orgo_2)
- Protonation to the allylic cation as the rate determining step
- Both resonance contributors required, or the 1,4 product cannot be explained
- 1,2 versus 1,4, labelled, and mapped onto kinetic versus thermodynamic
- Temperature as the deciding variable
- Asymmetric dienes: which contributor dominates, and therefore which regiochemistry wins

**`diels_alder`** (orgo_2) `[measured: a full lecture, plus roughly 14 points with dienes on Act 1]`
- The four requirements, as the instructor's own checklist: HOMO and LUMO in phase, s-cis diene, EWG
  on the dienophile, EDG on the diene
- Role assignment, and the graded answer form: "diene or dienophile, more likely X because Y"
- The conformational lockout: a diene that cannot reach s-cis is disqualified regardless of
  electronics
- Regiochemistry, the ortho and para preference
- Stereochemistry: suprafacial, cis relationships preserved, endo versus exo
- Ring cases: cyclic dienophile gives a fused bicyclic, cyclic diene gives a bridged bicyclic
- Run backwards: given the product, give the starting materials

**`iupac_nomenclature`** (orgo_2) `[measured: 6 points when present, always present on Act 2]`
- Aryl naming, including ortho, meta and para
- The suffix priority order, which is what decides the parent
- Demotion of everything else to prefixes
- Parent chain selection and locant numbering
- Group specific rules: ester alkyl first, amide N locants, aldehyde carbon 1 fixed
- E and Z inside a name

**`phenols`** (orgo_2)
- Phenol acidity against an alkyl alcohol, argued from conjugate base delocalisation
- Ortho, meta and para substituted phenols, ranked
- **The rubric**, which is the instructor's own decision procedure: decide whether the substituent
  acts by resonance or by induction, then order by position. Meta cannot reach the phenoxide oxygen
  by resonance, only by induction.
- Phenoxide as a nucleophile, and phenol as a strongly activated ring
- Optional and unexamined here: Kolbe-Schmitt, Reimer-Tiemann, quinone oxidation

**`aromaticity`** (orgo_2) `[measured: 9 points on Act 1, both semesters]`
- The four requirements, as the instructor's own checklist: cyclic, a p orbital on every atom, planar,
  and 4n plus 2 pi electrons
- Three way classification, with antiaromatic as a first class outcome
- **n is an explicit required answer**, and a non integer n is the tell
- Lone pair bookkeeping: is this pair in the pi system, and if not, which orbital holds it
- Matched pairs: same heteroatoms, different saturation, one aromatic and one not
- Aromaticity as a driver of acidity, argued on the conjugate base
- Frost's circle and reading aromaticity off the MO filling

**`aromatic_substitution`** (orgo_2, existing id) `[measured: roughly 29 points with synthesis on Act 1]`
- The general mechanism through the arenium intermediate
- Halogenation, nitration, sulfonation
- Friedel-Crafts alkylation, including rearrangement of the alkylating agent, and its failure modes
- Friedel-Crafts acylation, no rearrangement, mono substitution only
- Formylation, taught here as a named extra
- Sulfonation as a reversible blocking group

**`eas_directing_effects`** (orgo_2)
- Ortho and para directors versus meta directors
- The full activating and deactivating ladder, six tiers
- The halogen anomaly: deactivating but ortho and para directing
- Directing effects on heteroaromatics, argued from where the positive charge sits
- **Order of operations in aromatic synthesis**, which is the actual assessed skill
- Acylate then reduce, as the standard workaround for alkylation rearrangement

**`nucleophilic_aromatic_substitution`** (orgo_2) `[see D6: examined, not lectured]`
- SNAr by addition and elimination, needing a strong ortho or para EWG
- The Meisenheimer intermediate
- The leaving group order reversed, F faster than I
- Benzyne by elimination and addition, needing no EWG, giving a mixture

**`arene_side_chain_chemistry`** (orgo_2)
- Benzylic bromination by a radical path, and why it is not ring bromination
- Benzylic oxidation to the aryl carboxylic acid, which requires a benzylic hydrogen
- Birch reduction, and the opposite regiochemistry for EWG and EDG rings
- Note `[measured]`: benzylic oxidation was **removed** from the instructor's exam topic list between
  two consecutive revisions of the same list. Treat its weight as low and falling.

### Act 2, the carbonyl as electrophile

**`carbonyl_chemistry`** (orgo_2, existing id, the act gateway)
- Carbonyl polarity and sterics, and what makes one carbonyl more electrophilic than another
- The carbonyl family suffix table, linking to `iupac_nomenclature`
- Reversible addition equilibria, and the arrow selection skill from `pka_and_acidity`

**`nucleophilic_addition_carbon`** (orgo_2)
- The enumerated carbon nucleophile list as the course gives it: Grignard, organolithium, acetylide,
  cyanide
- Grignard preparation, and the carbanion equivalent framing
- Carbonation of a Grignard to the carboxylic acid
- Cyanohydrin formation
- Hydride reduction as the non carbon sibling
- Wittig olefination and the E or Z consequence of ylide stabilisation
- Workup as its own step, and the alkoxide as the classic incomplete answer

**`nucleophilic_addition_oxygen`** (orgo_2)
- Hydrate and gem diol, and when it is favored
- One equivalent of alcohol gives the hemiacetal, excess gives the acetal
- Diol gives the cyclic acetal
- Intramolecular closure to a lactol
- Hydrolysis back to the carbonyl
- **The acetal as a protecting group**, install, do chemistry elsewhere, deprotect

**`nucleophilic_addition_nitrogen`** (orgo_2) `[measured: the most mechanistically detailed material
in the whole source record, every proton transfer drawn]`
- The amine classification branch: primary gives an imine, secondary gives an enamine, tertiary does
  not react
- The shared iminium intermediate, and the split at the **final deprotonation site**. This is the
  conceptual crux of the topic.
- Imine formation stepwise, and imine hydrolysis run explicitly rather than asserted as the reverse
- Enamine formation stepwise, with deprotonation at the alpha carbon
- Enamine regiochemistry, labelled kinetic versus thermodynamic
- Retrosynthetic disconnection of the C to N bond, colour coded into carbonyl half and amine half.
  This move recurs at least four times and is the signature interaction of the topic.
- Hydrazone and the deoxygenation route
- Oxime and the derivative tests
- Reductive amination
- Intramolecular imine formation to a cyclic imine

**`prochirality_re_si`** (orgo_2) `[measured: 6 points on Act 2's exam, both semesters]`
- Assign Re or Si to each face of a trigonal carbonyl carbon from CIP priorities
- Attack on each face gives the opposite configuration, so an achiral carbonyl plus an achiral
  nucleophile gives both enantiomers
- Four task directions, all drilled: draw both and label; draw the Re attack product; draw the Si
  attack product; **given the product, state which face was attacked**
- Never asserted as fifty fifty, which matches the repository's stated policy on stereorandom outcomes
- **Schema consequence.** The reverse direction needs a label keyed by resulting configuration, not
  only per face. See section 6.

**`carboxylic_acids`** (orgo_2)
- Acidity, salt formation, and acid base extraction argued with Keq
- Why a Grignard cannot be used on a substrate with an acidic proton, framed as "why can this not be
  done"
- Alpha halogenation of the acid
- Decarboxylation of beta keto acids and malonic acids on heating

**`nucleophilic_acyl_substitution`** (orgo_2) `[measured: roughly 33 points on Act 2's exam]`
- **The reactivity ladder as the organizing principle**: acyl halide, anhydride, ester and acid,
  amide, carboxylate
- The tetrahedral intermediate
- Every legal edge on the ladder, and why the upward edges do not exist
- Fischer esterification and its reversibility, saponification and its irreversibility
- Amide hydrolysis under forcing conditions
- Nitriles: formation, full and partial hydrolysis
- Reductions of derivatives, and the one equivalent low temperature case that stops at the aldehyde
- Two equivalents of organometallic on an ester, and the cuprate that stops after one

### Act 3, the carbonyl as nucleophile, plus amines

**`enols_and_enolates`** (orgo_2) `[measured: enolate chemistry is roughly half of Act 3's exam]`
- Keto and enol tautomerism
- Alpha proton pKa, and the beta dicarbonyl case that is ten orders of magnitude more acidic
- Which molecules can even form an enolate, and whether a chosen base is strong enough
- Kinetic enolate at low temperature versus thermodynamic enolate under equilibrating conditions
- Alpha halogenation under acid, mono, and under base, poly
- The haloform cleavage of a methyl ketone

**`aldol_and_claisen`** (orgo_2)
- Aldol addition to the beta hydroxy carbonyl, and condensation with heat to the enone
- Crossed aldol, controlled by a partner with no alpha hydrogen or by a preformed enolate
- Intramolecular aldol to a ring, five and six membered favored
- Claisen condensation to the beta ketoester, and Dieckmann for the ring
- Crossed Claisen and its control
- Self Claisen feasibility as an explicit question form

**`alpha_alkylation`** (orgo_2)
- Enolate alkylation with an alkyl halide
- Malonic ester synthesis: alkylate, hydrolyse, decarboxylate
- Acetoacetic ester synthesis, to the methyl ketone
- The enamine as a masked, activated enol equivalent, alkylate then hydrolyse
- Base and ester matching, because a mismatch causes transesterification

**`conjugate_addition`** (orgo_2)
- 1,2 versus 1,4, and **the nucleophile decides**, not the substrate
- Hard nucleophiles give 1,2, soft nucleophiles give 1,4
- The cuprate as the dedicated 1,4 carbon nucleophile
- Michael donors from 1,3 dicarbonyls, and Michael acceptors
- Michael then intramolecular aldol condensation, forming a new ring

**`amines`** (orgo_2) `[measured: roughly 16 points on Act 3's exam]`
- Basicity and nucleophilicity across aliphatic, aryl and amide nitrogen
- The over alkylation problem with direct alkylation
- Clean primary amine routes: reductive amination, phthalimide, azide, nitrile reduction, amide
  reduction, nitro reduction
- Hofmann rearrangement, losing one carbon
- Hofmann elimination, giving the less substituted alkene
- Acylation as protection, to moderate an aniline ring

**`diazonium_chemistry`** (orgo_2)
- Diazonium formation from a primary aryl amine at low temperature
- The substitution family, which is the widest single equivalence set in the course
- Azo coupling onto an activated arene
- This is the edge that closes Act 3 back onto Act 1

**`multistep_synthesis`** (orgo_2) `[measured: exactly 10 points on 6 of 6 exams, always its own page]`
- Functional group interconversion as a graph traversal: given a start and a target, find a path
- **Order of operations** as the main failure mode
- Protecting group orchestration
- Workup as its own numbered step, stated explicitly by the course
- Mechanism explicitly forbidden in the answer
- The carbon count constraint, in two variants
- Multiple valid routes exist, routinely, not as an edge case

---

## 4. Prerequisite edges as data

The edge list below is what `placement.ts` carries. Three sources fed it: the recall moments where a
lecture opens by re-teaching a previous topic, the reagent reference's per topic "Foundations to
master this topic" lists, and the act succession in the exam record.

### Edges the instructor asserts directly `[measured]`

| From | To | Evidence |
|---|---|---|
| `carbocation_stability_and_rearrangement` | everything with a cation step | Opens lecture 1 as a recall slide, re-taught in depth immediately before ether cleavage triage |
| `pka_and_acidity` | `alcohol_leaving_groups` | Keq and pKa taught as recall in lecture 1, then used to justify activation |
| `structure_determination` | `alcohol_leaving_groups` | **Not encoded.** The spectroscopy block is positioned as the gate before alcohols begin. Delivery order, see below. |
| `alcohol_leaving_groups` | `ethers`, `epoxides` | "Last class you covered alcohols, try these problems" opens the ether and epoxide day |
| `carbocation_stability_and_rearrangement` | `ethers` | Re-taught in depth right before the SN1 versus SN2 triage on ether cleavage |
| `alcohol_leaving_groups` | `diene_addition` | The dienes lecture opens on an alcohol recall slide |
| `conjugation_and_mo` | `diels_alder` | The Diels-Alder requirements are stated in terms of HOMO and LUMO. Explicit and load bearing. |
| `diels_alder` | `aromaticity` | **Not encoded.** The benzene lecture opens on carried Diels-Alder practice. Delivery order, see below. |
| `phenols` | `eas_directing_effects` | The EWG and EDG reasoning is built on phenol acidity and then reused wholesale |
| `aromaticity` | `aromatic_substitution` | Aromaticity requirements are restated immediately before EAS |
| `iupac_nomenclature` | `carbonyl_chemistry` | Carbonyl nomenclature is carried over and finished before any carbonyl reaction |
| `diene_addition` | `enols_and_enolates` | Enamine and enolate regiochemistry are labelled with the diene lecture's kinetic and thermodynamic vocabulary |
| `nucleophilic_addition_carbon` | `nucleophilic_addition_nitrogen` | Nitrogen nucleophiles are framed as the sequel to the carbon nucleophile list |

**Two of those rows are delivery order, not dependency, and are deliberately not encoded as edges in
`placement.ts`.** Spectroscopy into alcohols is a fact about a timetable: the instructor finished the
analytical block before starting the chemistry, and nothing in alcohol activation needs an NMR
spectrum. Diels-Alder into aromaticity is leftover practice problems being cleared at the top of the
next class. The placement quiz walks this graph backwards to decide where a struggling student
starts, and answering "you failed epoxides, go back and do NMR" is a wrong answer. Both are recorded
here because they are real evidence about pacing, and neither is a prerequisite.

**The cross act concept links are also not prerequisite edges.** Kinetic versus thermodynamic control
carrying from dienes to enolates is a real link, recorded in section 5, and it is not a dependency: a
student can learn enolate chemistry without diene chemistry. It lives in the concept relation, which
has its own `introducedIn` and `reusedIn`, so a diagnostic can say "this is the same idea you met on
dienes" without the unlock graph gating one behind the other.

### The epoxide ordering fix

`[measured]` The handwritten record uses Grignard reagents and acetylides as epoxide opening
nucleophiles two weeks before the carbonyl lecture formally teaches them.

```
nucleophiles_and_leaving_groups  ->  epoxides                        (adopted)
nucleophiles_and_leaving_groups  ->  nucleophilic_addition_carbon    (adopted)
nucleophilic_addition_carbon     ->  epoxides                        (REJECTED)
```

The rejected edge is what a naive graph built from "first formal teaching" produces. It inverts two
weeks of the delivered course and gates the whole of Act 1's opening chain behind Act 2.
`nucleophiles_and_leaving_groups` carries no reagent catalogue: what a nucleophile is, relative
strength, what makes a leaving group good, and why a strong carbon base does not survive a protic
solvent. That is all `epoxides` actually needs.

### Act succession edges `[measured from the exam record]`

- Every Act 2 topic depends on at least one Act 1 topic. `carbonyl_chemistry` depends on
  `iupac_nomenclature`, and Act 2's exam carries forward SNAr and aromatic activation logic.
- Every Act 3 topic depends on Act 2. `aldol_and_claisen` depends on both
  `nucleophilic_addition_carbon` and `nucleophilic_acyl_substitution`, because an aldol is addition
  with an enolate nucleophile and a Claisen is acyl substitution with one.
- `diazonium_chemistry` depends on `eas_directing_effects`, closing Act 3 onto Act 1.
- `multistep_synthesis` depends across all three acts and is the only topic that does.

### Edges from the reference's Foundations lists that delivery does not assert

These are adopted because the reference is the institution neutral spine, and none of them contradict
the delivered order:

- `resonance_and_delocalisation` into `aromaticity`, `enols_and_enolates`, `aromatic_substitution`
- `nucleophiles_and_leaving_groups` and `substitution_and_elimination` into `nucleophilic_aromatic_substitution`
- `oxidation_and_reduction_ladder` into `carboxylic_acids` and `multistep_synthesis`
- `nucleophilic_addition_oxygen` into `multistep_synthesis`, for protecting group logic

---

## 5. Cross cutting concepts

Four of these are taught in one topic and assessed in another, two acts apart. Modelling them as
topic local rules loses the connection the course itself is making, and a student who fails the
second site has a gap at the first. They are `ConceptId` values in `placement.ts`, attached to topics
by an `introducedIn` and `reusedIn` pair.

| Concept | Introduced in | Reused in | Evidence |
|---|---|---|---|
| `kinetic_vs_thermodynamic_control` | `diene_addition` | `nucleophilic_addition_nitrogen`, `enols_and_enolates` | `[measured]` Taught on 1,2 versus 1,4 diene addition in Act 1. The enamine regiochemistry notes label the two regioisomers "kinetic, major" and "thermodynamic, minor" in the same vocabulary. Act 3's exam re-tests it on low temperature versus equilibrating enolate formation. Same concept, two acts apart, three contexts. |
| `pka_keq_viability` | `pka_and_acidity` | `nucleophilic_addition_oxygen`, `nucleophilic_addition_nitrogen`, `carboxylic_acids`, `enols_and_enolates`, `nucleophilic_acyl_substitution` | `[measured]` The same machinery on four separate worksheets: Keq from a pKa difference, the conjugate acid pKa at or below 20 leaving group rule, and the most acidic proton being a whole molecule comparison. This is the single most mechanically implementable feedback win in the source record. |
| `ewg_edg_rubric` | `phenols` | `eas_directing_effects`, `diels_alder`, `nucleophilic_aromatic_substitution` | `[measured]` Built once on phenol acidity as a resonance versus induction decision procedure, then reused unchanged for EAS activating and deactivating groups. Diels-Alder states its requirements in the same vocabulary. |
| `conjugate_base_stability_argument` | `pka_and_acidity` | `phenols`, `aromaticity`, `enols_and_enolates` | `[measured]` The recurring rhetorical move across the whole corpus: argue from the stability of the product or intermediate, never the starting material. Every key that asks why something is acidic frames the answer on the conjugate base. |
| `resonance_delocalisation` | `resonance_and_delocalisation` | `diene_addition`, `aromaticity`, `aromatic_substitution`, `enols_and_enolates`, `nucleophilic_acyl_substitution` | `[measured]` Front matter on every exam: "if your explanation for a question is resonance, you must draw out the resonance structures to receive full credit". The single most explicitly policed failure in the course. |
| `carbocation_rearrangement` | `carbocation_stability_and_rearrangement` | `alcohol_leaving_groups`, `ethers`, `aromatic_substitution` | `[measured]` The same rearrangement blindness mistake pattern appears on the alcohol worksheet and again on the EAS worksheet as Friedel-Crafts alkylation of a primary halide. Same error, new costume. |
| `anti_addition_geometry` | `epoxides` | `alkene_addition`, `oxidation_and_reduction_ladder` | `[measured]` Anti opening is drawn geometrically with the 180 degree relationship, and syn versus anti dihydroxylation is run as a matched pair on one substrate. |
| `protecting_group_strategy` | `nucleophilic_addition_oxygen` | `nucleophilic_addition_nitrogen`, `amines`, `multistep_synthesis` | `[measured]` The dominant theme of two synthesis worksheets. The enamine is taught as an alternative masking strategy, and aniline acylation is protection on a ring. |
| `acyl_reactivity_ladder` | `nucleophilic_acyl_substitution` | `aldol_and_claisen`, `carboxylic_acids` | `[measured]` The reference calls it the organizing principle of its topic 8. Act 2's exam makes it a whole question. A Claisen is a legal traversal of it with an enolate nucleophile. |
| `oxidation_state_ladder` | `oxidation_and_reduction_ladder` | `carboxylic_acids`, `multistep_synthesis`, `nucleophilic_acyl_substitution` | `[measured]` Taught with an explicit one level diagram, and reused as the connective tissue of every synthesis worksheet. |

Two more patterns are cross cutting but are **engine features rather than chemistry concepts**, so
they are recorded here and not in `CONCEPTS`:

- **Conditions are answer determining.** Seven condition axes each decide a graded answer somewhere in
  the corpus: temperature, stoichiometry, solvent, acid versus base regime, workup type, base sterics,
  and additive. A condition model that treats any of them as decoration makes those problems
  unanswerable.
- **The instruction preamble is an answer shape spec.** Six worksheets share one preamble, and four
  independent authoring flags fall out of it: which slot is blank, major only versus all products,
  stereochemistry required, and the stoichiometry default.

---

## 6. Per topic reference

Exam weight is approximate where a point block is apportioned across parts of one question, and exact
where the slot is anchored. Weights are per act exam, out of 100, and only topics that carry weight
are listed.

### Act 1 weighting `[measured, one semester's exam, corroborated against two more]`

| Topic | Points | Answer shapes needed | Top Tier 2 mistake patterns |
|---|---|---|---|
| `pka_and_acidity` | ~16 | numeric, rank, explain under a word limit | Judging acidity on the acid rather than the conjugate base. Assuming an N-H beats an O-H. Forgetting the protonated species at pKa 0 and below. |
| `aromatic_substitution` plus `eas_directing_effects` | ~29 | mechanism, multistep synthesis, predict product | Friedel-Crafts alkylation rearrangement. Wrong order in aromatic synthesis. Inductive and resonance effects conflated. Alkylation attempted on a deactivated ring. |
| `diene_addition` plus `diels_alder` | ~14 | mechanism with resonance required, predict product with stereochemistry, reverse predict, classify with a graded answer | s-cis lockout ignored. Kinetic and thermodynamic mapped to the wrong product. Electronics reversed. Cis relationships flattened. Concerted mechanism drawn stepwise. |
| `conjugation_and_mo` | ~12 | MO diagram fill, explain why, numeric range | Conjugated confused with merely multiple pi bonds. Absorbed colour confused with observed colour. Longer conjugation assumed to mean higher energy absorbed. |
| `aromaticity` | 9 | three way classify, numeric, assign descriptor per lone pair | Counting lone pairs that are not in the pi system. Collapsing three way classification to two way. Assuming alternating bonds means aromatic. |
| `structure_determination` | 10 exactly | structure from formula and spectra | Skipping the degrees of unsaturation step. Assigning integration before checking the formula. |
| `arene_side_chain_chemistry`, `ethers` | ~5 | predict product inside a sequence | NBS mistaken for ring bromination. Cleaving the wrong C-O bond. Only one product drawn on an acyclic ether. |

The alcohol, ether and epoxide block carries **two weeks of teaching and roughly 5 points of
standalone exam weight** `[measured]`. It is examined almost entirely as embedded steps inside
multistep sequences. Do not weight authored content by exam points alone here: this block is
prerequisite critical and under assessed, which is exactly the shape a pathway should front load.

### Act 2 weighting `[measured]`

| Topic | Points | Answer shapes needed | Top Tier 2 mistake patterns |
|---|---|---|---|
| `nucleophilic_acyl_substitution` | ~33 | reaction web fill reagent, multistep synthesis, predict product | Traversing the ladder in an impossible direction. Over addition of two equivalents of organometallic to an ester. Forgetting that saponification is irreversible. |
| the three `nucleophilic_addition_*` topics | ~34 | mechanism, predict product, fill reagent, multistep synthesis, explain why | Imine versus enamine chosen from the carbonyl instead of the amine class. Tertiary amine assumed to react. Hemiacetal and acetal confused by stoichiometry. Alkoxide reported instead of the alcohol. Protecting group omitted, or deprotection forgotten. |
| `prochirality_re_si` | 6 exactly | assign descriptor, predict product under a stereo constraint, reverse descriptor from structure | Face read from the wrong side of the plane. CIP priorities misassigned, which then propagates. Only one product drawn when both faces are open. Re and Si conflated with R and S. |
| `iupac_nomenclature` | 6 | name to structure, structure to name | Wrong principal group. Numbering from the wrong end. E or Z omitted. N locant omitted. |
| `pka_and_acidity` | 7 | numeric, explain with structures and no words | Treating every carbonyl step as irreversible. |
| `structure_determination` | 10 exactly | structure from formula and spectra | As Act 1. |

### Act 3 weighting `[measured]`

| Topic | Points | Answer shapes needed | Top Tier 2 mistake patterns |
|---|---|---|---|
| `enols_and_enolates` plus `aldol_and_claisen` plus `alpha_alkylation` plus `conjugate_addition` | ~54 | mechanism, multistep synthesis, predict product, draw a specified species, circle all that apply | 1,2 versus 1,4 decided from the substrate instead of the nucleophile. Grignard substituted for a cuprate. Enolate formed at the wrong carbon. Kinetic and thermodynamic enolate confused. Decarboxylation forgotten. Base and ester mismatched. Self condensation in a crossed reaction. |
| `enols_and_enolates` feasibility cluster | 22 | numeric Keq, draw the enolate, name an alternative base, explain under a word limit | Which molecules can enolise at all. Whether the chosen base is strong enough. Self Claisen feasibility. |
| `amines` plus `diazonium_chemistry` | ~16 | predict product, draw a specified species, explain under a word limit | Over alkylation ignored. Aryl amine basicity assumed equal to alkyl. Diazonium substitution family confused member for member. |
| `structure_determination` | 10 exactly | structure from formula and spectra | As Act 1. |

### Reagent vocabulary, equivalence groups, and the near miss pairs

Equivalence groups marked `[EQ]` come from the reference's own inline grouping and from the keys
writing "or" between reagents. **Equivalence is per reaction type, not per reagent**, and section
"near miss pairs" is why.

Selected `[EQ]` groups, by topic:

- `alcohol_leaving_groups`: `[EQ halide: SOCl2 with pyridine; PBr3; PCl3 or PCl5; P with I2; Appel]`,
  `[EQ sulfonate: TsCl, MsCl, TfCl]` with pyridine or a tertiary amine base
- `oxidation_and_reduction_ladder`: `[EQ stop at aldehyde: PCC, PDC, Dess-Martin, Swern, TEMPO]`,
  `[EQ go to acid: Jones, CrO3 with H2SO4, dichromate, permanganate]`
- `epoxides`: `[EQ epoxidising: mCPBA, peroxyacetic acid]`,
  `[EQ basic opening nucleophile: alkoxide, thiolate, cyanide, azide, RMgX, RLi, hydride, cuprate]`,
  `[EQ syn dihydroxylation: OsO4, cold dilute permanganate]`
- `aromatic_substitution`: `[EQ Lewis acid: AlCl3, FeCl3, FeBr3]`,
  `[EQ carbonyl to methylene: dissolving zinc amalgam; hydrazine with strong base and heat; thioacetal
  then Raney nickel]`, `[EQ nitro reduction: H2 over Pd or Pt or Ni; Fe with HCl; Sn with HCl; SnCl2;
  Zn with HCl]`, `[EQ benzylic oxidation: permanganate, dichromate with acid]`
- `nucleophilic_addition_carbon`: `[EQ methyl delivery: CH3MgBr, CH3Li]`,
  `[EQ simple ketone and aldehyde reduction: NaBH4, LiAlH4]`,
  `[EQ cyanohydrin: HCN; cyanide salt then acid; TMSCN]`
- `nucleophilic_addition_nitrogen`: `[EQ secondary amine for enamines: pyrrolidine, morpholine,
  piperidine]`, `[EQ Wolff-Kishner: hydrazine then base and heat, or the one pot variant]`
- `nucleophilic_acyl_substitution`: `[EQ acid to acyl chloride: SOCl2; oxalyl chloride with DMF;
  PCl3; PCl5]`, `[EQ Fischer catalyst: H2SO4, TsOH]`, `[EQ coupling: DCC with DMAP, EDC]`
- `enols_and_enolates`: `[EQ aldol base: NaOH, KOH]`, `[EQ alpha halogen: Br2, Cl2]`
- `amines`: `[EQ reductive amination reductant: NaBH3CN, NaBH(OAc)3, H2 over Ni]`
- `diazonium_chemistry`: the substitution family is the widest set in the course and each member gives
  a different product, so it is a **selection list, never an equivalence group**

**Near miss pairs that must never merge.** Each pair is a Tier 2 mistake pattern in its own right, and
merging any of them into one equivalence group deletes the lesson:

| Pair | What separates them |
|---|---|
| PCC or PDC **versus** Jones or chromic acid | Stops at the aldehyde versus goes to the acid |
| RMgX **versus** R2CuLi | 1,2 addition versus 1,4 addition. Same delivered group, different site. |
| NaOH **versus** a bulky alkoxide | Zaitsev versus Hofmann alkene |
| HBr **versus** HBr with peroxide | Markovnikov versus anti-Markovnikov |
| LDA at low temperature **versus** alkoxide at room temperature | Kinetic versus thermodynamic enolate |
| NaBH4 **versus** LiAlH4 | Equivalent **only** on aldehydes and ketones. Not equivalent when a less reactive carbonyl is present. |
| Epoxide under acid **versus** under base | Opposite regiochemistry on the same substrate |
| One equivalent **versus** excess alcohol | Hemiacetal versus acetal |
| Acid chloride plus one equivalent cuprate **versus** two equivalents of RMgX | Ketone versus tertiary alcohol |
| NBS **versus** Br2 with a Lewis acid | Benzylic radical position versus the ring |

Note on subtopic identifiers: subtopics and skills in section 3 are **not** free strings in
`placement.ts`. The file's own header argues that a topic written as a free string cannot be counted,
grouped, or coverage checked, and the same argument applies one level down. They stay in this document
until the lesson schema exists, at which point they become `LessonId` values with a registry of the
same construction as `TOPICS`.

---

## 7. The exam template

`[measured across three semesters and six exam slots]` The exam is a fixed template. The slots do not
move. Only the chemistry inside them rotates. This is the specification for a practice exam mode.

Every exam: 50 minutes, 100 points, 11 pages.

| Page | Slot | Points | Invariance |
|---|---|---|---|
| 1 | Honor pledge and directions | 0 | Identical wording across semesters |
| 2 | Per page point tally out of 100 | - | Always present |
| 3 | **pKa of the underlined protons, three blanks** | **3, exactly** | 6 of 6 exams, always first |
| 3 to 4 | Conceptual and classification cluster, two to four short items | 10 to 20 | Slot always present, contents rotate freely |
| 5 | **Mechanism, arrow formalism** | **10** | 6 of 6 exams, always page 5 |
| 6 | **Multistep synthesis proposal** | **10** | 6 of 6 exams, always page 6 |
| 7 to 8 | **Reaction prediction, parts a through g or h** | **30 to 40** | 6 of 6 exams, the largest block on every one |
| 9 | **Spectroscopy structure determination** | **10** | 6 of 6 exams, always last |
| 10 | Scrap paper | 0 | Always |

Page point budgets: page 3 is 13 to 23, page 4 is 12 to 20, page 5 is always exactly 10, page 6 is
always exactly 10, page 7 is 15 to 20, page 8 is 20 to 25, page 9 is always exactly 10.

The three anchored 10 point slots plus the prediction block are 60 to 70 of the 100 points on every
exam. **That is the shape a practice exam mode should mirror.**

### The grading contract, verbatim in substance and stable across all six

- Show all work, clearly report the final answer. **No credit where multiple answers are shown.**
  Hedging is penalised.
- **If the explanation is resonance, the resonance structures must be drawn** for full credit. Front
  matter on every single exam.
- On the mechanism: arrow formalism, **all resonance structures where appropriate**.
- On the synthesis: starting materials, reagents and products for each step, and **no mechanism or
  mechanistic intermediates**.
- Acts 2 and 3 add: **include any water or acid workup steps as separate steps**.
- On the prediction block: **if more than one product can be formed, draw only the major product.
  Indicate stereochemistry where appropriate. Assume excess reagent unless otherwise noted.**
- Act 1 only adds: **assume room temperature if no temperature or heat is specified.**
- Carbon count constraint on the synthesis, two variants: Act 1 requires that the starting material's
  carbons **must** all be present in the product; Acts 2 and 3 require that they account for the
  **majority** of the product's carbons.

### Question form census

Eighteen distinct forms. Each is a candidate problem type. `F16` is emphasised because its reverse
directions are as common as forward prediction: a mode that only asks for products covers about a
third of the highest weighted question on every exam.

| # | Form | Points | Frequency |
|---|---|---|---|
| F1 | pKa recall, three underlined protons | 3 | 6 of 6 |
| F2 | Rank or circle by acidity, often anchored to a supplied pKa | 4 to 6 | ~4 of 6 |
| F3 | Compute Keq from a pKa difference | 3 to 10 | Acts 1 and 3 |
| F4 | Classify aromatic, antiaromatic or not, sometimes scaffolded into sub columns | 6 to 9 | Act 1, both semesters |
| F5 | Name to structure, and structure to name | 6 | Act 1 or Act 2 |
| F6 | Circle all that apply over a reagent or substrate set | 3 to 5 | Acts 1 and 3 |
| F7 | Rank or circle by reactivity | 4 to 5 | Act 1 |
| F8 | Match a structure to a physical observable | 4 to 6 | Act 1 |
| F9 | Explanation under a hard word limit, sometimes with words forbidden entirely | 4 to 6 | 5 of 6 |
| F10 | Count MO diagram quantities: atomic orbitals, molecular orbitals, pi electrons | 6 | Act 1 |
| F11 | Prochirality: label the face attacked, or draw the product of attack at a named face | 6 | Act 2, both semesters |
| F12 | Select the correct equilibrium arrow per mechanistic step | 9 | Act 2, one semester |
| F13 | Full arrow pushing mechanism, resonance structures mandatory | 10 to 11 | 6 of 6, always page 5 |
| F14 | Multistep synthesis, carbon count constrained, mechanism forbidden | 10 | 6 of 6, always page 6 |
| F15 | Reaction web: fill in reagents to interconvert a derivative family | 11 | Act 2, one semester |
| F16 | Reaction prediction. Three sub forms: product from start plus reagent; **reagent from start plus product**; **starting material from reagent plus product** | 30 to 40 | 6 of 6 |
| F17 | Draw a specified species: the enolate, the conjugate acid salt, an alternative base | 3 to 5 | Act 3 |
| F18 | Structure determination, sometimes scaffolded with degrees of unsaturation, fragments, and final structure boxes | 10 | 6 of 6, always last |

### Stable versus per semester variable

Do not over fit a practice exam mode to the variable half.

**Stable:** the page skeleton and point budget, the pKa opener, the four anchored slots, all rubric
boilerplate word for word, the act ordering, aromaticity classification on Act 1, prochirality on Act
2 at 6 points, enolate feasibility opening Act 3, explanations under a hard word limit, the one
equivalent trap on Act 1, and explicit temperature as a discriminator.

**Variable:** the Act 1 conceptual cluster contents, nomenclature placement, the direction the
prochirality question is asked in, whether the reaction web appears, whether equilibrium arrow
selection appears, the Act 3 opening cluster framing, the prediction block size, and which real world
molecule anchors the applied hook. The applied hook itself is a stable **device** on Act 1, always,
and on Act 3 sometimes, and never on Act 2, even though the specific molecule rotates.

---

## 8. Deferred topics, with reasons

Each of these is real course material somewhere. Each is deferred for a stated reason, and each needs
a deliberate decision to un-defer rather than drifting in.

**Carbohydrates.** `[capability gap, not a content gap]` A full sixteen problem worksheet exists, and
the reference's topic 13 carries a complete reaction set. Deferred because it needs **Haworth and
Fischer projection rendering and input**. Neither is a skeletal formula, so both the renderer and the
input surface need new support. The reference also flags the topic as frequently deferred to
biochemistry, with coverage ranging from one lecture to several weeks. It appears in no lecture and on
no exam in the record.

**MO diagram construction.** `[capability gap]` Both the aromaticity and the conjugated systems
worksheets require building a pi MO ladder, labelling node counts, and identifying HOMO and LUMO, and
Act 1's exam has a 6 point question counting orbital quantities. This is not a molecule and not a
mechanism, so it needs a bespoke answer shape or an explicit exclusion. It is genuinely assessed, so
excluding it costs about 6 points of Act 1 coverage. Recommend a decision rather than a default.

**Transition state drawing.** `[representation gap]` The diene worksheet asks for the transition state
of the rate determining step, with partial charges, dashed partial bonds, and no discrete species. The
state model is a multiset of species with integer bond orders and cannot express it. Either add a
transition state representation or exclude the form.

**UV-Vis, colour, and lambda max prediction.** `[overlap]` Spectroscopy adjacent and covered from two
directions, so authoring it inside `conjugation_and_mo` risks duplicating `structure_determination`
content. It carries real exam weight on Act 1 as the applied hook, so it is deferred rather than
dropped.

**Nomenclature grading in the structure to name direction.** `[grading gap]` Grading a name is string
canonicalisation with many legal variants and a well known false negative rate.
**Recommendation: invert to name to structure**, so the answer is a molecule the engine can compare
properly, and treat structure to name as display only or as multiple choice.

**The reference's topics 12 to 15, all four flagged not universal by the reference itself:**

- **Topic 12, pericyclic reactions beyond Diels-Alder.** The reference's own note: many programs cover
  only Diels-Alder and defer the rest to advanced courses. Electrocyclic reactions, sigmatropic
  shifts, and photochemical cycloadditions appear in no lecture and on no exam in the record.
  Diels-Alder itself is **not** deferred, it is a first class Act 1 topic.
- **Topic 13, carbohydrates.** Above.
- **Topic 14, amino acids, peptides and proteins.** The reference marks it often deferred to
  biochemistry with highly variable coverage. Appears in no lecture and on no exam here. Its one
  structural link into scoped material is SNAr, through the N terminus labelling reagent.
- **Topic 15, lipids and optional capstones.** The reference's own note: inclusion depends on
  instructor and time. Adds no new reagents, and its retrosynthesis and protecting group content is
  already covered by `multistep_synthesis`.

One dependency that is **not** a deferral: **Organic I reactions are a hard requirement.** The
synthesis worksheets freely use radical halogenation, hydroboration, halohydrin formation,
hydrogenation and Markovnikov additions as building blocks inside Organic II routes. The reaction
database must carry Organic I chemistry even though this taxonomy is Organic II. That is a size
estimate to budget for, not a scope violation.

---

## 9. Reliability notes, and what was set aside

Findings from the source record that were **not** used, each with the reason.

**`[set aside]` The 2026 date on one exam file.** The filename says Summer II 2026; the internal header
on every page says Summer II 2023. Either a mis-saved file or a reused template. Not treated as
evidence for any weighting claim without the owner confirming which is right. Nothing in this document
depends on it.

**`[set aside]` Lecture 12's content.** `[inference, medium confidence]` The lecture record has a gap
between the carbon nucleophile lecture and the imine and enamine notes, and the untaught material in
between is oxygen nucleophile addition. The inference is supported only by a worksheet filename. The
`nucleophilic_addition_oxygen` topic is included on the strength of the worksheet itself and the exam
weight, **not** on the strength of the missing lecture inference.

**`[set aside]` The instructor's anhydride prefix.** The nomenclature table lists the anhydride prefix
as identical to the ester prefix. That is a copy error in the source. Flagged so it is not propagated
into authored content, and not corrected in the source.

**`[set aside]` The ozonolysis half of one worksheet.** The title names it, the extracted text does not
contain it, and no rasteriser was available to look at the drawn half. Ozonolysis subtopics are
therefore **inferred from a title only** and are not listed as skills anywhere in section 3. If
ozonolysis content is authored later, confirm the scope visually first.

**`[set aside]` One handwritten "an exception" case.** A fused bicyclic epoxide is drawn with two
labelled protons and the question is posed with no answer on the page. The identity of the exception
is an inference and the page carries only the label and the proton labels. Not encoded as a skill.

**`[uncertain, recorded]` The lecture numbering is off by one.** `[inference, high confidence]` One
deck is saved under the previous lecture's number, which is why a lecture appears missing when it is
not. The date sequence is self consistent with one lecture per weekday and fixes the assignment. This
affects the delivered order reconstruction in section 1 and nothing else.

**`[measured, and it changes weighting]` The slide decks understate mechanism content badly.** The
instructor states on slide 1 that annotated notes are not shared. Several lecture decks are
title only skeletons and all the real mechanism teaching lives in two handwritten files. Any future
mining pass that reads only the decks will badly under count mechanism content. Section 3's depth for
epoxides and for imines and enamines comes from the handwritten files, not the decks.

**`[measured]` One real scope edit inside the record.** Benzylic oxidation was present on one version
of the instructor's exam topic list and removed from the next revision of the same list. Recorded in
section 3 under `arene_side_chain_chemistry` as a falling weight rather than treated as stable.

### Corrections proposed to CLAUDE.md

Proposed, not applied. Applying them is the orchestrator's call.

**C1, the content seeding warning.** CLAUDE.md's "Graded chemistry, not boolean chemistry" section
names four chemistry fixtures: neopentyl SN2 disfavorability, E2 periplanarity, SN1 stereorandomness
with ion pairing, and anti addition of bromine to cis versus trans butene. **None of the four appears
as a question on any of the six exams examined.** SN1, SN2, E1 and E2 never appear standalone in this
course; they are assumed prerequisites embedded inside multistep sequences. Those four are good
**engine test fixtures** and they are not **content seeds**. A reaction database or a problem corpus
seeded from them would be seeded from the wrong third of the subject. Recommend a sentence in that
section saying so explicitly, because the section reads as a content list today.

**C2, the spectroscopy early need.** CLAUDE.md's content pipeline section says most of the curriculum
is not mechanism chemistry and lists spectroscopy interpretation among the material that never touches
`chem-core`. That is correct and this document confirms it. What it re-weights is **schedule**: lesson
1 of the flagship course is spectroscopy `[measured: roughly 37 of 46 slides]`, and structure
determination is exactly 10 points on 6 of 6 exams. The curriculum engine's numeric and structure
determination forms are therefore needed **at pathway start**, not in a later wave. Recommend the
content pipeline section say so, so sequencing is not planned around mechanisms arriving first.

**C3, an observation and not a correction.** The four result types match how this instructor actually
grades. "Explain why this does not form", "draw only the major product", and "could this react by a
self Claisen, explain why or why not" are exactly the `valid_not_requested` and named cause `invalid`
cases. The course already refuses boolean grading. No change needed; recorded as supporting evidence.
