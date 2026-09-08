/**
 * The matching beat's public face.
 *
 * A barrel, so a lesson runner imports one path and never reaches into the
 * internals of a beat it is only playing. The split behind it is the one worth
 * knowing: spec.ts turns an authored beat into the board packages/curriculum
 * grades, board.ts is the pure state machine over that board, reasons.ts is
 * every sentence the board says, and MatchBoard.tsx is the only file here that
 * imports React. Three of the four are testable without a DOM, which is why the
 * tests in apps/web/test are real tests rather than snapshots.
 */

export { MatchBoard, type MatchBoardProps } from "./MatchBoard";
export {
  ALKENE_OXIDATION_BOARD,
  IR_SIGNAL_BOARD,
  MATCH_BOARDS,
  PKA_LADDER_BOARD,
  PROTECTING_GROUP_BOARD,
  matchBoardById,
} from "./boards";
export {
  CARD_TEXT_CAP,
  authoredIdOf,
  authoredLoadOf,
  authoredTargetFor,
  buildMatchBoard,
  decoysAt,
  isPlayable,
  matchAuthoringProblems,
  promptIdFor,
  targetIdFor,
  textOf,
  type MatchBoardSpec,
} from "./spec";
export {
  beatResultFor,
  boardVerdict,
  focusTargetAfterSettle,
  causeForBoard,
  cardForMiss,
  initialBoardState,
  isBoardComplete,
  isPromptLanded,
  isTargetFull,
  judgePair,
  landedCount,
  landedLoadOf,
  missesOnPrompt,
  reduceBoard,
  shuffledTargetIds,
  visiblePromptIds,
  visibleTargetIds,
  type BoardAction,
  type BoardState,
  type FocusInput,
  type FocusTarget,
  type Miss,
  type Pending,
  type Selection,
  type Side,
} from "./board";
export {
  completionLine,
  joinMessage,
  messageForLanding,
  messageForMiss,
  progressLine,
  type PairMessage,
} from "./reasons";
