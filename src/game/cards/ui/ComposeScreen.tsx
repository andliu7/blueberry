/**
 * Writing a card. Read this header before trusting anything in this file.
 *
 * TWO SHAPES, ONE FORM. A reaction card (start, conditions, product, plus an
 * optional temperature and the concepts behind the reveal) and a plain
 * question card (question, answer, why). The old composer had only the
 * reaction shape, so a student with a non-reaction question put words in
 * the wrong boxes. The mapping from draft to Card is composer.ts's, tested
 * there; this file only collects the words.
 *
 * THE PREVIEW IS THE REAL FACE. The card under the form is CardFace, the
 * component the review run draws, so what a student writes is exactly what
 * they will be asked. Tap it to see the back.
 *
 * NO DRAWINGS HERE, on purpose. A student's own card is their words; there is
 * no checked structure behind them, and drawing one would be the invented
 * chemistry the derive-never-recall rule forbids. Registry reaction cards
 * (with drawings) arrive by saving a reaction from its page.
 *
 * WHERE IT GOES. Any deck the student owns, or a new one named here. The
 * default is "My cards", the deck saved reactions and mistakes land in.
 */

import { useState } from "react";
import type { Card, DeckId, DeckSnapshot, DeckSource } from "../types";
import { REVEAL_LABELS } from "../types";
import { PERSONAL_DECK_ID, PERSONAL_DECK_TITLE } from "../store";
import { CardFace } from "./CardFace";
import {
  COMPOSER_REVEAL_FIELDS,
  EMPTY_EXTRAS,
  EMPTY_QUESTION,
  EMPTY_SIDES,
  SIDE_HINTS,
  cardFromDraft,
  deckTitleProblem,
  draftProblems,
  newDeckId,
  questionCardFromDraft,
  questionProblems,
  setExtra,
  setSide,
  type DraftExtras,
  type QuestionDraft,
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

export function ComposeScreen({ snapshot, source, onBack }: ComposeScreenProps) {
  const [shape, setShape] = useState<Shape>("reaction");
  const [sides, setSides] = useState(EMPTY_SIDES);
  const [extras, setExtras] = useState<DraftExtras>(EMPTY_EXTRAS);
  const [question, setQuestion] = useState<QuestionDraft>(EMPTY_QUESTION);
  const [deckId, setDeckId] = useState<string>(PERSONAL_DECK_ID);
  const [newTitle, setNewTitle] = useState("");
  const [previewBack, setPreviewBack] = useState(false);
  const [saved, setSaved] = useState<string | null>(null);

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
    shape === "reaction" ? cardFromDraft(sides, at, extras) : questionCardFromDraft(question, at);
  const preview = draftCard(new Date(0));

  const problems = [
    ...(shape === "reaction" ? draftProblems(sides) : questionProblems(question)),
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
    setSides(EMPTY_SIDES);
    setExtras(EMPTY_EXTRAS);
    setQuestion(EMPTY_QUESTION);
    setPreviewBack(false);
  };

  const touched = () => setSaved(null);

  return (
    <div className="flex flex-col gap-5 px-4 pb-8 pt-3">
      <div className="flex items-center gap-2">
        <button
          type="button"
          className="press flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-bb-muted-foreground"
          onClick={onBack}
          aria-label="Back to your decks"
        >
          <svg viewBox="0 0 24 24" className="h-6 w-6" aria-hidden="true">
            <path d="M15 5 L8 12 L15 19" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
        <h1 className="bb-title-face m-0 text-scale-2xl font-bold">New card</h1>
      </div>

      <div className="grid grid-cols-2 gap-2" role="group" aria-label="Kind of card">
        {(["reaction", "question"] as const).map((option) => (
          <button
            key={option}
            type="button"
            /* Selected is the filled periwinkle chip, unselected the outline:
               green is the progress semantic, not a selection colour. */
            className={`press text-scale-base font-bold ${shape === option ? "chip3d" : "cards-ghost"}`}
            aria-pressed={shape === option}
            onClick={() => {
              setShape(option);
              setPreviewBack(false);
              touched();
            }}
          >
            {option === "reaction" ? "Reaction" : "Question"}
          </button>
        ))}
      </div>

      {shape === "reaction" ? (
        <div className="flex flex-col gap-3">
          <label className={LABEL}>
            Start with
            <input className={FIELD} value={sides.setup} placeholder={SIDE_HINTS.setup} onChange={(e) => { setSides(setSide(sides, "setup", e.target.value)); touched(); }} />
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
      ) : (
        <div className="flex flex-col gap-3">
          <label className={LABEL}>
            Question
            <textarea className={FIELD} rows={2} value={question.front} onChange={(e) => { setQuestion({ ...question, front: e.target.value }); touched(); }} />
          </label>
          <label className={LABEL}>
            Answer
            <textarea className={FIELD} rows={2} value={question.back} onChange={(e) => { setQuestion({ ...question, back: e.target.value }); touched(); }} />
          </label>
          <label className={LABEL}>
            Why it is the answer (optional)
            <textarea className={FIELD} rows={2} value={question.why} onChange={(e) => { setQuestion({ ...question, why: e.target.value }); touched(); }} />
          </label>
        </div>
      )}

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

      <section className="flex flex-col gap-2" aria-label="Preview">
        <p className="m-0 text-scale-sm font-semibold text-bb-muted-foreground">
          Preview. {previewBack ? "This is the back." : "Tap the card to see the back."}
        </p>
        <CardFace card={preview} revealed={previewBack} onReveal={() => setPreviewBack(true)} />
        {previewBack && (
          <button type="button" className="cards-ghost press self-start" onClick={() => setPreviewBack(false)}>
            Show the front
          </button>
        )}
      </section>

      <div className="flex flex-col gap-2">
        <button
          type="button"
          className="chip3d chip3d--go bb-title-face w-full text-scale-lg font-bold"
          disabled={problems.length > 0}
          onClick={save}
        >
          Save card
        </button>
        <p className="m-0 min-h-5 text-center text-scale-sm text-bb-muted-foreground" role="status">
          {saved !== null ? `Saved to ${saved}. Write the next one, or go back to review it.` : (problems[0] ?? "")}
        </p>
      </div>
    </div>
  );
}
