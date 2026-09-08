/**
 * The charge meter's model, against real snapshots from real journals.
 *
 * Nothing here builds an EconomySnapshot by hand and nothing here reads the
 * host clock. Every case is a journal plus an explicit `now`, run through
 * `deriveEconomy`, so a price that moves in packages/economy shows up as a
 * failing sentence rather than as a fixture that quietly still passes, and a
 * test that ran green in the morning cannot go red after dark. That second half
 * is a rule this run learned the hard way and wrote down: see
 * `apps/web/measurements/gauntlet-economy/LOG.md`, "The instruments that only
 * worked before dark".
 *
 * THE TWO LOAD BEARING BLOCKS ARE THE LAST TWO.
 *
 * `mistakes never cost charge` is docs/ECONOMY.md's Charge rule 2, which that
 * file calls "load bearing. Do not let this drift", and which
 * docs/THREE-TEACHERS.md then corroborates from outside: the bar's newer energy
 * system deducts on every question, right or wrong, and is reported as feeling
 * more restrictive than the hearts it replaced. The economy package proves the
 * arithmetic; this block proves the PICTURE, which is where a student would
 * actually see a change. It appends wrong attempts and asserts the meter is
 * drawn identically, down to the sentence under it.
 *
 * `the exam window replaces the meter` is the other one. ECONOMY.md switches
 * Charge off for the fortnight before the exam and calls that "the whole
 * ethical argument for the mechanic in one gesture", and a meter drawn full is
 * still a meter a student counts. So the assertion is not that the fill is 1,
 * it is that there is NOTHING TO FILL: no fractions, no flask liquid, no glow,
 * and a badge in its place.
 */

import { describe, expect, it } from "vitest";
import {
  CHARGE_CAP,
  CHARGE_COST,
  CHARGE_REGEN_MINUTES,
  deriveEconomy,
  type EconomyEvent,
} from "@blueberry/economy";
import { chargeMeterModel } from "../charge/chargeMeterModel";

const TZ = "UTC";
/** A fixed instant. Every `now` in this file is this or an offset from it. */
const NOW = "2026-08-28T14:00:00.000Z";

function minutesAgo(minutes: number): string {
  return new Date(Date.parse(NOW) - minutes * 60_000).toISOString();
}

function daysAgo(days: number): string {
  return new Date(Date.parse(NOW) - days * 86_400_000).toISOString();
}

/** Entering a node is what spends charge. Never per question. */
function started(nodeId: string, at: string): EconomyEvent {
  return { kind: "node_started", at, tz: TZ, nodeId, nodeKind: "reaction" };
}

/** A wrong answer, journalled. It earns nothing and it costs nothing. */
function wrong(nodeId: string, problemId: string, at: string): EconomyEvent {
  return { kind: "attempt", at, tz: TZ, nodeId, problemId, correct: false };
}

function meter(journal: readonly EconomyEvent[], spend = 0, now = NOW) {
  return chargeMeterModel(deriveEconomy(journal, now), { spend });
}

/** What the derivation says is left, for a test that must never guess. */
function chargeLeft(journal: readonly EconomyEvent[], now = NOW): number {
  return deriveEconomy(journal, now).charge.current;
}

/**
 * Node entries, all within the last half hour so none of them has regenerated,
 * until the meter reads zero.
 *
 * It re-derives rather than counting, because "spend until the number is 0" is
 * a claim about the engine and this file is not allowed to hold a second
 * opinion about the engine.
 */
function drainToZero(): EconomyEvent[] {
  const events: EconomyEvent[] = [];
  for (let i = 0; i < 12 && chargeLeft(events) > 0; i += 1) {
    events.push(started(`seed:${i}`, minutesAgo(25 - i)));
  }
  return events;
}

/** One reaction node entered, so the meter sits partway down with nothing in flight. */
const PARTIAL: readonly EconomyEvent[] = [started("seed:one", minutesAgo(10))];

