/**
 * ONE STAGE'S REAGENTS, DRAWN. The line three pages used to print as raw SMILES.
 *
 * THE OWNER'S RULE, 27 and 28 Sep, stated twice: "don't make a habit of making
 * the formula for the reagents. Always draw it out in the skeletal structure",
 * then "also draw out the reagents in the reactions - in the flashcards and in
 * the questions."
 *
 * WHAT THESE THREE PAGES WERE DOING, and it was worse than a formula. The
 * lessons row, the reactions index and the draw page each printed
 * `stage.reagents.join("  |  ")`, which is the raw authored array: a student
 * reading the Wittig saw `[CH2-][P+](c1ccccc1)(c1ccccc1)c1ccccc1`, and a
 * student reading imine formation saw `CN`, which reads as cyanide and is
 * methylamine. Three copies of one line, so one component replaces all three.
 *
 * THE CHEMISTRY IS DERIVED, NEVER ASSERTED. The drawing is an SVG RDKit
 * rendered from the reagent's own SMILES in scripts/build_curriculum.py, and
 * `REAGENT_ART` there is the registry of which tokens are structures at all.
 * The caption is the bottle label the same authored data carries. A reagent the
 * data does not draw shows its text and nothing more, which is the case for
 * `PCC`, `H2CrO4`, `DIBALH`, `Zn(Hg)` and the Grignard and Gilman
 * organometallics.
 *
 * No state, no clock, no chemistry of its own: it places what the data gives it.
 */

import type { Stage } from "@/data/reactions";
import { stageReagentArt, stageReagentLabel } from "@/game/cards/reactionCard";

/** The lessons row's reagent ink, carried across from all three call sites. */
const REAGENT_INK = "text-[#472ab4] dark:text-[#bbb1eb]";

export function StageReagents({ stage }: { readonly stage: Stage }) {
  const label = stageReagentLabel(stage);
  const art = stageReagentArt(stage);

  // Nothing to say. A stage whose every token is a structure the registry does
  // not draw says less rather than printing a SMILES at a student.
  if (label.length === 0 && art === undefined) return null;

  if (art === undefined) {
    return <p className={`mt-2 font-mono text-sm ${REAGENT_INK}`}>{label}</p>;
  }

  const base = import.meta.env.BASE_URL;
  return (
    <div className="mt-2 flex flex-col items-start gap-0.5">
      {/* Two images with one hidden per theme rather than one swapped in
          JavaScript: RDKit writes literal colours into the SVG and an <img>
          does not inherit CSS, so a CSS-only switch means the right drawing is
          already decoded when the theme flips. The alt is empty because the
          caption below names the same reagent. */}
      {art.light !== undefined && (
        <img
          src={base + art.light}
          alt=""
          width={168}
          height={104}
          className={`h-14 w-auto max-w-full object-contain object-left ${
            art.dark === undefined ? "" : "dark:hidden"
          }`}
        />
      )}
      {art.dark !== undefined && (
        <img
          src={base + art.dark}
          alt=""
          aria-hidden={art.light === undefined ? undefined : true}
          width={168}
          height={104}
          className={`h-14 w-auto max-w-full object-contain object-left ${
            art.light === undefined ? "" : "hidden dark:block"
          }`}
        />
      )}
      <span className={`font-mono text-sm ${REAGENT_INK}`}>{label}</span>
    </div>
  );
}
