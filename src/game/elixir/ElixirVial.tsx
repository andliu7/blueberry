/**
 * The elixir vial and its bar. One liquid, two shapes, the same fraction.
 *
 * The vial is the storage picture: a glass flask with a neck, tick marks, a
 * rolling surface and bubbles. The bar is the Clash of Clans / Duolingo HUD
 * picture: a pink capsule, glossy top edge, number inside, a drop on the cap.
 * Level moves by a CSS transition on one transform, so the fill is a slide,
 * not a jump. `reducedMotion` stops the surface roll and the bubbles and
 * makes the level change instant.
 */
import { useId, type CSSProperties } from "react";
import { elixirFraction, elixirLabel, elixirTier } from "./elixirModel";
import "./elixir.css";

const VIAL =
  "M30 6H50V28C62 32 68 42 68 56V96C68 106 60 114 50 114H30C20 114 12 106 12 96V56C12 42 18 32 30 28Z";
const TOP = 34;
const BOTTOM = 114;

export interface ElixirProps {
  readonly current: number;
  readonly cap: number;
  readonly reducedMotion: boolean;
  readonly className?: string;
  /** The vial writes the number under itself. Off where a bar already shows it. */
  readonly showCount?: boolean;
  /** A slimmer bar for sheets and the header. */
  readonly compact?: boolean;
}

export function ElixirVial({ current, cap, reducedMotion, className = "", showCount = true }: ElixirProps) {
  const f = elixirFraction(current, cap);
  const clip = `elx-${useId().replace(/[^a-zA-Z0-9]/g, "")}`;
  const lift = (1 - f) * (BOTTOM - TOP);
  return (
    <figure
      className={`elx-vial ${className}`}
      data-tier={elixirTier(f)}
      data-motion={reducedMotion ? "still" : "live"}
      style={{ "--elx-lift": `${lift.toFixed(2)}px` } as CSSProperties}
    >
      <svg viewBox="0 0 80 120" role="img" aria-label={elixirLabel(current, cap)}>
        <defs>
          <clipPath id={clip}>
            <path d={VIAL} />
          </clipPath>
          <linearGradient id="elx-liquid" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#ff8fe0" />
            <stop offset="0.5" stopColor="#f25cc9" />
            <stop offset="1" stopColor="#b3209a" />
          </linearGradient>
        </defs>
        <path d={VIAL} className="elx-glass" />
        <g clipPath={`url(#${clip})`}>
          <g className="elx-level">
            <g transform={`translate(0 ${TOP})`}>
              <g className="elx-roll-back">
                <path className="elx-wave-back" transform="translate(0 -3)" d="M-80 0Q-60 4 -40 0T0 0T40 0T80 0T120 0T160 0V100H-80Z" />
              </g>
              <g className="elx-roll">
                <path className="elx-wave" d="M-80 0Q-60 -4 -40 0T0 0T40 0T80 0T120 0T160 0V100H-80Z" />
              </g>
            </g>
            <circle className="elx-bubble elx-b1" cx="28" cy="108" r="2.4" />
            <circle className="elx-bubble elx-b2" cx="46" cy="110" r="1.8" />
            <circle className="elx-bubble elx-b3" cx="38" cy="106" r="1.4" />
          </g>
        </g>
        {[0.25, 0.5, 0.75].map((t) => (
          <path key={t} className="elx-tick" d={`M60 ${BOTTOM - t * (BOTTOM - TOP)}h5`} />
        ))}
        <path className="elx-shine" d="M19 58C19 48 24 40 31 36" />
        <path className="elx-rim" d={VIAL} />
        <rect className="elx-cork" x="27" y="1" width="26" height="7" rx="3" />
      </svg>
      {showCount ? (
        <figcaption className="elx-count">
          <b>{current}</b>
          <span> / {cap}</span>
        </figcaption>
      ) : null}
    </figure>
  );
}

export function ElixirBar({ current, cap, reducedMotion, className = "", compact = false }: ElixirProps) {
  const f = elixirFraction(current, cap);
  return (
    <div
      className={`elx-bar ${compact ? "elx-bar--compact" : ""} ${className}`}
      data-tier={elixirTier(f)}
      data-motion={reducedMotion ? "still" : "live"}
      role="img"
      aria-label={elixirLabel(current, cap)}
    >
      <span className="elx-bar-track">
        <span className="elx-bar-fill" style={{ "--elx-f": f.toFixed(4) } as CSSProperties} />
        <span className="elx-bar-num">
          {current} / {cap}
        </span>
      </span>
      <span className="elx-bar-cap" aria-hidden>
        <svg viewBox="0 0 24 24">
          <path d="M12 2.5C12 2.5 5.5 10 5.5 14.5a6.5 6.5 0 0 0 13 0C18.5 10 12 2.5 12 2.5Z" />
        </svg>
      </span>
    </div>
  );
}
