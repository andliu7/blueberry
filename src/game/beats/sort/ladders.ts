/**
 * The four ladders this beat plays, and the one shape that carries them.
 *
 * WHY A SORT BEAT IS BACKED BY A CURRICULUM PROBLEM. The beat type in
 * ../types.ts describes what to DRAW: cards, rungs, a criterion, a direction.
 * It carries no distractors and no solution copy, because a beat is a surface
 * and grading is not a surface concern. packages/curriculum already owns the
 * whole grading story for a ranked list: `checkOrdering` names the near miss,
 * `gradeAttempt` runs CLAUDE.md's tier order over it, and an authored
 * distractor arrives with an instructor's explanation attached. So a
 * `SortContent` is the pair: the beat the view renders, and the problem the
 * judge grades against, with the beat's items and order DERIVED from the
 * problem's answer spec so the two cannot drift apart. Editing the ladder means
 * editing one list.
 *
 * WHERE THE CONTENT COMES FROM, and it is two places for one reason. Two of
 * these ladders already exist in the curriculum corpus, authored with real
 * distractors and reviewed copy: the acidity ladder and the acyl reactivity
 * ladder. Those are read, never retyped. The oxidation ladder and the basicity
 * against nucleophilicity ladder have no ordering problem in the corpus yet, so
 * they are authored here in the same `createProblem` call the corpus uses,
 * which means they pass the same voice lint and the same distractor checks at
 * import time. When packages/curriculum is next opened these two should move
 * into its corpus; the ids stay, because a ProblemId is stable forever and the
 * file a problem lives in was never part of it. That move is recorded as an
 * integration note rather than done from here, since this agent does not own
 * that package.
 *
 * WHAT `direction` MEANS, because it is the one field that reads two ways. It
 * is the direction of the underlying VALUE along the authored order, not the
 * direction of the prompt. `authoredOrderConflicts` compares it against a value
 * lookup, so the acidity ladder is `pka` and `ascending`: most acidic first
 * means lowest pKa first, and the numbers rise as you go down the track even
 * though the acidity falls. Getting this backwards would make the professor
 * adjustable pKa check report a conflict on every correctly authored ladder.
 *
 * THE SEVENTEEN. CLAUDE.md and STATUS.md record seventeen required pathway
 * nodes that are not arrow pushing. Four of them are ladders and all four are
 * here: the alpha proton pKa hierarchy, the acyl reactivity ladder, the
 * oxidation ladder, and basicity against nucleophilicity.
 */

import {
  ORDERING_PROBLEMS,
  createOrderingAnswer,
  createProblem,
  type DistractorId,
  type OrderingAnswerSpec,
  type PkaSiteId,
  type Problem,
} from "@blueberry/curriculum";
import type {
  BeatId,
  BeatShapeCauseId,
  ConceptId,
  MasteryLevel,
  NodeId,
  SortBeat,
  SortCriterion,
  SortItem,
} from "../types";

/**
 * The two ends of the track, in the student's words.
 *
 * `first` is `OrderingAnswerSpec.criterion`, which the curriculum package
 * already requires for exactly this reason: a track with unlabelled ends is a
 * coin flip. `last` cannot be derived from it, because the opposite of "most
 * reactive toward nucleophilic acyl substitution" is a sentence and not a
 * negation, so it is authored beside it.
 */
export interface TrackEnds {
  readonly first: string;
  readonly last: string;
}

/**
 * What an authored distractor MEANS in beat terms.
 *
 * The curriculum checker names what the submission looks like: one adjacent
 * pair exchanged, or the whole thing reversed. That is true and it is not
 * always the most useful thing to say. Ranking four nucleophiles by basicity
 * happens to differ from the nucleophilicity answer by one adjacent swap, and
 * "these two traded places" is a much smaller claim than "this is the basicity
 * ladder, and here is the one pair where the two rankings disagree". So a
 * distractor may declare the shape cause it really represents, plus the name of
 * what the student actually built, which is what CLAUDE.md's result type three
 * requires a `valid_not_requested` outcome to carry.
 */
