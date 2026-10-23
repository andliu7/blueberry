/**
 * Unit 5's guidebook, the words. Drafts until the owner signs them off.
 *
 * NO NEW CHEMISTRY LIVES HERE. Every idea, every mistake and every example
 * names `source`, a Unit 5 pool entry, and `quote`, words copied exactly from
 * that entry's explanation or its correct option. test/guideU5.test.ts fails
 * a quote the source does not contain, and an idea whose source is not in its
 * own lesson. The `text`, `mistake` and `fix` lines are plain paraphrases of
 * those quotes, nothing more.
 *
 * Side quests sit in the stage of the lesson they branch from, straight after
 * it, so a student meets them beside it. The drawings are generated:
 * u5Guide.figures.ts, by scripts/guide_u5.py, with wedges wherever the pool
 * carries stereochemistry. This file is loaded only when a student opens the
 * Unit 5 guide (index.ts).
 */
import type { GuideStage, UnitGuide } from "./types";
import { U5_GUIDE_EXAMPLES } from "./u5Guide.figures";

const STAGES: readonly GuideStage[] = [
  {
    id: "a",
    label: "Stage A",
    title: "What an alcohol can become",
    optional: false,
    checkpoint: null,
    lessons: [
      {
        node: "u5-roh-rx",
        ideas: [
          {
            text: "PBr₃ is the no-cation route: the C-O carbon becomes the C-Br carbon, inverted at a stereocentre.",
            mark: "the no-cation route",
            source: "u5-rx-meet",
            quote: "PBr₃ is the no-cation route: the C-O carbon becomes the C-Br carbon.",
          },
          {
            text: "PBr₃ is SN2 at carbon: one stereocentre in, inverted out.",
            source: "u5-rx-invert",
            quote: "PBr₃ is SN2 at carbon: one stereocentre in, inverted out.",
          },
          {
            text: "HX makes a cation, and a cation moves if one shift makes it more substituted.",
            source: "u5-rx-shift",
            quote: "HX makes a cation, and a cation moves if one shift makes it more substituted.",
          },
          {
            text: "SOCl₂ sheds SO₂ gas and HCl, which is why the reaction runs one way.",
            source: "u5-rx-socl2",
            quote: "SOCl₂ turns C-OH into C-Cl and sheds SO₂ gas and HCl, which is why the reaction runs one way.",
          },
        ],
        example: { source: "u5-rx-noshift", quote: "Same alcohol, two reagents: HBr can rearrange, PBr₃ cannot." },
      },
      {
        node: "u5-appel",
        ideas: [
          {
            text: "The Appel reaction is another OH to Br swap at the same carbon, with no cation.",
            mark: "with no cation",
            source: "u5-ap-meet",
            quote: "The Appel reaction is another OH to Br swap at the same carbon, with no cation.",
          },
          {
            text: "At a stereocentre the Appel inverts, just as PBr₃ does.",
            source: "u5-ap-invert",
            quote: "Appel at a stereocentre: inversion.",
          },
          {
            text: "Phosphorus ends up as Ph₃P=O: the oxygen the alcohol gave up.",
            source: "u5-ap-byproducts",
            quote: "Phosphorus ends up as Ph₃P=O: the oxygen the alcohol gave up.",
          },
        ],
        example: { source: "u5-ap-noshift", quote: "No cation forms in the Appel, so nothing can shift. Br takes the place of the activated oxygen on C2." },
      },
      {
        node: "u5-tosylate",
        ideas: [
          {
            text: "Tosylation makes a good leaving group on oxygen without touching the carbon.",
            mark: "without touching the carbon",
            source: "u5-ts-meet",
            quote: "Tosylation makes a good leaving group on oxygen without touching the carbon.",
          },
          {
            text: "Making the tosylate keeps the configuration; the inversion comes later, when a nucleophile displaces it.",
            source: "u5-ts-retain",
            quote: "Making the tosylate keeps the configuration; the inversion comes later, when a nucleophile displaces it.",
          },
          {
            text: "Mesylate and tosylate do the same job.",
            source: "u5-ts-mesyl",
            quote: "Mesylate and tosylate do the same job",
          },
        ],
        example: { source: "u5-ts-two-step", quote: "Count inversions step by step: tosylation keeps, SN2 inverts. Net: one inversion." },
      },
      {
        node: "u5-dehydration",
        ideas: [
          {
            text: "Dehydration removes H from one carbon and OH from the next: an alkene and water.",
            mark: "an alkene and water",
            source: "u5-dh-meet",
            quote: "Dehydration removes H from one carbon and OH from the next: an alkene and water.",
          },
          {
            text: "From the cation, lose the H that gives the most substituted alkene.",
            source: "u5-dh-zaitsev",
            quote: "From the cation, lose the H that gives the most substituted alkene.",
          },
          {
            text: "In acid, rearrange first, then eliminate toward the most substituted alkene.",
            source: "u5-dh-shift",
            quote: "In acid, rearrange first, then eliminate toward the most substituted alkene.",
          },
          {
            text: "E1 rate follows the cation: tertiary faster than secondary faster than primary.",
            source: "u5-dh-rate",
            quote: "E1 rate follows the cation: tertiary faster than secondary faster than primary.",
          },
        ],
        example: { source: "u5-dh-pocl3", quote: "POCl₃ with pyridine is the E2 route: no cation, so no rearrangement." },
      },
      {
        node: "u5-pinacol",
        ideas: [
          {
            text: "Pinacol: lose water, shift a group, gain a C=O.",
            mark: "gain a C=O",
            source: "u5-pn-meet",
            quote: "Pinacol: lose water, shift a group, gain a C=O.",
          },
          {
            text: "The group that moves comes from the carbon that keeps its OH.",
            source: "u5-pn-moves",
            quote: "The group that moves comes from the carbon that keeps its OH.",
          },
          {
            text: "The leaving OH is the one whose departure makes the better cation.",
            source: "u5-pn-which-oh",
            quote: "The leaving OH is the one whose departure makes the better cation.",
          },
        ],
        example: { source: "u5-pn-meet", quote: "One OH leaves as water, a methyl shifts to the cation, and the other C-OH becomes C=O." },
      },
      {
        node: "u5-oxidation",
        ideas: [
          {
            text: "A primary alcohol goes one level up with PCC: to the aldehyde.",
            mark: "to the aldehyde",
            source: "u5-ox-meet",
            quote: "A primary alcohol goes one level up with PCC: to the aldehyde.",
          },
          {
            text: "Secondary alcohols become ketones, and a ketone has no C-H left to oxidise.",
            source: "u5-ox-sec",
            quote: "Secondary alcohols become ketones, and a ketone has no C-H left to oxidise.",
          },
          {
            text: "No C-H on the carbinol carbon, no oxidation.",
            source: "u5-ox-tert",
            quote: "No C-H on the carbinol carbon, no oxidation.",
          },
        ],
        example: { source: "u5-ox-jones", quote: "Strong, aqueous oxidants take a primary alcohol all the way to the carboxylic acid." },
      },
      {
        node: "u5-swern",
        ideas: [
          {
            text: "Swern, Dess-Martin and TEMPO all stop a primary alcohol at the aldehyde.",
            mark: "stop a primary alcohol at the aldehyde",
            source: "u5-sw-meet",
            quote: "Swern, Dess-Martin and TEMPO all stop a primary alcohol at the aldehyde.",
          },
          {
            text: "Tertiary alcohols resist every oxidant on this list.",
            source: "u5-sw-tert",
            quote: "Tertiary alcohols resist every oxidant on this list.",
          },
          {
            text: "Same alcohol, mild versus strong oxidant, two different answers.",
            source: "u5-sw-pair",
            quote: "same alcohol, mild versus strong oxidant, two different answers.",
          },
        ],
        example: { source: "u5-sw-meet", quote: "Swern, Dess-Martin and TEMPO all stop a primary alcohol at the aldehyde." },
      },
      {
        node: "u5-thiols",
        ideas: [
          {
            text: "Thiol: R-SH. Sulfide: R-S-R. Sulfoxide and sulfone add one or two S=O.",
            mark: "Thiol: R-SH",
            source: "u5-th-meet",
            quote: "Thiol: R-SH. Sulfide: R-S-R. Sulfoxide and sulfone add one or two S=O.",
          },
          {
            text: "Sulfide, then sulfoxide, then sulfone: one O at a time.",
            source: "u5-th-ox1",
            quote: "Sulfide, then sulfoxide, then sulfone: one O at a time.",
          },
          {
            text: "Thiols oxidise to disulfides, the S-S link that holds proteins in shape.",
            source: "u5-th-disulfide",
            quote: "Thiols oxidise to disulfides, the S-S link that holds proteins in shape.",
          },
        ],
        example: { source: "u5-th-nash", quote: "HS⁻ is a strong nucleophile and the carbon is primary: clean SN2, Br out, SH in." },
      },
    ],
    mistakes: [
      {
        mistake: "Using HBr on an alcohol whose skeleton must not move.",
        fix: "Use Appel or PBr₃: no cation, no rearrangement.",
        source: "u5-ap-noshift",
        quote: "Use Appel or PBr₃ when a skeleton must not rearrange.",
      },
      {
        mistake: "Inverting the stereocentre when the tosylate is made.",
        fix: "Tosylation is an O-H reaction. Carbon is untouched until a nucleophile arrives.",
        source: "u5-ts-bond",
        quote: "Tosylation is an O-H reaction. Carbon is untouched until a nucleophile arrives later.",
      },
      {
        mistake: "Stopping a primary alcohol at the aldehyde with Jones reagent.",
        fix: "In water the aldehyde forms its hydrate, which is oxidised again to the acid.",
        source: "u5-ox-jones",
        quote: "In water the aldehyde forms its hydrate, a new C-OH that is oxidised again.",
      },
      {
        mistake: "Classifying cyclohexylmethanol as secondary because of the ring.",
        fix: "Classify by the carbon holding OH: CH₂OH is primary.",
        source: "u5-ox-pcc-ring",
        quote: "Classify by the carbon holding OH, not by the ring: CH₂OH is primary.",
      },
    ],
  },
  {
    id: "b",
    label: "Stage B",
    title: "Ethers",
    optional: false,
    checkpoint: null,
    lessons: [
      {
        node: "u5-williamson",
        ideas: [
          {
            text: "Williamson: alkoxide plus methyl or primary halide, SN2, an ether.",
            mark: "methyl or primary halide",
            source: "u5-wl-meet",
            quote: "Williamson: alkoxide plus methyl or primary halide, SN2, an ether.",
          },
          {
            text: "Alkoxide plus tertiary halide is an elimination, not a Williamson synthesis.",
            source: "u5-wl-e2",
            quote: "Alkoxide plus tertiary halide is an elimination, not a Williamson synthesis.",
          },
          {
            text: "The alcohol's carbon keeps its configuration; the halide carbon is the one attacked.",
            source: "u5-wl-retain",
            quote: "In a Williamson the alcohol's carbon keeps its configuration; the halide carbon is the one attacked.",
          },
        ],
        example: { source: "u5-wl-pair", quote: "Put the crowded group on the oxygen and the methyl or primary carbon on the halide." },
      },
      {
        node: "u5-alkoxymerc",
        ideas: [
          {
            text: "Alkoxymercuration-demercuration makes a Markovnikov ether with no rearrangement.",
            mark: "a Markovnikov ether",
            source: "u5-am-meet",
            quote: "Alkoxymercuration-demercuration makes a Markovnikov ether with no rearrangement.",
          },
          {
            text: "OR goes where H⁺ would put the cation: the more substituted carbon.",
            source: "u5-am-tert",
            quote: "OR goes where H⁺ would put the cation: the more substituted carbon.",
          },
          {
            text: "No free cation, no rearrangement: the reason to choose mercury.",
            source: "u5-am-noshift",
            quote: "No free cation, no rearrangement: the reason to choose mercury.",
          },
        ],
        example: { source: "u5-am-acid", quote: "Acid-catalysed ether formation can rearrange; alkoxymercuration cannot." },
      },
      {
        node: "u5-cleavage",
        ideas: [
          {
            text: "Excess HX turns every alkyl C-O into C-X.",
            mark: "every alkyl C-O into C-X",
            source: "u5-cl-meet",
            quote: "Excess HX turns every alkyl C-O into C-X.",
          },
          {
            text: "With one equivalent, cleavage follows SN2: iodide to the smaller group.",
            source: "u5-cl-sn2",
            quote: "With one equivalent, cleavage follows SN2: iodide to the smaller group.",
          },
          {
            text: "Check for SN1 first: a tertiary carbon on the ether cleaves by cation.",
            source: "u5-cl-sn1",
            quote: "Check for SN1 first: a tertiary carbon on the ether cleaves by cation.",
          },
        ],
        example: { source: "u5-cl-aryl", quote: "Aryl alkyl ethers cleave to a phenol and an alkyl halide, never an aryl halide." },
      },
      {
        node: "u5-protecting",
        ideas: [
          {
            text: "Silyl protection: O-H becomes O-SiR₃, ready to survive bases and Grignards.",
            mark: "O-H becomes O-SiR₃",
            source: "u5-pg-meet",
            quote: "Silyl protection: O-H becomes O-SiR₃, ready to survive bases and Grignards.",
          },
          {
            text: "Any O-H or N-H must be protected before a Grignard or organolithium is made.",
            source: "u5-pg-why",
            quote: "Any O-H or N-H in the molecule must be protected before a Grignard or organolithium is made.",
          },
          {
            text: "Orthogonal groups come off one at a time, each with its own reagent.",
            source: "u5-pg-orthogonal",
            quote: "Orthogonal groups come off one at a time, each with its own reagent.",
          },
        ],
        example: { source: "u5-pg-tbaf", quote: "Fluoride attacks silicon and the Si-O bond breaks. The alcohol comes back unchanged." },
      },
    ],
    mistakes: [
      {
        mistake: "Making an aryl ether from an aryl halide and an alkoxide.",
        fix: "The aryl group must sit on the oxygen. An aryl halide does not do SN2.",
        source: "u5-wl-aryl",
        quote: "The aryl group must sit on the oxygen. An aryl halide does not do SN2.",
      },
      {
        mistake: "Expecting an aryl halide from ether cleavage with HI.",
        fix: "The ring carbon cannot be attacked from behind, so the O stays on the ring as a phenol.",
        source: "u5-cl-aryl",
        quote: "The ring carbon is sp² and cannot be attacked from behind, so the O stays on the ring.",
      },
      {
        mistake: "Forming a Grignard next to an unprotected OH.",
        fix: "The Grignard takes that proton and destroys itself. Protect the OH first.",
        source: "u5-pg-why",
        quote: "A Grignard is a strong base. Formed next to an O-H, it takes that proton and destroys itself.",
      },
    ],
  },
  {
    id: "c",
    label: "Stage C",
    title: "Epoxides and diols",
    optional: false,
    checkpoint: null,
    lessons: [
      {
        node: "u5-epoxidation",
        ideas: [
          {
            text: "Epoxidation is stereospecific: cis alkene, cis epoxide.",
            mark: "stereospecific",
            source: "u5-ep-cis",
            quote: "Epoxidation is stereospecific: cis alkene, cis epoxide.",
          },
          {
            text: "A peracid turns a C=C into an epoxide in one step.",
            source: "u5-ep-meet",
            quote: "A peracid turns a C=C into an epoxide in one step.",
          },
          {
            text: "Halohydrin plus base is the second way into an epoxide: an intramolecular SN2.",
            source: "u5-ep-halohydrin",
            quote: "Halohydrin plus base is the second way into an epoxide: an intramolecular SN2.",
          },
          {
            text: "With a choice of alkenes, the peracid picks the most substituted one.",
            source: "u5-ep-select",
            quote: "With a choice of alkenes, the peracid picks the most substituted one.",
          },
        ],
        example: { source: "u5-ep-cis", quote: "Both C-O bonds form at once on the same face, so the two methyls that were cis stay cis." },
      },
      {
        node: "u5-ep-acid",
        ideas: [
          {
            text: "Acidic opening: the nucleophile goes to the more substituted carbon.",
            mark: "the more substituted carbon",
            source: "u5-ea-meet",
            quote: "Acidic opening: the nucleophile goes to the more substituted carbon.",
          },
          {
            text: "Opening is backside attack: the two groups end up anti, trans on a ring.",
            source: "u5-ea-trans",
            quote: "Opening is backside attack: the two groups end up anti, trans on a ring.",
          },
          {
            text: "Acid and base give opposite regiochemistry on the same epoxide.",
            source: "u5-ea-conditions",
            quote: "Acid and base give opposite regiochemistry on the same epoxide.",
          },
        ],
        example: { source: "u5-ea-meet", quote: "Acidic opening: the nucleophile goes to the more substituted carbon." },
      },
      {
        node: "u5-ep-base",
        ideas: [
          {
            text: "Basic opening: SN2 at the less substituted carbon.",
            mark: "the less substituted carbon",
            source: "u5-eb-meet",
            quote: "Basic opening: SN2 at the less substituted carbon.",
          },
          {
            text: "Grignards open epoxides at the less hindered carbon: a two-carbon extension with an OH.",
            source: "u5-eb-grignard",
            quote: "Grignards open epoxides at the less hindered carbon: a two-carbon extension with an OH.",
          },
          {
            text: "Find the carbon attacked first; only that carbon inverts.",
            source: "u5-eb-stereo",
            quote: "Find the carbon attacked first; only that carbon inverts.",
          },
        ],
        example: { source: "u5-eb-meet", quote: "Basic opening: SN2 at the less substituted carbon." },
      },
      {
        node: "u5-syn-diol",
        ideas: [
          {
            text: "OsO₄ is syn dihydroxylation: both OH on one face.",
            mark: "both OH on one face",
            source: "u5-sd-meet",
            quote: "OsO₄ is syn dihydroxylation: both OH on one face.",
          },
          {
            text: "Cold dilute KMnO₄ and OsO₄ are the same reaction type: syn dihydroxylation.",
            source: "u5-sd-kmno4",
            quote: "Cold dilute KMnO₄ and OsO₄ are the same reaction type: syn dihydroxylation.",
          },
          {
            text: "A trans alkene plus syn addition gives the racemic pair.",
            source: "u5-sd-e",
            quote: "trans alkene plus syn addition gives the racemic pair.",
          },
        ],
        example: { source: "u5-sd-z", quote: "cis alkene plus syn addition gives meso." },
      },
      {
        node: "u5-diol-cleave",
        ideas: [
          {
            text: "HIO₄ splits a 1,2-diol into two carbonyls.",
            mark: "two carbonyls",
            source: "u5-dc-meet",
            quote: "HIO₄ splits a 1,2-diol into two carbonyls.",
          },
          {
            text: "Periodate cleavage needs OH groups on adjacent carbons.",
            source: "u5-dc-which",
            quote: "Periodate cleavage needs a 1,2-diol: OH groups on adjacent carbons.",
          },
          {
            text: "With an H a carbinol carbon becomes CHO; without one, a ketone.",
            source: "u5-dc-keto-ald",
            quote: "Read each carbinol carbon: with an H it becomes CHO, without one a ketone.",
          },
        ],
        example: { source: "u5-dc-keto-ald", quote: "The ring opens. C1, with its methyl, becomes a ketone; C2, with an H, becomes an aldehyde." },
      },
      {
        node: "u5-anti-diol",
        ideas: [
          {
            text: "Epoxidation then acid opening is anti dihydroxylation.",
            mark: "anti dihydroxylation",
            source: "u5-ad-meet",
            quote: "Epoxidation then acid opening is anti dihydroxylation.",
          },
          {
            text: "A cis alkene plus anti addition gives the racemic pair.",
            source: "u5-ad-z",
            quote: "cis alkene plus anti addition gives the racemic pair.",
          },
          {
            text: "Flip the alkene geometry and flip the mode, and the product comes out the same.",
            source: "u5-ad-same",
            quote: "Flip the alkene geometry and flip the mode, and the product comes out the same.",
          },
        ],
        example: { source: "u5-ad-e", quote: "trans alkene plus anti addition gives meso." },
      },
    ],
    mistakes: [
      {
        mistake: "Putting the nucleophile on the same carbon under acid and under base.",
        fix: "Acid sends it to the more substituted carbon, base to the less substituted one.",
        source: "u5-ea-conditions",
        quote: "Acid and base give opposite regiochemistry on the same epoxide.",
      },
      {
        mistake: "Drawing a cis product from an epoxide opening on a ring.",
        fix: "Opening is backside attack, so the groups end up trans.",
        source: "u5-eb-trans",
        quote: "Basic opening is SN2: inversion at the carbon attacked, so trans on a ring.",
      },
      {
        mistake: "Calling every butane-2,3-diol a racemate.",
        fix: "Pair geometry with mode: cis with syn, or trans with anti, gives meso.",
        source: "u5-sd-set-z",
        quote: "Pair the alkene geometry with the addition mode: cis with syn, or trans with anti, gives meso.",
      },
    ],
  },
];

export const U5_GUIDE: UnitGuide = {
  unitId: "u5",
  intro:
    "What an alcohol can become (halides, tosylates, alkenes, carbonyls), how ethers are made and cut, and how epoxides open and alkenes become diols, with the stereochemistry drawn. Read a stage before its lessons, or come back when one trips you up.",
  stages: STAGES,
  examples: U5_GUIDE_EXAMPLES,
  placeholder: true,
};
