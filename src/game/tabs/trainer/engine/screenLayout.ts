/**
 * The trainer screen's geometry: where annotations sit, what can be touched,
 * and where an arrow starts and lands. Pure TypeScript, no React, no DOM.
 *
 * WHY THIS FILE EXISTS BESIDE hitLayout.ts RATHER THAN INSTEAD OF IT. The
 * trainer's hitLayout is imported for everything it gets right (targets,
 * rim landings, the hit tester, the px conversion), but its lone pair fan
 * carries the bond-side bug that engine/annotations/placement.ts documents
 * in its header: consumers fan from `openAngle + Math.PI`, which points BACK
 * along the bonds. The pilot's rule 4 is that lone pairs and hydrogens come
 * from the placement module, so this file recomputes exactly the two things
 * that depend on those positions, the lone pair TARGETS and the lone pair
 * ANCHORS, and delegates the rest. One allocator feeds both the art and the
 * hit targets, so a student taps the dot they can see.
 */

import type { AtomId, ElectronFlowArrow, MechanismStep } from "@blueberry/chem-core";
import type { HitTarget, Point2 } from "@blueberry/interaction";
import { placeAnnotations } from "./annotations/placement";
import type { StepScene } from "../../../render/layout/stepScene";
import {
  atomCentre,
  atomRadius,
  bondIdFor,
  bondMidpoint,
  buildTargets,
  landingOnRim,
  mix,
  PX,
  targetAnchor,
  toPx,
  type DrawTarget,
} from "../hitLayout";

/** One placed annotation, in the canvas's pixel space. */
export interface AnnotationSlotPx {
  readonly posPx: Point2;
  /** Scene radians (y up). Negate for screen-space trigonometry. */
  readonly angleSceneRad: number;
}

