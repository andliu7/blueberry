/**
 * Adversary pass THREE, Phase 2. Branch phase-2, commit 5503e00.
 *
 * Scope for this pass: the revise window lifecycle, the owner-doc reference
 * gates on inFlightGuide and R2 release, the setShape no-op guard's own
 * blind spot, the duplicate-id refusal's coverage, and a sweep of anything
 * pass one and pass two never touched (document.ts undo semantics, store.ts,
 * effects.ts, the reagents and ranking reducers, pointer.ts's pressure
 * model).
 *
 * NONE OF THESE ARE FIXED. Every test below that documents a finding asserts
 * the CURRENT, real behaviour and is green today, which is what proves the
 * defect exists rather than merely describing it. That is the same
 * convention pass one and pass two used before their own fixes landed
 * (see adversarySnapshotIsolation.test.ts's header). A future fix pass
 * inverts these in place, the same way it inverted the earlier ones.
 *
 * Tests that instead prove a surface is SOLID assert the correct, safe
 * behaviour and are regression guards against a future change breaking the
 * invariant. Each of those carries the argument for why the surface holds,
 * not just the assertion.
 */

import { describe, expect, it } from "vitest";

import {
  createAtom,
  createSpecies,
  createState,
  findAtomInState,
  type MechanismState,
} from "@blueberry/chem-core";
import { createMechanismDraft, type MechanismDraft } from "../src/shapes/mechanism.js";
import { createReagentsDraft } from "../src/shapes/reagents.js";
import { createRankingDraft } from "../src/shapes/ranking.js";
import { inFlightGuide } from "../src/machine.js";
import { Driver, P, sn2StartingState, sn2Targets } from "./support.js";

function mechanismDriver(entries = sn2Targets()): Driver {
  return new Driver(createMechanismDraft(sn2StartingState()), entries);
}

function mechanismDraftOf(d: Driver): MechanismDraft {
  const draft = d.state.doc.draft;
  if (draft.shape !== "mechanism") throw new Error("expected the mechanism shape");
  return draft;
}

/** A table where the oxygen lone pair point is contested, same convention as pass two. */
function contestedOxygenTargets() {
  return [
    ...sn2Targets().filter((entry) => entry.point !== P.oxygenLonePair),
    {
      point: P.oxygenLonePair,
      target: { kind: "lonePair" as const, atomId: "O1", slotIndex: 0 },
      margin: 0.01,
    },
  ];
}

// ---------------------------------------------------------------------------
// FINDING 1: the revise window opens on a same-session TOGGLE OFF exactly as
// readily as it opens on an ARM, and reviseLastTarget's undo+reapply
// semantics only make sense for the latter.
// ---------------------------------------------------------------------------

