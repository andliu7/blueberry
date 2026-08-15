"use client";

import * as React from "react";
import {
  CalendarDays,
  CreditCard,
  FileText,
  LogIn,
  LogOut,
  Settings,
  Shield,
  User,
  Users,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useSession } from "@/lib/useSession";
import { useProfile } from "@/lib/profile";
import { roleLabel } from "@/lib/account";
import { cn } from "@/lib/utils";

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

interface MenuItem {
  label: string;
  /** Shown on the right, as a badge. */
  value?: string;
  href: string;
  icon: React.ReactNode;
  /** Badges are tinted by meaning, not by position in the list. */
  tone?: "role" | "plan";
}

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
          className="inline-flex min-h-9 items-center gap-1.5 rounded-full border border-slate-300/70 bg-white/60 px-3 text-sm font-semibold text-slate-600 backdrop-blur transition-colors hover:text-slate-900 dark:border-stone-700/70 dark:bg-stone-900/50 dark:text-stone-400 dark:hover:text-stone-100"
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
  const staff = session.role === "admin" || session.role === "owner";

  const menuItems: MenuItem[] = [
    { label: "Profile", href: "#/home", icon: <User className="size-4" /> },
    {
      label: "Role",
      // `member` is the internal word; "Student" is what the person is.
      value: session.role === "member" ? "Student" : roleLabel(session.role),
      href: "#/home",
      icon: <Shield className="size-4" />,
      tone: "role",
    },
    { label: "Calendar", href: "#/calendar", icon: <CalendarDays className="size-4" /> },
    { label: "Office hours", href: "#/tutoring", icon: <Users className="size-4" /> },
    {
      label: "Subscription",
      value: "Free",
      href: "#/home",
      icon: <CreditCard className="size-4" />,
      tone: "plan",
    },
    { label: "Settings", href: "#/home", icon: <Settings className="size-4" /> },
    { label: "Terms & Policies", href: "#/terms", icon: <FileText className="size-4" /> },
  ];

  return (
    <div className={cn("relative", className)} {...props}>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            type="button"
            aria-label={`Account: ${name}`}
            className="flex cursor-pointer items-center rounded-full outline-none focus-visible:ring-2 focus-visible:ring-indigo-400"
          >
            {/* The gradient ring is the original's, kept because it reads as an
                avatar even before the picture loads, and shrunk to match the
                other controls in the bar rather than the 40px of a sidebar. */}
            <span className="block size-9 rounded-full bg-gradient-to-br from-indigo-500 via-fuchsia-500 to-amber-400 p-0.5 transition-transform hover:scale-105 motion-reduce:transition-none">
              <span className="flex size-full items-center justify-center overflow-hidden rounded-full bg-white dark:bg-stone-900">
                {avatar ? (
                  <img src={avatar} alt="" aria-hidden className="size-full object-cover" />
                ) : (
                  <User className="size-4 text-slate-500 dark:text-stone-400" />
                )}
              </span>
            </span>
          </button>
        </DropdownMenuTrigger>

        {/* No `animate-in` / `zoom-in-95` here. Those are `tailwindcss-animate`
            classes and this project does not use it, so upstream they would be
            dead strings and the menu would open with no motion at all. The
            shared `DropdownMenuContent` already runs its own keyframes. */}
        <DropdownMenuContent align="end" sideOffset={8} className="w-64 p-2">
          <div className="flex items-center gap-3 px-2 py-2">
            <span className="block size-9 shrink-0 overflow-hidden rounded-full bg-slate-100 dark:bg-stone-800">
              {avatar ? (
                <img src={avatar} alt="" aria-hidden className="size-full object-cover" />
              ) : (
                <span className="flex size-full items-center justify-center">
                  <User className="size-4 text-slate-500 dark:text-stone-400" />
                </span>
              )}
            </span>
            <span className="min-w-0">
              <span className="block truncate text-sm font-semibold">{name}</span>
              <span className="block truncate text-xs text-slate-500 dark:text-stone-400">
                {session.email}
              </span>
            </span>
          </div>

          <DropdownMenuSeparator />

          {menuItems.map((item) => (
            <DropdownMenuItem key={item.label} asChild>
              <a href={item.href} className="gap-2">
                {item.icon}
                <span className="flex-1 truncate">{item.label}</span>
                {item.value && (
                  <span
                    className={cn(
                      "shrink-0 rounded-md border px-1.5 py-0.5 text-[0.65rem] font-semibold tracking-wide uppercase",
                      item.tone === "role" && staff
                        ? "border-indigo-500/20 bg-indigo-50 text-indigo-600 dark:bg-indigo-500/10 dark:text-indigo-300"
                        : "border-slate-500/15 bg-slate-100 text-slate-600 dark:bg-stone-800 dark:text-stone-300",
                    )}
                  >
                    {item.value}
                  </span>
                )}
              </a>
            </DropdownMenuItem>
          ))}

          <DropdownMenuSeparator />

          <DropdownMenuItem
            onSelect={session.signOut}
            className="gap-2 bg-red-500/10 text-red-600 focus:bg-red-500/20 focus:text-red-700 dark:text-red-400 dark:focus:text-red-300"
          >
            <LogOut className="size-4" />
            Sign out
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}

export default ProfileDropdown;
