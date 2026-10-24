/**
 * One shared shuffle, and proof that folding the hand-written copies into it
 * changed no order anyone has seen.
 *
 * The four old* functions below are verbatim copies of the Fisher-Yates loops
 * as they stood before the fold (helpers seededShuffle, tips dayOrder, the
 * glass-folder noise permutation, the match board's target column). They are
 * frozen on purpose: if a new shuffle drifts by one swap for one seed, a sort
 * board, a tip rotation or a folder painting quietly changes for a student.
 */

import { describe, expect, it } from "vitest";
import { mulberry32, seededShuffle, shuffle } from "@/lib/helpers";
import { dayOrder } from "@/data/tips";
import { MATCH_BOARDS } from "@/game/beats/match/boards";
import { buildMatchBoard, type MatchBoardSpec } from "@/game/beats/match/spec";
import { shuffledTargetIds } from "@/game/beats/match/board";

/* ---------------- frozen copies of the old loops ---------------- */

function oldSeededShuffle<T>(items: readonly T[], seed: number): T[] {
  const out = [...items];
  let state = seed >>> 0 || 1;
  for (let i = out.length - 1; i > 0; i -= 1) {
    state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
    const j = state % (i + 1);
    [out[i], out[j]] = [out[j]!, out[i]!];
  }
  return out;
}

function oldDayOrder(n: number, day: number): number[] {
  const order = Array.from({ length: n }, (_, i) => i);
  const random = mulberry32(day);
  for (let i = n - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [order[i], order[j]] = [order[j], order[i]];
  }
  return order;
}

/** makeFbm's permutation plus the 256 gradient draws that follow it on the same generator. */
function oldFbmDraws(seed: number): { order: number[]; after: number[] } {
  const random = mulberry32(seed);
  const order: number[] = [];
  for (let i = 0; i < 256; i++) order.push(i);
  for (let i = 255; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    const t = order[i];
    order[i] = order[j];
    order[j] = t;
  }
  const after = Array.from({ length: 256 }, () => random());
  return { order, after };
}

function oldShuffledTargetIds(spec: MatchBoardSpec): readonly string[] {
  const ids = spec.answer.targets.map((target) => target.id);
  if (ids.length < 2) return ids;

  let seed = 2166136261;
  for (const character of spec.beatId) {
    seed ^= character.charCodeAt(0);
    seed = Math.imul(seed, 16777619) >>> 0;
  }
  const next = (): number => {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
    return seed / 4294967296;
  };

  const shuffled = [...ids];
  for (let index = shuffled.length - 1; index > 0; index -= 1) {
    const swap = Math.floor(next() * (index + 1));
    const held = shuffled[index] as string;
    shuffled[index] = shuffled[swap] as string;
    shuffled[swap] = held;
  }
  const unmoved = shuffled.every((id, index) => id === ids[index]);
  return unmoved ? [...shuffled.slice(1), shuffled[0] as string] : shuffled;
}

/* ---------------- the new code against them ---------------- */

const range = (n: number) => Array.from({ length: n }, (_, i) => i);

function fnv(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619);
  return h >>> 0;
}

describe("seededShuffle deals the same order it always did", () => {
  it("matches the old modulo loop for every seed and length", () => {
    const seeds = [0, 1, 2, 7, 42, 20000, 123456789, 2 ** 31 - 1, 2 ** 32 - 1, -5];
    const lengths = [0, 1, 2, 3, 5, 10, 60, 256, 1000];
    for (const seed of seeds) {
      for (const n of lengths) {
        expect(seededShuffle(range(n), seed), `seed ${seed}, length ${n}`).toEqual(
          oldSeededShuffle(range(n), seed),
        );
      }
    }
  });
});

describe("dayOrder rotates the tips the same way", () => {
  it("matches the old loop", () => {
    for (const n of [0, 1, 2, 60, 61]) {
      for (const day of [0, 20000, 20001, 20384]) {
        expect(dayOrder(n, day), `n ${n}, day ${day}`).toEqual(oldDayOrder(n, day));
      }
    }
  });
});

describe("the folder painting's noise is unchanged", () => {
  it("gives the same permutation and leaves the generator where it was", () => {
    for (const seed of [0, 1, fnv("Carbonyls"), 2 ** 32 - 1]) {
      const random = mulberry32(seed);
      const order = shuffle(range(256), random);
      const after = Array.from({ length: 256 }, () => random());
      expect({ order, after }, `seed ${seed}`).toEqual(oldFbmDraws(seed));
    }
  });
});

describe("the match board's target column is unchanged", () => {
  it("matches the old loop on every shipped board at every level", () => {
    for (const board of MATCH_BOARDS) {
      for (const level of board.levels) {
        const spec = buildMatchBoard(board, level);
        expect(shuffledTargetIds(spec), `${board.id} at L${level}`).toEqual(
          oldShuffledTargetIds(spec),
        );
      }
    }
  });

  it("matches the old loop on synthetic boards of 2 and 7 targets", () => {
    const base = buildMatchBoard(MATCH_BOARDS[0]!, MATCH_BOARDS[0]!.levels[0]!);
    for (const count of [2, 7]) {
      const spec: MatchBoardSpec = {
        ...base,
        beatId: `synthetic-${count}`,
        answer: {
          ...base.answer,
          targets: range(count).map((i) => ({ ...base.answer.targets[0]!, id: `t${i}` })),
        },
      };
      expect(shuffledTargetIds(spec), `${count} targets`).toEqual(oldShuffledTargetIds(spec));
    }
  });
});

describe("shuffle itself", () => {
  it("is a permutation with the default Math.random", () => {
    const items = range(50);
    const out = shuffle(items);
    expect([...out].sort((a, b) => a - b)).toEqual(items);
    expect(items).toEqual(range(50));
  });

  it("gives a fixed order for a fixed random", () => {
    // random() = 0 always swaps position i with position 0, from the end down.
    expect(shuffle([0, 1, 2, 3, 4], () => 0)).toEqual([1, 2, 3, 4, 0]);
  });
});
