/**
 * The study modes' arithmetic, kept out of React so a test can hold it.
 *
 * The cards tab's deck screen follows a flashcard set page: a big card to
 * flip, a row of study modes (Flashcards, Learn, Test, Match, Write), and the
 * full term list. Learn is the real spaced review (cards/ui/Run.tsx, which
 * grades and schedules). Test, Match and Write are PRACTICE: they never call
 * the scheduler, so playing a round of Match cannot move a card's due date.
 *
 * WHAT THIS FILE NEVER DOES: write chemistry. A card's answer is the string
 * the card already carries (data/reactions.ts product_label for a reaction
 * card, the student's own words otherwise), and a wrong option in Test is
 * either the RDKit-derived distractor set predict.ts already serves or the
 * answer of ANOTHER card in the same deck. Nothing here makes a molecule up.
 *
 * Pure apart from the two star helpers, which read and write localStorage
 * and swallow a storage that throws (private windows), because a star is a
 * per-device convenience and must never break the screen.
 */

import type { Card } from "../../cards/types";
import type { CardSchedulerState } from "../../cards/ui/cardState";
import { seededShuffle } from "@/lib/helpers";

/* ------------------------------------------------------------------ */
/* Modes                                                                */
/* ------------------------------------------------------------------ */

export type StudyMode = "flashcards" | "learn" | "test" | "match" | "write";

export const STUDY_MODES: readonly { readonly id: StudyMode; readonly label: string }[] = [
  { id: "flashcards", label: "Flashcards" },
  { id: "learn", label: "Learn" },
  { id: "test", label: "Test" },
  { id: "match", label: "Match" },
  { id: "write", label: "Write" },
];

export function isStudyMode(value: string | undefined): value is StudyMode {
  return STUDY_MODES.some((mode) => mode.id === value);
}

/* ------------------------------------------------------------------ */
/* Answers                                                              */
/* ------------------------------------------------------------------ */

/** What a card asks for, as words: the product for a reaction, the back otherwise. */
export function answerText(card: Card): string {
  if (card.reaction !== undefined) return card.reaction.products;
  if (card.sides !== undefined) return card.sides.product;
  return card.back;
}

/**
 * Typed answers are compared loosely on spelling marks and strictly on
 * letters and digits: case, spaces, hyphens, commas and primes are dropped,
 * so "1-bromobut-2-ene" and "1 bromobut 2 ene" agree, but "but-1-ene" and
 * "but-2-ene" never do, because the locants survive.
 */
function normaliseAnswer(text: string): string {
  return text
    .normalize("NFKD")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");
}

export function answersMatch(typed: string, card: Card): boolean {
  const want = normaliseAnswer(answerText(card));
  return want.length > 0 && normaliseAnswer(typed) === want;
}

/* ------------------------------------------------------------------ */
/* Test: text options when no drawn set exists                          */
/* ------------------------------------------------------------------ */

export interface TextChoice {
  readonly key: string;
  readonly label: string;
  readonly correct: boolean;
}

/**
 * Up to four options for one card: its own answer plus other cards' answers
 * from the same deck, distinct after normalising (two cards that both answer
 * "benzyl alcohol" must not make a question with two right options). Null
 * when the deck holds no second distinct answer, because a one-option
 * question is not a question.
 */
export function textChoices(card: Card, deck: readonly Card[], seed: number): readonly TextChoice[] | null {
  const own = answerText(card);
  const seen = new Set([normaliseAnswer(own)]);
  const wrong: TextChoice[] = [];
  for (const other of seededShuffle(deck, seed)) {
    const label = answerText(other);
    const key = normaliseAnswer(label);
    if (key.length === 0 || seen.has(key)) continue;
    seen.add(key);
    wrong.push({ key: other.id, label, correct: false });
    if (wrong.length === 3) break;
  }
  if (wrong.length === 0) return null;
  return seededShuffle([{ key: card.id, label: own, correct: true }, ...wrong], seed + 7);
}

