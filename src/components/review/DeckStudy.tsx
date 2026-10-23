import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import type { Question } from "@/data/types";
import type { Status } from "@/components/QuestionCard";
import { MathHtml } from "@/components/ui/math-html";
import { RATING_WORDS } from "@/lib/reviewProgress";
import { maskableScheme } from "@/lib/deckFilters";
import { clamp } from "@/lib/helpers";

/**
 * The study card at the top of a deck (SITE-REPLAN.md phase 7): one card at a time,
 * held like a deck, that flips and tilts.
 *
 * THE BAR. Quizlet's set page opens on its flashcard (title, then the card, "Click the
 * card to flip"); Anki's review screen hides the answer behind one button and then asks
 * how it went; Duolingo answers every press on the first frame. So: the card, a "Show
 * answer" button under it, then three rate buttons once it is turned over.
 *
 * ONE PRESS, THREE MEANINGS, decided by how the press ends:
 * - a tap (released before HOLD_MS, without moving) flips the card;
 * - a hold (still down at HOLD_MS) tilts the card toward the finger, up to 8deg, and
 *   letting go puts it back WITHOUT flipping (owner, 30 Sep: tilt without showing the
 *   other side);
 * - a sideways drag past SWIPE_PX moves to the next or previous card.
 * The keyboard gets the same: Space tapped flips, Space held tilts, Enter flips, the
 * arrows move, and 1, 2, 3 rate a turned card (Anki's number keys).
 */

/** How long a press has to stay down before it is a hold, not a tap. */
const HOLD_MS = 300;
/** How far a sideways drag has to travel before it changes card. */
const SWIPE_PX = 80;
/** The most the hold tilts, either way (motion.md item 17). */
const TILT_DEG = 8;

/** The three rate buttons, left to right: the one you did not know first. */
const RATES: { status: Exclude<Status, "none">; key: string }[] = [
  { status: "red", key: "1" },
  { status: "yellow", key: "2" },
  { status: "green", key: "3" },
];

