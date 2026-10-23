/**
 * The glossary's info icons on the cards, pinned. Owner items 14 and 27.
 *
 * 1. Links: every compound on a reaction card resolves to a glossary entry
 *    that exists; descriptions ("water", "cyclic acetal") get none; reagent
 *    shorthands resolve however the card spells them.
 * 2. The names index the cards import agrees with the full data file.
 * 3. Ring notes: the owner's EWG / EDG lecture point, per compound, from RDKit.
 * 4. Site deck products are in the glossary.
 * 5. Rendering: the icon shows only when a side is given onInfo.
 * 6. The cards never import the glossary's data statically.
 * The byte match for both generated files is glossary.test.ts's --check run (D6).
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { REACTIONS } from "../../data/reactions";
import { reactionCardFromStaged } from "../cards/reactionCard";
import type { Card } from "../cards/types";
import { glossaryLinksFor, shorthandLinkFor } from "../glossary/cardLinks";
import { GLOSSARY_DATA } from "../glossary/glossary.generated";
import { GLOSSARY_COMPOUND_NAMES } from "../glossary/glossary.index.generated";
import { glossaryEntries } from "../glossary/glossaryModel";
import { DEFAULT_PKA_SETTINGS } from "../settings/pka";
import { DefinitionSide, TermSide } from "../tabs/cards/CardSides";

const ROOT = resolve(__dirname, "../../..");
const NOW = new Date("2026-10-23T12:00:00Z");
const IDS = new Set(glossaryEntries(DEFAULT_PKA_SETTINGS).map((entry) => entry.id));
// Labels that describe a structure rather than name one (scripts/glossary.py NOT_A_NAME).
const NOT_A_NAME = new Set(["N-methyl imine", "bicyclic enone", "cyclic acetal", "water"]);

function cardFor(predicate: (labels: readonly string[]) => boolean): Card {
  const reaction = REACTIONS.find((item) => predicate([...item.reactant_labels, item.product_label]));
  if (reaction === undefined) throw new Error("no reaction matches");
  return reactionCardFromStaged(reaction, NOW);
}

function ringOf(name: string) {
  const compound = GLOSSARY_DATA.compounds.find((item) => item.name === name);
  if (compound === undefined) throw new Error(`${name} is not in the glossary`);
  return compound.ring;
}

describe("card links", () => {
  it("links every named compound on a reaction card to an entry that exists", () => {
    for (const reaction of REACTIONS) {
      const links = glossaryLinksFor(reactionCardFromStaged(reaction, NOW));
      for (const link of [...links.term, ...links.definition]) expect(IDS.has(link.entryId), link.entryId).toBe(true);
      const termNames = links.term.map((link) => link.label);
      for (const label of reaction.reactant_labels) {
        const name = label.replace(/\s*\(.*\)$/, "").trim();
        if (NOT_A_NAME.has(name)) continue;
        expect(termNames, `${reaction.id}: ${name}`).toContain(name);
      }
      const product = reaction.product_label.replace(/\s*\(.*\)$/, "").trim();
      if (!NOT_A_NAME.has(product)) expect(links.definition.map((link) => link.label), reaction.id).toEqual([product]);
    }
  });

  it("gives a description no link and a repeated name one", () => {
    const water = cardFor((labels) => labels.includes("water"));
    expect(glossaryLinksFor(water).term.some((link) => link.label === "water")).toBe(false);
    const acetal = cardFor((labels) => labels.includes("cyclic acetal"));
    const all = [...glossaryLinksFor(acetal).term, ...glossaryLinksFor(acetal).definition];
    expect(all.some((link) => link.label === "cyclic acetal")).toBe(false);
    const aldol = REACTIONS.find((item) => item.reactant_labels.filter((label) => label === "acetaldehyde").length === 2);
    expect(aldol, "a card with acetaldehyde + acetaldehyde").toBeDefined();
    const links = glossaryLinksFor(reactionCardFromStaged(aldol!, NOW)).term.filter((link) => link.label === "acetaldehyde");
    expect(links).toHaveLength(1);
  });

  it("resolves reagent shorthands however the card spells them", () => {
    expect(shorthandLinkFor("H2CrO4")?.entryId).toBe("shorthand-jones");
    expect(shorthandLinkFor("DIBALH")?.entryId).toBe("shorthand-dibal-h");
    expect(shorthandLinkFor("PCC")?.entryId).toBe("shorthand-pcc");
    expect(shorthandLinkFor("CH3MgBr")).toBeNull();
    expect(IDS.has("shorthand-jones")).toBe(true);
    expect(IDS.has("shorthand-dibal-h")).toBe(true);
  });

  it("gives a card with no reaction no links", () => {
    const plain = { ...reactionCardFromStaged(REACTIONS[0]!, NOW), reaction: undefined } as Card;
    expect(glossaryLinksFor(plain)).toEqual({ term: [], definition: [] });
  });
});

describe("names index", () => {
  it("lists exactly the compounds in the data file", () => {
    expect([...GLOSSARY_COMPOUND_NAMES]).toEqual(GLOSSARY_DATA.compounds.map((item) => item.name));
  });
});

describe("ring notes (EWG / EDG, from RDKit)", () => {
  it("names the effect of the one group on a benzene ring", () => {
    expect(ringOf("acetophenone")?.effect).toBe("meta director, deactivating");
    expect(ringOf("nitrobenzene")?.effect).toBe("meta director, deactivating");
    expect(ringOf("aniline")?.effect).toBe("o/p director, activating");
    expect(ringOf("ethylbenzene")?.effect).toBe("o/p director, activating");
    expect(ringOf("bromobenzene")?.effect).toBe("o/p director, deactivating");
  });

  it("gives no note where the group is not on the ring itself", () => {
    expect(ringOf("benzyl chloride")).toBeUndefined();
    expect(ringOf("benzene")).toBeUndefined();
  });
});

describe("site deck products", () => {
  it("are in the glossary", () => {
    const names = new Set(GLOSSARY_DATA.compounds.map((item) => item.name));
    expect(names.has("styrene")).toBe(true);
    expect(names.has("4′-chloroacetophenone")).toBe(true);
    expect(names.has("acetic anhydride")).toBe(true);
  });
});

describe("rendering", () => {
  const card = cardFor((labels) => labels.includes("acetophenone"));

  it("draws an info button per linked name when given onInfo", () => {
    const html = renderToStaticMarkup(createElement(TermSide, { card, size: "big", onInfo: () => undefined }));
    const both =
      html + renderToStaticMarkup(createElement(DefinitionSide, { card, size: "big", onInfo: () => undefined }));
    expect(both).toContain("About acetophenone");
  });

  it("draws no info button without onInfo", () => {
    const html =
      renderToStaticMarkup(createElement(TermSide, { card, size: "big" })) +
      renderToStaticMarkup(createElement(DefinitionSide, { card, size: "big" }));
    expect(html).not.toContain("ct-info");
    expect(html).not.toContain("About ");
  });
});

describe("source hygiene", () => {
  const files = [
    "src/game/glossary/cardLinks.ts",
    "src/game/glossary/slug.ts",
    "src/game/glossary/GlossaryPeek.tsx",
    "src/game/tabs/cards/MoleculeInfo.tsx",
    "src/game/test/glossaryCardLinks.test.ts",
  ];

  it("never imports the glossary data into the cards statically", () => {
    for (const path of ["src/game/glossary/cardLinks.ts", "src/game/tabs/cards/MoleculeInfo.tsx", "src/game/tabs/cards/CardSides.tsx"]) {
      const text = readFileSync(resolve(ROOT, path), "utf8");
      expect(text, path).not.toMatch(/^import[^;]*(glossary\.generated|glossaryModel|GlossaryPeek|GlossaryPage)/m);
    }
    expect(readFileSync(resolve(ROOT, "src/game/tabs/cards/MoleculeInfo.tsx"), "utf8")).toContain(
      'lazy(() => import("../../glossary/GlossaryPeek"))',
    );
  });

  it("has no em dash", () => {
    for (const path of files) expect(readFileSync(resolve(ROOT, path), "utf8"), path).not.toContain(String.fromCharCode(0x2014));
  });
});
