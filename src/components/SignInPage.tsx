"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { ArrowLeft, CalendarDays, CircleCheck, PencilLine, Sparkles, Users } from "lucide-react";
import { BlueberryMark } from "@/components/ui/blueberry-mark";
import { SupabaseAuth } from "@/components/ui/supabase-auth";
import { StaffSignInNotice } from "@/components/ui/staff-signin-notice";
import { useSession } from "@/lib/useSession";
import { supabaseConfigured } from "@/lib/supabase";
import { cn } from "@/lib/utils";

/**
 * One sign-in page, two modes.
 *
 * It used to be three — sign in, sign up, and a separate staff route with its
 * own narrower card — because two auth systems disagreed about who could write,
 * so staff genuinely had to come in through a different door. One provider
 * removed the reason: everyone signs in the same way and the role is read from
 * `profiles`. `#/staff` still resolves here so old links keep working, but it
 * is the same screen.
 *
 * Google is the large button and the password fields are folded away, because
 * for almost everyone here the honest answer is that they do not need a
 * password at all. Presenting a form first and Google as an afterthought asks
 * people to invent a credential they will forget, to reach an account they
 * could have had in one click.
 */

/** What signing in is actually for. Concrete, not "unlock your experience". */
const WHAT_YOU_GET = [
  {
    Icon: CalendarDays,
    title: "The course calendar",
    body: "Exams, deadlines and labs for CHEM241, in one place.",
  },
  {
    Icon: Users,
    title: "Book office hours",
    body: "Pick a thirty-minute slot with a TA when they are free.",
  },
  {
    Icon: Sparkles,
    title: "Your own saved work",
    body: "Cards you make and mechanisms you have drawn, kept to your account.",
  },
  {
    Icon: PencilLine,
    title: "Editing, if you are staff",
    body: "Lesson pages, reactions and office hours. Granted by role, not by asking.",
    staffOnly: true,
  },
] as const;

