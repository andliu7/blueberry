/**
 * The coin balance, drawn as a treasury: the header cell, the header's readout
 * sheet and the shop all use this one component, so a balance looks the same
 * and moves the same wherever it is read.
 *
 * THE ANATOMY, ONE OBJECT UNDER ONE LIGHT. The coin and the rail paint from the same
 * three golds with the light from above and a little left (hud.css, HudIcons.tsx), and
 * the coin drops a soft contact shadow on the rail, so it sits in front of the bar.
 * The rail is a slot: the digits (CoinNumerals.tsx) sit fully inside it, white, with
 * room above and below. See coinCounter.test.ts.
 *
 * THE RAIL IS A METER: A DARK TRACK AND FLAT GOLD WITH A STRAIGHT LEADING EDGE. The
 * eye reads how full the treasury is before it reads the digits, and the digits
 * straddle the edge. The track keeps its length as the number grows, up to five
 * digits, so two balances compare by the gold alone.
 *
 * WHAT THE GOLD MEASURES. A full treasury is TREASURY_FULL coins, climbed in the rungs
 * of TREASURY_AT, each rung one equal step of the track. The first nine rungs are the
 * shelf's stacks, so the gold is also how far along the shelf a student is. It never
 * restarts: more coins always means more gold and a spend always means less. Coins
 * past the top are still kept and counted; the capacity is a scale and never a limit.
 *
 * THE EDGE CANNOT STAND IN A THOUSANDS GAP. Four digits start half way along the
 * track and the gap sits in the first quarter, and it goes the same way at every
 * length, so no nudge is needed. coinCounter.test.ts walks the balances to check.
 *
 * THE ROLL. 1.1 seconds whatever the amount, measured off the bar, so a big
 * payout rolls faster rather than longer. The bar's counter does not otherwise
 * react. This one kicks as the roll starts, spins its top coin, runs a glint
 * along the rail, pops on landing and shows the amount as +N. A spend gets a dip
 * with no spin. Under reduced motion the number changes at once and +N stands
 * still for two seconds, so the fact survives without the movement.
 *
 * THE ARRIVAL (reward gauntlet, Nov). A payout earned off screen used to arrive
 * as a number rolling on its own. Now the coins fly in (CoinStream.tsx): the
 * header, back from a lesson with more than it last drew, throws a stream from
 * the middle of the screen into its coin, and the reward screen throws one from
 * its chest. The number steps only as each coin lands, the +N under the rail
 * grows with it, and the coin swallows each one. Reduced motion skips the
 * flight and keeps the still +N.
 */

import { useCallback, useEffect, useId, useRef, useState, type CSSProperties, type ReactNode } from "react";
import { useReducedMotionPref } from "@/lib/motionPref";
import type { Point } from "../../chest/payoutPath";
import { CoinNumerals } from "./CoinNumerals";
import { CoinStream, streamCoinCount, streamSteps } from "./CoinStream";
import { COIN_BODY, CoinEdgeStops } from "./HudIcons";

const ROLL_MS = 1100;
const LAND_MS = 420;
const GAIN_MS = 1700;
const GAIN_STILL_MS = 2000;

/** A balance with its thousands split by a thin space, the way the bar reads. */
export function formatCoins(amount: number): string {
  return String(Math.max(0, Math.round(amount))).replace(/\B(?=(\d{3})+(?!\d))/g, " ");
}

/** Balances at which the sheet's shelf gains a stack. Length is the stack count. */
const SHELF_AT: readonly number[] = [1, 25, 50, 100, 200, 400, 700, 1000, 2000];
/** Balances at which the header's coin gains a disc under it. */
const PILE_AT: readonly number[] = [50, 200, 1000];

/** The rungs of the rail, each one equal step of the track, and the top is full. */
const TREASURY_AT: readonly number[] = [...SHELF_AT, 5000, 10000, 25000, 50000, 100000, 250000, 1000000];
/** The balance at which the gold reaches the end of the track. */
export const TREASURY_FULL = 1000000;

const reached = (steps: readonly number[], balance: number) => steps.filter((step) => balance >= step).length;

