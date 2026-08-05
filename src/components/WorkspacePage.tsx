import { useCallback, useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  ArrowLeft,
  LogOut,
  Plus,
  RefreshCw,
  Smile,
  Frown,
  Minus,
  Trash2,
  GripVertical,
} from "lucide-react";
import { BlueberryMark } from "@/components/ui/blueberry-mark";
import { NotificationBell } from "@/components/ui/notification-bell";
import { AdminPanel } from "@/components/AdminPanel";
import { ButtonHoldAndRelease } from "@/components/ui/hold-and-release-button";
import { postToAppsScript } from "@/lib/appsScript";
import { useGoogleAuth, type GoogleUser } from "@/lib/useGoogleAuth";
import {
  fetchWorkspace,
  sentimentOf,
  timeAgo,
  loadSeen,
  saveSeen,
  TODO_COLUMNS,
  type FeedbackNote,
  type Sentiment,
  type Todo,
  type TodoColumn,
  type AdminEntry,
} from "@/lib/workspace";
import { cn } from "@/lib/utils";

/**
 * The staff workspace, behind the sign-in.
 *
 * Two things live here: the feedback that has come in, labelled good or bad from
 * the words in it, and a board of things to build. Both are read with the ID
 * token over POST, and every write is re-checked against the allowlist on the
 * server, so nothing on this page is trusted to be true just because it rendered.
 */

const SENTIMENT: Record<Sentiment, { icon: typeof Smile; label: string; chip: string }> = {
  good: {
    icon: Smile,
    label: "Positive",
    chip: "bg-emerald-100 text-emerald-700 dark:bg-emerald-400/15 dark:text-emerald-300",
  },
  bad: {
    icon: Frown,
    label: "Needs attention",
    chip: "bg-red-100 text-red-700 dark:bg-red-400/15 dark:text-red-300",
  },
  neutral: {
    icon: Minus,
    label: "Neutral",
    chip: "bg-slate-100 text-slate-600 dark:bg-white/10 dark:text-stone-300",
  },
};

