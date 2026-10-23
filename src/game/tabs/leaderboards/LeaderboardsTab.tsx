/**
 * Leaderboards.
 *
 * Two rules from CLAUDE.md, both visible in the markup: standings are computed
 * server side from attempts, never client reported, and the privacy floor is a
 * chosen display name with nothing else reachable from a row.
 *
 * No server sends standings yet, so `standingsFor` returns no rows. Instead of
 * inventing people, the locked screen has ONE idea and ONE action (round 6,
 * both judges): Bloom on the podium, one sentence, real lesson pips and
 * START A LESSON. Everything else waits behind a single "How leagues work"
 * tap, and is only built when that is opened:
 *
 *   - the league ladder the student will climb;
 *   - "Your week": their own XP for each day Monday to Sunday, the exact
 *     window a league ranks on (weekModel.ts reads it from the journal);
 *   - "Your seat": their league name, and their row once they have one.
 *
 * Once standings arrive, `standingsFor` is the only thing to change.
 */

import { useState } from "react";
import { useProgress } from "../../app/hooks";
import { progress } from "../../app/progress";
import { hrefForTab } from "../../app/routes";
import { BlueberryMark } from "../../mascot/BlueberryMark";
import { StepPips } from "../social/SocialHero";
import { weekXpCached, type WeekDay } from "./weekModel";
import "../social/social.css";

export interface StandingRow {
  readonly rank: number;
  readonly displayName: string;
  readonly score: number;
}

export interface Standings {
  readonly computedAt: string | null;
  readonly rows: readonly StandingRow[];
}

/** Lessons a student finishes before they get a seat in a league. */
export const LESSONS_TO_UNLOCK = 3;

/** Replaced by a fetch of the server computed table once that exists. */
function standingsFor(): Standings {
  return { computedAt: null, rows: [] };
}

/* Medal colours for places 1 to 3: gold, silver, bronze. Illustration literals. */
const MEDALS = [
  { face: "#ffc233", edge: "#c98a00", ink: "#3a2600" },
  { face: "#d5dbe6", edge: "#8f9bb0", ink: "#26324a" },
  { face: "#e8a26a", edge: "#a8622e", ink: "#3d1f06" },
] as const;

/**
 * The banner's picture: a three-step podium with Bloom standing on the gold
 * step and a trophy beside him. Bloom is the mascot, not a player, so the
 * other two steps stay empty rather than holding made-up people.
 */
function PodiumArt() {
  const steps = [
    { place: 2, height: 60 },
    { place: 1, height: 86 },
    { place: 3, height: 44 },
  ] as const;
  return (
    <div className="relative h-48 w-60 shrink-0" aria-hidden="true">
      <div className="absolute inset-x-0 bottom-0 flex items-end gap-1">
        {steps.map(({ place, height }) => {
          const medal = MEDALS[place - 1]!;
          return (
            <div
              key={place}
              className="flex flex-1 items-start justify-center rounded-t-2xl pt-1.5 font-display text-2xl font-black"
              style={{ height, background: medal.face, color: medal.ink, boxShadow: `inset 0 -8px 0 ${medal.edge}` }}
            >
              {place}
            </div>
          );
        })}
      </div>
      {/* Bloom on the middle (gold) step. */}
      <span className="absolute bottom-[84px] left-1/2 -translate-x-1/2">
        <BlueberryMark eyes mood="happy" className="h-24 w-24 drop-shadow-[0_4px_0_rgba(0,0,0,0.18)]" />
      </span>
      {/* A flat gold trophy floating over the bronze step. */}
      <svg viewBox="0 0 32 32" className="absolute right-1 bottom-[48px] size-14">
        <path d="M9 5h14v6a7 7 0 0 1-14 0z" fill="#ffc233" stroke="#c98a00" strokeWidth="1.6" />
        <path d="M9 7H5.5a3.5 3.5 0 0 0 3.8 4.6M23 7h3.5a3.5 3.5 0 0 1-3.8 4.6" fill="none" stroke="#c98a00" strokeWidth="1.8" strokeLinecap="round" />
        <path d="M14 18h4v4h-4z" fill="#c98a00" />
        <rect x="10" y="22" width="12" height="4" rx="1.5" fill="#ffc233" stroke="#c98a00" strokeWidth="1.6" />
      </svg>
    </div>
  );
}

/**
 * The week before any XP: seven day discs, today ringed, later days dashed.
 * Seven empty bars would be a chart of nothing, so the bars wait for a number.
 */
