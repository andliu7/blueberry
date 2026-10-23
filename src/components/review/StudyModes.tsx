import { Suspense, lazy, useEffect, useMemo, useRef, useState } from "react";
import { Check } from "lucide-react";
import type { Question } from "@/data/types";
import type { Status } from "@/components/QuestionCard";
import { MathHtml } from "@/components/ui/math-html";
import { Figure } from "@/components/review/DeckStudy";
import { Loader } from "@/components/ui/loader";
import { shuffle } from "@/lib/helpers";

/**
 * Write's drawing pad, split off with React.lazy so Ketcher (about 19MB) downloads only
 * when a student picks "Draw it", never for typing.
 */
const WriteDraw = lazy(() => import("@/components/review/WriteDraw"));

/**
 * The study modes on a deck page (owner, 15 Oct: "Decks are Quizlet-style"): the row of
 * mode buttons, and the three modes that are not the flashcard itself, Test, Match and
 * Write. Flashcards and Learn are the study card (DeckStudy) and live in DeckPage.
 *
 * Every mode uses only what the deck already says: a card's own question, its own answer,
 * and the answers of the deck's other cards as the wrong choices, the way Quizlet builds a
 * test. Nothing chemical is written here.
 */

export type StudyMode = "flashcards" | "learn" | "test" | "match" | "write";

export const MODE_WORDS: Record<StudyMode, string> = {
  flashcards: "Flashcards",
  learn: "Learn",
  test: "Test",
  match: "Match",
  write: "Write",
};

/**
 * The mode row: one segmented switch, a pill that slides to the chosen mode (effect #12).
 * It is a tab list, so the arrow keys and Space stay with the study card's own keys
 * (DeckStudy ignores keys pressed on a [role='tab']).
 */
export function ModeSwitch({
  modes,
  mode,
  onChange,
}: {
  modes: StudyMode[];
  mode: StudyMode;
  onChange: (m: StudyMode) => void;
}) {
  const at = Math.max(0, modes.indexOf(mode));
  return (
    <div
      role="tablist"
      aria-label="Study mode"
      className="rv-modes"
      style={{ "--n": modes.length, "--i": at } as React.CSSProperties}
    >
      <span aria-hidden className="rv-modes__pill" />
      {modes.map((m) => (
        <button
          key={m}
          type="button"
          role="tab"
          aria-selected={m === mode}
          aria-controls="study-panel"
          className="rv-modes__tab"
          onClick={() => onChange(m)}
        >
          {MODE_WORDS[m]}
        </button>
      ))}
    </div>
  );
}

/* ---------------------------------------------------------------- helpers -- */

/** The indexes of an MC card's right options. */
function correctOf(q: Question): number[] {
  if (!q.mc) return [];
  return Array.isArray(q.correct) ? q.correct : [q.correct];
}

/** The short answer a mode asks for: the badge, the right option(s), or the written answer. */
export function answerOf(q: Question): string {
  if (q.badge) return q.badge;
  if (q.mc)
    return correctOf(q)
      .map((i) => q.options[i] ?? "")
      .join(", ");
  return q.a;
}

/** Text with the markup taken out, for comparing two answers. */
const plain = (html: string) =>
  html
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();

/**
 * Two answers count as the same when they match ignoring case, spacing and punctuation.
 * NFKD turns the subscript in "NaBH₄" into a plain 4, so typing NaBH4 matches it.
 */
export const same = (a: string, b: string) => {
  // Letters and digits of any script survive, so an answer of just "Δ" still has a key.
  const norm = (s: string) =>
    plain(s)
      .normalize("NFKD")
      .toLowerCase()
      .replace(/[^\p{L}\p{N}]/gu, "");
  return norm(a) !== "" && norm(a) === norm(b);
};

