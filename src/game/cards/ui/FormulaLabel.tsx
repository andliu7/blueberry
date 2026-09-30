/**
 * A reagent label or a card line, set as a chemist writes it: subscript
 * counts, superscript charges, "≡" for a triple bond. The rules and the reason
 * are in formulaText.ts; this file only turns its runs into elements.
 *
 * The visible text is aria-hidden and a plain copy is given to screen readers,
 * because "C H sub 3" read out one glyph at a time helps nobody, and the plain
 * copy is the same characters with the tags taken off.
 */

import { formulaParts, normaliseFormula } from "./formulaText";

export function FormulaLabel({ text, className }: { readonly text: string; readonly className?: string }) {
  const plain = normaliseFormula(text);
  return (
    <span className={className}>
      <span className="sr-only">{plain}</span>
      <span aria-hidden="true">
        {formulaParts(plain).map((part, index) =>
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
