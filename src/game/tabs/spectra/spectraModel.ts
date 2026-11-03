/**
 * Pure model for the NMR and IR tool: the reference ranges, the spectrum curves, range
 * matching and the DOU worked steps. No React, so it is testable in node.
 *
 * REFERENCE RANGES are read from the class handout decks (data/decks/nmr.ts and ir.ts), the
 * same source the Reference deck shows, so the two can never disagree. A range the handout
 * writes as "~12-11 ppm" becomes {hi: 12, lo: 11}.
 *
 * CURVES are drawn from the derived peak lists (spectra.generated.ts), as Lorentzian lines
 * with the multiplet split at 400 MHz. IR is drawn as transmittance dips.
 */

import { nmrDeck } from "@/data/decks/nmr";
import { irDeck } from "@/data/decks/ir";
import type { C13Peak, H1Peak, IrBand } from "./spectraTypes";

export type SpectrumKind = "h1" | "c13" | "ir";

export interface RefRange {
  readonly title: string;
  readonly description: string;
  readonly hi: number;
  readonly lo: number;
}

/** "~12–11 ppm", "4000–2500 cm-1", "3250 cm-1" to a range, or null for prose badges. */
export function parseBadge(badge: string): { hi: number; lo: number } | null {
  const m = /^~?\s*(\d+(?:\.\d+)?)\s*(?:[–-]\s*(\d+(?:\.\d+)?))?\s*(?:ppm|cm-1)$/.exec(badge.trim());
  if (m === null) return null;
  const a = Number(m[1]);
  const b = m[2] === undefined ? a : Number(m[2]);
  return { hi: Math.max(a, b), lo: Math.min(a, b) };
}

function rangesFrom(deck: { groups: readonly { heading?: string; items: readonly { title: string; description: string; badge: string }[] }[] }, heading: RegExp): RefRange[] {
  const out: RefRange[] = [];
  for (const g of deck.groups) {
    if (!heading.test(g.heading ?? "")) continue;
    for (const item of g.items) {
      const r = parseBadge(item.badge);
      if (r !== null) out.push({ title: item.title, description: item.description, ...r });
    }
  }
  return out;
}

export const H1_RANGES: readonly RefRange[] = rangesFrom(nmrDeck, /^1H/);
export const C13_RANGES: readonly RefRange[] = rangesFrom(nmrDeck, /^13C/);
export const IR_RANGES: readonly RefRange[] = rangesFrom(irDeck, /regions|ladder/i).filter((r) => r.hi - r.lo < 3000);

export function rangesFor(kind: SpectrumKind): readonly RefRange[] {
  return kind === "h1" ? H1_RANGES : kind === "c13" ? C13_RANGES : IR_RANGES;
}

export interface Axis {
  /** Left end (the larger number, for all three axes). */
  readonly max: number;
  readonly min: number;
  readonly unit: string;
}

export const AXES: Record<SpectrumKind, Axis> = {
  h1: { max: 13, min: -0.5, unit: "ppm" },
  c13: { max: 220, min: -10, unit: "ppm" },
  ir: { max: 4000, min: 400, unit: "cm-1" },
};

/** Reference ranges that overlap [lo, hi]. */
export function matchRanges(kind: SpectrumKind, lo: number, hi: number): RefRange[] {
  const a = Math.min(lo, hi);
  const b = Math.max(lo, hi);
  return rangesFor(kind).filter((r) => r.lo <= b && r.hi >= a && !(r.hi === r.lo && (r.hi < a || r.hi > b)));
}

/** Multiplet line offsets in ppm (Pascal triangle weights) at 400 MHz, J from the signal (default 7 Hz). */
const SPECTROMETER_MHZ = 400;
const PASCAL: Record<string, number[]> = {
  s: [1],
  d: [1, 1],
  t: [1, 2, 1],
  q: [1, 3, 3, 1],
  quint: [1, 4, 6, 4, 1],
  sext: [1, 5, 10, 10, 5, 1],
  sept: [1, 6, 15, 20, 15, 6, 1],
  m: [1, 2, 3, 2, 1],
};

export interface Line {
  readonly x: number;
  readonly height: number;
}

export function multipletLines(peak: H1Peak): Line[] {
  const w = PASCAL[peak.mult] ?? PASCAL.m;
  const total = w.reduce((s, v) => s + v, 0);
  const jPpm = (peak.j > 0 ? peak.j : 7) / SPECTROMETER_MHZ;
  const step = peak.mult === "m" ? jPpm * 0.8 : jPpm;
  return w.map((wt, i) => ({ x: peak.shift + (i - (w.length - 1) / 2) * step, height: (peak.nH * wt) / total }));
}

