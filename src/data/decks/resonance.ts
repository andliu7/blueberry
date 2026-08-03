import type { ReferenceDeck } from "@/data/types";

/**
 * Resonance arrow-pushing, plus the mnemonics Dr. Stocker tells you to write
 * down. The BrINClHOF row has no image on purpose: there is nothing to draw,
 * it is just a list to recite.
 */
export const resonanceDeck: ReferenceDeck = {
  kind: "reference",
  id: "resonance",
  title: "Reference: Resonance + Stocker's Tricks",
  short: "Resonance",
  group: "reference",
  titleLines: ["RESONANCE", "+ TRICKS"],
  subtitle:
    "13 rows: the three arrow patterns, how to handle cations, anions and neutrals, and the mnemonics worth memorising.",
  blurb:
    "Where to start the arrow and where to push it, worked through for cations, anions and neutral molecules — plus FONClBrCSIPH, BrINClHOF, and the octet rule.",
  footNote: "The octet rule RULES. No contributor is worth drawing if it breaks one.",
  motif: "resonance",
  from: "#047857",
  to: "#059669",
  groups: [
    {
      heading: "The three arrow patterns",
      items: [
        { title: "Lone pair → pi bond", description: "An atom gives up ownership to share", badge: "lp (own) → π (share)", image: "res_patterns" },
        { title: "Pi bond → pi bond", description: "The pi bond walks down the chain", badge: "π (share) → π (share)", image: "res_patterns" },
        { title: "The two-step", description: "lp → π, then π → lp on the far end", badge: "anion relay", image: "res_patterns" },
      ],
    },
    {
      heading: "Cations",
      items: [
        { title: "Push electrons toward (+)", description: "Draw lone pairs, look left/right/up/down, start from the electron source", badge: "toward +", image: "res_cation_example" },
        { title: "(+) on an electronegative atom?", description: "Only a valid contributor if that atom keeps a FULL octet", badge: "octet or bust", image: "res_octet_example" },
      ],
    },
    {
      heading: "Anions",
      items: [
        { title: "Start at the (–)", description: "Push toward sp or sp2 hybridized atoms, or cations", badge: "toward sp / sp2", image: "res_anion_example" },
        { title: "Worked example: enolate ring", description: "Carbanion walks to the carbonyl oxygen", badge: "C– → O–", image: "res_anion_example" },
        { title: "Worked example: N anion relay", description: "N– pushes through the enone into the ring", badge: "N– → O–", image: "res_anion_example2" },
      ],
    },
    {
      heading: "Neutral molecules",
      items: [
        { title: "Find a polar pi bond first", description: "Push pi electrons onto the more electronegative atom; if you can't, push a lone pair toward a pi bond", badge: "π → EN atom", image: "res_neutral_example" },
        { title: "Then treat it like ions", description: "Once (+) and (–) exist, use the cation and anion rules", badge: "proceed as ions", image: "res_neutral_example" },
      ],
    },
    {
      heading: "Dr. Stocker's tricks — write these down NOW",
      items: [
        { title: "FONClBrCSIPH", description: "Electronegativity order: F > O > N > Cl > Br > C ≈ S > I > P > H — decides where pushed electrons land", badge: "EN ranking", image: "res_neutral_example" },
        { title: "BrINClHOF", description: "The elements that exist as diatomic molecules: Br2, I2, N2, Cl2, H2, O2, F2", badge: "diatomics" },
        { title: "The octet rule RULES!", description: "Never draw a contributor that breaks it — especially (+) on N or O without a full octet", badge: "always", image: "res_octet_example" },
      ],
    },
  ],
};
