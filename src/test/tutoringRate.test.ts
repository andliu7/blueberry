import { describe, expect, it } from "vitest";
import {
  DEFAULT_PAY_RULES,
  amountCents,
  dollars,
  monthsBeforeUTC,
  payChecks,
  rateCents,
  type TutorStats,
} from "@/lib/tutoring/rules";
import { AT, FULL_NEXT_SESSION, MODEL_TUTORS, statsAtAT } from "@/lib/tutoring/modelCases";

/**
 * The tutor pay rule (owner, 23 Oct): $25, or $30 with 6 months AND good
 * ratings AND enough lessons AND referrals. The same model tutors are priced by
 * the database in supabase/rls-tests/tutoring.sql.
 */

const full = MODEL_TUTORS.find((t) => t.key === "full")!;
const fullStats = statsAtAT(full);

describe("model tutors at AT", () => {
  for (const t of MODEL_TUTORS) {
    it(`${t.key} is paid ${t.expectedCents} cents`, () => {
      expect(rateCents(t.startedAt, statsAtAT(t), DEFAULT_PAY_RULES, AT)).toBe(t.expectedCents);
    });
  }

  it("prices the full tutor's next session at the raised rate", () => {
    expect(rateCents(full.startedAt, fullStats, DEFAULT_PAY_RULES, FULL_NEXT_SESSION.end)).toBe(
      FULL_NEXT_SESSION.expectedCents,
    );
  });

  it("names the one unmet check for each edge tutor", () => {
    const unmet = (key: string) => {
      const t = MODEL_TUTORS.find((m) => m.key === key)!;
      const c = payChecks(t.startedAt, statsAtAT(t), DEFAULT_PAY_RULES, AT);
      return (["tenure", "rating", "lessons", "referrals"] as const).filter((k) => !c[k]);
    };
    expect(unmet("full")).toEqual([]);
    expect(unmet("months59")).toEqual(["tenure"]);
    expect(unmet("rating44")).toEqual(["rating"]);
    expect(unmet("ratingCount4")).toEqual(["rating"]);
    expect(unmet("lessons19")).toEqual(["lessons"]);
    expect(unmet("referrals1")).toEqual(["referrals"]);
  });
});

describe("each threshold flips on its own", () => {
  const price = (startedAt: Date, stats: TutorStats) => rateCents(startedAt, stats, DEFAULT_PAY_RULES, AT);

  it("6.0 months qualifies, 5.9 does not, and one millisecond short does not", () => {
    expect(price(new Date("2026-05-02T17:00:00Z"), fullStats)).toBe(3000);
    expect(price(new Date("2026-05-05T17:00:00Z"), fullStats)).toBe(2500);
    expect(price(new Date("2026-05-02T17:00:00.001Z"), fullStats)).toBe(2500);
  });

  it("an average of 4.5 qualifies, 4.4 does not", () => {
    expect(price(full.startedAt, { ...fullStats, ratingSum: 45, ratingCount: 10 })).toBe(3000);
    expect(price(full.startedAt, { ...fullStats, ratingSum: 44, ratingCount: 10 })).toBe(2500);
  });

  it("5 ratings qualify, 4 do not, at the same average", () => {
    expect(price(full.startedAt, { ...fullStats, ratingSum: 25, ratingCount: 5 })).toBe(3000);
    expect(price(full.startedAt, { ...fullStats, ratingSum: 18, ratingCount: 4 })).toBe(2500);
  });

  it("20 lessons qualify, 19 do not", () => {
    expect(price(full.startedAt, { ...fullStats, lessons: 20 })).toBe(3000);
    expect(price(full.startedAt, { ...fullStats, lessons: 19 })).toBe(2500);
  });

  it("2 referrals qualify, 1 does not", () => {
    expect(price(full.startedAt, { ...fullStats, referrals: 2 })).toBe(3000);
    expect(price(full.startedAt, { ...fullStats, referrals: 1 })).toBe(2500);
  });
});

describe("months, as Postgres counts them", () => {
  it("clamps the day at a month's end", () => {
    expect(monthsBeforeUTC(new Date("2026-08-31T09:30:00Z"), 6).toISOString()).toBe("2026-02-28T09:30:00.000Z");
    expect(monthsBeforeUTC(new Date("2028-08-31T09:30:00Z"), 6).toISOString()).toBe("2028-02-29T09:30:00.000Z");
  });

  it("crosses a year", () => {
    expect(monthsBeforeUTC(new Date("2027-03-15T00:00:00Z"), 6).toISOString()).toBe("2026-09-15T00:00:00.000Z");
  });

  it("is AT minus 6 months for the model cases", () => {
    expect(monthsBeforeUTC(AT, 6).toISOString()).toBe("2026-05-02T17:00:00.000Z");
  });
});

describe("admin-edited benchmarks move the line", () => {
  it("raising min lessons to 21 drops the full tutor", () => {
    expect(rateCents(full.startedAt, fullStats, { ...DEFAULT_PAY_RULES, minLessons: 21 }, AT)).toBe(2500);
  });

  it("lowering min months to 3 lifts the 5.9 month tutor", () => {
    const m = MODEL_TUTORS.find((t) => t.key === "months59")!;
    expect(rateCents(m.startedAt, statsAtAT(m), { ...DEFAULT_PAY_RULES, minMonths: 3 }, AT)).toBe(3000);
  });

  it("new rates are what is paid", () => {
    const rules = { ...DEFAULT_PAY_RULES, baseRateCents: 2600, raisedRateCents: 3200 };
    expect(rateCents(full.startedAt, fullStats, rules, AT)).toBe(3200);
    expect(rateCents(full.startedAt, { ...fullStats, lessons: 0 }, rules, AT)).toBe(2600);
  });

  it("compares a fractional average without float drift", () => {
    // 4.3 * 3 is 12.899999999999999 in floats; a sum of 13 over 3 ratings clears 4.3.
    const rules = { ...DEFAULT_PAY_RULES, minAvgRating: 4.3, minRatings: 3 };
    expect(payChecks(full.startedAt, { ...fullStats, ratingSum: 13, ratingCount: 3 }, rules, AT).rating).toBe(true);
    expect(payChecks(full.startedAt, { ...fullStats, ratingSum: 12, ratingCount: 3 }, rules, AT).rating).toBe(false);
  });
});

describe("amounts", () => {
  it("pays an hour at the hourly rate, rounded to the cent", () => {
    expect(amountCents(60, 2500)).toBe(2500);
    expect(amountCents(90, 3000)).toBe(4500);
    expect(amountCents(50, 2500)).toBe(2083);
  });

  it("prints whole and part dollars", () => {
    expect(dollars(2500)).toBe("$25");
    expect(dollars(2750)).toBe("$27.50");
  });
});
