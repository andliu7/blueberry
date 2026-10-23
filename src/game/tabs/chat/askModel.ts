/**
 * Bloom's brain: what Bloom says to any question, as plain functions so it can
 * be tested without a screen. Ask Blueberry AND the Bloom thread in Messages
 * both answer through `answer` below, so Bloom is one character that never
 * gives two different answers to the same question.
 *
 * There is no language model behind this. Bloom answers two kinds of question
 * from data that already exists and has been checked:
 *
 *   1. About a reaction or reagent: the curriculum's own reaction table. A
 *      question with a direction ("make an alcohol from an aldehyde") is read
 *      as substrate class and product class, and both must match. Anything
 *      else is looked up word by word, and a name only matches where a word
 *      STARTS, so "hydride" never finds "anhydride".
 *   2. About the student: streak, XP today, cards due, the next lesson. Read
 *      from the local journal and decks.
 *
 * Chemistry is tried before the study keywords, so "what lesson covers
 * Grignard" or "review aldol" reach the reaction table instead of being
 * caught by the words "lesson" or "review".
 *
 * A miss says so with a suggestion, never an invented answer.
 */

import {
  searchByClass,
  searchByProductClass,
  searchBySubstrateClass,
  REACTIONS,
  searchReactions,
  type Reaction,
} from "@blueberry/curriculum";
import { plural } from "@/lib/helpers";

export interface AskState {
  readonly streak: number;
  readonly todayCounted: boolean;
  readonly cardsDue: number;
  readonly nextLesson: string | null;
  readonly hasCourse: boolean;
  readonly xpToday: number;
}

export type AskLink = "pathway" | "cards" | "search";

export type Answer =
  | { readonly kind: "text"; readonly text: string; readonly link?: { readonly label: string; readonly to: AskLink } }
  | {
      readonly kind: "reaction";
      readonly text: string;
      /** The single best match, drawn as one card. */
      readonly reaction: Reaction;
      /** The next few matches, offered as one-tap follow-up questions. */
      readonly others: readonly Reaction[];
    };

/** Most follow-up matches offered under a reaction card. */
export const MAX_OTHERS = 3;

/** The one-tap questions in the empty chat. Each one hits a different branch below. */
export const STARTER_QUESTIONS = [
  "What does PCC do?",
  "How do I make an alcohol from an aldehyde?",
  "What should I study next?",
  "How many cards are due?",
] as const;

/** Words that carry no search meaning, dropped before looking up a reaction. */
const FILLER = new Set([
  "what", "whats", "which", "does", "do", "did", "is", "are", "was", "how", "the", "a", "an", "of", "to", "into",
  "with", "and", "or", "work", "works", "mean", "means", "use", "used", "using", "for", "in", "on", "about",
  "tell", "me", "explain", "can", "could", "you", "i", "my", "it", "this", "that", "reaction", "reactions",
  "reagent", "reagents", "happens", "happen", "when", "react", "should", "would", "will", "next", "study",
  "learn", "start", "lesson", "lessons", "review", "card", "cards", "flashcards", "due", "many", "much",
  "today", "now", "covers", "cover", "covered", "where", "find", "show", "give", "make", "makes", "making",
  "get", "from", "please", "help", "need", "want", "know", "why", "who", "there", "any", "some", "again",
]);

/** Words that say the student wants to know WHERE to study a reaction. */
const STUDY_WORDS = ["lesson", "lessons", "learn", "study", "review", "covers", "cover", "covered", "where"];

/** The words a question is made of, lower case, punctuation stripped (keeps digits, + and - for reagents). */
function words(question: string): string[] {
  return question
    .toLowerCase()
    .replace(/[^a-z0-9+\-\s]/g, " ")
    .split(/\s+/)
    .filter((word) => word !== "");
}

/** Lower case, every run of non letters and digits turned into one space, padded so " key" is a word start. */
function wordText(text: string): string {
  return ` ${text.toLowerCase().replace(/[^a-z0-9+]+/g, " ").trim()} `;
}

