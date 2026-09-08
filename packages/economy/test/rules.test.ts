/**
 * The tables in docs/ECONOMY.md, asserted row by row.
 *
 * These look like tests that assert a constant against itself. They are not:
 * the literals on the right hand side are transcribed from that document, and
 * the point is that changing a number in rules.ts fails here until someone
 * changes the document too. A number that can drift silently is the failure
 * mode this file exists to prevent.
 */

import { describe, expect, it } from "vitest";
import {
  CHARGE_CAP,
  CHARGE_COMBO_MAX,
  CHARGE_COMBO_MIN,
  CHARGE_COST,
  CHARGE_FLAWLESS_BONUS,
  CHARGE_QUIZ_REFUND,
  CHARGE_REGEN_MINUTES,
  COSTUME_COST_RANGE,
  DAILY_GOAL_XP,
  DIAMONDS_BOSS,
  DIAMONDS_FLAWLESS,
  DIAMONDS_NODE_FIRST_CLEAR,
  DIAMONDS_RESONANCE,
  DIAMONDS_REVIEW_CLEARED,
  DIAMONDS_SEQUENCE_PER_EXTRA_STEP,
  DIAMONDS_SPINE_BONUS,
  DIAMONDS_STREAK_MILESTONE,
  DIAMONDS_UNIT_CLEARED,
  EXAM_WINDOW_DAYS,
  MASTERY_RANKS,
  MASTERY_VISIBLE_DIP_CAP,
  REST_DAYS_PER_WEEK,
  SINK_COST,
  STREAK_FREEZE_MAX_HELD,
  STREAK_MILESTONES,
  STREAK_REPAIR_PER_MONTH,
  STREAK_REPAIR_WINDOW_HOURS,
  XP_DAILY_GOAL_MET,
  XP_FLAWLESS_BONUS,
  XP_NODE_FIRST_CLEAR,
  XP_QUIZ_FLAWLESS_BONUS,
  XP_QUIZ_PASSED,
  XP_REPLAY,
  XP_RESONANCE,
  XP_SEQUENCE_PER_EXTRA_STEP,
  nextRankAfter,
  rankFor,
} from "../src/rules.ts";

describe("the XP table", () => {
  it("pays a concept node first clear 10 and a reaction node 15", () => {
    expect(XP_NODE_FIRST_CLEAR.concept).toBe(10);
    expect(XP_NODE_FIRST_CLEAR.reaction).toBe(15);
  });

  it("pays a branch node 20, between a reaction node and a quiz", () => {
    expect(XP_NODE_FIRST_CLEAR.branch).toBe(20);
    expect(XP_NODE_FIRST_CLEAR.branch).toBeGreaterThan(XP_NODE_FIRST_CLEAR.reaction);
    expect(XP_NODE_FIRST_CLEAR.branch).toBeLessThan(XP_QUIZ_PASSED);
  });

  it("pays the remaining XP rows exactly as the table gives them", () => {
    expect(XP_FLAWLESS_BONUS).toBe(5);
    expect(XP_SEQUENCE_PER_EXTRA_STEP).toBe(3);
    expect(XP_QUIZ_PASSED).toBe(30);
    expect(XP_QUIZ_FLAWLESS_BONUS).toBe(20);
    expect(XP_RESONANCE).toBe(8);
    expect(XP_DAILY_GOAL_MET).toBe(10);
    expect(XP_NODE_FIRST_CLEAR.review).toBe(12);
    expect(XP_REPLAY).toBe(5);
  });

  it("keeps a resonance find under a node clear, which is the stated intent", () => {
    expect(XP_RESONANCE).toBeLessThan(XP_NODE_FIRST_CLEAR.concept);
  });

  it("makes the flawless quiz the largest bonus in the table, by a factor of four", () => {
    // ECONOMY.md calls it "the largest single award. It should feel like it".
    // It is the largest BONUS; the quiz pass it sits on top of is larger still,
    // and a branch node first clear happens to tie it. Both are recorded here so
    // the claim in the document is read the way the numbers actually support.
    for (const bonus of [XP_FLAWLESS_BONUS, XP_SEQUENCE_PER_EXTRA_STEP, XP_RESONANCE, XP_DAILY_GOAL_MET, XP_REPLAY]) {
      expect(XP_QUIZ_FLAWLESS_BONUS).toBeGreaterThan(bonus);
    }
    expect(XP_QUIZ_FLAWLESS_BONUS).toBe(4 * XP_FLAWLESS_BONUS);
    expect(XP_QUIZ_FLAWLESS_BONUS).toBeLessThan(XP_QUIZ_PASSED);
    expect(XP_QUIZ_FLAWLESS_BONUS).toBe(XP_NODE_FIRST_CLEAR.branch);
  });

  it("holds the four daily goal tiers", () => {
    expect(DAILY_GOAL_XP).toEqual({ casual: 10, regular: 20, serious: 35, exam: 60 });
  });
});

