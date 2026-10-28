import { describe, expect, it } from "vitest";
import { GLASS_SPLASH_KEY, isLanding, shouldPlaySplash } from "@/lib/glassSplashGuard";

const mem = () => {
  const m = new Map<string, string>();
  return { getItem: (k: string) => m.get(k) ?? null, setItem: (k: string, v: string) => void m.set(k, v), m };
};

describe("glass splash guard", () => {
  it("plays once per session on the landing page", () => {
    const storage = mem();
    const env = { hash: "#/", reducedMotion: false, storage };
    expect(shouldPlaySplash(env)).toBe(true);
    expect(storage.m.get(GLASS_SPLASH_KEY)).toBe("1");
    expect(shouldPlaySplash(env)).toBe(false);
  });
  it("only on the landing hash", () => {
    expect(isLanding("")).toBe(true);
    expect(isLanding("#/app")).toBe(false);
    expect(shouldPlaySplash({ hash: "#/app", reducedMotion: false, storage: mem() })).toBe(false);
  });
  it("never under reduced motion, and does not spend the session slot", () => {
    const storage = mem();
    expect(shouldPlaySplash({ hash: "#/", reducedMotion: true, storage })).toBe(false);
    expect(storage.m.size).toBe(0);
  });
  it("storage that throws or is missing means no splash", () => {
    const boom = () => {
      throw new Error("blocked");
    };
    expect(shouldPlaySplash({ hash: "#/", reducedMotion: false, storage: boom })).toBe(false);
    expect(shouldPlaySplash({ hash: "#/", reducedMotion: false, storage: null })).toBe(false);
  });
});
