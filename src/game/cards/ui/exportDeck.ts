/**
 * Taking a deck out of the app. Read this header before trusting anything in
 * this file.
 *
 * WHY THIS EXISTS AT ALL. A student the night before an exam is not always
 * online, is not always on this device, and should never feel that the cards
 * they built here are hostage to us. Export is a trust feature first and a
 * convenience second. It is also the honest counterpart to import: a product
 * that will read your Anki deck and never let you leave has taken something.
 *
 * TWO FORMATS, and each one is for a different person.
 *
 *   JSON, `deckExport`. Ours. It carries the card, its `why`, its source AND
 *   its review state, so nothing a student has built is missing from the file.
 *   This is the floor and it is what "download my deck" means.
 *
 *   One honest limit on the way back IN, stated here rather than discovered:
 *   `DeckSource.importCards` accepts cards and not schedules, so re-importing
 *   this file today restores the cards and starts their intervals fresh. The
 *   schedule is in the file and the seam has nowhere to put it. Closing that
 *   needs one method on the source, and importFile.ts says so at the point a
 *   student would notice.
 *
 *   CSV, `toCsv`. Anki's own import path. Anki reads plain text notes with
 *   comma separated fields, so a file from here opens in Anki, Quizlet, or a
 *   spreadsheet without anybody writing an adapter. The review state does NOT
 *   survive it, because the format has nowhere to put it, and `csvNote()`
 *   below says that in the interface rather than letting a student discover it.
 *
 * WHAT IS NOT BUILT, said plainly rather than half built: `.apkg`. See
 * APKG_EXPORT_NOTE for exactly what it would cost.
 *
 * The pure functions here produce strings. `downloadFile` is the one function
 * that touches the browser, and it is kept separate so everything above it can
 * be tested in the node environment vitest runs in.
 */

import type { Card, DeckSnapshot, DeckId, ReviewState } from "../types";
import { cardsIn } from "../types";

/* ------------------------------------------------------------------ */
/* The JSON format                                                      */
/* ------------------------------------------------------------------ */

/**
 * `format` and `version` are the first two fields on purpose. A file that does
 * not say what it is cannot be validated on the way back in, and a file that
 * does not carry a version number cannot be migrated without guessing. Both of
 * those are cheap now and impossible later.
 */
export const DECK_EXPORT_FORMAT = "blueberry.deck";
export const DECK_EXPORT_VERSION = 1;

export interface ExportedCard {
  readonly card: Card;
  /** Absent for a card that has never been rated. */
  readonly review?: ReviewState;
}

export interface DeckExport {
  readonly format: typeof DECK_EXPORT_FORMAT;
  readonly version: typeof DECK_EXPORT_VERSION;
  /** ISO 8601. Supplied, not read from the clock, so this stays pure. */
  readonly exportedAt: string;
  readonly deck: {
    readonly id: DeckId;
    readonly title: string;
    readonly kind: "lesson" | "personal" | "dat";
  };
  readonly cards: readonly ExportedCard[];
}

export function deckExport(snapshot: DeckSnapshot, deckId: DeckId, exportedAt: Date): DeckExport | null {
  const deck = snapshot.decks[deckId];
  if (deck === undefined) return null;
  const cards: ExportedCard[] = [];
  for (const card of cardsIn(snapshot, deckId)) {
    const review = snapshot.review[card.id];
    cards.push(review === undefined ? { card } : { card, review });
  }
  return {
    format: DECK_EXPORT_FORMAT,
    version: DECK_EXPORT_VERSION,
    exportedAt: exportedAt.toISOString(),
    deck: { id: deck.id, title: deck.title, kind: deck.kind },
    cards,
  };
}

/** Two space indent, because a student may well open this in a text editor. */
export function toJson(value: DeckExport): string {
  return JSON.stringify(value, null, 2);
}

/* ------------------------------------------------------------------ */
/* The CSV format                                                       */
/* ------------------------------------------------------------------ */

/**
 * RFC 4180 quoting: wrap a field in double quotes when it contains a comma, a
 * quote or a newline, and double any quote inside it. Every field here is
 * authored chemistry copy, which routinely contains commas, so this is the
 * difference between a file that opens and a file that opens wrong.
 */
