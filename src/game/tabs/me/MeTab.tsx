/**
 * Me: the student's profile, and where the app is set up for them.
 *
 * THREE SCREENS, each its own hash route so the browser back button and the
 * phone's back gesture step between them:
 *   #/app/me               the profile
 *   #/app/me/settings      the settings list (one-line rows)
 *   #/app/me/settings/pka  the pKa editor, opened from a settings row
 *
 * THE PROFILE, top to bottom on a phone (at 1024px and up the calendar and
 * tools move to a side column so the wide screen is used):
 *   1. Profile: Bloom as the avatar, the student's name (editable), when they
 *      joined and which course they are on, and the SETTINGS button.
 *   2. Statistics: day streak, total XP, mastery rank, days studied.
 *   3. Streak calendar with today's goal track (owner placed it here).
 *   4. This week: XP per day for the last seven days, with the goal line.
 *   5. Achievements: five badges, each a ladder of levels with a meter.
 *   6. Your tools.
 *
 * ONE SOURCE FOR EVERY NUMBER. Round 3 read lesson records the dev beta flag
 * fills in, beside activity it does not, and contradicted itself. Every figure
 * now comes from the real journal via meModel.ts. Diamonds are deliberately
 * not repeated here: the header already shows them on every screen.
 *
 * KEYBOARD. Every control fires on onClick, which a mouse, a tap, Enter and
 * Space all trigger. Round 3 wired onPointerDown only, so Enter did nothing.
 *
 * NOTHING HERE IS AN ENTITLEMENT. CLAUDE.md: anything that gates access is
 * enforced server side. This screen draws a snapshot and edits settings that
 * only change what this device shows.
 */

