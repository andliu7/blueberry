import { describe, expect, it } from "vitest";

import {
  createAtom,
  createBond,
  createSpecies,
  createState,
  type MechanismState,
} from "@blueberry/chem-core";
import {
  applyToMechanism,
  applyToRanking,
  applyToReagents,
  applyToStructure,
  createMechanismDraft,
  createRankingDraft,
  createReagentsDraft,
  createStructureDraft,
  type InteractionCommand,
  type MechanismDraft,
  type RankingDraft,
  type ReagentsDraft,
  type StructureDraft,
} from "@blueberry/interaction";

/**
 * PHASE 2 STRUCTURAL FIX, VERIFICATION PASS. Attack item 1.
 *
 * "The whole design moves trust into the reducers... a `committed` versus
 * `inspected` mislabel is held only by per shape scenarios."
 *
 * This is an independently authored inventory of the same call sites
 * packages/interaction/test/shapeReports.test.ts already pins, written
 * without reading that file's assertions first (only its existence and
 * scenario list, to avoid literal duplication of names). Two suites agreeing
 * on the same fact from two different authorships is a stronger claim than
 * one suite agreeing with itself. Where this file disagreed with my own
 * reading of the source, the source is quoted inline so the disagreement is
 * checkable.
 *
 * Every `changed(...)` call site in the four shape reducers was read against
 * outcome.ts's definitions:
 *
 *   armed      a selection now waits for its second half, put there by THIS command
 *   disarmed   a selection that was waiting is gone, nothing added in its place
 *   committed  the answer a grader will read changed
 *   inspected  the document changed, but neither the selection nor the answer
 *
 * VERDICT: no dishonest report found in the current source. Every site below
 * is argued, not merely asserted, and the test pins the argued value so a
 * future edit that flips one silently fails here.
 */

// ---------------------------------------------------------------------------
// Mechanism: hydroxide attacking bromomethane, the standard SN2 fixture.
// ---------------------------------------------------------------------------

const HYDROXIDE = createSpecies({
  id: "hydroxide",
  atoms: [createAtom({ id: "O1", element: "O", formalCharge: -1, lonePairs: 3, implicitHydrogens: 1 })],
});

const BROMOMETHANE = createSpecies({
  id: "bromomethane",
  atoms: [
    createAtom({ id: "C1", element: "C", implicitHydrogens: 3 }),
    createAtom({ id: "Br1", element: "Br", lonePairs: 3 }),
  ],
  bonds: [createBond({ id: "bond_C1_Br1", a: "C1", b: "Br1", order: 1 })],
});

function sn2State(): MechanismState {
  return createState({
    id: "sn2-from",
    members: [
      { species: HYDROXIDE, role: "nucleophile" },
      { species: BROMOMETHANE, role: "substrate" },
    ],
  });
}

function mechanismDraft(): MechanismDraft {
  return createMechanismDraft(sn2State());
}

function apply<D>(applyFn: (draft: D, command: InteractionCommand) => { draft: D }, draft: D, ...commands: readonly InteractionCommand[]): D {
  let current = draft;
  for (const command of commands) current = applyFn(current, command).draft;
  return current;
}

describe("mechanism.ts: every changed() site argued and pinned", () => {
  it("clearSelection while armed: report is disarmed, because the arming is gone and nothing replaces it", () => {
    const armed = apply(applyToMechanism, mechanismDraft(), {
      kind: "selectTarget",
      target: { kind: "lonePair", atomId: "O1", slotIndex: 0 },
    });
    const outcome = applyToMechanism(armed, { kind: "clearSelection" });
    expect(outcome.report).toBe("disarmed");
  });

  it("setElectronCount: report is inspected, because it governs the NEXT arrow, not any arrow a grader has already seen", () => {
    const outcome = applyToMechanism(mechanismDraft(), { kind: "setElectronCount", electrons: 1 });
    expect(outcome.report).toBe("inspected");
  });

  it("setPredictedState: report is committed, because the predicted product IS half the answer on a predict-and-explain problem, per shapes/mechanism.ts's own comment", () => {
    const outcome = applyToMechanism(mechanismDraft(), {
      kind: "setPredictedState",
      state: createState({ id: "predicted", members: [] }),
    });
    expect(outcome.report).toBe("committed");
  });

  it("committing a legal arrow: report is committed, and the arming it consumed does not also get reported as disarmed", () => {
    const armed = apply(applyToMechanism, mechanismDraft(), {
      kind: "selectTarget",
      target: { kind: "lonePair", atomId: "O1", slotIndex: 0 },
    });
    const outcome = applyToMechanism(armed, {
      kind: "selectTarget",
      target: { kind: "atom", atomId: "C1" },
    });
    expect(outcome.report).toBe("committed");
    expect(outcome.draft.armed).toBeNull();
  });

  it("tapping a bare atom with nothing armed: report is inspected (a lone pair reveal), the mechanism shape's one atom-tap case that is not a source arm", () => {
    const outcome = applyToMechanism(mechanismDraft(), {
      kind: "selectTarget",
      target: { kind: "atom", atomId: "C1" },
    });
    expect(outcome.report).toBe("inspected");
  });

  it("tapping the hydrogen arc: report is inspected even while a source is armed, because it must not disturb the arming", () => {
    const armed = apply(applyToMechanism, mechanismDraft(), {
      kind: "selectTarget",
      target: { kind: "lonePair", atomId: "O1", slotIndex: 0 },
    });
    const outcome = applyToMechanism(armed, {
      kind: "selectTarget",
      target: { kind: "hydrogenCount", atomId: "C1" },
    });
    expect(outcome.report).toBe("inspected");
    // And the arming really did survive, which is the point of the comment
    // this pins: a mislabel here would let an inspection silently eat a
    // selection the student is mid gesture on.
    expect(outcome.draft.armed).not.toBeNull();
  });
});

