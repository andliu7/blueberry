import { useEffect, useRef, type CSSProperties } from "react";
import { Hexagon, MessageSquareText, MoveUpRight } from "lucide-react";
import { ELECTRON_FLOW_COPY } from "@blueberry/feedback";
import { BlueberryMark } from "@/components/ui/blueberry-mark";
import { HERO } from "@/data/site";
import { prefetchEntry } from "@/lib/entryChunks";
import "./home-sections.css";

/**
 * Beats 4 and 5 of the home page (SITE-REPLAN.md section 7): how it is checked, and the
 * close. Beat 3, the four destinations, moved beside the phone demo in S2 round 2
 * (HomeDestinations.tsx). Lazy, like the phone demo, because all of it sits below the
 * first screen; HomePage asks for it as it nears the viewport.
 *
 * No number here is typed (src/test/taxonomy.test.ts scans this file). The wrong-arrow example in
 * beat 4 says what the game itself says for that mistake: the words are the feedback
 * package's own copy for `arrow_drawn_backwards`, not a paraphrase.
 *
 * Reveals: blocks rise in and the beat 4 title rises line by line as each enters view. One
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
      <Proof />
      <Close />
    </div>
  );
}

/* ------------------------------------------------------------ beat 4 -- */

/** The title, one line per entry, for the line mask reveal. */
const PROOF_LINES = ["Draw the arrows.", "Find out which step went wrong."];

const PROMISES = [
  { text: "You push every arrow yourself. Not multiple choice.", Icon: MoveUpRight, tone: "practice" },
  { text: "Each step comes back named: right, right by another route, or the exact rule that broke.", Icon: MessageSquareText, tone: "review" },
  { text: "Every structure is drawn by chemistry software from the molecule itself, never from memory.", Icon: Hexagon, tone: "schedule" },
] as const;

function Proof() {
  const wrong = ELECTRON_FLOW_COPY.arrow_drawn_backwards;
  return (
    <section className="home-proof" aria-labelledby="home-proof-title">
      <h2 id="home-proof-title" className="home-proof__title" data-reveal>
        {PROOF_LINES.map((line, i) => (
          <span key={line} className="home-line">
            <span className="home-line__in" style={{ "--l": i } as CSSProperties}>
              {line}
            </span>
          </span>
        ))}
      </h2>

      <div className="home-proof__body">
        <figure className="home-wrong bb-glow" data-reveal>
          <figcaption className="home-wrong__eyebrow">A wrong arrow, and what comes back</figcaption>
          <WrongArrow />
          <p className="home-wrong__said" role="note">
            {wrong.whatYouDid}
          </p>
          <p className="home-wrong__look">{wrong.lookAt}</p>
        </figure>

        {/* The promises stretch to the figure's height from 900 px (S2 round 3, critic: a
            220 px hole under them), each with a picture-word in its own colour. */}
        <ul className="home-promises">
          {PROMISES.map(({ text, Icon, tone }, k) => (
            <li key={text} data-reveal style={{ "--k": k, "--tone": `var(--site-tab-${tone})` } as CSSProperties}>
              <span className="home-promises__icon" aria-hidden>
                <Icon className="size-6" strokeWidth={2.4} />
              </span>
              {text}
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

/**
 * Cyanide and a ketone, with the arrow drawn the wrong way: from the carbonyl carbon toward
 * the cyanide. The structure is the same drawing as `ui/mechanism-board.tsx` (same
 * coordinates), where the right arrows run the other way; here the one arrow is amber,
 * because wrong is calm (rule 4).
 */
function WrongArrow() {
  return (
    <svg
      viewBox="34 18 194 149"
      className="home-wrong__svg"
      role="img"
      aria-label="A ketone and a cyanide ion. One curved arrow runs from the carbonyl carbon to the cyanide carbon, which is backwards."
    >
      <g stroke="currentColor" strokeWidth={2.2} strokeLinecap="round" fill="none">
        <line x1={172} y1={90} x2={172} y2={52} />
        <line x1={180} y1={90} x2={180} y2={52} />
        <line x1={176} y1={96} x2={134} y2={120} />
        <line x1={176} y1={96} x2={218} y2={120} />
      </g>
      <g fill="currentColor">
        <text x={176} y={44} textAnchor="middle" fontSize={19} fontWeight={600}>
          O
        </text>
        <text x={44} y={152} fontSize={17} fontWeight={600}>
          N&#8801;C
          <tspan dy={-7} fontSize={12}>
            &#8722;
          </tspan>
        </text>
        <circle cx={91} cy={141} r={1.9} />
        <circle cx={91} cy={147} r={1.9} />
      </g>
      <g className="home-wrong__arrow">
        <path d="M 170 104 C 150 138, 120 150, 100 146" fill="none" strokeWidth={2.4} strokeLinecap="round" />
        <path d="M 0 0 L -5.5 10.5 L 5.5 10.5 Z" transform="translate(97 145.5) rotate(-100)" />
      </g>
    </svg>
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
          <a href="#/enter" className="home-btn" onPointerEnter={prefetchEntry} onFocus={prefetchEntry} onTouchStart={prefetchEntry}>
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
