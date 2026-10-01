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
 *   2. SIDE LOOPS. Every `branch` node is, in the map's own words, an
 *      "optional side quest", drawn as a dimmed detour off the main line (see
 *      weaveLoops). A unit with NO spine at all is all enrichment, so its
 *      branches ARE its track and ride the main lane: a detour needs a road
 *      to leave.
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
  /** Enrichment, as dimmed detours off the column. */
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
 * The column with its side loops woven in, in the order the DOM lays them.
 *
 * DOCUMENT ORDER IS THE TRAIL'S ORDER: PathScene reads [data-trail] anchors
 * off the page in document order and trail.ts consumes them without sorting,
 * so a loop chip emitted between two column chips becomes a detour that
 * leaves the spine and comes back, which is the goals' side-loop vocabulary.
 *
 * THE DETOUR IS SHORT AND THERE ARE FEW OF THEM, and both halves are this
 * round's correction.
 *
 * Attempt 2 spread the loops one per column node, so unit 4 drew three ovals
 * off three stretches of spine at once, unit 3 nine, and a critic measured
 * "four simultaneous forks at scrollY 0 and 2800, and six at scrollY 4200"
 * against the goals' "at most one fork visible per screen". Collapsing the
 * whole unit onto ONE detour fixed the count and broke the shape instead:
 * unit 3's nine enrichment nodes became a column of nine chips down one
 * flank, because a phone has about 195px of half column, the spine already
 * spends 112px of it, and 80px of remaining bow cannot make nine stacked
 * chips read as a loop. Measured on the built page at 390 by 844.
 *
 * So a run is CAPPED at three, which is the count the per-unit references
 * draw (one or two chips on a dimmed loop, never a list), and runs are
 * spaced RUN_GAP column nodes apart so two mouths are most of a screen from
 * each other. A unit with more enrichment than its column has room for puts
 * the overflow on the main lane, still dimmed: the chip keeps saying
 * "optional" in the one way the goals name (the authored dim), and what it
 * gives up is being drawn off the road, which is the lesser loss against
 * drawing a nine-chip list that is not one of the three shapes at all.
 *
 * WHY NOT THE FIRST OR LAST COLUMN NODE. A detour needs a spine node above
 * it AND below it to have a mouth at either end, so the run positions are
 * taken from [0, n-2] and never from the end.
 */
/** The most chips one detour may carry. The references draw one or two. */
export const RUN_MAX = 3;

/** The fewest column nodes between two detour mouths. */
export const RUN_GAP = 4;

export interface WovenEntry {
  readonly node: PathwayNode;
  readonly lane: "main" | "loop";
  /**
   * Enrichment, whichever lane it ended up on. The dim follows the NODE and
   * not the lane, because the overflow rides the main lane and is still
   * optional: "dimmed" is how the track says so, per the goals, and a chip
   * that lost its dim by being drawn on the road would be claiming to be
   * exam-weighted spine content.
   */
  readonly dim: boolean;
}

export function weaveLoops(column: readonly PathwayNode[], loops: readonly PathwayNode[]): readonly WovenEntry[] {
  if (loops.length === 0) return column.map((node) => ({ node, lane: "main" as const, dim: false }));
  if (column.length === 0) return loops.map((node) => ({ node, lane: "loop" as const, dim: true }));
  // A detour needs a road to leave AND a road to come back to. One spine node
  // gives it neither, so a single-node column's enrichment rides the main lane
  // rather than being drawn as a mouth with one anchor (which trail.ts would
  // have to drop, leaving the chips with no connector at all).
  if (column.length < 2) {
    return [
      ...column.map((node) => ({ node, lane: "main" as const, dim: false })),
      ...loops.map((node) => ({ node, lane: "main" as const, dim: true })),
    ];
  }
  const woven: WovenEntry[] = [];
  // Where the detours hang. Positions come from [0, n-2] (a mouth needs a
  // spine node below it as well as above it) at RUN_GAP spacing, so two
  // detours are never adjacent and are most of a screen apart.
  const mouths: number[] = [];
  for (let i = 0; i + 1 < column.length && mouths.length * RUN_MAX < loops.length; i += RUN_GAP) {
    mouths.push(i);
  }
  const onLoop = Math.min(loops.length, mouths.length * RUN_MAX);
  column.forEach((node, index) => {
    woven.push({ node, lane: "main", dim: false });
    const slot = mouths.indexOf(index);
    if (slot < 0) return;
    for (const loop of loops.slice(slot * RUN_MAX, Math.min((slot + 1) * RUN_MAX, onLoop))) {
      woven.push({ node: loop, lane: "loop", dim: true });
    }
  });
  // The overflow: enrichment a short column has no room to draw off the road.
  // It rides the main lane, still dimmed. See the note above this function.
  for (const loop of loops.slice(onLoop)) woven.push({ node: loop, lane: "main", dim: true });
  return woven;
}
