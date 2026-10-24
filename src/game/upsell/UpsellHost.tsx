/**
 * Where the Pro sheet mounts: once, inside the Shell, after ChestHost.
 *
 * In the #/app cold load, so it draws nothing itself: the sheet is React.lazy,
 * fetched the first time an offer is waiting. A lesson runs outside the Shell,
 * so an offer made on a clear shows on the way back to the path, never mid-lesson.
 */
import { Suspense, lazy, useSyncExternalStore } from "react";
import { useProgress } from "../app/hooks";
import { chestFlow } from "../chest/chestFlow";
import { upsellFlow } from "./upsellFlow";

const UpsellSheet = lazy(() => import("./UpsellSheet"));

export function UpsellHost() {
  // useSyncExternalStore is React's hook for reading a store that lives outside React.
  const offer = useSyncExternalStore(upsellFlow.subscribe, upsellFlow.getState, upsellFlow.getState);
  const chests = useSyncExternalStore(chestFlow.subscribe, chestFlow.getState, chestFlow.getState);
  const snapshot = useProgress();

  if (offer === null) return null;
  // Never on top of a chest. The same test ChestHost uses for "a chest sheet is up";
  // the offer waits and shows once the chest closes.
  const chestUp = chests.play !== null || snapshot.economy.chests.saved.some((chest) => chests.offer.includes(chest.id));
  if (chestUp) return null;
  return (
    <Suspense fallback={null}>
      <UpsellSheet offer={offer} />
    </Suspense>
  );
}
