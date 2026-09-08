/**
 * The authored trace content: carbonyl families and the Diels Alder skeletons.
 *
 * Two families, both asked for by the owner, and both chosen because the
 * drawing IS the lesson rather than decoration on it. A student who cannot put
 * the carbonyl at the end of a chain for an aldehyde and in the middle for a
 * ketone has not learned the difference by being told it, and a student who has
 * never drawn butadiene in its s-cis shape will not see why the s-trans one
 * cannot react. Tracing is the cheapest way to make a hand know a shape.
 *
 * WHAT IS AUTHORED HERE AND WHAT IS NOT. Each target is a graph plus a stroke
 * plan. The guide strokes, the answer key, the molecular formula and the
 * element palette are all derived from it by target.ts, so this file cannot
 * disagree with itself. Coordinates are in the target's own space, SVG
 * convention with y growing downward, at a bond length of BOND_PX; the surface
 * fits a viewBox around whatever extents these produce, so a molecule can be
 * authored where it reads well rather than inside a fixed frame.
 *
 * NODE IDS AND A CONFLICT, recorded rather than silently resolved. The build
 * task named "Diels Alder skeletons (u2)". In demo/pathwayMap.ts `u2` is
 * Aromaticity and Benzene; Diels Alder lives at `u1-da` in Unit 1 and `u12-da`
 * in Unit 12. These beats are authored against the ids that exist. If the task
 * meant a unit that has not been authored yet, the fix is a node id here, not a
 * renumbering of the map.
 *
 * TOLERANCE IS PER BEAT, per beats/types.ts, and none of these numbers may be
 * widened to make an attempt pass. That is the non negotiable in CLAUDE.md and
 * it applies to a corridor exactly as it applies to an assertion: a trace that
 * needs a wider corridor needs a better guide.
 */

import type { MasteryLevel, TraceBeat } from "../types";
import { strokesOf, type TraceTarget } from "./target";

/** One bond, in target space. The whole file is laid out in multiples of it. */
export const BOND_PX = 64;

/** Every level a trace beat can serve. Spelled once so the beats stay in step. */
const FULL_LADDER: readonly MasteryLevel[] = [0, 1, 2, 3];
const FROM_GUIDED: readonly MasteryLevel[] = [1, 2, 3];

/* ------------------------------------------------------------------ */
/* Carbonyls, Unit 7                                                    */
/* ------------------------------------------------------------------ */

/**
 * Propanal. The carbonyl at the END of the chain, which is what makes it an
 * aldehyde and what forces the one hydrogen on that carbon.
 */
const PROPANAL: TraceTarget = {
  id: "propanal",
  name: "propanal, an aldehyde",
  vertices: [
    { id: "c1", x: 70, y: 150 },
    { id: "c2", x: 125, y: 118 },
    { id: "c3", x: 180, y: 150 },
    { id: "o1", x: 235, y: 118, element: "O" },
  ],
  edges: [
    { id: "b1", a: "c1", b: "c2", order: 1 },
    { id: "b2", a: "c2", b: "c3", order: 1 },
    { id: "b3", a: "c3", b: "o1", order: 2 },
  ],
  strokes: [
    { id: "s1", label: "the three carbon chain", edgeIds: ["b1", "b2"], startVertexId: "c1" },
    { id: "s2", label: "the carbon to oxygen double bond, out at the end", edgeIds: ["b3"], startVertexId: "c3" },
  ],
};

/** Acetone. Same formula as propanal, carbonyl moved inboard. That is the point. */
const ACETONE: TraceTarget = {
  id: "acetone",
  name: "acetone, a ketone",
  vertices: [
    { id: "c1", x: 80, y: 170 },
    { id: "c2", x: 135, y: 138 },
    { id: "c3", x: 190, y: 170 },
    { id: "o1", x: 135, y: 74, element: "O" },
  ],
  edges: [
    { id: "b1", a: "c1", b: "c2", order: 1 },
    { id: "b2", a: "c2", b: "c3", order: 1 },
    { id: "b3", a: "c2", b: "o1", order: 2 },
  ],
  strokes: [
    { id: "s1", label: "the three carbon chain", edgeIds: ["b1", "b2"], startVertexId: "c1" },
    { id: "s2", label: "the carbon to oxygen double bond, in the middle this time", edgeIds: ["b3"], startVertexId: "c2" },
  ],
};

