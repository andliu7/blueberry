/**
 * The words on every "this is not here" screen, in one place.
 *
 * WHY. The 404 said "Looks like you're lost" and "Grignard deck", the flagged
 * surfaces said "X is not open yet" in a long paragraph, and the loader and the
 * crash screen each had their own tone. Owner, 28 Oct: "make the text more
 * consistent".
 *
 * THE VOICE (the same rule the rest of the app follows): a coach on the student's
 * side, never scolding, specific rather than generic. Sentence case, contractions,
 * no jargon, at most one idea per sentence. Every screen has the same four parts
 * in the same order: Bloom, a short title, one line that says what is true, and
 * one clear way out that is not the back button.
 */

/** Pinned by learn.test.ts and review.test.ts: a page that resolves must not show it. */
export const NOT_FOUND_TITLE = "We can't find that page";

export function notFoundLine(what: string): string {
  return `${what} isn't here. The link may be old or have a typo. Your progress is safe.`;
}

export const NOT_FOUND_ACTIONS = {
  primary: { label: "Go home", href: "#/" },
  secondary: { label: "Open your path", href: "#/app" },
} as const;

export interface NotOpenCopy {
  readonly title: string;
  readonly line: string;
  readonly kept: string;
}

/** One entry per flagged surface in src/game/app/flags.ts. */
export const NOT_OPEN_COPY = {
  leaderboards: {
    title: "Leaderboards aren't open yet",
    line: "A rank should only come from real attempts counted on the server, so we're not showing you a guess.",
    kept: "Your attempts are already counting toward it.",
  },
  chat: {
    title: "Ask Blueberry isn't open yet",
    line: "It needs a spending limit in place before it says a word.",
    kept: "Until then, every wrong answer already comes back with a named cause and an explanation.",
  },
  messages: {
    title: "Tutor messages aren't open yet",
    line: "It connects you with a person, so a moderated place and a tutor have to be ready first.",
    kept: "Your mistakes are collecting into a deck you can hand a tutor on day one.",
  },
} as const satisfies Record<string, NotOpenCopy>;

export const NOT_OPEN_ACTION = "Back to your path";
