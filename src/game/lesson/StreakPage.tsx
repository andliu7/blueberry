/**
 * The streak PAGE: the number, the month, the freezes, one gentle nudge.
 *
 * The celebration (StreakScreen.tsx) answers "what did today add". This page is
 * the one a student opens to look back: a month of days with each run of
 * counted days drawn as ONE continuous pill, two stat cards, and the freezes.
 * It is lazy and only ever loaded from the celebration or the gallery, so it
 * is not on the #/app first paint.
 *
 * Voice rule (ECONOMY.md, CLAUDE.md 2026-08-27): the nudge says what is still
 * open and what one lesson does. It never counts down and never frames a day
 * as lost; a day a freeze or rest covered is drawn as something that happened.
 */

import { useId, useMemo, useState } from "react";
import { STREAK_FREEZE_COST, STREAK_MILESTONES } from "@blueberry/economy";
import { Press } from "../app/ui/Press";
import { DiamondMark } from "../app/ui/HudIcons";
import { progress } from "../app/progress";
import { useProgress } from "../app/hooks";
import { streakPageModel, type StreakMonthCell, type StreakPageModel } from "./streakModel";
import "./streak-page.css";

/* ---------------------------------------------------------------- glyphs -- */

/** The page's own flame: a rim, a graded body and a white core. `frozen` turns it to ice. */
export function PageFlame({ frozen = false, className = "" }: { readonly frozen?: boolean; readonly className?: string }) {
  const id = useId().replace(/[^a-zA-Z0-9]/g, "");
  return (
    <svg viewBox="0 0 120 140" className={className} aria-hidden focusable="false" data-frozen={frozen ? "true" : "false"}>
      <defs>
        <linearGradient id={`b${id}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={frozen ? "#bfe3ff" : "#ff5147"} />
          <stop offset="0.62" stopColor={frozen ? "#79bdf5" : "#ff7a2e"} />
          <stop offset="1" stopColor={frozen ? "#4a9de0" : "#ffa21a"} />
        </linearGradient>
      </defs>
      <ellipse cx="62" cy="128" rx="40" ry="9" fill={frozen ? "#bfe3ff" : "#ffe58a"} opacity="0.7" />
      <path
        d="M64 6c4 18 12 26 24 38 14 14 22 28 22 48 0 24-20 38-48 38S14 116 14 92c0-14 6-24 14-32 2 8 6 12 10 14-2-22 6-44 26-68z"
        fill={frozen ? "#e6f4ff" : "#ffd426"}
      />
      <path
        d="M63 28c3 12 9 19 18 28 11 11 17 22 17 38 0 19-16 30-37 30S24 113 24 95c0-9 3-16 8-22 2 6 5 9 9 10-1-18 5-38 22-55z"
        fill={`url(#b${id})`}
      />
      <path d="M62 78c9 10 16 18 16 28 0 9-7 15-16 15s-16-6-16-15c0-10 7-18 16-28z" fill="#ffffff" />
    </svg>
  );
}


/** The page's own character: a round berry with a star crown. Its face reacts to the state. */
export function PageBerry({ mood, className = "" }: { readonly mood: "proud" | "chilly" | "hello"; readonly className?: string }) {
  const id = useId().replace(/[^a-zA-Z0-9]/g, "");
  const chilly = mood === "chilly";
  return (
    <svg viewBox="0 0 160 170" className={className} aria-hidden focusable="false" data-mood={mood}>
      <defs>
        <radialGradient id={`m${id}`} cx="0.35" cy="0.3" r="0.9">
          <stop offset="0" stopColor="#8b72ff" />
          <stop offset="0.6" stopColor="#5a3fd8" />
          <stop offset="1" stopColor="#3d27a8" />
        </radialGradient>
      </defs>
      <ellipse cx="80" cy="160" rx="44" ry="7" fill="#000" opacity="0.14" />
      {mood === "proud" ? (
        <>
          <path d="M26 100q-16-18-6-34" fill="none" stroke="#33218f" strokeWidth="9" strokeLinecap="round" />
          <path d="M134 100q16-18 6-34" fill="none" stroke="#33218f" strokeWidth="9" strokeLinecap="round" />
        </>
      ) : null}
      <path d="M80 10l5 11 12-2-6 10 10 7-12 3 0 12-9-8-9 8 0-12-12-3 10-7-6-10 12 2z" fill="#3fbf6a" stroke="#2a8f4d" strokeWidth="2" strokeLinejoin="round" />
      <circle cx="80" cy="96" r="58" fill={`url(#m${id})`} stroke="#33218f" strokeWidth="3" />
      <ellipse cx="56" cy="68" rx="14" ry="8" fill="#fff" opacity="0.28" transform="rotate(-30 56 68)" />
      <ellipse cx="62" cy="96" rx="12" ry="14" fill="#fff" />
      <ellipse cx="98" cy="96" rx="12" ry="14" fill="#fff" />
      <circle cx={chilly ? 60 : 64} cy={chilly ? 100 : 97} r="6" fill="#1d1450" />
      <circle cx={chilly ? 96 : 100} cy={chilly ? 100 : 97} r="6" fill="#1d1450" />
      <circle cx="66" cy="94" r="2" fill="#fff" />
      <circle cx="102" cy="94" r="2" fill="#fff" />
      <circle cx="42" cy="116" r="8" fill="#ff7aa8" opacity="0.55" />
      <circle cx="118" cy="116" r="8" fill="#ff7aa8" opacity="0.55" />
      {mood === "proud" ? <path d="M64 120q16 20 32 0z" fill="#1d1450" stroke="#1d1450" strokeWidth="3" strokeLinejoin="round" /> : null}
      {mood === "hello" ? <path d="M66 120q14 14 28 0" fill="none" stroke="#1d1450" strokeWidth="4" strokeLinecap="round" /> : null}
      {chilly ? (
        <>
          <path d="M66 128q14-10 28 0" fill="none" stroke="#1d1450" strokeWidth="4" strokeLinecap="round" />
          <path d="M48 76l16 6M112 76l-16 6" stroke="#1d1450" strokeWidth="4" strokeLinecap="round" />
          <path d="M34 142q46 18 92 0l-6-16q-40 14-80 0z" fill="#bfe3ff" stroke="#4a9de0" strokeWidth="3" strokeLinejoin="round" />
        </>
      ) : null}
    </svg>
  );
}

function DropMark({ className = "" }: { readonly className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden focusable="false">
      <path d="M12 2.5c3.6 4.4 6.2 7.6 6.2 11.2A6.2 6.2 0 0 1 12 20a6.2 6.2 0 0 1-6.2-6.3c0-3.6 2.6-6.8 6.2-11.2z" fill="currentColor" />
      <path d="M9 13.6a3 3 0 0 0 2.2 3" stroke="#fff" strokeWidth="1.5" strokeLinecap="round" fill="none" opacity="0.8" />
    </svg>
  );
}

function SmallFlame({ className = "" }: { readonly className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden focusable="false">
      <path d="M12.6 1.8c.8 3.6 3 5 4.6 7.2 1.4 1.9 2 3.6 2 5.6 0 4.2-3 7.4-7.2 7.4S4.8 18.8 4.8 14.6c0-2.2 1-3.8 2.2-5 .3 1.5 1 2.3 2 2.8-.4-4.6 1.2-7.6 3.6-10.6z" fill="#ff8a2a" />
      <path d="M12 13c1.6 1.8 2.8 3 2.8 4.5 0 1.5-1.2 2.5-2.8 2.5s-2.8-1-2.8-2.5C9.2 16 10.4 14.8 12 13z" fill="#fff" />
    </svg>
  );
}

function LeafGlyph({ className = "" }: { readonly className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden focusable="false">
      <path d="M20.4 3.6c0 8.6-3.6 13.4-9.2 13.4-2.2 0-3.9-.7-5-1.9 1.4-4.2 4.4-6.6 9.1-7.6-4.9.2-8.4 2.4-10.2 6.6C3.4 9.6 6.6 5.4 12.3 4.4c2.8-.5 5.5-.4 8.1-.8z" fill="currentColor" />
    </svg>
  );
}

function Chevron({ dir }: { readonly dir: "left" | "right" }) {
  return (
    <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden focusable="false">
      <path
        d={dir === "left" ? "M14.5 5.5 8 12l6.5 6.5" : "M9.5 5.5 16 12l-6.5 6.5"}
        fill="none"
        stroke="currentColor"
        strokeWidth="3"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/* ----------------------------------------------------------------- parts -- */

const WEEKDAYS = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"] as const;

const KIND_WORD: Readonly<Record<StreakMonthCell["kind"], string>> = {
  counted: "practiced",
  rest: "rest day",
  freeze: "covered by a freeze",
  missed: "no goal met",
  pending: "today, still open",
  future: "not yet",
};

function Calendar({ model }: { readonly model: StreakPageModel }) {
  const slots: (StreakMonthCell | null)[] = [...Array.from({ length: model.lead }, () => null), ...model.cells];
  return (
    <div className="spage-cal">
      <div className="spage-cal-head" aria-hidden>
        {WEEKDAYS.map((d) => (
          <span key={d}>{d}</span>
        ))}
      </div>
      <div className="spage-cal-grid" role="list" aria-label={model.monthLabel}>
        {slots.map((cell, i) => {
          if (cell === null) return <span key={`b${i}`} className="spage-cell" aria-hidden />;
          const col = i % 7;
          const prev = col > 0 ? slots[i - 1] : null;
          const next = col < 6 ? slots[i + 1] : null;
          const run = cell.kind === "counted";
          const joinL = run && prev != null && prev.kind === "counted";
          const joinR = run && next != null && next.kind === "counted";
          return (
            <span
              key={cell.date}
              role="listitem"
              aria-label={`${cell.dayOfMonth}, ${KIND_WORD[cell.kind]}`}
              className="spage-cell"
              data-kind={cell.kind}
              data-today={cell.today ? "true" : "false"}
              data-jl={joinL ? "true" : "false"}
              data-jr={joinR ? "true" : "false"}
            >
              <span className="spage-cell-face">
                {cell.kind === "freeze" ? <DropMark className="spage-cell-icon" /> : null}
                {cell.kind === "rest" ? <LeafGlyph className="spage-cell-icon" /> : null}
                <span className="spage-cell-num">{cell.dayOfMonth}</span>
              </span>
            </span>
          );
        })}
      </div>
    </div>
  );
}

function Sparkle({ className = "" }: { readonly className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden focusable="false">
      <path d="M12 1c1 6 3.5 9.5 11 11-7.5 1.5-10 5-11 11-1-6-3.5-9.5-11-11C8.5 10.5 11 7 12 1z" fill="currentColor" />
    </svg>
  );
}

function Tick() {
  return (
    <svg viewBox="0 0 24 24" className="spage-wd-icon" aria-hidden focusable="false">
      <path d="M6 12.5l4 4 8-9" fill="none" stroke="currentColor" strokeWidth="3.4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

const WEEK_LETTERS = ["S", "M", "T", "W", "T", "F", "S"] as const;

/** The seven days around today as one row of discs: the one-glance read of the week. */
function WeekStrip({ model }: { readonly model: StreakPageModel }) {
  const slots: (StreakMonthCell | null)[] = [...Array.from({ length: model.lead }, () => null), ...model.cells];
  const todayIdx = slots.findIndex((c) => c !== null && c.today);
  if (todayIdx < 0) return null;
  const start = todayIdx - (todayIdx % 7);
  const week = slots.slice(start, start + 7);
  return (
    <div className="spage-week" role="list" aria-label="This week">
      {week.map((cell, i) => (
        <span
          key={i}
          role="listitem"
          className="spage-wd"
          data-kind={cell?.kind ?? "none"}
          data-today={cell?.today ? "true" : "false"}
          aria-label={cell ? `${cell.dayOfMonth}, ${KIND_WORD[cell.kind]}` : "outside this month"}
        >
          <span className="spage-wd-letter">{WEEK_LETTERS[i]}</span>
          <span className="spage-wd-disc">
            {cell === null ? null : cell.kind === "counted" ? (
              <Tick />
            ) : cell.kind === "freeze" ? (
              <DropMark className="spage-wd-icon" />
            ) : cell.kind === "rest" ? (
              <LeafGlyph className="spage-wd-icon" />
            ) : cell.kind === "pending" ? (
              <SmallFlame className="spage-wd-icon" />
            ) : null}
          </span>
        </span>
      ))}
    </div>
  );
}


/** The one focal element under the week: how far to the next milestone. Read from the milestone table, never summed here. */
function GoalCard({ days }: { readonly days: number }) {
  const next = STREAK_MILESTONES.find((m) => m > days);
  const prev = [...STREAK_MILESTONES].reverse().find((m) => m <= days) ?? 0;
  const pct = next === undefined ? 100 : Math.max(6, Math.round(((days - prev) / (next - prev)) * 100));
  return (
    <section className="spage-goal" aria-label="Streak goal">
      <div className="spage-goal-head">
        <span className="spage-goal-ring" aria-hidden>
          <SmallFlame className="spage-goal-flame" />
        </span>
        <div>
          <p className="spage-goal-kicker">{next === undefined ? "Past every milestone" : "Next milestone"}</p>
          <p className="spage-goal-big">{next === undefined ? `${days} days` : `${next} days`}</p>
        </div>
        {next === undefined ? null : <p className="spage-goal-left">{next - days} to go</p>}
      </div>
      <div className="spage-goal-bar" role="img" aria-label={next === undefined ? "All milestones reached" : `${days} of ${next} days`}>
        <span style={{ width: `${pct}%` }} />
      </div>
    </section>
  );
}

function FreezeSlots({ held, max }: { readonly held: number; readonly max: number }) {
  return (
    <span className="spage-slots" role="img" aria-label={`${held} of ${max} streak freezes held`}>
      {Array.from({ length: max }, (_, i) => (
        <span key={i} className="spage-slot" data-held={i < held ? "true" : "false"}>
          {i < held ? <DropMark className="spage-slot-drop" /> : <span>{i + 1}</span>}
        </span>
      ))}
    </span>
  );
}

export interface FreezeSheetProps {
  readonly days: number;
  readonly freezes: StreakPageModel["freezes"];
  readonly balance: number;
  readonly onRefill: () => void;
  readonly onClose: () => void;
}

/** The bottom sheet that tells the student, after the fact, that a freeze held the run. */
export function FreezeSheet({ days, freezes, balance, onRefill, onClose }: FreezeSheetProps) {
  const blocked = freezes.full || !freezes.affordable;
  return (
    <div className="spage-sheet-wrap" role="dialog" aria-modal="true" aria-label="Streak freeze used">
      <button type="button" className="spage-sheet-scrim" aria-label="Close" onClick={onClose} />
      <div className="spage-sheet">
        <span className="spage-grabber" aria-hidden />
        <span className="spage-sheet-balance" aria-label={`${balance} diamonds`}>
          <DiamondMark className="h-4 w-4" />
          {balance}
        </span>
        <h2 className="spage-sheet-title">
          You protected your {days} day streak with a <em>Streak Freeze!</em>
        </h2>
        <div className="spage-sheet-art">
          <PageFlame frozen className="spage-sheet-flame" />
          <PageBerry mood="chilly" className="spage-sheet-berry" />
          <FreezeSlots held={freezes.held} max={freezes.max} />
        </div>
        <Press className="w-full" size="lg" disabled={blocked} onClick={onRefill}>
          {freezes.full ? (
            "Freezes full"
          ) : (
            <span className="spage-refill">
              Refill <DiamondMark className="h-5 w-5" />
              {freezes.cost}
            </span>
          )}
        </Press>
        <Press className="w-full" variant="ghost" onClick={onClose}>
          No thanks
        </Press>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------- the view -- */

export interface StreakPageViewProps {
  readonly model: StreakPageModel;
  readonly balance: number;
  readonly reducedMotion: boolean;
  readonly sheetOpen: boolean;
  readonly ctaLabel: string | null;
  readonly onClose: () => void;
  readonly onCta: () => void;
  readonly onPrev: () => void;
  readonly onNext: () => void;
  readonly onRefill: () => void;
  readonly onCloseSheet: () => void;
}

export function StreakPageView(props: StreakPageViewProps) {
  const { model, balance, reducedMotion } = props;
  const frozen = model.tone === "frozen";
  const parts =
    model.nudge.strong !== null && model.nudge.line.includes(model.nudge.strong)
      ? model.nudge.line.split(model.nudge.strong)
      : [model.nudge.line];
  return (
    <div
      className="spage"
      data-tone={model.tone}
      data-reduced={reducedMotion ? "true" : undefined}
      role="dialog"
      aria-modal="true"
      aria-label={`Streak, ${model.days} ${model.days === 1 ? "day" : "days"}`}
    >
      <header className="spage-top">
        <button type="button" className="spage-icon-btn" aria-label="Close" onClick={props.onClose}>
          <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden focusable="false">
            <path d="M6 6l12 12M18 6 6 18" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
          </svg>
        </button>
        <h1 className="spage-title">Streak</h1>
        <span className="spage-icon-btn" aria-hidden />
      </header>

      <div className="spage-scroll">
        <section className="spage-hero">
          <p className="spage-bubble" role="status">
            {parts.length === 2 ? (
              <>
                {parts[0]}
                <strong>{model.nudge.strong}</strong>
                {parts[1]}
              </>
            ) : (
              model.nudge.line
            )}
          </p>
          <div className="spage-stage">
            <PageFlame frozen={frozen} className="spage-hero-flame" />
            <PageBerry mood={frozen ? "chilly" : model.tone === "start" ? "hello" : "proud"} className="spage-berry" />
            <Sparkle className="spage-spark spage-spark--a" />
            <Sparkle className="spage-spark spage-spark--b" />
            <Sparkle className="spage-spark spage-spark--c" />
          </div>
          <p className="spage-count">{model.days}</p>
          <p className="spage-count-unit">day streak!</p>
        </section>

        <WeekStrip model={model} />
        <GoalCard days={model.days} />

        <div className="spage-month">
          <h2>{model.monthLabel}</h2>
          <div className="spage-month-nav">
            <button type="button" className="spage-icon-btn" aria-label="Previous month" onClick={props.onPrev}>
              <Chevron dir="left" />
            </button>
            <button
              type="button"
              className="spage-icon-btn"
              aria-label="Next month"
              disabled={!model.canNext}
              onClick={props.onNext}
            >
              <Chevron dir="right" />
            </button>
          </div>
        </div>

        <p className="spage-summary">
          <strong>{model.practiced}</strong> {model.practiced === 1 ? "day" : "days"} practiced
          {model.tag === null ? null : <em data-tag={model.tag}>{model.tag}</em>}
          <span aria-hidden>·</span>
          <strong>{model.freezesUsed}</strong> {model.freezesUsed === 1 ? "freeze" : "freezes"} used
        </p>

        <Calendar model={model} />

        <section className="spage-freezes" aria-label="Streak freezes">
          <FreezeSlots held={model.freezes.held} max={model.freezes.max} />
          <p>{model.freezes.held === 0 ? "No freezes" : `${model.freezes.held} of ${model.freezes.max} freezes`}</p>
          <button
            type="button"
            className="spage-buy"
            disabled={model.freezes.full || !model.freezes.affordable}
            onClick={props.onRefill}
            aria-label={
              model.freezes.full
                ? "Streak freezes full"
                : model.freezes.affordable
                  ? `Buy a streak freeze for ${model.freezes.cost} diamonds`
                  : `A streak freeze costs ${model.freezes.cost} diamonds. Not enough yet.`
            }
          >
            {model.freezes.full ? (
              "Full"
            ) : (
              <>
                <DiamondMark className="h-4 w-4" />
                {model.freezes.cost}
              </>
            )}
          </button>
        </section>
      </div>

      {props.ctaLabel !== null && !model.todayCounted ? (
        <div className="spage-dock">
          <Press className="w-full" size="lg" onClick={props.onCta}>
            {props.ctaLabel}
          </Press>
        </div>
      ) : null}

      {props.sheetOpen ? (
        <FreezeSheet
          days={model.days}
          freezes={model.freezes}
          balance={balance}
          onRefill={props.onRefill}
          onClose={props.onCloseSheet}
        />
      ) : null}
    </div>
  );
}

/* ----------------------------------------------------------- the real one -- */

export interface StreakPageProps {
  readonly days: number;
  readonly reducedMotion: boolean;
  /** Open the "freeze used" sheet first, when a freeze covered the day before. */
  readonly announceFreeze?: boolean;
  readonly onClose: () => void;
}

export function StreakPage({ days, reducedMotion, announceFreeze = true, onClose }: StreakPageProps) {
  const snapshot = useProgress();
  const [openedAt] = useState(() => new Date().toISOString());
  const [monthOffset, setMonthOffset] = useState(0);
  const [sheetShown, setSheetShown] = useState(announceFreeze);
  const model = useMemo(
    () => streakPageModel({ journal: snapshot.journal, snapshot: snapshot.economy, now: openedAt, days, monthOffset }),
    [snapshot.journal, snapshot.economy, openedAt, days, monthOffset],
  );
  const refill = () => {
    if (model.freezes.full || !model.freezes.affordable) return;
    progress.spend("streak_freeze", STREAK_FREEZE_COST, "streak-page");
  };
  return (
    <StreakPageView
      model={model}
      balance={snapshot.economy.diamonds.balance}
      reducedMotion={reducedMotion}
      sheetOpen={sheetShown && model.tone === "frozen"}
      ctaLabel="Back to lessons"
      onClose={onClose}
      onCta={onClose}
      onPrev={() => setMonthOffset((n) => n - 1)}
      onNext={() => setMonthOffset((n) => Math.min(0, n + 1))}
      onRefill={refill}
      onCloseSheet={() => setSheetShown(false)}
    />
  );
}
