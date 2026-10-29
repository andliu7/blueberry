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

import type {
  Card,
  CardQuizKind,
  CardId,
  DeckId,
  ReactionReveal,
  ReactionRevealField,
  ReactionSide,
  ReactionSides,
} from "../types";

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

/* ------------------------------------------------------------------ */
/* The optional extras (owner decision, 17 Sep)                          */
/* ------------------------------------------------------------------ */

/**
 * The reaction card's optional face-and-reveal fields, as draft strings: the
 * temperature chip plus the five labelled reveal fields. All optional, all
 * the student's own words, and a draft with none of them filled saves the
 * same card it always did. `hasExtras` is the gate: only a draft that
 * carries at least one becomes a reaction-faced card, so the three-sided
 * pill face stays the default the committed composer image draws.
 */
/**
 * The reveal fields the COMPOSER offers, which is a subset of REVEAL_ORDER
 * and is deliberately the owner's original five. The reveal also carries
 * solvent, acid/base and notes now, but those are read off data/reactions.ts
 * for a card built from the registry; asking a student to type them into
 * their own card would be three more empty boxes in a form that already has
 * five, so the authoring form stays as the committed composer image draws it.
 */
export const COMPOSER_REVEAL_FIELDS = [
  "keq",
  "pka",
  "selectivity",
  "electronegativity",
  "resonance",
] as const satisfies readonly ReactionRevealField[];

export type ComposerRevealField = (typeof COMPOSER_REVEAL_FIELDS)[number];

export interface DraftExtras extends Record<ComposerRevealField, string> {
  readonly temperature: string;
}

export const EMPTY_EXTRAS: DraftExtras = Object.freeze({
  temperature: "",
  keq: "",
  pka: "",
  selectivity: "",
  electronegativity: "",
  resonance: "",
});

/** Replace one extra. A new object every time, because this is React state. */
export function setExtra(
  extras: DraftExtras,
  field: keyof DraftExtras,
  text: string,
): DraftExtras {
  return { ...extras, [field]: text };
}

export function hasExtras(extras: DraftExtras): boolean {
  return Object.values(extras).some((value) => value.trim().length > 0);
}

/** The reveal the draft's extras amount to: trimmed, and absent when blank. */
export function revealFromExtras(extras: DraftExtras): ReactionReveal {
  const reveal: Record<string, string> = {};
  for (const field of COMPOSER_REVEAL_FIELDS) {
    const value = extras[field].trim();
    if (value.length > 0) reveal[field] = value;
  }
  return reveal as ReactionReveal;
}

/** The one place the three sides become a Card. See the header for the mapping. */
export function cardFromDraft(
  sides: ReactionSides,
  now: Date,
  extras: DraftExtras = EMPTY_EXTRAS,
): Card {
  const setup = sides.setup.trim();
  const conditions = sides.conditions.trim();
  const product = sides.product.trim();
  const temperature = extras.temperature.trim();
  return {
    id: composedCardId(sides, now),
    front: setup,
    back: product,
    why: `Conditions: ${conditions}`,
    tags: ["composed"],
    source: { kind: "composed", at: now.toISOString() },
    sides: { setup, conditions, product },
    // The reaction face rides along only when the student filled an extra:
    // the sides map straight onto it (setup is the reactant side, conditions
    // sit over the arrow, product is the withheld side), and the reveal
    // carries exactly the fields they wrote. See cards/types.ts.
    ...(hasExtras(extras)
      ? {
          reaction: {
            reactants: setup,
            reagents: conditions,
            products: product,
            ...(temperature.length > 0 ? { temperature } : {}),
            reveal: revealFromExtras(extras),
          },
        }
      : {}),
  };
}

/* ------------------------------------------------------------------ */
/* The plain question card                                              */
/* ------------------------------------------------------------------ */

/**
 * Not every card is a reaction. "Which proton is most acidic" or "why is
 * the axial conformer higher in energy" is a question and an answer, and
 * forcing it into Setup / Conditions / Product would put words in the wrong
 * boxes. So the composer offers a second shape that maps straight onto the
 * classic triple: front asks, back answers, why teaches (optional here,
 * because it is the student's own card and a blank why is honest).
 */
export interface QuestionDraft {
  readonly front: string;
  readonly back: string;
  readonly why: string;
}

export const EMPTY_QUESTION: QuestionDraft = Object.freeze({ front: "", back: "", why: "" });

export function questionProblems(draft: QuestionDraft): readonly string[] {
  const problems: string[] = [];
  if (draft.front.trim().length === 0) problems.push("Write the question so the card can ask something.");
  if (draft.back.trim().length === 0) problems.push("Add the answer so the card can check you.");
  return problems;
}

/** Same id scheme as a reaction draft, keyed on the question's own words. */
export function questionCardFromDraft(draft: QuestionDraft, now: Date): Card {
  const front = draft.front.trim();
  return {
    id: composedCardId({ setup: front, conditions: "", product: "" }, now),
    front,
    back: draft.back.trim(),
    why: draft.why.trim(),
    tags: ["composed"],
    source: { kind: "composed", at: now.toISOString() },
  };
}

