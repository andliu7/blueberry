/**
 * The Feed's composed ground. Decoration only: `aria-hidden`, not focusable,
 * and behind every card in the stacking order.
 *
 * WHAT IT DRAWS, per blueberry_r7-feed-v2_1788288479.png: a soft band sweeping
 * across the lower half of the page, with outlined flasks, clouds and one
 * chain watermark placed on the flanks around it. backdropProps.ts decides
 * WHERE and this file decides what a prop looks like, the same split
 * PathScene.tsx and sceneProps.ts already use.
 *
 * THE SHAPES ARE THE PATHWAY'S, COPIED RATHER THAN IMPORTED. The path data
 * below is character for character the `Flask`, `CloudMark` and chain-kind
 * `MoleculeMark` geometry in tabs/pathway/PathScene.tsx. That is deliberate:
 * the doctrine's requirement is that the prop FAMILY is constant across the
 * product, and importing them instead would pull the pathway scene, its
 * terrain arithmetic and pathway.css into this tab's lazy chunk to get four
 * glyphs. If a future round promotes the family to a shared module, these are
 * the call sites; until then the duplication is named here so it is a recorded
 * trade rather than a drift nobody noticed.
 *
 * HOW A PROP IS POSITIONED, and why it is not one big SVG. Each prop is its
 * own small fixed-size SVG placed by CSS percentages, so the drawings never
 * distort as the page grows: an SVG stretched to the page box would squash
 * every flask on a short screen and stretch it on a long one. The band IS one
 * full-bleed SVG with preserveAspectRatio="none", because a wash band is a
 * horizon and is meant to follow the box.
 *
 * CONTRAST. Everything here is decorative wallpaper, so it sits under the 3:1
 * graphics floor on purpose, the same exemption pathway.css records beside
 * --path-prop: WCAG 1.4.11 scopes to graphics required for understanding, and
 * nothing on this layer is a control, carries state, or has to be read for the
 * page to make sense. Every graphic on the Feed that DOES carry meaning (the
 * quest flasks, the bars, the chests, the avatars) keeps its floor.
 */

import { type CSSProperties, type ReactElement } from "react";
import { FEED_BAND, feedProps, type FeedPropKind } from "./backdropProps";

/** The Erlenmeyer silhouette, outlined. PathScene.tsx's `Flask`. */
function FlaskProp() {
  return (
    <svg viewBox="-16 -18 32 36" className="feed-prop feed-prop--flask" aria-hidden focusable="false">
      <path d="M-4 -14 h8 v9 l7 15 a3 3 0 0 1 -3 4 h-16 a3 3 0 0 1 -3 -4 l7 -15 z" />
      <path d="M-6 -15 h12" strokeWidth="2.5" />
    </svg>
  );
}

/** The one FILLED prop, per the committed backdrop. PathScene.tsx's `CloudMark`. */
function CloudProp() {
  return (
    <svg viewBox="-30 -20 62 32" className="feed-prop feed-prop--cloud" aria-hidden focusable="false">
      <path d="M -26 8 a 9 9 0 0 1 2 -17.6 a 12.5 12.5 0 0 1 24 -4.4 a 9.5 9.5 0 0 1 13 8.4 a 7 7 0 0 1 -2.6 13.6 z" />
    </svg>
  );
}

/**
 * The carbon chain seen edge on: a wide, SHALLOW zigzag, not a mountain. The
 * prop sheet's own proportion, amplitude 6 against a 68 span.
 */
function ChainProp() {
  return (
    <svg viewBox="-38 -12 76 24" className="feed-prop feed-prop--chain" aria-hidden focusable="false">
      <path d="M -34 6 L -17 -6 L 0 6 L 17 -6 L 34 6" />
    </svg>
  );
}

const PROP: Readonly<Record<FeedPropKind, () => ReactElement>> = {
  cloud: CloudProp,
  flask: FlaskProp,
  chain: ChainProp,
};

export function FeedBackdrop() {
  return (
    <div className="feed-backdrop" aria-hidden>
      {/*
        The band. One quadratic curve from the left edge to the right, closed
        down the bottom of the box, so it is a horizon and never a seam. It is
        the only element here that follows the box shape, which is why it is
        the only one drawn with preserveAspectRatio="none".
      */}
      <svg
        className="feed-band"
        viewBox="0 0 100 100"
        preserveAspectRatio="none"
        aria-hidden
        focusable="false"
      >
        <path
          d={`M0 ${(FEED_BAND.left * 100).toFixed(1)} Q50 ${(FEED_BAND.control * 100).toFixed(1)} 100 ${(
            FEED_BAND.right * 100
          ).toFixed(1)} L100 100 L0 100 Z`}
        />
      </svg>
      {feedProps().map((placement, i) => {
        const Prop = PROP[placement.kind];
        return (
          <span
            key={`${placement.kind}-${i}`}
            className="feed-prop-seat"
            style={
              {
                left: `${placement.x * 100}%`,
                top: `${placement.y * 100}%`,
                "--prop-scale": placement.scale,
              } as CSSProperties
            }
          >
            <Prop />
          </span>
        );
      })}
    </div>
  );
}
