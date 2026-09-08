/**
 * THE UNIT SHAPE, derived rather than authored, asserted over the map the
 * browser actually draws.
 *
 * docs/DESIGN-GOALS.md: "DIAMOND fork is the default unit shape (concept node
 * above the fork, branches rejoin at the unit gate). HUB with petals is
 * reserved for categories with three or more families (EAS, the acyl ladder).
 * Dimmed SIDE LOOPS mark application and enrichment lessons ... At most one
 * fork visible per screen, and all nodes the same size."
 *
 * The attempt-2 build satisfied that sentence twice, on two hardcoded units,
 * so eleven of thirteen rendered as bare winding columns. These are the
 * assertions that say the default is a default: every unit with enough spine
 * to cut one gets a fork, exactly two units may grow a flower, and every
 * enrichment node lands on a loop rather than in a flow-wrapped pill list.
 *
 * The other half of the file is the property that made the attempt-2 fork
 * unrenderable: the arms must be able to REJOIN. A fork whose rejoin anchor
 * is in another unit draws across whatever sits between, which is what the
 * critic captured fanning through two dashed chips, a purple banner and a
 * checkpoint card. Here that is a structural claim, not a screenshot: the
 * gate closes the same unit the arms are in.
 *
 * No wall clocks anywhere: pure data over pure functions, so this measures
 * the same at 09:00 and at 23:00 (LOG.md, "The instruments that only worked
 * before dark").
 */

import { describe, expect, it } from "vitest";
import { PATHWAY_UNITS } from "../demo/pathwayMap";
import { HUB_PLANS } from "../tabs/pathway/hubPlan";
import {
  CONCEPT_REACH,
  MIN_DIAMOND_SPINE,
  RUN_MAX,
  conceptIndex,
  unitShape,
  weaveLoops,
} from "../tabs/pathway/unitShape";

const SHAPES = PATHWAY_UNITS.map((unit) => unitShape(unit));

describe("unitShape, the diamond as the DEFAULT unit shape", () => {
  it("gives a fork to every unit whose spine is long enough to cut one", () => {
    let forked = 0;
    PATHWAY_UNITS.forEach((unit, index) => {
      const spine = unit.nodes.filter((node) => node.kind === "spine" || node.kind === "boss");
      const shape = SHAPES[index]!;
      const hub = HUB_PLANS.find((plan) => plan.unitId === unit.id);
      const consumed = hub === undefined ? 0 : 1 + hub.petals.length;
      if (spine.length - consumed < MIN_DIAMOND_SPINE) {
        expect(shape.concept).toBeNull();
        return;
      }
      expect(shape.concept).not.toBeNull();
      expect(shape.arms[0].length + shape.arms[1].length).toBeGreaterThanOrEqual(2);
      forked += 1;
    });
    // The point of the whole file: this is not two.
    expect(forked).toBeGreaterThanOrEqual(8);
  });

  it("never puts a node in two places at once", () => {
    for (const shape of SHAPES) {
      const ids = [
        ...(shape.hub === null ? [] : [shape.hub.id]),
        ...shape.petals.map((node) => node.id),
        ...shape.column.map((node) => node.id),
        ...(shape.concept === null ? [] : [shape.concept.id]),
        ...shape.arms[0].map((node) => node.id),
        ...shape.arms[1].map((node) => node.id),
        ...shape.loops.map((node) => node.id),
        ...shape.checkpoint.map((node) => node.id),
      ];
      expect(new Set(ids).size).toBe(ids.length);
    }
  });

  it("places every node of every unit somewhere, so no authored node is dropped off the track", () => {
    PATHWAY_UNITS.forEach((unit, index) => {
      const shape = SHAPES[index]!;
      const placed = new Set([
        ...(shape.hub === null ? [] : [shape.hub.id]),
        ...shape.petals.map((node) => node.id),
        ...shape.column.map((node) => node.id),
        ...(shape.concept === null ? [] : [shape.concept.id]),
        ...shape.arms[0].map((node) => node.id),
        ...shape.arms[1].map((node) => node.id),
        ...shape.loops.map((node) => node.id),
        ...shape.checkpoint.map((node) => node.id),
      ]);
      for (const node of unit.nodes) expect(placed.has(node.id)).toBe(true);
    });
  });

  it("keeps the fork at the END of the unit, which is what lets the arms rejoin at the unit's own gate", () => {
    // The gate is drawn directly under the arms in the SAME section, so the
    // only nodes that may follow the concept are its own arms. Anything else
    // after it would sit between the fork and its rejoin anchor, which is
    // exactly the ~700px rejoin span the critic captured.
    PATHWAY_UNITS.forEach((unit, index) => {
      const shape = SHAPES[index]!;
      if (shape.concept === null) return;
      const armIds = new Set([...shape.arms[0], ...shape.arms[1]].map((node) => node.id));
      const spine = unit.nodes.filter((node) => node.kind === "spine" || node.kind === "boss");
      const after = spine.slice(spine.findIndex((node) => node.id === shape.concept!.id) + 1);
      for (const node of after) {
        const inHub = shape.hub?.id === node.id || shape.petals.some((petal) => petal.id === node.id);
        expect(armIds.has(node.id) || inHub).toBe(true);
      }
    });
  });

  it("splits the arms evenly enough that neither is empty", () => {
    for (const shape of SHAPES) {
      if (shape.concept === null) continue;
      expect(shape.arms[0].length).toBeGreaterThan(0);
      expect(shape.arms[1].length).toBeGreaterThan(0);
      expect(Math.abs(shape.arms[0].length - shape.arms[1].length)).toBeLessThanOrEqual(1);
    }
  });
});

