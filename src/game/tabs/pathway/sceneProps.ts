/**
 * THE ENVIRONMENT'S PLACEMENT TABLE. Pure: no React, no DOM, no randomness.
 *
 * docs/DESIGN-GOALS.md, BACKGROUND DOCTRINE (owner direction 2026-09-02):
 * "the environment is COMPOSED, never scattered. The committed art kit
 * (env-backdrop, prop-sheet, unit-strip in design-goals/) is the reference;
 * props are placed by a deterministic per-unit placement table, and the
 * preferred implementation is SVG traced from the prop sheet (tiny,
 * theme-aware, budget-safe) ... Random per-route scatter of icons or
 * molecules is a defect a critic names."
 *
 * So this file is that table, and it is the whole of the placement logic.
 * PathScene draws SVG props (PathScene.tsx's Flask, CloudMark, MoleculeMark),
 * this says WHERE and HOW BIG, and nothing anywhere calls Math.random.
 *
 * WHAT CHANGED ON 2026-09-04, and it is the owner's note in two halves: "the
 * background is small and does not flow well".
 *
 * SMALL was literal. The props were drawn at their prop-sheet proportions and
 * then placed in a viewport-wide scene, so a flask was 35 by 40 device pixels
 * on a 390pt phone where blueberry_artkit-env-backdrop draws it at about 55 by
 * 62 in the same frame. Sizes are now declared once, here, as the drawn half
 * extent times a per-kind draw scale, and both the renderer and the keep-out
 * test read the same two numbers, so a prop cannot be drawn at one size and
 * tested at another. That mismatch was real: the cloud was tested as 92 wide
 * and drawn 54.
 *
 * DOES NOT FLOW was structural. Placements used to be fractions of a UNIT's
 * own span, so the whole composition restarted at every unit boundary: a unit
 * was a strip with its own beginning and end, which is exactly what the owner
 * saw. They are fractions of a TERRACE BAND now, and terrain.ts lays the bands
 * at one constant pitch down the whole track, so the rhythm crosses unit
 * boundaries without a seam. What the unit still decides is its CHARACTER:
 * which watermark family stands on its flanks, how often glassware and weather
 * appear, and which side it opens on. Crossing into unit 4 changes all four
 * without a single new drawing.
 *
 * COORDINATES ARE RELATIVE TO THE TRACK COLUMN, not to the scene, and that is
 * the other correction. `x` used to be a fraction of the viewport, and the
 * viewport is not where the track is: on a desktop the column sits to the
 * right of the navigation rail, so every placement at 0.10 of the scene landed
 * under the rail and was never seen, while on a 390pt phone the same 0.10 was
 * on top of the chips. A placement now says WHICH SIDE of the column it stands
 * on and HOW FAR OUT toward the page edge, and placePropPx turns that into
 * pixels against the measured column. One table, right on both devices.
 */

/*
 * THE PROP FAMILY, renamed against blueberry_artkit-prop-sheet.
 *
 * "benzene" was an honest name for what the build drew and a wrong name for
 * what the reference draws. The committed backdrop's watermarks are multi-ring
 * SKELETONS with heteroatoms (a fused bicycle with a ring nitrogen, an aryl
 * amide), and the prop sheet's molecule row is a fused tricycle beside a
 * substituted ring. A single empty hexagon is not that, and a critic said so.
 *
 *   ring    a fused bicycle with a ring nitrogen, the quinoline-shaped
 *           watermark the backdrop puts at the top right of its sky
 *   amide   ring, carbonyl, N-H, second ring: the aryl amide low on the
 *           backdrop's second terrace
 *   chain   the prop sheet's zigzag chevron, a carbon chain drawn small and
 *           flat. It is on the sheet, so it stays; what it is not is the
 *           two-peak mountain the build drew it as
 *
 * BOULDERS, added 2026-09-04 on the pixel verdict: the reference "fits nine
 * nodes, eight labels, two clouds, two full-body mascots, two flasks, three
 * skeletons, BOULDERS and a gate into one frame" and the build had none. They
 * are the one prop in the family that is a solid OBJECT sitting on the land
 * rather than a drawing on it, which is why they are a cool grey and not a
 * tan: sampled off unit01-path.jpg, the reference boulder is #a5a5a4 against
 * an #e1d9ca ground, a luminance delta of 53 and 1.76:1.
 *
 * NO FLAG. docs/DESIGN-GOALS.md, owner 2026-09-03: "the small flag on a pole
 * reads as a destination and competes with the real nodes. Cut from the prop
 * family." unit01-path.jpg still draws one beside its boulders and it is NOT
 * copied: the clause is newer than the image. Named here so nobody re-adds it
 * as an oversight.
 */
