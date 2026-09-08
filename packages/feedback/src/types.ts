/**
 * The shape of Tier 1 authored teaching copy.
 *
 * CLAUDE.md, "Feedback: every step explains itself, and almost none of it costs
 * a token": Tier 1 is the named cause plus copy that says what the student did,
 * why it is wrong, and what to look at instead. Written once, reviewed once,
 * served forever, zero tokens. This file is the contract that copy is written
 * against.
 *
 * Three fields, not one paragraph, for two reasons. A renderer needs to show
 * them separately, because "what to look at instead" is the part a student reads
 * first when they are stuck and the part they reread when they are not. And a
 * reviewer needs to be able to check the three jobs independently, because copy
 * that explains the chemistry beautifully and then ends with "try again" has
 * failed at exactly one of them.
 *
 * chem-core's `CauseDefinition` already carries `summary` and `teaches`. Those
 * are the engine's own short description of the cause, sized for a log line or a
 * validator report. This is the student facing version and it is longer, is
 * addressed to the person who made the attempt, and is the thing a human
 * reviewer signs off. The two are deliberately separate: chem-core must never
 * depend on this package, and rewriting student copy must never mean editing
 * engine code.
 */

import type { CauseId } from "@blueberry/chem-core";
import type { MechanismRoute } from "@blueberry/chem-core";

export interface CauseCopy {
  /**
   * What the student did, in their own terms.
   *
   * Refers to what happened in the drawing, not to the internal rule that caught
   * it. "That atom has more bonds than it can hold", never "valence exceeded".
   *
   * CLAUDE.md, "The voice": the subject is the drawing, not the student. "That
   * atom has more bonds than it can hold" and "You gave an atom more bonds than
   * it can hold" state the same fact, and only the second one reads as an
   * accusation. Where the sentence is about something that went right, "you" is
   * the correct subject and the praise has to be specific enough to prove the
   * attempt was actually read.
   */
  readonly whatYouDid: string;
  /**
   * Why it is wrong, or for an advisory, why it is disfavoured.
   *
   * The chemistry reason, not the name of the rule. A student who reads this
   * should be able to predict the same failure on a different molecule.
   */
  readonly why: string;
  /**
   * What to look at instead. Concrete and actionable.
   *
   * Never "try again", never "review the chapter". It names the thing to count,
   * the projection to draw, or the site to compare.
   */
  readonly lookAt: string;
  /**
   * For advisory causes, the routes that normally win instead.
   *
   * CLAUDE.md, "Graded chemistry, not boolean chemistry": a strongly disfavoured
   * neopentyl SN2 is not blocked, and the engine has to name the competing
   * pathway, because the methyl shift to the tertiary cation is the actual
   * lesson. This field is the machine readable half of that. The prose in `why`
   * carries the same information for the student, so a renderer that ignores
   * this field still says the right thing.
   *
   * Structured rather than prose so a validator can assert that advisory copy
   * names a route from the closed union rather than inventing one.
   */
  readonly competingRoutes?: readonly MechanismRoute[];
}

/**
 * A copy entry with its id attached.
 *
 * The registry is keyed by `CauseId`, so the id is not stored in the entry
 * itself and cannot drift from the key. This is the shape returned when copy is
 * handed to something that needs to carry the id along with it, such as the
 * review renderer or a report.
 */
export interface CauseCopyEntry extends CauseCopy {
  readonly id: CauseId;
}

/**
 * What a coverage check found.
 *
 * `missing` is the list a validator fails on. It is derived from chem-core's
 * `allCauseIds()` at runtime rather than from a hand maintained list, so a cause
 * added to the engine shows up here even if nobody remembered this package
 * exists. The registry is also typed to make that case a compile error, and both
 * checks are kept because they fail at different times: the compile error stops
 * the build, and this one is what the feedback axis reports a number from.
 */
export interface CopyCoverage {
  readonly defined: number;
  readonly covered: number;
  readonly missing: readonly CauseId[];
  readonly extra: readonly string[];
}
