/**
 * What a student can touch on the draw canvas, and the hit tester that says
 * which one they touched.
 *
 * The interaction package declares the HitTester interface (geometryPort.ts)
 * and leaves its implementation to the shell, because only the shell knows
 * where things are drawn. This file computes target circles from the Phase 4
 * scene in the same pixel space MoleculeSvg uses (72 px per bond length, y
 * flipped), so the draw canvas and the hit test cannot disagree about where an
 * atom is.
 *
 * Tolerance by pointer: a fingertip gets slop, a mouse gets the drawn
 * silhouette, a pen sits between, per packages/interaction/src/geometry/
 * targets.ts. The numbers here are the touch profile's in points, applied to
 * the same kinds. Between-atom sites are offered only while a source is armed,
 * which is the rule targets.ts records for betweenAtomsSite.
 *
 * Every drawn target is at least 22 px in radius on touch (44 point diameter),
 * the hit floor in CLAUDE.md.
 */

import type { AtomId } from "@blueberry/chem-core";
import type { HitTarget, HitTestOutcome, HitTestQuery, HitTester, PointerKind, Point2 } from "@blueberry/interaction";
import type { MechanismStep } from "@blueberry/chem-core";
import type { StepScene } from "../../render/layout/stepScene";
import { add, fromAngle } from "../../render/layout/vec";
import type { Vec } from "../../render/layout/vec";

/** Linear interpolation in pixel space. Vec's lerp carries z, which pixels lack. */
export function mix(a: Point2, b: Point2, t: number): Point2 {
  return { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t };
}

export const PX = 72;
export const ATOM_R = 21;
export const ATOM_R_SMALL = 13;
export const ATOM_R_LARGE = 26;

export function toPx(v: Vec): Point2 {
  return { x: v.x * PX, y: -v.y * PX };
}

export function atomRadius(element: string): number {
  // Size is one of the few things a sphere can teach, per a blind critic who
  // caught Br drawn at carbon's diameter. Three tiers are enough: hydrogen
  // small, second row standard, third row and below larger. Van der Waals
  // ratios, coarsened so hit targets stay predictable.
  if (element === "H") return ATOM_R_SMALL;
  if (element === "Br" || element === "I" || element === "Cl" || element === "S" || element === "P") return ATOM_R_LARGE;
  return ATOM_R;
}

export interface DrawTarget {
  readonly target: HitTarget;
  readonly centre: Point2;
  /** Drawn radius in px. The hit radius adds pointer slop. */
  readonly radius: number;
}

const SLOP: Record<PointerKind, number> = { touch: 10, pen: 6, mouse: 0 };

/** Lone pair slot positions, the same fan MoleculeSvg draws. */
export function lonePairSlots(scene: StepScene, atomId: AtomId): readonly Point2[] {
  const atom = scene.atoms.find((candidate) => candidate.id === atomId);
  if (atom === undefined) return [];
  const r = atomRadius(atom.element);
  const rimR = (r + 7) / PX;
  const slots: Point2[] = [];
  for (let i = 0; i < atom.fromLonePairs; i += 1) {
    const angle = atom.from.openAngle + Math.PI + (i - (atom.fromLonePairs - 1) / 2) * 1.25;
    slots.push(toPx(add(atom.from.pos, fromAngle(angle, rimR))));
  }
  return slots;
}

/** Per species pixel offset from the authored layout, keyed by species id. */
export type SpeciesOffsets = Readonly<Record<string, Point2>>;

/**
 * Per ATOM pixel offset, for the orbit drag. Owner requirement, 2026-08-26,
 * matching the Alchemie videos: "if I drag the hydrogen I should be able to
 * circle the oxygen. Bonds should follow dynamically."
 *
 * A species offset moves a molecule; an orbit offset moves one atom within
 * it, constrained by the gesture code to the circle its bond allows. The two
 * compose: orbit is applied after the species carry, so a molecule dragged
 * across the canvas keeps its swung hydrogen where the student put it.
 */
export type AtomOrbits = Readonly<Record<string, Point2>>;

