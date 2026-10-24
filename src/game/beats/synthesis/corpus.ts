/**
 * The authored synthesis gaps. Eleven routes, every one of them lifted off a
 * document the owner already teaches from, and every one carrying the filename
 * and problem number (or topic) it came from.
 *
 * WHY THE SOURCES ARE REAL AND NOT INVENTED. CLAUDE.md's authoring ruling is
 * that course materials are mined for STRUCTURE and the content is ours: the
 * routes below are the ones on the keys, written in our own words, with our own
 * distractors and our own explanations. A route nobody teaches is a route that
 * has never been checked by a person, and a synthesis problem that is subtly
 * impossible is worse than no synthesis problem at all. The `source` field on
 * every entry is what makes a reviewer's job one page long.
 *
 * THE FILES, all in the owner's gitignored `reference images/` folder:
 *   Synthesis Practice Problems_KEY.pdf            problems 1, 4 and 7
 *   Additional Enolate Synthesis Problems_KEY.pdf  problems 1, 3 and 4
 *   Orgo2_Reagent_Reference.pdf                    topics 3, 7 and 14
 *   Orgo_Pathway_Map_Full.pdf                      Unit 5 and Unit 7a
 *
 * THE THREE NODES THIS CORPUS SERVES, from demo/pathwayMap.ts, and they are
 * three of the seventeen spine nodes that are not arrow pushing:
 *   u3-sequencing   multistep sequencing logic, the order of operations
 *   u9-retro        retrosynthetic carbon to carbon disconnection
 *   u14-orthogonal  protecting group orthogonality
 *
 * A NOTE ON THE DISTRACTORS. Every wrong chip is a mistake somebody actually
 * makes, and most of them are not wrong chemistry: they are right chemistry
 * pointed at the wrong step. Those carry `builds`, which is what makes the
 * result `valid_not_requested` with the product NAMED rather than a flat wrong.
 * CLAUDE.md's result type three exists for exactly this, and a synthesis row is
 * where a student meets it most often.
 */

import { createSynthesisGapProblem, type SynthesisGapProblem } from "./problem";
import { ISOPROPYLOXIRANE, METHYLOXIRANE, OXIRANE, PROPYLOXIRANE } from "./structures";

const SYNTHESIS_KEY = "Synthesis Practice Problems_KEY.pdf";
const ENOLATE_KEY = "Additional Enolate Synthesis Problems_KEY.pdf";
const REAGENT_REFERENCE = "Orgo2_Reagent_Reference.pdf";
const PATHWAY_MAP = "Orgo_Pathway_Map_Full.pdf";

/* ------------------------------------------------------------------ */
/* Orgo I review: parked until a review node exists                     */
/*                                                                      */
/* These three used to be u3-sequencing's produce rung, and none of     */
/* them has a benzene ring step: bulky-base E2, hydroboration and a     */
/* Grignard on an epoxide are Orgo I. The 23 Oct learner audit (top-25  */
/* #8) moved them off the EAS lesson. No map node is called             */
/* ORGO1_REVIEW, so no lesson plays them until one is built; they stay  */
/* here, ids unchanged, because the grader tests use them and the       */
/* routes are good review once they have a home.                        */
/* ------------------------------------------------------------------ */

const ORGO1_REVIEW = "orgo1-review";

