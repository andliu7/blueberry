/**
 * THE SHAPE OF A UNIT, derived from the map's own structure. Pure: no React,
 * no DOM, so the composition the track draws is testable without a document.
 *
 * ONE LINE, owner direction 2026-10-01: "make the lessons follow a
 * predictable path". A unit is its required lessons one after another in
 * their authored order, each opening the next (pathwayState.ts), then the
 * checkpoint. This retires the derived DIAMOND fork (a concept with two arms
 * either side) and the reserved HUB flower (a centre with petals) that this
 * file used to cut from the same data: both drew lessons that are required in
 * order as if they were a choice, and on Unit 1 the fork offered kinetic vs
 * thermodynamic control beside X2 addition when X2 leans on it.
 *
 * WHAT IS LEFT, in the order it runs:
 *
 *   1. THE MAIN LINE. Every spine and boss node, in authored order. Nothing
 *      is lifted, split or pulled out of order, so the drawn order is the
 *      unlock order by construction.
 *   2. SIDE QUESTS. Every `branch` node is, in the map's own words, an
 *      "optional side quest", drawn on a branch lane beside the road, off
 *      the lesson it branches from (see weaveBranches). A unit with NO spine
 *      at all is all enrichment, so its branches ARE its track and ride the
 *      main lane: a branch needs a road to leave.
 *   3. VIDEO HOOK. See VIDEO_HOOK below for what the badge does and does not
 *      claim.
 *
 * NOTHING HERE DECIDES UNLOCK. Shape is presentation; state comes from
 * pathwayState.ts. The two agree because both read authored order.
 */

import type { PathwayNode, PathwayUnit } from "../../demo/pathwayMap";

/**
 * A checkpoint unit is one whose track nodes are all gates. It lived in
 * terrain.ts while the generated landscape priced barriers off it; the
 * landscape was dropped outright (owner, 2026-09-17) and this is a statement
 * about the unit's own shape, so it moved here with the other shape rules.
 */
export function isCheckpointUnit(unit: PathwayUnit): boolean {
  const track = unit.nodes.filter((node) => node.kind !== "branch");
  return track.length > 0 && track.every((node) => node.kind === "gate");
}

export interface UnitShape {
  readonly unitId: string;
  /** The main line, in authored order: the order the lessons open in. */
  readonly column: readonly PathwayNode[];
  /** Enrichment: the side quests, drawn on the branch lane off the column. */
  readonly loops: readonly PathwayNode[];
  /** The unit's authored checkpoint questions, drawn above its own check. */
  readonly checkpoint: readonly PathwayNode[];
  /** The node carrying the video-hook badge, or null. See VIDEO_HOOK. */
  readonly videoHookId: string | null;
}

/**
 * THE VIDEO HOOK, and exactly what its badge claims.
 *
 * blueberry_spec-node-types draws seven node types and the seventh is the
 * video hook with its play badge. The map carries no video link kind, and
 * `demo/pathwayMap.ts` is not this piece's file to add one to, so the badge
 * is derived: it marks a unit's FIRST CONCEPT BEAT, which is the node
 * CLAUDE.md's content pipeline describes the one-minute explainer as opening
 * ("roughly one minute per concept, embedded in lessons").
 *
 * What it claims is that this node is the unit's video slot, which is a
 * PLACEMENT and is true today. What it does not claim is that the file
 * exists: no video is authored yet, and lessons must stand without one per
 * CLAUDE.md, which is what LessonVideo.tsx already renders honestly. This is
 * flagged in the build report rather than settled here, because "draw the
 * seventh type" and "never promise an asset that is missing" are two rules
 * that genuinely pull against each other and the resolution is the owner's.
 */
function videoHookOf(nodes: readonly PathwayNode[]): string | null {
  const beat = nodes.find((node) => node.playable?.kind === "beat");
  return beat === undefined ? null : beat.id;
}

export function unitShape(unit: PathwayUnit): UnitShape {
  const spine = unit.nodes.filter((node) => node.kind === "spine" || node.kind === "boss");
  const branches = unit.nodes.filter((node) => node.kind === "branch");
  const checkpoint = unit.nodes.filter((node) => node.kind === "gate");
  const videoHookId = videoHookOf(unit.nodes);
  // A unit that is all enrichment: its branches are its road. See the header.
  if (spine.length === 0) return { unitId: unit.id, column: branches, loops: [], checkpoint, videoHookId };
  return { unitId: unit.id, column: spine, loops: branches, checkpoint, videoHookId };
}

