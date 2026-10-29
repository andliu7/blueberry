/**
 * The admin home page's sample data (#/app/admin/home) and the small pure helpers it uses.
 *
 * EVERY NUMBER HERE IS MADE UP. The page shows none of them as a figure: a part with no
 * live source is a tile marked "No data, example" whose graph shows shape only. The real
 * source is a staff-only server function that does not exist yet (the analytics_* views
 * are revoked from the API roles on purpose); it must return one `AdminHomeData` with
 * source "live". Nothing in this file may ever be shown as real.
 *
 * The series are generated from a seeded wave, not Math.random, so a reload and a test
 * both see the same page.
 */

export interface StatCell {
  id: string;
  label: string;
  /** What the figure means, one plain line. */
  hint: string;
  value: number;
  /** "money" shows dollars, "count" a plain number. */
  kind: "count" | "money";
  /** Change versus the period before, as a fraction (0.12 is +12%). Null when the period before had nothing to compare with. */
  delta: number | null;
  /** 14 points for the little line. */
  spark: number[];
}

export interface FunnelStage {
  id: string;
  label: string;
  count: number;
  /** Change in the step's conversion versus the period before, in percentage points. */
  delta: number;
}

export type FeedKind = "signup" | "lesson" | "paid" | "flag" | "streak";
export interface FeedItem {
  id: string;
  kind: FeedKind;
  text: string;
  /** Minutes before "now". */
  minutesAgo: number;
}

export type ServiceState = "up" | "slow" | "down";
export interface Service {
  id: string;
  name: string;
  note: string;
  state: ServiceState;
  /** 30 daily ticks, oldest first: true is a clean day. */
  days: boolean[];
  /** Last incident, one line, or null. */
  lastIncident: string | null;
}
export interface Incident {
  id: string;
  service: string;
  when: string;
  text: string;
  minutes: number;
}

export type InvoiceStatus = "paid" | "pending" | "failed";
export interface Invoice {
  id: string;
  who: string;
  plan: string;
  date: string;
  cents: number;
  status: InvoiceStatus;
}

/** One row of the entitlements table. Stripe holds the amounts; the app stores none. */
export interface Purchase {
  id: string;
  plan: string;
  kind: "subscription" | "pass";
  status: string;
  /** ISO date of purchase. */
  at: string;
}

/** One row of the entitlements table. Stripe holds the amounts; the app stores none. */
export interface Purchase {
  id: string;
  plan: string;
  kind: "subscription" | "pass";
  status: string;
  /** ISO date of purchase. */
  at: string;
}

export interface Payout {
  id: string;
  label: string;
  due: string;
  cents: number;
  status: "scheduled" | "in transit" | "paid";
}

/** The "Today" block: what is happening right now. */
export interface TodayBlock {
  /** Distinct learners with any lesson activity in the last 15 minutes. */
  learningNow: number;
  signupsToday: number;
  lessonsFinishedToday: number;
  /** Learners who did something today. */
  activeToday: number;
}

export interface AdminHomeData {
  /** "sample" when nothing is real, "mixed" when only some parts are, "live" when every part is. */
  source: "sample" | "mixed" | "live";
  /** Ids of the parts that are real: "today", "growth", "funnel", "feed", "stat:active", "stat:signups", "stat:paying". Everything else is sample. */
  liveParts: string[];
  today: TodayBlock;
  asOf: string;
  /** Daily sign-ups, oldest first, 90 days. */
  signups: number[];
  /** The same 90 days one period earlier, for the dotted comparison line. */
  signupsBefore: number[];
  stats: StatCell[];
  funnel: FunnelStage[];
  feed: FeedItem[];
  services: Service[];
  incidents: Incident[];
  invoices: Invoice[];
  payouts: Payout[];
  /** Real purchase rows from the entitlements table (plan, status, date; no amounts, no names). Empty unless "billing" is a live part. */
  purchases: Purchase[];
}

function wave(n: number, base: number, amp: number, seed: number, trend = 0): number[] {
  const out: number[] = [];
  for (let i = 0; i < n; i += 1) {
    const w = Math.sin((i + seed) * 0.55) * 0.5 + Math.sin((i + seed * 3) * 1.37) * 0.5;
    out.push(Math.max(0, Math.round(base + trend * i + w * amp)));
  }
  return out;
}

