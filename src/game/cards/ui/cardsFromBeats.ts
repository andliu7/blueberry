/**
 * Lesson decks, generated from the beats a lesson already has. Read this
 * header before trusting anything in this file.
 *
 * THE CLAIM THIS FILE MAKES GOOD: a lesson deck costs nothing to author,
 * because the beats ARE the cards. A beat already carries a prompt, an
 * authored answer and, on most kinds, an authored `why` explaining it. That is
 * exactly the three fields cards/types.ts asks for. Writing a second corpus of
 * flashcards beside the lesson corpus would mean two files that teach the same
 * chemistry and drift apart the first time one of them is corrected.
 *
 * TWO KINDS PRODUCE NO CARD, and that is a decision rather than a gap.
 * `mechanism` and `resonance` are drawing beats. A flashcard cannot ask a
 * student to push an arrow, and a card whose back says "go and open the
 * trainer" is a card that teaches nothing and still takes a slot in the review
 * queue. docs/DATA-MODEL.md already says the right answer for those: a
 * ReviewItem points AT the beat and re-drills it through the same runner, so
 * a fading mechanism comes back as a mechanism. `cardFromBeat` returns null
 * for both, `skippedKinds` names them, and the deck surfaces say so out loud
 * rather than quietly producing a shorter deck than the lesson.
 *
 * Card ids are derived from beat ids and are therefore stable, which is the
 * invariant cards/types.ts states: a card whose id changes has an interval
 * history that belongs to nothing. Rewording a prompt keeps the id because it
 * keeps the beat id. Asking a different question is a new beat, so it is a new
 * card, which is the same rule one level down.
 *
 * Pure: no storage, no clock, no React.
 */

import type {
  BeatSpec,
  LessonPlaylist,
  MatchBeat,
  McqBeat,
  SortBeat,
  SortCriterion,
  SynthesisBeat,
  TraceBeat,
} from "../../beats/types";
import type { Card, CardId, Deck, DeckId } from "../types";

/** One card id per beat, forever. See the header for why this is derived. */
export function cardIdForBeat(beatId: string): CardId {
  return `beat:${beatId}`;
}

export function deckIdForLesson(lessonId: string): DeckId {
  return `lesson:${lessonId}`;
}

/** The beat kinds a flashcard cannot carry. Named so a surface can explain it. */
export const CARDLESS_BEAT_KINDS: readonly BeatSpec["kind"][] = Object.freeze([
  "mechanism",
  "resonance",
]);

/**
 * Student facing name for each sort criterion, used to build the back of a
 * sort card. Closed over the same union the beat declares, so adding a
 * criterion without a label is a compile error rather than a card that reads
 * "ranked by undefined".
 */
const CRITERION_LABELS: Readonly<Record<SortCriterion, string>> = Object.freeze({
  pka: "pKa",
  acidity: "acidity",
  basicity: "basicity",
  nucleophilicity: "nucleophilicity",
  acyl_reactivity: "reactivity toward nucleophilic acyl substitution",
  oxidation_level: "oxidation level",
  carbocation_stability: "carbocation stability",
  sn2_rate: "SN2 rate",
  ring_activation: "ring activation",
});

function sortBack(beat: SortBeat): string {
  const labels = new Map(beat.items.map((item) => [item.id, item.label]));
  const ordered = beat.order.map((id) => labels.get(id) ?? id);
  const lead = beat.direction === "descending" ? "highest first" : "lowest first";
  return `By ${CRITERION_LABELS[beat.criterion]}, ${lead}: ${ordered.join(", ")}`;
}

function sortWhy(beat: SortBeat): string {
  const reasons = beat.items.map((item) => item.why).filter((why): why is string => why !== undefined);
  return reasons.join(" ");
}

function matchBack(beat: MatchBeat): string {
  return beat.pairs.map((pair) => `${pair.left} goes with ${pair.right}`).join("\n");
}