/**
 * OWNER RULING 2026-09-05: the molecule watermarks are gone.
 *
 * "remove all molecules in the background of the pathway. none of them look
 * good. the bonds are wack and I don't even know if it fits very well."
 *
 * Three kinds went with it, ring, amide and chain, along with the MoleculeMark
 * that drew them, their size and scale rows, and their stylesheet. They are
 * REMOVED rather than left unplaced, because an unplaced component is exactly
 * the `trace` situation recorded in beats/types.ts: finished code nothing
 * reaches, which reads as shipped in every count that does not check.
 *
 * The landscape is thinner for it, and that is a real cost rather than a
 * neutral one: the density argument in propsForBand below was answering a
 * pixel verdict that the reference "fits nine nodes, eight labels, two clouds
 * ... three skeletons" into one frame and ours had "eight nodes and then
 * nothing". Two of the props per band were skeletons. Redrawing them is a new
 * design against the prop sheet, not a revert of this.
 */
export type PropKind = "cloud" | "flask" | "boulder";

/** The molecule watermarks, which are the props a unit's character selects. */

export interface PropPlacement {
  readonly kind: PropKind;
  /** Which flank of the track column it stands on: -1 left, 1 right. */
  readonly side: -1 | 1;
  /**
   * How far out from the column's edge, 0 at the edge and 1 at the page's.
   *
   * A fraction of the ROOM rather than of the page, because the room is what
   * differs between devices: a desktop has 300px of it beside the column and a
   * phone has about 30, and a prop should stand in the middle of whatever
   * there is rather than at a fixed pixel offset that is a margin on one and
   * off-screen on the other.
   */
  readonly out: number;
  /** Fraction of the terrace band's own height, 0 at its top. */
  readonly y: number;
  /** Drawn size, relative to the prop's own natural size. */
  readonly scale: number;
}

/**
 * THE DRAWN HALF EXTENT of each prop at scale 1, in SVG units.
 *
 * These are measured off the path data in PathScene, not guessed: the cloud
 * path spans -26..28 across and -22..8 down, the fused bicycle spans -44..44,
 * and so on. They exist so the keep-out test and the renderer agree; see the
 * header for the 92-tested / 54-drawn cloud this replaces.
 */
export const PROP_HALF: Record<PropKind, { readonly w: number; readonly h: number }> = {
  cloud: { w: 27, h: 15 },
  flask: { w: 14, h: 17 },
  // Two pebbles, the larger in front: the path data spans -22..22 across and
  // -13..9 down, which is the low wide silhouette the reference draws.
  boulder: { w: 22, h: 11 },
};

/**
 * How much bigger than its natural size each prop is drawn.
 *
 * The owner's "small" measured against blueberry_artkit-env-backdrop and the
 * per-unit designs, where a flask is roughly a seventh of the phone's width
 * and a molecule watermark roughly a quarter of it. At scale 1 the flask was a
 * fourteenth. These numbers are the ratio between the two, rounded.
 */