export const sampleAdminHome: AdminHomeData = {
  source: "sample",
  liveParts: [],
  today: { learningNow: 7, signupsToday: 12, lessonsFinishedToday: 96, activeToday: 214 },
  asOf: "Sample, as of this build",
  signups: wave(90, 14, 6, 2, 0.12),
  signupsBefore: wave(90, 11, 5, 7, 0.08),
  stats: [
    {
      id: "active",
      label: "Active learners",
      hint: "Did a lesson in the last 7 days",
      value: 1284,
      kind: "count",
      delta: 0.084,
      spark: wave(14, 900, 120, 1, 28),
    },
    {
      id: "signups",
      label: "New sign-ups",
      hint: "Last 30 days",
      value: 436,
      kind: "count",
      delta: 0.187,
      spark: wave(14, 12, 5, 4, 0.7),
    },
    {
      id: "paying",
      label: "Paying learners",
      hint: "On Pro right now",
      value: 118,
      kind: "count",
      delta: 0.052,
      spark: wave(14, 100, 5, 5, 1.2),
    },
    {
      id: "revenue",
      label: "Monthly revenue",
      hint: "Pro payments, after refunds",
      value: 1534,
      kind: "money",
      delta: -0.021,
      spark: wave(14, 1500, 90, 9, 3),
    },
  ],
  funnel: [
    { id: "visited", label: "Visited the site", count: 9200, delta: 0.04 },
    { id: "signed", label: "Signed up", count: 1480, delta: 0.012 },
    { id: "l1start", label: "Started lesson 1", count: 1120, delta: 0.021 },
    { id: "l1done", label: "Finished lesson 1", count: 790, delta: -0.014 },
    { id: "day2", label: "Came back on day 2", count: 410, delta: 0.03 },
    { id: "paid", label: "Went Pro", count: 118, delta: 0.006 },
  ],
  feed: [
    { id: "f1", kind: "paid", text: "A learner went Pro (yearly)", minutesAgo: 6 },
    { id: "f2", kind: "signup", text: "12 new sign-ups since the last check", minutesAgo: 18 },
    { id: "f3", kind: "lesson", text: "Allylic substitution: 41 finished today", minutesAgo: 44 },
    { id: "f4", kind: "flag", text: "A question was flagged in Unit 1", minutesAgo: 95 },
    { id: "f5", kind: "streak", text: "Longest live streak reached 61 days", minutesAgo: 210 },
    { id: "f6", kind: "paid", text: "A payment needs another try", minutesAgo: 380 },
  ],
  services: [],
  incidents: [],
  invoices: [],
  payouts: [],
  purchases: [],
};

/** "6 min ago", "3 h ago", "2 days ago". */
export function relativeTime(minutesAgo: number): string {
  if (minutesAgo < 1) return "Just now";
  if (minutesAgo < 60) return `${Math.round(minutesAgo)} min ago`;
  const h = minutesAgo / 60;
  if (h < 24) return `${Math.round(h)} h ago`;
  const d = Math.round(h / 24);
  return d === 1 ? "Yesterday" : `${d} days ago`;
}

export function formatMoney(cents: number): string {
  const dollars = cents / 100;
  return dollars.toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: dollars % 1 === 0 ? 0 : 2,
  });
}

/** +8.4% / -2.1%, with a real minus sign avoided so screen readers say "minus". */
export function formatDelta(fraction: number): string {
  const pct = Math.abs(fraction * 100).toFixed(1);
  return `${fraction < 0 ? "-" : "+"}${pct}%`;
}

/** Share of the previous stage, as a whole percent. 0 when there is no previous. */
export function stepRate(count: number, previous: number | undefined): number {
  if (previous === undefined || previous <= 0) return 100;
  return Math.round((count / previous) * 100);
}

/** Last n points of a series. */
export function lastDays(series: number[], n: number): number[] {
  return series.slice(Math.max(0, series.length - n));
}

/** Uptime over the ticks, as a percent with one decimal. */
export function uptimePercent(days: boolean[]): string {
  if (days.length === 0) return "100";
  const good = days.filter(Boolean).length;
  return ((good / days.length) * 100).toFixed(1);
}

/** Rows as CSV text (billing download). Quotes any field with a comma or quote. */
export function invoicesCsv(rows: Invoice[]): string {
  const q = (s: string) => (/[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s);
  const head = "Invoice,Learner,Plan,Date,Amount,Status";
  const body = rows.map((r) => [r.id, r.who, r.plan, r.date, (r.cents / 100).toFixed(2), r.status].map(q).join(","));
  return [head, ...body].join("\n");
}

/** Smooth-ish path through points, for an SVG line. Points are [x, y] in svg units. */
export function linePath(pts: Array<[number, number]>): string {
  return pts.map(([x, y], i) => `${i === 0 ? "M" : "L"}${x.toFixed(1)} ${y.toFixed(1)}`).join(" ");
}
