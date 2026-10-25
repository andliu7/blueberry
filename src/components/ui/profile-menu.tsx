import type * as React from "react";
import {
  CalendarDays,
  CreditCard,
  LayoutGrid,
  FileText,
  LogOut,
  Settings,
  Shield,
  User,
  Users,
  MessageCircle,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { Session } from "@/lib/useSession";
import { roleLabel } from "@/lib/account";
import { cn } from "@/lib/utils";

/**
 * The signed-in account menu, split out of profile-dropdown.tsx so Radix's
 * dropdown (about 25 KB gzipped with its popper and focus helpers) is its own
 * chunk. Only the site header draws this menu; `#/app` never does, so the
 * game's first open no longer downloads Radix at all.
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

export function ProfileMenu({
  session,
  name,
  avatar,
  trigger,
}: {
  session: Session;
  name: string;
  avatar: string | null;
  /** The avatar button, drawn by ProfileDropdown so it shows before this chunk lands. */
  trigger: React.ReactElement;
}) {
  const staff = session.role === "admin" || session.role === "owner";

  const menuItems: MenuItem[] = [
    // The way into the dashboard. The burger on the hub opens the column now,
    // which is a menu of destinations; this is the destination itself.
    { label: "Dashboard", href: "#/d", icon: <LayoutGrid className="size-4" /> },
    { label: "Profile", href: "#/d/profile", icon: <User className="size-4" /> },
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
      href: "#/d/subscriptions",
      icon: <CreditCard className="size-4" />,
      tone: "plan",
    },
    { label: "Settings", href: "#/d/settings", icon: <Settings className="size-4" /> },
    { label: "Terms & Policies", href: "#/terms", icon: <FileText className="size-4" /> },
  ];

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>{trigger}</DropdownMenuTrigger>

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
                      ? "border-[#6b51dd]/20 bg-[#f1f4fa] text-[#5a3fd8] dark:bg-[#6b51dd]/10 dark:text-[#bbb1eb]"
                      : "border-slate-500/15 bg-slate-100 text-slate-600 dark:bg-stone-800 dark:text-stone-300",
                  )}
                >
                  {item.value}
                </span>
              )}
            </a>
          </DropdownMenuItem>
        ))}

        {/* The assistant's way in, since the corner rail it used to sit in went
            (2026-10-07). The panel listens for this event; see ui/blueberry-bot. */}
        <DropdownMenuItem
          onSelect={() => window.dispatchEvent(new CustomEvent("blueberry:open-bot"))}
          className="gap-2"
        >
          <MessageCircle className="size-4" />
          Ask Blueberry
        </DropdownMenuItem>

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
  );
}
