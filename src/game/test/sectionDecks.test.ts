/**
 * Premade section decks (STATUS "Owner brief, 23 Oct", D2).
 *
 * Holds: the generator's output matches scripts/section_decks.py byte for
 * byte; every structure parses in RDKit and is stored canonical; every deck
 * the Cards tab lists has 8 to 20 cards; no card is empty and no unit repeats
 * a card; idea and slip cards quote their guide (whose own suite holds the
 * quote to the pool word for word); every deck is reachable from the Cards tab
 * route and from its section on the path; adopting a deck into the store is
 * idempotent and the scheduler then reviews it; a card face renders whole with
 * and without its drawing loaded.
 */
import { spawnSync } from "node:child_process";
import { resolve } from "node:path";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeAll, describe, expect, it } from "vitest";

import { parseHash } from "../app/routes";
import { createLocalDecks } from "../cards/store";
import { cardsIn } from "../cards/types";
import { figureRow } from "../cards/sections/SectionFigure";
import {
  adoptSectionDeck,
  assembleSectionDeck,
  cardFromSeed,
  deckKeyForSection,
  loadUnitCards,
  SECTION_DECK_CAP,
  SECTION_DECK_MIN,
  SECTION_UNITS,
  sectionDecksFor,
  sectionDeckSize,
  type SectionCardSeed,
} from "../cards/sections/sectionDecks";
import { parseSectionRoute, sectionDeckHref, sectionFigureOf } from "../cards/sections/sectionRoute";
import { PATHWAY_UNITS } from "../demo/pathwayMap";
import { loadUnitGuide } from "../guide";
import type { UnitGuide } from "../guide/types";
import { unitSections } from "../tabs/pathway/testOuts";
import { DefinitionSide, TermSide } from "../tabs/cards/CardSides";
import { sectionShelfModel } from "../tabs/cards/SectionDecks";

const ROOT = resolve(__dirname, "../../..");

const seeds = new Map<string, readonly SectionCardSeed[]>();
const guides = new Map<string, UnitGuide>();

beforeAll(async () => {
  for (const unitId of SECTION_UNITS) {
    seeds.set(unitId, await loadUnitCards(unitId));
    const guide = await loadUnitGuide(unitId);
    if (guide !== null) guides.set(unitId, guide);
  }
});

const allSeeds = () => [...seeds.values()].flat();

describe("the generator", () => {
  it("matches what scripts/section_decks.py derives, byte for byte", () => {
    const run = spawnSync("python", ["scripts/section_decks.py", "--check"], { cwd: ROOT, encoding: "utf8", timeout: 120_000 });
    expect(run.status, `${run.stdout}\n${run.stderr}`).toBe(0);
  }, 130_000);

  it("stores every structure as a SMILES RDKit parses, in its canonical form", () => {
    const smiles = allSeeds().flatMap((seed) => [...(seed.reactants ?? []), ...(seed.products ?? [])]);
    expect(smiles.length).toBeGreaterThan(100);
    const run = spawnSync(
      "python",
      ["-c", "import sys, json\nfrom rdkit import Chem\nbad=[]\nfor s in json.load(sys.stdin):\n    m=Chem.MolFromSmiles(s)\n    if m is None or Chem.MolToSmiles(m)!=s: bad.append(s)\nprint(json.dumps(bad))"],
      { input: JSON.stringify([...new Set(smiles)]), encoding: "utf8", timeout: 60_000 },
    );
    expect(run.status, run.stderr).toBe(0);
    expect(JSON.parse(run.stdout)).toEqual([]);
  });
});

