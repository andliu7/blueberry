"use client";

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion, useReducedMotion, useSpring } from "motion/react";
import { useIsDark } from "@/lib/useIsDark";

/**
 * A navigation pill that shows only where you are, and opens into the full set
 * of destinations when you reach for it.
 *
 * Adapted from the 3D adaptive navigation bar. What changed and why:
 *
 * - **`motion/react`, not `framer-motion`.** This project runs Motion, framer's
 *   successor, throughout. Framer is present only as a transitive dependency,
 *   and mixing the two ships two animation runtimes.
 * - **Theme aware.** The original is a light-only object: hardcoded near-white
 *   gradients and `#1a1a1a` text. This app is dark by default, where that pill
 *   would glow like a torch. Both palettes are defined below.
 * - **Real weights.** The original asks for `fontWeight: 680` and `510`, which
 *   only mean anything with a variable font loaded. Nothing here loads one, so
 *   those silently round to 700 and 500. They are written as 700 and 500.
 * - **Width is computed, not hardcoded.** The original springs to a fixed 580px,
 *   sized for its four demo labels. This measures the labels, so the pill fits
 *   whatever it is given, and it is capped to the viewport so it cannot
 *   overflow on a phone.
 * - **Keyboard reachable.** Collapsed, the original unmounts every destination
 *   but the current one, so there is nothing to tab to. This opens on focus as
 *   well as hover.
 * - Dropped along the way: a `pillShift` spring that was only ever set to zero,
 *   an unused container ref, a `prevSectionRef` written but never read, and an
 *   empty effect labelled "no scroll detection".
 */

export type NavPillItem = {
  label: string;
  /** Hash target, e.g. "#/home". */
  href: string;
  id: string;
  /**
   * Shown instead of the label while the pill is closed.
   *
   * Only while closed. Opened, the pill is a list of destinations and they have
   * to be readable as words; a mark is only unambiguous for the place you are
   * already standing in. `label` is still required either way, since it is what
   * the item is called once the pill opens and what a screen reader announces.
   */
  icon?: React.ReactNode;
};

export type NavPillProps = {
  items: NavPillItem[];
  /** Which item is current. Drive this from the route, not from clicks. */
  activeId: string;
  className?: string;
};

/**
 * Rough label width at 15.5px in the display stack. The pill spreads its items
 * with `justify-evenly`, so erring wide costs a little air and erring narrow
 * would clip, which is why this leans generous.
 */
function measureWidth(labels: string[]): number {
  return labels.reduce((total, label) => total + label.length * 9 + 56, 0) + 48;
}

