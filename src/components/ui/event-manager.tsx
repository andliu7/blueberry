"use client";

import { useCallback, useMemo, useRef, useState } from "react";
import {
  AlertTriangle,
  BookOpen,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  FileText,
  FlaskConical,
  List,
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
 * No Radix and no shadcn primitives, matching every other integrated component
 * here — see the header notes in `404-page-not-found.tsx`, `contact-2.tsx` and
 * `notification-bell.tsx` for the same call. The one thing Radix would have
 * genuinely provided, a real dialog keyboard contract, lives in `modal.tsx`.
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
 * Colour is fixed per kind, not chosen.
 *
 * Two reasons. A shared course calendar where the TA picks pink for one exam
 * and red for the next teaches students nothing, and colour alone cannot carry
 * meaning for the part of the class that cannot distinguish these hues — so
 * every kind gets an icon and a word as well.
 */
const KINDS: Record<
  CourseDateKind,
  { label: string; Icon: typeof AlertTriangle; dot: string; chip: string }
> = {
  exam: {
    label: "Exam",
    Icon: AlertTriangle,
    dot: "bg-rose-500",
    chip: "bg-rose-50 text-rose-700 ring-rose-200 dark:bg-rose-950/60 dark:text-rose-200 dark:ring-rose-900",
  },
  quiz: {
    label: "Quiz",
    Icon: PencilLine,
    dot: "bg-amber-500",
    chip: "bg-amber-50 text-amber-800 ring-amber-200 dark:bg-amber-950/60 dark:text-amber-200 dark:ring-amber-900",
  },
  assignment: {
    label: "Assignment",
    Icon: FileText,
    dot: "bg-indigo-500",
    chip: "bg-indigo-50 text-indigo-700 ring-indigo-200 dark:bg-indigo-950/60 dark:text-indigo-200 dark:ring-indigo-900",
  },
  lecture: {
    label: "Lecture",
    Icon: BookOpen,
    dot: "bg-slate-400",
    chip: "bg-slate-100 text-slate-700 ring-slate-200 dark:bg-stone-800 dark:text-stone-300 dark:ring-stone-700",
  },
  lab: {
    label: "Lab",
    Icon: FlaskConical,
    dot: "bg-emerald-500",
    chip: "bg-emerald-50 text-emerald-700 ring-emerald-200 dark:bg-emerald-950/60 dark:text-emerald-200 dark:ring-emerald-900",
  },
  "office-hours": {
    label: "Office hours",
    Icon: Users,
    dot: "bg-sky-500",
    chip: "bg-sky-50 text-sky-700 ring-sky-200 dark:bg-sky-950/60 dark:text-sky-200 dark:ring-sky-900",
  },
};

const KIND_ORDER = Object.keys(KINDS) as CourseDateKind[];
const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
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
    (_, i) => new Date(first.getFullYear(), first.getMonth(), 1 - first.getDay() + i),
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
  defaultView?: "month" | "agenda";
  className?: string;
}