/** The scene with individual atoms moved by their orbit offsets. */
export function applyAtomOrbits(scene: StepScene, orbits: AtomOrbits): StepScene {
  if (Object.keys(orbits).length === 0) return scene;
  const atoms = scene.atoms.map((atom) => {
    const offset = orbits[atom.id];
    if (offset === undefined) return atom;
    const delta: Vec = { x: offset.x / PX, y: -offset.y / PX, z: 0 };
    return {
      ...atom,
      from: { ...atom.from, pos: add(atom.from.pos, delta) },
      to: { ...atom.to, pos: add(atom.to.pos, delta) },
    };
  });
  return { ...scene, atoms };
}

/**
 * Re-derive every atom's open angle from where its bonds POINT NOW.
 *
 * The authored openAngle is computed once at layout time, which was right
 * while atoms never moved relative to each other. The orbit drag broke that
 * assumption: swing the hydrogen from below the oxygen to above it and the
 * lone pairs must migrate to the far side, because the open direction IS the
 * away-from-bonds direction. This is the "neighbour re-settles" half of the
 * owner's requirement, and it is a pure function of live geometry: same rule
 * as layout.ts's openDirection, read from the scene's own bonds.
 *
 * Atoms with no bonds keep their authored angle: nothing about their
 * surroundings changed, so nothing about their annotations should.
 */
export function resettleOpenAngles(scene: StepScene): StepScene {
  const atoms = scene.atoms.map((atom) => {
    const bonds = scene.bonds.filter((bond) => bond.phase !== "forming" && (bond.a === atom.id || bond.b === atom.id));
    if (bonds.length === 0) return atom;
    const here = atom.from.pos;
    let sx = 0;
    let sy = 0;
    for (const bond of bonds) {
      const otherId = bond.a === atom.id ? bond.b : bond.a;
      const other = scene.atoms.find((candidate) => candidate.id === otherId);
      if (other === undefined) continue;
      const dx = other.from.pos.x - here.x;
      const dy = other.from.pos.y - here.y;
      const len = Math.hypot(dx, dy) || 1;
      sx += dx / len;
      sy += dy / len;
    }
    const mag = Math.hypot(sx, sy);
    let openAngle: number;
    if (mag < 1e-6) {
      // Linear atom: open perpendicular to the first bond, same as layout.ts.
      const first = bonds[0];
      const otherId = first === undefined ? undefined : first.a === atom.id ? first.b : first.a;
      const other = otherId === undefined ? undefined : scene.atoms.find((candidate) => candidate.id === otherId);
      openAngle = other === undefined ? atom.from.openAngle : Math.atan2(other.from.pos.y - here.y, other.from.pos.x - here.x) + Math.PI / 2;
    } else {
      openAngle = Math.atan2(-sy, -sx);
    }
    // The badge angle deliberately does NOT resettle. The round 3 critic
    // watched the minus chip re-anchor as the hydrogen swung and read it as
    // "the charge appears to migrate around the oxygen during a purely
    // geometric gesture, which reads as chemistry changing when it is not."
    // A lone pair fan is geometry and follows the bonds; a formal charge is
    // bookkeeping and stays where it was authored.
    return { ...atom, from: { ...atom.from, openAngle } };
  });
  return { ...scene, atoms };
}

/**
 * The atom this one SWINGS around, or null when dragging it should carry the
 * whole species instead.
 *
 * Topology alone is not enough, and the first cut of this proved it: in
 * bromomethane the carbon has exactly one EXPLICIT bond, because its three
 * hydrogens are implicit, so "one bond means terminal" made both ends of the
 * molecule orbit and left nothing to carry it by. The rule is about which end
 * is the CENTRE:
 *
 *   - the atom must have exactly one explicit bond (two circles pin an atom);
 *   - the neighbour must be the heavier end, where weight is explicit bonds
 *     plus implicit hydrogens: CH3's carbon is a four-way centre however few
 *     bonds are drawn, so Br orbits it and it carries the molecule;
 *   - on a tie (H-O in hydroxide, H-Cl: both ends degree one) the SMALLER
 *     atom orbits, which is the hand's own intuition: you swing the hydrogen
 *     around the oxygen, not the oxygen around the hydrogen.
 */