export interface DistractorMeaning {
  readonly id: DistractorId;
  readonly cause: BeatShapeCauseId;
  /** Named for the student. Present only when the answer is a sound different ladder. */
  readonly built?: string;
}

/** One item's authored extras: why it sits where it sits, and its pKa link if it has one. */
export interface ItemNote {
  readonly why: string;
  readonly pkaSiteId?: PkaSiteId;
}

export interface SortContent {
  readonly beat: SortBeat;
  /** The grading half. Never rendered directly; the judge reads it. */
  readonly problem: Problem;
  readonly spec: OrderingAnswerSpec;
  readonly trackEnds: TrackEnds;
  readonly distractorMeanings: readonly DistractorMeaning[];
}

interface SortContentInput {
  readonly problem: Problem;
  readonly beatId: BeatId;
  readonly node: NodeId;
  readonly conceptIds: readonly ConceptId[];
  readonly levels: readonly MasteryLevel[];
  readonly criterion: SortCriterion;
  readonly direction: "ascending" | "descending";
  readonly prompt: string;
  readonly brief: string;
  readonly diamonds: number;
  readonly trackEnds: TrackEnds;
  /** Keyed by item id. Every item needs one: a card with no reason is a card nobody learns from. */
  readonly notes: Readonly<Record<string, ItemNote>>;
  readonly distractorMeanings?: readonly DistractorMeaning[];
  readonly sourceExam?: string;
}

/**
 * Build one piece of content, refusing a mismatch rather than rendering it.
 *
 * The authoring path throws and the grading path reports, which is the split
 * chem-core, packages/interaction and packages/curriculum all already use. A
 * beat whose problem is not an ordering, or an item with no authored reason, is
 * an authoring defect, and the earliest it can surface is when this module is
 * imported.
 */
function sortContent(input: SortContentInput): SortContent {
  const { answer } = input.problem;
  if (answer.kind !== "ordering") {
    throw new Error(
      `sort beat ${input.beatId} is backed by problem ${input.problem.id}, whose answer is a ` +
        `${answer.kind}. A sort beat grades through the ordering answer kind and nothing else.`,
    );
  }
  const items: SortItem[] = answer.items.map((item) => {
    const note = input.notes[item.id];
    if (note === undefined) {
      throw new Error(
        `sort beat ${input.beatId} has no authored note for item ${item.id}. Every card says why ` +
          `it sits where it sits once the attempt is judged.`,
      );
    }
    return Object.freeze({
      id: item.id,
      label: item.text,
      why: note.why,
      ...(note.pkaSiteId === undefined ? {} : { pkaSiteId: note.pkaSiteId }),
    });
  });

  const knownDistractors = new Set(input.problem.distractors.map((distractor) => distractor.id));
  for (const meaning of input.distractorMeanings ?? []) {
    if (!knownDistractors.has(meaning.id)) {
      throw new Error(
        `sort beat ${input.beatId} declares a meaning for distractor ${meaning.id}, which problem ` +
          `${input.problem.id} does not carry. A meaning that matches nothing is never shown.`,
      );
    }
  }

  const beat: SortBeat = Object.freeze({
    kind: "sort" as const,
    id: input.beatId,
    node: input.node,
    conceptIds: Object.freeze([...input.conceptIds]),
    levels: Object.freeze([...input.levels]),
    prompt: input.prompt,
    brief: input.brief,
    diamonds: input.diamonds,
    criterion: input.criterion,
    direction: input.direction,
    items: Object.freeze(items),
    order: Object.freeze([...answer.correctOrder]),
    ...(input.sourceExam === undefined ? {} : { sourceExam: input.sourceExam }),
  });

  return Object.freeze({
    beat,
    problem: input.problem,
    spec: answer,
    trackEnds: Object.freeze({ ...input.trackEnds }),
    distractorMeanings: Object.freeze([...(input.distractorMeanings ?? [])]),
  });
}

/** Read one corpus problem by id, refusing a miss rather than rendering an empty track. */
function corpusOrdering(id: string): Problem {
  const found = ORDERING_PROBLEMS.find((problem) => problem.id === id);
  if (found === undefined) {
    throw new Error(
      `no ordering problem ${id} in the curriculum corpus. A sort beat pointing at a problem that ` +
        `does not exist would render an empty track.`,
    );
  }
  return found;
}

