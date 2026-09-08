/**
 * Identifiers this package needs that chem-core does not have.
 *
 * Plain string aliases, for the same reason chem-core's ids.ts gives: they are
 * here for the reader, not for the compiler, and branding them would make every
 * fixture call a constructor to write a literal.
 *
 * These three belong to answer shapes that Phase 3 implements in
 * packages/curriculum. That package does not exist yet, so the aliases live here
 * rather than being imported from nowhere. When curriculum lands, these should
 * move there and this file should re-export them, so there is one definition and
 * not two that drift.
 */

/** A reagent the student can pick, e.g. "naoh_aqueous". Authored in curriculum. */
export type ReagentId = string;

/** One candidate product in a major product question. */
export type CandidateId = string;

/** One authored reason a candidate wins, e.g. "more_substituted_alkene". */
export type ReasonId = string;

/** An id for a single interaction command, so a notice can point at one. */
export type CommandSeq = number;
