// @vitest-environment jsdom

/**
 * Bloom's wiring, fix round of 25 Oct (BLOOM-STATES-SPEC.md, sections B and 4),
 * beside bloomWiring.test.ts and in its pattern: mount the real surface and
 * read the face back off the DOM.
 *
 * 1. The hint offer: a wrong-again miss rings the tray's help control, on the
 *    MCQ recycle slot (missedBefore) and on the sort ladder after Try again.
 * 2. The char on the third MCQ miss, through McqRunner.
 * 3. Path Bloom hops on an unlock that lands after he mounted.
 * 4. The Feed return greet has no sad frame.
 * 5. Every lesson surface dresses its verdict berry with the lesson's look.
 */

import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { act, createElement } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, describe, expect, it } from "vitest";

import { latestOutcome, startMcqSession, type McqSession } from "../beats/mcq/session";
import { MCQ_BEATS } from "../beats/mcq";
import { McqRunner } from "../beats/mcq/McqRunner";
import type { BeatResult, McqBeat } from "../beats/types";
import { PathMascot, PathUnlockContext, type BloomMove } from "../tabs/pathway/PathMascot";
import { SortBeatView, sortReactionOutcome } from "../beats/sort/SortBeatView";
import { SORT_LADDERS } from "../beats/sort";
import { rankedOpening } from "../beats/sort/board";
import { judgeSort } from "../beats/sort/judge";
import { bloomLookForNode } from "../beats/BloomVerdictBerry";
import { RETURN_GREET } from "../tabs/feed/FeedTab";
import { CHARRED_LINE } from "../mascot/berryReaction";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const here = dirname(fileURLToPath(import.meta.url));
const read = (path: string) => readFileSync(resolve(here, path), "utf8");

let mounted: { root: Root; container: HTMLElement } | null = null;
afterEach(() => {
  if (mounted !== null) {
    const { root, container } = mounted;
    act(() => root.unmount());
    container.remove();
    mounted = null;
  }
});

function mountElement(element: ReturnType<typeof createElement>): { container: HTMLElement; root: Root } {
  const container = document.createElement("div");
  document.body.appendChild(container);
  const root = createRoot(container);
  mounted = { root, container };
  act(() => root.render(element));
  return { container, root };
}

/** Rung-1 word-row beats (no picture tiles), so the options are plain buttons with their text. */
const WORD_BEATS = MCQ_BEATS.filter((beat) => beat.levels.includes(1) && beat.options.every((o) => o.text.length > 0));

function mountRunner(beats: readonly McqBeat[], missedBefore?: readonly string[]): HTMLElement {
  const first = beats[0];
  if (first === undefined) throw new Error("no MCQ beat to mount");
  return mountElement(
    createElement(McqRunner, {
      node: first.node,
      level: 1,
      beats,
      onExit: () => undefined,
      reducedMotion: true,
      showHowTo: false,
      ...(missedBefore === undefined ? {} : { missedBefore }),
    }),
  ).container;
}

function button(container: HTMLElement, label: string): HTMLButtonElement {
  const found = [...container.querySelectorAll<HTMLButtonElement>("button")].find((b) => (b.textContent ?? "").trim() === label);
  if (found === undefined) throw new Error(`no button labelled ${label}`);
  if (found.disabled) throw new Error(`button ${label} is disabled`);
  return found;
}

function pickWrong(container: HTMLElement, beat: McqBeat): void {
  const index = beat.options.findIndex((o) => o.id !== beat.correctOptionId);
  const option = [...container.querySelectorAll<HTMLButtonElement>('[aria-label="Answer options"] button')][index];
  if (option === undefined) throw new Error("no wrong option button");
  act(() => option.click());
  act(() => button(container, "Check").click());
}

