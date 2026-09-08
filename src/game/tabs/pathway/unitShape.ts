/**
 * THE SHAPE OF A UNIT, derived from the map's own structure. Pure: no React,
 * no DOM, so the composition the track draws is testable without a document.
 *
 * WHY THIS FILE EXISTS. The attempt-2 build authored one fork (u1) and one hub
 * (u3) as hardcoded constants, so eleven of thirteen units rendered as bare
 * winding columns and the critic named it: docs/DESIGN-GOALS.md says the
 * "DIAMOND fork is the DEFAULT UNIT SHAPE (concept node above the fork,
 * branches rejoin at the unit gate)", and a default that ships twice is not a
 * default. So the diamond is DERIVED here, for every unit, from the data the
 * map already carries, and nothing about a unit's shape is authored twice.
 *
 * THE DERIVATION, in the order it runs, and every step is a rule rather than a
 * judgement about one unit:
 *
 *   1. HUB, and it stays RESERVED. The goals reserve the petal flower for
 *      "categories with three or more families (EAS, the acyl ladder)", which
 *      is a two-item list, not a default. HUB_PLANS names exactly those two
 *      and hubPlan.ts explains each choice; a unit not in that table cannot
 *      grow a flower, and a table entry whose nodes have been renamed away
 *      degrades to the winding column rather than drawing a bald one.
 *   2. DIAMOND, the default. The fork sits at the END of the unit so the
 *      arms have somewhere to rejoin: the unit gate is drawn directly beneath
 *      them, in the same section, which is the whole of the attempt-2 rejoin
 *      bug (its gate was the NEXT unit's, about 700px down the page, so the
 *      arms closed across a banner and a side-quest block).
 *      The concept is the unit's own CONCEPT BEAT where one is in reach: a
 *      beat is MCQ, sort or ladder work, which is recognition and ranking,
 *      which is what a concept node is. Failing that it is the third node
 *      from the end, which is the plain positional reading of the committed
 *      diamond. The arms are what follows the concept, and if only one node
 *      follows it the node BEFORE the concept is pulled up into the other
 *      arm: that is how u1 derives the fork a human would author for it
 *      (kinetic-vs-thermodynamic above, 1,2-vs-1,4 and X2 addition either
 *      side), without u1 being named anywhere in this file.
 *   3. SIDE LOOPS. Every `branch` node in the map is, in the map's own words,
 *      an "optional side quest", which is the goals' dimmed side loop. They
 *      are interleaved through the column so each detour carries one or two
 *      chips and the spine reads as continuous past them, rather than piling
 *      into a flow-wrapped list of dashed pills (the attempt-2 defect).
 *      A unit with NO spine at all is all enrichment, so its branches ARE its
 *      track and ride the main lane: a detour needs a road to leave.
 *   4. VIDEO HOOK. The seventh node type in blueberry_spec-node-types, and it
 *      had no vocabulary at all before this build. See VIDEO_HOOK below for
 *      what the badge does and does not claim.
 *
 * NOTHING HERE DECIDES UNLOCK. Shape is presentation; state comes from
 * pathwayState.ts, where only unit gates lock, so both arms of every diamond
 * are genuinely open at once and the fork is the unlock policy made visible
 * rather than a decoration over a chain (docs/DESIGN-GOALS.md, 2026-09-01).
 */

import type { PathwayNode, PathwayUnit } from "../../demo/pathwayMap";
import { HUB_PLANS, type HubPlan } from "./hubPlan";

/** The smallest spine a diamond can be cut from: a concept and two arms. */
export const MIN_DIAMOND_SPINE = 3;

/** How far back from the end of the spine a concept beat may be lifted. */
export const CONCEPT_REACH = 5;

export type UnitShapeKind = "diamond" | "hub" | "column";