const LIGHT = {
  surface:
    "linear-gradient(135deg, #fcfcfd 0%, #f8f8fa 15%, #f3f4f6 30%, #eeeff2 45%, #e9eaed 60%, #e4e5e8 75%, #dee0e3 90%, #e2e3e6 100%)",
  topRidge:
    "linear-gradient(90deg, rgba(255,255,255,0) 0%, rgba(255,255,255,.95) 5%, rgba(255,255,255,1) 15%, rgba(255,255,255,1) 85%, rgba(255,255,255,.95) 95%, rgba(255,255,255,0) 100%)",
  hemisphere:
    "linear-gradient(180deg, rgba(255,255,255,.45) 0%, rgba(255,255,255,.25) 30%, rgba(255,255,255,.10) 60%, rgba(255,255,255,0) 100%)",
  directional:
    "linear-gradient(135deg, rgba(255,255,255,.40) 0%, rgba(255,255,255,.20) 20%, rgba(255,255,255,.08) 40%, rgba(255,255,255,0) 65%)",
  gloss:
    "radial-gradient(ellipse at center, rgba(255,255,255,.70) 0%, rgba(255,255,255,.35) 40%, rgba(255,255,255,.10) 70%, rgba(255,255,255,0) 100%)",
  underside:
    "linear-gradient(0deg, rgba(0,0,0,.14) 0%, rgba(0,0,0,.08) 25%, rgba(0,0,0,.03) 50%, rgba(0,0,0,0) 100%)",
  contact: "linear-gradient(0deg, rgba(0,0,0,.20) 0%, rgba(0,0,0,0) 100%)",
  innerGlow: "inset 0 0 40px rgba(255,255,255,.22)",
  hairline: "inset 0 0 0 0.5px rgba(0,0,0,.10)",
  activeText: "#1a1a1a",
  idleText: "#656565",
  hoverText: "#3a3a3a",
  activeShadow:
    "0 1px 0 rgba(0,0,0,.35), 0 -1px 0 rgba(255,255,255,.8), 1px 1px 0 rgba(0,0,0,.18), -1px 1px 0 rgba(0,0,0,.15)",
  idleShadow:
    "0 1px 0 rgba(0,0,0,.22), 0 -1px 0 rgba(255,255,255,.65), 1px 1px 0 rgba(0,0,0,.12), -1px 1px 0 rgba(0,0,0,.10)",
  rest: "0 3px 6px rgba(0,0,0,.12), 0 8px 16px rgba(0,0,0,.10), 0 16px 32px rgba(0,0,0,.08), inset 0 2px 1px rgba(255,255,255,.7), inset 0 -2px 6px rgba(0,0,0,.10), inset 2px 2px 8px rgba(0,0,0,.08), inset -2px 2px 8px rgba(0,0,0,.07)",
  open: "0 2px 4px rgba(0,0,0,.08), 0 6px 12px rgba(0,0,0,.12), 0 12px 24px rgba(0,0,0,.14), 0 24px 48px rgba(0,0,0,.10), inset 0 2px 2px rgba(255,255,255,.8), inset 0 -3px 8px rgba(0,0,0,.12), inset 3px 3px 8px rgba(0,0,0,.10), inset -3px 3px 8px rgba(0,0,0,.09)",
};

/**
 * Not the light palette inverted. A dark control catches light along its top
 * edge and sinks into the page rather than casting onto it, so the highlights
 * stay and the drop shadows do most of the work.
 */
const DARK = {
  surface:
    "linear-gradient(135deg, #35322f 0%, #302d2a 15%, #2b2825 30%, #262320 45%, #221f1c 60%, #1e1b18 75%, #1a1815 90%, #1d1a17 100%)",
  topRidge:
    "linear-gradient(90deg, rgba(255,255,255,0) 0%, rgba(255,255,255,.22) 5%, rgba(255,255,255,.30) 15%, rgba(255,255,255,.30) 85%, rgba(255,255,255,.22) 95%, rgba(255,255,255,0) 100%)",
  hemisphere:
    "linear-gradient(180deg, rgba(255,255,255,.10) 0%, rgba(255,255,255,.05) 30%, rgba(255,255,255,.02) 60%, rgba(255,255,255,0) 100%)",
  directional:
    "linear-gradient(135deg, rgba(255,255,255,.09) 0%, rgba(255,255,255,.05) 20%, rgba(255,255,255,.02) 40%, rgba(255,255,255,0) 65%)",
  gloss:
    "radial-gradient(ellipse at center, rgba(255,255,255,.16) 0%, rgba(255,255,255,.07) 40%, rgba(255,255,255,.02) 70%, rgba(255,255,255,0) 100%)",
  underside:
    "linear-gradient(0deg, rgba(0,0,0,.45) 0%, rgba(0,0,0,.26) 25%, rgba(0,0,0,.10) 50%, rgba(0,0,0,0) 100%)",
  contact: "linear-gradient(0deg, rgba(0,0,0,.45) 0%, rgba(0,0,0,0) 100%)",
  innerGlow: "inset 0 0 40px rgba(255,255,255,.05)",
  hairline: "inset 0 0 0 0.5px rgba(255,255,255,.09)",
  activeText: "#f5f1ea",
  idleText: "#9b938a",
  hoverText: "#d8d2c9",
  activeShadow: "0 1px 0 rgba(0,0,0,.6), 0 -1px 0 rgba(255,255,255,.14)",
  idleShadow: "0 1px 0 rgba(0,0,0,.5), 0 -1px 0 rgba(255,255,255,.07)",
  rest: "0 3px 6px rgba(0,0,0,.5), 0 8px 16px rgba(0,0,0,.4), 0 16px 32px rgba(0,0,0,.3), inset 0 2px 1px rgba(255,255,255,.13), inset 0 -2px 6px rgba(0,0,0,.5), inset 2px 2px 8px rgba(0,0,0,.35)",
  open: "0 2px 4px rgba(0,0,0,.4), 0 6px 12px rgba(0,0,0,.5), 0 12px 24px rgba(0,0,0,.5), 0 24px 48px rgba(0,0,0,.45), inset 0 2px 2px rgba(255,255,255,.16), inset 0 -3px 8px rgba(0,0,0,.55), inset 3px 3px 8px rgba(0,0,0,.4)",
};

