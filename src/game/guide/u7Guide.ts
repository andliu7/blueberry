/**
 * Unit 7's guidebook, the words. Drafts until the owner signs them off.
 *
 * NO NEW CHEMISTRY LIVES HERE. Every idea, every mistake and every example
 * names `source`, a Unit 7 pool entry, and `quote`, words copied exactly from
 * that entry's explanation or its correct option. test/guideU7.test.ts fails
 * a quote the source does not contain, and an idea whose source is not in its
 * own lesson. The `text`, `mistake` and `fix` lines are plain paraphrases of
 * those quotes, nothing more.
 *
 * Side quests sit in the stage of the lesson they branch from, so a student
 * meets them beside it. The drawings are generated: u7Guide.figures.ts, by
 * scripts/guide_u7.py. This file is loaded only when a student opens the
 * Unit 7 guide (index.ts).
 */
import type { GuideStage, UnitGuide } from "./types";
import { U7_GUIDE_EXAMPLES } from "./u7Guide.figures";

const STAGES: readonly GuideStage[] = [
  {
    id: "a",
    label: "Stage A",
    title: "Adding to C=O",
    optional: false,
    checkpoint: null,
    lessons: [
      {
        node: "u7-mechanism",
        ideas: [
          {
            text: "C=O is polar: the carbon is the electrophile, so that is where a nucleophile attacks.",
            mark: "the carbon is the electrophile",
            source: "u7-mech-meet",
            quote: "C=O is polar: the carbon is the electrophile, the oxygen the nucleophile.",
          },
          {
            text: "Addition stops at the alkoxide. The O-H only appears in a separate workup step.",
            source: "u7-mech-alkoxide",
            quote: "Addition stops at the alkoxide. The O-H only appears in a separate workup step.",
          },
          {
            text: "Aldehydes beat ketones, and methanal beats every other aldehyde: fewer alkyl groups, more reactive.",
            source: "u7-mech-reactive",
            quote: "Aldehydes beat ketones, and methanal beats every other aldehyde: fewer alkyl groups, more reactive.",
          },
          {
            text: "An achiral carbonyl and an achiral nucleophile give a racemate whenever a stereocentre forms.",
            source: "u7-mech-racemic",
            quote: "An achiral carbonyl plus an achiral nucleophile gives a racemate whenever a stereocentre forms.",
          },
        ],
        example: { source: "u7-mech-workup", quote: "Workup is its own step: it turns the alkoxide into the alcohol." },
      },
      {
        node: "u7-bv",
        ideas: [
          {
            text: "The group that migrates best gets the new O: H, then 3°, then 2° and aryl, then 1°, then methyl.",
            mark: "The group that migrates best",
            source: "u7-bv-ph",
            quote: "Migratory aptitude: H, then 3°, then 2° and aryl, then 1°, then methyl.",
          },
          {
            text: "A cyclic ketone becomes a lactone one atom bigger.",
            source: "u7-bv-meet",
            quote: "Baeyer-Villiger turns a cyclic ketone into a lactone one atom bigger.",
          },
          {
            text: "A symmetric ketone gives one ester.",
            source: "u7-bv-sym",
            quote: "A symmetric ketone gives one ester.",
          },
        ],
        example: { source: "u7-bv-ph", quote: "Phenyl migrates in preference to methyl, so the O ends between the C=O and the ring." },
      },
      {
        node: "u7-hydration",
        ideas: [
          {
            text: "Hydration puts two OH groups on the old carbonyl carbon: a gem-diol.",
            mark: "a gem-diol",
            source: "u7-hyd-meet",
            quote: "Hydration puts two OH groups on the old carbonyl carbon: a gem-diol.",
          },
          {
            text: "Electron-withdrawing groups next to C=O favour the hydrate; alkyl groups disfavour it.",
            source: "u7-hyd-chloral",
            quote: "Electron-withdrawing groups next to C=O favour the hydrate; alkyl groups disfavour it.",
          },
          {
            text: "Hydration is reversible, so the carbonyl oxygen swaps with water's.",
            source: "u7-hyd-label",
            quote: "Hydration is reversible, so the carbonyl oxygen swaps with water's.",
          },
        ],
        example: { source: "u7-hyd-meet", quote: "Both OH groups end up on one carbon, a gem-diol." },
      },
      {
        node: "u7-ald-to-acid",
        ideas: [
          {
            text: "Aldehydes oxidise easily to carboxylic acids.",
            mark: "carboxylic acids",
            source: "u7-ox-meet",
            quote: "Aldehydes oxidise easily to carboxylic acids.",
          },
          {
            text: "Tollens is the aldehyde test: it needs a C-H on the carbonyl carbon.",
            source: "u7-ox-tollens",
            quote: "Tollens is the aldehyde test: C-H on the carbonyl carbon.",
          },
          {
            text: "No aldehyde C-H, no Tollens reaction.",
            source: "u7-ox-ketone",
            quote: "No aldehyde C-H, no Tollens reaction.",
          },
        ],
        example: { source: "u7-ox-meet", quote: "The aldehyde C-H becomes C-OH: one more bond to oxygen, a carboxylic acid." },
      },
      {
        node: "u7-acetal",
        ideas: [
          {
            text: "One alcohol gives a hemiacetal: one OR and one OH on the old carbonyl carbon.",
            mark: "a hemiacetal",
            source: "u7-acl-meet",
            quote: "One alcohol gives a hemiacetal: one OR and one OH on the old carbonyl carbon.",
          },
          {
            text: "Excess alcohol with water removed takes the hemiacetal on to the acetal.",
            source: "u7-acl-acetal",
            quote: "Excess alcohol with water removed takes the hemiacetal on to the acetal.",
          },
          {
            text: "Acetal hydrolysis returns the carbonyl and two alcohols: it is formation run backwards.",
            source: "u7-acl-hydrolysis",
            quote: "Acetal hydrolysis returns the carbonyl and two alcohols; it is formation run backwards.",
          },
          {
            text: "A 1,2-diol gives a cyclic acetal, a 1,3-dioxolane ring.",
            source: "u7-acl-diol",
            quote: "A 1,2-diol gives a cyclic acetal, a 1,3-dioxolane ring.",
          },
        ],
        example: { source: "u7-acl-acetal", quote: "Excess alcohol with water removed takes the hemiacetal on to the acetal." },
      },
      {
        node: "u7-thioacetal",
        ideas: [
          {
            text: "Dithiols make thioacetals exactly as diols make acetals.",
            mark: "exactly as diols make acetals",
            source: "u7-thi-meet",
            quote: "Dithiols make thioacetals exactly as diols make acetals.",
          },
          {
            text: "Raney Ni desulfurises: CHO to CH₃ in two steps.",
            source: "u7-thi-raney",
            quote: "Raney Ni desulfurises: CHO to CH₃ in two steps.",
          },
          {
            text: "Thioacetal then Raney Ni is the neutral way from C=O to CH₂.",
            source: "u7-thi-same",
            quote: "Thioacetal plus Raney Ni is the neutral way to C=O to CH₂.",
          },
        ],
        example: { source: "u7-thi-meet", quote: "Dithiols make thioacetals exactly as diols make acetals." },
      },
      {
        node: "u7-protect",
        ideas: [
          {
            text: "Protection turns the C=O into an acetal ring that nucleophiles and bases ignore.",
            mark: "an acetal ring",
            source: "u7-pro-meet",
            quote: "Protection turns the C=O into an acetal ring that nucleophiles and bases ignore.",
          },
          {
            text: "H₃O⁺ takes the acetal off and gives the original ketone back.",
            source: "u7-pro-off",
            quote: "H₃O⁺ takes the acetal off and gives the original ketone back.",
          },
          {
            text: "Protect, react elsewhere, deprotect: the ketone comes through untouched.",
            source: "u7-pro-ester",
            quote: "Protect, react elsewhere, deprotect: the ketone comes through untouched.",
          },
          {
            text: "Aldehydes protect before ketones: fewer alkyl groups, faster addition.",
            source: "u7-pro-which",
            quote: "Aldehydes protect before ketones: fewer alkyl groups, faster addition.",
          },
        ],
        example: { source: "u7-pro-meet", quote: "No C=O is left for a nucleophile." },
      },
    ],
    mistakes: [
      {
        mistake: "Writing the alcohol before any workup.",
        fix: "Addition stops at the alkoxide. H₃O⁺ adds the H in its own step.",
        source: "u7-mech-alkoxide",
        quote: "Addition stops at the alkoxide.",
      },
      {
        mistake: "Expecting a ketone to pass the Tollens test.",
        fix: "No aldehyde C-H, no reaction.",
        source: "u7-ox-ketone",
        quote: "No aldehyde C-H, no Tollens reaction.",
      },
      {
        mistake: "Stopping at the hemiacetal with excess alcohol and the water removed.",
        fix: "Those conditions carry it on to the acetal.",
        source: "u7-acl-acetal",
        quote: "Excess alcohol with water removed takes the hemiacetal on to the acetal.",
      },
      {
        mistake: "Moving the methyl in a Baeyer-Villiger of a methyl ketone.",
        fix: "Methyl migrates last: aryl, 2° and 3° groups go first.",
        source: "u7-bv-ph",
        quote: "Phenyl migrates in preference to methyl",
      },
    ],
  },
  {
    id: "b",
    label: "Stage B",
    title: "Nitrogen nucleophiles",
    optional: false,
    checkpoint: null,
    lessons: [
      {
        node: "u7-imine",
        ideas: [
          {
            text: "A primary amine and a ketone give an imine and water.",
            mark: "an imine and water",
            source: "u7-imn-meet",
            quote: "A primary amine and a ketone give an imine and water.",
          },
          {
            text: "Imine formation needs two N-H: a primary amine.",
            source: "u7-imn-which",
            quote: "Imine formation needs two N-H: a primary amine.",
          },
          {
            text: "Split a C=N at the double bond: the carbon half becomes the carbonyl, the N half the amine.",
            source: "u7-imn-hydrolysis",
            quote: "Split a C=N at the double bond: the carbon half becomes the carbonyl, the N half the amine.",
          },
        ],
        example: { source: "u7-imn-meet", quote: "A primary amine and a ketone give an imine and water." },
      },
      {
        node: "u7-derivative-tests",
        ideas: [
          {
            text: "Every derivative is a C=N, and the group on N names it.",
            mark: "the group on N names it",
            source: "u7-der-match",
            quote: "Every derivative is a C=N; the group on N names it.",
          },
          {
            text: "Oximes come from NH₂OH, by the imine route.",
            source: "u7-der-meet",
            quote: "Oximes come from NH₂OH, by the imine route.",
          },
          {
            text: "2,4-DNP condenses with aldehydes and ketones.",
            source: "u7-der-which",
            quote: "2,4-DNP condenses with aldehydes and ketones.",
          },
        ],
        example: { source: "u7-der-meet", quote: "C=N-OH is an oxime." },
      },
      {
        node: "u7-enamine",
        ideas: [
          {
            text: "A secondary amine gives an enamine: N-C=C.",
            mark: "N-C=C",
            source: "u7-enm-meet",
            quote: "A secondary amine gives an enamine: N-C=C.",
          },
          {
            text: "The last deprotonation decides it: losing an N-H gives an imine, losing an alpha C-H an enamine.",
            source: "u7-enm-site",
            quote: "The final deprotonation site decides imine (N-H) or enamine (alpha C-H).",
          },
          {
            text: "Enamine hydrolysis returns the ketone and the secondary amine.",
            source: "u7-enm-hydrolysis",
            quote: "Enamine hydrolysis returns the ketone and the secondary amine.",
          },
        ],
        example: { source: "u7-enm-meet", quote: "An alpha C-H is lost instead, so C=C forms beside N." },
      },
    ],
    mistakes: [
      {
        mistake: "Making an imine from a secondary amine.",
        fix: "Two N-H are needed, so only a primary amine gives C=N.",
        source: "u7-imn-which",
        quote: "Imine formation needs two N-H: a primary amine.",
      },
      {
        mistake: "Forgetting the water an imine gives off.",
        fix: "Imines form by condensation: water is lost.",
        source: "u7-imn-water",
        quote: "Imines form by condensation: water is lost.",
      },
      {
        mistake: "Putting the enamine C=C on an alpha carbon with no H.",
        fix: "Only an alpha carbon with an H can host the C=C.",
        source: "u7-enm-count",
        quote: "Each alpha carbon with an H can host the enamine C=C.",
      },
    ],
  },
  {
    id: "c",
    label: "Stage C",
    title: "Carbon and hydride nucleophiles",
    optional: false,
    checkpoint: null,
    lessons: [
      {
        node: "u7-grignard",
        ideas: [
          {
            text: "Methanal gives a primary alcohol, another aldehyde a secondary one, a ketone a tertiary one, and CO₂ a carboxylic acid.",
            mark: "a ketone a tertiary one",
            source: "u7-grg-match",
            quote: "Methanal: primary. Aldehyde: secondary. Ketone: tertiary. CO₂: carboxylic acid.",
          },
          {
            text: "Any O-H or N-H destroys a Grignard before it can add.",
            source: "u7-grg-proton",
            quote: "Any O-H or N-H destroys a Grignard before it can add.",
          },
          {
            text: "A tertiary alcohol has three disconnections: any one of its groups can come from the Grignard.",
            source: "u7-grg-retro",
            quote: "A tertiary alcohol has three disconnections; any one of its groups can come from the Grignard.",
          },
        ],
        example: { source: "u7-grg-ket", quote: "A ketone gives a tertiary alcohol." },
      },
      {
        node: "u7-cyanohydrin",
        ideas: [
          {
            text: "A cyanohydrin is OH and CN on the old carbonyl carbon.",
            mark: "OH and CN",
            source: "u7-cyn-meet",
            quote: "A cyanohydrin is OH and CN on the old carbonyl carbon.",
          },
          {
            text: "Cyanide brings exactly one carbon: a one-carbon homologation.",
            source: "u7-cyn-carbon",
            quote: "Cyanohydrin formation is a one-carbon homologation.",
          },
          {
            text: "The nitrile is a handle: hydrolysis gives an alpha-hydroxy acid.",
            source: "u7-cyn-acid",
            quote: "The nitrile is a handle: hydrolysis gives an alpha-hydroxy acid.",
          },
        ],
        example: { source: "u7-cyn-carbon", quote: "Cyanide brings exactly one carbon" },
      },
      {
        node: "u7-hydride",
        ideas: [
          {
            text: "NaBH₄ picks ketones and aldehydes over esters.",
            mark: "over esters",
            source: "u7-hdr-nabh4-ester",
            quote: "NaBH₄ picks ketones and aldehydes over esters.",
          },
          {
            text: "LiAlH₄ reduces esters as well as ketones.",
            source: "u7-hdr-lah-ester",
            quote: "LiAlH₄ reduces esters as well as ketones.",
          },
          {
            text: "Hydride turns a ketone into a secondary alcohol.",
            source: "u7-hdr-meet",
            quote: "Hydride turns a ketone into a secondary alcohol.",
          },
        ],
        example: { source: "u7-hdr-nabh4-ester", quote: "NaBH₄ is mild: it reduces the ketone and leaves the ester." },
      },
      {
        node: "u7-cannizzaro",
        ideas: [
          {
            text: "Cannizzaro needs an aldehyde with no alpha H.",
            mark: "no alpha H",
            source: "u7-can-meet",
            quote: "Cannizzaro needs an aldehyde with no alpha H.",
          },
          {
            text: "It is a disproportionation: one aldehyde goes up, one goes down.",
            source: "u7-can-pair",
            quote: "Cannizzaro is a disproportionation: one up, one down.",
          },
          {
            text: "In a crossed Cannizzaro, methanal is sacrificed as formate.",
            source: "u7-can-crossed",
            quote: "In a crossed Cannizzaro, methanal is sacrificed as formate.",
          },
        ],
        example: { source: "u7-can-pair", quote: "One aldehyde is reduced to the alcohol and the other oxidised to the carboxylate." },
      },
      {
        node: "u7-mpv",
        ideas: [
          {
            text: "In MPV, propan-2-ol is the hydride source.",
            mark: "propan-2-ol is the hydride source",
            source: "u7-mpv-meet",
            quote: "MPV: propan-2-ol is the hydride source.",
          },
          {
            text: "Oppenauer is MPV run backwards, driven by excess propanone.",
            source: "u7-mpv-oppenauer",
            quote: "Oppenauer is the reverse of MPV, driven by excess propanone.",
          },
          {
            text: "MPV is chemoselective for C=O, so a C=C survives.",
            source: "u7-mpv-enal",
            quote: "MPV is chemoselective for C=O.",
          },
        ],
        example: { source: "u7-mpv-byproduct", quote: "MPV swaps oxidation levels: the ketone down, propan-2-ol up." },
      },
    ],
    mistakes: [
      {
        mistake: "Adding a Grignard to a ketone that also carries an O-H.",
        fix: "The Grignard takes that proton first and is destroyed.",
        source: "u7-grg-proton",
        quote: "The Grignard is a strong base, takes that proton first and becomes methane.",
      },
      {
        mistake: "Using NaBH₄ to reduce an ester.",
        fix: "NaBH₄ leaves the ester alone; LiAlH₄ reduces it.",
        source: "u7-hdr-nabh4-ester",
        quote: "NaBH₄ is mild: it reduces the ketone and leaves the ester.",
      },
      {
        mistake: "Drawing one enantiomer from an achiral ketone and hydride.",
        fix: "Hydride reaches both faces equally, so both enantiomers form.",
        source: "u7-hdr-racemic",
        quote: "Hydride reaches the flat carbonyl from either face equally, so both enantiomers form.",
      },
      {
        mistake: "Running a Cannizzaro on an aldehyde with an alpha H.",
        fix: "Any H on the carbon next to CHO rules it out.",
        source: "u7-can-furfural",
        quote: "Look at the carbon next to CHO: any H there rules Cannizzaro out.",
      },
    ],
  },
  {
    id: "d",
    label: "Stage D",
    title: "Alkenes, enones and CH₂",
    optional: false,
    checkpoint: null,
    lessons: [
      {
        node: "u7-wittig",
        ideas: [
          {
            text: "Wittig swaps =O for =CHR at the same carbon.",
            mark: "at the same carbon",
            source: "u7-wit-meet",
            quote: "Wittig swaps =O for =CHR at the same carbon.",
          },
          {
            text: "Every Wittig makes triphenylphosphine oxide.",
            source: "u7-wit-byproduct",
            quote: "Every Wittig makes triphenylphosphine oxide.",
          },
          {
            text: "Cut the C=C: one side was the carbonyl, the other the ylide, either way round.",
            source: "u7-wit-retro",
            quote: "Cut the C=C: one side was the carbonyl, the other the ylide, either way round.",
          },
        ],
        example: { source: "u7-wit-meet", quote: "C=O becomes C=CH₂, exactly where the C=O was." },
      },
      {
        node: "u7-hwe",
        ideas: [
          {
            text: "HWE: an ester-stabilised carbanion gives the E-alkene.",
            mark: "the E-alkene",
            source: "u7-hwe-meet",
            quote: "HWE: an ester-stabilised carbanion gives the E-alkene.",
          },
          {
            text: "HWE leaves a water-soluble phosphate, easier to remove than Ph₃P=O.",
            source: "u7-hwe-byproduct",
            quote: "HWE leaves a water-soluble phosphate, easier to remove than Ph₃P=O.",
          },
          {
            text: "Olefinations join the carbonyl carbon to the carbanion carbon.",
            source: "u7-hwe-where",
            quote: "Olefinations join the carbonyl carbon to the carbanion carbon.",
          },
        ],
        example: { source: "u7-hwe-meet", quote: "With an ester on the carbanion the E alkene dominates." },
      },
      {
        node: "u7-12v14",
        ideas: [
          {
            text: "Grignards and organolithiums add 1,2 to enones.",
            mark: "add 1,2",
            source: "u7-cj-meet",
            quote: "Grignards and organolithiums add 1,2 to enones.",
          },
          {
            text: "Cuprates add 1,4, and the carbonyl survives.",
            source: "u7-cj-cuprate",
            quote: "Cuprates add 1,4: the carbonyl survives.",
          },
          {
            text: "Conjugate addition means the beta carbon.",
            source: "u7-cj-site",
            quote: "Conjugate addition means the beta carbon.",
          },
          {
            text: "1,4-products are drawn as ketones because the enol tautomerises.",
            source: "u7-cj-keto",
            quote: "1,4-products are drawn as ketones because the enol tautomerises.",
          },
        ],
        example: { source: "u7-cj-cuprate", quote: "A cuprate is soft and adds to the far alkene carbon (C3)." },
      },
      {
        node: "u7-to-ch2",
        ideas: [
          {
            text: "Clemmensen: C=O to CH₂ in hot acid.",
            mark: "in hot acid",
            source: "u7-ch2-meet",
            quote: "Clemmensen: C=O to CH₂ in hot acid.",
          },
          {
            text: "Wolff-Kishner: C=O to CH₂ in hot base.",
            source: "u7-ch2-wk",
            quote: "Wolff-Kishner: C=O to CH₂ in hot base.",
          },
          {
            text: "Pick the conditions the rest of the molecule survives: base for acetals.",
            source: "u7-ch2-acetal",
            quote: "Pick the conditions the rest of the molecule survives: base for acetals.",
          },
        ],
        example: { source: "u7-ch2-meet", quote: "Clemmensen removes the carbonyl oxygen completely: C=O becomes CH₂." },
      },
    ],
    mistakes: [
      {
        mistake: "Putting the Wittig C=C one carbon off.",
        fix: "The new C=C sits exactly where the C=O was.",
        source: "u7-wit-meet",
        quote: "C=O becomes C=CH₂, exactly where the C=O was.",
      },
      {
        mistake: "Adding a Grignard 1,4 to an enone.",
        fix: "A Grignard is hard and adds 1,2. Use a cuprate for 1,4.",
        source: "u7-cj-meet",
        quote: "A Grignard is a hard nucleophile and goes straight to the carbonyl carbon",
      },
      {
        mistake: "Drawing a 1,4 product as its enol.",
        fix: "The enol tautomerises, so draw the ketone.",
        source: "u7-cj-keto",
        quote: "1,4-products are drawn as ketones because the enol tautomerises.",
      },
      {
        mistake: "Using hot acid on a molecule that carries an acetal.",
        fix: "Use Wolff-Kishner: the acetal survives base.",
        source: "u7-ch2-acetal",
        quote: "The acetal survives base",
      },
    ],
  },
];

export const U7_GUIDE: UnitGuide = {
  unitId: "u7",
  intro:
    "What a nucleophile does to an aldehyde or ketone C=O, and everything built on it: acetals, imines and enamines, Grignards and hydrides, and the reactions that turn C=O into C=C or CH₂. Read a stage before its lessons, or come back when one trips you up.",
  stages: STAGES,
  examples: U7_GUIDE_EXAMPLES,
  placeholder: true,
};
