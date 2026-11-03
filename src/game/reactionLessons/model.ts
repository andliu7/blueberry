/**
 * The reaction-lesson template: one short walk per reaction, broken into the
 * fundamental moves, before the student draws the arrows themselves.
 *
 * WHY A TEMPLATE. The bar (The Organic Chemistry Tutor, Chad's Prep) walks a
 * mechanism as a chain of small moves, and the part students keep is the WHY of
 * each one. So every lesson here has the same six moves in the same order, and
 * an author fills six slots rather than writing a lesson from nothing:
 *
 *   attract     opposite charges attract; name who is giving and who is taking
 *   attack      arrow one: the nucleophile reaches the electrophile
 *   distance    bond length and strain, the physical reason a bond gives way
 *   resonance   is there a second form? check, decide, move on
 *   release     arrow two: where the electrons that were displaced go
 *   result      what is left, and what the next step is
 *
 * STEREOCHEMISTRY RIDES ON EVERY MOVE (owner, 2026-10-29: "stereochemistry
 * added with each step"). `stereo` is required text on all six, because a
 * missing one is an authoring gap the validator should catch, not a blank the
 * student discovers. A move with nothing to add says so in words ("No new
 * geometry yet"), which is still information.
 *
 * ONE DECISION PER MOVE (calm, decision-light). A move may carry a single tap on
 * the drawn molecule; the walk never grades it. A wrong tap is told why, a second
 * wrong tap shows the answer, and Continue is always one press away.
 *
 * THE CHEMISTRY IS NOT RE-DRAWN HERE. Every molecule on screen is the trainer's
 * own MechanismStep for the same reaction id (demo/reactions.ts), so structures
 * are the ones already derived, and this file holds only words and atom ids.
 * Atom ids are checked against the step by reactionLessonIssues.
 *
 * Pure data in, data out, no React, so the node test environment can hold it.
 */

import type { AtomId, MechanismStep } from "@blueberry/chem-core";

export const MOVES = Object.freeze(["attract", "attack", "shape", "distance", "resonance", "release", "result"] as const);
export type Move = (typeof MOVES)[number];

/** Moves every lesson must have. Resonance is among them: the owner rule is check, decide, move on, so a lesson with no second form says so. */
export const REQUIRED_MOVES = Object.freeze(["attract", "attack", "resonance", "release", "result"] as const);

/** The heading each move wears, so every lesson reads the same way. */
export const MOVE_TITLE: Readonly<Record<Move, string>> = Object.freeze({
  attract: "Opposites attract",
  attack: "Draw arrow one",
  shape: "The shape in space",
  distance: "Why this bond gives",
  resonance: "Resonance check",
  release: "Draw the next arrow",
  result: "What you end up with",
});

/** Which frame of the trainer's step each move shows: 0 is before, 1 is after, between is mid-step. */
export const MOVE_FRAME: Readonly<Record<Move, number>> = Object.freeze({
  attract: 0,
  attack: 0.55,
  shape: 0,
  distance: 0,
  resonance: 0,
  release: 0.55,
  result: 1,
});

/** One tap on the molecule. Right when the tapped atom is in `correct`. */
export interface Tap {
  readonly prompt: string;
  readonly correct: readonly AtomId[];
  /** Said when the tap is right: the reason, not just "yes". */
  readonly right: string;
  /** Said on the first wrong tap: kind, and it points at the reason. */
  readonly wrong: string;
}

export interface ResonanceCheck {
  /** Whether a second contributing form exists for the species this move looks at. */
  readonly exists: boolean;
}

/**
 * Pictures that CHANGE, so the student sees geometry and bond length instead of
 * reading about them. Pure data; StereoFigures.tsx draws them. No bond length
 * is a number (that would be recalled, not derived): rows are ranked
 * short, medium, long, and the 3-D positions come from stereoGeometry.ts.
 */
export interface BondEnd {
  readonly sym: string;
  /** Partial charge on this end. */
  readonly charge?: "plus" | "minus";
  /** How much of it; the larger share draws a bigger delta. */
  readonly size?: "small" | "large";
}

export interface BondRow {
  readonly label: string;
  readonly length: "short" | "medium" | "long";
  readonly a: BondEnd;
  readonly b: BondEnd;
  /** The bond that gives way. Exactly one row has it. */
  readonly gives?: boolean;
}

export type Visual =
  | {
      readonly kind: "pyramid";
      /** Label of the attacking group, drawn on the right. */
      readonly nu: string;
      /** Label of the leaving group, drawn on the left; absent for an addition. */
      readonly lg?: string;
      /** The other three groups on the carbon. */
      readonly subs: readonly [string, string, string];
      /** Angle of the three groups from the attack axis, in degrees, before and after. */
      readonly from: number;
      readonly to: number;
      readonly caption: string;
    }
  | { readonly kind: "anti"; readonly hydrogen: string; readonly leaving: string; readonly caption: string }
  | { readonly kind: "bonds"; readonly prompt: string; readonly rows: readonly BondRow[]; readonly right: string; readonly wrong: string };