const butaneToAcid = createSynthesisGapProblem({
  id: "syn-u3-butane-acid",
  node: ORGO1_REVIEW,
  conceptIds: ["order-of-operations", "hofmann-vs-zaitsev", "anti-markovnikov-hydration"],
  gapKind: "reagent",
  prompt: "Fill the blank: what takes 2-bromobutane to 1-butene?",
  brief:
    "The last arrow only reaches a carboxylic acid from a primary alcohol, so the alkene earlier in the row has to be the terminal one.",
  start: "Butane",
  target: "Butanoic acid",
  steps: [
    { id: "s1", over: "Br₂, hv", produces: "2-Bromobutane" },
    {
      id: "s2",
      over: null,
      produces: "1-Butene",
      note: "A bulky base cannot reach the crowded proton, so it takes the one on the end and the terminal alkene wins.",
    },
    { id: "s3", over: "1) BH₃, THF  2) H₂O₂, NaOH", produces: "1-Butanol" },
    { id: "s4", over: "H₂CrO₄", produces: "Butanoic acid" },
  ],
  bank: [
    { id: "opt-tbuo", text: "NaOC(CH₃)₃", answer: [["NaOC(CH3)3"]] },
    {
      id: "opt-naome",
      text: "NaOCH₃",
      answer: [["NaOCH3"]],
      builds: "2-butene, the more substituted alkene",
      why: "Methoxide is small, so it reaches the crowded proton and Zaitsev wins. 2-butene is a real product; hydroboration on it puts the OH on carbon 2, and a secondary alcohol stops at the ketone.",
    },
    {
      id: "opt-naoh-aq",
      text: "NaOH, H₂O",
      answer: [["NaOH", "H2O"]],
      builds: "butan-2-ol, by substitution rather than elimination",
      why: "Aqueous hydroxide on a secondary halide mostly substitutes. That is chemistry that happens, and it steps sideways off this route rather than along it.",
    },
    {
      id: "opt-h2so4",
      text: "H₂SO₄, Δ",
      answer: [["H2SO4", "Δ"]],
      why: "Hot acid dehydrates an alcohol, and this step starts from a bromide. There is no OH here yet for it to take.",
    },
  ],
  correctOptionId: "opt-tbuo",
  typed: {
    mode: "set",
    steps: [["NaOC(CH3)3"]],
    equivalents: [
      [
        "NaOC(CH3)3",
        "KOC(CH3)3",
        "NaOtBu",
        "KOtBu",
        "t-BuOK",
        "t-BuONa",
        "potassium tert-butoxide",
        "sodium tert-butoxide",
      ],
    ],
    placeholder: "Type the base",
  },
  why: "A bulky base takes the least hindered proton, so 2-bromobutane gives the terminal alkene. That is what lets the anti-Markovnikov hydroboration land the OH on carbon 1, and only a primary alcohol climbs all the way to the acid.",
  source: { file: SYNTHESIS_KEY, locator: "problem 4" },
  diamonds: 12,
});

const methylenecyclohexaneToKetone = createSynthesisGapProblem({
  id: "syn-u3-methylenecyclohexane",
  node: ORGO1_REVIEW,
  conceptIds: ["order-of-operations", "anti-markovnikov-hydration", "oxidation-ladder"],
  gapKind: "reagent",
  prompt: "Fill the blank: what puts the OH on carbon 2 of 1-methylcyclohexene?",
  brief: "PCC needs a hydrogen on the carbon carrying the OH, so the alcohol has to be secondary.",
  start: "Methylenecyclohexane",
  target: "2-Methylcyclohexanone",
  steps: [
    { id: "s1", over: "HBr", produces: "1-Bromo-1-methylcyclohexane" },
    { id: "s2", over: "NaOH", produces: "1-Methylcyclohexene" },
    {
      id: "s3",
      over: null,
      produces: "2-Methylcyclohexan-1-ol",
      note: "Boron adds to the less hindered carbon and the oxidation swaps it for OH with retention, so the alcohol is anti-Markovnikov and secondary.",
    },
    { id: "s4", over: "PCC", produces: "2-Methylcyclohexanone" },
  ],
  bank: [
    {
      id: "opt-hydroboration",
      text: "1) BH₃, THF  2) H₂O₂, NaOH",
      answer: [
        ["BH3", "THF"],
        ["H2O2", "NaOH"],
      ],
    },
    {
      id: "opt-acid-hydration",
      text: "H₃O⁺",
      answer: [["H3O+"]],
      builds: "1-methylcyclohexan-1-ol, the Markovnikov alcohol",
      why: "Acid hydration follows Markovnikov, so the OH lands on the carbon already carrying the methyl. That alcohol is tertiary, and PCC has no hydrogen there to remove.",
    },
    {
      id: "opt-oxymercuration",
      text: "1) Hg(OAc)₂, H₂O  2) NaBH₄",
      answer: [
        ["Hg(OAc)2", "H2O"],
        ["NaBH4"],
      ],
      builds: "1-methylcyclohexan-1-ol again, this time without any rearrangement",
      why: "Oxymercuration is the careful Markovnikov hydration. Same carbon, same tertiary alcohol, same dead end at PCC.",
    },
    {
      id: "opt-mcpba",
      text: "mCPBA",
      answer: [["mCPBA"]],
      builds: "1-methyl-1,2-epoxycyclohexane",
      why: "mCPBA makes the epoxide, which is a real product of this alkene and appears twice on the same key. Nothing later in this row opens the ring, so the OH never appears.",
    },
  ],
  correctOptionId: "opt-hydroboration",
  typed: {
    mode: "sequence",
    steps: [
      ["BH3", "THF"],
      ["H2O2", "NaOH"],
    ],
    equivalents: [
      ["BH3", "BH3·THF", "B2H6", "borane"],
      ["H2O2", "hydrogen peroxide"],
    ],
    placeholder: "Type both parts, numbered",
  },
  why: "Hydroboration is the one hydration that goes anti-Markovnikov, and it is stereospecifically syn. The secondary alcohol it leaves is exactly what PCC can lift to the ketone; the Markovnikov alcohol cannot be oxidised at all.",
  source: { file: SYNTHESIS_KEY, locator: "problem 1" },
  diamonds: 12,
});

