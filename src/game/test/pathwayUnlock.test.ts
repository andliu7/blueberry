/**
 * The unlock policy, asserted POSITIVELY: no mid-unit node ever renders
 * locked. Owner ruling 2026-09-01 in docs/DESIGN-GOALS.md: "reactions within
 * a unit are freely orderable. Branch nodes carry no locks; only UNIT GATES
 * lock." The per-node prerequisite gates the earlier topic view drew are
 * retired, and this file is the retirement's proof, over both vocabularies:
 *
 *   - deriveFreeOrderStates (topicPathway.ts), the topic track's rule, swept
 *     exhaustively over every done-pattern of a small track
 *   - deriveMapPathway (pathwayState.ts), the Orgo map's rule, run over
 *     PATHWAY_UNITS, the inventory the browser actually draws
 *
 * pathwayState.test.ts already encodes the map model and stays untouched;
 * this file adds the free-order half and the cross-cutting positive claim.
 * One deliberate nuance: an UNAUTHORED map node rides queued=true BESIDE its
 * state, per pathwayState.ts. Inside a reachable unit it is "open" (dashed
 * authoring treatment, never a padlock: the S3 critic measured u1-da drawn
 * locked inside the active unit and named it a violation of the unlock
 * policy), it is never "current", and only inside an unreachable unit does
 * it share its siblings' lock, because there the unit gate is the true
 * statement. So the positive claim here is TOTAL: within a reachable unit,
 * NO node of any kind is ever locked.
 *
 * No wall clocks anywhere: every journal timestamp is a fixed literal, so
 * this suite measures the same at 09:00 and at 23:00 (LOG.md, "The
 * instruments that only worked before dark").
 */

import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import type { EconomyEvent } from "@blueberry/economy";
import { PATHWAY_UNITS } from "../demo/pathwayMap";
import { deriveMapPathway, statusOf } from "../tabs/pathway/pathwayState";
import { deriveFreeOrderStates, type FreeOrderNode } from "../tabs/pathway/topicPathway";
import { unitShape } from "../tabs/pathway/unitShape";

/* ------------------------------------------------------------------------- */
/* The topic track's rule, swept exhaustively.                                */
/* ------------------------------------------------------------------------- */

/** Three units of three nodes: small enough to sweep every done-pattern. */
function track(doneBits: number, playableBits: number): FreeOrderNode[] {
  const units = ["a", "a", "a", "b", "b", "b", "c", "c", "c"];
  return units.map((unit, index) => ({
    unit,
    done: (doneBits & (1 << index)) !== 0,
    playable: (playableBits & (1 << index)) !== 0,
  }));
}

const ALL_PLAYABLE = (1 << 9) - 1;

