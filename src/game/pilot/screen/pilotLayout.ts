/**
 * The pilot screen's geometry: where annotations sit, what can be touched,
 * and where an arrow starts and lands. Pure TypeScript, no React, no DOM.
 *
 * WHY THIS FILE EXISTS BESIDE hitLayout.ts RATHER THAN INSTEAD OF IT. The
 * trainer's hitLayout is imported for everything it gets right (targets,
 * rim landings, the hit tester, the px conversion), but its lone pair fan
 * carries the bond-side bug that pilot/annotations/placement.ts documents in
 * its header: consumers fan from `openAngle + Math.PI`, which points BACK
 * along the bonds. The pilot's rule 4 is that lone pairs and hydrogens come
 * from the placement module, so this file recomputes exactly the two things
 * that depend on those positions, the lone pair TARGETS and the lone pair
 * ANCHORS, and delegates the rest. One allocator feeds both the art and the
 * hit targets, so a student taps the dot they can see.
 */

import type { AtomId, ElectronFlowArrow, MechanismStep } from "@blueberry/chem-core";
import type { HitTarget, Point2 } from "@blueberry/interaction";
import { placeAnnotations } from "../annotations/placement";
import type { StepScene } from "../../render/layout/stepScene";
import {
  atomCentre,
  atomRadius,
  bondIdFor,
  bondMidpoint,
  buildTargets,
  landingOnRim,
  mix,
  PX,
  rimPoint,
  sceneCentroid,
  targetAnchor,
  toPx,
  type DrawTarget,
} from "../../tabs/trainer/hitLayout";

/** One placed annotation, in the canvas's pixel space. */
export interface PilotSlot {
  readonly posPx: Point2;
  /** Scene radians (y up). Negate for screen-space trigonometry. */
  readonly angleSceneRad: number;
}

export interface PilotAtomAnnotations {
  readonly lonePairs: readonly PilotSlot[];
  readonly hydrogens: readonly PilotSlot[];
  readonly crowded: boolean;
}

/**
 * Which side of the step the annotations describe. "from" is the drawing
 * surface; "to" is what the win rests on once the bond change has played.
 */
export type SceneSide = "from" | "to";

/**
 * Lone pair and hydrogen positions for every atom, one placement call per
 * atom, both kinds allocated together into the bond-free arcs. Lone pairs
 * orbit at the shipped rim (atom radius + 7 px); hydrogen glyphs sit one
 * ring further out (+13 px, where HydrogenArc puts its letters), so the two
 * kinds never share a circle.
 */
export function annotateScene(scene: StepScene, side: SceneSide): ReadonlyMap<AtomId, PilotAtomAnnotations> {
  const out = new Map<AtomId, PilotAtomAnnotations>();
  const posOf = (id: AtomId) => {
    const atom = scene.atoms.find((candidate) => candidate.id === id);
    if (atom === undefined) return null;
    return side === "from" ? atom.from.pos : atom.to.pos;
  };
  for (const atom of scene.atoms) {
    const here = side === "from" ? atom.from.pos : atom.to.pos;
    const lonePairCount = side === "from" ? atom.fromLonePairs : atom.toLonePairs;
    const hydrogenCount = side === "from" ? atom.fromImplicitH : atom.toImplicitH;
    if (lonePairCount <= 0 && hydrogenCount <= 0) {
      out.set(atom.id, { lonePairs: [], hydrogens: [], crowded: false });
      continue;
    }
    const bondAngles: number[] = [];
    for (const bond of scene.bonds) {
      // A bond that does not exist on this side of the step claims no rim.
      if (side === "from" && bond.phase === "forming") continue;
      if (side === "to" && bond.phase === "breaking") continue;
      const otherId = bond.a === atom.id ? bond.b : bond.b === atom.id ? bond.a : null;
      if (otherId === null) continue;
      const other = posOf(otherId);
      if (other === null) continue;
      bondAngles.push(Math.atan2(other.y - here.y, other.x - here.x));
    }
    const r = atomRadius(atom.element);
    const placement = placeAnnotations({
      centre: { x: here.x, y: here.y },
      bondAngles,
      hydrogenCount,
      lonePairCount,
      radius: (r + 7) / PX,
      hydrogenRadius: (r + 13) / PX,
    });
    const toSlot = (slot: { readonly pos: { readonly x: number; readonly y: number }; readonly angle: number }): PilotSlot => ({
      posPx: toPx({ x: slot.pos.x, y: slot.pos.y, z: 0 }),
      angleSceneRad: slot.angle,
    });
    out.set(atom.id, {
      lonePairs: placement.lonePairs.map(toSlot),
      hydrogens: placement.hydrogens.map(toSlot),
      crowded: placement.crowded,
    });
  }
  return out;
}

/**
 * The hit targets: hitLayout's own list (atoms, bond end handles, and the
 * between-atom sites it offers while a source is armed, occlusion rule
 * included), with its lone pair entries replaced by the placement module's
 * positions. The 12 px drawn radius matches the drawn halo; the hit tester
 * widens it per pointer kind.
 */
