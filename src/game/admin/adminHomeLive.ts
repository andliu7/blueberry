/**
 * Live numbers for the admin home, and the date period that scopes them.
 *
 * WHAT IS REAL. A staff session can read three things through RLS today:
 *   profiles          (profiles_select_staff)            sign-ups, by created_at
 *   progress_events   (progress_events_select_staff)     lessons started, finished, who is active
 *   analytics_events  (analytics_events_select_staff)    visits (screen_view, distinct anon_id)
 * and one thing only after the owner applies
 * supabase/migrations/20261029120000_entitlements_staff_read.sql:
 *   entitlements      who is on Pro, and when they bought
 * Money amounts are not stored anywhere the client can read (Stripe holds them), so
 * monthly revenue, payouts, invoices and system status stay sample, and each of those
 * cards says so. Nothing here is ever shown as real unless a query returned it.
 *
 * Pure builders first (tested in adminHomeLive.test.ts), then the one fetch.
 */
import type { SupabaseClient } from "@supabase/supabase-js";
import { PATHWAY_UNITS } from "../demo/pathwayMap";
import { sampleAdminHome, type AdminHomeData, type FeedItem, type FunnelStage, type StatCell, type TodayBlock } from "./adminHomeData";

/* ------------------------------------------------------------------ period */

/** Whole days, both ends included, local time. */
export interface Period {
  from: Date;
  to: Date;
}

const DAY = 86_400_000;
const sod = (d: Date): Date => new Date(d.getFullYear(), d.getMonth(), d.getDate());
const plus = (d: Date, n: number): Date => new Date(d.getFullYear(), d.getMonth(), d.getDate() + n);

export function periodDays(p: Period): number {
  return Math.round((sod(p.to).getTime() - sod(p.from).getTime()) / DAY) + 1;
}

/** The same number of days, ending the day before `p` starts. */
export function previousPeriod(p: Period): Period {
  const n = periodDays(p);
  return { from: plus(p.from, -n), to: plus(p.from, -1) };
}

/** Start of the current term: the later of 24 Aug and 12 Jan that has already passed. */
export function termStart(now: Date): Date {
  const y = now.getFullYear();
  const cands = [new Date(y, 7, 24), new Date(y, 0, 12), new Date(y - 1, 7, 24)].filter((d) => d <= now);
  return cands.sort((a, b) => b.getTime() - a.getTime())[0]!;
}

export type PresetId = "today" | "7" | "30" | "term";
export const PRESETS: ReadonlyArray<{ id: PresetId; label: string }> = [
  { id: "today", label: "Today" },
  { id: "7", label: "7 days" },
  { id: "30", label: "30 days" },
  { id: "term", label: "This term" },
];

export function presetPeriod(id: PresetId, now: Date): Period {
  const t = sod(now);
  if (id === "today") return { from: t, to: t };
  if (id === "7") return { from: plus(t, -6), to: t };
  if (id === "30") return { from: plus(t, -29), to: t };
  return { from: termStart(t), to: t };
}

export function periodLabel(p: Period, now: Date): string {
  const f = (d: Date) => d.toLocaleDateString("en-US", { month: "short", day: "numeric", ...(d.getFullYear() !== now.getFullYear() ? { year: "numeric" } : {}) });
  const n = periodDays(p);
  if (n === 1) return sod(p.from).getTime() === sod(now).getTime() ? "Today" : f(p.from);
  return `${f(p.from)} to ${f(p.to)}`;
}

/* ------------------------------------------------------------------ pure builders */

/** Counts per day across `p`, oldest first. Times outside the period are ignored. */
export function dailyCounts(times: readonly string[], p: Period): number[] {
  const n = periodDays(p);
  const out = new Array<number>(n).fill(0);
  const start = sod(p.from).getTime();
  for (const t of times) {
    const i = Math.floor((sod(new Date(t)).getTime() - start) / DAY);
    if (i >= 0 && i < n) out[i]! += 1;
  }
  return out;
}

export interface EventLite {
  user_id: string;
  kind: string;
  at: string;
  node?: string | null;
}

const inPeriod = (iso: string, p: Period): boolean => {
  const t = new Date(iso).getTime();
  return t >= sod(p.from).getTime() && t < sod(p.to).getTime() + DAY;
};

