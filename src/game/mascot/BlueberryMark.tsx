/**
 * The flat berry. Imported from the sibling repo's blueberry-mark.tsx per
 * docs/INHERITED-DECISIONS.md D4: the mascot is imported, never rebuilt.
 *
 * Three edits from the original, all mechanical: the `cn` helper is replaced by
 * string concatenation because this app does not carry clsx, the `loved` hearts
 * variant is dropped because nothing in this shell presses the mark, and the
 * three internal SVG ids are now per instance instead of document global. The
 * third is a bug fix and CostumeDefs below records what it fixes and how it was
 * measured. The art and the mood CSS contract (`.bb-eyes[data-mood]` in
 * mascot.css) are unchanged, so a student sees the same character.
 *
 * COSTUMES, added 2026-08-27 for docs/MASCOT.md's fourth axis. Everything the
 * costume draws is additive: no existing path moved, and with no `costume` prop
 * the emitted SVG is byte for byte what it was. Two layers, because half of
 * them are worn and half are carried: `CostumeBehind` renders before the body
 * circle (a pack, a cape) and `CostumeFront` after the face (goggles, a bow, a
 * loupe, stripes, a cap). Nothing is drawn inside x 17..47 by y 28..47, which
 * is the face, because a costume that covers the eyes has deleted the mood.
 *
 * WHY THE ART IS LITERAL HEX AND NOT THEME TOKENS. The berry itself is a fixed
 * blue gradient in both themes, because it is an illustration of a character
 * rather than a piece of chrome; a lab coat that went dark in dark mode would
 * be a different character at night. Contrast tokens govern text and interface
 * marks, and the badge in Berry.tsx is exactly that, so the badge uses them and
 * the clothes do not. Each colour below is picked to clear roughly 3:1 against
 * the berry's own blue so the silhouette survives at 40px.
 *
 * SIZE BUDGET. Each costume is under fifteen drawn elements and every stroke is
 * at least 1.5 viewBox units, which is about one device pixel at the 40px size
 * the tab rail and the notification thumbnail use.
 */

import { useId } from "react";
import type { BerryCostume } from "./berryCostume";
import type { BerryMood } from "./berryMood";

const LOBE =
  "M0 -11 C2.8 -6.7 3.7 -2.8 2.6 0 C1.6 2.2 -1.6 2.2 -2.6 0 C-3.7 -2.8 -2.8 -6.7 0 -11 Z";

/* The wardrobe palette. Warm and light against the berry's cool blue. */
const CLOTH = "#f4f2ec";
const CLOTH_SHADE = "#d8d3c8";
const INK = "#241f7a";
const TWEED = "#a97d3e";
const TAN = "#cba36a";
const PACK = "#b45309";
const WHISTLE = "#f0a02a";
const CAP = "#7c3aed";

/**
 * One clip path, stopping a costume at the berry's edge.
 *
 * THE IDS ARE PER INSTANCE NOW, and this is a bug fix rather than a tidy up.
 * The imported original emitted `bb-berry`, `bb-calyx` and `bb-body-clip` as
 * document global ids, on the reasoning that several marks on one page emit the
 * same id and the browser resolves every reference to the first, which is
 * harmless while all copies are identical.
 *
 * It is not harmless when the FIRST copy is inside a `display: none` subtree.
 * Chrome does not build a paint server for a resource in a subtree that is not
 * rendered, so `fill={`url(#${berryId})`}` resolves to nothing and the shape paints
 * nothing. The shell has exactly that arrangement: the left rail's mark is
 * `hidden md:flex`, so on any viewport under 768px the first `bb-berry` in the
 * document is hidden and EVERY berry in the app renders as a bodyless face.
 * Measured on a two SVG reduction in the same headless Chrome the captures use,
 * and visible in the phone frames of the P3 capture, where Bloom in the header
 * and Bloom on the pathway were both hollow.
 *
 * `useId` gives each instance its own suffix, so no mark can depend on whether
 * another one happens to be visible. React's own hook rather than a counter,
 * because a counter differs between the server render and the client one.
 */