describe("the diamond table", () => {
  it("holds every row", () => {
    expect(DIAMONDS_NODE_FIRST_CLEAR).toBe(10);
    expect(DIAMONDS_SPINE_BONUS).toBe(5);
    expect(DIAMONDS_SEQUENCE_PER_EXTRA_STEP).toBe(5);
    expect(DIAMONDS_FLAWLESS).toBe(5);
    expect(DIAMONDS_RESONANCE).toBe(8);
    expect(DIAMONDS_UNIT_CLEARED).toBe(50);
    expect(DIAMONDS_BOSS).toBe(200);
    expect(DIAMONDS_REVIEW_CLEARED).toBe(5);
    expect(DIAMONDS_STREAK_MILESTONE).toBe(75);
  });

  it("holds every sink price, including the three set in the 2026-08-27 revision", () => {
    expect(SINK_COST).toEqual({
      costume: 100,
      pathway_theme: 250,
      canvas_skin: 150,
      cloud_clear: 75,
      pen_colour: 50,
      streak_freeze: 75,
      streak_repair: 150,
      charge_topup: 60,
    });
    expect(COSTUME_COST_RANGE).toEqual({ min: 100, max: 300 });
  });

  it("prices a streak freeze at about half a week of earning and a repair at most of one", () => {
    // ECONOMY.md: a Regular learner earns 150 to 200 a week. The ratios are the
    // design intent; the absolute numbers are what gets retuned later.
    expect(SINK_COST.streak_freeze / 150).toBeLessThan(0.6);
    expect(SINK_COST.streak_repair / 150).toBeGreaterThan(0.9);
  });
});

describe("the charge table", () => {
  it("holds the meter and the per kind entry costs", () => {
    expect(CHARGE_CAP).toBe(30);
    expect(CHARGE_COST.concept).toBe(5);
    expect(CHARGE_COST.reaction).toBe(8);
    expect(CHARGE_COST.branch).toBe(8);
    expect(CHARGE_COST.quiz).toBe(10);
  });

  it("never charges for a review drill, a tutorial node or an intro node", () => {
    expect(CHARGE_COST.review).toBe(0);
    expect(CHARGE_COST.tutorial).toBe(0);
    expect(CHARGE_COST.intro).toBe(0);
  });

  it("regenerates one point per thirty minutes, which is empty to full in fifteen hours", () => {
    expect(CHARGE_REGEN_MINUTES).toBe(30);
    expect((CHARGE_CAP * CHARGE_REGEN_MINUTES) / 60).toBe(15);
  });

  it("pays back 3 on a flawless clear and refunds a quiz in full", () => {
    expect(CHARGE_FLAWLESS_BONUS).toBe(3);
    expect(CHARGE_QUIZ_REFUND).toBe(CHARGE_COST.quiz);
  });

  it("bounds the combo mini game at 2 to 6", () => {
    expect(CHARGE_COMBO_MIN).toBe(2);
    expect(CHARGE_COMBO_MAX).toBe(6);
  });

  it("leaves a regular day of one concept and one reaction node well inside the meter", () => {
    expect(CHARGE_COST.concept + CHARGE_COST.reaction).toBe(13);
    expect(CHARGE_COST.concept + CHARGE_COST.reaction).toBeLessThan(CHARGE_CAP);
  });
});

describe("the streak table", () => {
  it("holds the milestones, the forgiveness budget, and nothing beyond it", () => {
    expect(STREAK_MILESTONES).toEqual([7, 14, 30, 60, 100, 180, 365]);
    expect(STREAK_FREEZE_MAX_HELD).toBe(2);
    expect(REST_DAYS_PER_WEEK).toBe(1);
    expect(STREAK_REPAIR_WINDOW_HOURS).toBe(48);
    expect(STREAK_REPAIR_PER_MONTH).toBe(1);
  });

  it("switches charge off for a fortnight before the exam", () => {
    expect(EXAM_WINDOW_DAYS).toBe(14);
  });
});

describe("the mastery table", () => {
  it("holds the six ranks, their thresholds and their awards", () => {
    expect(MASTERY_RANKS.map((rank) => [rank.name, rank.at, rank.diamonds])).toEqual([
      ["Reader", 0, 0],
      ["Arrow Pusher", 16, 125],
      ["Mechanist", 31, 125],
      ["Synthesist", 51, 125],
      ["Retrosynthesist", 71, 125],
      ["Exam Ready", 86, 250],
    ]);
  });

  it("caps the visible dip at two points a day", () => {
    expect(MASTERY_VISIBLE_DIP_CAP).toBe(2);
  });

  it("resolves a score to the rank whose band contains it", () => {
    expect(rankFor(0).name).toBe("Reader");
    expect(rankFor(15).name).toBe("Reader");
    expect(rankFor(16).name).toBe("Arrow Pusher");
    expect(rankFor(30).name).toBe("Arrow Pusher");
    expect(rankFor(31).name).toBe("Mechanist");
    expect(rankFor(50).name).toBe("Mechanist");
    expect(rankFor(51).name).toBe("Synthesist");
    expect(rankFor(70).name).toBe("Synthesist");
    expect(rankFor(71).name).toBe("Retrosynthesist");
    expect(rankFor(85).name).toBe("Retrosynthesist");
    expect(rankFor(86).name).toBe("Exam Ready");
    expect(rankFor(100).name).toBe("Exam Ready");
  });

  it("has no rank above Exam Ready", () => {
    expect(nextRankAfter(rankFor(100))).toBeNull();
    expect(nextRankAfter(rankFor(0))?.name).toBe("Arrow Pusher");
  });

  it("leads with a claim rather than a number on every rank", () => {
    for (const rank of MASTERY_RANKS) expect(rank.claim.length).toBeGreaterThan(10);
  });
});
