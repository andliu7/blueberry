/**
 * NMR interpretation and structure determination, Act 0.
 *
 * `docs/COURSE-OUTLINE-ORGO2.md` section 3 gives the four NMR observables as a
 * checklist, signal count, integration, multiplicity and chemical shift, and
 * section 7 anchors structure determination as exactly 10 points on 6 of 6 exams,
 * always the last page. The four problems here are one per observable plus the
 * assembled form, which is the same ordered procedure the instructor teaches:
 * degrees of unsaturation first, functional groups from infrared, fragments from
 * integration and multiplicity, shift last and only if needed.
 *
 * THE STRUCTURE DETERMINATION PROBLEM IS MULTIPLE CHOICE AND NOT A STRUCTURE
 * ANSWER, deliberately. answers/structure.ts compares constitution only, which
 * would be enough for these four candidates, but the form the exam actually uses
 * is scaffolded with named boxes rather than a free drawing, and a finite
 * candidate list is what lets every wrong reading carry its own authored
 * explanation. When Indigo canonical comparison is wired on the lazy editor
 * route this becomes authorable in the open form too.
 */

import { createMultipleChoiceAnswer } from "../answers/choice.js";
import { createNumericAnswer } from "../answers/numeric.js";
import { createProblem, type Problem } from "../problem.js";

