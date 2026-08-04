import type { ReferenceDeck } from "@/data/types";

/**
 * The two NMR shift charts. Both rows in a group point at the same image,
 * because the handout is one chart per nucleus: hovering any row brings up the
 * full chart with the whole scale visible, which is the useful thing to see.
 */
export const nmrDeck: ReferenceDeck = {
  kind: "reference",
  id: "nmr",
  title: "Reference: NMR Shifts",
  short: "NMR",
  group: "reference",
  titleLines: ["NMR", "SHIFTS"],
  subtitle:
    "11 shift ranges for 1H and 13C. Hover any row to bring up the full chart from the handout.",
  blurb:
    "Where every proton and carbon shows up, downfield to upfield, from the class shift chart.",
  footNote: "Downfield = deshielded = near electronegative atoms or pi systems.",
  about:
    "The proton and carbon shift charts.\n\nOne idea runs through both: pull electron density away from a nucleus and its signal moves downfield. A proton next to oxygen, nitrogen or a halogen shifts down, a proton on a benzene ring or an aldehyde shifts further still, and plain alkyl protons sit up at the quiet end.\n\nShift alone rarely finishes the job. It narrows a signal to a few options, and splitting and integration decide between them.",
  motif: "nmr",
  from: "#7e22ce",
  to: "#a21caf",
  // As with IR: a spectrum, where the answer is where a signal sits on the
  // shift axis, so it wants room and a lens rather than a crop.
  preview: {
    width: 460,
    height: 300,
    magnify: { lensSize: 180, zoomFactor: 2.6 },
  },
  groups: [
    {
      heading: "1H NMR chemical shifts",
      items: [
        { title: "Carboxylic acid O–H", description: "Farthest downfield", badge: "~12–11 ppm", image: "nmr_1h" },
        { title: "Aldehyde H", description: "RCHO", badge: "~10–9 ppm", image: "nmr_1h" },
        { title: "Aryl H", description: "On the benzene ring", badge: "~8–7 ppm", image: "nmr_1h" },
        { title: "Vinyl H", description: "On a C=C", badge: "~6–5 ppm", image: "nmr_1h" },
        { title: "H–C–X", description: "X = O, N, halogen; one bond away", badge: "~4–3 ppm", image: "nmr_1h" },
        { title: "H–C–C–X and allylic H", description: "Two bonds from X, or next to a pi bond", badge: "~3–2 ppm", image: "nmr_1h" },
        { title: "Plain alkyl H", description: "Upfield, near TMS", badge: "~2–1 ppm", image: "nmr_1h" },
      ],
    },
    {
      heading: "13C NMR chemical shifts",
      items: [
        { title: "C=O carbon", description: "Carbonyls, farthest downfield", badge: "~200–160 ppm", image: "nmr_13c" },
        { title: "C=C / aromatic carbon", description: "sp2 carbons", badge: "~150–100 ppm", image: "nmr_13c" },
        { title: "C–X carbon", description: "X = O, N, halogen", badge: "~100–50 ppm", image: "nmr_13c" },
        { title: "Plain sp3 carbon", description: "Upfield alkyl carbons", badge: "~50–0 ppm", image: "nmr_13c" },
      ],
    },
  ],
};
