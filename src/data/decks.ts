import type { ArtMotif } from "@/data/testimonialArt";
import { questions } from "@/data/questions";

/**
 * Every deck the hub knows about.
 *
 * This is the one place to edit when a new set of questions is added: give it an
 * entry here and it appears on the home page and in the navigation pill without
 * touching either of them.
 */
export type Deck = {
  id: string;
  title: string;
  subtitle: string;
  /** Hash target. "#/" is the site root, which is this deck. */
  href: string;
  count: number;
  /** Illustration, drawn from the shared motif set. */
  motif: ArtMotif;
  from: string;
  to: string;
};

export const DECKS: Deck[] = [
  {
    id: "grignard",
    title: "Grignard LCTA",
    subtitle:
      "Addition to a carbonyl, start to finish: drying glassware, the reaction, extraction, washing, and reading the IR and NMR.",
    href: "#/",
    count: questions.length,
    motif: "attack",
    from: "#4338ca",
    to: "#6d28d9",
  },
];
