/**
 * Unit 0's guidebook, the words. Drafts until the owner signs them off.
 *
 * Same rule as u1Guide.ts: NO NEW CHEMISTRY LIVES HERE. Every idea, mistake
 * and example caption names `source`, a Unit 0 pool entry, and `quote`, words
 * copied exactly from that entry's explanation or its correct option.
 * test/guideU0.test.ts fails a quote the source does not contain, and an idea
 * whose source is not in its own chapter's pool.
 *
 * The drawings are generated: u0Guide.figures.ts, by scripts/u0_pools.py.
 *
 * Three stages, matching the story: the bench (chapter 1), the Orgo I review
 * (chapters 2 to 8, closed by the test out quiz), and the peek at Orgo II
 * (chapter 9, the map). Each lesson is a chapter's practice node.
 */
import type { GuideStage, UnitGuide } from "./types";
import { U0_GUIDE_EXAMPLES } from "./u0Guide.figures";

const STAGES: readonly GuideStage[] = [
  {
    id: "bench",
    label: "Chapter 1",
    title: "Your lab bench",
    optional: false,
    checkpoint: null,
    lessons: [
      {
        node: "u0-controls",
        ideas: [
          {
            text: "An alcohol is an O-H on an sp3 carbon. Tap that group to pick it.",
            mark: "an O-H on an sp3 carbon",
            source: "u0-ctl-tap",
            quote: "An alcohol is an O-H on an sp3 carbon.",
          },
          {
            text: "A formula counts every atom. More bonds between two carbons leaves room for fewer H.",
            source: "u0-ctl-match",
            quote: "More bonds between two carbons leaves room for fewer H.",
          },
          {
            text: "Ethanol is two carbons with an O-H on the end. You build it on the sketchpad.",
            source: "u0-ctl-draw",
            quote: "two carbons, and an O-H on the end",
          },
        ],
        example: { source: "u0-ctl-draw", quote: "two carbons, and an O-H on the end" },
      },
    ],
    mistakes: [
      {
        mistake: "Calling any molecule with an O in it an alcohol.",
        fix: "An alcohol needs an O-H on an sp3 carbon.",
        source: "u0-ctl-tap",
        quote: "An alcohol is an O-H on an sp3 carbon.",
      },
      {
        mistake: "Drawing the O between the two carbons.",
        fix: "That is dimethyl ether. Ethanol keeps its O-H on the end.",
        source: "u0-ctl-draw",
        quote: "an O-H on the end",
      },
      {
        mistake: "Giving ethene and ethyne the same H count as ethane.",
        fix: "Each extra bond between the carbons takes the place of two H.",
        source: "u0-ctl-match",
        quote: "More bonds between two carbons leaves room for fewer H.",
      },
    ],
  },
  {
    id: "review",
    label: "Chapters 2 to 8",
    title: "Orgo I review",
    optional: false,
    checkpoint: "u0-check",
    lessons: [
      {
        node: "u0-bonding",
        ideas: [
          {
            text: "Formal charge is the valence electrons an atom brought, minus the electrons it owns.",
            mark: "minus the electrons it owns",
            source: "u0-bond-fc-nh4",
            quote: "Formal charge is valence electrons minus the electrons the atom owns.",
          },
          {
            text: "A neutral O makes two bonds and keeps two lone pairs.",
            source: "u0-bond-lp-water",
            quote: "Neutral O makes two bonds and keeps two lone pairs.",
          },
          {
            text: "A neutral N makes three bonds and keeps one lone pair.",
            source: "u0-bond-lp-nh3",
            quote: "Neutral N makes three bonds and keeps one lone pair.",
          },
        ],
        example: { source: "u0-bond-fc-nh4", quote: "so it is +1" },
      },
      {
        node: "u0-resonance",
        ideas: [
          {
            text: "Resonance contributors keep every atom in place. Only electrons move.",
            mark: "Only electrons move",
            source: "u0-res-moves",
            quote: "Only electrons move: lone pairs and pi bonds.",
          },
          {
            text: "In acetate the charge is shared by both O atoms.",
            source: "u0-res-where",
            quote: "The charge is shared by both O atoms.",
          },
          {
            text: "Resonance needs a pi bond right next to the charge.",
            source: "u0-res-which",
            quote: "Resonance needs a pi bond next to the charge.",
          },
        ],
        example: { source: "u0-res-count", quote: "the minus on one O or on the other" },
      },
      {
        node: "u0-acids",
        ideas: [
          {
            text: "Lower pKa means a stronger acid.",
            mark: "Lower pKa",
            source: "u0-acid-sort",
            quote: "Lower pKa, stronger acid.",
          },
          {
            text: "A conjugate base is the acid with one H⁺ taken off.",
            source: "u0-acid-cb-acetic",
            quote: "A conjugate base is the acid minus one H⁺.",
          },
          {
            text: "Acid and base react toward the weaker acid and the weaker base.",
            source: "u0-acid-equilibrium",
            quote: "Acid and base react toward the weaker acid and weaker base.",
          },
        ],
        example: { source: "u0-acid-stronger", quote: "acetate shares its charge over two O atoms" },
      },
      {
        node: "u0-nuc-elec",
        ideas: [
          {
            text: "A nucleophile gives a pair of electrons.",
            mark: "gives a pair of electrons",
            source: "u0-ne-hydroxide",
            quote: "A nucleophile gives a pair of electrons.",
          },
          {
            text: "An electrophile is electron poor, like the delta plus carbon of a C-Br bond.",
            source: "u0-ne-ch3br",
            quote: "An electrophile is electron poor.",
          },
          {
            text: "In every aldehyde and ketone, the carbonyl carbon is the electrophile.",
            source: "u0-ne-acetone",
            quote: "The carbonyl carbon is the electrophile in every aldehyde and ketone.",
          },
        ],
        example: { source: "u0-ne-ch3br", quote: "the carbon is delta plus" },
      },
      {
        node: "u0-arrows",
        ideas: [
          {
            text: "A curved arrow always starts at electrons: a lone pair or a bond.",
            mark: "starts at electrons",
            source: "u0-arr-tail",
            quote: "An arrow always starts at electrons: a lone pair or a bond.",
          },
          {
            text: "One full arrowhead moves two electrons.",
            source: "u0-arr-means",
            quote: "A curved arrow with a full head moves two electrons",
          },
          {
            text: "The leaving group takes the bond's two electrons with it.",
            source: "u0-arr-second",
            quote: "Bromide leaves holding both electrons.",
          },
        ],
        example: { source: "u0-arr-product", quote: "a new C-O bond, a broken C-Br bond" },
      },
      {
        node: "u0-subst-elim",
        ideas: [
          {
            text: "First, count the carbons bonded to the carbon that holds the leaving group.",
            mark: "count the carbons",
            source: "u0-se-degree",
            quote: "Count the carbons bonded to the carbon that holds the leaving group.",
          },
          {
            text: "Methyl and 1° carbons with a strong nucleophile go SN2.",
            source: "u0-se-methyl",
            quote: "Methyl and 1° carbons with a strong nucleophile react by SN2",
          },
          {
            text: "A 3° carbon with a strong base goes E2.",
            source: "u0-se-e2",
            quote: "Strong base, 3° carbon: E2.",
          },
          {
            text: "A 3° carbon with a weak nucleophile goes SN1: the leaving group leaves first.",
            source: "u0-se-sn1",
            quote: "the leaving group goes first (SN1)",
          },
        ],
        example: { source: "u0-se-e2", quote: "The base pulls a beta H as Br leaves" },
      },
      {
        node: "u0-stereo",
        ideas: [
          {
            text: "A stereocentre is a carbon holding four different groups.",
            mark: "four different groups",
            source: "u0-st-count",
            quote: "A stereocentre is a carbon with four different groups.",
          },
          {
            text: "Rank the groups by the atomic number of the attached atom.",
            source: "u0-st-priority",
            quote: "rank by the atomic number of the atom attached",
          },
          {
            text: "The mirror image of an R centre is S.",
            source: "u0-st-mirror",
            quote: "The mirror image of an R centre is S.",
          },
          {
            text: "On an alkene, top groups on opposite sides is E; same side is Z.",
            source: "u0-st-ez",
            quote: "Opposite sides is E; same side is Z.",
          },
        ],
        example: { source: "u0-st-mirror", quote: "They are enantiomers." },
      },
    ],
    mistakes: [
      {
        mistake: "Starting an arrow on the atom being attacked.",
        fix: "Arrows start at electrons and end where the new bond forms.",
        source: "u0-arr-tail",
        quote: "An arrow always starts at electrons",
      },
      {
        mistake: "Drawing resonance by moving an atom.",
        fix: "Keep the skeleton still. Move only lone pairs and pi bonds.",
        source: "u0-res-moves",
        quote: "Only electrons move: lone pairs and pi bonds.",
      },
      {
        mistake: "Picking the acid with the bigger pKa as the stronger one.",
        fix: "It is the other way round: lower pKa, stronger acid.",
        source: "u0-acid-stronger",
        quote: "Lower pKa, stronger acid.",
      },
      {
        mistake: "Calling a 3° bromide with a strong base an SN2.",
        fix: "Strong base on a 3° carbon is E2.",
        source: "u0-se-e2",
        quote: "Strong base, 3° carbon: E2.",
      },
    ],
  },
  {
    id: "preview",
    label: "Chapter 9",
    title: "A peek at Orgo II",
    optional: false,
    checkpoint: null,
    lessons: [
      {
        node: "u0-preview",
        ideas: [
          {
            text: "The Diels-Alder joins a diene and a C=C into a six-membered ring in one step.",
            mark: "in one step",
            source: "u0-pv-u1",
            quote: "The Diels-Alder joins a diene and a C=C into a cyclohexene in one step.",
          },
          {
            text: "Benzene is aromatic, and that makes it extra stable.",
            source: "u0-pv-u2",
            quote: "Benzene is aromatic",
          },
          {
            text: "Amines add to a carbonyl carbon and water leaves, giving an imine.",
            source: "u0-pv-u7",
            quote: "Amines add to the carbonyl carbon and water leaves, giving an imine.",
          },
        ],
        example: { source: "u0-pv-u1", quote: "joins a diene and a C=C into a cyclohexene" },
      },
    ],
    mistakes: [
      {
        mistake: "Expecting benzene to add Br₂ the way an alkene does.",
        fix: "Aromatic rings substitute: Br replaces an H and the ring stays aromatic.",
        source: "u0-pv-u3",
        quote: "Aromatic rings substitute instead of adding",
      },
      {
        mistake: "Counting every carbon of open-chain glucose as a stereocentre.",
        fix: "Only C2 to C5 hold four different groups.",
        source: "u0-pv-u13",
        quote: "C2 to C5 each hold four different groups.",
      },
      {
        mistake: "Thinking an amine needs a charge to act as a base.",
        fix: "The lone pair on N is enough.",
        source: "u0-pv-u10",
        quote: "Amines are bases because N keeps one lone pair.",
      },
    ],
  },
];

export const U0_GUIDE: UnitGuide = {
  unitId: "u0",
  intro:
    "Bloom's notebook, page by page: how the controls work, the Orgo I ideas every later unit leans on, and a first look at what Orgo II is about. Draft.",
  stages: STAGES,
  examples: U0_GUIDE_EXAMPLES,
  placeholder: true,
};
