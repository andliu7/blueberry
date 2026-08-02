import { useEffect, type RefObject } from "react";

/**
 * Re-runs MathJax when `deps` change.
 *
 * Pass `scope` wherever possible. Without it MathJax re-typesets the entire
 * document, so N components mounting at once cost N full-page passes, enough to
 * lock the tab when all 44 answers expand.
 *
 * Two details that are easy to get wrong, both of which produced silently
 * unrendered LaTeX:
 *
 * 1. MathJax keeps a per-document record of the elements it has processed. A
 *    card that was typeset while collapsed is remembered as done, so when the
 *    answer later appears inside it the promise resolves happily having
 *    rendered nothing. `typesetClear` drops that record so the element is
 *    scanned afresh.
 * 2. The call is deferred a tick. Typesetting in the same task as the DOM
 *    mutation that revealed the maths also resolved without output.
 */
export function useMathJaxTypeset(deps: unknown[], scope?: RefObject<HTMLElement | null>) {
  useEffect(() => {
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | undefined;

    function run() {
      if (cancelled) return;
      const mj = window.MathJax;
      if (!mj?.typesetPromise) {
        timer = setTimeout(run, 150);
        return;
      }
      const el = scope?.current;
      const targets = el ? [el] : undefined;
      try {
        if (targets) mj.typesetClear?.(targets);
        void mj.typesetPromise(targets)?.catch(() => {
          /* a failed typeset should never take the page down */
        });
      } catch {
        /* ignore */
      }
    }

    timer = setTimeout(run, 0);

    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
}
