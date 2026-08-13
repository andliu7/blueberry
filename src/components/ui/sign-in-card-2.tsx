"use client";

import { motion } from "motion/react";
import { ShieldCheck } from "lucide-react";
import { BlueberryMark } from "@/components/ui/blueberry-mark";

export type AuthCardMode = "signin" | "signup" | "staff";

export function SignInCard({
  mode,
  configured,
  ready,
  error,
  onSignIn,
  googleButtonRef,
}: {
  mode: AuthCardMode;
  configured: boolean;
  ready: boolean;
  error: string | null;
  onSignIn: () => void;
  googleButtonRef: (element: HTMLDivElement | null) => void;
}) {
  const signup = mode === "signup";
  const staff = mode === "staff";
  const title = staff ? "Staff sign-in" : signup ? "Create your account" : "Welcome back";
  const detail = staff
    ? "Use the Google account authorized for Blueberry staff work."
    : signup
      ? "Your Google account becomes your Blueberry member profile."
      : "Sign in to keep your Blueberry profile connected.";

  return (
    <motion.section
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.28, ease: "easeOut" }}
      className="relative w-full max-w-sm overflow-hidden rounded-3xl border border-white/12 bg-[#171327]/80 p-7 shadow-[0_28px_90px_rgba(0,0,0,0.48)] backdrop-blur-xl"
    >
      <div className="pointer-events-none absolute inset-x-10 top-0 h-px bg-gradient-to-r from-transparent via-white/70 to-transparent" />
      <div className="flex flex-col items-center text-center">
        <BlueberryMark eyes className="blueberry-glow-art size-12" />
        <h1 className="title-face mt-5 text-3xl text-white">{title}</h1>
        <p className="mt-2 max-w-xs text-sm leading-6 text-white/60">{detail}</p>
      </div>

      <div className="mt-7 space-y-3">
        {!configured ? (
          <p className="rounded-xl border border-amber-300/20 bg-amber-200/10 px-4 py-3 text-sm leading-5 text-amber-100/80">
            Google sign-in is not configured for this build yet.
          </p>
        ) : (
          <>
            {/* One Google button. This card used to show a styled one and
                Google's own under an "or", which offered a choice between the
                same flow and itself. */}
            <div className="flex justify-center" ref={googleButtonRef} />
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
        {error && <p className="text-center text-sm text-red-200">{error}</p>}
      </div>

      <div className="mt-6 flex items-start gap-2 border-t border-white/10 pt-4 text-xs leading-5 text-white/45">
        <ShieldCheck className="mt-0.5 size-3.5 shrink-0" />
        <p>Member access is automatic. Staff permissions are verified by Blueberry&apos;s server.</p>
      </div>

      {!staff && (
        <p className="mt-5 text-center text-sm text-white/60">
          {signup ? "Already have an account?" : "New to Blueberry?"}{" "}
          <a href={signup ? "#/signin" : "#/signup"} className="font-semibold text-white underline decoration-white/35 underline-offset-4 transition hover:decoration-white">
            {signup ? "Sign in" : "Sign up"}
          </a>
        </p>
      )}
    </motion.section>
  );
}
