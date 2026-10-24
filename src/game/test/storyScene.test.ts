/**
 * Unit 0's story scene card (beats/StoryScene.tsx, content audit 23 Oct,
 * top-25 #5): each chapter's scene node plays its guess-first question, then
 * the chapter's scene.steps as a tap-through card.
 *
 * WHAT IS PINNED: every chapter's scene node, and only it, maps to its
 * chapter; the scene node's lesson is still the one ungraded meet step, so the
 * guess comes before the card; the card renders each chapter's first step,
 * and chapter 7's chart step renders the SN chart table.
 */
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { arrowPath, StoryScene } from "../beats/StoryScene";
import { planLesson } from "../beats/template";
import { STORY_CHAPTERS, U0_SN_CHART, sceneChapterFor } from "../content/u0";

function render(chapterIndex: number): string {
  const chapter = STORY_CHAPTERS[chapterIndex]!;
  return renderToStaticMarkup(createElement(StoryScene, { chapter, reducedMotion: true, onDone: () => {} }));
}

describe("sceneChapterFor", () => {
  it("maps each scene node to its chapter and every practice node to nothing", () => {
    for (const c of STORY_CHAPTERS) {
      expect(sceneChapterFor(c.sceneNode)?.id, c.sceneNode).toBe(c.id);
      expect(sceneChapterFor(c.practiceNode), c.practiceNode).toBeNull();
    }
    expect(sceneChapterFor("u1-allylic")).toBeNull();
  });

  it("keeps the scene node's lesson as the one meet step, so the guess plays before the card", () => {
    for (const c of STORY_CHAPTERS) {
      expect(planLesson(c.sceneNode)?.steps.map((step) => step.beat), c.sceneNode).toEqual([{ kind: "meet", node: c.sceneNode }]);
    }
  });
});

describe("the card", () => {
  it("opens every chapter on its first step's narration, numbered 1 of n", () => {
    STORY_CHAPTERS.forEach((c, i) => {
      const html = render(i);
      expect(html, c.id).toContain(`1 of ${c.scene.steps.length}`);
      // renderToStaticMarkup escapes apostrophes, so compare on the escaped text.
      const narration = c.scene.steps[0]!.narration.replace(/'/g, "&#x27;");
      expect(html, c.id).toContain(narration);
      expect(html, c.id).toContain("Next");
    });
  });

  it("draws chapter 7's decision chart when a step asks for it", () => {
    const i = STORY_CHAPTERS.findIndex((c) => c.number === 7);
    const at = STORY_CHAPTERS[i]!.scene.steps.findIndex((step) => step.chart === "sn");
    expect(at).toBeGreaterThanOrEqual(0);
    // A one-step chapter holding only the chart step, so the first render is the chart.
    const chapter = { ...STORY_CHAPTERS[i]!, scene: { steps: [STORY_CHAPTERS[i]!.scene.steps[at]!] } };
    const html = renderToStaticMarkup(createElement(StoryScene, { chapter, reducedMotion: true, onDone: () => {} }));
    expect(html).toContain("<table");
    for (const row of U0_SN_CHART.rows) expect(html).toContain(row.substrate);
    expect(html).toContain("Continue");
  });

  it("says the arrows are drawn on chapter 1's arrow step, which invites a drag the card cannot take", () => {
    const c = STORY_CHAPTERS.find((chapter) => chapter.number === 1)!;
    const step = c.scene.steps.find((s) => s.tryIt === "arrow")!;
    const html = renderToStaticMarkup(createElement(StoryScene, { chapter: { ...c, scene: { steps: [step] } }, reducedMotion: true, onDone: () => {} }));
    expect(html).toContain("The arrows are drawn for you here.");
    expect(html).toContain("<path");
  });

  it("bends an arrow off the straight line between its ends", () => {
    const d = arrowPath([0, 0], [30, 0]);
    expect(d.startsWith("M 0.0 0.0 Q 15.0 10.0 30.0 0.0")).toBe(true);
  });
});