describe("every card", () => {
  it("has a front, a back and a why", () => {
    for (const seed of allSeeds()) {
      expect(seed.front.trim(), seed.id).not.toBe("");
      expect(seed.back.trim(), seed.id).not.toBe("");
      expect(seed.why.trim(), seed.id).not.toBe("");
    }
  });

  it("has an id no other card has, in any unit", () => {
    const ids = allSeeds().map((seed) => seed.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("never repeats a front, or a reaction, inside a unit", () => {
    for (const [unitId, list] of seeds) {
      const fronts = list.map((seed) => seed.front);
      expect(new Set(fronts).size, unitId).toBe(fronts.length);
      const keys = list.filter((seed) => seed.kind === "reaction").map((seed) => `${seed.reactants!.join(".")}>${seed.front}>${seed.products!.join(".")}`);
      expect(new Set(keys).size, unitId).toBe(keys.length);
    }
  });

  it("draws a reaction card's front and back from its guide row, with the same structures", () => {
    const pairs: [string, string, string][] = [];
    for (const [unitId, list] of seeds) {
      const guide = guides.get(unitId)!;
      for (const seed of list.filter((entry) => entry.kind === "reaction")) {
        const where = sectionFigureOf(cardFromSeed(seed));
        expect(where, seed.id).not.toBeNull();
        const row = figureRow(guide, where!.lesson, where!.row);
        expect(row, seed.id).not.toBeNull();
        expect(row!.lead.length, seed.id).toBeGreaterThan(0);
        expect(row!.result.length, seed.id).toBeGreaterThan(0);
        expect(row!.lead.length, seed.id).toBe(seed.reactants!.length);
        expect(row!.result.length, seed.id).toBe(seed.products!.length);
        row!.lead.forEach((mol, at) => pairs.push([seed.id, mol.smiles, seed.reactants![at]!]));
        row!.result.forEach((mol, at) => pairs.push([seed.id, mol.smiles, seed.products![at]!]));
        expect(seed.back, seed.id).toBe(row!.result.map((mol) => mol.name).join(" + "));
      }
    }
    // The guide may write a SMILES in any form; RDKit must read the drawn one as the card's canonical one.
    const run = spawnSync(
      "python",
      ["-c", "import sys, json\nfrom rdkit import Chem\nbad=[p for p in json.load(sys.stdin) if Chem.MolToSmiles(Chem.MolFromSmiles(p[1]))!=p[2]]\nprint(json.dumps(bad))"],
      { input: JSON.stringify(pairs), encoding: "utf8", timeout: 60_000 },
    );
    expect(run.status, run.stderr).toBe(0);
    expect(JSON.parse(run.stdout)).toEqual([]);
  });

  it("quotes its guide on an idea or slip card, so the pool's own words are the why", () => {
    for (const [unitId, list] of seeds) {
      const guide = guides.get(unitId)!;
      const ideas = new Map(guide.stages.flatMap((stage) => stage.lessons).map((lesson) => [lesson.node, lesson.ideas]));
      const slips = guide.stages.flatMap((stage) => stage.mistakes);
      for (const seed of list) {
        if (seed.kind === "idea") {
          const lessonIdeas = ideas.get(seed.lesson) ?? [];
          // The front with its gap filled is the idea, word for word.
          const filled = seed.front.replace("____", seed.back);
          const idea = lessonIdeas.find((entry) => entry.quote === seed.why && entry.text.startsWith(filled.replace(/[.\s]+$/, "")));
          expect(idea, `${seed.id}: ${filled}`).toBeDefined();
        } else if (seed.kind === "slip") {
          const slip = slips.find((entry) => entry.quote === seed.why && entry.fix === seed.back);
          expect(slip, seed.id).toBeDefined();
          expect(seed.front).toBe(`Spot the slip: ${slip!.mistake}`);
        } else {
          expect(seed.why, seed.id).toBe(guide.examples[seed.lesson]!.caption);
        }
      }
    }
  });
});

describe("the decks", () => {
  it(`hold ${SECTION_DECK_MIN} to ${SECTION_DECK_CAP} cards each, and as many as the shelf says`, () => {
    let decks = 0;
    for (const unitId of SECTION_UNITS) {
      for (const ref of sectionDecksFor(unitId)) {
        const cards = assembleSectionDeck(ref, seeds.get(unitId)!);
        expect(cards.length, ref.id).toBeGreaterThanOrEqual(SECTION_DECK_MIN);
        expect(cards.length, ref.id).toBeLessThanOrEqual(SECTION_DECK_CAP);
        expect(sectionDeckSize(ref), ref.id).toBe(cards.length);
        // Every lesson of the deck is in it (round robin).
        expect(new Set(cards.map((card) => (card.source.kind === "lesson" ? card.source.lessonId : ""))), ref.id).toEqual(new Set(ref.lessons));
        decks += 1;
      }
    }
    expect(decks).toBeGreaterThan(30);
  });

  it("share no card across a unit's decks", () => {
    for (const unitId of SECTION_UNITS) {
      const ids = sectionDecksFor(unitId).flatMap((ref) => assembleSectionDeck(ref, seeds.get(unitId)!).map((card) => card.id));
      expect(new Set(ids).size, unitId).toBe(ids.length);
    }
  });

  it("cover every section of the path in Units 1 to 10", () => {
    for (const unit of PATHWAY_UNITS.filter((entry) => SECTION_UNITS.includes(entry.id))) {
      for (const section of unitSections(unit)) {
        const key = deckKeyForSection(unit.id, section.number);
        expect(key, `${unit.id} section ${section.number}`).not.toBeNull();
        const ref = sectionDecksFor(unit.id).find((entry) => entry.key === key)!;
        expect(assembleSectionDeck(ref, seeds.get(unit.id)!).length).toBeGreaterThanOrEqual(SECTION_DECK_MIN);
        for (const lesson of section.sources) if (guides.get(unit.id)!.examples[lesson] !== undefined) expect(ref.lessons, lesson).toContain(lesson);
      }
    }
  });

  it("are listed on the Cards tab shelf, every one, grouped by unit", () => {
    const shelf = sectionShelfModel();
    expect(shelf.map((unit) => unit.unitId)).toEqual(SECTION_UNITS);
    expect(shelf.flatMap((unit) => unit.decks.map((deck) => deck.ref.id))).toEqual(SECTION_UNITS.flatMap((unitId) => sectionDecksFor(unitId).map((ref) => ref.id)));
  });

  it("each open from the Cards tab route their link names", () => {
    for (const unitId of SECTION_UNITS) {
      for (const ref of sectionDecksFor(unitId)) {
        for (const mode of [undefined, "learn"]) {
          const route = parseHash(sectionDeckHref(unitId, ref.key, mode));
          expect(route.kind === "tab" && route.tab, ref.id).toBe("cards");
          const parsed = parseSectionRoute(route.kind === "tab" ? route.rest : []);
          expect(parsed, ref.id).toEqual({ unitId, key: ref.key, mode });
        }
      }
    }
  });
});

describe("adopting a deck", () => {
  it("creates one lesson deck, adds nothing the second time, and the scheduler reviews its cards", () => {
    const source = createLocalDecks({ now: () => new Date("2026-10-24T12:00:00Z") });
    const ref = sectionDecksFor("u3")[0]!;
    const cards = assembleSectionDeck(ref, seeds.get("u3")!);
    adoptSectionDeck(source, ref, cards);
    adoptSectionDeck(source, ref, cards);
    const snapshot = source.getSnapshot();
    expect(snapshot.decks[ref.id]?.kind).toBe("lesson");
    expect(cardsIn(snapshot, ref.id).map((card) => card.id)).toEqual(cards.map((card) => card.id));
    expect(Object.keys(snapshot.cards).length).toBe(cards.length);
    const first = cards[0]!;
    source.rate(first.id, "good");
    expect(source.getSnapshot().review[first.id]?.lastRating).toBe("good");
  });
});

describe("a card face", () => {
  it("renders its words before its drawing loads, and its drawing after", async () => {
    const seed = allSeeds().find((entry) => entry.kind === "reaction")!;
    const card = cardFromSeed(seed);
    const front = renderToStaticMarkup(createElement(TermSide, { card, size: "big" }));
    const back = renderToStaticMarkup(createElement(DefinitionSide, { card, size: "big" }));
    expect(front).toContain(seed.front.replace(/&/g, "&amp;").slice(0, 20));
    expect(back).toContain("ct-words");
    // The guides were loaded in beforeAll, so the drawing is drawn.
    expect(front).toContain("ug-mol__svg");
    expect(back).toContain("ug-mol__svg");
  });

  it("holds a quiet box where the drawing goes while the guide is still loading", () => {
    // A lesson id in a unit with no guide fetched: the face still renders its words.
    const card = { ...cardFromSeed(allSeeds().find((entry) => entry.kind === "reaction")!), tags: ["secfig:u99-none:0"] };
    const front = renderToStaticMarkup(createElement(TermSide, { card, size: "big" }));
    expect(front).toContain("ct-secfig--wait");
    expect(front).toContain(card.front.slice(0, 10));
  });
});
