/**
 * Bringing an existing deck in. Read this header before trusting anything in
 * this file.
 *
 * THE REAL CASE THIS SERVES: the owner already owns a DAT Anki deck. A study
 * app that cannot read the deck a student already trusts is asking them to
 * abandon it, and nobody abandons a deck three weeks before the DAT. So import
 * is a first class origin in cards/types.ts rather than a migration script,
 * and this file is the parser behind it.
 *
 * WHAT IS BUILT: CSV, which is the format Anki itself exports from File,
 * Export, "Notes in Plain Text". That path carries the fields and the tags,
 * which is the content, and it is a text format we can parse correctly in a
 * hundred lines with no dependency.
 *
 * WHAT IS NOT BUILT, and this is stated rather than half done: `.apkg`. See
 * APKG_IMPORT_NOTE for the exact cost. The short version is that an .apkg is a
 * zipped SQLite collection, so reading it needs a ZIP reader plus a SQLite
 * engine in the browser, and the fields inside are HTML with cloze markup and
 * media references that all need rewriting before they are cards. Shipping
 * half of that means a student imports 900 cards and gets 900 fronts reading
 * `[sound:rec1.mp3]`.
 *
 * THE PARSER IS THE INTERESTING PART. It is a small state machine over
 * characters rather than `text.split(",")`, because chemistry copy is full of
 * commas: "2,3-dibromobutane" splits into two fields under the naive version,
 * and every row after it shifts by one column. RFC 4180 quoting is what the
 * quoted branch implements.
 *
 * NOTHING HERE THROWS on a bad row. A file with one broken line should import
 * the other four hundred and REPORT the one, because a student who exported
 * from a tool we have never seen needs to know which line to look at, not a
 * blank screen. `ImportReport.skipped` is that list.
 *
 * Pure: `importedAt` is passed in, no clock, no storage, no React.
 */

import type { Card } from "../types";

/* ------------------------------------------------------------------ */
/* The character level parser                                           */
/* ------------------------------------------------------------------ */

/**
 * Split CSV text into rows of fields, RFC 4180 style.
 *
 * The state machine has exactly two states, in quotes and out of quotes, and
 * the only subtle rule is that a doubled quote inside a quoted field is one
 * literal quote. CRLF and LF both end a row; a CR inside a quoted field is
 * kept, because it is data at that point.
 *
 * Separator is a parameter because Anki's own default export is TAB separated
 * and telling a student to convert their file first is a worse answer than
 * accepting both.
 */
export function parseDelimited(text: string, separator: string): readonly (readonly string[])[] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let inQuotes = false;
  let sawAnything = false;

  const endField = (): void => {
    row.push(field);
    field = "";
  };
  const endRow = (): void => {
    endField();
    rows.push(row);
    row = [];
  };

  for (let i = 0; i < text.length; i += 1) {
    const ch = text[i];
    if (ch === undefined) continue;
    sawAnything = true;

    if (inQuotes) {
      if (ch === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i += 1;
        } else {
          inQuotes = false;
        }
      } else {
        field += ch;
      }
      continue;
    }

    if (ch === '"' && field.length === 0) {
      inQuotes = true;
    } else if (ch === separator) {
      endField();
    } else if (ch === "\n") {
      endRow();
    } else if (ch === "\r") {
      // Swallowed: the \n that follows ends the row. A lone \r ends it too.
      if (text[i + 1] !== "\n") endRow();
    } else {
      field += ch;
    }
  }

  if (sawAnything && (field.length > 0 || row.length > 0)) endRow();
  return rows;
}

/**
 * Guess the separator by counting candidates on the first line.
 *
 * Boring beats clever: whichever of tab, comma and semicolon appears most on
 * the first non empty line wins, with comma breaking a tie because it is what
 * the word CSV promises. Anki exports tabs, European spreadsheets export
 * semicolons, and asking a stressed student which delimiter their file uses is
 * a question they should never have to answer.
 */
