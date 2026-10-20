import { useSyncExternalStore } from "react";
import { fetchPublishedDecks } from "@/lib/appsScript";
import { sanitizeHtml } from "@/lib/parseDeckText";
import type { Deck, Question, StudyDeck } from "@/data/types";

/**
 * The built-in decks plus whatever has been published, as one list.
 *
 * The write path has worked for a while: parse, preview, sign in, POST, stored
 * in the sheet. Nothing read it back, so an upload succeeded and then vanished.
 * This is the other half.
 *
 * Held in a module store rather than in each component's state. The router needs
 * it to resolve `#/deck/<id>`, the hub needs it to fill the Uploaded folder, and
 * the upload ticket needs it to list what can be removed. Three copies of the
 * hook would mean three requests for the same sheet on one page load.
 *
 * Everything that comes back is treated as untrusted. It is JSON out of a
 * spreadsheet cell, and a cell can be edited by hand in the Google Sheets UI,
 * which goes nowhere near the parser that sanitised it on the way in. So every
 * deck is shape-checked and every question re-sanitised on arrival. Doing it
 * only on write would trust an edit the server never saw.
 *
 * The built-in decks are a lazy chunk too (owner, 2026-10-20): the router calls
 * this hook on every page, including the game, and the decks weighed ~38 KB
 * gzipped on the game's first load. They arrive a moment after the page, so a
 * cold link straight to a deck shows "Looking for that deck" for that moment,
 * which the owner accepted. `loading` stays true until they are in.
 */

function isQuestion(value: unknown): value is Question {
  if (!value || typeof value !== "object") return false;
  const q = value as Record<string, unknown>;
  if (typeof q.q !== "string" || typeof q.a !== "string") return false;
  // A half-formed multiple choice question is worse than none: the card reads
  // `options` and `correct` without checking, so a row missing either would
  // throw while rendering rather than simply look wrong.
  if (q.mc) {
    if (!Array.isArray(q.options) || !q.options.every((o) => typeof o === "string")) return false;
    const ok = q.correct;
    const inRange = (n: unknown) =>
      typeof n === "number" && Number.isInteger(n) && n >= 0 && n < (q.options as string[]).length;
    if (!(Array.isArray(ok) ? ok.length > 0 && ok.every(inRange) : inRange(ok))) return false;
  }
  return true;
}

/** Re-sanitises rather than trusting what the sheet handed over. */
function cleanQuestion(q: Question): Question {
  const base = { q: sanitizeHtml(q.q), a: sanitizeHtml(q.a) };
  return q.mc
    ? { ...q, ...base, options: q.options.map((o) => sanitizeHtml(o)) }
    : { ...q, ...base };
}

function isPublishedDeck(value: unknown): value is StudyDeck {
  if (!value || typeof value !== "object") return false;
  const d = value as Record<string, unknown>;
  return (
    typeof d.id === "string" &&
    d.id.length > 0 &&
    typeof d.title === "string" &&
    d.title.length > 0 &&
    Array.isArray(d.questions) &&
    d.questions.length > 0 &&
    d.questions.every(isQuestion)
  );
}

/**
 * A published deck is not allowed to claim a built-in id.
 *
 * The two lists are concatenated and looked up by id, so a sheet row calling
 * itself `grignard` would either shadow the real deck or quietly lose to it
 * depending on which end of the array won. Refusing it here keeps the built-in
 * decks unreachable from the sheet entirely.
 */
function normalise(raw: unknown[], shelves: string[], builtIns: readonly Deck[]): StudyDeck[] {
  const RESERVED = new Set(builtIns.map((d) => d.id));
  const seen = new Set<string>();
  const known = new Map(shelves.map((s) => [s.toLowerCase(), s]));
  const out: StudyDeck[] = [];
  for (const value of raw) {
    if (!isPublishedDeck(value)) continue;
    if (RESERVED.has(value.id) || seen.has(value.id)) continue;
    seen.add(value.id);

    // A deck pointing at a folder that is not in the list would be filed
    // somewhere with no heading to draw, so it comes back to the top level
    // instead of disappearing into a folder nobody can open.
    const shelf =
      typeof value.shelf === "string" ? known.get(value.shelf.trim().toLowerCase()) : undefined;

    out.push({
      ...value,
      // Uploaded decks always land in their own folder, whatever the file asked
      // for. `group` decides which folder a deck appears in, and a published
      // deck naming itself a lab deck would file itself among the course's own
      // material.
      group: "uploaded",
      shelf,
      questions: value.questions.map(cleanQuestion),
    });
  }
  return out;
}

