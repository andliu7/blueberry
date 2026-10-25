/**
 * The costume axis (berryCostume.ts) and the costume change wiggle.
 *
 * What would go wrong unseen: a surface with no costume, the nightcap leaking
 * onto a screen, a lesson node dressed by the wrong rule (a branch in the lab
 * coat, a quiz that cheers), a new spectroscopy lesson quietly wearing the lab
 * coat, or the wiggle's CSS drifting away from COSTUME_WIGGLE.
 */

import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

import {
  BERRY_COSTUMES,
  BERRY_SURFACES,
  IN_APP_COSTUMES,
  NOTIFICATION_COSTUME,
  SPECTROSCOPY_NODES,
  costumeForNode,
  costumeForSurface,
  surfaceForNode,
} from "../mascot/berryCostume";
import { COSTUME_WIGGLE } from "../mascot/bloomMotion";
import {
  PATHWAY_UNITS,
  isSectionFinal,
  pathwayNode,
  unitCheckpointNode,
  type PathwayNode,
} from "../demo/pathwayMap";

/** How a lesson surface calls it: the node plus the one fact it does not carry. */
function dress(node: PathwayNode) {
  return costumeForNode({ ...node, final: isSectionFinal(node) });
}

function node(id: string): PathwayNode {
  const found = pathwayNode(id);
  if (found === null) throw new Error(`no pathway node ${id}`);
  return found;
}

const ALL_NODES = PATHWAY_UNITS.flatMap((unit) => [...unit.nodes, unitCheckpointNode(unit)]);

describe("costumeForSurface", () => {
  it("maps every surface to a costume the wardrobe has", () => {
    for (const surface of BERRY_SURFACES) {
      expect(BERRY_COSTUMES).toContain(costumeForSurface(surface));
    }
  });

  it("never returns the nightcap for an in-app surface", () => {
    for (const surface of BERRY_SURFACES) {
      expect(costumeForSurface(surface)).not.toBe(NOTIFICATION_COSTUME);
    }
    expect(IN_APP_COSTUMES).not.toContain(NOTIFICATION_COSTUME);
  });

  it("dresses the named surfaces as MASCOT.md's table says", () => {
    expect(costumeForSurface("reactionNode")).toBe("labcoat");
    expect(costumeForSurface("conceptNode")).toBe("tweed");
    expect(costumeForSurface("spectroscopyNode")).toBe("trench");
    expect(costumeForSurface("branchNode")).toBe("backpack");
    expect(costumeForSurface("unitQuiz")).toBe("referee");
    expect(costumeForSurface("leaderboards")).toBe("cape");
  });
});

describe("costumeForNode", () => {
  it("gives the lab coat to a reaction practice node on the spine", () => {
    expect(node("u1-hx-dienes").kind).toBe("spine");
    expect(dress(node("u1-hx-dienes"))).toBe("labcoat");
  });

  it("gives the backpack to a branch node off the spine", () => {
    expect(dress(node("u1-rank-radical"))).toBe("backpack");
    expect(dress(node("u1-nbs"))).toBe("backpack");
  });

  it("gives the referee to a section quiz and to every unit checkpoint", () => {
    expect(dress(node("u1-quiz-a"))).toBe("referee");
    // A branch quiz is still graded, so the referee wins over the backpack.
    expect(dress(node("u1-quiz-c"))).toBe("referee");
    for (const unit of PATHWAY_UNITS) {
      expect(dress(unitCheckpointNode(unit))).toBe("referee");
    }
  });

  it("gives the tweed to an explainer (video) node on the spine", () => {
    expect(dress(node("u1-12v14"))).toBe("tweed");
  });

  it("gives the trench to spectroscopy, branch or not", () => {
    expect(dress(node("u6-hnmr"))).toBe("trench");
    expect(dress(node("u6-2d"))).toBe("trench");
    expect(dress(node("u2-nmr"))).toBe("trench");
  });

  it("lists only real nodes, and every Unit 6 lesson", () => {
    for (const id of SPECTROSCOPY_NODES) expect(pathwayNode(id), id).not.toBeNull();
    const unit6 = PATHWAY_UNITS.find((unit) => unit.id === "u6");
    expect(unit6).toBeDefined();
    for (const lesson of unit6!.nodes) expect(SPECTROSCOPY_NODES.has(lesson.id), lesson.id).toBe(true);
  });

  it("defaults a missing node to the lab coat", () => {
    expect(costumeForNode(null)).toBe("labcoat");
    expect(costumeForNode(undefined)).toBe("labcoat");
  });

  it("dresses every node on the map, and never in the nightcap or the cape", () => {
    for (const each of ALL_NODES) {
      const costume = dress(each);
      expect(IN_APP_COSTUMES, each.id).toContain(costume);
      expect(costume, each.id).not.toBe("cape");
      expect(BERRY_SURFACES).toContain(surfaceForNode({ ...each, final: isSectionFinal(each) }));
    }
  });
});

describe("the costume change wiggle", () => {
  const css = readFileSync(new URL("../mascot/bloom-costumes.css", import.meta.url), "utf8");
  const markSrc = readFileSync(new URL("../mascot/BlueberryMark.tsx", import.meta.url), "utf8");

  it("matches COSTUME_WIGGLE: 300ms, tilts 0, 4, -3, 0", () => {
    expect(COSTUME_WIGGLE.durationMs).toBe(300);
    expect(css).toContain(`bb-costume-wiggle ${COSTUME_WIGGLE.durationMs}ms`);
    const tilts = [...css.matchAll(/rotate\((-?\d+)deg\)/g)].map((match) => Number(match[1]));
    expect(tilts).toEqual([...COSTUME_WIGGLE.tiltsDeg]);
  });

  it("starts and ends at rest, so a swap never leaves the costume crooked", () => {
    expect(COSTUME_WIGGLE.tiltsDeg[0]).toBe(0);
    expect(COSTUME_WIGGLE.tiltsDeg[COSTUME_WIGGLE.tiltsDeg.length - 1]).toBe(0);
  });

  it("is an instant swap under reduced motion, from the media query and from Berry's still prop", () => {
    expect(css).toMatch(/@media \(prefers-reduced-motion: reduce\)\s*\{\s*\.bb-costume-wiggle\s*\{\s*animation: none;/);
    expect(css).toContain('.berry-origin[data-motion="still"] .bb-costume-wiggle');
  });

  it("is imported by the mark and moves only the costume layer", () => {
    expect(markSrc).toContain('import "./bloom-costumes.css"');
    // The class goes on the costume groups, never on the svg or the body.
    expect(markSrc).not.toMatch(/<svg[^>]*bb-costume-wiggle/);
    expect(markSrc.match(/className=\{costumeLayer\}/g)).toHaveLength(2);
  });
});
