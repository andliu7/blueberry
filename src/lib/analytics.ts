import { consentStore } from "@/lib/ads/consent";
import { supabaseStorageKeyPrefix } from "@/lib/supabase";

/**
 * First-party analytics (owner, 24 Oct): which buttons get clicked, which options people
 * pick, how long each screen holds attention, and where visitors came from (for CAC).
 * Read by the blueberry-analytics skill from the views in
 * supabase/migrations/20261024140000_analytics.sql.
 *
 * Small on purpose: no SDK and no supabase-js (it is lazy-loaded, and analytics must not
 * pull it into the first open). Events wait in memory, with a localStorage copy so a closed
 * tab does not lose them, and go to PostgREST in batches with fetch keepalive. Not
 * sendBeacon: a beacon cannot carry the apikey header PostgREST needs, and keepalive is
 * the same "survives the page closing" promise with headers.
 *
 * Nothing is sent, and nothing is stored, unless all of these hold:
 *   - the build has Supabase settings;
 *   - the browser does not send Do Not Track;
 *   - the visitor said yes to "share usage stats" (the same consent store as ads).
 * The Terms page today says nothing is sent from the browser, so analytics is OFF until
 * someone opts in. ON_BY_DEFAULT may become true only after the privacy text says that
 * anonymous usage stats are collected; see documentation/STATUS.md.
 */

const ON_BY_DEFAULT = false;

const URL = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string | undefined;
const QUEUE_KEY = "blueberry.analytics.queue";
const ANON_KEY = "blueberry.anonId";
const TOUCH_KEY = "blueberry.firstTouch";
const BATCH = 50;
const MAX_QUEUED = 200;
const DAY_MS = 864e5;

const consent = consentStore("blueberry.analyticsConsent", "blueberry:analytics-consent");
export const readAnalyticsConsent = consent.read;
export const setAnalyticsConsent = consent.set;

type Row = Record<string, unknown>;
let queue: Row[] = [];
let timer: ReturnType<typeof setTimeout> | undefined;
let session = "";
/** UTM and referrer of the page load, read at install (or the first event), held in memory until the visitor consents. */
let landing: Row | undefined;

/** localStorage, or null when the browser blocks it (private mode, blocked site data). */
const ls = <T>(use: (s: Storage) => T): T | null => {
  try {
    return use(localStorage);
  } catch {
    return null;
  }
};
const get = (k: string) => ls((s) => s.getItem(k));
const put = (k: string, v: string) => ls((s) => s.setItem(k, v));

export function analyticsAllowed(): boolean {
  if (!URL || !KEY || navigator.doNotTrack === "1") return false;
  const answer = consent.read();
  return answer === "granted" || (answer === null && ON_BY_DEFAULT);
}

/** utm_* from the query string, or from the hash's own query (`#/?utm_source=x`), plus an outside referrer. */
export function readLanding(): Row {
  const q = new URLSearchParams(location.search);
  new URLSearchParams(location.hash.split("?")[1]).forEach((v, k) => q.set(k, v));
  const row: Row = { referrer: null };
  for (const k of ["utm_source", "utm_medium", "utm_campaign"]) row[k] = q.get(k)?.slice(0, 100) || null;
  try {
    const r = new globalThis.URL(document.referrer);
    if (r.host !== location.host) row.referrer = (r.origin + r.pathname).slice(0, 300);
  } catch {
    /* no referrer */
  }
  return row;
}

/** The signed-in user's token from supabase-js's own storage, if still fresh; the server reads user_id from it. */
function token(): string | null {
  try {
    const saved = JSON.parse(get(supabaseStorageKeyPrefix() ?? "") ?? "null");
    return saved?.expires_at * 1000 > Date.now() + 30000 ? saved.access_token : null;
  } catch {
    return null;
  }
}

const here = () => (location.hash.split("?")[0] || "#/").slice(0, 200);

/** Record one event. Dropped at once when analytics is not allowed. */
export function track(name: string, props: Row = {}, path = here()): void {
  if (!analyticsAllowed()) return;
  let anon = get(ANON_KEY);
  if (!anon) put(ANON_KEY, (anon = crypto.randomUUID()));
  // The first visit's UTM and referrer, saved once and sent with every event after.
  landing ??= readLanding();
  if (!get(TOUCH_KEY)) put(TOUCH_KEY, JSON.stringify(landing));
  let touch = landing;
  try {
    touch = JSON.parse(get(TOUCH_KEY)!) || landing;
  } catch {
    /* unreadable: this visit's instead */
  }
  const w = innerWidth;
  // Every row has the same keys: PostgREST reads the columns of a batch from its first row.
  queue.push({
    ...touch,
    occurred_at: new Date().toISOString(),
    anon_id: anon,
    session_id: (session ||= crypto.randomUUID()),
    name,
    props,
    path,
    device: w < 640 ? "phone" : w < 1100 ? "tablet" : "desktop",
    tz: Intl.DateTimeFormat().resolvedOptions().timeZone,
  });
  queue = queue.slice(-MAX_QUEUED);
  save();
  if (queue.length >= 20) void flush();
  else timer ??= setTimeout(flush, 10000);
}