/** The exam is nine days out, which is inside ECONOMY.md's fortnight. */
const EXAM: readonly EconomyEvent[] = [
  { kind: "settings", at: daysAgo(20), tz: TZ, dailyGoal: "regular", examDate: "2026-09-06" },
];

describe("full", () => {
  it("is the state of a meter at the cap, and it is the only state that glows", () => {
    const full = meter([]);
    expect(full.state).toBe("full");
    expect(full.current).toBe(CHARGE_CAP);
    expect(full.keepFraction).toBe(1);
    expect(full.leaveFraction).toBe(0);
    expect(full.glow).toBe(true);
    expect(full.spendingNow).toBe(false);
    // The states sheet fills the full capsule with the goal green and the flask
    // with the same liquid.
    expect(full.flask).toBe("progress");
    // A partial meter AT REST keeps the green, and loses only the halo.
    // DESIGN-GOALS: green is the progress semantic on filled bars, and this is
    // a filled bar. Colouring by state would flip the whole capsule from green
    // to violet between 30 of 30 and 29 of 30, which announces a change that
    // did not happen. What earns the violet is charge actually going out.
    const partial = meter(PARTIAL);
    expect(partial.glow).toBe(false);
    expect(partial.spendingNow).toBe(false);
    expect(partial.flask).toBe("progress");
    expect(meter([], CHARGE_COST.reaction).spendingNow).toBe(true);
    expect(meter([], CHARGE_COST.reaction).flask).toBe("charge");
    // And a meter at the cap with a spend in flight is NOT glowing, because
    // something is leaving it.
    expect(meter([], CHARGE_COST.reaction).glow).toBe(false);
  });

  it("says what it is rather than what it looks like", () => {
    expect(meter([]).label).toBe(`Charge full, ${CHARGE_CAP} of ${CHARGE_CAP}`);
  });

  it("has no point on its way back, because there is nowhere for one to land", () => {
    expect(meter([]).nextFraction).toBe(0);
  });
});

describe("spending", () => {
  it("draws the cost as the stretch beyond the fill, and carries the number", () => {
    const spend = CHARGE_COST.reaction;
    const going = meter([], spend);
    expect(going.state).toBe("spending");
    expect(going.spend).toBe(spend);
    expect(going.keepFraction).toBeCloseTo((CHARGE_CAP - spend) / CHARGE_CAP, 6);
    expect(going.leaveFraction).toBeCloseTo(spend / CHARGE_CAP, 6);
    // The states sheet draws a bare minus; the number is what the state
    // actually is, and nothing on this surface is typed by hand.
    expect(going.chipLabel).toBe(`-${spend}`);
  });

  it("stands the chip over the middle of what is leaving, not at the end of the meter", () => {
    const spend = CHARGE_COST.reaction;
    const going = meter([], spend);
    expect(going.chipAt).toBeCloseTo(going.keepFraction + going.leaveFraction / 2, 6);
    expect(going.chipAt).toBeGreaterThan(going.keepFraction);
    expect(going.chipAt).toBeLessThan(going.keepFraction + going.leaveFraction);
  });

  it("covers the resting partial meter too, which is why there is no fifth state", () => {
    const resting = meter(PARTIAL);
    expect(resting.state).toBe("spending");
    expect(resting.spend).toBe(0);
    expect(resting.leaveFraction).toBe(0);
    // No chip, because nothing is going. The chip is what makes a spend visible
    // inside a state that also describes a meter merely sitting below the cap.
    expect(resting.chipLabel).toBe("");
    expect(resting.chipAt).toBe(0);
    expect(resting.keepFraction).toBeCloseTo(chargeLeft(PARTIAL) / CHARGE_CAP, 6);
  });

  it("never draws more leaving than there is, and never draws a negative fill", () => {
    // A cost larger than the balance is a real state: it is what the sheet's
    // own empty state is about. The meter clamps rather than inventing charge
    // to take away, so the picture cannot contradict the sentence beside it.
    const drained = drainToZero();
    const over = meter(drained, CHARGE_COST.quiz);
    expect(over.keepFraction).toBe(0);
    expect(over.leaveFraction).toBe(0);
    expect(over.spend).toBe(0);

    const nearly = meter(PARTIAL, CHARGE_CAP * 4);
    expect(nearly.spend).toBe(chargeLeft(PARTIAL));
    expect(nearly.keepFraction).toBe(0);
    expect(nearly.leaveFraction).toBeCloseTo(chargeLeft(PARTIAL) / CHARGE_CAP, 6);
  });

  it("reads out both numbers when something is going", () => {
    const going = meter([], CHARGE_COST.reaction);
    expect(going.label).toBe(`${CHARGE_CAP} of ${CHARGE_CAP} charge, ${CHARGE_COST.reaction} leaving`);
  });
});

