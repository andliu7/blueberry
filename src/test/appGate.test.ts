/**
 * The #/app sign-in gate as a table (owner, 23 Oct, G1: "Before anything").
 * appGateFor is pure, so every case runs without Supabase.
 */
import { describe, expect, it } from "vitest";
import { appGateFor, type AppGateState } from "@/lib/appGate";

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
});
