/**
 * The milestone itself, drawn as an object around Bloom. One per celebration:
 * a progress ring with a bolt, a crown over gold spotlight rays, a unit badge
 * with its padlock lifting, a sunrise, a level medal, a streak flame, a stack
 * of review cards. Pure SVG, no assets. Bloom is placed by the page.
 */
import { useEffect, useState } from "react";
import type { Celebration } from "./celebrations";

/** Counts from `from` to `to` after `delayMs`. Returns `to` at once when motion is reduced. */
export function useCountUp(from: number, to: number, delayMs: number, reduced: boolean): number {
  const [v, setV] = useState(reduced ? to : from);
  useEffect(() => {
    if (reduced) { setV(to); return; }
    setV(from);
    let raf = 0;
    const t0 = performance.now() + delayMs;
    const dur = 900;
    const tick = (now: number) => {
      const k = Math.min(1, Math.max(0, (now - t0) / dur));
      setV(Math.round(from + (to - from) * (1 - Math.pow(1 - k, 3))));
      if (k < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [from, to, delayMs, reduced]);
  return v;
}

const RAYS = Array.from({ length: 12 }, (_, i) => i);
const FLAME = "M128 20 C150 60 205 90 205 150 C205 200 170 232 128 232 C86 232 51 200 51 150 C51 118 70 100 82 82 C86 104 98 112 108 112 C100 70 112 40 128 20 Z";

function Back({ c }: { readonly c: Celebration }) {
  switch (c.hero) {
    case "ring":
      return (
        <svg viewBox="0 0 256 256" className="ch-svg" aria-hidden>
          <circle cx="128" cy="128" r="112" className="ch-track" />
          <circle cx="128" cy="128" r="112" className="ch-arc" pathLength={100} strokeDasharray="100" style={{ ["--to" as string]: 12 }} />
        </svg>
      );
    case "crown":
      return (
        <svg viewBox="0 0 256 256" className="ch-svg" aria-hidden>
          <g className="ch-rays">
            {RAYS.map((i) => (
              <path key={i} d="M128 128 L116 8 L140 8 Z" transform={`rotate(${i * 30} 128 128)`} />
            ))}
          </g>
          <circle cx="128" cy="128" r="104" className="ch-gold-ring" />
        </svg>
      );
    case "unit":
      return (
        <svg viewBox="0 0 256 256" className="ch-svg" aria-hidden>
          <path className="ch-trail" d="M40 236 C40 190 70 196 70 150 C70 120 86 112 100 104" />
          <circle cx="40" cy="236" r="12" className="ch-node-done" />
          <circle cx="70" cy="170" r="9" className="ch-node-done" />
          <g className="ch-badge">
            <polygon points="150,16 220,56 220,136 150,176 80,136 80,56" className="ch-hex" />
            <polygon points="150,34 205,66 205,126 150,158 95,126 95,66" className="ch-hex-in" />
            <text x="150" y="124" textAnchor="middle" className="ch-badge-num">{c.count.to}</text>
          </g>
          <g className="ch-lock">
            <path d="M136 38 V26 a14 14 0 0 1 28 0 V38" className="ch-shackle" />
            <rect x="128" y="36" width="44" height="30" rx="7" className="ch-lock-body" />
          </g>
        </svg>
      );
    case "sun":
      return (
        <svg viewBox="0 0 256 256" className="ch-svg" aria-hidden>
          <g className="ch-sun">
            <circle cx="128" cy="150" r="78" className="ch-sun-disc" />
            {RAYS.slice(0, 7).map((i) => (
              <rect key={i} x="125" y="38" width="6" height="18" rx="3" className="ch-sun-ray" transform={`rotate(${-90 + i * 30} 128 150)`} />
            ))}
          </g>
          <path d="M0 196 Q128 176 256 196 V256 H0 Z" className="ch-hill" />
        </svg>
      );
    case "medal":
      return (
        <svg viewBox="0 0 256 256" className="ch-svg" aria-hidden>
          <g className="ch-badge">
            <polygon points="128,6 214,52 214,148 128,194 42,148 42,52" className="ch-hex" />
            <polygon points="128,26 196,62 196,138 128,174 60,138 60,62" className="ch-hex-in" />
            <circle cx="128" cy="100" r="46" className="ch-medal-disc" />
          </g>
        </svg>
      );
    case "flame":
      return (
        <svg viewBox="0 0 256 256" className="ch-svg" aria-hidden>
          <path d={FLAME} className="ch-flame" />
          <path d="M128 120 C146 146 168 160 168 188 C168 212 150 226 128 226 C106 226 88 212 88 188 C88 160 110 146 128 120 Z" className="ch-flame-core" />
        </svg>
      );
    case "cards":
      return (
        <svg viewBox="0 0 256 256" className="ch-svg" aria-hidden>
          {[0, 1, 2].map((i) => (
            <g key={i} className="ch-card" style={{ ["--i" as string]: i }}>
              <rect x="64" y="176" width="128" height="62" rx="12" />
              <text x="128" y="218" textAnchor="middle">?</text>
            </g>
          ))}
        </svg>
      );
  }
}

function Crown() {
  return (
    <svg viewBox="0 0 256 256" className="ch-svg ch-front" aria-hidden>
      <g className="ch-crown">
        <path d="M82 70 L96 18 L116 46 L128 8 L140 46 L160 18 L174 70 Z" />
        <rect x="82" y="70" width="92" height="12" rx="6" />
      </g>
    </svg>
  );
}

export function CelebrationHero({
  c,
  reduced,
  children,
}: {
  readonly c: Celebration;
  readonly reduced: boolean;
  readonly children: React.ReactNode;
}) {
  const n = useCountUp(c.count.from, c.count.to, 700, reduced);
  const label = `${c.count.prefix}${n}${c.count.suffix}`;
  const medal = c.hero === "medal";
  return (
    <div className="ch" data-hero={c.hero}>
      <Back c={c} />
      {medal ? <span className="ch-big" aria-hidden>{n}</span> : null}
      <div className="ch-bloom" style={{ ["--bx" as string]: c.bloom.x, ["--by" as string]: c.bloom.y, ["--bs" as string]: c.bloom.size }}>
        {children}
      </div>
      {c.hero === "crown" ? <Crown /> : null}
      {medal ? null : <span className="ch-count" aria-hidden>{label}</span>}
      <span className="ch-sr" role="status">{label}</span>
    </div>
  );
}
