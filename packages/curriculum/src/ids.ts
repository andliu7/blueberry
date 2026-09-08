/**
 * Identifiers for the curriculum engine.
 *
 * Plain string aliases, for the reason chem-core's ids.ts gives: a brand would
 * stop a ProblemId being passed where a DistractorId belongs, and it would also
 * mean every authored problem has to call a constructor to write a literal. The
 * aliases are here for the reader. If mixed up ids turn out to be a real source
 * of bugs, brand them then, with the bug as the evidence.
 *
 * THE INVARIANT: a ProblemId is stable forever once a problem has been attempted.
 *
 * Attempt history is append only and the Elo like rating is computed from it
 * server side. A problem whose id changes has a rating history that now belongs
 * to nothing, and a difficulty number that moved against attempts nobody can
 * find. Rewording a prompt keeps the id. Changing what is being asked is a new
 * problem with a new id and the old one is retired, never edited in place.
 */

export type ProblemId = string;
export type DistractorId = string;
export type OptionId = string;
export type AttemptId = string;

/** A group of problems a student works through as one unit. Phase 5 renders it. */
export type LessonId = string;
