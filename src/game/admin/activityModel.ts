/**
 * The admin activity view's model (STATUS F1): raw progress_events rows in,
 * one line per lesson run out. No React, no DOM, no Date.now: `now` is handed
 * in, so every status and duration is testable with the clock seeded.
 *
 * A RUN is one student's go at one lesson: its node_started, the attempts that
 * follow, and the node_cleared that ends it. A run with no clear is "in
 * progress" while events keep coming and "left" after IDLE_MS of silence.
 *
 * Rows the economy cannot read (isEconomyEvent fails) are dropped, the same
 * rule progressSync.ts applies on every pull.
 */

import { isEconomyEvent, type EconomyEvent } from "@blueberry/economy";

/** A started run with no event for this long counts as left. */
export const IDLE_MS = 30 * 60 * 1000;

/** One row as the admin screen selects it from progress_events. */
export interface EventRow {
  readonly user_id: unknown;
  readonly id: unknown;
  readonly event: unknown;
}

export interface ProfileRow {
  readonly id: string;
  readonly full_name: string | null;
  readonly email: string | null;
}

export type RunStatus = "cleared" | "in progress" | "left";

export interface ActivityRow {
  readonly key: string;
  readonly userId: string;
  readonly who: string;
  readonly nodeId: string;
  readonly lesson: string;
  readonly status: RunStatus;
  /** Right on the first try, out of the questions counted; null when nothing was answered. */
  readonly firstTry: { readonly right: number; readonly of: number } | null;
  readonly started: string;
  readonly finished: string | null;
  readonly lastSeen: string;
  readonly durationMs: number;
}

type RunEvent = Extract<EconomyEvent, { kind: "node_started" | "attempt" | "node_cleared" }>;

interface Run {
  userId: string;
  nodeId: string;
  events: RunEvent[];
  cleared: Extract<EconomyEvent, { kind: "node_cleared" }> | null;
}

const isRunEvent = (event: EconomyEvent): event is RunEvent =>
  event.kind === "node_started" || event.kind === "attempt" || event.kind === "node_cleared";

/** Name, else email, else the first 8 characters of the id. */
export function whoLabel(userId: string, profile: ProfileRow | undefined): string {
  const name = profile?.full_name?.trim();
  if (name) return name;
  const email = profile?.email?.trim();
  if (email) return email;
  return userId.slice(0, 8);
}

/** First-try accuracy: the clear's own count when it has one, else the first attempt per question. */
function firstTry(run: Run): ActivityRow["firstTry"] {
  if (run.cleared !== null && run.cleared.cleared !== undefined) {
    return { right: run.cleared.cleared, of: run.cleared.stepsInOneSitting };
  }
  const first = new Map<string, boolean>();
  for (const event of run.events) {
    if (event.kind === "attempt" && !first.has(event.problemId)) first.set(event.problemId, event.correct);
  }
  if (first.size === 0) return null;
  let right = 0;
  for (const correct of first.values()) if (correct) right += 1;
  return { right, of: first.size };
}

export function activityRows(input: {
  readonly rows: readonly EventRow[];
  readonly profiles: readonly ProfileRow[];
  readonly titleFor: (nodeId: string) => string | null;
  readonly now: string;
  /** Only these accounts; null or empty means every account in the rows. */
  readonly userIds?: readonly string[] | null;
}): readonly ActivityRow[] {
  const only = input.userIds && input.userIds.length > 0 ? new Set(input.userIds) : null;

  const events: { userId: string; event: RunEvent; order: number }[] = [];
  input.rows.forEach((row, order) => {
    if (typeof row.user_id !== "string" || typeof row.id !== "string") return;
    if (only !== null && !only.has(row.user_id)) return;
    if (typeof row.event !== "object" || row.event === null) return;
    const event: unknown = { ...(row.event as Record<string, unknown>), id: row.id };
    if (!isEconomyEvent(event) || !isRunEvent(event)) return;
    events.push({ userId: row.user_id, event, order });
  });
  // Oldest first; same-instant events keep their row order reversed, because
  // the screen selects newest first and a lesson's attempts come before its clear.
  events.sort((a, b) => Date.parse(a.event.at) - Date.parse(b.event.at) || b.order - a.order);

  const runs: Run[] = [];
  const open = new Map<string, Run>();
  for (const { userId, event } of events) {
    const key = `${userId}\u0000${event.nodeId}`;
    let run = open.get(key);
    if (event.kind === "node_started" || run === undefined) {
      run = { userId, nodeId: event.nodeId, events: [], cleared: null };
      runs.push(run);
      open.set(key, run);
    }
    run.events.push(event);
    if (event.kind === "node_cleared") {
      run.cleared = event;
      open.delete(key);
    }
  }

  const profiles = new Map(input.profiles.map((p) => [p.id, p]));
  const now = Date.parse(input.now);
  return runs
    .map((run): ActivityRow => {
      const started = run.events[0]!.at;
      const lastSeen = run.events[run.events.length - 1]!.at;
      const finished = run.cleared?.at ?? null;
      const status: RunStatus =
        finished !== null ? "cleared" : now - Date.parse(lastSeen) > IDLE_MS ? "left" : "in progress";
      return {
        key: `${run.userId}:${run.nodeId}:${started}`,
        userId: run.userId,
        who: whoLabel(run.userId, profiles.get(run.userId)),
        nodeId: run.nodeId,
        lesson: input.titleFor(run.nodeId) ?? run.nodeId,
        status,
        firstTry: firstTry(run),
        started,
        finished,
        lastSeen,
        durationMs: Math.max(0, Date.parse(finished ?? lastSeen) - Date.parse(started)),
      };
    })
    .sort((a, b) => Date.parse(b.lastSeen) - Date.parse(a.lastSeen));
}

/** "7/9 (78%)", or "n/a" when nothing was answered. */
export function firstTryLabel(firstTry: ActivityRow["firstTry"]): string {
  if (firstTry === null || firstTry.of === 0) return "n/a";
  return `${firstTry.right}/${firstTry.of} (${Math.round((100 * firstTry.right) / firstTry.of)}%)`;
}

/** "45s", "4m 12s", "1h 3m". */
export function durationLabel(ms: number): string {
  const s = Math.round(ms / 1000);
  if (s < 60) return `${s}s`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ${s % 60}s`;
  return `${Math.floor(m / 60)}h ${m % 60}m`;
}

export type LoadState = "ok" | "not-applied" | "denied" | "error";

/**
 * What a Supabase result means for the screen. A missing table is the same
 * three signals progressSync.ts reads (PGRST205, 42P01, 404); a permission
 * error is 42501 or a 401/403.
 */
export function classifyLoad(result: {
  readonly error: { readonly code?: string } | null;
  readonly status?: number;
}): LoadState {
  if (result.error === null) return "ok";
  const code = result.error.code;
  if (code === "PGRST205" || code === "42P01" || result.status === 404) return "not-applied";
  if (code === "42501" || result.status === 401 || result.status === 403) return "denied";
  return "error";
}
