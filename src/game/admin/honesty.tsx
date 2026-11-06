/**
 * One honesty vocabulary for every admin board.
 *
 * The rule (owner, 29 Oct): an admin number is either real, and its source is one tap
 * away, or it is not shown as a number at all. Nothing guessed ever wears the look of
 * a real figure.
 *
 * The empty state (3 Nov, after the Stripe comparison): a page with nothing read says
 * so ONCE, in a banner at the top that names the cause and carries one action. Under
 * it the tiles keep their real size and show a quiet dash in the figure's own style,
 * like Stripe's zeros. No per-tile pill, no table names in the body: where a figure
 * comes from lives behind a small info mark, read on hover or focus.
 */
import type { ReactNode } from "react";
import { hrefForSettingsFromAdmin } from "../app/routes";

export const EXAMPLE_LABEL = "No data, example";

/** The quiet stand-in for a figure that was not read. A dash, in the figure's own type. */
export const DASH = String.fromCharCode(0x2014);

export function EmptyValue({ className = "" }: { className?: string }) {
  return (
    <span className={`ah-nil ${className}`.trim()} aria-label="No data">
      {DASH}
    </span>
  );
}

/** The small dashed pill that marks a tile as an example. Kept for boards outside the admin home. */
export function ExampleBadge({ className = "" }: { className?: string }) {
  return (
    <span className={`ah-tag is-example ${className}`.trim()} data-testid="example-badge">
      {EXAMPLE_LABEL}
    </span>
  );
}

/** The small green pill that marks a tile as read from the database. */
export function LiveBadge({ className = "" }: { className?: string }) {
  return <span className={`ah-tag is-live ${className}`.trim()}>Live</span>;
}

/** The words behind the info mark: where a figure comes from, or why there is none yet. */
export function sourceText(live: boolean, source: string, why?: string): string {
  return live ? `Source: ${source}.` : `${EXAMPLE_LABEL}. ${why ? `${why} ` : ""}Feeds from ${source} once connected.`;
}

/**
 * Where a tile's figure comes from, as a small info mark beside its title. Hover or
 * focus shows the note; screen readers get it as the button's name. `align="end"`
 * opens the note leftwards for marks at a card's right edge.
 */
export function SourceNote({ live, source, why, align = "start", text: own }: { live: boolean; source: string; why?: string; align?: "start" | "end"; /** Words of the page's own, in place of the stock note. */ text?: string }) {
  const text = own ?? sourceText(live, source, why);
  return (
    <span className={`ah-info${align === "end" ? " is-end" : ""}`} data-testid={live ? "source-note" : "example-note"}>
      <button type="button" className="ah-info__mark" aria-label={text}>
        <svg viewBox="0 0 16 16" width="14" height="14" aria-hidden focusable="false">
          <circle cx="8" cy="8" r="6.25" fill="none" stroke="currentColor" strokeWidth="1.5" />
          <path d="M8 7.25v3.75M8 5h.01" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
        </svg>
      </button>
      <span className="ah-info__tip" role="tooltip" aria-hidden>
        {text}
      </span>
    </span>
  );
}

/** Wrap content that is example-only so assistive tech and the eye both read it as such. */
export function ExampleWash({ children }: { children: ReactNode }) {
  return (
    <div className="ah-wash" role="group" aria-label={`${EXAMPLE_LABEL}, not real figures`}>
      {children}
    </div>
  );
}

/* ------------------------------------------------------------------ the one empty-state banner */

export type FailReason = "no-supabase" | "signed-out" | "blocked" | "error";

/**
 * Why a page has nothing live, in the owner's words, with the one action that moves it
 * on. "signed-out" only happens on the local preview, which skips the gate: the action
 * opens the app's account page (sign-in lives there, never inside the dashboard), and
 * that page's back key returns here.
 */
