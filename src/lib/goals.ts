/**
 * What the visitor said they were here to do, before they had an account.
 *
 * This is the first thing the funnel asks for and the first thing it stores,
 * and the order matters: goals are captured *before* sign-in, not after. By the
 * time an account is offered there is already something on this machine worth
 * keeping, and "sign in to save your goals" is a different sentence from "sign
 * in to get started".
 *
 * `localStorage` on purpose. There is no user yet, so there is nowhere on the
 * server to put it; when an account does arrive, this is what gets uploaded and
 * what makes the new account arrive already furnished rather than empty.
 */

const KEY = "blueberry_goals_v1";

export interface Goals {
  /** Free text, because a course code the site has never heard of is still an answer. */
  course: string;
  /** ISO `yyyy-mm-dd`, or null when they would rather not say. */
  examOn: string | null;
  /** Ids from `data/topics`. */
  topicIds: string[];
  /** When they were set, so a stale set can be offered for review later. */
  setAt: number;
}

export function readGoals(): Goals | null {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<Goals>;
    // Shape-checked rather than trusted. This is user-writable storage and a
    // half-written object here would break the page that reads it, not the page
    // that wrote it, which is the worst kind of bug to chase.
    if (typeof parsed.course !== "string" || !Array.isArray(parsed.topicIds)) return null;
    return {
      course: parsed.course,
      examOn: typeof parsed.examOn === "string" ? parsed.examOn : null,
      topicIds: parsed.topicIds.filter((id): id is string => typeof id === "string"),
      setAt: typeof parsed.setAt === "number" ? parsed.setAt : Date.now(),
    };
  } catch {
    return null;
  }
}

export function writeGoals(goals: Omit<Goals, "setAt">): void {
  try {
    localStorage.setItem(KEY, JSON.stringify({ ...goals, setAt: Date.now() }));
  } catch {
    // Private browsing, a full quota, or a blocked origin. Losing the goals is
    // survivable; taking the page down on the way to the first lesson is not.
  }
}

export const hasGoals = () => readGoals() !== null;

/**
 * Days until the exam, or null when there is no date.
 *
 * Rounded up, so the day of the exam reads as 1 rather than 0. This number is
 * shown back to the visitor, and a countdown that hits zero while the exam is
 * still ahead of them is worse than no countdown.
 */
export function daysUntil(iso: string | null): number | null {
  if (!iso) return null;
  const then = new Date(`${iso}T00:00:00`).getTime();
  if (Number.isNaN(then)) return null;
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  return Math.max(0, Math.ceil((then - today) / 86_400_000));
}
