/**
 * The structure sketches on the deck tiles and the fanned cards.
 *
 * THE PROPERTY THIS SUITE EXISTS FOR is one the round 2 critic measured in
 * the running build rather than one anybody guessed: `doodleFor` is a hash
 * over the deck id, and a hash collides, so "EAS Reactions" and "My mistakes"
 * drew the identical Br-branched sketch on the landing grid and "Grignard"
 * and "Ozonolysis" drew an identical one inside a single fan. Both committed
 * goal images draw every visible structure distinct (four different sketches
 * on four tiles, six on six cards), so a repeat where the reference is
 * all-distinct is what makes the surface look templated.
 *
 * `distinctDoodles` is the fix and these are its bounds: no repeat inside one
 * rendered set, the same set always resolves the same way, and a deck keeps
 * its own hashed face wherever nothing else has taken it.
 */

import { describe, expect, it } from "vitest";

import { DOODLE_COUNT, distinctDoodles, doodleFor } from "../cards/ui/landing";
import { DOODLE_VARIANTS } from "../cards/ui/Doodles";

/** The four decks the committed landing image draws, in its own order. */
const LANDING_DECKS = ["personal:eas-reactions", "personal:carbonyls", "mistakes", "personal:spectroscopy"];

/** The six cards the committed deck-tray image fans, in its own order. */
const TRAY_CARDS = [
  "card:grignardsis",
  "card:sn2",
  "card:diels-alder",
  "card:grignard",
  "card:williamson",
  "card:ozonolysis",
];

describe("the sketch table", () => {
  it("landing.ts and Doodles.tsx agree on how many sketches exist", () => {
    // A DOODLE_COUNT larger than the table would index past the end; smaller
    // would silently retire drawings nobody deleted.
    expect(DOODLE_COUNT).toBe(DOODLE_VARIANTS);
  });

  it("holds at least as many sketches as the widest set that is ever drawn", () => {
    // Six is what a fan deals at the column cap; four is the landing grid.
    expect(DOODLE_COUNT).toBeGreaterThanOrEqual(6);
  });
});

describe("distinctDoodles", () => {
  it("THE ROUND 2 DEFECT: no two sketches in one rendered set are the same", () => {
    for (const set of [LANDING_DECKS, TRAY_CARDS]) {
      const picks = distinctDoodles(set);
      expect(picks).toHaveLength(set.length);
      expect(new Set(picks).size).toBe(set.length);
    }
  });

  it("holds for any set the table can colour, not only the two the images draw", () => {
    for (let size = 1; size <= DOODLE_COUNT; size += 1) {
      const ids = Array.from({ length: size }, (_, i) => `deck:${i}`);
      expect(new Set(distinctDoodles(ids)).size).toBe(size);
    }
  });

  it("is deterministic: the same list resolves the same way every time", () => {
    expect(distinctDoodles(TRAY_CARDS)).toEqual(distinctDoodles(TRAY_CARDS));
  });

  it("keeps a deck's own hashed face wherever nothing has taken it", () => {
    // The first member can never collide, so it always keeps its own sketch,
    // which is what makes a tile's face stable across visits.
    for (const set of [LANDING_DECKS, TRAY_CARDS]) {
      expect(distinctDoodles(set)[0]).toBe(doodleFor(set[0]!));
    }
  });

  it("every pick is a real index into the table", () => {
    for (const pick of distinctDoodles([...LANDING_DECKS, ...TRAY_CARDS])) {
      expect(pick).toBeGreaterThanOrEqual(0);
      expect(pick).toBeLessThan(DOODLE_COUNT);
    }
  });

  it("a set larger than the table wraps rather than throwing", () => {
    // Eight sketches cannot colour twelve tiles, and pretending otherwise
    // would be an infinite loop on a student's screen. It repeats, and it
    // still terminates and still returns one pick per id.
    const ids = Array.from({ length: DOODLE_COUNT + 4 }, (_, i) => `deck:${i}`);
    const picks = distinctDoodles(ids);
    expect(picks).toHaveLength(ids.length);
    expect(picks.every((p) => p >= 0 && p < DOODLE_COUNT)).toBe(true);
  });

  it("an empty list is an empty list", () => {
    expect(distinctDoodles([])).toEqual([]);
  });
});
