import { useState, type ReactNode } from "react";
import { Lock, Eye, EyeOff } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * A latch, not a lock.
 *
 * It keeps staff-only surfaces out of the way of anyone who happens to find
 * them, and that is all it is for. The passphrase is compiled into the bundle
 * like every other string in it, so anyone who wants it can read it; what
 * actually decides whether anything can be published, deleted or read is the
 * Google sign-in and the allowlist in Apps Script, which run on the server where
 * they cannot be edited from a browser.
 *
 * Its real job is social rather than technical. Without it, every visitor who
 * stumbles on the sign-in is invited to try an account that will be refused,
 * because there is nothing here for a student: progress is saved on their own
 * device and needs no account at all. The latch means only people who were told
 * about it see the door.
 *
 * One key for the whole site, so unlocking to upload a deck also unlocks the
 * sign-in page, and vice versa. sessionStorage rather than localStorage: it
 * should last a working session, not forever on a shared library machine.
 */

const PASSPHRASE = "anthocyanin";
const UNLOCK_KEY = "blueberry_upload_unlocked";

export function isUnlocked(): boolean {
  try {
    return sessionStorage.getItem(UNLOCK_KEY) === "1";
  } catch {
    return false;
  }
}

export function PassphraseGate({
  children,
  title = "Passphrase",
  blurb = "This only hides the form while it is being worked on. Publishing is still decided by the server.",
  className,
  tone = "light",
}: {
  children: ReactNode;
  title?: string;
  blurb?: string;
  className?: string;
  /** The sign-in page is dark whatever the site theme is. */
  tone?: "light" | "dark";
}) {
  const [unlocked, setUnlocked] = useState(isUnlocked);
  const [word, setWord] = useState("");
  const [wrong, setWrong] = useState(false);
  const [show, setShow] = useState(false);

  if (unlocked) return <>{children}</>;

  const dark = tone === "dark";

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (word.trim().toLowerCase() === PASSPHRASE) {
          try {
            sessionStorage.setItem(UNLOCK_KEY, "1");
          } catch {
            /* a refused write only costs one more unlock later */
          }
          setUnlocked(true);
          setWrong(false);
        } else {
          setWrong(true);
        }
      }}
      className={cn(
        "w-full max-w-sm rounded-2xl border p-5 text-left",
        dark
          ? "border-white/10 bg-white/5 backdrop-blur-xl"
          : "border-slate-200 bg-white shadow-sm dark:border-stone-800 dark:bg-stone-900",
        className,
      )}
    >
      <p
        className={cn(
          "flex items-center gap-2 text-sm font-semibold",
          dark ? "text-white" : "text-slate-800 dark:text-stone-100",
        )}
      >
        <Lock className="h-4 w-4" />
        {title}
      </p>
      <p className={cn("mt-1 text-xs", dark ? "text-white/55" : "text-slate-500 dark:text-stone-400")}>
        {blurb}
      </p>

      {/* The toggle is a sibling of the input, not a wrapper around it, so the
          focus ring still traces the field rather than a box drawn around both. */}
      <div className="relative mt-3">
        <input
          type={show ? "text" : "password"}
          value={word}
          autoComplete="off"
          aria-label={title}
          onChange={(e) => {
            setWord(e.target.value);
            setWrong(false);
          }}
          className={cn(
            "w-full rounded-lg border px-3 py-2 pr-10 text-sm outline-none focus-visible:border-indigo-400 focus-visible:ring-2 focus-visible:ring-indigo-400/40",
            dark
              ? "border-white/15 bg-white/10 text-white placeholder:text-white/30"
              : "border-slate-200 bg-white text-slate-800 dark:border-stone-700 dark:bg-stone-900 dark:text-stone-200",
          )}
        />
        <button
          type="button"
          // Without this it defaults to submit inside a form, so revealing the
          // passphrase would also guess it.
          onClick={() => setShow((s) => !s)}
          aria-label={show ? "Hide passphrase" : "Show passphrase"}
          aria-pressed={show}
          className={cn(
            "absolute inset-y-0 right-0 flex items-center px-3 transition-colors",
            dark
              ? "text-white/40 hover:text-white"
              : "text-slate-400 hover:text-slate-700 dark:text-stone-500 dark:hover:text-stone-200",
          )}
        >
          {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
        </button>
      </div>

      {wrong && (
        <p className={cn("mt-2 text-xs", dark ? "text-red-300" : "text-red-600 dark:text-red-400")}>
          Not that one.
        </p>
      )}

      <button
        type="submit"
        className="mt-3 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-bold text-white transition hover:bg-indigo-500"
      >
        Unlock
      </button>
    </form>
  );
}

export default PassphraseGate;
