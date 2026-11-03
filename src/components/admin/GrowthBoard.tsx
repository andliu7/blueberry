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
/* No sample figures live here. With no data the board shows shapes only.    */
/* ------------------------------------------------------------------ */

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
  /** Omit to show the empty state: example graphs, no figures. */
  data?: GrowthBoardData;
  /** Show the "by vasnev.art" badge. Off for our usage. */
  credit?: boolean;
}

/** What each part will read from once connected. Named, so the empty state says what is missing. */
const NEEDS: Array<{ title: string; source: string; shape: number[] }> = [
  { title: "Learners by plan", source: "plan history (entitlements over time)", shape: [2, 3, 3, 5, 6, 8, 9, 12] },
  { title: "Acquisition cost", source: "logged ad spend", shape: [9, 8, 8, 6, 6, 5, 5, 4] },
  { title: "Open feedback", source: "the feedback table", shape: [3, 5, 4, 6, 5, 7, 6, 8] },
];

function ShapeLine({ points, label }: { points: number[]; label: string }) {
  const max = Math.max(...points);
  const min = Math.min(...points);
  const d = points
    .map((v, i) => `${i ? "L" : "M"}${(i / (points.length - 1)) * 120} ${30 - ((v - min) / (max - min || 1)) * 26 - 2}`)
    .join(" ");
  return (
    <svg viewBox="0 0 120 32" role="img" aria-label={label} className="h-10 w-full text-muted-foreground opacity-60">
      <path d={d} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" strokeDasharray="4 4" />
    </svg>
  );
}

export default function GrowthBoard({ data, credit = false }: GrowthBoardProps) {
  if (data === undefined || data.isSample) {
    return (
      <div className="mx-auto w-full max-w-[1480px] p-3 sm:p-5">
        <section aria-labelledby="gb-empty" className="rounded-2xl border-2 border-dashed border-border bg-card p-5 text-card-foreground">
          <h2 id="gb-empty" className="m-0 text-lg font-extrabold">
            Growth is not measured yet
          </h2>
          <p className="mb-4 mt-1 text-sm text-muted-foreground">
            No data, example. Real sign-ups, retention and devices are on the Learners tab.
          </p>
          <ul className="m-0 grid list-none gap-3 p-0 sm:grid-cols-3">
            {NEEDS.map((n) => (
              <li key={n.title} className="rounded-xl border border-dashed border-border p-3">
                <p className="m-0 text-sm font-bold">{n.title}</p>
                <p className="m-0 text-2xl font-extrabold text-muted-foreground">No data</p>
                <ShapeLine points={n.shape} label={`Example graph for ${n.title}`} />
                <p className="m-0 text-xs text-muted-foreground">Feeds from {n.source} once connected.</p>
              </li>
            ))}
          </ul>
        </section>
      </div>
    );
  }
  const d = data;
  const ready = growthDataReady(d);
  return (
    <div className="mx-auto w-full max-w-[1480px] p-3 sm:p-5">
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