export const EMPTY_COPY: Record<FailReason | "checking", { title: string; body: string; action?: "account" | "retry"; label?: string }> = {
  checking: { title: "Reading the figures", body: "Checking your admin session. Figures fill in here as soon as it is found." },
  "signed-out": {
    title: "No admin session, so no figures yet",
    body: "This preview opened without an account. Every figure is read from the database with a staff account, so the tiles below stay empty until you are in.",
    action: "account",
    label: "Open your account",
  },
  blocked: {
    title: "This account cannot read the figures",
    body: "The server refused the read. Check the account is staff, or apply the staff read migration, then try again.",
    action: "retry",
    label: "Try again",
  },
  error: { title: "The figures did not load", body: "The read failed. The tiles below stay empty until it succeeds.", action: "retry", label: "Try again" },
  "no-supabase": { title: "No database in this build", body: "This build has no Supabase connection, so no figure here can be read." },
};

/** The one place a page says why nothing is live. Everything under it stays quiet. */
export function EmptyBanner({ reason, onRetry }: { reason: FailReason | "ok" | null | undefined; onRetry?: () => void }) {
  const key: FailReason | "checking" = reason == null || reason === "ok" ? "checking" : reason;
  const c = EMPTY_COPY[key];
  return (
    <section className={`ah-connect${key === "checking" ? " is-checking" : ""}`} aria-labelledby="ah-connect-h" data-testid="connect-banner" aria-live="polite">
      <span className="ah-connect__icon" aria-hidden>
        <svg viewBox="0 0 24 24" width="20" height="20" focusable="false">
          <path d="M4 19V9M10 19V5M16 19v-7M21 19H3" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        </svg>
      </span>
      <div className="ah-connect__text">
        <h2 id="ah-connect-h" className="ah-connect__title">
          {c.title}
        </h2>
        <p className="ah-connect__body">{c.body}</p>
      </div>
      {c.action === "account" ? (
        <a className="ah-connect__act" href={hrefForSettingsFromAdmin()}>
          {c.label}
        </a>
      ) : c.action === "retry" && onRetry ? (
        <button type="button" className="ah-connect__act" onClick={onRetry}>
          {c.label}
        </button>
      ) : null}
    </section>
  );
}

/* ------------------------------------------------------------------ the empty layout (3 Nov, round 4) */

/** The thin banner's words: one line, the longer reason stays in EMPTY_COPY for the hover. */
const NOTICE_COPY: Partial<Record<FailReason | "checking", string>> = {
  checking: "Reading the figures. They fill in as soon as your admin session is found.",
  "signed-out": "No admin session, so every figure below is a dash. Figures are read with a staff account.",
};

/**
 * The one line a page with nothing read carries above its layout, like Stripe's
 * "Get started" block shrunk to a strip: why, in one sentence, and the one action.
 */
export function EmptyNotice({ reason, onRetry }: { reason: FailReason | "ok" | null | undefined; onRetry?: () => void }) {
  const key: FailReason | "checking" = reason == null || reason === "ok" ? "checking" : reason;
  const c = EMPTY_COPY[key];
  const line = NOTICE_COPY[key] ?? `${c.title}. ${c.body}`;
  return (
    <section className={`ah-notice${key === "checking" ? " is-checking" : ""}`} aria-label={c.title} data-testid="connect-banner" aria-live="polite">
      <svg className="ah-notice__icon" viewBox="0 0 24 24" width="16" height="16" aria-hidden focusable="false">
        <circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" strokeWidth="2" />
        <path d="M12 11v5M12 8h.01" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      </svg>
      <p className="ah-notice__text" title={c.body}>
        {line}
      </p>
      {c.action === "account" ? (
        <a className="ah-notice__act" href={hrefForSettingsFromAdmin()}>
          {c.label}
        </a>
      ) : c.action === "retry" && onRetry ? (
        <button type="button" className="ah-notice__act" onClick={onRetry}>
          {c.label}
        </button>
      ) : null}
    </section>
  );
}

/* ------------------------------------------------------------------ the centred sign-in state (3 Nov, Learners round 2) */

/** What a page will show once it can read, one line each, so the empty page still says what it is for. */
export interface PreviewLine {
  id: string;
  label: string;
  detail: string;
}

