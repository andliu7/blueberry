"use client";

import { useState } from "react";
import { useClerk, useSignIn, useSignUp, useUser } from "@clerk/clerk-react";
import { KeyRound, Mail, User as UserIcon } from "lucide-react";
import { ProfileFields } from "@/components/ui/profile-fields";
import { cn } from "@/lib/utils";

/**
 * Sign in and sign up, driven by Clerk's hooks rather than its prebuilt cards.
 *
 * The prebuilt `<SignIn />` wants to own navigation between its own steps
 * (password, then a code, then MFA) and does that through the URL path. This
 * app is hash-routed, so those two fight: the component either bounced to
 * Clerk's hosted portal or rendered a form that went nowhere on submit.
 *
 * `useSignIn` has no routing of its own. The form is ours, the steps are state
 * in this file, and the only navigation is the one at the end that we perform
 * deliberately. That also means the card keeps its own look without fighting
 * Clerk's `appearance` API, which is what was blanking it before.
 */

const FIELD =
  "min-h-11 w-full rounded-xl border border-white/12 bg-white/5 pl-10 pr-3 text-sm text-white outline-none transition-colors placeholder:text-white/35 focus:border-white/45";

function Field({
  icon,
  ...props
}: React.InputHTMLAttributes<HTMLInputElement> & { icon: React.ReactNode }) {
  return (
    <div className="relative">
      <span aria-hidden className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-white/40">
        {icon}
      </span>
      <input className={FIELD} {...props} />
    </div>
  );
}

function Submit({ busy, children }: { busy: boolean; children: React.ReactNode }) {
  return (
    <button
      type="submit"
      disabled={busy}
      className="flex min-h-11 w-full cursor-pointer items-center justify-center rounded-xl bg-white px-4 text-sm font-semibold text-[#171327] transition hover:bg-white/90 disabled:cursor-not-allowed disabled:opacity-60"
    >
      {busy ? "Working…" : children}
    </button>
  );
}

/** Clerk puts the useful sentence in `errors[0].message`. */
function messageOf(err: unknown) {
  const e = err as { errors?: Array<{ message?: string; longMessage?: string }> };
  return e.errors?.[0]?.longMessage ?? e.errors?.[0]?.message ?? "That did not work.";
}

function Problem({ children }: { children: string }) {
  if (!children) return null;
  return (
    <p role="alert" aria-live="polite" className="text-center text-sm text-red-200">
      {children}
    </p>
  );
}

/** Google, through Clerk rather than beside it. */
function GoogleButton({ onClick }: { onClick: () => void }) {
  return (
    <>
      <div className="flex items-center gap-3 text-xs text-white/35">
        <span className="h-px flex-1 bg-white/10" />
        or
        <span className="h-px flex-1 bg-white/10" />
      </div>
      <button
        type="button"
        onClick={onClick}
        className="flex min-h-11 w-full cursor-pointer items-center justify-center gap-2 rounded-xl border border-white/25 px-4 text-sm font-semibold text-white transition hover:border-white/60 hover:bg-white/10"
      >
        Continue with Google
      </button>
    </>
  );
}

/**
 * Who Clerk thinks you are, shown where the page only knew about Google.
 *
 * The sign-in page decided "you are already signed in" from `useGoogleAuth`
 * alone, so a Clerk session was invisible to it and a Google one hid the Clerk
 * form entirely. There are two independent sessions here until staff move over,
 * and the page has to be able to say which, and end either.
 *
 * Rendered only where Clerk is configured, so the hook is never called without
 * a provider above it.
 */
export function ClerkSessionRow() {
  const { isLoaded, isSignedIn, user } = useUser();
  const clerk = useClerk();

  if (!isLoaded || !isSignedIn) return null;

  return (
    <div className="mt-4 flex flex-wrap items-center justify-center gap-2 rounded-xl border border-white/12 bg-white/5 px-4 py-3 text-xs text-white/60">
      <span className="truncate">
        Clerk: {user.primaryEmailAddress?.emailAddress ?? user.username ?? "signed in"}
      </span>
      <button
        type="button"
        onClick={() => void clerk.signOut()}
        className="cursor-pointer font-semibold text-white underline decoration-white/35 underline-offset-4 hover:decoration-white"
      >
        Sign out
      </button>
    </div>
  );
}

