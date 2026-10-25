/**
 * BLOOM ON THE PATH, AND HE ANSWERS A TAP (owner, 17 Oct: "Bloom on the path
 * is pressable: a small jump and a line from him on tap").
 *
 * He still stands beside the current node, leaning in, exactly where TrackSlab
 * put him. What is new is that he is a real button: a press plays Berry's own
 * "bounce" (the hop a correct answer plays) and shows one short line in a
 * bubble above his head for a few seconds. Under reduced motion Berry draws
 * his still frame and never hops, so the line is the whole answer.
 *
 * The lines take turns rather than being random, so two taps never say the
 * same thing twice in a row and a test can read them in order. The bubble is a
 * polite live region, so a screen reader hears the line too.
 *
 * React pattern, "bump a counter to replay": Berry replays an event behaviour
 * whenever `behaviourKey` changes, so each tap adds one to `beatKey` and the hop
 * plays again even when the behaviour name is the same.
 *
 * React pattern, "render prop": `children` is a function. This component owns
 * the tap and hands back the three behaviour props; PathwayTab still draws the
 * <Berry> itself, so its MASCOT_PX size stays in the one place
 * pathwayRowLanes.test.ts reads it from.
 *
 * TWO AMBIENT BEATS, added 2026-10-24 (BLOOM-STATES-SPEC.md, A and C).
 * Bored: 20s with no press anywhere and he sighs once (sleepy face, the
 * `sigh` behaviour), then looks out at the student and holds that until they
 * touch something. It never loops: the idle stage holds until input
 * (useIdleInput.ts). Unlock: on the row whose chip just opened he hops once
 * with the unlock FX. The move is the pure `pathMoveFor` below, so a test
 * reads the four beats without a DOM.
 *
 * React pattern, "context": the row tells this component its chip just
 * unlocked through PathUnlockContext rather than a prop, which reaches it
 * without changing the <PathMascot> call PathwayTab and its pin test share.
 * Read on mount (the initial beat) and on every later change (an effect), so
 * an unlock that arrives after mount hops too.
 */

import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import type { BerryBehaviour } from "../../mascot/berryBehaviour";
import { LOOK_AHEAD, type BerryLook, type BerryMood } from "../../mascot/berryMood";
import { useIdleInput } from "../../mascot/useIdleInput";
import "./path-mascot.css";

/** What Bloom says, in turn. Short, plain, friendly. */
export const BLOOM_LINES: readonly string[] = Object.freeze([
  "Keep going!",
  "One more lesson?",
  "You've got this.",
  "Nice work so far.",
]);

/** How long a line stays up, in milliseconds. */
const LINE_MS = 2600;

/** After the hop he goes back to leaning in toward the node. */
const AFTER_HOP: readonly BerryBehaviour[] = Object.freeze(["leanIn"]);
const NO_CHAIN: readonly BerryBehaviour[] = Object.freeze([]);

/** The line for the nth tap, counting from 1. Pure, so the test can read it. */
export function bloomLineFor(tap: number): string {
  return BLOOM_LINES[(tap - 1) % BLOOM_LINES.length] ?? "Keep going!";
}

/** What PathMascot hands its child Berry: which move to play and when to replay it. */
export interface BloomMove {
  readonly behaviour: BerryBehaviour;
  readonly behaviourKey: number;
  readonly chain: readonly BerryBehaviour[];
  /**
   * Only while bored (sleepy). Absent otherwise, not undefined, so spreading
   * the move after the row's own mood="happy" leaves that face alone.
   */
  readonly mood?: BerryMood;
  /** (0, 0) once bored: he looks out at the student. Undefined lets the glance run. */
  readonly lookAt: BerryLook | undefined;
}

/** True on the row whose chip just unlocked. Provided by PathwayTab's row. */
export const PathUnlockContext = createContext(false);

/** The last thing that happened to Bloom on the path. */
export type PathBeat = "rest" | "tap" | "bored" | "unlock";

/** What each beat plays. Pure; the key that replays it is the component's. */
export function pathMoveFor(beat: PathBeat): Omit<BloomMove, "behaviourKey"> {
  switch (beat) {
    case "tap":
    case "unlock":
      return { behaviour: "bounce", chain: AFTER_HOP, lookAt: undefined };
    case "bored":
      return { behaviour: "sigh", chain: NO_CHAIN, mood: "sleepy", lookAt: LOOK_AHEAD };
    case "rest":
      return { behaviour: "leanIn", chain: NO_CHAIN, lookAt: undefined };
  }
}

export function PathMascot({ children }: { readonly children: (move: BloomMove) => ReactNode }) {
  const [taps, setTaps] = useState(0);
  const [line, setLine] = useState<string | null>(null);
  const unlocked = useContext(PathUnlockContext);
  // The beat and a counter that replays it (see "bump a counter" above).
  const [beat, setBeat] = useState<PathBeat>(() => (unlocked ? "unlock" : "rest"));
  const [beatKey, setBeatKey] = useState(0);
  const idle = useIdleInput("ambient");

  // An unlock that lands after this row's Bloom has mounted (the celebration
  // is read on the path's mount, so it can arrive a render later) still hops.
  // The ref remembers the last value, so only a false-to-true change plays.
  const wasUnlocked = useRef(unlocked);
  useEffect(() => {
    if (unlocked && !wasUnlocked.current) {
      setBeat("unlock");
      setBeatKey((k) => k + 1);
    }
    wasUnlocked.current = unlocked;
  }, [unlocked]);

  // Bored starts the sigh; the first press after it brings him back.
  useEffect(() => {
    if (idle === "bored") {
      setBeat("bored");
      setBeatKey((k) => k + 1);
    } else {
      setBeat((b) => (b === "bored" ? "rest" : b));
    }
  }, [idle]);

  // Hide the line a while after the last tap. A new tap restarts the clock,
  // and the cleanup clears the timer if the row unmounts first.
  useEffect(() => {
    if (line === null) return;
    const id = window.setTimeout(() => setLine(null), LINE_MS);
    return () => window.clearTimeout(id);
  }, [line, taps]);

  return (
    <span className="path-row__mascot">
      <button
        type="button"
        className="path-mascot__btn"
        aria-label="Bloom, your blueberry. Say hi"
        onClick={() => {
          const next = taps + 1;
          setTaps(next);
          setLine(bloomLineFor(next));
          setBeat("tap");
          setBeatKey((k) => k + 1);
        }}
      >
        {children({ ...pathMoveFor(beat), behaviourKey: beatKey })}
      </button>
      {/* The live region is always in the DOM, so it exists before it speaks;
          the bubble inside it comes and goes with the line. */}
      <span role="status" aria-live="polite">
        {line === null ? null : <span className="path-mascot__line">{line}</span>}
      </span>
    </span>
  );
}