export function CourseCalendar({
  dates = [],
  onCreate,
  onUpdate,
  onDelete,
  canEdit = false,
  defaultView = "month",
  className,
}: CourseCalendarProps) {
  const [view, setView] = useState<"month" | "agenda">(defaultView);
  const [anchor, setAnchor] = useState(() => startOfDay(new Date()));
  const [selectedDay, setSelectedDay] = useState(() => startOfDay(new Date()));
  const [query, setQuery] = useState("");
  const [kinds, setKinds] = useState<CourseDateKind[]>([]);
  const [showPast, setShowPast] = useState(false);

  const [editing, setEditing] = useState<CourseDate | null>(null);
  const [mode, setMode] = useState<"create" | "edit">("create");
  const [formError, setFormError] = useState<string | null>(null);

  const gridRef = useRef<HTMLDivElement>(null);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return dates
      .filter((d) => {
        if (kinds.length > 0 && !kinds.includes(d.kind)) return false;
        if (!q) return true;
        return (
          d.title.toLowerCase().includes(q) ||
          d.detail?.toLowerCase().includes(q) ||
          KINDS[d.kind].label.toLowerCase().includes(q)
        );
      })
      .sort((a, b) => a.start.getTime() - b.start.getTime());
  }, [dates, query, kinds]);

  const byDay = useMemo(() => {
    const map = new Map<number, CourseDate[]>();
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
  const filtersActive = kinds.length > 0 || query.trim() !== "";

  const goToday = () => {
    const today = startOfDay(new Date());
    setAnchor(today);
    setSelectedDay(today);
  };

  const shiftMonth = (by: number) =>
    setAnchor((prev) => new Date(prev.getFullYear(), prev.getMonth() + by, 1));

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

  return (
    <div className={cn("flex flex-col gap-4", className)}>
      <header className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2">
          <h2 className="min-w-44 text-lg font-semibold text-slate-900 dark:text-stone-100">
            {view === "month"
              ? anchor.toLocaleDateString(undefined, { month: "long", year: "numeric" })
              : "Coming up"}
          </h2>
          {view === "month" && (
            <div className="flex items-center gap-1">
              <IconButton label="Previous month" onClick={() => shiftMonth(-1)}>
                <ChevronLeft className="size-4" />
              </IconButton>
              <IconButton label="Next month" onClick={() => shiftMonth(1)}>
                <ChevronRight className="size-4" />
              </IconButton>
            </div>
          )}
          <Button variant="ghost" onClick={goToday}>
            Today
          </Button>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1 rounded-xl bg-slate-100 p-1 dark:bg-stone-800">
            <ViewTab active={view === "month"} onClick={() => setView("month")} Icon={CalendarDays}>
              Month
            </ViewTab>
            <ViewTab active={view === "agenda"} onClick={() => setView("agenda")} Icon={List}>
              List
            </ViewTab>
          </div>
          {canEdit && (
            <Button onClick={() => openCreate(selectedDay)}>
              <Plus className="size-4" />
              Add
            </Button>
          )}
        </div>
      </header>

      <div className="flex flex-col gap-2">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 z-[1] size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search the calendar…"
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

        {/* Chips, not a dropdown menu. Six kinds fit on one row, and a filter
            you can see the state of beats one hidden behind two clicks. */}
        <div className="-mx-1 flex flex-wrap gap-1.5 px-1">
          {KIND_ORDER.map((kind) => {
            const { label, Icon, chip } = KINDS[kind];
            const on = kinds.includes(kind);
            return (
              <button
                key={kind}
                type="button"
                aria-pressed={on}
                onClick={() =>
                  setKinds((prev) =>
                    prev.includes(kind) ? prev.filter((k) => k !== kind) : [...prev, kind],
                  )
                }
                className={cn(
                  "flex min-h-11 cursor-pointer items-center gap-1.5 rounded-xl px-3 text-sm font-medium ring-1 transition",
                  on
                    ? chip
                    : "bg-white text-slate-500 ring-slate-200 hover:bg-slate-50 dark:bg-stone-900 dark:text-stone-400 dark:ring-stone-700 dark:hover:bg-stone-800",
                )}
              >
                <Icon className="size-3.5" />
                {label}
              </button>
            );
          })}
          {filtersActive && (
            <Button
              variant="ghost"
              onClick={() => {
                setKinds([]);
                setQuery("");
              }}
              className="text-muted-foreground"
            >
              <X className="size-3.5" />
              Clear
            </Button>
          )}
        </div>
      </div>

      {view === "month" ? (
        <>
          <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white dark:border-stone-700 dark:bg-stone-900">
            <div className="grid grid-cols-7 border-b border-slate-200 dark:border-stone-700">
              {WEEKDAYS.map((day) => (
                <div
                  key={day}
                  className="py-2 text-center text-xs font-semibold text-slate-500 dark:text-stone-400"
                >
                  <span className="hidden sm:inline">{day}</span>
                  <span aria-hidden className="sm:hidden">
                    {day.charAt(0)}
                  </span>
                  <span className="sr-only sm:hidden">{day}</span>
                </div>
              ))}
            </div>

            <div ref={gridRef} onKeyDown={onGridKeyDown} className="grid grid-cols-7">
              {monthGrid(anchor).map((day) => {
                const key = startOfDay(day).getTime();
                const items = byDay.get(key) ?? [];
                const inMonth = day.getMonth() === anchor.getMonth();
                const isToday = sameDay(day, new Date());
                const isSelected = sameDay(day, selectedDay);

                return (
                  <button
                    key={key}
                    type="button"
                    data-day={key}
                    tabIndex={isSelected ? 0 : -1}
                    onClick={() => setSelectedDay(startOfDay(day))}
                    aria-current={isToday ? "date" : undefined}
                    aria-pressed={isSelected}
                    aria-label={`${day.toLocaleDateString(undefined, {
                      weekday: "long",
                      day: "numeric",
                      month: "long",
                    })}, ${items.length === 0 ? "nothing scheduled" : `${items.length} scheduled`}`}
                    className={cn(
                      "flex min-h-16 cursor-pointer flex-col items-center gap-1 border-b border-r border-slate-100 p-1.5 text-left outline-none transition sm:min-h-24 sm:items-stretch dark:border-stone-800",
                      "focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-inset",
                      !inMonth && "bg-slate-50/60 dark:bg-stone-950/40",
                      isSelected && "bg-indigo-50 dark:bg-indigo-950/40",
                      !isSelected && "hover:bg-slate-50 dark:hover:bg-stone-800/60",
                    )}
                  >
                    <span
                      className={cn(
                        "flex size-6 shrink-0 items-center justify-center rounded-full text-xs font-medium sm:self-start",
                        isToday && "bg-slate-900 font-semibold text-white dark:bg-stone-100 dark:text-stone-900",
                        !isToday && inMonth && "text-slate-700 dark:text-stone-200",
                        !isToday && !inMonth && "text-slate-400 dark:text-stone-600",
                      )}
                    >
                      {day.getDate()}
                    </span>

                    {/* Dots on a phone, titles on a laptop. An 18px chip is
                        under any touch-target floor, so on small screens the
                        cell is the target and the list below is where things
                        are actually read and tapped. */}
                    <span aria-hidden className="flex flex-wrap justify-center gap-0.5 sm:hidden">
                      {items.slice(0, 4).map((item) => (
                        <span
                          key={item.id}
                          className={cn("size-1.5 rounded-full", KINDS[item.kind].dot)}
                        />
                      ))}
                    </span>

                    <span aria-hidden className="hidden min-w-0 flex-col gap-0.5 sm:flex">
                      {items.slice(0, 3).map((item) => (
                        <span
                          key={item.id}
                          className={cn(
                            "flex items-center gap-1 truncate rounded px-1 py-0.5 text-[11px] font-medium ring-1",
                            KINDS[item.kind].chip,
                          )}
                        >
                          <span className={cn("size-1.5 shrink-0 rounded-full", KINDS[item.kind].dot)} />
                          <span className="truncate">{item.title}</span>
                        </span>
                      ))}
                      {items.length > 3 && (
                        <span className="px-1 text-[11px] text-slate-500 dark:text-stone-400">
                          +{items.length - 3} more
                        </span>
                      )}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          <section aria-live="polite">
            <h3 className="mb-2 text-sm font-semibold text-slate-700 dark:text-stone-300">
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
                    canEdit={canEdit}
                    onEdit={() => {
                      setMode("edit");
                      setFormError(null);
                      setEditing(item);
                    }}
                  />
                ))}
              </ul>
            )}
          </section>
        </>
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
                  <h3 className="mb-2 text-sm font-semibold text-slate-700 dark:text-stone-300">
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
                        canEdit={canEdit}
                        onEdit={() => {
                          setMode("edit");
                          setFormError(null);
                          setEditing(item);
                        }}
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

function groupByDay(items: CourseDate[]): [number, CourseDate[]][] {
  const map = new Map<number, CourseDate[]>();
  for (const item of items) {
    const key = startOfDay(item.start).getTime();
    const list = map.get(key);
    if (list) list.push(item);
    else map.set(key, [item]);
  }
  return [...map.entries()].sort((a, b) => a[0] - b[0]);
}

function DateRow({
  item,
  canEdit,
  onEdit,
}: {
  item: CourseDate;
  canEdit: boolean;
  onEdit: () => void;
}) {
  const { label, Icon, dot, chip } = KINDS[item.kind];
  const soon = countdown(item.start);
  const past = daysUntil(item.start) < 0;

  const body = (
    <>
      <span className={cn("mt-1.5 size-2.5 shrink-0 rounded-full", dot)} />
      <span className="min-w-0 flex-1">
        <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
          <span className="font-semibold text-slate-900 dark:text-stone-100">{item.title}</span>
          <span
            className={cn(
              "flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[11px] font-semibold ring-1",
              chip,
            )}
          >
            <Icon className="size-3" />
            {label}
          </span>
          {soon && (
            <span
              className={cn(
                "text-xs font-semibold",
                soon.urgent
                  ? "text-rose-600 dark:text-rose-400"
                  : "text-slate-500 dark:text-stone-400",
              )}
            >
              {soon.text}
            </span>
          )}
        </span>
        {item.detail && (
          <span className="mt-0.5 block text-sm text-slate-600 dark:text-stone-400">
            {item.detail}
          </span>
        )}
        <span className="mt-0.5 block text-xs text-slate-500 dark:text-stone-400">
          {timeOf(item.start)}
          {item.end && ` – ${timeOf(item.end)}`}
        </span>
      </span>
    </>
  );

  return (
    <li>
      {canEdit ? (
        <button
          type="button"
          onClick={onEdit}
          className={cn(
            "flex w-full cursor-pointer items-start gap-3 rounded-xl border border-slate-200 bg-white p-3 text-left transition hover:border-slate-300 hover:shadow-sm dark:border-stone-700 dark:bg-stone-900 dark:hover:border-stone-600",
            past && "opacity-60",
          )}
        >
          {body}
        </button>
      ) : (
        <div
          className={cn(
            "flex items-start gap-3 rounded-xl border border-slate-200 bg-white p-3 dark:border-stone-700 dark:bg-stone-900",
            past && "opacity-60",
          )}
        >
          {body}
        </div>
      )}
    </li>
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
            {KIND_ORDER.map((kind) => {
              const { label, Icon, dot } = KINDS[kind];
              return (
                <SelectItem key={kind} value={kind}>
                  <span className="flex items-center gap-2">
                    <span className={cn("size-2 rounded-full", dot)} />
                    <Icon className="size-3.5 opacity-70" />
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
  Icon,
  children,
}: {
  active: boolean;
  onClick: () => void;
  Icon: typeof CalendarDays;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        "flex min-h-9 cursor-pointer items-center gap-1.5 rounded-lg px-3 text-sm font-medium transition",
        active
          ? "bg-white text-slate-900 shadow-sm dark:bg-stone-900 dark:text-stone-100"
          : "text-slate-500 hover:text-slate-800 dark:text-stone-400 dark:hover:text-stone-200",
      )}
    >
      <Icon className="size-4" />
      {children}
    </button>
  );
}

function IconButton({
  label,
  onClick,
  className,
  children,
}: {
  label: string;
  onClick: () => void;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={onClick}
      aria-label={label}
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
