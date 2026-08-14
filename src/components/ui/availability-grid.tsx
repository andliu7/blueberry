"use client";

import { useCallback, useMemo, useRef, useState } from "react";
import { cn } from "@/lib/utils";

/**
 * Pick the times you are free; the overlap falls out.
 *
 * Nothing to do with the course calendar next door — that one shows fixed dates
 * somebody else set, this one collects availability from several people and
 * finds where it agrees. Same word, opposite direction.
 *
 * Drag paints a block rather than a trail. Painting a trail means anyone whose
 * hand wobbles crossing "Tuesday 3pm" has now said they are free at Tuesday
 * 3pm, and the whole point is that these answers are trusted enough to book
 * against. A rectangle between where you pressed and where you let go is also
 * what everyone who has used one of these before expects.
 */

const pad = (n: number) => String(n).padStart(2, "0");

/**
 * A slot's identity is its local wall-clock time.
 *
 * Not an epoch number and not UTC: people compare these across a group, and a
 * meeting at "Tuesday 2pm" has to still say Tuesday 2pm for someone whose
 * laptop is set to a different zone.
 */
export const slotKey = (day: Date, minutesFromMidnight: number) => {
  const d = new Date(day.getFullYear(), day.getMonth(), day.getDate());
  d.setMinutes(minutesFromMidnight);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

export interface Respondent {
  name: string;
  slots: string[];
}

export interface AvailabilityGridProps {
  /** The days on offer, in order. */
  days: Date[];
  startHour?: number;
  endHour?: number;
  slotMinutes?: 15 | 30 | 60;
  /** Your own answer. */
  value: string[];
  onChange: (slots: string[]) => void;
  /** Everyone else's, for the heatmap and the summary. */
  others?: Respondent[];
  /** Read-only: show the group's overlap without collecting an answer. */
  readOnly?: boolean;
  className?: string;
}

interface Cell {
  day: number;
  slot: number;
}

export function AvailabilityGrid({
  days,
  startHour = 8,
  endHour = 20,
  slotMinutes = 30,
  value,
  onChange,
  others = [],
  readOnly = false,
  className,
}: AvailabilityGridProps) {
  const [drag, setDrag] = useState<{ anchor: Cell; cursor: Cell; erasing: boolean } | null>(null);
  const [hover, setHover] = useState<Cell | null>(null);
  const [focus, setFocus] = useState<Cell>({ day: 0, slot: 0 });
  const gridRef = useRef<HTMLDivElement>(null);

  const rows = useMemo(() => {
    const out: number[] = [];
    for (let m = startHour * 60; m < endHour * 60; m += slotMinutes) out.push(m);
    return out;
  }, [startHour, endHour, slotMinutes]);

  const mine = useMemo(() => new Set(value), [value]);

  /** How many people are free in each slot, counted once. */
  const tally = useMemo(() => {
    const counts = new Map<string, string[]>();
    for (const person of others) {
      for (const key of new Set(person.slots)) {
        const list = counts.get(key);
        if (list) list.push(person.name);
        else counts.set(key, [person.name]);
      }
    }
    return counts;
  }, [others]);

  const headcount = others.length + (readOnly ? 0 : 1);

  const inPreview = useCallback(
    (day: number, slot: number) => {
      if (!drag) return false;
      const { anchor, cursor } = drag;
      return (
        day >= Math.min(anchor.day, cursor.day) &&
        day <= Math.max(anchor.day, cursor.day) &&
        slot >= Math.min(anchor.slot, cursor.slot) &&
        slot <= Math.max(anchor.slot, cursor.slot)
      );
    },
    [drag],
  );

  const commit = useCallback(() => {
    if (!drag) return;
    const next = new Set(value);
    const { anchor, cursor, erasing } = drag;
    for (let d = Math.min(anchor.day, cursor.day); d <= Math.max(anchor.day, cursor.day); d++) {
      for (
        let s = Math.min(anchor.slot, cursor.slot);
        s <= Math.max(anchor.slot, cursor.slot);
        s++
      ) {
        const key = slotKey(days[d], rows[s]);
        if (erasing) next.delete(key);
        else next.add(key);
      }
    }
    setDrag(null);
    onChange([...next]);
  }, [drag, value, days, rows, onChange]);

  const toggleOne = (day: number, slot: number) => {
    const key = slotKey(days[day], rows[slot]);
    const next = new Set(value);
    if (next.has(key)) next.delete(key);
    else next.add(key);
    onChange([...next]);
  };

  const onGridKeyDown = (e: React.KeyboardEvent) => {
    const moves: Record<string, Cell> = {
      ArrowLeft: { day: -1, slot: 0 },
      ArrowRight: { day: 1, slot: 0 },
      ArrowUp: { day: 0, slot: -1 },
      ArrowDown: { day: 0, slot: 1 },
    };
    if (e.key === " " || e.key === "Enter") {
      e.preventDefault();
      if (!readOnly) toggleOne(focus.day, focus.slot);
      return;
    }
    const move = moves[e.key];
    if (!move) return;
    e.preventDefault();
    const next = {
      day: Math.min(days.length - 1, Math.max(0, focus.day + move.day)),
      slot: Math.min(rows.length - 1, Math.max(0, focus.slot + move.slot)),
    };
    setFocus(next);
    requestAnimationFrame(() => {
      gridRef.current
        ?.querySelector<HTMLElement>(`[data-cell="${next.day}-${next.slot}"]`)
        ?.focus();
    });
  };

  const best = useMemo(() => bestSlot(days, rows, tally, mine, readOnly), [
    days,
    rows,
    tally,
    mine,
    readOnly,
  ]);

  const shown = hover ?? (drag ? drag.cursor : null);
  const shownKey = shown ? slotKey(days[shown.day], rows[shown.slot]) : null;
  const shownFree = shownKey ? (tally.get(shownKey) ?? []) : [];

  return (
    <div className={cn("flex flex-col gap-3", className)}>
      {best && (
        <p className="rounded-xl border border-border bg-card px-3 py-2 text-sm">
          <span className="font-semibold text-card-foreground">Best so far: </span>
          <span className="text-muted-foreground">
            {best.label} — {best.count} of {headcount} free
          </span>
        </p>
      )}

      <div className="overflow-x-auto">
        <div
          ref={gridRef}
          onKeyDown={onGridKeyDown}
          /* Pointer capture on the container, not the cell: the pointer leaves
             the cell it started in on the first pixel of a drag, and a capture
             held by that cell would swallow every enter event after it. */
          onPointerUp={commit}
          onPointerLeave={() => setHover(null)}
          role="group"
          aria-label="Availability"
          className="inline-block min-w-full touch-none select-none"
        >
          <div
            className="grid"
            style={{ gridTemplateColumns: `4.5rem repeat(${days.length}, minmax(3.5rem, 1fr))` }}
          >
            <div />
            {days.map((day) => (
              <div
                key={day.toISOString()}
                className="pb-1 text-center text-xs font-semibold text-muted-foreground"
              >
                <div>{day.toLocaleDateString(undefined, { weekday: "short" })}</div>
                <div className="font-normal">
                  {day.toLocaleDateString(undefined, { day: "numeric", month: "short" })}
                </div>
              </div>
            ))}

            {rows.map((minutes, slot) => (
              <Row
                key={minutes}
                minutes={minutes}
                slot={slot}
                slotMinutes={slotMinutes}
                days={days}
                mine={mine}
                tally={tally}
                headcount={headcount}
                readOnly={readOnly}
                focus={focus}
                inPreview={inPreview}
                erasing={drag?.erasing ?? false}
                onDown={(day) => {
                  if (readOnly) return;
                  const key = slotKey(days[day], minutes);
                  setDrag({
                    anchor: { day, slot },
                    cursor: { day, slot },
                    // What you grab decides what the drag does. Starting on a
                    // slot you already picked erases; starting on an empty one
                    // fills. One gesture, no mode to remember.
                    erasing: mine.has(key),
                  });
                  setFocus({ day, slot });
                }}
                onEnter={(day) => {
                  setHover({ day, slot });
                  setDrag((prev) => (prev ? { ...prev, cursor: { day, slot } } : prev));
                }}
              />
            ))}
          </div>
        </div>
      </div>

      {shownKey && others.length > 0 && (
        <p className="text-sm text-muted-foreground" aria-live="polite">
          {shownFree.length === 0
            ? "Nobody else is free then."
            : `Free then: ${shownFree.join(", ")}`}
        </p>
      )}

      {!readOnly && (
        <p className="text-xs text-muted-foreground">
          Drag to paint the hours you are free. Drag again over a filled block to clear it.
          Arrow keys and space work too.
        </p>
      )}
    </div>
  );
}

function Row({
  minutes,
  slot,
  slotMinutes,
  days,
  mine,
  tally,
  headcount,
  readOnly,
  focus,
  inPreview,
  erasing,
  onDown,
  onEnter,
}: {
  minutes: number;
  slot: number;
  slotMinutes: number;
  days: Date[];
  mine: Set<string>;
  tally: Map<string, string[]>;
  headcount: number;
  readOnly: boolean;
  focus: Cell;
  inPreview: (day: number, slot: number) => boolean;
  erasing: boolean;
  onDown: (day: number) => void;
  onEnter: (day: number) => void;
}) {
  const onHour = minutes % 60 === 0;
  const label = new Date(2000, 0, 1, 0, minutes).toLocaleTimeString(undefined, {
    hour: "numeric",
    minute: slotMinutes === 60 ? undefined : "2-digit",
  });

  return (
    <>
      <div
        className={cn(
          "pr-2 text-right text-[11px] leading-6 text-muted-foreground",
          !onHour && "opacity-0",
        )}
      >
        {label}
      </div>
      {days.map((day, dayIndex) => {
        const key = slotKey(day, minutes);
        const isMine = mine.has(key);
        const preview = inPreview(dayIndex, slot);
        const on = preview ? !erasing : isMine;
        const count = (tally.get(key) ?? []).length + (isMine && !readOnly ? 1 : 0);
        const share = headcount > 0 ? count / headcount : 0;
        const focused = focus.day === dayIndex && focus.slot === slot;

        return (
          <div
            key={key}
            data-cell={`${dayIndex}-${slot}`}
            role={readOnly ? undefined : "checkbox"}
            aria-checked={readOnly ? undefined : on}
            aria-label={`${day.toLocaleDateString(undefined, {
              weekday: "long",
            })} ${label}, ${count} of ${headcount} free`}
            tabIndex={readOnly ? -1 : focused ? 0 : -1}
            onPointerDown={() => onDown(dayIndex)}
            onPointerEnter={() => onEnter(dayIndex)}
            className={cn(
              "relative h-6 border-b border-r border-border/60 outline-none",
              onHour ? "border-t border-t-border" : "border-t border-t-transparent",
              !readOnly && "cursor-pointer",
              focused && "ring-2 ring-inset ring-ring",
            )}
            style={{
              // The group's overlap is the background; your own answer is the
              // outline on top of it. Two signals in one cell without either
              // hiding the other.
              backgroundColor: share > 0 ? `color-mix(in oklab, var(--color-indigo-500) ${Math.round(share * 70)}%, transparent)` : undefined,
            }}
          >
            {on && !readOnly && (
              <span className="absolute inset-0.5 rounded-[3px] bg-indigo-500/80 ring-1 ring-indigo-600" />
            )}
          </div>
        );
      })}
    </>
  );
}

/** The slot the most people can make, earliest one winning a tie. */
function bestSlot(
  days: Date[],
  rows: number[],
  tally: Map<string, string[]>,
  mine: Set<string>,
  readOnly: boolean,
): { label: string; count: number } | null {
  let bestCount = 0;
  let bestAt: { day: Date; minutes: number } | null = null;

  for (const day of days) {
    for (const minutes of rows) {
      const key = slotKey(day, minutes);
      const count = (tally.get(key) ?? []).length + (!readOnly && mine.has(key) ? 1 : 0);
      if (count > bestCount) {
        bestCount = count;
        bestAt = { day, minutes };
      }
    }
  }

  if (!bestAt || bestCount < 2) return null;
  const at = new Date(bestAt.day.getFullYear(), bestAt.day.getMonth(), bestAt.day.getDate());
  at.setMinutes(bestAt.minutes);
  return {
    label: at.toLocaleString(undefined, {
      weekday: "long",
      hour: "numeric",
      minute: "2-digit",
    }),
    count: bestCount,
  };
}

export default AvailabilityGrid;
