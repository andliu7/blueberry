/**
 * The topic track's unlock rule, free order within a unit. Pure: no React,
 * no DOM, no store, so it is testable under the node environment the suite
 * runs in.
 *
 * WHY THE OLD RULE WENT, owner ruling 2026-09-01 in docs/DESIGN-GOALS.md:
 * "reactions within a unit are freely orderable. Branch nodes carry no locks;
 * only UNIT GATES lock." derivePathway used to walk each topic's prerequisite
 * edges and lock any node whose prerequisites were not done, which made the
 * track a chain of one-at-a-time steps: pedagogically defensible, but not the
 * product the owner ruled for, and pathwayState.ts already applies the
 * unit-gate model to the Orgo map. This module is the same model applied to
 * the topic view, so the two tracks can never disagree about what locks.
 *
 * THE RULE. Units are read in order. A unit is FINISHED when every playable
 * node in it is done. The first unfinished unit with playable content closes
 * the gate: every unit after it is locked whole. Inside a reachable unit no
 * node is ever locked; the first not-done playable node on the whole track is
 * CURRENT (the one START affordance) and everything else not done is OPEN.
 * A unit with no playable content cannot be finished by a student, so it
 * never blocks the track: that is our authoring debt, not their progress.
 *
 * Unlock state is progress and progress is server state per CLAUDE.md; this
 * is the rendering rule the server applies, never an entitlement.
 */

export type FreeOrderState = "done" | "current" | "open" | "locked";

export interface FreeOrderNode {
  /** Unit key. Nodes are grouped where this changes, exactly as the track
   *  cuts its banners, so the caller's grouping and this rule cannot drift. */
  readonly unit: string;
  readonly done: boolean;
  /** Has authored content today. An unplayable node is never current and
   *  never counts toward finishing its unit. */
  readonly playable: boolean;
}

export function deriveFreeOrderStates(nodes: readonly FreeOrderNode[]): readonly FreeOrderState[] {
  // Cut into consecutive unit runs, the same cut groupIntoUnits makes.
  const runs: { readonly unit: string; readonly from: number; readonly to: number }[] = [];
  nodes.forEach((node, index) => {
    const last = runs[runs.length - 1];
    if (last !== undefined && last.unit === node.unit) {
      runs[runs.length - 1] = { ...last, to: index };
      return;
    }
    runs.push({ unit: node.unit, from: index, to: index });
  });

  const states: FreeOrderState[] = new Array<FreeOrderState>(nodes.length);
  let reachable = true;
  let currentAssigned = false;
  for (const run of runs) {
    const members = nodes.slice(run.from, run.to + 1);
    const playable = members.filter((node) => node.playable);
    const finished = playable.length > 0 && playable.every((node) => node.done);
    for (let i = run.from; i <= run.to; i += 1) {
      const node = nodes[i]!;
      if (node.done) {
        states[i] = "done";
      } else if (!reachable) {
        states[i] = "locked";
      } else if (!currentAssigned && node.playable) {
        states[i] = "current";
        currentAssigned = true;
      } else {
        states[i] = "open";
      }
    }
    if (!finished && playable.length > 0) reachable = false;
  }
  return states;
}
