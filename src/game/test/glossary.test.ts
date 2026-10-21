/**
 * The glossary (src/game/glossary), pinned. Owner items 14 and 27.
 *
 * 1. RDKit: the data file is exactly what scripts/glossary.py derives (D6:
 *    a hand edit, a card with an unexplained compound, a name part RDKit does
 *    not find in its structure, or a reference line left unfiled fails here).
 * 2. Coverage: every compound named on the cards and the five the owner named
 *    in item 14 (benzyl chloride is on no card yet), every pKa rung, every
 *    curriculum reaction and the owner's list of shorthands are in it; each of
 *    the ten functional group families has reactions.
 * 3. The pKa numbers are the student's own table, read through settings/pka.
 * 4. Search and filters, the personal definition hook, the route and its title.
 * 5. It renders, and its controls are at least 44px.
 */
import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { PKA_TABLE, REACTIONS as CURRICULUM_REACTIONS } from "@blueberry/curriculum";
import { titleForRoute } from "../../lib/useDocumentTitle";
import { REACTIONS as CARD_REACTIONS } from "../../data/reactions";
import { hrefForGlossary, parseHash } from "../app/routes";
import { DEFAULT_PKA_SETTINGS, TEXTBOOK_PRESET_ID } from "../settings/pka";
import GlossaryPage from "../glossary/GlossaryPage";
import { GLOSSARY_DATA } from "../glossary/glossary.generated";
import { FAMILY_OF_CLASS, filterEntries, glossaryEntries, type GlossaryEntry } from "../glossary/glossaryModel";
import type { FamilyId } from "../glossary/types";

const ROOT = resolve(__dirname, "../../..");
const ENTRIES = glossaryEntries(DEFAULT_PKA_SETTINGS);

function compoundName(entry: GlossaryEntry): string {
  return entry.kind === "compound" ? entry.compound.name : "";
}

function find(query: string, section: GlossaryEntry["section"] | "all" = "all", family: FamilyId | null = null) {
  return filterEntries(ENTRIES, { query, section, family });
}

describe("glossary data is derived by RDKit", () => {
  it("matches what scripts/glossary.py derives, byte for byte", () => {
    const run = spawnSync("python", ["scripts/glossary.py", "--check"], {
      cwd: ROOT,
      encoding: "utf8",
      timeout: 120_000,
      env: { ...process.env, PYTHONIOENCODING: "utf-8" },
    });
    expect(run.status, `${run.stdout}\n${run.stderr}`).toBe(0);
  }, 130_000);

  it("draws every shorthand, compound, pKa example and ring", () => {
    const figures = [
      ...GLOSSARY_DATA.shorthands.map((item) => item.figure),
      ...GLOSSARY_DATA.compounds.map((item) => item.figure),
      ...Object.values(GLOSSARY_DATA.pka).map((item) => item.figure),
      ...GLOSSARY_DATA.substituents.map((item) => item.figure),
    ];
    for (const figure of figures) {
      expect(figure.w).toBeGreaterThan(0);
      expect(figure.h).toBeGreaterThan(0);
    }
  });
});

