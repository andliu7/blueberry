/**
 * The admin home page: "#/app/admin/home". Staff only; it is mounted from AdminViewer,
 * which App.tsx only renders behind AdminGate. Lazy, so it is in no entry chunk.
 *
 * WHAT IT IS. One calm page that answers "how is Blueberry doing?" in the order a
 * founder asks it, in the manner of the Stripe Dashboard home: a short greeting, one
 * strip of the four numbers that matter, one big chart with a dotted line for the
 * period before, a narrow column of side figures, then the detail underneath (learner
 * funnel, activity, system status, billing). Drill-down is a plain text link, not a
 * button. No chart library: every graphic is inline SVG.
 *
 * It borrows from the ten components the owner pasted (stat cards, stat strip, bento,
 * activity feed, funnel, system status, collapsible sidebar, billing table) and
 * rebuilds them in Blueberry's tokens. See adminHomeData.ts for the data contract:
 * everything is sample data and the page says so.
 *
 * Not here yet: the task list / kanban the owner asked for after these.
 */
import { lazy, Suspense, useCallback, useEffect, useId, useMemo, useRef, useState } from "react";
import type { KeyboardEvent, PointerEvent, ReactNode } from "react";
import { getSupabase } from "@/lib/supabase";
import type { DateRange } from "@/components/ui/calendar";
import { hrefForAdmin, hrefForGallery, hrefForTab } from "../app/routes";
import {
  formatMoney,
  linePath,
  relativeTime,
  sampleAdminHome,
  stepRate,
  type AdminHomeData,
  type FeedKind,
  type StatCell,
} from "./adminHomeData";
import { fetchLive, periodDays, periodLabel, PRESETS, presetPeriod, sampleView, type Period, type PresetId } from "./adminHomeLive";
import { ExampleWash, LiveBadge, SOURCES, SourceNote } from "./honesty";
import "./adminHome.css";
import "./adminHomeExtra.css";

const Calendar = lazy(() => import("@/components/ui/calendar").then((m) => ({ default: m.Calendar })));
const TaskBoard = lazy(() => import("./TaskBoard"));

/** Is this part read from the database right now? Everything else is an example. */
const isLive = (data: AdminHomeData, part: string): boolean => data.liveParts.includes(part);

/** The tag on a card head: Live when read, "No data, example" when not. */
function SampleTag({ data, part }: { data: AdminHomeData; part: string }) {
  // Only live parts get a pill. An example card is already dashed and says "No data" in its body,
  // and the one header chip says "No data, example" once for the screen.
  return isLive(data, part) ? <LiveBadge /> : null;
}

/* ------------------------------------------------------------------ helpers */

