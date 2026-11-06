/**
 * WHAT A PAYOUT MOVES YOU TOWARD (reward gauntlet, Nov, round 2). A reward
 * screen that only says "+50" gives the number no meaning. This names the next
 * thing in the shop the coins are for and how far along the student is, so the
 * screen can draw a bar that fills as the coins land.
 *
 * The goal is the cheapest shelf item the balance could NOT buy before this
 * payout: the thing these coins are working toward. If the payout crosses its
 * price the goal is reached ("unlocked"). Prices come from shopModel, which
 * takes them from the economy package; nothing here sets one. Pure and light,
 * so a reward screen can import it; the shelf list is in shelfGoals.ts.
 */

export interface GoalItem {
  /** What it is called on the shelf: "Unit 2 flashcards". */
  readonly name: string;
  readonly price: number;
}

export interface CoinGoal extends GoalItem {
  /** Balance before and after the payout. */
  readonly from: number;
  readonly to: number;
  /** True when this payout reaches the price. */
  readonly reached: boolean;
}

/** The goal a payout from `from` to `to` moves toward, or null when the shelf has nothing left to aim at. */
export function nextCoinGoal(from: number, to: number, items: readonly GoalItem[]): CoinGoal | null {
  const ahead = items.filter((item) => item.price > from).sort((a, b) => a.price - b.price || a.name.localeCompare(b.name));
  const goal = ahead[0];
  if (goal === undefined) return null;
  return { ...goal, from, to, reached: to >= goal.price };
}

/** How full the goal bar is at `balance`, 0 to 1. */
export function goalFill(goal: GoalItem, balance: number): number {
  if (goal.price <= 0) return 1;
  return Math.max(0, Math.min(1, balance / goal.price));
}

/** The line under the bar, in plain words. */
export function goalLine(goal: GoalItem, balance: number): string {
  const left = goal.price - balance;
  if (left <= 0) return `Unlocked: you can buy ${goal.name} now`;
  return `${left} more ${left === 1 ? "coin" : "coins"} to unlock ${goal.name}`;
}