const bromobenzeneToAlkylbenzene = createSynthesisGapProblem({
  id: "syn-u3-grignard-epoxide",
  node: ORGO1_REVIEW,
  conceptIds: ["retrosynthetic-disconnection", "epoxide-opening-basic", "grignard-addition"],
  gapKind: "reactant",
  prompt: "Fill the blank: which epoxide does the Grignard open to reach that alcohol?",
  brief: "A Grignard opens an epoxide at the less hindered carbon, so count the carbons the ring hands over.",
  start: "Bromobenzene",
  target: "(3-Methylbutyl)benzene",
  steps: [
    { id: "s1", over: "Mg, ether", produces: "Phenylmagnesium bromide" },
    {
      id: "s2",
      over: null,
      produces: "3-Methyl-1-phenylbutan-2-ol",
      note: "The phenyl lands on the CH₂ end of the ring, which is why the alcohol ends up on carbon 2 and the branch on carbon 3.",
    },
    { id: "s3", over: "H₂SO₄, Δ", produces: "(E)-3-Methyl-1-phenylbut-1-ene" },
    { id: "s4", over: "H₂, Pt", produces: "(3-Methylbutyl)benzene" },
  ],
  bank: [
    {
      id: "opt-epox-isopropyl",
      text: "2-Isopropyloxirane",
      answer: [["2-isopropyloxirane"]],
      structure: ISOPROPYLOXIRANE,
    },
    {
      id: "opt-epox-propyl",
      text: "2-Propyloxirane",
      answer: [["2-propyloxirane"]],
      structure: PROPYLOXIRANE,
      builds: "1-phenylpentan-2-ol, the straight chain alcohol",
      why: "Same formula as the answer, straight instead of branched. The Grignard still opens it at the CH₂, and the route ends at pentylbenzene rather than the branched target.",
    },
    {
      id: "opt-epox-methyl",
      text: "2-Methyloxirane",
      answer: [["2-methyloxirane"]],
      structure: METHYLOXIRANE,
      builds: "1-phenylpropan-2-ol",
      why: "Propylene oxide hands over three carbons where the target needs five, so the chain comes up two short and carries no branch.",
    },
    {
      id: "opt-epox-oxirane",
      text: "Oxirane",
      answer: [["oxirane"]],
      structure: OXIRANE,
      builds: "2-phenylethanol",
      why: "Ethylene oxide is the two carbon extension. It is the right kind of move and it is the wrong size for this target.",
    },
  ],
  correctOptionId: "opt-epox-isopropyl",
  typed: {
    mode: "set",
    steps: [["2-isopropyloxirane"]],
    equivalents: [
      [
        "2-isopropyloxirane",
        "isopropyloxirane",
        "3-methyl-1,2-epoxybutane",
        "1,2-epoxy-3-methylbutane",
        "2-(propan-2-yl)oxirane",
      ],
    ],
    placeholder: "Name the epoxide",
  },
  why: "Read the target backwards: the bond that has to be made is between the ring and a CH₂, and the piece on the other side of it carries three more carbons with a branch. That is 2-isopropyloxirane, and a Grignard opens it at the end the phenyl can reach.",
  source: { file: SYNTHESIS_KEY, locator: "problem 7" },
  diamonds: 15,
});

/* ------------------------------------------------------------------ */
/* u3-sequencing: the order of operations                               */
/*                                                                      */
/* Three EAS routes, built from the reagents the Unit 3 lessons teach,  */
/* with the blank on the step whose ORDER is the point. Every structure */
/* and name here was derived, not recalled: scripts/u3_synthesis_gaps.py */
/* runs each route and each wrong chip's product through                */
/* scripts/u3_pools.py's own model (RDKit canonical SMILES) and reads   */
/* every name back through OPSIN. The reagents are topic 3 of the       */
/* reagent reference. Friedel-Crafts failing on a withdrawer ring is    */
/* the same authored convention u3-acyl-fails and u3-alk-fails rest on. */
/* A lesson plays the first gap for its node (BeatRunner), so the       */
/* Friedel-Crafts-first route leads.                                    */
/* ------------------------------------------------------------------ */

