/**
 * The three non mechanism answer shapes from CLAUDE.md, authored.
 *
 * One major product problem, one predict the product, and three reagent
 * problems: an unordered set, an ordered synthesis, and an ordered
 * retrosynthesis. The last two are the same shape with `direction` set
 * differently, which is CLAUDE.md's rule that a synthesis is the reagent shape
 * read backwards and must not become a fifth shape.
 *
 * This is the only corpus file that imports chem-core, and it imports it for one
 * problem: the structures in `org1-sn2-predict-product`. Every other problem
 * here is text and option ids. That ratio is the point of the package.
 *
 * The structures are deliberately small and deliberately carry no stereo
 * declaration, because answers/structure.ts compares constitution only and
 * problem.ts refuses to build a structure answer that declares stereochemistry.
 * An SN2 inversion problem is therefore NOT authorable here yet and belongs in
 * chem-core as a mechanism, which is where CLAUDE.md's hard assertion about SN2
 * inverting already lives.
 */

import { createAtom, createBond, createSpecies, createState } from "@blueberry/chem-core";
import { createMajorProductAnswer } from "../answers/choice.js";
import { createReagentsAnswer } from "../answers/reagents.js";
import { createStructureAnswer } from "../answers/structure.js";
import { createProblem, type Problem } from "../problem.js";

const ethanol = createSpecies({
  id: "sp-ethanol",
  atoms: [
    createAtom({ id: "c1", element: "C", implicitHydrogens: 3 }),
    createAtom({ id: "c2", element: "C", implicitHydrogens: 2 }),
    createAtom({ id: "o1", element: "O", lonePairs: 2, implicitHydrogens: 1 }),
  ],
  bonds: [
    createBond({ id: "b1", a: "c1", b: "c2" }),
    createBond({ id: "b2", a: "c2", b: "o1" }),
  ],
  label: "ethanol",
});

const ethene = createSpecies({
  id: "sp-ethene",
  atoms: [
    createAtom({ id: "c1", element: "C", implicitHydrogens: 2 }),
    createAtom({ id: "c2", element: "C", implicitHydrogens: 2 }),
  ],
  bonds: [createBond({ id: "b1", a: "c1", b: "c2", order: 2 })],
  label: "ethene",
});

const ethoxide = createSpecies({
  id: "sp-ethoxide",
  atoms: [
    createAtom({ id: "c1", element: "C", implicitHydrogens: 3 }),
    createAtom({ id: "c2", element: "C", implicitHydrogens: 2 }),
    createAtom({ id: "o1", element: "O", lonePairs: 3, formalCharge: -1 }),
  ],
  bonds: [
    createBond({ id: "b1", a: "c1", b: "c2" }),
    createBond({ id: "b2", a: "c2", b: "o1" }),
  ],
  label: "ethoxide",
});

