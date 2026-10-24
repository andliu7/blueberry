/**
 * Unit 2's guidebook, the words. Drafts until the owner signs them off.
 *
 * NO NEW CHEMISTRY LIVES HERE. Every idea, every mistake and every example
 * names `source`, a Unit 2 pool entry, and `quote`, words copied exactly from
 * that entry's explanation or its correct option. test/guideU2.test.ts fails
 * a quote the source does not contain, and an idea whose source is not in its
 * own lesson. The `text`, `mistake` and `fix` lines are plain paraphrases of
 * those quotes, nothing more.
 *
 * The drawings are generated: u2Guide.figures.ts, by scripts/guide_u2.py.
 * This file is loaded only when a student opens the Unit 2 guide (index.ts).
 */
import type { GuideStage, UnitGuide } from "./types";
import { U2_GUIDE_EXAMPLES } from "./u2Guide.figures";

const STAGES: readonly GuideStage[] = [
  {
    id: "a",
    label: "Stage A",
    title: "The four tests",
    optional: false,
    checkpoint: null,
    lessons: [
      {
        node: "u2-huckel",
        ideas: [
          {
            text: "Run the four tests in order: cyclic, a p orbital on every ring atom, planar, then 4n + 2 π electrons.",
            mark: "4n + 2 π electrons",
            source: "u2-huckel-meet-gate",
            quote: "The four tests run in order: cyclic, a p orbital on every ring atom, planar, then 4n + 2 pi electrons.",
          },
          {
            text: "One sp3 carbon breaks the loop, so the ring is nonaromatic.",
            source: "u2-huckel-meet-gate",
            quote: "One sp3 carbon breaks the loop, so the ring is nonaromatic.",
          },
          {
            text: "A flat ring with 4n π electrons is antiaromatic.",
            source: "u2-huckel-cbd",
            quote: "A flat ring with 4n pi electrons is antiaromatic.",
          },
          {
            text: "If n in 4n + 2 is not a whole number, the count fails.",
            source: "u2-huckel-n-cot",
            quote: "A non whole n is the tell: the count fails.",
          },
          {
            text: "Frost circle: draw the ring point down in a circle. Each corner is one π level, and corners at the same height are a matched (degenerate) pair.",
            source: "u2-huckel-meet-frost",
            quote: "each corner is one pi level, and corners at the same height are a matched (degenerate) pair.",
          },
        ],
        example: { source: "u2-huckel-meet-gate", quote: "One sp3 carbon breaks the loop" },
      },
      {
        node: "u2-charged",
        ideas: [
          {
            text: "Take H⁺ off cyclopentadiene's CH₂ and that carbon keeps a lone pair in a p orbital: 6 π electrons, aromatic.",
            mark: "a lone pair in a p orbital",
            source: "u2-chg-meet-anion",
            quote: "Remove H+ and that carbon keeps a lone pair in a p orbital: 4 from the C=C bonds plus 2 is 6, n = 1, aromatic.",
          },
          {
            text: "An empty p orbital counts 0 electrons, but it keeps the loop unbroken.",
            source: "u2-chg-meet-cation",
            quote: "An empty p orbital counts 0 electrons but keeps the ring of p orbitals unbroken.",
          },
          {
            text: "Judge acidity by the conjugate base: the more stable the base, the stronger the acid.",
            source: "u2-chg-acid-pick",
            quote: "Acidity is argued on the conjugate base: the more stable the base, the stronger the acid.",
          },
        ],
        example: { source: "u2-chg-meet-anion", quote: "Remove H+ and that carbon keeps a lone pair in a p orbital" },
      },
      {
        node: "u2-annulene",
        ideas: [
          {
            text: "Cyclooctatetraene would be antiaromatic if flat, so it bends into a tub and ends up nonaromatic.",
            mark: "bends into a tub",
            source: "u2-ann-cot",
            quote: "COT would be antiaromatic if flat, so it bends into a tub.",
          },
          {
            text: "An annulene's π count is its ring size: 18 for [18]annulene, so n = 4.",
            source: "u2-ann-meet-size",
            quote: "An annulene alternates C=C all the way round, so its pi count is its ring size: 18 for [18]annulene, n = 4.",
          },
          {
            text: "Antiaromatic needs both a 4n count and a flat ring.",
            source: "u2-ann-pick-anti",
            quote: "Antiaromatic needs a 4n count AND a flat ring.",
          },
          {
            text: "[10]Annulene has the right count, but its inner H atoms keep it from lying flat.",
            source: "u2-ann-10",
            quote: "[10]Annulene has the right count but cannot lie flat because of its inner H atoms, so it is nonaromatic.",
          },
        ],
        example: { source: "u2-ann-pick-anti", quote: "only cyclobutadiene has both" },
      },
    ],
    mistakes: [
      {
        mistake: "Counting π electrons before checking every ring atom.",
        fix: "Run the gate first: one sp3 CH₂ makes the ring nonaromatic before the count is asked.",
        source: "u2-ann-cpd-gate",
        quote: "One sp3 CH2 is enough to make the ring nonaromatic, before the count is even asked.",
      },
      {
        mistake: "Calling cyclooctatetraene antiaromatic.",
        fix: "It folds into a tub, so it is nonaromatic.",
        source: "u2-ann-cot-why",
        quote: "It escapes by folding into a tub, which makes it nonaromatic.",
      },
      {
        mistake: "Treating a cation's empty p orbital as a gap in the loop.",
        fix: "It counts 0 electrons but keeps the loop unbroken.",
        source: "u2-chg-meet-cation",
        quote: "An empty p orbital counts 0 electrons but keeps the ring of p orbitals unbroken.",
      },
      {
        mistake: "Thinking n = 0 fails the count.",
        fix: "Zero is a whole number: 2 π electrons is aromatic.",
        source: "u2-chg-c3-cation",
        quote: "2 pi electrons, n = 0, and zero counts as a whole number.",
      },
    ],
  },
  {
    id: "b",
    label: "Stage B",
    title: "Heterocycles and the ring current",
    optional: false,
    checkpoint: null,
    lessons: [
      {
        node: "u2-hetero",
        ideas: [
          {
            text: "Ask one question: does the N already have a ring double bond? Yes, its pair sits out. No, its pair goes in.",
            mark: "does the N already have a ring double bond",
            source: "u2-het-meet-contrast",
            quote: "The rule is one question: does the N already have a ring double bond. Yes (pyridine): it gives 1 and the pair sits out. No (pyrrole): the pair goes in.",
          },
          {
            text: "Furan's O puts one pair into the ring. The other points out, in the plane.",
            source: "u2-het-furan-pairs",
            quote: "Only one of oxygen's pairs joins the ring, so furan has 6 pi electrons. The other pair points out, in the plane.",
          },
          {
            text: "Pyridine is a base because its pair is outside the π system.",
            source: "u2-het-protonate",
            quote: "Pyridine is a base because its pair is outside the pi system.",
          },
        ],
        example: { source: "u2-het-meet-contrast", quote: "Yes (pyridine): it gives 1 and the pair sits out." },
      },
      {
        node: "u2-nmr",
        ideas: [
          {
            text: "The ring current deshields H outside an aromatic ring and shields H inside it.",
            mark: "deshields H outside",
            source: "u2-nmr-meet-inner",
            quote: "The ring current deshields H outside an aromatic ring and shields H inside it.",
          },
          {
            text: "Aromatic H sit at about 6.5 to 8 ppm, downfield of vinylic H.",
            source: "u2-nmr-meet-downfield",
            quote: "Aromatic H, about 6.5 to 8 ppm, sit downfield of vinylic H",
          },
          {
            text: "Cyclooctatetraene's H appear in the vinylic band: evidence it is a nonaromatic tub.",
            source: "u2-nmr-cot",
            quote: "COT's H appear in the vinylic band, which is evidence it is a nonaromatic tub.",
          },
        ],
        example: { source: "u2-nmr-cot", quote: "COT's H appear in the vinylic band" },
      },
    ],
    mistakes: [
      {
        mistake: "Counting pyridine's lone pair in the ring.",
        fix: "Its N is in a C=N bond, so the pair sits in the plane and is not counted.",
        source: "u2-het-pyridine-pair",
        quote: "Pyridine's N is in a C=N bond, so its pair sits in an sp2 orbital in the plane.",
      },
      {
        mistake: "Counting both of furan's oxygen pairs.",
        fix: "Only one joins the ring, so furan has 6 π electrons.",
        source: "u2-het-furan-pairs",
        quote: "Only one of oxygen's pairs joins the ring, so furan has 6 pi electrons.",
      },
      {
        mistake: "Protonating the imidazole N whose pair is in the ring.",
        fix: "The pyridine-like N, with its pair outside the ring, takes the proton.",
        source: "u2-het-imid-base",
        quote: "In imidazole that is the pyridine-like N.",
      },
      {
        mistake: "Expecting the inside H of [18]annulene downfield.",
        fix: "Inside the ring the current shields them: below 0 ppm.",
        source: "u2-nmr-shielded",
        quote: "[18]annulene's inner H sit below 0 ppm.",
      },
    ],
  },
  {
    id: "c",
    label: "Stage C",
    title: "Naming benzene rings",
    optional: true,
    checkpoint: null,
    lessons: [
      {
        node: "u2-nomen",
        ideas: [
          {
            text: "Ortho is 1,2 (next door), meta is 1,3 (one carbon between), para is 1,4 (across the ring).",
            mark: "Ortho is 1,2",
            source: "u2-nom-xylene",
            quote: "Ortho is 1,2 (next door), meta is 1,3 (one carbon between), para is 1,4 (across the ring).",
          },
          {
            text: "Phenol is benzene with OH, aniline with NH₂, anisole with OCH₃.",
            source: "u2-nom-phenol",
            quote: "Phenol is benzene with OH, aniline with NH2, anisole with OCH3.",
          },
          {
            text: "Three fused rings: straight is anthracene, bent is phenanthrene.",
            source: "u2-nom-phenanthrene",
            quote: "Three fused rings: straight is anthracene, bent is phenanthrene.",
          },
        ],
        example: { source: "u2-nom-meta", quote: "Count the ring bonds between the two groups: one is ortho, two is meta, three is para." },
      },
    ],
    mistakes: [
      {
        mistake: "Mixing up meta and para.",
        fix: "Count the ring bonds: two is meta, three is para.",
        source: "u2-nom-meta",
        quote: "two is meta, three is para",
      },
      {
        mistake: "Numbering a chlorophenol from the Cl.",
        fix: "When the parent is phenol, the OH carbon is C1.",
        source: "u2-nom-chlorophenol",
        quote: "When the parent is phenol, the OH carbon is C1",
      },
      {
        mistake: "Calling three fused rings with a bend anthracene.",
        fix: "Anthracene is a straight row; the bent one is phenanthrene.",
        source: "u2-nom-anthracene",
        quote: "Anthracene has three in a line; phenanthrene has three with a bend.",
      },
    ],
  },
];

export const U2_GUIDE: UnitGuide = {
  unitId: "u2",
  intro:
    "When a ring is aromatic, and what that changes: the four tests, charged rings, annulenes, heterocycles and the NMR signal that proves it. Read a stage before its lessons, or come back when one trips you up.",
  stages: STAGES,
  examples: U2_GUIDE_EXAMPLES,
  placeholder: true,
};
