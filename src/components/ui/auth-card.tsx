"use client";

import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { ArrowRight, Check, ShieldCheck } from "lucide-react";
import { BlueberryMark } from "@/components/ui/blueberry-mark";
import { ProfileFields } from "@/components/ui/profile-fields";
import { cn } from "@/lib/utils";

/**
 * The large sign-in card, with the two sides trading places.
 *
 * The mode still lives in the hash, so `#/signin` and `#/signup` remain real
 * addresses you can link someone to. Switching sides changes the hash, and
 * because `App` renders the same `SignInPage` for both routes the component is
 * updated rather than remounted, which is what lets this animate at all. A
 * toggle held in local state would have animated too and broken every link.
 *
 * The swap is a layout animation: the two halves keep their DOM order and only
 * their `order` changes at `md`, and motion animates from the measured before
 * and after boxes. Nothing is duplicated for the two arrangements, so the form
 * cannot drift out of step with itself.
 */

export type AuthSide = "signin" | "signup";

const SPRING = { type: "spring" as const, stiffness: 260, damping: 32, mass: 0.9 };

const COPY = {
  signin: {
    title: "Welcome back",
    detail: "Sign in to keep your Blueberry profile connected.",
    action: "Continue with Google",
    asideTitle: "New here?",
    asideDetail:
      "Make an account and your ratings, notes and progress stop living in one browser.",
    asideAction: "Create an account",
    points: [
      "Your decks, where you left them",
      "Progress that follows you between machines",
      "The focus timer and the break room",
    ],
  },
  signup: {
    title: "Create your account",
    detail: "Your Google account becomes your Blueberry member profile.",
    action: "Sign up with Google",
    asideTitle: "Already have one?",
    asideDetail: "Sign in and pick up wherever you stopped.",
    asideAction: "Sign in instead",
    points: [
      "Free, and everything on the site stays free",
      "Nothing is charged and no card is asked for",
      "One Google account, no new password",
    ],
  },
} as const;

