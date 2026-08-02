"use client";

import {
  Children,
  isValidElement,
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
} from "react";
import {
  animate,
  motion,
  useIsomorphicLayoutEffect,
  useMotionValue,
  useReducedMotion,
} from "motion/react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Drag/swipe carousel that snaps to whole slides.
 *
 * Two layout changes from the reference: the dots sit above the track and the
 * arrows below it, and neighbouring slides stay partly visible (`peek`) so they
 * can shrink and fade toward each edge as you move. Colours follow this app
 * rather than the reference's hardcoded blue and stone palette.
 */

const CELL = { type: "spring", stiffness: 520, damping: 34, mass: 0.45 } as const;
const CROSSFADE = { type: "spring", stiffness: 260, damping: 34, mass: 0.8 } as const;
const WALL = { type: "spring", stiffness: 700, damping: 30, mass: 0.5 } as const;
const WALL_IMPULSE = 900;
/** How many dots show either side of the active one. */
const DOT_WINDOW = 4;

const clamp = (n: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, n));

type DragInfo = { offset: { x: number; y: number }; velocity: { x: number; y: number } };

export type UseSnapCarouselOptions = {
  count: number;
  index?: number;
  defaultIndex?: number;
  onIndexChange?: (index: number) => void;
  gap?: number;
  momentum?: number;
  maxFlick?: number;
  disabled?: boolean;
};

