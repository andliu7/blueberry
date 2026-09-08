/**
 * Act 1's opening chain: alcohol activation, the oxidation ladder, ethers, and
 * epoxides.
 *
 * WHY TEN PROBLEMS ON A BLOCK WORTH FIVE EXAM POINTS. `docs/COURSE-OUTLINE-ORGO2.md`
 * section 6 says it explicitly: this block carries two weeks of teaching and
 * roughly 5 points of standalone exam weight, because it is examined almost
 * entirely as embedded steps inside multistep sequences. The outline's own
 * instruction is not to weight authored content by exam points here, since the
 * block is prerequisite critical and under assessed, which is the shape a pathway
 * front loads. Every later act reuses its leaving group, nucleophile and anti
 * addition vocabulary.
 *
 * THE NEAR MISS PAIRS THIS FILE IS BUILT AROUND, from the outline's own table.
 * Each one is a pair of reagents or conditions that must never merge into one
 * equivalence group, because merging them deletes the lesson:
 *
 *   PCC or PDC against Jones or chromic acid   stop at the aldehyde, or go on to the acid
 *   epoxide under acid against under base      opposite regiochemistry, one substrate
 *   sulfonate ester against PBr3 or SOCl2      the C-O bond survives, or it does not
 *
 * The equivalence groups declared on the reagent answers below come from the
 * outline's `[EQ]` markings, which are the reference's own inline groupings and
 * the places its keys write "or" between reagents. They are declared per reaction
 * type rather than globally, which is the rule that keeps the near miss pairs
 * apart.
 */

import { createMajorProductAnswer, createMultipleChoiceAnswer } from "../answers/choice.js";
import { createReagentsAnswer } from "../answers/reagents.js";
import { createProblem, type Problem } from "../problem.js";

