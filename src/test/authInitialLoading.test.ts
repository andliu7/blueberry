// @vitest-environment jsdom
/**
 * AuthProvider's first answer (owner, 23 Oct, G1). The #/app gate waits on
 * `loading`, so a cold signed-out open must read loading=false from the very
 * first render, or every first visit would sit behind the loader for a frame
 * just to learn it is signed out. With a stored session to restore, the first
 * value is loading=true, so the gate never flashes the sign-in page.
 */
import { afterEach, describe, expect, it, vi } from "vitest";
import { act, createElement } from "react";
import { createRoot, type Root } from "react-dom/client";

const mocks = vi.hoisted(() => ({ toRestore: { value: false } }));
vi.mock("@/lib/supabase", () => ({
  supabaseConfigured: true,
  // Never resolves: the test only reads the first render.
  getSupabase: () => new Promise(() => {}),
  supabaseAuthToRestore: () => mocks.toRestore.value,
  onSupabaseClient: () => () => {},
  supabaseStorageKeyPrefix: () => "sb-example-auth-token",
}));

import { AuthProvider, useAuth } from "@/lib/AuthContext";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

let root: Root | null = null;
let host: HTMLElement | null = null;

afterEach(() => {
  act(() => root?.unmount());
  host?.remove();
  root = null;
  host = null;
});

function firstLoading(): boolean[] {
  const seen: boolean[] = [];
  const Probe = () => {
    seen.push(useAuth().loading);
    return null;
  };
  host = document.createElement("div");
  document.body.appendChild(host);
  root = createRoot(host);
  act(() => root!.render(createElement(AuthProvider, null, createElement(Probe))));
  return seen;
}

describe("AuthProvider first render", () => {
  it("reads loading=false at once when there is nothing to restore", () => {
    mocks.toRestore.value = false;
    const seen = firstLoading();
    expect(seen[0]).toBe(false);
    expect(seen).not.toContain(true);
  });

  it("reads loading=true first when a stored session is restoring", () => {
    mocks.toRestore.value = true;
    const seen = firstLoading();
    expect(seen[0]).toBe(true);
  });
});
