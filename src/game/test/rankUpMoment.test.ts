/**
 * The rank-up moment's model.
 *
 * A RANK UP IS THE PACKAGE'S DECISION, NOT THIS SURFACE'S. `receiptFor`
 * compares the FLOOR rank before and after one event, because the floor is what
 * the badge and the award are keyed to, and this model only reads that verdict.
 * So every case below runs a real journal through `receiptFor` rather than
 * asserting against a receipt written by hand, with exactly one documented
 * exception at the bottom.
 *
 * THE ASSERTION THAT MATTERS MOST IS THE LABEL ONE. The model reads the award
 * out of the receipt's own diamond lines by their "New rank: " prefix, which is
 * a string agreement between two files. A test that only checked the number
 * would pass while the moment silently stopped showing an award, because a
 * renamed label parses to zero lines and zero diamonds and no exception. So the
 * prefix is asserted against a real receipt, and it is the tripwire for anyone
 * editing `receiptFor`'s wording.
 */

import { describe, expect, it } from "vitest";
import {
  MASTERY_RANKS,
  deriveEconomy,
  receiptFor,
  type EconomyEvent,
  type Receipt,
  type UniverseNode,
} from "@blueberry/economy";
import { rankUpFromReceipt } from "../mastery/masteryModel";

const TZ = "UTC";
const NOW = "2026-08-28T14:00:00.000Z";

/** Forty nodes at difficulty 3: a course wide enough that the floor is not what is being measured. */
function universe(count = 40): readonly UniverseNode[] {
  return Array.from({ length: count }, (_unused, index) => ({ nodeId: `n${index}`, difficulty: 3 as const }));
}

function started(nodeId: string): EconomyEvent {
  return { kind: "node_started", at: NOW, tz: TZ, nodeId, nodeKind: "reaction" };
}

function clearedEvent(nodeId: string): EconomyEvent {
  return {
    kind: "node_cleared",
    at: NOW,
    tz: TZ,
    nodeId,
    nodeKind: "reaction",
    difficulty: 3,
    flawless: false,
    spine: true,
    stepsInOneSitting: 1,
  };
}

/**
 * The journal for `count` finished nodes, plus the start of the next one, so the
 * event handed to `receiptFor` is only ever the clear.
 */
function upTo(count: number): EconomyEvent[] {
  const journal: EconomyEvent[] = [];
  for (let index = 0; index < count; index += 1) journal.push(started(`n${index}`), clearedEvent(`n${index}`));
  journal.push(started(`n${count}`));
  return journal;
}

function receiptForClearNumber(count: number): Receipt {
  return receiptFor(upTo(count), clearedEvent(`n${count}`), NOW, { universe: universe() });
}

/**
 * THE CROSSING, worked out from the engine rather than guessed. Forty nodes at
 * difficulty 3 is a denominator of 120, so a fresh clear is worth 100 * 3 / 120,
 * which is 2.5 points. Reader ends at 15 and Arrow Pusher starts at 16, so the
 * sixth clear lands exactly on 15 and the seventh crosses. The test asserts the
 * precondition rather than trusting this arithmetic.
 */
const CROSSING_CLEAR = 6;

describe("the moment happens when the engine says a band was crossed, and not otherwise", () => {
  it("is null for an ordinary clear", () => {
    const receipt = receiptForClearNumber(2);
    expect(receipt.mastery.rankUp).toBeNull();
    expect(rankUpFromReceipt(receipt)).toBeNull();
  });

  it("fires on the clear that crosses a band", () => {
    const before = deriveEconomy(upTo(CROSSING_CLEAR), NOW, { universe: universe() });
    expect(before.mastery.floorRank).toBe("Reader");

    const receipt = receiptForClearNumber(CROSSING_CLEAR);
    expect(receipt.mastery.rankUp).toBe("Arrow Pusher");

    const model = rankUpFromReceipt(receipt);
    expect(model).not.toBeNull();
    expect(model?.badge.name).toBe("Arrow Pusher");
    expect(model?.badge.motif).toBe("arrow");
  });

  it("leads with the rank's own claim, from the package", () => {
    const model = rankUpFromReceipt(receiptForClearNumber(CROSSING_CLEAR));
    const row = MASTERY_RANKS.find((candidate) => candidate.name === "Arrow Pusher");
    expect(model?.claim).toBe(row?.claim);
  });

  it("names the next rank up, so the screen ends looking forward", () => {
    const model = rankUpFromReceipt(receiptForClearNumber(CROSSING_CLEAR));
    expect(model?.next?.name).toBe("Mechanist");
  });
});

