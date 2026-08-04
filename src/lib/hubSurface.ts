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
 * Lighter than the flat warm stone it replaces, with a little violet worked in
 * and a gradient down the page so three screenfuls of cards are not sitting on
 * one dead colour. Near enough to opaque that the spotlight reads as light on
 * the surface rather than something showing through it.
 */
export const SURFACE = {
  light: {
    base: "#faf9ff",
    gradient:
      "linear-gradient(180deg, #faf9ff 0px, #f5f0fc 520px, #efe9f9 1200px, #ece5f7 2000px)",
  },
  dark: {
    base: "#171327",
    gradient:
      "linear-gradient(180deg, #171327 0px, #141020 520px, #110d1b 1200px, #0f0b18 2000px)",
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
    ? { radius: 380, brightness: 0.14, color: "#a78bfa", smoothing: 0.11 }
    : { radius: 340, brightness: 0.13, color: "#6366f1", smoothing: 0.11 };
}
