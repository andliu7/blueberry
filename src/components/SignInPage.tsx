import { useEffect } from "react";
import { ArrowLeft, ArrowRight, Gauge, LayoutGrid } from "lucide-react";
import { OPEN_ON_ARRIVAL } from "@/components/Dashboard";
import { useSession } from "@/lib/useSession";
import { ShaderAnimation } from "@/components/ui/shader-animation";
import { ExpandingCircle } from "@/components/ui/expanding-circle";
import { BlueberryMark } from "@/components/ui/blueberry-mark";
import { AuthCard } from "@/components/ui/auth-card";
import { SignInCard, type AuthCardMode } from "@/components/ui/sign-in-card-2";
import { useGoogleAuth } from "@/lib/useGoogleAuth";
import { roleLabel } from "@/lib/account";
import { SITE_NAME } from "@/data/site";

/**
 * Sign in, sign up and staff sign-in, on one page in three modes.
 *
 * Members get the wide two-sided card; staff keep the narrow one. That is not
 * an oversight. Staff sign-in has nothing to switch to, so half of a card
 * inviting you to the other side would be half a card advertising nothing.
 *
 * The background is the intro's aurora with a circle opening behind the card,
 * rather than the shader that was here before, so arriving at sign-in looks
 * like arriving at Blueberry.
 */
export function SignInPage({ mode = "signin" }: { mode?: AuthCardMode }) {
  const auth = useGoogleAuth();
  // One session across both providers. Reading `useGoogleAuth` alone meant a
  // signed-in Clerk member was shown the sign-in form as though they were a
  // stranger, and a stale Google session hid that form from everyone else.
  const session = useSession();
  const role = session?.role ?? "member";
  const staff = mode === "staff";

  useEffect(() => {
    const root = document.documentElement;
    const hadDark = root.classList.contains("dark");
    root.classList.add("dark");
    return () => {
      if (!hadDark) root.classList.remove("dark");
    };
  }, []);

  // `h-dvh` with overflow hidden, not `min-h`: this page is meant to sit still
  // on one screen, and `min-h` lets a tall card push the whole thing into a
  // scroll. The card is what shrinks to fit instead.
  return (
    <main className="relative flex h-dvh items-center justify-center overflow-hidden bg-[#171327] px-4 py-6 sm:px-5">
      <ShaderAnimation className="absolute inset-0" cycleSeconds={4.6} />
      <div className="absolute inset-0 bg-[#171327]/55" aria-hidden />
      <ExpandingCircle />

      <a
        href="#/home"
        className="group absolute top-6 left-5 z-10 inline-flex items-center gap-2 text-sm font-semibold text-white/65 transition hover:text-white sm:left-8"
      >
        <ArrowLeft className="size-4 transition-transform group-hover:-translate-x-0.5" /> Back to{" "}
        {SITE_NAME}
      </a>

      <div className={cnWidth(staff || Boolean(session))}>
        {session ? (
          <section className="rounded-3xl border border-white/12 bg-[#171327]/80 p-7 text-center shadow-[0_28px_90px_rgba(0,0,0,0.48)] backdrop-blur-xl">
            <BlueberryMark eyes className="blueberry-glow-art mx-auto size-12" />
            <p className="mt-5 text-xs font-semibold tracking-[0.18em] text-blue-200/70 uppercase">
              {roleLabel(role)} account
            </p>
            <h1 className="title-face mt-2 text-3xl text-white">
              {session.name ? `Hello, ${session.name}` : "You're signed in"}
            </h1>
            <p className="mt-3 text-sm leading-6 text-white/60">{session.email}</p>
            <p className="mt-1 font-mono text-[0.65rem] tracking-wider text-white/35 uppercase">
              via {session.provider}
            </p>

            {/*
              Staff arrive here with two places to be, so they are asked rather
              than sent. A member has only one, and offering a choice of one is
              not a choice.
            */}
            {role === "admin" || role === "owner" ? (
              <div className="mt-7 space-y-2.5">
                <a
                  href="#/workspace"
                  className="flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-white px-4 text-sm font-semibold text-[#171327] transition hover:bg-white/90 focus-visible:ring-2 focus-visible:ring-white focus-visible:outline-none"
                >
                  <LayoutGrid className="size-4" /> Open the workspace
                </a>
                <button
                  type="button"
                  onClick={() => {
                    // Set before the hash changes, read by `useDashboard` once
                    // the destination page has mounted it.
                    try {
                      sessionStorage.setItem(OPEN_ON_ARRIVAL, "1");
                    } catch {
                      /* private browsing; the link below still works */
                    }
                    window.location.hash = "#/home";
                  }}
                  className="flex min-h-11 w-full cursor-pointer items-center justify-center gap-2 rounded-xl border border-white/25 px-4 text-sm font-semibold text-white transition hover:border-white/60 hover:bg-white/10 focus-visible:ring-2 focus-visible:ring-white focus-visible:outline-none"
                >
                  <Gauge className="size-4" /> Go to the dashboard
                </button>
                <a
                  href="#/home"
                  className="block pt-1 text-sm font-semibold text-white/60 underline decoration-white/25 underline-offset-4 transition hover:text-white"
                >
                  Just take me to the site
                </a>
              </div>
            ) : (
              <a
                href="#/home"
                className="mt-7 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-white px-4 text-sm font-semibold text-[#171327] transition hover:bg-white/90 focus-visible:ring-2 focus-visible:ring-white focus-visible:outline-none"
              >
                Continue to Blueberry <ArrowRight className="size-4" />
              </a>
            )}
            {staff && (
              <p className="mt-4 text-xs leading-5 text-white/45">
                Staff access is checked again by the server when you open staff tools.
              </p>
            )}
            {/* Ends both providers, not whichever one happens to be showing.
                Signing out of one and being handed straight back in by the
                other is the bug this replaces. */}
            <button
              onClick={session.signOut}
              className="mt-4 cursor-pointer text-sm font-semibold text-white/60 underline decoration-white/25 underline-offset-4 transition hover:text-white"
            >
              Sign out
            </button>
          </section>
        ) : staff ? (
          <SignInCard
            mode={mode}
            configured={auth.configured}
            ready={auth.ready}
            error={auth.error}
            onSignIn={auth.signIn}
            googleButtonRef={auth.renderButton}
          />
        ) : (
          <AuthCard
            side={mode}
            configured={auth.configured}
            ready={auth.ready}
            error={auth.error}
            onSignIn={auth.signIn}
            googleButtonRef={auth.renderButton}
          />
        )}
      </div>
    </main>
  );
}

/** The wide card needs the room; the narrow ones would look lost in it. */
function cnWidth(narrow: boolean) {
  return narrow
    ? "relative z-10 w-full max-w-sm"
    : "relative z-10 flex w-full max-w-4xl justify-center";
}

export default SignInPage;
