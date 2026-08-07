import { useMemo, useState } from "react";
import { Area, AreaChart, CartesianGrid, XAxis, YAxis } from "recharts";
import { TrendingDown, TrendingUp } from "lucide-react";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import type { FeedbackNote, Todo } from "@/lib/workspace";
import { cn } from "@/lib/utils";

/**
 * What has been arriving in the workspace, over time.
 *
 * This charts real data. That is a deliberate and slightly awkward choice worth
 * explaining, because the original brief was "how many users are on".
 *
 * Blueberry logs nothing about its visitors. There is no analytics table, no
 * page-view ping, no session record — the Apps Script backend has routes for
 * feedback, decks, todos and admins and nothing else. So a visitors chart today
 * could only be invented numbers, and invented numbers on an admin dashboard are
 * worse than no chart: you would end up making decisions against them.
 *
 * What does exist is a timestamp on every feedback note and every task. Those
 * are genuine, already fetched, and answer a question worth asking — is anyone
 * actually using this, and are we keeping up with what they send? So that is
 * what this draws until there is real traffic data to draw instead. The shape,
 * the config and the tooltip are all reusable the moment a `visitors` series
 * exists; only the `series` builder below would change.
 */

const chartConfig = {
  feedback: { label: "Feedback in", color: "#818cf8" },
  tasks: { label: "Tasks added", color: "#c084fc" },
} satisfies ChartConfig;

const RANGES = {
  "14d": { label: "Last 14 days", days: 14, bucket: "day" },
  "8w": { label: "Last 8 weeks", days: 56, bucket: "week" },
  "6m": { label: "Last 6 months", days: 182, bucket: "month" },
} as const;

type RangeKey = keyof typeof RANGES;

/** Start-of-bucket key for a date, so points land in the same slot. */
function bucketOf(d: Date, bucket: "day" | "week" | "month"): string {
  const y = d.getFullYear();
  if (bucket === "month") return `${y}-${String(d.getMonth() + 1).padStart(2, "0")}`;
  if (bucket === "week") {
    // Monday of that week. Sunday is 0, which would otherwise start the week on
    // the wrong end and split a weekend across two buckets.
    const monday = new Date(d);
    monday.setDate(d.getDate() - ((d.getDay() + 6) % 7));
    return monday.toISOString().slice(0, 10);
  }
  return d.toISOString().slice(0, 10);
}

