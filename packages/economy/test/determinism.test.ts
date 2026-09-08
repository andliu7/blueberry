/**
 * Determinism, which is the property the whole design rests on.
 *
 * ECONOMY.md: "Every balance is a derived column... Recomputable from scratch. A
 * mismatch is an incident, not a support ticket." That sentence is only useful
 * if a recomputation is guaranteed to agree, so these are the properties that
 * make it one:
 *
 *   the same journal and the same `now` give the same snapshot, always;
 *   the order the events arrive in does not matter, only their timestamps;
 *   deriving a journal in chunks and deriving it once give the same answer;
 *   the receipts for a run of events sum to exactly what the run produced.
 *
 * The journal is generated from a seeded pseudo random source rather than hand
 * written, so the properties are checked against a few hundred shapes nobody
 * chose. The seed is fixed, so a failure is reproducible.
 */

import { describe, expect, it } from "vitest";
import { deriveEconomy, receiptFor } from "../src/derive.ts";
import type { EconomyEvent } from "../src/journal.ts";
import { at, TZ } from "./helpers.ts";

const DAY = "2026-08-03";

/** mulberry32: four lines, no dependency, and the same sequence on every run. */
function seeded(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * A day's worth of random activity, in timestamp order, over a fixed set of node
 * ids. Everything lands on one local day so that the day boundary bonuses belong
 * to that day, and it opens with sixty unlocked tutorial nodes so mastery stays
 * in the Reader band and no rank award fires part way through a run.
 */
function generate(seed: number, count: number): readonly EconomyEvent[] {
  const random = seeded(seed);
  const journal: EconomyEvent[] = Array.from({ length: 60 }, (unused, i) => ({
    kind: "node_started",
    at: at(DAY, "07:00"),
    tz: TZ,
    nodeId: `pathway-${i}`,
    nodeKind: "tutorial",
  }));

  const minutes: number[] = Array.from({ length: count }, () => Math.floor(random() * 660));
  minutes.sort((a, b) => a - b);

  for (const minute of minutes) {
    const stamp = at(DAY, `${String(8 + Math.floor(minute / 60)).padStart(2, "0")}:${String(minute % 60).padStart(2, "0")}`);
    const node = `pathway-${Math.floor(random() * 20)}`;
    const roll = random();
    if (roll < 0.2) {
      journal.push({ kind: "node_started", at: stamp, tz: TZ, nodeId: node, nodeKind: "reaction" });
    } else if (roll < 0.45) {
      journal.push({
        kind: "node_cleared",
        at: stamp,
        tz: TZ,
        nodeId: node,
        nodeKind: "reaction",
        flawless: random() < 0.4,
        stepsInOneSitting: 1 + Math.floor(random() * 3),
        spine: random() < 0.5,
        difficulty: (1 + Math.floor(random() * 5)) as 1 | 2 | 3 | 4 | 5,
      });
    } else if (roll < 0.7) {
      journal.push({ kind: "attempt", at: stamp, tz: TZ, nodeId: node, problemId: `p${minute}`, correct: random() < 0.6 });
    } else if (roll < 0.78) {
      journal.push({ kind: "resonance_found", at: stamp, tz: TZ, nodeId: node });
    } else if (roll < 0.84) {
      journal.push({ kind: "combo_bonus", at: stamp, tz: TZ, charge: 2 + Math.floor(random() * 5) });
    } else if (roll < 0.9) {
      journal.push({ kind: "spend", at: stamp, tz: TZ, sink: "pen_colour", cost: 50 });
    } else if (roll < 0.95) {
      journal.push({ kind: "quiz_passed", at: stamp, tz: TZ, unitId: `u${minute % 3}`, flawless: random() < 0.3 });
    } else {
      journal.push({ kind: "unit_cleared", at: stamp, tz: TZ, unitId: `u${minute % 3}` });
    }
  }
  return journal;
}

const NOW = at(DAY, "20:00");

describe("the same input gives the same output", () => {
  it("derives identically on repeated calls", () => {
    const journal = generate(1, 150);
    expect(deriveEconomy(journal, NOW)).toEqual(deriveEconomy(journal, NOW));
  });

  it("derives identically from a structurally identical copy", () => {
    const journal = generate(2, 150);
    const copy = JSON.parse(JSON.stringify(journal)) as EconomyEvent[];
    expect(deriveEconomy(copy, NOW)).toEqual(deriveEconomy(journal, NOW));
  });

  it("does not depend on the order events were appended in, only on their timestamps", () => {
    const journal = generate(3, 150);
    const random = seeded(99);
    const shuffled = [...journal];
    for (let i = shuffled.length - 1; i > 0; i -= 1) {
      const j = Math.floor(random() * (i + 1));
      const a = shuffled[i] as EconomyEvent;
      const b = shuffled[j] as EconomyEvent;
      shuffled[i] = b;
      shuffled[j] = a;
    }
    // Ties at the same millisecond keep append order, so the comparison is made
    // against the same journal re-derived, not against a hand written expectation.
    expect(deriveEconomy(shuffled, NOW).diamonds.earned).toBe(deriveEconomy(journal, NOW).diamonds.earned);
    expect(deriveEconomy(shuffled, NOW).xp.total).toBe(deriveEconomy(journal, NOW).xp.total);
    expect(deriveEconomy(shuffled, NOW).charge.current).toBe(deriveEconomy(journal, NOW).charge.current);
  });

  it("does not mutate the journal it derives from", () => {
    const journal = generate(4, 100);
    const before = JSON.stringify(journal);
    deriveEconomy(journal, NOW);
    expect(JSON.stringify(journal)).toBe(before);
  });
});

describe("replaying in chunks equals deriving once", () => {
  it("reaches the same snapshot however the journal is split up", () => {
    const journal = generate(5, 200);
    const once = deriveEconomy(journal, NOW);
    for (const chunkSize of [1, 3, 17, 64, 199]) {
      const rebuilt: EconomyEvent[] = [];
      for (let i = 0; i < journal.length; i += chunkSize) {
        rebuilt.push(...journal.slice(i, i + chunkSize));
        // Deriving the partial journal along the way must leave nothing behind:
        // any accumulator that survived between calls would show up here.
        deriveEconomy(rebuilt, NOW);
      }
      expect(deriveEconomy(rebuilt, NOW)).toEqual(once);
    }
  });

  it("reaches the same snapshot however the journal is split up, with a course named", () => {
    // The universe option is an argument, not state, so it must not change this.
    // Half the course is nodes the journal touches and half is nodes it never
    // does, so both branches of the denominator are exercised on every chunk.
    const universe = [
      ...Array.from({ length: 20 }, (unused, i) => ({ nodeId: `pathway-${i}`, difficulty: 3 as const })),
      ...Array.from({ length: 20 }, (unused, i) => ({ nodeId: `untouched-${i}`, difficulty: 4 as const })),
    ];
    const journal = generate(8, 200);
    const once = deriveEconomy(journal, NOW, { universe });
    for (const chunkSize of [1, 3, 17, 64, 199]) {
      const rebuilt: EconomyEvent[] = [];
      for (let i = 0; i < journal.length; i += chunkSize) {
        rebuilt.push(...journal.slice(i, i + chunkSize));
        deriveEconomy(rebuilt, NOW, { universe });
      }
      expect(deriveEconomy(rebuilt, NOW, { universe })).toEqual(once);
    }
    // And a course actually changes the answer, so the test above is not
    // passing because the option was quietly ignored.
    expect(once.mastery.score).not.toBe(deriveEconomy(journal, NOW).mastery.score);
  });

  it("grows XP monotonically as the journal grows, because XP moves up only", () => {
    const journal = generate(6, 200);
    let last = 0;
    for (let i = 0; i <= journal.length; i += 5) {
      const total = deriveEconomy(journal.slice(0, i), NOW).xp.total;
      expect(total).toBeGreaterThanOrEqual(last);
      last = total;
    }
  });
});

describe("the receipts sum to the run", () => {
  it("accounts for every point of XP, every diamond and every point of charge", () => {
    const journal = generate(7, 120);
    let xp = 0;
    let diamonds = 0;
    let charge = 0;
    const prefix: EconomyEvent[] = [];
    for (const event of journal) {
      const receipt = receiptFor(prefix, event, NOW);
      for (const line of receipt.xp) xp += line.amount;
      for (const line of receipt.diamonds) diamonds += line.amount;
      charge += receipt.charge.delta;
      prefix.push(event);
    }
    const final = deriveEconomy(journal, NOW);
    expect(xp).toBe(final.xp.total);
    expect(diamonds).toBe(final.diamonds.earned);
    expect(charge).toBe(final.charge.current - deriveEconomy([], NOW).charge.current);
  });
});

describe("what the derivation refuses", () => {
  it("throws on a `now` that is not an instant, rather than deriving nonsense", () => {
    expect(() => deriveEconomy([], "yesterday")).toThrow(TypeError);
  });

  it("ignores an event whose timestamp cannot be parsed rather than poisoning the run", () => {
    const broken = { kind: "unit_cleared", at: "not a date", tz: TZ, unitId: "u1" } as unknown as EconomyEvent;
    expect(deriveEconomy([broken], NOW).diamonds.earned).toBe(0);
  });

  it("falls back to UTC for a zone the runtime does not know", () => {
    const odd = { kind: "unit_cleared", at: at(DAY, "12:00"), tz: "Mars/Olympus" } as unknown as EconomyEvent;
    expect(deriveEconomy([odd], NOW).tz).toBe("UTC");
  });
});
