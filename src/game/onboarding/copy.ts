/**
 * Every student facing sentence in onboarding, in one file, and every one of
 * them is a DRAFT.
 *
 * CLAUDE.md, loop discipline: "Phase 5 carries the onboarding funnel and the
 * free lessons, which are the highest leverage copy in the product. That makes
 * it a human gate, not a loop. There is no exit condition for 'this lesson
 * converts.'" So the flow and the frames are the deliverable here and the words
 * are the owner's. Each string carries HUMAN_GATE_MARK so a reader can see at a
 * glance which sentences are still waiting on that gate, and so a test can
 * assert none of them slipped out unmarked.
 *
 * The mark is a PREFIX rather than a suffix on purpose: a truncated line in a
 * narrow chip still shows it.
 *
 * WHY THE STRINGS LIVE APART FROM THE COMPONENTS. Two reasons and they agree.
 * The owner rewrites this file at the gate without opening a single .tsx, and
 * the test that checks the voice contract reads one module rather than walking
 * JSX. The ids are stable; only the words move.
 *
 * ONE SHORT QUESTION PER SCREEN, owner 2026-09-04, in docs/DESIGN-GOALS.md:
 * "the onboarding questions are too complex. One short question per screen,
 * plain words, no compound sentences, no chemistry vocabulary in the framing.
 * The placement quiz is the only place a real chemistry question appears."
 *
 * The drafts below were rewritten to that ruling and it is not left to the
 * gate to notice a regression: FRAMING_LINES at the foot of this file is the
 * set of lines the ruling governs, and onboardingFlow.test.ts holds each one
 * to a single sentence, a length ceiling and a jargon list. The lines it does
 * NOT govern are named there too, with the reason for each.
 *
 * VOICE, per CLAUDE.md: a coach on the student's side. Name what happens
 * plainly, treat every answer as a normal answer, make the next action feel
 * within reach. No scolding, no rhetorical questions, no faux patience. These
 * drafts are written to that contract so the gate is reviewing the words and
 * not the tone from scratch.
 */

import { HUMAN_GATE_MARK, type HearChoice, type StartChoice, type WhyChoice } from "./flow";

/**
 * Re-exported so a component can draw the mark without importing the flow
 * model to get it. The mark's home is flow.ts, where `draft()` reads it; this
 * is the copy module's own surface for the one component that renders it.
 */
export { HUMAN_GATE_MARK };
import type { DailyGoalTier } from "@blueberry/economy";

/** Marks one draft line. Exported so a test can rebuild the expectation. */
export function draft(line: string): string {
  return `${HUMAN_GATE_MARK} ${line}`;
}

/** What the mascot says at the top of a step, and what the step is called. */
export interface StepCopy {
  /** The bubble line. The mascot asks; the chips answer. */
  readonly ask: string;
  /** A quiet line under the chips. Null where the step needs none. */
  readonly note: string | null;
}

export const WELCOME_GREETING = draft("Hi! I'm Berry.");
export const WELCOME_PROMISE = draft("Learn organic chemistry by doing it.");
export const WELCOME_START = draft("Get started");
export const WELCOME_RETURNING = draft("I already have an account");

/*
 * THE BONDING BEAT'S TWO LINES. They teach nothing and they ask nothing, which
 * is the point of the screen (see the Bond component in Onboarding.tsx and the
 * THREE-TEACHERS quality it implements). If the human gate rewrites these, the
 * one thing to preserve is that neither line gives the student a task.
 */
export const INTRO_ASK = draft("I will be right here the whole way.");
export const INTRO_NOTE = draft("Nothing here is a test.");

export const HEAR_ASK = draft("How did you hear about us?");
export const HEAR_NOTE = draft("Skip this one if you like.");
export const HEAR_SKIP = draft("Skip");

export const HEAR_LABEL: Readonly<Record<HearChoice, string>> = Object.freeze({
  friend: draft("A friend"),
  social: draft("Social media"),
  search: draft("Search"),
  professor: draft("My professor or TA"),
  app_store: draft("The app store"),
  other: draft("Somewhere else"),
});

export const WHY_ASK = draft("What brings you to chemistry?");