describe("empty", () => {
  it("is the picture of a meter at zero: no fill, a dry flask, nothing glowing", () => {
    const drained = drainToZero();
    expect(chargeLeft(drained)).toBe(0);
    const empty = meter(drained);
    expect(empty.state).toBe("empty");
    expect(empty.keepFraction).toBe(0);
    expect(empty.leaveFraction).toBe(0);
    expect(empty.flask).toBe("dry");
    expect(empty.glow).toBe(false);
  });

  it("says the quiet part out loud, because every limiter a student has met priced mistakes", () => {
    const empty = meter(drainToZero());
    // docs/ECONOMY.md's Charge rule 2, printed where the states sheet prints
    // it. The reassurance is the feature, not decoration: see
    // docs/THREE-TEACHERS.md on the bar's newer energy system.
    expect(empty.caption).toContain("Mistakes never cost charge");
    expect(empty.caption).toContain("Refills on its own");
    expect(empty.label).toContain("refills on its own");
    expect(empty.label).toContain("mistakes never cost charge");
  });

  it("is the only state that carries a caption, so the sentence lands where it is doubted", () => {
    expect(meter([]).caption).toBe("");
    expect(meter(PARTIAL).caption).toBe("");
    expect(meter([], CHARGE_COST.reaction).caption).toBe("");
    expect(meter(EXAM).caption).toBe("");
  });

  it("reads the point on its way back from the clock, and never counts it down itself", () => {
    const drained = drainToZero();
    /*
     * READINGS OF ONE JOURNAL AT THREE INSTANTS. The fraction moves because the
     * clock moved, not because anything ticked: docs/ECONOMY.md's Anti-abuse
     * rule, "computed from server time on read, never accumulated by a client
     * tick".
     *
     * THE OFFSETS ARE DERIVED FROM `nextRegenAt`, NOT PICKED. A first draft of
     * this test stepped a fixed ten minutes and asserted the fraction had
     * grown, and it was WRONG rather than flaky: NOW happened to sit five
     * minutes short of a regeneration boundary, so ten minutes later a point
     * had landed and the next one had correctly restarted near zero. The test
     * was asserting monotonic where the real property is a sawtooth. Both teeth
     * are asserted here, and the boundary is read off the derivation so no
     * offset in this file is a guess about where in the interval NOW sits.
     */
    const snapshot = deriveEconomy(drained, NOW);
    const nextAt = snapshot.charge.nextRegenAt;
    expect(nextAt).not.toBeNull();
    const remainingMs = Date.parse(String(nextAt)) - Date.parse(NOW);
    expect(remainingMs).toBeGreaterThan(0);
    expect(remainingMs).toBeLessThanOrEqual(CHARGE_REGEN_MINUTES * 60_000);

    const inside = new Date(Date.parse(NOW) + remainingMs / 2).toISOString();
    const past = new Date(Date.parse(NOW) + remainingMs + 60_000).toISOString();

    const first = meter(drained, 0, NOW).nextFraction;
    const halfway = meter(drained, 0, inside).nextFraction;
    expect(first).toBeGreaterThanOrEqual(0);
    expect(halfway).toBeGreaterThan(first);
    expect(halfway).toBeLessThanOrEqual(1);

    // Past the boundary the point has ARRIVED, so the balance is one higher and
    // the fraction starts the next one over. A meter that kept climbing past 1
    // would be drawing a point that already landed as still on its way.
    const after = meter(drained, 0, past);
    expect(after.current).toBe(chargeLeft(drained) + 1);
    expect(after.nextFraction).toBeLessThan(halfway);
  });
});

