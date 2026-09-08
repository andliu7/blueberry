/**
 * THE OPEN TRAY, DRAWN. One SVG, no positioned divs, and tray.ts's TRAY_ART
 * carries every number in it with the measurement that produced it.
 *
 * WHY IT IS A DRAWING NOW. The round 3 build assembled the tray from HTML
 * boxes and the critic named three defects that all came from the assembly
 * rather than from the values:
 *
 *   - the thumb notch was a radial-gradient MASK, so the deck showed through
 *     it as a convex cream bulge hanging over the violet. The committed image
 *     draws a shallow dip with a FLAT bottom and rounded shoulders
 *   - the interior was two hard-edged rectangles with square inner corners
 *     either side of the deck, where the image has one continuous cavity with
 *     a soft dark wash across it
 *   - the lit top lip survived only as two stubs at the far corners, because
 *     a band across the top of a div is interrupted by whatever stands in
 *     front of it. The image's lip runs unbroken from the left corner up over
 *     the back and down to the right, then dips at the centre front
 *
 * HOW THE PAINT ORDER BUILDS THE BOX, back to front, which is the whole
 * trick and is worth reading once:
 *
 *   1. the slab, a rounded rect in the edge colour, standing lower than the
 *      box so it reads as the 3D chip's bottom edge the rest of the app uses
 *   2. the CUP, filled entirely in the LIP colour. Everything of it that is
 *      not covered later is a lit top surface, which is exactly the lip
 *   3. the CAVITY, one rounded rect in the interior colour with a soft dark
 *      wash down from its rim: the continuous inner shadow, not two blocks
 *   4. the DECK, cream cards climbing out of the cavity
 *   5. the front panel's LIP, the full notch contour in the lip colour
 *   6. the front panel's FACE, the same contour dropped by TRAY_ART.lip, so
 *      the sliver of lip left showing above it is the panel's own top surface
 *
 * The deck is drawn between 3 and 5, which is the sentence the whole fix is
 * about: the cards stand INSIDE the box and the panel is painted over their
 * lower half, so the panel's top edge is one clean unbroken line.
 *
 * It is aria-hidden end to end. The button around it carries the deck's name,
 * its count and what pressing it does, in words.
 */

import { TRAY_ART, trayCard } from "./tray";

const A = TRAY_ART;

/** The cup's silhouette: a rounded rect from its back rim to its foot. */
const CUP = [
  `M0 ${A.boxTop + 26}`,
  `Q0 ${A.boxTop} 26 ${A.boxTop}`,
  `L${A.width - 26} ${A.boxTop}`,
  `Q${A.width} ${A.boxTop} ${A.width} ${A.boxTop + 26}`,
  `L${A.width} ${A.boxFoot - 26}`,
  `Q${A.width} ${A.boxFoot} ${A.width - 26} ${A.boxFoot}`,
  `L26 ${A.boxFoot}`,
  `Q0 ${A.boxFoot} 0 ${A.boxFoot - 26}`,
  "Z",
].join(" ");

/**
 * The front panel's outline at a given top edge, so the lip and the face are
 * the SAME contour drawn twice at an 8 unit offset rather than two shapes
 * that have to be kept in step by hand.
 *
 * The dip is two smooth S curves into a FLAT run, which is the image's scoop.
 * A symmetric cubic (control points stacked vertically above each end) gives a
 * fillet that leaves the shoulder horizontally and meets the flat run
 * horizontally, so neither join shows a corner.
 */
function panelPath(top: number): string {
  const dip = top + (A.notchBottom - A.shoulder);
  return [
    `M0 ${top}`,
    `L${A.notchShoulderLeft} ${top}`,
    `C${A.notchShoulderLeft + 16} ${top} ${A.notchLeft - 16} ${dip} ${A.notchLeft} ${dip}`,
    `L${A.notchRight} ${dip}`,
    `C${A.notchRight + 16} ${dip} ${A.notchShoulderRight - 16} ${top} ${A.notchShoulderRight} ${top}`,
    `L${A.width} ${top}`,
    `L${A.width} ${A.boxFoot - 26}`,
    `Q${A.width} ${A.boxFoot} ${A.width - 26} ${A.boxFoot}`,
    `L26 ${A.boxFoot}`,
    `Q0 ${A.boxFoot} 0 ${A.boxFoot - 26}`,
    "Z",
  ].join(" ");
}

export interface TrayArtProps {
  /** How many card edges stand in the box. Clamped to what the box holds. */
  readonly edges: number;
  /** Per instance, because two trays on one page would share a gradient id. */
  readonly uid: string;
}

export function TrayArt({ edges, uid }: TrayArtProps) {
  const shadeId = `tray-shade-${uid}`;
  const cards = Math.max(0, Math.min(edges, 6));

  return (
    <svg
      className="tray-art"
      viewBox={`0 0 ${A.width} ${A.height}`}
      preserveAspectRatio="xMidYMax meet"
      aria-hidden="true"
    >
      <defs>
        {/* THE CONTINUOUS INNER SHADOW. One wash down from the cavity's rim
            rather than two dark blocks: the image's interior darkens under
            the lip and lightens as it falls, which is what makes the box read
            as one object with a hollow in it. */}
        <linearGradient id={shadeId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="var(--tray-shade)" stopOpacity="0.85" />
          <stop offset="55%" stopColor="var(--tray-shade)" stopOpacity="0.25" />
          <stop offset="100%" stopColor="var(--tray-shade)" stopOpacity="0" />
        </linearGradient>
      </defs>

      {/* 1. The slab: the 3D chip's bottom edge, at tray scale. */}
      <rect
        x="6"
        y={A.boxFoot - 40}
        width={A.width - 12}
        height={A.slabFoot - (A.boxFoot - 40)}
        rx="30"
        fill="var(--tray-edge)"
      />

      {/* 2. The cup, filled in the LIP colour. Whatever is not covered by the
             cavity or the front panel is a lit top surface. */}
      <path d={CUP} fill="var(--tray-rim)" />

      {/* 3. The cavity, and its wash. */}
      <g>
        <rect
          x={A.wall}
          y={A.boxTop + 16}
          width={A.width - 2 * A.wall}
          height={A.boxFoot - A.boxTop - 16}
          rx="14"
          fill="var(--tray-inner)"
        />
        <rect
          x={A.wall}
          y={A.boxTop + 16}
          width={A.width - 2 * A.wall}
          height={A.boxFoot - A.boxTop - 16}
          rx="14"
          fill={`url(#${shadeId})`}
        />
      </g>

      {/* 4. The deck, standing in the cavity. Painted back to front so the
             front card's face is whole and the ones behind it show only their
             climbing top edges, which is what a deck looks like. */}
      {Array.from({ length: cards }, (_, i) => cards - 1 - i).map((index) => {
        const box = trayCard(index);
        return (
          <rect
            key={index}
            x={box.x}
            y={box.y}
            width={box.w}
            height={box.h}
            rx="14"
            fill="var(--cards-paper)"
            stroke="var(--cards-paper-line)"
            strokeWidth="1.5"
          />
        );
      })}

      {/* 5 and 6. The front panel: its lip, then its face dropped by the lip's
             own thickness. The group is what presses on pointer down; the
             cards behind it do not move, which is what a moulded panel does. */}
      <g className="tray-art__front">
        <path d={panelPath(A.shoulder)} fill="var(--tray-rim)" />
        <path d={panelPath(A.shoulder + A.lip)} fill="var(--tray-face)" />
      </g>
    </svg>
  );
}
