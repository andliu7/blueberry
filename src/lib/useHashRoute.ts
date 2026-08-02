import { useEffect, useState } from "react";

/**
 * The current route, read from the URL hash: "#/home" gives "home", and the
 * bare root gives "".
 *
 * Hash routing rather than real paths because GitHub Pages serves static files
 * with no rewrite rules. A path route would work when navigated to from inside
 * the app and then 404 the moment anyone refreshed or shared the link.
 */
export function useHashRoute(): string {
  const [route, setRoute] = useState(readRoute);

  useEffect(() => {
    const sync = () => setRoute(readRoute());
    window.addEventListener("hashchange", sync);
    return () => window.removeEventListener("hashchange", sync);
  }, []);

  return route;
}

function readRoute(): string {
  if (typeof window === "undefined") return "";
  return window.location.hash.replace(/^#\/?/, "").split("?")[0];
}
