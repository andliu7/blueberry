import type { ReagentStep } from "@/game/cards/types";

/**
 * Bottle labels that name a SECOND species beside the stage's drawing, so they
 * stay as text next to it. Everywhere else the label is the same compound the
 * drawing shows ("PBr3" over PBr3, "NaBH4" over its borohydride anion) and
 * printing it again is the formula the owner asked to lose.
 *
 * Each entry is the generator's own reason (scripts/build_curriculum.py,
 * REAGENT_STRUCTURES), not a judgement made here:
 *   FeBr3  eas-bromination: "where FeBr3 is also named it is the catalyst and stays text"
 *   AlCl3  friedel-crafts-acylation: "the AlCl3 beside it is the catalyst and stays text"
 *   HCl    diazonium-formation draws nitrous acid ("which the reaction's own
 *          balance_lhs lists as consumed"); HCl is the acid the stage also names
 */
const LABEL_BESIDE_DRAWING: ReadonlySet<string> = new Set(["FeBr3", "AlCl3", "HCl"]);

/** Whether a step's bottle label still has to be printed beside its drawing. */
export function labelShown(step: ReagentStep): boolean {
  return step.art === undefined || LABEL_BESIDE_DRAWING.has(step.label);
}