export function h1Lines(peaks: readonly H1Peak[]): Line[] {
  return peaks.flatMap(multipletLines);
}

export function c13Lines(peaks: readonly C13Peak[]): Line[] {
  return peaks.map((p) => ({ x: p.shift, height: 1 }));
}

/** An IR band's centre. */
export function irCentre(b: IrBand): number {
  return (b.lo + b.hi) / 2;
}

/** A readable tick step for a visible span. */
export function tickStep(span: number): number {
  const raw = span / 8;
  const pow = 10 ** Math.floor(Math.log10(raw));
  const f = raw / pow;
  return (f < 1.5 ? 1 : f < 3.5 ? 2 : f < 7.5 ? 5 : 10) * pow;
}

/** Degree of unsaturation from a molecular formula: (2C + 2 + N - H - X) / 2. */
export function parseFormula(text: string): Record<string, number> | null {
  const t = text.replace(/[₀-₉]/g, (c) => String(c.charCodeAt(0) - 0x2080)).replace(/\s+/g, "");
  if (t === "" || !/^([A-Z][a-z]?\d*)+$/.test(t)) return null;
  const out: Record<string, number> = {};
  for (const m of t.matchAll(/([A-Z][a-z]?)(\d*)/g)) out[m[1]] = (out[m[1]] ?? 0) + (m[2] === "" ? 1 : Number(m[2]));
  return out;
}

export interface DouSteps {
  readonly c: number;
  readonly h: number;
  readonly n: number;
  readonly x: number;
  readonly dou: number;
  readonly line: string;
}

export function douSteps(text: string): DouSteps | null {
  const f = parseFormula(text);
  if (f === null) return null;
  const c = f.C ?? 0;
  const h = f.H ?? 0;
  const n = f.N ?? 0;
  const x = (f.F ?? 0) + (f.Cl ?? 0) + (f.Br ?? 0) + (f.I ?? 0);
  if (c === 0) return null;
  const top = 2 * c + 2 + n - h - x;
  return { c, h, n, x, dou: top / 2, line: `(2(${c}) + 2 + ${n} - ${h} - ${x}) / 2 = ${top} / 2` };
}

/** What a whole number of DOU can mean, one line, for the steps panel. */
export function douMeaning(dou: number): string {
  if (!Number.isInteger(dou) || dou < 0) return "Not a whole number 0 or more. Recheck the formula.";
  if (dou === 0) return "Fully saturated: no rings, no pi bonds.";
  if (dou >= 4) return `${dou}: a benzene ring alone uses 4 (one ring, three C=C). Look for aromatic H near 7 ppm.`;
  return `${dou}: each ring or pi bond (C=C, C=O, C≡N counts 2 for the triple) uses one.`;
}

/**
 * IR as a MINOR aid on a product question: one line naming the strongest non-C-H band,
 * or saying there is none. Never the whole spectrum, so NMR stays the way to decide.
 */
export function irAid(bands: readonly IrBand[]): string {
  const key = bands.filter((b) => b.strength === "strong" && !/C-H/.test(b.label));
  const top = key.find((b) => /C=O|O-H|N-H/.test(b.label)) ?? key[0];
  if (top === undefined) return "IR: no strong band beyond C-H stretches.";
  return `IR: strong ${top.label.toLowerCase()} at ${top.hi}-${top.lo} cm-1.${top.broad ? " Broad." : ""}`;
}

/** The peak table a student reads, in exam order (downfield first). */
export function peakRows(peaks: readonly H1Peak[]): { shift: string; integral: string; split: string }[] {
  return peaks.map((p) => ({ shift: p.shift.toFixed(1), integral: `${p.nH}H`, split: p.exch ? "s, broad" : p.mult }));
}

/** Half-width of one simulated 1H line, in ppm (about 1.8 Hz at 400 MHz). */
export const H1_LINE_WIDTH = 0.0045;

/**
 * The simulated 1H trace at `v` ppm: every line of every first-order multiplet (J from the
 * signal, Pascal intensities) as a Lorentzian, so area under a signal is its H count.
 * First-order only: it does not model roofing or strongly coupled systems.
 */
export function h1Intensity(lines: readonly Line[], v: number, lw = H1_LINE_WIDTH): number {
  let y = 0;
  for (const l of lines) {
    const d = (v - l.x) / lw;
    y += l.height / (1 + d * d);
  }
  return y;
}

