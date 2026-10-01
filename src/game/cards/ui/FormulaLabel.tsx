/**
 * A reagent label or a card line, set as a chemist writes it: subscript
 * counts, superscript charges, "≡" for a triple bond. The rules and the reason
 * are in formulaText.ts; this file only turns its runs into elements.
 *
 * The visible text is aria-hidden and a plain copy is given to screen readers,
 * because "C H sub 3" read out one glyph at a time helps nobody, and the plain
 * copy is the same characters with the tags taken off.
 */

import { formulaParts, normaliseFormula, proseParts } from "./formulaText";

/**
 * `prose` is for a sentence or a name that MENTIONS formulas ("Acetylide from
 * terminal alkyne plus NaNH2"): only its formula words are set, see
 * proseParts. Without it the whole text is one formula, as a reagent label is.
 */
export function FormulaLabel({
  text,
  className,
  prose = false,
}: {
  readonly text: string;
  readonly className?: string;
  readonly prose?: boolean;
}) {
  const parts = prose ? proseParts(text) : formulaParts(normaliseFormula(text));
  const plain = parts.map((part) => part.text).join("");
  return (
    <span className={className}>
      <span className="sr-only">{plain}</span>
      <span aria-hidden="true">
        {parts.map((part, index) =>
          part.kind === "sub" ? (
            <sub key={index}>{part.text}</sub>
          ) : part.kind === "sup" ? (
            <sup key={index}>{part.text}</sup>
          ) : (
            <span key={index}>{part.text}</span>
          ),
        )}
      </span>
    </span>
  );
}
