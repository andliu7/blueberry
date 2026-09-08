/**
 * The reagent boards, authored for the `matching` answer kind.
 *
 * Grouped by kind rather than by topic for the reason `corpus/ordering.ts`
 * gives: while the kind is new, every authored example of it is worth having in
 * one place, and a ProblemId never depended on which file it was written in.
 *
 * THE TWO BOARDS ARE DELIBERATELY DIFFERENT SHAPES, because the checker's near
 * miss depends on which shape it is.
 *
 *   `org2-match-oxidation-ladder` is a bijection: four reagents onto four
 *   transformations, one each. On a bijection exactly one wrong pair is
 *   impossible, since moving one prompt always displaces another, so the near
 *   miss is the SWAP and the board is authored around the two swaps students
 *   actually make. Every reagent on this board is on the oxidation ladder spine
 *   node, which is one of the pathway's required nodes that is not arrow
 *   pushing.
 *
 *   `org2-match-acyl-synthesis-jobs` allows target reuse: two of the four
 *   reagents do the same job, activation, and the other two do different ones.
 *   There exactly one wrong pair IS possible, and it is the common mistake:
 *   three reagents land and the fourth is on the wrong job.
 *
 * Both are the same question a student is really being asked in a synthesis
 * problem, which is what each thing in the flask is FOR. A reagent list is not
 * a spell.
 */

import { createMatchingAnswer } from "../answers/matching.js";
import { createProblem, type Problem } from "../problem.js";

