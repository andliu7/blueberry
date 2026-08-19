/**
 * What the blueberry is feeling, and why.
 *
 * One vocabulary shared by the flat mark and the three-dimensional one, so a
 * page asks for a mood rather than for a drawing. That is what lets the same
 * berry appear everywhere and still be the same character: the 3-D version is
 * an upgrade of the flat one, not a different mascot with a different face.
 *
 * Kept in `lib` rather than beside either drawing because both import it, and
 * whichever one owned it would make the other depend on a component it does not
 * render.
 */

export type BerryMood =
  /** Watching the cursor, blinking, gawking when you are far away. The default. */
  | "curious"
  /** Pleased. Kind eyes, full smile. */
  | "happy"
  /** Delighted, briefly: bounce, blush, open mouth. Finishing something. */
  | "cheer"
  /** Quietly satisfied. Eyes shut, chin up. High completion. */
  | "proud"
  /** Attending to work. Eyes open and level, very little movement. */
  | "focused"
  /** Looking down at a page. Calm. */
  | "reading"
  /** Looking up and away, working something out. */
  | "thinking"
  /** Nothing to do. Slow bob, eyes shut. Empty states. */
  | "sleepy"
  /** Caught looking. Blush and squeezed eyes. What hover produces. */
  | "shy"
  /** Down about something. Eyes level, mouth turned down, head low. */
  | "sad"
  /** Sustained enthusiasm, unlike `cheer` which is a burst on finishing. */
  | "excited"
  /** Under it. Wide eyes, flat mouth, jittery. Deadlines and full inboxes. */
  | "stressed"
  /** Settled and unhurried. Kind eyes, slow drift, chin level. */
  | "calm";

export const BERRY_MOODS: BerryMood[] = [
  "curious",
  "happy",
  "cheer",
  "proud",
  "focused",
  "reading",
  "thinking",
  "sleepy",
  "shy",
  "sad",
  "excited",
  "stressed",
  "calm",
];

/**
 * How each mood is drawn, as numbers both renderers can read.
 *
 * `lookY`/`lookX` are where the head points when it is not following a cursor,
 * in radians for the 3-D head and scaled down for the flat one. `sway` is how
 * much idle movement the mood carries: a focused berry that keeps drifting is
 * not focused.
 */
export interface MoodShape {
  eyes: "open" | "shut" | "kind" | "fluster";
  /** 0 none, 1 full. */
  blush: number;
  /** -1 frown, 0 flat, 1 full smile. Above 1 opens the mouth. */
  mouth: number;
  /** Idle head drift, 0 still to 1 loose. */
  sway: number;
  /** Resting head direction, radians. Positive x looks down, positive y looks right. */
  lookX: number;
  lookY: number;
  /** Whether the head tracks the pointer. */
  tracks: boolean;
}

export const MOOD_SHAPE: Record<BerryMood, MoodShape> = {
  curious: { eyes: "open", blush: 0, mouth: 1, sway: 0.5, lookX: 0, lookY: 0, tracks: true },
  happy: { eyes: "kind", blush: 0.25, mouth: 1.2, sway: 0.6, lookX: -0.05, lookY: 0, tracks: false },
  cheer: { eyes: "kind", blush: 0.7, mouth: 1.8, sway: 1, lookX: -0.14, lookY: 0, tracks: false },
  proud: { eyes: "kind", blush: 0.15, mouth: 1, sway: 0.25, lookX: -0.2, lookY: 0, tracks: false },
  focused: { eyes: "open", blush: 0, mouth: 0.35, sway: 0.12, lookX: 0.04, lookY: 0, tracks: false },
  reading: { eyes: "open", blush: 0, mouth: 0.5, sway: 0.2, lookX: 0.26, lookY: -0.1, tracks: false },
  thinking: { eyes: "open", blush: 0, mouth: 0.3, sway: 0.35, lookX: -0.16, lookY: 0.42, tracks: false },
  sleepy: { eyes: "shut", blush: 0, mouth: 0.4, sway: 0.3, lookX: 0.14, lookY: 0, tracks: false },
  shy: { eyes: "fluster", blush: 1, mouth: 0.6, sway: 0.8, lookX: -0.12, lookY: 0, tracks: false },

  // The four added later. Each one has to differ from its nearest neighbour
  // in more than one number, or the two read as the same face drawn twice.

  // Head down and mouth turned down. The only negative `mouth` in the set,
  // which is what makes it unmistakable at 24px where a subtle frown is not.
  sad: { eyes: "open", blush: 0, mouth: -0.7, sway: 0.15, lookX: 0.3, lookY: 0, tracks: false },

  // Beside `cheer` deliberately. Cheer is a burst you get for finishing and
  // carries the biggest mouth and blush in the set; excited is a state a page
  // can sit in, so it is livelier in movement and calmer in face. It also
  // tracks the pointer, which cheer does not: sustained enthusiasm looks at
  // you, a celebration looks up.
  excited: { eyes: "open", blush: 0.45, mouth: 1.5, sway: 1, lookX: -0.1, lookY: 0, tracks: true },

  // Wide open eyes and a flat mouth, with the fastest sway in the set. The
  // difference from `focused` is exactly that: same open eyes and level
  // mouth, opposite amount of movement.
  stressed: { eyes: "open", blush: 0.2, mouth: 0.05, sway: 0.95, lookX: -0.06, lookY: 0.18, tracks: true },

  // Slower than `sleepy` but awake, which is the distinction that matters:
  // sleepy has its eyes shut and belongs to empty states, calm is present.
  calm: { eyes: "kind", blush: 0.1, mouth: 0.8, sway: 0.18, lookX: 0, lookY: 0, tracks: false },
};

/**
 * The mood that matches how a study session is going.
 *
 * Deliberately not a compliment machine. `cheer` is reserved for actually
 * finishing, because a berry that celebrates two cards has nothing left to do
 * when you finish forty-four. Nothing started at all is `curious` rather than
 * `sleepy`: an empty hub is an invitation, not a dead end.
 */
export function moodForProgress(reviewed: number, total: number): BerryMood {
  if (total <= 0) return "curious";
  if (reviewed <= 0) return "curious";
  if (reviewed >= total) return "cheer";
  const share = reviewed / total;
  if (share >= 0.75) return "proud";
  if (share >= 0.25) return "focused";
  return "happy";
}