export function csvField(value: string): string {
  if (!/[",\r\n]/.test(value)) return value;
  return `"${value.replace(/"/g, '""')}"`;
}

export const CSV_HEADER: readonly string[] = Object.freeze(["id", "front", "back", "why", "tags"]);

/**
 * Anki reads tags as a space separated field, so a tag containing a space
 * would silently become two tags. We join on space to match Anki and replace
 * any inner space with an underscore, which is the convention Anki users
 * already write by hand.
 */
export function csvTags(tags: readonly string[]): string {
  return tags.map((tag) => tag.replace(/\s+/g, "_")).join(" ");
}

export function toCsv(cards: readonly Card[]): string {
  const lines = [CSV_HEADER.join(",")];
  for (const card of cards) {
    lines.push(
      [
        csvField(card.id),
        csvField(card.front),
        csvField(card.back),
        csvField(card.why),
        csvField(csvTags(card.tags)),
      ].join(","),
    );
  }
  // A trailing newline: some spreadsheet importers drop the last row without one.
  return `${lines.join("\r\n")}\r\n`;
}

/** Said in the interface, not discovered afterwards. */
export function csvNote(): string {
  return "CSV opens in Anki, Quizlet and any spreadsheet. It carries the cards and their explanations; the review schedule stays here, because the format has nowhere to put it.";
}

/**
 * The honest statement about .apkg, quoted by the UI rather than paraphrased.
 *
 * An .apkg is a ZIP holding `collection.anki2`, which is a SQLite database,
 * plus a media folder and a JSON media map. Writing one in the browser needs a
 * ZIP writer and a SQLite writer: sql.js is the usual answer and it is roughly
 * 1.5 MB of WASM. CLAUDE.md's heavy import rule would put that behind
 * React.lazy with a real loading state, which is doable, and then the actual
 * work starts: note types, field ordering, deck configuration rows, GUIDs that
 * do not collide with the student's existing collection, and the scheduler
 * columns whose meaning differs between Anki's v1, v2 and v3 schedulers. That
 * is a project, not a function, and half of it shipped is a file that Anki
 * opens and then corrupts a collection with. So it is not built.
 */
export const APKG_EXPORT_NOTE =
  "Anki's own .apkg is not exported. An .apkg is a zipped SQLite collection, so writing one needs a SQLite engine in the browser plus Anki's note type and scheduler tables, and a half correct one can damage a real collection. Use the CSV: Anki imports it from File, Import.";

/* ------------------------------------------------------------------ */
/* Filenames                                                            */
/* ------------------------------------------------------------------ */

/**
 * A filename a file manager will accept on Windows, macOS and Linux at once.
 * An ALLOWLIST rather than a blocklist of the reserved characters, because the
 * reserved sets differ per platform and a blocklist is only ever as complete
 * as the last person who edited it. Letters, digits, space, underscore, dot
 * and dash survive; runs of space become one dash; the length is capped well
 * under any filesystem limit.
 */
export function safeFilename(title: string, extension: string): string {
  const cleaned = title
    .replace(/[^A-Za-z0-9 _.-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .slice(0, 60);
  const stem = cleaned.length > 0 ? cleaned : "blueberry-deck";
  return `${stem}.${extension}`;
}

/* ------------------------------------------------------------------ */
/* The one function that touches the browser                            */
/* ------------------------------------------------------------------ */

/**
 * Hand the file to the student.
 *
 * A Blob plus an object URL plus a click on a detached anchor is the boring,
 * fifteen year old way to do this and it works in every browser we target. The
 * URL is revoked on the next tick rather than immediately, because revoking it
 * in the same frame as the click races the download in some browsers.
 *
 * NOTE FOR ANYONE READING THIS IN AN ARTIFACT VIEWER: a sandboxed preview
 * blocks a page from starting its own download, so this does nothing there.
 * This is the real web app, where it works normally.
 */
export function downloadFile(filename: string, mime: string, contents: string): void {
  const blob = new Blob([contents], { type: mime });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.rel = "noopener";
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  setTimeout(() => URL.revokeObjectURL(url), 0);
}
