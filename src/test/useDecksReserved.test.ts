// @vitest-environment jsdom

/**
 * A published deck may never take a built-in deck's id (validator finding,
 * 2026-10-20). The sheet is hand editable, so a row calling itself `grignard`
 * would shadow or race the real deck at `#/deck/grignard`. And since the
 * built-ins are a lazy chunk, the check needs them: if that chunk fails to
 * load, the published list is refused rather than accepted unchecked.
 */

import { afterEach, describe, expect, it, vi } from "vitest";
import { act, createElement } from "react";
import { createRoot, type Root } from "react-dom/client";
import type { DecksSnapshot } from "@/lib/useDecks";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const BUILT_IN = { id: "grignard", title: "Grignard (built in)", group: "lab", questions: [{ q: "real", a: "real" }] };

const published = (id: string, title: string) => ({ id, title, questions: [{ q: `${title} q`, a: `${title} a` }] });

let root: Root | null = null;
let host: HTMLElement | null = null;

afterEach(() => {
  act(() => root?.unmount());
  host?.remove();
  root = null;
  host = null;
  vi.doUnmock("@/data/decks");
  vi.doUnmock("@/lib/appsScript");
  vi.resetModules();
});

/** A fresh module store with the sheet and the built-in chunk faked, read to settled. */
async function settledDecks(builtIns: "ok" | "fail", sheet: unknown[]): Promise<DecksSnapshot> {
  vi.resetModules();
  vi.doMock("@/lib/appsScript", () => ({
    fetchPublishedDecks: () => Promise.resolve({ decks: sheet, shelves: [] }),
  }));
  vi.doMock("@/data/decks", () => {
    if (builtIns === "fail") throw new Error("Failed to fetch dynamically imported module");
    return { DECKS: [BUILT_IN] };
  });
  const { useDecks } = await import("@/lib/useDecks");

  let seen: DecksSnapshot | null = null;
  const Probe = () => {
    seen = useDecks();
    return null;
  };
  host = document.createElement("div");
  document.body.appendChild(host);
  root = createRoot(host);
  await act(async () => {
    root!.render(createElement(Probe));
  });
  for (let i = 0; i < 50 && seen!.loading; i++) {
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 10));
    });
  }
  expect(seen!.loading).toBe(false);
  return seen!;
}

describe("useDecks reserved ids", () => {
  it("refuses a published deck that claims a built-in id and keeps the others", async () => {
    const snap = await settledDecks("ok", [published("grignard", "Impostor"), published("my-deck", "Mine")]);

    expect(snap.published.map((d) => d.id)).toEqual(["my-deck"]);
    const grignards = snap.decks.filter((d) => d.id === "grignard");
    expect(grignards).toHaveLength(1);
    expect(grignards[0].title).toBe("Grignard (built in)");
    expect(snap.decks.map((d) => d.id)).toEqual(["grignard", "my-deck"]);
  });

  it("accepts no published deck at all when the built-ins fail to load", async () => {
    const snap = await settledDecks("fail", [published("grignard", "Impostor"), published("my-deck", "Mine")]);

    expect(snap.published).toEqual([]);
    expect(snap.decks).toEqual([]);
  });
});
