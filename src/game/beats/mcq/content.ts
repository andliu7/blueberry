/**
 * The easy multiple choice beats. Authored data, and nothing else lives here.
 *
 * WHY THIS BEAT EXISTS AND WHY IT IS DELIBERATELY EASY. Owner complaint,
 * recorded against the onboarding questions and the DAT section quiz: they are
 * too complex, and nobody comes back to a question that costs three minutes to
 * read. So this beat has a hard authoring contract, checked by
 * mcqAuthoringViolations in authoring.ts and asserted by a test: one concept
 * per question, three or four options, every option short enough to read in a
 * glance, no arithmetic, no "first do this then do that". Hard questions still
 * exist in the product. They live in the quizzes at gates and bosses, and they
 * are not this file.
 *
 * WHY THE CONTENT IS WHAT IT IS. These four topics are the ones the task
 * names, and they are four of the seventeen spine nodes that are not arrow
 * pushing: directing effects (u3-directing), kinetic against thermodynamic
 * control (u1-kvt and u9-kvt-enolate), nitro reduction (u3-nitro-red and
 * u10-nitro-red) and phenol acidity (u11-acidity). Every node id here is a real
 * id out of demo/pathwayMap.ts and every conceptId is a real one out of
 * packages/curriculum's CONCEPTS; both are asserted by tests rather than
 * trusted, because a beat pointing at a node that does not exist is a beat
 * nothing ever plays.
 *
 * The wrong options are not invented. They are the mistake patterns already
 * mined out of the owner's own CHEM 241 exams and written down in
 * docs/COURSE-OUTLINE-ORGO2.md: "inductive and resonance effects conflated",
 * "kinetic and thermodynamic mapped to the wrong product", "kinetic and
 * thermodynamic enolate confused", and the instructor's own phenol rubric,
 * which is that meta cannot reach the phenoxide oxygen by resonance and only
 * reaches it by induction. That is what makes each `why` a Tier 2 explanation
 * in CLAUDE.md's sense rather than a restatement of the marking.
 *
 * EVERY OPTION CARRIES A `why`, INCLUDING THE RIGHT ONE. Two reasons. The
 * wrong ones need it because packages/curriculum's own cause registry says so:
 * `option_is_not_the_correct_one` is specificity `generic` and its teaching
 * note reads "on a multiple choice problem this cause means a distractor is
 * missing". An MCQ where every wrong option is explained can never fall
 * through to that cause, and there is a test that says so. The right one needs
 * it because CLAUDE.md's feedback section is explicit that a correct step
 * explains itself too, since a student who guesses correctly has learned
 * nothing.
 *
 * OPTION ORDER IS FIXED, AND NOT SHUFFLED AT RUNTIME. A shuffle is the obvious
 * answer to positional bias and it costs more than it looks: a random order
 * means the screen a student saw is not the screen a bug report describes, and
 * it means a card generated from a mistake names an option that has moved. The
 * cheaper fix is authoring discipline, so the correct option's index is varied
 * across the set here and a test caps how often any one index is the answer.
 *
 * NO `moleculeId` ON ANY BEAT IN THIS FILE, and every beat still carries a
 * DRAWING. The two were the same sentence until owner ruling 1 of 2026-09-04
 * ("every question carries a visual") separated them. The drawings live in
 * `mcqFigures.ts`, keyed on the beat id, because a `moleculeId` can name one
 * molecule and several of these questions need a scheme or a comparison. This
 * file stays what it was: the words, the options and the authored `why` for
 * each, with the picture beside it rather than inside it. A NEW BEAT ADDED
 * HERE NEEDS AN ENTRY THERE, and test/mcqFigures.test.ts fails until it has
 * one.
 */

import type { McqBeat } from "../types";

/**
 * The four content areas this file covers, as the ids the pathway uses. Named
 * so a coverage test can say which node is missing rather than counting beats.
 */
export const MCQ_NODES: readonly string[] = Object.freeze([
  "u3-directing",
  "u1-kvt",
  "u9-kvt-enolate",
  "u3-nitro-red",
  "u10-nitro-red",
  "u11-acidity",
  "u3-blocking",
  "u7-protect",
  "u9-pka",
  "u3-sequencing",
]);

/* ------------------------------------------------------------------ */
/* Directing effects                                                    */
/* ------------------------------------------------------------------ */