export function AuthCard({
  side,
  configured,
  ready,
  error,
  onSignIn,
  googleButtonRef,
}: {
  side: AuthSide;
  configured: boolean;
  ready: boolean;
  error: string | null;
  onSignIn: () => void;
  googleButtonRef: (element: HTMLDivElement | null) => void;
}) {
  const reduced = useReducedMotion();
  const copy = COPY[side];
  const signup = side === "signup";
  const transition = reduced ? { duration: 0 } : SPRING;

  return (
    <motion.section
      initial={reduced ? false : { opacity: 0, y: 18, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={reduced ? { duration: 0 } : { duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
      className="relative max-h-[calc(100dvh-3rem)] w-full max-w-4xl overflow-y-auto overscroll-contain rounded-[1.75rem] border border-white/12 bg-[#171327]/80 shadow-[0_28px_90px_rgba(0,0,0,0.48)] backdrop-blur-xl"
    >
      {/* The hairline along the top edge, as on the staff card. */}
      <div className="pointer-events-none absolute inset-x-16 top-0 h-px bg-gradient-to-r from-transparent via-white/70 to-transparent" />

      <div className="flex flex-col md:flex-row">
        {/* ── The form half ─────────────────────────────────────────────── */}
        <motion.div
          layout
          transition={transition}
          className={cn(
            "flex w-full flex-col justify-center p-6 sm:p-8 md:w-1/2",
            signup ? "md:order-2" : "md:order-1",
          )}
        >
          <AnimatePresence mode="wait" initial={false}>
            <motion.div
              key={side}
              initial={reduced ? false : { opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={reduced ? { opacity: 1 } : { opacity: 0, y: -8 }}
              transition={{ duration: reduced ? 0 : 0.22, ease: "easeOut" }}
            >
              <BlueberryMark eyes className="blueberry-glow-art size-11" />
              <h1 className="title-face mt-5 text-3xl text-white sm:text-4xl">{copy.title}</h1>
              <p className="mt-2 max-w-sm text-sm leading-6 text-white/60">{copy.detail}</p>
            </motion.div>
          </AnimatePresence>

          <div className="mt-7 space-y-3">
            {!configured ? (
              <p className="rounded-xl border border-amber-300/20 bg-amber-200/10 px-4 py-3 text-sm leading-5 text-amber-100/80">
                Google sign-in is not configured for this build yet.
              </p>
            ) : (
              <>
                {/*
                  One Google button, not two.

                  There was a styled button calling `signIn()` and, under an
                  "or", Google's own rendered button. Both start the same flow,
                  so the "or" was offering a choice between a thing and itself.
                  Google's is the one kept: it is the button their branding
                  guidelines describe, and it does not depend on the prompt,
                  which is the part that gets suppressed by browser settings.
                */}
                <div className="flex justify-center" ref={googleButtonRef} />

                {/* The fallback, and only while Google's script is still
                    arriving. Once it has rendered, the button above is live. */}
                {!ready && (
                  <button
                    type="button"
                    onClick={onSignIn}
                    disabled
                    className="flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-white/10 px-4 text-sm font-semibold text-white/50"
                  >
                    Loading Google sign-in…
                  </button>
                )}
              </>
            )}

            {/* Announced rather than only shown: a sign-in failure that only
                appears visually is one a screen reader user never learns of. */}
            <p role="alert" aria-live="polite" className="text-center text-sm text-red-200 empty:hidden">
              {error}
            </p>
          </div>

          <div className="mt-6 flex items-start gap-2 border-t border-white/10 pt-4 text-xs leading-5 text-white/45">
            <ShieldCheck className="mt-0.5 size-3.5 shrink-0" />
            <p>Member access is automatic. Staff permissions are verified by Blueberry&apos;s server.</p>
          </div>
        </motion.div>

        {/* ── The half that invites you to the other side ────────────────── */}
        <motion.div
          layout
          transition={transition}
          className={cn(
            "relative flex w-full flex-col justify-center overflow-hidden p-6 sm:p-8 md:w-1/2",
            "bg-gradient-to-br from-indigo-500/22 via-fuchsia-500/12 to-transparent",
            signup ? "md:order-1" : "md:order-2",
          )}
        >
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 opacity-70"
            style={{
              background:
                "radial-gradient(120% 90% at 80% 10%, rgba(129,140,248,0.28) 0%, transparent 60%)",
            }}
          />

          <AnimatePresence mode="wait" initial={false}>
            <motion.div
              key={side}
              initial={reduced ? false : { opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={reduced ? { opacity: 1 } : { opacity: 0, y: -8 }}
              transition={{ duration: reduced ? 0 : 0.22, ease: "easeOut" }}
              className="relative"
            >
              {/*
                On sign-up this half carries the details Google cannot supply,
                rather than stacking them under the button. Side by side the
                card is two short columns instead of one long one, which is
                what keeps the page on a single screen.
              */}
              {signup ? (
                <>
                  <h2 className="title-face text-xl text-white sm:text-2xl">Tell us who you are</h2>
                  <p className="mt-1.5 text-xs leading-5 text-white/50">
                    None of this is a login, and you can change it later.
                  </p>
                  <ProfileFields className="mt-4" />
                  <p className="mt-4 text-center text-sm text-white/60">
                    {copy.asideTitle}{" "}
                    <a
                      href="#/signin"
                      className="cursor-pointer font-semibold text-white underline decoration-white/35 underline-offset-4 transition hover:decoration-white"
                    >
                      {copy.asideAction}
                    </a>
                  </p>
                </>
              ) : (
                <>
                  <h2 className="title-face text-2xl text-white sm:text-3xl">{copy.asideTitle}</h2>
                  <p className="mt-2 max-w-xs text-sm leading-6 text-white/60">{copy.asideDetail}</p>

                  <ul className="mt-6 space-y-2.5">
                    {copy.points.map((point) => (
                      <li key={point} className="flex items-start gap-2.5 text-sm text-white/70">
                        <Check className="mt-0.5 size-3.5 shrink-0 text-indigo-200" />
                        <span>{point}</span>
                      </li>
                    ))}
                  </ul>

                  {/*
                    An anchor, not a button. It changes the address, so it
                    should behave like one: middle-click, open in a new tab and
                    copy link all work.
                  */}
                  <a
                    href="#/signup"
                    className="mt-7 inline-flex min-h-11 cursor-pointer items-center justify-center gap-2 rounded-xl border border-white/25 px-5 text-sm font-semibold text-white transition duration-200 hover:border-white/60 hover:bg-white/10 focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-[#171327] focus-visible:outline-none"
                  >
                    {copy.asideAction} <ArrowRight className="size-4" />
                  </a>
                </>
              )}
            </motion.div>
          </AnimatePresence>
        </motion.div>
      </div>
    </motion.section>
  );
}

export default AuthCard;
