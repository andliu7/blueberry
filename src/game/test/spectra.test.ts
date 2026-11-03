import { describe, expect, it } from "vitest";
import { SPECTRA_COMPOUNDS } from "../tabs/spectra/spectra.generated";
import { NMR_PRODUCT_QUESTIONS } from "../tabs/spectra/nmrProducts.generated";
import { U6_NMR_PRODUCT_POOLS } from "../content/u6";
import { challengePool } from "../beats/practice/pools";
import { checkpointNodeId } from "../demo/pathwayMap";
import { C13_RANGES, fractionAtValue, h1Integral, h1Lines, valueAtFraction, H1_RANGES, IR_RANGES, douSteps, irAid, matchRanges, multipletLines, parseBadge, tickStep } from "../tabs/spectra/spectraModel";
import { REFERENCE_TOOLS, visibleTools } from "../app/ui/toolAccess";

describe("handout ranges", () => {
  it("parses badges", () => {
    expect(parseBadge("~12–11 ppm")).toEqual({ hi: 12, lo: 11 });
    expect(parseBadge("3250 cm-1")).toEqual({ hi: 3250, lo: 3250 });
    expect(parseBadge("all of it")).toBeNull();
  });
  it("reads every group from the decks", () => {
    expect(H1_RANGES.length).toBe(7);
    expect(C13_RANGES.length).toBe(4);
    expect(IR_RANGES.length).toBeGreaterThan(4);
  });
  it("matches overlapping ranges", () => {
    const hits = matchRanges("h1", 9.2, 9.8).map((r) => r.title);
    expect(hits).toContain("Aldehyde H");
    expect(matchRanges("c13", 170, 180).map((r) => r.title)).toContain("C=O carbon");
  });
});

describe("steps", () => {
  it("works the DOU out of a formula", () => {
    expect(douSteps("C4H8O")?.dou).toBe(1);
    expect(douSteps("C6H6")?.dou).toBe(4);
    expect(douSteps("C2H5Br")?.dou).toBe(0);
    expect(douSteps("hello")).toBeNull();
  });
  it("picks readable tick steps", () => {
    expect(tickStep(13.5)).toBe(2);
    expect(tickStep(3600)).toBe(500);
  });
});

describe("library coverage", () => {
  it("holds a broad set, each with a search name and a distinct structure", () => {
    expect(SPECTRA_COMPOUNDS.length).toBeGreaterThanOrEqual(120);
    expect(new Set(SPECTRA_COMPOUNDS.map((c) => c.smiles)).size).toBe(SPECTRA_COMPOUNDS.length);
    for (const c of SPECTRA_COMPOUNDS) expect(c.name.length).toBeGreaterThan(2);
  });
});

describe("generated spectra", () => {
  it("has integrations that add up to the H in the formula", () => {
    for (const c of SPECTRA_COMPOUNDS) {
      const h = Number(/H(\d*)/.exec(c.formula)?.[1] || (c.formula.includes("H") ? 1 : 0));
      expect(c.h1.reduce((s, p) => s + p.nH, 0)).toBe(h);
      expect(c.dou).toBe(douSteps(c.formula)?.dou);
    }
  });
  it("draws a triplet as 1:2:1", () => {
    const lines = multipletLines({ shift: 1, nH: 4, mult: "t", env: "", exch: false, j: 7, atoms: [] });
    expect(lines.map((l) => l.height)).toEqual([1, 2, 1]);
  });
});

describe("product questions", () => {
  it("are well formed and decided by the NMR", () => {
    expect(NMR_PRODUCT_QUESTIONS.length).toBeGreaterThanOrEqual(6);
    const answers = new Set<number>();
    for (const q of NMR_PRODUCT_QUESTIONS) {
      expect(q.options.length).toBeGreaterThanOrEqual(3);
      expect(q.answer).toBeLessThan(q.options.length);
      expect(q.options[q.answer].formula).toBe(q.product.formula);
      expect(new Set(q.options.map((o) => o.smiles)).size).toBe(q.options.length);
      expect(irAid(q.product.ir).startsWith("IR:")).toBe(true);
      answers.add(q.answer);
    }
    expect(answers.size).toBeGreaterThan(1);
  });
});

