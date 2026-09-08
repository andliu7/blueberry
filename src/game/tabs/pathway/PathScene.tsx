/**
 * The pathway's backdrop: one continuous landscape that scrolls with the path.
 *
 * Not a tiled texture and not wallpaper. terrain.ts explains the motif; this
 * file is the drawing and the one animation frame that moves it.
 *
 * WHY IT IS ALL INSIDE ONE <svg>. Three reasons, in order of weight. A landscape
 * is artwork rather than chrome, and the sticker language's rules about borders,
 * radii and fills are about controls and cards, so drawing it as a stack of divs
 * would put a dozen borderless rectangles in front of an audit that is right to
 * ask about them. Masks, stroke-dashoffset draws and mirrored curves are native
 * here and awkward anywhere else. And one element means one paint layer for the
 * whole backdrop instead of seven.
 *
 * THE LAYERS, back to front, with the rate each moves at relative to the page.
 * layered-motion's stack, trimmed to what "simple and plain" leaves standing:
 *
 *   shade          0.04   the wash either side of the paper. Holds the lens
 *   paper          0.04   THE MEANING LAYER. The ribbon's width IS the energy
 *                         profile, and its edge is drawn from the unit's data
 *   props          0.14   an Erlenmeyer on the far shelf at each checkpoint
 *   (the track)    1.00   real DOM, not in here
 *
 * Every one of those is a transform on a <g>, written in ONE requestAnimationFrame
 * from ONE cached scroll value, per layered-motion's rule. Nothing here animates
 * a layout property and nothing here takes a pointer event.
 *
 * THE LENS. The shade layer is masked, and the mask carries two holes: one that
 * follows the pointer, and one anchored on the node the student is meant to tap
 * next. It used to mask a fog layer of its own; the fog is gone with the
 * hillsides it sat on, and the same effect now costs one layer instead of two. The second is not a nicety. Touch has no hover, so a lens bound only
 * to a pointer is invisible on the device most of this product is used on, and
 * layered-motion is explicit that a hover revealed thing needs a non hover path.
 *
 * REDUCED MOTION renders a settled frame: the curve fully drawn, every layer at
 * rest, the lens parked on the current node. A real frame of the design, never
 * an empty box.
 */

import { Fragment, useEffect, useLayoutEffect, useRef, useState } from "react";
import type { PathwayUnit } from "../../demo/pathwayMap";
import {
  terraceBands,
  channelHalfWidth,
  CHANNEL_SWING,
  energyProfile,
  groundPath,
  ridgePath,
  stepProfile,
  terracePath,
  terraceProfile,
  unitEnergies,
  unitRidges,
  type RowSpan,
  type UnitSpan,
} from "./terrain";
import {
  drawScale,
  placePropPx,
  propExtent,
  propsForBand,
  unitCharacter,
  type PropPlacement,
  type SceneFrame,
} from "./sceneProps";

/** What one measurement pass reads off the built page. */
interface SceneMetrics {
  /** The SCENE box: the viewport, because the surface is sticky. */
  readonly width: number;
  readonly height: number;
  /** The whole track, which is what the curve is drawn over. */
  readonly worldHeight: number;
  /** The track column's centreline, in scene coordinates. */
  readonly centreX: number;
  /** Half the track column, capped, so the landscape keeps its shape on a monitor. */
  readonly basis: number;
  /** Pixels of swell the channel may add at zero energy. See terrain.ts. */
  readonly swingPx: number;
  readonly spans: readonly UnitSpan[];
  /** Every track row's box, which is where the per lesson ripple hangs. */
  readonly rows: readonly RowSpan[];
  /** Scene y of each checkpoint unit's centre, for the hump band and the prop. */
  readonly checkpoints: readonly { readonly unitId: string; readonly y: number }[];
  /** Where the START node sits, so the lens has somewhere to be on touch. */
  readonly focus: { readonly x: number; readonly y: number } | null;
  /**
   * Every box that carries READING: the node name cards, the unit signposts,
   * the gate. Nothing in the landscape is drawn over one of these. Same
   * coordinate split as `focus` (x scene relative, y stage relative), so a
   * prop can be tested against it without another pass.
   */
  readonly keepOutText: readonly KeepOut[];
  /**
   * Every CHIP box. Only the filled props avoid these; see propClear for why
   * an outlined watermark is allowed to pass behind one.
   */
  readonly keepOutChips: readonly KeepOut[];
  /**
   * The ribbon's own corridor between consecutive chips. EVERY prop avoids
   * this one, outlined or filled: a molecule skeleton lying under the road
   * is the one thing the pixel verdict named by name.
   */
  readonly keepOutTrail: readonly KeepOut[];
}

/** A rectangle the background must leave alone. See SceneMetrics.keepOut. */
interface KeepOut {
  readonly x: number;
  readonly y: number;
  readonly w: number;
  readonly h: number;
}

const EMPTY: SceneMetrics = {
  width: 0,
  height: 0,
  worldHeight: 0,
  centreX: 0,
  basis: 0,
  swingPx: 0,
  spans: [],
  rows: [],
  checkpoints: [],
  focus: null,
  keepOutText: [],
  keepOutChips: [],
  keepOutTrail: [],
};

/**
 * The widest the landscape's own shape is allowed to get.
 *
 * Without it the hillsides walk off the sides of a 2560px monitor and the
 * channel stops being a channel. With it the terrain is the same shape at every
 * width, and a wide screen simply shows more open ground either side, which is
 * what a landscape does.
 */
const MAX_BASIS_PX = 360;

/**
 * How far the paper reaches past the label column, each side.
 *
 * The channel is the surface the node titles are printed on, so it has to clear
 * them rather than meet them: a boundary stroke landing on the first glyph of
 * "Kinetic vs thermodynamic control" is what the S3 grounding pass measured in
 * the desktop capture.
 */
const LABEL_GUTTER_PX = 12;

/**
 * How much lavender is kept beside the paper at the widest crest.
 *
 * Small, because on a phone this is competing with the reading column and the
 * reading column wins. It exists so the paper never runs flush to the screen
 * edge, which would read as a bleed rather than as a sheet.
 */
const SCENE_EDGE_PX = 10;

/**
 * The most the paper's edge may swell, in pixels, whatever the basis allows.
 *
 * The S2 defect was "torn paper scroll edges", and amplitude is what produced
 * that reading: at 16 percent of a 305px basis the edge moved 49px sideways
 * between rows about 170px apart, which is a 16 degree slope and reads as a rip
 * rather than as a curve. The constraint that came out of S2 is explicit that
 * the WAVELENGTH carries the reaction coordinate and the amplitude does not, so
 * this ceiling costs the meaning layer nothing and buys a deckle that reads as
 * a drawn edge. 24px over the same 170px pitch is about 8 degrees.
 */
