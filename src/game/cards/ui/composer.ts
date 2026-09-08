/**
 * The composer's logic, with no React in it. Read this header before trusting
 * anything in this file.
 *
 * WHAT THE COMPOSER IS. The design goals lock reaction cards as THREE SIDED:
 * Setup, Conditions, Product, switched by a segmented pill. A student writing
 * their own card writes all three, and the card carries them verbatim in
 * `Card.sides`. The classic front/back/why triple is DERIVED here as well, so
 * every surface that predates sides (export, CSV, the imported-deck view)
 * still renders the card whole. One writer, one mapping, in one file.
 *
 * THE MAPPING, and why it is this way round. Front is the setup, because the
 * setup is what a reaction question shows you first. Back is the product,
 * because the product is the answer a student checks themselves against.
 * `why` carries the conditions, prefixed so it reads as a sentence on a
 * legacy face. Nothing here is authored teaching copy and nothing pretends to
 * be: a composed card is the student's own words, its source kind says so,
 * and it never routes through packages/feedback.
 *
 * VALIDATION IS A LIST OF SENTENCES, not a boolean. The save button's
 * disabled state has to say what is missing in the coach voice, and a
 * boolean cannot. An all-empty draft is simply "not ready yet", which is a
 * normal state and not an error.
 *
 * Pure: no storage, no clock reads (now arrives as an argument), no React.
 */

import type { Card, CardId, DeckId, ReactionSide, ReactionSides } from "../types";

/** The pill's order, left to right, exactly as the committed composer image. */
export const SIDE_ORDER: readonly ReactionSide[] = Object.freeze([
  "setup",
  "conditions",
  "product",
]);

export const SIDE_LABELS: Readonly<Record<ReactionSide, string>> = Object.freeze({
  setup: "Setup",
  conditions: "Conditions",
  product: "Product",
});

/**
 * Placeholder copy per side: THE EXAMPLE ITSELF, nothing around it.
 *
 * They used to be sentences ("What you start with. For example: cyclopentene
 * + NBS"), which read well in a full-width field and clipped in a narrow one.
 * The composer draws a reaction SCHEME now, per the committed image, so each
 * side is a cell about a third of the frame wide, and a sentence in it is a
 * sentence cut off mid-word. The example alone teaches the same thing, fits
 * the box, and shows the shape of the answer rather than describing it, which
 * is what the image's own drawn scheme does. Each cell's role is named beside
 * it by the pill, by the preview under it and by the field's aria-label, so
 * nothing is carried by the placeholder alone.
 */
export const SIDE_HINTS: Readonly<Record<ReactionSide, string>> = Object.freeze({
  setup: "cyclopentene + NBS",
  conditions: "hv, heat",
  product: "3-bromocyclopentene",
});

export const EMPTY_SIDES: ReactionSides = Object.freeze({
  setup: "",
  conditions: "",
  product: "",
});

/** Replace one side. A new object every time, because this is React state. */
export function setSide(
  sides: ReactionSides,
  side: ReactionSide,
  text: string,
): ReactionSides {
  return { ...sides, [side]: text };
}

/**
 * What still stands between this draft and a card. Empty means saveable.
 * Sentences, not codes: the surface prints the first one under the save
 * button, so each must read as a coach naming the next step.
 */
export function draftProblems(sides: ReactionSides): readonly string[] {
  const problems: string[] = [];
  if (sides.setup.trim().length === 0) problems.push("Add a setup so the card can ask something.");
  if (sides.product.trim().length === 0) problems.push("Add the product so the card can answer.");
  if (sides.conditions.trim().length === 0)
    problems.push("Add the conditions, even just heat or a catalyst.");
  return problems;
}

export function canSave(sides: ReactionSides): boolean {
  return draftProblems(sides).length === 0;
}

/**
 * The id is minted from the save instant plus a normalised setup slug. Stable
 * for the card's whole life per types.ts's invariant: editing a card later is
 * a different flow that keeps the id; saving twice in the same millisecond
 * with the same setup is the same card, and updating it is the right result.
 */
export function composedCardId(sides: ReactionSides, now: Date): CardId {
  const slug = sides.setup
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 40);
  return `composed:${now.getTime()}:${slug}`;
}

/** The one place the three sides become a Card. See the header for the mapping. */
export function cardFromDraft(sides: ReactionSides, now: Date): Card {
  const setup = sides.setup.trim();
  const conditions = sides.conditions.trim();
  const product = sides.product.trim();
  return {
    id: composedCardId(sides, now),
    front: setup,
    back: product,
    why: `Conditions: ${conditions}`,
    tags: ["composed"],
    source: { kind: "composed", at: now.toISOString() },
    sides: { setup, conditions, product },
  };
}

/* ------------------------------------------------------------------ */
/* Where the card goes                                                  */
/* ------------------------------------------------------------------ */

/**
 * A new deck's id, from its student-given title. Prefixed so it can never
 * collide with the generated `lesson:` and `import:` namespaces, and slugged
 * so the id survives being written into a URL or a filename later.
 */
export function newDeckId(title: string): DeckId {
  const slug = title
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
  return `personal:${slug.length > 0 ? slug : "deck"}`;
}

/** A deck title is one line of the student's own words. Only emptiness fails. */
export function deckTitleProblem(title: string): string | null {
  return title.trim().length === 0 ? "Give the deck a name so you can find it again." : null;
}
