/**
 * noteLessonClear: the seam between a banked clear and the Pro sheet. It reads
 * and writes the schedule through storage that may be blocked, and it must
 * decide from the initial state rather than throw when it is.
 */
import { afterEach, describe, expect, it } from "vitest";
import { noteLessonClear } from "../upsell/noteLessonClear";
import { closeUpsell, upsellFlow } from "../upsell/upsellFlow";
import { UPSELL_STORAGE_KEY, loadUpsellState } from "../upsell/upsellRule";

function memoryStorage(): Storage {
  const map = new Map<string, string>();
  return {
    get length() {
      return map.size;
    },
    clear: () => map.clear(),
    getItem: (k) => map.get(k) ?? null,
    key: (i) => [...map.keys()][i] ?? null,
    removeItem: (k) => void map.delete(k),
    setItem: (k, v) => void map.set(k, String(v)),
  };
}

const throwing = {
  getItem() {
    throw new Error("blocked");
  },
  setItem() {
    throw new Error("blocked");
  },
} as unknown as Storage;

type Receipt = NonNullable<Parameters<typeof noteLessonClear>[0]["lastReceipt"]>;
function snap(streak: Partial<Receipt["streak"]> = {}): Parameters<typeof noteLessonClear>[0] {
  return { lastReceipt: { streak: { counted: true, current: 1, ...streak } } as Receipt };
}

const NOON = Date.parse("2026-10-23T16:00:00Z");

afterEach(() => closeUpsell());

describe("noteLessonClear", () => {
  it("offers the sheet on the first clear and saves the counted clear", () => {
    const storage = memoryStorage();
    noteLessonClear(snap(), storage, NOON, "");
    expect(upsellFlow.getState()).toEqual({ trigger: "lesson", firstLesson: true });
    expect(loadUpsellState(storage).clearsSinceShown).toBe(1);
    expect(storage.getItem(UPSELL_STORAGE_KEY)).not.toBeNull();
  });

  it("does not crash on storage that throws, and still decides from the initial state", () => {
    expect(() => noteLessonClear(snap(), throwing, NOON, "")).not.toThrow();
    expect(upsellFlow.getState()).toEqual({ trigger: "lesson", firstLesson: true });
  });

  it("reads a streak milestone as a streak trigger, with the day count", () => {
    const storage = memoryStorage();
    storage.setItem(
      UPSELL_STORAGE_KEY,
      JSON.stringify({ shown: 1, lastShownDay: "2026-10-01", clearsSinceShown: 1, dismissals: 0, askedToHear: false }),
    );
    noteLessonClear(snap({ current: 7, milestone: 7 }), storage, NOON, "");
    expect(upsellFlow.getState()).toEqual({ trigger: "streak", firstLesson: false, streakDays: 7 });
  });

  it("offers nothing while a measurement script is driving", () => {
    const storage = memoryStorage();
    noteLessonClear(snap(), storage, NOON, "?auto=1");
    expect(upsellFlow.getState()).toBeNull();
    expect(storage.getItem(UPSELL_STORAGE_KEY)).toBeNull();
  });
});