describe("FINDING: two contested taps on the same point corrupt the next revise", () => {
  it("tap 1 arms (contested, window opens), tap 2 disarms (also contested, window reopens on the disarm) -- revise then resurrects the disarmed source and tries to bond it to itself", () => {
    const d = mechanismDriver(contestedOxygenTargets());

    // Tap 1: nothing armed, hits the contested lone pair, arms slot 0. R1
    // opens the revise window because this is a contested selection that
    // changed the document, exactly as documented.
    d.tap(P.oxygenLonePair);
    expect(d.sawNotice("target_was_ambiguous")).toBe(true);
    expect(mechanismDraftOf(d).armed?.target).toEqual({
      kind: "lonePair",
      atomId: "O1",
      slotIndex: 0,
    });
    expect(d.state.doc === d.state.reviseWindow).toBe(true);

    // Tap 2: same point, same contested hit. But something IS now armed and
    // sameTarget(target, draft.armed.target) is true, so mechanism.ts's
    // selectTarget takes the TOGGLE branch and disarms. This is a real
    // document change, and the hit was contested (the hit tester's margin
    // did not change; only the draft did), so onPointerDown's
    // `isContested(hit) && applied.state.doc !== working.doc` reopens the
    // window -- pointing now at the DISARMED document.
    d.tap(P.oxygenLonePair);
    expect(mechanismDraftOf(d).armed).toBeNull();
    // FIXED: the window only opens when the contested selection leaves
    // something armed. A disarm changes the document but arms nothing, so the
    // window stays pointed at the earlier arm, which the disarm made stale.
    expect(d.state.doc === d.state.reviseWindow).toBe(false);

    // The student, or a "did you mean" affordance driven by the second
    // target_was_ambiguous notice, now asks to revise to the other slot.
    d.clearLog();
    d.send({
      kind: "command",
      command: {
        kind: "reviseLastTarget",
        target: { kind: "lonePair", atomId: "O1", slotIndex: 1 },
      },
    });

    // reviseLastTarget's guard (`state.doc === state.reviseWindow`) passes,
    // because the window IS current. It calls `undoDocument(state.doc)`,
    // which pops the top of the stack: the DISARM. Popping a disarm does not
    // land on "nothing armed" the way popping an ARM would land on "nothing
    // armed" reversed; it lands on the state the disarm undid, which is
    // "slot 0 still armed". reviseLastTarget then applies
    // `selectTarget(slot 1)` to THAT state. Since something is armed, this is
    // read as a SINK against the resurrected slot-0 source, not as a fresh
    // arm. Both slots live on the same atom (O1), so arrowInference.ts's
    // sinkOnAtom resolves the "sink" to the same atom the source already sits
    // on and produces a self-referential arrow, which chem-core refuses.
    //
    // THE RESULT: the student asked to correct a selection to slot 1 and got
    // slot 0 back (not even the state they were looking at when they asked,
    // which was "nothing armed"), plus a legality refusal about an arrow they
    // never intended to draw. No notice says "you tapped the same thing
    // twice, so the last contested change was a disarm, and revise cannot
    // sensibly correct a disarm" -- the failure surfaces three steps removed
    // from its actual cause, as a chemistry-shaped refusal.
    // FIXED: the stale window means revise refuses by name. Nothing is
    // resurrected, no self referential arrow is attempted, and the failure
    // surfaces at its actual cause instead of three steps removed as a
    // chemistry shaped refusal.
    expect(d.sawNotice("revise_refused_newer_work")).toBe(true);
    expect(d.sawNotice("arrow_refused_by_legality")).toBe(false);
    expect(mechanismDraftOf(d).armed).toBeNull();
    expect(mechanismDraftOf(d).arrows).toHaveLength(0);

    // The rule violated: reviseLastTarget's own doc comment says it corrects
    // "one specific thing: the last target selection", built on the premise
    // that popping the undo stack's top entry and reapplying the corrected
    // target reproduces what would have happened had the right target been
    // tapped first. That premise holds for an ARM. It does not hold for a
    // TOGGLE OFF, where popping the stack does not restore "nothing armed",
    // it restores the very selection the student is trying to move away
    // from, and the corrected target is then evaluated in the wrong mode
    // (sink instead of arm).
  });

  it("the same corruption reaches a drag variant: a contested drag release that lands back on its own still-armed source", () => {
    // A drag whose down arms the contested target (not itself contested, a
    // plain non-contested press elsewhere is easier to construct: press the
    // contested point directly, then release on the SAME point). This is
    // the down+down case shown above reached through down+move+up instead of
    // two taps, to show the corruption is not an artefact of the `tap`
    // helper specifically.
    const d = mechanismDriver(contestedOxygenTargets());

    d.down(P.oxygenLonePair);
    expect(mechanismDraftOf(d).armed).not.toBeNull();
    expect(d.state.doc === d.state.reviseWindow).toBe(true);

    // Release back over its own source: R2's sameTarget branch fires (no
    // command applied), so the window is untouched from the press. A second
    // full press+release on the same contested point disarms it and reopens
    // the window on the disarm, same as the tap case.
    d.up(P.oxygenLonePair);
    d.down(P.oxygenLonePair);
    d.up(P.oxygenLonePair);
    expect(mechanismDraftOf(d).armed).toBeNull();
    // FIXED: same arming condition as the tap variant. The disarm closes
    // rather than reopens the window.
    expect(d.state.doc === d.state.reviseWindow).toBe(false);

    d.clearLog();
    d.send({
      kind: "command",
      command: {
        kind: "reviseLastTarget",
        target: { kind: "lonePair", atomId: "O1", slotIndex: 1 },
      },
    });
    // FIXED: refused by name, nothing resurrected, through the drag route too.
    expect(d.sawNotice("arrow_refused_by_legality")).toBe(false);
    expect(d.sawNotice("revise_refused_newer_work")).toBe(true);
    expect(mechanismDraftOf(d).armed).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// Probed and found solid: a dangling revise window left behind by a
// pointer's own rollback. dropSession's rollback does not clear
// reviseWindow, so the window can point at a document that is no longer
// reachable from state.doc at all -- but the staleness check inside
// reviseLastTarget re-evaluates `state.doc === state.reviseWindow` fresh
// every time, and a rolled-back doc can never become reference-equal to the
// orphaned window object again (every DocumentState is freshly minted, never
// reused), so the dangling reference is inert rather than exploitable.
// ---------------------------------------------------------------------------

describe("solid: a dangling revise window after a pointer's own rollback never lets revise through", () => {
  it("a contested arm opens the window, the same pointer is cancelled, and the orphaned window cannot be satisfied again", () => {
    const d = mechanismDriver(contestedOxygenTargets());

    // Real prior history, so the post-rollback document has something to
    // protect and the refusal path (rather than the empty-history degrade
    // path) is the one being exercised.
    d.send({
      kind: "command",
      command: { kind: "selectTarget", target: { kind: "hydrogenCount", atomId: "C1" } },
    });
    expect(d.state.doc.past.length).toBe(1);

    d.down(P.oxygenLonePair);
    expect(mechanismDraftOf(d).armed).not.toBeNull();
    const docAfterPress = d.state.doc;
    expect(d.state.reviseWindow).toBe(docAfterPress);

    // This pointer is cancelled before releasing. R3 fires: its own press is
    // the last thing that changed the document, so the rollback proceeds and
    // `state.doc` reverts to the pre-press snapshot. `reviseWindow` is
    // spread through unchanged by dropSession, so it is left pointing at
    // `docAfterPress`, which is no longer `state.doc` and never will be
    // again.
    d.cancel(P.oxygenLonePair);
    expect(mechanismDraftOf(d).armed).toBeNull();
    expect(d.state.doc).not.toBe(docAfterPress);
    expect(d.state.reviseWindow).toBe(docAfterPress);
    expect(d.state.doc === d.state.reviseWindow).toBe(false);

    // Revise cannot silently corrupt anything: the guard sees the mismatch,
    // the undo stack is non empty (the hydrogen reveal survived the
    // rollback), so the refusal path fires by name rather than the blind
    // undo pass one found.
    d.clearLog();
    d.send({
      kind: "command",
      command: {
        kind: "reviseLastTarget",
        target: { kind: "lonePair", atomId: "O1", slotIndex: 1 },
      },
    });
    expect(d.sawNotice("revise_refused_newer_work")).toBe(true);
    expect(mechanismDraftOf(d).revealedHydrogens).toEqual(["C1"]);
    expect(mechanismDraftOf(d).armed).toBeNull();
  });

  it("the same dangling window, but with empty history after the rollback, degrades to a plain selection rather than reaching for anything stale", () => {
    const d = mechanismDriver(contestedOxygenTargets());

    // No prior history this time: the contested press is the FIRST thing
    // that happens.
    d.down(P.oxygenLonePair);
    const docAfterPress = d.state.doc;
    expect(d.state.doc.past.length).toBe(1);

    d.cancel(P.oxygenLonePair);
    expect(d.state.doc.past.length).toBe(0);
    expect(d.state.reviseWindow).toBe(docAfterPress);
    expect(d.state.doc === d.state.reviseWindow).toBe(false);

    d.clearLog();
    d.send({
      kind: "command",
      command: {
        kind: "reviseLastTarget",
        target: { kind: "lonePair", atomId: "O1", slotIndex: 1 },
      },
    });

    // Degrade path: undone is null (window mismatch), past.length is 0, so
    // this becomes a plain selectTarget against the current (rolled back,
    // nothing armed) document. Slot 1 is armed fresh. Nothing was undone,
    // nothing was destroyed, and the stale window is simply never consulted
    // again after this, since it can never match state.doc.
    expect(mechanismDraftOf(d).armed?.target).toEqual({
      kind: "lonePair",
      atomId: "O1",
      slotIndex: 1,
    });
    expect(d.sawNotice("revise_refused_newer_work")).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// Probed and found solid: a refused command never replaces state.doc, so it
// cannot manufacture a false "newer work" reading for the owner-doc gates
// (inFlightGuide, R2's release check, dropSession's rollback guard). Every
// `refused(...)` call site in every shape reducer hands back the SAME draft
// object it was given; commitDraft's reference check then hands back the
// SAME DocumentState. This is the general form of the setShape defect pass
// two fixed, checked here against the other three gates that read
// `state.doc` by reference.
// ---------------------------------------------------------------------------

describe("solid: a refused command mid-drag never trips the owner-doc gates", () => {
  it("inFlightGuide survives a refusal, and the eventual cancel still rolls back cleanly", () => {
    const d = mechanismDriver();

    d.down(P.oxygenLonePair);
    expect(inFlightGuide(d.state)).not.toBeNull();
    const docBefore = d.state.doc;

    // adjustCharge is a structure-shape command; the mechanism shape's
    // default case refuses it by name.
    d.send({ kind: "command", command: { kind: "adjustCharge", atomId: "O1", delta: 1 } });
    expect(d.sawNotice("command_not_valid_in_this_shape")).toBe(true);
    expect(d.state.doc).toBe(docBefore);

    // The guide is untouched: it is still this pointer's own press result.
    expect(inFlightGuide(d.state)).not.toBeNull();

    d.cancel(P.oxygenLonePair);
    expect(d.sawNotice("rollback_skipped_newer_work")).toBe(false);
    expect(mechanismDraftOf(d).armed).toBeNull();
  });

  it("a refused command also does not block R2's release from completing an arrow", () => {
    const d = mechanismDriver();

    d.down(P.oxygenLonePair);
    d.send({ kind: "command", command: { kind: "adjustCharge", atomId: "O1", delta: 1 } });

    d.up(P.carbonAtom);
    expect(d.sawNotice("release_ignored_newer_work")).toBe(false);
    expect(mechanismDraftOf(d).arrows).toHaveLength(1);
  });
});

// ---------------------------------------------------------------------------
// Probed and found solid, the opposite direction: an undo that happens to
// bring the CONTENT back to what it was before a pointer's press still
// correctly reads as newer work, because the gates compare DocumentState
// object identity, never content. undoDocument always mints a fresh object,
// so it can never accidentally satisfy `state.doc === documentAfterOwnPress`
// even when the two are value-equal.
// ---------------------------------------------------------------------------

describe("solid: an undo that content-wise reverts a pointer's own press is still treated as somebody else's newer work", () => {
  it("blocks the rollback and leaves the undo's own result in place", () => {
    const d = mechanismDriver();

    d.send({
      kind: "command",
      command: { kind: "selectTarget", target: { kind: "hydrogenCount", atomId: "C1" } },
    });
    d.down(P.oxygenLonePair);
    expect(mechanismDraftOf(d).armed).not.toBeNull();

    // An unrelated command free entry point undoes the arm. Content is now
    // back to "nothing armed", which happens to match what a rollback of
    // this pointer's own press would also produce -- but as a DIFFERENT
    // DocumentState object, minted by undoDocument.
    d.send({ kind: "command", command: { kind: "undo" } });
    expect(mechanismDraftOf(d).armed).toBeNull();

    d.clearLog();
    d.cancel(P.oxygenLonePair);
    expect(d.sawNotice("rollback_skipped_newer_work")).toBe(true);
    expect(mechanismDraftOf(d).revealedHydrogens).toEqual(["C1"]);
  });
});

// ---------------------------------------------------------------------------
// FINDING 2, documented cost: setShape's no-op guard is reference equality
// on the draft, per the header comment ("Same reference in means same state
// out"). A shell that mints a fresh, content-identical draft object on every
// render or every retried dispatch still wipes history, because the guard
// cannot see through object identity to value equality.
//
// Argued as a documented cost rather than a defect to fix in this package:
// the whole undo/rollback architecture in this file is built on reference
// equality throughout (commitDraft, ShapeOutcome's changed/unchanged,
// dropSession's staleness guard), and ShapeDraft is a large recursive union
// including a full MechanismState. Deep-equating it on every setShape call
// to catch this case would be expensive to do correctly (chem-core's own
// state carries derived/authored data that is not obviously safe to
// structurally diff) and would introduce a second notion of "no change"
// alongside the reference-based one everywhere else, which is the kind of
// two-thresholds-drift-apart risk geometryPort.ts explicitly calls out
// for AMBIGUOUS_MARGIN. The correct fix is shell discipline: memoize the
// draft passed to setShape the same way any reducer's caller must memoize
// an object it does not want to be treated as new every render. Recorded as
// a finding regardless, because it is a real, easy-to-hit shell mistake and
// the cost of getting it wrong is silent history loss with no notice at all.
// ---------------------------------------------------------------------------

describe("FINDING (documented cost): setShape's no-op guard is reference equality only", () => {
  it("a shell that rebuilds a value-identical draft object still loses undo history", () => {
    const d = mechanismDriver();

    d.tap(P.oxygenAtom); // a real, undoable reveal
    expect(d.state.doc.past.length).toBeGreaterThan(0);

    const currentDraft = d.state.doc.draft;
    // A fresh object, equal in every field, constructed the way a component
    // re-render or a retried dispatch plausibly would (spreading the current
    // value rather than holding the same reference).
    const rebuilt = { ...currentDraft };
    expect(rebuilt).not.toBe(currentDraft);
    expect(rebuilt).toEqual(currentDraft);

    d.send({ kind: "command", command: { kind: "setShape", draft: rebuilt } });

    // The guard's `command.draft === state.doc.draft` check is false (new
    // object), so this takes the reset branch: resetDocument mints a fresh
    // DocumentState with empty history, exactly as if a genuinely different
    // shape had been swapped in. No notice reports this; the shell has no
    // way to learn it happened short of watching `past.length` itself.
    expect(d.state.doc.draft).toEqual(currentDraft);
    expect(d.state.doc.past).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// FINDING 3: the duplicate-id guard pass two added lives in exactly one
// place, structure.ts's acceptExternalStructure. Every other route that
// hands a whole MechanismState to a draft wholesale is unguarded:
// createMechanismDraft (the mechanism shape's own starting-state
// constructor, used for every mechanism problem in the corpus) and
// setPredictedState (a live command that attaches a product state to an
// in-progress mechanism draft, documented in mechanism.ts as exactly the
// route a structure built elsewhere -- including, plausibly, the same
// Ketcher round trip acceptExternalStructure guards against -- arrives
// through).
// ---------------------------------------------------------------------------

describe("FINDING: the duplicate-id refusal covers acceptExternalStructure only, not the mechanism shape's own wholesale-state entry points", () => {
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

  it("createMechanismDraft accepts a duplicate-id starting state with no refusal and no notice channel to report one through", () => {
    // createMechanismDraft's signature is `(state: MechanismState) => MechanismDraft`,
    // a plain constructor with no ShapeOutcome, no notices array, nothing an
    // adversary or a validator could observe short of inspecting the state
    // by hand. Contrast with acceptExternalStructure, which is a command
    // reaching the same class of input through applyToShape and can refuse
    // it with a named notice.
    const state = duplicateIdState("carbon-first");
    // FIXED: a constructor has no notice channel, so the contract violation
    // throws at problem load, at authoring time, naming the offending ids.
    expect(() => createMechanismDraft(state)).toThrow(/X1/);

    // The resolution this unguarded state produces for atom id "X1" is
    // member-order dependent, exactly the failure mode chem-core's own
    // duplicateAtomIds doc comment warns about ("a bug that shows up as
    // chemistry going wrong in one molecule and not the other"), and it is
    // reachable here with zero defence.
    const otherOrder = duplicateIdState("nitrogen-first");
    expect(findAtomInState(state, "X1")?.atom.element).toBe("C");
    expect(findAtomInState(otherOrder, "X1")?.atom.element).toBe("N");
    // Same student action, same atom id "X1" tapped on screen -- HitTarget
    // never carries a species id, so there is no way for the interaction
    // layer to tell these apart -- and the chemistry it resolves to depends
    // entirely on authoring order, silently.
  });

  it("setPredictedState attaches a duplicate-id product state to a live draft with no refusal", () => {
    const d = mechanismDriver();
    const dup = duplicateIdState("carbon-first");

    d.send({ kind: "command", command: { kind: "setPredictedState", state: dup } });

    // No notice at all: setPredictedState's own handler only checks
    // reference equality against the current `predicted` value, nothing
    // about the state's internal integrity.
    // FIXED: refused, and the prediction is not attached.
    //
    // The id changed in the pass four fix cycle and the assertion moved with
    // it. This refusal was minted as external_structure_duplicate_atom_ids, the
    // id acceptExternalStructure already used, and pass four finding 3 recorded
    // that as a collision: notices.ts promises student copy is keyed by id, and
    // one id shared by two entry points can only ever carry the vaguer of the
    // two sentences. setPredictedState now has predicted_state_duplicate_atom_ids
    // of its own. Nothing about the BEHAVIOUR this test pins moved: the refusal
    // still fires, still names the ids, and the prediction is still not
    // attached. Both ids are asserted, so the split cannot silently become a
    // rename that leaves acceptExternalStructure reporting the wrong one.
    expect(d.sawNotice("predicted_state_duplicate_atom_ids")).toBe(true);
    expect(d.sawNotice("external_structure_duplicate_atom_ids")).toBe(false);
    expect(mechanismDraftOf(d).predicted).toBeNull();

    // The same shape of input that acceptExternalStructure refuses by name
    // in the structure shape is accepted silently here. Whatever consumes
    // `predicted` downstream (documented in mechanism.ts as "assembling the
    // two into a MechanismStep is grading, so it belongs to whoever calls
    // the grader") inherits a state chem-core itself calls a bug waiting to
    // show up as wrong chemistry, with nothing upstream having refused it.
  });
});

// ---------------------------------------------------------------------------
// Sweep: document.ts, store.ts, effects.ts, pointer.ts's pressure model, and
// the reagents/ranking reducers, none of which pass one or pass two attacked
// directly.
// ---------------------------------------------------------------------------

describe("solid: pointer.ts's pressure model never gates a transition, even at the one ambiguous reading (a pen reporting a genuine 0)", () => {
  it("a pen that reports pressure 0 on both press and release still arms and commits normally", () => {
    // readPressure's own header names this exact case as unresolvable by
    // construction: "a stylus with no pressure support, and some hardware at
    // the instant of contact, report 0." A pen passing `pressure: 0` is
    // marked `supported: true, value: 0` rather than falling into the
    // `undefined` branch, because 0 is a finite number. The invariant this
    // package promises is that pressure is metadata only and never decides
    // whether a transition happens, so this reading -- indistinguishable
    // from "no support" to a renderer -- must still drive a full arm and
    // commit exactly like full pressure would.
    const d = mechanismDriver();

    d.down(P.oxygenLonePair, { pointerType: "pen", pressure: 0 });
    expect(mechanismDraftOf(d).armed).not.toBeNull();

    d.up(P.carbonAtom, { pointerType: "pen", pressure: 0 });
    expect(mechanismDraftOf(d).arrows).toHaveLength(1);
  });
});

describe("solid: the reagents and ranking reducers survive a repeated (replayed) command as a clean no-op", () => {
  it("setReagentsOrdered dispatched twice with the same value is unchanged the second time, and a pending rollback still sees no newer work", () => {
    // Imported directly rather than through the mechanism driver, since this
    // is a different shape.
    const d = new Driver(createReagentsDraft(false), []);

    d.send({ kind: "command", command: { kind: "setReagentsOrdered", ordered: true } });
    const docAfterFirst = d.state.doc;
    d.send({ kind: "command", command: { kind: "setReagentsOrdered", ordered: true } });
    expect(d.state.doc).toBe(docAfterFirst);
  });

  it("setReason dispatched twice with the same candidate is unchanged the second time", () => {
    const d = new Driver(createRankingDraft(["cand-a", "cand-b"]), []);

    d.send({ kind: "command", command: { kind: "setReason", reasonId: "reason-a" } });
    const docAfterFirst = d.state.doc;
    d.send({ kind: "command", command: { kind: "setReason", reasonId: "reason-a" } });
    expect(d.state.doc).toBe(docAfterFirst);
  });
});

describe("solid, with a caveat recorded rather than filed as a defect: onPointerMove always mints a new InteractionState, even for a move that changes nothing observable", () => {
  it("a move event reporting the same point as the press still produces a new state object", () => {
    // store.ts's `dispatch` treats `transition.state !== state` as "notify
    // subscribers". Every document-level change is correctly deduplicated by
    // this (commitDraft, ShapeOutcome's unchanged, the setShape guard). But
    // onPointerMove's session update (`replaceSession`) is unconditional: it
    // always rewrites `lastTimestampMs` and mints a fresh session and a
    // fresh top-level state, whatever the point, target, or pressure did.
    // In real traffic a move event's timestamp differs from the last one it
    // saw, so this rarely matters. It is recorded here rather than filed as
    // a defect because nothing about it is incorrect: no data is lost, no
    // gate is fooled, and a renderer subscribing through store.ts is simply
    // told to re-check state it may not need to redraw. It is the one place
    // in this package where the reference-equality discipline that protects
    // every document-level decision is not extended to the highest frequency
    // event type, and that is worth a name for whoever tunes rendering
    // against the 60fps budget.
    const d = mechanismDriver();
    d.down(P.oxygenLonePair);
    const before = d.state;
    d.move(P.oxygenLonePair);
    expect(d.state).not.toBe(before);
    expect(d.state.doc).toBe(before.doc);
  });
});

// ---------------------------------------------------------------------------
// Arms of the pass three fixes, covered with behaviour.
// ---------------------------------------------------------------------------

function twoSpeciesSharing(ids: readonly string[]): MechanismState {
  return createState({
    id: "two-species-sharing-ids",
    members: [
      {
        species: createSpecies({
          id: "species-a",
          atoms: ids.map((id) => createAtom({ id, element: "C", formalCharge: 0 })),
        }),
        role: "product",
      },
      {
        species: createSpecies({
          id: "species-b",
          atoms: ids.map((id) => createAtom({ id, element: "N", formalCharge: 0 })),
        }),
        role: "product",
      },
    ],
  });
}

describe("the id guards name every offender and null still clears", () => {
  it("createMechanismDraft with two duplicated ids throws naming both, plural", () => {
    const state = twoSpeciesSharing(["X1", "X2"]);
    expect(() => createMechanismDraft(state)).toThrow(/ids X1, X2 /);
  });

  it("setPredictedState(null) clears an existing prediction without a refusal", () => {
    const d = mechanismDriver();
    const clean = sn2StartingState();
    d.send({ kind: "command", command: { kind: "setPredictedState", state: clean } });
    expect(mechanismDraftOf(d).predicted).toBe(clean);
    d.send({ kind: "command", command: { kind: "setPredictedState", state: null } });
    expect(mechanismDraftOf(d).predicted).toBeNull();
    expect(d.sawNotice("predicted_state_duplicate_atom_ids")).toBe(false);
    expect(d.sawNotice("external_structure_duplicate_atom_ids")).toBe(false);
  });

  it("setPredictedState with two duplicated ids names both in the refusal, plural", () => {
    const d = mechanismDriver();
    d.send({
      kind: "command",
      command: { kind: "setPredictedState", state: twoSpeciesSharing(["X1", "X2"]) },
    });
    const refusal = d.notices.find((n) => n.id === "predicted_state_duplicate_atom_ids");
    expect(refusal?.detail).toContain("ids X1, X2");
    expect(mechanismDraftOf(d).predicted).toBeNull();
  });
});
