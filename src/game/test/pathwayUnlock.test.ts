/**
 * The unlock policy, asserted over both vocabularies.
 *
 * THE MAP HALF IS REWRITTEN, 2026-10-01. It pinned the owner's 2026-09-01
 * ruling ("reactions within a unit are freely orderable ... only UNIT GATES
 * lock") with five assertions that no mid-unit node ever locks. The owner
 * replaced that ruling: "make the lessons follow a predictable path". Each of
 * the five now pins the LINEAR rule, and at least as strictly, because each
 * is an if-and-only-if over every node rather than a "never":
 *
 *   - a main-line node is locked exactly while an earlier authored main-line
 *     lesson in its unit is uncleared, so the line opens one lesson at a time
 *   - a side quest is locked exactly while its prerequisite is uncleared
 *     (pathwayState.ts, prerequisitesOf)
 *   - a fresh account can START only the first lesson
 *
 * THE TOPIC HALF IS UNCHANGED. deriveFreeOrderStates is the generic course
 * track's rule (topicPathway.ts), not the Orgo map's, and the owner's
 * direction names the map's units; it is reported as an open question
 * rather than changed here.
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
import { PATHWAY_UNITS, checkpointNodeId } from "../demo/pathwayMap";
import { deriveMapPathway, prerequisitesOf, statusOf } from "../tabs/pathway/pathwayState";
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

/*
 * What a FINISHED unit's journal holds, unit by unit: its authored lessons
 * and, where it has any, its checkpoint. ADDED 2026-10-01 with the owner's
 * rule that the checkpoint gates the next unit; the frontier sweeps below
 * clear whole units with this instead of AUTHORED_BY_UNIT, or every unit
 * after the first would stay shut and the sweeps would go vacuous.
 */
const SETTLED_BY_UNIT = PATHWAY_UNITS.map((unit, at) => {
  const ids = AUTHORED_BY_UNIT[at]!.map((node) => node.id);
  return ids.length === 0 ? ids : [...ids, checkpointNodeId(unit.id)];
});

describe("deriveMapPathway, one line per unit on the Orgo map", () => {
  it("locks a node in a reachable unit EXACTLY while one of its prerequisites is uncleared, at every frontier", () => {
    // Was: no node in a reachable unit is ever locked. Now an iff over every
    // node of every reachable unit, at every frontier the track can reach AND
    // at every prefix of the frontier unit's own line, so a lock that is
    // missing and a lock that is extra both fail.
    for (let upTo = 0; upTo < PATHWAY_UNITS.length; upTo += 1) {
      const settled = SETTLED_BY_UNIT.slice(0, upTo).flat().map((id) => cleared(id));
      const line = AUTHORED_BY_UNIT[upTo]!;
      for (let step = 0; step <= line.length; step += 1) {
        const journal = [...settled, ...line.slice(0, step).map((node) => cleared(node.id))];
        const done = new Set(journal.map((event) => (event.kind === "node_cleared" ? event.nodeId : "")));
        const status = deriveMapPathway(PATHWAY_UNITS, journal);
        PATHWAY_UNITS.forEach((unit) => {
          if (status.units.get(unit.id)?.reachable !== true) return;
          for (const node of unit.nodes) {
            if (done.has(node.id)) continue;
            const waiting = prerequisitesOf(unit, node).some((id) => !done.has(id));
            // Round 3: an unauthored node is shut too, by having no content
            // rather than by a prerequisite (pathwayState.ts, `queued`).
            const shut = waiting || node.playable === undefined;
            expect(statusOf(status, node.id).state === "locked", `${node.id} at unit ${upTo}, step ${step}`).toBe(shut);
          }
        });
      }
    }
  });

  it("makes every main-line node wait for EVERY authored main-line lesson before it, and nothing else", () => {
    for (const unit of PATHWAY_UNITS) {
      const line = unit.nodes.filter((node) => node.kind !== "branch" && node.playable !== undefined);
      line.forEach((node, at) => {
        expect(prerequisitesOf(unit, node), node.id).toEqual(line.slice(0, at).map((before) => before.id));
      });
    }
  });

  it("marks a queued Unit 1 node queued and shut inside the active unit, never open, never current", () => {
    // The S3 critic caught u1-da wearing a padlock inside the active unit:
    // a node with no playable link is an authoring statement (queued), not a
    // progress one, and `queued` is still what says so. Round 3 (g11) changed
    // the state beside it from "open" to "locked": an open placeholder drew
    // nine unplayable side quests on Unit 3 as the brightest things on the
    // screen. The track and the sheet read `queued` first and say "coming
    // soon", so "locked" here never reaches the student as a padlock.
    const status = deriveMapPathway(PATHWAY_UNITS, []);
    expect(statusOf(status, "u1-poly")).toEqual({ state: "locked", queued: true });
    expect(status.currentNodeId).not.toBe("u1-poly");
  });

  it("never opens an unauthored node, at any frontier and in any reachable unit", () => {
    for (let upTo = 0; upTo <= PATHWAY_UNITS.length; upTo += 1) {
      const journal = SETTLED_BY_UNIT.slice(0, upTo)
        .flat()
        .map((id) => cleared(id));
      const status = deriveMapPathway(PATHWAY_UNITS, journal);
      let checked = 0;
      for (const unit of PATHWAY_UNITS) {
        for (const node of unit.nodes) {
          if (node.playable !== undefined) continue;
          checked += 1;
          expect(statusOf(status, node.id), `${node.id} with ${upTo} units cleared`).toEqual({ state: "locked", queued: true });
        }
      }
      // Non-vacuous: the map carries unauthored nodes today.
      expect(checked).toBeGreaterThan(0);
    }
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
      const journal = SETTLED_BY_UNIT.slice(0, upTo)
        .flat()
        .map((id) => cleared(id));
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
      const journal = SETTLED_BY_UNIT.slice(0, upTo)
        .flat()
        .map((id) => cleared(id));
      const status = deriveMapPathway(PATHWAY_UNITS, journal);
      if (status.currentNodeId === null) continue;
      expect(statusOf(status, status.currentNodeId).queued).toBe(false);
    }
  });

  it("opens nothing past the line when a later lesson is cleared out of order", () => {
    // Was: clearing the LAST node locks none of its siblings. Now the same
    // out-of-order journal must leave the line exactly where it was: the
    // first lesson current, every other uncleared main-line lesson locked.
    const first = AUTHORED_BY_UNIT.find((nodes) => nodes.length >= 3)!;
    const last = first[first.length - 1]!;
    const status = deriveMapPathway(PATHWAY_UNITS, [cleared(last.id)]);
    expect(statusOf(status, last.id).state).toBe("done");
    expect(statusOf(status, first[0]!.id).state).toBe("current");
    for (const node of first.slice(1, -1)) expect(statusOf(status, node.id).state, node.id).toBe("locked");
  });
});

