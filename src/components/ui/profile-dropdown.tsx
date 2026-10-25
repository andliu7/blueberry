"use client";

import * as React from "react";
import { lazy, Suspense } from "react";
import { LogIn, User } from "lucide-react";
import { useSession } from "@/lib/useSession";
import { useProfile } from "@/lib/profile";
import { cn } from "@/lib/utils";

const ProfileMenu = lazy(() => import("@/components/ui/profile-menu").then((m) => ({ default: m.ProfileMenu })));

/**
 * Who you are, in the corner of the bar.
 *
 * Adapted from a Next.js component rather than pasted. `next/image` and
 * `next/link` are gone: this is a Vite bundle with hash routing, so an `<img>`
 * and an `<a href="#/...">` are the whole of what those two were doing, and
 * pulling Next in for them would be a framework's worth of dependency for two
 * tags.
 *
 * The sample data went the same way. A profile menu whose contents are a
 * hardcoded stranger is a screenshot; this one reads `useSession` for identity
 * and role and `useProfile` for the locally chosen avatar and name, which is
 * exactly the pair `ProfileRow` in the dashboard already reads.
 *
 * Two items from the original are deliberately absent. The model row named a
 * language model this site does not use, and the "bending line" flourish was
 * positioned outside the trigger's own box, which clips against the edge of a
 * bar.
 */

export function ProfileDropdown({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  const session = useSession();
  const profile = useProfile();

  /**
   * Signed out, this is one button and no menu.
   *
   * The original always rendered the full list. Offering Profile, Subscription
   * and Sign out to somebody with no account is a menu where every row is a
   * refusal, and the only useful item is the one that is missing.
   */
  if (!session) {
    return (
      <div className={cn("relative", className)} {...props}>
        <a
          href="#/signin"
          className="inline-flex min-h-11 items-center gap-1.5 rounded-full border border-slate-300/70 bg-white/60 px-4 text-sm font-semibold text-slate-600 backdrop-blur transition-colors hover:text-slate-900 dark:border-stone-700/70 dark:bg-stone-900/50 dark:text-stone-400 dark:hover:text-stone-100"
        >
          <LogIn className="size-3.5" />
          Sign in
        </a>
      </div>
    );
  }

  const chosenName = [profile.firstName, profile.lastName].filter(Boolean).join(" ");
  const name = chosenName || session.name || session.email;
  const avatar = profile.avatar || session.picture;
  // The avatar button. It is the Suspense fallback too, so the bar looks the
  // same while the menu's chunk loads; the menu then wraps this same button.
  const trigger = (
    <button
      type="button"
      aria-label={`Account: ${name}`}
      className="flex size-11 cursor-pointer items-center justify-center rounded-full"
    >
      {/* The gradient ring is the original's, kept because it reads as an
          avatar even before the picture loads, and shrunk to match the
          other controls in the bar rather than the 40px of a sidebar. */}
      <span className="block size-9 rounded-full bg-gradient-to-br from-brand-from via-brand-to to-amber-400 p-0.5 transition-transform hover:scale-105 motion-reduce:transition-none">
        <span className="flex size-full items-center justify-center overflow-hidden rounded-full bg-white dark:bg-stone-900">
          {avatar ? (
            <img src={avatar} alt="" aria-hidden className="size-full object-cover" />
          ) : (
            <User className="size-4 text-slate-500 dark:text-stone-400" />
          )}
        </span>
      </span>
    </button>
  );

  return (
    <div className={cn("relative", className)} {...props}>
      {/* React.lazy + Suspense: ProfileMenu (and Radix with it) loads as its own chunk. */}
      <Suspense fallback={trigger}>
        <ProfileMenu session={session} name={name} avatar={avatar} trigger={trigger} />
      </Suspense>
    </div>
  );
}

export default ProfileDropdown;
