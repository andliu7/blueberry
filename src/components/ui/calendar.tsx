/**
 * Calendar: single date, several dates, or a range, with month and year pickers.
 *
 * Built for the admin home's date selector (period for the stats, funnel and feed,
 * and the task board's due dates). Plain React plus the cn helper, no icon or motion
 * library: the chevrons are inline SVG and the month slide is a CSS animation that
 * the stylesheet turns into a fade under reduced motion. Lazy-loaded with the admin
 * page, so it is in no entry chunk. Styles: calendar.css (game tokens).
 *
 * Keyboard: the day grid is an ARIA grid with one tab stop. Arrows move a day or a
 * week, Home and End go to the start and end of the week, PageUp and PageDown change
 * month (the 31st clamps to the month length). Crossing into another month moves
 * focus to the date once the new grid is on screen.
 */
import { useEffect, useId, useMemo, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import "./calendar.css";

/* ------------------------------------------------------------------ date helpers (exported for tests) */

export const startOfDay = (d: Date): Date => new Date(d.getFullYear(), d.getMonth(), d.getDate());
export const sameDay = (a: Date | null | undefined, b: Date | null | undefined): boolean =>
  !!a && !!b && a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
export const addDays = (d: Date, n: number): Date => new Date(d.getFullYear(), d.getMonth(), d.getDate() + n);
export const daysInMonth = (y: number, m: number): number => new Date(y, m + 1, 0).getDate();

/** Move by whole months, clamping the day: 31 Jan + 1 month is 28 or 29 Feb. */
export function addMonths(d: Date, n: number): Date {
  const first = new Date(d.getFullYear(), d.getMonth() + n, 1);
  return new Date(first.getFullYear(), first.getMonth(), Math.min(d.getDate(), daysInMonth(first.getFullYear(), first.getMonth())));
}

/** Six rows of seven days for the month shown, starting on weekStartsOn (0 Sunday, 1 Monday). */
export function monthGrid(month: Date, weekStartsOn: 0 | 1): Date[] {
  const first = new Date(month.getFullYear(), month.getMonth(), 1);
  const lead = (first.getDay() - weekStartsOn + 7) % 7;
  const start = addDays(first, -lead);
  return Array.from({ length: 42 }, (_, i) => addDays(start, i));
}

export interface DateRange {
  from: Date | null;
  to: Date | null;
}

/** Click logic for a range: first click starts, second ends (earlier date first), a third starts again. */
export function nextRange(current: DateRange, clicked: Date): DateRange {
  if (!current.from || (current.from && current.to)) return { from: clicked, to: null };
  return clicked < current.from ? { from: clicked, to: current.from } : { from: current.from, to: clicked };
}

const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
const WEEKDAYS = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];

/* ------------------------------------------------------------------ component */

interface Common {
  month?: Date;
  defaultMonth?: Date;
  onMonthChange?: (month: Date) => void;
  weekStartsOn?: 0 | 1;
  disabled?: (d: Date) => boolean;
  /** Struck through: taken or unavailable. */
  bookedDates?: Date[];
  /** A small dot under the day. */
  events?: Date[];
  className?: string;
  /** Accessible name for the whole calendar. */
  label?: string;
}
export type CalendarProps = Common &
  (
    | { mode: "single"; selected: Date | null; onSelect: (d: Date | null) => void }
    | { mode: "multiple"; selected: Date[]; onSelect: (d: Date[]) => void }
    | { mode: "range"; selected: DateRange; onSelect: (r: DateRange) => void }
  );

type View = "days" | "months" | "years";