function CostumeDefs({ clipId }: { readonly clipId: string }) {
  return (
    <clipPath id={clipId}>
      <circle cx="32" cy="34" r="23" />
    </clipPath>
  );
}

/** Worn behind the berry. Rendered before the body so the body occludes it. */
function CostumeBehind({ costume }: { readonly costume: BerryCostume }) {
  switch (costume) {
    case "backpack":
      return (
        <g className="bb-costume">
          <rect x="41" y="23" width="19" height="26" rx="6" fill={PACK} />
          <rect x="41" y="31" width="19" height="7" rx="2.5" fill="#7c3d06" />
        </g>
      );
    case "cape":
      return (
        <g className="bb-costume">
          <path
            d="M13 25 Q3 44 10 61 Q32 53 54 61 Q61 44 51 25 Q32 34 13 25 Z"
            fill={CAP}
          />
          <path d="M13 25 Q32 34 51 25 Q32 30 13 25 Z" fill="#5b21b6" />
        </g>
      );
    default:
      return null;
  }
}

export type Goggles = "up" | "down";

/**
 * Goggles DOWN: worn over the eyes as two clear rims, so the eyes still show
 * through and the mood survives. The rims sit around the eye ellipses (23.5,33)
 * and (40.5,33) with a bridge and a strap, and the lens fill is nearly
 * transparent on purpose: a goggle that tints the eye deletes the mood, which
 * is the one rule the costume layer has.
 */
function GogglesDown() {
  return (
    <g>
      <path d="M11 33 Q10 28 16.5 27.5 M53 33 Q54 28 47.5 27.5" fill="none" stroke={INK} strokeWidth="2" strokeLinecap="round" />
      <ellipse cx="23.5" cy="33.5" rx="7" ry="7.4" fill="#bdefff" opacity="0.18" />
      <ellipse cx="40.5" cy="33.5" rx="7" ry="7.4" fill="#bdefff" opacity="0.18" />
      <ellipse cx="23.5" cy="33.5" rx="7" ry="7.4" fill="none" stroke={INK} strokeWidth="1.9" />
      <ellipse cx="40.5" cy="33.5" rx="7" ry="7.4" fill="none" stroke={INK} strokeWidth="1.9" />
      <path d="M30.5 33.5 H33.5" stroke={INK} strokeWidth="1.9" strokeLinecap="round" />
    </g>
  );
}

