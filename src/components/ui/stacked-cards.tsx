import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import {
  motion,
  useMotionValueEvent,
  useScroll,
  useTransform,
  useReducedMotion,
  type MotionValue,
} from "motion/react";
import { cn } from "@/lib/utils";

/**
 * A deck you deal through: cards you have passed pile against the top of the
 * screen, the ones still to come wait in a pile at the bottom, and the live card
 * sits in the middle on its own.
 *
 * **This replaces a version that read like the list view.** Every card pinned at
 * the same line a little below the top, receded a few pixels per card stacked on
 * it, and faded out once it was `depth` places back. The effect was real but
 * invisible: nothing accumulated anywhere you could see, so scrolling the stack
 * looked like scrolling a column of cards with extra steps. The point of a stack
 * is being able to see how much you have done and how much is left without
 * counting, and that only works if the two piles are on screen.
 *
 * Two things keep it honest:
 *
 * - **Pin points are measured, not assumed.** Cards vary in height — expand one
 *   and it grows — so dividing scroll progress evenly drifts out of step with
 *   the layout, which is what used to make the stack gather five cards and then
 *   dump all five at once. A zero-height marker rides in normal flow beside each
 *   card and is what gets measured.
 * - **The piles are capped but the counts are not.** Rendering forty cards into
 *   a pile forty deep would push most of them off screen and cost forty
 *   transforms a frame. Only `CAP` cards are drawn in each pile; the number
 *   above it says how many are really there.
 *
 * No Lenis, unlike the references this came from. They wrap themselves in
 * `<ReactLenis root>`, which replaces the page's native scrolling globally, and
 * this app already runs three independent scroll-driven systems.
 */

export type StackedCardsProps = {
  children: ReactNode[];
  /** Scroll distance allotted to each card, in vh. */
  vhPerCard?: number;
  /** Pixels each card in a pile is offset from the one in front of it. */
  peek?: number;
  /** How many cards are drawn in each pile before the rest are implied. */
  cap?: number;
  className?: string;
};

/** Where the top pile starts, and how much of a waiting card shows at the foot. */
const TOP_PAD = 84;
const BOTTOM_PEEK = 74;

function StackedCard({
  index,
  front,
  peek,
  cap,
  children,
}: {
  index: number;
  front: MotionValue<number>;
  peek: number;
  cap: number;
  children: ReactNode;
}) {
  /**
   * One transform string rather than separate y/scale/rotate motion values.
   *
   * The three are not independent here — where a card sits decides how much it
   * is shrunk and turned — and `translateY` needs `calc()` to mix the viewport
   * with the card's own height, which a numeric `y` cannot express.
   */
  const transform = useTransform(front, (f) => {
    const delta = index - f;

    // The live card, and the two either side of it mid-handover. Centred on the
    // viewport, upright, full size.
    if (delta > -0.5 && delta < 0.5) {
      // Eased so a card arriving from a pile lands rather than snaps.
      const t = Math.abs(delta) * 2;
      return `translateY(calc(50vh - 50% + ${delta * 26}px)) scale(${1 - t * 0.04}) rotate(${delta * 1.5}deg)`;
    }

    if (delta < 0) {
      // Passed. Stacks downward from the top edge, each one a little further in
      // and a little smaller, so the pile reads as depth rather than as a blur.
      const d = Math.min(-delta - 0.5, cap);
      const tilt = ((index % 2 === 0 ? 1 : -1) * Math.min(d, 3) * 0.7).toFixed(2);
      return `translateY(${TOP_PAD + d * peek}px) scale(${(1 - d * 0.035).toFixed(3)}) rotate(${tilt}deg)`;
    }

    // Still to come. Waits at the foot with only its top edge showing.
    const d = Math.min(delta - 0.5, cap);
    const tilt = ((index % 2 === 0 ? -1 : 1) * Math.min(d, 3) * 0.7).toFixed(2);
    return `translateY(calc(100vh - ${BOTTOM_PEEK + d * peek}px)) scale(${(1 - d * 0.035).toFixed(3)}) rotate(${tilt}deg)`;
  });

  /**
   * Pile cards dim steeply with depth, and that is doing real work.
   *
   * The card backgrounds are washes rather than solids, so at full opacity four
   * offset cards show four readable question titles through each other and the
   * pile reads as overlapping text rather than as a stack. Fading with depth
   * leaves the front of each pile legible and turns the rest into edges, which
   * is what a pile of cards actually looks like.
   */
  const opacity = useTransform(front, (f) => {
    const d = Math.abs(index - f);
    if (d < 0.5) return 1;
    return Math.max(0, 1 - (d - 0.5) * 0.3) * (d <= cap + 1 ? 1 : 0);
  });

  // Only the card you are actually on takes clicks. Without this the pile's
  // exposed slivers swallow every rating button on the live card.
  const pointerEvents = useTransform(front, (f) =>
    Math.abs(index - f) < 0.5 ? "auto" : "none",
  );

  /**
   * Depth order follows distance from the front, not DOM order.
   *
   * A fixed `1000 - index` looks right for the pile still to come and is exactly
   * wrong for the one behind you: it puts the card you passed first on top of
   * the one you passed a moment ago, so the top pile grows downwards out of its
   * own oldest card. Ordering by `|delta|` makes both piles recede away from the
   * live card, which is the one rule that describes them both.
   */
  const zIndex = useTransform(front, (f) => 1000 - Math.round(Math.abs(index - f) * 10));

  return (
    <motion.div
      style={{ transform, opacity, pointerEvents, zIndex }}
      className="absolute inset-x-0 top-0 origin-top will-change-transform"
    >
      {children}
    </motion.div>
  );
}

