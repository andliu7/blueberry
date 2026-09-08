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

/**
 * The cut gem of the reward currency, matched to the counter the committed
 * reaction frame draws. Filled, and the facet lines are drawn in the page
 * ground rather than in a second colour so the shape stays one object.
 */
export function GemMark() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden focusable="false" role="presentation">
      <path d="M6.6 3.5h10.8l4 5.2L12 21 1.6 8.7Z" fill="currentColor" stroke="none" />
      <path
        d="M1.6 8.7h20.8M12 21 8.4 8.7 10.6 3.5M12 21l3.6-12.3-2.2-5.2"
        fill="none"
        stroke="var(--bb-card)"
        strokeWidth={1.2}
        strokeLinejoin="round"
        opacity={0.55}
      />
    </svg>
  );
}

/**
 * The cleared tick, the one mark the FILL-ONLY rule licenses on the goal
 * green: a white check on a green fill, never a green line.
 */
export function TickMark() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden focusable="false" role="presentation">
      <path d="M5.5 12.6 10 17.1 18.6 7.4" {...STROKE} strokeWidth={3} />
    </svg>
  );
}
