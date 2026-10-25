// @vitest-environment jsdom
// @vitest-environment-options {"url": "http://localhost/?targets=1&store=1"}

/**
 * Bloom on the trainer screen, the beats the 25 Oct fix round found untested
 * (BLOOM-STATES-SPEC.md, A and D): the peek on mount, the mind-blown open on a
 * first resonance, and the look at the canvas once an arrow is down.
 *
 * The opening and the look are pure (TrainerScreen.tsx trainerOpening and
 * trainerLook) so the rule is read without a DOM; the mount pins that the
 * screen actually opens on that face, the same way trainerMascotWiring.test.ts
 * reads moods off `.bb-eyes[data-mood]`.
 *
 * NOT here, on purpose: the spec's "mood swaps before afterRise" case. It
 * contradicts the pinned "holds the waiting face until RISE_MS has passed" in
 * trainerMascotWiring.test.ts, so it is an owner question (spec section 7, Q8).
 */

import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { afterEach, describe, expect, it } from "vitest";
import { act, createElement } from "react";
import { createRoot, type Root } from "react-dom/client";
import { SN2_DEMO_STEP, SN2_FROM_HINTS, SN2_TO_HINTS } from "../demo/sn2Step";
import { TrainerScreen, trainerLook, trainerOpening } from "../tabs/trainer/engine/TrainerScreen";
import type { TrainerQuestion } from "../tabs/trainer/engine/question";
import { MIND_BLOWN } from "../mascot/berryTopicState";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const question: TrainerQuestion = {
  id: "sn2",
  kind: "reaction",
  title: "SN2 at bromomethane",
  steps: [
    {
      step: SN2_DEMO_STEP,
      fromHints: SN2_FROM_HINTS,
      toHints: SN2_TO_HINTS,
      prompt: "Push the electrons for this SN2 in one step.",
      hint: "Tap the oxygen to open its lone pairs.",
    },
  ],
  successLine: "Back-side attack.",
  wonPill: "Goal achieved",
};

let mounted: { root: Root; container: HTMLElement } | null = null;
afterEach(() => {
  if (mounted !== null) {
    const { root, container } = mounted;
    act(() => root.unmount());
    container.remove();
    mounted = null;
  }
});

function mount(mindBlown: boolean): HTMLElement {
  const container = document.createElement("div");
  document.body.appendChild(container);
  const root = createRoot(container);
  mounted = { root, container };
  act(() => {
    root.render(createElement(TrainerScreen, { question, onExit: () => undefined, reducedMotion: true, mindBlown }));
  });
  return container;
}

const moods = (container: HTMLElement) => [...container.querySelectorAll("[data-state] .bb-eyes")].map((eyes) => eyes.getAttribute("data-mood"));

describe("the trainer berry's opening", () => {
  it("peeks up, then leans in, on the focused face", () => {
    expect(trainerOpening(false)).toEqual({ behaviour: "peek", mood: "focused", chain: ["leanIn"] });
  });

  it("opens on the mind-blown face for a first resonance, then leans in", () => {
    expect(trainerOpening(true)).toEqual({ behaviour: MIND_BLOWN.behaviour, mood: MIND_BLOWN.mood, chain: ["leanIn"] });
  });

  it("mounted: one berry, focused by default and mind blown when asked", () => {
    expect(moods(mount(false))).toEqual(["focused"]);
    act(() => mounted?.root.unmount());
    mounted?.container.remove();
    mounted = null;
    expect(moods(mount(true))).toEqual([MIND_BLOWN.mood]);
  });
});

describe("the trainer berry's look", () => {
  it("looks up and left at the canvas once an arrow is down, and only while drawing", () => {
    const look = trainerLook(true, 1);
    expect(look).toBeDefined();
    expect(look!.x).toBeLessThan(0);
    expect(look!.y).toBeLessThan(0);
    expect(trainerLook(true, 0)).toBeUndefined();
    expect(trainerLook(false, 2)).toBeUndefined();
  });

  it("is what the screen hands its berry, and the opening is what it bumps on mount", () => {
    const src = readFileSync(resolve(dirname(fileURLToPath(import.meta.url)), "../tabs/trainer/engine/TrainerScreen.tsx"), "utf8");
    expect(src).toMatch(/lookAt=\{trainerLook\(interactive, mechanism\.arrows\.length\)\}/);
    expect(src).toMatch(/const opening = trainerOpening\(mindBlown\);\s+bump\(opening\.behaviour, opening\.mood, opening\.chain\);/);
  });
});
