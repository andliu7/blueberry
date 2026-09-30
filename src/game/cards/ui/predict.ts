/**
 * "Call it": the product a student predicts before a reaction card flips.
 * Read this header before trusting anything in this file.
 *
 * WHY PREDICT AT ALL. Anki's front is a prompt and a promise: the student is
 * supposed to answer in their head, and nothing checks that they did. Tapping
 * one of three drawn products makes the retrieval happen for real, and it
 * turns the reveal into feedback on a committed answer rather than a
 * confirmation of a vague one. It is optional: "Just flip" is always there.
 *
 * THE DISTRACTORS ARE DERIVED, NEVER INVENTED. Every option is the registered
 * product of a reaction in data/reactions.ts, drawn by RDKit from its own
 * canonical SMILES. The claim a wrong option makes ("this is not what these
 * conditions give") is true by the registry itself: an option is only offered
 * when its product SMILES differs from this reaction's product, so two
 * reactions that happen to make the same compound can never be offered as a
 * right and a wrong answer.
 *
 * SIBLINGS FIRST. The best wrong answer shares the starting material and
 * differs in the reagent, so the choice tests exactly what the card drills:
 * acetophenone has eight reactions in the registry, and "which of these does
 * NaBH4 give" against the Wittig and Grignard products is the real question.
 * Only when a start has fewer than two siblings does the pick widen to the
 * same family, and then to the whole registry.
 *
 * DETERMINISTIC. The answer's position and the distractor pick come from a
 * hash of the card id, so the same card deals the same three options every
 * time (a reload mid run changes nothing) and a test can assert them. The
 * position varies across cards, so "always the middle one" is not a strategy.
 *
 * Pure: no React, no storage, no clock.
 */

import type { StagedReaction } from "../../../data/reactions";
import type { Card } from "../types";

export interface PredictOption {
  /** The reaction whose product this drawing is. */
  readonly reactionId: string;
  readonly light?: string;
  readonly dark?: string;
  /** The registry's name for the product. Shown only after the pick. */
  readonly label: string;
  readonly correct: boolean;
}

/** How many drawings the student chooses between. Three fit a 390px row. */
export const PREDICT_OPTIONS = 3;

function hash(text: string): number {
  let value = 0;
  for (let i = 0; i < text.length; i += 1) value = (value * 31 + text.charCodeAt(i)) | 0;
  return Math.abs(value);
}

function hasProductArt(reaction: StagedReaction): boolean {
  return reaction.art.product_light !== undefined || reaction.art.product_dark !== undefined;
}

function optionOf(reaction: StagedReaction, correct: boolean): PredictOption {
  return {
    reactionId: reaction.id,
    ...(reaction.art.product_light === undefined ? {} : { light: reaction.art.product_light }),
    ...(reaction.art.product_dark === undefined ? {} : { dark: reaction.art.product_dark }),
    label: reaction.product_label,
    correct,
  };
}

/**
 * The options for one card, answer included, in display order. Null when the
 * card cannot be predicted honestly: a card the student wrote (no drawing), a
 * reaction the registry no longer holds, or too few distinct wrong products.
 */
export function predictionChoices(
  card: Card,
  reactions: readonly StagedReaction[],
): readonly PredictOption[] | null {
  if (card.source.kind !== "reaction") return null;
  const reactionId = card.source.reactionId;
  const target = reactions.find((reaction) => reaction.id === reactionId);
  if (target === undefined || !hasProductArt(target)) return null;

  const seed = hash(card.id);
  const usable = reactions.filter(
    (reaction) => reaction.id !== target.id && reaction.product !== target.product && hasProductArt(reaction),
  );

  // Widening pools, in order. Each is sorted by id and rotated by the seed so
  // the pick is stable per card and still varies between cards.
  const family = target.family.split("/")[0];
  const pools = [
    usable.filter((reaction) => reaction.reactants[0] === target.reactants[0]),
    usable.filter((reaction) => reaction.family.split("/")[0] === family),
    usable,
  ];

  const picked: StagedReaction[] = [];
  const products = new Set<string>([target.product]);
  for (const pool of pools) {
    const sorted = [...pool].sort((a, b) => a.id.localeCompare(b.id));
    for (let i = 0; i < sorted.length && picked.length < PREDICT_OPTIONS - 1; i += 1) {
      const candidate = sorted[(i + seed) % sorted.length];
      if (candidate === undefined || products.has(candidate.product)) continue;
      products.add(candidate.product);
      picked.push(candidate);
    }
  }
  if (picked.length < PREDICT_OPTIONS - 1) return null;

  const options = picked.map((reaction) => optionOf(reaction, false));
  options.splice(seed % PREDICT_OPTIONS, 0, optionOf(target, true));
  return options;
}