/** How many stacks stand on the sheet's shelf at this balance. */
export const shelfStacks = (balance: number): number => reached(SHELF_AT, balance);
/** How many discs sit under the header's coin at this balance. */
export const pileDiscs = (balance: number): number => reached(PILE_AT, balance);

/**
 * How full the rail is, and how far off the next stack is. `toNext` is null once
 * the shelf is full; the fraction goes on climbing until TREASURY_FULL.
 */
export function treasuryProgress(balance: number): { readonly fraction: number; readonly toNext: number | null } {
  const stored = Math.max(0, Math.round(balance));
  const nextStack = SHELF_AT[reached(SHELF_AT, stored)];
  const toNext = nextStack === undefined ? null : nextStack - stored;
  const rung = reached(TREASURY_AT, stored);
  const next = TREASURY_AT[rung];
  if (next === undefined) return { fraction: 1, toNext };
  const from = TREASURY_AT[rung - 1] ?? 0;
  return { fraction: (rung + (stored - from) / (next - from)) / TREASURY_AT.length, toNext };
}

/** The sheet's sentence for what the fill is drawing. */
export function treasuryNote(balance: number): string {
  const { toNext } = treasuryProgress(balance);
  if (toNext === null) return balance < TREASURY_FULL ? "Your shelf is full, and the gold keeps climbing" : "Your shelf is full";
  const coins = `${formatCoins(toNext)} ${toNext === 1 ? "coin" : "coins"}`;
  return `${coins} to your ${shelfStacks(balance) === 0 ? "first" : "next"} stack`;
}

type Phase = "idle" | "rolling" | "landed";

interface CoinRoll {
  readonly shown: number;
  readonly phase: Phase;
  /** The change being shown: its size, and a key so each one mounts fresh. */
  readonly gain: { readonly key: number; readonly amount: number } | null;
}

/**
 * The last balance the header drew, kept outside the component on purpose, the
 * same way Hud.tsx keeps `xpSeen`: a lesson runs outside the Shell, so the header
 * is unmounted while coins are earned. Comparing against this on the way back is
 * what lets the student watch them arrive. Null until the header has drawn once,
 * so a page load never plays a payout that did not happen.
 */
let headerSeen: number | null = null;

function useCoinRoll(target: number, reducedMotion: boolean, remember: boolean, instant: boolean, initial?: number): CoinRoll {
  const [shown, setShown] = useState(() => initial ?? (remember && headerSeen !== null ? headerSeen : target));
  const [phase, setPhase] = useState<Phase>("idle");
  const [gain, setGain] = useState<CoinRoll["gain"]>(null);
  // What is on screen right now. A ref, because updating it must not render.
  const shownRef = useRef(shown);
  const gainKey = useRef(0);

  useEffect(() => {
    if (remember) headerSeen = target;
    const from = shownRef.current;
    if (from === target) return;
    gainKey.current += 1;
    const key = gainKey.current;
    const delta = target - from;
    // Changes that land while the last +N is still up add to it: coins landing
    // one at a time read +10, +20 ... +50, not five separate fives.
    setGain((prev) =>
      prev !== null && Math.sign(prev.amount) === Math.sign(delta) ? { key, amount: prev.amount + delta } : { key, amount: delta },
    );
    const timers: number[] = [];
    const clearGainAfter = (ms: number) => {
      timers.push(window.setTimeout(() => setGain(null), ms));
    };

    if (reducedMotion || instant) {
      shownRef.current = target;
      setShown(target);
      setPhase("idle");
      clearGainAfter(reducedMotion ? GAIN_STILL_MS : GAIN_MS);
      return () => timers.forEach((id) => window.clearTimeout(id));
    }

    setPhase("rolling");
    clearGainAfter(GAIN_MS);
    const start = performance.now();
    let frame = 0;
    const step = (now: number) => {
      const t = Math.min(1, (now - start) / ROLL_MS);
      // Ease out, so the last few units land slowly enough to be read.
      const eased = 1 - (1 - t) * (1 - t) * (1 - t);
      const value = t === 1 ? target : Math.round(from + (target - from) * eased);
      shownRef.current = value;
      setShown(value);
      if (t < 1) {
        frame = requestAnimationFrame(step);
        return;
      }
      setPhase("landed");
      timers.push(window.setTimeout(() => setPhase("idle"), LAND_MS));
    };
    frame = requestAnimationFrame(step);
    return () => {
      cancelAnimationFrame(frame);
      timers.forEach((id) => window.clearTimeout(id));
    };
  }, [target, reducedMotion, remember, instant]);

  return { shown, phase, gain };
}

