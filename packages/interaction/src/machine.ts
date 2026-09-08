/**
 * The pointer state machine.
 *
 * Pure. No DOM, no React, no React Native, no timers, no clock, no randomness.
 * `reduce(state, event, environment)` is a function, and the same three inputs
 * always give the same output. Everything a shell needs to do that is not a
 * state change comes back as an effect.
 *
 * THREE RULES ARE THE ENTIRE POINTER LAYER. They are worth reading before
 * anything else in this file.
 *
 *   R1  Every pointerDown selects whatever is under it.
 *   R2  Every pointerUp selects whatever is under it, but ONLY if that is a
 *       different target from the one the press was on.
 *   R3  Every pointerCancel selects nothing and undoes ITS OWN pointer's press,
 *       and nothing else. Precisely: it restores the document to the state it
 *       was in immediately before R1 fired for that pointer, but only while
 *       that press is still the last thing that changed the document. If
 *       anything has committed since, the cancel restores nothing at all and
 *       says so by name. See "WHAT R3 MAY AND MAY NOT TAKE BACK" below.
 *
 * A tap is the case where R2 finds the same target and does nothing. A drag is
 * the case where it finds a different one. There is no tap branch, no drag
 * branch, no movement threshold, and no double tap window. That is what makes
 * tap only completion first class rather than bolted on: the tap path is not an
 * alternative to the drag path, it is the same path with a shorter journey.
 *
 * It also disposes of a whole class of edge case by construction:
 *
 *   a drag released over empty space      R2 selects `empty`, which clears
 *   a drag released over its own source   R2 finds the same target, nothing
 *   a tap faster than a state transition  there are no timers to be faster than
 *   a shaky hand on a small handle        no distance threshold to cross
 *
 * WHY MOVEMENT DISTANCE IS NOT USED TO CLASSIFY ANYTHING.
 *
 * Whether a wobble is still on the handle is a hit testing question, and it is
 * answered by the fingertip model in the geometry package, which knows the
 * contact radius for each pointer kind. A pixel threshold here would be a second
 * opinion on the same question, tuned by hand, and the two would disagree at the
 * worst moment. `maxDistanceFromDown` is recorded for renderers, never read for
 * a decision.
 *
 * WHAT R3 MAY AND MAY NOT TAKE BACK.
 *
 * R3 used to be written as "puts the document back exactly as it was before R1
 * fired for that pointer", and it was implemented by capturing the whole
 * document at press time and reassigning it on cancel. That sentence is only
 * true when the pointer's press is the last thing that happened. It is a data
 * loss bug the moment it is not, because the capture is a photograph of the
 * whole document, not a record of what this pointer did, and reinstating it
 * deletes everything anyone else committed in the meantime. There is no undo
 * for that: a cancelled session is not an action the student took, so it never
 * goes on the undo stack, so there is nothing to press undo on afterwards.
 *
 * "Anyone else" is not hypothetical and does not need two fingers. `command`
 * events are the pointer free entry point, and a keyboard, a switch device, a
 * screen reader action or a button in the shell's own chrome can commit a whole
 * arrow while a pointer sits on the glass. `setShape` can swap the answer shape
 * underneath a live session. A student can hit undo one handed. Every one of
 * those lands on the document with no pointer session involved.
 *
 * So the rule is: A SESSION MAY ROLL BACK ONLY ITS OWN WORK, AND ONLY WHILE
 * THAT WORK IS STILL THE LAST WORD ON THE DOCUMENT.
 *
 * That is cheap to enforce here because the machine already guarantees a
 * session touches the document exactly once. R1 applies one command at press.
 * Moves apply nothing, by construction, and R2 removes the session before it
 * applies anything. So a session's press is its only edit, and any later change
 * to `state.doc` is by definition somebody else's. Each session therefore
 * carries two documents: `snapshot`, the one before its press, and
 * `documentAfterOwnPress`, the one its press left behind. A rollback is allowed
 * exactly while `state.doc` is still that same object, and every one of the
 * four places that asks for a rollback goes through the one guard in
 * `dropSession`, so no call site can forget it.
 *
 * WHAT THIS COSTS THE STUDENT, which is the argument for it.
 *
 * The case being traded is a palm brushing the glass while a lone pair is armed
 * and something else commits. Before: the commit is destroyed, silently and
 * unrecoverably. After: nothing is destroyed, and what can be left behind is at
 * worst the student's own arming, still highlighted, when the newer commit did
 * not consume it. That is a highlight, cleared by one tap on empty space or one
 * Escape. Losing a highlight costs a tap. Losing a completed arrow costs the
 * work, with no undo entry to recover it from.
 *
 * The alternative considered and rejected was to snapshot only the selection
 * layer rather than the whole document, so a cancel would clear the arming and
 * leave everything else. It does not hold, because R1 does not only ever arm:
 * pressing a sink while something is armed COMMITS AN ARROW at press time, and
 * pressing a bare atom toggles its lone pairs. A selection only snapshot would
 * leave those committed after a cancel, which breaks the ordinary lone pointer
 * case that R3 exists for. It would also need machine.ts to ask a shape to put
 * a selection back, and machine.ts contains no shape name on purpose.
 *
 * WHY ONE POINTER OWNS THE MACHINE.
 *
 * There is no two handed gesture in this product. A second contact during a drag
 * is a palm, a resting knuckle, or a second person, and destroying the drag in
 * progress is the worst answer. The first pointer down owns the machine, later
 * ones are tracked and apply nothing. `touch-action: none` at the shell boundary
 * stops the browser turning that palm into a scroll; this is the other half of
 * the same job.
 *
 * The one exception is a pen arriving during a touch drag, which is a hand
 * resting on an iPad while the Pencil comes down. The pen wins, and the touch it
 * displaces is cancelled by R3 rather than committed. See D11.
 *
 * WHAT THIS FILE IS TOLD, AND WHAT IT WORKS OUT FOR ITSELF.
 *
 * Two different questions get answered two different ways here, and mixing them
 * up cost Phase 2 four adversary passes.
 *
 *   "did the document move at all"      answered by reference identity, here
 *   "what did that command actually do" answered by the reducer that did it
 *
 * The first is a property of this file's own bookkeeping. Every DocumentState is
 * frozen and replaced rather than mutated, and a command that changes nothing
 * returns the document it was given, so `a === b` is exact rather than a
 * heuristic. R3's rollback guard, R2's release guard and the in flight guide all
 * rest on it and none of them has ever produced a finding.
 *
 * The second is not a property of anything this file can see. It used to be
 * guessed from `hasSelection(draft)` after the fact, which is an OR over every
 * selection field a shape happens to have, and the guess is wrong the moment a
 * shape has two of them. Every reducer now states its own answer in
 * `ShapeOutcome.report`, and this file reads the statement. `dropSession` has
 * always worked that way with `rolledBack`; the shapes do now too.
 */

