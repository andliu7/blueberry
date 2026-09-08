/**
 * The predict the product answer shape: the student supplies a structure.
 *
 * Graded, from Phase 3, by canonical structure equivalence through Indigo on the
 * lazy editor routes. Nothing in this file grades anything; it only builds the
 * structure the grader will be handed.
 *
 * The same arm and commit pattern the mechanism shape uses drives it:
 *
 *   palette element tapped, then empty canvas tapped   ->  an atom is placed
 *   atom tapped, then another atom tapped              ->  they are bonded
 *   atom tapped, then the same atom tapped             ->  the selection is dropped
 *   a bond tapped                                      ->  its order cycles 1, 2, 3
 *
 * No gesture in that list is a drag, which is the whole point.
 *
 * TWO WAYS A STRUCTURE ARRIVES.
 *
 * A student on a phone builds it here, tap by tap. A student on a laptop may
 * instead use Ketcher on a lazy route, which returns a whole structure at once
 * through `acceptExternalStructure`. `origin` records which happened, because a
 * structure that came from Ketcher has been through Indigo's sanitiser and one
 * built here has not, and a grader may reasonably care.
 *
 * WHY NOTHING IN THIS FILE EVER REPORTS `inspected`.
 *
 * `inspected` is for a change to the document that a grader never reads: the
 * mechanism shape's lone pair and hydrogen reveals are display state, held only
 * so they survive a cancelled drag. In THIS shape, building the molecule is the
 * answer, so the same taps edit real counts on real atoms and every one of them
 * is a commit. Same target, two modes, two meanings, which is the whole argument
 * for shapes being modes. shapeReports.test.ts pins the absence so it stays a
 * decision rather than an oversight.
 *
 * SCREEN POSITIONS LIVE HERE AND NOWHERE IN CHEM-CORE.
 *
 * chem-core's `Point3` is molecular geometry in angstroms and answers questions
 * like an E2 dihedral. Where a student put an atom on a canvas is neither of
 * those. It is student authored layout, so it is part of the draft, and the
 * renderer decides what it looks like.
 */

import {
  createAtom,
  duplicateAtomIds,
  createBond,
  createSpecies,
  createState,
  findAtomInState,
  findBondBetween,
  findBondInState,
  withAddedBond,
  withAtomPatch,
  withBondOrder,
  withMember,
  withoutAtom,
  withoutMember,
  withReplacedSpecies,
  type AtomId,
  type BondOrder,
  type Element,
  type MechanismState,
  type Species,
} from "@blueberry/chem-core";
import type { InteractionCommand } from "../commands.js";
import { haptic } from "../effects.js";
import { notice } from "../notices.js";
import type { Point2 } from "../pointer.js";
import type { HitTarget } from "../targets.js";
import { changed, emitted, refused, unchanged, type ShapeOutcome } from "./outcome.js";

/** Where an atom sits on the canvas. Layout, not chemistry. */
export interface AtomPlacement {
  readonly atomId: AtomId;
  readonly point: Point2;
}

/** How many implicit hydrogens the tap cycle runs through before wrapping. */
export const MAX_IMPLICIT_HYDROGENS = 4;

export interface StructureDraft {
  readonly shape: "structure";
  readonly state: MechanismState;
  readonly placements: readonly AtomPlacement[];
  /** The element the next placement uses. Null means no element is armed. */
  readonly palette: Element | null;
  /** The first half of a bond, waiting for its second atom. */
  readonly pendingBondFrom: AtomId | null;
  readonly origin: "canvas" | "externalEditor";
  readonly nextNumber: number;
}

export function createStructureDraft(stateId = "student-structure"): StructureDraft {
  return Object.freeze({
    shape: "structure" as const,
    state: createState({ id: stateId, members: [] }),
    placements: Object.freeze([]),
    palette: null,
    pendingBondFrom: null,
    origin: "canvas" as const,
    nextNumber: 1,
  });
}

