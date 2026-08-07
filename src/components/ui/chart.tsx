import * as React from "react";
import * as Recharts from "recharts";
import { cn } from "@/lib/utils";

/**
 * The shadcn chart primitive, adapted rather than pasted.
 *
 * The original is written against shadcn's design tokens — `bg-card`,
 * `text-muted-foreground`, `border-border`, `bg-popover`. This project has none
 * of them: `src/index.css` defines zero of those variables, so every one of
 * those classes resolves to nothing and the chart would have rendered as
 * unstyled boxes on a transparent background. Blueberry styles with slate and
 * stone directly, so that is what this uses.
 *
 * What is kept from the original is the part that is actually clever: a config
 * object maps each series key to a label and a colour, publishes the colours as
 * `--color-<key>` custom properties scoped to this chart's `data-chart` id, and
 * the tooltip reads its labels back out of the same config. That means a series
 * is named and coloured in one place instead of three, and two charts on one
 * page cannot collide over a variable name.
 *
 * Dropped entirely: the Card, Button, Badge, Avatar and Select components that
 * came with it, plus `class-variance-authority` and `radix-ui`. Every one has an
 * equivalent already in this codebase, and importing a second design system for
 * one panel would leave the app speaking two visual languages.
 */

const THEMES = { light: "", dark: ".dark" } as const;

export type ChartConfig = {
  [k in string]: {
    label?: React.ReactNode;
    icon?: React.ComponentType;
  } & (
    | { color?: string; theme?: never }
    | { color?: never; theme: Record<keyof typeof THEMES, string> }
  );
};

const ChartContext = React.createContext<{ config: ChartConfig } | null>(null);

function useChart() {
  const context = React.useContext(ChartContext);
  if (!context) throw new Error("useChart must be used within a <ChartContainer />");
  return context;
}

export function ChartContainer({
  id,
  className,
  children,
  config,
  ...props
}: React.ComponentProps<"div"> & {
  config: ChartConfig;
  children: React.ComponentProps<typeof Recharts.ResponsiveContainer>["children"];
}) {
  const uniqueId = React.useId();
  const chartId = `chart-${id || uniqueId.replace(/:/g, "")}`;

  return (
    <ChartContext.Provider value={{ config }}>
      <div
        data-chart={chartId}
        className={cn(
          "flex justify-center text-xs",
          "[&_.recharts-cartesian-axis-tick_text]:fill-slate-400 dark:[&_.recharts-cartesian-axis-tick_text]:fill-stone-500",
          "[&_.recharts-cartesian-grid_line[stroke='#ccc']]:stroke-slate-200 dark:[&_.recharts-cartesian-grid_line[stroke='#ccc']]:stroke-stone-800",
          "[&_.recharts-curve.recharts-tooltip-cursor]:stroke-slate-300 dark:[&_.recharts-curve.recharts-tooltip-cursor]:stroke-stone-700",
          "[&_.recharts-layer]:outline-none [&_.recharts-sector]:outline-none [&_.recharts-surface]:outline-none",
          className,
        )}
        {...props}
      >
        <ChartStyle id={chartId} config={config} />
        <Recharts.ResponsiveContainer>{children}</Recharts.ResponsiveContainer>
      </div>
    </ChartContext.Provider>
  );
}

/**
 * Publishes each series colour as a CSS variable, scoped to one chart.
 *
 * Scoped by `[data-chart=<id>]` rather than on `:root`, which is what lets two
 * charts on the same page each have their own `--color-total` without one
 * overwriting the other.
 */
function ChartStyle({ id, config }: { id: string; config: ChartConfig }) {
  const colorConfig = Object.entries(config).filter(([, c]) => c.theme || c.color);
  if (!colorConfig.length) return null;

  return (
    <style
      dangerouslySetInnerHTML={{
        __html: Object.entries(THEMES)
          .map(
            ([theme, prefix]) => `${prefix} [data-chart=${id}] {
${colorConfig
  .map(([key, item]) => {
    const color = item.theme?.[theme as keyof typeof item.theme] || item.color;
    return color ? `  --color-${key}: ${color};` : null;
  })
  .filter(Boolean)
  .join("\n")}
}`,
          )
          .join("\n"),
      }}
    />
  );
}

export const ChartTooltip = Recharts.Tooltip;

/**
 * Reads its labels out of the same config that supplied the colours.
 *
 * Props are declared here rather than borrowed from `Recharts.Tooltip`. In
 * recharts 3 the Tooltip's own prop type no longer carries `payload` and
 * `label` — those are injected into whatever you pass as `content`, and are not
 * part of the component's public props — so deriving from it does not typecheck.
 */
export function ChartTooltipContent({
  active,
  payload,
  label,
  className,
}: {
  active?: boolean;
  payload?: Array<{ dataKey?: string | number; name?: string | number; value?: unknown; color?: string }>;
  label?: unknown;
  className?: string;
}) {
  const { config } = useChart();
  if (!active || !payload?.length) return null;

  return (
    <div
      className={cn(
        "min-w-[9rem] rounded-lg border border-slate-200 bg-white/95 px-3 py-2 shadow-xl backdrop-blur-sm dark:border-stone-700 dark:bg-stone-900/95",
        className,
      )}
    >
      {label != null && (
        <div className="mb-2 border-b border-slate-100 pb-1.5 text-xs font-semibold text-slate-700 dark:border-stone-800 dark:text-stone-200">
          {String(label)}
        </div>
      )}
      <div className="space-y-1">
        {payload.map((item) => {
          const key = String(item.dataKey ?? item.name ?? "value");
          const item_ = config[key];
          return (
            <div key={key} className="flex items-center justify-between gap-4">
              <span className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-stone-400">
                <span
                  className="size-2.5 shrink-0 rounded-[2px]"
                  style={{ backgroundColor: item.color ?? item_?.color }}
                />
                {item_?.label ?? key}
              </span>
              <span className="font-mono text-xs font-semibold tabular-nums text-slate-800 dark:text-stone-100">
                {typeof item.value === "number" ? item.value.toLocaleString() : String(item.value ?? "")}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default ChartContainer;