import {
  applyToShape,
  armedHintFor,
  hasSelection,
  installRefusalFor,
  type ShapeDraft,
  type ShapeReport,
} from "./shapes/index.js";
import { commitDraft, createDocument, resetDocument, undoDocument, type DocumentState } from "./document.js";
import type { InteractionCommand } from "./commands.js";
import type { InteractionEffect } from "./effects.js";
import { isContested, type HitTestOutcome, type InteractionEnvironment } from "./geometryPort.js";
import type { CommandSeq } from "./ids.js";
import { notice, type InteractionNotice } from "./notices.js";
import {
  distance2,
  isPrimaryButton,
  readPressure,
  type Point2,
  type PointerInput,
  type PointerKind,
  type PressureReading,
} from "./pointer.js";
import { sameTarget, type HitTarget } from "./targets.js";

/**
 * `owner` drives the document. `ignored` is tracked so its release can be
 * matched and discarded, and so a renderer can draw it if it wants to.
 */
export type SessionRole = "owner" | "ignored";

export interface PointerSession {
  readonly pointerId: number;
  readonly pointerType: PointerKind;
  readonly role: SessionRole;
  readonly downPoint: Point2;
  readonly downTarget: HitTarget;
  readonly point: Point2;
  /** What is under the pointer right now. Refreshed on every move. */
  readonly target: HitTarget;
  /** Recorded for renderers. Never read to decide anything. See the header. */
  readonly maxDistanceFromDown: number;
  /** True once the pointer has been over something other than where it started. */
  readonly leftDownTarget: boolean;
  readonly pressure: PressureReading;
  readonly downTimestampMs: number;
  readonly lastTimestampMs: number;
  /** The document as it was before this session touched it. R3 restores this. */
  readonly snapshot: DocumentState;
  /**
   * The document this session's press left behind, which for an ignored session
   * is the same object as `snapshot` because it pressed nothing.
   *
   * This is the staleness check R3 turns on. While `state.doc` is still this
   * exact object, this session's press is the last thing that changed the
   * document and `snapshot` is an accurate record of undoing it. The moment it
   * is not, somebody else has committed and `snapshot` would delete their work.
   * Reference identity is the whole test: every document here is frozen and
   * replaced rather than mutated, and a command that changes nothing returns the
   * document it was given, so a refused arrow does not invalidate anything.
   */
  readonly documentAfterOwnPress: DocumentState;
}