const MAX_SWING_PX = 16;

/*
 * 24 IN ROUND TWO OF THIS PASS, 16 NOW, and the difference is what the desktop
 * capture showed once the flank wash came off. With a 2.5 percent wash beside
 * it the boundary was a soft change of surface; against the page's own lavender
 * it is a hard colour edge, and a hard edge wandering 24px each way over a
 * 170px row pitch is read as a deckle rather than as a curve. 16 over the same
 * pitch is about five degrees.
 *
 * It costs the meaning layer nothing, and that is the recorded S2 constraint
 * rather than my judgement: the WAVELENGTH carries the reaction coordinate and
 * the amplitude does not. terrain.ts's own header says the ribbon's width is
 * the energy profile, and both are true at once: the width still rises and
 * falls with the barrier, it simply does so over five degrees instead of eight.
 */

/**
 * Parallax rates, one per layer. See the header for what each layer is.
 *
 * A second, flatter ridge behind the ground was cut rather than kept. It was the
 * bottom mark in the scene, which is the one mark the contrast audit can resolve
 * a background for, and at #f1e9d9 on cream it measured 1.05:1 against a 3:1
 * floor for a graphical object. The honest fix was not an exemption for artwork,
 * it was to stop drawing two soft bands and draw one ground that clears the
 * floor, which the section below explains.
 *
 * THE VAPOUR MOVES AT THE GROUND'S RATE, and that is a fix rather than a
 * simplification.
 *
 * The fog is drawn as the SAME SHAPE as the ground, so the only thing moving it
 * RELATIVE TO THE GROUND does is uncover ground along the boundary. That was
 * harmless while the boundary was a smooth near vertical line: sliding a
 * vertical edge vertically exposes nothing. Once the profile gained its per
 * lesson ripple the boundary became a scalloped edge, and the 16px of relative
 * travel between -0.12 and 0.04 left a dark olive fringe down one flank of
 * every scallop, which reads exactly like a misregistered second plate in a
 * print. Both fringes were confirmed in this round's light desktop capture, the
 * second one after the first fix set the rate to zero and left the GROUND's own
 * 0.04 as the mismatch.
 *
 * No independent rate fixes it, because any offset of a shape against itself
 * uncovers something, and clipping does not either: a clip stops the fog
 * painting where it should not, and this is the opposite problem, fog ABSENT
 * where it should be. So the fog is pinned to its own ground, and the
 * foreground motion this layer was for is carried by the lens, which moves over
 * the path in earnest and is the thing a reader actually watches.
 */
const RATES = { ground: 0.04, props: 0.14 } as const;
/** No layer ever slides further than this, so no layer can expose its own edge. */
const MAX_SHIFT_PX = 110;
/** How long the pointer lens stays open after the pointer stops moving. */
const LENS_IDLE_MS = 900;
/**
 * The air a prop keeps from the page edge ON TOP OF its own half width.
 *
 * It used to be the whole margin, one number for every prop (38px, "the
 * widest prop's half width"). That was wrong in both directions once the
 * props grew: a cloud drawn 94px wide had 9px of it hanging off a phone, and
 * a chevron 55px wide was held 10px further in than it needed. The margin is
 * now `propExtent(placement).w + this`, so every prop is clamped by its own
 * size and this number is only the breathing room, which is the part that
 * genuinely is the same for all of them.
 */
const PROP_EDGE_PX = 6;

/** How far the crest clears the checkpoint panel's top edge, and how far its ends fall. */
const HUMP_LIFT = 8;
const HUMP_DROP = 110;

