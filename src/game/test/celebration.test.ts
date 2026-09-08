/**
 * The celebration's model: the P2 law, and the accuracy chip the S3 judge asked
 * for.
 *
 * THE LAW UNDER TEST, from RewardMoment.tsx's own header and from the S3 verdict
 * in measurements/gauntlet-economy/LOG.md: the hero number appears ONCE and the
 * itemization sums to it exactly. That is the specific thing the blind judge
 * picked us for over the bar ("the reward screen itemizes its headline number,
 * First clear +10, Flawless +5, Daily goal +10, summing exactly to the 25
 * shown"), and until now nothing failed if a builder broke it. A screen that
 * shows a number its own chips do not add up to is the one defect this surface
 * cannot afford, so it is asserted here rather than looked at.
 *
 * NOTHING HERE HAND BUILDS A RECEIPT. Every case is a journal and an event
 * through the real `receiptFor`, the same standard feedModel.test.ts and
 * streakModel.test.ts hold themselves to: a rule that moves in packages/economy
 * shows up as a failing celebration rather than as a fixture that quietly still
 * passes.
 *
 * THE CLOCK IS PART OF THE SURFACE (LOG.md). Every case pins `now`, and the
 * last block runs one journal at 09:00 and at 23:00 to prove the celebration's
 * own numbers do not branch on the hour the way the header's streak copy does.
 */

import { describe, expect, it } from "vitest";
import { receiptFor, type EconomyEvent, type Receipt } from "@blueberry/economy";
import { accuracyPercent, celebrationModel, heroNumberWidth } from "../lesson/RewardMoment";

const TZ = "UTC";
const NOW = "2026-08-28T14:00:00.000Z";

/**
 * Hour 8, deliberately, and every clock this file pins is later than it. An
 * event stamped after `now` is history the engine has not reached yet, and a
 * fixture that reads one is measuring its own bug rather than the surface.
 */
function at(daysAgo: number, hour = 8): string {
  const ms = Date.parse(NOW) - daysAgo * 86_400_000;
  const day = new Date(ms).toISOString().slice(0, 10);
  return `${day}T${String(hour).padStart(2, "0")}:00:00.000Z`;
}

/**
 * A branch node's first clear pays 20 XP, which is exactly the default daily
 * goal, so one of these is a day that counts. That is what makes a streak
 * history buildable a day at a time below.
 */
function clear(daysAgo: number, nodeId: string, flawless = false): EconomyEvent {
  return {
    kind: "node_cleared",
    at: at(daysAgo),
    tz: TZ,
    nodeId,
    nodeKind: "branch",
    flawless,
    stepsInOneSitting: 1,
    spine: true,
    difficulty: 3,
  };
}

/** The receipt for one clear, against a history that ends the day before. */
function receiptForClear(history: readonly EconomyEvent[], event: EconomyEvent, now = NOW): Receipt {
  return receiptFor(history, event, now);
}

function sum(lines: readonly { readonly amount: number }[]): number {
  return lines.reduce((total, line) => total + line.amount, 0);
}

/* ------------------------------------------------------------- the P2 law -- */

