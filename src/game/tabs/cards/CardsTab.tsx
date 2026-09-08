/**
 * Cards: the spaced repetition deck, and the third of the five tabs.
 *
 * WHY IT IS A TAB. CLAUDE.md's learning science section cites the AAMC's
 * 2020 to 2024 self study data, flashcard use up from 67.4 to 71.4 percent
 * of examinees and free flashcard programs from 37.3 to 50.2, as evidence
 * for both the Anki style scheduler and "a flashcard surface the product
 * does not yet have". A daily habit that a student is measurably already in
 * the habit of is a destination, not a detour. The old `#/review` hash still
 * works: routes.ts maps it onto this tab, because that link is in students'
 * history and in the Charge sheet's copy.
 *
 * WHAT THIS FILE MOUNTS: CardsHome, the design-goals surface, which owns all
 * four faces and the transitions between them: the landing that OPENS on the
 * review decision (Due-today hero, My-decks grid, From-your-lessons row, per
 * blueberry_cards-landing in docs/reference/design-goals), the three-sided
 * composer, the fanned deck tray, and the review session. The earlier hub
 * (MyDeck) and its CSV import surface remain exported from cards/ui for the
 * import flow and its tests, but the TAB is the committed landing now, and
 * this file shrank to a mount point on purpose: every decision it used to
 * make lives behind CardsHome's own seams, where the cards tests reach it
 * without a shell.
 *
 * THE BAR HIDES DURING A SESSION, deliberately. mobile-ui: "The bar is
 * contextual: entering an editor may replace or hide it entirely", and a
 * review session is exactly that, a full screen task with one job and its
 * own way out. The wiring is LIFTING STATE UP: the bar lives in the shell,
 * so the shell owns the boolean and passes a setter down; CardsHome reports
 * immersion from an effect so leaving by any route (tab press, back button,
 * deep link) restores the bar, not only the exits it knows about.
 */

import { CardsHome } from "../../cards/ui";

export interface CardsTabProps {
  /** Told when a full screen session starts and ends, so the shell can hide the bar. */
  readonly onImmersiveChange?: (immersive: boolean) => void;
}

export default function CardsTab({ onImmersiveChange }: CardsTabProps) {
  return (
    <div className="mx-auto flex w-full max-w-xl flex-col">
      <CardsHome onImmersiveChange={onImmersiveChange} />
    </div>
  );
}
