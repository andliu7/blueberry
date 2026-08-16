import {
  Atom,
  Bell,
  BookOpen,
  CalendarClock,
  CalendarDays,
  CreditCard,
  FlaskConical,
  Info,
  Layers,
  LayoutGrid,
  LogIn,
  Palette,
  Settings,
  Sparkles,
  Upload,
  User,
} from "lucide-react";
import {
  Sidebar,
  SidebarNavItem,
  SidebarProfile,
  CollapsibleSection,
} from "@/components/ui/sidebar";
import { HoldToConfirm } from "@/components/ui/hold-to-confirm";
import { useProfile } from "@/lib/profile";
import { useSession } from "@/lib/useSession";

/**
 * The dashboard's column, on its own.
 *
 * It used to be a `const nav = (...)` inside the dashboard modal, which was fine
 * while there was exactly one thing that drew it. There are two now — the
 * dashboard page and the drawer the burger opens on the hub — and a column
 * copied into both is a column that drifts between them.
 *
 * **Every row is a link to a route.** The old version had two behaviours per
 * row: one click opened a panel inside the modal, a double click navigated. That
 * was invisible (nobody double-clicks a nav item) and it made the same
 * destination exist at two addresses. Now a section *is* a page, so a row is an
 * anchor — middle-click opens it in a tab, the browser's back button works, and
 * a link to `#/d/settings` can be sent to somebody.
 */

/** The sections that live inside the dashboard, in nav order. */
export type DashboardView =
  | "home"
  | "notifications"
  | "settings"
  | "appearance"
  | "categories"
  | "lessons"
  | "concepts"
  | "decks"
  | "subscriptions"
  | "imports"
  | "profile";

export const VIEW_TITLE: Record<DashboardView, string> = {
  home: "Dashboard",
  notifications: "Notifications",
  settings: "Settings",
  appearance: "Appearance",
  categories: "Categories",
  lessons: "Lessons",
  concepts: "Concepts",
  decks: "Study Decks",
  subscriptions: "Subscriptions",
  imports: "Imports",
  profile: "Profile",
};

/** `home` is the bare `#/d`, so the dashboard's own front page has one address. */
export const viewHref = (view: DashboardView) => (view === "home" ? "#/d" : `#/d/${view}`);

/** `#/d/settings` -> `settings`. Anything unrecognised is the front page. */
export function viewFromRoute(route: string): DashboardView {
  if (route === "d") return "home";
  const rest = route.startsWith("d/") ? route.slice(2) : "";
  return rest in VIEW_TITLE ? (rest as DashboardView) : "home";
}

/**
 * The heading rows navigate from a handler rather than being anchors.
 *
 * `CollapsibleSection` already gives its header two jobs — it folds the group
 * and it selects the section — and an anchor cannot also be a disclosure
 * without one of the two swallowing the other.
 */
function goToView(view: DashboardView, after?: () => void) {
  window.location.hash = viewHref(view);
  after?.();
}

