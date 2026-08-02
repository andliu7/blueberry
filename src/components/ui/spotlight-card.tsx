"use client";

import { useRef, useState, type ReactNode } from "react";

/**
 * Card surface that reacts to the cursor: a spotlight glow that follows the
 * pointer, a subtle 3D tilt, or neither.
 *
 * Unlike the stock version this imposes no look of its own beyond
 * `relative overflow-hidden` — the caller supplies background, border and
 * radius through `className`, so it can wrap cards that are already styled
 * without fighting them for the same Tailwind properties.
 */
export const SpotlightCard = ({
  children,
  className = "",
  spotlightColor = "#6366f133",
  spotlight = true,
  tilt = false,
  maxTilt = 5,
}: {
  children: ReactNode;
  className?: string;
  spotlightColor?: string;
  spotlight?: boolean;
  tilt?: boolean;
  /** Peak rotation in degrees at the card's edges. */
  maxTilt?: number;
}) => {
  const divRef = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [opacity, setOpacity] = useState(0);
  const [rotate, setRotate] = useState({ x: 0, y: 0 });

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const el = divRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    if (spotlight) setPosition({ x, y });
    if (tilt) {
      // -0.5..0.5 from the centre, so the card leans toward the cursor.
      const dx = x / rect.width - 0.5;
      const dy = y / rect.height - 0.5;
      setRotate({ x: -dy * maxTilt * 2, y: dx * maxTilt * 2 });
    }
  };

  const settle = () => {
    setOpacity(0);
    setRotate({ x: 0, y: 0 });
  };

  return (
    <div
      ref={divRef}
      onMouseMove={handleMouseMove}
      onMouseEnter={() => spotlight && setOpacity(1)}
      onMouseLeave={settle}
      onFocus={() => spotlight && setOpacity(1)}
      onBlur={settle}
      className={`relative overflow-hidden ${className}`}
      style={
        tilt
          ? {
              transform: `perspective(900px) rotateX(${rotate.x}deg) rotateY(${rotate.y}deg)`,
            }
          : undefined
      }
    >
      {spotlight && (
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 transition-opacity duration-500 ease-in-out"
          style={{
            opacity,
            background: `radial-gradient(circle at ${position.x}px ${position.y}px, ${spotlightColor}, transparent 80%)`,
          }}
        />
      )}
      {children}
    </div>
  );
};

export default SpotlightCard;
