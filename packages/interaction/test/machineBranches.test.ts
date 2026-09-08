/**
 * The corners of the machine and the small modules around it.
 *
 * Every test here exists because a real behaviour needed pinning down, and each
 * one is named for the behaviour rather than for the line it happens to reach.
 * The Phase 2 exit condition asks for 100 percent branch coverage on the state
 * machine module; that number is a consequence of these being written, not the
 * reason they were.
 */

import { describe, expect, it } from "vitest";

import { selectTarget } from "../src/commands.js";
import { UNDO_DEPTH } from "../src/document.js";
import {
  activePointerCount,
  canUndo,
  currentDraft,
  inFlightGuide,
  ownerSession,
} from "../src/machine.js";
import { ALL_NOTICE_IDS, noticeCount, type NoticeId } from "../src/notices.js";
import { createMechanismDraft, type MechanismDraft } from "../src/shapes/mechanism.js";
import { createInteractionStore } from "../src/store.js";
import { sameTarget, targetAtomId, type HitTarget } from "../src/targets.js";
import { Driver, P, sn2StartingState, sn2Targets } from "./support.js";

function mechanismDriver(): Driver {
  return new Driver(createMechanismDraft(sn2StartingState()), sn2Targets());
}

function draftOf(d: Driver): MechanismDraft {
  const draft = d.state.doc.draft;
  if (draft.shape !== "mechanism") throw new Error("expected the mechanism shape");
  return draft;
}

// ---------------------------------------------------------------------------
// Backgrounding
// ---------------------------------------------------------------------------

