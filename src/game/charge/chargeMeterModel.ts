/**
 * The charge meter, as data. No React, no DOM, no colours.
 *
 * THE PICTURE THIS IMPLEMENTS is
 * `docs/reference/design-goals/blueberry_spec-meter-states_1788291102.png`. Its
 * top row is this component and its four named states, and the names below are
 * the picture's own words rather than ones invented here:
 *
 *   full      A stadium capsule filled end to end in the goal green, with a
 *             soft green halo around it and the flask endcap holding green.
 *   spending  The capsule part filled in violet, with a 3D chip straddling its
 *             top edge carrying the deduction. The picture draws a bare minus;
 *             ours carries the NUMBER, because a meter that says how much is
 *             going is strictly more honest than one that says only that some
 *             is, and every other number on this surface is read rather than
 *             typed.
 *   empty     An outline with nothing in it, a clock inside it, and the flask
 *             endcap dry. The clock is the whole argument: what a student needs
 *             at zero is not the amount, it is that it comes back.
 *   exam      NOT A METER. See `exam` below.
 *
 * FOUR STATES COVER EVERY VALUE, and the one that does the covering is
 * `spending`: it is "has charge, not brim full", so a meter resting at 17 of 30
 * is in it. Adding a fifth state for that case would put a name in the
 * vocabulary the committed states sheet does not have.
 *
 * WHAT SEPARATES THE RESTING PARTIAL METER FROM ONE BEING SPENT is `spendingNow`
 * rather than the state, and the field carries the argument. In short: the
 * picture draws no partial meter at rest, DESIGN-GOALS says filled bars are
 * green, and the violet belongs to the moment something is actually taken.
 *
 * THE EXAM STATE REPLACES THE METER RATHER THAN FILLING IT. docs/ECONOMY.md
 * switches Charge off completely for the fortnight before the exam and calls
 * that "the whole ethical argument for the mechanic in one gesture". A meter
 * drawn full is still a meter, and a student who can see a meter still counts
 * it, so a paused meter nags. The states sheet answers with a different KIND of
 * object in the meter's slot: a calm speech bubble naming the window. So this
 * model reports no fractions at all in that state, because there is nothing
 * for a renderer to fill.
 *
 * EVERY NUMBER IS READ, NEVER ADDED UP HERE. The balance, the cap, the exam
 * window and the days left all come off `deriveEconomy`'s snapshot; the spend
 * comes from `chargeCostFor` by way of the caller. docs/ECONOMY.md's Anti-abuse
 * section: "The client animates what the server concluded."
 *
 * THE ANTI-PATTERN THIS SURFACE IS WRITTEN AGAINST is named in
 * docs/THREE-TEACHERS.md: the bar's newer energy system deducts on every
 * question, right or wrong, and reads as more restrictive than what it
 * replaced. docs/ECONOMY.md already rules that mistakes never cost charge, and
 * the states sheet prints that promise under the empty meter in the picture. So
 * `caption` carries it, it is not optional decoration, and the reassurance IS
 * the feature: a student staring at an empty limiter assumes being wrong
 * drained it, because every limiter they have met priced mistakes.
 *
 * NOT THROUGH t(). Same rule as hudModel.ts and chargeGateModel.ts: these state
 * what the economy did, and a mistranslated "mistakes never cost charge" is a
 * promise broken in another language.
 */

import { CHARGE_REGEN_MINUTES, type EconomySnapshot } from "@blueberry/economy";

/** The four states of the committed states sheet, in its own words. */
export type ChargeMeterState = "full" | "spending" | "empty" | "exam";

/**
 * What the flask endcap holds, and it is the same liquid as the fill.
 *
 * `progress` is the goal green, `charge` the identity violet, `dry` an outline
 * with nothing in it. WHICH ONE IS NOT DECIDED BY THE STATE, it is decided by
 * whether a spend is in flight, and the reason is in `spendingNow` below.
 */
export type FlaskLiquid = "progress" | "charge" | "dry";

export interface ChargeMeterModel {
  readonly state: ChargeMeterState;
  readonly current: number;
  readonly cap: number;
  /**
   * The part of the meter that STAYS, 0 to 1. In every state but `spending`
   * with a cost in flight this is the whole of the charge on hand.
   */
  readonly keepFraction: number;
  /** The part about to go, 0 to 1. Zero unless a spend is in flight. */
  readonly leaveFraction: number;
  /** How much is going, in points. Zero at rest. The chip's own number. */
  readonly spend: number;
  /**
   * Where the chip sits, 0 to 1: the middle of the segment that is leaving.
   * Zero when nothing is leaving, where the renderer draws no chip at all.
   */
  readonly chipAt: number;
  /** The chip's word. "-8". Empty when nothing is leaving. */
  readonly chipLabel: string;
  readonly flask: FlaskLiquid;
  /**
   * A spend is in flight, so the fill is violet rather than green and the chip
   * is drawn. Not the same question as `state`, which is also `spending` for a
   * meter merely resting below the cap.
   *
   * WHY THE COLOUR HANGS OFF THIS AND NOT OFF THE STATE. The states sheet draws
   * green at the cap and violet mid-spend and does not draw a partial meter at
   * rest, so the rule for that case is read off DESIGN-GOALS instead: "light
   * green is the PROGRESS semantic everywhere: completed nodes, FILLED BARS,
   * correct states". A resting meter is a filled bar, so it is green, and the
   * violet arrives when something is actually being taken. Colouring by state
   * instead would flip the whole bar from green to violet over a single point
   * between 30 of 30 and 29 of 30, which says nothing happened as loudly as if
   * something had.
   */
  readonly spendingNow: boolean;
  /** The soft green halo, at the cap with nothing going out, and nowhere else. */
  readonly glow: boolean;
  /**
   * How far the next point has come, 0 to 1. Read from `nextRegenAt` against
   * the snapshot's own clock, never accumulated by a tick: docs/ECONOMY.md,
   * Anti-abuse. Zero at the cap and in the exam window, where none is coming.
   */
  readonly nextFraction: number;
  /** Days until the exam, 0 on the day itself. Null outside the window. */
  readonly examDaysLeft: number | null;
  /** The badge's subject. It NAMES the window rather than describing a meter. */
  readonly examWord: string;
  /** What the window did to the meter. One calm word. */
  readonly examStatus: string;
  /**
   * The line under the meter. Empty except at zero, where the picture prints
   * it and where a student most needs it. See the header for why.
   */
  readonly caption: string;
  /** The accessible name. It says the state, never the glyph. */
  readonly label: string;
}

