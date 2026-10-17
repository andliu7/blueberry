"use client";

import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import { createPortal } from "react-dom";
import {
  AlertTriangle,
  BookOpen,
  CalendarCheck,
  ChevronLeft,
  ChevronRight,
  Clock,
  FileText,
  FlaskConical,
  PencilLine,
  Plus,
  Search,
  Users,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import {
  CELL_ROW_PX,
  WEEKDAY_NAMES,
  cellEntries,
  chipCapacity,
  fitCell,
  fitChips,
  leadDays,
  nothingLine,
} from "@/lib/calendarCells";

/**
 * The course calendar: what is due, what is examined, and when.
 *
 * Adapted from a general-purpose event manager, and the adaptation is mostly
 * subtraction. That component modelled a working calendar — attendees, freeform
 * tags, six user-pickable colours, drag-to-reschedule, and month/week/day/list
 * views. A course is not a working calendar. Nobody drags an exam to a
 * different Tuesday, the colour of a midterm is not a preference, and a
 * 24-row hour grid for a week holding three lectures is mostly empty cells.
 *
 * What replaces it is the thing a student actually opens a calendar for: how
 * long until the next exam. Hence `kind` as a closed set with fixed colour and
 * icon, and a relative countdown on everything upcoming.
 *
 * The look of the grid follows the master calendar in the Focus Family
 * pamphlet guide (ff_technical_instructions, 2026-09-27): tall month cells with
 * tinted chips, a colour rule down each chip's left edge, greyed days outside
 * the month, and a week view whose columns are as tall as what is in them.
 * The filter chips double as the key: each carries its category's icon in its
 * colour, so there is no separate key dialog to find.
 *
 * No Radix and no shadcn primitives, matching every other integrated component
 * here — see the header notes in `404-page-not-found.tsx`, `contact-2.tsx` and
 * `notification-bell.tsx` for the same call. The one thing Radix would have
 * genuinely provided, a real dialog keyboard contract, lives in `modal.tsx`.
 *
 * Colours come from `src/components/schedule.css` (the `data-cat` rules), which
 * the Schedule page loads; this calendar is only used there.
 */

export type CourseDateKind = "exam" | "quiz" | "assignment" | "lecture" | "lab" | "office-hours";

export interface CourseDate {
  id: string;
  title: string;
  detail?: string;
  start: Date;
  /** Optional. Assignments are a deadline, not a span. */
  end?: Date;
  kind: CourseDateKind;
  /** Ids from `src/data/topics.ts`, once a syllabus import is writing them. */
  topicIds?: string[];
}

/**
 * What the Schedule page lays over the course dates: an office-hour slot you can
 * book, and a session you have booked. They come from the office-hours tables,
 * not `course_dates`, so they are never editable here; pressing one hands it
 * back to the page (`onOpenItem`), which opens the booking sheet.
 */
export type ScheduleKind = "open-slot" | "my-session";
export interface ScheduleItem {
  id: string;
  title: string;
  detail?: string;
  start: Date;
  end?: Date;
  kind: ScheduleKind;
}
type CalendarKind = CourseDateKind | ScheduleKind;
type Item = Omit<CourseDate, "kind"> & { kind: CalendarKind };
const isScheduleKind = (k: CalendarKind): k is ScheduleKind => k === "open-slot" || k === "my-session";

/**
 * The five categories a student filters by, each with its own colour
 * (schedule.css, `[data-cat]`): exams violet, deadlines berry, class neutral,
 * office hours the blue touch, your sessions green. Red is not used: in
 * Blueberry red means delete.
 *
 * Colour never carries the meaning alone. Every kind also has an icon and a
 * word, the chip text is the same dark ink on every kind, and on a phone a
 * deadline's bar is hollow where the others are filled.
 */
export type Category = "exam" | "due" | "class" | "hours" | "mine";

const KINDS: Record<CalendarKind, { label: string; Icon: typeof AlertTriangle; cat: Category }> = {
  exam: { label: "Exam", Icon: AlertTriangle, cat: "exam" },
  quiz: { label: "Quiz", Icon: PencilLine, cat: "exam" },
  assignment: { label: "Assignment", Icon: FileText, cat: "due" },
  lecture: { label: "Lecture", Icon: BookOpen, cat: "class" },
  lab: { label: "Lab", Icon: FlaskConical, cat: "class" },
  "office-hours": { label: "Office hours", Icon: Users, cat: "hours" },
  "open-slot": { label: "Open slot", Icon: Clock, cat: "hours" },
  "my-session": { label: "My session", Icon: CalendarCheck, cat: "mine" },
};

const KIND_ORDER = Object.keys(KINDS) as CalendarKind[];
/** The kinds a course date can be, which is what the editor offers. */
const EDITABLE_KINDS = KIND_ORDER.filter((k): k is CourseDateKind => !isScheduleKind(k));

/**
 * The filter chips, by what a student is looking for rather than by table
 * column (SITE-REPLAN.md section 4: Exams, Deadlines, Office hours, My sessions,
 * plus Class so lectures and labs can still be hidden). Each chip is also the
 * key for its colour, so each names its own mark.
 */
const CATEGORIES: { id: Category; label: string; kinds: CalendarKind[]; Icon: typeof AlertTriangle }[] = [
  { id: "exam", label: "Exams", kinds: ["exam", "quiz"], Icon: AlertTriangle },
  { id: "due", label: "Deadlines", kinds: ["assignment"], Icon: FileText },
  { id: "class", label: "Class", kinds: ["lecture", "lab"], Icon: BookOpen },
  { id: "hours", label: "Office hours", kinds: ["office-hours", "open-slot"], Icon: Clock },
  { id: "mine", label: "My sessions", kinds: ["my-session"], Icon: CalendarCheck },
];
const DAY_MS = 86_400_000;

const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate());
const sameDay = (a: Date, b: Date) => startOfDay(a).getTime() === startOfDay(b).getTime();
const daysUntil = (d: Date) =>
  Math.round((startOfDay(d).getTime() - startOfDay(new Date()).getTime()) / DAY_MS);

