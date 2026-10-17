/**
 * Zoom and pan for the periodic table: scroll wheel and trackpad pinch zoom
 * around the pointer, two finger pinch on touch, one finger or mouse drag to
 * pan, sideways trackpad scroll to pan, and buttons for plus, minus and fit.
 *
 * TWO SCALES MATTER.
 *  - `fit`: the whole table, every tile, inside the viewport. Bound by width
 *    AND by the viewport's CSS max-height (the tool sheet sets one), so the
 *    actinide row can never be cut off. You cannot zoom out past it.
 *  - `rest`: where the table opens. On a wide screen it is the same as fit.
 *    On a phone, fit would make 18px tiles with 6px symbols, which nobody can
 *    read, so the table opens at READABLE_SCALE (48px tiles, the minimum tap
 *    target) and you drag sideways for the rest, the way ptable does on a
 *    phone. FIT is there as a button for the whole-table thumbnail.
 * The viewport's height is set here to the table's height at `rest` (capped
 * by max-height), once per width, so zooming never moves anything below it.
 *
 * WHY THE TRANSFORM IS WRITTEN STRAIGHT TO THE DOM. A drag fires a pointermove
 * per frame. Holding the view in React state would re-render 118 element tiles
 * every frame; holding it in a ref and writing `style.transform` touches one
 * property and no tiles. The tiles themselves are ordinary React.
 *
 * NO will-change ON THE TABLE. It makes Chrome rasterise the table once at the
 * opening scale and stretch that bitmap when you zoom, so zoomed text is
 * blurry, which defeats the point of zooming in to read.
 *
 * TAP VERSUS DRAG. A tile is a button. A drag that starts on a tile must not
 * select it when the finger lifts, so once a pointer has moved more than
 * DRAG_SLOP pixels the gesture is a drag and the click that follows is
 * swallowed (`onClickCapture`). Pointer capture is taken only then, because
 * capturing on pointerdown would retarget the click away from the tile.
 */

import { useCallback, useEffect, useLayoutEffect, useRef, useState, type MouseEvent, type RefObject } from "react";

/** 64px tiles at 0.75 are 48px: the tap target floor, with a 22px symbol. */
const READABLE_SCALE = 0.75;
/** Below this the tiles drop name and mass and enlarge number and symbol (periodic.css, data-tier). */
const FULL_TIER_SCALE = 0.875;
const MAX_ZOOM_SCALE = 3;
const DRAG_SLOP = 6;
const BUTTON_STEP = 1.5;
const GLIDE_MS = 320;

interface View {
  x: number;
  y: number;
  scale: number;
  fit: number;
}

export interface ZoomPan {
  readonly zoomIn: () => void;
  readonly zoomOut: () => void;
  /** Zoom out to the whole table. */
  readonly fit: () => void;
  /** True when zoomed all the way out, so the minus button can say it does nothing. */
  readonly atFit: boolean;
  /** Bring a box of the table (in the table's own pixels) to the middle of the view, if it is not already in view. */
  readonly reveal: (box: { left: number; top: number; width: number; height: number }, glide: boolean) => void;
  /** Spread onto the viewport element: swallows the click that ends a drag. */
  readonly onClickCapture: (event: MouseEvent) => void;
}

function cssMaxHeight(element: HTMLElement): number {
  const value = parseFloat(getComputedStyle(element).maxHeight);
  return Number.isFinite(value) ? value : Number.POSITIVE_INFINITY;
}

