/**
 * The cards that glow under the cursor (owner, 15 Oct, option A). The drawing is CSS, in
 * src/components/ui/site-shell.css; this file only tells it where the pointer is.
 *
 * KEEP IN STEP with the `:is(...)` list in site-shell.css (src/test/cardGlow.test.ts checks
 * that the two lists match). A new kind of card can also just take the `bb-glow` class.
 */
export const GLOW_CARDS = ".bb-glow, .lrn-card, .lrn-tap, .rv-card-box, .rv-tile, .rv-tilt, .home-card";

/**
 * Writes the pointer's position inside the card under it as --x and --y, in px.
 * Mouse only; a touch or pen move does nothing (the CSS is off without hover anyway).
 * Returns a function that removes the listener.
 */
export function startCardGlow(): () => void {
  const onMove = (e: PointerEvent) => {
    if (e.pointerType !== "mouse") return;
    const card = (e.target as Element | null)?.closest?.(GLOW_CARDS) as HTMLElement | null;
    if (!card) return;
    const r = card.getBoundingClientRect();
    card.style.setProperty("--x", `${e.clientX - r.left}px`);
    card.style.setProperty("--y", `${e.clientY - r.top}px`);
  };
  document.addEventListener("pointermove", onMove, { passive: true });
  return () => document.removeEventListener("pointermove", onMove);
}

/**
 * Home only (owner, 15 Oct, option C): tint the page ground with a card's colour while the
 * mouse is on it. `color` is any CSS colour, usually a token such as "var(--site-tab-learn)".
 * The drawing is `.site-wash::after` in site-shell.css. Mouse only, like the glow.
 */
export function tintPage(e: { pointerType: string }, color: string) {
  if (e.pointerType !== "mouse") return;
  const html = document.documentElement;
  html.style.setProperty("--site-tint", color);
  html.setAttribute("data-tint", "");
}

/** Lets the ground fade back to the plain wash. --site-tint stays, so the fade keeps its colour. */
export function clearPageTint() {
  document.documentElement.removeAttribute("data-tint");
}
