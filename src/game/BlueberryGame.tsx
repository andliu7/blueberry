import App from "./App";
import { HoverLabel } from "./cursor/HoverLabel";

import "./theme.css";
import "./tabs/trainer/backdrop.css";

/**
 * The game as a component the site can mount, replacing the standalone
 * `main.tsx` entry it arrived with.
 *
 * Three things from that entry deliberately did not come across.
 *
 * `createRoot` and `StrictMode` belong to whoever owns the document, and here
 * that is the site's own `main.tsx`. Two roots on one page would give the game
 * its own reconciler and break any state it ever shares with the site.
 *
 * The service worker registration is gone. It registered `./sw.js` to cache the
 * game's shell, but scope follows the registering page, so on this origin it
 * would have cached the whole site and served a stale one. The site can add its
 * own offline story later; it must not inherit the game's by accident.
 *
 * `HoverLabel` stays, because it is window chrome rather than route content and
 * renders nothing on touch. It sits beside `App` here for the same reason it sat
 * outside the router there.
 */
export function BlueberryGame() {
  return (
    <>
      <App />
      <HoverLabel />
    </>
  );
}

export default BlueberryGame;