/** Distinct users per day across `p`. */
export function dailyDistinct(events: readonly EventLite[], p: Period): number[] {
  const n = periodDays(p);
  const sets = Array.from({ length: n }, () => new Set<string>());
  const start = sod(p.from).getTime();
  for (const e of events) {
    const i = Math.floor((sod(new Date(e.at)).getTime() - start) / DAY);
    if (i >= 0 && i < n) sets[i]!.add(e.user_id);
  }
  return sets.map((s) => s.size);
}

export function activeUsers(events: readonly EventLite[], p: Period): Set<string> {
  return new Set(events.filter((e) => inPeriod(e.at, p)).map((e) => e.user_id));
}

/** Users with a given event kind in the period. */
export function usersWith(events: readonly EventLite[], p: Period, kind: string): Set<string> {
  return new Set(events.filter((e) => e.kind === kind && inPeriod(e.at, p)).map((e) => e.user_id));
}

/** Users who showed up on two or more different days within the period. */
export function returningUsers(events: readonly EventLite[], p: Period): Set<string> {
  const days = new Map<string, Set<number>>();
  for (const e of events) {
    if (!inPeriod(e.at, p)) continue;
    const d = sod(new Date(e.at)).getTime();
    const s = days.get(e.user_id) ?? new Set<number>();
    s.add(d);
    days.set(e.user_id, s);
  }
  return new Set([...days].filter(([, s]) => s.size >= 2).map(([u]) => u));
}

const change = (now: number, before: number): number => (before === 0 ? (now === 0 ? 0 : 1) : now / before - 1);

/** Pad or trim a daily series to the last `n` points, for the little line. */
export function lastN(series: readonly number[], n: number): number[] {
  const tail = series.slice(Math.max(0, series.length - n));
  return tail.length >= n ? tail : [...new Array<number>(n - tail.length).fill(0), ...tail];
}

/** Each stage can only be as big as the one before it. */
export function capFunnel(counts: readonly number[]): number[] {
  const out: number[] = [];
  for (const c of counts) out.push(out.length === 0 ? c : Math.min(c, out[out.length - 1]!));
  return out;
}

export interface FunnelInput {
  visits: number | null;
  signups: number;
  started: number;
  finished: number;
  returned: number;
  paid: number | null;
}
const rate = (n: number, d: number): number => (d > 0 ? n / d : 0);

export function buildFunnel(now: FunnelInput, before: FunnelInput): FunnelStage[] {
  const all: Array<{ id: string; label: string; pick: (i: FunnelInput) => number | null }> = [
    { id: "visited", label: "Visited the site", pick: (i) => i.visits },
    { id: "signed", label: "Signed up", pick: (i) => i.signups },
    { id: "l1start", label: "Started a lesson", pick: (i) => i.started },
    { id: "l1done", label: "Finished a lesson", pick: (i) => i.finished },
    { id: "day2", label: "Came back another day", pick: (i) => i.returned },
    { id: "paid", label: "Went Pro", pick: (i) => i.paid },
  ];
  const stages = all.filter((s) => s.pick(now) !== null);
  const cur = capFunnel(stages.map((s) => s.pick(now)!));
  const prev = capFunnel(stages.map((s) => s.pick(before) ?? 0));
  return stages.map((s, i) => ({
    id: s.id,
    label: s.label,
    count: cur[i]!,
    delta: i === 0 ? 0 : rate(cur[i]!, cur[i - 1]!) - rate(prev[i]!, prev[i - 1]!),
  }));
}

export function buildToday(profiles: readonly string[], events: readonly EventLite[], now: Date): TodayBlock {
  const day: Period = { from: sod(now), to: sod(now) };
  const todays = events.filter((e) => inPeriod(e.at, day));
  const recent = todays.filter((e) => now.getTime() - new Date(e.at).getTime() <= 15 * 60_000);
  return {
    learningNow: new Set(recent.map((e) => e.user_id)).size,
    signupsToday: profiles.filter((t) => inPeriod(t, day)).length,
    lessonsFinishedToday: todays.filter((e) => e.kind === "node_cleared").length,
    activeToday: new Set(todays.map((e) => e.user_id)).size,
  };
}

const titles = new Map(PATHWAY_UNITS.flatMap((u) => u.nodes.map((n) => [n.id, n.title] as const)));

