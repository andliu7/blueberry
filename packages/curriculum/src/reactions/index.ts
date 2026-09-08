/**
 * The reaction database. Data with a search function, not a model.
 *
 * CLAUDE.md lists reaction search as a product surface: "A database a student
 * can search by reagents or reactants when they do not know a reaction's name.
 * The lookup a real student actually performs the night before an exam."
 * BUILD-PROMPT.md Phase 3 files it in this package and fixes its shape.
 *
 * Read in this order:
 *
 *   types.ts       The row shape, the class vocabulary, and why conditions carry
 *                  a `decides` field.
 *   groups.ts      The [EQ] equivalence groups from the course outline, and the
 *                  three that carry a caveat because they sit on a near miss pair.
 *   reaction.ts    The constructor, and everything it refuses at import time.
 *   seed/          The authored rows.
 *   table.ts       The assembled table and its coverage report.
 *   search.ts      Three axes, all pure, all deterministic.
 */

export type {
  ChemicalClass,
  ConditionDimension,
  EquivalenceGroup,
  EquivalenceGroupId,
  Reaction,
  ReactionCondition,
  ReactionId,
  ReactionInput,
  ReagentSlot,
  ReagentSlotInput,
} from "./types.js";

export {
  EQUIVALENCE_GROUPS,
  allEquivalenceGroupIds,
  equivalenceGroup,
  equivalenceGroupCount,
} from "./groups.js";

export { createReaction, searchKey } from "./reaction.js";

export type { ReactionCoverage } from "./table.js";
export {
  ACT_1_REACTIONS,
  ACT_2_REACTIONS,
  NEAR_MISS_REACTIONS,
  REACTIONS,
  reactionCount,
  reactionCoverage,
} from "./table.js";

export type { MatchAxis, ReactionMatch } from "./search.js";
export {
  reactionById,
  reactionsForTopic,
  searchByClass,
  searchByName,
  searchByProductClass,
  searchByReagent,
  searchBySubstrateClass,
  searchReactions,
} from "./search.js";