export function guessSeparator(text: string): string {
  const firstLine = text.split(/\r?\n/).find((line) => line.trim().length > 0) ?? "";
  const counts: readonly { readonly sep: string; readonly n: number }[] = [
    { sep: ",", n: (firstLine.match(/,/g) ?? []).length },
    { sep: "\t", n: (firstLine.match(/\t/g) ?? []).length },
    { sep: ";", n: (firstLine.match(/;/g) ?? []).length },
  ];
  let best = counts[0]!;
  for (const candidate of counts) {
    if (candidate.n > best.n) best = candidate;
  }
  return best.n === 0 ? "," : best.sep;
}

/* ------------------------------------------------------------------ */
/* Rows into cards                                                      */
/* ------------------------------------------------------------------ */

/**
 * Which column is which.
 *
 * Two supported shapes, and the difference is whether a header row is present.
 * With a header we match by name, which is robust to column order. Without one
 * we fall back to Anki's own positional default, front then back, because that
 * is what a raw Anki export looks like and refusing it would fail the exact
 * file this feature exists for.
 */
export interface ColumnMap {
  readonly front: number;
  readonly back: number;
  readonly why: number | null;
  readonly tags: number | null;
  readonly id: number | null;
}

const HEADER_ALIASES: Readonly<Record<keyof ColumnMap, readonly string[]>> = Object.freeze({
  front: ["front", "question", "prompt", "term", "text"],
  back: ["back", "answer", "definition", "extra"],
  why: ["why", "explanation", "notes", "note"],
  tags: ["tags", "tag"],
  id: ["id", "guid", "nid", "noteid", "note id"],
});

function indexOfHeader(header: readonly string[], names: readonly string[]): number | null {
  for (let i = 0; i < header.length; i += 1) {
    const cell = (header[i] ?? "").trim().toLowerCase();
    if (names.includes(cell)) return i;
  }
  return null;
}

/** True when the first row names its columns rather than holding a card. */
export function looksLikeHeader(row: readonly string[]): boolean {
  const front = indexOfHeader(row, HEADER_ALIASES.front);
  const back = indexOfHeader(row, HEADER_ALIASES.back);
  return front !== null && back !== null;
}

export function columnsFrom(header: readonly string[]): ColumnMap {
  return {
    front: indexOfHeader(header, HEADER_ALIASES.front) ?? 0,
    back: indexOfHeader(header, HEADER_ALIASES.back) ?? 1,
    why: indexOfHeader(header, HEADER_ALIASES.why),
    tags: indexOfHeader(header, HEADER_ALIASES.tags),
    id: indexOfHeader(header, HEADER_ALIASES.id),
  };
}

/** Anki's positional default when the file carries no header. */
export const POSITIONAL_COLUMNS: ColumnMap = Object.freeze({
  front: 0,
  back: 1,
  why: 2,
  tags: 3,
  id: null,
});

/**
 * Anki writes its fields as HTML. `<br>` is a line break, `&nbsp;` is a space,
 * and everything else in angle brackets is styling we have no use for. We
 * strip rather than render, because rendering a stranger's HTML inside our
 * page is how an imported deck becomes a script injection, and a flashcard
 * front does not need bold text badly enough to take that.
 */
export function stripHtml(value: string): string {
  return value
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/(p|div|li)>/gi, "\n")
    .replace(/<[^>]*>/g, "")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/g, "'")
    .replace(/[ \t]+\n/g, "\n")
    .trim();
}

export interface SkippedRow {
  /** One based, counting every line in the file, so it matches a text editor. */
  readonly line: number;
  readonly reason: string;
}

export interface ImportReport {
  readonly cards: readonly Card[];
  readonly skipped: readonly SkippedRow[];
  /** What the parser decided, shown back so a wrong guess is visible. */
  readonly separator: string;
  readonly usedHeader: boolean;
}

export interface ImportOptions {
  /** The deck name the cards carry, so the student recognises where they came from. */
  readonly deckName: string;
  /** ISO 8601 stamp for every imported card. Supplied, not read from a clock. */
  readonly importedAt: Date;
  /** Overrides the guess. Absent means guess. */
  readonly separator?: string;
}

/**
 * A card id for an imported card.
 *
 * When the file carries a stable external id, the card id is derived from the
 * deck name plus that id. That is what makes a second import an UPDATE rather
 * than a duplicate: same file, same ids, same cards, and the intervals the
 * student has built up survive. When the file carries no id we fall back to
 * the position in the file, and the note in the interface says that re-import
 * of a reordered file will make duplicates, because it will.
 */
