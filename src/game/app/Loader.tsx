/**
 * The front door: the loader that stands in front of the game on the way in.
 *
 * WHERE IT IS DRAWN. index.html draws all of it: Bloom moving in the middle,
 * the 0 to 100 count and a hand-written "blueberry" wordmark, on the game's
 * own ground gradient (the same stops as --bb-ground-top/--bb-ground-bottom in
 * src/game/theme.css, in both themes), plus a small inline script that drives
 * them. It has to, because on a cold open #root is empty until the site's
 * entry bundle and the game's lazy chunk have both arrived, and a React
 * component cannot cover a wait for React. This is option 3 of
 * documentation/BOOT-LOADER-BLOCKER.md; that doc says what is still the
 * owner's call.
 *
 * ONE LOADER ON EVERY WAY IN. The head script sets html[data-boot] before
 * paint when the URL is #/app, so a cold open paints the loader in its first
 * frame. The body script also opens it on a hashchange INTO #/app from any
 * other page (the home CTA, the funnel, a link), before React hears about the
 * change, so the site's own LoaderGate, its splat and the game's tab skeleton
 * all happen underneath it and are never seen. It opens once per document:
 * after it has revealed the game once, the element is deleted and later
 * visits go straight in (the chunk is cached by then).
 *
 * ONE PROGRESS SIGNAL, AND IT IS THE HERO. The count is a huge numeral
 * anchored to the bottom-right corner (31vw, 260 px at most), the way
 * andliu.dev's is, in "Boot Nunito": Nunito Black cut down to the ten digits
 * and the letters of "blueberry" (about 2 kB, scripts/subset_boot_font.py)
 * and inlined in index.html as a data URI, because real Nunito only arrives
 * with the site's CSS and the game chunk, and a count that changes typeface
 * partway through reads as a glitch. The stage words ("Getting ready", the
 * middle beat from this file, "Almost there", "Ready") are spoken, not shown:
 * they go to a polite status region and into the progressbar's
 * aria-valuetext. The word is chosen from the VISIBLE number, never from the
 * milestones, so the two can never disagree. The words do not name the
 * mascot.
 *
 * THE WORDMARK WRITES ITSELF (owner, 2026-10-17: "scale it down and draw it
 * out as if writing"). Bottom-left, about 30 to 50 px tall. Each letter is
 * Nunito Black's outline as an SVG path with pathLength 1, so its stroke is
 * drawn by animating stroke-dashoffset from 1 to 0, then its ink fills in, one
 * letter 110 ms after the next. The paths were cut from the variable Nunito in
 * node_modules at weight 900 with fontTools; the font is the same one the
 * count uses, so the two read as one family.
 *
 * BLOOM HAS MORE THAN ONE MOVE (owner, 2026-10-17: "more variety of
 * reactions"). One 5.4 s cycle of six 900 ms beats: hop, hop, a flip in the
 * air, a wiggle on the spot, a big hop, two little hops. The wrapper
 * (.boot-hop) carries height and turn, the mark squashes and stretches on
 * landing, and the floor shadow shrinks as Bloom rises, all from the same
 * cycle so they never drift apart.
 *
 * THE COUNT IS REAL, the way andliu.dev's is (andliu-portfolio
 * components/site/loader.tsx): five milestones, each worth part of 100.
 *
 *   parsed    5  the HTML is parsed (the inline script is running)
 *   entry    25  the site's entry bundle ran (DOMContentLoaded)
 *   game     30  the game's chunk arrived: this file is evaluated and mounted
 *   ready    30  a route's content committed under the field (BootReady)
 *   settled  10  the site's LoaderGate has left the document, then four
 *                frames in a row under 25 ms, or 400 ms
 *
 * Inside the step being waited on, the count may go as far as one short of
 * that step's end, never to it, so it never shows a step that has not
 * happened. It gets there three ways: files arriving (a PerformanceObserver on
 * 'resource' entries, worth up to half the step, 1 - e^(-files/40)), a quick
 * gear to 40 percent of the step at 80 ms a number, then a steady gear that
 * spreads what is left over the time remaining before the 15 s mark (30 s
 * once that has fired), at 250 to 700 ms a number. So it ticks at least every
 * 0.7 s until a step is very late, rather than racing and then sitting just
 * under a milestone for seconds. A file arriving only re-plans the count when
 * it would move it forward; re-planning on every file restarted the slow gear
 * before its first tick, which was the real cause of the long freezes.
 *
 * THE COUNT NEVER GOES BACKWARDS. The number is a strip of rows 0 to 100
 * behind a one-row window, moved by one Web Animation per plan (it runs on the
 * compositor, so it keeps moving while the game's modules block the main
 * thread). When a plan is replaced, the number it had reached is worked out
 * from wall-clock time since the plan started, which is never behind what the
 * compositor has drawn, so a new plan can only start level or ahead.
 *
 * 100 MEANS THE SCREEN IS THERE. The field only comes down once `ready` has
 * been reported (a route's content committed), the site's LoaderGate has left,
 * and #root has visible text. No timer can skip that. At 15 s the count's
 * deadline moves to 30 s and a small line under Bloom says "Slow connection.
 * Still loading." so a long wait reads as slow, not stuck. The one exception
 * is a screen that never reports ready, such as the error boundary: after 30 s
 * it is revealed if #root has visible text, because an error page is better
 * than a loader that never ends. If #root is still empty the field stays up.
 * (Round 5 revealed at 15 s whatever was there, which on a slow phone was an
 * empty #root: a count of 100 over a white screen.) When it does come down,
 * the count runs on to 100 at 15 ms a number, 400 ms at most, holds 200 ms
 * (and at least 900 ms from the start, one full hop), then hands off.
 *
 * THE HANDOFF: BLOOM JUMPS, THE CURTAIN LIFTS, BLOOM LANDS (owner,
 * 2026-10-17). The count, the wordmark and the floor shadow fade (140 ms).
 * Bloom jumps up and over in an arc (640 ms, a Web Animation with a peak
 * keyframe) and drops, smaller, onto the biggest visible mascot on the screen
 * underneath (any `.berry-origin` 36 px or wider: the path's Bloom beside the
 * current lesson, the welcome screen's greeter), then squashes once as it
 * lands. 90 ms into the jump the ground lifts off the top like a curtain
 * (520 ms): the ground is drawn on #boot::before, so it can move while Bloom,
 * a child of #boot, stays free. Because the page underneath has already
 * reported ready and settled, the lift uncovers a finished screen, never bare
 * gradient (that was why an earlier curtain was dropped). The landing aims
 * body circle onto body circle (the r=23 circle both drawings share), measured
 * with the target's own wave switched off for that one read, and copies the
 * target's outline filter. Then Bloom fades (200 ms) over the real mascot in
 * the same spot. With no mascot on the screen underneath, Bloom shrinks away
 * while the curtain lifts.
 *
 * A REVISIT before the first reveal (leave, then come back) starts the count
 * at what is already known (30 on a warm document), not at 0, so it does not
 * replay a full run for work that is already done.
 *
 * aria-valuenow follows the VISIBLE number (re-read every 400 ms), not the
 * milestone total, so a screen reader never hears 100 while the screen says 70.
 *
 * LEAVING #/app while the field is up removes it at once, with no fade, so the
 * site's own page transition is the only transition: the owner's rule is never
 * two at once. While the field is up, #root is inert and aria-hidden, so
 * neither Tab nor a screen reader can reach the app behind it. The only
 * timer is the 30 s rule above, and it never reveals an empty #root.
 *
 * THIS FILE does three things: reports the two milestones only the game can
 * see (`game` and `ready`) through window.__blueberryBoot, names the middle
 * beat in one honest phrase, and lays the live <Berry> over the static Bloom
 * in index.html, so Bloom starts blinking. The moves are CSS on the wrapper
 * around the mark, so the live berry's own idle motion composes with them. The
 * static copy is hidden, not deleted, so if the student leaves before the
 * reveal and comes back, Bloom is there from the first frame again.
 *
 * The static SVG in index.html is a copy of BlueberryMark's art with the
 * "curious" face (open eyes, smile, no blush). It is the one place the mascot
 * is drawn outside BlueberryMark.tsx, because it must paint before any script;
 * change one and change the other, or the swap shows.
 *
 * createPortal is React's escape hatch for rendering a subtree into a DOM node
 * outside the component's own parent. It is the right tool here because the
 * target is a node React did not create.
 *
 * Reduced motion (html[data-motion="reduced"], set by index.html from the
 * footer switch or the OS): no moves, no writing, no jump and no lift. The
 * count still ticks the same way (a number changing is not vestibular motion,
 * and a still screen for six seconds reads as hung), the floor shadow breathes
 * in opacity, the wordmark is simply there, and the handoff is one 160 ms
 * fade. `?boot=hold` keeps the field up until window.__blueberryBootRelease()
 * is called, for the contrast audit. Transitions are transform and opacity
 * only. Comments in index.html ship to every visitor, so the reasoning lives
 * here, where the bundler strips it.
 */

