import React, { useState } from "react";
import {
  ArrowLeft,
  BarChart3,
  ChevronRight,
  Crown,
  Inbox,
  LayoutDashboard,
  LogOut,
  RefreshCw,
  ShieldCheck,
  Users,
} from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * The workspace rail, for admins and owners.
 *
 * Adapted rather than pasted. The original is written against shadcn tokens
 * (`bg-card`, `bg-primary`, `text-muted-foreground`, `border-border`) and this
 * project defines none of them, so every colour in it resolved to nothing. It
 * also leaned on `animate-in fade-in zoom-in-95`, which is `tailwindcss-animate`
 * and is not installed here.
 *
 * What was kept is the part worth keeping: the nav item with its collapsible
 * children, the guide line down the nested group, badges, and the hover-only
 * shortcut hint.
 *
 * The mock workspace switcher is gone. Blueberry has one workspace, so a
 * switcher offering "Acme Corp" and "Client Sandbox" would be three lies in a
 * dropdown. The header shows who you are and what you are instead, which is the
 * thing that actually differs between people looking at this page.
 */

/**
 * Any lucide icon, typed by the props actually handed to it.
 *
 * The original says `React.ElementType`, which is every possible component and
 * every intrinsic element at once, so TypeScript narrows the props at the call
 * site to `never` and rejects `className` and `strokeWidth`.
 */
type IconComponent = React.ComponentType<{ className?: string; strokeWidth?: number }>;

export type NavItemData = {
  id: string;
  title: string;
  icon: IconComponent;
  badge?: number | string;
  shortcut?: string;
  /** Marks a row as a signpost for something not built. It stays unclickable. */
  soon?: boolean;
  children?: NavItemData[];
};

export type NavGroupData = {
  heading?: string;
  items: NavItemData[];
};

