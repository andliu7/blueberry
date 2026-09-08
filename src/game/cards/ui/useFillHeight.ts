/**
 * How tall a surface may be if its last row must stay above the tab bar.
 *
 * WHY THIS IS MEASURED AND NOT A calc(). The round 2 composer put its Save to
 * deck chip at top=793 on a 390x844 phone whose fixed tab bar starts at 768,
 * so the primary act of the whole face was painted under the bar and off
 * screen on first paint. The obvious repair is `height: calc(100dvh - Xrem)`,
 * and it is the wrong one: X is the app header plus the bar, both of which
 * live in the shell's own files, change with the shell, and are not visible
 * from here. A number copied out of another owner's stylesheet is a number
 * that goes stale silently.
 *
 * So the surface asks the browser instead. `element.getBoundingClientRect().top`
 * is exactly how far down the viewport this surface begins, whatever the
 * header above it turns out to be, and BOTTOM_RESERVE_FALLBACK is the one
 * number this file does have to know: the shell's own `pb-24`, the strip it
 * has already padded away for the bar. `bottomReserve` below decides whether
 * that strip is in play at this width, and its comment carries the reason it
 * is the shell's reserve rather than the bar's measured height.
 *
 * THE NON-OBVIOUS REACT PATTERN, named per CLAUDE.md: this is a REF plus
 * STATE measurement hook. State cannot hold a live DOM node before the first
 * render, so the ref reaches the node and a layout effect pushes the measured
 * number into state, which is what re-renders. `useLayoutEffect` rather than
 * `useEffect` so the height is applied in the same frame the surface first
 * paints, and a resize listener re-measures when the phone rotates or the
 * keyboard opens.
 *
 * It returns null until it has measured, and every caller treats null as "no
 * height set", so a surface that never measures is a normal scrolling column
 * rather than a collapsed one.
 */

import { useCallback, useLayoutEffect, useRef, useState } from "react";

/** The shell's own reserved strip for the fixed tab bar, px. See the header. */
export const BOTTOM_RESERVE_FALLBACK = 96;

/** Never squeeze a surface below this, px: past it, scrolling is the honest answer. */
export const MIN_FILL_HEIGHT = 320;

/**
 * How much room below the surface is already spoken for.
 *
 * IT IS THE SHELL'S RESERVE AND NOT THE BAR'S HEIGHT, and the difference is
 * worth stating because the first version got it wrong and the measurement
 * caught it. The shell pads its content column by 96px for the bar while the
 * bar itself only occupies about 76, so a column sized against the bar's own
 * height ends 20px INSIDE the padding and the document comes out 12 to 20px
 * taller than the viewport: a page that scrolls by a hair, which is the same
 * defect in miniature that put round 2's save chip off screen. Reserving what
 * the shell reserves makes the column end exactly where its padding begins,
 * and the save chip then sits about 20px clear of the bar rather than flush
 * against it.
 *
 * From `md` up the bar is a LEFT RAIL and the shell drops the padding
 * (`md:pb-0`), so there is nothing to reserve; the rail is recognised by
 * being taller than it is wide.
 */
function bottomReserve(): number {
  if (typeof document === "undefined") return BOTTOM_RESERVE_FALLBACK;
  const bar = document.querySelector(".tabbar");
  if (bar === null) return BOTTOM_RESERVE_FALLBACK;
  const rect = bar.getBoundingClientRect();
  if (rect.height > 0 && rect.height > rect.width) return 0;
  return BOTTOM_RESERVE_FALLBACK;
}

export interface FillHeight {
  /** Attach to the element whose height is being solved for. */
  readonly ref: (node: HTMLElement | null) => void;
  /** Px, or null before the first measurement. */
  readonly height: number | null;
}

export function useFillHeight(gap = 0): FillHeight {
  const node = useRef<HTMLElement | null>(null);
  const [height, setHeight] = useState<number | null>(null);

  const measure = useCallback((): void => {
    const el = node.current;
    if (el === null || typeof window === "undefined") return;
    const top = el.getBoundingClientRect().top;
    const next = Math.round(window.innerHeight - top - bottomReserve() - gap);
    setHeight(next >= MIN_FILL_HEIGHT ? next : MIN_FILL_HEIGHT);
  }, [gap]);

  const ref = useCallback(
    (next: HTMLElement | null) => {
      node.current = next;
      if (next !== null) measure();
    },
    [measure],
  );

  useLayoutEffect(() => {
    measure();
    if (typeof window === "undefined") return;
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, [measure]);

  return { ref, height };
}
