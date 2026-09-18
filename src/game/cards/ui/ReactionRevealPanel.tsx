/**
 * The reveal panel: the labelled extras behind a reaction card's tap.
 *
 * ONLY WHAT EXISTS IS DRAWN. The owner's field list (acid/base Keq, pKa,
 * 1,2 vs 1,4 selectivity, electronegativity, resonance notes) is all
 * optional, and `presentReveal` in cards/types.ts is the single place that
 * decides presence, so this component cannot disagree with the tests about
 * which fields a card shows. A card with none renders nothing at all rather
 * than an empty frame.
 *
 * Every value is the card author's data, carried verbatim; the labels are
 * the only strings this file adds, and they name fields, not chemistry.
 *
 * A separate component from the scheme on purpose, per the owner: either
 * piece may be swapped for a library component later, so each carries its
 * own styles (.rxn-reveal* in reaction-card.css) and neither imports the
 * other.
 */

import { presentReveal, type ReactionReveal } from "../types";
import "./reaction-card.css";

export interface ReactionRevealPanelProps {
  readonly reveal: ReactionReveal;
}

export function ReactionRevealPanel({ reveal }: ReactionRevealPanelProps) {
  const entries = presentReveal(reveal);
  if (entries.length === 0) return null;
  return (
    <dl className="rxn-reveal">
      {entries.map((entry) => (
        <div key={entry.field} className="rxn-reveal__row">
          <dt className="rxn-reveal__label text-scale-xs font-bold uppercase tracking-wide text-bb-muted-foreground">
            {entry.label}
          </dt>
          <dd className="rxn-reveal__value whitespace-pre-line text-scale-sm leading-normal text-bb-card-foreground">
            {entry.value}
          </dd>
        </div>
      ))}
    </dl>
  );
}
