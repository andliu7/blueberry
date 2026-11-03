/**
 * The paths the chest's coins fly, as plain numbers: no DOM and no React, so a
 * test can read the arc. Loaded only with ChestOpening, so it stays out of the
 * #/app cold load.
 *
 * Every path is real motion under one gravity, sampled into keyframes the Web
 * Animations API plays linearly. Nothing here is random: the same chest throws
 * the same fountain, and a test can walk it.
 */

/** Pixels per second squared. One value, so every coin weighs the same. */
const GRAVITY = 2600;
/** How long a coin takes to swing from the top of its arc into the tally: long enough to follow by eye. */
const HOMING_S = 0.78;
/** How fast a coin is moving when it hits the tally. */
const STRIKE_SPEED = 1300;
/** How far back a Hermite curve swings against its arrival, per px of arrival tangent. */
const SWING_SHARE = 4 / 27;
const STEP_S = 1 / 30;

/** The most coins that fly at once. A bigger chest pays more per landing. */
export const PAYOUT_COIN_MAX = 24;

/** How many coins fly for a payout: one coin for one coin, up to the most that read. */
export function payoutCoinCount(total: number): number {
  return Math.min(PAYOUT_COIN_MAX, Math.max(0, Math.floor(total)));
}

/** Evenly spread across 0 to 1 without repeating, for any coin number. */
const spread = (i: number, salt: number): number => ((i + 1) * 0.6180339887 + salt) % 1;

/**
 * When each coin leaves, in ms. Dense at first so the opening is a gush, thinning
 * out as the box empties, with the last coin held back so it lands alone: that
 * landing is the finish.
 */
export function launchDelays(count: number): readonly number[] {
  if (count <= 0) return [];
  if (count === 1) return [0];
  const span = Math.min(840, 110 * (count - 1));
  return Array.from({ length: count }, (_unused, i) => {
    const late = i === count - 1 && count > 3 ? 120 : 0;
    return Math.round(span * (i / (count - 1)) ** 1.2) + late;
  });
}

export interface Point {
  readonly x: number;
  readonly y: number;
}

export interface PayoutStage {
  /** The mouth of the box. */
  readonly from: Point;
  /** The tally's coin. */
  readonly to: Point;
  /** The most any coin climbs above the mouth, in px. */
  readonly rise: number;
  /** The width of the spray the coins open into, in px each side, before the stream takes them. */
  readonly reach: number;
}

export interface FlightFrame {
  readonly x: number;
  readonly y: number;
  readonly scale: number;
  /** 0 to 1 along the flight. */
  readonly offset: number;
}

export interface Flight {
  readonly frames: readonly FlightFrame[];
  /** The whole flight, launch to landing, in ms. */
  readonly duration: number;
  /** When it stops falling and starts being pulled in, in ms after launch. */
  readonly hang: number;
}

/**
 * One coin's flight. First a throw: straight up out of the box with a small
 * sideways speed, so the coins leave as a tight column and open into a spray only
 * near the top. Then, already falling, it swings into the tally on a curve that
 * starts at the speed the fall had reached, so there is no kink where the throw
 * ends, and that speeds up all the way to the landing.
 *
 * THE STREAM. Every coin arrives along the same line, from low on the far side, so
 * however wide the spray was the coins draw together into one ribbon, sweeping out
 * and then across the screen: the eye sees where the money is going. How wide that
 * swing is comes from the room the screen has, so it never leaves a phone.
 */
