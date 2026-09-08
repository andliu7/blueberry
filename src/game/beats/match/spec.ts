/**
 * The adapter: an authored MatchBeat becomes the thing the curriculum package
 * already knows how to grade. Read this header before trusting the file.
 *
 * WHY THERE IS AN ADAPTER AT ALL. Two shapes describe the same board and each
 * is right for its own job. `MatchBeat` in ../types.ts is AUTHORING shape: a
 * pair is one object carrying its left text, its right text and the sentence
 * that explains the pairing, because that is how a person writes a board and
 * how a person reviews one. `MatchingAnswerSpec` in packages/curriculum is
 * GRADING shape: two independent columns plus a separate list of authored
 * pairs, because a grader has to be able to say "this prompt landed on that
 * target" about a board the student built in any order. Converting once, here,
 * is cheaper than making either side pretend to be the other, and it means the
 * beat is graded by `checkMatching` and `matchingBreakdown` rather than by a
 * second implementation of the same comparison living in the shell. There is
 * one grader. This file only feeds it.
 *
 * THE ID SCHEME, because it will show up in a console and needs to be readable.
 * A pair authored as `pcc` becomes the prompt `p:pcc` and the target `t:pcc`.
 * `createMatchingAnswer` refuses a board where an id appears in both columns
 * (a shared id makes "b is on the wrong job" unreadable), so the two sides need
 * to differ, and a prefix keeps the authored id visible in both. A decoy
 * authored as `alcohol` becomes the target `t:alcohol` and has no prompt, which
 * is exactly the "more targets than prompts" case the curriculum header blesses
 * as a legitimate authored distractor sitting in the target column.
 *
 * DECOYS ARE A LEVEL DECISION, not a board decision. ../types.ts says decoys
 * are empty at L1 and close at L2, so the level is an argument here and the L1
 * board is a plain bijection. This is the mastery ladder made executable rather
 * than described: difficulty rises because the board the student is handed is
 * literally a different board, not because a grader got stricter.
 *
 * AUTHORING PROBLEMS ARE REPORTED, NEVER REPAIRED. Same rule as
 * `levelRuleViolations` next door, and the same reason: a board with two pairs
 * sharing an id is an authoring mistake, and quietly renaming one hides it from
 * the person who can fix it. `matchAuthoringProblems` returns sentences a human
 * reads; `buildMatchBoard` throws on the same conditions, so nothing downstream
 * ever holds a half valid board.
 *
 * TWO OF THOSE REPORTS ARE ABOUT THE SHELL RATHER THAN THE CHEMISTRY, and both
 * exist because the first review found each of them being decided silently in
 * a component instead:
 *
 *   `CARD_TEXT_CAP`. A card longer than this wraps to four or more lines in a
 *   390 point phone column, which pushes the target column and the feedback box
 *   off screen and destroys any row correspondence between the two sides. The
 *   cap is a WARNING rather than an error because a long card still grades
 *   correctly; it is reported because whether it READS is not something the
 *   renderer can fix, and the author is the only person who can move the
 *   sentence into `why` where it belongs.
 *
 *   `presentation: "connectors"`. The type allows it and this build renders
 *   columns for both values, on purpose: a connector board holds several
 *   answers at once and is graded together, which is exactly the reference
 *   weakness this beat exists to fix. That divergence used to live only in a
 *   comment in MatchBoard.tsx, which meant it never reached the person who
 *   authored the beat. It is a WARNING here so the AuthoringNotice surface
 *   actually says it out loud.
 */

import {
  createMatchingAnswer,
  type MatchingAnswerSpec,
  type OptionId,
} from "@blueberry/curriculum";
import {
  DEFAULT_LEVELS,
  type BeatId,
  type MasteryLevel,
  type MatchBeat,
  type NodeId,
} from "../types";

/**
 * The longest a card's own text may be before it stops reading as a pill.
 *
 * Where the number comes from, since a magic constant with no arithmetic behind
 * it is the kind of thing that gets edited to make a board pass. The narrow
 * reference viewport is 390 points. The board is two columns with a gap, so one
 * column is about 180 points, and a card's padding takes roughly 24 of those,
 * leaving about 156 points of text. Cards render at text-scale-sm, which is
 * 0.875rem, and a proportional face averages near 7.5 points a character at
 * that size, so a line holds about 20 characters. Three lines is the most a
 * pill can wrap to and still let four of them plus the target column plus the
 * feedback box share one screen, which puts the cap at 60 characters of hard
 * ceiling. It is set well below that, at 34, because every shipped card already
 * fits inside two lines and the point of the cap is to keep it that way rather
 * than to permit the worst layout that technically fits.
 */
