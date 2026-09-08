/**
 * The one hook the deck surfaces share.
 *
 * `useSyncExternalStore` is React's official way to read a store that lives
 * outside React, which is what DeckSource is. It takes a subscribe function
 * and a getSnapshot function and re-renders the component when the store
 * commits. The reason it exists rather than a useState plus useEffect pair:
 * React 18 and later can render a component twice before painting, and a hand
 * rolled subscription can show one half of the screen the old snapshot and the
 * other half the new one. This hook cannot tear.
 *
 * The same pattern is already in apps/web/src/app/hooks.ts for progress and
 * language. This is a third instance of a shape the repo already uses, not a
 * new idea.
 *
 * The source arrives as an ARGUMENT rather than being imported. The local
 * store module is owned by another builder and Phase 6 replaces it with a
 * Supabase backed one, so a surface that imported a concrete store by name
 * would have to be edited on that swap. Taking it as a parameter means the
 * swap happens once, where the surface is mounted.
 */

import { useSyncExternalStore } from "react";
import type { DeckSnapshot, DeckSource } from "../types";

export function useDeckSnapshot(source: DeckSource): DeckSnapshot {
  return useSyncExternalStore(source.subscribe, source.getSnapshot);
}
