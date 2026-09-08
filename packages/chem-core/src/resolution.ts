/**
 * AXIS TWO: what a student's attempt resolved to.
 *
 * Read the two axis note at the top of step.ts first. Axis one is what a step
 * IS and lives on the step. Axis two is this file, and it is the outcome of a
 * grading act: it is about one student at one moment, it did not exist before
 * the attempt, and the next attempt replaces it.
 *
 * `AttemptResolution` is a discriminated union. That is a normal TypeScript
 * pattern rather than an exotic one: several object shapes share one literal
 * field, here `kind`, and the compiler narrows to the right shape once you check
 * it. The reason for using it rather than one interface with optional fields is
 * that CLAUDE.md requires case two to carry the name of the route taken and case
 * three to carry the name of what was actually built. With optional fields those
 * are promises in a comment. As a union they are compile errors when missing.
 *
 * Every one of the four carries a `cause`. Including `correct`. A student who
 * gets it right is told which route they were recognised as taking, which is
 * worth as much as the mark.
 */

import type { NamedCause, ResolutionKind } from "./causes.js";
import { causeAppliesTo, causeDefinition } from "./causes.js";
import type { AttemptId, SpeciesId, StepId } from "./ids.js";
import type { MechanismRoute, TransformationKind } from "./routes.js";
import type { MechanismStep } from "./step.js";

export type { ResolutionKind } from "./causes.js";

/**
 * What a student actually built, named.
 *
 * Structured rather than a sentence, so `valid_not_requested` can say "you built
 * an elimination" and a later phase can count how often that happens without
 * parsing English.
 */
export interface TransformationDescriptor {
  readonly kind: TransformationKind;
  readonly route?: MechanismRoute;
  /** The species that make up what they produced. */
  readonly productSpeciesIds: readonly SpeciesId[];
}

/**
 * The four outcomes.
 *
 * `advisories` is the graded chemistry half. A neopentyl SN2 resolves to
 * `correct` with `sn2_center_strongly_hindered` in advisories and the competing
 * pathway named on that cause, which is what CLAUDE.md asks for: say it is
 * strongly disfavoured and name what wins instead, rather than rejecting it and
 * deleting the lesson.
 */
export type AttemptResolution =
  | {
      readonly kind: "correct";
      readonly route: MechanismRoute;
      readonly cause: NamedCause;
      readonly advisories: readonly NamedCause[];
    }
  | {
      readonly kind: "correct_alternative_route";
      /** The route the student took. Required, per CLAUDE.md result type two. */
      readonly routeTaken: MechanismRoute;
      readonly routeRequested: MechanismRoute;
      readonly cause: NamedCause;
      readonly advisories: readonly NamedCause[];
    }
  | {
      readonly kind: "valid_not_requested";
      /** What they actually built. Required, per CLAUDE.md result type three. */
      readonly built: TransformationDescriptor;
      readonly cause: NamedCause;
      readonly advisories: readonly NamedCause[];
    }
  | {
      readonly kind: "invalid";
      /** The specific rule violated. Required, per CLAUDE.md result type four. */
      readonly cause: NamedCause;
      readonly advisories: readonly NamedCause[];
    };

/**
 * The two axes composed: one attempt is a step the student built plus the
 * resolution grading it produced.
 *
 * `built.identity` is axis one for what they drew. `resolution` is axis two.
 * Neither is derivable from the other, which is the point.
 */
export interface StudentAttempt {
  readonly id: AttemptId;
  readonly built: MechanismStep;
  /** The step the problem asked for, when there is a single intended answer. */
  readonly expectedStepId?: StepId;
  readonly resolution: AttemptResolution;
}

/** Whether this resolution counts as chemically sound, regardless of the mark. */
export function isChemicallyValid(resolution: AttemptResolution): boolean {
  return resolution.kind !== "invalid";
}

/** Whether this resolution reaches the requested product. */
export function reachesRequestedProduct(resolution: AttemptResolution): boolean {
  return resolution.kind === "correct" || resolution.kind === "correct_alternative_route";
}

/** Every named cause on a resolution, primary first, then advisories. */
export function resolutionCauses(resolution: AttemptResolution): readonly NamedCause[] {
  return [resolution.cause, ...resolution.advisories];
}

/**
 * Whether the primary cause is one the registry allows on this outcome.
 *
 * This is a consistency question about the model, not a chemistry check. It
 * catches a resolution built with a blocking cause on a correct answer, which
 * would tell a student they were right and then explain why they were wrong.
 */
export function primaryCauseIsConsistent(resolution: AttemptResolution): boolean {
  return causeAppliesTo(resolution.cause.id, resolution.kind);
}

/**
 * Advisories that are blocking causes, which they should never be.
 *
 * A blocking cause means the chemistry is impossible, and impossible chemistry
 * is not advice.
 */
export function blockingAdvisories(resolution: AttemptResolution): readonly NamedCause[] {
  return resolution.advisories.filter(
    (cause) => causeDefinition(cause.id).severity === "blocking",
  );
}

/** How many distinct cause ids appear across a set of resolutions. */
export function distinctCauseCount(resolutions: readonly AttemptResolution[]): number {
  const ids = new Set<string>();
  for (const resolution of resolutions) {
    for (const cause of resolutionCauses(resolution)) {
      ids.add(cause.id);
    }
  }
  return ids.size;
}

/** Count of resolutions by outcome. The shape a feedback report is built from. */
export function countByKind(
  resolutions: readonly AttemptResolution[],
): Readonly<Record<ResolutionKind, number>> {
  const counts: Record<ResolutionKind, number> = {
    correct: 0,
    correct_alternative_route: 0,
    valid_not_requested: 0,
    invalid: 0,
  };
  for (const resolution of resolutions) {
    counts[resolution.kind] += 1;
  }
  return counts;
}
