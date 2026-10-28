/**
 * Admin statistics board. Staff only; the page that mounts it must sit behind
 * the same AdminGate as AdminViewer. It is the default export so it can be
 * React.lazy-imported as its own chunk and never enters the #/app entry.
 *
 * The four cards are components/ui/analytics-bento.tsx (SVG, no chart
 * library) given Blueberry meanings:
 *   1. New sign-ups: 30 daily points, count and change versus the 30 days before.
 *   2. Sessions by hour of day: desktop against mobile, this week against prior weeks.
 *   3. Where learners spend attempts: by unit, with a week / month / term switch,
 *      and a table of flagged-question counts per unit.
 *   4. Exam seasonality: sign-ups per calendar month. Exams fall at about the same
 *      time for everyone, so a few hundred accounts arrive inside ~4 months;
 *      this shows when, so the owner can plan for it.
 * Above them, a strip of user, acquisition-cost, join/stay and device figures.
 *
 * DATA CONTRACT (`AdminStatsData` below). The real source is the Supabase views
 * analytics_* (security_invoker, revoked from the API roles). They need a
 * staff-only server function that does NOT exist yet, which must return one
 * `AdminStatsData` with source "live":
 *   - signups.series: sign-ups per day for the last 30 days, oldest first, and
 *     signups.previous30: the total for the 30 days before, for the change figure.
 *   - sessions.desktop / mobile: 24 hourly counts (say in `sessions.timezone`
 *     which timezone); index 0 is the current week, then up to 3 prior weeks.
 *     Device comes from the session user agent.
 *   - attempts.periods (week, month, term) and attempts.units[].values in the same
 *     order; attempts.flagged is the count of flagged questions per unit.
 *   - seasonality.terms[]: 12 monthly sign-up counts per academic year.
 *   - users: total, active in 7 days, paying, plus cac (spend / paying
 *     accounts won in the period, null until spend is logged) and the join/stay
 *     figures (best join hour and weekday, median days from sign-up to first
 *     lesson, retention at day 1, 7 and 30 as 0..1).
 * Until it exists the page passes `sampleAdminStats`, which the board labels
 * "Sample data, not live" and which must never be presented as real.
 */
import { AnalyticsBento, type Point } from "@/components/ui/analytics-bento";
import { cn } from "@/lib/utils";

export interface AdminStatsData {
  /** "sample" shows the Sample data chip. Only the server function may set "live". */
  source: "sample" | "live";
  /** Human text, e.g. "Updated 09:41". */
  asOf: string;
  users: {
    total: number;
    activeLast7Days: number;
    paying: number;
    /** Acquisition cost per paying account, plain number; null until spend is logged. */
    cac: number | null;
    /** What the cac number is measured in, shown beside it. Empty string for none. */
    cacUnit: string;
  };
  joinAndStay: {
    bestJoinHour: number;
    bestJoinWeekday: string;
    medianDaysToFirstLesson: number;
    /** 0..1 */
    retentionDay1: number;
    retentionDay7: number;
    retentionDay30: number;
  };
  device: { desktopShare: number; mobileShare: number };
  signups: { series: Point[]; previous30: number };
  sessions: {
    timezone: string;
    /** 24 hourly counts; index 0 is the current week, then prior weeks. */
    desktop: number[][];
    mobile: number[][];
  };
  attempts: {
    groups: { id: string; name: string; color: string; ink?: "dark" | "light" }[];
    periods: { label: string; total: number; deltaPercent: number }[];
    units: { name: string; group: string; values: number[] }[];
    flagged: { unit: string; flagged: number; reviewed: number }[];
  };
  seasonality: {
    terms: { label: string; values: number[]; peakNote: string }[];
  };
}

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

const pct = (n: number): string => `${n >= 0 ? "+" : "-"}${Math.abs(Math.round(n))}%`;
const share = (n: number): string => `${Math.round(n * 100)}%`;
const hourLabel = (h: number): string => `${String(h).padStart(2, "0")}:00`;
const sum = (a: number[]): number => a.reduce((x, y) => x + y, 0);
const argMax = (a: number[]): number => a.reduce((best, v, i) => (v > a[best] ? i : best), 0);
const argMin = (a: number[]): number => a.reduce((best, v, i) => (v < a[best] ? i : best), 0);

/** Deterministic wobble so the sample looks like data without Math.random. */
const wob = (i: number, k: number): number => 1 + 0.12 * Math.sin(i * 1.7 + k) + 0.07 * Math.sin(i * 0.6 + k * 3);

