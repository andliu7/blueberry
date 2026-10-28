// @vitest-environment jsdom

/**
 * Review, SITE-REPLAN.md phase 7: the flashcard decks as the Review destination.
 *
 * The phase's checks (section 11 and the phase brief), against the real router and pages:
 *
 * 1. EVERY OLD DECK AND FOLDER ADDRESS STILL RESOLVES. #/study-decks, every #/folder/<id>
 *    and every #/deck/<id> in the registry, each walked through `App` itself, landing on its
 *    own heading and never the 404. (#/d/decks and #/d/imports are dashboard addresses; their
 *    redirects belong to phase 8, Me, with the rest of #/d/...)
 * 2. NO UNLABELLED COUNTERS REMAIN. Every Review page, with progress saved, is searched for
 *    a bare "3 / 44" or "4/44", and for the old traffic-light dots. A slash pair the deck's
 *    own content carries (the IR deck's "2720/2820" doublet, in cm-1) is chemistry, not a
 *    counter, so it is allowed only where the data itself spells it.
 * 3. FLIP AND HOLD TILT WORK BY POINTER (mouse and touch send the same pointer events) AND
 *    KEYBOARD. A tap flips; a hold tilts, at most 8deg, and letting go does not flip; Space
 *    tapped flips, Space held tilts; Enter flips; the arrows move.
 * 4. REDUCED MOTION SWAPS THE FLIP FOR A CROSSFADE, read from the stylesheet that ships.
 * 5. CHEMISTRY IS DRAWN. A card whose data carries a drawing shows that drawing, on the
 *    front masked and on the back whole, never its file name or a typed structure.
 */

import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { act, createElement } from "react";
import { createRoot, type Root } from "react-dom/client";
import { readFileSync } from "node:fs";
import { DECKS } from "@/data/decks";
import { DECK_GROUPS, isReference } from "@/data/types";
import { redirectFor } from "@/lib/redirects";
import { titleForRoute } from "@/lib/useDocumentTitle";
import { dueAcross, tallyWords } from "@/lib/reviewProgress";
import { NOT_FOUND_TITLE } from "@/lib/statusCopy";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
// Each page settles in polls of up to 3s; under the full suite the machine is busy.
vi.setConfig({ testTimeout: 40_000 });

// No network: no published decks, and no session.
vi.mock("@/lib/appsScript", () => ({
  fetchPublishedDecks: async () => ({ decks: [], shelves: [] }),
  postToAppsScript: async () => ({ ok: false }),
  endpointFor: () => undefined,
}));
vi.mock("@/lib/useSession", () => ({ useSession: () => null }));

const NOT_FOUND = NOT_FOUND_TITLE;
let root: Root;
let host: HTMLElement;

/** Polls until `until` holds, for up to 15 seconds of wall time (lazy pages behind the loader). */
async function settle(until: () => boolean) {
  const deadline = Date.now() + 15_000;
  while (!until() && Date.now() < deadline) {
    await act(async () => {
      await new Promise((r) => setTimeout(r, 50));
    });
  }
}
async function visit(address: string) {
  await act(async () => {
    window.location.hash = `#/${address}`;
  });
}
const h1 = () => host.querySelector("h1")?.textContent ?? "";
const card = () => host.querySelector<HTMLElement>(".rv-tilt");
const flipped = () => host.querySelector(".rv-flip")?.hasAttribute("data-flipped") ?? false;
const held = () => card()?.hasAttribute("data-held") ?? false;

// A student part-way through Grignard: 6 Got it, 3 Unsure, 2 Missed.
const GRIGNARD_KEY = "grignard_lcta_progress_v1";
const GRIGNARD_TITLE = DECKS.find((d) => d.id === "grignard")!.title;
const seed = () => {
  const status: Record<number, string> = {};
  for (let i = 1; i <= 11; i++) status[i] = i <= 6 ? "green" : i <= 9 ? "yellow" : "red";
  localStorage.setItem(GRIGNARD_KEY, JSON.stringify({ status, note: "" }));
};

beforeAll(async () => {
  window.scrollTo = () => {};
  Element.prototype.scrollIntoView = () => {};
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
  globalThis.IntersectionObserver ??= class {
    observe() {}
    unobserve() {}
    disconnect() {}
    takeRecords() {
      return [];
    }
  } as unknown as typeof IntersectionObserver;
  seed();
  window.location.hash = "#/study-decks";
  const { default: App } = await import("@/App");
  host = document.createElement("div");
  document.body.appendChild(host);
  root = createRoot(host);
  await act(async () => {
    root.render(createElement(App));
  });
  await settle(() => h1() === "Review");
}, 60000);

afterAll(() => {
  act(() => root.unmount());
  host.remove();
});

