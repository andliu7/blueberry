/**
 * The streak page's states on fixed data, at #/app/gallery/streak?state=...
 * (lit, frozen, start, sheet). Development only, lazy, never in a student's
 * payload. The fixtures are drawings of states, not derived chemistry or money.
 */
import { useState } from "react";
import { STREAK_FREEZE_COST } from "@blueberry/economy";
import { hashParam } from "../app/routes";
import { StreakPageView } from "./StreakPage";
import type { StreakMonthCell, StreakMonthKind, StreakPageModel } from "./streakModel";

function month(todayDay: number, kinds: Readonly<Record<number, StreakMonthKind>>): StreakMonthCell[] {
  return Array.from({ length: 31 }, (_, i) => {
    const d = i + 1;
    const kind: StreakMonthKind = d > todayDay ? "future" : (kinds[d] ?? (d === todayDay ? "pending" : "missed"));
    return { date: `2025-12-${String(d).padStart(2, "0")}`, dayOfMonth: d, kind, today: d === todayDay };
  });
}

const FREEZES = { held: 1, max: 2, cost: STREAK_FREEZE_COST, affordable: true, full: false, line: "1 held. Each covers a day you miss, on its own." };

function run(from: number, to: number): Record<number, StreakMonthKind> {
  const out: Record<number, StreakMonthKind> = {};
  for (let d = from; d <= to; d += 1) out[d] = "counted";
  return out;
}

const BASE = { monthLabel: "December 2025", canNext: false, lead: 1, restDays: 0, freezeSavedWeekday: null };

const STATES: Record<string, StreakPageModel> = {
  lit: {
    ...BASE,
    days: 847,
    tone: "lit",
    todayCounted: false,
    nudge: { line: "Today is still open. One lesson adds a day.", strong: "One lesson" },
    cells: month(13, run(1, 10)),
    practiced: 10,
    freezesUsed: 0,
    tag: "PERFECT",
    freezes: { ...FREEZES, held: 2, full: true, line: "Both ready. Each covers a day you miss, on its own." },
  },
  frozen: {
    ...BASE,
    days: 5,
    tone: "frozen",
    todayCounted: false,
    nudge: { line: "Friday was covered by a freeze. Streak safe at 5.", strong: "Friday" },
    cells: month(13, { ...run(8, 11), 12: "freeze" }),
    practiced: 4,
    freezesUsed: 1,
    tag: "GOOD",
    freezes: FREEZES,
    freezeSavedWeekday: "Friday",
  },
  start: {
    ...BASE,
    days: 1,
    tone: "start",
    todayCounted: true,
    nudge: { line: "Today counted. Meet your goal tomorrow and it becomes 2.", strong: "Today counted." },
    cells: month(8, { 8: "counted" }),
    practiced: 1,
    freezesUsed: 0,
    tag: "GOOD",
    freezes: { ...FREEZES, held: 0, line: "A freeze covers a day you miss, on its own." },
  },
};

export default function StreakGallery() {
  const name = hashParam("state") ?? "lit";
  const sheet = name === "sheet";
  const model = STATES[sheet ? "frozen" : name] ?? STATES.lit!;
  const [open, setOpen] = useState(sheet);
  return (
    <StreakPageView
      model={model}
      balance={641}
      reducedMotion={hashParam("rm") === "1"}
      sheetOpen={open}
      ctaLabel="Back to lessons"
      onClose={() => undefined}
      onCta={() => undefined}
      onPrev={() => undefined}
      onNext={() => undefined}
      onRefill={() => undefined}
      onCloseSheet={() => setOpen(false)}
    />
  );
}
