/**
 * The onboarding flow model. Pure: no React, no DOM, no clock.
 *
 * The step list is the seven-step capture mapping from the Beats and Decks
 * record (docs/reference/competitors/duolingo-live/2026-08-27-run2, p05-p19):
 * two welcome beats, how-did-you-hear, learning reason, proficiency (our
 * placement quiz), course overview, daily goal, choose path. Steps live in
 * the hash (#/start/<step>) so the browser back button steps back, which the
 * file this replaced already did and which is kept deliberately.
 *
 * No wall clock is read anywhere in this module. Elapsed seconds reach the
 * quiz machine as event data measured by the shell with performance.now(),
 * the same discipline the machine itself documents, so every function here
 * gives the same answer at 9am and at 11pm.
 */

import {
  ACTS,
  TIME_BUDGET_SECONDS,
  QUESTION_CAP,
  probeTopicIdsForCourse,
  topicIdsForAct,
  type ActId,
  type CourseId,
  type Recommendation,
  type TopicId,
} from "@blueberry/curriculum";
import {
  CHARGE_CAP,
  CHARGE_COST,
  DAILY_GOAL_XP,
  XP_NODE_FIRST_CLEAR,
  type DailyGoalTier,
} from "@blueberry/economy";

/** Every student facing sentence in this flow is a draft carrying this mark. */
export const HUMAN_GATE_MARK = "[HUMAN GATE]";

/**
 * The steps, in order. "welcome" and "intro" are the two welcome beats; the
 * rest map one to one onto the record's captures.
 */
export const STEP_IDS = [
  "welcome",
  "intro",
  "hear",
  "why",
  "placement",
  "overview",
  "goal",
  "start",
] as const;

export type StepId = (typeof STEP_IDS)[number];

/**
 * Hashes the previous flow handed out and that may sit in a student's
 * history. Every route resolves, so each maps to the nearest stage of the new
 * flow rather than to a 404: "quiz" was the placement quiz; "tutorial" and
 * "lesson" were post-quiz content, nearest surviving stage is the overview;
 * "paywall" was the closing screen, nearest is choose-your-start.
 */
const LEGACY_STEPS: Readonly<Record<string, StepId>> = Object.freeze({
  quiz: "placement",
  tutorial: "overview",
  lesson: "overview",
  paywall: "start",
});

export function normalizeStep(raw: string): StepId {
  if ((STEP_IDS as readonly string[]).includes(raw)) return raw as StepId;
  const legacy = LEGACY_STEPS[raw];
  return legacy ?? "welcome";
}

export function stepIndex(step: StepId): number {
  return STEP_IDS.indexOf(step);
}

export function prevStep(step: StepId): StepId | null {
  const index = stepIndex(step);
  const previous = STEP_IDS[index - 1];
  return previous ?? null;
}

export function nextStep(step: StepId): StepId | null {
  const index = stepIndex(step);
  const next = STEP_IDS[index + 1];
  return next ?? null;
}

/** The only step a student may pass without answering. */
export const SKIPPABLE_STEPS: readonly StepId[] = Object.freeze(["hear"]);

export function isSkippable(step: StepId): boolean {
  return SKIPPABLE_STEPS.includes(step);
}

/**
 * The fat progress bar, as a percent. Visible from screen one (the welcome
 * reference shows it at 5 percent) and monotone: each step's anchor is above
 * the last, and inside the placement the bar walks its band by questions
 * asked so eight answers never move it backwards or past the overview anchor.
 */
const STEP_PERCENT: Readonly<Record<StepId, number>> = Object.freeze({
  welcome: 5,
  intro: 14,
  hear: 24,
  why: 34,
  placement: 42,
  overview: 80,
  goal: 90,
  start: 96,
});

const PLACEMENT_BAND_END = 74;

export function progressPercent(step: StepId, placementAsked = 0): number {
  const base = STEP_PERCENT[step];
  if (step !== "placement") return base;
  const capped = Math.max(0, Math.min(placementAsked, QUESTION_CAP));
  const band = PLACEMENT_BAND_END - STEP_PERCENT.placement;
  return Math.round(STEP_PERCENT.placement + (band * capped) / QUESTION_CAP);
}

