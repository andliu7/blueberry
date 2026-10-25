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
 *
 * Added 2026-10-24 (BLOOM-STATES-SPEC.md, B): a second props bundle, `stage`,
 * for the <BloomStage> wrapper around the berry (combo sparkles and confetti,
 * the Reduced puff), and `hintKey` for the tray's hint ring. `berry` is
 * unchanged, so a surface that only renders <Berry> keeps working.
 */

import { useEffect, useRef, useState } from "react";
import type { BerryBehaviour } from "./berryBehaviour";
import type { BerryMood } from "./berryMood";
import type { BerryProps } from "./Berry";
import { reactionFor, SETTLED_AFTER_MISS, type ReactionOutcome } from "./berryReaction";
import type { BloomStageReactionProps } from "./BloomStage";

export type BerryReactionProps = Required<Pick<BerryProps, "behaviour" | "behaviourKey" | "chain" | "sparkleKey" | "flashKey" | "state">> &
  Pick<BerryProps, "mood">;

export interface BerryReactions {
  /** Spread into <Berry>; the surface adds costume, working, size and motion. */
  readonly berry: BerryReactionProps;
  /** Play one behaviour now, replaying it even if it is the current one. */
  readonly bump: (next: BerryBehaviour, mood?: BerryMood, chain?: readonly BerryBehaviour[]) => void;
  /** A graded outcome as a reaction, with the run counters and the settle timer. */
  readonly react: (outcome: ReactionOutcome) => void;
  /** Spread into <BloomStage>; the surface adds reducedMotion, thinking and the berry. */
  readonly stage: BloomStageReactionProps;
  /** Bumped on a wrong-again miss. Pass to <BloomHintRing ringKey> on the hint control. */
  readonly hintKey: number;
}

export function useBerryReactions(reducedMotion: boolean, initial: BerryBehaviour): BerryReactions {
  const [behaviour, setBehaviour] = useState<BerryBehaviour>(initial);
  const [behaviourKey, setBehaviourKey] = useState(0);
  const [mood, setMood] = useState<BerryMood | undefined>(undefined);
  const [chain, setChain] = useState<readonly BerryBehaviour[]>([]);
  const [sparkleKey, setSparkleKey] = useState(0);
  const [flashKey, setFlashKey] = useState(0);
  const [charred, setCharred] = useState(false);
  // Mirrors `charred` for react(), which can run twice before a re-render
  // (two grades inside one frame) and would otherwise read a stale value.
  const charredRef = useRef(false);
  // The stage props belong to the LATEST grade only: combo is null and puffKey
  // is 0 unless this grade reached a milestone or cleared the char. A surface
  // that mounts a fresh <BloomStage> per reveal (the answer tray) would
  // otherwise replay the last milestone's confetti on every later tray.
  const [stage, setStage] = useState<BloomStageReactionProps>({ combo: null, comboKey: 0, puffKey: 0 });
  // Counts every puff so its parity can flip the keyframe name (see BloomStage).
  const puffCountRef = useRef(0);
  const [hintKey, setHintKey] = useState(0);
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
    let cleared = false;
    if (outcome === "correct") {
      run.correctRun += 1;
      run.missRun = 0;
      if (charredRef.current) {
        charredRef.current = false;
        cleared = true;
        setCharred(false);
        setFlashKey((k) => k + 1);
      }
    } else if (outcome === "wrong" || outcome === "wrongAgain") {
      run.correctRun = 0;
      run.missRun += 1;
    }
    const reaction = reactionFor(outcome, run);
    if (reaction.state === "charred") {
      charredRef.current = true;
      setCharred(true);
    }
    if (reaction.sparkles) setSparkleKey((k) => k + 1);
    if (cleared) puffCountRef.current += 1;
    const puffKey = cleared ? puffCountRef.current : 0;
    setStage((s) => ({
      combo: reaction.combo,
      comboKey: reaction.combo !== null ? s.comboKey + 1 : s.comboKey,
      puffKey,
    }));
    if (reaction.hint) setHintKey((k) => k + 1);
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
    stage,
    hintKey,
  };
}
