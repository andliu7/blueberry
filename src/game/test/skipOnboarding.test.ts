/**
 * Onboarding is skipped (owner, 17 Oct): a fresh device lands on the path with the first open
 * course chosen, instead of being redirected into `#/app/start/welcome`. The redirect in
 * App.tsx fires on `!onboardingDone`, and the path draws nothing without a course, so both
 * must hold on an empty profile.
 */
import { describe, expect, it } from "vitest";
import { EMPTY_PROGRESS } from "../app/progress";
import { OPEN_COURSE_IDS } from "../app/courses";

describe("a first visit skips onboarding", () => {
  it("counts onboarding as done and picks the first open course", () => {
    expect(EMPTY_PROGRESS.onboardingDone).toBe(true);
    expect(EMPTY_PROGRESS.course).toBe(OPEN_COURSE_IDS[0]);
  });
});
