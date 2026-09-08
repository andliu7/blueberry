/**
 * Adversary pass, Phase 2, attack surface 2: the snapshot restore.
 *
 * THESE FOUR TESTS ARE INVERTED. They were written to document a data loss
 * defect and asserted the broken behaviour on purpose. They now assert the
 * fixed behaviour, with the same four scenarios untouched, because the
 * scenarios are the regression guard and the scenarios were never the problem.
 *
 * WHAT WAS BROKEN. R3 said a cancel "puts the document back exactly as it was
 * before R1 fired for that pointer", and `dropSession` implemented that by
 * storing `state.doc` at press time on the session (`snapshot`) and, on a
 * restoring drop, assigning `doc: session.snapshot` UNCONDITIONALLY. That
 * assignment never asked "has anything else happened to the document since this
 * snapshot was taken". It could not: `PointerSession.snapshot` was a single
 * DocumentState captured once, not a record of what this pointer did.
 *
 * The three rules only talk about pointers. But `commands.ts` documents a
 * SECOND, pointer free way to reach the exact same `applyCommand` path: "A
 * keyboard, a switch device, a screen reader action, or an ordinary button in
 * the shell's own chrome" dispatches a `command` event directly, with no
 * pointer session involved at all (see machine.ts, `reduce`, the `command`
 * case, and shapes/index.ts's header, which calls this "the pointer free entry
 * point"). That second path is not tracked by any session's snapshot. So: arm a
 * pointer (which takes a snapshot), let an UNRELATED command commit real work on
 * top of that snapshot, then cancel (or background) the original pointer. The
 * restore rolled the independent work back too, unrecoverably, because a
 * cancelled session never goes on the undo stack.
 *
 * WHAT IS TRUE NOW. A session carries `documentAfterOwnPress` as well as
 * `snapshot`, and `dropSession` reinstates the snapshot only while `state.doc`
 * is still the document this session's own press left behind. When it is not,
 * the rollback is skipped entirely, the newer work is kept, and a
 * `rollback_skipped_newer_work` notice names that decision instead of leaving
 * the shell to infer it from a generic `drag_cancelled`. Every scenario below
 * is therefore now a test that a stray cancel destroys nothing.
 *
 * The ordinary case is untouched and is guarded elsewhere: a lone pointer whose
 * own gesture is cancelled still reverts that gesture completely, arming
 * included. See pointerRules.test.ts, "R3: a cancel puts the document back", and
 * the press-committed-an-arrow case at the bottom of this file.
 */

import { describe, expect, it } from "vitest";

import { createMechanismDraft, type MechanismDraft } from "../src/shapes/mechanism.js";
import { createStructureDraft, type StructureDraft } from "../src/shapes/structure.js";
import { Driver, P, sn2StartingState, sn2Targets } from "./support.js";

function mechanismDriver(): Driver {
  return new Driver(createMechanismDraft(sn2StartingState()), sn2Targets());
}

function mechanismDraftOf(d: Driver): MechanismDraft {
  const draft = d.state.doc.draft;
  if (draft.shape !== "mechanism") throw new Error("expected the mechanism shape");
  return draft;
}

