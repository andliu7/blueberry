/**
 * The four drawn marks in the header HUD: the XP ring, the diamond, the streak
 * flame, and the charge bolt. Bloom is the imported mascot, never redrawn
 * (CLAUDE.md, and docs/INHERITED-DECISIONS.md D4), and since the S3 design pass
 * he is no longer one of the header's marks: see ChargeMark below.
 *
 * Every one is inline SVG with token fills. No sprite sheet, no icon font, no
 * emoji: an emoji flame is a different drawing on every platform and a font is
 * bytes the game route pays for on a budget that already counts them.
 *
 * WHY THEY ARE CHUNKY. The bar's header marks are solid shapes with one lighter
 * facet and no outline, read at about 24px on a phone. A hairline stroke icon
 * at that size reads as a settings row rather than as a score, which is the
 * whole difference between a game HUD and an admin panel. So each mark here is
 * a filled silhouette plus exactly one lighter facet for volume, and nothing
 * else. The facet is a white or black wash at low alpha ON the mark, so it
 * never has to clear a contrast floor against the page: the silhouette does
 * that, in a token measured for it.
 *
 * The one place a stroke is right is the ring, because a ring IS a stroke: the
 * arc's length is the number.
 *
 * THE TWO CAPPED MARKS FILL FROM THE BASE, 2026-09-29, owner: "the streaks and
 * the energies just don't really look good. Maybe they can just show as fire
 * and energy." So the header holds fire and energy, one plain metaphor each,
 * and each one is drawn at its LEVEL: the silhouette in --hud-out, the same
 * silhouette in its live token on top, clipped to a window that rises from the
 * base with the fraction. `fillWindow` below is that window, and it is the
 * reason the two marks are one component drawn twice rather than two.
 *
 * WHY A LEVEL AND NOT JUST TWO STATES. hud.css records that an unlit flame at
 * --hud-out reads as disabled rather than as "today is not counted yet", and
 * CLAUDE.md's rule is that colour is never the only carrier of meaning. A
 * silhouette that is 40 percent lit carries the same fact as a SHAPE: nothing
 * disabled is 40 percent of anything. At fill 1 and fill 0 both marks draw
 * exactly what they drew before this change, which is what keeps StreakScreen's
 * hero and the reward moment's unlit flame untouched.
 */

import { useId } from "react";
import type { StreakState } from "./hudModel";

const clamp01 = (n: number): number => (n < 0 ? 0 : n > 1 ? 1 : n);

/**
 * The clip window for a mark drawn at a level: a rect whose top edge is the
 * fill line, in the mark's own 24 unit box.
 *
 * `base` and `tip` are the drawn shape's own extremes rather than the box's, so
 * fill 0 leaves NO sliver lit at the bottom and fill 1 covers the whole
 * silhouette. It is a rect and not a geometry animation on purpose: the level
 * moves when the model changes, on a commit or on the header's own minute tick,
 * and there is nothing about it that a tween would make truer.
 */
function fillWindow(base: number, tip: number, fill: number): number {
  return base - (base - tip) * clamp01(fill);
}

/**
 * The daily goal ring. The full circle is the goal, so the ring carries the
 * goal tier by construction: a Casual student's circle closes at 10 XP and an
 * Exam mode student's at 60, and both read "how much of today is done".
 *
 * The arc is drawn with stroke-dasharray on a circle rotated a quarter turn, so
 * it starts at twelve o'clock. dashoffset is transitioned in hud.css, which is
 * why XP landing mid session animates the arc rather than jumping it.
 */
export function XpRing({ fraction, met, className = "" }: { readonly fraction: number; readonly met: boolean; readonly className?: string }) {
  const radius = 13;
  const circumference = 2 * Math.PI * radius;
  return (
    <svg viewBox="0 0 32 32" className={`-rotate-90 ${className}`} aria-hidden focusable="false">
      <circle cx="16" cy="16" r={radius} fill="none" stroke="var(--hud-track)" strokeWidth="4.5" />
      <circle
        className="hud-ring-arc"
        cx="16"
        cy="16"
        r={radius}
        fill="none"
        stroke={met ? "var(--good)" : "var(--bb-primary)"}
        strokeWidth="4.5"
        strokeLinecap="round"
        strokeDasharray={circumference}
        strokeDashoffset={circumference * (1 - fraction)}
      />
    </svg>
  );
}

/**
 * The diamond. A brilliant cut seen from above: a table facet across the top,
 * the crown falling away to a point. The table is the lighter facet; the right
 * pavilion takes a dark wash so the stone has a lit side and a shaded side.
 */
export function DiamondMark({ className = "" }: { readonly className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden focusable="false">
      <path d="M6.2 2.5h11.6L23 9.1 12 22 1 9.1z" fill="var(--diamond)" />
      <path d="M6.2 2.5h11.6L23 9.1H1z" fill="#ffffff" fillOpacity="0.34" />
      <path d="M12 22 23 9.1h-6.4z" fill="#000000" fillOpacity="0.16" />
      <path d="M9 4.6h6l1.4 4.5H7.6z" fill="#ffffff" fillOpacity="0.22" />
    </svg>
  );
}

