/**
 * The admin activity view (STATUS F1). Pins the data shaping (runs, status,
 * first-try accuracy, ordering, the account filter), how a Supabase result is
 * read, the honest messages, the staff gate it sits behind, and the migration
 * that lets staff read: select only, through is_staff(), nothing for anon.
 */

import { readFileSync } from "node:fs";
import path from "node:path";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { hrefForAdmin, parseHash } from "../app/routes";
import type { AccountRole } from "@/lib/account";
import { isStaffRole } from "../admin/staff";
import {
  activityRows,
  classifyLoad,
  durationLabel,
  firstTryLabel,
  IDLE_MS,
  type EventRow,
} from "../admin/activityModel";
import { ActivityNotice, ActivityTable } from "../admin/AdminActivity";
import { PATHWAY_UNITS } from "../demo/pathwayMap";

const game = path.resolve(__dirname, "..");
const read = (rel: string) => readFileSync(path.join(game, rel), "utf8");

const A = "aaaaaaaa-0000-0000-0000-000000000001";
const B = "bbbbbbbb-0000-0000-0000-000000000002";
const NOW = "2026-10-24T12:00:00.000Z";
const TZ = "America/New_York";
const at = (minutesAgo: number) => new Date(Date.parse(NOW) - minutesAgo * 60_000).toISOString();

let n = 0;
const row = (user: string, event: Record<string, unknown>): EventRow => ({
  user_id: user,
  id: `e${(n += 1)}`,
  event: { tz: TZ, ...event },
});
const started = (user: string, nodeId: string, m: number) =>
  row(user, { kind: "node_started", nodeId, nodeKind: "concept", at: at(m) });
const attempt = (user: string, nodeId: string, problemId: string, correct: boolean, m: number) =>
  row(user, { kind: "attempt", nodeId, problemId, correct, at: at(m) });
const clearedEv = (user: string, nodeId: string, m: number, extra: Record<string, unknown> = {}) =>
  row(user, {
    kind: "node_cleared",
    nodeId,
    nodeKind: "concept",
    flawless: false,
    stepsInOneSitting: 4,
    spine: true,
    difficulty: 2,
    at: at(m),
    ...extra,
  });

const profiles = [
  { id: A, full_name: "Ana Student", email: "ana@example.edu" },
  { id: B, full_name: null, email: "ta-test@example.edu" },
];
const titles: Record<string, string> = { "u1-allylic": "Allylic cations", "u1-diene": "Dienes" };
const titleFor = (id: string) => titles[id] ?? null;
const shape = (rows: EventRow[], userIds?: string[]) => activityRows({ rows, profiles, titleFor, now: NOW, userIds });

