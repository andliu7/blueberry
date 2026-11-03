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
import { clamp01 } from "@/lib/helpers";

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
 * The coin, the currency's mark everywhere: the same minted disc as CoinShapes in
 * chest/ChestArt.tsx, cut for 14 to 64px. Lit from the upper left and painted in
 * continuous gradients, so its light does the work a heavy outline used to: a
 * milled edge that wraps round into the thickness, a rim rolling from pale gold
 * into deep amber, a recess whose wall catches light opposite the rim, a struck
 * star, and one soft diagonal sweep across all of it. The outline is a thin dark
 * line that only holds the shape on a pale page.
 *
 * Smaller than its box on purpose: the live flame has to stay the heaviest mark
 * in the header (hudAnatomy.test.ts measures ink and grayscale mass in both
 * themes, and rasterises this drawing, which is why it is circles, cubics and
 * linear gradients and nothing else).
 *
 * The ids come from useId so a copy never paints from another copy that sits in a
 * hidden subtree. The name stays: it is an identifier, and the data underneath
 * is `diamonds`.
 */
export const COIN_BODY =
  "M3.9 10.7C3.9 6.23 7.53 2.6 12 2.6C16.47 2.6 20.1 6.23 20.1 10.7V13.3C20.1 17.77 16.47 21.4 12 21.4C7.53 21.4 3.9 17.77 3.9 13.3Z";

/** The milling on the thick edge: a dark tick, and a lit one just left of it. */
export const COIN_REEDS =
  "M19.67 13.01V15.06M19.32 14.08V16.13M18.84 15.10V17.15M18.23 16.04V18.09M17.49 16.88V18.93M16.64 17.60V19.65M15.71 18.20V20.25M14.70 18.66V20.71M13.64 18.97V21.02M12.55 19.13V21.18M11.45 19.13V21.18M10.36 18.97V21.02M9.30 18.66V20.71M8.29 18.20V20.25M7.36 17.60V19.65M6.51 16.88V18.93M5.77 16.04V18.09M5.16 15.10V17.15M4.68 14.08V16.13M4.33 13.01V15.06";
const COIN_REEDS_LIT =
  "M19.47 13.01V15.06M19.12 14.08V16.13M18.64 15.10V17.15M18.03 16.04V18.09M17.29 16.88V18.93M16.44 17.60V19.65M15.51 18.20V20.25M14.50 18.66V20.71M13.44 18.97V21.02M12.35 19.13V21.18M11.25 19.13V21.18M10.16 18.97V21.02M9.10 18.66V20.71M8.09 18.20V20.25M7.16 17.60V19.65M6.31 16.88V18.93M5.57 16.04V18.09M4.96 15.10V17.15M4.48 14.08V16.13M4.13 13.01V15.06";

const COIN_STAR = "M12 6.4L13.12 9.15L16.09 9.37L13.82 11.29L14.53 14.18L12 12.61L9.47 14.18L10.18 11.29L7.91 9.37L10.88 9.15Z";

/** The thick edge turning under the light, left to right. The pile and the shelf paint with it too. */
export function CoinEdgeStops() {
  return (
    <>
      <stop offset="0" stopColor="var(--coin-umber)" />
      <stop offset="0.13" stopColor="var(--coin-edge)" />
      <stop offset="0.3" stopColor="var(--coin-edge-lit)" />
      <stop offset="0.58" stopColor="var(--coin-edge)" />
      <stop offset="0.84" stopColor="var(--coin-edge-deep)" />
      <stop offset="1" stopColor="var(--coin-umber)" />
    </>
  );
}

/**
 * The balance's own coin, for the counter only: the same silhouette as the mark
 * below with the same blank face the chest's coins wear, and the metal painted to
 * read as a heavy struck object at 24 to 70px. All of it is lit from above and a
 * little left, the same light hud.css gives the rail, so coin and bar are one scene:
 *
 *  - the thick edge turns under the light, falls into a soft crease below the face,
 *    picks up warm bounce near its base, and darkens toward the underside;
 *  - the rim is a raised bevel, bright on its top shoulder and in shadow underneath;
 *  - the recess wall runs the other way, shaded under the lit rim and lit opposite;
 *  - the field is one continuous gradient, bright yellow to deep amber;
 *  - the shine is a soft sweep that follows the curve, plus one specular bloom.
 *
 * The sweep is a ring-shaped radial faded out across the coin, so it needs no filter.
 * The outline is thin at the top and heavier under the coin, not one even weight.
 */