describe("the award is read off the receipt, never recomputed", () => {
  it("reports what the package actually paid", () => {
    const receipt = receiptForClearNumber(CROSSING_CLEAR);
    const row = MASTERY_RANKS.find((candidate) => candidate.name === "Arrow Pusher");
    const model = rankUpFromReceipt(receipt);
    expect(model?.diamonds).toBe(row?.diamonds);
  });

  /**
   * THE TRIPWIRE. `receiptFor` writes "New rank: <name>" and this model slices
   * that prefix off. Nothing else couples the two files, and a rename would
   * fail silently: no lines match, the award reads 0, the pill disappears, and
   * every other test in here still passes. This is the assertion that goes red
   * instead.
   */
  it("agrees with receiptFor about the label it parses", () => {
    const receipt = receiptForClearNumber(CROSSING_CLEAR);
    const lines = receipt.diamonds.filter((line) => line.label.startsWith("New rank: "));
    expect(lines).toHaveLength(1);
    expect(lines[0]?.label).toBe("New rank: Arrow Pusher");
    expect(rankUpFromReceipt(receipt)?.crossed).toEqual(["Arrow Pusher"]);
  });
});

describe("the hierarchy: one hero thing, and no second copy of a number", () => {
  /**
   * The P2 celebration law, held structurally rather than by reading the JSX.
   * The hero on this screen is the BADGE, so the model must not be able to hand
   * a view a score at all: the reward moment one screen earlier already spent
   * the big number on XP, and a second enormous figure immediately after it is
   * two heroes in one sequence.
   */
  it("carries no score, no visible mastery and no XP", () => {
    const model = rankUpFromReceipt(receiptForClearNumber(CROSSING_CLEAR));
    expect(model).not.toBeNull();
    const keys = Object.keys(model ?? {});
    for (const forbidden of ["score", "visible", "mastery", "xp", "total", "percent"]) {
      expect(keys).not.toContain(forbidden);
    }
  });

  it("carries exactly one number, and it is the award", () => {
    const model = rankUpFromReceipt(receiptForClearNumber(CROSSING_CLEAR));
    const numeric = Object.entries(model ?? {}).filter(([, value]) => typeof value === "number");
    expect(numeric.map(([key]) => key)).toEqual(["diamonds"]);
  });
});

describe("more than one band in one event", () => {
  /**
   * THE ONE HAND-BUILT RECEIPT IN THIS FILE, and it is deliberate rather than
   * lazy. `receiptFor` pays every band an event crossed "so a single event that
   * jumps two bands cannot quietly swallow one of the awards", and this model
   * has to report the same thing. But the arithmetic makes the case
   * unreachable from a journal today: the mastery denominator is floored at
   * MASTERY_MIN_UNIVERSE_DIFFICULTY of 40, so the largest a single clear can
   * move the score is 100 * 5 / 40, which is 12.5, and the narrowest two-band
   * span is Reader plus Arrow Pusher, which needs more than 15.
   *
   * So there is no journal to drive it with, and the choice is between leaving
   * the branch untested and testing it against the format the test above pins
   * to a real receipt. The label agreement is what makes the second honest: the
   * shape below is the shape `receiptFor` was just proved to write.
   */
  const twoBands: Receipt = {
    xp: [],
    diamonds: [
      { label: "New rank: Arrow Pusher", amount: 125 },
      { label: "New rank: Mechanist", amount: 125 },
    ],
    charge: { delta: 0 },
    streak: { counted: true, current: 1 },
    mastery: { visibleBefore: 10, visibleAfter: 35, rankUp: "Mechanist" },
  };

  it("names every band crossed, not only the highest", () => {
    const model = rankUpFromReceipt(twoBands);
    expect(model?.crossed).toEqual(["Arrow Pusher", "Mechanist"]);
    expect(model?.badge.name).toBe("Mechanist");
  });

  it("sums the awards rather than showing one of them", () => {
    expect(rankUpFromReceipt(twoBands)?.diamonds).toBe(250);
  });

  it("still names the band that changed when no award was paid", () => {
    // Reader pays nothing and so writes no line. The rank that changed is
    // always worth naming, whatever it paid.
    const unpaid: Receipt = { ...twoBands, diamonds: [], mastery: { ...twoBands.mastery, rankUp: "Reader" } };
    const model = rankUpFromReceipt(unpaid);
    expect(model?.crossed).toEqual(["Reader"]);
    expect(model?.diamonds).toBe(0);
  });
});
