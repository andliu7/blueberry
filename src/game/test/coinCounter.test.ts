/**
 * The coin counter: what its pile says, and the contrast of its digits, read
 * from hud.css rather than restated, the way hudAnatomy.test.ts reads it.
 */

import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { formatCoins, pileDiscs, shelfStacks, treasuryNote, treasuryProgress, TREASURY_FULL } from "../app/ui/CoinCounter";
import { hasNumeral, layoutNumerals } from "../app/ui/CoinNumerals";
import { DiamondMark } from "../app/ui/HudIcons";

const read = (path: string) => readFileSync(fileURLToPath(new URL(path, import.meta.url)), "utf8");
const HUD_CSS = read("../app/ui/hud.css");
const THEME = read("../theme.css");
const SHOP_CSS = read("../shop/shop.css");
const NUMERALS = read("../app/ui/CoinNumerals.tsx");

const token = (css: string, name: string): string => {
  const hit = css.match(new RegExp(`${name}:\\s*(#[0-9a-fA-F]{6})\\s*;`));
  if (hit === null) throw new Error(`no ${name}`);
  return hit[1] as string;
};

const rgb = (hex: string) => [1, 3, 5].map((i) => Number.parseInt(hex.slice(i, i + 2), 16) / 255) as [number, number, number];
const lin = (c: number) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
const lum = ([r, g, b]: readonly number[]) => 0.2126 * lin(r ?? 0) + 0.7152 * lin(g ?? 0) + 0.0722 * lin(b ?? 0);
const contrast = (a: readonly number[], b: readonly number[]) => {
  const [hi, lo] = [lum(a), lum(b)].sort((x, y) => y - x) as [number, number];
  return (hi + 0.05) / (lo + 0.05);
};
const over = (top: number, alpha: number, under: readonly number[]) => under.map((c) => top * alpha + c * (1 - alpha));

describe("the balance as it is written", () => {
  it("splits thousands with a thin space and never shows a negative", () => {
    expect(formatCoins(0)).toBe("0");
    expect(formatCoins(999)).toBe("999");
    expect(formatCoins(1240)).toBe("1 240");
    expect(formatCoins(6598529)).toBe("6 598 529");
    expect(formatCoins(-3)).toBe("0");
  });
});

describe("the pile only says how much is stored", () => {
  it("draws nothing at zero, so an empty treasury looks empty", () => {
    expect(shelfStacks(0)).toBe(0);
    expect(pileDiscs(0)).toBe(0);
  });

  it("never shrinks as the balance grows", () => {
    let stacks = 0;
    let discs = 0;
    for (let balance = 0; balance <= 5000; balance += 7) {
      expect(shelfStacks(balance)).toBeGreaterThanOrEqual(stacks);
      expect(pileDiscs(balance)).toBeGreaterThanOrEqual(discs);
      stacks = shelfStacks(balance);
      discs = pileDiscs(balance);
    }
    expect(stacks).toBe(9);
    expect(discs).toBe(3);
  });
});

describe("the rail is a meter of the balance against a full treasury", () => {
  it("is empty at nothing and full at the top", () => {
    expect(treasuryProgress(0).fraction).toBe(0);
    expect(treasuryProgress(TREASURY_FULL).fraction).toBe(1);
    expect(treasuryProgress(TREASURY_FULL * 50).fraction).toBe(1);
  });

  it("never restarts: more coins always draws more gold, up to the top", () => {
    let last = -1;
    for (let balance = 0; balance <= 3000; balance += 1) {
      const { fraction } = treasuryProgress(balance);
      expect(fraction).toBeGreaterThan(last);
      last = fraction;
    }
    for (const balance of [5000, 8852, 13685, 86420, 567890, TREASURY_FULL]) {
      const { fraction } = treasuryProgress(balance);
      expect(fraction).toBeGreaterThan(last);
      last = fraction;
    }
  });

  it("still says how far off the next stack is", () => {
    expect(treasuryProgress(100).toNext).toBe(100);
    expect(treasuryProgress(150).toNext).toBe(50);
    expect(treasuryProgress(199).toNext).toBe(1);
    expect(treasuryProgress(2000).toNext).toBeNull();
  });

  it("wins a stack at exactly the moment the fill says it does", () => {
    for (let balance = 0; balance < 2500; balance += 1) {
      const { toNext } = treasuryProgress(balance);
      if (toNext !== null) expect(shelfStacks(balance + toNext)).toBe(shelfStacks(balance) + 1);
    }
  });

  it("stays between empty and full, and keeps moving after the shelf is full", () => {
    for (let balance = 0; balance <= 5000; balance += 7) {
      const { fraction } = treasuryProgress(balance);
      expect(fraction).toBeGreaterThanOrEqual(0);
      expect(fraction).toBeLessThanOrEqual(1);
    }
    expect(treasuryProgress(2000).fraction).toBeLessThan(treasuryProgress(4000).fraction);
    expect(treasuryProgress(999999).fraction).toBeLessThan(1);
  });

  it("says the same thing in words", () => {
    expect(treasuryNote(0)).toBe("1 coin to your first stack");
    expect(treasuryNote(150)).toBe("50 coins to your next stack");
    expect(treasuryNote(199)).toBe("1 coin to your next stack");
    expect(treasuryNote(2000)).toBe("Your shelf is full, and the gold keeps climbing");
    expect(treasuryNote(TREASURY_FULL)).toBe("Your shelf is full");
  });
});

