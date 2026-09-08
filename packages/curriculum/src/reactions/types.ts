/**
 * The reaction database row, and the vocabulary it is written in.
 *
 * WHY THIS EXISTS. CLAUDE.md lists "Reaction search" as a tab: "A database a
 * student can search by reagents or reactants when they do not know a reaction's
 * name. The lookup a real student actually performs the night before an exam."
 * BUILD-PROMPT.md Phase 3 adds the constraint that matters most: "It is data
 * with a search function, not a model." So there is no inference in this
 * directory. Every row is authored, every search is a pure function over the
 * authored rows, and nothing here predicts a product it was not told about.
 *
 * WHY A ROW IS NOT JUST A NAME AND A REAGENT LIST.
 *
 * The student this table is for does not know the name. They know some of what
 * was in the flask, or they know what they started with and what they need to
 * end up with. So a row has to be reachable from three directions, and all three
 * are indexed:
 *
 *   the reagent tokens, respecting the equivalence groups
 *   the substrate and product CLASS, because a student knows "a ketone", not
 *     "acetophenone"
 *   the name and its aliases, for the student who half remembers it
 *
 * WHY CONDITIONS ARE A LIST AND NOT A SENTENCE.
 *
 * `docs/COURSE-OUTLINE-ORGO2.md` section 6 is explicit that conditions are
 * answer determining, and its near miss table is ten pairs where the reagents
 * overlap and the CONDITIONS decide the product: one equivalent of alcohol
 * against excess, LDA cold against an alkoxide warm, an epoxide under acid
 * against under base. If conditions were prose, a row could not say which
 * condition is load bearing and the near miss lesson would be invisible to
 * search. So each condition carries a `decides` field naming the outcome it
 * controls. A condition that decides nothing is not worth recording and
 * `createReaction` refuses one.
 *
 * WHY EQUIVALENCE IS PER SLOT AND NOT PER REAGENT.
 *
 * The outline says it in one line: "Equivalence is per reaction type, not per
 * reagent." NaBH4 and LiAlH4 are the same reagent on an aldehyde and different
 * reagents on an ester. SOCl2 turns an alcohol into a chloride and a carboxylic
 * acid into an acyl chloride, and it sits in a different equivalence set in each
 * of those reactions. So a group is opted into BY A SLOT ON A ROW, never by a
 * global reagent to group map, and a token is allowed to appear in two groups.
 *
 * That is the deliberate opposite of `answers/reagents.ts`, whose
 * `buildEquivalenceIndex` throws when one reagent appears in two groups. Both
 * are right for their job. There, the groups belong to one authored answer to
 * one problem, so two groups claiming the same token is an authoring
 * contradiction with no correct reading. Here the groups belong to the whole
 * corpus of reactions and a reagent genuinely does different jobs in different
 * ones. The difference is recorded rather than reconciled, because reconciling
 * it would mean either losing the near miss pairs or losing the shared tokens.
 */

import type { ActId, CourseId, TopicId } from "../placement.js";

/**
 * Stable forever, for the reason `ids.ts` gives about a `ProblemId`: a lesson,
 * a search result the student bookmarked, and any later analytics all point at
 * this string. Rewording a name keeps the id.
 */
export type ReactionId = string;

/**
 * The named equivalence groups from `docs/COURSE-OUTLINE-ORGO2.md` section 6.
 *
 * Closed union, for the reason `placement.ts` gives about topics: a group
 * written as a free string cannot be counted, cannot be coverage checked, and a
 * typo in one silently creates a group of one that equates nothing.
 */
export type EquivalenceGroupId =
  | "ox_stop_at_aldehyde"
  | "ox_to_carboxylic_acid"
  | "hydride_simple_carbonyl"
  | "lewis_acid_halide"
  | "epoxidising_peracid"
  | "syn_dihydroxylation"
  | "epoxide_basic_nucleophile"
  | "carbonyl_to_methylene"
  | "nitro_reduction"
  | "benzylic_oxidation"
  | "organometallic_1_2"
  | "cyanohydrin_source"
  | "enamine_secondary_amine"
  | "acid_to_acyl_chloride"
  | "fischer_catalyst"
  | "amide_coupling"
  | "aldol_base"
  | "alpha_halogen"
  | "reductive_amination_reductant"
  | "sulfonylating"
  | "amine_acid_scavenger"
  | "bulky_alkoxide";

/**
 * One authored group of reagents that do the same job in the same reaction type.
 *
 * `caveat` is the field that keeps the outline's near miss table alive. Three of
 * these groups are real equivalences only inside a stated boundary, and the
 * boundary is exactly what the near miss pair teaches. A group with a caveat may
 * only be used on a slot whose row stays inside it, which is an authoring
 * judgement a reviewer makes, not something this file can check.
 */
export interface EquivalenceGroup {
  readonly id: EquivalenceGroupId;
  /** Student facing, so a phrase rather than an identifier. */
  readonly label: string;
  /** Every token a student might type for a member of this group. */
  readonly members: readonly string[];
  /** Where in the outline this group comes from. */
  readonly source: string;
  /** The boundary outside which these are not interchangeable. */
  readonly caveat?: string;
}

/**
 * A class of substance, as a student would say it.
 *
 * Closed union, same argument as the group ids. Search over these is by
 * SUBSTRING, so "alcohol" reaches "primary alcohol" and "tertiary alcohol"
 * without any hierarchy being modelled. That is the whole reason the members
 * read as English phrases rather than as identifiers.
 */
