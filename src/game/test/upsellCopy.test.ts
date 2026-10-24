// @vitest-environment jsdom
/**
 * The Pro sheet's copy (G3). It sells, so it is held to the plans card: every
 * line of what Pro adds must also be on the Pro card in subscription-plans.tsx,
 * so the sheet cannot promise a feature the plans card does not. And it is held
 * to the site's copy rules: no em dash, nothing that admits to being unfinished
 * (the same words landingCopy.test.ts refuses).
 */
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { PRO_VALUE } from "../upsell/UpsellSheet";

const read = (path: string) => readFileSync(new URL(path, import.meta.url), "utf8");

const SHEET = read("../upsell/UpsellSheet.tsx");
const PLANS = read("../../components/ui/subscription-plans.tsx");

/** Code with comments removed: a comment never reaches the screen. */
function copyOf(source: string): string {
  return source.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/.*$/gm, "");
}

describe("upsell copy", () => {
  it("lists at least one thing Pro adds", () => {
    expect(PRO_VALUE.length).toBeGreaterThan(0);
  });

  it("promises nothing the Pro card on the plans panel does not", () => {
    for (const line of PRO_VALUE) expect(PLANS, line).toContain(`"${line}"`);
  });

  it("has no em dash", () => {
    expect(SHEET).not.toContain("—");
  });

  it("admits to nothing unfinished", () => {
    expect(copyOf(SHEET)).not.toMatch(/fake|lorem|TBD|placeholder/i);
  });

  it("never claims an email it did not record", () => {
    const thanks = SHEET.indexOf("We'll email you");
    expect(thanks).toBeGreaterThan(0);
    // The email line is only the `recorded` branch; the fallback says the device.
    expect(SHEET.slice(thanks - 40, thanks)).toMatch(/recorded \?/);
    expect(SHEET).toContain("Saved on this device.");
  });
});
