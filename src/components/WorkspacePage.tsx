import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import {
  AlertTriangle,
  ArrowLeft,
  LogOut,
  Plus,
  RefreshCw,
  Trash2,
  GripVertical,
  Check,
  X,
  ChevronDown,
} from "lucide-react";
import { BlueberryMark } from "@/components/ui/blueberry-mark";
import { NotificationBell } from "@/components/ui/notification-bell";
import { AdminPanel } from "@/components/AdminPanel";
import { WorkspaceActivity } from "@/components/WorkspaceActivity";
import { ScrollProgress } from "@/components/ui/scroll-progress";
import { FeedbackInbox } from "@/components/FeedbackInbox";
import { ButtonHoldAndRelease } from "@/components/ui/hold-and-release-button";
import { postToAppsScript } from "@/lib/appsScript";
import { useGoogleAuth, type GoogleUser } from "@/lib/useGoogleAuth";
import {
  fetchWorkspace,
  sentimentOf,
  loadSeen,
  saveSeen,
  TODO_COLUMNS,
  type FeedbackNote,
  type Todo,
  type TodoColumn,
  type AdminEntry,
  type FeedbackStateEntry,
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


/**
 * One card on the board: clamped to three lines, expandable, and editable.
 *
 * The clamp is a real line count rather than a character budget, because these
 * are whatever someone typed into the feedback widget and one of them is a
 * paragraph about subscription pricing. `line-clamp-3` does the clamping and the
 * toggle only appears when the text is genuinely taller than the clamp, measured
 * against the element rather than guessed from its length. Re-measured on resize
 * and whenever the text changes, since a card that fits in a four-column layout
 * wraps to five lines when the board stacks on a phone.
 *
 * Editing turns the paragraph into a textarea in place. Two things that are not
 * obvious:
 *
 * `draggable` goes off while editing. The card is a drag handle for the whole
 * board, and a draggable ancestor swallows the mousedown that would otherwise
 * put a cursor in the text, so selecting a word to fix a typo starts dragging
 * the card to another column instead.
 *
 * Escape cancels and Enter saves, with Shift+Enter for a newline. Blur saves
 * too, because the alternative is losing an edit by clicking away, and the
 * server takes the same `updateTodo` route the arrows already use — the sheet
 * has accepted a `title` on that route all along, so none of this needed a
 * backend change.
 */
function TodoCard({
  todo,
  onSave,
  onEditingChange,
  children,
}: {
  todo: Todo;
  onSave: (title: string) => void;
  /**
   * Lets the board suspend `draggable` on this card.
   *
   * The `<li>` is a drag handle for the whole board, and a draggable ancestor
   * swallows the mousedown that would put a caret in the textarea, so selecting
   * a word to fix a typo starts dragging the card to another column instead.
   */
  onEditingChange?: (editing: boolean) => void;
  children: React.ReactNode;
}) {
  const [expanded, setExpanded] = useState(false);
  const [editing, setEditing] = useState(false);
  const [text, setText] = useState(todo.title);
  const [clamped, setClamped] = useState(false);
  const bodyRef = useRef<HTMLParagraphElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useLayoutEffect(() => {
    const el = bodyRef.current;
    if (!el) return;
    const measure = () => setClamped(el.scrollHeight > el.clientHeight + 1);
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, [todo.title, expanded]);

  const begin = () => {
    setText(todo.title);
    setEditing(true);
    onEditingChange?.(true);
    // Focus after the textarea exists, with the caret at the end rather than
    // selecting everything, so a small correction does not risk replacing it all.
    requestAnimationFrame(() => {
      const el = inputRef.current;
      if (!el) return;
      el.focus();
      el.setSelectionRange(el.value.length, el.value.length);
    });
  };

  const commit = () => {
    const next = text.trim();
    setEditing(false);
    onEditingChange?.(false);
    if (!next || next === todo.title) return;
    onSave(next);
  };

  const cancel = () => {
    setEditing(false);
    onEditingChange?.(false);
  };

  return (
    <>
      {editing ? (
        <div className="flex items-start gap-2">
          <textarea
            ref={inputRef}
            value={text}
            rows={4}
            onChange={(e) => setText(e.target.value)}
            onBlur={commit}
            onKeyDown={(e) => {
              if (e.key === "Escape") {
                e.preventDefault();
                cancel();
              } else if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                commit();
              }
            }}
            className="min-w-0 flex-1 resize-y rounded-md border border-indigo-300 bg-white px-2 py-1 text-sm leading-snug text-slate-700 outline-none focus:border-indigo-500 dark:border-indigo-500/60 dark:bg-stone-900 dark:text-stone-200"
          />
          <div className="flex shrink-0 flex-col gap-1">
            {/* Mousedown rather than click: blur fires first on a click and
                would have already committed or cancelled by the time it lands. */}
            <button
              onMouseDown={(e) => {
                e.preventDefault();
                commit();
              }}
              aria-label="Save"
              className="rounded p-1 text-slate-400 transition hover:bg-slate-100 hover:text-green-600 dark:hover:bg-white/10"
            >
              <Check className="h-3.5 w-3.5" />
            </button>
            <button
              onMouseDown={(e) => {
                e.preventDefault();
                cancel();
              }}
              aria-label="Cancel"
              className="rounded p-1 text-slate-400 transition hover:bg-slate-100 hover:text-red-600 dark:hover:bg-white/10"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      ) : (
        <>
          <div className="flex items-start gap-2">
            <GripVertical className="mt-0.5 h-3.5 w-3.5 shrink-0 cursor-grab text-slate-300 dark:text-stone-600" />
            <p
              ref={bodyRef}
              onDoubleClick={begin}
              title="Double-click to edit"
              className={cn(
                "min-w-0 flex-1 cursor-text text-sm leading-snug whitespace-pre-wrap text-slate-700 dark:text-stone-200",
                !expanded && "line-clamp-3",
              )}
            >
              {todo.title}
            </p>
          </div>

          {(clamped || expanded) && (
            <button
              onClick={() => setExpanded((o) => !o)}
              className="mt-1 ml-5 text-[0.7rem] font-semibold text-slate-400 transition-colors hover:text-slate-600 dark:text-stone-500 dark:hover:text-stone-300"
            >
              {expanded ? "Show less" : "Show more"}
            </button>
          )}
        </>
      )}

      <div className="mt-2 flex items-center gap-1 pl-5">
        {!editing && (
          <button
            onClick={begin}
            aria-label="Edit"
            className="rounded px-1.5 py-0.5 text-xs text-slate-400 opacity-0 transition hover:bg-slate-100 hover:text-slate-700 group-hover/card:opacity-100 focus-visible:opacity-100 dark:hover:bg-white/10 dark:hover:text-stone-200"
          >
            Edit
          </button>
        )}
        {children}
      </div>
    </>
  );
}

export function WorkspacePage({ user }: { user: GoogleUser }) {
  const { signOut } = useGoogleAuth();
  const [feedback, setFeedback] = useState<FeedbackNote[]>([]);
  const [todos, setTodos] = useState<Todo[]>([]);
  const [admins, setAdmins] = useState<AdminEntry[]>([]);
  const [owners, setOwners] = useState<string[]>([]);
  const [fbState, setFbState] = useState<Record<string, FeedbackStateEntry>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const [seen, setSeen] = useState<Set<string>>(loadSeen);
  const [draft, setDraft] = useState("");
  const [draftColumn, setDraftColumn] = useState<TodoColumn>("idea");
  const [dragging, setDragging] = useState<string | null>(null);
  /** Which card is mid-edit, so its `<li>` can stop being a drag handle. */
  const [editingId, setEditingId] = useState<string | null>(null);
  const [adminOpen, setAdminOpen] = useState(false);
  /**
   * One scroll container per column, so each gets its own progress bar.
   *
   * Held in a ref object rather than state: `useScroll` wants a ref, and
   * putting the element in state would re-render the whole board on mount.
   */
  const listRefs = useRef<Record<string, { current: HTMLElement | null }>>(
    Object.fromEntries(TODO_COLUMNS.map((c) => [c.id, { current: null }])),
  );

  const refresh = useCallback(async () => {
    setLoading(true);
    const res = await fetchWorkspace(user.idToken);
    setLoading(false);
    if (res.ok) {
      setFeedback(res.data.feedback);
      setTodos(res.data.todos);
      setAdmins(res.data.admins);
      setOwners(res.data.owners);
      setFbState(res.data.feedbackState);
      setError("");
    } else {
      setError(res.error);
    }
  }, [user.idToken]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const unread = useMemo(
    () => feedback.filter((f) => !seen.has(f.id) && (fbState[f.id]?.state ?? "new") === "new"),
    [feedback, seen, fbState],
  );

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

  /** Same `updateTodo` route the arrows use; the sheet has always taken a title. */
  const editTodo = (id: string, title: string) => {
    void write("edit-" + id, "updateTodo", { id, title }, () =>
      setTodos((t) => t.map((x) => (x.id === id ? { ...x, title } : x))),
    );
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
          {/* The mark sits in the corner here as it does everywhere else,
              rather than inline beside the page heading below. */}
          <a
            href="#/home"
            className="group inline-flex items-center gap-2 text-sm font-semibold text-slate-500 transition-colors hover:text-slate-900 dark:text-stone-400 dark:hover:text-stone-100"
          >
            <BlueberryMark eyes className="blueberry-glow-art h-12 w-12 shrink-0 transition-[filter] duration-300" />
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
              <FeedbackInbox
                feedback={feedback}
                state={fbState}
                loading={loading}
                idToken={user.idToken}
                onChanged={() => void refresh()}
              />
            </NotificationBell>

            {/* Your address opens the allowlist rather than just sitting there.
                "Who can sign in" was a full-width panel at the bottom of the
                page for a list that is usually two lines and changes about
                twice a term. It belongs next to the identity it is about, and
                it belongs shut. */}
            <div className="relative">
              <button
                onClick={() => setAdminOpen((o) => !o)}
                aria-expanded={adminOpen}
                className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1.5 font-mono text-xs text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-900 dark:text-stone-400 dark:hover:bg-white/10 dark:hover:text-stone-100"
              >
                <span className="hidden sm:inline">{user.email}</span>
                <span className="sm:hidden">Account</span>
                <ChevronDown
                  className={cn("h-3 w-3 transition-transform", adminOpen && "rotate-180")}
                />
              </button>

              {adminOpen && (
                <>
                  {/* Catches the click that closes it. A document listener would
                      fire on the same click that opened it. */}
                  <div className="fixed inset-0 z-10" onClick={() => setAdminOpen(false)} />
                  <div className="absolute right-0 z-20 mt-2 w-80 rounded-xl border border-slate-200 bg-white p-3 shadow-xl dark:border-stone-700 dark:bg-stone-900">
                    <AdminPanel
                      admins={admins}
                      owners={owners}
                      you={user.email}
                      idToken={user.idToken}
                      onChanged={() => void refresh()}
                    />
                    <button
                      onClick={signOut}
                      className="mt-3 flex w-full items-center gap-1.5 border-t border-slate-200 pt-3 text-xs font-semibold text-slate-500 transition-colors hover:text-slate-900 dark:border-stone-800 dark:text-stone-400 dark:hover:text-stone-100"
                    >
                      <LogOut className="h-3 w-3" />
                      Sign out
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </header>

        <div className="mb-8">
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

        {/* The form and the chart share a row.
            
            Deliberately not a pop-up in the corner, which was the other option
            on the table. A number you have to click to see is a number you stop
            checking, and a floating panel over a board you drag cards around on
            is a panel that gets in the way. Inline, left to right, is how every
            dashboard worth copying reads: the thing you do on the left, the
            thing you watch on the right, both always there.
            
            The form gives up the width because it is a single input and a
            select; it never used the other two thirds for anything. */}
        <div className="mb-8 grid gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            void addTodo();
          }}
          className="flex h-fit flex-wrap items-center gap-2 rounded-xl border border-slate-200 bg-white p-3 dark:border-stone-800 dark:bg-stone-900"
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

          <WorkspaceActivity feedback={feedback} todos={todos} />
        </div>

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

                {/* Scrolls rather than growing. Ideas is the column that fills
                    up, and at fourteen cards it was pushing the other three
                    columns' worth of board off the bottom of the screen, so the
                    thing you came to look at moved further away the more of it
                    there was. Capped near a screen's height and given its own
                    scrollbar, the board stays one page whatever is in it. */}
                {/* A progress bar for the column, since the native scrollbar on
                    a 60vh list inside a card is easy to miss and says nothing
                    about how much is left. Sits under the heading, above the
                    cards, so it reads as belonging to this column. */}
                <div className="relative mb-2 h-0.5 w-full overflow-hidden rounded-full bg-slate-200 dark:bg-stone-800">
                  <ScrollProgress
                    containerRef={listRefs.current[col.id]}
                    className="absolute inset-x-0 top-0 h-0.5 rounded-full bg-indigo-500 dark:bg-indigo-400"
                  />
                </div>

                <ul
                  ref={(el) => {
                    listRefs.current[col.id] = { current: el };
                  }}
                  className="flex max-h-[60vh] flex-1 flex-col gap-2 overflow-y-auto pr-1"
                >
                  {inColumn.map((todo) => {
                    const idx = TODO_COLUMNS.findIndex((c) => c.id === todo.column);
                    return (
                      <li
                        key={todo.id}
                        draggable={editingId !== todo.id}
                        onDragStart={() => setDragging(todo.id)}
                        onDragEnd={() => setDragging(null)}
                        className={cn(
                          "group/card rounded-lg border border-slate-200 bg-white p-2.5 shadow-sm transition dark:border-stone-700 dark:bg-stone-800",
                          dragging === todo.id && "opacity-40",
                        )}
                      >
                        <TodoCard
                          todo={todo}
                          onEditingChange={(on) => setEditingId(on ? todo.id : null)}
                          onSave={(title) => editTodo(todo.id, title)}
                        >
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
                        </TodoCard>
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