const acylateBeforeNitrating = createSynthesisGapProblem({
  id: "syn-u3-acyl-then-nitrate",
  node: "u3-sequencing",
  conceptIds: ["order-of-operations", "eas-sequencing", "directing-effects"],
  gapKind: "reagent",
  prompt: "Fill the blank: what turns benzene into acetophenone?",
  brief: "The next arrow puts a nitro group on, and no Friedel-Crafts step works on the ring after that.",
  start: "Benzene",
  target: "1-(3-Nitrophenyl)ethan-1-one",
  steps: [
    {
      id: "s1",
      over: null,
      produces: "Acetophenone",
      note: "The acetyl group goes on while the ring is still plain benzene, the last moment a Friedel-Crafts step can work.",
    },
    { id: "s2", over: "HNO₃, H₂SO₄", produces: "1-(3-Nitrophenyl)ethan-1-one" },
  ],
  bank: [
    { id: "opt-acyl", text: "CH₃COCl, AlCl₃", answer: [["CH3COCl", "AlCl3"]] },
    {
      id: "opt-nitrate",
      text: "HNO₃, H₂SO₄",
      answer: [["HNO3", "H2SO4"]],
      builds: "nitrobenzene",
      why: "Nitrating first is the trap this route is built around. Nitrobenzene is too electron poor for Friedel-Crafts, so the acetyl group could never go on afterwards.",
    },
    {
      id: "opt-ethyl",
      text: "CH₃CH₂Cl, AlCl₃",
      answer: [["CH3CH2Cl", "AlCl3"]],
      builds: "ethylbenzene, an alkyl group rather than a ketone",
      why: "Alkylation puts on CH₂CH₃, which has no C=O. It also directs ortho and para, so the nitro group that follows would miss the meta position.",
    },
    {
      id: "opt-bromo",
      text: "Br₂, FeBr₃",
      answer: [["Br2", "FeBr3"]],
      builds: "bromobenzene",
      why: "That puts a bromine on, not the acetyl group the target carries.",
    },
  ],
  correctOptionId: "opt-acyl",
  typed: {
    mode: "set",
    steps: [["CH3COCl", "AlCl3"]],
    equivalents: [
      ["CH3COCl", "acetyl chloride", "AcCl"],
      ["AlCl3", "aluminum chloride", "aluminium chloride"],
    ],
    placeholder: "Type the acyl chloride and the Lewis acid",
  },
  why: "Do the Friedel-Crafts step before any strong withdrawer goes on. The acetyl group is itself a meta director, so the nitration that follows lands meta to it and the target falls out.",
  source: { file: REAGENT_REFERENCE, locator: "topic 3, EAS: Friedel-Crafts fails on strongly deactivated rings; synthesis order" },
  diamonds: 12,
});

const brominateBeforeReducing = createSynthesisGapProblem({
  id: "syn-u3-bromo-aniline",
  node: "u3-sequencing",
  conceptIds: ["order-of-operations", "eas-sequencing", "directing-effects"],
  gapKind: "reagent",
  prompt: "Fill the blank: what puts the bromine meta to the nitro group?",
  brief: "The nitro group is still on the ring at this step, and it is the group doing the steering.",
  start: "Benzene",
  target: "3-Bromoaniline",
  steps: [
    { id: "s1", over: "HNO₃, H₂SO₄", produces: "Nitrobenzene" },
    {
      id: "s2",
      over: null,
      produces: "1-Bromo-3-nitrobenzene",
      note: "Bromine goes on while NO₂ is still a meta director. Reduce first and the NH₂ would send it ortho and para.",
    },
    { id: "s3", over: "Sn, HCl, then NaOH", produces: "3-Bromoaniline" },
  ],
  bank: [
    { id: "opt-br", text: "Br₂, FeBr₃", answer: [["Br2", "FeBr3"]] },
    {
      id: "opt-cl",
      text: "Cl₂, FeCl₃",
      answer: [["Cl2", "FeCl3"]],
      builds: "1-chloro-3-nitrobenzene",
      why: "Right position, wrong halogen. Chlorine also goes meta to NO₂, and the route then ends at 3-chloroaniline.",
    },
    {
      id: "opt-reduce",
      text: "Sn, HCl, then NaOH",
      answer: [["Sn", "HCl"], ["NaOH"]],
      builds: "aniline",
      why: "Reducing now turns NO₂ into NH₂, an ortho and para director, so the bromine would never land meta.",
    },
    {
      id: "opt-nbs",
      text: "NBS, hν",
      answer: [["NBS", "hv"]],
      why: "NBS brominates a benzylic carbon, and nitrobenzene has no benzylic H. The ring needs Br₂ with a Lewis acid.",
    },
  ],
  correctOptionId: "opt-br",
  typed: {
    mode: "set",
    steps: [["Br2", "FeBr3"]],
    equivalents: [
      ["Br2", "bromine"],
      ["FeBr3", "Fe", "iron(III) bromide"],
    ],
    placeholder: "Type the halogen and the Lewis acid",
  },
  why: "Order is the whole route: nitrate, brominate while NO₂ points meta, and only then reduce NO₂ to NH₂. The amine goes on last, because it would steer every step after it.",
  source: { file: REAGENT_REFERENCE, locator: "topic 3, EAS: halogenation, nitration, nitro reduction; synthesis order" },
  diamonds: 12,
});

