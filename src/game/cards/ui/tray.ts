/**
 * The deck tray's logic, with no React in it. Read this header before
 * trusting anything in this file.
 *
 * THE COMMITTED IMAGE IS blueberry_r6-deck-tray in docs/reference/design-goals:
 * named reaction cards fanned in an arc, each carrying a skeletal structure
 * above its name and its mastery dots below, over a violet tray labelled with
 * the count and the deck's name. This file computes the fan's geometry and the
 * words on it; DeckTray.tsx owns the pixels. Split so a test can ask "is the
 * fan symmetric" without a DOM.
 *
 * THE FAN IS A HAND OF CARDS, and its geometry follows from that reading:
 * slots spread symmetrically around a straight centre, tilting outward and
 * sinking toward the edges, the way fingers hold them.
 *
 * THE HAND FITS THE PHONE BY ARITHMETIC, NOT BY HOPE. fanLayout takes the
 * CONTAINER width, works in px, and solves for the step: the outermost card's
 * rotated half width (width times cos plus height times sin, over two, the
 * exact horizontal bounding box of a rectangle rotated about its centre) plus
 * its offset must sit inside half the container minus a gutter. Rotation is
 * about the card's CENTRE so that bound is the true extent; the arc's droop is
 * an explicit translateY instead of a low transform origin.
 *
 * THE SECOND FLOOR, ADDED AFTER THE ROUND 2 CRITIC, AND IT IS THE POINT OF
 * THIS FILE. The fit solve above is a CEILING and nothing was a floor, so a
 * seven card hand on a 390px phone legally squeezed to a 22 to 28px step
 * against a 112px card: the arc fitted, and five of its six names were
 * occluded to a tenth of themselves. The critic measured 10 to 14 percent of
 * each name visible and one name readable, where the committed image reads
 * six. A fan whose names cannot be read is not "named reaction cards fanned".
 *
 * So the step now also has a MINIMUM, and the minimum is derived rather than
 * picked. Card i is overlapped from the RIGHT only (z-index rises with index,
 * so its left neighbour sits under it), which makes card i's visible band
 *
 *     [centre - W/2, centre - W/2 + step]
 *
 * and the centred name box is [centre - S/2, centre + S/2]. The band contains
 * the name exactly when S <= W (the name fits the card at all) and
 *
 *     step >= (W + S) / 2                          the FAN name floor
 *
 * which is `fanNameFloor()` below and is what `fanCapacity` solves for. When a
 * container cannot pay that price for FAN_MAX cards it is DEALT FEWER, which
 * is the honest trade: the tray label still carries the true count and the
 * tray itself is what runs the whole deck. Measured capacities, from the test:
 * 4 cards at 320px, 5 at the 390px reference phone, 6 at the 448px column cap.
 *
 * S IS THE CONTENT BOX, NOT THE CARD. The round 2 build read "the name fits
 * the card at all" as S <= FAN_CARD_W and set S = FAN_CARD_W exactly, but
 * FAN_CARD_W is the BORDER box: the painted card also spent a 2px border and
 * 4px of padding a side, so the label's real box was 56px against a 68px
 * bound, and the critic measured three names overflowing onto their
 * neighbours by 5 to 7px each. FAN_NAME_STRIP is derived from the chrome
 * constants now (see them below), so the stated bound IS the painted bound
 * and a later change to the padding moves both at once.
 *
 * WHY NOT SIX AT 390. Six names across 390px leaves 56.9px of step, against a
 * 68px floor. Getting six would mean a 44px label budget, and "Williamson"
 * measures 63.10px at the 12px bold caption size DESIGN-TOKENS gives this
 * type, so six names at 390 means six cut names. The committed image gets six
 * by letting its labels overhang their cards, which is the reference cheating
 * and is not copied. Five whole names is the honest number at that width, and
 * the arithmetic that says so is above rather than hidden in a magic constant.
 *
 * THE NAME ON A CARD is one line. A composed reaction card's name is its
 * setup, because that is the side the student would recognise it by; any
 * other card goes by its front. Both are truncated on a word boundary where
 * one exists, because a fanned card is a spine label, not the reading copy.
 *
 * Pure: no storage, no clock, no React. The container width arrives as an
 * argument; DeckTray measures it and re-lays-out when the phone rotates.
 */

import type { Card } from "../types";

