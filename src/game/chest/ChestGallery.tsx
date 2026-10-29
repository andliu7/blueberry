/** Development surface at #/app/gallery/chest: the C1 opening with a made-up 25 diamond payout. Lazy. */
import { useState } from "react";
import { useReducedMotion } from "../app/hooks";
import { ChestArt, CoinArt, StoneArt } from "./ChestArt";
import ChestOpening from "./ChestOpening";

export default function ChestGallery() {
  const reducedMotion = useReducedMotion();
  const [run, setRun] = useState(1);
  return (
    <div style={{ padding: "1rem" }}>
      <button type="button" onClick={() => setRun((n) => n + 1)} style={{ position: "fixed", left: 12, bottom: 12, zIndex: 90 }}>
        Again
      </button>
      <div style={{ position: "fixed", left: 0, right: 0, top: 0, zIndex: 100, display: "flex", gap: 24, padding: 16, background: "#fff" }}>
        <div style={{ width: 150, paddingTop: 30 }}><ChestArt open /></div><div style={{ width: 150, paddingTop: 30 }}><ChestArt open empty /></div><div style={{ width: 150, paddingTop: 30 }}><ChestArt /></div>
        <div style={{ width: 40 }}><CoinArt /></div><div style={{ width: 40 }}><StoneArt tone="ruby" /></div>
      </div>
      <ChestOpening
        key={run}
        request={{ detail: "Gallery test", open: () => ({ diamonds: 25, xp: 0 }) }}
        reducedMotion={reducedMotion}
        onClose={() => setRun((n) => n + 1)}
      />
    </div>
  );
}
