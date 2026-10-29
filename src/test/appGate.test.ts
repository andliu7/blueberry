/**
 * The #/app sign-in gate as a table (owner, 23 Oct, G1: "Before anything").
 * appGateFor is pure, so every case runs without Supabase.
 */
import { describe, expect, it } from "vitest";
import { appGateFor, isLocalHost, type AppGateState } from "@/lib/appGate";

const cases: Array<[configured: boolean, loading: boolean, signedIn: boolean, want: AppGateState]> = [
  // A build without Supabase has no sign-in, so nobody is sent to one.
  [false, false, false, "game"],
  [false, true, false, "game"],
  [false, false, true, "game"],
  // A stored session still restoring: wait, never flash the sign-in page.
  [true, true, false, "wait"],
  [true, true, true, "wait"],
  [true, false, true, "game"],
  [true, false, false, "signin"],
];

describe("appGateFor", () => {
  it.each(cases)("configured=%s loading=%s signedIn=%s -> %s", (configured, loading, signedIn, want) => {
    expect(appGateFor({ configured, loading, signedIn })).toBe(want);
  });

  // Owner, 29 Oct: the sign-in stays on the real site and is dropped on this machine.
  it("lets a signed-out visitor straight in on localhost, even while a session restores", () => {
    expect(appGateFor({ configured: true, loading: false, signedIn: false, localHost: true })).toBe("game");
    expect(appGateFor({ configured: true, loading: true, signedIn: false, localHost: true })).toBe("game");
  });

  it("still sends a signed-out visitor to sign in anywhere else", () => {
    expect(appGateFor({ configured: true, loading: false, signedIn: false, localHost: false })).toBe("signin");
  });
});

describe("isLocalHost", () => {
  it("matches this machine only, by exact name", () => {
    for (const h of ["localhost", "127.0.0.1", "[::1]"]) expect(isLocalHost(h)).toBe(true);
    for (const h of ["blueberry.example", "localhost.evil.com", "evil-localhost", "192.168.1.5", ""]) {
      expect(isLocalHost(h)).toBe(false);
    }
  });
});