function HeavyCoin({ className, id }: { readonly className: string; readonly id: string }) {
  const paint = (name: string) => `url(#${id}${name})`;
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden focusable="false">
      <defs>
        <clipPath id={`${id}body`}>
          <path d={COIN_BODY} />
        </clipPath>
        <linearGradient id={`${id}line`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="var(--coin-umber)" />
          <stop offset="0.6" stopColor="var(--coin-line)" />
        </linearGradient>
        <linearGradient id={`${id}edge`} x1="0" y1="0" x2="1" y2="0">
          <CoinEdgeStops />
        </linearGradient>
        <linearGradient id={`${id}under`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0.82" stopColor="var(--coin-umber)" stopOpacity="0" />
          <stop offset="1" stopColor="var(--coin-umber)" stopOpacity="0.7" />
        </linearGradient>
        <radialGradient id={`${id}bounce`}>
          <stop offset="0" stopColor="var(--coin-edge-lit)" />
          <stop offset="1" stopColor="var(--coin-edge)" stopOpacity="0" />
        </radialGradient>
        <radialGradient id={`${id}crease`}>
          <stop offset="0.88" stopColor="var(--coin-umber)" stopOpacity="0.8" />
          <stop offset="1" stopColor="var(--coin-umber)" stopOpacity="0" />
        </radialGradient>
        <linearGradient id={`${id}rim`} x1="0.32" y1="0" x2="0.68" y2="1">
          <stop offset="0" stopColor="var(--coin-rim-hi)" />
          <stop offset="0.3" stopColor="var(--coin-rim)" />
          <stop offset="0.66" stopColor="var(--coin-rim-lo)" />
          <stop offset="1" stopColor="var(--coin-amber)" />
        </linearGradient>
        <linearGradient id={`${id}roll`} x1="0.32" y1="0" x2="0.68" y2="1">
          <stop offset="0" stopColor="var(--coin-shine)" />
          <stop offset="0.36" stopColor="var(--coin-shine)" stopOpacity="0" />
          <stop offset="0.62" stopColor="var(--coin-umber)" stopOpacity="0" />
          <stop offset="1" stopColor="var(--coin-umber)" stopOpacity="0.62" />
        </linearGradient>
        <linearGradient id={`${id}wall`} x1="0.32" y1="0" x2="0.68" y2="1">
          <stop offset="0" stopColor="var(--coin-ring)" />
          <stop offset="0.55" stopColor="var(--coin-rim-lo)" />
          <stop offset="1" stopColor="var(--coin-rim-hi)" />
        </linearGradient>
        <radialGradient id={`${id}field`} cx="0.36" cy="0.26" r="0.92">
          <stop offset="0" stopColor="var(--cc-fill-hi)" />
          <stop offset="0.42" stopColor="var(--cc-fill)" />
          <stop offset="0.8" stopColor="var(--cc-fill-lo)" />
          <stop offset="1" stopColor="var(--coin-amber)" />
        </radialGradient>
        <radialGradient id={`${id}sweep`}>
          <stop offset="0.58" stopColor="var(--coin-shine)" stopOpacity="0" />
          <stop offset="0.84" stopColor="var(--coin-shine)" stopOpacity="0.72" />
          <stop offset="1" stopColor="var(--coin-shine)" stopOpacity="0" />
        </radialGradient>
        <linearGradient id={`${id}sweepFade`} x1="0.12" y1="0.06" x2="0.72" y2="0.8">
          <stop offset="0.12" stopColor="#ffffff" />
          <stop offset="0.72" stopColor="#000000" />
        </linearGradient>
        <mask id={`${id}sweepMask`} maskUnits="userSpaceOnUse" x="6" y="4.8" width="12" height="12">
          <rect x="6" y="4.8" width="12" height="12" fill={paint("sweepFade")} />
        </mask>
        <radialGradient id={`${id}bloom`}>
          <stop offset="0" stopColor="var(--coin-shine)" stopOpacity="0.95" />
          <stop offset="1" stopColor="var(--coin-shine)" stopOpacity="0" />
        </radialGradient>
      </defs>
      {/* The outline: a heavier copy sitting low, then a thin one, so the weight varies. */}
      <path transform="translate(0 0.2)" d={COIN_BODY} fill="var(--coin-line)" stroke="var(--coin-line)" strokeWidth="0.42" strokeLinejoin="round" />
      <path d={COIN_BODY} fill={paint("edge")} stroke={paint("line")} strokeWidth="0.36" strokeLinejoin="round" />
      <g clipPath={`url(#${id}body)`}>
        <circle cx="12" cy="11.2" r="8.7" fill={paint("crease")} />
        <ellipse cx="10.6" cy="20.25" rx="6.6" ry="1.05" fill={paint("bounce")} />
        <path d={COIN_BODY} fill={paint("under")} />
      </g>
      <circle cx="12" cy="10.7" r="7.95" fill={paint("rim")} />
      <circle cx="12" cy="10.7" r="7.56" fill="none" stroke={paint("roll")} strokeWidth="0.78" />
      <circle cx="12" cy="10.7" r="6.25" fill={paint("wall")} />
      <circle cx="12" cy="10.7" r="5.72" fill={paint("field")} />
      <circle cx="12" cy="10.7" r="5.72" fill={paint("sweep")} mask={`url(#${id}sweepMask)`} />
      <ellipse cx="9.5" cy="7.9" rx="2.7" ry="1.7" transform="rotate(-36 9.5 7.9)" fill={paint("bloom")} />
    </svg>
  );
}

export function DiamondMark({ className = "", heavy = false }: { readonly className?: string; readonly heavy?: boolean }) {
  const id = useId().replace(/[^a-zA-Z0-9]/g, "");
  if (heavy) return <HeavyCoin className={className} id={id} />;
  const paint = (name: string) => `url(#${id}${name})`;
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden focusable="false">
      <defs>
        <linearGradient id={`${id}edge`} x1="0" y1="0" x2="1" y2="0">
          <CoinEdgeStops />
        </linearGradient>
        <linearGradient id={`${id}rim`} x1="0.14" y1="0.06" x2="0.86" y2="0.94">
          <stop offset="0" stopColor="var(--coin-rim-hi)" />
          <stop offset="0.26" stopColor="var(--coin-rim)" />
          <stop offset="0.58" stopColor="var(--coin-rim-lo)" />
          <stop offset="1" stopColor="var(--coin-amber)" />
        </linearGradient>
        {/* The rim's round shoulder: pale on the lit side, nothing across the middle, amber on the far side. */}
        <linearGradient id={`${id}roll`} x1="0.14" y1="0.06" x2="0.86" y2="0.94">
          <stop offset="0" stopColor="var(--coin-shine)" stopOpacity="0.95" />
          <stop offset="0.42" stopColor="var(--coin-shine)" stopOpacity="0" />
          <stop offset="0.6" stopColor="var(--coin-umber)" stopOpacity="0" />
          <stop offset="1" stopColor="var(--coin-umber)" stopOpacity="0.72" />
        </linearGradient>
        {/* The recess wall runs the other way: in shadow under the lit rim, lit opposite. */}
        <linearGradient id={`${id}wall`} x1="0.14" y1="0.06" x2="0.86" y2="0.94">
          <stop offset="0" stopColor="var(--coin-umber)" />
          <stop offset="0.45" stopColor="var(--coin-ring)" />
          <stop offset="0.72" stopColor="var(--coin-rim-lo)" />
          <stop offset="1" stopColor="var(--coin-shine)" />
        </linearGradient>
        <linearGradient id={`${id}field`} x1="0.14" y1="0.06" x2="0.86" y2="0.94">
          <stop offset="0" stopColor="var(--coin-face-hi)" />
          <stop offset="0.38" stopColor="var(--coin-face)" />
          <stop offset="0.72" stopColor="var(--coin-rim-lo)" />
          <stop offset="1" stopColor="var(--coin-amber)" />
        </linearGradient>
        <linearGradient id={`${id}starLit`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="var(--coin-face-lit)" />
          <stop offset="1" stopColor="var(--coin-star-lit)" />
        </linearGradient>
        <linearGradient id={`${id}starDim`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="var(--coin-star-lit)" />
          <stop offset="1" stopColor="var(--coin-star)" />
        </linearGradient>
        {/* One soft band across the whole face, with a faint echo behind it. */}
        <linearGradient id={`${id}sweep`} x1="0.14" y1="0.06" x2="0.86" y2="0.94">
          <stop offset="0.17" stopColor="var(--coin-shine)" stopOpacity="0" />
          <stop offset="0.33" stopColor="var(--coin-shine)" stopOpacity="0.55" />
          <stop offset="0.45" stopColor="var(--coin-shine)" stopOpacity="0" />
          <stop offset="0.5" stopColor="var(--coin-shine)" stopOpacity="0" />
          <stop offset="0.54" stopColor="var(--coin-shine)" stopOpacity="0.28" />
          <stop offset="0.58" stopColor="var(--coin-shine)" stopOpacity="0" />
        </linearGradient>
      </defs>
      {/* The edge: the top and bottom faces joined, so the thin line is one line. */}
      <path d={COIN_BODY} fill={paint("edge")} stroke="var(--coin-line)" strokeWidth="0.55" strokeLinejoin="round" />
      <path d={COIN_REEDS} fill="none" stroke="var(--coin-umber)" strokeOpacity="0.6" strokeWidth="0.2" />
      <path d={COIN_REEDS_LIT} fill="none" stroke="var(--coin-edge-lit)" strokeOpacity="0.55" strokeWidth="0.16" />
      {/* The crease the face casts on the edge, soft because the rim above it rolls. */}
      <circle cx="12" cy="11.08" r="7.94" fill="var(--coin-umber)" fillOpacity="0.5" />
      <circle cx="12" cy="10.7" r="7.94" fill={paint("rim")} />
      <circle cx="12" cy="10.7" r="7.4" fill="none" stroke={paint("roll")} strokeWidth="1" />
      {/* The recess, then the field sunk into it. */}
      <circle cx="12" cy="10.7" r="6.35" fill={paint("wall")} />
      <circle cx="12" cy="10.7" r="5.75" fill={paint("field")} />
      {/* The star stands proud: a shadow below right, a catch of light above left, two lit facets. */}
      <path transform="translate(0.28 0.32)" d={COIN_STAR} fill="var(--coin-umber)" fillOpacity="0.42" />
      <path transform="translate(-0.2 -0.22)" d={COIN_STAR} fill="var(--coin-shine)" fillOpacity="0.55" />
      <path
        d="M12 10.7L12 6.4L13.12 9.15ZM12 10.7L9.47 14.18L10.18 11.29ZM12 10.7L10.18 11.29L7.91 9.37ZM12 10.7L7.91 9.37L10.88 9.15ZM12 10.7L10.88 9.15L12 6.4Z"
        fill={paint("starLit")}
      />
      <path
        d="M12 10.7L13.12 9.15L16.09 9.37ZM12 10.7L16.09 9.37L13.82 11.29ZM12 10.7L13.82 11.29L14.53 14.18ZM12 10.7L14.53 14.18L12 12.61ZM12 10.7L12 12.61L9.47 14.18Z"
        fill={paint("starDim")}
      />
      <circle cx="12" cy="10.7" r="7.94" fill={paint("sweep")} />
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
 * `state` IS THE HEADER'S, and only the header passes it. When it is set the
 * mark is drawn from HEADER_BODY, below, rather than the narrow body above,
 * and each streak state is its own SHAPE:
 *
 *  - "zero": a solid grey flame with a pale core. No run exists.
 *  - "pending": the same grey flame with its core lit orange: a run that is
 *    alive and waiting on today. The orange body rises from the base with
 *    today's goal fraction.
 *  - "atRisk": pending plus a clock badge, static, so it survives reduced
 *    motion; the lean in hud.css is a second cue, not the only one.
 *  - "live": the whole body orange, the heaviest flame in grayscale as well
 *    as in colour.
 *
 * All four are filled, never outlined (2026-10-15 icon redesign): the row
 * beside it is a filled diamond and a filled battery, and an outline flame
 * read as a second icon style.
 *
 * No red and no warning sign anywhere: docs/ECONOMY.md forbids drawing an
 * unmet day as a loss. A clock states a deadline, nothing more.
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
  if (state !== undefined) return <HeaderFlame state={state} fill={fill} clip={clip} className={className} />;
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden focusable="false">
      <clipPath id={clip}>
        <rect x="0" y={fillWindow(FLAME_BASE, FLAME_TIP, fill)} width="24" height="24" />
      </clipPath>
      <path className="hud-flame-body" d={FLAME_BODY} fill="var(--hud-out)" />
      {/* Lighter than the body in BOTH states, because that is what a hot core
          is. A first pass drew the unlit core in --hud-out at 0.42, which is
          the body's own colour over the body: opaque grey on opaque grey, so
          the flame lost its structure and the capture showed a raindrop. A
          white wash lightens either theme's mid grey. */}
      <path className="hud-flame-core" d={FLAME_CORE} fill="#ffffff" fillOpacity="0.42" />
      <g clipPath={`url(#${clip})`}>
        <path className="hud-flame-body" d={FLAME_BODY} fill="var(--streak)" />
        <path className="hud-flame-core" d={FLAME_CORE} fill="var(--streak-core)" />
      </g>
    </svg>
  );
}

/**
 * The header's flame: wide enough to carry the row.
 *
 * WHY A SECOND BODY. The narrow body above inks 32 percent of its 24 unit box
 * when solid, against the old diamond's 44 and the battery's 45, so at one box
 * size the streak was the lightest mark in the row it exists to lead. This one
 * inks 47 percent (hudAnatomy.test.ts measures it). It is written with cubics
 * only, which is what lets that test rasterise it. The streak screen and the
 * reward moment keep the narrow flame until the queued visual rebuild decides
 * what the one flame should be.
 */
const HEADER_BODY =
  "M13 1C14.6 4.2 17.6 6.4 19.6 9.6C21 11.8 21.6 13.6 21.6 15.4C21.6 19.8 17.4 23 12 23C6.6 23 2.4 19.8 2.4 15.2C2.4 12.2 3.8 9.8 5.8 8C6.2 9.8 7.2 11 8.6 11.4C8 7.4 10 3.6 13 1Z";
const HEADER_CORE = "M12 11.6C14.3 13.8 15.7 15.6 15.7 17.6C15.7 19.7 14 21.2 12 21.2C10 21.2 8.3 19.7 8.3 17.6C8.3 15.6 9.7 13.8 12 11.6Z";

function HeaderFlame({ state, fill, clip, className }: { readonly state: StreakState; readonly fill: number; readonly clip: string; readonly className: string }) {
  const alive = state !== "zero";
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden focusable="false">
      <clipPath id={clip}>
        <rect x="0" y={fillWindow(23, 1, state === "live" ? 1 : fill)} width="24" height="24" />
      </clipPath>
      {/* FILLED IN EVERY STATE, 2026-10-15. The zero, pending and at risk
          flames were outlines, and both blind judges read an outline flame
          beside the filled diamond and battery as a second icon style. Now
          the body is always solid: pale grey when unlit (--hud-out at half
          strength, so a live run stays the heaviest flame in grayscale, which
          hudAnatomy.test.ts measures), with the lit part rising from the base
          as today's goal fills. A live run is all orange. */}
      <path d={HEADER_BODY} fill="var(--hud-out)" fillOpacity="0.5" />
      {alive ? (
        <path className="hud-flame-core" d={HEADER_CORE} fill="var(--streak)" />
      ) : (
        <path className="hud-flame-core" d={HEADER_CORE} fill="#ffffff" fillOpacity="0.42" />
      )}
      <g clipPath={`url(#${clip})`}>
        <path className="hud-flame-body" d={HEADER_BODY} fill="var(--streak)" />
        <path className="hud-flame-core" d={HEADER_CORE} fill="var(--streak-core)" />
      </g>
      {state === "atRisk" ? (
        <g data-flame-clock>
          <circle cx="17.6" cy="17.6" r="5.9" fill="var(--streak-ink)" stroke="var(--bb-card)" strokeWidth="1.3" />
          <path d="M17.6 14.6V17.6L19.8 19" fill="none" stroke="var(--bb-card)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
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
const CELL =
  "M9.5 3.5H14.5C16.985 3.5 19 5.515 19 8V18C19 20.485 16.985 22.5 14.5 22.5H9.5C7.015 22.5 5 20.485 5 18V8C5 5.515 7.015 3.5 9.5 3.5ZM9.8 1.5H14.2C14.642 1.5 15 1.858 15 2.3V3.5H9V2.3C9 1.858 9.358 1.5 9.8 1.5Z";
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
        {/* --hud-charge-mark is hud.css's: a lighter green than --good in
            light, so a full battery stops being the darkest object in the
            row. --good is the fallback anywhere outside the header. */}
        <path d={CELL} fill="var(--hud-charge-mark, var(--good))" />
      </g>
      {/* The facet and the bolt sit ABOVE the clip, not inside it. The bolt is
          a cut rather than a drawn mark: it is painted in the card's colour so
          the shape reads as one object in both themes, and a bolt that filled
          with the cell would stop being a hole and start being a stripe. */}
      <path d="M9.5 3.5H14.5C16.985 3.5 19 5.515 19 8V10.5H5V8C5 5.515 7.015 3.5 9.5 3.5Z" fill="#ffffff" fillOpacity="0.24" />
      <path d="M13.3 6.2 8.2 14h2.9l-.6 5.6 5.3-7.9h-3z" fill="var(--bb-card)" />
    </svg>
  );
}
