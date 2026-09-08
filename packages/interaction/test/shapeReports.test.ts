/**
 * What every reducer SAYS it did, checked against what it actually did.
 *
 * `ShapeOutcome.report` is the Phase 2 structural fix: machine.ts stopped
 * working out what a command did by diffing `hasSelection` afterwards and now
 * reads a statement from the reducer that did it. That trade only pays if the
 * statements are true. A reducer that reports `armed` when it disarmed is the
 * new way to reintroduce the old bug, one layer down and harder to see, so this
 * file is the check that keeps the trade honest. It has three parts.
 *
 * 1. A scenario per shape per report value. Every value a shape can produce has
 *    at least one named behaviour producing it, and the values a shape CANNOT
 *    produce are listed with the argument for why, so an absence stays a
 *    decision rather than becoming an oversight.
 *
 * 2. Two shape blind invariants, swept over every command against every shape.
 *    These are the ones that would catch a lie in a reducer nobody thought to
 *    write a scenario for:
 *
 *      a. `nothing` and `refused` return the SAME draft object; every other
 *         report returns a different one. Half of this is enforced by the type
 *         (`changed()` will not accept `nothing` or `refused`), and the other
 *         half cannot be, because a constructor cannot see the draft it is
 *         replacing.
 *      b. A command that newly arms something MUST report `armed`, and a
 *         command reporting `armed` must leave something armed. This is the
 *         exact property machine.ts's revise window turns on, stated as a rule
 *         over every reducer rather than trusted per call site.
 *
 * 3. The report as it reaches the machine, including the three documented cases
 *    where `Transition.report` is null because no shape reducer ran.
 */

import { describe, expect, it } from "vitest";

import { createState } from "@blueberry/chem-core";
import type { InteractionCommand } from "../src/commands.js";
import {
  ALL_ANSWER_SHAPES,
  ALL_SHAPE_REPORTS,
  applyToShape,
  hasSelection,
  type AnswerShape,
  type ShapeDraft,
  type ShapeReport,
} from "../src/shapes/index.js";
import { createMechanismDraft } from "../src/shapes/mechanism.js";
import { createRankingDraft } from "../src/shapes/ranking.js";
import { createReagentsDraft } from "../src/shapes/reagents.js";
import { createStructureDraft } from "../src/shapes/structure.js";
import { Driver, P, sn2StartingState, sn2Targets } from "./support.js";

// ---------------------------------------------------------------------------
// Fixtures. Each one is a draft in the state its scenarios need, built by
// running real commands rather than by hand, so no scenario starts from a draft
// no sequence of taps could produce.
// ---------------------------------------------------------------------------

function apply(draft: ShapeDraft, ...commands: readonly InteractionCommand[]): ShapeDraft {
  let current = draft;
  for (const command of commands) current = applyToShape(current, command).draft;
  return current;
}

function mechanismDraft(): ShapeDraft {
  return createMechanismDraft(sn2StartingState());
}

const OXYGEN_PAIR: InteractionCommand = {
  kind: "selectTarget",
  target: { kind: "lonePair", atomId: "O1", slotIndex: 0 },
};
const CARBON: InteractionCommand = { kind: "selectTarget", target: { kind: "atom", atomId: "C1" } };
const CARBON_HYDROGENS: InteractionCommand = {
  kind: "selectTarget",
  target: { kind: "hydrogenCount", atomId: "C1" },
};
const PICK_CARBON: InteractionCommand = {
  kind: "selectTarget",
  target: { kind: "paletteElement", element: "C" },
};
const TAP_CANVAS: InteractionCommand = {
  kind: "selectTarget",
  target: { kind: "empty", point: { x: 5, y: 5 } },
};
const TAP_FIRST_ATOM: InteractionCommand = {
  kind: "selectTarget",
  target: { kind: "atom", atomId: "sa1" },
};
const ADD_NAOH: InteractionCommand = {
  kind: "selectTarget",
  target: { kind: "reagentTile", reagentId: "naoh_aqueous" },
};
const TAP_SLOT_0: InteractionCommand = {
  kind: "selectTarget",
  target: { kind: "sequenceSlot", index: 0 },
};
const TAP_CANDIDATE_A: InteractionCommand = {
  kind: "selectTarget",
  target: { kind: "candidate", candidateId: "cand-a" },
};