describe("deriveFreeOrderStates, the free-order rule", () => {
  it("never locks a node in a unit that holds the current node, on any of the 512 done-patterns", () => {
    for (let bits = 0; bits < 1 << 9; bits += 1) {
      const nodes = track(bits, ALL_PLAYABLE);
      const states = deriveFreeOrderStates(nodes);
      const currentAt = states.indexOf("current");
      if (currentAt === -1) continue;
      const unit = nodes[currentAt]!.unit;
      nodes.forEach((node, index) => {
        if (node.unit === unit) expect(states[index]).not.toBe("locked");
      });
    }
  });

  it("locks units WHOLE or not at all: no unit is ever cut in half by a lock", () => {
    // This is "only unit gates lock" read as an invariant: a lock can only
    // arrive at a unit boundary. Done nodes are exempt because done is a
    // fact about the past, not a gate: a cleared lesson stays green even in
    // a stretch of track the student has scrolled past the gate to see.
    for (let bits = 0; bits < 1 << 9; bits += 1) {
      const nodes = track(bits, ALL_PLAYABLE);
      const states = deriveFreeOrderStates(nodes);
      for (const unit of ["a", "b", "c"]) {
        const notDone = states.filter((_, index) => nodes[index]!.unit === unit && !nodes[index]!.done);
        const locked = notDone.filter((state) => state === "locked").length;
        expect(locked === 0 || locked === notDone.length).toBe(true);
      }
    }
  });

  it("keeps every not-done node of the frontier unit freely orderable: open or current, never locked", () => {
    for (let bits = 0; bits < 1 << 9; bits += 1) {
      const nodes = track(bits, ALL_PLAYABLE);
      const states = deriveFreeOrderStates(nodes);
      // The frontier is the first unit with a not-done playable node.
      const frontierAt = nodes.findIndex((node, index) => node.playable && states[index] !== "done" && !node.done);
      if (frontierAt === -1) continue;
      const unit = nodes[frontierAt]!.unit;
      nodes.forEach((node, index) => {
        if (node.unit !== unit || node.done) return;
        expect(["open", "current"]).toContain(states[index]);
      });
    }
  });

  it("assigns exactly one current node whenever any playable node is not done", () => {
    for (let bits = 0; bits < 1 << 9; bits += 1) {
      const states = deriveFreeOrderStates(track(bits, ALL_PLAYABLE));
      const currents = states.filter((state) => state === "current").length;
      expect(currents).toBe(bits === ALL_PLAYABLE ? 0 : 1);
    }
  });

  it("never blocks the track behind a unit with no playable content: authoring debt is ours, not the student's", () => {
    // Unit b is entirely unauthored; with unit a done, unit c must be reachable.
    const nodes = track(0b000000111, 0b111000111);
    const states = deriveFreeOrderStates(nodes);
    for (let index = 6; index < 9; index += 1) expect(states[index]).not.toBe("locked");
  });

  it("marks locks only at unit boundaries: everything after the first unfinished playable unit locks whole", () => {
    // Unit a untouched, so b and c lock entirely: the unit gate, not the node.
    const states = deriveFreeOrderStates(track(0, ALL_PLAYABLE));
    for (let index = 0; index < 3; index += 1) expect(states[index]).not.toBe("locked");
    for (let index = 3; index < 9; index += 1) expect(states[index]).toBe("locked");
  });
});

/* ------------------------------------------------------------------------- */
/* The map's rule, over the inventory the browser draws.                      */
/* ------------------------------------------------------------------------- */

/** A journal event with a FIXED timestamp: no wall clock in this suite. */
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

/** Every authored track node, unit by unit, in track order. */
const AUTHORED_BY_UNIT = PATHWAY_UNITS.map((unit) =>
  unit.nodes.filter((node) => node.kind !== "branch" && node.playable !== undefined),
);

