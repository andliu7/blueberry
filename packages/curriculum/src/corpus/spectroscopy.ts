/**
 * Infrared interpretation and degrees of unsaturation, Act 0.
 *
 * The numeric ones are the corpus's example of `sigFigPolicy: "ignore"`. A degree
 * of unsaturation is a count, so significant figures do not apply to it, and the
 * tolerance is deliberately tighter than the default half digit window because
 * an answer between two integers is not a rounding of either. On the heteroatom
 * problem below that tightness is load bearing twice over: the mistake it catches
 * lands exactly half a unit away.
 *
 * `docs/COURSE-OUTLINE-ORGO2.md` D1 puts this material at pathway start rather
 * than at topic 6, because roughly 37 of 46 slides of the delivered first lecture
 * are infrared, degrees of unsaturation and NMR, and structure determination is
 * exactly 10 points on 6 of 6 exams. NMR itself lives in `nmr.ts` next door.
 */

import { createMultipleChoiceAnswer } from "../answers/choice.js";
import { createNumericAnswer } from "../answers/numeric.js";
import { createProblem, type Problem } from "../problem.js";

export const SPECTROSCOPY_PROBLEMS: readonly Problem[] = Object.freeze([
  createProblem({
    id: "org1-ir-carbonyl-identification",
    course: "orgo_1",
    topic: "spectroscopy_ir",
    difficulty: 1100,
    prompt:
      "A compound of formula C4H8O gives a strong sharp infrared absorption at 1715 reciprocal " +
      "centimetres and nothing between 3200 and 3600. Which compound is it?",
    answer: createMultipleChoiceAnswer({
      options: [
        { id: "butanone", text: "Butan-2-one" },
        { id: "butanol", text: "Butan-1-ol" },
        { id: "butenol", text: "But-3-en-1-ol" },
        { id: "thf", text: "Tetrahydrofuran" },
      ],
      correctOptionId: "butanone",
    }),
    solution: {
      whatHappened:
        "Butan-2-one fits both pieces of evidence: it has the carbonyl the 1715 band reports, and " +
        "no hydroxyl to fill the 3200 to 3600 region.",
      why:
        "A carbon to oxygen double bond is a strong dipole that stretches near 1715 reciprocal " +
        "centimetres, and the band is sharp because the bond is stiff and well defined. A hydroxyl " +
        "group hydrogen bonds to its neighbours, which spreads its stretch into the broad hump " +
        "between 3200 and 3600 that this spectrum does not have.",
      lookAt:
        "Read an infrared spectrum for what is ABSENT as carefully as for what is present. The " +
        "empty hydroxyl region is doing half the work of identifying this compound.",
    },
    distractors: [
      {
        id: "picked-butanol",
        state: { kind: "multiple_choice", optionId: "butanol" },
        explanation: {
          whatHappened: "This picks an alcohol on a spectrum with an empty hydroxyl region.",
          why:
            "Butan-1-ol would show a broad absorption between 3200 and 3600 from the hydrogen " +
            "bonded hydroxyl, and it has no carbon to oxygen double bond to produce the 1715 band " +
            "at all. Both pieces of evidence point away from it.",
          lookAt:
            "Check the 3200 to 3600 region first when the formula allows an alcohol. A broad band " +
            "there is one of the most recognisable signals in the whole spectrum.",
        },
      },
      {
        id: "picked-butenol",
        state: { kind: "multiple_choice", optionId: "butenol" },
        explanation: {
          whatHappened:
            "This picks the compound with a carbon to carbon double bond, reading the 1715 band as an alkene.",
          why:
            "An alkene stretch appears closer to 1650 and is weak, because a carbon to carbon double " +
            "bond has little dipole to change. 1715 with strong intensity is the carbonyl range. " +
            "But-3-en-1-ol also carries a hydroxyl, so it would fill the region that is empty here.",
          lookAt:
            "Use intensity along with position. A strong band near 1700 is a carbonyl, and a weak " +
            "one near 1650 is an alkene.",
        },
      },
      {
        id: "picked-thf",
        state: { kind: "multiple_choice", optionId: "thf" },
        explanation: {
          whatHappened: "This picks the ether, which matches the empty hydroxyl region and nothing else.",
          why:
            "Tetrahydrofuran has a carbon to oxygen SINGLE bond, which stretches near 1100 rather " +
            "than 1715. The strong band at 1715 needs a double bond to oxygen, and an ether has none.",
          lookAt:
            "Separate the single bond region near 1100 from the double bond region near 1700. Both " +
            "involve oxygen and they report different things.",
        },
      },
    ],
    tags: ["infrared", "carbonyl"],
  }),

  createProblem({
    id: "org1-degrees-of-unsaturation",
    course: "orgo_1",
    topic: "degrees_of_unsaturation",
    difficulty: 750,
    prompt: "How many degrees of unsaturation does a compound of formula C6H10 have?",
    answer: createNumericAnswer({
      text: "2",
      sigFigPolicy: "ignore",
      // A count, so the window is narrow on purpose. The default half digit
      // window would be plus or minus 0.5, which reaches the neighbouring
      // integers, and an answer of 1.5 is not a rounding of 2.
      tolerance: { kind: "absolute", value: 0.25 },
    }),
    solution: {
      whatHappened:
        "The saturated formula for six carbons is C6H14, and this compound is four hydrogens short, which is two degrees.",
      why:
        "Every ring and every pi bond costs a molecule two hydrogens against the saturated " +
        "formula, so the hydrogen deficit divided by two counts them. C6H10 could be a compound " +
        "with two double bonds, one triple bond, one ring and one double bond, or two rings, and " +
        "the count does not say which.",
      lookAt:
        "Write the saturated formula 2n plus 2 first, subtract the hydrogens actually present, then " +
        "halve. Here that is 14 minus 10, over 2.",
    },
    distractors: [
      {
        id: "forgot-the-plus-two",
        state: { kind: "numeric", text: "1", unit: null },
        explanation: {
          whatHappened:
            "This uses 2n for the saturated hydrogen count instead of 2n plus 2, giving 12 minus 10 over 2.",
          why:
            "The plus 2 is the two chain ends. A six carbon chain carries two hydrogens on each of " +
            "four middle carbons and three on each end carbon, which totals 14 rather than 12.",
          lookAt:
            "Check the formula against a molecule you know. Hexane is C6H14, and 2n plus 2 has to " +
            "return that.",
        },
      },
      {
        id: "did-not-halve",
        state: { kind: "numeric", text: "4", unit: null },
        explanation: {
          whatHappened: "This is the hydrogen deficit itself, 14 minus 10, with the division by two left out.",
          why:
            "Each degree of unsaturation removes TWO hydrogens: forming a ring takes one from each " +
            "of the two carbons that join, and forming a pi bond does the same. So the deficit " +
            "counts hydrogens and half of it counts degrees.",
          lookAt:
            "Test the halving on benzene. C6H6 is eight hydrogens short of C6H14, and benzene has " +
            "four degrees, which is three double bonds and one ring.",
        },
      },
    ],
    tags: ["formula-analysis"],
  }),

  createProblem({
    id: "org2-ir-region-identification",
    course: "orgo_2",
    topic: "spectroscopy_ir",
    difficulty: 800,
    prompt:
      "An infrared spectrum shows a very broad absorption running from about 2500 to 3300 " +
      "reciprocal centimetres, overlapping the C-H stretches, together with a strong band at 1710. " +
      "Which functional group accounts for both features?",
    answer: createMultipleChoiceAnswer({
      options: [
        { id: "carboxylic-acid", text: "A carboxylic acid" },
        { id: "alcohol", text: "An alcohol" },
        { id: "ketone", text: "A ketone" },
        { id: "primary-amine", text: "A primary amine" },
      ],
      correctOptionId: "carboxylic-acid",
    }),
    solution: {
      whatHappened:
        "A carboxylic acid. It is the one group that produces both the very broad low hanging O-H " +
        "and the strong carbonyl band together.",
      why:
        "A carboxylic acid exists largely as a hydrogen bonded dimer, two molecules holding each " +
        "other by O-H to O. That hydrogen bonding is far stronger than an alcohol's, so the O-H " +
        "stretch is both broader and pushed to lower wavenumber, down into the C-H region. The 1710 " +
        "band is the carbon to oxygen double bond that the same group carries.",
      lookAt:
        "Use the LOW edge of the broad band as the discriminator. An alcohol's hump starts around " +
        "3200; a band that reaches down to 2500 belongs to an acid.",
    },
    distractors: [
      {
        id: "picked-alcohol",
        state: { kind: "multiple_choice", optionId: "alcohol" },
        explanation: {
          whatHappened: "This reads the broad band as an alcohol O-H and leaves the 1710 band unexplained.",
          why:
            "An alcohol does give a broad O-H, and it sits between about 3200 and 3600 rather than " +
            "reaching down to 2500, and an alcohol has no carbon to oxygen double bond to produce a " +
            "strong band at 1710 at all. A reading that accounts for one feature and not the other " +
            "is only half an answer.",
          lookAt:
            "Account for every strong band in the spectrum before settling on a group. The 1710 " +
            "band is the one an alcohol cannot explain.",
        },
      },
      {
        id: "picked-ketone",
        state: { kind: "multiple_choice", optionId: "ketone" },
        explanation: {
          whatHappened: "This reads the 1710 band as a ketone and leaves the broad band unexplained.",
          why:
            "A ketone does absorb near 1715, so half the evidence fits. What a ketone cannot produce " +
            "is an O-H stretch of any kind, and the broad feature here is far too wide and too " +
            "intense to be C-H stretching alone.",
          lookAt:
            "Compare the width of the 2500 to 3300 feature against the sharp C-H peaks a ketone " +
            "would show there. Width is the signal that hydrogen bonding is present.",
        },
      },
      {
        id: "picked-primary-amine",
        state: { kind: "multiple_choice", optionId: "primary-amine" },
        explanation: {
          whatHappened: "This reads the high wavenumber feature as N-H stretching.",
          why:
            "A primary amine shows TWO fairly sharp bands near 3300 and 3400, one for the " +
            "symmetric and one for the antisymmetric N-H stretch, not one broad hump reaching to " +
            "2500. Nitrogen hydrogen bonds more weakly than oxygen, which is why its bands stay " +
            "narrow.",
          lookAt:
            "Count the peaks in the 3300 region. Two sharp ones point at a primary amine and one " +
            "broad one points at an O-H.",
        },
      },
    ],
    tags: ["infrared", "region-identification"],
  }),

  createProblem({
    id: "org2-dou-with-nitrogen",
    course: "orgo_2",
    topic: "degrees_of_unsaturation",
    difficulty: 1200,
    prompt: "How many degrees of unsaturation does a compound of formula C8H9NO2 have?",
    answer: createNumericAnswer({
      text: "5",
      sigFigPolicy: "ignore",
      // A count, so the window is narrow on purpose, and here it is doing real
      // work: the mistake this problem is about lands exactly half a unit away.
      tolerance: { kind: "absolute", value: 0.25 },
    }),
    solution: {
      whatHappened:
        "Five. Each nitrogen adds one hydrogen to the saturated formula and each oxygen adds none, " +
        "so the saturated comparison is C8H19NO2 and the deficit of ten hydrogens is five degrees.",
      why:
        "A nitrogen is trivalent, so inserting one into a chain lets the molecule carry one more " +
        "hydrogen than the carbons alone would. An oxygen is divalent, so inserting one changes the " +
        "hydrogen count not at all. That gives 2n plus 2 plus the nitrogen count, and oxygen simply " +
        "does not appear in the expression.",
      lookAt:
        "Five or more degrees is the instructor's own signal to look for an aromatic ring, which is " +
        "four on its own. Here that leaves one more degree for a ring substituent or a carbonyl.",
    },
    distractors: [
      {
        id: "nitrogen-left-out",
        state: { kind: "numeric", text: "4.5", unit: null },
        explanation: {
          whatHappened:
            "This leaves the nitrogen out of the saturated formula, comparing against C8H18 and getting nine over two.",
          why:
            "A non integer result is the tell that a heteroatom was mishandled, because rings and pi " +
            "bonds each cost exactly two hydrogens and can never produce a half. Adding one " +
            "hydrogen per nitrogen is what makes the arithmetic come out whole.",
          lookAt:
            "Treat a fractional answer as a signal to recount rather than as something to round. " +
            "Nitrogen adds one to the saturated hydrogen count, oxygen adds nothing.",
        },
      },
      {
        id: "oxygens-subtracted",
        state: { kind: "numeric", text: "3", unit: null },
        explanation: {
          whatHappened:
            "This treats the two oxygens as though each one cost the molecule two hydrogens, taking four off the count.",
          why:
            "An oxygen has two bonds and slots into a chain between two atoms that were already " +
            "bonded, so nothing is displaced and no hydrogen is lost. That is why ethanol, C2H6O, " +
            "has the same hydrogen count as ethane and zero degrees of unsaturation.",
          lookAt:
            "Test the handling of oxygen on ethanol before applying it. C2H6O has to return zero, " +
            "and subtracting for the oxygen would return one.",
        },
      },
    ],
    tags: ["formula-analysis", "heteroatoms"],
  }),
]);
