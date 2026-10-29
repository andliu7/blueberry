/**
 * The admin task board: To do, Doing, Done. Page: "#/app/admin/tasks"; also a card on the admin home.
 *
 * Built to the Linear board view: quiet columns with a status icon, a name and a count; white
 * cards with an ID, a bold title and one row of small chips (label dot, date) with the owner
 * avatar top right; a "+" on each column to add in place; search; a hairline drop line instead
 * of a loud outline. Speed matters more than chrome, so every action has a key.
 *
 * Seeded from the open items in documentation/STATUS.md. It is the owner's personal notepad: it
 * lives in this browser only (localStorage, try/catch) and never changes the real queue file.
 *
 * Keyboard (the hint line under the board says the same):
 *   Up / Down          next or previous card in the column
 *   Left / Right       jump to the neighbouring column
 *   Shift + Left/Right move the card to another column
 *   Alt + Up / Down    move the card up or down inside its column
 *   1  2  3            set To do, Doing, Done
 *   P                  cycle priority
 *   Enter              rename      D  set a date      Delete  remove
 *   /                  search      C  new card in the focused column
 */
import { lazy, Suspense, useEffect, useId, useMemo, useRef, useState } from "react";
import type { DragEvent, KeyboardEvent } from "react";
import TaskProjects from "./TaskProjects";
import "./taskBoard.css";

const Calendar = lazy(() => import("@/components/ui/calendar").then((m) => ({ default: m.Calendar })));

export type Column = "todo" | "doing" | "done";
export interface Task {
  id: string;
  title: string;
  label: string;
  column: Column;
  /** yyyy-mm-dd or null. */
  due: string | null;
  /** Running number shown as BB-n. */
  num?: number;
  /** "Andrew", "Claude" or absent. */
  owner?: string;
  /** 1 urgent, 2 high, 3 medium, 4 low; absent means none. */
  pri?: Priority;
}
export type Priority = 1 | 2 | 3 | 4;
export const PRIORITIES: ReadonlyArray<{ id: Priority | 0; label: string }> = [
  { id: 0, label: "No priority" },
  { id: 1, label: "Urgent" },
  { id: 2, label: "High" },
  { id: 3, label: "Medium" },
  { id: 4, label: "Low" },
];
const priName = (p?: Priority): string => PRIORITIES.find((x) => x.id === (p ?? 0))!.label;
const nextPri = (p?: Priority): Priority | undefined => ((((p ?? 0) + 1) % 5) || undefined) as Priority | undefined;
/** The job to do next: the most urgent card in To do, and the first one among equals. */
export function nextTask(tasks: readonly Task[]): Task | null {
  let best: Task | null = null;
  for (const t of tasks) {
    if (t.column !== "todo") continue;
    if (!best || (t.pri ?? 9) < (best.pri ?? 9)) best = t;
  }
  return best;
}

export const COLUMNS: ReadonlyArray<{ id: Column; label: string }> = [
  { id: "todo", label: "To do" },
  { id: "doing", label: "Doing" },
  { id: "done", label: "Done" },
];

/** Label name to dot colour. A fixed small set keeps the board calm. */
export const LABELS: ReadonlyArray<{ name: string; color: string }> = [
  { name: "Lessons", color: "#5a3fd8" },
  { name: "Rewards", color: "#d98a00" },
  { name: "Design", color: "#d6457a" },
  { name: "Data", color: "#1c8f6a" },
  { name: "Tests", color: "#c2410c" },
  { name: "Money", color: "#0f7fb0" },
  { name: "Admin", color: "#6b7280" },
  { name: "Mine", color: "#5a3fd8" },
];
const OWNERS = ["Andrew", "Claude"] as const;
const labelColor = (name: string): string => LABELS.find((l) => l.name === name)?.color ?? "#6b7280";

const KEY = "blueberry.admin.tasks.v2";
const OLD_KEY = "blueberry.admin.tasks.v1";

const seed = (num: number, id: string, title: string, label: string, column: Column, owner?: string, pri?: Priority): Task => ({ id, num, title, label, column, due: null, owner, pri });