/** A structure draft with carbon armed and two atoms already placed. */
function structureWithTwoAtoms(): ShapeDraft {
  return apply(createStructureDraft(), PICK_CARBON, TAP_CANVAS, {
    kind: "selectTarget",
    target: { kind: "empty", point: { x: 50, y: 50 } },
  });
}

/** An ordered reagents draft holding two reagents. */
function orderedReagents(): ShapeDraft {
  return apply(createReagentsDraft(true), ADD_NAOH, {
    kind: "selectTarget",
    target: { kind: "reagentTile", reagentId: "heat" },
  });
}

// ---------------------------------------------------------------------------
// One scenario per shape per report value.
// ---------------------------------------------------------------------------

interface Scenario {
  readonly shape: AnswerShape;
  readonly report: ShapeReport;
  readonly name: string;
  readonly draft: () => ShapeDraft;
  readonly command: InteractionCommand;
}

const SCENARIOS: readonly Scenario[] = [
  // --- mechanism, all six --------------------------------------------------
  {
    shape: "mechanism",
    report: "nothing",
    name: "clearing a selection there is no selection for",
    draft: mechanismDraft,
    command: { kind: "clearSelection" },
  },
  {
    shape: "mechanism",
    report: "refused",
    name: "a structure shape command arriving in the mechanism shape",
    draft: mechanismDraft,
    command: { kind: "adjustCharge", atomId: "O1", delta: 1 },
  },
  {
    shape: "mechanism",
    report: "armed",
    name: "tapping a lone pair with nothing armed",
    draft: mechanismDraft,
    command: OXYGEN_PAIR,
  },
  {
    shape: "mechanism",
    report: "disarmed",
    name: "tapping the armed lone pair a second time",
    draft: () => apply(mechanismDraft(), OXYGEN_PAIR),
    command: OXYGEN_PAIR,
  },
  {
    shape: "mechanism",
    report: "committed",
    name: "tapping the sink that completes the arrow",
    draft: () => apply(mechanismDraft(), OXYGEN_PAIR),
    command: CARBON,
  },
  {
    shape: "mechanism",
    report: "inspected",
    name: "revealing an atom's hydrogen count, which no grader reads",
    draft: mechanismDraft,
    command: CARBON_HYDROGENS,
  },
  {
    shape: "mechanism",
    report: "inspected",
    name: "switching to fishhook arrows, a mode for the NEXT arrow rather than a change to this one",
    draft: mechanismDraft,
    command: { kind: "setElectronCount", electrons: 1 },
  },
  {
    shape: "mechanism",
    report: "committed",
    name: "attaching the predicted product, which is half the answer on a predict-and-explain problem",
    draft: mechanismDraft,
    command: { kind: "setPredictedState", state: createState({ id: "p", members: [] }) },
  },

  // --- structure, five of six ----------------------------------------------
  {
    shape: "structure",
    report: "nothing",
    name: "clearing a selection on an empty canvas",
    draft: createStructureDraft,
    command: { kind: "clearSelection" },
  },
  {
    shape: "structure",
    report: "refused",
    name: "tapping the canvas with no element picked",
    draft: createStructureDraft,
    command: TAP_CANVAS,
  },
  {
    shape: "structure",
    report: "armed",
    name: "picking an element off the palette",
    draft: createStructureDraft,
    command: PICK_CARBON,
  },
  {
    shape: "structure",
    report: "disarmed",
    name: "tapping the picked element again to put it back",
    draft: () => apply(createStructureDraft(), PICK_CARBON),
    command: PICK_CARBON,
  },
  {
    shape: "structure",
    report: "disarmed",
    name: "tapping the atom armed for a bond a second time, WHILE the palette is still armed",
    draft: () => apply(structureWithTwoAtoms(), TAP_FIRST_ATOM),
    command: TAP_FIRST_ATOM,
  },
  {
    shape: "structure",
    report: "committed",
    name: "placing an atom, WHILE the palette stays armed for the next one",
    draft: () => apply(createStructureDraft(), PICK_CARBON),
    command: TAP_CANVAS,
  },
  {
    shape: "structure",
    report: "committed",
    name: "bonding the two atoms",
    draft: () => apply(structureWithTwoAtoms(), TAP_FIRST_ATOM),
    command: { kind: "selectTarget", target: { kind: "atom", atomId: "sa2" } },
  },
  {
    shape: "structure",
    report: "committed",
    name: "removing an atom, which also drops the arming that pointed at it",
    draft: () => apply(structureWithTwoAtoms(), TAP_FIRST_ATOM),
    command: { kind: "removeAtom", atomId: "sa1" },
  },

  // --- reagents, all six ---------------------------------------------------
  {
    shape: "reagents",
    report: "nothing",
    name: "asking for the order mode it is already in",
    draft: () => createReagentsDraft(false),
    command: { kind: "setReagentsOrdered", ordered: false },
  },
  {
    shape: "reagents",
    report: "refused",
    name: "adding the same reagent twice to a question that asks for a set",
    draft: () => apply(createReagentsDraft(false), ADD_NAOH),
    command: ADD_NAOH,
  },
  {
    shape: "reagents",
    report: "armed",
    name: "tapping a slot to pick the reagent up",
    draft: orderedReagents,
    command: TAP_SLOT_0,
  },
  {
    shape: "reagents",
    report: "disarmed",
    name: "tapping the same slot again to put it down where it was",
    draft: () => apply(orderedReagents(), TAP_SLOT_0),
    command: TAP_SLOT_0,
  },
  {
    shape: "reagents",
    report: "committed",
    name: "moving the armed reagent to another position",
    draft: () => apply(orderedReagents(), TAP_SLOT_0),
    command: { kind: "selectTarget", target: { kind: "sequenceSlot", index: 1 } },
  },
  {
    shape: "reagents",
    report: "inspected",
    name: "turning a set question into a sequence with nothing armed",
    draft: () => createReagentsDraft(false),
    command: { kind: "setReagentsOrdered", ordered: true },
  },
  {
    shape: "reagents",
    report: "disarmed",
    name: "the same mode switch WHILE a slot is armed, where dropping the selection outranks the flag",
    draft: () => apply(orderedReagents(), TAP_SLOT_0),
    command: { kind: "setReagentsOrdered", ordered: false },
  },

  // --- ranking, five of six ------------------------------------------------
  {
    shape: "ranking",
    report: "nothing",
    name: "choosing the reason that is already chosen",
    draft: () => apply(createRankingDraft(["cand-a", "cand-b"]), { kind: "setReason", reasonId: "r" }),
    command: { kind: "setReason", reasonId: "r" },
  },
  {
    shape: "ranking",
    report: "refused",
    name: "tapping a candidate this problem does not have",
    draft: () => createRankingDraft(["cand-a", "cand-b"]),
    command: { kind: "selectTarget", target: { kind: "candidate", candidateId: "cand-z" } },
  },
  {
    shape: "ranking",
    report: "armed",
    name: "picking a candidate up",
    draft: () => createRankingDraft(["cand-a", "cand-b"]),
    command: TAP_CANDIDATE_A,
  },
  {
    shape: "ranking",
    report: "disarmed",
    name: "putting the same candidate back down",
    draft: () => apply(createRankingDraft(["cand-a", "cand-b"]), TAP_CANDIDATE_A),
    command: TAP_CANDIDATE_A,
  },
  {
    shape: "ranking",
    report: "committed",
    name: "dropping the armed candidate into another position",
    draft: () => apply(createRankingDraft(["cand-a", "cand-b"]), TAP_CANDIDATE_A),
    command: { kind: "selectTarget", target: { kind: "candidate", candidateId: "cand-b" } },
  },
  {
    shape: "ranking",
    report: "committed",
    name: "choosing the reason the winner wins, which is half the answer on this shape",
    draft: () => createRankingDraft(["cand-a", "cand-b"]),
    command: { kind: "setReason", reasonId: "markovnikov" },
  },
];

