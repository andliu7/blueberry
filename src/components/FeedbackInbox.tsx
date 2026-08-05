import { useState } from "react";
import { Check, Lightbulb, ListTodo, Undo2, Smile, Frown, Minus, Sparkles } from "lucide-react";
import { CursorHint } from "@/components/ui/cursor-hint";
import { postToAppsScript } from "@/lib/appsScript";
import {
  sentimentOf,
  timeAgo,
  type FeedbackNote,
  type FeedbackState,
  type FeedbackStateEntry,
  type Sentiment,
} from "@/lib/workspace";
import { cn } from "@/lib/utils";

/**
 * The list inside the bell: what has come in, and what to do with it.
 *
 * Every action is one icon. The panel is 320px wide and each note carries four
 * of them, so there is no room for labels and no room for a tooltip that takes
 * layout space; `CursorHint` puts the word next to the pointer instead, which
 * costs the panel nothing. The buttons still carry real `aria-label`s, because
 * a touch screen has no hover and a screen reader has no cursor.
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

const STATE_CHIP: Record<Exclude<FeedbackState, "new">, { label: string; cls: string }> = {
  resolved: {
    label: "Resolved",
    cls: "bg-slate-100 text-slate-500 dark:bg-white/10 dark:text-stone-400",
  },
  idea: {
    label: "In Ideas",
    cls: "bg-indigo-100 text-indigo-700 dark:bg-indigo-400/15 dark:text-indigo-300",
  },
  todo: {
    label: "In To do",
    cls: "bg-violet-100 text-violet-700 dark:bg-violet-400/15 dark:text-violet-300",
  },
};

const WELCOME_KEY = "blueberry_workspace_welcomed";

export function FeedbackInbox({
  feedback,
  state,
  loading,
  idToken,
  onChanged,
}: {
  feedback: FeedbackNote[];
  state: Record<string, FeedbackStateEntry>;
  loading: boolean;
  idToken: string;
  onChanged: () => void;
}) {
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [welcomed, setWelcomed] = useState(() => {
    try {
      return localStorage.getItem(WELCOME_KEY) === "1";
    } catch {
      return true;
    }
  });

  const act = async (
    key: string,
    type: "setFeedbackState" | "promoteFeedback",
    payload: Record<string, unknown>,
  ) => {
    setBusy(key);
    setError("");
    const body = await postToAppsScript(type, { idToken, ...payload });
    setBusy(null);
    if (body.ok) onChanged();
    else
      setError(
        body.error === "unreachable"
          ? "Could not reach the workspace endpoint."
          : (body.error ?? "The server refused that."),
      );
  };

  return (
    <>
      {/* Shown once, and it is the only thing in here that is not real feedback.
          A workspace whose controls are all unlabelled icons needs to introduce
          itself once rather than be discovered by clicking things. */}
      {!welcomed && (
        <div className="border-b border-indigo-100 bg-indigo-50/70 p-3 dark:border-indigo-400/20 dark:bg-indigo-400/10">
          <p className="flex items-center gap-1.5 text-sm font-bold text-indigo-900 dark:text-indigo-200">
            <Sparkles className="h-3.5 w-3.5" />
            Welcome to the workspace
          </p>
          <ul className="mt-2 space-y-1 text-xs leading-relaxed text-indigo-900/80 dark:text-indigo-200/80">
            <li>
              <strong>This bell</strong> collects every piece of feedback from the study
              pages, labelled positive or needs-attention from the words in it.
            </li>
            <li>
              <strong>The four icons</strong> on each note resolve it, send it to Ideas or
              To do, or put it back. Hover any of them to see which is which.
            </li>
            <li>
              <strong>The board</strong> below has four columns. Drag a card between them,
              or use the arrows on it if you would rather not drag.
            </li>
            <li>
              <strong>Hold</strong> a bin button rather than clicking it. Nothing here has
              an undo, so deleting takes a moment on purpose.
            </li>
            <li>
              <strong>Who can sign in</strong>, at the foot of the page, adds and removes
              admins. Owners are set in the Apps Script and cannot be removed here.
            </li>
          </ul>
          <button
            onClick={() => {
              try {
                localStorage.setItem(WELCOME_KEY, "1");
              } catch {
                /* a refused write only costs one more read of this later */
              }
              setWelcomed(true);
            }}
            className="mt-2 text-xs font-bold text-indigo-700 underline decoration-dotted underline-offset-4 dark:text-indigo-300"
          >
            Got it
          </button>
        </div>
      )}

      {error && (
        <p className="border-b border-red-100 bg-red-50 p-3 text-xs text-red-700 dark:border-red-400/20 dark:bg-red-500/10 dark:text-red-300">
          {error}
        </p>
      )}

      {feedback.length === 0 ? (
        <p className="p-4 text-center text-sm text-slate-500 dark:text-stone-400">
          {loading ? "Loading feedback…" : "No feedback yet."}
        </p>
      ) : (
        <ul className="divide-y divide-slate-100 dark:divide-stone-800">
          {feedback.map((note) => {
            const mood = sentimentOf(note);
            const Icon = SENTIMENT[mood].icon;
            const current = state[note.id]?.state ?? "new";
            const done = current !== "new";
            const title = note.comment.trim() || `Feedback (rating ${note.rating || "n/a"})`;

            return (
              <li
                key={note.id}
                className={cn("p-3 transition-opacity", done && "opacity-55")}
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

                <div className="mt-2 flex items-center gap-1">
                  {done && (
                    <span
                      className={cn(
                        "rounded-full px-2 py-0.5 text-[0.6rem] font-bold",
                        STATE_CHIP[current as Exclude<FeedbackState, "new">].cls,
                      )}
                    >
                      {STATE_CHIP[current as Exclude<FeedbackState, "new">].label}
                    </span>
                  )}

                  <span className="ml-auto flex items-center gap-0.5">
                    {done ? (
                      <CursorHint label="Put it back in the queue">
                        <button
                          onClick={() =>
                            void act(note.id, "setFeedbackState", { id: note.id, state: "new" })
                          }
                          disabled={busy === note.id}
                          aria-label="Move back to the queue"
                          className="rounded p-1 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 disabled:opacity-40 dark:hover:bg-white/10 dark:hover:text-stone-200"
                        >
                          <Undo2 className="h-3.5 w-3.5" />
                        </button>
                      </CursorHint>
                    ) : (
                      <>
                        <CursorHint label="Add to Ideas">
                          <button
                            onClick={() =>
                              void act(note.id, "promoteFeedback", {
                                id: note.id,
                                title,
                                column: "idea",
                              })
                            }
                            disabled={busy === note.id}
                            aria-label="Add to Ideas"
                            className="rounded p-1 text-slate-400 transition hover:bg-indigo-50 hover:text-indigo-600 disabled:opacity-40 dark:hover:bg-indigo-400/10 dark:hover:text-indigo-300"
                          >
                            <Lightbulb className="h-3.5 w-3.5" />
                          </button>
                        </CursorHint>

                        <CursorHint label="Add to To do">
                          <button
                            onClick={() =>
                              void act(note.id, "promoteFeedback", {
                                id: note.id,
                                title,
                                column: "todo",
                              })
                            }
                            disabled={busy === note.id}
                            aria-label="Add to To do"
                            className="rounded p-1 text-slate-400 transition hover:bg-violet-50 hover:text-violet-600 disabled:opacity-40 dark:hover:bg-violet-400/10 dark:hover:text-violet-300"
                          >
                            <ListTodo className="h-3.5 w-3.5" />
                          </button>
                        </CursorHint>

                        <CursorHint label="Mark resolved, no task needed">
                          <button
                            onClick={() =>
                              void act(note.id, "setFeedbackState", {
                                id: note.id,
                                state: "resolved",
                              })
                            }
                            disabled={busy === note.id}
                            aria-label="Mark resolved"
                            className="rounded p-1 text-slate-400 transition hover:bg-emerald-50 hover:text-emerald-600 disabled:opacity-40 dark:hover:bg-emerald-400/10 dark:hover:text-emerald-300"
                          >
                            <Check className="h-3.5 w-3.5" />
                          </button>
                        </CursorHint>
                      </>
                    )}
                  </span>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </>
  );
}

export default FeedbackInbox;
