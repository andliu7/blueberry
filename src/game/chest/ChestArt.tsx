/**
 * The drawings the chest moment is made of, ported from the approved
 * mockup (grignard/reports/wave2-mockups.html, option C1), then given real
 * loot on 29 Oct: coins and cut stones built from shapes.
 *
 * Colours are classes in chest.css, not hex in JSX: the chest and its coins are
 * gold in both themes, and the token gate counts raw hex in .tsx.
 */
import "./chest.css";

export type StoneTone = "ruby" | "emerald";

/**
 * A gold coin lying flat in the heap, seen from above at a slant. About 18 wide.
 * Flat fills on purpose: a heap of eight at this size gains nothing from a
 * gradient, and before the burst no CoinShapes is on the page to define one, so
 * a face painted with url(#...) would be no face at all.
 */
function Coin({ x, y, tilt = 0 }: { readonly x: number; readonly y: number; readonly tilt?: number }) {
  return (
    <g transform={`translate(${x} ${y}) rotate(${tilt})`}>
      <path d="M-9 0a9 5.2 0 0 1 18 0v2.6a9 5.2 0 0 1-18 0z" className="cc-edge cc-outline" strokeWidth="0.9" strokeLinejoin="round" />
      <ellipse cx="0" cy="0" rx="9" ry="5.2" className="cc-rim" />
      <ellipse cx="0" cy="0.1" rx="6.5" ry="3.6" className="cc-recess" />
      <ellipse cx="0" cy="0.3" rx="6" ry="3.2" className="cc-face" />
      <path d="M-5 -2.2a6.5 3.4 0 0 1 4-1.6" className="cc-shine" strokeWidth="1.2" strokeLinecap="round" />
    </g>
  );
}

/** The cut-stone facets, shared by the heap and the loose stone. Centred on 0, 0. */
function Facets() {
  return (
    <>
      <path d="M-7 -2.5L-3.6 -7H3.6L7 -2.5L0 8Z" className="jw-1" />
      <path d="M-3.6 -7H3.6L2.6 -2.5H-2.6Z" className="jw-2" />
      <path d="M-7 -2.5H-2.6L0 8Z" className="jw-3" />
      <path d="M7 -2.5H2.6L0 8Z" className="jw-4" />
      <path d="M-7 -2.5L-3.6 -7H3.6L7 -2.5L0 8Z" className="jw-edge" strokeWidth="1.1" strokeLinejoin="round" />
      <path d="M-2.4 -5.6H0.6L-0.6 -3.4H-3.2Z" className="jw-shine" />
    </>
  );
}

function Jewel({ x, y, tone, turn = 0 }: { readonly x: number; readonly y: number; readonly tone: StoneTone; readonly turn?: number }) {
  return (
    <g transform={`translate(${x} ${y}) rotate(${turn})`} className={`jw jw--${tone}`}>
      <Facets />
    </g>
  );
}

/**
 * The gold chest, viewBox 120 by 104. Closed it is a lidded box. Open, the lid
 * swings up and back behind the box and a heap of coins and stones glows in
 * it. `empty` takes the heap and the light away, leaving a plain open box:
 * what stays once the loot has gone.
 */