// ---------------------------------------------------------------------------
// Structure: building the molecule IS the answer, so this shape must never
// report inspected. Pinned as an absence, per its own header comment.
// ---------------------------------------------------------------------------

function structureDraftWithOneAtom(): StructureDraft {
  return apply(applyToStructure, createStructureDraft(), {
    kind: "selectTarget",
    target: { kind: "paletteElement", element: "C" },
  }, { kind: "selectTarget", target: { kind: "empty", point: { x: 0, y: 0 } } });
}

describe("structure.ts: every changed() site argued and pinned", () => {
  it("cycling implicit hydrogens: report is committed, not inspected, because in this shape the hydrogen count IS a real atom count a grader reads", () => {
    const draft = structureDraftWithOneAtom();
    const outcome = applyToStructure(draft, { kind: "selectTarget", target: { kind: "hydrogenCount", atomId: "sa1" } });
    expect(outcome.report).toBe("committed");
  });

  it("removing an armed atom: report is committed, and the compound (committed + disarmed) resolves to committed per the documented precedence", () => {
    const two = apply(applyToStructure, structureDraftWithOneAtom(), {
      kind: "selectTarget",
      target: { kind: "empty", point: { x: 20, y: 20 } },
    });
    const armed = applyToStructure(two, { kind: "selectTarget", target: { kind: "atom", atomId: "sa1" } });
    expect(armed.report).toBe("armed");
    const outcome = applyToStructure(armed.draft, { kind: "removeAtom", atomId: "sa1" });
    expect(outcome.report).toBe("committed");
    expect(outcome.draft.pendingBondFrom).toBeNull();
  });

  it("acceptExternalStructure: report is committed, the one entry point that installs a whole state at once", () => {
    const outcome = applyToStructure(createStructureDraft(), {
      kind: "acceptExternalStructure",
      state: sn2State(),
    });
    expect(outcome.report).toBe("committed");
  });
});

// ---------------------------------------------------------------------------
// Reagents: the one shape with an explicit two branch precedence choice
// written into the reducer itself.
// ---------------------------------------------------------------------------

describe("reagents.ts: the explicit setReagentsOrdered precedence branch", () => {
  it("with nothing armed, report is inspected: the flag alone is a mode nobody can see change", () => {
    const outcome = applyToReagents(createReagentsDraft(false), { kind: "setReagentsOrdered", ordered: true });
    expect(outcome.report).toBe("inspected");
  });

  it("with a slot armed, report is disarmed, not inspected: the precedence in outcome.ts ranks disarmed above inspected and the reducer's own comment agrees", () => {
    const ordered = apply(applyToReagents, createReagentsDraft(true), {
      kind: "selectTarget",
      target: { kind: "reagentTile", reagentId: "naoh" },
    }, { kind: "selectTarget", target: { kind: "reagentTile", reagentId: "heat" } });
    const armed = applyToReagents(ordered, { kind: "selectTarget", target: { kind: "sequenceSlot", index: 0 } });
    expect(armed.report).toBe("armed");
    const outcome = applyToReagents(armed.draft, { kind: "setReagentsOrdered", ordered: false });
    expect(outcome.report).toBe("disarmed");
    expect((outcome.draft as ReagentsDraft).armedSlot).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// Ranking: the reason is half the answer, so choosing one is a commit, not a
// mode change, even though it superficially resembles a flag flip like
// setReagentsOrdered above.
// ---------------------------------------------------------------------------

describe("ranking.ts: setReason is committed, never inspected", () => {
  it("choosing a reason for the first time: report is committed", () => {
    const draft = createRankingDraft(["cand-a", "cand-b"]);
    const outcome = applyToRanking(draft, { kind: "setReason", reasonId: "markovnikov" });
    expect(outcome.report).toBe("committed");
  });

  it("the armed-candidate-left-the-list defensive branch: report is disarmed, order untouched, nothing invented as committed", () => {
    // candidateStep's defensive branch: draft.armed points at a candidate no
    // longer in draft.order. Reachable only by constructing the draft by
    // hand, which is exactly the kind of drift a restored session or a bad
    // undo replay could produce; there is no ordinary tap sequence that
    // reaches it, so it is exercised directly here rather than skipped.
    const inconsistent: RankingDraft = Object.freeze({
      shape: "ranking" as const,
      order: Object.freeze(["cand-a", "cand-b"]),
      reason: null,
      armed: "cand-ghost" as never,
    });
    const outcome = applyToRanking(inconsistent, {
      kind: "selectTarget",
      target: { kind: "candidate", candidateId: "cand-b" },
    });
    expect(outcome.report).toBe("disarmed");
    expect(outcome.draft.order).toEqual(["cand-a", "cand-b"]);
  });
});