export const ALCOHOL_ETHER_EPOXIDE_PROBLEMS: readonly Problem[] = Object.freeze([
  // ---------------------------------------------------------------- alcohols

  createProblem({
    id: "org2-alcohol-sulfonate-activation",
    course: "orgo_2",
    topic: "alcohol_leaving_groups",
    difficulty: 900,
    prompt:
      "A secondary alcohol has to be turned into a good leaving group in one step, with the bond " +
      "between that carbon and its oxygen left intact so the configuration at the carbon is " +
      "untouched. Give the reagents.",
    answer: createReagentsAnswer({
      mode: "set",
      steps: [{ reagents: ["TsCl", "pyridine"] }],
      equivalents: [
        ["TsCl", "MsCl", "TfCl"],
        ["pyridine", "Et3N"],
      ],
    }),
    solution: {
      whatHappened:
        "Tosyl chloride with pyridine. The alcohol oxygen attacks the sulfur, so the new bond forms " +
        "at oxygen and the carbon is never touched.",
      why:
        "A hydroxide is a poor leaving group and the fix is to hang something on the oxygen that " +
        "carries the electron pair away comfortably. A tosylate anion spreads its charge over three " +
        "oxygens, which makes it about as willing to leave as a halide. Because the whole activation " +
        "happens at oxygen, whatever configuration the carbon had going in is the configuration it " +
        "still has coming out, and only the later nucleophile decides what happens to it.",
      lookAt:
        "Trace which bond breaks in the activation step. Here it is the O-H bond, and the pyridine " +
        "is there to take that proton and to soak up the HCl.",
    },
    distractors: [
      {
        id: "used-pbr3",
        state: { kind: "reagents", steps: [{ reagents: ["PBr3"] }] },
        cause: "reagent_set_does_not_match",
        explanation: {
          whatHappened:
            "PBr3 does make a good leaving group out of the alcohol, and it makes a bromide by breaking the carbon to oxygen bond.",
          why:
            "In the PBr3 route the oxygen leaves as part of a phosphorus containing group and " +
            "bromide comes in at the back side of that same carbon, so the carbon inverts during " +
            "the activation itself. The question asked for the route that leaves the carbon alone, " +
            "which is the whole reason sulfonate esters exist alongside the halide reagents.",
          lookAt:
            "Sort activation reagents into the two paths before choosing. Sulfonate esters act at " +
            "oxygen; SOCl2, PBr3 and the phosphorus halides act at carbon.",
        },
      },
      {
        id: "used-hot-acid",
        state: { kind: "reagents", steps: [{ reagents: ["H2SO4"] }] },
        cause: "reagent_set_does_not_match",
        explanation: {
          whatHappened:
            "Sulfuric acid protonates the alcohol, which does convert the hydroxide into water as a leaving group.",
          why:
            "That is the acid mediated route, and it hands the substrate to a carbocation. On a " +
            "secondary carbon that cation is free to rearrange and free to lose a proton to an " +
            "alkene, and the configuration at the carbon is lost the moment it forms. Nothing about " +
            "that route is untouched.",
          lookAt:
            "Ask whether a cation appears anywhere in the route. If it does, stereochemistry and " +
            "skeleton are both in play and neither is under control.",
        },
      },
    ],
    tags: ["activation", "sulfonate-ester", "retention"],
  }),

  createProblem({
    id: "org2-alcohol-hx-substrate-ladder",
    course: "orgo_2",
    topic: "alcohol_leaving_groups",
    difficulty: 1150,
    prompt:
      "Four alcohols are each stirred with concentrated hydrochloric acid at room temperature, with " +
      "no other catalyst. Which one is converted to its chloride fastest?",
    answer: createMultipleChoiceAnswer({
      options: [
        { id: "tertiary", text: "2-Methylpropan-2-ol" },
        { id: "secondary", text: "Propan-2-ol" },
        { id: "primary", text: "Propan-1-ol" },
        { id: "methanol", text: "Methanol" },
      ],
      correctOptionId: "tertiary",
    }),
    solution: {
      whatHappened:
        "2-Methylpropan-2-ol, the tertiary alcohol. It reacts fast enough to cloud the solution " +
        "within minutes at room temperature.",
      why:
        "Under these conditions the acid protonates the oxygen and the substrate then ionises, " +
        "losing water to give a carbocation that chloride traps. The slow step is making the cation, " +
        "so whichever alcohol gives the most stable one wins. Three alkyl groups donating into the " +
        "empty p orbital of a tertiary cation is worth far more than the geometry of the approach.",
      lookAt:
        "Ask which step is rate determining before ranking. When the answer is cation formation, the " +
        "substrate ladder runs tertiary fastest, and when it is backside attack the ladder runs the " +
        "other way.",
    },
    distractors: [
      {
        id: "picked-methanol-on-sterics",
        state: { kind: "multiple_choice", optionId: "methanol" },
        explanation: {
          whatHappened:
            "This picks the smallest and least crowded substrate, which is the ranking that applies when a nucleophile has to reach the carbon.",
          why:
            "That ranking belongs to the backside displacement pathway, and it is the correct " +
            "ranking there. With hydrochloric acid alone and no heat there is no strong nucleophile " +
            "and no strong base, so the substrate ionises instead, and methanol would have to form a " +
            "methyl cation, which does not happen.",
          lookAt:
            "Read the conditions line for what is missing as well as what is present. No strong " +
            "nucleophile plus a good acid points at ionisation.",
        },
      },
      {
        id: "picked-primary",
        state: { kind: "multiple_choice", optionId: "primary" },
        explanation: {
          whatHappened: "This picks the primary alcohol.",
          why:
            "A primary cation is high enough in energy that it is essentially never formed, so this " +
            "substrate has to wait for chloride to come in at the back side while water leaves. That " +
            "does happen with hydrochloric acid, and it needs zinc chloride or heat to run at a " +
            "useful rate.",
          lookAt:
            "Use the Lucas behaviour as a memory anchor: tertiary reacts at once, secondary needs a " +
            "few minutes, primary needs help.",
        },
      },
      {
        id: "picked-secondary",
        state: { kind: "multiple_choice", optionId: "secondary" },
        explanation: {
          whatHappened: "This picks the secondary alcohol, which is genuinely the second fastest.",
          why:
            "A secondary cation is stabilised by two alkyl groups rather than three, and each alkyl " +
            "group is worth a large factor in rate. That leaves it well behind the tertiary case " +
            "even though it is comfortably ahead of the primary one.",
          lookAt:
            "Count the alkyl groups on the carbon that becomes positive. Three beats two beats one, " +
            "and the gaps are large.",
        },
      },
    ],
    tags: ["sn1", "substrate-ladder"],
  }),

  createProblem({
    id: "org2-alcohol-dehydration-with-shift",
    course: "orgo_2",
    topic: "alcohol_leaving_groups",
    difficulty: 1450,
    prompt:
      "3,3-Dimethylbutan-2-ol is heated with concentrated sulfuric acid. Which alkene is the major " +
      "product, and what makes it the major one?",
    answer: createMajorProductAnswer({
      candidates: [
        { id: "tetrasubstituted", text: "2,3-Dimethylbut-2-ene" },
        { id: "unrearranged", text: "3,3-Dimethylbut-1-ene" },
        { id: "rearranged-terminal", text: "2,3-Dimethylbut-1-ene" },
      ],
      reasons: [
        {
          id: "methyl-shift-then-zaitsev",
          text: "A methyl shift turns the secondary cation into a tertiary one, and the more substituted alkene forms from it",
        },
        {
          id: "least-hindered-proton",
          text: "The proton is removed from the least hindered carbon available",
        },
        {
          id: "concerted-from-the-alcohol",
          text: "Water and a neighbouring proton leave together, with no cation involved",
        },
      ],
      correctCandidateId: "tetrasubstituted",
      correctReasonId: "methyl-shift-then-zaitsev",
    }),
    solution: {
      whatHappened:
        "2,3-Dimethylbut-2-ene, the tetrasubstituted alkene, and it takes a methyl shift to get there.",
      why:
        "Protonation and loss of water give a secondary cation at C2. Sitting next to it is a carbon " +
        "carrying three methyl groups, so a methyl migrates with its bonding pair to the empty " +
        "orbital, and what was a secondary cation becomes a tertiary one. Losing a proton from the " +
        "carbon next to that new cation gives an alkene with four alkyl groups on it, which is the " +
        "most stable arrangement available.",
      lookAt:
        "Draw the first cation and then look at its neighbours before drawing any product. A " +
        "neighbouring quaternary carbon is the standing invitation for a methyl shift.",
    },
    distractors: [
      {
        id: "rearrangement-missed",
        state: { kind: "major_product", candidateId: "unrearranged", reasonId: null },
        cause: "option_is_not_the_correct_one",
        explanation: {
          whatHappened:
            "This eliminates straight out of the first cation without letting the skeleton change, giving the terminal alkene.",
          why:
            "The first cation is secondary and it is next to a carbon that can hand it a methyl " +
            "group and become tertiary itself. That migration is fast, faster than losing a proton, " +
            "so by the time elimination happens the carbon skeleton is no longer the one drawn in " +
            "the starting material.",
          lookAt:
            "Whenever a cation is secondary and a neighbour is more substituted, check for a shift " +
            "before eliminating. This is the same blind spot that shows up later on Friedel-Crafts " +
            "alkylation.",
        },
      },
      {
        id: "rearranged-then-hofmann",
        state: { kind: "major_product", candidateId: "rearranged-terminal", reasonId: null },
        explanation: {
          whatHappened:
            "The methyl shift is spotted correctly and the proton is then taken from a methyl group, giving the less substituted alkene.",
          why:
            "Half of this is right, and the half that is left is which proton leaves. Under acid " +
            "with no bulky base present there is nothing to force the less substituted alkene, so " +
            "the reaction settles on the most stable one it can reach. Four alkyl groups on the " +
            "double bond beats two.",
          lookAt:
            "Count the alkyl groups on the double bond of each candidate. The bulky base that would " +
            "override that count is not in these conditions.",
        },
      },
      {
        id: "right-alkene-steric-argument",
        state: {
          kind: "major_product",
          candidateId: "tetrasubstituted",
          reasonId: "least-hindered-proton",
        },
        cause: "right_product_wrong_reason",
        explanation: {
          whatHappened:
            "The alkene is right, and the argument attached to it would have picked a different one.",
          why:
            "Removing the proton from the least hindered carbon points at the terminal alkene, not " +
            "at the tetrasubstituted one, so the argument and the answer disagree. What actually " +
            "runs here is a methyl shift to the more stable cation, followed by loss of a proton to " +
            "give the more substituted alkene.",
          lookAt:
            "Test any argument by asking what it predicts on its own. When it points elsewhere it " +
            "is not the reason, even when the product happens to be right.",
        },
      },
    ],
    tags: ["e1", "carbocation-rearrangement", "zaitsev"],
  }),

  // ------------------------------------------------------- oxidation ladder

  createProblem({
    id: "org2-oxidation-stop-at-aldehyde",
    course: "orgo_2",
    topic: "oxidation_and_reduction_ladder",
    difficulty: 900,
    prompt:
      "Butan-1-ol has to be taken to butanal and stopped there, with no butanoic acid in the flask. " +
      "Give the reagent.",
    answer: createReagentsAnswer({
      mode: "set",
      steps: [{ reagents: ["PCC"] }],
      equivalents: [["PCC", "PDC", "Dess-Martin", "Swern", "TEMPO"]],
    }),
    solution: {
      whatHappened: "PCC. It moves the alcohol one level up the ladder and stops.",
      why:
        "An aldehyde only goes on to an acid when water can add across its carbonyl to give the gem " +
        "diol, because it is that diol's second O-H that the oxidant attacks next. PCC works in dry " +
        "dichloromethane, so no water is present, no gem diol forms, and the aldehyde is the end of " +
        "the road. The Dess-Martin, Swern and TEMPO oxidations reach the same place by the same " +
        "logic.",
      lookAt:
        "Ask whether water is present in the conditions. That single fact is what separates the two " +
        "families of chromium oxidation from each other.",
    },
    distractors: [
      {
        id: "used-jones",
        state: { kind: "reagents", steps: [{ reagents: ["CrO3", "H2SO4"] }] },
        cause: "reagent_set_does_not_match",
        explanation: {
          whatHappened:
            "Chromium trioxide in aqueous sulfuric acid does oxidise the alcohol, and it does not stop at the aldehyde.",
          why:
            "These are the Jones conditions and they are aqueous by design. The butanal that forms " +
            "picks up water to give the gem diol, and the oxidant then takes that on to butanoic " +
            "acid. Chromium is in both reagents; the water is what changes the destination.",
          lookAt:
            "Keep the two chromium families apart by their solvent. Dry chromium reagents stop at " +
            "the aldehyde and aqueous ones go to the acid.",
        },
      },
      {
        id: "used-a-reductant",
        state: { kind: "reagents", steps: [{ reagents: ["NaBH4"] }] },
        cause: "reagent_set_does_not_match",
        explanation: {
          whatHappened: "Sodium borohydride is a hydride source, so it moves down the ladder rather than up.",
          why:
            "Its job is to hand a hydride to a carbonyl carbon and turn an aldehyde or ketone into " +
            "an alcohol. Butan-1-ol is already at the alcohol level, so there is nothing here for " +
            "it to reduce, and the transformation asked for runs the other way.",
          lookAt:
            "Fix the direction before picking the reagent. Alcohol to aldehyde is one level up, and " +
            "borohydride and lithium aluminium hydride both go down.",
        },
      },
    ],
    tags: ["oxidation", "pcc-vs-jones", "gem-diol"],
  }),

  createProblem({
    id: "org2-oxidation-substrate-rule",
    course: "orgo_2",
    topic: "oxidation_and_reduction_ladder",
    difficulty: 1150,
    prompt:
      "Four substrates are each treated with chromium trioxide in aqueous sulfuric acid. Which one " +
      "is recovered unchanged?",
    answer: createMultipleChoiceAnswer({
      options: [
        { id: "tertiary-alcohol", text: "2-Methylpropan-2-ol" },
        { id: "secondary-alcohol", text: "Propan-2-ol" },
        { id: "primary-alcohol", text: "Propan-1-ol" },
        { id: "aldehyde", text: "Butanal" },
      ],
      correctOptionId: "tertiary-alcohol",
    }),
    solution: {
      whatHappened: "The tertiary alcohol comes back untouched.",
      why:
        "Oxidation at a carbinol carbon works by removing a hydrogen from that carbon along with the " +
        "one on the oxygen, which is how the carbon to oxygen double bond forms. A tertiary carbinol " +
        "carbon has three carbon substituents and no hydrogen of its own, so there is nothing to " +
        "remove and no way to reach a carbonyl without breaking a carbon to carbon bond.",
      lookAt:
        "Count the hydrogens on the carbon carrying the OH. Two means it can reach an acid, one " +
        "means it stops at a ketone, and none means no reaction.",
    },
    distractors: [
      {
        id: "picked-secondary",
        state: { kind: "multiple_choice", optionId: "secondary-alcohol" },
        explanation: {
          whatHappened: "This picks the secondary alcohol.",
          why:
            "A secondary alcohol has one hydrogen on the carbinol carbon, which is exactly enough to " +
            "reach a ketone. It stops there because a ketone has no hydrogen left on that carbon and " +
            "cannot form a gem diol that leads anywhere, so it is a stopping point rather than an " +
            "unreactive substrate.",
          lookAt:
            "Separate stops after one step from does not react at all. Propan-2-ol gives propanone " +
            "and stays there.",
        },
      },
      {
        id: "picked-primary",
        state: { kind: "multiple_choice", optionId: "primary-alcohol" },
        explanation: {
          whatHappened: "This picks the primary alcohol.",
          why:
            "A primary alcohol has two hydrogens on the carbinol carbon, so it goes up two levels " +
            "under these aqueous conditions, through the aldehyde and its gem diol and on to " +
            "propanoic acid. It is the most reactive of the four rather than the least.",
          lookAt:
            "Follow the primary case all the way through rather than stopping at the aldehyde. The " +
            "aldehyde is an intermediate here, not the product.",
        },
      },
      {
        id: "picked-aldehyde",
        state: { kind: "multiple_choice", optionId: "aldehyde" },
        explanation: {
          whatHappened:
            "This picks the aldehyde, on the reasoning that it is already oxidised and has no OH group to attack.",
          why:
            "The aldehyde has no OH as drawn and it makes one in water. Adding water across its " +
            "carbonyl gives the gem diol, which has two OH groups and a hydrogen on that carbon, and " +
            "the oxidant takes it straight on to butanoic acid. The gem diol is the whole reason " +
            "aqueous oxidation does not stop at the aldehyde.",
          lookAt:
            "Draw the hydrate before deciding an aldehyde is inert. Water adding across the carbonyl " +
            "is the step that reopens the ladder.",
        },
      },
    ],
    tags: ["oxidation", "substrate-rule", "gem-diol"],
  }),

  // ------------------------------------------------------------------ ethers

  createProblem({
    id: "org2-williamson-halide-constraint",
    course: "orgo_2",
    topic: "ethers",
    difficulty: 850,
    prompt:
      "A Williamson ether synthesis pairs an alkoxide with an alkyl halide. Which halide gives a " +
      "good yield of the ether?",
    answer: createMultipleChoiceAnswer({
      options: [
        { id: "methyl", text: "Iodomethane" },
        { id: "secondary", text: "2-Bromopropane" },
        { id: "tertiary", text: "2-Bromo-2-methylpropane" },
        { id: "aryl", text: "Bromobenzene" },
      ],
      correctOptionId: "methyl",
    }),
    solution: {
      whatHappened: "Iodomethane. A methyl halide is the ideal partner for an alkoxide.",
      why:
        "The alkoxide has to reach the carbon from the side opposite the halide, so anything bulky " +
        "around that carbon slows the substitution down. An alkoxide is also a strong base, so " +
        "whatever substitution loses, elimination takes. A methyl carbon has three small hydrogens " +
        "around it and no neighbouring carbon to eliminate towards at all, which removes the " +
        "competition entirely.",
      lookAt:
        "Check the halide carbon twice, once for room to approach and once for a neighbouring " +
        "hydrogen the alkoxide could take instead.",
    },
    distractors: [
      {
        id: "picked-secondary",
        state: { kind: "multiple_choice", optionId: "secondary" },
        explanation: {
          whatHappened: "This pairs the alkoxide with a secondary halide.",
          why:
            "A secondary carbon can be substituted, and with a strong base like an alkoxide a large " +
            "share of the material leaves as propene instead. The yield of ether drops accordingly, " +
            "which is why the synthesis is taught with a methyl or primary constraint rather than as " +
            "a preference.",
          lookAt:
            "Weigh substitution against elimination whenever the nucleophile is also a strong base. " +
            "An alkoxide always is.",
        },
      },
      {
        id: "picked-tertiary",
        state: { kind: "multiple_choice", optionId: "tertiary" },
        explanation: {
          whatHappened: "This pairs the alkoxide with a tertiary halide.",
          why:
            "There is no room at a tertiary carbon for the alkoxide to reach the back side, so " +
            "substitution is shut out and elimination takes over completely. The product is " +
            "2-methylpropene rather than any ether. This is exactly why a tert-butyl ether is made " +
            "from tert-butoxide plus a methyl halide, with the roles the other way round.",
          lookAt:
            "When both partners are choosable, put the bulk on the alkoxide and the simplicity on " +
            "the halide. The alkoxide's size does not block the reaction; the halide's does.",
        },
      },
      {
        id: "picked-aryl",
        state: { kind: "multiple_choice", optionId: "aryl" },
        explanation: {
          whatHappened: "This pairs the alkoxide with an aryl halide.",
          why:
            "The carbon holding the bromine here is sp2 and part of the ring, and its back side is " +
            "blocked by the ring itself. Ordinary substitution cannot happen at an aryl carbon at " +
            "all. Displacing a halide from a ring needs either a strong electron withdrawing group " +
            "ortho or para to it, or forcing conditions through benzyne.",
          lookAt:
            "Check the hybridisation of the carbon carrying the leaving group. Backside displacement " +
            "needs an sp3 carbon.",
        },
      },
    ],
    tags: ["williamson", "sn2-constraint"],
  }),

  createProblem({
    id: "org2-ether-cleavage-tert-butyl-methyl",
    course: "orgo_2",
    topic: "ethers",
    difficulty: 1250,
    prompt:
      "tert-Butyl methyl ether is treated with one equivalent of hydrogen iodide in the cold. Which " +
      "pair of products forms, and why?",
    answer: createMajorProductAnswer({
      candidates: [
        { id: "tertiary-iodide", text: "2-Iodo-2-methylpropane and methanol" },
        { id: "methyl-iodide", text: "Iodomethane and 2-methylpropan-2-ol" },
        { id: "alkene", text: "2-Methylpropene and methanol" },
      ],
      reasons: [
        {
          id: "ionises-at-tertiary",
          text: "The protonated ether ionises at the tertiary carbon, and iodide traps the cation there",
        },
        {
          id: "attacks-less-hindered",
          text: "Iodide comes in at the back side of the less crowded carbon",
        },
        { id: "iodide-as-base", text: "Iodide acts as a base and removes a proton" },
      ],
      correctCandidateId: "tertiary-iodide",
      correctReasonId: "ionises-at-tertiary",
    }),
    solution: {
      whatHappened:
        "2-Iodo-2-methylpropane and methanol. The carbon to oxygen bond that breaks is the one to " +
        "the tertiary carbon.",
      why:
        "Hydrogen iodide protonates the ether oxygen first, which turns a poor leaving group into an " +
        "alcohol that will leave. From there the substrate has a choice, and the instructor's own " +
        "procedure is to check for ionisation first. A tertiary carbon gives a stable cation, so the " +
        "bond to it breaks on its own and iodide picks the cation up. The methyl side leaves as " +
        "neutral methanol.",
      lookAt:
        "Run the two step decision in order: check whether either carbon can ionise, and only if " +
        "neither can, ask which is less crowded for a backside attack.",
    },
    distractors: [
      {
        id: "sn2-rule-applied-first",
        state: { kind: "major_product", candidateId: "methyl-iodide", reasonId: null },
        explanation: {
          whatHappened:
            "This applies the less crowded carbon rule straight away, sending iodide to the methyl group.",
          why:
            "That rule is the second half of the procedure and it is correct when neither carbon can " +
            "ionise, which is the case for a dialkyl ether with two primary sides. Here one side is " +
            "tertiary, so ionisation is available and it is faster. The rule was applied to the right " +
            "reaction in the wrong order.",
          lookAt:
            "Classify both carbons of the ether first, then choose the branch. Tertiary or benzylic " +
            "on either side sends the answer down the ionisation path.",
        },
      },
      {
        id: "eliminated-instead",
        state: { kind: "major_product", candidateId: "alkene", reasonId: null },
        explanation: {
          whatHappened: "This has the cation lose a proton to give the alkene instead of capturing iodide.",
          why:
            "The cation forms, so half the mechanism is right. What decides the ending is what is " +
            "around it, and iodide is an excellent nucleophile present in quantity while nothing " +
            "here is a strong base. Capture is far faster than elimination in the cold.",
          lookAt:
            "List what is in the flask once the cation forms. A good nucleophile and no strong base " +
            "means capture.",
        },
      },
      {
        id: "right-products-wrong-argument",
        state: {
          kind: "major_product",
          candidateId: "tertiary-iodide",
          reasonId: "attacks-less-hindered",
        },
        cause: "right_product_wrong_reason",
        explanation: {
          whatHappened:
            "The products are right and the argument attached to them describes the other pathway.",
          why:
            "A backside attack at the less crowded carbon would send iodide to the methyl group and " +
            "give iodomethane, so this argument predicts the other candidate. The tertiary iodide " +
            "comes from the cation route, where iodide never approaches a crowded back side at all " +
            "because the carbon is already flat and empty.",
          lookAt:
            "Check that the stated reason and the chosen product point the same way. Here they point " +
            "at different carbons.",
        },
      },
    ],
    tags: ["ether-cleavage", "sn1-vs-sn2-triage"],
  }),

  // ---------------------------------------------------------------- epoxides

  createProblem({
    id: "org2-epoxide-base-opening-regiochemistry",
    course: "orgo_2",
    topic: "epoxides",
    difficulty: 1000,
    prompt:
      "2,2-Dimethyloxirane, an epoxide with two methyl groups on one ring carbon and two hydrogens " +
      "on the other, is treated with sodium methoxide in methanol and then given a mild acid " +
      "workup. Which is the major product, and why?",
    answer: createMajorProductAnswer({
      candidates: [
        { id: "attack-at-ch2", text: "1-Methoxy-2-methylpropan-2-ol" },
        { id: "attack-at-quaternary", text: "2-Methoxy-2-methylpropan-1-ol" },
        { id: "diol", text: "2-Methylpropane-1,2-diol" },
      ],
      reasons: [
        {
          id: "less-hindered-backside",
          text: "Under base the nucleophile reaches the less hindered ring carbon from the back side",
        },
        {
          id: "more-stable-cation",
          text: "The ring opens to the more stable tertiary cation, which the nucleophile then traps",
        },
        { id: "oxygen-leaves-as-water", text: "The epoxide oxygen leaves the molecule as water" },
      ],
      correctCandidateId: "attack-at-ch2",
      correctReasonId: "less-hindered-backside",
    }),
    solution: {
      whatHappened:
        "1-Methoxy-2-methylpropan-2-ol. Methoxide bonds to the CH2 end and the oxygen stays behind " +
        "as an alkoxide on the more substituted carbon, which the workup protonates.",
      why:
        "With no acid present the epoxide is never protonated, so nothing weakens either carbon to " +
        "oxygen bond in advance and no positive charge builds up anywhere. What is left is an " +
        "ordinary backside displacement, and the only thing that decides where it happens is how " +
        "much room the nucleophile has. The CH2 carbon has two hydrogens around it and the other has " +
        "two methyl groups.",
      lookAt:
        "Ask first whether an acid is present, because that single fact reverses the regiochemistry " +
        "of this reaction on this exact substrate.",
    },
    distractors: [
      {
        id: "acid-regiochemistry-under-base",
        state: { kind: "major_product", candidateId: "attack-at-quaternary", reasonId: null },
        cause: "option_is_not_the_correct_one",
        explanation: {
          whatHappened:
            "This sends methoxide to the more substituted carbon, which is where it would go under acidic conditions.",
          why:
            "Under acid the ring oxygen is protonated first, the more substituted carbon takes on " +
            "real positive character because it can support it, and the nucleophile is drawn there " +
            "even though it is crowded. None of that happens under base. Without protonation there " +
            "is no charge to attract anything, so sterics are the only thing left deciding.",
          lookAt:
            "Run this substrate under both regimes side by side and write the two products next to " +
            "each other. The pair is the lesson.",
        },
      },
      {
        id: "solvent-read-as-nucleophile",
        state: { kind: "major_product", candidateId: "diol", reasonId: null },
        explanation: {
          whatHappened:
            "This gives the diol, which is what forms when hydroxide or water opens the ring.",
          why:
            "Methanol is the solvent here and methoxide is the nucleophile, and the charged " +
            "methoxide is far more reactive than the neutral methanol around it. Nothing in the " +
            "flask supplies a hydroxide, and the mild acid workup only protonates the alkoxide that " +
            "the opening already produced.",
          lookAt:
            "Name every species in the flask and rank them as nucleophiles. The strongest one " +
            "present is the one that opens the ring.",
        },
      },
      {
        id: "right-product-cation-argument",
        state: {
          kind: "major_product",
          candidateId: "attack-at-ch2",
          reasonId: "more-stable-cation",
        },
        cause: "right_product_wrong_reason",
        explanation: {
          whatHappened:
            "The product is right and the argument attached to it is the acid regime's argument.",
          why:
            "A cation argument points at the more substituted carbon, so it predicts the other " +
            "product, and there is no cation under these conditions in any case. Under base the " +
            "answer rests on sterics alone, which is what points at the CH2 end.",
          lookAt:
            "Match the argument to the conditions. Cation reasoning belongs to the acid opening and " +
            "steric reasoning to the base opening.",
        },
      },
    ],
    tags: ["epoxide-opening", "base-regime", "regiochemistry"],
  }),

  createProblem({
    id: "org2-epoxide-acid-opening-regiochemistry",
    course: "orgo_2",
    topic: "epoxides",
    difficulty: 1150,
    prompt:
      "The same epoxide, 2,2-dimethyloxirane, is dissolved in methanol containing a trace of " +
      "sulfuric acid. Which carbon does the methanol oxygen bond to?",
    answer: createMultipleChoiceAnswer({
      options: [
        { id: "more-substituted", text: "The carbon carrying the two methyl groups" },
        { id: "less-substituted", text: "The CH2 carbon" },
        { id: "no-reaction", text: "Neither, because methanol is too weak a nucleophile to open a ring" },
        { id: "counterion", text: "Neither, because the sulfate counterion opens the ring instead" },
      ],
      correctOptionId: "more-substituted",
    }),
    solution: {
      whatHappened: "Methanol bonds to the more substituted carbon, the one carrying the two methyls.",
      why:
        "The acid protonates the ring oxygen, which makes it a leaving group and stretches both " +
        "carbon to oxygen bonds. The bond to the more substituted carbon stretches further, because " +
        "that carbon can carry the partial positive charge that comes with it, so the transition " +
        "state has real cation character at that end. That charge is what draws the neutral " +
        "methanol in, and it outweighs the crowding it has to push through.",
      lookAt:
        "Ask which carbon would make the better cation if the ring opened all the way. Under acid " +
        "the nucleophile goes there, which is the opposite of where it goes under base.",
    },
    distractors: [
      {
        id: "base-regiochemistry-under-acid",
        state: { kind: "multiple_choice", optionId: "less-substituted" },
        explanation: {
          whatHappened: "This sends methanol to the CH2 carbon, which is the answer under basic conditions.",
          why:
            "Sterics decide the outcome only when nothing else does, and under acid something else " +
            "does: the protonated ring puts partial positive charge on the more substituted carbon " +
            "and that charge wins. This is the single substrate the course runs under both regimes " +
            "for exactly this reason.",
          lookAt:
            "Scan the conditions line for an acid before choosing an end of the ring. A trace of " +
            "sulfuric acid moves the answer to the other carbon.",
        },
      },
      {
        id: "declared-no-reaction",
        state: { kind: "multiple_choice", optionId: "no-reaction" },
        explanation: {
          whatHappened:
            "This treats neutral methanol as too weak to open the ring, which is true only while the ring is unprotonated.",
          why:
            "An epoxide with water or an alcohol and no acid really is unreactive, and that negative " +
            "case is worth knowing. Protonation is what changes it: a protonated epoxide is a far " +
            "better electrophile than a neutral one, and about eighty kilojoules of ring strain are " +
            "waiting to be released once anything attacks.",
          lookAt:
            "Keep the two negative cases apart. Epoxide plus alcohol alone is no reaction, and " +
            "epoxide plus alcohol plus acid is a clean opening.",
        },
      },
      {
        id: "counterion-as-nucleophile",
        state: { kind: "multiple_choice", optionId: "counterion" },
        explanation: {
          whatHappened: "This has the acid's own counterion act as the nucleophile.",
          why:
            "The counterion of a catalytic acid is declared a spectator on purpose. It is the " +
            "conjugate base of a strong acid, which makes it a poor nucleophile, and it is present " +
            "in trace amounts against a solvent that is the nucleophile and is everywhere. Naming " +
            "the spectator explicitly is what stops it turning up in a product.",
          lookAt:
            "Compare concentrations as well as reactivity. Methanol is the solvent and the sulfate " +
            "is a trace, and methanol is the better nucleophile of the two.",
        },
      },
    ],
    tags: ["epoxide-opening", "acid-regime", "declared-spectator"],
  }),

  createProblem({
    id: "org2-epoxide-anti-opening-stereochemistry",
    course: "orgo_2",
    topic: "epoxides",
    difficulty: 1450,
    prompt:
      "An epoxide on a ring is opened by sodium methoxide. What is the geometric relationship " +
      "between the new methoxy group and the hydroxyl that the epoxide oxygen becomes, and what " +
      "happens at the carbon that was attacked?",
    answer: createMultipleChoiceAnswer({
      options: [
        { id: "anti-inversion", text: "Anti to each other, with inversion at the carbon attacked" },
        { id: "anti-retention", text: "Anti to each other, with retention at the carbon attacked" },
        { id: "syn", text: "Syn to each other, both delivered from the same face" },
        {
          id: "mixture",
          text: "An equal mixture of syn and anti, because the ring opens to a free cation first",
        },
      ],
      correctOptionId: "anti-inversion",
    }),
    solution: {
      whatHappened:
        "Anti, and the carbon that was attacked inverts. The two new groups end up trans across the " +
        "two carbons.",
      why:
        "Methoxide comes in on the face opposite the carbon to oxygen bond it is displacing, which " +
        "is the only approach that lets the leaving oxygen depart as the new bond forms. That " +
        "geometry does two things at once: it flips the attacked carbon over, and it leaves the " +
        "oxygen sitting on the face the nucleophile came from the other side of. Anti and inversion " +
        "are two descriptions of the same single approach.",
      lookAt:
        "Draw the approach at 180 degrees to the bond that breaks, then read both the relationship " +
        "and the configuration off that one picture.",
    },
    distractors: [
      {
        id: "anti-but-retention",
        state: { kind: "multiple_choice", optionId: "anti-retention" },
        explanation: {
          whatHappened:
            "The anti relationship is right and the carbon that was attacked is drawn keeping its original arrangement.",
          why:
            "Those two claims cannot both hold. The groups end up anti precisely BECAUSE the " +
            "nucleophile arrived on the opposite face, and arriving on the opposite face is what " +
            "inverts the carbon. Retention would mean the nucleophile bonded on the same side the " +
            "oxygen left from, which would put the two groups syn.",
          lookAt:
            "Treat anti and inversion as one fact rather than two. Deriving the second from the " +
            "first keeps them consistent.",
        },
      },
      {
        id: "syn-delivery",
        state: { kind: "multiple_choice", optionId: "syn" },
        explanation: {
          whatHappened: "This has both groups delivered to the same face of the ring.",
          why:
            "Syn delivery happens when a reagent holds both new groups and hands them over together, " +
            "which is what osmium tetroxide does in a dihydroxylation. Epoxide opening is not that " +
            "shape: the oxygen is already bonded to both carbons and the nucleophile arrives " +
            "separately, from the only direction the departing bond allows.",
          lookAt:
            "Compare the two dihydroxylations on one substrate. The peracid then hydrolysis route " +
            "gives anti and the osmium route gives syn.",
        },
      },
      {
        id: "free-cation-assumed",
        state: { kind: "multiple_choice", optionId: "mixture" },
        explanation: {
          whatHappened: "This has the ring open to a flat cation before the nucleophile arrives.",
          why:
            "A free cation would indeed be attacked from both faces and would give a mixture. What " +
            "keeps this from happening under basic conditions is that the ring never opens on its " +
            "own: the oxygen is a poor leaving group until something protonates it, and there is no " +
            "acid here. Bond breaking and bond making happen together, so the geometry is set.",
          lookAt:
            "Check whether the leaving group can depart before the nucleophile arrives. Under base " +
            "it cannot, so the outcome is stereospecific rather than mixed.",
        },
      },
    ],
    tags: ["epoxide-opening", "anti-addition", "stereospecific"],
  }),
]);
