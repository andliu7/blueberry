/**
 * One door for every file a student drops on the import control.
 *
 * WHY A ROUTER RATHER THAN THREE BUTTONS. A student with a deck to bring in
 * knows they have a file. They do not know, and should not have to know, that
 * ours is JSON and Anki's is CSV and that a third thing exists which we cannot
 * read. So there is one control, this function decides what arrived, and every
 * branch ends in a sentence a person can act on. A screen with three import
 * buttons is a screen that makes the student debug our formats.
 *
 * THREE BRANCHES.
 *
 *   `.apkg`  We cannot read it and we say exactly why and what to do instead.
 *            Not attempted, not half attempted. See APKG_IMPORT_NOTE.
 *   `.json`  Our own export. Cards come back with their `why` and their tags.
 *            THE SCHEDULE DOES NOT COME BACK, because DeckSource.importCards
 *            takes cards and not review states, and the note below says so at
 *            the moment it matters instead of leaving a student to discover
 *            that their intervals reset.
 *   anything else  Delimited text, through importCsv.
 *
 * NOTHING HERE THROWS. A file the student chose is untrusted input by
 * definition, and a parse error is a sentence, not a stack trace. Everything
 * returns an ImportResult and the surface renders whichever half is filled.
 *
 * Pure: takes the file's text and its name, returns a value. Reading the file
 * off disk is the component's job, because that is the part that needs the
 * browser.
 */

import type { Card } from "../types";
import { DECK_EXPORT_FORMAT } from "./exportDeck";
import { APKG_IMPORT_NOTE, importCsv, importSummary, type ImportReport } from "./importCsv";

export interface ImportResult {
  /** Empty when nothing could be read. Never null, so the caller has no branch. */
  readonly cards: readonly Card[];
  /** The one line the surface shows. Always filled, in every branch. */
  readonly message: string;
  /** Extra lines: skipped rows, format notes. Rendered under the message. */
  readonly notes: readonly string[];
  /** True when this file cannot be imported at all, so the UI can style it. */
  readonly refused: boolean;
  /** Present for a delimited file, so the surface can show what was guessed. */
  readonly report?: ImportReport;
}

export interface ImportFileOptions {
  readonly deckName: string;
  readonly importedAt: Date;
}

/**
 * Read our own export back.
 *
 * Validated field by field rather than cast, because a file that has been
 * round tripped through a text editor is a normal thing and a cast turns a
 * missing `back` into `undefined` on a card face. A row that fails validation
 * is dropped and counted; the file is not rejected because of it.
 */
function readOwnExport(parsed: unknown, options: ImportFileOptions): ImportResult {
  const root = parsed as { format?: unknown; cards?: unknown; deck?: { title?: unknown } };
  if (root.format !== DECK_EXPORT_FORMAT || !Array.isArray(root.cards)) {
    return {
      cards: [],
      message: "That JSON file is not a Blueberry deck export.",
      notes: ["A Blueberry export starts with a format of blueberry.deck. If this came from another app, try its CSV export instead."],
      refused: true,
    };
  }

  const deckName =
    typeof root.deck?.title === "string" && root.deck.title.trim().length > 0
      ? root.deck.title
      : options.deckName;
  const importedAt = options.importedAt.toISOString();

  const cards: Card[] = [];
  let dropped = 0;
  let carriedSchedule = 0;
  for (const entry of root.cards) {
    const holder = entry as { card?: unknown; review?: unknown };
    const card = holder.card as Partial<Card> | undefined;
    if (
      card === undefined ||
      typeof card.id !== "string" ||
      typeof card.front !== "string" ||
      typeof card.back !== "string"
    ) {
      dropped += 1;
      continue;
    }
    if (holder.review !== undefined) carriedSchedule += 1;
    cards.push({
      id: card.id,
      front: card.front,
      back: card.back,
      why: typeof card.why === "string" ? card.why : "",
      tags: Array.isArray(card.tags) ? card.tags.filter((tag): tag is string => typeof tag === "string") : [],
      // Re-sourced as an import: this copy came in on a file, whatever it was
      // before. The original card id is kept as the externalId so bringing the
      // same file in twice updates rather than duplicates.
      source: { kind: "import", deckName, externalId: card.id, importedAt },
    });
  }

  const notes: string[] = [];
  if (dropped > 0) {
    notes.push(`${dropped} ${dropped === 1 ? "entry" : "entries"} had no question or no answer and was left out.`);
  }
  if (carriedSchedule > 0) {
    notes.push(
      "This file carries review dates. They start fresh here: bringing a schedule back in needs a source that accepts one, and ours does not yet.",
    );
  }

  return {
    cards,
    message:
      cards.length === 1 ? "1 card read from the export." : `${cards.length} cards read from the export.`,
    notes,
    refused: cards.length === 0,
  };
}

export function readDeckFile(filename: string, text: string, options: ImportFileOptions): ImportResult {
  const lower = filename.toLowerCase();

  if (lower.endsWith(".apkg") || lower.endsWith(".colpkg")) {
    return { cards: [], message: "That file cannot be read here yet.", notes: [APKG_IMPORT_NOTE], refused: true };
  }

  if (lower.endsWith(".json")) {
    let parsed: unknown;
    try {
      parsed = JSON.parse(text);
    } catch {
      return {
        cards: [],
        message: "That file is not valid JSON.",
        notes: ["It may have been edited or truncated. Try exporting it again."],
        refused: true,
      };
    }
    return readOwnExport(parsed, options);
  }

  const report = importCsv(text, { deckName: options.deckName, importedAt: options.importedAt });
  const notes = report.skipped.map((row) => `Line ${row.line}: ${row.reason}.`);
  if (!report.usedHeader) {
    notes.unshift("No header row was found, so the first column was read as the question and the second as the answer.");
  }
  return {
    cards: report.cards,
    message: importSummary(report),
    notes,
    refused: report.cards.length === 0,
    report,
  };
}

/** A deck name from the filename, so an imported deck is recognisable. */
export function deckNameFromFilename(filename: string): string {
  const base = filename.replace(/\.[^.]+$/, "").replace(/[_-]+/g, " ").trim();
  return base.length > 0 ? base : "Imported deck";
}