const SIGN_IN_COPY: Record<FailReason | "checking", { title: string; body: string; action?: "account" | "retry"; label?: string }> = {
  checking: { title: "Reading the figures", body: "Checking your admin session. The page fills in as soon as it is found." },
  "signed-out": {
    title: "Sign in to see your learners",
    body: "Every figure on this page is read from the database with a staff account. This preview opened without one, so there is nothing to show yet.",
    action: "account",
    label: "Sign in with a staff account",
  },
  blocked: { ...EMPTY_COPY.blocked, action: "retry", label: "Try again" },
  error: { ...EMPTY_COPY.error, body: "The read failed. Nothing is shown until it succeeds.", action: "retry", label: "Try again" },
  "no-supabase": EMPTY_COPY["no-supabase"],
};

/**
 * A page with nothing read (blind judges, 3 Nov: "about 30 dashes across seven cards,
 * and the way forward is a small outlined button in a banner"): one centred block in
 * place of the whole grid, like Stripe's empty lists. It names the cause, carries one
 * filled action, and lists what the page shows once it can read. No figure, no dash.
 */
export function SignInState({ reason, onRetry, title, preview }: { reason: FailReason | "ok" | null | undefined; onRetry?: () => void; title?: string; preview: readonly PreviewLine[] }) {
  const key: FailReason | "checking" = reason == null || reason === "ok" ? "checking" : reason;
  const c = SIGN_IN_COPY[key];
  const heading = key === "signed-out" && title ? title : c.title;
  return (
    <section className={`ah-signin${key === "checking" ? " is-checking" : ""}`} aria-labelledby="ah-signin-h" aria-busy={key === "checking"} data-testid="connect-banner" aria-live="polite">
      <span className="ah-signin__icon" aria-hidden>
        <svg viewBox="0 0 24 24" width="22" height="22" focusable="false">
          <rect x="5" y="10.5" width="14" height="9.5" rx="2" fill="none" stroke="currentColor" strokeWidth="1.8" />
          <path d="M8.5 10.5V8a3.5 3.5 0 0 1 7 0v2.5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
        </svg>
      </span>
      <h2 id="ah-signin-h" className="ah-signin__title">
        {heading}
      </h2>
      <p className="ah-signin__body">{c.body}</p>
      {c.action === "account" ? (
        <a className="ah-primary ah-signin__act" href={hrefForSettingsFromAdmin()}>
          {c.label}
        </a>
      ) : c.action === "retry" && onRetry ? (
        <button type="button" className="ah-primary ah-signin__act" onClick={onRetry}>
          {c.label}
        </button>
      ) : null}
      <div className="ah-signin__preview">
        <p className="ah-signin__lead">Once you are in, this page shows</p>
        <ul className="ah-signin__list">
          {preview.map((p) => (
            <li key={p.id} className="ah-signin__item">
              <span className="ah-signin__label">{p.label}</span>
              <span className="ah-signin__detail">{p.detail}</span>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

/** A headline figure in the empty layout: its real label, a dash, and what it is compared with. */
export interface SkelStat {
  id: string;
  label: string;
  compare: string;
  source: string;
}

/** A table in the empty layout. `rows` names the first column; a number draws that many blank rows. */
export interface SkelTable {
  id: string;
  title: string;
  source: string;
  columns: readonly string[];
  rows: readonly string[] | number;
  /** A part with no data source at all yet: the table says so in its head. */
  off?: boolean;
  foot?: string;
}

export interface SkelChart {
  title: string;
  caption: string;
  source: string;
  from: Date;
  to: Date;
}

const DAY_FMT: Intl.DateTimeFormatOptions = { day: "numeric", month: "short" };

/** The real chart frame with nothing in it: gridlines, the period's dates, one flat line at zero. */
function EmptyChart({ chart }: { chart: SkelChart }) {
  const span = chart.to.getTime() - chart.from.getTime();
  const ticks = [0, 0.25, 0.5, 0.75, 1].map((f) => new Date(chart.from.getTime() + span * f));
  return (
    <section className="ah-sk-card ah-sk-chart" aria-label={`${chart.title}, no data`}>
      <header className="ah-sk-card__head">
        <h2 className="ah-sk-card__title">
          {chart.title}
          <SourceNote live={false} source={chart.source} />
        </h2>
        <span className="ah-sk-card__caption">{chart.caption}</span>
      </header>
      <div className="ah-sk-chart__figure">
        <EmptyValue className="ah-sk-chart__value" />
        <span className="ah-sk-card__caption">vs the period before {DASH}</span>
      </div>
      <svg className="ah-sk-chart__plot" viewBox="0 0 600 140" preserveAspectRatio="none" aria-hidden focusable="false">
        {[0, 1, 2, 3].map((i) => (
          <line key={i} x1="0" x2="600" y1={10 + i * 40} y2={10 + i * 40} className="ah-sk-chart__grid" vectorEffect="non-scaling-stroke" />
        ))}
        <line x1="0" x2="600" y1="130" y2="130" className="ah-sk-chart__zero" vectorEffect="non-scaling-stroke" />
      </svg>
      <div className="ah-sk-chart__axis" aria-hidden>
        {ticks.map((d, i) => (
          <span key={i}>{d.toLocaleDateString("en-GB", DAY_FMT)}</span>
        ))}
      </div>
    </section>
  );
}

function EmptyTable({ table }: { table: SkelTable }) {
  const rows = typeof table.rows === "number" ? Array.from({ length: table.rows }, () => null) : table.rows;
  return (
    <section className={`ah-sk-card${table.off ? " is-off" : ""}`} aria-label={`${table.title}, no data`}>
      <header className="ah-sk-card__head">
        <h2 className="ah-sk-card__title">
          {table.title}
          <SourceNote live={false} source={table.source} align="end" />
        </h2>
        {table.off ? <span className="ah-sk-card__caption">Not connected yet</span> : null}
      </header>
      <table className="ah-sk-table">
        <thead>
          <tr>
            {table.columns.map((c) => (
              <th key={c} scope="col">
                {c}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={r ?? i}>
              {table.columns.map((c, j) =>
                j === 0 && r !== null ? (
                  <th key={c} scope="row">
                    {r}
                  </th>
                ) : r === null ? (
                  <td key={c}>
                    <span className="ah-sk-bar" style={{ width: `${[64, 44, 52][(i + j) % 3]}%` }} aria-hidden />
                  </td>
                ) : (
                  <td key={c}>
                    <EmptyValue />
                  </td>
                ),
              )}
            </tr>
          ))}
        </tbody>
      </table>
      {table.foot ? <p className="ah-sk-card__foot">{table.foot}</p> : null}
    </section>
  );
}

/**
 * A page with nothing read draws its real layout, in its final places (round 4, after
 * the blind judges: "replace the list with the real layout"): the stat row with each
 * label and a dash, the chart frame with the period's dates and a flat line, and the
 * tables with their real rows and columns. Every figure is a dash; nothing is invented.
 */
export function EmptyLayout({ stats, chart, tables }: { stats: readonly SkelStat[]; chart: SkelChart; tables: readonly SkelTable[] }) {
  return (
    <div className="ah-sk" data-testid="empty-layout">
      <ul className="ah-sk-stats" aria-label="The numbers that matter, no data">
        {stats.map((s) => (
          <li key={s.id} className="ah-sk-stat">
            <span className="ah-sk-stat__label">
              {s.label}
              <SourceNote live={false} source={s.source} />
            </span>
            <EmptyValue className="ah-sk-stat__value" />
            <span className="ah-sk-card__caption">{s.compare}</span>
          </li>
        ))}
      </ul>
      <EmptyChart chart={chart} />
      <div className="ah-sk-grid">
        {tables.map((t) => (
          <EmptyTable key={t.id} table={t} />
        ))}
      </div>
    </div>
  );
}

/** Where each admin part comes from, in plain words. One place, so footnotes cannot drift. */
export const SOURCES = {
  signups: "profiles table, created_at, counted per day",
  active: "progress_events table, learners with any lesson event in the period",
  paying: "entitlements table, learners with an active Pro entitlement (needs staff read migration)",
  today: "progress_events (activity in the last 15 minutes) and profiles (sign-ups today)",
  feed: "profiles and progress_events, newest first, no names",
  money: "Stripe, which the app cannot read yet",
  status: "an uptime monitor, which is not connected yet",
  visits: "analytics_events table, distinct anon_id on screen_view",
} as const;