/** The flame, written once: the body and the inner tongue, and the body's extremes. */
const FLAME_BODY =
  "M12.6 1.2c-.4 2.9-2 4.3-3.4 5.6C7.2 8.6 4.8 11 4.8 15.2 4.8 19.1 8 22.2 12 22.2s7.2-3.1 7.2-7c0-2.8-1.2-4.7-2.6-6.2-.2 1.5-1 2.6-2.1 3 1-3.6-.6-8.2-1.9-10.8z";
const FLAME_CORE = "M12 10.4c1.9 1.9 3 3.4 3 5.1a3 3 0 0 1-6 0c0-1.6 1.1-3.2 3-5.1z";
const FLAME_BASE = 22.2;
const FLAME_TIP = 1.2;

/**
 * The streak flame. Two shapes: the body, and the inner tongue.
 *
 * BOTH SHAPES SURVIVE WHEN IT IS OUT, and that is a correction of the first
 * draft rather than a preference. Round one drew the unlit flame as the
 * silhouette alone, and in the capture it read as a raindrop: what identifies
 * fire at 22px is the two tone core, not the outline. So an unlit flame keeps
 * its tongue at 0.42 alpha of the same grey, which is a lighter core on a grey
 * body, and hud.css leans the whole thing slowly from the base so it reads as
 * guttering rather than as disabled.
 *
 * The silhouette itself is asymmetric on purpose: the tip leans, and the right
 * shoulder carries the small fold a flame makes as it curls. A symmetric
 * teardrop is a drop of water, whatever colour it is filled with.
 *
 * ECONOMY.md's whole mitigation set argues against rendering an unmet day as a
 * loss, so the unlit flame is still a flame and there is no red anywhere near
 * it.
 *
 * `fill` IS TODAY'S GOAL, and it defaults to the old two-state drawing so the
 * two callers outside the header keep exactly the flame they had. The unlit
 * drawing is painted first and the lit one over it, clipped to the level, so
 * both extremes are byte for byte what shipped before: at 1 the lit body and
 * the amber core cover the whole silhouette, at 0 neither is painted at all.
 *
 * THE DUPLICATE PAIR CARRIES THE SAME TWO CLASS NAMES ON PURPOSE.
 * streak.css:48 animates `.hud-flame-body` and `.hud-flame-core` on the streak
 * screen's 128px hero, and both copies of each are the same shape under the same
 * animation, so they lick in register. The clip window does not move with them,
 * which is right: a flame's tip wobbles and its level does not.
 *
 * `state` IS THE HEADER'S, and only the header passes it. Round five drew the
 * no-run, run-waiting and evening cases as one identical grey flame, so the
 * one counter that matters looked switched off for most of every day and the
 * evening case looked like nothing at all. Each state is now a different
 * SHAPE, so none of them rests on hue alone:
 *
 *  - "zero": the silhouette as an OUTLINE. No run exists; there is nothing in
 *    the flame yet. The bar draws this state grey too.
 *  - "pending" and "atRisk": the solid grey body with its core BURNING, an
 *    ember in the core token cut out of the body by a card coloured ring. The
 *    run is alive and today's part of it is the level rising behind it. The
 *    ring is what keeps the ember a shape in dark, where the amber and the
 *    grey body sit close in lightness.
 *  - "atRisk" adds a clock notched into the lower right: the day has a
 *    deadline now. A clock and not a warning sign, and no red, because
 *    docs/ECONOMY.md forbids drawing an unmet day as a loss.
 *  - "live": exactly the lit flame, drawn at fill 1 by the caller.
 */
export function FlameMark({
  lit,
  fill = lit ? 1 : 0,
  state,
  className = "",
}: {
  readonly lit: boolean;
  /** 0 to 1, how much of the flame is alight. Today's goal fraction in the HUD. */
  readonly fill?: number;
  /** The header's streak state. Left out, the mark is the plain two state flame. */
  readonly state?: StreakState;
  readonly className?: string;
}) {
  const clip = `hud-flame-${useId().replace(/[^a-zA-Z0-9]/g, "")}`;
  const hollow = state === "zero";
  const ember = state === "pending" || state === "atRisk";
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden focusable="false">
      <clipPath id={clip}>
        <rect x="0" y={fillWindow(FLAME_BASE, FLAME_TIP, fill)} width="24" height="24" />
      </clipPath>
      {hollow ? (
        <path d={FLAME_BODY} fill="none" stroke="var(--hud-out)" strokeWidth="2" strokeLinejoin="round" />
      ) : (
        <path className="hud-flame-body" d={FLAME_BODY} fill="var(--hud-out)" />
      )}
      {/* Lighter than the body in BOTH states, because that is what a hot core
          is. A first pass drew the unlit core in --hud-out at 0.42, which is
          the body's own colour over the body: opaque grey on opaque grey, so
          the flame lost its structure and the capture showed a raindrop. A
          white wash lightens either theme's mid grey. */}
      {hollow ? null : ember ? (
        <path className="hud-flame-core" d={FLAME_CORE} fill="var(--streak-core)" stroke="var(--bb-card)" strokeWidth="1.25" />
      ) : (
        <path className="hud-flame-core" d={FLAME_CORE} fill="#ffffff" fillOpacity="0.42" />
      )}
      <g clipPath={`url(#${clip})`}>
        <path className="hud-flame-body" d={FLAME_BODY} fill="var(--streak)" />
        <path className="hud-flame-core" d={FLAME_CORE} fill="var(--streak-core)" />
      </g>
      {state === "atRisk" ? (
        <g data-flame-clock>
          <circle cx="18" cy="18" r="5.25" fill="var(--streak-ink)" stroke="var(--bb-card)" strokeWidth="1.5" />
          <path d="M18 15.4V18l1.9 1.2" fill="none" stroke="var(--bb-card)" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
        </g>
      ) : null}
    </svg>
  );
}

