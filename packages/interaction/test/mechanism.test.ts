/**
 * The mechanism shape, and the claim the whole phase rests on: every mechanism
 * is completable with taps alone.
 */

import { describe, expect, it } from "vitest";
import {
  createAtom,
  createSpecies,
  createState,
  type ElectronFlowArrow,
} from "@blueberry/chem-core";
import { canUndo } from "../src/machine.js";
import { createMechanismDraft, type MechanismDraft } from "../src/shapes/mechanism.js";
import { Driver, P, etheneState, sn2StartingState, sn2Targets, type TableEntry } from "./support.js";

function driver(): Driver {
  return new Driver(createMechanismDraft(sn2StartingState()), sn2Targets());
}

function draftOf(d: Driver): MechanismDraft {
  const draft = d.state.doc.draft;
  if (draft.shape !== "mechanism") throw new Error("expected the mechanism shape");
  return draft;
}

function shapes(arrows: readonly ElectronFlowArrow[]) {
  return arrows.map((arrow) => ({
    electrons: arrow.electrons,
    source: arrow.source,
    sink: arrow.sink,
  }));
}

describe("tap only completion, end to end", () => {
  /**
   * Hydroxide plus bromomethane. Five taps, no drag at any point, and the two
   * arrows that come out are the two arrows the mechanism has.
   */
  it("draws the whole SN2 with taps and nothing else", () => {
    const d = driver();

    d.tap(P.oxygenAtom); // 1. show the oxygen's lone pairs
    d.tap(P.oxygenLonePair); // 2. arm one of them
    d.tap(P.carbonAtom); // 3. it attacks the carbon: bond forming arrow
    d.tap(P.handleAtBromine); // 4. arm the C to Br bond, by the end at bromine
    d.tap(P.bromineAtom); // 5. the pair collapses onto bromine: bond breaking arrow

    const draft = draftOf(d);
    expect(draft.revealedLonePairs).toEqual(["O1"]);
    expect(shapes(draft.arrows)).toEqual([
      {
        electrons: 2,
        source: { kind: "lonePair", atomId: "O1" },
        sink: { kind: "betweenAtoms", atomIds: ["O1", "C1"] },
      },
      {
        electrons: 2,
        source: { kind: "bond", bondId: "bond_C1_Br1" },
        sink: { kind: "atom", atomId: "Br1" },
      },
    ]);
    expect(draft.armed).toBeNull();
  });

  it("the dragged version of the same mechanism produces identical arrows", () => {
    const tapped = driver();
    tapped.tap(P.oxygenLonePair);
    tapped.tap(P.carbonAtom);
    tapped.tap(P.handleAtBromine);
    tapped.tap(P.bromineAtom);

    const dragged = driver();
    dragged.drag(P.oxygenLonePair, P.carbonAtom);
    dragged.drag(P.handleAtBromine, P.bromineAtom);

    expect(shapes(draftOf(tapped).arrows)).toEqual(shapes(draftOf(dragged).arrows));
  });

  it("mixing taps and drags in one mechanism is fine, because they are the same path", () => {
    const d = driver();
    d.drag(P.oxygenLonePair, P.carbonAtom);
    d.tap(P.handleAtBromine);
    d.tap(P.bromineAtom);
    expect(draftOf(d).arrows).toHaveLength(2);
  });
});

describe("the display toggles", () => {
  it("tapping an atom with nothing armed shows and hides its lone pairs", () => {
    const d = driver();
    d.tap(P.oxygenAtom);
    expect(draftOf(d).revealedLonePairs).toEqual(["O1"]);
    d.tap(P.oxygenAtom);
    expect(draftOf(d).revealedLonePairs).toEqual([]);
  });

  it("never changes the chemistry, only what is drawn", () => {
    const d = driver();
    const before = draftOf(d).state;
    d.tap(P.oxygenAtom);
    d.tap(P.carbonAtom);
    expect(draftOf(d).state).toBe(before);
  });

  it("the hydrogen arc can be consulted mid arrow without losing the selection", () => {
    const entries: TableEntry[] = [
      ...sn2Targets(),
      { point: { x: 200, y: 200 }, target: { kind: "hydrogenCount", atomId: "C1" } },
    ];
    const d = new Driver(createMechanismDraft(sn2StartingState()), entries);

    d.tap(P.oxygenLonePair);
    d.tap({ x: 200, y: 200 });

    expect(draftOf(d).revealedHydrogens).toEqual(["C1"]);
    expect(draftOf(d).armed).not.toBeNull();
  });
});