export interface InteractionState {
  readonly doc: DocumentState;
  readonly sessions: readonly PointerSession[];
  /** Increments once per command applied. Stamped onto notices so they can be traced. */
  readonly commandSeq: CommandSeq;
  /**
   * The document produced by the most recent CONTESTED pointer selection, and
   * null the moment anything else changes the document. Revise exists for one
   * flow only, the "did you mean" affordance that follows target_was_ambiguous,
   * so this window opens exactly when that notice fires and closes on any other
   * change. reviseLastTarget may undo only while the document is still this
   * object. Undoing blind was silent, unrecoverable data loss, because there is
   * no redo stack for a destroyed commit to come back from, and an unambiguous
   * selection never shows the affordance in the first place.
   */
  readonly reviseWindow: DocumentState | null;
}

export type InteractionEvent =
  | { readonly kind: "pointerDown"; readonly pointer: PointerInput }
  | { readonly kind: "pointerMove"; readonly pointer: PointerInput }
  | { readonly kind: "pointerUp"; readonly pointer: PointerInput }
  | { readonly kind: "pointerCancel"; readonly pointer: PointerInput }
  /**
   * The app lost the foreground mid gesture: a phone call, a task switch, a
   * Safari tab going to the background. Every platform stops sending pointer
   * events at that moment and most never send the matching up, so a machine that
   * waits for one waits forever with a dashed line frozen on screen. Shells map
   * visibilitychange, blur, and React Native's AppState to this.
   */
  | { readonly kind: "appBackgrounded"; readonly timestampMs: number }
  /**
   * The pointer free entry point. A keyboard, a switch device, a screen reader
   * action, or an ordinary button in the shell's own chrome. Everything a tap can
   * do, this can do, because a tap is only a way of producing one of these.
   */
  | { readonly kind: "command"; readonly command: InteractionCommand };

export interface Transition {
  readonly state: InteractionState;
  readonly notices: readonly InteractionNotice[];
  readonly effects: readonly InteractionEffect[];
  /**
   * What the shape reducer said the command behind this event did, or null when
   * no shape reducer ran.
   *
   * Null covers three cases and they are all "do not ask a shape about this":
   * an event that applied no command at all (a move, a cancel, an ignored
   * pointer's press), a document operation the shapes have no opinion on (undo,
   * setShape), and a refusal this file minted itself. Machine level refusals
   * already carry a named notice, so nothing is lost by not also calling them
   * `refused` here, and conflating "the shape refused" with "the machine
   * refused" would be the same class of mistake this field exists to end.
   */
  readonly report: ShapeReport | null;
}

export function createInteractionState(draft: ShapeDraft): InteractionState {
  return Object.freeze({
    doc: createDocument(draft),
    sessions: Object.freeze([]),
    commandSeq: 0,
    reviseWindow: null,
  });
}

export function reduce(
  state: InteractionState,
  event: InteractionEvent,
  env: InteractionEnvironment,
): Transition {
  switch (event.kind) {
    case "pointerDown":
      return onPointerDown(state, event.pointer, env);
    case "pointerMove":
      return onPointerMove(state, event.pointer, env);
    case "pointerUp":
      return onPointerUp(state, event.pointer, env);
    case "pointerCancel":
      return onPointerCancel(state, event.pointer);
    case "appBackgrounded":
      return onBackgrounded(state);
    case "command":
      return applyCommand(state, event.command, env);
  }
}

// ---------------------------------------------------------------------------
// Pointer handling
// ---------------------------------------------------------------------------