function labelOf(key: string, bucket: "day" | "week" | "month"): string {
  if (bucket === "month") {
    const [y, m] = key.split("-");
    return new Date(Number(y), Number(m) - 1, 1).toLocaleDateString(undefined, { month: "short" });
  }
  const d = new Date(key);
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

export function WorkspaceActivity({
  feedback,
  todos,
}: {
  feedback: FeedbackNote[];
  todos: Todo[];
}) {
  const [range, setRange] = useState<RangeKey>("8w");
  const { days, bucket } = RANGES[range];

  /**
   * Every bucket in the window, including the empty ones.
   *
   * Building this from only the buckets that have data would draw a flat line
   * across a three-week gap and make a quiet stretch look like a busy one.
   */
  const series = useMemo(() => {
    const now = new Date();
    const from = new Date(now);
    from.setDate(now.getDate() - days);

    const slots = new Map<string, { period: string; feedback: number; tasks: number }>();
    const step = bucket === "month" ? 28 : bucket === "week" ? 7 : 1;
    for (let d = new Date(from); d <= now; d.setDate(d.getDate() + step)) {
      const key = bucketOf(d, bucket);
      if (!slots.has(key)) slots.set(key, { period: labelOf(key, bucket), feedback: 0, tasks: 0 });
    }

    const count = (iso: string | undefined, field: "feedback" | "tasks") => {
      if (!iso) return;
      const d = new Date(iso);
      if (Number.isNaN(d.getTime()) || d < from) return;
      const slot = slots.get(bucketOf(d, bucket));
      if (slot) slot[field]++;
    };

    for (const note of feedback) count(note.at, "feedback");
    for (const todo of todos) count(todo.at, "tasks");

    return [...slots.values()];
  }, [feedback, todos, days, bucket]);

  /** Last bucket against the one before it, which is the only honest "change". */
  const totals = useMemo(() => {
    const last = series[series.length - 1];
    const prev = series[series.length - 2];
    const delta = (a: number, b: number) => (b === 0 ? (a === 0 ? 0 : 100) : Math.round(((a - b) / b) * 100));
    return [
      {
        key: "feedback" as const,
        value: last?.feedback ?? 0,
        change: delta(last?.feedback ?? 0, prev?.feedback ?? 0),
      },
      {
        key: "tasks" as const,
        value: last?.tasks ?? 0,
        change: delta(last?.tasks ?? 0, prev?.tasks ?? 0),
      },
    ];
  }, [series]);

  const empty = series.every((s) => s.feedback === 0 && s.tasks === 0);

  return (
    <section className="flex flex-col rounded-xl border border-slate-200 bg-white/70 p-4 dark:border-stone-800 dark:bg-stone-900/60">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="text-sm font-bold text-slate-800 dark:text-stone-100">Activity</h2>
          <p className="mt-0.5 text-[0.7rem] text-slate-400 dark:text-stone-500">
            Feedback and tasks arriving over time
          </p>
        </div>

        <select
          value={range}
          onChange={(e) => setRange(e.target.value as RangeKey)}
          className="rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs text-slate-600 outline-none focus-visible:ring-2 focus-visible:ring-indigo-400 dark:border-stone-700 dark:bg-stone-900 dark:text-stone-300"
        >
          {Object.entries(RANGES).map(([key, r]) => (
            <option key={key} value={key}>
              {r.label}
            </option>
          ))}
        </select>
      </div>

      <div className="mb-4 grid grid-cols-2 gap-4">
        {totals.map((t) => (
          <div key={t.key} className="flex items-center gap-2.5">
            <span
              className="h-9 w-0.5 shrink-0 rounded-full"
              style={{ backgroundColor: chartConfig[t.key].color }}
            />
            <div>
              <div className="text-[0.7rem] font-medium text-slate-400 dark:text-stone-500">
                {chartConfig[t.key].label}
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-xl leading-none font-semibold text-slate-800 dark:text-stone-100">
                  {t.value}
                </span>
                {t.change !== 0 && (
                  <span
                    className={cn(
                      "inline-flex items-center gap-0.5 text-[0.7rem] font-medium",
                      t.change > 0 ? "text-green-600 dark:text-green-500" : "text-slate-400 dark:text-stone-500",
                    )}
                  >
                    {t.change > 0 ? (
                      <TrendingUp className="size-3" />
                    ) : (
                      <TrendingDown className="size-3" />
                    )}
                    {Math.abs(t.change)}%
                  </span>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {empty ? (
        // An axis with a flat zero line reads as "the chart is broken". Saying so
        // is better than drawing nothing convincingly.
        <div className="flex h-[180px] items-center justify-center rounded-lg border border-dashed border-slate-200 text-xs text-slate-400 dark:border-stone-700 dark:text-stone-500">
          Nothing arrived in this window yet.
        </div>
      ) : (
        <ChartContainer config={chartConfig} className="h-[180px] w-full">
          <AreaChart data={series} margin={{ top: 4, right: 8, left: 8, bottom: 0 }}>
            <defs>
              {(["feedback", "tasks"] as const).map((k) => (
                <linearGradient key={k} id={`fill-${k}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={`var(--color-${k})`} stopOpacity={0.55} />
                  <stop offset="95%" stopColor={`var(--color-${k})`} stopOpacity={0.05} />
                </linearGradient>
              ))}
            </defs>

            <CartesianGrid vertical={false} />
            <XAxis dataKey="period" tickLine={false} axisLine={false} tickMargin={8} minTickGap={16} />
            <YAxis hide allowDecimals={false} />
            <ChartTooltip cursor={{ strokeDasharray: "4 4" }} content={<ChartTooltipContent />} />

            <Area
              dataKey="tasks"
              type="natural"
              stackId="a"
              stroke="var(--color-tasks)"
              fill="url(#fill-tasks)"
              strokeWidth={2}
              dot={false}
            />
            <Area
              dataKey="feedback"
              type="natural"
              stackId="a"
              stroke="var(--color-feedback)"
              fill="url(#fill-feedback)"
              strokeWidth={2}
              dot={false}
            />
          </AreaChart>
        </ChartContainer>
      )}
    </section>
  );
}

export default WorkspaceActivity;