export function SignInPage({ mode = "signin" }: { mode?: "signin" | "signup" | "staff" }) {
  // `staff` is an alias for signing in, kept so existing links do not break.
  const [signup, setSignup] = useState(mode === "signup");
  const session = useSession();
  const reduced = useReducedMotion();

  // This page paints its own dark surface, so it forces the theme while it is
  // open and puts it back on the way out.
  useEffect(() => {
    const root = document.documentElement;
    const hadDark = root.classList.contains("dark");
    root.classList.add("dark");
    return () => {
      if (!hadDark) root.classList.remove("dark");
    };
  }, []);

  return (
    <main className="relative min-h-dvh overflow-hidden bg-[#171327] text-white">
      {/* The intro photograph, dimmed. Same image the opening screen uses, so
          arriving here does not feel like leaving the site. */}
      <img
        src={`${import.meta.env.BASE_URL}backgrounds/intro-dark.webp`}
        alt=""
        aria-hidden
        className="absolute inset-0 size-full object-cover opacity-25"
      />
      <div
        aria-hidden
        className="absolute inset-0 bg-gradient-to-br from-[#171327]/90 via-[#171327]/70 to-indigo-950/80"
      />

      <div className="relative mx-auto flex min-h-dvh w-full max-w-5xl flex-col px-4 py-6 sm:px-6">
        <a
          href="#/home"
          className="inline-flex min-h-11 w-fit items-center gap-2 text-sm font-semibold text-white/60 transition hover:text-white"
        >
          <ArrowLeft className="size-4" />
          Back to Blueberry
        </a>

        <div className="grid flex-1 items-center gap-8 py-6 lg:grid-cols-[1fr_400px] lg:gap-12">
          {/* ---------------------------- what it is for --------------------------- */}
          <div className="order-2 lg:order-1">
            <div className="flex items-center gap-3">
              <BlueberryMark eyes className="size-10 shrink-0" />
              <div>
                <h1 className="title-face text-3xl leading-none sm:text-4xl">Blueberry</h1>
                <p className="text-sm text-white/50">Organic chemistry, University of Maryland</p>
              </div>
            </div>

            <ul className="mt-7 flex flex-col gap-4">
              {WHAT_YOU_GET.map(({ Icon, title, body, ...rest }) => (
                <li key={title} className="flex gap-3">
                  <span className="mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-xl bg-white/10">
                    <Icon className="size-4 text-indigo-300" />
                  </span>
                  <div className="min-w-0">
                    <p className="flex flex-wrap items-center gap-2 text-sm font-semibold">
                      {title}
                      {"staffOnly" in rest && rest.staffOnly && (
                        <span className="rounded-md bg-indigo-500/20 px-1.5 py-0.5 text-[.65rem] font-semibold uppercase tracking-wide text-indigo-200">
                          Staff
                        </span>
                      )}
                    </p>
                    <p className="mt-0.5 text-sm leading-6 text-white/55">{body}</p>
                  </div>
                </li>
              ))}
            </ul>

            <p className="mt-7 text-sm leading-6 text-white/40">
              Decks and lessons are readable without an account. Signing in is for the things
              that belong to you.
            </p>
          </div>

          {/* ------------------------------- the card ------------------------------ */}
          <div className="order-1 lg:order-2">
            <div className="rounded-3xl border border-white/10 bg-white/[0.06] p-5 shadow-2xl backdrop-blur-xl sm:p-6">
              {session ? (
                <SignedIn session={session} />
              ) : !supabaseConfigured ? (
                <p className="rounded-xl border border-amber-300/20 bg-amber-200/10 px-4 py-3 text-sm leading-5 text-amber-100/80">
                  Sign-in is not configured for this build yet.
                </p>
              ) : (
                <>
                  {/* Two tabs with a sliding indicator rather than two routes.
                      Switching used to be a navigation, which threw away
                      anything typed and made a decision feel like a commitment.
                      Nothing is lost now, so trying the other one is free. */}
                  <div
                    role="tablist"
                    aria-label="Sign in or create an account"
                    className="relative mb-5 grid grid-cols-2 rounded-xl bg-white/5 p-1"
                  >
                    {(["signin", "signup"] as const).map((tab) => {
                      const active = (tab === "signup") === signup;
                      return (
                        <button
                          key={tab}
                          role="tab"
                          aria-selected={active}
                          onClick={() => setSignup(tab === "signup")}
                          className={cn(
                            "relative z-10 min-h-11 cursor-pointer rounded-lg text-sm font-semibold transition-colors",
                            active ? "text-white" : "text-white/50 hover:text-white/75",
                          )}
                        >
                          {active && (
                            <motion.span
                              layoutId="auth-tab"
                              transition={
                                reduced
                                  ? { duration: 0 }
                                  : { type: "spring", stiffness: 400, damping: 32 }
                              }
                              className="absolute inset-0 -z-10 rounded-lg bg-white/12"
                            />
                          )}
                          {tab === "signin" ? "Sign in" : "Create account"}
                        </button>
                      );
                    })}
                  </div>

                  {/* Said plainly, above the buttons rather than below them.
                      The single most common thing to get wrong here is assuming
                      a password is required. */}
                  <p className="mb-4 text-sm leading-6 text-white/60">
                    <span className="font-semibold text-white">
                      You do not need a password.
                    </span>{" "}
                    Continue with Google and you are done — most people should use that. An
                    email and password is there if you would rather.
                  </p>

                  {/* Crossfade rather than a hard swap, so the card does not
                      appear to reload when the two forms are mostly the same. */}
                  <AnimatePresence mode="wait" initial={false}>
                    <motion.div
                      key={signup ? "signup" : "signin"}
                      initial={reduced ? { opacity: 0 } : { opacity: 0, y: 6 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={reduced ? { opacity: 0 } : { opacity: 0, y: -6 }}
                      transition={{ duration: reduced ? 0 : 0.16 }}
                    >
                      <SupabaseAuth signup={signup} />
                    </motion.div>
                  </AnimatePresence>
                </>
              )}
            </div>

            {!session && (
              <p className="mt-4 px-1 text-xs leading-5 text-white/35">
                Staff access is decided by the server from your account, not by anything this
                page can be told. Signing in with a university address is enough.
              </p>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}

/** Already signed in: say who, say what that gets you, and get out of the way. */
function SignedIn({ session }: { session: NonNullable<ReturnType<typeof useSession>> }) {
  const staff = session.role === "admin" || session.role === "owner";
  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-3">
        {session.picture ? (
          <img
            src={session.picture}
            alt=""
            aria-hidden
            className="size-11 shrink-0 rounded-full object-cover"
          />
        ) : (
          <span className="flex size-11 shrink-0 items-center justify-center rounded-full bg-white/10">
            <CircleCheck className="size-5 text-emerald-300" />
          </span>
        )}
        <div className="min-w-0">
          <p className="truncate font-semibold">{session.name ?? session.email}</p>
          <p className="truncate text-sm text-white/50">{session.email}</p>
        </div>
      </div>

      <p className="rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 text-sm text-white/70">
        Signed in as{" "}
        <span className="font-semibold text-white">
          {staff ? (session.role === "owner" ? "an owner" : "course staff") : "a student"}
        </span>
        {staff && ". Editing controls appear on the lessons, calendar and tutoring pages."}
      </p>

      <StaffSignInNotice session={session} action="Importing a syllabus, the decks and Ask Blueberry" />

      <div className="flex flex-col gap-2">
        <a
          href="#/home"
          className="flex min-h-11 items-center justify-center rounded-xl bg-gradient-to-r from-indigo-500 to-fuchsia-500 px-4 text-sm font-semibold text-white transition hover:brightness-110"
        >
          Go to Blueberry
        </a>
        {staff && (
          <a
            href="#/lessons"
            className="flex min-h-11 items-center justify-center rounded-xl border border-white/15 px-4 text-sm font-semibold text-white/80 transition hover:bg-white/5"
          >
            Open the lessons editor
          </a>
        )}
        <button
          type="button"
          onClick={session.signOut}
          className="min-h-11 cursor-pointer text-sm text-white/45 transition hover:text-white/75"
        >
          Sign out
        </button>
      </div>
    </div>
  );
}

export default SignInPage;
