import { useEffect, useRef, useState, type AnimationEvent, type CSSProperties, type ReactNode } from "react";
import { Check, Lock } from "lucide-react";
import { motion, useScroll, useTransform } from "motion/react";
import { HomeDestinations } from "@/components/HomeDestinations";
import { REACTIONS, REAGENT_ART, type StagedReaction } from "@/data/reactions";
import { LESSON_TOPICS, sectionForFamily } from "@/data/lessonTopics";
import { PATHWAY_UNITS } from "@/game/demo/pathwayMap";
import { ThemedArt } from "@/components/ThemedArt";
import { DEMO_ADVANCE_MS, DEMO_TABS, type DemoTabId } from "@/lib/homeDemo";
import { isReducedMotion } from "@/lib/motionPref";
import "./home-phone.css";

/**
 * Beat 2, the phone demo (SITE-REPLAN.md section 7; owner's request of 27 Sep, tabs per his
 * answer of 7 Oct: Learn, Practice, Review, Schedule).
 *
 * A flat phone beside the four destination rows. Each place plays one short, real moment from
 * that part of the site, built from the site's own data: the Learn and Review screens draw
 * reactions from `src/data/reactions.ts` with the RDKit art the curriculum build renders, the
 * lesson card is the real section that reaction is filed under, and Practice is the start of
 * Unit 1's real path (`PATHWAY_UNITS`). Nothing chemical here is typed by hand.
 *
 * ONE PICTURE PER THING (S2 round 5). Each screen shows something no other part of the home
 * page shows: the hero already plays cyanide adding to a ketone, so Learn plays imine
 * formation and Practice shows the path, not the same board again.
 *
 * LAZY, ON PURPOSE. HomePage loads this file with `React.lazy` only once its slot comes near
 * the screen, so neither this code nor `home-phone.css` is in the entry bundle (phase 4b's
 * check). React pattern: `lazy(() => import(...))` splits a component into its own chunk, and
 * the `<Suspense>` around it shows the fallback until the chunk arrives.
 *
 * AUTO-ADVANCE IS A CSS ANIMATION. The lit destination row carries a thin bar that fills over
 * 6 s; when its animation ends, the next place is shown. Pausing is therefore pure CSS: the bar stops
 * (`animation-play-state: paused`) while the pointer is over the demo, while focus is inside
 * it, and while it is off screen. No interval to clear, and a pause resumes exactly where it
 * stopped. Under reduced motion the bar is not drawn, so nothing advances by itself.
 *
 * Reduced motion: every screen shows its last frame, still (each screen's CSS is written so
 * the resting styles ARE the last frame, and the animations play from the earlier states).
 *
 * NO BLANK FRAME ON A TAB CHANGE (home round 2). Each screen plays in from empty start
 * states, so a plain swap showed an empty phone for a moment (critic: at 150 ms after a tab
 * press the phone was a white rectangle with one rule). Now the outgoing screen stays painted
 * on top, at its last frame, for 200 ms while the incoming one starts underneath, then fades
 * out over 250 ms (home-phone.css, `.hp-screen--out`). `leaving` is the screen being kept;
 * it is dropped when its fade ends. Reduced motion has no fade, so it is never kept.
 *
 * THE ROWS ARE THE TABS (S2 round 5). There used to be a tab strip over the phone as well as
 * the four destination cards beside it, which named every place twice (critic, rounds 3 and 4).
 * Now the rows (HomeDestinations) are the only control: pointing at or focusing a row shows
 * its screen, pressing it goes there, and because the rows are inside `.hp`, the hover also
 * pauses the clock. The phone itself is a picture and hidden from screen readers.
 *
 * THE SCROLL-IN (owner 15 Oct). The phone comes up like andliu.dev's tablet: see `ScrollIn`.
 */
