import { useEffect } from "react";

/**
 * Sends a retired address to its new home, and renders nothing meanwhile.
 *
 * `location.replace` rather than setting the hash, so the retired address is
 * swapped out of history instead of stacked under the new one: pressing Back
 * from the new page goes to wherever you were before, not into a loop through
 * the redirect. The replace fires a hashchange, and `useHashRoute` picks up the
 * new route from there like any other navigation.
 *
 * React pattern: an effect with `[to]` as its dependency, so the navigation runs
 * after render (never during it) and runs again only if the target changes.
 */
export function Redirect({ to }: { to: string }) {
  useEffect(() => {
    window.location.replace(to);
  }, [to]);
  return null;
}