describe("tool access", () => {
  it("hides the reference tools in an assessment and only those", () => {
    const all = visibleTools(false).map((t) => t.id);
    const test = visibleTools(true).map((t) => t.id);
    expect(all).toEqual(expect.arrayContaining(["periodic", "spectra", "search", "focus"]));
    expect(test).not.toContain("spectra");
    expect(test).not.toContain("periodic");
    expect(test).toContain("focus");
    expect(REFERENCE_TOOLS.has("spectra")).toBe(true);
  });
});

describe("atom links and the simulation", () => {
  it("links every signal to real atoms that carry its H or C", () => {
    for (const c of SPECTRA_COMPOUNDS) {
      expect(c.coords.length).toBeGreaterThan(0);
      for (const p of c.h1) {
        expect(p.atoms.length).toBeGreaterThan(0);
        for (const a of p.atoms) expect(c.coords[a]).toBeDefined();
      }
      expect(c.c13.reduce((s, p) => s + p.atoms.length, 0)).toBe(c.c13.reduce((s, p) => s + p.nC, 0));
    }
  });
  it("integrates to the H count", () => {
    for (const c of SPECTRA_COMPOUNDS) {
      const total = c.h1.reduce((s, p) => s + p.nH, 0);
      expect(h1Integral(h1Lines(c.h1), -1)).toBeGreaterThan(total * 0.97);
      expect(h1Integral(h1Lines(c.h1), 14)).toBeLessThan(total * 0.03);
    }
  });
  it("calibrates a student's image both ways", () => {
    const c = { f1: 0.1, v1: 10, f2: 0.9, v2: 0 };
    expect(valueAtFraction(c, 0.5)).toBeCloseTo(5);
    expect(fractionAtValue(c, 5)).toBeCloseTo(0.5);
    expect(fractionAtValue(c, valueAtFraction(c, 0.33))).toBeCloseTo(0.33);
  });
});

describe("product questions reach students", () => {
  it("are pool entries in the Unit 6 Challenge", () => {
    const ids = challengePool(checkpointNodeId("u6")).map((e) => e.id);
    for (const e of U6_NMR_PRODUCT_POOLS["u6-nmr-product"] ?? []) expect(ids).toContain(e.id);
  });
  it("carry atom coordinates on the right option", () => {
    for (const q of NMR_PRODUCT_QUESTIONS) expect(q.options[q.answer].coords?.length).toBeGreaterThan(0);
  });
});

import { labelRows, multipletWindow, peakView } from "../tabs/spectra/spectraModel";

describe("readable default view", () => {
  it("fits the plot to the compound's own signals, inside the axis", () => {
    for (const c of SPECTRA_COMPOUNDS) {
      const v = peakView("h1", c);
      const shifts = c.h1.map((p) => p.shift);
      expect(v.left).toBeGreaterThanOrEqual(Math.max(...shifts));
      expect(v.right).toBeLessThanOrEqual(Math.min(...shifts));
      expect(v.left).toBeLessThanOrEqual(13);
      expect(v.right).toBeGreaterThanOrEqual(-0.5);
      expect(v.left - v.right).toBeGreaterThanOrEqual(3 - 1e-9);
    }
    expect(peakView("ir", SPECTRA_COMPOUNDS[0])).toEqual({ left: 4000, right: 400 });
  });
  it("expands a multiplet around its own lines", () => {
    const q = SPECTRA_COMPOUNDS[0].h1.find((p) => p.mult === "q");
    expect(q).toBeDefined();
    const w = multipletWindow(q!);
    expect(w.left - w.right).toBeLessThan(0.3);
    expect(w.left).toBeGreaterThan(q!.shift);
    expect(w.right).toBeLessThan(q!.shift);
  });
  it("alternates label rows for close neighbours", () => {
    expect(labelRows([100, 120, 400], 46)).toEqual([0, 1, 0]);
    expect(labelRows([100, 120, 140], 46)).toEqual([0, 1, 0]);
  });
});
