/**
 * StepScene: everything a renderer needs to draw one mechanism step animating
 * from its `from` state to its `to` state, precomputed once, pure data.
 *
 * Pure TypeScript, no React. Both renderers (SVG and three) consume this same
 * structure; that is the renderer contract holding, not a coincidence.
 *
 * Why matching works the way it does:
 *   - Atoms match by id. chem-core's ids.ts makes atom id stability across a
 *     step an invariant, so an atom present in both states is the same nucleus
 *     and its position simply interpolates.
 *   - Bonds match by unordered atom pair, not by bond id. Bond ids are NOT
 *     stable across a step (the fixture corpus renumbers them), but a bond is
 *     physically "the connection between these two nuclei", and that is the
 *     pair. A pair in both states persists; only in `from` is breaking; only
 *     in `to` is forming.
 */

import type {
  AtomId,
  ElectronFlowArrow,
  MechanismStep,
  SpeciesRole,
} from "@blueberry/chem-core";
import { atomPairKey, findBondInState } from "@blueberry/chem-core";
import type { AtomPlacement, StateLayout } from "./layout";
import { requirePlacement } from "./layout";
import type { Vec } from "./vec";
import { midpoint } from "./vec";

export type BondPhase = "persistent" | "forming" | "breaking";

export interface SceneAtom {
  readonly id: AtomId;
  readonly element: string;
  readonly role: SpeciesRole;
  readonly from: AtomPlacement;
  readonly to: AtomPlacement;
  readonly fromCharge: number;
  readonly toCharge: number;
  readonly fromLonePairs: number;
  readonly toLonePairs: number;
  readonly fromImplicitH: number;
  readonly toImplicitH: number;
}

export interface SceneBond {
  /** Unordered pair key; stable identity for the tween. */
  readonly key: string;
  readonly a: AtomId;
  readonly b: AtomId;
  /** Bond order in the FROM state (or the to state for a forming bond). */
  readonly order: number;
  /**
   * Bond order in the TO state. Differs from `order` when a persistent bond
   * CHANGES order, which is every pi push: the C=O of a carbonyl addition is
   * order 2 before and 1 after. The owner caught the old model, which merged
   * the pair at max(2,1)=2 and rendered a static double bond through the
   * whole animation: "the carbonyl is not pushing the bond to the oxygen."
   * An order change is an event, and the renderer needs both numbers to
   * animate it.
   */
  readonly toOrder: number;
  readonly phase: BondPhase;
  /** For a forming bond, the end it visually grows from: the electron donor. */
  readonly growFrom: AtomId;
}

export interface SceneArrow {
  readonly id: string;
  readonly electrons: number;
  /** Start point in `from` layout coordinates. Arrows describe the from state. */
  readonly start: Vec;
  readonly end: Vec;
  /** Perpendicular bow direction sign, alternated so stacked arrows separate. */
  readonly bow: number;
}

export interface StepScene {
  readonly atoms: readonly SceneAtom[];
  readonly bonds: readonly SceneBond[];
  readonly arrows: readonly SceneArrow[];
  /** Midpoints of breaking bonds, where the release burst renders. */
  readonly breakingMidpoints: readonly Vec[];
}

interface AtomSide {
  readonly placement: AtomPlacement;
  readonly role: SpeciesRole;
  readonly element: string;
  readonly charge: number;
  readonly lonePairs: number;
  readonly implicitH: number;
}

function collectSide(
  step: MechanismStep,
  which: "from" | "to",
  layout: StateLayout,
): Map<AtomId, AtomSide> {
  const state = which === "from" ? step.from : step.to;
  const out = new Map<AtomId, AtomSide>();
  for (const member of state.members) {
    for (const atom of member.species.atoms) {
      out.set(atom.id, {
        placement: requirePlacement(layout, atom.id),
        role: member.role,
        element: atom.element,
        charge: atom.formalCharge,
        lonePairs: atom.lonePairs,
        implicitH: atom.implicitHydrogens,
      });
    }
  }
  return out;
}

function arrowSourcePoint(
  step: MechanismStep,
  arrow: ElectronFlowArrow,
  fromLayout: StateLayout,
): { point: Vec; donorAtom: AtomId | null } {
  const source = arrow.source;
  if (source.kind === "bond") {
    const located = findBondInState(step.from, source.bondId);
    if (located === undefined) {
      throw new Error(`Arrow ${arrow.id} sources bond ${source.bondId} not in the from state`);
    }
    const a = requirePlacement(fromLayout, located.bond.a).pos;
    const b = requirePlacement(fromLayout, located.bond.b).pos;
    return { point: midpoint(a, b), donorAtom: null };
  }
  // lonePair and singleElectron both start at the atom's open shell.
  const placement = requirePlacement(fromLayout, source.atomId);
  return { point: placement.pos, donorAtom: source.atomId };
}