export const CARD_TEXT_CAP = 34;

/** The prefix a prompt option id carries. See the header. */
export const PROMPT_PREFIX = "p:";
/** The prefix a target option id carries, decoys included. */
export const TARGET_PREFIX = "t:";

export function promptIdFor(pairId: string): OptionId {
  return `${PROMPT_PREFIX}${pairId}`;
}

export function targetIdFor(id: string): OptionId {
  return `${TARGET_PREFIX}${id}`;
}

/** The authored id inside an option id, for a log line or a card key. */
export function authoredIdOf(optionId: OptionId): string {
  if (optionId.startsWith(PROMPT_PREFIX)) return optionId.slice(PROMPT_PREFIX.length);
  if (optionId.startsWith(TARGET_PREFIX)) return optionId.slice(TARGET_PREFIX.length);
  return optionId;
}

/**
 * Everything the board and its copy need, resolved once.
 *
 * `answer` is the graded truth and the only thing `checkMatching` ever sees.
 * The four lookup tables beside it exist so no renderer and no sentence builder
 * has to walk the beat again: a miss needs the text of two cards and the
 * authored explanation of one pairing, and looking those up by id in a record
 * is the boring version of that.
 */
export interface MatchBoardSpec {
  readonly beatId: BeatId;
  readonly node: NodeId;
  readonly level: MasteryLevel;
  readonly prompt: string;
  readonly brief?: string;
  readonly diamonds?: number;
  /** The graded board. Built by createMatchingAnswer, which validates it. */
  readonly answer: MatchingAnswerSpec;
  /** Card text by option id, both columns, decoys included. */
  readonly text: Readonly<Record<OptionId, string>>;
  /** The authored `why` of a pairing, keyed by its PROMPT option id. */
  readonly whyByPrompt: Readonly<Record<OptionId, string>>;
  /** The authored `why` of a decoy, keyed by its TARGET option id. */
  readonly whyByDecoy: Readonly<Record<OptionId, string>>;
  /** Target option ids that pair with nothing at this level. */
  readonly decoyTargetIds: readonly OptionId[];
}

/**
 * Every reason this beat cannot be played, in sentences. Empty means playable.
 *
 * Two of these are warnings rather than errors and they say so, because a board
 * with no `why` still grades: it just cannot tell a student anything beyond
 * what the pairing is not. That is worth a person seeing before it ships, and
 * it is not worth refusing to render.
 */
export function matchAuthoringProblems(
  beat: MatchBeat,
  level: MasteryLevel,
): readonly string[] {
  const problems: string[] = [];

  if (!DEFAULT_LEVELS.match.includes(level)) {
    problems.push(
      `a match beat cannot be played at level ${level}; matching serves ${DEFAULT_LEVELS.match.join(" and ")}`,
    );
  }
  if (!beat.levels.includes(level)) {
    problems.push(
      `${beat.id} declares levels ${beat.levels.join(", ")} and is being asked for level ${level}`,
    );
  }
  if (beat.pairs.length < 2) {
    problems.push("a board needs at least two pairs, or there is nothing to choose between");
  }
  if (beat.presentation === "connectors") {
    problems.push(
      `WARNING: ${beat.id} is authored as connectors and is being drawn as columns. ` +
        "Connectors hold several answers at once and are graded together, and this board " +
        "judges every pair the moment it is made, so the two cannot both be true. Author it " +
        'as "columns" or say why this board needs the whole-board grading back.',
    );
  }

  const seen = new Set<string>();
  for (const pair of beat.pairs) {
    if (seen.has(pair.id)) problems.push(`two pairs share the id ${pair.id}`);
    seen.add(pair.id);
    if (pair.left.trim() === "") problems.push(`pair ${pair.id} has no left hand text`);
    if (pair.right.trim() === "") problems.push(`pair ${pair.id} has no right hand text`);
    if (pair.why === undefined || pair.why.trim() === "") {
      problems.push(
        `WARNING: pair ${pair.id} carries no why, so a miss on it can only be told what it is not`,
      );
    }
    problems.push(...overlongCardProblems(`pair ${pair.id}`, "left", pair.left));
    problems.push(...overlongCardProblems(`pair ${pair.id}`, "right", pair.right));
  }

  for (const decoy of decoysAt(beat, level)) {
    if (seen.has(decoy.id)) {
      problems.push(`decoy ${decoy.id} reuses a pair id, so its target would collide`);
    }
    seen.add(decoy.id);
    if (decoy.text.trim() === "") problems.push(`decoy ${decoy.id} has no text`);
    if (decoy.why === undefined || decoy.why.trim() === "") {
      problems.push(
        `WARNING: decoy ${decoy.id} carries no why, and a decoy without one is a trap rather than a lesson`,
      );
    }
    problems.push(...overlongCardProblems(`decoy ${decoy.id}`, "text", decoy.text));
  }

  return problems;
}