function onPointerDown(
  state: InteractionState,
  pointer: PointerInput,
  env: InteractionEnvironment,
): Transition {
  const notices: InteractionNotice[] = [];
  let working = state;

  // A second down for a pointer already down means an up went missing, which
  // happens when a platform drops events under load. Treat the old one as
  // cancelled rather than carrying two sessions with the same id.
  const stale = findSession(working, pointer.pointerId);
  if (stale !== undefined) {
    const dropped = dropSession(working, stale, { rollback: true });
    working = dropped.state;
    notices.push(
      notice(
        "stale_pointer_session_replaced",
        "info",
        `pointer ${pointer.pointerId} went down twice without an up`,
      ),
      ...dropped.notices,
    );
  }

  // A right or middle mouse button belongs to the platform's context menu.
  if (!isPrimaryButton(pointer)) {
    notices.push(
      notice(
        "non_primary_button_ignored",
        "info",
        `pointer ${pointer.pointerId} used a non primary button`,
      ),
    );
    return {
      state: addSession(working, buildSession(working, pointer, "ignored", emptyAt(pointer.point))),
      notices,
      effects: [],
      report: null,
    };
  }

  const owner = ownerSession(working);
  if (owner !== undefined) {
    const penTakesOver = pointer.pointerType === "pen" && owner.pointerType === "touch";
    if (penTakesOver) {
      // The hand resting on the iPad loses to the Pencil. R3 on the touch, with
      // R3's staleness guard, so the Pencil arriving cannot delete an arrow the
      // student completed by some other route while their hand was resting.
      const dropped = dropSession(working, owner, { rollback: true });
      working = dropped.state;
      notices.push(
        notice(
          "pen_preempted_touch",
          "info",
          `pen ${pointer.pointerId} took over from touch ${owner.pointerId}, which was cancelled`,
        ),
        ...dropped.notices,
      );
    } else {
      notices.push(
        notice(
          "secondary_pointer_ignored",
          "info",
          `pointer ${pointer.pointerId} arrived while pointer ${owner.pointerId} was drawing`,
        ),
      );
      const hit = hitTest(working, pointer, env);
      return {
        state: addSession(working, buildSession(working, pointer, "ignored", hit.primary)),
        notices,
        effects: [],
        report: null,
      };
    }
  }

  const hit = hitTest(working, pointer, env);
  const session = buildSession(working, pointer, "owner", hit.primary);
  working = addSession(working, session);

  // R1.
  const applied = applyCommand(working, { kind: "selectTarget", target: hit.primary }, env);

  // The press is this session's only edit to the document, so record what it
  // left behind. Everything that changes `state.doc` after this point belongs to
  // somebody else, and that is what makes R3's rollback guard exact rather than
  // a heuristic.
  const pressed = replaceSession(
    applied.state,
    Object.freeze({ ...session, documentAfterOwnPress: applied.state.doc }),
  );

  // A contested press that ARMED something opens the revise window: this is the
  // moment target_was_ambiguous fires and the "did you mean" affordance becomes
  // honest to offer, because revise is undo plus reapply and that only
  // reproduces what the student meant when the thing being corrected was an
  // arming. Correcting a disarm resurrects the very selection the student just
  // cancelled; correcting a commit undoes work.
  //
  // One reducer statement, no projection. The condition used to be "the document
  // moved AND something is armed now", and the second half is what four adversary
  // passes kept getting through: in the structure shape an unrelated armed
  // palette element made a disarm read as an arming, and revise then silently
  // bonded two atoms. See adversaryPassFour.test.ts finding 1.
  const withWindow =
    isContested(hit) && applied.report === "armed"
      ? Object.freeze({ ...pressed, reviseWindow: applied.state.doc })
      : pressed;

  return {
    state: withWindow,
    notices: [...notices, ...ambiguityNotices(hit, applied.state.commandSeq), ...applied.notices],
    effects: applied.effects,
    report: applied.report,
  };
}

function onPointerMove(
  state: InteractionState,
  pointer: PointerInput,
  env: InteractionEnvironment,
): Transition {
  const session = findSession(state, pointer.pointerId);
  if (session === undefined) {
    return {
      state,
      notices: [unknownPointer(pointer.pointerId, "move")],
      effects: [],
      report: null,
    };
  }

  const notices: InteractionNotice[] = [];
  if (pointer.timestampMs < session.lastTimestampMs) {
    notices.push(
      notice(
        "timestamp_went_backwards",
        "info",
        `pointer ${pointer.pointerId} reported ${pointer.timestampMs} after ${session.lastTimestampMs}; nothing here reads the clock, so this is a diagnostic only`,
      ),
    );
  }

  // Moves never apply a command. They keep the in flight guide honest and
  // nothing else.
  const hit = hitTest(state, pointer, env);
  const moved = distance2(session.downPoint, pointer.point);
  const updated: PointerSession = Object.freeze({
    ...session,
    point: pointer.point,
    target: hit.primary,
    maxDistanceFromDown: Math.max(session.maxDistanceFromDown, moved),
    leftDownTarget: session.leftDownTarget || !sameTarget(hit.primary, session.downTarget),
    pressure: readPressure(pointer),
    lastTimestampMs: pointer.timestampMs,
  });

  return { state: replaceSession(state, updated), notices, effects: [], report: null };
}

