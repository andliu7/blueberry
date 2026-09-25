// @vitest-environment jsdom
// @vitest-environment-options {"url": "http://localhost/?targets=1&store=1&flags="}

/**
 * The Train tab banks what the student earned, the same way a lesson does.
 *
 * WHY THIS FILE EXISTS. lessonBanking.test.ts records the 2026-09-05 measurement
 * that found `clearNode` with no callers at all: the Path tab spent charge to
 * enter a node and banked nothing on the way out. BeatRunner fixed that for BEAT
 * nodes. It fixed nothing for the other three playable kinds. A pathway node
 * whose playable is a reaction, a sequence or a resonance hunt routes to
 * "#/app/trainer?<kind>=<id>", the charge gate appends `node_started` on the way
 * in, and TrainerTab mounted TrainerScreen with no `onSolved` at all, even though
 * the screen has declared one the whole time. Same bug, same surface, other half
 * of the map: paid on entry, nothing recorded on the win.
 *
 * lessonBanking.test.ts could only afford a text check on source, because that
 * suite runs in node with no DOM. This one does not settle for that. It mounts
 * the REAL TrainerTab over a real deep link, draws the real Williamson
 * mechanism through the component's own interaction store, presses the rendered
 * Check and Continue, and then reads the journal the store actually persisted.
 * A wiring bug survived 1,762 green tests here once; a text check would not
 * have caught the mascot one either.
 *
 * Nothing is added to the source to make this observable. The `?targets=1` and
 * `?store=1` debug flags already exist for the capture scripts, and the journal
 * is already on the progress snapshot because every balance is derived from it.
 *
 * `&flags=` IS LOAD BEARING, and it cost an hour to find. `import.meta.env.DEV`
 * is true under vitest, so flags.ts turns the beta flags on by default and
 * progress.ts then injects 35 SYNTHETIC node_cleared events into the snapshot,
 * three of them pathway nodes journalled as "reaction" clears. A test that did
 * not turn them off would read those instead of what the student earned, and two
 * of the assertions below passed against them before this was traced. `?flags=`
 * is flags.ts's own documented off switch: an explicit empty list beats the dev
 * default, which is the state a student's device is in.
 */

import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { act, createElement } from "react";
import { createRoot, type Root } from "react-dom/client";
import { currentDraft, type InteractionStore, type Point2 } from "@blueberry/interaction";
import type { EconomyEvent } from "@blueberry/economy";
import { progress } from "../app/progress";
import { pathwayNodeForPlayable, economyKindFor, PATHWAY_UNITS } from "../demo/pathwayMap";
import { TrainerTab } from "../tabs/trainer/TrainerTab";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

/**
 * The node under test: Unit 5's Williamson ether synthesis. A spine node whose
 * playable is a reaction, so it is exactly the case BeatRunner never covered,
 * and the mechanism is a two-arrow SN2, which is the one trainerMascotWiring
 * already proves can be driven to a win from a test.
 */
const NODE = "u5-williamson";
const REACTION = "williamson";
const DEEP_LINK = `#/app/trainer?reaction=${REACTION}`;

type NodeCleared = Extract<EconomyEvent, { kind: "node_cleared" }>;

function clears(): readonly NodeCleared[] {
  return progress.getSnapshot().journal.filter((event): event is NodeCleared => event.kind === "node_cleared");
}

/* ---------------- mounting the real tab ---------------- */

let mounted: { root: Root; container: HTMLElement } | null = null;

function mount(hash: string): { container: HTMLElement } {
  window.location.hash = hash;
  const container = document.createElement("div");
  document.body.appendChild(container);
  const root = createRoot(container);
  mounted = { root, container };
  act(() => {
    root.render(createElement(TrainerTab, { reducedMotion: true }));
  });
  return { container };
}

/** A deep link arriving at a tab that is already on screen, as the app does it. */
function arrive(hash: string): void {
  act(() => {
    window.location.hash = hash;
    window.dispatchEvent(new HashChangeEvent("hashchange"));
  });
}

function store(): InteractionStore {
  const live = window.__pilotStore;
  if (live === undefined) throw new Error("the ?store=1 debug hook did not expose the interaction store");
  return live;
}

beforeEach(() => {
  progress.reset();
  window.location.hash = "";
});

afterEach(() => {
  if (mounted !== null) {
    const { root, container } = mounted;
    act(() => root.unmount());
    container.remove();
    mounted = null;
  }
  progress.reset();
});

