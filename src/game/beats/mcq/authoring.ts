/**
 * The authoring contract for the easy MCQ beat, made executable.
 *
 * WHY THIS FILE EXISTS AT ALL. "Deliberately easy" is a promise, and a promise
 * with nothing checking it lasts exactly until the first authoring wave that is
 * in a hurry. The owner's complaint is that the existing onboarding and DAT quiz
 * questions are too complex and nobody returns to them, so the properties that
 * make this beat different are written here as a list a test can run: one
 * concept, three or four options, options short enough to read in a glance, no
 * arithmetic, and an authored explanation on every option.
 *
 * REPORTED, NEVER REPAIRED. This is the same discipline as levelRuleViolations
 * in ../types.ts and createProblem in packages/curriculum: a beat that breaks
 * the contract is an authoring defect, and quietly trimming an option list or
 * inventing a missing `why` would hide it. Nothing here mutates a beat.
 *
 * AND IT NEVER WEAKENS A CHECK. CLAUDE.md's non negotiable applies to the
 * numbers below: if a beat fails MAX_OPTION_CHARS, the beat gets a shorter
 * option, not a bigger number.
 *
 * THE ANSWER KIND IS CURRICULUM'S, NOT A NEW ONE. `mcqAnswerSpec` builds a real
 * MultipleChoiceAnswerSpec through packages/curriculum's own
 * createMultipleChoiceAnswer, which is the constructor that refuses a duplicate
 * id, an empty label, a list of one, or a correct id that is not in the list.
 * So the structural half of the check is curriculum's and is maintained there;
 * this file only adds the half that is about being EASY, which curriculum has
 * no opinion about.
 */

import {
  createMultipleChoiceAnswer,
  voiceViolations,
  type MultipleChoiceAnswerSpec,
} from "@blueberry/curriculum";

import { DEFAULT_LEVELS, type McqBeat } from "../types";

/**
 * The easy contract, as numbers.
 *
 * Three or four options: two is a coin flip and five is a reading task. The
 * character caps are the "read it in a glance" rule; they were set by measuring
 * the authored set in content.ts and leaving a little headroom, and they are
 * ceilings rather than targets.
 */
export const MIN_OPTIONS = 3;
export const MAX_OPTIONS = 4;
export const MAX_OPTION_CHARS = 48;
export const MAX_PROMPT_CHARS = 90;
export const MAX_BRIEF_CHARS = 110;
export const MAX_WHY_CHARS = 320;

/**
 * Digits with arithmetic around them. This beat asks a student to know a thing,
 * never to compute one: numbers that NAME something are fine (1,2 against 1,4,
 * minus 78 degrees, pKa 10) and an expression to evaluate is not.
 */
const ARITHMETIC = /[0-9]\s*[+*/=]\s*[0-9]|\bcalculate\b|\bcompute\b|\bhow many moles\b/i;

export interface McqAuthoringViolation {
  readonly beatId: string;
  readonly rule: string;
}

/**
 * Build the curriculum answer spec for one beat.
 *
 * Throws exactly where createMultipleChoiceAnswer throws, which is the
 * repository's pattern for an authoring defect. Grading calls it, so a
 * malformed beat fails loudly at the first attempt rather than grading
 * something wrong quietly.
 */
export function mcqAnswerSpec(beat: McqBeat): MultipleChoiceAnswerSpec {
  return createMultipleChoiceAnswer({
    options: beat.options.map((option) => ({ id: option.id, text: option.text })),
    correctOptionId: beat.correctOptionId,
  });
}

/**
 * Run curriculum's voice lint over one authored string.
 *
 * The lint's own shape is the three field Explanation, and a BeatOption carries
 * one string. Putting the same text in all three fields applies the UNION of
 * the rules to it, which is strictly more conservative than picking one field:
 * the extra rules that come along ("try again", "review the chapter", empty)
 * are ones a `why` should obey anyway. Reusing the maintained lint beats
 * copying its regex list here, where the copy would drift.
 */
