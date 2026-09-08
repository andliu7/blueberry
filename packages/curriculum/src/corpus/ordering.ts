/**
 * The ranked ladders, authored for the `ordering` answer kind.
 *
 * WHY THIS FILE IS GROUPED BY KIND WHERE THE REST OF THE CORPUS IS GROUPED BY
 * TOPIC. The two problems here sit on two different topic blocks,
 * `pka_and_acidity` in Act 0 and `nucleophilic_acyl_substitution` in Act 2, and
 * what they have in common is the shape rather than the chemistry. Keeping them
 * together while the kind is new means the first reader of `answers/ordering.ts`
 * has every authored example of it in one place. When either topic gets its own
 * authoring wave these move into that wave's file, and the ids do not change:
 * ids.ts makes a ProblemId stable forever, and the file a problem lives in was
 * never part of it.
 *
 * THE ACIDITY LADDER IS AUTHORED WITH A TIE IN IT, ON PURPOSE. pka.ts carries
 * phenol and the alpha C-H between two carbonyls at the same value, and
 * `mostAcidicSites` returns ties as ties rather than picking one. A ranking
 * problem over those two rungs has two right answers, and `acceptedAlternatives`
 * is where that is recorded. It is also the case that exercises the checker's
 * hardest rule: a submission can be two positions from one accepted ordering and
 * the exact reversal of another, and the reversal is the sentence worth saying.
 *
 * THE ACYL LADDER IS ONE OF THE SEVENTEEN. The pathway's remaining required
 * nodes are not arrow pushing, and the acyl reactivity ladder is on that list.
 * It is a rank, so this is the shape it was always going to need.
 *
 * `org2-pka-rank-four-acids` still exists as a multiple choice and is not
 * retired. It asks its ranking by offering four written out orders, which is
 * three of the twenty three wrong answers four items have; this one grades all
 * of them. Both are real problems and a student may meet either.
 */

import { createOrderingAnswer } from "../answers/ordering.js";
import { createProblem, type Problem } from "../problem.js";

