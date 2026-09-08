/**
 * Getting a deck out of the app, and getting it back in.
 *
 * The round trip is the test that matters: a CSV we write, parsed by the
 * parser we ship, has to produce the cards we started with. Chemistry copy is
 * full of commas ("2,3-dibromobutane") and quotes, and a naive writer plus a
 * naive reader agree with each other perfectly while both being wrong. This
 * runs the real writer into the real reader on exactly that content.
 */

import { describe, expect, it } from "vitest";

import type { Card, DeckSnapshot } from "../cards/types";
import {
  CSV_HEADER,
  DECK_EXPORT_FORMAT,
  csvField,
  csvTags,
  deckExport,
  safeFilename,
  toCsv,
  toJson,
} from "../cards/ui/exportDeck";
import { importCsv, parseDelimited } from "../cards/ui/importCsv";

const AWKWARD: Card = {
  id: "c1",
  front: 'Br2 adds to cis-2-butene. What is the "major" product?',
  back: "The racemic 2,3-dibromobutane pair, not the meso compound.",
  why: "Anti addition across the bromonium ion, so the two bromines land on opposite faces.",
  tags: ["stereochemistry", "anti addition"],
  source: { kind: "lesson", lessonId: "l1", beatId: "b1" },
};

const PLAIN: Card = {
  id: "c2",
  front: "Which is more acidic?",
  back: "The carboxylic acid.",
  why: "The conjugate base is delocalised over two oxygens.",
  tags: ["acidity"],
  source: { kind: "lesson", lessonId: "l1", beatId: "b2" },
};

describe("csv quoting", () => {
  it("quotes only what needs quoting, and doubles an inner quote", () => {
    expect(csvField("plain")).toBe("plain");
    expect(csvField("2,3-dibromobutane")).toBe('"2,3-dibromobutane"');
    expect(csvField('say "no"')).toBe('"say ""no"""');
    expect(csvField("line\nbreak")).toBe('"line\nbreak"');
  });

  it("makes tags safe for Anki's space separated tag field", () => {
    expect(csvTags(["anti addition", "sn2"])).toBe("anti_addition sn2");
  });
});

describe("csv round trip", () => {
  const csv = toCsv([AWKWARD, PLAIN]);

  it("writes a header naming every column", () => {
    expect(csv.split("\r\n")[0]).toBe(CSV_HEADER.join(","));
  });

  it("survives commas, quotes and newlines through our own parser", () => {
    const rows = parseDelimited(csv, ",");
    expect(rows).toHaveLength(3); // header plus two cards
    expect(rows[1]![1]).toBe(AWKWARD.front);
    expect(rows[1]![2]).toBe(AWKWARD.back);
    expect(rows[1]![3]).toBe(AWKWARD.why);
  });

  it("reimports as the same questions and answers", () => {
    const report = importCsv(csv, { deckName: "Round trip", importedAt: new Date("2026-08-27T00:00:00Z") });
    expect(report.usedHeader).toBe(true);
    expect(report.skipped).toEqual([]);
    expect(report.cards.map((c) => c.front)).toEqual([AWKWARD.front, PLAIN.front]);
    expect(report.cards.map((c) => c.back)).toEqual([AWKWARD.back, PLAIN.back]);
    expect(report.cards[0]!.tags).toEqual(["stereochemistry", "anti_addition"]);
  });

  it("carries the id, so a second import updates rather than duplicates", () => {
    const now = new Date("2026-08-27T00:00:00Z");
    const first = importCsv(csv, { deckName: "Round trip", importedAt: now });
    const second = importCsv(csv, { deckName: "Round trip", importedAt: now });
    expect(first.cards.map((c) => c.id)).toEqual(second.cards.map((c) => c.id));
    const source = first.cards[0]!.source;
    expect(source.kind).toBe("import");
    if (source.kind === "import") expect(source.externalId).toBe("c1");
  });
});

describe("the json export", () => {
  const snapshot: DeckSnapshot = {
    cards: { c1: AWKWARD, c2: PLAIN },
    decks: { d1: { id: "d1", title: "Alkene additions", kind: "lesson", cardIds: ["c1", "c2"] } },
    review: {
      c1: { cardId: "c1", interval: 8, ease: 2.5, dueAt: "2026-09-04T00:00:00.000Z", lastRating: "good" },
    },
    pendingRecos: [],
  };

  it("says what it is and what version it is, first", () => {
    const payload = deckExport(snapshot, "d1", new Date("2026-08-27T12:00:00Z"))!;
    expect(payload.format).toBe(DECK_EXPORT_FORMAT);
    expect(payload.version).toBe(1);
    expect(payload.exportedAt).toBe("2026-08-27T12:00:00.000Z");
    expect(payload.deck.title).toBe("Alkene additions");
  });

  it("carries the review state where there is one, and omits it where there is not", () => {
    const payload = deckExport(snapshot, "d1", new Date("2026-08-27T12:00:00Z"))!;
    expect(payload.cards).toHaveLength(2);
    expect(payload.cards[0]!.review?.interval).toBe(8);
    expect(payload.cards[1]!.review).toBeUndefined();
  });

  it("is valid json a person can read", () => {
    const payload = deckExport(snapshot, "d1", new Date("2026-08-27T12:00:00Z"))!;
    const text = toJson(payload);
    expect(text).toContain("\n  ");
    expect(JSON.parse(text).cards).toHaveLength(2);
  });

  it("returns null for a deck that is not there, rather than an empty file", () => {
    expect(deckExport(snapshot, "nope", new Date())).toBeNull();
  });
});

describe("filenames", () => {
  it("keeps words and drops what a filesystem would refuse", () => {
    expect(safeFilename("Alkene additions", "csv")).toBe("Alkene-additions.csv");
    expect(safeFilename('SN2 / SN1: which "wins"?', "json")).toBe("SN2-SN1-which-wins.json");
  });

  it("falls back rather than producing a file called .csv", () => {
    expect(safeFilename("///", "csv")).toBe("blueberry-deck.csv");
  });
});