describe("activityRows", () => {
  it("reads a clear that carries `cleared` as first-try right out of the steps", () => {
    const [run] = shape([started(A, "u1-allylic", 20), attempt(A, "u1-allylic", "p1", false, 15), clearedEv(A, "u1-allylic", 10, { cleared: 3 })]);
    expect(run).toMatchObject({ who: "Ana Student", lesson: "Allylic cations", status: "cleared", firstTry: { right: 3, of: 4 } });
    expect(run!.started).toBe(at(20));
    expect(run!.finished).toBe(at(10));
    expect(run!.durationMs).toBe(10 * 60_000);
  });

  it("falls back to the first attempt per question on a legacy clear without `cleared`", () => {
    const [run] = shape([
      started(A, "u1-allylic", 20),
      attempt(A, "u1-allylic", "p1", false, 19),
      attempt(A, "u1-allylic", "p1", true, 18),
      attempt(A, "u1-allylic", "p2", true, 17),
      attempt(A, "u1-allylic", "p3", true, 16),
      clearedEv(A, "u1-allylic", 15),
    ]);
    expect(run!.firstTry).toEqual({ right: 2, of: 3 });
    expect(firstTryLabel(run!.firstTry)).toBe("2/3 (67%)");
  });

  it("calls an unfinished run in progress, then left after the idle window", () => {
    const [fresh] = shape([started(A, "u1-allylic", 5), attempt(A, "u1-allylic", "p1", true, 4)]);
    expect(fresh!.status).toBe("in progress");
    expect(fresh!.finished).toBeNull();
    const idleMinutes = IDLE_MS / 60_000 + 1;
    const [stale] = shape([started(A, "u1-allylic", idleMinutes + 5), attempt(A, "u1-allylic", "p1", true, idleMinutes)]);
    expect(stale!.status).toBe("left");
  });

  it("drops rows the economy cannot read, and events that are not lesson runs", () => {
    const rows: EventRow[] = [
      started(A, "u1-allylic", 10),
      { user_id: A, id: "bad1", event: { kind: "attempt", at: at(9) } },
      { user_id: A, id: "bad2", event: null },
      { user_id: 7, id: "bad3", event: { kind: "node_started", nodeId: "x", nodeKind: "concept", at: at(9), tz: TZ } },
      row(A, { kind: "cards_reviewed", graded: 5, at: at(8) }),
    ];
    const runs = shape(rows);
    expect(runs).toHaveLength(1);
    expect(runs[0]!.firstTry).toBeNull();
    expect(firstTryLabel(runs[0]!.firstTry)).toBe("n/a");
  });

  it("shows the raw id for a lesson not on the map, and the email or short id for who", () => {
    const runs = shape([started(B, "u9-unknown", 3), started("cccccccc-1111", "u1-diene", 2)]);
    expect(runs.find((r) => r.nodeId === "u9-unknown")).toMatchObject({ lesson: "u9-unknown", who: "ta-test@example.edu" });
    expect(runs.find((r) => r.nodeId === "u1-diene")!.who).toBe("cccccccc");
  });

  it("orders runs newest first, and a new start opens a new run", () => {
    const runs = shape([
      started(A, "u1-allylic", 50),
      clearedEv(A, "u1-allylic", 45),
      started(B, "u1-diene", 40),
      started(A, "u1-allylic", 10),
    ]);
    expect(runs.map((r) => [r.userId, r.nodeId, r.status])).toEqual([
      [A, "u1-allylic", "in progress"],
      [B, "u1-diene", "left"],
      [A, "u1-allylic", "cleared"],
    ]);
  });

  it("keeps only the chosen accounts, and every account when none are chosen", () => {
    const rows = [started(A, "u1-allylic", 5), started(B, "u1-diene", 4)];
    expect(shape(rows, [B]).map((r) => r.userId)).toEqual([B]);
    expect(shape(rows, []).length).toBe(2);
    expect(shape(rows).length).toBe(2);
  });

  it("formats durations", () => {
    expect(durationLabel(45_000)).toBe("45s");
    expect(durationLabel(252_000)).toBe("4m 12s");
    expect(durationLabel(3_780_000)).toBe("1h 3m");
  });
});

describe("classifyLoad", () => {
  it.each([
    [{ error: null, status: 200 }, "ok"],
    [{ error: { code: "PGRST205" }, status: 404 }, "not-applied"],
    [{ error: { code: "42P01" }, status: 400 }, "not-applied"],
    [{ error: { code: "x" }, status: 404 }, "not-applied"],
    [{ error: { code: "42501" }, status: 400 }, "denied"],
    [{ error: {}, status: 403 }, "denied"],
    [{ error: { code: "PGRST000" }, status: 500 }, "error"],
  ] as const)("%o is %s", (result, expected) => {
    expect(classifyLoad(result)).toBe(expected);
  });
});

