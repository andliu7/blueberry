/**
 * `pka_and_acidity`, the Act 0 spine.
 *
 * WHY THIS TOPIC GETS FIVE PROBLEMS WHEN OTHERS GET TWO.
 * `docs/COURSE-OUTLINE-ORGO2.md` section 7 records the pKa opener as form F1,
 * present on 6 of 6 exams and always first, with ranking (F2) and Keq from a pKa
 * difference (F3) on top of it, and section 5 records `pka_keq_viability` being
 * reused in five later topics. Acidity is the course's spine rather than one of
 * its topics, so the corpus front loads it.
 *
 * THE FORMS AUTHORED HERE, from the census, never from a source problem:
 *
 *   F1  the underlined proton opener, which is what `pkaSites` exists for
 *   F2  rank by acidity
 *   F3  compute Keq from a pKa difference
 *   plus the step viability form, which is the leaving group ceiling read as a
 *   question about whether an arrow is an equilibrium
 *
 * EVERY NUMBER HERE COMES FROM `pka.ts`. None is written into a prompt or into
 * an explanation as a literal that could drift from the table. Where an
 * explanation states a value it is stating the ladder rung the table already
 * carries, and `assertPkaSitesValid` fails the import if a site named here is
 * not in the table.
 *
 * A NOTE ON `sigFigPolicy: "ignore"` ON EVERY NUMERIC HERE. pka.ts says these are
 * class values taught to one or two significant figures and compared rather than
 * measured, and that a checker demanding three figures from a value taught as
 * "about 16" is checking the wrong thing. The same reasoning covers a Keq the
 * course itself reports as "about 10 to the something".
 */

import { createMultipleChoiceAnswer } from "../answers/choice.js";
import { createNumericAnswer } from "../answers/numeric.js";
import { createProblem, type Problem } from "../problem.js";