const DIRECTING: readonly McqBeat[] = Object.freeze([
  {
    kind: "mcq",
    id: "mcq-directing-meet",
    node: "u3-directing",
    conceptIds: ["ewg_edg_rubric"],
    levels: [0],
    prompt: "Nitrate toluene, then pick where the new group mostly lands.",
    brief: "Methyl is an activator, and an activator feeds electron density into the ring.",
    diamonds: 5,
    correctOptionId: "op",
    options: [
      {
        id: "op",
        text: "Ortho and para",
        why: "Methyl pushes electron density into the ring, and the arenium cation it stabilises carries its positive charge at the ortho and para positions. Those are the positions that get attacked.",
      },
      {
        id: "meta",
        text: "Meta",
        why: "Meta is where the deactivators send an electrophile, so this is the pattern most substituents follow. Methyl is on the other side of that split: it activates, and activators direct ortho and para.",
      },
      {
        id: "methyl",
        text: "Onto the methyl group",
        why: "The methyl carbon has no pi system for the electrophile to reach. Substitution happens on the ring, and the methyl group's job is to decide which ring position, not to be the site.",
      },
    ],
  },
  {
    kind: "mcq",
    id: "mcq-directing-anisole",
    node: "u3-directing",
    conceptIds: ["ewg_edg_rubric", "resonance_delocalisation"],
    levels: [1],
    prompt: "Brominate anisole, then pick the positions the electrophile takes.",
    brief: "The OCH3 oxygen has a lone pair sitting next to the ring.",
    diamonds: 5,
    correctOptionId: "op",
    options: [
      {
        id: "meta",
        text: "Meta only",
        why: "Meta is the position the oxygen lone pair cannot reach. Draw the arenium forms and the positive charge never lands there, so meta gets no help and stays the slow position.",
        cause: "regiochemistry_contradicts_stability",
      },
      {
        id: "op",
        text: "Ortho and para",
        why: "The oxygen lone pair delocalises into the ring and puts extra density exactly at ortho and para. Anisole is one of the strongest activators for that reason.",
      },
      {
        id: "even",
        text: "All positions about evenly",
        why: "An even spread is what happens with no substituent at all. OCH3 changes the ring, and the arenium cation it stabilises is far lower in energy at two of the positions than at the third.",
      },
    ],
  },
  {
    kind: "mcq",
    id: "mcq-directing-halogen",
    node: "u3-directing",
    conceptIds: ["ewg_edg_rubric"],
    levels: [2],
    prompt: "Bromobenzene reacts slower than benzene. Pick the statement that gets bromine right.",
    brief: "Bromine is the one substituent where rate and direction disagree.",
    diamonds: 8,
    correctOptionId: "deact-op",
    options: [
      {
        id: "deact-meta",
        text: "Deactivating and meta directing",
        why: "Deactivating and meta directing do travel together for nitro and for a carbonyl, so this is the rule working as advertised. Bromine is the exception the exams keep coming back to: induction slows the ring down, and the lone pair still directs ortho and para.",
        cause: "regiochemistry_contradicts_stability",
      },
      {
        id: "act-op",
        text: "Activating and ortho para directing",
        why: "The direction is right. The rate is the other half: bromine is electronegative enough that it pulls more density out by induction than its lone pair puts back, so bromobenzene is slower than benzene.",
      },
      {
        id: "deact-op",
        text: "Deactivating and ortho para directing",
        why: "Two effects pulling opposite ways, and they answer different questions. Induction sets the rate and makes the ring slower. The lone pair sets the position and feeds ortho and para.",
      },
      {
        id: "act-meta",
        text: "Activating and meta directing",
        why: "Both halves are the other way round here, which usually means rate and position got answered by one rule. Bromine needs them answered separately: slower by induction, ortho and para by resonance.",
      },
    ],
  },
]);

/* ------------------------------------------------------------------ */
/* Kinetic against thermodynamic control                                */
/* ------------------------------------------------------------------ */

