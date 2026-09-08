/**
 * The front door: the loader that stands in front of a cold open, and the
 * reveal that takes it away.
 *
 * WHAT IS IN THIS FILE AND WHAT IS NOT. The field, the mark slot, the hairline
 * rule and the word are markup in index.html; the reasoning behind every rule
 * in that stylesheet is at the bottom of this comment, because comments there
 * ship and comments here do not. In one line: #root is empty until this
 * chunk has been downloaded, parsed and executed, so a React component cannot
 * be the thing that covers that gap, because a React component IS the thing
 * being waited for. This file ADOPTS the layer that is already on screen. It
 * draws none of it twice, which is also why there is no second copy to drift.
 *
 * It does exactly four things:
 *
 *   1. Upgrades the mark slot to the live Bloom, by portalling <Berry> into it.
 *      The blink is Berry.tsx's own rAF clock, not a second implementation, and
 *      it is absent under reduced motion for the same reason it always was.
 *   2. Advances the rule against REAL milestones. Three of them, and each one
 *      is an event that actually happened rather than a fraction of a timer:
 *      the document parsed (index.html sets that one itself), the entry chunk
 *      ran and the progress store was read, and the route's own chunk resolved.
 *      A progress bar that is a timer is a lie told with a rectangle.
 *   3. Names the stage in one honest phrase, which reads differently for a
 *      returning student and a first run because the two are doing different
 *      things.
 *   4. Runs the reveal: the mark scales up, the field parts, and the page
 *      behind it was already in position and at rest the whole time. Under
 *      prefers-reduced-motion the first three beats hold and the reveal is a
 *      120 ms cross fade, which is the CSS in index.html and not a branch here.
 *
 * createPortal is React's escape hatch for rendering a subtree into a DOM node
 * outside the component's own parent. It is the right tool here precisely
 * because the target is a node React did not create.
 *
 * THE MINIMUM HOLD IS A DESIGN COST, STATED. On a fast local build the app is
 * ready in well under 200 ms, and revealing then would be a flicker rather than
 * a front door: the mark would never blink and nobody would read the word. So
 * the reveal waits for BOOT_MIN_MS from navigation, which is roughly what the
 * bar's own splash costs. It is a floor, never an addition: an app that takes
 * 900 ms to be ready still reveals at BOOT_MIN_MS, and one that takes three
 * seconds reveals at three seconds.
 *
 * ONE MEASUREMENT HOOK, `?boot=hold`, in the same family as `?targets=1`. The
 * contrast audit cannot photograph this surface any other way: it navigates,
 * waits for the network to go idle, and only then measures, by which time a
 * loader that reveals itself is gone. With the flag set the reveal waits for
 * window.__blueberryBootRelease(). It changes WHEN the reveal runs and nothing
 * about what is drawn. The frame capture does NOT use it: capture-economy.mjs
 * opens the app the way a student does and watches the real thing.
 *
 * ------------------------------------------------------------------------
 * THE STYLESHEET'S REASONING LIVES HERE, and that placement is itself a
 * decision. Comments inside index.html's <style> block are served to every
 * student on the critical path, uncompressed and unminified; comments in this
 * module are removed by the bundler before anybody downloads it. Trimming the
 * inline block to pointers and moving the prose here took index.html from 3839
 * to 2776 bytes gzipped, so it bought back a kilobyte of the first request and
 * cost nothing anybody can measure. So:
 *
 * MOTION IS TRANSFORM AND OPACITY ONLY. The panels translate, the mark scales,
 * the rule's fill scales on X. Nothing animates width, height, top, left or a
 * background, so nothing there can drop a frame against the 60 fps budget.
 * test/bootLoader.test.ts parses the block and asserts it. The one background
 * change, dropping the field off #boot when the reveal starts, is a single
 * repaint under two panels that at that instant still cover the screen exactly,
 * so it is invisible and it is not on the per-frame path.
 *
 * THE BACKDROP CLIMB, and why the field is painted twice. The contrast audit
 * resolves an element's backdrop by climbing its ANCESTORS. The word and the
 * rule sit over the panels, which are their SIBLINGS, so with the field only on
 * the panels the climb walks straight past them to the page and reports the
 * word as light ink on a cream ground: a failure that is not real, in the same
 * family as the "an SVG mark sits on another mark" case that audit already
 * reports as unresolved. Putting the field on #boot as well makes the common
 * ancestor the true backdrop, and costs one property.
 *
 * WHY TWO PANELS RATHER THAN A GROWING HOLE. "Wipes outward" wants the field to
 * disappear from the middle first, and a single element cannot be clipped to
 * the region OUTSIDE a shape: clip-path takes one shape, and the mask-composite
 * trick that would do it is recent enough that a browser without it renders
 * either nothing or everything. Two halves parting is the boring version, it is
 * exactly as radial as it needs to be given the mark sits on the seam, and it
 * cannot fail on a browser this app supports.
 */