/* ------------------------------------------------------------------ */
/* Match                                                                */
/* ------------------------------------------------------------------ */

export interface MatchTile {
  /** Unique per tile: the card id plus which side it shows. */
  readonly key: string;
  readonly cardId: string;
  readonly side: "term" | "definition";
}

/** Most pairs one board holds: twelve tiles fit a phone without scrolling far. */
const MATCH_PAIRS = 6;

/** Two tiles per card, for up to MATCH_PAIRS cards, shuffled together. */
export function matchBoard(cards: readonly Card[], seed: number): readonly MatchTile[] {
  const picked = seededShuffle(cards, seed).slice(0, MATCH_PAIRS);
  const tiles: MatchTile[] = [];
  for (const card of picked) {
    tiles.push({ key: `${card.id}#term`, cardId: card.id, side: "term" });
    tiles.push({ key: `${card.id}#definition`, cardId: card.id, side: "definition" });
  }
  return seededShuffle(tiles, seed + 13);
}

/** Two picked tiles are a pair when they are the two sides of one card. */
export function isPair(a: MatchTile, b: MatchTile): boolean {
  return a.cardId === b.cardId && a.side !== b.side;
}

/** Quizlet's rule: a wrong pair costs one second on the clock. */
export const MISS_PENALTY_MS = 1000;

/** "12.3" seconds, one decimal, the way a match timer reads. */
export function formatSeconds(ms: number): string {
  return (Math.max(0, ms) / 1000).toFixed(1);
}

/* ------------------------------------------------------------------ */
/* The shelf: mastery ring and split bar                                */
/* ------------------------------------------------------------------ */

export interface SplitSegment {
  readonly state: CardSchedulerState;
  readonly count: number;
  /** Share of the bar, 0..100. */
  readonly percent: number;
}

/** The split bar's segments in path order, empty states left out. */
export function splitSegments(
  counts: Readonly<Record<CardSchedulerState, number>>,
  order: readonly CardSchedulerState[],
): readonly SplitSegment[] {
  const total = order.reduce((sum, state) => sum + counts[state], 0);
  if (total === 0) return [];
  return order
    .filter((state) => counts[state] > 0)
    .map((state) => ({ state, count: counts[state], percent: (counts[state] / total) * 100 }));
}

/* ------------------------------------------------------------------ */
/* Stars (per device)                                                   */
/* ------------------------------------------------------------------ */

const STARS_KEY = "blueberry.cards.starred.v1";

export function readStars(): ReadonlySet<string> {
  try {
    const raw = localStorage.getItem(STARS_KEY);
    const parsed: unknown = raw === null ? [] : JSON.parse(raw);
    return new Set(Array.isArray(parsed) ? parsed.filter((item): item is string => typeof item === "string") : []);
  } catch {
    return new Set();
  }
}

export function writeStars(stars: ReadonlySet<string>): void {
  try {
    localStorage.setItem(STARS_KEY, JSON.stringify([...stars]));
  } catch {
    // Blocked storage: the star still shows for this visit.
  }
}

export function toggled(stars: ReadonlySet<string>, cardId: string): ReadonlySet<string> {
  const next = new Set(stars);
  if (next.has(cardId)) next.delete(cardId);
  else next.add(cardId);
  return next;
}

/** Best match time per deck, also per device. */
export function readBestMatch(deckId: string): number | null {
  try {
    const raw = localStorage.getItem(`blueberry.cards.match.${deckId}`);
    const value = raw === null ? NaN : Number(raw);
    return Number.isFinite(value) ? value : null;
  } catch {
    return null;
  }
}

export function writeBestMatch(deckId: string, ms: number): void {
  try {
    localStorage.setItem(`blueberry.cards.match.${deckId}`, String(Math.round(ms)));
  } catch {
    // Nothing to do: the time still shows on this screen.
  }
}
