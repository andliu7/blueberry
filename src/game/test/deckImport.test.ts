/**
 * Reading a deck a student already owns.
 *
 * The owner has a real DAT Anki deck, so these tests are written against what
 * Anki actually emits rather than against a tidy CSV: tab separated by
 * default, no header row, HTML inside the fields, and a note id column only
 * when the export was configured to include one. Each of those is a case here.
 *
 * The parser must also never throw. A file chosen by a student is untrusted
 * input, and one broken line has to cost that line and nothing else.
 */

import { describe, expect, it } from "vitest";

import {
  columnsFrom,
  guessSeparator,
  importCsv,
  importIdNote,
  importSummary,
  looksLikeHeader,
  parseDelimited,
  stripHtml,
} from "../cards/ui/importCsv";
import { deckNameFromFilename, readDeckFile } from "../cards/ui/importFile";

const AT = new Date("2026-08-27T09:00:00.000Z");

describe("the character level parser", () => {
  it("splits plain rows", () => {
    expect(parseDelimited("a,b\nc,d", ",")).toEqual([
      ["a", "b"],
      ["c", "d"],
    ]);
  });

  it("keeps a comma that is inside quotes", () => {
    expect(parseDelimited('"2,3-dibromobutane",meso', ",")).toEqual([["2,3-dibromobutane", "meso"]]);
  });

  it("reads a doubled quote as one quote", () => {
    expect(parseDelimited('"say ""no""",x', ",")).toEqual([['say "no"', "x"]]);
  });

  it("keeps a newline that is inside quotes", () => {
    expect(parseDelimited('"line one\nline two",x', ",")).toEqual([["line one\nline two", "x"]]);
  });

  it("handles CRLF, LF and a trailing newline the same way", () => {
    expect(parseDelimited("a,b\r\nc,d\r\n", ",")).toEqual([
      ["a", "b"],
      ["c", "d"],
    ]);
  });

  it("returns nothing for an empty file rather than one empty row", () => {
    expect(parseDelimited("", ",")).toEqual([]);
  });

  it("splits on tabs when told to", () => {
    expect(parseDelimited("a\tb", "\t")).toEqual([["a", "b"]]);
  });
});

describe("guessing the separator", () => {
  it("picks the tab an Anki export uses", () => {
    expect(guessSeparator("front\tback\tags\nq\ta\tt")).toBe("\t");
  });

  it("picks the comma a spreadsheet uses", () => {
    expect(guessSeparator("front,back\nq,a")).toBe(",");
  });

  it("picks the semicolon a European spreadsheet uses", () => {
    expect(guessSeparator("front;back;why\nq;a;w")).toBe(";");
  });

  it("falls back to a comma when there is nothing to count", () => {
    expect(guessSeparator("single")).toBe(",");
  });
});

describe("columns", () => {
  it("recognises a header and matches by name, whatever the order", () => {
    const header = ["Tags", "Back", "Front"];
    expect(looksLikeHeader(header)).toBe(true);
    expect(columnsFrom(header)).toEqual({ front: 2, back: 1, why: null, tags: 0, id: null });
  });

  it("does not mistake a card for a header", () => {
    expect(looksLikeHeader(["What is an enolate?", "The conjugate base of a ketone"])).toBe(false);
  });
});

describe("html in a field", () => {
  it("turns a break into a line break and drops the rest of the markup", () => {
    expect(stripHtml("first<br>second")).toBe("first\nsecond");
    expect(stripHtml('<div style="color:red">bold <b>bit</b></div>')).toBe("bold bit");
  });

  it("unescapes the entities Anki writes", () => {
    expect(stripHtml("A &amp; B &lt;C&gt; &quot;D&quot;")).toBe('A & B <C> "D"');
    expect(stripHtml("a&nbsp;b")).toBe("a b");
  });
});

