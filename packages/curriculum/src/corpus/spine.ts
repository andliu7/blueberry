/**
 * Two carried prerequisites from Act 0, authored because Act 1 assumes them and
 * never re-teaches them.
 *
 * `docs/COURSE-OUTLINE-ORGO2.md` section 2 lists what Act 1 assumes: resonance,
 * pKa magnitudes, carbocation stability and rearrangement, substitution and
 * elimination selection, alkene addition, and R/S with E/Z. It also records that
 * substitution and elimination never appear as standalone questions and turn up
 * only as embedded steps. Carbocation rearrangement and resonance are different:
 * section 5 tracks both as cross cutting concepts with named reuse sites, and the
 * same rearrangement blindness shows up on the alcohol worksheet and again on the
 * Friedel-Crafts worksheet, which the outline calls the same error in a new
 * costume.
 *
 * So these two exist to give the placement quiz somewhere to send a student who
 * fails an Act 1 topic for an Act 0 reason. Two problems is not coverage of
 * Organic Chemistry I and is not meant to be; that is a later wave against its
 * own scope document.
 *
 * A THIRD CARRIED TOPIC IS DELIBERATELY NOT HERE. `nucleophiles_and_leaving_groups`
 * is the lightweight node D11 exists for, and its content is the leaving group
 * rule that `pkaAcidity.ts` already tests through the conjugate acid pKa ceiling.
 * Authoring it twice would put one idea on two topics and split its mastery
 * signal.
 */

import { createMultipleChoiceAnswer } from "../answers/choice.js";
import { createProblem, type Problem } from "../problem.js";

