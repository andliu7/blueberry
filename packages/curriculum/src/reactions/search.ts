/**
 * The search half of "data with a search function, not a model".
 *
 * Every function here is pure, total, and deterministic. Nothing caches, nothing
 * scores by frequency, nothing learns. Two calls with the same query on the same
 * table return an identically ordered array, which is what makes the near miss
 * tests in test/reactions.test.ts assertions rather than samples.
 *
 * THREE AXES, AND WHY EACH MATCHES DIFFERENTLY.
 *
 *   reagent   EXACT token match, case folded. A student who half remembers a
 *             reagent types the whole thing, and substring matching here would
 *             be actively harmful: "Br2" is a substring of nothing useful, but
 *             "H2" is a substring of "H2SO4" and "H2O2", and a search for
 *             hydrogen gas that returns every sulfuric acid reaction is a search
 *             nobody uses twice. Equivalence is handled by the slot, not by
 *             fuzziness: a slot that opted into a group carries every member of
 *             that group in its own `anyOf`, so searching AlBr3 reaches the
 *             bromination the textbook wrote with FeBr3 without any lookup here.
 *
 *   class     WORD-START match, case folded: the query must appear in the
 *             class phrase starting at a word boundary. This is what makes
 *             "alcohol" reach "primary alcohol" and "tertiary alcohol" with no
 *             hierarchy modelled anywhere, and it is the reason the
 *             ChemicalClass union is written as English phrases. It is
 *             word-start rather than raw substring because an adversary pass
 *             found the collision the header of this file only speculated
 *             about: "amine" is a substring of "enamine", an unrelated
 *             functional group, so a raw substring search for amine chemistry
 *             surfaced acetal hydrolysis. A prefix still works ("alco" finds
 *             the alcohols), and "enam" still finds the enamines; what no
 *             longer happens is a match that starts mid-word.
 *
 *   name      SUBSTRING match over the name and every alias, case folded. The
 *             student who remembers "something Kishner" finds it.
 *
 * WHY THE NEAR MISS PAIRS ARE A PROPERTY OF THE DATA AND NOT OF THIS FILE.
 *
 * `docs/COURSE-OUTLINE-ORGO2.md` names ten reagent pairs that must never merge.
 * Nothing in this file knows about them. They hold because the rows keep them
 * apart: PCC is in `ox_stop_at_aldehyde` and Jones is in
 * `ox_to_carboxylic_acid`, and no slot on any row uses both. A special case here
 * that suppressed a result would be a rule nobody could find from the data, and
 * the first row authored after it was written would be wrong in a way no test
 * caught. The tests assert the property; the data is what makes it true.
 */

import { REACTIONS } from "./table.js";
import { searchKey } from "./reaction.js";
import type { Reaction, ReactionId } from "./types.js";

/** Which axis a result was found on. Ordered by search priority, best first. */
export type MatchAxis = "name" | "reagent" | "class";

const AXIS_PRIORITY: readonly MatchAxis[] = Object.freeze(["name", "reagent", "class"]);

export interface ReactionMatch {
  readonly reaction: Reaction;
  /** Every axis this row matched on, in `AXIS_PRIORITY` order. Never empty. */
  readonly matchedOn: readonly MatchAxis[];
}

/**
 * Stable ordering for every function in this file.
 *
 * By id, which is a total order over the table because `REACTIONS` refuses
 * duplicate ids. Alphabetical rather than by relevance inside one axis, because
 * a relevance score is the beginning of the model this is deliberately not.
 */
function byId(left: Reaction, right: Reaction): number {
  return left.id < right.id ? -1 : left.id > right.id ? 1 : 0;
}

function matchesReagent(reaction: Reaction, key: string): boolean {
  return reaction.reagents.some((slot) => slot.anyOf.some((token) => searchKey(token) === key));
}

/**
 * Word-start containment: the query matches at the start of the phrase or
 * immediately after a space. See the class axis note in the file header.
 */
function containsAtWordStart(phrase: string, key: string): boolean {
  return (" " + phrase).includes(" " + key);
}

function matchesSubstrate(reaction: Reaction, key: string): boolean {
  return reaction.substrateClasses.some((klass) => containsAtWordStart(searchKey(klass), key));
}

function matchesProduct(reaction: Reaction, key: string): boolean {
  return reaction.productClasses.some((klass) => containsAtWordStart(searchKey(klass), key));
}