function arrowSinkPoint(arrow: ElectronFlowArrow, fromLayout: StateLayout): Vec {
  const sink = arrow.sink;
  if (sink.kind === "atom") {
    return requirePlacement(fromLayout, sink.atomId).pos;
  }
  const [a, b] = sink.atomIds;
  return midpoint(requirePlacement(fromLayout, a).pos, requirePlacement(fromLayout, b).pos);
}

/**
 * For a forming bond, the donor end: the atom whose lone pair (or single
 * electron) an arrow pushes into this pair. Falls back to the first atom of the
 * pair when no arrow names one, which keeps the function total.
 */
function donorFor(pair: readonly [AtomId, AtomId], step: MechanismStep): AtomId {
  const key = atomPairKey(pair[0], pair[1]);
  for (const arrow of step.arrows) {
    if (arrow.sink.kind !== "betweenAtoms") continue;
    if (atomPairKey(arrow.sink.atomIds[0], arrow.sink.atomIds[1]) !== key) continue;
    if (arrow.source.kind === "lonePair" || arrow.source.kind === "singleElectron") {
      return arrow.source.atomId;
    }
  }
  return pair[0];
}

export function buildStepScene(
  step: MechanismStep,
  fromLayout: StateLayout,
  toLayout: StateLayout,
): StepScene {
  const fromSide = collectSide(step, "from", fromLayout);
  const toSide = collectSide(step, "to", toLayout);

  // Atoms: union of both sides. Ids are stable across a step (chem-core
  // invariant), so an atom missing from one side genuinely appears or leaves;
  // in that case its other side's placement doubles for both ends of the tween.
  const atoms: SceneAtom[] = [];
  const allIds = new Set<AtomId>([...fromSide.keys(), ...toSide.keys()]);
  for (const id of allIds) {
    const before = fromSide.get(id);
    const after = toSide.get(id);
    const either = before ?? after;
    if (either === undefined) continue;
    atoms.push({
      id,
      element: either.element,
      role: (after ?? either).role,
      from: (before ?? after ?? either).placement,
      to: (after ?? before ?? either).placement,
      fromCharge: before?.charge ?? 0,
      toCharge: after?.charge ?? 0,
      fromLonePairs: before?.lonePairs ?? after?.lonePairs ?? 0,
      toLonePairs: after?.lonePairs ?? before?.lonePairs ?? 0,
      fromImplicitH: before?.implicitH ?? after?.implicitH ?? 0,
      toImplicitH: after?.implicitH ?? before?.implicitH ?? 0,
    });
  }

  // Bonds: keyed by unordered atom pair.
  interface PairInfo {
    a: AtomId;
    b: AtomId;
    fromOrder: number;
    toOrder: number;
  }
  const pairs = new Map<string, PairInfo>();
  for (const member of step.from.members) {
    for (const bond of member.species.bonds) {
      const key = atomPairKey(bond.a, bond.b);
      pairs.set(key, { a: bond.a, b: bond.b, fromOrder: bond.order, toOrder: 0 });
    }
  }
  for (const member of step.to.members) {
    for (const bond of member.species.bonds) {
      const key = atomPairKey(bond.a, bond.b);
      const existing = pairs.get(key);
      if (existing === undefined) {
        pairs.set(key, { a: bond.a, b: bond.b, fromOrder: 0, toOrder: bond.order });
      } else {
        existing.toOrder = bond.order;
      }
    }
  }

  const bonds: SceneBond[] = [];
  const breakingMidpoints: Vec[] = [];
  for (const [key, info] of pairs) {
    const phase: BondPhase = info.fromOrder > 0 && info.toOrder > 0 ? "persistent" : info.fromOrder > 0 ? "breaking" : "forming";
    bonds.push({
      key,
      a: info.a,
      b: info.b,
      order: info.fromOrder > 0 ? info.fromOrder : info.toOrder,
      toOrder: info.toOrder,
      phase,
      growFrom: phase === "forming" ? donorFor([info.a, info.b], step) : info.a,
    });
    // A full break AND a pi departure both release electrons somewhere: the
    // burst marks it. An order DROP on a persisting bond is the carbonyl case.
    if (phase === "breaking" || (phase === "persistent" && info.toOrder < info.fromOrder)) {
      breakingMidpoints.push(
        midpoint(requirePlacement(fromLayout, info.a).pos, requirePlacement(fromLayout, info.b).pos),
      );
    }
  }

  const arrows: SceneArrow[] = step.arrows.map((arrow, index) => {
    const { point: start } = arrowSourcePoint(step, arrow, fromLayout);
    const end = arrowSinkPoint(arrow, fromLayout);
    return {
      id: arrow.id,
      electrons: arrow.electrons,
      start,
      end,
      bow: index % 2 === 0 ? 1 : -1,
    };
  });

  return { atoms, bonds, arrows, breakingMidpoints };
}