const KINETIC_VS_THERMO: readonly McqBeat[] = Object.freeze([
  {
    kind: "mcq",
    id: "mcq-kvt-cold",
    node: "u1-kvt",
    conceptIds: ["kinetic_vs_thermodynamic_control"],
    levels: [0],
    prompt: "Add HBr to 1,3-butadiene at minus 80 degrees, then pick the major product.",
    brief: "Cold means nothing has the energy to go back and choose a second time.",
    diamonds: 5,
    correctOptionId: "one-two",
    options: [
      {
        id: "one-two",
        text: "The 1,2 product",
        why: "Cold locks in whichever product forms fastest, and bromide is captured at the carbon closest to where the cation is born. That is the 1,2 product, and it is the kinetic one.",
      },
      {
        id: "one-four",
        text: "The 1,4 product",
        why: "The 1,4 product is the more stable one, and stability is what wins when the reaction can reverse. At minus 80 nothing reverses, so the faster route decides instead.",
        cause: "attacked_wrong_electrophilic_site",
      },
      {
        id: "even",
        text: "An even mix of both",
        why: "An even mix would mean the two routes cost the same. They do not: one end of the allylic cation is reached sooner, and at this temperature sooner is the whole story.",
      },
    ],
  },
  {
    kind: "mcq",
    id: "mcq-kvt-warm",
    node: "u1-kvt",
    conceptIds: ["kinetic_vs_thermodynamic_control"],
    levels: [1],
    prompt: "Warm that same flask to 40 degrees and leave it, then pick the major product.",
    brief: "Warm means the first product can go back to the cation and choose again.",
    diamonds: 5,
    correctOptionId: "one-four",
    options: [
      {
        id: "one-two",
        text: "The 1,2 product",
        why: "The 1,2 product is still the one that forms first. Warm gives it a way back to the allylic cation, and once a reaction can reverse the more stable product accumulates.",
        cause: "attacked_wrong_electrophilic_site",
      },
      {
        id: "one-four",
        text: "The 1,4 product",
        why: "Warming lets both products return to the allylic cation, so the mixture drifts toward the lower energy one. The 1,4 product has the more substituted alkene, which is why it wins the long game.",
      },
      {
        id: "same",
        text: "The same ratio as at minus 80",
        why: "The ratio at minus 80 records which route was faster. Warming changes the question being answered, from which forms first to which survives, and the two have different answers here.",
      },
    ],
  },
  {
    kind: "mcq",
    id: "mcq-kvt-statement",
    node: "u1-kvt",
    conceptIds: ["kinetic_vs_thermodynamic_control"],
    levels: [2],
    prompt: "Pick the true statement about the 1,4 product of HBr and butadiene.",
    diamonds: 8,
    correctOptionId: "stable",
    options: [
      {
        id: "faster",
        text: "It forms over the lower barrier",
        why: "The lower barrier belongs to the 1,2 product, which is why cold runs give it. The 1,4 product wins on depth rather than on speed.",
        cause: "attacked_wrong_electrophilic_site",
      },
      {
        id: "stable",
        text: "It is the more stable of the two",
        why: "Its alkene is the more substituted one, so it sits lower in energy. That is exactly why warming the reaction, which lets both products return to the cation, drifts the mixture toward it.",
      },
      {
        id: "first",
        text: "It wins because it forms first",
        why: "Forming first and being more stable are two different claims, and here they belong to different products. The 1,4 product is the stable one, and the 1,2 product is the fast one.",
        cause: "attacked_wrong_electrophilic_site",
      },
      {
        id: "only",
        text: "It is the only product that forms",
        why: "Both form at every temperature. Temperature moves the ratio rather than switching one of them off, which is what makes this pair such a clean test of the idea.",
      },
    ],
  },
  {
    kind: "mcq",
    id: "mcq-kvt-enolate-lda",
    node: "u9-kvt-enolate",
    conceptIds: ["kinetic_vs_thermodynamic_control"],
    levels: [2],
    prompt: "Treat 2-methylcyclohexanone with LDA at minus 78 degrees, then pick the enolate.",
    brief: "LDA is bulky, and minus 78 means the first deprotonation is the last one.",
    diamonds: 8,
    correctOptionId: "less",
    options: [
      {
        id: "less",
        text: "The less substituted enolate",
        why: "LDA is bulky and reaches the more exposed alpha proton first, and cold means nothing equilibrates afterwards. This is the same kinetic against thermodynamic split as the diene, two units later.",
      },
      {
        id: "more",
        text: "The more substituted enolate",
        why: "That is the enolate a smaller base at room temperature gives, because warm conditions let the proton move around until the more substituted enolate wins on stability. LDA and minus 78 ask the other question.",
        cause: "attacked_wrong_electrophilic_site",
      },
      {
        id: "mix",
        text: "An even mix of the two",
        why: "An even mix would mean the two alpha positions look the same to the base. A bulky amide base is exactly the tool that makes them look different, which is the reason LDA is specified.",
      },
      {
        id: "none",
        text: "No enolate forms",
        why: "LDA is far more basic than an alpha proton is acidic, so deprotonation is complete rather than borderline. The open question is which alpha proton goes, not whether one does.",
      },
    ],
  },
]);

/* ------------------------------------------------------------------ */
/* Nitro reduction                                                      */
/* ------------------------------------------------------------------ */

