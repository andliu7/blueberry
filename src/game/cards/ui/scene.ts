/**
 * The deck tray's environment, as numbers. Read this header before trusting
 * anything in this file.
 *
 * WHY THIS IS A FILE AND NOT FIVE LITERALS IN A COMPONENT. The background
 * doctrine of 2026-09-02 is a rule about METHOD, not about taste: the pathway
 * environment is COMPOSED, never scattered; props are placed by a
 * deterministic per-unit placement table; and "random per-route scatter of
 * icons or molecules is a defect a critic names". A table that lives in a
 * component is a claim nobody can check. A table that lives here is one
 * test/cardsScene.test.ts holds a ruler to, and the ruler is the point: a
 * later hand that reaches for Math.random, or that drops a cloud where the
 * fan covers it, fails a check rather than passing a review.
 *
 * WHERE A PROP MAY STAND is the one geometric fact worth stating out loud.
 * The props layer is pinned to the TOP of the scene and the scene stacks its
 * contents at the FOOT of the frame, so what a prop has to clear is the fan
 * and the tray that rise from that foot. SCENE_FAN_TOP, SCENE_ARC_TOP and
 * SCENE_LIFT_COLUMN below are those lines, derived from the built
 * composition, and the test holds every prop to them. A prop that fails them
 * is not a subtle prop, it is a prop nobody will ever see.
 *
 * THE PALETTE IS THE WARM-TECH ONE, AND ROUND 4 IS WHERE IT STOPPED HIDING.
 * Round 3 drew every prop at 0.12 opacity, under contrast-audit.mjs's own
 * published <0.15 skip threshold, so the gate never scored a single mark on
 * this face. It passed by not being measured. What a person then saw was the
 * defect the round 3 critic named: a desaturated grey-green sky where the
 * committed deck-tray image draws warm cream, tan terraces, ONE cloud filled
 * solid white and one drawn as a violet outline, and two flasks in warm tan.
 *
 * So the props are painted at full strength in the image's own families and
 * they are MEASURED rather than skipped. SCENE_PALETTE below carries every
 * hex and both grounds; test/cardsScene.test.ts computes the WCAG ratio of
 * each drawn line against the ground it sits on and holds it to the 3.0
 * graphics floor. That is a stronger check than the one it replaces, and it
 * is why the opacity assertion is gone rather than loosened.
 *
 * THE WHITE CLOUD IS WHITE, and it clears the gate the way the gate itself
 * says a shape may: contrast-audit.mjs collapses a shape's fill and stroke to
 * the BETTER of the two ("A shape is ONE component, not two"), so a white
 * cloud closed by a tan outline is identified by its outline. The image draws
 * that outline too; this is the drawing, not a dodge.
 *
 * Pure: no React, no DOM, no clock, no storage.
 */

/** The props' coordinate space. Pinned to the scene's bottom edge at this ratio. */
export const SCENE_WIDTH = 390;
export const SCENE_HEIGHT = 300;
export const SCENE_VIEWBOX = `0 0 ${SCENE_WIDTH} ${SCENE_HEIGHT}`;

/**
 * WHERE A PROP MAY STAND, and round 4 replaced a single band with the two
 * lines the composition actually has.
 *
 * Round 3's rule was one number: every prop's whole extent above y=200,
 * "where the fan does not cover it". That rule was written when the fan was a
 * 188px band; the hand is 247px tall now (a shallow arc under a card lifted
 * most of its own height), so 200 stopped meaning what it says. It was also
 * stricter than the committed image, which puts two of its clouds BEHIND the
 * fan, either side of the raised card, and keeps only the raised card's own
 * column clear.
 *
 * So there are three lines, all derived from the built composition at the
 * 390x844 reference phone, and test/cardsScene.test.ts holds every prop to
 * them:
 *
 *   SCENE_FAN_TOP    102   the top of the fan's box inside the scene. The
 *                          scene runs 657px between the header's foot and the
 *                          tab bar, and it stacks 256 of fan, 40 of gap, 223
 *                          of tray and 36 of ground at the bottom, which
 *                          leaves 102 of open sky
 *   SCENE_ARC_TOP    232   where the resting hand's own cards begin. The fan
 *                          box is 256 tall and its arc fills the bottom 126 of
 *                          it, so 102 + 130
 *   SCENE_LIFT_COLUMN      the raised card's column: 72px of card at the 1.28
 *                          lift scale, centred, plus a little clearance
 *
 * A prop is legal if it is wholly in the sky, or if it is above the arc and
 * clear of the raised card's column. That is the image's own arrangement
 * stated as a bound rather than as a wish.
 */