/** The ceiling on how many cards the fan ever deals. `fanCapacity` lowers it. */
export const FAN_MAX = 7;

/**
 * One fanned card's box, in px. DeckTray sets the element's width and height
 * FROM THESE CONSTANTS rather than from Tailwind classes, so the geometry and
 * the paint cannot drift apart at all; the previous build guarded that pairing
 * with a test instead, which only catches drift after someone commits it.
 */
export const FAN_CARD_W = 72;
export const FAN_CARD_H = 100;

/**
 * THE CARD'S OWN CHROME, IN PX, AND WHY IT HAS TO BE A CONSTANT. The round 2
 * build set FAN_NAME_STRIP equal to FAN_CARD_W and then painted the card with
 * a 2px border and 4px of horizontal padding a side, so the box the name
 * actually had was 12px narrower than the bound this file was solving
 * against. The critic measured the consequence in the running build: three
 * names painting 61 to 63px into a 56px content box and bleeding across their
 * own card edges onto the neighbours.
 *
 * So the chrome is declared, the strip is DERIVED from it, and a test holds
 * the pair together. The border is zero now because the committed image draws
 * the fanned cards borderless (cards.css says why); it stays a named constant
 * rather than being dropped, because the next hand that adds an edge back has
 * to see what that costs the name.
 */
export const FAN_CARD_BORDER = 0;
export const FAN_CARD_PAD_X = 4;

/** Per-card tilt cap in degrees, and the whole hand's tilt span. */
export const FAN_ROT_MAX = 12;
export const FAN_ROT_SPAN = 36;

/**
 * THE STEP CAP IS AN OVERLAP RULE NOW, and it is the round 4 fix for the
 * defect the critic put first: "five cards spread with clear daylight between
 * Grignard, SN2, Williamson and Ozonolysis... the hand does not read as one
 * hand". At 76 against a 72px card the step was WIDER than the card, so a
 * five card hand at 390px settled on 71.1px of step and the cards touched
 * without ever overlapping.
 *
 * The committed image is a hand, and a hand overlaps. Measured off
 * blueberry_r6-deck-tray at 4x: its cards are 100 image pixels wide and step
 * 78, so each one covers 22 percent of the one behind it. FAN_OVERLAP is that
 * ratio and the cap is derived from it, so the hand is tight at every width
 * rather than only at the ones where the fit solve happens to bite.
 */
export const FAN_OVERLAP = 0.22;
export const FAN_X_STEP_MAX = Math.round(FAN_CARD_W * (1 - FAN_OVERLAP));

/**
 * HOW FAR A NAME MAY PAINT PAST ITS OWN CARD, px, and this is what buys the
 * overlap without giving up a readable name.
 *
 * The round 3 floor was step >= (W + S) / 2, which is the bound for a name
 * CENTRED on its card: the neighbour covers the card's right side, so half
 * the name has to fit in the step. That is 68px against a 72px card, and it
 * is why the hand could not overlap at all.
 *
 * The committed image's names are not centred on their cards; they overhang,
 * and `fanNameShift` below is that drawn fact turned into arithmetic. Shift
 * the label left into the band the neighbour leaves and the bound becomes
 *
 *     step >= S - O
 *
 * so the name is still WHOLLY visible, which is the guarantee round 3 added
 * and this does not give back. At S = 64 and O = 12 the floor is 52 against a
 * 56 step, and the dealt capacity rises from five to SIX at the reference
 * phone, which is the count the image draws.
 *
 * cards.css gives .fan__name `overflow: visible`, so the paint follows the
 * arithmetic. 12px is a sixth of the card and is what the image's own labels
 * overhang by; more would put a name over its neighbour's structure.
 */
export const FAN_NAME_OVERHANG = 12;

/** Breathing room between the outermost card's extent and the frame, px. */
export const FAN_EDGE_GUTTER = 4;

