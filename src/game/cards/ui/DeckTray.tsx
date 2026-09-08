/**
 * The deck tray: one deck, browsed as a hand of cards. Read this header
 * before trusting anything in this file.
 *
 * THE COMMITTED IMAGE IS blueberry_r6-deck-tray in docs/reference/design-goals,
 * and round 3 is a visual-fidelity pass against it, so the list of what it
 * draws is the specification and every departure below is named:
 *
 *   - a SCENE, not a list: sky, faint clouds and flasks, a terrace stepping
 *     across the lower third, the fan hanging over the tray
 *   - six BORDERLESS cream cards in an arc, each carrying a skeletal
 *     structure, its name and its mastery dots, all six structures DIFFERENT
 *   - one card lifted upright under the pointer with a soft green GLOW and no
 *     ring of any kind
 *   - an OPEN TRAY at the foot of the frame, a muted indigo box with a deck
 *     standing in it, spanning 72 percent of the frame, carrying "24 · Reaction
 *     Deck" on its front panel
 *   - NO back arrow, NO page heading, NO paragraph, and NO review button under
 *     the tray. The deck's name appears exactly once, on the tray
 *
 * THREE KNOWING DIVERGENCES, and each is here rather than in a commit message
 * because the next reader will otherwise think they were accidents:
 *
 *   1. THE BACK CHIP EXISTS. The image has no way out of this screen, and a
 *      sub-screen with no exit is a trap: CardsHome holds the face in state,
 *      so pressing the Cards tab again re-renders the tray rather than
 *      leaving it. The compromise is the smallest thing that is still a real
 *      44px control, a round chip floating in the scene's top-left, which is
 *      not the header row with the deck's name in it that round 2 had.
 *   2. THE TRAY IS THE REVIEW BUTTON. The image ends its composition at the
 *      tray, and round 2 stacked two paragraphs and a 56px green chip beneath
 *      it, which pushed the whole fan-over-tray picture into the top half of
 *      the phone. Rather than delete the deck's only review action, the tray
 *      IS it: pressing the deck runs the deck, the accessible name says so in
 *      words, and the panel presses down on pointer down like every other
 *      control here.
 *   3. (CLOSED IN ROUND 4.) The fan dealt FIVE at 390px where the image draws
 *      six, because round 3's name floor assumed a label centred on its card.
 *      The image's labels are not centred; they overhang, and tray.ts's
 *      fanNameShift turns that drawn fact into arithmetic: shift the label
 *      into the band the neighbour leaves and the floor falls from 68 to 52,
 *      which deals SIX at the reference phone with every name still wholly
 *      visible. The guarantee round 3 added is kept, not traded away.
 *
 * WHAT MOVED IN ROUND 3, against the critic's measured list. The state-tinted
 * 2px borders left the fanned cards (the image draws one hand of like cards,
 * not five outlined chips in five hues; the per-state edges of
 * blueberry_spec-card-states still live on the tall review face, which is the
 * scale that sheet draws). The lifted card's hard green ring left with them,
 * because that sheet assigns a green edge to `mastered` and a lifted `due`
 * card was claiming a mastery it had not earned. The implementation-rationale
 * paragraph left outright: "the fan holds 5 at this width" explains a layout
 * limitation of the build to a student, which is not a sentence about their
 * deck. And the sketches are dealt through `distinctDoodles`, so no two cards
 * in one fan carry the same structure.
 *
 * THE FAN IS LAID OUT FOR THE WIDTH IT ACTUALLY HAS, AND DEALS FEWER CARDS
 * WHEN THAT WIDTH CANNOT PAY FOR THEM. tray.ts solves against two bounds, a
 * fit ceiling and a legibility floor. This component measures its own box
 * with a ResizeObserver and re-lays-out when it changes. The one non-obvious
 * React pattern is the REF plus STATE pair for measurement: the ref reaches
 * the DOM node (state cannot hold a live element before render), the observer
 * pushes the measured width into state, and the state re-renders the slots.
 *
 * A FANNED CARD IS A BUTTON with two presses: the first lifts it (the
 * .fan__card--lifted glow, this app's you-are-here language), the second opens
 * it as a one-card review, front first. The lift also reveals PAUSE, floated
 * over the scene so it costs the composition no height: suspension is a real
 * scheduler state on the sheet, so it is a real act here, and a paused card
 * stays visible in the fan (grey, pause badge), out of every queue, resumable
 * in the same spot. aria-pressed carries the lifted state.
 *
 * THE MISTAKES DECK IS ASSEMBLED, NOT STORED, per landing.ts. This component
 * takes `cards` as a prop and stays deck-shape agnostic; CardsHome decides
 * which assembly to hand it, so the tray never reaches into the journal.
 */

