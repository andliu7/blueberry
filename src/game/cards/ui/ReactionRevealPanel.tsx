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
 * THE LESSONS ROW'S SHAPE (owner, 25 Sep), carried across by name from
 * components/ui/reaction-panel.tsx's StageRow:
 *   - section labels are MONO EYEBROWS, small caps tracked wide;
 *   - the note is prose at the reading size and line height;
 *   - solvent and acid/base are CHIPS on one "Conditions" line, acid in the
 *     lessons' rose, base in its sky, neutral on the plain muted fill. The
 *     round 2 critic asked for exactly this fold: "Acid or base" is one word
 *     on 32 of the 43 cards and a labelled row for one word is chrome;
 *   - the reaction's NAME heads the back, as it heads the lessons panel. It
 *     is on the back only, because the name often states the transformation.
 * Presence is still `presentReveal`'s call: a chip is drawn only when that
 * field is in its list, so nothing shows here that the tests do not see.
 *
 * Every value is the card author's data, carried verbatim; the labels are
 * the only strings this file adds, and they name fields, not chemistry.
 *
 * A separate component from the scheme on purpose, per the owner: either
 * piece may be swapped for a library component later, so each carries its
 * own styles (.rxn-reveal* in reaction-card.css) and neither imports the
 * other.
 */

import { presentReveal, type ReactionReveal, type ReactionRevealField } from "../types";
import "./reaction-card.css";

export interface ReactionRevealPanelProps {
  readonly reveal: ReactionReveal;
  /** The registry's name for the reaction, when the card came from it. */
  readonly name?: string;
}

/** The two fields that render as chips on one line rather than as rows. */
const CHIP_FIELDS: ReadonlySet<ReactionRevealField> = new Set<ReactionRevealField>(["solvent", "acidBase"]);

/** The lessons' hue for each acid/base reading. Anything else is the plain chip. */
const ACID_BASE_TONE: Readonly<Record<string, string>> = Object.freeze({
  acidic: "rxn-chip--acidic",
  basic: "rxn-chip--basic",
});

const EYEBROW = "rxn-eyebrow font-mono text-scale-xs font-semibold uppercase tracking-[.16em]";

export function ReactionRevealPanel({ reveal, name }: ReactionRevealPanelProps) {
  const entries = presentReveal(reveal);
  if (entries.length === 0) return null;
  const rows = entries.filter((entry) => !CHIP_FIELDS.has(entry.field));
  const chips = entries.filter((entry) => CHIP_FIELDS.has(entry.field));
  return (
    <section className="rxn-reveal">
      {name !== undefined && name.trim().length > 0 && (
        <h3 className="rxn-reveal__name text-scale-base font-semibold text-bb-card-foreground">{name}</h3>
      )}
      <dl className="rxn-reveal__rows">
        {rows.map((entry) => (
          <div key={entry.field} className="rxn-reveal__row">
            <dt className={EYEBROW}>{entry.label}</dt>
            <dd className="rxn-reveal__value whitespace-pre-line text-scale-sm leading-6 text-bb-card-foreground">
              {entry.value}
            </dd>
          </div>
        ))}
        {chips.length > 0 && (
          <div className="rxn-reveal__row">
            <dt className={EYEBROW}>Conditions</dt>
            <dd className="rxn-reveal__chips">
              {chips.map((entry) =>
                /* "basic, then acidic" is acrossStages' join in reactionCard.ts;
                   each stage's reading becomes its own chip, in stage order. */
                entry.value.split(", then ").map((value, index) => (
                  <span
                    key={`${entry.field}-${index}`}
                    className={`rxn-chip font-mono text-scale-xs ${
                      entry.field === "acidBase" ? (ACID_BASE_TONE[value.trim()] ?? "") : ""
                    }`}
                  >
                    {value.trim()}
                  </span>
                )),
              )}
            </dd>
          </div>
        )}
      </dl>
    </section>
  );
}
