/**
 * THE SEAM BETWEEN THE SHEET AND THE TAB BAR, and the test that did not exist.
 *
 * The round 2 critic's finding, in full: pathway-sheet.css set
 * `--ns-bottom-inset: 4.8125rem` (77 px) while the tab bar measures 76.19, so
 * a full-width one CSS px strip of the PATHWAY leaked between the sheet's
 * bottom edge and the bar's top edge. It was sampled in the render at device
 * row y 1534 (css 767): terrain at x 50 and x 350, trail violet at x 150. The
 * stylesheet calls the value "THE ONE HOOK THE INTEGRATOR MAY SET",
 * PathwayTab.tsx never sets it, so the FALLBACK is what ships, and the critic
 * closed with "no test locks it".
 *
 * This is that test. It does not hardcode 76: it RECOMPUTES the bar's height
 * from app/ui/tabs.css, the file that decides it, so the day someone changes
 * the bar's padding or its icon size this file goes red instead of the seam
 * silently reopening. A number copied here would have gone stale the same way
 * 4.8125rem did.
 *
 * The inset must be less than or equal to the bar's height. Equal is the
 * ideal (edge meets edge, as the reference draws it). Under by a fraction is
 * safe, because the sheet's own cream then overlaps the bar's top border by
 * that fraction and no ground can show through. OVER is the bug: it lifts the
 * sheet off the bar and opens the strip.
 */

import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const TABS = readFileSync(fileURLToPath(new URL("../app/ui/tabs.css", import.meta.url)), "utf8");
const SHEET = readFileSync(fileURLToPath(new URL("../pathway-sheet/pathway-sheet.css", import.meta.url)), "utf8");

/**
 * The declaration block for a selector, taken from the FIRST rule that opens
 * it. The selector arrives already regex-escaped (`\\.tabbar`), because the
 * point is to match `.tabbar {` and not `.tabbar-item {`.
 */
function block(css: string, selector: string): string {
  const at = css.search(new RegExp(`(^|\\n)\\s*${selector}\\s*\\{`));
  expect(at, `selector present: ${selector}`).toBeGreaterThanOrEqual(0);
  const open = css.indexOf("{", at);
  const close = css.indexOf("}", open);
  return css.slice(open + 1, close);
}

/** A length in px, resolving rem at the app's 16px root. */
function px(value: string): number {
  const m = value.match(/(-?[\d.]+)(px|rem)/);
  expect(m, `a px or rem length in "${value}"`).not.toBeNull();
  return m![2] === "rem" ? Number(m![1]) * 16 : Number(m![1]);
}

/** One declaration's value out of a block. */
function decl(declarations: string, property: string): string {
  const m = declarations.match(new RegExp(`(?:^|;|\\n)\\s*${property}:\\s*([^;]+);`));
  expect(m, `${property} declared`).not.toBeNull();
  return String(m![1]).trim();
}

/**
 * The tab bar's height at 390 px wide, in px, recomputed from tabs.css.
 *
 * The bar is a grid whose one row is the tallest .tabbar-item, and the item
 * is a column flex of icon, gap, label. Everything below is read out of the
 * stylesheet; nothing is a number typed into this file.
 */
function tabBarHeightPx(): number {
  const bar = block(TABS, "\\.tabbar");
  const item = block(TABS, "\\.tabbar-item");
  const icon = block(TABS, "\\.tabbar-icon");

  const borderTop = px(decl(bar, "border-top"));
  // padding: <y> <x>, then padding-bottom: max(<y>, safe-area). The safe area
  // is 0 on the reference devices in the browser, so the max resolves to the
  // declared length, which is the same value the shorthand carried.
  const barPadY = px(String(decl(bar, "padding").split(/\s+/)[0]));
  const barPadBottom = px(String(decl(bar, "padding-bottom").replace(/max\(/, "").split(",")[0]));

  // padding: <top> <x> <bottom> on the item.
  const itemPad = decl(item, "padding").split(/\s+/);
  const itemPadTop = px(String(itemPad[0]));
  const itemPadBottom = px(String(itemPad[2] ?? itemPad[0]));
  const itemBorder = px(decl(item, "border")) * 2;
  const itemGap = px(decl(item, "gap"));

  const iconH = px(decl(icon, "height"));

  // The label: font-size is --text-scale-xs with the item's own line-height.
  const themeCss = readFileSync(fileURLToPath(new URL("../theme.css", import.meta.url)), "utf8");
  const xsMatch = themeCss.match(/--text-scale-xs:\s*([^;]+);/);
  expect(xsMatch, "--text-scale-xs declared in theme.css").not.toBeNull();
  const xs = px(String(xsMatch![1]));
  const labelH = xs * Number(decl(item, "line-height"));

  const content = iconH + itemGap + labelH;
  const itemH = Math.max(content + itemPadTop + itemPadBottom + itemBorder, px(decl(item, "min-height").replace(/var\([^,]+,\s*/, "").replace(/\)$/, "")));

  return borderTop + barPadY + itemH + barPadBottom;
}

describe("the sheet's bottom edge lands on the tab bar, with nothing between", () => {
  it("the recomputed bar height matches what the browser measures", () => {
    // The live render at 390x844 reports 76.19 (measurements/_probe-sheet-r3).
    // A quarter px of slack absorbs the sub-pixel rounding of the label line.
    expect(tabBarHeightPx()).toBeGreaterThan(75.9);
    expect(tabBarHeightPx()).toBeLessThan(76.5);
  });

  it("--ns-bottom-inset never exceeds the bar it sits on", () => {
    const sheet = block(SHEET, "\\.ns-sheet");
    const inset = decl(sheet, "--ns-bottom-inset");
    // calc(<length> + env(safe-area-inset-bottom, 0px)): the safe area is 0
    // in the browser and on the reference devices in portrait, and it is
    // ADDED to the bar's own padding-bottom by the same max(), so the two
    // move together. The measured term is the length.
    const declared = px(inset);
    const bar = tabBarHeightPx();
    expect(declared, `inset ${declared} vs bar ${bar}`).toBeLessThanOrEqual(bar);
    // And it may not be so far under that the sheet climbs into the bar.
    expect(bar - declared).toBeLessThan(2);
  });

  it("the inset carries the safe area the bar's own padding carries", () => {
    // .tabbar's padding-bottom is max(0.375rem, env(safe-area-inset-bottom)),
    // so on a device with a home indicator the bar grows and the sheet's edge
    // has to grow with it or the strip reopens there instead.
    expect(decl(block(SHEET, "\\.ns-sheet"), "--ns-bottom-inset")).toContain("env(safe-area-inset-bottom");
    expect(decl(block(TABS, "\\.tabbar"), "padding-bottom")).toContain("env(safe-area-inset-bottom");
  });

  it("above the rail breakpoint the inset is zero, because the bar is not below", () => {
    // At 48rem .tabbar becomes a static side rail, so a bottom inset would
    // suspend the sheet in mid air.
    const wide = SHEET.match(/@media \(min-width: 48rem\) \{\s*\.ns-sheet \{([\s\S]*?)\}/);
    expect(wide, "the sheet answers the rail breakpoint").not.toBeNull();
    expect(px(decl(String(wide![1]), "--ns-bottom-inset"))).toBe(0);
    expect(TABS).toMatch(/@media \(min-width: 48rem\)[\s\S]*?\.tabbar \{[\s\S]*?position: static/);
  });
});
