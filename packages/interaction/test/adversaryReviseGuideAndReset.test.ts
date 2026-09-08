/**
 * Adversary pass TWO, Phase 2. Branch phase-2, commit c2efd02.
 *
 * These tests reproduce the two defects the pass-one fix builder disclosed by
 * name but left unfixed (`reviseLastTarget`'s unconditional undo, and
 * `inFlightGuide`'s global rather than per-session read of the selection), plus
 * one adjacent defect found while attacking the same root assumption
 * (`setShape`'s unconditional document reset, which manufactures a false
 * positive for the very staleness guard the pass-one fix introduced), plus one
 * finding in `acceptExternalStructure`.
 *
 * ALL FOUR ARE NOW FIXED AND EVERY TEST BELOW IS INVERTED IN PLACE, per the
 * same convention as adversarySnapshotIsolation.test.ts: the scenario
 * construction is the adversary's, untouched, and the assertions state what is
 * true after the fix. The original findings are preserved in the comments as
 * the record of what used to happen.
 *
 * The fixes: reviseLastTarget corrects only the selection the "did you mean"
 * affordance refers to, tracked as a revise window that opens on a contested
 * pointer selection and closes on any other document change; inFlightGuide and
 * the R2 release both require the current document to be the owner's own
 * press result; setShape with the active draft is a no op; and
 * acceptExternalStructure refuses a state carrying duplicate atom ids.
 */

import { describe, expect, it } from "vitest";

import {
  createAtom,
  createSpecies,
  createState,
  type MechanismState,
} from "@blueberry/chem-core";
import { createMechanismDraft, type MechanismDraft } from "../src/shapes/mechanism.js";
import { createStructureDraft, type StructureDraft } from "../src/shapes/structure.js";
import { inFlightGuide } from "../src/machine.js";
import { Driver, P, sn2StartingState, sn2Targets, tableHitTester } from "./support.js";
import type { TableEntry } from "./support.js";