/**
 * WHERE A NODE SITS IN THE UNIT, so the track can SAY it.
 *
 * WHY. With the drawn trail deleted (owner, 2026-09-23, "just give it a
 * glow") the only thing left saying what comes after what was the geometry,
 * and a critic measured that it says nothing: on unit 1 at 390 by 844 no chip
 * carried an index in its text or its accessible name, two chips sat at the
 * same y with nothing ordering them, and the column reversed direction four
 * times across 226px of a 390px screen. Order was legible for exactly one
 * node, the current one, because it was the only saturated face.
 *
 * SO THE MAIN LINE IS NUMBERED, 1 to n, because since 2026-10-01 it is a
 * line: each lesson opens the next, so its position is a true statement about
 * order. Loops get no number at all: an optional detour that counted as a
 * step would make the totals disagree with the main line. The check closes
 * the unit and counts its own questions.
 *
 * Derived from the shape and nothing else, so a unit that changes shape
 * changes what its chips say in the same breath.
 */
export type NodePlace =
  | { readonly kind: "step"; readonly index: number; readonly total: number }
  | { readonly kind: "loop" }
  | { readonly kind: "check"; readonly index: number; readonly total: number };

/**
 * WHAT A PLACE SAYS OUT LOUD. It opens the chip's accessible name, ahead of
 * the blurb, because it is the thing the geometry stopped saying when the
 * drawn trail was deleted.
 *
 * It lives HERE, beside the derivation, rather than in PathwayTab, for one
 * reason: PathwayTab imports the app's hooks and cannot load outside a
 * document, so a sentence written there can only ever be pinned by grepping
 * the source. Here it is pinned by being run.
 */
export function placeSaid(place: NodePlace | null): string | null {
  if (place === null) return null;
  switch (place.kind) {
    case "step":
      return `Step ${place.index} of ${place.total}`;
    case "loop":
      return "Optional side quest, off the main path";
    case "check":
      return `Unit check, question ${place.index} of ${place.total}`;
  }
}

export function nodePlaces(shape: UnitShape): ReadonlyMap<string, NodePlace> {
  const places = new Map<string, NodePlace>();
  shape.column.forEach((node, i) => places.set(node.id, { kind: "step", index: i + 1, total: shape.column.length }));
  for (const node of shape.loops) places.set(node.id, { kind: "loop" });
  shape.checkpoint.forEach((node, i) =>
    places.set(node.id, { kind: "check", index: i + 1, total: shape.checkpoint.length }),
  );
  return places;
}

/**
 * THE BRANCH LANE, owner 2026-10-01: "optional side quests leave the main
 * road". Each side quest hangs off the main-line lesson it BRANCHES FROM, on
 * a lane of its own beside the road, with a drawn trail back to that lesson.
 *
 * It replaces the weave (weaveLoops, RUN_MAX, RUN_GAP), which hung side
 * quests at fixed mouths every four lessons. The mouths were chosen for
 * spacing, not for content, so on Unit 1 all three side quests sat between
 * steps 1 and 2 whatever they waited for, and a critic read the run as
 * skipped lessons on the road (g9).
 *
 * WHICH LESSON A SIDE QUEST BRANCHES FROM is the same rule that unlocks it
 * (pathwayState.ts, prerequisitesOf), said as a place: the LATEST main-line
 * lesson it waits for, following a chain through other side quests (the
 * inverse Diels-Alder waits for the Diels-Alder, so it rides the same
 * branch). A side quest with no `after` waits for every main-line lesson
 * authored above it, so it hangs off the last of them. One authored above
 * every lesson (no map node is today) hangs off the first, so it is never
 * drawn above the road it leaves.
 *
 * Returns an index into `column`, or -1 for an empty column.
 */
export function branchAnchor(unit: PathwayUnit, column: readonly PathwayNode[], node: PathwayNode): number {
  if (column.length === 0) return -1;
  if (node.after !== undefined) {
    let at = 0;
    for (const id of node.after) {
      const onLine = column.findIndex((entry) => entry.id === id);
      const branch = onLine === -1 ? unit.nodes.find((entry) => entry.id === id) : undefined;
      at = Math.max(at, onLine !== -1 ? onLine : branch !== undefined ? branchAnchor(unit, column, branch) : 0);
    }
    return at;
  }
  const authoredAt = unit.nodes.indexOf(node);
  let at = 0;
  column.forEach((entry, index) => {
    if (unit.nodes.indexOf(entry) < authoredAt) at = index;
  });
  return at;
}

/** One row of a unit in document order: a main-line lesson or a side quest on the branch lane. */
export interface WovenEntry {
  readonly node: PathwayNode;
  readonly lane: "main" | "branch";
}

/**
 * The unit in the order the DOM lays it: each main-line lesson, then the side
 * quests that branch from it, in authored order. A unit with no spine has no
 * road to branch off, so its branches ARE its column (unitShape) and every
 * row is "main" here.
 */
export function weaveBranches(unit: PathwayUnit, shape: UnitShape = unitShape(unit)): readonly WovenEntry[] {
  const anchors = shape.loops.map((node) => branchAnchor(unit, shape.column, node));
  const woven: WovenEntry[] = [];
  shape.column.forEach((node, index) => {
    woven.push({ node, lane: "main" });
    shape.loops.forEach((loop, at) => {
      if (anchors[at] === index) woven.push({ node: loop, lane: "branch" });
    });
  });
  return woven;
}