export function copyVoiceViolations(text: string): readonly string[] {
  return voiceViolations({ whatHappened: text, why: text, lookAt: text }).map(
    (violation) => violation.rule,
  );
}

/** Every way the authored set breaks the contract. Empty means it holds. */
export function mcqAuthoringViolations(
  beats: readonly McqBeat[],
): readonly McqAuthoringViolation[] {
  const found: McqAuthoringViolation[] = [];
  const report = (beatId: string, rule: string) => found.push({ beatId, rule });
  const seenIds = new Set<string>();

  for (const beat of beats) {
    if (seenIds.has(beat.id)) report(beat.id, "two beats share this id");
    seenIds.add(beat.id);

    // Structure, delegated to curriculum's constructor.
    try {
      mcqAnswerSpec(beat);
    } catch (error) {
      report(beat.id, `curriculum refused the option list: ${(error as Error).message}`);
    }

    // Easy: the option list is short and every option is short.
    if (beat.options.length < MIN_OPTIONS || beat.options.length > MAX_OPTIONS) {
      report(beat.id, `has ${beat.options.length} options, and the easy beat allows ${MIN_OPTIONS} to ${MAX_OPTIONS}`);
    }
    for (const option of beat.options) {
      if (option.text.length > MAX_OPTION_CHARS) {
        report(beat.id, `option ${option.id} is ${option.text.length} characters, over the ${MAX_OPTION_CHARS} cap`);
      }
      // Every option is explained, the right one included. The wrong ones so
      // the generic curriculum cause can never surface; the right one because
      // a student who guesses correctly has learned nothing.
      if (option.why === undefined || option.why.trim() === "") {
        report(beat.id, `option ${option.id} has no authored explanation`);
        continue;
      }
      if (option.why.length > MAX_WHY_CHARS) {
        report(beat.id, `option ${option.id} explanation is ${option.why.length} characters, over the ${MAX_WHY_CHARS} cap`);
      }
      for (const rule of copyVoiceViolations(option.why)) {
        report(beat.id, `option ${option.id} explanation: ${rule}`);
      }
    }

    // Easy: the prompt is one imperative line about one thing.
    if (beat.prompt.length > MAX_PROMPT_CHARS) {
      report(beat.id, `prompt is ${beat.prompt.length} characters, over the ${MAX_PROMPT_CHARS} cap`);
    }
    for (const rule of copyVoiceViolations(beat.prompt)) {
      report(beat.id, `prompt: ${rule}`);
    }
    if (beat.brief !== undefined) {
      if (beat.brief.length > MAX_BRIEF_CHARS) {
        report(beat.id, `brief is ${beat.brief.length} characters, over the ${MAX_BRIEF_CHARS} cap`);
      }
      for (const rule of copyVoiceViolations(beat.brief)) {
        report(beat.id, `brief: ${rule}`);
      }
    }

    // Easy: nothing to work out on paper.
    if (ARITHMETIC.test(beat.prompt) || (beat.brief !== undefined && ARITHMETIC.test(beat.brief))) {
      report(beat.id, "asks for arithmetic, which belongs in a quiz rather than in an easy beat");
    }

    // One concept per question, which is the whole design of this beat.
    if (beat.conceptIds.length === 0) {
      report(beat.id, "names no concept, so the review queue has nothing to key on");
    }

    // The level rule, restated for this kind. ../types.ts owns the general
    // form; this catches an mcq beat reaching for L3 produce, which it cannot
    // serve because picking from a list is never producing.
    const allowed = DEFAULT_LEVELS.mcq;
    if (beat.levels.length === 0) report(beat.id, "declares no mastery level");
    for (const level of beat.levels) {
      if (!allowed.includes(level)) {
        report(beat.id, `declares level ${level}, which an mcq beat does not serve`);
      }
    }
  }

  return found;
}