export type ChemicalClass =
  // hydrocarbons and halides
  | "alkane"
  | "alkene"
  | "conjugated diene"
  | "alkyne"
  | "terminal alkyne"
  | "internal alkyne"
  | "cis alkene"
  | "trans alkene"
  | "alkyl halide"
  | "primary alkyl halide"
  | "secondary alkyl halide"
  | "tertiary alkyl halide"
  | "allylic halide"
  | "benzylic halide"
  | "aryl halide"
  | "vicinal dihalide"
  // oxygen at sp3 carbon
  | "primary alcohol"
  | "secondary alcohol"
  | "tertiary alcohol"
  | "vicinal diol"
  | "alkoxide"
  | "ether"
  | "aryl ether"
  | "epoxide"
  | "sulfonate ester"
  | "halohydrin"
  // aromatics
  | "arene"
  | "alkyl arene"
  | "phenol"
  | "phenoxide"
  | "quinone"
  | "nitroarene"
  | "arenesulfonic acid"
  | "aryl ketone"
  | "aryl amine"
  | "arenediazonium salt"
  | "activated aryl halide"
  | "benzoic acid"
  // carbonyl as electrophile
  | "aldehyde"
  | "ketone"
  | "methyl ketone"
  | "enone"
  | "carboxylic acid"
  | "carboxylate salt"
  | "acyl chloride"
  | "acid anhydride"
  | "ester"
  | "amide"
  | "nitrile"
  | "cyanohydrin"
  | "hemiacetal"
  | "acetal"
  | "imine"
  | "enamine"
  | "alkene from a ylide"
  // carbonyl as nucleophile
  | "enol"
  | "kinetic enolate"
  | "thermodynamic enolate"
  | "beta hydroxy carbonyl"
  | "beta keto ester"
  | "alpha halo carbonyl"
  | "1,4 addition product"
  // nitrogen
  | "primary amine"
  | "secondary amine"
  | "tertiary amine"
  // cycloaddition
  | "cyclohexene"
  | "bicyclic alkene";

/**
 * The axis a condition sits on.
 *
 * These four are the ones the outline names as answer determining, plus
 * `workup`, which is separate because a workup that is forgotten is its own
 * mistake pattern: the outline records "alkoxide reported instead of the
 * alcohol" as a top Tier 2 error in Act 2.
 */
export type ConditionDimension =
  | "temperature"
  | "solvent"
  | "regime"
  | "stoichiometry"
  | "workup";

export interface ReactionCondition {
  readonly dimension: ConditionDimension;
  /** The condition itself, in the terms a bench sheet uses. */
  readonly value: string;
  /**
   * What changes if this condition changes. Required, and it is the field that
   * makes a near miss pair legible: the row for a hemiacetal and the row for an
   * acetal differ in exactly one condition, and this says so.
   */
  readonly decides: string;
}

/**
 * One reagent position in a reaction, and the interchangeable ways to fill it.
 *
 * Exactly one of `group` and `anyOf` is authored. When `group` is given the
 * tokens come from the group, so the group stays the one place its membership is
 * written down. When `anyOf` is given the tokens are specific to this row, which
 * is how a row opts OUT of a group it superficially belongs to: the ester
 * reduction row names LiAlH4 alone rather than `hydride_simple_carbonyl`,
 * because NaBH4 does not do it, and that pair is the outline's own near miss.
 */
export interface ReagentSlotInput {
  /** What this reagent is doing. "oxidant", "Lewis acid catalyst", "solvent". */
  readonly role: string;
  readonly group?: EquivalenceGroupId;
  readonly anyOf?: readonly string[];
}

export interface ReagentSlot {
  readonly role: string;
  readonly group?: EquivalenceGroupId;
  /** Resolved. Every token that fills this slot, group members included. */
  readonly anyOf: readonly string[];
}

export interface Reaction {
  readonly id: ReactionId;
  readonly name: string;
  /** Other names a student may have heard. Searched as substrings, like the name. */
  readonly aliases: readonly string[];
  /** One plain sentence. What class of substrate becomes what class of product. */
  readonly transformation: string;
  readonly substrateClasses: readonly ChemicalClass[];
  readonly productClasses: readonly ChemicalClass[];
  readonly reagents: readonly ReagentSlot[];
  readonly conditions: readonly ReactionCondition[];
  readonly topic: TopicId;
  /**
   * Derived from the topic, never authored. `placement.ts` already knows which
   * act a topic is examined on, and a second authored copy of that fact is a
   * second thing to keep in step. Absent for the carried Organic Chemistry I and
   * General Chemistry topics, which have no act, and that absence is normal.
   */
  readonly act?: ActId;
  /** Derived from the topic, for the same reason. */
  readonly course: CourseId;
  /** Free text, for anything worth saying that is not a condition. */
  readonly note?: string;
}

export interface ReactionInput {
  readonly id: ReactionId;
  readonly name: string;
  readonly aliases?: readonly string[];
  readonly transformation: string;
  readonly substrateClasses: readonly ChemicalClass[];
  readonly productClasses: readonly ChemicalClass[];
  readonly reagents: readonly ReagentSlotInput[];
  readonly conditions: readonly ReactionCondition[];
  readonly topic: TopicId;
  readonly note?: string;
}
