/**
 * The blank on a reaction card's term side (owner, 21 Oct): a bare "?" in a
 * dashed box was confusing. The pin is that the blank says what is asked
 * ("What forms?") and that a drawn reaction arrow, head included, leads to it.
 */

import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { REACTIONS } from "../../data/reactions";
import { reactionCardFromStaged } from "../cards/reactionCard";
import { TermSide } from "../tabs/cards/CardSides";
import { SchemeCard } from "../lesson/SchemeCard";
import { Figure, ReagentsHiddenContext } from "../../components/review/DeckStudy";

const MORNING = new Date(2026, 8, 29, 9, 0, 0, 0);

describe("reaction card blank", () => {
  const card = reactionCardFromStaged(REACTIONS[0]!, MORNING);

  for (const size of ["big", "small"] as const) {
    it(`asks "What forms?" under a drawn arrow (${size})`, () => {
      const html = renderToStaticMarkup(createElement(TermSide, { card, size }));
      expect(html).toContain('<div class="ct-slot">What forms?</div>');
      expect(html).not.toMatch(/class="ct-slot"[^>]*>\s*\?\s*</);
      // The arrow's head is drawn (the two strokes after the shaft), and the
      // arrow sits between the start material and the slot.
      // A shaft alone is one move ("M"); a head adds at least one more stroke,
      // so the arrow path must start more than one subpath, whatever its coordinates.
      const arrowPath = /class="ct-arrow__line"[\s\S]*?<path[^>]* d="([^"]+)"/.exec(html)?.[1] ?? "";
      expect(arrowPath.match(/M/g)?.length ?? 0).toBeGreaterThanOrEqual(2);
      expect(html.indexOf("ct-mol")).toBeLessThan(html.indexOf("ct-arrow"));
      expect(html.indexOf("ct-arrow")).toBeLessThan(html.indexOf("ct-slot"));
    });
  }
});

/*
 * The same blank everywhere a reaction asks (owner, 21 Oct): the lesson scheme
 * card, the draw beat (which reuses ProductBlank) and the site's review deck
 * say what is asked in a dashed box, never a bare "?". The empty figures below
 * draw nothing: these pins are about the blank, not about any molecule.
 */
describe("reaction blanks outside the Cards tab", () => {
  it('the scheme card asks "What forms?" when the product is the blank', () => {
    const html = renderToStaticMarkup(createElement(SchemeCard, { scheme: { left: {}, over: "PCC" } }));
    expect(html).toContain('<span class="scheme__unknown">What forms?</span>');
    expect(html).not.toMatch(/>\s*\?\s*</);
    expect(html).toContain("scheme__shaft");
  });

  it('the scheme card asks "Which reagent?" over the arrow when the reagent is the blank', () => {
    const html = renderToStaticMarkup(createElement(SchemeCard, { scheme: { left: {}, right: {} } }));
    expect(html).toContain('<span class="scheme__unknown scheme__unknown--reagent">Which reagent?</span>');
    expect(html).not.toMatch(/>\s*\?\s*</);
    // The reagent blank sits above the shaft, where a reagent is written.
    expect(html.indexOf("Which reagent?")).toBeLessThan(html.indexOf("scheme__shaft"));
    expect(html).not.toContain("What forms?");
  });

  it('the review deck masks a hidden reagent with "Which reagent?"', () => {
    const html = renderToStaticMarkup(
      createElement(ReagentsHiddenContext.Provider, { value: true }, createElement(Figure, { src: "carbonyl_acetal-on.svg" })),
    );
    expect(html).toContain('<span class="rv-reagent-blank">Which reagent?</span>');
    expect(html).not.toMatch(/>\s*\?\s*</);
  });
});