/** Newest first, no names: this page counts people, it does not list them. */
export function buildFeed(profiles: readonly string[], events: readonly EventLite[], p: Period, now: Date): FeedItem[] {
  const items: Array<FeedItem & { t: number }> = [];
  for (const t of profiles) {
    if (!inPeriod(t, p)) continue;
    const ms = new Date(t).getTime();
    items.push({ id: `s${ms}`, kind: "signup", text: "A new learner signed up", minutesAgo: (now.getTime() - ms) / 60_000, t: ms });
  }
  for (const e of events) {
    if (e.kind !== "node_cleared" || !inPeriod(e.at, p)) continue;
    const ms = new Date(e.at).getTime();
    const title = e.node ? titles.get(e.node) : undefined;
    items.push({ id: `c${ms}${e.user_id.slice(0, 4)}`, kind: "lesson", text: title ? `A learner finished ${title}` : "A learner finished a lesson", minutesAgo: (now.getTime() - ms) / 60_000, t: ms });
  }
  return items.sort((a, b) => b.t - a.t).slice(0, 8).map(({ t: _t, ...rest }) => rest);
}

/* ------------------------------------------------------------------ sample, scoped to a period */

/** The sample page for any period: same made-up shape, cut to the days chosen. */
export function sampleView(base: AdminHomeData, p: Period, now: Date): AdminHomeData {
  const n = periodDays(p);
  const endAgo = Math.round((sod(now).getTime() - sod(p.to).getTime()) / DAY);
  const slice = (series: number[]) => {
    const end = series.length - Math.max(0, endAgo);
    return series.slice(Math.max(0, end - n), Math.max(end, 0));
  };
  const signups = slice(base.signups);
  const signupsBefore = slice(base.signupsBefore).length ? slice(base.signupsBefore) : base.signupsBefore.slice(0, n);
  const total = signups.reduce((a, b) => a + b, 0);
  const totalBefore = signupsBefore.reduce((a, b) => a + b, 0);
  const k = Math.min(1.6, Math.max(0.05, n / 30));
  const scale = (c: number) => Math.max(1, Math.round(c * k));
  const stats = base.stats.map((s): StatCell => (s.id === "signups" ? { ...s, value: total, delta: change(total, totalBefore), hint: "In the chosen period" } : s.id === "active" ? { ...s, value: scale(s.value) } : s));
  const feed = endAgo > 0 ? [] : base.feed;
  return { ...base, signups, signupsBefore, stats, funnel: base.funnel.map((f) => ({ ...f, count: scale(f.count) })), feed };
}

/* ------------------------------------------------------------------ the fetch */

export type LiveResult =
  | { ok: true; data: AdminHomeData; fetchedAt: Date }
  | { ok: false; reason: "no-supabase" | "signed-out" | "blocked" | "error" };

const PAGE = 1000;
const CAP = 8000;

async function fetchAll<T>(make: (from: number, to: number) => PromiseLike<{ data: unknown[] | null; error: unknown }>): Promise<{ rows: T[]; error: boolean }> {
  const rows: T[] = [];
  for (let i = 0; i < CAP; i += PAGE) {
    const res = await make(i, i + PAGE - 1);
    if (res.error) return { rows, error: true };
    const got = (res.data ?? []) as T[];
    rows.push(...got);
    if (got.length < PAGE) break;
  }
  return { rows, error: false };
}

