/**
 * The two sides of a card, drawn for the set page: the TERM (what the card
 * asks) and the DEFINITION (its answer). The big flashcard, the term list,
 * Test, Match and Write all draw these two, so a card looks the same in
 * every mode.
 *
 * A reaction card's term is the start material DRAWN (the RDKit image the
 * build already rendered), the reagents over an arrow, and an empty slot
 * where the product goes. Its definition is the product drawn and named,
 * with the reaction's name under it. A three-sided card the student wrote
 * shows their words, and a plain card its front and back, with its tagged
 * structure when it has one (cardStructure.ts).
 *
 * Nothing here adds chemistry: every string and drawing is on the card
 * already. See cards/ui/CardFace.tsx's header for where those come from.
 */

import { Formulas } from "../../../components/ui/formula";
import { MoleculeSvg } from "../../render/svg/MoleculeSvg";
import type { Card } from "../../cards/types";
import { Drawing } from "../../cards/ui/CardFace";
import { FormulaLabel } from "../../cards/ui/FormulaLabel";
import { structureOnCard } from "../../cards/ui/cardStructure";
import { answerText } from "./studyModel";

export type SideSize = "big" | "small";

/** The reagent line over the arrow: numbered steps when there are several. */
function reagentText(card: Card): string {
  const reaction = card.reaction;
  if (reaction === undefined) return card.sides?.conditions ?? "";
  const steps = reaction.reagentSteps;
  if (steps !== undefined && steps.length > 1) return steps.map((step, index) => `${index + 1}. ${step.label}`).join("  ");
  if (steps !== undefined && steps.length === 1) return steps[0]!.label;
  return reaction.reagents;
}

export function TermSide({ card, size }: { readonly card: Card; readonly size: SideSize }) {
  const reaction = card.reaction;
  if (reaction !== undefined || card.sides !== undefined) {
    const start = reaction?.reactants ?? card.sides?.setup ?? card.front;
    const art = reaction?.art;
    const reagents = reagentText(card);
    return (
      <div className={`ct-term ct-term--${size}`}>
        <figure className="ct-mol">
          <Drawing light={art?.startLight} dark={art?.startDark} alt={`Structure of ${start}`} className="ct-mol__art" />
          <figcaption className="ct-mol__name">
            {start}
            {size === "big" && <Formulas list={reaction?.reactantFormulas} className="ct-formula" />}
          </figcaption>
        </figure>
        <div className="ct-arrow">
          {reaction?.temperature !== undefined && size === "big" && <span className="ct-temp">{reaction.temperature}</span>}
          {reagents.trim().length > 0 && <FormulaLabel text={reagents} className="ct-reagents" />}
          <svg viewBox="0 0 72 12" className="ct-arrow__line" aria-hidden="true">
            <path d="M2 6 H64 M58 2 L66 6 L58 10" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>
        <div className="ct-slot" aria-label="Product to name">
          ?
        </div>
      </div>
    );
  }
  const structure = size === "big" ? structureOnCard(card) : null;
  return (
    <div className={`ct-term ct-term--plain ct-term--${size}`}>
      {structure !== null && (
        <div className="ct-structure" role="img" aria-label={structure.label}>
          <MoleculeSvg step={structure.step} scene={structure.scene} progress={0} reducedMotion={false} />
        </div>
      )}
      <p className="ct-words">{card.front}</p>
    </div>
  );
}

export function DefinitionSide({
  card,
  size,
  showName = true,
}: {
  readonly card: Card;
  readonly size: SideSize;
  /** Match hides the reaction name: it would give the pair away. */
  readonly showName?: boolean;
}) {
  const reaction = card.reaction;
  if (reaction !== undefined) {
    const art = reaction.art;
    const formula = reaction.productFormula === undefined ? undefined : [reaction.productFormula];
    return (
      <div className={`ct-def ct-def--${size}`}>
        <figure className="ct-mol">
          <Drawing light={art?.productLight} dark={art?.productDark} alt={`Structure of ${reaction.products}`} className="ct-mol__art" />
          <figcaption className="ct-mol__name ct-mol__name--answer">
            {reaction.products}
            {size === "big" && <Formulas list={formula} className="ct-formula" />}
          </figcaption>
        </figure>
        {showName && reaction.name !== undefined && (
          <p className="ct-rxn-name">
            <FormulaLabel text={reaction.name} prose />
          </p>
        )}
      </div>
    );
  }
  const why = card.sides === undefined ? card.why.trim() : "";
  return (
    <div className={`ct-def ct-def--plain ct-def--${size}`}>
      <p className="ct-words">{answerText(card)}</p>
      {size === "big" && why.length > 0 && <p className="ct-why">{why}</p>}
    </div>
  );
}