export function importedCardId(deckName: string, externalId: string | null, position: number): string {
  const suffix = externalId === null ? `row${position}` : externalId;
  return `import:${deckName}:${suffix}`;
}

export function importCsv(text: string, options: ImportOptions): ImportReport {
  const separator = options.separator ?? guessSeparator(text);
  const rows = parseDelimited(text, separator);
  const skipped: SkippedRow[] = [];
  const cards: Card[] = [];

  if (rows.length === 0) {
    return { cards, skipped, separator, usedHeader: false };
  }

  const first = rows[0] ?? [];
  const usedHeader = looksLikeHeader(first);
  const columns = usedHeader ? columnsFrom(first) : POSITIONAL_COLUMNS;
  const startRow = usedHeader ? 1 : 0;
  const importedAt = options.importedAt.toISOString();
  const seenIds = new Set<string>();

  for (let r = startRow; r < rows.length; r += 1) {
    const row = rows[r] ?? [];
    const line = r + 1;

    // A blank line in the middle of a file is normal, not an error.
    if (row.every((cell) => cell.trim().length === 0)) continue;

    const front = stripHtml(row[columns.front] ?? "");
    const back = stripHtml(row[columns.back] ?? "");
    if (front.length === 0) {
      skipped.push({ line, reason: "no question on this row" });
      continue;
    }
    if (back.length === 0) {
      skipped.push({ line, reason: "no answer on this row" });
      continue;
    }

    const externalRaw = columns.id === null ? "" : (row[columns.id] ?? "").trim();
    const externalId = externalRaw.length > 0 ? externalRaw : null;
    const id = importedCardId(options.deckName, externalId, line);
    if (seenIds.has(id)) {
      skipped.push({ line, reason: `a card with the id ${externalRaw} already came in from this file` });
      continue;
    }
    seenIds.add(id);

    const tagCell = columns.tags === null ? "" : (row[columns.tags] ?? "");
    const tags = tagCell
      .split(/[\s,]+/)
      .map((tag) => tag.trim())
      .filter((tag) => tag.length > 0);

    cards.push({
      id,
      front,
      back,
      why: columns.why === null ? "" : stripHtml(row[columns.why] ?? ""),
      tags,
      source:
        externalId === null
          ? { kind: "import", deckName: options.deckName, importedAt }
          : { kind: "import", deckName: options.deckName, externalId, importedAt },
    });
  }

  return { cards, skipped, separator, usedHeader };
}

/* ------------------------------------------------------------------ */
/* What the interface says                                              */
/* ------------------------------------------------------------------ */

/** The honest statement about .apkg, quoted by the UI rather than paraphrased. */
export const APKG_IMPORT_NOTE =
  "An .apkg file is not read yet. Inside it is a zipped SQLite collection, so opening one needs a SQLite engine in the browser, and the note fields are HTML with cloze markup and media links that all have to be rewritten before they are cards. In Anki: File, Export, Notes in Plain Text, tick include tags, and bring that file here.";

/** The one line summary of an import, in the coach voice, specific about counts. */
export function importSummary(report: ImportReport): string {
  const count = report.cards.length;
  const cards = count === 1 ? "1 card" : `${count} cards`;
  if (report.skipped.length === 0) return `${cards} read, all of them clean.`;
  const bad = report.skipped.length === 1 ? "1 row" : `${report.skipped.length} rows`;
  return `${cards} read. ${bad} had no question or no answer, listed below so you can check the file.`;
}

/** Said before the student imports, not discovered afterwards. */
export function importIdNote(report: ImportReport): string | null {
  if (report.cards.length === 0) return null;
  const withId = report.cards.filter(
    (card) => card.source.kind === "import" && card.source.externalId !== undefined,
  ).length;
  if (withId === report.cards.length) {
    return "This file carries note ids, so importing it again updates these cards instead of copying them.";
  }
  if (withId === 0) {
    return "This file carries no note ids, so importing it again adds a second copy. Export from Anki with note ids included if you plan to re-import.";
  }
  return `${withId} of ${report.cards.length} rows carry a note id. Those update on a re-import; the rest would be copied.`;
}
