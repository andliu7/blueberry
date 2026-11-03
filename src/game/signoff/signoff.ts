/**
 * The Unit 1 sign-off page's data and rules (dev only, #/signoff).
 *
 * WHY THIS EXISTS. Every Unit 1 pool entry is `placeholder: true` until the
 * owner signs it off, and a draft is kept out of spaced review
 * (beats/practice/pools.ts). Reviewing two hundred items in chat is slow, so
 * the page shows one at a time, records a verdict per item, and writes them to
 * documentation/unit1-signoff.json, where the next agent reads them from disk.
 *
 * This file only RECORDS verdicts. It never flips a `placeholder` flag:
 * applying the approvals to the content files is a separate step the owner
 * asks for by name.
 *
 * Pure, apart from the two I/O functions at the bottom, which take their fetch
 * and storage as arguments so a test can hand them fakes.
 */
import type { PoolEntry, UnitPools } from "../content/u1/types";
import type { SaveStorage } from "../resume/lessonSave";

export type Verdict = "approve" | "send-back";

export interface VerdictRecord {
  readonly verdict: Verdict;
  readonly comment: string;
  /** ISO time of the last change to this row. */
  readonly at: string;
}

/** The file's whole shape: { itemId: { verdict, comment, at } }. */
export type Verdicts = Readonly<Record<string, VerdictRecord>>;

export interface ReviewItem {
  readonly id: string;
  /** The pathway node whose pool holds it (u1-rank-cation, u1-exam, ...). */
  readonly node: string;
  readonly nodeTitle: string;
  readonly entry: PoolEntry;
}

/** Where the dev server keeps the file. Read by the Vite plugin in vite.config.ts. */
export const SIGNOFF_ENDPOINT = "/__signoff";
export const SIGNOFF_FILE = "documentation/unit1-signoff.json";
/** The fallback copy, used only when the dev server cannot be reached or cannot write. */
export const SIGNOFF_STORAGE_KEY = "blueberry.u1-signoff";

/**
 * Every pool entry in the unit, in pool order (the order an in-a-row run
 * plays them), so the page walks the unit the way a student does.
 */
export function reviewItems(pools: UnitPools, titleOf: (node: string) => string): readonly ReviewItem[] {
  return Object.entries(pools).flatMap(([node, entries]) =>
    entries.map((entry) => ({ id: entry.id, node, nodeTitle: titleOf(node), entry })),
  );
}

/** Records a verdict, keeping the comment given. Returns a new table; the old one is untouched. */
export function setVerdict(verdicts: Verdicts, id: string, verdict: Verdict, comment: string, at: string): Verdicts {
  return { ...verdicts, [id]: { verdict, comment, at } };
}

/**
 * Changes the comment on an item that already has a verdict. An item with no
 * verdict yet has no row to change (the shape requires one), so the page keeps
 * that comment as a draft until A or S is pressed.
 */
export function setComment(verdicts: Verdicts, id: string, comment: string, at: string): Verdicts {
  const row = verdicts[id];
  if (row === undefined) return verdicts;
  return { ...verdicts, [id]: { ...row, comment, at } };
}

export interface Tally {
  readonly total: number;
  readonly approved: number;
  readonly sentBack: number;
  readonly open: number;
}

/** Counts over the items on the page only, so a stale row for a deleted item never inflates a number. */
export function tally(items: readonly ReviewItem[], verdicts: Verdicts): Tally {
  let approved = 0;
  let sentBack = 0;
  for (const item of items) {
    const row = verdicts[item.id];
    if (row?.verdict === "approve") approved += 1;
    else if (row?.verdict === "send-back") sentBack += 1;
  }
  return { total: items.length, approved, sentBack, open: items.length - approved - sentBack };
}

/** The first item with no verdict at or after `from`, wrapping round; -1 when every item has one. */
export function nextOpen(items: readonly ReviewItem[], verdicts: Verdicts, from: number): number {
  for (let step = 0; step < items.length; step += 1) {
    const at = (from + step) % items.length;
    if (verdicts[items[at]!.id] === undefined) return at;
  }
  return -1;
}

/**
 * Reads a table from untrusted JSON (the file on disk, or the browser copy).
 * A malformed row is dropped rather than failing the whole load, so one bad
 * hand edit to the file costs one verdict, not all of them.
 */
