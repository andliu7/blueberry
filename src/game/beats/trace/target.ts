/**
 * What a trace beat is drawing, authored once and read three ways.
 *
 * THE ONE AUTHORED THING is a `TraceTarget`: a skeletal graph. Vertices with a
 * position and, where it is not carbon, an element. Edges with a bond order.
 * A stroke order that groups edges into the gestures a hand actually makes.
 * Everything else in this beat is DERIVED from it:
 *
 *   `strokesOf`   the guide strokes the student traces (beats/types.ts shape)
 *   `stateOf`     the chem-core MechanismState that is the answer key at L3
 *   `formulaOf`   the molecular formula, for the prompt and the card back
 *
 * That matters because the alternative is authoring the picture and the answer
 * separately, and then they drift: a bond added to the drawing and forgotten in
 * the key marks a correct structure wrong, and a student loses an evening to
 * our clerical error. One source, three readings, no drift possible.
 *
 * IMPLICIT HYDROGENS ARE COMPUTED, NOT AUTHORED, and this is the only piece of
 * chemistry in this file. A skeletal structure means "carbon here, hydrogens to
 * taste", so an author who had to write `implicitHydrogens: 2` on every vertex
 * would get one wrong eventually. The rule is the standard electron count and
 * it is written out in `fillValence` below with its own worked cases.
 *
 * WHY THE SAME FILLING SERVES BOTH SIDES. recognise.ts builds the student's
 * drawing into a graph of exactly this shape and runs it through exactly this
 * function before grading. So the answer key and the submission are filled by
 * one rule, and a bug in the rule cannot make a correct drawing wrong: it would
 * have to be wrong identically on both sides, which is a draw, not a false
 * negative. The rule is still tested on its own, because "wrong identically"
 * still teaches wrong chemistry.
 *
 * WHAT THIS FILE DOES NOT DO. No stereochemistry. packages/curriculum's
 * structure comparison returns UNDECIDED the moment either side declares any,
 * and `createStructureAnswer` refuses to build an answer that carries it, so a
 * trace target with a wedge would fail at authoring time rather than mid
 * attempt. Trace is a constitution exercise: the skeleton, the heteroatoms, the
 * bond orders. Stereochemistry is a different beat.
 */

import {
  createAtom,
  createBond,
  createSpecies,
  createState,
  elementProperties,
  isElement,
  type Atom,
  type Bond,
  type BondOrder,
  type Element,
  type MechanismState,
  type StateMember,
} from "@blueberry/chem-core";
import type { TracePoint, TraceStroke } from "../types";
import type { Pt } from "./geometry";

export type VertexId = string;
export type EdgeId = string;

/**
 * One vertex of the skeleton.
 *
 * `element` is optional and absent means carbon, which is skeletal convention
 * and not a shortcut: a structure where every carbon is spelled out is a
 * different drawing from the one an organic chemist reads.
 */
export interface TraceVertex {
  readonly id: VertexId;
  readonly x: number;
  readonly y: number;
  readonly element?: Element;
  readonly charge?: number;
}

export interface TraceEdge {
  readonly id: EdgeId;
  readonly a: VertexId;
  readonly b: VertexId;
  readonly order: BondOrder;
}

/**
 * A gesture: one press, one drag, one release, covering one or more edges.
 *
 * Edges rather than points, so a stroke cannot drift away from the bonds it is
 * supposed to be. `label` is what the pending stroke is called out loud, and it
 * is authored in the coach voice because a student reads it before they have
 * drawn anything: "the carbon to oxygen double bond", not "stroke 3".
 */
export interface TraceStrokePlan {
  readonly id: string;
  readonly label: string;
  /** Edge ids in the order the hand covers them. Contiguous, start to finish. */
  readonly edgeIds: readonly EdgeId[];
  /** The vertex the gesture starts at. The rest of the order follows from it. */
  readonly startVertexId: VertexId;
}

export interface TraceTarget {
  readonly id: string;
  /** What it is, plainly. Shown after the attempt and on a card's back. */
  readonly name: string;
  readonly vertices: readonly TraceVertex[];
  readonly edges: readonly TraceEdge[];
  readonly strokes: readonly TraceStrokePlan[];
}

