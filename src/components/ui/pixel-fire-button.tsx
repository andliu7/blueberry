import { useEffect, useRef } from "react";
import { cn } from "@/lib/utils";

/**
 * A button whose face is a doom-fire canvas: molten fill from the bottom, a
 * churning waterline, flames that bend toward the cursor and flare on press.
 *
 * Essentially the supplied component. Two changes:
 *
 * 1. **Reduced motion stops the loop entirely**, rather than merely slowing it.
 *    A permanently running 30fps fire is exactly what that preference is for,
 *    and the button still reads as lit because the first frame is painted
 *    synchronously before the loop would have started.
 * 2. **The loop parks when the button is off screen.** An IntersectionObserver
 *    cancels the rAF while it is scrolled away, so a fire sitting in a dismissed
 *    toast is not still burning CPU behind the page.
 *
 * The ember palette is deliberately not themed to the site's violet. This is
 * the one control that is meant to look like a reward rather than part of the
 * furniture, and a violet fire is neither.
 */

const STEPS = 38;
const CELL = 3;
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

function buildPalette(alpha: number) {
  const p = new Uint8Array(STEPS * 4);
  for (let s = 0; s < STEPS; s++) {
    const t = s / (STEPS - 1);
    let r: number;
    let g: number;
    let b: number;
    if (t < 0.4) {
      const e = t / 0.4;
      r = lerp(120, 218, e);
      g = lerp(20, 58, e);
      b = 0;
    } else if (t < 0.75) {
      const e = (t - 0.4) / 0.35;
      r = lerp(218, 255, e);
      g = lerp(58, 138, e);
      b = lerp(0, 42, e);
    } else {
      const e = (t - 0.75) / 0.25;
      r = 255;
      g = lerp(138, 228, e);
      b = lerp(42, 157, e);
    }
    p[s * 4] = r;
    p[s * 4 + 1] = g;
    p[s * 4 + 2] = b;
    p[s * 4 + 3] = Math.round(t ** 1.2 * alpha);
  }
  return p;
}

function FireCanvas({
  litRef,
  hoverRef,
  pressedRef,
}: {
  litRef: React.RefObject<boolean>;
  hoverRef: React.RefObject<boolean>;
  pressedRef: React.RefObject<boolean>;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const cols = Math.max(8, Math.ceil((canvas.offsetWidth || 160) / CELL));
    const rows = Math.max(8, Math.ceil((canvas.offsetHeight || 38) / CELL));
    canvas.width = cols;
    canvas.height = rows;

    const palette = buildPalette(180);
    const heat = new Uint8Array(cols * rows);
    const waterline = new Float32Array(cols);
    let maxHeat = 0;
    let pointerX = cols / 2;
    const onMove = (e: PointerEvent) => {
      const rect = canvas.getBoundingClientRect();
      if (rect.width > 0) pointerX = ((e.clientX - rect.left) / rect.width) * cols;
    };
    const parent = canvas.parentElement;
    parent?.addEventListener("pointermove", onMove);

    const img = ctx.createImageData(cols, rows);
    let level = litRef.current ? 1 : 0;

    // First paint synchronously, so a lit button is molten from frame zero even
    // if the loop never runs: a throttled tab, or reduced motion below.
    const paintFlat = () => {
      const d = img.data;
      for (let o = 0; o < d.length; o += 4) {
        d[o] = 218;
        d[o + 1] = 58;
        d[o + 2] = 0;
        d[o + 3] = 255;
      }
      ctx.putImageData(img, 0, 0);
    };
    if (level === 1) paintFlat();

    // Someone who has asked for less motion gets the lit face and no fire.
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      return () => parent?.removeEventListener("pointermove", onMove);
    }

    let raf = 0;
    let lastT = 0;
    let acc = 0;
    let burst = 0;
    let wasPressed = false;
    let alive = true;
    let onScreen = true;
    const TICK = 1000 / 30;

    const step = (t: number) => {
      if (!alive) return;
      raf = requestAnimationFrame(step);
      if (!onScreen) return;
      lastT ||= t;
      const dt = Math.min(64, t - lastT);
      lastT = t;

      if (litRef.current) level += (1 - level) * (1 - Math.exp(-dt / 240));
      else if (level > 0) {
        level += (0 - level) * (1 - Math.exp(-dt / 320));
        if (level < 0.02) level = 0;
      }

      acc += dt;
      if (acc >= TICK) {
        acc %= TICK;

        for (let x = 0; x < cols; x++) {
          waterline[x] = Math.max(
            -4,
            Math.min(4, (waterline[x] ?? 0) + (Math.random() - 0.5) * 1.6),
          );
        }
        for (let x = 1; x < cols - 1; x++) {
          waterline[x] =
            ((waterline[x - 1] ?? 0) + (waterline[x] ?? 0) * 2 + (waterline[x + 1] ?? 0)) / 4;
        }

        const cool = litRef.current ? 0 : 1;
        for (let y = 0; y < rows - 1; y++) {
          for (let x = 0; x < cols; x++) {
            const src = (y + 1) * cols + x;
            const dst =
              y * cols + Math.min(cols - 1, Math.max(0, x + ((Math.random() * 3) | 0) - 1));
            const v = (heat[src] ?? 0) - (1 + cool + ((Math.random() * 2.4) | 0));
            heat[dst] = v > 0 ? v : 0;
          }
        }

        const churn = level * (1 - level) * 4;
        const fill = level * (rows + 6);

        if (pressedRef.current && !wasPressed) burst = 1;
        wasPressed = !!pressedRef.current;
        burst = pressedRef.current ? Math.max(burst * 0.86, 0.45) : burst * 0.8;

        if (litRef.current) {
          for (let x = 0; x < cols; x++) {
            const h = fill + (waterline[x] ?? 0) * (0.4 + churn);
            const surface = rows - 1 - Math.floor(h);
            if (level > 0.02 && surface >= 0 && surface < rows) {
              heat[surface * cols + x] = STEPS - 1;
              if (surface + 1 < rows) heat[(surface + 1) * cols + x] = STEPS - 1;
            }
            if (level > 0.97) {
              if (burst > 0.05) {
                heat[(rows - 1) * cols + x] = STEPS - 1;
                heat[(rows - 2) * cols + x] = STEPS - 1;
                if (rows > 2 && Math.random() < burst) heat[(rows - 3) * cols + x] = STEPS - 1;
                if (Math.random() < burst * 0.3)
                  heat[((Math.random() * rows) | 0) * cols + x] = STEPS - 1;
              } else if (hoverRef.current) {
                heat[(rows - 1) * cols + x] = STEPS - 1;
                if (Math.random() < 0.7) heat[(rows - 2) * cols + x] = STEPS - 2;
                const d = x - pointerX;
                const near = Math.exp(-(d * d) / 18);
                if (near > 0.35 && rows > 2) heat[(rows - 3) * cols + x] = STEPS - 1;
                if (near > 0.7 && rows > 3) heat[(rows - 4) * cols + x] = STEPS - 3;
              } else if (Math.random() < 0.55) {
                heat[(rows - 1) * cols + x] = Math.random() < 0.5 ? STEPS - 11 : STEPS - 17;
              }
            }
          }
        }
      }

      if (level === 0 && maxHeat === 0) {
        ctx.clearRect(0, 0, cols, rows);
        return;
      }

      maxHeat = 0;
      const d = img.data;
      const churn = level * (1 - level) * 4;
      const fill = level * (rows + 6);
      for (let x = 0; x < cols; x++) {
        const h = fill + (waterline[x] ?? 0) * (0.4 + churn);
        for (let y = 0; y < rows; y++) {
          const idx = y * cols + x;
          const o = idx * 4;
          const v = heat[idx] ?? 0;
          if (v > maxHeat) maxHeat = v;
          const pi = v * 4;
          const a = palette[pi + 3]!;
          if (rows - y <= h) {
            d[o] = 218 + (((palette[pi]! - 218) * a) >> 8);
            d[o + 1] = 58 + (((palette[pi + 1]! - 58) * a) >> 8);
            d[o + 2] = 0 + (((palette[pi + 2]! - 0) * a) >> 8);
            d[o + 3] = 255;
          } else {
            d[o] = palette[pi]!;
            d[o + 1] = palette[pi + 1]!;
            d[o + 2] = palette[pi + 2]!;
            d[o + 3] = a;
          }
        }
      }
      ctx.putImageData(img, 0, 0);
    };
    raf = requestAnimationFrame(step);

    // Parks the simulation while the button is scrolled away.
    const io = new IntersectionObserver(([entry]) => {
      onScreen = Boolean(entry?.isIntersecting);
      lastT = 0;
    });
    io.observe(canvas);

    return () => {
      alive = false;
      cancelAnimationFrame(raf);
      io.disconnect();
      parent?.removeEventListener("pointermove", onMove);
    };
  }, [litRef, hoverRef, pressedRef]);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden
      className="pointer-events-none absolute inset-0 h-full w-full [image-rendering:pixelated]"
    />
  );
}

