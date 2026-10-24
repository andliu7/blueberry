// @vitest-environment jsdom
/**
 * peekReturn reads the remembered #/app hash without using it up, so the
 * sign-in page can tell why the visitor came and the errand still runs after.
 */
import { afterEach, describe, expect, it, vi } from "vitest";
import { consumeReturn, peekReturn, rememberReturn } from "@/lib/returnTo";

afterEach(() => {
  sessionStorage.clear();
  vi.restoreAllMocks();
  window.location.hash = "";
});

describe("peekReturn", () => {
  it("is null with nothing remembered", () => {
    expect(peekReturn()).toBeNull();
  });

  it("reads the remembered hash and leaves it for consumeReturn", () => {
    rememberReturn("#/app/lesson/u1-allylic");
    expect(peekReturn()).toBe("#/app/lesson/u1-allylic");
    expect(peekReturn()).toBe("#/app/lesson/u1-allylic");
    expect(consumeReturn()).toBe(true);
    expect(peekReturn()).toBeNull();
  });

  it("answers null when storage is blocked instead of throwing", () => {
    vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
      throw new Error("blocked");
    });
    expect(peekReturn()).toBeNull();
  });
});