describe("losing the foreground", () => {
  it("with nothing down at all is not an event worth reporting", () => {
    const d = mechanismDriver();
    const before = d.state;

    d.background();

    expect(d.state).toBe(before);
    expect(d.notices).toEqual([]);
  });

  it("with only an ignored pointer down leaves the document exactly where it was", () => {
    const d = mechanismDriver();

    // A right mouse button never owns the machine, so there is no owner and
    // therefore no snapshot to roll back to. The document the student can see is
    // the one that must survive.
    d.down(P.oxygenLonePair, { pointerType: "mouse", buttonIsPrimary: false });
    const docWhileDown = d.state.doc;
    expect(activePointerCount(d.state)).toBe(1);
    expect(ownerSession(d.state)).toBeUndefined();

    d.background();

    expect(d.state.doc).toBe(docWhileDown);
    expect(draftOf(d).armed).toBeNull();
    expect(activePointerCount(d.state)).toBe(0);
    expect(d.sawNotice("backgrounded_mid_drag")).toBe(true);
  });

  it("with an owner down rolls that owner's selection back", () => {
    const d = mechanismDriver();
    const beforeAnything = d.state.doc;

    d.down(P.oxygenLonePair);
    expect(draftOf(d).armed).not.toBeNull();

    d.background();

    expect(d.state.doc).toBe(beforeAnything);
    expect(canUndo(d.state)).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// Sessions
// ---------------------------------------------------------------------------

describe("a second pointer moving around", () => {
  it("does not drag the owner's in flight guide with it", () => {
    const d = mechanismDriver();

    d.down(P.oxygenLonePair, { pointerId: 1 });
    d.down(P.carbonAtom, { pointerId: 2 });
    expect(activePointerCount(d.state)).toBe(2);

    const guideBefore = inFlightGuide(d.state);
    expect(guideBefore).not.toBeNull();

    // The ignored pointer travels the length of the molecule. The owner has not
    // moved, so nothing about the guide may change.
    d.move(P.bromineAtom, { pointerId: 2 });

    const guideAfter = inFlightGuide(d.state);
    expect(guideAfter?.from).toEqual(P.oxygenLonePair);
    expect(guideAfter?.to).toEqual(P.oxygenLonePair);
    expect(guideAfter?.snappedTo).toEqual({ kind: "lonePair", atomId: "O1", slotIndex: 0 });
    expect(ownerSession(d.state)?.pointerId).toBe(1);
    expect(activePointerCount(d.state)).toBe(2);
  });

  it("keeps its own tracked position, so a renderer could draw it", () => {
    const d = mechanismDriver();

    d.down(P.oxygenLonePair, { pointerId: 1 });
    d.down(P.carbonAtom, { pointerId: 2 });
    d.move(P.bromineAtom, { pointerId: 2 });

    const second = d.state.sessions.find((session) => session.pointerId === 2);
    expect(second?.point).toEqual(P.bromineAtom);
    expect(second?.role).toBe("ignored");
    expect(second?.leftDownTarget).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Selectors
// ---------------------------------------------------------------------------

describe("the selectors a renderer reads", () => {
  it("currentDraft is the live draft, not a copy of it", () => {
    const d = mechanismDriver();
    expect(currentDraft(d.state)).toBe(d.state.doc.draft);

    d.tap(P.oxygenLonePair);

    const draft = currentDraft(d.state);
    expect(draft).toBe(d.state.doc.draft);
    expect(draft.shape).toBe("mechanism");
    if (draft.shape !== "mechanism") throw new Error("unreachable");
    expect(draft.armed?.source).toEqual({ kind: "lonePair", atomId: "O1" });
  });

  it("inFlightGuide is null while a pointer is down over nothing armed", () => {
    const d = mechanismDriver();
    d.down(P.nowhere);
    expect(inFlightGuide(d.state)).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// The undo stack has a floor
// ---------------------------------------------------------------------------

describe("the undo history is bounded", () => {
  it(`keeps the most recent ${UNDO_DEPTH} steps and drops the oldest`, () => {
    const d = mechanismDriver();

    // Tapping an atom with nothing armed toggles its lone pairs on and off, and
    // each toggle is a real change to the draft, so each one is an undo entry.
    for (let i = 0; i < UNDO_DEPTH + 1; i += 1) d.tap(P.oxygenAtom);

    expect(d.state.doc.past.length).toBe(UNDO_DEPTH);

    for (let i = 0; i < UNDO_DEPTH; i += 1) {
      d.send({ kind: "command", command: { kind: "undo" } });
    }

    expect(canUndo(d.state)).toBe(false);
    // The very first state, with nothing revealed, fell off the bottom. What is
    // left is the state after the first tap, which is the oldest one still held.
    expect(draftOf(d).revealedLonePairs).toEqual(["O1"]);

    d.send({ kind: "command", command: { kind: "undo" } });
    expect(d.sawNotice("nothing_to_undo")).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// The store
// ---------------------------------------------------------------------------

describe("the external store", () => {
  it("does not wake subscribers for an event that changed nothing", () => {
    let woken = 0;
    const notices: NoticeId[] = [];
    const store = createInteractionStore({
      initialDraft: createMechanismDraft(sn2StartingState()),
      environment: { hitTester: { hitTest: () => ({ primary: { kind: "empty", point: P.nowhere }, candidates: [], margin: Number.POSITIVE_INFINITY }) } },
      onNotice: (item) => notices.push(item.id),
    });
    store.subscribe(() => {
      woken += 1;
    });

    const before = store.getSnapshot();
    // A release with no matching press. The machine says so and changes nothing.
    const transition = store.dispatch({
      kind: "pointerUp",
      pointer: { pointerId: 9, pointerType: "touch", point: P.nowhere, timestampMs: 1 },
    });

    expect(transition.state).toBe(before);
    expect(store.getSnapshot()).toBe(before);
    expect(woken).toBe(0);
    expect(notices).toEqual(["unknown_pointer_ignored"]);
  });
});

// ---------------------------------------------------------------------------
// Targets
// ---------------------------------------------------------------------------

describe("target identity", () => {
  it("a bond formation site names an unordered pair, so the two orderings are one target", () => {
    const forwards: HitTarget = { kind: "betweenAtomsSite", atomIds: ["C1", "O1"] };
    const backwards: HitTarget = { kind: "betweenAtomsSite", atomIds: ["O1", "C1"] };

    expect(sameTarget(forwards, backwards)).toBe(true);
    expect(sameTarget(backwards, forwards)).toBe(true);
    expect(sameTarget(forwards, { kind: "betweenAtomsSite", atomIds: ["C1", "Br1"] })).toBe(false);
  });

  it("names the atom a target sits on, and null for the ones that sit on none", () => {
    expect(targetAtomId({ kind: "atom", atomId: "C1" })).toBe("C1");
    expect(targetAtomId({ kind: "lonePair", atomId: "O1", slotIndex: 2 })).toBe("O1");
    expect(targetAtomId({ kind: "unpairedElectron", atomId: "C2" })).toBe("C2");
    expect(targetAtomId({ kind: "hydrogenCount", atomId: "C3" })).toBe("C3");
    expect(targetAtomId({ kind: "bondEndHandle", bondId: "b1", atomId: "Br1" })).toBe("Br1");

    expect(targetAtomId({ kind: "bondBody", bondId: "b1" })).toBeNull();
    expect(targetAtomId({ kind: "betweenAtomsSite", atomIds: ["C1", "O1"] })).toBeNull();
    expect(targetAtomId({ kind: "empty", point: P.nowhere })).toBeNull();
    expect(targetAtomId({ kind: "reagentTile", reagentId: "naoh_aqueous" })).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// The pointer free entry point
// ---------------------------------------------------------------------------

describe("the command constructor in commands.ts", () => {
  it("builds the one universal command, and a keyboard driving it arms the same source a tap would", () => {
    const tapped = mechanismDriver();
    tapped.tap(P.oxygenLonePair);

    const typed = mechanismDriver();
    const command = selectTarget({ kind: "lonePair", atomId: "O1", slotIndex: 0 });
    expect(command).toEqual({
      kind: "selectTarget",
      target: { kind: "lonePair", atomId: "O1", slotIndex: 0 },
    });
    typed.send({ kind: "command", command });

    expect(draftOf(typed).armed).toEqual(draftOf(tapped).armed);
    expect(typed.state.sessions).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// The notice registry
// ---------------------------------------------------------------------------

describe("the notice registry", () => {
  it("counts what it lists, with nothing listed twice", () => {
    expect(noticeCount()).toBe(ALL_NOTICE_IDS.length);
    expect(new Set(ALL_NOTICE_IDS).size).toBe(noticeCount());
    expect(noticeCount()).toBeGreaterThan(0);
  });

  it("lists every id the union declares", () => {
    // The value of this object is nothing. Its TYPE is the check: TypeScript
    // refuses to compile a Record<NoticeId, true> that is missing a key, so a
    // builder who adds a NoticeId and forgets ALL_NOTICE_IDS breaks the build
    // here rather than quietly shrinking the count the feedback axis is measured
    // on.
    const declared: Record<NoticeId, true> = {
      secondary_pointer_ignored: true,
      pen_preempted_touch: true,
      non_primary_button_ignored: true,
      stale_pointer_session_replaced: true,
      unknown_pointer_ignored: true,
      timestamp_went_backwards: true,
      drag_cancelled: true,
      rollback_skipped_newer_work: true,
      revise_refused_newer_work: true,
      release_ignored_newer_work: true,
      external_structure_duplicate_atom_ids: true,
      predicted_state_duplicate_atom_ids: true,
      restored_draft_duplicate_atom_ids: true,
      backgrounded_mid_drag: true,
      drag_ended_on_its_own_source: true,
      target_was_ambiguous: true,
      nothing_to_undo: true,
      target_not_valid_in_this_shape: true,
      command_not_valid_in_this_shape: true,
      nothing_selected_for_this_target: true,
      arrow_refused_by_legality: true,
      bond_source_needs_an_end: true,
      no_element_selected: true,
      atom_not_in_structure: true,
      bond_order_cycled_instead_of_added: true,
      reagent_already_chosen: true,
      sequence_slot_out_of_range: true,
      sequence_slot_requires_ordered_mode: true,
      unknown_candidate: true,
      reason_requires_a_choice: true,
    };

    expect(Object.keys(declared).sort()).toEqual([...ALL_NOTICE_IDS].sort());
  });
});
