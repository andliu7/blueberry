/**
 * The reaction card's scheme: the front face's own body. Read this header
 * before trusting anything in this file.
 *
 * THE OWNER'S SHAPE (17 Sep): reactants plus reagents on one side of the
 * arrow, products on the other, temperature worn on the face. Before the
 * reveal the product side is withheld; the reveal fills that side in, in
 * place, so the student's eye never has to re-find the answer's position.
 * The labelled extras live in ReactionRevealPanel.tsx, deliberately a
 * separate component: the owner may swap either piece for a library
 * component later, so neither knows the other exists.
 *
 * THE LOOK IS THE LESSONS ROW'S (owner, 25 Sep: "more like the reactions in
 * the lessons page, more refined"). components/ui/reaction-panel.tsx is the
 * reference and these are the properties carried across, by name:
 *   1. the scheme sits in an INSET PANEL on the card, a quiet wash with a
 *      hairline rim, not loose on the paper;
 *   2. three columns [1fr auto 1fr] that STACK when the card is narrow, the
 *      arrow turning to point down. The old face never stacked, and on a
 *      390px phone the critic's capture shows "benzaldehy / de" broken
 *      mid-word because three columns left each side 84px;
 *   3. NAME THEN FORMULA under each drawing, the formula in mono and muted
 *      with digits as subscripts, rendered by the same Formulas component
 *      the lessons row uses so the two cannot drift;
 *   4. the hidden product is the drawing BLURRED under a "Product hidden"
 *      caption, not a dashed box holding a question mark;
 *   5. reagents over the arrow in mono, in the primary ink;
 *   6. the arrow is a muted mark, not the foreground;
 *   7. the temperature is a small mono chip on a muted fill.
 * Not carried: the lessons' "Show product" button inside the scheme. The
 * whole card is already the reveal button (CardFace owns that gesture, and
 * the four grade chips depend on it), and a button inside a button is
 * invalid HTML.
 *
 * THE STRUCTURES ARE DRAWN, added in round 4. data/reactions.ts carries four
 * RDKit-rendered paths per reaction. The product's drawing is present but
 * blurred and aria-hidden before the reveal, exactly as the lessons row does
 * it; its alt is empty and the file is named by reaction id, so nothing
 * readable about the product reaches the front's markup.
 *
 * WHAT THIS FILE DOES NOT DO. No tap handling. No chemistry: every string
 * and every drawing here arrived on the card from authored data or the
 * student's own hand, and this file only places them.
 *
 * Styled by the .rxn-* family in reaction-card.css, its own sheet, so the
 * face can be restyled or replaced without disturbing cards.css.
 */

import { Formulas } from "../../../components/ui/formula";
import type { ReactionCardData } from "../types";
import "./reaction-card.css";

export interface ReactionSchemeProps {
  readonly reaction: ReactionCardData;
  /** Whether the product side is filled in yet. */
  readonly revealed: boolean;
}

/** The formula's ink on the card: the muted foreground, 5.33 on the wash. */
const FORMULA_INK = "text-bb-muted-foreground";

export function ReactionScheme({ reaction, revealed }: ReactionSchemeProps) {
  const art = reaction.art;
  const productFormula = reaction.productFormula === undefined ? undefined : [reaction.productFormula];
  return (
    <div className="rxn-scheme">
      {reaction.temperature !== undefined && (
        <p className="rxn-conditions">
          <span className="rxn-chip rxn-chip--strong font-mono text-scale-xs font-semibold">
            {reaction.temperature}
          </span>
        </p>
      )}
      <div className="rxn-panel">
        <figure className="rxn-side">
          <StructureArt
            light={art?.startLight}
            dark={art?.startDark}
            alt={`Structure of ${reaction.reactants}`}
          />
          <figcaption className="rxn-side__caption text-scale-sm font-semibold text-bb-card-foreground">
            {reaction.reactants}
            <Formulas list={reaction.reactantFormulas} className={FORMULA_INK} />
          </figcaption>
        </figure>

        <div className="rxn-arrow-cell">
          {reaction.reagents.trim().length > 0 && (
            <p className="rxn-reagents font-mono text-scale-xs font-semibold">{reaction.reagents}</p>
          )}
          <RxnArrow />
        </div>

        {revealed ? (
          <figure className="rxn-side">
            <StructureArt
              light={art?.productLight}
              dark={art?.productDark}
              alt={`Structure of ${reaction.products}`}
            />
            <figcaption className="rxn-side__caption text-scale-sm font-semibold text-bb-card-foreground">
              {reaction.products}
              <Formulas list={productFormula} className={FORMULA_INK} />
            </figcaption>
          </figure>
        ) : (
          <figure className="rxn-side rxn-side--hidden">
            {/* The withheld side. The drawing is there, blurred past reading
                and hidden from assistive tech; the caption is what a screen
                reader hears, so the question is spoken rather than punctuation. */}
            <div className="rxn-side__veil" aria-hidden="true">
              <StructureArt light={art?.productLight} dark={art?.productDark} alt="" />
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
 * The structure, drawn. Two images with one hidden per theme rather than one
 * image swapped in JavaScript: the drawings are separate files because RDKit
 * renders a light and a dark one, and a CSS-only switch means the right one
 * is already decoded when the theme flips.
 *
 * It renders NOTHING when the card carries no drawing, which is every card a
 * student wrote by hand. An empty box with a placeholder in it would be the
 * card claiming a structure it does not have.
 */
function StructureArt({
  light,
  dark,
  alt,
}: {
  readonly light?: string;
  readonly dark?: string;
  readonly alt: string;
}) {
  if (light === undefined && dark === undefined) return null;
  const base = import.meta.env.BASE_URL;
  return (
    <>
      {light !== undefined && (
        /* 340x210 is what build_curriculum.py renders, declared so the card
           does not jump as each drawing decodes. */
        <img
          src={base + light}
          alt={alt}
          width={340}
          height={210}
          className={`rxn-side__art ${dark === undefined ? "" : "dark:hidden"}`}
        />
      )}
      {dark !== undefined && (
        <img
          src={base + dark}
          alt={light === undefined ? alt : ""}
          aria-hidden={light === undefined ? undefined : true}
          width={340}
          height={210}
          className={`rxn-side__art ${light === undefined ? "" : "hidden dark:block"}`}
        />
      )}
    </>
  );
}

/**
 * The reaction arrow the reagents sit over. Same drawing as the composer's;
 * reaction-card.css turns it to point down when the scheme stacks.
 */
function RxnArrow() {
  return (
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
  );
}