function measure(svg: SVGSVGElement, stage: HTMLElement): SceneMetrics {
  // FULL BLEED, measured rather than assumed. `margin-left: calc(50% - 50vw)`
  // is the usual trick and it is wrong here: it centres against the CONTAINING
  // BLOCK, and on a wide screen the track column is not centred in the viewport,
  // it sits to the right of the navigation rail. That left a bare white strip
  // down the side of the landscape. The stage's own left edge is the honest
  // number, and it does not depend on this margin, so reading it after zeroing
  // the margin cannot oscillate.
  svg.style.marginLeft = "0px";
  const box = stage.getBoundingClientRect();
  svg.style.marginLeft = `${(-box.left).toFixed(1)}px`;
  const scene = svg.getBoundingClientRect();
  // The CONTENT column, not the stage, is what the channel is measured against.
  // The channel is never narrower than its basis (terrain.ts explains why that
  // is a contrast rule), so if the basis were half the stage there would be no
  // room for a hillside inside a 390pt phone at all and the landscape would be
  // entirely off screen. The content column is deliberately a little narrower
  // than the stage, and the difference is exactly the ground a phone can show.
  const column = stage.querySelector<HTMLElement>("[data-path-content]") ?? stage;
  const columnBox = column.getBoundingClientRect();
  const spans: UnitSpan[] = [];
  const checkpoints: { unitId: string; y: number }[] = [];
  for (const section of stage.querySelectorAll<HTMLElement>("[data-unit-id]")) {
    const rect = section.getBoundingClientRect();
    const span = { unitId: section.dataset.unitId ?? "", top: rect.top - box.top, bottom: rect.bottom - box.top };
    spans.push(span);
    if (section.dataset.checkpoint === "true") {
      // THE CREST IS ANCHORED ON THE CHECKPOINT PANEL'S TOP EDGE, not on the
      // unit's centre. Drawn from the centre, the arc rose through the middle of
      // the panel, and an arc that climbs from lower left to a top centre apex
      // crosses ANY horizontal band of text that spans the panel: the capture
      // had the dashed curve struck through the word CHECKPOINT. There is no
      // amplitude that avoids it and no alignment of the heading that survives a
      // narrower phone. Anchored on the panel's top edge the arc passes OVER the
      // panel, which is the reading the design wanted in the first place: the
      // chips are what sits under the barrier.
      const gate = section.querySelector<HTMLElement>(".path-gate");
      const gateBox = gate === null ? null : gate.getBoundingClientRect();
      checkpoints.push({
        unitId: span.unitId,
        y: gateBox === null ? (span.top + span.bottom) / 2 : gateBox.top - box.top,
      });
    }
  }
  // The ROW carries the state attribute and the NODE carries the wind offset,
  // and since round two the offset is a transform on the node rather than on
  // the row. A row's own rect does not move with its child's transform, so
  // asking the row where the node is would park the lens on the centreline
  // whatever the node did. Ask the node.
  const current = stage.querySelector<HTMLElement>("[data-node-state='current'] .path-node");
  const focus =
    current === null
      ? null
      : (() => {
          const rect = current.getBoundingClientRect();
          // X IS SCENE RELATIVE AND Y IS STAGE RELATIVE, and that is not a
          // typo. The scene is full bleed and starts at the viewport's left
          // edge, so an x measured against the STAGE is short by the stage's
          // own offset, which on a desktop is the 240px rail plus the centring
          // margin, about 500px. The first build measured both against the
          // stage and the anchored lens landed 500px left of the node it is
          // supposed to be pointing at: a soft dark disc sitting in the middle
          // of the hillside with nothing under it, visible in every desktop
          // capture of round one and round two. Y stays stage relative because
          // the world group is translated by the stage's own top, which is what
          // puts the world's origin there.
          return { x: rect.left - scene.left + rect.width / 2, y: rect.top - box.top + rect.height / 2 };
        })();
  const rows: RowSpan[] = [];
  for (const row of stage.querySelectorAll<HTMLElement>("[data-unit-id] .path-row")) {
    const rect = row.getBoundingClientRect();
    rows.push({ top: rect.top - box.top, bottom: rect.bottom - box.top });
  }
  /*
   * THE TRAIL IS NOT MEASURED HERE ANY MORE, and its absence is the point.
   *
   * This surface is STICKY, so every one of its layers has to be re-placed
   * from a scroll listener, and a scroll listener repaints after the
   * compositor has already moved the page. The owner reported the consequence
   * twice: the trail lagged the buttons on every scroll. A background is
   * allowed to be a frame behind and a line connecting buttons is not, so the
   * ribbon moved into the unit sections themselves, where it scrolls in the
   * same layer as the chips it connects. See UnitTrail.tsx.
   *
   * The chip boxes are still read below, but only for the keep-out set, which
   * is a background composition rule and re-measured on layout rather than on
   * scroll.
   */
  /*
   * THE KEEP-OUT SETS, and there are two of them because the two kinds of
   * prop fail differently.
   *
   * BACKGROUND DOCTRINE: "the environment is COMPOSED, never scattered". A
   * critic measured the opposite on the built page: "a cloud overlaps the
   * top-left challenge chip and a second cloud is clipped in half by the Unit
   * 3 signpost's violet rule". The composition is therefore decided against
   * the real layout rather than against an assumption about it: the boxes
   * below are what the browser actually laid out.
   *
   * TEXT is absolute. A node's name card, a unit signpost and the gate carry
   * reading, and terrain.ts's header explains at length why nothing in the
   * landscape may sit under reading: the contrast audit climbs CSS boxes, an
   * SVG mark under a text box is not that box's ancestor, so a pair the audit
   * reports as passing could be composed on something else entirely. A prop
   * that meets one of these is not drawn.
   *
   * CHIPS are not, and that is the change of 2026-09-04. A chip is an OPAQUE
   * disc drawn above the whole scene, so an outlined watermark passing behind
   * one is occluded, not clipped: it shows either side of the chip, which is
   * what the per-unit designs draw (unit04's watermarks run behind the label
   * column). Dropping on chips as well was measured to be what starved the
   * landscape: on a 390pt phone the column plus its wind reaches from 0.11 to
   * 0.89 of the scene, so nearly every flank placement met a chip somewhere
   * and the whole strip vanished. The FILLED prop is the exception and keeps
   * the old rule, because a white cloud meeting a chip reads as two stickers
   * colliding rather than as weather behind a button.
   */
  const keepOutText: KeepOut[] = [];
  const keepOutChips: KeepOut[] = [];
  const boxOf = (element: HTMLElement): KeepOut | null => {
    const rect = element.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) return null;
    return { x: rect.left - scene.left, y: rect.top - box.top, w: rect.width, h: rect.height };
  };
  for (const element of stage.querySelectorAll<HTMLElement>(".path-label, .path-banner, .path-gate")) {
    const rect = boxOf(element);
    if (rect !== null) keepOutText.push(rect);
  }
  for (const element of stage.querySelectorAll<HTMLElement>("[data-trail]")) {
    const rect = boxOf(element);
    if (rect !== null) keepOutChips.push(rect);
  }
  /*
   * THE TRAIL'S OWN CORRIDOR, and it is new on 2026-09-04.
   *
   * Pixel verdict: "Keep watermarks OFF the trail; one currently sits
   * directly under it." Nothing in the keep-out list said so. The chips were
   * kept clear and the RIBBON BETWEEN THEM was not, which on a winding track
   * is most of its length.
   *
   * The corridor is exact rather than approximate, and that is worth one
   * sentence because it is the reason a bounding box is enough here. Every
   * stretch is trail.ts's `cubic`, whose two control points share the x of
   * their own endpoint, so a Bezier's convex hull property puts the whole
   * curve inside the x-range of the two chip centres. The box between two
   * consecutive anchors therefore CONTAINS the ribbon, and a prop that
   * clears the box clears the ribbon.
   *
   * It is measured off the chips rather than read from UnitTrail on purpose:
   * the trail lives in the unit sections now (see UnitTrail's header) and a
   * background layer asking a scrolling layer for geometry is the coupling
   * that round was removing. The anchors are the shared source of truth.
   */
  const keepOutTrail: KeepOut[] = [];
  for (let i = 1; i < keepOutChips.length; i += 1) {
    const from = keepOutChips[i - 1]!;
    const to = keepOutChips[i]!;
    const ax = from.x + from.w / 2;
    const ay = from.y + from.h / 2;
    const bx = to.x + to.w / 2;
    const by = to.y + to.h / 2;
    // A unit boundary can put two anchors a screen apart; a corridor drawn
    // across that gap would be a wall down the page rather than a road, and
    // the ribbon there is a lead-in the next section draws. LEAD_MAX_PX in
    // UnitTrail is the same 420.
    if (Math.abs(by - ay) > 420) continue;
    keepOutTrail.push({
      x: Math.min(ax, bx) - TRAIL_CORRIDOR_PX,
      y: Math.min(ay, by) - TRAIL_CORRIDOR_PX,
      w: Math.abs(bx - ax) + TRAIL_CORRIDOR_PX * 2,
      h: Math.abs(by - ay) + TRAIL_CORRIDOR_PX * 2,
    });
  }
  const centreX = columnBox.left - scene.left + columnBox.width / 2;
  const channelBasis = Math.min(MAX_BASIS_PX, columnBox.width / 2 + LABEL_GUTTER_PX);
  // The nearer side is what limits the swell, because the channel is symmetric
  // about the centreline and a desktop centreline is not the viewport's.
  const roomHalf = Math.min(centreX, scene.width - centreX) - SCENE_EDGE_PX;
  const channelSwing = Math.max(0, Math.min(channelBasis * CHANNEL_SWING, MAX_SWING_PX, roomHalf - channelBasis));

  return {
    width: scene.width,
    height: scene.height,
    worldHeight: box.height,
    // The scene is full bleed and the track column is not, so the centreline is
    // where the column actually is inside the scene, never simply the middle.
    centreX,
    // HALF THE COLUMN PLUS A GUTTER, which is what terrain.ts always said this
    // was and what the code stopped doing.
    //
    // The history matters because both halves of it were right. terrain.ts's
    // header states the invariant and the reason: "text simply must not sit on
    // the ground", because the ground has to clear 3:1 as a graphic, which caps
    // its lightness, and body copy has to clear 4.5:1, which needs more, and no
    // single value does both. It then says the basis is half the track column so
    // the channel is never narrower than the column. The scene passed 0.36 of
    // the column instead, for a real reason: at half, the ribbon at its widest
    // was 400 to 452px on a 390pt phone, wider than the screen, so the landscape
    // was invisible on the device this is mostly used on.
    //
    // What 0.36 actually bought was 21 to 42 points of visible ground and a
    // broken invariant. Measured on the built app at S3: the channel was 357px
    // wide against a 496px label column on a desktop, so "Kinetic vs
    // thermodynamic control" was struck through by the right boundary stroke and
    // the first third of every left label sat on the lavender ground at 4.73:1,
    // which is the thinnest contrast margin in the app and is exactly the pair
    // terrain.ts warns the audit cannot see.
    //
    // So the floor goes back to the column and the SWING absorbs the viewport
    // instead. The channel is never narrower than the labels; the swell either
    // side is whatever room is actually left. On a desktop that is the old 16
    // percent and the energy profile is unchanged. On a phone it is a few
    // pixels, and a phone genuinely does not have room for a full width reading
    // column and a landscape beside it: the honest shape there is a sheet of
    // paper with a hairline edge, which is also what the bar draws (its path
    // canvas is plain white edge to edge with no flank at all).
    basis: channelBasis,
    swingPx: channelSwing,
    spans,
    rows,
    checkpoints,
    focus,
    keepOutText,
    keepOutChips,
    keepOutTrail,
  };
}

