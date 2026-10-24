// @vitest-environment jsdom
/**
 * The #/app gate in a real render (owner, 23 Oct, G1). The seam is the auth
 * context: useAuth is mocked with a mutable value, the same pattern as
 * src/game/test/meProfileName.test.ts, and GamePage is a stub, so no game and
 * no Supabase load.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, createElement } from "react";
import { createRoot, type Root } from "react-dom/client";
import type { AuthState } from "@/lib/AuthContext";

const m = vi.hoisted(() => ({
  auth: { current: null as unknown as AuthState },
  configured: { value: true },
  gameImported: { value: false },
}));

vi.mock("@/lib/AuthContext", () => ({ useAuth: () => m.auth.current }));
vi.mock("@/lib/supabase", () => ({
  get supabaseConfigured() {
    return m.configured.value;
  },
}));

// Imported fresh per test (beforeEach), so "was the game chunk fetched" is
// measured per case rather than left over from an earlier one.
let AppGate: typeof import("@/components/AppGate").AppGate;

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

window.matchMedia = ((query: string) => ({
  matches: false,
  media: query,
  onchange: null,
  addListener: () => {},
  removeListener: () => {},
  addEventListener: () => {},
  removeEventListener: () => {},
  dispatchEvent: () => false,
})) as unknown as typeof window.matchMedia;

const KEY = "blueberry.returnTo";
let root: Root | null = null;
let host: HTMLElement | null = null;
let replace: ReturnType<typeof vi.fn>;

function authAs(signedIn: boolean, loading = false): AuthState {
  return {
    session: null,
    user: (signedIn ? { id: "u1" } : null) as AuthState["user"],
    role: "member",
    loading,
    profileName: null,
    profileLoaded: signedIn,
    refreshRole: vi.fn(),
  };
}

beforeEach(async () => {
  vi.resetModules();
  m.gameImported.value = false;
  // doMock after the reset, so the factory runs again on this test's first import.
  vi.doMock("@/components/GamePage", () => {
    m.gameImported.value = true;
    return { default: () => createElement("main", { id: "game" }, "game") };
  });
  ({ AppGate } = await import("@/components/AppGate"));
  m.configured.value = true;
  replace = vi.fn();
  // jsdom's location is not writable property by property; swap the object.
  vi.stubGlobal("location", { ...window.location, hash: "#/app/lesson/x", replace });
});

afterEach(() => {
  act(() => root?.unmount());
  host?.remove();
  root = null;
  host = null;
  sessionStorage.clear();
  vi.unstubAllGlobals();
});

async function mount() {
  host = document.createElement("div");
  document.body.appendChild(host);
  root = createRoot(host);
  await act(async () => root!.render(createElement(AppGate)));
  // Let the lazy stub resolve.
  await act(async () => new Promise<void>((r) => setTimeout(r, 30)));
}

const game = () => document.getElementById("game");

describe("AppGate", () => {
  it("(a) signed out: remembers where they were headed and replaces the hash with #/signin, once", async () => {
    m.auth.current = authAs(false);
    await mount();
    expect(replace).toHaveBeenCalledTimes(1);
    expect(replace).toHaveBeenCalledWith("#/signin");
    expect(sessionStorage.getItem(KEY)).toBe("#/app/lesson/x");
    expect(game()).toBeNull();
    // A signed-out visitor never downloads the game.
    expect(m.gameImported.value).toBe(false);
  });

  it("(b) signed in: renders the game and never navigates", async () => {
    m.auth.current = authAs(true);
    await mount();
    expect(game()).not.toBeNull();
    expect(replace).not.toHaveBeenCalled();
  });

  it("(c) restoring: no game, no navigation, and the game chunk is already on its way", async () => {
    m.auth.current = authAs(false, true);
    await mount();
    expect(game()).toBeNull();
    expect(replace).not.toHaveBeenCalled();
    expect(sessionStorage.getItem(KEY)).toBeNull();
    expect(m.gameImported.value).toBe(true);
  });

  it("(d) a build without Supabase lets everyone in", async () => {
    m.configured.value = false;
    m.auth.current = authAs(false);
    await mount();
    expect(game()).not.toBeNull();
    expect(replace).not.toHaveBeenCalled();
  });

  it("(e) re-rendered on #/signin: #/signin is never remembered as a return target", async () => {
    m.auth.current = authAs(false);
    await mount();
    window.location.hash = "#/signin";
    m.auth.current = authAs(false);
    await act(async () => root!.render(createElement(AppGate)));
    expect(replace).toHaveBeenCalledTimes(1);
    expect(sessionStorage.getItem(KEY)).toBe("#/app/lesson/x");
  });

  it("(e) a session arriving after the redirect renders the game without another navigation", async () => {
    m.auth.current = authAs(false, true);
    await mount();
    m.auth.current = authAs(true);
    await act(async () => root!.render(createElement(AppGate)));
    await act(async () => new Promise<void>((r) => setTimeout(r, 30)));
    expect(game()).not.toBeNull();
    expect(replace).not.toHaveBeenCalled();
  });
});
