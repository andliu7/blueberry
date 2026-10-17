import { lazy, Suspense, useSyncExternalStore } from "react";
import { useIsDark } from "@/lib/useIsDark";

/**
 * Home beat 3: the liquid sculpture (owner-supplied, src/components/ui/liquid-sculpture-hero.tsx,
 * by guglielmogiannattasio.it). The sculpture is the Diels-Alder reaction from the checked
 * "diels-alder" entry in src/data/reactions.ts, drawn by RDKit into public/hero/ by
 * scripts/render_hero_sculpture.py. Re-run that script to change it; never hand-draw it.
 *
 * Two versions of the same section:
 *  - desktop with a mouse (1024 px and up, fine pointer, motion allowed): the WebGL2 particle
 *    engine, which the cursor turns liquid;
 *  - everything else (phones, tablets, reduced motion): the still image, and the engine's
 *    code is never even downloaded.
 */

// React.lazy: the engine (WebGL2 shaders, about 65 KB of source) is its own file, fetched the
// first time <SculptureHero> renders, which only happens on the desktop branch below.
const SculptureHero = lazy(() => import("@/components/ui/liquid-sculpture-hero"));

/**
 * DRAFT for Andrew: placeholder copy for this section, rewrite in your voice.
 * The facts in it are true: butadiene and acrolein (the reactant labels in reactions.ts)
 * give one six-membered ring in one concerted step, and the drawing is RDKit's.
 */
const COPY = {
  eyebrow: "Diels-Alder, drawn by RDKit",
  headline: "Two molecules in.\nOne ring out.",
  accent: "One ring out.",
  body: "Butadiene and acrolein close into a six-membered ring in a single step. Every structure on Blueberry is drawn and checked by RDKit, this one included.",
  hint: "Move across the molecules",
  alt: "Skeletal structures: buta-1,3-diene plus acrolein gives cyclohex-3-ene-1-carbaldehyde.",
};

const base = import.meta.env.BASE_URL;
const LIGHT_SRC = `${base}hero/sculpture-light.webp`;
const DARK_SRC = `${base}hero/sculpture-dark.webp`;
// The phone version: the same drawing in two rows, so the O labels stay legible at 390 px.
const MOBILE_LIGHT_SRC = `${base}hero/sculpture-mobile-light.webp`;
const MOBILE_DARK_SRC = `${base}hero/sculpture-mobile-dark.webp`;

const ENGINE_QUERY = "(min-width: 1024px) and (pointer: fine) and (prefers-reduced-motion: no-preference)";

/**
 * True while the screen qualifies for the engine. useSyncExternalStore is React's hook for
 * reading a value that lives outside React (here a media query) and re-rendering when it
 * changes, so resizing the window or switching on reduced motion swaps the branch live.
 */
function useEngineAllowed(): boolean {
  return useSyncExternalStore(
    (onChange) => {
      const mq = window.matchMedia(ENGINE_QUERY);
      mq.addEventListener("change", onChange);
      return () => mq.removeEventListener("change", onChange);
    },
    () => window.matchMedia(ENGINE_QUERY).matches,
  );
}

/**
 * Overrides on the component's own classes, kept here so the owner's file stays as supplied.
 *  - Type: titles are Nunito Black, and the accent line is purple, not an italic serif.
 *  - Contrast: the component fades its small text with opacity (eyebrow .62, hint .5, credit
 *    .38), which measured 3.84, 2.82 and 2.12 : 1 on the lavender ground, under WCAG AA.
 *    They take --site-quiet at full opacity instead, as the still version does (6.4 : 1). The
 *    component's own touched rule is more specific, so the hint still fades on first move.
 *  - Alignment: the words sit in the same 72rem band as the other home sections
 *    (home.css, home-sections.css: max-width 72rem, 24px side padding from 900px). The
 *    particle stage stays wider; only the text and the credit are pulled into the band.
 *    100% in a padding is the width of the section itself, which is centred like the band.
 */
