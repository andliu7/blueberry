import { useEffect, type RefObject } from "react";

/**
 * Re-runs MathJax when `deps` change.
 *
 * Pass `scope` wherever possible. Without it MathJax re-typesets the entire
 * document, so N components mounting at once cost N full-page passes — enough
 * to lock the tab when all 44 answers expand at once.
 */
export function useMathJaxTypeset(deps: unknown[], scope?: RefObject<HTMLElement | null>) {
  useEffect(() => {
    let cancelled = false;
    function tryTypeset() {
      if (cancelled) return;
      if (window.MathJax?.typesetPromise) {
        const el = scope?.current;
        window.MathJax.typesetPromise(el ? [el] : undefined);
      } else {
        setTimeout(tryTypeset, 150);
      }
    }
    tryTypeset();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
}
