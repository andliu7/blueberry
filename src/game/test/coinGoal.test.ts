import { describe, expect, it } from "vitest";
import { goalFill, goalLine, nextCoinGoal } from "../shop/coinGoal";
import { shelfGoals } from "../shop/shelfGoals";

const items = [
  { name: "Unit 1 flashcards", price: 600 },
  { name: "Unit 2 flashcards", price: 900 },
];

describe("the goal a payout moves toward", () => {
  it("is the cheapest item the balance could not buy before", () => {
    expect(nextCoinGoal(550, 600, items)).toMatchObject({ name: "Unit 1 flashcards", reached: true });
    expect(nextCoinGoal(600, 650, items)).toMatchObject({ name: "Unit 2 flashcards", reached: false });
    expect(nextCoinGoal(900, 950, items)).toBeNull();
  });
  it("fills and says what is left in words", () => {
    expect(goalFill(items[1]!, 450)).toBeCloseTo(0.5);
    expect(goalLine(items[1]!, 899)).toBe("1 more coin to unlock Unit 2 flashcards");
    expect(goalLine(items[1]!, 900)).toBe("Unlocked: you can buy Unit 2 flashcards now");
  });
  it("prices come from the real shelf", () => {
    const shelf = shelfGoals([]);
    expect(shelf.length).toBeGreaterThan(0);
    for (const item of shelf) expect(item.price).toBeGreaterThan(0);
  });
});
