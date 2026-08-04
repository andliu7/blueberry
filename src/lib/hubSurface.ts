/**
 * The surface shared by the hub, the folder pages and contact.
 *
 * They are the same room seen at different zoom levels, so the background lives
 * here rather than being written out three times and drifting apart. The deck
 * pages keep their own, since a deck opens on its title screen rather than on a
 * page of cards.
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
