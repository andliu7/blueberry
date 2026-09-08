/**
 * Shared fixtures. Every test in this package pins `now` to a literal, because
 * the package takes the clock as an argument and a test that read the host clock
 * would be asserting today's date rather than the rules.
 *
 * The default zone is UTC so that a local date is the ISO date and nothing in a
 * test has to be read twice. The zone sensitive behaviour has its own file.
 */

import type { EconomyEvent, NodeKind, SpendSink } from "../src/journal.ts";
import { zonedWallTimeToMs } from "../src/time.ts";

export const TZ = "UTC";

/** An ISO instant for a wall clock reading in `tz`. */
export function at(date: string, time = "12:00", tz: string = TZ): string {
  const [hh = "0", mm = "0"] = time.split(":");
  return new Date(zonedWallTimeToMs(date, Number(hh), Number(mm), 0, 0, tz)).toISOString();
}

export function started(nodeId: string, nodeKind: NodeKind, date: string, time = "12:00", tz: string = TZ): EconomyEvent {
  return { kind: "node_started", at: at(date, time, tz), tz, nodeId, nodeKind };
}

export interface ClearOptions {
  readonly flawless?: boolean;
  readonly stepsInOneSitting?: number;
  readonly spine?: boolean;
  readonly difficulty?: 1 | 2 | 3 | 4 | 5;
  readonly time?: string;
  readonly tz?: string;
}

export function cleared(nodeId: string, nodeKind: NodeKind, date: string, options: ClearOptions = {}): EconomyEvent {
  const tz = options.tz ?? TZ;
  return {
    kind: "node_cleared",
    at: at(date, options.time ?? "12:00", tz),
    tz,
    nodeId,
    nodeKind,
    flawless: options.flawless ?? false,
    stepsInOneSitting: options.stepsInOneSitting ?? 1,
    spine: options.spine ?? false,
    difficulty: options.difficulty ?? 3,
  };
}

/** A settings event, which is how a test picks the daily goal or an exam date. */
export function settings(
  date: string,
  fields: { dailyGoal?: "casual" | "regular" | "serious" | "exam"; examDate?: string | null; reminderHour?: number | null },
  time = "00:05",
  tz: string = TZ,
): EconomyEvent {
  return { kind: "settings", at: at(date, time, tz), tz, ...fields };
}

export function spend(
  sink: SpendSink,
  cost: number,
  date: string,
  time = "12:00",
  tz: string = TZ,
): EconomyEvent {
  return { kind: "spend", at: at(date, time, tz), tz, sink, cost };
}

/** One concept clear, which is 10 XP: exactly the casual daily goal. */
export function casualGoalDay(date: string, seed: string, time = "12:00"): readonly EconomyEvent[] {
  return [cleared(`${seed}-${date}`, "concept", date, { time })];
}
