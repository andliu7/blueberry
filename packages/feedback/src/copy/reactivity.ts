/**
 * Category: reactivity. Eight causes, six advisory and two blocking.
 *
 * Most of this category is about what a real flask prefers rather than what is
 * possible, so most of it is advisory and the copy is written as a comparison
 * between two routes rather than as a correction. Where a named route wins
 * instead, it is carried in `competingRoutes` as well as said in the prose, so
 * the pathway can be linked and counted rather than only read.
 *
 * The two blocking entries, `nucleophile_not_present_in_state` and
 * `acid_and_base_regime_mixed`, are not chemistry preferences. The first is the
 * system boundary rule and the second is two incompatible experiments drawn as
 * one.
 */

import type { CauseId } from "@blueberry/chem-core";
import type { CauseCopy } from "../types.ts";

type ReactivityCauseId = Extract<
  CauseId,
  | "leaving_group_too_poor"
  | "nucleophile_not_present_in_state"
  | "acid_and_base_regime_mixed"
  | "skipped_favourable_rearrangement"
  | "regiochemistry_contradicts_stability"
  | "attacked_wrong_electrophilic_site"
  | "carbocation_on_destabilised_center"
  | "antiaromatic_intermediate_proposed"
>;

export const REACTIVITY_COPY: Readonly<Record<ReactivityCauseId, CauseCopy>> = Object.freeze({
  leaving_group_too_poor: {
    whatYouDid: "This step pushes off a group that does not leave on its own.",
    why: "A leaving group has to be stable while carrying away the electron pair it takes with it, which is another way of saying it has to be a weak base. Hydroxide and alkoxide are strong bases, so they stay put. Halides, water, and sulfonates are weak bases, so they go.",
    lookAt: "Activate it first. Under acid an alcohol is protonated and leaves as water, and outside acid it is converted to a tosylate or a halide before the substitution. Check which of those the conditions give you.",
  },
  nucleophile_not_present_in_state: {
    whatYouDid: "The nucleophile in your step is not one of the species in the flask.",
    why: "The system is exactly what has been drawn. A reagent that the conditions imply still has to be added as a species before it can attack anything.",
    lookAt: "The reagent line names what to draw. Sodium methoxide gives you methoxide plus a sodium counterion, and the counterion is a spectator, not the nucleophile.",
  },
  acid_and_base_regime_mixed: {
    whatYouDid: "This mechanism uses a strong acid and a strong base.",
    why: "They cannot be in the flask together. Under acid there is no free alkoxide or carbanion sitting around, and under base there is no protonated carbonyl. A sequence that needs both is describing two different experiments.",
    lookAt: "Pick the regime the conditions give you and stay inside it. Under acid, activate by protonating first and deprotonate at the end. Under base, deprotonate first and protonate only on workup.",
  },
  skipped_favourable_rearrangement: {
    whatYouDid: "You trapped a carbocation, and a much more stable one was one shift away.",
    why: "Hydride and alkyl shifts are fast when they buy stability, often faster than the nucleophile arrives. A secondary cation next to a carbon carrying three alkyl groups usually rearranges before anything captures it.",
    lookAt: "Look at the carbons next door to your cation. If a hydrogen or a methyl group can move across and leave a tertiary cation behind, draw that shift and finish the mechanism from the rearranged cation, then compare which of the two products the question is showing you.",
    competingRoutes: ["carbocation_rearrangement"],
  },
  regiochemistry_contradicts_stability: {
    whatYouDid: "You added the electrophile at the position that gives the less stable intermediate.",
    why: "The electrophile adds so as to leave behind the more stabilised cation, which is why the new hydrogen ends up on the carbon that already had more of them. That is all Markovnikov is. With HBr and a peroxide the selectivity flips, because the intermediate there is a bromine radical adding first and the more stable radical is the one on the other carbon.",
    lookAt: "Draw both possible intermediates and rank them: tertiary above secondary above primary, and anything next to a pi system or a lone pair above that. The route through the more stable one is the major product.",
    competingRoutes: ["radical_addition"],
  },
  attacked_wrong_electrophilic_site: {
    whatYouDid: "Your nucleophile went to a different electrophilic site from the one the question is about.",
    why: "Molecules often have more than one place worth attacking. Which one wins depends on how much positive charge sits there, how well the orbitals line up, and whether the first attack can be undone before the next step locks it in.",
    lookAt: "Mark every partial positive site in the molecule and compare them. In an alpha, beta unsaturated carbonyl this is the 1,2 against 1,4 question, and a small basic nucleophile tends to go to the carbonyl carbon while a larger, more polarisable one tends to go to the beta carbon.",
  },
  carbocation_on_destabilised_center: {
    whatYouDid: "Your mechanism goes through a cation on a carbon that cannot support one.",
    why: "Methyl, primary, vinyl, and aryl cations are high enough in energy that they do not form in solution under ordinary conditions, because there is nothing next to them donating electron density into the empty orbital. A route that needs one is usually a sign that a different pathway is running.",
    lookAt: "Look for a concerted alternative where the leaving group departs as the nucleophile arrives, so no free cation ever exists. Primary substrates react by backside attack for exactly this reason.",
    competingRoutes: ["sn2"],
  },
  antiaromatic_intermediate_proposed: {
    whatYouDid: "Your intermediate is a flat conjugated ring holding 4n pi electrons.",
    why: "A cyclic, planar, fully conjugated system with 4n pi electrons is destabilised relative to the open chain version rather than stabilised. Cyclobutadiene and the cyclopentadienyl cation are the standard examples.",
    lookAt: "Count the pi electrons going round the ring. If you get 4n, look for a route that never makes that ring flat and fully conjugated. Real systems escape this by twisting out of plane or by reacting through something else entirely.",
  },
});
