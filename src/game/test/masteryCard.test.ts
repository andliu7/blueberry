/**
 * The mastery rank card's model, against real snapshots from real journals.
 *
 * NOTHING HERE BUILDS AN EconomySnapshot BY HAND, and nothing here reads the
 * host clock. Every case is a journal plus an explicit `now`, run through
 * `deriveEconomy`, for the two reasons the charge meter's tests already record:
 * a threshold that moves in packages/economy shows up as a failing sentence
 * rather than a fixture that quietly still passes, and a test that ran green in
 * the morning cannot go red after dark. That second half is the rule this run
 * learned the hard way; see apps/web/measurements/gauntlet-economy/LOG.md,
 * "The instruments that only worked before dark".
 *
 * THE THREE LOAD BEARING BLOCKS ARE THE LAST THREE, and each one is a clause
 * docs/ECONOMY.md calls non-optional rather than a preference:
 *
 *   "Ranks have a floor"  is proved by decaying a real journal until the visible
 *   score falls out of the band that earned the badge, and asserting the badge
 *   did not move. That clause is the one ECONOMY.md calls "the most demoralizing
 *   thing this system could do" if broken, so it is proved on a journal rather
 *   than on a hand-made snapshot that could assert itself.
 *
 *   "Never render decay as a loss"  is proved structurally: the model exposes no
 *   field a view could draw a fall from. A test that only checked today's copy
 *   would pass again the moment someone added `delta`, so the assertion is over
 *   the model's own key set.
 *
 *   "Cap the visible dip"  is proved by never reading `mastery.score`. The card
 *   shows `visible`, which the engine has already capped; a card that read the
 *   raw model number would show a harsher fall than the engine intends and no
 *   copy check would catch it.
 */

import { describe, expect, it } from "vitest";
import {
  MASTERY_RANKS,
  MASTERY_VISIBLE_DIP_CAP,
  deriveEconomy,
  rankFor,
  type EconomyEvent,
  type EconomySnapshot,
  type UniverseNode,
} from "@blueberry/economy";
import { masteryCardModel, rankMotif } from "../mastery/masteryModel";

const TZ = "UTC";
/** A fixed instant. Every `now` in this file is this or an offset from it. */
const NOW = "2026-08-28T14:00:00.000Z";

function daysAgo(days: number): string {
  return new Date(Date.parse(NOW) - days * 86_400_000).toISOString();
}

/** A course wide enough that the mastery floor is not what is being measured. */
function universe(count: number, difficulty: 1 | 2 | 3 | 4 | 5 = 3): readonly UniverseNode[] {
  return Array.from({ length: count }, (_unused, index) => ({ nodeId: `n${index}`, difficulty }));
}

function cleared(nodeId: string, at: string, difficulty: 1 | 2 | 3 | 4 | 5 = 3): readonly EconomyEvent[] {
  return [
    { kind: "node_started", at, tz: TZ, nodeId, nodeKind: "reaction" },
    {
      kind: "node_cleared",
      at,
      tz: TZ,
      nodeId,
      nodeKind: "reaction",
      difficulty,
      flawless: false,
      spine: true,
      stepsInOneSitting: 1,
    },
  ];
}

/** Clear the first `count` nodes of a `size` node course, `daysBack` days ago. */
function courseWith(size: number, count: number, daysBack: number, now = NOW): EconomySnapshot {
  const journal: EconomyEvent[] = [];
  for (let index = 0; index < count; index += 1) {
    journal.push(...cleared(`n${index}`, daysAgo(daysBack)));
  }
  return deriveEconomy(journal, now, { universe: universe(size) });
}

