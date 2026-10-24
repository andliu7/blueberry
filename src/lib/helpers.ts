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
  let state = seed >>> 0 || 1;
  let bound = items.length;
  // shuffle asks once per position from the end down, so call k picks below items.length - k.
  // The +0.5 centres the value inside its slot, so floor gives back exactly the old modulo pick.
  return shuffle(items, () => {
    state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
    const pick = state % bound;
    const r = (pick + 0.5) / bound;
    bound -= 1;
    return r;
  });
}

/**
 * A shuffled copy (Fisher-Yates). Math.random by default, for orders nobody needs to
 * reproduce. Pass a seeded random, such as mulberry32(seed), to deal the same order every time.
 */
export function shuffle<T>(items: readonly T[], random: () => number = Math.random): T[] {
  const out = [...items];
  for (let i = out.length - 1; i > 0; i -= 1) {
    const j = Math.floor(random() * (i + 1));
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
