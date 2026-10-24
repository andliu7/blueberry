/**
 * EVERY SECTION STARTS OPEN, owner 23 Oct: "have the first lesson open for
 * every single section across all units so that you can start wherever if
 * you feel like it. just gate the next one."
 *
 * So the rule the student sees is per SECTION, not per unit:
 *
 *   - the first lesson of every section of every unit is open (a unit with
 *     no section cut is one section, so its first lesson is open)
 *   - every other lesson opens once the stops before it in its own section
 *     are cleared (a passed test-out journals them as cleared, so a tested
 *     out section opens the lessons after it for free)
 *   - a side quest opens once its own prerequisites clear, in any unit
 *   - a unit's checkpoint opens once every lesson in that unit is cleared
 *
 * WHY AN OVERLAY AND NOT A REWRITE. deriveMapPathway (pathwayState.ts) keeps
 * the older, stricter rule and its tests stay honest about it; withReviewGates
 * lays the review stops over that; this file lays the section rule over both,
 * the same pattern withReviewGates already uses. The new rule only ever OPENS
 * nodes: a node waits for strictly less here (earlier stops in its section)
 * than below (every earlier lesson in the unit, and every earlier unit), so
 * the layers can never disagree about a node this one leaves locked.
 *
 * START does not move: it stays where the stricter rule put it, so there is
 * still exactly one "you are here" on the map. Opened nodes are "open".
 *
 * Pure and light: no React and no pool import, because the pathway is in the
 * entry chunk.
 */
import type { EconomyEvent } from "@blueberry/economy";
import { checkpointNodeId, type PathwayNode, type PathwayUnit } from "../../demo/pathwayMap";
import { deriveMapPathway, prerequisitesOf, type MapNodeStatus, type MapUnitStatus } from "./pathwayState";
import { withReviewGates, type GatedPathway, type ReviewCheckpoint } from "./reviewCheckpoints";
import { unitSections } from "./testOuts";

/**
 * The stops a main-line node waits for inside its own section, in road order
 * (review stops included): [] for the first lesson of a section, and null for
 * a node that sits in no section (a side quest, an authored gate question),
 * so the caller falls back to prerequisitesOf.
 */
export function sectionWaits(unit: PathwayUnit, nodeId: string): readonly string[] | null {
  for (const section of unitSections(unit)) {
    const at = section.lights.indexOf(nodeId);
    if (at !== -1) return section.lights.slice(0, at);
  }
  return null;
}

/** The map's status with the section rule laid over it. Pure. See the header. */
export function withSectionStarts(units: readonly PathwayUnit[], gated: GatedPathway, cleared: ReadonlySet<string>): GatedPathway {
  const nodes = new Map<string, MapNodeStatus>(gated.status.nodes);
  const gatedBy = new Map<string, ReviewCheckpoint>(gated.gatedBy);
  const unitStatus = new Map<string, MapUnitStatus>();
  const allCleared = (ids: readonly string[]) => ids.every((id) => cleared.has(id));

  for (const unit of units) {
    for (const node of unit.nodes) {
      const waits = node.kind === "branch" ? null : sectionWaits(unit, node.id);
      // A review stop in an EARLIER section holds nothing in this one: its
      // section ends on it, so the sentence it would give is not the true one.
      const holder = gatedBy.get(node.id);
      if (holder !== undefined && waits !== null && !waits.includes(holder.id)) gatedBy.delete(node.id);
      const live = nodes.get(node.id);
      if (live === undefined || live.state !== "locked" || live.queued || cleared.has(node.id)) continue;
      if (allCleared(waits ?? prerequisitesOf(unit, node))) {
        nodes.set(node.id, { ...live, state: "open" });
        gatedBy.delete(node.id);
      }
    }
    // The unit check: open once every lesson on the unit's track is cleared,
    // whatever the units before it say.
    const checkId = checkpointNodeId(unit.id);
    const check = nodes.get(checkId);
    const lessons = unit.nodes.filter((node: PathwayNode) => node.kind !== "branch" && node.playable !== undefined);
    if (check !== undefined && check.state === "locked" && !check.queued && lessons.length > 0 && allCleared(lessons.map((node) => node.id))) {
      nodes.set(checkId, { ...check, state: "open" });
    }
    // Every unit is walkable now: its section starts are open.
    const entry = gated.status.units.get(unit.id);
    if (entry !== undefined) unitStatus.set(unit.id, { ...entry, reachable: true });
  }

  return { status: { ...gated.status, nodes, units: unitStatus }, gatedBy };
}

/**
 * Every id the journal holds a clear for: lessons, review stops, chests (a
 * chest opened before chest_opened existed was journalled as a node clear,
 * and chest ids are never map nodes, so the gates ignore them) and the
 * lessons a passed test-out lights.
 */
export function clearedIdsOf(journal: readonly EconomyEvent[]): ReadonlySet<string> {
  return new Set(
    journal.flatMap((event) =>
      event.kind === "node_cleared"
        ? [event.nodeId]
        : event.kind === "chest_opened"
          ? [event.chestId]
          : event.kind === "tested_out"
            ? event.nodeIds
            : [],
    ),
  );
}

/**
 * The status the student sees, every layer in order: the map's own rule, the
 * review stops, then the section starts. PathwayTab and the unlock
 * celebration both read this one function, so they cannot disagree.
 */
export function pathStatus(units: readonly PathwayUnit[], journal: readonly EconomyEvent[], cleared: ReadonlySet<string> = clearedIdsOf(journal)): GatedPathway {
  return withSectionStarts(units, withReviewGates(units, deriveMapPathway(units, journal), cleared), cleared);
}
