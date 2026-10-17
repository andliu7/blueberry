/**
 * The best "in a row" per practice node, kept in this browser only.
 *
 * PRESENTATION, NOT PROGRESS: it pays no XP and no diamonds and unlocks
 * nothing (owner decision 9 of the 2026-09-29 prompt), so it needs no server
 * side and no economy change. The node's clear goes through app/progress like
 * every other lesson. Every storage call is guarded: private windows and
 * blocked storage throw, and the run must still play.
 */

const KEY = "bb-practice-best-v1";

type Bests = Record<string, number>;

function readAll(storage: Storage | undefined): Bests {
  try {
    const raw = storage?.getItem(KEY);
    if (raw === null || raw === undefined) return {};
    const parsed: unknown = JSON.parse(raw);
    return typeof parsed === "object" && parsed !== null ? (parsed as Bests) : {};
  } catch {
    return {};
  }
}

function defaultStorage(): Storage | undefined {
  try {
    return typeof localStorage === "undefined" ? undefined : localStorage;
  } catch {
    return undefined;
  }
}

export function readBestRun(nodeId: string, storage: Storage | undefined = defaultStorage()): number {
  const value = readAll(storage)[nodeId];
  return typeof value === "number" && Number.isFinite(value) ? value : 0;
}

/** Keeps the larger of the stored best and this run. Returns the best now stored. */
export function recordBestRun(nodeId: string, run: number, storage: Storage | undefined = defaultStorage()): number {
  const all = readAll(storage);
  const best = Math.max(all[nodeId] ?? 0, run);
  try {
    storage?.setItem(KEY, JSON.stringify({ ...all, [nodeId]: best }));
  } catch {
    // Storage refused; the run already happened and the screen still says so.
  }
  return best;
}
