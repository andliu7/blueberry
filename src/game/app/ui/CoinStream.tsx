/**
 * A stream of coins flying into a coin counter: the moment a payout is SEEN to
 * arrive, rather than a number that changes on its own.
 *
 * WHERE IT IS USED. The header counter plays it when it comes back from a lesson
 * with more coins than it last drew (CoinCounter.tsx, `remember`), so a finished
 * lesson's coins visibly land in the top bar. The coin reward screen
 * (GemReward.tsx) plays it from its chest's mouth into the counter it carries.
 *
 * THE PATHS ARE THE CHEST'S (payoutPath.ts): a throw up out of the source, a
 * spray, then one ribbon swept into the counter's coin. Pure numbers, so the
 * same payout always flies the same way. The coin is the header's own heavy coin,
 * so what lands is visibly the thing it lands in.
 *
 * THE COUNT IS HONEST. The counter moves only when a coin lands, by
 * `streamSteps`, and ends on the true total however many coins flew.
 *
 * REDUCED MOTION never mounts this: the caller shows the total at once.
 */
import { useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { coinFlight, launchDelays, type PayoutStage, type Point } from "../../chest/payoutPath";
import { DiamondMark } from "./HudIcons";
import "./coinStream.css";

/** The most coins that fly for one payout: past this a coin carries more than one. */
export const STREAM_COIN_MAX = 14;

/** How many coins fly for a gain: one per coin, up to the most that read as a stream. */
export function streamCoinCount(gain: number): number {
  return Math.max(0, Math.min(STREAM_COIN_MAX, Math.floor(gain)));
}

/**
 * The balance after each landing, from `before` to `after` in `count` steps. The
 * last step is always `after`, and no step goes backwards.
 */
export function streamSteps(before: number, after: number, count: number): readonly number[] {
  if (count <= 0) return [];
  return Array.from({ length: count }, (_unused, i) =>
    i === count - 1 ? after : before + Math.round(((after - before) * (i + 1)) / count),
  );
}

export interface CoinStreamProps {
  readonly count: number;
  /** Where the coins leave from, measured at launch. */
  readonly from: () => Point | null;
  /** The counter's coin, measured at launch. Null (hidden counter) skips the flight. */
  readonly to: () => Point | null;
  /** Ms after mount before the first coin leaves. */
  readonly delay?: number;
  /** How high above the source the coins climb, at most. */
  readonly rise?: number;
  /**
   * Where the coins fly, in paint order. Default: the page body, above every bar.
   * A reward screen passes its own layer, so the coins pass under its words.
   */
  readonly layer?: HTMLElement | null;
  /** A coin arrived: `landed` of `count`. */
  readonly onLand: (landed: number, count: number) => void;
  /** Every coin is in, or nothing flew. */
  readonly onDone: () => void;
}

export function CoinStream({ count, from, to, delay = 0, rise = 220, layer, onLand, onDone }: CoinStreamProps) {
  const coinRefs = useRef<(HTMLSpanElement | null)[]>([]);
  // The latest callbacks, so the flight started on mount calls today's handlers.
  const latest = useRef({ from, to, onLand, onDone });
  latest.current = { from, to, onLand, onDone };

  useEffect(() => {
    const animations: Animation[] = [];
    let alive = true;
    const start = window.setTimeout(() => {
      if (!alive) return;
      const source = latest.current.from();
      const target = latest.current.to();
      const els = coinRefs.current.slice(0, count).filter((el): el is HTMLSpanElement => el !== null);
      if (source === null || target === null || els.length === 0 || typeof els[0]!.animate !== "function") {
        latest.current.onDone();
        return;
      }
      const w = window.innerWidth;
      const stage: PayoutStage = {
        from: source,
        to: target,
        rise: Math.max(80, Math.min(rise, source.y - target.y - 40)),
        reach: Math.min(130, w / 2 - 44),
      };
      const delays = launchDelays(els.length);
      let landed = 0;
      els.forEach((el, i) => {
        const flight = coinFlight(i, stage);
        const half = el.offsetWidth / 2;
        const motion = el.animate(
          flight.frames.map((f) => ({
            transform: `translate(${f.x - half}px, ${f.y - half}px) scale(${f.scale})`,
            opacity: 1,
            offset: f.offset,
          })),
          { duration: flight.duration, delay: delays[i] ?? 0, easing: "linear", fill: "forwards" },
        );
        animations.push(motion);
        motion.onfinish = () => {
          if (!alive) return;
          el.style.visibility = "hidden";
          landed += 1;
          latest.current.onLand(landed, els.length);
          if (landed === els.length) latest.current.onDone();
        };
      });
    }, delay);
    return () => {
      alive = false;
      window.clearTimeout(start);
      for (const animation of animations) animation.cancel();
    };
    // One flight per mount: the caller remounts with a key for another.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (typeof document === "undefined") return null;
  return createPortal(
    <span className="coin-stream" aria-hidden>
      {Array.from({ length: count }, (_unused, i) => (
        <span
          key={i}
          ref={(el) => {
            coinRefs.current[i] = el;
          }}
          className="coin-stream__coin"
          style={{ animationDuration: `${360 + ((i * 61) % 200)}ms`, animationDirection: i % 2 === 0 ? "normal" : "reverse" }}
        >
          <DiamondMark heavy className="coin-stream__art" />
        </span>
      ))}
    </span>,
    layer ?? document.body,
  );
}
