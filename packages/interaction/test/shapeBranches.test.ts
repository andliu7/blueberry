/**
 * The corners of the four shape reducers.
 *
 * A branch in a shape reducer is a behaviour of the machine: `reduce` dispatches
 * into these files and their notices come back out of `reduce` stamped with the
 * command that produced them. So they are inside the state machine module for the
 * purposes of the Phase 2 exit condition, and they are held to the same bar.
 *
 * Two tests here drive the machine through `setShape` carrying a draft the
 * machine did not build. That is the one route by which a shell can hand this
 * package a draft whose selection points at something that is not there: a
 * restored session, a draft from a server, a shape swap written by hand. Each is
 * labelled where it happens.
 */

import { describe, expect, it } from "vitest";
import {
  createArrow,
  createAtom,
  createBond,
  createSpecies,
  createState,
  findAtomInState,
  findBondInState,
  fromLonePair,
  toBondBetween,
} from "@blueberry/chem-core";

import { inFlightGuide } from "../src/machine.js";
import {
  createMechanismDraft,
  findingsIntroducedBy,
  type MechanismDraft,
} from "../src/shapes/mechanism.js";
import { chosenCandidate, createRankingDraft, type RankingDraft } from "../src/shapes/ranking.js";
import { createReagentsDraft, move, type ReagentsDraft } from "../src/shapes/reagents.js";
import { createStructureDraft, type StructureDraft } from "../src/shapes/structure.js";
import { Driver, P, sn2StartingState, sn2Targets, type TableEntry } from "./support.js";

function mechanismDriver(extra: readonly TableEntry[] = []): Driver {
  return new Driver(createMechanismDraft(sn2StartingState()), [...sn2Targets(), ...extra]);
}

function mechanismDraftOf(d: Driver): MechanismDraft {
  const draft = d.state.doc.draft;
  if (draft.shape !== "mechanism") throw new Error("expected the mechanism shape");
  return draft;
}

function structureDraftOf(d: Driver): StructureDraft {
  const draft = d.state.doc.draft;
  if (draft.shape !== "structure") throw new Error("expected the structure shape");
  return draft;
}

function reagentsDraftOf(d: Driver): ReagentsDraft {
  const draft = d.state.doc.draft;
  if (draft.shape !== "reagents") throw new Error("expected the reagents shape");
  return draft;
}

function rankingDraftOf(d: Driver): RankingDraft {
  const draft = d.state.doc.draft;
  if (draft.shape !== "ranking") throw new Error("expected the major product shape");
  return draft;
}

// ---------------------------------------------------------------------------
// Whether something is armed, in every shape
// ---------------------------------------------------------------------------

describe("the in flight guide, which is the same question asked of all four shapes", () => {
  const paletteCarbon = { x: 0, y: 0 };
  const canvasA = { x: 100, y: 100 };
  const canvasB = { x: 200, y: 100 };
  const firstAtom = { x: 101, y: 100 };

  const structureEntries: TableEntry[] = [
    { point: paletteCarbon, target: { kind: "paletteElement", element: "C" } },
    { point: firstAtom, target: { kind: "atom", atomId: "sa1" } },
  ];

  it("is drawn while an element is armed but no bond is half built", () => {
    const d = new Driver(createStructureDraft(), structureEntries);

    d.down(paletteCarbon);

    expect(structureDraftOf(d).palette).toBe("C");
    expect(structureDraftOf(d).pendingBondFrom).toBeNull();
    expect(inFlightGuide(d.state)).not.toBeNull();
  });

  it("is drawn while a bond is half built", () => {
    const d = new Driver(createStructureDraft(), structureEntries);

    d.tap(paletteCarbon);
    d.tap(canvasA);
    d.tap(paletteCarbon); // put the element down again
    d.down(firstAtom);

    expect(structureDraftOf(d).pendingBondFrom).toBe("sa1");
    expect(inFlightGuide(d.state)).not.toBeNull();
  });

  it("is not drawn in the structure shape when nothing at all is armed", () => {
    const d = new Driver(createStructureDraft(), structureEntries);

    d.down(canvasB);

    expect(structureDraftOf(d).palette).toBeNull();
    expect(structureDraftOf(d).pendingBondFrom).toBeNull();
    expect(inFlightGuide(d.state)).toBeNull();
  });

  it("is drawn while a reagent slot is armed, and not before", () => {
    const tile = { x: 10, y: 0 };
    const slot0 = { x: 10, y: 40 };
    const d = new Driver(createReagentsDraft(true), [
      { point: tile, target: { kind: "reagentTile", reagentId: "naoh_aqueous" } },
      { point: slot0, target: { kind: "sequenceSlot", index: 0 } },
    ]);

    d.tap(tile);
    d.down(slot0);
    expect(reagentsDraftOf(d).armedSlot).toBe(0);
    expect(inFlightGuide(d.state)).not.toBeNull();

    d.up(slot0);
    d.down(tile);
    expect(reagentsDraftOf(d).armedSlot).toBeNull();
    expect(inFlightGuide(d.state)).toBeNull();
  });

  it("is drawn while a candidate is armed, and not before", () => {
    const cardA = { x: 0, y: 0 };
    const d = new Driver(createRankingDraft(["a", "b"]), [
      { point: cardA, target: { kind: "candidate", candidateId: "a" } },
    ]);

    d.down(cardA);
    expect(rankingDraftOf(d).armed).toBe("a");
    expect(inFlightGuide(d.state)).not.toBeNull();
  });
});