export function DashboardNav({
  activeView,
  /** Called after any row is chosen, so a drawer can close itself. */
  onNavigate,
  unread = 0,
}: {
  activeView?: DashboardView;
  onNavigate?: () => void;
  unread?: number;
}) {
  // A row inside the dashboard. `href` so the browser treats it as one.
  const item = (view: DashboardView, icon: React.ReactNode, label: string, muted?: boolean) => (
    <SidebarNavItem
      icon={icon}
      label={label}
      muted={muted}
      badge={view === "notifications" ? unread : undefined}
      active={activeView === view}
      href={viewHref(view)}
      onClick={onNavigate}
    />
  );

  // A row that leaves the dashboard for a page of the site.
  const link = (href: string, icon: React.ReactNode, label: string) => (
    <SidebarNavItem icon={icon} label={label} href={href} onClick={onNavigate} />
  );

  return (
    <Sidebar
      profile={<ProfileRow onNavigate={onNavigate} />}
      footer={<ProfileButton onNavigate={onNavigate} />}
    >
      <div className="space-y-0.5">
        {item("profile", <User className="size-4" />, "Profile")}
        {item("notifications", <Bell className="size-4" />, "Notifications")}
        {/* Out of Categories, where they never belonged. Categories are kinds of
            study material; a date and a person are neither. */}
        {link("#/calendar", <CalendarDays className="size-4" />, "Calendar")}
        {link("#/tutoring", <CalendarClock className="size-4" />, "Tutoring")}
      </div>

      <div className="mt-2">
        {/* Appearance sits under Settings rather than beside Subscriptions.
            Which theme the site is in is a setting; what you are paying for is
            not, and the two only shared a heading because both were leftovers. */}
        <CollapsibleSection
          title="Settings"
          icon={<Settings className="size-4" />}
          active={activeView === "settings"}
          onHeaderClick={() => goToView("settings", onNavigate)}
        >
          {item("appearance", <Palette className="size-4" />, "Appearance")}
        </CollapsibleSection>

        <CollapsibleSection
          title="Categories"
          icon={<LayoutGrid className="size-4" />}
          defaultOpen
          active={activeView === "categories"}
          onHeaderClick={() => goToView("categories", onNavigate)}
        >
          {item("lessons", <BookOpen className="size-4" />, "Lessons")}
          {item("concepts", <Atom className="size-4" />, "Concepts", true)}
          {item("decks", <Layers className="size-4" />, "Study Decks")}
          {link("#/reactions", <FlaskConical className="size-4" />, "Reactions")}
        </CollapsibleSection>

        <CollapsibleSection title="Extra Options" icon={<Sparkles className="size-4" />}>
          {item("subscriptions", <CreditCard className="size-4" />, "Subscriptions", true)}
          {item("imports", <Upload className="size-4" />, "Imports", true)}
        </CollapsibleSection>

        <CollapsibleSection title="More info" icon={<Info className="size-4" />}>
          <p className="px-3 py-2 text-xs leading-relaxed text-slate-600 dark:text-stone-300">
            Blueberry is a study site for University of Maryland organic chemistry, built by a
            student who was revising for the same assessments. Progress and ratings are kept in
            this browser only.
          </p>
        </CollapsibleSection>
      </div>
    </Sidebar>
  );
}

/**
 * The identity at the top of the column, which opens the Profile page.
 *
 * Kept separate from the control at the foot on purpose: this one says who you
 * are and takes you to your page, that one is a single verb. Rolling them into
 * one button is what left the same click in two places.
 */
function ProfileRow({ onNavigate }: { onNavigate?: () => void }) {
  const session = useSession();
  const profile = useProfile();
  const name = [profile.firstName, profile.lastName].filter(Boolean).join(" ");

  return (
    <SidebarProfile
      href={viewHref("profile")}
      onClick={onNavigate}
      name={name || session?.name || "Guest"}
      detail={session?.email ?? "Not signed in"}
      avatar={
        profile.avatar || session?.picture ? (
          <img src={profile.avatar ?? session?.picture ?? ""} alt="" className="size-full object-cover" />
        ) : (
          <User className="size-5" />
        )
      }
    />
  );
}

function ProfileButton({ onNavigate }: { onNavigate?: () => void }) {
  const session = useSession();

  const shell =
    "flex w-full cursor-pointer items-center gap-2.5 rounded-xl border px-3 py-2.5 text-left text-sm font-semibold transition-colors " +
    "border-slate-200 bg-white/80 text-slate-700 hover:bg-slate-100 hover:text-slate-900 " +
    "dark:border-stone-700 dark:bg-stone-900/70 dark:text-stone-200 dark:hover:bg-stone-800 dark:hover:text-stone-100";

  if (session) {
    return (
      <HoldToConfirm onConfirm={session.signOut} holdMs={1500} className={shell}>
        <LogIn className="size-4 shrink-0 rotate-180 opacity-70" />
        <span className="min-w-0 flex-1 text-left">
          <span className="block">Hold to sign out</span>
          <span className="block truncate text-xs font-normal text-slate-600 dark:text-stone-300">
            {session.email}
          </span>
        </span>
      </HoldToConfirm>
    );
  }

  return (
    <a href="#/signin" onClick={onNavigate} className={shell}>
      <LogIn className="size-4 shrink-0 opacity-70" />
      <span className="min-w-0 flex-1">
        <span className="block">Sign in</span>
        <span className="block truncate text-xs font-normal text-slate-600 dark:text-stone-300">
          Keep your progress
        </span>
      </span>
    </a>
  );
}

export default DashboardNav;