export const SPINE_PROBLEMS: readonly Problem[] = Object.freeze([
  createProblem({
    id: "org1-carbocation-hydride-shift",
    course: "orgo_1",
    topic: "carbocation_stability_and_rearrangement",
    difficulty: 1100,
    prompt:
      "2-Chloro-3-methylbutane is warmed in methanol with no added nucleophile. Which cation is " +
      "present by the time the solvent captures it?",
    answer: createMultipleChoiceAnswer({
      options: [
        {
          id: "tertiary-after-shift",
          text: "A tertiary cation, reached by a hydride moving over from the neighbouring carbon",
        },
        { id: "secondary-unchanged", text: "The secondary cation formed on ionisation, unchanged" },
        { id: "primary", text: "A primary cation at the end of the chain" },
        {
          id: "no-cation",
          text: "No cation at all, because methanol displaces the chloride directly at that carbon",
        },
      ],
      correctOptionId: "tertiary-after-shift",
    }),
    solution: {
      whatHappened:
        "A tertiary cation. Chloride leaves to give a secondary cation, and a hydride immediately " +
        "shifts across from the neighbouring carbon.",
      why:
        "The carbon next door carries a hydrogen and two methyl groups. Moving that hydrogen with " +
        "its bonding pair into the empty orbital leaves the positive charge on a carbon with three " +
        "alkyl groups around it instead of two. Each alkyl group donates electron density into the " +
        "empty orbital, so the shift is downhill and it happens faster than methanol can arrive. " +
        "What the solvent finds is the rearranged cation.",
      lookAt:
        "Draw the first cation, then look at each neighbouring carbon and ask whether handing over " +
        "a hydrogen or a methyl would improve it. A neighbour with more alkyl groups is the signal.",
    },
    distractors: [
      {
        id: "rearrangement-missed",
        state: { kind: "multiple_choice", optionId: "secondary-unchanged" },
        explanation: {
          whatHappened:
            "This stops at the cation that ionisation produces and captures it where it formed.",
          why:
            "That cation is real and it is not what reacts. A shift to a more stable cation is one " +
            "of the fastest steps in organic chemistry, faster than a solvent molecule diffusing " +
            "in, so a secondary cation with a better neighbour does not survive long enough to be " +
            "trapped. This is the same blind spot that gives the wrong alkene in an acid catalysed " +
            "dehydration and the wrong alkyl group in a Friedel-Crafts alkylation.",
          lookAt:
            "Make checking for a shift a fixed step after drawing any cation, before drawing any " +
            "product from it.",
        },
      },
      {
        id: "shifted-the-wrong-way",
        state: { kind: "multiple_choice", optionId: "primary" },
        explanation: {
          whatHappened: "This moves the charge out to the end of the chain, giving a primary cation.",
          why:
            "Shifts run downhill in stability and never uphill. A primary cation has one alkyl group " +
            "donating into the empty orbital against the secondary cation's two, so this move costs " +
            "energy rather than releasing it and does not happen.",
          lookAt:
            "Compare the cation before and after any shift you propose. If the count of alkyl " +
            "groups on the positive carbon goes down, the shift runs the wrong way.",
        },
      },
      {
        id: "no-cation-assumed",
        state: { kind: "multiple_choice", optionId: "no-cation" },
        explanation: {
          whatHappened:
            "This has methanol displace the chloride directly, with the leaving group departing as the solvent arrives.",
          why:
            "Neutral methanol is a weak nucleophile and the carbon is secondary, so a backside " +
            "attack is slow on both counts. Methanol is also a good ionising solvent and is present " +
            "in enormous excess, so it stabilises the cation and the chloride as they separate. " +
            "Those conditions, weak nucleophile and ionising solvent, are what push a secondary " +
            "substrate down the ionisation route.",
          lookAt:
            "Read the nucleophile's charge and the solvent together. Neutral nucleophile plus " +
            "protic solvent points at ionisation, and charged nucleophile plus a polar aprotic " +
            "solvent points at direct displacement.",
        },
      },
    ],
    tags: ["carbocation", "hydride-shift", "rearrangement-blindness"],
  }),

  createProblem({
    id: "org1-resonance-major-contributor",
    course: "orgo_1",
    topic: "resonance_and_delocalisation",
    difficulty: 950,
    prompt:
      "An amide is drawn as several resonance contributors. Which one is the major contributor to " +
      "the hybrid?",
    answer: createMultipleChoiceAnswer({
      options: [
        {
          id: "neutral",
          text: "The neutral one, with a carbon to oxygen double bond and no formal charges",
        },
        {
          id: "charge-separated",
          text: "The one with a carbon to nitrogen double bond, a positive nitrogen and a negative oxygen",
        },
        {
          id: "reversed-charges",
          text: "The one with a positive oxygen and a negative nitrogen",
        },
        {
          id: "open-sextet",
          text: "The one where the carbonyl carbon has only three bonds and carries a negative charge",
        },
      ],
      correctOptionId: "neutral",
    }),
    solution: {
      whatHappened: "The neutral contributor, with the double bond to oxygen and no charges anywhere.",
      why:
        "Contributors are ranked on two things above all: every atom having a full octet, and as " +
        "little charge separation as possible. The neutral form satisfies both. The charge separated " +
        "form with a positive nitrogen and a negative oxygen is a real and important minor " +
        "contributor, worth perhaps forty percent of the hybrid, and it is what makes the amide C-N " +
        "bond stiff enough to have a rotation barrier. Important is still not major.",
      lookAt:
        "Score each contributor on octets first and charge separation second, then put the negative " +
        "charge on the more electronegative atom as the tiebreak.",
    },
    distractors: [
      {
        id: "minor-called-major",
        state: { kind: "multiple_choice", optionId: "charge-separated" },
        explanation: {
          whatHappened:
            "This picks the charge separated contributor, which is the interesting one and not the largest one.",
          why:
            "It earns its place because the nitrogen lone pair really does donate into the carbonyl, " +
            "which is why an amide nitrogen is not basic and why peptide bonds are planar. It still " +
            "costs a separated pair of charges that the neutral form does not, so the hybrid leans " +
            "toward the neutral one.",
          lookAt:
            "Separate which contributor explains an observation from which one dominates the hybrid. " +
            "A minor contributor can carry most of the explaining.",
        },
      },
      {
        id: "charges-on-the-wrong-atoms",
        state: { kind: "multiple_choice", optionId: "reversed-charges" },
        explanation: {
          whatHappened:
            "This puts the positive charge on oxygen and the negative charge on nitrogen, which is the charge separated form drawn backwards.",
          why:
            "Oxygen is the more electronegative of the two, so it holds a negative charge better and " +
            "a positive charge worse. Reaching this arrangement would also mean pushing the oxygen's " +
            "lone pair out and the nitrogen taking a pair in, which is the opposite direction from " +
            "the one the electronegativities favour.",
          lookAt:
            "After moving any arrow, recount formal charges and check that the negative one landed " +
            "on the more electronegative atom.",
        },
      },
      {
        id: "octet-broken",
        state: { kind: "multiple_choice", optionId: "open-sextet" },
        explanation: {
          whatHappened:
            "This leaves the carbonyl carbon with three bonds and a negative charge at the same time.",
          why:
            "Those two claims cannot sit together. A carbon with three bonds and a lone pair carries " +
            "a negative charge and has eight electrons, and a carbon with three bonds and no lone " +
            "pair is positive with six. This drawing has the bond count of one and the charge of the " +
            "other, which is a formal charge bookkeeping slip rather than a chemical claim.",
          lookAt:
            "Recount formal charge on every atom whose bonds changed: valence electrons, minus lone " +
            "pair electrons, minus one per bond.",
        },
      },
    ],
    tags: ["resonance", "major-contributor", "formal-charge"],
  }),
]);