import { Suspense, lazy, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { localDate, type DailyGoalTier, type EconomyEvent } from "@blueberry/economy";
import { useLanguage, useProgress, useTheme, setTheme } from "../../app/hooks";
import { progress } from "../../app/progress";
import { languageByCode } from "../../app/i18n";
import { LanguageSheet } from "../../app/ui/LanguagePicker";
import { TabIcon } from "../../app/ui/TabIcon";
import { FlameMark } from "../../app/ui/HudIcons";
import { FLAGGED_TABS, hashParam, hrefForTab, type TabId } from "../../app/routes";
import { useHashRoute } from "../../app/useHashRoute";
import { isFlagOn, type FlagId } from "../../app/flags";
import { BlueberryMark } from "../../mascot/BlueberryMark";
import { COURSE_LABEL } from "../courses/courseCopy";
import { ArrowStyleSetting } from "../../settings/ArrowStyleSetting";
import { ChestInventory } from "../../chest/ChestInventory";
import {
  activeCount,
  badgesFor,
  cleanName,
  examDateFrom,
  goalDaysInMonth,
  goalOptions,
  joinedLabel,
  lastSevenDaysXp,
  monthGrid,
  monthTitle,
  shiftMonth,
  studyDays,
  type Badge,
} from "./meModel";
import "./me.css";

// React.lazy: the pKa editor (and its 900 line store) loads only when opened.
const PkaSettings = lazy(() => import("../../settings/PkaSettings"));

/* ------------------------------------------------------------- icons -- */

function BoltIcon() {
  return (
    <svg viewBox="0 0 32 32" className="me-stat-icon" aria-hidden>
      <path d="M18 2 6 18h8l-2 12 14-17h-8l2-11z" fill="var(--ic-yellow)" stroke="var(--ic-yellow-lip)" strokeWidth="2" strokeLinejoin="round" />
    </svg>
  );
}

function ShieldIcon() {
  return (
    <svg viewBox="0 0 32 32" className="me-stat-icon" aria-hidden>
      <path d="M16 2 4 6.5v8.8C4 22.6 9.2 27.8 16 30c6.8-2.2 12-7.4 12-14.7V6.5z" fill="var(--ic-purple)" />
      <path d="M16 9.5l2 4.2 4.6.6-3.4 3.1.9 4.5-4.1-2.3-4.1 2.3.9-4.5-3.4-3.1 4.6-.6z" fill="#ffffff" />
    </svg>
  );
}

function CalendarIcon() {
  return (
    <svg viewBox="0 0 32 32" className="me-stat-icon" aria-hidden>
      <rect x="3" y="6" width="26" height="23" rx="5" fill="var(--ic-blue)" />
      <rect x="3" y="6" width="26" height="8" rx="4" fill="var(--ic-blue-lip)" />
      <rect x="9" y="2.5" width="3.5" height="7" rx="1.75" fill="var(--ic-blue-lip)" />
      <rect x="19.5" y="2.5" width="3.5" height="7" rx="1.75" fill="var(--ic-blue-lip)" />
      <circle cx="11" cy="21" r="2.4" fill="#ffffff" />
      <circle cx="21" cy="21" r="2.4" fill="#ffffff" />
    </svg>
  );
}

/** Each badge's emblem, drawn from circles and rounded shapes only. */
function Emblem({ id }: { readonly id: string }) {
  const ink = "#ffffff";
  switch (id) {
    case "streak":
      return <path d="M33 14c-1 6-7 8-7 15a7 7 0 0 0 14 0c0-4-2-6-3-8-1 2-2 3-3 3 1-4 0-7-1-10z" fill={ink} />;
    case "rank":
      return <path d="M32 15l3.5 7.2 8 1.1-5.8 5.6 1.4 7.9-7.1-3.8-7.1 3.8 1.4-7.9-5.8-5.6 8-1.1z" fill={ink} />;
    case "clears":
      return <path d="M22 28l7 7 13-14" fill="none" stroke={ink} strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" />;
    case "cards":
      return (
        <>
          <rect x="21" y="17" width="16" height="21" rx="3" fill={ink} opacity="0.6" transform="rotate(-10 29 27)" />
          <rect x="27" y="17" width="16" height="21" rx="3" fill={ink} transform="rotate(8 35 27)" />
        </>
      );
    default:
      return <path d="M34 12 24 28h7l-2 12 11-17h-7l2-11z" fill={ink} />;
  }
}

function BadgeArt({ badge }: { readonly badge: Badge }) {
  const locked = badge.level === 0;
  // Locked badges are a solid grey with a padlock, so they read as "not yet"
  // rather than as a blank shape.
  const face = locked ? "var(--me-locked)" : `var(--ic-${badge.colour})`;
  const lip = locked ? "var(--me-locked-lip)" : `var(--ic-${badge.colour}-lip)`;
  // A rounded hexagon over a copy of itself shifted down: the flat lip.
  const hex = "M32 4c2 0 3.6.5 5.3 1.5l15.4 8.9c3.3 1.9 5.3 5.4 5.3 9.2v17.8c0 3.8-2 7.3-5.3 9.2L37.3 59.5c-3.3 1.9-7.3 1.9-10.6 0L11.3 50.6C8 48.7 6 45.2 6 41.4V23.6c0-3.8 2-7.3 5.3-9.2l15.4-8.9C28.4 4.5 30 4 32 4z";
  return (
    <div className="me-badge-art">
      <svg viewBox="0 0 64 72" aria-hidden>
        <path d={hex} fill={lip} transform="translate(0 6)" />
        <path d={hex} fill={face} />
        <g opacity={locked ? 0.7 : 1}>
          <Emblem id={badge.id} />
        </g>
        {locked ? (
          <g transform="translate(40 44)">
            <circle r="12" fill="var(--bb-card)" />
            <path d="M-4.5-2v-3a4.5 4.5 0 0 1 9 0v3" fill="none" stroke="var(--me-locked-lip)" strokeWidth="2.6" strokeLinecap="round" />
            <rect x="-6.5" y="-2.5" width="13" height="10" rx="2.5" fill="var(--me-locked-lip)" />
          </g>
        ) : null}
      </svg>
      <span className="me-badge-level">{locked ? "LOCKED" : `LEVEL ${badge.level}`}</span>
    </div>
  );
}

/* -------------------------------------------------------- small parts -- */

function Meter({ value, max, tone }: { readonly value: number; readonly max: number; readonly tone: string }) {
  const fraction = max <= 0 ? 0 : Math.max(0, Math.min(1, value / max));
  return (
    <div className="me-meter" data-tone={tone} aria-hidden>
      {/* scaleX, not width: transform only, per the motion rule in me.css. */}
      <span style={{ transform: `scaleX(${fraction})` }} />
    </div>
  );
}

function Stat({ icon, value, label }: { readonly icon: ReactNode; readonly value: string; readonly label: string }) {
  return (
    <div className="me-stat">
      {icon}
      <span className="min-w-0">
        <span className="me-stat-value">{value}</span>
        <span className="me-stat-label">{label}</span>
      </span>
    </div>
  );
}

/**
 * A settings row that IS the switch: the whole 56px row is the tap target, so
 * the control is never smaller than a thumb. role="switch" with aria-checked
 * is what a screen reader announces; the row's text is its name.
 */
function SwitchRow({ on, title, detail, onToggle }: { readonly on: boolean; readonly title: string; readonly detail: string; readonly onToggle: () => void }) {
  return (
    <button type="button" role="switch" aria-checked={on} className="me-row" onClick={onToggle}>
      <span className="me-row-text">
        <span className="me-row-title">{title}</span>
        <span className="me-row-detail">{detail}</span>
      </span>
      <span className="me-switch" aria-hidden>
        <span className="me-switch-knob" />
      </span>
    </button>
  );
}

/** A gear drawn from a circle and eight rounded teeth. */
function GearIcon() {
  return (
    <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden>
      <g fill="currentColor">
        {[0, 45, 90, 135].map((deg) => (
          <rect key={deg} x="10" y="1.5" width="4" height="21" rx="2" transform={`rotate(${deg} 12 12)`} />
        ))}
        <circle cx="12" cy="12" r="7.5" />
      </g>
      <circle cx="12" cy="12" r="3" fill="var(--bb-card)" />
    </svg>
  );
}

/**
 * A yes/no setting kept in localStorage under the same key and the same "1"/"0"
 * values that components/ReferenceApp.tsx reads, so the switch here and the
 * reference deck agree. Storage can be blocked, so it falls back to off.
 */
function useStoredFlag(key: string): [boolean, () => void] {
  const [on, setOn] = useState(() => {
    try {
      return localStorage.getItem(key) === "1";
    } catch {
      return false;
    }
  });
  const toggle = () => {
    const next = !on;
    setOn(next);
    try {
      localStorage.setItem(key, next ? "1" : "0");
    } catch {
      /* blocked storage: the choice lasts this visit */
    }
  };
  return [on, toggle];
}

function ToolRow({ tab, title, detail }: { readonly tab: TabId; readonly title: string; readonly detail: string }) {
  return (
    <a href={hrefForTab(tab)} className="me-row">
      <span className="me-row-icon">
        <TabIcon tab={tab} className="h-6 w-6" />
      </span>
      <span className="me-row-text">
        <span className="me-row-title">{title}</span>
        <span className="me-row-detail">{detail}</span>
      </span>
      <span className="me-row-chevron" aria-hidden>
        <Chevron />
      </span>
    </a>
  );
}

/** A thick rounded chevron; `left` for back keys, right for list rows. */
function Chevron({ left = false }: { readonly left?: boolean }) {
  return (
    <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden className="me-chev">
      <path d={left ? "M15 5l-7 7 7 7" : "M9 5l7 7-7 7"} fill="none" stroke="currentColor" strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

/* ----------------------------------------------------------- sections -- */

/**
 * The scene behind Bloom: flat hills and floating rings, shapes only, no
 * outlines and no gradients. preserveAspectRatio "slice" keeps the hills on the
 * band's floor at any width, so one drawing serves a phone and a desktop.
 */
function HeroScene() {
  const ring = "M0-10 8.7-5v10L0 10-8.7 5v-10z";
  return (
    <svg className="me-hero-scene" viewBox="0 0 400 168" preserveAspectRatio="xMidYMax slice" aria-hidden>
      <g fill="var(--me-band-shape)">
        <path d={ring} transform="translate(46 44) scale(1.6)" />
        <path d={ring} transform="translate(352 38) scale(1.3)" />
        <path d={ring} transform="translate(300 98) scale(0.8)" />
        <path d={ring} transform="translate(96 108) scale(0.7)" />
        <circle cx="140" cy="30" r="4" />
        <circle cx="262" cy="56" r="5" />
        <circle cx="24" cy="120" r="3" />
      </g>
      <ellipse cx="70" cy="200" rx="190" ry="62" fill="var(--me-band-hill)" />
      <ellipse cx="340" cy="206" rx="210" ry="66" fill="var(--ic-purple-lip)" />
    </svg>
  );
}

function PencilIcon() {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden>
      <path d="M4 20l1-5L15.5 4.5a2.1 2.1 0 0 1 3 0l1 1a2.1 2.1 0 0 1 0 3L9 19z" fill="currentColor" />
      <path d="M4 20l1-5 4 4z" fill="var(--bb-card)" opacity="0.6" />
    </svg>
  );
}

function Profile({ name, joined, course }: { readonly name: string | null; readonly joined: string | null; readonly course: string | null }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(name ?? "");
  const [error, setError] = useState<string | null>(null);

  const save = () => {
    const clean = cleanName(draft);
    // A blank save would wipe the name with no way to tell it happened, so it
    // is refused with a reason instead. Cancel keeps the old name.
    if (clean === "") {
      setError("Type a name to save, or press Cancel to keep the old one.");
      return;
    }
    progress.setDisplayName(clean);
    setError(null);
    setEditing(false);
  };

  return (
    <section className="me-card me-hero me-slot-profile" aria-label="Profile">
      {/* The identity band: Bloom standing in a drawn scene, settings in the corner. */}
      <div className="me-hero-band">
        <HeroScene />
        <div className="me-hero-bloom">
          <span className="me-hero-shadow" aria-hidden />
          <BlueberryMark eyes mood="happy" />
        </div>
        <a href={hrefForTab("me", "settings")} className="me-band-btn" aria-label="Settings">
          <GearIcon />
        </a>
      </div>
      <div className="me-hero-body">
        {editing ? (
          <form
            className="me-name-form"
            onSubmit={(event) => {
              event.preventDefault();
              save();
            }}
          >
            <label className="me-sr" htmlFor="me-name-input">
              Your name
            </label>
            <input
              id="me-name-input"
              className="me-input"
              value={draft}
              maxLength={32}
              autoFocus
              autoComplete="nickname"
              placeholder="Your name"
              aria-invalid={error !== null}
              aria-describedby={error === null ? undefined : "me-name-error"}
              onChange={(event) => {
                setDraft(event.target.value);
                setError(null);
              }}
            />
            <button type="submit" className="btn3d btn3d--primary">
              Save
            </button>
            <button
              type="button"
              className="btn3d btn3d--ghost"
              onClick={() => {
                setError(null);
                setEditing(false);
              }}
            >
              Cancel
            </button>
            {error === null ? null : (
              <p id="me-name-error" className="me-name-error" role="alert">
                {error}
              </p>
            )}
          </form>
        ) : (
          <div className="me-id-row">
            <h1 className="me-name">{name ?? "Add your name"}</h1>
            <button
              type="button"
              className="me-icon-btn"
              aria-label={name === null ? "Add name" : "Edit name"}
              onClick={() => {
                setDraft(name ?? "");
                setEditing(true);
              }}
            >
              <PencilIcon />
            </button>
          </div>
        )}
        {/* One dense line: when they joined, then the course, split by a dot. */}
        <p className="me-meta m-0">
          <span>{joined ?? "New here: your first lesson starts the record"}</span>
          {course === null ? null : <span className="me-meta-course">{course}</span>}
        </p>
      </div>
    </section>
  );
}

function WeekChart({ days, goalXp }: { readonly days: ReturnType<typeof lastSevenDaysXp>; readonly goalXp: number }) {
  const total = days.reduce((sum, day) => sum + day.xp, 0);
  // The scale always shows the goal line, and grows when a day beat it.
  const top = Math.max(goalXp * 1.25, ...days.map((day) => day.xp), 1);
  const goalFromBottom = (goalXp / top) * 100;
  const summary = days.map((day) => `${day.date}: ${day.xp} XP`).join(", ");
  return (
    <section className="me-card me-slot-week" aria-labelledby="me-week-title">
      <h2 id="me-week-title" className="me-h2">
        This week
      </h2>
      <p className="m-0 mb-3 font-bold me-muted">
        {total === 0 ? "No XP in the last 7 days yet. One lesson puts a bar here." : `${total} XP in the last 7 days`}
      </p>
      <div className="me-chart" role="img" aria-label={`XP per day for the last 7 days. ${summary}. Daily goal ${goalXp} XP.`}>
        {/* The plot layer covers only the bars' area, so the goal line's
            percentage means the same thing as a bar's height. */}
        <div className="me-chart-plot" aria-hidden>
          <div className="me-chart-goal" style={{ bottom: `${goalFromBottom}%` }}>
            <span>Goal {goalXp}</span>
          </div>
        </div>
        {days.map((day) => (
          <div key={day.date} className="me-bar-col">
            <span className="me-bar-num">{day.xp > 0 ? day.xp : ""}</span>
            <div className="me-bar-track">
              <div className="me-bar" data-on={day.xp > 0} data-today={day.today} style={{ height: `${(day.xp / top) * 100}%` }} />
            </div>
          </div>
        ))}
      </div>
      <div className="me-bar-days" aria-hidden>
        {days.map((day) => (
          <span key={day.date} data-today={day.today}>
            {day.today ? "Today" : day.letter}
          </span>
        ))}
      </div>
    </section>
  );
}

function Achievements({ badges }: { readonly badges: readonly Badge[] }) {
  return (
    <section className="me-card me-slot-badges" aria-labelledby="me-badges-title">
      <h2 id="me-badges-title" className="me-h2">
        Achievements
      </h2>
      <ul className="me-badges m-0 list-none p-0">
        {badges.map((badge) => (
          <li key={badge.id} className="me-badge" data-locked={badge.level === 0}>
            <BadgeArt badge={badge} />
            <div className="me-badge-body">
              <div className="me-badge-title">
                <span>{badge.title}</span>
                <span className="me-badge-count">
                  {badge.countLabel === "" ? "" : `${badge.countLabel} `}
                  {badge.value}/{badge.target}
                </span>
              </div>
              <Meter value={badge.value} max={badge.target} tone={badge.colour} />
              <span className="me-badge-line">
                {badge.line}
                <span className="me-sr">
                  . Level {badge.level} of {badge.maxLevel}.
                </span>
              </span>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}

function StreakCalendar({ journal, tz, days, today, xpToday, goalXp }: { readonly journal: readonly EconomyEvent[]; readonly tz: string; readonly days: readonly string[]; readonly today: string; readonly xpToday: number; readonly goalXp: number }) {
  const thisMonth = today.slice(0, 7);
  const [month, setMonth] = useState(thisMonth);
  // useMemo: up to 31 derivations, so only when the month or the journal changes.
  const goalDays = useMemo(() => goalDaysInMonth(journal, tz, month, Date.now()), [journal, tz, month]);
  const weeks = monthGrid(month, days, today, goalDays);
  const first = days[0]?.slice(0, 7) ?? thisMonth;
  const count = activeCount(month, days);
  const title = monthTitle(month);
  return (
    <section className="me-card me-slot-cal" aria-labelledby="me-cal-title">
      <div className="me-cal-head">
        <button type="button" className="me-icon-btn" aria-label="Previous month" disabled={month <= first} onClick={() => setMonth(shiftMonth(month, -1))}>
          <Chevron left />
        </button>
        <h2 id="me-cal-title" className="me-cal-title" aria-live="polite">
          {title}
        </h2>
        <button type="button" className="me-icon-btn" aria-label="Next month" disabled={month >= thisMonth} onClick={() => setMonth(shiftMonth(month, 1))}>
          <Chevron />
        </button>
      </div>
      <table className="me-cal" aria-describedby="me-cal-count">
        <thead>
          <tr>
            {["M", "T", "W", "T", "F", "S", "S"].map((letter, i) => (
              <th key={i} scope="col">
                {letter}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {weeks.map((week, w) => (
            <tr key={w}>
              {week.map((cell, d) => (
                <td key={d}>
                  {cell.date === null ? null : (
                    <div className="me-day" data-active={cell.active} data-goal={cell.goal} data-today={cell.today} data-future={cell.future}>
                      {cell.day}
                      {cell.goal ? <span className="me-sr"> goal met</span> : cell.active ? <span className="me-sr"> studied</span> : null}
                      {cell.today ? <span className="me-sr"> today</span> : null}
                    </div>
                  )}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
      <p id="me-cal-count" className="m-0 mt-2 text-center font-bold me-muted">
        {count === 0 ? `No study days in ${title} yet` : `Studied ${count} ${count === 1 ? "day" : "days"} in ${title}`}
      </p>
      <div className="me-cal-key" aria-hidden>
        <span>
          <i className="me-day-key" data-goal="true" /> Goal met, streak day
        </span>
        <span>
          <i className="me-day-key" data-active="true" /> Studied
        </span>
      </div>
      <p className="me-cal-note m-0">Only goal days grow your streak. A free rest day each week keeps it alive.</p>
      <div className="me-goal">
        <div className="me-goal-row">
          <span>Today's goal</span>
          <span className="me-muted">
            {Math.min(xpToday, goalXp)}/{goalXp} XP
          </span>
        </div>
        <Meter value={xpToday} max={goalXp} tone="orange" />
        {/* The goal picker lives on the settings screen; "?focus=goal" tells
            it to open scrolled to the Goals group. */}
        <a href={`${hrefForTab("me", "settings")}?focus=goal`} className="btn3d btn3d--ghost btn3d--sm justify-self-start">
          Change goal
        </a>
      </div>
    </section>
  );
}

function SunIcon() {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden>
      <g fill="var(--ic-yellow-lip)">
        {[0, 45, 90, 135, 180, 225, 270, 315].map((deg) => (
          <rect key={deg} x="10.75" y="1" width="2.5" height="5" rx="1.25" transform={`rotate(${deg} 12 12)`} />
        ))}
      </g>
      <circle cx="12" cy="12" r="5" fill="var(--ic-yellow)" />
    </svg>
  );
}

function MoonIcon() {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden>
      <path d="M15.5 3.2A9 9 0 1 0 20.8 15 7 7 0 0 1 15.5 3.2z" fill="var(--ic-purple)" />
    </svg>
  );
}

function ThemeSetting() {
  const theme = useTheme();
  // One line: the title on the left, the two-option segment on the right.
  return (
    <div className="me-row me-row-static">
      <span className="me-row-text">
        <span className="me-row-title">Appearance</span>
      </span>
      <div className="me-seg me-seg--inline" role="group" aria-label="Appearance">
        {(["light", "dark"] as const).map((option) => (
          <button key={option} type="button" aria-pressed={theme === option} onClick={() => setTheme(option)}>
            {option === "light" ? <SunIcon /> : <MoonIcon />}
            {option === "light" ? "Light" : "Dark"}
          </button>
        ))}
      </div>
    </div>
  );
}

function GoalSetting({ tier, examWindow }: { readonly tier: DailyGoalTier; readonly examWindow: boolean }) {
  return (
    <div>
      <div className="me-row me-row-static">
        <span className="me-row-text">
          <span className="me-row-title">Daily goal</span>
          <span className="me-row-detail">Hit it to keep your streak</span>
        </span>
      </div>
      <div className="me-seg-wrap">
        {/* Name on top, XP under it, so four options fit a phone without wrapping. */}
        <div className="me-seg me-seg--stack" role="radiogroup" aria-label="Daily goal">
          {goalOptions(examWindow).map((option) => (
            <button
              key={option.tier}
              type="button"
              role="radio"
              aria-checked={tier === option.tier}
              onClick={() => progress.setSettings({ dailyGoal: option.tier })}
            >
              <span>{option.label}</span>
              <span className="me-seg-sub">{option.xp} XP</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

/** "2026-12-10" as "Dec 10, 2026", read as a calendar date (no time zone shift). */
function shortDate(iso: string): string {
  return new Date(`${iso}T12:00:00Z`).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric", timeZone: "UTC" });
}

function ExamSetting({ examDate, daysLeft, today }: { readonly examDate: string | null; readonly daysLeft: number | null; readonly today: string }) {
  const inputRef = useRef<HTMLInputElement>(null);
  // The visible key opens the browser's own date picker. showPicker is in every
  // current browser; where it is missing, focusing the input still lets the
  // student type a date.
  const openPicker = () => {
    const input = inputRef.current;
    if (input === null) return;
    try {
      input.showPicker();
    } catch {
      input.focus();
    }
  };
  return (
    <div className="me-row me-row-static flex-wrap">
      <span className="me-row-text">
        <label className="me-row-title" htmlFor="me-exam-date">
          Exam date
        </label>
        <span className="me-row-detail">
          {examDate === null
            ? "Charge lasts all exam week"
            : daysLeft === null
              ? "That date has passed"
              : daysLeft === 0
                ? "Exam day. Good luck!"
                : `${daysLeft} ${daysLeft === 1 ? "day" : "days"} to go`}
        </span>
      </span>
      <button type="button" className="me-date-btn" onClick={openPicker} aria-describedby="me-exam-date">
        <CalendarIcon />
        {examDate === null ? "Set date" : shortDate(examDate)}
      </button>
      {/* The real input stays in the page (screen readers and autofill use it)
          but is drawn off screen; the key above is what a student sees. */}
      <input
        ref={inputRef}
        id="me-exam-date"
        type="date"
        className="me-date"
        min={today}
        value={examDate ?? ""}
        onChange={(event) => progress.setSettings({ examDate: event.target.value === "" ? null : event.target.value })}
      />
      {examDate === null ? null : (
        <button type="button" className="btn3d btn3d--ghost btn3d--sm" onClick={() => progress.setSettings({ examDate: null })}>
          Clear
        </button>
      )}
    </div>
  );
}

/** The top bar of a sub screen: a back key, and the screen's title. */
function SubHeader({ title, backHref, backLabel }: { readonly title: string; readonly backHref: string; readonly backLabel: string }) {
  return (
    <header className="me-subhead">
      <a href={backHref} className="me-icon-btn" aria-label={backLabel}>
        <Chevron left />
      </a>
      <h1 className="me-subhead-title">{title}</h1>
      {/* An empty box the size of the back key keeps the title centred. */}
      <span className="me-subhead-spacer" aria-hidden />
    </header>
  );
}

/* --------------------------------------------------- settings screen -- */

function SettingsScreen() {
  const snapshot = useProgress();
  const economy = snapshot.economy;
  const journal = snapshot.journal;
  const today = localDate(Date.now(), economy.tz);
  const examDate = useMemo(() => examDateFrom(journal), [journal]);
  const [languageOpen, setLanguageOpen] = useState(false);
  const language = languageByCode(useLanguage());
  const [hoverPreview, toggleHoverPreview] = useStoredFlag("reference.hoverPreview");
  const [magnifier, toggleMagnifier] = useStoredFlag("reference.magnifier");
  const goalRef = useRef<HTMLElement>(null);

  // useEffect with [] runs once, after the screen first paints: open at the
  // top, or at the Goals group when the calendar's CHANGE GOAL sent us here.
  useEffect(() => {
    if (hashParam("focus") === "goal") goalRef.current?.scrollIntoView({ block: "start" });
    else window.scrollTo(0, 0);
  }, []);

  return (
    <div className="me me--narrow">
      <SubHeader title="Settings" backHref={hrefForTab("me")} backLabel="Back to Me" />

      <section className="me-card me-group" aria-labelledby="me-set-app">
        <h2 id="me-set-app" className="me-group-title">
          App
        </h2>
        <ThemeSetting />
        <button type="button" className="me-row" onClick={() => setLanguageOpen(true)}>
          <span className="me-row-text">
            <span className="me-row-title">Language</span>
          </span>
          <span className="me-row-value">{language.endonym}</span>
          <span className="me-row-chevron" aria-hidden>
            <Chevron />
          </span>
        </button>
      </section>

      <section ref={goalRef} className="me-card me-group" aria-labelledby="me-set-goal" style={{ scrollMarginTop: "5rem" }}>
        <h2 id="me-set-goal" className="me-group-title">
          Goals
        </h2>
        <GoalSetting tier={economy.xp.goalTier} examWindow={economy.charge.examWindow} />
        <ExamSetting examDate={examDate} daysLeft={economy.charge.examDaysLeft} today={today} />
      </section>

      <section className="me-card me-group" aria-labelledby="me-set-lessons">
        <h2 id="me-set-lessons" className="me-group-title">
          Lessons
        </h2>
        <ArrowStyleSetting />
        <a href={hrefForTab("me", "settings", "pka")} className="me-row">
          <span className="me-row-text">
            <span className="me-row-title">pKa values</span>
            <span className="me-row-detail">Match your professor's table</span>
          </span>
          <span className="me-row-chevron" aria-hidden>
            <Chevron />
          </span>
        </a>
      </section>

      <section className="me-card me-group" aria-labelledby="me-set-decks">
        <h2 id="me-set-decks" className="me-group-title">
          Reference decks
        </h2>
        <SwitchRow on={hoverPreview} title="Hover reveal" detail="Show the answer on hover" onToggle={toggleHoverPreview} />
        <SwitchRow on={magnifier} title="Magnifier" detail="A lens for small print" onToggle={toggleMagnifier} />
      </section>

      <LanguageSheet open={languageOpen} onClose={() => setLanguageOpen(false)} />
    </div>
  );
}

function PkaScreen() {
  // Opens at the top, the same as any new screen.
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);
  return (
    <div className="me me--narrow">
      <SubHeader title="pKa values" backHref={hrefForTab("me", "settings")} backLabel="Back to Settings" />
      <Suspense fallback={<p className="me-muted font-bold">Loading pKa values…</p>}>
        <PkaSettings />
      </Suspense>
    </div>
  );
}

/* ---------------------------------------------------- profile screen -- */

function ProfileScreen() {
  const snapshot = useProgress();

  // snapshot.economy is derived from the REAL journal (the dev beta flag
  // adds its preview events after that derivation), so it is the one source.
  const economy = snapshot.economy;
  const journal = snapshot.journal;
  const today = localDate(Date.now(), economy.tz);
  // useMemo: re-derive the week only when the journal changes, not on every render.
  const week = useMemo(() => lastSevenDaysXp(journal, economy.tz, Date.now()), [journal, economy.tz]);
  const days = useMemo(() => studyDays(journal), [journal]);
  const badges = useMemo(() => badgesFor(economy, journal), [economy, journal]);
  const joined = useMemo(() => joinedLabel(journal), [journal]);
  const course = snapshot.course === null ? null : (COURSE_LABEL[snapshot.course] ?? null);
  // Messages is listed on its own row below, so it is left out here.
  const flagged = FLAGGED_TABS.filter((tab) => tab.id !== "messages" && isFlagOn(tab.id as FlagId));

  // Open at the top when coming back from settings, not wherever settings was scrolled to.
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  // On a phone the two columns below are `display: contents` (me.css), so
  // every section joins one list and the me-slot-* classes set its order:
  // profile, chests, stats, calendar, week, badges, tools.
  return (
    <div className="me">
      <div className="me-col">
        <Profile name={snapshot.displayName} joined={joined} course={course} />
        {/* Saved chests, right under the profile (owner, 20 Oct). */}
        <ChestInventory saved={economy.chests.saved} className="me-slot-chests" />

        <section className="me-slot-stats" aria-labelledby="me-stats-title">
          <h2 id="me-stats-title" className="me-h2">
            Statistics
          </h2>
          <div className="me-stats">
            <Stat icon={<FlameMark lit={economy.streak.current > 0} className="me-stat-icon" />} value={String(economy.streak.current)} label="Day streak" />
            <Stat icon={<BoltIcon />} value={economy.xp.total.toLocaleString("en-US")} label="Total XP" />
            <Stat icon={<ShieldIcon />} value={economy.mastery.rank} label="Mastery rank" />
            <Stat icon={<CalendarIcon />} value={String(days.length)} label={days.length === 1 ? "Day studied" : "Days studied"} />
          </div>
        </section>

        <WeekChart days={week} goalXp={economy.xp.goalXp} />
        <Achievements badges={badges} />
      </div>

      <aside className="me-col me-side" aria-label="Streak and tools">
        <StreakCalendar journal={journal} tz={economy.tz} days={days} today={today} xpToday={economy.xp.today} goalXp={economy.xp.goalXp} />
        <section className="me-card me-group me-slot-tools" aria-labelledby="me-tools">
          <h2 id="me-tools" className="me-group-title">
            Your tools
          </h2>
          <ToolRow tab="courses" title="Courses" detail="Organic Chemistry II is open." />
          <ToolRow tab="periodic" title="Periodic table" detail="Also in the header, even mid lesson." />
          <ToolRow tab="search" title="Reaction search" detail="Find a reaction by its reagents." />
          <ToolRow tab="messages" title="Messages" detail="Bloom and your study reminders." />
          {flagged.map((tab) => (
            <ToolRow key={tab.id} tab={tab.id} title={tab.label} detail="Turned on for this device." />
          ))}
        </section>
      </aside>
    </div>
  );
}

/* --------------------------------------------------------------- page -- */

/**
 * Picks the screen from the hash. useHashRoute re-renders this when the hash
 * changes, so a link, the back button and the back gesture all switch screens.
 * The Shell renders <MeTab /> without the route's rest, so it is read here.
 */
export default function MeTab() {
  const route = useHashRoute();
  const rest = route.kind === "tab" ? route.rest : [];
  if (rest[0] === "settings") return rest[1] === "pka" ? <PkaScreen /> : <SettingsScreen />;
  return <ProfileScreen />;
}