export function elementOf(vertex: TraceVertex): Element {
  return vertex.element ?? "C";
}

export function isHeteroatom(vertex: TraceVertex): boolean {
  return elementOf(vertex) !== "C";
}

/* ------------------------------------------------------------------ */
/* Geometry                                                             */
/* ------------------------------------------------------------------ */

export function vertexMap(target: TraceTarget): ReadonlyMap<VertexId, TraceVertex> {
  return new Map(target.vertices.map((vertex) => [vertex.id, vertex]));
}

function requireVertex(byId: ReadonlyMap<VertexId, TraceVertex>, id: VertexId): TraceVertex {
  const vertex = byId.get(id);
  if (vertex === undefined) throw new Error(`trace target references missing vertex ${id}`);
  return vertex;
}

/**
 * The points a stroke passes through, walked edge by edge from its start vertex.
 *
 * Each edge is entered at the vertex the previous edge left, which is what
 * makes a chain of edges one continuous polyline. An edge that does not touch
 * the running vertex is an authoring error and throws here rather than
 * rendering a stroke that teleports.
 */
export function strokePoints(target: TraceTarget, plan: TraceStrokePlan): readonly Pt[] {
  const byId = vertexMap(target);
  const edgeById = new Map(target.edges.map((edge) => [edge.id, edge]));
  let current = requireVertex(byId, plan.startVertexId);
  const points: Pt[] = [{ x: current.x, y: current.y }];
  for (const edgeId of plan.edgeIds) {
    const edge = edgeById.get(edgeId);
    if (edge === undefined) throw new Error(`stroke ${plan.id} references missing edge ${edgeId}`);
    const nextId = edge.a === current.id ? edge.b : edge.b === current.id ? edge.a : null;
    if (nextId === null) {
      throw new Error(`stroke ${plan.id} jumps: edge ${edgeId} does not touch vertex ${current.id}`);
    }
    current = requireVertex(byId, nextId);
    points.push({ x: current.x, y: current.y });
  }
  return points;
}

/** The guide strokes, in the shape beats/types.ts already declares. */
export function strokesOf(target: TraceTarget): readonly TraceStroke[] {
  return target.strokes.map((plan) => ({
    id: plan.id,
    label: plan.label,
    points: strokePoints(target, plan) as readonly TracePoint[],
  }));
}

/**
 * Every edge that a stroke does not cover.
 *
 * A double bond's second line is drawn by the renderer, never traced, so this
 * is not about those. It is an authoring check: an edge no stroke covers is a
 * bond the student is never asked to draw and would still be graded on at L3.
 * Reported, never repaired, per the non negotiable in CLAUDE.md.
 */
export function uncoveredEdgeIds(target: TraceTarget): readonly EdgeId[] {
  const covered = new Set(target.strokes.flatMap((plan) => plan.edgeIds));
  return target.edges.filter((edge) => !covered.has(edge.id)).map((edge) => edge.id);
}

/* ------------------------------------------------------------------ */
/* Chemistry: filling the hydrogens                                     */
/* ------------------------------------------------------------------ */

export interface ValenceFill {
  readonly element: Element;
  readonly charge: number;
  readonly bondOrderSum: number;
  readonly implicitHydrogens: number;
  readonly lonePairs: number;
  /** True when the drawn bonds already exceed what this atom can carry. */
  readonly overValent: boolean;
}

/** A fill with the vertex it belongs to. What `fillGraph` returns. */
export type FilledAtom = ValenceFill & { readonly id: VertexId };

