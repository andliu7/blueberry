import { useEffect, useState } from "react";
import { Star } from "lucide-react";
import type { Question } from "@/data/types";
import type { Status } from "@/components/QuestionCard";
import { MathHtml } from "@/components/ui/math-html";
import { RATING_WORDS } from "@/lib/reviewProgress";
import { Figure } from "@/components/review/DeckStudy";
import { answerOf } from "@/components/review/StudyModes";

/**
 * Every card in the deck as Quizlet's term list: the question on the left, the answer on
 * the right, and a star on each row. On a phone the answer drops under the question.
 *
 * The drawing goes with the answer, whole, as Quizlet puts a definition's picture beside
 * it: the list is for reading both sides at once, so nothing is masked here.
 */
export function TermList({
  questions,
  indexes,
  status,
  starred,
  onStar,
}: {
  questions: Question[];
  /** Which cards to list, as indexes into `questions`. */
  indexes: number[];
  status: Record<number, Status>;
  starred: number[];
  onStar: (i: number) => void;
}) {
  return (
    <ul className="rv-card-box divide-y divide-[var(--bb-wash)] overflow-hidden">
      {indexes.map((i) => {
        const q = questions[i]!;
        const s = status[i + 1];
        const on = starred.includes(i);
        return (
          <li key={i} className="rv-term">
            <div className="rv-term__front">
              <MathHtml
                html={q.q}
                className="font-semibold text-[var(--bb-deep)]"
              />
              {q.mc && (
                <ol className="mt-2 space-y-1 text-sm">
                  {q.options.map((o, k) => (
                    <li key={k} className="flex gap-2">
                      <span className="font-bold text-[var(--site-nav-ink)]">
                        {String.fromCharCode(65 + k)}
                      </span>
                      <MathHtml html={o} />
                    </li>
                  ))}
                </ol>
              )}
              {s && s !== "none" && (
                <span className="rv-term__rating" data-rate={s}>
                  {RATING_WORDS[s]}
                </span>
              )}
            </div>
            <div className="rv-term__back">
              {(q.badge || q.mc) && (
                <MathHtml
                  html={answerOf(q)}
                  className="font-bold text-[var(--bb-deep)]"
                />
              )}
              <MathHtml html={q.a} className="text-[var(--site-quiet)]" />
              {q.image && (
                <div className="mt-2 max-w-sm">
                  <Figure src={q.image} />
                </div>
              )}
            </div>
            <button
              type="button"
              className="rv-star"
              aria-pressed={on}
              aria-label={on ? "Unstar this card" : "Star this card"}
              onClick={() => onStar(i)}
            >
              <Star
                aria-hidden
                className="size-5"
                fill={on ? "currentColor" : "none"}
              />
            </button>
          </li>
        );
      })}
    </ul>
  );
}

const starKey = (deckId: string) => `bb_deck_stars_${deckId}`;

/**
 * The starred cards of one deck, kept in this browser like the ratings. A custom hook: a
 * function that bundles a piece of state with the effect that saves it, so DeckPage reads
 * `const [starred, toggleStar] = useStars(deck.id)` and never touches storage itself.
 */
export function useStars(deckId: string): [number[], (i: number) => void] {
  const [starred, setStarred] = useState<number[]>(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(starKey(deckId)) ?? "[]");
      return Array.isArray(saved)
        ? saved.filter((n) => typeof n === "number")
        : [];
    } catch {
      return [];
    }
  });
  useEffect(() => {
    try {
      localStorage.setItem(starKey(deckId), JSON.stringify(starred));
    } catch {
      /* private mode: stars just are not kept */
    }
  }, [deckId, starred]);
  const toggle = (i: number) =>
    setStarred((s) =>
      s.includes(i)
        ? s.filter((x) => x !== i)
        : [...s, i].sort((a, b) => a - b),
    );
  return [starred, toggle];
}