describe("deriveMapPathway, the same policy on the Orgo map", () => {
  it("renders NO node locked in any reachable unit, queued ones included, at every frontier the track can reach", () => {
    // Walk the frontier across the whole map: clear the first k units and
    // check the invariant at each stop. This is the browser-facing positive
    // claim: a student standing anywhere never sees a locked node beside an
    // open one inside their own unit. TOTAL over every node kind, because a
    // queued node in a reachable unit renders the dashed authoring
    // treatment, never a padlock (the S3 must-fix on u1-da).
    for (let upTo = 0; upTo < PATHWAY_UNITS.length; upTo += 1) {
      const journal = AUTHORED_BY_UNIT.slice(0, upTo)
        .flat()
        .map((node) => cleared(node.id));
      const status = deriveMapPathway(PATHWAY_UNITS, journal);
      PATHWAY_UNITS.forEach((unit) => {
        if (status.units.get(unit.id)?.reachable !== true) return;
        for (const node of unit.nodes) {
          expect(statusOf(status, node.id).state).not.toBe("locked");
        }
      });
    }
  });

  it("marks a queued Unit 1 side loop open-and-queued inside the active unit, never locked, never current", () => {
    // The S3 critic caught u1-da wearing a padlock inside the active unit:
    // a node with no playable link is an authoring statement (queued), not a
    // progress one. u1-da is playable now, so the pin moved to u1-poly, which
    // is the unit's remaining node without a link and the one least likely to
    // gain one: its own blurb reads "Conceptual mention".
    const status = deriveMapPathway(PATHWAY_UNITS, []);
    expect(statusOf(status, "u1-poly")).toEqual({ state: "open", queued: true });
    expect(status.currentNodeId).not.toBe("u1-poly");
  });

  it("marks EXACTLY ONE node current across the WHOLE map, at every frontier", () => {
    /*
     * The START pill, the halo, the berry and the rail's "current" step all
     * hang off this one node, so two of them is two places a student is told
     * they are standing and none is a page with no way in.
     *
     * A round-two critic counted two currents on unit 3 and, on a finished
     * unit 1, one current chip carrying no START pill while the rail called
     * unit 3 current. The DOM half of that was the legend's swatch wearing
     * the chip's own state class, which PathwayTab.tsx has stopped doing.
     * This is the DATA half, pinned so the rule cannot grow a second one
     * later: the count is over every node the map holds, not per unit.
     *
     * Zero is correct in exactly one case, a track with every authored node
     * cleared, which is the same shape the topic sweep above asserts.
     */
    for (let upTo = 0; upTo <= PATHWAY_UNITS.length; upTo += 1) {
      const journal = AUTHORED_BY_UNIT.slice(0, upTo)
        .flat()
        .map((node) => cleared(node.id));
      const status = deriveMapPathway(PATHWAY_UNITS, journal);
      const currents = [...status.nodes.values()].filter((entry) => entry.state === "current");
      // Zero is correct in exactly one case: nothing AUTHORED is left to
      // stand on. That is not the same as "every unit cleared", because the
      // last unit of the map is entirely unauthored today and a queued node
      // is never current (a START tag over a node with no content is a
      // promise the app cannot keep, pathwayState.ts).
      const finished = AUTHORED_BY_UNIT.slice(upTo).flat().length === 0;
      expect(currents.length, `currents with ${upTo} units cleared`).toBe(finished ? 0 : 1);
      expect(status.currentNodeId === null, `currentNodeId with ${upTo} units cleared`).toBe(finished);
      // And exactly one unit claims to be the one being worked in, because
      // the rail draws its "current" step from that flag rather than from
      // the node, and the two saying different things is the same defect.
      const active = PATHWAY_UNITS.filter((unit) => status.units.get(unit.id)?.active === true);
      expect(active.length, `active units with ${upTo} cleared`).toBe(currents.length);
    }
  });

  it("never hangs the START tag on a queued node, at any frontier", () => {
    for (let upTo = 0; upTo < PATHWAY_UNITS.length; upTo += 1) {
      const journal = AUTHORED_BY_UNIT.slice(0, upTo)
        .flat()
        .map((node) => cleared(node.id));
      const status = deriveMapPathway(PATHWAY_UNITS, journal);
      if (status.currentNodeId === null) continue;
      expect(statusOf(status, status.currentNodeId).queued).toBe(false);
    }
  });

  it("keeps a half-cleared unit freely orderable: clearing one node locks none of its siblings", () => {
    const first = AUTHORED_BY_UNIT.find((nodes) => nodes.length >= 2);
    expect(first).toBeDefined();
    // Clear the LAST authored node of the unit, out of order on purpose: the
    // free-order ruling is precisely that order inside a unit is the
    // student's own.
    const status = deriveMapPathway(PATHWAY_UNITS, [cleared(first![first!.length - 1]!.id)]);
    expect(statusOf(status, first![first!.length - 1]!.id).state).toBe("done");
    for (const node of first!.slice(0, -1)) {
      expect(["open", "current"]).toContain(statusOf(status, node.id).state);
    }
  });
});

/* ------------------------------------------------------------------------- */
/* The derived fork carries no lock of its own.                               */
/* ------------------------------------------------------------------------- */

