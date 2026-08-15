"use client";

import { useState } from "react";
import { CircleCheck, Loader2, TriangleAlert } from "lucide-react";
import {
  signInWithEmail,
  signInWithGoogle,
  signUpWithEmail,
} from "@/lib/useSupabaseSession";
import { cn } from "@/lib/utils";

/**
 * Sign in, or sign up, through Supabase.
 *
 * Replaces the Clerk flows and the Google Identity button that sat beside them.
 * One provider now rather than two, which is what fixes the bug underneath all
 * of this: Clerk could hold a session that nothing on the server could verify,
 * so an owner saw every editing control and could save none of them.
 *
 * Google first, then email. A UMD account is what staff and most students
 * already have, and it is the route with no password to invent or forget.
 *
 * Styled for the dark card this sits in, not with the site's shadcn tokens: the
 * sign-in page pins `.dark` and paints its own `#171327`, so `bg-card` here
 * would be the wrong surface.
 */

const FIELD =
  "min-h-11 w-full rounded-xl border border-white/15 bg-white/5 px-3 text-sm text-white placeholder:text-white/35 outline-none focus-visible:border-indigo-400 focus-visible:ring-2 focus-visible:ring-indigo-500/40";

export function SupabaseAuth({ signup }: { signup: boolean }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [institution, setInstitution] = useState("University of Maryland");
  const [busy, setBusy] = useState<"google" | "email" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);

  const google = async () => {
    setBusy("google");
    setError(null);
    const { error: err } = await signInWithGoogle();
    // On success the browser leaves for Google, so there is nothing to reset.
    if (err) {
      setError(err);
      setBusy(null);
    }
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy("email");
    setError(null);

    const result = signup
      ? await signUpWithEmail({ email, password, fullName, institution })
      : await signInWithEmail(email, password);

    setBusy(null);
    if (result.error) return setError(result.error);
    // Signing in needs no success state: the session changes and the page moves
    // on. Signing up might be waiting on an email, which does.
    if (signup && "needsConfirmation" in result && result.needsConfirmation) {
      setSent(true);
    }
  };

  if (sent) {
    return (
      <div className="rounded-xl border border-emerald-400/25 bg-emerald-400/10 p-4 text-sm leading-6 text-emerald-100">
        <CircleCheck className="mb-2 size-5" />
        Check <span className="font-semibold">{email}</span> for a confirmation link.
        You can close this page; the link brings you back signed in.
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <button
        type="button"
        onClick={() => void google()}
        disabled={busy !== null}
        className="flex min-h-11 w-full cursor-pointer items-center justify-center gap-2.5 rounded-xl bg-white px-4 text-sm font-semibold text-slate-800 transition hover:bg-white/90 disabled:opacity-60"
      >
        {busy === "google" ? (
          <Loader2 className="size-4 animate-spin" />
        ) : (
          /* Google's mark, inline. An <img> from a CDN is a request that can
             fail and a third party that learns who visits this page. */
          <svg className="size-4" viewBox="0 0 48 48" aria-hidden>
            <path fill="#FFC107" d="M43.6 20.1H42V20H24v8h11.3C33.7 32.7 29.3 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.9 1.2 8 3.1l5.7-5.7C34.0 6.1 29.3 4 24 4 13 4 4 13 4 24s9 20 20 20 20-9 20-20c0-1.3-.1-2.6-.4-3.9z" />
            <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.9 1.2 8 3.1l5.7-5.7C34.0 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z" />
            <path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.3 0-9.7-3.3-11.3-8l-6.5 5C9.6 39.6 16.2 44 24 44z" />
            <path fill="#1976D2" d="M43.6 20.1H42V20H24v8h11.3c-.8 2.2-2.2 4.1-4.1 5.6l6.2 5.2C39.9 36.9 44 31 44 24c0-1.3-.1-2.6-.4-3.9z" />
          </svg>
        )}
        Continue with Google
      </button>

      <div className="flex items-center gap-3 py-1">
        <span className="h-px flex-1 bg-white/10" />
        <span className="text-xs text-white/40">or</span>
        <span className="h-px flex-1 bg-white/10" />
      </div>

      <form onSubmit={(e) => void submit(e)} className="flex flex-col gap-2.5">
        {signup && (
          <>
            {/* Both go into `options.data`, which Supabase stores as
                `raw_user_meta_data`, and the signup trigger copies them into the
                profile. The field names have to match the migration exactly. */}
            <label className="sr-only" htmlFor="auth-name">
              Full name
            </label>
            <input
              id="auth-name"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="Full name"
              autoComplete="name"
              required
              className={FIELD}
            />
            <label className="sr-only" htmlFor="auth-institution">
              Institution
            </label>
            <input
              id="auth-institution"
              value={institution}
              onChange={(e) => setInstitution(e.target.value)}
              placeholder="Institution"
              autoComplete="organization"
              className={FIELD}
            />
          </>
        )}

        <label className="sr-only" htmlFor="auth-email">
          Email
        </label>
        <input
          id="auth-email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@terpmail.umd.edu"
          autoComplete="email"
          required
          className={FIELD}
        />

        <label className="sr-only" htmlFor="auth-password">
          Password
        </label>
        <input
          id="auth-password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Password"
          autoComplete={signup ? "new-password" : "current-password"}
          required
          minLength={signup ? 8 : undefined}
          className={FIELD}
        />

        {error && (
          <p
            role="alert"
            className="flex items-start gap-2 rounded-xl border border-rose-400/25 bg-rose-400/10 p-2.5 text-sm text-rose-100"
          >
            <TriangleAlert className="mt-0.5 size-4 shrink-0" />
            <span>{error}</span>
          </p>
        )}

        <button
          type="submit"
          disabled={busy !== null}
          className={cn(
            "flex min-h-11 w-full cursor-pointer items-center justify-center gap-2 rounded-xl",
            "bg-gradient-to-r from-indigo-500 to-fuchsia-500 px-4 text-sm font-semibold text-white",
            "transition hover:brightness-110 disabled:opacity-60",
          )}
        >
          {busy === "email" && <Loader2 className="size-4 animate-spin" />}
          {signup ? "Create account" : "Sign in"}
        </button>
      </form>
    </div>
  );
}

export default SupabaseAuth;