export function applyToStructure(
  draft: StructureDraft,
  command: InteractionCommand,
): ShapeOutcome<StructureDraft> {
  switch (command.kind) {
    case "selectTarget":
      return selectTarget(draft, command.target);

    case "clearSelection":
      if (draft.palette === null && draft.pendingBondFrom === null) return unchanged(draft);
      return changed(
        Object.freeze({ ...draft, palette: null, pendingBondFrom: null }),
        "disarmed",
      );

    case "adjustCharge":
      return patchAtomCount(draft, command.atomId, "formalCharge", command.delta, -4, 4);

    case "adjustLonePairs":
      return patchAtomCount(draft, command.atomId, "lonePairs", command.delta, 0, 4);

    case "removeAtom":
      return removeAtom(draft, command.atomId);

    case "acceptExternalStructure": {
      // The one entry point that takes a whole state wholesale, from a Ketcher
      // round trip. Every editing command in this shape resolves atoms by id
      // alone, because HitTarget never reports a species. A state carrying the
      // same atom id in two species would make one of them permanently
      // unreachable, with each edit silently landing on whichever species is
      // found first. Refused whole, naming the ids, rather than accepted into
      // that condition.
      const duplicated = duplicateAtomIds(command.state);
      if (duplicated.length > 0) {
        return refused(draft, [
          notice(
            "external_structure_duplicate_atom_ids",
            "refused",
            `the external structure carries atom id${duplicated.length === 1 ? "" : "s"} ${duplicated.join(", ")} in more than one species, so edits by id would be ambiguous. Fix the ids in the editor and hand it over again`,
          ),
        ]);
      }
      return changed(
        Object.freeze({
          ...draft,
          state: command.state,
          // Layout came with the external editor, not from taps here.
          placements: Object.freeze([]),
          pendingBondFrom: null,
          origin: "externalEditor" as const,
        }),
        "committed",
      );
    }

    case "submit":
      return emitted(draft, [{ kind: "submitAttempt", draft }]);

    default:
      return refused(draft, [
        notice(
          "command_not_valid_in_this_shape",
          "refused",
          `${command.kind} does nothing in the structure shape`,
        ),
      ]);
  }
}

function selectTarget(draft: StructureDraft, target: HitTarget): ShapeOutcome<StructureDraft> {
  switch (target.kind) {
    case "paletteElement":
      if (draft.palette === target.element) {
        return changed(Object.freeze({ ...draft, palette: null }), "disarmed");
      }
      return changed(Object.freeze({ ...draft, palette: target.element }), "armed", [
        haptic("selection"),
      ]);

    case "empty":
      return placeAtom(draft, target.point);

    case "atom":
      return bondStep(draft, target.atomId);

    case "bondEndHandle":
    case "bondBody":
      return cycleBondOrder(draft, target.bondId);

    case "lonePair":
      // Tapping a drawn pair takes it away. Adding one is `adjustLonePairs`,
      // because there is nothing on screen to tap for a pair that is not there.
      return patchAtomCount(draft, target.atomId, "lonePairs", -1, 0, 4);

    case "hydrogenCount":
      return cycleImplicitHydrogens(draft, target.atomId);

    case "unpairedElectron":
      return toggleRadical(draft, target.atomId);

    default:
      return refused(draft, [
        notice(
          "target_not_valid_in_this_shape",
          "refused",
          `${target.kind} belongs to another answer shape`,
          { target },
        ),
      ]);
  }
}

/**
 * The first number from the counter onward whose minted ids collide with nothing
 * in the state.
 *
 * `nextNumber` is plain draft data, and a restored session can carry a stale one:
 * a JSON round trip defaulting a missing field, or an offline replay snapshotting
 * the state while restarting the counter. Trusting it made `placeAtom` hand
 * chem-core a colliding species id, and chem-core's `withMember` THROWS on that,
 * uncaught, straight out of `reduce()` and a shell's event handler. Found by the
 * Phase 2 verification pass, which also showed `installRefusalFor` cannot catch
 * it: the collision is latent in the counter, not present in the state at
 * install time. So the counter is a hint and the state is the authority, which
 * is the same reducers-guard-rather-than-throw discipline the rest of this file
 * already follows.
 */
function freeNumber(draft: StructureDraft): number {
  let n = draft.nextNumber;
  const taken = (candidate: number): boolean => {
    const atomId = `sa${candidate}`;
    const speciesId = `ss${candidate}`;
    const bondId = `sb${candidate}`;
    return draft.state.members.some(
      (member) =>
        member.species.id === speciesId ||
        member.species.atoms.some((atom) => atom.id === atomId) ||
        member.species.bonds.some((bond) => bond.id === bondId),
    );
  };
  while (taken(n)) n += 1;
  return n;
}

