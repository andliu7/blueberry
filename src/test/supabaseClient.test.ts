import { readFileSync, readdirSync, statSync } from "node:fs";
import path from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";

/**
 * The Supabase client is created lazily (`getSupabase`) so supabase-js stays
 * off the first load. These pin the parts of that move that auth depends on:
 * one shared client, the same auth options as the eager client had, null when
 * the build has no settings, and no file pulling supabase-js back in statically.
 */

const createClient = vi.fn((..._args: unknown[]) => ({ fake: true }));
vi.mock("@supabase/supabase-js", () => ({ createClient }));

async function freshModule() {
  vi.resetModules();
  return import("@/lib/supabase");
}

afterEach(() => {
  vi.unstubAllEnvs();
  createClient.mockClear();
});

describe("getSupabase", () => {
  it("creates one client with the same auth options and shares it", async () => {
    vi.stubEnv("VITE_SUPABASE_URL", "https://example.supabase.co");
    vi.stubEnv("VITE_SUPABASE_PUBLISHABLE_KEY", "sb_publishable_test");
    const { getSupabase, supabaseConfigured } = await freshModule();

    expect(supabaseConfigured).toBe(true);
    expect(createClient).not.toHaveBeenCalled();

    const [a, b] = await Promise.all([getSupabase(), getSupabase()]);
    expect(a).toBe(b);
    expect(await getSupabase()).toBe(a);
    expect(createClient).toHaveBeenCalledTimes(1);
    expect(createClient).toHaveBeenCalledWith("https://example.supabase.co", "sb_publishable_test", {
      auth: {
        flowType: "pkce",
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
    });
  });

  it("does not cache a failed load: the next call tries again", async () => {
    vi.stubEnv("VITE_SUPABASE_URL", "https://example.supabase.co");
    vi.stubEnv("VITE_SUPABASE_PUBLISHABLE_KEY", "sb_publishable_test");
    const { getSupabase } = await freshModule();

    // A rejection inside the lazy load, as a failed chunk download would give.
    createClient.mockImplementationOnce(() => {
      throw new Error("chunk failed");
    });
    await expect(getSupabase()).rejects.toThrow("chunk failed");

    const retried = await getSupabase();
    expect(retried).toEqual({ fake: true });
    expect(createClient).toHaveBeenCalledTimes(2);
    // And the good client is the one that is shared from then on.
    expect(await getSupabase()).toBe(retried);
    expect(createClient).toHaveBeenCalledTimes(2);
  });

  it("resolves to null and never loads the library when unconfigured", async () => {
    vi.stubEnv("VITE_SUPABASE_URL", "");
    vi.stubEnv("VITE_SUPABASE_PUBLISHABLE_KEY", "");
    const { getSupabase, supabaseConfigured } = await freshModule();

    expect(supabaseConfigured).toBe(false);
    expect(await getSupabase()).toBeNull();
    expect(createClient).not.toHaveBeenCalled();
  });
});

/** A window with `href` as its location and `keys` in localStorage. */
function stubWindow(href: string, keys: string[] | "throws") {
  const { hash, search } = new URL(href);
  const localStorage =
    keys === "throws"
      ? {
          get length(): number {
            throw new Error("SecurityError");
          },
          key: () => null,
        }
      : { length: keys.length, key: (i: number) => keys[i] ?? null };
  vi.stubGlobal("window", { location: { hash, search }, localStorage });
}

describe("supabaseAuthToRestore", () => {
  afterEach(() => vi.unstubAllGlobals());

  async function gate(href: string, keys: string[] | "throws") {
    vi.stubEnv("VITE_SUPABASE_URL", "https://example.supabase.co");
    vi.stubEnv("VITE_SUPABASE_PUBLISHABLE_KEY", "sb_publishable_test");
    const { supabaseAuthToRestore } = await freshModule();
    stubWindow(href, keys);
    return supabaseAuthToRestore();
  }

  it("is false on a first open with nothing stored", async () => {
    expect(await gate("https://site.test/blueberry/", [])).toBe(false);
    expect(await gate("https://site.test/blueberry/#/app", ["theme", "blueberry-progress"])).toBe(false);
  });

  it("is true when supabase-js has a session or a PKCE verifier stored", async () => {
    expect(await gate("https://site.test/#/app", ["sb-example-auth-token"])).toBe(true);
    expect(await gate("https://site.test/#/app", ["sb-example-auth-token-code-verifier"])).toBe(true);
  });

  it("ignores another project's keys", async () => {
    expect(await gate("https://site.test/#/app", ["sb-other-auth-token"])).toBe(false);
  });

  it("is true when the URL carries a sign-in coming back", async () => {
    expect(await gate("https://site.test/?code=x#/app", [])).toBe(true);
    expect(await gate("https://site.test/#access_token=x&refresh_token=y", [])).toBe(true);
    expect(await gate("https://site.test/?error=access_denied&error_description=no", [])).toBe(true);
  });

  it("is true when storage cannot be read, so the client loads as before", async () => {
    expect(await gate("https://site.test/#/app", "throws")).toBe(true);
  });

  it("is false when the build has no Supabase settings", async () => {
    vi.stubEnv("VITE_SUPABASE_URL", "");
    vi.stubEnv("VITE_SUPABASE_PUBLISHABLE_KEY", "");
    const { supabaseAuthToRestore } = await freshModule();
    stubWindow("https://site.test/?code=x", ["sb-example-auth-token"]);
    expect(supabaseAuthToRestore()).toBe(false);
  });
});

describe("onSupabaseClient", () => {
  it("calls a listener registered before creation once, with the client", async () => {
    vi.stubEnv("VITE_SUPABASE_URL", "https://example.supabase.co");
    vi.stubEnv("VITE_SUPABASE_PUBLISHABLE_KEY", "sb_publishable_test");
    const { getSupabase, onSupabaseClient } = await freshModule();
    const listener = vi.fn();
    onSupabaseClient(listener);

    const created = await getSupabase();
    await getSupabase();
    await Promise.resolve();
    expect(listener).toHaveBeenCalledTimes(1);
    expect(listener).toHaveBeenCalledWith(created);
  });

  it("calls a listener registered after creation, and not once unsubscribed", async () => {
    vi.stubEnv("VITE_SUPABASE_URL", "https://example.supabase.co");
    vi.stubEnv("VITE_SUPABASE_PUBLISHABLE_KEY", "sb_publishable_test");
    const { getSupabase, onSupabaseClient } = await freshModule();
    const created = await getSupabase();

    const late = vi.fn();
    onSupabaseClient(late);
    await Promise.resolve();
    await Promise.resolve();
    expect(late).toHaveBeenCalledWith(created);

    const gone = vi.fn();
    onSupabaseClient(gone)();
    await Promise.resolve();
    await Promise.resolve();
    expect(gone).not.toHaveBeenCalled();
  });
});

describe("supabase-js stays off the first load", () => {
  it("is imported only as a type outside the lazy getter", () => {
    const root = path.resolve(__dirname, "..");
    const offenders: string[] = [];
    const walk = (dir: string) => {
      for (const name of readdirSync(dir)) {
        const full = path.join(dir, name);
        if (statSync(full).isDirectory()) {
          if (name !== "test" && name !== "node_modules") walk(full);
          continue;
        }
        if (!/\.(ts|tsx)$/.test(name)) continue;
        const source = readFileSync(full, "utf8");
        // A value import (not `import type`) of the library anywhere ships it
        // in that module's chunk, which for the auth layer is the first load.
        if (/^import\s+(?!type\b)[^;]*from\s+["']@supabase\/supabase-js["']/m.test(source)) {
          offenders.push(path.relative(root, full));
        }
      }
    };
    walk(root);
    expect(offenders).toEqual([]);
  });
});
