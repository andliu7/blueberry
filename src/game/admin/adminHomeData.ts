/**
 * The admin home page's data contract (#/app/admin/home) and the small pure helpers it uses.
 *
 * NO FIGURE LIVES HERE. `emptyAdminHome` is the page before anything is read: every
 * count is zero, every series is flat and every list is empty, so there is no made-up
 * number in the bundle to leak onto the page by mistake. adminHomeLive.ts lays the real
 * figures over it part by part and lists which parts are real in `liveParts`; the page
 * shows a figure only for a part on that list.
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
  /** "sample" when nothing is read yet, "mixed" when only some parts are, "live" when every part is. */
  source: "sample" | "mixed" | "live";
  /** Ids of the parts that are real: "today", "growth", "funnel", "feed", "billing", "stat:active", "stat:signups", "stat:paying". Everything else is not read. */
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

const flat = (n: number): number[] => new Array<number>(n).fill(0);

/** The page before anything is read. Zeros and empty lists only; see the note at the top. */
export const emptyAdminHome: AdminHomeData = {
  source: "sample",
  liveParts: [],
  today: { learningNow: 0, signupsToday: 0, lessonsFinishedToday: 0, activeToday: 0 },
  asOf: "Not read yet",
  signups: flat(90),
  signupsBefore: flat(90),
  stats: [
    { id: "active", label: "Active learners", hint: "Did a lesson in the last 7 days", value: 0, kind: "count", delta: null, spark: [] },
    { id: "signups", label: "New sign-ups", hint: "Last 30 days", value: 0, kind: "count", delta: null, spark: [] },
    { id: "paying", label: "Paying learners", hint: "On Pro right now", value: 0, kind: "count", delta: null, spark: [] },
    { id: "revenue", label: "Monthly revenue", hint: "Pro payments, after refunds", value: 0, kind: "money", delta: null, spark: [] },
  ],
  funnel: [
    { id: "visited", label: "Visited the site", count: 0, delta: 0 },
    { id: "signed", label: "Signed up", count: 0, delta: 0 },
    { id: "l1start", label: "Started lesson 1", count: 0, delta: 0 },
    { id: "l1done", label: "Finished lesson 1", count: 0, delta: 0 },
    { id: "day2", label: "Came back on day 2", count: 0, delta: 0 },
    { id: "paid", label: "Went Pro", count: 0, delta: 0 },
  ],
  feed: [],
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