// ---------------------------------------------------------------------------
// Mechanism
// ---------------------------------------------------------------------------

describe("the mechanism shape", () => {
  it("setting the predicted product to what it already is costs no undo entry", () => {
    const d = mechanismDriver();

    d.send({ kind: "command", command: { kind: "setPredictedState", state: null } });

    expect(mechanismDraftOf(d).predicted).toBeNull();
    expect(d.state.doc.past).toEqual([]);
  });

  it("does not blame a new arrow for a violation the existing ones already had", () => {
    const state = sn2StartingState();

    // Carbon has no lone pairs, so this arrow is broken on its own terms. It
    // could never be committed through the machine, which is the point: this
    // function is the aggregate rule, and the aggregate rule has to be able to
    // read an arrow list it did not build.
    const alreadyBroken = createArrow({
      id: "pre",
      electrons: 2,
      source: fromLonePair("C1"),
      sink: toBondBetween("C1", "Br1"),
    });
    const honest = createArrow({
      id: "new",
      electrons: 2,
      source: fromLonePair("O1"),
      sink: toBondBetween("O1", "C1"),
    });

    expect(findingsIntroducedBy([], alreadyBroken, state).length).toBeGreaterThan(0);

    const introduced = findingsIntroducedBy([alreadyBroken], honest, state);
    expect(introduced.map((finding) => finding.arrowId)).not.toContain("pre");
    expect(introduced).toEqual([]);
  });

  it("refuses a sink that is a bond the state does not contain, by name", () => {
    const ghostBond = { x: 700, y: 700 };
    const d = mechanismDriver([
      { point: ghostBond, target: { kind: "bondBody", bondId: "ghost" } },
    ]);

    d.tap(P.oxygenLonePair);
    d.tap(ghostBond);

    expect(d.sawNotice("nothing_selected_for_this_target")).toBe(true);
    expect(mechanismDraftOf(d).arrows).toEqual([]);
    // The selection is kept, so the next tap is a second try at the sink.
    expect(mechanismDraftOf(d).armed).not.toBeNull();
  });

  it("refuses a bond SOURCE the state does not contain, by name", () => {
    const ghostHandle = { x: 700, y: 720 };
    const d = mechanismDriver([
      { point: ghostHandle, target: { kind: "bondEndHandle", bondId: "ghost", atomId: "C1" } },
    ]);

    d.tap(ghostHandle);
    expect(mechanismDraftOf(d).armed?.source).toEqual({ kind: "bond", bondId: "ghost" });

    d.tap(P.bromineAtom);

    expect(d.sawNotice("nothing_selected_for_this_target")).toBe(true);
    expect(mechanismDraftOf(d).arrows).toEqual([]);
  });

  it("refuses a sink belonging to another answer shape, by name", () => {
    const tile = { x: 800, y: 800 };
    const d = mechanismDriver([
      { point: tile, target: { kind: "reagentTile", reagentId: "naoh_aqueous" } },
    ]);

    d.tap(P.oxygenLonePair);
    d.tap(tile);

    const refusal = d.notices.find((item) => item.id === "target_not_valid_in_this_shape");
    expect(refusal?.severity).toBe("refused");
    expect(refusal?.detail).toContain("reagentTile");
    expect(mechanismDraftOf(d).arrows).toEqual([]);
  });

  /**
   * A carbonyl forming from an alkoxide: the pair on the oxygen goes into the C
   * to O sigma bond that is already drawn. The sink is the drawn bond itself, not
   * a formation site, because there is nothing to form.
   */
  function alkoxideState() {
    return createState({
      id: "alkoxide",
      members: [
        {
          role: "substrate",
          species: createSpecies({
            id: "ethanolate",
            atoms: [
              createAtom({ id: "C1", element: "C", implicitHydrogens: 3 }),
              createAtom({ id: "O1", element: "O", formalCharge: -1, lonePairs: 3 }),
            ],
            bonds: [createBond({ id: "b1", a: "C1", b: "O1", order: 1 })],
          }),
        },
      ],
    });
  }

  const lonePair = { x: 10, y: 10 };
  const bondSink = { x: 40, y: 10 };

  function alkoxideDriver(sinkTarget: TableEntry["target"]): Driver {
    return new Driver(createMechanismDraft(alkoxideState()), [
      { point: lonePair, target: { kind: "lonePair", atomId: "O1", slotIndex: 0 } },
      { point: bondSink, target: sinkTarget },
    ]);
  }

  it("lands a pair into a bond that already exists, tapped by its body", () => {
    const d = alkoxideDriver({ kind: "bondBody", bondId: "b1" });

    d.tap(lonePair);
    d.tap(bondSink);

    const arrows = mechanismDraftOf(d).arrows;
    expect(d.notices.filter((item) => item.severity === "refused")).toEqual([]);
    expect(arrows.length).toBe(1);
    expect(arrows[0]?.source).toEqual({ kind: "lonePair", atomId: "O1" });
    expect(arrows[0]?.sink).toEqual({ kind: "betweenAtoms", atomIds: ["C1", "O1"] });
  });

  it("reads an end handle as a SINK exactly as it reads the body, because the bond names both ends", () => {
    // The handle only carries extra meaning when the bond is the SOURCE, where it
    // names the pivot. Landing on it, either end says the same thing: into this
    // bond. A fingertip that hits the handle instead of the capsule must not get
    // a different arrow.
    const body = alkoxideDriver({ kind: "bondBody", bondId: "b1" });
    body.tap(lonePair);
    body.tap(bondSink);

    const handle = alkoxideDriver({ kind: "bondEndHandle", bondId: "b1", atomId: "C1" });
    handle.tap(lonePair);
    handle.tap(bondSink);

    expect(handle.notices.filter((item) => item.severity === "refused")).toEqual([]);
    expect(mechanismDraftOf(handle).arrows.map((a) => a.sink)).toEqual(
      mechanismDraftOf(body).arrows.map((a) => a.sink),
    );
    expect(mechanismDraftOf(handle).arrows[0]?.sink).toEqual({
      kind: "betweenAtoms",
      atomIds: ["C1", "O1"],
    });
  });
});

