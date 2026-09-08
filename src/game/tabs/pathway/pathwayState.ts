/**
 * Five node states for the Orgo II pathway map, derived from the journal.
 *
 * WHY THIS FILE EXISTS. `derivePathway` in PathwayTab.tsx has computed five
 * states (done, current, open, review, locked) since Phase 5, and it still
 * does; nothing here changes its rule or its output. But it works over
 * `TopicId`s, and the one open course renders the OWNER'S MAP instead, whose
 * nodes are map ids and not topics. `OrgoMapTrack` was deriving its own state
 * from a single boolean, `playable !== undefined`, so every authored node on
 * the track came out identical: same fill, same size, no current, no lock, no
 * start affordance. A blind judge read exactly that and picked the bar.
 *
 * So this is the same RULE applied to the map's own vocabulary, written once
 * and tested, rather than a second rule. The correspondence, line for line:
 *
 *   derivePathway                      deriveMapPathway
 *   ------------------------------     ------------------------------
 *   record exists            -> done   node_cleared event       -> done
 *   correct/attempted < 0.75 -> review attempt events, same bar  -> review
 *   prerequisites all done   -> open   the unit before is clear  -> open
 *   first open in order      -> current                          -> current
 *   otherwise                -> locked                           -> locked
 *
 * The one thing the map has that topics do not is an AUTHORING QUEUE: a node
 * with no `playable` link is not locked by progress, it is a node whose content
 * is not written yet. Conflating the two would tell a student they had failed
 * to unlock something that does not exist, so `queued` rides BESIDE the state
 * rather than inside it, and the copy differs. Concretely: in a reachable
 * unit a queued node is "open" with queued=true, rendered as the dashed
 * authoring treatment and never as a padlock, per the UNLOCK POLICY (only
 * unit gates lock; a mid-unit padlock inside the active unit is exactly the
 * defect the S3 critic measured). A queued node is never "current", because
 * a START tag over a node with no content is a promise the app cannot keep.
 * In an unreachable unit it is "locked" like its siblings, because there the
 * lock is the unit gate's true statement.
 *
 * PROGRESS IS SERVER STATE. CLAUDE.md: unlock state is enforced server side and
 * the client renders it. This is the rendering rule Phase 6's server applies to
 * the real attempt history, in the same shape as its sibling, and the journal it
 * reads is a local cache and never an entitlement.
 */

import type { EconomyEvent } from "@blueberry/economy";
import type { PathwayNode, PathwayUnit } from "../../demo/pathwayMap";

export type MapNodeState = "done" | "current" | "open" | "review" | "locked";

/** The bar a lesson has to clear to count as learned rather than as review. */
const REVIEW_ACCURACY = 0.75;

export interface MapNodeStatus {
  readonly state: MapNodeState;
  /** No authored content yet. Never a progress statement. */
  readonly queued: boolean;
}

export interface MapUnitStatus {
  /** Spine and gate nodes cleared, over the number that carry content today. */
  readonly done: number;
  readonly playable: number;
  /** Every node in the unit, whether or not it is authored. */
  readonly total: number;
  /** The unit the student is standing in: it holds the current node. */
  readonly active: boolean;
  /** Every earlier unit is finished, so this one's nodes are reachable. */
  readonly reachable: boolean;
}

export interface MapPathwayStatus {
  readonly nodes: ReadonlyMap<string, MapNodeStatus>;
  readonly units: ReadonlyMap<string, MapUnitStatus>;
  /** The one node a START tag hangs over, or null on a finished track. */
  readonly currentNodeId: string | null;
  readonly doneCount: number;
  readonly playableCount: number;
}

/** Nodes that sit ON the track: the spine, its gates, and the boss. */
function isTrackNode(node: PathwayNode): boolean {
  return node.kind !== "branch";
}

interface Tally {
  attempted: number;
  correct: number;
}

/**
 * The journal, read once into the three things this rule needs. Reading the
 * journal rather than `snapshot.lessons` is deliberate: `lessons` is keyed by
 * TopicId and a map node is not a topic, so the events are the only place the
 * map's own ids appear.
 */