/**
 * The width budget a fanned card's NAME gets, px, and the reason the fan deals
 * fewer cards on a narrow phone. Every title is cut to fit it (`trayTitle`),
 * so it is a real bound on the painted label rather than a hope about one.
 *
 * IT IS THE CARD'S CONTENT BOX AND NOTHING ELSE. This is the round 2 defect
 * repaired at its source: the strip was set equal to FAN_CARD_W, which is the
 * BORDER box, so the file's stated bound was 12px wider than the box the
 * browser gave the label. Deriving it means the stated bound and the painted
 * bound cannot drift again, whatever a later hand does to the padding.
 *
 * The number that comes out, 64px, still clears everything the fan is held to:
 * the widest name the committed image draws is "Williamson" at 63.10px, the
 * step a hand of five gets at the 390px reference phone is 71.1px against a
 * 68px floor, and a hand of six at the 448px column cap gets 68.5px. So the
 * dealt capacities are unchanged at 4 / 5 / 6, and every name in the image
 * now fits its card whole rather than overflowing it by 5 to 7px.
 */
export const FAN_NAME_STRIP = FAN_CARD_W - 2 * FAN_CARD_BORDER - 2 * FAN_CARD_PAD_X;

/**
 * ADVANCE WIDTHS AT 12px BOLD IN THE SYSTEM STACK, px, MEASURED IN THE REAL
 * BUILD rather than estimated. A character-count cap cannot bound a pixel
 * width in a proportional face: at this size "i" is 3.42px and "W" is
 * 12.06px, so an eleven character cap admits labels between 38px and 133px,
 * and the round 2 build's fan overflowed its own strip by exactly that
 * mistake. These are getBoundingClientRect widths of one glyph each, rendered
 * with .fan__name's own classes in a built page; the sum reproduces measured
 * strings to better than half a percent ("Diels-Alder" 62.92 computed against
 * 62.84 measured, "cyclopenten…" 79.38 against 79.13).
 *
 * The font is the system stack, so these are Segoe UI Bold's metrics on the
 * reference machine and will differ by a few percent on SF or Roboto. That is
 * why FAN_NAME_STRIP keeps margin rather than sitting on the exact step, and
 * why the ellipsis (10.95px, the widest non-letter here) is counted in full.
 */
const GLYPH_PX: Readonly<Record<string, number>> = Object.freeze({
  a: 6.47, b: 7.45, c: 5.77, d: 7.44, e: 6.5, f: 4.61, g: 7.44, h: 7.23,
  i: 3.42, j: 3.42, k: 6.72, l: 3.42, m: 11, n: 7.27, o: 7.34, p: 7.45,
  q: 7.44, r: 4.78, s: 5.28, t: 4.67, u: 7.27, v: 6.52, w: 9.58, x: 6.64,
  y: 6.47, z: 5.75,
  A: 8.44, B: 7.7, C: 7.5, D: 8.86, E: 6.39, F: 6.25, G: 8.53, H: 9.2,
  I: 3.81, J: 5.34, K: 7.8, L: 6.14, M: 11.48, N: 9.48, O: 9.11, P: 7.38,
  Q: 9.11, R: 7.84, S: 6.73, T: 7.03, U: 8.69, V: 8.02, W: 12.06, X: 7.88,
  Y: 7.3, Z: 7.3,
  "0": 6.91, "1": 6.91, "2": 6.91, "3": 6.91, "4": 6.91,
  "5": 6.91, "6": 6.91, "7": 6.91, "8": 6.91, "9": 6.91,
  " ": 3.28, ".": 3.27, ",": 3.27, "-": 4.86, "+": 8.48, "(": 4.44,
  ")": 4.44, "[": 4.44, "]": 4.44, "/": 5.33, ":": 3.27, ";": 3.27,
  "’": 3.48, "…": 10.95, "%": 10.41,
});

/** What an unmeasured character is charged. The digit width, a safe middle. */
const GLYPH_FALLBACK = 6.91;

/** The ellipsis a cut name ends with, and it is the widest mark in the table. */
const ELLIPSIS = "…";

/** How wide `text` paints on a fanned card, px. See GLYPH_PX. */
export function nameWidthPx(text: string): number {
  let width = 0;
  for (const ch of text) width += GLYPH_PX[ch] ?? GLYPH_FALLBACK;
  return width;
}

/** The width the layout assumes when nothing has measured yet: the reference
    phone. A first paint laid out for 390 then corrected by a measurement is
    right on the reference device and close everywhere else. */
export const FAN_REFERENCE_WIDTH = 390;