/**
 * How much air an OUTLINED prop keeps from the trail corridor, in pixels.
 *
 * Measured against the built page rather than guessed, and it has come down
 * twice for the same reason. At half a chip's width (38px) a 390pt phone had
 * almost nothing left to draw a landscape in; at 22 the props returned but
 * the trail corridor added on 2026-09-04 took the room back, and one frame
 * carried two props against the reference frame's eight.
 *
 * 8 is the honest number for the device. A 390pt phone drawing a column that
 * winds 224px wide has about 70px of flank on each side; a molecule skeleton
 * is 110px across; the only way it stands there at all is at the page edge
 * with a small margin, which is exactly where unit01-path.jpg draws its
 * flasks (partly cut by the screen edge). What the margin still buys is that
 * a watermark never TOUCHES the ribbon, which is the rule that matters.
 */
const PROP_CLEARANCE_PX = 8;

/**
 * How far a prop keeps from the drawn ribbon, in pixels.
 *
 * Half the trail's painted width is 4px, so this is the line plus a real
 * margin: enough that a watermark reads as beside the road rather than as
 * touching it, small enough that a phone's narrow flanks still have places
 * to put one.
 */
const TRAIL_CORRIDOR_PX = 16;

/**
 * How far a FILLED prop keeps from a chip, in pixels.
 *
 * Smaller than PROP_CLEARANCE_PX and that is a fix rather than a slackening.
 * A cloud's own half width is about 40px, and adding 22 on top of it made a
 * 62px keep-out radius around a shape that has to live on a 390pt phone's
 * flank; measured on the built page, EVERY cloud in the scene was dropped
 * (zero near-white pixels across four scroll positions, against 3087 in
 * unit01-path.jpg's frame). The rule that matters is still enforced: a
 * filled prop never OVERLAPS a chip. What it no longer does is demand a
 * margin the device does not have.
 */
const FILLED_CLEARANCE_PX = 6;

/**
 * THE SECOND HALF-EXTENT TABLE IS GONE, and its going is a bug fix.
 *
 * This file used to carry a `PROP_HALF_PX` of its own beside sceneProps'
 * `PROP_HALF`, and the two disagreed: the cloud was tested as 92 wide and
 * drawn 54, the flask tested as 52 and drawn 22. A keep-out test that
 * measures a different rectangle from the one the renderer paints is not a
 * loose test, it is a test of a shape that is not on the page, and it is why
 * props both collided with chips and vanished from strips that had room.
 * `propExtent` is now the only answer to "how big is this prop", and it is
 * derived from the same `drawScale` the renderer passes to the component.
 */

/**
 * Whether a prop at this point clears everything the layout put on the page.
 *
 * Plain box overlap with a clearance band, which is the right test because
 * both sides are axis-aligned and the props are watermarks rather than
 * precise shapes: a curve-accurate test would buy nothing a reader could see
 * and would cost a scan of every path on every measurement.
 */
function propClear(
  placement: PropPlacement,
  point: { readonly x: number; readonly y: number },
  keepOut: readonly KeepOut[],
  clearance: number = PROP_CLEARANCE_PX,
): boolean {
  const half = propExtent(placement);
  const w = half.w + clearance;
  const h = half.h + clearance;
  for (const box of keepOut) {
    if (
      point.x + w > box.x &&
      point.x - w < box.x + box.w &&
      point.y + h > box.y &&
      point.y - h < box.y + box.h
    ) {
      return false;
    }
  }
  return true;
}

/**
 * An Erlenmeyer silhouette, drawn small on the ground beside a checkpoint.
 *
 * "Small chemistry props, kept rare and small" is the owner's own wording. One
 * per checkpoint means roughly one every three units, which is rare, and it is
 * drawn in the ground's own ink so it reads as part of the landscape rather than
 * as a sticker someone put on it.
 */
function Flask({ x, y, scale }: { readonly x: number; readonly y: number; readonly scale: number }) {
  return (
    <g className="path-prop" transform={`translate(${x} ${y}) scale(${scale})`}>
      <path d="M-4 -14 h8 v9 l7 15 a3 3 0 0 1 -3 4 h-16 a3 3 0 0 1 -3 -4 l7 -15 z" />
      <path d="M-6 -15 h12" strokeWidth="2.5" fill="none" />
    </g>
  );
}

/**
 * The low boulders on the near ground.
 */
