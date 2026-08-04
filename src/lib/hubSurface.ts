import type { SpotlightConfig } from "@/components/ui/spotlight-cursor";

/**
 * The look shared by the hub and the folder pages.
 *
 * They are the same room seen at two zoom levels, so the background and the
 * spotlight live here rather than being written out twice and drifting apart.
 * The deck pages deliberately do not use either: those are for reading, and a
 * light following the cursor across a wall of questions is a distraction from
 * the one thing that screen is for.
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
