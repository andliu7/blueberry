/**
 * The geometry behind the walk's moving pictures. Pure numbers, no React, so the
 * node test environment can hold it.
 *
 * The pyramid is real 3-D: three groups sit on a cone around the attack axis,
 * 120 degrees apart. A group's depth (toward the viewer, away, or in the page)
 * comes from where it lands on that cone, and the drawing is an oblique
 * projection of it. Nothing is hand-placed, so inversion is what the cone does
 * when its opening angle passes through 90 degrees, not a picture of inversion.
 */

const toRad = (deg: number) => (deg * Math.PI) / 180;

export const smooth = (t: number) => {
  const c = Math.min(1, Math.max(0, t));
  return c * c * (3 - 2 * c);
};

export type Depth = "plain" | "wedge" | "dash";

export interface SubPoint {
  readonly x: number;
  readonly y: number;
  readonly depth: Depth;
}

/**
 * Where the three groups on the carbon sit, in units of one bond, y up.
 * `fromDeg` and `toDeg` are the groups' angle from the attack axis (positive x)
 * at t = 0 and t = 1. Backside attack: below 90 before (tilted toward the
 * nucleophile side), above 90 after (tilted away), 90 exactly at the flat
 * transition state.
 */
export function pyramidSubs(t: number, fromDeg: number, toDeg: number): SubPoint[] {
  const theta = toRad(fromDeg + (toDeg - fromDeg) * smooth(t));
  return [0, 120, 240].map((azimuth) => {
    const a = toRad(azimuth);
    const along = Math.cos(theta);
    const y3 = Math.sin(theta) * Math.cos(a);
    const z = Math.sin(theta) * Math.sin(a);
    const depth: Depth = Math.abs(z) < 0.05 ? "plain" : z > 0 ? "wedge" : "dash";
    // Oblique projection: toward the viewer slides right, away slides left.
    return { x: along + 0.12 * z, y: y3, depth };
  });
}

/** Distance of the incoming and leaving group from the carbon, in bonds. */
export function nuDistance(t: number): number {
  return 2.15 - 1.0 * smooth(t);
}
export function lgDistance(t: number): number {
  return 1.15 + 1.0 * smooth(t);
}

/**
 * Newman projection: the angle between the front C-H and the back C-LG, 0 to 180.
 * Anti-periplanar is 180. `frontDeg` is the front bond's angle; the back bond
 * stays at 90 (straight up).
 */
export function separation(frontDeg: number, backDeg = 90): number {
  const d = (((frontDeg - backDeg) % 360) + 360) % 360;
  return d > 180 ? 360 - d : d;
}

export function isAnti(frontDeg: number): boolean {
  return separation(frontDeg) >= 170;
}

export function conformerName(frontDeg: number): "anti" | "gauche" | "eclipsed" | "between" {
  const s = separation(frontDeg);
  if (s >= 170) return "anti";
  if (s <= 10) return "eclipsed";
  if (Math.abs(s - 60) <= 10) return "gauche";
  return "between";
}

/** Drawn length of a ranked bond, in pixels. Ranks only, never a measured value. */
export const BOND_PX = Object.freeze({ short: 52, medium: 84, long: 118 } as const);

export interface Pt {
  readonly x: number;
  readonly y: number;
}

/** A bowed quadratic path from a to b, bowing to the left of travel. */
export function bowPath(a: Pt, b: Pt, bow = 0.28): { d: string; ctrl: Pt } {
  const mx = (a.x + b.x) / 2;
  const my = (a.y + b.y) / 2;
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const ctrl = { x: mx + dy * bow, y: my - dx * bow };
  // Pull the ends in so the arrow does not sit on the atom glyphs.
  const pull = (p: Pt, f: number): Pt => ({ x: p.x + (ctrl.x - p.x) * f, y: p.y + (ctrl.y - p.y) * f });
  const s = pull(a, 0.14);
  const e = pull(b, 0.2);
  return { d: `M ${s.x} ${s.y} Q ${ctrl.x} ${ctrl.y} ${e.x} ${e.y}`, ctrl };
}