export const MATCHING_PROBLEMS: readonly Problem[] = Object.freeze([
  createProblem({
    id: "org2-match-oxidation-ladder",
    course: "orgo_2",
    topic: "oxidation_and_reduction_ladder",
    difficulty: 1100,
    prompt:
      "Match each reagent to the one transformation it carries out. Every reagent here moves a " +
      "substrate one or more rungs along the oxidation ladder, and each does exactly one of these " +
      "four jobs.",
    answer: createMatchingAnswer({
      prompts: [
        { id: "pcc", text: "PCC in dichloromethane" },
        { id: "jones", text: "CrO3 in aqueous sulfuric acid" },
        { id: "nabh4", text: "NaBH4 in methanol" },
        { id: "lialh4", text: "LiAlH4, then aqueous workup" },
      ],
      targets: [
        { id: "job-aldehyde-stop", text: "Takes a primary alcohol up to the aldehyde and stops there" },
        { id: "job-all-the-way-up", text: "Takes a primary alcohol all the way up to the carboxylic acid" },
        { id: "job-ketone-only", text: "Takes a ketone down to the secondary alcohol and leaves an ester untouched" },
        { id: "job-ester-down", text: "Takes an ester down to the primary alcohol" },
      ],
      pairs: [
        { promptId: "pcc", targetId: "job-aldehyde-stop" },
        { promptId: "jones", targetId: "job-all-the-way-up" },
        { promptId: "nabh4", targetId: "job-ketone-only" },
        { promptId: "lialh4", targetId: "job-ester-down" },
      ],
    }),
    solution: {
      whatHappened:
        "PCC stops at the aldehyde, the aqueous chromic acid goes all the way to the carboxylic " +
        "acid, NaBH4 takes the ketone down and leaves the ester alone, and LiAlH4 takes the ester " +
        "down as well.",
      why:
        "Each row is really a question about strength and about water. The two oxidants differ by " +
        "the water: with water present the aldehyde becomes a hydrate, which has a C-H the oxidant " +
        "can take again, so the reaction runs on to the acid. PCC is used in dry dichloromethane, " +
        "so there is no hydrate to oxidise a second time. The two reducing agents differ by hydride " +
        "strength: NaBH4 is mild enough that it reaches a ketone and not an ester, and LiAlH4 is " +
        "strong enough to reach both.",
      lookAt:
        "Sort the four into oxidants and reducing agents first, then split each pair by the one " +
        "property that separates it: water for the oxidants, hydride strength for the reducing agents.",
    },
    distractors: [
      {
        id: "oxidants-exchanged",
        cause: "matching_pairs_swapped",
        state: {
          kind: "matching",
          pairs: [
            { promptId: "pcc", targetId: "job-all-the-way-up" },
            { promptId: "jones", targetId: "job-aldehyde-stop" },
            { promptId: "nabh4", targetId: "job-ketone-only" },
            { promptId: "lialh4", targetId: "job-ester-down" },
          ],
        },
        explanation: {
          whatHappened:
            "Both reducing agents are on the right job, and the two chromium oxidants are in each " +
            "other's places.",
          why:
            "These two are the same metal doing the same chemistry, so the solvent is the whole " +
            "difference and it is easy to look past. Aqueous acid lets the aldehyde pick up water " +
            "and become a hydrate, and that hydrate has a C-H for the oxidant to remove, which " +
            "carries it up to the carboxylic acid. PCC lives in dry dichloromethane, where no " +
            "hydrate can form, so the aldehyde is where it stops.",
          lookAt:
            "Read the solvent beside each oxidant. Water present means the reaction runs to the " +
            "acid, and anhydrous means it halts at the aldehyde.",
        },
      },
      {
        id: "hydrides-exchanged",
        cause: "matching_pairs_swapped",
        state: {
          kind: "matching",
          pairs: [
            { promptId: "pcc", targetId: "job-aldehyde-stop" },
            { promptId: "jones", targetId: "job-all-the-way-up" },
            { promptId: "nabh4", targetId: "job-ester-down" },
            { promptId: "lialh4", targetId: "job-ketone-only" },
          ],
        },
        explanation: {
          whatHappened:
            "Both oxidants are on the right job, and the two hydride reagents are in each other's " +
            "places.",
          why:
            "The two are ranked by how willingly the hydride leaves the metal. Aluminium holds " +
            "hydride more loosely than boron does, so LiAlH4 is the stronger of the two and reaches " +
            "an ester. NaBH4 is mild enough to be used in methanol and stops at aldehydes and " +
            "ketones, which is exactly what makes it the reagent for reducing a ketone in a " +
            "molecule that also carries an ester.",
          lookAt:
            "Rank the two by strength first, then match the stronger one to the harder job. The " +
            "ester is the harder job, because its carbonyl already carries a donating oxygen.",
        },
      },
      {
        id: "oxidants-and-reductants-crossed",
        cause: "matching_does_not_match",
        state: {
          kind: "matching",
          pairs: [
            { promptId: "pcc", targetId: "job-ketone-only" },
            { promptId: "jones", targetId: "job-ester-down" },
            { promptId: "nabh4", targetId: "job-aldehyde-stop" },
            { promptId: "lialh4", targetId: "job-all-the-way-up" },
          ],
        },
        explanation: {
          whatHappened:
            "Every reagent is on a job of the opposite kind: the two oxidants are on the two " +
            "reductions and the two hydrides are on the two oxidations.",
          why:
            "The direction is what to fix first, and it is readable straight off the reagent. " +
            "Chromium in a high oxidation state takes electrons, so it moves a substrate UP the " +
            "ladder toward more bonds to oxygen. A hydride reagent delivers H with its electron " +
            "pair, so it moves a substrate DOWN toward more bonds to hydrogen. Once the four are in " +
            "two piles the remaining choice inside each pile is a single comparison.",
          lookAt:
            "Label each of the four jobs as up or down before pairing anything, then label each " +
            "reagent the same way. Chromium is up and hydride is down.",
        },
      },
      {
        id: "strongest-reducer-left-unplaced",
        cause: "matching_board_incomplete",
        state: {
          kind: "matching",
          pairs: [
            { promptId: "pcc", targetId: "job-aldehyde-stop" },
            { promptId: "jones", targetId: "job-all-the-way-up" },
            { promptId: "nabh4", targetId: "job-ketone-only" },
          ],
        },
        explanation: {
          whatHappened:
            "Three reagents are placed and all three are right. LiAlH4 is still waiting, and so is " +
            "the ester reduction.",
          why:
            "One job left over and one reagent left over is a useful position to be in, because the " +
            "remaining pairing is forced. The ester is the hardest of these four substrates to " +
            "reduce, since its own oxygen already donates into the carbonyl, and LiAlH4 is the " +
            "strongest hydride source on the board.",
          lookAt:
            "Place the three you are sure of, then read what is left in each column. The last row " +
            "is decided by what remains rather than by a fresh comparison.",
        },
      },
    ],
    tags: ["oxidation-ladder", "reagent-role", "beat-matching"],
  }),

  createProblem({
    id: "org2-match-acyl-synthesis-jobs",
    course: "orgo_2",
    topic: "nucleophilic_acyl_substitution",
    difficulty: 1250,
    prompt:
      "A carboxylic acid is being turned into an amide. Match each thing in the flask to the job it " +
      "does. More than one reagent may do the same job.",
    answer: createMatchingAnswer({
      allowTargetReuse: true,
      prompts: [
        { id: "socl2", text: "SOCl2" },
        { id: "dcc", text: "DCC, a carbodiimide" },
        { id: "pyridine", text: "Pyridine" },
        { id: "ethylamine", text: "Ethylamine" },
      ],
      targets: [
        {
          id: "job-activate",
          text: "Turns the acid's OH into a group that will actually leave",
        },
        {
          id: "job-neutralise",
          text: "Takes up the acid produced, so the amine stays a free nucleophile",
        },
        { id: "job-nucleophile", text: "Supplies the nitrogen that ends up in the product" },
      ],
      pairs: [
        { promptId: "socl2", targetId: "job-activate" },
        { promptId: "dcc", targetId: "job-activate" },
        { promptId: "pyridine", targetId: "job-neutralise" },
        { promptId: "ethylamine", targetId: "job-nucleophile" },
      ],
    }),
    solution: {
      whatHappened:
        "SOCl2 and DCC both activate the acid, pyridine takes up the acid byproduct, and ethylamine " +
        "is the nucleophile.",
      why:
        "An amine attacking a carboxylic acid directly mostly makes a salt, because the acid " +
        "protonates the amine and a protonated amine has no lone pair left to attack with. The two " +
        "activators fix the leaving group: SOCl2 converts the OH into a chloride, and DCC converts " +
        "it into an O-acylisourea, and both of those depart far more willingly than hydroxide, " +
        "whose conjugate acid is water at about 16. Pyridine is there to hold the HCl that the " +
        "acylation releases, which keeps the amine unprotonated and the reaction moving.",
      lookAt:
        "Ask of each reagent whether it ends up in the product. The nucleophile does, the activator " +
        "leaves as a byproduct, and the base leaves as a salt.",
    },
    distractors: [
      {
        id: "pyridine-read-as-the-nucleophile",
        cause: "matching_one_pair_wrong",
        state: {
          kind: "matching",
          pairs: [
            { promptId: "socl2", targetId: "job-activate" },
            { promptId: "dcc", targetId: "job-activate" },
            { promptId: "pyridine", targetId: "job-nucleophile" },
            { promptId: "ethylamine", targetId: "job-nucleophile" },
          ],
        },
        explanation: {
          whatHappened:
            "Three of the four are on the right job, and pyridine is on the nucleophile row beside " +
            "ethylamine.",
          why:
            "Pyridine does carry a nitrogen lone pair, so reading it as a nucleophile is a fair " +
            "guess. That lone pair sits in an sp2 orbital in the ring plane and pyridine is a bulky, " +
            "weak nucleophile, so in this flask it takes the small proton rather than attacking a " +
            "crowded carbonyl carbon. It is also present to be spent: whatever it picks up leaves as " +
            "pyridinium chloride rather than as product.",
          lookAt:
            "Compare the two nitrogen reagents by what happens to them: ethylamine appears in the " +
            "amide and pyridine appears in the salt filtered off at the end.",
        },
      },
      {
        id: "dcc-read-as-a-base",
        cause: "matching_one_pair_wrong",
        state: {
          kind: "matching",
          pairs: [
            { promptId: "socl2", targetId: "job-activate" },
            { promptId: "dcc", targetId: "job-neutralise" },
            { promptId: "pyridine", targetId: "job-neutralise" },
            { promptId: "ethylamine", targetId: "job-nucleophile" },
          ],
        },
        explanation: {
          whatHappened:
            "Three of the four are on the right job, and DCC is on the row for taking up the acid " +
            "byproduct.",
          why:
            "DCC does take the acid's proton, which is what makes this a close call, and that proton " +
            "transfer is the first half of an activation rather than the end of the story. The " +
            "carboxylate it produces then adds straight onto the carbodiimide carbon, giving an " +
            "O-acylisourea whose leaving group is a stable urea. The tell is the byproduct: a base " +
            "that only mopped up acid would be recovered as a salt, and DCC comes out as " +
            "dicyclohexylurea, which means it was built into the intermediate.",
          lookAt:
            "Follow DCC through to what it becomes. Ending up as a urea means its carbon was part of " +
            "the leaving group.",
        },
      },
      {
        id: "activator-and-base-exchanged",
        cause: "matching_pairs_swapped",
        state: {
          kind: "matching",
          pairs: [
            { promptId: "socl2", targetId: "job-neutralise" },
            { promptId: "dcc", targetId: "job-activate" },
            { promptId: "pyridine", targetId: "job-activate" },
            { promptId: "ethylamine", targetId: "job-nucleophile" },
          ],
        },
        explanation: {
          whatHappened:
            "SOCl2 and pyridine are in each other's places, with the other two rows correct.",
          why:
            "Both of these appear together in so many procedures that they can read as one reagent, " +
            "and they do opposite jobs. SOCl2 is the electrophile: the acid's oxygen attacks sulfur, " +
            "and the OH leaves as SO2 and chloride, which is what converts the acid into an acid " +
            "chloride. Pyridine has no electrophilic centre to offer and is there for the HCl that " +
            "step releases.",
          lookAt:
            "Find the electrophilic atom in each reagent. SOCl2 has sulfur bonded to three " +
            "electronegative atoms, and pyridine has none.",
        },
      },
    ],
    tags: ["reagent-role", "amide-synthesis", "beat-matching"],
  }),
]);