export const PROP_DRAW_SCALE: Record<PropKind, number> = {
  /* 1.5, down from 1.75. The cloud is the one prop whose SIZE was what made
     it undrawable: at 1.75 its half width plus the filled-prop clearance was
     a 62px keep-out radius on a flank a 390pt phone measures in tens of
     pixels, and every cloud in the scene was dropped. See PathScene's
     FILLED_CLEARANCE_PX for the other half of that fix. */
  /* 1.3, down again. The cloud is the one prop whose SIZE decides whether it
     is drawn at all: it is filled, so it must clear the chips and the trail
     outright, and on a 390pt phone a 40px half width plus its clearance
     rarely fits the flank. At 1.3 the half width is 35 and the survival rate
     roughly doubles, which is the difference between a sky and no sky. */
  cloud: 1.3,
  flask: 1.95,
  boulder: 1.5,
};

/** The size a prop is actually drawn at: its own scale times its kind's. */
export function drawScale(placement: PropPlacement): number {
  return placement.scale * PROP_DRAW_SCALE[placement.kind];
}

/** The half extent a prop occupies on the page, in scene pixels. */
export function propExtent(placement: PropPlacement): { readonly w: number; readonly h: number } {
  const half = PROP_HALF[placement.kind];
  const scale = drawScale(placement);
  return { w: half.w * scale, h: half.h * scale };
}

/**
 * What one unit's stretch of landscape is made of.
 *
 * Everything here is derived from the unit's INDEX and nothing else, so the
 * fifth unit is the same place on every render and on every device, and an
 * authoring wave that adds a lesson does not redecorate the map.
 */
export interface UnitCharacter {
  /** Glassware appears once every this many bands. */
  readonly glassEvery: number;
  /** Weather appears once every this many bands. */
  readonly cloudEvery: number;
  /** Which flank the unit's first watermark stands on. */
  readonly flank: -1 | 1;
  /** A unit-wide size multiplier, so some stretches read nearer than others. */
  readonly scale: number;
}

/** The golden ratio: a spread with no visible period, and stable in the index. */
const GOLDEN = 0.6180339887498949;

/**
 * A unit's character, deterministic in its index.
 *
 * Three of the four numbers come off the same golden-ratio sequence terrain.ts
 * uses for its ripple, for the same reason: consecutive units never land on
 * the same value and the sequence never visibly repeats, so fourteen units are
 * fourteen places rather than four places shown three and a half times.
 */
export function unitCharacter(index: number): UnitCharacter {
  const safe = Math.max(0, Math.floor(index));
  const a = (safe * GOLDEN) % 1;
  const b = ((safe + 1) * GOLDEN * 2) % 1;
  return {
    glassEvery: 2 + Math.floor(b * 2),
    cloudEvery: 2 + Math.floor(a * 2),
    flank: safe % 2 === 0 ? -1 : 1,
    scale: 0.92 + b * 0.3,
  };
}

/**
 * The props one terrace band carries.
 *
 * READ IT AS A COMPOSITION rather than as a list. Every band gets a watermark
 * on one flank and the flank ALTERNATES band to band, so the eye crosses the
 * track on the way down and the landscape reads as a zigzag passing rather
 * than as two columns of decals. Glassware and weather arrive on the opposite
 * flank on the unit's own cycle, which is what keeps a long unit from becoming
 * a repeat of one arrangement.
 *
 * Two to three props per 230px band is the density the reference carries in a
 * phone-shaped frame. The previous table put six or seven across a whole unit,
 * which is one screen with two props in it and one with none.
 */
