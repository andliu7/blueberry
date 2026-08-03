import * as React from "react";
import { cn } from "@/lib/utils";

/**
 * An "admit one" ticket: notched corners, a perforated stub, vertical stub
 * lettering, and a pointer-tracked tilt with a glare sweep.
 *
 * Rewritten from the supplied file rather than copied. That file was a bundled
 * build artifact, not source: mangled identifiers (`React2`, `ShaderMount2`),
 * `jsx as jsx4` imports, and the whole `@paper-design/shaders` WebGL library
 * inlined. It also contained an unterminated string literal in its
 * presenter/event block, so it could not parse at all.
 *
 * The shader is dropped. Its only job was a dithered texture, and the ticket's
 * character comes from its geometry and typography. A CSS gradient gets the
 * same read without adding a WebGL dependency to a bundle already past Vite's
 * size warning, and without a constructor that throws on machines whose
 * browser refuses WebGL2.
 */

const REF = 741;

export const TICKET_GEOMETRY = {
  aspect: 741 / 425,
  cornerRadius: 25 / REF,
  notchRadius: 21 / REF,
  perforation: 562 / REF,
};

export type TicketGeometry = typeof TICKET_GEOMETRY;

/**
 * The outline: rounded corners with a bite taken out of the top and bottom
 * edges where the stub tears off, which is what makes it read as a ticket
 * rather than a rounded rectangle.
 */
export function ticketClipPath(width: number, height: number, g: TicketGeometry = TICKET_GEOMETRY) {
  const r = g.cornerRadius * width;
  const n = g.notchRadius * width;
  const p = g.perforation * width;
  return [
    `M ${r} 0`,
    `L ${p - n} 0`,
    `A ${n} ${n} 0 0 0 ${p + n} 0`,
    `L ${width - r} 0`,
    `A ${r} ${r} 0 0 0 ${width} ${r}`,
    `L ${width} ${height - r}`,
    `A ${r} ${r} 0 0 0 ${width - r} ${height}`,
    `L ${p + n} ${height}`,
    `A ${n} ${n} 0 0 0 ${p - n} ${height}`,
    `L ${r} ${height}`,
    `A ${r} ${r} 0 0 0 0 ${height - r}`,
    `L 0 ${r}`,
    `A ${r} ${r} 0 0 0 ${r} 0`,
    "Z",
  ].join(" ");
}

export interface AdmitOneTicketProps {
  presenter?: string;
  event?: string;
  name: string;
  venue?: string;
  dates?: string;
  stubText?: string;
  watermark?: string;
  width?: number;
  className?: string;
  tilt?: boolean;
  onClick?: () => void;
  disabled?: boolean;
}

