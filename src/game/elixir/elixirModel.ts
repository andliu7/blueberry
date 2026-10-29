/**
 * Energy as elixir, as data. No React, no DOM.
 *
 * Reference read before building (28 Oct): Clash of Clans keeps the elixir in a
 * thick pink bar with a glossy top edge, a drop on the cap and the number in
 * bold ink over the fill; its storage is a vessel you can see the level in.
 * Duolingo's Energy page is the same idea: a pink capsule, "25 / 25" inside, a
 * bolt cap, and a refill that is an event you can watch. What makes both good
 * is that the level is a SHAPE you read without the number, and that refilling
 * is a moment.
 *
 * The numbers come from the caller (an economy snapshot, or the gallery's own
 * demo). Nothing here prices or counts down anything.
 */

import type { BerryBehaviour } from "../mascot/berryBehaviour";
import type { BerryMood } from "../mascot/berryMood";

export type ElixirTier = "full" | "good" | "low" | "empty";

export function elixirFraction(current: number, cap: number): number {
  if (!Number.isFinite(current) || !Number.isFinite(cap) || cap <= 0) return 0;
  return Math.min(1, Math.max(0, current / cap));
}

export function elixirTier(fraction: number): ElixirTier {
  if (fraction >= 0.999) return "full";
  if (fraction >= 0.4) return "good";
  if (fraction > 0) return "low";
  return "empty";
}

export type BloomPhase = "awake" | "drinking" | "asleep" | "waking";

export interface BloomElixirLook {
  readonly mood: BerryMood;
  readonly behaviour: BerryBehaviour;
  /** A slow breath and a sweat drop: set for low energy, never for sleep. */
  readonly tired: boolean;
  readonly zzz: boolean;
}

/**
 * What Bloom shows. Phase beats tier: a drink or a nap is a moment and the
 * level is a mood. Low energy is calm and a little tired, never sad, because
 * mistakes do not cost charge and the face must not scold.
 */
export function bloomLook(phase: BloomPhase, tier: ElixirTier): BloomElixirLook {
  if (phase === "drinking") return { mood: "cheer", behaviour: "celebrate", tired: false, zzz: false };
  if (phase === "waking") return { mood: "excited", behaviour: "wideEyed", tired: false, zzz: false };
  if (phase === "asleep") return { mood: "sleepy", behaviour: "sleepy", tired: false, zzz: true };
  if (tier === "full") return { mood: "excited", behaviour: "idle", tired: false, zzz: false };
  if (tier === "good") return { mood: "happy", behaviour: "idle", tired: false, zzz: false };
  // "focused" is the one mood with round open eyes and a flat mouth. "calm" drew
  // closed-arch happy eyes and a smile, which is why low energy read as full.
  // The heavy lids themselves are CSS on [data-lid] (elixir.css), so the shared
  // mascot files are not touched.
  if (tier === "low") return { mood: "focused", behaviour: "sleepy", tired: true, zzz: false };
  return { mood: "focused", behaviour: "sleepy", tired: true, zzz: false };
}

/** Quiet time before Bloom nods off. A long idle, on purpose. */
export const SLEEP_AFTER_MS = 90_000;

export function isSleepy(msSinceInput: number, afterMs: number = SLEEP_AFTER_MS): boolean {
  return msSinceInput >= afterMs;
}

/** How far the lids come down: a share of the eye hidden from the top. 0 is wide awake. */
export function lidShare(tier: ElixirTier): number {
  if (tier === "low") return 0.42;
  if (tier === "empty") return 0.66;
  return 0;
}

export const DRINK_MS = 2200;
export const WAKE_MS = 900;

/** Spoken label for the vial. Plain words, no glyphs. */
export function elixirLabel(current: number, cap: number): string {
  const tier = elixirTier(elixirFraction(current, cap));
  const tail = tier === "empty" ? " Empty. It refills over time." : tier === "full" ? " Full." : "";
  return `Energy, ${current} of ${cap}.${tail}`;
}
