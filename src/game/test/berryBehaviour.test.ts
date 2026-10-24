/**
 * The behaviour table, and the two ambient behaviours added for the Design
 * Bible (documentation/BLOOM-STATES-SPEC.md, section 1 A).
 *
 * The renderer trusts this table blindly: it loops an ambient behaviour by
 * wrapping progress, plays anything else once, and follows `returnTo` when it
 * runs out. So the failures worth catching are structural. A behaviour that
 * neither loops nor returns strands the berry mid pose; keyframes out of order
 * make `poseAt` pick the wrong span; a one-shot that does not end at rest makes
 * the hand back to idle visibly snap.
 *
 * Plus the shared motion constants: the CSS tokens in bloom-motion.css have to
 * say the same thing as bloomMotion.ts, and the curves they alias have to exist.
 */

import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

import { BEHAVIOURS, poseAt, type BerryBehaviour } from "../mascot/berryBehaviour";
import { BERRY_MOODS } from "../mascot/berryMood";
import { GLANCE, PEEK, REDUCED_CROSSFADE_MS, SIGH } from "../mascot/bloomMotion";

const NAMES = Object.keys(BEHAVIOURS) as BerryBehaviour[];
const atRest = { scaleY: 1, lift: 0, tilt: 0, pitch: 0 };
const poseOf = (f: { scaleY: number; lift: number; tilt: number; pitch: number }) => ({
  scaleY: f.scaleY,
  lift: f.lift,
  tilt: f.tilt,
  pitch: f.pitch,
});

describe("every behaviour", () => {
  it("either loops or returns somewhere that exists", () => {
    for (const name of NAMES) {
      const config = BEHAVIOURS[name];
      if (config.family === "ambient") continue;
      // The two deliberate holders: leanIn attends and drag hangs limp until
      // the caller moves on (the pointer lets go, the student stops drawing).
      if (name === "leanIn" || name === "drag") {
        expect(config.returnTo).toBeUndefined();
        continue;
      }
      expect(config.returnTo, `${name} returnTo`).toBeDefined();
      expect(BEHAVIOURS[config.returnTo as BerryBehaviour].family, `${name} returns to an ambient`).toBe("ambient");
    }
  });

  it("has keyframes from 0 to 1 in ascending order", () => {
    for (const name of NAMES) {
      const frames = BEHAVIOURS[name].keyframes;
      expect(frames.length, name).toBeGreaterThan(1);
      expect(frames[0]?.at, `${name} first`).toBe(0);
      expect(frames[frames.length - 1]?.at, `${name} last`).toBe(1);
      for (let i = 1; i < frames.length; i++) {
        expect((frames[i]?.at ?? 0) > (frames[i - 1]?.at ?? 1), `${name} frame ${i}`).toBe(true);
      }
    }
  });

  it("ends a one-shot at rest, so the hand back to idle never snaps", () => {
    for (const name of NAMES) {
      const config = BEHAVIOURS[name];
      if (config.returnTo === undefined) continue;
      const last = config.keyframes[config.keyframes.length - 1];
      expect(last && poseOf(last), `${name} last frame`).toEqual(atRest);
    }
  });

  it("starts a one-shot at rest, except peek, which starts hidden low on purpose", () => {
    for (const name of NAMES) {
      const config = BEHAVIOURS[name];
      if (config.returnTo === undefined) continue;
      const first = config.keyframes[0];
      if (name === "peek") {
        expect(first?.lift).toBeLessThan(0);
        continue;
      }
      expect(first && poseOf(first), `${name} first frame`).toEqual(atRest);
    }
  });

  it("names only moods that exist", () => {
    for (const name of NAMES) {
      const mood = BEHAVIOURS[name].mood;
      if (mood !== undefined) expect(BERRY_MOODS as string[], name).toContain(mood);
    }
  });
});