describe("markup", () => {
  it("says which migrations to run when the table is missing", () => {
    const html = renderToStaticMarkup(createElement(ActivityNotice, { notice: "not-applied" }));
    expect(html).toContain("progress_events is not applied yet");
    expect(html).toContain("20261023120000_progress_events.sql");
    expect(html).toContain("20261024163000_progress_events_staff_read.sql");
  });

  it("names the staff policy when reading others is denied, and the empty window", () => {
    expect(renderToStaticMarkup(createElement(ActivityNotice, { notice: "denied" }))).toContain("staff policy is not applied");
    expect(renderToStaticMarkup(createElement(ActivityNotice, { notice: "empty" }))).toContain("No activity in the last 48 hours");
    expect(renderToStaticMarkup(createElement(ActivityNotice, { notice: "no-supabase" }))).toContain("not configured");
  });

  it("draws one table row per run with who, lesson, status and first try", () => {
    const runs = shape([started(A, "u1-allylic", 20), clearedEv(A, "u1-allylic", 10, { cleared: 4 }), started(B, "u1-diene", 2)]);
    const html = renderToStaticMarkup(createElement(ActivityTable, { rows: runs }));
    expect(html.match(/<tr>/g)).toHaveLength(3);
    expect(html).toContain("Ana Student");
    expect(html).toContain("Allylic cations");
    expect(html).toContain("4/4 (100%)");
    expect(html).toContain("in progress");
    expect(html).toContain("10m 0s");
  });
});

describe("staff gate", () => {
  it("has no map lesson called activity, so the route cannot shadow a lesson", () => {
    expect(PATHWAY_UNITS.some((unit) => unit.nodes.some((node) => node.id === "activity"))).toBe(false);
  });

  it("parses the activity link as the admin route", () => {
    expect(parseHash(hrefForAdmin("activity"))).toEqual({ kind: "admin", node: "activity" });
  });

  it("mounts the viewer only inside AdminGate behind isStaffRole, and the activity view only lazily", () => {
    const app = read("App.tsx");
    expect(app).toMatch(/const AdminViewer = lazy\(\(\) => import\("\.\/admin\/AdminViewer"\)\)/);
    expect(app).toMatch(/route\.kind === "admin"\) return <AdminGate/);
    const gate = app.slice(app.indexOf("function AdminGate"));
    expect(gate).toMatch(/const staff = isStaffRole\(role\)/);
    expect(gate).toMatch(/if \(waiting \|\| !staff\)/);
    expect(gate.indexOf("if (waiting || !staff)")).toBeLessThan(gate.indexOf("<AdminViewer"));
    expect(app.match(/<AdminViewer\b/g)).toHaveLength(1);

    const viewer = read("admin/AdminViewer.tsx");
    expect(viewer).toMatch(/const AdminActivity = lazy\(\(\) => import\("\.\/AdminActivity"\)\)/);
    expect(viewer).not.toMatch(/from\s+["']\.\/AdminActivity["']/);
    expect(viewer).not.toMatch(/from\s+["']\.\/activityModel["']/);
  });

  it("is never staff for a member or a student", () => {
    expect(isStaffRole("member")).toBe(false);
    // "student" is the profiles column default in SQL, though the client type narrows it to member.
    expect(isStaffRole("student" as AccountRole)).toBe(false);
  });
});

describe("staff read migration", () => {
  const sql = readFileSync(
    path.resolve(game, "../../supabase/migrations/20261024163000_progress_events_staff_read.sql"),
    "utf8",
  );
  const code = sql
    .split("\n")
    .filter((line) => !line.trim().startsWith("--"))
    .join("\n")
    .toLowerCase();

  it("adds one select policy on progress_events through is_staff()", () => {
    expect(code).toMatch(
      /create policy "progress_events_select_staff" on public\.progress_events\s+for select to authenticated using \(\(select public\.is_staff\(\)\)\);/,
    );
    expect(code.match(/create policy/g)).toHaveLength(1);
  });

  it("grants nothing, writes nothing, gives anon nothing, and leaves RLS on", () => {
    expect(code).not.toMatch(/\bgrant\b|\brevoke\b/);
    expect(code).not.toMatch(/\bfor (insert|update|delete|all)\b/);
    expect(code).not.toMatch(/\banon\b/);
    expect(code).not.toMatch(/disable row level security|no force row level security/);
    expect(code).not.toMatch(/\bdrop\b/);
    const base = readFileSync(path.resolve(game, "../../supabase/migrations/20261023120000_progress_events.sql"), "utf8");
    expect(base).toMatch(/alter table public\.progress_events enable row level security;/);
  });
});
