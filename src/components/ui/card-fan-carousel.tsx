"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import gsap from "gsap";

export interface CardItem {
  imgUrl: string;
  alt?: string;
  linkUrl?: string;
  /** Caption printed over the bottom of the card. */
  title?: string;
  subtitle?: string;
}

interface SocialCardsProps {
  cards: CardItem[];
  /** Index of the highlighted card. Makes the component controlled. */
  activeIndex?: number;
  onActiveIndexChange?: (index: number) => void;
  /** Scales how far the fan spreads. Below 1 keeps it inside a narrow column. */
  spread?: number;
  /**
   * Milliseconds between automatic advances. Pauses while hovered and switches
   * off for good once the reader picks a card, a dot, or an arrow.
   */
  autoPlayInterval?: number;
}

const MAX_VISIBLE = 7;
const HALF = 3;

const FAN_POSITIONS = [
  { rot: -21, scale: 0.7756, x: -30, y: 7.3, zIndex: 1 },
  { rot: -14, scale: 0.8498, x: -22, y: 4.0, zIndex: 2 },
  { rot: -7,  scale: 0.9346, x: -11, y: 1.3, zIndex: 3 },
  { rot: 0,   scale: 1.0,    x: 0,   y: 0.0, zIndex: 10 },
  { rot: 7,   scale: 0.9346, x: 11,  y: 1.3, zIndex: 3 },
  { rot: 14,  scale: 0.8498, x: 22,  y: 4.0, zIndex: 2 },
  { rot: 21,  scale: 0.7756, x: 30,  y: 7.3, zIndex: 1 },
];

function getResponsiveMultiplier(width: number) {
  if (width < 480) return 0.28;
  if (width < 640) return 0.38;
  if (width < 768) return 0.5;
  if (width < 1024) return 0.75;
  return 1.0;
}

/**
 * Returns a multiplier (0..1] that scales y-offsets and entry animation
 * distances when the viewport is too short for the ideal layout height.
 */
function getHeightMultiplier(width: number) {
  // Ideal layout heights (in px at 16px root) matching the CSS breakpoints
  let idealPx: number;
  if (width < 480) idealPx = 22 * 16;       // 352px
  else if (width < 640) idealPx = 26 * 16;  // 416px
  else if (width < 768) idealPx = 28 * 16;  // 448px
  else if (width < 1024) idealPx = 34 * 16; // 544px
  else idealPx = 38 * 16;                    // 608px

  const available = window.innerHeight * 0.7; // 70vh budget
  if (available >= idealPx) return 1;
  return available / idealPx;
}

function getSlotConfig(totalCards: number, slot: number) {
  if (totalCards >= MAX_VISIBLE) return FAN_POSITIONS[slot];
  // Centre on the midpoint between slots, so an even number of cards fans out
  // symmetrically instead of leaning left.
  const center = (totalCards - 1) / 2;
  const distance = center > 0 ? (slot - center) / center : 0;
  const absDistance = Math.abs(distance);
  return {
    rot: distance * 21,
    scale: 1.0 - 0.2244 * absDistance * absDistance,
    x: distance * 30,
    y: absDistance * absDistance * 7.3,
    zIndex: 10 - Math.round(Math.abs(slot - center)),
  };
}

// The original leaned on backdrop-blur plus a wide soft drop shadow, which read
// as a dark rounded square hanging behind each circle in both themes. This
// matches the plain bordered buttons used elsewhere in the app instead.
const ARROW_CLASSES =
  "relative flex items-center justify-center rounded-full border border-slate-200 dark:border-stone-800 bg-white dark:bg-stone-900 text-slate-600 dark:text-stone-300 cursor-pointer shrink-0 z-30 outline-none shadow-sm hover:border-slate-300 dark:hover:border-stone-700 hover:text-slate-900 dark:hover:text-white active:scale-95 transition-[color,border-color,transform] duration-200 focus-visible:ring-2 focus-visible:ring-indigo-400";