export function propsForBand(bandIndex: number, character: UnitCharacter): readonly PropPlacement[] {
  const band = Math.max(0, Math.floor(bandIndex));
  const near: -1 | 1 = band % 2 === 0 ? character.flank : (-character.flank as -1 | 1);
  const far: -1 | 1 = -near as -1 | 1;
  /*
    NO WATERMARK ROWS. Both entries that used to open this array were molecule
    skeletons, one on each flank every band, and the owner removed them on
    2026-09-05. What is left is glassware, weather and boulders, so a band now
    carries one to three props rather than three to five. See PropKind above
    for the cost that was accepted along with it.
  */
  const out: PropPlacement[] = [];
  /*
    GLASSWARE EVERY BAND, ON A FLANK THAT ALTERNATES ON THE BAND'S OWN
    PARITY. The reference frame carries two flasks; the old cycle gave one
    every second or third band and, because `near` also alternates, several
    landed on the same flank in a row and read as a column of decals rather
    than as objects on a landscape. Parity alone guarantees the zigzag.
  */
  const glassSide: -1 | 1 = band % 2 === 0 ? -1 : 1;
  out.push({
    kind: "flask",
    side: glassSide,
    out: band % Math.max(2, character.glassEvery) === 0 ? 0.5 : 0.66,
    y: band % 2 === 0 ? 0.74 : 0.86,
    scale: character.scale * (band % 2 === 0 ? 1 : 0.85),
  });
  /*
    WEATHER IN THE SKY AND ROCKS ON THE GROUND, AND NEVER ON THE SAME FLANK.

    Both are FILLED props, so two of them meeting is the one collision the
    keep-out rules cannot resolve by occlusion, and a band is only 230px
    tall: a boulder at y 0.94 of one band and a cloud at y 0.06 of the next
    are 28px apart, which is how a grey rock came to be sitting in the sky
    beside a cloud on the built page. So weather is pinned to the upper third
    on the far flank and rock to the lower tenth on the near one, and they
    can never be within a band's height of each other on the same side.
  */
  out.push({ kind: "cloud", side: far, out: 0.78, y: band % 2 === 1 ? 0.2 : 0.3, scale: character.scale * 0.9 });
  // A second, smaller one lower down on the other flank every third band, so
  // a frame usually holds two. The reference frame holds two.
  if (band % 3 === 2) {
    out.push({ kind: "cloud", side: near, out: 0.84, y: 0.6, scale: character.scale * 0.72 });
  }
  /*
    ROCKS ARE RARE AND THEY STAND ON A STEP. Every fourth band, at y 0.98,
    which is where the NEXT plate's top edge cuts across: the boulder then
    reads as sitting on a horizon rather than floating mid-plate, which is
    what it did at 0.9 and every third band on the built page.
  */
  if (band % 4 === 1) {
    out.push({ kind: "boulder", side: near, out: 0.82, y: 0.98, scale: character.scale });
  }
  return out;
}

/** The measured frame a placement is resolved against. */
export interface SceneFrame {
  /** The scene's own width, which is the viewport: the surface is full bleed. */
  readonly width: number;
  /** Where the track column's centreline sits inside it. */
  readonly centreX: number;
  /** Half the track column. Props never come inside this. */
  readonly basis: number;
}

/**
 * A placement resolved to scene pixels.
 *
 * `margin` is the prop's own half width plus whatever air it should keep from
 * the page edge, so a prop at the far end of a phone's narrow flank sits AT
 * the edge, which is a composition, rather than being cut by it, which is a
 * defect.
 *
 * WHEN THERE IS NO ROOM, which is a phone, the inner limit is past the outer
 * one and the prop lands on the outer limit: hard against the page edge,
 * partly behind the chip column. That is the honest answer at 390pt, it is
 * what the per-unit designs draw (unit04's watermarks run behind the label
 * cards), and it is only allowed for the outlined props: the renderer drops a
 * filled cloud that meets a chip rather than sliding it under one.
 */
export function placePropPx(
  placement: PropPlacement,
  frame: SceneFrame,
  bandTop: number,
  bandBottom: number,
  margin: number,
): { readonly x: number; readonly y: number } {
  const span = Math.max(1, bandBottom - bandTop);
  const inner = frame.centreX + placement.side * frame.basis;
  const outer = placement.side === -1 ? margin : frame.width - margin;
  const x = inner + (outer - inner) * Math.max(0, Math.min(1, placement.out));
  const low = Math.min(margin, frame.width - margin);
  const high = Math.max(margin, frame.width - margin);
  return {
    x: Math.round(Math.max(low, Math.min(high, x)) * 10) / 10,
    y: Math.round((bandTop + placement.y * span) * 10) / 10,
  };
}
