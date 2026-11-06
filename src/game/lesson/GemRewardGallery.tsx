/** Development surface at #/app/gallery/coins?state=coins|xp|streak|chest|epic (&still=1, &goal=cross). Lazy. */
import { useEffect, useState } from "react";
import { nextCoinGoal } from "../shop/coinGoal";
import { shelfGoals } from "../shop/shelfGoals";
import GemReward, { type RewardKind } from "./GemReward";

export default function GemRewardGallery() {
  // Any hash change replays the moment (append &run=2), so a capture can start it after the boot loader.
  const [run, setRun] = useState(0);
  useEffect(() => {
    const on = () => setRun((n) => n + 1);
    window.addEventListener("hashchange", on);
    return () => window.removeEventListener("hashchange", on);
  }, []);
  const q = new URLSearchParams(window.location.hash.split("?")[1] ?? "");
  const raw = q.get("state");
  const epic = raw === "epic";
  const kind: RewardKind = raw === "xp" || raw === "streak" || raw === "chest" ? raw : epic ? "chest" : "gems";
  // A balance the real shelf gives a goal for: short of it by default, or
  // crossing it with &goal=cross. The prices are the shop's own.
  const balance = q.get("goal") === "cross" ? 770 : 690;
  const goal = nextCoinGoal(balance - 50, balance, shelfGoals([]));
  const still = q.get("still") === "1" || (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false);
  return (
    <GemReward
      key={`${kind}-${run}`}
      kind={kind}
      reducedMotion={still}
      gems={kind === "streak" ? 20 : 50}
      balance={balance}
      goal={goal}
      reason="Lesson complete! Nice work."
      xp={23}
      accuracy={93}
      timeLabel="2:49"
      streak={5}
      today={4}
      chances={2}
      tier={epic ? "epic" : "rare"}
      onContinue={() => undefined}
    />
  );
}