describe("the exam window replaces the meter rather than filling it", () => {
  it("has nothing to fill: no fractions, no liquid, no glow", () => {
    const exam = meter(EXAM);
    expect(exam.state).toBe("exam");
    // NOT "the fill is 1". A meter drawn full is still a meter, and a student
    // who can see one still counts it. There is no gauge in this state.
    expect(exam.keepFraction).toBe(0);
    expect(exam.leaveFraction).toBe(0);
    expect(exam.flask).toBe("dry");
    expect(exam.glow).toBe(false);
    expect(exam.nextFraction).toBe(0);
  });

  it("names the window, and keeps the countdown off the badge", () => {
    const exam = meter(EXAM);
    expect(exam.examWord).toBe("Exam window");
    expect(exam.examStatus).toBe("paused");
    expect(exam.examDaysLeft).toBe(9);
    // The days are in the accessible name and not on the face of the badge. A
    // badge that counts down is a countdown, and the countdown is the thing
    // this fortnight exists to remove.
    expect(exam.examWord).not.toMatch(/\d/);
    expect(exam.examStatus).not.toMatch(/\d/);
    expect(exam.label).toContain("in 9 days");
    expect(exam.label).toContain("paused");
  });

  it("holds even with a cost in flight, because in this fortnight nothing has one", () => {
    const exam = meter(EXAM, CHARGE_COST.reaction);
    expect(exam.state).toBe("exam");
    expect(exam.spend).toBe(0);
    expect(exam.chipLabel).toBe("");
  });

  it("goes back to being a meter once the exam is behind the student", () => {
    const after = meter(
      [{ kind: "settings", at: daysAgo(40), tz: TZ, dailyGoal: "regular", examDate: "2026-08-01" }],
    );
    expect(after.state).toBe("full");
    expect(after.examDaysLeft).toBeNull();
    expect(after.examWord).toBe("");
  });
});

describe("mistakes never cost charge, and the meter never says otherwise", () => {
  /**
   * The same account, once clean and once with fifteen wrong answers in it.
   *
   * ECONOMY.md's Charge table prices a wrong answer at 0 and calls the row load
   * bearing; THREE-TEACHERS records the bar trying the other thing and reading
   * worse for it. This asserts the whole picture is identical, not just the
   * balance: same fill, same flask, same glow, same words. A drift that priced
   * a mistake would have to change one of these to be visible at all, and if it
   * changed none of them it did not happen.
   */
  const base: readonly EconomyEvent[] = [started("u3-arenium", minutesAgo(9))];
  const withMistakes: readonly EconomyEvent[] = [
    ...base,
    ...Array.from({ length: 15 }, (_unused, i) => wrong("u3-arenium", `p-${i}`, minutesAgo(8 - i * 0.4))),
  ];

  it("draws the identical meter at rest", () => {
    expect(meter(withMistakes)).toEqual(meter(base));
  });

  it("draws the identical meter with a spend in flight", () => {
    const spend = CHARGE_COST.concept;
    expect(meter(withMistakes, spend)).toEqual(meter(base, spend));
  });

  it("draws the identical meter at zero, where a student is most likely to suspect otherwise", () => {
    const drained = drainToZero();
    const drainedAndWrong = [
      ...drained,
      ...Array.from({ length: 9 }, (_unused, i) => wrong("seed:0", `q-${i}`, minutesAgo(4 - i * 0.3))),
    ];
    expect(chargeLeft(drainedAndWrong)).toBe(0);
    expect(meter(drainedAndWrong)).toEqual(meter(drained));
  });

  it("keeps the promise in the copy, not only in the arithmetic", () => {
    // A build that got the numbers right and dropped the sentence would pass
    // every test above and lose the thing the surface is for.
    expect(meter(drainToZero()).caption).toContain("Mistakes never cost charge");
  });
});
