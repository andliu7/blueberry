/**
 * The idle rule behind useIdleInput: thinking after 15s, but only mid-item;
 * bored after 20s, but only on an ambient screen. Pure, so it is tested without
 * a DOM; the hook is only the clock around it.
 *
 * The two context rules are the ones that matter for tone. A quiet ambient
 * screen is not a stuck student, so it never shows thinking dots; a student
 * mid-problem is working, so the berry never sighs at them.
 */

import { describe, expect, it } from "vitest";

import { IDLE } from "../mascot/bloomMotion";
import { idleStage, msUntilNextStage, type IdleContext } from "../mascot/useIdleInput";

describe("idleStage", () => {
  it("thinks at 15s mid-item, and not a moment before", () => {
    expect(IDLE.thinkingAfterMs).toBe(15000);
    expect(idleStage(14999, "midItem")).toBe("active");
    expect(idleStage(15000, "midItem")).toBe("thinking");
    expect(idleStage(60000, "midItem")).toBe("thinking");
  });

  it("never gets bored mid-item, however long the quiet", () => {
    expect(idleStage(10 * 60000, "midItem")).not.toBe("bored");
  });

  it("is bored at 20s on an ambient screen, and never thinking there", () => {
    expect(IDLE.boredAfterMs).toBe(20000);
    expect(idleStage(15000, "ambient")).toBe("active");
    expect(idleStage(19999, "ambient")).toBe("active");
    expect(idleStage(20000, "ambient")).toBe("bored");
  });

  it("never goes idle when off", () => {
    expect(idleStage(10 * 60000, "off")).toBe("active");
  });

  it("resets on input: zero quiet is active in every context", () => {
    for (const context of ["midItem", "ambient", "off"] as IdleContext[]) {
      expect(idleStage(0, context)).toBe("active");
    }
  });
});

describe("msUntilNextStage", () => {
  it("schedules exactly to the threshold, so one timeout lands on the change", () => {
    expect(msUntilNextStage(0, "midItem")).toBe(15000);
    expect(msUntilNextStage(4000, "midItem")).toBe(11000);
    expect(msUntilNextStage(0, "ambient")).toBe(20000);
    expect(idleStage(4000 + (msUntilNextStage(4000, "ambient") ?? 0), "ambient")).toBe("bored");
  });

  it("schedules nothing once the stage is reached, or when off", () => {
    expect(msUntilNextStage(15000, "midItem")).toBeNull();
    expect(msUntilNextStage(25000, "ambient")).toBeNull();
    expect(msUntilNextStage(0, "off")).toBeNull();
  });
});
