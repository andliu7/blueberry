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
  if (stereo) return mine === expected.trim() ? "right" : "wrong";
  return withoutStereo(mine) === withoutStereo(expected) ? "right" : "wrong";
}