/**
 * What each shape can say, and what it deliberately cannot.
 *
 * The absences carry the argument, because an absence is the easiest thing for a
 * later builder to fill in by accident.
 *
 * `structure` never reports `inspected`. In that shape building the molecule IS
 * the answer, so the taps that are display-only reveals in the mechanism shape
 * are real edits to real atoms here, and every one of them is a commit. Same
 * target, two modes, two meanings.
 *
 * `ranking` never reports `inspected` either, for the simpler reason that it
 * holds nothing but the answer: an order and a reason, both graded. It has no
 * display state and no mode flag.
 */
const REPORTS_BY_SHAPE: Record<AnswerShape, readonly ShapeReport[]> = {
  mechanism: ["nothing", "refused", "armed", "disarmed", "committed", "inspected"],
  structure: ["nothing", "refused", "armed", "disarmed", "committed"],
  reagents: ["nothing", "refused", "armed", "disarmed", "committed", "inspected"],
  ranking: ["nothing", "refused", "armed", "disarmed", "committed"],
};

for (const shape of ALL_ANSWER_SHAPES) {
  describe(`the ${shape} shape reports what it did`, () => {
    for (const scenario of SCENARIOS.filter((item) => item.shape === shape)) {
      it(`${scenario.report}: ${scenario.name}`, () => {
        const before = scenario.draft();
        expect(before.shape).toBe(shape);
        const outcome = applyToShape(before, scenario.command);
        expect(outcome.report).toBe(scenario.report);
      });
    }

    it("has a scenario for every report it is declared able to produce, and produces no other", () => {
      const produced = new Set(
        SCENARIOS.filter((item) => item.shape === shape).map((item) => item.report),
      );
      expect([...produced].sort()).toEqual([...REPORTS_BY_SHAPE[shape]].sort());
    });
  });
}

