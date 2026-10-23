// @vitest-environment jsdom

/**
 * When AuthProvider sends a student back to the game (lib/returnTo.ts). Only a
 * fresh sign-in returns them, and only if they did not give up first: a token
 * refresh an hour later, or a sign-in from the site header after browsing
 * away, stays where it is.
 */

import { afterEach, describe, expect, it, vi } from "vitest";
import { act, createElement } from "react";
import { createRoot, type Root } from "react-dom/client";

const { getSupabase } = vi.hoisted(() => ({ getSupabase: vi.fn() }));
vi.mock("@/lib/supabase", () => ({
  supabaseConfigured: true,
  getSupabase,
  supabaseAuthToRestore: () => true,
  onSupabaseClient: () => () => {},
  supabaseStorageKeyPrefix: () => "sb-example-auth-token",
}));

import { AuthProvider } from "@/lib/AuthContext";
import { rememberReturn } from "@/lib/returnTo";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

type Listener = (event: string, session: unknown) => void;

let root: Root | null = null;
let host: HTMLElement | null = null;

afterEach(() => {
  act(() => root?.unmount());
  host?.remove();
  root = null;
  host = null;
  getSupabase.mockReset();
  sessionStorage.clear();
  window.location.hash = "";
});

const SESSION = { user: { id: "u1" }, access_token: "t" };

/** Mounts AuthProvider signed out, and returns a way to fire auth events at it. */
async function mountSignedOut(): Promise<Listener> {
  let listener: Listener | null = null;
  getSupabase.mockResolvedValue({
    auth: {
      getSession: () => Promise.resolve({ data: { session: null } }),
      onAuthStateChange: (fn: Listener) => {
        listener = fn;
        return { data: { subscription: { unsubscribe: () => {} } } };
      },
    },
    from: () => ({ select: () => ({ eq: () => ({ maybeSingle: () => Promise.resolve({ data: null, error: null }) }) }) }),
  });
  host = document.createElement("div");
  document.body.appendChild(host);
  root = createRoot(host);
  await act(async () => {
    root!.render(createElement(AuthProvider, null));
  });
  await act(async () => {
    await Promise.resolve();
  });
  return (event, session) => act(() => listener!(event, session));
}

/** jsdom fires hashchange asynchronously, so wait for it. */
async function goTo(hash: string): Promise<void> {
  await new Promise<void>((resolve) => {
    window.addEventListener("hashchange", () => resolve(), { once: true });
    window.location.hash = hash;
  });
}

describe("AuthProvider return to the game", () => {
  it("returns on a fresh sign-in", async () => {
    const fire = await mountSignedOut();
    rememberReturn("#/app/me");
    await goTo("#/signin");
    fire("SIGNED_IN", SESSION);
    expect(window.location.hash).toBe("#/app/me");
  });

  it("does not return on a token refresh or a profile update", async () => {
    const fire = await mountSignedOut();
    rememberReturn("#/app/me");
    await goTo("#/signin");
    fire("TOKEN_REFRESHED", SESSION);
    fire("USER_UPDATED", SESSION);
    expect(window.location.hash).toBe("#/signin");
  });

  it("does not return after the student browsed away and signed in later from the site", async () => {
    const fire = await mountSignedOut();
    rememberReturn("#/app/me");
    await goTo("#/signin");
    await goTo("#/decks");
    await goTo("#/signin");
    fire("SIGNED_IN", SESSION);
    expect(window.location.hash).toBe("#/signin");
  });
});
