import { describe, expect, it } from "vitest";
import {
  SLEEP_AFTER_MS,
  bloomLook,
  elixirFraction,
  elixirLabel,
  elixirTier,
  isSleepy,
  lidShare,
} from "../elixir/elixirModel";

describe("elixir model", () => {
  it("clamps the fraction and survives bad input", () => {
    expect(elixirFraction(30, 25)).toBe(1);
    expect(elixirFraction(-3, 25)).toBe(0);
    expect(elixirFraction(5, 0)).toBe(0);
    expect(elixirFraction(NaN, 25)).toBe(0);
  });

  it("names four tiers", () => {
    expect(elixirTier(1)).toBe("full");
    expect(elixirTier(0.5)).toBe("good");
    expect(elixirTier(0.1)).toBe("low");
    expect(elixirTier(0)).toBe("empty");
  });

  it("less excited and tired when low, never sad", () => {
    expect(bloomLook("awake", "full").mood).toBe("excited");
    const low = bloomLook("awake", "low");
    expect(low.tired).toBe(true);
    expect(low.mood).not.toBe("excited");
    expect(low.mood).not.toBe("sad");
  });

  it("low energy draws open eyes under heavy lids, not the happy arches", () => {
    expect(bloomLook("awake", "low").mood).toBe("focused");
    expect(bloomLook("awake", "empty").mood).toBe("focused");
    expect(lidShare("full")).toBe(0);
    expect(lidShare("low")).toBeGreaterThan(0.3);
    expect(lidShare("empty")).toBeGreaterThan(lidShare("low"));
  });

  it("phase beats tier: a drink revives an empty berry, a nap shows Zzz", () => {
    const drink = bloomLook("drinking", "empty");
    expect(drink.tired).toBe(false);
    expect(drink.mood).toBe("cheer");
    expect(bloomLook("asleep", "full").zzz).toBe(true);
    expect(bloomLook("waking", "empty").behaviour).toBe("wideEyed");
  });

  it("sleeps only after the long idle", () => {
    expect(isSleepy(SLEEP_AFTER_MS - 1)).toBe(false);
    expect(isSleepy(SLEEP_AFTER_MS)).toBe(true);
  });

  it("labels in plain words", () => {
    expect(elixirLabel(0, 25)).toContain("refills over time");
    expect(elixirLabel(25, 25)).toContain("Full");
    expect(elixirLabel(7, 25)).toBe("Energy, 7 of 25.");
  });
});
