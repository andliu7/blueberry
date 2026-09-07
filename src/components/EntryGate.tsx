import { useEffect, useRef, useState } from "react";
import { motion, useReducedMotion } from "motion/react";
import { ArrowRight, SlidersHorizontal } from "lucide-react";
import { SystemWindow } from "@/components/ui/system-window";
import { MechanismBoard } from "@/components/ui/mechanism-board";
import { TextScramble } from "@/components/ui/text-scramble";
import { AnimatedThemeToggler } from "@/components/ui/animated-theme-toggler";
import { useDeviceFrame } from "@/lib/deviceFrame";
import { useIsDark } from "@/lib/useIsDark";
import { cn } from "@/lib/utils";

/**
 * The one screen between "Get Started" and the first question.
 *
 * It is a system window in the sense Solo Leveling means it: something
 * announces a challenge, states what it costs and what it pays, and waits for
 * one press. That is a good fit here for a reason beyond the look. The funnel
 * behind this asks for three things before it teaches anything, and a stranger
 * who has just pressed a button on a landing page deserves to be told what
 * they are walking into before the first field appears rather than after the
 * third one.
 *
 * **This is a gate, not a settings page.** The default path is exactly one
 * press: the primary is the first thing focused and it lands on the first real
 * question of the funnel. The two appearance settings open in place, below it,
 * and the press never moves or hides while they are open.
 *
 * **What it does not do.** It does not mention signing in, it does not mention
 * money, and it does not count anything down. The panel's one borrowed move
 * that had to be turned around is the penalty: in the source, refusing the
 * System costs you. Here refusing costs nothing, because this is read by people
 * revising for an exam at one in the morning and a threat is the wrong first
 * sentence for them.
 *
 * ## What the blind round changed, and why
 *
 * A blind critic put this beside Duolingo's opening and picked Duolingo, on
 * first-read speed. The finding was specific and it was right: the plain
 * promise was the slowest thing on the screen. The headline was monospace at
 * display size over two lines, and it sat inside a four-part briefing (an
 * eyebrow, OBJECTIVES, PENALTY FOR REFUSAL) that a stranger had to read
 * through to reach a button labelled ENTER, which names no reward.
 *
 * Four changes, and they are all the same change:
 *
 * 1. **The promise is one short sans line.** Inter, bold, display size. It says
 *    what you get rather than where you are. Monospace is confined to the
 *    chrome now, which is where the source stills put it too: in those frames
 *    the one loud line is a heavy gothic sans and everything machine-voiced
 *    around it is small.
 * 2. **The three all-caps section labels are gone**, folded into one subhead
 *    and one guarantee. That is roughly half the words a first-time visitor has
 *    to process, and the guarantee that was buried under PENALTY FOR REFUSAL
 *    now stands on its own where it can be read at a glance.
 * 3. **The button is labelled with the thing itself.** "Start the first lesson"
 *    rather than a mode word, and the settings beside it stop being a button of
 *    equal footprint: they are a quiet line under the press, because appearance
 *    is not a peer of the one action that matters.
 * 4. **There is an image, and it is the product.** `MechanismBoard` draws the
 *    cyanohydrin opening on a loop and marks the step correct. It gives the
 *    panel the colour event it did not have (fuchsia arrows and a green verdict
 *    against the navy, which is how the source frames use colour too), it fills
 *    the desktop field so the window stops reading as a modal floating in empty
 *    space, and it shows the one thing no sentence here can: you push the
 *    arrows yourself. Nine SVG paths, so it costs nothing.
 *
 * The escape moved out of the header band for the same reason. A dismissal in a
 * window's top right is the most legible "you may leave" in interface design,
 * and it was sitting in the corner of a screen whose whole job is to make one
 * press obvious. It still exists, below the panel, small.
 */

/** Where the primary goes: the funnel's first real question, not its welcome beat. */
const FIRST_QUESTION = "#/start/course";

/**
 * The promise, and the largest thing on the screen.
 *
 * A constant because it is rendered twice: once invisibly to reserve the box,
 * once scrambling inside it. See `Headline` below.
 */
const HEADLINE = "A real organic chemistry lesson, right now.";

