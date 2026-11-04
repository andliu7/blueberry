/**
 * Pure model for the range chart: the axes, where a value sits across the plot, the lane
 * packing that keeps cards from overprinting, and the student's own edits to a range (saved
 * per device). No React, so it is testable in node.
 */

import type { RangeBox, RangeMode, RangeShift } from "./rangeTypes";

export interface RangeAxis {
  /** Left end, the larger number: every axis runs high to low. */
  readonly max: number;
  readonly min: number;
  readonly unit: string;
  readonly tick: number;
  /** Edits snap to this. */
  readonly snap: number;
}

export const RANGE_AXES: Record<RangeMode, RangeAxis> = {
  ir: { max: 4000, min: 500, unit: "cm⁻¹", tick: 500, snap: 10 },
  h1: { max: 13, min: 0, unit: "ppm", tick: 1, snap: 0.1 },
  c13: { max: 220, min: 0, unit: "ppm", tick: 20, snap: 1 },
};

/** Below this an IR spectrum is the fingerprint region: compare it, do not read it. */
export const FINGERPRINT_CM = 1500;

export function isFingerprint(box: Pick<RangeBox, "mode" | "hi">): boolean {
  return box.mode === "ir" && box.hi <= FINGERPRINT_CM;
}

/** 0 at the left (high) end, 1 at the right (low) end. */
export function fracOf(mode: RangeMode, v: number): number {
  const a = RANGE_AXES[mode];
  return (a.max - v) / (a.max - a.min);
}

export function valueAt(mode: RangeMode, f: number): number {
  const a = RANGE_AXES[mode];
  return a.max - f * (a.max - a.min);
}

export function ticks(mode: RangeMode): number[] {
  const a = RANGE_AXES[mode];
  const out: number[] = [];
  for (let v = a.max - (a.max % a.tick); v >= a.min - 1e-9; v -= a.tick) out.push(Math.round(v * 1000) / 1000);
  return out;
}

export function formatValue(mode: RangeMode, v: number): string {
  return mode === "h1" ? (Math.round(v * 10) / 10).toFixed(1) : String(Math.round(v));
}

export function formatRange(mode: RangeMode, r: { readonly hi: number; readonly lo: number }): string {
  return `${formatValue(mode, r.hi)}–${formatValue(mode, r.lo)}`;
}

/** Which way a shift moves a range, in the words of the axis. */
export function shiftDirection(mode: RangeMode, base: { readonly hi: number; readonly lo: number }, s: RangeShift): string {
  const up = (s.hi + s.lo) / 2 > (base.hi + base.lo) / 2;
  if (mode === "ir") return up ? "Higher wavenumber" : "Lower wavenumber";
  return up ? "Downfield (deshielded)" : "Upfield (shielded)";
}

/**
 * Lanes, so no two cards or bars share space: each item takes the wider of its bar and its
 * card (centred on the bar, kept inside the plot), and goes in the first lane whose last item
 * ends before it starts. Widths are fractions of the plot.
 */
export function packLanes(items: readonly { readonly id: string; readonly hi: number; readonly lo: number }[], mode: RangeMode, cardFrac: number, gap = 0.008): Map<string, number> {
  const spans = items
    .map((it) => {
      const left = fracOf(mode, it.hi);
      const right = fracOf(mode, it.lo);
      const c = cardCentre(left, right, cardFrac);
      return { id: it.id, left: Math.min(left, c - cardFrac / 2), right: Math.max(right, c + cardFrac / 2) };
    })
    .sort((a, b) => a.left - b.left || a.right - b.right);
  const ends: number[] = [];
  const out = new Map<string, number>();
  for (const s of spans) {
    let lane = ends.findIndex((e) => e + gap <= s.left);
    if (lane === -1) {
      lane = ends.length;
      ends.push(s.right);
    } else ends[lane] = s.right;
    out.set(s.id, lane);
  }
  return out;
}

/** Where a card's centre sits: over its bar, but never hanging off either end of the plot. */
export function cardCentre(left: number, right: number, cardFrac: number): number {
  const c = (left + right) / 2;
  return Math.min(Math.max(c, cardFrac / 2), 1 - cardFrac / 2);
}

// ------------------------------------------------------------------ student edits

export type RangeEdits = Readonly<Record<string, { readonly hi: number; readonly lo: number }>>;

export const EDITS_KEY = "bb.spectra.ranges.v1";

/** Read saved edits; anything malformed is dropped. Storage can throw (private mode), so it is guarded. */
export function loadEdits(storage: Pick<Storage, "getItem"> | undefined): RangeEdits {
  try {
    const raw = storage?.getItem(EDITS_KEY);
    if (raw == null) return {};
    const parsed: unknown = JSON.parse(raw);
    if (parsed === null || typeof parsed !== "object") return {};
    const out: Record<string, { hi: number; lo: number }> = {};
    for (const [id, v] of Object.entries(parsed as Record<string, unknown>)) {
      const r = v as { hi?: unknown; lo?: unknown } | null;
      if (r !== null && typeof r === "object" && typeof r.hi === "number" && typeof r.lo === "number" && Number.isFinite(r.hi) && Number.isFinite(r.lo) && r.hi > r.lo) out[id] = { hi: r.hi, lo: r.lo };
    }
    return out;
  } catch {
    return {};
  }
}

export function saveEdits(storage: Pick<Storage, "setItem"> | undefined, edits: RangeEdits): void {
  try {
    storage?.setItem(EDITS_KEY, JSON.stringify(edits));
  } catch {
    /* storage blocked: the edit still holds for this visit */
  }
}

/** The range a student sees: their edit if they made one, else the textbook default. */
export function effective(box: RangeBox, edits: RangeEdits): { hi: number; lo: number; edited: boolean } {
  const e = edits[box.id];
  return e === undefined ? { hi: box.hi, lo: box.lo, edited: false } : { ...e, edited: true };
}

/**
 * Tidy a typed or dragged range: snap, keep inside the axis, put the larger number first and
 * keep at least two snap steps between the edges.
 */
export function cleanRange(mode: RangeMode, a: number, b: number): { hi: number; lo: number } {
  const ax = RANGE_AXES[mode];
  const snap = (v: number) => Math.round(Math.min(Math.max(v, ax.min), ax.max) / ax.snap) * ax.snap;
  let hi = snap(Math.max(a, b));
  let lo = snap(Math.min(a, b));
  const minGap = ax.snap * 2;
  if (hi - lo < minGap) {
    if (hi + minGap <= ax.max) hi = lo + minGap;
    else lo = hi - minGap;
  }
  const r = (v: number) => Math.round(v * 1000) / 1000;
  return { hi: r(hi), lo: r(lo) };
}

/** Set one box's range; matching the default removes the edit. */
export function withEdit(edits: RangeEdits, box: RangeBox, r: { readonly hi: number; readonly lo: number }): RangeEdits {
  const next = { ...edits };
  if (Math.abs(r.hi - box.hi) < 1e-9 && Math.abs(r.lo - box.lo) < 1e-9) delete next[box.id];
  else next[box.id] = { hi: r.hi, lo: r.lo };
  return next;
}

export function withoutEdit(edits: RangeEdits, id: string): RangeEdits {
  const next = { ...edits };
  delete next[id];
  return next;
}
