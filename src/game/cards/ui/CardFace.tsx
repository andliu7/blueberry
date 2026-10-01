/**
 * One card, front and back. Rebuilt 29 Sep with the rest of the interface;
 * read this header before trusting anything in this file.
 *
 * THE CONTRACT KEPT FROM THE OLD FACE, on purpose: the same name and the same
 * props ({ card, revealed, onReveal, schedulerState? }). reactionCards.test.ts
 * renders this component to prove chemistry rules (the product is withheld
 * until the reveal, the reaction's name is on the back only, reagents are
 * drawn and never printed as SMILES, only authored reveal fields appear), and
 * those are rules about what a student SEES, so they hold for any face. The
 * interface around it was scrapped; these guarantees were not.
 *
 * ONE ELEMENT, TWO STATES. The front is a button (the whole card reveals on a
 * tap, and a keyboard reaches it too); the back is the same box with the
 * answer filled in where the question left a gap. The product fades up in the
 * place its blurred drawing held, so a student comparing their guess never
 * has to re-find the answer on screen.
 *
 * A THREE-SIDED CARD (a student's own reaction written as Setup, Conditions,
 * Product) draws on the same scheme as a registry card: setup left of the
 * arrow, conditions over it, product withheld. It has no drawings, because
 * nobody checked a structure for it, and the scheme draws only what exists.
 *
 * WHAT THIS FILE NEVER DOES: add chemistry. Every string and drawing here
 * arrived on the card from data/reactions.ts (RDKit-checked) or from the
 * student's own hand. The labels this file adds name fields, not molecules.
 */

import { Formulas } from "../../../components/ui/formula";
import { MoleculeSvg } from "../../render/svg/MoleculeSvg";
import type { Card, ReactionCardData, ReagentStep } from "../types";
import { presentReveal, type ReactionRevealField } from "../types";
import { CARD_STATE_LABELS, type CardSchedulerState } from "./cardState";
import { structureOnCard } from "./cardStructure";
import { FormulaLabel } from "./FormulaLabel";
import "./cards.css";

export interface CardFaceProps {
  readonly card: Card;
  readonly revealed: boolean;
  readonly onReveal: () => void;
  /** Where the card sits in the scheduler. Optional: a preview has no state. */
  readonly schedulerState?: CardSchedulerState;
  /**
   * When set, the front is NOT a reveal button and shows this line instead
   * of "Tap to reveal the answer". The run passes it on a card with a predict
   * step, because a tap on the biggest thing on screen used to flip the card
   * and skip the pick the whole step exists for (round 2 critic).
   */
  readonly frontPrompt?: string;
}

/** The small label top left. Says where this card came from. */
export function sourceLabel(card: Card): string {
  switch (card.source.kind) {
    case "lesson":
      return "From a lesson";
    case "mistake":
      return "From a miss";
    case "composed":
      return "Your own card";
    case "reaction":
      return "Reaction";
    case "import":
      return card.source.deckName;
    default: {
      const unreachable: never = card.source;
      return unreachable;
    }
  }
}

/** The scheme a card draws, or null for a plain question card. */
function schemeOf(card: Card): ReactionCardData | null {
  if (card.reaction !== undefined) return card.reaction;
  if (card.sides !== undefined) {
    return { reactants: card.sides.setup, reagents: card.sides.conditions, products: card.sides.product, reveal: {} };
  }
  return null;
}

const EYEBROW = "font-mono text-scale-xs font-semibold uppercase tracking-[.14em] text-bb-muted-foreground";

