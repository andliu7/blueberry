/**
 * Mistakes, at #/app/mistakes. The list of questions a student missed in
 * lessons, and a practice run over them.
 *
 * Shape, from Duolingo's "Review your recent mistakes" (Mobbin, checked 29
 * Oct): a title, one big start button, a count, then a row per mistake with
 * the question type and its words and a red dot. Brilliant's review adds the
 * explanation after a miss. The addition here is the WHY STEP: after a wrong
 * answer in practice the student picks why before Continue goes live.
 *
 * Calm and decision-light: one action at the bottom, always in the same place.
 */

import { useState, useSyncExternalStore } from "react";
import { Press } from "../app/ui/Press";
import { hrefForTab } from "../app/routes";
import { PoolItemsStep } from "../beats/PoolItemsStep";
import { WHY_OPTIONS, mistakeBank, whyLabel, type WhyId } from "./mistakeBank";
import { canMoveOn, lessonTitle, mistakeTitle, practiceQueue, requeueOnMiss, type Playable } from "./practiceModel";
import "./mistakes.css";

const leave = () => {
  window.location.hash = hrefForTab("pathway");
};

function CloseIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-6 w-6" aria-hidden focusable="false">
      <path d="M6 6l12 12M18 6 6 18" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
    </svg>
  );
}

export default function MistakesPage() {
  const snapshot = useSyncExternalStore(mistakeBank.subscribe, mistakeBank.getSnapshot);
  const [queue, setQueue] = useState<readonly Playable[] | null>(null);
  const [summary, setSummary] = useState<{ fixed: number } | null>(null);
  const waiting = practiceQueue(snapshot);

  if (queue !== null) {
    return (
      <Run
        queue={queue}
        setQueue={setQueue}
        onFinish={(fixed) => {
          setQueue(null);
          setSummary({ fixed });
        }}
      />
    );
  }

  return (
    <div className="mistakes">
      <header className="mistakes__top">
        <button type="button" className="mistakes__x" aria-label="Back to the pathway" onClick={leave}>
          <CloseIcon />
        </button>
        <h1>Review your mistakes</h1>
      </header>

      <main className="mistakes__body">
        {summary !== null ? (
          <p className="mistakes__note" role="status">
            {summary.fixed === 0 ? "None fixed yet. They stay here until they stick." : `${summary.fixed} fixed. Nice.`}
          </p>
        ) : null}
        {waiting.length === 0 ? (
          <p className="mistakes__empty">Nothing to review. Questions you miss in a lesson show up here.</p>
        ) : (
          <>
            <h2 className="mistakes__count">{waiting.length === 1 ? "1 mistake" : `${waiting.length} mistakes`}</h2>
            <ul className="mistakes__list">
              {waiting.map((play) => (
                <li key={play.mistake.key} className="mistakes__row">
                  <span className="mistakes__row-text">
                    <span className="mistakes__row-kind">{lessonTitle(play.mistake.node) || "Lesson"}</span>
                    <span className="mistakes__row-title">{mistakeTitle(play)}</span>
                    {play.mistake.why !== null ? <span className="mistakes__row-why">{whyLabel(play.mistake.why)}</span> : null}
                  </span>
                  <span className="mistakes__dot" role="img" aria-label="Not fixed yet" />
                </li>
              ))}
            </ul>
          </>
        )}
      </main>

      <footer className="mistakes__bar">
        <Press
          block
          size="lg"
          disabled={waiting.length === 0}
          onClick={() => {
            setSummary(null);
            setQueue(waiting);
          }}
        >
          {waiting.length === 0 ? "All clear" : "Practice these"}
        </Press>
      </footer>
    </div>
  );
}

/* ---------------------------------------------------------------- the run -- */