export const SEED_TASKS: Task[] = [
  seed(1, "t1", "Unit 1 test-outs, Duolingo style", "Lessons", "doing", "Claude", 2),
  seed(2, "t2", "A 20 question exam for each unit", "Lessons", "todo", "Claude", 3),
  seed(3, "t3", "Onboarding gift chest: start nobody at zero", "Rewards", "todo", "Claude", 2),
  seed(4, "t4", "Apply the entitlements staff-read migration", "Data", "todo", "Andrew", 1),
  seed(5, "t5", "Fix the 5 red game tests", "Tests", "todo", "Claude", 2),
  seed(6, "t6", "Admin home: first look", "Admin", "done", "Claude"),
  seed(7, "t7", "Sign off the Unit 1 items (about 179 placeholders)", "Lessons", "todo", "Andrew", 3),
  seed(8, "t8", "Decide the streak freeze price: 75 or 200 diamonds", "Rewards", "todo", "Andrew", 3),
  seed(9, "t9", "Pathway side tabs down the left edge", "Design", "doing", "Claude", 3),
  seed(10, "t10", "Fix the focus on diamonds, energy and XP, top right", "Design", "doing", "Claude", 3),
  seed(11, "t11", "Lesson and gem popups: one screen, no scroll", "Design", "todo", "Claude", 3),
  seed(12, "t12", "Unit 2 first lesson shows locked: open it", "Lessons", "todo", "Claude", 2),
  seed(13, "t13", "Open chests become an open, empty box", "Rewards", "todo", "Claude", 4),
  seed(14, "t14", "Feedback feature (brief in documentation/designs)", "Admin", "todo", "Claude", 4),
  seed(15, "t15", "Stripe for the shop only", "Money", "todo", "Andrew", 3),
  seed(16, "t16", "A free sign-in access code", "Data", "todo", "Claude", 4),
  seed(17, "t17", "Diels-Alder builder: needs the professor's drawing first", "Lessons", "todo", "Andrew", 4),
  seed(18, "t18", "Focus timer pop-out window", "Design", "todo", "Claude", 4),
  seed(19, "t19", "Admin stats boards (sample data, labelled)", "Admin", "done", "Claude"),
  seed(20, "t20", "Focus timer inside the game", "Design", "done", "Claude"),
  seed(21, "t21", "One look for 404 and not-here screens", "Design", "done", "Claude"),
  seed(22, "t22", "Site audit: pages, text, spacing, hierarchy, motion", "Design", "doing", "Claude", 2),
  seed(23, "t23", "Radical animation: one unstable species, never splits", "Design", "todo", "Claude", 2),
  seed(24, "t24", 'Admin numbers real, or labelled "No data, example"', "Admin", "todo", "Claude", 2),
  seed(25, "t25", "Admin pathway slideshow: questions, cards, videos, algorithms", "Admin", "todo", "Claude", 2),
  seed(26, "t26", "Finish Unit 1: questions, video slots, walk-throughs, context", "Lessons", "todo", "Claude", 2),
  seed(27, "t27", "Units 2 and 3 on the Unit 1 style guide", "Lessons", "todo", "Claude", 2),
  seed(28, "t28", "One lesson per reaction, with why it works", "Lessons", "todo", "Claude", 2),
  seed(29, "t29", "Energy diagrams, Keq and pKa questions", "Lessons", "todo", "Claude", 2),
  seed(30, "t30", "NMR and IR toolbar: range select, own image, zoom", "Lessons", "todo", "Claude", 2),
  seed(31, "t31", "Difficulty rules (easier or harder next), tested", "Lessons", "todo", "Claude", 2),
];

const SEEDED_KEY = "blueberry.admin.tasks.seeded.v1";
/** Seed cards that existed before seeded ids were tracked; once deleted they stay deleted. */
const FIRST_SEEDS = 21;

/** Add seed cards this browser has not been given yet, never ones it deleted. New cards take the next free number. */
export function withNewSeeds(tasks: Task[], seeded: readonly string[]): { tasks: Task[]; seeded: string[] } {
  const have = new Set(tasks.map((t) => t.id));
  let n = tasks.reduce((m, t) => Math.max(m, t.num ?? 0), 0);
  const fresh = SEED_TASKS.filter((t) => !have.has(t.id) && !seeded.includes(t.id)).map((t) => ({ ...t, num: ++n }));
  return { tasks: [...tasks, ...fresh], seeded: SEED_TASKS.map((t) => t.id) };
}
function seedCards(tasks: Task[]): Task[] {
  let seeded: string[] = SEED_TASKS.slice(0, FIRST_SEEDS).map((t) => t.id);
  try {
    const raw = JSON.parse(window.localStorage.getItem(SEEDED_KEY) ?? "null") as unknown;
    if (Array.isArray(raw)) seeded = raw.filter((x): x is string => typeof x === "string");
  } catch {
    /* use the default */
  }
  const out = withNewSeeds(tasks, seeded);
  try {
    window.localStorage.setItem(SEEDED_KEY, JSON.stringify(out.seeded));
  } catch {
    /* blocked: the cards still show for this visit */
  }
  return out.tasks;
}