export function PixelFireButton({
  children,
  lit = true,
  variant = "primary",
  className,
  style,
  onClick,
  disabled,
  type = "button",
}: {
  children: React.ReactNode;
  /** Fire on or out. Out = dark base, dimmed label, embers dying. */
  lit?: boolean;
  variant?: "primary" | "ghost";
  className?: string;
  style?: React.CSSProperties;
  onClick?: React.MouseEventHandler<HTMLButtonElement>;
  disabled?: boolean;
  type?: "button" | "submit";
}) {
  const litRef = useRef(lit);
  const hoverRef = useRef(false);
  const pressedRef = useRef(false);
  litRef.current = lit;

  if (variant === "ghost") {
    return (
      <button
        type={type}
        onClick={onClick}
        disabled={disabled}
        className={cn(
          "relative inline-flex h-[38px] items-center justify-center gap-2 rounded-md border border-[#f4f1ea]/15 bg-[#16140f] px-4 text-sm font-semibold tracking-[-0.015em] text-[#f4f1ea]",
          "transition-[scale,border-color,box-shadow,color] duration-150 active:scale-[0.985]",
          "hover:border-[#ff8a3d]/40 hover:text-[#ffd6bf]",
          "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#ff8a3d]",
          disabled && "pointer-events-none opacity-50",
          className,
        )}
      >
        {children}
      </button>
    );
  }

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      onMouseEnter={() => (hoverRef.current = true)}
      onMouseLeave={() => {
        hoverRef.current = false;
        pressedRef.current = false;
      }}
      onPointerDown={() => (pressedRef.current = true)}
      onPointerUp={() => (pressedRef.current = false)}
      style={{
        color: lit ? "#ffffff" : "rgba(255, 255, 255, 0.4)",
        transition: "color 400ms ease, transform 120ms ease-out",
        ...style,
      }}
      className={cn(
        "relative inline-flex h-[38px] shrink-0 items-center justify-center overflow-hidden rounded-md border-none bg-[#2a2a2a] px-4 text-sm font-semibold tracking-[-0.015em] whitespace-nowrap active:scale-[0.985]",
        "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#ff8a3d]",
        disabled && "pointer-events-none",
        className,
      )}
    >
      <FireCanvas litRef={litRef} hoverRef={hoverRef} pressedRef={pressedRef} />
      <span className="relative">{children}</span>
    </button>
  );
}

export default PixelFireButton;
