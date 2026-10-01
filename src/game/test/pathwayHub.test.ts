/**
 * THE EAS UNIT, WHICH USED TO BE THE HUB, asserted against the map.
 *
 * REWRITTEN 2026-10-01 on the owner's direction "make the lessons follow a
 * predictable path". This file pinned the EAS hub flower (a shared mechanism
 * with its reaction families ringed round it, every petal open at once) and
 * the petal geometry hubPlan.ts computed. The flower is retired with every
 * other branch shape and hubPlan.ts is deleted, so each old claim is replaced
 * by the linear one about the same unit, at least as strictly:
 *
 *   - "names only nodes that exist"      every node it drew is still on the
 *                                        unit's line, in authored order
 *   - "petals freely orderable"          the families open ONE AT A TIME,
 *                                        exactly the next authored lesson,
 *                                        checked at every step of the unit
 *   - the petal geometry                 no hub geometry ships at all
 *
 * No wall clocks anywhere: pure data, and every journal stamp a literal.
 */

import { existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import type { EconomyEvent } from "@blueberry/economy";
import { PATHWAY_UNITS } from "../demo/pathwayMap";
import { deriveMapPathway, statusOf } from "../tabs/pathway/pathwayState";
import { unitShape } from "../tabs/pathway/unitShape";

const UNIT = PATHWAY_UNITS.find((unit) => unit.title.includes("Electrophilic Aromatic Substitution"));

function cleared(nodeId: string): EconomyEvent {
  return {
    kind: "node_cleared",
    at: "2026-08-28T12:00:00.000Z",
    tz: "UTC",
    nodeId,
    nodeKind: "reaction",
    flawless: true,
    stepsInOneSitting: 1,
    spine: true,
    difficulty: 3,
  };
}

describe("the EAS unit is a line, not a flower", () => {
  it("exists, under the title the goals reserved the flower for", () => {
    expect(UNIT).toBeDefined();
  });

  it("draws every main-line node on its column, in authored order, with nothing ringed off it", () => {
    const spine = UNIT!.nodes.filter((node) => node.kind === "spine" || node.kind === "boss");
    expect(spine.length).toBeGreaterThanOrEqual(3);
    expect(unitShape(UNIT!).column.map((node) => node.id)).toEqual(spine.map((node) => node.id));
  });

  it("opens its families one at a time: exactly the next authored lesson, at every step of the unit", () => {
    const index = PATHWAY_UNITS.indexOf(UNIT!);
    const before = PATHWAY_UNITS.slice(0, index).flatMap((unit) =>
      unit.nodes.filter((node) => node.kind !== "branch" && node.playable !== undefined).map((node) => cleared(node.id)),
    );
    const line = UNIT!.nodes.filter((node) => node.kind !== "branch" && node.playable !== undefined);
    expect(line.length).toBeGreaterThanOrEqual(3);
    for (let done = 0; done < line.length; done += 1) {
      const status = deriveMapPathway(PATHWAY_UNITS, [...before, ...line.slice(0, done).map((node) => cleared(node.id))]);
      expect(status.units.get(UNIT!.id)?.reachable).toBe(true);
      line.forEach((node, at) => {
        const want = at < done ? "done" : at === done ? "current" : "locked";
        expect(statusOf(status, node.id).state, `${node.id} with ${done} cleared`).toBe(want);
      });
    }
  });

  it("ships no hub geometry: hubPlan.ts is deleted, not left behind", () => {
    expect(existsSync(fileURLToPath(new URL("../tabs/pathway/hubPlan.ts", import.meta.url)))).toBe(false);
  });
});
