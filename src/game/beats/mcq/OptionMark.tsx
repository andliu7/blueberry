/**
 * The tick or cross on a graded option, shared by the question screen
 * (McqBeatView.tsx) and the priming preview's guess (LessonPreview.tsx), so
 * both say right and wrong the same way. Its own file so the preview does not
 * pull in the whole question screen.
 */
import type React from "react";

/**
 * The glyph that says which card is which, once the answer is revealed.
 *
 * WCAG 1.4.1: colour may not be the ONLY visual means of conveying
 * information. Before this the graded row said "answer" with a green fill and
 * "the one you chose" with a periwinkle stroke, and nothing else. A student
 * with a colour vision deficiency, or anyone reading in sunlight, got two
 * cards that differ by a hue they cannot separate. Both Mobbin references mark
 * this with a glyph rather than a fill: Quizlet's screen 44 puts a cross on
 * the choice and a tick on the answer, and screen 38 leads its banner with one.
 *
 * The wrong pick is a red cross disc (A2 round 4, owner direction: green
 * right, red wrong), the twin of the answer's green tick.
 *
 * The sr-only text is what a screen reader gets, and it is why the glyphs are
 * aria-hidden: a tick read aloud as "check mark" beside the words "correct
 * answer" is the same fact twice.
 */
export function OptionMark({ state }: { readonly state: string }): React.ReactElement | null {
  if (state === "answer") {
    return (
      <span className="option-mark option-mark--answer">
        <svg viewBox="0 0 16 16" width="14" height="14" aria-hidden>
          <path d="M3 8.5 6.5 12 13 4.5" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        <span className="sr-only">correct answer</span>
      </span>
    );
  }
  if (state === "chosen") {
    // A2 round 4: the wrong pick gets a red cross disc, the twin of the
    // answer's green tick (owner direction: green right, red wrong).
    return (
      <span className="option-mark option-mark--wrong">
        <svg viewBox="0 0 16 16" width="12" height="12" aria-hidden>
          <path d="M4.5 4.5 11.5 11.5M11.5 4.5 4.5 11.5" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" />
        </svg>
        <span className="sr-only">your answer, not this one</span>
      </span>
    );
  }
  return null;
}