export function CardFace({ card, revealed, onReveal, schedulerState, frontPrompt }: CardFaceProps) {
  const scheme = schemeOf(card);
  // A "/" tag is a registry family slug ("carbonyls/addition"): an id, not
  // words, and on a phone its row cost the run card's why its last lines.
  const tags = card.tags.filter((tag) => !tag.includes(":") && !tag.includes("/") && tag !== "composed").slice(0, 3);

  const body = (
    <>
      <div className="flex items-center justify-between gap-2">
        <span className={EYEBROW}>{sourceLabel(card)}</span>
        {/* "young" (scheduled, not due) says nothing: it is the normal state. */}
        {schedulerState !== undefined && schedulerState !== "young" && (
          <span className={`state-chip ${EYEBROW}`}>
            <span className={`strip__cell cell--${schedulerState}`} aria-hidden="true" />
            {CARD_STATE_LABELS[schedulerState]}
          </span>
        )}
      </div>

      {scheme !== null ? (
        <ReactionScheme reaction={scheme} revealed={revealed} />
      ) : (
        <PlainFront card={card} />
      )}

      {tags.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {tags.map((tag) => (
            <span key={tag} className="rxn-chip text-scale-xs">
              {tag}
            </span>
          ))}
        </div>
      )}

      {revealed ? (
        <Back card={card} scheme={scheme} />
      ) : (
        <p className="mt-auto text-right text-scale-sm text-bb-muted-foreground">
          {frontPrompt ?? "Tap to reveal the answer"}
        </p>
      )}
    </>
  );

  if (revealed || frontPrompt !== undefined) return <div className="card-paper">{body}</div>;
  return (
    <button
      type="button"
      className="card-paper press"
      onClick={onReveal}
      aria-label="Reveal the answer"
      data-hover-label="Reveal"
    >
      {body}
    </button>
  );
}

/** A question card's front: its structure when it has one, then the prompt. */
function PlainFront({ card }: { readonly card: Card }) {
  const structure = structureOnCard(card);
  return (
    <>
      {structure !== null && (
        <div className="h-36 w-full">
          <MoleculeSvg step={structure.step} scene={structure.scene} progress={0} reducedMotion={false} />
        </div>
      )}
      <p className="whitespace-pre-line text-scale-lg font-semibold leading-snug">{card.front}</p>
    </>
  );
}

/** Everything the reveal adds under the front. */
function Back({ card, scheme }: { readonly card: Card; readonly scheme: ReactionCardData | null }) {
  if (scheme === null) {
    return (
      <div className="rxn-reveal">
        <p className="whitespace-pre-line text-scale-lg font-semibold leading-snug">{card.back}</p>
        {card.why.trim().length > 0 && (
          <p className="whitespace-pre-line text-scale-sm leading-normal text-bb-muted-foreground">{card.why}</p>
        )}
      </div>
    );
  }
  const entries = presentReveal(scheme.reveal);
  // A card whose author supplied no extras still teaches: its `why` stands
  // in, and nothing is invented to fill the space. A three-sided card's why
  // only repeats its own conditions, which the arrow already shows.
  if (entries.length === 0) {
    const why = card.sides === undefined ? card.why.trim() : "";
    if (scheme.name === undefined && why.length === 0) return null;
    return (
      <div className="rxn-reveal">
        {scheme.name !== undefined && (
          <h3 className="m-0 text-scale-base font-semibold">
            <FormulaLabel text={scheme.name} prose />
          </h3>
        )}
        {why.length > 0 && (
          <p className="whitespace-pre-line text-scale-sm leading-normal text-bb-muted-foreground">{why}</p>
        )}
      </div>
    );
  }
  return <RevealPanel reveal={scheme.reveal} name={scheme.name} />;
}

/** Solvent and acid/base read as chips on one Conditions line, not rows. */
const CHIP_FIELDS: ReadonlySet<ReactionRevealField> = new Set<ReactionRevealField>(["solvent", "acidBase"]);

const ACID_BASE_TONE: Readonly<Record<string, string>> = { acidic: "rxn-chip--acidic", basic: "rxn-chip--basic" };

/**
 * The concepts behind the reaction: the authored note first, then whichever
 * of Keq, pKa, 1,2 vs 1,4, electronegativity and resonance the author wrote.
 * `presentReveal` alone decides which exist, so nothing appears that the
 * data does not state.
 */
