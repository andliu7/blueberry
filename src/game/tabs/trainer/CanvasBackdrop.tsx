/**
 * The water behind the molecules, and the reason the two modes look different
 * before a student has read a single word.
 *
 * WHY THIS EXISTS. The trainer plays three kinds of thing on one canvas and
 * they were visually identical: a mechanism, a resonance hunt, and the step
 * where a resonance form opens the site the nucleophile then attacks. Owner
 * direction 2026-08-28: make them differ at a glance, keep it related to the
 * chemistry, and use water, because that is where most of this chemistry
 * happens.
 *
 * THE VISUAL RULE, and it is a chemistry argument rather than a taste one:
 *
 *   mechanism   one direction. Electrons go SOMEWHERE. Aqua, a current with a
 *               consistent drift, caustic light sheared the way it travels.
 *   resonance   no direction at all. NOTHING MOVES: the contributing forms are
 *               one thing drawn two ways. Violet, still water, and ripples that
 *               appear only where the student touches, because the movement is
 *               the reader's attention rather than the molecule's.
 *   hybrid      violet resolving into aqua, left to right. The resonance form
 *               exposes the charge and the attack follows it. This is the
 *               carbonyl the owner described: the pi bond shifts onto oxygen,
 *               the carbon goes positive, and something negative comes in.
 *
 * WHY NOT A VIDEO. A looping video would spend the game route's 400 KB initial
 * payload budget and fight the 60 fps row in CLAUDE.md's budgets table. These
 * are three WebP plates totalling 26 KB, served from public/ so they never
 * enter the JS bundle, with the motion added in CSS on transform and opacity
 * only, which keeps it on the compositor.
 *
 * WHY THIS CANNOT BREAK DRAWING, which is the thing worth being careful about.
 * The backdrop is `pointer-events: none` throughout, so it can never take a
 * pointer the arrow machine wanted. It learns about taps from a listener that
 * is passive and non capturing and calls neither preventDefault nor
 * stopPropagation: it watches, and the canvas underneath behaves exactly as it
 * did before this file existed.
 */

import { useEffect, useRef, useState } from "react";

/** Which water the student is looking at. */
export type BackdropMode = "mechanism" | "resonance" | "hybrid";

export interface CanvasBackdropProps {
  readonly mode: BackdropMode;
  /**
   * The element whose taps make ripples. Resonance only: the other two modes
   * have no interaction, because a current is not something you poke.
   */
  readonly surface: React.RefObject<HTMLElement | null>;
  readonly reducedMotion: boolean;
}

interface Ripple {
  readonly id: number;
  readonly x: number;
  readonly y: number;
}

/** Long enough to read as water, short enough not to pile up. Matches the CSS. */
const RIPPLE_MS = 2600;
/** More than this on screen at once reads as noise rather than water. */
const MAX_RIPPLES = 4;
/**
 * Taps closer together than this are one gesture.
 *
 * The first version rippled on every pointerdown, which the owner found too
 * sensitive: a double tap, a drag that started with a jitter, or a stray touch
 * all made rings. Still water does not respond to everything.
 */
const QUIET_MS = 260;

export function CanvasBackdrop({ mode, surface, reducedMotion }: CanvasBackdropProps) {
  const [ripples, setRipples] = useState<readonly Ripple[]>([]);
  const nextId = useRef(0);
  const lastAt = useRef(0);

  useEffect(() => {
    // Only resonance is touchable, and reduced motion opts out of the whole
    // effect rather than shortening it: a ripple IS the motion.
    if (mode !== "resonance" || reducedMotion) {
      setRipples([]);
      return;
    }
    const el = surface.current;
    if (el === null) return;

    function onPointerDown(ev: PointerEvent) {
      const host = surface.current;
      if (host === null) return;

      // WHERE THE TAP MUST NOT RIPPLE. The tool sheets (scratchpaper, the
      // periodic table, the 3D view) render as `fixed inset-0` overlays that
      // are DOM children of this same section, so their taps bubble straight
      // into this listener. The owner hit exactly that: drawing on the
      // scratchpaper was rippling the water behind it. Anything inside a
      // dialog, and any real control, is somebody else's gesture.
      const target = ev.target instanceof Element ? ev.target : null;
      if (target !== null && target.closest('[role="dialog"], button, a, input, textarea, select, [role="button"]')) {
        return;
      }
      // A sheet open anywhere means the canvas is not what is being touched,
      // even when the tap lands outside the sheet's own box.
      if (document.querySelector('[role="dialog"][aria-modal="true"]') !== null) return;

      // Not every touch is a disturbance. Two taps in the same instant are one
      // gesture, and a student mid-drag is drawing, not skipping stones.
      const now = ev.timeStamp;
      if (now - lastAt.current < QUIET_MS) return;
      lastAt.current = now;

      const box = host.getBoundingClientRect();
      const id = nextId.current;
      nextId.current += 1;
      const ripple: Ripple = { id, x: ev.clientX - box.left, y: ev.clientY - box.top };
      setRipples((live) => [...live, ripple].slice(-MAX_RIPPLES));
      // Each ripple removes itself. No interval, so an idle canvas costs nothing.
      window.setTimeout(() => {
        setRipples((live) => live.filter((r) => r.id !== id));
      }, RIPPLE_MS);
    }

    // Passive: this listener never calls preventDefault, and saying so lets the
    // browser keep the canvas responsive while it runs.
    el.addEventListener("pointerdown", onPointerDown, { passive: true });
    return () => el.removeEventListener("pointerdown", onPointerDown);
  }, [mode, reducedMotion, surface]);

  return (
    <>
    {/* The crest that passes OVER the molecule, in its own layer above the
        chemistry. Only for a deliberate tap: the ambient drops stay in the
        water, because a drop nobody caused should not touch the answer. */}
    {mode === "resonance" && !reducedMotion && ripples.length > 0 ? (
      <div className="backdrop-overlay" aria-hidden="true">
        {ripples.map((r) => (
          <span key={r.id} className="backdrop-overlay__crest" style={{ left: r.x, top: r.y }} />
        ))}
      </div>
    ) : null}
    <div className={`backdrop backdrop--${mode}`} aria-hidden="true">
      <div className={`backdrop__plate${reducedMotion ? "" : " backdrop__plate--drift"}`} />
      {/* Real water for resonance: three photographs of one still pool,
          crossfading so the surface breathes in place rather than travelling.
          Travelling is the mechanism idea and this is not that. */}
      {mode === "resonance" ? (
        <>
          <div className="backdrop__water backdrop__water--a" />
          <div className="backdrop__water backdrop__water--b" />
          <div className="backdrop__water backdrop__water--c" />
        </>
      ) : null}
      {/* Ambient drops. Borrowed from canvas-ui's Ripple, which exposes an
          `interval` for exactly this: still water that only moves when touched
          reads as dead, and dead is the opposite of tranquil. Pure CSS on fixed
          offsets, so an idle canvas costs no JavaScript at all. */}
      {mode === "resonance" && !reducedMotion ? (
        <>
          <span className="backdrop__drop backdrop__drop--1" />
          <span className="backdrop__drop backdrop__drop--2" />
          <span className="backdrop__drop backdrop__drop--3" />
        </>
      ) : null}
      {mode === "resonance"
        ? ripples.map((r) => (
            <span key={r.id} className="backdrop__ripple" style={{ left: r.x, top: r.y }} />
          ))
        : null}
    </div>
    </>
  );
}