/** True when the key starts a word in the reaction's name or any alias. */
function nameStartsWord(reaction: Reaction, key: string): boolean {
  const needle = wordText(key).trimEnd();
  return [reaction.name, ...reaction.aliases].some((text) => wordText(text).includes(needle));
}

/** Where each reaction sits in the table, which is the course's teaching order. */
const TABLE_ORDER = new Map(REACTIONS.map((reaction, index) => [reaction.id, index]));

function inCourseOrder(reactions: readonly Reaction[]): readonly Reaction[] {
  return [...reactions].sort((left, right) => (TABLE_ORDER.get(left.id) ?? 0) - (TABLE_ORDER.get(right.id) ?? 0));
}

/**
 * The curriculum search, minus mid-word name hits, in the course's teaching
 * order. searchReactions matches names as substrings ("hydride" is inside
 * "anhydride"); the reagent and class axes are already exact or word-start,
 * so they are kept as they are. Teaching order puts the reaction a student
 * meets first on top: "Grignard" leads with addition to an aldehyde or ketone,
 * not the enone special case whose name happens to contain the word.
 */
export function rankedReactions(query: string): readonly Reaction[] {
  return inCourseOrder(
    searchReactions(query)
      .filter((match) => match.matchedOn.some((axis) => axis !== "name") || nameStartsWord(match.reaction, query))
      .map((match) => match.reaction),
  );
}

/**
 * The chemical class a phrase names, as the reaction table spells it, or null.
 * "an aldehyde" gives "aldehyde", "carboxylic acids" gives "carboxylic acid".
 * Tries the last three, two, then one meaningful words, plural and singular.
 */
function classIn(phrase: string): string | null {
  const meaningful = words(phrase).filter((word) => !FILLER.has(word));
  for (let size = Math.min(3, meaningful.length); size >= 1; size -= 1) {
    const tail = meaningful.slice(-size).join(" ");
    for (const candidate of [tail, tail.replace(/s$/, ""), tail.replace(/es$/, "")]) {
      if (candidate.length >= 3 && searchByClass(candidate).length > 0) return candidate;
    }
  }
  return null;
}

/**
 * "make Y from X", "from X to Y", "turn X into Y", "X to Y". Each pattern
 * names which capture is the starting material and which is the product.
 */
const DIRECTIONS: readonly { readonly pattern: RegExp; readonly from: 1 | 2 }[] = [
  { pattern: /\b(?:make|making|get|form|forming|prepare|synthesi[sz]e)\s+(.+?)\s+from\s+(.+)/, from: 2 },
  { pattern: /\bfrom\s+(.+?)\s+(?:to|into)\s+(.+)/, from: 1 },
  { pattern: /\b(?:turn|convert|change)\s+(.+?)\s+(?:to|into)\s+(.+)/, from: 1 },
  { pattern: /(.+?)\s+(?:to|into|->)\s+(.+)/, from: 1 },
];

type Found = { readonly reactions: readonly Reaction[] };

/** A question with a direction in it, read as substrate and product. Null when it has none. */
function lookUpDirection(question: string): Found | { readonly from: string; readonly to: string; readonly reactions: readonly [] } | null {
  const text = question.toLowerCase().replace(/[?!.]/g, " ");
  for (const { pattern, from } of DIRECTIONS) {
    const match = pattern.exec(text);
    if (match === null) continue;
    const start = classIn(match[from] ?? "");
    const end = classIn(match[from === 1 ? 2 : 1] ?? "");
    if (start === null || end === null) continue;
    const makes = new Set(searchByProductClass(end).map((reaction) => reaction.id));
    const reactions = inCourseOrder(searchBySubstrateClass(start).filter((reaction) => makes.has(reaction.id)));
    if (reactions.length === 0) return { from: start, to: end, reactions: [] };
    return { reactions };
  }
  return null;
}

/** The reaction lookup: the whole question first, then its meaningful words, longest first. */
function lookUp(question: string): Found | null {
  const whole = question.trim();
  const direct = rankedReactions(whole);
  if (direct.length > 0) return { reactions: direct };
  const terms = words(question)
    .filter((word) => !FILLER.has(word) && word.length >= 3)
    .sort((left, right) => right.length - left.length);
  for (const term of terms) {
    const found = rankedReactions(term);
    if (found.length > 0) return { reactions: found };
  }
  return null;
}

