/**
 * Every suggestion chip on the search screen must find something, and must
 * find it on the axis its group claims. A chip under "A reagent you saw" that
 * only matches by name would teach the wrong thing about how search works.
 */

import { describe, expect, it } from "vitest";
import { searchReactions } from "@blueberry/curriculum";
import { SEARCH_SUGGESTIONS } from "../tabs/search/searchSuggestions";

const cases = SEARCH_SUGGESTIONS.flatMap((group) => group.queries.map((query) => [group.axis, query] as const));

describe("search suggestion chips", () => {
  it.each(cases)("%s chip %s returns a reaction matched on that axis", (axis, query) => {
    const matches = searchReactions(query);
    expect(matches.length).toBeGreaterThan(0);
    expect(matches.some((match) => match.matchedOn.includes(axis))).toBe(true);
  });
});