describe("the report registry", () => {
  it("lists every value some shape can produce, with nothing listed twice", () => {
    const declared = new Set(Object.values(REPORTS_BY_SHAPE).flat());
    expect([...declared].sort()).toEqual([...ALL_SHAPE_REPORTS].sort());
    expect(new Set(ALL_SHAPE_REPORTS).size).toBe(ALL_SHAPE_REPORTS.length);
  });
});

// ---------------------------------------------------------------------------
// The shape blind invariants, swept over everything.
// ---------------------------------------------------------------------------

/**
 * Every command kind, aimed at every shape.
 *
 * Most of these are wrong for most shapes, which is the point: a refusal is a
 * report too, and a reducer that quietly changed something while refusing would
 * be caught here rather than by whoever hits it in a session.
 */
const EVERY_COMMAND: readonly InteractionCommand[] = [
  { kind: "clearSelection" },
  { kind: "submit" },
  OXYGEN_PAIR,
  CARBON,
  CARBON_HYDROGENS,
  PICK_CARBON,
  TAP_CANVAS,
  TAP_FIRST_ATOM,
  ADD_NAOH,
  TAP_SLOT_0,
  TAP_CANDIDATE_A,
  { kind: "selectTarget", target: { kind: "unpairedElectron", atomId: "C1" } },
  { kind: "selectTarget", target: { kind: "bondBody", bondId: "bond_C1_Br1" } },
  { kind: "selectTarget", target: { kind: "bondEndHandle", bondId: "bond_C1_Br1", atomId: "C1" } },
  { kind: "selectTarget", target: { kind: "betweenAtomsSite", atomIds: ["C1", "O1"] } },
  { kind: "selectTarget", target: { kind: "reasonTile", reasonId: "markovnikov" } },
  { kind: "setElectronCount", electrons: 1 },
  { kind: "setPredictedState", state: createState({ id: "p", members: [] }) },
  { kind: "adjustCharge", atomId: "O1", delta: 1 },
  { kind: "adjustLonePairs", atomId: "sa1", delta: 1 },
  { kind: "acceptExternalStructure", state: sn2StartingState() },
  { kind: "removeAtom", atomId: "sa1" },
  { kind: "setReagentsOrdered", ordered: true },
  { kind: "removeReagentAt", index: 0 },
  { kind: "setReason", reasonId: "markovnikov" },
];

