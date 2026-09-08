/**
 * The current route, as React state.
 *
 * useSyncExternalStore is React's hook for reading state that lives outside
 * React (here, window.location.hash) without tearing: React subscribes to the
 * "hashchange" event and re-reads the snapshot when it fires. A useState plus
 * useEffect pair does the same job less safely, which is why the Phase 4 demo
 * already used this hook for the reduced-motion query.
 *
 * The snapshot is the raw hash string, not the parsed Route, because
 * useSyncExternalStore compares snapshots by identity and a freshly parsed
 * object would never be equal to the last one. Parsing happens in useMemo.
 */

import { useMemo, useSyncExternalStore } from "react";
import { parseHash, type Route } from "./routes";

function subscribe(onChange: () => void): () => void {
  window.addEventListener("hashchange", onChange);
  return () => window.removeEventListener("hashchange", onChange);
}

function readHash(): string {
  return window.location.hash;
}

export function useHashRoute(): Route {
  const hash = useSyncExternalStore(subscribe, readHash);
  return useMemo(() => parseHash(hash), [hash]);
}

/** Navigate. Plain assignment so the back button works as the browser intends. */
export function navigate(href: string): void {
  window.location.hash = href.startsWith("#") ? href.slice(1) : href;
}
