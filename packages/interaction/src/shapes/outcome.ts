/**
 * What a shape reducer returns, INCLUDING what it says it did.
 *
 * Every shape reducer has the same signature: it takes its own draft and a
 * command, and gives back a draft plus whatever it wants to say and do. That
 * uniformity is what lets machine.ts hold "which shape am I in" as one field
 * instead of threading a shape check through every transition.
 *
 * A reducer that changed nothing returns the SAME draft object, not an equal
 * copy. machine.ts uses reference equality to decide whether to push an undo
 * entry, so returning a fresh object that happens to be equal would fill the
 * undo stack with steps that appear to do nothing when replayed.
 *
 * WHY THERE IS A `report` FIELD, WHICH IS THE PHASE 2 STRUCTURAL FIX.
 *
 * Four adversary passes found five separate leaks of one assumption: that
 * machine.ts can work out what a command DID by diffing a lossy projection of
 * the draft afterwards. The projection was `hasSelection`, an OR over every
 * selection field a shape has, and the arithmetic fails the moment a shape has
 * two of them. The structure shape has two, `palette` and `pendingBondFrom`, so
 * a tap that disarmed a pending bond still read as "something is armed" because
 * an unrelated palette element was, and the revise window reopened on a disarm
 * and silently drew a bond nobody asked for. See adversaryPassFour.test.ts.
 *
 * Patching the projection is what iterations two through five did. The
 * structural answer is that the only code that KNOWS what a command did is the
 * reducer that did it, so it says so, and machine.ts reads the statement instead
 * of reconstructing it. `dropSession`'s `rolledBack` flag in machine.ts is the
 * same pattern and has never produced a finding: the function that performed the
 * act reports the act.
 *
 * ONE VALUE, NOT A SET. THE ARGUMENT.
 *
 * A command can plausibly do more than one thing at once. Committing an arrow
 * consumes the arming that made it possible, so it both disarms and commits.
 * That could be reported as a set of flags. It is deliberately not, for three
 * reasons.
 *
 * 1. A set has the failure mode being fixed here. `hasSelection` was a
 *    projection that every consumer had to interpret, and interpreting it wrong
 *    in one place is the whole bug. A set is also a structure every consumer has
 *    to interpret: the first consumer that asks `has("disarmed")` when it needed
 *    "disarmed and nothing else" reintroduces this bug class somewhere new. One
 *    value moves the judgement into the reducer, which is the only code with the
 *    facts, and an exhaustive `switch` makes a consumer that ignores a case a
 *    compile error rather than a silent wrong answer.
 *
 * 2. The compound case is not actually two facts. An arming consumed by the
 *    sink in the same command was never a state the student could act on. The
 *    two questions a consumer asks are "is there a selection waiting for its
 *    second half" and "did the answer change", and `committed` answers both, no
 *    for the first and yes for the second. Reporting `{disarmed, committed}`
 *    would let a consumer read a finished arrow as a cancelled selection, which
 *    is worse than not being able to ask.
 *
 * 3. No reducer in this package produces a genuine compound, meaning one where
 *    both halves outlive the command. If one ever does, the right move is a new
 *    named value decided once by whoever adds that command, which breaks every
 *    exhaustive switch loudly, rather than a set that every consumer quietly
 *    re-interprets.
 *
 * When a command does do two things, the reducer reports the one that decides
 * what the student can do NEXT, in this precedence:
 *
 *   refused > committed > armed > disarmed > inspected > nothing
 *
 * `refused` and `committed` are mutually exclusive by construction: a refusal
 * returns the draft it was given, so it cannot have changed the answer.
 *
 * THE INVARIANT THE SUITE ENFORCES.
 *
 * `nothing` and `refused` return the SAME draft object. Every other report
 * returns a different one. The type below gets half of that for free, because
 * `changed` will not accept `nothing` or `refused` and `unchanged`/`refused`
 * cannot say anything else. The other half, that `changed` was handed a genuinely
 * new object, is asserted across every shape and command in shapeReports.test.ts,
 * because a constructor cannot see the draft it is replacing.
 */

import type { InteractionEffect } from "../effects.js";
import type { InteractionNotice } from "../notices.js";

/**
 * What a command DID, stated by the reducer that did it.
 *
 * `nothing`    The draft is untouched and there is nothing to say about it.
 * `refused`    The student did something deliberate, it did not take effect,
 *              and a notice names why. The draft is untouched.
 * `armed`      A selection now waits for its second half, and this command is
 *              what put it there. This is the one the revise window turns on.
 * `disarmed`   A selection that was waiting is gone, and nothing was added in
 *              its place. A second tap on the armed thing, an Escape, a tap on
 *              empty space.
 * `committed`  The answer a grader will read changed: an arrow, a bond, an atom,
 *              a reordering, a chosen reagent, a predicted product. Any arming
 *              this command consumed on the way is gone.
 * `inspected`  The document changed, but neither the selection nor the answer.
 *              Reveals that draw lone pairs or hydrogen counts, and mode flags
 *              that only change what a LATER command will do. Undoable, because
 *              the student did it, but a grader never reads it.
 */
export type ShapeReport =
  | "nothing"
  | "refused"
  | "armed"
  | "disarmed"
  | "committed"
  | "inspected";

/**
 * The reports that require a new draft object.
 *
 * `changed()` takes this rather than `ShapeReport`, so a reducer cannot hand
 * back a fresh draft while claiming nothing happened, and cannot report a
 * refusal from a path that edited something.
 */
export type ChangeReport = Exclude<ShapeReport, "nothing" | "refused">;

/**
 * Every report this package can produce, for the same reason notices.ts keeps
 * `ALL_NOTICE_IDS`: a test can iterate it, and an adversary can go looking for
 * the value some shape has never produced.
 */
export const ALL_SHAPE_REPORTS: readonly ShapeReport[] = [
  "nothing",
  "refused",
  "armed",
  "disarmed",
  "committed",
  "inspected",
];

export interface ShapeOutcome<Draft> {
  readonly draft: Draft;
  /** What this command did, per the reducer that did it. Never inferred. */
  readonly report: ShapeReport;
  readonly notices: readonly InteractionNotice[];
  readonly effects: readonly InteractionEffect[];
}

/** Nothing happened, and nothing to say about it. */
export function unchanged<Draft>(draft: Draft): ShapeOutcome<Draft> {
  return { draft, report: "nothing", notices: [], effects: [] };
}

/** Nothing happened, and here is why. */
export function refused<Draft>(
  draft: Draft,
  notices: readonly InteractionNotice[],
  effects: readonly InteractionEffect[] = [],
): ShapeOutcome<Draft> {
  return { draft, report: "refused", notices, effects };
}

/**
 * The draft moved, and this is what the move was.
 *
 * `report` is not optional and has no default. A default would be a guess made
 * by this file on behalf of a reducer that knows better, which is the habit the
 * whole field exists to break.
 */
export function changed<Draft>(
  draft: Draft,
  report: ChangeReport,
  effects: readonly InteractionEffect[] = [],
  notices: readonly InteractionNotice[] = [],
): ShapeOutcome<Draft> {
  return { draft, report, notices, effects };
}

/**
 * The draft did not move, but the shell has something to do about it.
 *
 * `submit` is the only case: handing the draft to a grader changes nothing the
 * student can see and is not undoable, so the report is `nothing` and the work
 * rides in `effects`.
 */
export function emitted<Draft>(
  draft: Draft,
  effects: readonly InteractionEffect[],
): ShapeOutcome<Draft> {
  return { draft, report: "nothing", notices: [], effects };
}
