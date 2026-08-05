import { useEffect } from "react";
import { ArrowLeft, LogOut, ShieldCheck, Upload } from "lucide-react";
import { ShaderAnimation } from "@/components/ui/shader-animation";
import { BlueberryMark } from "@/components/ui/blueberry-mark";
import { useGoogleAuth } from "@/lib/useGoogleAuth";
import { SITE_NAME } from "@/data/site";

/**
 * The staff door, at `#/signin`.
 *
 * Reached by clicking the name on the About card, which carries no hover
 * affordance at all: there is nothing here for a student revising for the LCTA,
 * so advertising it would only invite people to a sign-in that will refuse them.
 * It is not secret in the sense of being protected. The URL is guessable and the
 * route is in the bundle, and neither matters, because everything this unlocks
 * is decided by the allowlist in Apps Script rather than by finding the page.
 *
 * Signing in here is the same session as signing in on the upload ticket. The
 * credential lives in a module store, so arriving at the ticket afterwards finds
 * you already signed in.
 */
export function SignInPage() {
  const { configured, ready, user, error, signIn, signOut, renderButton } = useGoogleAuth();

  // The shader is white bands on black and the panel is built for that, so this
  // page is dark whatever the site theme is. Restored on the way out rather than
  // left behind for the next page.
  useEffect(() => {
    const root = document.documentElement;
    const had = root.classList.contains("dark");
    root.classList.add("dark");
    return () => {
      if (!had) root.classList.remove("dark");
    };
  }, []);

  return (
    <main className="relative min-h-screen overflow-hidden bg-black">
      {/* The same raw-WebGL shader as the opening, so the door belongs to the
          site rather than looking like a different application. It fails soft to
          a CSS gradient where WebGL is unavailable. */}
      <ShaderAnimation className="absolute inset-0" cycleSeconds={4.6} />

      {/* Holds the panel legible over the brightest part of a sweep. */}
      <div className="absolute inset-0 bg-black/45" aria-hidden />

      <a
        href="#/home"
        className="group absolute top-6 left-6 z-20 inline-flex items-center gap-1.5 text-sm font-semibold text-white/60 transition-colors hover:text-white"
      >
        <ArrowLeft className="h-3.5 w-3.5 transition-transform duration-300 group-hover:-translate-x-0.5" />
        Back to {SITE_NAME}
      </a>

      <div className="relative z-10 flex min-h-screen items-center justify-center px-6">
        <div className="w-full max-w-sm rounded-3xl border border-white/10 bg-white/5 p-8 text-center shadow-[0_24px_80px_-12px_rgba(0,0,0,0.9)] backdrop-blur-xl">
          <BlueberryMark className="blueberry-glow-art mx-auto h-14 w-14 transition-[filter] duration-300" />

          <h1 className="title-face mt-5 text-2xl text-white">Staff sign-in</h1>
          <p className="mt-2 text-sm leading-relaxed text-white/55">
            For adding and removing decks. Everything else on {SITE_NAME} is open,
            so there is nothing to sign in for unless you are publishing.
          </p>

          <div className="mt-7">
            {!configured ? (
              <p className="text-sm text-white/50">
                Sign-in is not configured on this build. Set{" "}
                <code className="font-mono text-xs text-white/70">VITE_GOOGLE_CLIENT_ID</code> in{" "}
                <code className="font-mono text-xs text-white/70">.env.local</code>.
              </p>
            ) : user ? (
              <div className="flex flex-col items-center gap-4">
                <p className="inline-flex items-center gap-2 rounded-full bg-emerald-400/10 px-3 py-1.5 text-xs font-semibold text-emerald-300">
                  <ShieldCheck className="h-3.5 w-3.5" />
                  Signed in as {user.email}
                </p>
                {/* Says "may" on purpose. Being signed in is not being allowed:
                    the allowlist runs on the server and this page cannot see it,
                    so promising access here would be a promise it cannot keep. */}
                <p className="text-xs leading-relaxed text-white/45">
                  If this account is on the allowlist, the ticket at the foot of the
                  hub will let you publish and remove decks.
                </p>
                <a
                  href="#/home"
                  className="inline-flex items-center gap-2 rounded-full bg-white px-4 py-2 text-sm font-bold text-slate-900 transition hover:bg-white/90"
                >
                  <Upload className="h-4 w-4" />
                  Go to the deck ticket
                </a>
                <button
                  onClick={signOut}
                  className="inline-flex items-center gap-1.5 text-xs font-semibold text-white/40 transition-colors hover:text-white/80"
                >
                  <LogOut className="h-3 w-3" />
                  Sign out
                </button>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-3">
                {/* Google's own button. Their terms require the real thing for
                    the credential flow, and it is also the one people recognise. */}
                <div ref={renderButton} />
                <button
                  onClick={signIn}
                  disabled={!ready}
                  className="text-xs font-semibold text-white/50 underline decoration-dotted underline-offset-4 transition-colors hover:text-white/80 disabled:opacity-40"
                >
                  {ready ? "Or use the one-tap prompt" : "Loading sign-in…"}
                </button>
                {error && <p className="text-xs text-red-300">{error}</p>}
              </div>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}

export default SignInPage;