/**
 * Always six rows, even in a month that fits in five.
 *
 * A grid that changes height as you page through the term shoves everything
 * below it up and down, which is the layout shift the performance rules are
 * about and is unpleasant besides.
 */
function monthGrid(anchor: Date): Date[] {
  const first = new Date(anchor.getFullYear(), anchor.getMonth(), 1);
  return Array.from(
    { length: 42 },
    (_, i) => new Date(first.getFullYear(), first.getMonth(), 1 - leadDays(first) + i),
  );
}

const timeOf = (d: Date) =>
  d.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });

/** "Today", "Tomorrow", "in 5 days" — the number the calendar exists to answer. */
function countdown(d: Date): { text: string; urgent: boolean } | null {
  const n = daysUntil(d);
  if (n < 0) return null;
  if (n === 0) return { text: "Today", urgent: true };
  if (n === 1) return { text: "Tomorrow", urgent: true };
  if (n <= 7) return { text: `in ${n} days`, urgent: n <= 3 };
  return null;
}

/** `datetime-local` wants a local wall-clock string, not a UTC instant. */
const toLocalInput = (d: Date) =>
  new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16);

export interface CourseCalendarProps {
  /**
   * The source of truth. Held by the caller rather than copied into state here,
   * so dates arriving late — from a Sheet, or from a syllabus import — actually
   * appear. The component this came from seeded state from props once and then
   * ignored them forever, which reads as "the calendar is empty" whenever the
   * fetch has not landed yet.
   */
  dates?: CourseDate[];
  onCreate?: (date: Omit<CourseDate, "id">) => void;
  onUpdate?: (id: string, date: CourseDate) => void;
  onDelete?: (id: string) => void;
  /**
   * Staff only, and presentation only. A student cannot move an exam, so
   * without this no editing controls render at all. The server still has to
   * re-check on every write — a flag in the browser is a hint, not a gate.
   */
  canEdit?: boolean;
  /** Office-hour slots and booked sessions, drawn beside the course dates. */
  items?: ScheduleItem[];
  /** Pressing a slot or a session. The page decides what opens. */
  onOpenItem?: (item: ScheduleItem) => void;
  /** Hide the My sessions chip when nobody is signed in to have any. */
  showMine?: boolean;
  defaultView?: "month" | "week" | "agenda";
  /**
   * Desktop only: an element beside the grid (the page's side column) where the
   * picked day's list is drawn, so picking a day never takes the grid away.
   * Without it, or below 1024px, the list sits under the grid.
   */
  dayDock?: HTMLElement | null;
  /** Called when a day is pressed, so the page can show `dayDock`. */
  onPickDay?: (day: Date) => void;
  className?: string;
}

type View = "month" | "week" | "agenda";
const VIEWS: { id: View; label: string }[] = [
  { id: "month", label: "Month" },
  { id: "week", label: "Week" },
  { id: "agenda", label: "List" },
];