/** What brings you here. Ids are stable; the words live in copy.ts. */
export const WHY_CHOICES = ["orgo2_exam", "dat_mcat", "surviving", "curious"] as const;
export type WhyChoice = (typeof WHY_CHOICES)[number];

/**
 * The learning-reason answer doubles as the placement quiz's claimed course,
 * which is what keeps the flow inside the three minute budget: no second
 * "what are you studying" screen. A reason that does not name a course claims
 * nothing and the quiz places from scratch, which the machine supports as
 * claimedCourse null. DAT and MCAT probe the identical topic walk, so one
 * chip covers both without changing what gets asked.
 */
export function claimedCourseForWhy(why: WhyChoice | null): CourseId | null {
  switch (why) {
    case "orgo2_exam":
      return "orgo_2";
    case "dat_mcat":
      return "dat";
    default:
      return null;
  }
}

/** How-did-you-hear channels. Analytics fodder only; nothing branches on it. */
export const HEAR_CHOICES = ["friend", "social", "search", "professor", "app_store", "other"] as const;
export type HearChoice = (typeof HEAR_CHOICES)[number];

/**
 * The goal picker offers three of the four tiers. "exam" is offered only
 * inside the exam window per docs/ECONOMY.md, and onboarding has no exam date
 * yet, so it is deliberately absent here.
 */
export const ONBOARDING_GOAL_TIERS: readonly DailyGoalTier[] = Object.freeze([
  "casual",
  "regular",
  "serious",
]);

export function goalXp(tier: DailyGoalTier): number {
  return DAILY_GOAL_XP[tier];
}

/** Choose your start: trust the placement, or begin at the very beginning. */
export const START_CHOICES = ["placement", "beginning"] as const;
export type StartChoice = (typeof START_CHOICES)[number];

export interface StartResolution {
  readonly course: CourseId;
  readonly startTopics: readonly TopicId[];
}

/**
 * What choose-your-start writes into the progress store. "beginning" keeps
 * the course but empties the frontier, so nothing renders as already done.
 * A missing recommendation (quiz abandoned, or a deep link straight to the
 * end) falls back to the claimed course, then to orgo_2, the one course open
 * today per app/courses.ts.
 */
export function resolveStart(
  choice: StartChoice,
  recommendation: Recommendation | null,
  claimedCourse: CourseId | null,
): StartResolution {
  const course = recommendation?.course ?? claimedCourse ?? "orgo_2";
  if (choice === "placement" && recommendation !== null) {
    return { course: recommendation.course, startTopics: recommendation.startTopics };
  }
  return { course, startTopics: [] };
}

/** The answers the flow accumulates. Held by the shell, validated here. */
export interface FlowAnswers {
  readonly hear: HearChoice | null;
  readonly why: WhyChoice | null;
  readonly goal: DailyGoalTier | null;
  readonly start: StartChoice | null;
}

export const EMPTY_ANSWERS: FlowAnswers = Object.freeze({
  hear: null,
  why: null,
  goal: null,
  start: null,
});

/**
 * CONTINUE is gated on a choice wherever there is one to make. Steps whose
 * only control is CONTINUE (or whose gate is the quiz machine's own) are
 * always passable.
 */
export function canContinue(step: StepId, answers: FlowAnswers): boolean {
  switch (step) {
    case "hear":
      return answers.hear !== null;
    case "why":
      return answers.why !== null;
    case "goal":
      return answers.goal !== null;
    case "start":
      return answers.start !== null;
    default:
      return true;
  }
}

/**
 * The placement's own budget is the machine's, re-exported so the shell and
 * the tests cite one number. CLAUDE.md's row is "under 3 minutes"; the
 * machine enforces 180 seconds including a worst case reserve per question.
 */
export const PLACEMENT_TIME_BUDGET_SECONDS = TIME_BUDGET_SECONDS;
export const PLACEMENT_QUESTION_CAP = QUESTION_CAP;

