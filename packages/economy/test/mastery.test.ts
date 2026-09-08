/**
 * Mastery, and the four presentation rules ECONOMY.md calls not optional: never
 * render decay as a loss, cap the visible dip at 2 a day, ranks have a floor,
 * and lead with the claim rather than the number.
 *
 * The model is the one the brief fixes: strength 1.0 on a clear, exponential
 * decay with a half life that starts at 7 days and doubles on every successful
 * review, and a score of 100 times the difficulty weighted strength of the
 * cleared nodes over the difficulty of the COURSE.
 *
 * THE DENOMINATOR, and it is the thing to read twice. ECONOMY.md says mastery is
 * "0 to 100 per course", so the honest denominator is every node of the course,
 * cleared or not, which the caller hands in as `{ universe }`. A caller that
 * names no universe gets the unlocked set instead, floored at
 * MASTERY_MIN_UNIVERSE_DIFFICULTY, because a journal whose first event is a clear
 * unlocks exactly one node and would otherwise read as one of one: 100 percent,
 * Exam Ready, and every rank award paid for a single lesson. The floor applies
 * to a named course too, because three of the four content courses are currently
 * narrower than it; MASTERY_MIN_UNIVERSE_DIFFICULTY carries that reasoning.
 *
 * So the fixtures here name courses at or above the floor, which is what a
 * course the student is really measured against looks like. Tests about the
 * DECAY CURVE use a ten node course at difficulty 5, because 100 * 5 / 50 is 10
 * and the halvings off it are exact: the number moving is the strength and
 * nothing else.
 */

import { describe, expect, it } from "vitest";
import { deriveEconomy } from "../src/derive.ts";
import type { EconomyEvent } from "../src/journal.ts";
import { at, cleared, started, TZ } from "./helpers.ts";

const DAY = "2026-08-03";

function plusDays(date: string, days: number): string {
  return new Date(Date.parse(`${date}T00:00:00Z`) + days * 86_400_000).toISOString().slice(0, 10);
}

/** A course of `count` nodes named the way the fixtures name them. */
function course(count: number, difficulty: 1 | 2 | 3 | 4 | 5 = 3) {
  return { universe: Array.from({ length: count }, (unused, i) => ({ nodeId: `n${i}`, difficulty })) };
}

