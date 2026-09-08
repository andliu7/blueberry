/**
 * The EAS hub: the goals' reserved branch shape, asserted against the map.
 *
 * docs/DESIGN-GOALS.md: "HUB with petals is reserved for categories with
 * three or more families (EAS, the acyl ladder)", committed as the hub
 * diagram in blueberry_spec-node-types_1788291072.png. The S3 critic named
 * the shape's absence on the exact unit the goals name, so this file pins
 * three things: the plan names real nodes (an authoring rename breaks a test
 * and not the screen), the plan satisfies the three-or-more-families clause
 * it exists for, and the petal geometry the spokes and chips share is sound.
 *
 * No wall clocks anywhere: pure data and pure arithmetic.
 */

import { describe, expect, it } from "vitest";
import type { EconomyEvent } from "@blueberry/economy";
import { PATHWAY_UNITS } from "../demo/pathwayMap";
import { deriveMapPathway, statusOf } from "../tabs/pathway/pathwayState";
import { EAS_HUB, HUB_CENTRE, PETAL_RING, hubMemberIds, petalPositions } from "../tabs/pathway/hubPlan";

const UNIT = PATHWAY_UNITS.find((unit) => unit.id === EAS_HUB.unitId);

describe("the EAS hub plan", () => {
  it("sits on the unit the goals reserve the shape for: Electrophilic Aromatic Substitution", () => {
    expect(UNIT).toBeDefined();
    expect(UNIT!.title).toContain("Electrophilic Aromatic Substitution");
  });

  it("names only nodes that exist in that unit, so an authoring rename breaks here and not on screen", () => {
    const ids = new Set(UNIT!.nodes.map((node) => node.id));
    for (const id of hubMemberIds(EAS_HUB)) expect(ids.has(id)).toBe(true);
  });

  it("carries three or more families, the clause the shape is reserved for", () => {
    expect(EAS_HUB.petals.length).toBeGreaterThanOrEqual(3);
  });

  it("hangs every petal off a playable spine node, and the hub off the shared mechanism", () => {
    const byId = new Map(UNIT!.nodes.map((node) => [node.id, node]));
    const hub = byId.get(EAS_HUB.hub);
    expect(hub?.kind).toBe("spine");
    expect(hub?.playable).toBeDefined();
    for (const id of EAS_HUB.petals) {
      const petal = byId.get(id);
      expect(petal?.kind).toBe("spine");
      expect(petal?.playable).toBeDefined();
    }
  });

  it("does not overlap the demo fork: one unit, one special shape", () => {
    // At most one fork per screen is the goals' own constraint; the hub
    // lives on u3 and the diamond on u1, so no unit draws both.
    expect(EAS_HUB.unitId).not.toBe("u1");
  });

  it("keeps every petal freely orderable once the unit opens: no petal ever locks apart from its unit", () => {
    // Clear everything before u3 so u3 is the active unit, then every hub
    // member must be open or current: the hub is presentation, not a gate.
    const index = PATHWAY_UNITS.findIndex((unit) => unit.id === EAS_HUB.unitId);
    const journal: EconomyEvent[] = PATHWAY_UNITS.slice(0, index)
      .flatMap((unit) => unit.nodes.filter((node) => node.kind !== "branch" && node.playable !== undefined))
      .map((node) => ({
        kind: "node_cleared" as const,
        at: "2026-08-28T12:00:00.000Z",
        tz: "UTC",
        nodeId: node.id,
        nodeKind: "reaction" as const,
        flawless: true,
        stepsInOneSitting: 1,
        spine: true,
        difficulty: 3,
      }));
    const status = deriveMapPathway(PATHWAY_UNITS, journal);
    expect(status.units.get(EAS_HUB.unitId)?.reachable).toBe(true);
    for (const id of hubMemberIds(EAS_HUB)) {
      expect(["open", "current"]).toContain(statusOf(status, id).state);
    }
  });
});

describe("petalPositions, the arithmetic the spokes and chips share", () => {
  it("returns one position per petal, empty for zero, and never throws", () => {
    expect(petalPositions(0)).toEqual([]);
    expect(petalPositions(1)).toHaveLength(1);
    expect(petalPositions(EAS_HUB.petals.length)).toHaveLength(EAS_HUB.petals.length);
  });

  it("stays inside the container in percent, with room for a chip cell at every count that could ship", () => {
    for (let count = 1; count <= 8; count += 1) {
      for (const position of petalPositions(count)) {
        expect(position.x).toBeGreaterThan(10);
        expect(position.x).toBeLessThan(90);
        expect(position.y).toBeGreaterThan(5);
        expect(position.y).toBeLessThan(95);
      }
    }
  });

  it("keeps the vertical axis clear at the shipped count: the spine ribbon passes through the hub centre, so no petal sits on its way in or out", () => {
    const positions = petalPositions(EAS_HUB.petals.length);
    for (const position of positions) {
      expect(Math.abs(position.x - HUB_CENTRE.x)).toBeGreaterThan(10);
    }
    // Equal angular shares: no two petals collapse onto the same point.
    const seen = new Set(positions.map((position) => `${position.x},${position.y}`));
    expect(seen.size).toBe(positions.length);
  });

  it("rings the hub centre at one radius per axis: every petal the same distance out", () => {
    // Normalised by the exported ring itself, so this asserts the SHAPE
    // (one ellipse, every petal on it) rather than duplicating the radii.
    const positions = petalPositions(5);
    const radii = positions.map((position) => {
      const dx = (position.x - HUB_CENTRE.x) / PETAL_RING.rx;
      const dy = (position.y - HUB_CENTRE.y) / PETAL_RING.ry;
      return Math.sqrt(dx * dx + dy * dy);
    });
    for (const radius of radii) expect(radius).toBeCloseTo(1, 1);
  });

  it("leaves label room between every petal and the centre at the shipped count", () => {
    // The attempt-2 critic measured the two upper petal labels rendering
    // partly BEHIND the centre chip: the old 34-percent ring left ~36px
    // between an upper petal's chip edge and the centre chip's edge, and a
    // plated label needs about 60. On the 30rem (480px) container in
    // pathway.css, 28 percent of vertical separation is ~134px: two 34px
    // chip half-heights plus a two-line plated label (~48px) plus its gaps.
    // Every shipped petal sits on a diagonal, so the vertical share of the
    // ring's ry must clear that floor.
    for (const position of petalPositions(EAS_HUB.petals.length)) {
      expect(Math.abs(position.y - HUB_CENTRE.y)).toBeGreaterThanOrEqual(28);
    }
  });
});