/**
 * How many bonds this atom wants, and what is left over as lone pairs.
 *
 * THE RULE, with its arithmetic spelled out because it looks like a trick and
 * is not. Let `available` be the electrons the atom brings, which is its group
 * count less its formal charge. Let `shell` be what surrounds a filled atom:
 * two for hydrogen and lithium, eight for everything else. If the atom forms
 * `b` bonds and holds `lp` lone pairs then it owns `b + 2lp = available`
 * electrons and is surrounded by `2b + 2lp` of them. Filling the shell without
 * exceeding it gives `b <= shell - available`, and having enough electrons to
 * pair gives `b <= available`. So `b = min(available, shell - available)`.
 *
 *   carbon        available 4, b = min(4, 4) = 4, lp 0
 *   carbocation   available 3, b = min(3, 5) = 3, lp 0. The sextet, correctly
 *                 NOT forced to an octet, which is the case a naive octet rule
 *                 gets wrong and the case organic chemistry cares most about
 *   carbanion     available 5, b = min(5, 3) = 3, lp 1
 *   nitrogen      available 5, b = 3, lp 1
 *   ammonium N    available 4, b = 4, lp 0
 *   oxygen        available 6, b = 2, lp 2
 *   alkoxide O    available 7, b = 1, lp 3
 *   oxocarbenium  available 5, b = 3, lp 1
 *   bromine       available 7, b = 1, lp 3
 *   hydrogen      available 1, shell 2, b = 1, lp 0
 *
 * HYPERVALENCY IS NOT INFERRED. The shell is capped at eight even for period
 * three, so a drawn sulfur carrying six bonds comes back `overValent` rather
 * than quietly given an expanded octet. That is the honest answer for a
 * recognition pass: an expanded octet is an authored claim about a real
 * molecule, not something to guess from a sketch. Nothing in the Organic
 * Chemistry II corpus this beat serves needs one.
 */
export function fillValence(
  element: Element,
  charge: number,
  bondOrderSum: number,
): ValenceFill {
  const properties = elementProperties(element);
  const shell = Math.min(properties.maxValenceElectrons, 8);
  const available = properties.valenceElectrons - charge;
  const wanted = Math.max(0, Math.min(available, shell - available));
  const overValent = bondOrderSum > wanted;
  const implicitHydrogens = overValent ? 0 : wanted - bondOrderSum;
  const lonePairs = Math.max(0, Math.floor((available - wanted) / 2));
  return {
    element,
    charge,
    bondOrderSum,
    implicitHydrogens,
    lonePairs,
    overValent,
  };
}

export interface Graph {
  readonly vertices: readonly TraceVertex[];
  readonly edges: readonly TraceEdge[];
}

export function bondOrderSums(graph: Graph): ReadonlyMap<VertexId, number> {
  const sums = new Map<VertexId, number>();
  for (const vertex of graph.vertices) sums.set(vertex.id, 0);
  for (const edge of graph.edges) {
    sums.set(edge.a, (sums.get(edge.a) ?? 0) + edge.order);
    sums.set(edge.b, (sums.get(edge.b) ?? 0) + edge.order);
  }
  return sums;
}

/** Every atom of a graph, filled. The answer key and the submission both use it. */
export function fillGraph(graph: Graph): readonly FilledAtom[] {
  const sums = bondOrderSums(graph);
  return graph.vertices.map((vertex) => ({
    ...fillValence(elementOf(vertex), vertex.charge ?? 0, sums.get(vertex.id) ?? 0),
    id: vertex.id,
  }));
}

/** The atoms a graph cannot support. Empty means the drawing is constructible. */
export function overValentIds(graph: Graph): readonly VertexId[] {
  return fillGraph(graph)
    .filter((atom) => atom.overValent)
    .map((atom) => atom.id);
}

/* ------------------------------------------------------------------ */
/* Building a chem-core state                                           */
/* ------------------------------------------------------------------ */

/**
 * Connected components, so two disconnected sketches become two species.
 *
 * packages/curriculum compares a MULTISET of species, per CLAUDE.md's system
 * boundary, so a student who drew the molecule in two halves and a student who
 * drew it joined are two different submissions and must be graded as such.
 * Plain breadth first search: the graphs here have tens of vertices.
 */
export function connectedComponents(graph: Graph): readonly (readonly VertexId[])[] {
  const neighbours = new Map<VertexId, VertexId[]>();
  for (const vertex of graph.vertices) neighbours.set(vertex.id, []);
  for (const edge of graph.edges) {
    neighbours.get(edge.a)?.push(edge.b);
    neighbours.get(edge.b)?.push(edge.a);
  }
  const seen = new Set<VertexId>();
  const components: VertexId[][] = [];
  for (const vertex of graph.vertices) {
    if (seen.has(vertex.id)) continue;
    const queue = [vertex.id];
    const component: VertexId[] = [];
    seen.add(vertex.id);
    while (queue.length > 0) {
      const id = queue.shift()!;
      component.push(id);
      for (const next of neighbours.get(id) ?? []) {
        if (seen.has(next)) continue;
        seen.add(next);
        queue.push(next);
      }
    }
    components.push(component);
  }
  return components;
}