const BAND = "max(24px, calc((100% - 72rem) / 2 + 24px))";
const ENGINE_CSS = [
  ".home-sculpture-hero .sh-h1{font-weight:900;letter-spacing:-.03em}",
  ".home-sculpture-hero .sh-accent{font-style:normal;font-weight:900;letter-spacing:-.03em}",
  ".home-sculpture-hero .sh-eyebrow,.home-sculpture-hero .sh-hint,.home-sculpture-hero .sh-credit{color:var(--site-quiet);opacity:1}",
  ".home-sculpture-hero .sh-credit:hover{text-decoration:underline}",
  `.home-sculpture-hero .sh-content{padding-left:${BAND};padding-right:${BAND}}`,
  `.home-sculpture-hero .sh-credit{right:${BAND}}`,
].join("");

export default function HomeSculpture() {
  const dark = useIsDark();
  const engine = useEngineAllowed();
  const still = <SculptureStill dark={dark} />;
  if (!engine) return still;
  return (
    // While the engine chunk loads, the still version holds the place, so nothing jumps.
    <Suspense fallback={still}>
      <style>{ENGINE_CSS}</style>
      <SculptureHero
        className="home-sculpture-hero"
        src={LIGHT_SRC}
        darkSrc={DARK_SRC}
        mobileSrc={MOBILE_LIGHT_SRC}
        mobileDarkSrc={MOBILE_DARK_SRC}
        imageAlt={COPY.alt}
        theme={dark ? "dark" : "light"}
        showNav={false}
        themeToggle={false}
        loadFonts={false}
        headingLevel={2}
        eyebrow={COPY.eyebrow}
        headline={COPY.headline}
        headlineAccent={COPY.accent}
        body={COPY.body}
        primaryCta={{ label: "", href: "#" }}
        secondaryCta={{ label: "", href: "#" }}
        hint={COPY.hint}
        hintTouch={COPY.hint}
        backdropText=""
        // Colours are the site tokens (src/tokens.css), so .dark swaps them with the page.
        // The ground stays transparent: the section sits on the one site ground.
        background="transparent"
        darkBackground="transparent"
        textColor="var(--bb-deep)"
        accentColor="var(--site-nav-line)"
        headingFont="var(--site-display)"
        accentFont="var(--site-display)"
        bodyFont="ui-sans-serif, system-ui, sans-serif"
        sculptureScale={0.86}
        height="clamp(560px, 72vh, 700px)"
        showCredit
        style={{ maxWidth: "90rem", margin: "0 auto" }}
      />
    </Suspense>
  );
}

/** The phone, tablet and reduced-motion version: the same words and the same picture, still. */
function SculptureStill({ dark }: { dark: boolean }) {
  const [first, second] = COPY.headline.split("\n");
  return (
    // max-w-6xl is 72rem, the band every home section shares; 24px sides from 900px as theirs.
    <section className="mx-auto grid max-w-6xl gap-6 px-4 py-10 min-[900px]:px-6" aria-labelledby="home-sculpture-title">
      {/* <picture>: the browser picks the two-row drawing under 640px, the one-row one above. */}
      <picture>
        <source media="(max-width: 639px)" srcSet={dark ? MOBILE_DARK_SRC : MOBILE_LIGHT_SRC} width={1200} height={934} />
        <img
          src={dark ? DARK_SRC : LIGHT_SRC}
          alt={COPY.alt}
          width={2000}
          height={390}
          loading="lazy"
          decoding="async"
          className="mx-auto h-auto w-full max-sm:max-w-[28rem]"
        />
      </picture>
      <div className="grid gap-3">
        <p className="m-0 text-xs font-semibold uppercase tracking-[0.12em] text-[var(--site-quiet)]">{COPY.eyebrow}</p>
        <h2
          id="home-sculpture-title"
          className="m-0 text-[clamp(2rem,6vw,3.5rem)] font-black leading-[0.95] text-[var(--bb-deep)]"
          style={{ fontFamily: "var(--site-display)" }}
        >
          <span className="block">{first}</span>
          <span className="block text-[var(--site-nav-line)]">{second}</span>
        </h2>
        <p className="m-0 max-w-[34rem] text-[1.0625rem] leading-normal text-[var(--site-quiet)]">{COPY.body}</p>
      </div>
    </section>
  );
}