export function moveTask(tasks: readonly Task[], id: string, to: Column): Task[] {
  return tasks.map((t) => (t.id === id ? { ...t, column: to } : t));
}
export function step(col: Column, dir: -1 | 1): Column {
  const i = COLUMNS.findIndex((c) => c.id === col) + dir;
  return COLUMNS[Math.max(0, Math.min(COLUMNS.length - 1, i))]!.id;
}
/** Put `id` in column `to`, just before `beforeId` (or last in that column when null). */
export function placeTask(tasks: readonly Task[], id: string, to: Column, beforeId: string | null): Task[] {
  const moving = tasks.find((t) => t.id === id);
  if (!moving || id === beforeId) return [...tasks];
  const rest = tasks.filter((t) => t.id !== id);
  const next = { ...moving, column: to };
  const at = beforeId === null ? -1 : rest.findIndex((t) => t.id === beforeId);
  if (at >= 0) return [...rest.slice(0, at), next, ...rest.slice(at)];
  const lastInCol = rest.map((t) => t.column).lastIndexOf(to);
  return lastInCol < 0 ? [...rest, next] : [...rest.slice(0, lastInCol + 1), next, ...rest.slice(lastInCol + 1)];
}
/** Swap a card with its neighbour inside the same column. */
export function nudgeTask(tasks: readonly Task[], id: string, dir: -1 | 1): Task[] {
  const t = tasks.find((x) => x.id === id);
  if (!t) return [...tasks];
  const ids = tasks.filter((x) => x.column === t.column).map((x) => x.id);
  const j = ids.indexOf(id) + dir;
  if (j < 0 || j >= ids.length) return [...tasks];
  return dir < 0 ? placeTask(tasks, id, t.column, ids[j]!) : placeTask(tasks, id, t.column, ids[j + 1] ?? null);
}
export const toKey = (d: Date): string => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
export const fromKey = (k: string): Date => {
  const [y, m, d] = k.split("-").map(Number);
  return new Date(y!, m! - 1, d!);
};

function valid(parsed: unknown): Task[] | null {
  if (!Array.isArray(parsed)) return null;
  const ok = parsed.filter((t): t is Task => !!t && typeof t === "object" && typeof (t as Task).id === "string" && typeof (t as Task).title === "string" && COLUMNS.some((c) => c.id === (t as Task).column));
  // Cards from the first version have no number; give them one so every card has an ID.
  let n = ok.reduce((m, t) => Math.max(m, t.num ?? 0), 0);
  return ok.map((t) => {
    const withNum = t.num ? t : { ...t, num: ++n };
    const fromSeed = SEED_TASKS.find((x) => x.id === t.id)?.pri;
    return withNum.pri === undefined && fromSeed ? { ...withNum, pri: fromSeed } : withNum;
  });
}
function load(): Task[] {
  try {
    const now = valid(JSON.parse(window.localStorage.getItem(KEY) ?? "null"));
    if (now) return seedCards(now);
    // First open since the redesign: keep what the owner had, if anything.
    const old = valid(JSON.parse(window.localStorage.getItem(OLD_KEY) ?? "null"));
    if (old && old.length > 0) {
      // The first version seeded t1 to t6: take the new seed, keep where he moved those, and keep his own cards.
      const moved = new Map(old.map((t) => [t.id, t]));
      const kept = SEED_TASKS.map((t) => (moved.has(t.id) ? { ...t, column: moved.get(t.id)!.column, due: moved.get(t.id)!.due } : t));
      const mine = old.filter((t) => !SEED_TASKS.some((s) => s.id === t.id));
      let n = SEED_TASKS.length;
      return [...mine.map((t) => ({ ...t, num: ++n, owner: t.owner ?? "Andrew" })), ...kept];
    }
  } catch {
    /* blocked or broken: start from the seed */
  }
  return SEED_TASKS;
}

const dueText = (k: string): string => fromKey(k).toLocaleDateString("en-US", { month: "short", day: "numeric" });
const isLate = (t: Task): boolean => !!t.due && t.column !== "done" && t.due < toKey(new Date());

