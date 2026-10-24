/**
 * THE UNLOCK ANIMATION PLAYS ONCE, owner 23 Oct. Which node it plays on comes
 * from the journal (celebrationFor); whether it plays now comes from one seen
 * flag (readCelebration). See tabs/pathway/unlockCelebration.ts.
 */
import { describe, expect, it } from "vitest";
import type { EconomyEvent } from "@blueberry/economy";

import { PATHWAY_UNITS, checkpointNodeId } from "../demo/pathwayMap";
import { UNLOCK_SEEN_KEY, celebrationFor, latestClear, readCelebration } from "../tabs/pathway/unlockCelebration";
import { unitSections } from "../tabs/pathway/testOuts";
import type { SaveStorage } from "../resume/lessonSave";

const AT = "2026-10-23T12:00:00.000Z";
const NOW = Date.parse(AT) + 60_000;

function cleared(nodeId: string, at = AT): EconomyEvent {
  return { kind: "node_cleared", at, tz: "UTC", nodeId, nodeKind: "concept", flawless: true, stepsInOneSitting: 1, spine: true, difficulty: 3 };
}

function memory(seed: Record<string, string> = {}): SaveStorage & { readonly data: Map<string, string> } {
  const data = new Map(Object.entries(seed));
  return {
    data,
    getItem: (key) => data.get(key) ?? null,
    setItem: (key, value) => void data.set(key, value),
    removeItem: (key) => void data.delete(key),
  };
}

const U3 = PATHWAY_UNITS.find((unit) => unit.id === "u3")!;
const SECTIONS = unitSections(U3);
const [S1, S2] = SECTIONS;

describe("what a clear unlocks", () => {
  it("finds the latest clear", () => {
    expect(latestClear([])).toBeNull();
    expect(latestClear([cleared("a"), cleared("b")])).toMatchObject({ nodeId: "b" });
  });

  it("a section-start clear targets the next lesson, with the glow travelling from the cleared one", () => {
    const first = S2!.lights[0]!;
    expect(celebrationFor(PATHWAY_UNITS, [cleared(first)])).toEqual({ key: `${AT}|${first}`, unitId: "u3", from: first, to: S2!.lights[1] });
  });

  it("a replayed lesson unlocks nothing", () => {
    const first = S2!.lights[0]!;
    expect(celebrationFor(PATHWAY_UNITS, [cleared(first), cleared(first, "2026-10-23T12:05:00.000Z")])).toBeNull();
  });

  it("the last lesson of a unit opens its check, which draws its own road, so from is null", () => {
    // Every section's lessons, so the last one cleared is the unit's last (Unit 3 has three sections since 23 Oct).
    const lessons = SECTIONS.flatMap((section) => section.lights).map((id) => cleared(id));
    expect(celebrationFor(PATHWAY_UNITS, lessons)).toEqual({ key: `${AT}|${SECTIONS.at(-1)!.lights.at(-1)}`, unitId: "u3", from: null, to: checkpointNodeId("u3") });
  });

  it("the last lesson of a section that opens nothing celebrates nothing", () => {
    // The next section's first lesson was open already.
    expect(celebrationFor(PATHWAY_UNITS, S1!.lights.map((id) => cleared(id)))).toBeNull();
  });
});

describe("it plays once", () => {
  const journal = [cleared(S2!.lights[0]!)];

  it("seeds the flag without playing when no flag is stored and a clear is waiting", () => {
    const storage = memory();
    expect(readCelebration(PATHWAY_UNITS, journal, storage, NOW)).toBeNull();
    expect(storage.data.get(UNLOCK_SEEN_KEY)).toBe(`${AT}|${S2!.lights[0]}`);
  });

  it("seeds the flag on a visit with nothing to play, so the first clear after it plays", () => {
    const storage = memory();
    expect(readCelebration(PATHWAY_UNITS, [], storage, NOW)).toBeNull();
    expect(storage.data.has(UNLOCK_SEEN_KEY)).toBe(true);
    expect(readCelebration(PATHWAY_UNITS, journal, storage, NOW)).toMatchObject({ to: S2!.lights[1] });
  });

  it("plays once, then never again for the same clear", () => {
    const storage = memory({ [UNLOCK_SEEN_KEY]: "none" });
    expect(readCelebration(PATHWAY_UNITS, journal, storage, NOW)).toMatchObject({ unitId: "u3", to: S2!.lights[1] });
    expect(readCelebration(PATHWAY_UNITS, journal, storage, NOW)).toBeNull();
  });

  it("does not play a stale clear, synced from another device", () => {
    const storage = memory({ [UNLOCK_SEEN_KEY]: "none" });
    expect(readCelebration(PATHWAY_UNITS, journal, storage, Date.parse(AT) + 16 * 60_000)).toBeNull();
    expect(storage.data.get(UNLOCK_SEEN_KEY)).toBe(`${AT}|${S2!.lights[0]}`);
  });

  it("never plays without storage, and survives storage that throws", () => {
    expect(readCelebration(PATHWAY_UNITS, journal, null, NOW)).toBeNull();
    const broken: SaveStorage = {
      getItem: () => {
        throw new Error("blocked");
      },
      setItem: () => undefined,
      removeItem: () => undefined,
    };
    expect(readCelebration(PATHWAY_UNITS, journal, broken, NOW)).toBeNull();
  });
});
