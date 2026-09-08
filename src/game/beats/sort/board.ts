/**
 * The board: where every card is right now, and the moves that change it.
 *
 * WHY THE STATE IS SLOTS PLUS A POOL AND NOT AN ARRAY OF CARDS. A ranked list
 * with holes in it is not an array. The student has placed three of five, and
 * rung four is empty while rung five holds a card: that is a normal
 * mid-attempt state, and an array cannot hold it without a sentinel every
 * reader has to remember to check. `slots` is a fixed length array of "the card
 * on this rung, or null", and `pool` is everything not on the track. The two
 * together always hold every card exactly once, which is the invariant every
 * function here preserves and which the tests fuzz.
 *
 * WHY IT IS PURE AND LIVES OUTSIDE THE COMPONENT. Three gestures reach the same
 * small set of moves: a drag, a tap on a card then a tap on a rung, and the
 * keyboard. If the rules lived in the component each gesture would grow its own
 * copy and they would drift, which is how a drag ends up allowed to do
 * something the keyboard cannot. Here there is one rule set, it is testable
 * without a DOM, and the React layer is reduced to deciding which move a
 * gesture meant.
 *
 * THE ONE RULE WORTH SAYING OUT LOUD: dropping a card on an occupied rung never
 * destroys the card that was there. If the incoming card came from another
 * rung, the two exchange rungs. If it came from the pool, the occupant goes
 * back to the pool. Anything else loses a card the student placed on purpose.
 */

/** An item id, as authored on the SortBeat. A plain string, per beats/types.ts. */
export type SortCardId = string;

export interface SortBoard {
  /** One entry per rung, top rung first. Null means the rung is empty. */
  readonly slots: readonly (SortCardId | null)[];
  /** Cards not on the track, in the order they are shown. */
  readonly pool: readonly SortCardId[];
}

/** Where a card is: on a rung, in the pool, or nowhere (not on this board). */
export type CardPlace =
  | { readonly where: "slot"; readonly index: number }
  | { readonly where: "pool" }
  | null;

/** A drop target. The pool is a target too, so a card can be taken off the track. */
export type DropTarget =
  | { readonly kind: "slot"; readonly index: number }
  | { readonly kind: "pool" };

export function emptyBoard(itemIds: readonly SortCardId[]): SortBoard {
  return Object.freeze({
    slots: Object.freeze(itemIds.map(() => null)) as readonly (SortCardId | null)[],
    pool: Object.freeze([...itemIds]),
  });
}

/**
 * A shuffled pool from a seed.
 *
 * Deterministic on purpose. A board that starts in the authored order hands the
 * answer over, and a board shuffled from Math.random cannot be reproduced in a
 * bug report or pinned by a test. Fisher Yates over a linear congruential
 * generator, the same "reproducible by seed" discipline the placement quiz uses.
 */
export function shuffled(itemIds: readonly SortCardId[], seed: number): readonly SortCardId[] {
  const out = [...itemIds];
  let state = (seed >>> 0) || 1;
  for (let index = out.length - 1; index > 0; index -= 1) {
    state = (state * 1664525 + 1013904223) >>> 0;
    const pick = state % (index + 1);
    const here = out[index] as SortCardId;
    const there = out[pick] as SortCardId;
    out[index] = there;
    out[pick] = here;
  }
  return Object.freeze(out);
}

/** The opening board: every card in the pool, shuffled, every rung empty. */
export function openingBoard(itemIds: readonly SortCardId[], seed: number): SortBoard {
  return Object.freeze({
    slots: Object.freeze(itemIds.map(() => null)) as readonly (SortCardId | null)[],
    pool: shuffled(itemIds, seed),
  });
}

export function placeOf(board: SortBoard, card: SortCardId): CardPlace {
  const index = board.slots.indexOf(card);
  if (index >= 0) return { where: "slot", index };
  if (board.pool.includes(card)) return { where: "pool" };
  return null;
}

/** Every card the board holds, rungs first then the pool. The invariant reads this. */
export function allCards(board: SortBoard): readonly SortCardId[] {
  const onTrack = board.slots.filter((card): card is SortCardId => card !== null);
  return [...onTrack, ...board.pool];
}

