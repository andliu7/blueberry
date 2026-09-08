import { useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "motion/react";
import {
  ArrowRight,
  ArrowUpRight,
  Bell,
  ChevronDown,
  Coffee,
  Eye,
  FlaskConical,
  Timer,
  Trophy,
  X,
} from "lucide-react";
import { DockSlot, DOCK, RailSlot, RAIL } from "@/components/ui/corner-dock";
import { RELEASES } from "@/data/releases";
import { formatClock, type useFocusTimer } from "@/lib/useFocusTimer";
import { cn } from "@/lib/utils";

/**
 * One list, two kinds of thing, sorted by time.
 *
 * It began as a record of what the timer did while you were not looking at it.
 * The card reopens itself at the three moments worth interrupting for, but that
 * is only useful if you happen to be at the screen; come back from a break
 * having missed two phase changes and there was no record that anything had
 * happened.
 *
 * It now also carries a second kind of entry, a `release`: a plain description
 * of what something on this site actually is, from `data/releases.ts`. Those
 * two things really are different, so each entry says which it is rather than
 * the panel guessing from its shape, and the difference is visible:
 *
 * - `timer` is a log line about this sitting. It is dated to the minute, it is
 *   yours, and "clear" throws it away.
 * - `release` is a standing description of the product. It is dated to the day,
 *   it is the same for everyone, and "clear" does not touch it, because a
 *   button that deletes the only sentence explaining what the site is would be
 *   a strange thing to ship.
 *
 * `Notice` is a discriminated union on `kind`: TypeScript narrows each branch
 * inside the renderer, so a release can never be read as a timer line and
 * adding a third kind fails to compile until the renderer handles it.
 *
 * The two sources keep their own read state for the same reason. Timer notices
 * are about *this* sitting, so they live in memory and a reload is the clearest
 * possible signal that the sitting is over. A release you have read stays read
 * across reloads, so its ids go to localStorage; re-announcing the same
 * paragraph on every visit is how a bell gets ignored.
 *
 * ## What the blind read against the reference changed
 *
 * Two kinds of content is not licence for two kinds of card. The panel used to
 * draw a timer line as a bare icon row and a release as a tinted bordered box
 * holding sixty unbroken words at one type size, and read side by side that is
 * not a list, it is a log with an essay dropped into it. Worse, the only
 * pressable things on screen were "clear" and a close X, so somebody who had
 * just read the one paragraph explaining what the site does was offered two
 * ways to throw it away and no way to act on it.
 *
 * So, three rules, and they are the reason this file looks the way it does:
 *
 * 1. **One row, one anatomy.** `NoticeRow` renders both kinds. Chip, title,
 *    stamp, and then optional slots underneath. A release is not a different
 *    component, it is the same component with more of its slots filled. The
 *    kinds are told apart by the colour of the glyph, never by the shape of the
 *    box.
 * 2. **Three sizes of text, not one.** A title you glance at, a one-line
 *    summary you read, and a body folded away behind a disclosure. Nothing in
 *    the collapsed panel is longer than two lines.
 * 3. **The primary press lives in the card, and the destructive one does not
 *    live next to the close.** The action is the filled gradient button the
 *    rest of the site uses for its primary, so it is unmistakable. "Clear
 *    session log" moved to a footer, at the far end of the panel from the X,
 *    because a destructive control that sits beside a dismissive one at the
 *    same weight is a mis-tap waiting to happen.
 *
 * `ui/expandable-text` was the obvious thing to reuse for rule 2 and does not
 * fit: it splits one string on its first sentence, and here the summary is
 * authored separately from the body precisely so the fold lands where a person
 * put it rather than where a regular expression did.
 *
 * ## What the second blind read changed
 *
 * The interior above survived; the way in did not. The next read against the
 * reference said the panel was reached only through an unlabelled 44px circle
 * in a corner stack of three unlabelled circles, so the one paragraph on the
 * site that says what this is was styled as the least important thing on the
 * screen. Two consequences live in this file:
 *
 * - The dock control carries the word "Notifications" and puts its count in a
 *   chip. A control captioned with a single digit is asking to be guessed at.
 * - A release now has a second home in `ui/release-banner`, which is the same
 *   entry given the page's own reading column. Both read and write one record
 *   through `markReleasesRead`, which is why that lives in a module-level store
 *   rather than in either component.
 *
 * ## What the third and fourth blind reads changed
 *
 * Giving the entry a second home fixed the finding and created the next one.
 * The read that followed said the message now existed in two competing
 * presentations at once: a full-width card in the page column AND a lit pill in
 * a corner holding up a badge about the same sentence, with nothing to say
 * which of them was the announcement. It also said the corner had become four
 * floating chips at one weight, and that the widest and brightest control on
 * the phone was chrome rather than the action.
 *
 * The first answer to that was a mount registry: while a banner was on screen
 * the corner dropped the release from its count, and put it back on any page
 * without one. It was still two presentations. It just took a route change to
 * see them both, and "which one is the announcement" now depended on which page
 * you happened to be standing on, which is a worse answer than either.
 *
 * So the choice is made once, in one direction, and the machinery is gone:
 *
 * - **The banner announces. The panel archives. Always, everywhere.** A release
 *   is announced in the page's own reading column, at the page's type scale,
 *   with the one thing to press inside it, and nowhere else. This corner never
 *   counts one. Its badge is the session log and only the session log, so a
 *   digit here always means the timer did something while you were away.
 * - **The corner is one entry, not four.** The control moved from a `DockSlot`
 *   of its own into `RailSlot`, the single shared pill, as its captioned head.
 *   It no longer carries a fill, a border or a shadow, because the rail carries
 *   those once for everybody, and a hairline divides it from the glyphs it
 *   heads so the row reads as one entry with tools attached rather than as four
 *   peers. See `ui/corner-dock`.
 */

export type TimerEvent = "focus" | "break" | "eyes" | "done";

export type Notice =
  | { id: string; kind: "timer"; event: TimerEvent; text: string; at: number }
  | {
      id: string;
      kind: "release";
      title: string;
      summary: string;
      body: string;
      action: { label: string; href: string; external?: boolean };
      at: number;
    };

/** The release half of the union, named because three surfaces now pass it around. */
export type ReleaseNotice = Extract<Notice, { kind: "release" }>;

const ICON = {
  focus: Timer,
  break: Coffee,
  eyes: Eye,
  done: Trophy,
} as const;

const TONE = {
  focus: "text-indigo-600 dark:text-indigo-300",
  break: "text-emerald-600 dark:text-emerald-300",
  eyes: "text-amber-600 dark:text-amber-300",
  done: "text-fuchsia-600 dark:text-fuchsia-300",
} as const;

/* Source one: the timer.
 * ------------------------------------------------------------------------- */

/**
 * Turns timer state changes into notices.
 *
 * Watching the phase rather than being told about it, so nothing in the timer
 * has to know this exists. The previous phase is kept in a ref: an effect that
 * compared against state would need that state as a dependency and would then
 * re-run and re-log on every tick.
 */
export function useTimerNotices(t: ReturnType<typeof useFocusTimer>) {
  const [notices, setNotices] = useState<Notice[]>([]);
  const [seen, setSeen] = useState(0);
  const lastPhase = useRef(t.phase);
  const lastRests = useRef(t.restsTaken);

  const push = (event: TimerEvent, text: string) =>
    setNotices((n) =>
      [
        {
          id: `${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
          kind: "timer" as const,
          event,
          text,
          at: Date.now(),
        },
        ...n,
      ].slice(0, 30),
    );

  useEffect(() => {
    const from = lastPhase.current;
    if (t.phase === from) return;
    lastPhase.current = t.phase;

    if (from === "focus" && t.phase === "break") {
      push("done", `Focus session finished. ${formatClock(t.settings.breakMinutes * 60_000)} break.`);
    } else if (from === "break" && t.phase === "idle") {
      push("break", "Break over. Ready when you are.");
    } else if (t.phase === "focus" && from === "idle") {
      push("focus", `Focusing for ${t.settings.focusMinutes} minutes.`);
    }
  }, [t.phase, t.settings.breakMinutes, t.settings.focusMinutes]);

  useEffect(() => {
    if (t.restsTaken > lastRests.current) {
      push("eyes", "Eye rest taken. The 20 minutes starts again.");
    }
    lastRests.current = t.restsTaken;
  }, [t.restsTaken]);

  const unread = Math.max(0, notices.length - seen);

  return {
    notices,
    unread,
    markRead: () => setSeen(notices.length),
    clear: () => {
      setNotices([]);
      setSeen(0);
    },
  };
}

/* Source two: the releases.
 * ------------------------------------------------------------------------- */

const SEEN_KEY = "blueberry:notices:releases-read";

/**
 * Which release ids this browser has already seen.
 *
 * Wrapped in try/catch on both sides because Safari's private mode throws on
 * `localStorage` rather than returning null, and a bell that crashes the page
 * is worse than a bell that repeats itself.
 */
function readSeenReleases(): string[] {
  try {
    const raw = localStorage.getItem(SEEN_KEY);
    const parsed: unknown = raw ? JSON.parse(raw) : null;
    return Array.isArray(parsed) ? parsed.filter((v): v is string => typeof v === "string") : [];
  } catch {
    // No store, or a corrupt one. Treating everything as unread is the safe end.
    return [];
  }
}

/**
 * Read state, in a module-level store rather than in each component's `useState`.
 *
 * Two surfaces now show the same release: `ReleaseBanner`, in the page's own
 * reading column, and the entry in this panel. Given a `useState` each, they
 * would hold two independent copies of the same record, so acting on the banner
 * would leave the bell still claiming one unread until the next reload.
 *
 * `useSyncExternalStore` is React's hook for exactly this shape: one value that
 * lives outside React, read by several components, that has to re-render all of
 * them the moment it changes. Three parts, and the third is the one that bites:
 * `subscribe` registers a listener, `getSnapshot` returns the value, and the
 * snapshot has to be reference-stable between changes. Building a fresh array
 * inside `getSnapshot` would make React think the store changed on every render
 * and loop, which is why `seenSnapshot` is a cached array reassigned only on a
 * real write.
 */
let seenSnapshot: string[] = readSeenReleases();
const seenListeners = new Set<() => void>();

function subscribeSeen(fn: () => void) {
  seenListeners.add(fn);
  return () => {
    seenListeners.delete(fn);
  };
}

function getSeen() {
  return seenSnapshot;
}

/**
 * Marks every release read, on disk and for every mounted reader.
 *
 * Exported because the banner is the other place a person finishes reading one,
 * and it should not have to open the panel to say so.
 */
export function markReleasesRead() {
  seenSnapshot = RELEASES.map((r) => r.id);
  try {
    localStorage.setItem(SEEN_KEY, JSON.stringify(seenSnapshot));
  } catch {
    // Read state is a convenience, not the content. Losing it costs nothing.
  }
  for (const fn of seenListeners) fn();
}

// Static data, so the list is built once at module scope rather than memoised
// per hook. Without this the merge below would re-sort on every tick of the
// timer's clock, and each reader would hold a different array of the same rows.
const RELEASE_NOTICES: ReleaseNotice[] = RELEASES.map((r) => ({
  id: r.id,
  kind: "release" as const,
  title: r.title,
  summary: r.summary,
  body: r.body,
  action: r.action,
  at: Date.parse(r.at),
}));

/**
 * The archive half: every release, always, in time order.
 *
 * No unread count and no subscription to the seen store, and that is the whole
 * point rather than an omission. The panel lists every release whether or not
 * it has been read, so read state changes nothing here and nothing has to
 * re-render when it moves. Only the banner cares which are unread, and it asks
 * `useUnreadRelease` below.
 */
export function useReleaseNotices() {
  return { notices: RELEASE_NOTICES, markRead: markReleasesRead };
}

/**
 * The newest release this browser has not read yet, or null once it has.
 *
 * What the banner is driven by. Newest first, and only one: an announcement
 * that stacks is a feed, and a feed in the primary slot of a page about
 * something else is the thing banners get hated for.
 */
export function useUnreadRelease(): ReleaseNotice | null {
  const seen = useSyncExternalStore(subscribeSeen, getSeen);
  const unread = RELEASE_NOTICES.filter((n) => !seen.includes(n.id));
  if (unread.length === 0) return null;
  return unread.reduce((newest, n) => (n.at > newest.at ? n : newest));
}

/* The merge.
 * ------------------------------------------------------------------------- */

/**
 * Both sources, one list, newest first.
 *
 * Sorting on `at` rather than concatenating in source order is the point: a
 * release from last week belongs under a break that ended a minute ago, and it
 * gets there because both carry a real timestamp and nothing else decides.
 */
export function useNotices(t: ReturnType<typeof useFocusTimer>) {
  const timer = useTimerNotices(t);
  const releases = useReleaseNotices();

  const notices = useMemo(
    () => [...timer.notices, ...releases.notices].sort((a, b) => b.at - a.at),
    [timer.notices, releases.notices],
  );

  // The list is the whole list. The count is not: it is the session log alone,
  // because a release is announced by `ReleaseBanner` in the page's own column
  // and a corner holding up a number about the same sentence is the second
  // presentation this surface just spent a round deleting. The entry is still
  // in the list below, which is what the panel is for.

  return {
    notices,
    unread: timer.unread,
    markRead: () => {
      timer.markRead();
      releases.markRead();
    },
    // Clears the log and nothing else. Releases are not the visitor's to delete.
    clear: timer.clear,
    clearable: timer.notices.length > 0,
  };
}

/* The panel.
 * ------------------------------------------------------------------------- */

const dayFormat = new Intl.DateTimeFormat([], { day: "numeric", month: "short" });
const timeFormat = new Intl.DateTimeFormat([], { hour: "2-digit", minute: "2-digit" });

export function NotificationsTab({
  notices,
  unread,
  markRead,
  clear,
  clearable,
}: ReturnType<typeof useNotices>) {
  const [open, setOpen] = useState(false);

  return (
    <>
      {/* The scrim, on phones only.
          The panel opens over whatever page you were on, and several of those
          pages are a full-bleed photograph. Against one, a translucent card had
          no edge left: the blind read said the corners mushed into the
          background. Two fixes, and both are needed. The surface below is now
          opaque rather than /95, and on a small screen the page behind it dims,
          which is also the tap-to-close a phone expects. It sits at z-99, one
          below the dock, so it darkens the page and never the panel. */}
      {open && <Scrim onClose={() => setOpen(false)} />}

      {/* The panel is its own surface in the column; the control that opens it
          is a member of the shared rail underneath. They were one slot before,
          which is what made the corner read as a stack of independent chips. */}
      <DockSlot order={DOCK.notes + 1} className="flex flex-col items-end gap-2">
        <AnimatePresence initial={false}>
          {open && (
            <motion.div
              initial={{ opacity: 0, y: 10, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 10, scale: 0.97 }}
              transition={{ duration: 0.2, ease: "easeOut" }}
              className="scrollbar-none max-h-[min(30rem,72dvh)] w-[min(22rem,calc(100vw-2rem))] overflow-y-auto rounded-2xl border border-slate-200 bg-white text-slate-900 shadow-2xl ring-1 ring-slate-900/5 dark:border-stone-800 dark:bg-stone-950 dark:text-stone-100 dark:ring-white/10"
            >
              {/* One control, so there is nothing to mistake it for. "Clear"
                  used to sit here in lowercase mono beside the X at the same
                  weight, which put a destructive button and a dismissive one in
                  the same place looking the same. It is in the footer now. */}
              <header className="sticky top-0 z-10 flex items-center gap-2 border-b border-slate-100 bg-white px-4 py-3 dark:border-stone-900 dark:bg-stone-950">
                <Bell className="size-4 text-indigo-600 dark:text-indigo-300" />
                <span className="flex-1 text-sm font-semibold">Notifications</span>
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  aria-label="Close notifications"
                  className="cursor-pointer rounded-full p-1 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700 active:scale-95 dark:hover:bg-stone-900 dark:hover:text-stone-200"
                >
                  <X className="size-4" />
                </button>
              </header>

              {notices.length === 0 ? (
                <p className="px-4 py-6 text-center text-sm text-slate-500 dark:text-stone-400">
                  Nothing yet. Start a session and the timer will keep a note of what it did.
                </p>
              ) : (
                <ul className="flex flex-col gap-1.5 p-2">
                  {notices.map((n) => (
                    <NoticeRow key={n.id} notice={n} onAct={() => setOpen(false)} />
                  ))}
                </ul>
              )}

              {/* Only offered when there is a log to throw away. With just a
                  release listed, a "clear" that visibly did nothing would read
                  as a broken button. The label says which of the two kinds it
                  takes, so nobody has to find out by pressing it. */}
              {clearable && (
                <footer className="border-t border-slate-100 px-2 py-2 dark:border-stone-900">
                  <button
                    type="button"
                    onClick={clear}
                    className="w-full cursor-pointer rounded-lg px-2 py-1.5 text-left text-xs font-medium text-slate-400 transition-colors hover:bg-slate-50 hover:text-slate-600 dark:text-stone-500 dark:hover:bg-stone-900 dark:hover:text-stone-300"
                  >
                    Clear session log
                  </button>
                </footer>
              )}
            </motion.div>
          )}
        </AnimatePresence>

      </DockSlot>

      {/*
        The head of the rail: the one member with a word on it.

        It says what it is, in words, always. It used to be a bell glyph and a
        bare numeral, and a blind read named that exactly right: nothing told a
        stranger that the quietest control on the screen held the one paragraph
        explaining what this site is.

        The next read said the opposite thing about the same button. Given its
        own lit pill it had become the widest, brightest control on the phone,
        which is chrome outranking the action. So the word stays and the surface
        goes: the rail carries the fill, the border and the shadow once, and
        this is a caption inside it.

        The count is a chip rather than the label, because "1" is not a word and
        a control whose entire caption is a digit is asking to be guessed at. It
        counts the session log and nothing else; see `useNotices`.

        The hairline is what turns four peers into one entry with three tools
        attached to it. Rank cannot be carried by the caption alone: a row of
        equal 44px targets reads as equal however one of them is labelled, and
        a divider is the cheapest mark that says "these belong to that".
      */}
      <RailSlot order={RAIL.notifications}>
        <span
          aria-hidden
          className="mr-1.5 ml-0.5 h-5 w-px shrink-0 bg-slate-200 dark:bg-stone-700"
        />
        <button
          type="button"
          onClick={() => {
            setOpen((o) => !o);
            markRead();
          }}
          aria-expanded={open}
          aria-label={unread > 0 ? `Notifications, ${unread} unread` : "Notifications"}
          className={cn(
            "relative flex min-h-11 cursor-pointer items-center gap-1.5 rounded-full pr-2.5 pl-3 text-sm font-medium transition-colors active:scale-95",
            open
              ? "bg-slate-100 text-slate-900 dark:bg-stone-800 dark:text-white"
              : "text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-stone-300 dark:hover:bg-stone-800 dark:hover:text-white",
          )}
        >
          <Bell className="size-4 shrink-0" />
          <span>Notifications</span>
          {unread > 0 && (
            <span className="flex min-w-[1.125rem] items-center justify-center rounded-full bg-indigo-600 px-1 text-[0.6875rem] leading-[1.125rem] font-bold tabular-nums text-white dark:bg-indigo-500">
              {unread}
            </span>
          )}
        </button>
      </RailSlot>
    </>
  );
}

/**
 * The dim behind the panel on a phone.
 *
 * Portalled to `<body>` rather than rendered inside the dock: the dock column
 * is a narrow strip pinned to one corner, and a full-screen backdrop cannot
 * live inside something that is `right-4 bottom-4`. No exit animation on
 * purpose, because an unmount that lingers behind a panel which has already
 * gone reads as a stuck overlay.
 */
function Scrim({ onClose }: { onClose: () => void }) {
  return createPortal(
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.18, ease: "easeOut" }}
      onClick={onClose}
      aria-hidden
      className="fixed inset-0 z-[99] bg-slate-950/45 backdrop-blur-[2px] sm:hidden"
    />,
    document.body,
  );
}

/**
 * One row for both kinds.
 *
 * Every notice gets the same frame: a tinted chip, a title, a stamp. What
 * separates a release is the slots it fills underneath, not the box it is drawn
 * in. That is deliberate and it is the fix for the blind read, which saw a bare
 * icon row and a bordered tinted card in the same list and could not tell
 * whether it was looking at one component or two.
 *
 * The disclosure state is local to the row. Hoisting it to the panel would mean
 * the panel re-rendering every list item to open one of them, and the list is
 * the thing being scrolled at the time.
 *
 * `onAct` closes the panel behind the action. The dock is portalled to the
 * document, so a hash route change does not unmount it, and without this the
 * panel would still be sitting over the page it just sent you to.
 */
function NoticeRow({ notice, onAct }: { notice: Notice; onAct: () => void }) {
  const [open, setOpen] = useState(false);
  const bodyId = `notice-body-${notice.id}`;

  const Icon = notice.kind === "release" ? FlaskConical : ICON[notice.event];
  const glyph = notice.kind === "release" ? "text-indigo-600 dark:text-indigo-300" : TONE[notice.event];
  const chip =
    notice.kind === "release"
      ? "bg-indigo-50 dark:bg-indigo-500/15"
      : "bg-slate-100 dark:bg-stone-900";
  const title = notice.kind === "release" ? notice.title : notice.text;
  // Dated to the day for a release, to the minute for a log line. The minute a
  // standing description went live means nothing to anybody.
  const stamp =
    notice.kind === "release" ? dayFormat.format(notice.at) : timeFormat.format(notice.at);

  return (
    <li className="rounded-xl border border-slate-200/80 bg-white p-3 dark:border-stone-800/80 dark:bg-stone-900/40">
      <div className="flex items-start gap-2.5">
        <span className={cn("mt-px flex size-7 shrink-0 items-center justify-center rounded-lg", chip)}>
          <Icon className={cn("size-4", glyph)} />
        </span>
        <p className="min-w-0 flex-1 text-sm leading-snug font-semibold text-slate-900 dark:text-stone-50">
          {title}
        </p>
        <span className="mt-0.5 shrink-0 text-[0.6875rem] tabular-nums text-slate-400 dark:text-stone-500">
          {stamp}
        </span>
      </div>

      {notice.kind === "release" && (
        <div className="mt-1.5 pl-[2.375rem]">
          {/* Three levels, and they are the point: the title is near-black and
              semibold, the summary is grey, the body below is greyer still. A
              reader stops at whichever level answers their question, which is
              what a single type size took away.

              Clamped as a guard rather than as a plan. The summary is authored
              to be a line or two; the clamp is there so a future entry that
              runs long gets trimmed on a narrow phone instead of reopening the
              wall this row exists to close. */}
          <p className="line-clamp-3 text-[0.8125rem] leading-snug text-slate-700 dark:text-stone-200">
            {notice.summary}
          </p>

          <AnimatePresence initial={false}>
            {open && (
              <motion.div
                key="body"
                id={bodyId}
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.2, ease: "easeOut" }}
                className="overflow-hidden"
              >
                <p className="mt-2 border-t border-slate-100 pt-2 text-[0.8125rem] leading-relaxed text-slate-500 dark:border-stone-800 dark:text-stone-400">
                  {notice.body}
                </p>
              </motion.div>
            )}
          </AnimatePresence>

          <button
            type="button"
            onClick={() => setOpen((o) => !o)}
            aria-expanded={open}
            aria-controls={bodyId}
            className="mt-1.5 -ml-1 flex cursor-pointer items-center gap-1 rounded-md px-1 py-0.5 text-xs font-medium text-slate-400 transition-colors hover:text-slate-600 active:scale-95 dark:text-stone-500 dark:hover:text-stone-300"
          >
            {open ? "Less" : "More"}
            <ChevronDown className={cn("size-3.5 transition-transform", open && "rotate-180")} />
          </button>

          {/* The one thing to press, in the site's primary language: filled,
              gradient, and wearing the same `bb-press` ledge as Get Started.
              Nothing else in this panel is filled, so there is no contest over
              which control is the next step. */}
          <a
            href={notice.action.href}
            {...(notice.action.external ? { target: "_blank", rel: "noreferrer" } : {})}
            onClick={onAct}
            className="bb-press mt-3 mb-1 flex min-h-11 w-full cursor-pointer items-center justify-center gap-1.5 rounded-xl bg-gradient-to-r from-indigo-600 to-fuchsia-600 px-4 text-sm font-semibold text-white"
          >
            {notice.action.label}
            {notice.action.external ? (
              <ArrowUpRight className="size-4" />
            ) : (
              <ArrowRight className="size-4" />
            )}
          </a>
        </div>
      )}
    </li>
  );
}

export default NotificationsTab;