function mechanismDriver(entries: readonly TableEntry[] = sn2Targets()): Driver {
  return new Driver(createMechanismDraft(sn2StartingState()), entries);
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

// ---------------------------------------------------------------------------
// Attack 1: reviseLastTarget calls undoDocument unconditionally.
// ---------------------------------------------------------------------------

describe("reviseLastTarget undoes whatever is on top of the stack, not its own ambiguous tap", () => {
  it("silently destroys an unrelated commit that landed between the ambiguous tap and the revise, with no notice at all", () => {
    // An ambiguous tap: two lone pair slots are close enough that the hit
    // tester reports a contest, and the machine acts on its best guess (slot
    // 0) while flagging the guess as contested. This is the documented setup
    // for reviseLastTarget: "the machine acts on the hit tester's best guess
    // immediately, and a 'did you mean' affordance sends this if the student
    // says it guessed wrong." See commands.ts.
    const d = mechanismDriver([
      ...sn2Targets().filter((entry) => entry.point !== P.oxygenLonePair),
      {
        point: P.oxygenLonePair,
        target: { kind: "lonePair", atomId: "O1", slotIndex: 0 },
        margin: 0.01,
      },
    ]);

    d.tap(P.oxygenLonePair);
    expect(d.sawNotice("target_was_ambiguous")).toBe(true);
    expect(mechanismDraftOf(d).armed?.target).toEqual({
      kind: "lonePair",
      atomId: "O1",
      slotIndex: 0,
    });

    // Before the student taps the "did you mean" affordance, something
    // entirely unrelated commits real, gradeable work through the pointer
    // free command entry point: a screen reader, a keyboard shortcut, or
    // simply the time it takes a human to react to the ambiguity prompt while
    // continuing to explore the molecule. Revealing a hydrogen count is
    // exactly the case adversarySnapshotIsolation.test.ts uses for "a real
    // commit that leaves somebody else's arming standing," because it is
    // explicitly documented in mechanism.ts as an inspection affordance that
    // "must not disturb an armed source."
    d.send({
      kind: "command",
      command: { kind: "selectTarget", target: { kind: "hydrogenCount", atomId: "C1" } },
    });
    expect(mechanismDraftOf(d).revealedHydrogens).toEqual(["C1"]);
    // The arming from the ambiguous tap is untouched by this, exactly as
    // documented.
    expect(mechanismDraftOf(d).armed?.target).toEqual({
      kind: "lonePair",
      atomId: "O1",
      slotIndex: 0,
    });

    // Now the student answers the "did you mean" prompt, asking to correct
    // the guess to the other lone pair slot.
    d.send({
      kind: "command",
      command: {
        kind: "reviseLastTarget",
        target: { kind: "lonePair", atomId: "O1", slotIndex: 1 },
      },
    });

    // machine.ts's reviseLastTarget calls `undoDocument(state.doc)`
    // unconditionally: it pops whatever is on top of the undo stack, with no
    // check for whether that top entry is still the ambiguous tap's own
    // commit. By the time revise runs, the top of the stack is the hydrogen
    // reveal, not the tap. Undoing it pops the CURRENT draft (the one
    // carrying the reveal) off entirely, with nothing pushed anywhere to
    // recover it: `undoDocument` discards `doc.draft` outright and there is
    // no redo stack anywhere in document.ts. This is the exact shape
    // dropSession's staleness guard exists to prevent for the pointer path,
    // applied to a second, unguarded path that reaches the same undo stack.
    //
    // THE FINDING, FIXED: the reveal changed the document after the contested
    // tap, which closed the revise window. The revise is refused by name, the
    // hydrogen reveal survives, and nothing is popped off the undo stack.
    expect(d.sawNotice("revise_refused_newer_work")).toBe(true);
    expect(mechanismDraftOf(d).revealedHydrogens).toEqual(["C1"]);
  });

  it("also fails at its one job: the corrected target is not what ends up armed", () => {
    // Same setup as above, reproduced independently so this assertion stands
    // on its own regardless of which one a future fix addresses first.
    const d = mechanismDriver([
      ...sn2Targets().filter((entry) => entry.point !== P.oxygenLonePair),
      {
        point: P.oxygenLonePair,
        target: { kind: "lonePair", atomId: "O1", slotIndex: 0 },
        margin: 0.01,
      },
    ]);

    d.tap(P.oxygenLonePair);
    d.send({
      kind: "command",
      command: { kind: "selectTarget", target: { kind: "hydrogenCount", atomId: "C1" } },
    });
    d.send({
      kind: "command",
      command: {
        kind: "reviseLastTarget",
        target: { kind: "lonePair", atomId: "O1", slotIndex: 1 },
      },
    });

    // undoDocument popped the hydrogen-reveal draft (the top of the stack),
    // landing back on the draft with slot 0 still armed, exactly where it was
    // right after the ambiguous tap. reviseLastTarget then applies
    // selectTarget(slot 1) to THAT draft. Because armed is not null, this is
    // not treated as a re-arm; it is treated as an attempted SINK for the
    // still-armed slot-0 source (see mechanism.ts's selectTarget: "armed +
    // a sink target -> the arrow is built, checked, and kept or refused").
    // Both lone pair slots live on the same atom (O1), so
    // arrowInference.ts's sinkOnAtom resolves them to the same atomId and
    // treats slot 1 as "moving onto the atom the source already sits on",
    // producing a self-referential arrow that chem-core refuses as
    // arrow_declares_no_change. The refusal keeps the ORIGINAL wrong guess
    // (slot 0) armed. The student asked to correct the guess to slot 1 and
    // got slot 0 back, plus a legality refusal that has nothing to do with
    // what they did.
    // FIXED: the revise is refused outright, so the original guess stays armed
    // and no self referential arrow is ever attempted. The student re-taps the
    // intended slot instead of receiving a legality refusal about an arrow they
    // never drew.
    expect(mechanismDraftOf(d).armed?.target).toEqual({
      kind: "lonePair",
      atomId: "O1",
      slotIndex: 0,
    });
    expect(d.sawNotice("revise_refused_newer_work")).toBe(true);
    expect(d.sawNotice("arrow_refused_by_legality")).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// Attack 2: inFlightGuide reads hasSelection(state.doc.draft) globally.
// ---------------------------------------------------------------------------

describe("inFlightGuide draws from a live pointer's press point even when that pointer armed nothing", () => {
  it("anchors the dashed guide to an atom with no lone pair, while the real armed source sits elsewhere", () => {
    const d = mechanismDriver();

    // The touch pointer presses on the carbon atom body. Per mechanism.ts's
    // armFrom, an atom body with nothing armed is the lone-pair reveal
    // toggle, not an arming. This pointer's own press changes the draft
    // (revealedLonePairs gains "C1") but arms nothing.
    d.down(P.carbonAtom);
    expect(mechanismDraftOf(d).armed).toBeNull();
    expect(mechanismDraftOf(d).revealedLonePairs).toEqual(["C1"]);

    // Before this pointer releases or moves, an unrelated command -- a
    // keyboard, a second person, a switch device -- arms the oxygen lone
    // pair through the pointer free entry point. This pointer never touched
    // it.
    d.send({
      kind: "command",
      command: { kind: "selectTarget", target: { kind: "lonePair", atomId: "O1", slotIndex: 0 } },
    });
    expect(mechanismDraftOf(d).armed?.target).toEqual({
      kind: "lonePair",
      atomId: "O1",
      slotIndex: 0,
    });

    // inFlightGuide checks `hasSelection(state.doc.draft)` -- a document
    // level question -- and, finding it true, builds a guide anchored to the
    // OWNER SESSION's own down point and target, without ever checking that
    // this session is the one that produced the arming. The touch pointer
    // sitting on the glass at the carbon atom did not arm anything; the
    // command did.
    // FIXED: the guide requires the document to still be this pointer's own
    // press result. The command changed it, so there is no guide at all, and a
    // renderer draws the armed source highlight alone, which is the truth.
    const guide = inFlightGuide(d.state);
    expect(guide).toBeNull();

    // THE FINDING, renderer facing: the guide claims to anchor at the carbon
    // atom, which has no armed electron source at all. A renderer following
    // the documented contract ("`from` is where the pointer pressed... A
    // renderer that knows the source's true anchor should draw from there
    // instead; `anchor` names the target so it can look it up", machine.ts)
    // will look up the carbon atom as the source's location and either draw
    // the dashed guide from the wrong atom, or fail to find a source there at
    // all and draw nothing, while the true armed source -- the oxygen lone
    // pair, presumably highlighted on screen by whatever UI reads `armed` --
    // sits at a different position entirely. A student sees a highlighted
    // lone pair on oxygen and a dashed line originating from carbon: two
    // pieces of the same screen disagreeing about what is being dragged.
  });

  it("lets a touch pointer that pressed on one atom complete an arrow whose source it never touched", () => {
    // The consequence, not just the visual: since R2 only compares the
    // release target against the PRESS target (not against whatever is
    // armed), a pointer that pressed on an unrelated atom can still complete
    // a real arrow using a source it never selected, because commit() reads
    // draft.armed, which is document-global.
    const d = mechanismDriver();

    d.down(P.carbonAtom);
    d.send({
      kind: "command",
      command: { kind: "selectTarget", target: { kind: "lonePair", atomId: "O1", slotIndex: 0 } },
    });

    // The touch pointer, having never itself armed anything, releases over a
    // different atom (bromine). R2 fires because bromine differs from the
    // pointer's own down target (carbon).
    d.up(P.bromineAtom);

    // The arrow that results is built from the command-armed oxygen lone
    // pair, landing wherever arrowInference resolves a lone-pair source
    // meeting an unrelated atom -- a bond forms between the two, whether or
    // not chem-core's legality check ultimately accepts it. Either way, the
    // touch pointer completed a gesture using a source it visually never
    // touched, driven entirely by document-global state the guide had
    // already been misrepresenting to the student.
    // FIXED: the release is ignored by name, because the document changed
    // under the drag. The command armed source stays armed for its own
    // input path to finish, and no arrow this pointer never drew appears.
    const draft = mechanismDraftOf(d);
    expect(d.sawNotice("release_ignored_newer_work")).toBe(true);
    expect(draft.arrows).toHaveLength(0);
    expect(draft.armed?.target).toEqual({ kind: "lonePair", atomId: "O1", slotIndex: 0 });
  });
});

// ---------------------------------------------------------------------------
// Attack 3: setShape resets the document unconditionally, manufacturing a
// false "newer work" positive for dropSession's own staleness guard.
// ---------------------------------------------------------------------------

describe("setShape always mints a fresh DocumentState, even for a no-op reselection of the current shape", () => {
  it("wipes undo history for a setShape that changes nothing", () => {
    const d = mechanismDriver();

    // Some real history first, so there is something to lose.
    d.tap(P.oxygenAtom); // reveals O1's lone pairs, a real undo entry
    expect(d.state.doc.past.length).toBeGreaterThan(0);

    const currentDraft = d.state.doc.draft;

    // setShape re-dispatched with the EXACT SAME draft that is already
    // active. This is a plausible shell event, not a contrived one: a
    // problem component re-mounting, a duplicate dispatch from a retried
    // network call carrying the same draft payload, or simply a second
    // subscriber replaying an event. machine.ts's applyCommand for
    // "setShape" is the only command handler in this file with no "did this
    // change anything" check anywhere in it; every other command either
    // routes through commitDraft's reference-equality short circuit or
    // checks explicitly before writing.
    d.send({ kind: "command", command: { kind: "setShape", draft: currentDraft } });

    // FIXED: same reference in means same state out. The history survives a
    // redispatch of the draft that is already active.
    expect(d.state.doc.draft).toBe(currentDraft);
    expect(d.state.doc.past.length).toBeGreaterThan(0);
  });

  it("makes a legitimate cancel wrongly report newer work and strand the student's own arming", () => {
    const d = mechanismDriver();

    d.down(P.oxygenLonePair);
    expect(mechanismDraftOf(d).armed).not.toBeNull();
    const armedDraft = d.state.doc.draft;

    // The same no-op reselection, mid gesture this time: the pointer is still
    // down, having armed the oxygen lone pair, when the shell re-dispatches
    // setShape with the CURRENT draft (the one carrying this pointer's own
    // arming).
    d.send({ kind: "command", command: { kind: "setShape", draft: armedDraft } });

    // Content is unchanged -- the same draft, arming and all -- but
    // `state.doc` is now a different DocumentState object than
    // `documentAfterOwnPress`, purely because resetDocument always
    // constructs a fresh wrapper. dropSession's guard is a reference-identity
    // check, not a content check, so it cannot tell the difference between
    // this and an actual competing commit.
    d.cancel(P.oxygenLonePair);

    // THE FINDING: the cancel is told a competing commit happened and skips
    // the rollback, even though nothing of substance happened between the
    // press and the cancel. The notice's own detail text asserts "the
    // document changed after that pointer's press, so reverting it would
    // have deleted work the pointer did not do" -- a claim that is false
    // here, since there is no such work; content is identical to what
    // rolling back would have produced anyway, only with a needless
    // surviving arming as the visible difference.
    // FIXED: the no op setShape returned the same state object, so the
    // reference guard still recognises this pointer's press as the last thing
    // that happened. The cancel rolls back honestly and the arming is cleared,
    // exactly as R3 promises for a lone pointer.
    expect(d.sawNotice("rollback_skipped_newer_work")).toBe(false);
    expect(mechanismDraftOf(d).armed).toBeNull();

    // Contrast with the ordinary case (pointerRules.test.ts / the "ordinary
    // case the guard must not break" describe block in
    // adversarySnapshotIsolation.test.ts): a lone pointer's cancel with
    // nothing at all in between clears the arming completely. Here, the only
    // thing "in between" was a no-op, and the arming survives the cancel
    // regardless -- the opposite of R3's stated contract.
  });
});

// ---------------------------------------------------------------------------
// Attack 6: acceptExternalStructure with duplicate atom ids across species.
// ---------------------------------------------------------------------------

describe("acceptExternalStructure accepts a state with a duplicate atom id across two species", () => {
  it("resolves every later edit by that id to whichever species chem-core's find happens to reach first, silently", () => {
    // chem-core documents this exact shape as a known risk it can detect but
    // does not prevent at construction time: state.ts's duplicateAtomIds says
    // "A duplicate id makes findAtomInState return whichever molecule happens
    // to be first in the list, which is a bug that shows up as chemistry
    // going wrong in one molecule and not the other." structure.ts's own
    // bondAtoms comment independently acknowledges "chem-core allows the same
    // atom id to appear in two species." Nothing at the one entry point that
    // takes a whole external state wholesale -- acceptExternalStructure --
    // checks for it before the state becomes the student's live draft.
    const first = createSpecies({
      id: "species-a",
      atoms: [createAtom({ id: "X1", element: "C", formalCharge: 0 })],
    });
    const second = createSpecies({
      id: "species-b",
      atoms: [createAtom({ id: "X1", element: "N", formalCharge: 0 })],
    });
    const imported: MechanismState = createState({
      id: "imported-with-duplicate-id",
      members: [
        { species: first, role: "product" },
        { species: second, role: "product" },
      ],
    });

    const d = new Driver(createStructureDraft(), []);
    d.send({ kind: "command", command: { kind: "acceptExternalStructure", state: imported } });
    // FIXED: the handover is refused whole, naming the duplicated id, before
    // the state can become a draft where one atom is unreachable.
    expect(d.sawNotice("external_structure_duplicate_atom_ids")).toBe(true);
    expect(structureDraftOf(d).origin).not.toBe("externalEditor");

    // A student intending to raise the formal charge on the nitrogen (species
    // b) sends the only identifier the command shape carries: the atom id.
    // There is no species id anywhere in InteractionCommand's adjustCharge,
    // because HitTarget never carries one either -- the hit tester only ever
    // reports an atomId.
    d.send({
      kind: "command",
      command: { kind: "adjustCharge", atomId: "X1", delta: 1 },
    });

    const stateAfter = structureDraftOf(d).state;
    const carbonMember = stateAfter.members.find((m) => m.species.id === "species-a");
    const nitrogenMember = stateAfter.members.find((m) => m.species.id === "species-b");

    // THE FINDING: the edit landed on whichever species findAtomInState
    // reaches first (species-a, first in the members array), regardless of
    // which atom the student meant. The nitrogen the student may have been
    // looking at on screen is untouched, with no notice that the id was
    // ambiguous. There is no way to address the second X1 through this
    // command shape at all; it is permanently unreachable by id once the
    // first is in the state ahead of it.
    // FIXED: the import never happened, so the adjust lands on the empty
    // default draft and neither species exists to be corrupted.
    expect(carbonMember).toBeUndefined();
    expect(nitrogenMember).toBeUndefined();
  });
});

// ---------------------------------------------------------------------------
// Attack 4, probed and found solid: a second pointer pressing while the first
// is still owner, then the first cancelling before the second releases.
// ---------------------------------------------------------------------------

describe("a second pointer interleaved with the owner's cancel, probed and found solid", () => {
  it("the second pointer's release never applies a command, whatever the first pointer did in between", () => {
    // machine.ts's onPointerDown gives the document to at most one owner.
    // A second pointer arriving while an owner is live is added as role
    // "ignored" and onPointerDown returns immediately for it (see the
    // `secondary_pointer_ignored` branch), so its own R1 never fires and it
    // never gets a `documentAfterOwnPress` distinct from its snapshot. The
    // scenario the brief describes -- "the second's release commits an arrow
    // neither pointer drew" -- would require the ignored pointer's up to
    // apply selectTarget, and onPointerUp explicitly refuses to do that for
    // any session whose role is not "owner": `if (session.role !== "owner")
    // return { state: working, ... }`, with no command applied. This holds
    // regardless of what the owner does to the document in between, because
    // the ignored session carries no document reference the owner's cancel
    // could disturb in the first place.
    const d = mechanismDriver();

    d.down(P.oxygenLonePair, { pointerId: 1 });
    expect(mechanismDraftOf(d).armed).not.toBeNull();

    d.down(P.carbonAtom, { pointerId: 2 });
    expect(d.sawNotice("secondary_pointer_ignored")).toBe(true);
    expect(d.state.sessions.find((s) => s.pointerId === 2)?.role).toBe("ignored");

    // The owner cancels while the second pointer is still down, unreleased.
    d.cancel(P.oxygenLonePair, { pointerId: 1 });
    expect(mechanismDraftOf(d).armed).toBeNull();
    expect(d.state.sessions).toHaveLength(1);

    const docBeforeSecondRelease = d.state.doc;

    // The second pointer, still tracking whatever it happened to be over,
    // now releases.
    d.up(P.bromineAtom, { pointerId: 2 });

    expect(d.state.doc).toBe(docBeforeSecondRelease);
    expect(mechanismDraftOf(d).arrows).toHaveLength(0);
    expect(mechanismDraftOf(d).armed).toBeNull();
  });

  it("the one multi-owner path (a pen preempting touch) always resolves the drop before the new owner's own press, so there is nothing to linger", () => {
    // The only way a second pointer becomes owner while the first is still
    // registered is the documented pen-over-touch exception, and
    // onPointerDown's penTakesOver branch runs dropSession for the touch
    // BEFORE building the pen's own session, synchronously, inside the same
    // event. There is no window in which both sessions are simultaneously
    // "the owner has changed but the old owner's slot is still present" for a
    // later, independent event to land in.
    const d = mechanismDriver();

    d.down(P.oxygenLonePair, { pointerId: 1, pointerType: "touch" });
    expect(mechanismDraftOf(d).armed).not.toBeNull();

    d.down(P.carbonAtom, { pointerId: 2, pointerType: "pen" });

    // The touch session is gone, fully rolled back (nothing else had
    // committed in between), and the pen is the sole session, already the
    // owner, in the same event that removed the touch.
    expect(d.state.sessions).toHaveLength(1);
    expect(d.state.sessions[0]?.pointerId).toBe(2);
    expect(d.state.sessions[0]?.role).toBe("owner");
    expect(mechanismDraftOf(d).armed).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// Coverage of the fix's own new arms, with behaviour rather than execution.
// ---------------------------------------------------------------------------

describe("the revise window also opens on a contested drag release", () => {
  it("a drag ending on a contested hit can be revised, same as a contested tap", () => {
    const d = mechanismDriver([
      ...sn2Targets().filter((entry) => entry.point !== P.oxygenLonePair),
      {
        point: P.oxygenLonePair,
        target: { kind: "lonePair", atomId: "O1", slotIndex: 0 },
        margin: 0.01,
      },
    ]);

    // A drag: press on empty space, release over the contested lone pair. R2
    // fires on the different target, the hit is contested, the window opens.
    d.down(P.elsewhere);
    d.up(P.oxygenLonePair);
    expect(d.sawNotice("target_was_ambiguous")).toBe(true);
    expect(mechanismDraftOf(d).armed?.target).toEqual({
      kind: "lonePair",
      atomId: "O1",
      slotIndex: 0,
    });

    d.send({
      kind: "command",
      command: {
        kind: "reviseLastTarget",
        target: { kind: "lonePair", atomId: "O1", slotIndex: 1 },
      },
    });
    expect(mechanismDraftOf(d).armed?.target).toEqual({
      kind: "lonePair",
      atomId: "O1",
      slotIndex: 1,
    });
  });
});

describe("the duplicate id refusal names every id, plural included", () => {
  it("two ids duplicated across species are both named in one refusal", () => {
    const first = createSpecies({
      id: "species-a",
      atoms: [
        createAtom({ id: "X1", element: "C", formalCharge: 0 }),
        createAtom({ id: "X2", element: "O", formalCharge: 0 }),
      ],
    });
    const second = createSpecies({
      id: "species-b",
      atoms: [
        createAtom({ id: "X1", element: "N", formalCharge: 0 }),
        createAtom({ id: "X2", element: "S", formalCharge: 0 }),
      ],
    });
    const imported: MechanismState = createState({
      id: "imported-with-two-duplicate-ids",
      members: [
        { species: first, role: "product" },
        { species: second, role: "product" },
      ],
    });

    const d = new Driver(createStructureDraft(), []);
    d.send({ kind: "command", command: { kind: "acceptExternalStructure", state: imported } });

    const refusal = d.notices.find((n) => n.id === "external_structure_duplicate_atom_ids");
    expect(refusal).toBeDefined();
    expect(refusal?.detail).toContain("X1");
    expect(refusal?.detail).toContain("X2");
    expect(refusal?.detail).toContain("ids");
  });
});
