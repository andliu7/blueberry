/**
 * Adversary pass FOUR, Phase 2. Branch phase-2, commit 94eb3bd.
 *
 * Scope: the pass three fixes specifically, plus anything untouched across
 * passes one through three. Three findings below.
 *
 * ALL THREE ARE NOW FIXED AND EVERY TEST BELOW IS INVERTED IN PLACE, per the
 * convention adversarySnapshotIsolation.test.ts set and pass three followed:
 * the scenario construction is the adversary's, untouched, and the assertions
 * state what is true after the fix. The original findings are preserved in the
 * comments as the record of what used to happen.
 *
 * The fix was structural rather than another patch, because these three were
 * the fourth and fifth appearances of two root assumptions. See the blocker
 * report in STATUS.md and the argument in src/shapes/outcome.ts. A shape
 * reducer now REPORTS what its command did, `armed`, `disarmed`, `committed`,
 * `inspected`, `refused` or `nothing`, and machine.ts reads that report instead
 * of diffing `hasSelection` afterwards. Finding 1 stops being constructible: the
 * structure shape's two arm fields no longer matter to the window, because the
 * reducer itself says which effect happened.
 *
 * FINDING 1: the revise window's arming condition (`hasSelection` on the
 * post-command draft) is coarse enough to reopen on a disarm-only change
 * whenever the shape has a SECOND, independent selection field that happens
 * to be armed. The structure shape is the one shape with two such fields
 * (`palette` and `pendingBondFrom`), and reviseLastTarget's undo+reapply can
 * then silently create a bond the student never asked for.
 * FIXED by the report: the window opens on `report === "armed"` and on nothing
 * else, so a disarm closes it whatever else is armed.
 *
 * FINDING 2: createMechanismDraft's duplicate-id throw, added in pass three,
 * guards exactly one entry point: the constructor itself. `setShape` installs
 * a `ShapeDraft` object wholesale with no call to `createMechanismDraft` and
 * no duplicate-id check of its own, so a MechanismDraft built any other way
 * (deserialised from storage, assembled by hand, round-tripped through JSON)
 * carries a duplicate-id starting state straight into a live session.
 * FIXED: setShape validates the draft it installs and refuses by name. A
 * refusal rather than a throw, because unlike the constructor it has a notice
 * channel. The shape switch lives in shapes/index.ts so machine.ts still
 * contains no shape name.
 *
 * FINDING 3: acceptExternalStructure and setPredictedState share one notice
 * id, `external_structure_duplicate_atom_ids`, for what notices.ts's own
 * header documents as the meeting point with student-facing copy in
 * packages/feedback ("keyed by these ids"). Nothing on InteractionNotice
 * distinguishes which of the two entry points produced it. Not exploitable
 * yet, because packages/feedback does not consume interaction NoticeIds at
 * all today (grep confirms zero references) -- recorded as a latent
 * dead-on-arrival design gap for whenever that copy is authored.
 * FIXED: three entry points, three ids. The third one is finding 2's own
 * refusal, which would have been a fourth sharer of the same key.
 */

import { describe, expect, it } from "vitest";

import {
  createAtom,
  createSpecies,
  createState,
  findAtomInState,
  findBondBetween,
  type MechanismState,
} from "@blueberry/chem-core";
import { createMechanismDraft, type MechanismDraft } from "../src/shapes/mechanism.js";
import { createStructureDraft, type StructureDraft } from "../src/shapes/structure.js";
import { Driver, P } from "./support.js";
import type { TableEntry } from "./support.js";

function structureDraftOf(d: Driver): StructureDraft {
  const draft = d.state.doc.draft;
  if (draft.shape !== "structure") throw new Error("expected the structure shape");
  return draft;
}

function mechanismDraftOf(d: Driver): MechanismDraft {
  const draft = d.state.doc.draft;
  if (draft.shape !== "mechanism") throw new Error("expected the mechanism shape");
  return draft;
}