/** The discs under the header's coin: the same thick edge, turning under the same light. */
function CoinPile({ discs }: { readonly discs: number }) {
  const id = useId().replace(/[^a-zA-Z0-9]/g, "");
  if (discs === 0) return null;
  const slices = Array.from({ length: discs }, (_, i) => discs - i);
  return (
    <svg viewBox="0 0 24 30" className="coin-counter-pile" aria-hidden focusable="false">
      <defs>
        <linearGradient id={`${id}edge`} x1="0" y1="0" x2="1" y2="0">
          <CoinEdgeStops />
        </linearGradient>
      </defs>
      {slices.map((n) => (
        <path
          key={n}
          d={COIN_BODY}
          transform={`translate(0 ${n * 2})`}
          fill={`url(#${id}edge)`}
          stroke="var(--coin-line)"
          strokeWidth="0.42"
          strokeLinejoin="round"
        />
      ))}
    </svg>
  );
}

export function CoinCounter({
  value,
  reducedMotion,
  mark,
  size = "inline",
  remember = false,
  instant = false,
  pile = false,
  payFrom,
  payOrigin,
  payDelay = 420,
  payLayer,
  onPaid,
  onStep,
}: {
  /** The balance to show. It rolls to a new one whenever this changes. */
  readonly value: number;
  readonly reducedMotion: boolean;
  /** The coin, sized by the caller: the header keeps its one shared mark box. */
  readonly mark: ReactNode;
  readonly size?: "inline" | "hero";
  /** The header only: remember the last balance across a lesson. */
  readonly remember?: boolean;
  /** Change the number at once, with the bump: coins landing one at a time set their own pace. */
  readonly instant?: boolean;
  /** Draw the discs under the coin. */
  readonly pile?: boolean;
  /**
   * Fly the gain in as coins, from this balance up to `value`. The header works
   * this out itself (`remember`); the reward screen passes it with `payOrigin`.
   */
  readonly payFrom?: number;
  /** Where the paying coins leave from. Defaults to the middle of the screen. */
  readonly payOrigin?: () => Point | null;
  /** Ms before the first coin leaves. */
  readonly payDelay?: number;
  /** The layer the paying coins fly in. Default: above everything on the page. */
  readonly payLayer?: HTMLElement | null;
  /** Every paid coin is in. */
  readonly onPaid?: () => void;
  /** A paid coin landed: the balance the number now reads, so a goal bar can fill in step. */
  readonly onStep?: (balance: number) => void;
}) {
  // The attribute carries the Settings switch as well as the OS, which the
  // caller's prop does not: without this the digits would roll with the switch on.
  const reducedPref = useReducedMotionPref();
  const still = reducedMotion || reducedPref;
  // The payout to fly in, decided once on arrival: the caller's, or for the
  // header, the coins earned while it was away. Never on a page load.
  const [pay] = useState(() => {
    const from = payFrom ?? (remember ? headerSeen : null);
    if (still || from === null || value <= from) return null;
    return { from, count: streamCoinCount(value - from), steps: streamSteps(from, value, streamCoinCount(value - from)) };
  });
  const [paidTo, setPaidTo] = useState<number | null>(pay === null ? null : pay.from);
  const rootRef = useRef<HTMLSpanElement>(null);
  const [catchTick, setCatchTick] = useState(0);
  const [landedAll, setLandedAll] = useState(false);
  const flying = paidTo !== null && !landedAll;
  // While coins land, and after, until the balance moves on, the number IS the
  // landing: read straight from the step, never through the roll's effect, which
  // can trail a landing behind and leave the counter a step under the goal card.
  const held = paidTo !== null && (flying || value === paidTo);
  const roll = useCoinRoll(held ? paidTo : value, still, remember, instant || held, pay?.from);
  const shown = held ? paidTo : roll.shown;
  const phase = roll.phase;
  // The +N under the rail (reward gauntlet, round 4): the whole payout, from the
  // first frame of the flight, so it never reads +0 and always agrees with the
  // amount the reward screen shows. The balance above it climbs as coins land.
  // Once every coin is in it pops again, keyed afresh, and then fades.
  const gain =
    pay !== null && flying
      ? { key: -1, amount: value - pay.from }
      : roll.gain !== null && held && pay !== null
        ? { key: roll.gain.key, amount: paidTo - pay.from }
        : roll.gain;
  const coinCentre = useCallback((): Point | null => {
    const coin = rootRef.current?.querySelector(".coin-counter-coin")?.getBoundingClientRect();
    if (coin === undefined || coin.width === 0) return null;
    return { x: coin.left + coin.width / 2, y: coin.top + coin.height / 2 };
  }, []);
  const origin = useCallback(
    (): Point | null => payOrigin?.() ?? { x: window.innerWidth / 2, y: window.innerHeight * 0.58 },
    [payOrigin],
  );
  const land = useCallback(
    (landed: number) => {
      const at = pay?.steps[landed - 1] ?? value;
      setPaidTo(at);
      setCatchTick((n) => n + 1);
      onStep?.(at);
    },
    [pay, value, onStep],
  );
  // The last landing already set the true total, and the number stays held on it
  // (above), so nothing rolls again from the step before it.
  const paid = useCallback(() => {
    setLandedAll(true);
    onPaid?.();
  }, [onPaid]);
  const discs = pile ? pileDiscs(value) : 0;
  const down = gain !== null && gain.amount < 0;
  return (
    <span
      ref={rootRef}
      className={`coin-counter${size === "hero" ? " coin-counter--hero" : ""}`}
      data-catch={catchTick === 0 ? undefined : catchTick % 2 === 0 ? "a" : "b"}
      data-paying={flying ? "" : undefined}
      data-phase={phase}
      data-dir={down ? "down" : "up"}
      style={{ "--cc-discs": discs, "--cc-frac": treasuryProgress(shown).fraction.toFixed(3) } as CSSProperties}
    >
      <span className="coin-counter-rail" aria-hidden>
        {/* Follows the rolling number through --cc-frac, so the gold climbs as the coins come in. */}
        <span className="coin-counter-fill" data-coin-fill />
        <span className="coin-counter-glint" />
      </span>
      <span className="coin-counter-stack" aria-hidden>
        <CoinPile discs={discs} />
        <span className="coin-counter-coin">{mark}</span>
      </span>
      <span className="hud-value coin-counter-value" data-coin-value>
        <span className="sr-only">{formatCoins(shown)}</span>
        <CoinNumerals text={formatCoins(shown)} />
      </span>
      {gain === null ? null : (
        <span key={gain.key} className="coin-counter-gain" data-hold={gain.key === -1 ? "" : undefined} aria-hidden>
          <CoinNumerals text={`${gain.amount > 0 ? "+" : "−"}${formatCoins(Math.abs(gain.amount))}`} />
        </span>
      )}
      <span className="sr-only" aria-live="polite">
        {gain === null || flying ? "" : `${gain.amount > 0 ? "Plus" : "Minus"} ${Math.abs(gain.amount)} ${Math.abs(gain.amount) === 1 ? "coin" : "coins"}.`}
      </span>
      {pay !== null ? <CoinStream count={pay.count} from={origin} to={coinCentre} delay={payDelay} layer={payLayer} onLand={land} onDone={paid} /> : null}
    </span>
  );
}