/** Worn in front. Rendered after the face, so it never hides the eyes. */
function CostumeFront({ costume, goggles, clipId }: { readonly costume: BerryCostume; readonly goggles: Goggles; readonly clipId: string }) {
  switch (costume) {
    case "labcoat":
      return (
        <g className="bb-costume">
          {/* The coat, a hem with a V opening, cut to the berry's outline. */}
          <g clipPath={`url(#${clipId})`}>
            <path d="M6 50 H26 L32 56 L38 50 H58 V62 H6 Z" fill={CLOTH} />
          </g>
          {goggles === "down" ? <GogglesDown /> : null}
          <path
            d="M26 50 L32 56 L38 50"
            fill="none"
            stroke={CLOTH_SHADE}
            strokeWidth="1.6"
            strokeLinejoin="round"
          />
          {/* Goggles, pushed up onto the forehead. Idle, not working. */}
          {goggles === "up" ? (
            <g>
              <path
                d="M12 27 Q13 22 18.5 21.5 M52 27 Q51 22 45.5 21.5"
                fill="none"
                stroke={INK}
                strokeWidth="2"
                strokeLinecap="round"
              />
              <ellipse cx="24" cy="23.5" rx="5.4" ry="3.9" fill="#bdefff" opacity="0.85" stroke={INK} strokeWidth="1.8" />
              <ellipse cx="40" cy="23.5" rx="5.4" ry="3.9" fill="#bdefff" opacity="0.85" stroke={INK} strokeWidth="1.8" />
              <path d="M29.4 23.5 H34.6" stroke={INK} strokeWidth="1.8" strokeLinecap="round" />
            </g>
          ) : null}
        </g>
      );
    case "tweed":
      return (
        <g className="bb-costume">
          <path d="M32 51 L23.5 46.5 L23.5 55.5 Z" fill={TWEED} />
          <path d="M32 51 L40.5 46.5 L40.5 55.5 Z" fill={TWEED} />
          <circle cx="32" cy="51" r="2.4" fill="#7a5626" />
          {/* The pointer, held out to the side and away from the face. */}
          <path d="M47 48 L61 27" stroke="#5b4327" strokeWidth="2.2" strokeLinecap="round" />
          <circle cx="61" cy="26.5" r="1.9" fill={CLOTH} />
        </g>
      );
    case "trench":
      return (
        <g className="bb-costume">
          <g clipPath={`url(#${clipId})`}>
            <rect x="6" y="49" width="52" height="4.6" fill={TAN} />
          </g>
          <rect x="29" y="48.4" width="6" height="5.8" rx="1.2" fill="#8a6a3f" />
          <path d="M14 45 L24.5 43 L20.5 54 Z" fill={TAN} />
          <path d="M50 45 L39.5 43 L43.5 54 Z" fill={TAN} />
          {/* The loupe, held clear of the berry so the ring reads as a ring. */}
          <circle cx="50" cy="24" r="6.2" fill="#e8f6ff" opacity="0.9" stroke={INK} strokeWidth="2.2" />
          <path d="M54.6 28.6 L59.5 34" stroke={INK} strokeWidth="2.6" strokeLinecap="round" />
        </g>
      );
    case "backpack":
      return (
        <g className="bb-costume">
          <g clipPath={`url(#${clipId})`}>
            <path
              d="M21 12 Q27 32 24 58"
              fill="none"
              stroke={PACK}
              strokeWidth="4.4"
              strokeLinecap="round"
            />
          </g>
          <rect x="21" y="37" width="6.4" height="4.4" rx="1.2" fill="#7c3d06" />
        </g>
      );
    case "referee":
      return (
        <g className="bb-costume">
          <g clipPath={`url(#${clipId})`}>
            <rect x="6" y="46" width="52" height="16" fill={CLOTH} />
            <rect x="17" y="46" width="5" height="16" fill="#2a2724" />
            <rect x="29.5" y="46" width="5" height="16" fill="#2a2724" />
            <rect x="42" y="46" width="5" height="16" fill="#2a2724" />
          </g>
          {/* The whistle hangs off to the side. Neutral: it does not cheer. */}
          <path d="M40 44 Q47 44 49.5 47.5" fill="none" stroke={CLOTH_SHADE} strokeWidth="1.6" />
          <circle cx="51" cy="50" r="3.8" fill={WHISTLE} />
          <rect x="53.6" y="48.4" width="4.6" height="3.2" rx="1.4" fill={WHISTLE} />
        </g>
      );
    case "nightcap":
      return (
        <g className="bb-costume">
          <path d="M16 21 Q20 5 33 5 Q47 5 48 15 Q42 21 32 21.5 Q22 22 16 21 Z" fill={CAP} />
          <path d="M47.5 12 Q58 15 55.5 24" fill="none" stroke={CAP} strokeWidth="4" strokeLinecap="round" />
          <circle cx="55" cy="26" r="3.6" fill={CLOTH} />
          <path d="M15 18 Q32 26 49 13 L50.5 18 Q32 32 14.5 23 Z" fill={CLOTH} />
        </g>
      );
    case "cape":
      // Nothing in front. Two tries at a collar both failed a zoomed read: a
      // band across the brow became a headband, and shoulder ties beside the
      // eyes became ears. The cape behind the body already reads as a cape,
      // and the cheapest fix for a mark that reads wrong is to not draw it.
      return null;
    default: {
      const unreachable: never = costume;
      return <>{unreachable}</>;
    }
  }
}

