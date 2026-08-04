import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { Mail, User, X } from "lucide-react";
import { ProfileCard } from "@/components/ui/profile-card";
import { GradientMenuButton } from "@/components/ui/gradient-menu";
import { GithubMark, LinkedinMark } from "@/components/ui/brand-marks";
import { GITHUB_URL, LINKEDIN_URL } from "@/data/site";
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
              name="Andrew Liu"
              role="University of Maryland"
              tags={["Computer Science", "Pre-dental"]}
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
                I'm a Computer Science major at the University of Maryland, and I'm on
                the pre-dental track! My dream is to start my own practice and pursue a
                specialty, all with the purpose of helping others.
              </p>
              <p>
                I really hope that the people using this site are able to take something
                away from it beyond just organic chemistry memorization!
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

  return (
    <div className={cn("flex items-center gap-2", className)}>
      <button type="button" onClick={() => setAboutOpen(true)} className={buttonClass}>
        <User className="h-3.5 w-3.5" />
        About
      </button>

      {showContact && (
        <a href="#/contact" className={buttonClass}>
          <Mail className="h-3.5 w-3.5 transition-transform duration-300 group-hover:-translate-y-0.5" />
          Contact
        </a>
      )}

      <AboutOverlay open={aboutOpen} onClose={close} />
    </div>
  );
}

export default SiteActions;