export function terminalNeighbor(step: MechanismStep, atomId: AtomId): AtomId | null {
  interface Info {
    readonly element: string;
    readonly weight: number;
    readonly partners: AtomId[];
  }
  const info = new Map<AtomId, Info>();
  for (const member of step.from.members) {
    for (const atom of member.species.atoms) {
      info.set(atom.id, { element: atom.element, weight: atom.implicitHydrogens, partners: [] });
    }
    for (const bond of member.species.bonds) {
      const a = info.get(bond.a);
      const b = info.get(bond.b);
      if (a !== undefined) {
        a.partners.push(bond.b);
        info.set(bond.a, { ...a, weight: a.weight + 1 });
      }
      if (b !== undefined) {
        b.partners.push(bond.a);
        info.set(bond.b, { ...b, weight: b.weight + 1 });
      }
    }
  }
  const self = info.get(atomId);
  if (self === undefined || self.partners.length !== 1) return null;
  const neighbourId = self.partners[0];
  if (neighbourId === undefined) return null;
  const neighbour = info.get(neighbourId);
  if (neighbour === undefined) return null;
  if (neighbour.weight > self.weight) return neighbourId;
  if (neighbour.weight < self.weight) return null;
  return atomRadius(self.element) < atomRadius(neighbour.element) ? neighbourId : null;
}

/**
 * Where an orbiting atom sits for a given pointer: on the circle around its
 * neighbour at the radius the bond had when the drag began, at the pointer's
 * angle. The radius is an input rather than a lookup so a mid-drag render
 * cannot feed the constraint its own output and let the bond creep.
 */
export function orbitPoint(neighbourPx: Point2, radiusPx: number, pointerPx: Point2): Point2 {
  const dx = pointerPx.x - neighbourPx.x;
  const dy = pointerPx.y - neighbourPx.y;
  const len = Math.hypot(dx, dy);
  if (len < 1e-6) return { x: neighbourPx.x + radiusPx, y: neighbourPx.y };
  return { x: neighbourPx.x + (dx / len) * radiusPx, y: neighbourPx.y + (dy / len) * radiusPx };
}

/** Which species each atom of the from state belongs to. */
export function speciesOf(step: MechanismStep): ReadonlyMap<AtomId, string> {
  const map = new Map<AtomId, string>();
  for (const member of step.from.members) {
    for (const atom of member.species.atoms) map.set(atom.id, member.species.id);
  }
  return map;
}

/**
 * The live layout: the authored scene with each species moved by where the
 * student dragged it. Every consumer of positions (targets, lone pair slots,
 * arrow endpoints, the canvas) reads the scene this returns, never the
 * authored one, so a drop site is wherever its atom is now. Offsets are in
 * pixels; scene units are bond lengths with y up, hence the divide and flip.
 */
export function applySpeciesOffsets(scene: StepScene, step: MechanismStep, offsets: SpeciesOffsets): StepScene {
  if (Object.keys(offsets).length === 0) return scene;
  const owner = speciesOf(step);
  const atoms = scene.atoms.map((atom) => {
    const species = owner.get(atom.id);
    const offset = species === undefined ? undefined : offsets[species];
    if (offset === undefined) return atom;
    const delta: Vec = { x: offset.x / PX, y: -offset.y / PX, z: 0 };
    return {
      ...atom,
      from: { ...atom.from, pos: add(atom.from.pos, delta) },
      to: { ...atom.to, pos: add(atom.to.pos, delta) },
    };
  });
  return { ...scene, atoms };
}

export function atomCentre(scene: StepScene, atomId: AtomId): Point2 {
  const atom = scene.atoms.find((candidate) => candidate.id === atomId);
  if (atom === undefined) throw new Error(`no scene atom ${atomId}`);
  return toPx(atom.from.pos);
}

/** Bond ids come from the chem-core state; the scene keys bonds by atom pair. */
export function bondIdFor(step: MechanismStep, a: AtomId, b: AtomId): string | null {
  for (const member of step.from.members) {
    for (const bond of member.species.bonds) {
      if ((bond.a === a && bond.b === b) || (bond.a === b && bond.b === a)) return bond.id;
    }
  }
  return null;
}

