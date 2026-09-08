/**
 * Curved arrows, as declared electron flow.
 *
 * An arrow says three things and no more: where the electrons come from, where
 * they go, and how many there are. It does not say what the resulting structure
 * is. The resulting structure is the `to` state of the step, drawn by the
 * student or by the author.
 *
 * Keeping those two apart is the whole point. If this package computed the `to`
 * state from the `from` state plus the arrows, then the arrows would agree with
 * the product by construction and no check on the pair could ever fail. The
 * validator's job is to compare what the arrows CLAIM against what the two
 * states SHOW, and that comparison only means something when the two were
 * produced independently. See deltas.ts for both halves of it.
 *
 * All ids on an arrow resolve against the `from` state of the step, including
 * sinks. A sink can name a pair of atoms that are not yet bonded; that is what a
 * bond forming arrow is.
 */

import type { ArrowId, AtomId, BondId } from "./ids.js";

/**
 * One electron or two.
 *
 * Two is the ordinary double barbed arrow of polar chemistry. One is a fishhook,
 * for radical steps. Modelled as a count rather than as an arrow style because
 * the count is what conservation arithmetic uses, and the style is a rendering
 * decision.
 */
export type ElectronCount = 1 | 2;

export type ElectronSource =
  /** A lone pair on an atom. With `electrons: 1` it is half of that pair. */
  | { readonly kind: "lonePair"; readonly atomId: AtomId }
  /** An existing bond. Breaking a pi bond and breaking a sigma bond look alike here. */
  | { readonly kind: "bond"; readonly bondId: BondId }
  /** A single unpaired electron on a radical. */
  | { readonly kind: "singleElectron"; readonly atomId: AtomId };

export type ElectronSink =
  /** Electrons land on this atom as nonbonding density: a new lone pair, or a radical. */
  | { readonly kind: "atom"; readonly atomId: AtomId }
  /**
   * Electrons land between these two atoms, forming a bond or raising the order
   * of one that already exists. Order is irrelevant; the pair is unordered.
   */
  | { readonly kind: "betweenAtoms"; readonly atomIds: readonly [AtomId, AtomId] };

export interface ElectronFlowArrow {
  readonly id: ArrowId;
  readonly electrons: ElectronCount;
  readonly source: ElectronSource;
  readonly sink: ElectronSink;
}

export interface ElectronFlowArrowInput {
  readonly id: ArrowId;
  readonly source: ElectronSource;
  readonly sink: ElectronSink;
  /** Defaults to 2. Radical steps must say 1 explicitly. */
  readonly electrons?: ElectronCount;
}

export function createArrow(input: ElectronFlowArrowInput): ElectronFlowArrow {
  return Object.freeze({
    id: input.id,
    electrons: input.electrons ?? 2,
    source: Object.freeze({ ...input.source }),
    sink: Object.freeze({ ...input.sink }),
  });
}

export function fromLonePair(atomId: AtomId): ElectronSource {
  return { kind: "lonePair", atomId };
}

export function fromBond(bondId: BondId): ElectronSource {
  return { kind: "bond", bondId };
}

export function fromSingleElectron(atomId: AtomId): ElectronSource {
  return { kind: "singleElectron", atomId };
}

export function toAtom(atomId: AtomId): ElectronSink {
  return { kind: "atom", atomId };
}

export function toBondBetween(a: AtomId, b: AtomId): ElectronSink {
  return { kind: "betweenAtoms", atomIds: [a, b] };
}

/**
 * Every atom id an arrow names directly.
 *
 * A bond source names no atom here on purpose; resolving a BondId to its two
 * ends needs the species it lives in, which this file does not have. deltas.ts
 * does that resolution.
 */
export function referencedAtomIds(arrow: ElectronFlowArrow): readonly AtomId[] {
  const ids: AtomId[] = [];
  if (arrow.source.kind === "lonePair" || arrow.source.kind === "singleElectron") {
    ids.push(arrow.source.atomId);
  }
  if (arrow.sink.kind === "atom") {
    ids.push(arrow.sink.atomId);
  } else {
    ids.push(arrow.sink.atomIds[0], arrow.sink.atomIds[1]);
  }
  return ids;
}

export function referencedBondIds(arrow: ElectronFlowArrow): readonly BondId[] {
  return arrow.source.kind === "bond" ? [arrow.source.bondId] : [];
}