/* ------------------------------------------------------------------ */
/* The four question types (the default path of the composer)           */
/* ------------------------------------------------------------------ */

export const QUIZ_KINDS: readonly CardQuizKind[] = Object.freeze(["short", "long", "mcq", "multi"]);

export const QUIZ_LABELS: Readonly<Record<CardQuizKind, string>> = Object.freeze({
  short: "Short answer",
  long: "Long answer",
  mcq: "Pick one",
  multi: "Pick many",
});

export interface QuizDraft {
  readonly kind: CardQuizKind;
  readonly question: string;
  /** Short and long answers: the answer in words. Long answers may leave it blank. */
  readonly answer: string;
  /** Choice kinds: the option texts, including any blank rows still being typed. */
  readonly options: readonly string[];
  /** Choice kinds: indexes into options marked correct. */
  readonly correct: readonly number[];
  readonly why: string;
}

/** Two blank rows: the least a choice question can have. */
export const EMPTY_QUIZ: QuizDraft = Object.freeze({
  kind: "short",
  question: "",
  answer: "",
  options: Object.freeze(["", ""]),
  correct: Object.freeze([]),
  why: "",
});

/** Switching type keeps the words; a pick-one keeps at most one correct mark. */
export function setQuizKind(draft: QuizDraft, kind: CardQuizKind): QuizDraft {
  const correct = kind === "mcq" ? draft.correct.slice(0, 1) : draft.correct;
  return { ...draft, kind, correct };
}

export function setOption(draft: QuizDraft, index: number, text: string): QuizDraft {
  return { ...draft, options: draft.options.map((o, i) => (i === index ? text : o)) };
}

export function addOption(draft: QuizDraft): QuizDraft {
  return { ...draft, options: [...draft.options, ""] };
}

/** Drop a row; marks above it shift down, and its own mark goes. Two rows stay. */
export function removeOption(draft: QuizDraft, index: number): QuizDraft {
  if (draft.options.length <= 2) return draft;
  return {
    ...draft,
    options: draft.options.filter((_, i) => i !== index),
    correct: draft.correct.filter((c) => c !== index).map((c) => (c > index ? c - 1 : c)),
  };
}

/** Pick one replaces the mark; pick many toggles it. */
export function toggleCorrect(draft: QuizDraft, index: number): QuizDraft {
  if (draft.kind === "mcq") return { ...draft, correct: [index] };
  const has = draft.correct.includes(index);
  return { ...draft, correct: has ? draft.correct.filter((c) => c !== index) : [...draft.correct, index].sort((a, b) => a - b) };
}

const isChoice = (kind: CardQuizKind): boolean => kind === "mcq" || kind === "multi";

/** Filled option rows, with their original index so correct marks still line up. */
function filledOptions(draft: QuizDraft): { text: string; at: number }[] {
  return draft.options.map((text, at) => ({ text: text.trim(), at })).filter((o) => o.text.length > 0);
}

export function quizProblems(draft: QuizDraft): readonly string[] {
  const problems: string[] = [];
  if (draft.question.trim().length === 0) problems.push("Write the question so the card can ask something.");
  if (isChoice(draft.kind)) {
    const filled = filledOptions(draft);
    if (filled.length < 2) problems.push("Add at least two options.");
    const marked = filled.filter((o) => draft.correct.includes(o.at)).length;
    if (filled.length >= 2 && marked === 0) problems.push(draft.kind === "mcq" ? "Tap the circle beside the right option." : "Tick every right option.");
  } else if (draft.kind === "short" && draft.answer.trim().length === 0) {
    problems.push("Add the answer so the card can check you.");
  }
  return problems;
}

/** A long answer with no model answer is checked by the student, and says so. */
export const SELF_CHECK_BACK = "Your answer, checked by you or your AI.";

export function quizCardFromDraft(draft: QuizDraft, now: Date): Card {
  const front = draft.question.trim();
  const base = {
    id: composedCardId({ setup: front, conditions: "", product: "" }, now),
    front,
    why: draft.why.trim(),
    tags: ["composed"],
    source: { kind: "composed" as const, at: now.toISOString() },
  };
  if (isChoice(draft.kind)) {
    const filled = filledOptions(draft);
    const correct = filled.map((o, i) => (draft.correct.includes(o.at) ? i : -1)).filter((i) => i >= 0);
    return {
      ...base,
      back: correct.map((i) => filled[i].text).join("; "),
      quiz: { kind: draft.kind, options: filled.map((o) => o.text), correct },
    };
  }
  const answer = draft.answer.trim();
  return {
    ...base,
    back: answer.length > 0 ? answer : SELF_CHECK_BACK,
    ...(draft.kind === "long" ? { quiz: { kind: "long" as const } } : {}),
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
