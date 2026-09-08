/**
 * Leaderboards. Daily, weekly, monthly, global.
 *
 * Two rules from CLAUDE.md, both visible in the markup: standings are computed
 * server side from attempts, never client reported, and the privacy floor is a
 * chosen display name with nothing else reachable from a row.
 *
 * Phase 6 supplies the standings. This tab renders from a Standings value and
 * today the only value is the empty one, which it says out loud rather than
 * inventing rows. The local diamonds count is deliberately NOT shown here as a
 * rank: a client number on a leaderboard is the exact thing the rule forbids.
 */

import { useState } from "react";
import { Card, Pill } from "../../app/ui/Card";
import { useProgress } from "../../app/hooks";
import { progress } from "../../app/progress";

export type Window = "daily" | "weekly" | "monthly";

export interface StandingRow {
  readonly rank: number;
  readonly displayName: string;
  readonly score: number;
}

export interface Standings {
  readonly window: Window;
  readonly computedAt: string | null;
  readonly rows: readonly StandingRow[];
}

/** Phase 6 replaces this with a fetch of the server computed table. */
function standingsFor(window: Window): Standings {
  return { window, computedAt: null, rows: [] };
}

const WINDOWS: readonly { readonly id: Window; readonly label: string }[] = [
  { id: "daily", label: "Today" },
  { id: "weekly", label: "This week" },
  { id: "monthly", label: "This month" },
];

export default function LeaderboardsTab() {
  const [window, setWindow] = useState<Window>("daily");
  const snapshot = useProgress();
  const standings = standingsFor(window);
  const [draft, setDraft] = useState(snapshot.displayName ?? "");

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-4 p-4 md:p-6">
      {/* A SEGMENTED CONTROL, not three loose pills. One track holding three
          equal segments that span the content width, the way the owner's
          leaderboard capture and every platform's own control do it: the group
          reads as one switch with a position, rather than as three buttons of
          which one happens to be filled. Roving tabindex plus arrow keys is
          what the tablist role promises a keyboard, so it is wired. */}
      <div
        className="grid grid-cols-3 gap-1 rounded-full border border-bb-border bg-bb-muted p-1"
        role="tablist"
        aria-label="Leaderboard window"
        onKeyDown={(event) => {
          const step = event.key === "ArrowRight" ? 1 : event.key === "ArrowLeft" ? -1 : 0;
          if (step === 0) return;
          event.preventDefault();
          const index = WINDOWS.findIndex((w) => w.id === window);
          const next = WINDOWS[(index + step + WINDOWS.length) % WINDOWS.length];
          if (next !== undefined) setWindow(next.id);
        }}
      >
        {WINDOWS.map((w) => {
          const selected = window === w.id;
          return (
            <button
              key={w.id}
              type="button"
              role="tab"
              aria-selected={selected}
              tabIndex={selected ? 0 : -1}
              onPointerDown={() => setWindow(w.id)}
              className={`press min-h-11 rounded-full px-3 text-scale-sm font-bold ${
                selected ? "border-2 border-[color:var(--bb-primary-edge)] bg-bb-primary text-bb-primary-foreground" : "border-2 border-bb-border bg-bb-card text-bb-muted-foreground"
              }`}
            >
              {w.label}
            </button>
          );
        })}
      </div>

      <Card>
        <div className="flex items-center gap-3">
          {/* The tier badge the capture leads with: the league you are in, as a
              shape, before any row of names. */}
          <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border-2 border-[color:var(--bb-primary-edge)] bg-[color:var(--accent-from)] text-white" aria-hidden>
            <svg viewBox="0 0 24 24" className="h-7 w-7" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M6 4h12v4a6 6 0 0 1-12 0zM6 6H3v1a4 4 0 0 0 3 3.9M18 6h3v1a4 4 0 0 1-3 3.9M9 20h6M12 14v6" />
            </svg>
          </span>
          <div className="min-w-0 flex-1">
            <h2 className="text-scale-lg font-semibold leading-tight">Global</h2>
            <p className="text-scale-xs text-bb-muted-foreground">
              {WINDOWS.find((w) => w.id === window)?.label}, everyone on Blueberry
            </p>
          </div>
          <Pill>Phase 6 data</Pill>
        </div>
        {standings.rows.length === 0 ? (
          <>
            {/* The league card's SHAPE, with no invented people in it. Three
                placeholder rows carry the real column rhythm (rank, avatar,
                display name, score) so the layout can be judged now and so a
                student sees what this becomes, and every one of them says it
                is waiting rather than pretending to be a person. */}
            <ol className="mt-3 divide-y divide-bb-border" aria-hidden>
              {[1, 2, 3].map((rank) => (
                <li key={rank} className="flex items-center gap-3 py-2.5">
                  <span className="w-6 text-center text-scale-sm font-bold text-bb-muted-foreground tabular-nums">{rank}</span>
                  <span className="h-9 w-9 shrink-0 rounded-full bg-bb-muted" />
                  <span className="skeleton h-4 flex-1 rounded-full" style={{ maxWidth: `${11 - rank}rem` }} />
                  <span className="skeleton h-4 w-12 rounded-full" />
                </li>
              ))}
            </ol>
            <p className="mt-3 text-scale-sm text-bb-muted-foreground">
              Standings are computed on the server from everyone&apos;s attempts, and that server
              arrives in Phase 6. Nothing here is made up in the meantime: the rows above are the
              shape this takes, not people.
            </p>
          </>
        ) : (
          <ol className="mt-3 divide-y divide-bb-border">
            {standings.rows.map((row) => (
              <li key={row.rank} className="flex items-center justify-between py-2">
                <span className="font-semibold">
                  {row.rank}. {row.displayName}
                </span>
                <span className="text-bb-muted-foreground">{row.score}</span>
              </li>
            ))}
          </ol>
        )}
      </Card>

      <Card>
        <h2 className="text-scale-base font-semibold">Your display name</h2>
        <p className="mt-1 text-scale-sm text-bb-muted-foreground">
          Leaderboards show a name you choose, never your real one, and no profile is reachable
          from a row. Leave it blank to stay off the boards entirely.
        </p>
        <form
          className="mt-3 flex gap-2"
          onSubmit={(event) => {
            event.preventDefault();
            progress.setDisplayName(draft);
          }}
        >
          <input
            value={draft}
            onChange={(event) => setDraft(event.currentTarget.value)}
            maxLength={24}
            placeholder="e.g. carbocation_kid"
            aria-label="Display name"
            className="min-h-11 flex-1 rounded-2xl border-2 border-bb-input bg-bb-card px-3 text-scale-base"
          />
          <button type="submit" className="press min-h-11 rounded-2xl border-2 border-[color:var(--bb-primary-edge)] bg-bb-primary px-4 font-semibold text-bb-primary-foreground">
            Save
          </button>
        </form>
        {snapshot.displayName === null ? (
          <p className="mt-2 text-scale-xs text-bb-muted-foreground">You are opted out of leaderboards.</p>
        ) : (
          <p className="mt-2 text-scale-xs text-bb-muted-foreground">Showing as {snapshot.displayName}.</p>
        )}
      </Card>
    </div>
  );
}