const NITRO_REDUCTION: readonly McqBeat[] = Object.freeze([
  {
    kind: "mcq",
    id: "mcq-nitro-meet",
    node: "u3-nitro-red",
    conceptIds: ["oxidation_state_ladder"],
    levels: [0],
    prompt: "Run nitrobenzene over hydrogen and palladium, then pick what comes out.",
    brief: "This is the step that turns a deactivated ring into a strongly activated one.",
    diamonds: 5,
    correctOptionId: "aniline",
    options: [
      {
        id: "phenol",
        text: "Phenol",
        why: "Phenol would mean the nitrogen left and an oxygen stayed. Reduction keeps the nitrogen and strips the oxygens off it, so the group that remains is NH2.",
      },
      {
        id: "aniline",
        text: "Aniline",
        why: "Hydrogen over palladium takes the nitro group all the way down to the amine in one operation. That flips the ring from strongly deactivated to strongly activated, which is why this step opens Unit 10.",
      },
      {
        id: "acid",
        text: "Benzoic acid",
        why: "Benzoic acid comes from oxidising a benzylic carbon, which is the opposite direction and a different position. Nothing here touches the ring carbons.",
      },
    ],
  },
  {
    kind: "mcq",
    id: "mcq-nitro-reagent",
    node: "u3-nitro-red",
    conceptIds: ["oxidation_state_ladder"],
    levels: [1],
    prompt: "Pick the reagent set that turns an aryl nitro group into an aryl amine.",
    brief: "Several reagent sets do this job, and they count as equivalent.",
    diamonds: 5,
    correctOptionId: "fe",
    options: [
      {
        id: "nabh4",
        text: "NaBH4 in methanol",
        why: "NaBH4 delivers hydride to a carbonyl carbon, and a nitro group is not a carbonyl. Nitro reduction is metal chemistry rather than hydride chemistry, which is why the reagent lists look so different.",
        cause: "route_requires_conditions_not_present",
      },
      {
        id: "pcc",
        text: "PCC in dichloromethane",
        why: "PCC is an oxidant, and this step needs to go down the ladder rather than up. The direction is the thing to check first on any reagent question like this one.",
        cause: "route_requires_conditions_not_present",
      },
      {
        id: "fe",
        text: "Fe with HCl",
        why: "Iron with acid is one of the accepted set, alongside hydrogen over palladium, tin with HCl, SnCl2 and zinc with HCl. Any of them takes the nitro group to the amine, so an exam key will accept whichever you write.",
      },
    ],
  },
  {
    kind: "mcq",
    id: "mcq-nitro-ring-effect",
    node: "u3-nitro-red",
    conceptIds: ["ewg_edg_rubric", "oxidation_state_ladder"],
    levels: [2],
    prompt: "Reduce the nitro group on nitrobenzene, then pick what the ring becomes.",
    brief: "Nitro is one of the strongest deactivators on the ladder. NH2 sits at the other end.",
    diamonds: 8,
    correctOptionId: "strong-act",
    options: [
      {
        id: "still-deact",
        text: "Still deactivated",
        why: "Nitrogen is electronegative, so expecting it to keep pulling is a fair read. The nitrogen in NH2 has a lone pair it can donate into the ring, and that donation beats its induction by a long way.",
        cause: "regiochemistry_contradicts_stability",
      },
      {
        id: "strong-act",
        text: "Strongly activated",
        why: "Losing the oxygens frees the nitrogen lone pair to delocalise into the ring, so the ring swings from one end of the ladder to the other. That swing is why this step is the bridge into Unit 10.",
      },
      {
        id: "weak-deact",
        text: "Weakly deactivated",
        why: "Weakly deactivated is where the halogens sit, where induction wins narrowly. An amine is on the donating side instead, and it is one of the strongest donors the course covers.",
      },
      {
        id: "unchanged",
        text: "Unchanged, since the ring never reacted",
        why: "The ring carbons are untouched, and that is not what activation measures. Activation is about how willing those carbons are to meet the next electrophile, and the group hanging off them sets it.",
      },
    ],
  },
  {
    kind: "mcq",
    id: "mcq-nitro-for-diazonium",
    node: "u10-nitro-red",
    conceptIds: ["oxidation_state_ladder"],
    levels: [1],
    prompt: "A diazonium salt needs an aryl amine first. Pick the step that supplies it.",
    brief: "The amine has to come from somewhere, and the ring started out as benzene.",
    diamonds: 5,
    correctOptionId: "reduce",
    options: [
      {
        id: "reduce",
        text: "Nitrate the ring, then reduce the nitro group",
        why: "Nitration is how nitrogen gets onto a ring at all, and reduction is how that nitrogen becomes an amine. This pair is the standard route into every diazonium problem.",
      },
      {
        id: "brominate",
        text: "Brominate the ring, then add ammonia",
        why: "An aryl bromide will not give up its halide to ammonia under normal conditions, because the ring has no strong ortho or para electron withdrawing group to make SNAr possible.",
        cause: "route_requires_conditions_not_present",
      },
      {
        id: "sulfonate",
        text: "Sulfonate the ring, then desulfonate",
        why: "Sulfonation and desulfonation is the blocking group trick, and it leaves the ring exactly as it found it. Useful for controlling position, and it never installs nitrogen.",
        cause: "route_requires_conditions_not_present",
      },
    ],
  },
  {
    kind: "mcq",
    id: "mcq-nitro-close",
    node: "u10-nitro-red",
    conceptIds: ["oxidation_state_ladder"],
    levels: [2],
    prompt: "Pick the reagent that takes an aryl nitro group down to the amine.",
    brief: "Three of these four are famous for a different job entirely.",
    diamonds: 8,
    correctOptionId: "sncl2",
    options: [
      {
        id: "mcpba",
        text: "mCPBA",
        why: "mCPBA delivers an oxygen to an alkene, which is oxidation and the wrong direction. Reading the direction off the reagent before reading the substrate saves a lot of these.",
        cause: "route_requires_conditions_not_present",
      },
      {
        id: "lialh4",
        text: "LiAlH4",
        why: "LiAlH4 is a strong reducing agent, so the direction is right, and it is a hydride source aimed at carbonyls and their relatives. Aryl nitro reduction is run with metal and acid or with hydrogen and a catalyst instead.",
        cause: "route_requires_conditions_not_present",
      },
      {
        id: "sncl2",
        text: "SnCl2",
        why: "Tin two chloride is a member of the accepted nitro reduction set with iron, tin, zinc and hydrogen over a metal catalyst. All of them get you to the amine.",
      },
      {
        id: "pcc",
        text: "PCC",
        why: "PCC oxidises a primary alcohol and stops at the aldehyde, which is a different substrate and the opposite direction. It has no path to an amine.",
        cause: "route_requires_conditions_not_present",
      },
    ],
  },
]);

