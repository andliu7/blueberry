/**
 * The rank badge: a disc with its motif ENGRAVED into the face.
 *
 * THE PICTURE THIS IMPLEMENTS is the committed states sheet
 * `docs/reference/design-goals/blueberry_r7-states-sheet_1788288485.png` and
 * the per-unit node of `docs/reference/design-goals/units/unit07-path.jpg`,
 * read together with DESIGN-GOALS' "The pathway node": a periwinkle disc sunken
 * into the page with its darker edge below it, and the motif "cut into the chip
 * in a darker tone of the chip's own colour, never a separate badge on top of
 * or beside it".
 *
 * A RANK BADGE IS THAT SAME OBJECT, on purpose. The product already has one
 * vocabulary for "a thing you press or have completed", and inventing a second
 * disc language for the profile would mean a student learning two. So the three
 * tones below are the states sheet's own three, borrowed rather than redrawn:
 *
 *   earned   the sheet's COMPLETED node: the goal green as a FILL with a dark
 *            mark cut into it, per the fill-only rule. Not a green outline and
 *            not green text, neither of which the rule permits
 *   current  the sheet's REST node: periwinkle face, darker edge below
 *   ahead    the queued treatment of owner ruling 4 (2026-09-04): a dashed
 *            outline that still CARRIES ITS MOTIF, because "an empty chip reads
 *            as broken rather than as unauthored", and a rank you have not
 *            reached is exactly an unauthored chip
 *
 * THE ENGRAVE IS TWO LAYERS, the same technique as the pathway's MotifGlyph: the
 * shape drawn once a hair lower in a lighter tone (the lip the cut throws) and
 * again at rest in the darker one. Two draws of one shape, so the mark can never
 * disagree with itself.
 *
 * EVERY SHAPE IS STROKED rather than filled, for the reason PathwayTab records:
 * an engraving is a cut line, and a filled blob at badge size reads as a sticker
 * stuck on top again.
 */

import type { RankMotif } from "./masteryModel";
import "./mastery.css";

export type RankTone = "earned" | "current" | "ahead";

/**
 * The six marks.
 *
 * They are a ladder, and the ladder is the ranks themselves: a structure you can
 * read, one arrow, one prediction, a route forward, the same route backward, and
 * the rosette at the end. Drawn on a 24 box at stroke 2.3, the same weight the
 * pathway's node motifs use, so a badge and a node read as one family.
 */
function motifShape(motif: RankMotif) {
  switch (motif) {
    case "structure":
      /*
        READER, "name the structure, spot the reactive site". A benzene ring
        with one vertex marked: the ring is the structure, the mark is the site.
      */
      return (
        <>
          <path
            d="M12 3.2 19.6 7.6v8.8L12 20.8 4.4 16.4V7.6Z"
            fill="none"
            strokeWidth="2.3"
            strokeLinejoin="round"
          />
          <circle cx="12" cy="3.2" r="2.1" strokeWidth="0" />
        </>
      );
    case "arrow":
      /*
        ARROW PUSHER, "move electrons the right way for the right reason". The
        curved electron-pushing arrow, the same geometry PathwayTab draws for a
        mechanism node, because it is the same claim about the same skill.
      */
      return (
        <>
          <path d="M4.4 17.4C4.4 7.6 19.6 7.6 19.6 16.2" fill="none" strokeWidth="2.3" strokeLinecap="round" />
          <path
            d="M15.8 13.8 19.6 17.2 23 13.4"
            fill="none"
            strokeWidth="2.3"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </>
      );
    case "predict":
      /*
        MECHANIST, "predict a product from an unseen mechanism". A forward
        reaction arrow landing on a product: the substrate is a dot, the arrow
        is the mechanism, the ring at the head is the thing you predicted.
      */
      return (
        <>
          <circle cx="3.9" cy="12" r="2.2" strokeWidth="0" />
          <path d="M7.4 12h6.4" fill="none" strokeWidth="2.3" strokeLinecap="round" />
          <path
            d="M11.6 9.2 14.4 12l-2.8 2.8"
            fill="none"
            strokeWidth="2.3"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <circle cx="19" cy="12" r="4.4" fill="none" strokeWidth="2.3" />
        </>
      );
    case "route":
      /*
        SYNTHESIST, "plan a two or three step route forward". Three stops and
        two arrows: the shortest drawing of a multi-step route, and the count is
        the claim.
      */
      return (
        <>
          <circle cx="3.6" cy="12" r="2.2" strokeWidth="0" />
          <path d="M6.9 12h2.4M14.7 12h2.4" fill="none" strokeWidth="2.3" strokeLinecap="round" />
          <path
            d="M8 9.6 10.4 12 8 14.4M15.8 9.6 18.2 12l-2.4 2.4"
            fill="none"
            strokeWidth="2.3"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <circle cx="12" cy="12" r="2.2" strokeWidth="0" />
          <circle cx="20.4" cy="12" r="2.2" strokeWidth="0" />
        </>
      );
    case "retro":
      /*
        RETROSYNTHESIST, "work backwards from a cold target". The retrosynthetic
        arrow, and it is the real symbol rather than a rotated forward one: a
        double shaft, open barb, pointing back at the starting material.
      */
      return (
        <>
          <path d="M6.4 9.6h13.2M6.4 14.4h13.2" fill="none" strokeWidth="2.3" strokeLinecap="round" />
          <path
            d="M8.8 5.6 3.2 12l5.6 6.4"
            fill="none"
            strokeWidth="2.3"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </>
      );
    case "rosette":
      /*
        EXAM READY, "handle a full mixed exam under time". A rosette rather than
        the stopwatch: the stopwatch is already the CHALLENGE node's motif in
        this vocabulary, and the top of a ladder is an award, not a timer.
      */
      return (
        <>
          <circle cx="12" cy="9.4" r="6.2" fill="none" strokeWidth="2.3" />
          <path
            d="m9.4 9.6 1.9 1.9 3.4-3.7"
            fill="none"
            strokeWidth="2.3"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <path
            d="M8.6 15.4 7.2 21.4l4.8-2.4 4.8 2.4-1.4-6"
            fill="none"
            strokeWidth="2.3"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </>
      );
  }
}

export interface RankMarkProps {
  readonly motif: RankMotif | null;
  readonly tone: RankTone;
  /** Diameter in pixels. The motif scales with the disc. */
  readonly sizePx: number;
  /**
   * The soft glow of the completed state. DESIGN-GOALS makes the static glow
   * the completed-state language, so it belongs on the rank a student just
   * reached and nowhere else on this surface. Static, so reduced motion has
   * nothing here to switch off.
   */
  readonly glow?: boolean;
  readonly className?: string;
}

export function RankMark({ motif, tone, sizePx, glow = false, className = "" }: RankMarkProps) {
  const shape = motif === null ? null : motifShape(motif);
  return (
    <span
      className={`rank-mark rank-mark--${tone}${glow ? " rank-mark--glow" : ""} ${className}`}
      style={{ ["--rank-mark-size" as string]: `${sizePx}px` }}
      aria-hidden
    >
      <span className="rank-mark__face">
        {shape === null ? null : (
          <svg viewBox="0 0 24 24" className="rank-mark__motif" focusable="false">
            <g className="rank-mark__lip" transform="translate(0 1.1)">
              {shape}
            </g>
            <g className="rank-mark__cut">{shape}</g>
          </svg>
        )}
      </span>
    </span>
  );
}
