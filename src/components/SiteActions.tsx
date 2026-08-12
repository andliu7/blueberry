import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { Mail, User, X } from "lucide-react";
import { ProfileCard } from "@/components/ui/profile-card";
import { GradientMenuButton } from "@/components/ui/gradient-menu";
import { GithubMark, LinkedinMark } from "@/components/ui/brand-marks";
import { MiniMacbook } from "@/components/ui/animated-macbook";
import { usePageFlip } from "@/components/ui/page-flip";
import { CMNS_URL, GITHUB_URL, LINKEDIN_URL, PREHEALTH_URL, SITE_NAME } from "@/data/site";
import { cn } from "@/lib/utils";

/**
 * The pair of buttons in every page header, and the card one of them opens.
 *
 * About and Contact used to be a single link to a single page that ran both
 * together. They are different kinds of thing and now behave differently: About
 * is a card that comes up over whatever you were already looking at, because it
 * is a paragraph you read and dismiss rather than somewhere you go, and Contact
 * is a page of its own because it holds a form.
 *
 * The header markup was also copied into three files. It lives here now.
 */

const buttonClass =
  "group inline-flex items-center gap-1.5 rounded-full border border-slate-300/70 bg-white/60 px-3 py-1.5 text-sm font-semibold text-slate-600 backdrop-blur transition-colors hover:text-slate-900 dark:border-stone-700/70 dark:bg-stone-900/50 dark:text-stone-400 dark:hover:text-stone-100";

