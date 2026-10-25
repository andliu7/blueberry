/**
 * The admin activity view, at #/app/admin/activity (STATUS F1): a live list of
 * recent lesson runs for the accounts the viewer picks, so the owner can watch
 * a TA's test accounts play.
 *
 * READ ONLY. It selects profiles and progress_events and writes nothing to the
 * server. Which rows come back is RLS's call: progress_events_select_staff
 * (migration 20261024163000) lets staff read every account, and without it a
 * staff account sees only its own rows, which this screen says out loud.
 *
 * Lazy (AdminViewer.tsx), and AdminViewer only mounts inside App.tsx's
 * AdminGate, so a student never downloads this chunk or its stylesheet.
 */
import { useCallback, useEffect, useMemo, useState } from "react";
import type { SupabaseClient } from "@supabase/supabase-js";
import { getSupabase } from "@/lib/supabase";
import { PATHWAY_UNITS } from "../demo/pathwayMap";
import { Press } from "../app/ui/Press";
import {
  activityRows,
  classifyLoad,
  durationLabel,
  firstTryLabel,
  type ActivityRow,
  type EventRow,
  type LoadState,
  type ProfileRow,
} from "./activityModel";
import "./activity.css";

const WINDOW_MS = 48 * 60 * 60 * 1000;
const LIMIT = 500;
const REFRESH_MS = 15_000;
const PICKED_KEY = "blueberry.admin.activity.accounts.v1";
const MIGRATIONS =
  "supabase/migrations/20261023120000_progress_events.sql and 20261024163000_progress_events_staff_read.sql";

/** Everything the screen can be showing, besides the table itself. */
export type Notice = LoadState | "no-supabase" | "loading" | "empty" | "own-only";

const titles = new Map(PATHWAY_UNITS.flatMap((unit) => unit.nodes.map((node) => [node.id, node.title] as const)));
const titleFor = (id: string) => titles.get(id) ?? null;

/** The chosen accounts are a per-viewer convenience, so a blocked storage just starts empty. */
function readPicked(): string[] {
  try {
    const raw = localStorage.getItem(PICKED_KEY);
    const parsed: unknown = raw === null ? [] : JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter((x): x is string => typeof x === "string") : [];
  } catch {
    return [];
  }
}
function writePicked(ids: readonly string[]): void {
  try {
    localStorage.setItem(PICKED_KEY, JSON.stringify(ids));
  } catch {
    // Storage blocked: the picker still works for this visit.
  }
}

const timeLabel = (iso: string) =>
  new Date(iso).toLocaleString(undefined, { weekday: "short", hour: "numeric", minute: "2-digit" });

/* ------------------------------------------------------------ notices -- */

/** The honest line for each state that is not a table. Exported for the markup test. */
export function ActivityNotice({ notice }: { readonly notice: Notice }) {
  switch (notice) {
    case "ok":
      return null;
    case "loading":
      return <p className="aa-note">Loading activity...</p>;
    case "no-supabase":
      return <p className="aa-note">Supabase is not configured in this build, so there is no account activity to read.</p>;
    case "not-applied":
      return (
        <p className="aa-note aa-note--warn" role="alert">
          progress_events is not applied yet: run {MIGRATIONS} in the Supabase SQL editor.
        </p>
      );
    case "denied":
      return (
        <p className="aa-note aa-note--warn" role="alert">
          Your account cannot read other students' events yet (the staff policy is not applied). Run
          20261024163000_progress_events_staff_read.sql, and check your role is admin or owner in the roster.
          If you were signed out in another tab, sign in again.
        </p>
      );
    case "own-only":
      return (
        <p className="aa-note aa-note--warn" role="note">
          Only your own events came back. If the picked accounts have played, the staff policy
          (20261024163000_progress_events_staff_read.sql) is not applied yet.
        </p>
      );
    case "empty":
      return (
        <p className="aa-note">
          No activity in the last 48 hours for these accounts. If they did play, check that
          20261024163000_progress_events_staff_read.sql is applied.
        </p>
      );
    case "error":
      return (
        <p className="aa-note aa-note--warn" role="alert">
          Could not load activity. It will try again on the next refresh.
        </p>
      );
  }
}

/* -------------------------------------------------------------- table -- */

