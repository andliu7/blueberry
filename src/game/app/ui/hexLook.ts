/**
 * Whether the game's keys wear the hexagon ring (piece "hex", Nov 2026).
 *
 * OFF by default. The owner's rule for this piece is that it rolls out to the
 * primary keys and the path nodes only after it wins on its gallery page
 * (#/app/gallery/hex), so until then it is opt in:
 *
 *   ?hex=1   on for this page load (and remembered on this device)
 *   ?hex=0   off, and forgotten
 *
 * The gallery forces it on for itself with `forceHexLook`, so the sheet always
 * shows the candidate no matter what the device has stored.
 */

const KEY = "blueberry.hex";

function initial(): boolean {
  if (typeof window === "undefined") return false;
  try {
    const search = new URLSearchParams(window.location.search).get("hex");
    const inHash = window.location.hash.includes("?") ? new URLSearchParams(window.location.hash.split("?")[1]).get("hex") : null;
    const asked = search ?? inHash;
    if (asked === "1") {
      window.localStorage.setItem(KEY, "1");
      return true;
    }
    if (asked === "0") {
      window.localStorage.removeItem(KEY);
      return false;
    }
    return window.localStorage.getItem(KEY) === "1";
  } catch {
    return false;
  }
}

let on: boolean | null = null;

export function hexLookOn(): boolean {
  if (on === null) on = initial();
  return on;
}

/** The gallery's override. Not for product code. */
export function forceHexLook(value: boolean): void {
  on = value;
}
