/**
 * How account sync is going, as one word, for the Me tab's quiet status line.
 *
 * Its own tiny module rather than part of progressSync.ts, because Me reads it
 * on first paint and progressSync.ts is loaded only for a signed-in student
 * (App.tsx, ProgressSync). An external store (subscribe plus getSnapshot), the
 * same shape as progress.ts, so a component reads it with useSyncExternalStore.
 *
 *   syncing     a pull or push is running
 *   synced      the account holds everything this device does
 *   offline     the last request failed; it will retry
 *   local-only  no progress table (migration not applied) or no Supabase in
 *               this build: progress stays on the device this session
 */

export type SyncStatus = "syncing" | "synced" | "offline" | "local-only";

let current: SyncStatus = "synced";
const listeners = new Set<() => void>();

export function getSyncStatus(): SyncStatus {
  return current;
}

export function setSyncStatus(next: SyncStatus): void {
  if (next === current) return;
  current = next;
  for (const listener of listeners) listener();
}

export function subscribeSyncStatus(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}
