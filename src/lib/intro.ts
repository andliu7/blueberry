/**
 * Whether the hub should play its opening.
 *
 * Remembered per tab rather than forever: a fresh visit tomorrow should still
 * get the opening, and stepping into a folder and back should not.
 *
 * The rule is about where you came from, which is why this is a module rather
 * than a flag inside `HomePage`. Arriving from a deck is arriving from
 * somewhere else on the site and the opening is worth seeing again, so the
 * blueberry on a deck's title screen clears the mark before it navigates.
 * Coming back from a folder is closer to pressing back, and sitting through the
 * sequence again there is the thing that made it tiresome.
 */

const KEY = "blueberry_intro_seen";

export function hasSeenIntro(): boolean {
  try {
    return sessionStorage.getItem(KEY) === "1";
  } catch {
    return false;
  }
}

export function markIntroSeen(): void {
  try {
    sessionStorage.setItem(KEY, "1");
  } catch {
    /* private mode, and replaying the opening is not worth an error */
  }
}

/** Called on the way to the hub when the opening should run again. */
export function requestIntroReplay(): void {
  try {
    sessionStorage.removeItem(KEY);
  } catch {
    /* as above */
  }
}
