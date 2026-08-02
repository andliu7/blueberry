"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  AnimatePresence,
  motion,
  useAnimationControls,
  useReducedMotion,
} from "motion/react";
import { GradientMenuButton, type GradientMenuItem } from "@/components/ui/gradient-menu";

/**
 * Expand All and Collapse All, where the redundant one dissolves into its
 * partner like a droplet being absorbed.
 *
 * Which buttons show is derived from the cards themselves, never from which
 * button was pressed last: expanding the last collapsed card by hand retires
 * Expand All just as surely as clicking it does, and collapsing one brings it
 * back out of its sibling.
 *
 * The liquid look is an SVG gooey filter over the pair. Blurring both shapes and
 * then hard-thresholding the alpha makes their edges fuse as they approach, and
 * `feComposite atop` lays the untouched original back over the blob so labels
 * and icons stay crisp.
 */

export type ToggleVisibility =
  /** Every card is collapsed, so only Expand All is worth showing. */
  | "expand"
  /** Every card is expanded, so only Collapse All is worth showing. */
  | "collapse"
  /** A mix, so both do something. */
  | "both";

export type GooeyTogglePairProps = {
  expand: GradientMenuItem;
  collapse: GradientMenuItem;
  show: ToggleVisibility;
};

/** Roughly one button plus the gap, which is how far apart the pair sits. */
const MERGE_X = 44;

/**
 * SVG filters over HTML are unreliable in Safari and iOS Chrome, and animated
 * blur stutters badly there. Those browsers get a plain elastic shrink instead.
 */
function isUnsupportedBrowser() {
  if (typeof navigator === "undefined") return false;
  const ua = navigator.userAgent.toLowerCase();
  const isSafari =
    ua.includes("safari") &&
    !ua.includes("chrome") &&
    !ua.includes("chromium") &&
    !ua.includes("android") &&
    !ua.includes("firefox");
  return isSafari || ua.includes("crios");
}

function GooeyFilter() {
  return (
    <svg aria-hidden="true" focusable="false" className="absolute w-0 h-0">
      <defs>
        {/* Wider than the default region: a 5px blur needs room to spread, and
            the default -10%/120% box would clip the blob's edges. */}
        <filter id="goo-effect" x="-30%" y="-30%" width="160%" height="160%">
          <feGaussianBlur in="SourceGraphic" stdDeviation="5" result="blur" />
          <feColorMatrix
            in="blur"
            type="matrix"
            values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 18 -15"
            result="goo"
          />
          <feComposite in="SourceGraphic" in2="goo" operator="atop" />
        </filter>
      </defs>
    </svg>
  );
}

export function GooeyTogglePair({ expand, collapse, show }: GooeyTogglePairProps) {
  const reduce = useReducedMotion();
  const plain = useMemo(isUnsupportedBrowser, []);
  const rootRef = useRef<HTMLDivElement>(null);
  const expandJelly = useAnimationControls();
  const collapseJelly = useAnimationControls();
  const previous = useRef(show);
  // The filter is only worn during the merge. Left on permanently it would fuse
  // the two resting buttons into a single peanut, since an 8px gap is well
  // inside the blur radius.
  const [merging, setMerging] = useState(false);

  useEffect(() => {
    const was = previous.current;
    previous.current = show;
    if (was === show || reduce) return;

    // The survivor takes on the mass of whatever just merged into it.
    if (was === "both" && show !== "both") {
      const jelly = show === "expand" ? expandJelly : collapseJelly;
      void jelly.start({
        scale: [1, 1.15, 0.95, 1.03, 1],
        transition: { duration: 0.6, delay: 0.3, times: [0, 0.35, 0.6, 0.82, 1] },
      });
    }

    if (plain) return;
    setMerging(true);
    const id = setTimeout(() => setMerging(false), 900);
    return () => clearTimeout(id);
  }, [show, reduce, plain, expandJelly, collapseJelly]);

  // A button that animates out while focused would drop focus onto the body.
  useEffect(() => {
    const root = rootRef.current;
    if (!root || show === "both") return;
    const active = document.activeElement;
    if (!active || !root.contains(active)) return;
    const survivor = root.querySelector<HTMLButtonElement>(`[data-goo="${show}"] button`);
    if (survivor && survivor !== active) survivor.focus();
  }, [show]);

  if (reduce) {
    return (
      <div ref={rootRef} className="flex items-center gap-2">
        {show !== "collapse" && <GradientMenuButton {...expand} />}
        {show !== "expand" && <GradientMenuButton {...collapse} />}
      </div>
    );
  }

  const spring = { type: "spring" as const, bounce: 0.2, duration: 0.75 };

  const droplet = (
    id: "expand" | "collapse",
    item: GradientMenuItem,
    jelly: typeof expandJelly,
    /** Sign and distance of the sibling this one merges into. */
    towards: number,
  ) => (
    <motion.div
      key={id}
      data-goo={id}
      layout
      className="shrink-0"
      // Entering is the exit run backwards: it separates out of its sibling.
      initial={{ opacity: 0, scale: 0.3, x: towards, ...(plain ? {} : { filter: "blur(6px)" }) }}
      animate={{
        opacity: 1,
        scale: 1,
        x: 0,
        ...(plain ? {} : { filter: "blur(0px)" }),
        transition: spring,
      }}
      exit={
        plain
          ? { opacity: 0, scale: 0.4, transition: { duration: 0.26, ease: "easeIn" } }
          : {
              x: towards,
              scale: [1, 0.55, 0],
              // Stays opaque most of the way across, so the goo has two solid
              // shapes to fuse right up to the moment of contact.
              opacity: [1, 1, 0],
              transition: {
                x: { type: "spring", bounce: 0.2, duration: 0.7 },
                scale: { duration: 0.55, times: [0, 0.55, 1], ease: "easeIn" },
                opacity: { duration: 0.55, times: [0, 0.7, 1] },
              },
            }
      }
    >
      {/* Nested so the squash keyframes and the presence animation are not
          fighting over the same `animate` prop. */}
      <motion.div animate={jelly}>
        <GradientMenuButton {...item} />
      </motion.div>
    </motion.div>
  );

  return (
    <>
      {!plain && <GooeyFilter />}
      <div
        ref={rootRef}
        className="flex items-center gap-2"
        style={merging ? { filter: "url(#goo-effect)" } : undefined}
      >
        <AnimatePresence mode="popLayout" initial={false}>
          {show !== "collapse" && droplet("expand", expand, expandJelly, MERGE_X)}
          {show !== "expand" && droplet("collapse", collapse, collapseJelly, -MERGE_X)}
        </AnimatePresence>
      </div>
    </>
  );
}

export default GooeyTogglePair;