function NavItem({
  item,
  activeId,
  onSelect,
  level = 0,
}: {
  item: NavItemData;
  activeId: string;
  onSelect: (id: string) => void;
  level?: number;
}) {
  const isActive = activeId === item.id;
  const hasChildren = Boolean(item.children?.length);
  const [isOpen, setIsOpen] = useState(false);

  const handleClick = () => {
    if (item.soon) return;
    if (hasChildren) setIsOpen((o) => !o);
    else onSelect(item.id);
  };

  return (
    <div className="flex w-full flex-col">
      <div
        role="button"
        tabIndex={item.soon ? -1 : 0}
        onClick={handleClick}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            handleClick();
          }
        }}
        style={{ paddingLeft: `${level * 12 + 10}px` }}
        className={cn(
          "group flex select-none items-center justify-between rounded-md py-[7px] pr-2.5 transition-colors",
          item.soon
            ? "cursor-default text-slate-400 dark:text-stone-500"
            : "cursor-pointer",
          !item.soon &&
            (isActive
              ? "bg-slate-100 font-semibold text-slate-900 dark:bg-white/10 dark:text-stone-100"
              : "text-slate-500 hover:bg-slate-100/70 hover:text-slate-900 dark:text-stone-400 dark:hover:bg-white/5 dark:hover:text-stone-100"),
        )}
      >
        <div className="flex min-w-0 items-center gap-2.5">
          <item.icon
            className={cn(
              "size-4 shrink-0 transition-colors",
              isActive ? "text-slate-900 dark:text-stone-100" : "opacity-70",
            )}
            strokeWidth={1.5}
          />
          <span className="truncate text-[13px]">{item.title}</span>
        </div>

        <div className="flex shrink-0 items-center gap-2">
          {item.soon && (
            <span className="rounded-full border border-dashed border-current px-1.5 font-mono text-[0.6rem] opacity-70">
              soon
            </span>
          )}
          {item.shortcut && (
            <kbd className="hidden h-5 items-center rounded border border-slate-200 bg-white px-1.5 font-mono text-[10px] text-slate-400 group-hover:inline-flex dark:border-stone-700 dark:bg-stone-900 dark:text-stone-500">
              {item.shortcut}
            </kbd>
          )}
          {item.badge !== undefined && item.badge !== 0 && (
            <span className="flex h-5 min-w-[20px] items-center justify-center rounded-full bg-indigo-500/10 px-1.5 text-[10px] font-semibold text-indigo-600 dark:text-indigo-300">
              {item.badge}
            </span>
          )}
          {hasChildren && (
            <ChevronRight
              className={cn("size-3.5 transition-transform duration-200", isOpen && "rotate-90")}
              strokeWidth={2}
            />
          )}
        </div>
      </div>

      {hasChildren && (
        <div
          className={cn(
            "grid transition-[grid-template-rows,opacity] duration-300 ease-in-out",
            isOpen ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0",
          )}
        >
          <div className="relative mt-0.5 flex min-h-0 flex-col gap-0.5 overflow-hidden">
            <div
              className="absolute top-0 bottom-0 border-l border-slate-200 dark:border-stone-700"
              style={{ left: `${level * 12 + 17.5}px` }}
            />
            {item.children!.map((child) => (
              <NavItem
                key={child.id}
                item={child}
                activeId={activeId}
                onSelect={onSelect}
                level={level + 1}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export type WorkspaceRole = "admin" | "owner";

/**
 * Owner is gold and admin is indigo, matching the crown already used in the
 * allowlist so the same person reads the same way in both places.
 */
function RoleBadge({ role }: { role: WorkspaceRole }) {
  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide",
        role === "owner"
          ? "bg-amber-400/15 text-amber-600 dark:text-amber-300"
          : "bg-indigo-500/10 text-indigo-600 dark:text-indigo-300",
      )}
    >
      {role === "owner" && <Crown className="size-3" />}
      {role}
    </span>
  );
}

export function SidebarNav({
  className,
  groups,
  bottomItems,
  activeId,
  onSelect,
  email,
  role,
}: {
  className?: string;
  groups: NavGroupData[];
  bottomItems: NavItemData[];
  activeId: string;
  onSelect: (id: string) => void;
  email: string;
  role: WorkspaceRole;
}) {
  return (
    <div
      className={cn(
        "flex h-full w-[248px] flex-col rounded-2xl border border-slate-200 bg-white/70 p-3 dark:border-stone-800 dark:bg-stone-900/50",
        className,
      )}
    >
      <div className="mb-3 flex items-center gap-2.5 rounded-lg px-1 py-1.5">
        <span className="flex size-8 shrink-0 items-center justify-center rounded-md bg-gradient-to-br from-indigo-500 to-fuchsia-500 text-[13px] font-bold text-white">
          {email.charAt(0).toUpperCase()}
        </span>
        <div className="flex min-w-0 flex-col gap-1">
          <span className="truncate font-mono text-[11px] leading-none text-slate-500 dark:text-stone-400">
            {email}
          </span>
          <RoleBadge role={role} />
        </div>
      </div>

      <div className="flex flex-1 flex-col gap-4 overflow-y-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {groups.map((group, idx) => (
          <div key={group.heading ?? idx} className="flex flex-col gap-0.5">
            {group.heading && (
              <span className="mb-1 px-2.5 font-mono text-[10px] tracking-wider text-slate-400 uppercase dark:text-stone-500">
                {group.heading}
              </span>
            )}
            {group.items.map((item) => (
              <NavItem key={item.id} item={item} activeId={activeId} onSelect={onSelect} />
            ))}
          </div>
        ))}
      </div>

      <div className="mt-auto flex flex-col gap-0.5 border-t border-slate-200 pt-3 dark:border-stone-800">
        {bottomItems.map((item) => (
          <NavItem key={item.id} item={item} activeId={activeId} onSelect={onSelect} />
        ))}
      </div>
    </div>
  );
}

/**
 * The workspace instance of the rail.
 *
 * Every row is something the page already does. The sidebar does not introduce
 * a second way of holding state: it calls the same handlers the header buttons
 * call, so opening Activity from here and from the toolbar are the same act.
 */
export function WorkspaceSidebar({
  email,
  role,
  unread,
  taskCount,
  memberCount,
  loading,
  activeId,
  onSelect,
  className,
}: {
  email: string;
  role: WorkspaceRole;
  unread: number;
  taskCount: number;
  memberCount: number;
  loading: boolean;
  activeId: string;
  onSelect: (id: string) => void;
  className?: string;
}) {
  const groups: NavGroupData[] = [
    {
      items: [
        { id: "board", title: "Board", icon: LayoutDashboard, badge: taskCount },
        { id: "feedback", title: "Feedback", icon: Inbox, badge: unread },
        { id: "activity", title: "Activity", icon: BarChart3 },
        {
          id: "refresh",
          title: loading ? "Refreshing…" : "Refresh",
          icon: RefreshCw,
        },
      ],
    },
    {
      heading: "Admin",
      items: [
        { id: "allowlist", title: "Who can sign in", icon: ShieldCheck, badge: memberCount },
        { id: "subscribers", title: "Subscribers", icon: Users, soon: true },
      ],
    },
  ];

  const bottomItems: NavItemData[] = [
    { id: "back", title: "Back to site", icon: ArrowLeft },
    { id: "signout", title: "Sign out", icon: LogOut },
  ];

  return (
    <SidebarNav
      className={className}
      groups={groups}
      bottomItems={bottomItems}
      activeId={activeId}
      onSelect={onSelect}
      email={email}
      role={role}
    />
  );
}

export default WorkspaceSidebar;
