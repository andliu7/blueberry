/**
 * Where ads may and may not go (owner, 23 Oct, G4), read from the source.
 *
 * Calm surfaces only: between path sections, the feed, the site's own pages. Never inside
 * a lesson, quiz, test-out, review, sign-in, the start funnel, checkout or the admin viewer.
 * Google's script is named in one file, and the slot's body is reached only through lazy().
 */

import { readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const root = path.resolve(__dirname, "../..");
const src = path.join(root, "src");
const read = (rel: string) => readFileSync(path.join(root, rel), "utf8");

function walk(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const full = path.join(dir, name);
    if (statSync(full).isDirectory()) return walk(full);
    return /\.(tsx?|css|html)$/.test(name) ? [full] : [];
  });
}

const rel = (full: string) => path.relative(root, full).split(path.sep).join("/");

describe("ad placement", () => {
  it("names Google's script in src/lib/ads/adsense.ts only, never in index.html", () => {
    // Built from two halves so this file does not match itself.
    const needle = "adsbygoogle" + ".js";
    const hits = walk(src)
      .filter((file) => readFileSync(file, "utf8").includes(needle))
      .map(rel);
    expect(hits).toEqual(["src/lib/ads/adsense.ts"]);
    expect(read("index.html")).not.toContain(needle);
  });

  it("no lesson, quiz, test-out, review, sign-in, funnel, checkout or admin file uses AdSlot", () => {
    const forbiddenDirs = [
      "src/game/lesson",
      "src/game/beats",
      "src/game/admin",
      "src/game/onboarding",
      "src/game/upsell",
      "src/components/start",
    ];
    const forbiddenFiles = [
      "src/game/tabs/pathway/TestOutRun.tsx",
      "src/game/tabs/pathway/ReviewRun.tsx",
      "src/components/ui/subscription-plans.tsx",
      "src/components/SignInPage.tsx",
      "src/components/StartPage.tsx",
      "src/components/EntryGate.tsx",
      "src/components/AppGate.tsx",
    ];
    const files = [
      ...forbiddenDirs.flatMap((dir) => walk(path.join(root, dir)).map(rel)),
      ...forbiddenFiles,
    ];
    expect(files.length).toBeGreaterThan(forbiddenFiles.length);
    const offenders = files.filter((file) => /\bAdSlot\b|components\/ads\//.test(read(file)));
    expect(offenders).toEqual([]);
  });

  it("the slot's body is only reached through lazy()", () => {
    expect(read("src/components/ads/AdSlot.tsx")).toContain('lazy(() => import("./AdSlotBody"))');
    const importers = walk(src)
      .filter((file) => !file.endsWith(`${path.sep}AdSlot.tsx`) && !file.includes(`${path.sep}test${path.sep}`))
      // An import of it, static or dynamic; a mention in a comment is fine.
      .filter((file) => /from\s+["'][^"']*AdSlotBody["']|import\(\s*["'][^"']*AdSlotBody["']/.test(readFileSync(file, "utf8")))
      .map(rel);
    expect(importers).toEqual([]);
  });

  it("each calm surface draws its slot", () => {
    expect(read("src/game/tabs/pathway/PathwayTab.tsx")).toContain('<AdSlot placement="path" />');
    expect(read("src/game/tabs/feed/FeedTab.tsx")).toContain('<AdSlot placement="feed" />');
    expect(read("src/components/HomePage.tsx")).toContain('<AdSlot placement="site" />');
    expect(read("src/components/FaqPage.tsx")).toContain('<AdSlot placement="site" />');
  });
});
