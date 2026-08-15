import { Check, Circle } from "lucide-react";
import { cn } from "@/lib/utils";
import { useGoogleAuth } from "@/lib/useGoogleAuth";
import { useSession } from "@/lib/useSession";
import { profileComplete, useProfile } from "@/lib/profile";

/**
 * Verifying yourself, as two steps you can see the state of.
 *
 * The tick is grey and hollow until the step is actually true, then it fills
 * green. Nothing here is a claim: each line reads its own live state, so the
 * tick cannot say you are signed in while you are not. That is the whole point
 * of showing it rather than a "Verified" badge you set once and never check.
 */

type Step = {
  id: string;
  title: string;
  blurb: string;
  done: boolean;
  /** Where to go to finish it, when it is not done. */
  href?: string;
  action?: string;
};

export function VerifyChecklist({
  onNavigate,
  className,
}: {
  onNavigate?: () => void;
  className?: string;
}) {
  const { configured } = useGoogleAuth();
  // Either provider counts as signed in. Reading Google alone meant a
  // member stared at an unticked box they had already done.
  const user = useSession();
  const profile = useProfile();

  const steps: Step[] = [
    {
      id: "signin",
      title: "Sign in",
      blurb: user ? user.email : "Prove the address is yours.",
      done: Boolean(user),
      href: "#/signin",
      action: "Sign in",
    },
    {
      id: "profile",
      title: "Fill in your details",
      blurb: profileComplete(profile)
        ? `${profile.firstName} ${profile.lastName}`.trim()
        : "Your name and where you are studying.",
      done: profileComplete(profile),
      href: "#/signup",
      action: "Add details",
    },
  ];

  const done = steps.filter((s) => s.done).length;
  const all = done === steps.length;

  return (
    <div
      className={cn(
        "rounded-xl border border-slate-200 bg-white/70 p-4 dark:border-stone-700 dark:bg-stone-900/50",
        className,
      )}
    >
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm font-semibold text-slate-800 dark:text-stone-100">Verify yourself</p>
        <span
          className={cn(
            "rounded-full px-2 py-0.5 font-mono text-[0.65rem] font-bold",
            all
              ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-300"
              : "bg-slate-500/10 text-slate-500 dark:text-stone-400",
          )}
        >
          {done}/{steps.length}
        </span>
      </div>

      <ul className="mt-3 space-y-2">
        {steps.map((step) => (
          <li key={step.id} className="flex items-start gap-3">
            {/*
              Two different icons, not one icon recoloured. Colour alone is not
              allowed to carry the meaning, so an unfinished step is a hollow
              ring and a finished one is a tick.
            */}
            <span
              className={cn(
                "mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full transition-colors",
                step.done
                  ? "bg-emerald-500 text-white"
                  : "border border-dashed border-slate-300 text-slate-300 dark:border-stone-600 dark:text-stone-600",
              )}
            >
              {step.done ? <Check className="size-3" /> : <Circle className="size-2" />}
            </span>

            <span className="min-w-0 flex-1">
              <span
                className={cn(
                  "block text-sm font-medium",
                  step.done
                    ? "text-slate-500 line-through decoration-slate-300 dark:text-stone-400"
                    : "text-slate-800 dark:text-stone-100",
                )}
              >
                {step.title}
              </span>
              <span className="block truncate text-xs text-slate-500 dark:text-stone-400">
                {step.blurb}
              </span>
            </span>

            {!step.done && configured && step.href && (
              <a
                href={step.href}
                onClick={onNavigate}
                className="shrink-0 cursor-pointer rounded-full border border-slate-200 px-2.5 py-1 text-xs font-semibold text-slate-600 transition-colors hover:bg-slate-100 hover:text-slate-900 dark:border-stone-700 dark:text-stone-300 dark:hover:bg-stone-800 dark:hover:text-stone-100"
              >
                {step.action}
              </a>
            )}
          </li>
        ))}
      </ul>

      <p className="mt-3 text-xs leading-5 text-slate-400 dark:text-stone-500">
        {all
          ? "That is everything. Your details are still held in this browser until accounts are on the server."
          : "Neither step costs anything, and nothing here is charged."}
      </p>
    </div>
  );
}

export default VerifyChecklist;
