/**
 * Grading a drawing: is the structure on the canvas the expected one?
 *
 * WHY InChI AND NOT A SMILES STRING. The site's Write "Draw it" compares two
 * SMILES strings that both come out of Ketcher (src/lib/checkAnswer.ts,
 * sameStructure). That is fine for its carbonyl products, but here it breaks on
 * the first diene item: a student who draws 1-bromobut-2-ene draws its C=C with
 * some geometry, so Ketcher writes "C/C=C/CBr", while the answer has no E/Z and
 * comes out as "CC=CCBr". Same constitution, different strings, marked wrong.
 *
 * Standard InChI is canonical by definition and keeps stereo in separate
 * layers (/b for double bonds, /t /m /s for stereocentres), so dropping those
 * layers when an item does not ask about stereo compares exactly the
 * connectivity, charge and hydrogens. Ketcher's Indigo and the scripts' RDKit
 * both call the same IUPAC InChI library, so the answer's InChI is computed
 * once, offline, by the script, and only the student's drawing is converted in
 * the browser.
 *
 * Pure and DOM-free so the web suite can hold it.
 */

const STEREO_LAYERS = ["b", "t", "m", "s"] as const;

/** An InChI with its stereo layers removed. Other layers are kept in order. */
export function withoutStereo(inchi: string): string {
  const [head, ...layers] = inchi.trim().split("/");
  const kept = layers.filter((layer) => !STEREO_LAYERS.some((prefix) => layer.startsWith(prefix)));
  return [head, ...kept].join("/");
}

/**
 * An InChI with only its RELATIVE stereo kept, for an item that asks for wedges.
 *
 * /b (E/Z) and /t (each centre's parity) stay; /m (which mirror image) and /s
 * (absolute, relative or racemic flag) go. Enantiomers share /t and differ only
 * in /m, so this marks either mirror image right, which is what "draw the
 * product with wedges" means for a racemic product (dimethyl fumarate's trans
 * diester), while a diastereomer (the cis diester) still differs in /t.
 */
export function relativeStereo(inchi: string): string {
  const [head, ...layers] = inchi.trim().split("/");
  return [head, ...layers.filter((layer) => !layer.startsWith("m") && !layer.startsWith("s"))].join("/");
}

export type DrawVerdict = "right" | "wrong" | "empty";

/**
 * The verdict for one drawing. `drawn` is what Ketcher's getInchi returned for
 * the canvas; an empty canvas gives an empty string (or a throw the view turns
 * into ""), which is "empty" and never a miss.
 */
export function gradeDrawing(drawn: string, expected: string, stereo: boolean): DrawVerdict {
  const mine = drawn.trim();
  // Indigo writes "InChI=1S//" for an empty canvas: no formula layer means nothing drawn.
  const formula = mine.split("/")[1] ?? "";
  if (!mine.startsWith("InChI=") || formula.trim() === "") return "empty";
  if (stereo) return relativeStereo(mine) === relativeStereo(expected) ? "right" : "wrong";
  return withoutStereo(mine) === withoutStereo(expected) ? "right" : "wrong";
}

/**
 * Which named wrong structure the drawing is, if any (DrawBeat.misses). Same
 * comparison as gradeDrawing, so a drawn C=C geometry never hides a match.
 */
export function namedMiss<T extends { readonly inchi: string }>(
  drawn: string,
  misses: readonly T[] | undefined,
  stereo: boolean,
): T | null {
  for (const miss of misses ?? []) {
    if (gradeDrawing(drawn, miss.inchi, stereo) === "right") return miss;
  }
  return null;
}

/** Atom counts of an InChI's formula layer, every piece added up, plus how many pieces there are. */
function formulaOf(inchi: string): { readonly atoms: Map<string, number>; readonly pieces: number } {
  const formula = inchi.trim().split("/")[1] ?? "";
  const atoms = new Map<string, number>();
  const parts = formula.split(".").filter((part) => part !== "");
  let pieces = 0;
  for (const part of parts) {
    // "2C4H6" is two copies of the same piece.
    const copies = /^\d+/.exec(part);
    const times = copies === null ? 1 : Number(copies[0]);
    pieces += times;
    for (const match of part.slice(copies === null ? 0 : copies[0].length).matchAll(/([A-Z][a-z]?)(\d*)/g)) {
      const element = match[1]!;
      atoms.set(element, (atoms.get(element) ?? 0) + times * (match[2] === "" ? 1 : Number(match[2])));
    }
  }
  return { atoms, pieces };
}

/** The net charge an InChI records (its /q layer plus its /p proton layer). */
function chargeOf(inchi: string): number {
  let total = 0;
  for (const layer of inchi.trim().split("/").slice(1)) {
    if (layer.startsWith("q") || layer.startsWith("p")) {
      for (const n of layer.slice(1).split(";")) total += Number(n) || 0;
    }
  }
  return total;
}

const ELEMENT_WORD: Readonly<Record<string, string>> = { C: "carbon", Br: "bromine", O: "oxygen", N: "nitrogen", Cl: "chlorine" };

function chargeWord(charge: number): string {
  return charge > 0 ? "a + charge" : charge < 0 ? "a \u2212 charge" : "no charge";
}

/**
 * A hint for a drawing that is wrong and is none of the item's named misses,
 * worked out by comparing the two InChIs: piece count, then charge, then
 * heavy atoms, then hydrogens (which is the count of rings and pi bonds).
 * WHY: the item's lookAt line spells the answer out step by step, which made
 * the second try dictation (round 2 critic). This says what is off, never
 * where the atoms go. lookAt is kept for the reveal, after the answer is shown.
 */
export function hintFor(drawn: string, expected: string): string {
  const mine = formulaOf(drawn);
  const want = formulaOf(expected);
  if (mine.pieces > want.pieces) {
    return `Your board has ${mine.pieces} separate pieces. Draw only the one structure asked for.`;
  }
  const myCharge = chargeOf(drawn);
  const wantCharge = chargeOf(expected);
  if (myCharge !== wantCharge) {
    return `The answer carries ${chargeWord(wantCharge)}; yours has ${chargeWord(myCharge)}.`;
  }
  for (const element of ["C", "Br", "O", "N", "Cl"]) {
    const have = mine.atoms.get(element) ?? 0;
    const need = want.atoms.get(element) ?? 0;
    if (have !== need) {
      const word = ELEMENT_WORD[element]!;
      return `Count your ${word} atoms: the answer has ${need}, yours has ${have}.`;
    }
  }
  // Each ring or pi bond costs two hydrogens, so half the H gap is the count.
  const hDiff = (mine.atoms.get("H") ?? 0) - (want.atoms.get("H") ?? 0);
  const gap = Math.max(1, Math.round(Math.abs(hDiff) / 2));
  const what = gap === 1 ? "one more double bond or ring" : `${gap} more double bonds or rings`;
  if (hDiff > 0) return `Right atoms, but the answer has ${what} than yours.`;
  if (hDiff < 0) return `Right atoms, but yours has ${what} than the answer.`;
  return "Right atoms, right number of double bonds and rings, joined differently. Check which carbon each new atom sits on.";
}
