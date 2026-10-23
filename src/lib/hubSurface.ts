/**
 * The surface shared by the hub, the folder pages and contact.
 *
 * They are the same room seen at different zoom levels, so this lives here
 * rather than being written out three times and drifting apart. The deck
 * pages do not take it.
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