describe("sigh, the bored beat", () => {
  const sigh = BEHAVIOURS.sigh;

  it("plays once and returns to idle, so it never loops at the student", () => {
    expect(sigh.family).toBe("reactive");
    expect(sigh.returnTo).toBe("idle");
    expect(sigh.durationMs).toBe(SIGH.durationMs);
    expect(sigh.mood).toBe("sleepy");
  });

  it("sinks at 35 percent and tilts at 60 percent, per the spec's numbers", () => {
    expect(poseAt("sigh", SIGH.sinkAt).scaleY).toBeCloseTo(SIGH.sinkScaleY, 5);
    expect(poseAt("sigh", SIGH.tiltAt).tilt).toBeCloseTo(SIGH.tilt, 5);
    // A sink, not a stretch: nothing in the sigh rises above rest height.
    for (let t = 0; t <= 1; t += 0.05) expect(poseAt("sigh", t).scaleY).toBeLessThanOrEqual(1);
  });
});

describe("peek, rising from below", () => {
  const peek = BEHAVIOURS.peek;

  it("is an event that hands back to idle and can head a chain", () => {
    expect(peek.family).toBe("event");
    expect(peek.returnTo).toBe("idle");
    expect(peek.durationMs).toBe(PEEK.durationMs);
  });

  it("starts low, overshoots once above its anchor, and lands", () => {
    expect(poseAt("peek", 0).lift).toBeCloseTo(PEEK.startLift, 5);
    const over = poseAt("peek", PEEK.overshootAt);
    expect(over.lift).toBeCloseTo(PEEK.overshootLift, 5);
    expect(over.scaleY).toBeCloseTo(PEEK.overshootScaleY, 5);
    expect(poseAt("peek", 1).lift).toBe(0);
    // One overshoot: the lift crosses rest going up exactly once.
    let crossings = 0;
    let prev = poseAt("peek", 0).lift;
    for (let t = 0.01; t <= 1; t += 0.01) {
      const lift = poseAt("peek", t).lift;
      if (prev < 0 && lift >= 0) crossings += 1;
      prev = lift;
    }
    expect(crossings).toBe(1);
  });

  it("blends in near instantly, or the rise would start with a drop", () => {
    expect(peek.blendMs).toBeLessThanOrEqual(16);
  });
});

/* ------------------------------------------------------ the shared tokens -- */

const motionCss = readFileSync(new URL("../mascot/bloom-motion.css", import.meta.url), "utf8");
const tokensCss = readFileSync(new URL("../../tokens.css", import.meta.url), "utf8");
const berrySrc = readFileSync(new URL("../mascot/Berry.tsx", import.meta.url), "utf8");

function ms(name: string): number {
  const match = new RegExp(`--${name}:\\s*(\\d+)ms`).exec(motionCss);
  expect(match, `--${name} should be a literal ms value`).not.toBeNull();
  return Number(match?.[1]);
}

describe("bloom-motion.css", () => {
  it("says the same durations as bloomMotion.ts", () => {
    expect(ms("bloom-dur-crossfade")).toBe(REDUCED_CROSSFADE_MS);
    expect(ms("bloom-glance-move")).toBe(GLANCE.moveMs);
    expect(ms("bloom-glance-lead")).toBe(GLANCE.eyesLeadMs);
  });

  it("aliases site curves that exist, and never redefines a site token", () => {
    for (const alias of ["bb-ease-sheet", "bb-ease-spring"]) {
      expect(motionCss).toContain(`var(--${alias})`);
      expect(tokensCss).toContain(`--${alias}:`);
    }
    // The clash the prefix exists to avoid: no --bb-* is declared here.
    expect(motionCss).not.toMatch(/^\s*--bb-[\w-]+\s*:/m);
  });

  it("is imported by Berry, so every berry has the tokens", () => {
    expect(berrySrc).toContain('import "./bloom-motion.css"');
  });

  it("keeps the glance still under all three reduced-motion switches", () => {
    expect(motionCss).toContain('.berry-origin[data-motion="still"]');
    expect(motionCss).toContain('html[data-motion="reduced"]');
    expect(motionCss).toContain("@media (prefers-reduced-motion: reduce)");
  });
});
