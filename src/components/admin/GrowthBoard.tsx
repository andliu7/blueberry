import FinanceBento from "@/components/ui/finance-bento";
import type {
  DeviceKey,
  DeviceSlice,
  FinanceBentoData,
  FunnelStage,
  PlanPoint,
} from "@/components/ui/finance-bento";

/**
 * Growth board: the owner's second ADMIN-ONLY board (learners by plan,
 * activation funnel, day-7 return, CAC, exams, open feedback, flagged
 * lessons, weekday activity). The chart engine is `ui/finance-bento.tsx`.
 *
 * This component does not gate access. The page that mounts it must sit behind
 * the same admin check as the rest of the admin area, and must load this file
 * through React.lazy so the board stays out of the #/app entry chunk.
 *
 * SERVER CONTRACT (a later staff-only server function must fill this).
 * The Supabase analytics_* views are revoked from the API roles, so the browser
 * cannot read them. A staff-only Edge Function (service role, admin check on
 * the caller) returns one `GrowthBoardData` with `isSample: false`:
 *   - slices.all / .phone / .desktop: the same shape cut by device class.
 *       learners   month-end counts by plan (free, ad supported, pro), oldest
 *                  first, at least 2 months (24 or more months makes "All" useful)
 *       funnel     exactly four counts for one sign-up cohort: signed up,
 *                  started a lesson, cleared the first node, back on day 7
 *       previousDay7Return   the prior period's day-7 return as 0..1, or null
 *       flow       per month: new sign-ups (rows[0] = latest year) and
 *                  inactive/churned learners, equal row lengths
 *       weekday    active learners per weekday
 *   - cac          real US dollars: ad and tool spend, sign-ups in the same
 *                  window, current = spend / sign-ups (null when no sign-ups),
 *                  plus the owner's target
 *   - exams        upcoming exam dates that drive traffic, with days away
 *   - feedback     flagged questions awaiting review by reason (open, total)
 *   - flaggedLessons   top lessons by flags, 7 daily counts each, oldest first
 * Strings from users (lesson names, reasons) are escaped by the engine before
 * they reach innerHTML; the server should still length-limit them.
 */

export type { DeviceKey, DeviceSlice, FunnelStage, PlanPoint };
export type GrowthBoardData = FinanceBentoData;

/* ------------------------------------------------------------------ */
/* Sample data. Made up. Never shown without the "Sample data" chip.   */
/* ------------------------------------------------------------------ */

const MONTHS = 30;

function scaled(s: number): DeviceSlice {
  const learners: PlanPoint[] = Array.from({ length: MONTHS }, (_, i) => {
    const t = i / (MONTHS - 1);
    const d = new Date(Date.UTC(2024, 4 + i, 1));
    const wobble = 1 + Math.sin(i * 0.9) * 0.04;
    return {
      month: d.toISOString().slice(0, 10),
      free: Math.round((400 + t * 5200) * wobble * s),
      ad: Math.round((120 + t * 2600) * wobble * s),
      pro: Math.round((30 + t * 1500) * wobble * s),
    };
  });
  const row = (base: number[], k: number) => base.map((v) => Math.round(v * k * s));
  return {
    learners,
    funnel: [
      { label: "Signed up", count: Math.round(1000 * s) },
      { label: "Started a lesson", count: Math.round(720 * s) },
      { label: "Cleared first node", count: Math.round(510 * s) },
      { label: "Back on day 7", count: Math.round(280 * s) },
    ],
    previousDay7Return: 0.25,
    flow: {
      months: ["May", "Jun", "Jul", "Aug", "Sep", "Oct"],
      seriesLabels: ["2026", "2025", "2024"],
      signups: [row([240, 360, 540, 640, 500, 340], 1), row([200, 300, 440, 520, 420, 280], 1), row([160, 240, 340, 400, 330, 220], 1)],
      churned: [row([120, 220, 380, 460, 340, 180], 1), row([100, 180, 300, 380, 280, 150], 1), row([80, 140, 240, 300, 220, 120], 1)],
    },
    weekday: { days: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"], values: row([2100, 2300, 2500, 2200, 1700, 900, 1400], 1) },
  };
}

export const sampleGrowthData: GrowthBoardData = {
  asOf: "sample",
  isSample: true,
  slices: { all: scaled(1), phone: scaled(0.64), desktop: scaled(0.36) },
  cac: { current: 3.4, target: 4, spend: 5200, signups: 1530 },
  exams: [
    { name: "ACS Organic 1", date: "Nov 14", daysAway: 17 },
    { name: "Orgo 2 finals", date: "Dec 9", daysAway: 42 },
    { name: "MCAT", date: "Jan 23", daysAway: 87 },
  ],
  feedback: [
    { label: "Wrong answer", open: 14, total: 60 },
    { label: "Unclear wording", open: 9, total: 41 },
    { label: "Typo", open: 3, total: 25 },
  ],
  flaggedLessons: [
    { name: "SN2 vs SN1 rates", change: "+12%", daily: [3, 4, 4, 6, 5, 7, 9] },
    { name: "Grignard quench", change: "-8%", daily: [8, 7, 7, 5, 6, 4, 4] },
    { name: "Aldol condensation", change: "+3%", daily: [2, 3, 2, 3, 3, 4, 3] },
  ],
};

/* ------------------------------------------------------------------ */

function sliceOk(s: DeviceSlice | undefined): boolean {
  if (!s) return false;
  const nm = s.flow?.months?.length ?? 0;
  return (
    s.learners?.length >= 2 &&
    s.funnel?.length === 4 &&
    s.funnel[0].count > 0 &&
    nm >= 2 &&
    s.flow.signups.length >= 1 &&
    s.flow.signups.length === s.flow.churned.length &&
    [...s.flow.signups, ...s.flow.churned].every((r) => r.length === nm) &&
    s.weekday?.values?.length >= 1 &&
    s.weekday.values.length === s.weekday.days.length
  );
}

export function growthDataReady(d: GrowthBoardData): boolean {
  return (
    sliceOk(d.slices?.all) &&
    sliceOk(d.slices.phone) &&
    sliceOk(d.slices.desktop) &&
    d.flaggedLessons.length >= 1 &&
    d.flaggedLessons.every((l) => l.daily.length >= 2)
  );
}

interface GrowthBoardProps {
  /** Omit to show the labelled sample data. */
  data?: GrowthBoardData;
  /** Show the "by vasnev.art" badge. Off for our usage. */
  credit?: boolean;
}

export default function GrowthBoard({ data, credit = false }: GrowthBoardProps) {
  const d = data ?? sampleGrowthData;
  const sample = data === undefined || d.isSample;
  const ready = growthDataReady(d);
  return (
    <div className="mx-auto w-full max-w-[1480px] p-3 sm:p-5">
      {sample && (
        <p
          role="note"
          className="mb-3 inline-flex min-h-8 items-center rounded-full bg-amber-300 px-3 text-xs font-bold text-black"
        >
          Sample data, not live
        </p>
      )}
      {ready ? (
        <FinanceBento data={d} title="Growth" subtitle={d.asOf} credit={credit} />
      ) : (
        <p role="status" className="rounded-2xl bg-black/80 p-6 text-sm text-white">
          Not enough data yet to draw the growth board.
        </p>
      )}
    </div>
  );
}
