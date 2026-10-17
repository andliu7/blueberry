import { useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { X } from "lucide-react";
import { ProfileCard } from "@/components/ui/profile-card";
import { GradientMenuButton } from "@/components/ui/gradient-menu";
import { GithubMark, LinkedinMark } from "@/components/ui/brand-marks";
import { MiniMacbook } from "@/components/ui/animated-macbook";
import { CMNS_URL, GITHUB_URL, LINKEDIN_URL, PREHEALTH_URL, SITE_NAME } from "@/data/site";

/**
 * The About card: a card that comes up over whatever you were already looking
 * at, because it is a paragraph you read and dismiss rather than somewhere you
 * go. Contact is a page of its own because it holds a form.
 *
 * Opened from the footer's "About" (2026-10-07). It used to hang off a
 * Contact-and-About button pair in every page header (`SiteActions`); the
 * replan's header carries only the five destinations, search and the account,
 * so the pair went and the card moved to the footer beside Contact.
 */

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
                    not already signed in, a poor thing to invite people to
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
