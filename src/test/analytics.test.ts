// @vitest-environment jsdom

/**
 * First-party analytics (owner, 24 Oct): src/lib/analytics.ts. The privacy cases come
 * first, because they are the ones that must never regress: without consent, or under
 * Do Not Track, nothing is stored and nothing is sent.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

type Analytics = typeof import("@/lib/analytics");

const URL = "https://kwoqzfvssoxxuvlzzhrp.supabase.co";
const fetchMock = vi.fn();
let dnt: string | null = null;
let uninstalls: (() => void)[] = [];

/** A fresh module, so each test starts with an empty queue; installAnalytics is wrapped so afterEach can undo it. */
async function load(): Promise<Analytics> {
  vi.resetModules();
  const mod = await import("@/lib/analytics");
  return {
    ...mod,
    installAnalytics: () => {
      const off = mod.installAnalytics();
      uninstalls.push(off);
      return off;
    },
  };
}

/** Every row posted so far, across all requests. */
const posted = (): Record<string, unknown>[] =>
  fetchMock.mock.calls.flatMap(([, init]) => JSON.parse((init as RequestInit).body as string));

beforeEach(() => {
  vi.stubEnv("VITE_SUPABASE_URL", URL);
  vi.stubEnv("VITE_SUPABASE_PUBLISHABLE_KEY", "sb_publishable_test");
  localStorage.clear();
  sessionStorage.clear();
  fetchMock.mockReset();
  fetchMock.mockResolvedValue({ ok: true, status: 201 });
  vi.stubGlobal("fetch", fetchMock);
  dnt = null;
  Object.defineProperty(navigator, "doNotTrack", { configurable: true, get: () => dnt });
  history.replaceState(null, "", "/");
  vi.useFakeTimers();
});

