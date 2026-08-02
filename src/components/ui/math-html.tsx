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
 */
export function MathHtml({ html, className }: { html: string; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.innerHTML = html;

    let cancelled = false;
    let timer: ReturnType<typeof setTimeout>;

    const run = () => {
      if (cancelled || !ref.current) return;
      const mj = window.MathJax;
      if (!mj?.typesetPromise) {
        timer = setTimeout(run, 150);
        return;
      }
      // Clear first: MathJax remembers elements it has processed and will
      // otherwise resolve without rendering the new content.
      mj.typesetClear?.([ref.current]);
      void mj.typesetPromise([ref.current])?.catch(() => {});
    };

    timer = setTimeout(run, 0);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [html]);

  return <div ref={ref} className={className} />;
}

export default MathHtml;