import { useEffect, useRef, useState, type ReactElement } from "react";
import { createPortal } from "react-dom";
import { Berry } from "../mascot/Berry";
import { progress } from "./progress";

/**
 * The floor on how long the loader is on screen, measured from navigation.
 *
 * Long enough for Bloom's first blink (Berry.tsx fires it 820 ms after the
 * mark appears) to land inside it, because "the mark alone, blinking once" is
 * the beat, and a beat nobody sees is a beat that is not there.
 */
const BOOT_MIN_MS = 1250;
/**
 * The ceiling. If the route's chunk has still not resolved by here, reveal
 * anyway: every tab behind this has a real skeleton, and a skeleton that says
 * what is coming is a better answer than a loader that never leaves.
 */
const BOOT_MAX_MS = 10_000;
/** The longest transition in index.html's reveal block, plus a frame. */
const REVEAL_MS = 880;
/** The cross fade prefers-reduced-motion gets instead, plus a frame. */
const REVEAL_REDUCED_MS = 160;

/**
 * The rule's four real positions. 0.16 is written by index.html itself, for the
 * one milestone that happens before this file exists: the document parsed.
 *
 * READY IS NOT THE SAME EVENT AS THE DOOR OPENING, and the rule says so. When
 * the route's chunk resolves faster than the floor, which is every time on a
 * warm cache, the rule goes to 0.92 and the word stays where it was: writing
 * "Ready" and then holding the field shut for another second would be a
 * sentence contradicted by the screen it is printed on. The last of the four
 * lands at the instant the field parts, so the fill completing and the door
 * opening are one beat.
 */
const PROGRESS_MOUNTED = 0.58;
const PROGRESS_CONTENT = 0.92;
const PROGRESS_OPEN = 1;

/* ------------------------------------------------------- the ready signal -- */

let contentReady = false;
const readyListeners = new Set<() => void>();

/**
 * The route's own content has committed.
 *
 * Called by <BootReady/>, which is rendered INSIDE each Suspense boundary. A
 * component inside a boundary does not mount until every sibling in that
 * boundary has resolved, so its first effect is the honest moment "the page
 * behind the loader is now in position", which is the only definition of ready
 * this loader will accept.
 */
function markContentReady(): void {
  if (contentReady) return;
  contentReady = true;
  for (const listener of readyListeners) listener();
}

/** Renders nothing. Reports that the boundary it sits in has resolved. */
export function BootReady(): null {
  useEffect(markContentReady, []);
  return null;
}

/* -------------------------------------------------------------- the layer -- */

const bootLayer = typeof document === "undefined" ? null : document.getElementById("boot");
const markSlot = typeof document === "undefined" ? null : document.getElementById("boot-mark");

/**
 * How big the mark is drawn. Small, per the bar this piece is judged against,
 * and a shade larger where there is room. Read once, at module load: the layer
 * lives for a second and a quarter and does not need to answer a resize.
 */
