import type { ReferenceDeck } from "@/data/types";

/**
 * IR, split out from the combined IR+NMR deck in the original hover-deck app:
 * they are two separate charts you look up two separate ways, and a 35-row deck
 * that changes subject halfway is harder to scan than two focused ones.
 */
export const irDeck: ReferenceDeck = {
  kind: "reference",
  id: "ir",
  title: "Reference: IR Spectroscopy",
  short: "IR",
  group: "reference",
  titleLines: ["IR", "REFERENCE"],
  subtitle:
    "24 rows covering the four regions, the C–H ladder, and every functional group. Hover for the real spectrum.",
  blurb:
    "The four regions, the C–H stretch ladder, and what each functional group actually looks like — with the spectrum from the slides on every row.",
  footNote: "Four regions, left to right: bonds to H, triple bonds, double bonds, fingerprint.",
  about:
    "The IR chart from the slides, split into the four regions and then by functional group. IR answers one question well: which functional groups are present. Reading it is a matter of working left to right through the regions, then using the details to separate groups that share a peak, an aldehyde from a ketone by the C-H stretch near 2750, or an acid from an ester by the very broad O-H. The fingerprint region below 1500 is not read peak by peak; it is compared against a known spectrum.",
  motif: "ir",
  from: "#0369a1",
  to: "#0891b2",
  groups: [
    {
      heading: "The four IR regions",
      items: [
        { title: "The whole map", description: "One chart, four neighborhoods", badge: "4000–400 cm-1", image: "ir_overview" },
        { title: "N–H, C–H, O–H", description: "Bonds to hydrogen live on the left", badge: "4000–2500 cm-1", image: "ir_region_nh_oh" },
        { title: "C≡C, C≡N", description: "Triple bonds in the skinny middle", badge: "2500–2000 cm-1", image: "ir_region_triple" },
        { title: "C=C, C=O, C=N", description: "Double bonds before the fingerprint region", badge: "2000–1500 cm-1", image: "ir_region_double" },
        { title: "The hand-drawn cheat sheet", description: "Every peak labeled on one sketch", badge: "all of it", image: "ir_summary_drawn" },
      ],
    },
    {
      heading: "The C–H stretch ladder — more s character, higher wavenumber",
      items: [
        { title: "sp C–H", description: "Terminal alkyne H", badge: "3250 cm-1", image: "ir_ch_ladder" },
        { title: "sp2 C–H", description: "Alkene or aryl H", badge: "3050 cm-1", image: "ir_ch_ladder" },
        { title: "sp3 C–H", description: "Plain alkane H", badge: "2950 cm-1", image: "ir_ch_ladder" },
        { title: "Aldehyde C–H", description: "The odd one out, below the rest", badge: "2750 cm-1", image: "ir_ch_ladder" },
      ],
    },
    {
      heading: "Functional groups — hover for the real spectrum",
      items: [
        { title: "Alkane", description: "sp3 C–H only", badge: "2950 cm-1", image: "ir_alkane" },
        { title: "Alkene", description: "sp2 C–H plus C=C", badge: "3050 + 2000–1500", image: "ir_alkene" },
        { title: "Aryl", description: "sp2 C–H plus aromatic C=C", badge: "3050 + 2000–1500", image: "ir_aryl" },
        { title: "Alkyne", description: "sp C–H plus C≡C", badge: "3250 + 2500–2000", image: "ir_alkyne" },
        { title: "Nitrile", description: "C≡N", badge: "2500–2000 cm-1", image: "ir_nitrile" },
        { title: "Alcohol", description: "O–H, strong and broad", badge: "4000–2500 cm-1", image: "ir_alcohol" },
        { title: "1° amine", description: "R–NH2 — medium/weak DOUBLE peaks", badge: "4000–2500 cm-1", image: "ir_amine1" },
        { title: "2° amine", description: "R2NH — medium/weak ONE peak", badge: "4000–2500 cm-1", image: "ir_amine2" },
        { title: "3° amine", description: "R3N — no N–H peak at all", badge: "nothing!", image: "ir_amine3" },
        { title: "Ketone", description: "C=O, strong", badge: "2000–1500 cm-1", image: "ir_ketone" },
        { title: "Aldehyde", description: "C=O plus that 2750 C–H tell", badge: "2000–1500 + 2750", image: "ir_aldehyde" },
        { title: "Carboxylic acid", description: "Strong C=O plus VERY broad O–H", badge: "2000–1500 + 4000–2500", image: "ir_carboxylic" },
        { title: "Carboxylic acid O–H up close", description: "The very broad blob, four examples", badge: "4000–2500 cm-1", image: "ir_carbox_oh" },
        { title: "Ester", description: "C=O, no O–H", badge: "2000–1500 cm-1", image: "ir_ester" },
        { title: "Amide", description: "C=O plus N–H", badge: "2000–1500 + 4000–2500", image: "ir_amide" },
      ],
    },
    {
      heading: "Worked example — C4H8O",
      items: [
        { title: "The candidates", description: "Four structures with the same formula", badge: "which one?", image: "ir_c4h8o_cands" },
        { title: "The answer", description: "Read the peaks, eliminate, commit", badge: "reveal", image: "ir_c4h8o_answer" },
      ],
    },
  ],
};