describe("the score", () => {
  it("is zero for a student who has cleared nothing", () => {
    const journal = Array.from({ length: 10 }, (unused, i) => started(`n${i}`, "tutorial", DAY, "09:00"));
    expect(deriveEconomy(journal, at(DAY, "12:00")).mastery.score).toBe(0);
    expect(deriveEconomy(journal, at(DAY, "12:00")).mastery.rank).toBe("Reader");
  });

  it("moves about a point on one node, against a hundred node pathway", () => {
    const unlockedOnly = Array.from({ length: 100 }, (unused, i) => started(`n${i}`, "tutorial", DAY, "09:00"));
    const before = deriveEconomy(unlockedOnly, at(DAY, "12:00")).mastery.score;
    const after = deriveEconomy([...unlockedOnly, cleared("n0", "concept", DAY, { time: "10:00" })], at(DAY, "12:00")).mastery
      .score;
    expect(before).toBe(0);
    expect(after).toBeGreaterThan(0.8);
    expect(after).toBeLessThan(1.2);
  });

  it("moves about a point on one node against a hundred node COURSE, with nothing unlocked", () => {
    // ECONOMY.md: "A single node should move it a point at most." The course is
    // the denominator, so this holds on a fresh journal that has unlocked
    // nothing else, which is exactly the case the unlocked-set fallback got wrong.
    const journal = [cleared("n0", "concept", DAY, { time: "12:00" })];
    const score = deriveEconomy(journal, at(DAY, "12:00"), course(100)).mastery.score;
    expect(score).toBe(1);
  });

  it("keeps a first clear inside Reader against a small forty node course", () => {
    // 100 * 3 / 120. Even a single unit sized course leaves a first clear far
    // below Arrow Pusher at 16, which is the claim the rank makes.
    const journal = [cleared("n0", "concept", DAY, { time: "12:00" })];
    const snapshot = deriveEconomy(journal, at(DAY, "12:00"), course(40));
    expect(snapshot.mastery.score).toBe(2.5);
    expect(snapshot.mastery.rank).toBe("Reader");
  });

  it("floors the denominator when no course is named, so a first clear is not a whole course", () => {
    // THE BUG THIS FILE EXISTS TO PIN. The web shell journals a clear without
    // ever journalling node_started, so the unlocked set is one node. Divided by
    // itself that is 100, Exam Ready, and a receipt paying every rank award for
    // one lesson. Floored at MASTERY_MIN_UNIVERSE_DIFFICULTY it is 100 * 3 / 40.
    const journal = [cleared("n0", "concept", DAY, { time: "12:00" })];
    const snapshot = deriveEconomy(journal, at(DAY, "12:00"));
    expect(snapshot.mastery.score).toBe(7.5);
    expect(snapshot.mastery.rank).toBe("Reader");
    expect(snapshot.mastery.floorRank).toBe("Reader");
    // Ten for the clear, and not one diamond of rank money.
    expect(snapshot.diamonds.earned).toBe(10);
  });

  it("weights a hard node above an easy one", () => {
    const unlockedOnly = [started("easy", "concept", DAY, "09:00"), started("hard", "concept", DAY, "09:00")];
    const easy = deriveEconomy([...unlockedOnly, cleared("easy", "concept", DAY, { time: "10:00", difficulty: 1 })], at(DAY, "12:00"));
    const hard = deriveEconomy([...unlockedOnly, cleared("hard", "concept", DAY, { time: "10:00", difficulty: 5 })], at(DAY, "12:00"));
    expect(hard.mastery.score).toBeGreaterThan(easy.mastery.score);
  });

  it("counts every unlocked node in the denominator, cleared or not", () => {
    // Read at the instant of the clear, so decay is not also in the number.
    // Twenty unlocked nodes at difficulty 3 is 60, well above the floor, so this
    // measures dilution by the unlocked set and not the floor.
    const now = at(DAY, "10:00");
    const unlocked = Array.from({ length: 20 }, (unused, i) => started(`n${i}`, "tutorial", DAY, "09:00"));
    const clears = (count: number) =>
      Array.from({ length: count }, (unused, i) => cleared(`n${i}`, "concept", DAY, { time: "10:00" }));
    expect(deriveEconomy([...unlocked, ...clears(10)], now).mastery.score).toBe(50);
    expect(deriveEconomy([...unlocked, ...clears(20)], now).mastery.score).toBe(100);
  });

  it("counts every node of the named course in the denominator, unlocked or not", () => {
    const now = at(DAY, "10:00");
    const clears = Array.from({ length: 10 }, (unused, i) => cleared(`n${i}`, "concept", DAY, { time: "10:00" }));
    // Nothing but the ten clears is in the journal. The nodes of the course it
    // has never touched still divide, which is the whole point of naming one.
    expect(deriveEconomy(clears, now, course(20)).mastery.score).toBe(50);
    expect(deriveEconomy(clears, now, course(40)).mastery.score).toBe(25);
  });

  it("never exceeds 100, even when the journal clears a node the course does not name", () => {
    const now = at(DAY, "10:00");
    // Fourteen nodes at 3 is 42, so the floor is inert and this is about the
    // stray node alone. It is added to BOTH sides: it counts for the student,
    // and it widens what they are counted out of, so the fraction cannot pass 1.
    const whole = Array.from({ length: 14 }, (unused, i) => cleared(`n${i}`, "concept", DAY, { time: "10:00" }));
    const outside = cleared("bonus", "concept", DAY, { time: "10:00", difficulty: 5 });
    const both = deriveEconomy([...whole, outside], now, course(14));
    expect(both.mastery.score).toBe(100);
    expect(both.mastery.score).toBeLessThanOrEqual(100);
    // The stray node alone is 5 over 42 plus 5, so it dilutes rather than inflates.
    expect(deriveEconomy([outside], now, course(14)).mastery.score).toBeLessThan(100 / 9);
  });

  it("caps a course narrower than the floor below 100, however much of it is cleared", () => {
    // General Chemistry I homes three topics today. Clearing all three is
    // 100 * 9 / 40, not 100, because "Exam Ready" is a claim a three topic stub
    // does not back. This binds until those courses are authored past the floor.
    const now = at(DAY, "10:00");
    const all = Array.from({ length: 3 }, (unused, i) => cleared(`n${i}`, "concept", DAY, { time: "10:00" }));
    const snapshot = deriveEconomy(all, now, course(3));
    expect(snapshot.mastery.score).toBe(22.5);
    expect(snapshot.mastery.rank).toBe("Arrow Pusher");
  });
});