function onPointerUp(
  state: InteractionState,
  pointer: PointerInput,
  env: InteractionEnvironment,
): Transition {
  const session = findSession(state, pointer.pointerId);
  if (session === undefined) {
    return { state, notices: [unknownPointer(pointer.pointerId, "up")], effects: [], report: null };
  }

  const notices: InteractionNotice[] = [];
  if (pointer.timestampMs < session.lastTimestampMs) {
    notices.push(
      notice(
        "timestamp_went_backwards",
        "info",
        `pointer ${pointer.pointerId} released at ${pointer.timestampMs}, before its last move at ${session.lastTimestampMs}`,
      ),
    );
  }

  const hit = hitTest(state, pointer, env);
  const working = dropSession(state, session, { rollback: false }).state;

  if (session.role !== "owner") {
    return { state: working, notices, effects: [], report: null };
  }

  // R2. Same target as the press means the press already said everything.
  if (sameTarget(hit.primary, session.downTarget)) {
    // `hasSelection` is the right tool here and stays. This is the present tense
    // question, "is something armed now", asked on a path that applies no
    // command at all and so has no report to read.
    if (session.leftDownTarget && hasSelection(working.doc.draft)) {
      notices.push(
        notice(
          "drag_ended_on_its_own_source",
          "info",
          "the pointer wandered off and came back, so the selection was left as it was",
        ),
      );
    }
    return { state: working, notices, effects: [], report: null };
  }

  // A drag's release continues what its own press started, and nothing else.
  // If the document changed under the drag, the armed source belongs to another
  // input path, and completing an arrow from a source this pointer never
  // touched is the completion half of the guide defect. The tap path is
  // untouched: a press is its own selection under R1, which is exactly how
  // arming by command and tapping the sink works.
  if (state.doc !== session.documentAfterOwnPress) {
    notices.push(
      notice(
        "release_ignored_newer_work",
        "info",
        `pointer ${pointer.pointerId} released over a new target, but the document changed mid drag, so the release was ignored`,
      ),
    );
    return { state: working, notices, effects: [], report: null };
  }

  const applied = applyCommand(working, { kind: "selectTarget", target: hit.primary }, env);
  // Same arming condition as R1's window, read from the same statement.
  const withWindow =
    isContested(hit) && applied.report === "armed"
      ? Object.freeze({ ...applied.state, reviseWindow: applied.state.doc })
      : applied.state;
  return {
    state: withWindow,
    notices: [...notices, ...ambiguityNotices(hit, applied.state.commandSeq), ...applied.notices],
    effects: applied.effects,
    report: applied.report,
  };
}

function onPointerCancel(state: InteractionState, pointer: PointerInput): Transition {
  const session = findSession(state, pointer.pointerId);
  if (session === undefined) {
    return {
      state,
      notices: [unknownPointer(pointer.pointerId, "cancel")],
      effects: [],
      report: null,
    };
  }

  // R3. This session's own press goes back, history included, and nothing else
  // does. `dropSession` decides whether the rollback is still safe to apply.
  const dropped = dropSession(state, session, { rollback: true });
  const notices =
    session.role === "owner"
      ? [
          notice(
            "drag_cancelled",
            "info",
            dropped.rolledBack
              ? `pointer ${pointer.pointerId} was cancelled by the platform; its own press was rolled back`
              : `pointer ${pointer.pointerId} was cancelled by the platform; its press was already superseded, so the document was left alone`,
          ),
          ...dropped.notices,
        ]
      : [];
  return { state: dropped.state, notices, effects: [], report: null };
}

function onBackgrounded(state: InteractionState): Transition {
  if (state.sessions.length === 0) {
    return { state, notices: [], effects: [], report: null };
  }

  // Every live session is cancelled. Only the owner can have a rollback, because
  // ignored sessions never changed anything, and that rollback runs through the
  // same R3 guard a pointerCancel does: an incoming phone call is not a licence
  // to delete an arrow the student finished while the pointer sat on the glass.
  const owner = ownerSession(state);
  const dropped =
    owner === undefined
      ? { state, rolledBack: false, notices: [] as readonly InteractionNotice[] }
      : dropSession(state, owner, { rollback: true });

  return {
    state: Object.freeze({ ...dropped.state, sessions: Object.freeze([]) }),
    notices: [
      notice(
        "backgrounded_mid_drag",
        "info",
        `the app lost the foreground with ${state.sessions.length} pointer(s) down; all were cancelled`,
      ),
      ...dropped.notices,
    ],
    effects: [],
    report: null,
  };
}

