import { describe, expect, it } from "vitest";
import { RANGE_BOXES } from "../tabs/spectra/rangeChart.generated";
import { EDITS_KEY, RANGE_AXES, cleanRange, effective, fracOf, isFingerprint, loadEdits, packLanes, saveEdits, shiftDirection, ticks, valueAt, withEdit, withoutEdit } from "../tabs/spectra/rangeModel";
import type { RangeMode } from "../tabs/spectra/rangeTypes";

const MODES: readonly RangeMode[] = ["ir", "h1", "c13"];

describe("range chart data (scripts/gen_spectra.py --ranges)", () => {
  it("has boxes for IR, 1H and 13C, each inside its axis with a drawn example", () => {
    for (const m of MODES) expect(RANGE_BOXES.filter((b) => b.mode === m).length).toBeGreaterThanOrEqual(6);
    expect(new Set(RANGE_BOXES.map((b) => b.id)).size).toBe(RANGE_BOXES.length);
    for (const b of RANGE_BOXES) {
      const ax = RANGE_AXES[b.mode];
      expect(b.hi).toBeGreaterThan(b.lo);
      expect(b.hi).toBeLessThanOrEqual(ax.max);
      expect(b.lo).toBeGreaterThanOrEqual(ax.min);
      expect(b.example.svg.startsWith("<svg")).toBe(true);
      expect(b.example.svg).toContain("var(--sp-hl)");
      expect(b.why.length).toBeGreaterThan(30);
      expect(b.represents.length).toBeGreaterThan(5);
      for (const s of b.shifts) {
        expect(s.hi).toBeGreaterThan(s.lo);
        expect(s.why.length).toBeGreaterThan(20);
        // A shift moves the range: its centre is not the box's centre.
        expect(Math.abs((s.hi + s.lo) / 2 - (b.hi + b.lo) / 2)).toBeGreaterThan(0);
      }
      if (b.example.estimate !== undefined) {
        const pad = 0.05 * (b.hi - b.lo);
        expect(b.example.estimate).toBeGreaterThanOrEqual(b.lo - pad);
        expect(b.example.estimate).toBeLessThanOrEqual(b.hi + pad);
      }
    }
  });
  it("keeps the owner-approved IR numbers", () => {
    const by = (id: string) => RANGE_BOXES.find((b) => b.id === id)!;
    expect([by("ir-co").hi, by("ir-co").lo]).toEqual([1720, 1690]);
    expect(by("ir-sp2-ch").lo).toBe(3000);
    expect(by("ir-sp3-ch").hi).toBe(3000);
    expect(by("ir-oh").shape).toBe("broad");
    expect(by("ir-nh").shape).toBe("broad");
    const kinds = by("ir-co").shifts.map((s) => s.kind);
    expect(kinds).toEqual(expect.arrayContaining(["conj", "ewg", "edg", "strain"]));
    // Conjugation lowers C=O, an ester O raises it.
    expect(shiftDirection("ir", by("ir-co"), by("ir-co").shifts.find((s) => s.kind === "conj")!)).toBe("Lower wavenumber");
    expect(shiftDirection("ir", by("ir-co"), by("ir-co").shifts.find((s) => s.kind === "ewg")!)).toBe("Higher wavenumber");
  });
  it("greys the fingerprint region only in IR", () => {
    expect(RANGE_BOXES.filter((b) => isFingerprint(b)).map((b) => b.id)).toEqual(expect.arrayContaining(["ir-c-o", "ir-c-x"]));
    expect(RANGE_BOXES.some((b) => b.mode !== "ir" && isFingerprint(b))).toBe(false);
    expect(isFingerprint({ mode: "ir", hi: 1720 })).toBe(false);
  });
});

describe("axis and lanes", () => {
  it("runs high to low", () => {
    expect(fracOf("ir", 4000)).toBe(0);
    expect(fracOf("ir", 500)).toBe(1);
    expect(valueAt("h1", fracOf("h1", 7.3))).toBeCloseTo(7.3);
    expect(ticks("h1")[0]).toBe(13);
    expect(ticks("ir").at(-1)).toBe(500);
  });
  it("never puts two overlapping items in one lane", () => {
    for (const m of MODES) {
      const boxes = RANGE_BOXES.filter((b) => b.mode === m);
      const card = 0.1;
      const lanes = packLanes(boxes, m, card);
      expect(lanes.size).toBe(boxes.length);
      const span = (b: (typeof boxes)[number]) => {
        const l = fracOf(m, b.hi);
        const r = fracOf(m, b.lo);
        const c = Math.min(Math.max((l + r) / 2, card / 2), 1 - card / 2);
        return [Math.min(l, c - card / 2), Math.max(r, c + card / 2)];
      };
      for (const a of boxes)
        for (const b of boxes) {
          if (a.id >= b.id || lanes.get(a.id) !== lanes.get(b.id)) continue;
          const [al, ar] = span(a);
          const [bl, br] = span(b);
          expect(ar <= bl || br <= al).toBe(true);
        }
    }
  });
});

describe("student edits", () => {
  const box = RANGE_BOXES.find((b) => b.id === "ir-co")!;
  it("snaps, orders and clamps a typed range", () => {
    expect(cleanRange("ir", 1600, 1704)).toEqual({ hi: 1700, lo: 1600 });
    expect(cleanRange("ir", 5000, 4500)).toEqual({ hi: 4000, lo: 3980 });
    expect(cleanRange("h1", 2.04, 2.05)).toEqual({ hi: 2.2, lo: 2 });
  });
  it("saves per device, survives bad storage and resets", () => {
    const store = new Map<string, string>();
    const storage = { getItem: (k: string) => store.get(k) ?? null, setItem: (k: string, v: string) => void store.set(k, v) };
    let edits = withEdit({}, box, { hi: 1730, lo: 1680 });
    expect(effective(box, edits)).toEqual({ hi: 1730, lo: 1680, edited: true });
    saveEdits(storage, edits);
    expect(loadEdits(storage)).toEqual({ "ir-co": { hi: 1730, lo: 1680 } });
    edits = withoutEdit(edits, box.id);
    expect(effective(box, edits).edited).toBe(false);
    expect(withEdit({}, box, { hi: box.hi, lo: box.lo })).toEqual({});
    store.set(EDITS_KEY, "{not json");
    expect(loadEdits(storage)).toEqual({});
    store.set(EDITS_KEY, JSON.stringify({ x: { hi: 1, lo: 5 }, y: "no" }));
    expect(loadEdits(storage)).toEqual({});
    const throwing = { getItem: () => { throw new Error("blocked"); }, setItem: () => { throw new Error("blocked"); } };
    expect(loadEdits(throwing)).toEqual({});
    expect(() => saveEdits(throwing, edits)).not.toThrow();
  });
});