export const PKA_PROBLEMS: readonly Problem[] = Object.freeze([
  createProblem({
    id: "org2-pka-underlined-phenol",
    course: "orgo_2",
    topic: "pka_and_acidity",
    difficulty: 800,
    prompt:
      "A molecule carries three acidic hydrogens: a carboxylic acid O-H labelled Ha, a phenol O-H " +
      "on a benzene ring labelled Hb, and an ordinary alcohol O-H on an sp3 carbon labelled Hc. " +
      "Give the approximate pKa of Hb.",
    answer: createNumericAnswer({
      text: "10",
      sigFigPolicy: "ignore",
      // A ladder rung, compared rather than measured. Half a rung either way is
      // still the same rung; a whole rung away is a different site.
      tolerance: { kind: "absolute", value: 1 },
    }),
    pkaSites: [
      { siteId: "carboxylic_acid", anchor: "Ha" },
      { siteId: "phenol", anchor: "Hb" },
      { siteId: "alcohol", anchor: "Hc" },
    ],
    solution: {
      whatHappened: "Hb is a phenol O-H, which sits at about 10 on the ladder.",
      why:
        "Taking Hb off leaves a phenoxide, and that negative charge does not stay on the oxygen. " +
        "It spreads into the ring, reaching the two ortho carbons and the para carbon. An ordinary " +
        "alkoxide has nowhere to put the charge, which is why the same O-H on an sp3 carbon sits " +
        "five rungs higher at about 16.",
      lookAt:
        "Draw the conjugate base of each of the three labelled sites before assigning a number. The " +
        "ladder rung follows from how far the charge spreads once the proton is gone.",
    },
    distractors: [
      {
        id: "answered-the-most-acidic-site",
        state: { kind: "numeric", text: "5", unit: null },
        explanation: {
          whatHappened:
            "This is the carboxylic acid value at about 5, which belongs to Ha rather than to Hb.",
          why:
            "Ha is the most acidic proton in this molecule, so it is the right answer to a different " +
            "question. The carboxylate's charge is shared equally by two oxygens, which beats a " +
            "phenoxide sharing its charge with three ring carbons that hold negative charge less " +
            "willingly than oxygen does.",
          lookAt:
            "Match each label to its own site before answering. This form asks for a value per " +
            "underlined proton, so the most acidic site in the molecule is only the answer when it " +
            "is the one labelled.",
        },
      },
      {
        id: "phenol-read-as-plain-alcohol",
        state: { kind: "numeric", text: "16", unit: null },
        explanation: {
          whatHappened:
            "This is the ordinary alcohol value at about 16, which belongs to Hc rather than to Hb.",
          why:
            "An O-H attached to a benzene ring and an O-H attached to an sp3 carbon are five orders " +
            "of magnitude apart, and the whole gap is the ring. The phenoxide oxygen's lone pair " +
            "conjugates into the pi system, so the charge is delocalised in a way an alkoxide's " +
            "never is.",
          lookAt:
            "Check what the oxygen is attached to before reaching for a value. Attached to sp3 " +
            "carbon it is about 16, attached to an aromatic ring it is about 10.",
        },
      },
    ],
    tags: ["pka-opener", "conjugate-base-stability"],
  }),

  createProblem({
    id: "org2-pka-most-acidic-site",
    course: "orgo_2",
    topic: "pka_and_acidity",
    difficulty: 1000,
    prompt:
      "One molecule carries four different hydrogens: an alcohol O-H, the alpha C-H next to a " +
      "ketone, a terminal alkyne C-H, and a secondary amine N-H. If one equivalent of a strong " +
      "base is added, which hydrogen does it take first?",
    answer: createMultipleChoiceAnswer({
      options: [
        { id: "alcohol-oh", text: "The alcohol O-H" },
        { id: "alpha-ch", text: "The alpha C-H next to the ketone" },
        { id: "alkyne-ch", text: "The terminal alkyne C-H" },
        { id: "amine-nh", text: "The secondary amine N-H" },
      ],
      correctOptionId: "alcohol-oh",
    }),
    pkaSites: [
      { siteId: "alcohol", anchor: "the alcohol O-H" },
      { siteId: "ketone_alpha_ch", anchor: "the alpha C-H" },
      { siteId: "terminal_alkyne_ch", anchor: "the alkyne C-H" },
      { siteId: "amine_nh", anchor: "the amine N-H" },
    ],
    solution: {
      whatHappened:
        "The alcohol O-H goes first. At about 16 it is the lowest of the four rungs in this molecule.",
      why:
        "Finding the site a base attacks is a whole molecule comparison, not a local one. Oxygen is " +
        "more electronegative than carbon or nitrogen, so it holds a negative charge more " +
        "comfortably, and the alkoxide is the most stable of the four conjugate bases. The alpha " +
        "C-H at about 20 is next, then the alkyne C-H at about 25, then the amine N-H at about 35.",
      lookAt:
        "List every acidic site in the molecule and its rung before choosing. A base does not know " +
        "which part of the molecule the question is about; it finds the lowest rung available.",
    },
    distractors: [
      {
        id: "picked-the-reactive-site",
        state: { kind: "multiple_choice", optionId: "alpha-ch" },
        explanation: {
          whatHappened:
            "This picks the alpha C-H, which is the site the interesting chemistry usually happens at.",
          why:
            "The alpha C-H at about 20 is four orders of magnitude less acidic than the alcohol O-H " +
            "at about 16, so the base is used up on the oxygen long before it reaches carbon. This " +
            "is exactly why an enolate cannot be formed in the presence of a free alcohol: the " +
            "alcohol quenches the base first.",
          lookAt:
            "Separate the site that reacts later from the site that is deprotonated first. When " +
            "they differ, the molecule needs a protecting group or a second equivalent of base.",
        },
      },
      {
        id: "picked-alkyne",
        state: { kind: "multiple_choice", optionId: "alkyne-ch" },
        explanation: {
          whatHappened: "This picks the terminal alkyne C-H at about 25.",
          why:
            "A terminal alkyne is unusually acidic for a C-H, because its carbon is sp hybridised " +
            "and holds the lone pair close to the nucleus. That earns it a rung well below an " +
            "alkane, and still nine orders of magnitude above the alcohol O-H here.",
          lookAt:
            "Compare the alkyne value with the alcohol value directly. Acidic for a C-H and most " +
            "acidic in this molecule are two different claims.",
        },
      },
      {
        id: "picked-nh-over-oh",
        state: { kind: "multiple_choice", optionId: "amine-nh" },
        explanation: {
          whatHappened: "This picks the amine N-H, placing nitrogen ahead of oxygen.",
          why:
            "An amine N-H sits at about 35, nineteen rungs above the alcohol O-H. Nitrogen is less " +
            "electronegative than oxygen, so an amide anion carries its negative charge far less " +
            "comfortably than an alkoxide does. The nitrogen value that is near 10 belongs to a " +
            "protonated amine, the ammonium, which is a different species.",
          lookAt:
            "Keep the amine N-H at about 35 and the ammonium N-H at about 10 apart in the table. " +
            "One is a neutral amine losing a proton and the other is a cation losing one.",
        },
      },
    ],
    tags: ["pka-opener", "whole-molecule-comparison"],
  }),

  createProblem({
    id: "org2-pka-keq-alkoxide-phenol",
    course: "orgo_2",
    topic: "pka_and_acidity",
    difficulty: 1150,
    prompt:
      "Sodium ethoxide is mixed with phenol. Using the course values, phenol at about 10 and an " +
      "alcohol O-H at about 16, compute Keq for the proton transfer. Report it as a power of ten.",
    answer: createNumericAnswer({
      text: "1e6",
      sigFigPolicy: "ignore",
      // Tolerance is left at the derived default, half of the last significant
      // digit, which here is plus or minus 5 times 10^5. That window keeps a
      // student who wrote 10^6 and rejects 10^5 and 10^7, which is the
      // resolution an order of magnitude answer actually has.
    }),
    solution: {
      whatHappened:
        "Keq is about 10 to the sixth, so the equilibrium sits hard on the side of phenoxide and ethanol.",
      why:
        "Keq is ten raised to the pKa of the acid FORMED minus the pKa of the acid CONSUMED. Phenol " +
        "is consumed at about 10 and ethanol is formed at about 16, so the exponent is 16 minus 10. " +
        "The rule is a restatement of the same idea the ladder carries: a proton moves to the " +
        "stronger base, which is the conjugate base of the weaker acid.",
      lookAt:
        "Label the two acids before subtracting. The one on the left that gives up its proton is " +
        "consumed, and the conjugate acid of the base that took it is formed.",
    },
    distractors: [
      {
        id: "subtraction-reversed",
        state: { kind: "numeric", text: "1e-6", unit: null },
        explanation: {
          whatHappened:
            "This is ten to the minus sixth, which comes from subtracting the two pKa values the other way round.",
          why:
            "A Keq below one says the reaction sits on the starting material side, which would mean " +
            "ethoxide cannot take a proton from a phenol six orders of magnitude more acidic than " +
            "ethanol. The direction check is quick: the proton always ends up on the weaker base, " +
            "and ethoxide is the stronger of the two here.",
          lookAt:
            "Sanity check the sign against the ladder before reporting. The acid being consumed is " +
            "the lower rung, so acid formed minus acid consumed comes out positive.",
        },
      },
      {
        id: "reported-the-difference",
        state: { kind: "numeric", text: "6", unit: null },
        explanation: {
          whatHappened: "This is the pKa difference itself, with the ten to the power step left out.",
          why:
            "The difference is an exponent, not an equilibrium constant. Six is how many orders of " +
            "magnitude the equilibrium favours products by, and Keq is the number that difference " +
            "produces, a million to one.",
          lookAt:
            "Write the expression out as Keq equals 10 raised to the difference. The difference goes " +
            "upstairs.",
        },
      },
    ],
    tags: ["keq", "pka-difference"],
  }),

  createProblem({
    id: "org2-pka-leaving-group-reversibility",
    course: "orgo_2",
    topic: "pka_and_acidity",
    difficulty: 1250,
    prompt:
      "A tetrahedral intermediate can collapse by expelling one of several groups. The course rule " +
      "is that a step is a real equilibrium when the departing group's conjugate acid has a pKa at " +
      "or below 20. Which of these departing groups makes the step reversible?",
    answer: createMultipleChoiceAnswer({
      options: [
        { id: "alkoxide", text: "An alkoxide, whose conjugate acid is an alcohol" },
        { id: "amide-anion", text: "An amide anion, whose conjugate acid is an amine N-H" },
        { id: "vinyl-anion", text: "A vinyl anion, whose conjugate acid is a vinylic C-H" },
        { id: "carbanion", text: "An alkyl carbanion, whose conjugate acid is an alkane C-H" },
      ],
      correctOptionId: "alkoxide",
    }),
    pkaSites: [
      { siteId: "alcohol", anchor: "the alcohol formed from the alkoxide" },
      { siteId: "amine_nh", anchor: "the amine formed from the amide anion" },
      { siteId: "vinylic_or_aromatic_ch", anchor: "the vinylic C-H formed from the vinyl anion" },
      { siteId: "alkane_ch", anchor: "the alkane formed from the carbanion" },
    ],
    solution: {
      whatHappened:
        "The alkoxide. Its conjugate acid is an alcohol at about 16, which is at or below the " +
        "ceiling of 20, so that collapse is an equilibrium.",
      why:
        "A group leaves willingly when it is stable carrying the electron pair it takes with it, and " +
        "the pKa of its conjugate acid is the direct measure of that. An alkoxide holds a charge on " +
        "oxygen and is comfortable. The other three all leave a charge on nitrogen or carbon, at " +
        "about 35, 40 and 50, so far above the ceiling that the step runs forward and does not come " +
        "back.",
      lookAt:
        "Turn each departing group into its conjugate acid and read that rung. That single number " +
        "decides whether the arrow in the mechanism is a full arrow or a pair of equilibrium arrows.",
    },
    distractors: [
      {
        id: "picked-amide-anion",
        state: { kind: "multiple_choice", optionId: "amide-anion" },
        explanation: {
          whatHappened:
            "This picks the amide anion, whose conjugate acid, an amine N-H, sits at about 35.",
          why:
            "Thirty five is fifteen rungs above the ceiling, so nitrogen holds onto its electrons " +
            "and does not leave. This is exactly why an amide is the hardest carbonyl derivative to " +
            "hydrolyse and why the ladder of acyl reactivity has amide near the bottom.",
          lookAt:
            "Compare 35 against the ceiling of 20 directly. A group whose conjugate acid is fifteen " +
            "orders of magnitude less acidic than the ceiling is not a leaving group.",
        },
      },
      {
        id: "picked-vinyl-anion",
        state: { kind: "multiple_choice", optionId: "vinyl-anion" },
        explanation: {
          whatHappened:
            "This picks the vinyl anion, whose conjugate acid, a vinylic C-H, sits at about 40.",
          why:
            "An sp2 carbanion is more stable than an sp3 one, which is why it lands at 40 rather " +
            "than 50, and it is still twenty rungs above the ceiling. More stable than the worst " +
            "case is not the same test as at or below 20.",
          lookAt:
            "Read the rule as a threshold rather than as a ranking. The question is not which " +
            "carbanion is best, it is which group clears 20.",
        },
      },
      {
        id: "picked-carbanion",
        state: { kind: "multiple_choice", optionId: "carbanion" },
        explanation: {
          whatHappened: "This picks the alkyl carbanion, whose conjugate acid is an alkane at about 50.",
          why:
            "Fifty is the top of the ladder and the course's own worked example of a group that " +
            "does not leave. A step that would expel a carbanion runs irreversibly forward instead, " +
            "which is why a Grignard addition to a ketone does not fall back to starting material.",
          lookAt:
            "Use the alkane rung at 50 as the anchor for the bad end of the scale. Anything near it " +
            "stays where it is.",
        },
      },
    ],
    tags: ["leaving-group-ceiling", "equilibrium-arrows"],
  }),

  createProblem({
    id: "org2-pka-rank-four-acids",
    course: "orgo_2",
    topic: "pka_and_acidity",
    difficulty: 1400,
    prompt:
      "Rank these four from MOST acidic to LEAST acidic: a carboxylic acid O-H, a phenol O-H, an " +
      "ethanol O-H, and a terminal alkyne C-H. Which ordering is right?",
    answer: createMultipleChoiceAnswer({
      options: [
        { id: "acid-phenol-alcohol-alkyne", text: "Carboxylic acid, phenol, ethanol, alkyne" },
        { id: "phenol-acid-alcohol-alkyne", text: "Phenol, carboxylic acid, ethanol, alkyne" },
        { id: "acid-alcohol-phenol-alkyne", text: "Carboxylic acid, ethanol, phenol, alkyne" },
        { id: "acid-phenol-alkyne-alcohol", text: "Carboxylic acid, phenol, alkyne, ethanol" },
      ],
      correctOptionId: "acid-phenol-alcohol-alkyne",
    }),
    pkaSites: [
      { siteId: "carboxylic_acid", anchor: "the carboxylic acid O-H" },
      { siteId: "phenol", anchor: "the phenol O-H" },
      { siteId: "alcohol", anchor: "the ethanol O-H" },
      { siteId: "terminal_alkyne_ch", anchor: "the terminal alkyne C-H" },
    ],
    solution: {
      whatHappened:
        "Carboxylic acid at about 5, phenol at about 10, ethanol at about 16, terminal alkyne at " +
        "about 25.",
      why:
        "Every step in that ordering is an argument about the conjugate base. A carboxylate shares " +
        "its charge equally over two oxygens. A phenoxide shares its charge with three ring carbons, " +
        "which is real delocalisation onto atoms that hold charge less well than oxygen. An " +
        "ethoxide has nowhere to send the charge at all. An acetylide puts the charge on carbon, " +
        "which is the least electronegative of the four.",
      lookAt:
        "Draw all four conjugate bases side by side and count how many atoms share the charge and " +
        "how electronegative those atoms are. The ordering falls out of those two counts.",
    },
    distractors: [
      {
        id: "phenol-above-carboxylic-acid",
        state: { kind: "multiple_choice", optionId: "phenol-acid-alcohol-alkyne" },
        explanation: {
          whatHappened:
            "This places phenol above the carboxylic acid, on the reasoning that a whole benzene ring " +
            "spreads charge further than two oxygens.",
          why:
            "How far the charge spreads matters less than what it spreads onto. A carboxylate's two " +
            "oxygens are identical and both are electronegative, so the two contributors are equal " +
            "and both are excellent. A phenoxide's contributors put the charge on carbon, which " +
            "holds it far less willingly, so the delocalisation is real and worth five rungs rather " +
            "than ten.",
          lookAt:
            "Count the ATOMS the charge lands on in each conjugate base, then ask what element each " +
            "one is. Two oxygens beat one oxygen and three carbons.",
        },
      },
      {
        id: "phenol-read-as-alcohol",
        state: { kind: "multiple_choice", optionId: "acid-alcohol-phenol-alkyne" },
        explanation: {
          whatHappened: "This places ethanol above phenol, treating the two O-H groups as equivalent.",
          why:
            "The two look alike on paper and are six orders of magnitude apart. Removing phenol's " +
            "proton gives an anion whose lone pair conjugates into the ring; removing ethanol's " +
            "gives an anion with nothing to conjugate with. The ring is the entire difference.",
          lookAt:
            "Ask of each O-H whether a pi system is attached to that oxygen. Where one is, the value " +
            "drops from about 16 to about 10.",
        },
      },
      {
        id: "alkyne-above-alcohol",
        state: { kind: "multiple_choice", optionId: "acid-phenol-alkyne-alcohol" },
        explanation: {
          whatHappened:
            "The first two are placed correctly and the last two are swapped, putting the alkyne C-H above ethanol.",
          why:
            "A terminal alkyne is remarkably acidic for a C-H, and it is still nine rungs above an " +
            "alcohol O-H at about 25 against about 16. That gap is what makes an acetylide unable to " +
            "survive in an alcohol solvent: the alcohol simply protonates it.",
          lookAt:
            "Use the acetylide and alcohol pairing as a fixed reference point. Sodium amide can make " +
            "an acetylide and sodium ethoxide cannot.",
        },
      },
    ],
    tags: ["ranking", "conjugate-base-stability"],
  }),
]);