// ---------------------------------------------------------------------------
// Reagents
// ---------------------------------------------------------------------------

describe("the reagents shape, the rest of it", () => {
  const tileA = { x: 0, y: 0 };
  const tileB = { x: 0, y: 20 };
  const slot0 = { x: 0, y: 60 };
  const atomFromAnotherShape = { x: 400, y: 400 };
  const nothing = { x: 900, y: 900 };

  const entries: TableEntry[] = [
    { point: tileA, target: { kind: "reagentTile", reagentId: "naoh_aqueous" } },
    { point: tileB, target: { kind: "reagentTile", reagentId: "h2so4_conc" } },
    { point: slot0, target: { kind: "sequenceSlot", index: 0 } },
    { point: atomFromAnotherShape, target: { kind: "atom", atomId: "C1" } },
  ];

  function driver(ordered = true): Driver {
    return new Driver(createReagentsDraft(ordered), entries);
  }

  it("clearing a selection that is not there is a no op, not an undo entry", () => {
    const d = driver();
    d.tap(tileA);
    const past = d.state.doc.past.length;

    d.send({ kind: "command", command: { kind: "clearSelection" } });

    expect(d.state.doc.past.length).toBe(past);
    expect(reagentsDraftOf(d).armedSlot).toBeNull();
  });

  it("clearing an armed slot drops it", () => {
    const d = driver();
    d.tap(tileA);
    d.tap(slot0);
    expect(reagentsDraftOf(d).armedSlot).toBe(0);

    d.send({ kind: "command", command: { kind: "clearSelection" } });

    expect(reagentsDraftOf(d).armedSlot).toBeNull();
  });

  it("asking for the ordering mode it is already in changes nothing", () => {
    const d = driver(true);
    d.tap(tileA);
    const past = d.state.doc.past.length;

    d.send({ kind: "command", command: { kind: "setReagentsOrdered", ordered: true } });

    expect(reagentsDraftOf(d).ordered).toBe(true);
    expect(d.state.doc.past.length).toBe(past);
  });

  it("submitting hands the reagent list over as an effect and changes nothing", () => {
    const d = driver();
    d.tap(tileA);
    d.tap(tileB);
    const before = d.state.doc.draft;
    d.clearLog();

    d.send({ kind: "command", command: { kind: "submit" } });

    expect(d.effects).toEqual([{ kind: "submitAttempt", draft: before }]);
    expect(d.state.doc.draft).toBe(before);
  });

  it("a tap on empty space with nothing armed does nothing at all", () => {
    const d = driver();
    d.tap(tileA);
    const past = d.state.doc.past.length;

    d.tap(nothing);

    expect(d.state.doc.past.length).toBe(past);
    expect(reagentsDraftOf(d).chosen).toEqual(["naoh_aqueous"]);
  });

  it("refuses a target that belongs to the mechanism shape, by name", () => {
    const d = driver();

    d.tap(atomFromAnotherShape);

    const refusal = d.notices.find((item) => item.id === "target_not_valid_in_this_shape");
    expect(refusal?.severity).toBe("refused");
    expect(refusal?.detail).toContain("atom");
    expect(reagentsDraftOf(d).chosen).toEqual([]);
  });

  it("move leaves the list alone when asked to move a position that does not exist", () => {
    // `move` is exported for shells that want to preview a reorder before
    // dispatching it. The machine itself range checks first, so this guard is
    // only reachable through that export, and this is the contract it keeps.
    const items = ["a", "b", "c"];
    expect(move(items, 7, 0)).toEqual(items);
    expect(move(items, -1, 0)).toEqual(items);
    expect(move(items, 2, 0)).toEqual(["c", "a", "b"]);
  });
});