export function CourseCalendar({
  dates = [],
  onCreate,
  onUpdate,
  onDelete,
  canEdit = false,
  items: scheduleItems = [],
  onOpenItem,
  showMine = true,
  defaultView = "month",
  dayDock = null,
  onPickDay,
  className,
}: CourseCalendarProps) {
  const [view, setView] = useState<View>(defaultView);
  const [anchor, setAnchor] = useState(() => startOfDay(new Date()));
  const [selectedDay, setSelectedDay] = useState(() => startOfDay(new Date()));
  const [query, setQuery] = useState("");
  const [cats, setCats] = useState<Category[]>([]);
  const [showPast, setShowPast] = useState(false);
  // Phone only: the search field stays folded behind an icon until asked for.
  const [searchOpen, setSearchOpen] = useState(false);

  const [editing, setEditing] = useState<CourseDate | null>(null);
  const [mode, setMode] = useState<"create" | "edit">("create");
  const [formError, setFormError] = useState<string | null>(null);

  const gridRef = useRef<HTMLDivElement>(null);
  const dayListRef = useRef<HTMLElement>(null);
  // From 1024px the day's list goes into the page's side column, if it gave one.
  const docked = useWide() && dayDock !== null;

  /**
   * How many chip rows a month cell holds, measured rather than assumed, so a
   * larger font or a browser zoom still never clips a chip. A ResizeObserver
   * calls back whenever the first cell changes size; the state it sets is
   * the only thing the cells read. Where there is no ResizeObserver (tests),
   * the design height stands in.
   */
  const [capacity, setCapacity] = useState(() => chipCapacity(CELL_ROW_PX));
  useEffect(() => {
    const cell = gridRef.current?.firstElementChild;
    if (!cell || typeof ResizeObserver === "undefined") return;
    const ro = new ResizeObserver(([entry]) => setCapacity(chipCapacity((entry.target as HTMLElement).offsetHeight)));
    ro.observe(cell);
    return () => ro.disconnect();
  }, [view]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const shown = new Set(CATEGORIES.filter((c) => cats.includes(c.id)).flatMap((c) => c.kinds));
    return [...dates, ...scheduleItems]
      .filter((d: Item) => {
        if (shown.size > 0 && !shown.has(d.kind)) return false;
        if (!q) return true;
        return (
          d.title.toLowerCase().includes(q) ||
          d.detail?.toLowerCase().includes(q) ||
          KINDS[d.kind].label.toLowerCase().includes(q)
        );
      })
      .sort((a, b) => a.start.getTime() - b.start.getTime());
  }, [dates, scheduleItems, query, cats]);

  const byDay = useMemo(() => {
    const map = new Map<number, Item[]>();
    for (const d of filtered) {
      const key = startOfDay(d.start).getTime();
      const list = map.get(key);
      if (list) list.push(d);
      else map.set(key, [d]);
    }
    return map;
  }, [filtered]);

  const agenda = useMemo(() => {
    const today = startOfDay(new Date()).getTime();
    return showPast ? filtered : filtered.filter((d) => startOfDay(d.start).getTime() >= today);
  }, [filtered, showPast]);

  const selectedDayDates = byDay.get(selectedDay.getTime()) ?? [];
  const filtersActive = cats.length > 0 || query.trim() !== "";

  const goToday = () => {
    const today = startOfDay(new Date());
    setAnchor(today);
    setSelectedDay(today);
  };

  const shiftMonth = (by: number) =>
    setAnchor((prev) => new Date(prev.getFullYear(), prev.getMonth() + by, 1));

  /** The week view pages by seven days and keeps the month title in step. */
  const shiftWeek = (by: number) => {
    const next = new Date(selectedDay.getFullYear(), selectedDay.getMonth(), selectedDay.getDate() + by * 7);
    setSelectedDay(next);
    setAnchor(new Date(next.getFullYear(), next.getMonth(), 1));
  };
  const weekDays = useMemo(() => {
    const first = new Date(selectedDay.getFullYear(), selectedDay.getMonth(), selectedDay.getDate() - leadDays(selectedDay));
    return Array.from({ length: 7 }, (_, i) => new Date(first.getFullYear(), first.getMonth(), first.getDate() + i));
  }, [selectedDay]);

  /**
   * Pressing an item. A slot or a session goes back to the page (the booking
   * sheet); a course date opens the editor, and only for staff.
   */
  const openItem = (item: Item) => {
    if (isScheduleKind(item.kind)) onOpenItem?.(item as ScheduleItem);
    else if (canEdit) {
      setMode("edit");
      setFormError(null);
      setEditing(item as CourseDate);
    }
  };
  const isOpenable = (item: Item) => isScheduleKind(item.kind) ? Boolean(onOpenItem) : canEdit;

  /**
   * Pressing a day. On a laptop the day's list is already beside the grid (the
   * dock), so nothing moves. Under the grid, if the cell was hiding chips behind
   * "+N more", the list is brought into view, so "+N more" opens the day.
   */
  const pickDay = (day: Date, hidden: number) => {
    setSelectedDay(startOfDay(day));
    onPickDay?.(startOfDay(day));
    if (hidden > 0 && !docked) {
      const reduced = document.documentElement.dataset.motion === "reduced";
      requestAnimationFrame(() =>
        dayListRef.current?.scrollIntoView?.({ block: "nearest", behavior: reduced ? "auto" : "smooth" }),
      );
    }
  };

  /**
   * Arrow keys walk the grid, the way every date picker does.
   *
   * Only the selected cell is tabbable — 42 tab stops to cross one month would
   * make the keyboard path worse than no keyboard path.
   */
  const onGridKeyDown = (e: React.KeyboardEvent) => {
    const moves: Record<string, number> = {
      ArrowLeft: -1,
      ArrowRight: 1,
      ArrowUp: -7,
      ArrowDown: 7,
    };
    const step = moves[e.key];
    if (step === undefined) return;
    e.preventDefault();

    const next = new Date(selectedDay);
    next.setDate(next.getDate() + step);
    setSelectedDay(next);
    if (next.getMonth() !== anchor.getMonth() || next.getFullYear() !== anchor.getFullYear()) {
      setAnchor(new Date(next.getFullYear(), next.getMonth(), 1));
    }
    // The cell may not exist until after the month re-renders.
    requestAnimationFrame(() => {
      gridRef.current
        ?.querySelector<HTMLButtonElement>(`[data-day="${startOfDay(next).getTime()}"]`)
        ?.focus();
    });
  };

  const openCreate = useCallback(
    (on: Date) => {
      const start = new Date(on);
      // Nine in the morning, not "now" and not blank. The original opened with
      // both date fields empty and a Create button that silently did nothing
      // until you filled them — a dead control with no explanation.
      start.setHours(9, 0, 0, 0);
      setMode("create");
      setFormError(null);
      setEditing({ id: "", title: "", kind: "assignment", start });
    },
    [],
  );

  const submit = () => {
    if (!editing) return;
    if (!editing.title.trim()) {
      setFormError("Give it a title.");
      return;
    }
    if (Number.isNaN(editing.start.getTime())) {
      setFormError("That start date is not valid.");
      return;
    }
    if (editing.end && editing.end.getTime() < editing.start.getTime()) {
      setFormError("The end time is before the start time.");
      return;
    }

    if (mode === "create") {
      const { id: _drop, ...rest } = editing;
      onCreate?.({ ...rest, title: rest.title.trim() });
    } else {
      onUpdate?.(editing.id, { ...editing, title: editing.title.trim() });
    }
    setEditing(null);
  };

  /**
   * The filter chips, which are also the key. On a phone they sit under the
   * month grid, right below the bars they explain, in one row that scrolls
   * sideways, with the search icon at its start; from 640px they sit above the
   * grid and wrap. (Rendered in one of two places by breakpoint, which is why
   * this is a variable rather than inline JSX.)
   */
  const filters = (where: "top" | "bottom") => (
    <div
      className={cn(
        "-mx-1 items-center gap-1.5 overflow-x-auto px-1 pb-1 sm:flex-wrap sm:overflow-visible sm:pb-0",
        where === "bottom" ? "flex sm:hidden" : view === "month" ? "hidden sm:flex" : "flex",
      )}
    >
      <IconButton
        label={searchOpen ? "Hide search" : "Search the calendar"}
        aria-expanded={searchOpen}
        onClick={() => setSearchOpen((o) => !o)}
        className="shrink-0 sm:hidden"
      >
        <Search className="size-4" />
      </IconButton>
      {CATEGORIES.filter((c) => showMine || c.id !== "mine").map((c) => {
        const on = cats.includes(c.id);
        return (
          <button
            key={c.id}
            type="button"
            aria-pressed={on}
            onClick={() =>
              setCats((prev) =>
                prev.includes(c.id) ? prev.filter((k) => k !== c.id) : [...prev, c.id],
              )
            }
            className={cn(
              "sch-focus flex min-h-11 shrink-0 cursor-pointer items-center gap-1.5 whitespace-nowrap rounded-full px-3.5 text-sm font-semibold ring-1 transition-colors duration-200",
              on
                ? "bg-[var(--bb-wash)] text-[var(--bb-deep)] ring-2 ring-[var(--site-primary)]"
                : "bg-card text-[var(--site-quiet)] ring-[var(--site-border)] hover:bg-[var(--bb-wash)]",
            )}
          >
            <c.Icon aria-hidden data-cat={c.id} className="sch-mark size-4" strokeWidth={2.5} />
            {c.label}
          </button>
        );
      })}
      {filtersActive && (
        <Button
          variant="ghost"
          onClick={() => {
            setCats([]);
            setQuery("");
          }}
          className="shrink-0 text-muted-foreground"
        >
          <X className="size-3.5" />
          Clear
        </Button>
      )}
    </div>
  );

  /** The picked day's full list: under the grid, or in the page's dock beside it. */
  const daySection = (
    <section ref={dayListRef} aria-live="polite" className="scroll-mt-24">
      <h3
        className={cn(
          "mb-2 font-semibold text-[var(--bb-deep)]",
          docked ? "title-face text-xl font-extrabold" : "text-sm",
        )}
      >
        {selectedDay.toLocaleDateString(undefined, {
          weekday: "long",
          day: "numeric",
          month: "long",
        })}
      </h3>
      {selectedDayDates.length === 0 ? (
        <Empty>Nothing scheduled.</Empty>
      ) : (
        <ul className="flex flex-col gap-2">
          {selectedDayDates.map((item) => (
            <DateRow
              key={item.id}
              item={item}
              openable={isOpenable(item)}
              onOpen={() => openItem(item)}
            />
          ))}
        </ul>
      )}
    </section>
  );

  // `min-h-0` on the root as well as on the grid. A flex child defaults to
  // `min-height: auto`, so it will not shrink below its content no matter what
  // its own children are told. Without it the chain broke one level above the
  // grid: the card measured 358px and its children still measured 654px.
  return (
    <div className={cn("flex min-h-0 flex-1 flex-col gap-3", className)}>
      {/* One row of controls on a phone (month, arrows, Today, view), and on a
          laptop the search joins it, with the filter chips as a second row. */}
      <header className="flex flex-wrap items-center gap-1 sm:gap-2">
        <h2 className="title-face min-w-0 truncate text-lg font-extrabold text-[var(--bb-deep)] sm:text-xl">
          {view === "agenda" ? (
            "Coming up"
          ) : (
            <>
              <span className="sm:hidden">{anchor.toLocaleDateString(undefined, { month: "short", year: "numeric" })}</span>
              <span className="hidden sm:inline">{anchor.toLocaleDateString(undefined, { month: "long", year: "numeric" })}</span>
            </>
          )}
        </h2>
        {view !== "agenda" && (
          <div className="flex items-center">
            <IconButton
              label={view === "week" ? "Previous week" : "Previous month"}
              onClick={() => (view === "week" ? shiftWeek(-1) : shiftMonth(-1))}
            >
              <ChevronLeft className="size-4" />
            </IconButton>
            <IconButton
              label={view === "week" ? "Next week" : "Next month"}
              onClick={() => (view === "week" ? shiftWeek(1) : shiftMonth(1))}
            >
              <ChevronRight className="size-4" />
            </IconButton>
          </div>
        )}
        <Button variant="ghost" onClick={goToday} className="ml-auto px-2.5 sm:ml-0 sm:px-4">
          Today
        </Button>

        <div
          className={cn(
            "relative order-last w-full sm:order-none sm:ml-auto sm:block sm:w-64",
            searchOpen ? "block" : "hidden",
          )}
        >
          <Search className="pointer-events-none absolute left-3 top-1/2 z-[1] size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search the calendar"
            aria-label="Search the calendar"
            className="pl-9 pr-11"
          />
          {query && (
            <IconButton
              label="Clear search"
              onClick={() => setQuery("")}
              className="absolute right-0.5 top-1/2 -translate-y-1/2"
            >
              <X className="size-4" />
            </IconButton>
          )}
        </div>

        {/* A native select on a phone: three views in one 44px control. */}
        <select
          aria-label="View"
          value={view}
          onChange={(e) => setView(e.target.value as View)}
          className="min-h-11 cursor-pointer rounded-xl border border-[var(--site-border)] bg-card px-2.5 text-sm font-semibold text-[var(--bb-deep)] focus-visible:outline-3 focus-visible:outline-[var(--ring)] sm:hidden"
        >
          {VIEWS.map((v) => (
            <option key={v.id} value={v.id}>
              {v.label}
            </option>
          ))}
        </select>
        <div className="hidden items-center gap-1 rounded-xl bg-[var(--bb-wash)] p-1 sm:flex">
          {VIEWS.map((v) => (
            <ViewTab key={v.id} active={view === v.id} onClick={() => setView(v.id)}>
              {v.label}
            </ViewTab>
          ))}
        </div>
        {canEdit && (
          <Button onClick={() => openCreate(selectedDay)}>
            <Plus className="size-4" />
            Add
          </Button>
        )}
      </header>

      {filters("top")}

      {view === "month" ? (
        <>
          {/* Rows of a fixed height, 56px on a phone and 116px from 640px, so a
              cell's capacity is known and the page grows instead of the cells
              shrinking until they clip. The day's list below the grid flows
              with the page (it used to scroll inside a 160px box). */}
          <div className="overflow-hidden rounded-2xl border border-[var(--site-hairline)] bg-card">
            <div className="grid grid-cols-7 border-b border-[var(--site-hairline)]">
              {WEEKDAY_NAMES.map((day) => (
                <div
                  key={day}
                  className="py-2 text-center text-xs font-semibold text-[var(--site-quiet)]"
                >
                  <span className="hidden sm:inline">{day}</span>
                  <span aria-hidden className="sm:hidden">
                    {day.charAt(0)}
                  </span>
                  <span className="sr-only sm:hidden">{day}</span>
                </div>
              ))}
            </div>

            <div
              ref={gridRef}
              onKeyDown={onGridKeyDown}
              className="grid auto-rows-[56px] grid-cols-7 sm:auto-rows-[116px]"
            >
              {monthGrid(anchor).map((day) => {
                const key = startOfDay(day).getTime();
                const items = byDay.get(key) ?? [];
                const inMonth = day.getMonth() === anchor.getMonth();
                const isToday = sameDay(day, new Date());
                const isSelected = sameDay(day, selectedDay);
                // Importance order, open slots folded into one entry, and
                // exams, deadlines and sessions never behind "+N more".
                const entries = cellEntries(items);
                const fit = fitCell(entries, capacity);
                // Phone: up to three bars, or two and a count. The 56px cell has
                // no room past three rows, so the count always wins its row
                // here; the bars carry no words, and the order puts the most
                // important two first.
                const bars = fitChips(entries.length, 3);

                return (
                  <button
                    key={key}
                    type="button"
                    data-day={key}
                    tabIndex={isSelected ? 0 : -1}
                    onClick={() => pickDay(day, fit.more)}
                    aria-current={isToday ? "date" : undefined}
                    aria-pressed={isSelected}
                    aria-label={`${day.toLocaleDateString(undefined, {
                      weekday: "long",
                      day: "numeric",
                      month: "long",
                    })}, ${items.length === 0 ? "nothing scheduled" : `${items.length} scheduled`}`}
                    className={cn(
                      "sch-cell flex min-h-0 min-w-0 cursor-pointer flex-col gap-0.5 overflow-hidden border-b border-r border-[var(--site-hairline)] p-1 text-left transition-colors duration-200",
                      !inMonth && "bg-[color-mix(in_srgb,var(--site-ground)_70%,var(--card))]",
                      isSelected && "bg-[var(--bb-wash)] shadow-[inset_0_0_0_2px_var(--site-primary)]",
                      !isSelected && "hover:bg-[var(--bb-wash)]",
                    )}
                  >
                    <span
                      className={cn(
                        "title-face flex size-[22px] shrink-0 items-center justify-center self-center rounded-full text-sm font-bold sm:self-start",
                        isToday && "bg-[var(--site-primary)] text-white",
                        !isToday && inMonth && "text-[var(--bb-deep)]",
                        !isToday && !inMonth && "text-[var(--site-faint)]",
                      )}
                    >
                      {day.getDate()}
                    </span>

                    {/* Bars on a phone, chips on a laptop. A chip is under any
                        touch-target floor, so the cell is the target and the
                        list below is where things are read and tapped. */}
                    <span aria-hidden className="flex w-full flex-col gap-0.5 px-0.5 sm:hidden">
                      {entries.slice(0, bars.shown).map((e) =>
                        e.type === "open" ? (
                          <span key="open" data-cat="hours" className="sch-bar" />
                        ) : (
                          <span key={e.item.id} data-cat={KINDS[e.item.kind].cat} className="sch-bar" />
                        ),
                      )}
                      {bars.more > 0 && (
                        <span className="text-center text-[11px] leading-3 font-bold text-[var(--site-quiet)]">
                          +{bars.more}
                        </span>
                      )}
                    </span>

                    <span aria-hidden className="hidden min-w-0 flex-col gap-0.5 sm:flex">
                      {entries.slice(0, fit.shown).map((e) => {
                        const chip = "sch-chip flex h-[18px] min-w-0 items-center gap-1 rounded-sm px-1 text-xs leading-4 font-semibold";
                        if (e.type === "open")
                          return (
                            <span key="open" data-cat="hours" className={chip}>
                              <Clock className="sch-mark size-3 shrink-0" strokeWidth={2.5} />
                              <span className="truncate">{e.count === 1 ? "1 open time" : `${e.count} open times`}</span>
                            </span>
                          );
                        const { Icon, cat } = KINDS[e.item.kind];
                        return (
                          <span key={e.item.id} data-cat={cat} data-strong={e.item.kind === "exam" || undefined} className={chip}>
                            <Icon className="sch-mark size-3 shrink-0" strokeWidth={2.5} />
                            <span className="truncate">{e.item.title}</span>
                          </span>
                        );
                      })}
                      {fit.more > 0 && (
                        <span className="h-[18px] px-1 text-xs leading-4 font-bold text-[var(--bb-deep)] underline underline-offset-2">
                          +{fit.more} more
                        </span>
                      )}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {filters("bottom")}

          {!docked && daySection}
        </>
      ) : view === "week" ? (
        <WeekView
          days={weekDays}
          byDay={byDay}
          isOpenable={isOpenable}
          onOpen={openItem}
        />
      ) : (
        <section>
          {agenda.length === 0 ? (
            <Empty>
              {filtersActive ? "Nothing matches those filters." : "Nothing coming up."}
            </Empty>
          ) : (
            <ul className="flex flex-col gap-4">
              {groupByDay(agenda).map(([key, items]) => (
                <li key={key}>
                  <h3 className="mb-2 text-sm font-semibold text-[var(--bb-deep)]">
                    {new Date(key).toLocaleDateString(undefined, {
                      weekday: "long",
                      day: "numeric",
                      month: "long",
                    })}
                  </h3>
                  <ul className="flex flex-col gap-2">
                    {items.map((item) => (
                      <DateRow
                        key={item.id}
                        item={item}
                        openable={isOpenable(item)}
                        onOpen={() => openItem(item)}
                      />
                    ))}
                  </ul>
                </li>
              ))}
            </ul>
          )}
          <Button
            variant="ghost"
            onClick={() => setShowPast((p) => !p)}
            className="mt-4 text-muted-foreground"
          >
            {showPast ? "Hide past dates" : "Show past dates"}
          </Button>
        </section>
      )}

      {/* A portal draws this list inside `dayDock`, an element the page owns
          beside the grid, while it stays part of this component (its state,
          its handlers). */}
      {docked && dayDock && createPortal(daySection, dayDock)}

      {/* Radix handles the whole keyboard contract here — focus in, Tab
          trapped, Escape out, focus returned to the Add button. `onOpenChange`
          rather than a bare close handler, so the outside-click and Escape
          paths land in the same place as the Cancel button. */}
      <Dialog open={editing !== null} onOpenChange={(open) => !open && setEditing(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{mode === "create" ? "Add a date" : "Edit date"}</DialogTitle>
            <DialogDescription>
              {mode === "create"
                ? "It appears on the shared course calendar for everyone."
                : "Changes appear for everyone on the course."}
            </DialogDescription>
          </DialogHeader>

          <DialogBody>
            {editing && (
              <DateForm
                value={editing}
                onChange={(next) => {
                  setEditing(next);
                  setFormError(null);
                }}
                error={formError}
              />
            )}
          </DialogBody>

          <DialogFooter>
            {mode === "edit" && (
              <Button
                variant="ghost"
                onClick={() => {
                  if (editing) onDelete?.(editing.id);
                  setEditing(null);
                }}
                className="mr-auto text-destructive hover:bg-destructive/10 hover:text-destructive"
              >
                Delete
              </Button>
            )}
            <Button variant="ghost" onClick={() => setEditing(null)}>
              Cancel
            </Button>
            <Button onClick={submit}>{mode === "create" ? "Add" : "Save"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function groupByDay(items: Item[]): [number, Item[]][] {
  const map = new Map<number, Item[]>();
  for (const item of items) {
    const key = startOfDay(item.start).getTime();
    const list = map.get(key);
    if (list) list.push(item);
    else map.set(key, [item]);
  }
  return [...map.entries()].sort((a, b) => a[0] - b[0]);
}

/**
 * The week, as Focusment draws it: a big date numeral over each day, and each
 * column only as tall as what is in it, so an empty day is a header and
 * nothing more (it used to be a 730px card reading "Nothing"). On a phone the
 * week is a list of the days that have something, with the empty runs between
 * them folded into one quiet line each.
 */
function WeekView({
  days,
  byDay,
  isOpenable,
  onOpen,
}: {
  days: Date[];
  byDay: Map<number, Item[]>;
  isOpenable: (item: Item) => boolean;
  onOpen: (item: Item) => void;
}) {
  const listFor = (d: Date) => byDay.get(startOfDay(d).getTime()) ?? [];
  const empty = days.every((d) => listFor(d).length === 0);
  const items = (list: Item[]) =>
    list.map((item) =>
      item.kind === "open-slot" ? (
        <button
          key={item.id}
          type="button"
          onClick={() => onOpen(item)}
          className="sch-slot"
          aria-label={`Book ${item.title} at ${timeOf(item.start)}`}
        >
          {timeOf(item.start)}
        </button>
      ) : (
        <WeekChip key={item.id} item={item} openable={isOpenable(item)} onOpen={() => onOpen(item)} />
      ),
    );

  // Phone: the days with something, and one line per run of empty days. The
  // trailing `null` closes the last run.
  const phone: React.ReactNode[] = [];
  let run: Date[] = [];
  for (const d of [...days, null]) {
    const list = d ? listFor(d) : [];
    if (d && list.length === 0) {
      run.push(d);
      continue;
    }
    if (run.length > 0)
      phone.push(
        <p key={`none-${run[0].getTime()}`} className="px-1 text-sm text-[var(--site-quiet)]">
          {nothingLine(run)}
        </p>,
      );
    run = [];
    if (d)
      phone.push(
        <section
          key={d.getTime()}
          aria-label={d.toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric" })}
          className="flex flex-col gap-1.5"
        >
          <DayHeading day={d} />
          {items(list)}
        </section>,
      );
  }

  return (
    <>
      <div className="flex flex-col gap-3 sm:hidden">
        {empty ? <Empty>Nothing this week.</Empty> : phone}
      </div>
      <div className="hidden sm:block">
        <div className="grid grid-cols-7 items-start gap-2">
          {days.map((d) => (
            <section
              key={d.getTime()}
              aria-label={d.toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric" })}
              className="flex min-w-0 flex-col gap-1.5"
            >
              <DayHeading day={d} big />
              {items(listFor(d))}
            </section>
          ))}
        </div>
        {empty && <p className="mt-4 text-center text-sm text-[var(--site-quiet)]">Nothing this week.</p>}
      </div>
    </>
  );
}

function DayHeading({ day, big = false }: { day: Date; big?: boolean }) {
  const isToday = sameDay(day, new Date());
  return (
    <h3
      className={cn(
        "flex items-baseline gap-1.5 px-1 text-[var(--bb-deep)]",
        big && "flex-col items-center gap-0 border-b-2 border-[var(--site-hairline)] pb-1.5",
      )}
    >
      <span className="text-xs font-semibold uppercase text-[var(--site-quiet)]">
        {day.toLocaleDateString(undefined, { weekday: "short" })}
      </span>
      <span
        className={cn(
          "title-face font-extrabold",
          big ? "text-2xl" : "text-base",
          isToday && "rounded-full bg-[var(--site-primary)] px-2 text-white",
        )}
      >
        {day.getDate()}
      </span>
      {isToday && <span className="sr-only">, today</span>}
    </h3>
  );
}

function DateRow({
  item,
  openable,
  onOpen,
}: {
  item: Item;
  openable: boolean;
  onOpen: () => void;
}) {
  const { label, Icon, cat } = KINDS[item.kind];
  const soon = countdown(item.start);
  const past = daysUntil(item.start) < 0;

  const body = (
    <>
      <Icon aria-hidden data-cat={cat} className="sch-mark mt-0.5 size-4 shrink-0" strokeWidth={2.5} />
      <span className="min-w-0 flex-1">
        <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
          <span className="font-semibold text-[var(--bb-deep)]">{item.title}</span>
          <span
            data-cat={cat}
            className="sch-chip rounded-md px-1.5 py-0.5 text-[11px] font-semibold"
          >
            {label}
          </span>
          {soon && (
            <span
              className={cn(
                "text-xs font-semibold",
                soon.urgent
                  ? "text-[var(--bb-warn-ink)]"
                  : "text-[var(--site-quiet)]",
              )}
            >
              {soon.text}
            </span>
          )}
        </span>
        {item.detail && (
          <span className="mt-0.5 block text-sm text-[var(--site-quiet)]">
            {item.detail}
          </span>
        )}
        <span className="mt-0.5 block text-xs text-[var(--site-quiet)]">
          {timeOf(item.start)}
          {item.end && ` – ${timeOf(item.end)}`}
        </span>
      </span>
    </>
  );

  return (
    <li>
      {openable ? (
        <button
          type="button"
          onClick={onOpen}
          data-cat={cat}
          className={cn("sch-row flex w-full cursor-pointer items-start gap-3 p-3 text-left", past && "opacity-60")}
        >
          {body}
        </button>
      ) : (
        <div
          className={cn(
            "flex items-start gap-3 rounded-xl border border-[var(--site-hairline)] bg-card p-3",
            past && "opacity-60",
          )}
        >
          {body}
        </div>
      )}
    </li>
  );
}

/** A date or a session in the week view: the Focusment chip, a coloured rule
 *  down the left and dark ink, pressable when it opens something. The title
 *  wraps rather than truncating, because the column is as tall as it needs. */
function WeekChip({ item, openable, onOpen }: { item: Item; openable: boolean; onOpen: () => void }) {
  const { label, Icon, cat } = KINDS[item.kind];
  const cls = cn(
    "sch-chip flex w-full min-w-0 flex-col rounded-md px-2 py-1 text-left text-xs font-semibold break-words",
    openable && "min-h-11 cursor-pointer",
  );
  const inner = (
    <>
      <span className="flex items-start gap-1">
        <Icon aria-hidden className="sch-mark mt-px size-3 shrink-0" strokeWidth={2.5} />
        <span>{item.title}</span>
      </span>
      <span className="font-normal">
        {timeOf(item.start)} · {label}
      </span>
    </>
  );
  return openable ? (
    <button type="button" data-cat={cat} onClick={onOpen} className={cls}>
      {inner}
    </button>
  ) : (
    <div data-cat={cat} className={cls}>{inner}</div>
  );
}

function DateForm({
  value,
  onChange,
  error,
}: {
  value: CourseDate;
  onChange: (next: CourseDate) => void;
  error: string | null;
}) {
  const titleId = "course-date-title";
  const errorId = "course-date-error";

  return (
    <div className="flex flex-col gap-4">
      <Field label="Title" htmlFor={titleId} required>
        <Input
          id={titleId}
          value={value.title}
          onChange={(e) => onChange({ ...value, title: e.target.value })}
          aria-invalid={error !== null}
          aria-describedby={error ? errorId : undefined}
          placeholder="Midterm 2 — carbonyls through enolates"
        />
      </Field>

      {/* Radix rather than a native `<select>`: the six options carry icons,
          which a native option list cannot render, and this keeps type-ahead
          and arrow-key selection working the way the platform one does. */}
      <Field label="Kind" htmlFor="course-date-kind">
        <Select
          value={value.kind}
          onValueChange={(kind) => onChange({ ...value, kind: kind as CourseDateKind })}
        >
          <SelectTrigger id="course-date-kind">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {EDITABLE_KINDS.map((kind) => {
              const { label, Icon, cat } = KINDS[kind];
              return (
                <SelectItem key={kind} value={kind}>
                  <span className="flex items-center gap-2">
                    <Icon data-cat={cat} className="sch-mark size-3.5" strokeWidth={2.5} />
                    {label}
                  </span>
                </SelectItem>
              );
            })}
          </SelectContent>
        </Select>
      </Field>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Starts" htmlFor="course-date-start" required>
          <Input
            id="course-date-start"
            type="datetime-local"
            value={Number.isNaN(value.start.getTime()) ? "" : toLocalInput(value.start)}
            onChange={(e) => onChange({ ...value, start: new Date(e.target.value) })}
          />
        </Field>
        <Field
          label="Ends"
          htmlFor="course-date-end"
          hint="Leave empty for a deadline rather than a span."
        >
          <Input
            id="course-date-end"
            type="datetime-local"
            value={value.end && !Number.isNaN(value.end.getTime()) ? toLocalInput(value.end) : ""}
            onChange={(e) =>
              onChange({ ...value, end: e.target.value ? new Date(e.target.value) : undefined })
            }
          />
        </Field>
      </div>

      <Field label="Detail" htmlFor="course-date-detail">
        <Textarea
          id="course-date-detail"
          value={value.detail ?? ""}
          onChange={(e) => onChange({ ...value, detail: e.target.value || undefined })}
          rows={3}
          placeholder="Room, what it covers, what to bring."
          className="resize-y"
        />
      </Field>

      {/* Errors live with the thing that caused them and are announced, rather
          than appearing as a summary at the top that a screen reader never
          reaches and a sighted user has already scrolled past. */}
      {error && (
        <p
          id={errorId}
          role="alert"
          className="text-sm font-medium text-rose-600 dark:text-rose-400"
        >
          {error}
        </p>
      )}
    </div>
  );
}

function Field({
  label,
  htmlFor,
  hint,
  required,
  children,
}: {
  label: string;
  htmlFor: string;
  hint?: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <Label htmlFor={htmlFor}>
        {label}
        {required && (
          <span className="ml-0.5 text-destructive" aria-hidden>
            *
          </span>
        )}
      </Label>
      {children}
      {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}

function ViewTab({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        "sch-focus flex min-h-11 cursor-pointer items-center rounded-lg px-3.5 text-sm font-semibold transition-colors duration-200",
        active
          ? "bg-card text-[var(--bb-deep)] ring-1 ring-[var(--site-border)]"
          : "text-[var(--site-quiet)] hover:text-[var(--bb-deep)]",
      )}
    >
      {children}
    </button>
  );
}

/**
 * True from 1024px (the page's two-column layout). `useSyncExternalStore` is
 * React's hook for reading a value that lives outside React, here the
 * browser's media query, and re-rendering when it changes. No matchMedia
 * (jsdom) reads as a phone.
 */
const WIDE = "(min-width: 1024px)";
function useWide() {
  return useSyncExternalStore(
    (onChange) => {
      if (typeof window.matchMedia !== "function") return () => {};
      const mq = window.matchMedia(WIDE);
      mq.addEventListener("change", onChange);
      return () => mq.removeEventListener("change", onChange);
    },
    () => typeof window.matchMedia === "function" && window.matchMedia(WIDE).matches,
    () => false,
  );
}

function IconButton({
  label,
  onClick,
  className,
  children,
  "aria-expanded": expanded,
}: {
  label: string;
  onClick: () => void;
  className?: string;
  children: React.ReactNode;
  "aria-expanded"?: boolean;
}) {
  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={onClick}
      aria-label={label}
      aria-expanded={expanded}
      className={cn("text-muted-foreground", className)}
    >
      {children}
    </Button>
  );
}

function Empty({ children }: { children: React.ReactNode }) {
  return (
    <p className="rounded-xl border border-dashed border-border py-8 text-center text-sm text-muted-foreground">
      {children}
    </p>
  );
}

export default CourseCalendar;