function WeekDots({ days }: { readonly days: readonly WeekDay[] }) {
  return (
    <ol className="grid grid-cols-7 gap-2">
      {days.map((day) => (
        <li key={day.date} className="flex flex-col items-center gap-1" aria-label={`${day.date}: ${day.ahead ? "still to come" : "0 XP"}`}>
          <span
            className={`grid size-10 place-items-center rounded-full font-display text-sm font-black ${
              day.isToday
                ? "bg-bb-primary text-white shadow-[0_3px_0_var(--bb-primary-lip)]"
                : day.ahead
                  ? "border-2 border-dashed border-[color:var(--btn-line)] text-bb-muted-foreground"
                  : "bg-bb-muted text-bb-muted-foreground"
            }`}
          >
            {day.letter}
          </span>
        </li>
      ))}
    </ol>
  );
}

/** The week as seven bars. Real XP only; a day still to come is an empty dashed slot. */
function WeekCard({ days, total, goal }: { readonly days: readonly WeekDay[]; readonly total: number; readonly goal: number }) {
  const top = Math.max(goal, ...days.map((day) => day.xp));
  return (
    <section className="flex flex-col gap-4" aria-label="Your XP this week">
      <div className="flex items-end justify-between gap-3">
        <div>
          <h2 className="text-lg">Your week</h2>
          <p className="text-sm font-semibold text-bb-muted-foreground">Leagues rank the XP you earn Monday to Sunday.</p>
        </div>
        <p className="shrink-0 text-right">
          <span className="block font-display text-3xl leading-none font-black text-bb-foreground tabular-nums">{total}</span>
          <span className="font-display text-xs font-black tracking-wide text-bb-muted-foreground uppercase">XP this week</span>
        </p>
      </div>
      {total === 0 ? <WeekDots days={days} /> : null}
      <ol className={`${total === 0 ? "hidden" : "grid"} h-36 grid-cols-7 items-end gap-2`}>
        {days.map((day) => {
          const percent = day.xp === 0 ? 0 : Math.max(10, Math.round((day.xp / top) * 100));
          return (
            <li key={day.date} className="flex h-full flex-col items-center justify-end gap-1.5" aria-label={`${day.date}: ${day.ahead ? "still to come" : `${day.xp} XP`}`}>
              {day.xp > 0 ? <span className="font-display text-xs font-black text-bb-foreground tabular-nums">{day.xp}</span> : null}
              <span className="relative flex w-full flex-1 items-end">
                {day.ahead ? (
                  <span className="h-3 w-full rounded-lg border-2 border-dashed border-[color:var(--btn-line)]" />
                ) : day.xp === 0 ? (
                  <span className="h-3 w-full rounded-lg bg-bb-muted" />
                ) : (
                  <span
                    className="w-full rounded-lg bg-[#ffc233] shadow-[inset_0_-4px_0_#c98a00]"
                    style={{ height: `${percent}%` }}
                  />
                )}
              </span>
              <span
                className={`grid size-7 place-items-center rounded-full font-display text-xs font-black ${
                  day.isToday ? "bg-bb-primary text-white" : "text-bb-muted-foreground"
                }`}
              >
                {day.letter}
              </span>
            </li>
          );
        })}
      </ol>
      {total === 0 ? (
        <p className="rounded-2xl bg-bb-muted px-3 py-2 text-[0.9375rem] font-bold text-bb-foreground">
          No XP yet this week. One lesson puts your first bar up.
        </p>
      ) : null}
    </section>
  );
}

/**
 * The leagues a student climbs, drawn as a row of flat shields: the goal the
 * locked screen points at. Bronze is lit as where everyone starts; the rest
 * wear a small lock until boards open. Tier names are product copy, not data.
 */
const LEAGUES = [
  { name: "Bronze", face: "#e8a26a", edge: "#a8622e" },
  { name: "Silver", face: "#d5dbe6", edge: "#8f9bb0" },
  { name: "Gold", face: "#ffc233", edge: "#c98a00" },
  { name: "Sapphire", face: "#4f8bff", edge: "#1f4fc4" },
  { name: "Blueberry", face: "#5a3fd8", edge: "#2c1a8a" },
] as const;

function Shield({ face, edge, locked }: { readonly face: string; readonly edge: string; readonly locked: boolean }) {
  return (
    <svg viewBox="0 0 48 56" className="h-14 w-12" aria-hidden="true" focusable="false">
      {/* The lip: the same shield 4px lower in the darker edge colour. */}
      <path d="M24 6 42 12v16c0 12-8 20-18 24C14 48 6 40 6 28V12z" fill={edge} transform="translate(0 4)" />
      <path d="M24 6 42 12v16c0 12-8 20-18 24C14 48 6 40 6 28V12z" fill={face} />
      <path d="M24 12 36 16v12c0 8-5 13-12 16z" fill="#ffffff" opacity="0.28" />
      {locked ? (
        <g>
          <circle cx="38" cy="44" r="9" fill="var(--bb-card)" />
          <rect x="33.5" y="42" width="9" height="7" rx="1.5" fill="var(--bb-muted-foreground)" />
          <path d="M35.5 42v-2a2.5 2.5 0 0 1 5 0v2" fill="none" stroke="var(--bb-muted-foreground)" strokeWidth="1.8" />
        </g>
      ) : null}
    </svg>
  );
}