describe("the hero number and its itemization", () => {
  it("shows a hero that is exactly the sum of the chips under it, on a first clear", () => {
    const receipt = receiptForClear([], clear(0, "u1:l1"));
    const model = celebrationModel(receipt, 5, 5);

    expect(receipt.xp.length).toBeGreaterThan(0);
    expect(model.xpTotal).toBe(sum(receipt.xp));
  });

  it("holds across a week of different days, so no path pays a line the hero misses", () => {
    // Six shapes of day: a cold start, a flawless clear, a clear that crosses
    // the daily goal, a second clear the same day, a streak day, and a day with
    // a milestone in it. Every one of them is a real journal run through the
    // engine, and every one of them must still add up.
    const streakHistory: EconomyEvent[] = [];
    for (let day = 7; day >= 1; day -= 1) streakHistory.push(clear(day, `warm:${day}`));

    const cases: readonly { readonly name: string; readonly receipt: Receipt }[] = [
      { name: "cold start", receipt: receiptForClear([], clear(0, "u1:l1")) },
      { name: "flawless", receipt: receiptForClear([], clear(0, "u1:l1", true)) },
      {
        name: "second clear the same day",
        receipt: receiptForClear([clear(0, "u1:l1")], clear(0, "u1:l2")),
      },
      { name: "seven days deep", receipt: receiptForClear(streakHistory, clear(0, "u2:l1")) },
      {
        name: "seven days deep and flawless",
        receipt: receiptForClear(streakHistory, clear(0, "u2:l1", true)),
      },
      {
        name: "deep into a run",
        receipt: receiptForClear([...streakHistory, clear(0, "u2:l1")], clear(0, "u2:l2", true)),
      },
    ];

    for (const { name, receipt } of cases) {
      const model = celebrationModel(receipt, 4, 5);
      expect(model.xpTotal, `${name}: the hero is the sum of its own chips`).toBe(sum(receipt.xp));
      expect(model.diamondTotal, `${name}: the diamond card is the sum of its lines`).toBe(
        sum(receipt.diamonds),
      );
    }
  });

  it("reads the flawless badge off the RECEIPT, never off the session tally", () => {
    // The engine decided whether it counted. A student who answered every
    // question right on the second try has a clean tally and no badge, and a
    // screen that inferred the badge from the tally would hand out a scarce
    // mark the economy never paid for.
    const clean = celebrationModel(receiptForClear([], clear(0, "u1:l1")), 5, 5);
    expect(clean.flawless).toBe(false);

    const earned = celebrationModel(receiptForClear([], clear(0, "u1:l1", true)), 3, 5);
    expect(earned.flawless).toBe(true);
  });

  it("never shows a diamond card the receipt did not pay for", () => {
    const model = celebrationModel(receiptForClear([], clear(0, "u1:l1")), 5, 5);
    expect(model.hasDiamonds).toBe(model.diamondTotal > 0);
  });
});

/* ---------------------------------------------------------- the S3 amendment */

describe("the accuracy chip, the honest measure the bar reports", () => {
  it("is the session tally as a percent, rounded", () => {
    expect(accuracyPercent(5, 5)).toBe(100);
    expect(accuracyPercent(4, 5)).toBe(80);
    expect(accuracyPercent(2, 3)).toBe(67);
  });

  it("is ABSENT rather than a made-up 100 when nothing was attempted", () => {
    // A percent of zero questions is not a measure. The chip does not render.
    expect(accuracyPercent(0, 0)).toBeNull();
    expect(accuracyPercent(3, 0)).toBeNull();
    expect(celebrationModel(receiptForClear([], clear(0, "u1:l1")), 0, 0).accuracy).toBeNull();
  });

  it("cannot report more right than were attempted, or less than none", () => {
    expect(accuracyPercent(9, 5)).toBe(100);
    expect(accuracyPercent(-3, 5)).toBe(0);
  });

  it("is not a second hero: it never repeats the XP number", () => {
    // The one number on this screen that is not a receipt line. It is a
    // percent, the hero is XP, and they are different quantities by
    // construction; this pins that the model keeps them separate fields.
    const model = celebrationModel(receiptForClear([], clear(0, "u1:l1")), 4, 5);
    expect(model.accuracy).toBe(80);
    expect(model.xpTotal).toBe(sum(receiptForClear([], clear(0, "u1:l1")).xp));
  });
});

/* ------------------------------------------------------------ the milestone */

