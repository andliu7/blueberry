import type { TutorStats } from "./rules";

/**
 * The model tutors: one per edge of the pay rule, judged at one fixed instant.
 *
 * The same tutors are loaded into the local database by supabase/seed.sql and
 * checked there by supabase/rls-tests/tutoring.sql, so the TypeScript mirror
 * and the SQL are held to the same numbers. src/test/tutoringSqlMirror.test.ts
 * fails if an email here is missing from the seed.
 *
 * Why 10 ratings and not 5 for the rating edges: an average of exactly 4.5 over
 * 5 whole-star ratings needs a sum of 22.5, which cannot happen. Ten ratings
 * can: five 5s and five 4s is 4.5; four 5s and six 4s is 4.4.
 */

/** Every model case is judged here. Before it: 6 months back is 2026-05-02T17:00Z. */
export const AT = new Date("2026-11-02T17:00:00Z");

/** The first historical lesson; lesson i starts i - 1 days later (seed.sql does the same). */
export const FIRST_LESSON = new Date("2026-08-01T14:00:00Z");

export interface ModelTutor {
  key: string;
  email: string;
  name: string;
  startedAt: Date;
  /** Stars on the first stars.length lessons, rated an hour after each ends. */
  stars: number[];
  /** Completed one-hour lessons, one a day from FIRST_LESSON. */
  lessons: number;
  /** Referred students who completed a lesson (they take this tutor's lessons 1, 2...). */
  creditedReferrals: string[];
  /** Referred addresses with an account but no completed session: never counted. */
  uncreditedReferrals: string[];
  expectedCents: number;
}

const FIVE_AND_FIVE = [5, 5, 5, 5, 5, 4, 4, 4, 4, 4]; // 45 over 10 = 4.5
const FOUR_AND_SIX = [5, 5, 5, 5, 4, 4, 4, 4, 4, 4]; // 44 over 10 = 4.4
const SPRING = new Date("2026-03-01T17:00:00Z"); // comfortably past 6 months at AT

const refs = (key: string, n: number) =>
  Array.from({ length: n }, (_, i) => `student.ref.${key.toLowerCase()}.${i + 1}@test.local`);

export const MODEL_TUTORS: ModelTutor[] = [
  {
    key: "full",
    email: "tutor.full@test.local",
    name: "Fiona Full",
    startedAt: new Date("2026-05-02T17:00:00Z"), // exactly 6.0 months at AT
    stars: FIVE_AND_FIVE,
    lessons: 20,
    creditedReferrals: refs("full", 2),
    uncreditedReferrals: [],
    expectedCents: 3000,
  },
  {
    key: "months59",
    email: "tutor.months59@test.local",
    name: "Mona Fivenine",
    startedAt: new Date("2026-05-05T17:00:00Z"), // about 5.9 months at AT
    stars: FIVE_AND_FIVE,
    lessons: 20,
    creditedReferrals: refs("months59", 2),
    uncreditedReferrals: [],
    expectedCents: 2500,
  },
  {
    key: "rating44",
    email: "tutor.rating44@test.local",
    name: "Rory Fourfour",
    startedAt: SPRING,
    stars: FOUR_AND_SIX,
    lessons: 20,
    creditedReferrals: refs("rating44", 2),
    uncreditedReferrals: [],
    expectedCents: 2500,
  },
  {
    key: "ratingCount4",
    email: "tutor.ratingcount4@test.local",
    name: "Cora Four",
    startedAt: SPRING,
    stars: [5, 5, 4, 4], // averages 4.5, but only 4 ratings
    lessons: 20,
    creditedReferrals: refs("ratingCount4", 2),
    uncreditedReferrals: [],
    expectedCents: 2500,
  },
  {
    key: "lessons19",
    email: "tutor.lessons19@test.local",
    name: "Leo Nineteen",
    startedAt: SPRING,
    stars: FIVE_AND_FIVE,
    lessons: 19,
    creditedReferrals: refs("lessons19", 2),
    uncreditedReferrals: [],
    expectedCents: 2500,
  },
  {
    key: "referrals1",
    email: "tutor.referrals1@test.local",
    name: "Remy One",
    startedAt: SPRING,
    stars: FIVE_AND_FIVE,
    lessons: 20,
    creditedReferrals: refs("referrals1", 1),
    uncreditedReferrals: ["student.ref.referrals1.2@test.local"],
    expectedCents: 2500,
  },
  {
    key: "newTutor",
    email: "tutor.new@test.local",
    name: "Nell New",
    startedAt: new Date("2026-10-01T17:00:00Z"),
    stars: [],
    lessons: 0,
    creditedReferrals: [],
    uncreditedReferrals: [],
    expectedCents: 2500,
  },
];

/** A model tutor's record at AT, as tutor_stats would count it. */
export function statsAtAT(t: ModelTutor): TutorStats {
  return {
    ratingSum: t.stars.reduce((a, b) => a + b, 0),
    ratingCount: t.stars.length,
    lessons: t.lessons,
    referrals: t.creditedReferrals.length,
  };
}

/**
 * The full tutor's next session after AT. It is judged with 20 lessons, 10
 * ratings and 2 referrals behind it, so the ledger shows the raise: 3000.
 */
export const FULL_NEXT_SESSION = {
  start: new Date("2026-11-03T17:00:00Z"),
  end: new Date("2026-11-03T18:00:00Z"),
  expectedCents: 3000,
};