/* ------------------------------------------------------------------ */
/* Phenol acidity                                                       */
/* ------------------------------------------------------------------ */

const PHENOL_ACIDITY: readonly McqBeat[] = Object.freeze([
  {
    kind: "mcq",
    id: "mcq-phenol-meet",
    node: "u11-acidity",
    conceptIds: ["conjugate_base_stability_argument"],
    levels: [0],
    prompt: "Compare phenol with cyclohexanol, then pick the more acidic one.",
    brief: "Both are an OH on a six membered ring. Only one of the rings is aromatic.",
    diamonds: 5,
    correctOptionId: "phenol",
    options: [
      {
        id: "phenol",
        text: "Phenol",
        why: "Phenol sits near pKa 10 and cyclohexanol near 16, which is six orders of magnitude. The gap comes from what happens after the proton leaves rather than from the OH bond itself.",
      },
      {
        id: "cyclohexanol",
        text: "Cyclohexanol",
        why: "Cyclohexanol looks like the ordinary alcohol and it is, which is the point of the comparison. Its alkoxide has nowhere to spread the charge, so it holds the proton far more tightly than phenol does.",
      },
      {
        id: "same",
        text: "They are about the same",
        why: "Same functional group, same ring size, and a six unit pKa gap. That gap is the reason this pair opens the phenol topic.",
      },
    ],
  },
  {
    kind: "mcq",
    id: "mcq-phenol-reason",
    node: "u11-acidity",
    conceptIds: ["conjugate_base_stability_argument", "resonance_delocalisation"],
    levels: [1],
    prompt: "Pick the reason phenol is the more acidic of that pair.",
    brief: "Argue from the conjugate base, which is the move this whole course keeps asking for.",
    diamonds: 5,
    correctOptionId: "delocalised",
    options: [
      {
        id: "weakbond",
        text: "Its O to H bond is weaker",
        why: "Bond strength is a reasonable place to look and it is not what moves here. The two O to H bonds are close, and the six unit gap opens up in the anion after the proton has already gone.",
      },
      {
        id: "delocalised",
        text: "Its conjugate base spreads into the ring",
        why: "Phenoxide puts the negative charge onto three ring carbons as well as the oxygen. A charge that is shared is a charge that is easier to make, and the acid that makes it is stronger.",
      },
      {
        id: "aromatic",
        text: "Phenol itself is aromatic",
        why: "Both phenol and phenoxide are aromatic, so aromaticity is present on both sides and cannot be what tips the balance. The argument has to name something the anion has that the acid does not.",
      },
    ],
  },
  {
    kind: "mcq",
    id: "mcq-phenol-substituted",
    node: "u11-acidity",
    conceptIds: ["conjugate_base_stability_argument", "ewg_edg_rubric"],
    levels: [2],
    prompt: "Pick the most acidic phenol of these four.",
    brief: "Decide first whether the group can reach the oxygen by resonance, then look at position.",
    diamonds: 8,
    correctOptionId: "para-nitro",
    options: [
      {
        id: "para-nitro",
        text: "4-nitrophenol",
        why: "From the para position the nitro group takes the negative charge right off the oxygen and onto its own oxygens by resonance. That is the strongest stabilisation on this list, and the pKa drops to about 7.",
      },
      {
        id: "meta-nitro",
        text: "3-nitrophenol",
        why: "Meta is the position resonance cannot reach, which is the instructor's own rubric on this topic. The nitro group still pulls by induction, so this is more acidic than plain phenol and less acidic than the para isomer.",
        cause: "regiochemistry_contradicts_stability",
      },
      {
        id: "para-methyl",
        text: "4-methylphenol",
        why: "Methyl donates rather than withdraws, so it pushes density onto an oxygen that is already carrying a negative charge. That makes the conjugate base less comfortable and the phenol slightly weaker than plain phenol.",
      },
      {
        id: "plain",
        text: "Phenol",
        why: "Plain phenol is the baseline the other three are measured against at about pKa 10. Two of the substituted ones sit below it and one sits above it.",
      },
    ],
  },
]);

/**
 * Everything above, in one list. The runner reads this; the groups above exist
 * so the file can be read a topic at a time.
 */
/* ------------------------------------------------------------------ */
/* Blocking group strategy                                              */
/*                                                                      */
/* The whole idea rests on one fact the student already met in the      */
/* sulfonation lesson: this is the EAS you can undo. Park a sulfonic    */
/* acid on the position you want to defend, do the chemistry that would */
/* otherwise go there, then steam it off.                               */
/* ------------------------------------------------------------------ */

