/**
 * The four late chemical states keep their CSS off the #/app first paint.
 *
 * deprotonated, excitedState, enantiomers and solvated show up on a handful of
 * lessons and in the gallery, so their rules live in bloom-chem-states.css and
 * are fetched the first time one of them renders. Vite turns the dynamic
 * import into its own CSS chunk and a <link> it injects on demand. Until it
 * lands (a frame or two) the berry draws its plain body plus whatever the
 * eager CSS already gives it (the deprotonated badge chip), which is a fine
 * first frame.
 */

import type { BerryState } from "./berryState";

export const LAZY_STATES: ReadonlySet<BerryState> = new Set<BerryState>([
  "deprotonated",
  "excitedState",
  "enantiomers",
  "solvated",
]);

let loading: Promise<unknown> | null = null;

/** Fetch the stylesheet once if this state needs it. Safe to call every render. */
export function loadStateStyles(state: BerryState): void {
  if (loading !== null || !LAZY_STATES.has(state)) return;
  loading = import("./bloom-chem-states.css").catch(() => {
    // Offline or a stale chunk: let the next lazy state try again.
    loading = null;
  });
}