describe("R3 restore vs. the pointer free command entry point", () => {
  it("a pointerCancel keeps a whole arrow committed by an unrelated command while it was down", () => {
    const d = mechanismDriver();

    // Pointer 1 arms the oxygen lone pair. Its snapshot is the pristine,
    // pre-arrow document.
    d.down(P.oxygenLonePair);
    expect(mechanismDraftOf(d).armed).not.toBeNull();

    // An UNRELATED actor -- a switch device, a screen reader, a second person
    // driving the same session -- completes the arrow through the pointer
    // free `command` entry point while pointer 1 is still down. This commits
    // real, gradeable work: a full O-to-C nucleophilic attack arrow.
    d.send({ kind: "command", command: { kind: "selectTarget", target: { kind: "atom", atomId: "C1" } } });
    expect(mechanismDraftOf(d).arrows).toHaveLength(1);

    // Pointer 1 never moved and is now cancelled -- a palm lift, a system
    // gesture, anything R3 exists to cover. Nothing about this cancel is the
    // command's fault; the command was somebody else's input entirely.
    d.cancel(P.oxygenLonePair);

    // R3 now restores ONLY what pointer 1's own press did, and only while that
    // press is still the last word on the document. It is not, so the rollback
    // is skipped outright and the arrow survives.
    expect(mechanismDraftOf(d).arrows).toHaveLength(1);
    expect(d.sawNotice("drag_cancelled")).toBe(true);
    // And the shell is told which kind of cancel this was, rather than being
    // left to guess from a notice that fires for both. The generic
    // `drag_cancelled` still fires, because a cancel did happen; the second
    // notice is what says the document was deliberately left alone.
    expect(d.sawNotice("rollback_skipped_newer_work")).toBe(true);
    // Nothing of pointer 1's is stranded either: the command consumed the
    // arming into the arrow, so there is no leftover highlight.
    expect(mechanismDraftOf(d).armed).toBeNull();
  });

  it("appBackgrounded (an incoming call) keeps the same unrelated commit", () => {
    const d = mechanismDriver();

    d.down(P.oxygenLonePair);
    d.send({ kind: "command", command: { kind: "selectTarget", target: { kind: "atom", atomId: "C1" } } });
    expect(mechanismDraftOf(d).arrows).toHaveLength(1);

    // machine.ts: "Every platform stops sending pointer events at that
    // moment", so onBackgrounded takes the SAME guarded rollback R3 takes.
    // Same root cause, same fix, reached without any cancel event at all.
    d.background();

    expect(mechanismDraftOf(d).arrows).toHaveLength(1);
    expect(d.sawNotice("backgrounded_mid_drag")).toBe(true);
    expect(d.sawNotice("rollback_skipped_newer_work")).toBe(true);
    // The session still goes away. Backgrounding forgets the pointer either
    // way; what it may no longer do is take the document with it.
    expect(d.state.sessions).toHaveLength(0);
  });

  it("a cancel after a mid drag shape switch leaves the new shape and its progress alone", () => {
    const d = mechanismDriver();

    // Pointer 1 arms a source in the mechanism shape. Snapshot: mechanism,
    // nothing armed.
    d.down(P.oxygenLonePair);
    expect(d.state.doc.draft.shape).toBe("mechanism");

    // The app switches answer shape mid gesture -- entirely plausible if a
    // problem transitions from "draw the mechanism" to "now predict the
    // product" the moment the arrow completes, or if this pointer is a
    // leftover from a shape the student already left. `setShape` is a
    // top level command, not a shape reducer command, and it touches only
    // `state.doc`. It still does not know a pointer session exists, and it
    // still does not have to: replacing the document is what invalidates the
    // session's snapshot, and the check is on the document, not the command.
    const structureDraft = createStructureDraft("adversary-structure");
    d.send({ kind: "command", command: { kind: "setShape", draft: structureDraft } });
    expect(d.state.doc.draft.shape).toBe("structure");

    // Real progress happens in the new shape.
    d.send({
      kind: "command",
      command: { kind: "selectTarget", target: { kind: "paletteElement", element: "C" } },
    });
    const structAfterProgress = d.state.doc.draft as StructureDraft;
    expect(structAfterProgress.shape).toBe("structure");
    expect(structAfterProgress.palette).toBe("C");

    // Pointer 1, armed back when the shape was still "mechanism", is now
    // cancelled.
    d.cancel(P.oxygenLonePair);

    // The document's SHAPE FIELD does not revert. A shell that switched its
    // rendering to the structure editor stays in sync with
    // `currentDraft(state).shape`, which is the property that made this the
    // worst of the four: a silent shape revert desyncs the renderer from the
    // model with no event a renderer could act on.
    expect(d.state.doc.draft.shape).toBe("structure");
    const stillStructure = d.state.doc.draft as StructureDraft;
    expect(stillStructure.palette).toBe("C");
    expect(d.sawNotice("rollback_skipped_newer_work")).toBe(true);
  });

  it("a reused pointer id (a platform that dropped the up) keeps the unrelated commit too", () => {
    const d = mechanismDriver();

    // Pointer 1 arms a source. Its up never arrives -- the platform dropped
    // it, which is exactly the case `stale_pointer_session_replaced` exists
    // to name.
    d.down(P.oxygenLonePair, { pointerId: 1 });

    // While pointer 1 is stranded down, an unrelated command completes real
    // work, same as the cancel and background cases above.
    d.send({ kind: "command", command: { kind: "selectTarget", target: { kind: "atom", atomId: "C1" } } });
    expect(mechanismDraftOf(d).arrows).toHaveLength(1);

    // The platform reuses pointer id 1 for a fresh touch. onPointerDown finds
    // the stale session and calls the exact same
    // `dropSession(working, stale, { rollback: true })` that R3 and
    // appBackgrounded call, using pointer 1's ORIGINAL snapshot.
    d.down(P.carbonAtom, { pointerId: 1 });

    expect(d.sawNotice("stale_pointer_session_replaced")).toBe(true);
    // The unrelated arrow survives, exactly as it does for cancel and for
    // backgrounding, because all three call sites share the one restore path
    // and that path now checks whether its snapshot is still current.
    expect(mechanismDraftOf(d).arrows).toHaveLength(1);
    expect(d.sawNotice("rollback_skipped_newer_work")).toBe(true);
  });

  it("a pen preempting a resting hand keeps work committed while the hand rested", () => {
    // The fifth call site of the same restore, and the one the original four
    // findings did not name. D11's iPad case: the hand is down, the Pencil
    // arrives, and the touch is cancelled by R3. If that cancel were still
    // unconditional, an Apple Pencil touching down would delete an arrow the
    // student had just completed with the other hand or with a keyboard.
    const d = mechanismDriver();

    d.down(P.oxygenLonePair, { pointerId: 1, pointerType: "touch" });
    d.send({ kind: "command", command: { kind: "selectTarget", target: { kind: "atom", atomId: "C1" } } });
    expect(mechanismDraftOf(d).arrows).toHaveLength(1);

    d.down(P.bromineAtom, { pointerId: 2, pointerType: "pen" });

    expect(d.sawNotice("pen_preempted_touch")).toBe(true);
    expect(d.sawNotice("rollback_skipped_newer_work")).toBe(true);
    expect(mechanismDraftOf(d).arrows).toHaveLength(1);
    expect(d.state.sessions.map((session) => session.pointerId)).toEqual([2]);
  });
});

