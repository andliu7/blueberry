import { useCallback, useEffect, useRef, useState } from "react";

/**
 * A red laser pointer you can draw on the page with.
 *
 * The dot follows the cursor while the tool is on. Holding the primary button
 * draws a stroke, and strokes fade out on their own after a few idle seconds so
 * the page does not slowly fill up with old scribbles.
 *
 * Drawn on a canvas rather than as SVG paths in the React tree. A freehand
 * stroke is hundreds of points, and re-rendering the tree on every pointer move
 * to append one of them makes the whole page stutter. The canvas takes the
 * points directly and React never sees them.
 */

const FADE_AFTER_MS = 5000;
const FADE_OVER_MS = 900;
const LINE = "rgba(239, 68, 68, 0.95)";
const GLOW = "rgba(239, 68, 68, 0.45)";

type Point = { x: number; y: number };
type Stroke = { points: Point[]; finishedAt: number | null };

export function LaserPointer({ active, onExit }: { active: boolean; onExit?: () => void }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const strokes = useRef<Stroke[]>([]);
  const drawing = useRef(false);
  const cursor = useRef<Point | null>(null);
  const lastActivity = useRef(Date.now());
  const raf = useRef<number | null>(null);
  const [visibleDot, setVisibleDot] = useState<Point | null>(null);

  const resize = useCallback(() => {
    const c = canvasRef.current;
    if (!c) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    c.width = window.innerWidth * dpr;
    c.height = window.innerHeight * dpr;
    c.style.width = `${window.innerWidth}px`;
    c.style.height = `${window.innerHeight}px`;
    const ctx = c.getContext("2d");
    if (ctx) ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }, []);

  useEffect(() => {
    if (!active) {
      strokes.current = [];
      drawing.current = false;
      setVisibleDot(null);
      return;
    }
    resize();
    window.addEventListener("resize", resize);
    return () => window.removeEventListener("resize", resize);
  }, [active, resize]);

  // One animation loop while the tool is on. It both repaints and ages strokes,
  // so there is no second timer to keep in step with it.
  useEffect(() => {
    if (!active) return;

    const tick = () => {
      const c = canvasRef.current;
      const ctx = c?.getContext("2d");
      if (!c || !ctx) {
        raf.current = requestAnimationFrame(tick);
        return;
      }

      const now = Date.now();
      ctx.clearRect(0, 0, c.width, c.height);
      ctx.lineCap = "round";
      ctx.lineJoin = "round";

      strokes.current = strokes.current.filter((s) => {
        // A stroke only starts ageing once the pointer has been idle, so a
        // pause mid-sentence does not erase what you already drew.
        const idleFor = now - lastActivity.current;
        const fadeStart = s.finishedAt !== null && idleFor > FADE_AFTER_MS;
        const alpha = fadeStart ? 1 - (idleFor - FADE_AFTER_MS) / FADE_OVER_MS : 1;
        if (alpha <= 0) return false;

        if (s.points.length > 1) {
          ctx.globalAlpha = alpha;
          ctx.strokeStyle = GLOW;
          ctx.lineWidth = 10;
          ctx.shadowColor = GLOW;
          ctx.shadowBlur = 14;
          ctx.beginPath();
          ctx.moveTo(s.points[0]!.x, s.points[0]!.y);
          for (const p of s.points.slice(1)) ctx.lineTo(p.x, p.y);
          ctx.stroke();

          ctx.strokeStyle = LINE;
          ctx.lineWidth = 3;
          ctx.shadowBlur = 0;
          ctx.stroke();
          ctx.globalAlpha = 1;
        }
        return true;
      });

      raf.current = requestAnimationFrame(tick);
    };

    raf.current = requestAnimationFrame(tick);
    return () => {
      if (raf.current) cancelAnimationFrame(raf.current);
      raf.current = null;
    };
  }, [active]);

  useEffect(() => {
    if (!active) return;

    const move = (e: PointerEvent) => {
      const p = { x: e.clientX, y: e.clientY };
      cursor.current = p;
      lastActivity.current = Date.now();
      setVisibleDot(p);
      if (drawing.current) strokes.current[strokes.current.length - 1]?.points.push(p);
    };

    const down = (e: PointerEvent) => {
      if (e.button !== 0) return;
      drawing.current = true;
      lastActivity.current = Date.now();
      strokes.current.push({ points: [{ x: e.clientX, y: e.clientY }], finishedAt: null });
    };

    const up = () => {
      if (!drawing.current) return;
      drawing.current = false;
      lastActivity.current = Date.now();
      const last = strokes.current[strokes.current.length - 1];
      if (last) last.finishedAt = Date.now();
    };

    // Escape is the way out. The canvas swallows clicks while the tool is on,
    // so without it you could not reach the button that turns it off.
    const key = (e: KeyboardEvent) => {
      if (e.key === "Escape") onExit?.();
    };

    window.addEventListener("pointermove", move);
    window.addEventListener("pointerdown", down);
    window.addEventListener("pointerup", up);
    window.addEventListener("pointercancel", up);
    window.addEventListener("keydown", key);
    return () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerdown", down);
      window.removeEventListener("pointerup", up);
      window.removeEventListener("pointercancel", up);
      window.removeEventListener("keydown", key);
    };
  }, [active, onExit]);

  if (!active) return null;

  return (
    <>
      {/* `pointer-events-none` so the page underneath stays usable: you can
          still scroll and read while the laser is on. */}
      <canvas
        ref={canvasRef}
        aria-hidden
        className="pointer-events-none fixed inset-0 z-[70]"
      />
      {visibleDot && (
        <span
          aria-hidden
          className="pointer-events-none fixed z-[71] h-3 w-3 rounded-full"
          style={{
            left: visibleDot.x - 6,
            top: visibleDot.y - 6,
            background: "radial-gradient(circle, #fff 0%, #ef4444 45%, rgba(239,68,68,0) 75%)",
            boxShadow: "0 0 12px 4px rgba(239,68,68,0.6)",
          }}
        />
      )}
      <div className="pointer-events-none fixed bottom-5 left-1/2 z-[72] -translate-x-1/2 rounded-full bg-slate-900/85 px-3 py-1.5 font-mono text-xs text-white">
        Laser on · hold to draw · Esc to stop
      </div>
    </>
  );
}

export default LaserPointer;
