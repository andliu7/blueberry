import { lazy, Suspense, useEffect, useRef, useState, type ComponentType, type RefObject } from "react";
import { HomeHero } from "@/components/HomeHero";
import { HomeLoader } from "@/components/HomeLoader";
import { useDecks } from "@/lib/useDecks";
import { hasSeenIntro, markIntroSeen } from "@/lib/intro";
import { prefetchEntry } from "@/lib/entryChunks";
import "./home.css";

/**
 * Everything below the first screen, as two chunks of their own. React pattern:
 * `lazy(() => import(...))` splits a component into a separate file that is fetched the
 * first time it renders, and `<Suspense>` shows its fallback until then. The slots below
 * delay that first render until each part nears the screen, so neither costs the first
 * paint anything.
 */
const HomePhoneDemo = lazy(() => import("@/components/HomePhoneDemo"));
const HomeSections = lazy(() => import("@/components/HomeSections"));

/**
 * The liquid-sculpture section (owner, 15 Oct): HomeSculpture wraps the owner-supplied
 * `src/components/ui/liquid-sculpture-hero.tsx` with Blueberry's image, copy and tokens, and
 * decides per screen between the WebGL engine and the still picture. Lazy, like the slots
 * above, so neither it nor the engine is in the first-paint bundle.
 */
const LiquidSculpture = lazy(() => import("@/components/HomeSculpture"));

/**
 * The newsletter band, as a PREVIEW: the dev server only, and only with `?newsletter` in the
 * address (http://localhost:5173/?newsletter#/). `import.meta.env.DEV` is statically false in
 * a build, so this branch and the chunk it names are removed and nothing of it ships.
 *
 * TODO(owner): where do the addresses go? Nothing in the repo collects emails yet (the Apps
 * Script backend has contact messages, not a list). Until Andrew picks a destination, the
 * stub below keeps nothing and sends nothing; it only plays the states. An address ending
 * in "@fail.test" plays the error state.
 */
const HomeNewsletter = import.meta.env.DEV ? lazy(() => import("@/components/HomeNewsletter")) : null;
const previewSubscribe = ({ email }: { email: string }) =>
  new Promise<void>((resolve, reject) =>
    setTimeout(() => (email.endsWith("@fail.test") ? reject(new Error("preview")) : resolve()), 700),
  );

/**
 * The front door (SITE-REPLAN.md section 7), one story told once, top to bottom, on the one
 * lavender ground:
 *
 *   beat 0  the loader, first arrival in a tab session only (HomeLoader)
 *   beat 1  the hero: the headline, Bloom, one button (HomeHero)
 *   beat 2  the phone demo, with the four destination rows beside it (HomePhoneDemo, lazy)
 *   beat 3  the liquid sculpture (SculptureSlot, lazy)
 *   beats 4 and 5  how it is checked, the close (HomeSections, lazy)
 *
 * The site header and footer around it are drawn once for every page by SiteChrome.
 */
export function HomePage() {
  /**
   * The loader plays on the first arrival in a tab session only. `lib/intro` keeps that
   * mark: read once on mount, before it is set, and a deck clears it on the way here so
   * the opening plays again (see that file).
   */
  const [showLoader] = useState(() => !hasSeenIntro());
  useEffect(markIntroSeen, []);

  /**
   * True two frames after mount, when the hero may play its entrance. Two frames, because
   * the hidden start state has to be painted once before the change, or the browser skips
   * the transition. The entrance does not wait for the loader: as on the portfolio, the
   * headline is finished behind the sheets and the wipe uncovers a page that is already
   * there (home round 2).
   */
  const [entered, setEntered] = useState(false);
  useEffect(() => {
    let inner = 0;
    const outer = requestAnimationFrame(() => {
      inner = requestAnimationFrame(() => setEntered(true));
    });
    return () => {
      cancelAnimationFrame(outer);
      cancelAnimationFrame(inner);
    };
  }, []);

  // Once the page is idle, fetch the screens behind "Start the first lesson", so the press
  // never waits on them (src/lib/entryChunks.ts). requestIdleCallback where it exists.
  useEffect(() => {
    if (typeof window.requestIdleCallback === "function") {
      const id = window.requestIdleCallback(prefetchEntry, { timeout: 3000 });
      return () => window.cancelIdleCallback(id);
    }
    const id = setTimeout(prefetchEntry, 1500);
    return () => clearTimeout(id);
  }, []);

  const { decks } = useDecks();

  return (
    // No surface colour here: the page sits on the one site ground that <html> paints
    // (--site-ground in src/tokens.css). No photograph behind any text, owner 2026-10-07.
    // No `data-loader` here (home round 2). That attribute belongs to the spinners in
    // ui/loader.tsx: index.css slows every animation under it to 3 s for reduced motion, which
    // turned the home loader's 120 ms fade into a 3 s veil with a hard cut at 1.1 s.
    // `data-intro` while the loader plays: home.css holds the demo section back until the
    // sheets have passed the headline.
    <div className="home relative" data-intro={showLoader ? "" : undefined}>
      {showLoader && <HomeLoader />}
      <HomeHero decks={decks} entered={entered} />
      <PhoneDemoSlot />
      <SculptureSlot Sculpture={LiquidSculpture} />
      <SectionsSlot />
      {HomeNewsletter && new URLSearchParams(window.location.search).has("newsletter") && (
        <Suspense fallback={null}>
          <HomeNewsletter onSubscribe={previewSubscribe} />
        </Suspense>
      )}
    </div>
  );
}

/**
 * True once the element has come within 600 px of the screen, and from then on. A custom
 * hook (a function whose name starts with `use` and calls other hooks) so both slots share
 * the one observer pattern.
 */
function useNearScreen(ref: RefObject<HTMLElement | null>): boolean {
  const [near, setNear] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setNear(true);
          io.disconnect();
        }
      },
      { rootMargin: "600px 0px" },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [ref]);
  return near;
}

/**
 * Beat 2's section. The heading is on the page from the start; the demo is asked for when
 * the section nears the screen (on a phone that is at once, because the hero ends inside
 * the first screen). Until the chunk arrives, a box of the demo's own height holds its
 * place so nothing below it jumps.
 */
function PhoneDemoSlot() {
  const ref = useRef<HTMLElement>(null);
  const near = useNearScreen(ref);
  const hold = <div className="home-demo__hold" aria-hidden />;
  return (
    <section ref={ref} className="home-demo" aria-labelledby="home-demo-title">
      <h2 id="home-demo-title" className="home-section-title">
        Look around before you sign up.
      </h2>
      <p className="home-demo__lede">Point at a place to see it on the phone. Press it to go there.</p>
      {near ? <Suspense fallback={hold}><HomePhoneDemo /></Suspense> : hold}
    </section>
  );
}

/** Beat 3, the same way. No height is held: it is below the demo, so nothing above it jumps. */
function SculptureSlot({ Sculpture }: { Sculpture: ComponentType }) {
  const ref = useRef<HTMLDivElement>(null);
  const near = useNearScreen(ref);
  return (
    <div ref={ref} className="home-sculpture">
      {near && (
        <Suspense fallback={null}>
          <Sculpture />
        </Suspense>
      )}
    </div>
  );
}

/** Beats 4 and 5, the same way. */
function SectionsSlot() {
  const ref = useRef<HTMLDivElement>(null);
  const near = useNearScreen(ref);
  const hold = <div className="home-sections__hold" aria-hidden />;
  return (
    <div ref={ref}>
      {near ? <Suspense fallback={hold}><HomeSections /></Suspense> : hold}
    </div>
  );
}

export default HomePage;