const BLOCKING: readonly McqBeat[] = Object.freeze([
  {
    kind: "mcq",
    id: "mcq-blocking-why-sulfonate",
    node: "u3-blocking",
    conceptIds: ["ewg_edg_rubric"],
    levels: [0],
    prompt: "You want the para spot on toluene left empty. Pick the group to park there.",
    brief: "The point of a blocking group is that it does not have to stay.",
    diamonds: 5,
    correctOptionId: "sulfonic",
    options: [
      {
        id: "sulfonic",
        text: "A sulfonic acid, SO3H",
        why: "Sulfonation is the one electrophilic aromatic substitution that runs backwards. Hot dilute acid with steam takes the SO3H off again, so the group can hold a seat and then give it up. Nothing else on this list leaves.",
      },
      {
        id: "nitro",
        text: "A nitro group, NO2",
        why: "A nitro group would hold the position, but there is no gentle way to take it off the ring again. Reducing it gives an amine and leaves you with a different molecule, not the one you were protecting.",
      },
      {
        id: "acyl",
        text: "An acyl group",
        why: "The ketone from a Friedel Crafts is stuck there for good in this course, and it deactivates the ring on top of that. Useful chemistry, wrong job.",
      },
    ],
  },
  {
    kind: "mcq",
    id: "mcq-blocking-order",
    node: "u3-blocking",
    conceptIds: ["ewg_edg_rubric"],
    levels: [1],
    prompt: "Ortho bromination of toluene. Put the three steps in order.",
    brief: "One of these orders wastes the blocking group entirely.",
    diamonds: 6,
    correctOptionId: "block-first",
    options: [
      {
        id: "block-first",
        text: "Sulfonate, brominate, then steam it off",
        why: "The sulfonic acid takes the para seat first, so bromine has nowhere to go but ortho. Steam then removes it and leaves the ortho bromide you wanted. Block, react, unblock.",
      },
      {
        id: "brominate-first",
        text: "Brominate, sulfonate, then steam it off",
        why: "Bromine arriving first goes mostly para, because that is the seat it prefers when nothing is in the way. The blocking group is then defending a position that is already taken.",
      },
      {
        id: "no-unblock",
        text: "Sulfonate, then brominate, and stop",
        why: "The first two steps are right and the product is wrong: the sulfonic acid is still sitting on the ring. A blocking group that never comes off is just a substituent.",
      },
    ],
  },
]);

/* ------------------------------------------------------------------ */
/* Acetal as a protecting group                                         */
/*                                                                      */
/* The acetal lesson teaches how to make one. This node teaches WHY, and */
/* the why is a single sentence: it survives everything basic and comes  */
/* back off in aqueous acid.                                             */
/* ------------------------------------------------------------------ */

const ACETAL_PROTECTION: readonly McqBeat[] = Object.freeze([
  {
    kind: "mcq",
    id: "mcq-acetal-what-survives",
    node: "u7-protect",
    conceptIds: ["oxidation_state_ladder"],
    levels: [0],
    prompt: "A ketone is hidden as an acetal. Pick the reagent that leaves it alone.",
    brief: "An acetal has no carbonyl left for a nucleophile to attack.",
    diamonds: 5,
    correctOptionId: "grignard",
    options: [
      {
        id: "grignard",
        text: "A Grignard reagent",
        why: "The acetal carbon carries two single bonded oxygens and no pi bond, so there is nothing for a carbanion to add to. That is the entire point: the ketone becomes invisible to every nucleophile and hydride in the course.",
      },
      {
        id: "aqueous-acid",
        text: "Aqueous acid",
        why: "Aqueous acid is exactly what takes the acetal back OFF. Every step of the protection runs in reverse under it, which is how you get the ketone back at the end.",
      },
      {
        id: "water-heat",
        text: "Water with heat and a trace of acid",
        why: "Same problem: acetal formation is an equilibrium, and flooding it with water pushes the whole thing back toward the ketone. Acetals are made by REMOVING water and undone by adding it.",
      },
    ],
  },
  {
    kind: "mcq",
    id: "mcq-acetal-which-carbonyl",
    node: "u7-protect",
    conceptIds: ["oxidation_state_ladder"],
    levels: [1],
    prompt: "You want to reduce only the ester, not the ketone. Pick the first move.",
    brief: "Both react with hydride, and one of them reacts faster.",
    diamonds: 6,
    correctOptionId: "protect-ketone",
    options: [
      {
        id: "protect-ketone",
        text: "Protect the ketone as an acetal",
        why: "The ketone is the MORE reactive of the two toward hydride, so left alone it goes first. Hiding it behind an acetal lets LiAlH4 reach the ester, and aqueous acid brings the ketone back afterwards.",
      },
      {
        id: "protect-ester",
        text: "Protect the ester as an acetal",
        why: "Esters do not form acetals: the reaction needs a ketone or an aldehyde carbonyl. And the ester is the one you want to change, so protecting it would defeat the plan.",
      },
      {
        id: "just-add",
        text: "Add one equivalent of hydride and stop",
        why: "Counting equivalents does not choose between two groups. The hydride goes to the faster one, which is the ketone, so careful measuring gives you the wrong product in the right amount.",
      },
    ],
  },
]);