/* ------------------------------------------------------------------------- */
/* The derived fork carries no lock of its own.                               */
/* ------------------------------------------------------------------------- */

describe("Unit 1, the line a fresh student walks", () => {
  const unit = PATHWAY_UNITS[0]!;
  const shape = unitShape(unit);

  /*
     REWRITTEN 2026-10-01, with the four checks below it. This pinned a fork
     whose concept was 1,2 vs 1,4 addition with kvt on an arm. The fork is
     retired: Unit 1 is allylic, 12v14, kvt, X2, then its checkpoint, X2 after
     kvt because X2's 1,4 dihalide is the thermodynamic product kvt explains.
  */
  it("draws Unit 1's main line as allylic, 12v14, kvt, X2, in that order and no other", () => {
    expect(shape.column.map((node) => node.id)).toEqual(["u1-allylic", "u1-12v14", "u1-kvt", "u1-x2"]);
  });

  it("never draws a main-line node above one authored before it, in any unit", () => {
    PATHWAY_UNITS.forEach((entry) => {
      const drawn = unitShape(entry).column.map((node) => node.id);
      const authored = entry.nodes.map((node) => node.id).filter((id) => drawn.includes(id));
      expect(drawn, `drawn order of ${entry.id}`).toEqual(authored);
    });
  });

  it("lets a fresh account START only the first lesson: every other lesson in the unit is locked", () => {
    const status = deriveMapPathway(PATHWAY_UNITS, []);
    expect(status.currentNodeId).toBe("u1-allylic");
    for (const node of unit.nodes) {
      if (node.playable === undefined || node.id === "u1-allylic") continue;
      expect(statusOf(status, node.id).state, node.id).toBe("locked");
    }
  });

  it("opens the line one lesson at a time: 12v14 after allylic, kvt after 12v14, X2 after kvt", () => {
    const order = ["u1-allylic", "u1-12v14", "u1-kvt", "u1-x2"];
    for (let done = 0; done < order.length; done += 1) {
      const status = deriveMapPathway(PATHWAY_UNITS, order.slice(0, done).map((id) => cleared(id)));
      order.forEach((id, at) => {
        expect(statusOf(status, id).state, `${id} with ${done} cleared`).toBe(at < done ? "done" : at === done ? "current" : "locked");
      });
    }
  });

  /*
     CHANGED 2026-10-01 with the data: Diels-Alder moved from after allylic to
     after 1,2 vs 1,4 (pathwayMap.ts says which arrows forced it). The
     "u1-da open after allylic" assertion now says locked, a new step pins it
     open after 12v14, and the START check moved with it to u1-kvt.
  */
  it("locks each side quest exactly until its prerequisite clears: NBS after allylic, Diels-Alder after 1,2 vs 1,4, the inverse Diels-Alder after Diels-Alder", () => {
    const fresh = deriveMapPathway(PATHWAY_UNITS, []);
    for (const id of ["u1-nbs", "u1-da", "u1-ied"]) expect(statusOf(fresh, id).state, id).toBe("locked");
    const afterAllylic = deriveMapPathway(PATHWAY_UNITS, [cleared("u1-allylic")]);
    expect(statusOf(afterAllylic, "u1-nbs").state).toBe("open");
    expect(statusOf(afterAllylic, "u1-da").state).toBe("locked");
    expect(statusOf(afterAllylic, "u1-ied").state).toBe("locked");
    const after12v14 = deriveMapPathway(PATHWAY_UNITS, [cleared("u1-allylic"), cleared("u1-12v14")]);
    expect(statusOf(after12v14, "u1-da").state).toBe("open");
    expect(statusOf(after12v14, "u1-ied").state).toBe("locked");
    const afterDa = deriveMapPathway(PATHWAY_UNITS, [cleared("u1-allylic"), cleared("u1-12v14"), cleared("u1-da")]);
    expect(statusOf(afterDa, "u1-ied").state).toBe("open");
    // A side quest never takes the START tag: the line does.
    expect(afterDa.currentNodeId).toBe("u1-kvt");
  });

  /* ADDED 2026-10-01, owner: the checkpoint gates the next unit, and START
     moves onto it after the last main lesson, like Duolingo's unit test. */
  it("moves START onto the checkpoint after the last main lesson, with the side quests unplayed", () => {
    const line = ["u1-allylic", "u1-12v14", "u1-kvt", "u1-x2"];
    const status = deriveMapPathway(PATHWAY_UNITS, line.map((id) => cleared(id)));
    expect(status.currentNodeId).toBe(checkpointNodeId(unit.id));
    expect(statusOf(status, checkpointNodeId(unit.id)).state).toBe("current");
    expect(status.units.get(unit.id)?.active).toBe(true);
    // The side quests are open and still not played: they hold nothing shut.
    for (const id of ["u1-nbs", "u1-da"]) expect(statusOf(status, id).state, id).toBe("open");
  });

  it("gates the next unit on the checkpoint, at every unit with authored lessons", () => {
    let checked = 0;
    PATHWAY_UNITS.forEach((entry, at) => {
      const lessons = AUTHORED_BY_UNIT[at]!;
      if (lessons.length === 0) return;
      const next = PATHWAY_UNITS.slice(at + 1).find((_later, offset) => AUTHORED_BY_UNIT[at + 1 + offset]!.length > 0);
      if (next === undefined) return;
      const before = SETTLED_BY_UNIT.slice(0, at).flat().map((id) => cleared(id));
      const lessonsDone = [...before, ...lessons.map((node) => cleared(node.id))];
      const waiting = deriveMapPathway(PATHWAY_UNITS, lessonsDone);
      expect(waiting.units.get(next.id)?.reachable, `${next.id} before ${entry.id}'s check`).toBe(false);
      expect(waiting.currentNodeId, entry.id).toBe(checkpointNodeId(entry.id));
      for (const node of next.nodes) expect(statusOf(waiting, node.id).state, node.id).toBe("locked");
      const passed = deriveMapPathway(PATHWAY_UNITS, [...lessonsDone, cleared(checkpointNodeId(entry.id))]);
      expect(passed.units.get(next.id)?.reachable, `${next.id} after ${entry.id}'s check`).toBe(true);
      checked += 1;
    });
    expect(checked).toBeGreaterThan(3);
  });

  it("records a side quest's prerequisites only on side quests, and only as nodes authored above it in its own unit", () => {
    for (const entry of PATHWAY_UNITS) {
      const ids = entry.nodes.map((node) => node.id);
      entry.nodes.forEach((node, at) => {
        if (node.after === undefined) return;
        expect(node.kind, node.id).toBe("branch");
        for (const id of node.after) expect(ids.indexOf(id), `${node.id} after ${id}`).toBeGreaterThan(-1);
        for (const id of node.after) expect(ids.indexOf(id), `${node.id} after ${id}`).toBeLessThan(at);
      });
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
