/**
 * Admin statistics board (Learners). Staff only; the page that mounts it must sit behind
 * the same AdminGate as AdminViewer. Default export so it can be React.lazy-imported
 * as its own chunk and never enters the #/app entry.
 *
 * HONESTY RULE (owner, 29 Oct). Every tile is either real, with a footnote naming the
 * table it was counted from, or a "No data, example" tile: the headline reads "No data",
 * the graph is faded and shows shape only, and the footnote says what will feed it. No
 * guessed number is ever shown as a figure. The page fetches through statsLive.ts; the
 * example graphs below are invented shapes and are never printed as numbers.
 *
 * Sources, all read through staff RLS:
 *   Learners, sign-ups, join time, seasonality   profiles (created_at)
 *   Active, stay (day 1, 7, 30), first lesson    progress_events
 *   Where attempts go                            progress_events kind "attempt", grouped by unit
 *   Device, sessions by hour                     analytics_events (device, session_id)
 *   Paying                                       entitlements (needs the staff-read migration)
 * No source exists yet for: acquisition cost (ad spend is not logged) and flagged questions.
 */
import { useEffect, useState } from "react";
import { AnalyticsBento, type CardKey, type Point } from "@/components/ui/analytics-bento";
import { getSupabase } from "@/lib/supabase";
import { cn } from "@/lib/utils";
import { fetchStats, type LiveStats } from "./statsLive";
import { ExampleBadge, LiveBadge, SourceNote } from "./honesty";

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

const pct = (n: number): string => `${n >= 0 ? "+" : "-"}${Math.abs(Math.round(n))}%`;
const share = (n: number): string => `${Math.round(n * 100)}%`;
const hourLabel = (h: number): string => `${String(h).padStart(2, "0")}:00`;
const sum = (a: number[]): number => a.reduce((x, y) => x + y, 0);
const argMax = (a: number[]): number => a.reduce((best, v, i) => (v > a[best]! ? i : best), 0);
const argMin = (a: number[]): number => a.reduce((best, v, i) => (v < a[best]! ? i : best), 0);

/* ------------------------------------------------------------------ example shapes (never printed as numbers) */

const wob = (i: number, k: number): number => 1 + 0.12 * Math.sin(i * 1.7 + k) + 0.07 * Math.sin(i * 0.6 + k * 3);
const exampleDays: Point[] = Array.from({ length: 30 }, (_, i) => ({ label: `Day ${i + 1}`, value: Math.round((9 + i * 0.55) * wob(i, 1)) }));
const hourCurve = (h: number, peak: number): number => Math.exp(-((h - peak) ** 2) / 18);
const exampleHours = (peak: number, scale: number, k: number): number[] =>
  Array.from({ length: 24 }, (_, h) => Math.round((4 + scale * (hourCurve(h, peak) + 0.5 * hourCurve(h, peak + 9))) * wob(h, k)));
const exampleMonths = [6, 14, 38, 52, 30, 8, 5, 22, 64, 71, 44, 18];
const exampleGroups = [
  { id: "ex-a", name: "Example group A", color: "#c9bdfb", ink: "dark" as const },
  { id: "ex-b", name: "Example group B", color: "#9fd6c4", ink: "dark" as const },
];
const exampleUnits = ["One", "Two", "Three", "Four", "Five", "Six"].map((name, i) => ({
  name: `Example unit ${name}`,
  group: i % 2 ? "ex-b" : "ex-a",
  values: [800 - i * 90, 3000 - i * 350, 11000 - i * 1500],
}));

const GROUP_COLORS = ["#c9bdfb", "#9fd6c4", "#f6c98d", "#f3b6c6", "#a9c8f5", "#d9e3a1", "#e5c2f0", "#b7e0e8"];

/* ------------------------------------------------------------------ small pieces */

function Stat({ label, value, note, live, source, why }: { label: string; value: string; note?: string; live: boolean; source: string; why?: string }) {
  return (
    <div className={cn("min-w-0 rounded-2xl border bg-card p-4 text-card-foreground", live ? "border-border" : "border-dashed border-border")}>
      <div className="flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
        {label}
        {live ? <LiveBadge className="!ml-0" /> : <ExampleBadge className="!ml-0" />}
      </div>
      <div className={cn("mt-1 font-bold leading-none tabular-nums", live ? "text-2xl" : "text-xl text-muted-foreground")}>{live ? value : "No data"}</div>
      {live && note && <div className="mt-1.5 text-xs text-muted-foreground">{note}</div>}
      <SourceNote live={live} source={source} why={why} />
    </div>
  );
}

