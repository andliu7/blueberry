import type { ReferenceDeck } from "@/data/types";

/**
 * The pKa ladder, transcribed from Dr. Stocker's sheet. Hover images are the
 * structures cropped from the same handout.
 *
 * Ordered strongest acid first, because that is the order the sheet uses and
 * the direction the reasoning runs: find the lowest pKa proton and that is the
 * one that leaves.
 */
export const pkaDeck: ReferenceDeck = {
  kind: "reference",
  id: "pka",
  title: "Reference: pKa Ladder",
  short: "pKa",
  group: "reference",
  titleLines: ["THE PKA", "LADDER"],
  subtitle:
    "23 values from Dr. Stocker's sheet. Hover a row for the structure, or switch off quiz mode to read the whole ladder at once.",
  blurb:
    "Every pKa worth memorising, strongest acid first, with the structure behind each one. The number you need before you can pick a base.",
  footNote: "Lower pKa = stronger acid = more willing to hand off that proton.",
  motif: "pka",
  from: "#9f1239",
  to: "#be123c",
  groups: [
    {
      heading: "Strongest acids first — low pKa lets go of H+ easily",
      items: [
        { title: "Hydroiodic acid", description: "HI", badge: "-10", image: "pka_hi" },
        { title: "Hydrobromic acid", description: "HBr", badge: "-8", image: "pka_hbr" },
        { title: "Protonated carbonyl", description: "C=OH+ — first step of acid-catalyzed mechanisms", badge: "-7", image: "pka_protonated_carbonyl" },
        { title: "Hydrochloric acid", description: "HCl", badge: "-7", image: "pka_hcl" },
        { title: "Sulfuric acid", description: "H2SO4", badge: "-3", image: "pka_sulfuric" },
        { title: "Carbocations", description: "H on carbon next to C+", badge: "-3", image: "pka_carbocation" },
        { title: "Hydronium / protonated alcohol or ether", description: "H3O+ / R2OH+ (R = C, H)", badge: "~0", image: "pka_hydronium" },
        { title: "Nitric acid", description: "HNO3", badge: "~0", image: "pka_nitric" },
        { title: "Hydrofluoric acid", description: "HF — the weak one of the HX family", badge: "3", image: "pka_hf" },
      ],
    },
    {
      heading: "The everyday middle",
      items: [
        { title: "Carboxylic acid", description: "RCOO–H", badge: "5", image: "pka_carboxylic_acid" },
        { title: "Hydrogen nitride", description: "HN3", badge: "5", image: "pka_hn3" },
        { title: "Hydrogen cyanide", description: "HCN", badge: "9", image: "pka_hcn" },
        { title: "Phenol", description: "Ar–O–H", badge: "10", image: "pka_phenol" },
        { title: "Proton between two carbonyls", description: "1,3-dicarbonyl C–H", badge: "10", image: "pka_dicarbonyl" },
        { title: "Protonated amine", description: "R3NH+ (R = C, H)", badge: "10", image: "pka_protonated_amine" },
        { title: "Amide N–H", description: "RC(=O)N(R')–H (R' = C, H)", badge: "15", image: "pka_amide" },
        { title: "Alcohol", description: "R3C–O–H", badge: "16", image: "pka_alcohol" },
        { title: "Water", description: "H2O", badge: "16", image: "pka_water" },
      ],
    },
    {
      heading: "Weak acids — need strong bases to deprotonate",
      items: [
        { title: "Alpha proton", description: "H on the carbon adjacent to a carbonyl", badge: "20", image: "pka_alpha_proton" },
        { title: "Terminal alkyne", description: "R–C≡C–H", badge: "25", image: "pka_terminal_alkyne" },
        { title: "Amine N–H", description: "R2N–H (R = C, H)", badge: "35", image: "pka_amine" },
        { title: "Aryl / vinyl proton", description: "H on benzene ring or C=C", badge: "40", image: "pka_aryl_vinyl" },
        { title: "Alkane", description: "sp3 C–H — basically never leaves", badge: "50", image: "pka_alkane" },
      ],
    },
  ],
};
