/**
 * The drawings the chest moment is made of, ported from the approved
 * mockup (grignard/reports/wave2-mockups.html, option C1), then given real
 * loot on 29 Oct: coins and cut stones built from shapes.
 *
 * Colours are classes in chest.css, not hex in JSX: the chest is gold and the
 * diamond is sky in both themes, and the token gate counts raw hex in .tsx.
 */
import "./chest.css";

export type StoneTone = "ruby" | "emerald" | "sapphire";

/** A gold coin lying flat in the heap, seen from above at a slant. About 18 wide. */
function Coin({ x, y, tilt = 0 }: { readonly x: number; readonly y: number; readonly tilt?: number }) {
  return (
    <g transform={`translate(${x} ${y}) rotate(${tilt})`}>
      <ellipse cx="0" cy="2.2" rx="9" ry="5.2" className="cc-edge" />
      <ellipse cx="0" cy="0" rx="9" ry="5.2" className="cc-face" />
      <ellipse cx="0" cy="0" rx="5.6" ry="3.1" className="cc-ring" strokeWidth="1.1" />
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
              <Jewel x={34} y={31} tone="sapphire" turn={-14} />
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

/** A flying gold coin for the burst, viewBox 36 by 36, face on: thick edge, bright rim, domed face, star. It flips as it flies. */
export function CoinArt({ className = "" }: { readonly className?: string }) {
  return (
    <svg viewBox="0 0 36 36" className={`coin-art ${className}`} aria-hidden>
      <defs>
        <radialGradient id="cc-dome" cx="0.35" cy="0.3" r="0.85">
          <stop offset="0" className="cc-stop-a" />
          <stop offset="0.55" className="cc-stop-b" />
          <stop offset="1" className="cc-stop-c" />
        </radialGradient>
      </defs>
      <circle cx="18" cy="21.5" r="15" className="cc-edge" />
      <circle cx="18" cy="18" r="15" className="cc-rim" />
      <circle cx="18" cy="18" r="12.4" className="cc-face" />
      <circle cx="18" cy="18" r="9.6" className="cc-ring" strokeWidth="1.6" />
      <path d="M18 11.5l2.2 4.5 4.9.7-3.6 3.4.9 4.9-4.4-2.4-4.4 2.4.9-4.9-3.6-3.4 4.9-.7z" className="cc-star" />
      <path d="M28 24a12 12 0 0 1-9.5 6" className="cc-under" strokeWidth="2.2" strokeLinecap="round" />
      <path d="M6.5 15a12 12 0 0 1 7.5-8" className="cc-shine" strokeWidth="2.6" strokeLinecap="round" />
      <circle cx="9" cy="10.5" r="1.4" className="cc-spark" />
    </svg>
  );
}

/** A loose coloured stone for the burst: the heap's cut, in one of three colours. */
export function StoneArt({ tone, className = "" }: { readonly tone: StoneTone; readonly className?: string }) {
  return (
    <svg viewBox="-9 -9 18 18" className={`stone-art jw jw--${tone} ${className}`} aria-hidden>
      <Facets />
    </svg>
  );
}

/** The faceted reward diamond: a brilliant cut seen side on, nine facets in five blues. viewBox 48 by 44. */
export function GemArt({ className = "" }: { readonly className?: string }) {
  return (
    <svg viewBox="0 0 48 44" className={`gem-art ${className}`} aria-hidden>
      <path d="M10 3h28l9 12L24 42 1 15z" className="ga-1" />
      <path d="M16 3h16l4 12H12z" className="ga-2" />
      <path d="M10 3h6l-4 12H1z" className="ga-3" />
      <path d="M32 3h6l9 12H36z" className="ga-4" />
      <path d="M1 15h11l12 27z" className="ga-5" />
      <path d="M12 15h12l0 27z" className="ga-3" />
      <path d="M24 15h12L24 42z" className="ga-4" />
      <path d="M36 15h11L24 42z" className="ga-6" />
      <path d="M17 5h7l-2 8h-8z" className="ga-shine" />
      <path d="M13 18l4 0 6 18z" className="ga-glint" />
      <path d="M10 3h28l9 12L24 42 1 15z" className="ga-edge" strokeWidth="1.6" strokeLinejoin="round" />
      <path d="M1 15h46M12 15l12 27 12-27M16 3l-4 12M32 3l4 12" className="ga-seam" strokeWidth="1" />
    </svg>
  );
}
