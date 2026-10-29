/**
 * The offer at the end of a lesson: "N mistakes saved, practice them". Sits
 * under the summary, at the bottom of the page flow, so nothing is pushed
 * down from the top. Renders nothing when the bank has nothing open.
 */

import { useSyncExternalStore } from "react";
import { Press } from "../app/ui/Press";
import { hrefForMistakes } from "../app/routes";
import { mistakeBank, openMistakes } from "./mistakeBank";

export default function MistakesOffer() {
  const snapshot = useSyncExternalStore(mistakeBank.subscribe, mistakeBank.getSnapshot);
  const open = openMistakes(snapshot);
  if (open.length === 0) return null;
  return (
    <div role="status" style={{ display: "grid", gap: 8, marginTop: 12 }}>
      <p style={{ margin: 0, fontWeight: 800 }}>
        {open.length === 1 ? "1 mistake saved." : `${open.length} mistakes saved.`} Practice them while they are fresh.
      </p>
      <Press variant="secondary" block onClick={() => { window.location.hash = hrefForMistakes(); }}>
        Practice mistakes
      </Press>
    </div>
  );
}