/** One draft per shape, each with something already in it to be disturbed. */
function everyShapeDraft(): readonly ShapeDraft[] {
  return [
    apply(mechanismDraft(), OXYGEN_PAIR),
    apply(structureWithTwoAtoms(), TAP_FIRST_ATOM),
    apply(orderedReagents(), TAP_SLOT_0),
    apply(createRankingDraft(["cand-a", "cand-b"]), TAP_CANDIDATE_A),
  ];
}

describe("the report never disagrees with what the draft did", () => {
  it("nothing and refused keep the same draft object; every other report replaces it", () => {
    for (const draft of everyShapeDraft()) {
      for (const command of EVERY_COMMAND) {
        const outcome = applyToShape(draft, command);
        const kept = outcome.draft === draft;
        const claimsNoChange = outcome.report === "nothing" || outcome.report === "refused";
        expect(
          { shape: draft.shape, command: command.kind, report: outcome.report, kept },
          `${draft.shape} + ${command.kind}`,
        ).toEqual({
          shape: draft.shape,
          command: command.kind,
          report: outcome.report,
          kept: claimsNoChange,
        });
      }
    }
  });

  it("anything that newly arms says armed, and anything that says armed leaves something armed", () => {
    // The exact property machine.ts's revise window turns on. Stated over every
    // reducer rather than trusted at each call site, because the whole class of
    // finding this fix closes was one call site being wrong.
    //
    // Both directions are swept, including from drafts with NOTHING armed, so a
    // reducer that arms something quietly while reporting `committed` or
    // `inspected` fails here.
    const drafts = [
      ...everyShapeDraft(),
      mechanismDraft(),
      createStructureDraft(),
      structureWithTwoAtoms(),
      createReagentsDraft(false),
      orderedReagents(),
      createRankingDraft(["cand-a", "cand-b"]),
    ];
    let newlyArmed = 0;
    let reportedArmed = 0;
    for (const draft of drafts) {
      for (const command of EVERY_COMMAND) {
        const outcome = applyToShape(draft, command);
        const armedBefore = hasSelection(draft);
        const armedAfter = hasSelection(outcome.draft);
        const where = `${draft.shape} + ${command.kind}`;

        if (!armedBefore && armedAfter) {
          newlyArmed += 1;
          expect(outcome.report, `${where} armed something and must say so`).toBe("armed");
        }
        if (outcome.report === "armed") {
          reportedArmed += 1;
          expect(armedAfter, `${where} reported armed with nothing armed`).toBe(true);
        }
      }
    }

    // A sweep whose interesting arms never fire is a test that passes by not
    // running. Both counters are asserted rather than assumed.
    expect(newlyArmed).toBeGreaterThan(0);
    expect(reportedArmed).toBeGreaterThan(0);
  });
});

// ---------------------------------------------------------------------------
// The report as the machine sees it.
// ---------------------------------------------------------------------------