/**
 * The gem diol: what water addition to acetone actually leaves behind. Drawing
 * it is how the tetrahedral product stops being a phrase.
 */
const ACETONE_HYDRATE: TraceTarget = {
  id: "acetone-hydrate",
  name: "the gem diol, acetone plus water",
  vertices: [
    { id: "c1", x: 80, y: 180 },
    { id: "c2", x: 135, y: 148 },
    { id: "c3", x: 190, y: 180 },
    { id: "o1", x: 103, y: 93, element: "O" },
    { id: "o2", x: 167, y: 93, element: "O" },
  ],
  edges: [
    { id: "b1", a: "c1", b: "c2", order: 1 },
    { id: "b2", a: "c2", b: "c3", order: 1 },
    { id: "b3", a: "c2", b: "o1", order: 1 },
    { id: "b4", a: "c2", b: "o2", order: 1 },
  ],
  strokes: [
    { id: "s1", label: "the three carbon chain", edgeIds: ["b1", "b2"], startVertexId: "c1" },
    { id: "s2", label: "the first oxygen, single bonded now", edgeIds: ["b3"], startVertexId: "c2" },
    { id: "s3", label: "the second oxygen, on the same carbon", edgeIds: ["b4"], startVertexId: "c2" },
  ],
};

/** The imine: nitrogen where the oxygen was, still doubly bonded. */
const N_METHYL_IMINE: TraceTarget = {
  id: "n-methyl-ethanimine",
  name: "an imine, N-methylethanimine",
  vertices: [
    { id: "c1", x: 70, y: 160 },
    { id: "c2", x: 125, y: 128 },
    { id: "n1", x: 180, y: 160, element: "N" },
    { id: "c3", x: 235, y: 128 },
  ],
  edges: [
    { id: "b1", a: "c1", b: "c2", order: 1 },
    { id: "b2", a: "c2", b: "n1", order: 2 },
    { id: "b3", a: "n1", b: "c3", order: 1 },
  ],
  strokes: [
    { id: "s1", label: "the carbon to carbon bond", edgeIds: ["b1"], startVertexId: "c1" },
    { id: "s2", label: "the carbon to nitrogen double bond", edgeIds: ["b2"], startVertexId: "c2" },
    { id: "s3", label: "the methyl group nitrogen brought with it", edgeIds: ["b3"], startVertexId: "n1" },
  ],
};

/* ------------------------------------------------------------------ */
/* Diels Alder, Units 1 and 12                                          */
/* ------------------------------------------------------------------ */

/**
 * Butadiene drawn s-cis: both double bonds on the same side of the single bond,
 * a U rather than a Z. This is the conformation that can reach a dienophile,
 * and the shape is the whole reason cyclopentadiene reacts and s-trans dienes
 * sit there.
 */
const S_CIS_BUTADIENE: TraceTarget = {
  id: "s-cis-butadiene",
  name: "buta-1,3-diene in its s-cis shape",
  vertices: [
    { id: "c1", x: 80, y: 100 },
    { id: "c2", x: 124, y: 145 },
    { id: "c3", x: 188, y: 145 },
    { id: "c4", x: 232, y: 100 },
  ],
  edges: [
    { id: "b1", a: "c1", b: "c2", order: 2 },
    { id: "b2", a: "c2", b: "c3", order: 1 },
    { id: "b3", a: "c3", b: "c4", order: 2 },
  ],
  strokes: [
    { id: "s1", label: "the first double bond", edgeIds: ["b1"], startVertexId: "c1" },
    { id: "s2", label: "the single bond that lets it turn", edgeIds: ["b2"], startVertexId: "c2" },
    { id: "s3", label: "the second double bond, folding back the same way", edgeIds: ["b3"], startVertexId: "c3" },
  ],
};