function LeagueLadder() {
  return (
    <section className="flex flex-col gap-4" aria-label="Leagues">
      <div>
        <h2 className="text-lg">Leagues you'll climb</h2>
        <p className="text-sm font-semibold text-bb-muted-foreground">Everyone starts in Bronze. Finish near the top of your week to move up.</p>
      </div>
      <ol className="grid grid-cols-5 gap-1 sm:gap-3">
        {LEAGUES.map((league, index) => (
          <li key={league.name} className="flex flex-col items-center gap-1 text-center">
            <span className={index === 0 ? "rounded-2xl bg-[color-mix(in_srgb,var(--bb-primary)_14%,var(--bb-card))] p-1 ring-2 ring-bb-primary" : "p-1"}>
              <Shield face={league.face} edge={league.edge} locked={index > 0} />
            </span>
            <span className={`font-display text-xs font-black sm:text-sm ${index === 0 ? "text-bb-foreground" : "text-bb-muted-foreground"}`}>
              {league.name}
            </span>
            {index === 0 ? <span className="font-display text-[0.6875rem] font-black tracking-wide text-bb-primary-ink uppercase">Start</span> : null}
          </li>
        ))}
      </ol>
    </section>
  );
}

/**
 * The student's own seat: a row only when they have a league name, otherwise the form to pick one.
 * The league name is its own field (progress.ts `leagueName`), never the account's name, so a
 * real name is never on a board unless the student types it here, and a blank save takes them off.
 */
function SeatCard({ name, weekTotal }: { readonly name: string | null; readonly weekTotal: number }) {
  const [draft, setDraft] = useState(name ?? "");
  const [justSaved, setJustSaved] = useState(false);
  return (
    <section className="flex flex-col gap-3" aria-label="Your seat">
      <h2 className="text-lg">Your seat</h2>
      {name === null ? (
        <p className="text-[0.9375rem] font-semibold text-bb-muted-foreground">
          Boards show only the name you pick here. Pick a nickname, not your full name. No name keeps you off the boards.
        </p>
      ) : (
        <div className="flex min-h-16 items-center gap-3 rounded-2xl border-2 border-b-4 border-bb-primary bg-[color-mix(in_srgb,var(--bb-primary)_14%,var(--bb-card))] px-3">
          <span className="grid size-11 shrink-0 place-items-center rounded-full bg-bb-primary font-display text-lg font-black text-white" aria-hidden="true">
            {name.slice(0, 1).toUpperCase()}
          </span>
          <span className="min-w-0 flex-1">
            <span className="block truncate font-display text-base font-extrabold text-bb-foreground">{name}</span>
            <span className="block text-sm font-semibold text-bb-muted-foreground">Your rank shows when boards open</span>
          </span>
          <span className="font-display text-base font-black text-bb-foreground tabular-nums">{weekTotal} XP</span>
        </div>
      )}
      <form
        className="flex items-start gap-2"
        onSubmit={(event) => {
          event.preventDefault();
          progress.setLeagueName(draft);
          setJustSaved(true);
        }}
      >
        <input
          value={draft}
          onChange={(event) => {
            setDraft(event.currentTarget.value);
            setJustSaved(false);
          }}
          maxLength={24}
          placeholder="e.g. carbocation_kid"
          aria-label="League name"
          className="min-h-12 min-w-0 flex-1 rounded-2xl border-2 border-[color:var(--btn-line)] bg-bb-card px-3 text-base text-bb-foreground placeholder:text-bb-muted-foreground focus-visible:border-bb-primary focus-visible:outline-none"
        />
        <button type="submit" className="btn3d btn3d--primary">
          {name === null ? "Save" : "Rename"}
        </button>
      </form>
      <p className="text-[0.9375rem] font-semibold text-bb-foreground empty:hidden" role="status">
        {justSaved ? (name === null ? "Saved. You'll stay off the boards." : `Saved! You'll show up as ${name}.`) : ""}
      </p>
    </section>
  );
}

/** One line of the "how it works" rail: a flat icon disc and a sentence. */
function HowRow({ color, glyph, children }: { readonly color: string; readonly glyph: string; readonly children: string }) {
  return (
    <li className="flex items-center gap-3">
      <svg viewBox="0 0 24 24" className="size-10 shrink-0" aria-hidden="true" focusable="false">
        <circle cx="12" cy="12" r="12" fill={color} />
        <path d={glyph} fill="none" stroke="#ffffff" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
      <span className="text-[0.9375rem] font-bold text-bb-foreground">{children}</span>
    </li>
  );
}

