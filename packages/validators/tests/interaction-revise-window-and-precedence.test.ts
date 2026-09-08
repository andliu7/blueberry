import { describe, expect, it } from "vitest";

import {
  applyToStructure,
  createInteractionState,
  createStructureDraft,
  reduce,
  type HitTestOutcome,
  type HitTestQuery,
  type HitTester,
  type InteractionEnvironment,
  type ShapeDraft,
} from "@blueberry/interaction";

/**
 * PHASE 2 STRUCTURAL FIX, VERIFICATION PASS. Attack items 3 and 4.
 *
 * Item 3 asks for two things: proof at least one of the three latent revise
 * window siblings the builder claims closed is still closed, and a probe in
 * the other direction, an arming the window SHOULD open on that no longer
 * does.
 *
 * Item 4 asks for a command where the precedence
 * (refused > committed > armed > disarmed > inspected > nothing) produces the
 * wrong single value, exercised by two real cases, if one exists.
 *
 * See interaction-unguarded-install-nextnumber-crash.test.ts for the note on
 * why this lives under packages/validators/tests rather than
 * packages/interaction/test.
 */

/** A contested hit tester: every query returns the same primary target with a margin under AMBIGUOUS_MARGIN. */
function contestedHitTester(target: HitTestOutcome["primary"]): HitTester {
  return {
    hitTest(_query: HitTestQuery): HitTestOutcome {
      return { primary: target, candidates: [{ target, score: 0 }], margin: 0.01 };
    },
  };
}

const ENV_CONTESTED_CARBON: InteractionEnvironment = {
  hitTester: contestedHitTester({ kind: "paletteElement", element: "N" }),
};

/** A structure draft with carbon palette armed AND a pending bond, from two independent taps. */
function structureWithBothArmed(): ShapeDraft {
  let draft: ShapeDraft = createStructureDraft();
  draft = applyToStructure(draft as any, {
    kind: "selectTarget",
    target: { kind: "paletteElement", element: "C" },
  }).draft;
  draft = applyToStructure(draft as any, {
    kind: "selectTarget",
    target: { kind: "empty", point: { x: 0, y: 0 } },
  }).draft;
  draft = applyToStructure(draft as any, {
    kind: "selectTarget",
    target: { kind: "empty", point: { x: 10, y: 10 } },
  }).draft;
  // Arm a pending bond from sa1, while palette stays armed independently.
  draft = applyToStructure(draft as any, {
    kind: "selectTarget",
    target: { kind: "atom", atomId: "sa1" },
  }).draft;
  return draft;
}

describe("item 3: the pass-four fix stays closed", () => {
  it("a contested DISARM of the pending bond does not reopen the revise window, even though palette is still independently armed", () => {
    // This is the exact scenario adversaryPassFour.test.ts names as finding 1:
    // under the old hasSelection projection, disarming the bond while palette
    // stayed armed made hasSelection stay true, which read as "an arming just
    // happened" and reopened the window on a disarm. The fix is
    // report === "armed" specifically, and a disarm can never satisfy that by
    // construction (disarmed is not in ChangeReport's armed branch).
    const withBoth = structureWithBothArmed();
    const state = createInteractionState(withBoth);

    // Tap sa1 again: this is a DISARM of the pending bond (palette untouched).
    const env: InteractionEnvironment = {
      hitTester: contestedHitTester({ kind: "atom", atomId: "sa1" }),
    };
    const transition = reduce(
      state,
      { kind: "pointerDown", pointer: { pointerId: 1, pointerType: "touch", point: { x: 0, y: 0 }, timestampMs: 1 } },
      env,
    );

    expect(transition.report).toBe("disarmed");
    expect(transition.state.reviseWindow).toBeNull();
  });
});

describe("item 3, other direction: a legitimate re-arm still opens the window (no lost convenience)", () => {
  it("a contested tap that switches the armed palette element, WHILE a pending bond is independently still armed, reports armed and opens the window", () => {
    // This is the case that makes structure's two-selection-field design the
    // origin of the whole Phase 2 fix in the first place: palette and
    // pendingBondFrom are independent, so re-arming one while the other is
    // untouched is a real, reachable, everyday gesture (switching which
    // element you are about to place while a bond is still pending), not an
    // edge case invented for this test. If the report === "armed" gate ever
    // narrowed to "armed AND nothing else already armed", this is the case
    // that would silently lose the did-you-mean affordance for it.
    const withBoth = structureWithBothArmed();
    const state = createInteractionState(withBoth);

    const transition = reduce(
      state,
      { kind: "pointerDown", pointer: { pointerId: 1, pointerType: "touch", point: { x: 99, y: 99 }, timestampMs: 1 } },
      ENV_CONTESTED_CARBON,
    );

    expect(transition.report).toBe("armed");
    expect(transition.state.reviseWindow).not.toBeNull();
    expect(transition.state.reviseWindow).toBe(transition.state.doc);
  });
});