import { useEffect, useId, useRef, useState } from "react";
import type { Card, DeckSnapshot } from "../types";
import { isSuspended } from "../types";
import {
  fanCards,
  fanLayout,
  fanNameShift,
  trayLabel,
  trayTitle,
  FAN_CARD_H,
  FAN_CARD_PAD_X,
  FAN_CARD_W,
  FAN_REFERENCE_WIDTH,
} from "./tray";
import { TrayArt } from "./TrayArt";
import { masteryDots, MASTERY_DOTS } from "./mastery";
import { cardSchedulerState, CARD_STATE_LABELS } from "./cardState";
import { distinctDoodles } from "./landing";
import { AutoBolt, DeckDoodle, TrayScene } from "./Doodles";
import { BlueberryMark } from "../../mascot/BlueberryMark";
import { StateBadge } from "./StateBadge";
import "./cards.css";

/**
 * Which of the committed states sheet's three trays this deck gets. The sheet
 * draws the kind ON THE TRAY, not only on the landing tile: indigo for a deck
 * a student authored or imported, grey with a bare lightning bolt for one the
 * app collected from a lesson, grey with a berry for My mistakes.
 */
export type TrayKind = "authored" | "auto" | "mistakes";

/** The card edges standing in the tray. Six, exactly what the image draws. */
const TRAY_STACK_EDGES = 6;

export interface DeckTrayProps {
  readonly title: string;
  readonly cards: readonly Card[];
  /** See TrayKind. Defaults to the authored indigo tray. */
  readonly kind?: TrayKind;
  /** For the dots and the state edges. The tray reads review state, never writes it. */
  readonly snapshot: DeckSnapshot;
  readonly onBack: () => void;
  /** Run this deck as a review session, paused cards excluded. */
  readonly onReview: (cards: readonly Card[]) => void;
  /** Open one card for a closer look, front first. */
  readonly onOpenCard: (card: Card) => void;
  /** Pause or resume one card's reviews. CardsHome wires this to the seam. */
  readonly onSetSuspended: (card: Card, suspended: boolean) => void;
  /** Injected in tests, per the wall-clock rule. Read once per render. */
  readonly now?: () => Date;
}

