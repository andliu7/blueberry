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

  it("resolves to null and never loads the library when unconfigured", async () => {
    vi.stubEnv("VITE_SUPABASE_URL", "");
    vi.stubEnv("VITE_SUPABASE_PUBLISHABLE_KEY", "");
    const { getSupabase, supabaseConfigured } = await freshModule();

    expect(supabaseConfigured).toBe(false);
    expect(await getSupabase()).toBeNull();
    expect(createClient).not.toHaveBeenCalled();
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
