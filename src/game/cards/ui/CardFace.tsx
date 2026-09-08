/**
 * One card, front and back. Read this header before trusting anything in this
 * file.
 *
 * THE SHAPE IS THE REFERENCE'S SHAPE, and it is worth naming what was taken.
 * docs/reference/competitors/orgosolver-02-flashcard-decks.png, right hand
 * phone: a small grey kind label at the top under a hairline, the structure
 * drawn large in the middle, tag chips, then the question, then a quiet "tap
 * to reveal" line at the bottom right. That layout puts the picture where the
 * eye lands first and the instruction where it is needed last, which is the
 * right order for a card you are trying to answer in your head.
 *
 * WHAT IS OURS AND NOT THEIRS: the third field. A card here carries `why` as
 * well as an answer, so the back TEACHES rather than only confirming. That is
 * the field cards/types.ts exists to protect and it is the reason a card
 * reviewed cold six weeks later still explains itself.
 *
 * THE THREE-SIDED FACE, and this is the clause the round 2 build missed.
 * DESIGN-GOALS locks reaction cards as three-sided, Setup / Conditions /
 * Product, switched by a segmented pill with the active segment filled and
 * the inactive ones outlined. Round 2 implemented that in the AUTHORING
 * composer only: `card.sides` was read nowhere but tray.ts, for the name, and
 * a composed card reviewed as a flat front/back with its conditions flattened
 * into a "Conditions: ..." prose line. The card a student actually REVIEWS is
 * the one the goals are about, so a card that carries `sides` now reviews on
 * the same pill it was written on. A card without sides (a lesson card, an
 * imported card, a miss from the journal) has no three sides to switch and
 * renders exactly as before; inventing sides for it would be a lie about
 * where its text came from.
 *
 * PRODUCT IS THE REVEAL. On a three-sided card the pill IS the reveal
 * gesture: Setup and Conditions are the question, Product is the answer, so
 * pressing Product before the reveal reveals. That also settles the HTML,
 * which would otherwise be a button inside a button: a sided face is a plain
 * div carrying real segment buttons, and it is the segments rather than the
 * whole card that take the press. An unsided face keeps the whole-card button
 * it always had.
 *
 * ONE ELEMENT, TWO FACES, and this is deliberate. Front and back are the same
 * bordered box with the back's content revealed inside it, not two boxes that
 * swap. A flip animation looks good once and costs a student the answer's
 * position on screen every single time, and the reveal is a moment where they
 * are comparing what they thought against what is written.
 *
 * `.press` gives the pointer-down acknowledgement in CSS with no JavaScript
 * in the way, which is what CLAUDE.md's under 100 ms contract asks for; the
 * reveal itself then runs on click so a keyboard reaches it too.
 */

import { useState } from "react";
import type { Card, CardId, ReactionSide } from "../types";
import { MoleculeSvg } from "../../render/svg/MoleculeSvg";
import { structureOnCard } from "./cardStructure";
import { SIDE_LABELS, SIDE_ORDER } from "./composer";
import { CARD_STATE_LABELS, type CardSchedulerState } from "./cardState";
import { StateBadge, StateMarker } from "./StateBadge";
import "./cards.css";

/** The small label above the rule. Says where this card came from. */
function sourceLabel(card: Card): string {
  switch (card.source.kind) {
    case "lesson":
      return "From a lesson";
    case "mistake":
      return "From a miss";
    case "composed":
      return "Your own card";
    case "import":
      return card.source.deckName;
    default: {
      const unreachable: never = card.source;
      return unreachable;
    }
  }
}

/** Concept tags, without the machine readable ones the surfaces use. */
function visibleTags(card: Card): readonly string[] {
  return card.tags.filter((tag) => !tag.includes(":")).slice(0, 4);
}

/**
 * The structure block. Fixed height rather than intrinsic, so the question
 * below it sits in the same place on every card and a student's eye does not
 * have to re-find it between cards.
 */