function placeAtom(draft: StructureDraft, point: Point2): ShapeOutcome<StructureDraft> {
  const element = draft.palette;
  if (element === null) {
    return refused(draft, [
      notice(
        "no_element_selected",
        "refused",
        "pick an element from the palette before tapping the canvas",
      ),
    ]);
  }

  const mint = freeNumber(draft);
  const atomId = `sa${mint}`;
  const speciesId = `ss${mint}`;
  const species = createSpecies({ id: speciesId, atoms: [createAtom({ id: atomId, element })] });

  // The palette stays armed on purpose, so a student can place five carbons with
  // five taps. It was armed by an EARLIER command though, so this one reports
  // what it itself did, which is commit an atom. That distinction is the whole
  // pass four finding 1 fix: the report is about the act, not about which fields
  // happen to be set afterwards.
  return changed(
    Object.freeze({
      ...draft,
      state: withMember(draft.state, { species, role: "product" }),
      placements: Object.freeze([...draft.placements, { atomId, point }]),
      nextNumber: mint + 1,
    }),
    "committed",
    [haptic("commit")],
  );
}

function bondStep(draft: StructureDraft, atomId: AtomId): ShapeOutcome<StructureDraft> {
  if (findAtomInState(draft.state, atomId) === undefined) {
    return refused(draft, [
      notice("atom_not_in_structure", "refused", `${atomId} is not in this structure`),
    ]);
  }

  if (draft.pendingBondFrom === null) {
    return changed(Object.freeze({ ...draft, pendingBondFrom: atomId }), "armed", [
      haptic("selection"),
    ]);
  }

  if (draft.pendingBondFrom === atomId) {
    // A disarm, and it says so even while `palette` is still armed. Under the
    // old hasSelection reading the palette made this look like an arming and
    // reopened the revise window on it. See adversaryPassFour.test.ts.
    return changed(Object.freeze({ ...draft, pendingBondFrom: null }), "disarmed");
  }

  return bondAtoms(draft, draft.pendingBondFrom, atomId);
}

function bondAtoms(
  draft: StructureDraft,
  fromAtomId: AtomId,
  toAtomId: AtomId,
): ShapeOutcome<StructureDraft> {
  const from = findAtomInState(draft.state, fromAtomId);
  const to = findAtomInState(draft.state, toAtomId);
  if (from === undefined || to === undefined) {
    return refused(draft, [
      notice("atom_not_in_structure", "refused", "one end of that bond is not in this structure"),
    ]);
  }

  // Already bonded: raise the order instead of adding a second bond between the
  // same pair, which is not a thing that exists.
  //
  // The question is asked of `from.species` alone, and it used to be asked twice:
  // `atomsAreBonded(draft.state, ...)` over the WHOLE state first, then
  // `findBondBetween(from.species, ...)` inside it. Two questions, two scopes, and
  // the inner miss was a branch nothing could reach in practice. chem-core allows
  // the same atom id to appear in two species, so the two scopes are genuinely
  // different, and the species the atoms were RESOLVED in is the only one this
  // reducer may edit. One question, asked once, of the species being edited.
  const existing = findBondBetween(from.species, fromAtomId, toAtomId);
  if (existing !== undefined) {
    const raised = nextOrder(existing.order);
    return changed(
      Object.freeze({
        ...draft,
        state: withReplacedSpecies(draft.state, withBondOrder(from.species, existing.id, raised)),
        pendingBondFrom: null,
      }),
      "committed",
      [haptic("commit")],
      [
        notice(
          "bond_order_cycled_instead_of_added",
          "info",
          `${fromAtomId} and ${toAtomId} were already bonded, so the order became ${raised}`,
        ),
      ],
    );
  }

  const bondMint = freeNumber(draft);
  const bond = createBond({ id: `sb${bondMint}`, a: fromAtomId, b: toAtomId, order: 1 });

  // Same molecule: just add the bond.
  if (from.species.id === to.species.id) {
    return changed(
      Object.freeze({
        ...draft,
        state: withReplacedSpecies(draft.state, withAddedBond(from.species, bond)),
        pendingBondFrom: null,
        nextNumber: bondMint + 1,
      }),
      "committed",
      [haptic("commit")],
    );
  }

  // Two separate molecules become one. A Species is a single connected molecule,
  // so joining two of them is a merge, not an added bond, and the second member
  // has to leave the state or its atoms would be counted twice.
  const merged: Species = createSpecies({
    id: from.species.id,
    atoms: [...from.species.atoms, ...to.species.atoms],
    bonds: [...from.species.bonds, ...to.species.bonds, bond],
  });
  const withoutSecond = withoutMember(draft.state, to.species.id);
  return changed(
    Object.freeze({
      ...draft,
      state: withReplacedSpecies(withoutSecond, merged),
      pendingBondFrom: null,
      nextNumber: bondMint + 1,
    }),
    "committed",
    [haptic("commit")],
  );
}

