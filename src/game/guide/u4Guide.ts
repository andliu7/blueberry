/**
 * Unit 4's guidebook, the words. Drafts until the owner signs them off.
 *
 * NO NEW CHEMISTRY LIVES HERE. Every idea, every mistake and every example
 * names `source`, a Unit 4 pool entry, and `quote`, words copied exactly from
 * that entry's explanation or its correct option. test/guideU4.test.ts fails
 * a quote the source does not contain, and an idea whose source is not in its
 * own lesson. The `text`, `mistake` and `fix` lines are plain paraphrases of
 * those quotes, nothing more.
 *
 * Side quests sit in the stage of the lesson they branch from, so a student
 * meets them beside it; benzyne and the isotope proof hang off no lesson, so
 * they share a side quest stage of their own. The drawings are generated:
 * u4Guide.figures.ts, by scripts/guide_u4.py. This file is loaded only when a
 * student opens the Unit 4 guide (index.ts).
 */
import type { GuideStage, UnitGuide } from "./types";
import { U4_GUIDE_EXAMPLES } from "./u4Guide.figures";

const STAGES: readonly GuideStage[] = [
  {
    id: "a",
    label: "Stage A",
    title: "Addition, then elimination",
    optional: false,
    checkpoint: null,
    lessons: [
      {
        node: "u4-snar",
        ideas: [
          {
            text: "SNAr swaps the halogen for the nucleophile at the same carbon, and the nitro groups ortho and para to it are what make the swap possible.",
            mark: "at the same carbon",
            source: "u4-snar-meet",
            quote: "SNAr swaps the halogen for the nucleophile at the same carbon. The nitro groups ortho and para to it make the swap possible.",
          },
          {
            text: "The ring needs an electron acceptor ortho or para to the leaving group, so the anion has somewhere to put its charge.",
            source: "u4-snar-which",
            quote: "SNAr needs an electron acceptor ortho or para to the leaving group, so the anion it forms has somewhere to put its charge.",
          },
          {
            text: "A meta acceptor does not help: the charge never reaches its carbon.",
            source: "u4-snar-meta-out",
            quote: "Ortho and para acceptors activate; a meta one does not, because the charge never reaches its carbon.",
          },
          {
            text: "An acceptor has a multiple bond to O or N on its first atom: NO₂, and C≡N too.",
            source: "u4-snar-acceptor",
            quote: "An acceptor has a multiple bond to O or N on its first atom, so the charge can move onto that atom.",
          },
          {
            text: "Amines do SNAr as well: N bonds where the halogen was.",
            source: "u4-snar-amine",
            quote: "Amines do SNAr too: N bonds where F was, and the nitro group stays to stabilise the intermediate.",
          },
        ],
        example: { source: "u4-snar-meet", quote: "SNAr swaps the halogen for the nucleophile at the same carbon." },
      },
      {
        node: "u4-dow",
        ideas: [
          {
            text: "Chlorobenzene and hot NaOH give phenol after acid workup: the Dow process.",
            mark: "phenol",
            source: "u4-dow-meet",
            quote: "The Dow process: chlorobenzene and hot NaOH give phenol after acid workup.",
          },
          {
            text: "With no acceptor, hot hydroxide goes through benzyne, so two isomers form.",
            source: "u4-dow-pbt",
            quote: "Hot hydroxide on an unactivated aryl halide goes through benzyne, so two isomers form.",
          },
          {
            text: "Add an acceptor and the mechanism switches to SNAr, which gives one product.",
            source: "u4-dow-single",
            quote: "An acceptor switches the mechanism to SNAr, and SNAr gives one product.",
          },
        ],
        example: { source: "u4-dow-pbt", quote: "the aryne spans the old C-Br carbon and its neighbour, and OH⁻ adds to either end." },
      },
      {
        node: "u4-meisenheimer",
        ideas: [
          {
            text: "The Meisenheimer complex has the nucleophile and the leaving group on one sp³ carbon, and a minus charge spread over the ring.",
            mark: "on one sp³ carbon",
            source: "u4-meis-meet",
            quote: "The Meisenheimer complex has the nucleophile and the leaving group on one sp³ carbon, and a delocalised minus charge.",
          },
          {
            text: "The charge sits ortho and para to where the nucleophile added. That is why acceptors must be ortho or para.",
            source: "u4-meis-sites",
            quote: "the charge sits ortho and para to where the nucleophile added. That is why acceptors must be ortho or para.",
          },
          {
            text: "The nitro group earns its place by taking the charge onto oxygen. That form is the exam drawing.",
            source: "u4-meis-oxygen",
            quote: "The nitro group earns its place by taking the charge onto oxygen. That form is the exam drawing.",
          },
          {
            text: "Addition costs the ring its aromaticity, which is why a strong acceptor is needed.",
            source: "u4-meis-aromatic",
            quote: "Addition costs the ring its aromaticity, which is why a strong acceptor is needed to make it worth it.",
          },
        ],
        example: { source: "u4-meis-meet", quote: "Methoxide bonds to the carbon that holds Cl." },
      },
      {
        node: "u4-lg-order",
        ideas: [
          {
            text: "The slow step is addition, so the most electronegative halogen wins: F > Cl > Br > I.",
            mark: "F > Cl > Br > I",
            source: "u4-lg-fastest",
            quote: "In SNAr the slow step is addition, so the most electronegative halogen wins: F > Cl > Br > I.",
          },
          {
            text: "That is the reverse of the SN2 order.",
            source: "u4-lg-slowest",
            quote: "The SNAr order runs F > Cl > Br > I, the reverse of SN2.",
          },
          {
            text: "Activation first, halogen second: only a halogen ortho or para to the acceptor reacts.",
            source: "u4-lg-bromo-fluoro",
            quote: "Activation first, halogen second: only the halogen ortho or para to the acceptor reacts.",
          },
          {
            text: "When activation is tied, the halogen order decides and F goes first.",
            source: "u4-lg-mixed",
            quote: "Equal activation, so the halogen order decides: F goes first.",
          },
        ],
        example: { source: "u4-lg-bromo-fluoro", quote: "F is ortho to NO₂, so its carbon is activated. Br is meta to NO₂ and is not." },
      },
    ],
    mistakes: [
      {
        mistake: "Expecting a meta nitro group to activate the halogen.",
        fix: "Only ortho and para acceptors take the charge.",
        source: "u4-meis-meta",
        quote: "A meta acceptor gives no oxygen form, so the anion is barely stabilised and the reaction does not go.",
      },
      {
        mistake: "Using the SN2 leaving group order, with iodide fastest.",
        fix: "In SNAr fluoride is fastest, because addition is the slow step.",
        source: "u4-lg-why",
        quote: "Leaving-group ability barely matters in SNAr: the slow step is addition, and F speeds that up.",
      },
      {
        mistake: "Replacing a halogen that has no acceptor ortho or para to it.",
        fix: "Read each halogen's relation to the acceptor first.",
        source: "u4-snar-two-cl",
        quote: "Read each halogen's relation to the acceptor. Only the one ortho or para to NO₂ is replaced.",
      },
      {
        mistake: "Moving the new group to a different carbon.",
        fix: "SNAr keeps the pattern: the new group takes the halogen's carbon.",
        source: "u4-snar-oh",
        quote: "SNAr keeps the substitution pattern: the new group takes the halogen's carbon.",
      },
    ],
  },
  {
    id: "b",
    label: "Stage B",
    title: "Side quests: benzyne",
    optional: true,
    checkpoint: null,
    lessons: [
      {
        node: "u4-benzyne",
        ideas: [
          {
            text: "Without an acceptor, a very strong base goes the benzyne way: eliminate HCl, then add NH₂⁻ and H.",
            mark: "the benzyne way",
            source: "u4-bz-meet",
            quote: "Without an acceptor, a very strong base goes the benzyne way: eliminate HCl, then add NH₂⁻ and H.",
          },
          {
            text: "The aryne's two carbons are the old C-Cl carbon and the ortho carbon that lost its H.",
            source: "u4-bz-aryne",
            quote: "The aryne's two carbons are the old C-Cl carbon and the ortho carbon that lost its H.",
          },
          {
            text: "Benzyne gives a mixture: the new group lands on either carbon of the triple bond.",
            source: "u4-bz-pct",
            quote: "Benzyne gives a mixture: the new group lands on either carbon of the triple bond.",
          },
          {
            text: "No H ortho to the halogen, no benzyne.",
            source: "u4-bz-no-h",
            quote: "Benzyne needs an H ortho to the halogen. Block both ortho spots and the reaction stops.",
          },
        ],
        example: { source: "u4-bz-pct", quote: "NH₂⁻ can add to either end of the aryne: at the old C-Cl carbon (para to CH₃) or next to it (meta)." },
      },
      {
        node: "u4-isotope",
        ideas: [
          {
            text: "Half the aniline has the label on C-N and half next to it: the signature of a symmetric intermediate.",
            mark: "a symmetric intermediate",
            source: "u4-iso-meet",
            quote: "Half the aniline has the label on C-N, half next to it: the signature of a symmetric intermediate.",
          },
          {
            text: "The two ends of benzyne are the same, so the label splits 50:50.",
            source: "u4-iso-ratio",
            quote: "The two ends of benzyne are the same, so the label splits 50:50 between C1 and C2.",
          },
          {
            text: "A one-step swap would give one labelled product. Seeing two rules it out.",
            source: "u4-iso-direct",
            quote: "A one-step swap predicts one labelled product. Seeing two rules it out.",
          },
        ],
        example: {
          source: "u4-iso-meet",
          quote: "The aryne joins the labelled carbon to its neighbour. NH₂⁻ adds to either end, so the label lands on C-N or next to it.",
        },
      },
    ],
    mistakes: [
      {
        mistake: "Expecting methoxide to make benzyne from plain chlorobenzene.",
        fix: "Methoxide is far too weak a base. With no acceptor either, nothing happens.",
        source: "u4-bz-vs-snar",
        quote: "No acceptor for SNAr, and methoxide is far too weak a base to pull a ring H and make benzyne.",
      },
      {
        mistake: "Drawing only the product with the new group where the halogen was.",
        fix: "Add to both ends of the aryne.",
        source: "u4-bz-oct",
        quote: "Find the ortho C-H, draw the aryne, and add NH₂ to each end.",
      },
      {
        mistake: "Forgetting the second aryne when both ortho carbons carry an H.",
        fix: "Draw each aryne, then add to both ends of each.",
        source: "u4-bz-mct-count",
        quote: "Count the ortho C-H, draw each aryne, then add to both ends of each.",
      },
    ],
  },
];

export const U4_GUIDE: UnitGuide = {
  unitId: "u4",
  intro:
    "How a nucleophile replaces a halogen on a benzene ring: addition then elimination when a nitro group sits ortho or para, and the benzyne route when a very strong base has no acceptor to help it. Read a stage before its lessons, or come back when one trips you up.",
  stages: STAGES,
  examples: U4_GUIDE_EXAMPLES,
  placeholder: true,
};