function CardStructureBlock({ card }: { readonly card: Card }) {
  const structure = structureOnCard(card);
  if (structure === null) return null;
  return (
    <div className="h-40 w-full sm:h-48" aria-hidden={false}>
      {/* progress 0 draws the reactants with no arrows. See cardStructure.ts. */}
      <MoleculeSvg step={structure.step} scene={structure.scene} progress={0} reducedMotion={false} />
    </div>
  );
}

export interface CardFaceProps {
  readonly card: Card;
  readonly revealed: boolean;
  readonly onReveal: () => void;
  /**
   * Where the card is in the scheduler, per the committed states sheet: the
   * face wears the state's edge tint, corner badge, and word. Optional so a
   * surface with no review state (the composer's preview, a bare render in a
   * test) still draws a neutral card rather than inventing a state.
   */
  readonly schedulerState?: CardSchedulerState;
}

/** Which side a sided card is showing, and what the student picked to get there. */
interface SidePick {
  readonly cardId: CardId;
  readonly side: ReactionSide;
  /** The reveal state the pick was made under. See `activeSide`. */
  readonly revealed: boolean;
}

export function CardFace({ card, revealed, onReveal, schedulerState }: CardFaceProps) {
  const tags = visibleTags(card);
  const sides = card.sides;

  /**
   * DERIVED STATE WITH A KEYED OVERRIDE, which is the boring alternative to
   * resetting state in an effect when a prop changes. The default side is a
   * pure function of `revealed` (Setup while the card is a question, Product
   * the moment it is an answer); a student's own pick overrides it, but only
   * while both the card AND the reveal state it was made under still hold. So
   * moving to the next card, or revealing, re-asserts the default with no
   * effect, no stale render, and nothing to clean up.
   */
  const [pick, setPick] = useState<SidePick | null>(null);
  const activeSide: ReactionSide =
    pick !== null && pick.cardId === card.id && pick.revealed === revealed
      ? pick.side
      : revealed
        ? "product"
        : "setup";

  const chooseSide = (side: ReactionSide): void => {
    // Product before the reveal IS the reveal; the default then lands on
    // Product on its own, so the pick is cleared rather than set.
    if (side === "product" && !revealed) {
      setPick(null);
      onReveal();
      return;
    }
    setPick({ cardId: card.id, side, revealed });
  };

  const header = (
    <div className="flex items-center justify-between gap-2 border-b border-bb-border pb-2">
      <span className="text-scale-xs font-semibold uppercase tracking-wide text-bb-muted-foreground">
        {sourceLabel(card)}
      </span>
      {/* The state's word, spoken as text beside the badge so the edge and
          disc never carry it in colour alone. "young" stays silent. */}
      {schedulerState !== undefined && schedulerState !== "young" && (
        <span className="text-scale-xs font-semibold uppercase tracking-wide text-bb-muted-foreground">
          {CARD_STATE_LABELS[schedulerState]}
        </span>
      )}
    </div>
  );

  const tagRow =
    tags.length > 0 ? (
      <div className="flex flex-wrap gap-1.5">
        {tags.map((tag) => (
          <span
            key={tag}
            className="rounded-full bg-bb-muted px-2.5 py-0.5 text-scale-xs font-medium text-bb-muted-foreground"
          >
            {tag}
          </span>
        ))}
      </div>
    ) : null;

  // The .fan__card--{state} classes carry the states sheet's edge tints and
  // set --fan-edge, which .card-slab's own bottom edge then takes its colour
  // from; the fan's absolute positioning rules key off .fan__card alone, so
  // none of that reaches this tall face.
  const stateEdge = schedulerState === undefined ? "" : `fan__card--${schedulerState}`;
  // The face is WARM IVORY, not white. All five committed goal images draw a
  // card face a shade off the cream ground so the whole screen reads as one
  // paper material; --bb-card is #ffffff, which reads as a web card printed on a
  // beige page. --cards-paper and its measured pairings are in cards.css. The
  // 2px border stays: at 1.03:1 on the ground the paper cannot identify its
  // own shape, which is the structural-border rule DESIGN-TOKENS already
  // states, and the states sheet draws a border on every card it shows.
  const shell = `card-slab relative flex min-h-[18rem] w-full flex-col gap-4 rounded-2xl border-2 border-bb-border bg-[color:var(--cards-paper)] p-5 text-left ${stateEdge}`;
  /* TWO MARKS, ONE STATE, and only one of them ever draws. StateBadge.tsx's
     header carries the reasoning: the committed states sheet gives the corner
     disc to due, mastered and suspended, and gives new and learning a mark on
     the card's own bottom edge instead. Both are mounted and each renders
     null outside its own set, so this file never has to restate the split. */
  const badge =
    schedulerState === undefined ? null : (
      <>
        <StateBadge state={schedulerState} />
        <StateMarker state={schedulerState} />
      </>
    );

  if (sides !== undefined) {
    return (
      /* A div, not a button: the pill's segments are the buttons here, and a
         button inside a button is invalid HTML that browsers resolve by
         dropping one of them. The 14px bottom margin is the slab's, which a
         box-shadow does not reserve for itself. */
      <div className={`${shell} mb-1.5`}>
        {badge}
        {header}

        <div className="seg-pill" role="group" aria-label="Card side">
          {SIDE_ORDER.map((side) => (
            <button
              key={side}
              type="button"
              className="seg-pill__opt press text-scale-sm"
              aria-pressed={side === activeSide}
              aria-label={
                side === "product" && !revealed
                  ? "Product, reveals the answer"
                  : `Show the ${SIDE_LABELS[side].toLowerCase()}`
              }
              onClick={() => chooseSide(side)}
            >
              {SIDE_LABELS[side]}
            </button>
          ))}
        </div>

        <CardStructureBlock card={card} />
        {tagRow}

        <p className="whitespace-pre-line text-scale-lg font-semibold leading-snug text-bb-card-foreground">
          {sides[activeSide].trim().length > 0 ? sides[activeSide] : "Nothing written on this side."}
        </p>

        {!revealed && (
          <p className="mt-auto text-right text-scale-sm text-bb-muted-foreground">
            Tap Product when you have your answer
          </p>
        )}
      </div>
    );
  }

  const body = (
    <>
      {header}
      <CardStructureBlock card={card} />
      {tagRow}

      <p className="text-scale-lg font-semibold leading-snug text-bb-card-foreground">{card.front}</p>

      {revealed ? (
        <div className="flex flex-col gap-3 border-t border-bb-border pt-4">
          {/* THE ANSWER IS NOT GREEN TYPE. DESIGN-GOALS' fill-only clause says
              the progress green appears only as a fill carrying dark ink or a
              white mark on a large shape, never as text. theme.css introduces
              a second, darker green (--good) specifically so that a number can
              be green type, and using it here reinterprets the clause rather
              than honouring it; no goal image shows green type anywhere. So
              the revealed answer is the card's own ink, and what marks it as
              the answer is the rule above it and the weight, which is how the
              goal images separate a card's halves too. */}
          <p className="whitespace-pre-line text-scale-lg font-semibold leading-snug text-bb-card-foreground">
            {card.back}
          </p>
          {card.why.trim().length > 0 && (
            <p className="whitespace-pre-line text-scale-sm leading-normal text-bb-muted-foreground">{card.why}</p>
          )}
        </div>
      ) : (
        <p className="mt-auto text-right text-scale-sm text-bb-muted-foreground">Tap to reveal the answer</p>
      )}
    </>
  );

  if (revealed) {
    return (
      <div className={`${shell} mb-1.5`}>
        {badge}
        {body}
      </div>
    );
  }

  return (
    <button
      type="button"
      className={`press ${shell} mb-1.5`}
      onClick={onReveal}
      aria-label="Reveal the answer"
    >
      {badge}
      {body}
    </button>
  );
}