describe("the diamond fork, derived", () => {
  const shapes = PATHWAY_UNITS.map((unit) => unitShape(unit));

  it("gives the first unit a fork whose concept is its concept beat", () => {
    const first = shapes[0]!;
    expect(first.concept?.playable?.kind).toBe("beat");
    expect(first.arms[0].length).toBeGreaterThan(0);
    expect(first.arms[1].length).toBeGreaterThan(0);
  });

  it("carries no lock of its own: on a fresh account the concept and BOTH arms are open at once", () => {
    const status = deriveMapPathway(PATHWAY_UNITS, []);
    const first = shapes[0]!;
    const members = [first.concept!, ...first.arms[0], ...first.arms[1]];
    for (const node of members) {
      expect(["open", "current"]).toContain(statusOf(status, node.id).state);
    }
  });

  it("never locks a node on a dimmed side loop inside a reachable unit", () => {
    const status = deriveMapPathway(PATHWAY_UNITS, []);
    for (const shape of shapes) {
      const entry = status.units.get(shape.unitId);
      if (entry === undefined || !entry.reachable) continue;
      for (const node of shape.loops) {
        expect(statusOf(status, node.id).state).not.toBe("locked");
      }
    }
  });
});

/* ------------------------------------------------------------------ */
/* Every modal on the tab says it is one                                */
/* ------------------------------------------------------------------ */

describe("the pager's arrow keys stand down for every overlay, not just the first one found", () => {
  /*
   * The pager pages on ArrowLeft and ArrowRight, and bails when anything on
   * the page carries dialog ARIA. That guard was written for the node sheet,
   * which meant the guidebook overlay, a plain div at the time, let Right
   * turn the unit behind an open guidebook: the same bug in the second of
   * two places. The guard is generic, so the pin belongs on the overlays.
   *
   * Source text rather than a render, because the two overlays carry the
   * attributes differently and both ways are correct: the guidebook mounts
   * only while open, so its ARIA is unconditional; NodeSheet mounts once and
   * lives closed, so its ARIA is conditional on a node being open, and an
   * unconditional one there would tell the guard a modal is always up.
   */
  const read = (relative: string) => readFileSync(path.join(path.dirname(fileURLToPath(import.meta.url)), relative), "utf8");

  it("gives the guidebook overlay the dialog ARIA the guard reads", () => {
    const tab = read("../tabs/pathway/PathwayTab.tsx");
    const overlay = tab.slice(tab.indexOf('className="gb-overlay"'));
    expect(overlay.slice(0, 200)).toContain('role="dialog"');
    expect(overlay.slice(0, 200)).toContain('aria-modal="true"');
  });

  it("keeps the node sheet's dialog ARIA conditional, so a closed sheet never claims the keys", () => {
    const sheet = read("../pathway-sheet/NodeSheet.tsx");
    expect(sheet).toContain('role={node === null ? undefined : "dialog"}');
    expect(sheet).toContain('aria-modal={node === null ? undefined : "true"}');
  });

  it("still guards on the ARIA state rather than on a class name", () => {
    const tab = read("../tabs/pathway/PathwayTab.tsx");
    expect(tab).toContain('dialog[open], [role="dialog"][aria-modal="true"]');
  });
  /**
   * THE TAB DERIVES A NODE'S PLACE, it never carries a table of positions.
   *
   * The sentences themselves are pinned by being run, in
   * pathwayBranchDensity.test.ts, because placeSaid and nodePlaces are pure.
   * What can only be checked in the source is the WIRING: that the tab reads
   * the places off the shape it already rendered from, and that every chip's
   * detail sentence is built with the place belonging to that chip.
   *
   * Source text for the same reason as the overlays above: PathwayTab.tsx
   * imports the app's hooks and cannot load outside a document.
   */
  it("derives every chip's place from the unit's own shape rather than a table", () => {
    const tab = read("../tabs/pathway/PathwayTab.tsx");
    expect(tab).toContain("const places = nodePlaces(shape);");
    const details = tab.match(/mapNodeDetail\([^)]*\)/g) ?? [];
    expect(details.length).toBeGreaterThan(2);
    for (const call of details) expect(call).toMatch(/place/);
  });
});