function Chevron({ dir }: { dir: "left" | "right" }) {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden focusable="false">
      <path d={dir === "left" ? "M15 5 8 12l7 7" : "M9 5l7 7-7 7"} fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function Calendar(props: CalendarProps) {
  const { weekStartsOn = 0, disabled, bookedDates = [], events = [], className, label = "Calendar", onMonthChange } = props;
  const today = useMemo(() => startOfDay(new Date()), []);
  const [innerMonth, setInnerMonth] = useState<Date>(() => startOfDay(props.defaultMonth ?? props.month ?? today));
  const month = props.month ?? innerMonth;
  const [view, setView] = useState<View>("days");
  const [yearBase, setYearBase] = useState(() => month.getFullYear() - 4);
  const [focus, setFocus] = useState<Date>(() => {
    const s = props.selected;
    const seed = s instanceof Date ? s : Array.isArray(s) ? s[0] : s && "from" in s ? s.from : null;
    return seed && seed.getMonth() === month.getMonth() && seed.getFullYear() === month.getFullYear() ? seed : new Date(month.getFullYear(), month.getMonth(), 1);
  });
  const [dir, setDir] = useState<1 | -1>(1);
  const [announce, setAnnounce] = useState("");
  const wantFocus = useRef(false);
  const gridRef = useRef<HTMLDivElement>(null);
  const titleId = useId();

  const setMonth = (next: Date, direction: 1 | -1 = 1) => {
    const m = new Date(next.getFullYear(), next.getMonth(), 1);
    setDir(direction);
    setInnerMonth(m);
    onMonthChange?.(m);
    setAnnounce(`${MONTHS[m.getMonth()]} ${m.getFullYear()}`);
  };

  const days = useMemo(() => monthGrid(month, weekStartsOn), [month, weekStartsOn]);
  const weekdays = useMemo(() => Array.from({ length: 7 }, (_, i) => WEEKDAYS[(i + weekStartsOn) % 7]!), [weekStartsOn]);

  // After a keyboard move into a new month, focus the date once its button exists.
  useEffect(() => {
    if (!wantFocus.current) return;
    wantFocus.current = false;
    gridRef.current?.querySelector<HTMLButtonElement>('button[tabindex="0"]')?.focus();
  }, [focus, month]);

  const isSelected = (d: Date): boolean => {
    if (props.mode === "single") return sameDay(props.selected, d);
    if (props.mode === "multiple") return props.selected.some((x) => sameDay(x, d));
    return sameDay(props.selected.from, d) || sameDay(props.selected.to, d);
  };
  const inRange = (d: Date): boolean => props.mode === "range" && !!props.selected.from && !!props.selected.to && d > props.selected.from && d < props.selected.to;
  const isBooked = (d: Date) => bookedDates.some((b) => sameDay(b, d));
  const hasEvent = (d: Date) => events.some((b) => sameDay(b, d));

  const pick = (d: Date) => {
    if (disabled?.(d) || isBooked(d)) return;
    setFocus(d);
    if (props.mode === "single") props.onSelect(sameDay(props.selected, d) ? null : d);
    else if (props.mode === "multiple") props.onSelect(props.selected.some((x) => sameDay(x, d)) ? props.selected.filter((x) => !sameDay(x, d)) : [...props.selected, d]);
    else props.onSelect(nextRange(props.selected, d));
    if (d.getMonth() !== month.getMonth()) setMonth(d, d > month ? 1 : -1);
  };

  const onKey = (e: React.KeyboardEvent) => {
    let next: Date | null = null;
    const k = e.key;
    if (k === "ArrowLeft") next = addDays(focus, -1);
    else if (k === "ArrowRight") next = addDays(focus, 1);
    else if (k === "ArrowUp") next = addDays(focus, -7);
    else if (k === "ArrowDown") next = addDays(focus, 7);
    else if (k === "Home") next = addDays(focus, -((focus.getDay() - weekStartsOn + 7) % 7));
    else if (k === "End") next = addDays(focus, 6 - ((focus.getDay() - weekStartsOn + 7) % 7));
    else if (k === "PageUp") next = addMonths(focus, e.shiftKey ? -12 : -1);
    else if (k === "PageDown") next = addMonths(focus, e.shiftKey ? 12 : 1);
    if (!next) return;
    e.preventDefault();
    wantFocus.current = true;
    setFocus(next);
    if (next.getMonth() !== month.getMonth() || next.getFullYear() !== month.getFullYear()) setMonth(next, next > month ? 1 : -1);
  };

  const rangeEdge = (d: Date): "start" | "end" | null => {
    if (props.mode !== "range" || !props.selected.from || !props.selected.to) return null;
    if (sameDay(d, props.selected.from)) return "start";
    if (sameDay(d, props.selected.to)) return "end";
    return null;
  };

  return (
    <div className={cn("bbcal", className)} role="group" aria-label={label}>
      <div className="bbcal__head">
        <button type="button" className="bbcal__nav" aria-label={view === "years" ? "Earlier years" : view === "months" ? "Previous year" : "Previous month"} onClick={() => (view === "years" ? setYearBase((y) => y - 12) : view === "months" ? setMonth(new Date(month.getFullYear() - 1, month.getMonth(), 1), -1) : setMonth(addMonths(month, -1), -1))}>
          <Chevron dir="left" />
        </button>
        <div className="bbcal__title" id={titleId}>
          <button type="button" className="bbcal__pick" aria-expanded={view === "months"} onClick={() => setView(view === "months" ? "days" : "months")}>
            {MONTHS[month.getMonth()]}
          </button>
          <button
            type="button"
            className="bbcal__pick"
            aria-expanded={view === "years"}
            onClick={() => {
              setYearBase(month.getFullYear() - 4);
              setView(view === "years" ? "days" : "years");
            }}
          >
            {month.getFullYear()}
          </button>
        </div>
        <button type="button" className="bbcal__nav" aria-label={view === "years" ? "Later years" : view === "months" ? "Next year" : "Next month"} onClick={() => (view === "years" ? setYearBase((y) => y + 12) : view === "months" ? setMonth(new Date(month.getFullYear() + 1, month.getMonth(), 1), 1) : setMonth(addMonths(month, 1), 1))}>
          <Chevron dir="right" />
        </button>
      </div>

      {view === "months" ? (
        <div className="bbcal__pickgrid" role="group" aria-label="Choose a month">
          {MONTHS.map((m, i) => (
            <button
              key={m}
              type="button"
              className={cn("bbcal__cell", i === month.getMonth() && "is-on")}
              onClick={() => {
                setMonth(new Date(month.getFullYear(), i, 1), i >= month.getMonth() ? 1 : -1);
                setView("days");
              }}
            >
              {m.slice(0, 3)}
            </button>
          ))}
        </div>
      ) : view === "years" ? (
        <div className="bbcal__pickgrid" role="group" aria-label="Choose a year">
          {Array.from({ length: 12 }, (_, i) => yearBase + i).map((y) => (
            <button
              key={y}
              type="button"
              className={cn("bbcal__cell", y === month.getFullYear() && "is-on")}
              onClick={() => {
                setMonth(new Date(y, month.getMonth(), 1), y >= month.getFullYear() ? 1 : -1);
                setView("months");
              }}
            >
              {y}
            </button>
          ))}
        </div>
      ) : (
        <div ref={gridRef} role="grid" aria-labelledby={titleId} className="bbcal__grid" onKeyDown={onKey}>
          <div role="row" className="bbcal__row bbcal__dow">
            {weekdays.map((w, i) => (
              <span key={w + i} role="columnheader" className="bbcal__dowcell">
                {w}
              </span>
            ))}
          </div>
          <div key={`${month.getFullYear()}-${month.getMonth()}`} className={cn("bbcal__weeks", dir === 1 ? "is-next" : "is-prev")}>
            {Array.from({ length: 6 }, (_, w) => (
              <div role="row" className="bbcal__row" key={w}>
                {days.slice(w * 7, w * 7 + 7).map((d) => {
                  const outside = d.getMonth() !== month.getMonth();
                  const off = !!disabled?.(d);
                  const booked = isBooked(d);
                  const sel = isSelected(d);
                  const edge = rangeEdge(d);
                  return (
                    <span role="gridcell" key={d.getTime()} className={cn("bbcal__day", inRange(d) && "is-band", edge && `is-edge-${edge}`)} aria-selected={sel}>
                      <button
                        type="button"
                        tabIndex={sameDay(d, focus) ? 0 : -1}
                        disabled={off}
                        aria-disabled={booked || undefined}
                        aria-label={`${d.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" })}${booked ? ", taken" : ""}${hasEvent(d) ? ", has an event" : ""}`}
                        className={cn("bbcal__btn", outside && "is-outside", sameDay(d, today) && "is-today", sel && "is-selected", booked && "is-booked")}
                        onClick={() => pick(d)}
                        onFocus={() => setFocus(d)}
                      >
                        {d.getDate()}
                        {hasEvent(d) ? <i className="bbcal__dot" aria-hidden /> : null}
                      </button>
                    </span>
                  );
                })}
              </div>
            ))}
          </div>
        </div>
      )}
      <p className="bbcal__live" aria-live="polite" role="status">
        {announce}
      </p>
    </div>
  );
}

export default Calendar;