// ---------------------------------------------------------------------------
// Ranking
// ---------------------------------------------------------------------------

describe("the major product shape, the rest of it", () => {
  const cardA = { x: 0, y: 0 };
  const cardB = { x: 0, y: 40 };
  const reasonTile = { x: 100, y: 0 };
  const nothing = { x: 900, y: 900 };

  const entries: TableEntry[] = [
    { point: cardA, target: { kind: "candidate", candidateId: "a" } },
    { point: cardB, target: { kind: "candidate", candidateId: "b" } },
    { point: reasonTile, target: { kind: "reasonTile", reasonId: "more_substituted_alkene" } },
  ];

  function driver(candidates: readonly string[] = ["a", "b"]): Driver {
    return new Driver(createRankingDraft(candidates), entries);
  }

  it("names no winner when the problem carried no candidates", () => {
    expect(chosenCandidate(createRankingDraft([]))).toBeNull();
    expect(chosenCandidate(createRankingDraft(["a", "b"]))).toBe("a");
  });

  it("clearing a selection that is not there is a no op, not an undo entry", () => {
    const d = driver();
    const past = d.state.doc.past.length;

    d.send({ kind: "command", command: { kind: "clearSelection" } });

    expect(d.state.doc.past.length).toBe(past);
  });

  it("clearing an armed candidate drops it", () => {
    const d = driver();
    d.tap(cardA);
    expect(rankingDraftOf(d).armed).toBe("a");

    d.send({ kind: "command", command: { kind: "clearSelection" } });

    expect(rankingDraftOf(d).armed).toBeNull();
  });

  it("records a reason sent as a command, the same one a reason tile sends", () => {
    const tapped = driver();
    tapped.tap(reasonTile);

    const typed = driver();
    typed.send({
      kind: "command",
      command: { kind: "setReason", reasonId: "more_substituted_alkene" },
    });

    expect(rankingDraftOf(typed).reason).toBe("more_substituted_alkene");
    expect(rankingDraftOf(typed).reason).toBe(rankingDraftOf(tapped).reason);
  });

  it("choosing the reason that is already chosen changes nothing", () => {
    const d = driver();
    d.tap(reasonTile);
    const past = d.state.doc.past.length;

    d.tap(reasonTile);

    expect(d.state.doc.past.length).toBe(past);
    expect(rankingDraftOf(d).reason).toBe("more_substituted_alkene");
  });

  it("clears the reason when it is set back to nothing", () => {
    const d = driver();
    d.tap(reasonTile);

    d.send({ kind: "command", command: { kind: "setReason", reasonId: null } });

    expect(rankingDraftOf(d).reason).toBeNull();
  });

  it("submitting hands the order and the reason over as an effect", () => {
    const d = driver();
    d.tap(cardB);
    d.tap(cardA);
    d.tap(reasonTile);
    const before = d.state.doc.draft;
    d.clearLog();

    d.send({ kind: "command", command: { kind: "submit" } });

    expect(d.effects).toEqual([{ kind: "submitAttempt", draft: before }]);
    expect(d.state.doc.draft).toBe(before);
  });

  it("refuses a command from another shape, by name", () => {
    const d = driver();

    d.send({ kind: "command", command: { kind: "setElectronCount", electrons: 1 } });

    const refusal = d.notices.find((item) => item.id === "command_not_valid_in_this_shape");
    expect(refusal?.severity).toBe("refused");
    expect(refusal?.detail).toContain("setElectronCount");
  });

  it("a tap on empty space with nothing armed does nothing at all", () => {
    const d = driver();
    const past = d.state.doc.past.length;

    d.tap(nothing);

    expect(d.state.doc.past.length).toBe(past);
    expect(rankingDraftOf(d).order).toEqual(["a", "b"]);
  });

  it("drops the selection rather than moving something arbitrary when the armed candidate is not on the list", () => {
    // A draft the machine did not build, handed to it by a shell through
    // setShape: the one route by which `armed` can name a candidate that is not
    // among the candidates. Refusing to move anything is the only safe answer,
    // because there is no position to move FROM.
    const d = driver();
    d.send({
      kind: "command",
      command: {
        kind: "setShape",
        draft: { shape: "ranking", order: ["a", "b"], reason: null, armed: "gone" },
      },
    });

    d.tap(cardA);

    expect(rankingDraftOf(d).armed).toBeNull();
    expect(rankingDraftOf(d).order).toEqual(["a", "b"]);
  });
});