// ---------------------------------------------------------------------------
// FINDING 1: the revise window reopens on a structure-shape disarm because a
// SECOND, unrelated armed field (the palette) keeps hasSelection true.
// ---------------------------------------------------------------------------

describe("a contested atom re-tap that only disarms pendingBondFrom no longer reopens the revise window, whatever else is armed", () => {
  const atomPoint = { x: 1, y: 1 };
  const placementPointA = { x: 900, y: 900 };
  const placementPointB = { x: 901, y: 901 };

  it("closes the window on the disarm, so revise refuses by name instead of silently bonding two atoms", () => {
    // The atom id assigned by the first placement is deterministic
    // (createStructureDraft's own numbering), so the contested table entry
    // for the atom tap can be wired up front, in the same driver used for
    // everything else. Untabulated points (the two placement taps) fall
    // through the fake hit tester to `empty` with an infinite margin
    // regardless of what else is in the table, so this does not interfere
    // with placement.
    const contestedAtomEntries: TableEntry[] = [
      { point: atomPoint, target: { kind: "atom", atomId: "sa1" }, margin: 0.01 },
    ];
    const d = new Driver(createStructureDraft(), contestedAtomEntries);

    // Arm the palette, through the command entry point so no pointer event is
    // involved and the revise window cannot open from this step at all --
    // "a command is never a contested hit" per machine.ts.
    d.send({
      kind: "command",
      command: { kind: "selectTarget", target: { kind: "paletteElement", element: "C" } },
    });
    expect(structureDraftOf(d).palette).toBe("C");

    // Place two atoms by tapping empty space. placeAtom does not touch
    // `palette`, so it survives both placements.
    d.tap(placementPointA);
    d.tap(placementPointB);
    expect(structureDraftOf(d).palette).toBe("C");
    const sa1 = structureDraftOf(d).placements[0]!.atomId;
    const sa2 = structureDraftOf(d).placements[1]!.atomId;
    expect(sa1).toBe("sa1");
    expect(sa2).not.toBe(sa1);

    const withTable = d;

    // Tap 1: nothing pending, arms pendingBondFrom = sa1. Contested, and the
    // reducer reports `armed`, which is a legitimate arm. The window opening
    // here is correct, and it is now the report that says so rather than a
    // reading of the fields afterwards.
    withTable.tap(atomPoint);
    expect(structureDraftOf(withTable).pendingBondFrom).toBe(sa1);
    expect(withTable.state.doc === withTable.state.reviseWindow).toBe(true);

    // Tap 2: same contested point, same atom. bondStep's toggle branch fires
    // (`draft.pendingBondFrom === atomId`) and disarms: pendingBondFrom -> null.
    //
    // THE ORIGINAL VIOLATION: this is a genuine document change and the hit is
    // still contested, so machine.ts asked `hasSelection(applied.state.doc.draft)`.
    // For the mechanism shape (a single `armed` field) that read false and the
    // window closed, exactly as adversaryPassThree.test.ts proved. For the
    // structure shape it read TRUE: the palette was still "C", an entirely
    // unrelated field this tap never touched, so the window reopened pointed at
    // the DISARMED document.
    //
    // FIXED: bondStep's toggle branch reports `disarmed`, in its own words, and
    // the window opens on `armed` alone. The palette is still armed and that is
    // now irrelevant, which is the point of the structural fix rather than a
    // fifth patch to the projection.
    withTable.tap(atomPoint);
    expect(structureDraftOf(withTable).pendingBondFrom).toBeNull();
    expect(structureDraftOf(withTable).palette).toBe("C");
    expect(withTable.state.doc === withTable.state.reviseWindow).toBe(false);

    // A "did you mean" affordance, driven by the second target_was_ambiguous
    // notice, offers the other atom the tap could plausibly have meant. The
    // student, believing their double tap on sa1 was just a cancelled arm
    // (which is exactly what it was), never asked for a bond. They tap
    // "revise to sa2" believing it corrects an ambiguous SELECTION.
    withTable.clearLog();
    withTable.send({
      kind: "command",
      command: { kind: "reviseLastTarget", target: { kind: "atom", atomId: sa2 } },
    });

    // THE ORIGINAL VIOLATION: reviseLastTarget's guard passed (the window WAS
    // current), so it popped the undo stack's top entry -- the disarm -- which
    // restored pendingBondFrom = sa1, the very selection the student's second
    // tap had just cancelled. `selectTarget(atom sa2)` was then applied against
    // THAT resurrected state, and since pendingBondFrom was no longer null,
    // bondStep called bondAtoms(sa1, sa2) and committed a real bond, silently,
    // with no notice naming it.
    //
    // FIXED: the window is closed, so revise refuses by name. Nothing is
    // resurrected and no bond appears.
    expect(withTable.sawNotice("revise_refused_newer_work")).toBe(true);
    const bond = findBondBetween(
      findAtomInState(structureDraftOf(withTable).state, sa1)!.species,
      sa1,
      sa2,
    );
    expect(bond).toBeUndefined();
    expect(structureDraftOf(withTable).pendingBondFrom).toBeNull();
    expect(structureDraftOf(withTable).palette).toBe("C");
  });

  it("the arm that preceded it still opens the window, so the fix removed the false positive and not the feature", () => {
    // The other half of the same claim, and the reason this is not simply "the
    // window never opens in the structure shape": an arm reported as an arm,
    // with the palette in exactly the same state, still opens it and revise
    // still corrects the selection.
    const contestedAtomEntries: TableEntry[] = [
      { point: { x: 1, y: 1 }, target: { kind: "atom", atomId: "sa1" }, margin: 0.01 },
    ];
    const d = new Driver(createStructureDraft(), contestedAtomEntries);

    d.send({
      kind: "command",
      command: { kind: "selectTarget", target: { kind: "paletteElement", element: "C" } },
    });
    d.tap(placementPointA);
    d.tap(placementPointB);
    const sa2 = structureDraftOf(d).placements[1]!.atomId;

    d.tap({ x: 1, y: 1 });
    expect(structureDraftOf(d).pendingBondFrom).toBe("sa1");
    expect(d.state.doc === d.state.reviseWindow).toBe(true);

    d.send({
      kind: "command",
      command: { kind: "reviseLastTarget", target: { kind: "atom", atomId: sa2 } },
    });

    // The arm was undone and reapplied against the corrected atom, which is
    // what revise is for. sa2 is armed; nothing was bonded, because the undo
    // put the draft back to "nothing pending" first.
    expect(structureDraftOf(d).pendingBondFrom).toBe(sa2);
    expect(d.sawNotice("revise_refused_newer_work")).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// FINDING 2: setShape installs a whole ShapeDraft with no duplicate-id check
// of its own, bypassing createMechanismDraft's pass three throw entirely.
// ---------------------------------------------------------------------------

describe("setShape validates the draft it installs, so it is no longer an unguarded duplicate-id entry point", () => {
  function duplicateIdState(order: "carbon-first" | "nitrogen-first"): MechanismState {
    const carbon = createSpecies({
      id: "species-a",
      atoms: [createAtom({ id: "X1", element: "C", formalCharge: 0 })],
    });
    const nitrogen = createSpecies({
      id: "species-b",
      atoms: [createAtom({ id: "X1", element: "N", formalCharge: 0 })],
    });
    const members =
      order === "carbon-first"
        ? [
            { species: carbon, role: "substrate" as const },
            { species: nitrogen, role: "nucleophile" as const },
          ]
        : [
            { species: nitrogen, role: "nucleophile" as const },
            { species: carbon, role: "substrate" as const },
          ];
    return createState({ id: `dup-${order}`, members });
  }

  function handBuiltDraft(state: MechanismState): MechanismDraft {
    // This is exactly what a shell restoring a persisted or offline-queued
    // session would produce: a MechanismDraft object deserialised from JSON,
    // never having passed through createMechanismDraft, because
    // createMechanismDraft's own doc comment says it "runs at problem load,
    // called by the shell or a harness, never inside a reducer" -- setShape
    // IS a reducer-reachable path, and it is exactly where a restored draft
    // would be installed.
    return Object.freeze({
      shape: "mechanism" as const,
      state,
      arrows: Object.freeze([]),
      armed: null,
      electrons: 2,
      revealedLonePairs: Object.freeze([]),
      revealedHydrogens: Object.freeze([]),
      predicted: null,
      nextArrowNumber: 1,
    });
  }

  it("createMechanismDraft still throws when called directly, confirming the guard exists at all", () => {
    expect(() => createMechanismDraft(duplicateIdState("carbon-first"))).toThrow(/X1/);
  });

  it("a hand-built MechanismDraft carrying the same duplicate-id state is refused by name and never becomes the live draft", () => {
    const dup = duplicateIdState("carbon-first");
    const handBuilt = handBuiltDraft(dup);

    const seed = createMechanismDraft(createState({ id: "seed", members: [] }));
    const d = new Driver(seed, []);
    d.send({ kind: "command", command: { kind: "setShape", draft: handBuilt } });

    // THE ORIGINAL VIOLATION: no refusal reached the caller at all. setShape's
    // no-op guard only compares reference identity against the CURRENT draft,
    // and its reset branch never called duplicateAtomIds, so nothing in
    // NoticeId's registry fired and `dup` became the live state.
    //
    // FIXED: refused by name, with the offending id in the detail, and the
    // document is untouched.
    const refusal = d.notices.find((n) => n.id === "restored_draft_duplicate_atom_ids");
    expect(refusal).toBeDefined();
    expect(refusal?.severity).toBe("refused");
    expect(refusal?.detail).toContain("X1");
    expect(mechanismDraftOf(d).state).not.toBe(dup);
    expect(d.state.doc.draft).toBe(seed);

    // The exact hazard createMechanismDraft's throw exists to prevent is what
    // was live in a running session: the same atom id "X1" resolves to
    // whichever species is listed first, silently, and there is no species id
    // on HitTarget for the interaction layer to disambiguate with.
    const otherOrder = duplicateIdState("nitrogen-first");
    expect(findAtomInState(dup, "X1")?.atom.element).toBe("C");
    expect(findAtomInState(otherOrder, "X1")?.atom.element).toBe("N");
  });

  it("a hand-built draft with clean ids still installs, so the guard refuses the hazard and not the restore", () => {
    // The restore path is a real feature and this fix must not close it. Same
    // construction, ids that do not collide.
    const clean = createState({
      id: "restored",
      members: [
        {
          species: createSpecies({
            id: "species-a",
            atoms: [createAtom({ id: "X1", element: "C", formalCharge: 0 })],
          }),
          role: "substrate" as const,
        },
        {
          species: createSpecies({
            id: "species-b",
            atoms: [createAtom({ id: "X2", element: "N", formalCharge: 0 })],
          }),
          role: "nucleophile" as const,
        },
      ],
    });
    const handBuilt = handBuiltDraft(clean);

    const d = new Driver(createMechanismDraft(createState({ id: "seed", members: [] })), []);
    d.send({ kind: "command", command: { kind: "setShape", draft: handBuilt } });

    expect(d.notices).toHaveLength(0);
    expect(d.state.doc.draft).toBe(handBuilt);
    expect(d.state.doc.past).toHaveLength(0);
  });

  it("a restored draft whose PREDICTED product carries the duplicates is refused too, naming which state it was", () => {
    // setPredictedState guards the live route. A restored draft carries the
    // predicted state in the same object as the starting state, so a guard that
    // checked only `state` would leave the second half of the same draft
    // unguarded, which is the shape of this whole finding repeated one level
    // down.
    const d = new Driver(createMechanismDraft(createState({ id: "seed", members: [] })), []);
    const withBadPrediction: MechanismDraft = Object.freeze({
      ...handBuiltDraft(createState({ id: "clean-start", members: [] })),
      predicted: duplicateIdState("carbon-first"),
    });

    d.send({ kind: "command", command: { kind: "setShape", draft: withBadPrediction } });

    const refusal = d.notices.find((n) => n.id === "restored_draft_duplicate_atom_ids");
    expect(refusal?.detail).toContain("the predicted state");
    expect(d.state.doc.draft).not.toBe(withBadPrediction);
  });
});

// ---------------------------------------------------------------------------
// FINDING 3: acceptExternalStructure and setPredictedState shared a notice id
// with no field to tell them apart, contradicting notices.ts's own stated
// contract that student copy is "authored in packages/feedback, keyed by
// these ids". Not exploitable at the time: packages/feedback did not consume
// any interaction NoticeId (confirmed by grep across packages/feedback/src),
// so no live code branched on the collision. Recorded because the collision
// would still have been there the day that copy was written, and nothing in
// this package's types would have stopped it from being wired up wrong.
// ---------------------------------------------------------------------------

describe("the duplicate atom id refusal names which entry point produced it", () => {
  function duplicateIdState(): MechanismState {
    const carbon = createSpecies({
      id: "species-a",
      atoms: [createAtom({ id: "Y1", element: "C", formalCharge: 0 })],
    });
    const nitrogen = createSpecies({
      id: "species-b",
      atoms: [createAtom({ id: "Y1", element: "N", formalCharge: 0 })],
    });
    return createState({
      id: "dup",
      members: [
        { species: carbon, role: "substrate" as const },
        { species: nitrogen, role: "nucleophile" as const },
      ],
    });
  }

  it("the three routes a whole state can arrive by carry three distinct ids, so copy keyed on id can say three different things", () => {
    const structureDriver = new Driver(createStructureDraft(), []);
    structureDriver.send({
      kind: "command",
      command: { kind: "acceptExternalStructure", state: duplicateIdState() },
    });
    const fromStructure = structureDriver.notices.find((n) => n.severity === "refused");
    expect(fromStructure?.id).toBe("external_structure_duplicate_atom_ids");

    const mechanismDriver = new Driver(
      createMechanismDraft(createState({ id: "seed", members: [] })),
      [],
    );
    mechanismDriver.send({
      kind: "command",
      command: { kind: "setPredictedState", state: duplicateIdState() },
    });
    const fromMechanism = mechanismDriver.notices.find((n) => n.severity === "refused");
    expect(fromMechanism?.id).toBe("predicted_state_duplicate_atom_ids");

    // The third route, which finding 2's fix added. Had it reused either id
    // above, this fix would have made the collision worse rather than closing
    // it: a restored session is neither an editor handover nor a drawn product.
    const restoreDriver = new Driver(
      createMechanismDraft(createState({ id: "seed", members: [] })),
      [],
    );
    restoreDriver.send({
      kind: "command",
      command: {
        kind: "setShape",
        draft: Object.freeze({
          shape: "mechanism" as const,
          state: duplicateIdState(),
          arrows: Object.freeze([]),
          armed: null,
          electrons: 2,
          revealedLonePairs: Object.freeze([]),
          revealedHydrogens: Object.freeze([]),
          predicted: null,
          nextArrowNumber: 1,
        }),
      },
    });
    const fromRestore = restoreDriver.notices.find((n) => n.severity === "refused");
    expect(fromRestore?.id).toBe("restored_draft_duplicate_atom_ids");

    // THE ORIGINAL VIOLATION: the first two were the same id and the same
    // severity, and InteractionNotice's optional fields (`target`,
    // `candidates`, `legality`) carried nothing naming which entry point fired.
    // The only difference on the wire was the wording of `detail`, a string
    // documented in notices.ts itself as "engine facing... never shown to a
    // student." A consumer keyed purely on `id`, which is the contract that
    // file describes for packages/feedback, could not tell them apart.
    //
    // FIXED: three ids, all distinct, all in ALL_NOTICE_IDS.
    const ids = [fromStructure?.id, fromMechanism?.id, fromRestore?.id];
    expect(new Set(ids).size).toBe(3);
  });
});