function reactionAnswer(found: Found, question: string, topicLabel: (reaction: Reaction) => string): Answer {
  const best = found.reactions[0]!;
  const said = words(question);
  const lead = STUDY_WORDS.some((word) => said.includes(word))
    ? `That's in ${topicLabel(best)}.`
    : found.reactions.length === 1
      ? "Here's the one I know."
      : `Here's the best match of ${found.reactions.length}.`;
  return { kind: "reaction", text: lead, reaction: best, others: found.reactions.slice(1, 1 + MAX_OTHERS) };
}

/**
 * Bloom's answer. `topicLabel` names a reaction's lesson topic; it is passed
 * in so this file stays a pure lookup (the chat passes the curriculum's own).
 */
export function answer(question: string, state: AskState, topicLabel: (reaction: Reaction) => string = () => "its topic"): Answer {
  const said = words(question);
  const has = (...keys: string[]) => keys.some((key) => said.includes(key));

  if (has("streak")) {
    if (state.streak === 0) return { kind: "text", text: "No streak yet. Finish one lesson today and it starts at 1!", link: { label: "Start a lesson", to: "pathway" } };
    return {
      kind: "text",
      text: state.todayCounted
        ? `You're on a ${plural(state.streak, "day", "day")} streak, and today already counts. Nice!`
        : `You're on a ${plural(state.streak, "day", "day")} streak. One lesson today keeps it alive.`,
      link: state.todayCounted ? undefined : { label: "Keep it going", to: "pathway" },
    };
  }

  if (has("xp")) {
    return { kind: "text", text: state.xpToday === 0 ? "No XP yet today. A lesson is the quickest way to earn some." : `You've earned ${state.xpToday} XP today.`, link: { label: "Earn XP", to: "pathway" } };
  }

  // A reaction's exact name (what a follow-up button sends) is that reaction, read no other way.
  const named = REACTIONS.find((reaction) => reaction.name.toLowerCase() === question.trim().toLowerCase());
  if (named !== undefined) return { kind: "reaction", text: "Here it is.", reaction: named, others: [] };

  const direction = lookUpDirection(question);
  if (direction !== null && "from" in direction) {
    return {
      kind: "text",
      text: `I don't have a one-step reaction from ${direction.from} to ${direction.to} in my table. Try asking about each end on its own.`,
      link: { label: "Search reactions", to: "search" },
    };
  }
  if (direction !== null) return reactionAnswer(direction, question, topicLabel);

  const found = lookUp(question);
  if (found !== null) return reactionAnswer(found, question, topicLabel);

  if (has("due", "review", "flashcards", "cards", "card")) {
    return state.cardsDue === 0
      ? { kind: "text", text: "No cards are due today. You're all caught up!" }
      : { kind: "text", text: `${plural(state.cardsDue, "card is", "cards are")} due today. A quick review keeps them fresh.`, link: { label: "Review cards", to: "cards" } };
  }

  if (has("next", "study", "learn", "start", "lesson")) {
    if (!state.hasCourse) return { kind: "text", text: "Pick a course first and I'll point you at lesson one.", link: { label: "Pick a course", to: "pathway" } };
    if (state.nextLesson === null) return { kind: "text", text: "You've cleared every lesson on your path so far. Great work!" };
    return { kind: "text", text: `Next up on your path: ${state.nextLesson}.`, link: { label: "Start it", to: "pathway" } };
  }

  return {
    kind: "text",
    text: "I couldn't find that in my reaction table. Try a reagent like NaBH4 or PCC, a name like aldol or Grignard, or \"aldehyde to alcohol\".",
  };
}

/**
 * The same answer as one line of plain text, for a chat bubble that cannot
 * hold a card (the Messages thread). Same words as the card's, so the two
 * places never disagree.
 */
export function answerText(reply: Answer): string {
  if (reply.kind === "text") return reply.text;
  const where = reply.text.startsWith("That's in") ? ` ${reply.text}` : "";
  return `${reply.reaction.name}. ${reply.reaction.transformation}${where}`;
}
