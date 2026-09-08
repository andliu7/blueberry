/**
 * The other three answer shapes, and the claim that a shape is a mode rather
 * than a special case: the same pointer rules and the same commands drive all
 * four, and machine.ts never asks which one it is in.
 */

import { describe, expect, it } from "vitest";
import { findAtomInState, findBondInState } from "@blueberry/chem-core";
import { canUndo } from "../src/machine.js";
import { createInteractionStore } from "../src/store.js";
import { createMechanismDraft } from "../src/shapes/mechanism.js";
import { createRankingDraft, chosenCandidate, type RankingDraft } from "../src/shapes/ranking.js";
import { createReagentsDraft, type ReagentsDraft } from "../src/shapes/reagents.js";
import { createStructureDraft, type StructureDraft } from "../src/shapes/structure.js";
import { Driver, P, sn2StartingState, sn2Targets, tableHitTester, type TableEntry } from "./support.js";

// ---------------------------------------------------------------------------
// Predict the product
// ---------------------------------------------------------------------------

describe("the structure shape", () => {
  const points = {
    paletteCarbon: { x: 0, y: 0 },
    paletteOxygen: { x: 0, y: 20 },
    canvasA: { x: 100, y: 100 },
    canvasB: { x: 200, y: 100 },
    firstAtom: { x: 101, y: 100 },
    secondAtom: { x: 201, y: 100 },
    theBond: { x: 150, y: 100 },
  };

  const entries: TableEntry[] = [
    { point: points.paletteCarbon, target: { kind: "paletteElement", element: "C" } },
    { point: points.paletteOxygen, target: { kind: "paletteElement", element: "O" } },
    { point: points.firstAtom, target: { kind: "atom", atomId: "sa1" } },
    { point: points.secondAtom, target: { kind: "atom", atomId: "sa2" } },
    { point: points.theBond, target: { kind: "bondBody", bondId: "sb3" } },
    { point: { x: 300, y: 300 }, target: { kind: "hydrogenCount", atomId: "sa1" } },
    { point: { x: 320, y: 300 }, target: { kind: "lonePair", atomId: "sa2", slotIndex: 0 } },
  ];

  function structureDriver(): Driver {
    return new Driver(createStructureDraft(), entries);
  }

  function draftOf(d: Driver): StructureDraft {
    const draft = d.state.doc.draft;
    if (draft.shape !== "structure") throw new Error("expected the structure shape");
    return draft;
  }

  it("builds a two atom molecule with four taps and no drag", () => {
    const d = structureDriver();

    d.tap(points.paletteCarbon);
    d.tap(points.canvasA);
    d.tap(points.paletteOxygen);
    d.tap(points.canvasB);
    d.tap(points.firstAtom);
    d.tap(points.secondAtom);

    const state = draftOf(d).state;
    expect(state.members).toHaveLength(1);
    expect(state.members[0]?.species.atoms.map((a) => a.element)).toEqual(["C", "O"]);
    expect(state.members[0]?.species.bonds).toHaveLength(1);
    expect(draftOf(d).placements).toHaveLength(2);
  });

  it("refuses a placement with no element chosen, by name", () => {
    const d = structureDriver();
    d.tap(points.canvasA);
    expect(d.sawNotice("no_element_selected")).toBe(true);
    expect(draftOf(d).state.members).toHaveLength(0);
  });

  it("tapping the same palette element twice puts it down", () => {
    const d = structureDriver();
    d.tap(points.paletteCarbon);
    d.tap(points.paletteCarbon);
    expect(draftOf(d).palette).toBeNull();
  });

  it("tapping the same atom twice drops the half built bond", () => {
    const d = structureDriver();
    d.tap(points.paletteCarbon);
    d.tap(points.canvasA);
    d.tap(points.firstAtom);
    d.tap(points.firstAtom);
    expect(draftOf(d).pendingBondFrom).toBeNull();
  });

  it("bonding two atoms that are already bonded raises the order and says so", () => {
    const d = structureDriver();
    d.tap(points.paletteCarbon);
    d.tap(points.canvasA);
    d.tap(points.paletteOxygen);
    d.tap(points.canvasB);
    d.tap(points.firstAtom);
    d.tap(points.secondAtom);

    d.clearLog();
    d.tap(points.firstAtom);
    d.tap(points.secondAtom);

    expect(d.sawNotice("bond_order_cycled_instead_of_added")).toBe(true);
    expect(findBondInState(draftOf(d).state, "sb3")?.bond.order).toBe(2);
  });

  it("tapping a bond cycles its order through 1, 2, 3 and back", () => {
    const d = structureDriver();
    d.tap(points.paletteCarbon);
    d.tap(points.canvasA);
    d.tap(points.paletteOxygen);
    d.tap(points.canvasB);
    d.tap(points.firstAtom);
    d.tap(points.secondAtom);

    d.tap(points.theBond);
    expect(findBondInState(draftOf(d).state, "sb3")?.bond.order).toBe(2);
    d.tap(points.theBond);
    expect(findBondInState(draftOf(d).state, "sb3")?.bond.order).toBe(3);
    d.tap(points.theBond);
    expect(findBondInState(draftOf(d).state, "sb3")?.bond.order).toBe(1);
  });

  it("the hydrogen arc edits the count here, unlike in the mechanism shape", () => {
    const d = structureDriver();
    d.tap(points.paletteCarbon);
    d.tap(points.canvasA);
    d.tap({ x: 300, y: 300 });
    expect(findAtomInState(draftOf(d).state, "sa1")?.atom.implicitHydrogens).toBe(1);
  });

  it("charge and lone pairs are steppers, because there is no gesture for them", () => {
    const d = structureDriver();
    d.tap(points.paletteOxygen);
    d.tap(points.canvasA);

    d.send({ kind: "command", command: { kind: "adjustLonePairs", atomId: "sa1", delta: 3 } });
    d.send({ kind: "command", command: { kind: "adjustCharge", atomId: "sa1", delta: -1 } });

    const atom = findAtomInState(draftOf(d).state, "sa1")?.atom;
    expect(atom?.lonePairs).toBe(3);
    expect(atom?.formalCharge).toBe(-1);
  });

  it("an edit to an atom that is not there is refused, not thrown", () => {
    const d = structureDriver();
    expect(() =>
      d.send({ kind: "command", command: { kind: "adjustCharge", atomId: "nope", delta: 1 } }),
    ).not.toThrow();
    expect(d.sawNotice("atom_not_in_structure")).toBe(true);
  });

  it("removing the only atom of a molecule removes the molecule", () => {
    const d = structureDriver();
    d.tap(points.paletteCarbon);
    d.tap(points.canvasA);
    d.send({ kind: "command", command: { kind: "removeAtom", atomId: "sa1" } });
    expect(draftOf(d).state.members).toHaveLength(0);
    expect(draftOf(d).placements).toHaveLength(0);
  });

  it("a structure from an external editor replaces the draft and is recorded as such", () => {
    const d = structureDriver();
    d.send({
      kind: "command",
      command: { kind: "acceptExternalStructure", state: sn2StartingState() },
    });
    expect(draftOf(d).origin).toBe("externalEditor");
    expect(draftOf(d).state.members).toHaveLength(2);
  });
});

