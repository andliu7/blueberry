// @vitest-environment jsdom

/** Signing in from the game comes back to the game, once (owner, item 11). */

import { afterEach, describe, expect, it, vi } from "vitest";
import { consumeReturn, rememberReturn } from "@/lib/returnTo";

afterEach(() => {
  vi.restoreAllMocks();
  sessionStorage.clear();
  window.location.hash = "";
});

describe("returnTo", () => {
  it("round trips a game hash", () => {
    rememberReturn("#/app/me");
    window.location.hash = "#/signin";
    expect(consumeReturn()).toBe(true);
    expect(window.location.hash).toBe("#/app/me");
  });

  it("ignores a hash outside the game", () => {
    rememberReturn("#/decks");
    window.location.hash = "#/signin";
    expect(consumeReturn()).toBe(false);
    expect(window.location.hash).toBe("#/signin");

    // Written by something else, it is still refused and still cleared.
    sessionStorage.setItem("blueberry.returnTo", "#/decks");
    expect(consumeReturn()).toBe(false);
    expect(sessionStorage.getItem("blueberry.returnTo")).toBeNull();
    expect(window.location.hash).toBe("#/signin");
  });

  it("navigates only once", () => {
    rememberReturn("#/app/feed");
    expect(consumeReturn()).toBe(true);
    window.location.hash = "#/signin";
    expect(consumeReturn()).toBe(false);
    expect(window.location.hash).toBe("#/signin");
  });

  it("survives storage that throws", () => {
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new Error("blocked");
    });
    vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
      throw new Error("blocked");
    });
    expect(() => rememberReturn("#/app/me")).not.toThrow();
    expect(consumeReturn()).toBe(false);
  });
});
