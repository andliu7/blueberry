/**
 * Units, points, and the two reference devices.
 *
 * EVERYTHING IN THIS DIRECTORY IS IN POINTS, never in device pixels.
 *
 * A point is the logical unit both platforms lay out in: an iOS point and an
 * Android density independent pixel. They are not the same physical size, which
 * matters exactly once, in the fingertip model, where a finger has a size in
 * millimetres and has to be converted into the units the layout is expressed in.
 * Every other function here is scale free.
 *
 * No DOM, no React, no rendering. Pure numbers over coordinates.
 */

/**
 * An iOS point is 1/163 inch, the original iPhone panel density that the point
 * unit was defined against. 25.4 / 163 = 0.155828 mm per point.
 */
export const POINTS_PER_MM_IOS = 163 / 25.4;

/**
 * An Android dp is 1/160 inch by definition of the mdpi baseline.
 * 25.4 / 160 = 0.15875 mm per dp.
 */
export const POINTS_PER_MM_ANDROID = 160 / 25.4;

/**
 * The two reference devices named in the Budgets table of CLAUDE.md.
 *
 * `pointsPerMm` is what the fingertip model needs. `logicalSize` is the point
 * size of the panel, which is what a layout has to fit inside.
 *
 * Sources for the raw panel numbers are the published specifications. They are
 * recorded here so a reader can check them rather than trust them.
 */
export interface ReferenceDevice {
  readonly name: string;
  /** Points per millimetre on this device's logical unit. */
  readonly pointsPerMm: number;
  /** Logical width and height in points, portrait. */
  readonly logicalSize: { readonly width: number; readonly height: number };
  /** Device pixels per logical point. */
  readonly scaleFactor: number;
}

/** Pixel 6a: 1080 by 2400 px, 429 ppi, 2.6x, so 415 by 923 dp. */
export const PIXEL_6A: ReferenceDevice = {
  name: "Pixel 6a",
  pointsPerMm: POINTS_PER_MM_ANDROID,
  logicalSize: { width: 415, height: 923 },
  scaleFactor: 2.6,
};

/** iPhone 12: 1170 by 2532 px, 460 ppi, 3x, so 390 by 844 pt. */
export const IPHONE_12: ReferenceDevice = {
  name: "iPhone 12",
  pointsPerMm: POINTS_PER_MM_IOS,
  logicalSize: { width: 390, height: 844 },
  scaleFactor: 3,
};

/**
 * The minimum hit target from the Budgets table, in points. Do not change this
 * to make a check pass. It is a budget, not a tuning knob.
 */
export const MINIMUM_HIT_TARGET_POINTS = 44;

/** A position in layout space, in points. */
export interface Point {
  readonly x: number;
  readonly y: number;
}

/**
 * Squared distance. Used everywhere in the hit path because the comparison the
 * hit test actually makes is between ratios of squares, and a square root per
 * target per pointer move buys nothing.
 */
export function distanceSquared(a: Point, b: Point): number {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  return dx * dx + dy * dy;
}

export function distance(a: Point, b: Point): number {
  return Math.sqrt(distanceSquared(a, b));
}

/** Place a point at `radius` from `centre` along `degrees`, measured counter
 * clockwise from the positive x axis with y increasing downward, which is the
 * convention every 2D canvas and SVG surface uses. */
export function polar(centre: Point, radius: number, degrees: number): Point {
  const radians = (degrees * Math.PI) / 180;
  return {
    x: centre.x + radius * Math.cos(radians),
    y: centre.y - radius * Math.sin(radians),
  };
}

export function millimetresToPoints(mm: number, device: ReferenceDevice): number {
  return mm * device.pointsPerMm;
}

export function pointsToMillimetres(points: number, device: ReferenceDevice): number {
  return points / device.pointsPerMm;
}