describe("glossary coverage", () => {
  it("names every compound on the cards", () => {
    const named = new Set(GLOSSARY_DATA.compounds.map((item) => item.name));
    // Labels that describe a structure rather than name one (scripts/glossary.py NOT_A_NAME).
    const notNames = new Set(["N-methyl imine", "bicyclic enone", "cyclic acetal", "water"]);
    const labels = CARD_REACTIONS.flatMap((reaction) => [...reaction.reactant_labels, reaction.product_label]).map((label) =>
      label.replace(/\s*\(.*\)$/, "").trim(),
    );
    for (const label of labels) {
      if (notNames.has(label)) continue;
      expect(named.has(label), label).toBe(true);
    }
  });

  it("explains every compound with at least one name part", () => {
    for (const compound of GLOSSARY_DATA.compounds) {
      expect(compound.parts.length, compound.name).toBeGreaterThan(0);
      for (const key of compound.parts) expect(GLOSSARY_DATA.parts[key], `${compound.name}: ${key}`).toBeDefined();
    }
  });

  it("carries the owner's examples and the shorthands he listed", () => {
    // All five names from owner item 14 (STATUS.md, Wave 4), card or not.
    for (const name of ["acetophenone", "benzoic acid", "benzyl chloride", "methyl benzoate", "buta-1,3-diene"]) {
      expect(find(name, "names").some((entry) => entry.id === `name-${name.replace(/[^a-z0-9]+/g, "-")}`), name).toBe(true);
    }
    const shorts = new Set(GLOSSARY_DATA.shorthands.map((item) => item.short));
    for (const short of ["DMSO", "THF", "tBu", "DMS", "Py", "Ph", "Me", "Et", "Ts", "Ms", "PCC", "PDC", "DMP", "Jones", "mCPBA", "LDA", "NBS", "DIBAL-H", "NaBH4", "LiAlH4"]) {
      expect(shorts.has(short), short).toBe(true);
    }
    const jones = GLOSSARY_DATA.shorthands.find((item) => item.short === "Jones")!;
    expect(jones.aliases).toContain("H2CrO4");
  });

  it("explains benzyl chloride as benzyl plus chloride", () => {
    const compound = GLOSSARY_DATA.compounds.find((item) => item.name === "benzyl chloride")!;
    expect(compound.smiles).toBe("ClCc1ccccc1");
    expect(compound.parts).toEqual(["benzyl", "chloride"]);
    expect(compound.family).toBe("haloalkanes");
  });

  it("files a group on a benzene ring the way the curriculum does", () => {
    // FAMILY_OF_CLASS files aryl amine and arenediazonium salt under aromatics,
    // so the matching compounds must sit there too, next to their reactions.
    expect(FAMILY_OF_CLASS["aryl amine"]).toBe("aromatics");
    expect(FAMILY_OF_CLASS["arenediazonium salt"]).toBe("aromatics");
    const aromatic = new Set(find("", "names", "aromatics").map(compoundName));
    for (const name of ["aniline", "benzenediazonium ion", "benzoic acid", "acetophenone"]) {
      expect(aromatic.has(name), name).toBe(true);
    }
    // A CH2 between the ring and the group keeps it in the group's family.
    const amines = new Set(find("", "names", "amines").map(compoundName));
    expect(amines.has("benzylamine")).toBe(true);
  });

  it("has one drawn example per pKa rung", () => {
    expect(Object.keys(GLOSSARY_DATA.pka).sort()).toEqual(Object.keys(PKA_TABLE).sort());
    expect(find("", "pka")).toHaveLength(Object.keys(PKA_TABLE).length);
  });

  it("files every curriculum reaction and every reference line with reagents", () => {
    const reactions = find("", "reactions");
    for (const reaction of CURRICULUM_REACTIONS) {
      expect(reactions.some((entry) => entry.kind === "reaction" && entry.source === "curriculum" && entry.title === reaction.name), reaction.id).toBe(true);
    }
    const filed = GLOSSARY_DATA.reference.filter((line) => line.families.length > 0);
    expect(reactions.filter((entry) => entry.kind === "reaction" && entry.source === "reference")).toHaveLength(filed.length);
  });

  it("gives each of the ten families a way in or out", () => {
    expect(GLOSSARY_DATA.families).toHaveLength(10);
    for (const family of GLOSSARY_DATA.families) {
      expect(find("", "reactions", family).length, family).toBeGreaterThan(0);
    }
  });

  it("gives every entry a unique id", () => {
    const ids = ENTRIES.map((entry) => entry.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
});

describe("glossary pKa numbers are the student's own table", () => {
  it("follows the chosen preset", () => {
    const course = glossaryEntries(DEFAULT_PKA_SETTINGS).find((entry) => entry.id === "pka-carboxylic-acid");
    const book = glossaryEntries({ presetId: TEXTBOOK_PRESET_ID, overrides: {} }).find((entry) => entry.id === "pka-carboxylic-acid");
    expect(course?.kind === "pka" && course.rung.value).toBe(5);
    expect(book?.kind === "pka" && book.rung.value).toBe(4.8);
  });

  it("lists the ladder most acidic first", () => {
    const values = find("", "pka").map((entry) => (entry.kind === "pka" ? entry.rung.value : NaN));
    expect(values).toEqual([...values].sort((a, b) => a - b));
  });
});

describe("glossary search and filters", () => {
  it("finds a shorthand by its letters, and a compound by its name", () => {
    expect(find("pcc").some((entry) => entry.id === "shorthand-pcc")).toBe(true);
    expect(find("acetophenone").some((entry) => entry.id === "name-acetophenone")).toBe(true);
  });

  it("narrows on every word of the query", () => {
    const both = find("ketone acetophenone");
    expect(both.length).toBeGreaterThan(0);
    expect(both.length).toBeLessThan(find("ketone").length);
    expect(find("zzzz-not-a-word")).toHaveLength(0);
  });

  it("filters by section", () => {
    expect(find("", "shorthands").every((entry) => entry.kind === "shorthand")).toBe(true);
  });
});

describe("personal definitions: the hook, not the feature", () => {
  it("merges a student's saved definition as theirs, first", () => {
    const entries = glossaryEntries(DEFAULT_PKA_SETTINGS, [
      { id: "abc", term: "Enolate", definition: "My words", savedAt: "2026-10-21T00:00:00Z" },
    ]);
    expect(entries[0]).toMatchObject({ kind: "personal", section: "mine", origin: "student" });
    expect(ENTRIES.every((entry) => entry.origin === "blueberry")).toBe(true);
  });
});

describe("glossary route", () => {
  it("parses and builds its hash", () => {
    expect(parseHash(hrefForGlossary())).toEqual({ kind: "glossary", entry: null });
    expect(parseHash(hrefForGlossary("name-acetophenone"))).toEqual({ kind: "glossary", entry: "name-acetophenone" });
    expect(hrefForGlossary()).toBe("#/app/glossary");
  });

  it("titles the page", () => {
    expect(titleForRoute("app/glossary")).toBe("blueberry · Glossary");
    expect(titleForRoute("app/glossary/name-acetophenone")).toBe("blueberry · Glossary");
  });
});

describe("glossary page", () => {
  const html = renderToStaticMarkup(createElement(GlossaryPage, { entry: null, reducedMotion: true }));

  it("renders the search, the chips and the drawings", () => {
    expect(html).toContain("Glossary");
    expect(html).toContain('type="search"');
    expect(html).toContain("Shorthands");
    expect(html).toContain("acetophenone");
    expect(html).toContain("<svg");
    // No personal definitions yet, so no Mine chip.
    expect(html).not.toContain(">Mine");
  });

  it("keeps every control at least 44px and has a reduced motion branch", () => {
    const css = readFileSync(resolve(ROOT, "src/game/glossary/glossary.css"), "utf8");
    expect(css).toMatch(/\.gl-chip \{[^}]*min-height: 44px/);
    expect(css).toMatch(/\.gl-back \{[^}]*width: 44px;[^}]*height: 44px/);
    expect(css).toMatch(/min-height: 48px/);
    expect(css).toContain('html[data-motion="reduced"]');
  });

  it("uses no em dash", () => {
    for (const file of ["GlossaryPage.tsx", "glossaryModel.ts", "types.ts", "glossary.css", "glossary.generated.ts"]) {
      expect(readFileSync(resolve(ROOT, "src/game/glossary", file), "utf8"), file).not.toContain("—");
    }
  });
});
