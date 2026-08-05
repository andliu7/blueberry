import { postToAppsScript } from "@/lib/appsScript";

/**
 * The staff workspace's data: feedback that has come in, and the todo board.
 *
 * Everything here is read over POST rather than GET, because it needs the ID
 * token and a GET would have to carry that in the query string, where it lands
 * in history, proxy logs and the Referer header of the next request.
 */

export interface FeedbackNote {
  id: string;
  at: string;
  rating: string;
  comment: string;
}

export type TodoColumn = "idea" | "todo" | "doing" | "done";

export const TODO_COLUMNS: { id: TodoColumn; label: string; blurb: string }[] = [
  { id: "idea", label: "Ideas", blurb: "Things that might help people learn" },
  { id: "todo", label: "To do", blurb: "Agreed, not started" },
  { id: "doing", label: "In progress", blurb: "Being built now" },
  { id: "done", label: "Done", blurb: "Shipped" },
];

export interface Todo {
  id: string;
  title: string;
  column: TodoColumn;
  note: string;
  email: string;
  at: string;
}

export type Sentiment = "good" | "bad" | "neutral";

/**
 * Labels a comment good, bad or neutral from the words in it.
 *
 * Deliberately keyword matching rather than anything cleverer. The alternative
 * is sending student feedback to a third-party API to be scored, which means
 * handing someone else's words to someone else, and this list can be corrected
 * in a second when it gets one wrong.
 *
 * It runs on the client rather than in Apps Script so that changing the lists
 * is a deploy of the site rather than a paste-and-redeploy of the script.
 *
 * Negations are checked before the word lists: "not helpful" and "helpful" only
 * differ by a word, and a bare keyword count reads them the same way.
 */
const GOOD_WORDS = [
  "love", "loved", "great", "amazing", "awesome", "perfect", "helpful", "helped",
  "thank", "thanks", "useful", "clear", "easy", "nice", "good", "best", "excellent",
  "saved", "lifesaver", "brilliant", "fantastic", "clutch", "goated", "fire",
];

const BAD_WORDS = [
  "bug", "broken", "broke", "error", "crash", "wrong", "confusing", "confused",
  "hard", "difficult", "slow", "bad", "hate", "annoying", "typo", "missing",
  "incorrect", "unclear", "doesn't work", "does not work", "not working", "fix",
  "problem", "issue", "fail", "failed", "stuck", "cant", "can't",
];

const NEGATORS = ["not", "isn't", "isnt", "wasn't", "wasnt", "no", "never", "barely", "hardly"];

function scoreWords(text: string, words: string[]): number {
  let hits = 0;
  for (const word of words) {
    // Word boundaries, so "fix" does not fire on "prefix" and "bad" does not
    // fire on "badge".
    const re = new RegExp(`(^|[^a-z])${word.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}([^a-z]|$)`, "gi");
    const found = text.match(re);
    if (!found) continue;
    // A negated positive counts against rather than for. Looking only at the
    // words immediately before the hit, since "not" three clauses earlier is
    // not modifying this one.
    for (const match of found) {
      const at = text.toLowerCase().indexOf(match.toLowerCase().trim());
      const before = text.slice(Math.max(0, at - 18), at).toLowerCase();
      hits += NEGATORS.some((n) => new RegExp(`(^|[^a-z])${n}([^a-z]|$)`).test(before)) ? -1 : 1;
    }
  }
  return hits;
}

export function sentimentOf(note: FeedbackNote): Sentiment {
  // An explicit rating beats anything guessed from prose, since it is the one
  // signal the person actually chose rather than one inferred from their words.
  const rating = Number(note.rating);
  if (Number.isFinite(rating) && note.rating.trim() !== "") {
    if (rating >= 4) return "good";
    if (rating > 0 && rating <= 2) return "bad";
  }
  const text = note.comment;
  if (!text.trim()) return "neutral";

  const good = scoreWords(text, GOOD_WORDS);
  const bad = scoreWords(text, BAD_WORDS);
  if (good > bad) return "good";
  if (bad > good) return "bad";
  return "neutral";
}

export interface AdminEntry {
  email: string;
  addedBy: string;
  at: string;
}

export interface WorkspaceData {
  feedback: FeedbackNote[];
  todos: Todo[];
  /**
   * Invited admins, who can be removed from the workspace.
   *
   * Kept apart from `owners` because the difference is the whole safety story:
   * owners live in the script and cannot be removed through a web page, so no
   * sequence of clicks here can end in nobody having access.
   */
  admins: AdminEntry[];
  owners: string[];
}

export async function fetchWorkspace(idToken: string): Promise<
  { ok: true; data: WorkspaceData } | { ok: false; error: string }
> {
  const body = await postToAppsScript("workspace", { idToken });
  if (!body.ok) {
    return {
      ok: false,
      error:
        body.error === "unreachable"
          ? "Could not reach the workspace endpoint."
          : (body.error ?? "The server refused that."),
    };
  }
  const feedback = Array.isArray(body.feedback) ? (body.feedback as FeedbackNote[]) : [];
  const rawTodos = Array.isArray(body.todos) ? (body.todos as Todo[]) : [];
  const valid = new Set(TODO_COLUMNS.map((c) => c.id));
  return {
    ok: true,
    data: {
      feedback,
      admins: Array.isArray(body.admins) ? (body.admins as AdminEntry[]) : [],
      owners: Array.isArray(body.owners)
        ? (body.owners as unknown[]).filter((o): o is string => typeof o === "string")
        : [],
      // A task in a column that no longer exists would render nowhere at all, so
      // it comes back to the first one rather than silently vanishing.
      todos: rawTodos.map((t) => ({ ...t, column: valid.has(t.column) ? t.column : "idea" })),
    },
  };
}

/** How long ago, in the shape a notification list wants. */
export function timeAgo(iso: string): string {
  const then = Date.parse(iso);
  if (!Number.isFinite(then)) return "";
  const mins = Math.floor((Date.now() - then) / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return days < 30 ? `${days}d ago` : new Date(then).toLocaleDateString();
}

/** Feedback ids already seen, so the bell can show a count that means something. */
const SEEN_KEY = "blueberry_seen_feedback";

export function loadSeen(): Set<string> {
  try {
    const raw = localStorage.getItem(SEEN_KEY);
    return new Set(raw ? (JSON.parse(raw) as string[]) : []);
  } catch {
    return new Set();
  }
}

export function saveSeen(ids: Iterable<string>) {
  try {
    localStorage.setItem(SEEN_KEY, JSON.stringify([...ids]));
  } catch {
    /* ignore */
  }
}