export function DeckTray({
  title,
  cards,
  kind = "authored",
  snapshot,
  onBack,
  onReview,
  onOpenCard,
  onSetSuspended,
  now = () => new Date(),
}: DeckTrayProps) {
  /**
   * THE HAND OPENS WITH ONE CARD ALREADY RAISED, and that is a round 3
   * composition decision rather than a convenience. The committed image draws
   * this screen with a card standing clear of the arc under a pointing hand,
   * and that raised card is what occupies the phone's upper third; with every
   * card flat the same layout leaves the top 260px as sky, which is what the
   * critic measured and named. Nothing is claimed by raising one: the lift is
   * this app's you-are-here mark, the two presses stay two (a raised card's
   * next press opens it, and its aria-label says so), and any other card takes
   * the lift with a single press exactly as before.
   *
   * null means "the deck was empty when it mounted", which the fan handles by
   * drawing nothing at all. The initialiser runs once, so a student who lowers
   * the card by lifting another does not get it re-raised on every render.
   */
  const [lifted, setLifted] = useState<string | null | undefined>(undefined);
  const fanRef = useRef<HTMLDivElement | null>(null);
  /* Per instance, so two trays on one page cannot share the drawing's own
     gradient id. Same reason BlueberryMark carries per instance ids. */
  const trayUid = useId().replace(/:/g, "");
  const [fanWidth, setFanWidth] = useState(FAN_REFERENCE_WIDTH);

  useEffect(() => {
    const node = fanRef.current;
    if (node === null || typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver((entries) => {
      const width = entries[0]?.contentRect.width;
      if (width !== undefined && width > 0) setFanWidth(width);
    });
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  const at = now();
  const hand = fanCards(cards, fanWidth);
  const sketches = distinctDoodles(hand.map((card) => card.id));
  /**
   * `undefined` is "the student has not chosen yet", which is a different
   * thing from `null`, "the student put every card down", and keeping the two
   * apart is what lets the default be derived from the CURRENT hand rather
   * than frozen at mount. The hand's width is measured after the first paint
   * and a narrow phone is dealt fewer cards, so an id captured in the
   * initialiser could name a card the fan no longer deals; derived here it is
   * always a card that is actually on screen.
   */
  const liftedId = lifted === undefined ? centreOfHand(hand, snapshot) : lifted;
  const liftedCard = hand.find((card) => card.id === liftedId) ?? null;
  const reviewable = cards.filter((card) => !isSuspended(snapshot.review[card.id]));
  const pausedCount = cards.length - reviewable.length;
  const pausedNote =
    pausedCount === 0
      ? ""
      : pausedCount === 1
        ? " 1 paused card sits this one out."
        : ` ${pausedCount} paused cards sit this one out.`;

  return (
    <div className="mx-auto flex min-h-[calc(100dvh-11rem)] w-full max-w-md flex-col p-4 md:p-6">
      {/* THE SCENE IS THE WHOLE SCREEN. The committed image hangs the fan and
          the tray in one small world rather than stacking two controls, so
          the backdrop, the fan and the tray share a stacking context and the
          fan overlaps the tray's rim the way a hand held over an open box
          does. It is FULL BLEED inside the padded column for the fan's own
          arithmetic (every 16px of side padding is 16px the step cannot
          spend, and at 390px that is the difference between five readable
          names and four). */}
      <div className="deck-scene -mx-4 md:-mx-6">
        <TrayScene />

        {/* Divergence 1. See the header. */}
        <button type="button" className="scene-back press" onClick={onBack} aria-label="Back to your decks">
          <svg viewBox="0 0 20 20" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2.2" aria-hidden="true">
            <path d="M12 4 L5 10 L12 16" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>

        {hand.length === 0 ? (
          /* The empty state takes the FAN'S SLOT, margin and all, rather than
             sitting as a plain child of the scene: the scene settles its
             contents at the foot, so a bare paragraph landed against the tray
             and the standing deck was drawn straight over it. */
          <p className="mx-4 mb-20 rounded-2xl border border-bb-border bg-[color:var(--cards-paper)] p-4 text-center text-scale-base text-bb-muted-foreground md:mx-6">
            Nothing in this deck yet. Save a card from a lesson or write one of your own.
          </p>
        ) : (
          <div
            ref={fanRef}
            /* Tall enough for the card, its droop and its lift. The GAP
               between this box and the tray is cards.css's, on
               .deck-scene > .fan, with the measured composition beside it:
               it used to be a Tailwind mb-20 here, which put half of one
               vertical rhythm in a className and half in a stylesheet. */
            className="fan h-64"
            role="group"
            aria-label={`${title}, ${cards.length} cards`}
          >
            {hand.map((card, index) => {
              const slot = fanLayout(hand.length, index, fanWidth);
              const isLifted = liftedId === card.id;
              const state = cardSchedulerState(snapshot.review[card.id], at);
              const paused = state === "suspended";
              return (
                <button
                  key={card.id}
                  type="button"
                  /* Not a chip3d: the 3D press translate would clobber the
                     fan's own placement transform. cards.css carries a
                     fan-aware press rule instead, so the acknowledgement
                     happens in the card's own slot.

                     ONLY `suspended` TINTS THE CARD. Every other scheduler
                     state is carried by the mastery dots below the name, per
                     the committed deck-tray image, which draws six cards of
                     one material. Pause is the exception because it is a
                     state the student caused and has to be able to see and
                     undo. */
                  className={`fan__card ${paused ? "fan__card--suspended" : ""} press flex flex-col items-center justify-between gap-1 pb-2 pt-2 ${
                    isLifted ? "fan__card--lifted" : ""
                  }`}
                  style={
                    {
                      width: `${FAN_CARD_W}px`,
                      height: `${FAN_CARD_H}px`,
                      paddingLeft: `${FAN_CARD_PAD_X}px`,
                      paddingRight: `${FAN_CARD_PAD_X}px`,
                      "--fan-x": `${slot.x}px`,
                      "--fan-y": `${slot.y}px`,
                      "--fan-rot": `${slot.rot}deg`,
                      "--fan-name-shift": `${isLifted ? 0 : fanNameShift(hand.length, index, fanWidth)}px`,
                      zIndex: isLifted ? 10 : index,
                    } as React.CSSProperties
                  }
                  aria-pressed={isLifted}
                  onClick={() => (isLifted ? onOpenCard(card) : setLifted(card.id))}
                  aria-label={`${trayTitle(card)}, ${CARD_STATE_LABELS[state].toLowerCase()}. ${
                    isLifted ? "Press again to open" : "Press to lift"
                  }`}
                >
                  {paused && <StateBadge state={state} />}
                  {/* The skeleton, per both committed sheets. Decoration, not
                      chemistry: Doodles.tsx says so and says why. Dealt
                      through distinctDoodles so no two cards in one fan carry
                      the same picture, which the image never does. */}
                  <DeckDoodle
                    variant={sketches[index] ?? 0}
                    className="h-8 w-10 shrink-0 text-bb-muted-foreground"
                  />
                  <span className="fan__name text-scale-xs font-bold leading-none">
                    {trayTitle(card)}
                  </span>
                  <MasteryDotRow dots={masteryDots(snapshot.review[card.id])} />
                </button>
              );
            })}
          </div>
        )}

        {/* The lifted card's actions, FLOATED over the scene rather than
            stacked under it, so a transient control costs the composition no
            height. Pause lives here rather than on the card so the card's two
            presses stay two: lift, then open.

            IT WAITS FOR AN EXPLICIT LIFT (`lifted !== undefined`), not for the
            hint the hand opens with. The committed image draws nothing in this
            corner, and a control that is on screen the moment the tray opens
            is not transient; it is chrome. A student who has actually chosen a
            card gets it, which is who it was written for. */}
        {lifted !== undefined && liftedCard !== null && (
          <div className="pointer-events-none absolute right-4 top-0 z-20 flex justify-end">
            {isSuspended(snapshot.review[liftedCard.id]) ? (
              <button
                type="button"
                className="press pointer-events-auto min-h-11 rounded-full border-2 border-[color:var(--bb-primary-edge)] bg-[color:var(--cards-paper)] px-4 text-scale-sm font-bold text-[color:var(--bb-primary-ink)]"
                onClick={() => onSetSuspended(liftedCard, false)}
              >
                Resume reviews
              </button>
            ) : (
              <button
                type="button"
                className="press pointer-events-auto min-h-11 rounded-full border-2 border-bb-border bg-[color:var(--cards-paper)] px-4 text-scale-sm font-bold text-bb-foreground"
                onClick={() => onSetSuspended(liftedCard, true)}
              >
                Pause this card
              </button>
            )}
          </div>
        )}

        {/* THE TRAY. One drawing, in TrayArt.tsx, over tray.ts's TRAY_ART
            table: the cup, its continuous cavity, the deck standing in it and
            the front panel painted over the deck's lower half so the panel's
            top edge is one unbroken line with a flat-bottomed dip in it.
            Divergence 2: the whole box is the review control. */}
        <div className="tray-block">
          <button
            type="button"
            className={`tray-box ${kind === "authored" ? "" : "tray-box--collected"}`}
            disabled={reviewable.length === 0}
            onClick={() => onReview(reviewable)}
            aria-label={`Review ${title}, ${reviewable.length} of ${cards.length} cards.${pausedNote}`}
          >
            {/* AN EMPTY TRAY IS EMPTY. Six edges is what the image draws for
                a full deck; drawing six over a deck of nought would be the
                tray telling a student something the label beside it denies. */}
            <TrayArt edges={Math.min(cards.length, TRAY_STACK_EDGES)} uid={trayUid} />
            {/* The kind's mark, notched into the panel's dip exactly where
                the committed states sheet puts it: a bare bolt for an auto
                deck, the berry for mistakes. Decoration, and the button's own
                accessible name carries the deck's identity. */}
            {kind !== "authored" && (
              <span className="tray-box__mark" aria-hidden="true">
                {kind === "auto" ? (
                  <AutoBolt className="h-4 w-4" />
                ) : (
                  <BlueberryMark className="h-6 w-6" eyes mood="focused" />
                )}
              </span>
            )}
            <span className="tray-box__label title-face text-scale-lg font-bold">
              {trayLabel(cards.length, title)}
            </span>
          </button>
        </div>
      </div>
    </div>
  );
}

/**
 * Which card the hand opens with raised: the MIDDLE one, which is where the
 * committed image's raised card sits, skipping a paused card because raising
 * one would open this screen offering to un-pause something the student
 * paused on purpose. Returns null for a hand with nothing liftable in it.
 */
function centreOfHand(
  hand: readonly Card[],
  snapshot: DeckSnapshot,
): string | null {
  const live = hand.filter((card) => !isSuspended(snapshot.review[card.id]));
  if (live.length === 0) return null;
  const middle = hand[Math.floor((hand.length - 1) / 2)];
  if (middle !== undefined && !isSuspended(snapshot.review[middle.id])) return middle.id;
  return live[Math.floor((live.length - 1) / 2)]?.id ?? null;
}

/** The dots under a fanned card's name. Filled left to right, never green. */
function MasteryDotRow({ dots }: { readonly dots: number }) {
  return (
    <span
      className="flex shrink-0 items-center justify-center gap-1"
      role="img"
      aria-label={`${dots} of ${MASTERY_DOTS} mastery dots`}
    >
      {Array.from({ length: MASTERY_DOTS }, (_, i) => (
        <span key={i} className={`mastery-dot ${i < dots ? "mastery-dot--on" : ""}`} />
      ))}
    </span>
  );
}