const FONT =
  '"Iowan Old Style", "Palatino Linotype", Palatino, Georgia, ui-serif, serif';

export function NavPill({ items, activeId, className }: NavPillProps) {
  const isDark = useIsDark();
  const reduce = useReducedMotion();
  const p = isDark ? DARK : LIGHT;

  const [open, setOpen] = useState(false);
  const [reaching, setReaching] = useState(false);
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const active = items.find((i) => i.id === activeId) ?? items[0];
  // Closed on a mark, the pill is a circle: same width as its 56px height, with
  // the radius it already had. A word needs a lozenge, a logo does not.
  const collapsedWidth = active?.icon
    ? 56
    : Math.max(140, measureWidth([active?.label ?? ""]) - 24);
  const expandedWidth = measureWidth(items.map((i) => i.label));

  const width = useSpring(collapsedWidth, { stiffness: 220, damping: 25, mass: 1 });

  // Closing is deliberately lazy: the pill is a hover target with buttons inside
  // it, and snapping shut the instant the pointer crosses a gap between them
  // makes it feel like it is running away.
  useEffect(() => {
    if (closeTimer.current) clearTimeout(closeTimer.current);
    if (reaching) {
      setOpen(true);
      width.set(expandedWidth);
    } else {
      closeTimer.current = setTimeout(() => {
        setOpen(false);
        width.set(collapsedWidth);
      }, 600);
    }
    return () => {
      if (closeTimer.current) clearTimeout(closeTimer.current);
    };
  }, [reaching, width, expandedWidth, collapsedWidth]);

  const go = (item: NavPillItem) => {
    window.location.hash = item.href.replace(/^#/, "");
    setReaching(false);
  };

  return (
    <motion.nav
      aria-label="Sections"
      onMouseEnter={() => setReaching(true)}
      onMouseLeave={() => setReaching(false)}
      onFocus={() => setReaching(true)}
      onBlur={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget as Node)) setReaching(false);
      }}
      className={className}
      style={{
        width: reduce ? (open ? expandedWidth : collapsedWidth) : width,
        maxWidth: "calc(100vw - 2rem)",
        height: 56,
        borderRadius: 9999,
        position: "relative",
        overflow: "hidden",
        background: p.surface,
        boxShadow: open ? p.open : p.rest,
        transition: "box-shadow .3s ease-out, background .3s ease-out",
      }}
    >
      {/* Bright ridge along the top edge, where a real object catches light. */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 rounded-t-full"
        style={{ height: 2, background: p.topRidge, filter: "blur(0.3px)" }}
      />
      {/* Upper hemisphere falloff. */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 rounded-full"
        style={{ height: "55%", background: p.hemisphere }}
      />
      {/* Key light from the top left. */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 rounded-full"
        style={{ background: p.directional }}
      />
      {/* Specular streak, which stretches as the pill opens. */}
      <div
        aria-hidden
        className="pointer-events-none absolute rounded-full"
        style={{
          left: open ? "18%" : "15%",
          top: "16%",
          width: open ? 140 : 60,
          height: 14,
          background: p.gloss,
          filter: "blur(4px)",
          transform: "rotate(-12deg)",
          transition: "all .3s ease",
        }}
      />
      {/* Underside shadow, giving the lower half its curvature. */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 bottom-0 rounded-b-full"
        style={{ height: "50%", background: p.underside }}
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 bottom-0 rounded-b-full"
        style={{ height: "20%", background: p.contact, filter: "blur(2px)" }}
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 rounded-full"
        style={{ boxShadow: p.innerGlow, opacity: 0.7 }}
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 rounded-full"
        style={{ boxShadow: p.hairline }}
      />

      <div
        className="relative z-10 flex h-full items-center justify-center px-6"
        style={{ fontFamily: FONT }}
      >
        {!open && (
          <AnimatePresence mode="wait">
            {active && (
              <motion.span
                key={active.id}
                initial={{ opacity: 0, y: 8, filter: "blur(4px)" }}
                animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
                exit={{ opacity: 0, y: -8, filter: "blur(4px)" }}
                transition={{ duration: 0.35, ease: [0.4, 0, 0.2, 1] }}
                style={
                  active.icon
                    ? { display: "grid", placeItems: "center" }
                    : {
                        fontSize: "15.5px",
                        fontWeight: 700,
                        color: p.activeText,
                        letterSpacing: ".45px",
                        whiteSpace: "nowrap",
                        textShadow: p.activeShadow,
                        WebkitFontSmoothing: "antialiased",
                      }
                }
              >
                {/* The label goes to screen readers either way. A mark on its
                    own would otherwise leave the closed pill announcing
                    nothing. */}
                {active.icon ? (
                  <>
                    {active.icon}
                    <span className="sr-only">{active.label}</span>
                  </>
                ) : (
                  active.label
                )}
              </motion.span>
            )}
          </AnimatePresence>
        )}

        {open && (
          <div className="flex w-full items-center justify-evenly">
            {items.map((item, index) => {
              const isActive = item.id === activeId;
              return (
                <motion.button
                  key={item.id}
                  type="button"
                  onClick={() => go(item)}
                  aria-current={isActive ? "page" : undefined}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.08, duration: 0.25, ease: "easeOut" }}
                  className="relative cursor-pointer border-none bg-transparent outline-none"
                  style={{
                    fontSize: isActive ? "15.5px" : "15px",
                    fontWeight: isActive ? 700 : 500,
                    color: isActive ? p.activeText : p.idleText,
                    letterSpacing: ".45px",
                    padding: "10px 16px",
                    whiteSpace: "nowrap",
                    fontFamily: FONT,
                    transform: isActive ? "translateY(-1.5px)" : "translateY(0)",
                    textShadow: isActive ? p.activeShadow : p.idleShadow,
                    transition: "color .2s, transform .2s",
                    WebkitFontSmoothing: "antialiased",
                  }}
                  onMouseEnter={(e) => {
                    if (isActive) return;
                    e.currentTarget.style.color = p.hoverText;
                    e.currentTarget.style.transform = "translateY(-0.5px)";
                  }}
                  onMouseLeave={(e) => {
                    if (isActive) return;
                    e.currentTarget.style.color = p.idleText;
                    e.currentTarget.style.transform = "translateY(0)";
                  }}
                >
                  {/* An item with a mark keeps it open as well as closed, so
                      Home does not turn back into a word halfway through the
                      pill expanding. */}
                  {item.icon ? (
                    <>
                      <span className="grid place-items-center">{item.icon}</span>
                      <span className="sr-only">{item.label}</span>
                    </>
                  ) : (
                    item.label
                  )}
                </motion.button>
              );
            })}
          </div>
        )}
      </div>
    </motion.nav>
  );
}

export default NavPill;
