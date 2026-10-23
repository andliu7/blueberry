/**
 * The fills on the element tiles. Three colourings: by category (the default),
 * by electronegativity, and by standard state.
 *
 * Round 2 rule: every key must be tellable apart AT A GLANCE, on the table,
 * at tile size. So the fills are strong, one clear hue jump per category, and
 * "no value" is never a near-white that could pass for a low value: it is a
 * striped grey, a pattern nothing else uses.
 *
 * Every fill carries its label (tileInk) at 4.5:1 or better. The ratios below
 * were computed with the WCAG formula against PERIODIC_INK #2a2a42 and white
 * (scratchpad contrast.mjs), not estimated. The fills are literals and do not
 * move with the theme, so the inks are literals too.
 */

import type { Category, Element, Phase } from "./elements";

/** Deep navy, near neutral (HSL S 0.222); same value theme.css settled on for body ink. */
export const PERIODIC_INK = "#2a2a42";
const WHITE_INK = "#ffffff";

/**
 * One hue per category, ten clear steps round the wheel, in the order the
 * categories run across the table: red, orange, yellow on the metals side,
 * grey for the poor metals, green, blue, lime and violet on the nonmetals
 * side, and pink versus cyan for the two f rows so they can never be confused.
 * Ink ratios: 5.48, 7.86, 10.58, 7.51, 7.50, 6.54, 9.76, 5.19, 6.69, 7.91.
 */
export const CATEGORY_COLOUR: Record<Category, string> = {
  alkali: "#ff7a70",
  alkaline: "#ffb35c",
  transition: "#ffdf5c",
  post_transition: "#b4c0c9",
  metalloid: "#5fd3a0",
  nonmetal: "#66b8ff",
  halogen: "#c2e64e",
  noble: "#a98bff",
  lanthanide: "#ff8fd0",
  actinide: "#43d6e0",
};

/** The "no value" fill: a striped grey that no real value can be mistaken for. Ink 8.8:1 or better. */
export const NO_DATA_FILL = "repeating-linear-gradient(135deg, #e4e6ec 0 6px, #c9ced8 6px 9px)";

/** Solid is slate (5.37), liquid blue (6.54), gas yellow (10.58), predicted is the stripe. */
export const PHASE_COLOUR: Record<Phase, string> = {
  solid: "#8fa3b8",
  liquid: "#66b8ff",
  gas: "#ffdf5c",
  predicted: NO_DATA_FILL,
};

export const PHASE_LABEL: Record<Phase, string> = {
  solid: "Solid",
  liquid: "Liquid",
  gas: "Gas",
  predicted: "Predicted",
};

/**
 * Pauling electronegativity in seven bins, pale yellow (cesium, francium) to
 * the primary's deep violet (fluorine). Binned rather than a smooth ramp for
 * two reasons: the key's swatches then mean exactly what the tiles show, and
 * a smooth ramp has to cross the band where neither dark nor white ink
 * reaches 4.5:1. The two darkest bins take white ink (5.22 and 8.23); the
 * rest take PERIODIC_INK (12.40, 9.78, 7.10, 6.14, 5.30).
 */
export const EN_BINS: readonly { readonly from: number; readonly label: string; readonly fill: string; readonly ink: string }[] = [
  { from: 0, label: "under 1.0", fill: "#fff3b0", ink: PERIODIC_INK },
  { from: 1.0, label: "1.0", fill: "#ffd27a", ink: PERIODIC_INK },
  { from: 1.5, label: "1.5", fill: "#ffa36b", ink: PERIODIC_INK },
  { from: 2.0, label: "2.0", fill: "#ff8a8a", ink: PERIODIC_INK },
  { from: 2.5, label: "2.5", fill: "#e27ad6", ink: PERIODIC_INK },
  { from: 3.0, label: "3.0", fill: "#7a4fe0", ink: WHITE_INK },
  { from: 3.5, label: "3.5+", fill: "#4b32c4", ink: WHITE_INK },
];

function enBin(value: number) {
  let bin = EN_BINS[0];
  for (const candidate of EN_BINS) if (value >= candidate.from) bin = candidate;
  return bin;
}

function electronegativityColour(value: number | null): string {
  return value === null ? NO_DATA_FILL : enBin(value).fill;
}

export type Colouring = "category" | "electronegativity" | "state";

/** The CSS `background` for a tile. */
export function tileColour(element: Element, colouring: Colouring): string {
  switch (colouring) {
    case "category":
      return CATEGORY_COLOUR[element.category];
    case "electronegativity":
      return electronegativityColour(element.electronegativity);
    case "state":
      return PHASE_COLOUR[element.phase];
    default: {
      const unreachable: never = colouring;
      return unreachable;
    }
  }
}

/** The label colour that goes with tileColour. Only the two darkest EN bins need white. */
export function tileInk(element: Element, colouring: Colouring): string {
  if (colouring === "electronegativity" && element.electronegativity !== null) return enBin(element.electronegativity).ink;
  return PERIODIC_INK;
}
