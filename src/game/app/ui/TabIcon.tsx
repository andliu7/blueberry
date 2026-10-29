/**
 * Every navigation icon in /app: the five bar tabs and the six off-bar
 * surfaces. Inline SVG rather than an icon package, so the shell's entry chunk
 * carries a handful of shapes and not a font.
 *
 * ONE SET, ONE CONSTRUCTION (owner, 2026-10-15: redesign every icon, the old
 * ones were "I kinda just went with them"). Each icon is a small flat
 * illustration built from rounded shapes, the way the reference app draws its
 * tab bar: a house, a shield, a chest, each in full colour, never a grey line
 * glyph. Three rules make the eleven icons read as one family:
 *
 *   1. ONE HUE PER ICON, A1 round 5. Each icon is a face colour and its own
 *      darker lip from the --ic-* palette in theme.css, plus white detail, and
 *      nothing else: no second object in a second colour, no skin tone, no
 *      yellow photo on a blue page. Round 4's set mixed sticker, badge and
 *      emoji styles in five schemes; this is one construction in five hues.
 *      Nothing is a 2px keyline.
 *   2. Depth is a LIP, the same move as the app's buttons: a darker copy of a
 *      shape peeks out under it (the `*-lip` tokens). That is also what keeps
 *      a bright yellow shape visible on a white bar, since the lip clears 3:1
 *      where the face alone would not.
 *   3. Detail is white. Stars, text lines, bubbles and glints are white shapes
 *      sitting on a colour, never thin dark strokes, so nothing closes up into
 *      a smudge at 20px.
 *
 * Icons keep their colour whether or not their tab is the selected one; the
 * selected state is the tile the bar draws around it (tabs.css). That is the
 * reference's own rule and it means the bar at rest is a row of coloured
 * objects rather than grey ones with one lit.
 *
 * No drop shadow and no gradient anywhere: depth is the lip.
 */

import type { ReactElement } from "react";
import type { TabId } from "../routes";

/* Palette shorthands, so the drawings below read as colour names. */
const PURPLE = "var(--ic-purple)";
const PURPLE_LIP = "var(--ic-purple-lip)";
const BLUE = "var(--ic-blue)";
const BLUE_LIP = "var(--ic-blue-lip)";
const GREEN = "var(--ic-green)";
const GREEN_LIP = "var(--ic-green-lip)";
const YELLOW = "var(--ic-yellow)";
const YELLOW_LIP = "var(--ic-yellow-lip)";
const RED = "var(--ic-red)";
const RED_LIP = "var(--ic-red-lip)";
const ORANGE = "var(--ic-orange)";
const ORANGE_LIP = "var(--ic-orange-lip)";
const WHITE = "#ffffff";

/**
 * A rounded tile with a lip under it: a face, and the same box 1.4 units lower
 * in the darker colour. The back card of the periodic icon.
 */
function Tile({ x, y, size, face, lip }: { readonly x: number; readonly y: number; readonly size: number; readonly face: string; readonly lip: string }) {
  return (
    <>
      <rect x={x} y={y + 1.4} width={size} height={size} rx={1.8} fill={lip} />
      <rect x={x} y={y} width={size} height={size} rx={1.8} fill={face} />
    </>
  );
}

/**
 * One element card, the periodic table's own unit: a rounded tile on its lip
 * with a white H on it. A grid of small cells read as an app launcher or a bar
 * chart at 28px (critic, round 1, and our own round 2 capture); a single
 * element card with its symbol is what every chemistry student recognises.
 * The H is drawn from three bars, not set in a font, so it is the same shape
 * on every platform.
 */
function ElementCard({ x, y, size, face, lip }: { readonly x: number; readonly y: number; readonly size: number; readonly face: string; readonly lip: string }) {
  const u = size / 16;
  return (
    <>
      <rect x={x} y={y + 1.6 * u} width={size} height={size} rx={4 * u} fill={lip} />
      <rect x={x} y={y} width={size} height={size} rx={4 * u} fill={face} />
      <rect x={x + 4.2 * u} y={y + 3.6 * u} width={2.4 * u} height={8.8 * u} rx={1.2 * u} fill={WHITE} />
      <rect x={x + 9.4 * u} y={y + 3.6 * u} width={2.4 * u} height={8.8 * u} rx={1.2 * u} fill={WHITE} />
      <rect x={x + 4.2 * u} y={y + 6.8 * u} width={7.6 * u} height={2.4 * u} rx={1.2 * u} fill={WHITE} />
    </>
  );
}

