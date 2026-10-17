/**
 * Ask Bloom.
 *
 * A chat where every answer is real: Bloom reads the student's own progress
 * (streak, XP, cards due, next lesson) and the curriculum's checked reaction
 * table. askModel.ts decides what to say (the same brain the Messages thread
 * uses); this file only draws the thread. A reaction answer is ONE card with
 * the structures drawn (ReactionAnswer.tsx). Nothing is sent anywhere and
 * nothing is invented: a miss says so and suggests something that works.
 *
 * #/app/chat/<question> opens the chat and asks that question, which is how
 * the Messages thread's "SEE IT DRAWN" lands here.
 *
 * The conversation lives in component state, so it starts fresh each visit.
 */

import { useEffect, useRef, useState, type FormEvent } from "react";
import { REACTIONS, topicDefinition } from "@blueberry/curriculum";
import { hrefForTab } from "../../app/routes";
import { useHashRoute } from "../../app/useHashRoute";
import { BlueberryMark } from "../../mascot/BlueberryMark";
import { BloomAvatar } from "../social/BloomAvatar";
import { useHeaderTop } from "../social/useHeaderTop";
import { useStudyState } from "../social/useStudyState";
import { STARTER_QUESTIONS, answer, type Answer, type AskLink } from "./askModel";
import { ReactionAnswer } from "./ReactionAnswer";
import "../social/social.css";

type Turn = { readonly id: number; readonly from: "me"; readonly text: string } | { readonly id: number; readonly from: "bloom"; readonly answer: Answer };

/** How long Bloom's typing dots show before the answer lands. */
const TYPING_MS = 600;

/** The colour band down the side of each starter tile, so the four read as four different kinds of question. */
const STARTER_TONES = ["#5a3fd8", "#2f7d33", "#c2410c", "#be185d"] as const;

function linkHref(to: AskLink): string {
  return hrefForTab(to);
}

function BloomBubble({ reply, onAsk }: { readonly reply: Answer; readonly onAsk: (question: string) => void }) {
  return (
    <div className="flex flex-col gap-2">
      <div className="social-pop flex items-end gap-2">
        <BloomAvatar size="sm" />
        <p className="max-w-[85%] rounded-[1.25rem] rounded-bl-md bg-bb-muted px-3.5 py-2 text-[0.95rem] leading-snug text-bb-foreground">{reply.text}</p>
      </div>
      {reply.kind === "reaction" ? (
        <ReactionAnswer reaction={reply.reaction} others={reply.others} onAsk={onAsk} />
      ) : reply.link !== undefined ? (
        <a href={linkHref(reply.link.to)} className="btn3d btn3d--primary btn3d--sm ml-11 self-start">
          {reply.link.label}
        </a>
      ) : null}
    </div>
  );
}