describe("the digits on the rail", () => {
  const digit = rgb(token(HUD_CSS, "--cc-digit"));
  const stops = ["--cc-rail-hi", "--cc-rail", "--cc-rail-lo"].map((name) => rgb(token(HUD_CSS, name)));

  it("clear AA on every stop of the rail", () => {
    for (const stop of stops) {
      expect(contrast(digit, stop)).toBeGreaterThanOrEqual(4.5);
      expect(contrast(digit, over(1, 0.14, stop))).toBeGreaterThanOrEqual(4.5);
    }
  });

  it("are on an opaque rail graded smoothly, so the page behind cannot change the pair", () => {
    expect(HUD_CSS).toMatch(/linear-gradient\(to bottom, var\(--cc-rail-hi\), var\(--cc-rail\) 48%, var\(--cc-rail-lo\)\)/);
    expect(HUD_CSS).not.toMatch(/--cc-band-/);
    for (const name of ["--cc-rail-hi", "--cc-rail", "--cc-rail-lo"]) expect(token(HUD_CSS, name)).toMatch(/^#/);
    // The gloss over the track is the 0.14 white the contrast check above allows for.
    expect(HUD_CSS).toMatch(/linear-gradient\(to bottom, rgb\(255 255 255 \/ 0\.14\), rgb\(255 255 255 \/ 0\) var\(--cc-gloss\)\)/);
  });

  it("are pure white", () => {
    expect(token(HUD_CSS, "--cc-digit")).toBe("#ffffff");
  });

  it("hold on the gold fill by their line, on every stop of the fill", () => {
    const line = rgb(token(HUD_CSS, "--cc-digit-line"));
    for (const name of ["--cc-fill-hi", "--cc-fill", "--cc-fill-lo"]) expect(contrast(line, rgb(token(HUD_CSS, name)))).toBeGreaterThanOrEqual(4.5);
  });

  it("keep the +N tag's gold and the spend's white at AA on the tag's own opaque plate", () => {
    const plate = rgb(token(HUD_CSS, "--cc-rail"));
    expect(contrast(rgb(token(HUD_CSS, "--cc-gain")), plate)).toBeGreaterThanOrEqual(4.5);
    expect(contrast(digit, plate)).toBeGreaterThanOrEqual(4.5);
    expect(HUD_CSS).toMatch(/\.coin-counter-gain \{[^}]*background: var\(--cc-rail\);/);
  });

  it("sit inside the rail with room to spare: the cap is 52 to 58 percent of its inner height, at every size", () => {
    const REM = 16;
    const RIM = 2; // 1px of rim, top and bottom.
    const rule = (css: string, selector: string) => {
      const at = css.indexOf(`${selector} {`);
      if (at < 0) throw new Error(`no ${selector}`);
      return css.slice(at, css.indexOf("}", at));
    };
    const rem = (block: string, name: string) => {
      const hit = block.match(new RegExp(`${name}:\\s*([0-9.]+)rem`));
      if (hit === null) throw new Error(`no ${name}`);
      return Number(hit[1]) * REM;
    };
    for (const block of [rule(HUD_CSS, ".coin-counter"), rule(HUD_CSS, ".coin-counter--hero"), rule(SHOP_CSS, ".shop-balance .coin-counter")]) {
      const ratio = rem(block, "--cc-cap") / (rem(block, "--cc-h") - RIM);
      expect(ratio).toBeGreaterThanOrEqual(0.52);
      expect(ratio).toBeLessThanOrEqual(0.58);
    }
  });

  it("hold the rail's edge on every ground: the outline on pale, the bronze rim on night", () => {
    expect(HUD_CSS).toMatch(/0 0 0 0\.75px var\(--coin-line\)/);
    const outline = rgb(token(THEME, "--coin-line"));
    const rim = rgb(token(HUD_CSS, "--cc-rim"));
    for (const pale of ["#cfeaf6", "#ffffff", "#ece8fb"]) expect(contrast(outline, rgb(pale))).toBeGreaterThanOrEqual(3);
    for (const night of ["#101827", "#192438"]) expect(contrast(rim, rgb(night))).toBeGreaterThanOrEqual(3);
  });
});

describe("the lettering", () => {
  const line = rgb(token(HUD_CSS, "--cc-digit-line"));
  const face = rgb(token(HUD_CSS, "--cc-digit"));

  it("draws every character a balance or a change can write", () => {
    for (const char of "0123456789+−") expect(hasNumeral(char)).toBe(true);
  });

  it("holds on any ground: the line clears the pale ones and the face clears night", () => {
    const grounds = ["#cfeaf6", "#ffffff", "#ece8fb", "#fff3b0", "#ffc21a", "#d98a12"];
    for (const ground of grounds) expect(contrast(line, rgb(ground))).toBeGreaterThanOrEqual(4.5);
    for (const night of ["#101827", "#192438"]) expect(contrast(face, rgb(night))).toBeGreaterThanOrEqual(4.5);
  });

  it("separates the face from its line, so the shape reads at header size", () => {
    expect(contrast(face, line)).toBeGreaterThanOrEqual(4.5);
  });

  it("is one flat white face with its wall fused to it: no gradient, no second face", () => {
    expect(NUMERALS).not.toMatch(/linearGradient/);
    expect(NUMERALS.match(/fill="var\(--cc-digit\)"/g)?.length).toBe(1);
  });

  it("is hand-cut: the digits lean, and no two share both a tilt and a height", () => {
    expect(NUMERALS).toMatch(/skewX\(/);
    const { slots } = layoutNumerals("0123456789");
    const hands = slots.map((slot) => `${slot.glyph.tilt}/${slot.glyph.dy}`);
    expect(new Set(hands).size).toBe(10);
    for (const slot of slots) expect(Math.abs(slot.glyph.tilt)).toBeGreaterThan(0);
  });

  it("pinches the 0's counter to a slot under a quarter of the digit's area", () => {
    const zero = layoutNumerals("0").slots[0]?.glyph;
    const box = (path: string) => {
      const nums = [...path.matchAll(/-?\d+(?:\.\d+)?/g)].map((m) => Number(m[0]));
      const xs = nums.filter((_, i) => i % 2 === 0);
      const ys = nums.filter((_, i) => i % 2 === 1);
      return (Math.max(...xs) - Math.min(...xs)) * (Math.max(...ys) - Math.min(...ys));
    };
    expect(box(zero?.c ?? "")).toBeLessThan(box(zero?.d ?? "") / 4);
  });

  it("spaces digits evenly, the 1 included, so long balances never turn to mush", () => {
    const { slots } = layoutNumerals("1111111");
    const steps = slots.slice(1).map((slot, i) => slot.x - (slots[i]?.x ?? 0));
    expect(new Set(steps).size).toBe(1);
    const width = (char: string) => layoutNumerals(char).slots[0]?.glyph.w;
    for (const char of "0123456789") expect(width(char)).toBe(width("0"));
  });

  it("reserves the same width for any digits, so a roll never moves the header", () => {
    const width = (text: string) => layoutNumerals(text).boxW;
    expect(width("1 111")).toBe(width("8 888"));
    expect(width("0")).toBe(width("7"));
  });

  it("kerns tight: the art never leaves more than a sliver of its reserved width", () => {
    const { slots, boxW } = layoutNumerals("1 260");
    const last = slots[slots.length - 1];
    const inked = (last?.x ?? 0) + (last?.glyph.w ?? 0) - (slots[0]?.x ?? 0);
    expect(boxW - inked).toBeLessThan(40);
  });
});

describe("the coin and the rail are one object", () => {
  const coin = () => renderToStaticMarkup(createElement(DiamondMark, { heavy: true }));
  const fillRule = () => HUD_CSS.slice(HUD_CSS.indexOf(".coin-counter-fill {"), HUD_CSS.indexOf("}", HUD_CSS.indexOf(".coin-counter-fill {")));

  it("paints the counter's coin as metal: a graded field, a rim and a soft shine, on a blank face", () => {
    const markup = coin();
    expect(markup).toMatch(/radialGradient/);
    expect(markup).not.toMatch(/COIN_STAR|<polygon/);
    // The shine is painted by gradients, not cut as a hard shape in a flat colour.
    expect(markup).not.toMatch(/fill="var\(--cc-fill-hi\)"/);
  });

  it("varies the outline: a heavier copy sits low under a thin one", () => {
    const widths = [...coin().matchAll(/stroke-width="([0-9.]+)"/g)].map((m) => Number(m[1]));
    expect(Math.max(...widths)).toBeLessThan(0.8);
    expect(coin()).toMatch(/translate\(0 0\.2\)/);
  });

  it("gives the coin's field and the rail's flat fill the same golds", () => {
    for (const name of ["--cc-fill-hi", "--cc-fill", "--cc-fill-lo"]) {
      expect(coin()).toContain(`var(${name})`);
      expect(fillRule()).toContain(`var(${name})`);
    }
    // Flat: the one gold holds from under the gloss to just above the base line.
    expect(fillRule()).toMatch(/var\(--cc-fill\) var\(--cc-gloss\), var\(--cc-fill\) 86%/);
  });

  it("lights the rail's rim like the coin's: bright on top, deep underneath", () => {
    expect(HUD_CSS).toMatch(/inset 0 1px 0 var\(--cc-rim-hi\),\s*inset 0 -1px 0 var\(--cc-rim-lo\)/);
  });

  it("drops a soft contact shadow on the rail, cut by the rail so it never marks the page", () => {
    const rail = HUD_CSS.slice(HUD_CSS.indexOf(".coin-counter-rail {"), HUD_CSS.indexOf("}", HUD_CSS.indexOf(".coin-counter-rail {")));
    expect(rail).toMatch(/overflow: hidden/);
    expect(HUD_CSS).toMatch(/\.coin-counter-rail::before \{[^}]*radial-gradient/);
  });

  it("has no fade behind the coin", () => {
    expect(HUD_CSS).not.toMatch(/\.coin-counter-rail::after/);
  });

  it("cuts the fill with a straight edge: no rake and no clip", () => {
    expect(fillRule()).not.toMatch(/clip-path|skew/);
    expect(HUD_CSS).not.toMatch(/--cc-rake/);
    expect(fillRule()).toMatch(/translateX\(calc\(\(var\(--cc-frac, 0\) - 1\)/);
  });

  it("puts no gold on the rim, so an empty track looks empty", () => {
    const rail = HUD_CSS.slice(HUD_CSS.indexOf(".coin-counter-rail {"), HUD_CSS.indexOf("}", HUD_CSS.indexOf(".coin-counter-rail {")));
    expect(rail).not.toMatch(/--coin-rim/);
  });

  it("at the header's size the edge never stands in a thousands gap and crosses the digits", () => {
    const REM = 16;
    const rule = HUD_CSS.slice(HUD_CSS.indexOf(".coin-counter {"), HUD_CSS.indexOf("}", HUD_CSS.indexOf(".coin-counter {")));
    const num = (name: string) => Number(rule.match(new RegExp(`${name}:\\s*([0-9.]+)rem`))?.[1]) * REM;
    const [cap, lead, pad, track] = ["--cc-cap", "--cc-lead", "--cc-pad", "--cc-track"].map(num) as [number, number, number, number];
    for (const balance of [1, 7, 18, 37, 99, 140, 360, 700, 1000, 1560, 2000, 4999, 7345, 10000, 25000, 86420, 100000, 567890, 999999]) {
      const { slots, boxW } = layoutNumerals(formatCoins(balance));
      const ends = slots.map((slot) => lead + ((slot.x + slot.glyph.w) * cap) / 100);
      const starts = slots.map((slot) => lead + (slot.x * cap) / 100);
      const length = Math.max(track, lead + (boxW * cap) / 100 + pad);
      const edge = treasuryProgress(balance).fraction * length;
      // Inside the digits, from the first digit's start to past the last one's foot.
      expect(edge).toBeLessThanOrEqual((ends[ends.length - 1] ?? 0) + 8);
      // Never in the wide gap: past the end of a digit whose next digit starts a new group.
      for (let i = 0; i + 1 < slots.length; i += 1) {
        const gap = (starts[i + 1] ?? 0) - (ends[i] ?? 0);
        if (gap > (7 * cap) / 100 + 0.01) expect(edge < (ends[i] ?? 0) || edge > (starts[i + 1] ?? 0)).toBe(true);
      }
    }
  });
});

describe("reduced motion", () => {
  it("stops every counter animation under both switches", () => {
    expect(HUD_CSS).toMatch(/html\[data-motion="reduced"\] \.coin-counter \*/);
    expect(HUD_CSS).toMatch(/@media \(prefers-reduced-motion: reduce\) \{\s*\.coin-counter,\s*\.coin-counter \*/);
  });
});