/* ------------------------------------------------------------------ */
/* The two ladders the corpus already carries                           */
/* ------------------------------------------------------------------ */

const ACIDITY_LADDER = sortContent({
  problem: corpusOrdering("org2-order-acidity-ladder"),
  beatId: "sort-pka-hierarchy",
  node: "pka_and_acidity",
  conceptIds: ["pka_keq_viability", "conjugate_base_stability_argument"],
  levels: [2, 3],
  // The value behind this ladder is a pKa, and pKa RISES as acidity falls, so
  // the authored order ascends. See the header note on `direction`.
  criterion: "pka",
  direction: "ascending",
  prompt: "Rank these four acidic sites, most acidic at the top.",
  brief:
    "Two of them sit on the same rung, so either order between those two is accepted.",
  diamonds: 12,
  trackEnds: { first: "Most acidic", last: "Least acidic" },
  notes: {
    "carboxylic-acid": {
      pkaSiteId: "carboxylic_acid",
      why: "Two identical oxygens split the charge evenly, which is the best home of the four.",
    },
    phenol: {
      pkaSiteId: "phenol",
      why: "The charge spreads into the ring, onto carbons that hold it less willingly than oxygen.",
    },
    "beta-dicarbonyl": {
      pkaSiteId: "beta_dicarbonyl_alpha_ch",
      why: "Two flanking carbonyls send the charge onto two oxygens. Level with the phenol.",
    },
    "ketone-alpha": {
      pkaSiteId: "ketone_alpha_ch",
      why: "One carbonyl to lean on, so about ten orders of magnitude below the malonic ester.",
    },
  },
  distractorMeanings: [
    { id: "ranked-least-acidic-first", cause: "order_fully_reversed", built: "the same ladder, least acidic first" },
    { id: "plain-ketone-above-the-malonic-ester", cause: "order_adjacent_pair_swapped" },
    { id: "malonic-ester-above-the-carboxylic-acid", cause: "order_adjacent_pair_swapped" },
  ],
});

const ACYL_LADDER = sortContent({
  problem: corpusOrdering("org2-order-acyl-reactivity"),
  beatId: "sort-acyl-reactivity",
  node: "nucleophilic_acyl_substitution",
  conceptIds: ["acyl_reactivity_ladder"],
  levels: [2, 3],
  criterion: "acyl_reactivity",
  direction: "descending",
  prompt: "Rank these four derivatives, fastest to react at the top.",
  brief: "Name each leaving group first, then place the card.",
  diamonds: 12,
  trackEnds: { first: "Reacts first", last: "Reacts last" },
  notes: {
    "acid-chloride": {
      why: "Chloride leaves best of the four, and chlorine donates almost nothing back to the carbonyl.",
    },
    anhydride: {
      why: "A carboxylate leaving group, whose conjugate acid sits near 5. It acylates an amine cold.",
    },
    ester: {
      why: "An alkoxide leaving group near 16, eleven rungs worse than the anhydride's carboxylate.",
    },
    amide: {
      why: "Nitrogen donates hardest into the carbonyl, and its leaving group is worst at about 35.",
    },
  },
  distractorMeanings: [
    { id: "ranked-least-reactive-first", cause: "order_fully_reversed", built: "the same ladder, least reactive first" },
    { id: "ester-above-the-anhydride", cause: "order_adjacent_pair_swapped" },
    { id: "amide-above-the-ester", cause: "order_adjacent_pair_swapped" },
  ],
});

/* ------------------------------------------------------------------ */
/* The two the corpus does not carry yet, authored here                 */
/* ------------------------------------------------------------------ */