/**
 * One face, one size, both copies. Anything that differs makes the box wrong.
 *
 * The phone size is measured, not chosen. A 393px screen leaves this column
 * 303px, and "A real organic chemistry" needs 294px at 26px and 318px at 28px,
 * so 1.75rem forced a third line and 1.625rem does not. Two lines is worth the
 * two points here: the third line was "now." on its own, and a four-character
 * tail is the shape that makes a promise look like an afterthought.
 *
 * `text-balance` below `@5xl` and greedy at and above it, because the two
 * widths want opposite things. The desktop column is sized so greedy wrapping
 * breaks after "chemistry" into two even lines, and balancing there put
 * "chemistry" alone in the middle of three. Narrow, balance is the safety net
 * for anything tighter than the 393px measured above, where three lines are
 * unavoidable and the only question is whether they are even.
 */
const HEADLINE_TYPE =
  "text-[1.625rem] leading-[1.1] font-bold tracking-tight text-balance @xl:text-[2.1rem] @5xl:text-[2.45rem] @5xl:text-wrap";

export function EntryGate() {
  const reduce = useReducedMotion();
  const [configuring, setConfiguring] = useState(false);

  const enter = () => {
    window.location.hash = FIRST_QUESTION;
  };

  /**
   * Enter and Escape do the obvious things.
   *
   * The primary is focused on arrival, so it handles its own Enter key and the
   * guard below keeps this from firing the navigation a second time. This
   * exists for the case where focus has moved somewhere inert. Escape closes
   * the settings, which is the gesture anybody already expects from a drawer.
   */
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setConfiguring(false);
        return;
      }
      if (event.key !== "Enter") return;
      const target = event.target as HTMLElement | null;
      if (target && target.closest("button, a, input, textarea, select")) return;
      window.location.hash = FIRST_QUESTION;
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  /**
   * The corner dock steps off the gate.
   *
   * On <html> rather than in component state because the timer, the assistant
   * and the notification bell are mounted outside `App` on purpose so they
   * survive route changes, which means a class hook is the only line of
   * communication to them that does not undo that. The home hero already does
   * exactly this with `data-hero`; see index.css.
   */
  useEffect(() => {
    const el = document.documentElement;
    el.dataset.gate = "";
    return () => {
      delete el.dataset.gate;
    };
  }, []);

  return (
    /* `@container` plus the `@xl:` / `@5xl:` prefixes below are Tailwind's
       container queries: they break on the width of THIS element rather than on
       the width of the browser window. That is not a preference here, it is the
       only thing that works. One of the two settings this gate offers renders
       the whole app inside a 430px phone bezel in the middle of a desktop
       window, and a viewport `lg:` is still true in that case, so the two
       column desktop layout stayed on inside the bezel and shredded it. The
       panel has to lay out on the room it actually has. */
    <div className="sysgate @container relative flex min-h-svh flex-col items-center justify-center overflow-hidden px-5 py-10">
      <style>{`
        .sysgate{
          background:
            radial-gradient(120% 90% at 50% 0%, rgba(29,111,208,0.10) 0%, transparent 60%),
            linear-gradient(#eef2f8, #e4eaf3);
        }
        .dark .sysgate{
          background:
            radial-gradient(120% 90% at 50% 0%, rgba(60,160,255,0.22) 0%, transparent 62%),
            linear-gradient(#050912, #02040a);
        }
        /* The grid the window is projected onto. Two hairline gradients, the
           same trick the site body already uses, in the cyan rather than the
           slate and fading out before it reaches the edges. */
        .sysgate-grid{
          background-image:
            linear-gradient(rgba(29,111,208,0.10) 1px, transparent 1px),
            linear-gradient(90deg, rgba(29,111,208,0.10) 1px, transparent 1px);
          background-size: 44px 44px;
          -webkit-mask-image: radial-gradient(80% 60% at 50% 45%, #000 0%, transparent 78%);
          mask-image: radial-gradient(80% 60% at 50% 45%, #000 0%, transparent 78%);
        }
        .dark .sysgate-grid{
          background-image:
            linear-gradient(rgba(120,205,255,0.10) 1px, transparent 1px),
            linear-gradient(90deg, rgba(120,205,255,0.10) 1px, transparent 1px);
        }
      `}</style>

      <div aria-hidden className="sysgate-grid pointer-events-none absolute inset-0" />

      <motion.div
        /* Wide enough on a desktop that the window is the field rather than a
           card sitting in one. At `max-w-xl` it read as a dialog you would
           dismiss, which is the last thing a front door should look like. */
        className="relative w-full max-w-xl @5xl:max-w-5xl"
        initial={reduce ? false : { opacity: 0, scaleY: 0.88, y: 8 }}
        animate={{ opacity: 1, scaleY: 1, y: 0 }}
        transition={{ duration: 0.34, ease: [0.16, 1, 0.3, 1] }}
      >
        <SystemWindow label="System">
          {/* Art and text side by side above `lg`, stacked below it with the
              art first. That is the bar's own composition on both shapes, and
              it is the shape of our landing hero too, so the gate reads as the
              next frame of the press that opened it rather than as a different
              product. */}
          <div className="grid gap-6 px-6 py-7 @xl:px-8 @xl:py-9 @5xl:grid-cols-[1.2fr_0.8fr] @5xl:items-center @5xl:gap-10 @5xl:px-11 @5xl:py-12">
            <div className="order-1 flex justify-center @5xl:order-2">
              {/* The phone width is a floor, not a taste call: the verdict pill
                  under the drawing is fixed at `text-xs`, so below about 15rem
                  "Correct - nucleophilic addition" wraps onto two lines and the
                  one element carrying the green stops reading as a stamp. */}
              <MechanismBoard className="w-[78%] max-w-[15rem] @xl:w-[48%] @5xl:w-full @5xl:max-w-[20rem]" />
            </div>

            <div className="order-2 min-w-0 @5xl:order-1">
              <Headline />

              {/* What the two minutes contain, in one breath. This is where the
                  objectives list went: the same two questions, as a clause,
                  because a stranger deciding whether to press does not need
                  them itemised under a heading. */}
              <p className="mt-4 max-w-md text-[0.95rem] leading-relaxed text-[color:var(--sysw-dim)] @xl:text-base @5xl:text-lg">
                Two quick questions about your course, then you are straight into
                it. No account, nothing to pay.
              </p>

              {/* The best sentence on the screen, and it used to be filed under
                  a label that did the reading for it. On its own line now, with
                  the square that used to mark the objectives. */}
              <p className="mt-5 flex items-start gap-3 text-sm @xl:text-[0.95rem]">
                <span
                  aria-hidden
                  className="mt-[0.55em] size-1.5 shrink-0 bg-[color:var(--sysw-edge)]"
                />
                <span className="min-w-0 flex-1">
                  Nothing here ever costs you anything for being wrong.
                </span>
              </p>

              {/* The ask. One press, named for what it does. */}
              <button
                type="button"
                autoFocus
                onClick={enter}
                className={cn(
                  "bb-press-soft group mt-7 flex w-full cursor-pointer items-center justify-center gap-2.5",
                  "border border-[color:var(--sysw-edge)] bg-[color:var(--sysw-edge)] px-7 py-4",
                  "text-base font-semibold tracking-tight @xl:text-lg",
                  "text-white dark:text-[#04101d]",
                  "shadow-[0_0_40px_-8px_var(--sysw-glow)]",
                  "focus-visible:ring-2 focus-visible:ring-[color:var(--sysw-edge)] focus-visible:ring-offset-2 focus-visible:ring-offset-transparent focus-visible:outline-none",
                )}
              >
                Start the first lesson
                <ArrowRight className="size-5 transition-transform duration-300 group-hover:translate-x-1" />
              </button>

              {/* Appearance, at the weight appearance deserves. It was an
                  outlined button the same width and height as the press, which
                  gave two settings equal billing with the entire point of the
                  screen. A line does the same job and takes none of the room.
                  Still a 44px target: the padding carries it. */}
              <button
                type="button"
                onClick={() => setConfiguring((open) => !open)}
                aria-expanded={configuring}
                aria-controls="sysgate-config"
                className={cn(
                  "mt-1 flex w-full cursor-pointer items-center justify-center gap-2 py-3",
                  "font-mono text-[0.58rem] tracking-[0.26em] text-[color:var(--sysw-dim)] uppercase",
                  "hover:text-[color:var(--sysw-ink)]",
                  "focus-visible:ring-1 focus-visible:ring-[color:var(--sysw-edge)] focus-visible:outline-none",
                  configuring && "text-[color:var(--sysw-ink)]",
                )}
              >
                <SlidersHorizontal aria-hidden className="size-3" />
                Appearance
              </button>

              {configuring && <Config />}
            </div>
          </div>
        </SystemWindow>
      </motion.div>

      {/* The way out, off the window entirely.

          It has to exist: a window you cannot dismiss is the source material's
          joke rather than a thing to ship. But in the header band it sat in the
          one corner of a system window everybody has been trained to read as
          "close", on a screen whose only job is to make one press obvious.
          Down here it is reachable and it is not an invitation.

          Its colour is a Tailwind pair rather than `--sysw-dim`, and that is
          load bearing: the `--sysw-*` variables are declared on `.sysw`, so
          outside the window they resolve to nothing and the link inherits
          whatever the body happens to be. On this near-black ground that read
          as almost invisible, which is a contrast failure rather than the
          quietness it was going for. */}
      <a
        href="#/home"
        className="relative mt-6 font-mono text-[0.58rem] tracking-[0.24em] text-slate-500 uppercase underline-offset-4 hover:text-slate-800 hover:underline dark:text-stone-400 dark:hover:text-stone-100"
      >
        Not now
      </a>
    </div>
  );
}