/**
 * nmrdb-style integral trace: running area from the downfield end to `v`, in H. Closed form
 * (arctan of each Lorentzian), so it is exact and cheap. Reaches the total H count upfield.
 */
export function h1Integral(lines: readonly Line[], v: number, lw = H1_LINE_WIDTH): number {
  let sum = 0;
  for (const l of lines) sum += l.height * (0.5 + Math.atan((l.x - v) / lw) / Math.PI);
  return sum;
}

/** Peak of the simulated trace, to scale the plot. */
export function h1Max(lines: readonly Line[], lw = H1_LINE_WIDTH): number {
  return Math.max(1e-9, ...lines.map((l) => h1Intensity(lines, l.x, lw)));
}

/** A linear axis calibration on a student's image: two x positions (0..1 of the width) with typed values. */
export interface Calibration {
  readonly f1: number;
  readonly v1: number;
  readonly f2: number;
  readonly v2: number;
}

export function validCalibration(c: Calibration | null): c is Calibration {
  return c !== null && Math.abs(c.f2 - c.f1) > 0.01 && Math.abs(c.v2 - c.v1) > 1e-9;
}

export function valueAtFraction(c: Calibration, f: number): number {
  return c.v1 + ((f - c.f1) * (c.v2 - c.v1)) / (c.f2 - c.f1);
}

export function fractionAtValue(c: Calibration, v: number): number {
  return c.f1 + ((v - c.v1) * (c.f2 - c.f1)) / (c.v2 - c.v1);
}

/** The H or C counts a signal list adds up to, for the "do the integrals match the formula" check. */
export function signalAtoms(kind: SpectrumKind, peaks: { readonly h1: readonly H1Peak[]; readonly c13: readonly C13Peak[] }, lo: number, hi: number): number[] {
  const out = new Set<number>();
  if (kind === "h1") for (const p of peaks.h1) if (p.shift >= lo && p.shift <= hi) p.atoms.forEach((a) => out.add(a));
  if (kind === "c13") for (const p of peaks.c13) if (p.shift >= lo && p.shift <= hi) p.atoms.forEach((a) => out.add(a));
  return [...out];
}

export interface PeakView {
  readonly left: number;
  readonly right: number;
}

/**
 * The window that fits a compound's own signals, so a spectrum opens filling the plot instead of
 * squeezed into a corner of the full axis. NMR pads 0.6 ppm (13C: 12 ppm) round the outermost
 * signals, at least 3 ppm wide (13C: 60); IR keeps the full axis. Never wider than AXES.
 */
export function peakView(kind: SpectrumKind, c: { readonly h1: readonly H1Peak[]; readonly c13: readonly C13Peak[] }): PeakView {
  const axis = AXES[kind];
  if (kind === "ir") return { left: axis.max, right: axis.min };
  const shifts = kind === "h1" ? c.h1.map((p) => p.shift) : c.c13.map((p) => p.shift);
  if (shifts.length === 0) return { left: axis.max, right: axis.min };
  const pad = kind === "h1" ? 0.6 : 12;
  const minSpan = kind === "h1" ? 3 : 60;
  let left = Math.max(...shifts) + pad;
  let right = Math.min(...shifts) - pad;
  if (left - right < minSpan) {
    const mid = (left + right) / 2;
    left = mid + minSpan / 2;
    right = mid - minSpan / 2;
  }
  return { left: Math.min(left, axis.max), right: Math.max(right, axis.min) };
}

/** The window for one signal's expansion: the whole multiplet plus a margin either side. */
export function multipletWindow(p: H1Peak): PeakView {
  const xs = multipletLines(p).map((l) => l.x);
  const spread = Math.max(...xs) - Math.min(...xs);
  const pad = Math.max(spread * 0.35, 0.02);
  return { left: Math.max(...xs) + pad, right: Math.min(...xs) - pad };
}

/** Label rows (0 or 1) so neighbouring peak labels never overprint: alternate when closer than minGap. */
export function labelRows(xs: readonly number[], minGap: number): number[] {
  const order = xs.map((x, i) => [x, i] as const).sort((a, b) => a[0] - b[0]);
  const rows = new Array<number>(xs.length).fill(0);
  let prevX = -Infinity;
  let prevRow = 1;
  for (const [x, i] of order) {
    rows[i] = x - prevX < minGap ? 1 - prevRow : 0;
    prevX = x;
    prevRow = rows[i];
  }
  return rows;
}
