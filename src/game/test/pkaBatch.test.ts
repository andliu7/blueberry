/**
 * The store's batch write for a pasted sheet (STATUS C2): one commit per
 * paste, refused values reported and never stored, and the save time kept
 * under its own key so the settings JSON keeps its shape.
 */

import { describe, expect, it } from "vitest";
import {
  PKA_SAVED_AT_KEY,
  PKA_SETTINGS_KEY,
  createPkaSettings,
  type SettingsStorage,
} from "../settings/pka";

function mapStorage(): SettingsStorage & { map: Map<string, string> } {
  const map = new Map<string, string>();
  return {
    map,
    getItem: (key) => map.get(key) ?? null,
    setItem: (key, value) => {
      map.set(key, value);
    },
  };
}

describe("setOverrides", () => {
  it("commits a whole batch with one listener call", () => {
    const store = createPkaSettings(mapStorage());
    let calls = 0;
    store.subscribe(() => {
      calls += 1;
    });
    const refused = store.setOverrides({ water: 15.7, carboxylic_acid: 4.76, phenol: 9.9, alcohol: 15.5 });
    expect(refused).toEqual([]);
    expect(calls).toBe(1);
    expect(store.getSnapshot().overrides).toEqual({ water: 15.7, carboxylic_acid: 4.76, phenol: 9.9, alcohol: 15.5 });
  });

  it("reports refused values and stores none of them", () => {
    const store = createPkaSettings(mapStorage());
    const refused = store.setOverrides({ water: 157, phenol: Number.NaN, alcohol: 16.5 });
    expect([...refused].sort()).toEqual(["phenol", "water"]);
    expect(store.getSnapshot().overrides).toEqual({ alcohol: 16.5 });
  });

  it("does not commit when nothing changes", () => {
    const store = createPkaSettings(mapStorage());
    store.setOverrides({ water: 15.7 });
    let calls = 0;
    store.subscribe(() => {
      calls += 1;
    });
    store.setOverrides({ water: 15.7 });
    store.setOverrides({});
    expect(calls).toBe(0);
  });

  it("survives a reload through the same storage", () => {
    const storage = mapStorage();
    createPkaSettings(storage).setOverrides({ water: 15.7, hydronium: -1.7 });
    expect(createPkaSettings(storage).getSnapshot().overrides).toEqual({ water: 15.7, hydronium: -1.7 });
  });

  it("records the save time under its own key and leaves the settings JSON shape alone", () => {
    const storage = mapStorage();
    const store = createPkaSettings(storage);
    expect(store.savedAt()).toBe(0);
    store.setOverrides({ water: 15.7 });
    expect(store.savedAt()).toBeGreaterThan(0);
    expect(Number(storage.map.get(PKA_SAVED_AT_KEY))).toBe(store.savedAt());
    expect(Object.keys(JSON.parse(storage.map.get(PKA_SETTINGS_KEY) ?? "{}")).sort()).toEqual(["overrides", "presetId"]);
  });
});

describe("replaceAll", () => {
  it("replaces preset and overrides in one commit, sanitised, at the given time", () => {
    const storage = mapStorage();
    const store = createPkaSettings(storage);
    store.setOverrides({ water: 15.7 });
    let calls = 0;
    store.subscribe(() => {
      calls += 1;
    });
    store.replaceAll({ presetId: "textbook", overrides: { phenol: 9.95, not_a_rung: 3, alcohol: 900 } }, 1234);
    expect(calls).toBe(1);
    expect(store.getSnapshot()).toEqual({ presetId: "textbook", overrides: { phenol: 9.95 } });
    expect(store.savedAt()).toBe(1234);
  });
});