describe("the rank card reads the engine and computes no mastery of its own", () => {
  it("shows the visible score, never the raw model score", () => {
    // A journal left to decay for a fortnight: the model falls fast, the
    // visible number falls at the capped rate, and they are different numbers.
    const snapshot = courseWith(40, 24, 14);
    expect(snapshot.mastery.visible).toBeGreaterThan(snapshot.mastery.score);

    const model = masteryCardModel(snapshot);
    // Floored, not rounded: see the model's own note. Either way it tracks the
    // VISIBLE number and never the harsher one.
    expect(model.score).toBe(Math.floor(snapshot.mastery.visible));
    expect(model.score).not.toBe(Math.floor(snapshot.mastery.score));
  });

  it("never prints a number that contradicts the badge beside it", () => {
    // The failure this guards: rounding 15.6 to 16 prints the first number of
    // the Arrow Pusher band beside a Reader badge. Flooring cannot, and the
    // check is run against the package's own rankFor rather than the table.
    for (let count = 1; count <= 40; count += 1) {
      const snapshot = courseWith(40, count, 0);
      const model = masteryCardModel(snapshot);
      const rankOfPrintedNumber = rankFor(model.score);
      const badgeIndex = MASTERY_RANKS.findIndex((row) => row.name === model.badge.name);
      const printedIndex = MASTERY_RANKS.findIndex((row) => row.name === rankOfPrintedNumber.name);
      expect(printedIndex).toBeLessThanOrEqual(badgeIndex);
    }
  });

  it("leads with the sentence: the claim is the rank's own, from the package", () => {
    const snapshot = courseWith(40, 20, 0);
    const model = masteryCardModel(snapshot);
    const row = MASTERY_RANKS.find((candidate) => candidate.name === model.badge.name);
    expect(row).toBeDefined();
    expect(model.claim).toBe(row?.claim);
  });

  it("names the next UNEARNED rank, never one already held", () => {
    for (let count = 0; count <= 40; count += 1) {
      const snapshot = courseWith(40, count, 0);
      const model = masteryCardModel(snapshot);
      if (model.next === null) continue;
      expect(model.next.at).toBeGreaterThan(model.badge.at);
      expect(model.next.name).not.toBe(model.badge.name);
    }
  });

  it("has nothing above Exam Ready", () => {
    // Every node of a course cleared today is 100, the top of the ladder.
    const snapshot = courseWith(40, 40, 0);
    const model = masteryCardModel(snapshot);
    expect(model.badge.name).toBe("Exam Ready");
    expect(model.next).toBeNull();
    expect(model.toGo).toBe(0);
    expect(model.fill).toBe(1);
  });

  it("keeps the bar inside 0 and 1 for every reachable score", () => {
    for (let count = 0; count <= 40; count += 1) {
      for (const daysBack of [0, 7, 30]) {
        const model = masteryCardModel(courseWith(40, count, daysBack));
        expect(model.fill).toBeGreaterThanOrEqual(0);
        expect(model.fill).toBeLessThanOrEqual(1);
        expect(model.toGo).toBeGreaterThanOrEqual(0);
      }
    }
  });
});

describe("every rank carries its motif", () => {
  /**
   * Owner ruling 4 of 2026-09-04: "a node with no authored content still shows
   * what KIND it will be... an empty chip reads as broken rather than as
   * unauthored". `rankMotif` returns null for an unmapped rank so the view can
   * draw the queued treatment instead of crashing the profile tab; this is what
   * keeps that a real fallback rather than a place to leave work.
   */
  it("has a mark for every rank the package ships", () => {
    for (const row of MASTERY_RANKS) {
      expect(rankMotif(row.name)).not.toBeNull();
    }
  });

  it("gives every rank on the ladder a mark and a state", () => {
    const model = masteryCardModel(courseWith(40, 20, 0));
    expect(model.ladder).toHaveLength(MASTERY_RANKS.length);
    for (const row of model.ladder) {
      expect(row.motif).not.toBeNull();
      expect(["earned", "current", "ahead"]).toContain(row.state);
    }
    // Exactly one current, and it is the badge.
    const current = model.ladder.filter((row) => row.state === "current");
    expect(current).toHaveLength(1);
    expect(current[0]?.name).toBe(model.badge.name);
  });

  it("never prints the headline claim a second time on the ladder", () => {
    // The claim of the rank a student holds leads the card. Repeating it four
    // lines down is the one thing the S3 blind verdict said we do better than
    // the bar, so the row a student stands on says where they are instead.
    const model = masteryCardModel(courseWith(40, 20, 0));
    const details = model.ladder.map((row) => row.detail);
    expect(details.filter((detail) => detail === model.claim)).toHaveLength(0);
    expect(details).toContain("You are here");
    // Every other row still carries its own claim, so the ladder still says
    // what each rank is for.
    for (const row of model.ladder) {
      if (row.state === "current") continue;
      expect(row.detail).toBe(row.claim);
    }
  });

  it("orders the ladder earned, current, ahead and never mixes them", () => {
    const model = masteryCardModel(courseWith(40, 20, 0));
    const order = model.ladder.map((row) => row.state);
    const firstCurrent = order.indexOf("current");
    expect(order.slice(0, firstCurrent).every((state) => state === "earned")).toBe(true);
    expect(order.slice(firstCurrent + 1).every((state) => state === "ahead")).toBe(true);
  });
});

