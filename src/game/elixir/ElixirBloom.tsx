/**
 * Bloom living with the elixir: drinks to revive, looks tired when low, falls
 * asleep after a long quiet spell and wakes with a jump on any interaction.
 *
 * Phase is local and small: awake, drinking, asleep, waking. `bloomLook` (pure,
 * tested) turns phase and tier into the face and motion; this file is only the
 * clocks. A drink is triggered by bumping `drinkKey`; the caller owns the
 * numbers and raises `current` at the same time, so the vial fills while Bloom
 * sips. Under reduced motion the berry holds a still frame (Berry handles
 * that), the flask flight and the Zzz drift are off, and the wake is a face
 * change with no jump.
 */
import { useEffect, useRef, useState, type CSSProperties } from "react";
import { Berry } from "../mascot/Berry";
import { ElixirBar, ElixirVial } from "./ElixirVial";
import {
  DRINK_MS,
  lidShare,
  SLEEP_AFTER_MS,
  WAKE_MS,
  bloomLook,
  elixirFraction,
  elixirTier,
  type BloomPhase,
  type ElixirTier,
} from "./elixirModel";
import "./elixir.css";

const WAKE_EVENTS = ["pointerdown", "pointermove", "keydown", "wheel", "touchstart"] as const;

export interface ElixirBloomProps {
  readonly current: number;
  readonly cap: number;
  /** Bump to play a drink. 0 plays none. */
  readonly drinkKey: number;
  readonly reducedMotion: boolean;
  readonly sleepAfterMs?: number;
  readonly sizePx?: number;
}

export function ElixirBloom({
  current,
  cap,
  drinkKey,
  reducedMotion,
  sleepAfterMs = SLEEP_AFTER_MS,
  sizePx = 190,
}: ElixirBloomProps) {
  const [phase, setPhase] = useState<BloomPhase>("awake");
  const [jumpKey, setJumpKey] = useState(0);
  const [gain, setGain] = useState(0);
  const lastCurrent = useRef(current);
  const phaseRef = useRef<BloomPhase>("awake");
  const sleepTimer = useRef<number | undefined>(undefined);
  const settleTimer = useRef<number | undefined>(undefined);

  const go = (next: BloomPhase) => {
    phaseRef.current = next;
    setPhase(next);
  };

  // The nap clock: one timeout, restarted by any interaction.
  useEffect(() => {
    const arm = () => {
      window.clearTimeout(sleepTimer.current);
      sleepTimer.current = window.setTimeout(() => {
        if (phaseRef.current === "awake") go("asleep");
      }, sleepAfterMs);
    };
    const onInput = () => {
      if (phaseRef.current === "asleep") {
        go("waking");
        setJumpKey((k) => k + 1);
        window.clearTimeout(settleTimer.current);
        settleTimer.current = window.setTimeout(() => go("awake"), WAKE_MS);
      }
      arm();
    };
    arm();
    for (const name of WAKE_EVENTS) window.addEventListener(name, onInput, { capture: true, passive: true });
    return () => {
      window.clearTimeout(sleepTimer.current);
      window.clearTimeout(settleTimer.current);
      for (const name of WAKE_EVENTS) window.removeEventListener(name, onInput, { capture: true });
    };
  }, [sleepAfterMs]);

  // A drink: wakes Bloom if needed, plays the sip, then settles.
  useEffect(() => {
    if (drinkKey === 0) return undefined;
    go("drinking");
    setGain(Math.max(0, current - lastCurrent.current));
    setJumpKey((k) => k + 1);
    window.clearTimeout(settleTimer.current);
    settleTimer.current = window.setTimeout(() => go("awake"), DRINK_MS);
    return () => window.clearTimeout(settleTimer.current);
  }, [drinkKey]);

  useEffect(() => {
    lastCurrent.current = current;
  }, [current]);

  const tier = elixirTier(elixirFraction(current, cap));
  return (
    <div className="elx-stage" data-phase={phase} data-tier={tier} data-motion={reducedMotion ? "still" : "live"}>
      <span className="elx-flash" aria-hidden />
      <ElixirBar current={current} cap={cap} reducedMotion={reducedMotion} />
      <div className="elx-row">
        <ElixirBerry phase={phase} tier={tier} jumpKey={jumpKey} reducedMotion={reducedMotion} sizePx={sizePx} />
        <ElixirVial current={current} cap={cap} reducedMotion={reducedMotion} showCount={false} />
      </div>
      {phase === "drinking" && gain > 0 ? (
        <p className="elx-gain" aria-hidden>
          +{gain}
        </p>
      ) : null}
      <span className="elx-drops" aria-hidden>
        <i /><i /><i /><i /><i /><i /><i />
      </span>
      <p className="elx-note" role="status">
        {phase === "asleep"
          ? "Bloom is asleep. Tap anywhere to wake it."
          : phase === "drinking"
            ? "Ahh. Back to full."
            : tier === "empty"
              ? "Out of elixir. It refills over time."
              : tier === "low"
                ? "Running low. Bloom is a little tired."
                : ""}
      </p>
    </div>
  );
}

/**
 * Just the berry with its elixir face: heavy lids when low, Zzz when asleep,
 * the flask and the pour when drinking. The gallery stage and the real charge
 * sheet both use this, so the tired face is drawn in one place.
 */
export function ElixirBerry({
  phase,
  tier,
  jumpKey,
  reducedMotion,
  sizePx,
}: {
  readonly phase: BloomPhase;
  readonly tier: ElixirTier;
  readonly jumpKey: number;
  readonly reducedMotion: boolean;
  readonly sizePx: number;
}) {
  const look = bloomLook(phase, tier);
  const lid = lidShare(tier);
  return (
    <div
      className="elx-bloom"
      data-tired={look.tired ? "yes" : "no"}
      data-lid={look.tired && lid > 0 ? tier : undefined}
      style={look.tired ? ({ "--elx-lid": `${Math.round(lid * 100)}%` } as CSSProperties) : undefined}
      data-testid="elx-bloom"
    >
      <Berry
        mood={look.mood}
        behaviour={look.behaviour}
        behaviourKey={jumpKey}
        {...(phase === "waking" ? { chain: ["bounce" as const] } : {})}
        sparkleKey={phase === "drinking" ? jumpKey : 0}
        reducedMotion={reducedMotion}
        sizePx={sizePx}
      />
      {look.zzz ? (
        <span className="elx-zzz" aria-hidden>
          <i>z</i>
          <i>z</i>
          <i>Z</i>
        </span>
      ) : null}
      <span className="elx-sip" aria-hidden>
        <svg viewBox="0 0 24 24">
          <path d="M9 2h6v2h-1v4.2l5 9.3A2.5 2.5 0 0 1 16.8 21H7.2A2.5 2.5 0 0 1 5 17.5l5-9.3V4H9z" />
        </svg>
      </span>
    </div>
  );
}
