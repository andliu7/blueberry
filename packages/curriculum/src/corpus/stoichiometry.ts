/**
 * Stoichiometry. Two numeric problems and one multiple choice.
 *
 * BUILD-PROMPT.md Phase 3 names the limiting reactant problem as the example of
 * something that must not be routed through a mechanism validator. This is that
 * problem, authored here, graded here.
 */

import { createMultipleChoiceAnswer } from "../answers/choice.js";
import { createNumericAnswer } from "../answers/numeric.js";
import { createProblem, type Problem } from "../problem.js";

export const STOICHIOMETRY_PROBLEMS: readonly Problem[] = Object.freeze([
  createProblem({
    id: "gc1-stoich-limiting-water",
    course: "gen_chem_1",
    topic: "stoichiometry",
    difficulty: 1150,
    prompt:
      "5.00 g of hydrogen and 32.0 g of oxygen are ignited and react to form water. What mass of " +
      "water forms?",
    answer: createNumericAnswer({ text: "36.0", unit: "g" }),
    solution: {
      whatHappened:
        "Oxygen runs out first. 1.00 mol of oxygen makes 2.00 mol of water, which is 36.0 g.",
      why:
        "There are 2.48 mol of hydrogen and 1.00 mol of oxygen, and the balanced equation needs " +
        "them in a 2 to 1 ratio. That ratio would need 1.24 mol of oxygen, so oxygen is the one " +
        "that limits the yield and the leftover hydrogen sits there unreacted.",
      lookAt:
        "Convert both masses to moles, then divide each by its coefficient in the balanced " +
        "equation. The smaller result is the reactant that limits everything downstream.",
    },
    distractors: [
      {
        id: "hydrogen-assumed-limiting",
        state: { kind: "numeric", text: "44.7", unit: "g" },
        explanation: {
          whatHappened:
            "This is the water that 2.48 mol of hydrogen would make if there were enough oxygen for all of it.",
          why:
            "Hydrogen is the smaller mass but the larger number of moles, because a mole of it " +
            "weighs about 2 g against oxygen's 32 g. Comparing the masses rather than the moles " +
            "picks the wrong limiting reactant.",
          lookAt:
            "Grams never compare directly across two different substances. Convert to moles first, " +
            "then divide by the coefficients: 2.48 over 2 against 1.00 over 1.",
        },
      },
      {
        id: "masses-summed",
        state: { kind: "numeric", text: "37.0", unit: "g" },
        explanation: {
          whatHappened: "This is the two starting masses added together, 5.00 g plus 32.0 g.",
          why:
            "Mass is conserved overall, so that total is the mass of everything in the vessel " +
            "afterwards. Some of it is water and the rest is the hydrogen that had no oxygen left " +
            "to react with, and the question asks only for the water.",
          lookAt:
            "After finding the limiting reactant, carry ITS moles through the equation to the " +
            "product. The leftover reactant is worth computing too, and here it is 1.00 g of hydrogen.",
        },
      },
    ],
    tags: ["limiting-reactant"],
  }),

  createProblem({
    id: "gc1-stoich-dilution-volume",
    course: "gen_chem_1",
    topic: "solutions_and_concentration",
    difficulty: 900,
    prompt:
      "What volume of 6.00 M hydrochloric acid is needed to prepare 250. mL of 0.600 M " +
      "hydrochloric acid?",
    answer: createNumericAnswer({ text: "25.0", unit: "mL" }),
    solution: {
      whatHappened:
        "The dilution needs 25.0 mL of the concentrated acid, made up to 250. mL with water.",
      why:
        "Diluting adds solvent and adds no solute, so the moles of HCl before and after are the " +
        "same number. M1 V1 equals M2 V2 is that sentence written as arithmetic, and solving for V1 " +
        "gives 0.600 times 250. divided by 6.00.",
      lookAt:
        "The concentration falls by a factor of ten here, so the volume has to rise by a factor of " +
        "ten. Checking that the two factors match is faster than rechecking the arithmetic.",
    },
    distractors: [
      {
        id: "ratio-inverted",
        state: { kind: "numeric", text: "2500", unit: "mL" },
        explanation: {
          whatHappened:
            "This is 6.00 times 250. divided by 0.600, which is the concentration ratio applied the wrong way round.",
          why:
            "The stock is the STRONGER solution, so it takes less of it, not more. Taking 2500 mL " +
            "of 6.00 M acid and calling it 250 mL of dilute acid would need the volume to shrink " +
            "while the amount of acid grew.",
          lookAt:
            "Solve M1 V1 equals M2 V2 for V1 symbolically first. The unknown volume belongs with the " +
            "concentration it is paired with, and the stronger solution always takes the smaller volume.",
        },
      },
      {
        id: "multiplied-not-divided",
        state: { kind: "numeric", text: "150.", unit: "mL" },
        explanation: {
          whatHappened: "This is 0.600 multiplied by 250., with the division by 6.00 left out.",
          why:
            "0.600 times 250. is the number of millimoles of HCl the final solution needs, which is " +
            "150 mmol. That is a real quantity and a useful one, and turning it into a volume of " +
            "stock still needs dividing by the stock's concentration.",
          lookAt:
            "Track the units through the calculation. Molarity times volume gives moles, and moles " +
            "divided by molarity gives a volume back.",
        },
      },
    ],
    tags: ["dilution"],
  }),

  createProblem({
    id: "gc1-stoich-limiting-choice",
    course: "gen_chem_1",
    topic: "stoichiometry",
    difficulty: 1050,
    prompt:
      "1.00 mol of aluminium and 1.00 mol of chlorine gas are mixed and react as 2 Al + 3 Cl2 -> " +
      "2 AlCl3. Which reactant limits the yield?",
    answer: createMultipleChoiceAnswer({
      options: [
        { id: "chlorine", text: "The chlorine, Cl2" },
        { id: "aluminium", text: "The aluminium, Al" },
        { id: "neither", text: "Neither. They are present in exactly the right amounts" },
        { id: "need-masses", text: "This cannot be decided without knowing the masses" },
      ],
      correctOptionId: "chlorine",
    }),
    solution: {
      whatHappened: "The chlorine limits the yield, and 0.667 mol of AlCl3 forms.",
      why:
        "The equation needs three chlorines for every two aluminiums, so 1.00 mol of aluminium " +
        "wants 1.50 mol of chlorine and only 1.00 mol is there. Dividing each amount by its " +
        "coefficient gives 0.500 for aluminium and 0.333 for chlorine, and the smaller number is " +
        "the reactant that runs out.",
      lookAt:
        "Equal moles is not the same as balanced amounts. Divide each by its coefficient and " +
        "compare those two numbers.",
    },
    distractors: [
      {
        id: "picked-aluminium",
        state: { kind: "multiple_choice", optionId: "aluminium" },
        explanation: {
          whatHappened: "This picks the aluminium, which is the reactant with the smaller coefficient.",
          why:
            "A small coefficient means less of that substance is CONSUMED per reaction, so it goes " +
            "further rather than running out sooner. Here 1.00 mol of aluminium would need only " +
            "1.50 mol of chlorine, and the chlorine is what falls short.",
          lookAt:
            "Divide each amount by its own coefficient: 1.00 over 2 for aluminium and 1.00 over 3 " +
            "for chlorine. The smaller quotient names the limiting reactant.",
        },
      },
      {
        id: "picked-neither",
        state: { kind: "multiple_choice", optionId: "neither" },
        explanation: {
          whatHappened: "This reads equal moles of the two reactants as equal amounts in the reaction's terms.",
          why:
            "The coefficients are 2 and 3, so the reaction consumes them in a 2 to 3 ratio and not " +
            "a 1 to 1 ratio. Equal moles leaves 0.333 mol of aluminium unreacted once the chlorine " +
            "is gone.",
          lookAt:
            "Set the ratio of what is present against the ratio the equation asks for: 1.00 to 1.00 " +
            "against 2 to 3.",
        },
      },
      {
        id: "picked-need-masses",
        state: { kind: "multiple_choice", optionId: "need-masses" },
        explanation: {
          whatHappened: "This holds off on the comparison until the amounts are in grams.",
          why:
            "Moles are what the balanced equation counts, so amounts already in moles are ready to " +
            "compare. Converting to grams and back would give the same answer with two more chances " +
            "to slip.",
          lookAt:
            "When a problem hands over moles directly, go straight to dividing by the coefficients. " +
            "Masses matter when the question asks how much product forms by weight.",
        },
      },
    ],
    tags: ["limiting-reactant", "mole-ratio"],
  }),
]);