function matchesName(reaction: Reaction, key: string): boolean {
  if (searchKey(reaction.name).includes(key)) return true;
  return reaction.aliases.some((alias) => searchKey(alias).includes(key));
}

/** An empty or whitespace query matches nothing, rather than everything. */
function emptyQuery(key: string): boolean {
  return key === "";
}

/**
 * Every reaction that uses this reagent, equivalence groups already applied.
 *
 * The group expansion happened at construction time: a slot that named a group
 * carries the group's members in its own token list. So this is a plain
 * comparison, and the equivalence it respects is the per reaction one the
 * outline requires rather than a global reagent to group map.
 */
export function searchByReagent(token: string, table: readonly Reaction[] = REACTIONS): readonly Reaction[] {
  const key = searchKey(token);
  if (emptyQuery(key)) return [];
  return table.filter((reaction) => matchesReagent(reaction, key)).sort(byId);
}

/** Every reaction that starts from this class of substance. Substring match. */
export function searchBySubstrateClass(
  token: string,
  table: readonly Reaction[] = REACTIONS,
): readonly Reaction[] {
  const key = searchKey(token);
  if (emptyQuery(key)) return [];
  return table.filter((reaction) => matchesSubstrate(reaction, key)).sort(byId);
}

/** Every reaction that produces this class of substance. Substring match. */
export function searchByProductClass(
  token: string,
  table: readonly Reaction[] = REACTIONS,
): readonly Reaction[] {
  const key = searchKey(token);
  if (emptyQuery(key)) return [];
  return table.filter((reaction) => matchesProduct(reaction, key)).sort(byId);
}

/** Either side. The student who knows one end of the transformation but not which end. */
export function searchByClass(
  token: string,
  table: readonly Reaction[] = REACTIONS,
): readonly Reaction[] {
  const key = searchKey(token);
  if (emptyQuery(key)) return [];
  return table
    .filter((reaction) => matchesSubstrate(reaction, key) || matchesProduct(reaction, key))
    .sort(byId);
}

/** Name or alias, substring. */
export function searchByName(
  query: string,
  table: readonly Reaction[] = REACTIONS,
): readonly Reaction[] {
  const key = searchKey(query);
  if (emptyQuery(key)) return [];
  return table.filter((reaction) => matchesName(reaction, key)).sort(byId);
}

/**
 * All three axes at once, which is the search box a student actually types into.
 *
 * Ordering is by the BEST axis a row matched on, using the fixed priority in
 * `AXIS_PRIORITY`, then by id. That is a deliberate choice over ranking by how
 * many axes matched: axis count rewards rows that happen to be verbose, and the
 * fixed priority is a rule a reader can state in one sentence. A name match is
 * first because a student who typed a name knew a name.
 */
export function searchReactions(
  query: string,
  table: readonly Reaction[] = REACTIONS,
): readonly ReactionMatch[] {
  const key = searchKey(query);
  if (emptyQuery(key)) return [];

  const matches: ReactionMatch[] = [];
  for (const reaction of table) {
    const matchedOn: MatchAxis[] = [];
    if (matchesName(reaction, key)) matchedOn.push("name");
    if (matchesReagent(reaction, key)) matchedOn.push("reagent");
    if (matchesSubstrate(reaction, key) || matchesProduct(reaction, key)) matchedOn.push("class");
    if (matchedOn.length > 0) matches.push({ reaction, matchedOn });
  }

  return matches.sort((left, right) => {
    const leftBest = AXIS_PRIORITY.indexOf(left.matchedOn[0] as MatchAxis);
    const rightBest = AXIS_PRIORITY.indexOf(right.matchedOn[0] as MatchAxis);
    if (leftBest !== rightBest) return leftBest - rightBest;
    return byId(left.reaction, right.reaction);
  });
}

/** Everything filed under one topic, for the pathway and for coverage counting. */
export function reactionsForTopic(
  topic: Reaction["topic"],
  table: readonly Reaction[] = REACTIONS,
): readonly Reaction[] {
  return table.filter((reaction) => reaction.topic === topic).sort(byId);
}

/** Throws on an unknown id, because a missing row is a defect in the caller. */
export function reactionById(id: ReactionId, table: readonly Reaction[] = REACTIONS): Reaction {
  const reaction = table.find((candidate) => candidate.id === id);
  if (reaction === undefined) {
    throw new Error(`No reaction with id ${id} in the reaction table`);
  }
  return reaction;
}