export interface DecksSnapshot {
  /** Built-ins first, since those are what people arrive for. */
  decks: Deck[];
  /** Published decks only, which are the ones that can be removed. */
  published: StudyDeck[];
  /** Sub-folder names inside Uploaded, including ones with nothing in them. */
  shelves: string[];
  /** True until the built-in decks are in and the first fetch settles. */
  loading: boolean;
}

const EMPTY: StudyDeck[] = [];
const NO_SHELVES: string[] = [];

// Rebuilt only when the data changes, because useSyncExternalStore compares
// snapshots by identity and a fresh object every read is an infinite loop.
let snapshot: DecksSnapshot = {
  decks: EMPTY,
  published: EMPTY,
  shelves: NO_SHELVES,
  loading: true,
};
const listeners = new Set<() => void>();

/** Null until the built-in chunk has arrived. */
let builtIns: Deck[] | null = null;
/** Whether the sheet fetch is still out, kept apart from the built-ins. */
let fetching = true;

function publish(published: StudyDeck[], shelves: string[], loading: boolean) {
  fetching = loading;
  snapshot = {
    decks: [...(builtIns ?? []), ...published],
    published,
    shelves,
    loading: builtIns === null || fetching,
  };
  listeners.forEach((fn) => fn());
}

/**
 * The built-in decks, fetched once. A failed chunk counts as none, so the router
 * settles on a 404 rather than "Looking for that deck" forever; the published
 * list is then never accepted either (see `load`), so nothing can take a
 * built-in id while the real deck is missing.
 */
let builtInsReady: Promise<Deck[] | null> | null = null;
function loadBuiltIns(): Promise<Deck[] | null> {
  builtInsReady ??= import("@/data/decks").then(
    (m) => {
      builtIns = m.DECKS;
      publish(snapshot.published, snapshot.shelves, fetching);
      return m.DECKS;
    },
    () => {
      builtIns = [];
      publish(snapshot.published, snapshot.shelves, fetching);
      return null;
    },
  );
  return builtInsReady;
}

let started = false;

function load() {
  started = true;
  if (!snapshot.loading) publish(snapshot.published, snapshot.shelves, true);
  const ready = loadBuiltIns();
  fetchPublishedDecks()
    // The sheet's list is checked against the built-in ids, so it waits for them.
    .then(async ({ decks, shelves }) => {
      const reserved = await ready;
      if (reserved === null) throw new Error("The built-in decks did not load.");
      publish(normalise(decks, shelves, reserved), shelves, false);
    })
    .catch(() => publish(snapshot.published, snapshot.shelves, false));
}

function subscribe(fn: () => void) {
  listeners.add(fn);
  // The first subscriber starts the fetch. Doing it at module scope would fire
  // on import, including in the deck pages that never look at published decks.
  if (!started) load();
  return () => {
    listeners.delete(fn);
  };
}

/** Re-reads the sheet. */
export function refreshDecks() {
  load();
}

/**
 * Drops one deck locally, so a delete shows immediately.
 *
 * Called after the server confirms the row is gone. Refetching instead would
 * work, but Apps Script takes a moment to reflect a deleted row and the deck
 * would flicker back before disappearing again. The same reasoning covers the
 * three below.
 */
export function forgetDeck(id: string) {
  publish(
    snapshot.published.filter((d) => d.id !== id),
    snapshot.shelves,
    snapshot.loading,
  );
}

export function rememberShelf(name: string) {
  if (snapshot.shelves.some((s) => s.toLowerCase() === name.toLowerCase())) return;
  publish(snapshot.published, [...snapshot.shelves, name], snapshot.loading);
}

/** Drops a folder and turns its decks loose, mirroring what the server does. */
export function forgetShelf(name: string) {
  const key = name.toLowerCase();
  publish(
    snapshot.published.map((d) => (d.shelf?.toLowerCase() === key ? { ...d, shelf: undefined } : d)),
    snapshot.shelves.filter((s) => s.toLowerCase() !== key),
    snapshot.loading,
  );
}

/** Moves a deck into a folder, or out of one when `shelf` is undefined. */
export function fileDeck(id: string, shelf: string | undefined) {
  publish(
    snapshot.published.map((d) => (d.id === id ? { ...d, shelf } : d)),
    snapshot.shelves,
    snapshot.loading,
  );
}

export function useDecks(): DecksSnapshot {
  return useSyncExternalStore(subscribe, () => snapshot);
}