/* ---------------- gestures over the real hit geometry ---------------- */

let clock = 0;

function pointerAt(point: Point2) {
  clock += 16;
  return { pointerId: 1, pointerType: "touch" as const, point, timestampMs: clock };
}

function targetCentre(match: Record<string, unknown>): Point2 {
  const entries = window.__pilotTargets ?? [];
  const hit = entries.find((entry) =>
    Object.entries(match).every(([key, value]) => (entry.target as unknown as Record<string, unknown>)[key] === value),
  );
  if (hit === undefined) throw new Error(`no target for ${JSON.stringify(match)}`);
  return hit.centre;
}

function tap(point: Point2): void {
  act(() => void store().dispatch({ kind: "pointerDown", pointer: pointerAt(point) }));
  act(() => void store().dispatch({ kind: "pointerUp", pointer: pointerAt(point) }));
}

function drag(from: Point2, to: Point2): void {
  act(() => void store().dispatch({ kind: "pointerDown", pointer: pointerAt(from) }));
  act(() => void store().dispatch({ kind: "pointerMove", pointer: pointerAt({ x: (from.x + to.x) / 2, y: (from.y + to.y) / 2 }) }));
  act(() => void store().dispatch({ kind: "pointerMove", pointer: pointerAt(to) }));
  act(() => void store().dispatch({ kind: "pointerUp", pointer: pointerAt(to) }));
}

function arrowCount(): number {
  const draft = currentDraft(store().getSnapshot());
  if (draft.shape !== "mechanism") throw new Error("not a mechanism draft");
  return draft.arrows.length;
}

function press(container: HTMLElement, label: string): void {
  const button = [...container.querySelectorAll("button")].find((b) => (b.textContent ?? "").trim() === label);
  if (button === undefined) throw new Error(`no rendered button labelled ${label}`);
  if (button.disabled) throw new Error(`button ${label} is disabled`);
  act(() => button.click());
}

/** A unit's fold in the browser, found by the title it renders. */
function pressContaining(container: HTMLElement, text: string): void {
  const button = [...container.querySelectorAll("button")].find((b) => (b.textContent ?? "").includes(text));
  if (button === undefined) throw new Error(`no rendered button containing ${text}`);
  act(() => button.click());
}

function pressTitled(container: HTMLElement, title: string): void {
  const button = container.querySelector<HTMLButtonElement>(`button[title="${title}"]`);
  if (button === null) throw new Error(`no rendered button titled ${title}`);
  if (button.disabled) throw new Error(`button titled ${title} is disabled`);
  act(() => button.click());
}

/**
 * The whole Williamson, drawn and checked: the methoxide lone pair into the new
 * C-O bond, then the C-Br bond onto the bromide. Both arrows are read off the
 * live hit geometry, so the chemistry is the registry's and not this file's.
 */
function winTheMechanism(container: HTMLElement): void {
  tap(targetCentre({ kind: "atom", atomId: "om" }));
  drag(targetCentre({ kind: "lonePair", atomId: "om" }), targetCentre({ kind: "atom", atomId: "c1" }));
  expect(arrowCount()).toBe(1);
  drag(targetCentre({ kind: "bondEndHandle", bondId: "b-cbr", atomId: "br1" }), targetCentre({ kind: "atom", atomId: "br1" }));
  expect(arrowCount()).toBe(2);
  press(container, "Check");
  // Continue is only on screen once the model says the step is won, so its
  // presence is itself the proof that the mechanism graded correct.
  press(container, "Continue");
}

/* ---------------- 1. the clear reaches the journal ---------------- */

describe("a mechanism solved from the pathway clears its node", () => {
  it("journals one node_cleared for the map node the deep link came from", () => {
    const { container } = mount(DEEP_LINK);
    expect(clears()).toHaveLength(0);

    winTheMechanism(container);

    const banked = clears();
    expect(banked).toHaveLength(1);
    expect(banked[0]?.nodeId).toBe(NODE);
  });

  it("banks it as the kind the charge gate charged for, and on the spine", () => {
    const { container } = mount(DEEP_LINK);
    winTheMechanism(container);

    const event = clears()[0];
    // Not "concept": a beat is recognition work and this is arrow work. The
    // kind is the one ChargeGate priced the entry at, read from the same
    // function, so a student cannot pay one row and clear another.
    expect(event?.nodeKind).toBe("reaction");
    expect(event?.spine).toBe(true);
    // One step drawn in one sitting. Nothing fabricated: the trainer knows how
    // many steps the question had and knows it started at the first one.
    expect(event?.stepsInOneSitting).toBe(1);
  });

  it("does not claim a flawless run it cannot see", () => {
    // TrainerScreen never reports a miss upward, so `flawless` would be a
    // guess. The store's own default is the honest answer.
    const { container } = mount(DEEP_LINK);
    winTheMechanism(container);
    expect(clears()[0]?.flawless).toBe(false);
  });
});