const nitrateBeforeOxidising = createSynthesisGapProblem({
  id: "syn-u3-nitro-acid",
  node: "u3-sequencing",
  conceptIds: ["order-of-operations", "eas-sequencing", "benzylic-oxidation"],
  gapKind: "reagent",
  prompt: "Fill the blank: what turns the methyl into COOH?",
  brief: "The nitro group is already para. All that is left is the carbon that steered it there.",
  start: "Toluene",
  target: "4-Nitrobenzoic acid",
  steps: [
    { id: "s1", over: "HNO₃, H₂SO₄", produces: "1-Methyl-4-nitrobenzene" },
    {
      id: "s2",
      over: null,
      produces: "4-Nitrobenzoic acid",
      note: "Oxidation comes second on purpose: CH₃ sent the nitro group para, and COOH, a meta director, would not have.",
    },
  ],
  bank: [
    { id: "opt-kmno4", text: "KMnO₄, heat", answer: [["KMnO4", "Δ"]] },
    {
      id: "opt-nbs",
      text: "NBS, hν",
      answer: [["NBS", "hv"]],
      builds: "1-(bromomethyl)-4-nitrobenzene",
      why: "NBS does work at the benzylic carbon, but it swaps one H for Br. The carbon is not oxidised to COOH.",
    },
    {
      id: "opt-sn",
      text: "Sn, HCl, then NaOH",
      answer: [["Sn", "HCl"], ["NaOH"]],
      builds: "4-methylaniline",
      why: "That reduces the nitro group to NH₂ and leaves the CH₃ alone, the opposite of what the target needs.",
    },
    {
      id: "opt-clemmensen",
      text: "Zn(Hg), HCl",
      answer: [["Zn(Hg)", "HCl"]],
      why: "Clemmensen takes a C=O down to CH₂. There is no C=O here, and the target needs the carbon oxidised, not reduced.",
    },
  ],
  correctOptionId: "opt-kmno4",
  typed: {
    mode: "set",
    steps: [["KMnO4"]],
    equivalents: [
      ["KMnO4", "potassium permanganate"],
      ["Δ", "heat"],
    ],
    alternatives: [{ label: "The same oxidation, with the heat written in", steps: [["KMnO4", "Δ"]] }],
    placeholder: "Type the oxidant",
  },
  why: "Benzylic oxidation needs a benzylic H, and CH₃ has three, so KMnO₄ cuts it back to COOH. Nitrating first while CH₃ points para is what makes the para acid.",
  source: { file: REAGENT_REFERENCE, locator: "topic 3, EAS: side-chain benzylic oxidation; synthesis order" },
  diamonds: 12,
});

/* ------------------------------------------------------------------ */
/* u9-retro: the carbon to carbon disconnection                         */
/* ------------------------------------------------------------------ */

const dieckmannClosure = createSynthesisGapProblem({
  id: "syn-u9-dieckmann",
  node: "u9-retro",
  conceptIds: ["retrosynthetic-disconnection", "claisen-condensation", "ring-size-preference"],
  gapKind: "reagent",
  prompt: "Fill the blank: what closes the diester into a six membered ring?",
  brief: "Two esters on one chain, and an alpha carbon that can reach the far carbonyl.",
  start: "Heptanedial",
  target: "2-(Hydroxymethyl)cyclohexan-1-ol",
  steps: [
    { id: "s1", over: "Jones reagent", produces: "Heptanedioic acid" },
    { id: "s2", over: "CH₃OH, H⁺", produces: "Dimethyl heptanedioate" },
    {
      id: "s3",
      over: null,
      produces: "Methyl 2-oxocyclohexane-1-carboxylate",
      note: "The base matches the ester's own OCH₃, so every transesterification along the way is invisible and the only new bond is the ring bond.",
    },
    { id: "s4", over: "1) LiAlH₄  2) H₂O", produces: "2-(Hydroxymethyl)cyclohexan-1-ol" },
  ],
  bank: [
    { id: "opt-naome", text: "NaOCH₃", answer: [["NaOCH3"]] },
    {
      id: "opt-lda",
      text: "LDA, -78 °C",
      answer: [["LDA", "-78 °C"]],
      why: "LDA takes one proton, cold and completely, and stops. A Dieckmann is pulled to the product by deprotonating the beta-ketoester that forms, which needs base still in the flask at the end.",
    },
    {
      id: "opt-naoh",
      text: "NaOH, H₂O",
      answer: [["NaOH", "H2O"]],
      builds: "heptanedioic acid again, both esters saponified",
      why: "Hydroxide hydrolyses an ester faster than it condenses one, and a carboxylate has no leaving group left for a ring to close onto.",
    },
    {
      id: "opt-h3o",
      text: "H₃O⁺, Δ",
      answer: [["H3O+", "Δ"]],
      builds: "the diacid, by running the Fischer esterification backwards",
      why: "Aqueous acid reverses the step before it. Real chemistry, pointing back up the row.",
    },
  ],
  correctOptionId: "opt-naome",
  typed: {
    mode: "set",
    steps: [["NaOCH3"]],
    equivalents: [["NaOCH3", "NaOMe", "CH3ONa", "sodium methoxide"]],
    placeholder: "Type the base",
  },
  why: "A Dieckmann is a Claisen with both halves on one chain, and the ring it prefers is the six membered one. Matching the alkoxide to the ester is the habit worth keeping: it means nothing new is introduced and the only product is the one you drew.",
  source: { file: ENOLATE_KEY, locator: "problem 1" },
  diamonds: 14,
});

