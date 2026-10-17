/**
 * REVIEW CHECKPOINTS: concept checks between groups of lessons that are not
 * stage quizzes.
 *
 * Owner, 2026-10-17: "I want checkpoints in between" and, later the same day,
 * "more distinct checkpoints inside of each unit ... like quiz/concept checks".
 * Unit 1's stage quizzes (u1-quiz-a, -b, -d) are concept checks already. Stage
 * D still ran seven lessons without one, so this file adds a concept check in
 * that gap. Every section of main-line lessons between two checkpoints is now
 * 3 to 5 lessons long, which test/pathwayCheckpoints.test.ts pins.
 *
 * WHY THESE ARE NOT MAP NODES. demo/pathwayMap.ts is shared with three other
 * lanes and test/unit1Pathway.test.ts pins Unit 1's node list exactly, so a
 * new node there would break another lane's test. A review stays out of the
 * map and is laid OVER the map's status instead (withReviewGates below): it
 * opens when the lesson before it is cleared, takes START, and holds the next
 * lesson shut until it is cleared, like any checkpoint on the line. Its clear
 * is journalled under its own id, kind "review".
 *
 * Pure and light: no React, and no pool import, because the pathway is in the
 * entry chunk and the pools are not. reviewPool.ts holds the heavy half.
 */
import type { PathwayUnit } from "../../demo/pathwayMap";
import type { MapNodeState, MapNodeStatus, MapPathwayStatus } from "./pathwayState";

export interface ReviewCheckpoint {
  /** The id the route, the charge and the journal all carry. Never a map node id. */
  readonly id: string;
  readonly unitId: string;
  /** The main-line lesson this stop sits directly after, and opens behind. */
  readonly after: string;
  /** The lessons whose problems the review mixes, in path order. */
  readonly reviews: readonly string[];
  readonly title: string;
  readonly blurb: string;
}

export const REVIEW_CHECKPOINTS: readonly ReviewCheckpoint[] = Object.freeze([
  {
    id: "u1-review-d",
    unitId: "u1",
    after: "u1-dienophiles",
    reviews: ["u1-mo", "u1-da", "u1-dienes", "u1-dienophiles"],
    title: "Diels-Alder concept check",
    blurb: "Mixed questions from MO ladders, the Diels-Alder, dienes and dienophiles. Get 4 in a row to clear it.",
  },
]);

/** The review stop with this id, or null for any other id. */
export function reviewCheckpointFor(id: string): ReviewCheckpoint | null {
  return REVIEW_CHECKPOINTS.find((review) => review.id === id) ?? null;
}

/** The review stops drawn directly after this main-line lesson. */
export function reviewsAfter(nodeId: string): readonly ReviewCheckpoint[] {
  return REVIEW_CHECKPOINTS.filter((review) => review.after === nodeId);
}

/**
 * How many right in a row clears a review: one per lesson it reviews, so a
 * clean clear always samples every one of them (the pool is interleaved, so
 * any run of that length touches each lesson once). Four for the Diels-Alder.
 */
export function clearTargetFor(review: ReviewCheckpoint): number {
  return review.reviews.length;
}

export interface GatedPathway {
  /** The map's status with every review stop added and its gate applied. */
  readonly status: MapPathwayStatus;
  /** A main-line lesson held shut by a review stop, to the stop holding it. */
  readonly gatedBy: ReadonlyMap<string, ReviewCheckpoint>;
}

/**
 * The map's status with the review stops laid over it. Pure.
 *
 * A review is "done" once its own clear is journalled and "locked" until the
 * lesson before it is behind the student. Between those it is a checkpoint:
 * it takes START (when START was on a lesson after it) and every main-line
 * lesson after it that was open or current is locked until it clears.
 *
 * ONE EXCEPTION, for progress saved before the stop existed: if the student
 * has already cleared a lesson past it, the stop is "open" and holds nothing,
 * so START never jumps backwards on someone further along.
 */
export function withReviewGates(
  units: readonly PathwayUnit[],
  status: MapPathwayStatus,
  cleared: ReadonlySet<string>,
  reviews: readonly ReviewCheckpoint[] = REVIEW_CHECKPOINTS,
): GatedPathway {
  const nodes = new Map<string, MapNodeStatus>(status.nodes);
  const gatedBy = new Map<string, ReviewCheckpoint>();
  let currentNodeId = status.currentNodeId;

  for (const review of reviews) {
    const unit = units.find((entry) => entry.id === review.unitId);
    if (unit === undefined) continue;
    const line = unit.nodes.filter((node) => node.kind !== "branch");
    const at = line.findIndex((node) => node.id === review.after);
    if (at === -1) continue;
    const ahead = line.slice(at + 1);
    const before = nodes.get(review.after)?.state ?? "locked";

    let state: MapNodeState;
    if (cleared.has(review.id)) state = "done";
    else if (before !== "done" && before !== "review") state = "locked";
    else if (ahead.some((node) => cleared.has(node.id))) state = "open";
    else {
      for (const node of ahead) {
        const live = nodes.get(node.id);
        if (live === undefined || live.queued) continue;
        if (live.state === "current" || live.state === "open") nodes.set(node.id, { ...live, state: "locked" });
        gatedBy.set(node.id, review);
      }
      const startWasAhead = currentNodeId !== null && ahead.some((node) => node.id === currentNodeId);
      if (startWasAhead) currentNodeId = review.id;
      state = startWasAhead ? "current" : "open";
    }
    nodes.set(review.id, { state, queued: false });
  }

  return { status: { ...status, nodes, currentNodeId }, gatedBy };
}

/**
 * THE REVIEW STOP THAT REALLY HOLDS A LOCKED LESSON, for its "Opens after"
 * sentence (round 4 of P1). withReviewGates only records a hold once the
 * lesson before the stop is cleared, so on a fresh profile "Predict starting
 * materials" named Dienophiles, while the true last step is the Diels-Alder
 * concept check. The nearest wait on the line is `waitId`; any uncleared
 * review sitting at or after it and before `nodeId` opens later than it, so
 * that review is what the student actually waits for. Null when none does.
 */
export function reviewHolding(
  unit: PathwayUnit,
  waitId: string,
  nodeId: string,
  cleared: ReadonlySet<string>,
  reviews: readonly ReviewCheckpoint[] = REVIEW_CHECKPOINTS,
): ReviewCheckpoint | null {
  const line = unit.nodes.filter((node) => node.kind !== "branch").map((node) => node.id);
  const from = line.indexOf(waitId);
  const to = line.indexOf(nodeId);
  if (from === -1 || to === -1) return null;
  let holding: ReviewCheckpoint | null = null;
  for (const review of reviews) {
    if (review.unitId !== unit.id || cleared.has(review.id)) continue;
    const at = line.indexOf(review.after);
    if (at >= from && at < to && (holding === null || at > line.indexOf(holding.after))) holding = review;
  }
  return holding;
}
