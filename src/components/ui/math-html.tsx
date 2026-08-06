"use client";

import { useEffect, useRef } from "react";

/**
 * Renders trusted HTML and typesets any LaTeX inside it.
 *
 * The content is written imperatively rather than through
 * `dangerouslySetInnerHTML`, because the two systems fight: MathJax replaces the
 * `$...$` text with its own `<mjx-container>` markup, and the next React render
 * restores the virtual DOM it believes is correct, throwing that markup away.
 * The symptom is raw LaTeX appearing in a card that rendered a moment earlier.
 *
 * React sees an empty div here and never touches the children, so MathJax's
 * output survives every re-render. Re-typesetting only happens when `html`
 * actually changes.
 *
 * Two things keep it cheap, because this renders dozens of times on a page.
 *
 * **Prose is never typeset.** Most questions have no maths in them, and asking
 * MathJax to scan a paragraph with no delimiters is pure cost.
 *
 * **The rest go through one queue, a few per frame.** Measured: turning a
 * 43-question deck to the flip style mounts both faces of every card, so 86 of
 * these appear in a single frame, and 86 typeset passes locked the tab for over
 * forty-five seconds. Spread across frames the same work never blocks a frame
 * long enough to be felt.
 *
 * Two schedulers were tried before this one and both left raw `$C=C$` on the
 * page. An IntersectionObserver never fires for a flip card's faces, because
 * they live in a 3-D transformed subtree whose intersection box is degenerate.
 * `requestAnimationFrame` is frozen outright in a background tab, so anyone who
 * switched away mid-page came back to untypeset LaTeX. A timer is throttled in
 * the background rather than stopped, so the queue always finishes; that is the
 * property that matters here, since this is correctness rather than animation.
 */

/**
 * Whether a string can possibly contain maths.
 *
 * Deliberately generous: a false positive costs one wasted pass, a false
 * negative renders raw LaTeX on the page.
 */
function hasMath(html: string): boolean {
  // The backslashes are escaped. Written as "\(" they would be the literal
  // "(", which matches almost every sentence and quietly turns the guard off.
  return html.includes("$") || html.includes("\\(") || html.includes("\\[");
}

/**
 * One queue for every instance on the page.
 *
 * `BATCH` is how many elements are handed to MathJax per frame. Two is enough
 * to clear a full deck in well under a second while leaving each frame most of
 * its budget, which is what keeps scrolling smooth while the page fills in.
 */
const BATCH = 2;
const queue = new Set<HTMLElement>();
let draining = false;

function drain() {
  if (draining) return;
  draining = true;

  const step = () => {
    const mj = window.MathJax;
    if (!mj?.typesetPromise) {
      // MathJax is a deferred script; it may simply not be here yet.
      setTimeout(step, 150);
      return;
    }
    const batch: HTMLElement[] = [];
    for (const el of queue) {
      // Elements torn out by a re-render are dropped rather than typeset into
      // a document they no longer belong to.
      queue.delete(el);
      if (el.isConnected) batch.push(el);
      if (batch.length >= BATCH) break;
    }
    if (batch.length) {
      // Clear first: MathJax remembers elements it has processed and will
      // otherwise resolve without rendering the new content.
      try {
        mj.typesetClear?.(batch);
        void mj.typesetPromise(batch)?.catch(() => {});
      } catch {
        /* a failed typeset should never take the page down */
      }
    }
    if (queue.size) setTimeout(step, 0);
    else draining = false;
  };

  setTimeout(step, 0);
}

export function MathHtml({ html, className }: { html: string; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.innerHTML = html;

    // The text is already on the page from the assignment above; there is
    // nothing for MathJax to do and no reason to wake it.
    if (!hasMath(html)) return;

    queue.add(el);
    drain();

    return () => {
      queue.delete(el);
    };
  }, [html]);

  return <div ref={ref} className={className} />;
}

export default MathHtml;