export function DeckStudy({
  questions,
  queue,
  status,
  onRate,
  onStudyAgain,
  label,
}: {
  questions: Question[];
  /** Which questions to go through, as indexes into `questions`, in order. */
  queue: number[];
  status: Record<number, Status>;
  /** Null when the deck turned ratings off: the card then has a Next button instead. */
  onRate: ((num: number, s: Status) => void) | null;
  /** Start again over a new set of cards, from the end-of-deck panel. */
  onStudyAgain: (which: "missed" | "all") => void;
  /** Says what this pass is, e.g. "Every card" or "Missed and Unsure". */
  label: string;
}) {
  const [pos, setPos] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [held, setHeld] = useState(false);
  const tiltRef = useRef<HTMLDivElement>(null);

  const total = queue.length;
  const done = pos >= total;
  const qi = queue[pos];
  const item = qi === undefined ? undefined : questions[qi];

  const go = useCallback(
    (step: number) => {
      setFlipped(false);
      setPos((p) => Math.max(0, Math.min(total, p + step)));
    },
    [total],
  );
  const flip = useCallback(() => setFlipped((f) => !f), []);
  const rate = useCallback(
    (s: Status) => {
      if (qi === undefined || !onRate) return;
      onRate(qi + 1, s);
      go(1);
    },
    [qi, onRate, go],
  );

  /**
   * The tilt and the swipe write CSS variables straight onto the card's node rather
   * than going through React state. A pointer move fires sixty times a second, and
   * re-rendering the card (and re-typesetting its maths) on every one would stutter.
   */
  const setVars = (vars: Record<string, string>) => {
    const el = tiltRef.current;
    if (!el) return;
    for (const [k, v] of Object.entries(vars)) el.style.setProperty(k, v);
  };
  const tiltToward = (clientX: number, clientY: number) => {
    const el = tiltRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const px = r.width ? (clientX - r.left) / r.width - 0.5 : 0;
    const py = r.height ? (clientY - r.top) / r.height - 0.5 : 0;
    // The side under the finger dips away, as a card pressed at one corner does.
    setVars({ "--rv-rx": `${clamp(py * 2 * TILT_DEG, -TILT_DEG, TILT_DEG)}deg`, "--rv-ry": `${clamp(-px * 2 * TILT_DEG, -TILT_DEG, TILT_DEG)}deg` });
  };
  const rest = () => {
    setVars({ "--rv-rx": "0deg", "--rv-ry": "0deg", "--rv-dx": "0px", "--rv-rz": "0deg" });
    tiltRef.current?.removeAttribute("data-live");
    setHeld(false);
  };

  // One gesture at a time, kept in a ref because it changes on every move and nothing
  // on screen needs to re-render for it.
  const gesture = useRef<{
    x: number;
    y: number;
    mode: "press" | "hold" | "drag" | "cancel";
    timer: ReturnType<typeof setTimeout>;
  } | null>(null);

  const startHold = (onHold: () => void) =>
    setTimeout(() => {
      if (!gesture.current || gesture.current.mode !== "press") return;
      gesture.current.mode = "hold";
      tiltRef.current?.setAttribute("data-live", "");
      setHeld(true);
      onHold();
    }, HOLD_MS);

  const onPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (e.button !== 0) return;
    e.currentTarget.setPointerCapture?.(e.pointerId);
    const { clientX: x, clientY: y } = e;
    gesture.current = { x, y, mode: "press", timer: startHold(() => tiltToward(x, y)) };
  };
  const onPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    const g = gesture.current;
    if (!g) return;
    const dx = e.clientX - g.x;
    const dy = e.clientY - g.y;
    if (g.mode === "press" && Math.hypot(dx, dy) > 10) {
      clearTimeout(g.timer);
      g.mode = Math.abs(dx) > Math.abs(dy) ? "drag" : "cancel";
      if (g.mode === "drag") tiltRef.current?.setAttribute("data-live", "");
    }
    if (g.mode === "hold") tiltToward(e.clientX, e.clientY);
    if (g.mode === "drag") setVars({ "--rv-dx": `${dx}px`, "--rv-rz": `${dx / 24}deg` });
  };
  const onPointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    const g = gesture.current;
    gesture.current = null;
    if (!g) return;
    clearTimeout(g.timer);
    const dx = e.clientX - g.x;
    rest();
    if (g.mode === "press") flip();
    else if (g.mode === "drag" && Math.abs(dx) >= SWIPE_PX) go(dx < 0 ? 1 : -1);
  };
  const onPointerCancel = () => {
    if (gesture.current) clearTimeout(gesture.current.timer);
    gesture.current = null;
    rest();
  };

  /**
   * Keys for the whole page while no other control has focus, so a student can open a
   * deck and press Space without first finding the card. A button, link or field that
   * has focus keeps its own keys.
   */
  useEffect(() => {
    const owned = (t: EventTarget | null) => {
      const el = t as HTMLElement | null;
      if (!el || el === document.body || el === tiltRef.current) return true;
      return !el.closest("a, button, input, textarea, select, [contenteditable], [role='tab']");
    };
    const down = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey || !owned(e.target) || done) return;
      if (e.key === " " || e.code === "Space") {
        e.preventDefault(); // otherwise the page scrolls a screen
        if (e.repeat || gesture.current) return;
        gesture.current = {
          x: 0,
          y: 0,
          mode: "press",
          // A held key has no finger position, so it tilts toward the lower right corner.
          timer: startHold(() => setVars({ "--rv-rx": `${TILT_DEG * 0.75}deg`, "--rv-ry": `${-TILT_DEG}deg` })),
        };
      } else if (e.key === "Enter" && e.target === tiltRef.current) {
        e.preventDefault();
        flip();
      } else if (e.key === "ArrowRight" || e.key === "ArrowLeft") {
        e.preventDefault();
        go(e.key === "ArrowRight" ? 1 : -1);
      } else if (flipped && onRate) {
        const r = RATES.find((x) => x.key === e.key);
        if (r) rate(r.status);
      }
    };
    const up = (e: KeyboardEvent) => {
      if (e.key !== " " && e.code !== "Space") return;
      const g = gesture.current;
      if (!g) return;
      gesture.current = null;
      clearTimeout(g.timer);
      rest();
      if (g.mode === "press") flip();
    };
    window.addEventListener("keydown", down);
    window.addEventListener("keyup", up);
    return () => {
      window.removeEventListener("keydown", down);
      window.removeEventListener("keyup", up);
    };
    // `startHold`, `setVars` and `rest` only touch refs and setters, so they are safe to
    // leave out; listing them would re-bind the keys on every render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [done, flipped, onRate, rate, go, flip]);

  return (
    <section aria-label="Study" className="pb-2">
      {/* Where you are, in words: "Card 3 of 44", never a bare "3 / 44". */}
      <div className="mb-3 flex items-center justify-between gap-3">
        <p className="text-sm font-semibold text-[var(--site-quiet)]" aria-live="polite">
          {done ? `${label}: finished` : `${label}: card ${pos + 1} of ${total}`}
        </p>
        <div className="flex items-center">
          <button type="button" className="rv-flat" onClick={() => go(-1)} disabled={pos === 0} aria-label="Previous card">
            <ChevronLeft aria-hidden className="size-5" />
          </button>
          <button type="button" className="rv-flat" onClick={() => go(1)} disabled={done} aria-label="Next card">
            <ChevronRight aria-hidden className="size-5" />
          </button>
        </div>
      </div>

      <div className="rv-stage">
        {/* The rest of the deck, under the top card, so it reads as a deck in the hand. */}
        {total - pos > 2 && <div aria-hidden className="rv-peek" data-depth="2" />}
        {total - pos > 1 && <div aria-hidden className="rv-peek" data-depth="1" />}

        {done || !item || qi === undefined ? (
          <EndOfDeck questions={questions} queue={queue} status={status} onStudyAgain={onStudyAgain} />
        ) : (
          <div
            // Keyed by the card, so the next card arrives question side up instead of
            // turning back over in front of you (a new key makes React mount a new node).
            key={qi}
            ref={tiltRef}
            className="rv-tilt"
            data-held={held ? "" : undefined}
            role="button"
            tabIndex={0}
            aria-pressed={flipped}
            aria-label={`Card ${pos + 1} of ${total}, ${flipped ? "answer" : "question"} side. Press to flip.`}
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
            onPointerCancel={onPointerCancel}
            onContextMenu={(e) => e.preventDefault()}
          >
            <div className="rv-flip" data-flipped={flipped ? "" : undefined}>
              <div className="rv-face rv-face--front" aria-hidden={flipped}>
                <CardFront item={item} />
              </div>
              <div className="rv-face rv-face--back" aria-hidden={!flipped}>
                <CardBack item={item} />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Under the card: Anki's order. One button to turn it, then how it went. */}
      {!done && (
        <div className="mt-8 flex gap-3">
          {!flipped ? (
            <button type="button" className="rv-btn w-full" onClick={flip}>
              Show answer
            </button>
          ) : onRate ? (
            RATES.map((r) => (
              <button key={r.status} type="button" className="rv-rate" data-rate={r.status} onClick={() => rate(r.status)}>
                {RATING_WORDS[r.status]}
              </button>
            ))
          ) : (
            <button type="button" className="rv-btn w-full" onClick={() => go(1)}>
              Next card
            </button>
          )}
        </div>
      )}

      <p className="rv-keys mt-3 text-sm text-[var(--site-quiet)]">
        <kbd>Space</kbd> flips, hold it to tilt. <kbd>&larr;</kbd> <kbd>&rarr;</kbd> move.
        {onRate && (
          <>
            {" "}
            <kbd>1</kbd> <kbd>2</kbd> <kbd>3</kbd> rate a turned card.
          </>
        )}
      </p>
    </section>
  );
}

/**
 * Whether the deck page has its reagents switch off. A context (React's way to hand a
 * value to every component below a provider without passing it as a prop through each
 * one) because Figure is drawn from six places across the study modes.
 */
export const ReagentsHiddenContext = createContext(false);

/** A drawing, with the answer's side of it masked until the card turns over. */
export function Figure({ src, crop }: { src: string; crop?: string }) {
  // The mask is a fraction of the drawing, and the image inside is held at the full
  // width, so the hidden part is cut off rather than squashed (QuestionCard's CardImage).
  const keep = crop ? 1 - parseFloat(crop) / 100 : 1;
  const hideReagents = useContext(ReagentsHiddenContext) && maskableScheme(src);
  return (
    <div className="rv-figure" style={{ width: `${keep * 100}%` }}>
      {/* The full drawing's own box, so the reagent masks below are placed in its
          coordinates (make_flashcards.py scheme()) whatever the crop. */}
      <div className="rv-figure__art" style={{ width: `${100 / keep}%` }}>
        <img src={`${import.meta.env.BASE_URL}cards/${src}`} alt="" draggable={false} />
        {hideReagents && (
          <>
            {/* The reagent is the blank, so the patch over the arrow says so in a
                dashed box (owner, 21 Oct: a bare "?" was confusing), the same
                blank as the game's cards and lesson schemes. */}
            <span className="rv-reagent-mask rv-reagent-mask--above" aria-hidden>
              <span className="rv-reagent-blank">Which reagent?</span>
            </span>
            <span className="rv-reagent-mask rv-reagent-mask--below" aria-hidden />
          </>
        )}
      </div>
    </div>
  );
}

function CardFront({ item }: { item: Question }) {
  return (
    <>
      {/* A plain question sits in the middle of the card, as Quizlet's do; one with a
          drawing or options starts at the top so they fit. */}
      <MathHtml html={item.q} className={item.image || item.mc ? "rv-q" : "rv-q rv-q--solo my-auto"} />
      {item.image && <Figure src={item.image} crop={item.imageCrop} />}
      {item.mc && (
        <ol className="space-y-1.5">
          {item.options.map((o, i) => (
            <li key={i} className="flex gap-2">
              <span className="font-bold text-[var(--site-nav-ink)]">{String.fromCharCode(65 + i)}</span>
              <MathHtml html={o} />
            </li>
          ))}
        </ol>
      )}
      <p className={item.image || item.mc ? "mt-auto pt-2 text-sm text-[var(--site-quiet)]" : "text-center text-sm text-[var(--site-quiet)]"}>
        Tap to flip, hold to tilt
      </p>
    </>
  );
}

function CardBack({ item }: { item: Question }) {
  const correct = item.mc ? (Array.isArray(item.correct) ? item.correct : [item.correct]) : [];
  return (
    <>
      <p className="rv-eyebrow">Answer</p>
      {item.image && <Figure src={item.image} />}
      {item.badge && <span className="rv-badge">{item.badge}</span>}
      {item.mc && (
        <ul className="space-y-1.5">
          {correct.map((i) => (
            <li key={i} className="flex gap-2 font-semibold text-[var(--bb-deep)]">
              <span className="text-[var(--site-nav-ink)]">{String.fromCharCode(65 + i)}</span>
              <MathHtml html={item.options[i] ?? ""} />
            </li>
          ))}
        </ul>
      )}
      <MathHtml html={item.a} className="rv-a" />
    </>
  );
}

/** Where the pass ends: what it came to, in words, and where to go next. */
function EndOfDeck({
  questions,
  queue,
  status,
  onStudyAgain,
}: {
  questions: Question[];
  queue: number[];
  status: Record<number, Status>;
  onStudyAgain: (which: "missed" | "all") => void;
}) {
  const left = questions.filter((_, i) => {
    const s = status[i + 1];
    return s === "red" || s === "yellow";
  }).length;
  return (
    <div className="rv-card-box absolute inset-0 flex flex-col items-start justify-center gap-4 p-6">
      <p className="rv-eyebrow">End of the deck</p>
      <p className="text-2xl font-extrabold text-[var(--bb-deep)] [font-family:var(--site-display)]">
        {left === 0 ? "Nothing left to learn here." : `${left} ${left === 1 ? "card" : "cards"} still to learn.`}
      </p>
      <p className="text-[var(--site-quiet)]">You went through {queue.length} {queue.length === 1 ? "card" : "cards"} this time.</p>
      <div className="flex flex-wrap gap-3">
        {left > 0 && (
          <button type="button" className="rv-btn" onClick={() => onStudyAgain("missed")}>
            Study the {left} again
          </button>
        )}
        <button type="button" className="rv-btn2" onClick={() => onStudyAgain("all")}>
          Start over
        </button>
      </div>
    </div>
  );
}
