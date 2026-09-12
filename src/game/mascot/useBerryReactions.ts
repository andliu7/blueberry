/**
 * The React half of berryReaction.ts: the mascot's live reaction state on a
 * grading surface. berryReaction.ts decides WHAT the berry does for an
 * outcome and a run; this hook holds the behaviour, mood, chain, the sparkle
 * and flash counters, the charred flag, the run counters and the settle
 * timer, and hands the surface a props bundle for <Berry> plus two verbs.
 *
 * Extracted from the trainer engine's screen, where it had been copied from
 * TrainerTab.tsx line for line; TrainerTab.tsx and TrainerScreen.tsx both
 * use this hook now. LessonPlayer.tsx carries its own variant with a combo
 * line and is not touched.
 */

import { useEffect, useRef, useState } from "react";
import type { BerryBehaviour } from "./berryBehaviour";
import type { BerryMood } from "./berryMood";
import type { BerryProps } from "./Berry";
import { reactionFor, SETTLED_AFTER_MISS, type ReactionOutcome } from "./berryReaction";

export type BerryReactionProps = Required<Pick<BerryProps, "behaviour" | "behaviourKey" | "chain" | "sparkleKey" | "flashKey" | "state">> &
  Pick<BerryProps, "mood">;

export interface BerryReactions {
  /** Spread into <Berry>; the surface adds costume, working, size and motion. */
  readonly berry: BerryReactionProps;
  /** Play one behaviour now, replaying it even if it is the current one. */
  readonly bump: (next: BerryBehaviour, mood?: BerryMood, chain?: readonly BerryBehaviour[]) => void;
  /** A graded outcome as a reaction, with the run counters and the settle timer. */
  readonly react: (outcome: ReactionOutcome) => void;
}

export function useBerryReactions(reducedMotion: boolean, initial: BerryBehaviour): BerryReactions {
  const [behaviour, setBehaviour] = useState<BerryBehaviour>(initial);
  const [behaviourKey, setBehaviourKey] = useState(0);
  const [mood, setMood] = useState<BerryMood | undefined>(undefined);
  const [chain, setChain] = useState<readonly BerryBehaviour[]>([]);
  const [sparkleKey, setSparkleKey] = useState(0);
  const [flashKey, setFlashKey] = useState(0);
  const [charred, setCharred] = useState(false);
  const runRef = useRef({ correctRun: 0, missRun: 0 });
  const settleTimerRef = useRef<number | null>(null);
  useEffect(
    () => () => {
      if (settleTimerRef.current !== null) window.clearTimeout(settleTimerRef.current);
    },
    [],
  );
  const bump = (next: BerryBehaviour, nextMood?: BerryMood, nextChain: readonly BerryBehaviour[] = []) => {
    setBehaviour(next);
    setBehaviourKey((k) => k + 1);
    setMood(nextMood);
    setChain(nextChain);
  };
  const react = (outcome: ReactionOutcome) => {
    if (settleTimerRef.current !== null) window.clearTimeout(settleTimerRef.current);
    const run = runRef.current;
    if (outcome === "correct") {
      run.correctRun += 1;
      run.missRun = 0;
      if (charred) {
        setCharred(false);
        setFlashKey((k) => k + 1);
      }
    } else if (outcome === "wrong") {
      run.correctRun = 0;
      run.missRun += 1;
    }
    const reaction = reactionFor(outcome, run);
    if (reaction.state === "charred") setCharred(true);
    if (reaction.sparkles) setSparkleKey((k) => k + 1);
    bump(reaction.behaviour, reaction.mood, reaction.chain);
    if (reaction.holdMs !== null) {
      settleTimerRef.current = window.setTimeout(
        () => bump(SETTLED_AFTER_MISS.behaviour, SETTLED_AFTER_MISS.mood),
        reducedMotion ? 1 : reaction.holdMs,
      );
    }
  };
  return {
    berry: { behaviour, behaviourKey, mood, chain, sparkleKey, flashKey, state: charred ? "charred" : "neutral" },
    bump,
    react,
  };
}