/* The sheet's shelf: stacks of flat discs seen from the side. */
const DISC_RX = 15;
const DISC_RY = 5;
const DISC_H = 6;

/** Where each stack stands, in the order they appear. Back row first when drawn. */
const STACKS: readonly { readonly x: number; readonly y: number; readonly discs: number }[] = [
  { x: 140, y: 96, discs: 3 },
  { x: 108, y: 96, discs: 2 },
  { x: 172, y: 96, discs: 4 },
  { x: 124, y: 86, discs: 7 },
  { x: 156, y: 86, discs: 9 },
  { x: 76, y: 96, discs: 3 },
  { x: 204, y: 96, discs: 2 },
  { x: 92, y: 86, discs: 5 },
  { x: 188, y: 86, discs: 6 },
];

/** One stack: edges turning under the light, and a top with the coin's rim, gradient field and soft shine. */
function CoinStack({ x, y, discs, order, id }: { readonly x: number; readonly y: number; readonly discs: number; readonly order: number; readonly id: string }) {
  const top = -discs * DISC_H;
  return (
    <g transform={`translate(${x} ${y})`}>
      <ellipse cx="2" cy="1" rx={DISC_RX + 4} ry={DISC_RY + 1.6} fill={`url(#${id}ground)`} />
      <g className="treasury-stack" style={{ "--i": order } as CSSProperties}>
        {Array.from({ length: discs }, (_, i) => (
          <path
            key={i}
            transform={`translate(0 ${-i * DISC_H})`}
            d={`M${-DISC_RX} ${-DISC_H}v${DISC_H}a${DISC_RX} ${DISC_RY} 0 0 0 ${DISC_RX * 2} 0v${-DISC_H}z`}
            fill={`url(#${id}edge)`}
            stroke="var(--coin-line)"
            strokeWidth="0.45"
            strokeLinejoin="round"
          />
        ))}
        <ellipse cx="0" cy={top} rx={DISC_RX} ry={DISC_RY} fill={`url(#${id}rim)`} stroke="var(--coin-line)" strokeWidth="0.45" />
        <ellipse cx="0" cy={top + 0.2} rx={DISC_RX - 2.8} ry={DISC_RY - 1} fill={`url(#${id}wall)`} />
        <ellipse cx="0" cy={top + 0.3} rx={DISC_RX - 3.8} ry={DISC_RY - 1.5} fill={`url(#${id}field)`} />
        <ellipse cx="-3.4" cy={top - 0.5} rx="5.5" ry="1.5" fill={`url(#${id}bloom)`} />
      </g>
    </g>
  );
}

