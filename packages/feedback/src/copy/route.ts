/**
 * Category: route. Seven causes, four blocking and three advisory.
 *
 * These are about the shape of the whole mechanism rather than about any single
 * arrow, so every `lookAt` sends the student back to the sequence, to the
 * reagent line, or to the arrows read as a set, rather than to one atom.
 *
 * Two of the seven are about a declaration disagreeing with a drawing rather than
 * about the drawing being wrong, and their copy has one extra job because of it.
 * A student whose arrows are correct and whose label is not must not be told
 * their chemistry is broken, so `whatYouDid` says the naming is what went wrong
 * and `lookAt` teaches them to read their own arrows and let those pick the
 * name.
 */

import type { CauseId } from "@blueberry/chem-core";
import type { CauseCopy } from "../types.ts";

type RouteCauseId = Extract<
  CauseId,
  | "step_out_of_order"
  | "step_not_elementary"
  | "step_kind_disagrees_with_arrows"
  | "reaction_center_not_touched_by_any_arrow"
  | "route_requires_conditions_not_present"
  | "elimination_not_favoured_under_conditions"
  | "substitution_not_favoured_under_conditions"
>;

export const ROUTE_COPY: Readonly<Record<RouteCauseId, CauseCopy>> = Object.freeze({
  step_out_of_order: {
    whatYouDid: "This step uses a species that has not been made yet.",
    why: "A mechanism is a sequence, and each step starts from exactly what the step before it produced. The species it reaches for is created later in the sequence.",
    lookAt: "Read your steps back in order and check that every species you touch is already present at that point. If the step really does have to come first, move it and redraw the ones after it from the new intermediate.",
  },
  step_not_elementary: {
    whatYouDid: "Several separate steps are drawn here as one.",
    why: "One elementary step is one transition state and one energy barrier. Forming a bond and moving a proton somewhere unrelated are two barriers, so they are two steps, even when both are certain to happen.",
    lookAt: "Trace your arrows and see whether they join up. If one set of them never touches the other, and the two sets are at opposite ends of the molecule, those are two things happening at once with no way of reaching each other. Split wherever an intermediate exists, even a short lived one. Addition to a carbonyl under acid is three steps: protonate the carbonyl oxygen, attack the carbon, then deprotonate, with the tetrahedral intermediate drawn in between.",
  },
  step_kind_disagrees_with_arrows: {
    whatYouDid: "The label on this step names one kind of step and the arrows draw another.",
    why: "The name of a step is a claim about which electrons moved and where they came from, so the arrows decide what it is and the label only records it. Your arrows may well be right. What they draw is a different kind of step from the one you named, and the two cannot both be true at once.",
    lookAt: "Let the arrows name the step rather than the other way round. If a hydrogen moved, look at which atom the bond forming arrow pivots on: pivoting on the hydrogen means it brought its own bonding pair and travelled as a hydride, pivoting on the acceptor means the acceptor paid for the new bond and it travelled as a bare proton. If a bond broke, one full arrow carrying the pair to one end is heterolysis, and two fishhooks going opposite ways is homolysis. Then count the bonds that fully break: a proton leaving and a leaving group departing in the same step is an elimination, not a proton transfer.",
  },
  reaction_center_not_touched_by_any_arrow: {
    whatYouDid: "An atom is marked as a reaction centre of this step and no arrow reaches it.",
    why: "The reaction centres are wherever electrons actually arrive or leave, which means the atoms your arrows start on, end on, or bond together. An atom none of them reaches sat this step out, so anything you go on to claim about it, a periplanar arrangement most of all, is a claim about the wrong part of the molecule even when the number is right.",
    lookAt: "Write down the atoms at both ends of every arrow you drew, then compare that list with the centres you marked. Anything marked and not on the arrow list is either missing the arrow that would justify it or should not be marked at all. In an E2 the four atoms that matter are the hydrogen the base takes, the carbon it comes off, the carbon holding the leaving group, and the leaving group, not the chain of carbons running past them.",
  },
  route_requires_conditions_not_present: {
    whatYouDid: "Your route needs conditions the question did not give you.",
    why: "Which pathway runs is set by the reagents, the solvent, and the temperature as much as by the substrate. A mechanism that needs heat, or a strong base, or a different solvent is describing a different experiment from the one on the page.",
    lookAt: "The reagent line lists what you have to work with: the nucleophile or base and how strong it is, the solvent and whether it is protic, and the temperature. The route those three support is the one that runs.",
  },
  elimination_not_favoured_under_conditions: {
    whatYouDid: "This branch takes a proton off the cation, and the arrows for it are drawn correctly.",
    why: "From a carbocation every exit is a race, and the racers are whatever the flask holds: a nucleophile attacks with a lone pair it already carries, while a weak base has to find and take a proton. Cold conditions hand the race to the nucleophile. Heat changes the finish line, because the alkene elimination makes can leave the equilibrium for good, while a captured product can always ionise again.",
    lookAt: "Read the reagent line for three things: how strong the base is, what in the flask can attack the cation, and the temperature. A nucleophile present, no strong base, and room temperature or below means capture: draw the branch where that nucleophile puts its lone pair on the empty carbon.",
    competingRoutes: ["sn1"],
  },
  substitution_not_favoured_under_conditions: {
    whatYouDid: "This branch captures the cation, and the arrows for it are drawn correctly.",
    why: "When the nucleophile that would capture the cation is the same molecule that just left, substitution only undoes the ionisation. Losing a proton makes something new: from the one protonated alcohol you end with the alkene and the acid handed back, two molecules out of one, and heat keeps the equilibrium on that side.",
    lookAt: "Read the reagent line for heat, for the base, and for anything that can hold on to the cation. Heat, a non-nucleophilic acid such as H2SO4, and only weak bases around means E1: draw the branch where a weak base, the water that just left or HSO4-, takes a proton from the carbon beside the plus, and that C-H bond's electrons fold in to make the more substituted alkene.",
    competingRoutes: ["e1"],
  },
});