export const ORDERING_PROBLEMS: readonly Problem[] = Object.freeze([
  createProblem({
    id: "org2-order-acidity-ladder",
    course: "orgo_2",
    topic: "pka_and_acidity",
    difficulty: 1300,
    prompt:
      "Put these four acidic sites in order, most acidic first: a carboxylic acid O-H, a phenol " +
      "O-H, the C-H between two carbonyls of a malonic ester, and the alpha C-H of a plain ketone. " +
      "Two of them sit on the same rung, so either order between those two is accepted.",
    answer: createOrderingAnswer({
      criterion: "most acidic",
      items: [
        { id: "carboxylic-acid", text: "A carboxylic acid O-H" },
        { id: "phenol", text: "A phenol O-H" },
        { id: "beta-dicarbonyl", text: "The C-H between the two carbonyls of a malonic ester" },
        { id: "ketone-alpha", text: "The alpha C-H of a plain ketone" },
      ],
      correctOrder: ["carboxylic-acid", "phenol", "beta-dicarbonyl", "ketone-alpha"],
      // The tie: pka.ts puts phenol and the beta dicarbonyl alpha C-H on the
      // same rung, so both orders between them are the same claim.
      acceptedAlternatives: [
        ["carboxylic-acid", "beta-dicarbonyl", "phenol", "ketone-alpha"],
      ],
    }),
    pkaSites: [
      { siteId: "carboxylic_acid", anchor: "the carboxylic acid O-H" },
      { siteId: "phenol", anchor: "the phenol O-H" },
      { siteId: "beta_dicarbonyl_alpha_ch", anchor: "the C-H between the two carbonyls" },
      { siteId: "ketone_alpha_ch", anchor: "the alpha C-H of the plain ketone" },
    ],
    solution: {
      whatHappened:
        "Carboxylic acid at about 5, then phenol and the malonic ester C-H level with each other at " +
        "about 10, then the plain ketone alpha C-H at about 20.",
      why:
        "Each rung is an argument about where the negative charge goes once the proton is gone. The " +
        "carboxylate splits its charge evenly between two oxygens, which is the best of the four. " +
        "The phenoxide spreads its charge into the ring, onto three carbons that hold it less " +
        "willingly than oxygen does. The malonic ester anion sits between two carbonyls and sends " +
        "its charge onto two oxygens, which is why one extra carbonyl is worth ten orders of " +
        "magnitude. A plain ketone enolate has only one carbonyl to lean on.",
      lookAt:
        "Draw all four conjugate bases side by side, then count the atoms sharing the charge and " +
        "note which element each one is. Two oxygens beats one oxygen, and oxygen beats carbon.",
    },
    distractors: [
      {
        id: "ranked-least-acidic-first",
        cause: "ordering_is_reversed",
        state: {
          kind: "ordering",
          order: ["ketone-alpha", "beta-dicarbonyl", "phenol", "carboxylic-acid"],
        },
        explanation: {
          whatHappened:
            "This is the right ladder, read from the other end: the plain ketone alpha C-H is first " +
            "and the carboxylic acid is last.",
          why:
            "The chemistry here is already sound, and every comparison in it holds. The prompt asks " +
            "for most acidic first, and most acidic means the lowest pKa, which is the smallest " +
            "number. That flip is easy to make, because a ladder is usually drawn with the big " +
            "numbers at the top.",
          lookAt:
            "Read the first position as the site a base takes a proton from first. On this list that " +
            "is the carboxylic acid at about 5.",
        },
      },
      {
        id: "plain-ketone-above-the-malonic-ester",
        cause: "ordering_one_adjacent_pair_swapped",
        state: {
          kind: "ordering",
          order: ["carboxylic-acid", "phenol", "ketone-alpha", "beta-dicarbonyl"],
        },
        explanation: {
          whatHappened:
            "The top two are placed correctly and the last two are exchanged, putting the plain " +
            "ketone alpha C-H above the malonic ester C-H.",
          why:
            "Both of those protons are alpha to a carbonyl, and the malonic ester C-H is alpha to " +
            "two. The second carbonyl gives the anion a second oxygen to put the charge on, which " +
            "is worth about ten orders of magnitude: about 10 against about 20. That single gap is " +
            "the reason the malonic ester synthesis runs with sodium ethoxide while a plain ketone " +
            "needs a much stronger base.",
          lookAt:
            "Count the carbonyls flanking each alpha carbon before ranking those two. One carbonyl " +
            "puts the site near 20 and two put it near 10.",
        },
      },
      {
        id: "malonic-ester-above-the-carboxylic-acid",
        cause: "ordering_one_adjacent_pair_swapped",
        state: {
          kind: "ordering",
          order: ["beta-dicarbonyl", "carboxylic-acid", "phenol", "ketone-alpha"],
        },
        explanation: {
          whatHappened:
            "This puts the malonic ester C-H first, ahead of the carboxylic acid, with the rest of " +
            "the ladder in an accepted order.",
          why:
            "Both anions spread their charge over two oxygens, so the two look alike on paper, and " +
            "the carboxylate still wins by five orders of magnitude. Its two oxygens are attached " +
            "directly to the carbon that lost the proton and they are identical, so the charge is " +
            "split evenly. The malonic ester anion has a carbon between it and each oxygen, so the " +
            "charge starts on carbon and is only shared outward from there.",
          lookAt:
            "Ask where the charge STARTS in each conjugate base. On the carboxylate it starts on " +
            "oxygen, and on the malonic ester anion it starts on carbon.",
        },
      },
    ],
    tags: ["ladder", "conjugate-base-stability", "beat-sort-the-cards"],
  }),

  createProblem({
    id: "org2-order-acyl-reactivity",
    course: "orgo_2",
    topic: "nucleophilic_acyl_substitution",
    difficulty: 1200,
    prompt:
      "Put these four carboxylic acid derivatives in order, most reactive toward nucleophilic acyl " +
      "substitution first: an ester, an amide, an acid chloride, and an anhydride.",
    answer: createOrderingAnswer({
      criterion: "most reactive toward nucleophilic acyl substitution",
      items: [
        { id: "acid-chloride", text: "An acid chloride" },
        { id: "anhydride", text: "An anhydride" },
        { id: "ester", text: "An ester" },
        { id: "amide", text: "An amide" },
      ],
      correctOrder: ["acid-chloride", "anhydride", "ester", "amide"],
    }),
    solution: {
      whatHappened: "Acid chloride, then anhydride, then ester, then amide.",
      why:
        "Two things move together down this ladder and they agree with each other. The leaving " +
        "group gets worse: chloride comes from HCl near minus 7, a carboxylate from an acid at " +
        "about 5, an alkoxide from an alcohol at about 16, and an amide anion from an amine at " +
        "about 35. At the same time the group donates more electron density back into the carbonyl, " +
        "so the carbon a nucleophile wants to attack becomes less electrophilic. Nitrogen donates " +
        "hardest, which is why the amide sits at the bottom on both counts.",
      lookAt:
        "For each derivative, name the leaving group and then name its conjugate acid's rung on the " +
        "pKa ladder. The reactivity order comes out in the same sequence as those four numbers.",
    },
    distractors: [
      {
        id: "ranked-least-reactive-first",
        cause: "ordering_is_reversed",
        state: { kind: "ordering", order: ["amide", "ester", "anhydride", "acid-chloride"] },
        explanation: {
          whatHappened:
            "This is the ladder built correctly and placed the other way up, with the amide first " +
            "and the acid chloride last.",
          why:
            "Every neighbouring comparison in this list is right, so the chemistry underneath is " +
            "already done. The prompt asks for most reactive first, and the acid chloride is the " +
            "one that reacts with water on the bench while the amide needs hours of hot acid.",
          lookAt:
            "Put the derivative that would react fastest with a drop of water in the first " +
            "position, and the ladder follows from there.",
        },
      },
      {
        id: "ester-above-the-anhydride",
        cause: "ordering_one_adjacent_pair_swapped",
        state: { kind: "ordering", order: ["acid-chloride", "ester", "anhydride", "amide"] },
        explanation: {
          whatHappened:
            "The acid chloride and the amide are at the right ends, and the ester and anhydride in " +
            "the middle are exchanged.",
          why:
            "These two are the closest pair on the ladder, so this is a fine place to be unsure. " +
            "The anhydride wins because its leaving group is a carboxylate, whose conjugate acid " +
            "sits at about 5, against an ester's alkoxide at about 16. Eleven orders of magnitude " +
            "of leaving group ability is what separates them, and it is also why an anhydride " +
            "acylates an amine at room temperature and an ester generally does not.",
          lookAt:
            "Compare the two leaving groups directly: a carboxylate against an alkoxide. The " +
            "carboxylate is the more stable anion, so it leaves more readily.",
        },
      },
      {
        id: "amide-above-the-ester",
        cause: "ordering_one_adjacent_pair_swapped",
        state: { kind: "ordering", order: ["acid-chloride", "anhydride", "amide", "ester"] },
        explanation: {
          whatHappened:
            "The first two are placed correctly and the last two are exchanged, putting the amide " +
            "above the ester.",
          why:
            "Nitrogen is the better electron donor of the two, and here that makes the amide LESS " +
            "reactive rather than more. Its lone pair is delocalised into the carbonyl, which takes " +
            "the edge off the carbon a nucleophile wants and leaves an amide anion as the departing " +
            "group. That anion's conjugate acid is an amine at about 35, nineteen rungs worse than " +
            "an alcohol at about 16.",
          lookAt:
            "Compare the two leaving groups by their conjugate acids: an amine at about 35 against " +
            "an alcohol at about 16. The lower number leaves first.",
        },
      },
    ],
    tags: ["ladder", "acyl-reactivity", "beat-sort-the-cards"],
  }),
]);
