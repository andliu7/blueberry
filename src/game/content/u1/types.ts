/**
 * The shape of a Unit 1 problem pool. Pools are data only: each item is an
 * existing beat type, unchanged, so the lesson runner and the practice run
 * engine render them with the views that already exist.
 *
 * Every item is a draft until the owner signs it off, which is why
 * `placeholder` is a literal `true` and not a boolean: nothing in this folder
 * can claim to be authored copy by flipping a flag in a pool file.
 */
import type { McqBeat } from "../../beats/types";
import type { SortContent } from "../../beats/sort/ladders";
import type { MatchBoardSpec } from "../../beats/match/spec";
import type { DrawBeat } from "../../beats/draw/types";

export type PoolItem =
  | { readonly kind: "mcq"; readonly beat: McqBeat }
  | { readonly kind: "sort"; readonly content: SortContent }
  | { readonly kind: "match"; readonly board: MatchBoardSpec }
  /** Draw the structure in the editor (beats/draw). Added 2026-10-17, U1-P3. */
  | { readonly kind: "draw"; readonly beat: DrawBeat };

export interface PoolEntry {
  /** Stable id, unique across the unit. Stored progress and requeues key on it. */
  readonly id: string;
  readonly item: PoolItem;
  /** Shown after a miss and used to offer a flashcard. No entry ships without one. */
  readonly explanation: string;
  /** The conditions the answer depends on (temperature, solvent, equivalents), stated, never implied. */
  readonly conditions?: string;
  /** How the chemistry was checked: the RDKit script and the OpenStax/LibreTexts page read to verify it. */
  readonly provenance: string;
  readonly placeholder: true;
}

/** Pools keyed by pathway node id (u1-rank-cation, u1-da-predict, ...). */
export type UnitPools = Readonly<Record<string, readonly PoolEntry[]>>;
