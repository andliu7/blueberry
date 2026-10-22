/**
 * Where the chest screens mount: once, inside the Shell (Shell.tsx).
 *
 * This file is in the #/app cold load, so it holds no drawing and no
 * animation. The offer sheet and the C1 opening are both React.lazy, fetched
 * the first time a chest is offered or opened.
 *
 * Offers wait in chestFlow while a lesson runs outside the Shell, so a chest
 * earned on a section final is offered on the way back to the path.
 */
import { Suspense, lazy, useSyncExternalStore } from "react";
import { useProgress, useReducedMotion } from "../app/hooks";
import { chestFlow, finishPlay } from "./chestFlow";

const ChestSheet = lazy(() => import("./ChestSheet"));
const ChestOpening = lazy(() => import("./ChestOpening"));

export function ChestHost() {
  const flow = useSyncExternalStore(chestFlow.subscribe, chestFlow.getState, chestFlow.getState);
  const snapshot = useProgress();
  const reducedMotion = useReducedMotion();

  // Only chests still saved: one opened elsewhere since (Me, the map) drops out.
  const offered = snapshot.economy.chests.saved.filter((chest) => flow.offer.includes(chest.id));

  if (flow.play !== null) {
    return (
      <Suspense fallback={null}>
        <ChestOpening request={flow.play} reducedMotion={reducedMotion} onClose={finishPlay} />
      </Suspense>
    );
  }
  if (offered.length === 0) return null;
  return (
    <Suspense fallback={null}>
      <ChestSheet chests={offered} reducedMotion={reducedMotion} />
    </Suspense>
  );
}