describe("importing", () => {
  it("reads a headerless tab separated Anki export positionally", () => {
    const report = importCsv("What is an enolate?\tThe conjugate base of a ketone\t\tenolates", {
      deckName: "DAT orgo",
      importedAt: AT,
    });
    expect(report.usedHeader).toBe(false);
    expect(report.separator).toBe("\t");
    expect(report.cards).toHaveLength(1);
    expect(report.cards[0]!.front).toBe("What is an enolate?");
    expect(report.cards[0]!.tags).toEqual(["enolates"]);
  });

  it("reports a bad row and keeps the good ones", () => {
    const report = importCsv("front,back\nq1,a1\n,a2\nq3,\nq4,a4", { deckName: "d", importedAt: AT });
    expect(report.cards.map((c) => c.front)).toEqual(["q1", "q4"]);
    expect(report.skipped).toEqual([
      { line: 3, reason: "no question on this row" },
      { line: 4, reason: "no answer on this row" },
    ]);
    expect(importSummary(report)).toContain("2 rows");
  });

  it("ignores a blank line in the middle without calling it an error", () => {
    const report = importCsv("front,back\nq1,a1\n\nq2,a2", { deckName: "d", importedAt: AT });
    expect(report.cards).toHaveLength(2);
    expect(report.skipped).toEqual([]);
  });

  it("gives the same id to the same note id, so a re-import updates", () => {
    const text = "id,front,back\n1701,q,a";
    const first = importCsv(text, { deckName: "DAT orgo", importedAt: AT });
    const second = importCsv(text, { deckName: "DAT orgo", importedAt: new Date("2026-09-01T00:00:00Z") });
    expect(first.cards[0]!.id).toBe(second.cards[0]!.id);
    expect(first.cards[0]!.id).toContain("1701");
  });

  it("says out loud whether a re-import will update or duplicate", () => {
    const withIds = importCsv("id,front,back\n1,q,a", { deckName: "d", importedAt: AT });
    expect(importIdNote(withIds)).toContain("updates these cards");

    const without = importCsv("front,back\nq,a", { deckName: "d", importedAt: AT });
    expect(importIdNote(without)).toContain("second copy");
  });

  it("drops a repeated note id inside one file rather than importing it twice", () => {
    const report = importCsv("id,front,back\n7,q1,a1\n7,q2,a2", { deckName: "d", importedAt: AT });
    expect(report.cards).toHaveLength(1);
    expect(report.skipped[0]!.line).toBe(3);
  });

  it("never throws on nonsense", () => {
    expect(() => importCsv('"unterminated,quote\nand,more', { deckName: "d", importedAt: AT })).not.toThrow();
    expect(() => importCsv("", { deckName: "d", importedAt: AT })).not.toThrow();
  });
});

describe("the file router", () => {
  it("refuses an apkg and says what to do instead", () => {
    const result = readDeckFile("DAT.apkg", "", { deckName: "DAT", importedAt: AT });
    expect(result.refused).toBe(true);
    expect(result.cards).toEqual([]);
    expect(result.notes.join(" ")).toContain("Notes in Plain Text");
  });

  it("reads our own export back, and warns that the schedule starts fresh", () => {
    const payload = JSON.stringify({
      format: "blueberry.deck",
      version: 1,
      exportedAt: AT.toISOString(),
      deck: { id: "d1", title: "Enolates", kind: "lesson" },
      cards: [
        {
          card: { id: "c1", front: "q", back: "a", why: "w", tags: ["t"] },
          review: { cardId: "c1", interval: 8, ease: 2.5, dueAt: AT.toISOString(), lastRating: "good" },
        },
      ],
    });
    const result = readDeckFile("Enolates.json", payload, { deckName: "ignored", importedAt: AT });
    expect(result.cards).toHaveLength(1);
    expect(result.cards[0]!.why).toBe("w");
    expect(result.notes.join(" ")).toContain("start fresh");
    const source = result.cards[0]!.source;
    if (source.kind === "import") {
      expect(source.deckName).toBe("Enolates");
      expect(source.externalId).toBe("c1");
    }
  });

  it("rejects a json file that is not one of ours, rather than importing junk", () => {
    const result = readDeckFile("other.json", JSON.stringify({ notes: [] }), { deckName: "d", importedAt: AT });
    expect(result.refused).toBe(true);
    expect(result.message).toContain("not a Blueberry deck export");
  });

  it("says so plainly when the json is broken", () => {
    const result = readDeckFile("broken.json", "{oh no", { deckName: "d", importedAt: AT });
    expect(result.refused).toBe(true);
    expect(result.message).toContain("not valid JSON");
  });

  it("sends anything else to the delimited reader", () => {
    const result = readDeckFile("cards.txt", "front\tback\nq\ta", { deckName: "d", importedAt: AT });
    expect(result.cards).toHaveLength(1);
    expect(result.report?.separator).toBe("\t");
  });

  it("names a deck after the file it came from", () => {
    expect(deckNameFromFilename("DAT_orgo-deck.apkg")).toBe("DAT orgo deck");
    expect(deckNameFromFilename(".csv")).toBe("Imported deck");
  });
});