export interface ChargeMeterInput {
  /**
   * Charge about to leave, or leaving right now. The caller reads it from
   * `chargeCostFor(kind, snapshot)`; this file never prices anything.
   *
   * Clamped to what is actually there, so a cost larger than the balance draws
   * an empty meter rather than a negative one. A sheet in that position is in
   * its own empty state and is saying so in words.
   */
  readonly spend?: number;
}

/** docs/ECONOMY.md, Charge rule 2, said where a student is most likely to doubt it. */
const EMPTY_CAPTION = "Refills on its own. Mistakes never cost charge.";

const clamp01 = (n: number): number => (n < 0 ? 0 : n > 1 ? 1 : n);

/** "in 9 days", "tomorrow", "today". A date, not a countdown. */
function whenExam(daysLeft: number): string {
  if (daysLeft <= 0) return "today";
  if (daysLeft === 1) return "tomorrow";
  return `in ${daysLeft} days`;
}

/**
 * How far the next point has travelled, from the derived arrival time.
 *
 * One subtraction against the clock reading the snapshot was computed at. The
 * meter never decrements anything and never starts a timer of its own; a
 * caller that wants this to move re-derives, which is what ChargeGate does.
 */
function nextFractionOf(snapshot: EconomySnapshot): number {
  const { nextRegenAt } = snapshot.charge;
  if (nextRegenAt === null) return 0;
  const remainingMs = Date.parse(nextRegenAt) - Date.parse(snapshot.now);
  if (!Number.isFinite(remainingMs)) return 0;
  return clamp01(1 - remainingMs / (CHARGE_REGEN_MINUTES * 60_000));
}

/**
 * The whole meter, from one snapshot and one optional spend. Pure: same inputs
 * in, same picture out, which is what lets the wrong-answer test compare two
 * models for equality rather than squinting at a screenshot.
 */
export function chargeMeterModel(snapshot: EconomySnapshot, input: ChargeMeterInput = {}): ChargeMeterModel {
  const cap = Math.max(0, snapshot.charge.cap);
  const current = Math.min(Math.max(0, snapshot.charge.current), cap);
  const examDaysLeft = snapshot.charge.examWindow ? (snapshot.charge.examDaysLeft ?? 0) : null;

  if (snapshot.charge.examWindow) {
    const days = examDaysLeft ?? 0;
    return {
      state: "exam",
      current,
      cap,
      keepFraction: 0,
      leaveFraction: 0,
      spend: 0,
      chipAt: 0,
      chipLabel: "",
      flask: "dry",
      spendingNow: false,
      glow: false,
      nextFraction: 0,
      examDaysLeft: days,
      examWord: "Exam window",
      examStatus: "paused",
      caption: "",
      // The days are HERE and not on the badge. A badge that counts down is a
      // countdown, and a countdown is the one thing this fortnight exists to
      // remove; a screen reader asking what this object is still deserves the
      // whole answer.
      label: `Exam window. Charge is paused until your exam, ${whenExam(days)}.`,
    };
  }

  const spend = Math.min(Math.max(0, Math.trunc(input.spend ?? 0)), current);
  const keep = current - spend;
  const keepFraction = cap === 0 ? 0 : keep / cap;
  const leaveFraction = cap === 0 ? 0 : spend / cap;
  const nextFraction = current >= cap ? 0 : nextFractionOf(snapshot);

  const state: ChargeMeterState = spend > 0 ? "spending" : current === 0 ? "empty" : current >= cap ? "full" : "spending";

  const spendingNow = spend > 0;
  const flask: FlaskLiquid = keep === 0 ? "dry" : spendingNow ? "charge" : "progress";

  if (state === "empty") {
    return {
      state,
      current,
      cap,
      keepFraction: 0,
      leaveFraction: 0,
      spend: 0,
      chipAt: 0,
      chipLabel: "",
      flask: "dry",
      spendingNow: false,
      glow: false,
      nextFraction,
      examDaysLeft: null,
      examWord: "",
      examStatus: "",
      caption: EMPTY_CAPTION,
      label: `No charge left of ${cap}. It refills on its own, and mistakes never cost charge.`,
    };
  }

  return {
    state,
    current,
    cap,
    keepFraction,
    leaveFraction,
    spend,
    // The middle of the segment that is going, so the chip stands over the
    // stretch it is talking about rather than at the end of the whole meter.
    chipAt: spend > 0 ? keepFraction + leaveFraction / 2 : 0,
    chipLabel: spend > 0 ? `-${spend}` : "",
    flask,
    spendingNow,
    glow: state === "full",
    nextFraction,
    examDaysLeft: null,
    examWord: "",
    examStatus: "",
    caption: "",
    label:
      spend > 0
        ? `${current} of ${cap} charge, ${spend} leaving`
        : state === "full"
          ? `Charge full, ${cap} of ${cap}`
          : `${current} of ${cap} charge`,
  };
}
