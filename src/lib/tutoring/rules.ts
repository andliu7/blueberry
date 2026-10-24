/**
 * The tutor pay rule, as plain functions.
 *
 * The rule that pays people lives in the database (tutor_rate_basis in
 * supabase/migrations/20261024120000_tutoring.sql), and the ledger is written
 * there by a trigger. This file is its mirror: the tests pin both to the same
 * model tutors (modelCases.ts and supabase/seed.sql), and the admin and tutor
 * pages use it to name which benchmark is still unmet. Nothing here decides
 * what anyone is paid.
 *
 * Owner decision, 2026-10-23: $25 an hour, $30 once a tutor has 6 months with
 * Blueberry AND good ratings AND a minimum number of lessons AND referrals.
 * The numbers are admin-editable, so every function takes them as `rules`.
 */

export interface PayRules {
  baseRateCents: number;
  raisedRateCents: number;
  minMonths: number;
  /** An average, e.g. 4.5. Compared as sums (see payChecks), never rounded. */
  minAvgRating: number;
  minRatings: number;
  minLessons: number;
  minReferrals: number;
}

/** The owner's "easy benchmarks", the same numbers as the tutor_pay_rules defaults. */
export const DEFAULT_PAY_RULES: PayRules = {
  baseRateCents: 2500,
  raisedRateCents: 3000,
  minMonths: 6,
  minAvgRating: 4.5,
  minRatings: 5,
  minLessons: 20,
  minReferrals: 2,
};

/** A tutor's record as tutor_stats counts it, everything before the instant judged at. */
export interface TutorStats {
  ratingSum: number;
  ratingCount: number;
  /** Completed sessions that ended before the instant. */
  lessons: number;
  /** Referred students who completed a session before the instant. */
  referrals: number;
}

export interface PayChecks {
  tenure: boolean;
  rating: boolean;
  lessons: boolean;
  referrals: boolean;
  qualified: boolean;
}

const daysInMonthUTC = (year: number, month: number) => new Date(Date.UTC(year, month + 1, 0)).getUTCDate();

/**
 * `at` minus `n` calendar months, in UTC, clamping the day the way Postgres
 * does: 2026-08-31 minus 6 months is 2026-02-28, same time of day.
 * (JavaScript's own setUTCMonth would roll over to March 3 instead.)
 */
export function monthsBeforeUTC(at: Date, n: number): Date {
  const total = at.getUTCFullYear() * 12 + at.getUTCMonth() - n;
  const year = Math.floor(total / 12);
  const month = total - year * 12;
  const day = Math.min(at.getUTCDate(), daysInMonthUTC(year, month));
  return new Date(
    Date.UTC(year, month, day, at.getUTCHours(), at.getUTCMinutes(), at.getUTCSeconds(), at.getUTCMilliseconds()),
  );
}

/**
 * Each benchmark on its own, so a page can say which one is missing.
 *
 * The rating check is `sum >= minAvg * count`, done in hundredths so a float
 * like 4.3 * 3 cannot land a hair under the line. The database does the same
 * with exact numerics.
 */
export function payChecks(startedAt: Date, stats: TutorStats, rules: PayRules, at: Date): PayChecks {
  const tenure = startedAt.getTime() <= monthsBeforeUTC(at, rules.minMonths).getTime();
  const rating =
    stats.ratingCount >= rules.minRatings &&
    stats.ratingSum * 100 >= Math.round(rules.minAvgRating * 100) * stats.ratingCount;
  const lessons = stats.lessons >= rules.minLessons;
  const referrals = stats.referrals >= rules.minReferrals;
  return { tenure, rating, lessons, referrals, qualified: tenure && rating && lessons && referrals };
}

export function rateCents(startedAt: Date, stats: TutorStats, rules: PayRules, at: Date): number {
  return payChecks(startedAt, stats, rules, at).qualified ? rules.raisedRateCents : rules.baseRateCents;
}

/** What a session of `minutes` earns at `rate` cents an hour, rounded to the cent. */
export const amountCents = (minutes: number, rate: number) => Math.round((rate * minutes) / 60);

/** "$25" or "$27.50". */
export function dollars(cents: number): string {
  return cents % 100 === 0 ? `$${cents / 100}` : `$${(cents / 100).toFixed(2)}`;
}
