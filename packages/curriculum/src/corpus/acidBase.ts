/**
 * Acid and base equilibria, and titration. Two numeric and one multiple choice.
 *
 * A NOTE ON THE pH PROBLEM AND SIGNIFICANT FIGURES, because it is the one place
 * in this corpus where the checker's rule and the chemistry convention are not
 * the same sentence. For a logarithm, the convention is that the number of
 * DECIMAL PLACES in the answer matches the number of significant figures in the
 * concentration. This package counts significant figures, not decimal places.
 * The two agree here because the answer has a single digit before the point, so
 * requiring 4 significant figures in "2.000" and requiring 3 decimal places are
 * the same requirement. They would part company at a pH of 12.000, and a log
 * aware policy is a named gap rather than something this corpus hides.
 */

import { createMultipleChoiceAnswer } from "../answers/choice.js";
import { createNumericAnswer } from "../answers/numeric.js";
import { createProblem, type Problem } from "../problem.js";

export const ACID_BASE_PROBLEMS: readonly Problem[] = Object.freeze([
  createProblem({
    id: "gc2-acid-ph-strong",
    course: "gen_chem_2",
    topic: "acid_base_equilibria",
    difficulty: 850,
    prompt: "What is the pH of 0.0100 M hydrochloric acid at 25 degrees Celsius?",
    answer: createNumericAnswer({ text: "2.000" }),
    solution: {
      whatHappened:
        "Hydrochloric acid is strong, so the hydronium concentration is 0.0100 M and the pH is 2.000.",
      why:
        "A strong acid is fully ionised in water, which is what lets the concentration on the " +
        "bottle be used directly as the hydronium concentration. pH is minus the base ten " +
        "logarithm of that, and minus log of 0.0100 is 2.",
      lookAt:
        "The three significant figures in 0.0100 become three decimal places in the pH, because " +
        "only the digits after the point in a logarithm carry precision.",
    },
    distractors: [
      {
        id: "reported-poh",
        state: { kind: "numeric", text: "12.000", unit: null },
        explanation: {
          whatHappened: "This is the pOH of the solution rather than the pH.",
          why:
            "pH and pOH add to 14.000 at 25 degrees Celsius, so an acidic solution has a low pH and " +
            "a high pOH. A value of 12 describes a strongly basic solution, and hydrochloric acid " +
            "is not one.",
          lookAt:
            "Sanity check the direction before writing the number down. An acid lands below 7 and a " +
            "base lands above it.",
        },
      },
      {
        id: "sign-dropped",
        state: { kind: "numeric", text: "-2.000", unit: null },
        cause: "sign_inverted",
        explanation: {
          whatHappened: "This is log of 0.0100 with the minus sign in the pH definition left off.",
          why:
            "The logarithm of a number smaller than one is negative, and the minus sign in the " +
            "definition is there to turn those into the positive scale that pH is read on.",
          lookAt:
            "pH equals minus log of the hydronium concentration. Any concentration below 1 M gives " +
            "a positive pH once that sign is applied.",
        },
      },
    ],
    tags: ["strong-acid", "log-precision"],
  }),

  createProblem({
    id: "gc2-titration-hcl-concentration",
    course: "gen_chem_2",
    topic: "titration_curves",
    difficulty: 1100,
    prompt:
      "25.00 mL of 0.1000 M sodium hydroxide exactly neutralises 20.00 mL of hydrochloric acid. " +
      "What is the concentration of the acid?",
    answer: createNumericAnswer({ text: "0.1250", unit: "M" }),
    solution: {
      whatHappened:
        "The base delivers 2.500 mmol of hydroxide, so the 20.00 mL of acid holds 2.500 mmol of " +
        "HCl, which is 0.1250 M.",
      why:
        "Sodium hydroxide and hydrochloric acid neutralise one for one, so the moles of each at the " +
        "endpoint are equal. The acid was in the smaller volume, so it has to be the more " +
        "concentrated of the two.",
      lookAt:
        "Compute millimoles rather than moles when volumes are in millilitres. It removes two " +
        "factors of a thousand that otherwise have to cancel by hand.",
    },
    distractors: [
      {
        id: "volume-ratio-inverted",
        state: { kind: "numeric", text: "0.08000", unit: "M" },
        explanation: {
          whatHappened:
            "This is 0.1000 times 20.00 divided by 25.00, which pairs each concentration with the other solution's volume.",
          why:
            "It takes a larger volume of the base to neutralise this acid, so the acid must be the " +
            "more concentrated one. An answer below 0.1000 M puts the stronger solution in the " +
            "larger volume.",
          lookAt:
            "Write the millimoles out before dividing: 25.00 mL times 0.1000 M is 2.500 mmol, and " +
            "that amount sits in 20.00 mL of acid.",
        },
      },
      {
        id: "assumed-equal-concentration",
        state: { kind: "numeric", text: "0.1000", unit: "M" },
        explanation: {
          whatHappened: "This carries the base's concentration across to the acid unchanged.",
          why:
            "The one to one stoichiometry means equal MOLES at the endpoint, not equal " +
            "concentrations. Equal concentrations would need equal volumes, and the volumes here " +
            "are 25.00 mL and 20.00 mL.",
          lookAt:
            "The two volumes being different is the signal that the two concentrations differ. Use " +
            "the volume ratio to say by how much.",
        },
      },
    ],
    tags: ["titration", "neutralisation"],
  }),

  createProblem({
    id: "gc2-titration-equivalence-ph",
    course: "gen_chem_2",
    topic: "titration_curves",
    difficulty: 1200,
    prompt:
      "Acetic acid is titrated with sodium hydroxide. What is true of the pH at the equivalence " +
      "point?",
    answer: createMultipleChoiceAnswer({
      options: [
        { id: "above-7", text: "It is above 7" },
        { id: "exactly-7", text: "It is exactly 7" },
        { id: "below-7", text: "It is below 7" },
        { id: "depends-volume", text: "It depends only on how much base was added" },
      ],
      correctOptionId: "above-7",
    }),
    solution: {
      whatHappened: "The pH at the equivalence point is above 7, typically between 8 and 9 here.",
      why:
        "At the equivalence point every acetic acid molecule has become acetate, and acetate is the " +
        "conjugate base of a weak acid, so it takes a proton back from water. That hydrolysis " +
        "produces hydroxide and pushes the solution basic.",
      lookAt:
        "Ask what species is left in the flask at the equivalence point, then ask whether that " +
        "species is acidic, basic, or neither. The answer follows from the species, not from the " +
        "volumes.",
    },
    distractors: [
      {
        id: "picked-exactly-7",
        state: { kind: "multiple_choice", optionId: "exactly-7" },
        explanation: {
          whatHappened: "This applies the strong acid with strong base result to a weak acid titration.",
          why:
            "A pH of exactly 7 at the equivalence point belongs to the case where both the acid and " +
            "the base are strong, because the ions left behind then are spectators. Acetate is not " +
            "a spectator: it reacts with water.",
          lookAt:
            "Name the salt in the flask at the equivalence point. Sodium chloride is neutral, and " +
            "sodium acetate is not.",
        },
      },
      {
        id: "picked-below-7",
        state: { kind: "multiple_choice", optionId: "below-7" },
        explanation: {
          whatHappened: "This carries the acidic starting solution through to the equivalence point.",
          why:
            "The solution starts acidic and the whole titration is the process of removing that " +
            "acidity. At the equivalence point the acid has all been converted, so what is left " +
            "cannot still be an excess of acid.",
          lookAt:
            "Trace the curve in three places: the start, the half equivalence point where pH equals " +
            "pKa, and the equivalence point. The pH only climbs across those three.",
        },
      },
      {
        id: "picked-depends-volume",
        state: { kind: "multiple_choice", optionId: "depends-volume" },
        explanation: {
          whatHappened: "This makes the equivalence point pH a function of the volume of base added.",
          why:
            "The volume of base decides WHERE the equivalence point falls on the horizontal axis. " +
            "The pH there is set by the acetate that has formed and by how dilute it is, so it is " +
            "the chemistry of the salt that fixes it above 7.",
          lookAt:
            "Separate the two questions: how much base reaches the equivalence point, and what the " +
            "pH is once it does. The second is about the species present.",
        },
      },
    ],
    tags: ["weak-acid", "equivalence-point"],
  }),
]);
