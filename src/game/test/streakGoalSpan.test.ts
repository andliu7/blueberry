// @vitest-environment jsdom
import { describe, expect, it } from "vitest";
import { goalSpan } from "../lesson/StreakPage";

describe("streak goal span", () => {
  it("uses the milestone table below the top", () => {
    expect(goalSpan(10)).toEqual({ prev: 7, next: 14, round: false });
  });
  it("never shows the same number at both ends past the last milestone", () => {
    for (const d of [365, 400, 847, 900]) {
      const g = goalSpan(d);
      expect(g.next).toBeGreaterThan(g.prev);
      expect(g.next).toBeGreaterThan(d);
      expect(g.prev).toBeLessThanOrEqual(d);
    }
    expect(goalSpan(847)).toEqual({ prev: 800, next: 900, round: true });
  });
});