const stateOf = (live: boolean, source: string, why?: string): { example: boolean; badge: React.ReactNode; note: React.ReactNode } => ({
  example: !live,
  badge: live ? <LiveBadge className="!ml-0" /> : <ExampleBadge className="!ml-0" />,
  note: <SourceNote live={live} source={source} why={why} />,
});

/* ------------------------------------------------------------------ the board */

/** `live` null means nothing was read (signed out, blocked, no connection): every tile is an example. */
export function AnalyticsBoard({ live, notice, className }: { live: LiveStats | null; notice?: string; className?: string }) {
  const L = live?.live;
  const ok = (k: keyof LiveStats["live"]): boolean => L?.[k] === true;
  const anyLive = L !== undefined && Object.values(L).some(Boolean);

  const signups = ok("signups") ? live!.signups : { series: exampleDays, previous: 0 };
  const signupTotal = sum(signups.series.map((p) => p.value));
  const signupDelta = signups.previous > 0 ? pct(((signupTotal - signups.previous) / signups.previous) * 100) : "";

  const sess = ok("sessions") ? live!.sessions! : { desktop: [exampleHours(15, 46, 1), exampleHours(15, 40, 2)], mobile: [exampleHours(21, 70, 3), exampleHours(21, 62, 4)] };
  const sessionTotal = sum(sess.desktop[0]!) + sum(sess.mobile[0]!);
  const priorTotal = sess.desktop.length > 1 ? sum(sess.desktop[1]!) + sum(sess.mobile[1]!) : 0;
  const sessionDelta = priorTotal > 0 ? pct(((sessionTotal - priorTotal) / priorTotal) * 100) : "";
  const peakHour = argMax(sess.mobile[0]!);

  const att = ok("attempts") ? live!.attempts! : null;
  const groups = att ? att.units.map((u, i) => ({ id: u.group, name: u.name, color: GROUP_COLORS[i % GROUP_COLORS.length]!, ink: "dark" as const })) : exampleGroups;
  const periods = att
    ? att.periods.map((p) => ({ label: p.label, total: p.total, delta: p.deltaPercent === null ? "" : pct(p.deltaPercent), compare: p.deltaPercent === null ? "No earlier data" : p.compare }))
    : ["This week", "This month", "This term"].map((label) => ({ label, total: 0, delta: "", compare: "" }));
  const units = att ? att.units : exampleUnits;

  const seasonYears = ok("seasonality")
    ? live!.seasonality.map((y) => ({ label: String(y.year), values: y.values }))
    : [{ label: "Example", values: exampleMonths }];

  const retention = live?.retention;
  const stayText = ok("retention") && retention && (retention.d1 !== null || retention.d7 !== null || retention.d30 !== null)
    ? [retention.d1, retention.d7, retention.d30].map((v) => (v === null ? "n/a" : share(v))).join(" / ")
    : null;

  return (
    <div className={cn("mx-auto w-full max-w-[1320px] px-4 py-6 sm:px-6", className)}>
      <header className="mb-5 flex flex-wrap items-center gap-3">
        <h1 className="m-0 font-[family-name:var(--font-display)] text-2xl font-extrabold tracking-tight text-foreground">Learners</h1>
        {!anyLive && (
          <span
            data-testid="sample-chip"
            className="inline-flex min-h-8 items-center rounded-full border border-dashed border-border bg-card px-3 text-xs font-bold text-foreground"
          >
            No data, example
          </span>
        )}
        <span className="text-sm text-muted-foreground">
          {anyLive ? "Tiles marked Live are counted from the database. Tiles marked No data, example are shapes only." : (notice ?? "No admin session was read, so these are shapes only.")}
        </span>
      </header>

      <section aria-label="Users, acquisition cost, join and stay, device" className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        <Stat
          label="Learners"
          live={ok("users")}
          value={(live?.totalLearners ?? 0).toLocaleString("en-US")}
          note={`${(live?.active7 ?? 0).toLocaleString("en-US")} active in 7 days`}
          source="profiles (accounts) and progress_events (active in 7 days)"
        />
        <Stat
          label="Paying"
          live={ok("paying")}
          value={(live?.paying ?? 0).toLocaleString("en-US")}
          note={`${share(live && live.totalLearners ? (live.paying ?? 0) / live.totalLearners : 0)} of learners`}
          source="entitlements (active Pro)"
          why="Staff read of entitlements is a migration the owner has not applied."
        />
        <Stat label="Acquisition cost (CAC)" live={false} value="" source="logged ad spend" why="Spend is not logged anywhere yet." />
        <Stat
          label="Most likely to join"
          live={ok("join")}
          value={live?.join ? hourLabel(live.join.hour) : ""}
          note={live?.join ? `${live.join.weekday} peak${live.join.medianDays === null ? "" : `, first lesson in ${live.join.medianDays} ${live.join.medianDays === 1 ? "day" : "days"} median`}` : undefined}
          source="profiles (created_at, your local time)"
        />
        <Stat
          label="Stay: day 1, 7, 30"
          live={stayText !== null}
          value={stayText ?? ""}
          note="Active on that day or later, of learners old enough to measure"
          source="profiles and progress_events (last 90 days)"
        />
        <Stat
          label="Device"
          live={ok("device")}
          value={live?.device ? `${share(live.device.mobile)} mobile` : ""}
          note={live?.device ? `${share(live.device.desktop)} desktop, by session` : undefined}
          source="analytics_events (device, one per session, last 28 days)"
        />
      </section>

      <AnalyticsBento
        currency=""
        credit={false}
        cardState={{
          revenue: stateOf(ok("signups"), "profiles, created_at, counted per day", "No admin session was read."),
          sessions: stateOf(ok("sessions"), "analytics_events, first event of each session, by hour", "No sessions with a device recorded yet."),
          categories: stateOf(ok("attempts"), "progress_events kind attempt, grouped by pathway unit", "No attempts recorded yet. Flagged questions have no data source, so they are not listed."),
          seasonality: stateOf(ok("seasonality"), "profiles, created_at, counted per month", "No sign-ups to chart yet."),
        } satisfies Partial<Record<CardKey, ReturnType<typeof stateOf>>>}
        revenue={{
          label: "New sign-ups",
          caption: "Last 30 days",
          unit: "Sign-ups",
          value: signupTotal,
          delta: signupDelta,
          note: signupDelta ? "vs the 30 days before" : "No earlier data to compare",
          series: signups.series,
        }}
        sessions={{
          label: "Sessions by hour",
          value: sessionTotal,
          delta: sessionDelta,
          note: `Mobile peaks at ${hourLabel(peakHour)} (your local time)`,
          desktop: sess.desktop,
          mobile: sess.mobile,
          labels: { desktop: "Desktop", mobile: "Mobile", prior: "Prior week", current: "last 7 days" },
        }}
        categories={{
          title: "Where learners spend attempts",
          groups,
          periods,
          items: units,
        }}
        seasonality={{
          title: "Exam seasonality",
          unit: "Sign-ups",
          switchLabel: "Year",
          axis: MONTHS,
          years: seasonYears.map((t) => ({
            label: t.label,
            values: t.values,
            stats: [
              { label: "Busiest month", value: t.values[argMax(t.values)]!, note: MONTHS[argMax(t.values)]! },
              { label: "Sign-ups in year", value: sum(t.values), note: "all months" },
            ],
            rows: [{ label: "Quietest month", value: MONTHS[argMin(t.values)]! }],
          })),
        }}
        colors={{ revenue: ["#7c66ee", "#5a3fd8"], desktop: ["#7c66ee", "#5a3fd8"], mobile: ["#f59e0b", "#ea580c"], radar: "#7c66ee" }}
      />
    </div>
  );
}

const WHY: Record<string, string> = {
  "signed-out": "No admin session was read, so these are shapes only.",
  "no-supabase": "This build has no Supabase connection.",
  blocked: "The server did not let this account read the figures.",
  error: "The figures did not load.",
};

/** The lazy page: reads the live figures, and shows every tile as an example while it cannot. */
export default function StatsBoardPage() {
  const [live, setLive] = useState<LiveStats | null>(null);
  const [notice, setNotice] = useState<string>("Loading the figures.");
  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const res = await fetchStats(await getSupabase(), new Date());
      if (cancelled) return;
      if (res.ok) {
        setLive(res.data);
        setNotice("");
      } else {
        setLive(null);
        setNotice(WHY[res.reason] ?? WHY.error!);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);
  return <AnalyticsBoard live={live} notice={notice} />;
}