/* ------------------------------------------------------------------ */
/* Alpha-proton acidity                                                 */
/*                                                                      */
/* AUTHORED SO THE LESSON TEMPLATE HAS SOMETHING TO PLAY. The seven-slot */
/* ordering in ../template.ts was real code with no content that could   */
/* exercise it: every node in the product authored exactly one beat      */
/* KIND, so `planLesson` could never return more than one content step   */
/* and the recipe strip could never draw more than [content, reward].    */
/* The committed spec draws a SEVEN segment strip whose whole point is   */
/* that a lesson shows its composition up front, and a two segment strip */
/* shows nothing.                                                        */
/*                                                                       */
/* u9-pka, the alpha-proton pKa hierarchy, is the node where that is     */
/* fixed with real chemistry rather than with filler. It already carried */
/* a MATCH board (protons to pKa values) and the acidity SORT ladder is  */
/* about the same four rungs, so the node needed only its RECOGNISE      */
/* entry to play four of the seven slots: recognise, connect, order and  */
/* reward, with recycle appearing when a miss earns it. See              */
/* ../template.ts's LADDER_FOR_NODE for the other half of this.          */
/*                                                                       */
/* THE CHEMISTRY IS THE COURSE'S OWN. docs/COURSE-OUTLINE-ORGO2.md puts  */
/* enolates on the exam-weighted spine, and the three questions here are */
/* the three things a student has to hold to use one: which C-H comes    */
/* off, why a second carbonyl moves it ten orders of magnitude, and why  */
/* hydroxide gives an equilibrium where LDA gives a quantitative         */
/* enolate. Nothing here is a restatement of the other two beats on the  */
/* node: the match board asks for VALUES and the ladder asks for an      */
/* ORDER, so these ask for the reason.                                   */
/* ------------------------------------------------------------------ */

const ALPHA_ACIDITY: readonly McqBeat[] = Object.freeze([
  {
    kind: "mcq",
    id: "mcq-pka-alpha-meet",
    node: "u9-pka",
    conceptIds: ["pka_keq_viability"],
    levels: [0],
    prompt: "Pick the C-H a base takes off butan-2-one first.",
    brief: "The carbon next to a carbonyl is the one whose charge has somewhere to go.",
    diamonds: 5,
    correctOptionId: "alpha",
    options: [
      {
        id: "far",
        text: "The C-H at the far end of the chain",
        why: "That carbon is one bond too far. Take a proton off there and the charge is stuck on carbon with no carbonyl to lean on, which is about twenty orders of magnitude harder than the alpha position next door.",
      },
      {
        id: "alpha",
        text: "A C-H next to the carbonyl",
        why: "Exactly the one. The charge left behind sits next to the carbonyl, so it slides onto the oxygen and the anion becomes an enolate. That delocalisation is the whole reason alpha protons are the acidic ones.",
      },
      {
        id: "same",
        text: "Any C-H, they are all about the same",
        why: "They look alike on paper and they are far apart in practice. An alpha C-H sits near pKa 20 and an ordinary alkane C-H near pKa 50, and the difference is entirely about where the charge goes afterwards.",
      },
    ],
  },
  {
    kind: "mcq",
    id: "mcq-pka-between",
    node: "u9-pka",
    conceptIds: ["pka_keq_viability", "conjugate_base_stability_argument"],
    levels: [1],
    prompt: "Pick the alpha C-H that comes off more easily.",
    brief: "One of these two carbons sits between two carbonyls.",
    diamonds: 6,
    correctOptionId: "between",
    options: [
      {
        id: "between",
        text: "The one between two carbonyls",
        why: "Two carbonyls means two oxygens for the charge to spread onto instead of one, and that is worth roughly ten orders of magnitude. It is why a beta-dicarbonyl deprotonates with a base as mild as ethoxide.",
      },
      {
        id: "single",
        text: "The one next to a single carbonyl",
        why: "This one is genuinely acidic for a C-H, near pKa 20, so the instinct is sound. Put a second carbonyl on the other side and the same charge has twice as many places to sit, which wins.",
      },
      {
        id: "equal",
        text: "They come off about equally",
        why: "Counting alpha positions makes them look level. Count the OXYGENS the charge reaches instead: one on the ketone, two on the dicarbonyl, and the ladder falls out of that.",
      },
    ],
  },
  {
    kind: "mcq",
    id: "mcq-pka-base-choice",
    node: "u9-pka",
    conceptIds: ["pka_keq_viability"],
    levels: [2],
    prompt: "Pick the base that takes an alpha proton off for good.",
    brief: "A base deprotonates fully when its own conjugate acid is the far weaker one.",
    diamonds: 8,
    correctOptionId: "lda",
    options: [
      {
        id: "hydroxide",
        text: "Hydroxide, conjugate acid near pKa 16",
        why: "Water at pKa 16 against an alpha C-H near pKa 20 leaves the equilibrium sitting on the ketone, so you get a trace of enolate and a lot of starting material. Aldol runs on exactly that trace.",
      },
      {
        id: "ethoxide",
        text: "Ethoxide, conjugate acid near pKa 16",
        why: "Ethanol lands in the same place as water, so this is the same equilibrium wearing a different solvent. It is the right call for a Claisen, where the trace is all you need, and the wrong one when you want the enolate quantitatively.",
      },
      {
        id: "lda",
        text: "LDA, conjugate acid near pKa 36",
        why: "Sixteen pKa units of headroom, and the equilibrium goes one way and stays there. LDA is also too bulky to add to the carbonyl, which is the other half of why it is the reagent for a clean enolate.",
      },
    ],
  },
]);

