/**
 * The coin stream's count (app/ui/CoinStream.tsx): the counter only moves when a
 * coin lands, so the steps must climb, never go back, and end on the true total.
 */
import { describe, expect, it } from "vitest";
import { STREAM_COIN_MAX, streamCoinCount, streamSteps } from "../app/ui/CoinStream";

describe("coin stream", () => {
  it("flies one coin per coin, up to the most that read", () => {
    expect(streamCoinCount(0)).toBe(0);
    expect(streamCoinCount(3)).toBe(3);
    expect(streamCoinCount(50)).toBe(STREAM_COIN_MAX);
    expect(streamCoinCount(-4)).toBe(0);
  });

  it("steps climb monotonically and end on the balance", () => {
    for (const [before, after] of [
      [0, 1],
      [1945, 1995],
      [10, 13],
      [999, 1124],
    ] as const) {
      const count = streamCoinCount(after - before);
      const steps = streamSteps(before, after, count);
      expect(steps).toHaveLength(count);
      expect(steps[steps.length - 1]).toBe(after);
      let last: number = before;
      for (const step of steps) {
        expect(step).toBeGreaterThanOrEqual(last);
        last = step;
      }
    }
  });

  it("no coins, no steps", () => {
    expect(streamSteps(5, 5, 0)).toEqual([]);
  });
});