export const WHY_LABEL: Readonly<Record<WhyChoice, string>> = Object.freeze({
  orgo2_exam: draft("Orgo II exam prep"),
  dat_mcat: draft("DAT / MCAT"),
  surviving: draft("Surviving my course"),
  curious: draft("Curiosity"),
});

export const PLACEMENT_INTRO_ASK = draft("A few questions, so I know where to start you.");
export const PLACEMENT_START = draft("Start");
export const PLACEMENT_SKIP_QUESTION = draft("Skip this one");
/**
 * The word that fits in the header pill.
 *
 * blueberry_r9-onboard-placement draws its trailing pill 37 css wide, which
 * holds one short word and no more. The full sentence above stays as the
 * control's accessible name, so a screen reader hears "skip this one" and a
 * sighted student reads the four letters that fit.
 */
export const PLACEMENT_SKIP_SHORT = draft("Skip");
export const PLACEMENT_CHECK = draft("Check");
/** The counter over the question. `%d` slots are filled by the view. */
export const PLACEMENT_COUNTER = draft("Question %n of %total");
/** The second half of a major-product question: the ranking argument. */
export const PLACEMENT_REASON_ASK = draft("And why does that one win?");
export const PLACEMENT_DONE_ASK = draft("That is your starting point.");
export const PLACEMENT_SKIPPED_ASK = draft("We will start you at the beginning.");

export const OVERVIEW_ASK = draft("Here is your course.");
export const OVERVIEW_NOTE = draft("You can explore it in any order.");
/** Beside each act block: what it assumes comes from the outline, not from here. */
export const OVERVIEW_ASSUMES_LABEL = draft("Assumes");
export const OVERVIEW_TOPICS_LABEL = draft("topics");
export const OVERVIEW_START_HERE = draft("You start here");
/** The tail of a shortened act list. `%n` is filled by the view. */
export const OVERVIEW_MORE = draft("and %n more");

export const GOAL_ASK = draft("How much chemistry a day?");
export const GOAL_NOTE = draft("Mistakes never cost you anything.");
export const GOAL_LABEL: Readonly<Record<DailyGoalTier, string>> = Object.freeze({
  casual: draft("Casual"),
  regular: draft("Regular"),
  serious: draft("Serious"),
  exam: draft("Exam week"),
});
/** The `%n` slots are filled by the view from the economy tables, never typed here. */
export const GOAL_XP_LINE = draft("%n XP a day");

/*
 * THE PACING LINE COMES IN TWO, one for one lesson and one for more, and that
 * is a plural bug fixed rather than a flourish. A single "about %n lessons"
 * printed "about 1 lessons" on the casual tier, because the economy's casual
 * goal happens to divide to exactly one node. English is not a slot language
 * and no amount of formatter will make it one, so the two readings are two
 * authored lines and the view picks between them on the number it already has.
 * The gate rewrites both, and neither carries the noun in a slot.
 */
export const GOAL_PACING_ONE = draft("about one lesson a day");
export const GOAL_PACING_MANY = draft("about %n lessons a day");

export const START_ASK = draft("Where would you like to begin?");
export const START_NOTE = draft("You can change this later.");
export const START_LABEL: Readonly<Record<StartChoice, string>> = Object.freeze({
  placement: draft("Where I tested"),
  beginning: draft("Right at the start"),
});
export const START_FINISH = draft("Take me in");

export const CONTINUE = draft("Continue");
export const BACK_LABEL = draft("Go back");
/** The placement's leading control. An X leaves the quiz; a chevron steps back. */
export const LEAVE_LABEL = draft("Leave the quiz");
export const PROGRESS_LABEL = draft("Getting set up");

/**
 * THE GATE STRIP'S OWN LINE, and the one place the mark is drawn rather than
 * stripped.
 *
 * CLAUDE.md rules the onboarding funnel a human gate rather than a loop: the
 * flow and the frames are the deliverable and the words are the owner's. A
 * reviewer opening #/start/welcome has to be able to SEE that, and between
 * 2026-09-04 and this pass they could not: every line still carried the mark
 * in the string and `withoutMark` stripped it at every render site, so eight
 * screens of draft copy presented as finished copy.
 *
 * It is one strip under the action rather than a stamp in the header, because
 * the header stamp cost the progress bar 79px of a 358px row and that is a
 * real measurement. This costs the bar nothing.
 */