export const NMR_PROBLEMS: readonly Problem[] = Object.freeze([
  createProblem({
    id: "org2-nmr-signal-count-para-xylene",
    course: "orgo_2",
    topic: "spectroscopy_nmr",
    difficulty: 800,
    prompt:
      "How many distinct signals appear in the proton NMR spectrum of 1,4-dimethylbenzene, the " +
      "para isomer?",
    answer: createNumericAnswer({
      text: "2",
      sigFigPolicy: "ignore",
      // A count of environments. Half a signal is not a reading of anything, so
      // the window stays inside one integer.
      tolerance: { kind: "absolute", value: 0.25 },
    }),
    solution: {
      whatHappened:
        "Two. One signal for the six methyl hydrogens and one for the four ring hydrogens.",
      why:
        "Signal count is a count of distinct ENVIRONMENTS, and symmetry is what collapses them. The " +
        "para arrangement puts a mirror plane through both methyl groups, so the two methyls are " +
        "interchangeable and so are all four ring hydrogens. Every ring hydrogen has the same " +
        "neighbours reading in either direction around the ring.",
      lookAt:
        "Find the symmetry elements before counting. Two hydrogens are in the same environment " +
        "exactly when some symmetry operation of the molecule swaps them.",
    },
    distractors: [
      {
        id: "aromatic-split-in-two",
        state: { kind: "numeric", text: "3", unit: null },
        explanation: {
          whatHappened:
            "This counts the methyls as one signal and splits the ring hydrogens into two sets.",
          why:
            "On the ortho and meta isomers the ring hydrogens genuinely do fall into more than one " +
            "set, so the instinct is right and the isomer is wrong. In the para isomer each ring " +
            "hydrogen sits between one carbon bearing a methyl and one carbon bearing a hydrogen, " +
            "which is the same description for all four.",
          lookAt:
            "Walk around the ring from each hydrogen in turn and write down what it passes. All " +
            "four walks read the same here.",
        },
      },
      {
        id: "counted-every-ch-carbon",
        state: { kind: "numeric", text: "4", unit: null },
        explanation: {
          whatHappened:
            "This counts each hydrogen bearing position separately, two methyls plus two ring sets.",
          why:
            "Counting positions rather than environments always over counts on a symmetric " +
            "molecule. NMR cannot tell two identical environments apart, so the two methyls give " +
            "one signal integrating for six hydrogens rather than two signals of three.",
          lookAt:
            "Let integration carry the multiplicity of a set instead of the signal count. A tall " +
            "six hydrogen singlet and two three hydrogen singlets look very different on the page.",
        },
      },
    ],
    tags: ["nmr", "signal-count", "symmetry"],
  }),

  createProblem({
    id: "org2-nmr-multiplicity-middle-ch2",
    course: "orgo_2",
    topic: "spectroscopy_nmr",
    difficulty: 950,
    prompt:
      "In 1-bromopropane, the middle CH2 sits between a methyl group and the CH2 bearing the " +
      "bromine. What multiplicity does its signal show?",
    answer: createMultipleChoiceAnswer({
      options: [
        { id: "sextet", text: "A sextet, six lines" },
        { id: "quintet", text: "A quintet, five lines" },
        { id: "quartet", text: "A quartet, four lines" },
        { id: "triplet", text: "A triplet, three lines" },
      ],
      correctOptionId: "sextet",
    }),
    solution: {
      whatHappened:
        "A sextet. The middle CH2 has five neighbouring hydrogens, three on the methyl and two on " +
        "the CH2Br, and n plus 1 gives six lines.",
      why:
        "Splitting comes from hydrogens on ADJACENT carbons, three bonds away from the one being " +
        "observed, and every such hydrogen counts whichever group it belongs to. The middle carbon " +
        "has neighbours on both sides, so both sets add into one n. Their coupling constants are " +
        "close enough here that the two sets are not resolved separately and the pattern reads as " +
        "one clean sextet.",
      lookAt:
        "Count neighbours on BOTH sides of the observed carbon before applying n plus 1. Three plus " +
        "two is five, and five plus one is six.",
    },
    distractors: [
      {
        id: "used-n-not-n-plus-one",
        state: { kind: "multiple_choice", optionId: "quintet" },
        explanation: {
          whatHappened:
            "The neighbour count of five is right and it was reported as the number of lines directly.",
          why:
            "The plus one is there because n neighbours can be arranged in n plus 1 distinct ways " +
            "when counting how many of them align with the field. Zero aligned, one aligned, and so " +
            "on up to all five, which is six arrangements and six lines.",
          lookAt:
            "Check the rule against a case already known: a CH3 next to a single CH gives a doublet, " +
            "which is one neighbour giving two lines.",
        },
      },
      {
        id: "counted-methyl-only",
        state: { kind: "multiple_choice", optionId: "quartet" },
        explanation: {
          whatHappened: "This counts only the methyl's three hydrogens as neighbours.",
          why:
            "The methyl is one of two neighbouring groups. The CH2 carrying the bromine is on the " +
            "other side of the observed carbon and its two hydrogens are the same three bonds away, " +
            "so they split the signal just as much.",
          lookAt:
            "Mark the observed carbon and then mark every carbon directly bonded to it. Both " +
            "neighbours in a chain contribute.",
        },
      },
      {
        id: "counted-ch2br-only",
        state: { kind: "multiple_choice", optionId: "triplet" },
        explanation: {
          whatHappened: "This counts only the two hydrogens on the carbon bearing the bromine.",
          why:
            "The bromine draws attention to that side of the molecule and it has no effect on " +
            "splitting at all. Bromine has no hydrogens, and splitting is a count of neighbouring " +
            "HYDROGENS regardless of what else is attached.",
          lookAt:
            "Separate what shifts a signal from what splits it. The bromine moves the CH2Br signal " +
            "downfield and contributes nothing to any multiplicity.",
        },
      },
    ],
    tags: ["nmr", "multiplicity"],
  }),

  createProblem({
    id: "org2-nmr-shift-methyl-ester",
    course: "orgo_2",
    topic: "spectroscopy_nmr",
    difficulty: 1150,
    prompt:
      "Methyl acetate has two methyl groups, one bonded to the ester oxygen and one bonded to the " +
      "carbonyl carbon. Its spectrum shows two singlets, at 3.7 and at 2.0 parts per million. Which " +
      "methyl produces the 3.7 signal?",
    answer: createMultipleChoiceAnswer({
      options: [
        { id: "o-methyl", text: "The methyl bonded to the ester oxygen" },
        { id: "acyl-methyl", text: "The methyl bonded to the carbonyl carbon" },
        {
          id: "indistinguishable",
          text: "Neither can be assigned, because both are methyl singlets of three hydrogens",
        },
      ],
      correctOptionId: "o-methyl",
    }),
    solution: {
      whatHappened: "The methyl bonded directly to oxygen is the one at 3.7.",
      why:
        "Chemical shift reports how much electron density surrounds a hydrogen. Oxygen is strongly " +
        "electronegative and pulls density out of the C-H bonds on the carbon it is attached to, " +
        "which leaves those hydrogens less shielded from the applied field and moves them downfield. " +
        "The other methyl is attached to carbon and only feels the carbonyl one bond further away, " +
        "so it stays near 2.0.",
      lookAt:
        "Count the bonds from each hydrogen to the nearest electronegative atom. Directly attached " +
        "oxygen is worth well over a part per million against a carbonyl one bond removed.",
    },
    distractors: [
      {
        id: "assigned-to-the-carbonyl-side",
        state: { kind: "multiple_choice", optionId: "acyl-methyl" },
        explanation: {
          whatHappened:
            "This assigns the downfield signal to the methyl next to the carbonyl, reading the carbonyl as the strongest influence in the molecule.",
          why:
            "The carbonyl is the most dramatic looking group on the page and the oxygen bonded " +
            "straight to a carbon wins on proximity. Deshielding falls off sharply with distance, so " +
            "one bond to oxygen beats two bonds to a carbon that happens to carry one.",
          lookAt:
            "Compare the two paths atom by atom: hydrogen to carbon to oxygen against hydrogen to " +
            "carbon to carbon to oxygen. The shorter path wins.",
        },
      },
      {
        id: "declared-indistinguishable",
        state: { kind: "multiple_choice", optionId: "indistinguishable" },
        explanation: {
          whatHappened:
            "This treats the two signals as unassignable because their integration and multiplicity are identical.",
          why:
            "Integration and multiplicity are two of the four observables and shift is the third. " +
            "When the first two tie, shift is exactly the observable that breaks the tie, and a gap " +
            "of 1.7 parts per million is far larger than any ambiguity here.",
          lookAt:
            "Run the checklist in order and stop at the first observable that separates the " +
            "candidates. Here that is shift.",
        },
      },
    ],
    tags: ["nmr", "chemical-shift", "deshielding"],
  }),

  createProblem({
    id: "org2-structure-determination-c4h8o2",
    course: "orgo_2",
    topic: "structure_determination",
    difficulty: 1500,
    prompt:
      "A compound of formula C4H8O2 shows a strong infrared band at 1740 and nothing broad between " +
      "2500 and 3500. Its proton NMR has three signals: a three hydrogen singlet at 2.0, a two " +
      "hydrogen quartet at 4.1, and a three hydrogen triplet at 1.2. Which structure is it?",
    answer: createMultipleChoiceAnswer({
      options: [
        { id: "ethyl-acetate", text: "Ethyl acetate" },
        { id: "methyl-propanoate", text: "Methyl propanoate" },
        { id: "butanoic-acid", text: "Butanoic acid" },
        { id: "dioxane", text: "1,4-Dioxane" },
      ],
      correctOptionId: "ethyl-acetate",
    }),
    solution: {
      whatHappened:
        "Ethyl acetate. One degree of unsaturation, an ester carbonyl, and an ethyl group sitting " +
        "on the oxygen side.",
      why:
        "The formula gives one degree of unsaturation, which the 1740 band spends on a carbonyl, and " +
        "1740 rather than 1710 is the ester range. The empty region above 2500 rules out any O-H, so " +
        "both oxygens are already accounted for by the ester. The quartet and triplet are an ethyl " +
        "group, and the quartet at 4.1 is far downfield, which places that CH2 directly on oxygen. " +
        "The lone three hydrogen singlet has no neighbours, so it is the methyl on the carbonyl side.",
      lookAt:
        "The position of the quartet is what settles this. An ethyl on oxygen puts its CH2 near 4.1, " +
        "and an ethyl on a carbonyl carbon puts it near 2.3.",
    },
    distractors: [
      {
        id: "picked-the-isomer",
        state: { kind: "multiple_choice", optionId: "methyl-propanoate" },
        explanation: {
          whatHappened:
            "This is the constitutional isomer with the ethyl and methyl groups on the other sides of the ester.",
          why:
            "Methyl propanoate has the same formula, the same one degree of unsaturation, the same " +
            "1740 band, and the same three signal pattern with the same integrations. What differs " +
            "is where they fall: its CH2 sits near 2.3 because it is attached to the carbonyl carbon, " +
            "and its singlet sits near 3.7 because that methyl is attached to oxygen. The observed " +
            "spectrum has those two shifts the other way round.",
          lookAt:
            "When two isomers survive every other observable, compare the SHIFTS signal by signal " +
            "rather than the pattern as a whole. That is the isomer discrimination step.",
        },
      },
      {
        id: "picked-the-acid",
        state: { kind: "multiple_choice", optionId: "butanoic-acid" },
        explanation: {
          whatHappened: "This picks the carboxylic acid, which also has formula C4H8O2.",
          why:
            "A carboxylic acid would put a very broad O-H across 2500 to 3300, and the problem says " +
            "that region is empty. Its carbonyl also sits nearer 1710 than 1740, and its NMR would " +
            "show a far downfield acid proton beyond 10 parts per million with no coupling.",
          lookAt:
            "Read the absent bands as evidence. An empty 2500 to 3500 region removes acids, alcohols " +
            "and amines in one step.",
        },
      },
      {
        id: "picked-dioxane",
        state: { kind: "multiple_choice", optionId: "dioxane" },
        explanation: {
          whatHappened:
            "This picks the cyclic diether, which matches the empty O-H region and nothing else.",
          why:
            "1,4-Dioxane is C4H8O2 and its one degree of unsaturation is spent on the RING rather " +
            "than on a pi bond, so it has no carbonyl to produce the 1740 band. It is also fully " +
            "symmetric, which would give a single signal for all eight hydrogens instead of three.",
          lookAt:
            "Check the signal count against the candidate's symmetry early. Three signals with " +
            "integrations of 3, 2 and 3 rules out any structure with a mirror plane through the " +
            "middle.",
        },
      },
    ],
    tags: ["structure-determination", "isomer-discrimination"],
  }),
]);