const OXIDATION_LADDER = sortContent({
  problem: createProblem({
    id: "web-order-oxidation-ladder",
    course: "orgo_2",
    topic: "oxidation_and_reduction_ladder",
    difficulty: 1150,
    prompt:
      "Put these four carbons in order of oxidation level, most oxidised first: an alkane C-H, a " +
      "primary alcohol, an aldehyde, and a carboxylic acid.",
    answer: createOrderingAnswer({
      criterion: "most oxidised",
      items: [
        { id: "carboxylic-acid", text: "A carboxylic acid" },
        { id: "aldehyde", text: "An aldehyde" },
        { id: "alcohol", text: "A primary alcohol" },
        { id: "alkane", text: "An alkane C-H" },
      ],
      correctOrder: ["carboxylic-acid", "aldehyde", "alcohol", "alkane"],
    }),
    solution: {
      whatHappened:
        "Carboxylic acid, then aldehyde, then primary alcohol, then the alkane C-H at the bottom.",
      why:
        "Count the bonds from that carbon to oxygen and the ladder falls out. The acid carbon holds " +
        "three, the aldehyde carbon two, the alcohol carbon one, and the alkane carbon none. Each " +
        "step up is one oxidation, and each step down is one reduction, which is why PCC stops at " +
        "the aldehyde and aqueous chromic acid carries on to the acid.",
      lookAt:
        "Draw each carbon and count its bonds to oxygen, counting a double bond as two. Those four " +
        "counts are the four rungs, in order.",
    },
    distractors: [
      {
        id: "ranked-least-oxidised-first",
        cause: "ordering_is_reversed",
        state: {
          kind: "ordering",
          order: ["alkane", "alcohol", "aldehyde", "carboxylic-acid"],
        },
        explanation: {
          whatHappened:
            "This is the right ladder read from the other end, with the alkane first and the acid last.",
          why:
            "Every comparison in it holds, so the chemistry is already sound. The prompt asks for " +
            "most oxidised at the top, and most oxidised is the carbon with the most bonds to " +
            "oxygen. That is the acid carbon with three.",
          lookAt:
            "Put the carbon holding three bonds to oxygen in the first position, and the rest " +
            "follow down from there.",
        },
      },
      {
        id: "aldehyde-above-the-acid",
        cause: "ordering_one_adjacent_pair_swapped",
        state: {
          kind: "ordering",
          order: ["aldehyde", "carboxylic-acid", "alcohol", "alkane"],
        },
        explanation: {
          whatHappened:
            "The bottom two rungs are placed correctly and the top two are exchanged, putting the " +
            "aldehyde above the carboxylic acid.",
          why:
            "The aldehyde carbon carries a double bond to one oxygen, so two bonds to oxygen in " +
            "total. The acid carbon carries that same double bond plus a single bond to the O-H " +
            "oxygen, so three. Three beats two, and that one extra bond is the whole difference " +
            "between an aldehyde and the acid it oxidises to.",
          lookAt:
            "Count bonds to oxygen on those two carbons alone, a double bond counting as two. The " +
            "aldehyde gives 2 and the acid gives 3.",
        },
      },
      {
        id: "alkane-above-the-alcohol",
        cause: "ordering_one_adjacent_pair_swapped",
        state: {
          kind: "ordering",
          order: ["carboxylic-acid", "aldehyde", "alkane", "alcohol"],
        },
        explanation: {
          whatHappened:
            "The top two rungs are right and the bottom two are exchanged, putting the alkane C-H " +
            "above the primary alcohol.",
          why:
            "The alcohol carbon has one bond to oxygen and the alkane carbon has none, so the " +
            "alcohol sits one rung higher. It is a small gap and it is a real one: turning an " +
            "alkane C-H into an alcohol is an oxidation, which is why it takes a reagent and does " +
            "not simply happen.",
          lookAt:
            "Compare those two carbons directly. One carries an O-H and one carries only hydrogens.",
        },
      },
    ],
    tags: ["ladder", "oxidation-level", "beat-sort-the-cards"],
  }),
  beatId: "sort-oxidation-ladder",
  node: "oxidation_and_reduction_ladder",
  conceptIds: ["oxidation_state_ladder"],
  levels: [2, 3],
  criterion: "oxidation_level",
  direction: "descending",
  prompt: "Rank these four carbons, most oxidised at the top.",
  brief: "Count each carbon's bonds to oxygen, a double bond counting as two.",
  diamonds: 12,
  trackEnds: { first: "Most oxidised", last: "Least oxidised" },
  notes: {
    "carboxylic-acid": { why: "Three bonds to oxygen: the carbonyl double bond plus the O-H oxygen." },
    aldehyde: { why: "Two bonds to oxygen, both of them the carbonyl double bond." },
    alcohol: { why: "One bond to oxygen. Reaching it from the alkane is already an oxidation." },
    alkane: { why: "No bonds to oxygen at all, so it is the floor of the ladder." },
  },
  distractorMeanings: [
    { id: "ranked-least-oxidised-first", cause: "order_fully_reversed", built: "the same ladder, least oxidised first" },
    { id: "aldehyde-above-the-acid", cause: "order_adjacent_pair_swapped" },
    { id: "alkane-above-the-alcohol", cause: "order_adjacent_pair_swapped" },
  ],
});

