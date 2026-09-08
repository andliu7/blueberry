import { gzipSync } from "node:zlib";

/**
 * Gzip, at one level, forever.
 *
 * Every budget in the CLAUDE.md table that says "gzipped" is compared against a number
 * produced here. The compression level is part of the measurement, not an implementation
 * detail: level 1 and level 9 differ by several percent on JavaScript, which is enough to
 * move a borderline bundle across a ceiling. Changing this constant silently re-scores
 * every historical budget number in the repository, so it is a named export with this
 * comment attached to it.
 *
 * Level 6 is zlib's default and is what a stock nginx, Cloudflare, or GitHub Pages edge
 * serves. Level 9 would report a smaller number for the same bytes, which is the
 * permissive direction, so 6 is both the realistic choice and the conservative one.
 */
export const GZIP_LEVEL = 6;

/** 1 KB as used by every ceiling in the Budgets table. Binary, not 1000. */
export const KB = 1024;

/** Measured gzipped size of exactly these bytes. No estimation anywhere in this path. */
export function gzippedByteLength(bytes: Uint8Array): number {
  return gzipSync(bytes, { level: GZIP_LEVEL }).byteLength;
}

/**
 * Format a byte count for a BudgetResult.
 *
 * Both the exact byte count and the KB figure are printed. The KB figure is what a human
 * compares against the table in CLAUDE.md; the exact count is what makes two runs
 * comparable and what makes a one-byte regression visible.
 */
export function formatBytes(bytes: number): string {
  return `${(bytes / KB).toFixed(1)} KB (${bytes} bytes)`;
}

/**
 * The ceiling comparison, as one function used by every size gate.
 *
 * It is three lines and it is factored out anyway, because the direction of this
 * comparison is the one thing in a budget gate that can be wrong while every number in
 * the report looks right. A gate with the inequality inverted reports "pass" on the day
 * the bundle doubles. budget-gate-self-test drives it at the boundary, one byte under,
 * exactly on, and one byte over, so the direction is asserted rather than reviewed.
 *
 * At the ceiling exactly is within budget. "150 KB gzipped" reads as a limit not to be
 * exceeded, not as a value to stay strictly below.
 */
export function isWithinCeiling(measuredBytes: number, ceilingKb: number): boolean {
  return measuredBytes <= ceilingKb * KB;
}

/** Format a ceiling expressed in KB. */
export function formatCeiling(ceilingKb: number): string {
  return `${ceilingKb} KB (${ceilingKb * KB} bytes)`;
}
