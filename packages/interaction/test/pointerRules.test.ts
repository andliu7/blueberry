/**
 * The three rules at the top of machine.ts, and the edge cases the Phase 2 exit
 * condition names one by one.
 */

import { describe, expect, it } from "vitest";
import { createMechanismDraft } from "../src/shapes/mechanism.js";
import { canUndo, inFlightGuide } from "../src/machine.js";
import { Driver, P, sn2StartingState, sn2Targets } from "./support.js";

function driver(): Driver {
  return new Driver(createMechanismDraft(sn2StartingState()), sn2Targets());
}

function armedAtom(d: Driver): string | null {
  const draft = d.state.doc.draft;
  if (draft.shape !== "mechanism" || draft.armed === null) return null;
  const source = draft.armed.source;
  return source.kind === "bond" ? source.bondId : source.atomId;
}

function arrowCount(d: Driver): number {
  const draft = d.state.doc.draft;
  return draft.shape === "mechanism" ? draft.arrows.length : -1;
}

describe("R1: a press selects what is under it", () => {
  it("arms a lone pair on press, before the release arrives", () => {
    const d = driver();
    d.down(P.oxygenLonePair);
    expect(armedAtom(d)).toBe("O1");
  });

  it("gives the same result whether the press is a mouse, a touch, or a pen", () => {
    for (const pointerType of ["mouse", "touch", "pen"] as const) {
      const d = driver();
      d.tap(P.oxygenLonePair, { pointerType });
      expect(armedAtom(d)).toBe("O1");
    }
  });
});

describe("R2: a release selects only when the target changed", () => {
  it("a tap leaves the selection the press made", () => {
    const d = driver();
    d.tap(P.oxygenLonePair);
    expect(armedAtom(d)).toBe("O1");
    expect(arrowCount(d)).toBe(0);
  });

  it("a drag from source to sink draws the arrow", () => {
    const d = driver();
    d.drag(P.oxygenLonePair, P.carbonAtom);
    expect(arrowCount(d)).toBe(1);
    expect(armedAtom(d)).toBeNull();
  });

  it("two taps draw exactly the same arrow the drag drew", () => {
    const tapped = driver();
    tapped.tap(P.oxygenLonePair);
    tapped.tap(P.carbonAtom);

    const dragged = driver();
    dragged.drag(P.oxygenLonePair, P.carbonAtom);

    const a = tapped.state.doc.draft;
    const b = dragged.state.doc.draft;
    expect(a.shape).toBe("mechanism");
    expect(b.shape).toBe("mechanism");
    if (a.shape !== "mechanism" || b.shape !== "mechanism") return;
    expect(a.arrows).toEqual(b.arrows);
  });

  it("a drag released over empty space clears the selection and draws nothing", () => {
    const d = driver();
    d.drag(P.oxygenLonePair, P.nowhere);
    expect(armedAtom(d)).toBeNull();
    expect(arrowCount(d)).toBe(0);
  });

  it("a drag released over its own source keeps the selection and says so", () => {
    const d = driver();
    d.down(P.oxygenLonePair);
    d.move(P.nowhere);
    d.move(P.oxygenLonePair);
    d.up(P.oxygenLonePair);

    expect(armedAtom(d)).toBe("O1");
    expect(arrowCount(d)).toBe(0);
    expect(d.sawNotice("drag_ended_on_its_own_source")).toBe(true);
  });

  it("a press and release that never left the target does not claim the pointer wandered", () => {
    const d = driver();
    d.tap(P.oxygenLonePair);
    expect(d.sawNotice("drag_ended_on_its_own_source")).toBe(false);
  });

  it("tapping the armed source a second time lets it go", () => {
    const d = driver();
    d.tap(P.oxygenLonePair);
    d.tap(P.oxygenLonePair);
    expect(armedAtom(d)).toBeNull();
  });

  it("a drag from empty space onto empty space does nothing at all", () => {
    const d = driver();
    d.drag(P.nowhere, P.elsewhere);
    expect(armedAtom(d)).toBeNull();
    expect(arrowCount(d)).toBe(0);
    expect(canUndo(d.state)).toBe(false);
  });
});

describe("R3: a cancel puts the document back", () => {
  it("a cancelled drag leaves no arrow and no selection", () => {
    const d = driver();
    d.down(P.oxygenLonePair);
    d.move(P.carbonAtom);
    d.cancel(P.carbonAtom);

    expect(armedAtom(d)).toBeNull();
    expect(arrowCount(d)).toBe(0);
    expect(d.sawNotice("drag_cancelled")).toBe(true);
  });

  it("a cancelled drag does not leave its arming on the undo stack", () => {
    const d = driver();
    d.down(P.oxygenLonePair);
    d.cancel(P.oxygenLonePair);
    expect(canUndo(d.state)).toBe(false);
  });

  it("a cancel does not undo work done before the drag started", () => {
    const d = driver();
    d.tap(P.oxygenLonePair);
    d.tap(P.carbonAtom);
    expect(arrowCount(d)).toBe(1);

    d.down(P.handleAtBromine);
    d.cancel(P.handleAtBromine);
    expect(arrowCount(d)).toBe(1);
  });

  it("a cancel for a pointer that was never down is reported, not thrown", () => {
    const d = driver();
    expect(() => d.cancel(P.carbonAtom, { pointerId: 99 })).not.toThrow();
    expect(d.sawNotice("unknown_pointer_ignored")).toBe(true);
  });
});