/**
 * How steeply the hand droops toward its edges, px per slot squared.
 *
 * 4, DOWN FROM ROUND 3's 22, and the correction is the critic's: "a much
 * deeper arc, and a large empty void between the lifted card's bottom edge
 * and the arc below it". Round 3 raised the droop from 6 to 22 to fill the
 * scene's vertical space, which filled it with a hole: at 22 a hand of five
 * put its centre card 88px above its outermost, so the lifted card cleared an
 * arc that had already fallen away beneath it.
 *
 * The committed image's arc is SHALLOW. Measured off it at 4x, the five
 * resting cards' tops span 30 image pixels top to bottom, which is 22 CSS px
 * across the whole hand; at 4 a hand of six spans 25, which is that shape.
 *
 * The height the round 3 note wanted is real and it is paid for correctly
 * now: FAN_LIFT below raises the chosen card most of its own height, so the
 * fan's drawn extent is 247px rather than 188, and the picture's tall half is
 * the raised card the frame is about rather than a gap in the middle of the
 * hand.
 */
export const FAN_DROOP_RATE = 4;

/**
 * HOW FAR THE CHOSEN CARD RISES, px, and it is the number that closes the
 * void the critic measured.
 *
 * In blueberry_r6-deck-tray the raised card runs CSS y 171..307 and the arc's
 * highest resting tops are at 303, so its bottom edge sits FOUR pixels below
 * them: the raised card overlaps the top of the arc and the six read as one
 * hand with one card pulled out of it, not as a card floating over a fan.
 *
 * Solved against that, at the scale the fan is actually built: the chosen
 * card is the middle one and sits at the drooped y of -25, the cards either
 * side of it top out at -24, and the lift scales the card about its centre so
 * its painted bottom is y + H + H*(scale-1)/2. Setting that 5px below -24
 * gives 108. cards.css's .fan__card--lifted carries the same number and says
 * so; a test pins the pair together.
 */
export const FAN_LIFT = 108;
export const FAN_LIFT_SCALE = 1.28;

export interface FanSlot {
  /** translateX from the fan's centre, px. Negative is left. */
  readonly x: number;
  /** translateY, px. Zero at the hand's edges, negative (raised) mid-hand. */
  readonly y: number;
  /** Rotation about the card's centre, degrees. Negative is anticlockwise. */
  readonly rot: number;
}

/**
 * Half the horizontal bounding box of the card rotated by `rotDeg` about its
 * centre. This is the exact extent, not an estimate, which is what lets the
 * fit be an inequality a test can hold a ruler to.
 */
export function rotatedHalfWidth(rotDeg: number): number {
  const theta = (Math.abs(rotDeg) * Math.PI) / 180;
  return (FAN_CARD_W * Math.cos(theta) + FAN_CARD_H * Math.sin(theta)) / 2;
}

/**
 * The smallest step at which a fanned card's whole name is still visible past
 * the card stacked on top of it. Derived in the header; not a taste value.
 */
export function fanNameFloor(): number {
  return FAN_NAME_STRIP - FAN_NAME_OVERHANG;
}

/**
 * How far card `index`'s NAME is shifted left of its own centre, px.
 *
 * Card i is overlapped from the RIGHT only (z-index rises with index, so the
 * right neighbour sits on top), which leaves it a visible band of `step` at
 * its left edge. A name centred on the card spills half of itself into the
 * covered half. Shifting it into the band is what makes a tight hand legible,
 * and it is what the committed image draws: its labels sit left of centre and
 * overhang their cards' left edges.
 *
 * The shift is the smallest that clears the neighbour, so a hand with room to
 * spare keeps its names centred and only a tight one moves them. The TOP card
 * has nothing over it and never shifts.
 */
export function fanNameShift(count: number, index: number, containerWidth: number = FAN_REFERENCE_WIDTH): number {
  if (index >= count - 1) return 0;
  const step = fanStep(count, containerWidth);
  const needed = FAN_NAME_STRIP / 2 + FAN_CARD_W / 2 - step;
  const room = FAN_CARD_W / 2 + FAN_NAME_OVERHANG - FAN_NAME_STRIP / 2;
  return Math.max(0, Math.min(needed, room));
}

/** The outermost card's tilt for a hand of `count`. Shared by step and layout. */
function outerRotation(count: number): number {
  if (count <= 1) return 0;
  return Math.min(FAN_ROT_MAX, FAN_ROT_SPAN / (count - 1)) * ((count - 1) / 2);
}

/**
 * The horizontal step a hand of `count` gets inside `containerWidth`: the fit
 * ceiling from the header's solve, capped again at FAN_X_STEP_MAX so a hand of
 * two does not sprawl. Non-increasing in `count`, which is what lets
 * fanCapacity stop at the first size that clears the floor.
 */
