// @vitest-environment jsdom
/**
 * #/phone (owner, 2026-10-21): the course in a phone frame, reachable ONLY by URL, with store
 * labels that are status text and never buttons (the apps are not listed yet).
 */
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { PhonePage } from "@/components/PhonePage";
import { isFlowRoute } from "@/lib/siteNav";

function sourceFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) return name === "test" ? [] : sourceFiles(path);
    return /\.(tsx?|css)$/.test(name) ? [path] : [];
  });
}

describe("#/phone", () => {
  it("is linked from nowhere on the site", () => {
    const linking = sourceFiles(join(__dirname, "..")).filter((file) =>
      /["'`]#\/phone\b/.test(readFileSync(file, "utf8")),
    );
    expect(linking).toEqual([]);
  });

  it("is a page of its own, without the site header and footer", () => {
    expect(isFlowRoute("phone")).toBe(true);
  });

  it("shows the real game and store labels that are not buttons", () => {
    const html = renderToStaticMarkup(createElement(PhonePage));
    expect(html).toMatch(/<iframe[^>]+src="[^"]*#\/app"/);
    expect(html).not.toMatch(/<a\b|<button\b|tabindex/i);
    expect(html).toContain('aria-label="App Store and Google Play: coming soon"');
    expect(html).toContain("Coming soon");
  });
});
