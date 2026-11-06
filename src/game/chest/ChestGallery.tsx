/** Development surface at #/app/gallery/chest: the C1 opening with a made-up 50 coin payout and goal, the lesson payout's own numbers. Lazy. */
import { useState } from "react";
import { useReducedMotion } from "../app/hooks";
import { ChestArt, CoinArt, StoneArt } from "./ChestArt";
import { nextCoinGoal } from "../shop/coinGoal";
import { shelfGoals } from "../shop/shelfGoals";
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
        request={{
          detail: "From your section chest",
          open: () => ({ diamonds: 50, xp: 0 }),
          // A made-up balance, short of the real shelf's next price, so the goal bar has somewhere to go.
          goal: (paid) => nextCoinGoal(640, 640 + paid.diamonds, shelfGoals([])),
        }}
        reducedMotion={reducedMotion}
        onClose={() => setRun((n) => n + 1)}
      />
    </div>
  );
}
