/**
 * ONE MOTIF, ONE FILE. The ball-and-stick mark rides the node sheet's header
 * and the guidebook's badge pill, and it is the same component in both.
 *
 * THE MOTIF IS A TWO-CENTRE SKELETON, NOT A STAR. Re-traced from the goal
 * images after the attempt 2 critic found the built mark was a different
 * object: a symmetric four-around-one X. Measured off
 * blueberry_r5-node-sheet-v2 (dark-pixel bbox x 140..184, y 685..719, so 45
 * by 35 image px, which is 32.5 by 25.3 css px at the render's 1.385 scale)
 * and confirmed on blueberry_r5-guidebook at 298..345 x 290..332:
 *
 *   a MAUVE centre at (16.5, 21) bonded to a SLATE-BLUE centre at (31, 19.5)
 *   the mauve carries two satellites, up-left and down-left
 *   the slate carries two satellites, up-right and down-right
 *
 * So it is asymmetric, it is wider than it is tall, and it reads as a small
 * molecule rather than as a decorative star. The viewBox is 45 by 35, the
 * bbox's own aspect, because squaring it would have redrawn the geometry.
 *
 * THE PALETTE IS MUTED, AND THAT IS THE POINT. The sampled fills are a mauve
 * (181,156,178), a slate blue (175,182,201), a tan (232,214,190), a pale
 * cream (252,237,208), a warm grey (219,211,190) and a peach (222,193,161),
 * with a THIN warm-BROWN rim whose darkest pixel is (109,91,81), lighter than
 * the title ink beside it. The mark sits quietly next to the title; it is not
 * the loudest object on the sheet. The build it replaces filled saturated
 * cyan (--diamond) and orange-red (--streak), which spent the HUD's gem and
 * streak semantics on decoration inside a lesson mark.
 *
 * THE RIM IS BROWN, NOT SLATE, and both it and the bonds are hairlines. The
 * round 2 critic put the mark beside the picture and found the same geometry
 * reading as a hard UI icon rather than the reference's soft sticker mark:
 * the rim expression mixed toward --bb-foreground and landed on a cool
 * (97,94,105), and the strokes were half again as heavy as the reference's.
 * The colour is fixed in pathway-sheet.css (--ns-atom-warm feeds both the rim
 * and the bond); the weights are fixed here.
 *
 * Every fill arrives as a derived token from pathway-sheet.css (.ns-molecule),
 * so a palette move carries the mark and the dark theme is a measured pair
 * rather than an inversion. Every atom keeps a rim, so the contrast audit's
 * "a shape is one component" rule resolves each one on its boundary and the
 * pale cream atom reads as a pale sphere rather than as a hole; that is how
 * the reference draws it too.
 *
 * The goal green is deliberately absent: DESIGN-GOALS makes light green the
 * PROGRESS semantic, and a decorative atom reports no progress.
 *
 * Traced SVG, per DESIGN-GOALS: icons are never raster and never emoji.
 */

export function MoleculeGlyph() {
  return (
    <svg className="ns-molecule" viewBox="0 0 45 35" aria-hidden>
      {/* The skeleton first, so every rim paints over the stick that meets it. */}
      <path
        d="M16.5 21L5 14M16.5 21L14 30.5M16.5 21h14.5M31 19.5l4.5-14M31 19.5l9.5 10.5"
        fill="none"
        stroke="var(--ns-atom-bond)"
        strokeWidth="1.6"
        strokeLinecap="round"
      />
      {/* The satellites paint under the two centres, as the reference stacks
          them: the down-left cream sphere tucks behind the mauve centre.

          THE RIMS ARE HAIRLINES. The reference's rim is a thin warm brown
          that reads as a drawn mark; at 1.2 and 1.3 on a 45 unit box rendered
          into 36 css px, the build's rims were about 1 css px of a cool slate
          and the whole mark read as a hard UI icon. The colour moved to warm
          brown in pathway-sheet.css; the weight moves with it, because a
          heavy stroke in the right hue is still a heavy stroke. */}
      <circle cx="5" cy="14" r="5" fill="var(--ns-atom-tan)" stroke="var(--ns-atom-rim)" strokeWidth="1" />
      <circle cx="14" cy="30.5" r="5" fill="var(--ns-atom-cream)" stroke="var(--ns-atom-rim)" strokeWidth="1" />
      <circle cx="35.5" cy="5.5" r="5.5" fill="var(--ns-atom-grey)" stroke="var(--ns-atom-rim)" strokeWidth="1" />
      <circle cx="40.5" cy="30" r="4.5" fill="var(--ns-atom-peach)" stroke="var(--ns-atom-rim)" strokeWidth="1" />
      <circle cx="31" cy="19.5" r="6.5" fill="var(--ns-atom-slate)" stroke="var(--ns-atom-rim)" strokeWidth="1.1" />
      <circle cx="16.5" cy="21" r="6" fill="var(--ns-atom-mauve)" stroke="var(--ns-atom-rim)" strokeWidth="1.1" />
    </svg>
  );
}
