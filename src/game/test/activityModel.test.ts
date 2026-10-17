/**
 * The Feed's "Your activity" posts: only the student's own journal events,
 * newest first, with honest day labels and no post for events that are not
 * wins (attempts, spends, settings).
 */

import { describe, expect, it } from "vitest";
import type { EconomyEvent } from "@blueberry/economy";
import { activityFeed } from "../tabs/feed/activityModel";

const TZ = "UTC";
const NOW = "2026-10-16T14:00:00.000Z";
const titles: Record<string, string> = { n1: "Rank carbocation stability", u1: "Unit 1" };
const titleFor = (id: string) => titles[id] ?? null;

function day(daysAgo: number): string {
  return new Date(Date.parse(NOW) - daysAgo * 86_400_000).toISOString();
}

function cleared(daysAgo: number, nodeId: string, flawless = false): EconomyEvent {
  return { kind: "node_cleared", at: day(daysAgo), tz: TZ, nodeId, nodeKind: "concept", flawless, stepsInOneSitting: 1, spine: true, difficulty: 1 } as EconomyEvent;
}

describe("activityFeed", () => {
  it("is empty for an empty journal", () => {
    expect(activityFeed([], titleFor, NOW)).toEqual([]);
  });

  it("posts wins newest first with day labels, and skips attempts", () => {
    const journal: EconomyEvent[] = [
      cleared(3, "n1"),
      { kind: "attempt", at: day(1), tz: TZ, nodeId: "n1", problemId: "p", correct: true },
      { kind: "cards_reviewed", at: day(1), tz: TZ, graded: 6 },
      { kind: "unit_cleared", at: day(0), tz: TZ, unitId: "u1" },
    ];
    const feed = activityFeed(journal, titleFor, NOW);
    expect(feed.map((item) => [item.text, item.when])).toEqual([
      ["Finished Unit 1", "Today"],
      ["Reviewed 6 cards", "Yesterday"],
      ["Cleared Rank carbocation stability", "3 days ago"],
    ]);
  });

  it("calls out a flawless clear and falls back when a title is unknown", () => {
    const feed = activityFeed([cleared(0, "n1", true), cleared(0, "zz")], titleFor, NOW);
    expect(feed.map((item) => item.kind)).toEqual(["cleared", "flawless"]);
    expect(feed[0]?.text).toBe("Cleared a lesson");
  });

  it("never posts a beta unlock, which is stamped at the epoch", () => {
    const beta = { ...cleared(0, "n1"), at: "1970-01-01T00:00:00.000Z" } as EconomyEvent;
    const feed = activityFeed([cleared(2, "n1"), beta], titleFor, NOW);
    expect(feed.map((item) => item.when)).toEqual(["2 days ago"]);
  });

  it("caps the number of posts", () => {
    const journal = Array.from({ length: 20 }, () => cleared(0, "n1"));
    expect(activityFeed(journal, titleFor, NOW, 5)).toHaveLength(5);
  });
});
