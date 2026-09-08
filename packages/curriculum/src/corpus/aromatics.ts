/**
 * Aromaticity, phenol acidity, and electrophilic aromatic substitution with its
 * directing effects. Act 1, late, and the heaviest weighted block on the exam.
 *
 * WHY PHENOLS COME BEFORE AROMATICITY IN THE PATHWAY AND AFTER IT IN THIS FILE.
 * `docs/COURSE-OUTLINE-ORGO2.md` D3 records the delivered order: phenol acidity is
 * taught in the benzene lecture, before aromaticity and before EAS, because its
 * job in this course is to be the site where the electron withdrawing and
 * electron donating rubric gets built. That rubric is then reused unchanged for
 * directing effects. The file groups by topic for reading; `placement.ts` carries
 * the order.
 *
 * THE RUBRIC IS ONE IDEA ASSESSED IN THREE PLACES. Decide whether a substituent
 * acts by resonance or by induction, then order by position, and remember that a
 * meta substituent cannot reach the site by resonance at all. Two of the
 * distractors below are the same error wearing different costumes: resonance and
 * induction conflated on a phenol, and then again on a halogenated ring.
 *
 * MO DIAGRAM CONSTRUCTION IS DELIBERATELY ABSENT. The outline defers it as a
 * capability gap, since a pi ladder with labelled node counts is neither a
 * molecule nor a mechanism and needs a bespoke answer shape. The Huckel count
 * below is the part of that material the numeric shape can carry honestly.
 */

import { createMultipleChoiceAnswer } from "../answers/choice.js";
import { createNumericAnswer } from "../answers/numeric.js";
import { createReagentsAnswer } from "../answers/reagents.js";
import { createProblem, type Problem } from "../problem.js";