/** What the balance has built: more stacks as it grows, none at zero. */
export function TreasuryShelf({ balance }: { readonly balance: number }) {
  const id = useId().replace(/[^a-zA-Z0-9]/g, "");
  const count = shelfStacks(balance);
  if (count === 0) return null;
  const standing = STACKS.slice(0, count)
    .map((stack, order) => ({ ...stack, order }))
    .sort((a, b) => a.y - b.y);
  return (
    <svg viewBox="52 22 176 84" className="treasury-shelf" aria-hidden focusable="false">
      <defs>
        <linearGradient id={`${id}edge`} x1="0" y1="0" x2="1" y2="0">
          <CoinEdgeStops />
        </linearGradient>
        <radialGradient id={`${id}ground`}>
          <stop offset="0.45" stopColor="var(--coin-line)" stopOpacity="0.34" />
          <stop offset="1" stopColor="var(--coin-line)" stopOpacity="0" />
        </radialGradient>
        <linearGradient id={`${id}rim`} x1="0.32" y1="0" x2="0.68" y2="1">
          <stop offset="0" stopColor="var(--coin-rim-hi)" />
          <stop offset="0.5" stopColor="var(--coin-rim)" />
          <stop offset="1" stopColor="var(--coin-amber)" />
        </linearGradient>
        <linearGradient id={`${id}wall`} x1="0.32" y1="0" x2="0.68" y2="1">
          <stop offset="0" stopColor="var(--coin-ring)" />
          <stop offset="1" stopColor="var(--coin-shine)" />
        </linearGradient>
        <radialGradient id={`${id}field`} cx="0.36" cy="0.26" r="0.92">
          <stop offset="0" stopColor="var(--cc-fill-hi)" />
          <stop offset="0.5" stopColor="var(--cc-fill)" />
          <stop offset="1" stopColor="var(--cc-fill-lo)" />
        </radialGradient>
        <radialGradient id={`${id}bloom`}>
          <stop offset="0" stopColor="var(--coin-shine)" stopOpacity="0.9" />
          <stop offset="1" stopColor="var(--coin-shine)" stopOpacity="0" />
        </radialGradient>
      </defs>
      {standing.map((stack) => (
        <CoinStack key={stack.order} x={stack.x} y={stack.y} discs={stack.discs} order={stack.order} id={id} />
      ))}
    </svg>
  );
}
