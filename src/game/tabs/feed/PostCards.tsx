/**
 * Feed cards: the stream a student scrolls. Each card has a person, a relative
 * time, a picture and one tap action, in the order of the best learning feeds:
 * a post, a nudge, a study tip, a post. Only the student's own journal becomes
 * posts (activityModel.ts); friends appear once accounts open. The heart is a
 * private "proud of this" mark kept on this device, so nothing here pretends
 * another person acted.
 */

import { useCallback, useState, type ReactNode } from "react";
import { hrefForTab } from "../../app/routes";
import type { ActivityItem } from "./activityModel";
import type { WeekDay, WeekModel } from "./weekModel";

const CHEER_KEY = "blueberry.feed.cheers.v1";

function readCheers(): ReadonlySet<string> {
  try {
    const raw = window.localStorage.getItem(CHEER_KEY);
    const parsed: unknown = raw === null ? [] : JSON.parse(raw);
    return new Set(Array.isArray(parsed) ? parsed.filter((x): x is string => typeof x === "string") : []);
  } catch {
    return new Set();
  }
}

/** The set of cheered post keys, persisted on this device only. */
export function useCheers(): readonly [ReadonlySet<string>, (key: string) => void] {
  const [cheers, setCheers] = useState<ReadonlySet<string>>(readCheers);
  const toggle = useCallback((key: string) => {
    setCheers((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      try {
        window.localStorage.setItem(CHEER_KEY, JSON.stringify([...next]));
      } catch {
        /* storage blocked: the heart still works for this visit */
      }
      return next;
    });
  }, []);
  return [cheers, toggle] as const;
}