/** The tray's own key (CONTINUE, TRY AGAIN): its last button, after any Why? summaries. */
function pressTrayKey(container: HTMLElement): void {
  const keys = [...container.querySelectorAll<HTMLButtonElement>("[data-answer-tray] button")];
  const key = keys[keys.length - 1];
  if (key === undefined) throw new Error("no tray key");
  act(() => key.click());
}

const tray = (container: HTMLElement) => {
  const found = container.querySelector("[data-answer-tray]");
  if (found === null) throw new Error("no answer tray");
  return found;
};

/** Every Bloom on screen is a Berry root ([data-state]) with a face (.bb-eyes[data-mood]). */
const blooms = (root: ParentNode) => [...root.querySelectorAll("[data-state] .bb-eyes")].map((eyes) => eyes.getAttribute("data-mood"));

/* ------------------------------------------------ 1. the hint offer -- */

describe("the hint offer on a wrong-again miss", () => {
  it("a recycled question missed again: Bloom leans in curious and the tray's help control rings", () => {
    const beat = WORD_BEATS[0]!;
    const container = mountRunner([beat], [beat.id]);
    pickWrong(container, beat);
    expect(blooms(tray(container))).toEqual(["curious"]);
    const ring = tray(container).querySelector("summary .bloom-hint-ring");
    expect(ring).not.toBeNull();
    expect(ring?.getAttribute("data-reduced")).toBe("true");
  });

  it("a first miss rings nothing and keeps the sad beat", () => {
    const beat = WORD_BEATS[0]!;
    const container = mountRunner([beat]);
    pickWrong(container, beat);
    expect(blooms(tray(container))).toEqual(["sad"]);
    expect(container.querySelector(".bloom-hint-ring")).toBeNull();
  });

  it("missedBefore makes a miss wrong again in the session rule too", () => {
    const miss = { level: 1, cause: "c", elapsedMs: 1, at: "2026-10-25T00:00:00Z", beatId: "a", kind: "invalid" } as unknown as BeatResult;
    const session: McqSession = { ...startMcqSession([], 1), results: [miss] };
    expect(latestOutcome(session)).toBe("wrong");
    expect(latestOutcome(session, ["a"])).toBe("wrongAgain");
    expect(latestOutcome(session, ["b"])).toBe("wrong");
  });

  it("the recycle slot hands the lesson's missed ids to its runner", () => {
    expect(read("../beats/BeatRunner.tsx")).toMatch(/beats=\{recycleBeatsFor\(run\.plan, run\.missedMcqIds\)\}\s+missedBefore=\{run\.missedMcqIds\}/);
  });
});

describe("the sort ladder's verdict berry", () => {
  it("reads right, wrong and wrong again", () => {
    expect(sortReactionOutcome(true, false)).toBe("correct");
    expect(sortReactionOutcome(true, true)).toBe("correct");
    expect(sortReactionOutcome(false, false)).toBe("wrong");
    expect(sortReactionOutcome(false, true)).toBe("wrongAgain");
  });

  it("mounted: sad on the first wrong ladder, curious with the hint ring after Try again", () => {
    // The opening order (what down-then-up leaves) is judged wrong with no
    // authored explanation, the common case, so the ring circles the headline.
    const content = SORT_LADDERS.find((ladder) => {
      const opening = rankedOpening(ladder.beat.items.map((item) => item.id), 7, ladder.spec.correctOrder);
      const judged = judgeSort(ladder, opening, { level: 2, elapsedMs: 1, at: "2026-10-25T00:00:00Z" });
      return judged.status === "judged" && judged.explanation === null;
    });
    if (content === undefined) throw new Error("no sort ladder with a plain wrong opening");
    const { container } = mountElement(createElement(SortBeatView, { content, level: 2 }));
    const label = container.querySelector<HTMLButtonElement>("button.sort-card")?.textContent ?? "";
    const keyOn = (key: string) => {
      const card = [...container.querySelectorAll<HTMLButtonElement>("button.sort-card")].find((b) => b.textContent === label);
      if (card === undefined) throw new Error(`no card ${label}`);
      act(() => void card.dispatchEvent(new KeyboardEvent("keydown", { key, bubbles: true })));
    };
    // Down then up: the opening order again (never solved, board.ts), but a moved board, so Check is live.
    const wrongLadder = () => {
      keyOn("ArrowDown");
      keyOn("ArrowUp");
      act(() => button(container, "Check").click());
    };
    wrongLadder();
    expect(blooms(tray(container))).toEqual(["sad"]);
    expect(tray(container).querySelector(".bloom-hint-ring")).toBeNull();
    pressTrayKey(container); // Try again
    wrongLadder();
    expect(blooms(tray(container))).toEqual(["curious"]);
    expect(tray(container).querySelector(".answer-tray__answer > .bloom-hint-ring")).not.toBeNull();
  });
});

