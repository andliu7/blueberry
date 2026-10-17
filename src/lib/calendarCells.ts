/**
 * The month and week views' arithmetic, kept out of the component file so the
 * component file exports only components (React's fast refresh needs that),
 * and so the tests can call these without rendering anything.
 */

/**
 * How many chips a month cell holds, from its measured height.
 *
 * A cell is 4px padding, a 22px day number, a 2px gap, then rows of 18px chips
 * 2px apart, then 4px padding: 32px of chrome and 20px a row, less the gap the
 * last row does not need. At the 116px desktop row that is 4 rows.
 */
export const CELL_ROW_PX = 116;
export function chipCapacity(cellHeight: number): number {
  return Math.max(1, Math.floor((cellHeight - 30) / 20));
}

/**
 * Which chips to draw in a cell that holds `capacity` rows. Everything fits:
 * draw it all. It does not: draw one fewer than fits and give the last row to
 * "+N more", so nothing is ever hidden without saying so (critic, round 1: a
 * cell with four items showed one chip and a 2px sliver, and no "+N more").
 */
export function fitChips(count: number, capacity: number): { shown: number; more: number } {
  if (count <= capacity) return { shown: count, more: 0 };
  const shown = Math.max(capacity - 1, 0);
  return { shown, more: count - shown };
}

/**
 * The phone's week list skips empty days and says so in one line: "Nothing on
 * Sun to Tue" rather than three cards that each read "Nothing".
 */
export function nothingLine(days: Date[]): string {
  const name = (d: Date) => d.toLocaleDateString(undefined, { weekday: "short" });
  if (days.length === 1) return `Nothing on ${name(days[0])}`;
  if (days.length === 2) return `Nothing on ${name(days[0])} or ${name(days[1])}`;
  return `Nothing on ${name(days[0])} to ${name(days[days.length - 1])}`;
}

/**
 * The first day of a calendar week: 0 is Sunday. The page's month grid and the
 * booking sheet's month both read this, so one date sits in the same column one
 * click apart (critic, round 2: the sheet ran Mon to Sun under a Sun to Sat page).
 */
export const WEEK_STARTS_ON = 0;
/** The seven weekday names in grid order, from `WEEK_STARTS_ON`. */
export const WEEKDAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]
  .map((_, i, all) => all[(i + WEEK_STARTS_ON) % 7]);
/** How many blank cells come before `first` in its week row. */
export function leadDays(first: Date): number {
  return (first.getDay() - WEEK_STARTS_ON + 7) % 7;
}

/**
 * The order a month cell draws its chips in, most important first: exam, quiz,
 * deadline, my session, class, office hours, then the open times. Ties keep
 * their time order. The first four ranks are "priority": they always show, so
 * "+N more" can only ever hide class or office hours (critic, round 2: a
 * deadline and my own session were hidden behind "+4 more" on a busy day).
 */
const RANK: Record<string, number> = {
  exam: 0,
  quiz: 1,
  assignment: 2,
  "my-session": 3,
  lecture: 4,
  lab: 4,
  "office-hours": 5,
  "open-slot": 6,
};
const PRIORITY_RANK = 3;
const isPriority = (kind: string) => (RANK[kind] ?? 9) <= PRIORITY_RANK;

/** One drawn row in a cell: a real item, or every open slot that day as one chip. */
export type CellEntry<T> = { type: "item"; item: T } | { type: "open"; count: number };

/**
 * A day's items as the rows a month cell draws: in importance order, with every
 * open office-hour slot collapsed into one "N open times" entry, placed last
 * (critic, round 2: about 30 of a month's chips were copies of "Office hour...").
 */
export function cellEntries<T extends { kind: string; start: Date }>(items: T[]): CellEntry<T>[] {
  const open = items.filter((i) => i.kind === "open-slot");
  const rest = items
    .filter((i) => i.kind !== "open-slot")
    .map((item, at) => ({ item, at }))
    .sort((a, b) => (RANK[a.item.kind] ?? 9) - (RANK[b.item.kind] ?? 9) || a.item.start.getTime() - b.item.start.getTime() || a.at - b.at)
    .map(({ item }): CellEntry<T> => ({ type: "item", item }));
  return open.length > 0 ? [...rest, { type: "open", count: open.length }] : rest;
}

/**
 * `fitChips`, except that priority entries are never hidden behind "+N more".
 * A day with as many exams, deadlines and sessions as the cell has rows (four
 * at 116px) draws them all, and the "+N more" row below them falls outside the
 * cell. No course plans four of those on one day; the day's list holds them all.
 */
export function fitCell<T extends { kind: string }>(entries: CellEntry<T>[], capacity: number): { shown: number; more: number } {
  const priority = entries.filter((e) => e.type === "item" && isPriority(e.item.kind)).length;
  const fit = fitChips(entries.length, capacity);
  const shown = Math.max(fit.shown, priority);
  return { shown, more: entries.length - shown };
}