export function pilotTargets(
  step: MechanismStep,
  scene: StepScene,
  annotations: ReadonlyMap<AtomId, PilotAtomAnnotations>,
  revealedLonePairs: readonly AtomId[],
  armedAtom: AtomId | null,
): readonly DrawTarget[] {
  const base = buildTargets(step, scene, revealedLonePairs, armedAtom).filter(
    (entry) => entry.target.kind !== "lonePair",
  );
  const lonePairs: DrawTarget[] = [];
  for (const atomId of revealedLonePairs) {
    const entry = annotations.get(atomId);
    if (entry === undefined) continue;
    entry.lonePairs.forEach((slot, slotIndex) => {
      lonePairs.push({ target: { kind: "lonePair", atomId, slotIndex }, centre: slot.posPx, radius: 12 });
    });
  }
  return [...base, ...lonePairs];
}

/**
 * Where a hit target is drawn, so the guide and the record agree with the
 * thing the student touched. Lone pairs resolve through the placement slots;
 * everything else is hitLayout's own answer.
 */
export function pilotAnchor(
  step: MechanismStep,
  scene: StepScene,
  annotations: ReadonlyMap<AtomId, PilotAtomAnnotations>,
  target: HitTarget,
): Point2 | null {
  if (target.kind === "lonePair") {
    const entry = annotations.get(target.atomId);
    const slot = entry?.lonePairs[target.slotIndex] ?? entry?.lonePairs[0];
    return slot?.posPx ?? atomCentre(scene, target.atomId);
  }
  return targetAnchor(step, scene, target);
}

/** Clearance kept between an arrowhead and the rim it lands beside. */
const LAND_GAP = 6;

/** How a committed push is drawn: the ribbon's endpoints and the bond it makes. */
export interface PilotArrowGeometry {
  /** Where the electrons left: a lone pair slot or a bond midpoint. */
  readonly from: Point2;
  /** What the tapered module is aimed at. Its own sink trim does the landing. */
  readonly to: Point2;
  readonly sinkRadiusPx: number;
  /** Where resting electrons sit in the arrowless mode. Already on the rim. */
  readonly landing: Point2;
  /** The forming bond, when the sink is a pair with no bond yet. Rim to rim. */
  readonly stub: { readonly a: Point2; readonly b: Point2 } | null;
}

/**
 * Endpoint geometry for one committed arrow, over the live scene.
 *
 * A lone pair source starts at whichever of the atom's placement slots faces
 * the landing, the same rule the trainer applies, read off the placement
 * module's slots instead of the bond-side fan.
 */
export function committedArrowGeometry(
  step: MechanismStep,
  scene: StepScene,
  annotations: ReadonlyMap<AtomId, PilotAtomAnnotations>,
  arrow: ElectronFlowArrow,
  away: Point2,
): PilotArrowGeometry {
  const sink = arrow.sink;
  const elementOf = (atomId: AtomId): string => scene.atoms.find((atom) => atom.id === atomId)?.element ?? "C";

  // The sink's rough position first, so a lone pair source can pick the slot
  // that faces it; the precise landing needs the source and comes after.
  let to: Point2;
  let stub: { readonly a: Point2; readonly b: Point2 } | null = null;

  if (sink.kind === "atom") {
    to = atomCentre(scene, sink.atomId);
  } else {
    const [a, b] = sink.atomIds;
    const bondId = bondIdFor(step, a, b);
    const existing = bondId === null ? null : bondMidpoint(step, scene, bondId);
    if (existing !== null) {
      to = existing;
    } else {
      const ca = atomCentre(scene, a);
      const cb = atomCentre(scene, b);
      stub = { a: rimPoint(ca, cb, atomRadius(elementOf(a)) + 1), b: rimPoint(cb, ca, atomRadius(elementOf(b)) + 1) };
      to = mix(stub.a, stub.b, 0.5);
    }
  }

  // The source, facing the sink.
  let from: Point2;
  const source = arrow.source;
  if (source.kind === "bond") {
    from = bondMidpoint(step, scene, source.bondId) ?? away;
  } else {
    const entry = annotations.get(source.atomId);
    let best: Point2 | null = null;
    let bestD = Infinity;
    for (const slot of entry?.lonePairs ?? []) {
      const d = Math.hypot(slot.posPx.x - to.x, slot.posPx.y - to.y);
      if (d < bestD) {
        bestD = d;
        best = slot.posPx;
      }
    }
    from = best ?? atomCentre(scene, source.atomId);
  }

  // The landing, now that the start is known.
  let sinkRadiusPx: number;
  let landing: Point2;
  if (sink.kind === "atom") {
    const r = atomRadius(elementOf(sink.atomId));
    sinkRadiusPx = r + LAND_GAP;
    landing = landingOnRim(atomCentre(scene, sink.atomId), r, from, away, LAND_GAP);
  } else if (stub !== null) {
    sinkRadiusPx = 8;
    landing = to;
  } else {
    // Into an existing bond: land on its midpoint, head held off the rod.
    sinkRadiusPx = 10;
    landing = to;
  }

  return { from, to, sinkRadiusPx, landing, stub };
}

/** Centroid of every drawn atom, re-exported so the canvas has one import. */
export function pilotCentroid(scene: StepScene): Point2 {
  return sceneCentroid(scene);
}