export const SCENE_FAN_TOP = 102;
export const SCENE_ARC_TOP = 232;
export const SCENE_LIFT_COLUMN = Object.freeze({ left: 143, right: 247 });

/**
 * THE SCENE PALETTE, every value measured against the ground it is drawn on.
 * cards.css declares the same six hexes as --scene-* custom properties (the
 * SVG needs them per theme and an attribute cannot switch on a class), and
 * test/cardsScene.test.ts asserts the stylesheet and this table agree, so the
 * numbers below describe the pixels a person actually receives.
 *
 * Ratios, WCAG 2.1, computed in the test rather than asserted here:
 *   tan line   #9a8055 on the cream ground #f1ede2   3.20  (floor 3.0)
 *   violet line --bb-border #55597f on the same ground   5.67
 *   night tan  #b09a6e on the night ground #171a2e    6.33
 *   night line #9aa4e0 on the same ground             7.21
 * The cloud FILL is exempt from the floor on the gate's own terms: white is
 * 1.06 on cream and is carried by its tan outline, which is the merge rule
 * contrast-audit.mjs publishes for a shape that is one component.
 */
export const SCENE_PALETTE = Object.freeze({
  ground: "#f1ede2",
  groundDark: "#171a2e",
  /** Flasks, terraces and the white cloud's closing outline. */
  tan: "#9a8055",
  tanDark: "#b09a6e",
  /** The outlined cloud and the molecule watermark. */
  line: "#55597f",
  lineDark: "#9aa4e0",
  /** The one cloud the image fills solid. */
  cloudFill: "#ffffff",
  cloudFillDark: "#e8e6f2",
});

/**
 * How a prop is painted. The committed image draws three treatments and not
 * one: a cloud FILLED solid white and closed by a tan line, a cloud drawn as
 * a violet OUTLINE with nothing inside it, and flasks and molecules as warm
 * tan line-art. Round 3 drew all five the same grey, which is the reason the
 * face lost the warm-tech palette the design goals name first.
 */
export type PropTone = "filled" | "outline" | "tan";

export type ScenePropKind = "cloud" | "flask" | "molecule";

export interface SceneProp {
  readonly kind: ScenePropKind;
  /** Top-left of the prop's own box, in scene units. */
  readonly x: number;
  readonly y: number;
  readonly scale: number;
  readonly tone: PropTone;
}

/**
 * The drawn extent of each prop in its OWN coordinates, as a bounding box
 * from its origin. These are supersets of the path data on purpose: an arc
 * bulges outside the points that define it, and a bound that is a little
 * generous still bounds. Keep them in step with the paths in Doodles.tsx.
 */
export const PROP_EXTENT: Readonly<Record<ScenePropKind, { readonly w: number; readonly h: number }>> =
  Object.freeze({
    cloud: { w: 60, h: 32 },
    flask: { w: 32, h: 42 },
    molecule: { w: 40, h: 33 },
  });

/**
 * THE PLACEMENT TABLE. Five props, left to right across the sky band, the
 * same five in the same places on every render of every deck. Nothing here
 * reads the deck it sits behind, and nothing here is random.
 *
 * The arrangement is the committed image's, now including which cloud is
 * which: the FILLED white cloud sits low on the left where the image puts it,
 * the violet OUTLINE cloud rides high on the right, a flask stands at each
 * margin and the faint molecule watermark sits between them.
 */
export const SCENE_PROPS: readonly SceneProp[] = Object.freeze([
  { kind: "flask", x: 8, y: 104, scale: 1, tone: "tan" },
  { kind: "cloud", x: 44, y: 118, scale: 1.1, tone: "filled" },
  { kind: "molecule", x: 160, y: 20, scale: 0.9, tone: "tan" },
  { kind: "cloud", x: 252, y: 40, scale: 1, tone: "outline" },
  { kind: "flask", x: 340, y: 110, scale: 0.95, tone: "tan" },
] as const);

export interface PropBox {
  readonly left: number;
  readonly top: number;
  readonly right: number;
  readonly bottom: number;
}

/** One prop's drawn box in scene coordinates. */
export function propBox(prop: SceneProp): PropBox {
  const extent = PROP_EXTENT[prop.kind];
  return {
    left: prop.x,
    top: prop.y,
    right: prop.x + extent.w * prop.scale,
    bottom: prop.y + extent.h * prop.scale,
  };
}
