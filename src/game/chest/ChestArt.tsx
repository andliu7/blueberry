/**
 * The two drawings the chest moment is made of, ported from the approved
 * mockup (grignard/reports/wave2-mockups.html, option C1).
 *
 * Colours are classes in chest.css, not hex in JSX: the chest is gold and the
 * diamond is sky in both themes, and the token gate counts raw hex in .tsx.
 */
import "./chest.css";

/**
 * The gold chest, viewBox 120 by 104. The lid and the inside are their own
 * groups so CSS can blow the lid off and grow the glowing inside when the
 * chest opens (chest.css, "the chest").
 */
export function ChestArt({ open = false, className = "" }: { readonly open?: boolean; readonly className?: string }) {
  return (
    <svg viewBox="0 0 120 104" className={`chest-art${open ? " is-open" : ""} ${className}`} aria-hidden>
      <ellipse cx="60" cy="98" rx="46" ry="5" className="ca-shadow" />
      {/* Inside the box: dark wood and a pool of light. Drawn only once open:
          a closed chest has no inside to see, and an invisible dark mark on
          the night card still counts against the contrast audit. */}
      {open ? (
        <g className="ca-inner">
          <path d="M10 46 L16 4 H104 L110 46 Z" className="ca-band-dark" />
          <path d="M18 42 L22 10 H98 L102 42 Z" className="ca-wood" />
          <path d="M16 4 H104" className="ca-rim" strokeWidth="6" strokeLinecap="round" />
          <rect x="14" y="38" width="92" height="14" rx="4" className="ca-deep" />
          <ellipse cx="60" cy="42" rx="40" ry="8" className="ca-light" />
        </g>
      ) : null}
      {/* The box: its lip, the face, planks, then the gold bands. */}
      <rect x="10" y="50" width="100" height="44" rx="9" className="ca-lip" />
      <rect x="10" y="44" width="100" height="44" rx="9" className="ca-box" />
      <path d="M12 60h96M12 74h96" className="ca-plank" strokeWidth="3" />
      <rect x="22" y="44" width="11" height="44" className="ca-band" />
      <rect x="87" y="44" width="11" height="44" className="ca-band" />
      <rect x="22" y="80" width="11" height="8" className="ca-band-shade" />
      <rect x="87" y="80" width="11" height="8" className="ca-band-shade" />
      {/* The lid. */}
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