const ADDRESSES: { from: string; to: string; heading: string }[] = [
  { from: "study-decks", to: "#/study-decks", heading: "Review" },
  ...DECK_GROUPS.map((g) => ({ from: `folder/${g.id}`, to: `#/folder/${g.id}`, heading: g.title })),
  ...DECKS.map((d) => ({ from: `deck/${d.id}`, to: `#/deck/${d.id}`, heading: d.title })),
];

describe("every old deck and folder address still resolves", () => {
  it.each(ADDRESSES.map((a) => [a.from, a] as const))("#/%s", async (_, a) => {
    await visit(a.from);
    await settle(() => window.location.hash === a.to && h1() === a.heading);
    expect(window.location.hash).toBe(a.to);
    expect(h1()).toBe(a.heading);
    expect(document.body.textContent).not.toContain(NOT_FOUND);
    const route = a.to.slice(2);
    expect(redirectFor(route)).toBeNull();
    expect(titleForRoute(route)).not.toContain("Not Found");
  });
});

describe("no unlabelled counters remain", () => {
  const BARE = /\d+\s*\/\s*\d+/;
  it("the pattern catches the old counters (the check can fail)", () => {
    expect(BARE.test("4 / 44 reviewed")).toBe(true);
    expect(BARE.test("4/44")).toBe(true);
    expect(BARE.test("Got it 6 · Unsure 3 · Missed 2 · 44 cards")).toBe(false);
  });

  /** Every slash pair the deck data itself writes (tags and maths delimiters removed). */
  const CONTENT = new Set(
    JSON.stringify(DECKS)
      .replace(/<[^>]+>|\$/g, "")
      .match(new RegExp(BARE.source, "g")) ?? [],
  );

  it.each(ADDRESSES.map((a) => [a.from, a] as const))(
    "#/%s",
    async (_, a) => {
      await visit(a.from);
      await settle(() => h1() === a.heading);
      const text = host.textContent ?? "";
      const bare = (text.match(new RegExp(BARE.source, "g")) ?? []).filter((m) => !CONTENT.has(m));
      expect(bare).toEqual([]);
      // The traffic-light dots, three bare numbers beside coloured circles.
      expect(host.querySelector(".bg-red-400, .bg-yellow-400, .bg-green-400")).toBeNull();
    },
  );

  it("a deck's progress and position are in words", async () => {
    await visit("deck/grignard");
    await settle(() => h1() === GRIGNARD_TITLE && card() !== null);
    expect(host.textContent).toContain("Every card: card 1 of 44");
    expect(host.textContent).toContain("Got it 6 · Unsure 3 · Missed 2 · 44 cards");
  });

  it("Review opens on Due today, labelled, with the deck that holds them", async () => {
    await visit("study-decks");
    await settle(() => h1() === "Review");
    const due = host.querySelector('[aria-labelledby="due-today"]')!;
    expect(due.textContent).toContain("Due today");
    expect(due.textContent).toContain("5 cards due");
    expect(due.querySelector("a")?.getAttribute("href")).toBe("#/deck/grignard?due=1");
    expect(dueAcross(DECKS)).toEqual({ count: 5, deckId: "grignard" });
    expect(tallyWords({ red: 0, yellow: 0, green: 0 })).toBe("Not started");
  });

  it("the Due today link opens a pass over the Missed and Unsure cards only", async () => {
    await visit("deck/grignard?due=1");
    await settle(() => (host.textContent ?? "").includes("Missed and Unsure: card 1 of 5"));
    expect(host.textContent).toContain("Missed and Unsure: card 1 of 5");
    // Leave, so the next test opens the deck afresh on its whole pass.
    await visit("study-decks");
    await settle(() => h1() === "Review");
  });
});

/** A pointer event. jsdom has no PointerEvent; React reads the type and the coordinates. */
function pointer(el: HTMLElement, type: string, x = 10, y = 10) {
  el.dispatchEvent(new MouseEvent(type, { bubbles: true, cancelable: true, clientX: x, clientY: y, button: 0 }));
}
const key = (type: "keydown" | "keyup", k: string, target: EventTarget = document.body) =>
  target.dispatchEvent(new KeyboardEvent(type, { key: k, code: k === " " ? "Space" : k, bubbles: true, cancelable: true }));

