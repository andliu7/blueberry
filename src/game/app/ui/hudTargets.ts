// Landing spots in the top bar for things that fly into it.
//
// The chest opening throws diamonds at the diamond counter. It must not
// import Hud.tsx (that would tie two screens together), so the counter
// carries a plain data attribute and this file finds it in the DOM. Both
// the phone and the desktop bar put `data-hud-diamonds` on the counter, so
// whichever bar is on screen is the one that answers.

const HUD_DIAMONDS_ATTR = 'data-hud-diamonds';

/** The diamond counter that is actually visible, or null when none is. */
function diamondsEl(): HTMLElement | null {
  if (typeof document === 'undefined') return null;
  const all = document.querySelectorAll<HTMLElement>(`[${HUD_DIAMONDS_ATTR}]`);
  for (const el of all) {
    const r = el.getBoundingClientRect();
    // A hidden layout (display:none) measures 0 x 0; skip it.
    if (r.width > 0 && r.height > 0) return el;
  }
  return null;
}

/** Where the diamond counter sits on screen, so a flight knows where to land. */
export function hudDiamondsRect(): DOMRect | null {
  const el = diamondsEl();
  return el ? el.getBoundingClientRect() : null;
}

/**
 * A short pulse on the diamond counter, for the moment a flying diamond lands.
 * Removing and re-adding the class restarts the CSS animation if it is
 * already running (the reflow read in between is what makes the restart work).
 */
export function bumpHudDiamonds(): void {
  const el = diamondsEl();
  if (!el) return;
  el.classList.remove('hud-bump');
  void el.offsetWidth;
  el.classList.add('hud-bump');
  window.setTimeout(() => el.classList.remove('hud-bump'), 450);
}

/*
 * WHAT THE COUNTER SHOWS WHILE DIAMONDS FLY. The economy banks a chest's whole
 * payout on the third tap, but the counter should climb one diamond at a time
 * as each lands. So the chest says how many diamonds are still in the air,
 * and the counter shows the balance minus those; at zero it lets go and the
 * counter reads the balance again. A count still to land, not a number to
 * show, so it agrees with whatever balance the header derives. Null means no
 * hold.
 */
let held: number | null = null;
const holdListeners = new Set<() => void>();

export function holdHudDiamonds(value: number | null): void {
  if (held === value) return;
  held = value;
  for (const listener of holdListeners) listener();
}

/** For useSyncExternalStore in the header. */
export const hudDiamondsHold = {
  get: (): number | null => held,
  subscribe(listener: () => void): () => void {
    holdListeners.add(listener);
    return () => {
      holdListeners.delete(listener);
    };
  },
};