export function ClerkSignIn() {
  const { isLoaded, signIn, setActive } = useSignIn();
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isLoaded || !signIn) return;
    setBusy(true);
    setError("");
    try {
      const result = await signIn.create({ identifier, password });
      if (result.status === "complete") {
        await setActive({ session: result.createdSessionId });
        window.location.hash = "#/home";
      } else {
        // Everything else is a second step this card does not draw yet, and
        // saying so beats a form that silently does nothing.
        setError(`This account needs another step: ${result.status}.`);
      }
    } catch (err) {
      setError(messageOf(err));
    } finally {
      setBusy(false);
    }
  };

  const google = () => {
    if (!isLoaded || !signIn) return;
    void signIn.authenticateWithRedirect({
      strategy: "oauth_google",
      redirectUrl: `${window.location.origin}/#/signin`,
      redirectUrlComplete: `${window.location.origin}/#/home`,
    });
  };

  return (
    <form onSubmit={submit} className="space-y-3">
      {/* `identifier`, not `email`: Clerk accepts a username here too, which is
          what makes the guest account work. */}
      <Field
        icon={<UserIcon size={16} />}
        type="text"
        autoComplete="username"
        placeholder="Email or username"
        value={identifier}
        onChange={(e) => setIdentifier(e.target.value)}
      />
      <Field
        icon={<KeyRound size={16} />}
        type="password"
        autoComplete="current-password"
        placeholder="Password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
      />
      <Problem>{error}</Problem>
      <Submit busy={busy || !isLoaded}>Sign in</Submit>
      <GoogleButton onClick={google} />
    </form>
  );
}

export function ClerkSignUp() {
  const { isLoaded, signUp, setActive } = useSignUp();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [code, setCode] = useState("");
  /** Clerk asked for an emailed code, so the form becomes the code form. */
  const [verifying, setVerifying] = useState(false);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const start = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isLoaded || !signUp) return;
    setBusy(true);
    setError("");
    try {
      const result = await signUp.create({ emailAddress: email, password });
      if (result.status === "complete") {
        await setActive({ session: result.createdSessionId });
        window.location.hash = "#/home";
        return;
      }
      // `missing_requirements` is the ordinary path when email verification is
      // switched on in the Clerk dashboard.
      await signUp.prepareEmailAddressVerification({ strategy: "email_code" });
      setVerifying(true);
    } catch (err) {
      setError(messageOf(err));
    } finally {
      setBusy(false);
    }
  };

  const verify = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isLoaded || !signUp) return;
    setBusy(true);
    setError("");
    try {
      const result = await signUp.attemptEmailAddressVerification({ code });
      if (result.status === "complete") {
        await setActive({ session: result.createdSessionId });
        window.location.hash = "#/home";
      } else {
        setError("That code was not accepted.");
      }
    } catch (err) {
      setError(messageOf(err));
    } finally {
      setBusy(false);
    }
  };

  const google = () => {
    if (!isLoaded || !signUp) return;
    void signUp.authenticateWithRedirect({
      strategy: "oauth_google",
      redirectUrl: `${window.location.origin}/#/signup`,
      redirectUrlComplete: `${window.location.origin}/#/home`,
    });
  };

  if (verifying) {
    return (
      <form onSubmit={verify} className="space-y-3">
        <p className="text-xs leading-5 text-white/60">
          We sent a code to {email}. Enter it to finish.
        </p>
        {/* One input, not six boxes. Six boxes need a package and a pile of
            focus management; a single field pastes cleanly from the email and
            gets the numeric keypad on a phone. */}
        <input
          value={code}
          onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
          inputMode="numeric"
          autoComplete="one-time-code"
          placeholder="123456"
          className={cn(FIELD, "pl-3 text-center font-mono text-lg tracking-[0.5em]")}
        />
        <Problem>{error}</Problem>
        <Submit busy={busy}>Verify</Submit>
        <button
          type="button"
          onClick={() => void signUp?.prepareEmailAddressVerification({ strategy: "email_code" })}
          className="w-full cursor-pointer text-xs font-semibold text-white/50 underline-offset-4 hover:text-white hover:underline"
        >
          Send it again
        </button>
      </form>
    );
  }

  return (
    <form onSubmit={start} className="space-y-3">
      <Field
        icon={<Mail size={16} />}
        type="email"
        autoComplete="email"
        placeholder="Email address"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
      />
      <Field
        icon={<KeyRound size={16} />}
        type="password"
        autoComplete="new-password"
        placeholder="Password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
      />
      <Problem>{error}</Problem>
      <Submit busy={busy || !isLoaded}>Create account</Submit>
      <GoogleButton onClick={google} />
    </form>
  );
}

/**
 * The details Clerk does not collect, required rather than offered.
 *
 * Saved into `unsafeMetadata`, which is the sanctioned place for values the
 * user may set themselves. Anything they must *not* be able to change belongs
 * in `publicMetadata`, which only the server can write, and the staff role is
 * exactly that.
 */
export function ClerkProfileGate() {
  const { isLoaded, isSignedIn, user } = useUser();
  if (!isLoaded || !isSignedIn) return null;

  const meta = user.unsafeMetadata as { firstName?: string; level?: string };
  if (meta?.firstName && meta?.level) return null;

  return (
    <div className="mt-5 border-t border-white/10 pt-5">
      <p className="mb-3 text-xs leading-5 text-white/60">
        One more thing before you are set up. These are required.
      </p>
      <ProfileFields
        onSaved={() => {
          void user.update({
            unsafeMetadata: { ...user.unsafeMetadata, ...readLocalProfile() },
          });
        }}
      />
    </div>
  );
}

function readLocalProfile() {
  try {
    return JSON.parse(localStorage.getItem("blueberry_profile_v1") ?? "{}") as Record<
      string,
      unknown
    >;
  } catch {
    return {};
  }
}
