// @vitest-environment jsdom

/**
 * The Review library as glass folders (owner, 15 Oct 2026; review/DeckFolders.tsx and
 * ui/glass-folder-cards.tsx). Pins what the first review round found unpinned:
 *
 * 1. GROUPING IS REAL DATA. One folder per deck folder in the course's order, each
 *    with its true deck and card count, and a folder of more than four decks shows
 *    three of them plus an "All N decks" file that opens the folder page.
 * 2. THE SCREEN READER HEARS THE DECK COUNT, not the number of files on show.
 * 3. ONE FOLDER OPEN AT A TIME, and Tab leaving an open folder closes it.
 * 4. A SEARCH SWAPS THE FOLDERS FOR TILE ROWS, and clearing it brings them back.
 * 5. NOTHING ANIMATES ON FIRST PAINT: the meta line rolls only on a change, and the
 *    open fan leaves every file a strip of at least 44px to press, read from the
 *    stylesheet that ships.
 */

import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { act, createElement } from "react";
import { createRoot, type Root } from "react-dom/client";
import { readFileSync } from "node:fs";
import { DECKS } from "@/data/decks";
import { COURSES, DECK_GROUPS, deckCount, foldersUnder } from "@/data/types";
import { buildDeckFolders } from "@/components/review/DeckFolders";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
vi.setConfig({ testTimeout: 40_000 });

vi.mock("@/lib/appsScript", () => ({
  fetchPublishedDecks: async () => ({ decks: [], shelves: [] }),
  postToAppsScript: async () => ({ ok: false }),
  endpointFor: () => undefined,
}));
vi.mock("@/lib/useSession", () => ({ useSession: () => null }));

describe("folders come from the deck data", () => {
  const folders = buildDeckFolders(DECKS);

  it("lists every non-empty deck folder, in the course's order", () => {
    const order = COURSES.flatMap(foldersUnder).filter((id) => DECKS.some((d) => (d.group ?? "lab") === id));
    expect(folders.map((f) => f.id)).toEqual(order);
    for (const f of folders) expect(f.title).toBe(DECK_GROUPS.find((g) => g.id === f.id)!.title);
  });

  it("counts the decks and cards each folder really holds", () => {
    for (const f of folders) {
      const inFolder = DECKS.filter((d) => (d.group ?? "lab") === f.id);
      const cards = inFolder.reduce((s, d) => s + deckCount(d), 0);
      expect(f.meta.startsWith(`${inFolder.length} ${inFolder.length === 1 ? "deck" : "decks"} · ${cards} `)).toBe(true);
    }
  });

  it("shows at most four files, the fourth opening the whole folder when there are more", () => {
    for (const f of folders) {
      const inFolder = DECKS.filter((d) => (d.group ?? "lab") === f.id);
      expect(f.files.length).toBe(Math.min(4, inFolder.length));
      if (inFolder.length > 4) {
        expect(f.files[3]).toMatchObject({ name: `All ${inFolder.length} decks`, href: `#/folder/${f.id}` });
        expect(f.files.slice(0, 3).map((x) => x.href)).toEqual(inFolder.slice(0, 3).map((d) => `#/deck/${d.id}`));
      } else {
        expect(f.files.map((x) => x.href)).toEqual(inFolder.map((d) => `#/deck/${d.id}`));
      }
    }
    // The real library has a folder big enough to need the overflow file (Carbonyls).
    expect(folders.some((f) => f.files.some((x) => x.name.startsWith("All ")))).toBe(true);
  });
});

describe("the Review page's folders", () => {
  let root: Root;
  let host: HTMLElement;
  const roots = () => Array.from(host.querySelectorAll<HTMLElement>(".gf-root"));
  const openRoots = () => roots().filter((r) => r.hasAttribute("data-open"));
  const hit = (r: HTMLElement) => r.querySelector<HTMLButtonElement>(".gf-hit")!;

  beforeAll(async () => {
    window.scrollTo = () => {};
    window.matchMedia ??= ((q: string) => ({
      matches: false,
      media: q,
      addEventListener() {},
      removeEventListener() {},
      addListener() {},
      removeListener() {},
      onchange: null,
      dispatchEvent: () => false,
    })) as unknown as typeof window.matchMedia;
    const { StudyDecksPage } = await import("@/components/StudyDecksPage");
    host = document.createElement("div");
    document.body.appendChild(host);
    root = createRoot(host);
    await act(async () => {
      root.render(createElement(StudyDecksPage));
    });
  }, 60_000);

  afterAll(() => {
    act(() => root.unmount());
    host.remove();
  });

  it("names each folder by its decks and cards, not by the files on show", () => {
    const folders = buildDeckFolders(DECKS);
    expect(roots().length).toBe(folders.length);
    folders.forEach((f, i) => {
      const label = hit(roots()[i]).getAttribute("aria-label");
      expect(label).toBe(`Open ${f.title}, ${f.meta.replace(" · ", ", ")}`);
      expect(label).not.toMatch(/\bitems?\b/);
    });
  });

  it("keeps one folder open at a time", async () => {
    const [a, b] = roots();
    await act(async () => hit(a).click());
    expect(openRoots()).toEqual([a]);
    // A real press on B sends pointerdown (outside A) before the click.
    await act(async () => {
      hit(b).dispatchEvent(new Event("pointerdown", { bubbles: true }));
      hit(b).click();
    });
    expect(openRoots()).toEqual([b]);
  });

  it("closes an open folder when Tab moves focus out of it", async () => {
    const [a, b] = roots();
    await act(async () => {
      hit(b).focus();
    });
    expect(openRoots()).toEqual([b]);
    await act(async () => {
      hit(a).focus();
    });
    expect(openRoots()).toEqual([]);
  });

  it("swaps the folders for tile rows while searching", async () => {
    const input = host.querySelector<HTMLInputElement>('input[aria-label="Search decks"]')!;
    const type = async (v: string) => {
      // React tracks an input's value itself; set it the way the browser does.
      Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")!.set!.call(input, v);
      await act(async () => {
        input.dispatchEvent(new Event("input", { bubbles: true }));
      });
    };
    await type("grig");
    expect(roots().length).toBe(0);
    expect(host.querySelector('a[href="#/deck/grignard"]')).not.toBeNull();
    await type("");
    expect(roots().length).toBe(buildDeckFolders(DECKS).length);
  });
});

describe("the shipped stylesheet", () => {
  const css = readFileSync("src/components/ui/glass-folder-cards.css", "utf8");
  const rule = (selector: string) => {
    const at = css.indexOf(selector + " {");
    expect(at).toBeGreaterThan(-1);
    return css.slice(at, css.indexOf("}", at));
  };
  const px = (block: string, name: string) => Number(new RegExp(`${name}:\\s*(-?[\\d.]+)`).exec(block)![1]);

  it("does not roll the meta line on mount", () => {
    expect(rule(".gf-meta")).not.toMatch(/animation/);
    expect(rule(".gf-meta--roll")).toMatch(/animation: gf-roll/);
  });

  it("lets art arrive without a fade when the folder is told not to appear", () => {
    expect(css).toMatch(/\.gf-root\[data-still\] canvas\.gf-art \{ transition-property: transform; \}/);
  });

  it("leaves every file in the open fan a strip of at least 44px", () => {
    const open = css.slice(css.indexOf(".gf-root[data-open] {"));
    expect(px(open, "--gf-stack")).toBeGreaterThanOrEqual(44);
  });
});