/** The runs, newest first. Exported for the markup test. */
export function ActivityTable({ rows }: { readonly rows: readonly ActivityRow[] }) {
  if (rows.length === 0) return null;
  return (
    <div className="aa-table-wrap">
      <table className="aa-table">
        <thead>
          <tr>
            <th scope="col">Who</th>
            <th scope="col">Lesson</th>
            <th scope="col">Status</th>
            <th scope="col">First try</th>
            <th scope="col">Started</th>
            <th scope="col">Time</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.key}>
              <td data-label="Who">{row.who}</td>
              <td data-label="Lesson">{row.lesson}</td>
              <td data-label="Status">
                <span className={`aa-status aa-status--${row.status.replace(" ", "-")}`}>{row.status}</span>
              </td>
              <td data-label="First try">{firstTryLabel(row.firstTry)}</td>
              <td data-label="Started">{timeLabel(row.started)}</td>
              <td data-label="Time">{durationLabel(row.durationMs)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/* ------------------------------------------------------------- picker -- */

function AccountPicker({
  profiles,
  picked,
  onChange,
}: {
  readonly profiles: readonly ProfileRow[];
  readonly picked: readonly string[];
  readonly onChange: (next: string[]) => void;
}) {
  const [search, setSearch] = useState("");
  const q = search.trim().toLowerCase();
  const shown = profiles.filter(
    (p) => q === "" || (p.full_name ?? "").toLowerCase().includes(q) || (p.email ?? "").toLowerCase().includes(q),
  );
  const toggle = (id: string) => onChange(picked.includes(id) ? picked.filter((x) => x !== id) : [...picked, id]);
  return (
    <details className="aa-picker">
      <summary>
        Accounts: {picked.length === 0 ? "everyone with activity" : `${picked.length} picked`}
      </summary>
      <input
        type="search"
        className="aa-search"
        placeholder="Search by name or email"
        aria-label="Search accounts"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
      />
      {picked.length > 0 ? (
        <button type="button" className="aa-clear" onClick={() => onChange([])}>
          Clear, show everyone
        </button>
      ) : null}
      <ul className="aa-accounts">
        {shown.slice(0, 100).map((p) => (
          <li key={p.id}>
            <label>
              <input type="checkbox" checked={picked.includes(p.id)} onChange={() => toggle(p.id)} />
              <span>{p.full_name?.trim() || p.email || p.id.slice(0, 8)}</span>
              {p.full_name && p.email ? <span className="aa-email">{p.email}</span> : null}
            </label>
          </li>
        ))}
      </ul>
    </details>
  );
}

/* --------------------------------------------------------------- page -- */

export default function AdminActivity() {
  const [picked, setPicked] = useState<string[]>(readPicked);
  const [profiles, setProfiles] = useState<readonly ProfileRow[]>([]);
  const [rows, setRows] = useState<readonly EventRow[]>([]);
  const [notice, setNotice] = useState<Notice>("loading");
  const [updated, setUpdated] = useState<string | null>(null);
  const [me, setMe] = useState<string | null>(null);

  const choose = (next: string[]) => {
    setPicked(next);
    writePicked(next);
  };

  const refresh = useCallback(async () => {
    const supabase: SupabaseClient | null = await getSupabase();
    if (supabase === null) {
      setNotice("no-supabase");
      return;
    }
    let query = supabase
      .from("progress_events")
      .select("user_id,id,kind,at,event")
      .gte("at", new Date(Date.now() - WINDOW_MS).toISOString())
      .order("at", { ascending: false })
      .order("seq", { ascending: false })
      .limit(LIMIT);
    if (picked.length > 0) query = query.in("user_id", picked);
    const result = await query;
    const state = classifyLoad(result);
    setUpdated(new Date().toISOString());
    if (state !== "ok") {
      setNotice(state);
      return;
    }
    const data = (result.data ?? []) as EventRow[];
    setRows(data);
    // Without the staff policy RLS silently returns only the viewer's own rows,
    // so "every row is mine" is the one sign of it the client can see.
    const onlyMePicked = picked.length > 0 && picked.every((id) => id === me);
    const ownOnly = me !== null && !onlyMePicked && data.length > 0 && data.every((row) => row.user_id === me);
    setNotice(ownOnly ? "own-only" : data.length === 0 ? "empty" : "ok");
  }, [picked, me]);

  // Profiles and the viewer's own id, once: the picker's list, and the names in the table.
  useEffect(() => {
    let live = true;
    void (async () => {
      const supabase = await getSupabase();
      if (supabase === null || !live) return;
      const { data: auth } = await supabase.auth.getUser();
      if (live) setMe(auth.user?.id ?? null);
      const { data } = await supabase.from("profiles").select("id,full_name,email").order("full_name");
      if (live && data) setProfiles(data as ProfileRow[]);
    })();
    return () => {
      live = false;
    };
  }, []);

  // Polling in a useEffect: the interval is created when the picked accounts
  // change and cleared in the cleanup, so there is never more than one timer.
  // It skips a tick while the tab is hidden, and refreshes on coming back.
  useEffect(() => {
    void refresh();
    const tick = () => {
      if (document.visibilityState === "visible") void refresh();
    };
    const timer = window.setInterval(tick, REFRESH_MS);
    document.addEventListener("visibilitychange", tick);
    return () => {
      window.clearInterval(timer);
      document.removeEventListener("visibilitychange", tick);
    };
  }, [refresh]);

  // Recomputed per render from the raw rows, so "in progress" turns into
  // "left" on the next refresh without a new fetch shaping it.
  const runs = useMemo(
    () => activityRows({ rows, profiles, titleFor, now: updated ?? new Date().toISOString(), userIds: picked }),
    [rows, profiles, updated, picked],
  );

  return (
    <section className="aa-page" aria-label="Lesson activity">
      <header className="aa-head">
        <h1 className="bb-h1 aa-title">Lesson activity</h1>
        <p className="aa-sub">
          Lesson runs in the last 48 hours, newest first. Refreshes every 15 seconds while this tab is open.
        </p>
      </header>
      <div className="aa-controls">
        <AccountPicker profiles={profiles} picked={picked} onChange={choose} />
        <div className="aa-refresh">
          <Press variant="secondary" size="sm" onClick={() => void refresh()}>
            Refresh now
          </Press>
          <span className="aa-updated" aria-live="polite">
            {updated === null ? "Not loaded yet" : `Last updated ${new Date(updated).toLocaleTimeString()}`}
          </span>
        </div>
      </div>
      {/* Rows can load and still hold no lesson runs (only chests or spends): that reads as empty too. */}
      <ActivityNotice notice={notice === "ok" && runs.length === 0 ? "empty" : notice} />
      {notice === "ok" || notice === "own-only" ? <ActivityTable rows={runs} /> : null}
    </section>
  );
}