function reducedMotion(): boolean {
  if (typeof document === "undefined") return true;
  if (document.documentElement.dataset.motion === "reduced") return true;
  return typeof window.matchMedia === "function" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

/** Counts up to `target` once on mount; shows the final number straight away when motion is reduced. */
function useCountUp(target: number, ms = 800): number {
  const [value, setValue] = useState(() => (reducedMotion() ? target : 0));
  useEffect(() => {
    if (reducedMotion()) {
      setValue(target);
      return;
    }
    let raf = 0;
    const t0 = performance.now();
    const tick = (now: number) => {
      const p = Math.min(1, (now - t0) / ms);
      setValue(Math.round(target * (1 - Math.pow(1 - p, 3))));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, ms]);
  return value;
}

function Delta({ value, unit = "%", digits = 1 }: { value: number | null; unit?: "%" | "pt"; digits?: number }) {
  // No earlier data to compare with: say so instead of inventing a percentage.
  if (value === null) return <span className="ah-muted">No earlier data</span>;
  const up = value >= 0;
  const n = Math.abs(value * 100).toFixed(digits);
  return (
    <span className={`ah-delta ${up ? "is-up" : "is-down"}`}>
      <svg viewBox="0 0 12 12" aria-hidden focusable="false">
        <path d={up ? "M6 10V2M2.5 5.5 6 2l3.5 3.5" : "M6 2v8M2.5 6.5 6 10l3.5-3.5"} fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
      <span className="ah-sr">{up ? "Up " : "Down "}</span>
      {n}
      {unit === "%" ? "%" : " pt"}
    </span>
  );
}

function Sparkline({ points, label }: { points: number[]; label: string }) {
  if (points.length < 2) return null;
  const w = 96;
  const h = 32;
  const max = Math.max(...points);
  const min = Math.min(...points);
  const span = max - min || 1;
  const pts = points.map((p, i): [number, number] => [(i / (points.length - 1)) * w, h - 3 - ((p - min) / span) * (h - 6)]);
  return (
    <svg className="ah-spark" viewBox={`0 0 ${w} ${h}`} role="img" aria-label={label}>
      <path d={`${linePath(pts)} L${w} ${h} L0 ${h} Z`} className="ah-spark__fill" />
      <path d={linePath(pts)} className="ah-spark__line" vectorEffect="non-scaling-stroke" />
    </svg>
  );
}

function Icon({ name }: { name: string }) {
  const paths: Record<string, string> = {
    home: "M4 11 12 4l8 7v8a1 1 0 0 1-1 1h-4v-6H9v6H5a1 1 0 0 1-1-1z",
    people: "M9 11a3 3 0 1 0 0-6 3 3 0 0 0 0 6zm0 2c-3 0-5 1.5-5 3.5V19h10v-2.5C14 14.5 12 13 9 13zm7-2a2.5 2.5 0 1 0 0-5M16.5 13c2.2.3 3.5 1.5 3.5 3.3V19h-3",
    pulse: "M3 12h4l2.5-6 4 12L16 12h5",
    book: "M5 4h10a3 3 0 0 1 3 3v13H8a3 3 0 0 1-3-3zM5 17a3 3 0 0 1 3-3h10",
    funnel: "M4 5h16l-6 7v6l-4 2v-8z",
    card: "M3 7a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2zM3 10h18",
    server: "M5 5h14v5H5zM5 14h14v5H5zM8 7.5h.01M8 16.5h.01",
    star: "M12 4l2.4 5 5.4.7-4 3.7 1 5.4L12 16.1 7.2 18.8l1-5.4-4-3.7 5.4-.7z",
    back: "M15 5 8 12l7 7",
    chevrons: "M13 6l-6 6 6 6M19 6l-6 6 6 6",
    download: "M12 4v11m0 0-4-4m4 4 4-4M5 20h14",
    dots: "M5 12h.01M12 12h.01M19 12h.01",
    check: "M5 12.5 10 17l9-10",
    clock: "M12 7v5l3 2M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18z",
    flag: "M6 21V4m0 0h11l-2 4 2 4H6",
    flame: "M12 3c1 4 5 5 5 10a5 5 0 0 1-10 0c0-2 1-3 2-4 0 2 1 2 2 2 0-3-1-5 1-8z",
    mail: "M4 6h16v12H4zM4 7l8 6 8-6",
    plus: "M12 5v14M5 12h14",
  };
  return (
    <svg className="ah-icon" viewBox="0 0 24 24" aria-hidden focusable="false">
      <path d={paths[name] ?? paths.dots} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function Card({ title, aside, children, className = "", id }: { title: string; aside?: ReactNode; children: ReactNode; className?: string; id?: string }) {
  const hid = useId();
  return (
    <section className={`ah-card ${className}`} aria-labelledby={hid} id={id}>
      <header className="ah-card__head">
        <h2 id={hid} className="ah-card__title">
          {title}
        </h2>
        {aside}
      </header>
      {children}
    </section>
  );
}

/* ------------------------------------------------------------------ side navigation */

interface NavItem {
  id: string;
  label: string;
  icon: string;
  href: string;
  badge?: number;
  /** In-page jump: scrolls to the section id instead of leaving. */
  jump?: boolean;
}

export function SideNav({ current = "home" }: { current?: string }) {
  const [collapsed, setCollapsed] = useState<boolean>(() => {
    try {
      return window.localStorage.getItem("bb-admin-nav") === "collapsed";
    } catch {
      return false;
    }
  });
  const toggle = () => {
    setCollapsed((c) => {
      try {
        window.localStorage.setItem("bb-admin-nav", c ? "open" : "collapsed");
      } catch {
        /* a private window: the toggle still works for this visit */
      }
      return !c;
    });
  };
  // No badge counts: payments and system status have no data source, so there is nothing true to count.
  const overview: NavItem[] = [
    { id: "home", label: "Home", icon: "home", href: hrefForAdmin("home") },
    { id: "stats", label: "Learners", icon: "people", href: hrefForAdmin("stats") },
    { id: "activity", label: "Activity", icon: "pulse", href: hrefForAdmin("activity") },
    { id: "lessons", label: "Lessons", icon: "book", href: hrefForAdmin("lessons") },
    { id: "tasks", label: "Tasks", icon: "check", href: hrefForAdmin("tasks") },
  ];
  const onPage: NavItem[] = [
    { id: "ah-today", label: "Today", icon: "pulse", href: "#ah-today", jump: true },
    { id: "ah-funnel", label: "Funnel", icon: "funnel", href: "#ah-funnel", jump: true },
    { id: "ah-tasks", label: "Task board", icon: "check", href: "#ah-tasks", jump: true },
    { id: "ah-system", label: "Not connected", icon: "server", href: "#ah-system", jump: true },
    { id: "ah-billing", label: "Billing", icon: "card", href: "#ah-billing", jump: true },
  ];
  const account: NavItem[] = [
    { id: "bloom", label: "Bloom", icon: "star", href: hrefForGallery() },
    { id: "app", label: "Open the app", icon: "home", href: hrefForTab("pathway") },
    { id: "me", label: "Back to Me", icon: "back", href: hrefForTab("me") },
  ];

  const jumpTo = (id: string) => (e: React.MouseEvent) => {
    // The hash is the router's, so a bare "#ah-funnel" link would navigate away. Scroll instead.
    e.preventDefault();
    document.getElementById(id.replace("#", ""))?.scrollIntoView({ behavior: reducedMotion() ? "auto" : "smooth", block: "start" });
  };

  const group = (label: string, items: NavItem[]) => (
    <div className="ah-nav__group">
      <p className="ah-nav__label">{label}</p>
      <ul>
        {items.map((it) => (
          <li key={it.id}>
            <a
              className="ah-nav__link"
              href={it.href}
              aria-current={it.id === current ? "page" : undefined}
              title={collapsed ? it.label : undefined}
              onClick={it.jump ? jumpTo(it.href) : undefined}
            >
              <Icon name={it.icon} />
              <span className="ah-nav__text">{it.label}</span>
              {it.badge !== undefined && it.badge > 0 ? (
                <span className="ah-nav__badge" aria-label={`${it.badge} to look at`}>
                  {it.badge}
                </span>
              ) : null}
            </a>
          </li>
        ))}
      </ul>
    </div>
  );

  return (
    <nav className={`ah-nav${collapsed ? " is-collapsed" : ""}`} aria-label="Admin">
      <div className="ah-nav__brand">
        <span className="ah-nav__mark" aria-hidden>
          B
        </span>
        <span className="ah-nav__text ah-nav__name">Blueberry admin</span>
      </div>
      {group("Overview", overview)}
      {current === "home" ? group("On this page", onPage) : null}
      {group("Account", account)}
      <button type="button" className="ah-nav__hide" aria-pressed={collapsed} onClick={toggle}>
        <Icon name="chevrons" />
        <span className="ah-nav__text">{collapsed ? "Show menu" : "Hide menu"}</span>
      </button>
    </nav>
  );
}

/* ------------------------------------------------------------------ stat strip */

const STAT_SOURCE: Record<string, string> = { active: SOURCES.active, signups: SOURCES.signups, paying: SOURCES.paying };

function StatCellView({ cell, live }: { cell: StatCell; live: boolean }) {
  const shown = useCountUp(cell.kind === "money" ? Math.round(cell.value) : cell.value);
  const text = cell.kind === "money" ? formatMoney(shown * 100) : shown.toLocaleString("en-US");
  const source = STAT_SOURCE[cell.id] ?? SOURCES.money;
  return (
    <li className={`ah-stat${live ? "" : " is-example"}`}>
      <p className="ah-stat__label">
        {cell.label}
        {live ? <LiveBadge /> : null}
      </p>
      {live ? (
        <p className="ah-stat__row">
          <span className="ah-stat__value">{text}</span>
          <Delta value={cell.delta} />
        </p>
      ) : (
        <p className="ah-stat__row">
          <span className="ah-nodata">No data</span>
        </p>
      )}
      {live ? (
        <Sparkline points={cell.spark} label={`${cell.label}, last 14 days`} />
      ) : (
        <ExampleWash>
          <Sparkline points={cell.spark} label={`Example graph for ${cell.label}`} />
        </ExampleWash>
      )}
      <p className="ah-stat__hint">{cell.hint}.{live && cell.delta !== null ? " Compared with the period before." : ""}</p>
      <SourceNote live={live} source={source} />
    </li>
  );
}

/* ------------------------------------------------------------------ growth chart */

function GrowthChart({ data }: { data: AdminHomeData }) {
  const [hover, setHover] = useState<number | null>(null);
  // A single day has one point; draw it as two so the line has a start and an end.
  const cur = useMemo(() => (data.signups.length === 1 ? [data.signups[0]!, data.signups[0]!] : data.signups.length ? data.signups : [0, 0]), [data.signups]);
  const prev = useMemo(() => (data.signupsBefore.length >= cur.length ? data.signupsBefore.slice(-cur.length) : [...new Array<number>(cur.length - data.signupsBefore.length).fill(0), ...data.signupsBefore]), [data.signupsBefore, cur.length]);
  const range = data.signups.length || 1;
  const total = cur.reduce((a, b) => a + b, 0);
  const totalPrev = prev.reduce((a, b) => a + b, 0);
  const delta = totalPrev === 0 ? null : total / totalPrev - 1;
  const shown = useCountUp(total, 600);
  const live = isLive(data, "growth");

  const W = 600;
  const H = 220;
  const max = Math.max(...cur, ...prev, 1) * 1.15;
  const xy = (series: number[]): Array<[number, number]> => series.map((v, i) => [(i / (series.length - 1)) * W, H - 6 - (v / max) * (H - 18)]);
  const curPts = xy(cur);
  const prevPts = xy(prev);
  const ref = useRef<HTMLDivElement>(null);

  const idxFromX = (clientX: number) => {
    const r = ref.current?.getBoundingClientRect();
    if (!r || r.width === 0) return null;
    return Math.max(0, Math.min(cur.length - 1, Math.round(((clientX - r.left) / r.width) * (cur.length - 1))));
  };
  const onMove = (e: PointerEvent) => setHover(idxFromX(e.clientX));
  const onKey = (e: KeyboardEvent) => {
    if (e.key === "ArrowRight") setHover((h) => Math.min(cur.length - 1, (h ?? -1) + 1));
    else if (e.key === "ArrowLeft") setHover((h) => Math.max(0, (h ?? cur.length) - 1));
    else if (e.key === "Escape") setHover(null);
    else return;
    e.preventDefault();
  };
  const at = hover ?? cur.length - 1;
  const daysAgo = cur.length - 1 - at;

  return (
    <Card
      title="New sign-ups"
      className={`ah-growth${live ? "" : " is-example"}`}
      aside={<SampleTag data={data} part="growth" />}
    >
      <div className="ah-growth__top">
        <div>
          {live ? (
            <>
              <p className="ah-big">{shown.toLocaleString("en-US")}</p>
              <p className="ah-muted">
                <Delta value={delta} /> <span>vs the {range === 1 ? "day" : `${range} days`} before ({totalPrev.toLocaleString("en-US")})</span>
              </p>
            </>
          ) : (
            <p className="ah-big ah-nodata">No data</p>
          )}
        </div>
        {live ? <p className="ah-growth__read" aria-live="polite">
          <strong>{cur[at]}</strong> {cur[at] === 1 ? "sign-up" : "sign-ups"}
          <span className="ah-muted"> {daysAgo === 0 ? "on the last day" : `${daysAgo} days before the end`}, before: {prev[at]}</span>
        </p> : null}
      </div>
      <div
        ref={ref}
        className="ah-chart"
        tabIndex={live ? 0 : -1}
        role="img"
        aria-label={live ? `Sign-ups per day for the chosen ${range} days. ${total} in total. Use the arrow keys to read each day.` : "Example graph, no data. Shape only."}
        style={live ? undefined : { opacity: 0.5, pointerEvents: "none" }}
        onPointerMove={onMove}
        onPointerLeave={() => setHover(null)}
        onKeyDown={onKey}
        onBlur={() => setHover(null)}
      >
        <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" aria-hidden focusable="false">
          {[0.25, 0.5, 0.75].map((f) => (
            <line key={f} x1="0" x2={W} y1={H * f} y2={H * f} className="ah-chart__grid" vectorEffect="non-scaling-stroke" />
          ))}
          <path d={`${linePath(curPts)} L${W} ${H} L0 ${H} Z`} className="ah-chart__area" />
          <path d={linePath(prevPts)} className="ah-chart__prev" vectorEffect="non-scaling-stroke" />
          <path d={linePath(curPts)} className="ah-chart__line" vectorEffect="non-scaling-stroke" />
        </svg>
        {hover !== null ? (
          <>
            <span className="ah-chart__rule" style={{ left: `${(at / (cur.length - 1)) * 100}%` }} />
            <span className="ah-chart__dot" style={{ left: `${(at / (cur.length - 1)) * 100}%`, top: `${(curPts[at]![1] / H) * 100}%` }} />
          </>
        ) : null}
      </div>
      <div className="ah-chart__axis" aria-hidden>
        <span>{range === 1 ? "Start of day" : `${range - 1} days ago`}</span>
        <span>End of period</span>
      </div>
      <p className="ah-legend">
        <span className="ah-legend__key is-now" /> This period <span className="ah-legend__key is-before" /> The period before
      </p>
      <SourceNote live={live} source={SOURCES.signups} />
    </Card>
  );
}

/* ------------------------------------------------------------------ funnel */

function FunnelRow({ label, count, top, rate, delta, index, last }: { label: string; count: number; top: number; rate: number; delta: number; index: number; last: boolean }) {
  const shown = useCountUp(count, 700);
  const pct = Math.max(4, (count / top) * 100);
  return (
    <li className="ah-fn">
      <div className="ah-fn__text">
        <span className="ah-fn__label">{label}</span>
        <span className="ah-fn__count">{shown.toLocaleString("en-US")}</span>
      </div>
      <div className="ah-fn__track" aria-hidden>
        <span className={`ah-fn__bar${last ? " is-last" : ""}`} style={{ width: `${pct}%`, ["--ah-step" as string]: index }} />
      </div>
      <div className="ah-fn__meta">
        <span>{index === 0 ? "Everyone who arrived" : `${rate}% of the step before`}</span>
        {index === 0 ? null : <Delta value={delta} unit="pt" digits={1} />}
      </div>
    </li>
  );
}

function worstStep(f: AdminHomeData["funnel"]): string {
  let worst = f[1] ?? f[0]!;
  let low = 2;
  for (let i = 1; i < f.length; i += 1) {
    const r = stepRate(f[i]!.count, f[i - 1]!.count);
    if (r / 100 < low) {
      low = r / 100;
      worst = f[i]!;
    }
  }
  return worst.label;
}

function Funnel({ data }: { data: AdminHomeData }) {
  const live = isLive(data, "funnel");
  const top = data.funnel[0]!.count;
  const first = data.funnel[0]!;
  const last = data.funnel[data.funnel.length - 1]!;
  const sources = ["profiles", "progress_events", ...(data.funnel.some((f) => f.id === "visited") ? ["analytics_events (visits)"] : []), ...(data.funnel.some((f) => f.id === "paid") ? ["entitlements (Pro)"] : [])].join(", ");
  return (
    <Card title="Learner funnel" id="ah-funnel" className={live ? "" : "is-example"} aside={<><SampleTag data={data} part="funnel" /><a className="ah-link" href={hrefForAdmin("stats")}>See learners</a></>}>
      <p className="ah-muted ah-card__lede">
        {!live
          ? "No data yet. The bars below show the shape of a funnel, not your learners."
          : data.funnel.length < 2 || first.count === 0
            ? "No one in this period yet."
            : `Of every 100 who ${first.id === "visited" ? "visited" : "signed up"}, about ${Math.round((last.count / first.count) * 100)} reach "${last.label}". The biggest drop is at "${worstStep(data.funnel)}".`}
      </p>
      {live ? (
        <ol className="ah-funnel">
          {data.funnel.map((s, i) => (
            <FunnelRow key={s.id} label={s.label} count={s.count} top={top} rate={stepRate(s.count, data.funnel[i - 1]?.count)} delta={s.delta} index={i} last={i === data.funnel.length - 1} />
          ))}
        </ol>
      ) : (
        <ExampleWash>
          <ol className="ah-funnel">
            {data.funnel.map((s, i) => (
              <li key={s.id} className="ah-fn">
                <div className="ah-fn__text">
                  <span className="ah-fn__label">{s.label}</span>
                </div>
                <div className="ah-fn__track" aria-hidden>
                  <span className={`ah-fn__bar${i === data.funnel.length - 1 ? " is-last" : ""}`} style={{ width: `${Math.max(4, (s.count / top) * 100)}%`, ["--ah-step" as string]: i }} />
                </div>
              </li>
            ))}
          </ol>
        </ExampleWash>
      )}
      <SourceNote live={live} source={sources} />
    </Card>
  );
}

/* ------------------------------------------------------------------ activity feed */

const FEED_ICON: Record<FeedKind, { icon: string; tone: string }> = {
  signup: { icon: "plus", tone: "violet" },
  lesson: { icon: "book", tone: "blue" },
  paid: { icon: "card", tone: "green" },
  flag: { icon: "flag", tone: "amber" },
  streak: { icon: "flame", tone: "amber" },
};

function Feed({ data }: { data: AdminHomeData }) {
  const live = isLive(data, "feed");
  return (
    <Card title="Recent activity" id="ah-feed" className={live ? "" : "is-example"} aside={<><SampleTag data={data} part="feed" /><a className="ah-link" href={hrefForAdmin("activity")}>View all</a></>}>
      {!live ? <p className="ah-empty">No data, example. Events appear here once figures are read.</p> : null}
      {live && data.feed.length === 0 ? <p className="ah-empty">Nothing happened in this period.</p> : null}
      <ul className="ah-feed">
        {(live ? data.feed : []).map((f, i) => {
          const m = FEED_ICON[f.kind];
          return (
            <li key={f.id} className="ah-feed__item" style={{ ["--ah-i" as string]: i }}>
              <span className={`ah-dot is-${m.tone}`}>
                <Icon name={m.icon} />
              </span>
              <span className="ah-feed__text">{f.text}</span>
              <time className="ah-feed__time">{relativeTime(f.minutesAgo)}</time>
            </li>
          );
        })}
      </ul>
      <SourceNote live={live} source={SOURCES.feed} />
    </Card>
  );
}

/* ------------------------------------------------------------------ system status */

const NOT_CONNECTED: Array<{ id: string; title: string; what: string; source: string }> = [
  { id: "revenue", title: "Revenue", what: "Money in, per day and per month.", source: SOURCES.money },
  { id: "payouts", title: "Payouts", what: "What Stripe sends to the bank, and when.", source: SOURCES.money },
  { id: "status", title: "System status", what: "Uptime and incidents for the API, database, sign-in and email.", source: SOURCES.status },
];

/** One quiet card for everything with no data source yet. No figures, no graphs, no invented incidents. */
function NotConnected() {
  return (
    <Card title="Not connected yet" id="ah-system" className="is-example">
      <ul className="ah-nc" data-testid="not-connected">
        {NOT_CONNECTED.map((n) => (
          <li key={n.id}>
            <p className="ah-nc__title">{n.title}</p>
            <p className="ah-muted">{n.what}</p>
            <p className="ah-source is-example" data-testid="example-note">
              Feeds from {n.source} once connected.
            </p>
          </li>
        ))}
      </ul>
    </Card>
  );
}

/* ------------------------------------------------------------------ billing */

const PLAN_LABEL: Record<string, string> = {};

function Billing({ data }: { data: AdminHomeData }) {
  const live = isLive(data, "billing");
  return (
    <Card title="Purchases" id="ah-billing" aside={live ? <LiveBadge /> : undefined}>
      {live ? (
        <div className="ah-tablewrap">
          <table className="ah-table">
            <thead>
              <tr>
                <th scope="col">Plan</th>
                <th scope="col" className="ah-hide-sm">Type</th>
                <th scope="col">Date</th>
                <th scope="col">Status</th>
              </tr>
            </thead>
            <tbody>
              {data.purchases.map((r) => (
                <tr key={r.id}>
                  <th scope="row">{PLAN_LABEL[r.plan] ?? r.plan}</th>
                  <td className="ah-hide-sm">{r.kind === "pass" ? "One-off pass" : "Subscription"}</td>
                  <td>{new Date(r.at).toLocaleDateString("en-US", { day: "numeric", month: "short" })}</td>
                  <td>
                    <span className={`ah-pill is-${["active", "trialing", "complete"].includes(r.status) ? "good" : "info"}`}>{r.status[0]!.toUpperCase() + r.status.slice(1).replace(/_/g, " ")}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <p className="ah-empty">No data, example. Purchases list here once figures are read and the staff read migration is applied.</p>
      )}
      <SourceNote live={live} source="entitlements table, newest 20 rows, plan and status only; amounts are held by Stripe" why="Needs the staff read migration, applied once." />
    </Card>
  );
}

/* ------------------------------------------------------------------ needs you */

interface Attention {
  id: string;
  icon: string;
  tone: "amber" | "blue";
  text: string;
  to: string;
  action: string;
}

/** What wants a decision. Only parts read from the database count; an example tile never raises a flag. */
function attentionItems(data: AdminHomeData): Attention[] {
  const out: Attention[] = [];
  if (isLive(data, "feed")) {
    const flags = data.feed.filter((f) => f.kind === "flag").length;
    if (flags > 0) out.push({ id: "flag", icon: "flag", tone: "blue", text: `${flags} flagged ${flags === 1 ? "question" : "questions"} to review`, to: "#ah-feed", action: "See activity" });
  }
  return out;
}

function NeedsYou({ data }: { data: AdminHomeData }) {
  const items = attentionItems(data);
  const checked = isLive(data, "feed");
  const jump = (to: string) => (e: React.MouseEvent) => {
    e.preventDefault();
    document.querySelector(to)?.scrollIntoView({ behavior: reducedMotion() ? "auto" : "smooth", block: "start" });
  };
  return (
    <section className={`ah-need${items.length === 0 ? " is-calm" : ""}`} aria-labelledby="ah-need-h" id="ah-need">
      <h2 id="ah-need-h" className="ah-need__title">
        {items.length === 0 ? (checked ? "All calm. Nothing needs you." : "Nothing to check yet.") : `${items.length} ${items.length === 1 ? "thing needs" : "things need"} you`}
      </h2>
      <p className="ah-muted">{checked ? "Checked: sign-ups and lessons. Payments and system status are not connected, so they are not checked." : "Nothing is checked until figures are read. Payments and system status are not connected."}</p>
      {items.length > 0 ? (
        <ul className="ah-need__list">
          {items.map((i) => (
            <li key={i.id}>
              <span className={`ah-dot is-${i.tone}`}>
                <Icon name={i.icon} />
              </span>
              <span className="ah-need__text">{i.text}</span>
              <a className="ah-link" href={i.to} onClick={jump(i.to)}>
                {i.action}
              </a>
            </li>
          ))}
        </ul>
      ) : null}
    </section>
  );
}

/* ------------------------------------------------------------------ page */

function greeting(): string {
  const h = new Date().getHours();
  return h < 5 ? "Still up" : h < 12 ? "Good morning" : h < 18 ? "Good afternoon" : "Good evening";
}

/* ------------------------------------------------------------------ connect banner */

type FailReason = "no-supabase" | "signed-out" | "blocked" | "error";

const CONNECT_COPY: Record<FailReason | "checking", { title: string; body: string }> = {
  checking: { title: "Checking your session", body: "Reading your admin session. Real figures appear here when it is found." },
  "signed-out": { title: "No admin session read", body: "Every number on this page comes from the database. Without an admin session, tiles show a dashed example, never a guess." },
  blocked: { title: "This account cannot read the figures", body: "The server refused the read. Check that this account is staff, or apply the staff read migration." },
  error: { title: "Figures did not load", body: "The read failed. Nothing below is real until it succeeds." },
  "no-supabase": { title: "No database in this build", body: "This build has no Supabase connection, so nothing here can be real." },
};

/** The one place the page says why nothing is live, with the one action that fixes it. */
function ConnectBanner({ reason, onRetry }: { reason: FailReason | "ok" | null; onRetry: () => void }) {
  const key: FailReason | "checking" = reason === null || reason === "ok" ? "checking" : reason;
  const c = CONNECT_COPY[key];
  return (
    <section className="ah-connect" aria-labelledby="ah-connect-h" data-testid="connect-banner">
      <div>
        <h2 id="ah-connect-h" className="ah-connect__title">
          {c.title}
        </h2>
        <p className="ah-muted">{c.body}</p>
      </div>
      {key === "error" || key === "blocked" ? (
        <button type="button" className="ah-connect__act" onClick={onRetry}>
          Try again
        </button>
      ) : null}
    </section>
  );
}

/* ------------------------------------------------------------------ date selector */

function PeriodBar({ period, preset, now, onPreset, onRange }: { period: Period; preset: PresetId | null; now: Date; onPreset: (id: PresetId) => void; onRange: (p: Period) => void }) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<DateRange>({ from: period.from, to: period.to });
  const panel = useId();
  useEffect(() => {
    if (!open) return;
    const away = (e: globalThis.KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", away);
    return () => document.removeEventListener("keydown", away);
  }, [open]);
  const choose = (r: DateRange) => {
    setDraft(r);
    if (r.from && r.to) {
      onRange({ from: r.from, to: r.to });
      setOpen(false);
    }
  };
  return (
    <div className="ah-period">
      <div className="ah-seg" role="group" aria-label="Period">
        {PRESETS.map((p) => (
          <button
            key={p.id}
            type="button"
            aria-pressed={preset === p.id}
            onClick={() => {
              onPreset(p.id);
              setOpen(false);
            }}
          >
            {p.label}
          </button>
        ))}
      </div>
      <button
        type="button"
        className="ah-datebtn"
        aria-expanded={open}
        aria-controls={panel}
        onClick={() => {
          setDraft({ from: period.from, to: period.to });
          setOpen((o) => !o);
        }}
      >
        <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden>
          <path d="M4 8h16M7 3v4M17 3v4M5 5h14a1 1 0 0 1 1 1v13a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1z" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        </svg>
        <span>{periodLabel(period, now)}</span>
      </button>
      {open ? (
        <div className="ah-pop ah-pop--float" id={panel} role="dialog" aria-label="Pick a date range">
          <p className="ah-muted">Click a start day, then an end day.</p>
          <Suspense fallback={<p className="ah-muted">Loading calendar...</p>}>
            <Calendar mode="range" label="Date range" selected={draft} onSelect={choose} defaultMonth={period.to} weekStartsOn={1} disabled={(d) => d > now} />
          </Suspense>
        </div>
      ) : null}
    </div>
  );
}

/* ------------------------------------------------------------------ page */

const REFRESH_MS = 30_000;

export default function AdminHome({ data: injected }: { readonly data?: AdminHomeData }) {
  const [now, setNow] = useState(() => new Date());
  const [period, setPeriod] = useState<Period>(() => presetPeriod("30", new Date()));
  const [preset, setPreset] = useState<PresetId | null>("30");
  const [reason, setReason] = useState<FailReason | "ok" | null>(null);
  const [live, setLive] = useState<AdminHomeData | null>(null);

  const sample = useMemo(() => sampleView(sampleAdminHome, period, now), [period, now]);
  const data = injected ?? live ?? sample;

  const load = useCallback(async () => {
    if (injected) return;
    const at = new Date();
    const res = await fetchLive(await getSupabase(), period, at);
    setNow(at);
    if (res.ok) {
      setLive(res.data);
      setReason("ok");
    } else {
      setLive(null);
      setReason(res.reason);
    }
  }, [period, injected]);

  useEffect(() => {
    void load();
    if (injected) return;
    const id = window.setInterval(() => void load(), REFRESH_MS);
    return () => window.clearInterval(id);
  }, [load, injected]);

  const days = periodDays(period);
  return (
    <div className="ah">
      <SideNav current="home" />
      <main className="ah-main" id="ah-main">
        <header className="ah-hello">
          <div>
            <h1 className="ah-hello__title">{greeting()}, Andrew</h1>
            <p className="ah-muted" id="ah-today">
              {isLive(data, "today")
                ? `${data.today.learningNow.toLocaleString("en-US")} learning right now, ${data.today.activeToday.toLocaleString("en-US")} active today. `
                : "Nothing read yet. "}
              Showing {days === 1 ? periodLabel(period, now).toLowerCase() : `${days} days`}.
            </p>
            <p className="ah-source" data-testid="today-source">
              {isLive(data, "today") ? `Source: ${SOURCES.today}.` : "Live counts appear once figures are read."}
            </p>
          </div>
          {data.source === "sample" ? (
            <span className="ah-chip" role="note">
              No data, example
            </span>
          ) : (
            <span className="ah-chip is-live" role="note">
              {data.liveParts.length} {data.liveParts.length === 1 ? "part" : "parts"} live. {data.asOf}
            </span>
          )}
          <a className="ah-open" href={hrefForTab("pathway")}>
            Open the app
          </a>
        </header>
        {data.liveParts.length === 0 ? <ConnectBanner reason={injected ? "signed-out" : reason} onRetry={() => void load()} /> : null}

        <PeriodBar
          period={period}
          preset={preset}
          now={now}
          onPreset={(id) => {
            setPreset(id);
            setPeriod(presetPeriod(id, new Date()));
          }}
          onRange={(p) => {
            setPreset(null);
            setPeriod(p);
          }}
        />

        <ul className="ah-strip" aria-label="The numbers that matter">
          {data.stats.filter((s) => s.id !== "revenue").map((s) => (
            <StatCellView key={s.id} cell={s} live={data.liveParts.includes(`stat:${s.id}`)} />
          ))}
        </ul>

        <NeedsYou data={data} />

        <div className="ah-cols ah-cols--solo">
          <GrowthChart data={data} />
        </div>

        <div className="ah-cols ah-cols--even">
          <Funnel data={data} />
          <Feed data={data} />
        </div>

        <Suspense fallback={<p className="ah-muted">Loading the task board...</p>}>
          <TaskBoard embedded />
        </Suspense>

        <div className="ah-cols ah-cols--even">
          <Billing data={data} />
          <NotConnected />
        </div>
      </main>
    </div>
  );
}

/** The dashboard's frame (sidebar that hides, plus the page) around any other admin page. */
export function AdminShell({ current, children }: { current: string; children: React.ReactNode }) {
  return (
    <div className="ah">
      <SideNav current={current} />
      <main className="ah-main" id="ah-main">
        {children}
      </main>
    </div>
  );
}
