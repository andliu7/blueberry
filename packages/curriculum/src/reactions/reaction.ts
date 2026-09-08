/**
 * The reaction constructor, and everything it refuses.
 *
 * Same pattern and same reasoning as `createProblem` in problem.ts: an authoring
 * defect in a data table is invisible on reading and produces a confusing
 * failure a long way from its cause, so it is refused at the moment the module
 * is imported. Importing the reaction table runs every one of these over every
 * row, which means a malformed table is a table that will not import, and the
 * validator suite's curriculum check turns that into a named failure rather than
 * a mystery.
 *
 * What it refuses, and why each one is worth a throw:
 *
 *   AN UNKNOWN TOPIC. `topicDefinition` throws. The reaction table and the 46
 *   topic pathway graph have to name the same topics or the search results
 *   cannot be filed under a lesson.
 *
 *   A SLOT THAT NAMES BOTH A GROUP AND ITS OWN TOKENS, OR NEITHER. A slot with
 *   both has two sources of truth for what fills it and no rule for which wins.
 *   A slot with neither is a reagent position nothing can fill, so the row is
 *   unreachable by the search this table exists for.
 *
 *   A CONDITION THAT DECIDES NOTHING. The outline makes conditions answer
 *   determining. A condition recorded with no statement of what it controls is
 *   decoration, and decoration in a reference table is worse than absence
 *   because a student reads it as load bearing.
 *
 *   A ROW WITH NO SUBSTRATE CLASS OR NO PRODUCT CLASS. Two of the three search
 *   axes run over those lists. A row missing one is reachable only by name,
 *   which is the one thing the student this table is for does not have.
 *
 *   A DUPLICATE TOKEN INSIDE ONE SLOT. Harmless to matching and a reliable sign
 *   of a copy paste, which is how a group's membership drifts from the outline.
 */

import { topicDefinition, type TopicId } from "../placement.js";
import { equivalenceGroup } from "./groups.js";
import type { Reaction, ReactionId, ReactionInput, ReagentSlot } from "./types.js";

/**
 * Whitespace normalisation only, and then a case fold.
 *
 * THIS IS DELIBERATELY NOT `normaliseReagent` FROM answers/reagents.ts, and the
 * difference is worth stating because the two look like they should be one
 * function. That one preserves case, and its own comment says why: CO and Co are
 * different things and GRADING a student's answer must never conflate them.
 * This one is a SEARCH key. The cost of folding case here is that a search for
 * "co" returns both CO and Co and the student picks; the cost of not folding it
 * is that a student who types "nabh4" is told the reaction does not exist. For a
 * lookup performed the night before an exam, those costs are not close.
 *
 * Nothing in this directory is on the grading path. If a reagent token from this
 * table is ever fed to `checkReagents`, it must go through that file's
 * normalisation and not this one.
 */
export function searchKey(token: string): string {
  return token.trim().replace(/\s+/g, " ").toLowerCase();
}

function resolveSlot(reactionId: ReactionId, index: number, input: ReactionInput["reagents"][number]): ReagentSlot {
  const hasGroup = input.group !== undefined;
  const hasTokens = input.anyOf !== undefined;

  if (hasGroup && hasTokens) {
    throw new Error(
      `reaction ${reactionId} slot ${index} ("${input.role}") names both the equivalence group ` +
        `${String(input.group)} and its own token list. One or the other, or the group stops ` +
        `being the one place its membership is written down.`,
    );
  }
  if (!hasGroup && !hasTokens) {
    throw new Error(
      `reaction ${reactionId} slot ${index} ("${input.role}") names neither a group nor any ` +
        `tokens, so nothing can fill it and no search can reach this row through it`,
    );
  }
  if (input.role.trim() === "") {
    throw new Error(`reaction ${reactionId} slot ${index} has no role, so the row cannot say what ` +
      `this reagent is doing`);
  }

  // Throws on an unknown group id.
  const tokens = hasGroup
    ? equivalenceGroup(input.group as NonNullable<typeof input.group>).members
    : (input.anyOf as readonly string[]);

  if (tokens.length === 0) {
    throw new Error(`reaction ${reactionId} slot ${index} ("${input.role}") resolves to no tokens`);
  }

  const seen = new Set<string>();
  for (const token of tokens) {
    if (token.trim() === "") {
      throw new Error(`reaction ${reactionId} slot ${index} ("${input.role}") has an empty token`);
    }
    const key = searchKey(token);
    if (seen.has(key)) {
      throw new Error(
        `reaction ${reactionId} slot ${index} ("${input.role}") lists "${token}" twice. A ` +
          `duplicate changes no match and is a reliable sign of a copy paste`,
      );
    }
    seen.add(key);
  }

  return Object.freeze({
    role: input.role,
    ...(hasGroup ? { group: input.group } : {}),
    anyOf: Object.freeze([...tokens]),
  });
}

export function createReaction(input: ReactionInput): Reaction {
  if (input.id.trim() === "") throw new Error("a reaction needs an id");
  if (input.name.trim() === "") throw new Error(`reaction ${input.id} has an empty name`);
  if (input.transformation.trim() === "") {
    throw new Error(
      `reaction ${input.id} states no transformation. A row that does not say what becomes what ` +
        `teaches nothing to the student who looked it up`,
    );
  }

  // Throws on an unknown topic. Keeps the table and the pathway graph in step.
  const topic = topicDefinition(input.topic);

  if (input.substrateClasses.length === 0) {
    throw new Error(`reaction ${input.id} names no substrate class, so no student can find it from ` +
      `what they started with`);
  }
  if (input.productClasses.length === 0) {
    throw new Error(`reaction ${input.id} names no product class, so no student can find it from ` +
      `what they need to make`);
  }
  if (input.reagents.length === 0) {
    throw new Error(`reaction ${input.id} names no reagents, which is the first search axis`);
  }

  for (const alias of input.aliases ?? []) {
    if (alias.trim() === "") throw new Error(`reaction ${input.id} has an empty alias`);
  }

  for (const condition of input.conditions) {
    if (condition.value.trim() === "") {
      throw new Error(`reaction ${input.id} has a ${condition.dimension} condition with no value`);
    }
    if (condition.decides.trim() === "") {
      throw new Error(
        `reaction ${input.id} records the ${condition.dimension} condition "${condition.value}" ` +
          `and does not say what it decides. The outline makes conditions answer determining, so ` +
          `a condition that decides nothing is decoration a student will read as load bearing.`,
      );
    }
  }

  const reagents = input.reagents.map((slot, index) => resolveSlot(input.id, index, slot));

  return Object.freeze({
    id: input.id,
    name: input.name,
    aliases: Object.freeze([...(input.aliases ?? [])]),
    transformation: input.transformation,
    substrateClasses: Object.freeze([...input.substrateClasses]),
    productClasses: Object.freeze([...input.productClasses]),
    reagents: Object.freeze(reagents),
    conditions: Object.freeze(input.conditions.map((condition) => Object.freeze({ ...condition }))),
    topic: input.topic as TopicId,
    ...(topic.act === undefined ? {} : { act: topic.act }),
    course: topic.course,
    ...(input.note === undefined ? {} : { note: input.note }),
  });
}
