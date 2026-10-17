/**
 * Messages, shaped like the iPhone Messages app: a thread list, then a thread
 * with grouped bubbles and a composer at the bottom. On a
 * wide screen both sit side by side, the way Messages on a Mac does.
 *
 * Two honest threads and no invented people (see messagesModel.ts): Bloom,
 * whose opening run is built from the student's real local state and who
 * answers every message with the same brain as Ask Blueberry, and a
 * read-only "Study reminders" thread. What the student types to Bloom is kept
 * on this device by messageStore.ts, which also holds the one seam where real
 * SMS or push delivery plugs in later.
 *
 * The list screen is the inbox and nothing else. The daily reminder is set
 * inside the Study reminders thread, the one place that promises it.
 *
 * Routes: #/app/messages is the list (and Bloom beside it on desktop),
 * #/app/messages/bloom and #/app/messages/reminders open a thread.
 */

import { useEffect, useRef, useState, useSyncExternalStore, type FormEvent } from "react";
import { topicDefinition } from "@blueberry/curriculum";
import { GroupChat, type ChatMessage } from "@/components/ui/group-chat";
import { hrefForTab } from "../../app/routes";
import { useHashRoute } from "../../app/useHashRoute";
import { BloomAvatar } from "../social/BloomAvatar";
import { useHeaderTop } from "../social/useHeaderTop";
import { useStudyState } from "../social/useStudyState";
import { messages } from "./messageStore";
import { ReminderPicker } from "./ReminderPicker";
import {
  BLOOM,
  BLOOM_TITLE,
  ME,
  REMINDERS,
  REMINDERS_TITLE,
  bloomNudges,
  bloomReply,
  bloomThread,
  reminderLines,
  type ThreadId,
} from "./messagesModel";
import { answer, type AskState } from "../chat/askModel";
import { ReactionAnswer } from "../chat/ReactionAnswer";
import "../social/social.css";

/**
 * A quick-reply pill with the game's solid lip, smaller than a .btn3d slab so
 * two fit above the composer on a phone. Tailwind rather than .btn3d because
 * .btn3d's unlayered padding would beat these utilities.
 */
const CHIP =
  "mb-[3px] inline-flex min-h-11 shrink-0 items-center whitespace-nowrap rounded-full border-2 border-bb-primary bg-bb-card px-3.5 font-display text-sm font-extrabold text-bb-primary-ink shadow-[0_3px_0_var(--bb-primary)] transition-transform active:translate-y-[3px] active:shadow-none";

/**
 * Each thread's face. Bloom is the real mascot on a pale disc (BloomAvatar),
 * the same character as everywhere else in the app. Study reminders is a flat
 * orange bell, so the two rows never read as the same sender.
 */
function Face({ seed, size }: { readonly seed: string; readonly size: "sm" | "lg" }) {
  const box = size === "lg" ? "size-12" : "size-10";
  if (seed === BLOOM) return <BloomAvatar size={size === "lg" ? "lg" : "md"} />;
  return (
    <svg viewBox="0 0 48 48" className={`${box} shrink-0`} aria-hidden="true" focusable="false">
      <circle cx="24" cy="24" r="24" fill="#c2410c" />
      <path d="M24 12c-5 0-8.5 3.8-8.5 9v5.5L13 31h22l-2.5-4.5V21c0-5.2-3.5-9-8.5-9z" fill="#ffffff" />
      <path d="M20.5 33.5a3.5 3.5 0 0 0 7 0z" fill="#ffffff" />
    </svg>
  );
}

/** How long Bloom's typing dots show before its answer lands. */
const TYPING_MS = 900;

/** Questions one tap away above Bloom's composer. Each hits a different branch of askModel. */
const QUICK_QUESTIONS = ["What's next?", "What does PCC do?", "Cards due?", "What does NaBH4 do?", "My streak?"] as const;

/**
 * The quick questions Bloom has not already answered. Compared by Bloom's
 * answer, not the wording, so "what is PCC for?" typed by hand also retires
 * the "What does PCC do?" chip.
 */
function unaskedQuestions(asked: readonly string[], ask: AskState): readonly string[] {
  const replyTo = (text: string) => bloomReply(text, ask).text;
  const answered = new Set(asked.map(replyTo));
  return QUICK_QUESTIONS.filter((question) => !answered.has(replyTo(question)));
}

