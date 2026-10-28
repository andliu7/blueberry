import { lazy, Suspense, useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import { GLASS_SPLASH_MAX_MS, shouldPlaySplash } from "@/lib/glassSplashGuard";

/**
 * The liquid-glass logo reveal as a once-per-session splash on the landing page.
 *
 * Loaded by a dynamic import from main.tsx AFTER the page has loaded and the
 * browser is idle, so it is never in the first-open path. It draws into its own
 * React root (a sibling of #root), so the entry chunk carries only the import
 * stub. The shader is a further lazy chunk, fetched only if the guard passes.
 *
 * It never blocks: the page underneath is already interactive, a tap anywhere
 * dismisses it, and it removes itself after GLASS_SPLASH_MAX_MS regardless.
 */
const Reveal = lazy(() =>
  import("@/components/ui/liquid-glass-logo-reveal").then((m) => ({ default: m.BlueberryGlassReveal })),
);

const FADE_MS = 300;

function Splash({ onDone }: { onDone: () => void }) {
  const [leaving, setLeaving] = useState(false);
  useEffect(() => {
    const t = window.setTimeout(() => setLeaving(true), GLASS_SPLASH_MAX_MS - FADE_MS);
    return () => window.clearTimeout(t);
  }, []);
  useEffect(() => {
    if (!leaving) return;
    const t = window.setTimeout(onDone, FADE_MS);
    return () => window.clearTimeout(t);
  }, [leaving, onDone]);
  return (
    <div
      aria-hidden
      onPointerDown={() => setLeaving(true)}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 2147483000,
        background: "#efeaf8",
        opacity: leaving ? 0 : 1,
        transition: `opacity ${FADE_MS}ms ease-out`,
        touchAction: "manipulation",
      }}
    >
      <Suspense fallback={null}>
        {/* loop off: one reveal. speed 1.6 fits the 3.5 s timeline in about 2.2 s. */}
        <Reveal loop={false} speed={1.6} className="h-full w-full" style={{ cursor: "default" }} />
      </Suspense>
    </div>
  );
}

function hasWebGL2(): boolean {
  try {
    return !!document.createElement("canvas").getContext("webgl2");
  } catch {
    return false;
  }
}

export function mountGlassSplash(): void {
  const play = shouldPlaySplash({
    hash: window.location.hash,
    reducedMotion: window.matchMedia("(prefers-reduced-motion: reduce)").matches,
    storage: () => window.sessionStorage,
  });
  // No WebGL2: a splash that is only the flat mark adds nothing over the loader and page.
  if (!play || !hasWebGL2()) return;
  const host = document.createElement("div");
  document.body.appendChild(host);
  const root = createRoot(host);
  root.render(
    <Splash
      onDone={() => {
        root.unmount();
        host.remove();
      }}
    />,
  );
}