describe("the ordinary case the guard must not break", () => {
  it("a lone pointer's cancel still reverts an arrow its own press committed, and rearms the source", () => {
    // The press is not only ever an arming. With a source already armed, R1
    // COMMITS the arrow at pointerDown, before any release. This is the case a
    // selection-only snapshot would have got wrong, and it is why the fix is a
    // staleness check on a whole document snapshot rather than a narrower
    // capture. Nothing else touches the document here, so the rollback is
    // allowed and must be total.
    const d = mechanismDriver();

    d.tap(P.oxygenLonePair);
    expect(mechanismDraftOf(d).armed).not.toBeNull();

    d.down(P.carbonAtom);
    expect(mechanismDraftOf(d).arrows).toHaveLength(1);
    expect(mechanismDraftOf(d).armed).toBeNull();

    d.cancel(P.carbonAtom);

    // The arrow the press committed is gone, and the arming the press consumed
    // is back, because the whole press is what R3 takes back.
    expect(mechanismDraftOf(d).arrows).toHaveLength(0);
    expect(mechanismDraftOf(d).armed).not.toBeNull();
    expect(d.sawNotice("drag_cancelled")).toBe(true);
    expect(d.sawNotice("rollback_skipped_newer_work")).toBe(false);
  });

  it("a command that changed nothing does not block a rollback, because it changed nothing", () => {
    // The guard is on the document, not on command traffic. A command that
    // changes nothing returns the draft it was given, `commitDraft` hands back
    // the same DocumentState, and the session's snapshot is still an accurate
    // record of undoing its own press. A cancel after one must still work
    // normally, or a single stray keypress would disarm R3 for the rest of the
    // gesture and the fix would have swapped one silent failure for another.
    const d = mechanismDriver();

    d.down(P.oxygenLonePair);
    const docAfterPress = d.state.doc;

    // Setting the electron count to the value it already has. Real command
    // traffic, zero document change.
    d.send({ kind: "command", command: { kind: "setElectronCount", electrons: 2 } });
    expect(d.state.doc).toBe(docAfterPress);

    d.cancel(P.oxygenLonePair);

    // Full rollback, exactly as if the command had never been sent.
    expect(mechanismDraftOf(d).armed).toBeNull();
    expect(d.state.doc.past).toHaveLength(0);
    expect(d.sawNotice("rollback_skipped_newer_work")).toBe(false);
  });

  it("an unrelated commit strands nothing worse than the student's own highlight", () => {
    // The cost side of the trade, pinned down so it cannot drift. When the
    // newer commit does NOT consume the arming -- here a charge stepper on a
    // different atom entirely -- the skipped rollback leaves pointer 1's arming
    // in place. That is a highlight the student clears with one tap on empty
    // space. It is the whole price of never deleting committed work.
    const d = mechanismDriver();

    d.down(P.oxygenLonePair);
    // The hydrogen arc is documented in shapes/mechanism.ts as an inspection
    // affordance that must not disturb an armed source, so it is the cleanest
    // example of a real commit that leaves somebody else's arming standing.
    d.send({
      kind: "command",
      command: { kind: "selectTarget", target: { kind: "hydrogenCount", atomId: "C1" } },
    });
    expect(mechanismDraftOf(d).revealedHydrogens).toEqual(["C1"]);

    d.cancel(P.oxygenLonePair);

    // The inspection survives. That is the work that used to be destroyed.
    expect(mechanismDraftOf(d).revealedHydrogens).toEqual(["C1"]);
    expect(d.sawNotice("rollback_skipped_newer_work")).toBe(true);

    // Still armed, by the command rather than by the cancelled pointer. One tap
    // on empty space is the whole recovery.
    expect(mechanismDraftOf(d).armed).not.toBeNull();
    d.tap(P.nowhere);
    expect(mechanismDraftOf(d).armed).toBeNull();
  });
});