describe("unitShape, the hub stays RESERVED", () => {
  it("grows a flower on exactly the units the goals name, and on no others", () => {
    const withHub = SHAPES.filter((shape) => shape.hub !== null).map((shape) => shape.unitId);
    expect(withHub).toEqual(HUB_PLANS.map((plan) => plan.unitId));
  });

  it("only draws one where three or more families are actually present", () => {
    for (const shape of SHAPES) {
      if (shape.hub === null) continue;
      expect(shape.petals.length).toBeGreaterThanOrEqual(3);
    }
  });

  it("names only nodes that exist, so an authoring rename breaks here and not on screen", () => {
    for (const plan of HUB_PLANS) {
      const unit = PATHWAY_UNITS.find((entry) => entry.id === plan.unitId);
      expect(unit).toBeDefined();
      const ids = new Set(unit!.nodes.map((node) => node.id));
      expect(ids.has(plan.hub)).toBe(true);
      for (const petal of plan.petals) expect(ids.has(petal)).toBe(true);
    }
  });
});

describe("unitShape, enrichment rides a side loop", () => {
  it("puts every branch node on a loop when the unit has a spine to leave", () => {
    PATHWAY_UNITS.forEach((unit, index) => {
      const shape = SHAPES[index]!;
      const branches = unit.nodes.filter((node) => node.kind === "branch");
      const spine = unit.nodes.filter((node) => node.kind === "spine" || node.kind === "boss");
      if (spine.length === 0) {
        // Nothing to detour off: the enrichment IS the track here.
        expect(shape.loops).toHaveLength(0);
        expect(shape.column.length).toBe(branches.length);
        return;
      }
      expect(shape.loops.map((node) => node.id)).toEqual(branches.map((node) => node.id));
    });
  });

  it("carries the video hook when the unit has a concept beat, and nothing when it does not", () => {
    PATHWAY_UNITS.forEach((unit, index) => {
      const beat = unit.nodes.find((node) => node.playable?.kind === "beat");
      expect(SHAPES[index]!.videoHookId).toBe(beat === undefined ? null : beat.id);
    });
    // The vocabulary has to actually appear somewhere, or it is not shipped.
    expect(SHAPES.filter((shape) => shape.videoHookId !== null).length).toBeGreaterThan(0);
  });
});

describe("weaveLoops, the detours through the column", () => {
  it("keeps every node, once, in an order the trail can read", () => {
    for (const shape of SHAPES) {
      const woven = weaveLoops(shape.column, shape.loops);
      expect(woven).toHaveLength(shape.column.length + shape.loops.length);
      expect(new Set(woven.map((entry) => entry.node.id)).size).toBe(woven.length);
    }
  });

  it("never starts a unit on a detour, so every loop has a road behind it", () => {
    for (const shape of SHAPES) {
      if (shape.column.length === 0) continue;
      expect(weaveLoops(shape.column, shape.loops)[0]!.lane).toBe("main");
    }
  });

  /*
   * TIGHTENED, not relaxed, and the reason is recorded because a changed
   * assertion always deserves one.
   *
   * This used to bound a run by ceil(loops / column), which is the spacing
   * the old weave happened to produce. That bound is DERIVED FROM THE
   * IMPLEMENTATION, so it could not fail whatever the implementation did:
   * unit 3, with nine enrichment nodes and a two-node column, satisfied it
   * with a run of five. A critic then measured the real defect on the built
   * page ("four simultaneous forks at scrollY 0 and 2800, and six at scrollY
   * 4200") and the goals' own clause is an absolute one: "at most one fork
   * visible per screen".
   *
   * So the bound is now the ABSOLUTE constant the layout is written against,
   * RUN_MAX, which is 3 and is smaller than the old bound on every unit of
   * the map. Nothing that passed before and should still pass now fails; unit
   * 3's run of five, which passed before and should not have, now fails.
   */
  it("never lets one detour carry more than RUN_MAX chips, on any unit", () => {
    for (const shape of SHAPES) {
      if (shape.column.length === 0 || shape.loops.length === 0) continue;
      let run = 0;
      let worst = 0;
      for (const entry of weaveLoops(shape.column, shape.loops)) {
        run = entry.lane === "loop" ? run + 1 : 0;
        worst = Math.max(worst, run);
      }
      expect(worst, shape.unitId).toBeLessThanOrEqual(RUN_MAX);
    }
  });
});

describe("conceptIndex, the concept the fork hangs from", () => {
  it("refuses a diamond on a spine shorter than a concept plus two arms", () => {
    for (let n = 0; n < MIN_DIAMOND_SPINE; n += 1) {
      const spine = Array.from({ length: n }, (_, i) => ({
        id: `n${i}`,
        kind: "spine" as const,
        title: "",
        blurb: "",
      }));
      expect(conceptIndex(spine)).toBe(-1);
    }
  });

  it("prefers a concept beat within reach of the end over the plain positional read", () => {
    const spine = Array.from({ length: 6 }, (_, i) => ({
      id: `n${i}`,
      kind: "spine" as const,
      title: "",
      blurb: "",
      ...(i === 4 ? { playable: { kind: "beat" as const, id: `n${i}` } } : {}),
    }));
    expect(conceptIndex(spine)).toBe(4);
  });

  it("ignores a concept beat too far back to hang a fork from", () => {
    const spine = Array.from({ length: 12 }, (_, i) => ({
      id: `n${i}`,
      kind: "spine" as const,
      title: "",
      blurb: "",
      ...(i === 0 ? { playable: { kind: "beat" as const, id: `n${i}` } } : {}),
    }));
    expect(conceptIndex(spine)).toBe(12 - MIN_DIAMOND_SPINE);
    expect(conceptIndex(spine)).toBeGreaterThan(12 - CONCEPT_REACH - 1);
  });
});