const MARK_PX = typeof window !== "undefined" && window.innerWidth >= 768 ? 112 : 96;

const HOLDING =
  typeof window !== "undefined" && new URLSearchParams(window.location.search).get("boot") === "hold";

/** Move the rule, and say what is happening. A null word leaves the last one standing. */
function say(value: number, word: string | null): void {
  if (bootLayer === null) return;
  bootLayer.style.setProperty("--boot-progress", value.toFixed(3));
  if (word === null) return;
  const slot = document.getElementById("boot-word");
  if (slot !== null && slot.textContent !== word) slot.textContent = word;
}

/**
 * The word for the middle beat, which is different for the two students who
 * see it. A returning account has a journal to read and a place in a course to
 * find; a first run has neither and is being set up. Saying "finding your
 * place" to somebody who has never opened the app would be the sort of warm
 * sentence that is not true.
 */
function middleWord(): string {
  const snapshot = progress.getSnapshot();
  return snapshot.journal.length > 0 || snapshot.course !== null ? "Finding your place" : "Setting up";
}

export function Loader({ reducedMotion }: { readonly reducedMotion: boolean }): ReactElement | null {
  // `isConnected` and not just null: the layer is REMOVED at the end, and the
  // module level reference survives that. A second mount of this component
  // would otherwise start at "load" against a detached node and portal Bloom
  // into a subtree nobody can see.
  const [phase, setPhase] = useState<"load" | "reveal" | "gone">(
    bootLayer === null || !bootLayer.isConnected ? "gone" : "load",
  );
  const timers = useRef<number[]>([]);

  useEffect(() => {
    if (bootLayer === null) return;
    const after = (ms: number, run: () => void) => {
      timers.current.push(window.setTimeout(run, Math.max(0, ms)));
    };

    // Milestone two: this chunk is running and the store has been read.
    say(PROGRESS_MOUNTED, middleWord());

    let revealScheduled = false;
    const scheduleReveal = () => {
      if (revealScheduled) return;
      revealScheduled = true;
      say(PROGRESS_CONTENT, null);
      // performance.now() is milliseconds since this navigation started, so the
      // floor is measured from the cold open rather than from this effect.
      after(BOOT_MIN_MS - performance.now(), () => {
        say(PROGRESS_OPEN, "Ready");
        setPhase("reveal");
      });
    };

    // Milestone three: the route's chunk resolved and its content committed.
    const onReady = () => {
      if (HOLDING) return;
      scheduleReveal();
    };
    if (contentReady) onReady();
    else readyListeners.add(onReady);

    // The ceiling. Never fires on a normal open; it exists so a stalled chunk
    // cannot leave a student looking at a purple rectangle forever.
    if (!HOLDING) after(BOOT_MAX_MS - performance.now(), scheduleReveal);

    if (HOLDING) {
      const held = window as typeof window & { __blueberryBootRelease?: () => void };
      held.__blueberryBootRelease = () => {
        say(PROGRESS_OPEN, "Ready");
        setPhase("reveal");
      };
    }

    return () => {
      readyListeners.delete(onReady);
      for (const id of timers.current) window.clearTimeout(id);
      timers.current = [];
    };
  }, []);

  useEffect(() => {
    if (bootLayer === null) return;
    if (phase === "reveal") {
      bootLayer.dataset.boot = "reveal";
      const id = window.setTimeout(() => setPhase("gone"), reducedMotion ? REVEAL_REDUCED_MS : REVEAL_MS);
      return () => window.clearTimeout(id);
    }
    if (phase === "gone") {
      // React has already unmounted the portal by the time an effect runs, so
      // the berry is out of this node before the node leaves the document.
      bootLayer.remove();
    }
    return undefined;
  }, [phase, reducedMotion]);

  if (phase === "gone" || markSlot === null) return null;
  return createPortal(
    <Berry sizePx={MARK_PX} reducedMotion={reducedMotion} mood="curious" behaviour="idle" />,
    markSlot,
  );
}