/** Before the first question: Bloom big, one line, and four tappable questions that fill the card. */
function EmptyChat({ onAsk }: { readonly onAsk: (question: string) => void }) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-4 py-2 text-center">
      <span className="grid size-20 place-items-center rounded-full bg-[#e3e8ff] ring-4 ring-white md:size-28" aria-hidden="true">
        <BlueberryMark eyes mood="happy" className="h-16 w-16 translate-y-[4%] md:h-24 md:w-24" />
      </span>
      <div>
        <h2 className="font-display text-2xl font-black text-bb-foreground">Ask me anything orgo!</h2>
        <p className="mt-1 text-[0.95rem] font-semibold text-bb-muted-foreground">Reagents, reactions, or where you are in the course.</p>
      </div>
      <ul className="grid w-full max-w-lg gap-2 sm:grid-cols-2" aria-label="Try asking">
        {STARTER_QUESTIONS.map((question, index) => (
          <li key={question}>
            <button
              type="button"
              onClick={() => onAsk(question)}
              className="flex min-h-14 w-full items-center gap-3 rounded-2xl border-2 border-b-4 border-[color:var(--btn-line)] bg-bb-card px-3 py-2 text-left font-display text-[0.95rem] leading-tight font-extrabold text-bb-foreground transition-transform active:translate-y-[2px] active:border-b-2"
            >
              <span className="h-8 w-1.5 shrink-0 rounded-full" style={{ background: STARTER_TONES[index] }} aria-hidden="true" />
              {question}
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}

export default function ChatTab() {
  const study = useStudyState();
  const route = useHashRoute();
  const linked = route.kind === "tab" ? (route.rest[0] ?? "") : "";

  /** Bloom's answer to one question, from the student's state right now. */
  function replyTo(question: string): Answer {
    return answer(
      question,
      {
        streak: study.input.streak,
        todayCounted: study.input.todayCounted,
        cardsDue: study.input.cardsDue,
        nextLesson: study.input.nextLesson,
        hasCourse: study.input.hasCourse,
        xpToday: study.xpToday,
      },
      (reaction) => topicDefinition(reaction.topic).label,
    );
  }
  // Lazy initial state: a question carried in the URL (#/app/chat/<question>) is
  // answered once, when the screen opens, with no effect to re-run or undo.
  const [turns, setTurns] = useState<readonly Turn[]>(() =>
    linked === "" ? [] : [{ id: 0, from: "me", text: linked }, { id: 1, from: "bloom", answer: replyTo(linked) }],
  );
  const [draft, setDraft] = useState("");
  const [typing, setTyping] = useState(false);
  const scroller = useRef<HTMLDivElement>(null);
  const root = useRef<HTMLDivElement>(null);
  useHeaderTop(root);
  // useRef for the pending timer: the cleanup below must see it, and changing it must not re-render.
  const timer = useRef<number | null>(null);

  useEffect(() => {
    const element = scroller.current;
    if (element === null) return;
    const last = element.lastElementChild as HTMLElement | null;
    // A long answer opens at its top, so the start of Bloom's reply stays in view; anything short just follows the bottom.
    element.scrollTop = last !== null && last.offsetHeight > element.clientHeight ? last.offsetTop - 12 : element.scrollHeight;
  }, [turns.length, typing]);

  // Cleanup on unmount: a reply still waiting behind the dots is dropped with the screen.
  useEffect(
    () => () => {
      if (timer.current !== null) window.clearTimeout(timer.current);
    },
    [],
  );

  function ask(question: string): void {
    const text = question.trim();
    if (text === "" || typing) return;
    const reply = replyTo(text);
    // Functional update (prev => next): two quick turns never overwrite each other.
    setTurns((prev) => [...prev, { id: prev.length, from: "me", text }]);
    setDraft("");
    setTyping(true);
    timer.current = window.setTimeout(() => {
      timer.current = null;
      setTyping(false);
      setTurns((prev) => [...prev, { id: prev.length, from: "bloom", answer: reply }]);
    }, TYPING_MS);
  }

  function submit(event: FormEvent): void {
    event.preventDefault();
    ask(draft);
  }

  const empty = turns.length === 0 && !typing;

  return (
    <div ref={root} className="social-grid">
      <div className="social-main">
        {/* The shell header names the screen and the thread header names Bloom, so this heading is for screen readers. */}
        <h1 className="sr-only">Ask Blueberry</h1>

        <section
          aria-label="Chat with Bloom"
          // Phone: a full-height thread pinned between the measured shell header
          // (--msg-top) and the tab bar, so only the bubbles scroll, as in
          // Messages. Desktop: back in the flow as a card beside the rail.
          className="fixed inset-x-0 top-[var(--msg-top,4rem)] bottom-[var(--tabbar-height,0px)] z-[5] flex flex-col overflow-hidden bg-bb-card md:static md:h-[min(46rem,calc(100dvh-12rem))] md:min-h-[30rem] md:rounded-3xl md:border-2 md:border-[color:var(--btn-line)]"
        >
          <header className="flex items-center gap-3 border-b-2 border-[color:var(--btn-line)] px-4 py-3">
            <BloomAvatar size="md" />
            <span className="flex flex-col">
              <span className="font-display font-extrabold text-bb-foreground">Bloom</span>
              <span className="text-xs font-bold text-bb-muted-foreground">Answers from your progress and the reaction table</span>
            </span>
          </header>

          <div ref={scroller} className="relative flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto px-3 py-4 md:px-5" aria-live="polite">
            {empty ? <EmptyChat onAsk={ask} /> : null}
            {turns.map((turn) =>
              turn.from === "me" ? (
                <p
                  key={turn.id}
                  className="max-w-[78%] self-end rounded-[1.25rem] rounded-br-md bg-bb-primary px-3.5 py-2 text-[0.95rem] leading-snug text-bb-primary-foreground"
                >
                  {turn.text}
                </p>
              ) : (
                <BloomBubble key={turn.id} reply={turn.answer} onAsk={ask} />
              ),
            )}
            {typing ? (
              <div className="flex items-end gap-2">
                <BloomAvatar size="sm" />
                <div className="flex items-center gap-1 rounded-[1.25rem] rounded-bl-md bg-bb-muted px-4 py-3">
                  <span className="sr-only">Bloom is typing</span>
                  {[0, 150, 300].map((delay) => (
                    <span
                      key={delay}
                      aria-hidden="true"
                      className="size-2 rounded-full bg-bb-muted-foreground motion-safe:animate-bounce"
                      style={{ animationDelay: `${delay}ms` }}
                    />
                  ))}
                </div>
              </div>
            ) : null}
          </div>

          <form onSubmit={submit} className="flex items-center gap-2 border-t-2 border-[color:var(--btn-line)] px-3 py-3">
            <label htmlFor="ask-bloom" className="sr-only">
              Ask Bloom
            </label>
            <input
              id="ask-bloom"
              value={draft}
              onChange={(event) => setDraft(event.currentTarget.value)}
              placeholder="Try: aldehyde to alcohol"
              autoComplete="off"
              enterKeyHint="send"
              maxLength={200}
              className="min-h-11 min-w-0 flex-1 rounded-full border-2 border-[color:var(--btn-line)] bg-bb-card px-4 text-base text-bb-foreground outline-none placeholder:text-bb-muted-foreground focus-visible:border-bb-primary"
            />
            <button
              type="submit"
              disabled={draft.trim() === "" || typing}
              aria-label="Send"
              className="mb-[3px] grid size-11 shrink-0 place-items-center rounded-full bg-bb-primary text-bb-primary-foreground shadow-[0_3px_0_var(--bb-primary-lip)] transition-transform active:translate-y-[3px] active:shadow-none disabled:bg-bb-muted disabled:text-bb-muted-foreground disabled:shadow-none"
            >
              <svg viewBox="0 0 24 24" aria-hidden="true" className="size-5" fill="none" stroke="currentColor" strokeWidth={3} strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 19V5M5 12l7-7 7 7" />
              </svg>
            </button>
          </form>
        </section>
      </div>

      <aside className="social-rail social-rail--desk" aria-label="What Bloom knows">
        <section className="social-banner flex flex-col gap-3">
          <h2 className="!text-xl">What Bloom knows</h2>
          <ul className="grid grid-cols-2 gap-2">
            <li className="flex flex-col rounded-2xl bg-white px-3 py-2 text-[#472ab4]">
              <span className="font-display text-2xl font-black tabular-nums">{REACTIONS.length}</span>
              <span className="text-xs font-extrabold tracking-wide uppercase">reactions</span>
            </li>
            <li className="flex flex-col rounded-2xl bg-white px-3 py-2 text-[#472ab4]">
              <span className="font-display text-2xl font-black tabular-nums">{study.input.cardsDue}</span>
              <span className="text-xs font-extrabold tracking-wide uppercase">{study.input.cardsDue === 1 ? "card due" : "cards due"}</span>
            </li>
          </ul>
          <p className="text-sm">Every answer comes from your own progress on this device or from Blueberry's checked reaction table.</p>
        </section>
        <section className="social-card">
          <h2 className="text-lg">Ask it like this</h2>
          <ul className="mt-2 flex flex-col gap-2 text-[0.95rem] font-semibold text-bb-foreground">
            <li><span className="font-extrabold">A reagent:</span> PCC, mCPBA, DIBAL-H</li>
            <li><span className="font-extrabold">A name:</span> aldol, Wittig, Diels-Alder</li>
            <li><span className="font-extrabold">A change:</span> ester to aldehyde</li>
            <li><span className="font-extrabold">You:</span> my streak, cards due</li>
          </ul>
        </section>
      </aside>
    </div>
  );
}