// ---------------------------------------------------------------------------
// Commands
// ---------------------------------------------------------------------------

function applyCommand(
  state: InteractionState,
  command: InteractionCommand,
  env: InteractionEnvironment,
): Transition {
  const seq = state.commandSeq + 1;

  switch (command.kind) {
    case "undo": {
      const undone = undoDocument(state.doc);
      if (undone === null) {
        return {
          state: bumpSeq(state, seq),
          notices: [stamp(notice("nothing_to_undo", "info", "the draft is already at its start"), seq)],
          effects: [],
          report: null,
        };
      }
      // Null, not a report. An undo can put back an arming, take back an arrow,
      // or hide a lone pair, and which of those it did is a question about the
      // draft that came off the stack, not about anything a reducer said. This
      // file will not guess, which is the whole point of the field.
      return {
        state: Object.freeze({ ...state, doc: undone, commandSeq: seq, reviseWindow: null }),
        notices: [],
        effects: [],
        report: null,
      };
    }

    case "reviseLastTarget": {
      // "No, I meant that one." Built from undo rather than from a special case
      // in the pointer layer, so it works the same whether the mis-hit came from
      // a tap, a drag, or a keyboard.
      //
      // The undo is guarded, not blind. Revise corrects one specific thing: the
      // last target selection. If anything else has changed the document since,
      // the top of the undo stack is somebody else's work, there is no redo
      // stack for it to come back from, and undoing it here would be silent
      // permanent loss. Worse, the wrong guess would still be armed underneath,
      // so the corrected target would commit as a sink against it and be
      // refused. Refusing the revise by name is strictly better on both counts.
      // One nullable carries the whole decision. The window only opens on a
      // contested selection that changed the document, so while it is open the
      // undo stack cannot be empty and undoDocument cannot return null. A
      // closed or stale window short circuits to null here, which folds the
      // impossible arm into the two real ones instead of leaving dead code.
      const undone = state.doc === state.reviseWindow ? undoDocument(state.doc) : null;
      if (undone === null) {
        // On an empty undo stack nothing can be lost, so revise degrades to a
        // plain selection, which is what it always did on a fresh draft. With
        // history present, the top of the stack is somebody else's work and the
        // refusal is the whole point.
        if (state.doc.past.length === 0) {
          return applyCommand(state, { kind: "selectTarget", target: command.target }, env);
        }
        return {
          state: bumpSeq(state, seq),
          notices: [
            stamp(
              notice(
                "revise_refused_newer_work",
                "info",
                "the document has changed since that selection, so revising it now would undo somebody else's work. Tap the intended target instead",
              ),
              seq,
            ),
          ],
          effects: [],
          report: null,
        };
      }
      const rolled = Object.freeze({ ...state, doc: undone, reviseWindow: null });
      return applyCommand(rolled, { kind: "selectTarget", target: command.target }, env);
    }

    case "setShape": {
      // The one command that used to skip the no-op discipline every shape
      // reducer follows. Redispatching the active draft (a re-mount, a retried
      // dispatch) minted a fresh DocumentState, which wiped undo history for
      // nothing and made the rollback guard's reference check read "newer work
      // exists" when the content was identical, so a legitimate cancel was
      // skipped and its notice lied. Same reference in means same state out.
      //
      // Reference equality is the documented cost, not an oversight. A shell
      // that rebuilds a content identical draft object on every render and
      // dispatches it still wipes history. Deep equating a whole ShapeDraft on
      // every setShape would be a second, drift prone notion of no change in a
      // package whose every other decision is reference based; the fix is shell
      // side memoisation. Argued in full in adversaryPassThree.test.ts.
      if (command.draft === state.doc.draft) {
        return { state: bumpSeq(state, seq), notices: [], effects: [], report: null };
      }

      // A draft arriving here has not necessarily been through its own
      // constructor. A restored session, an offline queue replay, or a JSON
      // round trip all produce a plain object, and `createMechanismDraft`'s
      // duplicate id throw guarded only the constructor, so this was the way in
      // for exactly the state that throw exists to keep out. Pass four finding 2.
      //
      // A refusal rather than a throw, because unlike a constructor this is a
      // live command with a notice channel. The question of which drafts carry a
      // MechanismState is asked in shapes/index.ts, so no shape name appears in
      // this file.
      const refusal = installRefusalFor(command.draft);
      if (refusal !== null) {
        return {
          state: bumpSeq(state, seq),
          notices: [stamp(refusal, seq)],
          effects: [],
          report: null,
        };
      }

      return {
        state: Object.freeze({
          ...state,
          doc: resetDocument(command.draft),
          commandSeq: seq,
          reviseWindow: null,
        }),
        notices: [],
        effects: [],
        report: null,
      };
    }

    default: {
      const outcome = applyToShape(state.doc.draft, command);
      const doc = commitDraft(state.doc, outcome.draft);
      // Any change to the document closes the revise window. A command is never
      // a contested hit, so only the pointer handlers reopen it, after this
      // returns. A command that changed nothing leaves the window alone.
      // Reference identity, deliberately kept. This asks whether the document
      // MOVED, which is exactly what identity answers, and it is the same
      // property R3 and R2 guard on. Asking the report instead would work only
      // while every reducer is honest, and this line is one of the things that
      // makes a dishonest report harmless rather than catastrophic.
      const reviseWindow = doc === state.doc ? state.reviseWindow : null;
      return {
        state: Object.freeze({ ...state, doc, commandSeq: seq, reviseWindow }),
        notices: outcome.notices.map((n) => stamp(n, seq)),
        effects: outcome.effects,
        report: outcome.report,
      };
    }
  }
}