export function parseVerdicts(raw: unknown): Verdicts {
  if (typeof raw !== "object" || raw === null || Array.isArray(raw)) return {};
  const out: Record<string, VerdictRecord> = {};
  for (const [id, row] of Object.entries(raw as Record<string, unknown>)) {
    if (typeof row !== "object" || row === null) continue;
    const { verdict, comment, at } = row as Record<string, unknown>;
    if (verdict !== "approve" && verdict !== "send-back") continue;
    out[id] = { verdict, comment: typeof comment === "string" ? comment : "", at: typeof at === "string" ? at : "" };
  }
  return out;
}

/**
 * The plain-text hand-off for Claude: every sent-back item with its comment
 * and enough context to find it, then the approved ids, then the ones not
 * reviewed yet. Plain text because it is pasted into a chat, not parsed.
 */
export function summaryText(items: readonly ReviewItem[], verdicts: Verdicts, today: string): string {
  const counts = tally(items, verdicts);
  const sentBack = items.filter((item) => verdicts[item.id]?.verdict === "send-back");
  const approved = items.filter((item) => verdicts[item.id]?.verdict === "approve");
  const open = items.filter((item) => verdicts[item.id] === undefined);

  const lines = [
    `Unit 1 sign-off, ${today}. ${counts.total} items: ${counts.approved} approved, ${counts.sentBack} sent back, ${counts.open} not reviewed yet.`,
    `Verdicts file: ${SIGNOFF_FILE}`,
    "",
    `SENT BACK (${sentBack.length})`,
  ];
  if (sentBack.length === 0) lines.push("None.");
  for (const item of sentBack) {
    const comment = verdicts[item.id]!.comment.trim();
    lines.push(`- ${item.id} (${item.entry.item.kind}, ${item.node}: ${item.nodeTitle})`);
    lines.push(`  Comment: ${comment === "" ? "(no comment)" : comment.replace(/\s*\n\s*/g, " / ")}`);
  }
  lines.push("", `APPROVED (${approved.length})`, approved.length === 0 ? "None." : approved.map((item) => item.id).join(", "));
  if (open.length > 0) lines.push("", `NOT REVIEWED YET (${open.length})`, open.map((item) => item.id).join(", "));
  return lines.join("\n");
}

/* ------------------------------------------------------------------ */
/* I/O: the file through the dev server first, the browser second.     */
/* ------------------------------------------------------------------ */

export type FetchLike = (input: string, init?: { method?: string; headers?: Record<string, string>; body?: string }) => Promise<{ ok: boolean; json(): Promise<unknown> }>;

export type SavedTo = "file" | "browser" | "nowhere";

function readBrowser(storage: SaveStorage | null): Verdicts {
  if (storage === null) return {};
  try {
    const raw = storage.getItem(SIGNOFF_STORAGE_KEY);
    return raw === null ? {} : parseVerdicts(JSON.parse(raw));
  } catch {
    return {};
  }
}

/** The file when the dev server answers, else the browser copy. */
export async function loadVerdicts(fetcher: FetchLike, storage: SaveStorage | null): Promise<{ verdicts: Verdicts; from: SavedTo }> {
  try {
    const response = await fetcher(SIGNOFF_ENDPOINT);
    if (response.ok) return { verdicts: parseVerdicts(await response.json()), from: "file" };
  } catch {
    // The dev server is not answering: fall through to the browser copy.
  }
  return { verdicts: readBrowser(storage), from: storage === null ? "nowhere" : "browser" };
}

/** Writes the whole table to the file; only if that fails, to the browser. Says where it landed. */
export async function saveVerdicts(verdicts: Verdicts, fetcher: FetchLike, storage: SaveStorage | null): Promise<SavedTo> {
  const body = JSON.stringify(verdicts);
  try {
    const response = await fetcher(SIGNOFF_ENDPOINT, { method: "PUT", headers: { "content-type": "application/json" }, body });
    if (response.ok) return "file";
  } catch {
    // Fall through to the browser copy.
  }
  if (storage === null) return "nowhere";
  try {
    storage.setItem(SIGNOFF_STORAGE_KEY, body);
    return "browser";
  } catch {
    return "nowhere";
  }
}
