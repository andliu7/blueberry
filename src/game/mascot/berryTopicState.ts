/**
 * Which chemical state the berry wears on a lesson, by pathway node. Section D
 * of documentation/BLOOM-STATES-SPEC.md.
 *
 * WHY AN EXPLICIT TABLE, NOT A KEYWORD MATCH. A title search for "cation"
 * would put a carbocation on "Rank carbanion stability" and "Charged
 * aromatics". Every row below was picked by reading the node's title and blurb
 * in demo/pathwayMap.ts, and berryTopicState.test.ts checks every id still
 * exists there, so a renamed node fails a test instead of silently going
 * neutral. A node that is not listed is neutral: most lessons are about a
 * reaction, not about what one atom is made of, and a state on every screen
 * would stop meaning anything.
 *
 * Only the states MASCOT.md shipped are used. The spec's `deprotonated` (for
 * the pKa and enolate nodes) is parked with the other three deferred states:
 * berryState.test.ts pins MASCOT.md's deferral, so adding it is the owner's
 * call (spec section 7, question 3). Until then those nodes stay neutral.
 *
 * Nothing calls this at runtime yet: the lesson-mount and first-resonance
 * triggers belong to the wiring family (spec section 4).
 *
 * Same contract as berryState.ts: pure data, no React, no DOM. The one thing
 * remembered (whether the learner has seen a resonance berry) goes through a
 * storage handed in, so the tests run without a browser.
 */

import type { BerryBehaviour } from "./berryBehaviour";
import type { BerryMood } from "./berryMood";
import type { BerryState } from "./berryState";
import type { SaveStorage } from "../resume/lessonSave";

/** Node id to state. Read the comment on each group for the teaching reason. */
export const NODE_STATE: Readonly<Record<string, BerryState>> = Object.freeze({
  // Carbocation: SN1/E1, the allylic cation of diene addition, the arenium
  // ion, and the rearrangements that happen because a cation moved.
  "u1-rank-cation": "carbocation",
  "u1-12v14": "carbocation",
  "u1-hx-dienes": "carbocation",
  "u3-arenium": "carbocation",
  "u3-fc-alkyl": "carbocation",
  "u5-dehydration": "carbocation",
  "u5-pinacol": "carbocation",

  // Radical: allylic and benzylic bromination, radical stability, and the two
  // decarboxylations that go through a radical.
  "u1-rank-radical": "radical",
  "u1-nbs": "radical",
  "u1-nbs-practice": "radical",
  "u3-benzylic-br": "radical",
  "u8-kolbe-e": "radical",
  "u8-hunsdiecker": "radical",

  // Resonance: delocalization is the lesson itself.
  "u1-allylic": "resonance",
  "u4-meisenheimer": "resonance",
  "u9-enolate-res": "resonance",

  // Aromatic: Huckel and everything that leans on it.
  "u2-huckel": "aromatic",
  "u2-charged": "aromatic",
  "u2-annulene": "aromatic",
  "u2-hetero": "aromatic",
  "u2-nmr": "aromatic",

  // Protonated: acid activation of a leaving group or a carbonyl.
  "u5-roh-rx": "protonated",
  "u5-cleavage": "protonated",
  "u7-acetal": "protonated",
  "u8-fischer": "protonated",
  "u9-halo-acid": "protonated",
});

/** The state for a lesson's node. Unknown or missing ids are neutral. */
export function stateForNode(nodeId: string | null | undefined): BerryState {
  if (nodeId === null || nodeId === undefined) return "neutral";
  // hasOwn, so an id like "toString" never reaches Object.prototype.
  return Object.hasOwn(NODE_STATE, nodeId) ? NODE_STATE[nodeId]! : "neutral";
}

/**
 * The face each state is shown with when a surface has no mood of its own to
 * give it, from the spec's section D. Absent means the surface's mood stands.
 * A state never forces a face; this is a default a caller may take.
 */
export const STATE_PRESET_MOOD: Readonly<Partial<Record<BerryState, BerryMood>>> = Object.freeze({
  /** "Visibly unstable and knows it." */
  carbocation: "stressed",
  /** "Chaotic eyes." */
  radical: "excited",
  /** "Deeply smug." */
  aromatic: "proud",
});

/** The Bible's "Mind blown" card: the first time a learner sees a resonance berry. */
export const MIND_BLOWN: Readonly<{ state: BerryState; mood: BerryMood; behaviour: BerryBehaviour }> =
  Object.freeze({ state: "resonance", mood: "excited", behaviour: "wideEyed" });

/** One key, per device, holding "1" once the mind-blown beat has played. */
export const RESONANCE_SEEN_KEY = "bb.bloom.resonanceSeen";

/** True when this state should play the mind-blown beat: resonance, never seen before. */
export function isFirstResonance(state: BerryState, seen: boolean): boolean {
  return state === "resonance" && !seen;
}

/** Whether the beat has played on this device. Blocked storage reads as not seen. */
export function readResonanceSeen(storage: SaveStorage | null): boolean {
  if (storage === null) return false;
  try {
    return storage.getItem(RESONANCE_SEEN_KEY) === "1";
  } catch {
    return false;
  }
}

/** Remember the beat played. A blocked write means it may play once more, which is harmless. */
export function markResonanceSeen(storage: SaveStorage | null): void {
  if (storage === null) return;
  try {
    storage.setItem(RESONANCE_SEEN_KEY, "1");
  } catch {
    // Private window or blocked storage.
  }
}
