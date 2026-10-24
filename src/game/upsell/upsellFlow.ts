/**
 * The Pro sheet waiting to be shown. Same shape as chest/chestFlow.ts: a tiny
 * module store with subscribe and getState, in the #/app cold load, so it
 * imports nothing (the rule and the sheet are lazy chunks).
 *
 * A lesson runs outside the Shell, so an offer made on a clear waits here and
 * shows on the way back to the path. That is what "never mid-lesson" means.
 */

export interface UpsellOffer {
  readonly trigger: "lesson" | "streak";
  /** This is the first completed lesson. */
  readonly firstLesson: boolean;
  /** The streak day count, for a streak trigger. */
  readonly streakDays?: number;
}

let pending: UpsellOffer | null = null;
const listeners = new Set<() => void>();

function set(next: UpsellOffer | null): void {
  pending = next;
  for (const listener of listeners) listener();
}

export const upsellFlow = {
  getState: (): UpsellOffer | null => pending,
  subscribe(listener: () => void): () => void {
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  },
};

/** Ask for the sheet. One waiting offer at most; a second is ignored. */
export function offerUpsell(offer: UpsellOffer): void {
  if (pending === null) set(offer);
}

export function closeUpsell(): void {
  if (pending !== null) set(null);
}