const decarboxylationOrder = createSynthesisGapProblem({
  id: "syn-u9-decarb-order",
  node: "u9-retro",
  conceptIds: ["order-of-operations", "decarboxylation", "enolate-alkylation"],
  gapKind: "product",
  prompt: "Pick what heating the beta-keto acid gives, and the reason it wins.",
  brief: "The ester handle has done its job. The question is what is left when it leaves.",
  start: "Ethyl 2-oxocyclohexane-1-carboxylate",
  target: "2-Methylcyclohexanone",
  steps: [
    { id: "s1", over: "H₃O⁺", produces: "2-Oxocyclohexane-1-carboxylic acid" },
    {
      id: "s2",
      over: "Δ",
      produces: null,
      note: "The ketone sits beta to the acid, which gives the carboxyl a six membered path to hand its proton over. CO₂ leaves and the enol tautomerises back to the ketone.",
    },
    { id: "s3", over: "LDA, -78 °C", produces: "The cyclohexanone enolate" },
    { id: "s4", over: "CH₃Br", produces: "2-Methylcyclohexanone" },
  ],
  bank: [
    { id: "opt-cyclohexanone", text: "Cyclohexanone" },
    {
      id: "opt-2-methyl",
      text: "2-Methylcyclohexanone",
      why: "The methyl has not been delivered yet. On this route the alkylation is two arrows further along, which is the whole reason the row is worth reading in order.",
    },
    {
      id: "opt-keto-acid",
      text: "The beta-keto acid, unchanged",
      why: "A beta-keto acid does not survive heating. The carbonyl two atoms away is what makes the loss of CO₂ easy, and it is already in place.",
    },
    {
      id: "opt-diacid",
      text: "Cyclohexane-1,2-dicarboxylic acid",
      why: "Nothing in this row adds a second carboxyl. Heat takes one off; it does not put one on.",
    },
  ],
  correctOptionId: "opt-cyclohexanone",
  reasons: [
    { id: "rsn-six-membered", text: "The beta-keto acid loses CO₂ through a six membered transition state" },
    {
      id: "rsn-enol",
      text: "The enol tautomer is more stable than the ketone",
      why: "The enol is on the path rather than the reason: it is what forms as CO₂ leaves, and it tautomerises straight back to the ketone.",
    },
    {
      id: "rsn-strain",
      text: "Ring strain pushes the carboxyl off",
      why: "A six membered ring is close to strain free. What makes this one go is the carbonyl beta to the acid, not the ring.",
    },
  ],
  correctReasonId: "rsn-six-membered",
  why: "This is the sequencing question the whole unit builds to. Alkylate while the ester handle is still on and the handle holds the enolate steady; decarboxylate first and the next alkylation needs LDA and a fresh enolate, which is exactly what the two arrows after this one are doing.",
  source: { file: ENOLATE_KEY, locator: "problem 4" },
  diamonds: 16,
});