export function ChestArt({
  open = false,
  empty = false,
  className = "",
}: {
  readonly open?: boolean;
  readonly empty?: boolean;
  readonly className?: string;
}) {
  return (
    <svg viewBox="0 0 120 104" className={`chest-art${open ? " is-open" : ""}${open && empty ? " is-empty" : ""} ${className}`} aria-hidden>
      <ellipse cx="60" cy="98" rx="46" ry="5" className="ca-shadow" />
      {/* Everything inside is drawn only once open: a closed chest has no inside
          to see, and an invisible dark mark on the night card still counts
          against the contrast audit. */}
      {open ? (
        <>
          {/* The lid, swung back: its underside faces us, dark wood, gold bands. */}
          <g className="ca-lid-open">
            <path d="M12 46 L15 12 a20 20 0 0 1 20-18 h50 a20 20 0 0 1 20 18 L108 46 Z" className="ca-band-dark" />
            <path d="M20 42 L23 14 a14 14 0 0 1 14-12 h46 a14 14 0 0 1 14 12 L100 42 Z" className="ca-wood" />
            <rect x="24" y="-6" width="10" height="50" className="ca-band" />
            <rect x="86" y="-6" width="10" height="50" className="ca-band" />
            <path d="M16 12 a18 18 0 0 1 19-16 h50 a18 18 0 0 1 19 16" className="ca-rim" strokeWidth="5" strokeLinecap="round" />
          </g>
          {/* The back wall of the box, the dark inside, then the heap if there is one. */}
          <rect x="12" y="34" width="96" height="16" rx="5" className="ca-deep" />
          {empty ? (
            <ellipse cx="60" cy="43" rx="40" ry="4" className="ca-floor" />
          ) : (
            <g className="ca-hoard">
              <ellipse cx="60" cy="34" rx="62" ry="26" className="ca-light" />
              <ellipse cx="60" cy="42" rx="46" ry="9" className="ca-pile-shade" />
              <Coin x={30} y={40} tilt={-8} />
              <Coin x={90} y={40} tilt={9} />
              <Coin x={44} y={36} tilt={6} />
              <Coin x={76} y={36} tilt={-5} />
              <Coin x={60} y={33} tilt={3} />
              <Coin x={34} y={31} tilt={-14} />
              <Coin x={52} y={27} tilt={-4} />
              <Coin x={69} y={26} tilt={7} />
              <Jewel x={86} y={30} tone="emerald" turn={12} />
              <Jewel x={60} y={19} tone="ruby" turn={-4} />
              <path
                d="M24 23l1.6 3.6 3.6 1.6-3.6 1.6L24 34l-1.6-3.6-3.6-1.6 3.6-1.6zM96 18l1.2 2.8 2.8 1.2-2.8 1.2L96 26l-1.2-2.8-2.8-1.2 2.8-1.2z"
                className="ca-twinkle"
              />
            </g>
          )}
        </>
      ) : null}
      {/* The box: its lip, the face, planks, then the gold bands. */}
      <rect x="10" y="50" width="100" height="44" rx="9" className="ca-lip" />
      <rect x="10" y="44" width="100" height="44" rx="9" className="ca-box" />
      <path d="M12 60h96M12 74h96" className="ca-plank" strokeWidth="3" />
      <rect x="22" y="44" width="11" height="44" className="ca-band" />
      <rect x="87" y="44" width="11" height="44" className="ca-band" />
      <rect x="22" y="80" width="11" height="8" className="ca-band-shade" />
      <rect x="87" y="80" width="11" height="8" className="ca-band-shade" />
      {/* The closed lid. Gone once open (the open lid is drawn behind the box). */}
      <g className="ca-lid">
        <path d="M10 46V32a22 22 0 0 1 22-22h56a22 22 0 0 1 22 22v14z" className="ca-lid-face" />
        <path d="M18 24a16 16 0 0 1 14-8h56" className="ca-lid-hi" strokeWidth="4" strokeLinecap="round" />
        <rect x="22" y="12" width="11" height="34" className="ca-band" />
        <rect x="87" y="12" width="11" height="34" className="ca-band" />
        <rect x="10" y="40" width="100" height="8" rx="3" className="ca-band" />
        <rect x="10" y="45" width="100" height="3" className="ca-band-shade" />
      </g>
      {/* The lock plate. Gone once open. */}
      <g className="ca-plate">
        <rect x="47" y="36" width="26" height="28" rx="6" className="ca-band-shade" />
        <rect x="47" y="33" width="26" height="28" rx="6" className="ca-plate-face" />
        <circle cx="60" cy="44" r="4.2" className="ca-keyhole" />
        <path d="M58 46h4l1.4 8h-6.8z" className="ca-keyhole" />
      </g>
    </svg>
  );
}