/** One answer to one question: an onboarding choice, a plan, an answer option in a lesson. */
export const trackChoice = (question: string, option: string, correct?: boolean) =>
  track("choice", correct === undefined ? { question, option } : { question, option, correct });

const save = () => put(QUEUE_KEY, JSON.stringify(queue));

/** Send up to one batch. Kept on a network failure, dropped when the server refuses it (a retry would fail the same way). */
export function flush(): Promise<void> {
  // One request at a time: two overlapping sends would post the same rows twice.
  return (sending = sending.then(send));
}
let sending = Promise.resolve();

async function send(): Promise<void> {
  clearTimeout(timer);
  timer = undefined;
  const batch = queue.slice(0, BATCH);
  if (!batch.length || !analyticsAllowed()) return;
  const bearer = token();
  try {
    const res = await fetch(`${URL}/rest/v1/analytics_events`, {
      method: "POST",
      keepalive: true,
      headers: {
        apikey: KEY!,
        "Content-Type": "application/json",
        Prefer: "return=minimal",
        ...(bearer ? { Authorization: `Bearer ${bearer}` } : {}),
      },
      body: JSON.stringify(batch),
    });
    if (res.status >= 500) return;
  } catch {
    return;
  }
  queue = queue.filter((row) => !batch.includes(row));
  save();
  if (queue.length) timer = setTimeout(flush, 1000);
}

/** The tracked name of a click: data-track, or for a bare data-cta its accessible name. */
export function clickTarget(el: Element): Row | null {
  const hit = el.closest("[data-track],[data-cta]");
  if (!hit) return null;
  const name = hit.getAttribute("data-track") || hit.getAttribute("aria-label") || hit.textContent?.trim() || "";
  return name ? { target: name.slice(0, 80), ...(hit.hasAttribute("data-cta") ? { cta: true } : {}) } : null;
}

let shownAt = 0;
let shownPath = "";

/** Close the current screen's visible stretch: one screen_time if it lasted a second (capped at 30 minutes of idle tab). */
function leave() {
  const ms = Math.min(Date.now() - shownAt, 18e5);
  if (shownAt && ms >= 1000) track("screen_time", { ms }, shownPath);
  shownAt = 0;
}

function show() {
  shownPath = here();
  shownAt = Date.now();
}

/**
 * Wire everything once, from main.tsx: one delegated click listener for the whole site
 * (the same shape as lib/clickSound), screen views on hash changes, visible time per
 * screen, and a flush when the tab is hidden or closed. Returns the uninstall (for tests).
 */
export function installAnalytics(): () => void {
  const ctl = new AbortController();
  const { signal } = ctl;
  landing ??= readLanding();
  try {
    const saved = JSON.parse(get(QUEUE_KEY) ?? "[]") as Row[];
    queue = saved.filter((r) => Date.now() - Date.parse(String(r.occurred_at)) < DAY_MS).slice(-MAX_QUEUED);
  } catch {
    queue = [];
  }
  // Capture phase, so a handler that stops propagation cannot hide its click.
  document.addEventListener(
    "click",
    (e) => {
      const t = e.target instanceof Element && clickTarget(e.target);
      if (t) track("click", t);
    },
    { capture: true, signal },
  );
  addEventListener("hashchange", () => {
    // Only the query changed (#/learn?deck=1 to ?deck=2): still the same screen.
    if (here() === shownPath) return;
    leave();
    show();
    track("screen_view");
  }, { signal });
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "hidden") {
      leave();
      void flush();
    } else show();
  }, { signal });
  addEventListener("pagehide", () => void flush(), { signal });
  // A "no" (here or in another tab) forgets what this device kept for analytics.
  const off = consent.on(() => {
    if (analyticsAllowed()) return;
    queue = [];
    for (const k of [QUEUE_KEY, ANON_KEY, TOUCH_KEY]) ls((s) => s.removeItem(k));
  });
  show();
  track("screen_view");
  if (queue.length) void flush();
  return () => {
    ctl.abort();
    off();
  };
}
