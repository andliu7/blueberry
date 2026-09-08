/**
 * Turning what a student TYPED into the reagent tokens the curriculum checker
 * compares. This file exists because L3 is the rung where the bank goes away,
 * and everything that makes typing fair has to happen here or not at all.
 *
 * THE HONESTY PROBLEM, stated plainly because it is the reason this file is not
 * three lines. packages/curriculum/src/answers/reagents.ts matches tokens
 * exactly after whitespace normalisation, and its header says why that is only
 * defensible when the tokens come from a controlled vocabulary: guessing that
 * "sodium borohydride" and "NaBH4" are one thing is a natural language problem
 * wearing a chemistry problem's coat. At L3 the student is typing, so the
 * vocabulary is not controlled by the input any more. Two things close the gap,
 * and NEITHER of them loosens the checker:
 *
 *   1. AUTHORED EQUIVALENTS. Real spelling variants are declared per problem
 *      and handed to `createReagentsAnswer`. That is the package's own escape
 *      hatch and it is reviewed by a person.
 *   2. A CASE FOLD THAT IS ONLY EVER UNAMBIGUOUS. A typed token is folded to an
 *      authored spelling when exactly ONE authored spelling matches it
 *      case-insensitively, and is otherwise passed through untouched. So "naoh"
 *      becomes "NaOH", and if a problem ever carried both "CO" and "Co" the
 *      fold refuses to choose and exactness is preserved. This is the rule the
 *      curriculum package already settled for unit symbols in Phase 3 ("ATM"
 *      works, m and M stay exact), applied to the same class of problem.
 *
 * Nothing here widens what counts as correct. The vocabulary a token can fold
 * INTO is only ever the strings an author already wrote down.
 *
 * SEPARATORS. Students write a two part condition the way their key writes it:
 * "1) BH3, THF  2) H2O2, NaOH". So a number followed by ) or . or :, a
 * semicolon, and the word "then" all start a new step, and a comma, a plus and
 * a middle dot separate tokens inside one step.
 *
 * TWO CHARACTERS ARE DELIBERATELY NOT SEPARATORS, and both were found by a
 * failing test rather than by thinking about it:
 *   /  "Pd/C" is one reagent. Splitting it is a bug that only ever shows up on
 *      hydrogenolysis problems, which is to say on the protecting group node.
 *   ,  between two digits, because that comma is a LOCANT and not a list:
 *      "3-methyl-1,2-epoxybutane" is one molecule and "Br2, hv" is two things
 *      in one flask. The rule is exactly that narrow. A comma with a digit on
 *      only one side, as in "LDA,-78 C", still separates.
 */

import { normaliseReagent, type ReagentStep, type ReagentsAnswerSpec } from "@blueberry/curriculum";
import type { BankOption } from "./problem";

const SUBSCRIPT_DIGITS = "₀₁₂₃₄₅₆₇₈₉";

/**
 * Display text carries subscripts and a student pasting from a slide carries
 * them too. The authored answers are ASCII, so the two meet here.
 */
export function normaliseTypedText(text: string): string {
  let out = "";
  for (const character of text.normalize("NFC")) {
    const subscript = SUBSCRIPT_DIGITS.indexOf(character);
    if (subscript >= 0) {
      out += String(subscript);
      continue;
    }
    // Every dash a keyboard or a PDF can produce, folded to the plain one, so
    // "-78 C" and "–78 C" are the same temperature. U+2010 to U+2015 is
    // the whole dash block; the hyphen-minus we want is U+002D.
    const code = character.charCodeAt(0);
    if (code >= 0x2010 && code <= 0x2015) {
      out += "-";
      continue;
    }
    if (character === "º") {
      out += "°";
      continue;
    }
    out += character;
  }
  return out;
}

/**
 * A number followed by a bracket, a full stop or a colon, at the start of the
 * string or after a space. The leading (^|\s) is what keeps "NaOC(CH3)3" in one
 * piece: its "3)" is preceded by a letter, so it is not a step marker.
 */