export function buildTargets(
  step: MechanismStep,
  scene: StepScene,
  revealedLonePairs: readonly AtomId[],
  armedAtom: AtomId | null,
): readonly DrawTarget[] {
  const targets: DrawTarget[] = [];

  for (const atom of scene.atoms) {
    targets.push({
      target: { kind: "atom", atomId: atom.id },
      centre: toPx(atom.from.pos),
      radius: atomRadius(atom.element),
    });
    if (revealedLonePairs.includes(atom.id)) {
      lonePairSlots(scene, atom.id).forEach((centre, slotIndex) => {
        targets.push({ target: { kind: "lonePair", atomId: atom.id, slotIndex }, centre, radius: 12 });
      });
    }
  }

  for (const bond of scene.bonds) {
    if (bond.phase === "forming") continue;
    const bondId = bondIdFor(step, bond.a, bond.b);
    if (bondId === null) continue;
    const a = atomCentre(scene, bond.a);
    const b = atomCentre(scene, bond.b);
    // ON the atom's rim, where the capsule meets the sphere, which is where the
    // Alchemie capture (extra/x02) puts the ball joint you grab. Anywhere along
    // the middle reads as two loose circles floating on the bond instead.
    const rA = atomRadius(scene.atoms.find((atom) => atom.id === bond.a)?.element ?? "C");
    const rB = atomRadius(scene.atoms.find((atom) => atom.id === bond.b)?.element ?? "C");
    const handleA = rimPoint(a, b, rA);
    const handleB = rimPoint(b, a, rB);
    targets.push({ target: { kind: "bondEndHandle", bondId, atomId: bond.a }, centre: handleA, radius: 11 });
    targets.push({ target: { kind: "bondEndHandle", bondId, atomId: bond.b }, centre: handleB, radius: 11 });
  }

  if (armedAtom !== null) {
    const origin = atomCentre(scene, armedAtom);
    for (const other of scene.atoms) {
      if (other.id === armedAtom) continue;
      if (bondIdFor(step, armedAtom, other.id) !== null) continue;
      // A bond cannot form THROUGH another atom, and offering one that would is
      // how the worst reported bug in this canvas happened.
      //
      // Hydroxide attacking bromomethane lays out linearly, O-C-Br. The site
      // offered for the pair (O, Br) is centred on the midpoint of O and Br,
      // which in a linear layout is sitting exactly on the CARBON. So dragging
      // the oxygen's electrons toward the carbon put the pointer inside the
      // O-Br site, that site won the hit test, and the arrow snapped to bromine
      // before the carbon was ever reached. The owner hit this in the first
      // minute of using it: "as I drag it to the right before I even get to the
      // carbon it jumps straight to the bromine, which shouldn't even be
      // allowed."
      //
      // It is also the stray dashed line a blind critic read as a second
      // electron path toward bromine. One stub drawn O to Br, straight through
      // the carbon, not two colinear ones as first diagnosed.
      if (occludedByAnotherAtom(scene, armedAtom, other.id)) continue;
      const centre = mix(origin, toPx(other.from.pos), 0.5);
      targets.push({ target: { kind: "betweenAtomsSite", atomIds: [armedAtom, other.id] }, centre, radius: 14 });
    }
  }

  return targets;
}