const NUCLEOPHILICITY_LADDER = sortContent({
  problem: createProblem({
    id: "web-order-nucleophilicity-protic",
    course: "orgo_2",
    topic: "nucleophiles_and_leaving_groups",
    difficulty: 1350,
    prompt:
      "In a polar protic solvent such as ethanol, rank these four by nucleophilicity, most " +
      "nucleophilic first: hydroxide, hydrosulfide, fluoride, and water.",
    answer: createOrderingAnswer({
      criterion: "most nucleophilic in a polar protic solvent",
      items: [
        { id: "hydrosulfide", text: "HS minus, hydrosulfide" },
        { id: "hydroxide", text: "HO minus, hydroxide" },
        { id: "fluoride", text: "F minus, fluoride" },
        { id: "water", text: "H2O, water" },
      ],
      correctOrder: ["hydrosulfide", "hydroxide", "fluoride", "water"],
    }),
    solution: {
      whatHappened: "Hydrosulfide, then hydroxide, then fluoride, then water.",
      why:
        "Basicity is about holding a proton at equilibrium and nucleophilicity is about reaching a " +
        "carbon quickly, and in a protic solvent the two ladders come apart. Sulfur is large and " +
        "polarisable, its electrons are held loosely, and the solvent shell around it is weak, so " +
        "hydrosulfide attacks fastest even though it is the weaker base of the top two. Fluoride is " +
        "small and hard, and hydrogen bonds cage it so tightly that it barely reacts. Water is " +
        "neutral, so it comes last on both counts.",
      lookAt:
        "For each one, name its size and whether it carries a charge, then picture how many solvent " +
        "hydrogen bonds it has to shed before it can reach the carbon.",
    },
    distractors: [
      {
        id: "ranked-by-basicity",
        cause: "ordering_one_adjacent_pair_swapped",
        state: {
          kind: "ordering",
          order: ["hydroxide", "hydrosulfide", "fluoride", "water"],
        },
        explanation: {
          whatHappened:
            "This is the basicity ladder. Hydroxide is the stronger base of the top two, and here " +
            "it is placed as the stronger nucleophile as well.",
          why:
            "Ranking by basicity is a sound piece of work and it answers the other question. The " +
            "conjugate acids give the basicity order directly: water at about 15.7 against hydrogen " +
            "sulfide at about 7, so hydroxide is the stronger base. Nucleophilicity in a protic " +
            "solvent is a rate, and sulfur wins it: bigger, more polarisable, and far less tightly " +
            "solvated. The bottom two rungs are the same either way, which is why only this one " +
            "pair moves.",
          lookAt:
            "Compare hydroxide and hydrosulfide on size and solvation rather than on conjugate acid " +
            "pKa. In a protic solvent the loosely held sulfur electrons reach the carbon first.",
        },
      },
      {
        id: "ranked-least-nucleophilic-first",
        cause: "ordering_is_reversed",
        state: {
          kind: "ordering",
          order: ["water", "fluoride", "hydroxide", "hydrosulfide"],
        },
        explanation: {
          whatHappened:
            "The ladder is built correctly and placed the other way up, with water first and " +
            "hydrosulfide last.",
          why:
            "Every neighbouring comparison in it is right, so the ranking work is done. The prompt " +
            "asks for the fastest attacker at the top, and that is hydrosulfide, the one that " +
            "displaces a bromide in minutes at room temperature.",
          lookAt:
            "Put the species that would substitute fastest on bromoethane in the first position.",
        },
      },
      {
        id: "fluoride-below-water",
        cause: "ordering_one_adjacent_pair_swapped",
        state: {
          kind: "ordering",
          order: ["hydrosulfide", "hydroxide", "water", "fluoride"],
        },
        explanation: {
          whatHappened:
            "The top two rungs are right and the bottom two are exchanged, putting neutral water " +
            "above fluoride.",
          why:
            "Fluoride is a poor nucleophile in a protic solvent and it is still an anion, so it " +
            "carries a full negative charge into the attack while water carries none. Solvation " +
            "slows fluoride down a long way, and it does not slow it past neutral water.",
          lookAt:
            "Check the charge on each of those two first. An anion outruns its neutral counterpart " +
            "unless something else is doing the work.",
        },
      },
    ],
    tags: ["ladder", "nucleophilicity", "basicity", "beat-sort-the-cards"],
  }),
  beatId: "sort-basicity-vs-nucleophilicity",
  node: "nucleophiles_and_leaving_groups",
  // The curriculum concept registry has no entry for this one yet, so the id
  // is authored here. Reported as an integration note rather than invented in
  // a package this agent does not own.
  conceptIds: ["nucleophilicity_vs_basicity"],
  levels: [2, 3],
  criterion: "nucleophilicity",
  direction: "descending",
  prompt: "In ethanol, rank these four by how fast they attack, fastest at the top.",
  brief: "This is a rate, not an equilibrium, so the basicity ladder is not the answer here.",
  diamonds: 14,
  trackEnds: { first: "Attacks fastest", last: "Attacks slowest" },
  notes: {
    hydrosulfide: {
      why: "Big and polarisable, weakly solvated, so its electrons reach the carbon first.",
    },
    hydroxide: {
      why: "The stronger base of the top two, and the slower nucleophile here. Small and well solvated.",
    },
    fluoride: {
      why: "Small, hard, and caged by hydrogen bonds. Still an anion, so it stays above water.",
    },
    water: { why: "Neutral, so it comes last on both the basicity and the nucleophilicity ladder." },
  },
  distractorMeanings: [
    // The submission looks like one adjacent swap and it IS the basicity
    // ladder, which is a different question answered soundly. That is
    // CLAUDE.md result type three, so it carries the name of what was built.
    {
      id: "ranked-by-basicity",
      cause: "order_used_a_different_criterion",
      built: "the basicity ladder",
    },
    {
      id: "ranked-least-nucleophilic-first",
      cause: "order_fully_reversed",
      built: "the same ladder, slowest first",
    },
    { id: "fluoride-below-water", cause: "order_adjacent_pair_swapped" },
  ],
});

export const SORT_LADDERS: readonly SortContent[] = Object.freeze([
  ACIDITY_LADDER,
  ACYL_LADDER,
  OXIDATION_LADDER,
  NUCLEOPHILICITY_LADDER,
]);

export function sortContentById(beatId: BeatId): SortContent | undefined {
  return SORT_LADDERS.find((content) => content.beat.id === beatId);
}

/** The ladders authored for one pathway node. A node with none returns empty. */
export function sortContentForNode(node: NodeId): readonly SortContent[] {
  return SORT_LADDERS.filter((content) => content.beat.node === node);
}

/**
 * The sort beat backing one corpus problem, or undefined.
 *
 * For the lesson player, which walks a topic's problems and needs to know
 * whether an `ordering` problem has a playable ladder behind it. It looks the
 * problem up rather than converting one, on purpose: a SortBeat needs a
 * `SortCriterion` from a closed union and a label for the far end of the track,
 * and neither can be derived from a problem that does not carry them. Guessing
 * either would put an unreviewed label on a student's screen, so a problem with
 * no authored beat returns undefined and the caller says so plainly.
 */
export function sortContentForProblem(problemId: string): SortContent | undefined {
  return SORT_LADDERS.find((content) => content.problem.id === problemId);
}