export interface WalkStep {
  readonly move: Move;
  readonly title: string;
  /** The why, two or three sentences. */
  readonly body: string;
  /** What this move adds about shape in space. Required, never empty. */
  readonly stereo: string;
  /** The atoms the picture lights up. */
  readonly focus: readonly AtomId[];
  readonly frame: number;
  readonly tap?: Tap;
  readonly resonance?: ResonanceCheck;
  readonly visual?: Visual;
}

export interface ReactionLesson {
  /** The trainer reaction this walks (TRAINER_REACTIONS id). */
  readonly reactionId: string;
  readonly title: string;
  readonly steps: readonly WalkStep[];
}

/** What an author writes for one move. */
export interface MoveText {
  readonly body: string;
  readonly stereo: string;
  readonly focus: readonly AtomId[];
  readonly tap?: Tap;
}

export interface LessonConfig {
  readonly reactionId: string;
  readonly title: string;
  readonly attract: MoveText & { readonly tap: Tap };
  readonly attack: MoveText & { readonly tap: Tap };
  /** The geometry move. `before` puts it ahead of the attack (E2 needs anti first). */
  readonly shape?: MoveText & { readonly visual: Visual; readonly before?: boolean };
  /** Only where the bond is the reason; a trivial bond gets no card. */
  readonly distance?: MoveText & { readonly visual?: Visual };
  /** Every lesson: `exists` is the verdict, and false says "no second form, moving on". */
  readonly resonance: MoveText & { readonly exists: boolean };
  readonly release: MoveText;
  readonly result: MoveText;
}

/** Fill the slots in order. Required moves cannot be skipped; optional ones appear only when authored. */
export function reactionLesson(config: LessonConfig): ReactionLesson {
  const make = (move: Move, text: MoveText, extra: Partial<WalkStep> = {}): WalkStep => ({
    move,
    title: MOVE_TITLE[move],
    body: text.body,
    stereo: text.stereo,
    focus: text.focus,
    frame: MOVE_FRAME[move],
    ...(text.tap !== undefined ? { tap: text.tap } : {}),
    ...extra,
  });
  const shape = config.shape === undefined ? [] : [make("shape", config.shape, { visual: config.shape.visual })];
  const distance =
    config.distance === undefined ? [] : [make("distance", config.distance, config.distance.visual === undefined ? {} : { visual: config.distance.visual })];
  const resonance = [make("resonance", config.resonance, { resonance: { exists: config.resonance.exists } })];
  const shapeFirst = config.shape?.before === true;
  return {
    reactionId: config.reactionId,
    title: config.title,
    steps: [
      make("attract", config.attract),
      ...(shapeFirst ? shape : []),
      make("attack", config.attack),
      ...(shapeFirst ? [] : shape),
      ...distance,
      ...resonance,
      make("release", config.release),
      make("result", config.result),
    ],
  };
}

/* ------------------------------------------------------------------ */
/* The arrows the student draws                                         */
/* ------------------------------------------------------------------ */

/**
 * One electron-flow arrow of the trainer's step, as a drag. `start` are the
 * atoms a drag may begin on (a lone pair's atom, or either end of a source bond),
 * `end` the atoms it may land on. Derived from the step itself, so the arrow the
 * student draws is the arrow the trainer grades.
 */
export interface DrawArrow {
  readonly id: string;
  readonly start: readonly AtomId[];
  readonly end: readonly AtomId[];
}

export function drawArrowsOf(step: MechanismStep): DrawArrow[] {
  const bondAtoms = (bondId: string): AtomId[] => {
    for (const member of step.from.members) {
      const bond = member.species.bonds.find((b) => b.id === bondId);
      if (bond !== undefined) return [bond.a, bond.b];
    }
    return [];
  };
  return step.arrows.map((arrow) => {
    const start = arrow.source.kind === "bond" ? bondAtoms(arrow.source.bondId) : [arrow.source.atomId];
    const end = arrow.sink.kind === "atom" ? [arrow.sink.atomId] : [...arrow.sink.atomIds];
    return { id: arrow.id, start, end };
  });
}

export type ArrowVerdict = "right" | "badStart" | "badEnd";

/** A drag from `startId` dropped on `endId`. The start must be a source, the end a sink other than the start. */
export function gradeArrow(arrow: DrawArrow, startId: AtomId | null, endId: AtomId | null): ArrowVerdict {
  if (startId === null || !arrow.start.includes(startId)) return "badStart";
  if (endId === null || endId === startId || !arrow.end.includes(endId)) return "badEnd";
  return "right";
}

