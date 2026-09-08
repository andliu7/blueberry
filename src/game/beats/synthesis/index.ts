/**
 * The synthesis gap beat, as one import.
 *
 * A barrel, and a narrow one on purpose: the component, the corpus, the grader
 * and the card generator are what a shell needs, and the internals (the parser,
 * the structures, the constructor's private helpers) stay reachable by direct
 * path for tests and unreachable by accident from a tab. A wide barrel is how a
 * surface ends up importing a parser it should never have known about.
 *
 * The component is NOT re-exported as a value from here on purpose either: a
 * tab should reach it through `React.lazy(() => import("./SynthesisGapBeat"))`
 * if it wants it off the entry chunk, and re-exporting it would pull the JSX
 * into every module that only wanted the corpus.
 */

export {
  createSynthesisGapProblem,
  answerOption,
  bankOption,
  gapStep,
  levelsForGapKind,
  reasonOption,
  structureAnswerIsSelfConsistent,
  GAP_KINDS,
  type BankOption,
  type GapKind,
  type SynthesisGapProblem,
  type SynthesisGapProblemInput,
  type SynthesisSource,
  type SynthesisStep,
  type TypedAnswer,
  type TypedRoute,
} from "./problem";

export { SYNTHESIS_GAPS, synthesisGapById, synthesisGapsForNode } from "./corpus";

export {
  beatCauseForCurriculumCause,
  explainSynthesisResult,
  gradeSynthesisGap,
  type ExplanationTone,
  type GapExplanation,
  type GapSubmission,
  type GradeGapInput,
} from "./grade";

export {
  answerTextFor,
  gapsForLevel,
  levelToPlay,
  synthesisBeat,
  synthesisBeats,
  synthesisLevelRuleViolations,
  synthesisPlaylist,
} from "./beats";

export {
  cardFromGap,
  cardFromMistake,
  cardIdFor,
  gapQuestion,
  offerCardForMistake,
  recoReason,
  shouldOfferCard,
  type GapCardOffer,
} from "./cards";

export type { SpeechListenHandle, SpeechSeam } from "./speech";
export type { SynthesisGapBeatProps } from "./SynthesisGapBeat";