const STEP_MARKER = /(^|\s)\d{1,2}\s*[).:]\s*/g;

/**
 * The sentinel the three step separators are rewritten to before one split.
 * A unit separator rather than a space, because a space is inside plenty of
 * real reagent names ("Jones reagent", "-78 C") and splitting on one would cut
 * them in half.
 */
const STEP_BREAK = "\u001f";

/**
 * A comma that is a list, a plus, or a middle dot.
 *
 * The comma half reads as "a comma with a digit on at most one side": the two
 * alternatives are "not preceded by a digit" and "not followed by a digit", so
 * a comma between two digits matches neither and is left alone. That is the
 * locant rule in one regex, and it is the fix for a real failing test where
 * "3-methyl-1,2-epoxybutane" arrived as two tokens.
 */
const TOKEN_SEPARATOR = /(?<!\d),|,(?!\d)|[+·]/;

/**
 * Split typed text into steps and tokens. Pure, and it never decides whether an
 * answer is right: it only decides what the student said.
 */
export function splitTypedAnswer(text: string): readonly (readonly string[])[] {
  const marked = normaliseTypedText(text)
    .replace(STEP_MARKER, STEP_BREAK)
    .replace(/\bthen\b/gi, STEP_BREAK)
    .replace(/;/g, STEP_BREAK);
  const steps: string[][] = [];
  for (const segment of marked.split(STEP_BREAK)) {
    const tokens = segment
      .split(TOKEN_SEPARATOR)
      .map((token) => normaliseReagent(token).replace(/\.+$/, "").trim())
      .filter((token) => token !== "");
    if (tokens.length > 0) steps.push(tokens);
  }
  return steps;
}

/**
 * Every spelling an author wrote down for this problem, in one set.
 *
 * Built from the answer, its accepted alternatives, its equivalence groups and
 * every bank chip, because a chip's tokens are answers too: the L2 pick and the
 * L3 typing are graded by the same call and so they share one vocabulary.
 */
export function answerVocabulary(
  spec: ReagentsAnswerSpec,
  bank: readonly BankOption[],
): ReadonlySet<string> {
  const vocabulary = new Set<string>();
  const add = (token: string) => {
    const normalised = normaliseReagent(token);
    if (normalised !== "") vocabulary.add(normalised);
  };
  for (const step of spec.steps) step.reagents.forEach(add);
  for (const alternative of spec.acceptedAlternatives) {
    for (const step of alternative) step.reagents.forEach(add);
  }
  for (const group of spec.equivalents) group.forEach(add);
  for (const option of bank) {
    for (const step of option.answer ?? []) step.forEach(add);
  }
  return vocabulary;
}

/**
 * Fold one token to an authored spelling, but only when the fold cannot be
 * wrong. Two authored spellings that differ only by case make the fold
 * ambiguous, and an ambiguous fold returns the token untouched.
 */
export function foldToVocabulary(token: string, vocabulary: ReadonlySet<string>): string {
  const normalised = normaliseReagent(token);
  if (vocabulary.has(normalised)) return normalised;
  const lowered = normalised.toLowerCase();
  let match: string | null = null;
  for (const entry of vocabulary) {
    if (entry.toLowerCase() !== lowered) continue;
    if (match !== null && match !== entry) return normalised;
    match = entry;
  }
  return match ?? normalised;
}

/** What the student typed, as the checker's own shape. */
export function parseTypedAnswer(
  text: string,
  spec: ReagentsAnswerSpec,
  bank: readonly BankOption[],
): readonly ReagentStep[] {
  const vocabulary = answerVocabulary(spec, bank);
  return splitTypedAnswer(text).map((tokens) => ({
    reagents: tokens.map((token) => foldToVocabulary(token, vocabulary)),
  }));
}

/** A chip's token answer, as the checker's own shape. The L2 half of one grader. */
export function stepsFromOption(option: BankOption): readonly ReagentStep[] {
  return (option.answer ?? []).map((tokens) => ({ reagents: [...tokens] }));
}