describe("what an arrow may not be, said by name", () => {
  it("an arrow that declares no change is refused, and the selection is kept", () => {
    const d = driver();
    d.tap(P.oxygenLonePair);
    d.tap(P.oxygenAtom); // the lone pair onto the atom it is already on

    const refusal = d.notices.find((item) => item.id === "arrow_refused_by_legality");
    expect(refusal).toBeDefined();
    expect(refusal?.severity).toBe("refused");
    expect(refusal?.legality?.[0]?.rule).toBe("arrow_declares_no_change");
    expect(refusal?.legality?.[0]?.cause).toBe("arrow_declares_no_change");
    expect(draftOf(d).arrows).toHaveLength(0);
    expect(draftOf(d).armed).not.toBeNull();
  });

  it("draining a lone pair more times than it has electrons is refused on the arrow that did it", () => {
    const d = driver();
    for (let i = 0; i < 3; i += 1) {
      d.tap(P.oxygenLonePair);
      d.tap(P.carbonAtom);
    }
    expect(draftOf(d).arrows).toHaveLength(3);

    d.clearLog();
    d.tap(P.oxygenLonePair);
    d.tap(P.carbonAtom);

    const refusal = d.notices.find((item) => item.id === "arrow_refused_by_legality");
    expect(refusal?.legality?.some((f) => f.rule === "lone_pairs_overdrawn")).toBe(true);
    expect(draftOf(d).arrows).toHaveLength(3);
  });

  it("a bond taken by its body cannot say which end forms the new bond", () => {
    const entries: TableEntry[] = [
      { point: P.bondBody, target: { kind: "bondBody", bondId: "bond_C1_C2" } },
      { point: P.handleAtCarbon, target: { kind: "bondEndHandle", bondId: "bond_C1_C2", atomId: "C1" } },
      { point: P.bromineAtom, target: { kind: "atom", atomId: "H1" } },
    ];
    const d = new Driver(createMechanismDraft(etheneState()), entries);

    d.tap(P.bondBody);
    d.tap(P.bromineAtom);

    expect(d.sawNotice("bond_source_needs_an_end")).toBe(true);
    expect(draftOf(d).arrows).toHaveLength(0);
    expect(draftOf(d).armed).not.toBeNull();
  });

  it("the same bond taken by an end handle draws the arrow that end implies", () => {
    const entries: TableEntry[] = [
      { point: P.bondBody, target: { kind: "bondBody", bondId: "bond_C1_C2" } },
      { point: P.handleAtCarbon, target: { kind: "bondEndHandle", bondId: "bond_C1_C2", atomId: "C1" } },
      { point: P.bromineAtom, target: { kind: "atom", atomId: "H1" } },
    ];
    const d = new Driver(createMechanismDraft(etheneState()), entries);

    d.tap(P.handleAtCarbon);
    d.tap(P.bromineAtom);

    expect(shapes(draftOf(d).arrows)).toEqual([
      {
        electrons: 2,
        source: { kind: "bond", bondId: "bond_C1_C2" },
        sink: { kind: "betweenAtoms", atomIds: ["C1", "H1"] },
      },
    ]);
  });

  it("a bond formation site is somewhere electrons go, never somewhere they come from", () => {
    const d = new Driver(createMechanismDraft(sn2StartingState()), [
      { point: P.carbonAtom, target: { kind: "betweenAtomsSite", atomIds: ["O1", "C1"] } },
    ]);
    d.tap(P.carbonAtom);
    expect(d.sawNotice("nothing_selected_for_this_target")).toBe(true);
  });

  it("a target belonging to another answer shape is refused by name", () => {
    const d = new Driver(createMechanismDraft(sn2StartingState()), [
      { point: P.carbonAtom, target: { kind: "reagentTile", reagentId: "naoh" } },
    ]);
    d.tap(P.carbonAtom);
    expect(d.sawNotice("target_not_valid_in_this_shape")).toBe(true);
  });
});

describe("bond formation sites offered while armed", () => {
  it("a site the geometry package only offers mid selection completes the arrow", () => {
    const entries: TableEntry[] = [
      ...sn2Targets(),
      {
        point: { x: 60, y: 10 },
        target: { kind: "betweenAtomsSite", atomIds: ["O1", "C1"] },
        onlyWhenArmed: true,
      },
    ];
    const d = new Driver(createMechanismDraft(sn2StartingState()), entries);

    // Nothing armed: the site is not there, so this is a tap on empty space.
    d.tap({ x: 60, y: 10 });
    expect(draftOf(d).arrows).toHaveLength(0);

    d.tap(P.oxygenLonePair);
    d.tap({ x: 60, y: 10 });
    expect(shapes(draftOf(d).arrows)).toEqual([
      {
        electrons: 2,
        source: { kind: "lonePair", atomId: "O1" },
        sink: { kind: "betweenAtoms", atomIds: ["O1", "C1"] },
      },
    ]);
  });
});

