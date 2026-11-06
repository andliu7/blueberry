/**
 * What a payout is for (reward gauntlet, Nov, round 2): a white card under the
 * amount naming the next shelf item, a bar from what the student had to what
 * they have now, and one line in words. The bar follows `shown`, the number the
 * counter reads as each coin lands, so the two climb together. Shared by the
 * lesson payout (GemReward.tsx) and the chest opening (ChestOpening.tsx).
 */
import { goalFill, goalLine, type CoinGoal } from "../../shop/coinGoal";
import { formatCoins } from "./CoinCounter";
import "./coinGoalBar.css";

export function CoinGoalBar({ goal, shown, className = "" }: { readonly goal: CoinGoal; readonly shown: number; readonly className?: string }) {
  const reached = shown >= goal.price;
  return (
    <div className={`coin-goal ${className}`} data-reached={reached ? "true" : "false"} role="group" aria-label={goalLine(goal, goal.to)}>
      <div className="coin-goal__row" aria-hidden>
        <span className="coin-goal__kicker">{reached ? "Unlocked!" : "Next unlock"}</span>
        <span className="coin-goal__count">
          {/* The balance itself, never capped at the price: it must read the same number as the counter beside it. */}
          {formatCoins(shown)}
          <span className="coin-goal__of"> / {formatCoins(goal.price)}</span>
        </span>
      </div>
      <div className="coin-goal__bar" aria-hidden>
        <span className="coin-goal__fill" style={{ width: `${(goalFill(goal, shown) * 100).toFixed(1)}%` }} />
        <span className="coin-goal__was" style={{ width: `${(goalFill(goal, goal.from) * 100).toFixed(1)}%` }} />
      </div>
      <p className="coin-goal__line" aria-hidden>
        {goalLine(goal, shown)}
      </p>
    </div>
  );
}