export function useZoomPan(viewportRef: RefObject<HTMLDivElement | null>, contentRef: RefObject<HTMLDivElement | null>): ZoomPan {
  const view = useRef<View>({ x: 0, y: 0, scale: 1, fit: 1 });
  const dragged = useRef(false);
  const [atFit, setAtFit] = useState(false);
  const atFitRef = useRef(false);

  /** Keep the table on screen, then write the transform. */
  const apply = useCallback(() => {
    const viewport = viewportRef.current;
    const content = contentRef.current;
    if (viewport === null || content === null) return;
    const v = view.current;
    v.scale = Math.min(Math.max(v.scale, v.fit), MAX_ZOOM_SCALE);
    const width = content.offsetWidth * v.scale;
    const height = content.offsetHeight * v.scale;
    const roomX = viewport.clientWidth;
    const roomY = viewport.clientHeight;
    const clamp = (offset: number, size: number, room: number) =>
      size <= room ? (room - size) / 2 : Math.min(0, Math.max(room - size, offset));
    v.x = clamp(v.x, width, roomX);
    v.y = clamp(v.y, height, roomY);
    content.style.transform = `translate(${v.x}px, ${v.y}px) scale(${v.scale})`;

    // A vertical swipe scrolls the page unless the table itself is taller than its window.
    viewport.style.touchAction = height > roomY + 1 ? "none" : "pan-y";
    const pannable = width > roomX + 1 || height > roomY + 1;
    viewport.dataset.pannable = String(pannable);
    viewport.dataset.moreLeft = String(v.x < -1);
    viewport.dataset.moreRight = String(v.x + width > roomX + 1);
    const tier = v.scale >= FULL_TIER_SCALE ? "full" : "compact";
    if (content.dataset.tier !== tier) content.dataset.tier = tier;

    const nowAtFit = v.scale <= v.fit * 1.001;
    if (nowAtFit !== atFitRef.current) {
      atFitRef.current = nowAtFit;
      setAtFit(nowAtFit);
    }
  }, [viewportRef, contentRef]);

  /** Zoom by `factor`, keeping the point (px, py) of the viewport still. */
  const zoomAt = useCallback(
    (px: number, py: number, factor: number) => {
      const v = view.current;
      const next = Math.min(Math.max(v.scale * factor, v.fit), MAX_ZOOM_SCALE);
      v.x = px - (px - v.x) * (next / v.scale);
      v.y = py - (py - v.y) * (next / v.scale);
      v.scale = next;
      apply();
    },
    [apply],
  );

  /** A short eased move for button-driven jumps. Gestures never glide: they follow the finger. */
  const glide = useCallback(() => {
    const content = contentRef.current;
    if (content === null) return;
    content.classList.add("pt-table--glide");
    window.setTimeout(() => content.classList.remove("pt-table--glide"), GLIDE_MS);
  }, [contentRef]);

  /*
   * Size the viewport and pick the opening scale, on mount and whenever the
   * viewport changes width (rotation, sheet resize). useLayoutEffect, not
   * useEffect: it runs before the browser paints, so the first frame already
   * has the right height and scale and nothing jumps.
   */
  useLayoutEffect(() => {
    const viewport = viewportRef.current;
    const content = contentRef.current;
    if (viewport === null || content === null) return;
    let lastKey = "";
    const refit = () => {
      const roomX = viewport.clientWidth;
      const maxH = cssMaxHeight(viewport);
      const key = `${roomX}x${maxH}`;
      if (key === lastKey) return; // our own height change re-fires the observer
      lastKey = key;
      const v = view.current;
      const naturalW = content.offsetWidth;
      const naturalH = content.offsetHeight;
      const widthFit = roomX / naturalW;
      const rest = Math.max(Math.min(widthFit, maxH / naturalH), Math.min(READABLE_SCALE, maxH / naturalH));
      viewport.style.height = `${Math.round(Math.min(naturalH * rest, maxH))}px`;
      v.fit = Math.min(widthFit, viewport.clientHeight / naturalH);
      v.scale = rest;
      v.x = 0;
      v.y = 0;
      apply();
    };
    refit();
    const observer = new ResizeObserver(refit);
    observer.observe(viewport);
    // A taller or shorter window changes the sheet's max-height without changing the viewport's width.
    window.addEventListener("resize", refit);
    return () => {
      observer.disconnect();
      window.removeEventListener("resize", refit);
    };
  }, [viewportRef, contentRef, apply]);

  // Wheel and pointer listeners. Wheel is added by hand because React's
  // onWheel is passive and could not stop the page from scrolling.
  useEffect(() => {
    const viewport = viewportRef.current;
    if (viewport === null) return;
    const pointers = new Map<number, { x: number; y: number }>();
    let start: { x: number; y: number } | null = null;

    const local = (event: { clientX: number; clientY: number }) => {
      const box = viewport.getBoundingClientRect();
      return { x: event.clientX - box.left, y: event.clientY - box.top };
    };

    const onWheel = (event: WheelEvent) => {
      const v = view.current;
      // A sideways trackpad scroll pans the table when there is more of it to the side.
      if (!event.ctrlKey && Math.abs(event.deltaX) > Math.abs(event.deltaY)) {
        if (viewport.dataset.pannable !== "true") return;
        event.preventDefault();
        v.x -= event.deltaX;
        apply();
        return;
      }
      // Scrolling down at fit cannot zoom out any further, so let it scroll the
      // page (or the tool sheet) instead of swallowing it.
      if (!event.ctrlKey && event.deltaY > 0 && v.scale <= v.fit * 1.001) return;
      event.preventDefault();
      const point = local(event);
      // A trackpad pinch arrives as a wheel event with ctrlKey and small deltas.
      const speed = event.ctrlKey ? 0.01 : 0.001;
      zoomAt(point.x, point.y, Math.exp(-event.deltaY * speed));
    };

    const onDown = (event: PointerEvent) => {
      if (event.pointerType === "mouse" && event.button !== 0) return;
      pointers.set(event.pointerId, local(event));
      if (pointers.size === 1) {
        start = local(event);
        dragged.current = false;
      } else {
        dragged.current = true; // a second finger is always a gesture, never a tap
      }
    };

    const onMove = (event: PointerEvent) => {
      const previous = pointers.get(event.pointerId);
      if (previous === undefined) return;
      const point = local(event);
      const v = view.current;

      if (pointers.size === 1 && start !== null) {
        if (!dragged.current && Math.hypot(point.x - start.x, point.y - start.y) > DRAG_SLOP) {
          dragged.current = true;
          viewport.setPointerCapture(event.pointerId);
        }
        if (dragged.current) {
          v.x += point.x - previous.x;
          v.y += point.y - previous.y;
          apply();
        }
      } else if (pointers.size === 2) {
        const other = [...pointers.entries()].find(([id]) => id !== event.pointerId)?.[1];
        if (other !== undefined) {
          const before = Math.hypot(previous.x - other.x, previous.y - other.y);
          const after = Math.hypot(point.x - other.x, point.y - other.y);
          // Pan by half the finger's travel (the midpoint moves half as far), then zoom about the midpoint.
          v.x += (point.x - previous.x) / 2;
          v.y += (point.y - previous.y) / 2;
          if (before > 0) zoomAt((point.x + other.x) / 2, (point.y + other.y) / 2, after / before);
          else apply();
        }
      }
      pointers.set(event.pointerId, point);
    };

    const onUp = (event: PointerEvent) => {
      pointers.delete(event.pointerId);
      if (pointers.size === 0) start = null;
    };

    viewport.addEventListener("wheel", onWheel, { passive: false });
    viewport.addEventListener("pointerdown", onDown);
    viewport.addEventListener("pointermove", onMove);
    viewport.addEventListener("pointerup", onUp);
    viewport.addEventListener("pointercancel", onUp);
    return () => {
      viewport.removeEventListener("wheel", onWheel);
      viewport.removeEventListener("pointerdown", onDown);
      viewport.removeEventListener("pointermove", onMove);
      viewport.removeEventListener("pointerup", onUp);
      viewport.removeEventListener("pointercancel", onUp);
    };
  }, [viewportRef, zoomAt, apply]);

  const zoomAtCentre = (factor: number) => {
    const viewport = viewportRef.current;
    if (viewport === null) return;
    glide();
    zoomAt(viewport.clientWidth / 2, viewport.clientHeight / 2, factor);
  };

  return {
    zoomIn: () => zoomAtCentre(BUTTON_STEP),
    zoomOut: () => zoomAtCentre(1 / BUTTON_STEP),
    fit: () => {
      glide();
      view.current.scale = view.current.fit;
      apply();
    },
    atFit,
    reveal: (box, withGlide) => {
      const viewport = viewportRef.current;
      if (viewport === null) return;
      const v = view.current;
      const left = v.x + box.left * v.scale;
      const top = v.y + box.top * v.scale;
      const right = left + box.width * v.scale;
      const bottom = top + box.height * v.scale;
      const inView = left >= 0 && top >= 0 && right <= viewport.clientWidth && bottom <= viewport.clientHeight;
      if (inView) return;
      v.x = viewport.clientWidth / 2 - (box.left + box.width / 2) * v.scale;
      v.y = viewport.clientHeight / 2 - (box.top + box.height / 2) * v.scale;
      if (withGlide) glide();
      apply();
    },
    onClickCapture: (event) => {
      if (!dragged.current) return;
      event.preventDefault();
      event.stopPropagation();
      dragged.current = false;
    },
  };
}