export const GATE_NOTICE = draft("Placeholder copy, pending owner review.");

/**
 * Fills the `%n`, `%total`, `%c` and `%cap` slots above. A tiny formatter
 * rather than template literals in the view, because the owner rewriting a
 * line at the gate must be able to move a number inside the sentence without
 * touching a component.
 *
 * THE ALTERNATION IS ORDERED LONGEST FIRST, and it is a real bug fix rather
 * than a style choice. A JavaScript regex alternation is first-match, not
 * longest-match, so `%(n|total|c|cap)` matched the `%c` branch inside `%cap`
 * and left a stray "ap" in front of the student: "16 of 30ap charge". Any slot
 * added later must keep this order, so a prefix of another slot never comes
 * first in the list.
 */
export function fill(line: string, values: Readonly<Record<string, string | number>>): string {
  return line.replace(/%(total|cap|n|c)/g, (match, key: string) => {
    const value = values[key];
    return value === undefined ? match : String(value);
  });
}

/** Every draft line this module exports, for the marking test. */
export const ALL_DRAFT_LINES: readonly string[] = Object.freeze([
  WELCOME_GREETING,
  WELCOME_PROMISE,
  WELCOME_START,
  WELCOME_RETURNING,
  INTRO_ASK,
  INTRO_NOTE,
  HEAR_ASK,
  HEAR_NOTE,
  HEAR_SKIP,
  ...Object.values(HEAR_LABEL),
  WHY_ASK,
  ...Object.values(WHY_LABEL),
  PLACEMENT_INTRO_ASK,
  PLACEMENT_START,
  PLACEMENT_SKIP_QUESTION,
  PLACEMENT_SKIP_SHORT,
  PLACEMENT_CHECK,
  PLACEMENT_REASON_ASK,
  PLACEMENT_COUNTER,
  PLACEMENT_DONE_ASK,
  PLACEMENT_SKIPPED_ASK,
  OVERVIEW_ASK,
  OVERVIEW_NOTE,
  OVERVIEW_ASSUMES_LABEL,
  OVERVIEW_TOPICS_LABEL,
  OVERVIEW_START_HERE,
  OVERVIEW_MORE,
  GOAL_ASK,
  GOAL_NOTE,
  ...Object.values(GOAL_LABEL),
  GOAL_XP_LINE,
  GOAL_PACING_ONE,
  GOAL_PACING_MANY,
  START_ASK,
  START_NOTE,
  ...Object.values(START_LABEL),
  START_FINISH,
  CONTINUE,
  BACK_LABEL,
  LEAVE_LABEL,
  PROGRESS_LABEL,
  GATE_NOTICE,
]);

/* ------------------------------------------------------------------ */
/* The simplicity ruling, as data                                      */
/* ------------------------------------------------------------------ */

/**
 * The FRAMING of a step: what Berry asks, and the quiet line under the chips.
 *
 * These are the lines the 2026-09-04 ruling governs. A student meeting this
 * flow is stressed and arrived on purpose, so each one is a single short
 * sentence in plain words, and the only chemistry word allowed in any of them
 * is the name of the subject itself.
 *
 * FOUR KINDS OF LINE ARE DELIBERATELY NOT IN THIS LIST, and leaving each one
 * out is a decision rather than an oversight:
 *
 *   WELCOME_GREETING, "Hi! I'm Berry.", is two beats because
 *   blueberry_r9-onboard-welcome draws it as two, and it frames nothing: it
 *   is a hello, and there is no question on that screen to keep short.
 *
 *   The CHOICE LABELS are answers, not framing. They are held short by the
 *   chip that has to hold them, and one of them ("DAT / MCAT") is not a
 *   sentence at all.
 *
 *   The ACTIONS (CONTINUE, START, SKIP) are verbs on buttons.
 *
 *   The OVERVIEW's act labels and "assumes" lines never appear here because
 *   they are not in this file at all: they are read from the course outline
 *   through packages/curriculum, and they are course CONTENT rather than the
 *   words the product uses to ask a student something.
 */
