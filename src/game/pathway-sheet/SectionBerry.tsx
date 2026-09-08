/**
 * The section-head mascot, and it is LEAFED.
 *
 * Both berries in the reference carry a green leaf beside the calyx and the
 * build drew a bare blue face at both, which a critic named twice. Same
 * accessory layer as the sheet's peek: BerryLeaf draws AROUND the imported
 * mark, never inside it, per D4.
 *
 * WHY THIS LIVES IN ITS OWN FILE. Its test asserts that no bare `<Berry>` with
 * a sizePx appears in the guidebook, which is how a new section is stopped from
 * quietly dropping the leaf again. While the wrapper sat inside Guidebook.tsx
 * that assertion matched the wrapper's own body, so the guard fired on the very
 * mechanism it exists to protect. Extracting it makes the guidebook contain no
 * bare Berry at all, which satisfies the check exactly as written rather than
 * loosening it, and the wrapper is now reusable by any surface that needs a
 * leafed mark.
 *
 * 36 px is the reference's own 44 image px body plus its leaf, and the box is
 * exactly that so the leaf's viewBox lines up with the mark's.
 */

import { Berry } from "../mascot/Berry";
import { BerryLeaf } from "./BerryLeaf";

export const SECTION_BERRY_PX = 36;

export function SectionBerry({
  mood,
  reducedMotion,
}: {
  readonly mood: "focused" | "curious";
  readonly reducedMotion: boolean;
}) {
  return (
    <span className="gb-berry">
      <Berry mood={mood} reducedMotion={reducedMotion} sizePx={SECTION_BERRY_PX} />
      <BerryLeaf className="gb-berry__leaf" />
    </span>
  );
}
