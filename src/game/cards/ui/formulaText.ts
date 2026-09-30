/**
 * Condensed formulas as a chemist writes them: "(CH3)2CuLi" becomes (CH₃)₂CuLi,
 * "H3O+" becomes H₃O⁺, "CH3C#C-" becomes CH₃C≡C⁻. Read this before trusting it.
 *
 * WHY. The reagent labels in data/reactions.ts are ASCII, and round 1 printed
 * them raw: digits on the baseline, a "+" in line, and "#", which is SMILES
 * syntax for a triple bond, in front of students. A critic named all three.
 *
 * TWO STEPS, SO TEXT AND MARKUP AGREE.
 *   normaliseFormula  changes CHARACTERS: "#" to "≡", a trailing charge "-" to
 *                     the minus sign "−". Pure text, so a deck row, an aria
 *                     label and a test all read the same string.
 *   formulaParts      splits that text into runs the face renders as plain,
 *                     <sub> (a digit run after a letter or ")") or <sup> (a
 *                     charge at the end of a token). Stripping the tags gives
 *                     back exactly the normalised string.
 *
 * WHAT IT NEVER TOUCHES: a digit after a space, a hyphen or a comma, so names
 * ("buta-1,3-diene", "2-phenylpropan-2-ol") and prose ("pH 4 to 5") pass
 * through unchanged. It changes typography, never which atoms are named.
 */

export interface FormulaPart {
  readonly text: string;
  readonly kind: "plain" | "sub" | "sup";
}

/** A charge at the end of a token: one or more of + or -, after an atom, digit or ")". */
const TRAILING_CHARGE = /([A-Za-z0-9)\]])([+-]+)(?=$|[\s;,)])/g;

export function normaliseFormula(text: string): string {
  return text
    .replace(/#/g, "≡")
    .replace(TRAILING_CHARGE, (_match, before: string, charge: string) => before + charge.replace(/-/g, "−"));
}

/** The runs of an already normalised string. See the header. */
export function formulaParts(text: string): readonly FormulaPart[] {
  const parts: FormulaPart[] = [];
  const push = (value: string, kind: FormulaPart["kind"]): void => {
    const last = parts[parts.length - 1];
    if (last !== undefined && last.kind === kind) {
      parts[parts.length - 1] = { text: last.text + value, kind };
    } else {
      parts.push({ text: value, kind });
    }
  };
  for (let i = 0; i < text.length; i += 1) {
    const char = text[i] as string;
    const before = i > 0 ? (text[i - 1] as string) : "";
    const after = i + 1 < text.length ? (text[i + 1] as string) : "";
    const inSub = parts[parts.length - 1]?.kind === "sub";
    if (/[0-9]/.test(char) && (/[A-Za-z)\]]/.test(before) || (inSub && /[0-9]/.test(before)))) {
      push(char, "sub");
    } else if (/[+−]/.test(char) && /[A-Za-z0-9)\]+−]/.test(before) && (after === "" || /[\s;,)+−]/.test(after))) {
      push(char, "sup");
    } else {
      push(char, "plain");
    }
  }
  return parts;
}