/** The question side of a card, without the flip hint: text, the masked drawing, options. */
function Front({ q, options = true }: { q: Question; options?: boolean }) {
  return (
    <div className="flex flex-col gap-3">
      <MathHtml html={q.q} className="font-bold text-[var(--bb-deep)]" />
      {q.image && (
        <div className="max-w-md">
          <Figure src={q.image} crop={q.imageCrop} />
        </div>
      )}
      {options && q.mc && (
        <ol className="space-y-1">
          {q.options.map((o, i) => (
            <li key={i} className="flex gap-2">
              <span className="font-bold text-[var(--site-nav-ink)]">
                {String.fromCharCode(65 + i)}
              </span>
              <MathHtml html={o} />
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------- Test -- */

const TEST_SIZE = 20;

type TestItem = { qi: number; options: string[]; correct: number[] };

/**
 * Up to 20 cards in a random order, each as multiple choice. A card that is already
 * multiple choice keeps its own options in its own order (some say "both A and B"). Any
 * other card offers its answer and up to three answers from other cards in the deck.
 */
export function buildTest(questions: Question[]): TestItem[] {
  const items: TestItem[] = [];
  for (const qi of shuffle(questions.map((_, i) => i))) {
    const q = questions[qi]!;
    if (q.mc) {
      items.push({ qi, options: q.options, correct: correctOf(q) });
    } else {
      const answer = answerOf(q);
      const others: string[] = [];
      for (const o of shuffle(questions)) {
        const text = answerOf(o);
        if (!same(text, answer) && !others.some((x) => same(x, text)))
          others.push(text);
        if (others.length === 3) break;
      }
      if (others.length === 0) continue;
      const options = shuffle([answer, ...others]);
      items.push({ qi, options, correct: [options.indexOf(answer)] });
    }
    if (items.length === TEST_SIZE) break;
  }
  return items;
}

export function DeckTest({ questions }: { questions: Question[] }) {
  // A new round is a new number, and the test is rebuilt from it.
  const [round, setRound] = useState(0);
  // useMemo keeps the same shuffled test across re-renders until the round changes.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const items = useMemo(() => buildTest(questions), [questions, round]);
  const [picked, setPicked] = useState<Record<number, number[]>>({});
  const [checked, setChecked] = useState(false);

  const isRight = (k: number) => {
    const got = [...(picked[k] ?? [])].sort().join();
    return got !== "" && got === [...items[k]!.correct].sort().join();
  };
  const score = items.filter((_, k) => isRight(k)).length;
  const answered = Object.values(picked).filter((p) => p.length > 0).length;

  const choose = (k: number, o: number) => {
    if (checked) return;
    const multi = items[k]!.correct.length > 1;
    setPicked((p) => {
      const now = p[k] ?? [];
      const next = multi
        ? now.includes(o)
          ? now.filter((x) => x !== o)
          : [...now, o]
        : [o];
      return { ...p, [k]: next };
    });
  };
  const again = () => {
    setPicked({});
    setChecked(false);
    setRound((r) => r + 1);
  };

  return (
    <div className="space-y-4">
      {checked && (
        <div className="rv-card-box p-5" role="status">
          <p className="rv-eyebrow">Your result</p>
          <p className="mt-1 text-2xl font-extrabold text-[var(--bb-deep)] [font-family:var(--site-display)]">
            {score} of {items.length} right.
          </p>
          <p className="mt-1 text-[var(--site-quiet)]">
            {score === items.length
              ? "Every one. Nice."
              : "Second look at the ones marked below. The right answer has the dashed outline."}
          </p>
          <button type="button" className="rv-btn mt-4" onClick={again}>
            New test
          </button>
        </div>
      )}
      <ol className="space-y-4">
        {items.map((it, k) => {
          const q = questions[it.qi]!;
          const multi = it.correct.length > 1;
          return (
            <li
              key={`${round}-${k}`}
              className="rv-card-box p-5"
              data-result={
                checked ? (isRight(k) ? "right" : "wrong") : undefined
              }
            >
              <p className="rv-eyebrow mb-2">
                Question {k + 1} of {items.length}
                {multi ? ", pick every right answer" : ""}
              </p>
              <Front q={q} options={false} />
              <div className="mt-4 grid gap-2 sm:grid-cols-2">
                {it.options.map((o, i) => {
                  const chosen = (picked[k] ?? []).includes(i);
                  const mark = checked
                    ? it.correct.includes(i)
                      ? "right"
                      : chosen
                        ? "wrong"
                        : undefined
                    : undefined;
                  return (
                    <button
                      key={i}
                      type="button"
                      className="rv-option"
                      aria-pressed={chosen}
                      data-mark={mark}
                      disabled={checked}
                      onClick={() => choose(k, i)}
                    >
                      {q.mc && (
                        <span className="font-bold text-[var(--site-nav-ink)]">
                          {String.fromCharCode(65 + i)}
                        </span>
                      )}
                      <MathHtml html={o} />
                      {mark === "right" && (
                        <Check
                          aria-label="Right answer"
                          className="ml-auto size-5 shrink-0"
                        />
                      )}
                    </button>
                  );
                })}
              </div>
              {checked && !isRight(k) && (
                <p className="mt-3 text-sm text-[var(--bb-warn-ink)]">
                  {picked[k]?.length ? "Not this time." : "Left blank."} Second
                  look at this one.
                </p>
              )}
            </li>
          );
        })}
      </ol>
      {!checked && (
        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            className="rv-btn"
            onClick={() => setChecked(true)}
          >
            Check my answers
          </button>
          <span className="text-sm text-[var(--site-quiet)]">
            {answered} of {items.length} answered
          </span>
        </div>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ Match -- */

const MATCH_PAIRS = 6;

type Tile = { id: string; pair: number; side: "q" | "a" };

/** Six cards whose answers all differ, as twelve tiles in a random order. */
function buildMatch(questions: Question[]): Tile[] {
  const chosen: number[] = [];
  for (const qi of shuffle(questions.map((_, i) => i))) {
    if (
      chosen.some((c) =>
        same(answerOf(questions[c]!), answerOf(questions[qi]!)),
      )
    )
      continue;
    chosen.push(qi);
    if (chosen.length === MATCH_PAIRS) break;
  }
  return shuffle(
    chosen.flatMap((qi) => [
      { id: `q${qi}`, pair: qi, side: "q" as const },
      { id: `a${qi}`, pair: qi, side: "a" as const },
    ]),
  );
}

const bestKey = (deckId: string) => `bb_match_best_${deckId}`;
const readBest = (deckId: string) => {
  try {
    const n = Number(localStorage.getItem(bestKey(deckId)));
    return n > 0 ? n : null;
  } catch {
    return null;
  }
};

export function DeckMatch({
  questions,
  deckId,
}: {
  questions: Question[];
  deckId: string;
}) {
  const [round, setRound] = useState(0);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const tiles = useMemo(() => buildMatch(questions), [questions, round]);
  const [selected, setSelected] = useState<string | null>(null);
  const [matched, setMatched] = useState<number[]>([]);
  const [miss, setMiss] = useState<string[]>([]);
  const [startedAt, setStartedAt] = useState<number | null>(null);
  const [endedAt, setEndedAt] = useState<number | null>(null);
  const [now, setNow] = useState(0);
  const [best, setBest] = useState(() => readBest(deckId));
  const pairs = tiles.length / 2;
  const done = pairs > 0 && matched.length === pairs;

  // The clock: a tick every 100ms while a round is running, stopped when it ends.
  useEffect(() => {
    if (startedAt === null || endedAt !== null) return;
    const t = setInterval(() => setNow(Date.now()), 100);
    return () => clearInterval(t);
  }, [startedAt, endedAt]);

  // A wrong pair shows for half a second, then clears.
  useEffect(() => {
    if (miss.length === 0) return;
    const t = setTimeout(() => setMiss([]), 500);
    return () => clearTimeout(t);
  }, [miss]);

  const seconds =
    startedAt === null ? 0 : ((endedAt ?? now) - startedAt) / 1000;

  const tap = (tile: Tile) => {
    if (done || matched.includes(tile.pair)) return;
    if (startedAt === null) {
      setStartedAt(Date.now());
      setNow(Date.now());
    }
    if (selected === null || selected === tile.id) {
      setSelected(selected === tile.id ? null : tile.id);
      return;
    }
    const first = tiles.find((t) => t.id === selected)!;
    setSelected(null);
    if (first.pair === tile.pair && first.side !== tile.side) {
      const next = [...matched, tile.pair];
      setMatched(next);
      if (next.length === pairs) {
        const end = Date.now();
        setEndedAt(end);
        const time = (end - (startedAt ?? end)) / 1000;
        if (best === null || time < best) {
          setBest(time);
          try {
            localStorage.setItem(bestKey(deckId), String(time));
          } catch {
            /* private mode: the best time just is not kept */
          }
        }
      }
    } else {
      setMiss([first.id, tile.id]);
    }
  };

  const again = () => {
    setSelected(null);
    setMatched([]);
    setMiss([]);
    setStartedAt(null);
    setEndedAt(null);
    setRound((r) => r + 1);
  };

  return (
    <div>
      <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
        <p className="text-sm font-semibold text-[var(--site-quiet)]">
          {done
            ? `All ${pairs} matched in ${seconds.toFixed(1)} s.`
            : startedAt === null
              ? "Tap a question, then its answer. The clock starts on your first tap."
              : `${matched.length} of ${pairs} matched`}
        </p>
        <p
          className="font-extrabold tabular-nums text-[var(--bb-deep)] [font-family:var(--site-display)]"
          aria-hidden
        >
          {seconds.toFixed(1)} s
        </p>
      </div>
      {done ? (
        <div className="rv-card-box p-5">
          <p className="rv-eyebrow">Match</p>
          <p className="mt-1 text-2xl font-extrabold text-[var(--bb-deep)] [font-family:var(--site-display)]">
            {seconds.toFixed(1)} seconds.
          </p>
          <p className="mt-1 text-[var(--site-quiet)]">
            {best !== null && best < seconds - 0.05
              ? `Your best here is ${best.toFixed(1)} s.`
              : "Your best on this deck so far."}
          </p>
          <button type="button" className="rv-btn mt-4" onClick={again}>
            Play again
          </button>
        </div>
      ) : (
        <ul className="grid grid-cols-2 gap-3 md:grid-cols-3">
          {tiles.map((tile) => {
            const q = questions[tile.pair]!;
            const gone = matched.includes(tile.pair);
            return (
              <li key={tile.id}>
                <button
                  type="button"
                  className="rv-match"
                  data-side={tile.side}
                  data-state={
                    gone
                      ? "matched"
                      : miss.includes(tile.id)
                        ? "miss"
                        : selected === tile.id
                          ? "selected"
                          : undefined
                  }
                  aria-pressed={selected === tile.id}
                  disabled={gone}
                  onClick={() => tap(tile)}
                >
                  {tile.side === "q" ? (
                    <>
                      <MathHtml html={q.q} className="text-sm font-bold" />
                      {q.image && <Figure src={q.image} crop={q.imageCrop} />}
                    </>
                  ) : (
                    <MathHtml html={answerOf(q)} className="font-bold" />
                  )}
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ Write -- */

/**
 * Write: one card at a time, type the answer, then see the real one beside it. An exact
 * match (ignoring case and punctuation) counts as right on its own; anything else is yours
 * to judge, as Quizlet's "I was right" lets you, because a written answer can be right in
 * other words. The verdict is saved as the card's rating, the same one the flashcards use.
 */
export function DeckWrite({
  questions,
  onRate,
}: {
  questions: Question[];
  onRate: ((num: number, s: Status) => void) | null;
}) {
  const [round, setRound] = useState(0);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const order = useMemo(
    () => shuffle(questions.map((_, i) => i)),
    [questions, round],
  );
  const [pos, setPos] = useState(0);
  const [typed, setTyped] = useState("");
  const [shown, setShown] = useState(false);
  const [right, setRight] = useState(0);
  // Type the name, or draw the structure (owner, 2026-10-16). Kept across cards, so a
  // student who chose to draw keeps drawing; a card with no product falls back to typing.
  const [method, setMethod] = useState<"type" | "draw">("type");
  const [drawOk, setDrawOk] = useState<boolean | null>(null);
  // A ref is a handle on the real input element, so the next card can put the cursor
  // back in the field without a click (the button that was pressed has just gone).
  const inputRef = useRef<HTMLInputElement>(null);
  useEffect(() => {
    if (pos > 0) inputRef.current?.focus();
  }, [pos]);

  const done = pos >= order.length;
  const qi = order[pos];
  const q = qi === undefined ? undefined : questions[qi];
  const drawing = method === "draw" && q?.product !== undefined;
  const exact = q !== undefined && shown && (drawing ? drawOk === true : same(typed, answerOf(q)));

  const verdict = (ok: boolean) => {
    if (qi === undefined) return;
    onRate?.(qi + 1, ok ? "green" : "red");
    if (ok) setRight((r) => r + 1);
    setTyped("");
    setShown(false);
    setDrawOk(null);
    setPos((p) => p + 1);
  };
  const again = () => {
    setPos(0);
    setRight(0);
    setTyped("");
    setShown(false);
    setDrawOk(null);
    setRound((r) => r + 1);
  };

  if (done || !q) {
    return (
      <div className="rv-card-box p-5">
        <p className="rv-eyebrow">Write</p>
        <p className="mt-1 text-2xl font-extrabold text-[var(--bb-deep)] [font-family:var(--site-display)]">
          {right} of {order.length} right.
        </p>
        <p className="mt-1 text-[var(--site-quiet)]">
          The ones you missed are rated Missed, so they come back in Learn.
        </p>
        <button type="button" className="rv-btn mt-4" onClick={again}>
          Write them again
        </button>
      </div>
    );
  }

  return (
    <div className="rv-card-box p-5">
      <p className="rv-eyebrow mb-3" aria-live="polite">
        Write: card {pos + 1} of {order.length}
      </p>
      <Front q={q} />
      {q.product !== undefined && (
        <div className="rv-method mt-4" role="group" aria-label="Answer by">
          <button type="button" className="rv-chip" aria-pressed={!drawing} onClick={() => setMethod("type")}>
            Type it
          </button>
          <button type="button" className="rv-chip" aria-pressed={drawing} onClick={() => setMethod("draw")}>
            Draw it
          </button>
        </div>
      )}
      <form
        className="mt-4 flex flex-col gap-3"
        onSubmit={(e) => {
          e.preventDefault();
          if (!shown) setShown(true);
          // Enter moves on only after a match; a near miss waits for your own verdict.
          else if (exact) verdict(true);
        }}
      >
        {drawing ? (
          <>
            <p className="text-sm font-semibold text-[var(--site-quiet)]">Draw the product</p>
            <Suspense fallback={<Loader variant="dots" size="sm" text="Loading the editor" />}>
              <WriteDraw
                // A new card is a fresh, empty canvas.
                key={qi}
                expected={q.product!}
                disabled={shown}
                onChecked={(ok) => {
                  setDrawOk(ok);
                  setShown(true);
                }}
              />
            </Suspense>
          </>
        ) : (
          <>
            <label
              className="text-sm font-semibold text-[var(--site-quiet)]"
              htmlFor="write-answer"
            >
              Type the answer
            </label>
            <input
              id="write-answer"
              ref={inputRef}
              className="rv-input"
              value={typed}
              readOnly={shown}
              autoComplete="off"
              autoFocus
              onChange={(e) => setTyped(e.target.value)}
            />
          </>
        )}
        {!shown ? (
          <div className="flex flex-wrap gap-3">
            {!drawing && (
              <button type="submit" className="rv-btn">
                Check
              </button>
            )}
            <button
              type="button"
              className="rv-flat"
              onClick={() => {
                if (drawing) setDrawOk(false);
                setShown(true);
              }}
            >
              I don&apos;t know
            </button>
          </div>
        ) : (
          <>
            <div className="rv-answer" data-mark={exact ? "right" : undefined}>
              <p className="rv-eyebrow">{exact ? "Right" : "The answer"}</p>
              {q.badge && (
                <span className="rv-badge mt-2 inline-block">{q.badge}</span>
              )}
              {q.mc && (
                <MathHtml
                  html={answerOf(q)}
                  className="mt-2 font-bold text-[var(--bb-deep)]"
                />
              )}
              <MathHtml html={q.a} className="rv-a mt-2" />
              {q.image && (
                <div className="mt-3 max-w-md">
                  <Figure src={q.image} />
                </div>
              )}
            </div>
            {exact ? (
              <button type="submit" className="rv-btn">
                Next card
              </button>
            ) : drawing ? (
              <div className="flex flex-wrap gap-3">
                <button
                  type="button"
                  className="rv-btn2"
                  onClick={() => {
                    setShown(false);
                    setDrawOk(null);
                  }}
                >
                  Try again
                </button>
                <button type="button" className="rv-btn" onClick={() => verdict(false)}>
                  Next card
                </button>
              </div>
            ) : (
              <div className="flex flex-wrap gap-3">
                <button
                  type="button"
                  className="rv-btn2"
                  onClick={() => verdict(true)}
                >
                  I was right
                </button>
                <button
                  type="button"
                  className="rv-btn"
                  onClick={() => verdict(false)}
                >
                  Not quite, next card
                </button>
              </div>
            )}
          </>
        )}
      </form>
    </div>
  );
}