const sampleDays = Array.from({ length: 30 }, (_, i): Point => ({
  label: `Day ${i + 1}`,
  value: Math.round((9 + i * 0.55) * wob(i, 1)),
}));
const hourCurve = (h: number, peak: number): number => Math.exp(-((h - peak) ** 2) / 18);
const hours = (peak: number, scale: number, k: number): number[] =>
  Array.from({ length: 24 }, (_, h) => Math.round((4 + scale * (hourCurve(h, peak) + 0.5 * hourCurve(h, peak + 9))) * wob(h, k)));
const monthCurve = [6, 14, 38, 52, 30, 8, 5, 22, 64, 71, 44, 18];

/** Invented numbers for layout and review only. Not live. */
export const sampleAdminStats: AdminStatsData = {
  source: "sample",
  asOf: "Invented numbers for layout review",
  users: { total: 640, activeLast7Days: 212, paying: 88, cac: 14, cacUnit: "per paying account" },
  joinAndStay: {
    bestJoinHour: 21,
    bestJoinWeekday: "Sunday",
    medianDaysToFirstLesson: 1,
    retentionDay1: 0.62,
    retentionDay7: 0.38,
    retentionDay30: 0.21,
  },
  device: { desktopShare: 0.41, mobileShare: 0.59 },
  signups: { series: sampleDays, previous30: sum(sampleDays.map((p) => p.value)) - 60 },
  sessions: {
    timezone: "local time",
    desktop: [hours(15, 46, 1), hours(15, 40, 2)],
    mobile: [hours(21, 70, 3), hours(21, 62, 4)],
  },
  attempts: {
    groups: [
      { id: "found", name: "Foundations", color: "#c9bdfb", ink: "dark" },
      { id: "react", name: "Reactions", color: "#9fd6c4", ink: "dark" },
      { id: "synth", name: "Synthesis", color: "#f6c98d", ink: "dark" },
    ],
    periods: [
      { label: "This week", total: 4120, deltaPercent: 9 },
      { label: "This month", total: 15980, deltaPercent: 14 },
      { label: "This term", total: 61400, deltaPercent: 22 },
    ],
    units: [
      { name: "Acids and bases", group: "found", values: [820, 3100, 11800] },
      { name: "Structure and bonding", group: "found", values: [610, 2400, 9300] },
      { name: "Stereochemistry", group: "found", values: [540, 2150, 8700] },
      { name: "Substitution", group: "react", values: [700, 2700, 10400] },
      { name: "Elimination", group: "react", values: [430, 1700, 6600] },
      { name: "Carbonyls", group: "react", values: [520, 2050, 8100] },
      { name: "Grignard", group: "synth", values: [300, 1180, 4600] },
      { name: "Multi-step synthesis", group: "synth", values: [200, 700, 1900] },
    ],
    flagged: [
      { unit: "Stereochemistry", flagged: 14, reviewed: 9 },
      { unit: "Carbonyls", flagged: 11, reviewed: 6 },
      { unit: "Substitution", flagged: 7, reviewed: 7 },
      { unit: "Multi-step synthesis", flagged: 5, reviewed: 1 },
    ],
  },
  seasonality: {
    terms: [
      { label: "This year", values: monthCurve, peakNote: "Sep-Oct and Mar-Apr" },
      { label: "Last year", values: monthCurve.map((v, i) => Math.round(v * 0.7 * wob(i, 9))), peakNote: "Sep-Oct and Mar-Apr" },
    ],
  },
};

function Stat({ label, value, note }: { label: string; value: string; note?: string }) {
  return (
    <div className="min-w-0 rounded-2xl border border-border bg-card p-4 text-card-foreground">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="mt-1 text-2xl font-bold leading-none tabular-nums">{value}</div>
      {note && <div className="mt-1.5 text-xs text-muted-foreground">{note}</div>}
    </div>
  );
}