export default function MessagesTab() {
  const route = useHashRoute();
  const rest = route.kind === "tab" ? route.rest : [];
  const open: ThreadId | null = rest[0] === "bloom" || rest[0] === "reminders" ? rest[0] : null;

  const state = useStudyState();
  // useSyncExternalStore: React's tear-free way to read a store that lives outside React.
  const stored = useSyncExternalStore(messages.subscribe, messages.getSnapshot, messages.getSnapshot);

  // A few dozen strings at most, so it is rebuilt per render rather than memoised.
  const bloom = bloomThread(stored, bloomNudges(state.input), state.now, state.tz);
  const reminders: ChatMessage[] = reminderLines({ ...state.reminders, today: state.today, cardsDue: state.input.cardsDue }).map(
    (text, index) => ({ name: REMINDERS, title: REMINDERS_TITLE, text, time: index === 0 ? "Today" : undefined }),
  );

  const lastBloom = bloom.at(-1);
  const lastReminder = reminders.at(-1);

  // The phone thread is pinned between the shell's header and the tab bar (--msg-top).
  const root = useRef<HTMLDivElement>(null);
  useHeaderTop(root);

  return (
    <div ref={root} className="mx-auto flex w-full max-w-5xl gap-0 md:gap-4 md:p-6">
      {/* The list: the whole screen on a phone until a thread opens, a fixed column on desktop. */}
      <section
        aria-label="Conversations"
        className={`${open === null ? "flex" : "hidden"} w-full flex-col md:flex md:w-80 md:shrink-0`}
      >
        {/* On desktop the shell header already says Messages, so there this heading is for screen readers only. */}
        <h1 className="font-display px-4 pt-4 pb-2 text-[1.75rem] font-extrabold text-bb-foreground md:sr-only">
          Messages
        </h1>
        <ul className="flex flex-col md:gap-2">
          <ThreadRow
            id="bloom"
            seed={BLOOM}
            title={BLOOM_TITLE}
            preview={lastBloom?.name === ME ? `You: ${lastBloom.text}` : (lastBloom?.text ?? "")}
            when="Today"
            active={open === "bloom" || open === null}
          />
          <ThreadRow
            id="reminders"
            seed={REMINDERS}
            title={REMINDERS_TITLE}
            preview={lastReminder?.text ?? ""}
            when="Today"
            active={open === "reminders"}
          />
        </ul>
        {/* The list is the inbox and nothing else. The reminder picker lives in
            the Study reminders thread, and Ask Blueberry is one tap from Feed. */}
        <p className="px-4 pt-6 text-center text-sm font-semibold text-bb-muted-foreground md:px-2">
          Only Bloom and your reminders write here for now.
        </p>
      </section>

      {/* The thread. Phone: only when one is open. Desktop: always, Bloom by default. */}
      <section
        aria-label={open === "reminders" ? REMINDERS_TITLE : BLOOM_TITLE}
        className={`${open === null ? "hidden md:flex" : "flex"} min-w-0 flex-1`}
      >
        {open === "reminders" ? (
          // key: both threads render at the same spot in the tree; without a key
          // React reuses one Thread instance for the other and carries its state over.
          <Thread key="reminders" id="reminders" title={REMINDERS_TITLE} seed={REMINDERS} messages={reminders} reminderHour={state.reminders.hour} />
        ) : (
          <Thread
            key="bloom"
            id="bloom"
            title={BLOOM_TITLE}
            seed={BLOOM}
            messages={bloom}
            ask={{ ...state.input, xpToday: state.xpToday }}
          />
        )}
      </section>
    </div>
  );
}

function ThreadRow({
  id,
  seed,
  title,
  preview,
  when,
  active,
}: {
  readonly id: ThreadId;
  readonly seed: string;
  readonly title: string;
  readonly preview: string;
  readonly when: string;
  readonly active: boolean;
}) {
  return (
    <li>
      <a
        href={hrefForTab("messages", id)}
        aria-current={active ? "true" : undefined}
        // The highlighted row only means something on desktop, where the open thread sits beside the list.
        className={`press flex min-h-16 items-center gap-3 border-b-2 border-[color:var(--btn-line)] bg-bb-card px-4 py-3 md:rounded-2xl md:border-2 md:border-b-4 ${
          active ? "md:border-bb-primary md:bg-[color-mix(in_srgb,var(--bb-primary)_16%,var(--bb-card))]" : ""
        }`}
      >
        <Face seed={seed} size="lg" />
        <span className="min-w-0 flex-1">
          <span className="flex items-baseline justify-between gap-2">
            <span className="font-display text-base font-extrabold text-bb-foreground">{title}</span>
            <span className="shrink-0 text-sm font-semibold text-bb-muted-foreground">{when}</span>
          </span>
          <span className="block truncate text-sm text-bb-muted-foreground">{preview}</span>
        </span>
        <span aria-hidden="true" className="text-xl font-bold text-bb-muted-foreground">
          ›
        </span>
      </a>
    </li>
  );
}

