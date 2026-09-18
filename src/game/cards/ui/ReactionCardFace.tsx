/**
 * The reaction card's scheme: the front face's own body. Read this header
 * before trusting anything in this file.
 *
 * THE OWNER'S SHAPE (17 Sep): reactants plus reagents on one side of the
 * arrow, products on the other, temperature worn on the face. Before the
 * reveal the product side is a drawn question mark, because a front that
 * shows the answer is not a card; the reveal fills that side in, in place,
 * so the student's eye never has to re-find the answer's position. The
 * labelled extras live in ReactionRevealPanel.tsx, deliberately a separate
 * component: the owner may swap either piece for a library component later,
 * so neither knows the other exists.
 *
 * WHAT THIS FILE DOES NOT DO. No tap handling: CardFace owns the reveal
 * gesture exactly as it does for every other card, so the four grade chips
 * and the whole reviewer loop stay untouched. No chemistry: every string
 * here arrived on the card from authored data or the student's own hand,
 * and this file only places them.
 *
 * Styled by the .rxn-* family in reaction-card.css, its own sheet, so the
 * face can be restyled or replaced without disturbing cards.css.
 */

import type { ReactionCardData } from "../types";
import "./reaction-card.css";

export interface ReactionSchemeProps {
  readonly reaction: ReactionCardData;
  /** Whether the product side is filled in yet. */
  readonly revealed: boolean;
}

export function ReactionScheme({ reaction, revealed }: ReactionSchemeProps) {
  return (
    <div className="rxn-scheme">
      {reaction.temperature !== undefined && (
        <span className="rxn-temp text-scale-xs font-bold">{reaction.temperature}</span>
      )}
      <div className="rxn-scheme__row">
        <p className="rxn-side text-scale-base font-semibold text-bb-card-foreground">
          {reaction.reactants}
        </p>
        <div className="rxn-arrow-cell">
          <p className="rxn-reagents text-scale-xs font-semibold text-bb-muted-foreground">
            {reaction.reagents}
          </p>
          <RxnArrow />
        </div>
        {revealed ? (
          <p className="rxn-side text-scale-base font-semibold text-bb-card-foreground">
            {reaction.products}
          </p>
        ) : (
          /* The withheld side. A drawn mark, aria-labelled so a screen
             reader hears the question rather than punctuation. */
          <p className="rxn-side rxn-side--hidden text-scale-lg font-bold" aria-label="Product, not shown yet">
            ?
          </p>
        )}
      </div>
    </div>
  );
}

/** The reaction arrow the reagents sit over. Same drawing as the composer's. */
function RxnArrow() {
  return (
    <svg viewBox="0 0 72 12" className="h-3 w-[4.5rem] shrink-0 text-bb-foreground" aria-hidden="true">
      <path
        d="M2 6 H64 M58 2 L66 6 L58 10"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