export function AnalyticsBoard({ data, className }: { data: AdminStatsData; className?: string }) {
  const { users, joinAndStay: js, device, signups, sessions, attempts, seasonality } = data;
  const signupTotal = sum(signups.series.map((p) => p.value));
  const signupDelta = signups.previous30 > 0 ? ((signupTotal - signups.previous30) / signups.previous30) * 100 : 0;
  const peakHour = argMax(sessions.mobile[0]);
  const sessionTotal = sum(sessions.desktop[0]) + sum(sessions.mobile[0]);
  const prior = sessions.desktop.slice(1).concat(sessions.mobile.slice(1));
  const priorAvg = prior.length ? sum(prior.map(sum)) / (prior.length / 2) : 0;
  const sessionDelta = priorAvg > 0 ? ((sessionTotal - priorAvg) / priorAvg) * 100 : 0;
  const isSample = data.source === "sample";

  return (
    <div className={cn("mx-auto w-full max-w-[1320px] px-4 py-6 sm:px-6", className)}>
      <header className="mb-5 flex flex-wrap items-center gap-3">
        <h1 className="m-0 font-[family-name:var(--font-display)] text-2xl font-extrabold tracking-tight text-foreground">
          Statistics
        </h1>
        {isSample && (
          <span
            data-testid="sample-chip"
            className="inline-flex min-h-8 items-center rounded-full border border-amber-500/60 bg-amber-100 px-3 text-xs font-bold text-amber-950 dark:bg-amber-400/20 dark:text-amber-200"
          >
            Sample data, not live
          </span>
        )}
        <span className="text-sm text-muted-foreground">{data.asOf}</span>
      </header>

      <section aria-label="Users, acquisition cost, join and stay, device" className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        <Stat label="Learners" value={users.total.toLocaleString("en-US")} note={`${users.activeLast7Days.toLocaleString("en-US")} active in 7 days`} />
        <Stat label="Paying" value={users.paying.toLocaleString("en-US")} note={`${share(users.total ? users.paying / users.total : 0)} of learners`} />
        <Stat
          label="Acquisition cost (CAC)"
          value={users.cac === null ? "Not logged" : String(users.cac)}
          note={users.cac === null ? "Needs spend entered" : users.cacUnit || undefined}
        />
        <Stat label="Most likely to join" value={hourLabel(js.bestJoinHour)} note={`${js.bestJoinWeekday} peak, first lesson in ${js.medianDaysToFirstLesson} day median`} />
        <Stat label="Stay: day 1, 7, 30" value={`${share(js.retentionDay1)} / ${share(js.retentionDay7)} / ${share(js.retentionDay30)}`} note="Still active after joining" />
        <Stat label="Device" value={`${share(device.mobileShare)} mobile`} note={`${share(device.desktopShare)} desktop`} />
      </section>

      <AnalyticsBento
        currency=""
        credit={false}
        revenue={{
          label: "New sign-ups",
          caption: "Last 30 days",
          unit: "Sign-ups",
          value: signupTotal,
          delta: pct(signupDelta),
          note: "vs the 30 days before",
          series: signups.series,
        }}
        sessions={{
          label: "Sessions by hour",
          value: sessionTotal,
          delta: pct(sessionDelta),
          note: `Mobile peaks at ${hourLabel(peakHour)} (${sessions.timezone})`,
          desktop: sessions.desktop,
          mobile: sessions.mobile,
          labels: { desktop: "Desktop", mobile: "Mobile", prior: "Prior weeks", current: "this week" },
        }}
        categories={{
          title: "Where learners spend attempts",
          groups: attempts.groups,
          periods: attempts.periods.map((p, i) => ({
            label: p.label,
            total: p.total,
            delta: pct(p.deltaPercent),
            compare: i === 0 ? "vs last week" : i === 1 ? "vs last month" : "vs last term",
          })),
          items: attempts.units,
          table: {
            columns: ["Flagged questions", "Flagged", "Reviewed"],
            rows: attempts.flagged.map((f) => ({ label: f.unit, values: [String(f.flagged), String(f.reviewed)] })),
          },
        }}
        seasonality={{
          title: "Exam seasonality",
          unit: "Sign-ups",
          switchLabel: "Academic year",
          axis: MONTHS,
          years: seasonality.terms.map((t) => ({
            label: t.label,
            values: t.values,
            stats: [
              { label: "Busiest month", value: t.values[argMax(t.values)], note: MONTHS[argMax(t.values)] },
              { label: "Sign-ups in year", value: sum(t.values), note: "all months" },
            ],
            rows: [
              { label: "Exam months", value: t.peakNote },
              { label: "Quietest month", value: MONTHS[argMin(t.values)] },
            ],
          })),
        }}
        colors={{ revenue: ["#7c66ee", "#5a3fd8"], desktop: ["#7c66ee", "#5a3fd8"], mobile: ["#f59e0b", "#ea580c"], radar: "#7c66ee" }}
      />
    </div>
  );
}

/** The lazy page: sample data until the staff-only server function exists. */
export default function StatsBoardPage() {
  return <AnalyticsBoard data={sampleAdminStats} />;
}