function StatusIcon({ column }: { column: Column }) {
  if (column === "done")
    return (
      <svg viewBox="0 0 16 16" width="16" height="16" aria-hidden>
        <circle cx="8" cy="8" r="7" fill="var(--bb-primary)" />
        <path d="M4.8 8.3 7 10.4l4.2-4.6" fill="none" stroke="#fff" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    );
  if (column === "doing")
    return (
      <svg viewBox="0 0 16 16" width="16" height="16" aria-hidden>
        <circle cx="8" cy="8" r="6.25" fill="none" stroke="#d98a00" strokeWidth="1.5" />
        <path d="M8 4a4 4 0 0 1 0 8z" fill="#d98a00" />
      </svg>
    );
  return (
    <svg viewBox="0 0 16 16" width="16" height="16" aria-hidden>
      <circle cx="8" cy="8" r="6.25" fill="none" stroke="var(--bb-muted-foreground)" strokeWidth="1.5" strokeDasharray="2.2 2.2" />
    </svg>
  );
}

function PriIcon({ pri }: { pri?: Priority }) {
  if (pri === 1)
    return (
      <svg viewBox="0 0 16 16" width="16" height="16" aria-hidden>
        <rect x="2" y="2" width="12" height="12" rx="3" fill="#d9480f" />
        <path d="M8 4.8v4M8 10.6v.8" stroke="#fff" strokeWidth="1.6" strokeLinecap="round" />
      </svg>
    );
  if (!pri)
    return (
      <svg viewBox="0 0 16 16" width="16" height="16" aria-hidden>
        <path d="M3 8h2M7 8h2M11 8h2" stroke="var(--bb-muted-foreground)" strokeWidth="1.6" strokeLinecap="round" opacity="0.7" />
      </svg>
    );
  const on = 5 - pri; // high 3 bars, medium 2, low 1
  return (
    <svg viewBox="0 0 16 16" width="16" height="16" aria-hidden>
      {[0, 1, 2].map((i) => (
        <rect key={i} x={2.5 + i * 4} y={10 - i * 3} width="3" height={3 + i * 3} rx="0.8" fill="var(--bb-foreground)" opacity={i < on ? 0.8 : 0.2} />
      ))}
    </svg>
  );
}