describe("backgrounding mid drag", () => {
  it("rolls the drag back rather than waiting for an up that never comes", () => {
    const d = driver();
    d.down(P.oxygenLonePair);
    d.move(P.carbonAtom);
    d.background();

    expect(armedAtom(d)).toBeNull();
    expect(arrowCount(d)).toBe(0);
    expect(d.state.sessions).toHaveLength(0);
    expect(d.sawNotice("backgrounded_mid_drag")).toBe(true);
  });

  it("leaves committed work alone", () => {
    const d = driver();
    d.tap(P.oxygenLonePair);
    d.tap(P.carbonAtom);
    d.down(P.handleAtBromine);
    d.background();
    expect(arrowCount(d)).toBe(1);
  });

  it("is silent when nothing was down", () => {
    const d = driver();
    const before = d.state;
    d.background();
    expect(d.state).toBe(before);
    expect(d.notices).toHaveLength(0);
  });

  it("a pointer up arriving after backgrounding is reported, not applied", () => {
    const d = driver();
    d.down(P.oxygenLonePair);
    d.background();
    d.clearLog();
    d.up(P.carbonAtom);
    expect(arrowCount(d)).toBe(0);
    expect(d.sawNotice("unknown_pointer_ignored")).toBe(true);
  });
});

describe("taps faster than a state transition", () => {
  it("a whole mechanism drawn with every event on the same timestamp still works", () => {
    const d = driver();
    const t = { timestampMs: 0 };
    d.down(P.oxygenLonePair, t);
    d.up(P.oxygenLonePair, t);
    d.down(P.carbonAtom, t);
    d.up(P.carbonAtom, t);
    expect(arrowCount(d)).toBe(1);
  });

  it("a second press for a pointer whose release went missing replaces the session", () => {
    const d = driver();
    d.down(P.oxygenLonePair);
    d.down(P.carbonAtom);
    expect(d.sawNotice("stale_pointer_session_replaced")).toBe(true);
    expect(d.state.sessions).toHaveLength(1);
    // The lost press was rolled back, so the carbon press is a fresh selection
    // rather than the sink of an arrow nobody finished drawing.
    expect(arrowCount(d)).toBe(0);
  });

  it("a move whose timestamp goes backwards is flagged and otherwise harmless", () => {
    const d = driver();
    d.down(P.oxygenLonePair, { timestampMs: 100 });
    d.move(P.carbonAtom, { timestampMs: 50 });
    d.up(P.carbonAtom, { timestampMs: 101 });
    expect(d.sawNotice("timestamp_went_backwards")).toBe(true);
    expect(arrowCount(d)).toBe(1);
  });

  it("a release whose timestamp goes backwards is flagged and otherwise harmless", () => {
    const d = driver();
    d.down(P.oxygenLonePair, { timestampMs: 100 });
    d.up(P.carbonAtom, { timestampMs: 1 });
    expect(d.sawNotice("timestamp_went_backwards")).toBe(true);
    expect(arrowCount(d)).toBe(1);
  });

  it("a move for a pointer that was never down is reported, not applied", () => {
    const d = driver();
    d.move(P.carbonAtom, { pointerId: 42 });
    expect(d.sawNotice("unknown_pointer_ignored")).toBe(true);
    expect(d.state.sessions).toHaveLength(0);
  });
});

describe("the in flight guide", () => {
  it("appears only once something is armed and a pointer is down", () => {
    const d = driver();
    expect(inFlightGuide(d.state)).toBeNull();

    d.down(P.oxygenLonePair);
    const guide = inFlightGuide(d.state);
    expect(guide).not.toBeNull();
    expect(guide?.anchor).toEqual({ kind: "lonePair", atomId: "O1", slotIndex: 0 });

    d.move(P.carbonAtom);
    expect(inFlightGuide(d.state)?.to).toEqual(P.carbonAtom);
    expect(inFlightGuide(d.state)?.snappedTo).toEqual({ kind: "atom", atomId: "C1" });

    d.up(P.carbonAtom);
    expect(inFlightGuide(d.state)).toBeNull();
  });

  it("does not appear for a pointer pressed on nothing", () => {
    const d = driver();
    d.down(P.nowhere);
    expect(inFlightGuide(d.state)).toBeNull();
  });

  it("records how far the pointer travelled without using it for anything", () => {
    const d = driver();
    d.down(P.oxygenLonePair);
    d.move(P.carbonAtom);
    d.move(P.oxygenLonePair);
    const guide = inFlightGuide(d.state);
    expect(guide?.distance).toBeGreaterThan(0);
  });
});