afterEach(() => {
  for (const off of uninstalls) off();
  uninstalls = [];
  vi.useRealTimers();
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

describe("consent gating", () => {
  it("stores and sends nothing before the visitor says yes", async () => {
    const a = await load();
    a.installAnalytics();
    a.track("click", { target: "x" });
    await vi.advanceTimersByTimeAsync(20000);
    expect(fetchMock).not.toHaveBeenCalled();
    expect(localStorage.getItem("blueberry.anonId")).toBeNull();
    expect(localStorage.getItem("blueberry.firstTouch")).toBeNull();
    expect(JSON.parse(localStorage.getItem("blueberry.analytics.queue") ?? "[]")).toEqual([]);
  });

  it("sends nothing after a no", async () => {
    const a = await load();
    a.setAnalyticsConsent("declined");
    a.track("click", { target: "x" });
    await vi.advanceTimersByTimeAsync(20000);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("a no after a yes forgets the queue, the anonymous id and the first visit", async () => {
    const a = await load();
    a.installAnalytics();
    a.setAnalyticsConsent("granted");
    a.track("click", { target: "x" });
    expect(localStorage.getItem("blueberry.anonId")).not.toBeNull();
    a.setAnalyticsConsent("declined");
    for (const key of ["blueberry.anonId", "blueberry.firstTouch", "blueberry.analytics.queue"]) {
      expect(localStorage.getItem(key)).toBeNull();
    }
    await vi.advanceTimersByTimeAsync(20000);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("uses the same versioned answer shape as the ad consent, under its own key", async () => {
    const a = await load();
    a.setAnalyticsConsent("granted");
    expect(JSON.parse(localStorage.getItem("blueberry.analyticsConsent")!)).toMatchObject({ v: 1, choice: "granted" });
    expect(localStorage.getItem("blueberry.adConsent")).toBeNull();
  });

  it("is off when the build has no Supabase settings", async () => {
    vi.stubEnv("VITE_SUPABASE_URL", "");
    const a = await load();
    a.setAnalyticsConsent("granted");
    expect(a.analyticsAllowed()).toBe(false);
  });
});

describe("Do Not Track", () => {
  it("wins over a yes", async () => {
    dnt = "1";
    const a = await load();
    a.setAnalyticsConsent("granted");
    expect(a.analyticsAllowed()).toBe(false);
    a.track("click", { target: "x" });
    await vi.advanceTimersByTimeAsync(20000);
    expect(fetchMock).not.toHaveBeenCalled();
    expect(localStorage.getItem("blueberry.anonId")).toBeNull();
  });
});

describe("batching", () => {
  it("waits 10 seconds, then posts one batch to PostgREST with the public key", async () => {
    const a = await load();
    a.setAnalyticsConsent("granted");
    a.track("click", { target: "a" });
    a.track("click", { target: "b" });
    expect(fetchMock).not.toHaveBeenCalled();
    await vi.advanceTimersByTimeAsync(10000);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe(`${URL}/rest/v1/analytics_events`);
    expect(init.keepalive).toBe(true);
    const headers = init.headers as Record<string, string>;
    expect(headers.apikey).toBe("sb_publishable_test");
    expect(headers.Prefer).toBe("return=minimal");
    expect(headers.Authorization).toBeUndefined();
    const rows = posted();
    expect(rows.map((r) => (r.props as { target: string }).target)).toEqual(["a", "b"]);
    // One device, one session, the same keys on every row (PostgREST takes the first row's keys).
    expect(new Set(rows.map((r) => r.anon_id)).size).toBe(1);
    expect(new Set(rows.map((r) => r.session_id)).size).toBe(1);
    expect(Object.keys(rows[0]).sort()).toEqual(Object.keys(rows[1]).sort());
    expect(rows[0]).not.toHaveProperty("user_id");
    expect(JSON.parse(localStorage.getItem("blueberry.analytics.queue")!)).toEqual([]);
  });

  it("flushes at 20 events without waiting, and never more than 50 per request", async () => {
    const a = await load();
    a.setAnalyticsConsent("granted");
    for (let i = 0; i < 19; i++) a.track("click", { target: `t${i}` });
    await vi.advanceTimersByTimeAsync(0);
    expect(fetchMock).not.toHaveBeenCalled();
    a.track("click", { target: "t19" });
    await vi.advanceTimersByTimeAsync(0);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(posted()).toHaveLength(20);
    // Offline for 80 events, then back: the backlog leaves in requests of at most 50.
    fetchMock.mockReset();
    fetchMock.mockRejectedValue(new TypeError("offline"));
    for (let i = 0; i < 80; i++) a.track("click", { target: `u${i}` });
    await vi.advanceTimersByTimeAsync(0);
    fetchMock.mockReset();
    fetchMock.mockResolvedValue({ ok: true, status: 201 });
    await a.flush();
    await vi.advanceTimersByTimeAsync(2000);
    const sizes = fetchMock.mock.calls.map(([, init]) => JSON.parse((init as RequestInit).body as string).length);
    expect(sizes).toEqual([50, 30]);
  });

  it("keeps a batch the server failed on, and drops one it refused", async () => {
    const a = await load();
    a.setAnalyticsConsent("granted");
    fetchMock.mockResolvedValueOnce({ ok: false, status: 503 });
    a.track("click", { target: "kept" });
    await a.flush();
    expect(JSON.parse(localStorage.getItem("blueberry.analytics.queue")!)).toHaveLength(1);
    fetchMock.mockResolvedValueOnce({ ok: false, status: 400 });
    await a.flush();
    expect(JSON.parse(localStorage.getItem("blueberry.analytics.queue")!)).toEqual([]);
  });

  it("keeps a batch through a network error and sends it on the next page load", async () => {
    const a = await load();
    a.setAnalyticsConsent("granted");
    fetchMock.mockRejectedValueOnce(new TypeError("offline"));
    a.track("click", { target: "survives" });
    await a.flush();
    expect(JSON.parse(localStorage.getItem("blueberry.analytics.queue")!)).toHaveLength(1);
    fetchMock.mockReset();
    fetchMock.mockResolvedValue({ ok: true, status: 201 });
    const b = await load();
    b.installAnalytics();
    await vi.advanceTimersByTimeAsync(0);
    expect(posted().some((r) => (r.props as { target?: string }).target === "survives")).toBe(true);
  });

  it("sends the signed-in token when supabase-js has a fresh one, and not an expired one", async () => {
    const a = await load();
    a.setAnalyticsConsent("granted");
    const key = "sb-kwoqzfvssoxxuvlzzhrp-auth-token";
    localStorage.setItem(key, JSON.stringify({ access_token: "jwt-fresh", expires_at: Date.now() / 1000 + 3600 }));
    a.track("click", { target: "a" });
    await a.flush();
    expect((fetchMock.mock.calls[0][1] as RequestInit).headers).toMatchObject({ Authorization: "Bearer jwt-fresh" });
    localStorage.setItem(key, JSON.stringify({ access_token: "jwt-old", expires_at: Date.now() / 1000 - 10 }));
    a.track("click", { target: "b" });
    await a.flush();
    expect(((fetchMock.mock.calls[1][1] as RequestInit).headers as Record<string, string>).Authorization).toBeUndefined();
  });
});

describe("first-visit UTM and referrer", () => {
  it("captures utm_* from the hash's query on the first visit and keeps them", async () => {
    history.replaceState(null, "", "/#/?utm_source=instagram&utm_medium=story&utm_campaign=fall");
    Object.defineProperty(document, "referrer", { configurable: true, get: () => "https://www.instagram.com/p/abc?x=1" });
    const a = await load();
    a.setAnalyticsConsent("granted");
    a.installAnalytics();
    // A later visit with no UTM still carries the first one.
    history.replaceState(null, "", "/#/learn");
    const b = await load();
    b.installAnalytics();
    await b.flush();
    const rows = posted();
    expect(rows.length).toBeGreaterThanOrEqual(2);
    for (const row of rows) {
      expect(row).toMatchObject({
        utm_source: "instagram",
        utm_medium: "story",
        utm_campaign: "fall",
        referrer: "https://www.instagram.com/p/abc",
      });
    }
    expect(rows.at(-1)!.path).toBe("#/learn");
  });

  it("reads utm_* from the real query string too, and ignores a same-site referrer", async () => {
    history.replaceState(null, "", "/?utm_source=Google#/");
    Object.defineProperty(document, "referrer", { configurable: true, get: () => `${location.origin}/#/learn` });
    const a = await load();
    expect(a.readLanding()).toMatchObject({ utm_source: "Google", referrer: null });
  });
});

describe("the delegated click listener", () => {
  it("records a click inside a data-track element, marked as a CTA when data-cta is set", async () => {
    document.body.innerHTML = `
      <a href="#/x" data-track="hero.start" data-cta><span id="inner">Start</span></a>
      <button id="plain">Plain</button>
      <button id="named" data-cta aria-label="Book a tutor"></button>
      <button id="quiet" data-track="paywall.not_now">Not now</button>`;
    const a = await load();
    a.setAnalyticsConsent("granted");
    a.installAnalytics();
    for (const id of ["inner", "plain", "named", "quiet"]) document.getElementById(id)!.click();
    await a.flush();
    const clicks = posted().filter((r) => r.name === "click").map((r) => r.props);
    expect(clicks).toEqual([
      { target: "hero.start", cta: true },
      { target: "Book a tutor", cta: true },
      { target: "paywall.not_now" },
    ]);
  });

  it("still hears a click whose handler stops propagation", async () => {
    document.body.innerHTML = `<button id="b" data-track="x.y">Go</button>`;
    document.getElementById("b")!.addEventListener("click", (e) => e.stopPropagation());
    const a = await load();
    a.setAnalyticsConsent("granted");
    a.installAnalytics();
    document.getElementById("b")!.click();
    await a.flush();
    expect(posted().some((r) => r.name === "click")).toBe(true);
  });

  it("sends screen views and the visible time of the screen that was left", async () => {
    history.replaceState(null, "", "/#/learn?deck=1");
    const a = await load();
    a.setAnalyticsConsent("granted");
    a.installAnalytics();
    vi.advanceTimersByTime(4000);
    history.replaceState(null, "", "/#/app");
    window.dispatchEvent(new HashChangeEvent("hashchange"));
    await a.flush();
    const rows = posted();
    expect(rows.filter((r) => r.name === "screen_view").map((r) => r.path)).toEqual(["#/learn", "#/app"]);
    const time = rows.find((r) => r.name === "screen_time")!;
    expect(time.path).toBe("#/learn");
    expect((time.props as { ms: number }).ms).toBeGreaterThanOrEqual(4000);
  });

  it("trackChoice records question, option and correctness", async () => {
    const a = await load();
    a.setAnalyticsConsent("granted");
    a.trackChoice("mcq.u1-q3", "b", false);
    a.trackChoice("plan", "pro_monthly");
    await a.flush();
    expect(posted().map((r) => r.props)).toEqual([
      { question: "mcq.u1-q3", option: "b", correct: false },
      { question: "plan", option: "pro_monthly" },
    ]);
  });
});