export function AdmitOneTicket({
  presenter = "",
  event = "",
  name,
  venue = "",
  dates = "",
  stubText = "Admit one",
  watermark = "242",
  width = REF,
  className,
  tilt = true,
  onClick,
  disabled = false,
}: AdmitOneTicketProps) {
  const height = width / TICKET_GEOMETRY.aspect;
  const perfX = TICKET_GEOMETRY.perforation * width;
  const clip = `path('${ticketClipPath(width, height, TICKET_GEOMETRY)}')`;

  const cardRef = React.useRef<HTMLDivElement>(null);
  const glareRef = React.useRef<HTMLDivElement>(null);
  const [hovering, setHovering] = React.useState(false);

  const onMove = (e: React.PointerEvent<HTMLDivElement>) => {
    const el = cardRef.current;
    if (!el || !tilt) return;
    const rect = el.getBoundingClientRect();
    const dx = (e.clientX - rect.left) / rect.width - 0.5;
    const dy = (e.clientY - rect.top) / rect.height - 0.5;
    el.style.transform = `perspective(1200px) rotateX(${-(dy * 2) * 9}deg) rotateY(${dx * 2 * 9}deg) scale(1.02)`;
    if (glareRef.current) {
      glareRef.current.style.background = `radial-gradient(38% 55% at ${(dx + 0.5) * 100}% ${(dy + 0.5) * 100}%, rgba(255,255,255,0.16) 0%, rgba(255,255,255,0) 70%)`;
    }
  };

  const onLeave = () => {
    setHovering(false);
    if (cardRef.current) {
      cardRef.current.style.transform = "perspective(1200px) rotateX(0deg) rotateY(0deg) scale(1)";
    }
    if (glareRef.current) glareRef.current.style.background = "transparent";
  };

  const Tag = onClick ? "button" : "div";

  return (
    <div
      ref={cardRef}
      onPointerEnter={() => setHovering(true)}
      onPointerMove={onMove}
      onPointerLeave={onLeave}
      className={cn("relative w-fit will-change-transform", className)}
      style={{
        transition: hovering ? "none" : "transform 420ms cubic-bezier(0.22, 1, 0.36, 1)",
        transform: "perspective(1200px) rotateX(0deg) rotateY(0deg) scale(1)",
        transformStyle: "preserve-3d",
      }}
    >
      <Tag
        {...(onClick ? { type: "button" as const, onClick, disabled } : {})}
        className={cn(
          "relative block select-none text-left",
          onClick && !disabled && "cursor-pointer",
          disabled && "cursor-not-allowed opacity-60",
        )}
        style={{ width, height, clipPath: clip }}
      >
        {/* The wash the shader used to draw. Same palette, no WebGL. */}
        <div
          className="absolute inset-0"
          style={{
            background:
              "radial-gradient(120% 120% at 62% 30%, #ffc691 0%, #fe9046 45%, #ef671c 100%)",
          }}
        />

        {/* Perforation line where the stub tears away. */}
        <div
          aria-hidden
          className="absolute top-0 bottom-0"
          style={{
            left: perfX,
            width: Math.max(1, 0.0022 * width),
            backgroundImage: `repeating-linear-gradient(to bottom, #5a352055 0 ${0.012 * width}px, transparent ${0.012 * width}px ${0.024 * width}px)`,
          }}
        />

        {/* Oversized watermark behind the stub. */}
        <div
          aria-hidden
          className="pointer-events-none absolute grid place-items-center font-bold tabular-nums"
          style={{
            left: perfX,
            top: 0,
            width: width - perfX,
            height,
            color: "#ffdcbe",
            opacity: 0.6,
          }}
        >
          <span
            style={{
              writingMode: "vertical-rl",
              fontSize: (144 / REF) * width,
              lineHeight: 1,
              letterSpacing: "-0.04em",
            }}
          >
            {watermark}
          </span>
        </div>

        <div className="absolute inset-0" style={{ color: "#5a3520" }}>
          {(presenter || event) && (
            <div
              className="absolute whitespace-pre uppercase"
              style={{
                left: (57 / REF) * width,
                top: (58 / REF) * width,
                fontSize: (19.72 / REF) * width,
                lineHeight: `${(28 / REF) * width}px`,
                letterSpacing: "0.016em",
              }}
            >
              {presenter}
              {presenter && event ? "\n" : ""}
              {event}
            </div>
          )}

          <div
            className="absolute font-medium uppercase"
            style={{
              left: (57 / REF) * width,
              top: (185 / REF) * width,
              fontSize: (58 / REF) * width,
              lineHeight: `${(62 / REF) * width}px`,
              letterSpacing: "-0.01em",
            }}
          >
            {name}
          </div>

          {(venue || dates) && (
            <div
              className="absolute whitespace-nowrap uppercase"
              style={{
                left: (57 / REF) * width,
                top: (348 / REF) * width,
                fontSize: (19.72 / REF) * width,
                letterSpacing: "0.016em",
              }}
            >
              {venue}
              {venue && dates ? " · " : ""}
              {dates}
            </div>
          )}

          <div
            className="absolute grid place-items-center font-medium whitespace-nowrap uppercase"
            style={{
              left: perfX,
              top: 0,
              width: width - perfX,
              height,
              fontSize: (60 / REF) * width,
              opacity: 0.88,
            }}
          >
            <span style={{ writingMode: "vertical-rl" }}>{stubText}</span>
          </div>
        </div>
      </Tag>

      {/* Sibling of the clipped ticket, so the glare follows the same outline
          without being clipped away by its own container. */}
      {tilt && (
        <div
          ref={glareRef}
          aria-hidden
          className="pointer-events-none absolute inset-0"
          style={{ clipPath: clip, transition: hovering ? "none" : "background 420ms ease-out" }}
        />
      )}
    </div>
  );
}

export default AdmitOneTicket;
