/**
 * The ambient glance schedule and the look it adds to (berryGlance.ts and the
 * look helpers in berryMood.ts).
 *
 * What would go wrong unseen: a glance clock that drifts off the Bible's 3 to
 * 6s gaps, a direction that pushes the eyes past the travel CSS draws, or a
 * schedule that differs run to run and makes captures unreproducible.
 */

import { describe, expect, it } from "vitest";

import { GLANCE_SEED, frameGlance, startGlance, stepGlance, type GlanceClock } from "../mascot/berryGlance";
import { BERRY_MOODS, LOOK_AHEAD, lookForMood, resolveLook } from "../mascot/berryMood";
import { GLANCE } from "../mascot/bloomMotion";

/** Run the clock frame by frame at 60fps and record every transition. */
function run(seed: number, untilMs: number): { at: number; clock: GlanceClock }[] {
  const events: { at: number; clock: GlanceClock }[] = [];
  let clock = startGlance(0, seed);
  for (let now = 0; now <= untilMs; now += 16) {
    const next = stepGlance(clock, now);
    if (next !== clock) events.push({ at: now, clock: next });
    clock = next;
  }
  return events;
}

describe("the glance schedule", () => {
  it("is deterministic for a seed", () => {
    expect(run(GLANCE_SEED, 60000)).toEqual(run(GLANCE_SEED, 60000));
    expect(run(GLANCE_SEED, 60000)).not.toEqual(run(GLANCE_SEED + 1, 60000));
  });

  it("returns the same object when nothing is due, so the renderer skips the write", () => {
    const clock = startGlance(0);
    expect(stepGlance(clock, clock.nextAt - 1)).toBe(clock);
  });

  it("rests 3 to 6 seconds between glances", () => {
    const first = startGlance(0);
    expect(first.nextAt).toBeGreaterThanOrEqual(GLANCE.gapMinMs);
    expect(first.nextAt).toBeLessThanOrEqual(GLANCE.gapMaxMs);
    const events = run(GLANCE_SEED, 120000);
    expect(events.length).toBeGreaterThan(20);
    for (const { at, clock } of events) {
      if (clock.looking) continue;
      const rest = clock.nextAt - at;
      expect(rest).toBeGreaterThanOrEqual(GLANCE.gapMinMs);
      expect(rest).toBeLessThanOrEqual(GLANCE.gapMaxMs);
    }
  });

  it("alternates look and return, holding the look for move plus hold", () => {
    const events = run(GLANCE_SEED, 120000);
    events.forEach(({ at, clock }, i) => {
      expect(clock.looking, `event ${i}`).toBe(i % 2 === 0);
      if (clock.looking) expect(clock.nextAt - at).toBe(GLANCE.moveMs + GLANCE.holdMs);
      else expect([clock.x, clock.y]).toEqual([0, 0]);
    });
  });

  it("keeps every look within maxLook, and big enough to read at 40px", () => {
    for (const seed of [GLANCE_SEED, 1, 42, 0xdeadbeef]) {
      for (const { clock } of run(seed, 120000)) {
        if (!clock.looking) continue;
        expect(Math.abs(clock.x)).toBeLessThanOrEqual(GLANCE.maxLook);
        expect(Math.abs(clock.y)).toBeLessThanOrEqual(GLANCE.maxLook);
        // Below minReach the face moves about 1 screen px at 40px and does not
        // read as a look (measured, see GLANCE in bloomMotion.ts).
        expect(Math.abs(clock.x)).toBeGreaterThanOrEqual(GLANCE.minReach * GLANCE.maxLook - 1e-9);
      }
    }
  });

  it("looks both ways over a minute, not always to one side", () => {
    const sides = run(GLANCE_SEED, 60000)
      .filter((e) => e.clock.looking)
      .map((e) => Math.sign(e.clock.x));
    expect(sides).toContain(1);
    expect(sides).toContain(-1);
  });
});

describe("the glance while a reaction holds it", () => {
  /** A clock mid glance: eyes off to one side. */
  function looking(): GlanceClock {
    const clock = startGlance(0);
    const off = stepGlance(clock, clock.nextAt);
    expect(off.looking).toBe(true);
    return off;
  }

  it("brings the eyes home the moment the berry is held", () => {
    const off = looking();
    const held = frameGlance(off, off.nextAt - 100, false, true);
    expect(held.looking).toBe(false);
    expect([held.x, held.y]).toEqual([0, 0]);
  });

  it("waits while held without rewriting the clock", () => {
    const clock = startGlance(0);
    expect(frameGlance(clock, clock.nextAt + 5000, false, false)).toBe(clock);
  });

  it("waits a full gap after the berry is free again, even if a deadline ran out while held", () => {
    const clock = startGlance(0);
    // Held well past the deadline, then freed.
    const freedAt = clock.nextAt + 4000;
    const freed = frameGlance(clock, freedAt, true, false);
    expect(freed.looking).toBe(false);
    expect(freed.nextAt - freedAt).toBeGreaterThanOrEqual(GLANCE.gapMinMs);
    expect(freed.nextAt - freedAt).toBeLessThanOrEqual(GLANCE.gapMaxMs);
    // And the frame after it does not glance yet.
    expect(frameGlance(freed, freedAt + 16, true, true)).toBe(freed);
  });

  it("is the plain schedule while free", () => {
    const clock = startGlance(0);
    expect(frameGlance(clock, clock.nextAt, true, true)).toEqual(stepGlance(clock, clock.nextAt));
  });
});

describe("the look", () => {
  it("maps every mood inside one full look", () => {
    for (const mood of BERRY_MOODS) {
      const look = lookForMood(mood);
      expect(Math.abs(look.x), mood).toBeLessThanOrEqual(1);
      expect(Math.abs(look.y), mood).toBeLessThanOrEqual(1);
    }
  });

  it("reads the mood table: thinking looks up and away, sad looks down, curious ahead", () => {
    expect(lookForMood("thinking").x).toBeCloseTo(1, 5);
    expect(lookForMood("thinking").y).toBeLessThan(0);
    expect(lookForMood("sad").y).toBeGreaterThan(0);
    expect(lookForMood("curious")).toEqual({ x: 0, y: 0 });
  });

  it("lets an explicit lookAt win outright, clamped", () => {
    expect(resolveLook("thinking", LOOK_AHEAD)).toEqual({ x: 0, y: 0 });
    expect(resolveLook("sad", { x: 3, y: -3 })).toEqual({ x: 1, y: -1 });
    expect(resolveLook("thinking", undefined)).toEqual(lookForMood("thinking"));
  });
});