function RevealPanel({ reveal, name }: { readonly reveal: ReactionCardData["reveal"]; readonly name?: string }) {
  const entries = presentReveal(reveal);
  const rows = entries.filter((entry) => !CHIP_FIELDS.has(entry.field));
  const chips = entries.filter((entry) => CHIP_FIELDS.has(entry.field));
  return (
    <section className="rxn-reveal">
      {name !== undefined && name.trim().length > 0 && (
        <h3 className="m-0 text-scale-base font-semibold">
          <FormulaLabel text={name} prose />
        </h3>
      )}
      <dl className="rxn-reveal__rows">
        {rows.map((entry) => (
          <div key={entry.field} className="rxn-reveal__row">
            <dt className={EYEBROW}>{entry.label}</dt>
            {/* The authored notes mention reagents in ASCII ("NaNH2"); each
                formula word is set with its subscripts, the prose left alone. */}
            <dd className="whitespace-pre-line text-scale-sm leading-6">
              <FormulaLabel text={entry.value} prose />
            </dd>
          </div>
        ))}
        {chips.length > 0 && (
          <div className="rxn-reveal__row">
            <dt className={EYEBROW}>Conditions</dt>
            <dd className="rxn-reveal__chips">
              {chips.map((entry) =>
                /* "basic, then acidic" is reactionCard.ts's join across stages;
                   each stage's reading becomes its own chip, in order, and
                   carries its step number when there is more than one, so
                   "basic" and "acidic" side by side read as a sequence and
                   not as a contradiction (round 2 critic). */
                entry.value.split(", then ").map((value, index, all) => (
                  <span
                    key={`${entry.field}-${index}`}
                    className={`rxn-chip font-mono text-scale-xs ${
                      entry.field === "acidBase" ? (ACID_BASE_TONE[value.trim()] ?? "") : ""
                    }`}
                  >
                    {all.length > 1 && <span className="rxn-step">{index + 1}</span>}
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

/**
 * Reactants and reagents over the arrow, the product withheld until the
 * reveal. Stacks with a downward arrow when the card is narrow.
 */
export function ReactionScheme({
  reaction,
  revealed,
}: {
  readonly reaction: ReactionCardData;
  readonly revealed: boolean;
}) {
  const art = reaction.art;
  const productFormula = reaction.productFormula === undefined ? undefined : [reaction.productFormula];
  return (
    <div className="rxn-scheme">
      {reaction.temperature !== undefined && (
        <p className="rxn-conditions">
          <span className="rxn-chip rxn-chip--strong font-mono text-scale-xs font-semibold">{reaction.temperature}</span>
        </p>
      )}
      {/* THE REAGENTS HAVE THEIR OWN BAND over the arrow, and the start and
          the product share one row under it. Round 1 stacked all three down
          a phone, so a flipped card scrolled its own start off the top; a
          textbook writes reagents above the arrow, which is this shape. */}
      <div className="rxn-panel">
        <div className="rxn-reagent-band">
          <Reagents steps={reaction.reagentSteps} line={reaction.reagents} />
        </div>

        <figure className="rxn-side rxn-side--start">
          <Drawing light={art?.startLight} dark={art?.startDark} alt={`Structure of ${reaction.reactants}`} />
          <figcaption className="rxn-side__caption text-scale-sm font-semibold">
            {reaction.reactants}
            <Formulas list={reaction.reactantFormulas} className="text-bb-muted-foreground" />
          </figcaption>
        </figure>

        <div className="rxn-arrow-cell">
          <svg viewBox="0 0 72 12" className="rxn-arrow shrink-0" aria-hidden="true">
            <path
              d="M2 6 H64 M58 2 L66 6 L58 10"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </div>

        {revealed ? (
          <figure className="rxn-side rxn-side--product rxn-side--shown">
            <Drawing light={art?.productLight} dark={art?.productDark} alt={`Structure of ${reaction.products}`} />
            <figcaption className="rxn-side__caption text-scale-sm font-semibold">
              {reaction.products}
              <Formulas list={productFormula} className="text-bb-muted-foreground" />
            </figcaption>
          </figure>
        ) : (
          <figure className="rxn-side rxn-side--product rxn-side--hidden">
            {/* Blurred past reading and hidden from assistive tech; the file
                is named by reaction id, so nothing about the product leaks. */}
            <div className="rxn-side__veil" aria-hidden="true">
              <Drawing light={art?.productLight} dark={art?.productDark} alt="" />
            </div>
            <figcaption className="rxn-side__caption text-scale-sm font-semibold text-bb-muted-foreground">
              Product hidden
            </figcaption>
          </figure>
        )}
      </div>
    </div>
  );
}

/**
 * Over the arrow. A stage whose reagent the registry draws shows the drawing
 * with its bottle name under it; a stage with no structure in the data
 * (PCC, DIBALH, the organometallics) shows its name alone, and a student's
 * own card shows their words as written.
 */
/**
 * Heavy atoms in an RDKit formula ("CH5N" is 2, "H3O+" is 1, "HBr" is 1).
 * A species with ONE heavy atom has no skeleton: RDKit's "drawing" of H3O+ or
 * HBr is the same letters as its name, set at 6px in a 168px canvas, which is
 * what the round 2 critic could not read. Those show the formatted name alone;
 * everything with a bond to draw keeps its drawing, per the owner's rule.
 */
function heavyAtoms(formula: string): number {
  let count = 0;
  for (const [, symbol, digits] of formula.matchAll(/([A-Z][a-z]?)(\d*)/g)) {
    if (symbol !== "H") count += digits === undefined || digits === "" ? 1 : Number(digits);
  }
  return count;
}

function Reagents({ steps, line }: { readonly steps?: readonly ReagentStep[]; readonly line: string }) {
  if (steps === undefined || steps.length === 0) {
    if (line.trim().length === 0) return null;
    return <FormulaLabel text={line} className="rxn-reagents text-scale-sm font-semibold" />;
  }
  // Numbered only when there is a sequence: "1 then 2" is the order the
  // flask sees them, and an unnumbered pair reads as one mixture.
  const numbered = steps.length > 1;
  return (
    <ol className="rxn-reagent-row">
      {steps.map((step, index) => (
        <li key={step.label} className="rxn-reagent">
          {step.art !== undefined && heavyAtoms(step.art.formula) > 1 && (
            <Drawing light={step.art.light} dark={step.art.dark} alt="" small />
          )}
          <span className="rxn-reagent__label text-scale-sm font-semibold">
            {numbered && <span className="rxn-step">{index + 1}</span>}
            <FormulaLabel text={step.label} />
          </span>
        </li>
      ))}
    </ol>
  );
}

/**
 * An RDKit drawing, as the light and dark pair the build renders. Both are in
 * the markup and CSS shows one per theme, so the right file is already decoded
 * when the theme flips. Renders nothing when the card has no drawing: an
 * empty frame would claim a structure the card does not have.
 */
export function Drawing({
  light,
  dark,
  alt,
  small = false,
  className,
}: {
  readonly light?: string | undefined;
  readonly dark?: string | undefined;
  readonly alt: string;
  readonly small?: boolean;
  readonly className?: string;
}) {
  if (light === undefined && dark === undefined) return null;
  const base = import.meta.env.BASE_URL;
  // Declared sizes are what build_curriculum.py renders, so nothing jumps
  // while the image decodes.
  const width = small ? 168 : 340;
  const height = small ? 104 : 210;
  const cls = className ?? (small ? "rxn-reagent__art" : "rxn-side__art");
  return (
    <>
      {light !== undefined && (
        <img src={base + light} alt={alt} width={width} height={height} className={`${cls} ${dark === undefined ? "" : "dark:hidden"}`} />
      )}
      {dark !== undefined && (
        <img
          src={base + dark}
          alt={light === undefined ? alt : ""}
          aria-hidden={light === undefined ? undefined : true}
          width={width}
          height={height}
          className={`${cls} ${light === undefined ? "" : "hidden dark:block"}`}
        />
      )}
    </>
  );
}
