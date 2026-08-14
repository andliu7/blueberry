import type { Ketcher } from "ketcher-core";

/**
 * Is what is on the canvas the same structure as the expected answer?
 *
 * Copied from `mechanism_trainer/src/lib/checkAnswer.ts` rather than rewritten.
 * It is already correct, already load-bearing there, and two divergent copies of
 * a grader is the worst of both.
 *
 * SMILES cannot be compared as text. `CC(=O)O` and `OC(C)=O` are the same
 * molecule and share not one character in common, and a student who draws the
 * ring starting from a different atom writes a different string for an identical
 * structure. Comparison has to happen after canonicalisation.
 *
 * There is no canonicaliser to reach for here — RDKit.js would be another WASM
 * download on top of Ketcher's — but Indigo is already loaded, and Ketcher will
 * canonicalise anything you hand it. So both sides go through the *same*
 * editor: read the student's SMILES, swap the expected answer in, read that
 * SMILES, then put the student's drawing back. Two strings out of one
 * canonicaliser, which is exactly the comparison that means something.
 *
 * The round trip is why this restores from a molfile rather than from the SMILES
 * it just read. SMILES throws away the coordinates, so restoring from it would
 * silently re-lay-out the student's structure under them.
 */
export async function sameStructure(
  ketcher: Ketcher,
  expected: string,
): Promise<{ ok: boolean; mine: string; theirs: string } | { error: string }> {
  let backup: string | null = null;
  try {
    backup = await ketcher.getMolfile();
    const mine = normalise(await ketcher.getSmiles());

    await ketcher.setMolecule(expected);
    const theirs = normalise(await ketcher.getSmiles());

    await ketcher.setMolecule(backup);
    return { ok: mine === theirs, mine, theirs };
  } catch (err) {
    // Never leave the canvas holding the answer because the check threw.
    if (backup) {
      try {
        await ketcher.setMolecule(backup);
      } catch {
        /* nothing better to do */
      }
    }
    return { error: String(err) };
  }
}

/**
 * Fragment order is not chemistry.
 *
 * `A.B` and `B.A` are the same mixture, and Indigo does not promise an order
 * across two calls. Sorting the dot-separated pieces makes the comparison
 * independent of which molecule the student happened to draw first, which is not
 * something they should lose a mark for.
 */
function normalise(smiles: string): string {
  return smiles
    .trim()
    .split(".")
    .map((part) => part.trim())
    .filter(Boolean)
    .sort()
    .join(".");
}
