/** Development surface at #/app/gallery/gems?state=gems|xp|streak|chest. Lazy. */
import GemReward, { type RewardKind } from "./GemReward";

export default function GemRewardGallery() {
  const q = new URLSearchParams(window.location.hash.split("?")[1] ?? "");
  const raw = q.get("state");
  const epic = raw === "epic";
  const kind: RewardKind = raw === "xp" || raw === "streak" || raw === "chest" ? raw : epic ? "chest" : "gems";
  const still = q.get("still") === "1" || (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false);
  return (
    <GemReward
      key={kind}
      kind={kind}
      reducedMotion={still}
      gems={kind === "streak" ? 20 : 50}
      reason="You earned 50 gems for finishing your first unit!"
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
