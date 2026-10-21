/**
 * ONE QUESTION, ONE PHONE SCREEN (owner, 20 Oct, STATUS.md queue item 18:
 * "free up some of the free space, so that it can fit into one page (on the
 * phone)").
 *
 * The fit itself is measured with screenshots at 390 by 844; the web suite
 * runs in node with no layout engine, so these tests pin the source rules
 * that the measurement depended on. If one of them has to change, re-measure
 * a lesson on a phone-sized screen before changing the expectation.
 */
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

function source(relative: string): string {
  return readFileSync(fileURLToPath(new URL(relative, import.meta.url)), "utf8");
}

/** The body of the first CSS rule whose selector is exactly `selector`. */
function rule(css: string, selector: string): string {
  const start = css.indexOf(`\n${selector} {`);
  expect(start, `no rule for ${selector}`).toBeGreaterThanOrEqual(0);
  return css.slice(start, css.indexOf("}", start));
}

describe("the MCQ question fits one phone screen", () => {
  const view = source("../beats/mcq/McqBeatView.tsx");

  it("sets the stem one heading step down", () => {
    expect(view).toMatch(/<h1 className="bb-h2 text-bb-foreground">\{beat\.prompt\}<\/h1>/);
  });

  it("never lets the option group shrink below its own rows", () => {
    // With `min-h-0` the rows overflowed the group and drew over the report
    // link underneath (measured at 375 by 667).
    expect(view).toContain('${answered ? "shrink-0" : "flex-1"}');
    expect(view).not.toContain('"min-h-0 flex-1"}');
  });

  it("keeps every option row at least 44px tall", () => {
    const card = rule(source("../beats/beat-chrome.css"), ".option-card");
    const min = /min-height:\s*([\d.]+)rem/.exec(card);
    expect(min).not.toBeNull();
    expect(Number(min![1]) * 16).toBeGreaterThanOrEqual(44);
  });
});

describe("the ranking ladder fits one phone screen", () => {
  const css = source("../beats/sort/sort.css");

  it("draws the rung's structure in the 72px box", () => {
    expect(rule(css, ".sort-card__figure")).toMatch(/height:\s*4\.5rem/);
  });

  it("keeps every rung a 44px target", () => {
    expect(rule(css, ".sort-card__face")).toMatch(/min-height:\s*var\(--hit-min, 2\.75rem\)/);
  });
});