export class OverValentError extends Error {
  // Same reason as VertexPool in recognise.ts: `erasableSyntaxOnly` rejects a
  // constructor parameter property because it is not erasable type syntax.
  readonly vertexIds: readonly VertexId[];

  constructor(vertexIds: readonly VertexId[]) {
    super(`these atoms carry more bonds than they can hold: ${vertexIds.join(", ")}`);
    this.name = "OverValentError";
    this.vertexIds = vertexIds;
  }
}

/**
 * The graph as a chem-core state, one species per connected component.
 *
 * Throws on an over valent atom rather than clamping, because a structure with
 * five bonds on a carbon is not a structure and handing one to a comparison
 * that assumes valid input is how a checker reports nonsense. The caller
 * catches it and resolves the attempt to `valence_exceeded`, which is a real
 * chem-core cause with authored copy already sitting in packages/feedback.
 */
export function stateOf(graph: Graph, stateId: string): MechanismState {
  const over = overValentIds(graph);
  if (over.length > 0) throw new OverValentError(over);
  const filled = new Map(fillGraph(graph).map((atom) => [atom.id, atom]));
  const members: StateMember[] = connectedComponents(graph).map((component, index) => {
    const ids = new Set(component);
    const atoms: Atom[] = component.map((id) => {
      const atom = filled.get(id)!;
      return createAtom({
        id,
        element: atom.element,
        formalCharge: atom.charge,
        lonePairs: atom.lonePairs,
        implicitHydrogens: atom.implicitHydrogens,
      });
    });
    const bonds: Bond[] = graph.edges
      .filter((edge) => ids.has(edge.a) && ids.has(edge.b))
      .map((edge) => createBond({ id: edge.id, a: edge.a, b: edge.b, order: edge.order }));
    return {
      species: createSpecies({ id: `${stateId}-s${index}`, atoms, bonds }),
      role: "substrate",
    };
  });
  return createState({ id: stateId, members });
}

/** The answer key for a target. */
export function targetState(target: TraceTarget): MechanismState {
  return stateOf({ vertices: target.vertices, edges: target.edges }, `${target.id}-key`);
}

/* ------------------------------------------------------------------ */
/* Display                                                              */
/* ------------------------------------------------------------------ */

const FORMULA_ORDER = ["C", "H"];

/**
 * Hill notation: carbon, then hydrogen, then everything else alphabetically.
 *
 * Shown in the prompt at L3, where the canvas is blank and the formula is the
 * only thing standing between "draw the molecule" and a guessing game. It is a
 * fair amount of help and it is the help a real exam gives.
 */
export function formulaOf(graph: Graph): string {
  const counts = new Map<string, number>();
  const bump = (symbol: string, by: number) => counts.set(symbol, (counts.get(symbol) ?? 0) + by);
  for (const atom of fillGraph(graph)) {
    bump(atom.element, 1);
    if (atom.implicitHydrogens > 0) bump("H", atom.implicitHydrogens);
  }
  const rest = [...counts.keys()].filter((symbol) => !FORMULA_ORDER.includes(symbol)).sort();
  const symbols = [...FORMULA_ORDER.filter((symbol) => counts.has(symbol)), ...rest];
  return symbols
    .map((symbol) => {
      const count = counts.get(symbol) ?? 0;
      return count === 1 ? symbol : `${symbol}${count}`;
    })
    .join("");
}

/** Elements a student may place at L3. The target's own, plus nothing invented. */
export function elementPaletteFor(target: TraceTarget): readonly Element[] {
  const used = new Set<string>();
  for (const vertex of target.vertices) used.add(elementOf(vertex));
  used.add("C");
  return [...used].filter(isElement).sort((a, b) => (a === "C" ? -1 : b === "C" ? 1 : a.localeCompare(b)));
}