function matchWhy(beat: MatchBeat): string {
  const reasons = beat.pairs.map((pair) => pair.why).filter((why): why is string => why !== undefined);
  return reasons.join(" ");
}

function mcqBack(beat: McqBeat): string {
  const chosen = beat.options.find((option) => option.id === beat.correctOptionId);
  return chosen?.text ?? "";
}

function mcqWhy(beat: McqBeat): string {
  const chosen = beat.options.find((option) => option.id === beat.correctOptionId);
  return chosen?.why ?? "";
}

function synthesisBack(beat: SynthesisBeat): string {
  const steps = beat.slots.map((slot, index) => {
    const answer = slot.given ?? (slot.accepts ?? []).join(" or ");
    return `${index + 1}. ${answer}`;
  });
  return steps.join("\n");
}

function synthesisWhy(beat: SynthesisBeat): string {
  const reasons = beat.slots.map((slot) => slot.why).filter((why): why is string => why !== undefined);
  return reasons.join(" ");
}

function traceBack(beat: TraceBeat): string {
  return beat.strokes.map((stroke) => stroke.label).join("\n");
}

/**
 * One card from one beat, or null for a beat a card cannot carry.
 *
 * The switch is exhaustive over the beat union on purpose: adding a beat kind
 * without deciding what its card looks like should stop the build, and the
 * `never` in the default branch is what makes the compiler enforce that. The
 * pattern is called an exhaustiveness check and it is the reason this is a
 * switch rather than a lookup table.
 */
export function cardFromBeat(beat: BeatSpec, lessonId: string): Card | null {
  const base = {
    id: cardIdForBeat(beat.id),
    front: beat.prompt,
    tags: [...beat.conceptIds, `node:${beat.node}`],
    source: { kind: "lesson", lessonId, beatId: beat.id } as const,
  };

  switch (beat.kind) {
    case "mechanism":
    case "resonance":
      return null;
    case "sort":
      return { ...base, back: sortBack(beat), why: sortWhy(beat) };
    case "match":
      return { ...base, back: matchBack(beat), why: matchWhy(beat) };
    case "mcq":
      return { ...base, back: mcqBack(beat), why: mcqWhy(beat) };
    case "synthesis":
      return { ...base, back: synthesisBack(beat), why: synthesisWhy(beat) };
    case "trace":
      return { ...base, back: traceBack(beat), why: beat.brief ?? "" };
    default: {
      const unreachable: never = beat;
      return unreachable;
    }
  }
}

export interface GeneratedDeck {
  readonly deck: Deck;
  readonly cards: readonly Card[];
  /** Beats that produced no card, so a surface can say how many and why. */
  readonly skippedBeatIds: readonly string[];
}

/**
 * A whole lesson's deck. The picker reads `deck.cardIds.length` for its count,
 * which is why the skipped beats are reported separately rather than being
 * silently absent from a number the screen presents as the lesson's size.
 */
export function deckFromPlaylist(playlist: LessonPlaylist): GeneratedDeck {
  const cards: Card[] = [];
  const skipped: string[] = [];
  for (const beat of playlist.beats) {
    const card = cardFromBeat(beat, playlist.lessonId);
    if (card === null) skipped.push(beat.id);
    else cards.push(card);
  }
  return {
    deck: {
      id: deckIdForLesson(playlist.lessonId),
      title: playlist.title,
      kind: "lesson",
      cardIds: cards.map((card) => card.id),
    },
    cards,
    skippedBeatIds: skipped,
  };
}

/**
 * The line a lesson deck shows when some of its beats have no card. Written so
 * a student reads it as "those are drilled somewhere better", which is true,
 * rather than as "the app dropped some of your lesson", which is not.
 */
export function skippedBeatsNote(generated: GeneratedDeck): string | null {
  const count = generated.skippedBeatIds.length;
  if (count === 0) return null;
  const noun = count === 1 ? "step comes" : "steps come";
  return `${count} arrow-pushing ${noun} back in the trainer instead, where you can draw it.`;
}