export function AboutOverlay({ open, onClose }: { open: boolean; onClose: () => void }) {
  const reduce = useReducedMotion();
  const closeRef = useRef<HTMLButtonElement>(null);
  const returnFocusTo = useRef<Element | null>(null);

  useEffect(() => {
    if (!open) return;

    returnFocusTo.current = document.activeElement;
    closeRef.current?.focus();

    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);

    // The page behind must not scroll while this is up, or dismissing the card
    // leaves you somewhere you did not choose to be.
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
      (returnFocusTo.current as HTMLElement | null)?.focus?.();
    };
  }, [open, onClose]);

  // Portaled to the body so no transformed or z-indexed ancestor can trap it.
  // The hub alone has a fixed spotlight canvas, a stacking context on `main` and
  // a floating feedback button to sit above.
  return createPortal(
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-[100] flex items-center justify-center p-5"
          initial={reduce ? false : { opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.22 }}
        >
          <div
            className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm dark:bg-black/70"
            onClick={onClose}
            aria-hidden
          />

          <motion.div
            role="dialog"
            aria-modal="true"
            aria-label="About me"
            className="relative w-full max-w-lg"
            initial={reduce ? false : { opacity: 0, scale: 0.94, y: 14 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={reduce ? { opacity: 0 } : { opacity: 0, scale: 0.96, y: 8 }}
            transition={{ type: "spring", stiffness: 260, damping: 24 }}
          >
            <button
              ref={closeRef}
              onClick={onClose}
              aria-label="Close"
              className="absolute -top-3 -right-3 z-10 inline-flex h-9 w-9 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-500 shadow-lg transition-colors hover:text-slate-900 dark:border-stone-700 dark:bg-stone-900 dark:text-stone-400 dark:hover:text-stone-100"
            >
              <X className="h-4 w-4" />
            </button>

            <ProfileCard
              name="About Me"
              role="University of Maryland"
              tags={[
                {
                  label: "Computer Science",
                  href: CMNS_URL,
                  // Opens its lid when you point at the tag, which is what the
                  // `group/cs` on the link is for.
                  icon: <MiniMacbook />,
                },
                { label: "Pre-Dental", href: PREHEALTH_URL },
              ]}
              tilt
              actions={
                <>
                  <GradientMenuButton
                    title="GitHub"
                    icon={<GithubMark />}
                    href={GITHUB_URL}
                    gradientFrom="#334155"
                    gradientTo="#0f172a"
                  />
                  <GradientMenuButton
                    title="LinkedIn"
                    icon={<LinkedinMark />}
                    href={LINKEDIN_URL}
                    gradientFrom="#0a66c2"
                    gradientTo="#004182"
                  />
                </>
              }
            >
              <p>
                Welcome to {SITE_NAME}! Just like the fruit, these decks are small,
                sweet, and meant to be picked up a handful at a time, which is exactly
                how they are designed to be studied.
              </p>
              <p>
                {/* The staff door. Styled as nothing: no underline, no colour, no
                    pointer cursor, so it reads as the word it already was. It
                    leads to the workspace, which shows a sign-in card to anyone
                    not already signed in — a poor thing to invite people to
                    try, hence the invisibility. */}
                I'm{" "}
                <a href="#/workspace" className="cursor-text text-inherit no-underline outline-none">
                  Andrew
                </a>
                ! Thanks for checking us out. I'm a final-year Computer Science major on
                the Pre-Dental track at the University of Maryland. My ultimate dream is
                to start my own dental practice and pursue a specialty, all with the
                purpose of helping others.
              </p>
              <p>
                I really hope you're able to take something valuable away from this site
                that goes far beyond just organic chemistry memorization!
              </p>
            </ProfileCard>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body,
  );
}

/**
 * About and Contact side by side, plus the theme switch.
 *
 * `showContact` is for the contact page itself, which has no reason to offer a
 * link to where you already are.
 */
export function SiteActions({
  className,
  showContact = true,
}: {
  className?: string;
  showContact?: boolean;
}) {
  const [aboutOpen, setAboutOpen] = useState(false);
  const close = useCallback(() => setAboutOpen(false), []);
  const flipTo = usePageFlip();
  const reduce = useReducedMotion();

  /**
   * Contact leaves to the right and About slides right into the space it was
   * using, the way Expand All dissolves into Collapse All when it has nothing
   * left to do.
   *
   * It is leaving the page, so the pair is about to stop being a pair. Letting
   * it vanish would read as the button having been removed; letting the row
   * close up behind it reads as the two becoming one thing again, which is what
   * they are once you have arrived.
   */
  const [merging, setMerging] = useState(false);

  /**
   * How far the pair moves, measured rather than guessed.
   *
   * This was a hardcoded 96px, which was only ever right for the word "Contact"
   * at the padding it had on the day it was written. Relabelling either button,
   * or changing `buttonClass`, would silently leave About sliding to the wrong
   * place.
   *
   * The distance between the two left edges, rather than either button's width.
   * Measured live: About sits at x=913 and Contact at x=1006, so About has to
   * travel 93px to land exactly where Contact started. Reaching for Contact's
   * own width (95) or About's (85) gets a number that looks about right and is
   * wrong by the size of the gap, in opposite directions.
   */
  const aboutRef = useRef<HTMLButtonElement>(null);
  const contactRef = useRef<HTMLAnchorElement>(null);
  const [shift, setShift] = useState(0);

  const goToContact = (e: React.MouseEvent) => {
    e.preventDefault();
    if (reduce) {
      flipTo("#/contact");
      return;
    }
    // Measured at the moment of the click rather than on mount, so a font that
    // swaps in late or a zoom change cannot leave a stale number behind.
    const a = aboutRef.current?.getBoundingClientRect();
    const c = contactRef.current?.getBoundingClientRect();
    setShift(a && c ? c.left - a.left : 93);
    setMerging(true);
    // Long enough for the row to close up, short enough that the sheet starts
    // turning while the merge still reads as one movement.
    window.setTimeout(() => flipTo("#/contact"), 260);
  };

  return (
    <div className={cn("relative flex items-center gap-2", className)}>
      <motion.button
        ref={aboutRef}
        type="button"
        onClick={() => setAboutOpen(true)}
        className={buttonClass}
        // Slides right into the space Contact is vacating, so the row closes up
        // rather than leaving a hole where a button used to be.
        animate={merging ? { x: shift } : { x: 0 }}
        transition={{ type: "spring", stiffness: 320, damping: 26 }}
      >
        <User className="h-3.5 w-3.5" />
        About
      </motion.button>

      {showContact && (
        <motion.a
          ref={contactRef}
          href="#/contact"
          onClick={goToContact}
          className={buttonClass}
          animate={
            merging
              ? // Out to the right, shrinking as it goes. The theme switch sits
                // just beyond it and is not ours to move, so the fade is front
                // loaded: gone by roughly the time it would reach it.
                { x: shift, scale: 0.55, opacity: 0 }
              : { x: 0, scale: 1, opacity: 1 }
          }
          transition={{
            type: "spring",
            stiffness: 320,
            damping: 26,
            opacity: { duration: 0.16, ease: "easeIn" },
          }}
        >
          <Mail className="h-3.5 w-3.5 transition-transform duration-300 group-hover:-translate-y-0.5" />
          Contact
        </motion.a>
      )}

      <AboutOverlay open={aboutOpen} onClose={close} />
    </div>
  );
}

export default SiteActions;
