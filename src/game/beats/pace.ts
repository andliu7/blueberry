/**
 * A unit's PACE: how hard the next lesson in it plays. Audit 23 Oct, section 4.
 *
 *   +1  the student is ahead: skip the meet step, the node's L2 questions first
 *       and then at most two L1 (template.ts lessonRecogniseBeats)
 *    0  the authored lesson: L1, then L2
 *   -1  the student is struggling: keep the meet step, L1 only, and the reward
 *       card points at the guide and the flashcards
 *
 * WHY A PURE FUNCTION OF THE JOURNAL AND NOT A STORED NUMBER. Every number in
 * this game is derived from the append-only journal (packages/economy, the
 * f(journal) rule), so pace is too: it can be recomputed on any device from
 * the same history, and there is no second copy to drift.
 *
 * THE RULES, walked in journal order over the unit's lessons:
 *   - a TAP wins. lesson_rated too_easy sets +1, too_hard sets -1, about_right
 *     sets 0. It is journalled after the clear it rates, so it overrides that
 *     lesson's own result.
 *   - otherwise each lesson clear moves pace by how it went: two flawless
 *     (recycle-free) clears in a row set +1; first-try accuracy under 50% sets
 *     -1; a mixed result decays pace to 0. One flawless clear lifts -1 to 0 and
 *     leaves 0 or +1 where it is.
 *   - a node with a mechanism step reports only solves, never misses, so its
 *     clear says nothing about accuracy: only its tap counts.
 *
 * Accuracy is read from node_cleared.cleared (first-try right) over
 * stepsInOneSitting (questions played). A clear journalled without `cleared`
 * (before 23 Oct, or from a surface that does not count) can still be
 * flawless or mixed, never under 50%.
 *
 * Nothing here locks content or touches diamonds. Do not confuse this with
 * MasterySource in types.ts, which is unused and belongs to Phase 6.
 */

import type { EconomyEvent, LessonRating } from "@blueberry/economy";
import { checkpointNodeId, pathwayNode, PATHWAY_UNITS } from "../demo/pathwayMap";
import { lessonTrainerFor } from "../content/u1/lessonTrainers";
import { unitSections } from "../tabs/pathway/testOuts";

export type Pace = -1 | 0 | 1;

export type { LessonRating };

const RATING_PACE: Readonly<Record<LessonRating, Pace>> = { too_easy: 1, about_right: 0, too_hard: -1 };

/** The unit a node belongs to (its checkpoint included), or null for a node on no unit. */
export function unitIdForNode(nodeId: string): string | null {
  for (const unit of PATHWAY_UNITS) {
    if (checkpointNodeId(unit.id) === nodeId || unit.nodes.some((node) => node.id === nodeId)) return unit.id;
  }
  return null;
}

/** Whether a node's lesson ends on the trainer, which reports solves and never misses. */
function hasMechanismStep(nodeId: string): boolean {
  const link = lessonTrainerFor(nodeId) ?? pathwayNode(nodeId)?.playable;
  return link?.kind === "reaction" || link?.kind === "sequence" || link?.kind === "resonance";
}

type Outcome = "flawless" | "poor" | "mixed";

function outcomeOf(event: Extract<EconomyEvent, { kind: "node_cleared" }>): Outcome {
  if (event.flawless) return "flawless";
  if (event.cleared !== undefined && event.cleared / event.stepsInOneSitting < 0.5) return "poor";
  return "mixed";
}

/** The unit's pace now. 0 for an unknown unit or a journal with nothing in it. */
export function paceFor(journal: readonly EconomyEvent[], unitId: string): Pace {
  const unit = PATHWAY_UNITS.find((one) => one.id === unitId);
  if (unit === undefined) return 0;
  const inUnit = new Set([...unit.nodes.map((node) => node.id), checkpointNodeId(unit.id)]);

  // Journal order is time order on a tie (the derivation's own rule), so a
  // stable sort by timestamp keeps a clear before the tap that rates it.
  const events = journal
    .filter((event) => (event.kind === "lesson_rated" || event.kind === "node_cleared") && inUnit.has(event.nodeId))
    .map((event, i) => ({ event, i, ms: Date.parse(event.at) }))
    .sort((a, b) => a.ms - b.ms || a.i - b.i);

  let pace: Pace = 0;
  let flawlessRun = 0;
  for (const { event } of events) {
    if (event.kind === "lesson_rated") {
      pace = RATING_PACE[event.rating];
      continue;
    }
    if (event.kind !== "node_cleared" || hasMechanismStep(event.nodeId)) continue;
    const outcome = outcomeOf(event);
    if (outcome === "flawless") {
      flawlessRun += 1;
      if (flawlessRun >= 2) pace = 1;
      else if (pace === -1) pace = 0;
    } else {
      flawlessRun = 0;
      pace = outcome === "poor" ? -1 : 0;
    }
  }
  return pace;
}

/** The pace for the unit a node is on; 0 for a node on no unit. */
export function paceForNode(journal: readonly EconomyEvent[], nodeId: string): Pace {
  const unitId = unitIdForNode(nodeId);
  return unitId === null ? 0 : paceFor(journal, unitId);
}

/**
 * The section test a node's section offers, for the reward card's "Skip ahead"
 * at pace +1, or null when that section has no test-out.
 */
export function skipAheadTestId(nodeId: string): string | null {
  const unit = PATHWAY_UNITS.find((one) => one.id === unitIdForNode(nodeId));
  if (unit === undefined) return null;
  return unitSections(unit).find((section) => section.sources.includes(nodeId))?.testId ?? null;
}