describe("decay", () => {
  /**
   * One node of a ten node course, every node difficulty 5. The denominator is
   * 50, above the floor and out of the way, so a node at full strength is
   * exactly 10 points and each halving is exactly half of those.
   */
  const single = [cleared("n0", "concept", DAY, { time: "12:00", difficulty: 5 })];
  const solo = course(10, 5);

  it("halves the strength of a cleared node after seven days", () => {
    expect(deriveEconomy(single, at(DAY, "12:00"), solo).mastery.score).toBe(10);
    expect(deriveEconomy(single, at(plusDays(DAY, 7), "12:00"), solo).mastery.score).toBe(5);
    expect(deriveEconomy(single, at(plusDays(DAY, 14), "12:00"), solo).mastery.score).toBe(2.5);
  });

  it("doubles the half life on a review clear, so the second seven days cost nothing", () => {
    const reviewed = [...single, cleared("n0", "concept", plusDays(DAY, 7), { time: "12:00", difficulty: 5 })];
    // Back to 1.0 at the review, then a 14 day half life from there.
    expect(deriveEconomy(reviewed, at(plusDays(DAY, 7), "12:00"), solo).mastery.score).toBe(10);
    expect(deriveEconomy(reviewed, at(plusDays(DAY, 21), "12:00"), solo).mastery.score).toBe(5);
  });

  it("treats a correct attempt after the clear as a review too", () => {
    const attempt: EconomyEvent = {
      kind: "attempt",
      at: at(plusDays(DAY, 7), "12:00"),
      tz: TZ,
      nodeId: "n0",
      problemId: "p1",
      correct: true,
    };
    const reviewed = [...single, attempt];
    expect(deriveEconomy(reviewed, at(plusDays(DAY, 21), "12:00"), solo).mastery.score).toBe(5);
  });

  it("does not treat the attempts that made up the first clear as reviews", () => {
    const attempt: EconomyEvent = {
      kind: "attempt",
      at: at(DAY, "11:59"),
      tz: TZ,
      nodeId: "n0",
      problemId: "p1",
      correct: true,
    };
    // The attempt precedes the clear, so the half life is still the starting 7 days.
    expect(deriveEconomy([attempt, ...single], at(plusDays(DAY, 7), "12:00"), solo).mastery.score).toBe(5);
  });

  it("names the cleared nodes whose strength has fallen under a half", () => {
    const two = [cleared("fresh", "concept", plusDays(DAY, 8), { time: "12:00" }), ...single];
    const snapshot = deriveEconomy(two, at(plusDays(DAY, 8), "12:00"));
    expect(snapshot.mastery.cracking).toEqual(["n0"]);
  });

  it("does not call a node cracking at exactly the threshold", () => {
    expect(deriveEconomy(single, at(plusDays(DAY, 7), "12:00")).mastery.cracking).toEqual([]);
  });
});

describe("the presentation rules", () => {
  /**
   * A ten node course at difficulty 5, cleared to the last node in one sitting.
   * That is what a student at 100 looks like, and reaching the top honestly is
   * what these rules are about: they are display rules for a real high score,
   * not arithmetic about the denominator.
   */
  const whole = Array.from({ length: 10 }, (unused, i) =>
    cleared(`n${i}`, "concept", DAY, { time: "12:00", difficulty: 5 }),
  );
  const solo = course(10, 5);

  it("caps the visible dip at two points a day, however harsh the model is", () => {
    const now = at(plusDays(DAY, 7), "12:00");
    const snapshot = deriveEconomy(whole, now, solo);
    // The model has fallen 50 points in a week. The display has fallen 14.
    expect(snapshot.mastery.score).toBe(50);
    expect(snapshot.mastery.visible).toBeGreaterThan(80);
    expect(snapshot.mastery.visible).toBeLessThan(82);
  });

  it("lets the visible number rise as fast as the model does", () => {
    // Zero to the top inside one day, so no day boundary can have smoothed it.
    const snapshot = deriveEconomy(whole, at(DAY, "12:00"), solo);
    expect(snapshot.mastery.score).toBeGreaterThan(99);
    expect(snapshot.mastery.visible).toBeGreaterThan(99);
  });

  it("never lowers a rank once it has been reached", () => {
    const snapshot = deriveEconomy(whole, at(plusDays(DAY, 7), "12:00"), solo);
    expect(snapshot.mastery.rank).toBe("Retrosynthesist");
    expect(snapshot.mastery.floorRank).toBe("Exam Ready");
  });

  it("names the next rank and what it takes to reach it", () => {
    const journal = Array.from({ length: 100 }, (unused, i) => started(`n${i}`, "tutorial", DAY, "09:00"));
    const snapshot = deriveEconomy(journal, at(DAY, "12:00"));
    expect(snapshot.mastery.rank).toBe("Reader");
    expect(snapshot.mastery.nextRank).toEqual({ name: "Arrow Pusher", at: 16 });
  });

  it("has no next rank at the top", () => {
    expect(deriveEconomy(whole, at(DAY, "12:00"), solo).mastery.nextRank).toBeNull();
  });

  it("pays a rank award once, on the floor rank, however far the score later sags", () => {
    const early = deriveEconomy(whole, at(DAY, "12:00"), solo);
    const late = deriveEconomy(whole, at(plusDays(DAY, 30), "12:00"), solo);
    // 125 four times plus 250 for Exam Ready, on top of 10 for each of the ten clears.
    expect(early.diamonds.earned).toBe(10 * 10 + 125 * 4 + 250);
    expect(late.diamonds.earned).toBe(early.diamonds.earned);
  });

  it("pays no rank award for a first clear of that same course", () => {
    // One of the ten, not ten of ten. The rank money above is what finishing a
    // course pays, and it is never what one lesson pays.
    const first = whole.slice(0, 1);
    const snapshot = deriveEconomy(first, at(DAY, "12:00"), solo);
    expect(snapshot.mastery.rank).toBe("Reader");
    expect(snapshot.diamonds.earned).toBe(10);
  });
});
