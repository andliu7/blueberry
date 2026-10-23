/**
 * Ink: the pointer rules every drawing surface in this folder shares.
 *
 * Which pointer may draw, how thick its line is, and how many of its points
 * are worth keeping. FreehandCanvas (graded, bonds) and ScratchpadCanvas
 * (never graded, raw ink) both draw with a finger or an Apple Pencil, and both
 * need the same answer to "is this touch a palm?". Keeping the answer here,
 * pure and with no React and no DOM, is what lets node vitest pin it
 * (test/scratchpadInk.test.ts) without mounting either canvas.
 *
 * THE PALM RULE. iPad Safari reports an Apple Pencil as pointerType "pen" and
 * a finger or a resting palm as "touch". Once a pen has touched the canvas a
 * Pencil is in use, so every later touch is treated as a palm and refused, for
 * the life of the canvas. Before any pen, touch draws, so a student with no
 * Pencil can still use a finger. And only one pointer draws at a time, so a
 * second finger or the heel of the hand cannot start a stroke mid-stroke.
 */

import { distance, type Pt } from "./geometry";

/** A point with the line width it was drawn at. */
export type InkPoint = Pt & { readonly w: number };

export type InkStroke = { readonly id: string; readonly points: readonly InkPoint[] };

export interface PointerGate {
  /** True when this pointer may start drawing now. Call on pointer down. */
  accept(pointerId: number, pointerType: string): boolean;
  /**
   * Frees the drawing slot if this pointer held it. Call on pointer up and
   * cancel. Returns false for a pointer that was refused, so a lifted palm
   * cannot end or commit the stroke the Pencil is still drawing.
   */
  release(pointerId: number): boolean;
}

export function createPointerGate(): PointerGate {
  let penSeen = false;
  let active: number | null = null;
  return {
    accept(pointerId, pointerType) {
      if (pointerType === "pen") penSeen = true;
      if (pointerType === "touch" && penSeen) return false;
      if (active !== null && active !== pointerId) return false;
      active = pointerId;
      return true;
    },
    release(pointerId) {
      if (active !== pointerId) return false;
      active = null;
      return true;
    },
  };
}

/**
 * Line width for one point. Only a pen's pressure means anything: a mouse
 * reports 0.5 while a button is down and iPad Safari reports a finger as 0 or
 * a constant, so both draw at exactly `base`.
 */
export function widthFor(pointerType: string, pressure: number, base: number): number {
  if (pointerType !== "pen" || !(pressure > 0)) return base;
  const scaled = base * (0.35 + 1.3 * pressure);
  return Math.min(1.65 * base, Math.max(0.35 * base, scaled));
}

/**
 * Adds `next` unless it sits closer than `minGap` to the last kept point. A
 * Pencil reports at 240Hz, and without this a slow stroke builds thousands of
 * points that all draw on top of each other.
 */
export function appendPoint(points: readonly InkPoint[], next: InkPoint, minGap: number): readonly InkPoint[] {
  const last = points[points.length - 1];
  if (last !== undefined && distance(last, next) < minGap) return points;
  return [...points, next];
}
