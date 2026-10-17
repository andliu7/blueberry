import type { MouseEvent, PointerEvent } from "react";

/*
 * The two event handlers the site nav uses (shell round 6). In their own file, not in
 * site-nav.tsx, because a file that exports React components should export only
 * components (Vite's fast refresh rule, which `npm run lint` checks), and the tests
 * need to import these.
 */

/**
 * The press, at pointer down, for touch as well as a mouse (shell round 6).
 *
 * WHY NOT ONLY `:active`. On a phone Chrome holds `:active` back while it decides whether
 * a touch is a tap or the start of a scroll, so a tab showed nothing for 260ms after the
 * finger landed (critic, shell round 5). `pointerdown` fires the moment the finger lands,
 * so it marks the link `data-pressed`, and site-shell.css draws the same press for that
 * attribute as for `:active`. Up, cancel (the touch became a scroll) and leave clear it.
 * Plain DOM attributes rather than React state: no re-render, and nothing to keep in sync.
 */
const unpress = (e: PointerEvent<HTMLAnchorElement>) => e.currentTarget.removeAttribute("data-pressed");
export const PRESS = {
  onPointerDown: (e: PointerEvent<HTMLAnchorElement>) => e.currentTarget.setAttribute("data-pressed", ""),
  onPointerUp: unpress,
  onPointerCancel: unpress,
  onPointerLeave: unpress,
};

/**
 * Moves keyboard focus past the header to the page (shell round 5). Not a plain
 * `href="#main"` jump: the router reads the hash, so `#main` would be a route. It focuses
 * the page's `<main>` itself, the start of the page, or its title where a page has no
 * `<main>`, without touching the hash. The next Tab is then the page's first control.
 * site-shell.css's `scroll-padding-top` keeps the start of main clear of the sticky header
 * when the browser scrolls it into view (round 5 parked it under the header).
 */
export function skipToContent(e: MouseEvent<HTMLAnchorElement>) {
  const target = document.querySelector<HTMLElement>("main") ?? document.querySelector<HTMLElement>("h1");
  if (!target) return;
  e.preventDefault();
  if (!target.hasAttribute("tabindex")) target.setAttribute("tabindex", "-1");
  target.focus();
}