export const ORGANIC_PROBLEMS: readonly Problem[] = Object.freeze([
  createProblem({
    id: "org1-hbr-markovnikov-major",
    course: "orgo_1",
    topic: "alkene_addition",
    difficulty: 1250,
    prompt:
      "2-methylbut-2-ene is treated with hydrogen bromide, with no peroxides present. Which is the " +
      "major product, and what makes it the major one?",
    answer: createMajorProductAnswer({
      candidates: [
        { id: "tertiary-bromide", text: "2-bromo-2-methylbutane" },
        { id: "secondary-bromide", text: "2-bromo-3-methylbutane" },
        { id: "primary-bromide", text: "1-bromo-2-methylbutane" },
      ],
      reasons: [
        {
          id: "cation-stability",
          text: "The proton adds so as to leave the more stable tertiary carbocation, which bromide then traps",
        },
        { id: "less-hindered", text: "Bromide attacks whichever carbon is less crowded" },
        { id: "peroxide-rule", text: "Peroxides reverse the selectivity of hydrogen bromide addition" },
      ],
      correctCandidateId: "tertiary-bromide",
      correctReasonId: "cation-stability",
    }),
    solution: {
      whatHappened:
        "The bromine ends up on the more substituted carbon, giving 2-bromo-2-methylbutane, and " +
        "carbocation stability is what puts it there.",
      why:
        "The proton adds first, and it adds to the carbon that leaves the better cation behind. " +
        "Protonating C3 gives a tertiary cation at C2, stabilised by three alkyl groups donating " +
        "electron density into the empty p orbital. Bromide then captures that cation. Markovnikov's " +
        "rule is the summary of this and cation stability is the mechanism underneath it.",
      lookAt:
        "Draw both cations before picking a product. The comparison between them is the step that " +
        "decides the outcome, and it is the same comparison in every electrophilic addition.",
    },
    distractors: [
      {
        id: "anti-markovnikov-product",
        state: { kind: "major_product", candidateId: "secondary-bromide", reasonId: null },
        explanation: {
          whatHappened:
            "This puts the bromine on the less substituted carbon, which is the anti Markovnikov result.",
          why:
            "That outcome is real and it needs peroxides, because peroxides switch the mechanism " +
            "from ionic to radical and a bromine RADICAL adds first instead of a proton. The " +
            "question says no peroxides are present, so the ionic pathway is the one running and " +
            "the cation decides.",
          lookAt:
            "Check the conditions line for peroxides, light, or a radical initiator before choosing " +
            "an orientation. With hydrogen bromide those words change the answer.",
        },
      },
      {
        id: "primary-product",
        state: { kind: "major_product", candidateId: "primary-bromide", reasonId: null },
        explanation: {
          whatHappened: "This puts the bromine on a terminal carbon that the double bond never reaches.",
          why:
            "The double bond in 2-methylbut-2-ene runs between C2 and C3, so addition can only put " +
            "the new groups on those two carbons. C1 keeps the hydrogens it already had.",
          lookAt:
            "Number the chain and mark which two carbons the pi bond joins. Addition changes those " +
            "two and leaves the rest alone.",
        },
      },
      {
        id: "right-product-steric-argument",
        state: { kind: "major_product", candidateId: "tertiary-bromide", reasonId: "less-hindered" },
        cause: "right_product_wrong_reason",
        explanation: {
          whatHappened:
            "The product is right, and the argument attached to it is a steric one that would pick the other product.",
          why:
            "The tertiary carbon is the MORE crowded of the two, so a rule about attacking the less " +
            "hindered carbon points at 2-bromo-3-methylbutane. What actually decides this reaction " +
            "is which cation forms in the first step, and the tertiary one wins on electronics " +
            "despite the crowding.",
          lookAt:
            "Test an argument by asking what it would predict on its own. If it points somewhere " +
            "else, it is not the reason, even when the product is right.",
        },
      },
    ],
    tags: ["markovnikov", "carbocation"],
  }),

  createProblem({
    id: "org1-sn2-predict-product",
    course: "orgo_1",
    topic: "substitution_and_elimination",
    difficulty: 1050,
    prompt:
      "Bromoethane is warmed with sodium hydroxide in water. Draw the organic product only, leaving " +
      "out the bromide ion and the sodium.",
    answer: createStructureAnswer(
      createState({
        id: "st-sn2-product",
        members: [{ species: ethanol, role: "product" }],
      }),
    ),
    solution: {
      whatHappened: "Hydroxide replaces bromide at the carbon it was attached to, giving ethanol.",
      why:
        "Hydroxide is a strong nucleophile and bromide is a good leaving group, and the carbon " +
        "carrying the bromine is primary, so there is room for the nucleophile to reach the back " +
        "side. That combination is the SN2 substitution, and the oxygen takes the place the bromine " +
        "left in a single step.",
      lookAt:
        "Track the carbon skeleton across the reaction. Two carbons in, two carbons out: " +
        "substitution changes what is attached, not how many carbons there are.",
    },
    distractors: [
      {
        id: "elimination-product",
        state: {
          kind: "structure",
          state: createState({ id: "st-ethene", members: [{ species: ethene, role: "product" }] }),
        },
        explanation: {
          whatHappened: "This is ethene, the product of eliminating hydrogen bromide rather than substituting.",
          why:
            "Hydroxide can act as a base as well as a nucleophile, and elimination is a genuine " +
            "competing pathway. It wins on hindered substrates, with a bulky base, and at higher " +
            "temperature. On a primary carbon with hydroxide in water, substitution is the one that " +
            "gets there first.",
          lookAt:
            "Compare the substrate's class and the conditions side by side. Primary plus a strong " +
            "nucleophile in water favours substitution, and tertiary plus a bulky base favours " +
            "elimination.",
        },
      },
      {
        id: "alkoxide-product",
        state: {
          kind: "structure",
          state: createState({ id: "st-ethoxide", members: [{ species: ethoxide, role: "product" }] }),
        },
        // The formula cause, not the charge cause: ethoxide differs from
        // ethanol by a whole proton, and the formula check fires before the
        // charge check. createProblem now refuses a declaration the checker
        // contradicts, which is how this line got corrected.
        cause: "structure_molecular_formula_differs",
        explanation: {
          whatHappened:
            "This is the ethoxide ion, which is ethanol with its hydroxyl proton removed and a negative charge on the oxygen.",
          why:
            "Hydroxide attacks the carbon here, not a proton. Ethoxide would need something to " +
            "remove the hydrogen from the new hydroxyl group, and in water the equilibrium sits " +
            "hard on the neutral alcohol because water is the weaker acid of the two.",
          lookAt:
            "Count the charge on the product. The starting material was neutral and hydroxide gave " +
            "up its charge to bromide, so the organic product comes out neutral too.",
        },
      },
    ],
    tags: ["sn2", "substitution"],
  }),

  createProblem({
    id: "org1-alkene-bromination-reagent",
    course: "orgo_1",
    topic: "alkene_addition",
    difficulty: 900,
    prompt:
      "Cyclohexene is converted to trans-1,2-dibromocyclohexane in one step, in dichloromethane. " +
      "What reagent does it take?",
    answer: createReagentsAnswer({
      mode: "set",
      steps: [{ reagents: ["Br2"] }],
      equivalents: [["Br2", "bromine"]],
    }),
    solution: {
      whatHappened: "Bromine alone does it. The alkene attacks Br2 and both bromines end up across the former double bond.",
      why:
        "The pi electrons attack one bromine and push the other off as bromide, and the bromine " +
        "left behind bridges both carbons as a cyclic bromonium ion. Bromide then opens that bridge " +
        "from the opposite face, which is what makes the two bromines end up trans to each other.",
      lookAt:
        "The word trans in the product name is the clue that a bridged intermediate is involved. " +
        "Additions that go through a cyclic ion add anti, every time.",
    },
    distractors: [
      {
        id: "hydrogen-bromide",
        state: { kind: "reagents", steps: [{ reagents: ["HBr"] }] },
        explanation: {
          whatHappened: "Hydrogen bromide adds one bromine and one hydrogen, giving bromocyclohexane.",
          why:
            "The target has bromine on two neighbouring carbons, so both new groups have to be " +
            "bromine, and that means the reagent has to supply two of them. HBr supplies one.",
          lookAt:
            "Count the atoms the product gained against the starting material. Two bromines added " +
            "and no hydrogens points straight at Br2.",
        },
      },
      {
        id: "bromine-in-water",
        state: { kind: "reagents", steps: [{ reagents: ["Br2", "H2O"] }] },
        explanation: {
          whatHappened:
            "Bromine with water present gives the bromohydrin, with bromine on one carbon and a hydroxyl on the other.",
          why:
            "Water is a nucleophile too, and once the bromonium ion forms it is in large excess " +
            "against the bromide that just left. It opens the bridge first, so the second group " +
            "added is a hydroxyl rather than a bromine.",
          lookAt:
            "The solvent is part of the answer in this reaction. Dichloromethane keeps water out so " +
            "bromide is the only nucleophile available.",
        },
      },
    ],
    tags: ["halogenation", "anti-addition"],
  }),

  createProblem({
    id: "org2-meta-bromonitrobenzene-synthesis",
    course: "orgo_2",
    topic: "aromatic_substitution",
    difficulty: 1450,
    prompt:
      "Starting from benzene, give the two steps in order that produce 1-bromo-3-nitrobenzene as " +
      "the major product.",
    answer: createReagentsAnswer({
      mode: "sequence",
      direction: "forward",
      steps: [
        { reagents: ["HNO3", "H2SO4"], label: "nitration" },
        { reagents: ["Br2", "FeBr3"], label: "bromination" },
      ],
      equivalents: [["FeBr3", "AlBr3"]],
    }),
    solution: {
      whatHappened:
        "Nitrate first, then brominate. The nitro group is already on the ring when the bromine " +
        "arrives, and it sends the bromine to the meta position.",
      why:
        "A nitro group pulls electron density out of the ring, and it pulls hardest from the ortho " +
        "and para positions, which leaves the meta position as the most electron rich site left. So " +
        "the second electrophile goes meta. Order is the whole problem here: whichever group is " +
        "installed first decides where the second one lands.",
      lookAt:
        "Ask which group is the director in each ordering, then check what that director wants. " +
        "Nitro directs meta and bromine directs ortho and para, so only one order reaches a 1,3 " +
        "product.",
    },
    distractors: [
      {
        id: "brominate-first",
        state: {
          kind: "reagents",
          steps: [{ reagents: ["Br2", "FeBr3"] }, { reagents: ["HNO3", "H2SO4"] }],
        },
        cause: "synthesis_steps_out_of_order",
        explanation: {
          whatHappened:
            "These are the right two steps in the other order, which gives the 1,2 and 1,4 products instead.",
          why:
            "Bromine on a ring is an ortho and para director. Its lone pairs donate into the ring " +
            "by resonance, which builds up electron density at the positions next to it and across " +
            "from it, so the nitro group arriving second goes to one of those rather than meta.",
          lookAt:
            "Write down what each group directs before ordering the steps. The group that goes on " +
            "FIRST is the one whose directing effect matters.",
        },
      },
      {
        id: "one-pot",
        state: {
          kind: "reagents",
          steps: [{ reagents: ["HNO3", "H2SO4", "Br2", "FeBr3"] }],
        },
        cause: "synthesis_step_count_wrong",
        explanation: {
          whatHappened: "This puts all four reagents in one flask together.",
          why:
            "Two electrophiles competing for the same ring gives a mixture: some rings get " +
            "brominated first and some get nitrated first, and the two orders lead to different " +
            "products. Separating the steps is what makes one of them the major product rather than " +
            "one of several.",
          lookAt:
            "When a substitution pattern depends on which group arrives first, the steps have to be " +
            "separated so that the order is something you control.",
        },
      },
    ],
    tags: ["eas", "directing-effects"],
  }),

  createProblem({
    id: "org2-alkyne-alkylation-retro",
    course: "orgo_2",
    topic: "alkyne_chemistry",
    difficulty: 1400,
    prompt:
      "Pent-2-yne is the target. Working back from it to prop-1-yne, give the reagents in the order " +
      "they are used.",
    answer: createReagentsAnswer({
      mode: "sequence",
      direction: "retrosynthesis",
      steps: [
        { reagents: ["NaNH2"], label: "deprotonate the terminal alkyne" },
        { reagents: ["CH3CH2Br"], label: "alkylate the acetylide" },
      ],
      equivalents: [
        ["NaNH2", "sodium amide"],
        ["CH3CH2Br", "CH3CH2I"],
      ],
    }),
    solution: {
      whatHappened:
        "Take the terminal hydrogen off with sodium amide, then let the acetylide attack " +
        "bromoethane. That builds the new carbon to carbon bond and gives pent-2-yne.",
      why:
        "A terminal alkyne's hydrogen has a pKa near 25, which is acidic enough for amide to remove " +
        "and not for weaker bases. What is left is an acetylide, a carbon nucleophile, and it does " +
        "an SN2 on a primary alkyl halide. Both parts have to happen in that order because the " +
        "alkyne is not nucleophilic until it has been deprotonated.",
      lookAt:
        "Count the carbons on each side. Three in the starting material and five in the target, so " +
        "one step has to form a bond to a two carbon piece.",
    },
    distractors: [
      {
        id: "alkylate-first",
        state: {
          kind: "reagents",
          steps: [{ reagents: ["CH3CH2Br"] }, { reagents: ["NaNH2"] }],
        },
        cause: "synthesis_steps_out_of_order",
        explanation: {
          whatHappened: "This offers bromoethane to the alkyne before the base has been anywhere near it.",
          why:
            "A neutral alkyne is a weak nucleophile and bromoethane is a weak electrophile, so " +
            "nothing happens in the first step. The deprotonation is what converts the alkyne into " +
            "a carbon nucleophile strong enough to displace bromide.",
          lookAt:
            "Ask which species is nucleophilic at each step. The acetylide is, and it only exists " +
            "after the base has acted.",
        },
      },
      {
        id: "hydroxide-as-base",
        state: {
          kind: "reagents",
          steps: [{ reagents: ["NaOH"] }, { reagents: ["CH3CH2Br"] }],
        },
        explanation: {
          whatHappened: "This uses hydroxide as the base in the deprotonation step.",
          why:
            "The order is right and the base is not strong enough. Water has a pKa near 16 and a " +
            "terminal alkyne near 25, so hydroxide taking that proton would be uphill by about nine " +
            "orders of magnitude and almost no acetylide would ever form.",
          lookAt:
            "Compare the pKa of the acid being formed against the acid being removed. A " +
            "deprotonation runs when the base's conjugate acid is the WEAKER one, which is why " +
            "amide at pKa 38 works here.",
        },
      },
    ],
    tags: ["acetylide", "alkylation", "retrosynthesis"],
  }),
]);
