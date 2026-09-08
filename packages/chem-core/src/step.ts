/**
 * A mechanism step, and AXIS ONE of the two axis design.
 *
 * THE TWO AXES, and why this is not one flat enum.
 *
 * `berryBehaviour.ts` in the sibling repository splits mood from behaviour, and
 * the header there gives the reason: a mood is a face that persists and a
 * behaviour is a motion with a lifecycle, so flattening them would mean the
 * mascot cannot be stressed and bounce at once. D4 says the mechanism engine has
 * the same shape. It does, and here is the mapping.
 *
 *   Axis one, this file: what a step IS. `StepIdentity`. A property of the
 *   chemistry. It is true with nobody in the room. It persists: the step from a
 *   protonated alcohol to a carbocation is a leaving group departure on an SN1
 *   route today, tomorrow, and in the answer key. This is the mood.
 *
 *   Axis two, resolution.ts: what an attempt RESOLVED TO. `AttemptResolution`.
 *   Produced by an act of grading, about one student at one moment, and it has a
 *   lifecycle: it did not exist before the attempt and it is replaced by the next
 *   one. This is the behaviour.
 *
 * Flattening them would give a single enum along the lines of
 * `correct_proton_transfer`, `invalid_proton_transfer`, and so on, which is the
 * cross product: eighteen elementary step kinds times four resolutions, and it
 * grows again every time either side gains a member. Worse than the size, it
 * makes two impossible things unsayable. A step has an identity before anyone
 * attempts it, and the identity of what a student built is exactly the thing
 * `valid_not_requested` has to report back to them. Both need the axes separate.
 */

import type { ElectronFlowArrow } from "./arrows.js";
import type { AtomId, PathwayId, StepId } from "./ids.js";
import type { ElementaryStepKind, MechanismRoute } from "./routes.js";
import type { MechanismState } from "./state.js";

/**
 * What a step is, chemically. Axis one.
 *
 * `route` is optional because an isolated proton transfer belongs to no
 * particular route until it is placed in one. Inside a `MechanismPathway` it is
 * normally present.
 */
export interface StepIdentity {
  readonly elementaryStep: ElementaryStepKind;
  readonly route?: MechanismRoute;
  /**
   * The atoms this step happens at. The carbon under attack, the proton being
   * moved, the carbon losing its leaving group.
   *
   * Named explicitly rather than derived from the arrows, so that a step whose
   * arrows are wrong can still be talked about. The disagreement between these
   * and the arrow endpoints is itself informative.
   */
  readonly reactionCenters: readonly AtomId[];
}

/**
 * A transition between two states plus the electron flow connecting them.
 *
 * `from` and `to` are separate immutable states. Applying a step never mutates
 * `from`. There is deliberately no function in this package that computes `to`
 * from `from` and `arrows`: see the note at the top of arrows.ts. If the engine
 * produced the product itself, the arrows would agree with it by construction
 * and the check that they agree would be checking nothing.
 */
export interface MechanismStep {
  readonly id: StepId;
  readonly from: MechanismState;
  readonly to: MechanismState;
  readonly arrows: readonly ElectronFlowArrow[];
  readonly identity: StepIdentity;
}

export interface MechanismStepInput {
  readonly id: StepId;
  readonly from: MechanismState;
  readonly to: MechanismState;
  readonly identity: StepIdentity;
  readonly arrows?: readonly ElectronFlowArrow[];
}

export function createStep(input: MechanismStepInput): MechanismStep {
  return Object.freeze({
    id: input.id,
    from: input.from,
    to: input.to,
    arrows: Object.freeze([...(input.arrows ?? [])]),
    identity: Object.freeze({
      elementaryStep: input.identity.elementaryStep,
      reactionCenters: Object.freeze([...input.identity.reactionCenters]),
      ...(input.identity.route === undefined ? {} : { route: input.identity.route }),
    }),
  });
}

/**
 * An annotation the author asserts that the engine must never compute.
 *
 * CLAUDE.md names two of these directly. The SN1 racemisation ratio is an
 * authoring annotation and never a computed assertion, because the real number
 * depends on substrate, solvent, leaving group, and ion pairing. A syn
 * periplanar E2 needs an authored conformational justification. Both are stated
 * here, with a justification attached, so a validator can see that a human made
 * the claim rather than the engine inventing it.
 */
export interface AuthoredAnnotation {
  readonly kind:
    | "racemisation_ratio"
    | "conformational_justification"
    | "rate_comparison"
    | "condition_note"
    | "cip_label_source";
  readonly value: string;
  readonly justification: string;
}

/**
 * A complete mechanism: a named route and the ordered steps that make it up.
 *
 * `steps[n].to` and `steps[n + 1].from` should describe the same system. They
 * are stored as separate objects rather than shared by reference so that a
 * fixture can deliberately break the chain and a validator can catch it.
 */
export interface MechanismPathway {
  readonly id: PathwayId;
  readonly route: MechanismRoute;
  readonly steps: readonly MechanismStep[];
  readonly annotations?: readonly AuthoredAnnotation[];
}

export interface MechanismPathwayInput {
  readonly id: PathwayId;
  readonly route: MechanismRoute;
  readonly steps: readonly MechanismStep[];
  readonly annotations?: readonly AuthoredAnnotation[];
}

export function createPathway(input: MechanismPathwayInput): MechanismPathway {
  return Object.freeze({
    id: input.id,
    route: input.route,
    steps: Object.freeze([...input.steps]),
    ...(input.annotations === undefined
      ? {}
      : { annotations: Object.freeze([...input.annotations]) }),
  });
}

/** The state a pathway starts from, if it has any steps. */
export function initialState(pathway: MechanismPathway): MechanismState | undefined {
  return pathway.steps[0]?.from;
}

/** The state a pathway ends at, if it has any steps. */
export function finalState(pathway: MechanismPathway): MechanismState | undefined {
  return pathway.steps[pathway.steps.length - 1]?.to;
}