export function StackedCards({
  children,
  vhPerCard = 46,
  peek = 9,
  cap = 6,
  className,
}: StackedCardsProps) {
  const container = useRef<HTMLDivElement>(null);
  const markers = useRef<(HTMLDivElement | null)[]>([]);
  /** Document-space y of each card's pin point, plus the container's bottom. */
  const pins = useRef<number[]>([]);
  const reduce = useReducedMotion();
  const { scrollY } = useScroll();
  const total = children.length;

  const measure = useCallback(() => {
    const el = container.current;
    if (!el) return;
    const base = window.scrollY;
    const next = markers.current.map((m) => (m ? m.getBoundingClientRect().top + base : 0));
    next.push(el.getBoundingClientRect().bottom + base);
    pins.current = next;
  }, []);

  useEffect(() => {
    measure();
    window.addEventListener("resize", measure);
    const ro = new ResizeObserver(measure);
    ro.observe(document.documentElement);
    if (container.current) ro.observe(container.current);
    return () => {
      window.removeEventListener("resize", measure);
      ro.disconnect();
    };
  }, [measure, total]);

  /**
   * Continuous index of the card at the front: 3.4 means card 3 is live and
   * card 4 is 40% of the way in. Every card derives where it belongs by
   * subtracting its own index from this one value.
   */
  const front = useTransform(scrollY, (y) => {
    const p = pins.current;
    if (p.length < 2) return 0;
    const line = y + window.innerHeight * 0.5;
    if (line <= p[0]!) return 0;
    let lo = 0;
    let hi = p.length - 1;
    while (lo < hi - 1) {
      const mid = (lo + hi) >> 1;
      if (p[mid]! <= line) lo = mid;
      else hi = mid;
    }
    const span = p[lo + 1]! - p[lo]!;
    return lo + (span > 0 ? (line - p[lo]!) / span : 0);
  });

  // The counters are the part that says "accumulating". Mirrored into React
  // state rather than read during render, which a motion value cannot be.
  const [done, setDone] = useState(0);
  useMotionValueEvent(front, "change", (f) => {
    const next = Math.max(0, Math.min(total, Math.round(f)));
    setDone((prev) => (prev === next ? prev : next));
  });

  // Reduced motion gets a plain column; the stack is purely presentational.
  if (reduce) {
    return <div className={cn("flex flex-col gap-4", className)}>{children}</div>;
  }

  return (
    <div ref={container} className={cn("relative", className)}>
      {/*
        One sticky viewport-height layer holding every card.

        **First in the DOM, with its own height cancelled.** It has to come
        before the markers or it only starts sticking once you have scrolled past
        all of them, which is the whole track — the stack rendered as a blank
        screen. `-100vh` of bottom margin then pulls the markers back up over it,
        so the layer pins from the top of the deck while the track alone decides
        how tall the deck is.

        Sticky rather than fixed: a fixed layer would escape the deck and hang
        over the rest of the page, and this has to stop when the stack does.
      */}
      <div
        className="pointer-events-none sticky top-0 z-10 h-screen"
        style={{ marginBottom: "-100vh" }}
      >
        <div className="relative mx-auto h-full w-full max-w-3xl">
          {children.map((child, i) => (
            <StackedCard key={i} index={i} front={front} peek={peek} cap={cap}>
              {child}
            </StackedCard>
          ))}

          {/* What is in each pile. The whole reason for the rebuild: the stack
              should answer "how far in am I" without counting. */}
          {/* Down the left edge. Centred sat straight on the piles they count,
              and the right edge is where the feedback and notes buttons live. */}
          <PileCount className="top-5 left-2" value={done} label="done" show={done > 0} />
          <PileCount
            className="bottom-5 left-2"
            value={total - done}
            label="to go"
            show={total - done > 0}
          />
        </div>
      </div>

      {/* The scroll track. Each marker sits in normal flow and is what the pin
          points are measured from; the cards themselves live in the layer above,
          out of flow, so the track alone decides how far the stack scrolls. */}
      {children.map((_, i) => (
        <div
          key={`marker-${i}`}
          ref={(node) => {
            markers.current[i] = node;
          }}
          aria-hidden
          style={{ height: `${vhPerCard}vh` }}
        />
      ))}
    </div>
  );
}

function PileCount({
  value,
  label,
  show,
  className,
}: {
  value: number;
  label: string;
  show: boolean;
  className?: string;
}) {
  return (
    <div
      aria-hidden
      className={cn(
        "pointer-events-none absolute z-[2000] rounded-full bg-slate-900/75 px-2.5 py-1 font-mono text-[0.65rem] font-semibold text-white backdrop-blur-sm transition-opacity duration-300 dark:bg-stone-100/85 dark:text-stone-900",
        show ? "opacity-100" : "opacity-0",
        className,
      )}
    >
      {value} {label}
    </div>
  );
}

export default StackedCards;