export function coinFlight(i: number, stage: PayoutStage): Flight {
  const peak = stage.rise * (0.72 + 0.28 * spread(i, 0.31));
  const vy = -Math.sqrt(2 * GRAVITY * peak);
  const hang = -vy / GRAVITY + 0.07 + 0.09 * spread(i, 0.67);
  const vx = ((spread(i, 0) - 0.5) * stage.reach) / hang;

  const end = { x: stage.from.x + vx * hang, y: stage.from.y + vy * hang + 0.5 * GRAVITY * hang * hang };
  const endVy = vy + GRAVITY * hang;
  const side = stage.to.x >= stage.from.x ? 1 : -1;
  const room = Math.max(0, stage.from.x - stage.reach / 2 - 34);
  const across = Math.min(0.45, room / (SWING_SHARE * STRIKE_SPEED * HOMING_S));
  const strikeX = side * across * STRIKE_SPEED;
  const strikeY = -0.8 * STRIKE_SPEED;

  const total = hang + HOMING_S;
  const frames: FlightFrame[] = [];
  const steps = Math.ceil(total / STEP_S);
  for (let n = 0; n <= steps; n += 1) {
    const t = (n / steps) * total;
    if (t <= hang) {
      const u = t / hang;
      frames.push({
        x: stage.from.x + vx * t,
        y: stage.from.y + vy * t + 0.5 * GRAVITY * t * t,
        // Near the top it is closest to the viewer.
        scale: 0.55 + 0.55 * Math.min(1, u * 1.5),
        offset: t / total,
      });
    } else {
      // A cubic Hermite curve: leaves at the fall's velocity, arrives at the strike's.
      const u = (t - hang) / HOMING_S;
      const u2 = u * u;
      const u3 = u2 * u;
      const a = 2 * u3 - 3 * u2 + 1;
      const b = u3 - 2 * u2 + u;
      const c = -2 * u3 + 3 * u2;
      const d = u3 - u2;
      frames.push({
        x: a * end.x + b * vx * HOMING_S + c * stage.to.x + d * strikeX * HOMING_S,
        y: a * end.y + b * endVy * HOMING_S + c * stage.to.y + d * strikeY * HOMING_S,
        scale: 1.1 - 0.36 * u,
        offset: t / total,
      });
    }
  }
  return { frames, duration: Math.round(total * 1000), hang: Math.round(hang * 1000) };
}

/** The heaps the spill falls into: shares of the ground's width and depth from the box's foot. */
const HEAPS: readonly Point[] = [
  { x: -0.66, y: 0.3 },
  { x: 0.16, y: 0.66 },
  { x: 0.74, y: 0.12 },
];

/**
 * Where a loose piece comes to rest. Three in four land on one of three heaps, on
 * and against each other, and the rest stray: spilled, not laid out in a row.
 */
export function scatterSpot(i: number, _count: number, width: number, depth: number): Point {
  const jitterX = spread(i, 0.13) - 0.5;
  const jitterY = spread(i, 0.41) - 0.5;
  if (i % 4 === 3) {
    const x = (i % 8 === 3 ? -1 : 1) * (0.28 + 0.62 * spread(i, 0.77));
    return { x: x * width, y: (0.22 + 0.72 * spread(i, 0.59)) * depth };
  }
  const heap = HEAPS[i % HEAPS.length]!;
  return { x: (heap.x + jitterX * 0.3) * width, y: Math.max(0, heap.y + jitterY * 0.34) * depth };
}

export interface SpillFrame {
  readonly x: number;
  readonly y: number;
  /** 0 to 1 of the spin it has done by now. */
  readonly turn: number;
  readonly offset: number;
}

/** The sideways throw that brings a piece to rest `x` px away, given how it falls. */
export function spillThrowFor(x: number, vy: number, floor: number): number {
  const { frames } = spillFlight(1, vy, floor);
  const travelled = frames[frames.length - 1]!.x;
  return travelled === 0 ? 0 : x / travelled;
}

/**
 * A loose piece spilled out of the box: thrown, falling under the same gravity,
 * hitting the floor and bouncing lower each time until it lies still. Its duration
 * is what the sum took, because playing it for any other time changes the gravity.
 */
export function spillFlight(vx: number, vy: number, floor: number): { readonly frames: readonly SpillFrame[]; readonly duration: number; readonly firstHit: number } {
  const points: { t: number; x: number; y: number }[] = [{ t: 0, x: 0, y: 0 }];
  let x = 0;
  let y = 0;
  let v = vy;
  let across = vx;
  let t = 0;
  let bounces = 0;
  let firstHit: number | null = null;
  while (t < 1.9 && bounces < 3) {
    v += GRAVITY * STEP_S;
    x += across * STEP_S;
    y += v * STEP_S;
    t += STEP_S;
    if (y >= floor && v > 0) {
      y = floor;
      if (firstHit === null) firstHit = t;
      v = -v * 0.42;
      // The floor grips it, so it comes to rest near where it first hit.
      across *= 0.45;
      bounces += 1;
    }
    points.push({ t, x, y });
  }
  return {
    frames: points.map((p) => ({ x: p.x, y: p.y, turn: p.t / t, offset: p.t / t })),
    duration: Math.round(t * 1000),
    firstHit: firstHit === null ? t : firstHit,
  };
}