export const AROMATIC_PROBLEMS: readonly Problem[] = Object.freeze([
  // ------------------------------------------------------------- aromaticity

  createProblem({
    id: "org2-aromaticity-huckel-n",
    course: "orgo_2",
    topic: "aromaticity",
    difficulty: 800,
    prompt:
      "A planar cyclic compound has a p orbital on every ring atom and 18 electrons in its pi " +
      "system. Huckel's rule is written as 4n plus 2. What value of n does 18 correspond to?",
    answer: createNumericAnswer({
      text: "4",
      sigFigPolicy: "ignore",
      // n is an integer by definition and a fractional n is the tell that the
      // count was wrong, so the window stays well inside one unit.
      tolerance: { kind: "absolute", value: 0.25 },
    }),
    solution: {
      whatHappened: "n is 4, because 4 times 4 plus 2 is 18.",
      why:
        "The rule is a test rather than a formula to be evaluated: an electron count is aromatic " +
        "when some WHOLE NUMBER n satisfies it. Solving 4n plus 2 equals 18 gives n equal to 4, and " +
        "4 is a whole number, so the count passes. This is why the course asks for n explicitly " +
        "rather than for a yes or no.",
      lookAt:
        "Subtract the 2 first and then divide by 4. A result that is not a whole number is the " +
        "signal that the count fails the rule.",
    },
    distractors: [
      {
        id: "reported-the-electron-count",
        state: { kind: "numeric", text: "18", unit: null },
        explanation: {
          whatHappened: "This reports the pi electron count itself rather than the n that produces it.",
          why:
            "The count and n are different quantities and the whole point of the expression is the " +
            "conversion between them. Benzene has 6 pi electrons and n equal to 1, and naphthalene " +
            "has 10 and n equal to 2, so the two numbers are never the same.",
          lookAt:
            "Check the answer by substituting it back. Putting 18 in for n gives 74 electrons, which " +
            "is not the count in the question.",
        },
      },
      {
        id: "divided-without-subtracting",
        state: { kind: "numeric", text: "4.5", unit: null },
        explanation: {
          whatHappened: "This divides 18 by 4 with the plus 2 left out of the expression.",
          why:
            "The plus 2 is the pair of electrons in the single lowest pi orbital, which is " +
            "unpaired with any partner. Above it the orbitals come in degenerate pairs holding four " +
            "electrons each, which is where the 4n comes from. Leaving the 2 out leaves that first " +
            "orbital out.",
          lookAt:
            "Treat a fractional n as a signal to recheck the arithmetic rather than a result. " +
            "Subtract the 2, then divide.",
        },
      },
    ],
    tags: ["huckel", "electron-count"],
  }),

  createProblem({
    id: "org2-aromaticity-three-way-classification",
    course: "orgo_2",
    topic: "aromaticity",
    difficulty: 1050,
    prompt:
      "Cyclobutadiene is cyclic, has a p orbital on every carbon, and is planar in its square " +
      "geometry, with 4 electrons in the pi system. Classify it.",
    answer: createMultipleChoiceAnswer({
      options: [
        { id: "antiaromatic", text: "Antiaromatic" },
        { id: "aromatic", text: "Aromatic" },
        { id: "non-aromatic", text: "Non-aromatic" },
        {
          id: "aromatic-alternating",
          text: "Aromatic, because the single and double bonds alternate around the ring",
        },
      ],
      correctOptionId: "antiaromatic",
    }),
    solution: {
      whatHappened: "Antiaromatic. It meets every geometric requirement and has the wrong electron count.",
      why:
        "Cyclic, conjugated and planar are the three requirements that let a ring have a continuous " +
        "pi system at all, and cyclobutadiene meets all three. The count then decides which way that " +
        "system cuts. Four electrons is 4n rather than 4n plus 2, which leaves two electrons alone " +
        "in two degenerate non bonding orbitals and makes the delocalised arrangement worse than a " +
        "localised one. That destabilisation is what the word antiaromatic names, and it is why the " +
        "molecule distorts to a rectangle and dimerises above about minus 200 degrees.",
      lookAt:
        "Run the requirements as a gate and the count as the verdict. Failing a requirement gives " +
        "non-aromatic, and passing them all sends the answer to one of the other two.",
    },
    distractors: [
      {
        id: "collapsed-to-aromatic",
        state: { kind: "multiple_choice", optionId: "aromatic" },
        explanation: {
          whatHappened: "This reports aromatic on a ring that meets the geometry and fails the count.",
          why:
            "Meeting the geometric requirements is what gets a ring into the comparison; the " +
            "electron count is what decides which side of it the ring lands on. Four is 4n with n " +
            "equal to 1, so there is no whole number that makes 4 equal 4n plus 2, and the ring falls " +
            "on the destabilised side.",
          lookAt:
            "Solve 4n plus 2 equals 4 and look at what n comes out as. Half is not a whole number, " +
            "which is the tell.",
        },
      },
      {
        id: "collapsed-to-two-way",
        state: { kind: "multiple_choice", optionId: "non-aromatic" },
        explanation: {
          whatHappened:
            "This uses non-aromatic as the label for anything that is not aromatic, which collapses a three way classification into two.",
          why:
            "Non-aromatic means the ring has no continuous pi system to speak of, usually because " +
            "some atom is sp3 or the ring cannot be planar, so delocalisation simply does not apply " +
            "and the molecule is neither helped nor hurt. Cyclobutadiene does have the continuous " +
            "system and is actively destabilised by it, which is a stronger and different claim.",
          lookAt:
            "Ask whether the ring is unaffected by delocalisation or actively harmed by it. " +
            "Unaffected is non-aromatic and harmed is antiaromatic.",
        },
      },
      {
        id: "alternation-read-as-aromatic",
        state: { kind: "multiple_choice", optionId: "aromatic-alternating" },
        explanation: {
          whatHappened: "This uses alternating single and double bonds as the test for aromaticity.",
          why:
            "Alternation is how a conjugated ring is drawn and it says nothing about the electron " +
            "count, which is the part that decides the outcome. Cyclobutadiene and benzene are both " +
            "drawn with alternating bonds and they land on opposite sides of the classification.",
          lookAt:
            "Use the drawing to confirm conjugation, then count the pi electrons separately. The " +
            "count is the step the drawing cannot do.",
        },
      },
    ],
    tags: ["aromaticity", "three-way-classification", "antiaromatic"],
  }),

  createProblem({
    id: "org2-aromaticity-lone-pair-bookkeeping",
    course: "orgo_2",
    topic: "aromaticity",
    difficulty: 1400,
    prompt:
      "Pyridine is a six membered aromatic ring with one nitrogen, and that nitrogen carries a lone " +
      "pair. Which statement describes the lone pair and the ring's pi electron count correctly?",
    answer: createMultipleChoiceAnswer({
      options: [
        {
          id: "sp2-in-plane-six",
          text: "The lone pair sits in an sp2 orbital in the ring plane and is not counted; the ring has 6 pi electrons",
        },
        {
          id: "counted-eight",
          text: "The lone pair joins the pi system, giving the ring 8 pi electrons",
        },
        {
          id: "pyrrole-bookkeeping",
          text: "The lone pair joins the pi system and the nitrogen contributes no double bond, giving 6 pi electrons",
        },
        {
          id: "in-plane-four",
          text: "The lone pair sits in the ring plane and is not counted, leaving the ring with 4 pi electrons",
        },
      ],
      correctOptionId: "sp2-in-plane-six",
    }),
    solution: {
      whatHappened:
        "The lone pair stays out of the pi system, in an sp2 orbital pointing away from the ring, " +
        "and the ring's 6 pi electrons all come from its three double bonds.",
      why:
        "The nitrogen already contributes one electron to a pi bond through its p orbital, and an " +
        "atom has only one p orbital perpendicular to the ring. The lone pair therefore has to " +
        "occupy one of the sp2 hybrids in the plane, at right angles to the pi system and unable to " +
        "overlap with it. This is exactly why pyridine is basic at nitrogen while pyrrole is not: " +
        "pyridine's pair is available and pyrrole's is spent on the ring.",
      lookAt:
        "For each heteroatom, ask whether it is already part of a ring double bond. If it is, its " +
        "lone pair is in the plane and is not counted.",
    },
    distractors: [
      {
        id: "lone-pair-counted-as-well",
        state: { kind: "multiple_choice", optionId: "counted-eight" },
        explanation: {
          whatHappened:
            "This counts the three double bonds and the lone pair together, giving eight pi electrons.",
          why:
            "That would need two orbitals perpendicular to the ring on the same nitrogen, one for " +
            "the pi bond and one for the pair, and an sp2 atom has only one. Eight is also 4n rather " +
            "than 4n plus 2, so this reading would make pyridine antiaromatic, which does not match " +
            "a molecule that is stable, flat and behaves like benzene.",
          lookAt:
            "Count the perpendicular p orbitals available on the atom before counting electrons into " +
            "them. One p orbital carries at most one contribution.",
        },
      },
      {
        id: "pyrrole-rules-applied",
        state: { kind: "multiple_choice", optionId: "pyrrole-bookkeeping" },
        explanation: {
          whatHappened:
            "This applies pyrrole's bookkeeping to pyridine: the lone pair in the pi system and the nitrogen holding no double bond.",
          why:
            "It is the right description of a different molecule. In pyrrole the nitrogen has no ring " +
            "double bond, so its p orbital is free and the lone pair goes into it, and that pair is " +
            "two of the six. In pyridine the nitrogen is part of a double bond already, so its p " +
            "orbital is occupied and the pair has nowhere to go but the plane.",
          lookAt:
            "Draw the two rings side by side and mark which nitrogen is part of a double bond. That " +
            "one difference drives every other difference between them.",
        },
      },
      {
        id: "double-bond-miscounted",
        state: { kind: "multiple_choice", optionId: "in-plane-four" },
        explanation: {
          whatHappened:
            "The lone pair is placed correctly in the plane and the ring's double bonds are then counted as two rather than three.",
          why:
            "The first half is exactly right. A six membered ring with alternating bonds carries " +
            "three double bonds and each contributes two pi electrons, giving six. Four electrons " +
            "would also make the ring antiaromatic, which contradicts everything else known about " +
            "pyridine.",
          lookAt:
            "Count the double bonds around the ring on the drawing and multiply by two. Six carbons " +
            "or five carbons and a nitrogen both come to three double bonds.",
        },
      },
    ],
    tags: ["aromaticity", "lone-pair-bookkeeping", "heteroaromatic"],
  }),

  // ----------------------------------------------------------------- phenols

  createProblem({
    id: "org2-phenol-vs-alcohol-acidity",
    course: "orgo_2",
    topic: "phenols",
    difficulty: 850,
    prompt:
      "Phenol has a pKa near 10 and cyclohexanol near 16, so phenol is about a million times the " +
      "stronger acid. Which statement explains the gap?",
    answer: createMultipleChoiceAnswer({
      options: [
        {
          id: "phenoxide-delocalised",
          text: "The phenoxide's negative charge is delocalised into the ring, which cyclohexoxide cannot do",
        },
        {
          id: "weaker-oh-bond",
          text: "The O-H bond in phenol is weaker, because the ring pulls on it and makes the acid itself less stable",
        },
        {
          id: "ring-donates-to-oxygen",
          text: "The ring donates electron density onto the oxygen, which stabilises phenol as an acid",
        },
        {
          id: "solubility",
          text: "Phenol dissolves more readily in water, so more of it ionises",
        },
      ],
      correctOptionId: "phenoxide-delocalised",
    }),
    solution: {
      whatHappened:
        "The phenoxide is the stabilised species. Its charge spreads into the ring and reaches the " +
        "two ortho carbons and the para carbon.",
      why:
        "Acidity is decided by how comfortable the CONJUGATE BASE is, because that is the species " +
        "the equilibrium has to produce. Phenoxide's oxygen lone pair conjugates into the pi system, " +
        "so contributors exist with the charge on ring carbons and the negative charge is shared " +
        "across four atoms. Cyclohexoxide has an sp3 ring with no pi system, so its charge stays on " +
        "one oxygen.",
      lookAt:
        "Draw the conjugate base of each acid and count how many atoms carry the charge. That count " +
        "is the argument, and the exams ask for those structures explicitly.",
    },
    distractors: [
      {
        id: "argued-from-the-acid",
        state: { kind: "multiple_choice", optionId: "weaker-oh-bond" },
        explanation: {
          whatHappened:
            "This argues from the acid rather than from the conjugate base, making phenol less stable rather than phenoxide more stable.",
          why:
            "Both sides of the equilibrium matter and only one of them is where the difference " +
            "lives. Phenol and cyclohexanol are both ordinary stable molecules with ordinary O-H " +
            "bonds, and it is their anions that are six orders of magnitude apart in comfort. This " +
            "is the course's standing rule: argue from the product of the deprotonation.",
          lookAt:
            "Write the equilibrium out with both species on both sides, then ask which of the four " +
            "is unusual. It is the phenoxide.",
        },
      },
      {
        id: "direction-reversed",
        state: { kind: "multiple_choice", optionId: "ring-donates-to-oxygen" },
        explanation: {
          whatHappened: "This has electron density flowing from the ring onto the oxygen.",
          why:
            "It runs the right idea backwards on both counts. In the anion the charge flows FROM the " +
            "oxygen INTO the ring, which is what spreads it out, and what gets stabilised is the " +
            "conjugate base rather than the acid. Pushing more electron density onto an oxygen that " +
            "already carries a negative charge would destabilise it.",
          lookAt:
            "Follow the arrows in the phenoxide contributors and note which atom they start on. They " +
            "start on the oxygen and end in the ring.",
        },
      },
      {
        id: "solubility-argument",
        state: { kind: "multiple_choice", optionId: "solubility" },
        explanation: {
          whatHappened: "This makes solubility the cause of the acidity difference.",
          why:
            "Acidity is a position of equilibrium between dissolved species, so how much of a " +
            "compound dissolves changes how much acid is present rather than how strong it is. The " +
            "pKa gap here is measured on dissolved molecules in both cases, and phenol and " +
            "cyclohexanol have broadly similar water solubility in any case.",
          lookAt:
            "Separate how much acid is present from how far each molecule ionises. pKa reports only " +
            "the second.",
        },
      },
    ],
    tags: ["phenol", "conjugate-base-stability"],
  }),

  createProblem({
    id: "org2-phenol-substituent-ranking",
    course: "orgo_2",
    topic: "phenols",
    difficulty: 1350,
    prompt:
      "Rank 4-nitrophenol, 3-nitrophenol and phenol itself from MOST acidic to LEAST acidic. Which " +
      "ordering is right?",
    answer: createMultipleChoiceAnswer({
      options: [
        { id: "para-meta-plain", text: "4-Nitrophenol, 3-nitrophenol, phenol" },
        { id: "meta-para-plain", text: "3-Nitrophenol, 4-nitrophenol, phenol" },
        { id: "plain-meta-para", text: "Phenol, 3-nitrophenol, 4-nitrophenol" },
        { id: "para-plain-meta", text: "4-Nitrophenol, phenol, 3-nitrophenol" },
      ],
      correctOptionId: "para-meta-plain",
    }),
    solution: {
      whatHappened:
        "4-Nitrophenol first at a pKa near 7.2, then 3-nitrophenol near 8.4, then phenol near 10.",
      why:
        "The rubric is two questions in order. First, does the substituent act by resonance or only " +
        "by induction. A nitro group can do both, and reaching the phenoxide oxygen by resonance " +
        "needs the substituent ortho or para to it. From the para position the nitro group takes the " +
        "negative charge right onto its own oxygens, which is a large stabilisation. From the meta " +
        "position no contributor puts charge on the substituted carbon, so only induction through " +
        "the sigma bonds is left, and that is real but smaller. Phenol has neither.",
      lookAt:
        "Draw the phenoxide contributors and mark which ring carbons carry the negative charge. The " +
        "ortho and para carbons do, and the meta carbons never do.",
    },
    distractors: [
      {
        id: "position-ignored",
        state: { kind: "multiple_choice", optionId: "meta-para-plain" },
        explanation: {
          whatHappened:
            "Both nitro compounds are placed ahead of phenol correctly and the two positions are ordered the wrong way round.",
          why:
            "The substituent is the same in both, so the whole difference is which carbon it sits " +
            "on. From para it participates in the delocalisation of the charge and from meta it can " +
            "only pull through the sigma framework. Resonance withdrawal beats inductive withdrawal " +
            "here by a bit more than a full pKa unit.",
          lookAt:
            "Run the rubric's second step explicitly rather than treating the group as a fixed " +
            "amount of pull. Position is half the answer.",
        },
      },
      {
        id: "electronics-reversed",
        state: { kind: "multiple_choice", optionId: "plain-meta-para" },
        explanation: {
          whatHappened: "This reverses the whole ordering, treating the nitro group as electron donating.",
          why:
            "A nitro group has a positive nitrogen bonded to two oxygens and is one of the strongest " +
            "electron withdrawing groups in the course. Withdrawing density from a ring that has to " +
            "carry a negative charge helps that charge, so a nitro group always raises acidity. " +
            "Reversing the ordering makes phenol the strongest acid of the three, which the numbers " +
            "contradict.",
          lookAt:
            "Classify the substituent as donating or withdrawing before ranking anything. Nitro " +
            "withdraws by both mechanisms available to it.",
        },
      },
      {
        id: "meta-treated-as-donating",
        state: { kind: "multiple_choice", optionId: "para-plain-meta" },
        explanation: {
          whatHappened:
            "The para compound is placed correctly and the meta compound is put below phenol, as though a meta nitro group helped the acid rather than hurting it.",
          why:
            "Not reaching by resonance is not the same as having no effect. A meta nitro group still " +
            "pulls electron density through the sigma bonds, and that inductive withdrawal stabilises " +
            "the phenoxide by about one and a half pKa units against plain phenol. Meta means weaker " +
            "than para, not zero and not reversed.",
          lookAt:
            "Keep the two channels separate when scoring a substituent. Resonance is switched off at " +
            "meta, and induction is always on.",
        },
      },
    ],
    tags: ["phenol", "ewg-edg-rubric", "resonance-vs-induction"],
  }),

  // ---------------------------------------------------- aromatic substitution

  createProblem({
    id: "org2-eas-arenium-intermediate",
    course: "orgo_2",
    topic: "aromatic_substitution",
    difficulty: 800,
    prompt:
      "Benzene is treated with bromine and iron tribromide. Immediately after the ring's pi " +
      "electrons attack the electrophile, what happens?",
    answer: createMultipleChoiceAnswer({
      options: [
        {
          id: "arenium-then-deprotonate",
          text: "A positively charged arenium ion forms, aromaticity is lost for a moment, and a base removes the proton from the attacked carbon to restore it",
        },
        {
          id: "addition-product",
          text: "Bromide adds to the neighbouring carbon, giving a dibromide across what was a double bond",
        },
        {
          id: "concerted-swap",
          text: "The ring stays aromatic throughout and the bromine swaps places with a hydrogen in one step",
        },
      ],
      correctOptionId: "arenium-then-deprotonate",
    }),
    solution: {
      whatHappened:
        "An arenium ion forms, the ring is briefly not aromatic, and losing a proton from the " +
        "attacked carbon brings the aromaticity back.",
      why:
        "The attacked carbon becomes sp3 and now holds both a hydrogen and the new bromine, which " +
        "breaks the continuous pi system. The positive charge that is left is spread over the other " +
        "three carbons. That intermediate is uphill, and the way back down is to remove the hydrogen " +
        "from the sp3 carbon, which restores the ring. Removing the bromine instead would also " +
        "restore it, which is why the reaction needs a good electrophile and a base to finish.",
      lookAt:
        "Look at the attacked carbon in the intermediate and count what is attached. Two " +
        "substituents plus two ring bonds means sp3, and sp3 in the ring means no aromaticity.",
    },
    distractors: [
      {
        id: "addition-not-substitution",
        state: { kind: "multiple_choice", optionId: "addition-product" },
        explanation: {
          whatHappened:
            "This has bromide capture the cation, which is what happens when bromine meets an ordinary alkene.",
          why:
            "Capturing the cation would leave a permanently sp3 carbon and a ring that is no longer " +
            "aromatic, which costs roughly 150 kilojoules per mole. Losing a proton costs nothing " +
            "and gives that stabilisation back, so substitution wins. This is the single difference " +
            "between how a benzene ring and an alkene react with the same electrophile.",
          lookAt:
            "Compare the two possible endings from the shared cation. One keeps the aromatic ring " +
            "and one spends it.",
        },
      },
      {
        id: "no-intermediate",
        state: { kind: "multiple_choice", optionId: "concerted-swap" },
        explanation: {
          whatHappened: "This has the substitution happen in one step with the ring never leaving aromaticity.",
          why:
            "If nothing ever broke the aromatic system there would be no energy barrier to speak of " +
            "and benzene would react with weak electrophiles, which it does not. The arenium " +
            "intermediate is what makes the reaction slow, what makes a Lewis acid catalyst " +
            "necessary, and what carries the positive charge that every directing effect argument " +
            "is about.",
          lookAt:
            "Follow the charge. Directing effects are arguments about where the arenium ion's " +
            "positive charge sits, so there has to be an arenium ion for them to be about.",
        },
      },
    ],
    tags: ["eas", "arenium-ion"],
  }),

  // ---------------------------------------------------- eas directing effects

  createProblem({
    id: "org2-eas-meta-director",
    course: "orgo_2",
    topic: "eas_directing_effects",
    difficulty: 900,
    prompt:
      "A benzene ring already carries one substituent. Which of these sends an incoming electrophile " +
      "to the meta position?",
    answer: createMultipleChoiceAnswer({
      options: [
        { id: "nitro", text: "A nitro group" },
        { id: "methoxy", text: "A methoxy group" },
        { id: "methyl", text: "A methyl group" },
        { id: "bromo", text: "A bromine" },
      ],
      correctOptionId: "nitro",
    }),
    solution: {
      whatHappened: "The nitro group. It is the meta director of the four.",
      why:
        "A nitro group has a positive nitrogen attached to the ring and no lone pair it can donate, " +
        "so it withdraws by both induction and resonance. Attack at the ortho or para position " +
        "produces an arenium ion with one contributor putting positive charge on the very carbon " +
        "bearing that positive nitrogen, and two positives side by side is an unacceptable " +
        "contributor. Meta attack never produces it, so meta is the least bad option rather than a " +
        "good one.",
      lookAt:
        "Draw the three arenium ions and look for the contributor with charge on the substituted " +
        "carbon. A meta director is a group that makes that contributor terrible.",
    },
    distractors: [
      {
        id: "picked-methoxy",
        state: { kind: "multiple_choice", optionId: "methoxy" },
        explanation: {
          whatHappened: "This picks the methoxy group.",
          why:
            "Methoxy is the strongest ortho and para director in this list. Its oxygen lone pair " +
            "donates into the ring, and in the ortho and para arenium ions there is a contributor " +
            "where that oxygen takes the positive charge itself, giving every atom a full octet. " +
            "That contributor is excellent, which is why methoxy both activates the ring and directs " +
            "ortho and para.",
          lookAt:
            "Check whether the atom attached to the ring carries a lone pair. A donatable lone pair " +
            "on that atom means ortho and para.",
        },
      },
      {
        id: "picked-methyl",
        state: { kind: "multiple_choice", optionId: "methyl" },
        explanation: {
          whatHappened: "This picks the methyl group.",
          why:
            "A methyl group has no lone pair and it still directs ortho and para, by donating " +
            "electron density weakly through its own bonds. In the ortho and para arenium ions the " +
            "positive charge lands on the carbon bearing the methyl, and a substituted carbon carries " +
            "positive charge better than an unsubstituted one, which is the same reasoning that " +
            "ranks carbocations.",
          lookAt:
            "Ask where the positive charge sits in each arenium ion, then ask whether the substituent " +
            "there helps or hurts. Alkyl groups help.",
        },
      },
      {
        id: "picked-bromo",
        state: { kind: "multiple_choice", optionId: "bromo" },
        explanation: {
          whatHappened:
            "This picks the bromine, which is the one substituent here that deactivates the ring and still directs ortho and para.",
          why:
            "Bromine is the anomaly and it is worth separating carefully. It pulls electron density " +
            "out of the ring through the sigma bond, which slows every position down, and it also " +
            "has lone pairs to donate by resonance, which selectively helps the ortho and para " +
            "arenium ions. Slower everywhere, and least slow at ortho and para.",
          lookAt:
            "Score rate and position as two separate questions. A halogen answers them differently, " +
            "and every other group in this list answers them the same way.",
        },
      },
    ],
    tags: ["eas", "directing-effects", "halogen-anomaly"],
  }),

  createProblem({
    id: "org2-eas-halogen-anomaly",
    course: "orgo_2",
    topic: "eas_directing_effects",
    difficulty: 1250,
    prompt:
      "Chlorobenzene nitrates roughly thirty times more slowly than benzene, and the nitro group " +
      "still arrives almost entirely at the ortho and para positions. Which statement accounts for " +
      "both observations at once?",
    answer: createMultipleChoiceAnswer({
      options: [
        {
          id: "induction-slows-resonance-directs",
          text: "Chlorine withdraws through the sigma bond, which slows every position, and donates a lone pair by resonance, which leaves ortho and para the least deactivated",
        },
        {
          id: "channels-swapped",
          text: "Chlorine withdraws by resonance and donates through the sigma bond",
        },
        {
          id: "size-argument",
          text: "Chlorine directs ortho and para because it is small, and the slow rate comes from the solvent",
        },
        {
          id: "unrelated",
          text: "The two observations are unrelated, since halogens activate the ring and the slow rate is an artefact",
        },
      ],
      correctOptionId: "induction-slows-resonance-directs",
    }),
    solution: {
      whatHappened:
        "Two opposing channels on the same atom. Induction sets the rate and resonance sets the " +
        "position.",
      why:
        "Chlorine is more electronegative than carbon, so through the sigma bond it constantly pulls " +
        "density out of the ring, and a ring with less density attacks any electrophile more slowly. " +
        "Separately, chlorine has lone pairs in p orbitals that can conjugate with the ring, and in " +
        "the ortho and para arenium ions there is a contributor where chlorine donates a pair and " +
        "takes the positive charge onto itself. That contributor is only available for ortho and " +
        "para, so those positions are helped relative to meta even while all three are hurt " +
        "relative to benzene.",
      lookAt:
        "Score the two channels separately and then combine them. Induction is a rate effect here " +
        "and resonance is a selectivity effect.",
    },
    distractors: [
      {
        id: "channels-swapped",
        state: { kind: "multiple_choice", optionId: "channels-swapped" },
        explanation: {
          whatHappened:
            "This has the two channels the other way round, with resonance withdrawing and induction donating.",
          why:
            "Induction runs on electronegativity, and chlorine is more electronegative than carbon, " +
            "so it pulls rather than pushes through the sigma bond. Resonance runs on lone pairs, " +
            "and chlorine has three to donate rather than an empty orbital to accept into. Swapping " +
            "them also predicts meta direction, which the observation contradicts.",
          lookAt:
            "Assign each channel from a different property of the atom. Electronegativity drives " +
            "induction and lone pairs or empty orbitals drive resonance.",
        },
      },
      {
        id: "size-argument",
        state: { kind: "multiple_choice", optionId: "size-argument" },
        explanation: {
          whatHappened: "This explains the position with sterics and moves the rate effect out to the solvent.",
          why:
            "If size decided the position, ortho would be disfavoured rather than favoured, since " +
            "ortho is the crowded position. Sterics do trim the ortho share of the product a little " +
            "and they do not choose between ortho and para on one side and meta on the other. The " +
            "rate drop also survives a change of solvent, which is what makes it a property of the " +
            "substituent.",
          lookAt:
            "Note that the observation groups ortho WITH para. A steric argument would separate " +
            "them, and an electronic one groups them, which is the signature.",
        },
      },
      {
        id: "dismissed-as-unrelated",
        state: { kind: "multiple_choice", optionId: "unrelated" },
        explanation: {
          whatHappened:
            "This treats halogens as activating and sets the rate measurement aside as noise.",
          why:
            "Every halogen deactivates a benzene ring, and the effect is large and reproducible. " +
            "What makes the halogens memorable is precisely that deactivating and ortho para " +
            "directing normally travel together in the opposite pairing, and here they do not. The " +
            "two observations are two halves of one explanation rather than two separate facts.",
          lookAt:
            "Treat a rule with a stated exception as a place to look harder rather than a place to " +
            "discount the data. The halogens are the exception the rubric names.",
        },
      },
    ],
    tags: ["eas", "halogen-anomaly", "resonance-vs-induction"],
  }),

  createProblem({
    id: "org2-eas-acylate-then-reduce",
    course: "orgo_2",
    topic: "eas_directing_effects",
    difficulty: 1500,
    prompt:
      "Propylbenzene is the target, starting from benzene, with the propyl chain unbranched. Give " +
      "the steps in order.",
    answer: createReagentsAnswer({
      mode: "sequence",
      direction: "forward",
      steps: [
        { reagents: ["CH3CH2COCl", "AlCl3"], label: "acylate the ring" },
        { reagents: ["Zn(Hg)", "HCl"], label: "reduce the ketone to a methylene" },
      ],
      equivalents: [["AlCl3", "FeCl3"]],
      acceptedAlternatives: [
        [
          { reagents: ["CH3CH2COCl", "AlCl3"], label: "acylate the ring" },
          { reagents: ["N2H4", "KOH"], label: "reduce the ketone under basic conditions with heat" },
        ],
      ],
    }),
    solution: {
      whatHappened:
        "Acylate first with propanoyl chloride and aluminium chloride, then reduce the ketone all " +
        "the way to a methylene group.",
      why:
        "The direct route, benzene with 1-chloropropane and a Lewis acid, gives mostly " +
        "isopropylbenzene, because the primary electrophile rearranges to the secondary cation " +
        "before it ever reaches the ring. An acylium ion cannot rearrange: its positive charge is " +
        "already stabilised by the neighbouring oxygen, so it stays exactly the shape it was made " +
        "in. That fixes the skeleton, and the carbonyl is then removed by dissolving zinc amalgam in " +
        "acid, or by hydrazine with base and heat if the substrate dislikes acid.",
      lookAt:
        "Whenever a straight chain has to go onto a ring, check whether the corresponding cation " +
        "would rearrange. If it would, go through the acyl group instead.",
    },
    distractors: [
      {
        id: "direct-alkylation",
        state: {
          kind: "reagents",
          steps: [{ reagents: ["CH3CH2CH2Cl", "AlCl3"] }],
        },
        cause: "synthesis_step_count_wrong",
        explanation: {
          whatHappened:
            "This alkylates the ring directly in one step, which puts a branched chain on rather than a straight one.",
          why:
            "The aluminium chloride pulls chloride off to make a primary cation, and a primary " +
            "cation is high enough in energy that a hydride shifts across before anything else " +
            "happens, giving the secondary cation. The ring then meets that, so the product is " +
            "isopropylbenzene. Alkylation also tends to go more than once, because the alkyl group " +
            "it installs activates the ring for the next electrophile.",
          lookAt:
            "Draw the cation the alkylating agent produces and check it against the more stable " +
            "cations one shift away. This is the same blind spot as an alcohol dehydration that " +
            "rearranges.",
        },
      },
      {
        id: "reduce-before-acylating",
        state: {
          kind: "reagents",
          steps: [{ reagents: ["Zn(Hg)", "HCl"] }, { reagents: ["CH3CH2COCl", "AlCl3"] }],
        },
        cause: "synthesis_steps_out_of_order",
        explanation: {
          whatHappened: "These are the right two steps with the reduction placed first.",
          why:
            "Zinc amalgam in acid removes a carbonyl, and benzene has no carbonyl for it to remove, " +
            "so the first step does nothing at all. Beyond that, running the acylation last would " +
            "leave the ketone in the product rather than the propyl chain the target needs.",
          lookAt:
            "Check that every step has something to act on when it arrives. A reduction needs the " +
            "group it reduces to be installed already.",
        },
      },
    ],
    tags: ["eas", "order-of-operations", "friedel-crafts-rearrangement"],
  }),
]);
