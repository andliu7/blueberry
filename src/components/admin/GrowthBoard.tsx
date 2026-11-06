import FinanceBento from "@/components/ui/finance-bento";
import { EmptyValue, SourceNote } from "@/game/admin/honesty";
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

/** What each part will read from once connected. Named behind an info mark, so the empty state says what is missing without shouting it. */
const NEEDS: Array<{ title: string; source: string; why: string }> = [
  { title: "Learners by plan", source: "plan history (entitlements over time)", why: "Plan history is not kept yet." },
  { title: "Acquisition cost", source: "logged ad spend", why: "Spend is not logged anywhere yet." },
  { title: "Open feedback", source: "the feedback table", why: "There is no feedback table yet." },
];

/** An empty chart frame: gridlines and a flat line at zero. No invented shape. */
function FlatLine() {
  return (
    <div aria-hidden className="relative mt-3 h-12 w-full">
      <div className="absolute inset-x-0 top-0 border-t border-dashed border-border" />
      <div className="absolute inset-x-0 top-1/2 border-t border-dashed border-border" />
      <div className="absolute inset-x-0 bottom-0 h-0.5 rounded-full bg-muted-foreground/25" />
    </div>
  );
}

export default function GrowthBoard({ data, credit = false }: GrowthBoardProps) {
  if (data === undefined || data.isSample) {
    // The admin's one empty pattern: a single line that names the cause and the next
    // step, then the tiles at their real size with a quiet dash and the source behind
    // an info mark. No per-tile pill, no table names in the body.
    return (
      <div className="w-full min-w-0">
        <section aria-labelledby="gb-empty" className="rounded-2xl border border-border bg-card p-5 text-card-foreground">
          <h2 id="gb-empty" className="m-0 text-base font-semibold">
            Growth is not measured yet
          </h2>
          <p className="mb-4 mt-1 text-sm text-muted-foreground">
            None of these three has a data source yet. Sign-ups, stay and devices are measured on the Overview tab.
          </p>
          <ul className="m-0 grid list-none gap-3 p-0 sm:grid-cols-3">
            {NEEDS.map((n) => (
              <li key={n.title} className="rounded-xl border border-border p-4">
                <p className="m-0 flex items-center gap-1 text-xs text-muted-foreground">
                  {n.title}
                  <SourceNote live={false} source={n.source} why={n.why} />
                </p>
                <p className="m-0 mt-2 text-2xl font-semibold leading-none tabular-nums">
                  <EmptyValue />
                </p>
                <FlatLine />
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
