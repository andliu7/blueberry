// @vitest-environment jsdom

/**
 * The account's name reaches auth state (owner, item 11). The game greets with
 * `profiles.full_name`, which the signup trigger fills and Google sign-in
 * already sets, so AuthProvider reads it with the role, in the same query.
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

import { AuthProvider, useAuth, type AuthState } from "@/lib/AuthContext";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

let root: Root | null = null;
let host: HTMLElement | null = null;

afterEach(() => {
  act(() => root?.unmount());
  host?.remove();
  root = null;
  host = null;
  getSupabase.mockReset();
});

/** A client whose stored session is user "u1" and whose profile row is `row`. */
function fakeClient(result: { data: unknown; error: unknown }) {
  const select = vi.fn(() => ({ eq: () => ({ maybeSingle: () => Promise.resolve(result) }) }));
  return {
    select,
    client: {
      auth: {
        getSession: () => Promise.resolve({ data: { session: { user: { id: "u1" }, access_token: "t" } } }),
        onAuthStateChange: () => ({ data: { subscription: { unsubscribe: () => {} } } }),
      },
      from: () => ({ select }),
    },
  };
}

async function mount(): Promise<() => AuthState> {
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
  // The profile query resolves on a later microtask than the session.
  await act(async () => {
    await Promise.resolve();
  });
  return () => seen!;
}

describe("AuthProvider profile name", () => {
  it("reads full_name with the role", async () => {
    const fake = fakeClient({ data: { role: "member", full_name: "Ada Lovelace" }, error: null });
    getSupabase.mockResolvedValue(fake.client);
    const seen = await mount();

    expect(fake.select).toHaveBeenCalledWith("role, full_name");
    expect(seen().profileName).toBe("Ada Lovelace");
    expect(seen().profileLoaded).toBe(true);
    expect(seen().role).toBe("member");
  });

  it("reads a blank name as no name", async () => {
    const fake = fakeClient({ data: { role: "member", full_name: "   " }, error: null });
    getSupabase.mockResolvedValue(fake.client);
    const seen = await mount();

    expect(seen().profileName).toBeNull();
    expect(seen().profileLoaded).toBe(true);
  });

  it("leaves a failed read unloaded rather than nameless", async () => {
    const fake = fakeClient({ data: null, error: { message: "offline" } });
    getSupabase.mockResolvedValue(fake.client);
    const seen = await mount();

    expect(seen().profileName).toBeNull();
    expect(seen().profileLoaded).toBe(false);
  });
});
