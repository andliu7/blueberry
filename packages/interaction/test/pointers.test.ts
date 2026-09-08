/**
 * Two pointers at once, the three pointer types, and pressure.
 *
 * D11 in docs/INHERITED-DECISIONS.md names iPad Safari with an Apple Pencil as a
 * target and requires pen to be modelled distinctly from touch. These are the
 * tests that hold that.
 */

import { describe, expect, it } from "vitest";
import { activePointerCount, ownerSession } from "../src/machine.js";
import {
  PEN_PRESSURE_WHEN_UNSUPPORTED,
  PRESSURE_WHEN_NOT_A_PEN,
  readPressure,
  type PointerInput,
} from "../src/pointer.js";
import { createMechanismDraft } from "../src/shapes/mechanism.js";
import { Driver, P, sn2StartingState, sn2Targets } from "./support.js";

function driver(): Driver {
  return new Driver(createMechanismDraft(sn2StartingState()), sn2Targets());
}

function draftOf(d: Driver) {
  const draft = d.state.doc.draft;
  if (draft.shape !== "mechanism") throw new Error("expected the mechanism shape");
  return draft;
}

describe("two simultaneous drags", () => {
  it("the first pointer keeps the machine and the second is absorbed", () => {
    const d = driver();
    d.down(P.oxygenLonePair, { pointerId: 1 });
    d.down(P.carbonAtom, { pointerId: 2 });

    expect(d.sawNotice("secondary_pointer_ignored")).toBe(true);
    expect(draftOf(d).arrows).toHaveLength(0);
    expect(draftOf(d).armed).not.toBeNull();
    expect(activePointerCount(d.state)).toBe(2);
    expect(ownerSession(d.state)?.pointerId).toBe(1);
  });

  it("the second pointer's release does nothing either", () => {
    const d = driver();
    d.down(P.oxygenLonePair, { pointerId: 1 });
    d.down(P.carbonAtom, { pointerId: 2 });
    d.up(P.bromineAtom, { pointerId: 2 });

    expect(draftOf(d).arrows).toHaveLength(0);
    expect(activePointerCount(d.state)).toBe(1);
  });

  it("the owner finishes its drag normally afterwards", () => {
    const d = driver();
    d.down(P.oxygenLonePair, { pointerId: 1 });
    d.down(P.carbonAtom, { pointerId: 2 });
    d.up(P.bromineAtom, { pointerId: 2 });
    d.move(P.carbonAtom, { pointerId: 1 });
    d.up(P.carbonAtom, { pointerId: 1 });

    expect(draftOf(d).arrows).toHaveLength(1);
    expect(activePointerCount(d.state)).toBe(0);
  });

  it("a second pointer cancelled by the platform does not roll the owner back", () => {
    const d = driver();
    d.down(P.oxygenLonePair, { pointerId: 1 });
    d.down(P.carbonAtom, { pointerId: 2 });
    d.cancel(P.carbonAtom, { pointerId: 2 });

    expect(draftOf(d).armed).not.toBeNull();
    expect(d.sawNotice("drag_cancelled")).toBe(false);
  });

  it("ownership passes to the next pointer only after the owner lets go", () => {
    const d = driver();
    d.down(P.oxygenLonePair, { pointerId: 1 });
    d.up(P.oxygenLonePair, { pointerId: 1 });
    d.down(P.carbonAtom, { pointerId: 2 });

    expect(ownerSession(d.state)?.pointerId).toBe(2);
    expect(draftOf(d).arrows).toHaveLength(1);
  });
});

describe("pen is not touch", () => {
  it("a pen arriving during a touch drag takes over, and the touch is rolled back", () => {
    const d = driver();
    d.down(P.oxygenLonePair, { pointerId: 1, pointerType: "touch" });
    expect(draftOf(d).armed).not.toBeNull();

    d.down(P.carbonAtom, { pointerId: 2, pointerType: "pen" });

    expect(d.sawNotice("pen_preempted_touch")).toBe(true);
    expect(ownerSession(d.state)?.pointerId).toBe(2);
    // The touch's arming went with it, so the pen's press is a fresh selection
    // and not the sink of a half drawn arrow.
    expect(draftOf(d).arrows).toHaveLength(0);
    expect(draftOf(d).armed).toBeNull();
  });

  it("a touch arriving during a pen drag is absorbed, not the other way round", () => {
    const d = driver();
    d.down(P.oxygenLonePair, { pointerId: 1, pointerType: "pen" });
    d.down(P.carbonAtom, { pointerId: 2, pointerType: "touch" });

    expect(d.sawNotice("pen_preempted_touch")).toBe(false);
    expect(d.sawNotice("secondary_pointer_ignored")).toBe(true);
    expect(ownerSession(d.state)?.pointerId).toBe(1);
  });

  it("a pen does not preempt another pen", () => {
    const d = driver();
    d.down(P.oxygenLonePair, { pointerId: 1, pointerType: "pen" });
    d.down(P.carbonAtom, { pointerId: 2, pointerType: "pen" });
    expect(ownerSession(d.state)?.pointerId).toBe(1);
  });

  it("a pen does not preempt a mouse", () => {
    const d = driver();
    d.down(P.oxygenLonePair, { pointerId: 1, pointerType: "mouse" });
    d.down(P.carbonAtom, { pointerId: 2, pointerType: "pen" });
    expect(ownerSession(d.state)?.pointerId).toBe(1);
  });
});