export function fanStep(count: number, containerWidth: number): number {
  if (count <= 1) return 0;
  const half = (count - 1) / 2;
  const room = containerWidth / 2 - FAN_EDGE_GUTTER - rotatedHalfWidth(outerRotation(count));
  return Math.min(FAN_X_STEP_MAX, Math.max(0, room) / half);
}

/**
 * How many cards this width can deal and still have every name readable: the
 * largest hand whose step clears `fanNameFloor()`. One card always fits, since
 * a lone card is not overlapped by anything.
 */
export function fanCapacity(containerWidth: number = FAN_REFERENCE_WIDTH): number {
  const floor = fanNameFloor();
  for (let count = FAN_MAX; count > 1; count -= 1) {
    if (fanStep(count, containerWidth) >= floor) return count;
  }
  return 1;
}

/**
 * Where card `index` of `count` sits inside `containerWidth`. Symmetric by
 * construction: slot i is the mirror of slot count-1-i, and an odd hand's
 * middle card is dead centre, upright, and highest, which is what makes the
 * arc read as held rather than strewn. The outermost card's extent fits the
 * container by the solve in the header; every inner card has both a smaller
 * offset and a shallower tilt, so it fits a fortiori.
 */
export function fanLayout(
  count: number,
  index: number,
  containerWidth: number = FAN_REFERENCE_WIDTH,
): FanSlot {
  if (count <= 1) return { x: 0, y: 0, rot: 0 };
  const half = (count - 1) / 2;
  const offset = index - half;
  const rotStep = Math.min(FAN_ROT_MAX, FAN_ROT_SPAN / (count - 1));

  return {
    x: offset * fanStep(count, containerWidth),
    y: -FAN_DROOP_RATE * (half * half - offset * offset),
    rot: offset * rotStep,
  };
}

/**
 * The hand: the deck's first cards, in its own order, capped by BOTH the
 * ceiling and the width's legibility capacity. The second cap is the round 2
 * fix: a narrow phone deals fewer cards rather than dealing seven unreadable
 * ones.
 */
export function fanCards(
  cards: readonly Card[],
  containerWidth: number = FAN_REFERENCE_WIDTH,
): readonly Card[] {
  return cards.slice(0, Math.min(FAN_MAX, fanCapacity(containerWidth)));
}

/**
 * The one-line name a fanned card carries, cut to FAN_NAME_STRIP. See the
 * header for whose text it takes, and GLYPH_PX for why the cut is by width
 * rather than by character count.
 *
 * A cut prefers a WORD BOUNDARY, but only one that keeps at least half the
 * budget: "Which carbon does..." becomes "Which…" rather than "Which car…",
 * while a long single word is cut mid-word rather than thrown away entirely.
 */
export function trayTitle(card: Card): string {
  const name = (card.sides !== undefined ? card.sides.setup : card.front).trim();
  if (nameWidthPx(name) <= FAN_NAME_STRIP) return name;

  const budget = FAN_NAME_STRIP - nameWidthPx(ELLIPSIS);
  let width = 0;
  let cut = 0;
  for (const ch of name) {
    const next = width + (GLYPH_PX[ch] ?? GLYPH_FALLBACK);
    if (next > budget) break;
    width = next;
    cut += ch.length;
  }
  const prefix = name.slice(0, cut);
  const lastSpace = prefix.lastIndexOf(" ");
  const word = lastSpace > 0 && nameWidthPx(prefix.slice(0, lastSpace)) >= budget / 2
    ? prefix.slice(0, lastSpace)
    : prefix;
  return `${word.trimEnd()}${ELLIPSIS}`;
}

/** The violet tray's label, exactly the committed image's shape: "24 · Name". */
export function trayLabel(count: number, deckTitle: string): string {
  return `${count} · ${deckTitle}`;
}

/* ------------------------------------------------------------------ */
/* The tray, as geometry                                                */
/* ------------------------------------------------------------------ */