/**
 * The coin at hero size, in a 36 by 36 box, lit from the upper left: a thick
 * milled edge under a dark outline, a raised rim, a recessed field with a beaded
 * border, and a faceted star struck proud of it. DiamondMark in app/ui/HudIcons.tsx
 * is the same coin cut for 14 to 56px, with the fine work left off. For placing
 * inside another SVG. The ids repeat across instances and every copy is the same,
 * so whichever one a browser resolves paints identically.
 *
 * Fills that are gradients sit in attributes, not chest.css: a url(#...) in an
 * attribute always means this document.
 */
export function CoinShapes() {
  return (
    <>
      <defs>
        <linearGradient id="cc-edge-grad" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" className="cc-stop-edge-deep" />
          <stop offset="0.28" className="cc-stop-edge-lit" />
          <stop offset="0.62" className="cc-stop-edge" />
          <stop offset="1" className="cc-stop-edge-deep" />
        </linearGradient>
        <linearGradient id="cc-rim-grad" x1="0.15" y1="0" x2="0.85" y2="1">
          <stop offset="0" className="cc-stop-rim-hi" />
          <stop offset="0.5" className="cc-stop-rim" />
          <stop offset="1" className="cc-stop-rim-lo" />
        </linearGradient>
        <linearGradient id="cc-bevel-grad" x1="0.15" y1="0" x2="0.85" y2="1">
          <stop offset="0" className="cc-stop-ring" />
          <stop offset="0.55" className="cc-stop-rim-lo" />
          <stop offset="1" className="cc-stop-shine" />
        </linearGradient>
        <radialGradient id="cc-dome" cx="0.38" cy="0.3" r="0.85">
          <stop offset="0" className="cc-stop-face-hi" />
          <stop offset="0.55" className="cc-stop-face" />
          <stop offset="1" className="cc-stop-face-lo" />
        </radialGradient>
        <clipPath id="cc-field">
          <circle cx="18" cy="16.4" r="10.7" />
        </clipPath>
      </defs>
      {/* The body: the top and bottom faces joined, so the outline is one line. */}
      <path
        d="M3.4 16.4C3.4 11.18 6.18 6.36 10.7 3.76C15.22 1.15 20.78 1.15 25.3 3.76C29.82 6.36 32.6 11.18 32.6 16.4V20.4C32.6 25.62 29.82 30.44 25.3 33.04C20.78 35.65 15.22 35.65 10.7 33.04C6.18 30.44 3.4 25.62 3.4 20.4Z"
        fill="url(#cc-edge-grad)"
        className="cc-outline"
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
      {/* The milling: a lit tick beside each dark one. */}
      <path
        d="M7.16 27.29V29.59M9.5 29.25V31.55M12.19 30.69V32.99M15.12 31.53V33.83M18.17 31.74V34.04M21.19 31.32V33.62M24.06 30.27V32.57M26.65 28.65V30.95M28.84 26.53V28.83"
        className="cc-reed-lit"
        strokeWidth="0.34"
      />
      <path
        d="M7.5 27.29V29.59M9.84 29.25V31.55M12.53 30.69V32.99M15.46 31.53V33.83M18.51 31.74V34.04M21.53 31.32V33.62M24.4 30.27V32.57M26.99 28.65V30.95M29.18 26.53V28.83"
        className="cc-reed"
        strokeWidth="0.46"
      />
      {/* Light bounced back up along the bottom of the edge. */}
      <path d="M6.21 27.77C8.75 31.83 13.21 34.3 18 34.3C22.79 34.3 27.25 31.83 29.79 27.77" className="cc-lip" strokeWidth="0.7" strokeLinecap="round" />
      {/* The crease the face casts on the edge, then the rim. */}
      <circle cx="18" cy="17" r="14.6" className="cc-crease" />
      <circle cx="18" cy="16.4" r="14.6" fill="url(#cc-rim-grad)" />
      <path d="M30.33 21.38C29.01 24.65 26.44 27.26 23.2 28.64C19.95 30.02 16.29 30.05 13.02 28.73" className="cc-low" strokeWidth="1.5" strokeLinecap="round" />
      {/* The recess: its wall is dark where the light is blocked, bright opposite. */}
      <circle cx="18" cy="16.4" r="11.6" fill="url(#cc-bevel-grad)" />
      <circle cx="18" cy="16.4" r="10.7" fill="url(#cc-dome)" />
      <g clipPath="url(#cc-field)">
        <path d="M1 20L20 1L27 0.5L0.5 27Z" className="cc-sheen" />
        <path d="M0.5 28.5L28.5 0.5L29.7 0.5L0.5 29.7Z" className="cc-sheen" />
      </g>
      {/* The beading, a round cap on a dash of nothing. */}
      <circle cx="18" cy="16.4" r="9.5" className="cc-beads" strokeWidth="0.62" strokeLinecap="round" strokeDasharray="0.01 1.49" />
      {/* The star stands proud: a shadow below right, a catch of light above left. */}
      <path transform="translate(0.45 0.55)" d="M18 9.3L19.85 13.85L24.75 14.21L21 17.37L22.17 22.14L18 19.55L13.83 22.14L15 17.37L11.25 14.21L16.15 13.85Z" className="cc-star-shadow" />
      <path transform="translate(-0.32 -0.36)" d="M18 9.3L19.85 13.85L24.75 14.21L21 17.37L22.17 22.14L18 19.55L13.83 22.14L15 17.37L11.25 14.21L16.15 13.85Z" className="cc-star-catch" />
      <path d="M18 16.4L18 9.3L19.85 13.85ZM18 16.4L13.83 22.14L15 17.37ZM18 16.4L15 17.37L11.25 14.21ZM18 16.4L11.25 14.21L16.15 13.85ZM18 16.4L16.15 13.85L18 9.3Z" className="cc-star-lit" />
      <path d="M18 16.4L19.85 13.85L24.75 14.21ZM18 16.4L24.75 14.21L21 17.37ZM18 16.4L21 17.37L22.17 22.14ZM18 16.4L22.17 22.14L18 19.55ZM18 16.4L18 19.55L13.83 22.14Z" className="cc-star-dim" />
      {/* The rim's highlight, broken so it reads as a curve catching light, and the glint. */}
      <path d="M5.36 12.78C6.06 10.33 7.45 8.14 9.37 6.48C11.29 4.81 13.65 3.73 16.17 3.38" className="cc-shine" strokeWidth="1.5" strokeLinecap="round" />
      <path d="M18.46 3.26C19.68 3.3 20.9 3.51 22.06 3.89" className="cc-shine" strokeWidth="1.5" strokeLinecap="round" />
      <path d="M8.4 4.4C8.6 6.4 9.2 7 11.2 7.2C9.2 7.4 8.6 8 8.4 10C8.2 8 7.6 7.4 5.6 7.2C7.6 7 8.2 6.4 8.4 4.4Z" className="cc-spark" />
    </>
  );
}

/** A flying gold coin for the burst. It flips as it flies. */
export function CoinArt({ className = "" }: { readonly className?: string }) {
  return (
    <svg viewBox="0 0 36 36" className={`coin-art ${className}`} aria-hidden>
      <CoinShapes />
    </svg>
  );
}

/** A loose coloured stone for the burst: the heap's cut, in ruby or emerald. */
export function StoneArt({ tone, className = "" }: { readonly tone: StoneTone; readonly className?: string }) {
  return (
    <svg viewBox="-9 -9 18 18" className={`stone-art jw jw--${tone} ${className}`} aria-hidden>
      <Facets />
    </svg>
  );
}