/**
 * One WARNING line per card that is too long to read as a pill.
 *
 * The sentence names the fix rather than only the fault, because "77 characters"
 * on its own does not tell an author what to do with the other 43.
 */
function overlongCardProblems(
  owner: string,
  side: string,
  text: string,
): readonly string[] {
  if (text.length <= CARD_TEXT_CAP) return [];
  return [
    `WARNING: ${owner} has ${text.length} characters of ${side} text and the cap is ` +
      `${CARD_TEXT_CAP}. On a 390 point phone that wraps past two lines and pushes the ` +
      "feedback box off screen. Shorten the card and move the explanation into its why.",
  ];
}

/** True when nothing in the list stops the board being played. */
export function isPlayable(problems: readonly string[]): boolean {
  return problems.every((problem) => problem.startsWith("WARNING:"));
}

/** Decoys are empty at L1 and close at L2, per ../types.ts. */
export function decoysAt(beat: MatchBeat, level: MasteryLevel) {
  if (level < 2) return [];
  return beat.decoys ?? [];
}

/**
 * Build the graded board. Throws on an authoring error, because a board that
 * cannot be graded honestly must not reach a student in any form.
 */
export function buildMatchBoard(beat: MatchBeat, level: MasteryLevel): MatchBoardSpec {
  const problems = matchAuthoringProblems(beat, level);
  if (!isPlayable(problems)) {
    throw new Error(`${beat.id} cannot be played at level ${level}: ${problems.join("; ")}`);
  }

  const decoys = decoysAt(beat, level);
  const answer = createMatchingAnswer({
    prompts: beat.pairs.map((pair) => ({ id: promptIdFor(pair.id), text: pair.left })),
    targets: [
      ...beat.pairs.map((pair) => ({ id: targetIdFor(pair.id), text: pair.right })),
      ...decoys.map((decoy) => ({ id: targetIdFor(decoy.id), text: decoy.text })),
    ],
    pairs: beat.pairs.map((pair) => ({
      promptId: promptIdFor(pair.id),
      targetId: targetIdFor(pair.id),
    })),
  });

  const text: Record<OptionId, string> = {};
  const whyByPrompt: Record<OptionId, string> = {};
  const whyByDecoy: Record<OptionId, string> = {};
  for (const pair of beat.pairs) {
    text[promptIdFor(pair.id)] = pair.left;
    text[targetIdFor(pair.id)] = pair.right;
    if (pair.why !== undefined) whyByPrompt[promptIdFor(pair.id)] = pair.why;
  }
  for (const decoy of decoys) {
    text[targetIdFor(decoy.id)] = decoy.text;
    if (decoy.why !== undefined) whyByDecoy[targetIdFor(decoy.id)] = decoy.why;
  }

  return Object.freeze({
    beatId: beat.id,
    node: beat.node,
    level,
    prompt: beat.prompt,
    ...(beat.brief === undefined ? {} : { brief: beat.brief }),
    ...(beat.diamonds === undefined ? {} : { diamonds: beat.diamonds }),
    answer,
    text: Object.freeze(text),
    whyByPrompt: Object.freeze(whyByPrompt),
    whyByDecoy: Object.freeze(whyByDecoy),
    decoyTargetIds: Object.freeze(decoys.map((decoy) => targetIdFor(decoy.id))),
  });
}

/** Card text, or the raw id when something has asked about a card that is gone. */
export function textOf(spec: MatchBoardSpec, optionId: OptionId): string {
  return spec.text[optionId] ?? optionId;
}

/** The authored target for a prompt, from the graded board rather than the beat. */
export function authoredTargetFor(
  spec: MatchBoardSpec,
  promptId: OptionId,
): OptionId | undefined {
  return spec.answer.pairs.find((pair) => pair.promptId === promptId)?.targetId;
}

/** How many prompts the authored board puts on this target. Zero for a decoy. */
export function authoredLoadOf(spec: MatchBoardSpec, targetId: OptionId): number {
  return spec.answer.pairs.filter((pair) => pair.targetId === targetId).length;
}