describe("fishhooks", () => {
  const radicalState = createState({
    id: "radical",
    members: [
      {
        species: createSpecies({
          id: "methyl",
          atoms: [createAtom({ id: "C1", element: "C", implicitHydrogens: 3, unpairedElectrons: 1 })],
        }),
        role: "intermediate",
      },
      {
        species: createSpecies({
          id: "chlorine",
          atoms: [createAtom({ id: "Cl1", element: "Cl", lonePairs: 3, unpairedElectrons: 1 })],
        }),
        role: "reagent",
      },
    ],
  });

  it("a single electron source draws a one electron arrow", () => {
    const d = new Driver(createMechanismDraft(radicalState), [
      { point: P.oxygenAtom, target: { kind: "unpairedElectron", atomId: "C1" } },
      { point: P.carbonAtom, target: { kind: "atom", atomId: "Cl1" } },
    ]);

    d.send({ kind: "command", command: { kind: "setElectronCount", electrons: 1 } });
    d.tap(P.oxygenAtom);
    d.tap(P.carbonAtom);

    expect(shapes(draftOf(d).arrows)).toEqual([
      {
        electrons: 1,
        source: { kind: "singleElectron", atomId: "C1" },
        sink: { kind: "betweenAtoms", atomIds: ["C1", "Cl1"] },
      },
    ]);
  });

  it("setting the electron count to what it already is changes nothing", () => {
    const d = driver();
    d.send({ kind: "command", command: { kind: "setElectronCount", electrons: 2 } });
    expect(canUndo(d.state)).toBe(false);
  });
});

describe("undo", () => {
  it("takes back a committed arrow", () => {
    const d = driver();
    d.tap(P.oxygenLonePair);
    d.tap(P.carbonAtom);
    expect(draftOf(d).arrows).toHaveLength(1);

    d.send({ kind: "command", command: { kind: "undo" } });
    expect(draftOf(d).arrows).toHaveLength(0);
  });

  it("takes back a selection too, because a mis-hit is the common case", () => {
    const d = driver();
    d.tap(P.oxygenLonePair);
    d.send({ kind: "command", command: { kind: "undo" } });
    expect(draftOf(d).armed).toBeNull();
  });

  it("says so by name when there is nothing left to take back", () => {
    const d = driver();
    d.send({ kind: "command", command: { kind: "undo" } });
    expect(d.sawNotice("nothing_to_undo")).toBe(true);
  });

  it("reviseLastTarget on a fresh draft is just a selection", () => {
    const d = driver();
    d.send({
      kind: "command",
      command: { kind: "reviseLastTarget", target: { kind: "lonePair", atomId: "O1", slotIndex: 0 } },
    });
    expect(draftOf(d).armed).not.toBeNull();
  });
});

describe("submitting", () => {
  it("hands the draft over as an effect and changes no state", () => {
    const d = driver();
    d.tap(P.oxygenLonePair);
    d.tap(P.carbonAtom);
    const before = draftOf(d);

    d.send({ kind: "command", command: { kind: "submit" } });

    expect(d.effects.at(-1)).toEqual({ kind: "submitAttempt", draft: before });
    expect(draftOf(d)).toBe(before);
  });

  it("carries a predicted product state when the problem asked for one", () => {
    const d = driver();
    const predicted = sn2StartingState();
    d.send({ kind: "command", command: { kind: "setPredictedState", state: predicted } });
    expect(draftOf(d).predicted).toBe(predicted);
  });

  it("refuses a command that belongs to another shape, by name", () => {
    const d = driver();
    d.send({ kind: "command", command: { kind: "setReagentsOrdered", ordered: true } });
    expect(d.sawNotice("command_not_valid_in_this_shape")).toBe(true);
  });

  it("clearSelection with nothing armed is a no op, not an undo entry", () => {
    const d = driver();
    d.send({ kind: "command", command: { kind: "clearSelection" } });
    expect(canUndo(d.state)).toBe(false);
  });

  it("clearSelection drops an armed source", () => {
    const d = driver();
    d.tap(P.oxygenLonePair);
    d.send({ kind: "command", command: { kind: "clearSelection" } });
    expect(draftOf(d).armed).toBeNull();
  });
});
