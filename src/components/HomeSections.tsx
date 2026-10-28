import { useEffect, useRef } from "react";
import { BlueberryMark } from "@/components/ui/blueberry-mark";
import { FIRST_LESSON_URL, HERO } from "@/data/site";
import "./home-sections.css";

/**
 * Beat 5 of the home page (SITE-REPLAN.md section 7): the close. Beat 3, the four destinations,
 * moved beside the phone demo in S2 round 2 (HomeDestinations.tsx). The "how it is checked"
 * beat was removed by the owner on 28 Oct. Lazy, like the phone demo, because it sits below
 * the first screen; HomePage asks for it as it nears the viewport.
 *
 * No number here is typed (src/test/taxonomy.test.ts scans this file).
 *
 * Reveals: the close band rises in as it enters view. One
 * IntersectionObserver adds `.is-in` to every `[data-reveal]` in this subtree, the
 * portfolio's own pattern (andliu-portfolio app/motion.tsx:84-90). The hidden start states
 * apply only under full motion, so with reduced motion everything is simply there.
 */
export default function HomeSections() {
  const root = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = root.current;
    if (!el) return;
    const io = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          entry.target.classList.add("is-in");
          io.unobserve(entry.target);
        }
      },
      { rootMargin: "0px 0px -15% 0px" },
    );
    el.querySelectorAll("[data-reveal]").forEach((node) => io.observe(node));
    return () => io.disconnect();
  }, []);

  return (
    <div ref={root}>
      <Close />
    </div>
  );
}

/* ------------------------------------------------------------ beat 5 -- */

/**
 * The finale (home round 2). It was a 48 px berry over a small button, which read as a
 * postscript (critic: Duolingo ends on a full-width scene with its button inside it). Now it
 * is one wide sticker band with Bloom at hero size, who hops once as the band comes into view,
 * the line at title size, and the one action: the same button as the hero. No second link.
 */
function Close() {
  return (
    <section className="home-close" aria-labelledby="home-close-title">
      <div className="home-close__band" data-reveal>
        <span className="home-close__bloom" aria-hidden>
          <span className="home-close__hop">
            <BlueberryMark eyes mood="happy" className="h-full w-full" />
          </span>
        </span>
        <div className="home-close__text">
          <h2 id="home-close-title" className="home-close__title">
            Ready when you are.
          </h2>
          <a href={FIRST_LESSON_URL} className="home-btn">
            <span className="home-btn__face">{HERO.cta}</span>
            <span className="home-btn__face home-btn__face--back" aria-hidden>
              {HERO.cta}
            </span>
          </a>
          <p className="home-close__note">{HERO.ctaNote}</p>
        </div>
      </div>
    </section>
  );
}
