// @vitest-environment jsdom
// @vitest-environment-options {"url": "http://localhost/?flags="}
/**
 * The owner finished lessons and saw no XP change (queue item 6). This mounts
 * the real top bar on the app's own store, banks a lesson, and reads what the
 * bar says afterwards: the line and the level badge must follow the economy.
 *
 * `?flags=` keeps the beta flags from seeding the journal (cardsReward.test.ts).
 */

import { act, createElement } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, describe, expect, it } from "vitest";
import { progress } from "../app/progress";
import { Hud } from "../app/ui/Hud";
import { PATHWAY_UNITS } from "../demo/pathwayMap";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
window.matchMedia ??= ((query: string) =>
  ({ matches: false, media: query, addEventListener() {}, removeEventListener() {} }) as unknown as MediaQueryList);

let root: Root | null = null;
afterEach(() => {
  act(() => root?.unmount());
  root = null;
  progress.reset();
});

const line = () => document.querySelector(".hud-xp-line")?.textContent ?? "";

describe("the top bar after a lesson", () => {
  it("shows the new XP line once the +XP moment lands", async () => {
    progress.reset();
    const host = document.createElement("div");
    document.body.append(host);
    root = createRoot(host);
    act(() => root!.render(createElement(Hud)));
    const before = line();
    expect(before).toMatch(/^\d+ XP to the next stage!/);

    const lesson = PATHWAY_UNITS.flatMap((unit) => unit.nodes).find((node) => node.role !== "quiz")!;
    await act(async () => {
      progress.clearNode(lesson.id, "concept", { flawless: true, spine: true });
      // The moment lands on the next frame when the browser cannot animate.
      await new Promise((resolve) => setTimeout(resolve, 50));
    });
    expect(line()).not.toBe(before);
    const toNext = progress.getSnapshot().economy.xp.toNextStage;
    expect(line().startsWith(`${toNext} XP to the next stage!`)).toBe(true);
  });
});