function distance(a: Point2, b: Point2): number {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

/** Pixel midpoint of a bond by chem-core bond id, or null when the scene does not draw it. */
export function bondMidpoint(step: MechanismStep, scene: StepScene, bondId: string): Point2 | null {
  for (const bond of scene.bonds) {
    if (bond.phase !== "forming" && bondIdFor(step, bond.a, bond.b) === bondId) {
      return mix(atomCentre(scene, bond.a), atomCentre(scene, bond.b), 0.5);
    }
  }
  return null;
}

/** Of an atom's lone pair slots, the one facing `toward`. The slot the electrons leave from. */
export function nearestLonePairSlot(scene: StepScene, atomId: AtomId, toward: Point2): Point2 {
  const slots = lonePairSlots(scene, atomId);
  let best: Point2 | null = null;
  let bestD = Infinity;
  for (const slot of slots) {
    const d = distance(slot, toward);
    if (d < bestD) {
      bestD = d;
      best = slot;
    }
  }
  return best ?? atomCentre(scene, atomId);
}

/**
 * Where a hit target is drawn, so an arrow anchored to it starts or ends on the
 * thing the student touched rather than on the pointer's press point. The in
 * flight guide and the committed arrow both go through here, which is what
 * keeps them from disagreeing about where a source is.
 */
export function targetAnchor(step: MechanismStep, scene: StepScene, target: HitTarget): Point2 | null {
  switch (target.kind) {
    case "atom":
    case "unpairedElectron":
    case "hydrogenCount":
      return atomCentre(scene, target.atomId);
    case "lonePair": {
      const slots = lonePairSlots(scene, target.atomId);
      return slots[target.slotIndex] ?? slots[0] ?? atomCentre(scene, target.atomId);
    }
    case "bondEndHandle":
    case "bondBody":
      return bondMidpoint(step, scene, target.bondId);
    case "betweenAtomsSite":
      return mix(atomCentre(scene, target.atomIds[0]), atomCentre(scene, target.atomIds[1]), 0.5);
    default:
      return null;
  }
}

/** The point on the line from `centre` toward `toward`, `r` px out: the rim of an atom. */
export function rimPoint(centre: Point2, toward: Point2, r: number): Point2 {
  const dx = toward.x - centre.x;
  const dy = toward.y - centre.y;
  const len = Math.hypot(dx, dy) || 1;
  return { x: centre.x + (dx / len) * r, y: centre.y + (dy / len) * r };
}

/**
 * The control point of a quadratic curve from `from` to `to` that bows AWAY
 * from `away` (the scene centroid), so an arrow arcs around the molecule
 * rather than across it. Of the two perpendicular candidates the one farther
 * from `away` wins; a degenerate (zero length) chord bows upward.
 */
export function bowAwayFrom(from: Point2, to: Point2, away: Point2, magnitude: number): Point2 {
  const mid = { x: (from.x + to.x) / 2, y: (from.y + to.y) / 2 };
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const len = Math.hypot(dx, dy);
  if (len < 1) return { x: mid.x, y: mid.y - magnitude };
  // The bow is capped against the chord. A fixed 34px offset on a 60px chord
  // throws the control point out past the end, and a quadratic whose control
  // point sits beyond its endpoint has a tangent there pointing BACK along the
  // curve: the arrowhead ends up aimed away from the thing it is landing on.
  // Above about a third of the chord the curve stops reading as a push and
  // starts reading as a loop, so that is the ceiling.
  // Capped against the chord, but never flat. A bond-to-atom arrow travels only
  // from the bond's middle to the atom beside it, perhaps 40px; at 32 percent
  // that is a 13px bow, and the result is a stub a student's eye skips over
  // entirely next to the long sweep of a nucleophile arrow. The floor keeps a
  // short arrow readable as an arc; the cap keeps a long one from looping.
  const bow = Math.min(magnitude, Math.max(18, len * 0.32));
  const nx = (-dy / len) * bow;
  const ny = (dx / len) * bow;
  const a = { x: mid.x + nx, y: mid.y + ny };
  const b = { x: mid.x - nx, y: mid.y - ny };
  return distance(a, away) >= distance(b, away) ? a : b;
}

/** Shortest chord an arrow can have and still read as an arrow rather than a tick. */
const MIN_CHORD = 34;

/**
 * Where an arrow lands on an atom's rim.
 *
 * The obvious answer, the rim point facing the source, is right whenever the
 * source is far away and CATASTROPHIC when it is close. The leaving group arrow
 * is the case: it starts at the C-Br bond's midpoint, 38 units from bromine's
 * centre, and bromine's radius is 21 with a 16 unit clearance on top, so the
 * landing came out 0.8 units from where the arrow started. bowAwayFrom treats a
 * chord under 1 as degenerate and bows straight up, so the committed arrow was
 * a vertical stub over the middle of the bond pointing back down at it: it did
 * not touch bromine, and it read as electrons flowing INTO the bond rather than
 * out of it with the leaving group. Both captures, light and dark, showed it.
 *
 * So the landing SWINGS around the rim instead. The clearance is budgeted
 * against the room actually available rather than spent flat, and the landing
 * rotates away from the molecule until the chord is long enough to draw, which
 * is also how the arrow is drawn on paper: out, over, and down onto the atom
 * that is leaving. Where there is already room the swing is zero and nothing
 * about a long arrow changes.
 */
export function landingOnRim(centre: Point2, r: number, from: Point2, centroid: Point2, landGap: number): Point2 {
  const dx = from.x - centre.x;
  const dy = from.y - centre.y;
  const reach = Math.hypot(dx, dy) || 1;
  // Air between the head and the sphere is affordable only out of the gap
  // between the source and the rim. Half of it, so the arrow always keeps a
  // body at least as long as its clearance.
  const gap = Math.min(landGap, Math.max(2, (reach - r) / 2));
  const rr = r + gap;
  // Law of cosines for the swing that makes the chord MIN_CHORD. Above 1 the
  // chord cannot reach it from any angle, so take the best available, 180
  // degrees; at or below -1 the straight landing is already long enough.
  const cos = (reach * reach + rr * rr - MIN_CHORD * MIN_CHORD) / (2 * reach * rr);
  const swing = Math.min(Math.acos(Math.max(-1, Math.min(1, cos))), 1.75);
  if (!(swing > 0.01)) return rimPoint(centre, from, rr);
  // Swing to the side away from the rest of the molecule, the same side
  // bowAwayFrom arcs to, so the curve and its landing agree.
  const base = Math.atan2(dy, dx);
  const pick = (sign: number): Point2 => ({
    x: centre.x + Math.cos(base + sign * swing) * rr,
    y: centre.y + Math.sin(base + sign * swing) * rr,
  });
  const a = pick(1);
  const b = pick(-1);
  const far = (p: Point2): number => Math.hypot(p.x - centroid.x, p.y - centroid.y);
  return far(a) >= far(b) ? a : b;
}

/** Centroid of every drawn atom, the side a curve should bow away from. */
export function sceneCentroid(scene: StepScene): Point2 {
  let x = 0;
  let y = 0;
  for (const atom of scene.atoms) {
    const p = toPx(atom.from.pos);
    x += p.x;
    y += p.y;
  }
  const n = scene.atoms.length || 1;
  return { x: x / n, y: y / n };
}

/**
 * Does the straight line between two atoms pass through a third?
 *
 * Pure geometry, deliberately: "is this pair separated by something" is a
 * question about the drawn scene, and answering it from bond topology instead
 * would miss the case the layout creates and invent cases it does not. An atom
 * counts as in the way when its centre is closer to the segment than its own
 * drawn radius, and when the nearest point on that segment is strictly between
 * the two endpoints rather than off either end.
 */
function occludedByAnotherAtom(scene: StepScene, from: AtomId, to: AtomId): boolean {
  const a = atomCentre(scene, from);
  const b = atomCentre(scene, to);
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const lengthSquared = dx * dx + dy * dy;
  if (lengthSquared === 0) return false;

  return scene.atoms.some((atom) => {
    if (atom.id === from || atom.id === to) return false;
    const c = atomCentre(scene, atom.id);
    // Where c projects onto the segment, as a fraction of its length.
    const t = ((c.x - a.x) * dx + (c.y - a.y) * dy) / lengthSquared;
    // Off either end is not in the way, it is merely nearby. The margin keeps a
    // near-endpoint atom from counting against a pair it is really part of.
    if (t <= 0.05 || t >= 0.95) return false;
    const nearest = { x: a.x + dx * t, y: a.y + dy * t };
    return distance(c, nearest) < atomRadius(atom.element);
  });
}

/**
 * Nearest target whose slop-widened circle contains the point wins; the
 * margin is the runner up's normalised distance minus the winner's, which the
 * machine compares against AMBIGUOUS_MARGIN to decide whether to ask.
 */
export function createHitTester(getTargets: () => readonly DrawTarget[]): HitTester {
  return {
    hitTest(query: HitTestQuery): HitTestOutcome {
      const slop = SLOP[query.pointerType];
      const scored = getTargets()
        .map((entry) => {
          const hitRadius = Math.max(entry.radius + slop, query.pointerType === "touch" ? 22 : entry.radius);
          const score = distance(query.point, entry.centre) / hitRadius;
          return { target: entry.target, score };
        })
        .filter((entry) => entry.score <= 1)
        .sort((a, b) => a.score - b.score);

      const best = scored[0];
      if (best === undefined) {
        return { primary: { kind: "empty", point: query.point }, candidates: [], margin: Number.POSITIVE_INFINITY };
      }
      const second = scored[1];
      return {
        primary: best.target,
        candidates: scored,
        margin: second === undefined ? Number.POSITIVE_INFINITY : second.score - best.score,
      };
    },
  };
}
