import type { ArtMotif } from "@/data/testimonialArt";

/**
 * Every motif, as a runtime list.
 *
 * This is what the uploader validates a `motif:` line against, so it has to
 * match `ArtMotif` exactly. It listed only the first six for a while, which
 * meant a text file asking for `attack` or `pka` was told the motif was unknown
 * and quietly given the flask instead, even though both drawings exist and the
 * built-in decks use them.
 *
 * Its own file, apart from the drawings in testimonialArt.ts, because the
 * uploader's parser loads on every page (useDecks) and the drawings would
 * come with it.
 */
export const ART_MOTIFS: ArtMotif[] = [
  "erlenmeyer",
  "benzene",
  "reflux",
  "sepfunnel",
  "ir",
  "nmr",
  "attack",
  "resonance",
  "pka",
  "vanillin",
  "iodosalicylamide",
  "chalcone",
  "mascot",
];
