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

/*
 * FORMULAS INSIDE PROSE. A note like "Acetylide from terminal alkyne plus
 * NaNH2." is a sentence, and setting the whole of it as a formula would
 * subscript "SN2" and turn the hyphen in "1,2- and 1,4-" into a charge. So
 * prose is set word by word, and only a word that IS a formula gets the
 * formula treatment: every capital starts an element symbol (or Ph, Me, Et),
 * and it carries a count or a charge, the thing that needs setting. The
 * mechanism names SN1, SN2, E1 and E2 read as element strings and are kept
 * plain on purpose. Round 2 printed NaNH2, NaBH4, H2SO4 and six more flat.
 */
const SYMBOLS = new Set([
  "H", "Li", "B", "C", "N", "O", "F", "Na", "Mg", "Al", "Si", "P", "S", "Cl", "K", "Ca", "Cr",
  "Mn", "Fe", "Cu", "Zn", "Br", "Pd", "I", "Os", "Hg", "Ph", "Me", "Et",
]);
const MECHANISM = /^S[NE][12]$|^E[12]$/;

/** True for a whitespace-free word that is a condensed formula with a count or charge. */
export function isFormulaWord(word: string): boolean {
  if (MECHANISM.test(word) || !/^[A-Z(]/.test(word) || !/\d|[+-]$/.test(word)) return false;
  // Pieces joined by a bond hyphen ("CH3-PPh3+") are each checked.
  return word.split(/-(?=[A-Z(])/).every((piece) => {
    const body = piece.replace(/[+-]+$/, "");
    if (!/^[A-Za-z0-9()]+$/.test(body)) return false;
    const symbols = body.replace(/[0-9()]/g, "").match(/[A-Z][a-z]?/g) ?? [];
    return symbols.join("") === body.replace(/[0-9()]/g, "") && symbols.every((symbol) => SYMBOLS.has(symbol));
  });
}

/** The runs of a sentence: formula words set as formulas, everything else plain. */
export function proseParts(text: string): readonly FormulaPart[] {
  const parts: FormulaPart[] = [];
  for (const chunk of text.split(/(\s+)/)) {
    // Sentence punctuation stays outside the formula: "NaNH2." ends in a stop.
    const match = chunk.match(/^(.*?)([.,;:!?)]*)$/);
    const word = match?.[1] ?? chunk;
    const tail = match?.[2] ?? "";
    const runs = isFormulaWord(word) ? formulaParts(normaliseFormula(word)) : [{ text: word, kind: "plain" as const }];
    for (const run of [...runs, { text: tail, kind: "plain" as const }]) {
      if (run.text === "") continue;
      const last = parts[parts.length - 1];
      if (last !== undefined && last.kind === run.kind) parts[parts.length - 1] = { text: last.text + run.text, kind: run.kind };
      else parts.push(run);
    }
  }
  return parts;
}
