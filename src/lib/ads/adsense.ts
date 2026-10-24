/**
 * Google AdSense's script, added to the page only when asked.
 *
 * This is the only file in src that names Google's script (adPlacement.test.ts pins that),
 * and only the lazy AdSlotBody chunk imports it, after the viewer said yes.
 */

declare global {
  interface Window {
    adsbygoogle?: unknown[];
  }
}

let loading: Promise<void> | null = null;

/** Add the script once. A failed load is forgotten, so the next slot can try again. */
export function loadAdSense(client: string): Promise<void> {
  if (loading) return loading;
  loading = new Promise<void>((resolve, reject) => {
    const script = document.createElement("script");
    script.async = true;
    script.src = `https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${encodeURIComponent(client)}`;
    script.crossOrigin = "anonymous";
    script.onload = () => resolve();
    script.onerror = () => {
      script.remove();
      reject(new Error("AdSense did not load"));
    };
    document.head.appendChild(script);
  });
  loading.catch(() => {
    loading = null;
  });
  return loading;
}

/**
 * Ask Google to fill one `<ins class="adsbygoogle">`. Skipped when Google has already marked
 * it, because React's StrictMode runs effects twice in development and a second push for the
 * same slot throws.
 */
export function pushAd(ins: HTMLElement): void {
  if (ins.dataset.adsbygoogleStatus) return;
  try {
    (window.adsbygoogle = window.adsbygoogle || []).push({});
  } catch {
    /* an ad blocker or a full page: the slot stays empty, nothing else breaks */
  }
}
