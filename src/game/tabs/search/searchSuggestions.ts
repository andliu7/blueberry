/**
 * The tap-to-try chips on the search screen, grouped by the axis they search.
 *
 * Every chip must return at least one reaction, or it is a button that leads
 * nowhere. test/searchSuggestions.test.ts runs each one through the real
 * searchReactions and fails if any comes back empty, so a reaction table edit
 * that orphans a chip is caught before a student taps it.
 *
 * The axis is the same MatchAxis the results use, so a chip and the "matched
 * by reagent" tag on a result share one colour and one meaning.
 */

import type { MatchAxis } from "@blueberry/curriculum";

export interface SuggestionGroup {
  readonly axis: MatchAxis;
  readonly title: string;
  readonly queries: readonly string[];
}

export const SEARCH_SUGGESTIONS: readonly SuggestionGroup[] = [
  { axis: "reagent", title: "A reagent you saw", queries: ["PCC", "NaBH4", "LiAlH4", "NBS", "mCPBA"] },
  { axis: "class", title: "What you start with or need", queries: ["ketone", "alkene", "epoxide", "ester"] },
  { axis: "name", title: "A name you half remember", queries: ["Grignard", "Diels-Alder", "Williamson"] },
];