// ---------------------------------------------------------------------------
// Selectors, for renderers
// ---------------------------------------------------------------------------

/**
 * The dashed line in `docs/reference/alchemie/extra/x01-drag-inflight-dashed-guide.png`.
 *
 * Null when nothing is being dragged, or when a pointer is down but nothing is
 * armed, because a guide from nowhere to somewhere means nothing.
 *
 * `from` is where the pointer pressed, not where the source is drawn. The state
 * machine has no idea where anything is on screen. A renderer that knows the
 * source's true anchor should draw from there instead; `anchor` names the target
 * so it can look it up.
 */
export interface InFlightGuide {
  readonly anchor: HitTarget;
  readonly from: Point2;
  readonly to: Point2;
  /** What the release would select right now, so the guide can preview the snap. */
  readonly snappedTo: HitTarget;
  readonly pointerType: PointerKind;
  readonly pressure: PressureReading;
  readonly distance: number;
}

export function inFlightGuide(state: InteractionState): InFlightGuide | null {
  const owner = ownerSession(state);
  if (owner === undefined) return null;
  if (!hasSelection(state.doc.draft)) return null;
  // The selection must be the owner's own. If the document has changed since
  // this pointer pressed, whatever is armed was armed by somebody else, and a
  // guide drawn from this pointer's press point to a source it never touched is
  // two parts of one screen disagreeing about what is being dragged.
  if (state.doc !== owner.documentAfterOwnPress) return null;
  return {
    anchor: owner.downTarget,
    from: owner.downPoint,
    to: owner.point,
    snappedTo: owner.target,
    pointerType: owner.pointerType,
    pressure: owner.pressure,
    distance: owner.maxDistanceFromDown,
  };
}

export function ownerSession(state: InteractionState): PointerSession | undefined {
  return state.sessions.find((session) => session.role === "owner");
}

export function activePointerCount(state: InteractionState): number {
  return state.sessions.length;
}

export function currentDraft(state: InteractionState): ShapeDraft {
  return state.doc.draft;
}

export function canUndo(state: InteractionState): boolean {
  return state.doc.past.length > 0;
}

// ---------------------------------------------------------------------------
// Small helpers
// ---------------------------------------------------------------------------

function hitTest(
  state: InteractionState,
  pointer: PointerInput,
  env: InteractionEnvironment,
): HitTestOutcome {
  return env.hitTester.hitTest({
    point: pointer.point,
    pointerType: pointer.pointerType,
    armedSource: armedHintFor(state.doc.draft),
  });
}

function ambiguityNotices(hit: HitTestOutcome, seq: CommandSeq): readonly InteractionNotice[] {
  if (!isContested(hit)) return [];
  return [
    stamp(
      notice(
        "target_was_ambiguous",
        "info",
        "two targets were too close to separate at this contact radius; the best guess was used",
        { candidates: hit.candidates },
      ),
      seq,
    ),
  ];
}