export function useSnapCarousel({
  count,
  index: controlled,
  defaultIndex = 0,
  onIndexChange,
  gap = 12,
  momentum = 0.14,
  maxFlick = 1,
  disabled = false,
}: UseSnapCarouselOptions) {
  const total = Math.max(1, Math.floor(count));

  const [uncontrolled, setUncontrolled] = useState(() => clamp(defaultIndex, 0, total - 1));
  const [slideWidth, setSlideWidth] = useState(0);
  const [dragging, setDragging] = useState(false);

  const index = clamp(controlled ?? uncontrolled, 0, total - 1);
  const [target, setTarget] = useState(index);
  const step = slideWidth + gap;

  const viewportRef = useRef<HTMLDivElement>(null);
  const anim = useRef<{ stop: () => void } | null>(null);
  const desired = useRef<number | null>(null);
  const lastStep = useRef(0);

  // Refs mirror the live values so the callbacks below stay referentially stable
  // and do not rebuild the drag handlers on every render.
  const live = useRef(index);
  live.current = index;
  const metrics = useRef({ step, total, momentum, maxFlick });
  metrics.current = { step, total, momentum, maxFlick };
  const changed = useRef(onIndexChange);
  changed.current = onIndexChange;

  const x = useMotionValue(0);
  const reduced = useReducedMotion();

  const glide = useCallback(
    (to: number, velocity = 0) => {
      desired.current = to;
      anim.current?.stop();
      anim.current = animate(x, to, reduced ? { duration: 0 } : { ...CROSSFADE, velocity });
    },
    [x, reduced],
  );

  const goTo = useCallback(
    (next: number, velocity = 0) => {
      const shelf = metrics.current;
      const to = clamp(Math.round(next), 0, shelf.total - 1);
      setTarget(to);
      if (to !== live.current) {
        live.current = to;
        setUncontrolled(to);
        changed.current?.(to);
      }
      glide(-to * shelf.step, velocity);
    },
    [glide],
  );

  /** Rubber-band at the ends instead of allowing a dead drag. */
  const bounce = useCallback(
    (dir: 1 | -1) => {
      const shelf = metrics.current;
      const to = -live.current * shelf.step;
      desired.current = to;
      anim.current?.stop();
      anim.current = animate(
        x,
        to,
        reduced ? { duration: 0 } : { ...WALL, velocity: -dir * WALL_IMPULSE },
      );
    },
    [x, reduced],
  );

  const move = useCallback(
    (dir: 1 | -1) => {
      const to = live.current + dir;
      if (to < 0 || to > metrics.current.total - 1) bounce(dir);
      else goTo(to);
    },
    [bounce, goTo],
  );

  const next = useCallback(() => move(1), [move]);
  const prev = useCallback(() => move(-1), [move]);

  /** Which slide a flick should land on, capped so one gesture moves one slide. */
  const pick = useCallback(
    (velocity: number) => {
      const shelf = metrics.current;
      if (shelf.step === 0) return live.current;
      const at = -x.get() / shelf.step;
      const anchor = clamp(Math.round(at), 0, shelf.total - 1);
      const projected = at - (velocity * shelf.momentum) / shelf.step;
      return clamp(
        clamp(Math.round(projected), anchor - shelf.maxFlick, anchor + shelf.maxFlick),
        0,
        shelf.total - 1,
      );
    },
    [x],
  );

  useIsomorphicLayoutEffect(() => {
    const el = viewportRef.current;
    if (!el) return;
    const observer = new ResizeObserver((entries) => {
      const width = entries[0]?.contentRect.width ?? 0;
      setSlideWidth((current) => (Math.abs(current - width) < 0.5 ? current : width));
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  useIsomorphicLayoutEffect(() => {
    if (step === 0) return;
    const to = -index * step;

    // A resize should reposition instantly; animating it looks like a glitch.
    if (lastStep.current !== step) {
      lastStep.current = step;
      desired.current = to;
      anim.current?.stop();
      x.set(to);
      return;
    }
    if (dragging || desired.current === to) return;
    glide(to);
  }, [index, step, dragging, glide, x]);

  useEffect(() => () => anim.current?.stop(), []);

  const onDragStart = useCallback(() => {
    anim.current?.stop();
    setDragging(true);
    setTarget(live.current);
  }, []);

  const onDrag = useCallback(
    (_e: MouseEvent | TouchEvent | PointerEvent, info: DragInfo) => {
      const to = pick(info.velocity.x);
      setTarget((current) => (current === to ? current : to));
    },
    [pick],
  );

  const onDragEnd = useCallback(
    (_e: MouseEvent | TouchEvent | PointerEvent, info: DragInfo) => {
      setDragging(false);
      goTo(pick(info.velocity.x), info.velocity.x);
    },
    [goTo, pick],
  );

  const onKeyDown = useCallback(
    (event: React.KeyboardEvent) => {
      const keys: Record<string, () => void> = {
        ArrowRight: next,
        ArrowLeft: prev,
        Home: () => goTo(0),
        End: () => goTo(metrics.current.total - 1),
      };
      const action = keys[event.key];
      if (!action) return;
      event.preventDefault();
      action();
    },
    [goTo, next, prev],
  );

  /** The track is moved by transform, so any real scroll is drift to undo. */
  const onScroll = useCallback((event: React.UIEvent<HTMLElement>) => {
    event.currentTarget.scrollLeft = 0;
    event.currentTarget.scrollTop = 0;
  }, []);

  return {
    index,
    count: total,
    target,
    shown: dragging ? target : index,
    dragging,
    slideWidth,
    step,
    x,
    goTo,
    next,
    prev,
    viewportRef,
    viewportProps: {
      tabIndex: 0,
      role: "group" as const,
      "aria-roledescription": "carousel",
      onKeyDown,
      onScroll,
    },
    trackProps: {
      drag: (disabled || total < 2 ? false : "x") as false | "x",
      dragDirectionLock: true,
      dragMomentum: false,
      dragElastic: 0.14,
      dragConstraints: { left: -(total - 1) * step, right: 0 },
      onDragStart,
      onDrag,
      onDragEnd,
      style: { x, gap: `${gap}px`, touchAction: "pan-y" as const },
    },
  };
}

export type SnapCarouselProps = {
  children: React.ReactNode;
  label: string;
  index?: number;
  defaultIndex?: number;
  onIndexChange?: (index: number) => void;
  gap?: number;
  /** Sliver of the neighbouring slides left visible at each edge. */
  peek?: number;
  momentum?: number;
  maxFlick?: number;
  className?: string;
};

export function SnapCarousel({
  children,
  label,
  index,
  defaultIndex = 0,
  onIndexChange,
  gap = 16,
  peek = 40,
  momentum = 0.14,
  maxFlick = 1,
  className = "",
}: SnapCarouselProps) {
  const slides = Children.toArray(children);
  const hintId = useId();
  const reduced = useReducedMotion();

  const car = useSnapCarousel({
    count: slides.length,
    index,
    defaultIndex,
    onIndexChange,
    gap,
    momentum,
    maxFlick,
  });

  const arrow = cn(
    "grid size-9 place-items-center rounded-full cursor-pointer",
    "border border-slate-200 bg-white text-slate-600 shadow-sm",
    "dark:border-stone-800 dark:bg-stone-900 dark:text-stone-300",
    "outline-none transition-colors hover:text-slate-900 dark:hover:text-white",
    "focus-visible:ring-2 focus-visible:ring-indigo-400 disabled:opacity-40",
  );

  const slideKey = (slide: unknown, i: number) =>
    isValidElement(slide) && slide.key ? slide.key : i;

  return (
    <div className={cn("w-full", className)}>
      {/* Dots on top, windowed around the current slide. Rendering one per
          question would be a 700px strip at 44 questions, so only the nearby
          ones appear and they shrink and fade toward each end: the ones you have
          passed dissolve on the left, the ones ahead on the right. */}
      <div className="mb-3 flex h-4 items-center justify-center gap-1.5">
        {slides.map((slide, i) => {
          const away = Math.abs(i - car.shown);
          if (away > DOT_WINDOW) return null;
          const t = away / DOT_WINDOW; // 0 at the active dot, 1 at the edge
          return (
            <button
              key={slideKey(slide, i)}
              type="button"
              onClick={() => car.goTo(i)}
              aria-label={`Go to question ${i + 1}`}
              aria-current={i === car.index ? "true" : undefined}
              className="grid h-4 w-3 place-items-center rounded cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-indigo-400"
            >
              <motion.span
                initial={false}
                animate={{ scale: 1 - t * 0.6, opacity: 1 - t * 0.75 }}
                transition={reduced ? { duration: 0 } : CELL}
                className="block h-2 w-2 rounded-full bg-slate-700 dark:bg-stone-200"
              />
            </button>
          );
        })}
      </div>

      <div
        ref={car.viewportRef}
        aria-label={label}
        aria-describedby={hintId}
        style={{
          paddingLeft: peek,
          paddingRight: peek,
          // Softens both edges so the peeking neighbours dissolve rather than
          // being cut off by the viewport.
          WebkitMaskImage: `linear-gradient(to right, transparent 0, black ${peek}px, black calc(100% - ${peek}px), transparent 100%)`,
          maskImage: `linear-gradient(to right, transparent 0, black ${peek}px, black calc(100% - ${peek}px), transparent 100%)`,
        }}
        className="relative overflow-hidden rounded-2xl py-1 outline-none focus-visible:ring-2 focus-visible:ring-indigo-400"
        {...car.viewportProps}
      >
        <motion.div
          {...car.trackProps}
          className={cn("flex items-stretch", car.dragging ? "cursor-grabbing" : "cursor-grab")}
        >
          {slides.map((slide, i) => {
            // Distance from the active slide drives the shrink and fade, so
            // whichever side you move away from recedes.
            const away = Math.min(2, Math.abs(i - car.shown));
            return (
              <motion.div
                key={slideKey(slide, i)}
                role="group"
                aria-roledescription="slide"
                aria-label={`${i + 1} of ${slides.length}`}
                initial={false}
                animate={{
                  scale: away === 0 ? 1 : away === 1 ? 0.92 : 0.86,
                  opacity: away === 0 ? 1 : away === 1 ? 0.45 : 0.2,
                }}
                transition={reduced ? { duration: 0 } : CROSSFADE}
                className="w-full shrink-0 select-none"
              >
                {slide}
              </motion.div>
            );
          })}
        </motion.div>
      </div>

      {/* Arrows below. */}
      <div className="mt-4 flex items-center justify-center gap-3">
        <button
          type="button"
          onClick={car.prev}
          aria-label="Previous question"
          disabled={car.index === 0}
          className={arrow}
        >
          <ChevronLeft className="h-4 w-4" />
        </button>
        <span className="font-mono text-sm text-slate-500 dark:text-stone-400 tabular-nums">
          {car.index + 1} / {slides.length}
        </span>
        <button
          type="button"
          onClick={car.next}
          aria-label="Next question"
          disabled={car.index === slides.length - 1}
          className={arrow}
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>

      <span id={hintId} className="sr-only">
        Drag or swipe to move between {slides.length} questions. Left and right arrow keys also work.
      </span>
      <span aria-live="polite" aria-atomic className="sr-only">
        Question {car.index + 1} of {slides.length}
      </span>
    </div>
  );
}

export default SnapCarousel;