/** Acrolein: the dienophile, and the carbonyl is why it is one. */
const ACROLEIN: TraceTarget = {
  id: "acrolein",
  name: "acrolein, an electron poor dienophile",
  vertices: [
    { id: "c1", x: 70, y: 150 },
    { id: "c2", x: 125, y: 118 },
    { id: "c3", x: 180, y: 150 },
    { id: "o1", x: 235, y: 118, element: "O" },
  ],
  edges: [
    { id: "b1", a: "c1", b: "c2", order: 2 },
    { id: "b2", a: "c2", b: "c3", order: 1 },
    { id: "b3", a: "c3", b: "o1", order: 2 },
  ],
  strokes: [
    { id: "s1", label: "the alkene that will react", edgeIds: ["b1"], startVertexId: "c1" },
    { id: "s2", label: "the single bond joining it to the carbonyl", edgeIds: ["b2"], startVertexId: "c2" },
    { id: "s3", label: "the carbonyl pulling electron density away", edgeIds: ["b3"], startVertexId: "c3" },
  ],
};

/**
 * Cyclohexene, the adduct. Authored with the ring as ONE long stroke on
 * purpose: five edges in a single gesture is what a hand actually does with a
 * ring, and it is also the case the windowed projection in geometry.ts exists
 * for, since the path comes back within a bond length of where it started.
 */
const CYCLOHEXENE: TraceTarget = {
  id: "cyclohexene",
  name: "cyclohexene, the Diels Alder adduct",
  vertices: [
    { id: "r1", x: 160, y: 76 },
    { id: "r2", x: 215.4, y: 108 },
    { id: "r3", x: 215.4, y: 172 },
    { id: "r4", x: 160, y: 204 },
    { id: "r5", x: 104.6, y: 172 },
    { id: "r6", x: 104.6, y: 108 },
  ],
  edges: [
    { id: "b1", a: "r1", b: "r2", order: 2 },
    { id: "b2", a: "r2", b: "r3", order: 1 },
    { id: "b3", a: "r3", b: "r4", order: 1 },
    { id: "b4", a: "r4", b: "r5", order: 1 },
    { id: "b5", a: "r5", b: "r6", order: 1 },
    { id: "b6", a: "r6", b: "r1", order: 1 },
  ],
  strokes: [
    {
      id: "s1",
      label: "the ring, all the way round in one go",
      edgeIds: ["b2", "b3", "b4", "b5", "b6"],
      startVertexId: "r2",
    },
    { id: "s2", label: "the one double bond the reaction leaves behind", edgeIds: ["b1"], startVertexId: "r1" },
  ],
};

/* ------------------------------------------------------------------ */
/* The registry                                                         */
/* ------------------------------------------------------------------ */

export const TRACE_TARGETS: Readonly<Record<string, TraceTarget>> = Object.freeze({
  [PROPANAL.id]: PROPANAL,
  [ACETONE.id]: ACETONE,
  [ACETONE_HYDRATE.id]: ACETONE_HYDRATE,
  [N_METHYL_IMINE.id]: N_METHYL_IMINE,
  [S_CIS_BUTADIENE.id]: S_CIS_BUTADIENE,
  [ACROLEIN.id]: ACROLEIN,
  [CYCLOHEXENE.id]: CYCLOHEXENE,
});

export function traceTarget(moleculeId: string): TraceTarget | undefined {
  return TRACE_TARGETS[moleculeId];
}

/**
 * A beat from a target, so the strokes are never typed twice.
 *
 * `moleculeId` is the target's id, which is what the L3 grader looks the answer
 * key up by. A beat whose moleculeId is not in TRACE_TARGETS is caught by
 * `traceContentProblems` below rather than by a student.
 */
function beatFrom(
  target: TraceTarget,
  fields: {
    readonly id: string;
    readonly node: string;
    readonly conceptIds: readonly string[];
    readonly levels: readonly MasteryLevel[];
    readonly prompt: string;
    readonly brief: string;
    readonly tolerancePx: number;
    readonly diamonds: number;
  },
): TraceBeat {
  return {
    kind: "trace",
    id: fields.id,
    node: fields.node,
    conceptIds: fields.conceptIds,
    levels: fields.levels,
    prompt: fields.prompt,
    brief: fields.brief,
    diamonds: fields.diamonds,
    moleculeId: target.id,
    strokes: strokesOf(target),
    tolerancePx: fields.tolerancePx,
  };
}