export default function SocialCards({
  cards,
  activeIndex,
  onActiveIndexChange,
  spread = 1,
  autoPlayInterval = 0,
}: SocialCardsProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const isAnimating = useRef(false);
  const hasEntered = useRef(false);
  const directionRef = useRef<"left" | "right" | null>(null);
  const prevVisible = useRef<Set<number>>(new Set());

  const totalCards = cards.length;
  const needsPagination = totalCards > MAX_VISIBLE;
  const [centerIndex, setCenterIndex] = useState(needsPagination ? HALF : totalCards >> 1);
  const [uncontrolledActive, setUncontrolledActive] = useState(centerIndex);
  const activeIdx = activeIndex ?? uncontrolledActive;
  // Autoplay runs until the reader takes over, then stays off for the session.
  const [autoStopped, setAutoStopped] = useState(false);
  const [hovering, setHovering] = useState(false);

  const applySelect = useCallback((index: number, byUser: boolean) => {
    if (byUser) setAutoStopped(true);
    setUncontrolledActive(index);
    onActiveIndexChange?.(index);
  }, [onActiveIndexChange]);

  const select = useCallback((index: number) => applySelect(index, true), [applySelect]);

  // Keyed off totalCards rather than the `cards` array: callers routinely build
  // that array inline, so depending on it re-ran the animation effect on every
  // parent render and could strand `isAnimating` mid-flight.
  const getVisibleMap = useCallback((center: number) => {
    const map = new Map<number, number>();
    if (!needsPagination) {
      for (let i = 0; i < totalCards; i++) map.set(i, i);
      return map;
    }
    for (let slot = 0; slot < MAX_VISIBLE; slot++) {
      map.set(((center + slot - HALF) % totalCards + totalCards) % totalCards, slot);
    }
    return map;
  }, [totalCards, needsPagination]);

  const cycle = useCallback((direction: "left" | "right", byUser = true) => {
    if (totalCards < 2) return;
    const step = (i: number) =>
      direction === "right" ? (i + 1) % totalCards : (i - 1 + totalCards) % totalCards;

    // When every card already fits on screen there is nothing to page through,
    // so the arrows just move the highlight along the fan. No cards enter or
    // leave, so this path must not be gated on the paging animation lock.
    if (!needsPagination) {
      applySelect(step(activeIdx), byUser);
      return;
    }
    if (isAnimating.current) return;
    isAnimating.current = true;
    directionRef.current = direction;
    const next = step(centerIndex);
    setCenterIndex(next);
    applySelect(next, byUser);
  }, [totalCards, needsPagination, activeIdx, centerIndex, applySelect]);

  useEffect(() => {
    if (!autoPlayInterval || autoStopped || hovering || totalCards < 2) return;
    const id = setInterval(() => cycle("right", false), autoPlayInterval);
    return () => clearInterval(id);
  }, [autoPlayInterval, autoStopped, hovering, totalCards, cycle]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container || !totalCards) return;

    const cardElements = Array.from(container.querySelectorAll<HTMLElement>(".fan-card"));
    if (!cardElements.length) return;

    const visibleMap = getVisibleMap(centerIndex);
    const previouslyVisible = prevVisible.current;
    const direction = directionRef.current;
    const isFirstMount = !hasEntered.current;
    const multiplier = getResponsiveMultiplier(window.innerWidth) * spread;
    const hMult = getHeightMultiplier(window.innerWidth) * spread;
    const slotCount = needsPagination ? MAX_VISIBLE : totalCards;
    const config = (slot: number) => getSlotConfig(slotCount, slot);

    if (isFirstMount) isAnimating.current = true;

    // Assigned once updateHoverLayout exists; runs after cards finish flying in
    // so the settle animation cannot overwrite their opacity tween.
    let settle: (() => void) | null = null;

    let completedCount = 0;
    const visibleCount = visibleMap.size;
    const onCardDone = () => {
      if (++completedCount >= visibleCount) {
        isAnimating.current = false;
        if (isFirstMount) hasEntered.current = true;
        settle?.();
      }
    };

    cardElements.forEach((card, cardIndex) => {
      const slot = visibleMap.get(cardIndex);
      const wasVisible = previouslyVisible.has(cardIndex);

      if (slot !== undefined) {
        const { x, y, rot, scale, zIndex } = config(slot);
        const target = {
          x: `${x * multiplier}rem`,
          y: `${y * hMult}rem`,
          rotation: rot,
          scale,
          opacity: 1,
          zIndex,
        };

        if (isFirstMount) {
          gsap.set(card, { x: 0, y: `${12 * hMult}rem`, rotation: 0, scale: 0.5, opacity: 0 });
          gsap.to(card, { ...target, duration: 1.2, ease: "elastic.out(1.05,.78)", delay: 0.2 + slot * 0.06, onComplete: onCardDone });
        } else if (!wasVisible) {
          const enterX = direction === "right" ? 40 : -40;
          gsap.set(card, { x: `${enterX}rem`, y: `${y * hMult}rem`, rotation: direction === "right" ? 30 : -30, scale: 0.5, opacity: 0 });
          gsap.to(card, { ...target, duration: 0.6, ease: "power2.out", onComplete: onCardDone });
        } else {
          gsap.to(card, { ...target, duration: 0.5, ease: "power2.out", onComplete: onCardDone });
        }
      } else if (wasVisible) {
        const exitX = direction === "right" ? -40 : 40;
        gsap.to(card, { x: `${exitX}rem`, opacity: 0, scale: 0.5, rotation: direction === "right" ? -30 : 30, duration: 0.4, ease: "power2.in", zIndex: 0 });
      } else if (isFirstMount) {
        gsap.set(card, { opacity: 0, scale: 0.3, x: 0, y: 0, zIndex: 0 });
      }
    });

    prevVisible.current = new Set(visibleMap.keys());

    // Hover interactions
    const visibleEntries: { el: HTMLElement; slot: number }[] = [];
    cardElements.forEach((el, i) => {
      const slot = visibleMap.get(i);
      if (slot !== undefined) visibleEntries.push({ el, slot });
    });
    visibleEntries.sort((a, b) => a.slot - b.slot);

    // Slot the fan settles on when nothing is hovered: the selected card, so the
    // fan always shows which testimonial is being quoted.
    const restingSlot = visibleMap.get(activeIdx) ?? null;
    let activeSlot: number | null = restingSlot;
    let hovering = false;
    let leaveTimer: ReturnType<typeof setTimeout> | null = null;
    const centerSlot = (visibleEntries.length - 1) / 2;

    // `push` spreads the neighbouring cards away from the focused one. That reads
    // well as a transient hover, but leaves gaps if held, so the resting
    // highlight passes push=false and only lifts the selected card.
    const updateHoverLayout = (hoveredSlot: number | null, push = true) => {
      const mult = getResponsiveMultiplier(window.innerWidth) * spread;
      const hM = getHeightMultiplier(window.innerWidth) * spread;

      visibleEntries.forEach(({ el, slot }) => {
        const base = config(slot);
        let targetX = base.x * mult;
        let targetY = base.y * hM;
        let targetRot = base.rot;
        let targetScale = base.scale;
        let delay = 0;

        if (hoveredSlot !== null) {
          const distance = Math.abs(slot - hoveredSlot);
          delay = distance * 0.02;

          if (slot === hoveredSlot) {
            targetY -= 2.5 * hM;
            targetScale *= 1.08;
          } else if (push) {
            const normalized = centerSlot > 0 ? (slot - centerSlot) / centerSlot : 0;
            const pushStrength = 8 * (1 - Math.abs(normalized)) * (1 + 0.2 * Math.max(0, 3 - distance));

            if (slot < hoveredSlot) {
              targetX -= pushStrength * mult;
              targetRot -= 3 / (distance + 1);
            } else {
              targetX += pushStrength * mult;
              targetRot += 3 / (distance + 1);
            }

            if (slot === visibleEntries.length - 1 && hoveredSlot < centerSlot) targetY -= 1 * hM;
            if (slot === 0 && hoveredSlot > centerSlot) targetY -= 1 * hM;
          }
        } else {
          delay = Math.abs(slot - centerSlot) * 0.02;
        }

        gsap.to(el, {
          x: `${targetX}rem`, y: `${targetY}rem`, rotation: targetRot, scale: targetScale,
          duration: 0.5, delay, ease: "elastic.out(1,.75)", overwrite: "auto",
        });
        gsap.set(el, { zIndex: base.zIndex });
      });
    };

    // Cards flying in or out own their opacity tween until they land, so defer
    // the resting layout to onCardDone in that case; otherwise apply it now.
    const cardsMoving =
      isFirstMount ||
      cardElements.some((_, i) => visibleMap.has(i) !== previouslyVisible.has(i));
    if (cardsMoving) settle = () => updateHoverLayout(restingSlot, false);
    else updateHoverLayout(restingSlot, false);

    const enterHandlers = visibleEntries.map(({ el, slot }) => {
      const handler = () => {
        if (isAnimating.current) return;
        if (leaveTimer) { clearTimeout(leaveTimer); leaveTimer = null; }
        if (activeSlot !== slot || !hovering) {
          activeSlot = slot;
          hovering = true;
          updateHoverLayout(slot);
        }
      };
      el.addEventListener("mouseenter", handler);
      return { el, handler };
    });

    const onMouseLeave = () => {
      if (isAnimating.current) return;
      if (leaveTimer) clearTimeout(leaveTimer);
      leaveTimer = setTimeout(() => {
        hovering = false;
        activeSlot = restingSlot;
        updateHoverLayout(restingSlot, false);
      }, 50);
    };
    container.addEventListener("mouseleave", onMouseLeave);

    const onResize = () => { if (!isAnimating.current) updateHoverLayout(activeSlot, hovering); };
    window.addEventListener("resize", onResize);

    return () => {
      enterHandlers.forEach(({ el, handler }) => el.removeEventListener("mouseenter", handler));
      container.removeEventListener("mouseleave", onMouseLeave);
      window.removeEventListener("resize", onResize);
      if (leaveTimer) clearTimeout(leaveTimer);
    };
  }, [centerIndex, totalCards, getVisibleMap, needsPagination, activeIdx, spread]);

  if (!totalCards) return null;

  const chevron = (direction: "left" | "right") => (
    <svg className="relative z-[2] w-4 h-4 md:w-5 md:h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points={direction === "left" ? "15 18 9 12 15 6" : "9 18 15 12 9 6"} />
    </svg>
  );

  return (
    <section
      className="flex flex-col items-center w-full py-4 lg:py-8 px-4 md:px-8 relative z-0"
      onMouseEnter={() => setHovering(true)}
      onMouseLeave={() => setHovering(false)}
    >
      <div className="flex items-center justify-center w-full max-w-[90rem]">
        <div ref={containerRef} className="fan-layout flex relative justify-center items-center w-full max-w-[80rem]">
          {cards.map((card, index) => {
            const image = (
              <div className="relative w-full h-full overflow-hidden">
                <img src={card.imgUrl} loading="lazy" alt={card.alt || `Card ${index}`} className="absolute inset-0 w-full h-full object-cover z-10" />
                {(card.title || card.subtitle) && (
                  <div className="absolute inset-x-0 bottom-0 z-20 bg-gradient-to-t from-black/70 via-black/35 to-transparent px-2 pt-5 pb-1.5 text-center">
                    {card.title && (
                      <p className="text-white text-[0.6rem] md:text-[0.68rem] font-bold leading-tight truncate">
                        {card.title}
                      </p>
                    )}
                    {card.subtitle && (
                      <p className="text-white/70 text-[0.5rem] md:text-[0.55rem] font-mono leading-tight truncate">
                        {card.subtitle}
                      </p>
                    )}
                  </div>
                )}
                {index === activeIdx && (
                  <span className="absolute inset-0 z-30 rounded-[inherit] ring-2 ring-inset ring-white/70" />
                )}
              </div>
            );
            return card.linkUrl ? (
              <a key={index} href={card.linkUrl} target={card.linkUrl.startsWith("http") ? "_blank" : "_self"} rel="noopener noreferrer" className="fan-card block cursor-pointer" onClick={() => select(index)}>{image}</a>
            ) : (
              <div
                key={index}
                className="fan-card cursor-pointer"
                role="button"
                tabIndex={0}
                aria-label={card.alt || `Card ${index + 1}`}
                aria-current={index === activeIdx}
                onClick={() => select(index)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    select(index);
                  }
                }}
              >
                {image}
              </div>
            );
          })}
        </div>
      </div>

      {totalCards > 1 && (
        <div className="flex items-center justify-center gap-4 mt-4 md:mt-6 z-30">
          <button className={`${ARROW_CLASSES} w-10 h-10 md:w-12 md:h-12`} onClick={() => cycle("left")} aria-label="Previous">
            {chevron("left")}
          </button>
          <div className="flex items-center gap-2">
            {cards.map((_, i) => (
              <button
                key={i}
                onClick={() => select(i)}
                aria-label={`Go to card ${i + 1}`}
                aria-current={i === activeIdx}
                className={`w-2 h-2 rounded-full transition-all duration-300 cursor-pointer ${i === activeIdx ? "bg-black/70 dark:bg-white/80 scale-[1.3]" : "bg-black/30 dark:bg-white/15 hover:bg-black/50"}`}
              />
            ))}
          </div>
          <button className={`${ARROW_CLASSES} w-10 h-10 md:w-12 md:h-12`} onClick={() => cycle("right")} aria-label="Next">
            {chevron("right")}
          </button>
        </div>
      )}
    </section>
  );
}
