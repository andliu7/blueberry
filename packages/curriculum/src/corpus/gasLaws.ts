/**
 * Gas laws. Three numeric problems.
 *
 * These are the reason this package exists. CLAUDE.md: "Most of the curriculum
 * is not mechanism chemistry. Gas laws, thermodynamics, kinetics, titration
 * curves, stoichiometry, and spectroscopy interpretation do not touch chem-core
 * at all." Nothing in this file imports chem-core, and nothing in it should.
 *
 * Every distractor here is a real mistake with a reason behind it, not a
 * plausible looking number. That is the difference between a distractor that
 * teaches and one that pads the option list: an author who cannot say WHY a
 * student would produce this number has not written a distractor.
 */

import { createNumericAnswer } from "../answers/numeric.js";
import { createProblem, type Problem } from "../problem.js";

export const GAS_LAW_PROBLEMS: readonly Problem[] = Object.freeze([
  createProblem({
    id: "gc1-gas-boyle-compression",
    course: "gen_chem_1",
    topic: "gas_laws",
    difficulty: 800,
    prompt:
      "A sealed 2.50 L sample of neon is at 1.00 atm. It is compressed to 1.25 L at constant " +
      "temperature. What is the new pressure?",
    answer: createNumericAnswer({ text: "2.00", unit: "atm" }),
    solution: {
      whatHappened: "Halving the volume at constant temperature doubles the pressure, giving 2.00 atm.",
      why:
        "The same number of neon atoms now hit half as much wall area, so each unit of wall takes " +
        "twice the collisions. That is Boyle's law, and it is why P times V stays constant here.",
      lookAt:
        "The check worth keeping: the volume went down, so the pressure has to go up. Any answer " +
        "below 1.00 atm is the ratio applied the other way round.",
    },
    distractors: [
      {
        id: "inverted-ratio",
        state: { kind: "numeric", text: "0.500", unit: "atm" },
        cause: "reciprocal_of_expected_value",
        explanation: {
          whatHappened:
            "This is 1.00 atm times 1.25 over 2.50, which is the volume ratio applied upside down.",
          why:
            "Pressure and volume move in opposite directions at constant temperature, so the new " +
            "pressure is the old one times the ratio of the OLD volume to the new one.",
          lookAt:
            "Write P1 V1 equals P2 V2 and solve for P2 before putting numbers in. It comes out as " +
            "P1 times V1 over V2, and the larger volume is on top.",
        },
      },
      {
        id: "pressure-unchanged",
        state: { kind: "numeric", text: "1.00", unit: "atm" },
        explanation: {
          whatHappened: "This is the starting pressure, carried through unchanged.",
          why:
            "Constant temperature is not constant pressure. Temperature is being held fixed so that " +
            "pressure and volume are free to trade against each other, which is the whole point of " +
            "the experiment.",
          lookAt:
            "Check which quantity the problem says is held constant, and then which two are left to " +
            "change. Here it is pressure and volume.",
        },
      },
    ],
    tags: ["boyle"],
  }),

  createProblem({
    id: "gc1-gas-ideal-volume",
    course: "gen_chem_1",
    topic: "gas_laws",
    difficulty: 950,
    prompt:
      "What volume does 0.250 mol of an ideal gas occupy at 273 K and 1.00 atm? Use R = 0.08206 " +
      "L atm per mol per K.",
    answer: createNumericAnswer({ text: "5.60", unit: "L" }),
    solution: {
      whatHappened:
        "V equals nRT over P, so 0.250 times 0.08206 times 273 divided by 1.00 gives 5.60 L.",
      why:
        "The ideal gas law ties all four quantities together, so once three are fixed the fourth " +
        "has only one value. Rearranging before substituting keeps the units visible: mol cancels " +
        "against R's mol, K cancels against K, and atm cancels against atm, leaving litres.",
      lookAt:
        "A quarter of a mole at these conditions should be about a quarter of 22.4 L. That estimate " +
        "lands on 5.6 and is worth doing before reaching for the calculator.",
    },
    distractors: [
      {
        id: "molar-volume-unscaled",
        state: { kind: "numeric", text: "22.4", unit: "L" },
        explanation: {
          whatHappened: "This is the molar volume at these conditions, which is the volume of one full mole.",
          why:
            "22.4 L is what nRT over P gives when n is 1. There is a quarter of a mole here, so the " +
            "volume is a quarter of it.",
          lookAt:
            "The 22.4 figure is a useful anchor and it always needs multiplying by the number of " +
            "moles. Here that is 0.250.",
        },
      },
      {
        id: "room-temperature-substituted",
        state: { kind: "numeric", text: "6.11", unit: "L" },
        explanation: {
          whatHappened: "This is the right calculation run at 298 K instead of the 273 K the problem gives.",
          why:
            "Volume is proportional to absolute temperature at fixed pressure, so a 25 K difference " +
            "in what goes in moves the answer by about nine percent.",
          lookAt:
            "298 K is the room temperature default that most problems use, and this one does not. " +
            "Read the temperature off the question before substituting.",
        },
      },
    ],
    tags: ["ideal-gas-law"],
  }),

  createProblem({
    id: "gc1-gas-partial-pressure",
    course: "gen_chem_1",
    topic: "gas_laws",
    difficulty: 1000,
    prompt:
      "A vessel holds 0.400 mol of nitrogen and 0.200 mol of oxygen at a total pressure of 1.20 " +
      "atm. What is the partial pressure of the oxygen?",
    answer: createNumericAnswer({ text: "0.400", unit: "atm" }),
    solution: {
      whatHappened:
        "Oxygen is 0.200 of the 0.600 mol present, so it carries a third of the total: 0.400 atm.",
      why:
        "Each gas exerts the pressure it would exert alone in the same vessel, so the share of the " +
        "total pressure is the share of the molecules. That is Dalton's law and the mole fraction " +
        "is what carries it.",
      lookAt:
        "Add the partial pressures back up as a check. 0.800 atm for nitrogen plus 0.400 atm for " +
        "oxygen returns the 1.20 atm the problem gives.",
    },
    distractors: [
      {
        id: "nitrogen-partial-pressure",
        state: { kind: "numeric", text: "0.800", unit: "atm" },
        explanation: {
          whatHappened: "This is the partial pressure of the nitrogen, which is the other gas in the vessel.",
          why:
            "Nitrogen is two thirds of the molecules and oxygen is one third, so the two partial " +
            "pressures are 0.800 atm and 0.400 atm. The arithmetic here is right and it answers the " +
            "other half of the question.",
          lookAt:
            "Underline which gas the question asks about before computing the fraction, and check " +
            "that the smaller amount of gas came out with the smaller pressure.",
        },
      },
      {
        id: "split-evenly",
        state: { kind: "numeric", text: "0.600", unit: "atm" },
        explanation: {
          whatHappened: "This is half the total pressure, which is what two gases would contribute if there were equal amounts of each.",
          why:
            "Partial pressure follows the number of moles, not the number of different gases. There " +
            "is twice as much nitrogen here, so the split is two to one rather than even.",
          lookAt:
            "Compute the mole fraction first, 0.200 over 0.600, and then multiply the total pressure " +
            "by it.",
        },
      },
    ],
    tags: ["dalton", "partial-pressure"],
  }),
]);