const propanalAlkylation = createSynthesisGapProblem({
  id: "syn-u9-propanal-alkylation",
  node: "u9-retro",
  conceptIds: ["retrosynthetic-disconnection", "kinetic-enolate", "aldol-competition"],
  gapKind: "reagent",
  prompt: "Fill the blank: what takes propanal to its enolate without letting it meet itself?",
  brief: "The next arrow is an alkyl bromide, so the whole flask has to be enolate before it arrives.",
  start: "Butan-2-ol",
  target: "2-Methylbutanal",
  steps: [
    { id: "s1", over: "PCC", produces: "Butan-2-one" },
    { id: "s2", over: "NaOH, I₂", produces: "Propanoic acid" },
    { id: "s3", over: "1) LiAlH₄  2) H₂O", produces: "Propan-1-ol" },
    { id: "s4", over: "PCC", produces: "Propanal" },
    {
      id: "s5",
      over: null,
      produces: "The propanal enolate",
      note: "A strong hindered base converts the aldehyde completely and cold, so there is no aldehyde left for the enolate to attack.",
    },
    { id: "s6", over: "CH₃CH₂Br", produces: "2-Methylbutanal" },
  ],
  bank: [
    { id: "opt-lda", text: "LDA, -78 °C", answer: [["LDA", "-78 °C"]] },
    {
      id: "opt-naoh",
      text: "NaOH",
      answer: [["NaOH"]],
      builds: "3-hydroxy-2-methylpentanal, propanal's aldol with itself",
      why: "Hydroxide only ever holds a little of the flask as enolate, so most of it is still aldehyde waiting to be attacked. That is the aldol, and avoiding it is the reason LDA exists.",
    },
    {
      id: "opt-naoet",
      text: "NaOCH₂CH₃",
      answer: [["NaOCH2CH3"]],
      builds: "the same self aldol, and then its condensation product on warming",
      why: "Ethoxide is not basic enough to take the whole flask to the enolate either, so propanal meets propanal before the bromide arrives.",
    },
    {
      id: "opt-acid",
      text: "H₂SO₄, Δ",
      answer: [["H2SO4", "Δ"]],
      builds: "the enol, and then the aldol condensation product",
      why: "Acid gives the enol rather than the enolate. An enol is nucleophilic enough for a halogenation and not for an SN2 on an alkyl bromide.",
    },
  ],
  correctOptionId: "opt-lda",
  typed: {
    mode: "set",
    steps: [["LDA", "-78 °C"]],
    equivalents: [
      ["LDA", "lithium diisopropylamide", "LiN(iPr)2"],
      ["-78 °C", "-78 C", "-78C", "-78"],
    ],
    placeholder: "Type the base and the temperature",
  },
  why: "Read 2-methylbutanal backwards and the bond to disconnect is the one between the alpha carbon and the ethyl group. That needs the alpha carbon nucleophilic and the ethyl electrophilic, which is a preformed enolate and a primary bromide, in that order.",
  source: { file: ENOLATE_KEY, locator: "problem 3" },
  diamonds: 14,
});

/* ------------------------------------------------------------------ */
/* u14-orthogonal: three keys, three locks                              */
/* ------------------------------------------------------------------ */

const bocOrthogonality = createSynthesisGapProblem({
  id: "syn-u14-boc-orthogonality",
  node: "u14-orthogonal",
  conceptIds: ["protecting-group-orthogonality", "peptide-coupling"],
  gapKind: "reagent",
  prompt: "Fill the blank: take the Boc off the nitrogen and leave the benzyl ester where it is.",
  brief: "Three protecting groups, three different keys, and this row is meant to turn only one of them.",
  start: "Boc-Ala-OH and H-Gly-OBn",
  target: "H-Ala-Gly-OBn",
  steps: [
    { id: "s1", over: "DCC", produces: "Boc-Ala-Gly-OBn" },
    {
      id: "s2",
      over: null,
      produces: "H-Ala-Gly-OBn",
      note: "Boc is an acid labile carbamate, so acid is its key and nothing else in the molecule answers to acid.",
    },
  ],
  bank: [
    { id: "opt-tfa", text: "TFA", answer: [["TFA"]] },
    {
      id: "opt-h2-pd",
      text: "H₂, Pd/C",
      answer: [["H2", "Pd/C"]],
      builds: "Boc-Ala-Gly-OH: hydrogenolysis takes the benzyl ester and leaves the Boc",
      why: "H₂ over palladium is the key for Cbz and for benzyl esters. It works perfectly on this molecule and it opens the other end.",
    },
    {
      id: "opt-piperidine",
      text: "Piperidine",
      answer: [["piperidine"]],
      why: "Piperidine is the Fmoc key. Boc is a carbamate that comes off in acid, and a secondary amine leaves it alone.",
    },
    {
      id: "opt-naoh",
      text: "NaOH, H₂O",
      answer: [["NaOH", "H2O"]],
      builds: "Boc-Ala-Gly-OH, plus a real racemisation risk at the alpha carbon",
      why: "Hydroxide saponifies the benzyl ester and leaves the Boc alone. It also puts the alpha proton at risk, which is the practical reason peptide work reaches for hydrogen instead.",
    },
  ],
  correctOptionId: "opt-tfa",
  typed: {
    mode: "set",
    steps: [["TFA"]],
    equivalents: [["TFA", "trifluoroacetic acid", "CF3COOH", "CF3CO2H"]],
    alternatives: [
      { label: "HCl in dioxane, the other standard Boc removal", steps: [["HCl", "dioxane"]] },
      { label: "TFA in dichloromethane", steps: [["TFA", "CH2Cl2"]] },
    ],
    placeholder: "Type the deprotection reagent",
  },
  why: "Orthogonality means each protecting group answers to something the others ignore: Boc to acid, Cbz and benzyl esters to hydrogen over palladium, Fmoc to a secondary amine. Once that is in your head the coupling order stops being something to memorise.",
  source: { file: REAGENT_REFERENCE, locator: "topic 14, the deprotection line" },
  diamonds: 14,
});

