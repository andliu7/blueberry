/**
 * CHESTS ARE EARNED AND SAVED (owner, 2026-10-20). This file is the plumbing
 * between the economy and the two chest screens; it has no React in it.
 *
 *   1. Something earns a chest: a daily quest, a section final, the daily
 *      gift, the onboarding gift. The economy saves it and says so on the
 *      receipt (`receipt.chestsEarned`).
 *   2. `watchEarnedChests` sees that receipt and OFFERS the chest: the
 *      "Open now / Save for later" sheet (ChestSheet.tsx).
 *   3. "Open now", a saved chest in Me, or the map's treasure chest asks for
 *      the opening with `playChest`, and ChestOpening.tsx plays C1.
 *
 * Saving needs no code at all: an earned chest IS saved until it is opened,
 * so "Save for later" only closes the sheet.
 *
 * WHY A SMALL STORE OF ITS OWN. The opening is one full screen layer, mounted
 * once at the app root (ChestHost.tsx), but it is asked for from three places
 * (the sheet, the Me tab, the pathway). A module store with subscribe and
 * getState is the same shape as `progress`, so any screen can call
 * `playChest(...)` without passing callbacks down through the tree.
 */

import type { ChestSource, SavedChest } from "@blueberry/economy";
import { plural } from "@/lib/helpers";
import type { ProgressSource } from "../app/progress";
import { checkpointUnitFor, isSectionFinal, pathwayNode } from "../demo/pathwayMap";
import { reviewCheckpointFor } from "../tabs/pathway/reviewCheckpoints";
import { chestIdFor } from "../tabs/pathway/pathwaySections";

/* ------------------------------------------------------------- the copy -- */

/** What each kind of chest is called, and the one line saying what earned it. */
export const CHEST_COPY: Readonly<Record<ChestSource, { readonly title: string; readonly why: string }>> = {
  daily_quest: { title: "Quest chest", why: "You finished a daily quest." },
  section_final: { title: "Section chest", why: "You cleared a section final." },
  daily_gift: { title: "Daily gift", why: "A chest for showing up today." },
  onboarding_gift: { title: "Welcome gift", why: "A chest to start you off." },
};

/** "1 diamond", "5 diamonds". */
export function diamondsLabel(n: number): string {
  return plural(n, "diamond", "diamonds");
}

/** The sheet's headline: "You earned a daily gift!", or "You earned 2 chests!" when several landed at once. */
export function offerHeadline(chests: readonly SavedChest[]): string {
  if (chests.length === 1) return `You earned a ${CHEST_COPY[chests[0]!.source].title.toLowerCase()}!`;
  return `You earned ${chests.length} chests!`;
}

/* ------------------------------------------------------- the count up -- */

/** C1 throws five diamonds, whatever the chest holds. */
export const GEM_COUNT = 5;

/**
 * What the counter reads after each diamond lands: `count` steps from
 * `before` to `before + total`. The last step is always the true total, so a
 * chest of 7 (not a multiple of five) still ends on the right number. The
 * opening calls it with `before` 0, as diamonds landed so far.
 */
export function counterSteps(before: number, total: number, count: number = GEM_COUNT): readonly number[] {
  const steps: number[] = [];
  for (let i = 1; i <= count; i++) steps.push(before + Math.round((total * i) / count));
  return steps;
}

/* ------------------------------------------------------------ the taps -- */

/** C1: the third tap opens it. */
export const TAPS_TO_OPEN = 3;

/**
 * One tap on a closed chest: the new count, and whether this tap opens it.
 * Under reduced motion the first tap opens it, since the build up is all
 * movement and the movement is what was asked to go.
 */
export function tapChest(taps: number, reducedMotion: boolean): { readonly taps: number; readonly opens: boolean } {
  const next = Math.min(TAPS_TO_OPEN, taps + 1);
  return { taps: next, opens: reducedMotion || next >= TAPS_TO_OPEN };
}

/** The line under the chest before it opens, by taps so far. */
export function tapHint(taps: number): string {
  if (taps === 0) return "Tap the chest";
  return taps === 1 ? "Again!" : "One more!";
}

/** The headline once it is open: what it paid, never a fraction. */
export function paidHeadline(paid: OpenResult): string {
  if (paid.diamonds <= 0 && paid.xp <= 0) return "Already opened";
  const parts: string[] = [];
  if (paid.diamonds > 0) parts.push(`+${diamondsLabel(paid.diamonds)}`);
  if (paid.xp > 0) parts.push(`+${paid.xp} XP`);
  return parts.join(" and ");
}

/* ------------------------------------------------------------ the store -- */

/** What opening paid. The economy decides it; the screen only animates it. */
export interface OpenResult {
  readonly diamonds: number;
  readonly xp: number;
}

