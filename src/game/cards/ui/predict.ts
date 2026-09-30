/**
 * "Call it": the product a student predicts before a reaction card flips.
 * Read this header before trusting anything in this file.
 *
 * WHY PREDICT AT ALL. Anki's front is a prompt and a promise: the student is
 * supposed to answer in their head, and nothing checks that they did. Tapping
 * one of three drawn products makes the retrieval happen for real, and it
 * turns the reveal into feedback on a committed answer rather than a
 * confirmation of a vague one.
 *
 * THE WRONG OPTIONS CANNOT BE PICKED BY COUNTING ATOMS. Round 1 drew them from
 * other registry reactions, and a critic measured that on four of six starter
 * cards the answer was the only option carrying the element the reagent
 * brought (the only N after methylamine, the only Br after HBr). They now come
 * from scripts/build_card_distractors.py, which derives each one with RDKit
 * (the other end of the allyl system, the tautomer, the group on a different
 * carbon, one reduction too far, or a sibling reagent's real product) and keeps
 * only structures with EXACTLY the answer's element set and carbon count. So
 * the options differ only in where the atoms are, which is the chemistry.
 * cardsRun.test.ts pins that rule over every registry reaction.
 *
 * A reaction the script could not give two honest wrong options gets no
 * predict step (PREDICT_GAPS): a question answerable by elimination is worse
 * than a plain flip.
 *
 * DETERMINISTIC. The answer's position comes from a hash of the card id, so a
 * reload mid run deals the same three, and the position varies across cards.
 *
 * Pure: no React, no storage, no clock.
 */

import type { StagedReaction } from "../../../data/reactions";
import { PREDICT_DISTRACTORS, type PredictDistractor } from "../predictDistractors.generated";
import type { Card } from "../types";

export interface PredictOption {
  /** Stable key: the reaction id for the answer, the structure's SMILES otherwise. */
  readonly key: string;
  readonly light?: string;
  readonly dark?: string;
  /** Shown only after the pick: the product's name, or what the wrong one is. */
  readonly label: string;
  /** RDKit's formula, for tests and the accessible name after the pick. */
  readonly formula: string;
  readonly correct: boolean;
}

/** How many drawings the student chooses between. Three fit a 390px row. */
export const PREDICT_OPTIONS = 3;

function hash(text: string): number {
  let value = 0;
  for (let i = 0; i < text.length; i += 1) value = (value * 31 + text.charCodeAt(i)) | 0;
  return Math.abs(value);
}

function wrongOption(distractor: PredictDistractor): PredictOption {
  return {
    key: distractor.smiles,
    ...(distractor.light === undefined ? {} : { light: distractor.light }),
    ...(distractor.dark === undefined ? {} : { dark: distractor.dark }),
    label: distractor.caption,
    formula: distractor.formula,
    correct: false,
  };
}

/**
 * The options for one card, answer included, in display order. Null when the
 * card cannot be predicted honestly: a card the student wrote (no drawing), a
 * reaction the registry no longer holds, or a reaction in PREDICT_GAPS.
 */
export function predictionChoices(
  card: Card,
  reactions: readonly StagedReaction[],
  distractors: Readonly<Record<string, readonly PredictDistractor[]>> = PREDICT_DISTRACTORS,
): readonly PredictOption[] | null {
  if (card.source.kind !== "reaction") return null;
  const reactionId = card.source.reactionId;
  const target = reactions.find((reaction) => reaction.id === reactionId);
  const wrong = distractors[reactionId];
  if (target === undefined || wrong === undefined || wrong.length < PREDICT_OPTIONS - 1) return null;
  if (target.art.product_light === undefined && target.art.product_dark === undefined) return null;

  const answer: PredictOption = {
    key: target.id,
    ...(target.art.product_light === undefined ? {} : { light: target.art.product_light }),
    ...(target.art.product_dark === undefined ? {} : { dark: target.art.product_dark }),
    label: target.product_label,
    formula: target.product_formula,
    correct: true,
  };
  const options = wrong.slice(0, PREDICT_OPTIONS - 1).map(wrongOption);
  options.splice(hash(card.id) % PREDICT_OPTIONS, 0, answer);
  return options;
}
