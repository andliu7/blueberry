/**
 * The mascot's LEAF and HANDS, as an accessory layer around the imported mark.
 *
 * WHY THIS EXISTS AND WHAT IT IS NOT. docs/INHERITED-DECISIONS.md D4 says the
 * mascot is imported, never redrawn, and BlueberryMark.tsx is that import: a
 * blue body, a five lobed calyx, a face. Both berries in
 * blueberry_r5-node-sheet-v2 and blueberry_r5-guidebook carry a GREEN LEAF
 * beside that calyx, and the sheet's berry also rests TWO HANDS on the sheet's
 * bottom edge. Neither is in the imported mark, and the round 2 critic named
 * both absences.
 *
 * So this is an accessory drawn AROUND the mark, in its own file, in this
 * package: nothing inside BlueberryMark moves, no path of the character is
 * rewritten, and the whole layer disappears by deleting one element. That is
 * the reading of D4 that keeps the character single-sourced while still
 * drawing the picture. If the owner would rather the leaf lived on the mark
 * itself, it is one path to move and this file goes away; that is reported in
 * the summary rather than decided here, because the mascot is not this
 * package's to own.
 *
 * THE COLOURS ARE LITERAL HEX, DELIBERATELY, and this is the same rule
 * BlueberryMark.tsx already states in its own header: the berry is a fixed
 * illustration in both themes, because a mascot that went dark at night would
 * be a different character, while contrast tokens govern text and interface
 * marks. So the leaf and the hands are sampled from the reference and written
 * as hex here, and pathway-sheet.css stays free of hex literals, which is
 * what its own test holds.
 *
 * THE GEOMETRY IS THE MARK'S. Both drawings use BlueberryMark's 0 0 64 64
 * viewBox, so a leaf at x 37..55 y 2..18 lands in the same place at any render
 * size. That is not a coincidence of two mock-ups: converting both reference
 * berries into mark coordinates (the sheet's body spans image x 324..444, the
 * guidebook's x 134..178, and the mark's body is r 23 at cy 34 of 64) puts the
 * leaf at x 37.4..54.2 y 2.2..14.1 in one and x 37..53 y 5..17 in the other.
 */

/** Sampled off the reference at (416,1020) and (424,1014) on the node sheet. */
const LEAF = "#6bb045";
/** The blade's shaded underside, so the leaf reads as a surface, not a decal. */
const LEAF_SHADE = "#569237";
/** Sampled at (318,1100) and (440,1104): the berry's own mid blue. */
const HAND = "#4a76d6";

/**
 * The leaf, overlaid on the berry's box. Two arcs from a base tucked behind
 * the body, up and to the right, meeting at a point clear of the calyx.
 *
 * It is a STATIC overlay while the mark below it breathes and leans, and that
 * is a deliberate, bounded compromise: the idle behaviour is a 7 second tilt
 * of plus or minus 2.9 degrees, which moves the leaf's tip about 2 px at the
 * 112 px render, and the base is drawn far enough under the body that the
 * drift can never open a gap between them. The alternative, a CSS copy of
 * berryBehaviour's idle keyframes, is a second source of truth for the same
 * motion and would go stale the first time the machine changes.
 */
export function BerryLeaf({ className }: { readonly className: string }) {
  return (
    <svg className={className} viewBox="0 0 64 64" aria-hidden>
      <path d="M38.6 17.9C40.2 9.4 46.4 3.2 54.8 2.6c0.8 8.6-5.4 15-14.2 16.2z" fill={LEAF} />
      {/* The lower edge in shade, a third of the blade, which is how the
          reference's leaf turns rather than lying flat. */}
      <path d="M38.6 17.9c3.4-4.6 9.2-8 16.2-9.1 0.5 5.6-4.7 9.9-13.2 10.9z" fill={LEAF_SHADE} opacity="0.55" />
    </svg>
  );
}

/**
 * The two hands, resting ON the sheet's bottom edge.
 *
 * The layer is drawn in the WRAPPER's coordinates rather than the mark's,
 * because what fixes these is the sheet edge, not the berry: the reference
 * centres both on y 1101, which is the sheet's own bottom, so half of each sits
 * on the cream and half hangs over the tab bar. The viewBox is 144 by 28, the
 * layer's own css size, and the crop line falls at y 20 of it.
 */
export function BerryHands({ className }: { readonly className: string }) {
  return (
    <svg className={className} viewBox="0 0 144 28" aria-hidden>
      <ellipse cx="28" cy="20" rx="12" ry="8" fill={HAND} />
      <ellipse cx="116" cy="20" rx="12" ry="8" fill={HAND} />
    </svg>
  );
}