/** A magnifier in one hue: a blue ring with a white lens, a darker handle and a glint. */
function Lens({ cx, cy, r }: { readonly cx: number; readonly cy: number; readonly r: number }) {
  const reach = r * 0.72;
  return (
    <>
      <path d={`M${cx + reach} ${cy + reach}L${cx + r * 1.7} ${cy + r * 1.7}`} stroke={BLUE_LIP} strokeWidth={r * 0.7} strokeLinecap="round" />
      <circle cx={cx} cy={cy} r={r} fill={WHITE} stroke={BLUE} strokeWidth={r * 0.42} />
      <path d={`M${cx - r * 0.42} ${cy - r * 0.05}a${r * 0.42} ${r * 0.42} 0 0 1 ${r * 0.42}-${r * 0.42}`} stroke={BLUE} strokeWidth={r * 0.24} strokeLinecap="round" fill="none" />
    </>
  );
}

/**
 * The drawings, one per tab id. Each returns the inside of a 24 unit box and
 * paints back to front, so a later shape covers an earlier one.
 */
const DRAWINGS: Record<TabId, () => ReactElement> = {
  /* PATH: one lesson node from the path itself, a purple disc on its lip with
     a white star. The tab opens a column of exactly these, so the icon is a
     small picture of the screen behind it. */
  pathway: () => (
    <>
      <ellipse cx="12" cy="13.6" rx="10" ry="8.6" fill={PURPLE_LIP} />
      <ellipse cx="12" cy="10.6" rx="10" ry="8.6" fill={PURPLE} />
      <path
        d="M12 5.7L13.29 8.82L16.66 9.09L14.09 11.28L14.88 14.56L12 12.8L9.12 14.56L9.91 11.28L7.34 9.09L10.71 8.82Z"
        fill={WHITE}
        stroke={WHITE}
        strokeWidth="1.1"
        strokeLinejoin="round"
      />
    </>
  ),

  /* TRAIN: one green flask with a white dumbbell printed on it. The owner's
     flask and dumbbell (2026-09-03) kept as ONE object, so the icon is no
     longer two things leaning on each other in two colours. */
  trainer: () => (
    <>
      <path d="M8.6 3.6h6.8v5.8l5.2 9a2.8 2.8 0 0 1-2.4 4.2H5.8a2.8 2.8 0 0 1-2.4-4.2l5.2-9z" fill={GREEN_LIP} />
      <path d="M8.6 2.2h6.8v5.8l5.2 9a2.8 2.8 0 0 1-2.4 4.2H5.8a2.8 2.8 0 0 1-2.4-4.2l5.2-9z" fill={GREEN} />
      <rect x="7.2" y="1" width="9.6" height="2.8" rx="1.4" fill={GREEN_LIP} />
      <rect x="8.4" y="15" width="7.2" height="1.6" rx="0.8" fill={WHITE} />
      <rect x="6.8" y="12.8" width="2.4" height="6" rx="1.2" fill={WHITE} />
      <rect x="14.8" y="12.8" width="2.4" height="6" rx="1.2" fill={WHITE} />
      <circle cx="13" cy="8.6" r="1" fill={WHITE} />
    </>
  ),

  /* CARDS: a red flashcard with a white question mark, the card behind it
     in the same red's lip. One hue, so it no longer competes with Feed. */
  cards: () => (
    <>
      <rect x="7.2" y="1.6" width="13" height="17" rx="2.6" fill={RED_LIP} transform="rotate(12 13.7 10.1)" />
      <rect x="3.6" y="4.8" width="13" height="17" rx="2.6" fill={RED_LIP} />
      <rect x="3.6" y="3.4" width="13" height="17" rx="2.6" fill={RED} />
      <path d="M8 9.4a2.4 2.4 0 1 1 3.6 2.1c-.9.5-1.2 1-1.2 1.9v.4" stroke={WHITE} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none" />
      <circle cx="10.4" cy="16.6" r="1.2" fill={WHITE} />
    </>
  ),

  /* FEED: the blue newspaper (docs/DESIGN-GOALS.md: "Feed is the blue
     NEWSPAPER"). A folded back page in the lip colour, the front sheet in
     blue, and every mark of print in white: headline, photo block, lines. */
  feed: () => (
    <>
      <path d="M16 6.4h4.2a1.8 1.8 0 0 1 1.8 1.8v10.4a3 3 0 0 1-3 3H16z" fill={BLUE_LIP} />
      <rect x="2" y="3.8" width="16.4" height="18.8" rx="2.6" fill={BLUE_LIP} />
      <rect x="2" y="2.6" width="16.4" height="18.8" rx="2.6" fill={BLUE} />
      <rect x="4.6" y="5.4" width="11.2" height="2.4" rx="1.2" fill={WHITE} />
      <rect x="4.6" y="10" width="4.8" height="5.4" rx="1.2" fill={WHITE} />
      <rect x="11" y="10.2" width="4.8" height="1.8" rx="0.9" fill={WHITE} />
      <rect x="11" y="13.6" width="4.8" height="1.8" rx="0.9" fill={WHITE} />
      <rect x="4.6" y="17.2" width="11.2" height="1.8" rx="0.9" fill={WHITE} />
    </>
  ),

  /* ME: the student, not the mascot, as one orange figure: a head and
     shoulders on their lip, with a white face. Bloom is never redrawn as an
     icon (docs/MASCOT.md). */
  me: () => (
    <>
      <path d="M3 23.4a9 7.6 0 0 1 18 0z" fill={ORANGE_LIP} />
      <path d="M3 22.2a9 7.6 0 0 1 18 0z" fill={ORANGE} />
      <circle cx="12" cy="9.8" r="6.6" fill={ORANGE_LIP} />
      <circle cx="12" cy="8.6" r="6.6" fill={ORANGE} />
      <circle cx="9.6" cy="8.4" r="1.1" fill={WHITE} />
      <circle cx="14.4" cy="8.4" r="1.1" fill={WHITE} />
      <path d="M9.8 11.2a2.8 2.8 0 0 0 4.4 0" stroke={WHITE} strokeWidth="1.5" strokeLinecap="round" fill="none" />
    </>
  ),

  /* PERIODIC: an element card (a purple tile with a white H) in front of a
     second card in the purple's lip, so it reads as a table of them. */
  periodic: () => (
    <>
      <Tile x={8.4} y={1.4} size={14.2} face={PURPLE_LIP} lip={PURPLE_LIP} />
      <ElementCard x={1.4} y={6.2} size={15.6} face={PURPLE} lip={PURPLE_LIP} />
    </>
  ),

  /* FOCUS: a stopwatch. A green face on its darker lip, a crown on top, one white hand. */
  focus: () => (
    <>
      <rect x="9.6" y="1.4" width="4.8" height="2.6" rx="1.2" fill={GREEN_LIP} />
      <circle cx="12" cy="14" r="8.6" fill={GREEN_LIP} />
      <circle cx="12" cy="12.8" r="8.6" fill={GREEN} />
      <path d="M12 7.6V13l3.4 2.2" stroke={WHITE} strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" fill="none" />
    </>
  ),

  /* SPECTRA: a spectrum card, a blue tile on its lip with a white peak trace. */
  spectra: () => (
    <>
      <rect x="1.4" y="3.4" width="21.2" height="18" rx="4.4" fill={BLUE_LIP} />
      <rect x="1.4" y="1.8" width="21.2" height="18" rx="4.4" fill={BLUE} />
      <path d="M4.6 16.4h3.2l1.4-6.2 1.6 8.6 1.8-12 1.6 9.6h5.2" stroke={WHITE} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" fill="none" />
    </>
  ),

  /* SEARCH: the magnifier on its own. */
  search: () => <Lens cx={10} cy={10} r={6.4} />,

  /* COURSES: an open book, yellow pages on the yellow's darker cover. */
  courses: () => (
    <>
      <path d="M1.6 5.6h8.2a2.2 2.2 0 0 1 2.2 2.2 2.2 2.2 0 0 1 2.2-2.2h8.2v15.2H14a2 2 0 0 0-2 1.6 2 2 0 0 0-2-1.6H1.6z" fill={YELLOW_LIP} />
      <path d="M3.4 3.4H9a3 3 0 0 1 3 3v12.6a3 3 0 0 0-3-1.8H3.4z" fill={YELLOW} />
      <path d="M20.6 3.4H15a3 3 0 0 0-3 3v12.6a3 3 0 0 1 3-1.8h5.6z" fill={YELLOW} />
      <rect x="5.2" y="7.2" width="4.4" height="1.6" rx="0.8" fill={WHITE} />
      <rect x="14.4" y="7.2" width="4.4" height="1.6" rx="0.8" fill={WHITE} />
    </>
  ),

  /* LEADERBOARDS: a three step podium in orange, the top step starred. */
  leaderboards: () => (
    <>
      <rect x="1.6" y="11.8" width="6.6" height="10.6" rx="1.6" fill={ORANGE_LIP} />
      <rect x="1.6" y="10.6" width="6.6" height="10.6" rx="1.6" fill={ORANGE} />
      <rect x="8.7" y="5.6" width="6.6" height="16.8" rx="1.6" fill={ORANGE_LIP} />
      <rect x="8.7" y="4.4" width="6.6" height="16.8" rx="1.6" fill={ORANGE} />
      <rect x="15.8" y="14.8" width="6.6" height="7.6" rx="1.6" fill={ORANGE_LIP} />
      <rect x="15.8" y="13.6" width="6.6" height="7.6" rx="1.6" fill={ORANGE} />
      <path d="M12 7.2l.9 1.9 2 .2-1.5 1.4.5 2-1.9-1.1-1.9 1.1.5-2-1.5-1.4 2-.2z" fill={WHITE} />
    </>
  ),

  /* CHAT: a green speech bubble with three white dots. */
  chat: () => (
    <>
      <path d="M5.4 4.4h13.2a3.4 3.4 0 0 1 3.4 3.4v8.2a3.4 3.4 0 0 1-3.4 3.4H10l-5.2 3.4V19.4A3.4 3.4 0 0 1 2 16V7.8a3.4 3.4 0 0 1 3.4-3.4z" fill={GREEN_LIP} />
      <path d="M5.4 3h13.2a3.4 3.4 0 0 1 3.4 3.4v8.2a3.4 3.4 0 0 1-3.4 3.4H10l-5.2 3.8V18A3.4 3.4 0 0 1 2 14.6V6.4A3.4 3.4 0 0 1 5.4 3z" fill={GREEN} />
      <circle cx="7.6" cy="10.6" r="1.5" fill={WHITE} />
      <circle cx="12" cy="10.6" r="1.5" fill={WHITE} />
      <circle cx="16.4" cy="10.6" r="1.5" fill={WHITE} />
    </>
  ),

  /* MESSAGES: a blue envelope with a white flap. */
  messages: () => (
    <>
      <rect x="1.6" y="5.6" width="20.8" height="15.2" rx="2.8" fill={BLUE_LIP} />
      <rect x="1.6" y="4.4" width="20.8" height="15.2" rx="2.8" fill={BLUE} />
      <path d="M4.4 7.6l7.6 5.6 7.6-5.6" stroke={WHITE} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none" />
    </>
  ),
};

export function TabIcon({ tab, className = "" }: { readonly tab: TabId; readonly className?: string }) {
  const Drawing = DRAWINGS[tab];
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden focusable="false">
      <Drawing />
    </svg>
  );
}

/**
 * The header's one tools control stands for two tools, so its mark is both:
 * an element card with the search lens over its corner.
 *
 * REDRAWN, round 2. Four equal tiles in a square read as a generic app
 * launcher grid (critic). See ElementCard.
 */
export function ToolsIcon({ className = "" }: { readonly className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden focusable="false">
      <ElementCard x={1.2} y={1.2} size={16.4} face={PURPLE} lip={PURPLE_LIP} />
      <Lens cx={16.6} cy={16.4} r={4} />
    </svg>
  );
}
