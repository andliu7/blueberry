/** The shelf items a coin goal can name (coinGoal.ts): the unit flashcard sets still to buy, priced by the decks still missing. */
import type { EconomyEvent } from "@blueberry/economy";
import type { GoalItem } from "./coinGoal";
import { ownedDeckIds, setPrice, unitSets } from "./shopModel";

export function shelfGoals(journal: readonly EconomyEvent[]): readonly GoalItem[] {
  const owned = ownedDeckIds(journal);
  return unitSets()
    .map((set) => ({ name: `${set.unitLabel} flashcards`, price: setPrice(set, owned) }))
    .filter((item) => item.price > 0);
}