/* ---------------- 2. it cannot pay twice ---------------- */

describe("a replay of the same node", () => {
  it("appends no second node_cleared", () => {
    const { container } = mount(DEEP_LINK);
    winTheMechanism(container);
    expect(clears()).toHaveLength(1);

    // Leaving replaced the hash with the bare tab address, so arriving again is
    // a real second visit to the same node inside one mounted tab.
    arrive(DEEP_LINK);
    winTheMechanism(container);

    expect(clears()).toHaveLength(1);
  });
});

/* ---------------- 3. free practice pays nothing ---------------- */

describe("a question picked in the Train tab's own browser", () => {
  it("clears nothing, because nothing was spent to open it", () => {
    // No deep link: the tab opens on the browser, and a pick there never passes
    // the charge gate. A clear here would mint first-clear diamonds and unlock
    // the nodes downstream for free.
    const { container } = mount("#/app/trainer");
    pressContaining(container, "Unit 5 · Alcohols, Diols, Ethers & Epoxides");
    pressTitled(container, "Play: Williamson ether synthesis");

    winTheMechanism(container);

    expect(clears()).toHaveLength(0);
  });
});

/* ---------------- 4. the lookup the banking depends on ---------------- */

describe("pathwayNodeForPlayable", () => {
  it("finds the node a playable id belongs to", () => {
    expect(pathwayNodeForPlayable("reaction", REACTION)?.id).toBe(NODE);
    expect(pathwayNodeForPlayable("resonance", "res-allyl-1")?.id).toBe("u1-allylic");
    expect(pathwayNodeForPlayable("sequence", "seq-diene")?.id).toBe("u1-12v14");
    expect(pathwayNodeForPlayable("beat", "u1-kvt")?.id).toBe("u1-kvt");
  });

  it("matches on the kind too, so two registries cannot answer for each other", () => {
    // "williamson" is a reaction id. Asked for as a sequence it is nothing.
    expect(pathwayNodeForPlayable("sequence", REACTION)).toBeNull();
  });

  it("returns null rather than throwing on an id nothing on the map carries", () => {
    expect(pathwayNodeForPlayable("reaction", "not-a-real-reaction")).toBeNull();
  });

  it("is the inverse of the map, for every playable on it", () => {
    for (const unit of PATHWAY_UNITS) {
      for (const node of unit.nodes) {
        const link = node.playable;
        if (link === undefined) continue;
        const found = pathwayNodeForPlayable(link.kind, link.id);
        expect(found).not.toBeNull();
        // Ten playables are shared by two or three nodes, so the answer is the
        // FIRST node in teaching order rather than necessarily this one. What
        // must hold for every node is that the answer carries the same link.
        expect(found?.playable).toEqual(link);
      }
    }
  });

  it("answers with the earliest node when a playable is shared", () => {
    // wolff-extrusion is on u3-c-to-ch2 and again on u7-to-ch2. The earlier node
    // is the one that teaches the mechanism, so it is the one a clear lands on.
    expect(pathwayNodeForPlayable("reaction", "wolff-extrusion")?.id).toBe("u3-c-to-ch2");
  });
});

describe("economyKindFor", () => {
  it("prices arrow work as a reaction and a beat as a concept", () => {
    expect(economyKindFor("spine", { kind: "reaction", id: REACTION })).toBe("reaction");
    expect(economyKindFor("spine", { kind: "sequence", id: "seq-diene" })).toBe("reaction");
    expect(economyKindFor("spine", { kind: "resonance", id: "res-allyl-1" })).toBe("reaction");
    expect(economyKindFor("spine", { kind: "beat", id: "u1-kvt" })).toBe("concept");
  });

  it("keeps a side quest on the branch row whatever it holds", () => {
    expect(economyKindFor("branch", { kind: "reaction", id: "diels-alder" })).toBe("branch");
  });
});
