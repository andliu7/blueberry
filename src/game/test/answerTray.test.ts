/**
 * The answer tray's two small rules (A2 round 5): the tray shows only the
 * first sentence of an explanation, and the green tray's combo counts right
 * answers in a row, where a first-meeting miss breaks the run even though it
 * clears the beat.
 */
import { describe, expect, it } from "vitest";

import { firstSentence } from "../beats/AnswerTray";
import { currentRun, startMcqSession } from "../beats/mcq/session";
import type { BeatResult } from "../beats/types";

describe("firstSentence", () => {
  it("splits at the first sentence end followed by a capital", () => {
    expect(firstSentence("Cold locks it in. Warm lets it settle.")).toEqual({
      first: "Cold locks it in.",
      rest: "Warm lets it settle.",
    });
  });

  it("never splits inside a number or an abbreviation", () => {
    const text = "The 1.4 ratio holds, e.g. at low temperature.";
    expect(firstSentence(text)).toEqual({ first: text, rest: "" });
  });
});

describe("currentRun", () => {
  const base = { beatId: "b", level: 1, cause: "correct", elapsedMs: 1, at: "2026-10-16T00:00:00Z" };
  const right = { ...base, kind: "correct" } as unknown as BeatResult;
  const pass = { ...base, kind: "correct", distractorId: "x" } as unknown as BeatResult;
  const miss = { ...base, kind: "invalid", distractorId: "x" } as unknown as BeatResult;
  const withResults = (results: readonly BeatResult[]) => ({ ...startMcqSession([], 1), results });

  it("counts right answers back from the latest", () => {
    expect(currentRun(withResults([miss, right, right]))).toBe(2);
  });

  it("is broken by a miss and by a first-meeting pass", () => {
    expect(currentRun(withResults([right, miss]))).toBe(0);
    expect(currentRun(withResults([right, pass]))).toBe(0);
  });
});