function cycleBondOrder(draft: StructureDraft, bondId: string): ShapeOutcome<StructureDraft> {
  const found = findBondInState(draft.state, bondId);
  if (found === undefined) {
    return refused(draft, [
      notice("atom_not_in_structure", "refused", `bond ${bondId} is not in this structure`),
    ]);
  }
  const order = nextOrder(found.bond.order);
  return changed(
    Object.freeze({
      ...draft,
      state: withReplacedSpecies(draft.state, withBondOrder(found.species, bondId, order)),
    }),
    "committed",
    [haptic("commit")],
  );
}

function nextOrder(order: BondOrder): BondOrder {
  if (order === 1) return 2;
  if (order === 2) return 3;
  return 1;
}

function cycleImplicitHydrogens(
  draft: StructureDraft,
  atomId: AtomId,
): ShapeOutcome<StructureDraft> {
  const found = findAtomInState(draft.state, atomId);
  if (found === undefined) {
    return refused(draft, [
      notice("atom_not_in_structure", "refused", `${atomId} is not in this structure`),
    ]);
  }
  const next = (found.atom.implicitHydrogens + 1) % (MAX_IMPLICIT_HYDROGENS + 1);
  return changed(
    Object.freeze({
      ...draft,
      state: withReplacedSpecies(
        draft.state,
        withAtomPatch(found.species, atomId, { implicitHydrogens: next }),
      ),
    }),
    "committed",
    [haptic("commit")],
  );
}

function toggleRadical(draft: StructureDraft, atomId: AtomId): ShapeOutcome<StructureDraft> {
  const found = findAtomInState(draft.state, atomId);
  if (found === undefined) {
    return refused(draft, [
      notice("atom_not_in_structure", "refused", `${atomId} is not in this structure`),
    ]);
  }
  const next = found.atom.unpairedElectrons > 0 ? 0 : 1;
  return changed(
    Object.freeze({
      ...draft,
      state: withReplacedSpecies(
        draft.state,
        withAtomPatch(found.species, atomId, { unpairedElectrons: next }),
      ),
    }),
    "committed",
  );
}

function patchAtomCount(
  draft: StructureDraft,
  atomId: AtomId,
  field: "formalCharge" | "lonePairs",
  delta: number,
  min: number,
  max: number,
): ShapeOutcome<StructureDraft> {
  const found = findAtomInState(draft.state, atomId);
  if (found === undefined) {
    return refused(draft, [
      notice("atom_not_in_structure", "refused", `${atomId} is not in this structure`),
    ]);
  }
  const current = field === "formalCharge" ? found.atom.formalCharge : found.atom.lonePairs;
  const next = Math.min(max, Math.max(min, current + delta));
  if (next === current) return unchanged(draft);

  const patch = field === "formalCharge" ? { formalCharge: next } : { lonePairs: next };
  return changed(
    Object.freeze({
      ...draft,
      state: withReplacedSpecies(draft.state, withAtomPatch(found.species, atomId, patch)),
    }),
    "committed",
  );
}

function removeAtom(draft: StructureDraft, atomId: AtomId): ShapeOutcome<StructureDraft> {
  const found = findAtomInState(draft.state, atomId);
  if (found === undefined) {
    return refused(draft, [
      notice("atom_not_in_structure", "refused", `${atomId} is not in this structure`),
    ]);
  }
  const remaining = withoutAtom(found.species, atomId);
  // KNOWN GAP, reported rather than half fixed: removing an atom from the middle
  // of a chain can leave one Species holding two disconnected fragments, which
  // breaks the "a Species is one connected molecule" rule. chem-core can detect
  // it with `connectedComponentCount`; splitting the fragments back into separate
  // members is real work and belongs with whoever owns the structure editor UI.
  // A species with no atoms left is not an empty molecule, it is no molecule.
  const state =
    remaining.atoms.length === 0
      ? withoutMember(draft.state, found.species.id)
      : withReplacedSpecies(draft.state, remaining);

  // Removing the atom that was armed for a bond drops that arming too, so this
  // is the compound case argued in outcome.ts. `committed` wins the precedence:
  // the answer changed, and the arming it took with it was for a bond to an atom
  // that no longer exists.
  return changed(
    Object.freeze({
      ...draft,
      state,
      placements: Object.freeze(draft.placements.filter((p) => p.atomId !== atomId)),
      pendingBondFrom: draft.pendingBondFrom === atomId ? null : draft.pendingBondFrom,
    }),
    "committed",
  );
}
