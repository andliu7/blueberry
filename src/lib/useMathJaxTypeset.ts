import { useEffect } from "react";

export function useMathJaxTypeset(deps: unknown[]) {
  useEffect(() => {
    let cancelled = false;
    function tryTypeset() {
      if (cancelled) return;
      if (window.MathJax?.typesetPromise) {
        window.MathJax.typesetPromise();
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
