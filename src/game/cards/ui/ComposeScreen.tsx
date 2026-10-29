/**
 * Writing a card. Read this header before trusting anything in this file.
 *
 * ONE OBVIOUS PATH (28 Oct rebuild). The screen opens on the thing most cards
 * are: a question and its answer. Type, pick a type if the default is wrong
 * (short answer, long answer, pick one, pick many), press Add card. Enter in
 * the short answer saves, Ctrl+Enter saves anywhere, and the question is
 * focused again, so five cards is five short bursts of typing and no other
 * taps. The deck, the note and the preview are one line each and closed until
 * asked for. The reaction card is a link at the bottom, not a peer of the
 * question.
 *
 * TWO SHAPES, ONE FORM. A reaction card (start, conditions, product, plus an
 * optional temperature and the concepts behind the reveal) and a question
 * card (four types, see composer.ts). The mapping from draft to Card is
 * composer.ts's, tested there; this file only collects the words.
 *
 * THE PREVIEW IS THE REAL FACE. The card under the form is CardFace, the
 * component the review run draws, so what a student writes is exactly what
 * they will be asked. Tap it to see the back.
 *
 * NO DRAWINGS HERE, on purpose. A student's own card is their words; there is
 * no checked structure behind them, and drawing one would be the invented
 * chemistry the derive-never-recall rule forbids.
 *
 * WHERE IT GOES. Any deck the student owns, or a new one named here. The
 * default is "My cards", the deck saved reactions and mistakes land in.
 */

import { useRef, useState } from "react";
import type { Card, CardQuizKind, DeckId, DeckSnapshot, DeckSource } from "../types";
import { REVEAL_LABELS } from "../types";
import { PERSONAL_DECK_ID, PERSONAL_DECK_TITLE } from "../store";
import { CardFace } from "./CardFace";
import {
  COMPOSER_REVEAL_FIELDS,
  EMPTY_EXTRAS,
  EMPTY_QUIZ,
  EMPTY_SIDES,
  QUIZ_KINDS,
  QUIZ_LABELS,
  SIDE_HINTS,
  addOption,
  cardFromDraft,
  deckTitleProblem,
  draftProblems,
  newDeckId,
  quizCardFromDraft,
  quizProblems,
  removeOption,
  setExtra,
  setOption,
  setQuizKind,
  setSide,
  toggleCorrect,
  type DraftExtras,
  type QuizDraft,
} from "./composer";
import { MISTAKES_DECK_ID } from "./landing";
import "./cards.css";

export interface ComposeScreenProps {
  readonly snapshot: DeckSnapshot;
  readonly source: DeckSource;
  readonly onBack: () => void;
}

type Shape = "reaction" | "question";

/** The sentinel option in the deck menu that asks for a new deck's name. */
const NEW_DECK = "__new__";

const FIELD = "w-full rounded-xl border-2 border-bb-border bg-bb-card px-3 py-2.5 text-scale-base text-bb-card-foreground";
const LABEL = "flex flex-col gap-1 text-scale-sm font-semibold";
const QUIET = "cursor-pointer text-scale-sm font-semibold text-bb-muted-foreground";

const KIND_HELP: Readonly<Record<CardQuizKind, string>> = {
  short: "A word, a name or a line.",
  long: "Written out. You or your own AI check it later.",
  mcq: "Several options, one is right.",
  multi: "Several options, more than one is right.",
};

/** The option inputs inside one options group, in order. */
function optionInputs(from: HTMLElement): HTMLInputElement[] {
  return Array.from(from.closest("fieldset")?.querySelectorAll("input") ?? []);
}

