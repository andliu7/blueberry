// @vitest-environment jsdom

/**
 * supabase-js (about 53 KB gzipped) stays off the first open of the site and
 * the game. AuthProvider loads it on mount only when there is auth state to
 * pick up (a stored session or a Google redirect coming back); otherwise it
 * settles signed out at once and hears about the client when something else,
 * a sign-in button say, loads it later.
 */

import { afterEach, describe, expect, it, vi } from "vitest";
import { act, createElement } from "react";
import { createRoot, type Root } from "react-dom/client";
import type { SupabaseClient } from "@supabase/supabase-js";

const mocks = vi.hoisted(() => ({
  getSupabase: vi.fn(),
  toRestore: { value: false },
  listeners: new Set<(client: unknown) => void>(),
}));
vi.mock("@/lib/supabase", () => ({
  supabaseConfigured: true,
  getSupabase: mocks.getSupabase,
  supabaseAuthToRestore: () => mocks.toRestore.value,
  onSupabaseClient: (listener: (client: unknown) => void) => {
    mocks.listeners.add(listener);
    return () => mocks.listeners.delete(listener);
  },
  supabaseStorageKeyPrefix: () => "sb-example-auth-token",
}));

import { AuthProvider, useAuth, type AuthState } from "@/lib/AuthContext";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

let root: Root | null = null;
let host: HTMLElement | null = null;

afterEach(() => {
  act(() => root?.unmount());
  host?.remove();
  root = null;
  host = null;
  mocks.getSupabase.mockReset();
  mocks.toRestore.value = false;
  mocks.listeners.clear();
});

/** A client whose auth answers with `session` and lets the test fire a change. */
function fakeClient(session: unknown) {
  let emit: ((event: string, next: unknown) => void) | null = null;
  const client = {
    auth: {
      getSession: vi.fn(async () => ({ data: { session } })),
      onAuthStateChange: vi.fn((callback: (event: string, next: unknown) => void) => {
        emit = callback;
        return { data: { subscription: { unsubscribe: vi.fn() } } };
      }),
    },
    // The role lookup, once a user id exists.
    from: () => ({ select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: { role: "member" } }) }) }) }),
  };
  return { client: client as unknown as SupabaseClient, emit: (next: unknown) => emit?.("SIGNED_IN", next) };
}

async function mount() {
  let seen: AuthState | null = null;
  const Probe = () => {
    seen = useAuth();
    return null;
  };
  host = document.createElement("div");
  document.body.appendChild(host);
  root = createRoot(host);
  await act(async () => {
    root!.render(createElement(AuthProvider, null, createElement(Probe)));
  });
  return () => seen!;
}

describe("AuthProvider loads supabase-js only when there is auth to restore", () => {
  it("with nothing to restore, does not load the client and settles signed out", async () => {
    const seen = await mount();
    expect(mocks.getSupabase).not.toHaveBeenCalled();
    expect(seen().loading).toBe(false);
    expect(seen().session).toBeNull();
    expect(seen().user).toBeNull();
  });

  it("hears a sign-in when something else loads the client later", async () => {
    const seen = await mount();
    const session = { user: { id: "user-1" } };
    const { client, emit } = fakeClient(null);
    mocks.getSupabase.mockResolvedValue(client);

    // A sign-in button calls getSupabase(), which tells every listener.
    await act(async () => {
      for (const listener of mocks.listeners) listener(client);
      // In a race the listener can be called twice; it subscribes once.
      for (const listener of mocks.listeners) listener(client);
    });
    expect(client.auth.onAuthStateChange).toHaveBeenCalledTimes(1);

    await act(async () => emit(session));
    expect(seen().session).toBe(session);
    expect(seen().user).toEqual({ id: "user-1" });
  });

  it("with a stored session or a redirect, loads the client on mount and restores it", async () => {
    mocks.toRestore.value = true;
    const session = { user: { id: "user-2" } };
    const { client } = fakeClient(session);
    mocks.getSupabase.mockResolvedValue(client);

    const seen = await mount();
    expect(mocks.getSupabase).toHaveBeenCalled();
    expect(seen().loading).toBe(false);
    expect(seen().session).toBe(session);
  });

  it("loads the client when another tab signs in", async () => {
    const { client } = fakeClient(null);
    mocks.getSupabase.mockResolvedValue(client);
    await mount();
    expect(mocks.getSupabase).not.toHaveBeenCalled();

    await act(async () => {
      window.dispatchEvent(new StorageEvent("storage", { key: "sb-example-auth-token", newValue: "{}" }));
    });
    expect(mocks.getSupabase).toHaveBeenCalled();
  });
});
