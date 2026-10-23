// @vitest-environment jsdom

/**
 * When the Supabase chunk fails to load, auth must settle instead of waiting
 * forever (validator finding, 2026-10-20). Before the fix, `AuthProvider` had
 * no catch on `getSupabase()`, so `loading` stayed true for the session and
 * every page that waits on it waited for good. Now it logs the failure and
 * settles signed out, the same state as a build without Supabase.
 */

import { afterEach, describe, expect, it, vi } from "vitest";
import { act, createElement } from "react";
import { createRoot, type Root } from "react-dom/client";

const { getSupabase } = vi.hoisted(() => ({ getSupabase: vi.fn() }));
// A session is stored, so AuthProvider asks for the client on mount: the case
// where a failed chunk download would leave `loading` stuck.
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
  vi.restoreAllMocks();
  getSupabase.mockReset();
});

describe("AuthProvider when the Supabase chunk fails to load", () => {
  it("stops loading, stays signed out and logs the error", async () => {
    const failure = new Error("Failed to fetch dynamically imported module");
    getSupabase.mockRejectedValue(failure);
    const logged = vi.spyOn(console, "error").mockImplementation(() => {});

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

    expect(getSupabase).toHaveBeenCalled();
    expect(seen!.loading).toBe(false);
    expect(seen!.session).toBeNull();
    expect(seen!.user).toBeNull();
    expect(seen!.role).toBe("member");
    expect(logged).toHaveBeenCalledWith(expect.stringContaining("Supabase client failed to load"), failure);
  });
});
