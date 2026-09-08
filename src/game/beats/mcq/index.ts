/**
 * The easy MCQ beat, as one import.
 *
 * A barrel so an integrating surface writes one path rather than five, and so
 * the shape of this beat is visible in one screen: authored content, an
 * authoring check over it, a grader that delegates to packages/curriculum, a
 * card offer built from a miss, and one component that renders the result.
 *
 * Type only re-exports stay `export type`, so nothing here pulls a value into
 * a bundle that only wanted a shape.
 */

export {
  MCQ_BEATS,
  MCQ_NODES,
  mcqBeatById,
  mcqBeatsForNode,
} from "./content";

export {
  MAX_BRIEF_CHARS,
  MAX_OPTIONS,
  MAX_OPTION_CHARS,
  MAX_PROMPT_CHARS,
  MAX_WHY_CHARS,
  MIN_OPTIONS,
  copyVoiceViolations,
  mcqAnswerSpec,
  mcqAuthoringViolations,
} from "./authoring";
export type { McqAuthoringViolation } from "./authoring";

export { CORRECT_CAUSE, DISTRACTOR_CAUSE, gradeMcq, mcqBeatsAt, revealHeading } from "./grade";
export type { McqAttempt, McqReveal } from "./grade";

export { mcqCardFor, mcqCardId, mcqCardOffer, mcqRecoFor, shouldOfferCard } from "./card";
export type { McqCardOffer } from "./card";

export { McqBeatView } from "./McqBeatView";
export type { McqBeatViewProps } from "./McqBeatView";