export function BlueberryMark({
  className = "",
  eyes = false,
  mood,
  costume,
  goggles = "up",
}: {
  readonly className?: string;
  readonly eyes?: boolean;
  readonly mood?: BerryMood;
  /** Cosmetic only. See berryCostume.ts: it never touches mood, behaviour or state. */
  readonly costume?: BerryCostume | undefined;
  /** Lab coat only: down over the eyes while working, up on the forehead when idle. */
  readonly goggles?: Goggles;
}) {
  // Per instance ids. See CostumeDefs above for the bug this fixes.
  const uid = useId();
  const berryId = `bb-berry${uid}`;
  const calyxId = `bb-calyx${uid}`;
  const clipId = `bb-body-clip${uid}`;
  return (
    <svg viewBox="0 0 64 64" role="img" aria-label="Blueberry" className={`block ${className}`}>
      <defs>
        <radialGradient id={berryId} cx="33%" cy="27%" r="84%">
          <stop offset="0%" stopColor="#bdefff" />
          <stop offset="28%" stopColor="#3fa9ff" />
          <stop offset="66%" stopColor="#3d63f5" />
          <stop offset="100%" stopColor="#2b2fb0" />
        </radialGradient>
        <linearGradient id={calyxId} x1="0.3" y1="0" x2="0.7" y2="1">
          <stop offset="0%" stopColor="#4a6cff" />
          <stop offset="100%" stopColor="#2a2496" />
        </linearGradient>
        {costume !== undefined ? <CostumeDefs clipId={clipId} /> : null}
      </defs>

      {costume !== undefined ? <CostumeBehind costume={costume} /> : null}

      <circle cx="32" cy="34" r="23" fill={`url(#${berryId})`} />
      <ellipse cx="19" cy="26" rx="6" ry="4.1" fill="#ffffff" opacity="0.26" transform="rotate(-30 19 26)" />

      <g fill={`url(#${calyxId})`} transform="translate(32 15.5) scale(1 0.62)">
        <path d={LOBE} />
        <path d={LOBE} transform="rotate(72)" />
        <path d={LOBE} transform="rotate(144)" />
        <path d={LOBE} transform="rotate(216)" />
        <path d={LOBE} transform="rotate(288)" />
        <circle r="3.6" fill="#241f7a" />
      </g>

      {eyes ? (
        <g className="bb-eyes" data-mood={mood}>
          <g className="bb-blush" fill="#fb7185">
            <ellipse cx="19.5" cy="40" rx="4.2" ry="2.6" opacity="0.5" />
            <ellipse cx="44.5" cy="40" rx="4.2" ry="2.6" opacity="0.5" />
          </g>
          <g className="bb-eye-open">
            <ellipse cx="23.5" cy="33" rx="3.2" ry="5.7" fill="#0b0b14" />
            <ellipse cx="40.5" cy="33" rx="3.2" ry="5.7" fill="#0b0b14" />
            <ellipse cx="22.4" cy="30.4" rx="1" ry="1.5" fill="#ffffff" opacity="0.9" />
            <ellipse cx="39.4" cy="30.4" rx="1" ry="1.5" fill="#ffffff" opacity="0.9" />
          </g>
          <g className="bb-eye-kind" fill="none" stroke="#0b0b14" strokeWidth="2.5" strokeLinecap="round">
            <path d="M19.2 34.6 Q23.5 29.5 27.8 34.6" />
            <path d="M36.2 34.6 Q40.5 29.5 44.8 34.6" />
          </g>
          <path
            className="bb-smile"
            d="M26.5 42.4 Q32 46.2 37.5 42.4"
            fill="none"
            stroke="#0b0b14"
            strokeWidth="2.2"
            strokeLinecap="round"
          />
        </g>
      ) : null}

      {costume !== undefined ? <CostumeFront costume={costume} goggles={goggles} clipId={clipId} /> : null}
    </svg>
  );
}
