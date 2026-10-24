/**
 * The Pro sheet is asked for on a LESSON clear and nowhere else (G3). A
 * challenge pass, a review run, a test-out and the trainer are not lessons,
 * and a sheet after one of those would be a paywall before the value.
 * A source scan, because the clear effects run inside lazy runners.
 */
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const read = (path: string) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");

/** The text from `start` up to (not including) `end`. */
function between(source: string, start: string, end: string): string {
  const from = source.indexOf(start);
  const to = source.indexOf(end, from);
  expect(from, start).toBeGreaterThanOrEqual(0);
  expect(to, end).toBeGreaterThan(from);
  return source.slice(from, to);
}

describe("upsell wiring", () => {
  it("BeatRunner notes a banked lesson clear, after the chest, outside the challenge branch", () => {
    const src = read("beats/BeatRunner.tsx");
    expect(src).toMatch(/noteLessonClear\(/);
    expect(between(src, 'if (run.mode === "challenge")', "const flawless")).not.toMatch(/noteLessonClear/);
    const banking = between(src, "progress.clearNode(node", "if (live) setBanked(diamonds)");
    expect(banking.indexOf("noteLessonClear(")).toBeGreaterThan(banking.indexOf("earnChestForClear(progress, node)"));
  });

  it("PracticeRunner notes a cleared session, outside the challenge branch", () => {
    const src = read("beats/practice/PracticeRunner.tsx");
    expect(between(src, "progress.clearNode(node", "if (live) setBanked(diamonds)")).toMatch(/noteLessonClear\(/);
    expect(between(src, "if (state.challenge)", "if (!cleared(state)) return;")).not.toMatch(/noteLessonClear/);
  });

  it("review runs, test-outs and the trainer never ask", () => {
    for (const path of ["tabs/pathway/ReviewRun.tsx", "tabs/pathway/TestOutRun.tsx", "tabs/trainer/TrainerTab.tsx"]) {
      expect(read(path), path).not.toMatch(/noteLessonClear|upsell/i);
    }
  });

  it("the runners import it dynamically, so the rule stays off the cold load", () => {
    for (const path of ["beats/BeatRunner.tsx", "beats/practice/PracticeRunner.tsx"]) {
      const src = read(path);
      expect(src, path).toMatch(/import\("\.\.\/(\.\.\/)?upsell\/noteLessonClear"\)/);
      expect(src, path).not.toMatch(/^import .*upsell/m);
    }
  });
});