const Chevron = ({ dir }: { dir: "l" | "r" }) => (
  <svg viewBox="0 0 24 24" width="14" height="14" aria-hidden>
    <path d={dir === "l" ? "M15 5 8 12l7 7" : "M9 5l7 7-7 7"} fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

interface Drop {
  col: Column;
  before: string | null;
}

function TaskBoardCards({ embedded = false, onDueDates }: { embedded?: boolean; onDueDates?: (dates: Date[]) => void }) {
  const [tasks, setTasks] = useState<Task[]>(load);
  const [query, setQuery] = useState("");
  const [labelFilter, setLabelFilter] = useState<string | null>(null);
  const [adding, setAdding] = useState<Column | null>(null);
  const [draft, setDraft] = useState("");
  const [editing, setEditing] = useState<string | null>(null);
  const [dragId, setDragId] = useState<string | null>(null);
  const [drop, setDrop] = useState<Drop | null>(null);
  const [picking, setPicking] = useState<string | null>(null);
  const [said, setSaid] = useState("");
  const [focusId, setFocusId] = useState<string | null>(null);
  const [doneOpen, setDoneOpen] = useState(false);
  const [phoneCol, setPhoneCol] = useState<Column>("todo");
  const uid = useId();
  const root = useRef<HTMLElement>(null);
  const search = useRef<HTMLInputElement>(null);

  useEffect(() => {
    try {
      window.localStorage.setItem(KEY, JSON.stringify(tasks));
    } catch {
      /* private window: the board still works for this visit */
    }
    onDueDates?.(tasks.filter((t) => t.due && t.column !== "done").map((t) => fromKey(t.due!)));
  }, [tasks, onDueDates]);

  // After a keyboard move the card has a new DOM node: put focus back on it.
  useEffect(() => {
    if (!focusId) return;
    root.current?.querySelector<HTMLElement>(`[data-card="${focusId}"]`)?.focus();
    setFocusId(null);
  }, [focusId, tasks]);

  // "/" jumps to search and "C" starts a new task, like Linear.
  useEffect(() => {
    const onKey = (e: globalThis.KeyboardEvent) => {
      const el = e.target as HTMLElement | null;
      if (e.metaKey || e.ctrlKey || e.altKey || el?.closest("input, textarea, select, [contenteditable], button, [data-card]")) return;
      if (!root.current) return;
      if (e.key === "/") {
        e.preventDefault();
        search.current?.focus();
      } else if (e.key === "c" || e.key === "C") {
        e.preventDefault();
        setPhoneCol("todo");
        setAdding("todo");
        setDraft("");
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const q = query.trim().toLowerCase();
  const shown = useMemo(
    () => tasks.filter((t) => (!labelFilter || t.label === labelFilter) && (!q || t.title.toLowerCase().includes(q) || `bb-${t.num}`.includes(q) || (t.owner ?? "").toLowerCase().includes(q))),
    [tasks, q, labelFilter],
  );
  const hidden = tasks.length - shown.length;
  const next = useMemo(() => nextTask(tasks), [tasks]);
  const filtering = q !== "" || labelFilter !== null;
  const colName = (c: Column) => COLUMNS.find((x) => x.id === c)!.label;

  const update = (id: string, patch: Partial<Task>) => setTasks((all) => all.map((t) => (t.id === id ? { ...t, ...patch } : t)));
  const setStatus = (t: Task, to: Column, keepFocus = true) => {
    if (t.column === to) return;
    setTasks((all) => placeTask(all, t.id, to, null));
    setSaid(`${t.title} moved to ${colName(to)}`);
    if (keepFocus) setFocusId(t.id);
  };
  const addCard = (col: Column) => {
    const text = draft.trim();
    if (!text) {
      setAdding(null);
      return;
    }
    const num = tasks.reduce((m, t) => Math.max(m, t.num ?? 0), 0) + 1;
    const t: Task = { id: `t${Date.now()}`, num, title: text, label: labelFilter ?? "Mine", column: col, due: null, owner: "Andrew" };
    // Newest at the top of its column, as in Linear.
    setTasks((all) => placeTask([...all, t], t.id, col, all.find((x) => x.column === col)?.id ?? null));
    setSaid(`Added ${text} to ${colName(col)}`);
    setDraft("");
  };

  const onCardKey = (e: KeyboardEvent<HTMLElement>, t: Task) => {
    if (e.target !== e.currentTarget) return; // keys typed in the rename box or on a button are theirs
    const key = e.key;
    const cards = Array.from(root.current?.querySelectorAll<HTMLElement>(`[data-col="${t.column}"] [data-card]`) ?? []);
    const at = cards.indexOf(e.currentTarget);
    const go = (el?: HTMLElement) => {
      if (el) {
        e.preventDefault();
        el.focus();
      }
    };
    if (e.altKey && (key === "ArrowUp" || key === "ArrowDown")) {
      e.preventDefault();
      setTasks((all) => nudgeTask(all, t.id, key === "ArrowUp" ? -1 : 1));
      setFocusId(t.id);
    } else if (e.shiftKey && (key === "ArrowLeft" || key === "ArrowRight")) {
      e.preventDefault();
      setStatus(t, step(t.column, key === "ArrowLeft" ? -1 : 1));
    } else if (key === "ArrowDown") go(cards[at + 1]);
    else if (key === "ArrowUp") go(cards[at - 1]);
    else if (key === "ArrowLeft" || key === "ArrowRight") {
      const to = step(t.column, key === "ArrowLeft" ? -1 : 1);
      const next = Array.from(root.current?.querySelectorAll<HTMLElement>(`[data-col="${to}"] [data-card]`) ?? []);
      go(next[Math.min(at, next.length - 1)]);
    } else if (key === "1" || key === "2" || key === "3") {
      e.preventDefault();
      setStatus(t, COLUMNS[Number(key) - 1]!.id);
    } else if (key === "Enter") {
      e.preventDefault();
      setEditing(t.id);
    } else if (key === "d" || key === "D") {
      e.preventDefault();
      setPicking(picking === t.id ? null : t.id);
    } else if (key === "p" || key === "P") {
      e.preventDefault();
      update(t.id, { pri: nextPri(t.pri) });
    } else if (key === "c" || key === "C") {
      e.preventDefault();
      setAdding(t.column);
    } else if (key === "Delete" || key === "Backspace") {
      e.preventDefault();
      go(cards[at + 1] ?? cards[at - 1]);
      setTasks((all) => all.filter((x) => x.id !== t.id));
      setSaid(`Removed ${t.title}`);
    }
  };

  const onDragOverCard = (e: DragEvent<HTMLElement>, col: Column, t: Task) => {
    if (!dragId) return;
    e.preventDefault();
    e.stopPropagation();
    const r = e.currentTarget.getBoundingClientRect();
    const items = shown.filter((x) => x.column === col && x.id !== dragId);
    const i = items.findIndex((x) => x.id === t.id);
    const before = e.clientY < r.top + r.height / 2 ? t.id : (items[i + 1]?.id ?? null);
    setDrop((d) => (d && d.col === col && d.before === before ? d : { col, before }));
  };
  const finishDrop = (col: Column) => {
    if (dragId) {
      const t = tasks.find((x) => x.id === dragId);
      const before = drop && drop.col === col ? drop.before : null;
      setTasks((all) => placeTask(all, dragId, col, before));
      if (t && t.column !== col) setSaid(`${t.title} moved to ${colName(col)}`);
    }
    setDragId(null);
    setDrop(null);
  };

  const labelsInUse = LABELS.filter((l) => tasks.some((t) => t.label === l.name));
  const Line = <li className="tb-line" aria-hidden />;

  return (
    <section ref={root} className={`tb${embedded ? " tb--embedded" : ""}`} id="ah-tasks" aria-labelledby={`${uid}-h`}>
      <header className="tb-head">
        <h2 id={`${uid}-h`} className="tb-title">
          Tasks
        </h2>
        <label className="tb-search">
          <span className="tb-sr">Search tasks</span>
          <svg viewBox="0 0 24 24" width="14" height="14" aria-hidden>
            <circle cx="11" cy="11" r="6.5" fill="none" stroke="currentColor" strokeWidth="2.2" />
            <path d="m16 16 4 4" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
          </svg>
          <input
            ref={search}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Escape") {
                setQuery("");
                e.currentTarget.blur();
              }
            }}
            placeholder="Search"
            maxLength={60}
          />
          <kbd aria-hidden>/</kbd>
        </label>
        <button type="button" className="tb-new-btn" onClick={() => { setPhoneCol("todo"); setAdding("todo"); setDraft(""); }}>
          New task <kbd aria-hidden>C</kbd>
        </button>
        <div className="tb-filters" role="group" aria-label="Filter by label">
          {labelsInUse.map((l) => (
            <button key={l.name} type="button" className="tb-chip" aria-pressed={labelFilter === l.name} onClick={() => setLabelFilter(labelFilter === l.name ? null : l.name)}>
              <i style={{ background: l.color }} />
              {l.name}
            </button>
          ))}
        </div>
        {embedded ? (
          <a className="tb-open" href="#/app/admin/tasks">
            Open board
          </a>
        ) : null}
      </header>

      {next ? (
        <div className="tb-nextbar">
          <span className="tb-nextbar__tag">Next up</span>
          <span className="tb-nextbar__title">
            <span className="tb-id">BB-{next.num}</span> {next.title}
          </span>
          <button type="button" className="tb-start" onClick={() => setStatus(next, "doing", false)}>
            Start
          </button>
        </div>
      ) : null}

      <div className="tb-tabs" role="group" aria-label="Show column">
        {COLUMNS.map((c) => (
          <button key={c.id} type="button" className="tb-tab" aria-pressed={phoneCol === c.id} onClick={() => setPhoneCol(c.id)}>
            {c.label} <span>{tasks.filter((t) => t.column === c.id).length}</span>
          </button>
        ))}
      </div>

      <div className="tb-board">
        {COLUMNS.map((col) => {
          const items = shown.filter((t) => t.column === col.id);
          const fold = col.id === "done" && !doneOpen && !filtering && items.length > 3;
          const visible = fold ? items.slice(-3) : items;
          const total = tasks.filter((t) => t.column === col.id).length;
          const dropHere = drop?.col === col.id && dragId !== null;
          return (
            <div
              key={col.id}
              data-col={col.id}
              className={`tb-col${dropHere ? " is-over" : ""}${phoneCol === col.id ? " is-active" : ""}`}
              role="group"
              aria-label={`${col.label}, ${items.length} tasks`}
              onDragOver={(e) => {
                if (!dragId) return;
                e.preventDefault();
                setDrop((d) => (d && d.col === col.id ? d : { col: col.id, before: null }));
              }}
              onDrop={(e) => {
                e.preventDefault();
                finishDrop(col.id);
              }}
            >
              <div className="tb-col__head">
                <StatusIcon column={col.id} />
                <h3>{col.label}</h3>
                <span className="tb-count">{items.length === total ? total : `${items.length} / ${total}`}</span>
                <button type="button" className="tb-plus" aria-label={`Add a task to ${col.label}`} onClick={() => { setAdding(adding === col.id ? null : col.id); setDraft(""); }}>
                  <svg viewBox="0 0 24 24" width="14" height="14" aria-hidden>
                    <path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" />
                  </svg>
                </button>
              </div>

              {adding === col.id ? (
                <form
                  className="tb-new"
                  onSubmit={(e) => {
                    e.preventDefault();
                    addCard(col.id);
                  }}
                >
                  <input
                    autoFocus
                    value={draft}
                    onChange={(e) => setDraft(e.target.value)}
                    onKeyDown={(e) => e.key === "Escape" && setAdding(null)}
                    onBlur={() => { if (!draft.trim()) setAdding(null); }}
                    placeholder="Task title, then Enter"
                    aria-label={`New task in ${col.label}`}
                    maxLength={120}
                  />
                </form>
              ) : null}

              <ul className="tb-list">
                {fold ? (
                  <li className="tb-li">
                    <button type="button" className="tb-more" onClick={() => setDoneOpen(true)}>
                      Show {items.length - visible.length} more done
                    </button>
                  </li>
                ) : null}
                {visible.map((t) => (
                  <li key={t.id} className="tb-li">
                    {dropHere && drop!.before === t.id && dragId !== t.id ? Line : null}
                    <article
                      data-card={t.id}
                      tabIndex={0}
                      className={`tb-card${dragId === t.id ? " is-drag" : ""}${t.column === "done" ? " is-done" : ""}`}
                      aria-label={`BB-${t.num}, ${t.title}. ${colName(t.column)}${t.pri ? `, ${priName(t.pri)} priority` : ""}${t.owner ? `, ${t.owner}` : ""}${t.due ? `, due ${dueText(t.due)}` : ""}. Press Enter to rename.`}
                      draggable={editing !== t.id}
                      onDragStart={(e) => {
                        e.dataTransfer.effectAllowed = "move";
                        e.dataTransfer.setData("text/plain", t.id);
                        setDragId(t.id);
                      }}
                      onDragEnd={() => {
                        setDragId(null);
                        setDrop(null);
                      }}
                      onDragOver={(e) => onDragOverCard(e, col.id, t)}
                      onKeyDown={(e) => onCardKey(e, t)}
                    >
                      <div className="tb-card__row">
                        <button type="button" className="tb-status" aria-label={`Status ${colName(t.column)}. Move to ${colName(t.column === "done" ? "todo" : step(t.column, 1))}`} onClick={() => setStatus(t, t.column === "done" ? "todo" : step(t.column, 1), false)}>
                          <StatusIcon column={t.column} />
                        </button>
                        {editing === t.id ? (
                          <input
                            autoFocus
                            className="tb-edit"
                            defaultValue={t.title}
                            aria-label="Task title"
                            maxLength={120}
                            onFocus={(e) => e.currentTarget.select()}
                            onKeyDown={(e) => {
                              if (e.key === "Escape") {
                                setEditing(null);
                                setFocusId(t.id);
                              }
                              if (e.key === "Enter") e.currentTarget.blur();
                            }}
                            onBlur={(e) => {
                              const v = e.currentTarget.value.trim();
                              if (v) update(t.id, { title: v });
                              setEditing(null);
                              setFocusId(t.id);
                            }}
                          />
                        ) : (
                          <p className="tb-card__title" onDoubleClick={() => setEditing(t.id)}>
                            {t.title}
                          </p>
                        )}
                        <button type="button" className="tb-pri" aria-label={`Priority ${priName(t.pri)}. Change priority`} title={`${priName(t.pri)} (P to change)`} onClick={() => update(t.id, { pri: nextPri(t.pri) })}>
                          <PriIcon pri={t.pri} />
                        </button>
                      </div>

                      <div className="tb-card__chips">
                        {next?.id === t.id && t.column === "todo" ? <span className="tb-next">Next</span> : null}
                        <span className="tb-id">BB-{t.num}</span>
                        <button
                          type="button"
                          className="tb-meta"
                          aria-label={`Label ${t.label}. Change label`}
                          onClick={() => update(t.id, { label: LABELS[(LABELS.findIndex((l) => l.name === t.label) + 1) % LABELS.length]!.name })}
                        >
                          <i style={{ background: labelColor(t.label) }} />
                          {t.label}
                        </button>
                        {t.due ? (
                          <button type="button" className={`tb-meta tb-meta--date${isLate(t) ? " is-late" : ""}`} aria-expanded={picking === t.id} onClick={() => setPicking(picking === t.id ? null : t.id)}>
                            {dueText(t.due)}
                          </button>
                        ) : null}
                        {t.owner === "Andrew" ? <span className="tb-you">You</span> : null}
                        <span className="tb-acts">
                          <button
                            type="button"
                            className="tb-mini tb-mini--txt"
                            aria-label={`Owner: ${t.owner ?? "nobody"}. Change owner`}
                            title={`Owner: ${t.owner ?? "nobody"}`}
                            onClick={() => {
                              const i = t.owner ? OWNERS.indexOf(t.owner as (typeof OWNERS)[number]) : -1;
                              update(t.id, { owner: i + 1 >= OWNERS.length ? undefined : OWNERS[i + 1] });
                            }}
                          >
                            {t.owner ? t.owner[0] : "?"}
                          </button>
                          {t.due ? null : (
                            <button type="button" className="tb-mini" aria-label={`Set a due date for ${t.title}`} aria-expanded={picking === t.id} onClick={() => setPicking(picking === t.id ? null : t.id)}>
                              <svg viewBox="0 0 24 24" width="14" height="14" aria-hidden>
                                <rect x="4" y="5.5" width="16" height="14" rx="3" fill="none" stroke="currentColor" strokeWidth="2" />
                                <path d="M4 10h16M9 3.5v4M15 3.5v4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                              </svg>
                            </button>
                          )}
                          <button type="button" className="tb-mini" disabled={t.column === "todo"} aria-label={`Move ${t.title} left`} onClick={() => setStatus(t, step(t.column, -1), false)}>
                            <Chevron dir="l" />
                          </button>
                          <button type="button" className="tb-mini" disabled={t.column === "done"} aria-label={`Move ${t.title} right`} onClick={() => setStatus(t, step(t.column, 1), false)}>
                            <Chevron dir="r" />
                          </button>
                          <button type="button" className="tb-mini" aria-label={`Delete ${t.title}`} onClick={() => { setTasks((all) => all.filter((x) => x.id !== t.id)); setSaid(`Removed ${t.title}`); }}>
                            <svg viewBox="0 0 24 24" width="14" height="14" aria-hidden>
                              <path d="M6 6l12 12M18 6 6 18" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
                            </svg>
                          </button>
                        </span>
                      </div>

                      {picking === t.id ? (
                        <div className="tb-pop">
                          <Suspense fallback={<p className="tb-muted">Loading calendar...</p>}>
                            <Calendar
                              mode="single"
                              label={`Due date for ${t.title}`}
                              selected={t.due ? fromKey(t.due) : null}
                              onSelect={(d) => {
                                update(t.id, { due: d ? toKey(d) : null });
                                setPicking(null);
                                setFocusId(t.id);
                              }}
                            />
                          </Suspense>
                        </div>
                      ) : null}
                    </article>
                  </li>
                ))}
                {dropHere && drop!.before === null ? Line : null}
                {col.id === "done" && doneOpen && !filtering && items.length > 3 ? (
                  <li className="tb-li">
                    <button type="button" className="tb-more" onClick={() => setDoneOpen(false)}>
                      Show fewer
                    </button>
                  </li>
                ) : null}
                {items.length === 0 && !dropHere ? <li className="tb-empty">{q || labelFilter ? "No matches." : "Nothing here."}</li> : null}
              </ul>
            </div>
          );
        })}
      </div>

      <footer className="tb-foot">
        <span>{hidden > 0 ? `${hidden} hidden by filters. ` : ""}Saved on this device only.</span>
        <span className="tb-keys">Up/Down pick a card. Shift + Left/Right moves it. 1 2 3 sets status. P sets priority. C adds. Enter renames. D sets a date.</span>
      </footer>
      <p className="tb-sr" role="status" aria-live="polite">
        {said}
      </p>
    </section>
  );
}

/** The board, plus a Projects view for the gauntlet loops. The card on the admin home stays the board alone. */
export default function TaskBoard({ embedded = false, onDueDates }: { embedded?: boolean; onDueDates?: (dates: Date[]) => void }) {
  const [view, setView] = useState<"board" | "projects">("board");
  if (embedded) return <TaskBoardCards embedded onDueDates={onDueDates} />;
  return (
    <div className="tb-views">
      <div className="tb-viewtabs" role="group" aria-label="Task views">
        <button type="button" className="tb-tab" aria-pressed={view === "board"} onClick={() => setView("board")}>
          Board
        </button>
        <button type="button" className="tb-tab" aria-pressed={view === "projects"} onClick={() => setView("projects")}>
          Projects
        </button>
      </div>
      {view === "board" ? <TaskBoardCards onDueDates={onDueDates} /> : <TaskProjects />}
    </div>
  );
}
