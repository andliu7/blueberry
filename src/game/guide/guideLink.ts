/**
 * WHERE AN OPEN GUIDEBOOK LIVES IN THE URL. Round 4: starting a lesson from
 * the guide and pressing the browser's Back landed on the bare path with the
 * guide shut, and a reload lost it too. So the open guide, and the stage open
 * in it, ride in the hash's own query beside ?unit=:
 *
 *   #/app/pathway?unit=u1&guide=u1      the Unit 1 guide, its default stage
 *   #/app/pathway?unit=u1&guide=u1.b    the same guide with stage b open
 *
 * Written with history.replaceState, so opening a fold never adds a history
 * entry and never fires hashchange (the guide closes itself on a hashchange,
 * because that is how a lesson start leaves the page). The pathway reopens
 * the guide when it mounts on a hash that names it (PathwayTab, OrgoMapTrack).
 *
 * How far the student had scrolled is a per-tab convenience, so it sits in
 * sessionStorage, and every read and write is guarded: a private window may
 * throw, and the page must still work without it.
 */
import { hashParam } from "../app/routes";

export interface GuideSpot {
  readonly unit: string;
  readonly stage: string | null;
}

export function guideInHash(): GuideSpot | null {
  const raw = hashParam("guide");
  if (raw === null || raw === "") return null;
  const [unit, stage] = raw.split(".");
  return { unit: unit!, stage: stage === undefined || stage === "" ? null : stage };
}

export function writeGuideToHash(spot: GuideSpot | null): void {
  if (typeof window === "undefined") return;
  const hash = window.location.hash;
  const q = hash.indexOf("?");
  const path = q === -1 ? hash : hash.slice(0, q);
  const params = new URLSearchParams(q === -1 ? "" : hash.slice(q + 1));
  if (spot === null) params.delete("guide");
  else params.set("guide", spot.stage === null ? spot.unit : `${spot.unit}.${spot.stage}`);
  const query = params.toString();
  const next = query === "" ? path : `${path}?${query}`;
  if (next === hash) return;
  window.history.replaceState(window.history.state, "", `${window.location.pathname}${window.location.search}${next}`);
}

const SCROLL_KEY = "bb.guide.scroll";

export function saveGuideScroll(unit: string, y: number): void {
  try {
    window.sessionStorage.setItem(SCROLL_KEY, JSON.stringify({ unit, y: Math.round(y) }));
  } catch {
    // No storage: the guide still works, it just opens at the top.
  }
}

export function savedGuideScroll(unit: string): number {
  try {
    const saved = JSON.parse(window.sessionStorage.getItem(SCROLL_KEY) ?? "null") as { unit?: string; y?: number } | null;
    return saved !== null && saved.unit === unit && typeof saved.y === "number" ? saved.y : 0;
  } catch {
    return 0;
  }
}