describe("Transition.report", () => {
  it("carries the reducer's own word through a tap, a drag press and a drag release", () => {
    const d = new Driver(createMechanismDraft(sn2StartingState()), sn2Targets());

    expect(d.down(P.oxygenLonePair).report).toBe("armed");
    // A move applies no command at all.
    expect(d.move(P.carbonAtom).report).toBeNull();
    expect(d.up(P.carbonAtom).report).toBe("committed");
  });

  it("is null for every event that ran no shape reducer", () => {
    const d = new Driver(createMechanismDraft(sn2StartingState()), sn2Targets());

    // A release with no matching press.
    expect(d.up(P.nowhere).report).toBeNull();
    // A second pointer, ignored while an owner is live.
    d.down(P.oxygenLonePair, { pointerId: 1 });
    expect(d.down(P.carbonAtom, { pointerId: 2 }).report).toBeNull();
    expect(d.cancel(P.oxygenLonePair, { pointerId: 1 }).report).toBeNull();
    expect(d.background().report).toBeNull();
  });

  it("is null for the document operations no shape has an opinion on", () => {
    const d = new Driver(createMechanismDraft(sn2StartingState()), sn2Targets());

    // An undo can put back an arming or take back an arrow, and machine.ts will
    // not guess which. Null says "do not ask a shape about this" rather than
    // inventing an answer, which is the habit the whole field exists to break.
    d.tap(P.oxygenAtom);
    expect(d.send({ kind: "command", command: { kind: "undo" } }).report).toBeNull();
    expect(d.send({ kind: "command", command: { kind: "undo" } }).report).toBeNull();
    expect(
      d.send({
        kind: "command",
        command: { kind: "setShape", draft: createReagentsDraft(false) },
      }).report,
    ).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// installRefusalFor, the other half of the pass four fix.
// ---------------------------------------------------------------------------

describe("which drafts may be installed", () => {
  it("passes every shape whose state is clean, including the two that carry no state at all", () => {
    // reagents and ranking hold opaque ids this package never resolves against
    // chemistry, so there is nothing for a duplicate id to be duplicated in.
    for (const draft of [
      mechanismDraft(),
      createStructureDraft(),
      createReagentsDraft(true),
      createRankingDraft(["cand-a"]),
    ]) {
      const d = new Driver(createReagentsDraft(false), []);
      d.send({ kind: "command", command: { kind: "setShape", draft } });
      expect(d.notices, `${draft.shape} should install cleanly`).toEqual([]);
      expect(d.state.doc.draft).toBe(draft);
    }
  });

  it("refuses a structure draft carrying the same atom id in two species", () => {
    // The structure shape reaches this through a restore just as the mechanism
    // shape does, and acceptExternalStructure's guard covers only the live
    // handover, which is the same one-entry-point mistake one level along.
    const clean = createStructureDraft();
    const duplicated = applyToShape(clean, {
      kind: "acceptExternalStructure",
      state: sn2StartingState(),
    }).draft;
    // A structure state whose two species share an atom id, built by handing the
    // same species in twice under different member ids.
    const shared = createState({
      id: "shared-ids",
      members: [
        { species: sn2StartingState().members[0]!.species, role: "product" },
        { species: sn2StartingState().members[0]!.species, role: "product" },
      ],
    });
    const bad: ShapeDraft = Object.freeze({
      ...(duplicated as Extract<ShapeDraft, { shape: "structure" }>),
      state: shared,
    });

    const d = new Driver(createStructureDraft(), []);
    d.send({ kind: "command", command: { kind: "setShape", draft: bad } });

    const refusal = d.notices.find((n) => n.id === "restored_draft_duplicate_atom_ids");
    expect(refusal?.detail).toContain("the structure");
    // One id, named in the singular. The species shared here holds one atom.
    expect(refusal?.detail).toContain("atom id O1 ");
    expect(d.state.doc.draft).not.toBe(bad);
  });

  it("names every duplicated id, in the plural, so the refusal is actionable rather than a count", () => {
    // The same construction with a two atom species, so both ids collide. The
    // singular and plural wordings are the two halves of a sentence
    // packages/feedback will key on, and a refusal that names one id when two
    // are wrong sends someone to fix half a problem.
    const substrate = sn2StartingState().members[1]!.species;
    const shared = createState({
      id: "shared-ids-plural",
      members: [
        { species: substrate, role: "product" },
        { species: substrate, role: "product" },
      ],
    });
    const bad: ShapeDraft = Object.freeze({ ...createStructureDraft(), state: shared });

    const d = new Driver(createStructureDraft(), []);
    d.send({ kind: "command", command: { kind: "setShape", draft: bad } });

    const refusal = d.notices.find((n) => n.id === "restored_draft_duplicate_atom_ids");
    expect(refusal?.detail).toContain("atom ids C1, Br1 ");
    expect(d.state.doc.draft).not.toBe(bad);
  });
});
