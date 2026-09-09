/**
 * Makes every `.gradient-button` light from wherever the cursor is.
 *
 * One delegated listener on the document rather than a handler per button. The
 * gradient is on 27 call sites and growing; wiring each one would mean 27
 * listeners, 27 chances to forget the cleanup, and a prop threaded through
 * components that only want a class. This is the same shape as
 * `installClickSound`, which is already installed once beside it in main.tsx.
 *
 * The write is deferred to an animation frame. `pointermove` fires far faster
 * than the screen repaints, and setting a custom property is a style
 * invalidation, so writing on every event asks the browser to recompute a
 * gradient several times per frame and show none of them.
 *
 * Position and colour move at different speeds on purpose, which is set in the
 * CSS: the focal point tracks the hand almost immediately, because a light that
 * lags the cursor by half a second reads as broken rather than as smooth, while
 * the colours still take their time.
 */

const SELECTOR = ".gradient-button";

export function installGradientCursor(): void {
  if (typeof document === "undefined") return;

  let frame = 0;
  let pending: { el: HTMLElement; x: number; y: number } | null = null;

  const flush = () => {
    frame = 0;
    if (!pending) return;
    const { el, x, y } = pending;
    pending = null;
    el.style.setProperty("--gb-pos-x", `${x.toFixed(2)}%`);
    el.style.setProperty("--gb-pos-y", `${y.toFixed(2)}%`);
  };

  document.addEventListener(
    "pointermove",
    (event) => {
      const target = event.target;
      if (!(target instanceof Element)) return;
      const el = target.closest<HTMLElement>(SELECTOR);
      if (!el) return;
      const rect = el.getBoundingClientRect();
      if (rect.width < 1 || rect.height < 1) return;
      pending = {
        el,
        x: ((event.clientX - rect.left) / rect.width) * 100,
        y: ((event.clientY - rect.top) / rect.height) * 100,
      };
      if (!frame) frame = requestAnimationFrame(flush);
    },
    { passive: true },
  );

  // Handing the focal point back lets the CSS resting state own it again, so
  // the light travels home rather than staying wherever the cursor left it.
  document.addEventListener(
    "pointerout",
    (event) => {
      const target = event.target;
      if (!(target instanceof Element)) return;
      const el = target.closest<HTMLElement>(SELECTOR);
      if (!el) return;
      const next = event.relatedTarget;
      if (next instanceof Node && el.contains(next)) return;
      el.style.removeProperty("--gb-pos-x");
      el.style.removeProperty("--gb-pos-y");
    },
    { passive: true },
  );
}