/**
 * The charge cell, and it is here because Bloom used to be.
 *
 * WHAT IT REPLACED AND WHY. The charge chip drew Bloom at 26px with his halo
 * set to the charge fraction. That was a nice idea and it cost more than it
 * paid, on two counts a measurement caught and a judge had already said in
 * words. The sticker audit's rule 10 counts mascot instances on one screen and
 * was reporting two on ten routes, three on seven and four on the charge ones,
 * unchanged across four rounds; P3's own round two judge wrote "the same
 * blueberry face appears four times on one screen, so the number that matters
 * fights five other glyphs". And inside the chip itself the fraction was drawn
 * TWICE, once as the halo's thickness at 26px where it is barely legible and
 * once as the meter under the word, where it is legible.
 *
 * So the chip keeps the meter, which is the reading, and takes a mark, which is
 * the identity. Bloom keeps the coach mark at 76px, where the halo really does
 * read as a meter gaining and losing weight, and keeps every full screen moment
 * he already owned. He appears once per screen now instead of two to four
 * times, which is what makes him a character rather than clip art.
 *
 * Drawn the same way as the diamond and the flame: a filled silhouette in the
 * family's own token, one lighter facet for volume, and the bolt cut out in the
 * card's colour so the shape is one component in both themes.
 */
/**
 * The cell's outline and its own extremes, for the same reason the flame keeps
 * its two.
 *
 * A BATTERY 14 UNITS WIDE, round six. It was a 19 by 21 rounded square, and
 * solid dark green at that footprint it was the heaviest object in the header,
 * heavier than the flame beside it (14 wide) that the row exists for. Every
 * mark in the row now spans the full 24 unit height and about the flame's
 * width or the diamond's facets' width, so no identity outweighs another by
 * area alone. The nub on top is what makes it read as energy, the owner's own
 * word for this mark.
 */
const CELL = "M9.5 3.5h5A4.5 4.5 0 0 1 19 8v10a4.5 4.5 0 0 1-4.5 4.5h-5A4.5 4.5 0 0 1 5 18V8a4.5 4.5 0 0 1 4.5-4.5zM9.8 1.5h4.4a.8.8 0 0 1 .8.8v1.2H9V2.3a.8.8 0 0 1 .8-.8z";
const CELL_BASE = 22.5;
const CELL_TIP = 1.5;

export function ChargeMark({
  fill = 1,
  className = "",
}: {
  /**
   * 0 to 1, how full the cell is. Charge over cap in the HUD.
   *
   * DEFAULTS TO 1 so every existing call site draws exactly what it drew
   * before this change. The chip's own meter under the word is still the
   * precise reading; this is the same fact in the mark, which is what lets the
   * row be read at a glance without moving to the number.
   */
  readonly fill?: number;
  readonly className?: string;
}) {
  const clip = `hud-cell-${useId().replace(/[^a-zA-Z0-9]/g, "")}`;
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden focusable="false">
      <clipPath id={clip}>
        <rect x="0" y={fillWindow(CELL_BASE, CELL_TIP, fill)} width="24" height="24" />
      </clipPath>
      <path d={CELL} fill="var(--hud-out)" />
      <g clipPath={`url(#${clip})`}>
        <path d={CELL} fill="var(--good)" />
      </g>
      {/* The facet and the bolt sit ABOVE the clip, not inside it. The bolt is
          a cut rather than a drawn mark: it is painted in the card's colour so
          the shape reads as one object in both themes, and a bolt that filled
          with the cell would stop being a hole and start being a stripe. */}
      <path d="M9.5 3.5h5A4.5 4.5 0 0 1 19 8v2.5H5V8a4.5 4.5 0 0 1 4.5-4.5z" fill="#ffffff" fillOpacity="0.24" />
      <path d="M13.3 6.2 8.2 14h2.9l-.6 5.6 5.3-7.9h-3z" fill="var(--bb-card)" />
    </svg>
  );
}
