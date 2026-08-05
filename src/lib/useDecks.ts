import { useSyncExternalStore } from "react";
import { DECKS as BUILTIN_DECKS } from "@/data/decks";
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
const RESERVED = new Set(BUILTIN_DECKS.map((d) => d.id));

function normalise(raw: unknown[]): StudyDeck[] {
  const seen = new Set<string>();
  const out: StudyDeck[] = [];
  for (const value of raw) {
    if (!isPublishedDeck(value)) continue;
    if (RESERVED.has(value.id) || seen.has(value.id)) continue;
    seen.add(value.id);
    out.push({
      ...value,
      // Uploaded decks always land in their own folder, whatever the file asked
      // for. `group` decides which folder a deck appears in, and a published
      // deck naming itself a lab deck would file itself among the course's own
      // material.
      group: "uploaded",
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
  /** True until the first fetch settles. */
  loading: boolean;
}

const EMPTY: StudyDeck[] = [];

// Rebuilt only when the data changes, because useSyncExternalStore compares
// snapshots by identity and a fresh object every read is an infinite loop.
let snapshot: DecksSnapshot = { decks: BUILTIN_DECKS, published: EMPTY, loading: true };
const listeners = new Set<() => void>();

function publish(published: StudyDeck[], loading: boolean) {
  snapshot = { decks: [...BUILTIN_DECKS, ...published], published, loading };
  listeners.forEach((fn) => fn());
}

let started = false;

function load() {
  started = true;
  if (!snapshot.loading) publish(snapshot.published, true);
  fetchPublishedDecks()
    .then((raw) => publish(normalise(raw), false))
    .catch(() => publish(snapshot.published, false));
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
 * would flicker back before disappearing again.
 */
export function forgetDeck(id: string) {
  publish(
    snapshot.published.filter((d) => d.id !== id),
    snapshot.loading,
  );
}

export function useDecks(): DecksSnapshot {
  return useSyncExternalStore(subscribe, () => snapshot);
}