describe("ranks have a floor, and the card is where that promise is kept", () => {
  /**
   * docs/ECONOMY.md: "Once a Mechanist, always a Mechanist. The badge is
   * permanent even if the score sags. Taking back an earned rank is the most
   * demoralizing thing this system could do."
   */
  it("keeps the badge after the visible score has fallen out of its band", () => {
    // Clear most of a course on one day, then read it three months later. The
    // strength decays, the visible number sags, the badge does not move.
    const size = 40;
    const journal: EconomyEvent[] = [];
    for (let index = 0; index < 34; index += 1) journal.push(...cleared(`n${index}`, daysAgo(120)));
    const options = { universe: universe(size) };

    const fresh = deriveEconomy(journal, daysAgo(120), options);
    const sagged = deriveEconomy(journal, NOW, options);

    // The precondition: the current rank really did fall below the earned one.
    expect(sagged.mastery.rank).not.toBe(sagged.mastery.floorRank);
    expect(sagged.mastery.visible).toBeLessThan(fresh.mastery.visible);

    const model = masteryCardModel(sagged);
    expect(model.badge.name).toBe(fresh.mastery.floorRank);
    expect(model.held).toBe(true);
  });

  it("does not claim a rank is held when the score is where it was earned", () => {
    const model = masteryCardModel(courseWith(40, 20, 0));
    expect(model.held).toBe(false);
  });

  it("never shows negative progress toward the next rank, however far it sagged", () => {
    const size = 40;
    const journal: EconomyEvent[] = [];
    for (let index = 0; index < 34; index += 1) journal.push(...cleared(`n${index}`, daysAgo(200)));
    const model = masteryCardModel(deriveEconomy(journal, NOW, { universe: universe(size) }));
    expect(model.fill).toBeGreaterThanOrEqual(0);
    expect(model.toGo).toBeGreaterThanOrEqual(0);
  });
});

describe("decay is never rendered as a loss", () => {
  /**
   * docs/ECONOMY.md: not "you dropped 3 points", but "4 reactions are cracking,
   * review to restore, with a one-tap fix".
   *
   * THE STRUCTURAL ASSERTION IS THE POINT. Checking today's copy would pass
   * again the moment a `delta`, `was` or `fell` field was added, and the view
   * would then have something to draw. So the shape of the model is what is
   * pinned: there is no field a fall can come out of.
   */
  it("exposes no field a view could draw a fall from", () => {
    const model = masteryCardModel(courseWith(40, 24, 30));
    const keys = Object.keys(model);
    for (const forbidden of ["delta", "change", "was", "before", "previous", "fell", "drop", "lost", "trend"]) {
      expect(keys).not.toContain(forbidden);
    }
  });

  it("turns decay into a count of things to do and a way to do them", () => {
    // Long enough for cleared nodes to fall under the cracking threshold.
    const snapshot = courseWith(40, 12, 30);
    expect(snapshot.mastery.cracking.length).toBeGreaterThan(0);

    const model = masteryCardModel(snapshot);
    expect(model.crackingCount).toBe(snapshot.mastery.cracking.length);
    expect(model.restore).not.toBeNull();
    expect(model.restore).toContain("cracking");
    // The coach voice: what to do next, and it is offered rather than demanded.
    expect(model.restore?.toLowerCase()).toContain("review");
    // Nothing that names a fall, and nothing that scolds.
    for (const banned of ["dropped", "lost", "you should", "failed", "penalty"]) {
      expect(model.restore?.toLowerCase()).not.toContain(banned);
    }
  });

  it("says nothing about decay when nothing is decaying", () => {
    const model = masteryCardModel(courseWith(40, 12, 0));
    expect(model.crackingCount).toBe(0);
    expect(model.restore).toBeNull();
    // The dip-cap reassurance introduces the idea of falling, so it appears only
    // where falling is already on the table. A student on day one never sees it.
    expect(model.dipCap).toBeNull();
  });

  it("quotes the dip cap from the constant rather than from a literal", () => {
    const model = masteryCardModel(courseWith(40, 12, 30));
    expect(model.dipCap).not.toBeNull();
    expect(model.dipCap).toContain(String(MASTERY_VISIBLE_DIP_CAP));
  });

  it("agrees singular and plural with the count", () => {
    // One cracking node reads "1 lesson is", more than one reads "lessons are".
    const one = deriveEconomy([...cleared("n0", daysAgo(30))], NOW, { universe: universe(40) });
    expect(one.mastery.cracking).toHaveLength(1);
    expect(masteryCardModel(one).restore).toContain("1 lesson is");

    const many = masteryCardModel(courseWith(40, 12, 30));
    expect(many.restore).toContain("lessons are");
  });
});

describe("an empty journal still draws a card", () => {
  it("opens at Reader with the ladder ahead and nothing cracking", () => {
    const model = masteryCardModel(deriveEconomy([], NOW));
    expect(model.badge.name).toBe("Reader");
    expect(model.badge.motif).toBe("structure");
    expect(model.score).toBe(0);
    expect(model.held).toBe(false);
    expect(model.restore).toBeNull();
    expect(model.next?.name).toBe("Arrow Pusher");
    expect(model.ladder.filter((row) => row.state === "ahead")).toHaveLength(MASTERY_RANKS.length - 1);
  });
});
