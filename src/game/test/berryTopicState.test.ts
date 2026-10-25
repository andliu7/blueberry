/**
 * The lesson-to-state table and the mind-blown flag (berryTopicState.ts).
 *
 * What would go wrong unseen: a node renamed in pathwayMap.ts quietly turning
 * its berry neutral, a state in the table that the renderer has no shape for,
 * or the mind-blown beat playing on every resonance lesson instead of once.
 */

import { describe, expect, it } from "vitest";

import {
  MIND_BLOWN,
  NODE_STATE,
  RESONANCE_SEEN_KEY,
  STATE_PRESET_MOOD,
  isFirstResonance,
  markResonanceSeen,
  readResonanceSeen,
  stateForNode,
} from "../mascot/berryTopicState";
import { BERRY_STATES, STATE_SHAPE } from "../mascot/berryState";
import { BERRY_MOODS } from "../mascot/berryMood";
import { BEHAVIOURS } from "../mascot/berryBehaviour";
import { pathwayNode } from "../demo/pathwayMap";
import type { SaveStorage } from "../resume/lessonSave";

function memoryStorage(): SaveStorage & { data: Map<string, string> } {
  const data = new Map<string, string>();
  return {
    data,
    getItem: (key) => data.get(key) ?? null,
    setItem: (key, value) => void data.set(key, value),
    removeItem: (key) => void data.delete(key),
  };
}

describe("stateForNode", () => {
  it("names only real pathway nodes", () => {
    for (const id of Object.keys(NODE_STATE)) {
      expect(pathwayNode(id), id).not.toBeNull();
    }
  });

  it("maps every node to a state the renderer can draw, and never to neutral or charred", () => {
    for (const [id, state] of Object.entries(NODE_STATE)) {
      expect(BERRY_STATES, id).toContain(state);
      expect(STATE_SHAPE[state], id).toBeDefined();
      // Neutral is the default, so listing it is noise; charred is a reaction
      // to three misses, never something a lesson starts in; charged is the
      // Charge meter, not a topic.
      expect(["neutral", "charred", "charged"], id).not.toContain(state);
    }
  });

  it("maps real lessons to the state their chemistry is about", () => {
    expect(stateForNode("u1-rank-cation")).toBe("carbocation");
    expect(stateForNode("u3-arenium")).toBe("carbocation");
    expect(stateForNode("u5-dehydration")).toBe("carbocation");
    expect(stateForNode("u1-nbs")).toBe("radical");
    expect(stateForNode("u3-benzylic-br")).toBe("radical");
    expect(stateForNode("u1-allylic")).toBe("resonance");
    expect(stateForNode("u4-meisenheimer")).toBe("resonance");
    expect(stateForNode("u2-huckel")).toBe("aromatic");
    expect(stateForNode("u2-hetero")).toBe("aromatic");
    expect(stateForNode("u8-fischer")).toBe("protonated");
    expect(stateForNode("u5-roh-rx")).toBe("protonated");
  });

  it("leaves the look-alikes a keyword match would get wrong neutral", () => {
    // A carbanion is not a carbocation, and a Diels-Alder is not about one atom.
    expect(stateForNode("u1-rank-anion")).toBe("neutral");
    expect(stateForNode("u1-da")).toBe("neutral");
    expect(stateForNode("u5-williamson")).toBe("neutral");
  });

  it("gives neutral for unknown, empty and missing ids", () => {
    expect(stateForNode("not-a-node")).toBe("neutral");
    expect(stateForNode("")).toBe("neutral");
    expect(stateForNode(null)).toBe("neutral");
    expect(stateForNode(undefined)).toBe("neutral");
    // An inherited property name is not a node.
    expect(stateForNode("toString")).toBe("neutral");
    expect(stateForNode("constructor")).toBe("neutral");
  });

  it("maps the four late states (owner, 2026-10-25) to real lessons", () => {
    for (const id of ["u9-pka", "u9-kvt-enolate", "u9-halo-base", "u11-acidity", "u11-phenoxide"]) {
      expect(pathwayNode(id), id).not.toBeNull();
      expect(stateForNode(id), id).toBe("deprotonated");
    }
    for (const id of ["u6-uv", "u12-22"]) expect(stateForNode(id), id).toBe("excitedState");
    for (const id of ["u13-fischer", "u14-strecker", "u5-sharpless"]) expect(stateForNode(id), id).toBe("enantiomers");
    expect(stateForNode("u14-zwitterion")).toBe("solvated");
    // The acid-side twin of base halogenation stays protonated.
    expect(stateForNode("u9-halo-acid")).toBe("protonated");
  });

  it("uses each topic state at least once", () => {
    const used = new Set(Object.values(NODE_STATE));
    for (const state of ["protonated", "carbocation", "radical", "resonance", "aromatic"] as const) {
      expect([...used], state).toContain(state);
    }
  });
});

describe("the preset faces", () => {
  it("are real moods, on the three states the spec names", () => {
    expect(STATE_PRESET_MOOD).toEqual({ carbocation: "stressed", radical: "excited", aromatic: "proud" });
    for (const mood of Object.values(STATE_PRESET_MOOD)) expect(BERRY_MOODS).toContain(mood);
  });
});

describe("the mind-blown beat", () => {
  it("is resonance + excited + wideEyed, all registered", () => {
    expect(MIND_BLOWN).toEqual({ state: "resonance", mood: "excited", behaviour: "wideEyed" });
    expect(BERRY_STATES).toContain(MIND_BLOWN.state);
    expect(BERRY_MOODS).toContain(MIND_BLOWN.mood);
    expect(BEHAVIOURS[MIND_BLOWN.behaviour]).toBeDefined();
  });

  it("fires only for resonance, and only before it has been seen", () => {
    expect(isFirstResonance("resonance", false)).toBe(true);
    expect(isFirstResonance("resonance", true)).toBe(false);
    for (const state of BERRY_STATES) {
      if (state === "resonance") continue;
      expect(isFirstResonance(state, false), state).toBe(false);
    }
  });

  it("plays once per device: unseen, mark, then seen", () => {
    const storage = memoryStorage();
    expect(readResonanceSeen(storage)).toBe(false);
    expect(isFirstResonance("resonance", readResonanceSeen(storage))).toBe(true);
    markResonanceSeen(storage);
    expect(storage.data.get(RESONANCE_SEEN_KEY)).toBe("1");
    expect(readResonanceSeen(storage)).toBe(true);
    expect(isFirstResonance("resonance", readResonanceSeen(storage))).toBe(false);
  });

  it("survives missing or throwing storage", () => {
    expect(readResonanceSeen(null)).toBe(false);
    expect(() => markResonanceSeen(null)).not.toThrow();
    const throwing: SaveStorage = {
      getItem: () => {
        throw new Error("blocked");
      },
      setItem: () => {
        throw new Error("blocked");
      },
      removeItem: () => undefined,
    };
    expect(readResonanceSeen(throwing)).toBe(false);
    expect(() => markResonanceSeen(throwing)).not.toThrow();
  });
});