/**
 * THE PLACEMENT'S ANSWER LAYOUT IS THE 2x2, AND THE ONLY THING THAT DECIDES IT
 * IS HOW MANY OPTIONS THERE ARE.
 *
 * blueberry_r9-onboard-placement is what MANIFEST.md names as the lock on
 * "real chemistry as a 2x2 of structures", and a four-option question that
 * renders as a stack of wide prose rows is not that picture. The earlier rule
 * here added a second condition, that every option also be at most 24
 * characters, on the reasoning that a long option in a half width tile wraps
 * into porridge.
 *
 * MEASURED AGAINST THE REAL CORPUS, THAT RULE INVERTED THE DESIGN. Of the 25
 * four-option sets in SEED_CORPUS only 9 clear 24 characters, so sixteen of
 * them, including the very first question the walk serves, fell out of the
 * composition the goal image locks. A layout rule that fires on a sixth of its
 * own data is not a fallback, it is the default wearing a fallback's clothes.
 *
 * The wrapping worry was real and it is answered in the tile rather than here:
 * the grid tile is TALL (onboarding.css scopes a taller minimum to
 * `.ob-options--grid`), so a long option has vertical room instead of being
 * refused the layout. Three options in a 2x2 leaves a hole and five leaves a
 * widow, so the count is still the condition; the length is not.
 *
 * NOT a hook, despite what the earlier draft of this file called it. It reads
 * no state and calls nothing; a `use` prefix on a pure predicate makes React's
 * rules-of-hooks lint and every reader believe something that is not true.
 */
export function twoColumnGrid(options: readonly { readonly text: string }[]): boolean {
  return options.length === 4;
}

/**
 * How long an option has to be before the tile drops it a type size.
 *
 * The 2x2 tile holds roughly this many characters at the caption's own size on
 * a 390px screen; past it the words are set smaller so they still fit the tile
 * rather than overflowing it. It is a RENDERING threshold and never a layout
 * one: nothing is refused the grid for being long.
 */
export const TILE_DENSE_CHARS = 48;

export function tileIsDense(text: string): boolean {
  return text.length > TILE_DENSE_CHARS;
}

/**
 * How long an authored PROMPT has to be before the frame stops giving it as
 * much vertical room as it asks for.
 *
 * blueberry_r9-onboard-placement draws a one line question and then the whole
 * 2x2 clear beneath it. The corpus does not oblige: the first problem the walk
 * serves is a 45 word compound stem, and rendered at the image's own type size
 * it stood 257px tall, pushed the grid down and sliced the second row of tiles
 * flat at the pinned foot.
 *
 * 96 characters is roughly three lines at the stem's size on a 390px screen,
 * which is as much as can sit above a 2x2 and still leave the whole answer set
 * on the screen. Past it the stem drops a type size and takes a capped
 * scroller of its own (`.ob-stem[data-long="true"]`), so the thing a student
 * has to scroll for is the prompt they can already partly read rather than the
 * options they are being asked to choose between.
 *
 * A RENDERING threshold, never a layout one, and never a filter: no problem is
 * refused the screen for being long, and nothing here shortens authored words.
 */
export const STEM_LONG_CHARS = 96;

export function stemIsLong(prompt: string): boolean {
  return prompt.length > STEM_LONG_CHARS;
}

/* ------------------------------------------------------------------ */
/* The daily goal, mapped onto charge pacing                          */
/* ------------------------------------------------------------------ */

/**
 * How many ordinary lessons a day a goal tier works out to.
 *
 * DERIVED, never typed: the numerator is the economy's own daily goal table
 * and the denominator is what one reaction node pays on a first clear. If
 * either table moves, this moves with it, which is the whole reason the goal
 * step reads a function instead of a written sentence. A tier is rounded UP,
 * because a goal you reach three quarters of the way through a lesson is a
 * goal reached on the lesson you finished.
 */
export function goalLessonsPerDay(tier: DailyGoalTier): number {
  return Math.ceil(DAILY_GOAL_XP[tier] / XP_NODE_FIRST_CLEAR.reaction);
}

/** What those lessons cost in charge. Entry cost per node, never per question. */
export function goalChargeCost(tier: DailyGoalTier): number {
  return goalLessonsPerDay(tier) * CHARGE_COST.reaction;
}