function Run({
  queue,
  setQueue,
  onFinish,
}: {
  readonly queue: readonly Playable[];
  readonly setQueue: (queue: readonly Playable[]) => void;
  readonly onFinish: (fixed: number) => void;
}) {
  const [index, setIndex] = useState(0);
  const [picked, setPicked] = useState<string | null>(null);
  const [checked, setChecked] = useState(false);
  /** The draw step reports its own result; null while it is still being played. */
  const [drawMissed, setDrawMissed] = useState<boolean | null>(null);
  const [why, setWhy] = useState<WhyId | null>(null);
  const [retried, setRetried] = useState<ReadonlySet<string>>(new Set());
  const [fixed, setFixed] = useState(0);

  const current = queue[index];
  if (current === undefined) {
    // The run is over: hand back to the list after this render.
    queueMicrotask(() => onFinish(fixed));
    return null;
  }

  const missed = current.kind === "mcq" ? checked && picked !== current.beat.correctOptionId : drawMissed === true;
  const answered = current.kind === "mcq" ? checked : drawMissed !== null;

  const next = () => {
    const { key } = current.mistake;
    if (answered && !missed) {
      mistakeBank.markFixed(key);
      setFixed((n) => n + 1);
    }
    if (missed) {
      if (why !== null) mistakeBank.setWhy(key, why);
      setQueue(requeueOnMiss(queue, index, retried));
      setRetried(new Set([...retried, key]));
    }
    setIndex(index + 1);
    setPicked(null);
    setChecked(false);
    setDrawMissed(null);
    setWhy(null);
  };

  const pickedOption = current.kind === "mcq" ? current.beat.options.find((o) => o.id === picked) : undefined;
  const correctOption = current.kind === "mcq" ? current.beat.options.find((o) => o.id === current.beat.correctOptionId) : undefined;

  return (
    <div className="mistakes">
      <header className="mistakes__top">
        <button type="button" className="mistakes__x" aria-label="Stop practice" onClick={() => onFinish(fixed)}>
          <CloseIcon />
        </button>
        <div className="mistakes__progress" role="progressbar" aria-valuemin={0} aria-valuemax={queue.length} aria-valuenow={index}>
          <span style={{ width: `${(index / queue.length) * 100}%` }} />
        </div>
      </header>

      <main className="mistakes__body" key={`${current.mistake.key}:${index}`}>
        {current.kind === "mcq" ? (
          <>
            <p className="mistakes__row-kind">{lessonTitle(current.mistake.node)}</p>
            <h2 className="mistakes__q">{current.beat.prompt}</h2>
            {current.beat.brief !== undefined ? <p className="mistakes__brief">{current.beat.brief}</p> : null}
            <div className="mistakes__options" role="radiogroup" aria-label="Answers">
              {current.beat.options.map((option) => {
                const state =
                  checked && option.id === current.beat.correctOptionId
                    ? "is-right"
                    : checked && option.id === picked
                      ? "is-wrong"
                      : option.id === picked
                        ? "is-picked"
                        : "";
                return (
                  <button
                    key={option.id}
                    type="button"
                    role="radio"
                    aria-checked={option.id === picked}
                    disabled={checked}
                    className={`mistakes__option ${state}`}
                    onClick={() => setPicked(option.id)}
                  >
                    {option.text}
                  </button>
                );
              })}
            </div>
            {checked ? (
              <section className="mistakes__explain" role="status">
                <strong>{missed ? "Not yet" : "That is it"}</strong>
                <p>{(missed ? pickedOption?.why : correctOption?.why) ?? ""}</p>
                {missed && correctOption !== undefined ? (
                  <p>
                    The answer: <b>{correctOption.text}</b>. {correctOption.why ?? ""}
                  </p>
                ) : null}
              </section>
            ) : null}
          </>
        ) : (
          <PoolItemsStep key={current.mistake.key} entries={[current.entry]} onDone={(cleared, total) => setDrawMissed(cleared < total)} />
        )}

        {missed ? <WhyStep value={why} onChange={setWhy} /> : null}
      </main>

      <footer className="mistakes__bar">
        {current.kind === "mcq" && !checked ? (
          <Press block size="lg" disabled={picked === null} onClick={() => setChecked(true)}>
            Check
          </Press>
        ) : answered ? (
          <Press block size="lg" disabled={!canMoveOn(missed, why)} onClick={next}>
            {missed && why === null ? "Pick why to go on" : "Continue"}
          </Press>
        ) : null}
      </footer>
    </div>
  );
}

/** The why-step: say what happened, in the student's own pick. Required after a miss. */
function WhyStep({ value, onChange }: { readonly value: WhyId | null; readonly onChange: (why: WhyId) => void }) {
  return (
    <section className="mistakes__why" aria-label="Why did it go wrong?">
      <h3>Why did that one slip?</h3>
      <div className="mistakes__chips" role="radiogroup" aria-label="Why it went wrong">
        {WHY_OPTIONS.map((option) => (
          <button
            key={option.id}
            type="button"
            role="radio"
            aria-checked={value === option.id}
            className={`mistakes__chip ${value === option.id ? "is-on" : ""}`}
            onClick={() => onChange(option.id)}
          >
            {option.label}
          </button>
        ))}
      </div>
    </section>
  );
}