describe("item 4: precedence exercised at the real compound sites, twice", () => {
  it("case one, structure removeAtom: committed beats the disarm of the arming it consumed", () => {
    // Two facts are true after this command: the answer changed (an atom left
    // the structure) and a pending bond arming pointed at that exact atom and
    // is now gone. refused > committed > armed > disarmed > inspected >
    // nothing puts committed ahead of disarmed, so committed is the one right
    // answer, and the reducer's own comment argues the same thing.
    const withBoth = structureWithBothArmed() as Extract<ShapeDraft, { shape: "structure" }>;
    expect(withBoth.pendingBondFrom).toBe("sa1");
    expect(withBoth.palette).toBe("C");

    const outcome = applyToStructure(withBoth, { kind: "removeAtom", atomId: "sa1" });
    expect(outcome.report).toBe("committed");
    // The palette arming, an UNRELATED field, correctly survives untouched:
    // this command has no opinion on it, so it is neither part of the
    // compound nor a second thing to report.
    expect((outcome.draft as Extract<ShapeDraft, { shape: "structure" }>).palette).toBe("C");
    expect((outcome.draft as Extract<ShapeDraft, { shape: "structure" }>).pendingBondFrom).toBeNull();
  });

  it("case two, structure bondAtoms after an already-bonded pair: committed beats the disarm of the consumed pending bond, on the order-cycling path specifically", () => {
    // A different compound from case one: here the "commit" is not removing
    // anything, it is raising an existing bond's order, and it still consumes
    // the pendingBondFrom arming that pointed at one of the two atoms. Same
    // precedence question, a structurally different code path (the "already
    // bonded, raise the order" branch in shapes/structure.ts, not the "two
    // atoms, add a bond" branch), so this is not a restatement of case one.
    let draft: ShapeDraft = createStructureDraft();
    draft = applyToStructure(draft as any, { kind: "selectTarget", target: { kind: "paletteElement", element: "C" } }).draft;
    draft = applyToStructure(draft as any, { kind: "selectTarget", target: { kind: "empty", point: { x: 0, y: 0 } } }).draft;
    draft = applyToStructure(draft as any, { kind: "selectTarget", target: { kind: "empty", point: { x: 10, y: 10 } } }).draft;
    // Bond sa1 to sa2.
    draft = applyToStructure(draft as any, { kind: "selectTarget", target: { kind: "atom", atomId: "sa1" } }).draft;
    draft = applyToStructure(draft as any, { kind: "selectTarget", target: { kind: "atom", atomId: "sa2" } }).draft;
    // Arm sa1 again, for a second tap at sa2 that will cycle the bond order
    // rather than add a redundant bond.
    const armed = applyToStructure(draft as any, { kind: "selectTarget", target: { kind: "atom", atomId: "sa1" } });
    expect(armed.report).toBe("armed");

    const outcome = applyToStructure(armed.draft, { kind: "selectTarget", target: { kind: "atom", atomId: "sa2" } });
    expect(outcome.report).toBe("committed");
    expect((outcome.draft as Extract<ShapeDraft, { shape: "structure" }>).pendingBondFrom).toBeNull();
  });

});

/**
 * NO COUNTEREXAMPLE FOUND, recorded as prose rather than as a test, because a
 * test that asserts nothing is worse than no test: it reads as coverage
 * without being any. The audit in interaction-report-honesty-audit.test.ts
 * plus the two cases above cover every changed() call site across all four
 * reducers that touches more than one field of its own draft in a single
 * command: mechanism's commit(), which both disarms and commits; structure's
 * removeAtom and the two bondAtoms branches (add a bond, cycle an existing
 * one); reagents' setReagentsOrdered, the one site with an explicit two
 * branch precedence choice written into the reducer itself. None of them was
 * found to pick a value other than the one
 * refused > committed > armed > disarmed > inspected > nothing predicts.
 */