export default function HomePhoneDemo() {
  const [active, setActive] = useState(0);
  const [leaving, setLeaving] = useState<number | null>(null);
  const [offscreen, setOffscreen] = useState(false);
  // The stage (the phone's panel), not the root: from 1024 px the root is `display: contents`
  // (home.css), which has no box for an observer to see.
  const stage = useRef<HTMLDivElement>(null);
  const tab = DEMO_TABS[active];

  // Pause the clock while the demo is off screen, so it is on the place you left when you return.
  useEffect(() => {
    const el = stage.current;
    if (!el) return;
    const io = new IntersectionObserver(([entry]) => setOffscreen(!entry.isIntersecting), { threshold: 0.25 });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  // Fetch the Review screen's drawings now (Learn's are on screen already), so its first
  // frame never waits on the network.
  useEffect(() => {
    const r = reaction("grignard-addition-ketone");
    const base = import.meta.env.BASE_URL;
    for (const src of [r.art.start_light, r.art.start_dark, r.art.product_light, r.art.product_dark]) {
      if (src) new Image().src = base + src;
    }
  }, []);

  const select = (i: number) => {
    const next = (i + DEMO_TABS.length) % DEMO_TABS.length;
    if (next !== active) setLeaving(isReducedMotion() ? null : active);
    setActive(next);
  };

  // The leaving screen's own fade has ended (not one of the animations inside it, whose end
  // events bubble up to here too).
  const onLeft = (e: AnimationEvent) => {
    if (e.target === e.currentTarget) setLeaving(null);
  };

  // Both screens are keyed by tab, so React keeps the leaving screen's DOM as it is, at its
  // last frame, instead of building it again from its empty start state.
  const shown = leaving === null || leaving === active ? [active] : [active, leaving];

  return (
    <div
      className="hp"
      data-offscreen={offscreen ? "" : undefined}
      style={{ "--hp-advance": `${DEMO_ADVANCE_MS}ms` } as CSSProperties}
    >
      {/* The rows come first in the page order: on a phone they are the way in, so they sit
          right under the title, and the phone plays below them. From 1024 px the grid in
          home.css puts them on the right. They are also the demo's tabs (S2 round 5): the lit
          row is the screen the phone shows. */}
      <div className="hp-rail">
        <HomeDestinations
          active={tab.id}
          onPreview={(id) => select(DEMO_TABS.findIndex((t) => t.id === id))}
          onClockEnd={() => select(active + 1)}
        />
      </div>
      {/* The stage is a coloured panel in the shown place's colour (`--tone`), the same colour
          as the lit row, so the room the tipped-back phone leaves while it rises is colour. The
          phone is a picture: the rows are the controls, so it is hidden from screen readers. */}
      <div ref={stage} className="hp-stage" style={{ "--tone": `var(--site-tab-${tab.id})` } as CSSProperties}>
        <ScrollIn>
          <Tilt>
            <div className="hp-phone" aria-hidden>
              <span className="hp-phone__notch" />
              {/* `key` mounts a fresh screen for each place, which plays its CSS animations. */}
              {shown.map((i) => (
                <div
                  key={DEMO_TABS[i].id}
                  className={i === active ? "hp-screen" : "hp-screen hp-screen--out"}
                  onAnimationEnd={i === active ? undefined : onLeft}
                >
                  <Screen id={DEMO_TABS[i].id} />
                </div>
              ))}
            </div>
          </Tilt>
        </ScrollIn>
      </div>
    </div>
  );
}

/**
 * The phone's scroll-in, a port of andliu.dev's ContainerScroll mechanics
 * (andliu-portfolio components/ui/container-scroll-animation.tsx). While the phone comes up the
 * screen it lies about 48deg back, twisted 4deg and 120px low, holds that for the first
 * quarter, then goes flat, pivoting on its bottom edge.
 *
 * THE RANGE IS THE PHONE'S OWN (S2 round 3, owner flag). The portfolio runs it from the
 * section's top entering ("start end") to the section's top at the top of the screen. Its card
 * is a short landscape tablet; this is a tall phone, and 48deg back drops a 612 px phone's
 * top about 320 px below where it stands, so with the portfolio's range the first two screens
 * at 1440 showed an empty panel where the phone would be (critic, round 2). Here the range is
 * the phone's box, from its top entering the screen to its bottom reaching the bottom of the
 * screen (S2 round 5, critic: with "start 0.7" it was flat while only its top 250 px showed).
 * So it lies back while it is coming up and stands upright the moment all of it is in view.
 *
 * React pattern: `useScroll` gives a motion value that tracks scroll progress, and
 * `useTransform` maps it to angles. Motion values update the style directly, so React does
 * not re-render on scroll, and only `transform` changes (no layout per frame).
 * Reduced motion: flat and still, the scroll is not read at all.
 */
function ScrollIn({ children }: { children: ReactNode }) {
  const box = useRef<HTMLDivElement>(null);
  const [still] = useState(isReducedMotion);
  // A phone screen gets a third of the angle and less drop, as the portfolio's ContainerScroll has a
  // mobile branch: at full strength the tipped-back phone left a blank band under the tabs.
  const [k] = useState(() => (window.matchMedia("(max-width: 767px)").matches ? 0.35 : 1));
  const { scrollYProgress } = useScroll({ target: box, offset: ["start end", "end end"] });
  const rotateX = useTransform(scrollYProgress, [0, 0.25, 1], [48 * k, 48 * k, 0]);
  const rotateZ = useTransform(scrollYProgress, [0, 0.25, 1], [4 * k, 4 * k, 0]);
  const y = useTransform(scrollYProgress, [0, 0.25, 1], [120 * k * k, 120 * k * k, 0]);
  return (
    <div ref={box} className="hp-rise">
      {still ? (
        children
      ) : (
        <motion.div style={{ rotateX, rotateZ, y, transformPerspective: 1000, transformOrigin: "50% 100%" }}>{children}</motion.div>
      )}
    </div>
  );
}

function Screen({ id }: { id: DemoTabId }) {
  if (id === "learn") return <LearnScreen />;
  if (id === "practice") return <PracticeScreen />;
  if (id === "review") return <ReviewScreen />;
  return <ScheduleScreen />;
}

/* ------------------------------------------------------------------ the data -- */

function reaction(id: string): StagedReaction {
  const r = REACTIONS.find((x) => x.id === id);
  if (!r) throw new Error(`HomePhoneDemo: no reaction "${id}" in src/data/reactions.ts`);
  return r;
}

/* ----------------------------------------------------------------- the screens -- */

/**
 * Learn: the lesson card opens into one of its reaction cards, the start drawn, the arrow
 * drawn under its reagent, the product arriving last. Imine formation (one stage, so the one
 * arrow and its one reagent are the whole story), filed under the lesson section
 * `sectionForFamily` gives it. Not cyanohydrin: the hero plays that one already.
 */
function LearnScreen() {
  const r = reaction("imine-formation");
  const section = LESSON_TOPICS.find((t) => t.id === sectionForFamily(r.family));
  const reagent = REAGENT_ART[r.stages[0]?.reagents[0] ?? ""];
  return (
    <div className="hp-learn">
      <div className="hp-lesson">
        <span className="hp-eyebrow">Lesson{section ? ` · ${section.label}` : ""}</span>
        {section && <span className="hp-lesson__title">{section.title}</span>}
      </div>
      <div className="hp-rxn">
        <span className="hp-rxn__name">{r.name}</span>
        <ThemedArt light={r.art.start_light} dark={r.art.start_dark} className="hp-rxn__start" />
        <div className="hp-rxn__step">
          <svg viewBox="0 0 20 56" className="hp-rxn__arrow">
            <path className="hp-draw" pathLength={1} d="M10 2 V50" />
            <path className="hp-rxn__head" d="M3 44 L10 54 L17 44" />
          </svg>
          {reagent && <ThemedArt light={reagent.light} dark={reagent.dark} className="hp-rxn__reagent" />}
        </div>
        <ThemedArt light={r.art.product_light} dark={r.art.product_dark} className="hp-rxn__product" />
        <span className="hp-rxn__label">{r.product_label}</span>
      </div>
    </div>
  );
}

/**
 * Practice: the start of Unit 1's path, as the game draws it. The unit's own title, then its
 * first four main-line steps from `PATHWAY_UNITS` (the game's map): the first done, the second
 * the one to start, the rest locked. A picture of the path, not a second mechanism board.
 */
function PracticeScreen() {
  const unit = PATHWAY_UNITS[0];
  const [unitNo, unitName] = unit.title.split(" · ");
  const steps = unit.nodes.filter((n) => n.kind === "spine").slice(0, 4);
  return (
    <div className="hp-practice">
      <div className="hp-unit">
        <span className="hp-eyebrow">{unitNo}</span>
        <span className="hp-unit__title">{unitName ?? unit.title}</span>
      </div>
      <ol className="hp-path">
        {steps.map((step, k) => {
          const state = k === 0 ? "done" : k === 1 ? "current" : "locked";
          return (
            <li key={step.id} className={`hp-step hp-step--${state}`} style={{ "--k": k } as CSSProperties}>
              <span className={`hp-node hp-node--${state}`}>
                {state === "done" && <Check className="size-5" strokeWidth={3} />}
                {state === "current" && <span className="hp-start">START</span>}
                {state === "locked" && <Lock className="size-4" />}
              </span>
              <span className="hp-step__title">{step.title}</span>
            </li>
          );
        })}
      </ol>
    </div>
  );
}

/**
 * Review: a card flips to its answer, then a finger holds it and it tilts toward the finger
 * without turning over (owner, 30 Sep). Grignard addition to a ketone, front and back drawn.
 */
function ReviewScreen() {
  const r = reaction("grignard-addition-ketone");
  return (
    <div className="hp-review">
      <span className="hp-eyebrow">Due today</span>
      <div className="hp-card">
        <div className="hp-card__inner">
          <div className="hp-face hp-face--front">
            <span className="hp-face__title">{r.name}</span>
            <ThemedArt light={r.art.start_light} dark={r.art.start_dark} className="hp-face__art" />
            <span className="hp-face__hint">What forms?</span>
          </div>
          <div className="hp-face hp-face--back">
            <ThemedArt light={r.art.product_light} dark={r.art.product_dark} className="hp-face__art" />
            <span className="hp-face__title">{r.product_label}</span>
          </div>
        </div>
        <span className="hp-finger" />
      </div>
      <div className="hp-rate">
        <span>Missed</span>
        <span>Unsure</span>
        <span>Got it</span>
      </div>
    </div>
  );
}

/** Schedule: a week, one office-hours slot lights, and the booking sheet slides up. */
function ScheduleScreen() {
  const days: { d: string; chip?: ReactNode }[] = [
    { d: "Mon" },
    { d: "Tue", chip: <span className="hp-event">Lab</span> },
    { d: "Wed", chip: <span className="hp-slot">Office hours</span> },
    { d: "Thu", chip: <span className="hp-event">Quiz</span> },
    { d: "Fri" },
  ];
  return (
    <div className="hp-schedule">
      <span className="hp-eyebrow">This week</span>
      <div className="hp-week">
        {days.map(({ d, chip }) => (
          <div key={d} className="hp-day">
            <span className="hp-day__name">{d}</span>
            {chip}
          </div>
        ))}
      </div>
      <div className="hp-sheet">
        <span className="hp-sheet__grab" />
        <span className="hp-sheet__title">Office hours</span>
        <span className="hp-sheet__line">Pick the time, say what you want to go over, confirm.</span>
        <span className="hp-sheet__btn">Book this time</span>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------- the tilt -- */

/**
 * TiltFrame, ported from andliu-portfolio components/site/tilt-frame.tsx:22-60 (CSS in
 * home-phone.css, from app/globals.css:543-548). The phone turns a few degrees toward a fine
 * pointer; touch screens and reduced motion get a flat frame.
 *
 * React pattern: refs plus CSS variables instead of state. The pointer handler writes --px and
 * --py on the element once per animation frame and CSS turns them into a rotation, so React
 * never re-renders while the pointer moves.
 */
function Tilt({ children }: { children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  const [live] = useState(
    () =>
      typeof window !== "undefined" &&
      window.matchMedia("(pointer: fine)").matches &&
      document.documentElement.getAttribute("data-motion") !== "reduced",
  );

  useEffect(() => {
    const el = ref.current;
    if (!el || !live) return;
    let frame = 0;
    let px = 0;
    let py = 0;
    const write = () => {
      frame = 0;
      el.style.setProperty("--px", px.toFixed(3));
      el.style.setProperty("--py", py.toFixed(3));
    };
    const onMove = (e: PointerEvent) => {
      if (e.pointerType !== "mouse" && e.pointerType !== "pen") return;
      const box = el.getBoundingClientRect();
      px = Math.max(-1, Math.min(1, ((e.clientX - box.left) / box.width) * 2 - 1));
      py = Math.max(-1, Math.min(1, ((e.clientY - box.top) / box.height) * 2 - 1));
      el.setAttribute("data-tilting", "");
      if (!frame) frame = requestAnimationFrame(write);
    };
    const onLeave = () => {
      if (frame) cancelAnimationFrame(frame);
      frame = 0;
      el.removeAttribute("data-tilting");
      el.style.setProperty("--px", "0");
      el.style.setProperty("--py", "0");
    };
    el.addEventListener("pointermove", onMove);
    el.addEventListener("pointerleave", onLeave);
    return () => {
      el.removeEventListener("pointermove", onMove);
      el.removeEventListener("pointerleave", onLeave);
      onLeave();
    };
  }, [live]);

  return (
    <div ref={ref} className="hp-tilt" data-flat={live ? undefined : ""}>
      <div className="hp-tilt__stage">{children}</div>
    </div>
  );
}