describe("flip and hold tilt, by pointer and keyboard", () => {
  beforeAll(async () => {
    await visit("deck/grignard");
    await settle(() => h1() === GRIGNARD_TITLE && card() !== null);
  });

  it("a tap flips the card, and a second tap turns it back", async () => {
    expect(flipped()).toBe(false);
    await act(async () => {
      pointer(card()!, "pointerdown");
      pointer(card()!, "pointerup");
    });
    expect(flipped()).toBe(true);
    await act(async () => {
      pointer(card()!, "pointerdown");
      pointer(card()!, "pointerup");
    });
    expect(flipped()).toBe(false);
  });

  it("a hold tilts toward the finger, at most 8deg, and letting go does not flip", async () => {
    await act(async () => pointer(card()!, "pointerdown", 0, 0));
    // Not yet at a tap's length; held once HOLD_MS has passed (polled, so a slow
    // machine running the whole suite does not turn a late timer into a failure).
    expect(held()).toBe(false);
    await settle(held);
    expect(held()).toBe(true);
    const rx = parseFloat(card()!.style.getPropertyValue("--rv-rx"));
    const ry = parseFloat(card()!.style.getPropertyValue("--rv-ry"));
    expect(Math.abs(rx)).toBeLessThanOrEqual(8);
    expect(Math.abs(ry)).toBeLessThanOrEqual(8);
    await act(async () => pointer(card()!, "pointerup", 0, 0));
    expect(held()).toBe(false);
    expect(flipped()).toBe(false);
    expect(card()!.style.getPropertyValue("--rv-rx")).toBe("0deg");
  });

  it("a sideways swipe moves to the next card", async () => {
    await act(async () => {
      pointer(card()!, "pointerdown", 200, 10);
      pointer(card()!, "pointermove", 150, 12);
      pointer(card()!, "pointerup", 100, 12);
    });
    expect(host.textContent).toContain("card 2 of 44");
    await act(async () => key("keydown", "ArrowLeft"));
    expect(host.textContent).toContain("card 1 of 44");
  });

  it("Space tapped flips; Space held tilts and does not flip", async () => {
    await act(async () => {
      key("keydown", " ");
      key("keyup", " ");
    });
    expect(flipped()).toBe(true);
    await act(async () => {
      key("keydown", " ");
      key("keyup", " ");
    });
    expect(flipped()).toBe(false);

    await act(async () => key("keydown", " "));
    // Not yet at a tap's length; held once HOLD_MS has passed (polled, so a slow
    // machine running the whole suite does not turn a late timer into a failure).
    expect(held()).toBe(false);
    await settle(held);
    expect(held()).toBe(true);
    await act(async () => key("keyup", " "));
    expect(held()).toBe(false);
    expect(flipped()).toBe(false);
  });

  it("Enter on the focused card flips it, and 3 rates it Got it and moves on", async () => {
    card()!.focus();
    await act(async () => key("keydown", "Enter", card()!));
    expect(flipped()).toBe(true);
    await act(async () => key("keydown", "3", card()!));
    expect(host.textContent).toContain("card 2 of 44");
    expect(flipped()).toBe(false);
    expect(JSON.parse(localStorage.getItem(GRIGNARD_KEY)!).status["1"]).toBe("green");
  });

  it("the rate buttons are words, not colours", async () => {
    await act(async () => host.querySelector<HTMLButtonElement>(".rv-btn")!.click());
    const labels = [...host.querySelectorAll(".rv-rate")].map((b) => b.textContent);
    expect(labels).toEqual(["Missed", "Unsure", "Got it"]);
  });
});

describe("reduced motion swaps the flip for a crossfade", () => {
  const css = readFileSync("src/components/review/review.css", "utf8");
  it("the faces stop turning and trade places by opacity", () => {
    expect(css).toMatch(/html\[data-motion="reduced"\] \.rv-flip,[\s\S]*?\{ transform: none; transition: none; \}/);
    expect(css).toMatch(/html\[data-motion="reduced"\] \.rv-face \{ transition: opacity/);
    expect(css).toMatch(/html\[data-motion="reduced"\] \.rv-flip\[data-flipped\] \.rv-face--back \{ opacity: 1;/);
  });
  it("only token curves are used", () => {
    expect(css).not.toMatch(/cubic-bezier\(/);
  });
});

describe("chemistry on cards is drawn", () => {
  const drawn = DECKS.filter((d) => !isReference(d) && d.questions[0]?.image);
  it("there are decks of drawings to check (the check can fail)", () => {
    expect(drawn.length).toBeGreaterThan(0);
  });
  it.each(drawn.map((d) => [d.id, d] as const))("#/deck/%s shows its first card's drawing", async (_, d) => {
    if (isReference(d)) return;
    await visit(`deck/${d.id}`);
    await settle(() => h1() === d.title && card() !== null);
    const q = d.questions[0]!;
    const imgs = [...card()!.querySelectorAll("img")].map((i) => i.getAttribute("src") ?? "");
    // Front (masked) and back (whole): the same RDKit drawing, both sides.
    expect(imgs.filter((s) => s.endsWith(`cards/${q.image}`)).length).toBe(2);
    expect(card()!.textContent).not.toContain(q.image!);
  });
});
