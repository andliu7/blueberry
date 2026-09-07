/**
 * The funnel's step machine, kept pure so a test can drive it.
 *
 * Nothing in here reads the hash, touches storage or renders. `StartPage` asks
 * it what comes next and what the bar should read; the screens ask it whether
 * CONTINUE is allowed. Stating the gate once, in a function, is what stops six
 * screens from each re-deriving "is this answered yet" slightly differently.
 *
 * **Steps live in the hash.** `#/start/topics` is a real address, the browser
 * back button walks the flow backwards, and a deep link into the middle lands
 * on a screen that renders. The order is Andrew's invest-then-pay order and
 * this file is not the place to change it: goals first, a real lesson second,
 * the ask last.
 */

export const STEP_IDS = ["welcome", "course", "exam", "topics", "lesson", "finish"] as const;

export type StepId = (typeof STEP_IDS)[number];

/** What the flow has collected. The lesson score joins it at the end. */
export interface StartAnswers {
  /** Free text: a course code the site has never heard of is still an answer. */
  course: string;
  /** ISO `yyyy-mm-dd`, or null when they would rather not say. */
  examOn: string | null;
  /** Ids from `data/topics`, one to three of them. */
  topicIds: string[];
  /** First-try correct answers in the mini lesson. */
  right: number;
}

/**
 * Anything that is not a step id lands on the welcome beat.
 *
 * `#/start` itself is the common case: that is where the hero's Get Started
 * button points and where every existing link to the funnel goes, so the bare
 * address has to mean something rather than 404.
 */
export function normalizeStep(raw: string): StepId {
  return (STEP_IDS as readonly string[]).includes(raw) ? (raw as StepId) : "welcome";
}

export function nextStep(step: StepId): StepId | null {
  return STEP_IDS[STEP_IDS.indexOf(step) + 1] ?? null;
}

export function prevStep(step: StepId): StepId | null {
  const i = STEP_IDS.indexOf(step);
  return i <= 0 ? null : STEP_IDS[i - 1];
}

/**
 * The bar, and it never reads zero.
 *
 * Step one is filled the moment you arrive, before you have typed anything,
 * because you have in fact done something: you decided to start. A progress bar
 * reading zero on the screen you were just persuaded onto spends the goodwill
 * that got you there. That reasoning predates this rewrite and survives it.
 */
export function progressPercent(step: StepId): number {
  const span = STEP_IDS.length - 1;
  return Math.max(5, Math.round((STEP_IDS.indexOf(step) / span) * 100));
}

/**
 * Whether the pinned action is live yet.
 *
 * `exam` is deliberately always true: the date is optional and the screen
 * offers a quiet "not sure yet" that carries a null through. `lesson` gates
 * itself card by card and hands the whole screen its own action, so the frame
 * never asks about it.
 */
export function canContinue(step: StepId, answers: StartAnswers): boolean {
  switch (step) {
    case "course":
      return answers.course.trim().length > 0;
    case "topics":
      return answers.topicIds.length > 0;
    default:
      return true;
  }
}

/** Up to three topics, and the last one refuses to come off. */
export const MAX_TOPICS = 3;

/**
 * Toggling a topic chip.
 *
 * Two refusals, both silent, both deliberate. An empty selection would strand
 * the visitor on a screen whose action is off with no explanation of why, and
 * a fourth pick past the cap would need an error message for a rule the hint
 * line already states. Refusing to change is the smaller surprise.
 */
export function toggleTopic(current: readonly string[], id: string): string[] {
  if (current.includes(id)) {
    return current.length === 1 ? [...current] : current.filter((t) => t !== id);
  }
  return current.length >= MAX_TOPICS ? [...current] : [...current, id];
}
