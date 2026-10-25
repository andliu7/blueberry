/**
 * BloomStage, the overlays drawn beside the berry on a grading surface
 * (documentation/BLOOM-STATES-SPEC.md, section B). Static markup only: the
 * motion itself is judged by eye in the gallery. What a diff could break:
 *
 * 1. The overlay matches comboOverlayFor: three extra sparkles at 5 and 8
 *    (Berry draws its own three), confetti at 8 only, nothing for 0 or null.
 * 2. Reduced motion is a prop-driven attribute, so the gallery toggle works.
 * 3. The lone pair (thinking) and the hint ring render only when asked for.
 */

import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { BloomHintRing, BloomStage, type BloomStageProps } from "../mascot/BloomStage";

const stage = (props: Partial<Omit<BloomStageProps, "children">>) =>
  renderToStaticMarkup(
    createElement(BloomStage, { reducedMotion: false, ...props, children: createElement("i", { id: "berry" }) }),
  );

const count = (html: string, cls: string) => html.split(`class="${cls}"`).length - 1;

describe("BloomStage", () => {
  it("wraps exactly one child and draws nothing else at rest", () => {
    const html = stage({});
    expect(html).toContain('id="berry"');
    expect(html).not.toContain("bloom-combo");
    expect(html).not.toContain("bloom-thought");
    expect(html).not.toContain("data-puff");
    expect(html).not.toContain("data-reduced");
  });

  it("combo 3 adds no sparkles of its own, 5 adds three, 8 adds three and 24 confetti", () => {
    const at3 = stage({ combo: 3, comboKey: 1 });
    expect(count(at3, "bloom-combo-sparkle")).toBe(0);
    expect(count(at3, "bloom-confetti")).toBe(0);
    const at5 = stage({ combo: 5, comboKey: 2 });
    expect(count(at5, "bloom-combo-sparkle")).toBe(3);
    expect(count(at5, "bloom-confetti")).toBe(0);
    const at8 = stage({ combo: 8, comboKey: 3 });
    expect(count(at8, "bloom-combo-sparkle")).toBe(3);
    expect(count(at8, "bloom-confetti")).toBe(24);
  });

  it("draws no combo overlay before the first milestone or for a broken combo", () => {
    expect(stage({ combo: 8, comboKey: 0 })).not.toContain("bloom-combo");
    expect(stage({ combo: null, comboKey: 4 })).not.toContain("bloom-combo");
    expect(stage({ combo: 4, comboKey: 4 })).not.toContain("bloom-combo");
  });

  it("puffs on alternating keyframe names so a second clear restarts it", () => {
    expect(stage({ puffKey: 1 })).toContain('data-puff="a"');
    expect(stage({ puffKey: 2 })).toContain('data-puff="b"');
    expect(stage({ puffKey: 3 })).toContain('data-puff="a"');
  });

  it("draws a floating lone pair, two dots in one group, only while thinking", () => {
    // The owner, 25 Oct: "sure floating lone pair". It replaced the three rising thought dots.
    const html = stage({ thinking: true });
    expect(count(html, "bloom-lone-pair")).toBe(1);
    expect(count(html, "bloom-lone-pair-dot")).toBe(2);
    expect(html).not.toContain("bloom-thought-dot");
    expect(stage({ thinking: false })).not.toContain("bloom-thought");
  });

  it("marks reduced motion with a prop-driven attribute", () => {
    expect(stage({ reducedMotion: true })).toContain('data-reduced="true"');
  });
});

describe("BloomHintRing", () => {
  it("renders once a wrong-again miss has bumped the key, and carries reduced motion", () => {
    expect(renderToStaticMarkup(createElement(BloomHintRing, { ringKey: 0, reducedMotion: false }))).toBe("");
    expect(renderToStaticMarkup(createElement(BloomHintRing, { ringKey: 1, reducedMotion: false }))).toContain("bloom-hint-ring");
    expect(renderToStaticMarkup(createElement(BloomHintRing, { ringKey: 2, reducedMotion: true }))).toContain('data-reduced="true"');
  });
});
