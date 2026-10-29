/**
 * The admin statistics board, pinned: it renders, says out loud that its
 * numbers are a sample, shows no currency symbol, no Geist, and the new files
 * carry no em dash.
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { AnalyticsBoard } from "../admin/StatsBoard";
import type { LiveStats } from "../admin/statsLive";

const html = renderToStaticMarkup(createElement(AnalyticsBoard, { live: null }));
const files = [
  "src/components/ui/analytics-bento.tsx",
  "src/game/admin/StatsBoard.tsx",
  "src/game/admin/statsLive.ts",
  "src/game/admin/honesty.tsx",
  "src/game/test/statsBoard.test.ts",
];

const series = Array.from({ length: 30 }, (_, i) => ({ label: `d${i}`, value: i % 4 }));
const hours = [new Array<number>(24).fill(1), new Array<number>(24).fill(2)];
const liveStats: LiveStats = {
  live: { users: true, signups: true, join: true, retention: true, device: true, sessions: true, attempts: false, seasonality: true, paying: false },
  totalLearners: 321,
  active7: 77,
  paying: null,
  signups: { series, previous: 20 },
  join: { hour: 21, weekday: "Sunday", medianDays: 1 },
  retention: { d1: 0.5, d7: null, d30: null },
  device: { mobile: 0.7, desktop: 0.3 },
  sessions: { desktop: hours, mobile: hours },
  attempts: null,
  seasonality: [{ year: 2026, values: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12] }],
};
const liveHtml = renderToStaticMarkup(createElement(AnalyticsBoard, { live: liveStats }));

describe("admin statistics board", () => {
  it("renders the four cards and the strip", () => {
    expect(html).toContain("New sign-ups");
    expect(html).toContain("Sessions by hour");
    expect(html).toContain("Where learners spend attempts");
    expect(html).toContain("Exam seasonality");
    expect(html).toContain("Acquisition cost (CAC)");
  });
  it("with nothing read, every tile says No data, example and prints no invented figure", () => {
    expect(html).toContain("No data, example");
    expect(html).not.toContain("Sample data");
    expect(html).not.toContain("source-note");
    expect(html).not.toContain(">640<");
    expect(html).not.toContain("62%");
  });
  it("with real figures, a live tile prints its number and names its source", () => {
    expect(liveHtml).toContain("321");
    expect(liveHtml).toContain("Source: profiles");
    expect(liveHtml).toContain("Live");
  });
  it("a part with no source stays an example even when others are live", () => {
    expect(liveHtml).toContain("No data, example");
    expect(liveHtml).toContain("Feeds from logged ad spend");
    expect(liveHtml).not.toContain("sample-chip");
  });
  it("has no currency symbol and no Geist", () => {
    expect(html).not.toContain("$");
    expect(html).not.toContain("Geist");
    for (const f of files.slice(0, 2)) expect(readFileSync(resolve(f), "utf8")).not.toMatch(/Geist(?! )|"Geist/);
  });
  it("has no em dash in the new files", () => {
    const dash = String.fromCharCode(0x2014);
    for (const f of files) expect(readFileSync(resolve(f), "utf8").includes(dash), f).toBe(false);
  });
});