/* ------------------------------------------------------------------ */
/* Multistep sequencing                                                 */
/*                                                                      */
/* THE RECOGNISE RUNG ON u3-sequencing, and the second half of the      */
/* content work that lets the seven-slot template be seen at all. The   */
/* node already carried three SYNTHESIS gaps, which is the produce      */
/* slot, and match/boards.ts now gives it the connect slot, so with     */
/* these two it plays recognise, connect, produce and reward, plus      */
/* recycle when a miss earns it. Before this the longest recipe strip   */
/* any lesson in the product could draw was two segments.               */
/*                                                                      */
/* THE TWO QUESTIONS ARE THE TWO HALVES OF SEQUENCING that              */
/* docs/COURSE-OUTLINE-ORGO2.md weights: which group goes on first,     */
/* because the first one directs the second, and why sulfonation is the */
/* one reagent in the set you can take back off. Neither restates the   */
/* match board, which asks what each reagent DOES rather than when.     */
/*                                                                      */
/* BOTH SERVE L1, AND THAT IS NOT DECORATION. The lesson plan asks      */
/* whether a node has ANY mcq beat, by design (../template.ts records   */
/* why: filtering by rung there would make the pathway show a real      */
/* lesson as queued forever). The RUNNER then picks a beat at the rung  */
/* it was given, and a node whose only mcq beats sit at L0 and L2 plans */
/* a recognise step the runner cannot serve, so the whole lesson stops  */
/* on "nothing here yet" before the match board and the synthesis gaps  */
/* behind it ever play. Measured on this node at level 1 before these   */
/* levels were widened. It is a latent seam between the plan and the    */
/* runner rather than a fault in this content, and it is reported as    */
/* one; the content is authored so it does not trip on it.              */
/* ------------------------------------------------------------------ */

const SEQUENCING: readonly McqBeat[] = Object.freeze([
  {
    kind: "mcq",
    id: "mcq-sequencing-order",
    node: "u3-sequencing",
    conceptIds: ["ewg_edg_rubric"],
    levels: [0, 1],
    prompt: "Pick the order that ends with the two groups meta.",
    brief: "Whichever group lands first is the one that decides where the second one goes.",
    diamonds: 6,
    correctOptionId: "nitrate-first",
    options: [
      {
        id: "nitrate-first",
        text: "Nitrate first, then alkylate",
        why: "Nitro is a meta director, so once it is on the ring it sends the next electrophile to meta and the target falls out. Order is the whole answer here, and this is the order that gives it.",
      },
      {
        id: "alkylate-first",
        text: "Alkylate first, then nitrate",
        why: "Both steps are real and both work, so this reads fine until you ask where the second group lands. Methyl is an ortho and para director, so nitrating after it gives the ortho and para product rather than the meta one.",
      },
      {
        id: "either",
        text: "Either order, the product is the same",
        why: "The two groups are the same two groups, which is what makes this tempting. What changes is the ring they arrive at: the second electrophile meets a ring the first group has already committed to a pattern.",
      },
    ],
  },
  {
    kind: "mcq",
    id: "mcq-sequencing-blocker",
    node: "u3-sequencing",
    conceptIds: ["ewg_edg_rubric"],
    levels: [1, 2],
    prompt: "Pick what makes sulfonation useful as a blocking group.",
    brief: "The other reagents in this unit all leave something on the ring for good.",
    diamonds: 8,
    correctOptionId: "reversible",
    options: [
      {
        id: "fastest",
        text: "It is the fastest of the reactions",
        why: "Rate is not what a blocker is chosen for. A blocker is chosen for what happens at the END of the sequence, and the useful property is that this one can be undone.",
      },
      {
        id: "gentlest",
        text: "It deactivates the ring the least",
        why: "A sulfonic acid is a strong deactivator, so this is the opposite of true, and that deactivation is part of the plan: it also stops the ring reacting twice while the blocker sits there.",
      },
      {
        id: "reversible",
        text: "It is reversible, so the blocker comes off",
        why: "Hot dilute acid runs the sulfonation backwards and the ring comes out clean. Park it on the para position, force the next step to ortho, then take it away: that whole strategy rests on this one property.",
      },
    ],
  },
]);

export const MCQ_BEATS: readonly McqBeat[] = Object.freeze([
  ...DIRECTING,
  ...KINETIC_VS_THERMO,
  ...NITRO_REDUCTION,
  ...PHENOL_ACIDITY,
  ...BLOCKING,
  ...ACETAL_PROTECTION,
  ...ALPHA_ACIDITY,
  ...SEQUENCING,
]);

/** Every beat authored for one pathway node, in authored order. */
export function mcqBeatsForNode(node: string): readonly McqBeat[] {
  return MCQ_BEATS.filter((beat) => beat.node === node);
}

/** Look one up by id. Null rather than a throw: a stale id is a miss, not a crash. */
export function mcqBeatById(id: string): McqBeat | null {
  return MCQ_BEATS.find((beat) => beat.id === id) ?? null;
}