function readJournal(journal: readonly EconomyEvent[]): {
  cleared: ReadonlySet<string>;
  passedUnits: ReadonlySet<string>;
  tallies: ReadonlyMap<string, Tally>;
} {
  const cleared = new Set<string>();
  const passedUnits = new Set<string>();
  const tallies = new Map<string, Tally>();
  for (const event of journal) {
    switch (event.kind) {
      case "node_cleared":
        cleared.add(event.nodeId);
        break;
      case "quiz_passed":
        passedUnits.add(event.unitId);
        break;
      case "unit_cleared":
        passedUnits.add(event.unitId);
        break;
      case "attempt": {
        const tally = tallies.get(event.nodeId) ?? { attempted: 0, correct: 0 };
        tally.attempted += 1;
        if (event.correct) tally.correct += 1;
        tallies.set(event.nodeId, tally);
        break;
      }
      default:
        break;
    }
  }
  return { cleared, passedUnits, tallies };
}

export function deriveMapPathway(
  units: readonly PathwayUnit[],
  journal: readonly EconomyEvent[],
): MapPathwayStatus {
  const { cleared, passedUnits, tallies } = readJournal(journal);
  const nodes = new Map<string, MapNodeStatus>();
  const unitStatus = new Map<string, MapUnitStatus>();

  let reachable = true;
  let currentNodeId: string | null = null;
  let doneCount = 0;
  let playableCount = 0;

  for (const unit of units) {
    const track = unit.nodes.filter(isTrackNode);
    const playable = track.filter((node) => node.playable !== undefined);
    const done = playable.filter((node) => cleared.has(node.id));
    // A unit finishes when every node in it that HAS content is cleared, or
    // when its checkpoint was passed as a whole. Counting unauthored nodes
    // against a student would lock the track behind our own authoring queue,
    // which is our problem and not theirs.
    const finished = passedUnits.has(unit.id) || (playable.length > 0 && done.length === playable.length);
    const unitReachable = reachable;
    let active = false;

    for (const node of unit.nodes) {
      const queued = node.playable === undefined;
      let state: MapNodeState;
      if (cleared.has(node.id)) {
        const tally = tallies.get(node.id);
        state = tally !== undefined && tally.attempted > 0 && tally.correct / tally.attempted < REVIEW_ACCURACY ? "review" : "done";
      } else if (!unitReachable) {
        state = "locked";
      } else if (!queued && currentNodeId === null && isTrackNode(node)) {
        state = "current";
        currentNodeId = node.id;
        active = true;
      } else {
        state = "open";
      }
      nodes.set(node.id, { state, queued });
    }

    unitStatus.set(unit.id, {
      done: done.length,
      playable: playable.length,
      total: unit.nodes.length,
      active,
      reachable: unitReachable,
    });
    doneCount += done.length;
    playableCount += playable.length;
    // A unit with no authored content at all cannot be finished, and must not
    // wall off everything behind it: the track stays reachable through it.
    if (!finished && playable.length > 0) reachable = false;
  }

  return { nodes, units: unitStatus, currentNodeId, doneCount, playableCount };
}

/** The status of one node, with a safe default for an id the map does not carry. */
export function statusOf(status: MapPathwayStatus, nodeId: string): MapNodeStatus {
  return status.nodes.get(nodeId) ?? { state: "locked", queued: true };
}

/**
 * Whether a unit is BEHIND the student: reachable, not the one being worked
 * in, fully cleared, and ordered before the active unit.
 *
 * THE EMPTY-UNIT HOLE, and this function exists to close it.
 *
 * A unit with no authored nodes has nothing to be active in, so
 * deriveMapPathway never marks it active and it used to fall straight through
 * the ordering test: with Unit 1 cleared, Unit 2's gate reported "passed"
 * while every node inside Unit 2 rendered locked or unauthored. The progress
 * green means "you moved" per docs/DESIGN-GOALS.md's palette rules, so a gate
 * saying it over content the student has never seen is a false progress
 * claim, not a styling slip.
 *
 * Being before the frontier is necessary but not sufficient. A unit is passed
 * when the student has actually cleared all of it, which needs authored nodes
 * to have cleared: `playable > 0 && done >= playable`. A unit with nothing in
 * it is not passed, it is empty.
 *
 * `order` is the unit ids in track order, handed in rather than imported, so
 * this stays pure over its arguments and testable without the demo map.
 */
export function unitPassed(
  status: MapPathwayStatus,
  order: readonly string[],
  unitId: string,
): boolean {
  const entry = status.units.get(unitId);
  if (entry === undefined) return false;
  if (!entry.reachable) return false;
  if (entry.active) return false;
  if (entry.playable === 0 || entry.done < entry.playable) return false;
  const index = order.indexOf(unitId);
  const activeIndex = order.findIndex((id) => status.units.get(id)?.active === true);
  return activeIndex === -1 ? true : index < activeIndex;
}
