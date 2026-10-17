import { describe, expect, it } from "vitest";
import { REDIRECTS, redirectFor } from "@/lib/redirects";

/**
 * Every retired address resolves (SITE-REPLAN.md section 2: "nothing that is in a
 * student's history becomes a 404").
 */
describe("retired addresses", () => {
  it("send the Dashboard's Concepts panel to the game", () => {
    expect(redirectFor("d/concepts")).toBe("#/app");
  });

  it("leave live routes alone", () => {
    for (const live of ["", "home", "d", "d/settings", "app", "study-decks", "schedule"]) {
      expect(redirectFor(live)).toBeNull();
    }
  });

  it("land in one hop, never on another retired address", () => {
    for (const [from, to] of Object.entries(REDIRECTS)) {
      expect(to.startsWith("#/"), `${from} -> ${to} is a full hash`).toBe(true);
      const target = to.slice(2).split("?")[0];
      expect(redirectFor(target), `${from} -> ${to} chains`).toBeNull();
    }
  });
});