function BoulderMark({ x, y, scale }: { readonly x: number; readonly y: number; readonly scale: number }) {
  /*
    TWO PEBBLES, THE LARGER IN FRONT, which is the cluster unit01-path.jpg
    draws on its low ground. Filled and unoutlined, like the clouds and unlike
    the watermarks, because a boulder is an OBJECT standing on the land rather
    than a drawing on it: sampled off that image it is a cool grey at 1.76:1
    against the ground beside it, which is what separates it from the tans
    without joining the periwinkle family the controls own.

    Rounded, low and wide. A tall rock reads as a monolith and starts
    competing with the chips for "thing on the path"; the reference's are
    squat and sit half in the ground.
  */
  return (
    <g transform={`translate(${x.toFixed(1)} ${y.toFixed(1)}) scale(${scale})`}>
      <path className="path-boulder path-boulder--far" d="M -22 8 a 11 9 0 0 1 6 -12 a 9 8 0 0 1 15 3 a 8 7 0 0 1 -3 9 z" />
      <path className="path-boulder" d="M -4 9 a 12 10 0 0 1 7 -13 a 10 9 0 0 1 17 4 a 9 8 0 0 1 -3 9 z" />
    </g>
  );
}

/**
 * A cloud, drifting over the terraces.
 *
 * FILLED, unlike the flask and the molecule watermarks, because that is what
 * the committed backdrop draws: white clouds over the cream ground, not
 * outlines of clouds. White on cream is 1.10:1 on its own, which is why the
 * shape also carries the terrace ink as a boundary; fill and stroke ride on
 * ONE path, so the contrast audit collapses them to the better of the two and
 * the stroke is what identifies the shape, exactly the argument every card in
 * this app carries a border on.
 */
function CloudMark({ x, y, scale }: { readonly x: number; readonly y: number; readonly scale: number }) {
  return (
    <g transform={`translate(${x.toFixed(1)} ${y.toFixed(1)}) scale(${scale})`}>
      <path
        className="path-cloud"
        d="M -26 8 a 9 9 0 0 1 2 -17.6 a 12.5 12.5 0 0 1 24 -4.4 a 9.5 9.5 0 0 1 13 8.4 a 7 7 0 0 1 -2.6 13.6 z"
      />
    </g>
  );
}

/**
 * The scene measures its OWN PARENT rather than taking a ref to it.
 *
 * That is not a style choice, it is the bug this file shipped with for one
 * build. React attaches refs and runs layout effects bottom up, so a child's
 * layout effect runs BEFORE its parent host element's ref is attached: a ref
 * handed down from the stage is still null when this component first measures,
 * the effect returns early, and because its dependencies never change it never
 * runs again. The whole backdrop silently rendered nothing. Reading
 * `svg.parentElement` cannot have that failure, because the svg is always in the
 * document by the time its own ref exists.
 */
