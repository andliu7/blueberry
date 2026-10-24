/**
 * Merging two copies of the journal: this device's and the account's.
 *
 * The journal is append only, so a merge is a union. What makes a union safe is
 * an id per event: the same lesson clear seen from both sides must count once,
 * or a student who signs in on a second device would be paid for every lesson
 * twice. Events written before ids existed get a DETERMINISTIC legacy id, so two
 * tabs loading the same old cache name its events the same way and the server
 * never sees one event under two names.
 *
 * Pure: no React, no storage, no Supabase. progress.ts and progressSync.ts are
 * the callers; test/journalMerge.test.ts pins the rules.
 */

import type { ProblemId, TopicId } from "@blueberry/curriculum";
import { isEconomyEvent, type EconomyEvent } from "@blueberry/economy";
import type { LessonRecord } from "./progress";

/** A fresh id for an event this device is about to write. */
export function newEventId(): string {
  return crypto.randomUUID();
}

/** JSON with keys sorted and the id left out, so the same event always prints the same way. */
function canonical(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(canonical).join(",")}]`;
  if (typeof value === "object" && value !== null) {
    const record = value as Record<string, unknown>;
    const keys = Object.keys(record)
      .filter((key) => key !== "id" && record[key] !== undefined)
      .sort();
    return `{${keys.map((key) => `${JSON.stringify(key)}:${canonical(record[key])}`).join(",")}}`;
  }
  return JSON.stringify(value);
}

/** cyrb53, a small fast string hash. Not cryptographic; it only has to tell events apart. */
function cyrb53(text: string): string {
  let h1 = 0xdeadbeef;
  let h2 = 0x41c6ce57;
  for (let i = 0; i < text.length; i += 1) {
    const ch = text.charCodeAt(i);
    h1 = Math.imul(h1 ^ ch, 2654435761);
    h2 = Math.imul(h2 ^ ch, 1597334677);
  }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
  return (4294967296 * (2097151 & h2) + (h1 >>> 0)).toString(16);
}

/**
 * Every event with an id. One that has an id keeps it; one without gets
 * `legacy:<hash>:<n>`, where n counts the identical events before it, so two
 * genuinely repeated events (two attempts at the same instant) stay two.
 */
export function withIds(journal: readonly EconomyEvent[]): EconomyEvent[] {
  const seen = new Map<string, number>();
  return journal.map((event) => {
    if (event.id !== undefined) return event;
    const hash = cyrb53(canonical(event));
    const n = seen.get(hash) ?? 0;
    seen.set(hash, n + 1);
    return { ...event, id: `legacy:${hash}:${n}` };
  });
}

export interface JournalMerge {
  /** The union, in time order. */
  readonly journal: EconomyEvent[];
  /** Events only the remote side had: what this device just learned. */
  readonly added: EconomyEvent[];
  /** Events only the local side had: what the account has not seen yet. */
  readonly toPush: EconomyEvent[];
}

/**
 * Union by id; on a clash the local copy wins. Sorted by time, and on a tie the
 * local order comes first and then the remote order, because the derivation
 * breaks timestamp ties by position: a lesson's attempts must stay ahead of
 * its clear. Remote rows are validated first, so a bad row is dropped and never
 * throws. Local events are assumed to carry ids already (see withIds).
 */
export function mergeJournals(local: readonly EconomyEvent[], remote: readonly unknown[]): JournalMerge {
  const localIds = new Set<string>();
  for (const event of local) if (event.id !== undefined) localIds.add(event.id);

  const remoteIds = new Set<string>();
  const added: EconomyEvent[] = [];
  for (const row of remote) {
    if (!isEconomyEvent(row) || row.id === undefined || remoteIds.has(row.id)) continue;
    remoteIds.add(row.id);
    if (!localIds.has(row.id)) added.push(row);
  }

  const toPush = local.filter((event) => event.id === undefined || !remoteIds.has(event.id));
  const ordered = [...local, ...added].map((event, position) => ({ event, position, ms: Date.parse(event.at) }));
  ordered.sort((a, b) => a.ms - b.ms || a.position - b.position);
  return { journal: ordered.map((entry) => entry.event), added, toPush };
}

/**
 * Lesson records for every lesson clear in the journal that `existing` lacks.
 * A new device has the journal but not the records, and CoursesTab and
 * PathwayTab read the records. The counts come from the attempts written at
 * the same instant as the clear, which is how completeLesson writes them.
 * Existing records are never overwritten.
 */
export function lessonsFromJournal(
  journal: readonly EconomyEvent[],
  existing: Readonly<Record<string, LessonRecord>>,
): Record<string, LessonRecord> {
  const lessons: Record<string, LessonRecord> = { ...existing };
  for (const event of journal) {
    if (event.kind !== "node_cleared" || !event.nodeId.startsWith("lesson:")) continue;
    const topic = event.nodeId.slice("lesson:".length) as TopicId;
    if (lessons[topic] !== undefined) continue;
    let correct = 0;
    let attempted = 0;
    for (const other of journal) {
      if (other.kind !== "attempt" || other.nodeId !== event.nodeId || other.at !== event.at) continue;
      attempted += 1;
      if (other.correct) correct += 1;
    }
    lessons[topic] = { topic, correct, attempted, completedAt: event.at };
  }
  return lessons;
}

/** Every problem id the journal's attempts name, added to `existing` without repeats. */
export function attemptedFromJournal(journal: readonly EconomyEvent[], existing: readonly ProblemId[]): ProblemId[] {
  const ids = new Set<ProblemId>(existing);
  for (const event of journal) if (event.kind === "attempt") ids.add(event.problemId as ProblemId);
  return [...ids];
}