function Thread({
  id,
  title,
  seed,
  messages: thread,
  ask,
  reminderHour = null,
}: {
  readonly id: ThreadId;
  readonly title: string;
  readonly seed: string;
  readonly messages: readonly ChatMessage[];
  /** Only Bloom's thread has one: what Bloom's answers read (the student's state, as Ask Blueberry reads it). Its presence turns the composer on. */
  readonly ask?: AskState;
  /** The reminders thread's footer sets the reminder in place. */
  readonly reminderHour?: number | null;
}) {
  const scroller = useRef<HTMLDivElement>(null);
  const [typing, setTyping] = useState(false);
  // useRef, not state: the reply waiting behind the dots is read by the timer
  // and by the unmount cleanup, and changing it must not re-render anything.
  const pending = useRef<{ text: string; ask: string | undefined; timer: number } | null>(null);

  // Scroll to the newest message, but never past the student's own last
  // question: a tall answer card would otherwise push the question that asked
  // for it out of view. GroupChat (SITE lane) marks the student's bubble rows
  // only by their right alignment, so `.justify-end` is how they are found.
  useEffect(() => {
    const element = scroller.current;
    if (element === null) return;
    element.scrollTop = element.scrollHeight;
    const mine = element.firstElementChild?.querySelectorAll<HTMLElement>(":scope > div > .justify-end") ?? [];
    // The run around that bubble, so its time label stays in view too.
    const question = mine[mine.length - 1]?.parentElement ?? undefined;
    if (question === undefined) return;
    const top = question.getBoundingClientRect().top - element.getBoundingClientRect().top + element.scrollTop - 16;
    if (top < element.scrollTop) element.scrollTop = Math.max(0, top);
  }, [thread.length, id, typing]);

  // Cleanup on unmount: leaving the thread mid-dots still delivers Bloom's
  // answer, so coming back never finds a message that was silently dropped.
  useEffect(
    () => () => {
      const waiting = pending.current;
      if (waiting === null) return;
      window.clearTimeout(waiting.timer);
      pending.current = null;
      messages.append({ from: "bloom", text: waiting.text, at: new Date().toISOString(), ...(waiting.ask ? { ask: waiting.ask } : {}) });
    },
    [],
  );

  function send(text: string): void {
    if (ask === undefined || pending.current !== null) return;
    messages.append({ from: "me", text, at: new Date().toISOString() });
    // Bloom answers every message, with the same answer Ask Blueberry gives.
    const reply = bloomReply(text, ask, (reaction) => topicDefinition(reaction.topic).label);
    setTyping(true);
    const timer = window.setTimeout(() => {
      pending.current = null;
      setTyping(false);
      // Stamped when it lands, so it is later than the message it answers.
      messages.append({ from: "bloom", text: reply.text, at: new Date().toISOString(), ...(reply.ask ? { ask: reply.ask } : {}) });
    }, TYPING_MS);
    pending.current = { text: reply.text, ask: reply.ask, timer };
  }

  // When the newest stored message is Bloom answering a reaction question, the
  // card with its drawn scheme sits right under it, in the thread.
  const stored = messages.getSnapshot();
  const newest = stored.at(-1);
  const drawn = ask !== undefined && !typing && newest?.from === "bloom" && newest.ask !== undefined ? answer(newest.ask, ask) : null;
  const asked = stored.filter((message) => message.from === "me").map((message) => message.text);

  return (
    <div
      // Phone: fixed between the measured shell header (--msg-top) and the tab
      // bar, so the page itself never scrolls and only the bubbles do. Fixed
      // rather than a computed height because the shell's bottom padding is
      // not the tab bar's height. Desktop: back in the flow, beside the list.
      className="fixed inset-x-0 top-[var(--msg-top,4rem)] bottom-[var(--tabbar-height,0px)] z-[5] flex w-full md:static flex-col overflow-hidden bg-bb-card md:h-[calc(100dvh-8rem)] md:rounded-3xl md:border-2 md:border-[color:var(--btn-line)]"
    >
      <header className="flex items-center gap-2 border-b-2 border-[color:var(--btn-line)] px-2 py-2">
        <a
          href={hrefForTab("messages")}
          className="press flex min-h-11 min-w-11 items-center gap-1 px-2 font-bold text-bb-primary-ink md:hidden"
        >
          <span aria-hidden="true" className="text-2xl leading-none">
            ‹
          </span>
          Messages
        </a>
        <span className="flex min-w-0 flex-1 flex-col items-center md:flex-row md:justify-start md:gap-3 md:px-3">
          <Face seed={seed} size="sm" />
          <span className="flex flex-col items-center md:items-start">
            <span className="font-display text-sm font-extrabold text-bb-foreground md:text-base">{title}</span>
            <span className="hidden text-xs font-bold text-bb-muted-foreground md:block">
              {seed === BLOOM ? "Your study buddy" : "Updates from your settings"}
            </span>
          </span>
        </span>
        {/* Balances the back link so the name stays centred on a phone. */}
        <span aria-hidden="true" className="w-[6.5rem] md:hidden" />
      </header>

      {/* msg-one-to-one: no faces on the bubbles, as in a one-to-one iPhone thread (social.css). */}
      <div ref={scroller} className="msg-one-to-one min-h-0 flex-1 overflow-y-auto px-3 py-4 md:px-5">
        <GroupChat
          variant="bubbles"
          self={ME}
          messages={[...thread]}
          names={false}
          typing={typing ? seed : undefined}
          typingTitle={title}
        />
        {drawn !== null && drawn.kind === "reaction" ? (
          <div className="mt-3 max-w-md">
            <ReactionAnswer reaction={drawn.reaction} others={drawn.others} onAsk={send} />
          </div>
        ) : null}
      </div>

      {ask !== undefined ? (
        <BloomComposer onSend={send} busy={typing} questions={unaskedQuestions(asked, ask)} />
      ) : (
        <footer className="flex flex-col gap-2 border-t-2 border-[color:var(--btn-line)] px-4 pt-3 pb-1">
          <h2 className="font-display text-sm font-extrabold text-bb-foreground">Daily reminder</h2>
          <ReminderPicker hour={reminderHour} />
          <a href={hrefForTab("me", "settings")} className="inline-flex min-h-11 items-center self-start text-sm font-bold text-bb-primary-ink underline">
            Set your exam date in Settings
          </a>
        </footer>
      )}
    </div>
  );
}

