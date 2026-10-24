// @vitest-environment jsdom

/**
 * Ads (owner, 23 Oct, G4): consent first, Pro removes them, and a build without AdSense ids
 * has none. Every case checks the one thing that matters to a viewer's privacy: whether
 * Google's script was added to the page.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, createElement, type ComponentType } from "react";
import { createRoot, type Root } from "react-dom/client";

const state = vi.hoisted(() => ({
  enabled: true,
  ent: { entitlements: [] as unknown[], pro: false, loading: false },
  auth: { user: null as { id: string } | null, loading: false },
}));

vi.mock("@/lib/ads/adsConfig", () => ({
  // A getter, because the mocked module is built once and each test sets its own flag.
  get adsEnabled() {
    return state.enabled;
  },
  ADSENSE_CLIENT: "ca-pub-1234567890",
  ADSENSE_SLOT: "42",
  PRO_HREF: "#/d/subscriptions",
}));
vi.mock("@/lib/billing", () => ({ useEntitlements: () => state.ent }));
vi.mock("@/lib/AuthContext", () => ({ useAuth: () => state.auth }));

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const KEY = "blueberry.adConsent";
let root: Root | null = null;
let host: HTMLElement | null = null;

const scripts = () => document.querySelectorAll('script[src*="adsbygoogle"]');
const text = () => host?.textContent ?? "";

/** Fresh modules each time, so the script loader's memo and the lazy chunk start clean. */
async function mount(placement: "path" | "feed" | "site" = "feed") {
  vi.resetModules();
  const { AdSlot } = (await import("@/components/ads/AdSlot")) as { AdSlot: ComponentType<{ placement: string }> };
  // Warm the lazy chunk first, so the waits below measure React, not the transform.
  await import("@/components/ads/AdSlotBody");
  host = document.createElement("div");
  document.body.appendChild(host);
  root = createRoot(host);
  await act(async () => {
    root!.render(createElement(AdSlot, { placement }));
  });
  // Let the lazy body resolve and its effects (the one-render settle, the loader) run.
  for (let i = 0; i < 5; i++) {
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 0));
    });
  }
}

beforeEach(() => {
  state.enabled = true;
  state.ent = { entitlements: [], pro: false, loading: false };
  state.auth = { user: null, loading: false };
  localStorage.clear();
});

afterEach(() => {
  act(() => root?.unmount());
  host?.remove();
  root = null;
  host = null;
  scripts().forEach((s) => s.remove());
  vi.restoreAllMocks();
});

const grant = () => localStorage.setItem(KEY, JSON.stringify({ v: 1, choice: "granted", at: "2026-10-23" }));
const decline = () => localStorage.setItem(KEY, JSON.stringify({ v: 1, choice: "declined", at: "2026-10-23" }));

describe("AdSlot", () => {
  it("a build without AdSense ids draws nothing and asks nothing", async () => {
    state.enabled = false;
    grant();
    await mount();
    expect(host!.innerHTML).toBe("");
    expect(scripts()).toHaveLength(0);
  });

  it("a free viewer with no answer sees the consent card and no script", async () => {
    await mount();
    expect(host!.querySelector("button")?.textContent).toBe("Allow ads");
    expect(text()).toContain("No thanks");
    expect(text()).toContain("Remove ads with Pro");
    expect(scripts()).toHaveLength(0);
  });

  it("a free viewer who declined gets one quiet line and no script", async () => {
    decline();
    await mount();
    expect(text()).toContain("Ads are off.");
    expect(host!.querySelector('a[href="#/d/subscriptions"]')?.textContent).toBe("Remove ads with Pro");
    expect(host!.querySelector("ins.adsbygoogle")).toBeNull();
    expect(scripts()).toHaveLength(0);
  });

  it("a Pro account never gets an ad, even having said yes", async () => {
    grant();
    state.auth = { user: { id: "u1" }, loading: false };
    state.ent = { entitlements: [{}], pro: true, loading: false };
    await mount();
    expect(host!.innerHTML).toBe("");
    expect(scripts()).toHaveLength(0);
  });

  it("nothing while entitlements are still loading", async () => {
    grant();
    state.ent = { entitlements: [], pro: false, loading: true };
    await mount();
    expect(host!.innerHTML).toBe("");
    expect(scripts()).toHaveLength(0);
  });

  it("nothing while the session is still restoring", async () => {
    grant();
    state.auth = { user: null, loading: true };
    await mount();
    expect(host!.innerHTML).toBe("");
    expect(scripts()).toHaveLength(0);
  });

  it("a free viewer who said yes gets exactly one script, one ad and the Pro link", async () => {
    grant();
    await mount();
    expect(scripts()).toHaveLength(1);
    expect((scripts()[0] as HTMLScriptElement).src).toContain("client=ca-pub-1234567890");
    expect(host!.querySelectorAll("ins.adsbygoogle")).toHaveLength(1);
    expect(text()).toContain("Remove ads with Pro");
  });

  it("the script appears only after Allow ads is pressed", async () => {
    await mount();
    expect(scripts()).toHaveLength(0);
    const allow = [...host!.querySelectorAll("button")].find((b) => b.textContent === "Allow ads")!;
    await act(async () => {
      allow.click();
    });
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 0));
    });
    expect(scripts()).toHaveLength(1);
    expect(host!.querySelectorAll("ins.adsbygoogle")).toHaveLength(1);
  });

  it("No thanks loads nothing", async () => {
    await mount();
    const no = [...host!.querySelectorAll("button")].find((b) => b.textContent === "No thanks")!;
    await act(async () => {
      no.click();
    });
    expect(text()).toContain("Ads are off.");
    expect(scripts()).toHaveLength(0);
  });

  it("storage that throws counts as no answer: no script", async () => {
    vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
      throw new Error("blocked");
    });
    await mount();
    expect(text()).toContain("Allow ads");
    expect(scripts()).toHaveLength(0);
  });
});

describe("adsEnabledFor", () => {
  it("needs a well-formed publisher id and a slot", async () => {
    const { adsEnabledFor } = await vi.importActual<typeof import("@/lib/ads/adsConfig")>("@/lib/ads/adsConfig");
    expect(adsEnabledFor("", "")).toBe(false);
    expect(adsEnabledFor("", "123")).toBe(false);
    expect(adsEnabledFor("pub-123", "123")).toBe(false);
    expect(adsEnabledFor("ca-pub-12x4", "123")).toBe(false);
    expect(adsEnabledFor("ca-pub-1234567890", "")).toBe(false);
    expect(adsEnabledFor("ca-pub-1234567890", "123")).toBe(true);
  });
});