import { useEffect, useState, type ReactElement } from "react";
import { createPortal } from "react-dom";
import { Berry } from "../mascot/Berry";
import { progress } from "./progress";

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

/** Matches .boot-stage --mark in index.html: 128 px, 160 px from 768 wide. */
function markPx(): number {
  return window.innerWidth >= 768 ? 160 : 128;
}

/** Fired by index.html's script once the layer is down. */
const GONE_EVENT = "blueberry:boot-gone";

type BootWindow = Window & { __blueberryBoot?: (step: "game" | "ready", word?: string) => void };

/**
 * Tell index.html's counter a milestone happened, with the word to say for it.
 * Safe when the layer is down: the script ignores reports it is not waiting for.
 */
function report(step: "game" | "ready", word?: string): void {
  (window as BootWindow).__blueberryBoot?.(step, word);
}

/**
 * The word for the middle beat, which is different for the two students who
 * hear it. A returning account has a journal to read and a place in a course to
 * find; a first run has neither and is being set up.
 */
function middleWord(): string {
  const snapshot = progress.getSnapshot();
  return snapshot.journal.length > 0 || snapshot.course !== null ? "Finding your place" : "Setting up";
}

/**
 * The slot Bloom is drawn into, or null when the field is not up. Looked up on
 * mount, not when this module is evaluated, because on a warm open the field
 * goes up after the site is already running, and on a second open the module
 * has long been evaluated.
 */
