/**
 * The structure trace beat's public face.
 *
 * One entry point so the shell imports a beat rather than six files, and so the
 * boundary is visible: everything below this line is this piece's, and anything
 * outside it that reaches past this file has reached into an implementation.
 *
 * The interesting export for a reader is `TraceBeatView`. The interesting
 * export for a test is `geometry.ts`, which is where the behaviour that makes
 * this beat worth having actually lives.
 */

export { TraceBeatView, type TraceBeatViewProps } from "./TraceBeatView";
export { GuidedCanvas, type GuidedCanvasProps } from "./GuidedCanvas";
export { FreehandCanvas, type FreehandCanvasProps } from "./FreehandCanvas";
export { PressButton, type PressButtonProps } from "./PressButton";

export { TRACE_BEATS, TRACE_TARGETS, BOND_PX, traceTarget, traceContentProblems } from "./content";

export {
  DEFAULT_RECOGNISE,
  gradeDrawing,
  guidedCause,
  recognise,
  toBeatResult,
  type ElementPlacement,
  type FreehandStroke,
  type Recognition,
  type RecogniseOptions,
  type TraceCauseId,
  type TraceOutcome,
} from "./recognise";

export {
  OverValentError,
  connectedComponents,
  elementOf,
  elementPaletteFor,
  fillGraph,
  fillValence,
  formulaOf,
  isHeteroatom,
  overValentIds,
  stateOf,
  strokePoints,
  strokesOf,
  targetState,
  uncoveredEdgeIds,
  vertexMap,
  type EdgeId,
  type FilledAtom,
  type Graph,
  type TraceEdge,
  type TraceStrokePlan,
  type TraceTarget,
  type TraceVertex,
  type ValenceFill,
  type VertexId,
} from "./target";

export {
  IDLE_TRACE,
  advanceTrace,
  beginTrace,
  buildPath,
  canStartAt,
  distance,
  endToleranceFor,
  lookaheadFor,
  pointAt,
  polylineToPathData,
  projectOnto,
  projectOntoWindow,
  simplifyPolyline,
  sliceTo,
  strokeOutcome,
  tangentAt,
  type Projection,
  type Pt,
  type StrokeOutcome,
  type TracePath,
  type TraceProgress,
  type TraceRules,
} from "./geometry";

export {
  LABEL_GAP,
  MULTIPLE_BOND_GAP,
  bondAxis,
  centroidOf,
  chargeLabel,
  labelledVertices,
  multipleBondLines,
  viewBoxOf,
  viewBoxString,
  type Segment,
  type ViewBox,
} from "./render";