// ---------------------------------------------------------------------------
// Structure
// ---------------------------------------------------------------------------

describe("the structure shape, the rest of it", () => {
  const paletteCarbon = { x: 0, y: 0 };
  const canvasA = { x: 100, y: 100 };
  const canvasB = { x: 200, y: 100 };
  const canvasC = { x: 300, y: 100 };
  const atom1 = { x: 101, y: 100 };
  const atom2 = { x: 201, y: 100 };
  const atom3 = { x: 301, y: 100 };
  const handleOnFirstBond = { x: 150, y: 100 };
  const ghostBond = { x: 700, y: 100 };
  const ghostAtom = { x: 700, y: 200 };
  const ghostHydrogenArc = { x: 700, y: 300 };
  const ghostRadical = { x: 700, y: 400 };
  const radicalOnFirst = { x: 120, y: 140 };
  const lonePairOnFirst = { x: 120, y: 160 };
  const tileFromAnotherShape = { x: 800, y: 100 };

  const entries: TableEntry[] = [
    { point: paletteCarbon, target: { kind: "paletteElement", element: "C" } },
    { point: atom1, target: { kind: "atom", atomId: "sa1" } },
    { point: atom2, target: { kind: "atom", atomId: "sa2" } },
    { point: atom3, target: { kind: "atom", atomId: "sa3" } },
    { point: handleOnFirstBond, target: { kind: "bondEndHandle", bondId: "sb3", atomId: "sa1" } },
    { point: ghostBond, target: { kind: "bondBody", bondId: "ghost" } },
    { point: ghostAtom, target: { kind: "atom", atomId: "ghost" } },
    { point: ghostHydrogenArc, target: { kind: "hydrogenCount", atomId: "ghost" } },
    { point: ghostRadical, target: { kind: "unpairedElectron", atomId: "ghost" } },
    { point: radicalOnFirst, target: { kind: "unpairedElectron", atomId: "sa1" } },
    { point: lonePairOnFirst, target: { kind: "lonePair", atomId: "sa1", slotIndex: 0 } },
    { point: tileFromAnotherShape, target: { kind: "reagentTile", reagentId: "naoh_aqueous" } },
  ];

  function driver(): Driver {
    return new Driver(createStructureDraft(), entries);
  }

  /**
   * Place a carbon at each point.
   *
   * The palette element is armed once and stays armed, because placing an atom
   * does not put the element down. Tapping the palette again would toggle it OFF,
   * which is the behaviour "tapping the same palette element twice puts it down"
   * already pins.
   */
  function place(d: Driver, points: readonly { x: number; y: number }[]): void {
    d.tap(paletteCarbon);
    for (const point of points) d.tap(point);
  }

  it("clearing with nothing armed is a no op, not an undo entry", () => {
    const d = driver();
    const past = d.state.doc.past.length;

    d.send({ kind: "command", command: { kind: "clearSelection" } });

    expect(d.state.doc.past.length).toBe(past);
  });

  it("clearing drops an armed palette element", () => {
    const d = driver();
    d.tap(paletteCarbon);

    d.send({ kind: "command", command: { kind: "clearSelection" } });

    expect(structureDraftOf(d).palette).toBeNull();
  });

  it("clearing drops a half built bond", () => {
    const d = driver();
    place(d, [canvasA]);
    d.tap(atom1);
    expect(structureDraftOf(d).pendingBondFrom).toBe("sa1");

    d.send({ kind: "command", command: { kind: "clearSelection" } });

    expect(structureDraftOf(d).pendingBondFrom).toBeNull();
    expect(structureDraftOf(d).palette).toBeNull();
  });

  it("submitting hands the structure over as an effect and changes nothing", () => {
    const d = driver();
    place(d, [canvasA]);
    const before = d.state.doc.draft;
    d.clearLog();

    d.send({ kind: "command", command: { kind: "submit" } });

    expect(d.effects).toEqual([{ kind: "submitAttempt", draft: before }]);
    expect(d.state.doc.draft).toBe(before);
  });

  it("refuses a command from another shape, by name", () => {
    const d = driver();

    d.send({ kind: "command", command: { kind: "setReason", reasonId: "anything" } });

    const refusal = d.notices.find((item) => item.id === "command_not_valid_in_this_shape");
    expect(refusal?.severity).toBe("refused");
    expect(refusal?.detail).toContain("setReason");
  });

  it("refuses a target that belongs to another shape, by name", () => {
    const d = driver();

    d.tap(tileFromAnotherShape);

    const refusal = d.notices.find((item) => item.id === "target_not_valid_in_this_shape");
    expect(refusal?.severity).toBe("refused");
    expect(refusal?.detail).toContain("reagentTile");
  });

  it("tapping a bond END HANDLE cycles the order, exactly as the body does", () => {
    const d = driver();
    place(d, [canvasA, canvasB]);
    d.tap(atom1);
    d.tap(atom2);

    const bondId = structureDraftOf(d).state.members[0]?.species.bonds[0]?.id;
    expect(bondId).toBe("sb3");

    d.tap(handleOnFirstBond);

    const bond = findBondInState(structureDraftOf(d).state, "sb3");
    expect(bond?.bond.order).toBe(2);
  });

  it("closes a ring by bonding two atoms that are already in the same molecule", () => {
    const d = driver();
    place(d, [canvasA, canvasB, canvasC]);

    d.tap(atom1);
    d.tap(atom2); // sa1 and sa2 merge into one molecule
    d.tap(atom2);
    d.tap(atom3); // sa3 joins the same molecule

    const beforeClose = structureDraftOf(d).state;
    expect(beforeClose.members.length).toBe(1);
    const bondsBefore = beforeClose.members[0]?.species.bonds.length;

    d.tap(atom1);
    d.tap(atom3); // both already in one molecule: a bond is added, not a merge

    const after = structureDraftOf(d).state;
    expect(after.members.length).toBe(1);
    expect(after.members[0]?.species.bonds.length).toBe((bondsBefore ?? 0) + 1);
    expect(d.sawNotice("bond_order_cycled_instead_of_added")).toBe(false);
  });

  it("refuses a bond step on an atom that is not in the structure, by name", () => {
    const d = driver();
    place(d, [canvasA]);

    d.tap(ghostAtom);

    expect(d.sawNotice("atom_not_in_structure")).toBe(true);
    expect(structureDraftOf(d).pendingBondFrom).toBeNull();
  });

  it("refuses to finish a bond whose first end is no longer in the structure, by name", () => {
    // Another draft the machine did not build, handed over through setShape. A
    // shell restoring a saved draft is the concrete case. The machine must say
    // so by name rather than throw on a missing atom.
    const d = driver();
    place(d, [canvasA]);
    const built = structureDraftOf(d);

    d.send({
      kind: "command",
      command: { kind: "setShape", draft: { ...built, pendingBondFrom: "ghost" } },
    });
    d.clearLog();

    d.tap(atom1);

    expect(d.sawNotice("atom_not_in_structure")).toBe(true);
    expect(structureDraftOf(d).state.members[0]?.species.bonds).toEqual([]);
  });

  it("refuses a tap on a bond that is not in the structure, by name", () => {
    const d = driver();
    place(d, [canvasA]);

    d.tap(ghostBond);

    expect(d.sawNotice("atom_not_in_structure")).toBe(true);
  });

  it("refuses a hydrogen arc on an atom that is not in the structure, by name", () => {
    const d = driver();

    d.tap(ghostHydrogenArc);

    expect(d.sawNotice("atom_not_in_structure")).toBe(true);
  });

  it("toggles a radical on and off, and refuses one on an atom that is not there", () => {
    const d = driver();
    place(d, [canvasA]);

    d.tap(radicalOnFirst);
    expect(findAtomInState(structureDraftOf(d).state, "sa1")?.atom.unpairedElectrons).toBe(1);

    d.tap(radicalOnFirst);
    expect(findAtomInState(structureDraftOf(d).state, "sa1")?.atom.unpairedElectrons).toBe(0);

    d.clearLog();
    d.tap(ghostRadical);
    expect(d.sawNotice("atom_not_in_structure")).toBe(true);
  });

  it("tapping a drawn lone pair takes one away, and taking one from none does nothing", () => {
    const d = driver();
    place(d, [canvasA]);
    d.send({
      kind: "command",
      command: { kind: "adjustLonePairs", atomId: "sa1", delta: 1 },
    });
    expect(findAtomInState(structureDraftOf(d).state, "sa1")?.atom.lonePairs).toBe(1);

    d.tap(lonePairOnFirst);
    expect(findAtomInState(structureDraftOf(d).state, "sa1")?.atom.lonePairs).toBe(0);

    const past = d.state.doc.past.length;
    d.tap(lonePairOnFirst);
    // The stepper is already at its floor. Nothing happened, and nothing went on
    // the undo stack to make the next undo look broken.
    expect(findAtomInState(structureDraftOf(d).state, "sa1")?.atom.lonePairs).toBe(0);
    expect(d.state.doc.past.length).toBe(past);
  });

  it("refuses removing an atom that is not in the structure, by name", () => {
    const d = driver();

    d.send({ kind: "command", command: { kind: "removeAtom", atomId: "ghost" } });

    expect(d.sawNotice("atom_not_in_structure")).toBe(true);
  });

  it("removing one atom of a two atom molecule leaves the molecule with the other", () => {
    const d = driver();
    place(d, [canvasA, canvasB]);
    d.tap(atom1);
    d.tap(atom2);
    expect(structureDraftOf(d).state.members.length).toBe(1);

    d.send({ kind: "command", command: { kind: "removeAtom", atomId: "sa2" } });

    const state = structureDraftOf(d).state;
    expect(state.members.length).toBe(1);
    expect(state.members[0]?.species.atoms.map((atom) => atom.id)).toEqual(["sa1"]);
    expect(structureDraftOf(d).placements.map((p) => p.atomId)).toEqual(["sa1"]);
  });

  it("removing the atom a bond was started from drops the half built bond", () => {
    const d = driver();
    place(d, [canvasA, canvasB]);
    d.tap(atom1);
    expect(structureDraftOf(d).pendingBondFrom).toBe("sa1");

    d.send({ kind: "command", command: { kind: "removeAtom", atomId: "sa1" } });

    expect(structureDraftOf(d).pendingBondFrom).toBeNull();
  });

  it("removing an unrelated atom keeps the half built bond", () => {
    const d = driver();
    place(d, [canvasA, canvasB]);
    d.tap(atom1);

    d.send({ kind: "command", command: { kind: "removeAtom", atomId: "sa2" } });

    expect(structureDraftOf(d).pendingBondFrom).toBe("sa1");
  });
});
