/**
 * The scratchpad's pointer rules (beats/trace/ink.ts) and its wiring.
 *
 * ink.ts is pure, so the palm rule, the pressure width and the point thinning
 * are pinned here directly. The wiring is a TEXT CHECK ON SOURCE, for the
 * reason beatCoverage.test.ts gives: the suite runs in node with no DOM, so
 * DrawBeatView cannot be mounted and asked. It pins the three things a later
 * edit could quietly undo: the scratchpad is React.lazy, it is imported by its
 * own path and not through the trace barrel (which drags in 88 authored items),
 * and it really does read coalesced Pencil points through the shared gate.
 */

import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

import { appendPoint, createPointerGate, widthFor, type InkPoint } from "../beats/trace/ink";

const read = (rel: string): string =>
  readFileSync(fileURLToPath(new URL(rel, import.meta.url)), "utf8");

describe("createPointerGate: palm rejection", () => {
  it("accepts a touch before any pen has been seen", () => {
    const gate = createPointerGate();
    expect(gate.accept(1, "touch")).toBe(true);
  });

  it("refuses every touch once a pen has gone down, even after the pen lifts", () => {
    const gate = createPointerGate();
    expect(gate.accept(1, "pen")).toBe(true);
    expect(gate.accept(2, "touch")).toBe(false);
    gate.release(1);
    expect(gate.accept(3, "touch")).toBe(false);
    expect(gate.accept(4, "pen")).toBe(true);
  });

  it("refuses a second pointer while one is drawing, and accepts it after release", () => {
    const gate = createPointerGate();
    expect(gate.accept(1, "mouse")).toBe(true);
    expect(gate.accept(2, "mouse")).toBe(false);
    // Releasing a pointer that never held the slot changes nothing and says so.
    expect(gate.release(2)).toBe(false);
    expect(gate.accept(2, "mouse")).toBe(false);
    expect(gate.release(1)).toBe(true);
    expect(gate.accept(2, "mouse")).toBe(true);
  });
});

describe("widthFor", () => {
  it("draws a mouse and a touch at exactly the base width", () => {
    expect(widthFor("mouse", 0.5, 4)).toBe(4);
    expect(widthFor("touch", 0, 4)).toBe(4);
    expect(widthFor("touch", 1, 4)).toBe(4);
  });

  it("scales a pen by pressure inside [0.35, 1.65] times base", () => {
    expect(widthFor("pen", 0.5, 4)).toBeCloseTo(4 * (0.35 + 0.65), 10);
    expect(widthFor("pen", 0.01, 4)).toBeCloseTo(4 * 0.35 + 4 * 1.3 * 0.01, 10);
    expect(widthFor("pen", 1, 4)).toBeCloseTo(4 * 1.65, 10);
    for (const pressure of [0.001, 0.2, 0.7, 1]) {
      const width = widthFor("pen", pressure, 4);
      expect(width).toBeGreaterThanOrEqual(0.35 * 4);
      expect(width).toBeLessThanOrEqual(1.65 * 4);
    }
  });

  it("draws a pen reporting no pressure at the base width", () => {
    expect(widthFor("pen", 0, 4)).toBe(4);
  });
});

describe("appendPoint", () => {
  const at = (x: number, y: number): InkPoint => ({ x, y, w: 3 });

  it("keeps the first point", () => {
    expect(appendPoint([], at(0, 0), 2)).toEqual([at(0, 0)]);
  });

  it("drops a point closer than minGap to the last kept one", () => {
    const start = [at(0, 0)];
    expect(appendPoint(start, at(1, 1), 2)).toBe(start);
    expect(appendPoint(start, at(2, 0), 2)).toEqual([at(0, 0), at(2, 0)]);
  });
});

describe("the scratchpad is wired in, lazy, and by its own path", () => {
  const view = read("../beats/draw/DrawBeatView.tsx");
  const canvas = read("../beats/trace/ScratchpadCanvas.tsx");

  it("DrawBeatView lazy-loads ScratchpadCanvas", () => {
    expect(view).toMatch(/lazy\(\(\) => import\("\.\.\/trace\/ScratchpadCanvas"\)\)/);
  });

  it("DrawBeatView never imports the trace barrel", () => {
    expect(view).not.toMatch(/from "\.\.\/trace"/);
    expect(view).not.toMatch(/import\("\.\.\/trace"\)/);
  });

  it("ScratchpadCanvas reads coalesced points through the shared gate", () => {
    expect(canvas).toMatch(/getCoalescedEvents/);
    expect(canvas).toMatch(/createPointerGate/);
  });
});