export default function PathScene({
  units,
  reducedMotion,
  stamp = "",
}: {
  readonly units: readonly PathwayUnit[];
  readonly reducedMotion: boolean;
  /**
   * A progress fingerprint (current node id plus done count). The trail's
   * done colouring is measured off the DOM, and clearing a lesson changes
   * the DOM without changing `units`, so the measurement re-runs when this
   * string moves. Layout-only changes are already covered by the
   * ResizeObserver below.
   */
  readonly stamp?: string;
}) {
  const [metrics, setMetrics] = useState<SceneMetrics>(EMPTY);
  const svgRef = useRef<SVGSVGElement | null>(null);

  // Measure after layout, and again whenever the stage changes size. The curve
  // is derived from where the units actually landed, so a font swap or an
  // authoring wave moves it without anyone editing a number.
  useLayoutEffect(() => {
    const svg = svgRef.current;
    const stage = svg?.parentElement ?? null;
    if (svg === null || stage === null) return;
    const read = () => setMetrics(measure(svg, stage));
    read();
    const observer = new ResizeObserver(read);
    observer.observe(stage);
    window.addEventListener("resize", read, { passive: true });
    return () => {
      observer.disconnect();
      window.removeEventListener("resize", read);
    };
  }, [units, stamp]);

  // One rAF, one cached scroll value, every layer written from it.
  useEffect(() => {
    const svg = svgRef.current;
    const stage = svg?.parentElement ?? null;
    if (svg === null || stage === null) return;
    // Sliding the world under the window is NOT motion: it is what keeps a
    // sticky, viewport sized surface showing the right slice of a 14000px track.
    // So it is written in both branches, and only the parallax, the draw and the
    // pointer lens are held back under reduced motion.
    // THE TRANSLATE IS THE STUCK-STATE DELTA: stage.top MINUS the scene's own
    // top, never stage.top alone. The scene is sticky, so once it is stuck its
    // own top is 0 and the two numbers coincide, which is how the bug hid: at
    // landing scroll the scene still sits at the stage's flow position, and
    // stage.top alone double-offsets the whole drawn world, trail included.
    // The S3 critic measured 198px of divergence between the current chip's
    // centre and the nearest trail endpoint at scrollY 0, converging to 0 only
    // at scrollY 400, on the first screen a student sees. World coordinates
    // are stage-relative, so the honest translate is where the stage sits
    // relative to the scene element itself, in every scroll state.
    const world = () => {
      const sceneTop = svg.getBoundingClientRect().top;
      svg.style.setProperty("--world-y", (stage.getBoundingClientRect().top - sceneTop).toFixed(1) + "px");
    };
    if (reducedMotion) {
      world();
      svg.style.setProperty("--path-progress", "1");
      svg.style.setProperty("--shift-ground", "0px");
      svg.style.setProperty("--shift-props", "0px");
      window.addEventListener("scroll", world, { passive: true });
      window.addEventListener("resize", world, { passive: true });
      return () => {
        window.removeEventListener("scroll", world);
        window.removeEventListener("resize", world);
      };
    }
    let frame = 0;
    let pointer: { x: number; y: number } | null = null;
    /**
     * The pointer lens CLOSES when the pointer stops.
     *
     * Left open it is a soft dark disc parked wherever the cursor last was, and
     * on the hillside that is what it looks like: a smudge on the artwork with
     * nothing under it to explain itself. A lens is a thing you are holding, so
     * it belongs where the hand is and nowhere when the hand has gone. The
     * anchored lens on the current node is the one that stays, because that one
     * is pointing at something.
     */
    let idle = 0;
    const close = () => {
      idle = 0;
      pointer = null;
      svg.style.setProperty("--lens-r", "0");
    };
    const write = () => {
      frame = 0;
      const box = stage.getBoundingClientRect();
      const scene = svg.getBoundingClientRect();
      const viewport = window.innerHeight || 1;
      // ONE pair of rect reads, shared by every layer, rather than each layer
      // asking. The translate is the stuck-state delta (box.top - scene.top),
      // per the comment on world() above: stage.top alone is only correct
      // once the sticky scene is stuck, and at landing scroll it double-
      // offset the whole world by the stage's flow position.
      svg.style.setProperty("--world-y", (box.top - scene.top).toFixed(1) + "px");
      // How far the stage has travelled through the viewport, 0 to 1.
      const travel = Math.max(0, Math.min(1, (viewport - box.top) / (viewport + box.height)));
      const swing = (rate: number) => `${(Math.max(-1, Math.min(1, travel * 2 - 1)) * rate * MAX_SHIFT_PX).toFixed(1)}px`;
      svg.style.setProperty("--shift-ground", swing(RATES.ground));
      svg.style.setProperty("--shift-props", swing(RATES.props));
      // The curve draws itself as the page is travelled. Never fully undrawn:
      // a backdrop that is blank on arrival is the empty box the brief forbids.
      svg.style.setProperty("--path-progress", (0.35 + travel * 0.65).toFixed(3));
      if (pointer !== null) {
        // The lens circles live in the mask, which is WORLD coordinate space
        // (the referencing group rides inside the translated world). So the
        // y is stage-relative, pointer.y - box.top, the same split the focus
        // anchor uses; the old scene-relative y was only right in the one
        // scroll state where the two frames coincide, the same family of bug
        // as the --world-y double offset above. X carries no world translate,
        // so scene-relative is correct there.
        svg.style.setProperty("--lens-x", (pointer.x - scene.left).toFixed(0) + "px");
        svg.style.setProperty("--lens-y", (pointer.y - box.top).toFixed(0) + "px");
        svg.style.setProperty("--lens-r", "1");
      }
    };
    const schedule = () => {
      if (frame === 0) frame = requestAnimationFrame(write);
    };
    const onPointer = (event: PointerEvent) => {
      // Touch keeps the anchored lens: a finger is ON the thing it is pointing
      // at, so a hole under it reveals nothing and costs a repaint.
      if (event.pointerType === "touch") return;
      pointer = { x: event.clientX, y: event.clientY };
      if (idle !== 0) window.clearTimeout(idle);
      idle = window.setTimeout(close, LENS_IDLE_MS);
      schedule();
    };
    write();
    window.addEventListener("scroll", schedule, { passive: true });
    window.addEventListener("resize", schedule, { passive: true });
    window.addEventListener("pointermove", onPointer, { passive: true });
    window.addEventListener("blur", close);
    return () => {
      if (frame !== 0) cancelAnimationFrame(frame);
      if (idle !== 0) window.clearTimeout(idle);
      window.removeEventListener("scroll", schedule);
      window.removeEventListener("resize", schedule);
      window.removeEventListener("pointermove", onPointer);
      window.removeEventListener("blur", close);
    };
  }, [reducedMotion, metrics.height]);

  const { width, height } = metrics;
  const energies = unitEnergies(units);
  const samples =
    width < 2 || metrics.worldHeight < 2
      ? []
      : stepProfile(energyProfile(energies, metrics.spans), metrics.rows);
  const geometry = { width, height: metrics.worldHeight, centreX: metrics.centreX, basis: metrics.basis, swingPx: metrics.swingPx };

  /*
    THE LADDER, laid ONCE and shared by the plates and by the props.

    Owner 2026-09-04: "the background is small and does not flow well." The
    second half was structural and this line is the fix. The plates and the
    props used to be laid per UNIT, so both restarted at every unit boundary
    and a unit read as a strip with its own beginning and end. terraceBands
    lays one constant pitch from before the first unit to after the last, and
    the props hang off the SAME bands, so the composition crosses a boundary
    without a seam. What still changes at the boundary is the unit's
    CHARACTER: its skyline profile, its watermark family and its far ridge.
  */
  const bands = terraceBands(metrics.spans);
  const ridges = unitRidges(metrics.spans);
  /* The frame a placement is resolved against: the viewport, and where the
     track column sits inside it. See sceneProps.placePropPx. */
  const frame: SceneFrame = { width, centreX: metrics.centreX, basis: metrics.basis };

  const focus = metrics.focus ?? { x: metrics.centreX, y: metrics.worldHeight * 0.2 };

  return (
    <svg
      ref={svgRef}
      className="path-scene"
      viewBox={`0 0 ${Math.max(1, width)} ${Math.max(1, height)}`}
      aria-hidden
      focusable="false"
      style={{ "--anchor-x": `${focus.x}px`, "--anchor-y": `${focus.y}px` } as React.CSSProperties}
    >
      {samples.length === 0 ? null : (
      <>
      <defs>
        {/*
          The mask lives in the WORLD's coordinate space, because the element
          that references it is inside the translated world group. So it has to
          cover the whole track and not one viewport: a viewport sized rect made
          the fog stop dead partway down the page and left its lens hole sitting
          in open ground like a smudge.
        */}
        <mask id="path-lens-mask" maskUnits="userSpaceOnUse" x={-width} y={-2000} width={width * 3} height={metrics.worldHeight + 4000}>
          <rect x={-width} y={-2000} width={width * 3} height={metrics.worldHeight + 4000} fill="#ffffff" />
          <circle className="path-lens path-lens--anchor" cx="0" cy="0" r={Math.min(150, width * 0.34)} fill="url(#path-lens-falloff)" />
          <circle className="path-lens path-lens--pointer" cx="0" cy="0" r={Math.min(170, width * 0.38)} fill="url(#path-lens-falloff)" />
        </mask>
        {/*
          THE LENS LIFTS, IT NO LONGER ERASES. At 1.0 and 0.82 the mask cut a
          hole clean through the ground layer, so on a desktop capture the
          terraces vanished in a 300px oval around the current node and the
          landscape read as a spotlight blob. The point of the lens is to lift
          the ground a little where the eye is meant to go, so the stops are
          now a gentle 0.34, which reads as light on the hillside rather than
          as a missing hillside.
        */}
        <radialGradient id="path-lens-falloff">
          <stop offset="0%" stopColor="#000000" stopOpacity="0.34" />
          <stop offset="62%" stopColor="#000000" stopOpacity="0.26" />
          <stop offset="100%" stopColor="#000000" stopOpacity="0" />
        </radialGradient>
      </defs>

      {/*
        THE WORLD. Everything inside this group is drawn in TRACK coordinates,
        and the group slides under a viewport sized window.

        The first build drew the scene at the full height of the track. On a
        390pt phone at 3x that is a 1170 by 43557 pixel layer, roughly 200 MB,
        and it killed the renderer outright: the capture run died with the page
        session closed. A sticky surface the size of the viewport, with the world
        translated inside it, paints one screen and clips the rest, which is what
        a parallax backdrop should have been doing in the first place.
      */}
      <g className="path-world">
      {/*
        THE PAPER RIBBON, and it is what replaced the torn-paper flanks.

        Two blind judges called the old hillsides "an unfinished background
        asset": a muddy olive #9c7f4e either side of the track with a scalloped
        edge that read as a misregistered plate, and they cost the node labels
        horizontal room they wanted. That colour was not a taste failure, it was
        forced: the flanks were a FILL on a cream page, so they had to clear the
        3:1 graphics floor on their own, and the only fills that do on cream are
        dark and warm.

        The lavender turn removes the constraint by removing the fill. The ground
        IS the page now, the channel is a strip of the card's own cream running
        down it, and the shape that used to be a hillside is a soft shade beside
        the paper rather than a body of land. The ribbon carries a permanent
        hairline edge for the same arithmetic every card in the app now carries
        one: cream on lavender is 1.96:1 and a boundary needs 3:1, so the edge is
        what identifies the shape and the fill rides on it (the contrast audit
        collapses a fill and its stroke to the better of the two, and says so).
      */}
      <g className="path-layer path-layer--ground" mask="url(#path-lens-mask)">
        {/*
          THE TERRACES, which are also the descending energy bands.
          docs/DESIGN-GOALS.md asks the background for "terraced hills stepping
          down ... a gentle descending energy-band gradient" and for the energy
          metaphor where "each unit ends lower than it began". Each plate is
          drawn OVER the one before it, so the only visible edge is its own
          rolling top: the step IS the drop in energy, with one mechanism
          rather than three stacked layers. Each plate runs far past its own
          span so the next plate's fill is what ends it.

          THE PITCH IS CONSTANT AND THE LADDER IS THE TRACK'S, NOT THE UNIT'S,
          which is the "does not flow" half of the owner's note. A plate that
          started and stopped with its unit put a hard horizontal every time
          the banner passed; a plate every 230px puts one wherever it lands,
          and the boundary is crossed by whichever plate happens to straddle
          it. Nothing about the unit is lost: terraceProfile still reads the
          unit index, so the SKYLINE changes character at the boundary while
          the ladder carrying it does not stop.

          THE RIDGE IS DRAWN INSIDE THIS LOOP, immediately after the plate its
          summit stands in, and terrain.ts's Ridge comment explains why it
          cannot be a layer of its own: every plate's body runs 600px past its
          own bottom, so a silhouette drawn before all of them is painted over
          by all of them. Drawn here it rises above the NEXT plate's edge and
          is buried below it, which is the composition
          blueberry_artkit-env-backdrop draws.
        */}
        {bands.map((band) => {
          // At most one summit per plate: the ladder's pitch is well under a
          // unit's height, so two units' apexes cannot share a plate.
          const ridge = ridges.find((entry) => entry.apexY >= band.top && entry.apexY < band.bottom);
          return (
            <Fragment key={band.key}>
              <path
                className="path-terrace"
                /* The value step this plate lands on, cycling every four.
                   Adjacent plates are never the same fill, which is the whole
                   of what makes the hills read as TERRACED: the plate in front
                   is a different body from the plate behind, and the top edge
                   is the cut between them rather than a contour line ruled on
                   flat ground. Deterministic in the plate's position, never
                   random. */
                data-step={band.step}
                d={terracePath(band.top, band.bottom, width, terraceProfile(band.unitIndex, band.index))}
              />
              {ridge === undefined ? null : <path className="path-ridge" d={ridgePath(ridge, width)} />}
            </Fragment>
          );
        })}
        {/*
          THE CREST, drawn as a FILLED MOUND rather than as a dashed arc.

          A checkpoint is the activation barrier between two wells, so the
          landscape rises where the unit gate stands: that is the goals'
          energy metaphor and it is worth keeping. What is not worth keeping
          is how it was drawn. It was a 2.5px dashed brown stroke arcing
          across the page, which on a flat cream ground was the single most
          visible mark in the whole landscape and read as a contour line on a
          map, not as a hill. blueberry_artkit-env-backdrop draws its hills as
          ROUNDED FILLED SILHOUETTES stepping down, with no outline anywhere.

          It moves onto the ground layer with the terraces, so props and the
          trail pass in FRONT of the hill rather than being covered by it, and
          it is filled in the deepest terrace value so the crest reads as the
          same land the plates are cut from.
        */}
        {metrics.checkpoints.map((checkpoint) => {
          const energy = energies.find((entry) => entry.unitId === checkpoint.unitId);
          const half = channelHalfWidth(-(energy?.barrier ?? 0.5), metrics.basis, metrics.swingPx) * 1.9;
          const drop = HUMP_DROP + (energy?.barrier ?? 0.5) * 50;
          const ends = checkpoint.y + drop;
          // A quadratic's apex is halfway between its endpoints and its
          // control point, so the control sits twice as far up as the apex is
          // wanted. The mound then closes straight down past the fold.
          const control = checkpoint.y - 2 * HUMP_LIFT - drop;
          const left = metrics.centreX - half;
          const right = metrics.centreX + half;
          return (
            <path
              key={checkpoint.unitId}
              className="path-hump"
              d={`M ${left.toFixed(1)} ${(ends + 900).toFixed(1)} L ${left.toFixed(1)} ${ends.toFixed(1)} Q ${metrics.centreX.toFixed(1)} ${control.toFixed(1)}, ${right.toFixed(1)} ${ends.toFixed(1)} L ${right.toFixed(1)} ${(ends + 900).toFixed(1)} Z`}
            />
          );
        })}
        <path className="path-ground" d={groundPath(samples, geometry, -1)} />
        <path className="path-ground" d={groundPath(samples, geometry, 1)} />
      </g>

      {/*
        THE PROPS, hung off the TERRACE LADDER rather than off the units.

        This is the other half of "does not flow". Two to three props per
        230px plate, on flanks that alternate plate to plate, means the eye
        crosses the track on the way down and the arrangement never restarts
        at a banner. sceneProps.propsForBand is the whole table and it takes
        the plate's index and the unit's character, so the RHYTHM is the
        track's and the CAST is the unit's: crossing into unit 4 changes which
        watermark family stands on the flanks and how often glassware and
        weather appear, without a single new drawing.

        SIZE COMES FROM ONE PLACE. drawScale and propExtent are both in
        sceneProps, so the size a prop is drawn at and the size the keep-out
        test measures cannot drift apart. They had: the cloud was tested as 92
        wide and drawn 54, which is the "small" half of the owner's note.

        They ride at the ground's rate, unmasked: the lens lightens the
        ground, it does not erase the drawings.
      */}
      <g className="path-layer path-layer--marks">
        {bands.flatMap((band) => {
          const character = unitCharacter(band.unitIndex);
          return propsForBand(band.index, character).map((placement, slot) => {
            const extent = propExtent(placement);
            // The margin is the prop's OWN half width plus a little air, so a
            // prop at the far end of a phone's narrow flank sits AT the page
            // edge rather than being cut by it.
            const point = placePropPx(placement, frame, band.top, band.bottom, extent.w + PROP_EDGE_PX);
            const key = `${band.key}-${slot}`;
            // Composed, never scattered: a prop that would land on reading is
            // never drawn, and the one FILLED prop also keeps off the chips.
            // See propClear for why an outlined watermark may pass behind one.
            /*
              WHAT A PROP MUST CLEAR, and it is not the same list for all of
              them, because the reasons are not the same.

              THE TRAIL IS ABSOLUTE FOR EVERY PROP. Pixel verdict of
              2026-09-04: "keep watermarks OFF the trail; one currently sits
              directly under it". The ribbon is a LINE OVER the ground, not a
              surface: a skeleton under it shows either side and reads as a
              smudge on the road. This rule is new; nothing said it before.

              A FILLED PROP additionally clears the chips and the reading.
              Two stickers meeting is a collision whichever is on top, and a
              white cloud behind a chip reads as a rendering fault.

              AN OUTLINED WATERMARK MAY PASS BEHIND OPAQUE THINGS, and the
              name cards are opaque: `background: var(--bb-card)` with no alpha.
              So is a chip. The old rule kept watermarks off the CARDS as well
              as the trail, and the reason recorded for it does not survive
              contact with an opaque card: terrain.ts's worry is that "an SVG
              mark under a text box is not that box's ancestor, so a pair the
              audit reports as passing could be composed on something else",
              which is a hazard only where the text sits on the MARK. Text on
              an opaque card is composed on the card, and the card's own
              contrast is measured where it is composed.

              It is also what starved the landscape, and that was measured:
              with the cards in every outlined prop's keep-out list, a 390pt
              phone frame carried TWO props. The reference frame carries a
              gate, two clouds, two flasks, three skeletons and boulders. A
              phone that draws a full-width winding column and a card on every
              node has no open ground left to be strict with.
            */
            const filled = placement.kind === "cloud" || placement.kind === "boulder";
            const keepOut = filled
              ? [...metrics.keepOutText, ...metrics.keepOutTrail, ...metrics.keepOutChips]
              : metrics.keepOutTrail;
            if (!propClear(placement, point, keepOut, filled ? FILLED_CLEARANCE_PX : PROP_CLEARANCE_PX)) return null;
            const scale = drawScale(placement);
            if (placement.kind === "cloud") return <CloudMark key={key} x={point.x} y={point.y} scale={scale} />;
            if (placement.kind === "boulder") return <BoulderMark key={key} x={point.x} y={point.y} scale={scale} />;
            return <Flask key={key} x={point.x} y={point.y} scale={scale} />;
          });
        })}
      </g>
      <g className="path-layer path-layer--paper">
        {/*
          THE WHITE CHANNEL AND ITS TWO BOUNDARY RULES ARE GONE, and their
          going is the biggest single change in this pass.
          `.path-channel` was `fill: var(--bb-card)`, which the warm cream regime
          resolves to #ffffff: the paper the entire track was printed on was
          PURE WHITE on a cream page, edged with a hard 2px slate rule each
          side, so the tab read as a white document taped onto cream with two
          vertical rules the committed reference has nowhere. The critic
          measured it live at 390px (body rgb(251,243,230), channel
          rgb(255,255,255), cream surviving only in ~25px flanks) and every
          layer below (15 terraces, 23 marks, 2 grounds, 2 props) was painted
          and then covered by it.

          The channel was not a mistake when it was written: under the lavender
          turn the page ground was #a3aee2 and body copy genuinely could not
          sit on it, so a cream strip under the labels was load bearing. The
          warm cream regime (DESIGN-TOKENS.md, Supersession 2026-09-01) makes
          the PAGE the cream, so every ink on this track was already derived
          against the surface it now sits on, and the strip has nothing left to
          do but hide the landscape. terrain.ts keeps channelPath and
          boundaryPath, and their tests keep passing, because the geometry was
          never the thing that was wrong.
        */}
        {/*
          The hump. A checkpoint is the activation barrier between two wells, so
          it is drawn as the crest the path has to climb over: an arc across the
          channel at the unit's own centre, in the ground's ink.

          It spans WIDER than the channel and rises well above the strip, because
          the first build tucked it inside the channel at the unit centre and the
          checkpoint panel painted straight over it. The crest is now the thing
          the chips sit on.
        */}
      </g>

      {/*
        THE TRAIL HAS LEFT THIS FILE, owner bug of 2026-09-04, reported twice:
        "every time I scroll the path lags behind the buttons."

        It was drawn here, on a sticky viewport-sized surface, and re-placed
        every frame from a scroll listener. The compositor scrolls the chips
        on its own thread and a scroll callback repaints after it, so the
        ribbon was AT LEAST ONE FRAME BEHIND BY CONSTRUCTION. That is not a
        number anyone can tune: scroll-linked JavaScript repaint cannot beat
        compositor scrolling.

        It now lives in the unit sections, in the same scrolling layer as the
        chips it connects, one small SVG per unit rather than one 14500px
        layer (the S2 round recorded what a full-height layer does to the
        renderer). See UnitTrail.tsx. The layers that remain in this file are
        BACKGROUND, and a background is allowed to lag.
      */}
      {/*
        THE PER-CHECKPOINT FLASK LAYER IS GONE, folded into the placement
        table above. It was the only prop in the scene placed by a rule of its
        own ("one every three units, beside the checkpoint panel"), which is
        precisely the scatter the BACKGROUND DOCTRINE names: two placement
        systems in one landscape cannot compose, because neither knows what
        the other drew. There is one table now, and glassware is in it.
      */}

      {/*
        THE VAPOUR LAYER IS GONE AND ITS LENS MOVED DOWN ONE.

        The fog existed to sit on the hillsides and be parted where the student
        was looking. There are no hillsides any more, only a shade beside the
        paper, so a second copy of that shape with a wash on it would be a layer
        with no host. The lens now masks the shade itself, which is the same
        effect with one layer instead of two: the ground lightens around the
        pointer and around the node the student is meant to tap next, and touch
        still gets the anchored hole because touch has no hover.
      */}
      </g>
      </>
      )}
    </svg>
  );
}
