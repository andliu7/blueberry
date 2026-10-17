import type { SpotlightConfig } from "@/components/ui/spotlight-cursor";

/**
 * The surface shared by the hub, the folder pages and contact, and the
 * spotlight the first two carry.
 *
 * They are the same room seen at different zoom levels, so this lives here
 * rather than being written out three times and drifting apart. Contact takes
 * the surface but not the spotlight: it is a form you sit and fill in, and its
 * card already has a border shine of its own. The deck pages take neither.
 */

/**
 * The one site ground (owner, 2026-10-07): lavender by day, the measured navy
 * at night. Both halves name the same token, `--site-ground` in src/tokens.css,
 * which flips with the `.dark` class, so a page that picks `light` or `dark` here
 * gets the right colour either way and the hex lives in exactly one file.
 */
export const SURFACE = {
  light: {
    base: "var(--site-ground)",
    gradient: "none",
  },
  dark: {
    base: "var(--site-ground)",
    gradient: "none",
  },
} as const;

/**
 * The spotlight has to do opposite things in the two themes.
 *
 * On the dark surface it adds light, so it is a pale violet lifted off the
 * background. On the near-white surface adding light does nothing you can see,
 * so it tints instead: a deeper blue-violet laid over the page at a low alpha,
 * which reads as a cool pool moving under the cards rather than a glow.
 */
export function spotlightFor(isDark: boolean): SpotlightConfig {
  return isDark
    ? { radius: 380, brightness: 0, color: "#9f8efa", smoothing: 0.11 }
    : { radius: 340, brightness: 0, color: "#7f5cf1", smoothing: 0.11 };
}