/** Which arrows each move asks for: arrow one on `attack`, all the rest on `release`. */
export function arrowsForMove(move: Move, arrows: readonly DrawArrow[]): readonly DrawArrow[] {
  if (move === "attack") return arrows.slice(0, 1);
  if (move === "release") return arrows.slice(1);
  return [];
}

/* ------------------------------------------------------------------ */
/* The tap                                                              */
/* ------------------------------------------------------------------ */

export type TapVerdict = "right" | "wrong";

export function gradeTap(tap: Tap, atomId: AtomId): TapVerdict {
  return tap.correct.includes(atomId) ? "right" : "wrong";
}

/** Where a move's tap stands: nothing yet, told once, or answer shown. */
export type TapState =
  | { readonly phase: "open" }
  | { readonly phase: "told" }
  | { readonly phase: "done"; readonly how: "right" | "shown" };

export const TAP_OPEN: TapState = Object.freeze({ phase: "open" });

/**
 * A tap moves the state: right finishes it, the first wrong tap tells why, the
 * second shows the answer. Nothing here ever blocks, and the view lets Continue
 * through in every phase.
 */
export function nextTapState(state: TapState, tap: Tap, atomId: AtomId): TapState {
  if (state.phase === "done") return state;
  if (gradeTap(tap, atomId) === "right") return { phase: "done", how: "right" };
  return state.phase === "open" ? { phase: "told" } : { phase: "done", how: "shown" };
}

/** Atoms to light: the move's focus, plus the answer once it is out. */
export function litAtoms(step: WalkStep, state: TapState): readonly AtomId[] {
  if (step.tap !== undefined && state.phase === "done") return [...new Set([...step.focus, ...step.tap.correct])];
  if (step.tap !== undefined) return [];
  return step.focus;
}

/* ------------------------------------------------------------------ */
/* Checks                                                               */
/* ------------------------------------------------------------------ */

function atomIdsOf(step: MechanismStep): ReadonlySet<AtomId> {
  const ids = new Set<AtomId>();
  for (const state of [step.from, step.to]) {
    for (const member of state.members) for (const atom of member.species.atoms) ids.add(atom.id);
  }
  return ids;
}

/**
 * Authoring problems in a lesson, as readable lines. Empty means sound.
 * `stepOf` is the trainer's step for the lesson's reaction id.
 */
export function reactionLessonIssues(lesson: ReactionLesson, stepOf: MechanismStep | undefined): string[] {
  const issues: string[] = [];
  const at = (move: string, what: string) => `${lesson.reactionId}/${move}: ${what}`;
  if (stepOf === undefined) return [`${lesson.reactionId}: no trainer reaction with this id`];
  const ids = atomIdsOf(stepOf);
  const order = lesson.steps.map((s) => s.move);
  const base = order.filter((m) => m !== "shape");
  const canonical = MOVES.filter((m) => m !== "shape" && base.includes(m));
  if (base.join() !== canonical.join()) issues.push(`${lesson.reactionId}: moves are not in template order`);
  for (const move of REQUIRED_MOVES) if (!order.includes(move)) issues.push(`${lesson.reactionId}: missing the ${move} move`);
  const shapeAt = order.indexOf("shape");
  if (shapeAt >= 0 && Math.abs(shapeAt - order.indexOf("attack")) !== 1) issues.push(`${lesson.reactionId}: shape must sit next to attack`);
  if (stepOf.arrows.length < 1) issues.push(`${lesson.reactionId}: the trainer step has no arrow to draw`);
  for (const step of lesson.steps) {
    if (step.body.trim().length < 40) issues.push(at(step.move, "body is too short to teach anything"));
    if (step.stereo.trim().length < 15) issues.push(at(step.move, "stereo note is missing"));
    if (/—|–/.test(step.body + step.stereo)) issues.push(at(step.move, "uses a dash the voice rules forbid"));
    for (const id of [...step.focus, ...(step.tap?.correct ?? [])]) {
      if (!ids.has(id)) issues.push(at(step.move, `atom id "${id}" is not in the reaction`));
    }
    if (step.tap !== undefined && step.tap.correct.length === 0) issues.push(at(step.move, "tap has no right answer"));
  }
  for (const move of ["attract", "attack"] as const) {
    if (lesson.steps.find((s) => s.move === move)?.tap === undefined) issues.push(at(move, "needs its tap"));
  }
  const resonance = lesson.steps.find((s) => s.move === "resonance");
  if (resonance !== undefined && resonance.resonance === undefined) issues.push(at("resonance", "needs a verdict"));
  for (const step of lesson.steps) {
    const visual = step.visual;
    if (visual?.kind === "bonds" && visual.rows.filter((r) => r.gives === true).length !== 1) issues.push(at(step.move, "exactly one bond row must give"));
    if (visual?.kind === "pyramid" && Math.abs(visual.to - visual.from) < 10) issues.push(at(step.move, "pyramid does not change shape"));
  }
  return issues;
}