// ---------------------------------------------------------------------------
// Supply the reagents
// ---------------------------------------------------------------------------

describe("the reagents shape", () => {
  const entries: TableEntry[] = [
    { point: { x: 0, y: 0 }, target: { kind: "reagentTile", reagentId: "naoh" } },
    { point: { x: 0, y: 20 }, target: { kind: "reagentTile", reagentId: "hbr" } },
    { point: { x: 100, y: 0 }, target: { kind: "sequenceSlot", index: 0 } },
    { point: { x: 100, y: 20 }, target: { kind: "sequenceSlot", index: 1 } },
  ];

  function draftOf(d: Driver): ReagentsDraft {
    const draft = d.state.doc.draft;
    if (draft.shape !== "reagents") throw new Error("expected the reagents shape");
    return draft;
  }

  it("collects a set of reagents by tapping tiles", () => {
    const d = new Driver(createReagentsDraft(false), entries);
    d.tap({ x: 0, y: 0 });
    d.tap({ x: 0, y: 20 });
    expect(draftOf(d).chosen).toEqual(["naoh", "hbr"]);
  });

  it("refuses a duplicate in a set, by name", () => {
    const d = new Driver(createReagentsDraft(false), entries);
    d.tap({ x: 0, y: 0 });
    d.tap({ x: 0, y: 0 });
    expect(d.sawNotice("reagent_already_chosen")).toBe(true);
    expect(draftOf(d).chosen).toEqual(["naoh"]);
  });

  it("allows the same reagent twice in a synthesis, because two additions are real", () => {
    const d = new Driver(createReagentsDraft(true), entries);
    d.tap({ x: 0, y: 0 });
    d.tap({ x: 0, y: 0 });
    expect(draftOf(d).chosen).toEqual(["naoh", "naoh"]);
  });

  it("reorders a synthesis with two taps and no drag", () => {
    const d = new Driver(createReagentsDraft(true), entries);
    d.tap({ x: 0, y: 0 });
    d.tap({ x: 0, y: 20 });
    expect(draftOf(d).chosen).toEqual(["naoh", "hbr"]);

    d.tap({ x: 100, y: 20 }); // arm slot 1
    d.tap({ x: 100, y: 0 }); // move it to slot 0
    expect(draftOf(d).chosen).toEqual(["hbr", "naoh"]);
  });

  it("tapping the armed slot again drops the selection", () => {
    const d = new Driver(createReagentsDraft(true), entries);
    d.tap({ x: 0, y: 0 });
    d.tap({ x: 100, y: 0 });
    d.tap({ x: 100, y: 0 });
    expect(draftOf(d).armedSlot).toBeNull();
  });

  it("refuses slot taps when the answer is a set, because position means nothing", () => {
    const d = new Driver(createReagentsDraft(false), entries);
    d.tap({ x: 0, y: 0 });
    d.tap({ x: 100, y: 0 });
    expect(d.sawNotice("sequence_slot_requires_ordered_mode")).toBe(true);
  });

  it("refuses a slot that does not exist, by name", () => {
    const d = new Driver(createReagentsDraft(true), entries);
    d.tap({ x: 100, y: 0 });
    expect(d.sawNotice("sequence_slot_out_of_range")).toBe(true);
  });

  it("removes a reagent by index", () => {
    const d = new Driver(createReagentsDraft(true), entries);
    d.tap({ x: 0, y: 0 });
    d.tap({ x: 0, y: 20 });
    d.send({ kind: "command", command: { kind: "removeReagentAt", index: 0 } });
    expect(draftOf(d).chosen).toEqual(["hbr"]);

    d.send({ kind: "command", command: { kind: "removeReagentAt", index: 9 } });
    expect(d.sawNotice("sequence_slot_out_of_range")).toBe(true);
  });

  it("switching between a set and a synthesis keeps the reagents", () => {
    const d = new Driver(createReagentsDraft(false), entries);
    d.tap({ x: 0, y: 0 });
    d.send({ kind: "command", command: { kind: "setReagentsOrdered", ordered: true } });
    expect(draftOf(d).ordered).toBe(true);
    expect(draftOf(d).chosen).toEqual(["naoh"]);
  });

  it("refuses a mechanism command, by name", () => {
    const d = new Driver(createReagentsDraft(false), entries);
    d.send({ kind: "command", command: { kind: "setElectronCount", electrons: 1 } });
    expect(d.sawNotice("command_not_valid_in_this_shape")).toBe(true);
  });

  it("a tap on empty space drops the armed slot", () => {
    const d = new Driver(createReagentsDraft(true), entries);
    d.tap({ x: 0, y: 0 });
    d.tap({ x: 100, y: 0 });
    d.tap({ x: 999, y: 999 });
    expect(draftOf(d).armedSlot).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// Major product
// ---------------------------------------------------------------------------

describe("the major product shape", () => {
  const entries: TableEntry[] = [
    { point: { x: 0, y: 0 }, target: { kind: "candidate", candidateId: "markovnikov" } },
    { point: { x: 0, y: 20 }, target: { kind: "candidate", candidateId: "anti_markovnikov" } },
    { point: { x: 0, y: 40 }, target: { kind: "reasonTile", reasonId: "more_stable_cation" } },
  ];

  function draftOf(d: Driver): RankingDraft {
    const draft = d.state.doc.draft;
    if (draft.shape !== "ranking") throw new Error("expected the ranking shape");
    return draft;
  }

  it("ranks candidates with two taps", () => {
    const d = new Driver(createRankingDraft(["markovnikov", "anti_markovnikov"]), entries);
    expect(chosenCandidate(draftOf(d))).toBe("markovnikov");

    d.tap({ x: 0, y: 20 });
    d.tap({ x: 0, y: 0 });
    expect(draftOf(d).order).toEqual(["anti_markovnikov", "markovnikov"]);
    expect(chosenCandidate(draftOf(d))).toBe("anti_markovnikov");
  });

  it("records the reason the winner wins, because picking right for the wrong reason is not learning", () => {
    const d = new Driver(createRankingDraft(["markovnikov", "anti_markovnikov"]), entries);
    d.tap({ x: 0, y: 40 });
    expect(draftOf(d).reason).toBe("more_stable_cation");
  });

  it("refuses a candidate that is not on the problem, by name", () => {
    const d = new Driver(createRankingDraft(["markovnikov"]), [
      { point: { x: 0, y: 0 }, target: { kind: "candidate", candidateId: "not_here" } },
    ]);
    d.tap({ x: 0, y: 0 });
    expect(d.sawNotice("unknown_candidate")).toBe(true);
  });

  it("refuses a reason when there is nothing to reason about", () => {
    const d = new Driver(createRankingDraft([]), entries);
    d.tap({ x: 0, y: 40 });
    expect(d.sawNotice("reason_requires_a_choice")).toBe(true);
  });

  it("tapping the armed candidate again drops it", () => {
    const d = new Driver(createRankingDraft(["markovnikov", "anti_markovnikov"]), entries);
    d.tap({ x: 0, y: 0 });
    d.tap({ x: 0, y: 0 });
    expect(draftOf(d).armed).toBeNull();
  });

  it("a tap on empty space drops the armed candidate", () => {
    const d = new Driver(createRankingDraft(["markovnikov", "anti_markovnikov"]), entries);
    d.tap({ x: 0, y: 0 });
    d.tap({ x: 900, y: 900 });
    expect(draftOf(d).armed).toBeNull();
  });

  it("refuses a target from another shape, by name", () => {
    const d = new Driver(createRankingDraft(["markovnikov"]), [
      { point: { x: 0, y: 0 }, target: { kind: "atom", atomId: "C1" } },
    ]);
    d.tap({ x: 0, y: 0 });
    expect(d.sawNotice("target_not_valid_in_this_shape")).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// The machine does not know which shape it is in
// ---------------------------------------------------------------------------

describe("shapes are modes", () => {
  it("switching shape swaps the draft and starts a fresh history", () => {
    const d = new Driver(createMechanismDraft(sn2StartingState()), sn2Targets());
    d.tap(P.oxygenLonePair);
    expect(canUndo(d.state)).toBe(true);

    d.send({ kind: "command", command: { kind: "setShape", draft: createReagentsDraft(true) } });

    expect(d.state.doc.draft.shape).toBe("reagents");
    expect(canUndo(d.state)).toBe(false);
  });

  it("the same pointer rules drive a shape with no chemistry in it at all", () => {
    const entries: TableEntry[] = [
      { point: { x: 0, y: 0 }, target: { kind: "candidate", candidateId: "a" } },
      { point: { x: 0, y: 20 }, target: { kind: "candidate", candidateId: "b" } },
    ];

    const tapped = new Driver(createRankingDraft(["a", "b"]), entries);
    tapped.tap({ x: 0, y: 20 });
    tapped.tap({ x: 0, y: 0 });

    const dragged = new Driver(createRankingDraft(["a", "b"]), entries);
    dragged.drag({ x: 0, y: 20 }, { x: 0, y: 0 });

    const a = tapped.state.doc.draft;
    const b = dragged.state.doc.draft;
    if (a.shape !== "ranking" || b.shape !== "ranking") throw new Error("expected ranking");
    expect(a.order).toEqual(b.order);
    expect(a.order).toEqual(["b", "a"]);
  });

  it("a cancelled drag rolls back in every shape, not just the mechanism one", () => {
    const entries: TableEntry[] = [
      { point: { x: 0, y: 0 }, target: { kind: "candidate", candidateId: "a" } },
      { point: { x: 0, y: 20 }, target: { kind: "candidate", candidateId: "b" } },
    ];
    const d = new Driver(createRankingDraft(["a", "b"]), entries);
    d.down({ x: 0, y: 20 });
    d.move({ x: 0, y: 0 });
    d.cancel({ x: 0, y: 0 });

    const draft = d.state.doc.draft;
    if (draft.shape !== "ranking") throw new Error("expected ranking");
    expect(draft.order).toEqual(["a", "b"]);
    expect(draft.armed).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// The store
// ---------------------------------------------------------------------------

describe("the external store", () => {
  it("notifies subscribers when the state changes and stops when they unsubscribe", () => {
    let calls = 0;
    const store = createInteractionStore({
      initialDraft: createMechanismDraft(sn2StartingState()),
      environment: { hitTester: tableHitTester(sn2Targets()) },
    });

    const unsubscribe = store.subscribe(() => {
      calls += 1;
    });

    store.dispatch({
      kind: "command",
      command: { kind: "selectTarget", target: { kind: "lonePair", atomId: "O1", slotIndex: 0 } },
    });
    expect(calls).toBe(1);
    expect(store.getSnapshot().doc.draft.shape).toBe("mechanism");

    unsubscribe();
    store.dispatch({ kind: "command", command: { kind: "clearSelection" } });
    expect(calls).toBe(1);
  });

  it("hands effects and notices to the callbacks rather than performing them", () => {
    const effects: string[] = [];
    const notices: string[] = [];
    const store = createInteractionStore({
      initialDraft: createMechanismDraft(sn2StartingState()),
      environment: { hitTester: tableHitTester(sn2Targets()) },
      onEffect: (effect) => effects.push(effect.kind),
      onNotice: (item) => notices.push(item.id),
    });

    store.dispatch({
      kind: "command",
      command: { kind: "selectTarget", target: { kind: "lonePair", atomId: "O1", slotIndex: 0 } },
    });
    store.dispatch({ kind: "command", command: { kind: "submit" } });
    store.dispatch({ kind: "command", command: { kind: "undo" } });
    store.dispatch({ kind: "command", command: { kind: "undo" } });

    expect(effects).toContain("haptic");
    expect(effects).toContain("submitAttempt");
    expect(notices).toContain("nothing_to_undo");
  });
});
