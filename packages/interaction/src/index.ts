/**
 * @blueberry/interaction
 *
 * The platform agnostic interaction layer. Pure TypeScript. No React, no React
 * Native, no DOM, no rendering, no timers, no clock, no randomness. Its only
 * dependency is `@blueberry/chem-core`, which is pure data and numbers for the
 * same reason.
 *
 * Both shells adapt their own events into this vocabulary at their boundary. A
 * browser turns `PointerEvent` into `PointerInput`; Expo turns its responder
 * events into the same thing. Neither sends a DOM type in here, and if a DOM
 * type ever looks necessary, the abstraction is wrong and the right move is to
 * say so rather than widen this package.
 *
 * WHAT IS IN HERE, in the order it is worth reading:
 *
 *   pointer.ts       Mouse, touch and pen, and why pressure never gates
 *                    anything. Read this first, it is short.
 *   targets.ts       What a student can touch. The unit of meaning everything
 *                    else trades in.
 *   geometryPort.ts  The interface this package needs from `src/geometry/`,
 *                    declared here so the two can be built and tested apart.
 *   commands.ts      The semantic vocabulary. No command in it says "drag".
 *   machine.ts       AXIS ONE. Three rules turn pointers into commands.
 *   shapes/          AXIS TWO. Four answer shapes, one dispatch, no shape name
 *                    anywhere in machine.ts.
 *   document.ts      The draft and its undo history.
 *   notices.ts       Every way this package can say why nothing happened.
 *   store.ts         An external store for shells that want one.
 *
 * THE TWO CLAIMS THIS PACKAGE IS BUILT TO MAKE GOOD ON.
 *
 * 1. Every mechanism is completable with taps alone. A tap and a drag produce
 *    exactly the same commands; see the three rules at the top of machine.ts.
 *    There is no tap only mode, because there is no drag only path to fall back
 *    from.
 *
 * 2. Four answer shapes, not one. A shape is a mode this machine is in, holding
 *    its own draft and its own reducer. machine.ts contains no shape name.
 *    Phase 3 grades the three that chem-core cannot yet, and that lands in
 *    packages/curriculum without touching this package.
 */

export type { PointerKind, Point2, PointerInput, PressureReading } from "./pointer.js";
export {
  distance2,
  isPrimaryButton,
  readPressure,
  PEN_PRESSURE_WHEN_UNSUPPORTED,
  PRESSURE_WHEN_NOT_A_PEN,
} from "./pointer.js";

export type { CandidateId, CommandSeq, ReagentId, ReasonId } from "./ids.js";

export type { HitTarget, HitTargetKind } from "./targets.js";
export { sameTarget, targetAtomId, targetKey } from "./targets.js";

export type {
  ArmedSourceHint,
  HitTestOutcome,
  HitTestQuery,
  HitTester,
  InteractionEnvironment,
  ScoredTarget,
} from "./geometryPort.js";
export { AMBIGUOUS_MARGIN, isContested } from "./geometryPort.js";

export type { InteractionNotice, NoticeId, NoticeSeverity } from "./notices.js";
export { ALL_NOTICE_IDS, notice, noticeCount } from "./notices.js";

export type { HapticStyle, InteractionEffect } from "./effects.js";
export { haptic } from "./effects.js";

export type { InteractionCommand, InteractionCommandKind } from "./commands.js";
export { selectTarget } from "./commands.js";

export type { DocumentState } from "./document.js";
export { commitDraft, createDocument, resetDocument, undoDocument, UNDO_DEPTH } from "./document.js";

export type {
  AnswerShape,
  ArmedElectronSource,
  AtomPlacement,
  ChangeReport,
  MechanismDraft,
  RankingDraft,
  ReagentsDraft,
  ShapeDraft,
  ShapeOutcome,
  ShapeReport,
  SinkInference,
  StructureDraft,
} from "./shapes/index.js";
export {
  ALL_ANSWER_SHAPES,
  ALL_SHAPE_REPORTS,
  applyToMechanism,
  applyToRanking,
  applyToReagents,
  applyToShape,
  applyToStructure,
  armedAtomId,
  armedHintFor,
  chosenCandidate,
  createMechanismDraft,
  createRankingDraft,
  createReagentsDraft,
  createStructureDraft,
  findingsIntroducedBy,
  hasSelection,
  inferSink,
  installRefusalFor,
  MAX_IMPLICIT_HYDROGENS,
  mechanismArmedHint,
  move,
  STUDENT_ARROW_PREFIX,
  toggleId,
} from "./shapes/index.js";

export type {
  InFlightGuide,
  InteractionEvent,
  InteractionState,
  PointerSession,
  SessionRole,
  Transition,
} from "./machine.js";
export {
  activePointerCount,
  canUndo,
  createInteractionState,
  currentDraft,
  inFlightGuide,
  ownerSession,
  reduce,
} from "./machine.js";

export type { InteractionStore, InteractionStoreOptions } from "./store.js";
export { createInteractionStore } from "./store.js";