/**
 * THE OPEN BOX, IN ONE COORDINATE SPACE, and round 4 is where it stopped
 * being a pile of absolutely positioned divs.
 *
 * WHAT WAS WRONG. Round 3 built the tray from HTML boxes: an outer div, two
 * dark rectangles for the interior, six spans for the deck, and a front panel
 * masked with a radial gradient to make the thumb notch. Three defects
 * followed from the construction rather than from the numbers, and the round 3
 * critic measured all three:
 *
 *   - the notch mask was an ELLIPSE, so what showed through it was a convex
 *     cream bulge hanging down over the violet. The committed image draws a
 *     shallow dip with a FLAT bottom and rounded shoulders, and the deck reads
 *     as standing behind it rather than as a slab lying on top of it
 *   - the interior was two hard-edged rectangles with square inner corners
 *     flanking the stack, where the image has one continuous dark cavity
 *   - the lighter top lip appeared only as two stubs at the far left and far
 *     right, because a 5px band across the top of a div is interrupted by
 *     anything standing in front of it. The image's lip runs unbroken from the
 *     left corner to the right and dips at the centre front
 *
 * A drawing is what fixes all three at once, so the tray is one SVG in this
 * viewBox and every number it needs is here rather than in the component, for
 * the same reason the scene's placement table is: a test can hold a ruler to
 * a table and cannot hold one to a JSX literal.
 *
 * THE NUMBERS ARE THE IMAGE'S, converted once. blueberry_r6-deck-tray is
 * 768px wide; its phone screen spans 540 of those and 1147 vertically, which
 * is a 390 by 844 viewport, so one image pixel is 1/1.359 CSS px. Sampling the
 * tray at 4x, in image pixels: the box runs x 189..590 and y 842..1030 with a
 * 25px slab under it, the front panel's shoulder is at y 914 and its notch
 * bottoms at 946 between x 315 and 475, and the standing deck runs x 240..527
 * with its front card's head at 829 and the backmost at 745. Subtracting the
 * box's own origin (189, 745) gives the table below exactly.
 *
 * THE ONE RATIO WORTH STATING. The front panel's shoulder is at 169 and the
 * front card runs 84..272, so 85 of its 188 units stand above the panel and
 * 103 are hidden behind it: the deck shows a little under half of itself, and
 * the critic's reading of the image ("only the cards' upper 40 percent shows
 * above the rim") is what the arithmetic reproduces. test/deckTray.test.ts
 * asserts it, so a later hand cannot lift the deck back out of the box.
 */
export const TRAY_ART = Object.freeze({
  /** The viewBox. One unit is one image pixel of the committed drawing. */
  width: 401,
  height: 310,
  /** The cup: its back rim, its foot, and the foot of the slab beneath it. */
  boxTop: 97,
  boxFoot: 285,
  slabFoot: 310,
  /** How far the interior is inset from the outer wall. The lit strip either
      side of the deck IS this thickness seen from in front. */
  wall: 30,
  /** The front panel: its shoulder, and the flat-bottomed dip in it. */
  shoulder: 169,
  notchBottom: 201,
  notchLeft: 126,
  notchRight: 286,
  /** Where the notch's fillet leaves the shoulder line, each side. */
  notchShoulderLeft: 100,
  notchShoulderRight: 312,
  /** How thick the lit lip is along every top surface. */
  lip: 8,
  /** The standing deck: the front card's box, and the step to the one behind. */
  cardLeft: 57,
  cardWidth: 287,
  cardTop: 84,
  cardFoot: 272,
  cardRise: 16.8,
  cardShift: 5,
  cardNarrow: 2,
});

export interface TrayCardBox {
  readonly x: number;
  readonly y: number;
  readonly w: number;
  readonly h: number;
}

/**
 * Card `index` of the standing deck, 0 being the FRONT one. Each card behind
 * is a little higher, a little narrower and a little further right, which is
 * a deck seen from slightly above and in front: what the eye gets is a
 * staircase of top edges climbing out of the tray with the full face of the
 * front card beneath them.
 */
export function trayCard(index: number): TrayCardBox {
  const y = TRAY_ART.cardTop - index * TRAY_ART.cardRise;
  return {
    x: TRAY_ART.cardLeft + index * TRAY_ART.cardShift,
    y,
    w: TRAY_ART.cardWidth - index * TRAY_ART.cardNarrow,
    h: TRAY_ART.cardFoot - y,
  };
}

/** How much of the front card stands above the front panel, as a fraction. */
export function trayDeckExposure(): number {
  const front = trayCard(0);
  return (TRAY_ART.shoulder - front.y) / front.h;
}
