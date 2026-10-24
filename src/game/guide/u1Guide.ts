/**
 * Unit 1's guidebook, the words. Drafts until the owner signs them off.
 *
 * NO NEW CHEMISTRY LIVES HERE. Every idea, every mistake and every example
 * caption names `source`, a Unit 1 pool entry or lesson question, and
 * `quote`, words copied exactly from that entry's explanation or its correct
 * option. test/guideU1.test.ts fails a quote the source does not contain, and
 * an idea whose source is not in its own lesson. The `text`, `mistake` and
 * `fix` lines are plain paraphrases of those quotes, nothing more.
 *
 * The drawings are generated: u1Guide.figures.ts, by scripts/guide_u1.py.
 */
import type { GuideStage, UnitGuide } from "./types";
import { U1_GUIDE_EXAMPLES } from "./u1Guide.figures";

const STAGES: readonly GuideStage[] = [
  {
    id: "a",
    label: "Stage A",
    title: "Allylic stability",
    optional: false,
    checkpoint: "u1-quiz-a",
    lessons: [
      {
        node: "u1-allylic",
        ideas: [
          {
            text: "In the allyl cation the two end carbons, C1 and C3, share the charge.",
            mark: "C1 and C3",
            source: "u1-allylic-where",
            quote: "the charge is shared by the two END carbons, C1 and C3",
          },
          {
            text: "Allylic means the charged carbon sits right next to a C=C. A charge on the C=C carbon itself, or one carbon further away, gets no resonance.",
            source: "u1-allylic-pick",
            quote: "A charge on the double bond carbon itself (vinyl), or one carbon further away, gets no resonance.",
          },
          {
            text: "Contributors differ only in where the electrons are drawn. Atoms never move.",
            source: "u1-allylic-moves",
            quote: "Resonance contributors differ only in where electrons are drawn. Atoms never move",
          },
        ],
        example: { source: "u1-allylic-moves", quote: "Atoms never move" },
      },
      {
        node: "u1-rank-cation",
        ideas: [
          {
            text: "When substitution ties, resonance breaks the tie: a 3° allylic cation beats a 3° alkyl one.",
            mark: "resonance breaks the tie",
            source: "u1-cat-3allyl-vs-3",
            quote: "When substitution ties, resonance breaks the tie. A 3° allylic cation beats a 3° alkyl one.",
          },
          {
            text: "Count the carbons on the charged carbon: 3° > 2° > 1° > methyl.",
            source: "u1-cat-ladder-alkyl",
            quote: "Count the carbons on the charged carbon: 3° > 2° > 1° > methyl.",
          },
          {
            text: "Score every cation on both: resonance and substitution.",
            source: "u1-cat-count-both",
            quote: "Score each cation on resonance and on substitution.",
          },
        ],
        example: { source: "u1-cat-3allyl-vs-3", quote: "A 3° allylic cation beats a 3° alkyl one." },
      },
      {
        node: "u1-rank-anion",
        ideas: [
          {
            text: "For carbanions the alkyl trend flips: methyl > 1° > 2° > 3°.",
            mark: "the alkyl trend flips",
            source: "u1-ani-flip",
            quote: "For a carbanion the alkyl trend flips: methyl > 1° > 2° > 3°.",
          },
          {
            text: "Resonance helps an anion just as it helps a cation.",
            source: "u1-ani-ring",
            quote: "Resonance helps an anion just as it helps a cation.",
          },
          {
            text: "More s character in the lone pair's orbital steadies it: sp > sp2 > sp3.",
            source: "u1-ani-why-sp",
            quote: "More s character in the orbital holding the lone pair steadies a carbanion: sp > sp2 > sp3.",
          },
        ],
        example: { source: "u1-ani-flip", quote: "For a carbanion the alkyl trend flips" },
      },
      {
        node: "u1-rank-radical",
        ideas: [
          {
            text: "Allylic and benzylic resonance beats substitution: a benzylic radical beats a 3° alkyl one.",
            mark: "resonance beats substitution",
            source: "u1-rad-benzyl-vs-3",
            quote: "For radicals, allylic and benzylic resonance beats substitution",
          },
          {
            text: "Radicals are electron poor, so they follow the cation trend: 3° > 2° > 1° > methyl.",
            source: "u1-rad-trend",
            quote: "Radicals are electron poor, so they follow the cation trend: 3° > 2° > 1° > methyl.",
          },
        ],
        example: { source: "u1-rad-benzyl-vs-3", quote: "a benzylic radical is more stable than a 3° alkyl one" },
      },
    ],
    mistakes: [
      {
        mistake: "Calling a vinyl cation allylic.",
        fix: "The C=C has to be NEXT to the charged carbon, not carry the charge.",
        source: "u1-cat-vinyl",
        quote: "A C=C helps only when it is NEXT to the charged carbon.",
      },
      {
        mistake: "Using the cation ladder for a carbanion.",
        fix: "Alkyl groups help cations and hurt anions.",
        source: "u1-qa-shared-rule",
        quote: "Alkyl groups help cations and hurt anions",
      },
      {
        mistake: "Counting a methyl on a carbon that never carries the charge.",
        fix: "Draw the contributors first, then count.",
        source: "u1-cat-middle-methyl",
        quote: "Draw the contributors before you count.",
      },
    ],
  },
  {
    id: "b",
    label: "Stage B",
    title: "Adding to dienes",
    optional: false,
    checkpoint: "u1-quiz-b",
    lessons: [
      {
        node: "u1-12v14",
        ideas: [
          {
            text: "The nucleophile can land on either charged carbon: C2 gives the 1,2 product, C4 the 1,4 product.",
            mark: "either charged carbon",
            source: "u1-12v14-which-carbon",
            quote: "C2 gives the 1,2 product and C4 gives the 1,4 product",
          },
          {
            text: "H⁺ adds to an END carbon of the diene. That is the move that leaves an allylic cation.",
            source: "u1-12v14-protonate",
            quote: "Protonate an END carbon of the diene: that is the move that leaves an allylic cation.",
          },
          {
            text: "In 1,4 addition the C=C moves to the middle, C2=C3.",
            source: "u1-12v14-pick-14",
            quote: "the double bond moves to C2=C3",
          },
        ],
        example: { source: "u1-allylic-draw-cation", quote: "the charge is shared by C2 and C4" },
      },
      {
        node: "u1-kvt",
        ideas: [
          {
            text: "The thermodynamic product is the most stable one. It wins when the reaction is warm and reversible.",
            mark: "warm and reversible",
            source: "u1-kvt-define-conditions",
            quote: "It wins when the reaction is warm and reversible",
          },
          {
            text: "The kinetic product has the lowest barrier, so it forms fastest.",
            source: "u1-kvt-define-kinetic",
            quote: "The kinetic product has the lowest barrier (lowest transition state), so it forms fastest.",
          },
        ],
        example: {
          source: "u1-kvt-draw-warm",
          quote: "Warm and reversible gives the thermodynamic product, the one with the more substituted alkene.",
        },
      },
      {
        node: "u1-energy-diagram",
        ideas: [
          {
            text: "On the diagram, hump height is speed and well depth is stability.",
            mark: "hump height is speed",
            source: "u1-ed-disagree",
            quote: "TS height is speed and product depth is stability.",
          },
          {
            text: "Warm gives the thermodynamic product, cold the kinetic one. When they differ, cooling switches the winner.",
            source: "u1-ed-switch",
            quote: "Warm gives the thermodynamic product, cold the kinetic one.",
          },
        ],
        example: { source: "u1-ed-faster", quote: "the lower hump forms its product faster" },
      },
      {
        node: "u1-hx-dienes",
        ideas: [
          {
            text: "On a real diene, protonate the end carbon that leaves the best allylic cation.",
            mark: "the best allylic cation",
            source: "u1-hx-isoprene-site",
            quote: "Protonate the end carbon that leaves the best allylic cation.",
          },
          {
            text: "Call the thermodynamic product by alkene substitution: the product whose C=C carries more carbons.",
            source: "u1-hx-label-thermo",
            quote: "Call the thermodynamic product by alkene substitution: the product whose C=C carries more carbons.",
          },
          {
            text: "A symmetric allylic cation gives the same product by 1,2 and 1,4 addition.",
            source: "u1-hx-chd",
            quote: "A symmetric allylic cation gives the same product by 1,2 and 1,4 addition.",
          },
        ],
        example: { source: "u1-hx-draw-isoprene-cold", quote: "Cold gives the kinetic, 1,2 product from the best cation." },
      },
      {
        node: "u1-x2",
        ideas: [
          {
            text: "Br₂ and Cl₂ add 1,2 or 1,4 through the same allylic cation as HX.",
            mark: "the same allylic cation",
            source: "u1-x2-pick-14",
            quote: "X2 adds 1,2 or 1,4 by the same allylic cation as HX",
          },
          {
            text: "Same temperature rule as HX: cold gives the 1,2 dihalide.",
            source: "u1-x2-cold-cl",
            quote: "Same temperature rule as HX: cold gives the 1,2 (kinetic) dihalide.",
          },
          {
            text: "Count equivalents: two Br₂ saturate both C=C bonds.",
            source: "u1-x2-two-equiv",
            quote: "two Br2 saturate both C=C bonds",
          },
        ],
        example: { source: "u1-x2-draw-warm", quote: "warm and reversible gives the 1,4 dibromide" },
      },
    ],
    mistakes: [
      {
        mistake: "Assuming 1,4 always wins when it is warm.",
        fix: "Decide by alkene substitution: the better C=C wins.",
        source: "u1-qb-rule",
        quote: "Decide thermo by alkene substitution. Do not assume 1,4 always wins.",
      },
      {
        mistake: "Putting H⁺ on a middle carbon.",
        fix: "Protonate an end carbon, so an allylic cation forms.",
        source: "u1-12v14-protonate",
        quote: "Protonate an END carbon of the diene",
      },
      {
        mistake: "Reading speed off how deep a product's well is.",
        fix: "The forward barrier, start to transition state, sets the rate.",
        source: "u1-ed-gap",
        quote: "The forward barrier, from the start to the transition state, sets the rate.",
      },
    ],
  },
  {
    id: "c",
    label: "Stage C",
    title: "Bromination with NBS",
    optional: true,
    checkpoint: "u1-quiz-c",
    lessons: [
      {
        node: "u1-nbs",
        ideas: [
          {
            text: "NBS holds Br₂ at a trace. Addition across the C=C needs a lot of Br₂, so the C=C survives.",
            mark: "the C=C survives",
            source: "u1-cd-nbs-why",
            quote: "NBS holds Br2 at a trace.",
          },
          {
            text: "The allylic C-H breaks first, because its radical is shared over two carbons.",
            source: "u1-cd-nbs-weakest",
            quote: "The allylic C-H breaks first because the allylic radical is delocalised over two carbons",
          },
          {
            text: "Light or a peroxide: either one starts the same chain.",
            source: "u1-cd-nbs-initiator",
            quote: "Light and ROOR are interchangeable initiators.",
          },
        ],
        example: { source: "u1-cd-nbs-draw-cyclohexene", quote: "NBS swaps an allylic H for Br and leaves the C=C in place." },
      },
      {
        node: "u1-nbs-practice",
        ideas: [
          {
            text: "Both ends of the allylic radical take Br. Two products appear only when those ends differ.",
            mark: "Both ends",
            source: "u1-cd-nbsp-cyclohexene-count",
            quote: "Two products only appear when the radical's two ends differ.",
          },
          {
            text: "An allylic carbon is any sp3 carbon bonded to a C=C carbon, in a ring or a chain.",
            source: "u1-cd-nbsp-mch-sites",
            quote: "An allylic carbon is any sp3 carbon bonded to a C=C carbon, ring or chain.",
          },
        ],
        example: { source: "u1-cd-qc-hexene-count", quote: "3-bromohex-1-ene and 1-bromohex-2-ene" },
      },
    ],
    mistakes: [
      {
        mistake: "Reaching for a bottle of Br₂.",
        fix: "Concentrated Br₂ adds across the C=C. NBS keeps it dilute.",
        source: "u1-cd-qc-high-br2",
        quote: "With Br2 concentrated, addition across the alkene wins.",
      },
      {
        mistake: "Drawing one product and stopping.",
        fix: "Draw both contributors of the allylic radical first.",
        source: "u1-cd-nbsp-hexene-shifted",
        quote: "Draw both contributors of the allylic radical.",
      },
      {
        mistake: "Thinking a peroxide changes the product.",
        fix: "The initiator only starts the chain. Same chain, same products.",
        source: "u1-cd-qc-peroxide",
        quote: "Swapping light for peroxide leaves the chain and the products unchanged.",
      },
    ],
  },
  {
    id: "d",
    label: "Stage D",
    title: "The Diels–Alder",
    optional: false,
    checkpoint: "u1-quiz-d",
    lessons: [
      {
        node: "u1-mo",
        ideas: [
          {
            text: "n p orbitals make n π MOs. Butadiene has four.",
            mark: "n π MOs",
            source: "u1-cd-mo-count",
            quote: "n p orbitals make n pi MOs. Butadiene has four.",
          },
          {
            text: "ψk has k minus one nodes.",
            source: "u1-cd-mo-hex-homo",
            quote: "ψk always has k minus one nodes.",
          },
          {
            text: "The longer the conjugation, the smaller the HOMO to LUMO gap and the longer the wavelength.",
            source: "u1-cd-mo-gap",
            quote: "Longer conjugation means a smaller HOMO to LUMO gap",
          },
        ],
        example: { source: "u1-cd-mo-bd-homo", quote: "HOMO is ψ2 (one node), LUMO is ψ3 (two nodes)" },
      },
      {
        node: "u1-da",
        ideas: [
          {
            text: "Diene plus dienophile give a cyclohexene in one step.",
            mark: "a cyclohexene in one step",
            source: "u1-cd-da-ring",
            quote: "diene plus dienophile give a cyclohexene in one step",
          },
          {
            text: "It is concerted: one transition state, no intermediate.",
            source: "u1-cd-da-concerted",
            quote: "The Diels-Alder is concerted: one transition state, no intermediate.",
          },
          {
            text: "Filled meets empty: the diene's HOMO and the dienophile's LUMO, in phase.",
            source: "u1-cd-da-orbitals",
            quote: "Filled meets empty: the diene's HOMO and the dienophile's LUMO.",
          },
        ],
        example: { source: "u1-cd-da-draw-acrolein", quote: "the new C=C where the diene's single bond was" },
      },
      {
        node: "u1-dienes",
        ideas: [
          {
            text: "A cyclic diene gives a bridged product.",
            mark: "bridged product",
            source: "u1-cd-dienes-draw-norbornene",
            quote: "A cyclic diene gives a bridged product",
          },
          {
            text: "Shape first: locked s-cis is fastest, free rotation is fine, locked s-trans is out.",
            source: "u1-cd-dienes-fastest",
            quote: "Shape first: locked s-cis is fastest, free rotation is fine, locked s-trans is out.",
          },
          {
            text: "Good donor groups cannot rescue a diene that cannot reach s-cis.",
            source: "u1-cd-dienes-edg-locked",
            quote: "A diene that cannot reach s-cis does not react, however good its donor groups are.",
          },
        ],
        example: { source: "u1-cd-dienes-draw-norbornene", quote: "A cyclic diene gives a bridged product" },
      },
      {
        node: "u1-dienophiles",
        ideas: [
          {
            text: "Withdrawing groups (C=O, CN, NO₂) on the dienophile lower its LUMO and speed the reaction.",
            mark: "Withdrawing groups",
            source: "u1-cd-phile-fastest",
            quote: "Withdrawing groups (C=O, CN, NO2) on the dienophile lower its LUMO and speed the reaction.",
          },
          {
            text: "A donor on the dienophile slows it.",
            source: "u1-cd-phile-fastest",
            quote: "A donor on the dienophile slows it.",
          },
        ],
        example: { source: "u1-cd-phile-draw-acrylonitrile", quote: "ends up as a substituent on the new ring" },
      },
      {
        node: "u1-da-predict",
        ideas: [
          {
            text: "A 1-substituted diene gives the ortho product; a 2-substituted diene gives para.",
            mark: "a 2-substituted diene gives para",
            source: "u1-cd-pred-ortho-acrolein",
            quote: "1-Substituted dienes give the ortho (1,2) product; 2-substituted dienes give the para (1,4) product.",
          },
          {
            text: "Working backward, the ring's C=C was the diene's C2-C3.",
            source: "u1-cd-pred-which-bond",
            quote: "Working backward, the ring C=C was diene C2-C3.",
          },
          {
            text: "Then find the C=C and cut the two σ bonds across from it.",
            source: "u1-cd-pred-retro-cn",
            quote: "Find the C=C, cut the two sigma bonds across from it.",
          },
        ],
        example: { source: "u1-cd-pred-draw-para", quote: "2-Substituted dienes give the para (1,4) product." },
      },
      {
        node: "u1-da-stereo",
        ideas: [
          {
            text: "Suprafacial and concerted: cis stays cis, trans stays trans.",
            mark: "cis stays cis, trans stays trans",
            source: "u1-cd-st-cis",
            quote: "Suprafacial and concerted: cis stays cis, trans stays trans.",
          },
          {
            text: "Endo forms faster, even though exo is more stable.",
            source: "u1-cd-st-endo",
            quote: "Endo forms faster even though exo is more stable.",
          },
          {
            text: "A cyclic diene gives a bridged bicycle. A cyclic dienophile gives a fused one.",
            source: "u1-cd-st-bridged",
            quote: "A cyclic diene gives a bridged bicycle. A cyclic dienophile gives a fused one.",
          },
        ],
        example: { source: "u1-cd-3d-maleate", quote: "cis maleate, cis diester" },
      },
      {
        node: "u1-da-3d",
        ideas: [
          {
            text: "The dienophile's cis or trans relationship is copied onto the ring.",
            mark: "copied onto the ring",
            source: "u1-cd-3d-fumarate",
            quote: "the dienophile's cis or trans relationship is copied onto the ring",
          },
          {
            text: "A chiral product from achiral reagents is racemic.",
            source: "u1-cd-3d-one-centre",
            quote: "A chiral product from achiral reagents is racemic.",
          },
          {
            text: "In a norbornene, exo points toward the CH₂ bridge and endo sits under the C=C bridge.",
            source: "u1-cd-3d-endo-where",
            quote: "In a norbornene: exo is syn to the CH2 bridge, endo is under the C=C bridge.",
          },
        ],
        example: { source: "u1-cd-3d-trans-racemate", quote: "A chiral product from achiral starting materials forms as a racemate." },
      },
      {
        node: "u1-ied",
        ideas: [
          {
            text: "Inverse demand swaps the roles: the electron-rich alkene donates and the diene accepts.",
            mark: "the diene accepts",
            source: "mcq-ied-roles",
            quote: "with the electron-rich alkene donating and the diene accepting. That is inverse demand.",
          },
          {
            text: "Donating groups raise the diene's HOMO, and withdrawing groups lower the dienophile's LUMO. Swap each group onto the other partner and a different gap closes: the alkene's HOMO feeds the diene's LUMO.",
            source: "mcq-ied-roles",
            quote: "Swap each one onto the other partner and a different gap closes, alkene HOMO to diene LUMO",
          },
        ],
        example: { source: "u1-cd-phile-ether-role", quote: "a vinyl ether is electron-rich and a poor normal-demand dienophile" },
      },
    ],
    mistakes: [
      {
        mistake: "Trying a diene that is locked s-trans.",
        fix: "No s-cis, no Diels–Alder, whatever its donor groups.",
        source: "u1-cd-dienes-strans",
        quote: "does not undergo Diels-Alder at all",
      },
      {
        mistake: "Putting the ring's C=C in the wrong place.",
        fix: "It always sits at the diene's old C2-C3.",
        source: "u1-cd-pred-anhydride",
        quote: "The ring's one C=C is always across from them, at the diene's old C2-C3.",
      },
      {
        mistake: "Losing the dienophile's cis or trans.",
        fix: "Cis stays cis, trans stays trans.",
        source: "u1-cd-st-cis",
        quote: "cis stays cis, trans stays trans",
      },
      {
        mistake: "Calling exo the major adduct when the reaction is cold.",
        fix: "Under kinetic control endo forms faster, even though exo is more stable.",
        source: "u1-cd-st-endo",
        quote: "Endo forms faster even though exo is more stable.",
      },
      {
        mistake: "Counting C=C bonds to guess the longest wavelength.",
        fix: "Only conjugated C=C count.",
        source: "u1-cd-mo-isolated",
        quote: "Counting C=C is not enough: they must be conjugated.",
      },
    ],
  },
];

export const U1_GUIDE: UnitGuide = {
  unitId: "u1",
  intro:
    "What a C=C does to the carbon next to it, then everything that follows from it: adding to dienes, allylic bromination and the Diels–Alder. Read a stage before its lessons, or come back when one trips you up.",
  stages: STAGES,
  examples: U1_GUIDE_EXAMPLES,
  placeholder: true,
};