describe("the milestone", () => {
  it("is null on an ordinary day", () => {
    const model = celebrationModel(receiptForClear([], clear(0, "u1:l1")), 5, 5);
    expect(model.milestone).toBeNull();
  });

  it("takes over the streak card on a milestone day rather than adding a third", () => {
    // Six counted days behind today makes today the seventh. The model reports
    // one milestone and one streak; the component draws them in ONE slot, and
    // the assertion that matters here is that a milestone never arrives without
    // the streak it belongs to.
    const history: EconomyEvent[] = [];
    for (let day = 6; day >= 1; day -= 1) history.push(clear(day, `warm:${day}`));
    const receipt = receiptForClear(history, clear(0, "u2:l1"));
    const model = celebrationModel(receipt, 5, 5);

    expect(receipt.streak.current).toBe(7);
    expect(model.streakOn).toBe(true);
    expect(model.milestone).toBe(7);
  });

  it("shows no streak card at all when today did not count", () => {
    // Nothing on this screen frames a day as lost: the card is absent, not
    // struck through. `streakOn` is the engine's own `counted`.
    const receipt = receiptForClear([], clear(0, "u1:l1"));
    const notCounted: Receipt = { ...receipt, streak: { ...receipt.streak, counted: false } };
    expect(celebrationModel(notCounted, 5, 5).streakOn).toBe(false);
  });
});

/* ------------------------------------------- the clock is part of the surface */

describe("the clock", () => {
  it("celebrates the same lesson identically at 09:00 and at 23:00", () => {
    const history: EconomyEvent[] = [clear(1, "warm:1"), clear(2, "warm:2")];
    const morning = "2026-08-28T09:00:00.000Z";
    const night = "2026-08-28T23:00:00.000Z";
    const event = clear(0, "u2:l1", true);

    const a = celebrationModel(receiptForClear(history, event, morning), 4, 5);
    const b = celebrationModel(receiptForClear(history, event, night), 4, 5);
    expect(a).toEqual(b);
  });
});

/**
 * THE DRAWN HERO FACE, held as a check because it is a typeface this
 * repository maintains rather than one a platform ships.
 *
 * DESIGN-GOALS names celebration numbers as the ROUNDED display surface, and
 * a critic measured the built hero as "a flat grotesque identical to the body
 * face": --font-display is a pure system stack with no @font-face anywhere in
 * apps/web, so off Apple platforms it falls through to system-ui, the Pixel 6a
 * reference device included. RewardMoment.tsx answers that by DRAWING the ten
 * digits as a rounded monoline, which is the only part of the face this screen
 * ever needs.
 *
 * The risk a drawn face carries is a missing glyph, and a missing glyph on the
 * one number the whole screen is about is the worst place in the product for
 * one. So: every digit exists, and the box arithmetic streak.css sizes the
 * hero from is the same arithmetic the component draws with.
 */
describe("the drawn hero number", () => {
  it("draws every digit the engine can pay", () => {
    for (let digit = 0; digit <= 9; digit += 1) {
      expect(heroNumberWidth(digit), `digit ${digit} has no drawn width`).toBeGreaterThan(0);
    }
  });

  it("widens with the total, so a four digit clear cannot render inside a two digit box", () => {
    expect(heroNumberWidth(9)).toBeLessThan(heroNumberWidth(42));
    expect(heroNumberWidth(42)).toBeLessThan(heroNumberWidth(185));
    expect(heroNumberWidth(185)).toBeLessThan(heroNumberWidth(1850));
  });

  it("gives the 1 a narrower advance, which is what proportional spacing means", () => {
    // 11 against 88: same digit count, and a face that reported the same width
    // for both would be drawing a monospace grid rather than a rounded face.
    expect(heroNumberWidth(11)).toBeLessThan(heroNumberWidth(88));
  });

  it("puts a two digit total at about the reference's aspect", () => {
    // The image's 42 is roughly 56 percent of a 390 pt screen wide and 20
    // percent of 844 tall, an aspect of about 1.2. streak.css sizes the box
    // as min(56vw, 20vh * aspect), so this ratio is what decides which of the
    // two limits a common total lands on.
    const aspect = heroNumberWidth(42) / 100;
    expect(aspect).toBeGreaterThan(1.1);
    expect(aspect).toBeLessThan(1.35);
  });
});