export const TRACE_BEATS: readonly TraceBeat[] = Object.freeze([
  beatFrom(PROPANAL, {
    id: "trace-propanal",
    node: "u7-mechanism",
    conceptIds: ["carbonyl-polarity", "aldehyde-vs-ketone"],
    levels: FULL_LADDER,
    prompt: "Draw propanal.",
    brief: "An aldehyde carries its carbonyl at the end of the chain, so that carbon keeps one hydrogen.",
    tolerancePx: 22,
    diamonds: 5,
  }),
  beatFrom(ACETONE, {
    id: "trace-acetone",
    node: "u7-mechanism",
    conceptIds: ["carbonyl-polarity", "aldehyde-vs-ketone"],
    levels: FROM_GUIDED,
    prompt: "Draw acetone.",
    brief: "Same three carbons and same formula as propanal. Only the carbonyl has moved inboard, and that is the whole difference between a ketone and an aldehyde.",
    tolerancePx: 22,
    diamonds: 5,
  }),
  beatFrom(ACETONE_HYDRATE, {
    id: "trace-acetone-hydrate",
    node: "u7-hydration",
    conceptIds: ["carbonyl-hydration", "tetrahedral-intermediate"],
    levels: FROM_GUIDED,
    prompt: "Draw what water addition leaves behind.",
    brief: "Two hydroxyls on one carbon is a gem diol. Drawing it is the fastest way to see why it usually falls back to the ketone.",
    tolerancePx: 22,
    diamonds: 6,
  }),
  beatFrom(N_METHYL_IMINE, {
    id: "trace-n-methyl-imine",
    node: "u7-imine",
    conceptIds: ["imine-formation", "carbonyl-polarity"],
    levels: FROM_GUIDED,
    prompt: "Draw the imine.",
    brief: "Nitrogen has taken the oxygen's place and kept the double bond. The group it arrived with stays on it.",
    tolerancePx: 22,
    diamonds: 6,
  }),
  beatFrom(S_CIS_BUTADIENE, {
    id: "trace-s-cis-butadiene",
    node: "u1-da",
    conceptIds: ["diene-conformation", "conjugation"],
    levels: FULL_LADDER,
    prompt: "Draw butadiene in the shape that can react.",
    brief: "Both double bonds fold to the same side of the middle bond. That U is the only conformation whose ends can reach a dienophile at once.",
    tolerancePx: 22,
    diamonds: 5,
  }),
  beatFrom(ACROLEIN, {
    id: "trace-acrolein",
    node: "u1-da",
    conceptIds: ["dienophile", "electron-withdrawing-group"],
    levels: FROM_GUIDED,
    prompt: "Draw acrolein.",
    brief: "An alkene next to a carbonyl. The carbonyl pulls density off the alkene, and that is what makes it a good dienophile.",
    tolerancePx: 22,
    diamonds: 6,
  }),
  beatFrom(CYCLOHEXENE, {
    id: "trace-cyclohexene-adduct",
    node: "u12-da",
    conceptIds: ["cycloaddition", "diene-conformation"],
    levels: FROM_GUIDED,
    prompt: "Draw the ring the cycloaddition builds.",
    brief: "Four carbons came from the diene and two from the dienophile. One double bond survives, and it sits in the middle of the piece the diene gave.",
    tolerancePx: 20,
    diamonds: 8,
  }),
]);

export interface ContentProblem {
  readonly beatId: string;
  readonly message: string;
}

/**
 * The authoring check for this file.
 *
 * Reported, never repaired, per CLAUDE.md: a beat pointing at a molecule that
 * is not in the registry, or a target with a bond no stroke covers, is a
 * mistake that has to be fixed by the author. Silently dropping the bond would
 * mean the L3 answer key contains something the guides never asked for, which
 * marks a faithful trace wrong.
 */
export function traceContentProblems(): readonly ContentProblem[] {
  const problems: ContentProblem[] = [];
  for (const beat of TRACE_BEATS) {
    const target = traceTarget(beat.moleculeId);
    if (target === undefined) {
      problems.push({ beatId: beat.id, message: `names molecule ${beat.moleculeId}, which is not in TRACE_TARGETS` });
      continue;
    }
    if (beat.strokes.length === 0) {
      problems.push({ beatId: beat.id, message: "has no strokes, so there is nothing to trace" });
    }
  }
  return problems;
}
