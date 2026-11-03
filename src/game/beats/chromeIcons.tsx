/**
 * The lesson chrome's icons, traced rather than typed.
 *
 * WHY THIS FILE EXISTS. DESIGN-GOALS, "ICONS ARE SVG, NEVER RASTER, NEVER
 * EMOJI": "Every in-product icon is a traced SVG that inherits currentColor
 * (emoji vary per platform and are banned from product chrome; PNGs cannot
 * theme or scale)". The lesson chrome was breaking that with glyph-set
 * characters: the exit rendered the literal U+2715 MULTIPLICATION X and the
 * report control the literal U+2691 BLACK FLAG. Both vary in weight, width
 * and vertical centring from one platform's font to the next, which is the
 * exact failure the rule names, and the committed frames draw each of them
 * as a drawn mark.
 *
 * Every icon below is a stroked path on a 24 unit grid with no fill and no
 * colour of its own, so it takes the ink of whatever chrome it sits in and
 * scales with it. The gem is the one filled shape, because
 * blueberry_r9-lesson-reaction draws its currency counter as a solid cut
 * gem rather than as an outline.
 */

const STROKE = {
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 2.4,
  strokeLinecap: "round",
  strokeLinejoin: "round",
} as const;

import { DiamondMark } from "../app/ui/HudIcons";

/** The exit, drawn as the committed mechanism frame draws it: inside its chip. */
export function ExitMark() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden focusable="false" role="presentation">
      <path d="M6.5 6.5 17.5 17.5M17.5 6.5 6.5 17.5" {...STROKE} />
    </svg>
  );
}

/** The report control's flag on its pole. */
export function FlagMark() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden focusable="false" role="presentation">
      <path d="M6 21V3.8" {...STROKE} strokeWidth={2} />
      <path d="M6 4.6h11.4l-2.6 4 2.6 4H6" {...STROKE} strokeWidth={2} />
    </svg>
  );
}

/** The coin of the reward currency: the header's own mark, so there is one coin. */
export function GemMark() {
  return <DiamondMark />;
}