/**
 * Put the command's sequence number on a notice.
 *
 * Unconditional, and it used to guard on `value.commandSeq === undefined` first.
 * That guard was dead. Every notice reaching here is minted inside this package
 * by `notice()`, either in this file or in a shape reducer, and a shape reducer
 * is never told the sequence number, so it structurally cannot set one. The guard
 * was not an unexercised case, it was an unreachable one, and an unreachable
 * branch is a claim the suite can never check.
 */
function stamp(value: InteractionNotice, seq: CommandSeq): InteractionNotice {
  return { ...value, commandSeq: seq };
}

function unknownPointer(pointerId: number, phase: string): InteractionNotice {
  return notice(
    "unknown_pointer_ignored",
    "info",
    `pointer ${pointerId} sent a ${phase} with no matching down`,
  );
}

function emptyAt(point: Point2): HitTarget {
  return { kind: "empty", point };
}

function buildSession(
  state: InteractionState,
  pointer: PointerInput,
  role: SessionRole,
  target: HitTarget,
): PointerSession {
  return Object.freeze({
    pointerId: pointer.pointerId,
    pointerType: pointer.pointerType,
    role,
    downPoint: pointer.point,
    downTarget: target,
    point: pointer.point,
    target,
    maxDistanceFromDown: 0,
    leftDownTarget: false,
    pressure: readPressure(pointer),
    downTimestampMs: pointer.timestampMs,
    lastTimestampMs: pointer.timestampMs,
    snapshot: state.doc,
    // Overwritten for the owner as soon as R1 has applied. Until then the two
    // are the same document, which is exactly right: a session that has not
    // pressed anything yet has nothing to take back.
    documentAfterOwnPress: state.doc,
  });
}

function findSession(state: InteractionState, pointerId: number): PointerSession | undefined {
  return state.sessions.find((session) => session.pointerId === pointerId);
}

function addSession(state: InteractionState, session: PointerSession): InteractionState {
  return Object.freeze({ ...state, sessions: Object.freeze([...state.sessions, session]) });
}

function replaceSession(state: InteractionState, session: PointerSession): InteractionState {
  return Object.freeze({
    ...state,
    sessions: Object.freeze(
      state.sessions.map((existing) =>
        existing.pointerId === session.pointerId ? session : existing,
      ),
    ),
  });
}

/**
 * What happened when a session was removed, so a call site can say which.
 */
interface SessionDrop {
  readonly state: InteractionState;
  /** True only when the session's snapshot was actually reinstated. */
  readonly rolledBack: boolean;
  /** Non empty only when a rollback was asked for and refused as stale. */
  readonly notices: readonly InteractionNotice[];
}

/**
 * Remove a session, and roll the document back to its snapshot ONLY when that
 * snapshot is still an accurate record of undoing this session's own press.
 *
 * This is the single guard R3 rests on, and the four call sites that ask for a
 * rollback (a cancel, the app losing the foreground, a pointer id reused after a
 * dropped up, and a pen preempting a touch) all reach it. See "WHAT R3 MAY AND
 * MAY NOT TAKE BACK" in the header. `rollback: false` is the release path, which
 * has nothing to undo because the release is the student finishing on purpose.
 */
function dropSession(
  state: InteractionState,
  session: PointerSession,
  options: { readonly rollback: boolean },
): SessionDrop {
  const sessions = Object.freeze(
    state.sessions.filter((existing) => existing.pointerId !== session.pointerId),
  );

  // An ignored session never applied a command, so there is never anything of
  // its own to take back and its snapshot is not a rollback target.
  const wanted = options.rollback && session.role === "owner";

  if (wanted && state.doc !== session.documentAfterOwnPress) {
    return {
      state: Object.freeze({ ...state, sessions }),
      rolledBack: false,
      notices: [
        notice(
          "rollback_skipped_newer_work",
          "info",
          `the rollback for pointer ${session.pointerId} was skipped: the document changed after that pointer's press, so reverting it would have deleted work the pointer did not do`,
        ),
      ],
    };
  }

  return {
    state: Object.freeze({
      ...state,
      doc: wanted ? session.snapshot : state.doc,
      sessions,
    }),
    rolledBack: wanted,
    notices: [],
  };
}

function bumpSeq(state: InteractionState, seq: CommandSeq): InteractionState {
  return Object.freeze({ ...state, commandSeq: seq });
}
