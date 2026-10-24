/**
 * WHEN THE UNLOCK ANIMATION PLAYS, owner 23 Oct: "when you complete one
 * lesson, a green glow follows the path down to the next button and that one
 * has a lock unlocking animation and then has a bright glow and slight
 * celebration (not confetti)."
 *
 * It plays ONCE, on the first return to the path after a clear, never on
 * every visit. Which node it plays on is DERIVED, not remembered: the path's
 * status with the latest clear, against the same status without it
 * (pathStatus in sectionStarts.ts). Whatever went from locked to open is what
 * that clear unlocked. A replayed lesson has an earlier clear still in the
 * journal, so nothing changes and nothing plays.
 *
 * The only thing remembered is that it was seen: one localStorage key holding
 * the last celebration's key. See readCelebration for each case.
 *
 * Pure apart from the storage handed in: no React, no DOM.
 */
import type { EconomyEvent } from "@blueberry/economy";
import { checkpointNodeId, type PathwayUnit } from "../../demo/pathwayMap";
import type { SaveStorage } from "../../resume/lessonSave";
import { pathStatus } from "./sectionStarts";
import { unitSections } from "./testOuts";

export interface Celebration {
  /** `${at}|${nodeId}` of the clear: what the seen flag stores. */
  readonly key: string;
  readonly unitId: string;
  /** The stop the glow travels from, or null when the opened node is not the next stop on the same road. */
  readonly from: string | null;
  /** The node that opened. */
  readonly to: string;
}

export const UNLOCK_SEEN_KEY = "bb.path.unlockSeen";
/** A clear older than this (synced from another device, say) is not celebrated. */
export const UNLOCK_FRESH_MS = 15 * 60 * 1000;
/** The flag's value before anything has been celebrated. */
const NOTHING_SEEN = "none";

type ClearEvent = Extract<EconomyEvent, { kind: "node_cleared" }>;

/** The last node_cleared event in the journal, or null. */
export function latestClear(journal: readonly EconomyEvent[]): ClearEvent | null {
  for (let at = journal.length - 1; at >= 0; at -= 1) {
    const event = journal[at]!;
    if (event.kind === "node_cleared") return event;
  }
  return null;
}

const unlocked = (state: string | undefined) => state === "open" || state === "current";

/** What the latest clear unlocked, or null when it unlocked nothing. Pure. */
export function celebrationFor(units: readonly PathwayUnit[], journal: readonly EconomyEvent[]): Celebration | null {
  const clear = latestClear(journal);
  if (clear === null) return null;
  const now = pathStatus(units, journal).status.nodes;
  const before = pathStatus(units, journal.filter((event) => event !== clear)).status.nodes;
  const opened = (id: string) => before.get(id)?.state === "locked" && unlocked(now.get(id)?.state);
  const key = `${clear.at}|${clear.nodeId}`;

  for (const unit of units) {
    for (const section of unitSections(unit)) {
      const at = section.lights.indexOf(clear.nodeId);
      if (at === -1) continue;
      const ahead = section.lights.slice(at + 1);
      const to = ahead.find(opened);
      if (to !== undefined) return { key, unitId: unit.id, from: to === ahead[0] ? clear.nodeId : null, to };
      // The last lesson of a unit opens its check, which draws its own road.
      const checkId = checkpointNodeId(unit.id);
      if (opened(checkId)) return { key, unitId: unit.id, from: null, to: checkId };
      return null;
    }
  }
  return null;
}

/**
 * Whether to play it now, and the seen flag kept in step. The cases:
 *
 *   - storage unavailable: never play (the honest alternative is playing on
 *     every visit)
 *   - nothing to celebrate: null, seeding the flag if there is none yet
 *   - no flag stored yet and something to celebrate (the first visit after
 *     this shipped, or a new device): store the key, do not play, so an old
 *     clear is not replayed
 *   - flag equals the key: already seen
 *   - the clear is older than UNLOCK_FRESH_MS: store, do not play
 *   - otherwise: store the key at once, so a reload never replays it, and play
 */
export function readCelebration(
  units: readonly PathwayUnit[],
  journal: readonly EconomyEvent[],
  storage: SaveStorage | null,
  nowMs: number = Date.now(),
): Celebration | null {
  if (storage === null) return null;
  const found = celebrationFor(units, journal);
  try {
    const seen = storage.getItem(UNLOCK_SEEN_KEY);
    if (found === null) {
      // Seed the flag on a visit with nothing to play, so a new student's
      // very first clear is celebrated rather than taken for an old one.
      if (seen === null) storage.setItem(UNLOCK_SEEN_KEY, NOTHING_SEEN);
      return null;
    }
    if (seen === found.key) return null;
    storage.setItem(UNLOCK_SEEN_KEY, found.key);
    if (seen === null) return null;
    const at = Date.parse(found.key.slice(0, found.key.indexOf("|")));
    if (!Number.isFinite(at) || nowMs - at > UNLOCK_FRESH_MS) return null;
    return found;
  } catch {
    return null;
  }
}
