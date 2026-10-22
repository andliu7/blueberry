/**
 * Saved chests, on the Me tab (owner, 20 Oct: saved chests stack in an
 * inventory and open one by one or all at once). Every number is the
 * economy's: `economy.chests.saved`, oldest first.
 */
import type { SavedChest } from "@blueberry/economy";
import { progress } from "../app/progress";
import { Press } from "../app/ui/Press";
import { ChestArt } from "./ChestArt";
import { CHEST_COPY, openAll, openSaved, playChest } from "./chestFlow";

export function ChestInventory({ saved, className = "" }: { readonly saved: readonly SavedChest[]; readonly className?: string }) {
  const count = saved.length;
  const oldest = saved[0];

  const openOne = () => {
    if (oldest === undefined) return;
    playChest({
      detail: `From your ${CHEST_COPY[oldest.source].title.toLowerCase()}`,
      open: () => openSaved(progress, [oldest.id]),
    });
  };
  const openEvery = () => {
    playChest({ detail: `From ${count} chests`, open: () => openAll(progress) });
  };

  return (
    <section className={`me-card chest-inv ${className}`} aria-labelledby="me-chests-title" data-chests-saved={count}>
      <h2 id="me-chests-title" className="me-h2">
        Chests
      </h2>
      <div className="chest-inv__row">
        <span className="chest-inv__art" aria-hidden>
          <ChestArt />
          {count > 1 ? <span className="chest-inv__count">{count}</span> : null}
        </span>
        <p className="chest-inv__line">
          {count === 0
            ? "No chests saved. Finish a daily quest to earn one."
            : count === 1
              ? `Your ${CHEST_COPY[oldest!.source].title.toLowerCase()} is waiting.`
              : `${count} chests saved.`}
        </p>
      </div>
      {count > 0 ? (
        <div className="chest-inv__actions">
          <Press block onClick={openOne} data-chests="open-one">
            {count === 1 ? "Open it" : "Open one"}
          </Press>
          {count > 1 ? (
            <Press block variant="secondary" onClick={openEvery} data-chests="open-all">
              Open all {count}
            </Press>
          ) : null}
        </div>
      ) : null}
    </section>
  );
}