/* ---------------------------------------------- 2. the third miss -- */

describe("the third MCQ miss through McqRunner", () => {
  it("chars the tray berry and captions it", () => {
    const beats = WORD_BEATS.slice(0, 3);
    expect(beats).toHaveLength(3);
    const container = mountRunner(beats);
    for (const [i, beat] of beats.entries()) {
      pickWrong(container, beat);
      if (i < 2) {
        expect(tray(container).querySelector('[data-state="charred"]')).toBeNull();
        pressTrayKey(container);
      }
    }
    expect(tray(container).querySelector('[data-state="charred"]')).not.toBeNull();
    expect(tray(container).textContent).toContain(CHARRED_LINE);
  });
});

/* ------------------------------------------ 3. the late path unlock -- */

describe("path Bloom hops on an unlock that lands after mount", () => {
  it("plays the unlock beat with a new key when the context turns true", () => {
    const seen: BloomMove[] = [];
    const tree = (unlocked: boolean) =>
      createElement(
        PathUnlockContext.Provider,
        { value: unlocked },
        createElement(PathMascot, {
          children: (move: BloomMove) => {
            seen.push(move);
            return null;
          },
        }),
      );
    const { root } = mountElement(tree(false));
    const before = seen[seen.length - 1]!;
    expect(before.behaviour).toBe("leanIn");
    act(() => root.render(tree(true)));
    const after = seen[seen.length - 1]!;
    expect(after).toMatchObject({ behaviour: "bounce", chain: ["leanIn"] });
    expect(after.behaviourKey).toBeGreaterThan(before.behaviourKey);
  });
});

/* -------------------------------------------- 4. the Feed greet -- */

describe("the Feed return greet", () => {
  it("is happy, peeks, then waves, with no sad frame", () => {
    expect(RETURN_GREET).toEqual({ mood: "happy", behaviour: "peek", chain: ["wave"] });
    expect(read("../tabs/feed/FeedTab.tsx")).toMatch(/<Berry \{\.\.\.RETURN_GREET\}/);
  });
});

/* ---------------------------------------- 5. the lesson's look -- */

describe("every lesson surface dresses its verdict berry", () => {
  it("bloomLookForNode gives a state and a costume, neutral for an unknown node", () => {
    const look = bloomLookForNode("no-such-node");
    expect(look.state).toBe("neutral");
    expect(typeof look.costume).toBe("string");
  });

  it("BeatRunner hands the look to the match, sort, synthesis and pool steps, and each draws it", () => {
    const runner = read("../beats/BeatRunner.tsx");
    expect(runner).toMatch(/const bloomLook = bloomLookForNode\(node\)/);
    expect(runner.match(/bloomLook=\{bloomLook\}/g)?.length).toBe(4);
    for (const file of ["../beats/sort/SortBeatView.tsx", "../beats/match/MatchBoard.tsx", "../beats/synthesis/SynthesisGapBeat.tsx"]) {
      expect(read(file)).toMatch(/<BloomVerdictBerry bloom=\{bloom\} \{\.\.\.bloomLook\}/);
    }
  });
});