describe("pressure", () => {
  const base: PointerInput = {
    pointerId: 1,
    pointerType: "pen",
    point: { x: 0, y: 0 },
    timestampMs: 0,
  };

  it("a pen with no pressure support reports a stand in, flagged as unsupported", () => {
    const reading = readPressure(base);
    expect(reading.supported).toBe(false);
    expect(reading.value).toBe(PEN_PRESSURE_WHEN_UNSUPPORTED);
  });

  it("a pen with pressure support reports what the device said", () => {
    const reading = readPressure({ ...base, pressure: 0.37 });
    expect(reading.supported).toBe(true);
    expect(reading.value).toBeCloseTo(0.37);
  });

  it("a pen reporting zero pressure is still drawing", () => {
    const d = driver();
    d.down(P.oxygenLonePair, { pointerType: "pen", pressure: 0 });
    d.move(P.carbonAtom, { pointerType: "pen", pressure: 0 });
    d.up(P.carbonAtom, { pointerType: "pen", pressure: 0 });
    expect(draftOf(d).arrows).toHaveLength(1);
  });

  it("a pen with and without pressure support draws the same arrow", () => {
    const withPressure = driver();
    withPressure.drag(P.oxygenLonePair, P.carbonAtom, { pointerType: "pen", pressure: 0.8 });

    const withoutPressure = driver();
    withoutPressure.drag(P.oxygenLonePair, P.carbonAtom, { pointerType: "pen" });

    expect(draftOf(withPressure).arrows).toEqual(draftOf(withoutPressure).arrows);
  });

  it("out of range and nonsense pressure values are clamped or rejected", () => {
    expect(readPressure({ ...base, pressure: 5 }).value).toBe(1);
    expect(readPressure({ ...base, pressure: -2 }).value).toBe(0);
    expect(readPressure({ ...base, pressure: Number.NaN }).supported).toBe(false);
  });

  it("mouse and touch are full contact and are never treated as pressure sensitive", () => {
    for (const pointerType of ["mouse", "touch"] as const) {
      const reading = readPressure({ ...base, pointerType, pressure: 0.1 });
      expect(reading.supported).toBe(false);
      expect(reading.value).toBe(PRESSURE_WHEN_NOT_A_PEN);
    }
  });
});

describe("mouse buttons", () => {
  it("a right button press selects nothing", () => {
    const d = driver();
    d.down(P.oxygenLonePair, { pointerType: "mouse", buttonIsPrimary: false });
    expect(draftOf(d).armed).toBeNull();
    expect(d.sawNotice("non_primary_button_ignored")).toBe(true);
  });

  it("a right button release draws nothing either", () => {
    const d = driver();
    d.down(P.oxygenLonePair, { pointerType: "mouse", buttonIsPrimary: false });
    d.up(P.carbonAtom, { pointerType: "mouse", buttonIsPrimary: false });
    expect(draftOf(d).arrows).toHaveLength(0);
    expect(activePointerCount(d.state)).toBe(0);
  });
});

describe("contested hits", () => {
  it("a hit the geometry package reports as close is acted on, and named", () => {
    const d = new Driver(createMechanismDraft(sn2StartingState()), [
      ...sn2Targets().filter((entry) => entry.point !== P.oxygenLonePair),
      {
        point: P.oxygenLonePair,
        target: { kind: "lonePair", atomId: "O1", slotIndex: 0 },
        margin: 0.01,
      },
    ]);
    d.tap(P.oxygenLonePair);

    expect(draftOf(d).armed).not.toBeNull();
    expect(d.sawNotice("target_was_ambiguous")).toBe(true);
  });

  it("reviseLastTarget swaps the guess for the other candidate", () => {
    // The tap must be contested: revise exists for the "did you mean"
    // affordance, which only appears after target_was_ambiguous, and since the
    // pass two fix the machine enforces that precondition rather than trusting
    // any caller with a blind undo. Same contested table as the test above.
    const d = new Driver(createMechanismDraft(sn2StartingState()), [
      ...sn2Targets().filter((entry) => entry.point !== P.oxygenLonePair),
      {
        point: P.oxygenLonePair,
        target: { kind: "lonePair", atomId: "O1", slotIndex: 0 },
        margin: 0.01,
      },
    ]);
    d.tap(P.oxygenLonePair);
    expect(d.sawNotice("target_was_ambiguous")).toBe(true);
    expect(draftOf(d).armed?.target).toEqual({ kind: "lonePair", atomId: "O1", slotIndex: 0 });

    d.send({
      kind: "command",
      command: {
        kind: "reviseLastTarget",
        target: { kind: "lonePair", atomId: "O1", slotIndex: 1 },
      },
    });

    expect(draftOf(d).armed?.target).toEqual({ kind: "lonePair", atomId: "O1", slotIndex: 1 });
  });
});