export interface AtomAnnotations {
  readonly lonePairs: readonly AnnotationSlotPx[];
  readonly hydrogens: readonly AnnotationSlotPx[];
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
export function annotateScene(scene: StepScene, side: SceneSide): ReadonlyMap<AtomId, AtomAnnotations> {
  const out = new Map<AtomId, AtomAnnotations>();
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
    const toSlot = (slot: { readonly pos: { readonly x: number; readonly y: number }; readonly angle: number }): AnnotationSlotPx => ({
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
export function sceneTargets(
  step: MechanismStep,
  scene: StepScene,
  annotations: ReadonlyMap<AtomId, AtomAnnotations>,
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
export function targetAnchorPx(
  step: MechanismStep,
  scene: StepScene,
  annotations: ReadonlyMap<AtomId, AtomAnnotations>,
  target: HitTarget,
): Point2 | null {
  if (target.kind === "lonePair") {
    const entry = annotations.get(target.atomId);
    const slot = entry?.lonePairs[target.slotIndex] ?? entry?.lonePairs[0];
    return slot?.posPx ?? atomCentre(scene, target.atomId);
  }
  return targetAnchor(step, scene, target);
}

/**
 * Air between an arrowhead and the surface it lands on. The head TOUCHES the
 * atom: at the old 6 px it stopped short and read as aimed at nothing (round
 * four critic, g5-arrows-verdict.md: "5 to 7 px short").
 */
const LAND_GAP = 1.5;
/** How far an arrow keeps from an atom it passes: past the implicit-H labels, which sit at radius + 13. */
const PASS_CLEARANCE = 17;
/** A leaving-group push lands this far round its atom from the bond axis, so it has room to be an arrow. */
const LEAVE_SWING = (80 * Math.PI) / 180;
/** An arrow re-aimed around an atom in the way lands this far round its target toward the bow. */
const DETOUR_SWING = (50 * Math.PI) / 180;

/** How a committed push is drawn: the arrow's endpoints, its bend, and the atom it was dropped on. */
export interface CommittedArrowGeometry {
  /** Where the electrons left: the grabbed lone pair, or just off a bond's middle. */
  readonly from: Point2;
  /** What the tapered module is aimed at, with its own trim. For an atom this is the landing itself. */
  readonly to: Point2;
  readonly sinkRadiusPx: number;
  /** Where the head ends: touching the atom's surface, or on the bond. */
  readonly landing: Point2;
  /** The curve bends AWAY from this point (the scene centroid unless the arrow had to detour). */
  readonly away: Point2;
  /** Requested bow for the curved arrow; the tapered module caps it against the chord. */
  readonly bow: number;
  /** The dashed arrow's bend. Null draws it straight, the owner's dashed style. */
  readonly control: Point2 | null;
  /**
   * The atom the push was dropped on, when there is one: the sink atom, or
   * for a new bond the end away from the source. Null for a push into an
   * existing bond. A verdict rings this atom, because it is what the
   * student aimed at.
   */
  readonly targetAtom: AtomId | null;
}

const sub = (a: Point2, b: Point2): Point2 => ({ x: a.x - b.x, y: a.y - b.y });
const len = (v: Point2): number => Math.hypot(v.x, v.y) || 1;
const unit = (v: Point2): Point2 => ({ x: v.x / len(v), y: v.y / len(v) });
const along = (p: Point2, dir: Point2, d: number): Point2 => ({ x: p.x + dir.x * d, y: p.y + dir.y * d });

/** The unit perpendicular of a direction that points toward the side `pick` returns true for. */
function sideNormal(dir: Point2, pick: (n: Point2) => number): Point2 {
  const n1 = { x: -dir.y, y: dir.x };
  const n2 = { x: dir.y, y: -dir.x };
  const s1 = pick(n1);
  const s2 = pick(n2);
  // A tie (a symmetric molecule) resolves DOWN for a leaving group and UP
  // for a detour; the caller's pick carries that preference in its sign.
  return s1 >= s2 ? n1 : n2;
}

/** A point on `centre`'s rim at radius `r`, rotated from the direction of `toward` by `swing` toward side `n`. */
function swungRim(centre: Point2, toward: Point2, r: number, swing: number, n: Point2): Point2 {
  const d = unit(sub(toward, centre));
  const cos = Math.cos(swing);
  const sin = Math.sin(swing);
  const a = { x: d.x * cos - d.y * sin, y: d.x * sin + d.y * cos };
  const b = { x: d.x * cos + d.y * sin, y: -d.x * sin + d.y * cos };
  const pickA = a.x * n.x + a.y * n.y >= b.x * n.x + b.y * n.y;
  const u = pickA ? a : b;
  return along(centre, u, r);
}

/**
 * Endpoint geometry for one committed arrow, over the live scene.
 *
 * THE ARROW IS THE ONE THE STUDENT DREW. A lone pair source starts on the
 * pair they grabbed (`grabbedSlot`, remembered by the canvas at the commit)
 * and falls back to the pair facing the landing only when that is unknown (a
 * replay of an authored arrow). The head touches the surface of the atom it
 * was dropped on.
 *
 * THREE SHAPES, each measured against the round four critic's frames:
 *   leaving group  a bond's pair onto one of its own ends: the tail sits just
 *                  off the bond's middle and the head lands 80 degrees round
 *                  the atom, below the bond (away from the molecule for a
 *                  vertical bond), so the push is a real arc rather
 *                  than the 12 px stub buried under the verdict ring
 *   detour         an arrow whose chord passes an atom that is not one of its
 *                  ends bends round it, clear of that atom's H labels, and
 *                  lands on its target's rim on the bend side
 *   plain          everything else: the facing rim, the scene centroid's bow
 */
export function committedArrowGeometry(
  step: MechanismStep,
  scene: StepScene,
  annotations: ReadonlyMap<AtomId, AtomAnnotations>,
  arrow: ElectronFlowArrow,
  away: Point2,
  grabbedSlot?: number,
): CommittedArrowGeometry {
  const sink = arrow.sink;
  const source = arrow.source;
  const elementOf = (atomId: AtomId): string => scene.atoms.find((atom) => atom.id === atomId)?.element ?? "C";
  const centreOf = (atomId: AtomId): Point2 => atomCentre(scene, atomId);

  // The atoms the electrons leave from.
  const sourceAtoms: AtomId[] = [];
  if (source.kind === "bond") {
    for (const bond of scene.bonds) {
      if (bond.phase !== "forming" && bondIdFor(step, bond.a, bond.b) === source.bondId) sourceAtoms.push(bond.a, bond.b);
    }
  } else {
    sourceAtoms.push(source.atomId);
  }

  // What the push was dropped on: an atom, or the middle of an existing bond.
  let targetAtom: AtomId | null = null;
  let bondLanding: Point2 | null = null;
  if (sink.kind === "atom") {
    targetAtom = sink.atomId;
  } else {
    const [a, b] = sink.atomIds;
    const bondId = bondIdFor(step, a, b);
    const existing = bondId === null ? null : bondMidpoint(step, scene, bondId);
    if (existing !== null) bondLanding = existing;
    else targetAtom = sourceAtoms.includes(a) && !sourceAtoms.includes(b) ? b : sourceAtoms.includes(b) && !sourceAtoms.includes(a) ? a : b;
  }
  const rough = targetAtom !== null ? centreOf(targetAtom) : (bondLanding ?? away);

  // The tail: the grabbed pair, else the pair facing the target.
  let from: Point2;
  if (source.kind === "bond") {
    from = bondMidpoint(step, scene, source.bondId) ?? away;
  } else {
    const slots = annotations.get(source.atomId)?.lonePairs ?? [];
    const grabbed = grabbedSlot !== undefined ? slots[grabbedSlot] : undefined;
    let best = grabbed?.posPx ?? null;
    if (best === null) {
      let bestD = Infinity;
      for (const slot of slots) {
        const d = Math.hypot(slot.posPx.x - rough.x, slot.posPx.y - rough.y);
        if (d < bestD) {
          bestD = d;
          best = slot.posPx;
        }
      }
    }
    from = best ?? centreOf(source.atomId);
  }

  // Into an existing bond: land on its middle, head held off the rod.
  if (targetAtom === null) {
    const mid = bondLanding ?? away;
    return { from, to: mid, sinkRadiusPx: 10, landing: mid, away, bow: 34, control: null, targetAtom };
  }

  const centre = centreOf(targetAtom);
  const r = atomRadius(elementOf(targetAtom)) + LAND_GAP;

  // Leaving group: the bond's own pair collapsing onto one of its ends.
  if (source.kind === "bond" && sourceAtoms.includes(targetAtom)) {
    const axis = unit(sub(centre, from));
    // DOWN the screen (+y), where the reference and most textbooks draw the
    // leaving group's arrow, and the order the round four critic gave; for a
    // bond with no up or down (vertical), away from the molecule.
    const n = sideNormal(axis, (v) => v.y * 1000 + (v.x * (from.x - away.x) + v.y * (from.y - away.y)));
    const tail = along(from, n, 5);
    const landing = swungRim(centre, tail, r, LEAVE_SWING, n);
    const chordMid = mix(tail, landing, 0.5);
    return { from: tail, to: landing, sinkRadiusPx: 0, landing, away: along(chordMid, n, -1000), bow: 34, control: along(chordMid, n, 16), targetAtom };
  }

  // Anything in the way? Every atom that is not an end of this arrow.
  const plainLanding = landingOnRim(centre, r - LAND_GAP, from, away, LAND_GAP);
  const chord = sub(plainLanding, from);
  const chordLen = len(chord);
  const dir = unit(chord);
  const normal = { x: -dir.y, y: dir.x };
  const blockers = scene.atoms
    .filter((atom) => atom.id !== targetAtom && !sourceAtoms.includes(atom.id))
    .map((atom) => {
      const c = centreOf(atom.id);
      const rel = sub(c, from);
      const s = (rel.x * dir.x + rel.y * dir.y) / chordLen;
      const offset = rel.x * normal.x + rel.y * normal.y;
      return { s, offset, clear: atomRadius(atom.element) + PASS_CLEARANCE };
    })
    .filter((b) => b.s > 0.06 && b.s < 0.94 && Math.abs(b.offset) < b.clear);
  if (blockers.length === 0) {
    return { from, to: plainLanding, sinkRadiusPx: 0, landing: plainLanding, away, bow: 34, control: null, targetAtom };
  }

  // Bend to the side the blockers are NOT on; a blocker dead on the chord
  // sends the arc UP the screen, over the labels, where it reads as a push.
  const lean = blockers.reduce((sum, b) => sum + b.offset, 0);
  const n = sideNormal(dir, (v) => -(v.x * normal.x + v.y * normal.y) * Math.sign(lean || 0) * 1000 - v.y);
  const landing = swungRim(centre, from, r, DETOUR_SWING, n);
  const chordMid = mix(from, landing, 0.5);
  // The control offset that carries the curve past every blocker: a
  // quadratic sits 2s(1-s) of its control offset off the chord at s.
  const signedToward = (b: { offset: number }) => b.offset * (n.x * normal.x + n.y * normal.y);
  const needed = Math.max(...blockers.map((b) => (b.clear + signedToward(b)) / Math.max(0.2, 2 * b.s * (1 - b.s))));
  return { from, to: landing, sinkRadiusPx: 0, landing, away: along(chordMid, n, -1000), bow: needed, control: along(chordMid, n, needed), targetAtom };
}