/**
 * The headline, resolving into existence, in a box that does not move.
 *
 * `TextScramble` swaps every character for a random one and walks the real text
 * back in left to right. In a monospace face that is free, which is why this
 * headline used to be monospace; in a proportional face the glyph advances
 * differ, so the line rewraps while it settles and shoves everything under it
 * down the page.
 *
 * The fix is the boring one: render the finished text once, invisible, to
 * reserve the box, and lay the scrambling copy over it in the same grid cell.
 * The two share `HEADLINE_TYPE` so the reservation is exact. The scramble is
 * short on purpose, because this screen lost a blind round on how fast its
 * promise reads and a headline spending a second as noise is the same bug in a
 * prettier coat.
 */
function Headline() {
  return (
    <div className="grid">
      <span aria-hidden className={cn("invisible col-start-1 row-start-1", HEADLINE_TYPE)}>
        {HEADLINE}
      </span>
      <TextScramble
        as="h1"
        duration={0.4}
        speed={0.02}
        className={cn("sysw-edge col-start-1 row-start-1", HEADLINE_TYPE)}
      >
        {HEADLINE}
      </TextScramble>
    </div>
  );
}

/**
 * Exactly two settings, and both are about how it looks.
 *
 * The list is short deliberately and it is not a placeholder for a longer one.
 * Anything that changes what a student is taught belongs inside the product
 * where their answers can inform it, not on a gate in front of it, and
 * anything about an account belongs at the end of the funnel where there is
 * something worth protecting.
 */
