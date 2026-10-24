/**
 * Unit 6's guidebook, the words. Drafts until the owner signs them off.
 *
 * NO NEW CHEMISTRY LIVES HERE. Every idea, every mistake and every example
 * names `source`, a Unit 6 pool entry, and `quote`, words copied exactly from
 * that entry's explanation or its correct option. test/guideU6.test.ts fails
 * a quote the source does not contain, and an idea whose source is not in its
 * own lesson. The `text`, `mistake` and `fix` lines are plain paraphrases of
 * those quotes, nothing more.
 *
 * 2D NMR and UV hang off no lesson, so they share a side quest stage. The
 * drawings are generated: u6Guide.figures.ts, by scripts/guide_u6.py, with
 * every number under a molecule computed by the Unit 6 pool script. This file
 * is loaded only when a student opens the Unit 6 guide (index.ts).
 */
import type { GuideStage, UnitGuide } from "./types";
import { U6_GUIDE_EXAMPLES } from "./u6Guide.figures";

const STAGES: readonly GuideStage[] = [
  {
    id: "a",
    label: "Stage A",
    title: "Formula, IR, NMR and mass",
    optional: false,
    checkpoint: null,
    lessons: [
      {
        node: "u6-dou",
        ideas: [
          {
            text: "Each ring and each pi bond is one degree of unsaturation. Benzene has one ring and three C=C, so four.",
            mark: "one degree of unsaturation",
            source: "u6-dou-meet-ring",
            quote: "Each ring and each pi bond is one degree of unsaturation. Benzene has one ring and three C=C, so four.",
          },
          {
            text: "Compare with the saturated alkane, CₙH₂ₙ₊₂: every two H missing is one ring or one pi bond.",
            source: "u6-dou-c6h10",
            quote: "Compare with the saturated alkane, CₙH₂ₙ₊₂: every two H missing is one ring or one pi bond.",
          },
          {
            text: "Halogens count as hydrogens.",
            source: "u6-dou-halogen",
            quote: "Halogens count as hydrogens.",
          },
          {
            text: "Add one H to the saturated count for each nitrogen. Oxygen changes nothing.",
            source: "u6-dou-nitrogen",
            quote: "Add one H to the saturated count for each nitrogen. Oxygen changes nothing.",
          },
          {
            text: "Four or more degrees is the cue to look for a benzene ring first.",
            source: "u6-dou-fit-c8h10",
            quote: "Four or more is the cue to look for a benzene ring first.",
          },
        ],
        example: { source: "u6-dou-meet-ring", quote: "Each ring and each pi bond is one degree of unsaturation." },
      },
      {
        node: "u6-ir",
        ideas: [
          {
            text: "Each bond stretches in its own range. A strong, sharp band from 1670 to 1780 cm⁻¹ is a C=O.",
            mark: "1670 to 1780 cm⁻¹",
            source: "u6-ir-meet",
            quote: "Each bond stretches in its own range. A strong, sharp band from 1670 to 1780 cm⁻¹ is a C=O.",
          },
          {
            text: "Read C=O shifts from the 1715 ketone: conjugation, or an amide's N, lowers it toward 1690; an ester's O raises it toward 1735.",
            source: "u6-ir-carbonyl",
            quote: "Read C=O shifts from the 1715 ketone: conjugation, or an amide's N, lowers it toward 1690; an ester's O raises it toward 1735.",
          },
          {
            text: "Read the 3000 line: sp³ C-H just below it, alkene and aromatic C-H just above, a terminal alkyne C-H sharp at 3300.",
            source: "u6-ir-ch",
            quote: "Read the 3000 line: sp³ C-H just below it, alkene and aromatic C-H just above, a terminal alkyne C-H sharp at 3300.",
          },
          {
            text: "Only a carboxylic acid has both: an O-H band so broad it runs down to 2500 cm⁻¹, and a C=O near 1710.",
            source: "u6-ir-acid",
            quote: "Only a carboxylic acid has both: an O-H band so broad it runs down to 2500 cm⁻¹, and a C=O near 1710.",
          },
          {
            text: "Count the N-H bands: two for a primary amine, one for a secondary, none for a tertiary.",
            source: "u6-ir-amine",
            quote: "Count the N-H bands: two for a primary amine, one for a secondary, none for a tertiary.",
          },
          {
            text: "An intense band near 2250 cm⁻¹ is the C≡N of a nitrile.",
            source: "u6-ir-nitrile",
            quote: "An intense band near 2250 cm⁻¹ is the C≡N of a nitrile.",
          },
        ],
        example: { source: "u6-ir-carbonyl", quote: "Read C=O shifts from the 1715 ketone" },
      },
      {
        node: "u6-hnmr",
        ideas: [
          {
            text: "One signal per set of equivalent H. Ask whether a symmetry operation swaps two groups; if not, they differ.",
            mark: "One signal per set of equivalent H",
            source: "u6-hnmr-meet-count",
            quote: "One signal per set of equivalent H. Ask whether a symmetry operation swaps two groups; if not, they differ.",
          },
          {
            text: "Integration is proportional to the number of H in each set, so count them all and reduce.",
            source: "u6-hnmr-ratio-ether",
            quote: "Integration is proportional to the number of H in each set, so count all of them and reduce.",
          },
          {
            text: "A signal splits into n + 1 lines, n being the H on neighbouring carbons. An isopropyl CH is a septet.",
            source: "u6-hnmr-septet",
            quote: "A signal splits into n + 1 lines, n being the H on neighbouring carbons. An isopropyl CH is a septet.",
          },
          {
            text: "Neighbours on both sides add up under the n + 1 rule when the couplings are similar.",
            source: "u6-hnmr-sextet",
            quote: "Neighbours on both sides add up under the n + 1 rule when the couplings are similar.",
          },
        ],
        example: { source: "u6-hnmr-symmetry", quote: "Symmetry cuts the signal count: pentan-3-one's two ethyl groups are one environment." },
      },
      {
        node: "u6-cnmr",
        ideas: [
          {
            text: "One ¹³C signal per carbon environment, quaternary and C=O carbons included.",
            mark: "per carbon environment",
            source: "u6-cnmr-meet-count",
            quote: "One ¹³C signal per carbon environment, quaternary and C=O carbons included.",
          },
          {
            text: "A monosubstituted benzene gives four ring carbon signals: ipso, ortho, meta, para.",
            source: "u6-cnmr-toluene",
            quote: "A monosubstituted benzene gives four ring carbon signals: ipso, ortho, meta, para.",
          },
          {
            text: "DEPT-135 sorts carbons by H count: CH and CH₃ up, CH₂ down, carbons with no H gone.",
            source: "u6-cnmr-dept135",
            quote: "DEPT-135 sorts carbons by H count: CH and CH₃ up, CH₂ down, no-H carbons gone.",
          },
          {
            text: "DEPT-90 shows CH carbons only.",
            source: "u6-cnmr-dept90",
            quote: "DEPT-90 shows CH carbons only, so it picks out every C bonded to exactly one H.",
          },
        ],
        example: { source: "u6-cnmr-isomer", quote: "Isomers with one formula can differ in ¹³C signal count. Symmetry is what tells them apart." },
      },
      {
        node: "u6-ms",
        ideas: [
          {
            text: "The molecular ion is the intact molecule with one electron removed, so its m/z is the molecular mass.",
            mark: "the molecular mass",
            source: "u6-ms-meet-mplus",
            quote: "The molecular ion is the intact molecule with one electron removed, so its m/z is the molecular mass.",
          },
          {
            text: "One Br gives two molecular ion peaks two units apart, nearly the same height.",
            source: "u6-ms-br",
            quote: "One Br gives two molecular ion peaks two units apart, nearly the same height.",
          },
          {
            text: "One Cl gives an M+2 peak about a third the height of M.",
            source: "u6-ms-cl",
            quote: "One Cl gives an M+2 peak about a third the height of M.",
          },
          {
            text: "The nitrogen rule: an odd molecular ion means an odd number of nitrogens.",
            source: "u6-ms-nitrogen",
            quote: "The nitrogen rule: an odd molecular ion means an odd number of nitrogens.",
          },
        ],
        example: { source: "u6-ms-br", quote: "One Br gives two molecular ion peaks two units apart, nearly the same height." },
      },
    ],
    mistakes: [
      {
        mistake: "Counting the oxygen atoms when working out degrees of unsaturation.",
        fix: "Ignore O: only C, H, N and the halogens enter the count.",
        source: "u6-dou-ester",
        quote: "Oxygen does not enter the count.",
      },
      {
        mistake: "Reading an ether's oxygen as an O-H band.",
        fix: "An ether has no O-H, so the 3400 to 3650 region stays empty.",
        source: "u6-ir-alcohol",
        quote: "An ether has the same O but no O-H, so it shows no band there.",
      },
      {
        mistake: "Giving each ethyl group of a symmetric molecule its own signals.",
        fix: "Groups that symmetry swaps are one environment.",
        source: "u6-hnmr-symmetry",
        quote: "Symmetry cuts the signal count",
      },
      {
        mistake: "Leaving out carbons with no H in a ¹³C count.",
        fix: "They have no H, yet they still give a ¹³C signal.",
        source: "u6-cnmr-xylene",
        quote: "Ring carbons bearing a substituent have no H, yet they still give a ¹³C signal.",
      },
      {
        mistake: "Expecting the ¹H and ¹³C signal counts to match.",
        fix: "A quaternary carbon shows only in ¹³C.",
        source: "u6-cnmr-neopentane",
        quote: "¹H and ¹³C counts can differ: a quaternary carbon shows only in ¹³C.",
      },
    ],
  },
  {
    id: "b",
    label: "Stage B",
    title: "Side quests: 2D NMR and UV",
    optional: true,
    checkpoint: null,
    lessons: [
      {
        node: "u6-2d",
        ideas: [
          {
            text: "COSY pairs H that couple, which for a chain means H on bonded carbons.",
            mark: "H on bonded carbons",
            source: "u6-2d-meet-cosy",
            quote: "COSY pairs H that couple, which for a chain means H on bonded carbons.",
          },
          {
            text: "HSQC links each H to the carbon it sits on, so carbons without H are missing.",
            source: "u6-2d-hsqc-count",
            quote: "HSQC links each H to the carbon it sits on, so carbons without H are missing.",
          },
          {
            text: "HMBC reaches two or three bonds from an H, which is how it connects pieces across a C=O.",
            source: "u6-2d-hmbc",
            quote: "HMBC reaches two or three bonds from an H, which is how it connects pieces across a C=O.",
          },
        ],
        example: { source: "u6-2d-hsqc-count", quote: "HSQC links each H to the carbon it sits on, so carbons without H are missing." },
      },
      {
        node: "u6-uv",
        ideas: [
          {
            text: "Each pi bond added to a conjugated system narrows the HOMO-LUMO gap and moves the absorption to longer wavelength.",
            mark: "longer wavelength",
            source: "u6-uv-meet",
            quote: "Each pi bond added to a conjugated system narrows the HOMO-LUMO gap and moves the absorption to longer wavelength.",
          },
          {
            text: "Conjugated pi bonds alternate with single bonds. One sp³ carbon in between isolates them.",
            source: "u6-uv-conj-diene",
            quote: "Conjugated pi bonds alternate with single bonds. One sp³ carbon in between isolates them.",
          },
          {
            text: "A C=O conjugates like a C=C does, when only one single bond separates it from the next pi bond.",
            source: "u6-uv-enone",
            quote: "A C=O conjugates like a C=C does, when only one single bond separates it from the next pi bond.",
          },
        ],
        example: { source: "u6-uv-not", quote: "Look between the pi bonds: a single bond alone conjugates, an sp³ carbon isolates." },
      },
    ],
    mistakes: [
      {
        mistake: "Looking for a COSY cross peak from a singlet.",
        fix: "A singlet has no partner in COSY.",
        source: "u6-2d-cosy-none",
        quote: "A singlet in ¹H has no partner in COSY.",
      },
      {
        mistake: "Expecting a C=O carbon in HSQC.",
        fix: "A carbon with no H is invisible there; HMBC assigns it.",
        source: "u6-2d-hsqc-none",
        quote: "A carbon with no H is invisible in HSQC; HMBC is how it gets assigned.",
      },
      {
        mistake: "Counting every C=C toward the wavelength.",
        fix: "Only pi bonds in one conjugated system count.",
        source: "u6-uv-ring",
        quote: "Counting C=C is not enough. Only pi bonds in one conjugated system lengthen the wavelength.",
      },
    ],
  },
];

export const U6_GUIDE: UnitGuide = {
  unitId: "u6",
  intro:
    "Reading a structure off its data: degrees of unsaturation from the formula, then the IR bands, ¹H and ¹³C NMR, DEPT and the mass spectrum, with 2D NMR and UV as side quests. Read a stage before its lessons, or come back when one trips you up.",
  stages: STAGES,
  examples: U6_GUIDE_EXAMPLES,
  placeholder: true,
};
