/**
 * Real figures for the Learners statistics board (StatsBoard.tsx).
 *
 * Same rule as adminHomeLive.ts: a staff session reads profiles, progress_events and
 * analytics_events through RLS today, and entitlements once the staff-read migration is
 * applied. Everything built here comes from rows a query returned. A part whose query
 * failed or returned nothing is reported as not live, and the board draws it as
 * "No data, example". Nothing here guesses.
 *
 * Pure builders first (tested in statsLive.test.ts), then the one fetch.
 */
import type { SupabaseClient } from "@supabase/supabase-js";
import { PATHWAY_UNITS } from "../demo/pathwayMap";
import { fetchAll, termStart } from "./adminHomeLive";

export interface Point {
  label: string;
  value: number;
}

const DAY = 86_400_000;
const sod = (d: Date): Date => new Date(d.getFullYear(), d.getMonth(), d.getDate());
const plus = (d: Date, n: number): Date => new Date(d.getFullYear(), d.getMonth(), d.getDate() + n);

/* ------------------------------------------------------------------ pure builders */

/** Sign-ups per day for the last `days` days ending today, and the total for the `days` before. */
export function signupSeries(times: readonly string[], now: Date, days = 30): { series: Point[]; previous: number } {
  const today = sod(now);
  const start = plus(today, -(days - 1));
  const counts = new Array<number>(days).fill(0);
  let previous = 0;
  const prevStart = plus(start, -days);
  for (const t of times) {
    const d = sod(new Date(t));
    if (d >= start && d <= today) counts[Math.round((d.getTime() - start.getTime()) / DAY)]! += 1;
    else if (d >= prevStart && d < start) previous += 1;
  }
  return { series: counts.map((value, i) => ({ label: plus(start, i).toLocaleDateString("en-US", { month: "short", day: "numeric" }), value })), previous };
}

const WEEKDAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

/** The hour and weekday with the most sign-ups. Null when there are none. */
export function bestJoinTime(times: readonly string[]): { hour: number; weekday: string } | null {
  if (times.length === 0) return null;
  const hours = new Array<number>(24).fill(0);
  const days = new Array<number>(7).fill(0);
  for (const t of times) {
    const d = new Date(t);
    hours[d.getHours()]! += 1;
    days[d.getDay()]! += 1;
  }
  const top = (a: number[]) => a.reduce((best, v, i) => (v > a[best]! ? i : best), 0);
  return { hour: top(hours), weekday: WEEKDAYS[top(days)]! };
}

export interface ProfileLite {
  id: string;
  created_at: string;
}
export interface EventLite {
  user_id: string;
  kind: string;
  at: string;
}

/** Median whole days from sign-up to a learner's first lesson start. Null when nobody has started one. */
export function medianDaysToFirstLesson(profiles: readonly ProfileLite[], events: readonly EventLite[]): number | null {
  const joined = new Map(profiles.map((p) => [p.id, new Date(p.created_at).getTime()] as const));
  const first = new Map<string, number>();
  for (const e of events) {
    if (e.kind !== "node_started") continue;
    const t = new Date(e.at).getTime();
    if (!joined.has(e.user_id)) continue;
    if (t < (first.get(e.user_id) ?? Infinity)) first.set(e.user_id, t);
  }
  const gaps = [...first].map(([u, t]) => Math.max(0, Math.floor((sod(new Date(t)).getTime() - sod(new Date(joined.get(u)!)).getTime()) / DAY))).sort((a, b) => a - b);
  if (gaps.length === 0) return null;
  const mid = Math.floor(gaps.length / 2);
  return gaps.length % 2 ? gaps[mid]! : (gaps[mid - 1]! + gaps[mid]!) / 2;
}

/**
 * Of the learners who joined at least `day` days ago, the share active on day `day` or later.
 * Null when nobody is old enough to be measured.
 */
export function retentionAt(profiles: readonly ProfileLite[], events: readonly EventLite[], day: number, now: Date): number | null {
  const cutoff = plus(sod(now), -day).getTime();
  const eligible = profiles.filter((p) => sod(new Date(p.created_at)).getTime() <= cutoff);
  if (eligible.length === 0) return null;
  const byUser = new Map<string, number[]>();
  for (const e of events) (byUser.get(e.user_id) ?? byUser.set(e.user_id, []).get(e.user_id)!).push(new Date(e.at).getTime());
  let kept = 0;
  for (const p of eligible) {
    const from = plus(sod(new Date(p.created_at)), day).getTime();
    if ((byUser.get(p.id) ?? []).some((t) => t >= from)) kept += 1;
  }
  return kept / eligible.length;
}

