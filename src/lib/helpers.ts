/**
 * Small helpers that used to be hand-rolled in several files. One copy each,
 * no imports, so the site and the game can both reach them through
 * "@/lib/helpers" without pulling anything else in.
 */

/** `value` held inside [low, high]. Low wins when high < low, so an empty range gives `low`. */
export function clamp(value: number, low: number, high: number): number {
  return Math.max(low, Math.min(high, value));
}

/** `value` held inside [0, 1], for fractions and animation progress. */
export function clamp01(value: number): number {
  return clamp(value, 0, 1);
}

/** "1 day" and "2 days": the count, then the singular or the plural word. */
export function plural(count: number, one: string, many: string): string {
  return `${count} ${count === 1 ? one : many}`;
}

/** A seeded shuffle (Fisher-Yates over a small LCG), so one seed always deals one order. */
export function seededShuffle<T>(items: readonly T[], seed: number): T[] {
  const out = [...items];
  let state = seed >>> 0 || 1;
  for (let i = out.length - 1; i > 0; i -= 1) {
    state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
    const j = state % (i + 1);
    [out[i], out[j]] = [out[j]!, out[i]!];
  }
  return out;
}

/** A shuffled copy (Fisher-Yates with Math.random), for orders nobody needs to reproduce. */
export function shuffle<T>(items: readonly T[]): T[] {
  const out = [...items];
  for (let i = out.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [out[i], out[j]] = [out[j]!, out[i]!];
  }
  return out;
}

/**
 * mulberry32: a tiny seeded random number generator. Same seed, same sequence,
 * which is what makes "seeded per day" tips and "same name, same art" folders work.
 */
export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** The time zone this device is in, "UTC" when the browser will not say. */
export function deviceZone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
  } catch {
    return "UTC";
  }
}