/** One request to play C1. `open` does the economy write, on the third tap. */
export interface PlayRequest {
  /** The card under the total, e.g. "From your Daily gift". */
  readonly detail: string;
  readonly open: () => OpenResult;
}

export interface ChestFlowState {
  /** Chest ids waiting for "Open now / Save for later", oldest first. */
  readonly offer: readonly string[];
  /** The opening on screen, or null. */
  readonly play: PlayRequest | null;
}

let state: ChestFlowState = { offer: [], play: null };
const listeners = new Set<() => void>();

function set(next: ChestFlowState): void {
  state = next;
  for (const listener of listeners) listener();
}

export const chestFlow = {
  getState: (): ChestFlowState => state,
  subscribe(listener: () => void): () => void {
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  },
};

/** Offer these chests in the sheet. An id already waiting is not added twice. */
export function offerChests(ids: readonly string[]): void {
  const fresh = ids.filter((id) => !state.offer.includes(id));
  if (fresh.length > 0) set({ ...state, offer: [...state.offer, ...fresh] });
}

/** Close the sheet. The chests stay saved; that is what "Save for later" means. */
export function dismissOffer(): void {
  if (state.offer.length > 0) set({ ...state, offer: [] });
}

/** Play C1. A second request while one is playing is ignored. */
export function playChest(request: PlayRequest): void {
  if (state.play === null) set({ ...state, play: request });
}

/** The opening was closed. */
export function finishPlay(): void {
  if (state.play !== null) set({ ...state, play: null });
}

/** Test hook: back to nothing offered and nothing playing. */
export function resetChestFlow(): void {
  set({ offer: [], play: null });
}

/* ----------------------------------------------------- economy wiring -- */

/** Sum the XP lines of the store's latest receipt. */
function lastXp(source: ProgressSource): number {
  return (source.getSnapshot().lastReceipt?.xp ?? []).reduce((sum, line) => sum + line.amount, 0);
}

/** Open these saved chests, one event each, and add up what they paid. */
export function openSaved(source: ProgressSource, ids: readonly string[]): OpenResult {
  let diamonds = 0;
  let xp = 0;
  for (const id of ids) {
    diamonds += source.openChest(id);
    xp += lastXp(source);
  }
  return { diamonds, xp };
}

/** "Open all": every saved chest in one go; the economy merges the lines. */
export function openAll(source: ProgressSource): OpenResult {
  const diamonds = source.openAllChests();
  return { diamonds, xp: diamonds > 0 ? lastXp(source) : 0 };
}

/**
 * Offer every chest a receipt earns, from now on. It listens to the store
 * itself, not to React renders, so two receipts in one tick (the onboarding
 * gift then the daily gift, or a clear that finished a quest then the section
 * chest) are both seen even though only the second is `lastReceipt` after.
 */
export function watchEarnedChests(source: ProgressSource): () => void {
  let seen = source.getSnapshot().lastReceipt;
  return source.subscribe(() => {
    const receipt = source.getSnapshot().lastReceipt;
    if (receipt === seen) return;
    seen = receipt;
    if (receipt !== null && receipt.chestsEarned.length > 0) offerChests(receipt.chestsEarned.map((chest) => chest.id));
  });
}

/**
 * On every app open: the onboarding gift (saved once, ever) and today's daily
 * gift (once per local day). Both return null when there is nothing new, so
 * calling this on every open is the whole rule. Returns how many were saved.
 */
export function claimAppOpenGifts(source: ProgressSource): number {
  const onboarding = source.claimOnboardingGift();
  const daily = source.claimDailyGift();
  return (onboarding === null ? 0 : 1) + (daily === null ? 0 : 1);
}

/**
 * The chest a cleared node earns, or null. A section final (a stage quiz or a
 * unit checkpoint) or a review stop ends a section, and the pathway draws that
 * section's chest under `chestIdFor(node)` (pathwaySections.ts), so the chest
 * saved here is the same chest the map shows.
 */
export function sectionChestFor(nodeId: string): string | null {
  const node = pathwayNode(nodeId);
  // The unit checkpoint is not a map node (pathwayNode finds no row for it),
  // so it is asked for by id.
  const final =
    (node !== null && isSectionFinal(node)) || checkpointUnitFor(nodeId) !== null || reviewCheckpointFor(nodeId) !== null;
  return final ? chestIdFor(nodeId) : null;
}

/** Call after a clear is banked: saves the section's chest when the node ends a section. */
export function earnChestForClear(source: ProgressSource, nodeId: string): void {
  const chestId = sectionChestFor(nodeId);
  if (chestId !== null) source.earnSectionChest(chestId);
}
