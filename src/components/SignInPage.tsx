import { useEffect } from "react";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { ShaderAnimation } from "@/components/ui/shader-animation";
import { BlueberryMark } from "@/components/ui/blueberry-mark";
import { SignInCard, type AuthCardMode } from "@/components/ui/sign-in-card-2";
import { useGoogleAuth } from "@/lib/useGoogleAuth";
import { roleLabel, useAccountRole } from "@/lib/account";
import { SITE_NAME } from "@/data/site";

export function SignInPage({ mode = "signin" }: { mode?: AuthCardMode }) {
  const auth = useGoogleAuth();
  const role = useAccountRole(auth.user);

  useEffect(() => {
    const root = document.documentElement;
    const hadDark = root.classList.contains("dark");
    root.classList.add("dark");
    return () => { if (!hadDark) root.classList.remove("dark"); };
  }, []);

  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[#171327] px-5 py-24">
      <ShaderAnimation className="absolute inset-0" cycleSeconds={4.6} />
      <div className="absolute inset-0 bg-[#171327]/55" aria-hidden />
      <a href="#/home" className="group absolute left-5 top-6 z-10 inline-flex items-center gap-2 text-sm font-semibold text-white/65 transition hover:text-white sm:left-8">
        <ArrowLeft className="size-4 transition-transform group-hover:-translate-x-0.5" /> Back to {SITE_NAME}
      </a>
      <div className="relative z-10 w-full max-w-sm">
        {auth.user ? (
          <section className="rounded-3xl border border-white/12 bg-[#171327]/80 p-7 text-center shadow-[0_28px_90px_rgba(0,0,0,0.48)] backdrop-blur-xl">
            <BlueberryMark eyes className="blueberry-glow-art mx-auto size-12" />
            <p className="mt-5 text-xs font-semibold uppercase tracking-[0.18em] text-blue-200/70">{roleLabel(role)} account</p>
            <h1 className="title-face mt-2 text-3xl text-white">You&apos;re signed in</h1>
            <p className="mt-3 text-sm leading-6 text-white/60">{auth.user.email}</p>
            <a href="#/home" className="mt-7 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-white px-4 text-sm font-semibold text-[#171327] transition hover:bg-white/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white">
              Continue to Blueberry <ArrowRight className="size-4" />
            </a>
            {mode === "staff" && <p className="mt-4 text-xs leading-5 text-white/45">Staff access is checked again by the server when you open staff tools.</p>}
            <button onClick={auth.signOut} className="mt-4 text-sm font-semibold text-white/60 underline decoration-white/25 underline-offset-4 transition hover:text-white">Sign out</button>
          </section>
        ) : (
          <SignInCard mode={mode} configured={auth.configured} ready={auth.ready} error={auth.error} onSignIn={auth.signIn} googleButtonRef={auth.renderButton} />
        )}
      </div>
    </main>
  );
}

export default SignInPage;