function openSlot(): HTMLElement | null {
  if (!document.documentElement.hasAttribute("data-boot")) return null;
  return document.getElementById("boot-mark");
}

export function Loader({ reducedMotion }: { readonly reducedMotion: boolean }): ReactElement | null {
  // useState with an initializer runs the lookup once, on mount.
  const [slot, setSlot] = useState(openSlot);

  // Unmount only (empty deps): the game is leaving, so the next way in must
  // wait for its own content to commit again.
  useEffect(() => () => {
    contentReady = false;
  }, []);

  useEffect(() => {
    if (slot === null) return;
    // The field can come down between render and this effect (the student left #/app).
    if (!slot.isConnected || !document.documentElement.hasAttribute("data-boot")) {
      setSlot(null);
      return;
    }

    // Milestone `game`: this chunk is running and the store has been read.
    report("game", middleWord());
    // The live Berry is portalled in on this same commit, drawn over the
    // static copy at the same size, so hiding the copy shows no seam.
    const still = slot.querySelector<SVGElement>(".boot-static");
    if (still) still.style.visibility = "hidden";

    // Milestone `ready`: a route's content committed under the field.
    const onReady = () => report("ready");
    if (contentReady) onReady();
    else readyListeners.add(onReady);

    const onGone = () => setSlot(null);
    window.addEventListener(GONE_EVENT, onGone);
    return () => {
      readyListeners.delete(onReady);
      window.removeEventListener(GONE_EVENT, onGone);
      if (still) still.style.visibility = "";
    };
  }, [slot]);

  if (slot === null) return null;
  return createPortal(
    <Berry sizePx={markPx()} reducedMotion={reducedMotion} mood="curious" behaviour="idle" />,
    slot,
  );
}