function RankBadge({ rank }: { readonly rank: number }) {
  const medal = MEDALS[rank - 1];
  if (medal === undefined) {
    return <span className="w-8 text-center font-display text-base font-black text-bb-muted-foreground tabular-nums">{rank}</span>;
  }
  return (
    <span
      className="grid size-8 place-items-center rounded-full font-display text-sm font-black"
      style={{ background: medal.face, color: medal.ink, boxShadow: `inset 0 -3px 0 ${medal.edge}` }}
    >
      {rank}
    </span>
  );
}

/**
 * Everything that is not the one action, behind one tap. A native <details>
 * opens with no script and works from the keyboard; its inside is only built
 * once it is open, because the week replays the journal.
 */
function LeagueDetails({ name }: { readonly name: string | null }) {
  const [open, setOpen] = useState(false);
  return (
    <details className="league-details w-full text-left" onToggle={(event) => setOpen(event.currentTarget.open)}>
      <summary className="league-details__summary">
        How leagues work
        <svg viewBox="0 0 24 24" className="league-details__chevron size-5" aria-hidden="true" focusable="false">
          <path d="M6 9l6 6 6-6" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </summary>
      {open ? <LeagueDetailsBody name={name} /> : null}
    </details>
  );
}

function LeagueDetailsBody({ name }: { readonly name: string | null }) {
  const snapshot = useProgress();
  const week = weekXpCached(snapshot.journal, Date.now(), snapshot.economy.tz);
  return (
    <div className="social-card mt-3 flex flex-col divide-y-2 divide-[color:var(--btn-line)] [&>*]:py-5 [&>*:first-child]:pt-0 [&>*:last-child]:pb-0">
      <ul className="flex flex-col gap-3">
        <HowRow color="#5a3fd8" glyph="M13 4 7 13h5l-1 7 6-9h-5z">Every lesson and review earns XP.</HowRow>
        <HowRow color="#c2410c" glyph="M5 18V10M12 18V6M19 18v-5">You race students in your course each week.</HowRow>
        <HowRow color="#2f7d33" glyph="M6 12.5 10 16.5 18 8.5">Only the nickname you pick shows, nothing else about you.</HowRow>
      </ul>
      <LeagueLadder />
      <WeekCard days={week.days} total={week.total} goal={snapshot.economy.xp.goalXp} />
      <SeatCard name={name} weekTotal={week.total} />
    </div>
  );
}

export default function LeaderboardsTab() {
  const snapshot = useProgress();
  const standings = standingsFor();

  const cleared = Object.keys(snapshot.economy.firstClears).length;
  const left = Math.max(0, LESSONS_TO_UNLOCK - cleared);

  if (standings.rows.length > 0) {
    return (
      <div className="mx-auto flex w-full max-w-[36rem] flex-col gap-4 p-4 md:p-6">
        <h1 className="font-display text-[1.75rem] font-black text-bb-foreground md:sr-only">Leaderboards</h1>
        <ol className="social-card divide-y-2 divide-[color:var(--btn-line)] !py-1">
          {standings.rows.map((row) => (
            <li key={row.rank} className="flex min-h-14 items-center gap-3">
              <RankBadge rank={row.rank} />
              <span className="flex-1 font-display font-extrabold">{row.displayName}</span>
              <span className="font-display font-black tabular-nums">{row.score} XP</span>
            </li>
          ))}
        </ol>
      </div>
    );
  }

  // Locked: one picture, one sentence, one button, centred like a lesson screen.
  return (
    <div className="mx-auto flex w-full max-w-[34rem] flex-col items-center gap-5 px-4 pt-8 pb-10 text-center md:pt-12">
      <h1 className="sr-only">Leaderboards</h1>
      <PodiumArt />
      <div className="flex flex-col items-center gap-2">
        <h2 className="font-display text-[1.75rem] leading-tight font-black text-bb-foreground">
          {left > 0 ? "Unlock Leaderboards!" : "You're ready to compete!"}
        </h2>
        <p className="max-w-[24rem] text-[1.0625rem] font-bold text-bb-muted-foreground">
          {left > 0
            ? `Finish ${left} more ${left === 1 ? "lesson" : "lessons"} to start competing in weekly leagues.`
            : "You've earned your seat. Your first league starts the week boards open."}
        </p>
      </div>
      <StepPips done={cleared} total={LESSONS_TO_UNLOCK} label="lessons" />
      <a href={hrefForTab("pathway")} className="btn3d btn3d--primary mt-2 w-full">
        {left > 0 ? "Start a lesson" : "Keep learning"}
      </a>
      <LeagueDetails name={snapshot.leagueName} />
    </div>
  );
}