/** Pull real figures for `period` (and the one before it) and lay them over the sample page. */
export async function fetchLive(supabase: SupabaseClient | null, period: Period, now: Date): Promise<LiveResult> {
  if (supabase === null) return { ok: false, reason: "no-supabase" };
  try {
    const { data: auth } = await supabase.auth.getUser();
    if (!auth.user) return { ok: false, reason: "signed-out" };
    const prev = previousPeriod(period);
    // Fetch from the start of the earlier of (previous period, today) so the Today block and the comparison share one pull.
    const since = new Date(Math.min(sod(prev.from).getTime(), plus(period.to, -13).getTime(), sod(now).getTime())).toISOString();

    const [profs, evs, visitRes, ents] = await Promise.all([
      fetchAll<{ created_at: string }>((a, b) => supabase.from("profiles").select("created_at").gte("created_at", since).order("created_at", { ascending: false }).range(a, b)),
      fetchAll<EventLite>((a, b) => supabase.from("progress_events").select("user_id,kind,at,node:event->>nodeId").gte("at", since).order("at", { ascending: false }).range(a, b)),
      fetchAll<{ anon_id: string; occurred_at: string }>((a, b) => supabase.from("analytics_events").select("anon_id,occurred_at").eq("name", "screen_view").gte("occurred_at", since).range(a, b)),
      fetchAll<{ user_id: string; status: string; created_at: string; access_until: string | null }>((a, b) => supabase.from("entitlements").select("user_id,status,created_at,access_until").range(a, b)),
    ]);
    if (profs.error && evs.error) return { ok: false, reason: "blocked" };

    const profTimes = profs.rows.map((r) => r.created_at);
    const events = evs.rows;
    const live: string[] = [];
    const base = sampleAdminHome;

    // Visits are only trusted when the staff policy let rows through.
    const visitsOf = (p: Period): number | null => (visitRes.error || visitRes.rows.length === 0 ? null : new Set(visitRes.rows.filter((v) => inPeriod(v.occurred_at, p)).map((v) => v.anon_id)).size);

    // Entitlements: staff read only after the migration. Own-only rows mean it is not applied.
    const entsOk = !ents.error && ents.rows.length > 0 && new Set(ents.rows.map((r) => r.user_id)).size > 1;
    const isPro = (r: { status: string; access_until: string | null }) => ["active", "trialing", "complete"].includes(r.status) && (r.access_until === null || new Date(r.access_until) > now);
    const paidIn = (p: Period) => (entsOk ? new Set(ents.rows.filter((r) => isPro(r) && inPeriod(r.created_at, p)).map((r) => r.user_id)).size : null);
    const payingNow = entsOk ? new Set(ents.rows.filter(isPro).map((r) => r.user_id)).size : null;

    const signupsNow = dailyCounts(profTimes, period);
    const signupsPrev = dailyCounts(profTimes, prev);
    const sumNow = signupsNow.reduce((a, b) => a + b, 0);
    const sumPrev = signupsPrev.reduce((a, b) => a + b, 0);
    if (!profs.error) live.push("growth", "stat:signups");

    const activeNow = activeUsers(events, period).size;
    const activePrev = activeUsers(events, prev).size;
    const activeSpark = lastN(dailyDistinct(events, { from: plus(period.to, -13), to: period.to }), 14);
    if (!evs.error) live.push("stat:active", "today", "feed");

    const stats = base.stats.map((s): StatCell => {
      if (s.id === "signups" && !profs.error) return { ...s, value: sumNow, delta: change(sumNow, sumPrev), spark: dailyCounts(profTimes, { from: plus(period.to, -13), to: period.to }), hint: "New accounts in the chosen period" };
      if (s.id === "active" && !evs.error) return { ...s, value: activeNow, delta: change(activeNow, activePrev), spark: activeSpark, hint: "Did a lesson in the chosen period" };
      if (s.id === "paying" && payingNow !== null) {
        live.push("stat:paying");
        return { ...s, value: payingNow, delta: change(paidIn(period) ?? 0, paidIn(prev) ?? 0), spark: new Array<number>(14).fill(payingNow), hint: "On Pro right now" };
      }
      return s;
    });

    const funnelOk = !profs.error && !evs.error;
    const fin = (p: Period): FunnelInput => ({
      visits: visitsOf(p),
      signups: dailyCounts(profTimes, p).reduce((a, b) => a + b, 0),
      started: usersWith(events, p, "node_started").size,
      finished: usersWith(events, p, "node_cleared").size,
      returned: returningUsers(events, p).size,
      paid: paidIn(p),
    });
    const funnel = funnelOk ? buildFunnel(fin(period), fin(prev)) : base.funnel;
    if (funnelOk) live.push("funnel");

    const sampleDays = sampleView(base, period, now);
    const data: AdminHomeData = {
      ...sampleDays,
      source: live.length > 0 ? "mixed" : "sample",
      liveParts: live,
      asOf: `Updated ${now.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}`,
      signups: profs.error ? sampleDays.signups : signupsNow,
      signupsBefore: profs.error ? sampleDays.signupsBefore : signupsPrev,
      stats,
      funnel,
      today: evs.error ? base.today : buildToday(profTimes, events, now),
      feed: evs.error ? sampleDays.feed : buildFeed(profTimes, events, period, now),
    };
    return { ok: true, data, fetchedAt: now };
  } catch {
    return { ok: false, reason: "error" };
  }
}