export interface SessionLite {
  session_id: string;
  device: string | null;
  occurred_at: string;
}

/** One entry per session (its first event), so a long session counts once. */
export function firstPerSession(rows: readonly SessionLite[]): SessionLite[] {
  const first = new Map<string, SessionLite>();
  for (const r of rows) {
    const had = first.get(r.session_id);
    if (!had || r.occurred_at < had.occurred_at) first.set(r.session_id, r);
  }
  return [...first.values()];
}

/** Share of sessions on phones and tablets (mobile) against desktop. Null when no session has a device. */
export function deviceShare(sessions: readonly SessionLite[]): { mobile: number; desktop: number } | null {
  const known = sessions.filter((s) => s.device !== null);
  if (known.length === 0) return null;
  const mobile = known.filter((s) => s.device !== "desktop").length / known.length;
  return { mobile, desktop: 1 - mobile };
}

/** 24 hourly session counts per week: index 0 is the last 7 days, then up to `weeks - 1` earlier weeks. */
export function sessionsByHour(sessions: readonly SessionLite[], mobile: boolean, now: Date, weeks = 2): number[][] {
  const out = Array.from({ length: weeks }, () => new Array<number>(24).fill(0));
  const end = sod(now).getTime() + DAY;
  for (const s of sessions) {
    if ((s.device !== "desktop") !== mobile || s.device === null) continue;
    const t = new Date(s.occurred_at);
    const w = Math.floor((end - t.getTime()) / (7 * DAY));
    if (w >= 0 && w < weeks) out[w]![t.getHours()]! += 1;
  }
  return out;
}

const unitOf = new Map(PATHWAY_UNITS.flatMap((u) => u.nodes.map((n) => [n.id, u.id] as const)));
const unitTitle = new Map(PATHWAY_UNITS.map((u) => [u.id, u.title.replace(/^Unit \d+ . /, "")] as const));

export interface AttemptRow {
  at: string;
  nodeId: string | null;
}

/** Attempts per unit for this week, this month and this term (all cumulative). Only units with an attempt appear. */
export function attemptsByUnit(rows: readonly AttemptRow[], now: Date): { periods: { label: string; total: number; deltaPercent: number | null; compare: string }[]; units: { name: string; group: string; values: number[] }[] } {
  const today = sod(now);
  const ranges = [
    { label: "This week", compare: "vs last week", from: plus(today, -6), days: 7 },
    { label: "This month", compare: "vs last month", from: plus(today, -29), days: 30 },
    { label: "This term", compare: "vs last term", from: termStart(today), days: 0 },
  ];
  ranges[2]!.days = Math.round((today.getTime() - ranges[2]!.from.getTime()) / DAY) + 1;
  const perUnit = new Map<string, number[]>();
  const totals = [0, 0, 0];
  const before = [0, 0, 0];
  for (const r of rows) {
    const t = sod(new Date(r.at));
    const unit = r.nodeId ? unitOf.get(r.nodeId) : undefined;
    ranges.forEach((g, i) => {
      if (t >= g.from && t <= today) {
        totals[i]! += 1;
        if (unit) {
          const v = perUnit.get(unit) ?? [0, 0, 0];
          v[i]! += 1;
          perUnit.set(unit, v);
        }
      } else if (t >= plus(g.from, -g.days) && t < g.from) before[i]! += 1;
    });
  }
  return {
    periods: ranges.map((g, i) => ({ label: g.label, compare: g.compare, total: totals[i]!, deltaPercent: before[i]! > 0 ? (totals[i]! / before[i]! - 1) * 100 : null })),
    units: [...perUnit].filter(([, v]) => v[2]! > 0 || v[1]! > 0 || v[0]! > 0).map(([id, values]) => ({ name: unitTitle.get(id) ?? id, group: id, values })),
  };
}

/** Sign-ups per calendar month for one year, January first. */
export function monthlySignups(times: readonly string[], year: number): number[] {
  const out = new Array<number>(12).fill(0);
  for (const t of times) {
    const d = new Date(t);
    if (d.getFullYear() === year) out[d.getMonth()]! += 1;
  }
  return out;
}

/* ------------------------------------------------------------------ the fetch */