/** One node on the track, with the lane it rides and the badge it wears. */
export interface UnitShape {
  readonly unitId: string;
  /** What the unit reads as. "hub" units also carry a diamond below the flower. */
  readonly kind: UnitShapeKind;
  /** The shared mechanism at the centre of the flower, or null. */
  readonly hub: PathwayNode | null;
  /** The reaction families ringing it. Empty unless `hub` is set. */
  readonly petals: readonly PathwayNode[];
  /** The winding column above the fork, in authored order. */
  readonly column: readonly PathwayNode[];
  /** The concept node drawn centred above the split, or null with no fork. */
  readonly concept: PathwayNode | null;
  /** The two arms. Both empty with no fork. */
  readonly arms: readonly [readonly PathwayNode[], readonly PathwayNode[]];
  /** Enrichment, as dimmed detours off the column. */
  readonly loops: readonly PathwayNode[];
  /** The unit's checkpoint questions, drawn under the gate arch. */
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

/** The hub plan for a unit, only if every node it names is still present. */
function hubFor(unit: PathwayUnit): { readonly hub: PathwayNode; readonly petals: readonly PathwayNode[] } | null {
  const plan: HubPlan | undefined = HUB_PLANS.find((entry) => entry.unitId === unit.id);
  if (plan === undefined) return null;
  const hub = unit.nodes.find((node) => node.id === plan.hub);
  if (hub === undefined) return null;
  const petals = plan.petals
    .map((id) => unit.nodes.find((node) => node.id === id))
    .filter((node): node is PathwayNode => node !== undefined);
  // The goals reserve the shape for three or more families. Fewer than that
  // and the flower is not the thing the reservation was written for.
  return petals.length >= 3 ? { hub, petals } : null;
}

/** Split a run of arm nodes into left and right, first half then second. */
function splitArms(nodes: readonly PathwayNode[]): readonly [readonly PathwayNode[], readonly PathwayNode[]] {
  const half = Math.ceil(nodes.length / 2);
  return [nodes.slice(0, half), nodes.slice(half)];
}

/**
 * Where the concept sits in a spine run, or -1 when no diamond fits.
 *
 * A concept beat wins when one sits within CONCEPT_REACH of the end and has
 * at least one node after it; otherwise the third node from the end, which
 * is the committed diamond read positionally.
 */
export function conceptIndex(spine: readonly PathwayNode[]): number {
  if (spine.length < MIN_DIAMOND_SPINE) return -1;
  const floor = Math.max(0, spine.length - CONCEPT_REACH);
  for (let i = spine.length - 2; i >= floor; i -= 1) {
    if (spine[i]!.playable?.kind === "beat") return i;
  }
  return spine.length - MIN_DIAMOND_SPINE;
}

export function unitShape(unit: PathwayUnit): UnitShape {
  const spineAll = unit.nodes.filter((node) => node.kind === "spine" || node.kind === "boss");
  const branches = unit.nodes.filter((node) => node.kind === "branch");
  const checkpoint = unit.nodes.filter((node) => node.kind === "gate");
  const videoHookId = videoHookOf(unit.nodes);

  const flower = hubFor(unit);
  const taken = new Set<string>(flower === null ? [] : [flower.hub.id, ...flower.petals.map((node) => node.id)]);
  const spine = spineAll.filter((node) => !taken.has(node.id));

  // No spine anywhere in the unit: the enrichment IS the track, so it rides
  // the main lane. A detour needs a road to leave and come back to.
  if (spineAll.length === 0) {
    return {
      unitId: unit.id,
      kind: "column",
      hub: null,
      petals: [],
      column: branches,
      concept: null,
      arms: [[], []],
      loops: [],
      checkpoint,
      videoHookId,
    };
  }

  const at = conceptIndex(spine);
  if (at === -1) {
    return {
      unitId: unit.id,
      kind: flower === null ? "column" : "hub",
      hub: flower?.hub ?? null,
      petals: flower?.petals ?? [],
      column: spine,
      concept: null,
      arms: [[], []],
      loops: branches,
      checkpoint,
      videoHookId,
    };
  }

  const concept = spine[at]!;
  let armNodes = spine.slice(at + 1);
  let column = spine.slice(0, at);
  // Only one node follows the concept: pull the node before it up into the
  // other arm, so the diamond is a diamond rather than a kink. This is what
  // makes u1 derive the fork a human would author for it.
  if (armNodes.length < 2 && at >= 1) {
    armNodes = [spine[at - 1]!, ...armNodes];
    column = spine.slice(0, at - 1);
  }

  return {
    unitId: unit.id,
    kind: flower === null ? "diamond" : "hub",
    hub: flower?.hub ?? null,
    petals: flower?.petals ?? [],
    column,
    concept,
    arms: splitArms(armNodes),
    loops: branches,
    checkpoint,
    videoHookId,
  };
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
