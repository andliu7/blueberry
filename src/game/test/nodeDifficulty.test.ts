/**
 * The difficulty pips are a MEASUREMENT, and this is the instrument.
 *
 * pathway-sheet/nodeDifficulty.ts commits the move count per node as numbers
 * because the pathway tab may not import the trainer corpus (see the note in
 * that file, and the same note in app/courseUniverse.generated.ts). A
 * committed number rots, so this file recomputes every one of them from the
 * real content and fails when they drift. A test is allowed the imports the
 * entry chunk is not.
 *
 * On a drift the failure message carries the regenerated literal, ready to
 * paste into NODE_MOVES. Nobody edits a row by hand; the corpus decides it.
 */

import { describe, expect, it } from "vitest";
import { PATHWAY_UNITS } from "../demo/pathwayMap";
import { TRAINER_REACTIONS } from "../demo/reactions";
import { TRAINER_SEQUENCES } from "../demo/sequences";
import { RESONANCE_HUNT } from "../demo/resonance";
import { planLesson } from "../beats/template";
import { NODE_MOVES, pipsForMoves, difficultyForNode } from "../pathway-sheet/nodeDifficulty";

/** The rule, in code. See nodeDifficulty.ts's header for it in words. */
function movesFor(nodeId: string): number {
  const plan = planLesson(nodeId);
  if (plan === null) return 0;
  let moves = 0;
  for (const step of plan.steps) {
    const beat = step.beat;
    if (beat.kind === "mechanism") {
      const link = beat.play;
      if (link.kind === "reaction") {
        const reaction = TRAINER_REACTIONS.find((entry) => entry.id === link.id);
        moves += reaction === undefined ? 0 : reaction.step.arrows.length;
      } else {
        const sequence = TRAINER_SEQUENCES.find((entry) => entry.id === link.id);
        if (sequence !== undefined) {
          for (const one of sequence.steps) moves += one.step.arrows.length + (one.fork === undefined ? 0 : 1);
        }
      }
    } else if (beat.kind === "resonance") {
      const entry = RESONANCE_HUNT.find((one) => one.id === beat.resonanceId);
      moves += entry === undefined ? 0 : entry.step.arrows.length;
    } else {
      moves += 1;
    }
  }
  return moves;
}

function measured(): Record<string, number> {
  const out: Record<string, number> = {};
  for (const unit of PATHWAY_UNITS) {
    for (const node of unit.nodes) {
      const moves = movesFor(node.id);
      if (moves > 0) out[node.id] = moves;
    }
  }
  return out;
}

function literal(rows: Record<string, number>): string {
  const keys = Object.keys(rows).sort();
  return `export const NODE_MOVES: Readonly<Record<string, number>> = Object.freeze({\n${keys
    .map((key) => `  "${key}": ${rows[key]},`)
    .join("\n")}\n});`;
}

describe("the committed move counts are the measured ones", () => {
  it("matches the corpus, node for node", () => {
    const rows = measured();
    const same = JSON.stringify(rows, Object.keys(rows).sort()) === JSON.stringify(NODE_MOVES, Object.keys(rows).sort());
    expect(
      Object.keys(rows).length === Object.keys(NODE_MOVES).length && same,
      `NODE_MOVES drifted from the corpus. Regenerate it to:\n\n${literal(rows)}\n`,
    ).toBe(true);
  });
});

describe("the pips rank something", () => {
  it("spreads the map over all four pips rather than restating the kind", () => {
    const rows = measured();
    const spread = new Set(Object.values(rows).map(pipsForMoves));
    const histogram: Record<number, number> = {};
    for (const moves of Object.values(rows)) histogram[pipsForMoves(moves)] = (histogram[pipsForMoves(moves)] ?? 0) + 1;
    expect([...spread].sort(), `pip histogram ${JSON.stringify(histogram)}`).toEqual([1, 2, 3, 4]);
  });

  it("gives a node with nothing authored no difficulty at all", () => {
    expect(difficultyForNode("u1-poly")).toBeNull();
    expect(difficultyForNode("no-such-node")).toBeNull();
  });
});