/**
 * Whether one full meter covers a day at this tier.
 *
 * docs/ECONOMY.md's mitigation set is load bearing per CLAUDE.md, and the part
 * of it this screen can honour is that a goal the student picks here must not
 * quietly be a goal the charge system will not let them reach.
 *
 * THE GUARANTEE IS KEPT, NOT RECITED, and that changed on 2026-09-04. The goal
 * step used to print the cost beside the cap ("16 of 30 charge") so the trade
 * was visible before it was made. The simplicity ruling put that out of bounds:
 * charge is this product's own jargon and the goal screen is the first place a
 * student would meet it, so a number they cannot read is not a disclosure. The
 * predicate stayed exactly where it was, and onboardingFlow.test.ts asserts it
 * over every offered tier, so the offer still cannot drift out of reach when an
 * economy table moves. What the student is owed is that the goal is reachable,
 * not that they are shown the arithmetic proving it.
 */
export function goalFitsOneCharge(tier: DailyGoalTier): boolean {
  return goalChargeCost(tier) <= CHARGE_CAP;
}

export const GOAL_CHARGE_CAP = CHARGE_CAP;

/* ------------------------------------------------------------------ */
/* The achieve overview                                                */
/* ------------------------------------------------------------------ */

/**
 * One block of the overview step: an act of the course, with its topics.
 *
 * The content is docs/COURSE-OUTLINE-ORGO2.md section 2, but READ FROM THE
 * DATA the outline was mined into rather than retyped here. ACTS carries the
 * label and the "what this act assumes and never re-teaches" line; TOPICS
 * carries the membership. A prose copy of either in this file would be a
 * second source of truth that goes stale the first time a topic moves act.
 */
export interface OverviewBlock {
  readonly id: string;
  readonly label: string;
  /** The outline's "assumes" line. Null for a course with no act structure. */
  readonly assumes: string | null;
  readonly topics: readonly TopicId[];
}

/** The acts, in course order. act_0 is the spine and is shown: it is lesson 1. */
const ACT_ORDER: readonly ActId[] = Object.freeze(["act_0", "act_1", "act_2", "act_3"]);

/**
 * The overview for a course.
 *
 * Only `orgo_2` carries acts (see placement.ts), so every other course renders
 * as one flat block of its own topics rather than as an empty screen. That
 * fallback is not decoration: `claimedCourseForWhy` can hand the quiz `dat`,
 * and a student who lands on the overview with a non-act course must still see
 * what they are signing up for.
 *
 * THE FALLBACK READS `probeTopicIdsForCourse`, NOT `topicIdsForCourse`, and
 * the difference is the whole reason this screen was blank for a DAT student.
 * A review course HOMES no topic by design (placement.ts says so in as many
 * words: "topicIdsForCourse returns [] for both, by design"), so asking which
 * topics a review course owns is asking the wrong question. What it PROBES is
 * every content course's topics in teaching order, which is exactly what the
 * quiz walked to build the recommendation the student is now being shown. The
 * overview must list the same topics the quiz asked about, or it is describing
 * a different course from the one the student was placed into.
 */
export function overviewBlocks(course: CourseId): readonly OverviewBlock[] {
  if (course === "orgo_2") {
    return ACT_ORDER.map((act) => ({
      id: act,
      label: ACTS[act].label,
      assumes: ACTS[act].assumes,
      topics: topicIdsForAct(act),
    })).filter((block) => block.topics.length > 0);
  }
  const topics = probeTopicIdsForCourse(course);
  if (topics.length === 0) return [];
  return [{ id: course, label: "The course", assumes: null, topics }];
}

/**
 * How many topics one act block shows before it says "and N more".
 *
 * THE OVERVIEW IS A SUMMARY, NOT THE SYLLABUS. Organic Chemistry II's act 1 is
 * sixteen topics and the four acts together are around forty, and rendering
 * every one of them turned this screen into a scrolling wall of chips that a
 * student swipes past. The 2026-09-04 simplicity ruling is about the framing
 * rather than the content, so nothing here is hidden from the course; what
 * changed is that a screen whose job is "here is your course" now shows the
 * shape of it and says honestly how much more there is.
 *
 * Four, because four chips is the most that reliably fits above the fold
 * beside the act's name on a 390px screen with four acts on it.
 */
export const OVERVIEW_TOPICS_SHOWN = 4;

/**
 * The topics one block shows, and how many it leaves unsaid.
 *
 * EVERY START TOPIC IS ALWAYS SHOWN, whatever its position in the act. The
 * point of this screen is where the student lands, and a placement result
 * hidden behind "and 12 more" is the one topic that must never be the one cut.
 * Outline order is otherwise preserved, so the act still reads as it teaches.
 */
