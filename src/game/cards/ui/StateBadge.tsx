/**
 * The corner badge a card wears, per the committed states sheet
 * (blueberry_spec-card-states in docs/reference/design-goals): a card's edge
 * and badge say where it is in the scheduler. cardState.ts decides the word;
 * cards.css owns the colours; this file owns the glyphs.
 *
 * THE GLYPHS ARE INLINE SVG, never emoji and never raster, per the
 * design-goals icon ruling: they inherit currentColor from their badge class
 * so the measured token pairs in cards.css are the only colours drawn.
 *
 * The badge is aria-hidden DECORATION: every surface that wears one also
 * speaks the state's word in its accessible name (the fan card's aria-label,
 * the review face's visible chip), so nothing is said only in colour, per
 * the sheet's own point that the edge and badge are a vocabulary, not the
 * sole carrier.
 *
 * "young" wears no badge: the sheet draws five states and young is the calm
 * in-between the five never have to lie about, per cardState.ts.
 *
 * THE CORNER DISC BELONGS TO THREE STATES, NOT FIVE, and round 3 is where
 * that got read off the sheet properly. blueberry_spec-card-states draws the
 * disc on due (a clock), mastered (a check) and suspended (a pause), and on
 * nothing else: new carries one small blue dot INSIDE the card near its
 * bottom edge, and learning carries three amber pips there plus a flask in
 * the card's body. Both wear no corner mark at all.
 *
 * That split is a sentence rather than a decoration. The three badged states
 * are the ones with a claim on the student's time, so they mark the corner
 * where a notification lives; the two unbadged ones are only saying where the
 * card sits in its own life, so they mark the card's foot quietly. Round 2
 * gave all five the disc, which made a card the student has never met shout
 * as loudly as one that is overdue.
 *
 * So this file exports TWO components. StateBadge is the corner disc and
 * answers for the three; StateMarker is the bottom strip and answers for the
 * two. Each renders null outside its own set, so a caller can mount both
 * unconditionally and let the state decide, which is what CardFace does.
 */

import type { CardSchedulerState } from "./cardState";
import { LearningFlask } from "./Doodles";

/** The three states the sheet gives a corner disc. See the header. */
type BadgedState = "due" | "mastered" | "suspended";

/** The two it gives an in-card mark instead. */
type MarkedState = "new" | "learning";

function isBadged(state: CardSchedulerState): state is BadgedState {
  return state === "due" || state === "mastered" || state === "suspended";
}

function Glyph({ state }: { readonly state: BadgedState }) {
  switch (state) {
    case "due":
      // The sheet's clock.
      return (
        <svg viewBox="0 0 12 12" className="h-3 w-3" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true">
          <circle cx="6" cy="6" r="4.4" />
          <path d="M6 3.8 V6 l1.7 1.2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      );
    case "mastered":
      // The sheet's check.
      return (
        <svg viewBox="0 0 12 12" className="h-3 w-3" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
          <path d="M2.5 6.5 L5 9 L9.5 3.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      );
    case "suspended":
      // The sheet's pause bars.
      return (
        <svg viewBox="0 0 12 12" className="h-3 w-3" fill="currentColor" aria-hidden="true">
          <rect x="3" y="2.5" width="2.2" height="7" rx="1" />
          <rect x="6.8" y="2.5" width="2.2" height="7" rx="1" />
        </svg>
      );
  }
}

export interface StateBadgeProps {
  readonly state: CardSchedulerState;
}

/**
 * The disc in the card's corner. Renders nothing for new, learning or young,
 * on purpose: the first two carry a StateMarker instead and young carries
 * nothing at all. See the header for which of the sheet's five gets which.
 */
export function StateBadge({ state }: StateBadgeProps) {
  if (!isBadged(state)) return null;
  return (
    <span className={`state-badge state-badge--${state}`} aria-hidden="true">
      <Glyph state={state} />
    </span>
  );
}

/**
 * The in-card mark, near the card's bottom edge, for the two states the sheet
 * deliberately leaves out of the corner. New is one small periwinkle dot;
 * learning is the flask plus three amber pips with the first filled, counting
 * the learning steps the scheduler is walking the card through.
 *
 * ONE KNOWING DIVERGENCE, and it is about the flask's SIZE rather than its
 * presence. The sheet draws learning's flask large, in the middle of the
 * card's body, because the cards on a spec sheet are empty. Ours are not: the
 * body of a real review face is the student's own question, and a large glyph
 * behind it would be decoration painted over content. So the flask is here,
 * in the sheet's own amber, at marker scale beside the pips it belongs with.
 *
 * Decoration, so aria-hidden: CardFace already says the state in words in the
 * chip above the question, which is what keeps this from being a fact told
 * only in colour.
 */
export function StateMarker({ state }: StateBadgeProps) {
  if (state !== "new" && state !== "learning") return null;
  const marked: MarkedState = state;
  return (
    <span className={`state-marker state-marker--${marked}`} aria-hidden="true">
      {marked === "learning" && <LearningFlask className="h-3.5 w-3" />}
      {marked === "new" ? (
        <span className="state-pip state-pip--on" />
      ) : (
        <>
          <span className="state-pip state-pip--on" />
          <span className="state-pip" />
          <span className="state-pip" />
        </>
      )}
    </span>
  );
}