export function boardIsComplete(board: SortBoard): boolean {
  return board.slots.every((card) => card !== null) && board.pool.length === 0;
}

export function emptyRungCount(board: SortBoard): number {
  return board.slots.filter((card) => card === null).length;
}

/**
 * The ranked list as the student left it, for grading.
 *
 * Empty rungs are dropped rather than filled with anything, so an unfinished
 * board grades as an incomplete ordering and the curriculum checker names it as
 * such. Inventing a placeholder here would turn "not finished yet" into
 * "wrong", which is a different thing to tell a student.
 */
export function boardOrder(board: SortBoard): readonly SortCardId[] {
  return board.slots.filter((card): card is SortCardId => card !== null);
}

/**
 * Put a card on a rung. See the header for what happens to whoever was there.
 *
 * A card that is not on this board, or a rung that does not exist, returns the
 * board unchanged. A move that cannot be made is a miss, not an error: a drag
 * released over the page margin should put the card back, not throw.
 */
export function placeOnRung(board: SortBoard, card: SortCardId, index: number): SortBoard {
  if (index < 0 || index >= board.slots.length) return board;
  const from = placeOf(board, card);
  if (from === null) return board;
  const occupant = board.slots[index] ?? null;
  if (occupant === card) return board;

  const slots = [...board.slots];
  let pool = [...board.pool];

  if (from.where === "slot") {
    // Exchange rungs. The occupant takes the rung the incoming card left.
    slots[from.index] = occupant;
    slots[index] = card;
  } else {
    pool = pool.filter((id) => id !== card);
    slots[index] = card;
    if (occupant !== null) pool.push(occupant);
  }

  return Object.freeze({ slots: Object.freeze(slots), pool: Object.freeze(pool) });
}

/** Take a card off the track. A card already in the pool is left where it is. */
export function returnToPool(board: SortBoard, card: SortCardId): SortBoard {
  const from = placeOf(board, card);
  if (from === null || from.where === "pool") return board;
  const slots = [...board.slots];
  slots[from.index] = null;
  return Object.freeze({ slots: Object.freeze(slots), pool: Object.freeze([...board.pool, card]) });
}

/** One move, whichever gesture asked for it. */
export function applyDrop(board: SortBoard, card: SortCardId, target: DropTarget): SortBoard {
  return target.kind === "pool" ? returnToPool(board, card) : placeOnRung(board, card, target.index);
}

/**
 * The keyboard reorder: move a card one rung up or down.
 *
 * This is a real keyboard path and not a courtesy. A card in the pool is nudged
 * onto the highest empty rung, so the keyboard can start a placement as well as
 * adjust one; with the track full it stays put, and the student uses select
 * then place, which is the same two key presses that a tap is two taps.
 */
export function nudge(board: SortBoard, card: SortCardId, delta: -1 | 1): SortBoard {
  const from = placeOf(board, card);
  if (from === null) return board;
  if (from.where === "pool") {
    const firstEmpty = board.slots.indexOf(null);
    return firstEmpty < 0 ? board : placeOnRung(board, card, firstEmpty);
  }
  const target = from.index + delta;
  if (target < 0 || target >= board.slots.length) return board;
  return placeOnRung(board, card, target);
}

/* ------------------------------------------------------------------ */
/* Hit testing, kept here so the drag carries no geometry of its own    */
/* ------------------------------------------------------------------ */

export interface TargetRect {
  readonly target: DropTarget;
  readonly left: number;
  readonly top: number;
  readonly right: number;
  readonly bottom: number;
}

/**
 * Which target a pointer is over, or null.
 *
 * The rects are measured once at drag start rather than per frame: the rungs do
 * not move while a card is in the air, and calling getBoundingClientRect on
 * every pointermove forces a layout on every frame, which is the work the 60
 * fps row in the Budgets table exists to protect. Later rects win, which
 * matches the painting order: the rungs are collected after the pool, so a rung
 * overlapping the pool takes the drop.
 */
export function hitTarget(rects: readonly TargetRect[], x: number, y: number): DropTarget | null {
  let found: DropTarget | null = null;
  for (const rect of rects) {
    if (x >= rect.left && x <= rect.right && y >= rect.top && y <= rect.bottom) {
      found = rect.target;
    }
  }
  return found;
}