export const FRAMING_LINES: readonly string[] = Object.freeze([
  INTRO_ASK,
  INTRO_NOTE,
  HEAR_ASK,
  HEAR_NOTE,
  WHY_ASK,
  PLACEMENT_INTRO_ASK,
  PLACEMENT_REASON_ASK,
  PLACEMENT_DONE_ASK,
  PLACEMENT_SKIPPED_ASK,
  OVERVIEW_ASK,
  OVERVIEW_NOTE,
  GOAL_ASK,
  GOAL_NOTE,
  START_ASK,
  START_NOTE,
]);

/**
 * The longest a framing line may be, in characters, once the gate mark is off.
 *
 * MEASURED, not chosen: the longest draft below is 46 characters, and 48 is
 * that with one word of headroom. It is here so the ceiling is a number the
 * owner can move at the gate rather than a number buried in an assertion.
 */
export const FRAMING_LINE_MAX_CHARS = 48;

/**
 * Words that are chemistry rather than English, and that the ruling keeps out
 * of the framing.
 *
 * "chemistry" is not on this list and must not be added: it is the name of the
 * subject the student came for, and both the welcome and the "what brings you"
 * screens use it in the goal images themselves. What is banned is the
 * vocabulary INSIDE the subject, which a student who has not started the
 * course cannot be assumed to hold. "charge" is on the list twice over: it is
 * both formal charge and this product's own pacing currency, and the goal
 * screen is the first time a student would meet either.
 */
export const FRAMING_JARGON: readonly string[] = Object.freeze([
  "carbocation",
  "mechanism",
  "electrophil",
  "nucleophil",
  "enolate",
  "aromatic",
  "stereochem",
  "spectroscop",
  "energy diagram",
  "transition state",
  "charge",
  "mastery",
  "placement",
]);

/**
 * Strips the gate mark, so a length or sentence check measures the sentence.
 *
 * IT IS ALSO WHAT EVERY SCREEN RENDERS THROUGH, and that is worth reading
 * carefully because it looks at first like the mark being hidden.
 *
 * The mark stays in the STRING, which is the thing the owner rewrites at the
 * gate and the thing `ALL_DRAFT_LINES` holds every line to. What changed on
 * 2026-09-04 is where it is DRAWN: inline on twenty lines it was not a mark,
 * it was the loudest text on the screen. Every chip wrapped to two lines
 * because of it, the mascot's question became a mascot's question about
 * "[HUMAN GATE]", and a critic comparing the composition against
 * blueberry_r9-onboard-question was comparing the wrong picture. It was also
 * read out before every label by a screen reader.
 *
 * So the flow declares it ONCE, in the header, as `.ob-mark` in Frame.tsx, and
 * each line renders as its sentence. The screen still says plainly that every
 * word on it is a draft; it just says it once instead of twenty times.
 */
export function withoutMark(line: string): string {
  return line.startsWith(HUMAN_GATE_MARK) ? line.slice(HUMAN_GATE_MARK.length).trim() : line;
}

/*
 * THERE IS NO ON-SCREEN DRAFT BANNER ANY MORE, and the export that used to
 * carry it is gone rather than left unused.
 *
 * It was the bare mark, drawn once per screen at the end of the header row.
 * Measured against blueberry_r9-onboard-question it cost 79px plus its gaps
 * out of a 358px header, which is why the progress bar rendered at 55 percent
 * of the frame where all three goal images draw it at about 76, and none of
 * the three images draws anything to the right of the bar. The declaration is
 * not weaker for being off the screen: every line in this module is still
 * built by `draft()`, still carries HUMAN_GATE_MARK inside the string, is
 * still listed in ALL_DRAFT_LINES, and onboardingFlow.test.ts still fails the
 * build if one slips out unmarked. The mark is a flag for the owner and for a
 * critic reading the source; a student was paying for it in header width.
 */

/**
 * How many sentences a line is. The ruling allows exactly one in the framing.
 *
 * Counts terminal marks rather than splitting, because a run of them ("...")
 * is one ending and not three, and because a line that ends without one is a
 * fragment rather than zero sentences.
 */
export function sentenceCount(line: string): number {
  const matches = withoutMark(line).match(/[.?!]+/g);
  return matches === null ? 1 : matches.length;
}
