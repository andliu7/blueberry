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
import StatsBoardPage, { AnalyticsBoard, sampleAdminStats } from "../admin/StatsBoard";

const html = renderToStaticMarkup(createElement(StatsBoardPage));
const files = [
  "src/components/ui/analytics-bento.tsx",
  "src/game/admin/StatsBoard.tsx",
  "src/game/test/statsBoard.test.ts",
];

describe("admin statistics board", () => {
  it("renders the four cards and the strip", () => {
    expect(html).toContain("New sign-ups");
    expect(html).toContain("Sessions by hour");
    expect(html).toContain("Where learners spend attempts");
    expect(html).toContain("Exam seasonality");
    expect(html).toContain("Acquisition cost (CAC)");
  });
  it("labels sample data, and only sample data", () => {
    expect(html).toContain("Sample data, not live");
    const live = renderToStaticMarkup(
      createElement(AnalyticsBoard, { data: { ...sampleAdminStats, source: "live" } }),
    );
    expect(live).not.toContain("Sample data, not live");
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