const acetalProtection = createSynthesisGapProblem({
  id: "syn-u14-dioxolane",
  node: "u14-orthogonal",
  conceptIds: ["protecting-group-orthogonality", "acetal-protection", "hydride-reduction"],
  gapKind: "reagent",
  prompt: "Fill the blank: park the ketone before the hydride arrives.",
  brief: "LiAlH₄ reduces both carbonyls on this molecule. Only one of them is meant to change.",
  start: "Methyl 5-oxohexanoate",
  target: "6-Hydroxyhexan-2-one",
  steps: [
    {
      id: "s1",
      over: null,
      produces: "The cyclic acetal of the ketone, ester untouched",
      note: "A dioxolane has no carbonyl left for hydride to attack, so the ketone becomes invisible to the next arrow without being changed.",
    },
    { id: "s2", over: "1) LiAlH₄  2) H₂O", produces: "The acetal with a primary alcohol in place of the ester" },
    { id: "s3", over: "H₃O⁺", produces: "6-Hydroxyhexan-2-one" },
  ],
  bank: [
    { id: "opt-glycol", text: "Ethylene glycol, TsOH", answer: [["ethylene glycol", "TsOH"]] },
    {
      id: "opt-nabh4",
      text: "NaBH₄",
      answer: [["NaBH4"]],
      builds: "methyl 5-hydroxyhexanoate: the ketone reduced, permanently",
      why: "NaBH₄ really is selective for the ketone over the ester, which is why this one is tempting. It is a reduction rather than a protection, so the ketone the target needs is gone and nothing later brings it back.",
    },
    {
      id: "opt-tbscl",
      text: "TBSCl, imidazole",
      answer: [["TBSCl", "imidazole"]],
      why: "A silyl ether protects an alcohol. There is no alcohol on this molecule yet, and a ketone has no OH for the silicon to sit on.",
    },
    {
      id: "opt-h3o",
      text: "H₃O⁺",
      answer: [["H3O+"]],
      why: "Aqueous acid is the arrow that takes the acetal off again. Running it first leaves the ketone exactly where it started.",
    },
  ],
  correctOptionId: "opt-glycol",
  typed: {
    mode: "set",
    steps: [["ethylene glycol", "TsOH"]],
    equivalents: [
      ["ethylene glycol", "HOCH2CH2OH", "1,2-ethanediol", "ethane-1,2-diol"],
      ["TsOH", "p-TsOH", "PTSA", "H+", "H2SO4"],
    ],
    placeholder: "Type the diol and the catalyst",
  },
  why: "The dioxolane is stable to base, to hydride and to Grignard reagents, and it comes off in aqueous acid. That is orthogonality inside one molecule: the ester is reduced while the ketone sits behind a group the hydride cannot see.",
  source: { file: PATHWAY_MAP, locator: "Unit 7a, acetal as protecting group" },
  diamonds: 14,
});

/**
 * The corpus, in pathway order. Frozen, because a surface that can push onto it
 * is a surface that can author content at runtime, and authored content is
 * reviewed by a person.
 */
export const SYNTHESIS_GAPS: readonly SynthesisGapProblem[] = Object.freeze([
  acylateBeforeNitrating,
  brominateBeforeReducing,
  nitrateBeforeOxidising,
  butaneToAcid,
  methylenecyclohexaneToKetone,
  bromobenzeneToAlkylbenzene,
  dieckmannClosure,
  decarboxylationOrder,
  propanalAlkylation,
  bocOrthogonality,
  acetalProtection,
]);

export function synthesisGapsForNode(node: string): readonly SynthesisGapProblem[] {
  return SYNTHESIS_GAPS.filter((problem) => problem.node === node);
}

export function synthesisGapById(id: string): SynthesisGapProblem | undefined {
  return SYNTHESIS_GAPS.find((problem) => problem.id === id);
}
