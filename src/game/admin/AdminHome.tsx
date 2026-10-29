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
  invoicesCsv,
  linePath,
  relativeTime,
  sampleAdminHome,
  stepRate,
  uptimePercent,
  type AdminHomeData,
  type FeedKind,
  type Invoice,
  type InvoiceStatus,
  type Service,
  type StatCell,
} from "./adminHomeData";
import { fetchLive, periodDays, periodLabel, PRESETS, presetPeriod, sampleView, type Period, type PresetId } from "./adminHomeLive";
import "./adminHome.css";
import "./adminHomeExtra.css";

const Calendar = lazy(() => import("@/components/ui/calendar").then((m) => ({ default: m.Calendar })));
const TaskBoard = lazy(() => import("./TaskBoard"));

/** A small tag on any card whose figures are made up while others on the page are real. */
function SampleTag({ data, part }: { data: AdminHomeData; part: string }) {
  // On an all-sample page the one chip under the greeting says it once. Tags appear only
  // when real and made-up figures sit side by side, so the reader can tell which is which.
  if (data.source === "sample") return null;
  if (data.liveParts.includes(part)) return <span className="ah-tag is-live">Live</span>;
  return <span className="ah-tag is-sample">Sample data, not live</span>;
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

function Delta({ value, unit = "%", digits = 1 }: { value: number; unit?: "%" | "pt"; digits?: number }) {
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

function SideNav({ data }: { data: AdminHomeData }) {
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
  const failed = data.invoices.filter((i) => i.status === "failed").length;
  const slow = data.services.filter((s) => s.state !== "up").length;
  const overview: NavItem[] = [
    { id: "home", label: "Home", icon: "home", href: hrefForAdmin("home") },
    { id: "stats", label: "Learners", icon: "people", href: hrefForAdmin("stats") },
    { id: "activity", label: "Activity", icon: "pulse", href: hrefForAdmin("activity") },
    { id: "lessons", label: "Lessons", icon: "book", href: hrefForAdmin() },
  ];
  const onPage: NavItem[] = [
    { id: "ah-today", label: "Today", icon: "pulse", href: "#ah-today", jump: true },
    { id: "ah-funnel", label: "Funnel", icon: "funnel", href: "#ah-funnel", jump: true },
    { id: "ah-tasks", label: "Tasks", icon: "check", href: "#ah-tasks", jump: true },
    { id: "ah-system", label: "System", icon: "server", href: "#ah-system", jump: true, badge: slow },
    { id: "ah-billing", label: "Billing", icon: "card", href: "#ah-billing", jump: true, badge: failed },
  ];
  const account: NavItem[] = [
    { id: "bloom", label: "Bloom", icon: "star", href: hrefForGallery() },
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
              aria-current={it.id === "home" ? "page" : undefined}
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
      {group("On this page", onPage)}
      {group("Account", account)}
      <button type="button" className="ah-nav__hide" aria-pressed={collapsed} onClick={toggle}>
        <Icon name="chevrons" />
        <span className="ah-nav__text">{collapsed ? "Show menu" : "Hide menu"}</span>
      </button>
    </nav>
  );
}

/* ------------------------------------------------------------------ stat strip */

function StatCellView({ cell, live, sampleOnly }: { cell: StatCell; live: boolean; sampleOnly: boolean }) {
  const shown = useCountUp(cell.kind === "money" ? Math.round(cell.value) : cell.value);
  const text = cell.kind === "money" ? formatMoney(shown * 100) : shown.toLocaleString("en-US");
  return (
    <li className="ah-stat">
      <p className="ah-stat__label">{cell.label}{live || sampleOnly ? null : <span className="ah-tag is-sample">Sample</span>}</p>
      <p className="ah-stat__row">
        <span className="ah-stat__value">{text}</span>
        <Delta value={cell.delta} />
      </p>
      <Sparkline points={cell.spark} label={`${cell.label}, last 14 days`} />
      <p className="ah-stat__hint">{cell.hint}. Compared with the period before.</p>
    </li>
  );
}

/* ------------------------------------------------------------------ hero number */

/** The one number a solo founder opens the page for: money in. Biggest thing on screen, plain ink on white. */
function Hero({ data, days }: { data: AdminHomeData; days: number }) {
  const rev = data.stats.find((s) => s.id === "revenue");
  const shown = useCountUp(rev ? Math.round(rev.value) : 0, 700);
  if (!rev) return null;
  const pts = rev.spark.length > 1 ? rev.spark : [0, 0];
  const W = 320;
  const H = 72;
  const max = Math.max(...pts);
  const min = Math.min(...pts);
  const span = max - min || 1;
  const xy = pts.map((p, i): [number, number] => [(i / (pts.length - 1)) * W, H - 6 - ((p - min) / span) * (H - 12)]);
  return (
    <section className="ah-hero" aria-label="Revenue">
      <div className="ah-hero__text">
        <p className="ah-hero__label">Revenue, {days === 1 ? "today" : `last ${days} days`}</p>
        <p className="ah-hero__value">{formatMoney(shown * 100)}</p>
        <p className="ah-hero__sub">
          <Delta value={rev.delta} /> <span>compared with the period before</span>
        </p>
      </div>
      <svg className="ah-hero__spark" viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" role="img" aria-label="Revenue per day, recent days">
        <path d={`${linePath(xy)} L${W} ${H} L0 ${H} Z`} className="ah-spark__fill" />
        <path d={linePath(xy)} className="ah-spark__line" vectorEffect="non-scaling-stroke" />
      </svg>
    </section>
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
  const delta = totalPrev === 0 ? 0 : total / totalPrev - 1;
  const shown = useCountUp(total, 600);

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
      className="ah-growth"
      aside={<SampleTag data={data} part="growth" />}
    >
      <div className="ah-growth__top">
        <div>
          <p className="ah-big">{shown.toLocaleString("en-US")}</p>
          <p className="ah-muted">
            <Delta value={delta} /> <span>vs the {range === 1 ? "day" : `${range} days`} before ({totalPrev.toLocaleString("en-US")})</span>
          </p>
        </div>
        <p className="ah-growth__read" aria-live="polite">
          <strong>{cur[at]}</strong> {cur[at] === 1 ? "sign-up" : "sign-ups"}
          <span className="ah-muted"> {daysAgo === 0 ? "on the last day" : `${daysAgo} days before the end`}, before: {prev[at]}</span>
        </p>
      </div>
      <div
        ref={ref}
        className="ah-chart"
        tabIndex={0}
        role="img"
        aria-label={`Sign-ups per day for the chosen ${range} days. ${total} in total. Use the arrow keys to read each day.`}
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
  const top = data.funnel[0]!.count;
  const first = data.funnel[0]!;
  const last = data.funnel[data.funnel.length - 1]!;
  return (
    <Card title="Learner funnel" id="ah-funnel" aside={<><SampleTag data={data} part="funnel" /><a className="ah-link" href={hrefForAdmin("stats")}>See learners</a></>}>
      <p className="ah-muted ah-card__lede">
        {data.funnel.length < 2 || first.count === 0
          ? "No one in this period yet."
          : `Of every 100 who ${first.id === "visited" ? "visited" : "signed up"}, about ${Math.round((last.count / first.count) * 100)} reach "${last.label}". The biggest drop is at "${worstStep(data.funnel)}".`}
      </p>
      <ol className="ah-funnel">
        {data.funnel.map((s, i) => (
          <FunnelRow key={s.id} label={s.label} count={s.count} top={top} rate={stepRate(s.count, data.funnel[i - 1]?.count)} delta={s.delta} index={i} last={i === data.funnel.length - 1} />
        ))}
      </ol>
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
  return (
    <Card title="Recent activity" id="ah-feed" aside={<><SampleTag data={data} part="feed" /><a className="ah-link" href={hrefForAdmin("activity")}>View all</a></>}>
      {data.feed.length === 0 ? <p className="ah-empty">Nothing happened in this period.</p> : null}
      <ul className="ah-feed">
        {data.feed.map((f, i) => {
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
    </Card>
  );
}

/* ------------------------------------------------------------------ system status */

function StateBadge({ state }: { state: Service["state"] }) {
  const text = state === "up" ? "Working" : state === "slow" ? "Slow" : "Down";
  return (
    <span className={`ah-pill is-${state === "up" ? "good" : "warn"}`}>
      <Icon name={state === "up" ? "check" : "clock"} />
      {text}
    </span>
  );
}

function System({ data }: { data: AdminHomeData }) {
  const [open, setOpen] = useState(false);
  const allUp = data.services.every((s) => s.state === "up");
  const panel = useId();
  return (
    <Card title="System status" id="ah-system" aside={<StateBadge state={allUp ? "up" : "slow"} />}>
      <ul className="ah-svc">
        {data.services.map((s) => (
          <li key={s.id} className="ah-svc__row">
            <div className="ah-svc__top">
              <span className="ah-svc__name">{s.name}</span>
              <StateBadge state={s.state} />
            </div>
            <div className="ah-ticks" role="img" aria-label={`${s.name}: ${s.days.filter((d) => !d).length} rough days in the last 30`}>
              {s.days.map((ok, i) => (
                <span key={i} className={ok ? "is-ok" : "is-bad"} />
              ))}
            </div>
            <p className="ah-svc__meta">
              <span>{uptimePercent(s.days)}% over 30 days</span>
              <span>{s.lastIncident ?? "No incidents"}</span>
            </p>
          </li>
        ))}
      </ul>
      <button type="button" className="ah-more" aria-expanded={open} aria-controls={panel} onClick={() => setOpen((o) => !o)}>
        {open ? "Hide" : "Show"} incident history
      </button>
      {open ? (
        <ul id={panel} className="ah-incidents">
          {data.incidents.map((i) => (
            <li key={i.id}>
              <p>
                <strong>{i.service}</strong> <span className="ah-muted">{i.when}, {i.minutes} min</span>
              </p>
              <p className="ah-muted">{i.text}</p>
            </li>
          ))}
        </ul>
      ) : null}
    </Card>
  );
}

/* ------------------------------------------------------------------ billing */

const STATUS_FILTERS: Array<"all" | InvoiceStatus> = ["all", "paid", "pending", "failed"];

function Billing({ data }: { data: AdminHomeData }) {
  const [filter, setFilter] = useState<"all" | InvoiceStatus>("all");
  const rows: Invoice[] = data.invoices.filter((i) => filter === "all" || i.status === filter);
  const download = () => {
    const url = URL.createObjectURL(new Blob([invoicesCsv(rows)], { type: "text/csv" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = "sample-invoices.csv";
    a.click();
    URL.revokeObjectURL(url);
  };
  return (
    <Card
      title="Billing"
      id="ah-billing"
      aside={
        <button type="button" className="ah-iconbtn" onClick={download} disabled={rows.length === 0} aria-label="Download these rows as a spreadsheet">
          <Icon name="download" />
          <span>Download</span>
        </button>
      }
    >
      <div className="ah-seg ah-seg--wide" role="group" aria-label="Show payments">
        {STATUS_FILTERS.map((f) => (
          <button key={f} type="button" aria-pressed={filter === f} onClick={() => setFilter(f)}>
            {f === "all" ? "All" : f[0]!.toUpperCase() + f.slice(1)}
          </button>
        ))}
      </div>
      {rows.length === 0 ? (
        <p className="ah-empty">Nothing here. That is a good sign.</p>
      ) : (
        <div className="ah-tablewrap">
          <table className="ah-table">
            <thead>
              <tr>
                <th scope="col">Learner</th>
                <th scope="col" className="ah-hide-sm">Plan</th>
                <th scope="col" className="ah-hide-sm">Date</th>
                <th scope="col" className="ah-num">Amount</th>
                <th scope="col">Status</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id}>
                  <th scope="row">
                    {r.who}
                    <span className="ah-sub">{r.id}</span>
                  </th>
                  <td className="ah-hide-sm">{r.plan}</td>
                  <td className="ah-hide-sm">{r.date}</td>
                  <td className="ah-num">{formatMoney(r.cents)}</td>
                  <td>
                    <span className={`ah-pill is-${r.status === "paid" ? "good" : r.status === "pending" ? "info" : "warn"}`}>{r.status === "failed" ? "Needs a retry" : r.status[0]!.toUpperCase() + r.status.slice(1)}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Card>
  );
}

/* ------------------------------------------------------------------ side column */

function SideColumn({ data }: { data: AdminHomeData }) {
  const next = data.payouts[0]!;
  return (
    <div className="ah-side">
      <Card title="Payouts" aside={<SampleTag data={data} part="payouts" />}>
        <p className="ah-muted">Next payout</p>
        <p className="ah-big ah-big--sm">{formatMoney(next.cents)}</p>
        <p className="ah-muted">{next.due}</p>
        <ul className="ah-payouts">
          {data.payouts.slice(1).map((p) => (
            <li key={p.id}>
              <span>{p.due}</span>
              <span className="ah-num">{formatMoney(p.cents)}</span>
              <span className={`ah-pill is-${p.status === "paid" ? "good" : "info"}`}>{p.status}</span>
            </li>
          ))}
        </ul>
      </Card>
    </div>
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

/** What wants a decision, worked out from the data so it never drifts from the cards below. */
function attentionItems(data: AdminHomeData): Attention[] {
  const out: Attention[] = [];
  const failed = data.invoices.filter((i) => i.status === "failed").length;
  if (failed > 0) out.push({ id: "pay", icon: "card", tone: "amber", text: `${failed} ${failed === 1 ? "payment needs" : "payments need"} another try`, to: "#ah-billing", action: "Open billing" });
  const slow = data.services.filter((s) => s.state !== "up");
  for (const s of slow) out.push({ id: `svc-${s.id}`, icon: "server", tone: "amber", text: `${s.name} is ${s.state === "slow" ? "a little slow" : "down"}`, to: "#ah-system", action: "See status" });
  const flags = data.feed.filter((f) => f.kind === "flag").length;
  if (flags > 0) out.push({ id: "flag", icon: "flag", tone: "blue", text: `${flags} flagged ${flags === 1 ? "question" : "questions"} to review`, to: "#ah-feed", action: "See activity" });
  return out;
}

function NeedsYou({ data }: { data: AdminHomeData }) {
  const items = attentionItems(data);
  const jump = (to: string) => (e: React.MouseEvent) => {
    e.preventDefault();
    document.querySelector(to)?.scrollIntoView({ behavior: reducedMotion() ? "auto" : "smooth", block: "start" });
  };
  return (
    <section className={`ah-need${items.length === 0 ? " is-calm" : ""}`} aria-labelledby="ah-need-h" id="ah-need">
      <h2 id="ah-need-h" className="ah-need__title">
        {items.length === 0 ? "All calm. Nothing needs you." : `${items.length} ${items.length === 1 ? "thing needs" : "things need"} you`}
      </h2>
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
  const [notice, setNotice] = useState<string>("");
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
      setNotice("");
    } else {
      setLive(null);
      setNotice(
        res.reason === "signed-out"
          ? "Sign in as an admin to see live figures. Showing sample data."
          : res.reason === "no-supabase"
            ? "This build has no Supabase connection. Showing sample data."
            : res.reason === "blocked"
              ? "The server did not let this account read the figures. Showing sample data."
              : "Live figures did not load. Showing sample data.",
      );
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
      <SideNav data={data} />
      <main className="ah-main" id="ah-main">
        <header className="ah-hello">
          <div>
            <h1 className="ah-hello__title">{greeting()}, Andrew</h1>
            <p className="ah-muted" id="ah-today">
              {data.today.learningNow.toLocaleString("en-US")} learning right now, {data.today.activeToday.toLocaleString("en-US")} active today. Showing {days === 1 ? periodLabel(period, now).toLowerCase() : `${days} days`}.
            </p>
          </div>
          {data.source === "sample" ? (
            <span className="ah-chip" role="note">
              Sample data, not live
            </span>
          ) : (
            <span className="ah-chip is-live" role="note">
              Live where marked, the rest is sample. {data.asOf}
            </span>
          )}
        </header>
        {notice ? (
          <p className="ah-note" role="status">
            {notice}
          </p>
        ) : null}

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

        <Hero data={data} days={days} />

        <ul className="ah-strip" aria-label="The numbers that matter">
          {data.stats.filter((s) => s.id !== "revenue").map((s) => (
            <StatCellView key={s.id} cell={s} live={data.liveParts.includes(`stat:${s.id}`)} sampleOnly={data.source === "sample"} />
          ))}
        </ul>

        <NeedsYou data={data} />

        <div className="ah-cols">
          <GrowthChart data={data} />
          <SideColumn data={data} />
        </div>

        <div className="ah-cols ah-cols--even">
          <Funnel data={data} />
          <Feed data={data} />
        </div>

        <Suspense fallback={<p className="ah-muted">Loading the task board...</p>}>
          <TaskBoard embedded />
        </Suspense>

        <div className="ah-cols ah-cols--even">
          <System data={data} />
          <Billing data={data} />
        </div>
      </main>
    </div>
  );
}