export function WorkspacePage({ user }: { user: GoogleUser }) {
  const { signOut } = useGoogleAuth();
  const [feedback, setFeedback] = useState<FeedbackNote[]>([]);
  const [todos, setTodos] = useState<Todo[]>([]);
  const [admins, setAdmins] = useState<AdminEntry[]>([]);
  const [owners, setOwners] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const [seen, setSeen] = useState<Set<string>>(loadSeen);
  const [draft, setDraft] = useState("");
  const [draftColumn, setDraftColumn] = useState<TodoColumn>("idea");
  const [dragging, setDragging] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    const res = await fetchWorkspace(user.idToken);
    setLoading(false);
    if (res.ok) {
      setFeedback(res.data.feedback);
      setTodos(res.data.todos);
      setAdmins(res.data.admins);
      setOwners(res.data.owners);
      setError("");
    } else {
      setError(res.error);
    }
  }, [user.idToken]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const unread = useMemo(() => feedback.filter((f) => !seen.has(f.id)), [feedback, seen]);

  const markAllSeen = useCallback(() => {
    const ids = feedback.map((f) => f.id);
    setSeen(new Set(ids));
    saveSeen(ids);
  }, [feedback]);

  const tally = useMemo(() => {
    const counts = { good: 0, bad: 0, neutral: 0 };
    for (const note of feedback) counts[sentimentOf(note)]++;
    return counts;
  }, [feedback]);

  const write = async (
    key: string,
    type: "addTodo" | "updateTodo" | "deleteTodo",
    payload: Record<string, unknown>,
    optimistic: () => void,
  ) => {
    setBusy(key);
    setError("");
    optimistic();
    const body = await postToAppsScript(type, { idToken: user.idToken, ...payload });
    setBusy(null);
    if (!body.ok) {
      setError(
        body.error === "unreachable"
          ? "Could not reach the workspace endpoint."
          : (body.error ?? "The server refused that."),
      );
      // The board is showing something the sheet does not agree with, so the
      // sheet wins rather than leaving a card that looks moved and is not.
      void refresh();
    }
  };

  const addTodo = async () => {
    const title = draft.trim();
    if (!title) return;
    setDraft("");
    // A placeholder id until the server hands back a real one. The refresh at
    // the end replaces it, so nothing is ever written against this id.
    const tempId = `pending-${Date.now()}`;
    await write(
      "add",
      "addTodo",
      { title, column: draftColumn },
      () =>
        setTodos((t) => [
          ...t,
          { id: tempId, title, column: draftColumn, note: "", email: user.email, at: new Date().toISOString() },
        ]),
    );
    void refresh();
  };

  const moveTodo = (id: string, column: TodoColumn) => {
    const current = todos.find((t) => t.id === id);
    if (!current || current.column === column) return;
    void write("move-" + id, "updateTodo", { id, column }, () =>
      setTodos((t) => t.map((x) => (x.id === id ? { ...x, column } : x))),
    );
  };

  return (
    <main className="min-h-screen bg-[#faf9ff] px-6 py-8 dark:bg-[#171327]">
      <div className="mx-auto max-w-6xl">
        <header className="mb-8 flex flex-wrap items-center gap-4">
          <a
            href="#/home"
            className="group inline-flex items-center gap-1.5 text-sm font-semibold text-slate-500 transition-colors hover:text-slate-900 dark:text-stone-400 dark:hover:text-stone-100"
          >
            <ArrowLeft className="h-3.5 w-3.5 transition-transform duration-300 group-hover:-translate-x-0.5" />
            Back to site
          </a>

          <div className="ml-auto flex items-center gap-2">
            <button
              onClick={() => void refresh()}
              disabled={loading}
              className="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-900 disabled:opacity-50 dark:text-stone-400 dark:hover:bg-white/10 dark:hover:text-stone-100"
            >
              <RefreshCw className={cn("h-3.5 w-3.5", loading && "animate-spin")} />
              {loading ? "Loading…" : "Refresh"}
            </button>

            <NotificationBell count={unread.length} label="Feedback" onOpen={markAllSeen}>
              {feedback.length === 0 ? (
                <p className="p-4 text-center text-sm text-slate-500 dark:text-stone-400">
                  {loading ? "Loading feedback…" : "No feedback yet."}
                </p>
              ) : (
                <ul className="divide-y divide-slate-100 dark:divide-stone-800">
                  {feedback.map((note) => {
                    const mood = sentimentOf(note);
                    const Icon = SENTIMENT[mood].icon;
                    return (
                      <li
                        key={note.id}
                        className={cn(
                          "p-3",
                          !seen.has(note.id) && "bg-indigo-50/60 dark:bg-indigo-400/5",
                        )}
                      >
                        <div className="mb-1 flex items-center justify-between gap-2">
                          <span
                            className={cn(
                              "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[0.65rem] font-bold",
                              SENTIMENT[mood].chip,
                            )}
                          >
                            <Icon className="h-3 w-3" />
                            {SENTIMENT[mood].label}
                          </span>
                          <span className="font-mono text-[0.65rem] text-slate-400 dark:text-stone-500">
                            {timeAgo(note.at)}
                          </span>
                        </div>
                        <p className="text-xs leading-relaxed text-slate-600 dark:text-stone-300">
                          {note.comment || <em className="opacity-60">Rating only</em>}
                        </p>
                        {note.rating && (
                          <p className="mt-1 font-mono text-[0.65rem] text-slate-400 dark:text-stone-500">
                            rating: {note.rating}
                          </p>
                        )}
                      </li>
                    );
                  })}
                </ul>
              )}
            </NotificationBell>

            <span className="hidden font-mono text-xs text-slate-500 sm:inline dark:text-stone-400">
              {user.email}
            </span>
            <button
              onClick={signOut}
              className="inline-flex items-center gap-1 rounded-full px-2.5 py-1.5 text-xs font-semibold text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-900 dark:text-stone-400 dark:hover:bg-white/10 dark:hover:text-stone-100"
            >
              <LogOut className="h-3 w-3" />
              Sign out
            </button>
          </div>
        </header>

        <div className="mb-8 flex flex-wrap items-end gap-4">
          <BlueberryMark className="h-10 w-10" />
          <div>
            <h1 className="title-face text-3xl text-slate-900 dark:text-stone-100">Workspace</h1>
            <p className="mt-1 text-sm text-slate-500 dark:text-stone-400">
              {feedback.length} pieces of feedback &middot; {tally.good} positive, {tally.bad} needing
              attention &middot; {todos.length} tasks
            </p>
          </div>
        </div>

        {error && (
          <p className="mb-6 flex items-center gap-2 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700 dark:bg-red-500/10 dark:text-red-300">
            <AlertTriangle className="h-4 w-4 shrink-0" />
            {error}
          </p>
        )}

        <form
          onSubmit={(e) => {
            e.preventDefault();
            void addTodo();
          }}
          className="mb-8 flex flex-wrap items-center gap-2 rounded-xl border border-slate-200 bg-white p-3 dark:border-stone-800 dark:bg-stone-900"
        >
          <Plus className="h-4 w-4 shrink-0 text-slate-400 dark:text-stone-500" />
          <input
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder="Something that would improve how people learn here…"
            maxLength={200}
            className="min-w-0 flex-1 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm text-slate-800 outline-none focus-visible:border-indigo-400 focus-visible:ring-2 focus-visible:ring-indigo-400/40 dark:border-stone-700 dark:bg-stone-900 dark:text-stone-200"
          />
          <select
            value={draftColumn}
            onChange={(e) => setDraftColumn(e.target.value as TodoColumn)}
            className="rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-xs text-slate-600 dark:border-stone-700 dark:bg-stone-900 dark:text-stone-300"
          >
            {TODO_COLUMNS.map((c) => (
              <option key={c.id} value={c.id}>
                {c.label}
              </option>
            ))}
          </select>
          <button
            type="submit"
            disabled={busy === "add" || draft.trim() === ""}
            className="rounded-lg bg-indigo-600 px-3 py-1.5 text-sm font-bold text-white transition hover:bg-indigo-500 disabled:opacity-50"
          >
            Add
          </button>
        </form>

        {/* Four columns on a wide screen, stacked on a narrow one. Drag moves a
            card, and so do the arrows on it: a drag has no keyboard equivalent,
            and a board you can only use with a mouse is a board half the time. */}
        <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
          {TODO_COLUMNS.map((col) => {
            const inColumn = todos.filter((t) => t.column === col.id);
            return (
              <section
                key={col.id}
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => {
                  e.preventDefault();
                  if (dragging) moveTodo(dragging, col.id);
                  setDragging(null);
                }}
                className="flex min-h-[12rem] flex-col rounded-xl border border-slate-200 bg-white/70 p-3 dark:border-stone-800 dark:bg-stone-900/60"
              >
                <div className="mb-3">
                  <h2 className="flex items-center gap-2 text-sm font-bold text-slate-800 dark:text-stone-100">
                    {col.label}
                    <span className="font-mono text-xs font-normal text-slate-400 dark:text-stone-500">
                      {inColumn.length}
                    </span>
                  </h2>
                  <p className="mt-0.5 text-[0.7rem] text-slate-400 dark:text-stone-500">
                    {col.blurb}
                  </p>
                </div>

                <ul className="flex flex-1 flex-col gap-2">
                  {inColumn.map((todo) => {
                    const idx = TODO_COLUMNS.findIndex((c) => c.id === todo.column);
                    return (
                      <li
                        key={todo.id}
                        draggable
                        onDragStart={() => setDragging(todo.id)}
                        onDragEnd={() => setDragging(null)}
                        className={cn(
                          "group/card rounded-lg border border-slate-200 bg-white p-2.5 shadow-sm transition dark:border-stone-700 dark:bg-stone-800",
                          dragging === todo.id && "opacity-40",
                        )}
                      >
                        <div className="flex items-start gap-2">
                          <GripVertical className="mt-0.5 h-3.5 w-3.5 shrink-0 cursor-grab text-slate-300 dark:text-stone-600" />
                          <p className="min-w-0 flex-1 text-sm leading-snug text-slate-700 dark:text-stone-200">
                            {todo.title}
                          </p>
                        </div>

                        <div className="mt-2 flex items-center gap-1 pl-5">
                          <button
                            onClick={() => moveTodo(todo.id, TODO_COLUMNS[idx - 1]!.id)}
                            disabled={idx === 0}
                            aria-label="Move left"
                            className="rounded px-1.5 py-0.5 text-xs text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 disabled:opacity-30 dark:hover:bg-white/10 dark:hover:text-stone-200"
                          >
                            &larr;
                          </button>
                          <button
                            onClick={() => moveTodo(todo.id, TODO_COLUMNS[idx + 1]!.id)}
                            disabled={idx === TODO_COLUMNS.length - 1}
                            aria-label="Move right"
                            className="rounded px-1.5 py-0.5 text-xs text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 disabled:opacity-30 dark:hover:bg-white/10 dark:hover:text-stone-200"
                          >
                            &rarr;
                          </button>

                          <ButtonHoldAndRelease
                            onConfirm={() =>
                              void write("del-" + todo.id, "deleteTodo", { id: todo.id }, () =>
                                setTodos((t) => t.filter((x) => x.id !== todo.id)),
                              )
                            }
                            holdDuration={1200}
                            label=""
                            holdingLabel="Hold…"
                            className="ml-auto h-6 min-w-0 px-1.5 text-[0.65rem] opacity-0 transition-opacity group-hover/card:opacity-100 focus-within:opacity-100"
                          />
                        </div>
                      </li>
                    );
                  })}

                  {inColumn.length === 0 && (
                    <li className="rounded-lg border border-dashed border-slate-200 px-3 py-6 text-center text-xs text-slate-400 dark:border-stone-700 dark:text-stone-500">
                      Drop a card here
                    </li>
                  )}
                </ul>
              </section>
            );
          })}
        </div>

        <AdminPanel
          admins={admins}
          owners={owners}
          you={user.email}
          idToken={user.idToken}
          onChanged={() => void refresh()}
        />

        <p className="mt-8 flex items-center gap-2 text-xs text-slate-400 dark:text-stone-500">
          <Trash2 className="h-3 w-3" />
          Hold the bin on a card to delete it. Feedback is read-only here; it comes from the widget
          on the study pages.
        </p>
      </div>
    </main>
  );
}

export default WorkspacePage;
