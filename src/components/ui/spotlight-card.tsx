"use client";

import { useRef, useState, type ReactNode } from "react";

/**
 * Card surface with a spotlight glow that follows the cursor.
 *
 * Unlike the stock version this imposes no look of its own beyond
 * `relative overflow-hidden` — the caller supplies background, border and
 * radius through `className`, so it can wrap cards that are already styled
 * without fighting them for the same Tailwind properties.
 *
 * Tilt lives in TiltCard, which does it with springs.
 */
export const SpotlightCard = ({
  children,
  className = "",
  // --bb-primary at 20% alpha, replacing indigo `#6366f133`. No contrast floor
  // applies: the glow carries no text and draws no boundary, and composited over
  // a white card it lands at `#ded9f7`, 1.15:1 on white, which is the whole
  // point of a spotlight. The base hex is the token so the tint reads as the
  // app's blue-violet rather than a neighbouring hue.
  spotlightColor = "#5a3fd833",
}: {
  children: ReactNode;
  className?: string;
  spotlightColor?: string;
}) => {
  const divRef = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [opacity, setOpacity] = useState(0);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const el = divRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    setPosition({ x: e.clientX - rect.left, y: e.clientY - rect.top });
  };

  return (
    <div
      ref={divRef}
      onMouseMove={handleMouseMove}
      onMouseEnter={() => setOpacity(1)}
      onMouseLeave={() => setOpacity(0)}
      onFocus={() => setOpacity(1)}
      onBlur={() => setOpacity(0)}
      className={`relative overflow-hidden ${className}`}
    >
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 transition-opacity duration-500 ease-in-out"
        style={{
          opacity,
          background: `radial-gradient(circle at ${position.x}px ${position.y}px, ${spotlightColor}, transparent 80%)`,
        }}
      />
      {children}
    </div>
  );
};

export default SpotlightCard;
