/**
 * Minimal 3D vector math for layout.
 *
 * Pure TypeScript, no React, no three. The z component exists because the 3D
 * renderer consumes the same layout as the 2D one; the SVG renderer simply
 * ignores z. Writing this by hand rather than importing three keeps three out
 * of the game route's initial chunk, which is a budget rule, not a preference.
 */

export interface Vec {
  readonly x: number;
  readonly y: number;
  readonly z: number;
}

export function vec(x: number, y: number, z = 0): Vec {
  return { x, y, z };
}

export function add(a: Vec, b: Vec): Vec {
  return { x: a.x + b.x, y: a.y + b.y, z: a.z + b.z };
}

export function sub(a: Vec, b: Vec): Vec {
  return { x: a.x - b.x, y: a.y - b.y, z: a.z - b.z };
}

export function scale(a: Vec, s: number): Vec {
  return { x: a.x * s, y: a.y * s, z: a.z * s };
}

export function length(a: Vec): number {
  return Math.hypot(a.x, a.y, a.z);
}

export function normalize(a: Vec): Vec {
  const len = length(a);
  if (len < 1e-9) return { x: 1, y: 0, z: 0 };
  return scale(a, 1 / len);
}

export function lerp(a: Vec, b: Vec, t: number): Vec {
  return {
    x: a.x + (b.x - a.x) * t,
    y: a.y + (b.y - a.y) * t,
    z: a.z + (b.z - a.z) * t,
  };
}

export function midpoint(a: Vec, b: Vec): Vec {
  return lerp(a, b, 0.5);
}

/** Angle of the xy projection, radians, atan2 convention. */
export function angleOf(a: Vec): number {
  return Math.atan2(a.y, a.x);
}

export function fromAngle(angle: number, radius = 1): Vec {
  return { x: Math.cos(angle) * radius, y: Math.sin(angle) * radius, z: 0 };
}

/** Clamped smoothstep, the standard ease for windowed animation phases. */
export function smoothstep(edge0: number, edge1: number, x: number): number {
  const t = Math.min(1, Math.max(0, (x - edge0) / (edge1 - edge0)));
  return t * t * (3 - 2 * t);
}

export function clamp01(x: number): number {
  return Math.min(1, Math.max(0, x));
}
