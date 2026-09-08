/**
 * What the things on this site ARE, said once, where someone will read it.
 *
 * Not a changelog. `data/changelog.ts` answers "what moved this week" and its
 * entries go stale by design: a sentence about the front page getting to the
 * point is worthless to a stranger who never saw the old one. A release entry
 * answers the different question, "what is this and what would I be doing",
 * and it stays true for as long as the thing exists.
 *
 * That difference is the whole reason these are a separate file and a separate
 * kind in the notifications list. A visitor who opens the bell to find out what
 * happened while they were away, and a visitor who opens it having no idea what
 * the site is, are both served by one time-ordered list, but not by one source.
 *
 * The rule for writing one: describe the doing, not the shipping. If the body
 * could be swapped for "we launched X" and lose nothing, it is not finished.
 * A stranger should be able to say what they would be touching ten seconds
 * after reading it. Newest first is not needed here; the list is sorted by
 * `at` where it is consumed.
 *
 * **An entry is three sizes, not one paragraph.** A blind read of the panel
 * against the reference put a sixty-word block at a single type size next to a
 * one-line timer log and called it a wall, and it was right: nothing in it was
 * scannable, and the only pressable things on the screen were ways to throw it
 * away. So an entry now carries a `title` you glance at, a `summary` you read,
 * a `body` that stays folded until it is asked for, and an `action` that is the
 * one thing to press. Write them in that order and stop at the point where the
 * reader could already act.
 */

/** The one thing to press on a release. There is deliberately only ever one. */
export interface ReleaseAction {
  /** Names the doing, not the destination. "Try the first lesson", not "Learn more". */
  label: string;
  /** An in-app hash route stays in the tab; anything else opens in a new one. */
  href: string;
  external?: boolean;
}

export interface Release {
  /**
   * Stable across edits to the copy. It is the key the "already read" record
   * is written under, so changing it re-announces the entry to everyone.
   */
  id: string;
  /** ISO instant. Sorted against live timer notices, so it needs a real time. */
  at: string;
  /** The name of the thing, in a few words. Never "new" or "introducing". */
  title: string;
  /**
   * One line, and it has to survive being the only line anybody reads. Say the
   * doing, and say the one thing that separates it from a textbook. If it needs
   * a second clause to make sense, that clause belongs in `body`.
   */
  summary: string;
  /** The detail, folded away until someone asks for it. Two or three sentences. */
  body: string;
  action: ReleaseAction;
}

export const RELEASES: Release[] = [
  {
    id: "mechanism-trainer",
    at: "2026-08-21T09:00:00Z",
    title: "The mechanism trainer",
    summary: "You draw the arrows. The engine names what went wrong.",
    body: "Drag an arrow from a lone pair to the atom it attacks, one step at a time, and build the intermediate before you move on. The chemistry is checked after every step, and a wrong one comes back named: attacked the wrong site, charge not conserved, a rearrangement the cation would have done first. Never just a red cross.",
    action: {
      /**
       * The funnel, and deliberately not `TRAINER_URL`.
       *
       * The trainer is still its own app and its front page is behind a human
       * gate, so a stranger sent straight there lands on placeholder copy. The
       * honest next press is this site's own first lesson: it is real chemistry
       * today, and it is the slot the drawing exercise takes over when the
       * trainer moves in. See the note at the top of `StartPage`.
       */
      label: "Try the first lesson",
      href: "#/start",
    },
  },
];
