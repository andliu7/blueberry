// @vitest-environment jsdom
/**
 * useBerryReactions, the hook that turns grades into the berry's props
 * (documentation/BLOOM-STATES-SPEC.md, B). The pure tables are pinned in
 * berryReaction.test.ts; this pins the state the hook keeps between grades.
 *
 * 1. The stage bundle belongs to the latest grade only. The answer tray mounts
 *    a fresh <BloomStage> on every reveal, so a combo or puff left set would
 *    replay the last milestone's confetti on every later tray, wrong answers
 *    included. That broke the tone rule before this test existed.
 * 2. hintKey moves on a wrong-again miss and nothing else, and clears on the
 *    next grade, so a later tray's fresh hint control draws no ring.
 * 2b. sparkleKey and flashKey clear the same way, for the fresh verdict berry
 *    each tray mounts (BloomVerdictBerry).
 * 3. Two grades inside one frame cannot leave the char stuck.
 */

import { act, createElement } from "react";
import { createRoot, type Root } from "react-dom/client";
import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, describe, expect, it } from "vitest";
import { Berry } from "../mascot/Berry";
import { BloomHintRing, BloomStage } from "../mascot/BloomStage";
import { useBerryReactions, type BerryReactions } from "../mascot/useBerryReactions";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

let root: Root | null = null;
afterEach(() => {
  act(() => root?.unmount());
  root = null;
});

/** Mounts the hook in a throwaway component and hands back a live view of its result. */
function mountHook(): { readonly current: BerryReactions } {
  const box = { current: null as unknown as BerryReactions };
  function Probe() {
    box.current = useBerryReactions(true, "idle");
    return null;
  }
  root = createRoot(document.createElement("div"));
  act(() => root!.render(createElement(Probe)));
  return box;
}

/** What a FRESH tray would draw from the current stage props. */
const freshTray = (h: { readonly current: BerryReactions }) =>
  renderToStaticMarkup(
    createElement(BloomStage, { reducedMotion: false, ...h.current.stage, children: createElement("i") }),
  );

const grade = (h: { readonly current: BerryReactions }, ...outcomes: Parameters<BerryReactions["react"]>[0][]) => {
  for (const outcome of outcomes) act(() => h.current.react(outcome));
};

describe("useBerryReactions stage bundle", () => {
  it("starts empty", () => {
    const h = mountHook();
    expect(h.current.stage).toEqual({ combo: null, comboKey: 0, puffKey: 0 });
    expect(h.current.hintKey).toBe(0);
  });

  it("sets combo and bumps comboKey on a milestone grade", () => {
    const h = mountHook();
    grade(h, "correct", "correct", "correct");
    expect(h.current.stage.combo).toBe(3);
    expect(h.current.stage.comboKey).toBe(1);
    grade(h, "correct", "correct");
    expect(h.current.stage.combo).toBe(5);
    expect(h.current.stage.comboKey).toBe(2);
  });

  it("clears combo on the next grade that is not a milestone, so a fresh tray draws no confetti", () => {
    const h = mountHook();
    grade(h, ...Array(8).fill("correct"));
    expect(h.current.stage.combo).toBe(8);
    expect(freshTray(h)).toContain("bloom-confetti");

    grade(h, "wrong");
    expect(h.current.stage.combo).toBeNull();
    expect(freshTray(h)).not.toContain("bloom-confetti");
    expect(freshTray(h)).not.toContain("bloom-combo");

    grade(h, "correct");
    expect(h.current.stage.combo).toBeNull();
    expect(freshTray(h)).not.toContain("bloom-combo");
  });

  it("puffs only on the grade that clears the char", () => {
    const h = mountHook();
    grade(h, "wrong", "wrong", "wrong");
    expect(h.current.berry.state).toBe("charred");
    expect(h.current.stage.puffKey).toBe(0);

    grade(h, "correct");
    expect(h.current.berry.state).toBe("neutral");
    expect(h.current.stage.puffKey).toBe(1);
    expect(freshTray(h)).toContain("data-puff");

    grade(h, "correct");
    expect(h.current.stage.puffKey).toBe(0);
    expect(freshTray(h)).not.toContain("data-puff");
  });

  it("alternates the puff keyframe on the next clear", () => {
    const h = mountHook();
    grade(h, "wrong", "wrong", "wrong", "correct");
    expect(freshTray(h)).toContain('data-puff="a"');
    grade(h, "wrong", "wrong", "wrong", "correct");
    expect(h.current.stage.puffKey).toBe(2);
    expect(freshTray(h)).toContain('data-puff="b"');
  });
});

describe("useBerryReactions hintKey", () => {
  it("moves on wrongAgain only", () => {
    const h = mountHook();
    grade(h, "wrong", "nearMiss", "correct");
    expect(h.current.hintKey).toBe(0);
    grade(h, "wrongAgain");
    expect(h.current.hintKey).toBe(1);
    grade(h, "wrongAgain");
    expect(h.current.hintKey).toBe(2);
  });

  it("clears on the next grade, so a fresh hint control after a correct answer draws no ring", () => {
    const h = mountHook();
    const freshRing = () => renderToStaticMarkup(createElement(BloomHintRing, { ringKey: h.current.hintKey, reducedMotion: false }));
    grade(h, "wrongAgain");
    expect(freshRing()).toContain("bloom-hint-ring");
    grade(h, "correct");
    expect(h.current.hintKey).toBe(0);
    expect(freshRing()).toBe("");
    grade(h, "wrong");
    expect(freshRing()).toBe("");
  });
});

describe("useBerryReactions sparkleKey and flashKey", () => {
  /** What a FRESH verdict berry would draw from the current berry props. */
  const freshBerry = (h: { readonly current: BerryReactions }) =>
    renderToStaticMarkup(createElement(Berry, { ...h.current.berry, reducedMotion: false }));

  it("sparkles only on the grade that earned them", () => {
    const h = mountHook();
    grade(h, "correct");
    expect(h.current.berry.sparkleKey).toBe(1);
    expect(freshBerry(h)).toContain("berry-sparkles");
    grade(h, "wrong");
    expect(h.current.berry.sparkleKey).toBe(0);
    expect(freshBerry(h)).not.toContain("berry-sparkles");
    grade(h, "correct");
    expect(h.current.berry.sparkleKey).toBe(2);
  });

  it("flashes only on the grade that clears the char", () => {
    const h = mountHook();
    grade(h, "wrong", "wrong", "wrong", "correct");
    expect(h.current.berry.flashKey).toBe(1);
    expect(freshBerry(h)).toContain("berry-flash");
    grade(h, "correct");
    expect(h.current.berry.flashKey).toBe(0);
    expect(freshBerry(h)).not.toContain("berry-flash");
  });
});

describe("useBerryReactions charred flag", () => {
  it("clears when the third miss and the clearing correct land in the same frame", () => {
    const h = mountHook();
    grade(h, "wrong", "wrong");
    // One act() batches both grades into one render, the way two grades inside one frame would.
    act(() => {
      h.current.react("wrong");
      h.current.react("correct");
    });
    expect(h.current.berry.state).toBe("neutral");
    expect(h.current.stage.puffKey).toBe(1);
  });
});