export function overviewTopicsShown(
  block: OverviewBlock,
  starts: readonly TopicId[],
): { readonly shown: readonly TopicId[]; readonly hidden: number } {
  const required = block.topics.filter((topic) => starts.includes(topic));
  const room = Math.max(0, OVERVIEW_TOPICS_SHOWN - required.length);
  const filler = block.topics.filter((topic) => !required.includes(topic)).slice(0, room);
  const keep = new Set([...required, ...filler]);
  const shown = block.topics.filter((topic) => keep.has(topic));
  return { shown, hidden: block.topics.length - shown.length };
}

/** Which overview block a start topic falls in, so the screen can mark it. */
export function blockOfTopic(
  blocks: readonly OverviewBlock[],
  topic: TopicId,
): string | null {
  const found = blocks.find((block) => block.topics.includes(topic));
  return found?.id ?? null;
}

/* ------------------------------------------------------------------ */
/* The funnel qualities, named so they can be asserted                 */
/* ------------------------------------------------------------------ */

/*
 * docs/THREE-TEACHERS.md names five qualities this funnel has to actually
 * have. Four of them are properties of the STEP ORDER, which means they can be
 * pinned by a test instead of surviving on a comment nobody reads. That is
 * what this section is for: the qualities are data here, and
 * onboardingFlow.test.ts asserts them.
 */

/**
 * THE SCREEN THAT ONLY BONDS: "at least one onboarding screen teaches nothing
 * and exists so the mascot is a relationship rather than a UI element".
 * `intro` is that screen and the Bond component in Onboarding.tsx draws it.
 */
export const BONDING_STEP: StepId = "intro";

/**
 * Steps that ask the student to COMMIT something: an account, a payment, or an
 * operating system permission.
 *
 * THIS LIST IS EMPTY, AND THAT IS THE DESIGN. Two qualities depend on it:
 * "personalise before you commit", which wants the motivation and level
 * questions to come before any ask, and "a real win before the ask", which
 * wants a whole lesson finished before a paywall or an account screen. Neither
 * is satisfied by promising to be careful later; both are satisfied by there
 * being nothing of the kind inside onboarding at all. A student reaches the
 * pathway having been asked for nothing.
 *
 * "PERMISSIONS ASKED LATE, never screen one, re-askable if declined" is the
 * same rule seen from the other side. Notification permission is the one this
 * product will eventually want, and the place for it is after the first lesson
 * lands, not here. If a later phase adds it, adding the step id to this list
 * is what keeps `commitmentFollowsPersonalising` honest, and leaving it out of
 * the list is the failure this constant exists to catch.
 */
export const COMMITMENT_STEPS: readonly StepId[] = Object.freeze([]);

/**
 * The steps that learn something about the student: what they are here for,
 * and what they already know. Both must precede every commitment step.
 */
export const PERSONALISING_STEPS: readonly StepId[] = Object.freeze(["why", "placement"]);

/**
 * Whether every commitment step still comes after every personalising one.
 *
 * Vacuously true today because `COMMITMENT_STEPS` is empty, and that is fine:
 * the value of this predicate is the day it stops being vacuous. The moment a
 * signup or a permission step is added in the wrong place, this returns false
 * and a test says so, which is cheaper than rediscovering the quality from the
 * artifact a year from now.
 */
export function commitmentFollowsPersonalising(): boolean {
  const lastPersonalising = Math.max(...PERSONALISING_STEPS.map(stepIndex));
  return COMMITMENT_STEPS.every((step) => stepIndex(step) > lastPersonalising);
}

/**
 * THE GOAL IS CHOSEN, NOT ASSIGNED, which is the quality that makes a streak
 * feel earned rather than imposed. Nothing preselects a tier: the goal step
 * opens with no pick and CONTINUE is off until the student makes one. This
 * reads the same empty answers the flow really starts from, so it cannot drift
 * away from what the screen does.
 */
export function goalIsChosenNotAssigned(): boolean {
  return EMPTY_ANSWERS.goal === null && !canContinue("goal", EMPTY_ANSWERS);
}
