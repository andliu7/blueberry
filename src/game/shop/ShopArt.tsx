/**
 * Shop illustrations, drawn in SVG so they stay light: a faceted ice crystal
 * for the streak freeze and a fanned stack of cards for a deck. Flat shapes,
 * a soft highlight, no photo. Colours come from theme tokens (--diamond for
 * ice) and a small fixed palette per deck so each deck has its own face.
 */

import { useId } from "react";

export const DECK_HUES = [
  { a: "#7C5CFF", b: "#4A2FC4", c: "#CFC2FF" },
  { a: "#FF9F43", b: "#E06A12", c: "#FFD9AE" },
  { a: "#2EC4A6", b: "#12907A", c: "#B5F0E3" },
  { a: "#FF6B9A", b: "#D93B72", c: "#FFC6DA" },
] as const;

export function IceCrystal({ className = "", glow = true }: { readonly className?: string; readonly glow?: boolean }) {
  const id = useId();
  return (
    <svg viewBox="0 0 120 120" className={className} aria-hidden focusable="false">
      <defs>
        <linearGradient id={`${id}a`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#E9FAFF" />
          <stop offset="1" stopColor="#5CCBF5" />
        </linearGradient>
        <linearGradient id={`${id}b`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#8FE0FF" />
          <stop offset="1" stopColor="#1C9BD8" />
        </linearGradient>
      </defs>
      {glow ? <circle cx="60" cy="62" r="50" fill="#5CCBF5" opacity="0.18" /> : null}
      <path d="M60 8 86 34 78 78 60 108 42 78 34 34Z" fill={`url(#${id}b)`} />
      <path d="M60 8 86 34 60 46 34 34Z" fill={`url(#${id}a)`} />
      <path d="M34 34 60 46 42 78Z" fill="#B7EDFF" opacity="0.85" />
      <path d="M86 34 60 46 78 78Z" fill="#2AA9E6" />
      <path d="M42 78 60 46 78 78 60 108Z" fill="#43BDF0" opacity="0.9" />
      <path d="M44 28 58 20" stroke="#fff" strokeWidth="5" strokeLinecap="round" opacity="0.9" />
      <path d="M100 22v14M93 29h14M16 70v10M11 75h10" stroke="#fff" strokeWidth="3.4" strokeLinecap="round" />
      <path d="M100 22v14M93 29h14M16 70v10M11 75h10" stroke="#5CCBF5" strokeWidth="1.4" strokeLinecap="round" />
    </svg>
  );
}

export function DeckStack({ className = "", hue = 0 }: { readonly className?: string; readonly hue?: number }) {
  const k = ((hue % DECK_HUES.length) + DECK_HUES.length) % DECK_HUES.length;
  const h = DECK_HUES[k];
  return (
    <svg viewBox="0 0 120 120" className={className} aria-hidden focusable="false">
      <rect x="20" y="14" width="62" height="86" rx="13" fill={h.c} transform="rotate(-15 51 57)" />
      <rect x="28" y="12" width="62" height="88" rx="13" fill={h.b} transform="rotate(-6 59 56)" />
      <rect x="36" y="12" width="64" height="92" rx="13" fill="#fff" />
      <rect x="36" y="12" width="64" height="26" rx="13" fill={h.a} />
      <rect x="36" y="26" width="64" height="12" fill={h.a} />
      <path d="M46 25h30" stroke="#fff" strokeOpacity="0.6" strokeWidth="4" strokeLinecap="round" />
      <g transform="translate(68 70)" fill="none" stroke={h.b} strokeWidth="5" strokeLinecap="round" strokeLinejoin="round">
        {k === 0 ? (
          <>
            <path d="M-6-22h12M-4-22v14L-18 14a5 5 0 0 0 4 8h28a5 5 0 0 0 4-8L4-8v-14" />
            <path d="M-12 8h24" stroke={h.a} />
          </>
        ) : k === 1 ? (
          <>
            <path d="M0-22 19-11v22L0 22-19 11v-22Z" />
            <circle cx="0" cy="0" r="6" fill={h.a} stroke="none" />
          </>
        ) : k === 2 ? (
          <>
            <path d="M-20 14C-20-12 8-18 18-6" />
            <path d="M6-8 19-5 16 8" stroke={h.a} />
          </>
        ) : (
          <>
            <path d="M-14 12 0-12 14 12Z" />
            <circle cx="-14" cy="12" r="7" fill={h.a} stroke="none" />
            <circle cx="0" cy="-12" r="7" fill={h.b} stroke="none" />
            <circle cx="14" cy="12" r="7" fill={h.a} stroke="none" />
          </>
        )}
      </g>
    </svg>
  );
}

export function Confetti() {
  const cols = ["#FFC83D", "#FF6B9A", "#2EC4A6", "#7C5CFF", "#5CCBF5", "#FF9F43"];
  const bits = Array.from({ length: 22 }, (_, i) => ({
    left: `${(i * 37) % 100}%`,
    delay: `${(i % 7) * 70}ms`,
    dx: `${((i * 53) % 90) - 45}px`,
    rot: `${(i * 67) % 360}deg`,
    c: cols[i % cols.length],
    w: 6 + (i % 3) * 3,
  }));
  return (
    <span className="shop-confetti" aria-hidden>
      {bits.map((b, i) => (
        <i key={i} style={{ left: b.left, animationDelay: b.delay, background: b.c, width: b.w, height: b.w * 1.6, ["--dx" as string]: b.dx, ["--rot" as string]: b.rot }} />
      ))}
    </span>
  );
}

export function Sparkles() {
  const bits = [
    { x: "8%", y: "18%", s: 14, d: "0ms" },
    { x: "86%", y: "12%", s: 18, d: "120ms" },
    { x: "18%", y: "70%", s: 10, d: "240ms" },
    { x: "80%", y: "66%", s: 14, d: "60ms" },
    { x: "50%", y: "4%", s: 10, d: "180ms" },
  ];
  return (
    <span className="shop-sparkles" aria-hidden>
      {bits.map((b, i) => (
        <svg key={i} viewBox="0 0 24 24" style={{ left: b.x, top: b.y, width: b.s, height: b.s, animationDelay: b.d }}>
          <path d="M12 1c1 6 5 10 11 11-6 1-10 5-11 11-1-6-5-10-11-11 6-1 10-5 11-11Z" fill="currentColor" />
        </svg>
      ))}
    </span>
  );
}
