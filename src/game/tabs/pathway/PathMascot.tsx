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
 * whenever `behaviourKey` changes, so each tap adds one to `taps` and the hop
 * plays again even when the behaviour name is the same.
 *
 * React pattern, "render prop": `children` is a function. This component owns
 * the tap and hands back the three behaviour props; PathwayTab still draws the
 * <Berry> itself, so its MASCOT_PX size stays in the one place
 * pathwayRowLanes.test.ts reads it from.
 */

import { useEffect, useState, type ReactNode } from "react";
import type { BerryBehaviour } from "../../mascot/berryBehaviour";
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
}

export function PathMascot({ children }: { readonly children: (move: BloomMove) => ReactNode }) {
  const [taps, setTaps] = useState(0);
  const [line, setLine] = useState<string | null>(null);

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
        }}
      >
        {children({
          behaviour: taps === 0 ? "leanIn" : "bounce",
          behaviourKey: taps,
          chain: taps === 0 ? NO_CHAIN : AFTER_HOP,
        })}
      </button>
      {/* The live region is always in the DOM, so it exists before it speaks;
          the bubble inside it comes and goes with the line. */}
      <span role="status" aria-live="polite">
        {line === null ? null : <span className="path-mascot__line">{line}</span>}
      </span>
    </span>
  );
}