function BloomComposer({
  onSend,
  busy,
  questions,
}: {
  readonly onSend: (text: string) => void;
  /** True while Bloom's dots show; Send waits for the answer to land. */
  readonly busy: boolean;
  /** Quick questions still worth offering (none already asked). */
  readonly questions: readonly string[];
}) {
  const [draft, setDraft] = useState("");
  const text = draft.trim();

  function submit(event: FormEvent): void {
    event.preventDefault();
    if (text === "" || busy) return;
    onSend(text);
    setDraft("");
  }

  return (
    <div className="border-t-2 border-[color:var(--btn-line)] px-3 pt-2 pb-3">
      {/* Quick replies on ONE row that scrolls sideways, as in iMessage, so they never take two rows of a phone. */}
      {questions.length > 0 ? (
        <div className="-mx-3 flex gap-2 overflow-x-auto px-3 pb-2 pr-10 [scrollbar-width:none] [mask-image:linear-gradient(to_right,#000_calc(100%-3rem),transparent)]">
          {questions.map((question) => (
            <button key={question} type="button" disabled={busy} onClick={() => onSend(question)} className={`${CHIP} disabled:opacity-60`}>
              {question}
            </button>
          ))}
        </div>
      ) : null}
      <form onSubmit={submit} className="flex items-center gap-2">
        <label htmlFor="bloom-composer" className="sr-only">
          Message Bloom
        </label>
        <input
          id="bloom-composer"
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          placeholder="Message Bloom"
          autoComplete="off"
          maxLength={500}
          className="min-h-11 min-w-0 flex-1 rounded-full border-2 border-[color:var(--btn-line)] bg-bb-card px-4 text-base text-bb-foreground outline-none placeholder:text-bb-muted-foreground focus-visible:border-bb-primary"
        />
        <button
          type="submit"
          disabled={text === "" || busy}
          aria-label="Send"
          className="mb-[3px] grid size-11 shrink-0 place-items-center rounded-full bg-bb-primary text-bb-primary-foreground shadow-[0_3px_0_var(--bb-primary-lip)] transition-transform active:translate-y-[3px] active:shadow-none disabled:bg-bb-muted disabled:text-bb-muted-foreground disabled:shadow-none"
        >
          <svg viewBox="0 0 24 24" aria-hidden="true" className="size-5" fill="none" stroke="currentColor" strokeWidth={3} strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 19V5M5 12l7-7 7 7" />
          </svg>
        </button>
      </form>
    </div>
  );
}
