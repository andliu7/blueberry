/**
 * The chest payout (coin gauntlet): the paths are real motion, the tally moves
 * only on landings and ends true, and the screen keeps the owner's rules.
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { counterSteps } from "../chest/chestFlow";
import { CHEST_VIEW, LID_DEGREES } from "../chest/chestPaint";
import { PAYOUT_COIN_MAX, coinFlight, launchDelays, payoutCoinCount, scatterSpot, spillFlight, spillThrowFor, type PayoutStage } from "../chest/payoutPath";

const stage: PayoutStage = { from: { x: 195, y: 397 }, to: { x: 122, y: 84 }, rise: 250, reach: 151 };
const source = readFileSync(resolve(__dirname, "../chest/ChestOpening.tsx"), "utf8");
const css = readFileSync(resolve(__dirname, "../chest/chestOpening.css"), "utf8");

describe("how many coins fly", () => {
  it("is one for one, up to the most that read", () => {
    expect(payoutCoinCount(0)).toBe(0);
    expect(payoutCoinCount(5)).toBe(5);
    expect(payoutCoinCount(25)).toBe(PAYOUT_COIN_MAX);
    expect(payoutCoinCount(5000)).toBe(PAYOUT_COIN_MAX);
  });

  it("makes every landing add to the tally, and the last one reach the true total", () => {
    for (const total of [1, 5, 7, 25, 50, 1250]) {
      const steps = counterSteps(0, total, payoutCoinCount(total));
      expect(steps.at(-1)).toBe(total);
      steps.forEach((step, i) => expect(step).toBeGreaterThan(i === 0 ? 0 : steps[i - 1]!));
    }
  });

  it("launches in order, dense first, with the last coin held back to land alone", () => {
    const delays = launchDelays(24);
    expect(delays[0]).toBe(0);
    delays.slice(1).forEach((delay, i) => expect(delay).toBeGreaterThan(delays[i]!));
    const firstGap = delays[1]! - delays[0]!;
    const lastGap = delays[23]! - delays[22]!;
    expect(lastGap).toBeGreaterThan(firstGap * 2);
    expect(launchDelays(0)).toEqual([]);
    expect(launchDelays(1)).toEqual([0]);
  });
});

describe("a coin's flight", () => {
  const flights = Array.from({ length: PAYOUT_COIN_MAX }, (_unused, i) => coinFlight(i, stage));

  it("starts at the mouth of the box and ends on the tally's coin", () => {
    for (const { frames } of flights) {
      expect(frames[0]!.x).toBeCloseTo(stage.from.x);
      expect(frames[0]!.y).toBeCloseTo(stage.from.y);
      expect(frames.at(-1)!.x).toBeCloseTo(stage.to.x);
      expect(frames.at(-1)!.y).toBeCloseTo(stage.to.y);
      expect(frames[0]!.offset).toBe(0);
      expect(frames.at(-1)!.offset).toBeCloseTo(1);
    }
  });

  it("never climbs into the tally on the throw, and never leaves the sides of a phone", () => {
    for (const { frames, hang, duration } of flights) {
      const thrown = frames.filter((f) => f.offset * duration <= hang);
      expect(Math.min(...thrown.map((f) => f.y))).toBeGreaterThanOrEqual(stage.from.y - stage.rise - 1);
      for (const f of frames) {
        expect(f.x).toBeGreaterThan(24);
        expect(f.x).toBeLessThan(390 - 24);
      }
    }
  });

  it("leaves as a column and opens into a spray", () => {
    const xAt = (share: number) => flights.map(({ frames }) => frames[Math.round(frames.length * share)]!.x - stage.from.x);
    const width = (xs: number[]) => Math.max(...xs) - Math.min(...xs);
    expect(width(xAt(0.1))).toBeLessThan(width(xAt(0.5)) / 3);
  });

  it("has weight: gravity through the throw, no kink where the pull takes over, fast at the strike", () => {
    for (const { frames, duration, hang } of flights) {
      const dt = duration / (frames.length - 1) / 1000;
      const vy = frames.slice(1).map((f, i) => (f.y - frames[i]!.y) / dt);
      const speed = (n: number) => Math.hypot(vy[n]!, (frames[n + 1]!.x - frames[n]!.x) / dt);
      const hangAt = Math.floor(hang / 1000 / dt);
      expect(vy[0]!).toBeLessThan(-500);
      // Gravity alone across the throw: the speed changes the same every step.
      for (let n = 2; n < hangAt - 1; n += 1) expect(vy[n]! - vy[n - 1]!).toBeCloseTo(2600 * dt, 0);
      expect(Math.abs(speed(hangAt + 1) - speed(hangAt - 1))).toBeLessThan(500);
      expect(speed(frames.length - 2)).toBeGreaterThan(900);
    }
  });

  it("is the same every time", () => {
    expect(coinFlight(3, stage)).toEqual(coinFlight(3, stage));
  });
});

describe("the stream", () => {
  const corner: PayoutStage = { from: { x: 195, y: 398 }, to: { x: 344, y: 49 }, rise: 300, reach: 151 };
  const flights = Array.from({ length: PAYOUT_COIN_MAX }, (_unused, i) => coinFlight(i, corner));
  const widthAt = (fromEnd: number) => {
    const xs = flights.map(({ frames }) => frames[frames.length - 1 - fromEnd]!.x);
    return Math.max(...xs) - Math.min(...xs);
  };

  it("draws every coin together into one ribbon as it nears the counter", () => {
    const spray = Math.max(...flights.map(({ frames, duration, hang }) => Math.abs(frames[Math.round((hang / duration) * (frames.length - 1))]!.x - corner.from.x)));
    expect(spray).toBeGreaterThan(30);
    expect(widthAt(3)).toBeLessThan(spray);
    expect(widthAt(1)).toBeLessThan(widthAt(3));
  });

  it("bows well off the straight line to the counter, so the path reads as an arc", () => {
    for (const { frames, duration, hang } of flights) {
      const top = Math.round((hang / duration) * (frames.length - 1));
      const swing = frames.slice(top);
      const a = swing[0]!;
      const b = swing.at(-1)!;
      const length = Math.hypot(b.x - a.x, b.y - a.y);
      const bow = Math.max(...swing.map((f) => Math.abs((b.x - a.x) * (a.y - f.y) - (a.x - f.x) * (b.y - a.y)) / length));
      expect(bow).toBeGreaterThan(30);
    }
  });

  it("stays on the smallest phone, and takes long enough to follow", () => {
    const small: PayoutStage = { from: { x: 160, y: 300 }, to: { x: 280, y: 40 }, rise: 220, reach: 116 };
    for (let i = 0; i < PAYOUT_COIN_MAX; i += 1) {
      const { frames, duration, hang } = coinFlight(i, small);
      for (const f of frames) {
        expect(f.x).toBeGreaterThan(0);
        expect(f.x).toBeLessThan(320);
      }
      expect(duration - hang).toBeGreaterThanOrEqual(700);
    }
  });
});

describe("the spill", () => {
  it("rests on the ground in front of the box, in heaps and strays, on the spot it was thrown at", () => {
    const spots = Array.from({ length: 26 }, (_unused, i) => scatterSpot(i, 26, 170, 130));
    for (const spot of spots) {
      expect(Math.abs(spot.x)).toBeLessThanOrEqual(170);
      expect(spot.y).toBeGreaterThanOrEqual(0);
      expect(spot.y).toBeLessThanOrEqual(130);
    }
    // Not a row: the pieces use the depth of the ground.
    const ys = spots.map((spot) => spot.y);
    expect(Math.max(...ys) - Math.min(...ys)).toBeGreaterThan(60);
    const vy = -800;
    const vx = spillThrowFor(120, vy, 150);
    expect(spillFlight(vx, vy, 150).frames.at(-1)!.x).toBeCloseTo(120);
  });

  it("plays for exactly the time its sum took, so gravity stays gravity", () => {
    const { frames, duration } = spillFlight(100, -700, 150);
    expect(frames.at(-1)!.offset).toBeCloseTo(1);
    expect(duration).toBeGreaterThan(300);
    expect(duration).toBeLessThanOrEqual(1950);
  });

  it("stays on a phone and bounces lower each time", () => {
    for (const vx of [-155, 155]) {
      const { frames } = spillFlight(vx, -950, 150);
      expect(Math.max(...frames.map((f) => Math.abs(f.x)))).toBeLessThan(195 - 22);
    }
    const { frames } = spillFlight(60, -950, 150);
    const hits = frames.map((f, i) => (f.y === 150 ? i : -1)).filter((i) => i >= 0);
    expect(hits.length).toBeGreaterThanOrEqual(2);
    const peakBetween = (a: number, b: number) => 150 - Math.min(...frames.slice(a, b + 1).map((f) => f.y));
    expect(peakBetween(hits[1]!, frames.length - 1)).toBeLessThan(peakBetween(hits[0]!, hits[1]!));
  });
});

describe("the chest", () => {
  it("is a real hinge: the lid goes from shut, past its rest, and back", () => {
    expect(LID_DEGREES[0]).toBe(0);
    expect(Math.max(...LID_DEGREES)).toBeGreaterThan(LID_DEGREES[LID_DEGREES.length - 1]!);
    for (const n of LID_DEGREES.keys()) expect(css).toContain(`[data-lid="${n}"] .cr-f${n}`);
    expect(CHEST_VIEW.w).toBeGreaterThan(0);
  });

  it("reaches a stand on the ground, and gold is left in the box at the end", () => {
    expect(source).toContain("<ChestWorld />");
    expect(source).toContain("<ChestFloor />");
    expect(source).toContain("drained={emptied}");
    expect(css).toMatch(/\.chest-world__foot[\s\S]*?var\(--chest-land-foot\)/);
  });
});

describe("the screen", () => {
  it("keeps the owner's chest: one tap target, no other button, tap to continue", () => {
    expect(source.match(/<button/g)).toHaveLength(1);
    expect(source).toContain('"Tap to continue"');
    expect(css).toMatch(/\.chest-open \{[\s\S]*?position: fixed;[\s\S]*?inset: 0;[\s\S]*?background: var\(--chest-ground\)/);
  });

  it("moves the number only when a coin lands", () => {
    expect(source).toContain("setTally(steps[landed - 1]");
    expect(source.match(/setTally\(/g)).toHaveLength(1);
  });

  it("writes the tally in the balance's own lettering", () => {
    expect(source).toContain("<CoinNumerals text={`+${tally}`} />");
  });

  it("listens to the site's motion switch as well as the OS, in code and in the stylesheet", () => {
    expect(source).toContain("useReducedMotionPref");
    expect(css).toMatch(/html\[data-motion="reduced"\] \.chest-open \*/);
    // Last in the file, so no later rule can win it back.
    expect(css.lastIndexOf('html[data-motion="reduced"]')).toBeGreaterThan(css.lastIndexOf("@keyframes"));
  });

  it("flies with no per-frame filter", () => {
    const flyer = css.slice(css.indexOf(".chest-coin {"), css.indexOf("/* What it paid. */"));
    expect(flyer).not.toMatch(/\bfilter:/);
    expect(css.match(/\.chest-spray \{[^}]*\}/)?.[0] ?? "").not.toMatch(/\bfilter:/);
  });
});