function Config() {
  const isDark = useIsDark();
  const [framed, setFramed] = useDeviceFrame();
  const box = useRef<HTMLDivElement>(null);

  /**
   * Brings itself into view on a phone.
   *
   * The drawer opens below the press, which is the point: the button everybody
   * came for never moves. On a tall panel that puts it under the fold, so it
   * scrolls to itself once, on mount. `block: "end"` rather than "center", so
   * the page moves the least amount that shows the whole thing.
   */
  useEffect(() => {
    box.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, []);

  return (
    <div
      id="sysgate-config"
      ref={box}
      className="mt-2 border border-[color:var(--sysw-line-soft)] px-4 py-1 @xl:px-5"
    >
      <Setting label="Appearance" value={isDark ? "Dark" : "Light"}>
        <AnimatedThemeToggler />
      </Setting>

      <div aria-hidden className="h-px w-full bg-[color:var(--sysw-line-soft)]" />

      <Setting label="Device frame" value={framed ? "On" : "Off"}>
        <Switch
          on={framed}
          onChange={setFramed}
          label="Render the app inside a device frame"
        />
      </Setting>
    </div>
  );
}

function Setting({
  label,
  value,
  children,
}: {
  label: string;
  value: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-center gap-4 py-3">
      <div className="min-w-0 flex-1">
        <p className="font-mono text-[0.62rem] tracking-[0.34em] text-[color:var(--sysw-dim)] uppercase">
          {label}
        </p>
        <p className="mt-1 font-mono text-sm">{value}</p>
      </div>
      <div className="flex shrink-0 items-center">{children}</div>
    </div>
  );
}

/** A squared-off switch, because nothing in this window is round. */
function Switch({
  on,
  onChange,
  label,
}: {
  on: boolean;
  onChange: (next: boolean) => void;
  label: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      aria-label={label}
      onClick={() => onChange(!on)}
      className={cn(
        "bb-press-soft relative h-7 w-14 cursor-pointer border transition-colors",
        "focus-visible:ring-2 focus-visible:ring-[color:var(--sysw-edge)] focus-visible:outline-none",
        on
          ? "border-[color:var(--sysw-edge)] bg-[color:var(--sysw-glow)]"
          : "border-[color:var(--sysw-line)] bg-transparent",
      )}
    >
      <span
        aria-hidden
        className={cn(
          "absolute top-1/2 block h-4 w-5 -translate-y-1/2 transition-all",
          on
            ? "left-[calc(100%-1.5rem)] bg-[color:var(--sysw-edge)]"
            : "left-1 bg-[color:var(--sysw-line)]",
        )}
      />
    </button>
  );
}

export default EntryGate;