export interface LiveStats {
  /** Each key is true only when the query behind it returned rows we can trust. */
  live: Record<"users" | "signups" | "join" | "retention" | "device" | "sessions" | "attempts" | "seasonality" | "paying", boolean>;
  totalLearners: number;
  active7: number;
  paying: number | null;
  signups: { series: Point[]; previous: number };
  join: { hour: number; weekday: string; medianDays: number | null } | null;
  retention: { d1: number | null; d7: number | null; d30: number | null };
  device: { mobile: number; desktop: number } | null;
  sessions: { desktop: number[][]; mobile: number[][] } | null;
  attempts: ReturnType<typeof attemptsByUnit> | null;
  seasonality: { year: number; values: number[] }[];
}

export type StatsResult = { ok: true; data: LiveStats; fetchedAt: Date } | { ok: false; reason: "no-supabase" | "signed-out" | "blocked" | "error" };

export async function fetchStats(supabase: SupabaseClient | null, now: Date): Promise<StatsResult> {
  if (supabase === null) return { ok: false, reason: "no-supabase" };
  try {
    const { data: auth } = await supabase.auth.getUser();
    if (!auth.user) return { ok: false, reason: "signed-out" };
    const since90 = plus(sod(now), -90).toISOString();
    const since28 = plus(sod(now), -28).toISOString();
    const [profs, evs, atts, sess, ents] = await Promise.all([
      fetchAll<ProfileLite>((a, b) => supabase.from("profiles").select("id,created_at").order("created_at", { ascending: false }).range(a, b)),
      fetchAll<EventLite>((a, b) => supabase.from("progress_events").select("user_id,kind,at").gte("at", since90).order("at", { ascending: false }).range(a, b)),
      fetchAll<{ at: string; node: string | null }>((a, b) => supabase.from("progress_events").select("at,node:event->>nodeId").eq("kind", "attempt").gte("at", plus(sod(now), -120).toISOString()).order("at", { ascending: false }).range(a, b)),
      fetchAll<SessionLite>((a, b) => supabase.from("analytics_events").select("session_id,device,occurred_at").gte("occurred_at", since28).order("occurred_at", { ascending: false }).range(a, b)),
      fetchAll<{ user_id: string; status: string; access_until: string | null }>((a, b) => supabase.from("entitlements").select("user_id,status,access_until").range(a, b)),
    ]);
    if (profs.error && evs.error) return { ok: false, reason: "blocked" };

    const profileTimes = profs.rows.map((p) => p.created_at);
    const week = plus(sod(now), -6).getTime();
    const sessions = sess.error ? [] : firstPerSession(sess.rows);
    const dev = deviceShare(sessions);
    const entsOk = !ents.error && ents.rows.length > 0 && new Set(ents.rows.map((r) => r.user_id)).size > 1;
    const isPro = (r: { status: string; access_until: string | null }) => ["active", "trialing", "complete"].includes(r.status) && (r.access_until === null || new Date(r.access_until) > now);
    const attempts = atts.error ? null : attemptsByUnit(atts.rows.map((r) => ({ at: r.at, nodeId: r.node })), now);
    const years = [now.getFullYear() - 1, now.getFullYear()].map((year) => ({ year, values: monthlySignups(profileTimes, year) })).filter((y) => y.values.some((v) => v > 0));
    const bj = bestJoinTime(profileTimes);
    const ok = !profs.error;
    const evOk = !evs.error && !profs.error;

    return {
      ok: true,
      fetchedAt: now,
      data: {
        live: {
          users: ok,
          signups: ok,
          join: ok && bj !== null,
          retention: evOk,
          device: dev !== null,
          sessions: dev !== null,
          attempts: attempts !== null && attempts.periods[2]!.total > 0,
          seasonality: ok && years.length > 0,
          paying: entsOk,
        },
        totalLearners: profs.rows.length,
        active7: new Set(evs.rows.filter((e) => new Date(e.at).getTime() >= week).map((e) => e.user_id)).size,
        paying: entsOk ? new Set(ents.rows.filter(isPro).map((r) => r.user_id)).size : null,
        signups: signupSeries(profileTimes, now),
        join: bj ? { hour: bj.hour, weekday: bj.weekday, medianDays: evOk ? medianDaysToFirstLesson(profs.rows, evs.rows) : null } : null,
        retention: evOk ? { d1: retentionAt(profs.rows, evs.rows, 1, now), d7: retentionAt(profs.rows, evs.rows, 7, now), d30: retentionAt(profs.rows, evs.rows, 30, now) } : { d1: null, d7: null, d30: null },
        device: dev,
        sessions: dev ? { desktop: sessionsByHour(sessions, false, now), mobile: sessionsByHour(sessions, true, now) } : null,
        attempts,
        seasonality: years,
      },
    };
  } catch {
    return { ok: false, reason: "error" };
  }
}