function Heart({ filled }: { readonly filled: boolean }) {
  return (
    <svg viewBox="0 0 24 24" className="fp-act-icon" aria-hidden="true" focusable="false">
      <path
        d="M12 20.5C5 15.4 3 12.2 3 9.1 3 6.6 4.9 4.8 7.2 4.8c1.9 0 3.7 1.1 4.8 3 1.1-1.9 2.9-3 4.8-3C19.1 4.8 21 6.6 21 9.1c0 3.1-2 6.3-9 11.4z"
        fill={filled ? "#ff5a7a" : "none"}
        stroke={filled ? "#c42a4d" : "currentColor"}
        strokeWidth="2.2"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function ShareGlyph() {
  return (
    <svg viewBox="0 0 24 24" className="fp-act-icon" aria-hidden="true" focusable="false">
      <path d="M12 15V4M7.5 8.5 12 4l4.5 4.5M5 13v5.5A1.5 1.5 0 0 0 6.5 20h11a1.5 1.5 0 0 0 1.5-1.5V13" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

async function shareLink(): Promise<string> {
  const url = `${window.location.origin}${window.location.pathname}`;
  const phone = window.matchMedia("(pointer: coarse)").matches;
  try {
    if (phone && typeof navigator.share === "function") {
      await navigator.share({ title: "Blueberry", text: "Learn orgo with me on Blueberry", url });
      return "Shared!";
    }
    await navigator.clipboard.writeText(url);
    return "Link copied";
  } catch {
    return phone ? "" : `Copy this link: ${url}`;
  }
}

export function PostCard({
  item,
  name,
  avatar,
  art,
  liked,
  onToggle,
}: {
  readonly item: ActivityItem;
  readonly name: string;
  readonly avatar: ReactNode;
  readonly art: ReactNode;
  readonly liked: boolean;
  readonly onToggle: (key: string) => void;
}) {
  const [note, setNote] = useState("");
  return (
    <li className="fp-card" data-kind={item.kind}>
      <div className="fp-head">
        <span className="fp-avatar" aria-hidden="true">{avatar}</span>
        <div className="fp-who">
          <p className="fp-name">{name}</p>
          <p className="fp-when">{item.when}</p>
        </div>
      </div>
      <div className="fp-body">
        <p className="fp-text">{item.text}</p>
        <span className="fp-art" aria-hidden="true">{art}</span>
      </div>
      <div className="fp-actions">
        <button
          type="button"
          className="fp-act press"
          aria-pressed={liked}
          aria-label={liked ? "Remove your cheer" : "Cheer this win"}
          data-on={liked ? "true" : "false"}
          onClick={() => onToggle(item.key)}
        >
          <Heart filled={liked} />
          {liked ? <span className="fp-count">1</span> : null}
        </button>
        <button type="button" className="fp-act press" aria-label="Share Blueberry" onClick={() => void shareLink().then(setNote)}>
          <ShareGlyph />
        </button>
        {note === "" ? null : (
          <span className="fp-note" role="status">{note}</span>
        )}
      </div>
      {liked ? (
        <p className="fp-liked">
          <span className="fp-liked-avatar" aria-hidden="true">{avatar}</span>
          Liked by you
        </p>
      ) : null}
    </li>
  );
}

function BannerFlame() {
  return (
    <svg viewBox="0 0 24 24" className="fp-flame" aria-hidden="true" focusable="false">
      <path d="M12.6 1.2c-.4 2.9-2 4.3-3.4 5.6C7.2 8.6 4.8 11 4.8 15.2 4.8 19.1 8 22.2 12 22.2s7.2-3.1 7.2-7c0-2.8-1.2-4.7-2.6-6.2-.2 1.5-1 2.6-2.1 3 1-3.6-.6-8.2-1.9-10.8z" fill="#ffd166" stroke="#fff4d6" strokeWidth="1" strokeLinejoin="round" />
      <path d="M12 10.4c1.9 1.9 3 3.4 3 5.1a3 3 0 0 1-6 0c0-1.6 1.1-3.2 3-5.1z" fill="#fff4d6" />
    </svg>
  );
}

const DAY_WORD: Readonly<Record<WeekDay["kind"], string>> = {
  counted: "practiced",
  rest: "rest day",
  freeze: "covered by a freeze or rest day",
  missed: "no goal met",
  pending: "today, still open",
  future: "not yet",
};

/** Sunday to Saturday, each day named, so a student reads the week instead of guessing at dots. */
function WeekRow({ week }: { readonly week: WeekModel }) {
  return (
    <ol className="fp-week" aria-label="This week">
      {week.days.map((d) => (
        <li key={d.date} className="fp-wd" data-kind={d.kind} data-today={d.today ? "true" : "false"} aria-label={`${d.letter}, ${DAY_WORD[d.kind]}`}>
          <span className="fp-wd-letter" aria-hidden="true">{d.letter}</span>
          <span className="fp-wd-disc" aria-hidden="true">
            {d.kind === "counted" ? (
              <svg viewBox="0 0 24 24" focusable="false"><path d="M6 12.5l4 4 8-9" /></svg>
            ) : d.kind === "freeze" ? (
              <svg viewBox="0 0 24 24" focusable="false"><path d="M12 3c3.4 4.2 6 7.2 6 10.6A6 6 0 0 1 12 20a6 6 0 0 1-6-6.4C6 10.2 8.6 7.2 12 3z" /></svg>
            ) : null}
          </span>
        </li>
      ))}
    </ol>
  );
}

/** The streak nudge. Honest to the day: open until a lesson counts, then a reason to return tomorrow. */
export function NudgeCard({ counted, streak, week }: { readonly counted: boolean; readonly streak: number; readonly week: WeekModel }) {
  // A brand new student: no "0 day streak" over blank circles. One line about day 1, no second button.
  if (streak === 0 && !counted && week.empty) {
    return (
      <li className="fp-card fp-card--system fp-card--tight" data-nudge="new">
        <div className="fp-banner fp-banner--flame fp-banner--stack">
          <div className="fp-streak-top">
            <BannerFlame />
            <p className="fp-streak-num">
              <span>Light your first flame</span>
            </p>
          </div>
          <WeekRow week={week} />
        </div>
        <p className="fp-text">One lesson today makes it day 1.</p>
      </li>
    );
  }
  return (
    <li className="fp-card fp-card--system" data-nudge={counted ? "safe" : "open"}>
      <div className="fp-banner fp-banner--flame fp-banner--stack">
        <div className="fp-streak-top">
          <BannerFlame />
          <p className="fp-streak-num">
            <b>{streak}</b>
            <span>day streak</span>
          </p>
        </div>
        <WeekRow week={week} />
      </div>
      <p className="fp-when fp-when--solo">Today</p>
      <p className="fp-text fp-text--big">
        {counted ? "Streak safe for today. Come back tomorrow to keep it going!" : "Complete a lesson every day to maintain your streak!"}
      </p>
      <a href={hrefForTab(counted ? "cards" : "pathway")} className="fp-outline press">
        {counted ? "Review cards" : "Start a lesson"}
      </a>
    </li>
  );
}

/** Bloom's daily pace: the one rival every student has. Not a person, so nothing is pretended. */
export const BLOOM_PACE_XP = 30;

export function RivalCard({ xpToday, avatar }: { readonly xpToday: number; readonly avatar: ReactNode }) {
  const pct = Math.min(100, Math.round((xpToday / BLOOM_PACE_XP) * 100));
  const ahead = xpToday >= BLOOM_PACE_XP;
  return (
    <li className="fp-card fp-card--system fp-card--tight" data-id="rival" data-ahead={ahead ? "true" : "false"}>
      <div className="fp-head">
        <span className="fp-avatar" aria-hidden="true">{avatar}</span>
        <div className="fp-who">
          <p className="fp-name">Beat Bloom today</p>
          <p className="fp-when">Bloom studies {BLOOM_PACE_XP} XP a day</p>
        </div>
      </div>
      <div className="fp-race" role="img" aria-label={`You ${xpToday} XP, Bloom ${BLOOM_PACE_XP} XP`}>
        <span className="fp-race-fill" style={{ width: `${pct}%` }} />
      </div>
      <p className="fp-text">
        {ahead ? "You are ahead of Bloom. Bloom wants a rematch tomorrow." : `You: ${xpToday} XP. ${BLOOM_PACE_XP - xpToday} more to pass Bloom.`}
      </p>
    </li>
  );
}

/** Three real counts for the week so far. Not shown until there is something to count. */
export function WeekCard({ week }: { readonly week: WeekModel }) {
  if (week.empty) return null;
  const stats: readonly { n: number; label: string }[] = [
    { n: week.practiced, label: week.practiced === 1 ? "day practiced" : "days practiced" },
    { n: week.lessons, label: week.lessons === 1 ? "lesson cleared" : "lessons cleared" },
    { n: week.cards, label: week.cards === 1 ? "card reviewed" : "cards reviewed" },
  ];
  return (
    <li className="fp-card fp-card--system" data-id="week">
      <p className="fp-when fp-when--solo">Your week so far</p>
      <ul className="fp-stats">
        {stats.map((s) => (
          <li key={s.label}><b>{s.n}</b><span>{s.label}</span></li>
        ))}
      </ul>
    </li>
  );
}

/** Study habits, not chemistry: nothing here needs a structure, so nothing is recalled. */
const TIPS: readonly string[] = [
  "Five minutes of cards beats an hour of re-reading.",
  "Say the answer out loud before you flip the card.",
  "Sleep on it. Cards you review tonight stick better by morning.",
  "Do the hard lesson first, while your head is fresh.",
  "Draw the arrow before you look. Wrong guesses teach the most.",
];

export function TipCard({ dayIndex, art }: { readonly dayIndex: number; readonly art: ReactNode }) {
  const tip = TIPS[((dayIndex % TIPS.length) + TIPS.length) % TIPS.length] ?? "";
  return (
    <li className="fp-card fp-card--system">
      <div className="fp-banner fp-banner--tip">
        <span className="fp-tag">Learning</span>
        <span className="fp-tip-art" aria-hidden="true">{art}</span>
      </div>
      <p className="fp-when fp-when--solo">Today</p>
      <p className="fp-text fp-text--big">{tip}</p>
      <a href={hrefForTab("cards")} className="fp-outline press">Try it now</a>
    </li>
  );
}
