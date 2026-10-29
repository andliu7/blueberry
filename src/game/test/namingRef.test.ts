/**
 * The Naming and acid-base reference (src/game/naming): the words in
 * namingContent.ts must agree with the RDKit drawings in
 * guide/nmGuide.figures.ts, the priority list must run highest first, no text
 * may carry an em dash, the cards must all draw from a real figure, and the
 * figures file must be byte for byte what scripts/guide_naming.py derives.
 */
import { spawnSync } from "node:child_process";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

import { DEFAULT_PKA_SETTINGS } from "../settings/pka";
import { NM_GUIDE } from "../guide/nmGuide";
import { ACID_BASE, ARIO, PREFIX_ONLY, PRIORITY, RULES } from "../naming/namingContent";
import { fillPka, focusMol, namingCards } from "../naming/namingModel";
import { sectionFigureOf } from "../cards/sections/sectionRoute";
import { figureRow } from "../cards/sections/SectionFigure";

const ROOT = resolve(__dirname, "../../..");

/** The order of the table, highest first (Clayden / IUPAC). */
const ORDER = ["acid", "sulfonic-acid", "anhydride", "ester", "acyl-chloride", "amide", "nitrile", "aldehyde", "ketone", "alcohol", "amine", "alkene", "alkyne"];

describe("naming reference", () => {
  it("lists the groups in priority order, each with a drawing and a name", () => {
    expect(PRIORITY.map((row) => row.group)).toEqual(ORDER);
    for (const row of [...PRIORITY, ...PREFIX_ONLY]) {
      expect(focusMol(row.key)?.name, row.key).toBeTruthy();
    }
  });

  it("starts with benzoic acid, acetophenone and phenol where the brief puts them", () => {
    const names = PRIORITY.map((row) => focusMol(row.key)?.name);
    expect(names[0]).toBe("benzoic acid");
    expect(names[PRIORITY.findIndex((row) => row.group === "ketone")]).toBe("acetophenone");
    expect(names[PRIORITY.findIndex((row) => row.group === "alcohol")]).toBe("phenol");
  });

  it("every rule and acid-base topic has a drawing", () => {
    for (const rule of RULES) expect(NM_GUIDE.examples[rule.key], rule.id).toBeDefined();
    for (const topic of [...ACID_BASE, ...ARIO]) expect(NM_GUIDE.examples[topic.key], topic.key).toBeDefined();
  });

  it("covers ring endings, multipliers, tie-breakers and N-substituents with derived names", () => {
    const names = RULES.map((rule) => focusMol(rule.key)?.name);
    for (const want of [
      "cyclohexanecarboxylic acid",
      "cyclohexanecarbaldehyde",
      "cyclohexanecarbonitrile",
      "propane-1,2,3-triol",
      "2,4,6-tribromophenol",
      "1,2,4-trimethylbenzene",
      "1-bromo-3-chlorobenzene",
      "N-methylbenzamide",
      "N,N-dimethylaniline",
      "N-ethyl-N-methylpropan-1-amine",
    ])
      expect(names, want).toContain(want);
  });

  it("explains the pKa numbers with all four ARIO factors, and phenoxide delocalisation", () => {
    expect(ARIO.map((t) => t.title.slice(0, 1))).toEqual(expect.arrayContaining(["A", "R", "I", "O"]));
    const text = [...ACID_BASE, ...ARIO].map((t) => t.text).join(" ");
    expect(text).toMatch(/delocalis/);
    expect(text).toMatch(/s character/);
    for (const t of ARIO) expect(namingCards(DEFAULT_PKA_SETTINGS).some((c) => c.id === `nm:ario:${t.key}`), t.key).toBe(true);
  });

  it("fills every pKa slot from the table and leaves none open", () => {
    for (const topic of ACID_BASE) {
      const text = fillPka(topic.text, DEFAULT_PKA_SETTINGS);
      expect(text, topic.key).not.toMatch(/\{(pka|diff):/);
    }
    expect(fillPka("{pka:carboxylic_acid} {pka:water}", DEFAULT_PKA_SETTINGS)).toBe("5 16");
  });

  it("builds cards that draw a real figure row, with unique ids and no em dash", () => {
    const cards = namingCards(DEFAULT_PKA_SETTINGS);
    expect(new Set(cards.map((card) => card.id)).size).toBe(cards.length);
    expect(cards.length).toBeGreaterThan(30);
    for (const card of cards) {
      expect(`${card.front}${card.back}${card.why}`, card.id).not.toContain("\u2014");
      const fig = sectionFigureOf(card);
      if (fig !== null) {
        expect(fig.unitId).toBe("nm");
        expect(figureRow(NM_GUIDE, fig.lesson, fig.row), card.id).not.toBeNull();
      }
    }
  });

  it("matches what scripts/guide_naming.py derives, byte for byte", () => {
    const run = spawnSync("python", ["scripts/guide_naming.py", "--check"], { cwd: ROOT, encoding: "utf8", timeout: 150_000 });
    expect(run.status, `${run.stdout}\n${run.stderr}`).toBe(0);
  }, 160_000);
});