export function ComposeScreen({ snapshot, source, onBack }: ComposeScreenProps) {
  const [shape, setShape] = useState<Shape>("question");
  const [sides, setSides] = useState(EMPTY_SIDES);
  const [extras, setExtras] = useState<DraftExtras>(EMPTY_EXTRAS);
  const [quiz, setQuiz] = useState<QuizDraft>(EMPTY_QUIZ);
  const [deckId, setDeckId] = useState<string>(PERSONAL_DECK_ID);
  const [newTitle, setNewTitle] = useState("");
  const [previewBack, setPreviewBack] = useState(false);
  const [saved, setSaved] = useState<string | null>(null);
  const [count, setCount] = useState(0);
  const questionRef = useRef<HTMLTextAreaElement>(null);
  const setupRef = useRef<HTMLInputElement>(null);

  // The student's own decks: personal and imported ones. Lesson decks are
  // generated and the mistakes deck is assembled, so neither takes new cards.
  const decks = Object.values(snapshot.decks)
    .filter((deck) => deck.kind !== "lesson" && deck.id !== MISTAKES_DECK_ID)
    .map((deck) => ({ id: deck.id, title: deck.title }));
  if (!decks.some((deck) => deck.id === PERSONAL_DECK_ID)) decks.unshift({ id: PERSONAL_DECK_ID, title: PERSONAL_DECK_TITLE });

  // The preview is built from the draft on every render with a fixed instant,
  // so its id is stable while the student types; the saved card gets a real
  // timestamp at the press.
  const draftCard = (at: Date): Card =>
    shape === "reaction" ? cardFromDraft(sides, at, extras) : quizCardFromDraft(quiz, at);
  const preview = draftCard(new Date(0));

  const problems = [
    ...(shape === "reaction" ? draftProblems(sides) : quizProblems(quiz)),
    ...(deckId === NEW_DECK && deckTitleProblem(newTitle) !== null ? [deckTitleProblem(newTitle) as string] : []),
  ];

  const save = (): void => {
    if (problems.length > 0) return;
    let target: DeckId = deckId;
    let title = decks.find((deck) => deck.id === deckId)?.title ?? PERSONAL_DECK_TITLE;
    if (deckId === NEW_DECK) {
      target = newDeckId(newTitle);
      title = newTitle.trim();
      source.createDeck({ id: target, title, kind: "personal", cardIds: [] });
      setDeckId(target);
      setNewTitle("");
    }
    source.saveCard(draftCard(new Date()), target);
    setSaved(title);
    setCount((n) => n + 1);
    setSides(EMPTY_SIDES);
    setExtras(EMPTY_EXTRAS);
    // The type stays: five multiple choice cards in a row is the normal case.
    setQuiz({ ...EMPTY_QUIZ, kind: quiz.kind });
    setPreviewBack(false);
    (shape === "reaction" ? setupRef : questionRef).current?.focus();
  };

  const touched = () => setSaved(null);
  const patch = (next: Partial<QuizDraft>) => {
    setQuiz({ ...quiz, ...next });
    touched();
  };
  const saveOnCtrlEnter = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      save();
    }
  };
  const choice = quiz.kind === "mcq" || quiz.kind === "multi";
  const deckTitle = deckId === NEW_DECK ? "a new deck" : (decks.find((d) => d.id === deckId)?.title ?? PERSONAL_DECK_TITLE);

  return (
    <div className="flex flex-col gap-4 px-4 pb-8 pt-3" onKeyDown={saveOnCtrlEnter}>
      <div className="flex items-center gap-2">
        <button
          type="button"
          className="press bb-back-disc flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-bb-muted-foreground"
          onClick={onBack}
          aria-label="Back to your decks"
        >
          <svg viewBox="0 0 24 24" className="h-6 w-6" aria-hidden="true">
            <path d="M15 5 L8 12 L15 19" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
        <h1 className="bb-title-face m-0 text-scale-2xl font-bold">New card</h1>
        {count > 0 && <span className="ml-auto text-scale-sm font-semibold text-bb-muted-foreground">{count} added</span>}
      </div>

      {shape === "question" ? (
        <>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4" role="group" aria-label="Kind of question">
            {QUIZ_KINDS.map((kind) => (
              <button
                key={kind}
                type="button"
                /* Selected is the filled periwinkle chip, unselected the outline:
                   green is the progress semantic, not a selection colour. */
                className={`press text-scale-sm font-bold ${quiz.kind === kind ? "chip3d" : "cards-ghost"}`}
                aria-pressed={quiz.kind === kind}
                onClick={() => {
                  setQuiz(setQuizKind(quiz, kind));
                  setPreviewBack(false);
                  touched();
                }}
              >
                {QUIZ_LABELS[kind]}
              </button>
            ))}
          </div>
          <p className="m-0 -mt-2 text-scale-sm text-bb-muted-foreground">{KIND_HELP[quiz.kind]}</p>

          <label className={LABEL}>
            Question
            <textarea
              ref={questionRef}
              className={FIELD}
              rows={2}
              autoFocus
              value={quiz.question}
              onChange={(e) => patch({ question: e.target.value })}
            />
          </label>

          {choice ? (
            <fieldset className="m-0 flex flex-col gap-2 border-0 p-0">
              <legend className="mb-1 p-0 text-scale-sm font-semibold">
                Options. {quiz.kind === "mcq" ? "Tap the circle beside the right one." : "Tick every right one."}
              </legend>
              {quiz.options.map((option, i) => (
                <div key={i} className="flex items-center gap-2">
                  <button
                    type="button"
                    role={quiz.kind === "mcq" ? "radio" : "checkbox"}
                    aria-checked={quiz.correct.includes(i)}
                    aria-label={`Option ${i + 1} is right`}
                    className={`press flex h-11 w-11 shrink-0 items-center justify-center border-2 ${quiz.kind === "mcq" ? "rounded-full" : "rounded-lg"} ${
                      quiz.correct.includes(i) ? "border-bb-primary bg-bb-primary text-white" : "border-bb-border bg-bb-card text-transparent"
                    }`}
                    onClick={() => patch(toggleCorrect(quiz, i))}
                  >
                    <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden="true">
                      <path d="M5 12 L10 17 L19 7" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </button>
                  <input
                    className={FIELD}
                    value={option}
                    aria-label={`Option ${i + 1}`}
                    placeholder={`Option ${i + 1}`}
                    onChange={(e) => patch(setOption(quiz, i, e.target.value))}
                    onKeyDown={(e) => {
                      // Enter moves to the next row and opens one after the last,
                      // so four options is typing and Enter, no reaching for a button.
                      if (e.key !== "Enter" || e.ctrlKey || e.metaKey) return;
                      e.preventDefault();
                      const field = e.currentTarget;
                      if (i === quiz.options.length - 1) {
                        patch(addOption(quiz));
                        setTimeout(() => optionInputs(field)[i + 1]?.focus(), 0);
                      } else {
                        optionInputs(field)[i + 1]?.focus();
                      }
                    }}
                  />
                  {quiz.options.length > 2 && (
                    <button type="button" className="press h-11 w-11 shrink-0 text-bb-muted-foreground" aria-label={`Remove option ${i + 1}`} onClick={() => patch(removeOption(quiz, i))}>
                      <span aria-hidden="true">×</span>
                    </button>
                  )}
                </div>
              ))}
              <button type="button" className={`${QUIET} self-start py-2`} onClick={() => patch(addOption(quiz))}>
                + Add an option
              </button>
            </fieldset>
          ) : quiz.kind === "short" ? (
            <label className={LABEL}>
              Answer
              <input
                className={FIELD}
                value={quiz.answer}
                onChange={(e) => patch({ answer: e.target.value })}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    save();
                  }
                }}
              />
            </label>
          ) : (
            <label className={LABEL}>
              Model answer (optional)
              <textarea className={FIELD} rows={4} value={quiz.answer} onChange={(e) => patch({ answer: e.target.value })} />
            </label>
          )}

          <details className="text-scale-sm">
            <summary className={`${QUIET} min-h-11 content-center`}>Add a note that shows with the answer</summary>
            <textarea className={`${FIELD} mt-2`} rows={2} aria-label="Note" value={quiz.why} onChange={(e) => patch({ why: e.target.value })} />
          </details>
        </>
      ) : (
        <div className="flex flex-col gap-3">
          <label className={LABEL}>
            Start with
            <input ref={setupRef} autoFocus className={FIELD} value={sides.setup} placeholder={SIDE_HINTS.setup} onChange={(e) => { setSides(setSide(sides, "setup", e.target.value)); touched(); }} />
          </label>
          <label className={LABEL}>
            Reagents and conditions
            <input className={FIELD} value={sides.conditions} placeholder={SIDE_HINTS.conditions} onChange={(e) => { setSides(setSide(sides, "conditions", e.target.value)); touched(); }} />
          </label>
          <label className={LABEL}>
            Product, the answer
            <input className={FIELD} value={sides.product} placeholder={SIDE_HINTS.product} onChange={(e) => { setSides(setSide(sides, "product", e.target.value)); touched(); }} />
          </label>
          <details className="rounded-xl border-2 border-bb-border bg-bb-card p-3">
            <summary className="min-h-11 cursor-pointer content-center text-scale-sm font-semibold">
              Temperature and the concepts behind it (optional)
            </summary>
            <div className="mt-2 flex flex-col gap-3">
              <label className={LABEL}>
                Temperature
                <input className={FIELD} value={extras.temperature} placeholder="-78 °C" onChange={(e) => { setExtras(setExtra(extras, "temperature", e.target.value)); touched(); }} />
              </label>
              {COMPOSER_REVEAL_FIELDS.map((field) => (
                <label key={field} className={LABEL}>
                  {REVEAL_LABELS[field]}
                  <input className={FIELD} value={extras[field]} onChange={(e) => { setExtras(setExtra(extras, field, e.target.value)); touched(); }} />
                </label>
              ))}
            </div>
          </details>
        </div>
      )}

      <div className="flex flex-col gap-2">
        <button
          type="button"
          className="chip3d chip3d--go bb-title-face w-full text-scale-lg font-bold"
          disabled={problems.length > 0}
          onClick={save}
        >
          Add card
        </button>
        <p className="m-0 min-h-5 text-center text-scale-sm text-bb-muted-foreground" role="status">
          {saved !== null ? `Added to ${saved}. Type the next one.` : (problems[0] ?? "")}
        </p>
      </div>

      {/* Everything below is optional and closed: where it goes, how it looks,
          and the reaction shape. */}
      <details className="text-scale-sm">
        <summary className={`${QUIET} min-h-11 content-center`}>Adding to {deckTitle}. Change</summary>
        <div className="mt-2 flex flex-col gap-3">
          <label className={LABEL}>
            Deck
            <select className={FIELD} value={deckId} onChange={(e) => { setDeckId(e.target.value); touched(); }}>
              {decks.map((deck) => (
                <option key={deck.id} value={deck.id}>
                  {deck.title}
                </option>
              ))}
              <option value={NEW_DECK}>New deck...</option>
            </select>
          </label>
          {deckId === NEW_DECK && (
            <label className={LABEL}>
              New deck name
              <input className={FIELD} value={newTitle} onChange={(e) => setNewTitle(e.target.value)} />
            </label>
          )}
        </div>
      </details>

      <details className="text-scale-sm" onToggle={() => setPreviewBack(false)}>
        <summary className={`${QUIET} min-h-11 content-center`}>Preview</summary>
        <section className="mt-2 flex flex-col gap-2" aria-label="Preview">
          <p className="m-0 text-scale-sm font-semibold text-bb-muted-foreground">
            {previewBack ? "This is the back." : "Tap the card to see the back."}
          </p>
          <CardFace card={preview} revealed={previewBack} onReveal={() => setPreviewBack(true)} />
          {previewBack && (
            <button type="button" className="cards-ghost press self-start" onClick={() => setPreviewBack(false)}>
              Show the front
            </button>
          )}
        </section>
      </details>

      <button
        type="button"
        className={`${QUIET} self-start py-2 underline`}
        onClick={() => {
          setShape(shape === "question" ? "reaction" : "question");
          setPreviewBack(false);
          touched();
        }}
      >
        {shape === "question" ? "Write a reaction card instead" : "Back to question cards"}
      </button>
    </div>
  );
}
